# 02 · Landing de SaaS "Fluxo" — plantilla con servidor, API y base de datos

Plantilla de **landing de SaaS** (HTML5 + CSS3 + JavaScript vanilla) que ya
incluye **servidor Node, API REST y base de datos SQLite**: el formulario del
hero registra de verdad, los precios salen de la base de datos, hay alta de
newsletter y un punto de entrada para cobrar con Stripe.

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
| Base de datos | ✅ SQLite (`node:sqlite`) | `server/data/saas.db` |
| Registro de prueba real | ✅ `POST /api/registro` | `server/api.js` + `js/main.js` |
| Precios desde la BD | ✅ `GET /api/planes` | `server/api.js` + `js/main.js` |
| Newsletter | ✅ `POST /api/newsletter` | `server/api.js` |
| Cobros con Stripe | ⚪ opcional (hay modo demo) | `.env` → ver §6.6 |
| Envío de correo | ⚪ opcional | `.env` → Resend o SMTP |
| Protección anti-spam | ✅ límite por IP | `server/lib/limitador.js` |
| Panel de administración | ⚪ API con token | `GET /api/suscripciones` |
| Librerías externas | ⚪ ninguna obligatoria | ver §9 |
| HTTPS, dominio, despliegue | 📄 documentado | §8 |

La landing **también funciona abriendo `index.html` a secas**: los precios salen
del propio HTML y el formulario responde en "modo demo".

---

## 2. Arranque rápido

