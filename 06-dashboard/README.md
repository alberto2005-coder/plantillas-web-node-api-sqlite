# 06 · Nova Analytics — dashboard con servidor, API y base de datos

Plantilla de **dashboard / panel de administración** (HTML5 + CSS3 + JavaScript
vanilla, gráficas SVG dibujadas a mano) que ya incluye **servidor Node, API REST,
base de datos SQLite y autenticación de administración**: los KPIs, las gráficas,
los productos, los clientes y los pedidos salen de la base de datos, se filtran
en el servidor y se pueden exportar a CSV.

> Funciona **sin instalar nada**: no hay dependencias obligatorias, solo módulos
> nativos de Node. `npm install` es opcional (solo para integraciones reales).
> Y si abres `index.html` con doble clic, la plantilla sigue funcionando en
> **modo estático** con sus datos de ejemplo.
>
> 📚 **Documentación**: [Guía de usuario](docs/GUIA-USUARIO.md) · [Guía de desarrollador](docs/GUIA-DESARROLLADOR.md)

---

## 1. Qué necesita esta plantilla (y qué ya está hecho)

| Necesidad | Estado | Dónde |
|---|---|---|
| Servidor web (HTTP) | ✅ hecho | `server/server.js` |
| API REST | ✅ hecho | `server/api.js` |
| Base de datos | ✅ SQLite (`node:sqlite`) | `server/data/dashboard.db` |
| Datos de las gráficas y tablas | ✅ desde la BD | `server/datos/semillas.js` |
| Filtrado de pedidos (estado + búsqueda) | ✅ server-side | `GET /api/pedidos?estado=&q=` |
| Login de administración | ✅ `POST /api/login` → token 24 h | `server/api.js` |
| Cambiar estado de un pedido | ✅ `PATCH /api/pedidos/:id/estado` | requiere token |
| Exportación CSV real | ✅ `GET /api/exportar/pedidos.csv` | requiere token |
| Modo estático (sin servidor) | ✅ con los mismos datos de ejemplo | `js/main.js` §0 y §17 |
| Protección anti-fuerza bruta | ✅ límite de logins por IP | `server/lib/limitador.js` |
| Envío de correo | ⚪ opcional | `.env` → Resend o SMTP |
| Librerías externas | ⚪ ninguna obligatoria | ver §9 |
| HTTPS, dominio, despliegue | 📄 documentado | §8 |

---

## 2. Arranque rápido

