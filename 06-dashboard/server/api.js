/* ==========================================================================
   API REST — 06-dashboard · Nova Analytics
   --------------------------------------------------------------------------
   Todas las rutas devuelven JSON. Las de escritura aceptan
   `Content-Type: application/json`. Las claves están pensadas para que el
   cliente (js/main.js) las use tal cual en sus gráficas y tablas.

   GET    /api/salud                     → estado del servidor
   GET    /api/resumen                   → KPIs + serie de líneas + dona + pedidos + actividad
   GET    /api/ventas                    → serie de barras + vendedores + KPIs
   GET    /api/productos                 → catálogo (tabla productos)
   GET    /api/clientes                  → cartera (tabla clientes)
   GET    /api/actividad                 → actividad reciente
   GET    /api/pedidos?estado=&q=        → pedidos con filtrado en el servidor
   PATCH  /api/pedidos/:id/estado        → cambia el estado (admin)
   GET    /api/exportar/pedidos.csv      → CSV real (admin)
   POST   /api/login                     → {usuario, clave} → token (24 h)
   GET    /api/yo                        → quién es el token recibido

   ¿Cómo añadir un endpoint? Añade una línea aquí (ver README §6.5).
   ========================================================================== */

'use strict';

const crypto = require('node:crypto');

const { crearLimitador } = require('./lib/limitador');

/** Estados permitidos en la tabla de pedidos */
const ESTADOS = ['Entregado', 'En curso', 'Pendiente'];

/** Vida de los tokens de login (24 horas) */
const VIDA_TOKEN_MS = 24 * 60 * 60 * 1000;

/* --------------------------------------------------------------------------
   Autenticación
   -------------------------------------------------------------------------- */

/** Devuelve el token que ha enviado el cliente (Bearer, x-admin-token o ?token=) */
function tokenRecibido(ctx) {
  const auth = ctx.cabecera('authorization') || '';
  if (/^bearer\s+/i.test(auth)) return auth.replace(/^bearer\s+/i, '').trim();
  return ctx.cabecera('x-admin-token') || ctx.query.token || '';
}

/**
 * ¿Es un token de administración?
 * - El token fijo del .env (ADMIN_TOKEN) vale siempre.
 * - Los tokens que devuelve POST /api/login también (si no han caducado).
 */
function crearComprobador(bd) {
  return function esAdmin(ctx) {
    const token = tokenRecibido(ctx);
    if (!token) return false;
    if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return true;
    return Boolean(sesionValida(bd, token));
  };
}

/** Busca la sesión viva de un token (null si no existe o ha caducado) */
function sesionValida(bd, token) {
  if (!token) return null;
  const fila = bd.uno('SELECT * FROM sesiones WHERE token = ?', token);
  if (!fila) return null;
  const caduca = Date.parse(fila.caduca_en);
  if (!Number.isFinite(caduca) || caduca < Date.now()) return null;
  return fila;
}

/* --------------------------------------------------------------------------
   Ayudas de consulta
   -------------------------------------------------------------------------- */

/** Expresión SQL que deja una columna sin acentos ni mayúsculas:
 *  `replace(replace(lower(col),'á','a'), …)` → 'lucia' encuentra a 'Lucía'. */
function sinAcentos(columna) {
  let expr = `lower(${columna})`;
  const pares = [
    ['á', 'a'], ['Á', 'a'], ['é', 'e'], ['É', 'e'], ['í', 'i'], ['Í', 'i'],
    ['ó', 'o'], ['Ó', 'o'], ['ú', 'u'], ['Ú', 'u'], ['ü', 'u'], ['Ü', 'u'],
    ['ñ', 'n'], ['Ñ', 'n']
  ];
  pares.forEach(([de, a]) => { expr = `replace(${expr}, '${de}', '${a}')`; });
  return expr;
}

/** Versión "cruda" de una búsqueda para comparar en JS (misma normalización) */
function normalizar(t) {
  return String(t)
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n');
}

/** Escapa un valor para usarlo dentro de un LIKE */
function paraLike(t) {
  return String(t).replace(/[\\%_]/g, (c) => '\\' + c);
}

/** Fila de pedidos tal y como la espera el cliente (id = referencia) */
const COLS_PEDIDO = 'referencia AS id, cliente, producto, fecha, importe, estado';

