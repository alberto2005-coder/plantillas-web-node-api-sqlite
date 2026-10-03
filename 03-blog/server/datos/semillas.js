/* ==========================================================================
    DATOS INICIALES (semillas) — 03-blog · "Bitácora Digital"
    --------------------------------------------------------------------------
    - ESQUEMA: tablas `articulos` y `suscriptores`.
    - ARTICULOS: los 8 artículos del grid del index.html + el destacado,
      transcritos tal cual (título, categoría, tags, autor, fecha, minutos).
    - sembrar(db) solo se ejecuta si la tabla `articulos` está vacía.
      Para volver al estado original: `npm run reiniciar`.

    Los `cuerpo_md` son artículos de ejemplo coherentes con cada extracto
    (Markdown que server/lib/markdown.js convierte a HTML al servirlos).
    ========================================================================== */

'use strict';

/** Categorías del blog: clave (se usa en data-categoria) → etiqueta visible */
const CATEGORIAS = {
  desarrollo: 'Desarrollo',
  ia: 'Inteligencia Artificial',
  seguridad: 'Seguridad',
  movil: 'Móvil',
  diseno: 'Diseño'
};

/** Esquema SQL creado al abrir la base (1/0 en lugar de true/false) */
const ESQUEMA = `
CREATE TABLE IF NOT EXISTS articulos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT    NOT NULL UNIQUE,
  titulo           TEXT    NOT NULL,
  extracto         TEXT    NOT NULL DEFAULT '',
  cuerpo_md        TEXT    NOT NULL DEFAULT '',
  categoria        TEXT    NOT NULL,               -- desarrollo | ia | seguridad | movil | diseno
  tags             TEXT    NOT NULL DEFAULT '',    -- separadas por comas: "ia,modelo,llm"
  autor            TEXT    NOT NULL,
  avatar_iniciales TEXT    NOT NULL DEFAULT '',
  fecha            TEXT    NOT NULL,               -- 'YYYY-MM-DD'
  minutos          INTEGER NOT NULL DEFAULT 5,
  destacado        INTEGER NOT NULL DEFAULT 0,     -- 1 = el de la portada
  gradiente        INTEGER NOT NULL DEFAULT 1,     -- 1..7 (clase .gradiente-N)
  publicado        INTEGER NOT NULL DEFAULT 1,
  vistas           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS suscriptores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  origen     TEXT NOT NULL DEFAULT 'lateral',      -- 'lateral' | 'ancha'
  confirmado INTEGER NOT NULL DEFAULT 0,
  creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/** De "Marina Gutiérrez" a "MG" (para el avatar de las tarjetas) */
function iniciales(nombre) {
  return String(nombre || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

/** Título → "css-grid-en-produccion-10-patrones" (minúsculas, sin tildes ni símbolos) */
function slugificar(texto) {
  return (
    String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '') || 'articulo'
  );
}

/**
 * Los 8 artículos del grid del index.html + el destacado de portada.
 * El orden del array es el orden de inserción; la API ordena por fecha DESC.
 */
const ARTICULOS = [
  {
    slug: 'la-nueva-ola-de-agentes-autonomos',
    titulo: 'La nueva ola de agentes autónomos: cómo están cambiando el desarrollo de software',
    extracto:
      'Los asistentes programadores dejaron de ser una curiosidad para convertirse en compañeros de equipo. Analizamos qué cambió en los últimos doce meses, qué tareas funcionan bien delegadas y dónde aún hace falta el criterio humano para tomar decisiones de arquitectura.',
    categoria: 'ia',
    tags: 'ia,agentes,llm,desarrollo',
    autor: 'Marina Gutiérrez',
    avatar_iniciales: 'MG',
    fecha: '2026-09-28',
    minutos: 9,
    destacado: 1,
    gradiente: 1,
    publicado: 1,
    vistas: 5231,
    cuerpo_md: `Hace doce meses los asistentes completaban la línea que estabas escribiendo. Hoy abren varios ficheros, proponen un cambio cruzado, redactan el mensaje del *commit* y esperan tu revisión. La diferencia no es solo la potencia del modelo: es el **contexto** que recibe.

