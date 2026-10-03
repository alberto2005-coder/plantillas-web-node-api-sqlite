/* ==========================================================================
   API REST — 01-portfolio
   --------------------------------------------------------------------------
   Todas las rutas devuelven JSON. Las de escritura (POST/PUT/DELETE)
   aceptan `Content-Type: application/json`.

   GET    /api/salud          → estado del servidor
   GET    /api/proyectos      → proyectos del portafolio (los del index.html)
   POST   /api/contacto       → guarda un mensaje del formulario de contacto
   GET    /api/mensajes       → bandeja de entrada (requiere token de admin)
   DELETE /api/mensajes/:id   → borra un mensaje (requiere token de admin)

   ¿Cómo añadir un endpoint?  Añade una línea aquí (ver README, sección
   "Cómo añadir una API nueva").
   ========================================================================== */

'use strict';

const { enviarCorreo } = require('./lib/email');
const { crearLimitador } = require('./lib/limitador');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const { tokenValido } = require('./lib/token');

/** Comprueba el token de administración (solo cabecera x-admin-token) */
function esAdmin(ctx) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  return tokenValido(ctx.cabecera('x-admin-token') || '', token);
}

module.exports = function registrar(api, { bd }) {
  const limiteContacto = crearLimitador({
    max: Number(process.env.LIMITE_CONTACTO || 5),
    ventanaMs: 60000
  });

  /* ---------------------------------------------------------------- Salud */
  api.get('/api/salud', (ctx) =>
    ctx.json({
      ok: true,
      servicio: 'portfolio-api',
      version: '1.0.0',
      node: process.version,
      hora: new Date().toISOString(),
      uptime_s: Math.round(process.uptime())
    })
  );

  /* ------------------------------------------------------------ Proyectos */
  api.get('/api/proyectos', (ctx) => {
    const fila = bd.todos('SELECT * FROM proyectos ORDER BY orden ASC');
    ctx.json(fila.map((p) => ({ ...p, activo: Boolean(p.activo) })));
  });

  api.get('/api/proyectos/:id', (ctx) => {
    const p = bd.uno('SELECT * FROM proyectos WHERE id = ?', ctx.params.id);
    if (!p) return ctx.fallo(404, 'No existe ese proyecto');
    ctx.json({ ...p, activo: Boolean(p.activo) });
  });

  /* ------------------------------------------------------------- Contacto */
  api.post('/api/contacto', async (ctx) => {
    const ip = ctx.ip;
    if (!limiteContacto.permitido(ip)) {
      return ctx.fallo(429, 'Demasiados envíos desde esta conexión. Inténtalo dentro de un minuto.');
    }

    const datos = await ctx.cuerpo();
    const nombre = String(datos.nombre || '').trim();
    const email = String(datos.email || '').trim();
    const mensaje = String(datos.mensaje || '').trim();

    const errores = [];
    if (nombre.length < 2) errores.push('El nombre debe tener al menos 2 caracteres.');
    if (!EMAIL_REGEX.test(email)) errores.push('El correo no tiene un formato válido.');
    if (mensaje.length < 10) errores.push('El mensaje debe tener al menos 10 caracteres.');
    if (errores.length) {
      return ctx.fallo(400, 'Revisa el formulario', errores);
    }

    const id = bd.ejecutar(
      'INSERT INTO mensajes (nombre, email, mensaje, ip) VALUES (?, ?, ?, ?)',
      nombre, email, mensaje, ip
    ).lastInsertRowid;

    // Correo opcional: solo se envía si has configurado .env (ver README)
    const destino = process.env.CONTACTO_DESTINO || email;
    const envio = await enviarCorreo({
      para: destino,
      asunto: `Nuevo mensaje de ${nombre} (portfolio)`,
      texto: `Nombre: ${nombre}\nCorreo: ${email}\n\n${mensaje}`
    });

    // Sin reiniciar el contador: LIMITE_CONTACTO cuenta TODOS los intentos
    // (válidos y fallidos) en la ventana de un minuto, como documenta el README.
    ctx.json(
      {
        ok: true,
        id: Number(id),
        mensaje: 'Mensaje recibido. Gracias por escribir.',
        correo: envio.enviado ? 'enviado' : 'demo',
        detalleCorreo: envio.motivo || null
      },
      201
    );
  });

  /* ------------------------------------------------- Bandeja de mensajes */
  api.get('/api/mensajes', (ctx) => {
    if (!esAdmin(ctx)) return ctx.fallo(401, 'Token de administración no válido (header x-admin-token)');
    const filas = bd.todos(
      'SELECT id, nombre, email, mensaje, leido, creado_en FROM mensajes ORDER BY creado_en DESC, id DESC LIMIT 200'
    );
    ctx.json(filas.map((m) => ({ ...m, leido: Boolean(m.leido) })));
  });

  api.delete('/api/mensajes/:id', (ctx) => {
    if (!esAdmin(ctx)) return ctx.fallo(401, 'Token de administración no válido');
    const r = bd.ejecutar('DELETE FROM mensajes WHERE id = ?', ctx.params.id);
    if (!r.changes) return ctx.fallo(404, 'No existe ese mensaje');
    ctx.json({ ok: true, borrados: Number(r.changes) });
  });
};
