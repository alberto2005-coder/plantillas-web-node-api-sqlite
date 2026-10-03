# 05 · Agencia creativa — plantilla con servidor, API, base de datos y formulario

Plantilla de **landing para agencia / estudio de diseño** (HTML5 + CSS3 +
JavaScript vanilla) que ya incluye **servidor Node, API REST y base de datos
SQLite**: el **formulario de presupuesto envía de verdad**, las solicitudes se
guardan y puedes leerlas con un token. Además, los proyectos, los servicios y
los contadores se pueden servir desde la base de datos.

> Funciona **sin instalar nada**: no hay dependencias obligatorias, solo módulos
> nativos de Node. `npm install` es opcional (solo para integraciones reales).
>
> 📚 **Documentación**: [Guía de usuario](docs/GUIA-USUARIO.md) · [Guía de desarrollador](docs/GUIA-DESARROLLADOR.md)
> Y **sigue funcionando en modo estático**: si abres `index.html` sin servidor,
> la web se ve igual y el formulario responde en «modo demo».

---

## 1. Qué necesita esta plantilla (y qué ya está hecho)

| Necesidad | Estado | Dónde |
|---|---|---|
| Servidor web (HTTP) | ✅ hecho | `server/server.js` |
| API REST | ✅ hecho | `server/api.js` |
| Base de datos | ✅ SQLite (`node:sqlite`) | `server/data/agencia.db` |
| **Formulario de presupuesto real** | ✅ **nuevo** · `POST /api/presupuesto` | `index.html` + `js/main.js` + `server/api.js` |
| Formulario de contacto (`mailto:`) | ✅ alternativa en el CTA | `index.html` → `#contacto` |
| Envío de correo | ⚪ opcional | `.env` → Resend o SMTP |
| Protección anti-spam | ✅ límite por IP | `server/lib/limitador.js` |
| Bandeja de solicitudes | ⚪ API con token | `GET /api/presupuestos` |
| Contenido editable por API | ✅ proyectos, servicios y cifras | `GET /api/proyectos`, `/api/servicios`, `/api/cifras` |
| Librerías externas | ⚪ ninguna obligatoria | ver §9 |
| HTTPS, dominio, despliegue | 📄 documentado | §8 |

> **Novedad respecto a la versión estática:** antes solo existía el enlace
> `mailto:hola@vertice.studio`. Ahora hay un **formulario completo** (nombre,
> correo, empresa, tipo de proyecto, tramo de presupuesto y mensaje) con
> validación en cliente y en servidor.

---

## 2. Arranque rápido

