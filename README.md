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
  `limitador.js` (anti-spam por IP).
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
├── LICENSE                    ← licencia MIT de todo el repositorio
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
git commit -m "Plantillas web: 6 sitios con servidor, API y docs"
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
| `ADMIN_TOKEN` | clave de las operaciones de administración (header `x-admin-token`) |
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
| [docs/GUIA-DESARROLLADOR.md](docs/GUIA-DESARROLLADOR.md) | Quien **va a tocar código** | Arquitectura y ciclo de una petición, las 6 librerías compartidas, patrones del front, convenciones, recetas de extensión con código, pruebas y seguridad |
| [docs/API.md](docs/API.md) | Consulta rápida | Índice de **todos** los endpoints de las 7 plantillas con códigos, auth y ejemplos `curl` |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | Quien la **publica** | VPS con HTTPS, plataformas PaaS (ojo al disco efímero), backups de la BD y checklist antes de abrir |
| [docs/PERSONALIZACION.md](docs/PERSONALIZACION.md) | Quien la **personaliza** | Paleta, textos, imágenes, datos desde la BD, `.env` por plantilla y tabla «quiero X → dónde tocar» |
| `README.md` de cada plantilla | Ambos | Referencia técnica de esa plantilla: arranque, `.env`, API, BD, recetas, problemas y seguridad (12 secciones) |
| `docs/` de cada plantilla | Ambos | `GUIA-USUARIO.md` (uso real de esa web) y `GUIA-DESARROLLADOR.md` (su API completa y sus extensiones) |
| [LICENSE](LICENSE) | Todos | **Licencia MIT** — Copyright (c) 2026 Alberto Ortiz. Puedes usar, copiar, modificar y vender las plantillas conservando este aviso |

**Orden recomendado:** primero la [guía de usuario](docs/GUIA-USUARIO.md) para
verlo funcionar, después el [README de la plantilla](01-portfolio/README.md) que
te interese, y la [guía de desarrollador](docs/GUIA-DESARROLLADOR.md) cuando
vayas a cambiar código.
