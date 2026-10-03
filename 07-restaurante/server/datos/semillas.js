/* ==========================================================================
   DATOS INICIALES (semillas) — 07-restaurante
   --------------------------------------------------------------------------
   Se cargan SOLO la primera vez, cuando la base de datos está vacía.
   Para volver al estado original: `npm run reiniciar`
   (borra server/data/ y vuelve a sembrar).

   TABLAS
   ─────────────────────────────────────────────────────────────────────────
   platos      → la carta del restaurante (mismos datos que el array CARTA
                 de js/main.js: 23 platos, 5 categorías).
                 id, nombre, descripcion, categoria, precio REAL,
                 alergenos TEXT (array JSON), vegetariano, picante,
                 destacado, disponible, orden
                 Los booleanos se guardan como 1/0 (requisito de node:sqlite).

   horarios     → los 7 días de la semana con sus turnos de cocina y salón.
                  id, dia TEXT UNIQUE, cerrado INTEGER,
                  turnos TEXT (array JSON `[{desde,hasta}]`)

   resenas     → opiniones de la sección (4 de ejemplo).
                 id, autor, fecha, estrellas INTEGER, texto, fuente, orden

   reservas    → mesas reservadas (escriben los clientes del formulario).
                 id, referencia TEXT UNIQUE (CO-0041), fecha TEXT (YYYY-MM-DD),
                 hora TEXT (HH:MM), comensales INTEGER, nombre, telefono,
                 email, notas, estado TEXT DEFAULT 'pendiente', ip,
                 creado_en

   Los textos, precios y alérgenos de `platos`, `horarios` y `resenas` son
   IDÉNTICOS a los de js/main.js: si cambias aquí, `npm run reiniciar` y la
   web repintará lo mismo desde la API.
   ========================================================================== */

'use strict';

/** Esquema SQL creado al abrir la base */
const ESQUEMA = `
CREATE TABLE IF NOT EXISTS platos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT    NOT NULL,
  descripcion TEXT    NOT NULL,
  categoria   TEXT    NOT NULL,              -- entrantes | arroces | principales | postres | vinos
  precio      REAL    NOT NULL,
  alergenos   TEXT    NOT NULL DEFAULT '[]', -- array JSON: ["Gluten","Lactosa"]
  vegetariano INTEGER NOT NULL DEFAULT 0,    -- 1 / 0
  picante     INTEGER NOT NULL DEFAULT 0,    -- 1 / 0
  destacado   INTEGER NOT NULL DEFAULT 0,    -- 1 / 0
  disponible  INTEGER NOT NULL DEFAULT 1,    -- 1 / 0
  orden       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS horarios (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  dia      TEXT    NOT NULL UNIQUE,          -- lunes … domingo
  cerrado  INTEGER NOT NULL DEFAULT 0,       -- 1 / 0
  turnos   TEXT    NOT NULL DEFAULT '[]'     -- array JSON: [{"desde":"13:00","hasta":"15:30"}]
);

CREATE TABLE IF NOT EXISTS resenas (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  autor    TEXT    NOT NULL,
  fecha    TEXT    NOT NULL,
  estrellas INTEGER NOT NULL DEFAULT 5,
  texto    TEXT    NOT NULL,
  fuente   TEXT    NOT NULL DEFAULT '',      -- Google | Tripadvisor | …
  orden    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reservas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  referencia  TEXT    NOT NULL UNIQUE,       -- CO-0041
  fecha       TEXT    NOT NULL,              -- YYYY-MM-DD
  hora        TEXT    NOT NULL,              -- HH:MM
  comensales  INTEGER NOT NULL,
  nombre      TEXT    NOT NULL,
  telefono    TEXT    NOT NULL,
  email       TEXT    NOT NULL DEFAULT '',
  notas       TEXT    NOT NULL DEFAULT '',
  estado      TEXT    NOT NULL DEFAULT 'pendiente', -- pendiente | confirmada | cancelada
  ip          TEXT,
  creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reservas_fecha_hora ON reservas (fecha, hora);
`;

/* --------------------------------------------------------------------------
   1) CARTA — los 23 platos del index.html (fuente única de verdad)
   -------------------------------------------------------------------------- */

