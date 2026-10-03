# Guía de usuario — 04-tienda · NovaTech Store

## Para quién es este documento

Para ti si vas a **usar** esta plantilla y no programas: quieres que tu tienda se vea, que el catálogo se filtre, que el carrito haga pedidos reales (con control de stock), que la newsletter guarde suscriptores y cambiar precios, IVA, envío o colores **sin tocar el código**. Aquí abajo encontrarás, paso a paso: cómo instalar y arrancar, qué pasa si abres `index.html` con doble clic, un recorrido por la web sección por sección, dónde mirar los datos que llegan, tres palancas de personalización, checklist de uso y qué hacer si algo falla.

Todo lo que aquí se cita (puertos, tokens, rutas y tablas) está leído de los ficheros `.env`, `README.md`, `server/api.js`, `server/datos/semillas.js` y `js/main.js` de esta plantilla; nada está inventado. Si algo **no existe**, lo digo con esas palabras.

- ¿Vas a programar, añadir endpoints o tocar la base de datos a fondo? → [GUIA-DESARROLLADOR.md](GUIA-DESARROLLADOR.md).
- ¿Vas a publicarla en internet? → [../../docs/DESPLIEGUE.md](../../docs/DESPLIEGUE.md).
- ¿Quieres recetas de personalización más extensas? → [../../docs/PERSONALIZACION.md](../../docs/PERSONALIZACION.md).
- ¿Solo quieres comprobar que la API responde? → [../../docs/API.md](../../docs/API.md).

---

## 1. Arranque en 5 minutos

### 1.1 Requisitos

| Requisito | Cómo comprobarlo | Por qué |
|---|---|---|
| Node **22.13 o superior** | `node -v` | La base de datos usa `node:sqlite`, incluido en esa versión |
| npm | `npm -v` | Viene con Node; solo se usan sus scripts |
| Un navegador actual | – | Chrome, Edge, Firefox o Safari |
| **No** hace falta `npm install` | – | La plantilla no tiene dependencias obligatorias |

### 1.2 Poner en marcha

Desde la carpeta `04-tienda`:

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

> **Puerto real**: el `.env` de esta plantilla trae `PORT=3004`. Si lo cambias, usa tu valor en todas las URLs de esta guía.

---

## 2. Recorrido por la web (sección por sección)

La web se sirve desde `index.html`. Cada sección tiene su `id` real; lo que ves, lo que rellenas y qué endpoint + tabla hay por detrás:

| Sección (id) | Qué ves / rellenas | Qué pasa (endpoint + tabla) |
|---|---|---|
| **Hero** (`#hero`) | Producto destacado (Auriculares Aura X2), botón «Añadir al carrito» (`data-add-rapido`) | `POST /api/pedidos` vía carrito → `pedidos` + `lineas_pedido` + descuenta `productos.stock` |
| **Catálogo** (`#catalogo`) | Grid de 8 productos; chips de filtro: **Todas / Auriculares / Teclados / Ratones / Monitores** (`#filtrosCategorias .chip[data-filtro]`) | `GET /api/productos?categoria=&q=&orden=` → `productos` (solo `activo=1`) |
|  | Buscador en vivo (`#buscar`) | Filtro client-side sobre `catalogo` (si hay servidor, ya viene filtrado de la API) |
|  | Orden (`#ordenar`): Destacados / Precio ↑ / Precio ↓ / Mejor valorados | `orden` en la query de `GET /api/productos` |
| **Ventajas** (`#ventajas`) | 4 tarjetas estáticas (envío, devoluciones, pago seguro, soporte) | — |
| **Testimonios** (`#testimonios`) | 3 opiniones estáticas | — |
| **Newsletter** (`#newsletter`) | Input email (`#email`) + botón «Suscribirme» (`#formNewsletter`) | `POST /api/newsletter` → `suscriptores` |
| **Carrito** (panel lateral `#carritoPanel`) | Líneas con +/−/eliminar, subtotal, nota de envío gratis desde 50 €, formulario de checkout | `localStorage` (`novatech-carrito`) + `POST /api/pedidos` al confirmar |
| **Checkout** (dentro del carrito, `#formCheckout`) | Nombre (`#coNombre`), email (`#coEmail`), dirección (`#coDireccion`), ciudad (`#coCiudad`), CP (`#coCp`) + botón «Finalizar compra» (`#finalizarCompra`) | `POST /api/pedidos` body: `{cliente:{nombre,email,direccion,ciudad,cp}, lineas:[{id,cantidad}]}` → crea `pedidos` + `lineas_pedido`, descuenta `stock`, devuelve `referencia NV-2026-XXXX` con `subtotal`, `envio`, `iva`, `total` |
| **Footer** | Enlaces, año dinámico (`#anio`), legales | — |

