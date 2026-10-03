/* ==========================================================================
   DATOS INICIALES (semillas) — 06-dashboard · Nova Analytics
   --------------------------------------------------------------------------
   Se cargan SOLO la primera vez, cuando la tabla `pedidos` está vacía.
   Para volver al estado original: `npm run reiniciar`
   (borra server/data/ y vuelve a sembrar).

   FORMATO DE LA TABLA `metricas` (serie de datos de las gráficas)
   ------------------------------------------------------------------
   Cada fila es un punto de una serie:  (clave, periodo, valor)

     clave        periodo   valor      qué representa
     -----------  --------  ---------  -----------------------------------
     ingresos     'Ene'…'Dic'  28500…  serie de la gráfica de LÍNEAS (€)
     objetivo     'Ene'…'Dic'  30000…  serie de objetivo, misma gráfica (€)
     ventas_mes   'Ene'…'Dic'    820…  serie de la gráfica de BARRAS (uds.)
     dona         nombre cat.   0–100   % de la gráfica de DONA (orden = id)
     dona_total   '30d'         1284   total que aparece en el centro de la dona
     visitantes   '30d'         39410  KPI «Visitantes»
     conversion   '7d'            3.4  KPI «Tasa de conversión» (%)
     ventas       '30d'          1284  KPI «Ventas» (también total de la dona)
     facturacion  'mes'         48920  KPI «Facturación mensual» (€)
     pedidos_cerrados 'total'    1284  KPI «Pedidos cerrados»
     ticket_medio '30d'          38.1  KPI «Ticket medio» (€)

   El KPI «Ingresos» de la tarjeta se calcula en la API como el ÚLTIMO valor
   de la serie `ingresos` (así nunca se desincroniza de la gráfica).

   Para cambiar una gráfica basta con editar estas filas (o hacer UPDATE en
   la BD): el JS del cliente vuelve a pintar con lo que devuelva la API.
   ========================================================================== */

'use strict';

/** Esquema SQL creado al abrir la base */
const ESQUEMA = `
CREATE TABLE IF NOT EXISTS productos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT    NOT NULL,
  categoria   TEXT    NOT NULL,
  precio      REAL    NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 0,
  ventas      INTEGER NOT NULL DEFAULT 0,
  icono       TEXT    NOT NULL DEFAULT '',
  orden       INTEGER NOT NULL DEFAULT 0,
  activo      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS clientes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  plan        TEXT    NOT NULL DEFAULT 'Free',
  pais        TEXT    NOT NULL DEFAULT '',
  pedidos     INTEGER NOT NULL DEFAULT 0,
  facturado   REAL    NOT NULL DEFAULT 0,
  activo      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pedidos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  referencia  INTEGER UNIQUE NOT NULL,   -- el "#1043" que se ve en la tabla
  cliente     TEXT    NOT NULL,
  producto    TEXT    NOT NULL,
  fecha       TEXT    NOT NULL,
  importe     REAL    NOT NULL DEFAULT 0,
  estado      TEXT    NOT NULL DEFAULT 'Pendiente',  -- Entregado | En curso | Pendiente
  creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS actividad (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo        TEXT    NOT NULL DEFAULT 'pedido',   -- pedido | exito | aviso | acento
  texto       TEXT    NOT NULL,
  detalle     TEXT    NOT NULL DEFAULT '',
  tiempo      TEXT    NOT NULL DEFAULT 'ahora mismo',
  creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vendedores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT    NOT NULL,
  pedidos     INTEGER NOT NULL DEFAULT 0,
  facturado   REAL    NOT NULL DEFAULT 0,
  objetivo    INTEGER NOT NULL DEFAULT 0   -- % del objetivo trimestral
);

CREATE TABLE IF NOT EXISTS metricas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  clave       TEXT    NOT NULL,
  periodo     TEXT    NOT NULL,
  valor       REAL    NOT NULL DEFAULT 0,
  UNIQUE (clave, periodo)
);

CREATE TABLE IF NOT EXISTS sesiones (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token       TEXT    UNIQUE NOT NULL,
  usuario     TEXT    NOT NULL,
  creado_en   TEXT    NOT NULL,
  caduca_en   TEXT    NOT NULL
);
`;

/* --------------------------------------------------------------------------
   Series de las gráficas (los arrays de js/main.js)
   -------------------------------------------------------------------------- */

/** Meses del eje X */
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Gráfica de líneas: ingresos reales y objetivo, en euros */
const INGRESOS = [28500, 31200, 29800, 34500, 33100, 38900, 41200, 39800, 44600, 46100, 43900, 48920];
const OBJETIVO = [30000, 31500, 33000, 34500, 36000, 37500, 39000, 40500, 42000, 44000, 46000, 48000];

