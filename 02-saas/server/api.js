/* ==========================================================================
   API REST — 02-saas (Fluxo)
   --------------------------------------------------------------------------
   Todas las rutas devuelven JSON. Las de escritura (POST) aceptan
   `Content-Type: application/json`.

   GET    /api/salud            → estado del servidor
   GET    /api/planes           → los planes de precios (desde la base de datos)
   POST   /api/registro         → alta de prueba de 14 días (formulario del hero)
   POST   /api/newsletter       → suscripción a la lista de novedades
   POST   /api/pago/sesion      → crea una sesión de checkout de Stripe (o modo demo)
   POST   /api/stripe/webhook   → recibe los eventos de Stripe (activa la suscripción)
   GET    /api/verificar        → confirma el correo desde el enlace del email
   GET    /api/suscripciones    → altas registradas (requiere token de admin)

   PAGOS: no hace falta `npm install stripe`. Se llama a la API REST de Stripe
   con fetch (módulo nativo de Node). Solo tienes que pegar tus claves en .env.

   ¿Cómo añadir un endpoint?  Añade una línea aquí (ver README, sección 6.9
   "Añadir una API nueva").
   ========================================================================== */

'use strict';

const crypto = require('node:crypto');

const { enviarCorreo } = require('./lib/email');
const { crearLimitador } = require('./lib/limitador');
const { entero, opcional } = require('./lib/env');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PERIODOS = new Set(['mensual', 'anual']);

const { tokenValido } = require('./lib/token');

/** Comprueba el token de administración (solo cabecera x-admin-token) */
function esAdmin(ctx) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  return tokenValido(ctx.cabecera('x-admin-token') || '', token);
}

/** Raíz pública del sitio (para enlaces de verificación y de pago) */
function sitio() {
  const base = opcional(process.env.SITE_URL) || `http://localhost:${process.env.PORT || 3000}`;
  return base.replace(/\/+$/, '');
}

/**
 * Token de verificación del correo: HMAC-SHA256 del id con un secreto.
 * No se guarda en la BD, así que cualquier petición con el enlace correcto
 * puede verificar la cuenta (es el patrón típico de "clica el enlace").
 */
function tokenVerificacion(id) {
  const secreto = opcional(process.env.ADMIN_TOKEN) || 'fluxo-demo';
  return crypto.createHmac('sha256', secreto).update('fluxo-verificar:' + id).digest('hex').slice(0, 32);
}

