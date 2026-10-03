# 01 · Portfolio personal — plantilla con servidor, API y base de datos

Plantilla de **portafolio personal** (HTML5 + CSS3 + JavaScript vanilla) que ya
incluye **servidor Node, API REST y base de datos SQLite**: el formulario de
contacto envía de verdad, los mensajes se guardan y puedes leerlos con un token.

> Funciona **sin instalar nada**: no hay dependencias obligatorias, solo módulos
> nativos de Node. `npm install` es opcional (solo para integraciones reales).
>
> 📚 **Documentación**: [Guía de usuario](docs/GUIA-USUARIO.md) · [Guía de desarrollador](docs/GUIA-DESARROLLADOR.md)

---

## 1. Qué necesita esta plantilla (y qué ya está hecho)

| Necesidad | Estado | Dónde |
|---|---|---|
| Servidor web (HTTP) | ✅ hecho | `server/server.js` |
| API REST | ✅ hecho | `server/api.js` |
| Base de datos | ✅ SQLite (`node:sqlite`) | `server/data/portfolio.db` |
| Formulario de contacto real | ✅ `POST /api/contacto` | `server/api.js` + `js/main.js` |
| Envío de correo | ⚪ opcional | `.env` → Resend o SMTP |
| Protección anti-spam | ✅ límite por IP | `server/lib/limitador.js` |
| Panel de administración | ⚪ API con token | `GET /api/mensajes` |
| Librerías externas | ⚪ ninguna obligatoria | ver §9 |
| HTTPS, dominio, despliegue | 📄 documentado | §8 |

---

## 2. Arranque rápido