/** Gráfica de barras: unidades vendidas por mes */
const VENTAS_MES = [
  { m: 'Ene', v: 820 }, { m: 'Feb', v: 910 }, { m: 'Mar', v: 760 },
  { m: 'Abr', v: 1040 }, { m: 'May', v: 980 }, { m: 'Jun', v: 1150 },
  { m: 'Jul', v: 1240 }, { m: 'Ago', v: 1080 }, { m: 'Sep', v: 1320 },
  { m: 'Oct', v: 1410 }, { m: 'Nov', v: 1265 }, { m: 'Dic', v: 1284 }
];

/** Gráfica de dona: reparto de ventas por categoría (%) — el orden importa:
 *  el cliente asigna el color de la paleta según la posición de la fila. */
const DONA = [
  { n: 'Electrónica', v: 38 },
  { n: 'Accesorios', v: 24 },
  { n: 'Oficina', v: 18 },
  { n: 'Hogar', v: 12 },
  { n: 'Otros', v: 8 }
];
const DONA_TOTAL = 1284;

/** KPIs sueltos (las tarjetas de la cabecera) */
const KPIS = [
  { clave: 'visitantes', periodo: '30d', valor: 39410 },
  { clave: 'conversion', periodo: '7d', valor: 3.4 },
  { clave: 'ventas', periodo: '30d', valor: 1284 },
  { clave: 'facturacion', periodo: 'mes', valor: 48920 },
  { clave: 'pedidos_cerrados', periodo: 'total', valor: 1284 },
  { clave: 'ticket_medio', periodo: '30d', valor: 38.1 }
];

/* --------------------------------------------------------------------------
   Tablas de contenido
   -------------------------------------------------------------------------- */

/** Los 18 pedidos de la tabla del panel (más recientes primero) */
const PEDIDOS = [
  { ref: 1043, cliente: 'Carlos Ruiz', producto: 'Teclado Mecánico K2', fecha: '2 oct 2026', importe: 89.9, estado: 'En curso' },
  { ref: 1042, cliente: 'Lucía Fernández', producto: 'Monitor NovaView 27"', fecha: '2 oct 2026', importe: 249.9, estado: 'Entregado' },
  { ref: 1041, cliente: 'Marta Peña', producto: 'Silla Ergo Flex', fecha: '1 oct 2026', importe: 329, estado: 'Pendiente' },
  { ref: 1040, cliente: 'Diego Alonso', producto: 'Auriculares Nova H1', fecha: '1 oct 2026', importe: 149, estado: 'En curso' },
  { ref: 1039, cliente: 'Sofía Vidal', producto: 'Webcam NovaCam 4K', fecha: '30 sep 2026', importe: 119.9, estado: 'Entregado' },
  { ref: 1038, cliente: 'Iván Soto', producto: 'Portátil NovaBook 14', fecha: '30 sep 2026', importe: 1099, estado: 'Pendiente' },
  { ref: 1037, cliente: 'Elena Bravo', producto: 'Dock USB-C Nova', fecha: '29 sep 2026', importe: 79.9, estado: 'Entregado' },
  { ref: 1036, cliente: 'Pablo Nieto', producto: 'Monitor NovaView 24"', fecha: '29 sep 2026', importe: 189, estado: 'En curso' },
  { ref: 1035, cliente: 'Nuria Cano', producto: 'Ratón Inalámbrico M3', fecha: '28 sep 2026', importe: 45.9, estado: 'Entregado' },
  { ref: 1034, cliente: 'Javier Molina', producto: 'Teclado Mecánico K2', fecha: '28 sep 2026', importe: 89.9, estado: 'Pendiente' },
  { ref: 1033, cliente: 'Rocío Díaz', producto: 'Silla Ergo Flex', fecha: '27 sep 2026', importe: 329, estado: 'En curso' },
  { ref: 1032, cliente: 'Álvaro Sanz', producto: 'Auriculares Nova H1', fecha: '27 sep 2026', importe: 149, estado: 'Entregado' },
  { ref: 1031, cliente: 'Patricia Gil', producto: 'Webcam NovaCam 4K', fecha: '26 sep 2026', importe: 119.9, estado: 'Pendiente' },
  { ref: 1030, cliente: 'Marcos Vega', producto: 'Portátil NovaBook 14', fecha: '26 sep 2026', importe: 1099, estado: 'En curso' },
  { ref: 1029, cliente: 'Teresa León', producto: 'Dock USB-C Nova', fecha: '25 sep 2026', importe: 79.9, estado: 'Entregado' },
  { ref: 1028, cliente: 'Raúl Ortega', producto: 'Monitor NovaView 24"', fecha: '25 sep 2026', importe: 189, estado: 'Pendiente' },
  { ref: 1027, cliente: 'Clara Mena', producto: 'Ratón Inalámbrico M3', fecha: '24 sep 2026', importe: 45.9, estado: 'En curso' },
  { ref: 1026, cliente: 'Hugo Pastor', producto: 'Silla Ergo Flex', fecha: '24 sep 2026', importe: 329, estado: 'Pendiente' }
];