**Requisito: Node 22.13 o superior** ([nodejs.org](https://nodejs.org)). Compruébalo con `node -v`.

```bash
# Opción A — con servidor (recomendada): API + web en el mismo puerto
npm start
# → abre http://localhost:3105

# Opción B — sin servidor: doble clic en index.html
# (todo funciona en local; el formulario responde en "modo demo")

# Volver a la base de datos de ejemplo (borra las solicitudes guardadas)
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
| `PORT` | no (3105) | Puerto del servidor |
| `HOST` | no (127.0.0.1) | IP de escucha. Usa `0.0.0.0` en contenedores/servidor |
| `SITE_URL` | no | URL pública (se usa en correos y enlaces) |
| `DB_FILE` | no | Ruta del fichero SQLite (se crea solo) |
| `ADMIN_TOKEN` | sí para admin | Clave de la bandeja de solicitudes |
| `CONTACTO_DESTINO` | no (`hola@vertice.studio`) | Correo que recibe las solicitudes |
| `LIMITE_PRESUPUESTO` | no (5) | Envíos máximos por IP y minuto |
| `RESEND_API_KEY` | opcional | Activa el envío real vía [Resend](https://resend.com) |
| `EMAIL_DE` | opcional | Remitente visible (`Nombre <hola@x.com>`) |
| `SMTP_HOST` / `SMTP_PUERTO` / `SMTP_USUARIO` / `SMTP_CLAVE` | opcional | Envío por SMTP (requiere `npm install nodemailer`) |
| `CORS` / `CORS_ORIGEN` | no (`0`) | Para consumir la API desde otro dominio |
| `TRUST_PROXY` | no (`0`) | `1` solo detrás de un proxy inverso (Caddy/nginx/Cloudflare): el límite anti-spam usa la IP real del visitante, no la del proxy |
| `CSP` | no | Cabecera `Content-Security-Policy` que envía el servidor; `CSP=0` la desactiva y un valor propio la personaliza (analíticas, formularios externos…) |

Cambios en `.env`: **reinicia el servidor** (`Ctrl + C` y `npm start`).

---

## 4. API REST

Todas las respuestas son JSON. Las de escritura aceptan `Content-Type: application/json`.

| Método | Ruta | Body | Respuesta | Auth |
|---|---|---|---|---|
| GET | `/api/salud` | – | `{ok, servicio, version, node, uptime_s}` | no |
| GET | `/api/proyectos` | – | array con los 6 proyectos (datos del modal) | no |
| GET | `/api/proyectos/:clave` | – | un proyecto (`lumen`, `norte`, `fibra`, `mercado`, `aurea`, `orbita`) | no |
| GET | `/api/servicios` | – | los 4 servicios de `#servicios` | no |
| GET | `/api/cifras` | – | los 4 contadores de `#estudio` | no |
| POST | `/api/presupuesto` | `{nombre, email, empresa?, tipo, presupuesto?, mensaje}` | `{ok, id, referencia, correo}` (201) | no |
| GET | `/api/presupuestos` | – | últimas 200 solicitudes | `x-admin-token` |
| DELETE | `/api/presupuestos/:id` | – | `{ok, borrados}` | `x-admin-token` |

**Valores admitidos**: `tipo` → `web`, `landing`, `branding`, `app`, `seo`, `otro`.
`presupuesto` → `menos-3000`, `3000-8000`, `8000-20000`, `mas-20000` (opcional).

**Ejemplos con curl** (PowerShell: guarda el body en un fichero y usa
`--data-binary "@fichero.json"`; con `-d` directo PowerShell estropea las comillas):

```bash
curl http://localhost:3105/api/salud
curl http://localhost:3105/api/proyectos
curl http://localhost:3105/api/proyectos/lumen
curl http://localhost:3105/api/servicios
curl http://localhost:3105/api/cifras

# presupuesto.json → {"nombre":"Ana","email":"ana@correo.com","empresa":"Norte S.L.",
#                      "tipo":"web","presupuesto":"3000-8000",
#                      "mensaje":"Quiero una web nueva para mi tienda."}
curl -X POST http://localhost:3105/api/presupuesto \
  -H "Content-Type: application/json" \
  --data-binary "@presupuesto.json"

curl -H "x-admin-token: demo-token-agencia-3b7e91c5d2" http://localhost:3105/api/presupuestos
curl -X DELETE -H "x-admin-token: demo-token-agencia-3b7e91c5d2" http://localhost:3105/api/presupuestos/1
```

**Errores**: siempre `{ "error": "mensaje" }` con el código HTTP correspondiente.
En `POST /api/presupuesto`, el 400 además incluye `detalle` como objeto con el
campo culpable → `{ "error": "Revisa el formulario", "detalle": { "email": "…" } }`
(400 validación, 401 token, 404 no existe, 429 límite, 500 servidor).

---

## 5. Estructura

```
05-agencia/
├── index.html            ← contenido y estructura (en español)
│                             incluye el formulario #form-presupuesto en #contacto
├── css/styles.css        ← paleta, tipografías, componentes y estilos del formulario
├── js/main.js            ← tema, menú, contadores, modal, formulario y cliente API
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
    ├── datos/semillas.js ← esquema SQL + datos de ejemplo
    ├── data/             ← fichero SQLite (generado, no se sube a git)
    └── lib/
        ├── env.js        ← lector de .env
        ├── http.js       ← JSON, lectura de cuerpo, ficheros estáticos
        ├── router.js     ← enrutador REST
        ├── db.js         ← capa SQLite
        ├── email.js      ← Resend / SMTP (opcional)
        └── limitador.js  ← anti-spam por IP
```

---

## 6. Cómo personalizarla (tu web)

### 6.1 Cambiar textos, colores y tipografía
- **Textos e imágenes**: todo en `index.html`, con comentarios que marcan cada bloque.
- **Color principal**: `css/styles.css` → bloque `:root` → `--color-primary` (y `--color-primary-hover`). Solo con esos dos ya tienes toda la web recoloreada.
- **Acento / degradados**: `--color-accent`. **Errores y avisos**: `--color-error` y `--color-exito` (justo debajo, también en `[data-theme="dark"]`).
- **Tipografías**: se cargan de Google Fonts en el `<head>` del HTML; cambia el `<link>` y luego `--font-heading` / `--font-body` en el CSS.
- **Degradados de las tarjetas**: clases `.gradiente-1` … `.gradiente-6`.

### 6.2 Añadir o quitar un proyecto (HTML + BD + API)
Cada proyecto vive en **tres sitios**: la tarjeta del HTML, la fila de la BD y el objeto `PROYECTOS` de `js/main.js` (fallback sin servidor).

**Añadir:**
1. **HTML** — dentro de `.portfolio`, copia una tarjeta y ponle una clave nueva:
   ```html
   <article class="proyecto reveal" role="button" tabindex="0"
            data-proyecto="nuevo" aria-label="Abrir proyecto Nuevo">
     <div class="proyecto__visual gradiente-7"></div>
     <div class="proyecto__info">
       <span class="proyecto__categoria">Branding</span>
       <h3 class="proyecto__titulo">Nuevo Proyecto</h3>
     </div>
   </article>
   ```
2. **BD** — en `server/datos/semillas.js` añade una entrada a `PROYECTOS` con el mismo `clave` (`'nuevo'`), o insértala directamente:
   ```sql
   INSERT INTO proyectos (clave, titulo, categoria, gradiente, anio, cliente, servicios, descripcion, orden, activo)
   VALUES ('nuevo', 'Nuevo Proyecto', 'Branding', 'gradiente-7', '2026', 'Cliente', 'Identidad', 'Descripción…', 7, 1);
   ```
3. **JS** — añade la misma clave al objeto `PROYECTOS` de `js/main.js` (es el fallback cuando no hay servidor).
4. Reinicia (`npm start` de nuevo) o ejecuta `npm run reiniciar` si solo tocaste `semillas.js` con la BD ya creada.

El modal y las tarjetas se rellenan solos desde `GET /api/proyectos`.

**Quitar:** borra la tarjeta del HTML, la entrada de `PROYECTOS` (BD y JS) y, si quieres eliminarla ya guardada:
`DELETE FROM proyectos WHERE clave = 'fibra';` (o pon `activo = 0`: no se servirá por la API).

### 6.3 Servicios, contadores y premios
- **Servicios** (`#servicios`): 4 `<li class="servicio">` con `.servicio__numero`, `.servicio__titulo` y `.servicio__texto`. Están en la BD (tabla `servicios`) y se sirven por `GET /api/servicios`. Para añadir uno: HTML + fila en `SERVICIOS` (semillas) + `INSERT`.
- **Contadores** (`#estudio`): cambia `data-objetivo="248"` en el HTML. Vienen también de `GET /api/cifras` (tabla `cifras`, columna `valor`), que los pisa si hay servidor.
- **Premios** (`# Reconocimientos`): simples `<li class="premio">` con año, nombre y organización. No hay endpoint: se editan en el HTML.
- **Equipo**: `.miembro` con avatar, nombre y rol. También solo HTML.

### 6.4 Añadir un campo al formulario de presupuesto
Ejemplo: añadir **«Teléfono»**.
1. `index.html`, dentro de `#form-presupuesto` y de `.formulario-presupuesto__rejilla`:
   ```html
   <div class="campo">
     <label for="telefono">Teléfono <span class="campo__opcional">(opcional)</span></label>
     <input class="campo__control" type="tel" id="telefono" name="telefono" autocomplete="tel">
   </div>
   ```
2. `js/main.js` → recógelo en el `body` del `fetch`:
   `telefono: (document.getElementById('telefono') || { value: '' }).value.trim()`.
3. `server/datos/semillas.js` → `telefono TEXT NOT NULL DEFAULT ''` en la tabla `presupuestos`
   (y `npm run reiniciar`, o `ALTER TABLE presupuestos ADD COLUMN telefono TEXT DEFAULT '';`).
4. `server/api.js` → lee, valida y añade el `?` del `INSERT`:
   ```js
   const telefono = String(datos.telefono || '').trim();
   bd.ejecutar('INSERT INTO presupuestos (nombre, email, empresa, tipo, presupuesto, mensaje, telefono, ip, referencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
     nombre, email, empresa, tipo, presupuesto, mensaje, telefono, ip, referencia);
   ```

Si el campo es **obligatorio**, añade también su `if` en el objeto `campos` de `server/api.js` y una regla en `validarCampo()` de `js/main.js` (con su `#error-telefono`).

### 6.5 Añadir una API nueva
En `server/api.js`, dentro de `registrar(api, { bd })`:

```js
api.get('/api/premios', (ctx) => ctx.json(bd.todos('SELECT * FROM premios ORDER BY anio DESC')));

api.post('/api/premios', async (ctx) => {
  if (!esAdmin(ctx)) return ctx.fallo(401, 'Token no válido');
  const d = await ctx.cuerpo();
  if (!d.nombre) return ctx.fallo(400, 'Falta el nombre');
  const r = bd.ejecutar('INSERT INTO premios (nombre) VALUES (?)', d.nombre);
  ctx.json({ ok: true, id: Number(r.lastInsertRowid) }, 201);
});
```
Y en `server/datos/semillas.js` crea la tabla dentro de `ESQUEMA`. Prueba:
`curl -X POST http://localhost:3105/api/premios -H "Content-Type: application/json" -d '{"nombre":"Laus"}'`

### 6.6 Conectar el correo de verdad
- **Resend (más fácil)**: cuenta gratis → API key → en `.env`:
  `RESEND_API_KEY=re_xxx` y `EMAIL_DE="Estudio Vértice <hola@vertice.studio>"`. Verifica tu dominio en Resend.
- **SMTP (Gmail, Outlook, Mailgun)**: `npm install nodemailer` y en `.env`:
  `SMTP_HOST=smtp.gmail.com`, `SMTP_PUERTO=587`, `SMTP_USUARIO=...`, `SMTP_CLAVE=...` (contraseña de aplicación de Gmail).
- Sin nada configurado, la solicitud **se guarda igualmente** en la BD y la API responde `correo: "demo"`.
- El destino es `CONTACTO_DESTINO` (`.env`). Si lo vacías, se responde al propio solicitante.

### 6.7 Quitar secciones
Borra el bloque `<section>` correspondiente en `index.html` (por ejemplo `.premios` o el equipo). El JS es defensivo: si no encuentra un elemento no falla. Revisa también el menú (`nav.nav`) y el footer para quitar los enlaces correspondientes.

### 6.8 Conectar un CRM / Formspree en vez de la propia API
Si prefieres Formspree, Web3Forms o un Google Form, sustituye la llamada de `js/main.js` (sección 7):

```js
fetch('https://formspree.io/f/TU_ID', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(datos)
});
```

y borra `server/` si ya no lo necesitas. Para un CRM (HubSpot, Pipedrive, Brevo…), normalmente basta con apuntar el `fetch` a su endpoint y mapear los campos; si la API necesita un token, ponlo en el header **desde el servidor** (`server/api.js`), nunca en el navegador.

### 6.9 CMS headless (contenido sin tocar el HTML)
Para gestionar proyectos, servicios y cifras desde un panel:
1. Crea las colecciones en **Strapi**, **Sanity**, **Directus** o **Contentful**.
2. En `js/main.js` cambia `API_BASE` (o las rutas) por la URL del CMS y traduce la respuesta al mismo formato que espera el modal (`{ clave, titulo, categoria, gradiente, anio, cliente, servicios, descripcion }`).
3. El HTML y el CSS no cambian: la plantilla ya lee el contenido por clave.
4. Con Next.js/Nuxt/Astro en modo estatico, precompila el `index.html` y usa esta plantilla solo para el formulario.

### 6.10 Cambiar puerto o dominio
`.env` → `PORT=8080`. En un servidor público: `HOST=0.0.0.0` y pon un proxy inverso (Caddy/Nginx) con HTTPS delante. Recuerda actualizar `SITE_URL`.

---

## 7. Qué se guarda en la base de datos

| Tabla | Columnas | Quién la escribe |
|---|---|---|
| `proyectos` | id, clave, titulo, categoria, gradiente, anio, cliente, servicios, descripcion, url, orden, activo | semillas / tú |
| `servicios` | id, clave, numero, titulo, descripcion, orden, activo | semillas / tú |
| `cifras` | id, clave, valor, etiqueta | semillas / tú |
| `presupuestos` | id, nombre, email, empresa, tipo, presupuesto, mensaje, ip, referencia, creado_en | `POST /api/presupuesto` |

Consulta las solicitudes con el token (§4) o con cualquier cliente SQLite
(DB Browser for SQLite, VS Code con extensión, `sqlite3` CLI).

---

## 8. Despliegue

1. Sube la carpeta a tu servidor/VPS o a un servicio Node (Railway, Render, Fly.io…).
2. Variables de entorno en el panel: `PORT` (suele darlo la plataforma), `HOST=0.0.0.0`, `ADMIN_TOKEN` (uno largo), `SITE_URL=https://tudominio.com`, `CONTACTO_DESTINO=…`, `RESEND_API_KEY`…
3. Comando de arranque: `node server/server.js` (el `PORT` llega del entorno).
4. La BD SQLite se crea sola; para que sobreviva a despliegues, monta un **volumen** en `server/data/` o cambia `DB_FILE` a una ruta persistente.
5. Activa HTTPS (la plataforma o Caddy/Let's Encrypt) y no expongas `ADMIN_TOKEN` en el navegador.
6. Si sirves la web desde otro origen que el API, activa `CORS=1` y `CORS_ORIGEN=https://tudominio.com`.

---

## 9. Librerías opcionales (si quieres ir más allá)

| Librería | Para qué | Cuándo |
|---|---|---|
| `nodemailer` | enviar correos por SMTP | si activas `SMTP_HOST` |
| `express` | servidor web más amplio | si la API crece mucho |
| `better-sqlite3` | SQLite alternativa a `node:sqlite` | si usas Node < 22.13 |
| `zod` / `joi` | validación de datos declarativa | muchos endpoints |
| `resend` | SDK oficial de Resend | si prefieres SDK a la API REST |
| `bcrypt` + `jsonwebtoken` | usuarios y login reales | si añades área privada |
| `marked` + `dompurify` | Markdown → HTML seguro | si publicas artículos |
| `nodemon` | reinicio automático | ya cubierto con `npm run dev` |

---

## 10. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `No se pudo cargar "node:sqlite"` | Instala Node ≥ 22.13 y comprueba con `node -v` |
| `EADDRINUSE: port 3105` | Cambia `PORT` en `.env` o cierra el proceso anterior |
| El formulario dice "modo demo" | No hay servidor: ejecuta `npm start` y abre `http://localhost:3105` |
| `429 Demasiadas solicitudes` | Espera un minuto o sube `LIMITE_PRESUPUESTO` en `.env` |
| `401 Token no válido` | Usa el `ADMIN_TOKEN` del `.env` en el header `x-admin-token` |
| `400 Revisa el formulario` | Mira `detalle`: es un objeto con el campo y su mensaje |
| Los cambios del `.env` no hacen efecto | Reinicia el servidor |
| Cambié `semillas.js` y no veo los datos | La BD ya no está vacía: `npm run reiniciar` (borra `presupuestos`) |
| El navegador cachea CSS/JS antiguos | Ctrl + F5 (el servidor manda `no-cache` en HTML) |

---

## 11. Seguridad (antes de publicar)

- Cambia `ADMIN_TOKEN` por una clave larga y aleatoria.
- Mantén `.env` fuera de git (ya está en `.gitignore`).
- El servidor **nunca** sirve `.env`, `*.md`, `*.db` ni la carpeta `server/` (devuelve 403).
- Añade HTTPS (obligatorio para cookies/autenticación en producción).
- El límite por IP es en memoria: para múltiples servidores usa Redis o el límite de tu proxy.
- La validación se hace **también en el servidor**: nunca confíes solo en el `required` del HTML.
- Si expones la API a terceros, añade CSRF/origen permitido y sanea longitudes de texto.

---

## 12. Licencia y personalización

Libre para usar en tus proyectos. Cambia textos, colores, tablas y endpoints a
tu gusto: la estructura está pensada para copiar la carpeta y hacerla tuya.

La licencia completa está en [`../LICENSE`](../LICENSE) (MIT — Copyright (c) 2026 Alberto Ortiz).
