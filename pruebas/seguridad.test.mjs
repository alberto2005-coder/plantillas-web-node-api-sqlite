/* ==========================================================================
  PRUEBAS DE SEGURIDAD — 01-portfolio en el puerto 3901
  --------------------------------------------------------------------------
  Comportamientos verificados manualmente (no se tocan):
    · ficheros sensibles y path traversal → 403
    · URL malformada (/%zz) → 400, nunca 500
    · token de admin SOLO por cabecera x-admin-token → sin ella, 401
    · método no permitido → 405
    · 404.html estilado con status 404 y content-type html
    · cabeceras de seguridad presentes en las respuestas

  Se usan tres arrancadas (mismo puerto 3901, una detrás de otra) porque
  cada una necesita variables de entorno distintas. La BD siempre es temporal.
  ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arrancar, pedir } from './ayudantes.mjs';

const PUERTO = 3901;
const TOKEN = 'token-de-prueba-123456';
const MENSAJE = {
  nombre: 'Ana',
  email: 'ana@ejemplo.com',
  mensaje: 'Un mensaje de prueba con más de diez caracteres'
};

/* ------------------------------------------------------------------ 1) general */
test('seguridad · 01-portfolio (puerto 3901, ADMIN_TOKEN de prueba)', async (t) => {
  const servidor = await arrancar('01-portfolio', { ADMIN_TOKEN: TOKEN });
  t.after(() => servidor.detener());
  const { puerto } = servidor;

  await t.test('GET /api/salud → 200 con ok:true', async () => {
    const r = await pedir(puerto, '/api/salud');
    assert.equal(r.status, 200);
    assert.equal(r.json().ok, true);
  });

  await t.test('ficheros sensibles → 403', async () => {
    for (const ruta of ['/.env', '/server/server.js', '/README.md']) {
      const r = await pedir(puerto, ruta);
      assert.equal(r.status, 403, `${ruta} debe devolver 403 (ha devuelto ${r.status})`);
    }
  });

  await t.test('path traversal → 403', async () => {
    const r = await pedir(puerto, '/%2e%2e%2f%2e%2e%2fwindows/win.ini');
    assert.equal(r.status, 403, `traversal debe devolver 403 (ha devuelto ${r.status})`);
  });

  await t.test('URL malformada (/%zz) → 400 y nunca 500', async () => {
    const r = await pedir(puerto, '/%zz');
    assert.equal(r.status, 400, `/%zz debe devolver 400 (ha devuelto ${r.status})`);
    assert.notEqual(r.status, 500);
  });

  await t.test('/api/mensajes: 401 sin token y con ?token=, 200 por cabecera', async () => {
    const sin = await pedir(puerto, '/api/mensajes');
    assert.equal(sin.status, 401, 'sin token debe ser 401');

    const porQuery = await pedir(puerto, `/api/mensajes?token=${TOKEN}`);
    assert.equal(porQuery.status, 401, 'el token en la query string ya no se acepta: debe ser 401');

    const porCabecera = await pedir(puerto, '/api/mensajes', {
      cabeceras: { 'x-admin-token': TOKEN }
    });
    assert.equal(porCabecera.status, 200, 'con cabecera x-admin-token debe ser 200');
    assert.ok(Array.isArray(porCabecera.json()), '/api/mensajes debe devolver una lista');
  });

  await t.test('POST /api/salud → 405', async () => {
    const r = await pedir(puerto, '/api/salud', { metodo: 'POST', cuerpo: {} });
    assert.equal(r.status, 405, `POST /api/salud debe ser 405 (ha devuelto ${r.status})`);
  });

  await t.test('POST /api/contacto válido → 201', async () => {
    const r = await pedir(puerto, '/api/contacto', { metodo: 'POST', cuerpo: MENSAJE });
    assert.equal(r.status, 201, `contacto válido debe ser 201 (ha devuelto ${r.status})`);
    assert.equal(r.json().ok, true);
  });

  await t.test('GET /ruta-que-no-existe → 404 con content-type html', async () => {
    const r = await pedir(puerto, '/ruta-que-no-existe');
    assert.equal(r.status, 404, `la ruta inexistente debe ser 404 (ha devuelto ${r.status})`);
    assert.match(
      r.cabeceras['content-type'] || '',
      /text\/html/,
      'el 404 debe servir el 404.html con content-type html'
    );
  });

  await t.test('cabeceras de seguridad en la respuesta', async () => {
    for (const ruta of ['/', '/api/mensajes', '/ruta-que-no-existe']) {
      const r = await pedir(puerto, ruta);
      assert.equal(
        r.cabeceras['x-content-type-options'],
        'nosniff',
        `falta x-content-type-options: nosniff en ${ruta}`
      );
      assert.ok(r.cabeceras['permissions-policy'], `falta permissions-policy en ${ruta}`);
      assert.ok(r.cabeceras['content-security-policy'], `falta content-security-policy en ${ruta}`);
    }
  });
});

/* ------------------------------------------------- 2) límite de envíos (1/min) */
test('seguridad · LIMITE_CONTACTO=1: el segundo envío devuelve 429', async (t) => {
  const servidor = await arrancar('01-portfolio', {
    ADMIN_TOKEN: TOKEN,
    LIMITE_CONTACTO: '1'
  });
  t.after(() => servidor.detener());
  const { puerto } = servidor;

  await t.test('aunque el primer POST sea inválido, ya cuenta', async () => {
    const primero = await pedir(puerto, '/api/contacto', { metodo: 'POST', cuerpo: {} });
    assert.notEqual(primero.status, 429, 'el primer POST no puede ser 429');
    assert.equal(primero.status, 400, 'un cuerpo vacío debe dar 400');

    const segundo = await pedir(puerto, '/api/contacto', { metodo: 'POST', cuerpo: MENSAJE });
    assert.equal(segundo.status, 429, `el segundo POST debe ser 429 (ha devuelto ${segundo.status})`);
  });
});

/* ----------------------------------------- 3) TRUST_PROXY cuenta por IP real */
test('seguridad · TRUST_PROXY=1: el límite usa la IP del X-Forwarded-For', async (t) => {
  const servidor = await arrancar('01-portfolio', {
    ADMIN_TOKEN: TOKEN,
    LIMITE_CONTACTO: '1',
    TRUST_PROXY: '1'
  });
  t.after(() => servidor.detener());
  const { puerto } = servidor;

  const post = (ip, cuerpo) =>
    pedir(puerto, '/api/contacto', {
      metodo: 'POST',
      cuerpo,
      cabeceras: ip ? { 'x-forwarded-for': ip } : {}
    });

  await t.test('IPs distintas no comparten el contador', async () => {
    const primero = await post('10.0.0.1', {});
    assert.equal(primero.status, 400, 'el primer POST (inválido) debe dar 400');

    const segundo = await post('10.0.0.2', MENSAJE);
    assert.notEqual(segundo.status, 429, '10.0.0.2 es otra IP: NO debe ser 429');

    const tercero = await post('10.0.0.1', MENSAJE);
    assert.equal(tercero.status, 429, `10.0.0.1 ya agotó su límite: debe ser 429 (ha devuelto ${tercero.status})`);
  });
});
