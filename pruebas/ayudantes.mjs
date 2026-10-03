/* ==========================================================================
  AYUDANTES DE LAS PRUEBAS — arrancar y parar plantillas sin tocar nada real
  --------------------------------------------------------------------------
  - Cada plantilla usa SIEMPRE un puerto fijo (01→3901 … 07→3907) para no
    chocar con verificar.ps1 / verificar.sh (3101-3107).
  - La base de datos va a un fichero temporal de SO (nunca a
    server/data/*.db del repo) y se borra al terminar.
  - `detener()` mata el proceso SIEMPRE (úsalo en t.after(...) o en finally).

  Uso:
      import { arrancar, pedir, PLANTILLAS, PUERTOS } from './ayudantes.mjs';
      const s = await arrancar('01-portfolio', { ADMIN_TOKEN: '…' });
      t.after(() => s.detener());
      const r = await pedir(s.puerto, '/api/salud');
  ========================================================================== */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MI_CARPETA = path.dirname(fileURLToPath(import.meta.url));

/** Raíz del repositorio (la carpeta que contiene las 7 plantillas) */
export const RAIZ = path.resolve(MI_CARPETA, '..');

/** Las 7 plantillas, en orden */
export const PLANTILLAS = [
  '01-portfolio',
  '02-saas',
  '03-blog',
  '04-tienda',
  '05-agencia',
  '06-dashboard',
  '07-restaurante'
];

/** Puerto fijo por plantilla: 01→3901 … 07→3907 */
export const PUERTOS = {};
PLANTILLAS.forEach((carpeta, i) => { PUERTOS[carpeta] = 3901 + i; });

/** @returns {number} el puerto fijo de una plantilla (o undefined) */
export function puertoDe(carpeta) {
  return PUERTOS[carpeta];
}

