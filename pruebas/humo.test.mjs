/* ==========================================================================
  PRUEBA DE HUMO — las 7 plantillas arrancan y responden
  --------------------------------------------------------------------------
  - GET /api/salud → 200 con { ok: true }
  - GET /          → 200 y content-type text/html

  Cada plantilla en su puerto fijo (3901…3907) y con una base de datos
  temporal; el ayudante la borra y mata el proceso en t.after(...), también
  si una aserción falla.
  ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arrancar, pedir, PLANTILLAS } from './ayudantes.mjs';

PLANTILLAS.forEach((carpeta) => {
  test(`humo · ${carpeta} responde API y web`, async (t) => {
    const servidor = await arrancar(carpeta);
    t.after(() => servidor.detener());
    const { puerto } = servidor;

    // --- API de salud -------------------------------------------------------
    const salud = await pedir(puerto, '/api/salud');
    assert.equal(salud.status, 200, `/api/salud debe responder 200 (ha respondido ${salud.status})`);
    assert.match(
      salud.cabeceras['content-type'] || '',
      /application\/json/,
      '/api/salud debe responder JSON'
    );
    const cuerpo = salud.json();
    assert.ok(cuerpo, '/api/salud debe devolver JSON válido');
    assert.equal(cuerpo.ok, true, '/api/salud debe devolver ok:true');

    // --- Web ----------------------------------------------------------------
    const web = await pedir(puerto, '/');
    assert.equal(web.status, 200, `/ debe responder 200 (ha respondido ${web.status})`);
    assert.match(
      web.cabeceras['content-type'] || '',
      /text\/html/,
      '/ debe responder content-type html'
    );
  });
});
