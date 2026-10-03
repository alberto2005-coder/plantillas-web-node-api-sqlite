# 03 · Blog "Bitácora Digital" — plantilla con servidor, API y base de datos

Plantilla de **blog / magazine de tecnología** (HTML5 + CSS3 + JavaScript vanilla)
que ya incluye **servidor Node, API REST y base de datos SQLite**: el listado de
artículos se pagina de verdad, los contadores de categorías se recalculan, hay
página de detalle (`articulo.html?slug=…`) y el newsletter guarda suscripciones.

> Funciona **sin instalar nada**: no hay dependencias obligatorias, solo módulos
> nativos de Node. `npm install` es opcional (solo para integraciones reales).
>
> 📚 **Documentación**: [Guía de usuario](docs/GUIA-USUARIO.md) · [Guía de desarrollador](docs/GUIA-DESARROLLADOR.md)
> Si abres `index.html` directamente, la web se ve **exactamente igual** que
> siempre (modo estático): los artículos salen del HTML y nada se rompe.

---

## 1. Qué necesita esta plantilla (y qué ya está hecho)

| Necesidad | Estado | Dónde |
|---|---|---|
| Servidor web (HTTP) | ✅ hecho | `server/server.js` |
| API REST | ✅ hecho | `server/api.js` |
| Base de datos | ✅ SQLite (`node:sqlite`) | `server/data/blog.db` |
| Listado paginado de verdad | ✅ `GET /api/articulos` | `server/api.js` + `js/main.js` |
| Página de detalle de artículo | ✅ `articulo.html?slug=` | `js/articulo.js` |
| Artículos (CRUD) con token | ✅ `POST/PUT/DELETE /api/articulos` | `server/api.js` |
| Newsletter real | ✅ `POST /api/newsletter` | `server/api.js` + `js/main.js` |
| Buscador sin tildes | ✅ `LOWER(REPLACE(…))` | `server/api.js` |
| Markdown → HTML seguro | ✅ sin dependencias | `server/lib/markdown.js` |
| Protección anti-spam | ✅ límite por IP | `server/lib/limitador.js` |
| Envío de correo | ⚪ opcional | `.env` → Resend o SMTP |
| Librerías externas | ⚪ ninguna obligatoria | ver §9 |
| HTTPS, dominio, despliegue | 📄 documentado | §8 |

---

## 2. Arranque rápido

