# Plantillas web · 7 demos con servidor, API y base de datos

Siete plantillas de HTML + CSS + JavaScript vanilla que **ya no son estáticas**:
cada una lleva su **servidor Node, su API REST y su base de datos SQLite**, con
`.env` rellenable y documentación para hacerlas tuyas (añadir, quitar y
conectar lo que necesites).

> **Principio de diseño:** *cero dependencias obligatorias*.
> Todo arranca con `npm start` **sin ejecutar `npm install`**: solo se usan
> módulos nativos de Node (`node:http`, `node:fs`, `node:sqlite`, `fetch`…).
> Las librerías externas (Stripe, nodemailer, express…) son **opcionales** y
> están documentadas en el README de cada plantilla.

> 📚 **Documentación completa**
> - **Aquí mismo** → [guía de usuario](docs/GUIA-USUARIO.md) ·
>   [guía de desarrollador](docs/GUIA-DESARROLLADOR.md) ·
>   [índice de la API](docs/API.md) · [despliegue](docs/DESPLIEGUE.md) ·
>   [personalización](docs/PERSONALIZACION.md)
> - **En cada plantilla** → su `README.md` (12 secciones) +
>   `docs/GUIA-USUARIO.md` y `docs/GUIA-DESARROLLADOR.md`.

---

## 1. Requisitos

| Requisito | Versión | Comprobarlo |
|---|---|---|
| Node.js | **22.13 o superior** (recomendado 24) | `node -v` |
| npm | cualquier (incluido con Node) | `npm -v` |
| Navegador | Chrome/Edge/Firefox/Safari actuales | – |
| Cuenta de correo/pagos | solo si activas esas integraciones | – |

> ¿Por qué Node 22.13? Porque la base de datos usa `node:sqlite`, el módulo
> SQLite que viene **dentro** de Node. No hay que compilar ni instalar nada.

---

## 2. Qué necesita cada plantilla

| # | Plantilla | Tipo de web | Servidor | BD (SQLite) | API | Fuentes de datos | Extras específicos |
|---|---|---|:-:|:-:|:-:|---|---|
| **01** | **portfolio** | Portafolio personal | ✅ | ✅ | ✅ | proyectos + mensajes de contacto | Envío de correo (Resend/SMTP), anti-spam, bandeja con token |
| **02** | **saas** | Landing de producto SaaS | ✅ | ✅ | ✅ | 3 planes de precios + suscripciones + newsletter | Registro de prueba, pagos Stripe (opcional) |
| **03** | **blog** | Blog / revista digital | ✅ | ✅ | ✅ | 8 artículos (Markdown), categorías, suscriptores | Paginación real, búsqueda server-side, página de artículo, CRUD con token, newsletter |
| **04** | **tienda** | E-commerce | ✅ | ✅ | ✅ | 8 productos con stock, pedidos y líneas | Checkout real con referencia, stock, IVA y envío calculados, Stripe (opcional) |
| **05** | **agencia** | Landing de agencia/estudio | ✅ | ✅ | ✅ | proyectos, servicios, cifras, solicitudes | **Formulario de presupuesto nuevo**, bandeja de solicitudes con token |
| **06** | **dashboard** | Panel de administración | ✅ | ✅ | ✅ | productos, clientes, 18 pedidos, métricas, actividad | Login de admin, filtros server-side, export CSV, PATCH de estados |
| **07** | **restaurante** | Restaurante + reservas de mesa | ✅ | ✅ | ✅ | carta (5 categorías), horarios, reseñas, reservas | **Disponibilidad por huecos**, reserva con referencia, bandeja con token |

**Todas comparten** (está hecho una vez y copiado):

- `server/lib/` → `env.js` (lector de `.env`), `http.js` (JSON + estáticos),
  `router.js` (enrutador REST), `db.js` (SQLite), `email.js` (Resend/SMTP),
  `limitador.js` (anti-spam por IP), `token.js` (comparación de secretos en
  tiempo constante con `crypto.timingSafeEqual`).
- `GET /api/salud` → comprobación de que la API viva.
- `.env` + `.env.example` + `.gitignore` + `package.json` con scripts.
- README con la **misma estructura** en las siete (fácil de comparar).
- **Modo doble**: si abres `index.html` sin servidor, todo sigue funcionando en
  local con datos de ejemplo; si levantas el servidor, consume la API real.

---

## 3. Arranque en 60 segundos

### Configurador automático (recomendado la primera vez)

```powershell
# Windows — desde la carpeta plantillas-web
powershell -ExecutionPolicy Bypass -File .\configurar.ps1
```

```bash
# macOS / Linux
bash configurar.sh
```

Comprueba la versión de Node y **crea el `.env` de cada plantilla** a partir de
su `.env.example` (sin tocar los que ya existen). Para comprobar que las siete
APIs responden:

```powershell
powershell -ExecutionPolicy Bypass -File .\verificar.ps1
```

### Arranque manual

```bash
cd plantillas-web/01-portfolio     # (o cualquier otra)
npm start                          # → http://localhost:3000
```

Repite con cada carpeta cambiando de puerto si las quieres ver a la vez:

```bash
# Windows (PowerShell)
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
| `npm run reiniciar` | Borra la BD y la vuelve a sembrar con los datos de ejemplo |
| `node server/server.js` | Arranque directo, sin npm |

**En la raíz del repositorio** (compartido para las 7):

| Comando | Qué hace |
|---|---|
| `npm test` | pruebas de las 7 plantillas (`node --test`) |

**Sin servidor** (modo estático): doble clic en `index.html`. Verás la web
completa; los formularios responderán en *modo demo* y la consola del navegador
(`F12`) avisará de que no hay API.

---

## 4. Las siete plantillas, en corto

### 01 · portfolio — *el ejemplo de referencia*
Portafolio personal con filtros de proyectos y formulario de contacto **real**.
Es la plantilla más simple: si nunca has tocado un backend, **empieza aquí**
(lee su README de arriba abajo y copiarás el patrón a las demás).
`POST /api/contacto` guarda en SQLite y, si configuras correo, avisa por email.

### 02 · saas — *landing con precios y altas*
Precios de 3 planes **desde la API** (cambias un precio en la BD y se actualiza
la web), alta de prueba con `POST /api/registro`, newsletter y checkout Stripe
opcional. Ideal para validar un producto antes de tener el producto.

### 03 · blog — *contenido en base de datos*
Artículos con cuerpo Markdown guardados en SQLite, listado **paginado de
verdad**, búsqueda server-side, contadores de categoría recalculados, página
`articulo.html?slug=…` y CRUD (`POST/PUT/DELETE /api/articulos`) protegido con
token. Newsletter con suscriptores.

### 04 · tienda — *carrito y pedidos de verdad*
Catálogo con filtros server-side y **stock**; `POST /api/pedidos` valida stock,
calcula subtotal, envío (gratis desde 50 €) e IVA, genera referencia `NV-2026-…`
y descuenta existencias en transacción. Consulta pública de estado por
referencia. Pagos con Stripe opcionales.

### 05 · agencia — *landing con solicitud de presupuesto*
Proyectos y cifras desde la API (se acaba la duplicación tarjeta↔modal) y
**formulario de presupuesto nuevo** con validación, límite anti-spam y bandeja
de solicitudes protegida con token.

### 06 · dashboard — *panel de administración*
Todas las vistas (KPIs, gráficas SVG, productos, clientes, pedidos) se alimentan
de la API con fallback local; filtros de pedidos server-side, `PATCH` de estados,
exportación a CSV y login de administrador con sesiones.

### 07 · restaurante — *reservas con disponibilidad real*
Carta con **23 platos** en 5 categorías (filtros y búsqueda server-side),
horarios por turnos y reseñas. Novedad: **motor de disponibilidad** —
`GET /api/disponibilidad?fecha=&comensales=` devuelve las horas con hueco libre
y `POST /api/reservas` genera una referencia `CO-0041`; bandeja de reservas
protegida con token. Sin servidor, el formulario sigue funcionando en modo demo.

---

## 5. Estructura común

```
plantillas-web/
├── README.md                  ← este documento
├── LICENSE                    ← licencia GPL-3.0 de todo el repositorio
├── .gitignore                 ← raíz: deja fuera .env, BD y node_modules
├── configurar.ps1 / .sh       ← crea cada .env desde su .env.example
├── verificar.ps1              ← arranca las 7 y comprueba su API
├── docs/                      ← guías globales (usuario, dev, API, despliegue…)
│   ├── GUIA-USUARIO.md        ← para quien no programa: uso, clics y cambios fáciles
│   ├── GUIA-DESARROLLADOR.md  ← arquitectura, librerías, patrones y extensiones
│   ├── API.md                 ← índice de TODOS los endpoints de las 7 plantillas
│   ├── DESPLIEGUE.md          ← cómo publicarlas (VPS, PaaS, HTTPS, backups)
│   └── PERSONALIZACION.md     ← recetas para hacerla tuya
├── 01-portfolio/
│   ├── index.html             ← contenido (español)
│   ├── 404.html               ← página de error estilada (status 404 real)
│   ├── favicon.svg · og.png · manifest.json · robots.txt · sitemap.xml
│   │                           ← ficheros SEO: icono, imagen para redes y buscadores
│   ├── css/styles.css         ← paleta, tipografías, componentes
│   ├── js/main.js             ← comportamiento + cliente API (con fallback)
│   ├── .env                   ← configuración local (NO se sube a git)
│   ├── .env.example           ← plantilla comentada para copiar
│   ├── .gitignore
│   ├── package.json           ← scripts npm (sin dependencias)
│   ├── README.md              ← docs específicas de la plantilla
│   └── server/
│       ├── server.js          ← arranque: .env → BD → API → estáticos
│       ├── api.js             ← endpoints (aquí se añaden rutas nuevas)
│       ├── reset.js           ← npm run reiniciar
│       ├── datos/semillas.js  ← esquema SQL + datos de ejemplo
│       ├── data/*.db          ← base SQLite (generada, ignorada por git)
│       └── lib/               ← utilidades compartidas
├── 02-saas/ … 07-restaurante/ ← misma estructura
```

### Repositorio único: un solo `git` para las siete

Todo el árbol está pensado para vivir en **un mismo repositorio**: el
`.gitignore` de la raíz (más el de cada plantilla) excluye lo que nunca debe
subirse. Reglas de la raíz:

| Se sube a git | Se queda fuera |
|---|---|
| HTML, CSS, JS, README, `LICENSE`, `package.json` | `.env` (claves reales) → solo `.env.example` |
| `.gitignore`, scripts `.ps1` / `.sh` | `server/data/*.db*` (se regeneran al arrancar) |
| `.env.example` de cada plantilla | `node_modules/`, `*.log`, `*.tmp`, `.DS_Store` |

```bash
git init
git add -A
git status        # comprobación: NO debe aparecer ningún .env
git commit -m "Plantillas web: 7 sitios con servidor, API y docs"
```

> Si algún día instalas una dependencia opcional (`npm install nodemailer`),
> sube también el `package-lock.json` que se genere.

---

## 6. El fichero `.env`

Cada plantilla trae dos: `.env.example` (documentado) y `.env` (con valores de
demo **ya rellenados** para arrancar sin tocar nada).

```bash
cp .env.example .env    # Windows: copy .env.example .env
npm start
```

Claves comunes a las siete:

| Variable | Para qué |
|---|---|
| `PORT` / `HOST` | dónde escucha el servidor |
| `SITE_URL` | URL pública (enlaces en correos) |
| `DB_FILE` | ruta de la base SQLite |
| `ADMIN_TOKEN` | clave de las operaciones de administración (solo header `x-admin-token`) |
| `TRUST_PROXY` | `1` si hay proxy inverso delante (Caddy/nginx/Cloudflare): el límite usa la IP real del header `X-Forwarded-For` |
| `CSP` | cabecera `Content-Security-Policy`: por defecto activa, `0` la desactiva y un valor personalizado la cambia |
| `LIMITE_*` | envíos máximos por IP y minuto |
| `RESEND_API_KEY` / `EMAIL_DE` | correo real por API REST (sin instalar nada) |
| `SMTP_HOST` … | correo real por SMTP (requiere `npm install nodemailer`) |
| `CORS` / `CORS_ORIGEN` | si otra web consumirá la API |

Específicas: `STRIPE_*` (02 y 04), `IVA`/`ENVIO_*` (04), `DIAS_PRUEBA` (02),
`POR_PAGINA` (03), `ADMIN_USER`/`ADMIN_PASSWORD` (06),
`MAX_POR_HORA`/`INTERVALO_RESERVA`/`COMENSALES_MAX`/`DIAS_MAX_RESERVA` (07).

Todas estas claves **ya están escritas en el `.env` de cada plantilla** (vacías
o con un valor de ejemplo): para activar el servicio solo tienes que pegar el
valor después del `=` y reiniciar (`Ctrl + C` → `npm start`). Sin valores,
todo sigue en modo demo: la web nunca se rompe.

Con correo activo (`RESEND_API_KEY`) los formularios envían de verdad; con
`STRIPE_SECRET_KEY` los pagos abren Stripe de verdad (02 y 04 incluyen también
el webhook `/api/stripe/webhook`, que solo necesita `STRIPE_WEBHOOK_SECRET`).

**Regla:** nada de claves reales en `.env.example` ni en git. `.env` está en
`.gitignore` de cada plantilla.

---

## 7. Patrón de API

- Respuesta JSON siempre; errores `{ "error": "mensaje" }` con código HTTP
  (400 validación · 401 token · 404 no existe · 429 límite · 500 servidor).
- Escrituras con `Content-Type: application/json`.
- Administración con header `x-admin-token: <ADMIN_TOKEN>`.
- Todas las plantillas responden `GET /api/salud` → probar que la API vive:

```bash
curl http://localhost:3000/api/salud
```

> En **PowerShell**, para enviar JSON usa un fichero:
> `curl.exe -X POST http://localhost:3000/api/contacto -H "Content-Type: application/json" --data-binary "@cuerpo.json"` (las comillas del `-d` directo se estropean al pasar a la consola).

---

## 8. Cómo hacer TU web a partir de una plantilla

Cada README tiene sus recetas concretas (con código). Aquí va el mapa global:

### 8.1 Cambiar la identidad (10 minutos)
1. **Textos e imágenes**: todo en `index.html`.
2. **Color principal**: `css/styles.css` → bloque `:root` → `--color-primary`
   (y el tema oscuro en `[data-theme="dark"]`). Se recolorea todo, incluidas
   las gráficas.
3. **Tipografías**: cambia el `<link>` de Google Fonts en el `<head>` y luego
   `--font-heading` / `--font-body`.
4. **Marca/logos**: son SVG inline o texto; edítalos donde los veas.

### 8.2 Añadir contenido
| Quiero… | Dónde |
|---|---|
| añadir un proyecto/artículo/producto | README de la plantilla → "añadir…" (HTML, BD o `POST` a la API) |
| añadir una sección nueva | `<section>` en `index.html` + enlace en el menú + CSS de la sección (usa las clases `.tarjeta`, `.rejilla-2`, etc.) |
| añadir un campo a un formulario | HTML → `js/main.js` (body del fetch) → `server/api.js` (validación + INSERT) → `server/datos/semillas.js` (columna) |
| añadir un endpoint | `server/api.js`: `api.get('/api/x', ctx => ctx.json(...))` |
| añadir una tabla | `ESQUEMA` en `server/datos/semillas.js` + `npm run reiniciar` |

### 8.3 Quitar cosas
- **Sección**: borra el `<section>` y su enlace de menú. El JS es defensivo
  (si no encuentra el elemento, no falla).
- **Endpoint**: borra su bloque en `server/api.js`.
- **Tabla/columna**: edítalas en `semillas.js` y `npm run reiniciar`
  (o `ALTER TABLE` si no quieres perder datos).
- **Servidor entero**: puedes borrar `server/` y quedarte con el modo estático
  (`index.html` doble clic) — las webs siguen viéndose.

### 8.4 Conectar servicios reales
| Necesidad | Opción rápida | Opción profesional |
|---|---|---|
| Correo | Resend (`RESEND_API_KEY`) | SMTP + `nodemailer` |
| Pagos | modo demo (ya funciona) | Stripe (solo pega `STRIPE_SECRET_KEY` en `.env`; sin instalar nada) |
| Contenidos | editar la BD o `semillas.js` | CMS headless (Sanity, Strapi, WordPress + REST) |
| Analytics | Plausible/Umami (1 `<script>`) | GA4 |
| Formularios externos | Formspree/Web3Forms (sustituye el `fetch`) | tu propia API (ya la tienes) |
| Usuarios | token en `.env` (demo) | `bcrypt` + `jsonwebtoken` o Auth0/Clerk |

### 8.5 Ponerla en internet
1. Sube la carpeta a un servicio Node (Railway, Render, Fly.io, un VPS…).
2. Variables de entorno en el panel: `PORT` (la da la plataforma), `HOST=0.0.0.0`,
   `ADMIN_TOKEN` (uno largo), `SITE_URL=https://tudominio.com` y las claves de
   correo/pagos.
3. Comando de arranque: `node server/server.js`.
4. Persistencia: monta un volumen en `server/data/` o apunta `DB_FILE` a una
   ruta persistente; haz copias de seguridad del `.db`.
5. HTTPS con el certificado de la plataforma o Caddy/Let's Encrypt.
6. Alternativa sin servidor (solo HTML): GitHub Pages / Netlify — **pierdes la
   API**; las web siguen en modo demo.

---

## 9. Seguridad antes de publicar (checklist)

- [ ] Cambia `ADMIN_TOKEN`, `ADMIN_USER` y `ADMIN_PASSWORD`.
- [ ] `.env` fuera de git y **nunca** compartido (el servidor lo bloquea con 403,
      pero mejor que ni suba).
- [ ] HTTPS activo.
- [ ] Límites de envío activos (`LIMITE_*`).
- [ ] Revisa `CORS=0` si nadie de otro dominio necesita la API.
- [ ] Activa `TRUST_PROXY=1` **solo** si hay un proxy inverso delante
      (ver [despliegue](docs/DESPLIEGUE.md)); si no, déjalo en `0`.
- [ ] Revisa la `CSP` si añades scripts o formularios externos (analíticas,
      Formspree…): por defecto solo permite recursos propios y Google Fonts.
- [ ] Copias de seguridad de la base de datos.
- [ ] Si expones la API a Internet: añade validación de esquema (`zod`) y, si
      crece, autenticación por usuario (no solo token compartido).

---

## 10. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `No se pudo cargar "node:sqlite"` | Instala Node ≥ 22.13 (`node -v`) |
| `EADDRINUSE` / puerto ocupado | Cambia `PORT` en `.env` o en la línea de comando |
| La web estática pero "no envía" | No hay servidor: `npm start` y abre `http://localhost:3000` |
| `429 Demasiados envíos` | Espera 1 min o sube `LIMITE_*` en `.env` |
| `401 Token no válido` | Usa `x-admin-token: <ADMIN_TOKEN>` del `.env` |
| Los cambios del `.env` no hacen efecto | Reinicia el servidor |
| Aparece un warning de SQLite | Es `ExperimentalWarning` e inofensivo (los scripts npm ya lo silencian) |
| El navegador cachea CSS/JS viejos | Ctrl + F5 |

---

## 11. Recorrido sugerido

1. **01-portfolio** → entiende `.env`, la BD y los endpoints.
2. **03-blog** → añade paginación, búsqueda server-side y CRUD.
3. **04-tienda** → transacciones, stock, IVA y checkout.
4. **06-dashboard** → autenticación, filtros y exportación de datos.
5. **02-saas** y **05-agencia** → integraciones (pagos, alta de cuentas,
   formularios de negocio).
6. **07-restaurante** → **disponibilidad por huecos**: el patrón que necesitan
   también citas de clínica, aulas, hoteles o alquileres de material.

Cada carpeta es **autoconclusiva**: puedes copiar solo la que te interese y
borrar el resto. Después, sigue el README de esa plantilla: está escrito para
llevarla de "demo" a "web real".

---

## 12. Documentación completa

| Documento | Para quién | Qué encontrarás |
|---|---|---|
| [docs/GUIA-USUARIO.md](docs/GUIA-USUARIO.md) | Quien **no programa** | Instalación, recorrido por las 7 webs clic a clic, dónde ver los datos que llegan, cambios sin tocar código y checklist de prueba |
| [docs/GUIA-DESARROLLADOR.md](docs/GUIA-DESARROLLADOR.md) | Quien **va a tocar código** | Arquitectura y ciclo de una petición, las 7 librerías compartidas, patrones del front, convenciones, recetas de extensión con código, pruebas y seguridad |
| [docs/API.md](docs/API.md) | Consulta rápida | Índice de **todos** los endpoints de las 7 plantillas con códigos, auth y ejemplos `curl` |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | Quien la **publica** | VPS con HTTPS, plataformas PaaS (ojo al disco efímero), backups de la BD y checklist antes de abrir |
| [docs/PERSONALIZACION.md](docs/PERSONALIZACION.md) | Quien la **personaliza** | Paleta, textos, imágenes, datos desde la BD, `.env` por plantilla y tabla «quiero X → dónde tocar» |
| `README.md` de cada plantilla | Ambos | Referencia técnica de esa plantilla: arranque, `.env`, API, BD, recetas, problemas y seguridad (12 secciones) |
| `docs/` de cada plantilla | Ambos | `GUIA-USUARIO.md` (uso real de esa web) y `GUIA-DESARROLLADOR.md` (su API completa y sus extensiones) |
| [LICENSE](LICENSE) | Todos | **Licencia GPL-3.0** — Copyright (C) 2026 Alberto Ortiz. Puedes usar, copiar y modificar el código; si lo distribuyes, publica su fuente bajo la misma licencia |


**Orden recomendado:** primero la [guía de usuario](docs/GUIA-USUARIO.md) para
verlo funcionar, después el [README de la plantilla](01-portfolio/README.md) que
te interese, y la [guía de desarrollador](docs/GUIA-DESARROLLADOR.md) cuando
vayas a cambiar código.


# Web Templates · 7 Demos with Server, REST API & Database

Seven vanilla HTML + CSS + JavaScript web templates that are **no longer static**:
each includes its own **Node server, REST API, and SQLite database**, with a
configurable `.env` and full documentation to customize them (add, remove, and
connect whatever you need).

> **Design Principle:** *zero mandatory dependencies*.
> Everything runs with `npm start` **without running `npm install**`: only native
> Node modules are used (`node:http`, `node:fs`, `node:sqlite`, `fetch`…).
> External libraries (Stripe, nodemailer, express…) are **optional** and
> documented in each template's README.

> 📚 **Complete Documentation**
> * **In root** → [user guide](https://www.google.com/search?q=docs/GUIA-USUARIO.md) ·
> [developer guide](https://www.google.com/search?q=docs/GUIA-DESARROLLADOR.md) ·
> [API index](https://www.google.com/search?q=docs/API.md) · [deployment](https://www.google.com/search?q=docs/DESPLIEGUE.md) ·
> [customization](https://www.google.com/search?q=docs/PERSONALIZACION.md)
> * **In each template** → its own `README.md` (12 sections) +
> `docs/GUIA-USUARIO.md` and `docs/GUIA-DESARROLLADOR.md`.
> 
> 

---

## 1. Requirements

| Requirement | Version | How to check |
| --- | --- | --- |
| Node.js | **22.13 or higher** (24 recommended) | `node -v` |
| npm | Any (bundled with Node) | `npm -v` |
| Browser | Modern Chrome / Edge / Firefox / Safari | – |
| Email / Payment account | Only if enabling those integrations | – |

> Why Node 22.13? Because the database relies on `node:sqlite`, the built-in
> SQLite module **included directly** in Node. No compilation or external packages needed.

---

## 2. Template Overview

| # | Template | Type of Web | Server | DB (SQLite) | API | Data Sources | Specific Extras |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **01** | **portfolio** | Personal portfolio | ✅ | ✅ | ✅ | Projects + contact messages | Email dispatch (Resend/SMTP), rate limiting, token-protected inbox |
| **02** | **saas** | SaaS landing page | ✅ | ✅ | ✅ | 3 pricing plans + signups + newsletter | Trial registration, optional Stripe checkout |
| **03** | **blog** | Blog / digital magazine | ✅ | ✅ | ✅ | 8 articles (Markdown), categories, subscribers | Real pagination, server-side search, post page, token-protected CRUD, newsletter |
| **04** | **tienda** | E-commerce store | ✅ | ✅ | ✅ | 8 products with inventory, orders, and order lines | Real checkout with order ref, stock checks, tax & shipping calculation, optional Stripe |
| **05** | **agencia** | Agency / studio landing | ✅ | ✅ | ✅ | Projects, services, stats, leads | **New quote request form**, token-protected lead inbox |
| **06** | **dashboard** | Admin panel | ✅ | ✅ | ✅ | Products, customers, 18 orders, metrics, activity log | Admin login, server-side filters, CSV export, status updates via PATCH |
| **07** | **restaurante** | Restaurant + table booking | ✅ | ✅ | ✅ | Menu (5 categories), opening hours, reviews, bookings | **Time-slot availability engine**, booking reference code, token-protected booking list |

**Shared across all templates** (built once, reused throughout):

* `server/lib/` → `env.js` (`.env` reader), `http.js` (JSON + static assets),
`router.js` (REST router), `db.js` (SQLite wrapper), `email.js` (Resend/SMTP),
`limitador.js` (IP-based rate limiting), `token.js` (constant-time secret comparison with `crypto.timingSafeEqual`).
* `GET /api/salud` → health-check endpoint.
* `.env` + `.env.example` + `.gitignore` + `package.json` with scripts.
* Consistent README **structure across all seven** (easy to compare).
* **Dual-mode support**: open `index.html` directly without a server and it falls back
to local mock data; start the server and it consumes the live REST API.

---

## 3. Quickstart in 60 Seconds

### Automated Setup (Recommended on first run)

```powershell
# Windows — from the plantillas-web directory
powershell -ExecutionPolicy Bypass -File .\configurar.ps1

```

```bash
# macOS / Linux
bash configurar.sh

```

Checks the active Node version and **generates each template's `.env` file** from
its `.env.example` (preserving any existing `.env` files). To verify all seven APIs respond:

```powershell
powershell -ExecutionPolicy Bypass -File .\verificar.ps1

```

### Manual Start

```bash
cd plantillas-web/01-portfolio     # (or any other directory)
npm start                          # → http://localhost:3000

```

Repeat for each template, specifying custom ports if running them simultaneously:

```bash
# Windows (PowerShell)
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

| Command (inside any template folder) | Description |
| --- | --- |
| `npm start` | Starts server + REST API + serves static web |
| `npm run dev` | Same as start, with auto-restart on file changes |
| `npm run reiniciar` | Wipes the SQLite database and reseeds mock data |
| `node server/server.js` | Direct execution without npm |

**From repository root** (shared across all 7):

| Command | Description |
| --- | --- |
| `npm test` | Runs automated tests for all 7 templates (`node --test`) |

**Without a server** (static mode): Double-click `index.html`. The full layout will render;
forms will run in *demo mode* and the browser console (`F12`) will note that the API is offline.

---

## 4. The Seven Templates at a Glance

### 01 · portfolio — *The reference blueprint*

Personal portfolio with project category filters and a **functional** contact form.
The most straightforward template: if you are new to backend development, **start here**
(read its README end-to-end to learn patterns applicable to all others).
`POST /api/contacto` persists messages to SQLite and sends an email notification if configured.

### 02 · saas — *Landing page with pricing & signups*

Pricing table with 3 tiers served **directly from the API** (updating prices in the DB
reflects instantly on the site), trial registrations via `POST /api/registro`, newsletter signup,
and optional Stripe Checkout. Ideal for validating product concepts early.

### 03 · blog — *Database-driven content*

Articles with Markdown bodies stored in SQLite, **genuine pagination**,
server-side search, dynamic category counters, individual post views at
`articulo.html?slug=…`, and token-protected CRUD (`POST/PUT/DELETE /api/articulos`).
Includes newsletter subscription handling.

### 04 · tienda — *Real shopping cart & order fulfillment*

Product catalog with server-side filters and **inventory tracking**; `POST /api/pedidos`
validates stock, calculates subtotal, shipping (free over 50 €), and VAT, generates an
order reference (`NV-2026-…`), and decrements stock within a transaction.
Public order tracking by reference and optional Stripe payments.

### 05 · agencia — *Agency landing with quote request pipeline*

Projects and case study metrics pulled from the API (eliminating card↔modal duplication) and
a **brand-new quote request form** featuring client-side validation, anti-spam rate limiting,
and a token-protected submissions dashboard.

### 06 · dashboard — *Administrative control panel*

All views (KPI cards, inline SVG charts, inventory, customers, order lists) pull from the
API with local fallback; includes server-side order filtering, status `PATCH` updates,
CSV export, and session-based admin authentication.

### 07 · restaurante — *Table reservations with live availability*

Menu featuring **23 items** across 5 categories (server-side search and filters),
shift-based operating hours, and customer reviews. Feature highlight: **slot-based availability engine** —
`GET /api/disponibilidad?fecha=&comensales=` returns open booking windows, and `POST /api/reservas`
creates reservations with tracking codes (e.g., `CO-0041`); includes token-protected reservations management.
Works in demo mode if opened without a server.

---

## 5. Directory Structure

```
plantillas-web/
├── README.md                  ← This documentation
├── LICENSE                    ← Root GPL-3.0 license
├── .gitignore                 ← Root ignore: excludes .env files, DB files, and node_modules
├── configurar.ps1 / .sh       ← Generates each template's .env from .env.example
├── verificar.ps1              ← Boots all 7 and performs health checks
├── docs/                      ← Global guides (user, developer, API, deployment…)
│   ├── GUIA-USUARIO.md        ← For non-programmers: usage, workflows, simple edits
│   ├── GUIA-DESARROLLADOR.md  ← Architecture, shared libraries, patterns, extensions
│   ├── API.md                 ← Comprehensive endpoint index across all 7 templates
│   ├── DESPLIEGUE.md          ← Deployment guide (VPS, PaaS, HTTPS, backups)
│   └── PERSONALIZACION.md     ← Customization recipes and tips
├── 01-portfolio/
│   ├── index.html             ← Markup (Spanish)
│   ├── 404.html               ← Custom 404 error page (delivers real 404 status)
│   ├── favicon.svg · og.png · manifest.json · robots.txt · sitemap.xml
│   │                          ← SEO assets: icons, Open Graph images, crawler rules
│   ├── css/styles.css         ← Color palette, typography, responsive components
│   ├── js/main.js             ← Interactivity + API client (with offline fallback)
│   ├── .env                   ← Local configuration (NEVER commit to git)
│   ├── .env.example           ← Documented configuration template
│   ├── .gitignore
│   ├── package.json           ← npm scripts (zero dependencies required)
│   ├── README.md              ← Template-specific documentation
│   └── server/
│       ├── server.js          ← Lifecycle: .env → SQLite → API → static file server
│       ├── api.js             ← Route handlers (add custom endpoints here)
│       ├── reset.js           ← npm run reiniciar database reset script
│       ├── datos/semillas.js  ← SQL schema definition + seed fixtures
│       ├── data/*.db          ← SQLite storage (generated at runtime, gitignored)
│       └── lib/               ← Shared utilities (env, router, db, mailer, etc.)
├── 02-saas/ … 07-restaurante/ ← Same standardized layout

```

### Monorepo Structure: Single Git Repository

The entire suite is designed to be version-controlled in a **single repository**: root
and template-level `.gitignore` files filter sensitive and auto-generated data.

| Committed to Git | Ignored from Git |
| --- | --- |
| HTML, CSS, JS, READMEs, `LICENSE`, `package.json` | `.env` (real credentials) → commit `.env.example` only |
| `.gitignore`, `.ps1` / `.sh` automation scripts | `server/data/*.db*` (reseeded on initial boot) |
| Template `.env.example` templates | `node_modules/`, `*.log`, `*.tmp`, `.DS_Store` |

```bash
git init
git add -A
git status        # Verification: NO .env files should appear in staging
git commit -m "Web Templates: 7 sites with server, API and full documentation"

```

> If you choose to install optional dependencies (`npm install nodemailer`),
> make sure to commit the resulting `package-lock.json` file.

---

## 6. The `.env` Configuration File

Each template includes two configuration files: `.env.example` (annotated schema) and `.env`
(pre-populated with working **demo defaults** for instant startup).

```bash
cp .env.example .env    # Windows: copy .env.example .env
npm start

```

Common environment variables across all templates:

| Variable | Description |
| --- | --- |
| `PORT` / `HOST` | Interface and port where the HTTP server binds |
| `SITE_URL` | Base public canonical URL (used for links in transactional emails) |
| `DB_FILE` | Relative filesystem path to the SQLite database |
| `ADMIN_TOKEN` | Secret key for privileged actions (sent via `x-admin-token` header) |
| `TRUST_PROXY` | Set to `1` when behind a reverse proxy (Caddy/Nginx/Cloudflare) to read client IPs from `X-Forwarded-For` |
| `CSP` | `Content-Security-Policy` header: enabled by default; `0` disables it, or set custom policies |
| `LIMITE_*` | Rate limiting settings (max requests allowed per IP per minute) |
| `RESEND_API_KEY` / `EMAIL_DE` | Outbound email via Resend's REST API (zero dependencies) |
| `SMTP_HOST` … | Outbound email via standard SMTP (requires `npm install nodemailer`) |
| `CORS` / `CORS_ORIGEN` | Cross-Origin Resource Sharing settings for external consumers |

Template-specific variables: `STRIPE_*` (02 and 04), `IVA`/`ENVIO_*` (04), `DIAS_PRUEBA` (02),
`POR_PAGINA` (03), `ADMIN_USER`/`ADMIN_PASSWORD` (06),
`MAX_POR_HORA`/`INTERVALO_RESERVA`/`COMENSALES_MAX`/`DIAS_MAX_RESERVA` (07).

All these keys **are already outlined in each template's `.env**` (either empty or with mock values):
to activate an external service, paste your credential after the `=` sign and restart
the server (`Ctrl + C` → `npm start`). Without credentials, templates remain in mock mode:
the UI will never break.

Setting `RESEND_API_KEY` enables real outbound email delivery. Supplying `STRIPE_SECRET_KEY`
redirects to real Stripe checkouts (02 and 04 also include `/api/stripe/webhook`, which only
requires setting `STRIPE_WEBHOOK_SECRET`).

**Golden Rule:** Never store production credentials in `.env.example` or commit them to Git.
`.env` is ignored by default in each template's `.gitignore`.

---

## 7. API Architecture

* All API endpoints respond in JSON format; errors return `{ "error": "description" }` with standard HTTP status codes
(400 Bad Request · 401 Unauthorized · 404 Not Found · 429 Too Many Requests · 500 Internal Error).
* Mutation requests must supply `Content-Type: application/json`.
* Privileged endpoints require the `x-admin-token: <ADMIN_TOKEN>` request header.
* All templates include `GET /api/salud` for health and liveness checks:

```bash
curl http://localhost:3000/api/salud

```

> **PowerShell note:** To send raw JSON bodies without quote escaping issues, read from a file:
> `curl.exe -X POST http://localhost:3000/api/contacto -H "Content-Type: application/json" --data-binary "@body.json"`.

---

## 8. Customizing Your Template

Each template contains dedicated recipes in its README. Here is the general modification workflow:

### 8.1 Visuals & Branding (10 minutes)

1. **Copy & Images**: Update directly in `index.html`.
2. **Primary Palette**: Open `css/styles.css` → `:root` block → change `--color-primary`
(and adjust dark theme equivalents under `[data-theme="dark"]`). All elements, including
SVG visual charts, will automatically inherit the new theme.
3. **Typography**: Replace the Google Fonts `<link>` tag in `<head>` and redefine
`--font-heading` / `--font-body`.
4. **Logos**: Provided as inline SVGs or clean text; modify them directly in the markup.

### 8.2 Adding Content

| Goal | File Location |
| --- | --- |
| Add a project, blog post, or product | Check the template's README → "Adding…" (via HTML, DB seed, or API `POST`) |
| Add a new webpage section | Add `<section>` in `index.html` + nav anchor link + CSS styling (leverage `.tarjeta`, `.rejilla-2`, etc.) |
| Add a field to an existing form | Edit `index.html` → `js/main.js` (fetch payload) → `server/api.js` (validation & SQL INSERT) → `server/datos/semillas.js` (add schema column) |
| Expose a new API endpoint | Edit `server/api.js`: `api.get('/api/custom', ctx => ctx.json(...))` |
| Add a new database table | Add to `ESQUEMA` in `server/datos/semillas.js` + run `npm run reiniciar` |

### 8.3 Removing Features

* **UI Section**: Remove the corresponding `<section>` tag and its navigation link. Client-side JavaScript is written defensively and will not throw errors if elements are missing.
* **API Route**: Delete its handler function in `server/api.js`.
* **Database Table or Column**: Adjust `semillas.js` and run `npm run reiniciar` (or execute an `ALTER TABLE` query if preserving production data).
* **Remove Backend Entirely**: Delete the `server/` folder and keep the template as a purely static site (`index.html` runs locally out of the box).

### 8.4 Integrating Production Services

| Requirement | Quickest Path | Enterprise Approach |
| --- | --- | --- |
| Transactional Email | Resend (`RESEND_API_KEY`) | SMTP via `nodemailer` |
| Payments | Local mock checkout (ready out-of-the-box) | Stripe (just paste `STRIPE_SECRET_KEY` into `.env`; zero dependencies required) |
| Content Management | Edit SQLite directly or adjust `semillas.js` | Headless CMS (Sanity, Strapi, WordPress REST API) |
| Web Analytics | Privacy-first self-hosted tools (Plausible / Umami: 1 `<script>` tag) | Google Analytics 4 |
| Hosted Forms | Formspree / Web3Forms (switch client `fetch` endpoint) | Native backend endpoints (included out-of-the-box) |
| Authentication | Token stored in `.env` (included demo) | `bcrypt` + `jsonwebtoken` or hosted Auth (Auth0 / Clerk) |

### 8.5 Production Deployment

1. Push the target directory to any Node.js hosting platform (Railway, Render, Fly.io, or a dedicated VPS).
2. Configure environment variables in your hosting dashboard: `PORT` (assigned by platform), `HOST=0.0.0.0`,
`ADMIN_TOKEN` (secure randomly-generated string), `SITE_URL=[https://yourdomain.com](https://yourdomain.com)`, and external API keys.
3. Start command: `node server/server.js`.
4. Persistence: Attach a persistent storage volume to `server/data/` or point `DB_FILE` to a persistent disk mount; set up scheduled database backups.
5. Terminate TLS/HTTPS via your provider's managed load balancer or reverse proxies like Caddy / Let's Encrypt.
6. Static-only alternative: Deploy purely client files to GitHub Pages / Netlify — **this disables backend APIs**, and forms will run strictly in static demo mode.

---

## 9. Pre-Flight Security Checklist

* [ ] Change default `ADMIN_TOKEN`, `ADMIN_USER`, and `ADMIN_PASSWORD` values.
* [ ] Ensure `.env` is ignored by Git and **never** exposed publicly (the static file server blocks `.env` with a 403 Forbidden status, but keeping it out of version control is mandatory).
* [ ] Enforce valid SSL/TLS certificates (HTTPS).
* [ ] Verify that request rate limiting is enabled (`LIMITE_*`).
* [ ] Set `CORS=0` unless the API is meant to be consumed across third-party domains.
* [ ] Set `TRUST_PROXY=1` **only** when positioned behind a trusted reverse proxy (see [deployment guide](https://www.google.com/search?q=docs/DESPLIEGUE.md)); otherwise keep it at `0`.
* [ ] Adjust the `CSP` header if embedding external third-party scripts or endpoints (analytics trackers, payment frames, external forms); by default, only local assets and Google Fonts are allowed.
* [ ] Establish automated backup routines for the SQLite database file.
* [ ] When exposing the API to public traffic: introduce schema validation (e.g., `zod`) and role-based user authentication.

---

## 10. Troubleshooting & Common Errors

| Symptom | Resolution |
| --- | --- |
| `Could not load "node:sqlite"` | Upgrade to Node.js ≥ 22.13 (`node -v`) |
| `EADDRINUSE` / Port conflict | Update `PORT` in `.env` or pass an override via CLI |
| Webpage loads but forms do not submit | Server is not running: execute `npm start` and visit `http://localhost:3000` |
| `429 Too Many Requests` | Wait 1 minute or increase `LIMITE_*` thresholds in `.env` |
| `401 Unauthorized` | Provide the exact `x-admin-token: <ADMIN_TOKEN>` configured in `.env` |
| Changes in `.env` are not reflected | Restart the Node process (`Ctrl + C` → `npm start`) |
| SQLite warning displayed on launch | It is a harmless `ExperimentalWarning` (npm scripts suppress this by default) |
| Browser serves stale CSS/JS assets | Force reload via Ctrl + F5 (Cmd + Shift + R on macOS) |

---

## 11. Recommended Learning Path

1. **01-portfolio** → Understand the configuration flow, SQLite setup, and endpoint routing.
2. **03-blog** → Learn true pagination, server-side filtering, and token-based CRUD operations.
3. **04-tienda** → Explore transactional workflows, inventory management, tax calculations, and checkout routines.
4. **06-dashboard** → Review session-based authentication, administrative filtering, and file exports.
5. **02-saas** & **05-agencia** → Study commercial integrations (payment flows, account creation, business lead intake).
6. **07-restaurante** → **Slot-based scheduling & availability**: an architectural pattern applicable to medical appointments, classrooms, hospitality, or rental services.

Each folder is **completely self-contained**: you can safely copy a single template directory
and delete the rest. Follow the template's local README to take your project from demo to production.

---

## 12. Full Documentation Reference

| Document | Target Audience | Contents |
| --- | --- | --- |
| [docs/GUIA-USUARIO.md](https://www.google.com/search?q=docs/GUIA-USUARIO.md) | **Non-developers** | Step-by-step setup, UI walk-through for all 7 sites, submission tracking, code-free customizations, and testing checklists |
| [docs/GUIA-DESARROLLADOR.md](https://www.google.com/search?q=docs/GUIA-DESARROLLADOR.md) | **Developers** | Architecture overview, request lifecycle, 7 shared helper libraries, frontend conventions, code extension recipes, automated tests, and security |
| [docs/API.md](https://www.google.com/search?q=docs/API.md) | Quick Reference | Exhaustive endpoint directory for all 7 templates with HTTP status codes, authentication schemes, and `curl` samples |
| [docs/DESPLIEGUE.md](https://www.google.com/search?q=docs/DESPLIEGUE.md) | **Sysadmins / DevOps** | VPS configuration with HTTPS, PaaS guides (handling ephemeral filesystems), SQLite backup routines, and launch checklists |
| [docs/PERSONALIZACION.md](https://www.google.com/search?q=docs/PERSONALIZACION.md) | **Designers / Integrators** | Theming, copy, imagery, database wiring, template-specific `.env` profiles, and a "How do I change X?" quick index |
| Template `README.md` | All | Dedicated technical guide: boot steps, `.env` schema, endpoints, data model, recipes, troubleshooting, and security rules (12 sections) |
| Template `docs/` | All | `GUIA-USUARIO.md` (end-user workflow) and `GUIA-DESARROLLADOR.md` (complete API specs and extension guides) |
| [LICENSE](https://www.google.com/search?q=LICENSE) | All | **GPL-3.0 License** — Copyright (C) 2026 Alberto Ortiz. Free to use, copy, and modify; all redistributed derivative works must publish source code under the same copyleft license |

**Recommended reading order:** Start with the [User Guide](https://www.google.com/search?q=docs/GUIA-USUARIO.md) to test the interfaces,
proceed to your chosen [template's README](https://www.google.com/search?q=01-portfolio/README.md), and refer to the
[Developer Guide](https://www.google.com/search?q=docs/GUIA-DESARROLLADOR.md) when you are ready to customize the code.