const PLATOS = [
  { id: 1, nombre: 'Esgarraet de la casa', descripcion: 'Pimiento asado a la brasa, bacalao curado en aceite de oliva nuevo de la Ribera y un hilo de ajo laminado.', categoria: 'entrantes', precio: 12.5, alergenos: ['Pescado'], vegetariano: false, picante: false, destacado: false, disponible: true },
  { id: 2, nombre: 'Croquetas de jamón ibérico (6 u.)', descripcion: 'Bechamel de cocción lenta con jamón de Teruel, rebozadas y fritas al momento.', categoria: 'entrantes', precio: 9.8, alergenos: ['Gluten', 'Lactosa', 'Huevo'], vegetariano: false, picante: false, destacado: false, disponible: true },
  { id: 3, nombre: 'Alcachofas de Benicarló a la brasa con romesco', descripcion: 'Pochadas con laurel, terminadas a la brasa y con romesco de ñora y avellana.', categoria: 'entrantes', precio: 12.9, alergenos: ['Frutos secos'], vegetariano: true, picante: false, destacado: false, disponible: true },
  { id: 4, nombre: 'Patatas bravas de la casa', descripcion: 'Patata de cuarta generación, salsa brava con pimentón de la Vera y alioli de ajo negro.', categoria: 'entrantes', precio: 7.5, alergenos: ['Huevo'], vegetariano: true, picante: true, destacado: false, disponible: true },
  { id: 5, nombre: 'Tomate de la huerta con ventresca y albahaca', descripcion: 'Tomate de rama de Alboraya cortado a cuchillo, ventresca de bonito y albahaca fresca.', categoria: 'entrantes', precio: 11.0, alergenos: ['Pescado'], vegetariano: false, picante: false, destacado: false, disponible: true },

  { id: 6, nombre: 'Arroz seco de bogavante y alioli de azafrán', descripcion: 'Fondo de cabezas de gamba hecho a primera hora, bogavante de la lonja y alioli montado en casa. Mínimo 2 personas.', categoria: 'arroces', precio: 26.5, alergenos: ['Moluscos', 'Huevo'], vegetariano: false, picante: false, destacado: true, disponible: true },
  { id: 7, nombre: 'Paella valenciana de carne', descripcion: 'Gallina, conejo, garrofó y tomate de la huerta. Solo los jueves y domingos, con 20 minutos de reposo.', categoria: 'arroces', precio: 18.5, alergenos: [], vegetariano: false, picante: false, destacado: false, disponible: true },
  { id: 8, nombre: 'Fideuà de sepia y gambas', descripcion: 'Fideo número 2 tostado, sepia tierna, gamba roja y alioli suave. Mínimo 2 personas.', categoria: 'arroces', precio: 19.8, alergenos: ['Moluscos'], vegetariano: false, picante: false, destacado: false, disponible: false },
  { id: 9, nombre: 'Arroz negro con calamares y alioli', descripcion: 'Tinta de sepia casera, calamar fresco y un golpe de limón. Se mancha: va con guante de tela.', categoria: 'arroces', precio: 21.0, alergenos: ['Moluscos', 'Huevo'], vegetariano: false, picante: false, destacado: false, disponible: true },

  { id: 10, nombre: 'Suquet de rape, almejas y patata panadera', descripcion: 'Rape de roca, almeja de la Albufera y patata confitada en su propio jugo con azafrán.', categoria: 'principales', precio: 22.0, alergenos: ['Pescado', 'Moluscos'], vegetariano: false, picante: false, destacado: false, disponible: true },
  { id: 11, nombre: 'Carrillera de buey al vino tinto', descripcion: 'Seis horas de cocción con Bobal de la tierra y parmentier de puerro.', categoria: 'principales', precio: 19.5, alergenos: ['Lactosa'], vegetariano: false, picante: false, destacado: false, disponible: true },
  { id: 12, nombre: 'Albóndigas de la abuela en salsa de tomate', descripcion: 'Carne picada a cuchillo, pan remojado en leche y tomate triturado cocinado dos horas.', categoria: 'principales', precio: 15.0, alergenos: ['Gluten', 'Huevo', 'Lactosa'], vegetariano: false, picante: false, destacado: false, disponible: true },
  { id: 13, nombre: 'Berenjena al calipso con miel de azahar', descripcion: 'Berenjena asada, leche de coco, cacahuete tostado y miel de azahar de la Serra de Cazorla.', categoria: 'principales', precio: 13.5, alergenos: ['Frutos secos'], vegetariano: true, picante: false, destacado: false, disponible: true },
  { id: 14, nombre: 'Secreto ibérico a la brasa con puré de manzana', descripcion: 'Bellota de Extremadura, 6 minutos de brasa de encina y puré de manzana reineta.', categoria: 'principales', precio: 23.0, alergenos: [], vegetariano: false, picante: false, destacado: false, disponible: true },

  { id: 15, nombre: 'Flan de la casa con nata montada', descripcion: 'Huevo campero, leche entera y caramelo oscuro. La receta no ha cambiado desde 1998.', categoria: 'postres', precio: 5.5, alergenos: ['Huevo', 'Lactosa'], vegetariano: true, picante: false, destacado: false, disponible: true },
  { id: 16, nombre: 'Tarta de queso al horno con membrillo', descripcion: 'Cuajada al horno a 220 °C, queso curado de oveja y compota de membrillo casera.', categoria: 'postres', precio: 6.5, alergenos: ['Gluten', 'Huevo', 'Lactosa'], vegetariano: true, picante: false, destacado: false, disponible: true },
  { id: 17, nombre: 'Horchata artesana con farton', descripcion: 'Chufa de València, canela en rama y farton de canela recién hecho.', categoria: 'postres', precio: 4.9, alergenos: ['Gluten', 'Frutos secos'], vegetariano: true, picante: false, destacado: false, disponible: true },
  { id: 18, nombre: 'Torrija caramelizada con helado de canela', descripcion: 'Bollo de brioche empapado en leche con canela, caramelizado a la plancha.', categoria: 'postres', precio: 6.2, alergenos: ['Gluten', 'Huevo', 'Lactosa'], vegetariano: true, picante: false, destacado: false, disponible: false },
  { id: 19, nombre: 'Naranjas de Valencia con canela y aceite', descripcion: 'Naranja de Ribera pelada a cuchillo, canela en polvo y un hilo de aceite de oliva virgen extra.', categoria: 'postres', precio: 4.5, alergenos: [], vegetariano: true, picante: false, destacado: false, disponible: true },

  { id: 20, nombre: 'Copa «Mar i Vent» blanco de Utiel-Requena', descripcion: 'Fermentado en tinaja, con tufa a flor y frescura de garnacha blanca. Copas de 15 cl.', categoria: 'vinos', precio: 4.5, alergenos: [], vegetariano: true, picante: false, destacado: false, disponible: true },
  { id: 21, nombre: 'Bobal ecológico, añada 2022 (botella)', descripcion: 'Viña de secano en altura, crianza de 4 meses en roble usado. 75 cl.', categoria: 'vinos', precio: 24.0, alergenos: [], vegetariano: true, picante: false, destacado: false, disponible: true },
  { id: 22, nombre: 'Xarel·lo «Pedra de Guix» (botella)', descripcion: 'Viña vieja sobre suelo calizo, fermentación en barrica y 8 meses sobre lías. 75 cl.', categoria: 'vinos', precio: 26.0, alergenos: [], vegetariano: true, picante: false, destacado: false, disponible: true },
  { id: 23, nombre: 'Cava brut nature de la casa (copa)', descripcion: 'Macabeo y parellada, 24 meses de crianza y sin azúcar de dosificación. Copas de 10 cl.', categoria: 'vinos', precio: 6.0, alergenos: [], vegetariano: true, picante: false, destacado: false, disponible: true }
];

