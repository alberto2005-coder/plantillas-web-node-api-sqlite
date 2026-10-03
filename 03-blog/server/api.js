/* ==========================================================================
    API REST — 03-blog ("Bitácora Digital")
    --------------------------------------------------------------------------
    Todas las rutas devuelven JSON. Las de escritura (POST/PUT/DELETE)
    aceptan `Content-Type: application/json` y requieren el header
    `x-admin-token` con el valor de ADMIN_TOKEN.

    GET    /api/salud                 → estado del servidor
    GET    /api/articulos             → listado paginado (categoria, q, tag…)
    GET    /api/articulos/:slug       → artículo completo (cuerpo_html) + vistas
    GET    /api/categorias            → categorías con contadores recalculados
    GET    /api/destacado             → el artículo de portada (destacado = 1)
    POST   /api/articulos             → crea (admin)
    PUT    /api/articulos/:slug       → edita  (admin)
    DELETE /api/articulos/:slug       → borra  (admin)
    POST   /api/newsletter            → alta de suscripción (límite por IP)

    Búsqueda sin tildes: tanto la columna como el texto de la consulta se
    pasan por LOWER(REPLACE(…)) con los acentos reemplazados, así "movil"
    encuentra "móvil" y "ia" encuentra "IA".
    ========================================================================== */

'use strict';

const { enviarCorreo } = require('./lib/email');
const { crearLimitador } = require('./lib/limitador');
const { markdownAHTML, markdownATexto } = require('./lib/markdown');
const { CATEGORIAS, slugificar, iniciales } = require('./datos/semillas');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Acentos → ASCII (izquierda) y sus sustituciones (derecha) */
const TILDES = [
  ['á', 'a'], ['à', 'a'], ['ä', 'a'], ['â', 'a'],
  ['é', 'e'], ['è', 'e'], ['ë', 'e'], ['ê', 'e'],
  ['í', 'i'], ['ï', 'i'], ['ì', 'i'], ['î', 'i'],
  ['ó', 'o'], ['ö', 'o'], ['ò', 'o'], ['ô', 'o'],
  ['ú', 'u'], ['ü', 'u'], ['ù', 'u'], ['û', 'u'],
  ['ñ', 'n'], ['ç', 'c'],
  ['Á', 'A'], ['É', 'E'], ['Í', 'I'], ['Ó', 'O'], ['Ú', 'U'], ['Ñ', 'N'], ['Ü', 'U']
];

/** Expresión SQL que quita tildes: sinTildes('titulo') → REPLACE(REPLACE(…)) */
function sinTildes(expresion) {
  return TILDES.reduce((acc, [de, a]) => `REPLACE(${acc},'${de}','${a}')`, expresion);
}

/** Texto de búsqueda como lo verá SQLite (minúsculas, sin tildes) */
function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Escapa los comodines de LIKE (\, %, _) para que se busquen literalmente */
function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (c) => '\\' + c);
}

const { tokenValido } = require('./lib/token');

/** Comprueba el token de administración (solo cabecera x-admin-token) */
function esAdmin(ctx) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  return tokenValido(ctx.cabecera('x-admin-token') || '', token);
}