**Requisito: Node 22.13 o superior** ([nodejs.org](https://nodejs.org)). Compruébalo con `node -v`.

```bash
# Opción A — con servidor (recomendada): API + web en el mismo puerto
npm start
# → abre http://localhost:3000

# Opción B — sin servidor: doble clic en index.html
# (todo funciona en local; el formulario responde en "modo demo")

# Volver a la base de datos de ejemplo (borra los mensajes guardados)
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
| `PORT` | no (3000) | Puerto del servidor |
| `HOST` | no (127.0.0.1) | IP de escucha. Usa `0.0.0.0` en contenedores/servidor |
| `SITE_URL` | no | URL pública (se usa en correos y enlaces) |
| `DB_FILE` | no | Ruta del fichero SQLite (se crea solo) |
| `ADMIN_TOKEN` | sí para admin | Clave de la bandeja de mensajes |
| `CONTACTO_DESTINO` | no | Correo que recibe los mensajes |
| `LIMITE_CONTACTO` | no (5) | Envíos máximos por IP y minuto |
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
| GET | `/api/salud` | – | `{ok, version, node, uptime_s}` | no |
| GET | `/api/proyectos` | – | array de proyectos | no |
| GET | `/api/proyectos/:id` | – | un proyecto | no |
| POST | `/api/contacto` | `{nombre, email, mensaje}` | `{ok, id, correo}` (201) | no |
| GET | `/api/mensajes` | – | últimos 200 mensajes | `x-admin-token` |
| DELETE | `/api/mensajes/:id` | – | `{ok, borrados}` | `x-admin-token` |

**Ejemplos con curl** (PowerShell: guarda el body en un fichero y usa `--data-binary "@fichero.json"`):

```bash
curl http://localhost:3000/api/proyectos

curl -X POST http://localhost:3000/api/contacto \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","email":"ana@correo.com","mensaje":"Quiero un presupuesto de mi web."}'

curl -H "x-admin-token: demo-token-portfolio-9f4c2b7e1a" http://localhost:3000/api/mensajes
```

**Errores**: siempre `{ "error": "mensaje" }` con el código HTTP correspondiente
(400 validación, 401 token, 404 no existe, 429 límite, 500 servidor).

---

## 5. Estructura

```
01-portfolio/
├── index.html            ← contenido y estructura (en español)
├── css/styles.css        ← paleta, tipografías y componentes
├── js/main.js            ← tema, menú, filtros, formulario y cliente API
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

### 6.1 Cambiar textos, color y tipografía
- **Textos e imágenes**: todo en `index.html`.
- **Color principal**: `css/styles.css` → bloque `:root` → `--color-primary`.
- **Tipografías**: se cargan de Google Fonts en el `<head>` del HTML; cambia el `<link>` y luego `--font-heading` / `--font-body` en el CSS.

### 6.2 Añadir un proyecto
1. **Rápido (solo HTML)**: copia un `<article class="proyecto">` dentro de `#grid-proyectos` en `index.html` y ponle su `data-categoria` (`web`, `app`, `diseno`, `marca`).
2. **Completo (API)**: añade una fila en `server/datos/semillas.js` → `PROYECTOS`, o insértala en la BD:
   ```js
   // en server/api.js podrías añadir un POST /api/proyectos (ver 6.5)
   INSERT INTO proyectos (titulo, categoria, anio, resumen, pill, etiqueta, texto_enlace2, url_demo, url_codigo, orden)
   VALUES ('Mi web', 'web', '2026', 'Resumen…', 'Web', 'Web · 2026', 'Código', 'https://…', 'https://…', 7);
   ```
   El JS ya rellena los enlaces automáticamente desde `GET /api/proyectos`.
3. Si añades una **categoría nueva**: crea el botón de filtro en `index.html` (`<button class="filtro" data-filtro="nueva">`) y usa la misma clave en `data-categoria`.

### 6.3 Quitar secciones
Borra el bloque `<section>` correspondiente en `index.html`. El JS es defensivo: si no encuentra un elemento (`document.getElementById(...)`) no falla. Revisa también el menú de navegación (`#menu-navegacion`) para quitar el enlace.

### 6.4 Añadir un campo al formulario de contacto
Ejemplo: añadir **"Teléfono"**.
1. `index.html`, dentro del formulario:
   ```html
   <div class="campo">
     <label for="telefono">Teléfono (opcional)</label>
     <input type="tel" id="telefono" name="telefono" autocomplete="tel">
   </div>
   ```
2. `js/main.js`: recógelo en el `body` del `fetch` → `telefono: document.getElementById('telefono').value.trim()`.
3. `server/datos/semillas.js`: `telefono TEXT DEFAULT ''` en la tabla `mensajes` (y `npm run reiniciar`, o `ALTER TABLE mensajes ADD COLUMN telefono TEXT DEFAULT '';`).
4. `server/api.js`: valida y añade el `?` del `INSERT`:
   ```js
   bd.ejecutar('INSERT INTO mensajes (nombre, email, mensaje, telefono, ip) VALUES (?, ?, ?, ?, ?)',
     nombre, email, mensaje, telefono, ip);
   ```

### 6.5 Añadir una API nueva
En `server/api.js`, dentro de `registrar(api, { bd })`:

```js
api.get('/api/servicios', (ctx) => ctx.json(bd.todos('SELECT * FROM servicios')));

api.post('/api/servicios', async (ctx) => {
  if (!esAdmin(ctx)) return ctx.fallo(401, 'Token no válido');
  const d = await ctx.cuerpo();
  if (!d.nombre) return ctx.fallo(400, 'Falta el nombre');
  const r = bd.ejecutar('INSERT INTO servicios (nombre) VALUES (?)', d.nombre);
  ctx.json({ ok: true, id: Number(r.lastInsertRowid) }, 201);
});
```
Y en `server/datos/semillas.js` crea la tabla dentro de `ESQUEMA`. Prueba:
`curl -X POST http://localhost:3000/api/servicios -H "Content-Type: application/json" -d '{"nombre":"SEO"}'`

### 6.6 Conectar el correo de verdad
- **Resend (más fácil)**: cuenta gratis → API key → en `.env`:
  `RESEND_API_KEY=re_xxx` y `EMAIL_DE="Tu Nombre <hola@tudominio.com>"`. Verifica tu dominio en Resend.
- **SMTP (Gmail, Outlook, Mailgun)**: `npm install nodemailer` y en `.env`:
  `SMTP_HOST=smtp.gmail.com`, `SMTP_PUERTO=587`, `SMTP_USUARIO=...`, `SMTP_CLAVE=...` (contraseña de aplicación de Gmail).
- Sin nada configurado, el mensaje **se guarda igualmente** en la BD (modo demo).

### 6.7 Conectar un servicio externo en vez de la BD
Si prefieres Formspree, Web3Forms o un Google Form, sustituye la llamada en `js/main.js`:
```js
fetch('https://formspree.io/f/TU_ID', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(datos) })
```
y borra `server/` si ya no lo necesitas.

### 6.8 Cambiar puerto o dominio
`.env` → `PORT=8080`. En un servidor público: `HOST=0.0.0.0` y pon un proxy inverso (Caddy/Nginx) con HTTPS delante.

---

## 7. Qué se guarda en la base de datos

| Tabla | Columnas | Quién la escribe |
|---|---|---|
| `proyectos` | id, titulo, categoria, anio, resumen, pill, etiqueta, texto_enlace2, url_demo, url_codigo, orden, activo | semillas / tú |
| `mensajes` | id, nombre, email, mensaje, ip, leido, creado_en | `POST /api/contacto` |

Consulta los mensajes con el token (§4) o con cualquier cliente SQLite
(DB Browser for SQLite, VS Code con extensión, `sqlite3` CLI).

---

## 8. Despliegue

1. Sube la carpeta a tu servidor/VPS o a un servicio Node (Railway, Render, Fly.io, Cyclic…).
2. Variables de entorno en el panel: `PORT` (suele darlo la plataforma), `HOST=0.0.0.0`, `ADMIN_TOKEN` (uno largo), `SITE_URL=https://tudominio.com`, `RESEND_API_KEY`…
3. Comando de arranque: `node server/server.js` (el `PORT` llega del entorno).
4. La BD SQLite se crea sola; para que sobreviva a despliegues, monta un **volumen** en `server/data/` o cambia `DB_FILE` a una ruta persistente.
5. Activa HTTPS (la plataforma o Caddy/Let's Encrypt) y no expongas `ADMIN_TOKEN` en el navegador.

---

## 9. Librerías opcionales (si quieres ir más allá)

| Librería | Para qué | Cuándo |
|---|---|---|
| `nodemailer` | enviar correos por SMTP | si activas `SMTP_HOST` |
| `express` | servidor web más amplio | si la API crece mucho |
| `better-sqlite3` | SQLite alternativa a `node:sqlite` | si usas Node < 22.13 |
| `zod` / `joi` | validación de datos declarativa | muchos endpoints |
| `bcrypt` + `jsonwebtoken` | usuarios y login reales | si añades área privada |
| `marked` + `dompurify` | Markdown → HTML seguro | si publicas artículos |
| `nodemon` | reinicio automático | ya cubierto con `npm run dev` |

---

## 10. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `No se pudo cargar "node:sqlite"` | Instala Node ≥ 22.13 y comprueba con `node -v` |
| `EADDRINUSE: port 3000` | Cambia `PORT` en `.env` o cierra el proceso anterior |
| El formulario dice "modo demo" | No hay servidor: ejecuta `npm start` y abre `http://localhost:3000` |
| `429 Demasiados envíos` | Espera un minuto o sube `LIMITE_CONTACTO` en `.env` |
| `401 Token no válido` | Usa el `ADMIN_TOKEN` del `.env` en el header `x-admin-token` |
| Los cambios del `.env` no hacen efecto | Reinicia el servidor |
| El navegador cachea CSS/JS antiguos | Ctrl + F5 (el servidor manda `no-cache` en HTML) |

---

## 11. Seguridad (antes de publicar)

- Cambia `ADMIN_TOKEN` por una clave larga y aleatoria.
- Mantén `.env` fuera de git (ya está en `.gitignore`).
- El servidor **nunca** sirve `.env`, `*.md` ni la carpeta `server/` (devuelve 403).
- Añade HTTPS (obligatorio para cookies/autenticación en producción).
- El límite por IP es en memoria: para múltiples servidores usa Redis o el límite de tu proxy.

---

## 12. Licencia y personalización

Libre para usar en tus proyectos. Cambia textos, colores, tablas y endpoints a
tu gusto: la estructura está pensada para copiar la carpeta y hacerla tuya.

La licencia completa está en [`../LICENSE`](../LICENSE) (MIT — Copyright (c) 2026 Alberto Ortiz).
