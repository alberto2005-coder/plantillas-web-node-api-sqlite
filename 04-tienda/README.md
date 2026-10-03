# 04 · Tienda online "NovaTech Store" — plantilla con servidor, API y base de datos

Plantilla de **e-commerce / tienda online** (HTML5 + CSS3 + JavaScript vanilla) que ya
incluye **servidor Node, API REST y base de datos SQLite**: el catálogo se sirve desde
la base de datos, el carrito manda pedidos de verdad (con control de stock) y el
newsletter guarda suscriptores.

> Funciona **sin instalar nada**: no hay dependencias obligatorias, solo módulos
> nativos de Node. `npm install` es opcional (solo para pagos con Stripe o correos SMTP).
>
> 📚 **Documentación**: [Guía de usuario](docs/GUIA-USUARIO.md) · [Guía de desarrollador](docs/GUIA-DESARROLLADOR.md)
>
> Y **sigue funcionando en modo estático**: si abres `index.html` con doble clic,
> la tienda se ve y se usa igual que siempre, con checkout en modo demo.

---

## 1. Qué necesita esta plantilla (y qué ya está hecho)

| Necesidad | Estado | Dónde |
|---|---|---|
| Servidor web (HTTP) | ✅ hecho | `server/server.js` |
| API REST | ✅ hecho | `server/api.js` |
| Base de datos | ✅ SQLite (`node:sqlite`) | `server/data/tienda.db` |
| Catálogo con filtros y orden | ✅ local **y** server-side | `js/main.js` + `GET /api/productos` |
| Carrito con `localStorage` | ✅ hecho | `js/main.js` (sección 10) |
| Checkout real (pedido + stock) | ✅ `POST /api/pedidos` | `server/api.js` + `js/main.js` |
| Consulta de estado del pedido | ✅ `GET /api/pedidos/:referencia` | `server/api.js` |
| Pagos con Stripe | ⚪ opcional | `.env` → `STRIPE_SECRET_KEY` |
| Envío de correo (pedido/newsletter) | ⚪ opcional | `.env` → Resend o SMTP |
| Protección anti-spam | ✅ límite por IP | `server/lib/limitador.js` |
| Panel/listado de pedidos | ⚪ API con token | `GET /api/pedidos` |
| Librerías externas | ⚪ ninguna obligatoria | ver §9 |
| HTTPS, dominio, despliegue | 📄 documentado | §8 |

---

## 2. Arranque rápido