module.exports = function registrar(api, { bd }) {
  const esAdmin = crearComprobador(bd);
  const limiteLogin = crearLimitador({
    max: Number(process.env.LIMITE_LOGIN || 5),
    ventanaMs: 60000
  });

  /** Lee una métrica concreta de la tabla `metricas` (o null) */
  function metrica(clave, periodo) {
    const fila = bd.uno('SELECT valor FROM metricas WHERE clave = ? AND periodo = ?', clave, periodo);
    return fila ? fila.valor : null;
  }

  /** Devuelve una serie completa ordenada por inserción: [{m, v}] */
  function serie(clave) {
    return bd
      .todos('SELECT periodo, valor FROM metricas WHERE clave = ? ORDER BY id ASC', clave)
      .map((f) => ({ m: f.periodo, v: f.valor }));
  }

  /* ---------------------------------------------------------------- Salud */
  api.get('/api/salud', (ctx) =>
    ctx.json({
      ok: true,
      servicio: 'dashboard-api',
      version: '1.0.0',
      node: process.version,
      hora: new Date().toISOString(),
      uptime_s: Math.round(process.uptime())
    })
  );

  /* -------------------------------------------------------------- Resumen */
  // KPIs de las 4 tarjetas + series de la gráfica de líneas + dona + las
  // dos listas de la vista (últimos pedidos y actividad).
  api.get('/api/resumen', (ctx) => {
    const ingresos = serie('ingresos');
    const objetivo = serie('objetivo');

    const dona = bd.todos(
      "SELECT periodo AS n, valor AS v FROM metricas WHERE clave = 'dona' ORDER BY id ASC"
    );

    ctx.json({
      kpis: {
        // «Ingresos» = último mes de la serie (siempre en sincronía con la gráfica)
        ingresos: ingresos.length ? ingresos[ingresos.length - 1].v : null,
        ventas: metrica('ventas', '30d'),
        visitantes: metrica('visitantes', '30d'),
        conversion: metrica('conversion', '7d')
      },
      serie: {
        meses: ingresos.map((p) => p.m),
        ingresos: ingresos.map((p) => p.v),
        objetivo: objetivo.map((p) => p.v)
      },
      dona,
      donaTotal: metrica('dona_total', '30d'),
      pedidos: bd.todos(`SELECT ${COLS_PEDIDO} FROM pedidos ORDER BY referencia DESC LIMIT 5`),
      actividad: bd.todos(
        'SELECT id, tipo AS t, texto AS txt, detalle AS sub, tiempo FROM actividad ORDER BY id DESC LIMIT 8'
      )
    });
  });

  /* --------------------------------------------------------------- Ventas */
  // Serie de la gráfica de barras, equipo comercial y KPIs de la vista.
  api.get('/api/ventas', (ctx) => {
    ctx.json({
      kpis: {
        facturacion: metrica('facturacion', 'mes'),
        pedidosCerrados: metrica('pedidos_cerrados', 'total'),
        ticketMedio: metrica('ticket_medio', '30d')
      },
      serie: serie('ventas_mes'),
      vendedores: bd.todos(
        'SELECT nombre AS n, pedidos AS ped, facturado AS fact, objetivo AS obj FROM vendedores ORDER BY facturado DESC'
      )
    });
  });

  /* ------------------------------------------------------------ Productos */
  // Devuelve las claves cortas que usa el cliente: n, c, p, stock, v, i
  api.get('/api/productos', (ctx) => {
    const filas = bd.todos(
      'SELECT nombre, categoria, precio, stock, ventas, icono FROM productos WHERE activo = 1 ORDER BY orden ASC'
    );
    ctx.json(
      filas.map((p) => ({
        n: p.nombre,
        c: p.categoria,
        p: p.precio,
        stock: p.stock,
        v: p.ventas,
        i: p.icono
      }))
    );
  });

  /* ------------------------------------------------------------- Clientes */
  api.get('/api/clientes', (ctx) => {
    const filas = bd.todos(
      'SELECT nombre, email, plan, pais, pedidos, facturado FROM clientes WHERE activo = 1 ORDER BY id ASC'
    );
    ctx.json(
      filas.map((c) => ({
        n: c.nombre,
        mail: c.email,
        plan: c.plan,
        pais: c.pais,
        ped: c.pedidos,
        fact: c.facturado
      }))
    );
  });

  /* ------------------------------------------------------------ Actividad */
  api.get('/api/actividad', (ctx) => {
    const filas = bd.todos(
      'SELECT id, tipo AS t, texto AS txt, detalle AS sub, tiempo FROM actividad ORDER BY id DESC LIMIT 20'
    );
    ctx.json(filas);
  });

  /* -------------------------------------------------------------- Pedidos */
  // Filtrado en el SERVIDOR:  ?estado=todos|Entregado|En curso|Pendiente
  //                           ?q=texto (id, cliente o producto, sin acentos)
  api.get('/api/pedidos', (ctx) => {
    const estado = ctx.query.estado || 'todos';
    const q = (ctx.query.q || '').trim();

    if (estado !== 'todos' && !ESTADOS.includes(estado)) {
      return ctx.fallo(400, 'Estado no válido', ESTADOS.concat('todos'));
    }

    let sql = `SELECT ${COLS_PEDIDO} FROM pedidos WHERE 1 = 1`;
    const params = [];

    if (estado !== 'todos') {
      sql += ' AND estado = ?';
      params.push(estado);
    }

    if (q) {
      const patron = '%' + paraLike(normalizar(q)) + '%';
      sql += ` AND (${sinAcentos('CAST(referencia AS TEXT)')} LIKE ? ESCAPE '\\'
               OR ${sinAcentos('cliente')} LIKE ? ESCAPE '\\'
               OR ${sinAcentos('producto')} LIKE ? ESCAPE '\\')`;
      params.push(patron, patron, patron);
    }

    sql += ' ORDER BY referencia DESC';
    ctx.json(bd.todos(sql, ...params));
  });

  // Cambiar el estado de un pedido → requiere token de administración
  api.patch('/api/pedidos/:id/estado', async (ctx) => {
    if (!esAdmin(ctx)) {
      return ctx.fallo(401, 'Token de administración no válido (header x-admin-token)');
    }

    const datos = await ctx.cuerpo();
    const estado = String(datos.estado || '').trim();
    if (!ESTADOS.includes(estado)) {
      return ctx.fallo(400, 'Estado no válido', ESTADOS);
    }

    const referencia = Number(ctx.params.id);
    const cambio = bd.ejecutar('UPDATE pedidos SET estado = ? WHERE referencia = ?', estado, referencia);
    if (!cambio.changes) return ctx.fallo(404, 'No existe el pedido #' + referencia);

    const fila = bd.uno(`SELECT ${COLS_PEDIDO} FROM pedidos WHERE referencia = ?`, referencia);

    // Deja constancia en la lista de actividad del panel
    const tipo = estado === 'Entregado' ? 'exito' : estado === 'Pendiente' ? 'aviso' : 'pedido';
    bd.ejecutar(
      'INSERT INTO actividad (tipo, texto, detalle, tiempo) VALUES (?, ?, ?, ?)',
      tipo,
      `Pedido #${fila.id} marcado como ${estado}`,
      `${fila.cliente} · ${Number(fila.importe).toFixed(2)} €`,
      'ahora mismo'
    );

    ctx.json({ ok: true, pedido: fila });
  });

  /* --------------------------------------------------------- Exportar CSV */
  api.get('/api/exportar/pedidos.csv', (ctx) => {
    if (!esAdmin(ctx)) {
      return ctx.fallo(401, 'Token de administración no válido (header x-admin-token)');
    }

    const filas = bd.todos(
      `SELECT ${COLS_PEDIDO} FROM pedidos ORDER BY referencia DESC`
    );

    const esc = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };

    const cabecera = ['id', 'cliente', 'producto', 'fecha', 'importe', 'estado'];
    const lineas = filas.map((f) =>
      [f.id, f.cliente, f.producto, f.fecha, f.importe, f.estado].map(esc).join(',')
    );

    // BOM UTF-8 para que Excel abra bien los acentos
    const cuerpo = '\uFEFF' + [cabecera.join(','), ...lineas].join('\r\n');

    ctx.res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="pedidos.csv"',
      'Content-Length': Buffer.byteLength(cuerpo),
      'Cache-Control': 'no-store'
    });
    ctx.res.end(cuerpo);
  });

  /* ---------------------------------------------------------------- Login */
  api.post('/api/login', async (ctx) => {
    const ip = ctx.ip;
    if (!limiteLogin.permitido(ip)) {
      return ctx.fallo(429, 'Demasiados intentos. Espera un minuto y vuelve a probar.');
    }

    const datos = await ctx.cuerpo();
    const usuario = String(datos.usuario || '').trim();
    const clave = String(datos.clave || '');

    const usuarioOk = usuario === (process.env.ADMIN_USER || 'admin');
    const claveOk = Boolean(process.env.ADMIN_PASSWORD) && clave === process.env.ADMIN_PASSWORD;

    if (!usuarioOk || !claveOk) {
      return ctx.fallo(401, 'Usuario o contraseña incorrectos');
    }

    // Limpia sesiones caducadas y crea la nueva (24 h)
    bd.ejecutar('DELETE FROM sesiones WHERE caduca_en < ?', new Date().toISOString());

    const token = crypto.randomUUID();
    const creadoEn = new Date().toISOString();
    const caducaEn = new Date(Date.now() + VIDA_TOKEN_MS).toISOString();
    bd.ejecutar(
      'INSERT INTO sesiones (token, usuario, creado_en, caduca_en) VALUES (?, ?, ?, ?)',
      token, usuario, creadoEn, caducaEn
    );

    limiteLogin.reiniciar(ip);

    ctx.json({ ok: true, token, usuario, caduca_en: caducaEn }, 201);
  });

  /* ------------------------------------------------------------- ¿Quién? */
  api.get('/api/yo', (ctx) => {
    const token = tokenRecibido(ctx);
    if (!token) return ctx.fallo(401, 'Falta el token (Authorization: Bearer … o x-admin-token)');

    if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) {
      return ctx.json({ ok: true, usuario: process.env.ADMIN_USER || 'admin', origen: 'ADMIN_TOKEN' });
    }

    const sesion = sesionValida(bd, token);
    if (!sesion) return ctx.fallo(401, 'Token no válido o caducado');

    ctx.json({
      ok: true,
      usuario: sesion.usuario,
      origen: 'sesion',
      caduca_en: sesion.caduca_en
    });
  });
};

module.exports.ESTADOS = ESTADOS;
module.exports.tokenRecibido = tokenRecibido;
