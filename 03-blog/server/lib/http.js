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

/**
 * Content-Security-Policy por defecto: solo recursos del propio sitio
 * (más Google Fonts, que es lo único externo que cargan las plantillas).
 * Se puede cambiar o desactivar desde .env:
 *   CSP=0                 → no envía la cabecera
 *   CSP=default-src 'self'; …  → valor personalizado (analíticas, formularios
 *                                 externos, Stripe… ver docs/DESPLIEGUE.md)
 */
const CSP_PREDETERMINADA = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  'img-src \'self\' data: blob:',
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src \'self\' data: https://fonts.gstatic.com',
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'"
].join('; ');

/** Cabeceras comunes de seguridad y cache */
function cabecerasBase(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), usb=(), payment=(self)');

  const csp = Object.prototype.hasOwnProperty.call(process.env, 'CSP')
    ? process.env.CSP
    : CSP_PREDETERMINADA;
  if (csp && csp !== '0') res.setHeader('Content-Security-Policy', csp);
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

  // decodeURIComponent puede lanzar con URLs malformadas (/%zz): 400, no 500
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch (e) {
    return error(res, 400, 'URL no válida');
  }

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
      return noEncontrado(req, res, raiz, rel);
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

/**
 * Respuesta 404: si la plantilla incluye un `404.html` estilado, se sirve
 * (con status 404 de verdad, para que Google y los navegadores lo indexen
 * como error). Si no, texto plano como hasta ahora.
 */
function noEncontrado(req, res, raiz, rel) {
  const personalizado = path.join(raiz, '404.html');

  if (req.method === 'GET') {
    let stat = null;
    try {
      stat = fs.statSync(personalizado);
    } catch (e) { /* la plantilla no tiene 404.html */ }

    if (stat && stat.isFile()) {
      cabecerasBase(res);
      res.writeHead(404, {
        'Content-Type': MIME['.html'],
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache'
      });
      return fs.createReadStream(personalizado).pipe(res);
    }
  }

  cabecerasBase(res);
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 — No encontrado: ' + rel);
}

module.exports = { MIME, json, error, leerCuerpo, consulta, estatico, cabecerasBase };
