# Plantillas web · 7 demos con servidor, API y base de datos

[Español](#español) · [English](#english)

---

## Español

### Índice

- [Descripción](#descripción)
- [Las siete plantillas](#las-siete-plantillas)
- [Requisitos](#requisitos)
- [Inicio rápido](#inicio-rápido)
- [Estructura del repositorio](#estructura-del-repositorio)
- [El archivo `.env`](#el-archivo-env)
- [Patrón de API](#patrón-de-api)
- [Personalizar una plantilla](#personalizar-una-plantilla)
- [Despliegue](#despliegue)
- [Seguridad antes de publicar](#seguridad-antes-de-publicar)
- [Problemas frecuentes](#problemas-frecuentes)
- [Documentación](#documentación)
- [Licencia](#licencia)

### Descripción

Siete plantillas de **HTML + CSS + JavaScript vanilla** que ya no son estáticas: cada una incluye su **servidor Node**, su **API REST** y su **base de datos SQLite**, con `.env` configurable y documentación para hacerlas tuyas.

> **Principio de diseño:** *cero dependencias obligatorias*. Todo arranca con `npm start` **sin ejecutar `npm install`**: solo se usan módulos nativos de Node (`node:http`, `node:fs`, `node:sqlite`, `fetch`…). Las librerías externas (Stripe, nodemailer, express…) son **opcionales**.

**Todas comparten:**

- `server/lib/` con `env.js` (lector de `.env`), `http.js` (JSON + estáticos), `router.js` (enrutador REST), `db.js` (SQLite), `email.js` (Resend/SMTP), `limitador.js` (anti-spam por IP) y `token.js` (comparación de secretos en tiempo constante con `crypto.timingSafeEqual`).
- `GET /api/salud` para comprobar que la API está viva.
- `.env` + `.env.example` + `.gitignore` + `package.json` con scripts.
- README con la **misma estructura** en las siete, fácil de comparar.
- **Modo doble**: si abres `index.html` sin servidor, todo funciona en local con datos de ejemplo; si levantas el servidor, consume la API real.

### Las siete plantillas

| # | Plantilla | Tipo de web | Qué incluye |
|---|---|---|---|
| **01** | **portfolio** | Portafolio personal | Filtros de proyectos, formulario de contacto real, correo (Resend/SMTP), anti-spam y bandeja con token |
| **02** | **saas** | Landing de producto SaaS | 3 planes de precios desde la API, alta de prueba, newsletter y checkout Stripe opcional |
| **03** | **blog** | Blog / revista digital | 8 artículos en Markdown, paginación real, búsqueda server-side, categorías, página de artículo y CRUD con token |
| **04** | **tienda** | E-commerce | 8 productos con stock, pedidos y líneas, checkout con referencia, IVA y envío calculados, Stripe opcional |
| **05** | **agencia** | Landing de agencia | Proyectos, servicios, cifras, formulario de presupuesto y bandeja de solicitudes con token |
| **06** | **dashboard** | Panel de administración | KPIs, gráficas SVG, productos, clientes, 18 pedidos, login de admin, filtros, export CSV y `PATCH` de estados |
| **07** | **restaurante** | Restaurante + reservas | Carta de 23 platos en 5 categorías, horarios, reseñas y motor de disponibilidad por huecos |

**Recorrido sugerido:**

1. **01-portfolio** → entiende `.env`, la base de datos y los endpoints.
2. **03-blog** → paginación, búsqueda server-side y CRUD.
3. **04-tienda** → transacciones, stock, IVA y checkout.
4. **06-dashboard** → autenticación, filtros y exportación.
5. **02-saas** y **05-agencia** → integraciones (pagos, altas, formularios de negocio).
6. **07-restaurante** → disponibilidad por huecos, el patrón que también necesitan citas de clínica, aulas, hoteles o alquileres.

Cada carpeta es **autoconclusiva**: puedes copiar solo la que te interese y borrar el resto.

### Requisitos

| Requisito | Versión | Comprobarlo |
|---|---|---|
| Node.js | **22.23.4 o superior** (recomendado 24) | `node -v` |
| npm | cualquiera (incluido con Node) | `npm -v` |
| Navegador | Chrome/Edge/Firefox/Safari actuales | – |
| Cuenta de correo/pagos | solo si activas esas integraciones | – |

> ¿Por qué Node 22.23.4? Porque la base de datos usa `node:sqlite`, el módulo SQLite que viene **dentro** de Node. No hay que compilar ni instalar nada.

### Inicio rápido

**Configurador automático (recomendado la primera vez)**

```powershell
# Windows — desde la carpeta plantillas-web
powershell -ExecutionPolicy Bypass -File .\configurar.ps1
```

```bash
# macOS / Linux
bash configurar.sh
```

Comprueba la versión de Node y **crea el `.env` de cada plantilla** a partir de su `.env.example` sin tocar los que ya existan. Para comprobar que las siete APIs responden:

```powershell
powershell -ExecutionPolicy Bypass -File .\verificar.ps1
```

**Arranque manual**

```bash
cd plantillas-web/01-portfolio     # o cualquier otra
npm start                          # → http://localhost:3000
```

Para verlas a la vez, cambia el puerto de cada una:

```powershell
$env:PORT=3101; npm start     # 01-portfolio
$env:PORT=3102; npm start     # 02-saas
$env:PORT=3103; npm start     # 03-blog
$env:PORT=3104; npm start     # 04-tienda
$env:PORT=3105; npm start     # 05-agencia
$env:PORT=3106; npm start     # 06-dashboard
$env:PORT=3107; npm start     # 07-restaurante
```

```bash
# Linux / macOS
PORT=3102 npm start
```

| Comando (dentro de cada plantilla) | Qué hace |
|---|---|
| `npm start` | Levanta servidor + API + web |
| `npm run dev` | Igual, pero reinicia al guardar cualquier archivo |
| `npm run reiniciar` | Borra la base de datos y la vuelve a sembrar con los datos de ejemplo |
| `node server/server.js` | Arranque directo, sin npm |

En la raíz del repositorio, `npm test` ejecuta las pruebas de las siete plantillas con `node --test`.

**Sin servidor**: doble clic en `index.html`. Verás la web completa; los formularios responden en *modo demo* y la consola (`F12`) avisa de que no hay API.

### Estructura del repositorio

```text
plantillas-web/
├── README.md                  ← este documento
├── LICENSE                    ← GPL-3.0 de todo el repositorio
├── .gitignore                 ← raíz: deja fuera .env, BD y node_modules
├── configurar.ps1 / .sh       ← crea cada .env desde su .env.example
├── verificar.ps1              ← arranca las 7 y comprueba su API
├── docs/                      ← guías globales
│   ├── GUIA-USUARIO.md
│   ├── GUIA-DESARROLLADOR.md
│   ├── API.md                 ← índice de todos los endpoints
│   ├── DESPLIEGUE.md
│   └── PERSONALIZACION.md
├── 01-portfolio/
│   ├── index.html
│   ├── 404.html
│   ├── favicon.svg · og.png · manifest.json · robots.txt · sitemap.xml
│   ├── css/styles.css
│   ├── js/main.js             ← comportamiento + cliente API con fallback
│   ├── .env                   ← no se sube a git
│   ├── .env.example
│   ├── package.json
│   ├── README.md
│   └── server/
│       ├── server.js          ← .env → BD → API → estáticos
│       ├── api.js             ← aquí se añaden rutas nuevas
│       ├── reset.js
│       ├── datos/semillas.js  ← esquema SQL + datos de ejemplo
│       ├── data/*.db          ← generada, ignorada por git
│       └── lib/               ← utilidades compartidas
└── 02-saas/ … 07-restaurante/ ← misma estructura
```

**Qué se sube a git:** HTML, CSS, JS, README, `LICENSE`, `package.json`, `.gitignore`, scripts `.ps1`/`.sh` y cada `.env.example`.

**Qué queda fuera:** `.env` con claves reales, `server/data/*.db*`, `node_modules/`, `*.log`, `*.tmp` y `.DS_Store`.

```bash
git init
git add -A
git status        # comprobación: NO debe aparecer ningún .env
git commit -m "Plantillas web: 7 sitios con servidor, API y docs"
```

### El archivo `.env`

Cada plantilla trae dos: `.env.example` (documentado) y `.env` (con valores de demo ya rellenados para arrancar sin tocar nada).

```bash
cp .env.example .env    # Windows: copy .env.example .env
npm start
```

| Variable | Para qué |
|---|---|
| `PORT` / `HOST` | dónde escucha el servidor |
| `SITE_URL` | URL pública (enlaces en correos) |
| `DB_FILE` | ruta de la base SQLite |
| `ADMIN_TOKEN` | clave de las operaciones de administración (header `x-admin-token`) |
| `TRUST_PROXY` | `1` si hay proxy inverso delante: el límite usa la IP real de `X-Forwarded-For` |
| `CSP` | cabecera `Content-Security-Policy`: activa por defecto, `0` la desactiva |
| `LIMITE_*` | envíos máximos por IP y minuto |
| `RESEND_API_KEY` / `EMAIL_DE` | correo real por API REST, sin instalar nada |
| `SMTP_HOST` … | correo real por SMTP (requiere `npm install nodemailer`) |
| `CORS` / `CORS_ORIGEN` | si otra web consumirá la API |

Específicas: `STRIPE_*` (02 y 04), `IVA`/`ENVIO_*` (04), `DIAS_PRUEBA` (02), `POR_PAGINA` (03), `ADMIN_USER`/`ADMIN_PASSWORD` (06), `MAX_POR_HORA`/`INTERVALO_RESERVA`/`COMENSALES_MAX`/`DIAS_MAX_RESERVA` (07).

Sin valores configurados todo sigue en modo demo: **la web nunca se rompe**.

### Patrón de API

- Respuesta JSON siempre; errores `{ "error": "mensaje" }` con código HTTP (400 validación · 401 token · 404 no existe · 429 límite · 500 servidor).
- Escrituras con `Content-Type: application/json`.
- Administración con header `x-admin-token: <ADMIN_TOKEN>`.
- Todas responden `GET /api/salud`:

```bash
curl http://localhost:3000/api/salud
```

> En **PowerShell**, para enviar JSON usa un archivo:
> `curl.exe -X POST http://localhost:3000/api/contacto -H "Content-Type: application/json" --data-binary "@cuerpo.json"` (las comillas de `-d` directo se estropean al pasar a la consola).

El índice completo de endpoints está en [docs/API.md](docs/API.md).

### Personalizar una plantilla

**Cambiar la identidad (10 minutos)**

1. **Textos e imágenes**: todo en `index.html`.
2. **Color principal**: `css/styles.css` → `:root` → `--color-primary` (y el tema oscuro en `[data-theme="dark"]`). Se recolorea todo, incluidas las gráficas.
3. **Tipografías**: cambia el `<link>` de Google Fonts y luego `--font-heading` / `--font-body`.
4. **Marca/logos**: son SVG inline o texto.

**Añadir contenido**

| Quiero… | Dónde |
|---|---|
| añadir un proyecto/artículo/producto | README de la plantilla → «añadir…» (HTML, BD o `POST` a la API) |
| añadir una sección nueva | `<section>` en `index.html` + enlace en el menú + CSS (clases `.tarjeta`, `.rejilla-2`…) |
| añadir un campo a un formulario | HTML → `js/main.js` (body del fetch) → `server/api.js` (validación + INSERT) → `server/datos/semillas.js` (columna) |
| añadir un endpoint | `server/api.js`: `api.get('/api/x', ctx => ctx.json(...))` |
| añadir una tabla | `ESQUEMA` en `server/datos/semillas.js` + `npm run reiniciar` |

**Quitar cosas**

- **Sección**: borra el `<section>` y su enlace de menú. El JS es defensivo: si no encuentra el elemento, no falla.
- **Endpoint**: borra su bloque en `server/api.js`.
- **Tabla/columna**: edítalas en `semillas.js` y `npm run reiniciar` (o `ALTER TABLE` si no quieres perder datos).
- **Servidor entero**: puedes borrar `server/` y quedarte con el modo estático; las webs siguen viéndose.

**Conectar servicios reales**

| Necesidad | Opción rápida | Opción profesional |
|---|---|---|
| Correo | Resend (`RESEND_API_KEY`) | SMTP + `nodemailer` |
| Pagos | modo demo (ya funciona) | Stripe (`STRIPE_SECRET_KEY`, sin instalar nada) |
| Contenidos | editar la BD o `semillas.js` | CMS headless (Sanity, Strapi, WordPress + REST) |
| Analytics | Plausible/Umami (1 `<script>`) | GA4 |
| Formularios externos | Formspree/Web3Forms | tu propia API (ya la tienes) |
| Usuarios | token en `.env` (demo) | `bcrypt` + `jsonwebtoken`, Auth0 o Clerk |

### Despliegue

1. Sube la carpeta a un servicio Node (Railway, Render, Fly.io, un VPS…).
2. Variables de entorno en el panel: `PORT` (la da la plataforma), `HOST=0.0.0.0`, `ADMIN_TOKEN` largo, `SITE_URL=https://tudominio.com` y las claves de correo/pagos.
3. Comando de arranque: `node server/server.js`.
4. Persistencia: monta un volumen en `server/data/` o apunta `DB_FILE` a una ruta persistente. Haz copias de seguridad del `.db`.
5. HTTPS con el certificado de la plataforma o Caddy/Let's Encrypt.
6. Alternativa sin servidor (solo HTML): GitHub Pages o Netlify — **pierdes la API** y las webs quedan en modo demo.

Detalles en [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

### Seguridad antes de publicar

- [ ] Cambia `ADMIN_TOKEN`, `ADMIN_USER` y `ADMIN_PASSWORD`.
- [ ] `.env` fuera de git y **nunca** compartido (el servidor lo bloquea con 403, pero mejor que ni suba).
- [ ] HTTPS activo.
- [ ] Límites de envío activos (`LIMITE_*`).
- [ ] `CORS=0` si nadie de otro dominio necesita la API.
- [ ] `TRUST_PROXY=1` **solo** si hay un proxy inverso delante; si no, déjalo en `0`.
- [ ] Revisa la `CSP` si añades scripts o formularios externos: por defecto solo permite recursos propios y Google Fonts.
- [ ] Copias de seguridad de la base de datos.
- [ ] Si expones la API a Internet, añade validación de esquema (`zod`) y, si crece, autenticación por usuario.

### Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `No se pudo cargar "node:sqlite"` | Instala Node ≥ 22.23.4 (`node -v`) |
| `EADDRINUSE` / puerto ocupado | Cambia `PORT` en `.env` o en la línea de comandos |
| La web va pero «no envía» | No hay servidor: `npm start` y abre `http://localhost:3000` |
| `429 Demasiados envíos` | Espera 1 minuto o sube `LIMITE_*` en `.env` |
| `401 Token no válido` | Usa `x-admin-token: <ADMIN_TOKEN>` del `.env` |
| Los cambios del `.env` no hacen efecto | Reinicia el servidor |
| Aparece un warning de SQLite | Es `ExperimentalWarning`, inofensivo (los scripts npm ya lo silencian) |
| El navegador cachea CSS/JS viejos | `Ctrl + F5` |

### Documentación

| Documento | Para quién | Qué encontrarás |
|---|---|---|
| [docs/GUIA-USUARIO.md](docs/GUIA-USUARIO.md) | Quien no programa | Instalación, recorrido por las 7 webs, dónde ver los datos y checklist de prueba |
| [docs/GUIA-DESARROLLADOR.md](docs/GUIA-DESARROLLADOR.md) | Quien toca código | Arquitectura, ciclo de una petición, librerías compartidas, patrones, recetas y pruebas |
| [docs/API.md](docs/API.md) | Consulta rápida | Todos los endpoints con códigos, auth y ejemplos `curl` |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | Quien publica | VPS con HTTPS, PaaS, backups y checklist |
| [docs/PERSONALIZACION.md](docs/PERSONALIZACION.md) | Quien personaliza | Paleta, textos, datos y tabla «quiero X → dónde tocar» |
| `README.md` de cada plantilla | Ambos | Referencia técnica de esa plantilla, en 12 secciones |

**Orden recomendado:** primero la guía de usuario, después el README de la plantilla que te interese y la guía de desarrollador cuando vayas a cambiar código.

### Licencia

**GPL-3.0** — Copyright (C) 2026 Alberto Ortiz. Puedes usar, copiar y modificar el código; si lo distribuyes, publica su fuente bajo la misma licencia. Consulta [LICENSE](LICENSE).

---

## English

### Table of contents

- [Overview](#overview)
- [The seven templates](#the-seven-templates)
- [Requirements](#requirements)
- [Quickstart](#quickstart)
- [Repository structure](#repository-structure)
- [The `.env` file](#the-env-file)
- [API conventions](#api-conventions)
- [Customizing a template](#customizing-a-template)
- [Deployment](#deployment)
- [Security checklist](#security-checklist)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [License](#license)

### Overview

Seven **vanilla HTML + CSS + JavaScript** templates that are no longer static: each one ships its own **Node server**, **REST API** and **SQLite database**, with a configurable `.env` and documentation to make them yours.

> **Design principle:** *zero mandatory dependencies*. Everything starts with `npm start` **without running `npm install`**: only native Node modules are used (`node:http`, `node:fs`, `node:sqlite`, `fetch`…). External libraries (Stripe, nodemailer, express…) are **optional**.

**Shared by all of them:**

- `server/lib/` with `env.js` (`.env` reader), `http.js` (JSON + static files), `router.js` (REST router), `db.js` (SQLite), `email.js` (Resend/SMTP), `limitador.js` (per-IP anti-spam) and `token.js` (constant-time secret comparison with `crypto.timingSafeEqual`).
- `GET /api/salud` to check the API is alive.
- `.env` + `.env.example` + `.gitignore` + `package.json` with scripts.
- A README with the **same structure** across all seven, easy to compare.
- **Dual mode**: open `index.html` with no server and everything works locally on sample data; start the server and it consumes the real API.

### The seven templates

| # | Template | Type of site | What it includes |
|---|---|---|---|
| **01** | **portfolio** | Personal portfolio | Project filters, a real contact form, email (Resend/SMTP), anti-spam and a token-protected inbox |
| **02** | **saas** | SaaS product landing | 3 pricing plans served from the API, trial signup, newsletter and optional Stripe checkout |
| **03** | **blog** | Blog / digital magazine | 8 Markdown articles, real pagination, server-side search, categories, article page and token-protected CRUD |
| **04** | **tienda** | E-commerce | 8 products with stock, orders and order lines, checkout with reference, VAT and shipping calculated, optional Stripe |
| **05** | **agencia** | Agency landing | Projects, services, stats, quote request form and a token-protected lead inbox |
| **06** | **dashboard** | Admin panel | KPIs, SVG charts, products, customers, 18 orders, admin login, filters, CSV export and status `PATCH` |
| **07** | **restaurante** | Restaurant + bookings | 23-dish menu across 5 categories, opening hours, reviews and a time-slot availability engine |

**Suggested path:**

1. **01-portfolio** → learn `.env`, the database and the endpoints.
2. **03-blog** → pagination, server-side search and CRUD.
3. **04-tienda** → transactions, stock, VAT and checkout.
4. **06-dashboard** → authentication, filters and exports.
5. **02-saas** and **05-agencia** → integrations (payments, signups, business forms).
6. **07-restaurante** → slot availability, the same pattern clinic appointments, classrooms, hotels or equipment rentals need.

Each folder is **self-contained**: copy the one you want and delete the rest.

### Requirements

| Requirement | Version | How to check |
|---|---|---|
| Node.js | **22.23.4 or later** (24 recommended) | `node -v` |
| npm | any (bundled with Node) | `npm -v` |
| Browser | Current Chrome/Edge/Firefox/Safari | – |
| Email/payment account | Only if you enable those integrations | – |

> Why Node 22.23.4? Because the database uses `node:sqlite`, the SQLite module **built into** Node. No compilation, no packages.

### Quickstart

**Automated setup (recommended the first time)**

```powershell
# Windows — from the plantillas-web folder
powershell -ExecutionPolicy Bypass -File .\configurar.ps1
```

```bash
# macOS / Linux
bash configurar.sh
```

It checks the Node version and **creates each template's `.env`** from its `.env.example`, leaving existing files untouched. To verify all seven APIs respond:

```powershell
powershell -ExecutionPolicy Bypass -File .\verificar.ps1
```

**Manual start**

```bash
cd plantillas-web/01-portfolio     # or any other
npm start                          # → http://localhost:3000
```

To run them side by side, change each port:

```powershell
$env:PORT=3101; npm start     # 01-portfolio
$env:PORT=3102; npm start     # 02-saas
$env:PORT=3103; npm start     # 03-blog
$env:PORT=3104; npm start     # 04-tienda
$env:PORT=3105; npm start     # 05-agencia
$env:PORT=3106; npm start     # 06-dashboard
$env:PORT=3107; npm start     # 07-restaurante
```

```bash
# Linux / macOS
PORT=3102 npm start
```

| Command (inside any template) | What it does |
|---|---|
| `npm start` | Starts server + API + site |
| `npm run dev` | Same, restarting on any file change |
| `npm run reiniciar` | Wipes the database and reseeds the sample data |
| `node server/server.js` | Direct start, no npm |

At the repository root, `npm test` runs the test suite for all seven templates with `node --test`.

**Without a server**: double-click `index.html`. The full site renders; forms reply in *demo mode* and the console (`F12`) warns that no API is available.

### Repository structure

```text
plantillas-web/
├── README.md                  ← this document
├── LICENSE                    ← GPL-3.0 for the whole repository
├── .gitignore                 ← root: keeps .env, databases and node_modules out
├── configurar.ps1 / .sh       ← builds each .env from its .env.example
├── verificar.ps1              ← starts the 7 and checks their APIs
├── docs/                      ← global guides
│   ├── GUIA-USUARIO.md
│   ├── GUIA-DESARROLLADOR.md
│   ├── API.md                 ← index of every endpoint
│   ├── DESPLIEGUE.md
│   └── PERSONALIZACION.md
├── 01-portfolio/
│   ├── index.html
│   ├── 404.html
│   ├── favicon.svg · og.png · manifest.json · robots.txt · sitemap.xml
│   ├── css/styles.css
│   ├── js/main.js             ← behaviour + API client with fallback
│   ├── .env                   ← not committed
│   ├── .env.example
│   ├── package.json
│   ├── README.md
│   └── server/
│       ├── server.js          ← .env → DB → API → static files
│       ├── api.js             ← new routes go here
│       ├── reset.js
│       ├── datos/semillas.js  ← SQL schema + sample data
│       ├── data/*.db          ← generated, git-ignored
│       └── lib/               ← shared helpers
└── 02-saas/ … 07-restaurante/ ← same structure
```

**Committed:** HTML, CSS, JS, README, `LICENSE`, `package.json`, `.gitignore`, `.ps1`/`.sh` scripts and each `.env.example`.

**Excluded:** `.env` with real keys, `server/data/*.db*`, `node_modules/`, `*.log`, `*.tmp` and `.DS_Store`.

```bash
git init
git add -A
git status        # check: no .env file should show up
git commit -m "Web templates: 7 sites with server, API and docs"
```

### The `.env` file

Each template ships two: `.env.example` (documented) and `.env` (demo values already filled in so it runs untouched).

```bash
cp .env.example .env    # Windows: copy .env.example .env
npm start
```

| Variable | Purpose |
|---|---|
| `PORT` / `HOST` | where the server listens |
| `SITE_URL` | public URL (used in emails) |
| `DB_FILE` | path to the SQLite database |
| `ADMIN_TOKEN` | key for admin operations (`x-admin-token` header) |
| `TRUST_PROXY` | `1` behind a reverse proxy: rate limits use the real IP from `X-Forwarded-For` |
| `CSP` | `Content-Security-Policy` header: on by default, `0` disables it |
| `LIMITE_*` | max submissions per IP and minute |
| `RESEND_API_KEY` / `EMAIL_DE` | real email over REST, no install needed |
| `SMTP_HOST` … | real email over SMTP (requires `npm install nodemailer`) |
| `CORS` / `CORS_ORIGEN` | if another site will consume the API |

Template-specific: `STRIPE_*` (02 and 04), `IVA`/`ENVIO_*` (04), `DIAS_PRUEBA` (02), `POR_PAGINA` (03), `ADMIN_USER`/`ADMIN_PASSWORD` (06), `MAX_POR_HORA`/`INTERVALO_RESERVA`/`COMENSALES_MAX`/`DIAS_MAX_RESERVA` (07).

With no values set everything stays in demo mode: **the site never breaks**.

### API conventions

- Always JSON; errors are `{ "error": "message" }` with an HTTP status (400 validation · 401 token · 404 missing · 429 rate limit · 500 server).
- Writes use `Content-Type: application/json`.
- Admin endpoints require `x-admin-token: <ADMIN_TOKEN>`.
- All templates answer `GET /api/salud`:

```bash
curl http://localhost:3000/api/salud
```

> On **PowerShell**, send JSON from a file:
> `curl.exe -X POST http://localhost:3000/api/contacto -H "Content-Type: application/json" --data-binary "@body.json"` (inline `-d` quoting breaks in the console).

The full endpoint index lives in [docs/API.md](docs/API.md).

### Customizing a template

**Change the identity (10 minutes)**

1. **Copy and images**: all in `index.html`.
2. **Primary colour**: `css/styles.css` → `:root` → `--color-primary` (dark theme in `[data-theme="dark"]`). Everything recolours, charts included.
3. **Fonts**: change the Google Fonts `<link>`, then `--font-heading` / `--font-body`.
4. **Brand/logos**: inline SVG or text.

**Add content**

| I want to… | Where |
|---|---|
| add a project/article/product | the template README → "adding…" (HTML, DB or `POST` to the API) |
| add a new section | `<section>` in `index.html` + menu link + CSS (`.tarjeta`, `.rejilla-2`… classes) |
| add a form field | HTML → `js/main.js` (fetch body) → `server/api.js` (validation + INSERT) → `server/datos/semillas.js` (column) |
| add an endpoint | `server/api.js`: `api.get('/api/x', ctx => ctx.json(...))` |
| add a table | `ESQUEMA` in `server/datos/semillas.js` + `npm run reiniciar` |

**Remove things**

- **Section**: delete the `<section>` and its menu link. The JS is defensive: a missing element is not an error.
- **Endpoint**: delete its block in `server/api.js`.
- **Table/column**: edit `semillas.js` and run `npm run reiniciar` (or `ALTER TABLE` to keep data).
- **The whole server**: delete `server/` and keep static mode; the sites still render.

**Connect real services**

| Need | Quick option | Professional option |
|---|---|---|
| Email | Resend (`RESEND_API_KEY`) | SMTP + `nodemailer` |
| Payments | demo mode (already works) | Stripe (`STRIPE_SECRET_KEY`, nothing to install) |
| Content | edit the DB or `semillas.js` | headless CMS (Sanity, Strapi, WordPress + REST) |
| Analytics | Plausible/Umami (one `<script>`) | GA4 |
| External forms | Formspree/Web3Forms | your own API (you already have it) |
| Users | token in `.env` (demo) | `bcrypt` + `jsonwebtoken`, Auth0 or Clerk |

### Deployment

1. Upload the folder to a Node host (Railway, Render, Fly.io, a VPS…).
2. Environment variables in the panel: `PORT` (provided by the platform), `HOST=0.0.0.0`, a long `ADMIN_TOKEN`, `SITE_URL=https://yourdomain.com` and the email/payment keys.
3. Start command: `node server/server.js`.
4. Persistence: mount a volume on `server/data/` or point `DB_FILE` at a persistent path. Back up the `.db` file.
5. HTTPS with the platform certificate or Caddy/Let's Encrypt.
6. Serverless alternative (HTML only): GitHub Pages or Netlify — **you lose the API** and the sites stay in demo mode.

Details in [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

### Security checklist

- [ ] Change `ADMIN_TOKEN`, `ADMIN_USER` and `ADMIN_PASSWORD`.
- [ ] Keep `.env` out of git and **never** share it (the server blocks it with 403, but it should not be uploaded at all).
- [ ] HTTPS enabled.
- [ ] Rate limits on (`LIMITE_*`).
- [ ] `CORS=0` if no other domain needs the API.
- [ ] `TRUST_PROXY=1` **only** behind a reverse proxy; otherwise leave it at `0`.
- [ ] Review `CSP` if you add external scripts or forms: by default only same-origin assets and Google Fonts are allowed.
- [ ] Database backups.
- [ ] If the API is public, add schema validation (`zod`) and, as it grows, per-user authentication.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `No se pudo cargar "node:sqlite"` | Install Node ≥ 22.23.4 (`node -v`) |
| `EADDRINUSE` / port in use | Change `PORT` in `.env` or on the command line |
| Site loads but "won't submit" | No server: run `npm start` and open `http://localhost:3000` |
| `429 Demasiados envíos` | Wait a minute or raise `LIMITE_*` in `.env` |
| `401 Token no válido` | Use `x-admin-token: <ADMIN_TOKEN>` from `.env` |
| `.env` changes have no effect | Restart the server |
| A SQLite warning appears | It is an `ExperimentalWarning`, harmless (the npm scripts silence it) |
| Browser caches old CSS/JS | `Ctrl + F5` |

### Documentation

| Document | Audience | Contents |
|---|---|---|
| [docs/GUIA-USUARIO.md](docs/GUIA-USUARIO.md) | Non-programmers | Install, a click-by-click tour of the 7 sites, where the data lands and a test checklist |
| [docs/GUIA-DESARROLLADOR.md](docs/GUIA-DESARROLLADOR.md) | Code contributors | Architecture, request lifecycle, shared libraries, patterns, recipes and tests |
| [docs/API.md](docs/API.md) | Quick reference | Every endpoint with status codes, auth and `curl` examples |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | People deploying | VPS with HTTPS, PaaS, backups and a go-live checklist |
| [docs/PERSONALIZACION.md](docs/PERSONALIZACION.md) | People customizing | Palette, copy, data and a "I want X → where to edit" table |
| Each template's `README.md` | Everyone | Technical reference for that template, in 12 sections |

**Recommended order:** the user guide first, then the README of the template you care about, then the developer guide when you start changing code.

### License

**GPL-3.0** — Copyright (C) 2026 Alberto Ortiz. You may use, copy and modify the code; if you distribute it, publish the source under the same license. See [LICENSE](LICENSE).
