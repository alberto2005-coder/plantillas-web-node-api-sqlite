# Guía de desarrollador — 03 · Blog «Bitácora Digital»

Arquitectura, base de datos, API completa con ejemplos reales y recetas para
extender la plantilla. Todo lo que aquí se cita está leído del código de esta
carpeta: `server/`, `js/`, `index.html` y `articulo.html`.

---

## 1. Para quién es

Para quien va a **tocar el código**: añadir endpoints, meter columnas nuevas,
 cambiar el formulario o conectar otro CMS. Si solo quieres publicar contenido
sin programar, usa la [guía de usuario](GUIA-USUARIO.md).

### Mapa de ficheros

```
03-blog/
├── index.html            ← portada: destacado (#titulo-destacado), #articulos,
│                            #grid-articulos, #chips-filtro, sidebar y #newsletter
├── articulo.html         ← detalle (?slug=…): #articulo-cuerpo, #aviso-pagina
├── css/styles.css        ← bloque «PALETA DE COLORES — EDITA AQUÍ», temas y componentes
├── js/main.js            ← cliente api(), filtros, paginación real, newsletter (§0-§9)
├── js/articulo.js        ← lee ?slug= y pinta GET /api/articulos/:slug
├── .env                  ← PORT=3003, ADMIN_TOKEN, POR_PAGINA, LIMITE_NEWSLETTER…
├── .env.example          ← plantilla comentada de variables
├── package.json          ← scripts: start · dev · reiniciar · sin-instalar
├── README.md             ← 12 secciones (arranque, .env, API, BD, despliegue…)
├── docs/
│   ├── GUIA-USUARIO.md       ← esta carpeta: recorrido y cambios sin programar
│   └── GUIA-DESARROLLADOR.md ← el presente documento
└── server/
    ├── server.js         ← arranque: .env → BD → router → API → estáticos
    ├── api.js            ← registrar(api, {bd}): las 9 rutas REST
    ├── reset.js          ← `npm run reiniciar`
    ├── datos/semillas.js ← ESQUEMA SQL + CATEGORIAS + los 9 artículos de ejemplo
    ├── data/blog.db      ← SQLite (generado; junto a blog.db-wal / blog.db-shm)
    └── lib/
        ├── env.js        ← cargarEnv, entero, booleano, opcional
        ├── http.js       ← json, error, leerCuerpo (1 MB), estatico
        ├── router.js     ← crearRouter(): enrutador por método + patrón
        ├── db.js         ← crearBase() sobre node:sqlite
        ├── markdown.js   ← markdownAHTML, markdownATexto, escaparHTML
        ├── email.js      ← enviarCorreo (Resend / SMTP / demo)
        └── limitador.js  ← crearLimitador() en memoria por IP
```

Requisito duro: **Node ≥ 22.13** (`node:sqlite`); `engines` de `package.json`
lo fija en `>=22.13.0`.

---

## 2. Ciclo de una petición

### 2.1 Diagrama

```
navegador (js/main.js)                    node (server/)
────────────────────────                  ────────────────────────────────────
fetch('/api/articulos?categoria=ia')
        │  GET + Accept: application/json
        ▼
http.createServer(async (req,res))        server.js:50
        │  req.url.startsWith('/api/') ──► SÍ → api.manejar(req, res)   router.js:45
        │                                        │
        │                                        ├─ CORS opcional (CORS=1)
        │                                        ├─ compilar('/api/articulos/:slug')
        │                                        │    ¿método?  ¿patrón?  → params
        │                                        ├─ construye `ctx`:
        │                                        │    json · fallo · cuerpo()
        │                                        │    cabecera() · ip · query
        │                                        ▼
        │                                  api.get('/api/articulos')   api.js:223
        │                                        │  WHERE publicado=1 AND destacado=0
        │                                        │  + categoria/q/tag + COUNT(*) + LIMIT
        │                                        ▼
        │                                  ctx.json({items,total,pagina,…})
        │                                        │
        ◄──────────────────────────────  json(): writeHead + cuerpo ──────────┘

Si la ruta NO es /api/… → estatico(req,res,RAIZ)   http.js:101
  • bloquea server/, .env, *.md, *.db → 403
  • index.html con Cache-Control: no-cache; el resto, max-age=300 + ETag
```

### 2.2 Ejemplo trazado: `GET /api/articulos?categoria=ia&pagina=2`

1. **`server/server.js:50-55`** — la URL empieza por `/api/` →
   `api.manejar(req, res)`; si el router no atiende nada, `404 No existe la ruta…`.
