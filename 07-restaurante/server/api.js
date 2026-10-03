/* ==========================================================================
   API REST — 07-restaurante · Casa Olivera
   --------------------------------------------------------------------------
   Todas las rutas devuelven JSON. Las de escritura (POST/DELETE) aceptan
   `Content-Type: application/json`.

   GET    /api/salud            → estado del servidor
   GET    /api/carta?categoria= & q=  → los 23 platos (filtro y búsqueda)
   GET    /api/carta/:id        → un plato concreto
   GET    /api/horarios         → los 7 días con sus turnos
   GET    /api/resenas          → las 4 opiniones
   GET    /api/disponibilidad?fecha= & comensales= → huecos libres del día
   POST   /api/reservas         → crea una reserva (201 · 400 · 409 · 429)
   GET    /api/reservas?fecha= & q=  → bandeja de reservas (token de admin)
   DELETE /api/reservas/:id     → borra una reserva (token de admin)

   ¿Cómo añadir un endpoint?  Añade una línea aquí (ver README, sección 6.7).
   ========================================================================== */

'use strict';

const { enviarCorreo } = require('./lib/email');
const { crearLimitador } = require('./lib/limitador');
const { opcional } = require('./lib/env');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX = /^\d{2}:\d{2}$/;

/** Categorías admitidas (deben coincidir con los chips del index.html) */
const CATEGORIAS = ['entrantes', 'arroces', 'principales', 'postres', 'vinos'];

/** getDay(): 0 = domingo … 6 = sábado */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/* --------------------------------------------------------------------------
   Configuración (.env) — se lee al montar la API, ya está cargado el .env
   -------------------------------------------------------------------------- */

/** Entero de .env con valor por defecto si falta o es basura */
function entero(clave, defecto) {
  const n = parseInt(process.env[clave], 10);
  return Number.isFinite(n) && n > 0 ? n : defecto;
}

/* --------------------------------------------------------------------------
   Ayudas generales
   -------------------------------------------------------------------------- */

const { tokenValido } = require('./lib/token');

/** Comprueba el token de administración (solo cabecera x-admin-token) */
function esAdmin(ctx) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  return tokenValido(ctx.cabecera('x-admin-token') || '', token);
}

/** 'Fideuà' → 'fideua' (misma normalización que usa js/main.js) */
function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Lee un texto que en la BD es JSON (alergenos, turnos…) sin romperse */
function leerJson(texto, defecto) {
  try {
    const v = JSON.parse(texto);
    return v === null || v === undefined ? defecto : v;
  } catch (e) {
    return defecto;
  }
}