**Requisito: Node 22.13 o superior** ([nodejs.org](https://nodejs.org)). Compruébalo con `node -v`.

```bash
# Opción A — con servidor (recomendada): API + web en el mismo puerto
npm start
# → abre http://localhost:3004

# Opción B — sin servidor: doble clic en index.html
# (catálogo, filtros y carrito en local; el checkout responde en "modo demo")

# Volver a la base de datos de ejemplo (borra pedidos y suscriptores)
npm run reiniciar

# Recarga automática al guardar cambios
npm run dev
```

Si **no quieres usar npm**, también puedes: `node server/server.js`.

Comprobación rápida de que todo va:

```bash
curl http://localhost:3004/api/salud      # → {"ok": true, "servicio": "tienda-api", …}
curl http://localhost:3004/api/productos  # → los 8 productos con su stock
```

---

## 3. Variables de entorno (`.env`)

Copia `.env.example` → `.env` y rellena. Ya te dejo un `.env` de demo listo.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | no (3004) | Puerto del servidor |
| `HOST` | no (127.0.0.1) | IP de escucha. Usa `0.0.0.0` en contenedores/servidor |
| `SITE_URL` | no | URL pública (se usa en correos y enlaces) |
| `DB_FILE` | no | Ruta del fichero SQLite (se crea solo) |
| `ADMIN_TOKEN` | sí para admin | Clave del listado `GET /api/pedidos` |
| `MONEDA` | no (`EUR`) | Moneda de la tienda (código ISO) |
| `IVA` | no (21) | Tipo de IVA en %, **incluido** en los precios |
| `ENVIO_GRATIS_DESDE` | no (50) | Subtotal mínimo (€) para envío gratis |
| `ENVIO_COSTE` | no (4.99) | Coste del envío (€) por debajo de ese importe |
| `LIMITE_PEDIDO` | no (10) | Pedidos máximos por IP y minuto |
| `LIMITE_NEWSLETTER` | no (5) | Suscripciones máximas por IP y minuto |
| `STRIPE_SECRET_KEY` | opcional | Activa el pago real con [Stripe](https://stripe.com) |
| `STRIPE_WEBHOOK_SECRET` | opcional | Activa `POST /api/stripe/webhook` y marca el pedido como cobrado |
| `RESEND_API_KEY` | opcional | Envío real de correos vía [Resend](https://resend.com) |
| `EMAIL_DE` | opcional | Remitente visible (`Nombre <hola@x.com>`) |
| `EMAIL_PEDIDOS` | no | Correo del equipo que recibe el parte de cada pedido |
| `SMTP_HOST` / `SMTP_PUERTO` / `SMTP_USUARIO` / `SMTP_CLAVE` | opcional | Envío por SMTP (requiere `npm install nodemailer`) |
| `CORS` / `CORS_ORIGEN` | no (`0`) | Para consumir la API desde otro dominio |
| `TRUST_PROXY` | no (`0`) | `1` solo detrás de un proxy inverso (Caddy/nginx/Cloudflare): el límite anti-spam usa la IP real del visitante, no la del proxy |
| `CSP` | no | Cabecera `Content-Security-Policy` que envía el servidor; `CSP=0` la desactiva y un valor propio la personaliza (analíticas, formularios externos…)

Cambios en `.env`: **reinicia el servidor** (`Ctrl + C` y `npm start`).

---

## 4. API REST

Todas las respuestas son JSON. Las de escritura aceptan `Content-Type: application/json`.

| Método | Ruta | Body | Respuesta | Auth |
|---|---|---|---|---|
| GET | `/api/salud` | – | `{ok, servicio, version, node, moneda, iva, uptime_s}` | no |
| GET | `/api/productos?categoria=&q=&orden=` | – | array de productos (+`stock`) | no |
| GET | `/api/productos/:id` | – | un producto | no |
| POST | `/api/pedidos` | `{cliente:{nombre,email,direccion,ciudad,cp}, lineas:[{id,cantidad}]}` | `{ok, referencia, subtotal, envio, iva, total}` (201) | no |
| GET | `/api/pedidos/:referencia` | – | pedido + sus líneas | no |
| GET | `/api/pedidos` | – | últimos 100 pedidos | `x-admin-token` |
| POST | `/api/checkout` | `{importe}` o `{lineas}` (+ `referencia?`) | `{modo:'demo'\|'stripe', …}` | no |
| POST | `/api/stripe/webhook` | evento de Stripe (crudo) | `{ok, recibido, tipo, aplicado}` | firma Stripe |
| POST | `/api/newsletter` | `{email}` | `{ok, mensaje, correo}` (201) | no |

**Parámetros de `GET /api/productos`**

- `categoria` → `auriculares` · `teclados` · `ratones` · `monitores` (o vacío/`todas`).
  Si llega otra → **400**.
- `q` → búsqueda por texto en nombre o categoría.
- `orden` → `destacados` (por defecto) · `precio-asc` · `precio-desc` · `valoracion`.
  Si llega otro → **400**.

**Errores**: siempre `{ "error": "mensaje" }` (y a veces `"detalle": [...]`) con el código
HTTP correspondiente: **400** validación, **401** token, **404** no existe,
**409** stock insuficiente, **429** límite por IP, **500** servidor.

**Códigos de `POST /api/pedidos`**: 201 creado · 400 datos incorrectos
(cliente, líneas vacías o cantidades fuera de 1–10) · 409 stock insuficiente ·
429 demasiados pedidos desde tu IP.

### Ejemplos con curl (pedido completo paso a paso)

> **PowerShell**: las comillas de `-d '{"a":1}'` se estropean. Guarda el body en un
> fichero y usa `--data-binary "@fichero.json"`. En Linux/macOS puedes usar `-d` directo.

```bash
# 1) Estado del servidor
curl http://localhost:3004/api/salud

# 2) Catálogo completo
curl http://localhost:3004/api/productos

# 3) Filtros y orden server-side
curl "http://localhost:3004/api/productos?categoria=teclados"
curl "http://localhost:3004/api/productos?orden=precio-asc"
curl "http://localhost:3004/api/productos?q=auriculares&orden=valoracion"
curl "http://localhost:3004/api/productos?categoria=gaming"     # → 400

# 4) Un producto concreto
curl http://localhost:3004/api/productos/1

# 5) Crear el pedido: guarda este contenido como "pedido.json"
cat > pedido.json <<'JSON'
{
  "cliente": {
    "nombre": "Ana Prueba",
    "email": "ana@correo.com",
    "direccion": "Calle Mayor 12, 3o B",
    "ciudad": "Madrid",
    "cp": "28013"
  },
  "lineas": [
    { "id": 1, "cantidad": 1 },
    { "id": 3, "cantidad": 2 },
    { "id": 5, "cantidad": 1 }
  ]
}
JSON

curl -X POST http://localhost:3004/api/pedidos \
  -H "Content-Type: application/json" \
  --data-binary "@pedido.json"
# → 201
#    { "ok": true, "referencia": "NV-2026-1001", "subtotal": 226.79,
#      "envio": 0, "iva": 39.36, "total": 226.79 }
#    (el stock de los productos 1, 3 y 5 baja automáticamente)

# 6) Consultar el pedido por su referencia (consulta pública, páginala al cliente)
curl http://localhost:3004/api/pedidos/NV-2026-1001

# 7) Listar todos los pedidos (requiere el token de .env)
curl -H "x-admin-token: demo-token-tienda-7b31e5c9d2" http://localhost:3004/api/pedidos

# 8) Pedido imposible: valida el stock (409) y las cantidades (400)
#    pedido-stock.json → { "cliente": {…}, "lineas": [ { "id": 6, "cantidad": 10 } ] }
curl -X POST http://localhost:3004/api/pedidos \
  -H "Content-Type: application/json" --data-binary "@pedido-stock.json"

# 9) Newsletter (201 correcto / 400 formato no válido)
#    newsletter.json → { "email": "nueva@correo.com" }
curl -X POST http://localhost:3004/api/newsletter \
  -H "Content-Type: application/json" --data-binary "@newsletter.json"
curl -X POST http://localhost:3004/api/newsletter \
  -H "Content-Type: application/json" --data-binary "@newsletter-malo.json"

# 10) Checkout / Stripe (sin clave responde modo demo, nunca falla)
curl -X POST http://localhost:3004/api/checkout \
  -H "Content-Type: application/json" --data-binary "{\"importe\": 25.50}"
```

### Qué recibe `POST /api/pedidos`

```jsonc
{
  "cliente": {
    "nombre":    "Ana Prueba",     // mínimo 2 caracteres
    "email":     "ana@correo.com", // formato válido
    "direccion": "Calle Mayor 12, 3o B",  // mínimo 5 caracteres
    "ciudad":    "Madrid",         // mínimo 2 caracteres
    "cp":        "28013"           // 4 a 10 caracteres (letras, números, espacios y guiones)
  },
  "lineas": [
    { "id": 1, "cantidad": 1 }     // id del producto, cantidad entera entre 1 y 10
  ]
}
```

Importes calculados **siempre en el servidor** y redondeados a 2 decimales:

- `subtotal` = Σ (precio con descuento × cantidad)
- `envio` = `0` si `subtotal ≥ ENVIO_GRATIS_DESDE` (50 €), si no `ENVIO_COSTE` (4,99 €)
- `total` = `subtotal + envio`
- `iva` = `total − total / 1,21` → el IVA (21 %) va **incluido** en el precio

---

## 5. Estructura

```
04-tienda/
├── index.html            ← contenido y estructura (en español)
├── css/styles.css        ← paleta, tipografías y componentes
├── js/main.js            ← catálogo, filtros, carrito, checkout y cliente API
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
    ├── datos/semillas.js ← esquema SQL + los 8 productos
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

## 6. Cómo personalizarla (tu tienda)

### 6.1 Cambiar textos, color y tipografía
- **Textos e imágenes**: todo en `index.html`.
- **Color principal**: `css/styles.css` → bloque `:root` → `--color-primary`.
- **Tipografías**: se cargan de Google Fonts en el `<head>` del HTML; cambia el `<link>` y luego `--font-heading` / `--font-body` en el CSS.
- Los **colores del icono de cada producto** salen del campo `colores` (degradado `linear-gradient`).

### 6.2 Añadir un producto
1. **Rápido (solo HTML/local)**: añade una línea en el array `productos` de `js/main.js`:
   ```js
   { id: 9, nombre: 'Webcam NovaCam 4K', categoria: 'monitores', precio: 89.99,
     descuento: 10, valoracion: 5, nuevo: true, colores: ['#5b5bf0', '#12c9a5'] },
   ```
2. **Completo (API)**: añade la fila en `server/datos/semillas.js` → `PRODUCTOS` y ejecuta
   `npm run reiniciar`, o insértala directamente en la BD:
   ```sql
   INSERT INTO productos (nombre, categoria, precio, descuento, valoracion, nuevo, colores, stock, activo, orden)
   VALUES ('Webcam NovaCam 4K', 'monitores', 89.99, 10, 5, 1,
           '["#5b5bf0","#12c9a5"]', 25, 1, 9);
   ```
   (`colores` es un JSON en texto: `node:sqlite` no admite booleanos ni arrays → usa `1/0`
   para `nuevo` y `activo`, y `JSON.stringify` para los colores.)
3. Si hay servidor, la web lo pinta sola al cargar (`GET /api/productos`).

### 6.3 Quitar un producto
- **BD**: `UPDATE productos SET activo = 0 WHERE id = 3;` → desaparece del catálogo y de
  la venta, pero conservas su histórico en los pedidos. (Borrar la fila con `DELETE`
  también vale, aunque los pedidos antiguos perderían el enlace.)
- **Local**: borra su línea del array `productos` de `js/main.js`.

### 6.4 Cambiar precios, IVA y envío
- **Precio o descuento de un producto**: en `server/datos/semillas.js` (o `UPDATE productos SET precio=… , descuento=… WHERE id=…`) y, si trabajas sin servidor, en `js/main.js`.
- **IVA**: `.env` → `IVA=21`. Se calcula **incluido** en el precio (`total − total/1,21`) y
  se guarda en la columna `iva` de cada pedido. Cámbialo a `10` o `15` si tu país es distinto.
- **Envío**: `.env` → `ENVIO_GRATIS_DESDE=50` y `ENVIO_COSTE=4.99`. El aviso del carrito
  (`#notaEnvio`) usa 50 € fijo en `js/main.js` (sección 10): si cambias el valor,
  actualízalo ahí también (o lee el total desde `GET /api/salud`).
- **Moneda**: la visualización es la del navegador (`dinero()` en `js/main.js`, `currency: 'EUR'`);
  cámbialo a `'USD'`, `'MXN'`… para que el resto del mundo vea su moneda.

### 6.5 Añadir un campo al checkout (ejemplo: "Teléfono")
1. **HTML** (`index.html`, dentro de `#formCheckout`):
   ```html
   <div class="campo checkout__ancho">
     <label class="sr-only" for="coTelefono">Teléfono</label>
     <input type="tel" id="coTelefono" name="telefono" placeholder="Teléfono" autocomplete="tel" required>
   </div>
   ```
2. **JS** (`js/main.js`): añádelo a `camposEnvio`, a las `comprobaciones` de
   `datosDeEnvio()` y ya viajará dentro de `cliente` en el `JSON.stringify`.
3. **Endpoint** (`server/api.js`): recógelo en `POST /api/pedidos`
   (`const telefono = String(cliente.telefono || '').trim();`), valídalo y añade su `?` al INSERT.
4. **BD** (`server/datos/semillas.js`): `telefono TEXT DEFAULT ''` en la tabla `pedidos`
   (o en una BD ya creada: `ALTER TABLE pedidos ADD COLUMN telefono TEXT DEFAULT '';`).
5. Mismo patrón para el **newsletter** (`#formNewsletter`) o para una tabla nueva.

### 6.6 Estados del pedido
La columna `estado` admite: `nuevo` → `procesando` → `enviado` → `entregado` (o `cancelado`).
Se crea en `nuevo`. Para cambiarla (mientras no exista panel de admin):

```sql
UPDATE pedidos SET estado = 'enviado' WHERE referencia = 'NV-2026-1001';
```

Y un endpoint nuevo en `server/api.js` tarda cinco líneas:

```js
api.patch('/api/pedidos/:referencia', (ctx) => {
  if (!esAdmin(ctx)) return ctx.fallo(401, 'Token no válido');
  // valida estado ∈ ESTADOS_PEDIDO y ejecuta el UPDATE
});
```

### 6.7 Categorías nuevas (p. ej. "accesorios")
1. `index.html` → botón de filtro: `<button class="chip" data-filtro="accesorios">Accesorios</button>`.
2. `js/main.js` → `etiquetas.accesorios = 'Accesorios'` (y un icono en `iconos.accesorios`).
3. `server/api.js` → añade `'accesorios'` al objeto `CATEGORIAS` (si no, la API devuelve **400**).
4. Asigna la categoría a tus productos en la BD.

### 6.8 Conectar Stripe de verdad (solo pegar las claves)

**No hace falta `npm install stripe`**: el servidor llama a la API REST de
Stripe con `fetch` (módulo nativo de Node).

1. En `.env` **la clave ya está escrita**: pega el valor y reinicia.
   ```env
   STRIPE_SECRET_KEY=sk_test_…        # https://dashboard.stripe.com/apikeys
   STRIPE_WEBHOOK_SECRET=whsec_…      # opcional, ver paso 4
   SITE_URL=https://tudominio.com
   ```
2. `POST /api/checkout` deja de responder `modo:'demo'` y devuelve
   `modo:'stripe'` + `clientSecret`, listo para `@stripe/stripe-js` o Stripe
   Elements en el front. El importe sale de `{importe}` (euros) o se calcula
   desde `{lineas}`. Si envías también `{referencia}` (la del pedido creado),
   el id del cobro se guarda en `pedidos.stripe_payment_intent`.
   ```bash
   curl -X POST http://localhost:3004/api/checkout \
     -H "Content-Type: application/json" \
     --data-binary "{\"importe\": 24.99, \"referencia\": \"NV-2026-1001\"}"
   ```
3. Si Stripe devuelve un error (clave inválida, importe demasiado bajo…), la
   API responde **502** con el mensaje real de Stripe.
4. **Webhook** (implementado en `POST /api/stripe/webhook`): en
   <https://dashboard.stripe.com/webhooks> crea un endpoint
   `<SITE_URL>/api/stripe/webhook` con los eventos `payment_intent.succeeded`
   y `payment_intent.payment_failed`. Verifica la firma con
   `STRIPE_WEBHOOK_SECRET` (cuerpo en crudo, tolerancia de 5 min) y el pedido
   pasa de `nuevo` a `procesando`. Sin la clave, el webhook rechaza con 400.
5. Sin clave, **todo sigue funcionando en modo demo** (ese es el diseño: nunca
   se rompe nada).

### 6.9 Correos de pedido con Resend o SMTP
- **Resend (más fácil)**: cuenta gratis → API key → en `.env`:
  `RESEND_API_KEY=re_xxx`, `EMAIL_DE="NovaTech <hola@tudominio.com>"`,
  `EMAIL_PEDIDOS=pedidos@tudominio.com`. Verifica tu dominio en Resend.
- **SMTP (Gmail, Outlook, Mailgun)**: `npm install nodemailer` y en `.env`:
  `SMTP_HOST=smtp.gmail.com`, `SMTP_PUERTO=587`, `SMTP_USUARIO=…`, `SMTP_CLAVE=…`
  (contraseña de aplicación de Gmail).
- Los correos ya están cableados: el **parte de cada pedido** sale de `POST /api/pedidos`
  hacia `EMAIL_PEDIDOS`, y la **bienvenida del newsletter** hacia el suscriptor.
  Sin nada configurado no se envía nada y la API responde `correo: "demo"` (sin romper nada).
- Textos en `server/api.js` (busca `asunto:`).

### 6.10 Cambiar a Shopify, WooCommerce o una API headless
- **Shopify/WooCommerce**: sustituye la llamada de `js/main.js` por la API de la plataforma
  (por ejemplo `fetch('https://tutienda.myshopify.com/products.json')` y adapta los campos a
  `pintarCatalogo()`), y borra `server/` si ya no lo necesitas.
- **Headless**: deja `server/api.js` como fachada: los endpoints que hoy leen SQLite pueden
  reenviarse a la API externa. El carrito y el checkout no cambian: solo cambia de dónde
  salen los productos y a dónde va el pedido.
- **Solo pasarelas de pago**: usa el checkout de la plataforma y redirige; esta plantilla
  queda como escaparate.

### 6.11 Quitar el carrito
Borra en `index.html` el bloque `#carritoPanel` + `#overlayCarrito` + el botón `#abrirCarrito`
y, en `js/main.js`, las secciones 10 y 11. El catálogo es defensivo: si no encuentra esos
elementos (`document.getElementById(...)`) no falla. También puedes dejar solo el checkout
directo con `POST /api/pedidos`.

### 6.12 Cambiar puerto o dominio
`.env` → `PORT=8080`. En un servidor público: `HOST=0.0.0.0`, `SITE_URL=https://tudominio.com`
y un proxy inverso (Caddy/Nginx) con HTTPS delante. Para consumir la API desde otro dominio
activa `CORS=1` y `CORS_ORIGEN=https://otradominio.com`.

---

## 7. Qué se guarda en la base de datos

| Tabla | Columnas | Quién la escribe |
|---|---|---|
| `productos` | id, nombre, categoria, precio, descuento, valoracion, nuevo, colores (JSON), stock, activo, orden | semillas / tú |
| `pedidos` | id, referencia, nombre, email, direccion, ciudad, cp, estado, subtotal, envio, iva, total, stripe_payment_intent, ip, creado_en | `POST /api/pedidos` |
| `lineas_pedido` | id, pedido_id, producto_id, nombre, precio, cantidad | `POST /api/pedidos` |
| `suscriptores` | id, email, creado_en | `POST /api/newsletter` |

Consulta los datos con `GET /api/pedidos` (token) o con cualquier cliente SQLite
(DB Browser for SQLite, VS Code con extensión, `sqlite3` CLI).

Trucos útiles:

```sql
-- Stock bajo (para reponer)
SELECT nombre, stock FROM productos WHERE activo = 1 AND stock < 10 ORDER BY stock;

-- Ventas del día
SELECT COUNT(*) AS pedidos, ROUND(SUM(total), 2) AS vendido
FROM pedidos
WHERE creado_en >= datetime('now', 'start of day');

-- Estado de un pedido
SELECT estado FROM pedidos WHERE referencia = 'NV-2026-1001';
```

---

## 8. Despliegue

1. Sube la carpeta a tu servidor/VPS o a un servicio Node (Railway, Render, Fly.io…).
2. Variables de entorno en el panel: `PORT` (suele darlo la plataforma), `HOST=0.0.0.0`,
   `ADMIN_TOKEN` (uno largo), `SITE_URL=https://tudominio.com`, `DB_FILE` a una ruta
   persistente, y opcionalmente `RESEND_API_KEY` / `STRIPE_SECRET_KEY`.
3. Comando de arranque: `node server/server.js` (el `PORT` llega del entorno).
4. La BD SQLite se crea sola; para que sobreviva a despliegues, monta un **volumen** en
   `server/data/` o cambia `DB_FILE` a una ruta persistente.
5. Activa HTTPS (la plataforma o Caddy/Let's Encrypt) y no expongas `ADMIN_TOKEN` en el navegador.

---

## 9. Librerías opcionales (si quieres ir más allá)

| Librería | Para qué | Cuándo |
|---|---|---|
| `stripe` | cobros reales (PaymentIntents) | si activas `STRIPE_SECRET_KEY` |
| `nodemailer` | enviar correos por SMTP | si activas `SMTP_HOST` |
| `@stripe/stripe-js` | formulario de tarjeta en el front | checkout con Stripe Elements |
| `express` | servidor web más amplio | si la API crece mucho |
| `better-sqlite3` | SQLite alternativa a `node:sqlite` | si usas Node < 22.13 |
| `zod` / `joi` | validación de datos declarativa | muchos endpoints |
| `bcrypt` + `jsonwebtoken` | clientes con login y área privada | si añades cuentas |
| `nodemon` | reinicio automático | ya cubierto con `npm run dev` |

Ninguna es obligatoria: la plantilla arranca con `npm start` y cero dependencias.

---

## 10. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `No se pudo cargar "node:sqlite"` | Instala Node ≥ 22.13 y comprueba con `node -v` |
| `EADDRINUSE: port 3004` | Cambia `PORT` en `.env` o cierra el proceso anterior |
| El checkout dice "modo demo" | No hay servidor: ejecuta `npm start` y abre `http://localhost:3004` |
| `409 Stock insuficiente…` | Baja las unidades en el carrito o repone stock (`UPDATE productos SET stock=…`) |
| `400 Categoría no válida…` | Usa una de las claves de `CATEGORIAS` en `server/api.js` |
| `401 Token no válido` | Usa el `ADMIN_TOKEN` del `.env` en el header `x-admin-token` |
| `429 Demasiados pedidos/suscripciones` | Espera un minuto o sube `LIMITE_PEDIDO` / `LIMITE_NEWSLETTER` |
| El pedido no aparece en la lista | Consulta con token, o mira `server/data/tienda.db` con un cliente SQLite |
| Los cambios del `.env` no hacen efecto | Reinicia el servidor |
| El navegador cachea CSS/JS antiguos | Ctrl + F5 (el servidor manda `no-cache` en HTML) |
| Los precios del carrito no coinciden con la API | Recarga: al cargar se sincroniza `catalogo` con `GET /api/productos` |

---

## 11. Seguridad (antes de publicar)

- Cambia `ADMIN_TOKEN` por una clave larga y aleatoria.
- Mantén `.env` fuera de git (ya está en `.gitignore`).
- El servidor **nunca** sirve `.env`, `*.md`, `*.db` ni la carpeta `server/` (devuelve 403).
- El precio **nunca** se calcula en el navegador: las líneas del pedido se revalidan y
  se reprecian en el servidor, y el stock se descuenta dentro de una transacción.
- Añade HTTPS (obligatorio para pagos y cookies en producción).
- El límite por IP es en memoria: para múltiples servidores usa Redis o el límite de tu proxy.
- Si activas Stripe, verifica la firma de los webhooks y no guardes claves secretas en el front.
- Revisa RGPD antes de guardar nombres, direcciones y correos: avisos de privacidad,
  conservación mínima y derecho de supresión (`DELETE FROM suscriptores WHERE email=…`).

---

## 12. Licencia y personalización

Libre para usar en tus proyectos. Cambia textos, colores, productos, tablas y endpoints a
tu gusto: la estructura está pensada para copiar la carpeta y hacerla tuya.

La licencia completa está en [`../LICENSE`](../LICENSE) (MIT — Copyright (c) 2026 Alberto Ortiz).
