/* ==========================================================================
   DATOS INICIALES (semillas) — 04-tienda · NovaTech Store
   --------------------------------------------------------------------------
   Se cargan SOLO la primera vez, cuando la tabla `productos` está vacía.
   Para volver al estado original: `npm run reiniciar`
   (borra server/data/ y vuelve a sembrar).

   Los 8 productos son EXACTAMENTE los del array `productos` de js/main.js:
   si cambias uno aquí, cambia también allí (o quita el array local y deja
   que la web se surta de GET /api/productos).
   ========================================================================== */

'use strict';

/** Esquema SQL creado al abrir la base */
const ESQUEMA = `
CREATE TABLE IF NOT EXISTS productos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT    NOT NULL,
  categoria   TEXT    NOT NULL,          -- auriculares | teclados | ratones | monitores
  precio      REAL    NOT NULL,          -- precio de tarjeta (sin descuento)
  descuento   INTEGER NOT NULL DEFAULT 0,-- % de descuento (0 = sin descuento)
  valoracion  INTEGER NOT NULL DEFAULT 5,-- estrellas (1..5)
  nuevo       INTEGER NOT NULL DEFAULT 0,-- 1 = badge "Nuevo"
  colores     TEXT    NOT NULL,          -- JSON: ["#5b5bf0","#12c9a5"]
  stock       INTEGER NOT NULL DEFAULT 0,-- unidades disponibles
  activo      INTEGER NOT NULL DEFAULT 1,-- 1 = visible en el catálogo
  orden       INTEGER NOT NULL DEFAULT 0 -- posición en "Destacados"
);

CREATE TABLE IF NOT EXISTS pedidos (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  referencia           TEXT    NOT NULL UNIQUE,   -- NV-2026-1042
  nombre               TEXT    NOT NULL,
  email                TEXT    NOT NULL,
  direccion            TEXT    NOT NULL,
  ciudad               TEXT    NOT NULL,
  cp                   TEXT    NOT NULL,
  estado               TEXT    NOT NULL DEFAULT 'nuevo',
                       -- nuevo | procesando | enviado | entregado | cancelado
  subtotal             REAL    NOT NULL,
  envio                REAL    NOT NULL,
  iva                  REAL    NOT NULL,
  total                REAL    NOT NULL,
  stripe_payment_intent TEXT,                      -- id del PaymentIntent (si hay Stripe)
  ip                   TEXT,
  creado_en            TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lineas_pedido (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id INTEGER,
  nombre      TEXT    NOT NULL,
  precio      REAL    NOT NULL,           -- precio final ya con descuento
  cantidad    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS suscriptores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT    NOT NULL UNIQUE,
  creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
);
`;

/** Los 8 productos del catálogo (fuente única de verdad de la plantilla) */
const PRODUCTOS = [
  {
    nombre: 'Auriculares Aura X2 con cancelación de ruido',
    categoria: 'auriculares', precio: 89.99, descuento: 25, valoracion: 5,
    nuevo: 1, colores: ['#5b5bf0', '#12c9a5'], stock: 42, activo: 1, orden: 1
  },
  {
    nombre: 'Auriculares inalámbricos Pulse Go',
    categoria: 'auriculares', precio: 49.99, descuento: 0, valoracion: 4,
    nuevo: 0, colores: ['#f97316', '#ef4444'], stock: 18, activo: 1, orden: 2
  },
  {
    nombre: 'Teclado mecánico K87 RGB switches rojos',
    categoria: 'teclados', precio: 74.90, descuento: 15, valoracion: 5,
    nuevo: 0, colores: ['#8b5cf6', '#5b5bf0'], stock: 55, activo: 1, orden: 3
  },
  {
    nombre: 'Teclado compacto KeyMini 60% blanco',
    categoria: 'teclados', precio: 59.00, descuento: 0, valoracion: 4,
    nuevo: 1, colores: ['#0ea5e9', '#22d3ee'], stock: 9, activo: 1, orden: 4
  },
  {
    nombre: 'Ratón gaming Vortex 12K DPI',
    categoria: 'ratones', precio: 39.95, descuento: 20, valoracion: 5,
    nuevo: 0, colores: ['#12c9a5', '#0f766e'], stock: 36, activo: 1, orden: 5
  },
  {
    nombre: 'Ratón ergonómico Silencio inalámbrico',
    categoria: 'ratones', precio: 29.99, descuento: 0, valoracion: 4,
    nuevo: 0, colores: ['#64748b', '#334155'], stock: 3, activo: 1, orden: 6
  },
  {
    nombre: 'Monitor 27" QHD 165Hz IPS NovaVision',
    categoria: 'monitores', precio: 249.99, descuento: 12, valoracion: 5,
    nuevo: 1, colores: ['#5b5bf0', '#ec4899'], stock: 14, activo: 1, orden: 7
  },
  {
    nombre: 'Monitor ultrapancho 34" curvo UWQHD',
    categoria: 'monitores', precio: 389.00, descuento: 0, valoracion: 4,
    nuevo: 0, colores: ['#1e293b', '#475569'], stock: 7, activo: 1, orden: 8
  }
];

/** Rellena la tabla `productos` SOLO si está vacía */
function sembrar(db) {
  const n = db.prepare('SELECT COUNT(*) AS n FROM productos').get().n;
  if (Number(n) > 0) return;

  const insertar = db.prepare(
    `INSERT INTO productos (nombre, categoria, precio, descuento, valoracion, nuevo, colores, stock, activo, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  PRODUCTOS.forEach((p) =>
    insertar.run(
      p.nombre, p.categoria, p.precio, p.descuento, p.valoracion,
      p.nuevo, JSON.stringify(p.colores), p.stock, p.activo, p.orden
    )
  );
}

module.exports = { ESQUEMA, sembrar, PRODUCTOS };