/** Forma común de un artículo: tags también como lista, sin cuerpo */
function presentar(fila, { cuerpo = false } = {}) {
  const tags = String(fila.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const salida = {
    id: Number(fila.id),
    slug: fila.slug,
    titulo: fila.titulo,
    extracto: fila.extracto,
    categoria: fila.categoria,
    categoria_etiqueta: CATEGORIAS[fila.categoria] || fila.categoria,
    tags: fila.tags || '',
    etiquetas: tags,
    autor: fila.autor,
    avatar_iniciales: fila.avatar_iniciales,
    fecha: fila.fecha,
    minutos: Number(fila.minutos),
    destacado: Number(fila.destacado),
    gradiente: Number(fila.gradiente),
    publicado: Number(fila.publicado),
    vistas: Number(fila.vistas),
    enlace: 'articulo.html?slug=' + encodeURIComponent(fila.slug)
  };

  if (cuerpo) {
    salida.cuerpo_md = fila.cuerpo_md || '';
    salida.cuerpo_html = markdownAHTML(fila.cuerpo_md);
    salida.cuerpo_texto = markdownATexto(fila.cuerpo_md); // útil para SEO/resúmenes
  }

  return salida;
}

/**
 * Valida y normaliza los datos de un artículo.
 * @returns {{errores:string[], valores:object|null}}
 */
function prepararArticulo(datos) {
  const d = datos || {};
  const errores = [];
  const valores = {};

  const titulo = String(d.titulo || '').trim();
  if (titulo.length < 5) errores.push('El título debe tener al menos 5 caracteres.');
  else if (titulo.length > 180) errores.push('El título no puede superar los 180 caracteres.');
  else valores.titulo = titulo;

  const extracto = String(d.extracto || '').trim();
  if (extracto.length < 10) errores.push('El extracto debe tener al menos 10 caracteres.');
  else if (extracto.length > 500) errores.push('El extracto no puede superar los 500 caracteres.');
  else valores.extracto = extracto;

  valores.cuerpo_md = String(d.cuerpo_md || '');

  const categoria = String(d.categoria || '').trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(CATEGORIAS, categoria)) {
    errores.push('La categoría debe ser una de: ' + Object.keys(CATEGORIAS).join(', ') + '.');
  } else {
    valores.categoria = categoria;
  }

  // tags: acepta "a, b" o ['a','b']
  const tags = Array.isArray(d.tags)
    ? d.tags
    : String(d.tags || '').split(',');
  const lista = tags
    .map((t) => normalizar(String(t)))
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i);
  valores.tags = lista.join(',');

  const autor = String(d.autor || '').trim();
  if (autor.length < 2) errores.push('El autor debe tener al menos 2 caracteres.');
  else valores.autor = autor;

  valores.avatar_iniciales = String(d.avatar_iniciales || '').trim().toUpperCase().slice(0, 3) ||
    (valores.autor ? iniciales(valores.autor) : '');

  const fecha = String(d.fecha || '').trim();
  if (!FECHA_REGEX.test(fecha) || Number.isNaN(Date.parse(fecha))) {
    errores.push('La fecha debe tener el formato YYYY-MM-DD.');
  } else {
    valores.fecha = fecha;
  }

  const minutos = Number(d.minutos);
  if (!Number.isInteger(minutos) || minutos < 1 || minutos > 180) {
    errores.push('Los minutos de lectura deben ser un entero entre 1 y 180.');
  } else {
    valores.minutos = minutos;
  }

  const gradiente = d.gradiente === undefined || d.gradiente === null || d.gradiente === ''
    ? 1
    : Number(d.gradiente);
  if (!Number.isInteger(gradiente) || gradiente < 1 || gradiente > 7) {
    errores.push('El gradiente debe ser un número entre 1 y 7.');
  } else {
    valores.gradiente = gradiente;
  }

  // Importante: en SQLite nunca pasamos booleanos, siempre 1/0
  valores.destacado = d.destacado ? 1 : 0;
  valores.publicado = d.publicado === undefined || d.publicado === null ? 1 : (d.publicado ? 1 : 0);

  if (d.slug !== undefined && d.slug !== null && String(d.slug).trim() !== '') {
    const slug = normalizar(String(d.slug)).replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!SLUG_REGEX.test(slug)) errores.push('El slug solo puede contener letras, números y guiones.');
    else valores.slug = slug;
  }

  return { errores, valores: errores.length ? null : valores };
}

/** Slug único: si ya existe, le añade -2, -3… (excluye el propio artículo) */
function slugUnico(bd, base, idPropio) {
  const limpio = slugificar(base);
  let candidato = limpio;
  let n = 1;
  for (;;) {
    const fila = bd.uno('SELECT id FROM articulos WHERE slug = ?', candidato);
    if (!fila || Number(fila.id) === Number(idPropio)) return candidato;
    n += 1;
    candidato = limpio.slice(0, 70) + '-' + n;
  }
}