**Requisito: Node 22.13 o superior** ([nodejs.org](https://nodejs.org)). Compruébalo con `node -v`.

```bash
# Opción A — con servidor (recomendada): API + web en el mismo puerto
npm start
# → abre http://localhost:3003

# Opción B — sin servidor: doble clic en index.html
# (los artículos salen del HTML, el newsletter responde en "modo demo")

# Ver un artículo concreto (siempre con servidor)
# http://localhost:3003/articulo.html?slug=css-grid-en-produccion-10-patrones

# Volver a la base de datos de ejemplo (borra artículos y suscripciones creados)
npm run reiniciar

# Recarga automática al guardar cambios
npm run dev
```

Si **no quieres usar npm**, también puedes: `node server/server.js`.

---

## 3. Variables de entorno (`.env`)

Copia `.env.example` → `.env` y rellena. Ya te dejo un `.env` de demo listo.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | no (3003) | Puerto del servidor |
| `HOST` | no (127.0.0.1) | IP de escucha. Usa `0.0.0.0` en contenedores/servidor |
| `SITE_URL` | no | URL pública (se usa en correos, enlaces y en el feed `/feed.xml`) |
| `DB_FILE` | no | Ruta del fichero SQLite (se crea solo) |
| `ADMIN_TOKEN` | sí para admin | Clave para crear/editar/borrar artículos |
| `TRUST_PROXY` | no (`0`) | `1` solo detrás de un proxy inverso (Caddy/nginx/Cloudflare): el límite anti-spam usa la IP real del `X-Forwarded-For` |
| `CSP` | no | Cabecera `Content-Security-Policy` que envía el servidor; `0` la apaga y un valor personalizado la cambia |
| `POR_PAGINA` | no (3) | Artículos por página del listado |
| `LIMITE_NEWSLETTER` | no (5) | Suscripciones máximas por IP y minuto |
| `NEWSLETTER_DESTINO` | no | Correo que recibe el aviso de cada nueva suscripción |
| `CONTACTO_DESTINO` | no | Correo de respaldo (si `NEWSLETTER_DESTINO` está vacío) |
| `RESEND_API_KEY` | opcional | Activa el envío real vía [Resend](https://resend.com) |
| `EMAIL_DE` | opcional | Remitente visible (`Nombre <hola@x.com>`) |
| `SMTP_HOST` / `SMTP_PUERTO` / `SMTP_USUARIO` / `SMTP_CLAVE` | opcional | Envío por SMTP (requiere `npm install nodemailer`) |
| `CORS` / `CORS_ORIGEN` | no (`0`) | Para consumir la API desde otro dominio |

Cambios en `.env`: **reinicia el servidor** (`Ctrl + C` y `npm start`).

---

## 4. API REST

Todas las respuestas son JSON. Las de escritura aceptan `Content-Type: application/json`
y necesitan el header `x-admin-token`.

| Método | Ruta | Query / Body | Respuesta | Auth |
|---|---|---|---|---|
| GET | `/api/salud` | – | `{ok, version, node, uptime_s}` | no |
| GET | `/api/articulos` | `?categoria=&q=&tag=&pagina=&por_pagina=` | `{items, total, pagina, paginas, por_pagina}` | no |
| GET | `/api/articulos/:slug` | – | artículo completo con `cuerpo_html` (+1 vista) | no |
| GET | `/api/categorias` | – | `{items:[{clave, etiqueta, total}], total}` | no |
| GET | `/api/destacado` | – | el artículo con `destacado = 1` | no |
| POST | `/api/articulos` | `{titulo, extracto, cuerpo_md, categoria, tags, autor, fecha, minutos, …}` | `{ok, id, slug}` (201) | `x-admin-token` |
| PUT | `/api/articulos/:slug` | campos a modificar (fusión parcial) | `{ok, slug, articulo}` | `x-admin-token` |
| DELETE | `/api/articulos/:slug` | – | `{ok, borrados}` | `x-admin-token` |
| POST | `/api/newsletter` | `{email, origen}` (`lateral`\|`ancha`) | `{ok, mensaje, correo}` (201) | no |
| GET | `/feed.xml` (fuera de `/api/`) | – | RSS 2.0 con los 20 últimos artículos publicados | no |

Notas:

- **Feed RSS**: `/feed.xml` no es JSON sino XML (`application/rss+xml`), con los
  20 últimos artículos publicados. Los enlaces salen de `SITE_URL`, así que en
  local apuntan a `localhost` y en producción a tu dominio. La cabecera de
  `index.html` y `articulo.html` incluye
  `<link rel="alternate" type="application/rss+xml" href="/feed.xml">`, por lo
  que los lectores de RSS lo detectan solos. Prueba:
  `curl http://localhost:3003/feed.xml`.
- **Paginación real**: `por_pagina` por defecto = `POR_PAGINA` (3). `pagina` se recorta al rango válido.
- **Búsqueda sin tildes**: `?q=movil` encuentra "móvil", `?q=IA` encuentra "IA".
- **El destacado no se duplica**: `GET /api/articulos` excluye `destacado = 1` (ya se
  muestra en la portada y se sirve con `GET /api/destacado`). Por eso el contador
  de la web y los de categorías suman 8, igual que el HTML.
- **Errores**: siempre `{ "error": "mensaje" }` con su código
  (400 validación, 401 token, 404 no existe, 409 slug repetido, 429 límite, 500 servidor).

**Ejemplos con curl** (PowerShell: guarda el body en un fichero y usa
`--data-binary "@fichero.json"`; el `-d` con comillas sueltas se rompe):

```bash
# Estado del servidor
curl http://localhost:3003/api/salud

# Listado: 1ª página, y página 2
curl "http://localhost:3003/api/articulos"
curl "http://localhost:3003/api/articulos?pagina=2&por_pagina=3"

# Filtros
curl "http://localhost:3003/api/articulos?categoria=ia"
curl "http://localhost:3003/api/articulos?q=passkeys"
curl "http://localhost:3003/api/articulos?tag=javascript"

# Artículo completo (con cuerpo en HTML y contador de vistas)
curl "http://localhost:3003/api/articulos/css-grid-en-produccion-10-patrones"

# Categorías con contadores recalculados y el destacado de portada
curl "http://localhost:3003/api/categorias"
curl "http://localhost:3003/api/destacado"

# Feed RSS (XML, 20 últimos artículos; los enlaces dependen de SITE_URL)
curl "http://localhost:3003/feed.xml"

# Newsletter (alta de suscriptor)
echo {"email":"ana@correo.com","origen":"ancha"} > body.json
curl -X POST http://localhost:3003/api/newsletter -H "Content-Type: application/json" --data-binary "@body.json"

# Crear un artículo (token en la cabecera)
echo {"titulo":"Mi artículo nuevo","extracto":"Un extracto de ejemplo con suficientes caracteres.","categoria":"desarrollo","tags":["node","sqlite"],"autor":"Ana Serrano","fecha":"2026-10-01","minutos":4} > nuevo.json
curl -X POST http://localhost:3003/api/articulos -H "Content-Type: application/json" -H "x-admin-token: demo-token-blog-7c1e5a93bd" --data-binary "@nuevo.json"

# Editar y borrar
echo {"minutos":6,"publicado":1} > edit.json
curl -X PUT http://localhost:3003/api/articulos/mi-articulo-nuevo -H "Content-Type: application/json" -H "x-admin-token: demo-token-blog-7c1e5a93bd" --data-binary "@edit.json"
curl -X DELETE http://localhost:3003/api/articulos/mi-articulo-nuevo -H "x-admin-token: demo-token-blog-7c1e5a93bd"
```

---

## 5. Estructura

```
03-blog/
├── index.html            ← portada: destacado, grid de 8 artículos, sidebar
├── articulo.html         ← página de detalle (?slug=…, lee la API)
├── css/styles.css        ← paleta, temas, componentes y estilos del artículo
├── js/main.js            ← tema, menú, filtros, paginación, newsletter y cliente API
├── js/articulo.js        ← carga y pinta un artículo desde GET /api/articulos/:slug
├── .env                  ← configuración local (no se sube a git)
├── .env.example          ← plantilla comentada de variables
├── package.json          ← scripts npm
├── README.md             ← este documento
├── docs/
│   ├── GUIA-USUARIO.md   ← guía de uso sin código
│   └── GUIA-DESARROLLADOR.md ← guía técnica y arquitectura
└── server/
    ├── server.js         ← arranque: .env → BD → API → estáticos
    ├── api.js            ← rutas de la API (aquí se añaden endpoints)
    ├── reset.js          ← `npm run reiniciar`
    ├── datos/semillas.js ← esquema SQL + los 9 artículos de ejemplo
    ├── data/             ← fichero SQLite (generado, no se sube a git)
    └── lib/
        ├── env.js        ← lector de .env
        ├── http.js       ← JSON, lectura de cuerpo, ficheros estáticos
        ├── router.js     ← enrutador REST
        ├── db.js         ← capa SQLite
        ├── markdown.js   ← Markdown → HTML seguro (y a texto plano)
        ├── email.js      ← Resend / SMTP (opcional)
        └── limitador.js  ← anti-spam por IP
```

---

## 6. Cómo personalizarla (tu web)

### 6.1 Cambiar textos, colores y tipografía
- **Textos e imágenes**: todo en `index.html` (y en `articulo.html` para la página de detalle).
- **Color principal**: `css/styles.css` → bloque `:root` → `--color-primary`
  (y su variante en `[data-theme="dark"]`).
- **Tipografías**: se cargan de Google Fonts en el `<head>` del HTML; cambia el `<link>`
  y luego `--font-heading` / `--font-body` en el CSS.
- **Gradientes de las tarjetas**: clases `.gradiente-1` … `.gradiente-7` (columna `gradiente` en la BD).

### 6.2 Añadir un artículo nuevo (tres formas)

1. **Solo HTML (modo estático)**: copia un bloque `<article class="tarjeta">` dentro de
   `#grid-articulos` en `index.html` y ponle `data-categoria`, `data-tags`,
   `data-titulo` (minúsculas y sin tildes) y el extracto. Actualiza el contador
   de `#categorias` si te importa el número visible sin servidor.
2. **Desde la API (recomendada)**: crea el artículo con `POST /api/articulos`
   (ejemplo en §4). El servidor genera el `slug` desde el título, lo guarda en
   SQLite y aparece en la web al recargar. Si además lo enlazas en el HTML,
   tendrás contenido estático de reserva.
3. **Semillas (fijo para todos los que copien la plantilla)**: añade un objeto al
   array `ARTICULOS` de `server/datos/semillas.js` y ejecuta `npm run reiniciar`
   (⚠️ borra lo que hayas creado con la API).

El `cuerpo_md` es Markdown: encabezados `#`, `**negrita**`, `*cursiva*`,
listas `-`, numeradas, citas `>`, bloques ` ``` ` y enlaces `[texto](https://…)`
(solo http/https). `server/lib/markdown.js` lo convierte a HTML **escapando antes
cualquier `<script>`**, así que puedes confiar en el resultado.

### 6.3 Editar o borrar artículos con curl

```bash
# Cambiar los minutos de lectura
echo {"minutos":12} > e.json
curl -X PUT http://localhost:3003/api/articulos/passkeys-en-la-practica -H "Content-Type: application/json" -H "x-admin-token: TU_TOKEN" --data-binary "@e.json"

# Despublicar (no aparece en el listado ni en categorías)
echo {"publicado":0} > e.json
curl -X PUT http://localhost:3003/api/articulos/passkeys-en-la-practica -H "Content-Type: application/json" -H "x-admin-token: TU_TOKEN" --data-binary "@e.json"

# Borrar
curl -X DELETE http://localhost:3003/api/articulos/passkeys-en-la-practica -H "x-admin-token: TU_TOKEN"
```

El `PUT` hace **fusión**: solo cambia lo que envíes. Si cambias el `titulo`, el
`slug` se recalcula (y se actualiza el enlace). Si marcas `destacado: 1`, el
artículo anterior deja de ser destacado (solo hay uno).

### 6.4 Cambiar cuántos artículos hay por página
- Variable `.env` → `POR_PAGINA=6` (por defecto 3), o por petición:
  `GET /api/articulos?por_pagina=6`.
- La paginación se reconstruye sola con el número real de páginas
  (`pintarPaginacion()` en `js/main.js`). Sin servidor, los botones mantienen
  el comportamiento visual de siempre.

### 6.5 Añadir una categoría nueva (HTML + BD + chip)
1. `index.html`: nuevo chip `<button class="chip" data-categoria="video">Vídeo</button>`,
   nuevo item en `#categorias` (`<button class="item-categoria" data-categoria="video"><span>Vídeo</span><span class="contador">0</span></button>`)
   y, si quieres, una `.pill--video` en `css/styles.css`.
2. `server/datos/semillas.js`: añade `video: 'Vídeo'` al objeto `CATEGORIAS`
   (alimenta las validaciones del API y las etiquetas legibles).
3. Etiqueta de la tarjeta: la API devuelve `categoria_etiqueta`; en `js/main.js`
   actualiza `ETIQUETAS_CATEGORIA` (y `ICONOS_CATEGORIA` si quieres su icono)
   para que el modo estático también la pinte bien.

### 6.6 Quitar secciones
Borra el bloque correspondiente en `index.html` (por ejemplo el destacado
`section.destacado`, el widget "Lo más leído" o el newsletter ancha). El JS es
defensivo: si no encuentra un elemento (`document.getElementById(...)`) no falla.
Aprovecha para quitar también el enlace del menú (`#menu-principal`) y, si borras
todo el sidebar, revisa `layout-blog` en el CSS.

### 6.7 Cambiar a un CMS real (Headless WordPress, Sanity, Strapi…)
Sustituye la llamada de `js/main.js` (`cargarDesdeApi()`) por la de tu CMS:

```js
// Ejemplo: WordPress Headless (plugin WPGraphQL o /wp-json/wp/v2)
fetch('https://mi-blog.com/wp-json/wp/v2/posts?per_page=3&_embed')
  .then(r => r.json())
  .then(posts => pintarArticulos({
    items: posts.map(p => ({
      slug: p.slug, titulo: p.title.rendered, extracto: p.excerpt.rendered,
      fecha: p.date.slice(0, 10), minutos: 5, categoria: 'desarrollo', gradiente: 1
    })),
    total: posts.length, pagina: 1, paginas: 1
  }));
```

Mismo criterio para Sanity (`client.fetch`) o Strapi (`/api/articulos`). Cuando el
CMS mande, puedes borrar `server/` y `.env` (o dejar la API para el newsletter).

### 6.8 Conectar el newsletter de verdad
- **Solo guardar en la BD (ya funciona)**: `POST /api/newsletter` escribe en
  `suscriptores`. Consulta con cualquier cliente SQLite o añade un
  `GET /api/suscriptores` (ver 6.9).
- **Aviso por correo a ti**: configura `NEWSLETTER_DESTINO` + (`RESEND_API_KEY`
  o SMTP). Se envía un aviso con cada alta.
- **Mailchimp / Buttondown / Resend**: en `js/main.js`, dentro del `submit` del
  newsletter, cambia la llamada:
  ```js
  fetch('https://usX.list-manage.com/subscribe/post?u=…&id=…', {
    method: 'POST', mode: 'no-cors',
    body: new FormData(form)
  });
  ```
  o llama a su API con `api('/tu-endpoint')`. El resto (validación, mensaje de
  éxito) se queda igual.
- **Doble opt-in**: la tabla ya tiene `confirmado` (0/1); envía el correo de
  confirmación y actualiza con `UPDATE suscriptores SET confirmado = 1 WHERE email = ?`.

### 6.9 Añadir una API nueva
En `server/api.js`, dentro de `registrar(api, { bd })`:

```js
// Bandeja de suscriptores (solo admin)
api.get('/api/suscriptores', (ctx) => {
  if (!esAdmin(ctx)) return ctx.fallo(401, 'Token no válido');
  ctx.json(bd.todos('SELECT id, email, origen, confirmado, creado_en FROM suscriptores ORDER BY id DESC'));
});
```
Y la prueba:
`curl -H "x-admin-token: TU_TOKEN" http://localhost:3003/api/suscriptores`

---

## 7. Qué se guarda en la base de datos

| Tabla | Columnas | Quién la escribe |
|---|---|---|
| `articulos` | id, slug (UNIQUE), titulo, extracto, cuerpo_md, categoria, tags (CSV), autor, avatar_iniciales, fecha, minutos, destacado, gradiente, publicado, vistas | semillas / `POST·PUT /api/articulos` |
| `suscriptores` | id, email (UNIQUE), origen (`lateral`\|`ancha`), confirmado, creado_en | `POST /api/newsletter` |

Consulta los datos con `GET /api/categorias` (contadores), con el token del API
o con cualquier cliente SQLite (DB Browser for SQLite, VS Code con extensión,
`sqlite3` CLI).

---

## 8. Despliegue

1. Sube la carpeta a tu servidor/VPS o a un servicio Node (Railway, Render, Fly.io…).
2. Variables de entorno en el panel: `PORT` (suele darlo la plataforma),
   `HOST=0.0.0.0`, `ADMIN_TOKEN` (uno largo), `POR_PAGINA`, `SITE_URL=https://tudominio.com`,
   `NEWSLETTER_DESTINO` y, si envías correos, `RESEND_API_KEY`.
3. Comando de arranque: `node server/server.js` (el `PORT` llega del entorno).
4. La BD SQLite se crea sola; para que sobreviva a despliegues, monta un
   **volumen** en `server/data/` o cambia `DB_FILE` a una ruta persistente.
5. Activa HTTPS (la plataforma o Caddy/Let's Encrypt) y no expongas `ADMIN_TOKEN`
   en el navegador.
6. Detrás de un CDN/proxy (Cloudflare, Nginx) sirve también los estáticos:
   `index.html`, `articulo.html`, `css/` y `js/`, y deja `/api/` en Node.

---

## 9. Librerías opcionales (si quieres ir más allá)

| Librería | Para qué | Cuándo |
|---|---|---|
| `marked` + `dompurify` | Markdown → HTML con más funciones (y sanitizado) | si crece el Markdown de los artículos (hoy ya tienes `server/lib/markdown.js`) |
| `express` | servidor web más amplio | si la API crece mucho |
| `nodemailer` | enviar correos por SMTP | si activas `SMTP_HOST` |
| `better-sqlite3` | SQLite alternativa a `node:sqlite` | si usas Node < 22.13 |
| `bcrypt` + `jsonwebtoken` | usuarios y login reales | si añades área privada / editores |
| `zod` / `joi` | validación de datos declarativa | muchos endpoints |
| `nodemon` | reinicio automático | ya cubierto con `npm run dev` |

Recuerda: ninguna es obligatoria; sin ellas la plantilla funciona entera.

---

## 10. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `No se pudo cargar "node:sqlite"` | Instala Node ≥ 22.13 y comprueba con `node -v` |
| `EADDRINUSE: port 3003` | Cambia `PORT` en `.env` o cierra el proceso anterior |
| La web se ve sin artículos de la API / sale "modo estático" en consola | No hay servidor: ejecuta `npm start` y abre `http://localhost:3003` |
| `articulo.html` dice "No hay servidor conectado" | Esa página necesita la API; arranca el servidor |
| "No encontramos ese artículo" | Revisa el `slug` (minúsculas y sin tildes) o el `publicado` |
| `401 Token no válido` | Usa el `ADMIN_TOKEN` del `.env` en el header `x-admin-token` |
| `409 Ya existe un artículo con ese slug` | Cambia el título/slug o borra el anterior |
| `429 Demasiadas suscripciones` | Espera un minuto o sube `LIMITE_NEWSLETTER` en `.env` |
| El newsletter dice "modo demo" | No hay servidor, o no hay correo configurado: revisa §3 |
| Un `PUT` no cambia el `slug` | Solo cambia si envías `slug` o si envías `titulo` nuevo |
| Los cambios del `.env` no hacen efecto | Reinicia el servidor |
| El navegador cachea CSS/JS antiguos | Ctrl + F5 (el servidor manda `no-cache` en HTML) |

---

## 11. Seguridad (antes de publicar)

- Cambia `ADMIN_TOKEN` por una clave larga y aleatoria (es la llave del CRUD de artículos).
- Mantén `.env` fuera de git (ya está en `.gitignore`).
- El servidor **nunca** sirve `.env`, `*.md`, `*.db` ni la carpeta `server/` (devuelve 403).
- El Markdown se **escapa antes** de formatear: un `<script>` en un artículo se
  ve como texto. Los enlaces solo admiten `http://` y `https://`.
- Añade HTTPS (obligatorio para cookies/autenticación en producción).
- El límite por IP es en memoria: para múltiples servidores usa Redis o el límite de tu proxy.
- Si publicas comentarios o más formularios, añade validación en el servidor:
  **nunca confíes solo en el JavaScript del navegador**.

---

## 12. Licencia y personalización

Libre para usar en tus proyectos. Cambia textos, colores, artículos, tablas y
endpoints a tu gusto: la estructura está pensada para copiar la carpeta y hacerla
tuya. Si te atascas, mira `server/api.js` (todas las rutas están comentadas) y
`js/main.js` (sección 9, "API: listado paginado").

La licencia completa está en [`../LICENSE`](../LICENSE) (MIT — Copyright (c) 2026 Alberto Ortiz).