> Un agente sin contexto es un autocomplete caro. Un agente con contexto es un compañero con buena memoria y criterio todavía irregular.

## Lo que de verdad cambió

Tres cosas se alinearon en el último año:

- **Repositorios indexados**: el agente puede buscar, no solo mirar el fichero abierto.
- **Herramientas reales**: terminal, navegador y cliente Git, con permisos explícitos.
- **Memoria de proyecto**: decisiones pasadas escritas en el repo se vuelven instrucciones.

### Tareas que funcionan bien delegadas

1. Refactors mecánicos (renombrar, mover, tipar).
2. Tests que faltan para una función ya terminada.
3. Traducción de un error de producción a una prueba reproduciible.
4. Documentación de módulos internos.

### Dónde sigue mandando el humano

Las decisiones de arquitectura siguen siendo caras de revertir. Cuando el agente propone una cola, un caché o una tabla nueva, la pregunta no es *«¿puede escribirlo?»* sino *«¿queremos mantenerlo en dos años?»*.

\`\`\`js
// Ejemplo de prompt de proyecto: contexto antes que instrucción
const contexto = {
  reglas: ['sin dependencias nuevas', 'Node 22+', 'español en comentarios'],
  objetivo: 'añadir reintentos a la descarga con backoff exponencial'
};
\`\`\`

## Nuestra receta

Delegamos en tres bloques: primero **explorar** (que el agente lea y resuma), después **proponer** (un plan en punto y coma) y solo al final **escribir**. El tiempo de revisión bajó; el tiempo de *pensar* antes de pedir el cambio, subió — y eso es una buena señal.`
  },
  {
    slug: 'css-grid-en-produccion-10-patrones',
    titulo: 'CSS Grid en producción: 10 patrones que todo equipo debería conocer',
    extracto:
      'Del layout editorial al dashboard denso: ejemplos reales con medidas de una línea y cómo evitar el colapso de columnas.',
    categoria: 'desarrollo',
    tags: 'javascript,frontend,rendimiento',
    autor: 'Javier Ruiz',
    avatar_iniciales: 'JR',
    fecha: '2026-09-26',
    minutos: 6,
    destacado: 0,
    gradiente: 2,
    publicado: 1,
    vistas: 4120,
    cuerpo_md: `Grid resolvió la mitad de los problemas de layout y trajo una mitad nueva: más propiedades, más jerga y más formas de romper la maqueta. Estos son los patrones que usamos cada semana.

## Las tres declaraciones que lo cambian todo

\`\`\`css
.rejilla {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
}
\`\`\`

- **repeat(auto-fit, minmax(260px, 1fr))**: columnas que se solucionan solas sin un solo *media query*.
- **gap**: espaciado real entre pistas; nunca hace *collapse* como los márgenes.
- **minmax(0, 1fr)**: el antídoto contra el desbordamiento de contenido largo.

## Diez patrones (resumen)

1. Centro fijo con laterales fluidos: \`grid-template-columns: 1fr min(65ch, 100%) 1fr\`.
2. Sidebar pegajosa con \`position: sticky\` dentro de una pista.
3. Tarjetas de altura igual con \`grid-auto-rows: 1fr\`.
4. *Full-bleed* desde un contenedor con \`grid-column: 1 / -1\`.
5. Área nombrada con \`grid-template-areas\` para layouts con nombre legible.
6. Solapamiento intencionado de dos elementos (texto sobre imagen).
7. *Masonry* simple con \`grid-auto-flow: dense\` (con sus advertencias de orden).
8. Filas de tabla densas con \`align-items: center\` y pistas \`auto\`.
9. Icono + contenido con \`grid-template-columns: auto 1fr\`.
10. Retícula editorial de 12 columnas usada solo donde aporta.

> La regla de oro: si necesitas tres *media queries* para algo que \`auto-fit\` resuelve, casi siempre estás peleando con la herramienta equivocada.

## Cómo evitar el colapso de columnas

El clásico: un hijo con \`min-width: auto\` y un texto largo estira la columna hasta romper el layout. La solución es una línea:

\`\`\`css
.rejilla > * { min-width: 0; }
\`\`\`

Con eso, los desbordamientos vuelven a ser *scroll* interno (o mejor: un \`overflow-wrap: anywhere\` en el bloque de texto) en lugar de romper la página entera.`
  },
  {
    slug: 'ingenieria-de-prompts-se-volvio-un-oficio',
    titulo: 'Entrenar menos y preguntar mejor: cómo la ingeniería de prompts se volvió un oficio',
    extracto:
      'Equipos completos dedican su jornada a afinar instrucciones. Repasamos técnicas que sí reducen el tiempo de respuesta.',
    categoria: 'ia',
    tags: 'ia,modelo,llm',
    autor: 'Lucía Campos',
    avatar_iniciales: 'LC',
    fecha: '2026-09-24',
    minutos: 8,
    destacado: 0,
    gradiente: 3,
    publicado: 1,
    vistas: 3987,
    cuerpo_md: `Hay equipos que entrenan modelos propios cuando lo que les falta es una instrucción clara. Hemos medido tres meses de trabajo de *prompting* en un equipo de doce personas y el patrón se repite: menos capacitación, más plantillas.

## Qué medimos

- Tiempo medio hasta la primera respuesta útil.
- Número de *reintentos* por consulta.
- Coste por tarea completada.

### Técnicas que sí reducen el tiempo

1. **Contexto antes que consigna**: primero qué es el proyecto, después qué quieres.
2. **Formato de salida explícito**: JSON, tabla o lista; nunca "hazlo bonito".
3. **Ejemplos negativos**: dos casos de lo que *no* quieres valen más que tres párrafos.
4. **Descomponer**: una tarea con cinco pasos en cinco llamadas con control.

\`\`\`text
ROL: revisor de código senior (20 años, sin paciencia para elogiarse).
TAREA: revisar SOLO el fichero adjunto.
FORMATO: lista de hallazgos "severidad | fichero:línea | problema | arreglo".
LÍMITE: 10 hallazgos como máximo, ordenados por severidad.
\`\`\`

## Lo que no funciona

Los prompts que piden "ser creativo y original" producen exactamente lo contrario: la media se va hacia el centro de la distribución. En cambio, una restricción dura —una referencia, un tono, un formato— acota tanto el espacio que la respuesta *tiene* que salir distinta.

> La ingeniería de prompts no es escribir más: es decidir qué información merece estar en el contexto.

## Conclusión

Entrena tu modelo si tu caso lo exige; casi siempre conviene antes entrenar a tu equipo a preguntar. Un *playbook* de diez páginas con las plantillas del equipo rindió más que cualquier fine-tuning que probamos.`
  },
  {
    slug: 'passkeys-en-la-practica',
    titulo: 'Passkeys en la práctica: lo que aprendimos tras desplegarlas en una tienda online',
    extracto:
      'Menos abandono en el registro, menos tickets de soporte y una pregunta complicada: ¿qué hacemos con los usuarios antiguos?',
    categoria: 'seguridad',
    tags: 'seguridad,passwords,phishing',
    autor: 'Diego Molina',
    avatar_iniciales: 'DM',
    fecha: '2026-09-22',
    minutos: 7,
    destacado: 0,
    gradiente: 4,
    publicado: 1,
    vistas: 3610,
    cuerpo_md: `Activamos *passkeys* en una tienda con 40.000 cuentas activas durante un trimestre. Estos son los números y las decisiones que no parecían importantes en la prueba de concepto.

## Qué mejoró

- Registro: **−31 %** de abandonos entre quienes vieron la opción de passkey.
- Tickets de "no recuerdo mi contraseña": **−44 %**.
- Intentos de phishing con éxito: prácticamente nulos (no hay contraseña que capturar).

## La pregunta difícil: los usuarios antiguos

Una passkey vive en el dispositivo y en el gestor del sistema. Si alguien cambia de móvil sin restauración, se queda fuera. Nuestra solución fue gradual:

1. **Nuevos usuarios**: passkey como método principal, correo solo como recuperación.
2. **Usuarios existentes**: mantener contraseña y *invitar* a crear passkey tras un login correcto.
3. **Cuenta bloqueada**: verificar identidad con el pedido reciente más alto + correo.

\`\`\`js
// La bandera que decide qué mostramos en el formulario de acceso
const metodoPreferido = usuario.passkey_creada ? 'webauthn' : 'password';
\`\`\`

> La passkey no sustituye la recuperación: sustituye el *recuerdo* diario. La recuperación sigue siendo el cuello de botella.

## Lo que no medimos al principio

Los *cross-device* (iniciar sesión en el portátil con el móvil cerca) funcionan, pero generan dudas: la gente cree que está roto cuando el navegador tarda tres segundos. Un texto de ayuda bajo el botón recortó los tickets casi tanto como la propia passkey.`
  },
  {
    slug: 'apps-mas-ligeras-rendering-nativo',
    titulo: 'Apps más ligeras: por qué volver al rendering nativo ganó terreno en 2026',
    extracto:
      'Batería, arranque en frío y tamaño de descarga volvieron a pesar más que la velocidad de desarrollo.',
    categoria: 'movil',
    tags: 'movil,android,ios,apps',
    autor: 'Ana Serrano',
    avatar_iniciales: 'AS',
    fecha: '2026-09-20',
    minutos: 5,
    destacado: 0,
    gradiente: 5,
    publicado: 1,
    vistas: 2140,
    cuerpo_md: `Durante años la conversación era sencilla: *cross-platform* gana porque un equipo, dos sistemas. En 2026 varios productos medianos han vuelto atrás, y los datos que dan son consistentes.

## Los tres números que se citan

- **Arranque en frío**: entre 300 y 700 ms menos en gama media.
- **Tamaño de descarga**: la app de un cliente bajó de 68 MB a 24 MB.
- **Consumo en segundo plano**: menos hilos de JavaScript vivos de más.

### No es una vuelta al pasado

Nadie vuelve a escribir dos aplicaciones desde cero. Los patrones que funcionan hoy son híbridos:

1. Núcleo compartido en Kotlin Multiplatform o Swift Package (red, modelos, reglas).
2. Interfaces nativas para las pantallas que se usan a diario.
3. Compartir solo lo que *no* cambia: autenticación, colas, analítica.

\`\`\`kotlin
// El núcleo compartido vive en la plataforma; la UI, no
fun obtenerCarrito(): Flow<Carrito> = repositorio.carrito
\`\`\``
  },
  {
    slug: 'contraste-y-foco-accesibilidad',
    titulo: 'Contraste y foco: la accesibilidad que sí mejora la conversión',
    extracto:
      'Medimos el impacto de tres cambios sencillos en un formulario de suscripción: foco visible, jerarquía y color.',
    categoria: 'diseno',
    tags: 'diseno,ux,accesibilidad',
    autor: 'Pablo Torres',
    avatar_iniciales: 'PT',
    fecha: '2026-09-18',
    minutos: 6,
    destacado: 0,
    gradiente: 6,
    publicado: 1,
    vistas: 1765,
    cuerpo_md: `La accesibilidad suele presentarse como una obligación. Medimos tres cambios en un formulario de suscripción y las conversiones subieron un 12 %: la accesibilidad, aquí, fue el camino corto.

## Los tres cambios

- **Foco visible con 3 px**: el \`outline\` por defecto se había "mejorado" borrándolo. Recuperarlo ayudó a teclado *y* a ratón distraído.
- **Contraste mínimo 4.5:1**: el gris de metadatos pasó de 2.9:1 a 4.6:1.
- **Jerarquía de un solo vistazo**: un solo campo, un botón, un mensaje de error junto al campo.

\`\`\`css
:where(a, button, input):focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 3px;
}
\`\`\`

## Lo que medimos

1. Errores de validación por usuario: **−27 %**.
2. Tiempo medio hasta el envío correcto: **−11 %**.
3. Abandono en el paso único: **−9 %**.

> Si tu error solo cambia de color de gris, no es un error: es una pista de opción múltiple.

## Cuidado con el modo oscuro

Un contraste que pasa en claro puede fallar en oscuro, y al revés. Revisa las dos paletas con la misma herramienta (DevTools o axe) antes de dar por cerrado el cambio: en nuestro caso, dos variables de color fallaban solo en el tema oscuro.`
  },
  {
    slug: 'backend-sin-frameworks-4000-lineas',
    titulo: 'Sin frameworks: mantener un backend de 4.000 líneas es más fácil de lo que crees',
    extracto:
      'Menos dependencias, despliegues más rápidos y un equipo que entiende cada línea. Nuestra experiencia de dos años.',
    categoria: 'desarrollo',
    tags: 'javascript,backend,node',
    autor: 'Marina Gutiérrez',
    avatar_iniciales: 'MG',
    fecha: '2026-09-15',
    minutos: 10,
    destacado: 0,
    gradiente: 7,
    publicado: 1,
    vistas: 3011,
    cuerpo_md: `Llevamos dos años con un backend de unas 4.000 líneas y cero frameworks: ` + '`node:http`' + `, SQLite y unos cuantos módulos propios. No es una hazaña: es una decisión de mantenimiento.

## Lo que ganamos

- **Arranque en frío**: menos de 80 ms, sin cadena de *middlewares*.
- **Dependencias**: cinco paquetes en producción (y tres solo para desarrollo).
- **Auditoría**: revisar el árbol de módulos lleva minutos, no tardes.

### Cómo está organizado

1. \`server/lib/\` — utilidades estables: env, http, router, db.
2. \`server/api.js\` — un archivo con todas las rutas, en orden alfabético por recurso.
3. \`server/datos/\` — esquema y semillas versionados en el repositorio.

\`\`\`js
// El enrutador entero cabe en una idea: coincidencia por método y patrón
api.get('/api/articulos/:slug', (ctx) => {
  const fila = bd.uno('SELECT * FROM articulos WHERE slug = ?', ctx.params.slug);
  if (!fila) return ctx.fallo(404, 'No existe ese artículo');
  ctx.json(fila);
});
\`\`\`

## Lo que asumimos

No hay *plugin* para nada: quien añade un endpoint escribe SQL. Eso incomoda las primeras dos semanas y después simplifica todo. El trato que hicimos fue explícito: **cualquier dependencia nueva necesita un texto que explique qué hace y quién la mantiene**.

> Un framework te ahorra el trabajo de hoy y te deja la factura de la migración de dentro de tres años.

## Cuándo no lo recomendamos

Si necesitas auth social, colas con garantías, subidas grandes y varios equipos tocando el mismo repo a la vez, usa un framework maduro. El ahorro solo aparece cuando el dominio es tuyo y el equipo es pequeño.`
  },
  {
    slug: 'datos-sinteticos-privacidad',
    titulo: 'Datos sintéticos: cuando tu modelo no puede tocar la información real',
    extracto:
      'Regulación, sesgos y coste de etiquetado: por qué los equipos de datos están generando copias de sus conjuntos.',
    categoria: 'ia',
    tags: 'ia,datos,privacidad',
    autor: 'Lucía Campos',
    avatar_iniciales: 'LC',
    fecha: '2026-09-12',
    minutos: 7,
    destacado: 0,
    gradiente: 1,
    publicado: 1,
    vistas: 2874,
    cuerpo_md: `Hay equipos que no pueden enseñar sus datos a nadie: ni a un proveedor externo, ni siquiera a su propia plataforma de entrenamiento. Los datos sintéticos volvieron a estar de moda por una razón aburrida, y es la normativa.

## Tres razones, en orden

1. **Privacidad**: compartir un conjunto sintético no expone registros reales.
2. **Acceso**: un equipo puede desarrollar sin pedir permiso por cada consulta.
3. **Coste**: etiquetar 10.000 ejemplos sintéticos es mucho más barato que etiquetar reales.

### El riesgo que nadie menciona al principio

Un generador buenísimo copia también los *sesgos*. Si tu histórico penaliza ciertos perfiles, el sintético lo hará igual — y con la ventaja añadida de que ya nadie recuerda de dónde vino.

\`\`\`python
# Comprobación mínima antes de confiar en el conjunto
for columna in columnas_sensibles:
    print(columna, distribucion_real[columna], distribucion_sintetica[columna])
\`\`\`

## Qué medimos antes de usarlos

- Distancia entre distribuciones reales y sintéticas por columna.
- Rendimiento de un modelo entrenado con sintéticos sobre un *holdout* real.
- Intentos de reidentificación (búsqueda de registros híbridos).

> Los datos sintéticos no sustituyen la evaluación real: sustituyen el *desarrollo* sin datos reales.

## Conclusión

Muy buen camino para entrenar y probar; imprescindible medir sobre datos reales antes de declarar nada en producción.`
  },
  {
    slug: 'dependencias-fantasma-npm',
    titulo: 'Dependencias fantasma: cómo revisamos la cadena de suministro de npm',
    extracto:
      'Un script de auditoría, tres paquetes huérfanos y una lección sobre lo que ocurre cuando nadie mira el árbol de módulos.',
    categoria: 'seguridad',
    tags: 'seguridad,supply-chain,dependencias',
    autor: 'Diego Molina',
    avatar_iniciales: 'DM',
    fecha: '2026-09-09',
    minutos: 9,
    destacado: 0,
    gradiente: 3,
    publicado: 1,
    vistas: 4402,
    cuerpo_md: `Un ` + '`npm audit`' + ` limpio no significa un árbol de módulos sano. La revisión que hicimos encontró tres paquetes que nadie usaba, dos con publicaciones automáticas y uno con un mantenimiento de una sola persona.

## El método, en cuatro pasos

1. **Listar lo que de verdad se importa** (no lo que está en \`package.json\`).
2. **Marcar huérfanos**: dependencias sin ningún \`require\`/\`import\`.
3. **Revisar autores y antigüedad** de cada paquete transitivo.
4. **Fijar versiones** y comprobar el *lockfile* en cada despliegue.

\`\`\`bash
# 1) Dependencias instaladas vs. usadas
npm ls --all --depth=3 > instaladas.txt
rg -o "from ['\"][^'\"]+['\"]" src/ | sort -u > usadas.txt
\`\`\`

### Señales de alerta

- Un paquete con una versión publicada *justo* después de perder el mantenimiento.
- Scripts de instalación (\`postinstall\`) en paquetes que no los necesitan.
- Nombres casi idénticos a los populares (*typosquatting*).

> La cadena de suministro no se rompe en el paquete que más te gusta: se rompe en el transitivo que nadie ha abierto nunca.

## Qué cambió en nuestro proceso

Ahora toda dependencia nueva entra con una línea en el *pull request* explicando qué hace y quién la mantiene. Un año después: cero dependencias sin uso y un árbol que cabe en una pantalla.`
  }
];

/** Rellena la tabla `articulos` solo si está vacía */
function sembrar(db) {
  const n = Number(db.prepare('SELECT COUNT(*) AS n FROM articulos').get().n);
  if (n > 0) return;

  const insertar = db.prepare(
    `INSERT INTO articulos
      (slug, titulo, extracto, cuerpo_md, categoria, tags, autor, avatar_iniciales,
       fecha, minutos, destacado, gradiente, publicado, vistas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  ARTICULOS.forEach((a) => {
    insertar.run(
      a.slug || slugificar(a.titulo),
      a.titulo,
      a.extracto,
      a.cuerpo_md || '',
      a.categoria,
      a.tags || '',
      a.autor,
      a.avatar_iniciales || iniciales(a.autor),
      a.fecha,
      Number(a.minutos) || 5,
      a.destacado ? 1 : 0,
      Number(a.gradiente) || 1,
      a.publicado === 0 ? 0 : 1,
      Number(a.vistas) || 0
    );
  });
}

module.exports = { ESQUEMA, sembrar, ARTICULOS, CATEGORIAS, slugificar, iniciales };
