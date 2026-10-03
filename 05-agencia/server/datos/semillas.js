/* ==========================================================================
    DATOS INICIALES (semillas) — 05-agencia
    --------------------------------------------------------------------------
    Se cargan SOLO la primera vez, cuando la tabla `proyectos` está vacía.
    Para volver al estado original: `npm run reiniciar`
    (borra server/data/ y vuelve a sembrar).

    Los textos de `PROYECTOS` y `SERVICIOS` son los MISMOS que los del
    index.html: si cambias uno, cámbialo también en el otro (o edita la BD).
    ========================================================================== */

'use strict';

/** Esquema SQL creado al abrir la base */
const ESQUEMA = `
CREATE TABLE IF NOT EXISTS proyectos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  clave       TEXT    NOT NULL UNIQUE,    -- 'lumen', 'norte'… (data-proyecto)
  titulo      TEXT    NOT NULL,
  categoria   TEXT    NOT NULL,
  gradiente   TEXT    NOT NULL DEFAULT 'gradiente-1',
  anio        TEXT    NOT NULL,
  cliente     TEXT    NOT NULL DEFAULT '',
  servicios   TEXT    NOT NULL DEFAULT '',
  descripcion TEXT    NOT NULL DEFAULT '',
  url         TEXT    NOT NULL DEFAULT '',
  orden       INTEGER NOT NULL DEFAULT 0,
  activo      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS servicios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  clave       TEXT    NOT NULL UNIQUE,    -- 'identidad', 'web'…
  numero      TEXT    NOT NULL DEFAULT '01',
  titulo      TEXT    NOT NULL,
  descripcion TEXT    NOT NULL DEFAULT '',
  orden       INTEGER NOT NULL DEFAULT 0,
  activo      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cifras (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  clave    TEXT    NOT NULL UNIQUE,        -- 'proyectos', 'premios'…
  valor    INTEGER NOT NULL DEFAULT 0,
  etiqueta TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS presupuestos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  empresa     TEXT    NOT NULL DEFAULT '',
  tipo        TEXT    NOT NULL DEFAULT '',   -- web | landing | branding | app | seo | otro
  presupuesto TEXT    NOT NULL DEFAULT '',   -- tramo de presupuesto
  mensaje     TEXT    NOT NULL,
  ip          TEXT,
  referencia  TEXT    NOT NULL DEFAULT '',
  creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
);
`;

/** Los 6 proyectos del index.html (fuente única de verdad para el modal) */
const PROYECTOS = [
  {
    clave: 'lumen',
    titulo: 'Lumen Café',
    categoria: 'Branding · Packaging',
    gradiente: 'gradiente-1',
    anio: '2025',
    cliente: 'Lumen Café S.L.',
    servicios: 'Identidad, packaging, cartas',
    descripcion:
      'Reposicionamiento completo de una tostadora de barrio que quería crecer sin ' +
      'perder su lado artesanal. Diseñamos un sistema de marca flexible con un ' +
      'gradiente como firma, tipografía a medida y un packaging que funciona igual ' +
      'de bien en el lineal que en redes sociales.',
    url: '',
    orden: 1
  },
  {
    clave: 'norte',
    titulo: 'Hotel Norte',
    categoria: 'Web · UI',
    gradiente: 'gradiente-2',
    anio: '2024',
    cliente: 'Grupo Norte Hoteles',
    servicios: 'UX, diseño UI, desarrollo front-end',
    descripcion:
      'Web de reservas directas para una cadena de hoteles rurales. Rediseñamos la ' +
      'arquitectura de información, redujimos el embudo de reserva a tres pasos y ' +
      'construimos el front-end a mano para cargar en menos de un segundo.',
    url: '',
    orden: 2
  },
  {
    clave: 'fibra',
    titulo: 'Fibra Studio',
    categoria: 'Motion',
    gradiente: 'gradiente-3',
    anio: '2024',
    cliente: 'Fibra Studio',
    servicios: 'Dirección de arte, animación 2D',
    descripcion:
      'Paquete de motion para el lanzamiento de un estudio de música electrónica: ' +
      'bucles de marca, plantillas para redes y una pieza de apertura de 20 segundos ' +
      'proyectada en directo durante la gira.',
    url: '',
    orden: 3
  },
  {
    clave: 'mercado',
    titulo: 'Mercado 22',
    categoria: 'Identidad · Señalética',
    gradiente: 'gradiente-4',
    anio: '2023',
    cliente: 'Ayuntamiento de Valencia',
    servicios: 'Identidad, señalética, guía de uso',
    descripcion:
      'Identidad y sistema de señalética para el mercado municipal del barrio de ' +
      'Ruzafa. Un lenguaje modular basado en la numeración de los puestos, pensado ' +
      'para imprimir con dos tintas y resistir el uso diario.',
    url: '',
    orden: 4
  },
  {
    clave: 'aurea',
    titulo: 'Aurea Cosmética',
    categoria: 'Branding · Ecommerce',
    gradiente: 'gradiente-5',
    anio: '2023',
    cliente: 'Aurea Lab',
    servicios: 'Marca, packaging, tienda online',
    descripcion:
      'Marca y ecommerce para una línea de cosmética natural. Trabajamos una paleta ' +
      'cálida, fotografía de producto propia y una ficha de producto que explica cada ' +
      'ingrediente sin tecnicismos.',
    url: '',
    orden: 5
  },
  {
    clave: 'orbita',
    titulo: 'Órbita Tech',
    categoria: 'Marca · Producto digital',
    gradiente: 'gradiente-6',
    anio: '2022',
    cliente: 'Órbita Tech',
    servicios: 'Naming, identidad, design system',
    descripcion:
      'Naming e identidad para una startup de infraestructura cloud, junto con un ' +
      'design system de 60 componentes para que su equipo de producto pudiera ' +
      'construir pantallas nuevas sin frenar el desarrollo.',
    url: '',
    orden: 6
  }
];