**Requisito: Node 22.13 o superior** ([nodejs.org](https://nodejs.org)). Compruébalo con `node -v`.

```bash
# Opción A — con servidor (recomendada): API + web en el mismo puerto
npm start
# → abre http://localhost:3006

# Opción B — sin servidor: doble clic en index.html
# (el panel se ve y funciona exactamente igual, con los datos de ejemplo)

# Volver a la base de datos de ejemplo (borra lo que hayas cambiado)
npm run reiniciar

# Recarga automática al guardar cambios
npm run dev
```

Si **no quieres usar npm**, también puedes: `node server/server.js`.

Acceso al panel: el botón **“Exportar CSV”** (y las acciones de administración)
pide un token; el usuario y la contraseña del login son los del `.env`
(`admin` / `nova-demo-2026`).

---

## 3. Variables de entorno (`.env`)

Copia `.env.example` → `.env` y rellena. Ya te dejo un `.env` de demo listo.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | no (3006) | Puerto del servidor |
| `HOST` | no (127.0.0.1) | IP de escucha. Usa `0.0.0.0` en contenedores/servidor |
| `SITE_URL` | no | URL pública (se usa en enlaces y descargas) |
| `DB_FILE` | no | Ruta del fichero SQLite (se crea solo) |
| `ADMIN_USER` | sí para login | Usuario de `POST /api/login` (demo: `admin`) |
| `ADMIN_PASSWORD` | sí para login | Contraseña de `POST /api/login` (demo: `nova-demo-2026`) |
| `ADMIN_TOKEN` | sí para admin | Token fijo para PATCH y CSV (`x-admin-token`) |
| `LIMITE_LOGIN` | no (5) | Intentos de login por IP y minuto |
| `RESEND_API_KEY` | opcional | Activa el envío real vía [Resend](https://resend.com) |
| `EMAIL_DE` | opcional | Remitente visible (`Nombre <hola@x.com>`) |
| `SMTP_HOST` / `SMTP_PUERTO` / `SMTP_USUARIO` / `SMTP_CLAVE` | opcional | Envío por SMTP (requiere `npm install nodemailer`) |
| `CORS` / `CORS_ORIGEN` | no (`0`) | Para consumir la API desde otro dominio |

Cambios en `.env`: **reinicia el servidor** (`Ctrl + C` y `npm start`).

---

## 4. API REST

Todas las respuestas son JSON. Las de escritura aceptan `Content-Type: application/json`.

| Método | Ruta | Body / Query | Respuesta | Auth |
|---|---|---|---|---|
| GET | `/api/salud` | – | `{ok, version, node, uptime_s}` | no |
| GET | `/api/resumen` | – | `{kpis, serie, dona, donaTotal, pedidos, actividad}` | no |
| GET | `/api/ventas` | – | `{kpis, serie, vendedores}` | no |
| GET | `/api/productos` | – | array de productos `{n,c,p,stock,v,i}` | no |
| GET | `/api/clientes` | – | array de clientes `{n,mail,plan,pais,ped,fact}` | no |
| GET | `/api/actividad` | – | array `{t, txt, sub, tiempo}` | no |
| GET | `/api/pedidos` | `estado`, `q` | array de pedidos **filtrada en el servidor** | no |
| PATCH | `/api/pedidos/:id/estado` | `{estado}` | `{ok, pedido}` | `x-admin-token` |
| GET | `/api/exportar/pedidos.csv` | – | fichero `text/csv` (con BOM) | `x-admin-token` |
| POST | `/api/login` | `{usuario, clave}` | `{ok, token, usuario, caduca_en}` (201) | usuario+contraseña |
| GET | `/api/yo` | – | `{ok, usuario, origen}` | `Bearer …` o `x-admin-token` |

**Detalles del filtrado de pedidos**

- `estado` ∈ `todos` | `Entregado` | `En curso` | `Pendiente` (otro valor → 400).
- `q` busca por **referencia, cliente o producto**, sin distinguir mayúsculas ni
  acentos (`?q=lucia` encuentra a *Lucía Fernández*).
- El id del pedido es la **referencia** visible (`#1043`), no la clave interna.

**Ejemplos con curl** (en PowerShell guarda el body en un fichero y usa
`--data-binary "@fichero.json"`: el `-d` con comillas se estropea):

```bash
# Estado del servidor
curl http://localhost:3006/api/salud

# Datos del panel
curl http://localhost:3006/api/resumen
curl "http://localhost:3006/api/pedidos?estado=Pendiente"
curl "http://localhost:3006/api/pedidos?q=lucia"

# Login (devuelve un token válido durante 24 h)
echo {"usuario":"admin","clave":"nova-demo-2026"} > login.json
curl -X POST http://localhost:3006/api/login \
  -H "Content-Type: application/json" \
  --data-binary "@login.json"

# Quién es ese token
curl -H "Authorization: Bearer TOKEN" http://localhost:3006/api/yo

# Cambiar el estado de un pedido (401 sin token, 200 con él)
echo {"estado":"Entregado"} > estado.json
curl -X PATCH http://localhost:3006/api/pedidos/1043/estado \
  -H "Content-Type: application/json" \
  -H "x-admin-token: demo-token-dashboard-9f4c2b7e1a" \
  --data-binary "@estado.json"

# Exportar el CSV de pedidos
curl -i -H "x-admin-token: demo-token-dashboard-9f4c2b7e1a" \
  http://localhost:3006/api/exportar/pedidos.csv -o pedidos.csv
```

**Errores**: siempre `{ "error": "mensaje" }` con el código HTTP correspondiente
(400 validación, 401 token/credenciales, 404 no existe, 429 límite de login,
500 servidor).

---

## 5. Estructura

```
06-dashboard/
├── index.html            ← contenido y estructura (en español)
├── css/styles.css        ← paleta, tipografías y componentes
├── js/main.js            ← vistas, gráficas SVG, filtros y cliente API
├── .env                  ← configuración local (no se sube a git)
├── .env.example          ← plantilla comentada de variables
├── package.json          ← scripts npm
├── README.md             ← este documento
├── docs/
│   ├── GUIA-USUARIO.md   ← arranque, vistas, datos, recetas, checklist, fallos
│   └── GUIA-DESARROLLADOR.md ← mapa, ciclo petición, BD, API, front, recetas, pruebas, seguridad
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
        └── limitador.js  ← anti-abusos por IP
```

---

## 6. Cómo personalizarla

### 6.1 Cambiar colores y textos
- **Textos, tarjetas y vistas**: todo en `index.html`.
- **Color principal**: `css/styles.css` → bloque `:root` → `--color-primary`
  (y `--color-accent` para el segundo dato de las gráficas).
- **Tipografías**: Google Fonts en el `<head>`; luego `--font-heading` / `--font-body`.
- Los títulos y subtítulos de cada vista están en el objeto `VISTAS` de `js/main.js`.

### 6.2 Añadir o quitar métricas y gráficas
1. **Añadir una tarjeta KPI**: copia un bloque `<article class="tarjeta kpi">`
   en `index.html`, dale un `id` al `<p class="kpi__valor">` (p. ej.
   `id="kpiNueva"`) y pon su `data-contador`, `data-decimales`, `data-prefijo`
   y `data-sufijo`. En `server/api.js` añade el valor al objeto `kpis` y en
   `js/main.js` la línea `aplicarKPI('kpiNueva', r.kpis.nueva);` dentro de
   `cargarResumen()`.
2. **Quitar una gráfica**: borra su `<article>` en `index.html`; el JS es
   defensivo (si no encuentra el contenedor, no pinta y no falla).
3. **Añadir una gráfica nueva**: añade el contenedor en `index.html`, una
   función `pintarXXX()` en `js/main.js` (copia `pintarBarras` como modelo) y
   llámala desde `pintarGraficas(vista)`.
4. **Añadir una columna a una tabla**: amplía el `<thead>`/`<tbody>` de la
   plantilla y la función `fila…()` correspondiente.

### 6.3 Cambiar las series de datos (métricas)
Las series viven en la tabla `metricas` con formato `(clave, periodo, valor)`:

| clave | periodo | valor |
|---|---|---|
| `ingresos` | `'Ene'…'Dic'` | € de cada mes (gráfica de líneas) |
| `objetivo` | `'Ene'…'Dic'` | € objetivo (misma gráfica) |
| `ventas_mes` | `'Ene'…'Dic'` | unidades (gráfica de barras) |
| `dona` | nombre de categoría | % (0–100), orden = orden de la dona |
| `dona_total` | `30d` | total del centro de la dona |
| `visitantes` `conversion` `ventas` `facturacion` `pedidos_cerrados` `ticket_medio` | `30d`/`7d`/`mes`/`total` | tarjetas KPI |

```bash
# Cambiar los ingresos de Octubre
sqlite3 server/data/dashboard.db "UPDATE metricas SET valor = 51000 WHERE clave='ingresos' AND periodo='Oct';"
```
(también puedes editar `server/datos/semillas.js` y `npm run reiniciar`).

El KPI «Ingresos» se calcula en la API como **el último valor de la serie**,
para no desincronizarlo de la gráfica.

### 6.4 Añadir una API nueva
En `server/api.js`, dentro de `registrar(api, { bd })`:

```js
api.get('/api/envios', (ctx) => {
  ctx.json(bd.todos(
    "SELECT referencia AS id, cliente, fecha FROM pedidos WHERE estado = 'En curso' ORDER BY referencia DESC"
  ));
});

api.post('/api/envios', async (ctx) => {
  if (!esAdmin(ctx)) return ctx.fallo(401, 'Token no válido');
  const d = await ctx.cuerpo();
  if (!d.referencia) return ctx.fallo(400, 'Falta la referencia');
  const r = bd.ejecutar('INSERT INTO actividad (tipo, texto, detalle) VALUES (?, ?, ?)',
    'pedido', 'Envío creado', 'Pedido #' + d.referencia);
  ctx.json({ ok: true, id: Number(r.lastInsertRowid) }, 201);
});
```
Y en `server/datos/semillas.js` crea la tabla dentro de `ESQUEMA`. Prueba:
`curl -X POST http://localhost:3006/api/envios -H "Content-Type: application/json" -d '{"referencia":1043}'`

### 6.5 Conectar datos reales (GA4, Plausible, Stripe…)
- **Analytics (GA4 / Plausible)**: crea un pequeño endpoint que llame a la API
  del proveedor y devuelva las series en el mismo formato:
  ```js
  api.get('/api/visitas', async (ctx) => {
    const r = await fetch('https://plausible.io/api/v1/stats/aggregate?period=month…',
      { headers: { Authorization: 'Bearer ' + process.env.PLAUSIBLE_KEY } });
    ctx.json(await r.json());
  });
  ```
  Luego sustituye `kpis.visitantes` en `cargarResumen()`.
- **Stripe / pasarela de pago**: guarda los cobros en una tabla nueva y suma
  `importe` por mes para alimentar `ingresos` / `facturacion`.
- **Sin backend**: también puedes apuntar `API_BASE` en `js/main.js` a otra URL
  (habilita `CORS=1` en el `.env` de esta API).

### 6.6 Autenticación real (usuarios y contraseñas)
La plantilla guarda sesiones en texto plano con caducidad de 24 h, suficiente
para una demo. Para producción:

```bash
npm install bcrypt jsonwebtoken
```
- Al crear usuarios: `hash = await bcrypt.hash(clave, 12)`.
- En `POST /api/login`: `await bcrypt.compare(clave, fila.hash)` y firma un JWT
  con `jwt.sign({ sub: fila.id }, process.env.JWT_SECRETO, { expiresIn: '7d' })`.
- En `GET /api/yo` y en las rutas admin: verifica el JWT en vez de la tabla
  `sesiones`.
- Sirve todo **solo por HTTPS** y guarda los tokens en cookie `HttpOnly`.

### 6.7 Métricas en vivo (polling o WebSockets)
- **Polling (lo más simple)**: en `js/main.js`, dentro de la sección 17:
  ```js
  setInterval(() => { if (vistaActual === 'resumen') cargarVista('resumen'); }, 30000);
  ```
- **WebSockets**: `npm install ws`, levanta un `WebSocket.Server` en el mismo
  `http.Server` y emite un mensaje cuando cambie un pedido
  (`PATCH /api/pedidos/:id/estado` es el punto ideal: `broadcast({tipo:'pedido', fila})`).

### 6.8 Cambiar puerto o dominio
`.env` → `PORT=8080`. En un servidor público: `HOST=0.0.0.0` y pon un proxy
inverso (Caddy/Nginx) con HTTPS delante.

---

## 7. Qué se guarda en la base de datos

| Tabla | Columnas | Quién la escribe |
|---|---|---|
| `productos` | id, nombre, categoria, precio, stock, ventas, icono, orden, activo | semillas / tú |
| `clientes` | id, nombre, email, plan, pais, pedidos, facturado, activo | semillas / tú |
| `pedidos` | id, referencia (única), cliente, producto, fecha, importe, estado, creado_en | semillas + `PATCH /api/pedidos/:id/estado` |
| `actividad` | id, tipo, texto, detalle, tiempo, creado_en | semillas + cada PATCH |
| `vendedores` | id, nombre, pedidos, facturado, objetivo | semillas / tú |
| `metricas` | id, clave, periodo, valor | semillas / tú (series y KPIs) |
| `sesiones` | id, token (único), usuario, creado_en, caduca_en | `POST /api/login` (24 h) |

Consulta la BD con cualquier cliente SQLite (DB Browser for SQLite, VS Code con
extensión, `sqlite3` CLI) o restáurala con `npm run reiniciar`.

---

## 8. Despliegue

1. Sube la carpeta a tu servidor/VPS o a un servicio Node (Railway, Render, Fly.io…).
2. Variables de entorno en el panel: `PORT` (suele darlo la plataforma),
   `HOST=0.0.0.0`, `ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_TOKEN` (uno largo),
   `SITE_URL=https://tudominio.com`.
3. Comando de arranque: `node server/server.js` (el `PORT` llega del entorno).
4. La BD SQLite se crea sola; para que sobreviva a despliegues, monta un
   **volumen** en `server/data/` o cambia `DB_FILE` a una ruta persistente.
5. Activa HTTPS (la plataforma o Caddy/Let's Encrypt) y no expongas
   `ADMIN_TOKEN` ni `ADMIN_PASSWORD` en el navegador.

---

## 9. Librerías opcionales (si quieres ir más allá)

| Librería | Para qué | Cuándo |
|---|---|---|
| `express` | servidor web más amplio | si la API crece mucho |
| `bcrypt` + `jsonwebtoken` | usuarios y login reales | si publicas el panel (§6.6) |
| `ws` | métricas en tiempo real | si quieres actualizar sin recargar (§6.7) |
| `better-sqlite3` | SQLite alternativa a `node:sqlite` | si usas Node < 22.13 |
| `stripe` | cobros reales | si conectas la facturación (§6.5) |
| `zod` / `joi` | validación de datos declarativa | muchos endpoints |
| `nodemailer` | correos por SMTP | si activas `SMTP_HOST` |
| `chart.js` / `d3` | gráficas más avanzadas | solo si superas las SVG de la plantilla |

---

## 10. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `No se pudo cargar "node:sqlite"` | Instala Node ≥ 22.13 y comprueba con `node -v` |
| `EADDRINUSE: port 3006` | Cambia `PORT` en `.env` o cierra el proceso anterior |
| El panel no cambia nada al navegar | Estás en modo estático: ejecuta `npm start` y abre `http://localhost:3006` |
| Los datos se ven siempre igual (no llegan de la API) | Mira la consola del navegador: si aparece *«API no disponible → modo estático»* no hay servidor |
| `401 Token de administración no válido` | Envía `x-admin-token: <ADMIN_TOKEN>` (o inicia sesión con `POST /api/login`) |
| `429 Demasiados intentos` | Espera un minuto o sube `LIMITE_LOGIN` en `.env` |
| `401 Usuario o contraseña incorrectos` | Usa `ADMIN_USER` / `ADMIN_PASSWORD` del `.env` (demo: `admin` / `nova-demo-2026`) |
| El CSV se abre con símbolos raros | El fichero ya lleva BOM UTF-8 y comas; en Excel español, si hace falta, cambia `,` por `;` en `server/api.js` |
| Los cambios del `.env` no hacen efecto | Reinicia el servidor |
| El navegador cachea CSS/JS antiguos | Ctrl + F5 (el servidor manda `no-cache` en HTML) |
| `403` al abrir `/.env` o `/server/` | Es correcto: el servidor nunca sirve ficheros sensibles |

---

## 11. Seguridad (antes de publicar)

- Cambia `ADMIN_USER`, `ADMIN_PASSWORD` y `ADMIN_TOKEN` por valores propios y
  largos: los de la demo (`admin` / `nova-demo-2026` /
  `demo-token-dashboard-9f4c2b7e1a`) son públicos.
- Mantén `.env` fuera de git (ya está en `.gitignore`).
- El servidor **nunca** sirve `.env`, `.env.example`, `*.md`, las bases de datos
  ni la carpeta `server/` (devuelve 403).
- El login está limitado a `LIMITE_LOGIN` intentos por IP y minuto; en
  producción añade HTTPS, rate limiting en el proxy y contraseñas con bcrypt (§6.6).
- Los tokens de sesión caducan a las 24 h y se guardan en `sessionStorage` del
  navegador: cierra la pestaña y desaparecen.
- Si activas `CORS`, define `CORS_ORIGEN` con tu dominio (nunca `*` en producción).

---

## 12. Licencia y personalización

Libre para usar en tus proyectos. Cambia textos, colores, tablas, métricas y
endpoints a tu gusto: la estructura está pensada para copiar la carpeta y hacerla
tuya.

La licencia completa está en [`../LICENSE`](../LICENSE) (MIT — Copyright (c) 2026 Alberto Ortiz).
