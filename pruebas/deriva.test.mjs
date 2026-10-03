/* ==========================================================================
  PRUEBA DE DERIVA — server/lib/ debe ser idéntico en las 7 plantillas
  --------------------------------------------------------------------------
  Cada plantilla lleva una COPIA de server/lib/ (db.js, email.js, env.js,
  http.js, limitador.js, router.js, token.js). Aquí comprobamos que siguen
  siendo byte a byte idénticos: si alguien cambia uno solo en una plantilla,
  el error dice exactamente cuál se ha desincronizado y respecto a qué.

  (03-blog lleva además server/lib/markdown.js, que solo existe ahí:
  no se compara.)
  ========================================================================== */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { PLANTILLAS, RAIZ } from './ayudantes.mjs';

const FICHEROS = [
  'db.js',
  'email.js',
  'env.js',
  'http.js',
  'limitador.js',
  'router.js',
  'token.js'
];

const REFERENCIA = PLANTILLAS[0]; // 01-portfolio

function resumen(ruta) {
  return crypto.createHash('sha256').update(fs.readFileSync(ruta)).digest('hex');
}

FICHEROS.forEach((fichero) => {
  test(`deriva · server/lib/${fichero} idéntico en las 7 plantillas`, () => {
    const rutaRef = path.join(RAIZ, REFERENCIA, 'server', 'lib', fichero);
    assert.ok(
      fs.existsSync(rutaRef),
      `Falta ${REFERENCIA}/server/lib/${fichero} (no hay con qué comparar)`
    );
    const hashRef = resumen(rutaRef);

    for (const carpeta of PLANTILLAS) {
      const ruta = path.join(RAIZ, carpeta, 'server', 'lib', fichero);
      if (!fs.existsSync(ruta)) {
        assert.fail(
          `La carpeta ${carpeta} está desincronizada: le falta server/lib/${fichero} `
          + `(existe en ${REFERENCIA})`
        );
      }
      const hash = resumen(ruta);
      assert.equal(
        hash,
        hashRef,
        `La carpeta ${carpeta} está desincronizada: su server/lib/${fichero} `
        + `no es byte a byte idéntico al de ${REFERENCIA} `
        + `(SHA-256 ${hash.slice(0, 12)}… vs ${hashRef.slice(0, 12)}…)`
      );
    }
  });
});
