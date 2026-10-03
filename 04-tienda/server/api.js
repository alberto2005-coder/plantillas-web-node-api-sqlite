/* ==========================================================================
   API REST — 04-tienda · NovaTech Store
   --------------------------------------------------------------------------
   Todas las rutas devuelven JSON. Las de escritura (POST) aceptan
   `Content-Type: application/json`.

   GET    /api/salud              → estado del servidor
   GET    /api/productos          → catálogo (?categoria=&q=&orden=)
   GET    /api/productos/:id      → un producto concreto
   POST   /api/pedidos            → crea un pedido real (descuenta stock)
   GET    /api/pedidos/:referencia→ consulta pública del estado de un pedido
   GET    /api/pedidos            → listado de pedidos (token de admin)
   POST   /api/checkout           → PaymentIntent de Stripe o modo demo
   POST   /api/stripe/webhook     → eventos de Stripe (marca el pedido como cobrado)
   POST   /api/newsletter         → alta de suscriptor

   PAGOS: no hace falta `npm install stripe`. Se llama a la API REST de Stripe
   con fetch (módulo nativo de Node). Solo tienes que pegar tu clave en .env.

   ¿Cómo añadir un endpoint?  Añade una línea aquí (ver README, sección
   "Cómo personalizarla").
   ========================================================================== */

'use strict';

const crypto = require('node:crypto');

const { enviarCorreo } = require('./lib/email');
const { crearLimitador } = require('./lib/limitador');
const { opcional } = require('./lib/env');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ==========================================================================
   CLIENTE DE STRIPE — sin librerías, solo fetch (API REST de Stripe)
   --------------------------------------------------------------------------
   Si pegas STRIPE_SECRET_KEY en .env, esto funciona tal cual. Si está vacío,
   /api/checkout responde {modo:"demo"} y no se cobra nada.
   ========================================================================== */

/** Aplana objetos a los pares que entiende Stripe (amount=1000&metadata[x]=y) */
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

/** Llamada genérica a https://api.stripe.com/v1/<ruta> */
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
    const error = new Error(mensaje);
    error.codigo = respuesta.status;
    error.stripe = datos;
    throw error;
  }
  return datos;
}

/** Cuerpo SIN interpretar (hace falta para verificar la firma de Stripe) */
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

/** Verifica `Stripe-Signature: t=...,v1=...` con STRIPE_WEBHOOK_SECRET */
function firmaStripeValida(bruto, cabecera, secreto) {
  const campos = {};
  String(cabecera || '')
    .split(',')
    .forEach((par) => {
      const i = par.indexOf('=');
      if (i > 0) campos[par.slice(0, i).trim()] = par.slice(i + 1).trim();
    });

  const t = Number(campos.t);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) return false; // 5 min

  const esperado = crypto.createHmac('sha256', secreto).update(`${t}.${bruto}`).digest('hex');
  const firmas = String(campos.v1 || '').split(',').filter(Boolean);
  if (!firmas.length) return false;

  return firmas.some((firma) => {
    if (firma.length !== esperado.length) return false;
    return crypto.timingSafeEqual(Buffer.from(firma, 'utf8'), Buffer.from(esperado, 'utf8'));
  });
}

/** Categorías válidas (si llega otra → 400) y su etiqueta legible */
const CATEGORIAS = {
  auriculares: 'Auriculares',
  teclados: 'Teclados',
  ratones: 'Ratones',
  monitores: 'Monitores'
};

/** Órdenes admitidos por ?orden= */
const ORDENES = ['destacados', 'precio-asc', 'precio-desc', 'valoracion'];

/** Estados posibles de un pedido (columna `estado`) */
const ESTADOS_PEDIDO = ['nuevo', 'procesando', 'enviado', 'entregado', 'cancelado'];

/** Redondea a 2 decimales (todos los importes se calculan en el servidor) */
const dosDec = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Precio final de un producto (precio de tarjeta menos su descuento) */
const precioFinal = (p) => dosDec(Number(p.precio) * (1 - Number(p.descuento) / 100));

/** Error con código HTTP propio (lo recoge el enrutador) */
function fallo(codigo, mensaje) {
  return Object.assign(new Error(mensaje), { codigo });
}

