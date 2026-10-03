#!/usr/bin/env node
/* ==========================================================================
    SERVIDOR — 03-blog ("Bitácora Digital")
    --------------------------------------------------------------------------
    Arranque:   npm start          (o: node server/server.js)
    Parar:      Ctrl + C

    Qué hace:
    1. Lee las variables de .env
    2. Abre (y crea) la base de datos SQLite con sus datos de ejemplo
    3. Monta la API REST (server/api.js)
    4. Sirve la web estática (index.html, articulo.html, css/, js/) desde
       la misma IP

    No necesita `npm install`: solo módulos nativos de Node.
    ========================================================================== */

'use strict';

const path = require('node:path');
const http = require('node:http');

const { cargarEnv, entero } = require('./lib/env');
const { crearBase } = require('./lib/db');
const { crearRouter } = require('./lib/router');
const { estatico, error } = require('./lib/http');
const { ESQUEMA, sembrar } = require('./datos/semillas');

// 1) Variables de entorno (.env junto a package.json)
const RAIZ = path.resolve(__dirname, '..');
cargarEnv(path.join(RAIZ, '.env'));

// 2) Base de datos
const FICHERO_BD = process.env.DB_FILE
  ? path.resolve(RAIZ, process.env.DB_FILE)
  : path.join(__dirname, 'data', 'blog.db');

const bd = crearBase({ fichero: FICHERO_BD, esquema: ESQUEMA, sembrar });

// 3) Rutas de la API
const api = crearRouter();
require('./api')(api, { bd, RAIZ });

// 4) Servidor HTTP
const PUERTO = entero(process.env.PORT, 3000);
const HOST = process.env.HOST || '127.0.0.1';

const servidor = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      const atendido = await api.manejar(req, res);
      if (!atendido && !res.writableEnded) {
        error(res, 404, `No existe la ruta ${req.method} ${req.url.split('?')[0]}`);
      }
      return;
    }
    estatico(req, res, RAIZ);
  } catch (e) {
    console.error('[servidor]', e);
    if (!res.writableEnded) error(res, 500, 'Error interno del servidor');
  }
});

servidor.listen(PUERTO, HOST, () => {
  const url = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}`;
  console.log('──────────────────────────────────────────────');
  console.log('  03-blog · Bitácora Digital · servidor en marcha');
  console.log(`  Web:  ${url}`);
  console.log(`  API:  ${url}/api/salud`);
  console.log(`  BD:   ${path.relative(RAIZ, FICHERO_BD)}`);
  console.log('  Para parar: Ctrl + C');
  console.log('──────────────────────────────────────────────');
});

// Cierre ordenado: cierra la BD al salir (Ctrl + C, kill, etc.)
function cerrar() {
  console.log('\n[servidor] Cerrando…');
  servidor.close(() => {
    try { bd.cerrar(); } catch (e) { /* ya cerrada */ }
    process.exit(0);
  });
  // Por si queda algo colgado
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