/** Espera en milisegundos */
export function dormir(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

let contadorBd = 0;

/**
 * Arranca una plantilla en su puerto fijo y espera a que /api/salud responda.
 *
 * El proceso se lanza SIEMPRE con un DB_FILE temporal (que se borra en
 * `detener()`), así las pruebas jamás tocan las bases de datos del repo.
 * Si el puerto está ocupado (otro fichero de pruebas en paralelo), reintenta
 * hasta 10 s: solo devuelve el servidor que ha arrancado NUESTRO proceso.
 *
 * @param {string} carpeta  p. ej. '01-portfolio'
 * @param {Record<string,string>} env  variables extra (ADMIN_TOKEN, PORT NO:
 *                                     el puerto y el DB_FILE los pone el ayudante)
 * @returns {Promise<{puerto:number, carpeta:string, ficheroBd:string,
 *                    detener:() => Promise<void>, salida:() => string}>}
 */
export async function arrancar(carpeta, env = {}) {
  const puerto = puertoDe(carpeta);
  if (!puerto) {
    throw new Error(`Plantilla desconocida: "${carpeta}". Conozco: ${PLANTILLAS.join(', ')}`);
  }

  const carpetaAbs = path.join(RAIZ, carpeta);
  const servidorJs = path.join(carpetaAbs, 'server', 'server.js');
  if (!fs.existsSync(servidorJs)) {
    throw new Error(`No existe ${servidorJs}`);
  }

  contadorBd += 1;
  const ficheroBd = path.join(
    os.tmpdir(),
    `prueba-${carpeta}-${process.pid}-${contadorBd}.db`
  );

  // cargarEnv() no pisa lo que ya está definido, así que estas variables
  // ganan siempre sobre las del .env de la plantilla.
  const variables = { ...process.env, ...env, PORT: String(puerto), DB_FILE: ficheroBd };

  let proc = null;
  let salida = '';
  let yaDetenido = false;

  const lanzar = () => {
    salida = '';
    const hijo = spawn(
      process.execPath,
      ['--disable-warning=ExperimentalWarning', 'server/server.js'],
      { cwd: carpetaAbs, env: variables, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    hijo.on('error', (e) => { salida += `\n[spawn] ${e.message}\n`; });
    [hijo.stdout, hijo.stderr].forEach((flujo) => {
      if (!flujo) return;
      flujo.setEncoding('utf8');
      flujo.on('data', (d) => { salida = (salida + d).slice(-4000); });
    });
    return hijo;
  };

  const fechaLimite = Date.now() + 10000; // máx. 10 s en total
  let listo = false;

  try {
    while (Date.now() < fechaLimite && !listo) {
      proc = lanzar();
      const responde = await esperarSalud(proc, puerto, fechaLimite);
      if (responde) {
        // Otra prueba puede tener el mismo puerto abierto: damos un margen
        // para confirmar que quien ha respondido es NUESTRO proceso.
        await dormir(250);
        if (proc.exitCode === null && proc.signalCode === null) {
          listo = true;
          break;
        }
      }
      await cerrarProceso(proc); // murió (¿puerto ocupado?) → reintentamos
      proc = null;
      if (Date.now() < fechaLimite) await dormir(150);
    }

    if (!listo) {
      throw new Error(
        `No arrancó ${carpeta} en el puerto ${puerto} en 10 s.\n--- salida del servidor ---\n${salida}`
      );
    }
  } catch (e) {
    if (proc) await cerrarProceso(proc);
    borrarBase(ficheroBd);
    throw e;
  }

  const detener = async () => {
    if (yaDetenido) return;
    yaDetenido = true;
    if (proc) await cerrarProceso(proc);
    await dormir(30); // Windows puede tardar en soltar el fichero
    borrarBase(ficheroBd);
  };

  return { puerto, carpeta, ficheroBd, detener, salida: () => salida };
}

/** Reinteca cada ~40 ms hasta que /api/salud diga ok:true (o se acabe el tiempo) */
async function esperarSalud(proc, puerto, fechaLimite) {
  const url = `http://127.0.0.1:${puerto}/api/salud`;
  while (Date.now() < fechaLimite) {
    if (proc.exitCode !== null || proc.signalCode !== null) return false;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
      const cuerpo = r.status === 200 ? await r.json().catch(() => null) : null;
      if (cuerpo && cuerpo.ok === true && proc.exitCode === null) return true;
    } catch (e) { /* aún no está escuchando */ }
    await dormir(40);
  }
  return false;
}

/** SIGTERM y, si en 1,5 s sigue vivo, SIGKILL. Resuelve siempre. */
function cerrarProceso(p) {
  return new Promise((resolver) => {
    if (!p || p.exitCode !== null || p.signalCode !== null) return resolver();
    let resuelto = false;
    let t1 = null;
    let t2 = null;
    const fin = () => {
      if (resuelto) return;
      resuelto = true;
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      resolver();
    };
    p.once('exit', fin);
    try { p.kill('SIGTERM'); } catch (e) { return fin(); }
    t1 = setTimeout(() => {
      try { p.kill('SIGKILL'); } catch (e) { /* ya fuera */ }
    }, 1500);
    t2 = setTimeout(fin, 4000); // por si acaso (en Windows no debería llegar)
  });
}

/** Borra el .db temporal y sus -wal / -shm */
function borrarBase(fichero) {
  ['', '-wal', '-shm'].forEach((sufijo) => {
    try { fs.rmSync(fichero + sufijo, { force: true }); } catch (e) { /* nada */ }
  });
}

/**
 * Petición HTTP con el camino EXACTO que se le pase (sin normalizar la URL,
 * igual que un navegador malicioso que mande /%zz o /%2e%2e%2f…).
 *
 * @param {number} puerto
 * @param {string} ruta  p. ej. '/api/mensajes?token=x'
 * @param {{metodo?:string, cabeceras?:Record<string,string>, cuerpo?:any}} [op]
 * @returns {Promise<{status:number, cabeceras:Record<string,string>, texto:string,
 *                    json:() => any}>}
 */
export function pedir(puerto, ruta, op = {}) {
  const { metodo = 'GET', cabeceras = {}, cuerpo } = op;
  const textoCuerpo = cuerpo === undefined
    ? null
    : (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo));

  const encabezados = { ...cabeceras };
  if (textoCuerpo !== null) {
    encabezados['content-type'] = encabezados['content-type'] || 'application/json; charset=utf-8';
    encabezados['content-length'] = String(Buffer.byteLength(textoCuerpo));
  }

  return new Promise((resolver, rechazar) => {
    const req = http.request(
      { host: '127.0.0.1', port: puerto, path: ruta, method: metodo, headers: encabezados },
      (res) => {
        const trozos = [];
        res.on('data', (d) => trozos.push(d));
        res.on('end', () => {
          const texto = Buffer.concat(trozos).toString('utf8');
          resolver({
            status: res.statusCode,
            cabeceras: res.headers,
            texto,
            json() {
              try { return JSON.parse(texto); } catch (e) { return null; }
            }
          });
        });
      }
    );
    req.on('error', rechazar);
    if (textoCuerpo !== null) req.write(textoCuerpo);
    req.end();
  });
}
