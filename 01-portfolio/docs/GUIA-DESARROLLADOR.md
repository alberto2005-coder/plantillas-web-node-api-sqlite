# Guía de desarrollador · 01-portfolio

## 1. Para quién es + mapa de ficheros

Esta guía es para **quien va a tocar código**: añadir endpoints, cambiar la base de datos, crear campos nuevos en el formulario o integrar servicios externos.

| Lo que necesitas | Cuánto |
|---|---|
| Node 22.13+ (`node -v`) | obligatorio |
| Editor de código (VS Code, etc.) | ya lo tienes |
| `npm install` | ❌ no hace falta (solo módulos nativos) |

**Árbol real de la plantilla (con `docs/`):**

```
01-portfolio/
├── index.html
├── css/styles.css
├── js/main.js
├── .env
├── .env.example
├── package.json
├── README.md
├── docs/
│   ├── GUIA-USUARIO.md
│   └── GUIA-DESARROLLADOR.md   ← este documento
└── server/
    ├── server.js
    ├── api.js
    ├── reset.js
    ├── datos/
    │   └── semillas.js
    ├── data/
    │   └── portfolio.db
    └── lib/
        ├── env.js
        ├── http.js
        ├── router.js
        ├── db.js
        ├── email.js
        └── limitador.js
```

---

## 2. Ciclo de una petición

```text
navegador
   │
   ▼
HTTP request (fetch)
   │
   ▼
server/server.js  ──►  ¿req.url.startsWith('/api/')?
   │                         │
   │                    SÍ   ▼
   │                   api.manejar(req, res)  (server/lib/router.js)
   │                         │
   │                         ▼
   │                   server/api.js  ──►  registra rutas
   │                         │
   │                         ▼
   │                   ctx.cuerpo() / ctx.cabecera() / ctx.query / ctx.params
   │                         │
   │                         ▼
   │                   bd.todos / bd.uno / bd.ejecutar  (server/lib/db.js)
   │                         │
   │                         ▼
   │                   SQLite (server/data/portfolio.db)
   │                         │
   │                         ▼
   │                   ctx.json({...})  o  ctx.fallo(4xx, 'msg')
   │                         │
   ▼                         ▼
res.writeHead + res.end(JSON)
   │
   ▼
navegador recibe JSON
```

**Ejemplo trazado real** (`POST /api/contacto`):

1. `js/main.js` → `api('/api/contacto', { method:'POST', body:JSON.stringify({nombre,email,mensaje}) })`
2. `server/server.js` línea 49-54: detecta `/api/` → `api.manejar(req, res)`
3. `server/lib/router.js` busca `POST /api/contacto` en el mapa de rutas
4. `server/api.js` líneas 63-107: ejecuta `limiteContacto.permitido(ip)`, valida, `bd.ejecutar('INSERT INTO mensajes...')`, `enviarCorreo()`, `ctx.json({ok:true,id,...}, 201)`
5. `server/lib/http.js` → `json()` serializa y envía cabeceras + body
6. `js/main.js` recibe respuesta → muestra `#form-exito` con `datos.mensaje`

---

## 3. Base de datos

**Tablas reales (de `server/datos/semillas.js`):**

| Tabla | Columnas | Tipos | Quién escribe |
|---|---|---|---|
| `proyectos` | `id` INTEGER PK AI, `titulo` TEXT NOT NULL, `categoria` TEXT NOT NULL, `anio` TEXT NOT NULL, `resumen` TEXT NOT NULL, `pill` TEXT NOT NULL, `etiqueta` TEXT NOT NULL, `texto_enlace2` TEXT NOT NULL, `url_demo` TEXT DEFAULT '', `url_codigo` TEXT DEFAULT '', `orden` INTEGER NOT NULL DEFAULT 0, `activo` INTEGER NOT NULL DEFAULT 1 | texto, enteros, booleanos 1/0 | semillas / tú |
| `mensajes` | `id` INTEGER PK AI, `nombre` TEXT NOT NULL, `email` TEXT NOT NULL, `mensaje` TEXT NOT NULL, `ip` TEXT, `leido` INTEGER NOT NULL DEFAULT 0, `creado_en` TEXT NOT NULL DEFAULT (datetime('now')) | texto, enteros, booleanos 1/0, timestamp ISO | `POST /api/contacto` |

**Semillas (conteos):** 6 proyectos insertados por `sembrar()` si la tabla está vacía (`SELECT COUNT(*) FROM proyectos`). 0 mensajes iniciales.

**Índices / UNIQUE:** `proyectos` no tiene índices extra; `mensajes` tampoco. `activo` y `leido` son `INTEGER` usados como booleanos (1/0).

**Reset:** `npm run reiniciar` → `server/reset.js` borra `server/data/` y vuelve a sembrar (llama a `crearBase` con `ESQUEMA` y `sembrar`).

**Migración segura (patrón):** si añades columna, usa `ALTER TABLE mensajes ADD COLUMN telefono TEXT DEFAULT '';` y actualiza `ESQUEMA` en `semillas.js` para próximas instalaciones limpias.

