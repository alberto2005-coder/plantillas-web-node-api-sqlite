/* ==========================================================================
   REINICIAR LA BASE DE DATOS — `npm run reiniciar`
   --------------------------------------------------------------------------
   Borra el fichero SQLite (y sus auxiliares) y vuelve a crearlo con los
   datos de ejemplo de server/datos/semillas.js: los 23 platos de la carta,
   los 7 días de horario y las 4 reseñas.

   ⚠️  Esto BORRA las reservas guardadas. Solo para desarrollo.
   ========================================================================== */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { cargarEnv } = require('./lib/env');
const { crearBase } = require('./lib/db');
const { ESQUEMA, sembrar } = require('./datos/semillas');

const RAIZ = path.resolve(__dirname, '..');
cargarEnv(path.join(RAIZ, '.env'));

const FICHERO = process.env.DB_FILE
  ? path.resolve(RAIZ, process.env.DB_FILE)
  : path.join(__dirname, 'data', 'restaurante.db');

['', '-wal', '-shm'].forEach((sufijo) => {
  const f = FICHERO + sufijo;
  if (fs.existsSync(f)) {
    fs.rmSync(f);
    console.log('[reset] Borrado:', path.relative(RAIZ, f));
  }
});

crearBase({ fichero: FICHERO, esquema: ESQUEMA, sembrar });
console.log('[reset] Base de datos recreada con los datos de ejemplo ✔');
console.log('[reset] Ruta:', path.relative(RAIZ, FICHERO));