2. **`server/lib/router.js:45-66`** — `consulta(req)` deja `pathname` y
   `query = {categoria:'ia', pagina:'2'}`. `compilar()` compara segmentos: la
   URL no casa con `/api/articulos/:slug` (número de segmentos distinto), casa
   con `GET /api/articulos`.
3. **`router.js:68-80`** — se construye el `ctx` (`query`, `params`, `ip`,
   `json`, `fallo`, `cuerpo`, `cabecera`).
4. **`server/api.js:223-253`** — parte de `['publicado = 1', 'destacado = 0']`;
   como `CATEGORIAS` tiene la clave `ia`, añade
   `LOWER(sinTildes('categoria')) = ?`. Clave desconocida →
   `ctx.fallo(400, 'Categoría no válida', 'Usa: desarrollo, ia, …')`.
5. **`api.js:255-275`** — `COUNT(*)` → `total`; `por_pagina` (3, de
   `POR_PAGINA`) → `paginas` y `pagina` recortada; luego
   `SELECT … ORDER BY fecha DESC, id DESC LIMIT ? OFFSET ?`.
6. **`api.js:277-283`** → `ctx.json({items,total,pagina,paginas,por_pagina})`;
   **`http.js:43-52`** lo serializa con `Cache-Control: no-store`.
7. **Navegador** — `api()` (`js/main.js:32-46`) devuelve el cuerpo;
   `pintarArticulos()` repinta `#grid-articulos` y `pintarPaginacion()`
   reconstruye los botones.

Una excepción dentro del manejador la recoge `router.js:85-91` →
`e.codigo || 500`.

---

## 3. Base de datos

Motor: `node:sqlite` (`server/lib/db.js`), fichero por defecto
`server/data/blog.db` (variable `DB_FILE`). Modo WAL y
`PRAGMA foreign_keys = ON`. **Sin booleanos ni objetos**: se pasa `1/0` y
texto (los `tags` van en CSV).

### 3.1 Tabla `articulos` (`server/datos/semillas.js:27-43`)

| Columna | Tipo | Restricción / nota |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `slug` | TEXT | NOT NULL, **UNIQUE** |
| `titulo` | TEXT | NOT NULL (5–180 caracteres, valida `api.js`) |
| `extracto` | TEXT | NOT NULL DEFAULT '' (10–500) |
| `cuerpo_md` | TEXT | NOT NULL DEFAULT '' — Markdown en bruto |
| `categoria` | TEXT | NOT NULL — `desarrollo \| ia \| seguridad \| movil \| diseno` |
| `tags` | TEXT | NOT NULL DEFAULT '' — CSV: `"ia,modelo,llm"` |
| `autor` | TEXT | NOT NULL |
| `avatar_iniciales` | TEXT | NOT NULL DEFAULT '' |
| `fecha` | TEXT | NOT NULL — `'YYYY-MM-DD'` |
| `minutos` | INTEGER | NOT NULL DEFAULT 5 (1–180) |
| `destacado` | INTEGER | NOT NULL DEFAULT 0 — **1/0**, solo uno vale 1 |
| `gradiente` | INTEGER | NOT NULL DEFAULT 1 — 1..7 (`.gradiente-N`) |
| `publicado` | INTEGER | NOT NULL DEFAULT 1 — **1/0** |
| `vistas` | INTEGER | NOT NULL DEFAULT 0 — se suma 1 en cada `GET /api/articulos/:slug` |

### 3.2 Tabla `suscriptores` (`semillas.js:45-51`)

| Columna | Tipo | Restricción / nota |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `email` | TEXT | NOT NULL, **UNIQUE** |
| `origen` | TEXT | NOT NULL DEFAULT `'lateral'` — `lateral \| ancha` |
| `confirmado` | INTEGER | NOT NULL DEFAULT 0 — **1/0** (preparado para doble opt-in) |
| `creado_en` | TEXT | NOT NULL DEFAULT `(datetime('now'))` |

JSON en TEXT: **no hay ninguna columna JSON en esta plantilla** (los `tags` son
CSV y `colores` no existe aquí; es propio de 04-tienda).

### 3.3 Semillas (conteos reales)

`ARTICULOS` de `semillas.js` contiene **9 artículos**:

- **1** con `destacado = 1` → «La nueva ola de agentes autónomos…» (`vistas: 5231`).
- **8** con `destacado = 0`, todos `publicado = 1`, repartidos en categorías:
  desarrollo 2 · ia 3 (una es la destacada) · seguridad 2 · movil 1 · diseno 1.