module.exports = function registrar(api, { bd }) {
  const limiteNewsletter = crearLimitador({
    max: Number(process.env.LIMITE_NEWSLETTER || 5),
    ventanaMs: 60000
  });

  const porPaginaDefecto = Number(process.env.POR_PAGINA) || 3;

  /* ---------------------------------------------------------------- Salud */
  api.get('/api/salud', (ctx) =>
    ctx.json({
      ok: true,
      servicio: 'bitacora-digital-api',
      version: '1.0.0',
      node: process.version,
      hora: new Date().toISOString(),
      uptime_s: Math.round(process.uptime())
    })
  );

  /* ------------------------------------------------------------- Feed RSS */
  // Se publica en /feed.xml (fuera de /api/): el enlace <link rel="alternate">
  // de la cabecera lo apunta aquí y cualquier lector de RSS lo detecta.
  api.get('/feed.xml', (ctx) => {
    const filas = bd.todos(
      'SELECT slug, titulo, extracto, categoria, autor, fecha FROM articulos WHERE publicado = 1 ORDER BY fecha DESC, id DESC LIMIT 20'
    );
    const base = String(process.env.SITE_URL || '').replace(/\/+$/, '');
    const escapar = (t) => String(t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const items = filas.map((a) => {
      const enlace = `${base}/articulo.html?slug=${encodeURIComponent(a.slug)}`;
      return [
        '    <item>',
        `      <title>${escapar(a.titulo)}</title>`,
        `      <link>${enlace}</link>`,
        `      <guid isPermaLink="false">${enlace}</guid>`,
        `      <description>${escapar(a.extracto || '')}</description>`,
        `      <category>${escapar(a.categoria)}</category>`,
        `      <dc:creator>${escapar(a.autor)}</dc:creator>`,
        `      <pubDate>${new Date(`${a.fecha}T08:00:00Z`).toUTCString()}</pubDate>`,
        '    </item>'
      ].join('\n');
    }).join('\n');

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
      '  <channel>',
      '    <title>Bitácora Digital</title>',
      `    <link>${base || '/'}</link>`,
      '    <description>Blog de tecnología: desarrollo web, inteligencia artificial, seguridad y novedades del sector.</description>',
      '    <language>es</language>',
      `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
      `    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>`,
      items,
      '  </channel>',
      '</rss>',
      ''
    ].join('\n');

    ctx.res.writeHead(200, {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    });
    ctx.res.end(xml);
  });

  /* ----------------------------------------------------------- Artículos */
  api.get('/api/articulos', (ctx) => {
    // El destacado no se duplica en el listado: se sirve con /api/destacado
    const condiciones = ['publicado = 1', 'destacado = 0'];
    const parametros = [];

    const categoria = normalizar(ctx.query.categoria);
    if (categoria && categoria !== 'todos') {
      if (!Object.prototype.hasOwnProperty.call(CATEGORIAS, categoria)) {
        return ctx.fallo(400, 'Categoría no válida', 'Usa: ' + Object.keys(CATEGORIAS).join(', '));
      }
      condiciones.push(`LOWER(${sinTildes('categoria')}) = ?`);
      parametros.push(categoria);
    }

    const q = normalizar(ctx.query.q);
    if (q) {
      const patron = '%' + escaparLike(q) + '%';
      const campos = ['titulo', 'extracto', 'autor', 'tags'];
      condiciones.push(
        '(' + campos.map((c) => `LOWER(${sinTildes(c)}) LIKE ? ESCAPE '\\'`).join(' OR ') + ')'
      );
      campos.forEach(() => parametros.push(patron));
    }

    const tag = normalizar(ctx.query.tag);
    if (tag) {
      condiciones.push(`LOWER(${sinTildes(`(',' || tags || ',')`)}) LIKE ? ESCAPE '\\'`);
      parametros.push('%,' + escaparLike(tag) + ',%');
    }

    const where = ' WHERE ' + condiciones.join(' AND ');

    const total = Number(
      bd.uno('SELECT COUNT(*) AS n FROM articulos' + where, ...parametros).n
    );

    const porPagina = Math.min(
      50,
      Math.max(1, Number(ctx.query.por_pagina) || porPaginaDefecto)
    );
    const paginas = Math.max(1, Math.ceil(total / porPagina));
    const pagina = Math.min(paginas, Math.max(1, Number(ctx.query.pagina) || 1));

    const items = bd.todos(
      `SELECT id, slug, titulo, extracto, categoria, tags, autor, avatar_iniciales,
              fecha, minutos, destacado, gradiente, publicado, vistas
         FROM articulos${where}
        ORDER BY fecha DESC, id DESC
        LIMIT ? OFFSET ?`,
      ...parametros,
      porPagina,
      (pagina - 1) * porPagina
    );

    ctx.json({
      items: items.map((f) => presentar(f)),
      total,
      pagina,
      paginas,
      por_pagina: porPagina
    });
  });

  api.get('/api/articulos/:slug', (ctx) => {
    const fila = bd.uno('SELECT * FROM articulos WHERE slug = ?', ctx.params.slug);
    if (!fila) return ctx.fallo(404, 'No existe ningún artículo con ese slug');
    if (Number(fila.publicado) !== 1 && !esAdmin(ctx)) {
      return ctx.fallo(404, 'Ese artículo no está publicado');
    }

    // Contador de lecturas (siempre visible: sirve también para "lo más leído")
    bd.ejecutar('UPDATE articulos SET vistas = vistas + 1 WHERE id = ?', Number(fila.id));
    fila.vistas = Number(fila.vistas) + 1;

    ctx.json(presentar(fila, { cuerpo: true }));
  });

  /* ---------------------------------------------------------- Categorías */
  api.get('/api/categorias', (ctx) => {
    const filas = bd.todos(
      `SELECT LOWER(${sinTildes('categoria')}) AS clave, COUNT(*) AS total
         FROM articulos
        WHERE publicado = 1 AND destacado = 0
        GROUP BY categoria`
    );
    const mapa = new Map(filas.map((f) => [f.clave, Number(f.total)]));
    const total = filas.reduce((suma, f) => suma + Number(f.total), 0);

    const items = [
      { clave: 'todos', etiqueta: 'Todas', total },
      ...Object.keys(CATEGORIAS).map((clave) => ({
        clave,
        etiqueta: CATEGORIAS[clave],
        total: mapa.get(clave) || 0
      }))
    ];

    // Se añaden categorías creadas a mano que no estén en CATEGORIAS
    mapa.forEach((valor, clave) => {
      if (!Object.prototype.hasOwnProperty.call(CATEGORIAS, clave)) {
        items.push({ clave, etiqueta: clave, total: valor });
      }
    });

    // Solo las que tienen artículos (más "Todas" y las del menú)
    ctx.json({ items, total });
  });

  /* ----------------------------------------------------------- Destacado */
  api.get('/api/destacado', (ctx) => {
    const fila = bd.uno(
      'SELECT * FROM articulos WHERE destacado = 1 AND publicado = 1 ORDER BY fecha DESC, id DESC LIMIT 1'
    );
    if (!fila) return ctx.fallo(404, 'No hay ningún artículo destacado');
    ctx.json(presentar(fila, { cuerpo: true }));
  });

  /* --------------------------------------------------- Alta de artículo */
  api.post('/api/articulos', async (ctx) => {
    if (!esAdmin(ctx)) {
      return ctx.fallo(401, 'Token de administración no válido (header x-admin-token)');
    }

    const datos = await ctx.cuerpo();
    const { errores, valores } = prepararArticulo(datos);
    if (errores.length) return ctx.fallo(400, 'Revisa los datos del artículo', errores);

    valores.slug = valores.slug || slugUnico(bd, valores.titulo, null);

    // Solo puede haber un destacado
    if (valores.destacado === 1) {
      bd.ejecutar('UPDATE articulos SET destacado = 0 WHERE destacado = 1');
    }

    try {
      const r = bd.ejecutar(
        `INSERT INTO articulos
           (slug, titulo, extracto, cuerpo_md, categoria, tags, autor, avatar_iniciales,
            fecha, minutos, destacado, gradiente, publicado, vistas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        valores.slug, valores.titulo, valores.extracto, valores.cuerpo_md,
        valores.categoria, valores.tags, valores.autor, valores.avatar_iniciales,
        valores.fecha, valores.minutos, valores.destacado, valores.gradiente, valores.publicado
      );
      const fila = bd.uno('SELECT * FROM articulos WHERE id = ?', Number(r.lastInsertRowid));
      ctx.json({ ok: true, id: Number(r.lastInsertRowid), slug: valores.slug, articulo: presentar(fila) }, 201);
    } catch (e) {
      if (/UNIQUE/i.test(String(e.message))) {
        return ctx.fallo(409, 'Ya existe un artículo con ese slug');
      }
      throw e;
    }
  });

  /* --------------------------------------------------- Edición de artículo */
  api.put('/api/articulos/:slug', async (ctx) => {
    if (!esAdmin(ctx)) {
      return ctx.fallo(401, 'Token de administración no válido (header x-admin-token)');
    }

    const actual = bd.uno('SELECT * FROM articulos WHERE slug = ?', ctx.params.slug);
    if (!actual) return ctx.fallo(404, 'No existe ningún artículo con ese slug');

    const datos = await ctx.cuerpo();
    // Fusión: lo que llega manda, lo que no llega se queda como estaba
    const combinado = Object.assign({}, actual, datos);
    const { errores, valores } = prepararArticulo(combinado);
    if (errores.length) return ctx.fallo(400, 'Revisa los datos del artículo', errores);

    // El slug solo cambia si lo piden a mano o si cambia el título
    if (datos.slug !== undefined && String(datos.slug || '').trim() !== '') {
      valores.slug = valores.slug || slugUnico(bd, datos.slug, actual.id);
    } else if (datos.titulo !== undefined && datos.titulo !== actual.titulo) {
      valores.slug = slugUnico(bd, valores.titulo, actual.id);
    } else {
      valores.slug = actual.slug;
    }

    if (valores.destacado === 1) {
      bd.ejecutar('UPDATE articulos SET destacado = 0 WHERE destacado = 1 AND id <> ?', Number(actual.id));
    }

    bd.ejecutar(
      `UPDATE articulos
          SET slug = ?, titulo = ?, extracto = ?, cuerpo_md = ?, categoria = ?, tags = ?,
              autor = ?, avatar_iniciales = ?, fecha = ?, minutos = ?, destacado = ?,
              gradiente = ?, publicado = ?
        WHERE id = ?`,
      valores.slug, valores.titulo, valores.extracto, valores.cuerpo_md,
      valores.categoria, valores.tags, valores.autor, valores.avatar_iniciales,
      valores.fecha, valores.minutos, valores.destacado, valores.gradiente,
      valores.publicado, Number(actual.id)
    );

    const fila = bd.uno('SELECT * FROM articulos WHERE id = ?', Number(actual.id));
    ctx.json({ ok: true, slug: valores.slug, articulo: presentar(fila) });
  });

  /* -------------------------------------------------- Baja de artículo */
  api.delete('/api/articulos/:slug', (ctx) => {
    if (!esAdmin(ctx)) {
      return ctx.fallo(401, 'Token de administración no válido (header x-admin-token)');
    }
    const r = bd.ejecutar('DELETE FROM articulos WHERE slug = ?', ctx.params.slug);
    if (!r.changes) return ctx.fallo(404, 'No existe ningún artículo con ese slug');
    ctx.json({ ok: true, borrados: Number(r.changes) });
  });

  /* ---------------------------------------------------------- Newsletter */
  api.post('/api/newsletter', async (ctx) => {
    if (!limiteNewsletter.permitido(ctx.ip)) {
      return ctx.fallo(429, 'Demasiadas suscripciones desde esta conexión. Inténtalo dentro de un minuto.');
    }

    const datos = await ctx.cuerpo();
    const email = String(datos.email || '').trim().toLowerCase();
    const origen = datos.origen === 'ancha' ? 'ancha' : 'lateral';

    if (!EMAIL_REGEX.test(email)) {
      return ctx.fallo(400, 'El correo no tiene un formato válido.');
    }

    const existente = bd.uno('SELECT id FROM suscriptores WHERE LOWER(email) = ?', email);
    if (existente) {
      limiteNewsletter.reiniciar(ctx.ip);
      return ctx.json({
        ok: true,
        ya_suscrito: true,
        id: Number(existente.id),
        mensaje: '¡Ese correo ya estaba suscrito! No hace falta que repitas el paso.'
      });
    }

    const r = bd.ejecutar(
      'INSERT INTO suscriptores (email, origen, confirmado) VALUES (?, ?, 0)',
      email,
      origen
    );

    // Aviso opcional al equipo (solo si has configurado un destino en .env)
    const destino = process.env.NEWSLETTER_DESTINO || process.env.CONTACTO_DESTINO;
    let envio = { enviado: false, motivo: 'sin destino configurado (.env)' };
    if (destino) {
      envio = await enviarCorreo({
        para: destino,
        asunto: `Nueva suscripción al newsletter (${origen})`,
        texto: `Correo: ${email}\nOrigen: ${origen}\nHora: ${new Date().toISOString()}`
      });
    }

    limiteNewsletter.reiniciar(ctx.ip);

    ctx.json(
      {
        ok: true,
        id: Number(r.lastInsertRowid),
        origen,
        mensaje: '¡Suscripción registrada! Revisa tu bandeja para confirmar. 🎉',
        correo: envio.enviado ? 'enviado' : 'demo',
        detalleCorreo: envio.enviado ? null : envio.motivo || null
      },
      201
    );
  });
};