/** '13:30' → 810 (minutos desde medianoche); null si no es una hora válida */
function minutos(hora) {
  const m = HORA_REGEX.exec(String(hora || ''));
  if (!m) return null;
  const h = Number(hora.slice(0, 2));
  const min = Number(hora.slice(3, 5));
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 810 → '13:30' */
function hhmm(total) {
  const h = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** Hoy en local con formato AAAA-MM-DD (igual que hace el formulario) */
function hoyISO() {
  const f = new Date();
  return (
    f.getFullYear() + '-' +
    String(f.getMonth() + 1).padStart(2, '0') + '-' +
    String(f.getDate()).padStart(2, '0')
  );
}

/** Suma n días a una fecha ISO (devuelve ISO) */
function sumarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(a, m - 1, d + n);
  return (
    f.getFullYear() + '-' +
    String(f.getMonth() + 1).padStart(2, '0') + '-' +
    String(f.getDate()).padStart(2, '0')
  );
}

/** ¿Existe realmente ese calendario? (evita 2026-02-31) */
function esFechaValida(iso) {
  if (!FECHA_REGEX.test(iso)) return false;
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(a, m - 1, d);
  return f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d;
}

/** Fila de horarios de una fecha (null si ese día no está configurado) */
function horarioDeFecha(bd, fecha) {
  const dia = DIAS[new Date(fecha + 'T12:00:00').getDay()];
  return bd.uno('SELECT * FROM horarios WHERE dia = ?', dia) || null;
}

/**
 * Huecos candidatos de un día: cada `intervalo` minutos dentro de cada turno,
 * siempre que la hora de inicio sea anterior al fin (20:00–00:00 cruza la
 * medianoche y se trata como 20:00–24:00).
 */
function horasDelDia(turnos, intervalo) {
  const horas = [];
  const vistas = new Set();

  (Array.isArray(turnos) ? turnos : []).forEach((turno) => {
    const inicio = minutos(turno && turno.desde);
    let fin = minutos(turno && turno.hasta);
    if (inicio === null || fin === null) return;
    if (fin <= inicio) fin += 24 * 60; // turno que acaba al día siguiente
    for (let m = inicio; m < fin; m += intervalo) {
      const hora = hhmm(m);
      if (!vistas.has(hora)) {
        vistas.add(hora);
        horas.push(hora);
      }
    }
  });

  return horas;
}

/** { '20:30': 2, … } — reservas de esa fecha que NO están canceladas */
function reservasPorHora(bd, fecha) {
  const filas = bd.todos(
    "SELECT hora, COUNT(*) AS n FROM reservas WHERE fecha = ? AND estado <> 'cancelado' GROUP BY hora",
    fecha
  );
  const mapa = new Map();
  filas.forEach((f) => mapa.set(f.hora, Number(f.n)));
  return mapa;
}

/* --------------------------------------------------------------------------
   Formato de fila → forma que espera js/main.js
   -------------------------------------------------------------------------- */

function aPlato(fila) {
  return {
    id: Number(fila.id),
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    categoria: fila.categoria,
    precio: Number(fila.precio),
    alergenos: leerJson(fila.alergenos, []),
    vegetariano: Boolean(fila.vegetariano),
    picante: Boolean(fila.picante),
    destacado: Boolean(fila.destacado),
    disponible: Boolean(fila.disponible)
  };
}

function aDia(fila) {
  return {
    dia: fila.dia,
    cerrado: Boolean(fila.cerrado),
    turnos: leerJson(fila.turnos, [])
  };
}

function aResena(fila) {
  return {
    autor: fila.autor,
    fecha: fila.fecha,
    estrellas: Number(fila.estrellas),
    texto: fila.texto,
    fuente: fila.fuente
  };
}

function aReserva(fila) {
  return {
    id: Number(fila.id),
    referencia: fila.referencia,
    fecha: fila.fecha,
    hora: fila.hora,
    comensales: Number(fila.comensales),
    nombre: fila.nombre,
    telefono: fila.telefono,
    email: fila.email,
    notas: fila.notas,
    estado: fila.estado,
    ip: fila.ip,
    creado_en: fila.creado_en
  };
}

/**
 * Referencia correlativa de la casa: CO-0041, CO-0042… (arranca en 41 porque
 * la numeración en papel ya llevaba 40 reservas). El UNIQUE de la columna
 * garantiza que nunca se repite.
 */
function nuevaReferencia(bd) {
  let numero = 41 + Number(bd.uno('SELECT COUNT(*) AS n FROM reservas').n);
  let referencia = 'CO-' + String(numero).padStart(4, '0');
  while (bd.uno('SELECT 1 AS x FROM reservas WHERE referencia = ?', referencia)) {
    numero += 1;
    referencia = 'CO-' + String(numero).padStart(4, '0');
  }
  return referencia;
}

/* --------------------------------------------------------------------------
   API
   -------------------------------------------------------------------------- */

module.exports = function registrar(api, { bd }) {
  const limiteReservas = crearLimitador({
    max: entero('LIMITE_RESERVAS', 5),
    ventanaMs: 60000
  });

  const COMENSALES_MAX = entero('COMENSALES_MAX', 12);
  const DIAS_MAX = entero('DIAS_MAX_RESERVA', 90);
  const INTERVALO = entero('INTERVALO_RESERVA', 30);
  const MAX_POR_HORA = entero('MAX_POR_HORA', 4);
  const NOTAS_MAX = 500;

  /* ---------------------------------------------------------------- Salud */
  api.get('/api/salud', (ctx) =>
    ctx.json({
      ok: true,
      servicio: 'restaurante-api',
      version: '1.0.0',
      node: process.version,
      hora: new Date().toISOString(),
      uptime_s: Math.round(process.uptime())
    })
  );

  /* ---------------------------------------------------------------- Carta */
  api.get('/api/carta', (ctx) => {
    const categoria = String(ctx.query.categoria || '').trim();

    if (categoria && !CATEGORIAS.includes(categoria)) {
      return ctx.fallo(
        400,
        'Categoría no válida',
        [`Categorías disponibles: ${CATEGORIAS.join(', ')}. Recibido: «${categoria}».`]
      );
    }

    let platos = bd.todos('SELECT * FROM platos ORDER BY orden ASC, id ASC').map(aPlato);
    if (categoria) platos = platos.filter((p) => p.categoria === categoria);

    // Búsqueda insensible a tildes/mayúsculas en nombre, descripción,
    // categoría y alérgenos (la web filtra en cliente; esto es para la API).
    const q = normalizar(ctx.query.q);
    if (q) {
      const filtrados = platos.filter((p) =>
        normalizar(
          `${p.nombre} ${p.descripcion} ${p.categoria} ${(p.alergenos || []).join(' ')}`
        ).includes(q)
      );
      // Defensa: la carta nunca se queda en blanco si hay datos.
      if (filtrados.length) platos = filtrados;
    }

    ctx.json(platos);
  });

  api.get('/api/carta/:id', (ctx) => {
    const fila = bd.uno('SELECT * FROM platos WHERE id = ?', ctx.params.id);
    if (!fila) return ctx.fallo(404, 'No existe ese plato');
    ctx.json(aPlato(fila));
  });

  /* -------------------------------------------------------------- Horarios */
  api.get('/api/horarios', (ctx) => {
    ctx.json(bd.todos('SELECT * FROM horarios ORDER BY id ASC').map(aDia));
  });

  /* --------------------------------------------------------------- Reseñas */
  api.get('/api/resenas', (ctx) => {
    ctx.json(bd.todos('SELECT * FROM resenas ORDER BY orden ASC, id ASC').map(aResena));
  });

  /* -------------------------------------------------------- Disponibilidad */
  api.get('/api/disponibilidad', (ctx) => {
    const fecha = String(ctx.query.fecha || '').trim();

    if (!fecha) return ctx.fallo(400, 'Falta la fecha', ['Usa ?fecha=AAAA-MM-DD.']);
    if (!esFechaValida(fecha)) {
      return ctx.fallo(400, 'Fecha no válida', ['Usa el formato AAAA-MM-DD, por ejemplo 2026-10-06.']);
    }

    const desde = hoyISO();
    const hasta = sumarDias(desde, DIAS_MAX);
    if (fecha < desde) return ctx.fallo(400, 'Fecha pasada', ['No se puede reservar en el pasado.']);
    if (fecha > hasta) {
      return ctx.fallo(400, 'Demasiada antelación', [`Máximo ${DIAS_MAX} días por delante (hasta ${hasta}).`]);
    }

    let comensales;
    if (ctx.query.comensales !== undefined && ctx.query.comensales !== '') {
      comensales = Number(ctx.query.comensales);
      if (!Number.isInteger(comensales) || comensales < 1 || comensales > COMENSALES_MAX) {
        return ctx.fallo(400, 'Comensales no válidos', [`Entre 1 y ${COMENSALES_MAX} comensales.`]);
      }
    }

    const horario = horarioDeFecha(bd, fecha);
    const base = { fecha };

    // Día cerrado (o sin horario configurado) → sin huecos
    if (!horario || horario.cerrado) {
      return ctx.json({ ...base, cerrado: true, horas: [], ...(comensales !== undefined ? { comensales } : {}) });
    }

    const turnos = leerJson(horario.turnos, []);
    const ocupadas = reservasPorHora(bd, fecha);
    const horas = horasDelDia(turnos, INTERVALO).map((hora) => ({
      hora,
      libre: (ocupadas.get(hora) || 0) < MAX_POR_HORA
    }));

    ctx.json({ ...base, cerrado: false, horas, ...(comensales !== undefined ? { comensales } : {}) });
  });

  /* -------------------------------------------------------------- Reservas */
  api.post('/api/reservas', async (ctx) => {
    const datos = await ctx.cuerpo();

    const fecha = String(datos.fecha || '').trim();
    const hora = String(datos.hora || '').trim();
    const nombre = String(datos.nombre || '').trim();
    const telefono = String(datos.telefono || '').trim();
    const email = String(datos.email || '').trim();
    const notas = String(datos.notas || '').trim();
    const comensales = Number(datos.comensales);

    /* 1) Validación campo a campo → 400 con detalle[].
          Va ANTES del límite por IP para no consumir cuota con peticiones
          mal formadas. */
    const errores = [];
    let horario = null;
    let fechaOk = false;

    if (!fecha) {
      errores.push('La fecha es obligatoria (formato AAAA-MM-DD).');
    } else if (!esFechaValida(fecha)) {
      errores.push(`La fecha «${fecha}» no es válida; usa el formato AAAA-MM-DD.`);
    } else if (fecha < hoyISO()) {
      errores.push('Esa fecha ya ha pasado. Elige un día desde hoy.');
    } else if (fecha > sumarDias(hoyISO(), DIAS_MAX)) {
      errores.push(`Solo se puede reservar con hasta ${DIAS_MAX} días de antelación.`);
    } else {
      fechaOk = true;
      horario = horarioDeFecha(bd, fecha);
    }

    if (!hora) {
      errores.push('La hora es obligatoria.');
    } else if (!HORA_REGEX.test(hora)) {
      errores.push('La hora debe tener el formato HH:MM.');
    } else {
      const min = minutos(hora);
      if (min === null) {
        errores.push('La hora no existe: usa HH:MM entre 00:00 y 23:59.');
      } else if (min % INTERVALO !== 0) {
        errores.push(`La hora debe encajar con los huecos de ${INTERVALO} minutos (13:00, 13:30…).`);
      } else if (fechaOk) {
        if (!horario || horario.cerrado) {
          errores.push('Ese día el restaurante está cerrado: elige otra fecha.');
        } else if (!horasDelDia(leerJson(horario.turnos, []), INTERVALO).includes(hora)) {
          errores.push(`La hora ${hora} está fuera de los turnos de ese día.`);
        }
      }
    }

    if (!Number.isInteger(comensales) || comensales < 1 || comensales > COMENSALES_MAX) {
      errores.push(`Entre 1 y ${COMENSALES_MAX} comensales (para grupos mayores, por teléfono).`);
    }
    if (nombre.length < 2) errores.push('Escribe tu nombre (mínimo 2 caracteres).');
    if (telefono.replace(/\D/g, '').length < 9) {
      errores.push('El teléfono debe tener al menos 9 dígitos.');
    }
    if (email && !EMAIL_REGEX.test(email)) {
      errores.push('El correo no tiene un formato válido (nombre@dominio.com).');
    }
    if (notas.length > NOTAS_MAX) errores.push(`Las notas no pueden superar los ${NOTAS_MAX} caracteres.`);

    if (errores.length) return ctx.fallo(400, 'Revisa los datos de la reserva', errores);

    /* 2) Límite por IP y minuto → 429 */
    const ip = ctx.ip;
    if (!limiteReservas.permitido(ip)) {
      return ctx.fallo(429, 'Demasiadas reservas desde esta conexión. Inténtalo dentro de un minuto.');
    }

    /* 3) Se vuelve a mirar la disponibilidad en el MOMENTO de guardar → 409 */
    const ocupadas = reservasPorHora(bd, fecha);
    const huecoLleno = (ocupadas.get(hora) || 0) >= MAX_POR_HORA;

    // Guarda anti-duplicados: nadie repite la MISMA reserva (mismo teléfono,
    // correo, nombre o mismo dispositivo) para la misma fecha y hora.
    const digitos = telefono.replace(/\D/g, '');
    const candidatas = bd.todos(
      "SELECT * FROM reservas WHERE fecha = ? AND hora = ? AND estado <> 'cancelado'",
      fecha, hora
    );
    const duplicada = candidatas.find(
      (r) =>
        (digitos && String(r.telefono || '').replace(/\D/g, '') === digitos) ||
        (email && r.email === email) ||
        (r.nombre && normalizar(r.nombre) === normalizar(nombre)) ||
        (r.ip && r.ip === ip)
    );

    if (huecoLleno || duplicada) {
      return ctx.fallo(
        409,
        'Esa hora ya no está disponible',
        huecoLleno && !duplicada
          ? `La ${hora} del ${fecha} ya tiene ${MAX_POR_HORA} reservas. Elige otra hora o día.`
          : `Ya hay una reserva para las ${hora} del ${fecha}` +
            (duplicada ? ` (${duplicada.referencia})` : '') +
            '. Elige otra hora o llámanos si quieres modificarla.'
      );
    }

    /* 4) Se guarda */
    const referencia = nuevaReferencia(bd);
    const id = Number(
      bd.ejecutar(
        `INSERT INTO reservas (referencia, fecha, hora, comensales, nombre, telefono, email, notas, estado, ip)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
        referencia, fecha, hora, comensales, nombre, telefono, email, notas, ip
      ).lastInsertRowid
    );

    /* 5) Correo de confirmación (opcional: solo si hay .env configurado) */
    let envio = { enviado: false, motivo: 'sin correo configurado (.env)' };
    const hayCorreo = Boolean(opcional(process.env.RESEND_API_KEY) || opcional(process.env.SMTP_HOST));

    if (hayCorreo) {
      const aviso = [
        'Casa Olivera · Reserva recibida',
        `Referencia: ${referencia}`,
        `Fecha: ${fecha} a las ${hora}`,
        `Comensales: ${comensales}`,
        `Nombre: ${nombre}`,
        `Teléfono: ${telefono}`,
        notas ? `Notas: ${notas}` : '',
        '',
        'La reserva se confirma por teléfono en menos de 2 h.',
        'Cancela sin coste hasta 3 h antes.'
      ].filter(Boolean).join('\n');

      const avisos = [];
      if (email) {
        avisos.push(await enviarCorreo({ para: email, asunto: `Reserva ${referencia} — Casa Olivera`, texto: aviso }));
      }
      const destino = opcional(process.env.EMAIL_RESERVAS) || opcional(process.env.CONTACTO_DESTINO);
      if (destino && destino !== email) {
        avisos.push(
          await enviarCorreo({
            para: destino,
            asunto: `Nueva reserva ${referencia} · ${fecha} ${hora} · ${comensales} pax`,
            texto: `${aviso}\nCorreo del cliente: ${email || '—'}`
          })
        );
      }
      envio = avisos.find((a) => a.enviado) || avisos[0] || envio;
    }

    ctx.json(
      {
        ok: true,
        id,
        referencia,
        fecha,
        hora,
        comensales,
        correo: envio.enviado ? 'enviado' : 'demo',
        detalleCorreo: envio.motivo || null,
        mensaje: 'Reserva recibida. Te confirmamos por teléfono en menos de 2 h.'
      },
      201
    );
  });

  /* ------------------------------------------------- Bandeja de reservas */
  api.get('/api/reservas', (ctx) => {
    if (!esAdmin(ctx)) return ctx.fallo(401, 'Token de administración no válido (header x-admin-token)');

    const sql = ['SELECT * FROM reservas'];
    const params = [];
    const fecha = String(ctx.query.fecha || '').trim();
    if (fecha) {
      sql.push('WHERE fecha = ?');
      params.push(fecha);
    }
    sql.push('ORDER BY fecha DESC, hora ASC, id DESC');

    let reservas = bd.todos(sql.join(' '), ...params).map(aReserva);

    // Búsqueda libre (nombre, teléfono, correo, referencia o notas)
    const q = normalizar(ctx.query.q);
    if (q) {
      reservas = reservas.filter((r) =>
        normalizar(`${r.referencia} ${r.nombre} ${r.telefono} ${r.email} ${r.notas}`).includes(q)
      );
    }

    ctx.json({ total: reservas.length, reservas });
  });

  api.delete('/api/reservas/:id', (ctx) => {
    if (!esAdmin(ctx)) return ctx.fallo(401, 'Token de administración no válido');
    const r = bd.ejecutar('DELETE FROM reservas WHERE id = ?', ctx.params.id);
    if (!r.changes) return ctx.fallo(404, 'No existe esa reserva');
    ctx.json({ borrados: Number(r.changes) });
  });
};