**Requisito: Node 22.13 o superior** ([nodejs.org](https://nodejs.org)). Compruébalo con `node -v`.

```bash
# Opción A — con servidor (recomendada): API + web en el mismo puerto
npm start
# → abre http://localhost:3000

# Opción B — sin servidor: doble clic en index.html
# (todo funciona en local; el formulario responde en "modo demo")

# Volver a la base de datos de ejemplo (borra los registros guardados)
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
| `SITE_URL` | no | URL pública (enlace de verificación y URLs de Stripe) |
| `DB_FILE` | no | Ruta del fichero SQLite (se crea solo) |
| `ADMIN_TOKEN` | sí para admin | Clave de `/api/suscripciones` y firma de verificación |
| `LIMITE_REGISTRO` | no (10) | Altas máximas por IP y minuto |
| `DIAS_PRUEBA` | no (14) | Días de prueba que promete la landing (salen en el correo) |
| `RESEND_API_KEY` | opcional | Activa el envío real vía [Resend](https://resend.com) |
| `EMAIL_DE` | opcional | Remitente visible (`Nombre <hola@x.com>`) |
| `SMTP_HOST` / `SMTP_PUERTO` / `SMTP_USUARIO` / `SMTP_CLAVE` | opcional | Envío por SMTP (requiere `npm install nodemailer`) |
| `STRIPE_SECRET_KEY` | opcional | Activa `POST /api/pago/sesion` con Stripe de verdad (sin instalar nada) |
| `STRIPE_PRICE_ID_BASICO` / `_PRO` / `_EMPRESA` | opcional | Id del Precio recurrente que se cobra en cada plan |
| `STRIPE_WEBHOOK_SECRET` | opcional | Activa `POST /api/stripe/webhook` (el pago se refleja en la BD) |
| `CORS` / `CORS_ORIGEN` | no (`0`) | Para consumir la API desde otro dominio |
| `TRUST_PROXY` | no (`0`) | `1` solo detrás de un proxy inverso (Caddy/nginx/Cloudflare): el límite anti-spam usa la IP real del visitante, no la del proxy |
| `CSP` | no | Cabecera `Content-Security-Policy` que envía el servidor; `CSP=0` la desactiva y un valor propio la personaliza (analíticas, formularios externos…) |

Las claves de Stripe y de correo **ya están escritas en el `.env`** (vacías):
para activarlas solo tienes que pegar el valor después del `=` y reiniciar.

Cambios en `.env`: **reinicia el servidor** (`Ctrl + C` y `npm start`).

---

## 4. API REST

Todas las respuestas son JSON. Las de escritura aceptan `Content-Type: application/json`.

| Método | Ruta | Body | Respuesta | Auth |
|---|---|---|---|---|
| GET | `/api/salud` | – | `{ok, servicio, version, node, uptime_s}` | no |
| GET | `/api/planes` | – | array de planes (`clave`, precios, `destacado`, `funciones`) | no |
| POST | `/api/registro` | `{email, plan?, periodo?}` | `{ok, id, mensaje, correo}` (201) | no |
| POST | `/api/newsletter` | `{email, origen?}` | `{ok, id, mensaje}` (201) | no |
| POST | `/api/pago/sesion` | `{email?, plan?, periodo?}` | `{modo:'stripe', url}` o `{modo:'demo', mensaje}` | no |
| POST | `/api/stripe/webhook` | evento de Stripe (crudo) | `{ok, recibido, tipo, aplicado}` | firma Stripe |
| GET | `/api/verificar` | `?id=1&token=…` | `{ok, mensaje, estado}` | token del correo |
| GET | `/api/suscripciones` | – | `{total, suscripciones}` (últimas 200) | `x-admin-token` |

**Ejemplos con curl** (PowerShell: guarda el body en un fichero y usa
`--data-binary "@fichero.json"`, las comillas del `-d` directo se estropean):

```bash
curl http://localhost:3000/api/salud
curl http://localhost:3000/api/planes

# Altas
echo {"email":"ana@empresa.com","plan":"pro","periodo":"anual"} > body.json
curl -X POST http://localhost:3000/api/registro -H "Content-Type: application/json" --data-binary "@body.json"

curl -X POST http://localhost:3000/api/newsletter -H "Content-Type: application/json" \
  -d '{"email":"ana@empresa.com"}'

# Cobros (modo demo si no hay Stripe configurado)
curl -X POST http://localhost:3000/api/pago/sesion -H "Content-Type: application/json" \
  -d '{"email":"ana@empresa.com","plan":"pro"}'

# Admin
curl -H "x-admin-token: demo-token-saas-7c21e8b4f6" http://localhost:3000/api/suscripciones
```

**Errores**: siempre `{ "error": "mensaje" }` con el código HTTP correspondiente
(400 validación, 401 token, 404 no existe, 429 límite, 502 fallo de Stripe,
500 servidor).

---

## 5. Estructura

```
02-saas/
├── index.html            ← contenido y estructura (en español)
├── css/styles.css        ← paleta, temas (claro/oscuro) y componentes
├── js/main.js            ← tema, menú, precios, FAQ, formulario, pago (Stripe) y cliente API
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
    ├── datos/semillas.js ← esquema SQL + los 3 planes
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
- **Textos e imágenes**: todo en `index.html`.
- **Color principal**: `css/styles.css` → bloque `:root` → `--color-primary`.
  Al cambiarlo **toda la web se recolorea** (botones, enlaces, degradados).
- **Tema oscuro**: edita también el bloque `[data-theme="dark"]`.
- **Tipografías**: se cargan de Google Fonts en el `<head>`; cambia el `<link>` y
  luego `--font-heading` / `--font-body` en el CSS.

### 6.2 Cambiar precios y planes
Hay dos niveles; **si hay servidor, manda la base de datos**:

1. **Rápido (solo HTML)** — `index.html`, cada `.importe` lleva sus atributos:
   ```html
   <span class="importe" data-mensual="9" data-anual="7">9</span>
   <p class="plan-nota" data-nota-mensual="Facturado mes a mes"
      data-nota-anual="Facturado anualmente (84 €)">…</p>
   ```
   Cambia `data-mensual` / `data-anual` (y el texto visible) y ya está.

2. **Completo (API)** — `server/datos/semillas.js` → array `PLANES`:
   ```js
   { clave: 'pro', nombre: 'Pro', precio_mensual: 19, precio_anual: 15,
     destacado: 1, orden: 2, funciones: ['Proyectos ilimitados', …] }
   ```
   Después: `npm run reiniciar` (o un `UPDATE planes SET precio_anual = 17 WHERE clave = 'pro';`).
   El JS pinta esos valores en `GET /api/planes` antes de mostrar los precios.

- **Nota "Facturado anualmente (X €)"**: se recalcula automáticamente como
  `precio_anual × 12` cuando llegan precios de la API; en modo estático usa el
  `data-nota-anual` del HTML.
- **Destacar otro plan**: `destacado: 1` en la BD y la clase `destacado` en la
  tarjeta `<article class="plan destacado">`.

### 6.3 Añadir un plan nuevo
1. **HTML**: copia un bloque `<article class="plan animar">` dentro de
   `#precios` y ponle su `<h3 class="plan-nombre">`, sus `.importe`
   (`data-mensual`/`data-anual`) y su `.plan-nota`.
2. **BD**: añade una fila al array `PLANES` de `server/datos/semillas.js` con una
   `clave` nueva (`ejecutivo`) y ejecuta `npm run reiniciar`.
   > Si no vacías la BD, inserta a mano:
   > `INSERT INTO planes (clave,nombre,precio_mensual,precio_anual,destacado,funciones,orden) VALUES ('ejecutivo','Ejecutivo',59,49,0,'["Todo lo del plan Pro"]',4);`
3. El registro ya acepta esa clave (`POST /api/registro` con `plan: "ejecutivo"`)
   porque valida contra la tabla `planes`.

### 6.4 Añadir una sección
1. En `index.html`, dentro de `<main>`, copia una sección existente:
   ```html
   <section class="seccion" id="casos">
     <div class="contenedor">
       <header class="seccion-cabecera animar">
         <span class="eyebrow">Casos</span>
         <h2>Títular <span class="degradado-texto">de la sección</span></h2>
         <p>Entradilla.</p>
       </header>
       …
     </div>
   </section>
   ```
2. Añade su enlace en la navbar: `<a href="#casos">Casos</a>` y, si quieres, en el pie.
3. La clase `.animar` es la que dispara la aparición al hacer scroll (`.visible`).

### 6.5 Quitar secciones
Borra el bloque `<section>` correspondiente en `index.html` y su enlace del menú
(`#navEnlaces`) o del pie. El JS es defensivo: si no encuentra un elemento
(`document.getElementById(...)`) no falla. Puedes borrar toda la carpeta
`server/` si solo quieres la parte estática (recuerda quitar `js/main.js` las
llamadas a `api(...)` o déjalas: sin servidor entrará en modo demo).

### 6.6 Conectar Stripe de verdad (solo pegar las claves)

**No hace falta `npm install stripe`**: el servidor llama a la API REST de
Stripe con `fetch` (módulo nativo). Mientras no pegues ninguna clave,
`POST /api/pago/sesion` responde `{modo:'demo'}`: nunca falla y nunca cobra.

1. Crea cuenta en <https://dashboard.stripe.com> y copia la **clave secreta**
   (modo test: empieza por `sk_test_`).
2. Crea un producto con un **precio recurrente** (Products → Add price →
   Recurring) y copia su id (`price_…`).
3. En `.env` **las claves ya están escritas**: solo pega el valor y reinicia.
   ```env
   STRIPE_SECRET_KEY=sk_test_…
   STRIPE_PRICE_ID_PRO=price_…        # (o _BASICO / _EMPRESA)
   SITE_URL=https://tudominio.com
   ```
   > Cada plan usa su propio precio: si solo rellenas `STRIPE_PRICE_ID_PRO`,
   > el botón de los otros planes responderá 400 indicándote qué clave falta.
4. Reinicia y comprueba:
   ```bash
   curl -X POST http://localhost:3000/api/pago/sesion \
     -H "Content-Type: application/json" --data-binary "@body.json"
   # → { "ok": true, "modo": "stripe", "url": "https://checkout.stripe.com/…" }
   ```
   En la web: enlace **"Contratar ahora con tarjeta →"** de la tarjeta Pro →
   te lleva al checkout de Stripe y, al pagar, vuelve a `/?pago=ok#registro`.
5. **Webhook** (para que el pago se refleje en la BD): ya está implementado
   `POST /api/stripe/webhook` con verificación de firma.
   - En <https://dashboard.stripe.com/webhooks> crea un endpoint:
     `<SITE_URL>/api/stripe/webhook`, evento `checkout.session.completed`.
   - Copia el secreto en `.env` → `STRIPE_WEBHOOK_SECRET=whsec_…` y reinicia.
   - Comprueba:
     ```bash
     curl -H "x-admin-token: <ADMIN_TOKEN>" http://localhost:3000/api/suscripciones
     # tras pagar, el estado pasa de "prueba" a "activa"
     ```
   - Si no configuras el secreto, el webhook rechaza la petición con 400 (y el
     pago sigue llegando a Stripe, pero no se actualiza la BD).
6. Al terminar la prueba, pasa a claves `sk_live_…` y `price_…` de producción.

### 6.7 Conectar el correo de verdad
- **Resend (más fácil)**: cuenta gratis → API key → en `.env`:
  `RESEND_API_KEY=re_xxx` y `EMAIL_DE="Fluxo <hola@tudominio.com>"`. Verifica tu dominio en Resend.
- **SMTP (Gmail, Outlook, Mailgun)**: `npm install nodemailer` y en `.env`:
  `SMTP_HOST=smtp.gmail.com`, `SMTP_PUERTO=587`, `SMTP_USUARIO=...`, `SMTP_CLAVE=...` (contraseña de aplicación de Gmail).
- Sin nada configurado, el alta **se guarda igualmente** en la BD y la API
  responde `correo: "demo"` (el mensaje del formulario lo indica).

### 6.8 Cambiar puerto o dominio
`.env` → `PORT=8080`. En un servidor público: `HOST=0.0.0.0`, `SITE_URL=https://tudominio.com`
y pon un proxy inverso (Caddy/Nginx) con HTTPS delante.

### 6.9 Añadir una API nueva
En `server/api.js`, dentro de `registrar(api, { bd })`:

```js
api.get('/api/estadisticas', (ctx) =>
  ctx.json({ altas: Number(bd.uno('SELECT COUNT(*) AS n FROM suscripciones').n) })
);

api.post('/api/contacto-ventas', async (ctx) => {
  const d = await ctx.cuerpo();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email || '')) return ctx.fallo(400, 'Correo no válido');
  // … guardar o enviar correo …
  ctx.json({ ok: true, mensaje: 'Te llamamos en 24 h.' }, 201);
});
```
Y en `server/datos/semillas.js` crea la tabla dentro de `ESQUEMA`. Prueba:
`curl -X POST http://localhost:3000/api/contacto-ventas -H "Content-Type: application/json" -d '{"email":"ana@x.com"}'`

---

## 7. Qué se guarda en la base de datos

| Tabla | Columnas | Quién la escribe |
|---|---|---|
| `planes` | id, clave, nombre, precio_mensual, precio_anual, destacado, funciones (JSON), orden | semillas / tú |
| `suscripciones` | id, email, plan, periodo, estado, stripe_session_id, ip, creado_en | `POST /api/registro`, `POST /api/pago/sesion`, `GET /api/verificar` |
| `newsletter` | id, email, origen, creado_en | `POST /api/newsletter` |

Estados de `suscripciones`: `prueba` (alta) → `activa` (correo verificado) →
`cancelada`. Consulta los datos con el token (§4) o con cualquier cliente SQLite
(DB Browser for SQLite, VS Code con extensión, `sqlite3` CLI).

---

## 8. Despliegue

1. Sube la carpeta a tu servidor/VPS o a un servicio Node (Railway, Render, Fly.io…).
2. Variables de entorno en el panel: `PORT` (suele darlo la plataforma), `HOST=0.0.0.0`,
   `ADMIN_TOKEN` (uno largo), `SITE_URL=https://tudominio.com`, `RESEND_API_KEY` y/o
   `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID_PRO`.
3. Comando de arranque: `node server/server.js` (el `PORT` llega del entorno).
4. La BD SQLite se crea sola; para que sobreviva a despliegues, monta un **volumen**
   en `server/data/` o cambia `DB_FILE` a una ruta persistente.
5. Activa HTTPS (la plataforma o Caddy/Let's Encrypt), marca `CORS=0` si la web y
   la API comparten dominio y no expongas `ADMIN_TOKEN` en el navegador.

---

## 9. Librerías opcionales (si quieres ir más allá)

| Librería | Para qué | Cuándo |
|---|---|---|
| `stripe` | SDK oficial de Stripe | **no hace falta**: los cobros ya van por API REST con `fetch`; solo si prefieres el SDK |
| `nodemailer` | enviar correos por SMTP | si activas `SMTP_HOST` |
| `resend` | enviar correos por API (alternativa al `fetch` de `lib/email.js`) | si prefieres SDK a REST |
| `express` | servidor web más amplio | si la API crece mucho |
| `zod` / `joi` | validación de datos declarativa | muchos endpoints |
| `bcrypt` + `jsonwebtoken` | usuarios y login reales | si añades área privada |

Ninguna es obligatoria: sin ellas la plantilla arranca igual.

---

## 10. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `No se pudo cargar "node:sqlite"` | Instala Node ≥ 22.13 y comprueba con `node -v` |
| `EADDRINUSE: port 3000` | Cambia `PORT` en `.env` o cierra el proceso anterior |
| El formulario dice "modo demo" | No hay servidor: ejecuta `npm start` y abre `http://localhost:3000` |
| Los precios no cambian al editar la BD | Reinicia el servidor y comprueba `curl /api/planes` |
| `429 Demasiados registros` | Espera un minuto o sube `LIMITE_REGISTRO` en `.env` |
| `401 Token no válido` | Usa el `ADMIN_TOKEN` del `.env` en el header `x-admin-token` |
| `/api/pago/sesion` responde `{"modo":"demo"}` | Falta `STRIPE_SECRET_KEY` (y el precio del plan) en `.env` |
| `/api/pago/sesion` responde `400` indicando un `STRIPE_PRICE_ID_…` | Crea ese Precio recurrente en Stripe y pega su `price_…` en el `.env` |
| `401 Firma de Stripe no válida` | `STRIPE_WEBHOOK_SECRET` no coincide con el del panel de Stripe |
| El correo sale como `"demo"` | Falta `RESEND_API_KEY` o `SMTP_HOST` en `.env` |
| Los cambios del `.env` no hacen efecto | Reinicia el servidor |
| El navegador cachea CSS/JS antiguos | Ctrl + F5 (el servidor manda `no-cache` en HTML) |

---

## 11. Seguridad (antes de publicar)

- Cambia `ADMIN_TOKEN` por una clave larga y aleatoria (también firma los enlaces de verificación).
- Mantén `.env` fuera de git (ya está en `.gitignore`).
- El servidor **nunca** sirve `.env`, `*.md`, `*.db` ni la carpeta `server/` (devuelve 403).
- Añade HTTPS (obligatorio para cookies/autenticación y para Stripe en producción).
- Usa siempre claves **test** de Stripe hasta que vayas a facturar de verdad y guarda
  `STRIPE_WEBHOOK_SECRET` en el entorno, nunca en el repositorio.
- El límite por IP es en memoria: para múltiples servidores usa Redis o el límite de tu proxy.
- Los datos de alta contienen correos: no los publiques sin filtrar (`GET /api/suscripciones` exige token).

---

## 12. Licencia y personalización

Libre para usar en tus proyectos. Cambia textos, colores, planes y endpoints a
tu gusto: la estructura está pensada para copiar la carpeta y hacerla tuya.

La licencia completa está en [`../LICENSE`](../LICENSE) (MIT — Copyright (c) 2026 Alberto Ortiz).