/* --------------------------------------------------------------------------
   2) HORARIOS — los 7 días del array HORARIOS del index.html
   -------------------------------------------------------------------------- */

const HORARIOS = [
  { dia: 'lunes', cerrado: true, turnos: [] },
  { dia: 'martes', cerrado: false, turnos: [{ desde: '13:00', hasta: '15:30' }, { desde: '20:00', hasta: '23:30' }] },
  { dia: 'miércoles', cerrado: false, turnos: [{ desde: '13:00', hasta: '15:30' }, { desde: '20:00', hasta: '23:30' }] },
  { dia: 'jueves', cerrado: false, turnos: [{ desde: '13:00', hasta: '15:30' }, { desde: '20:00', hasta: '23:30' }] },
  { dia: 'viernes', cerrado: false, turnos: [{ desde: '13:00', hasta: '15:30' }, { desde: '20:00', hasta: '23:30' }] },
  { dia: 'sábado', cerrado: false, turnos: [{ desde: '20:00', hasta: '00:00' }] },
  { dia: 'domingo', cerrado: false, turnos: [{ desde: '13:00', hasta: '16:00' }] }
];

/* --------------------------------------------------------------------------
   3) RESEÑAS — las 4 opiniones del array RESENAS del index.html
   -------------------------------------------------------------------------- */