/** Convierte una fila de la BD en el mismo shape que el array local de JS */
function aProducto(fila) {
  let colores = [];
  try {
    const parsed = JSON.parse(fila.colores);
    if (Array.isArray(parsed)) colores = parsed;
  } catch (e) {
    colores = []; // columna corrupta: la tarjeta se pinta con el color por defecto
  }
  return {
    id: Number(fila.id),
    nombre: fila.nombre,
    categoria: fila.categoria,
    precio: Number(fila.precio),
    descuento: Number(fila.descuento),
    valoracion: Number(fila.valoracion),
    nuevo: Number(fila.nuevo) === 1,
    colores,
    stock: Number(fila.stock)
  };
}

/**
 * Importes de un pedido, redondeados a 2 decimales.
 * @param {{precio:number, cantidad:number}[]} items precios YA con descuento
 */
function calcularImportes(items) {
  const subtotal = dosDec(items.reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0));

  // Envío: gratis a partir de ENVIO_GRATIS_DESDE (50 €), si no ENVIO_COSTE (4,99 €)
  const gratisDesde = Number(process.env.ENVIO_GRATIS_DESDE ?? 50);
  const costeEnvio = Number(process.env.ENVIO_COSTE ?? 4.99);
  const envio = dosDec(subtotal === 0 ? 0 : subtotal >= gratisDesde ? 0 : costeEnvio);

  // IVA (21 %) INCLUIDO en el precio: total = subtotal + envío e iva es la parte que lleva dentro
  const total = dosDec(subtotal + envio);
  const ivaPct = Number(process.env.IVA ?? 21);
  const iva = dosDec(total - total / (1 + ivaPct / 100));

  return { subtotal, envio, iva, total };
}

/** Ejecuta `fn` dentro de una transacción: o se graba todo, o no se graba nada */
function enTransaccion(bd, fn) {
  bd.ejecutarScript('BEGIN');
  try {
    const salida = fn();
    bd.ejecutarScript('COMMIT');
    return salida;
  } catch (e) {
    try {
      bd.ejecutarScript('ROLLBACK');
    } catch (_) {
      /* la transacción ya se había cerrado */
    }
    throw e;
  }
}

/** Referencia única tipo NV-2026-1042 */
function nuevaReferencia(bd) {
  const anio = new Date().getFullYear();
  let numero = 1001 + Number(bd.uno('SELECT COUNT(*) AS n FROM pedidos').n);
  let referencia = `NV-${anio}-${String(numero).padStart(4, '0')}`;
  while (bd.uno('SELECT 1 AS x FROM pedidos WHERE referencia = ?', referencia)) {
    numero += 1;
    referencia = `NV-${anio}-${String(numero).padStart(4, '0')}`;
  }
  return referencia;
}

const { tokenValido } = require('./lib/token');

/** Comprueba el token de administración (solo cabecera x-admin-token) */
function esAdmin(ctx) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  return tokenValido(ctx.cabecera('x-admin-token') || '', token);
}