/** Actividad reciente del panel (tipo → icono en el cliente) */
const ACTIVIDAD = [
  { tipo: 'pedido', texto: 'Nuevo pedido #1043 de Carlos Ruiz', detalle: 'Teclado Mecánico K2 · 89,90 €', tiempo: 'hace 5 min' },
  { tipo: 'exito', texto: 'Pedido #1042 entregado', detalle: 'Lucía Fernández · 249,90 €', tiempo: 'hace 12 min' },
  { tipo: 'aviso', texto: 'Stock bajo en Auriculares Nova H1', detalle: 'Quedan 6 unidades en el almacén', tiempo: 'hace 1 h' },
  { tipo: 'acento', texto: 'Nueva reseña de 5 estrellas', detalle: 'Sobre Monitor NovaView 27"', tiempo: 'hace 3 h' },
  { tipo: 'pedido', texto: 'Marta Gil editó la ficha de Silla Ergo Flex', detalle: 'Precio actualizado a 329,00 €', tiempo: 'hace 5 h' },
  { tipo: 'exito', texto: 'Cobro de 1.099,00 € confirmado', detalle: 'Pedido #1038 · Iván Soto', tiempo: 'ayer, 18:42' }
];

/** Rendimiento del equipo comercial */
const VENDEDORES = [
  { nombre: 'Laura Ruiz', pedidos: 212, facturado: 18420, objetivo: 86 },
  { nombre: 'Andrés Molina', pedidos: 198, facturado: 16980, objetivo: 79 },
  { nombre: 'Carmen Ibáñez', pedidos: 176, facturado: 15240, objetivo: 71 },
  { nombre: 'Sergio Lara', pedidos: 154, facturado: 13110, objetivo: 61 },
  { nombre: 'Nerea Pou', pedidos: 132, facturado: 11460, objetivo: 53 }
];

/** Catálogo de productos (3 con stock bajo, como indica el encabezado) */
const PRODUCTOS = [
  { nombre: 'Monitor NovaView 27"', categoria: 'Pantallas', precio: 249.9, stock: 32, ventas: 184, icono: '🖥️' },
  { nombre: 'Portátil NovaBook 14', categoria: 'Informática', precio: 1099, stock: 8, ventas: 46, icono: '💻' },
  { nombre: 'Auriculares Nova H1', categoria: 'Audio', precio: 149, stock: 6, ventas: 132, icono: '🎧' },
  { nombre: 'Teclado Mecánico K2', categoria: 'Periféricos', precio: 89.9, stock: 54, ventas: 210, icono: '⌨️' },
  { nombre: 'Ratón Inalámbrico M3', categoria: 'Periféricos', precio: 45.9, stock: 78, ventas: 264, icono: '🖱️' },
  { nombre: 'Webcam NovaCam 4K', categoria: 'Videollamadas', precio: 119.9, stock: 9, ventas: 97, icono: '📷' },
  { nombre: 'Silla Ergo Flex', categoria: 'Oficina', precio: 329, stock: 21, ventas: 64, icono: '🪑' },
  { nombre: 'Dock USB-C Nova', categoria: 'Accesorios', precio: 79.9, stock: 43, ventas: 158, icono: '🔌' },
  { nombre: 'Monitor NovaView 24"', categoria: 'Pantallas', precio: 189, stock: 27, ventas: 121, icono: '🖥️' },
  { nombre: 'Disco Nova SSD 1 TB', categoria: 'Almacenamiento', precio: 99, stock: 62, ventas: 176, icono: '💾' },
  { nombre: 'Lámpara Nova Light', categoria: 'Oficina', precio: 59, stock: 35, ventas: 88, icono: '💡' },
  { nombre: 'Mochila Nova Bag', categoria: 'Accesorios', precio: 69, stock: 4, ventas: 52, icono: '🎒' }
];

