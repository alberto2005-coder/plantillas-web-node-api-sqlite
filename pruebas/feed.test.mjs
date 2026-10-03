/* ==========================================================================
  PRUEBA DEL FEED RSS — 03-blog en el puerto 3903
  --------------------------------------------------------------------------
  - GET /feed.xml    → 200, content-type application/rss+xml, con <rss>,
                       </channel> y al menos un <item>
  - GET /api/salud   → sigue respondiendo ok:true

  SITE_URL se fija en http://localhost:3903 para que los <link> del feed
  apunten a esta misma instancia (la BD es temporal y se borra al final).
  ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arrancar, pedir } from './ayudantes.mjs';

const PUERTO = 3903;

test('feed · 03-blog publica un feed RSS válido en /feed.xml', async (t) => {
  const servidor = await arrancar('03-blog', {
    SITE_URL: `http://localhost:${PUERTO}`
  });
  t.after(() => servidor.detener());
  const { puerto } = servidor;

  await t.test('GET /api/salud sigue en ok:true', async () => {
    const r = await pedir(puerto, '/api/salud');
    assert.equal(r.status, 200, `/api/salud debe ser 200 (ha devuelto ${r.status})`);
    assert.equal(r.json().ok, true);
  });

  await t.test('GET /feed.xml → 200 application/rss+xml', async () => {
    const r = await pedir(puerto, '/feed.xml');
    assert.equal(r.status, 200, `/feed.xml debe ser 200 (ha devuelto ${r.status})`);
    assert.match(
      r.cabeceras['content-type'] || '',
      /application\/rss\+xml/,
      `content-type debe ser application/rss+xml (es "${r.cabeceras['content-type']}")`
    );
  });

  await t.test('el cuerpo trae <rss>, </channel> y al menos un <item>', async () => {
    const r = await pedir(puerto, '/feed.xml');
    assert.match(r.texto, /<rss[\s>]/, 'el feed debe abrir con <rss>');
    assert.match(r.texto, /<\/channel>/, 'el feed debe cerrar </channel>');
    assert.match(r.texto, /<item>/, 'el feed debe incluir al menos un <item>');
  });
});