- Los contadores de la API excluyen el destacado, por eso `GET /api/categorias`
  suma **8** en «Todas», igual que el HTML estático.

`suscriptores` **arranca vacía** (la sembra solo si `articulos` está vacía).
`sembrar()` sólo inserta si `SELECT COUNT(*) FROM articulos` es 0.

### 3.4 Índices y claves

- **UNIQUE** en `articulos.slug` y en `suscriptores.email` (las únicas
  restricciones declaradas). Ese UNIQUE es el que convierte el `409` del
  `POST /api/articulos` (`api.js:369-374`).
- **No hay ningún `CREATE INDEX` adicional**: los filtros (`categoria`, `fecha`)
  se resuelven con `WHERE` + `GROUP BY` sobre tablas pequeñas.

### 3.5 `npm run reiniciar` (`server/reset.js`)

1. Borra `DB_FILE`, `DB_FILE + '-wal'` y `DB_FILE + '-shm'`.
2. Vuelve a crear la BD aplicando `ESQUEMA` ( `CREATE TABLE IF NOT EXISTS`).
3. Vuelve a sembrar los 9 artículos.

⚠️ Destruye todo lo creado por API y todas las suscripciones. **Parada el
servidor antes**: si no, el proceso vivo mantiene abiertos sus descriptores y
puede recrear el fichero con el WAL antiguo.

---

## 4. API completa

Todas las rutas responden JSON (`Content-Type: application/json; charset=utf-8`,
`Cache-Control: no-store`). Las de escritura aceptan
`Content-Type: application/json`. Fuente: `server/api.js` (9 rutas) +
`server/lib/router.js` (404/405) + `server/lib/http.js` (400/413/403).

| Método | Ruta | Auth | Parámetros / cuerpo | Respuestas y códigos |
|---|---|---|---|---|
| GET | `/api/salud` | no | – | 200 `{ok, servicio, version, node, hora, uptime_s}` |
| GET | `/api/articulos` | no | `categoria`, `q`, `tag`, `pagina`, `por_pagina` | 200 `{items,total,pagina,paginas,por_pagina}` · 400 categoría no válida |
| GET | `/api/articulos/:slug` | no (o token para borradores) | `:slug` | 200 artículo con `cuerpo_md/cuerpo_html/cuerpo_texto` (+1 vista) · 404 no existe · 404 no publicado sin token |
| GET | `/api/categorias` | no | – | 200 `{items:[{clave,etiqueta,total}], total}` |
| GET | `/api/destacado` | no | – | 200 artículo completo · 404 si no hay destacado |
| POST | `/api/articulos` | `x-admin-token` | `{titulo,extracto,cuerpo_md,categoria,tags,autor,fecha,minutos,gradiente?,destacado?,publicado?,slug?}` | 201 `{ok,id,slug,articulo}` · 400 validación · 401 token · 409 slug repetido · 413 cuerpo > 1 MB |
| PUT | `/api/articulos/:slug` | `x-admin-token` | fusión parcial del cuerpo anterior | 200 `{ok,slug,articulo}` · 400 · 401 · 404 |
| DELETE | `/api/articulos/:slug` | `x-admin-token` | – | 200 `{ok,borrados}` · 401 · 404 |
| POST | `/api/newsletter` | no | `{email, origen?}` (`lateral`\|`ancha`) | 201 alta · 200 `ya_suscrito` · 400 correo · 429 límite |

Errores transversales: `404` ruta `/api/…` desconocida (`server.js:53`),
`405` método que casa la ruta pero no el verbo (`router.js:96`),
`400` «El cuerpo no es JSON válido» y `413` «Cuerpo demasiado grande» sobre
1 MB (`http.js:62-87`), `403` fichero sensible (`http.js:115-117`),
`500` excepción sin código. Forma siempre:
`{ "error": "mensaje" }` y, si la hay, `"detalle"`.

### 4.1 `GET /api/salud`

```bash
curl http://localhost:3003/api/salud
```

```json
{
  "ok": true,
  "servicio": "bitacora-digital-api",
  "version": "1.0.0",
  "node": "v22.14.0",
  "hora": "2026-10-02T09:15:04.512Z",
  "uptime_s": 42
}
```

Errores: ninguno (siempre 200).

### 4.2 `GET /api/articulos`

Query: `categoria` (clave de `CATEGORIAS`; `todos` o vacío = sin filtro),
`q` (búsqueda sin tildes en `titulo`, `extracto`, `autor`, `tags`),
`tag` (coincide como elemento del CSV), `pagina` (por defecto 1),
`por_pagina` (por defecto `POR_PAGINA`=3, recortado entre 1 y 50).

