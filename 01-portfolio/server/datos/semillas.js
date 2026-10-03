/* ==========================================================================
   DATOS INICIALES (semillas) — 01-portfolio
   --------------------------------------------------------------------------
   Se cargan SOLO la primera vez, cuando la base de datos está vacía.
   Para volver al estado original: `npm run reiniciar`
   (borra server/data/ y vuelve a sembrar).
   ========================================================================== */

'use strict';

/** Esquema SQL creado al abrir la base */
const ESQUEMA = `
CREATE TABLE IF NOT EXISTS proyectos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo      TEXT    NOT NULL,
  categoria   TEXT    NOT NULL,          -- web | app | diseno | marca
  anio        TEXT    NOT NULL,
  resumen     TEXT    NOT NULL,
  pill        TEXT    NOT NULL,          -- etiqueta visible en la tarjeta
  etiqueta    TEXT    NOT NULL,          -- "Web · 2025"
  texto_enlace2 TEXT   NOT NULL,         -- 'Código', 'Caso de estudio'…
  url_demo    TEXT    DEFAULT '',
  url_codigo  TEXT    DEFAULT '',
  orden       INTEGER NOT NULL DEFAULT 0,
  activo      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS mensajes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  mensaje     TEXT    NOT NULL,
  ip          TEXT,
  leido       INTEGER NOT NULL DEFAULT 0,
  creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
);
`;

/** Los 6 proyectos que salen en el index.html (fuente única de verdad) */
const PROYECTOS = [
  {
    titulo: 'Panadería La Miga', categoria: 'web', anio: '2025', pill: 'Web',
    etiqueta: 'Web · 2025', texto_enlace2: 'Código',
    resumen: 'Sitio con pedidos online para una panadería artesanal de Valencia. Menú adaptable, carrito sencillo y 98 puntos en Lighthouse.',
    url_demo: '', url_codigo: '', orden: 1
  },
  {
    titulo: 'RutaVerde', categoria: 'app', anio: '2025', pill: 'App',
    etiqueta: 'App · 2025', texto_enlace2: 'Código',
    resumen: 'Aplicación de rutas de senderismo con mapa, perfil de altitud y guardado de favoritos. PWA instalable y modo sin conexión.',
    url_demo: '', url_codigo: '', orden: 2
  },
  {
    titulo: 'Panel Nébula', categoria: 'diseno', anio: '2024', pill: 'Diseño',
    etiqueta: 'Diseño UI · 2024', texto_enlace2: 'Caso de estudio',
    resumen: 'Sistema de diseño y panel de analítica para una plataforma SaaS: tablas, gráficos, estados vacíos y biblioteca de componentes.',
    url_demo: '', url_codigo: '', orden: 3
  },
  {
    titulo: 'Estudio Horizonte', categoria: 'marca', anio: '2024', pill: 'Branding',
    etiqueta: 'Branding · 2024', texto_enlace2: 'Behance',
    resumen: 'Identidad visual completa para un estudio de arquitectura: logotipo, paleta, tipografía y plantillas para redes sociales.',
    url_demo: '', url_codigo: '', orden: 4
  },
  {
    titulo: 'Blog Tinta Rica', categoria: 'web', anio: '2024', pill: 'Web',
    etiqueta: 'Web · 2024', texto_enlace2: 'Código',
    resumen: 'Blog de escritura con lectura cómoda, modo oscuro, tabla de contenidos y tiempo estimado de lectura por artículo.',
    url_demo: '', url_codigo: '', orden: 5
  },
  {
    titulo: 'ContaFácil', categoria: 'app', anio: '2024', pill: 'App',
    etiqueta: 'App · 2024', texto_enlace2: 'Código',
    resumen: 'Herramienta de gastos compartidos para pisos de estudiantes: liquidación automática, avisos y exportación a CSV.',
    url_demo: '', url_codigo: '', orden: 6
  }
];

/** Rellena la tabla `proyectos` solo si está vacía */
function sembrar(db) {
  const n = db.prepare('SELECT COUNT(*) AS n FROM proyectos').get().n;
  if (Number(n) > 0) return;

  const insertar = db.prepare(
    `INSERT INTO proyectos (titulo, categoria, anio, resumen, pill, etiqueta, texto_enlace2, url_demo, url_codigo, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  PROYECTOS.forEach((p) =>
    insertar.run(
      p.titulo, p.categoria, p.anio, p.resumen, p.pill, p.etiqueta,
      p.texto_enlace2, p.url_demo, p.url_codigo, p.orden
    )
  );
}

module.exports = { ESQUEMA, sembrar, PROYECTOS };