**Notas importantes**

- El catálogo **sincroniza** al cargar: `api('/api/productos')` en `js/main.js` (línea ~923) sustituye el array local por el de la BD (añade campo `stock`). Si no hay servidor, se queda con el array local (modo estático).
- El carrito **persiste** en `localStorage` y se renderiza al abrir (`renderCarrito`).
- El checkout **nunca** calcula precios en el navegador: manda `cliente` + `lineas` y el servidor revalida precio, descuento, stock, IVA y envío.
- Estados de pedido (columna `estado` en `pedidos`): `nuevo` → `procesando` → `enviado` → `entregado` (o `cancelado`). Se crea en `nuevo`.

---

## 3. Dónde ves lo que llega (bandeja de pedidos y suscriptores)

### 3.1 Con `curl` (PowerShell y bash)

El token de admin está en `.env`: `ADMIN_TOKEN=demo-token-tienda-7b31e5c9d2`. Se envía **solo** en la cabecera `x-admin-token` (nunca en la URL: `?token=…` se filtraría en los logs, el historial y el `Referer`; además la comparación es en tiempo constante).

**PowerShell** — *el body JSON va en fichero para evitar problemas de comillas*:

```powershell
# 1) Ver todos los pedidos (últimos 100)
curl.exe -H "x-admin-token: demo-token-tienda-7b31e5c9d2" http://localhost:3004/api/pedidos

# 2) Ver un pedido concreto (consulta pública, sin token)
curl.exe http://localhost:3004/api/pedidos/NV-2026-1001

# 3) Cambiar estado de un pedido (ej. a "enviado") — requiere endpoint nuevo (ver GUIA-DESARROLLADOR §6)
#    Por ahora: SQL directo en la BD (§3.2)

# 4) Ver suscriptores de la newsletter — **no hay endpoint de listado en la API actual**
#    Usa la BD directamente (§3.2) o añade el endpoint (receta en GUIA-DESARROLLADOR §6)

# 5) Crear un pedido de prueba (guarda este JSON como pedido.json)
@'
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
    { "id": 3, "cantidad": 2 }
  ]
}
'@ | Out-File -Encoding utf8 pedido.json

curl.exe -X POST http://localhost:3004/api/pedidos `
  -H "Content-Type: application/json" `
  --data-binary "@pedido.json"
```

**bash / zsh** (el body puede ir en línea):

```bash
# 1) Ver todos los pedidos
curl -H "x-admin-token: demo-token-tienda-7b31e5c9d2" http://localhost:3004/api/pedidos

# 2) Ver un pedido concreto
curl http://localhost:3004/api/pedidos/NV-2026-1001

# 3) Crear pedido de prueba
curl -X POST http://localhost:3004/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{"cliente":{"nombre":"Ana Prueba","email":"ana@correo.com","direccion":"Calle Mayor 12","ciudad":"Madrid","cp":"28013"},"lineas":[{"id":1,"cantidad":1},{"id":3,"cantidad":2}]}'
```

> El token viaja **solo** en la cabecera: `curl -H "x-admin-token: demo-token-tienda-7b31e5c9d2" http://localhost:3004/api/pedidos` (la comparación es en tiempo constante). Si el token no coincide → `401 {"error": "Token de administración no válido…"}`.

### 3.2 Con DB Browser for SQLite (visual)