module.exports = function registrar(api, { bd }) {
  // Protección anti-spam (en memoria, por IP)
  const limitePedidos = crearLimitador({
    max: Number(process.env.LIMITE_PEDIDO || 10),
    ventanaMs: 60000
  });
  const limiteNewsletter = crearLimitador({
    max: Number(process.env.LIMITE_NEWSLETTER || 5),
    ventanaMs: 60000
  });

  /* ---------------------------------------------------------------- Salud */
  api.get('/api/salud', (ctx) =>
    ctx.json({
      ok: true,
      servicio: 'tienda-api',
      version: '1.0.0',
      node: process.version,
      moneda: process.env.MONEDA || 'EUR',
      iva: Number(process.env.IVA ?? 21),
      hora: new Date().toISOString(),
      uptime_s: Math.round(process.uptime())
    })
  );

  /* ------------------------------------------------------------- Productos */
  // Filtros y orden en el MISMO servidor que la web (menos trabajo en el cliente)
  api.get('/api/productos', (ctx) => {
    const categoria = String(ctx.query.categoria || '').trim().toLowerCase();
    const q = String(ctx.query.q || '').trim().toLowerCase();
    const orden = String(ctx.query.orden || '').trim().toLowerCase() || 'destacados';

    // Categoría desconocida → 400 (evita basura en la BD y en los informes)
    const sinCategoria = ['', 'todas', 'todo', 'all'].includes(categoria);
    if (!sinCategoria && !CATEGORIAS[categoria]) {
      return ctx.fallo(
        400,
        `Categoría no válida: «${categoria}». Usa una de: ${Object.keys(CATEGORIAS).join(', ')}`
      );
    }
    if (!ORDENES.includes(orden)) {
      return ctx.fallo(400, `Orden no válido: «${orden}». Usa una de: ${ORDENES.join(', ')}`);
    }

    // Solo productos activos
    let lista = bd.todos('SELECT * FROM productos WHERE activo = 1 ORDER BY orden ASC, id ASC');

    if (!sinCategoria) lista = lista.filter((p) => p.categoria === categoria);

    // Búsqueda por texto (nombre o etiqueta de la categoría)
    if (q) {
      lista = lista.filter(
        (p) =>
          String(p.nombre).toLowerCase().includes(q) ||
          String(CATEGORIAS[p.categoria] || p.categoria).toLowerCase().includes(q)
      );
    }

    // Orden (mismos criterios que js/main.js)
    switch (orden) {
      case 'precio-asc':
        lista.sort((a, b) => precioFinal(a) - precioFinal(b));
        break;
      case 'precio-desc':
        lista.sort((a, b) => precioFinal(b) - precioFinal(a));
        break;
      case 'valoracion':
        lista.sort((a, b) => Number(b.valoracion) - Number(a.valoracion));
        break;
      default:
        // "Destacados": novedades, luego descuento, luego valoración
        lista.sort(
          (a, b) =>
            Number(b.nuevo) - Number(a.nuevo) ||
            Number(b.descuento) - Number(a.descuento) ||
            Number(b.valoracion) - Number(a.valoracion) ||
            Number(a.orden) - Number(b.orden)
        );
    }

    ctx.json(lista.map(aProducto));
  });

  api.get('/api/productos/:id', (ctx) => {
    const fila = bd.uno('SELECT * FROM productos WHERE id = ? AND activo = 1', ctx.params.id);
    if (!fila) return ctx.fallo(404, 'No existe ese producto (o no está disponible)');
    ctx.json(aProducto(fila));
  });

  /* --------------------------------------------------------------- Pedidos */
  api.post('/api/pedidos', async (ctx) => {
    if (!limitePedidos.permitido(ctx.ip)) {
      return ctx.fallo(429, 'Demasiados pedidos desde esta conexión. Inténtalo dentro de un minuto.');
    }

    const datos = await ctx.cuerpo();
    const cliente = datos.cliente || {};
    const nombre = String(cliente.nombre || '').trim();
    const email = String(cliente.email || '').trim();
    const direccion = String(cliente.direccion || '').trim();
    const ciudad = String(cliente.ciudad || '').trim();
    const cp = String(cliente.cp || '').trim();
    const lineas = Array.isArray(datos.lineas) ? datos.lineas : [];

    /* --- 1) Validación del cliente y de las líneas --- */
    const errores = [];
    if (nombre.length < 2) errores.push('El nombre debe tener al menos 2 caracteres.');
    if (!EMAIL_REGEX.test(email)) errores.push('El correo no tiene un formato válido.');
    if (direccion.length < 5) errores.push('La dirección debe tener al menos 5 caracteres.');
    if (ciudad.length < 2) errores.push('La ciudad es obligatoria.');
    if (!/^[0-9A-Za-z -]{4,10}$/.test(cp)) errores.push('El código postal no es válido (4 a 10 caracteres).');
    if (!lineas.length) errores.push('El pedido debe incluir al menos un producto.');

    const pedidas = new Map(); // producto_id → unidades totales
    if (lineas.length) {
      for (const linea of lineas) {
        const id = Number(linea && linea.id);
        const cantidad = Number(linea && linea.cantidad);
        if (!Number.isInteger(id) || id <= 0) {
          errores.push('Identificador de producto no válido.');
          continue;
        }
        if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10) {
          errores.push(`La cantidad del producto ${id} debe estar entre 1 y 10.`);
          continue;
        }
        pedidas.set(id, (pedidas.get(id) || 0) + cantidad);
      }
    }
    // Si el mismo producto aparece repetido, el total tampoco puede pasar de 10
    pedidas.forEach((cantidad, id) => {
      if (cantidad > 10) errores.push(`Máximo 10 unidades del producto ${id} por pedido.`);
    });

    if (errores.length) return ctx.fallo(400, 'Revisa los datos del pedido', errores);

    /* --- 2) Todo dentro de una transacción: stock + pedido + líneas --- */
    const pedido = enTransaccion(bd, () => {
      const items = [];

      pedidas.forEach((cantidad, id) => {
        const p = bd.uno('SELECT * FROM productos WHERE id = ? AND activo = 1', id);
        if (!p) throw fallo(400, `El producto con id ${id} no existe o no está disponible.`);
        if (Number(p.stock) < cantidad) {
          throw fallo(
            409,
            `Stock insuficiente para «${p.nombre}»: quedan ${p.stock} y has pedido ${cantidad}.`
          );
        }
        items.push({
          productoId: Number(p.id),
          nombre: p.nombre,
          precio: precioFinal(p),
          cantidad
        });
      });

      const importes = calcularImportes(items);
      const referencia = nuevaReferencia(bd);

      const creado = bd.ejecutar(
        `INSERT INTO pedidos
           (referencia, nombre, email, direccion, ciudad, cp, estado,
            subtotal, envio, iva, total, stripe_payment_intent, ip)
         VALUES (?, ?, ?, ?, ?, ?, 'nuevo', ?, ?, ?, ?, NULL, ?)`,
        referencia, nombre, email, direccion, ciudad, cp,
        importes.subtotal, importes.envio, importes.iva, importes.total,
        ctx.ip
      );
      const pedidoId = Number(creado.lastInsertRowid);

      items.forEach((i) => {
        bd.ejecutar(
          'INSERT INTO lineas_pedido (pedido_id, producto_id, nombre, precio, cantidad) VALUES (?, ?, ?, ?, ?)',
          pedidoId, i.productoId, i.nombre, i.precio, i.cantidad
        );
        // Descuento de stock (si entre la comprobación y aquí se agotó, la transacción revienta)
        bd.ejecutar('UPDATE productos SET stock = stock - ? WHERE id = ?', i.cantidad, i.productoId);
      });

      return { ...importes, referencia, items };
    });

    // Correo opcional al equipo (solo si hay Resend/SMTP configurado en .env)
    const destino = opcional(process.env.EMAIL_PEDIDOS);
    if (destino) {
      enviarCorreo({
        para: destino,
        asunto: `Nuevo pedido ${pedido.referencia} — ${pedido.total.toFixed(2)} €`,
        texto:
          `Pedido ${pedido.referencia}\n` +
          `Cliente: ${nombre} <${email}>\n` +
          `Envío: ${direccion}, ${ciudad} (${cp})\n\n` +
          pedido.items.map((i) => `- ${i.nombre} x${i.cantidad} = ${(i.precio * i.cantidad).toFixed(2)} €`).join('\n') +
          `\n\nSubtotal: ${pedido.subtotal.toFixed(2)} €\nEnvío: ${pedido.envio.toFixed(2)} €\n` +
          `IVA (incluido): ${pedido.iva.toFixed(2)} €\nTOTAL: ${pedido.total.toFixed(2)} €`
      }).then((r) => {
        if (!r.enviado) console.log('[api] Correo del pedido no enviado:', r.motivo);
      });
    }

    ctx.json(
      {
        ok: true,
        referencia: pedido.referencia,
        subtotal: pedido.subtotal,
        envio: pedido.envio,
        iva: pedido.iva,
        total: pedido.total
      },
      201
    );
  });

  /* ------------------------------------- Consulta pública de un pedido --- */
  api.get('/api/pedidos/:referencia', (ctx) => {
    const fila = bd.uno('SELECT * FROM pedidos WHERE referencia = ?', ctx.params.referencia);
    if (!fila) return ctx.fallo(404, 'No existe ningún pedido con esa referencia.');

    const lineas = bd.todos(
      'SELECT producto_id, nombre, precio, cantidad FROM lineas_pedido WHERE pedido_id = ? ORDER BY id',
      fila.id
    );

    // No filtramos la IP ni el identificador de pago en una consulta pública
    const { ip, stripe_payment_intent, ...resto } = fila;
    ctx.json({
      ...resto,
      lineas: lineas.map((l) => ({
        producto_id: l.producto_id === null ? null : Number(l.producto_id),
        nombre: l.nombre,
        precio: Number(l.precio),
        cantidad: Number(l.cantidad)
      }))
    });
  });

  /* ------------------------------------------------- Listado (de admin) --- */
  api.get('/api/pedidos', (ctx) => {
    if (!esAdmin(ctx)) {
      return ctx.fallo(401, 'Token de administración no válido (header x-admin-token)');
    }

    const pedidos = bd.todos(
      'SELECT * FROM pedidos ORDER BY creado_en DESC, id DESC LIMIT 100'
    );
    const ids = pedidos.map((p) => p.id);
    const lineas = ids.length
      ? bd.todos(
          `SELECT * FROM lineas_pedido WHERE pedido_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`,
          ...ids
        )
      : [];

    ctx.json(
      pedidos.map((p) => ({
        ...p,
        id: Number(p.id),
        estado: p.estado,
        lineas: lineas
          .filter((l) => Number(l.pedido_id) === Number(p.id))
          .map((l) => ({
            producto_id: l.producto_id === null ? null : Number(l.producto_id),
            nombre: l.nombre,
            precio: Number(l.precio),
            cantidad: Number(l.cantidad)
          }))
      }))
    );
  });

  /* -------------------------------------------------------------- Checkout */
  // Dos caminos documentados en el README §6.7:
  //   a) Con STRIPE_SECRET_KEY en .env → PaymentIntent real (API REST con
  //      fetch: NO hace falta `npm install stripe`).
  //   b) Sin nada → {modo:'demo'}: nunca falla, la tienda sigue funcionando.
  api.post('/api/checkout', async (ctx) => {
    const clave = opcional(process.env.STRIPE_SECRET_KEY);
    if (!clave) {
      return ctx.json({
        modo: 'demo',
        mensaje: 'STRIPE_SECRET_KEY no configurado: pega tu clave en .env, reinicia y vuelve a intentarlo (mientras tanto, pago simulado).'
      });
    }

    const datos = await ctx.cuerpo();

    // Importe: se puede enviar en euros ({importe}) o calcularlo desde {lineas}
    let euros;
    if (Array.isArray(datos.lineas) && datos.lineas.length) {
      const pedidas = new Map();
      for (const l of datos.lineas) {
        const id = Number(l && l.id);
        const cantidad = Number(l && l.cantidad);
        if (!Number.isInteger(id) || !Number.isInteger(cantidad) || cantidad < 1) {
          return ctx.fallo(400, 'Líneas no válidas: cada una necesita {id, cantidad}');
        }
        pedidas.set(id, (pedidas.get(id) || 0) + cantidad);
      }
      const items = [];
      pedidas.forEach((cantidad, id) => {
        const p = bd.uno('SELECT * FROM productos WHERE activo = 1 AND id = ?', id);
        if (!p) return items.push({ precio: 0, cantidad });
        items.push({ precio: precioFinal(p), cantidad });
      });
      euros = calcularImportes(items).total;
    } else {
      euros = Number(datos.importe);
    }

    if (!Number.isFinite(euros) || euros <= 0) {
      return ctx.fallo(400, 'Falta el importe: envía {importe} (en euros) o {lineas:[{id,cantidad}]}');
    }

    const centimos = Math.max(50, Math.round(euros * 100)); // Stripe trabaja en céntimos

    // Referencia del pedido ya creado (opcional): viaja en el PaymentIntent para
    // que el webhook pueda localizarlo y marcarlo como cobrado.
    const referencia = String(datos.referencia || '').trim().toUpperCase();

    try {
      // PaymentIntent: una sola llamada a la API REST de Stripe (sin librería)
      const intento = await stripeAPI(clave, 'payment_intents', {
        amount: centimos,
        currency: 'eur',
        automatic_payment_methods: { enabled: true },
        metadata: { plantilla: '04-tienda', ...(referencia ? { referencia } : {}) }
      });

      if (referencia) {
        bd.ejecutar(
          'UPDATE pedidos SET stripe_payment_intent = ? WHERE referencia = ?',
          String(intento.id),
          referencia
        );
      }

      return ctx.json({
        modo: 'stripe',
        clientSecret: intento.client_secret,
        paymentIntent: intento.id,
        importe: dosDec(centimos / 100)
      });
    } catch (e) {
      console.error('[api] Stripe:', e.message);
      return ctx.fallo(502, 'No se pudo crear el cobro con Stripe', e.message);
    }
  });

  /* -------------------------------------------------------- Webhook Stripe */
  // Stripe avisa aquí cuando un cobro se completa o falla. Configúralo en
  // https://dashboard.stripe.com/webhooks:
  //   Endpoint:  <SITE_URL>/api/stripe/webhook
  //   Eventos:   payment_intent.succeeded, payment_intent.payment_failed
  // La firma se verifica con STRIPE_WEBHOOK_SECRET (solo Stripe real puede
  // llamar); sin esa clave en .env la petición se rechaza con 400.
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

    // 1) Cobro aprobado → el pedido pasa de «nuevo» a «procesando»
    if (tipo === 'payment_intent.succeeded') {
      const intento = String(objeto.id || '');
      const meta = objeto.metadata || {};
      const referencia = String(meta.referencia || '').toUpperCase();

      let pedido = bd.uno('SELECT id, referencia FROM pedidos WHERE stripe_payment_intent = ?', intento);
      if (!pedido && referencia) {
        pedido = bd.uno('SELECT id, referencia FROM pedidos WHERE referencia = ?', referencia);
      }

      if (pedido) {
        bd.ejecutar("UPDATE pedidos SET estado = 'procesando', stripe_payment_intent = ? WHERE id = ?", intento, pedido.id);
        aplicado = `pedido ${pedido.referencia} cobrado y en procesando`;
      } else {
        aplicado = 'cobro recibido sin pedido asociado';
      }
    }

    // 2) Cobro rechazado → se queda como estaba, pero se deja constancia
    if (tipo === 'payment_intent.payment_failed') {
      aplicado = 'cobro fallido (el pedido no cambia de estado)';
    }

    console.log(`[stripe] ${tipo || '(evento sin tipo)'} → ${aplicado || 'solo registrado'}`);
    ctx.json({ ok: true, recibido: true, tipo, aplicado });
  });

  /* ------------------------------------------------------------ Newsletter */
  api.post('/api/newsletter', async (ctx) => {
    if (!limiteNewsletter.permitido(ctx.ip)) {
      return ctx.fallo(429, 'Demasiadas suscripciones desde esta conexión. Inténtalo dentro de un minuto.');
    }

    const datos = await ctx.cuerpo();
    const email = String(datos.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return ctx.fallo(400, 'El correo no tiene un formato válido (ej: hola@correo.com).');
    }

    const existente = bd.uno('SELECT id FROM suscriptores WHERE email = ?', email);
    let yaEra = Boolean(existente);
    let correo = 'demo';
    if (!yaEra) {
      bd.ejecutar('INSERT INTO suscriptores (email) VALUES (?)', email);
      limiteNewsletter.reiniciar(ctx.ip); // un alta correcta no consume cuota
      // Correo de bienvenida opcional (Resend o SMTP, ver .env y README)
      const envio = await enviarCorreo({
        para: email,
        asunto: 'Bienvenido a NovaTech Store — tu 10% de descuento',
        texto:
          'Gracias por suscribirte a NovaTech Store.\n\n' +
          'Tu código de bienvenida es NOVA10 (10 % en el primer pedido).\n' +
          'Puedes darte de baja en cualquier momento.'
      });
      correo = envio.enviado ? 'enviado' : 'demo';
    }

    ctx.json(
      {
        ok: true,
        mensaje: yaEra
          ? 'Este correo ya estaba suscrito. Te mantendremos al día.'
          : '¡Suscripción registrada! Revisa tu correo para confirmar.',
        correo
      },
      yaEra ? 200 : 201
    );
  });
};