/** Los 4 servicios de la sección #servicios del index.html */
const SERVICIOS = [
  {
    clave: 'identidad',
    numero: '01',
    titulo: 'Identidad de marca',
    descripcion:
      'Naming, logotipo, sistema visual y manual de uso. Construimos identidades ' +
      'flexibles que aguantan el paso del tiempo y crecen con la empresa.',
    orden: 1
  },
  {
    clave: 'web',
    numero: '02',
    titulo: 'Diseño y desarrollo web',
    descripcion:
      'Sitios y productos digitales rápidos, accesibles y fáciles de editar. ' +
      'Diseño en Figma, maquetación en HTML/CSS y JS moderno.',
    orden: 2
  },
  {
    clave: 'motion',
    numero: '03',
    titulo: 'Motion y dirección de arte',
    descripcion:
      'Animación de marca, piezas para redes y vídeo explicativo. El movimiento ' +
      'como extensión de la identidad, no como adorno.',
    orden: 3
  },
  {
    clave: 'estrategia',
    numero: '04',
    titulo: 'Estrategia y SEO',
    descripcion:
      'Posicionamiento, arquitectura de contenidos y SEO técnico. Que te encuentren ' +
      'las personas adecuadas, con el mensaje adecuado.',
    orden: 4
  }
];

/** Los 4 contadores de la sección #estudio (data-objetivo + etiqueta) */
const CIFRAS = [
  { clave: 'proyectos', valor: 248, etiqueta: 'Proyectos entregados' },
  { clave: 'premios', valor: 17, etiqueta: 'Premios obtenidos' },
  { clave: 'anios', valor: 11, etiqueta: 'Años de oficio' },
  { clave: 'clientes', valor: 96, etiqueta: 'Clientes felices' }
];

/** Rellena las tablas solo si `proyectos` está vacía */
function sembrar(db) {
  const n = db.prepare('SELECT COUNT(*) AS n FROM proyectos').get().n;
  if (Number(n) > 0) return;

  const insertarProyecto = db.prepare(
    `INSERT INTO proyectos (clave, titulo, categoria, gradiente, anio, cliente, servicios, descripcion, url, orden, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  PROYECTOS.forEach((p) =>
    insertarProyecto.run(
      p.clave, p.titulo, p.categoria, p.gradiente, p.anio, p.cliente,
      p.servicios, p.descripcion, p.url, p.orden, 1
    )
  );

  const insertarServicio = db.prepare(
    `INSERT INTO servicios (clave, numero, titulo, descripcion, orden, activo)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  SERVICIOS.forEach((s) =>
    insertarServicio.run(s.clave, s.numero, s.titulo, s.descripcion, s.orden, 1)
  );

  const insertarCifra = db.prepare(
    'INSERT INTO cifras (clave, valor, etiqueta) VALUES (?, ?, ?)'
  );
  CIFRAS.forEach((c) => insertarCifra.run(c.clave, c.valor, c.etiqueta));
}

module.exports = { ESQUEMA, sembrar, PROYECTOS, SERVICIOS, CIFRAS };