```bash
curl "http://localhost:3003/api/articulos?categoria=ia&q=modelos&pagina=1&por_pagina=3"
```

```json
{
  "items": [
    {
      "id": 3,
      "slug": "ingenieria-de-prompts-se-volvio-un-oficio",
      "titulo": "Entrenar menos y preguntar mejor: cómo la ingeniería de prompts se volvió un oficio",
      "extracto": "Equipos completos dedican su jornada a afinar instrucciones…",
      "categoria": "ia",
      "categoria_etiqueta": "Inteligencia Artificial",
      "tags": "ia,modelo,llm",
      "etiquetas": ["ia", "modelo", "llm"],
      "autor": "Lucía Campos",
      "avatar_iniciales": "LC",
      "fecha": "2026-09-24",
      "minutos": 8,
      "destacado": 0,
      "gradiente": 3,
      "publicado": 1,
      "vistas": 3987,
      "enlace": "articulo.html?slug=ingenieria-de-prompts-se-volvio-un-oficio"
    }
  ],
  "total": 1,
  "pagina": 1,
  "paginas": 1,
  "por_pagina": 3
}
```

Errores:

```bash
curl "http://localhost:3003/api/articulos?categoria=gaming"
# 400 { "error": "Categoría no válida", "detalle": "Usa: desarrollo, ia, seguridad, movil, diseno" }
```

### 4.3 `GET /api/articulos/:slug`

```bash
curl http://localhost:3003/api/articulos/css-grid-en-produccion-10-patrones
```

```json
{
  "id": 2,
  "slug": "css-grid-en-produccion-10-patrones",
  "titulo": "CSS Grid en producción: 10 patrones que todo equipo debería conocer",
  "categoria": "desarrollo",
  "categoria_etiqueta": "Desarrollo",
  "fecha": "2026-09-26",
  "minutos": 6,
  "vistas": 4121,
  "enlace": "articulo.html?slug=css-grid-en-produccion-10-patrones",
  "cuerpo_md": "Grid resolvió la mitad de los problemas…",
  "cuerpo_html": "<p>Grid resolvió la mitad de los problemas…</p>",
  "cuerpo_texto": "Grid resolvió la mitad de los problemas…"
}
```

Cada llamada ejecuta `UPDATE articulos SET vistas = vistas + 1` y devuelve el
valor ya incrementado.

Errores: `404 {"error":"No existe ningún artículo con ese slug"}` y, si el
artículo tiene `publicado = 0` y no envías token,
`404 {"error":"Ese artículo no está publicado"}`.

### 4.4 `GET /api/categorias`

```bash
curl http://localhost:3003/api/categorias
```

```json
{
  "items": [
    { "clave": "todos", "etiqueta": "Todas", "total": 8 },
    { "clave": "desarrollo", "etiqueta": "Desarrollo", "total": 2 },
    { "clave": "ia", "etiqueta": "Inteligencia Artificial", "total": 2 },
    { "clave": "seguridad", "etiqueta": "Seguridad", "total": 2 },
    { "clave": "movil", "etiqueta": "Móvil", "total": 1 },
    { "clave": "diseno", "etiqueta": "Diseño", "total": 1 }
  ],
  "total": 8
}
```

Errores: ninguno. Incluye categorías que estén en la BD pero no en
`CATEGORIAS` (aparecen con su propia clave como etiqueta).

### 4.5 `GET /api/destacado`

```bash
curl http://localhost:3003/api/destacado
```

Devuelve el mismo shape que 4.3 (con cuerpo) del artículo con
`destacado = 1 AND publicado = 1`.

Errores: `404 {"error":"No hay ningún artículo destacado"}`.

### 4.6 `POST /api/articulos` (admin)

```bash
curl -X POST http://localhost:3003/api/articulos \
  -H "Content-Type: application/json" \
  -H "x-admin-token: TU_TOKEN" \
  --data-binary "@nuevo.json"
```

`nuevo.json`:

```json
{
  "titulo": "Mi primer artículo en la bitácora",
  "extracto": "Un extracto breve pero con suficientes caracteres para validar.",
  "cuerpo_md": "## Hola\n\nEsto es **Markdown**.",
  "categoria": "desarrollo",
  "tags": ["node", "sqlite"],
  "autor": "Ana Serrano",
  "fecha": "2026-10-02",
  "minutos": 4
}
```

Respuesta **201**:

```json
{
  "ok": true,
  "id": 10,
  "slug": "mi-primer-articulo-en-la-bitacora",
  "articulo": { "id": 10, "slug": "mi-primer-articulo-en-la-bitacora", "publicado": 1, "vistas": 0 }
}
```

Errores:

| Código | Cuándo |
|---|---|
| 401 | `{"error":"Token de administración no válido (header x-admin-token)"}` (el token viaja **solo** en la cabecera `x-admin-token`; comparación en tiempo constante) |
| 400 | `{"error":"Revisa los datos del artículo","detalle":["El título debe tener al menos 5 caracteres."]}` |
| 409 | `{"error":"Ya existe un artículo con ese slug"}` |
| 413 | Cuerpo mayor de 1 MB |

Si `destacado: 1`, antes del INSERT ejecuta
`UPDATE articulos SET destacado = 0 WHERE destacado = 1`.

### 4.7 `PUT /api/articulos/:slug` (admin)

```bash
curl -X PUT http://localhost:3003/api/articulos/mi-primer-articulo-en-la-bitacora \
  -H "Content-Type: application/json" \
  -H "x-admin-token: TU_TOKEN" --data-binary "@edit.json"
# edit.json → { "minutos": 12, "publicado": 1 }
```

Respuesta 200: `{"ok": true, "slug": "mi-primer-articulo-en-la-bitacora", "articulo": {…}}`.

Errores: 401 (token), 404 (slug inexistente), 400 (validación de la fusión).
El `slug` solo cambia si envías `slug` a mano o si envías un `titulo` distinto
(luego pasa por `slugUnico()`, que añade `-2`, `-3`… si hace falta).

### 4.8 `DELETE /api/articulos/:slug` (admin)

```bash
curl -X DELETE http://localhost:3003/api/articulos/mi-primer-articulo-en-la-bitacora \
  -H "x-admin-token: TU_TOKEN"
```

Respuesta 200: `{"ok": true, "borrados": 1}`. Errores: 401, 404
`{"error":"No existe ningún artículo con ese slug"}`.

### 4.9 `POST /api/newsletter`

```bash
curl -X POST http://localhost:3003/api/newsletter \
  -H "Content-Type: application/json" --data-binary "@body.json"
# body.json → { "email": "ana@correo.com", "origen": "ancha" }
```

Respuesta **201**:

```json
{
  "ok": true,
  "id": 1,
  "origen": "ancha",
  "mensaje": "¡Suscripción registrada! Revisa tu bandeja para confirmar. 🎉",
  "correo": "demo",
  "detalleCorreo": "sin destino configurado (.env)"
}
```

(`correo` pasa a `"enviado"` cuando `NEWSLETTER_DESTINO` está definido **y**
hay `RESEND_API_KEY` o SMTP configurado.)

Errores: `400 {"error":"El correo no tiene un formato válido."}`,
`429 {"error":"Demasiadas suscripciones desde esta conexión. Inténtalo dentro de un minuto."}`
(5 por minuto e IP, `LIMITE_NEWSLETTER`). Si el correo ya existía responde
**200** con `{"ok":true,"ya_suscrito":true,"id":1,"mensaje":"¡Ese correo ya estaba suscrito!…"}`.

---

## 5. Cómo habla el front con la API

### 5.1 El cliente `api()`

`js/main.js:32-46` es el único punto de entrada (en `articulo.js` hay un
`fetch` directo equivalente):

```js
const API_BASE = ''; // '' = mismo dominio

function api(ruta, opciones) {
  return fetch(API_BASE + ruta, Object.assign({
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
  }, opciones || {})).then(function (respuesta) {
    return respuesta.json().catch(function () { return {}; }).then(function (cuerpo) {
      if (!respuesta.ok) {
        const fallo = new Error(cuerpo.error || ('Error HTTP ' + respuesta.status));
        fallo.datos = cuerpo;
        fallo.estado = respuesta.status;
        throw fallo;
      }
      return cuerpo;
    });
  });
}
```

### 5.2 Fallback al modo demo

La variable `conApi` es el semáforo (`null` sin saber · `true` hay servidor ·
`false` modo estático):

- `cargarDesdeApi()` (`main.js:693-725`) — si responde, `conApi = true` y
  pinta; si el servidor devuelve 4xx avisa por consola y **no toca el grid**; si
  el `fetch` falla, `conApi = false` y deja el HTML tal cual estaba.
- `peticionActual` descarta respuestas fuera de orden y `programarCarga()`
  aplica un *debounce* de **280 ms**.