/** Lee `funciones` (TEXT con JSON) sin reventar si está corrupto */
function parsearFunciones(texto) {
  try {
    const lista = JSON.parse(texto || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

/* ==========================================================================
   CLIENTE DE STRIPE — sin librerías, solo fetch (API REST de Stripe)
   --------------------------------------------------------------------------
   Si pegas STRIPE_SECRET_KEY en .env, esto funciona tal cual. Si está vacío,
   los endpoints responden {modo:"demo"} y no se cobra nada.
   ========================================================================== */

/**
 * Convierte objetos anidados en los pares que entiende Stripe:
 *   { line_items: [{ price: 'p', quantity: 1 }] }
 *   → line_items[0][price]=p&line_items[0][quantity]=1
 */
function aplanar(datos, prefijo, salida) {
  Object.keys(datos || {}).forEach((clave) => {
    const valor = datos[clave];
    const k = prefijo ? `${prefijo}[${clave}]` : clave;
    if (valor === undefined || valor === null) return;
    if (typeof valor === 'object') {
      aplanar(valor, k, salida);
    } else if (typeof valor === 'boolean') {
      salida.append(k, valor ? 'true' : 'false');
    } else {
      salida.append(k, String(valor));
    }
  });
  return salida;
}

/**
 * Llamada genérica a https://api.stripe.com/v1/<ruta>
 * @throws {Error} si Stripe devuelve un error (con el mensaje real de Stripe)
 */
async function stripeAPI(clave, ruta, params) {
  const cuerpo = aplanar(params, '', new URLSearchParams());
  const respuesta = await fetch(`https://api.stripe.com/v1/${ruta}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${clave}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: cuerpo.toString()
  });

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const mensaje =
      (datos.error && datos.error.message) || `Stripe ha respondido HTTP ${respuesta.status}`;
    const fallo = new Error(mensaje);
    fallo.codigo = respuesta.status;
    fallo.stripe = datos;
    throw fallo;
  }
  return datos;
}

/** Lee el cuerpo SIN interpretar (hace falta para verificar la firma de Stripe) */
function cuerpoBruto(req) {
  return new Promise((resolver, rechazar) => {
    const trozos = [];
    let tamano = 0;
    req.on('data', (trozo) => {
      tamano += trozo.length;
      if (tamano > 1024 * 1024) {
        rechazar(new Error('Cuerpo demasiado grande'));
        req.destroy();
        return;
      }
      trozos.push(trozo);
    });
    req.on('end', () => resolver(Buffer.concat(trozos).toString('utf8')));
    req.on('error', rechazar);
  });
}

/**
 * Verifica la cabecera `Stripe-Signature: t=...,v1=...`
 * El HMAC se calcula sobre `${t}.${cuerpo}` con STRIPE_WEBHOOK_SECRET.
 * Así el webhook solo puede llamar Stripe de verdad.
 */
function firmaStripeValida(bruto, cabecera, secreto) {
  const campos = {};
  String(cabecera || '')
    .split(',')
    .forEach((par) => {
      const i = par.indexOf('=');
      if (i > 0) campos[par.slice(0, i).trim()] = par.slice(i + 1).trim();
    });

  const t = Number(campos.t);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) return false; // tolerancia 5 min

  const esperado = crypto.createHmac('sha256', secreto).update(`${t}.${bruto}`).digest('hex');
  const firmas = String(campos.v1 || '').split(',').filter(Boolean);
  if (!firmas.length) return false;

  return firmas.some((firma) => {
    if (firma.length !== esperado.length) return false;
    return crypto.timingSafeEqual(Buffer.from(firma, 'utf8'), Buffer.from(esperado, 'utf8'));
  });
}


module.exports = function registrar(api, { bd }) {
  // Límites por IP (en memoria): protegen los endpoints de alta
  const limiteRegistro = crearLimitador({
    max: entero(process.env.LIMITE_REGISTRO, 10),
    ventanaMs: 60000
  });
  const limiteNewsletter = crearLimitador({
    max: entero(process.env.LIMITE_REGISTRO, 10),
    ventanaMs: 60000
  });
  const limitePago = crearLimitador({ max: 5, ventanaMs: 60000 });

  /* ---------------------------------------------------------------- Salud */
  api.get('/api/salud', (ctx) =>
    ctx.json({
      ok: true,
      servicio: 'fluxo-api',
      version: '1.0.0',
      node: process.version,
      hora: new Date().toISOString(),
      uptime_s: Math.round(process.uptime())
    })
  );

  /* --------------------------------------------------------------- Planes */
  // Los mismos que pinta el index.html: fuente única de verdad = la BD.
  api.get('/api/planes', (ctx) => {
    const filas = bd.todos('SELECT * FROM planes ORDER BY orden ASC, id ASC');
    ctx.json(
      filas.map((p) => ({
        id: Number(p.id),
        clave: p.clave,
        nombre: p.nombre,
        precio_mensual: Number(p.precio_mensual),
        precio_anual: Number(p.precio_anual),
        destacado: Boolean(p.destacado),
        funciones: parsearFunciones(p.funciones),
        orden: Number(p.orden)
      }))
    );
  });

  /* ------------------------------------------------------------- Registro */
  // Alta de prueba desde el formulario del hero (#formRegistro).
  api.post('/api/registro', async (ctx) => {
    const datos = await ctx.cuerpo();
    const email = String(datos.email || '').trim().toLowerCase();

    // 1) Validación
    if (!EMAIL_REGEX.test(email)) {
      return ctx.fallo(400, 'El correo no tiene un formato válido.', ['Escribe algo como tu@empresa.com']);
    }

    let plan = String(datos.plan || '').trim().toLowerCase();
    if (plan && !bd.uno('SELECT id FROM planes WHERE clave = ?', plan)) {
      return ctx.fallo(400, 'No existe el plan indicado.', ['Planes válidos: basico, pro, empresa']);
    }
    if (!plan) plan = 'pro';

    const periodo = PERIODOS.has(String(datos.periodo || '')) ? String(datos.periodo) : 'mensual';

    // 2) Límite por IP (anti-spam)
    if (!limiteRegistro.permitido(ctx.ip)) {
      return ctx.fallo(429, 'Demasiados registros desde esta conexión. Inténtalo dentro de un minuto.');
    }

    // 3) ¿Ya estaba dado de alta?
    const existente = bd.uno('SELECT id, estado FROM suscripciones WHERE email = ? ORDER BY id DESC', email);
    if (existente) {
      return ctx.json({
        ok: true,
        id: Number(existente.id),
        mensaje: `Este correo (${email}) ya estaba registrado en Fluxo. Si no recibiste el enlace, vuelve a intentarlo en un minuto.`,
        correo: 'demo',
        repetido: true
      });
    }

    // 4) Se guarda con estado 'prueba'
    const id = bd.ejecutar(
      'INSERT INTO suscripciones (email, plan, periodo, estado, ip) VALUES (?, ?, ?, ?, ?)',
      email, plan, periodo, 'prueba', ctx.ip
    ).lastInsertRowid;

    // 5) Correo de bienvenida con enlace de verificación (opcional, ver README §6.7)
    const dias = entero(process.env.DIAS_PRUEBA, 14);
    const nombrePlan = (bd.uno('SELECT nombre FROM planes WHERE clave = ?', plan) || {}).nombre || plan;
    const enlace = `${sitio()}/api/verificar?id=${id}&token=${tokenVerificacion(id)}`;

    const envio = await enviarCorreo({
      para: email,
      asunto: `Bienvenido a Fluxo — verifica tu correo (plan ${nombrePlan})`,
      texto:
        `Hola,\n\n` +
        `Has creado una cuenta de prueba en Fluxo con el plan ${nombrePlan}, facturación ${periodo}.\n` +
        `Tu prueba gratuita dura ${dias} días y no necesita tarjeta de crédito.\n\n` +
        `Verifica tu correo pulsando aquí:\n${enlace}\n\n` +
        `Si no has sido tú, puedes ignorar este mensaje.\n\n` +
        `— El equipo de Fluxo`
    });

    limiteRegistro.reiniciar(ctx.ip);

    ctx.json(
      {
        ok: true,
        id: Number(id),
        mensaje: envio.enviado
          ? `Cuenta de prueba creada para ${email}. Te hemos enviado un enlace de verificación.`
          : `Cuenta de prueba creada para ${email}. (Modo demo: no hay correo configurado en .env)`,
        correo: envio.enviado ? 'enviado' : 'demo',
        plan,
        periodo,
        dias_prueba: dias,
        detalleCorreo: envio.motivo || null
      },
      201
    );
  });

  /* ----------------------------------------------------------- Newsletter */
  api.post('/api/newsletter', async (ctx) => {
    const datos = await ctx.cuerpo();
    const email = String(datos.email || '').trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return ctx.fallo(400, 'El correo no tiene un formato válido.');
    }
    if (!limiteNewsletter.permitido(ctx.ip)) {
      return ctx.fallo(429, 'Demasiadas suscripciones desde esta conexión. Inténtalo dentro de un minuto.');
    }

    const existente = bd.uno('SELECT id FROM newsletter WHERE email = ?', email);
    if (existente) {
      return ctx.json({
        ok: true,
        id: Number(existente.id),
        mensaje: `Este correo (${email}) ya estaba en la lista.`,
        repetido: true
      });
    }

    const origen = String(datos.origen || 'landing').trim().slice(0, 40) || 'landing';
    const id = bd.ejecutar(
      'INSERT INTO newsletter (email, origen) VALUES (?, ?)',
      email, origen
    ).lastInsertRowid;

    limiteNewsletter.reiniciar(ctx.ip);

    ctx.json({ ok: true, id: Number(id), mensaje: `¡Listo! Avisaremos a ${email} de las novedades de Fluxo.` }, 201);
  });

  /* --------------------------------------------------------- Pago (Stripe) */
  // Dos caminos posibles (ver README §6.7):
  //   a) STRIPE_SECRET_KEY + STRIPE_PRICE_ID_PRO en .env → checkout real.
  //      Se llama a la API REST de Stripe con fetch: NO hace falta instalar nada.
  //   b) Sin nada → responde {modo:'demo'} con un mensaje claro. NO falla.
  api.post('/api/pago/sesion', async (ctx) => {
    const datos = await ctx.cuerpo();
    const email = String(datos.email || '').trim().toLowerCase();
    if (email && !EMAIL_REGEX.test(email)) {
      return ctx.fallo(400, 'El correo no tiene un formato válido.');
    }
    if (!limitePago.permitido(ctx.ip)) {
      return ctx.fallo(429, 'Demasiadas peticiones de pago desde esta conexión.');
    }

    const plan = String(datos.plan || 'pro').trim().toLowerCase();
    const periodo = PERIODOS.has(String(datos.periodo || '')) ? String(datos.periodo) : 'mensual';

    // a) Clave de Stripe definida en .env
    const clave = opcional(process.env.STRIPE_SECRET_KEY);
    if (!clave) {
      return ctx.json({
        modo: 'demo',
        mensaje:
          'Stripe no está configurado: pega STRIPE_SECRET_KEY (y STRIPE_PRICE_ID_PRO) en el fichero .env y reinicia el servidor. ' +
          'Mientras tanto no se cobra nada.'
      });
    }

    // Precio de Stripe según el plan elegido (una clave por plan en .env)
    const PRECIOS = {
      basico: 'STRIPE_PRICE_ID_BASICO',
      pro: 'STRIPE_PRICE_ID_PRO',
      empresa: 'STRIPE_PRICE_ID_EMPRESA'
    };
    const clavePrecio = PRECIOS[plan];
    if (!clavePrecio) {
      return ctx.fallo(400, 'No conozco ese plan.', ['Planes válidos: basico, pro, empresa']);
    }

    const priceId = opcional(process.env[clavePrecio]);
    if (!priceId) {
      return ctx.fallo(
        400,
        `Stripe está a medias: falta ${clavePrecio} en .env (el Precio recurrente del plan "${plan}").`,
        [
          '1. Crea un producto con precio recurrente en https://dashboard.stripe.com/products',
          `2. Copia su id (price_…) y pégalo en ${clavePrecio}`,
          '3. Reinicia el servidor (Ctrl + C → npm start)'
        ]
      );
    }

    try {
      // Sesión de checkout: una sola llamada a la API REST de Stripe (sin librería)
      const sesion = await stripeAPI(clave, 'checkout/sessions', {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        ...(email ? { customer_email: email } : {}),
        allow_promotion_codes: true,
        metadata: { plan, periodo },
        success_url: `${sitio()}/?pago=ok#registro`,
        cancel_url: `${sitio()}/#precios`
      });

      // Se anota el id de la sesión en la suscripción correspondiente (si existe)
      if (email) {
        bd.ejecutar(
          'UPDATE suscripciones SET stripe_session_id = ? WHERE email = ?',
          String(sesion.id), email
        );
      }

      return ctx.json({ ok: true, modo: 'stripe', url: sesion.url, id: sesion.id });
    } catch (e) {
      // Error real de la API de Stripe: se devuelve tal cual (502 = fallo externo)
      const tipo = e.stripe && e.stripe.error ? e.stripe.error.type : 'HTTP ' + (e.codigo || 500);
      return ctx.fallo(502, 'Stripe ha devuelto un error.', [e.message, `(${tipo})`]);
    }
  });

  /* -------------------------------------------------------- Webhook Stripe */
  // Stripe avisa aquí cuando pasa algo (pago completado, cobro fallido…).
  // Configúralo en https://dashboard.stripe.com/webhooks:
  //   Endpoint:  <SITE_URL>/api/stripe/webhook
  //   Eventos:   checkout.session.completed
  // La firma se verifica con STRIPE_WEBHOOK_SECRET: solo Stripe real puede
  // llamar (sin esa clave en .env, la petición se rechaza con 400).
  api.post('/api/stripe/webhook', async (ctx) => {
    const secreto = opcional(process.env.STRIPE_WEBHOOK_SECRET);
    if (!secreto) {
      return ctx.fallo(400, 'Falta STRIPE_WEBHOOK_SECRET en .env (secreto del webhook de Stripe).', [
        'Cópialo desde https://dashboard.stripe.com/webhooks y reinicia el servidor.'
      ]);
    }

    const bruto = await cuerpoBruto(ctx.req);
    const cabecera = ctx.cabecera('stripe-signature');
    if (!firmaStripeValida(bruto, cabecera, secreto)) {
      return ctx.fallo(401, 'Firma de Stripe no válida. ¿Coincide STRIPE_WEBHOOK_SECRET con el del panel?');
    }

    let evento;
    try {
      evento = JSON.parse(bruto);
    } catch (e) {
      return ctx.fallo(400, 'El cuerpo del evento no es JSON válido.');
    }

    const tipo = String(evento.type || '');
    const objeto = (evento.data && evento.data.object) || {};
    let aplicado = null;

    // 1) El cliente ha pagado → la suscripción pasa a "activa"
    if (tipo === 'checkout.session.completed') {
      const sesionId = String(objeto.id || '');
      const correo = String(
        (objeto.customer_details && objeto.customer_details.email) ||
          objeto.customer_email ||
          ''
      ).toLowerCase();

      let fila = bd.uno('SELECT id FROM suscripciones WHERE stripe_session_id = ?', sesionId);
      if (!fila && correo) {
        fila = bd.uno('SELECT id FROM suscripciones WHERE email = ? ORDER BY id DESC', correo);
      }

      if (fila) {
        bd.ejecutar(
          "UPDATE suscripciones SET estado = 'activa', stripe_session_id = ? WHERE id = ?",
          sesionId, fila.id
        );
        aplicado = `suscripción ${fila.id} activada`;
      } else if (correo) {
        const meta = objeto.metadata || {};
        bd.ejecutar(
          "INSERT INTO suscripciones (email, plan, periodo, estado, stripe_session_id) VALUES (?, ?, ?, 'activa', ?)",
          correo, String(meta.plan || 'pro'), String(meta.periodo || 'mensual'), sesionId
        );
        aplicado = 'alta creada como activa';
      } else {
        aplicado = 'evento recibido sin correo asociado';
      }
    }

    // 2) Cancelación o cobro fallido → "cancelada"
    if (tipo === 'customer.subscription.deleted' || tipo === 'invoice.payment_failed') {
      const meta = objeto.metadata || {};
      const correo = String(objeto.customer_email || meta.email || '').toLowerCase();
      if (correo) {
        const r = bd.ejecutar("UPDATE suscripciones SET estado = 'cancelada' WHERE email = ?", correo);
        aplicado = r.changes ? `${Number(r.changes)} suscripción(es) canceladas` : 'sin suscripción para ese correo';
      }
    }

    console.log(`[stripe] ${tipo || '(evento sin tipo)'} → ${aplicado || 'solo registrado'}`);
    ctx.json({ ok: true, recibido: true, tipo, aplicado });
  });

  /* --------------------------------------------------- Verificación correo */
  // Enlace que llega por correo: GET /api/verificar?id=1&token=abcdef…
  api.get('/api/verificar', (ctx) => {
    const fila = bd.uno('SELECT * FROM suscripciones WHERE id = ?', ctx.query.id || '');
    if (!fila) return ctx.fallo(404, 'No existe esa suscripción.');
    if (String(ctx.query.token || '') !== tokenVerificacion(fila.id)) {
      return ctx.fallo(401, 'El enlace de verificación no es válido.');
    }

    if (fila.estado === 'prueba') {
      bd.ejecutar("UPDATE suscripciones SET estado = 'activa' WHERE id = ?", fila.id);
    }

    const dias = entero(process.env.DIAS_PRUEBA, 14);
    ctx.json({
      ok: true,
      mensaje: `Correo verificado para ${fila.email}. Tu prueba de ${dias} días empieza hoy.`,
      estado: fila.estado === 'prueba' ? 'activa' : fila.estado
    });
  });

  /* -------------------------------------------------------- Suscripciones */
  // Bandeja de altas: solo con el token de administración.
  api.get('/api/suscripciones', (ctx) => {
    if (!esAdmin(ctx)) {
      return ctx.fallo(401, 'Token de administración no válido (header x-admin-token)');
    }
    const filas = bd.todos(
      'SELECT * FROM suscripciones ORDER BY creado_en DESC, id DESC LIMIT 200'
    );
    const total = bd.uno('SELECT COUNT(*) AS n FROM suscripciones');
    ctx.json({ total: Number(total.n), suscripciones: filas });
  });
};