/** Cartera de clientes destacados */
const CLIENTES = [
  { nombre: 'Lucía Fernández', email: 'lucia.fernandez@correo.es', plan: 'Pro', pais: 'España', pedidos: 34, facturado: 8420 },
  { nombre: 'Carlos Ruiz', email: 'carlos.ruiz@empresa.com', plan: 'Business', pais: 'España', pedidos: 21, facturado: 6180 },
  { nombre: 'Sofía Vidal', email: 'sofia.vidal@correo.mx', plan: 'Pro', pais: 'México', pedidos: 18, facturado: 4970 },
  { nombre: 'Diego Alonso', email: 'd.alonso@mail.ar', plan: 'Free', pais: 'Argentina', pedidos: 7, facturado: 1240 },
  { nombre: 'Elena Bravo', email: 'elena@bravo.cl', plan: 'Business', pais: 'Chile', pedidos: 44, facturado: 11380 },
  { nombre: 'Iván Soto', email: 'ivan.soto@correo.co', plan: 'Free', pais: 'Colombia', pedidos: 5, facturado: 980 },
  { nombre: 'Marta Peña', email: 'marta.pena@nova.es', plan: 'Pro', pais: 'España', pedidos: 27, facturado: 7260 },
  { nombre: 'Pablo Nieto', email: 'p.nieto@correo.pe', plan: 'Pro', pais: 'Perú', pedidos: 15, facturado: 4310 },
  { nombre: 'Nuria Cano', email: 'nuria.cano@correo.uy', plan: 'Business', pais: 'Uruguay', pedidos: 31, facturado: 9040 }
];

/* --------------------------------------------------------------------------
   Inserción
   -------------------------------------------------------------------------- */

/** Rella las tablas solo si `pedidos` está vacía (primera arrancada) */
function sembrar(db) {
  const n = Number(db.prepare('SELECT COUNT(*) AS n FROM pedidos').get().n);
  if (n > 0) return;

  // --- Series de las gráficas (tabla metricas) ---------------------------
  const metrica = db.prepare('INSERT INTO metricas (clave, periodo, valor) VALUES (?, ?, ?)');
  MESES.forEach((mes, i) => {
    metrica.run('ingresos', mes, INGRESOS[i]);
    metrica.run('objetivo', mes, OBJETIVO[i]);
    metrica.run('ventas_mes', mes, VENTAS_MES[i].v);
  });
  DONA.forEach((d) => metrica.run('dona', d.n, d.v));
  metrica.run('dona_total', '30d', DONA_TOTAL);
  KPIS.forEach((k) => metrica.run(k.clave, k.periodo, k.valor));

  // --- Productos ---------------------------------------------------------
  const producto = db.prepare(
    `INSERT INTO productos (nombre, categoria, precio, stock, ventas, icono, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  PRODUCTOS.forEach((p, i) =>
    producto.run(p.nombre, p.categoria, p.precio, p.stock, p.ventas, p.icono, i + 1)
  );

  // --- Clientes ----------------------------------------------------------
  const cliente = db.prepare(
    'INSERT INTO clientes (nombre, email, plan, pais, pedidos, facturado) VALUES (?, ?, ?, ?, ?, ?)'
  );
  CLIENTES.forEach((c) => cliente.run(c.nombre, c.email, c.plan, c.pais, c.pedidos, c.facturado));

  // --- Pedidos -----------------------------------------------------------
  const pedido = db.prepare(
    'INSERT INTO pedidos (referencia, cliente, producto, fecha, importe, estado) VALUES (?, ?, ?, ?, ?, ?)'
  );
  PEDIDOS.forEach((p) => pedido.run(p.ref, p.cliente, p.producto, p.fecha, p.importe, p.estado));

  // --- Actividad ---------------------------------------------------------
  // Se inserta de abajo hacia arriba: la API las devuelve con lo más
  // reciente arriba (ORDER BY id DESC) y así el orden visible coincide con
  // el de la plantilla. Las filas que añada el servidor (PATCH) quedan arriba.
  const act = db.prepare('INSERT INTO actividad (tipo, texto, detalle, tiempo) VALUES (?, ?, ?, ?)');
  ACTIVIDAD.slice()
    .reverse()
    .forEach((a) => act.run(a.tipo, a.texto, a.detalle, a.tiempo));

  // --- Vendedores --------------------------------------------------------
  const vendedor = db.prepare(
    'INSERT INTO vendedores (nombre, pedidos, facturado, objetivo) VALUES (?, ?, ?, ?)'
  );
  VENDEDORES.forEach((v) => vendedor.run(v.nombre, v.pedidos, v.facturado, v.objetivo));
}

module.exports = {
  ESQUEMA,
  sembrar,
  MESES,
  INGRESOS,
  OBJETIVO,
  VENTAS_MES,
  DONA,
  DONA_TOTAL,
  KPIS,
  PEDIDOS,
  ACTIVIDAD,
  VENDEDORES,
  PRODUCTOS,
  CLIENTES
};