const RESENAS = [
  {
    autor: 'Marta Sanchís',
    fecha: '12 de septiembre de 2026',
    estrellas: 5,
    texto: 'Fuimos por el arroz de bogavante y volvimos por el esgarrat. El trato es de barrio, el vino está a precio justo y te explican de dónde viene cada cosa sin postureo. Reserva, porque los sábados no hay mesa.',
    fuente: 'Google'
  },
  {
    autor: 'Jordi Peiró',
    fecha: '30 de agosto de 2026',
    estrellas: 5,
    texto: 'Cena de aniversario con el menú degustación de seis pasos. La alcachofa a la brasa y la torrija fueron lo mejor de la noche. Maridaje muy bien pensado y nos dejaron tardar sin problema.',
    fuente: 'Tripadvisor'
  },
  {
    autor: 'Lucía Herrera',
    fecha: '17 de agosto de 2026',
    estrellas: 5,
    texto: 'Soy celíaca y avisé al reservar: tenían plancha dedicada y me trajeron una ficha de alérgenos completa. Se agradece que te tomen en serio. El flan, de otra época.',
    fuente: 'Google'
  },
  {
    autor: 'Álvaro Mestre',
    fecha: '2 de agosto de 2026',
    estrellas: 5,
    texto: 'Comimos en la terraza de la Mercè con los niños. Menú infantil razonable, tronas disponibles y nadie nos miró mal cuando sonó el bebé. Paella valenciana de libro los domingos.',
    fuente: 'Tripadvisor'
  }
];

/* --------------------------------------------------------------------------
   Inserción (solo si la tabla correspondiente está vacía)
   -------------------------------------------------------------------------- */

/** Rellena una tabla solo si está vacía */
function sembrar(db) {
  // --- platos -------------------------------------------------------------
  if (Number(db.prepare('SELECT COUNT(*) AS n FROM platos').get().n) === 0) {
    const insertarPlato = db.prepare(
      `INSERT INTO platos (id, nombre, descripcion, categoria, precio, alergenos,
                           vegetariano, picante, destacado, disponible, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    PLATOS.forEach((p, i) =>
      insertarPlato.run(
        p.id, p.nombre, p.descripcion, p.categoria, p.precio,
        JSON.stringify(p.alergenos || []),
        p.vegetariano ? 1 : 0,
        p.picante ? 1 : 0,
        p.destacado ? 1 : 0,
        p.disponible ? 1 : 0,
        i + 1
      )
    );
  }

  // --- horarios -----------------------------------------------------------
  if (Number(db.prepare('SELECT COUNT(*) AS n FROM horarios').get().n) === 0) {
    const insertarDia = db.prepare(
      'INSERT INTO horarios (dia, cerrado, turnos) VALUES (?, ?, ?)'
    );
    HORARIOS.forEach((d) =>
      insertarDia.run(d.dia, d.cerrado ? 1 : 0, JSON.stringify(d.turnos || []))
    );
    // (el id sigue el orden de inserción: 1=lunes … 7=domingo)
  }

  // --- resenas ------------------------------------------------------------
  if (Number(db.prepare('SELECT COUNT(*) AS n FROM resenas').get().n) === 0) {
    const insertarResena = db.prepare(
      'INSERT INTO resenas (autor, fecha, estrellas, texto, fuente, orden) VALUES (?, ?, ?, ?, ?, ?)'
    );
    RESENAS.forEach((r, i) =>
      insertarResena.run(r.autor, r.fecha, r.estrellas, r.texto, r.fuente, i + 1)
    );
  }

  // --- reservas -----------------------------------------------------------
  // La tabla `reservas` NO se siembra: empieza vacía (las reservas reales
  // las crean los clientes con POST /api/reservas).
}

module.exports = { ESQUEMA, sembrar, PLATOS, HORARIOS, RESENAS };