- Newsletter (`main.js:459-519`), `cargarContadores()` y `enlazarDestacado()`
  siguen la misma idea: sin servidor, mensaje local de éxito.
- `articulo.js:181-221` distingue «No encontramos ese artículo» (4xx) de
  «No hay servidor conectado» (sin respuesta).

### 5.3 Funciones e ids que pintan cada bloque

| Bloque | Función / origen | Ids |
|---|---|---|
| Grid de artículos | `htmlTarjeta()` + `pintarArticulos()` | `#grid-articulos` |
| Contador y vacío | `pintarArticulos()` | `#contador-resultados`, `#sin-resultados` |
| Paginación real | `pintarPaginacion()`, `digitosVisibles()`, `crearBotonPagina()` | `nav.paginacion` |
| Contadores laterales | `cargarContadores()` (lee `ETIQUETAS_CATEGORIA`) | `#categorias .contador` |
| Destacado | `enlazarDestacado()` | `section.destacado .destacado__contenido .btn` |
| Filtros iniciales por URL | `leerFiltrosDeURL()` (`?categoria=&tag=&q=`) | `#chips-filtro`, `#nube-tags` |
| Newsletter | manejador de `form[data-newsletter]` | `#email-side`, `#email-ancha`, `.mensaje-form` |
| Artículo | `pintar()` en `js/articulo.js` | `#articulo-titulo`, `#articulo-cuerpo`… |

### 5.4 Validación y detalle de errores

- **Cliente**: `EMAIL_REGEX` en el newsletter, normalización de tildes en los
  filtros y `preventDefault` en `#form-buscar-nav` / `#form-buscar-side`.
- **Servidor**: la validación de verdad vive en `prepararArticulo()`
  (`api.js:112-187`); el front solo pinta lo que el servidor devuelve.
- **Detalle**: los errores llegan como `fallo.message` + `fallo.datos.detalle`
  (array) y se consumen en línea, p. ej. `main.js:496-499`. **No existe una
  función `detalleDeError()`** en 03-blog (ese helper es de 02-saas y
  07-restaurante): la receta para añadirla está en §6.5.
- Todo el HTML generado escapa con `esc()` (`main.js:562-569`).

---

## 6. Recetas de extensión con código real

### 6.1 Añadir un endpoint

En `server/api.js`, dentro de `module.exports = function registrar(api, { bd })`:

```js
// Bandeja de suscriptores (solo admin)
api.get('/api/suscriptores', (ctx) => {
  if (!esAdmin(ctx)) return ctx.fallo(401, 'Token no válido');
  ctx.json(
    bd.todos('SELECT id, email, origen, confirmado, creado_en FROM suscriptores ORDER BY id DESC')
  );
});
```

`esAdmin()`, `ctx.json` y `ctx.fallo` ya existen (`api.js:65-70`, `router.js:75-76`).
Prueba:

```bash
curl -H "x-admin-token: TU_TOKEN" http://localhost:3003/api/suscriptores
```

### 6.2 Añadir una columna o una tabla (migración segura)

⚠️ **Para añadirlo**: esta plantilla **no tiene sistema de migraciones**. El
esquema solo se aplica con `CREATE TABLE IF NOT EXISTS` al abrir la BD, así
que una columna nueva en `ESQUEMA` no entra en una BD ya creada. Patrón
seguro:

1. Para BDs **nuevas**: añade la columna en `ESQUEMA` de
   `server/datos/semillas.js` (secreta y se aplica sola).
2. Para una BD **existente**, para el servidor y aplica:

```sql
ALTER TABLE suscriptores ADD COLUMN nombre TEXT DEFAULT '';
```

3. Guárdalo en un fichero `.sql` versionado para repetirlo en el servidor de
   producción. Ojo: SQLite no permite `ALTER TABLE … ADD COLUMN NOT NULL` sin
   `DEFAULT`.
4. Tabla nueva: sigue el estilo del `ESQUEMA` (enteros 0/1, `TEXT` para
   fechas ISO) y añade su `INSERT` de ejemplo en `sembrar()` (comprobando
   antes `COUNT(*)`).

### 6.3 Añadir un campo al formulario de newsletter

1. **HTML** (`index.html`, en los dos formularios `form[data-newsletter]`):

```html
<div class="campo">
  <label class="sr-only" for="nombre-side">Tu nombre</label>
  <input type="text" id="nombre-side" class="campo-nombre" placeholder="Tu nombre">
</div>
```

2. **JS** (`js/main.js`, dentro del `submit`): léelo y envíalo en el cuerpo:

```js
const nombre = form.querySelector('.campo-nombre');
api('/api/newsletter', {
  method: 'POST',
  body: JSON.stringify({ email: valor, origen: origen, nombre: nombre ? nombre.value.trim() : '' })
})
```

3. **Servidor** (`server/api.js`, `POST /api/newsletter`): recógelo antes del
   INSERT y validalo.
4. **BD**: `ALTER TABLE suscriptores ADD COLUMN nombre TEXT DEFAULT '';`
   (§6.2) y añade `nombre` al `INSERT`.

### 6.4 Añadir una sección nueva a la portada

1. Inserta el bloque en `index.html` (sigue el patrón
   `<section class="… reveal" id="mi-seccion">` y su `h2` con
   `aria-labelledby`).
2. Si necesitas datos de la API, pinta en `js/main.js` con `api()` + `esc()`
   y envuelve en `try/catch`: **el JS es defensivo** (`getElementById` puede
   devolver `null` y las funciones lo comprueban), así que borrar una sección
   no rompe el resto.
3. Añade su enlace a `#menu-principal` y, si la sección es de categorías,
   su chip en `#chips-filtro`.
4. Estílala en `css/styles.css`; los colores salen del bloque
   «PALETA DE COLORES — EDITA AQUÍ».

### 6.5 Helper `detalleDeError()` (opcional)

Para no repetir código en cada `.catch`:

```js
function detalleDeError(fallo) {
  const d = fallo && fallo.datos && fallo.datos.detalle;
  if (Array.isArray(d)) return ' ' + d.join(' ');
  if (typeof d === 'string') return ' ' + d;
  return '';
}
// uso: mostrarMensaje('✗ ' + fallo.message + detalleDeError(fallo), false, input, mensaje);
```

### 6.6 Cambiar el orden del listado o el tamaño de página

- `ORDER BY fecha DESC, id DESC` está en `api.js:270-271`.
- El máximo duro de `por_pagina` es **50** (`api.js:259-262`); el valor por
  defecto sale de `POR_PAGINA` en `.env`.

---

## 7. Pruebas

### 7.1 Sintaxis sin arrancar nada

```powershell
node --check server/server.js
node --check server/api.js
node --check server/reset.js
node --check js/main.js
node --check js/articulo.js
```

### 7.2 Verificador del repositorio

Desde la raíz del repositorio (`../..`):

```powershell
powershell -ExecutionPolicy Bypass -File ..\..\verificar.ps1
```

Arranca esta plantilla con `PORT=3103` (puerto asignado a `03-blog` en el
array `$planes` de `verificar.ps1`), comprueba `GET /api/salud` → 200 y que
la web responde 200, y lo para. Requiere que los puertos 3101-3107 estén libres.

### 7.3 Pruebas manuales con `curl` y fichero temporal

```powershell
$dir = Join-Path $env:TEMP "pruebas-blog"
New-Item -ItemType Directory -Force $dir | Out-Null
$json = @'
{ "titulo": "Prueba automatizada", "extracto": "Extracto de prueba con suficientes caracteres.",
  "categoria": "ia", "tags": "prueba", "autor": "QA", "fecha": "2026-10-02", "minutos": 3 }
'@
[System.IO.File]::WriteAllText((Join-Path $dir 'alta.json'), $json)

curl.exe -X POST http://localhost:3003/api/articulos `
  -H "Content-Type: application/json" `
  -H "x-admin-token: demo-token-blog-7c1e5a93bd" `
  --data-binary "@$dir\alta.json"

# limpieza
Remove-Item -Recurse -Force $dir
```

(El valor `demo-token-blog-7c1e5a93bd` es el `ADMIN_TOKEN` de fábrica del
`.env`; en un servidor real, sustitúyelo por el tuyo.)

Comprobaciones rápidas:

```powershell
curl.exe http://localhost:3003/api/salud
curl.exe "http://localhost:3003/api/articulos?pagina=99"     # 200, recorta a la última
curl.exe "http://localhost:3003/api/articulos?categoria=mala" # 400
curl.exe -X DELETE http://localhost:3003/api/articulos/prueba-automatizada `
  -H "x-admin-token: TU_TOKEN"                               # 200 / 401 sin token