---

## 4. API completa

Tabla exhaustiva verificada contra `server/api.js`:

| Método | Ruta | Auth | Parámetros / Cuerpo | Respuestas y códigos |
|---|---|---|---|---|
| GET | `/api/salud` | no | — | 200 `{ok, servicio, version, node, hora, uptime_s}` |
| GET | `/api/proyectos` | no | — | 200 `[{id,titulo,categoria,anio,resumen,pill,etiqueta,texto_enlace2,url_demo,url_codigo,orden,activo}]` |
| GET | `/api/proyectos/:id` | no | `params.id` | 200 `{...}` · 404 `{error:"No existe ese proyecto"}` |
| POST | `/api/contacto` | no | `{nombre:string, email:string, mensaje:string}` | 201 `{ok,id,mensaje,correo,detalleCorreo}` · 400 `{error:"Revisa el formulario",detalle:[]}` · 429 `{error:"Demasiados envíos..."}` · 500 `{error:"Error interno del servidor"}` |
| GET | `/api/mensajes` | `x-admin-token` | — | 200 `[{id,nombre,email,mensaje,leido,creado_en}]` · 401 `{error:"Token de administración no válido..."}` |
| DELETE | `/api/mensajes/:id` | `x-admin-token` | `params.id` | 200 `{ok,borrados}` · 401 · 404 `{error:"No existe ese mensaje"}` |

**Ejemplos request/response reales:**

```bash
# GET /api/salud
curl http://localhost:3000/api/salud
# {"ok":true,"servicio":"portfolio-api","version":"1.0.0","node":"v22.13.0","hora":"2026-10-02T13:29:42.157Z","uptime_s":3}

# GET /api/proyectos
curl http://localhost:3000/api/proyectos
# [{"id":1,"titulo":"Panadería La Miga","categoria":"web","anio":"2025","resumen":"Sitio con pedidos online...","pill":"Web","etiqueta":"Web · 2025","texto_enlace2":"Código","url_demo":"","url_codigo":"","orden":1,"activo":true},...]

# POST /api/contacto
curl -X POST http://localhost:3000/api/contacto -H "Content-Type: application/json" -d '{"nombre":"Ana","email":"ana@correo.com","mensaje":"Quiero un presupuesto de mi web."}'
# {"ok":true,"id":2,"mensaje":"Mensaje recibido. Gracias por escribir.","correo":"demo","detalleCorreo":"sin correo configurado (.env)"}

# POST /api/contacto (error 400)
curl -X POST http://localhost:3000/api/contacto -H "Content-Type: application/json" -d '{"nombre":"A","email":"no-email","mensaje":"corto"}'
# {"error":"Revisa el formulario","detalle":["El nombre debe tener al menos 2 caracteres.","El correo no tiene un formato válido.","El mensaje debe tener al menos 10 caracteres."]}

# GET /api/mensajes (con token)
curl -H "x-admin-token: demo-token-portfolio-9f4c2b7e1a" http://localhost:3000/api/mensajes
# [{"id":2,"nombre":"Ana","email":"ana@correo.com","mensaje":"Quiero un presupuesto de mi web.","leido":false,"creado_en":"2026-10-02 13:30:15"}]

# DELETE /api/mensajes/2
curl -X DELETE -H "x-admin-token: demo-token-portfolio-9f4c2b7e1a" http://localhost:3000/api/mensajes/2
# {"ok":true,"borrados":1}
```

---

## 5. Cómo habla el front con la API

**Cliente (`js/main.js` líneas 37-51):**

```js
function api(ruta, opciones) {
  return fetch(API_BASE + ruta, Object.assign({
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
  }, opciones || {})).then(respuesta => ...);
}
```