1. Descarga **DB Browser for SQLite** (<https://sqlitebrowser.org>) e instálalo.
2. `Archivo → Abrir base de datos` → elige `04-tienda/server/data/tienda.db`.
3. Pestaña **Examinar datos** → tablas que te interesan:
   - `pedidos` (con `referencia`, `estado`, `subtotal`, `envio`, `iva`, `total`, `creado_en`)
   - `lineas_pedido` (líneas de cada pedido)
   - `productos` (ver `stock` actual, `activo`, `precio`, `descuento`)
   - `suscriptores` (email, `creado_en`)
4. Pestaña **Ejecutar SQL** para cambios puntuales (recetas en §5). Guarda (`Ctrl+S`) y recarga la web (`Ctrl+F5`).

⚠️ No edites la BD mientras otra herramienta la tiene abierta en modo escritura y tú además cambias cosas desde la web: elige una vía y recarga después. Nunca subas el `.db` a internet: el servidor lo bloquea con 403, pero mejor ni lo publicas.

---

## 4. Cambios sin programar (tres palancas)

| Palanca | Qué cambia | Cómo |
|---|---|---|
| **1. El `.env`** | Puerto, token admin, límites, IVA, envío, moneda, claves Stripe/Resend/SMTP | Edita y **reinicia** el servidor (`Ctrl+C` → `npm start`) |
| **2. Los datos de la BD** | Precios, stock, estados, visibilidad, suscriptores | DB Browser (§3.2) o SQL abajo; la web lo pinta sola al recargar |
| **3. `css/styles.css` → bloque `PALETA DE COLORES`** | Todo el color de la web | Cambia `--color-primary` (y su gemelo en `[data-theme="dark"]`) |

### 4.1 Recetas rápidas (4)

**Receta A · Cambiar precio / stock de un producto**

```sql
-- Precio de tarjeta y descuento
UPDATE productos SET precio = 79.99, descuento = 20 WHERE id = 1;
-- Stock
UPDATE productos SET stock = 50 WHERE id = 1;
```

Recarga `http://localhost:3004`: la tarjeta muestra el nuevo precio tachado + descuento, y el carrito/checkout usan el precio final recalculado. El servidor recalcula subtotal, envío e IVA con el nuevo valor.

**Receta B · Cambiar el IVA**

En `.env`: `IVA=10` (o `15`, `21`…). Reinicia el servidor.

El IVA **va incluido** en el precio: `iva = total - total / (1 + IVA/100)`. Se guarda en la columna `iva` de cada pedido. Cámbialo según tu país.

**Receta C · Cambiar coste de envío / umbral de gratis**

En `.env`:
```env
ENVIO_GRATIS_DESDE=50   # subtotal mínimo para envío gratis (€)
ENVIO_COSTE=4.99        # coste si no se llega al mínimo (€)
```
Reinicia.

⚠️ El aviso del carrito (`#notaEnvio` en `js/main.js` línea ~579) usa **50 € fijo**. Si cambias `ENVIO_GRATIS_DESDE`, actualízalo ahí también (o lee el valor desde `GET /api/salud`).

**Receta D · Cambiar colores de la marca**

En `css/styles.css`, bloque `PALETA DE COLORES — EDITA AQUÍ`:
```css
:root {
  --color-primary: #5b5bf0;   /* tu color */
  --color-primary-hover: #4a4ae0;
  --color-primary-light: #eaeaff;
}
[data-theme="dark"] {
  --color-primary: #7c7cff;
  --color-primary-hover: #9a9aff;
}
```
Recarga: botones, enlaces, badges, gráficas y degradados de productos usan esa variable.

---

## 5. Checklist de uso (8–10 clics con resultado)

1. ✅ `npm start` → consola muestra `Web: http://localhost:3004` y `API: http://localhost:3004/api/salud`.
2. ✅ Abre `http://localhost:3004` → ves hero, 8 productos con precio/descuento/stock, ventajas, testimonios, newsletter, footer.
3. ✅ Pulsa chip «Teclados» → grid se queda con 2 teclados (filtro server-side vía `GET /api/productos?categoria=teclados`).
4. ✅ Escribe «auricular» en buscador → aparecen los 2 auriculares (búsqueda client-side sobre catálogo sincronizado).
5. ✅ Cambia orden a «Precio: menor a mayor» → productos se reordenan (server-side si hay servidor, si no local).
6. ✅ «Añadir al carrito» en 2 productos → contador del icono sube a 2, panel lateral muestra líneas con +/−/eliminar, subtotal correcto.
7. ✅ Abre carrito → «Tramitar pedido» muestra formulario de envío; rellena 5 campos válidos → validación campo a campo en verde.
8. ✅ «Finalizar compra» → mensaje «¡Compra realizada! Pedido NV-2026-XXXX · X unidad(es) · Total XX,XX € (envío gratis, IVA de Y,YY € incluido)». Toast «¡Compra realizada! Pedido NV-2026-XXXX».
9. ✅ Abre `http://localhost:3004/api/pedidos/NV-2026-XXXX` → JSON con `estado: "nuevo"`, líneas, importes, cliente.
10. ✅ `curl -H "x-admin-token: demo-token-tienda-7b31e5c9d2" http://localhost:3004/api/pedidos` → array con tu pedido (últimos 100).

---

## 6. Si algo falla (5–6 fallos típicos)

| Síntoma | Qué pasa | Arreglo |
|---|---|---|
| `No se pudo cargar "node:sqlite"` | Node < 22.13 | Instala Node ≥ 22.13 (`node -v` para comprobar) |
| `EADDRINUSE: port 3004` | Puerto ocupado | Cambia `PORT` en `.env` o cierra el proceso anterior (`Ctrl+C`) |
| Checkout dice "modo demo" / no crea pedido | No hay servidor corriendo | Ejecuta `npm start` y abre `http://localhost:3004` (no doble clic) |
| `409 Stock insuficiente para "X": quedan N y has pedido M` | Pediste más de lo que hay en `productos.stock` | Baja unidades en el carrito o repone stock (`UPDATE productos SET stock=…`) |
| `400 Categoría no válida: "gaming". Usa una de: auriculares, teclados, ratones, monitores` | Filtro con categoría inexistente en `CATEGORIAS` de `server/api.js` | Usa una clave válida o añádela en `server/api.js` y en `js/main.js` (`etiquetas` + `iconos`) |
| `429 Demasiados pedidos desde esta conexión` | Límite `LIMITE_PEDIDO` (10/min por IP) | Espera 1 min o sube el límite en `.env` y reinicia |
| Webhook Stripe `401 Firma no válida` | `STRIPE_WEBHOOK_SECRET` no coincide con el panel de Stripe | Copia el secreto correcto de <https://dashboard.stripe.com/webhooks> a `.env` y reinicia |
| Pedido no aparece en lista admin | Consultas sin token o token equivocado | Usa `x-admin-token` con el `ADMIN_TOKEN` exacto de tu `.env` |

Para más casos (caché navegador, precios desincronizados, correo no enviado…) véase la sección 10 del README original y [../../docs/DESPLIEGUE.md](../../docs/DESPLIEGUE.md).

---

## 7. Documentación relacionada

- [GUIA-DESARROLLADOR.md](GUIA-DESARROLLADOR.md) — para quien va a tocar código, endpoints y esquema de la BD.
- [../../docs/API.md](../../docs/API.md) — índice exhaustivo de endpoints de las 7 plantillas.
- [../../docs/DESPLIEGUE.md](../../docs/DESPLIEGUE.md) — cómo subirla a internet con HTTPS y copias de seguridad.
- [../../docs/PERSONALIZACION.md](../../docs/PERSONALIZACION.md) — recetas de personalización ampliadas (identidad, contenido, secciones nuevas).
- [README.md](../README.md) — documentación completa de la plantilla (12 secciones).
- README de la raíz del repositorio: [../../README.md](../../README.md) — requisitos, estructura y patrones comunes de las 7 plantillas.