```

### 7.4 Dejar la BD limpia

```powershell
# 1) Para el servidor (Ctrl + C)
# 2) Vuelve al estado de fábrica: borra blog.db, blog.db-wal y blog.db-shm
npm run reiniciar
```

`reset.js` imprime `[reset] Base de datos recreada con los datos de ejemplo ✔`
y la ruta relativa (`server/data/blog.db`).

---

## 8. Seguridad y límites

### 8.1 Hecho por defecto

| Medida | Dónde |
|---|---|
| `.env`, `*.md`, `*.db`, `*.log` y la carpeta `server/` **nunca** se sirven (403) | `http.js:33`, `http.js:115-117` |
| Protección contra *path traversal* (`path.normalize` + comprobación de raíz) | `http.js:106-109` |
| Cabeceras: `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN` | `http.js:36-40` |
| Markdown escapado **antes** de formatear; enlaces solo `http/https` | `server/lib/markdown.js` (`escaparHTML`) |
| SQL siempre con parámetros posicionales `?` | `db.js`, `api.js` |
| Límite de tasa en el newsletter: 5/min por IP (429) | `api.js:203-206`, `limitador.js` |
| Cuerpo máximo **1 MB** (413) y JSON inválido → 400 | `http.js:62-87` |
| `Cache-Control: no-store` en JSON y `no-cache` en HTML | `http.js:49`, `http.js:137` |
| El token solo se acepta por cabecera `x-admin-token` y se compara en tiempo constante (`crypto.timingSafeEqual`, sin `===`) | `api.js:66-71`, `server/lib/token.js` |
| CORS **desactivado** por defecto (`CORS=0`) | `.env`, `router.js:50` |

### 8.2 Tú debes añadir

- **HTTPS** (obligatorio en producción) y `HOST=0.0.0.0` detrás de un proxy.
- Cambiar `ADMIN_TOKEN` por una clave larga y aleatoria.
- Un **panel de administración** con login real: hoy no hay usuarios ni
  sesiones; la única barrera es el token (`bcrypt`/`jsonwebtoken` son
  opcionales, ver README §9).
- Rate-limit persistente (Redis) si hay más de un proceso: el limitador actual
  es un `Map` **en memoria** (`limitador.js:15`).
- Validación de cualquier formulario nuevo **en el servidor**: la del navegador
  es solo comodidad.
- Revisión RGPD si guardas suscripciones reales (baja, conservación mínima).

---

## 9. Límites y decisiones conscientes

Cosas que **esta plantilla no hace** (y no son fallos, son decisiones):

| Límite | Detalle |
|---|---|
| Sin claves de correo → nada se envía | `RESEND_API_KEY` y `SMTP_*` están vacíos: `enviarCorreo()` devuelve `enviado:false` y la API responde `correo:"demo"` (hay que instalar `nodemailer` para SMTP) |
| No hay panel de administración | El CRUD se usa con `curl`; no hay HTML de gestión |
| No hay endpoint de listado de suscriptores | La tabla existe y se escribe, pero leerla requiere SQL (receta §6.1) |
| No hay usuarios ni comentarios | Cualquier registro de autores se haría desde cero |
| El contador de vistas no es analítica | Es un `+1` por petición, sin desduplicar por IP ni sesión |
| El destacado no aparece en el listado | `WHERE destacado = 0` es intencionado: evita duplicarlo |
| «Lo más leído» es HTML fijo | No lee `vistas` |
| La paginación en modo estático es visual | Sin servidor, los botones solo cambian el estado activo |
| Sin índice de búsqueda | La búsqueda es `LIKE` sobre 4 columnas; bien para cientos de filas, no para decenas de miles |
| Una sola petición puede devolver 50 artículos como máximo | Tope duro en `por_pagina` |

Sobre lo **no probado** en este entorno: no se ha ejecutado un envío real por
Resend ni por SMTP (faltan claves), ni se ha verificado el comportamiento del
rate-limit con varias IPs o detrás de un proxy, ni hay pruebas automatizadas
(unitarias o E2E) en el repositorio: la verificación disponible es
`verificar.ps1` (salud + web en el puerto 3103) más las pruebas manuales de §7.

---

## 10. Documentación relacionada

- [Guía de usuario](GUIA-USUARIO.md) — recorrido por la web y cambios sin programar.
- [README de la plantilla](../README.md) — arranque, variables, API resumida,
  personalización, despliegue y seguridad (§8, §10, §11).
- Índice global de endpoints: [`../../docs/API.md`](../../docs/API.md)
  *(pendiente de publicar)*.
- Personalización global: [`../../docs/PERSONALIZACION.md`](../../docs/PERSONALIZACION.md)
  *(pendiente de publicar)*.
- Despliegue global: [`../../docs/DESPLIEGUE.md`](../../docs/DESPLIEGUE.md)
  *(pendiente de publicar)*.