- `API_BASE = ''` → mismo origen. En modo demo (abrir `index.html` directo) el `fetch` falla (CORS/file://) y el `.catch` trata el error como "sin servidor".
- **Fallback demo** (líneas 416-419): si `fallo.estado` es undefined → modo demo, muestra mensaje de éxito simulado y resetea formulario.
- **Funciones que pintan:** `enlacesDesdeApi()` (línea 436) llama `GET /api/proyectos` y rellena `href` de `.proyecto__enlaces a` según `url_demo`, `url_codigo`, `texto_enlace2`.
- **Validación:** cliente valida en vivo (`blur`) y al `submit` (longitud, regex email). Servidor re-valida (líneas 74-80 `api.js`).
- **detalleDeError:** no existe en 01 (solo en 02). El `catch` lee `fallos.datos.detalle` (array) y muestra el primer elemento.

---

## 6. Recetas de extensión

### Añadir endpoint (ej. `GET /api/servicios`)

En `server/api.js` dentro de `registrar(api, { bd })`:

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

### Añadir columna/tabla (migración segura)

1. Edita `ESQUEMA` en `server/datos/semillas.js` (añade `telefono TEXT DEFAULT ''` en `mensajes`).
2. Si la BD ya existe: `ALTER TABLE mensajes ADD COLUMN telefono TEXT DEFAULT '';`.
3. `npm run reiniciar` para instalación limpia.

### Añadir campo al formulario de contacto (ej. "Teléfono")

1. `index.html`: `<input type="tel" id="telefono" name="telefono" autocomplete="tel">`
2. `js/main.js`: recoge `telefono: document.getElementById('telefono').value.trim()` en el body del fetch.
3. `server/datos/semillas.js`: `telefono TEXT DEFAULT ''` en tabla `mensajes`.
4. `server/api.js` línea 82-85: `bd.ejecutar('INSERT INTO mensajes (nombre, email, mensaje, telefono, ip) VALUES (?, ?, ?, ?, ?)', nombre, email, mensaje, telefono, ip);`

### Añadir sección nueva

1. `index.html`: `<section id="nueva">...</section>`
2. `js/main.js`: si necesita datos del servidor, añade `api('/api/nueva').then(...)`.

---

## 7. Pruebas

| Comando | Qué hace |
|---|---|
| `node --check server/server.js` | Sintaxis OK sin arrancar |
| `node --check server/api.js` | Sintaxis OK |
| `node --check js/main.js` | Sintaxis OK |
| `.\verificar.ps1` (desde raíz) | Arranca en puerto 3101, prueba `/api/salud` y portada, para |
| `curl -H "x-admin-token: demo-token-portfolio-9f4c2b7e1a" http://localhost:3000/api/mensajes` | Lee bandeja |
| **PowerShell con body en fichero:** |
```powershell
[System.IO.File]::WriteAllText("$PWD\body.json", '{"nombre":"Ana","email":"ana@correo.com","mensaje":"Hola"}')
curl.exe -X POST http://localhost:3000/api/contacto -H "Content-Type: application/json" --data-binary "@body.json"
```
| BD limpia | `npm run reiniciar` (borra `server/data/` y resiembra) |

---

## 8. Seguridad y límites

| Hecho por la plantilla | Tú debes hacer en producción |
|---|---|
| ✅ Rate-limit por IP en memoria (`limitador.js`, 5 req/min contacto) | 🔴 Usar Redis o límite del proxy si hay múltiples instancias |
| ✅ Validación servidor (longitud, regex email) | 🔴 Validar también en cliente (ya está) |
| ✅ Token admin en header `x-admin-token` (comparación timing-safe NO, es `===`) | 🔴 Cambiar `ADMIN_TOKEN` por clave larga aleatoria |
| ✅ `.env` fuera de git (`.gitignore`) | 🔴 No commitear `.env` real |
| ✅ Servidor niega `.env`, `*.md`, `server/` (403 en `lib/http.js`) | 🔴 HTTPS obligatorio (Caddy/Nginx) |
| ✅ Cuerpo JSON limitado (1 MB en `lib/http.js`) | 🔴 Ajustar si esperas payloads grandes |
| ✅ `helmet`-like: `X-Content-Type-Options: nosniff` | 🔴 CSP, HSTS, cookies seguras si añades auth |

**Límites reales:**
- `LIMITE_CONTACTO=5` req/IP/min (configurable en `.env`)
- Body max 1 MB (`lib/http.js` línea ~)
- `GET /api/mensajes` máximo 200 filas (hardcoded en `api.js` línea 113)

---

## 9. Límites y decisiones

| Qué NO hace esta plantilla | Por qué / alternativa |
|---|---|
| ❌ Panel web de administración | Solo API con token (`GET /api/mensajes`). Para panel, usa 06-dashboard o añade uno. |
| ❌ Autenticación de usuarios (login/registro) | Solo token admin estático. Para usuarios reales: `bcrypt` + `jsonwebtoken` (ver §9 del README). |
| ❌ Subida de archivos | No hay `multipart/form-data`. Añadir `busboy` o similar si hace falta. |
| ❌ WebSockets / tiempo real | HTTP puro. Para tiempo real: `socket.io` o SSE. |
| ❌ Tests automatizados | `node --check` + `verificar.ps1` son humo. Añadir `vitest`/`jest` si crece. |
| ❌ Migraciones versionadas | `npm run reiniciar` borra y resiembra. Para migraciones: `node-migrate` o SQL manual. |

---

## 10. Documentación relacionada

| Documento | Qué contiene |
|---|---|
| [README de esta plantilla](../README.md) | Referencia completa (12 secciones): arranque, `.env`, API, BD, despliegue, seguridad |
| [Guía de usuario](GUIA-USUARIO.md) | Para dueño que no programa: arranque, recorrido, bandeja, cambios sin código |
| [Índice de endpoints](../../docs/API.md) | Endpoints de las 7 plantillas (global, pendiente) |
| [Personalización](../../docs/PERSONALIZACION.md) | Recetas ampliadas: identidad, colores, datos, secciones (global, pendiente) |
| [Despliegue](../../docs/DESPLIEGUE.md) | Cómo publicarla con HTTPS, volúmenes, proxys (global, pendiente) |