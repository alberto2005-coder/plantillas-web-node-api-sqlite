/* ==========================================================================
   DATOS INICIALES (semillas) — 02-saas (Fluxo)
   --------------------------------------------------------------------------
   Se cargan SOLO la primera vez, cuando la base de datos está vacía.
   Para volver al estado original: `npm run reiniciar`
   (borra server/data/ y vuelve a sembrar).

   OJO con node:sqlite: los parámetros NO aceptan booleanos ni objetos.
   Pasa 1/0 para destacado y JSON.stringify(...) para `funciones`.
   ========================================================================== */

'use strict';

/** Esquema SQL creado al abrir la base */
const ESQUEMA = `
CREATE TABLE IF NOT EXISTS planes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  clave           TEXT    NOT NULL UNIQUE,   -- 'basico' | 'pro' | 'empresa'
  nombre          TEXT    NOT NULL,          -- Básico / Pro / Empresa
  precio_mensual  REAL    NOT NULL,          -- € por usuario y mes (mensual)
  precio_anual    REAL    NOT NULL,          -- € por usuario y mes (facturación anual)
  destacado       INTEGER NOT NULL DEFAULT 0,-- 1 = tarjeta "Más popular"
  funciones       TEXT    NOT NULL DEFAULT '[]', -- JSON con la lista de features
  orden           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS suscripciones (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  email             TEXT    NOT NULL,
  plan              TEXT    NOT NULL DEFAULT 'pro',      -- clave del plan
  periodo           TEXT    NOT NULL DEFAULT 'mensual',  -- 'mensual' | 'anual'
  estado            TEXT    NOT NULL DEFAULT 'prueba',   -- 'prueba' | 'activa' | 'cancelada'
  stripe_session_id TEXT,                                -- id de la sesión de checkout
  ip                TEXT,
  creado_en         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS newsletter (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  email     TEXT    NOT NULL,
  origen    TEXT    NOT NULL DEFAULT 'landing',  -- dónde se dio de alta
  creado_en TEXT    NOT NULL DEFAULT (datetime('now'))
);
`;

/** Los 3 planes que salen en el index.html (fuente única de verdad) */
const PLANES = [
  {
    clave: 'basico',
    nombre: 'Básico',
    precio_mensual: 9,
    precio_anual: 7,
    destacado: 0,
    orden: 1,
    funciones: [
      'Hasta 3 proyectos',
      '5 GB de almacenamiento',
      'Tableros Kanban y listas',
      'Soporte por correo (48 h)'
    ]
  },
  {
    clave: 'pro',
    nombre: 'Pro',
    precio_mensual: 19,
    precio_anual: 15,
    destacado: 1,
    orden: 2,
    funciones: [
      'Proyectos ilimitados',
      '200 GB de almacenamiento',
      'Informes y registro de tiempo',
      'Automatizaciones y plantillas',
      'Integraciones (Slack, Drive, GitHub)',
      'Soporte prioritario (4 h)'
    ]
  },
  {
    clave: 'empresa',
    nombre: 'Empresa',
    precio_mensual: 39,
    precio_anual: 31,
    destacado: 0,
    orden: 3,
    funciones: [
      'Todo lo del plan Pro',
      'SSO / SAML y SCIM',
      'Residencia de datos en la UE',
      'Registro de auditoría',
      'Gestor de cuenta dedicado',
      'SLA de disponibilidad 99,9%'
    ]
  }
];

/** Rellena la tabla `planes` SOLO si está vacía */
function sembrar(db) {
  const n = db.prepare('SELECT COUNT(*) AS n FROM planes').get().n;
  if (Number(n) > 0) return;

  const insertar = db.prepare(
    `INSERT INTO planes (clave, nombre, precio_mensual, precio_anual, destacado, funciones, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  PLANES.forEach((p) =>
    insertar.run(
      p.clave,
      p.nombre,
      p.precio_mensual,
      p.precio_anual,
      p.destacado,                                  // 1 / 0 (nunca true/false)
      JSON.stringify(p.funciones),                  // TEXT con JSON
      p.orden
    )
  );
}

module.exports = { ESQUEMA, sembrar, PLANES };
