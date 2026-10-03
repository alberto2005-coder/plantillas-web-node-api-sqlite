/* ==========================================================================
    API REST — 05-agencia
    --------------------------------------------------------------------------
    Todas las rutas devuelven JSON. Las de escritura (POST/DELETE) aceptan
    `Content-Type: application/json`.

    GET    /api/salud           → estado del servidor
    GET    /api/proyectos       → los 6 proyectos (datos del modal)
    GET    /api/proyectos/:clave→ un proyecto por su clave ('lumen'…)
    GET    /api/servicios       → los 4 servicios de la sección #servicios
    GET    /api/cifras          → los 4 contadores de la sección #estudio
    POST   /api/presupuesto     → guarda la solicitud del formulario
    GET    /api/presupuestos    → bandeja de solicitudes (token de admin)
    DELETE /api/presupuestos/:id→ borra una solicitud (token de admin)

    ¿Cómo añadir un endpoint?  Añade una línea aquí (ver README, sección 6.5).
    ========================================================================== */

'use strict';

const { enviarCorreo } = require('./lib/email');
const { crearLimitador } = require('./lib/limitador');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valores admitidos en el campo `tipo` (deben coincidir con el <select>) */
const TIPOS = ['web', 'landing', 'branding', 'app', 'seo', 'otro'];

/** Tramos de presupuesto admitidos (deben coincidir con el <select>) */
const TRAMOS = ['menos-3000', '3000-8000', '8000-20000', 'mas-20000'];

/** Comprueba el token de administración (header o query) */
function esAdmin(ctx) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const enviado = ctx.cabecera('x-admin-token') || ctx.query.token || '';
  return enviado === token;
}

/** Crea un código corto y legible para localizar la solicitud en la BD */
function nuevaReferencia(id) {
  const sufijo = Math.random().toString(36).slice(2, 6).toUpperCase();
  return 'VTX-' + String(id).padStart(4, '0') + '-' + sufijo;
}

module.exports = function registrar(api, { bd }) {
  const limitePresupuesto = crearLimitador({
    max: Number(process.env.LIMITE_PRESUPUESTO || 5),
    ventanaMs: 60000
  });

  /* ---------------------------------------------------------------- Salud */
  api.get('/api/salud', (ctx) =>
    ctx.json({
      ok: true,
      servicio: 'agencia-api',
      version: '1.0.0',
      node: process.version,
      hora: new Date().toISOString(),
      uptime_s: Math.round(process.uptime())
    })
  );

  /* ------------------------------------------------------------- Proyectos */
  api.get('/api/proyectos', (ctx) => {
    const filas = bd.todos('SELECT * FROM proyectos WHERE activo = ? ORDER BY orden ASC', 1);
    ctx.json(filas.map((p) => ({ ...p, activo: Boolean(p.activo) })));
  });

  api.get('/api/proyectos/:clave', (ctx) => {
    const p = bd.uno('SELECT * FROM proyectos WHERE clave = ?', ctx.params.clave);
    if (!p) return ctx.fallo(404, 'No existe ese proyecto');
    ctx.json({ ...p, activo: Boolean(p.activo) });
  });

  /* -------------------------------------------------------------- Servicios */
  api.get('/api/servicios', (ctx) => {
    const filas = bd.todos('SELECT * FROM servicios WHERE activo = ? ORDER BY orden ASC', 1);
    ctx.json(filas.map((s) => ({ ...s, activo: Boolean(s.activo) })));
  });

  /* ----------------------------------------------------------------- Cifras */
  api.get('/api/cifras', (ctx) => {
    ctx.json(bd.todos('SELECT * FROM cifras ORDER BY id ASC'));
  });

  /* ----------------------------------------------------------- Presupuesto */
  api.post('/api/presupuesto', async (ctx) => {
    const ip = ctx.ip;
    if (!limitePresupuesto.permitido(ip)) {
      return ctx.fallo(429, 'Demasiadas solicitudes desde esta conexión. Inténtalo dentro de un minuto.');
    }

    const datos = await ctx.cuerpo();

    const nombre = String(datos.nombre || '').trim();
    const email = String(datos.email || '').trim();
    const empresa = String(datos.empresa || '').trim();
    const tipo = String(datos.tipo || '').trim();
    const presupuesto = String(datos.presupuesto || '').trim();
    const mensaje = String(datos.mensaje || '').trim();

    // Validación campo a campo: `campos` es { nombre: 'mensaje de error', … }
    const campos = {};
    if (nombre.length < 2) campos.nombre = 'Escribe tu nombre (mínimo 2 caracteres).';
    if (!EMAIL_REGEX.test(email)) campos.email = 'Introduce un correo válido, por ejemplo nombre@dominio.com.';
    if (!TIPOS.includes(tipo)) campos.tipo = 'Elige el tipo de proyecto: ' + TIPOS.join(', ') + '.';
    if (mensaje.length < 10) campos.mensaje = 'El mensaje debe tener al menos 10 caracteres.';
    if (presupuesto && !TRAMOS.includes(presupuesto)) {
      campos.presupuesto = 'Elige uno de los tramos de presupuesto disponibles.';
    }

    if (Object.keys(campos).length) {
      return ctx.fallo(400, 'Revisa el formulario', campos);
    }

    const id = Number(
      bd.ejecutar(
        `INSERT INTO presupuestos (nombre, email, empresa, tipo, presupuesto, mensaje, ip, referencia)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        nombre, email, empresa, tipo, presupuesto, mensaje, ip, ''
      ).lastInsertRowid
    );

    const referencia = nuevaReferencia(id);
    bd.ejecutar('UPDATE presupuestos SET referencia = ? WHERE id = ?', referencia, id);

    // Correo opcional: solo se envía si has configurado el .env (ver README §6.6)
    const destino = process.env.CONTACTO_DESTINO || email;
    const envio = await enviarCorreo({
      para: destino,
      asunto: `Nueva solicitud de presupuesto de ${nombre} (${tipo})`,
      texto:
        `Referencia: ${referencia}\n` +
        `Nombre: ${nombre}\nCorreo: ${email}\nEmpresa: ${empresa || '—'}\n` +
        `Tipo: ${tipo}\nPresupuesto: ${presupuesto || '—'}\n` +
        `IP: ${ip}\n\n${mensaje}`
    });

    limitePresupuesto.reiniciar(ip);

    ctx.json(
      {
        ok: true,
        id,
        referencia,
        correo: envio.enviado ? 'enviado' : 'demo',
        detalleCorreo: envio.motivo || null,
        mensaje: 'Solicitud recibida. Te respondemos en menos de 24 h laborables.'
      },
      201
    );
  });

  /* -------------------------------------------------- Bandeja de solicitudes */
  api.get('/api/presupuestos', (ctx) => {
    if (!esAdmin(ctx)) return ctx.fallo(401, 'Token de administración no válido (header x-admin-token)');
    const filas = bd.todos(
      'SELECT id, nombre, email, empresa, tipo, presupuesto, mensaje, referencia, creado_en ' +
        'FROM presupuestos ORDER BY creado_en DESC, id DESC LIMIT 200'
    );
    ctx.json(filas);
  });

  api.delete('/api/presupuestos/:id', (ctx) => {
    if (!esAdmin(ctx)) return ctx.fallo(401, 'Token de administración no válido');
    const r = bd.ejecutar('DELETE FROM presupuestos WHERE id = ?', ctx.params.id);
    if (!r.changes) return ctx.fallo(404, 'No existe esa solicitud');
    ctx.json({ ok: true, borrados: Number(r.changes) });
  });
};
