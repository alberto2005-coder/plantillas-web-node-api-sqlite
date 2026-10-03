/* ==========================================================================
   UTILIDADES HTTP — respuestas JSON, lectura de cuerpo y ficheros estáticos
   Solo usamos módulos nativos de Node (node:http, node:fs, node:path).
   ========================================================================== */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/** Tipos de fichero que sabemos servir */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8'
};

/** Ficheros que NUNCA se sirven al cliente (por seguridad) */
const BLOQUEADOS = new Set(['.env', '.env.local', '.env.example', '.db', '.sqlite', '.sqlite-wal', '.sqlite-shm', '.md', '.log']);

/** Cabeceras comunes de seguridad y cache */
function cabecerasBase(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
}

/** Respuesta JSON. `datos` puede ser cualquier estructura serializable. */
function json(res, datos, codigo = 200) {
  const cuerpo = JSON.stringify(datos, null, 2);
  cabecerasBase(res);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(cuerpo),
    'Cache-Control': 'no-store'
  });
  res.end(cuerpo);
}

/** Respuesta de error normalizada: { "error": "...", "detalle": ... } */
function error(res, codigo, mensaje, detalle) {
  const cuerpo = { error: mensaje };
  if (detalle !== undefined) cuerpo.detalle = detalle;
  json(res, cuerpo, codigo);
}

/** Lee el cuerpo JSON de una petición (límite de 1 MB por defecto). */
function leerCuerpo(req, limite = 1024 * 1024) {
  return new Promise((resolver, rechazar) => {
    let tamano = 0;
    const trozos = [];

    req.on('data', (trozo) => {
      tamano += trozo.length;
      if (tamano > limite) {
        rechazar(Object.assign(new Error('Cuerpo demasiado grande'), { codigo: 413 }));
        req.destroy();
        return;
      }
      trozos.push(trozo);
    });
    req.on('end', () => {
      if (!trozos.length) return resolver({});
      const texto = Buffer.concat(trozos).toString('utf8');
      try {
        resolver(JSON.parse(texto));
      } catch (e) {
        rechazar(Object.assign(new Error('El cuerpo no es JSON válido'), { codigo: 400 }));
      }
    });
    req.on('error', rechazar);
  });
}

/** Objeto con los parámetros de la query string: /api/x?pagina=2 → {pagina:'2'} */
function consulta(req) {
  const url = new URL(req.url, 'http://localhost');
  const obj = {};
  url.searchParams.forEach((v, k) => { obj[k] = v; });
  return { url, params: obj };
}

/**
 * Sirve un fichero estático de la carpeta raíz de la plantilla.
 * Protegido contra path traversal y contra ficheros sensibles (.env, .db, server/).
 */
function estatico(req, res, raiz) {
  const { url } = consulta(req);
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';

  const absoluto = path.normalize(path.join(raiz, rel));
  if (!absoluto.startsWith(path.normalize(raiz))) {
    return error(res, 403, 'Acceso denegado');
  }

  // Bloqueamos la carpeta del servidor y los ficheros sensibles
  const relativo = path.relative(raiz, absoluto);
  const partes = relativo.split(path.sep);
  const ext = path.extname(absoluto).toLowerCase();
  if (partes[0] === 'server' || partes.some((p) => p.startsWith('.')) || BLOQUEADOS.has(ext)) {
    return error(res, 403, 'Acceso denegado');
  }

  fs.stat(absoluto, (err, stat) => {
    if (err || !stat.isFile()) {
      cabecerasBase(res);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 — No encontrado: ' + rel);
    }

    const etag = 'W/"' + stat.size + '-' + Number(stat.mtimeMs).toString(36) + '"';
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304);
      return res.end();
    }

    cabecerasBase(res);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      ETag: etag,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
    });
    fs.createReadStream(absoluto).pipe(res);
  });
}

module.exports = { MIME, json, error, leerCuerpo, consulta, estatico, cabecerasBase };
