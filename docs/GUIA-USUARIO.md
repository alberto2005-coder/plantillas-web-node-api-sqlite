# Guía de usuario — las 7 plantillas web sin escribir código

## Para quién es este documento

Para ti si vas a **usar** estas plantillas y no programas: quieres enseñar tu web,
que los formularios guarden de verdad lo que escribe la gente y cambiar precios,
horarios o colores **sin tocar el código**. Aquí abajo encontrarás, paso a paso:
cómo instalar y arrancar, qué pasa si abres un `index.html` con doble clic, un
recorrido por cada plantilla con su checklist de uso, dónde mirar los datos que
llegan, tres palancas de personalización y qué hacer si algo falla.

Todo lo que aquí se cita (puertos, tokens, rutas y tablas) está leído de los
ficheros `.env`, `README.md` y `server/api.js` de este repositorio; nada está
inventado. Si algo **no existe**, lo digo con esas palabras.

- ¿Vas a programar, añadir endpoints o tocar la base de datos a fondo? →
  [GUIA-DESARROLLADOR.md](GUIA-DESARROLLADOR.md).
- ¿Vas a publicarla en internet? → [DESPLIEGUE.md](DESPLIEGUE.md).
- ¿Quieres recetas de personalización más extensas? →
  [PERSONALIZACION.md](PERSONALIZACION.md).
- ¿Solo quieres comprobar que la API responde? → [API.md](API.md).

---

## 1. Qué puedes hacer sin programar (y qué necesitas)

**Puedes, sin escribir una línea de código:**

- Arrancar cualquiera de las 7 plantillas con un comando y verla en el navegador.
- Recibir mensajes de contacto (01), altas de prueba (02), suscripciones de
  newsletter (03 y 04), pedidos de compra (04), solicitudes de presupuesto (05)
  y reservas de mesa (07), y **leerlos** con un token.
- Ver el panel de la 06, filtrar sus pedidos y exportarlos a CSV.
- Cambiar tres cosas «a mano»: el fichero `.env`, los datos de la base de datos
  y el bloque de colores del CSS (§6).

**Lo único que necesitas:**

| Requisito | Cómo comprobarlo | Por qué |
|---|---|---|
| Node **22.13 o superior** | `node -v` | La base de datos usa `node:sqlite`, incluido en esa versión |
| npm | `npm -v` | Viene con Node; solo se usan sus scripts |
| Un navegador actual | – | Chrome, Edge, Firefox o Safari |
| **No** hace falta `npm install` | – | Las plantillas no tienen dependencias obligatorias |

---

## 2. Instalación y arranque

### 2.1 Comprobar Node

```powershell
node -v        # debe imprimir v22.13.0 o superior
```

Si sale `v20.x` (o el comando no existe) instala Node desde
<https://nodejs.org> y vuelve a abrir la terminal.

### 2.2 Primera vez: crear los `.env`

Desde la carpeta `plantillas-web` (la que contiene las 7 carpetas):

```powershell
powershell -ExecutionPolicy Bypass -File .\configurar.ps1
```

```bash
bash configurar.sh
```

Comprueba la versión de Node y **crea el `.env` de cada plantilla copiando su
`.env.example`**. No borra nada: si un `.env` ya existe, lo deja como está. En
este repositorio los siete `.env` ya vienen rellenos con valores de demo, así
que este paso te dirá «ya existe (no se toca)».

### 2.3 Arrancar una plantilla

`npm start` se ejecuta **dentro de cada carpeta** (en la raíz no hay
`package.json`, por eso no funciona `npm start` en la raíz):

```powershell
cd 01-portfolio
npm start
# → Web:  http://localhost:3000
# → API:  http://localhost:3000/api/salud
```

Si prefieres no cambiar de carpeta, desde la raíz también arranca (lee su
`.env` igual):

```powershell
node 01-portfolio/server/server.js
```

**Para parar el servidor:** `Ctrl + C`.

| Comando (dentro de la carpeta de la plantilla) | Qué hace |
|---|---|
| `npm start` | Arranca servidor + API + web en el mismo puerto |
| `npm run dev` | Igual, pero reinicia solo al guardar un fichero |
| `npm run reiniciar` | **Borra la base de datos** y la vuelve a sembrar con los datos de ejemplo |
| `node server/server.js` | Arranque directo, sin pasar por npm |

> ⚠️ `npm run reiniciar` borra los mensajes, pedidos o reservas que hayas
> recibido. Úsalo solo cuando quieras volver a cero.

### 2.4 Puerto distinto (para ver varias a la vez)

```powershell
$env:PORT=3101; npm start     # Windows (PowerShell), dentro de la carpeta
```

```bash
PORT=3101 npm start            # macOS / Linux
```

### 2.5 Las 7 plantillas de un vistazo

| Carpeta | Puerto en su `.env` | URL | Qué hace esa web |
|---|---|---|---|
| `01-portfolio` | 3000 | http://localhost:3000 | Portafolio personal con filtros de proyectos y formulario de contacto |
| `02-saas` | 3000 | http://localhost:3000 | Landing del producto SaaS «Fluxo»: precios, alta de prueba y newsletter |
| `03-blog` | 3003 | http://localhost:3003 | Blog «Bitácora Digital»: artículos paginados, buscador y newsletter |
| `04-tienda` | 3004 | http://localhost:3004 | Tienda «NovaTech Store»: catálogo, carrito y checkout con pedido real |
| `05-agencia` | 3105 | http://localhost:3105 | Landing de la agencia «Vértice» con formulario de presupuesto |
| `06-dashboard` | 3006 | http://localhost:3006 | Panel «Nova Analytics»: KPIs, gráficas, pedidos y exportación CSV |
| `07-restaurante` | 3007 | http://localhost:3007 | Restaurante «Casa Olivera»: carta y reservas con huecos libres |

⚠️ **01 y 02 comparten el puerto 3000**: no puedes tenerlas arrancadas a la vez
(si lo intentas, la segunda falla con `EADDRINUSE`). Arranca una, párala con
`Ctrl + C` y arranca la otra, o cambia el puerto de una de ellas con
`$env:PORT=3101; npm start`.

### 2.6 Comprobación automática de las siete

```powershell
powershell -ExecutionPolicy Bypass -File .\verificar.ps1
```

Arranca cada plantilla en un puerto de prueba (3101…3107), comprueba que
`GET /api/salud` y la portada responden 200 y las vuelve a parar. Mira
[verificar.ps1](../verificar.ps1).

---

## 3. Modo demo (doble clic en `index.html`)

Si haces **doble clic en `index.html`** (sin servidor), la web se ve completa y
casi todo responde: los formularios validan y muestran el mensaje de éxito **en
local, y no se guarda nada**. La consola del navegador (`F12`) avisa con mensajes
como `[api] Modo demo: no hay servidor…`.

| Plantilla | Qué funciona sin servidor | Qué NO funciona sin servidor |
|---|---|---|
| 01-portfolio | Secciones, filtros de proyectos y el formulario (aviso «Modo demo») | El mensaje **no se guarda**: no hay bandeja; los enlaces «Ver demo»/«Código» se quedan en `#` |
| 02-saas | Precios (salen del propio HTML), FAQ y el alta de prueba en local | No hay alta real ni fila en `suscripciones`; «Contratar ahora con tarjeta» no puede crear sesión de pago |
| 03-blog | Portada con los artículos del HTML y newsletter en local | `articulo.html?slug=…` muestra «No hay servidor conectado»: necesita la API |
| 04-tienda | Catálogo (array de `js/main.js`), filtros, carrito y checkout en local | El pedido **no se crea**, no hay referencia `NV-…` ni descuento de stock |
| 05-agencia | Proyectos, servicios, cifras y el formulario en local | La solicitud **no se guarda**; no hay referencia `VTX-…` |
| 06-dashboard | Todo el panel con sus datos de ejemplo y sus gráficas | Los filtros y datos no vienen de la BD y **Exportar CSV falla** (necesita la API) |
| 07-restaurante | Carta, horarios y opiniones (arrays de `js/main.js`), reserva en local | No consulta huecos reales ni guarda la reserva: no hay referencia `CO-…` |

**Cuándo conviene el modo demo:** para enseñar el diseño, mandar capturas o
probar los textos. **Cuándo no:** para enseñar «funcionando» el formulario, el
carrito o las reservas — en ese caso arranca el servidor (§2.3) y abre
`http://localhost:<PUERTO>`.

---

## 4. Recorrido por cada plantilla

Cada checklist supone el servidor arrancado (§2.3) y la web abierta en su
puerto (§2.5). «Endpoint + tabla» es lo que pasa por detrás: la dirección que
llama el navegador y la tabla de la base de datos que recibe el dato.

### 4.1 · `01-portfolio` — portafolio con contacto (puerto 3000)

**Qué hace:** una web personal con menú, hero, «Sobre mí», proyectos con
filtros, habilidades, experiencia y un formulario de contacto real.

**Sección por sección:** Inicio (hero) → Sobre mí → Proyectos (chips de
categoría: todas, web, app, diseño, marca) → Habilidades → Experiencia →
Contacto (`#formulario-contacto`, con nombre, correo y mensaje).

**Qué rellena el visitante y qué pasa por detrás:**

| Qué escribe | Endpoint | Tabla |
|---|---|---|
| Nombre, correo y mensaje del formulario | `POST /api/contacto` | `mensajes` (id, nombre, email, mensaje, ip, leido, creado_en) |
| – (solo lectura) | `GET /api/proyectos` | `proyectos` |

Sin correo configurado en `.env`, la API responde `correo: "demo"`: **el mensaje
se guarda igualmente**.

**Checklist de uso (7 clics):**

1. ✅ Abre `http://localhost:3000` → ves el portafolio con el menú y el hero.
2. ✅ Pulsa «Proyectos» en el menú → la sección de proyectos queda en pantalla.
3. ✅ Pulsa el chip «App» → el grid se queda solo con los proyectos de esa categoría.
4. ✅ Baja a «Contacto» y escribe nombre, un correo válido y un mensaje de 10
   caracteres o más → el formulario se pone en «Enviando…».
5. ✅ Pulsa «Enviar» → aparece «✓ Mensaje recibido. Gracias por escribir.» y el
   formulario se vacía.
6. ✅ Copia el mensaje de la consola del servidor → ahí no hay nada: el dato está
   en la BD (§5).
7. ✅ Consulta la bandeja (§5.1) → aparece tu mensaje con su `id`.

### 4.2 · `02-saas` — precios, altas y checkout demo (puerto 3000)

**Qué hace:** landing de un producto SaaS con hero de registro, funciones,
tres planes de precios, testimonios, FAQ y cierre.

**Sección por sección:** `#registro` (hero con el campo de correo) →
`#funciones` → `#precios` (planes Básico / Pro / Destacado / Empresa con
mensual y anual) → `#testimonios` → `#faq` → `#cta`.

**Qué rellena el visitante y qué pasa por detrás:**

| Qué escribe | Endpoint | Tabla |
|---|---|---|
| Correo del hero (el plan sale de la tarjeta elegida) | `POST /api/registro` | `suscripciones` (estado `prueba`) |
| Correo del newsletter | `POST /api/newsletter` | `newsletter` |
| Correo al pulsar «Contratar ahora con tarjeta →» | `POST /api/pago/sesion` | – (sin `STRIPE_SECRET_KEY` responde `{modo:'demo'}` y no cobra) |
| – (precios desde la BD) | `GET /api/planes` | `planes` |

**Checklist de uso (8 clics):**

1. ✅ Abre `http://localhost:3000` (con la 01 parada) → ves la landing de Fluxo.
2. ✅ Pulsa «Precios» → ves los tres planes con precios mensuales y anuales.
3. ✅ Comprueba que el plan Pro está destacado con su etiqueta → esos números
   salen de la tabla `planes`, no del HTML.
4. ✅ Baja al hero y escribe un correo de prueba (p. ej. `ana@empresa.com`).
5. ✅ Pulsa el botón de registro → mensaje de éxito y alta real en la BD.
6. ✅ Pulsa «Contratar ahora con tarjeta →» del plan Pro →
   aparece el aviso de que Stripe no está configurado (**modo demo: no se cobra
   nada**).
7. ✅ Escribe un correo en el newsletter y suscríbete → «¡Listo! Avisaremos…».
8. ✅ Consulta la bandeja de altas (§5.1) → aparece tu correo con estado `prueba`.

### 4.3 · `03-blog` — leer, paginar y buscar (puerto 3003)

**Qué hace:** un blog con artículo destacado en portada, grid paginado,
chips de categorías, sidebar con buscador y categorías, página de detalle y dos
formularios de newsletter.

**Sección por sección:** Inicio (destacado) → `#articulos` (grid + chips +
paginación `‹ 1 2 3 ›`) → sidebar (`#buscar-side`, `#categorias`, «Lo más
leído») → `#newsletter` → página `articulo.html?slug=…`.

**Qué rellena el visitante y qué pasa por detrás:**

| Qué escribe | Endpoint | Tabla |
|---|---|---|
| Correo de la newsletter (lateral u ancha) | `POST /api/newsletter` | `suscriptores` (email UNIQUE, origen, confirmado) |
| – (listado paginado, filtros y búsqueda) | `GET /api/articulos?categoria=&q=&tag=&pagina=&por_pagina=` | `articulos` |
| – (contador de lecturas) | `GET /api/articulos/:slug` | `articulos.vistas` |

**Checklist de uso (8 clics):**

1. ✅ Abre `http://localhost:3003` → ves el destacado y los artículos de la 1ª
   página (3 por página: `POR_PAGINA=3` en `.env`).
2. ✅ Pulsa «2» en la paginación → el grid cambia y la URL de la API lleva
   `?pagina=2`.
3. ✅ Pulsa el chip «Seguridad» → solo quedan artículos de esa categoría.
4. ✅ Escribe `movil` en el buscador del sidebar y pulsa Intro → aparece el
   artículo de «móvil» **sin tilde** (la búsqueda las ignora).
5. ✅ Pulsa un título → se abre `articulo.html?slug=…` con el cuerpo completo.
6. ✅ Recarga esa página y vuelve al listado → la vista del artículo ha subido 1.
7. ✅ Escribe un correo en el newsletter y suscríbete → confirmación en pantalla
   y fila nueva en `suscriptores`.
8. ✅ (Opcional) Crea un artículo con el `curl` de §4 de
   [API.md](API.md#33-03-blog) → aparece en la portada al recargar.

### 4.4 · `04-tienda` — carrito, pedido y estado (puerto 3004)

**Qué hace:** e-commerce con catálogo filtrable, carrito lateral, checkout con
dirección, cálculo de envío e IVA, newsletter y consulta de pedidos.

**Sección por sección:** Hero → `#catalogo` (chips Todas/Auriculares/Teclados/
Ratones/Monitores, buscador y orden) → `#ventajas` → `#testimonios` →
`#newsletter`; el carrito es un panel lateral (`#carritoPanel`) con el formulario
de checkout dentro (`#formCheckout`).

**Qué rellena el visitante y qué pasa por detrás:**

| Qué escribe | Endpoint | Tabla |
|---|---|---|
| Nombre, correo, dirección, ciudad y CP | `POST /api/pedidos` | `pedidos` + `lineas_pedido` (y baja `productos.stock`) |
| Correo del newsletter | `POST /api/newsletter` | `suscriptores` |
| – (catálogo, filtros y orden) | `GET /api/productos?categoria=&q=&orden=` | `productos` |
| – (estado de un pedido) | `GET /api/pedidos/:referencia` | `pedidos` |

**Checklist de uso (8 clics):**

1. ✅ Abre `http://localhost:3004` → ves 8 productos con precio, descuento y stock.
2. ✅ Pulsa el chip «Teclados» → el catálogo se queda con los teclados (filtro
   server-side).
3. ✅ Pulsa «Añadir al carrito» en dos productos → el contador del icono del
   carrito sube.
4. ✅ Abre el carrito y pulsa «Tramitar pedido» → aparece el formulario de envío.
5. ✅ Rellena nombre, correo, dirección, ciudad y CP → validación campo a campo.
6. ✅ Confirma la compra → mensaje «¡Compra realizada! Pedido NV-2026-…» con
   subtotal, envío (gratis desde 50 €) e IVA incluido.
7. ✅ Abre `http://localhost:3004/api/pedidos/NV-2026-XXXX` en el navegador →
   ves el pedido en JSON con su estado `nuevo` **y sus líneas**.
8. ✅ (Opcional) Mira el stock en §5.1 o en la BD → los productos comprados han
   bajado unidades.

> No hay pantalla de seguimiento en la web: la consulta pública del estado es la
> dirección del paso 7 (o la lista con token de §5.1).

### 4.5 · `05-agencia` — solicitud de presupuesto (puerto 3105)

**Qué hace:** landing de agencia con proyectos (abren un modal), servicios,
cifras animadas y un formulario de presupuesto completo.

**Sección por sección:** Hero → `#servicios` (4 servicios numerados) →
`#trabajo` (6 proyectos) → `#estudio` (cifras, premios y equipo) → `#contacto`
con el formulario `#form-presupuesto`.

**Qué rellena el visitante y qué pasa por detrás:**

| Qué escribe | Endpoint | Tabla |
|---|---|---|
| Nombre, correo, empresa, tipo de proyecto, tramo y mensaje | `POST /api/presupuesto` | `presupuestos` (con referencia `VTX-…`) |
| – (proyectos, servicios y cifras) | `GET /api/proyectos`, `/api/servicios`, `/api/cifras` | `proyectos`, `servicios`, `cifras` |

**Checklist de uso (7 clics):**

1. ✅ Abre `http://localhost:3105` → ves la landing de Vértice.
2. ✅ Pulsa «Trabajo» y abre cualquier proyecto → se abre el modal con su ficha
   (los datos vienen de `GET /api/proyectos`).
3. ✅ Baja a «Estudio» → los contadores suben hasta su valor (`GET /api/cifras`).
4. ✅ Pulsa «Pedir presupuesto» → aterriza en el formulario de contacto.
5. ✅ Rellena nombre, correo, elige «Web» como tipo, un tramo de presupuesto y un
   mensaje de 10 caracteres o más.
6. ✅ Envía → aparece «✓ Solicitud recibida… Referencia: VTX-0001-XXXX».
7. ✅ Consulta la bandeja (§5.1) → está tu solicitud con su referencia.

### 4.6 · `06-dashboard` — panel, filtros y CSV (puerto 3006)

**Qué hace:** un panel de administración con vistas de Resumen (KPIs, gráfica de
líneas, dona, últimos pedidos y actividad), Ventas, Productos, Clientes,
Pedidos y Ajustes.

**Sección por sección:** barra lateral con las 6 vistas → Resumen → Ventas →
Productos → Clientes → **Pedidos** (chips de estado, buscador, botones
«Refrescar» y «Exportar CSV») → Ajustes.

**Sobre el «login» (importante, para que no te sorprenda):**

- La web **no tiene formulario de usuario/contraseña**: al pulsar «Refrescar» o
  «Exportar CSV» se abre un cuadro de diálogo que pide el **token** del `.env`
  (`ADMIN_TOKEN`), y ese token queda guardado en la pestaña.
- El login con usuario y contraseña **existe en la API** (`POST /api/login`,
  credenciales del `.env`: `admin` / `nova-demo-2026`) y devuelve un token de
  24 h, pero **ninguna página de la plantilla lo llama**: es para que lo uses
  desde la terminal (§5.1) o para que alguien lo conecte al front.

**Qué rellena el usuario y qué pasa por detrás:**

| Qué hace | Endpoint | Tabla |
|---|---|---|
| Filtra por estado y busca texto | `GET /api/pedidos?estado=&q=` | `pedidos` (filtrado en el servidor) |
| Cambia el estado de un pedido | `PATCH /api/pedidos/:id/estado` | `pedidos` + `actividad` |
| Exporta el CSV | `GET /api/exportar/pedidos.csv` | – (fichero `text/csv` con BOM) |
| Se identifica con usuario/contraseña | `POST /api/login` | `sesiones` (token de 24 h) |

**Checklist de uso (8 clics):**

1. ✅ Abre `http://localhost:3006` → ves Resumen con 4 KPIs y la gráfica.
2. ✅ Pulsa «Pedidos» en la barra lateral → tabla con los 18 pedidos de ejemplo.
3. ✅ Pulsa el chip «Pendiente» → solo quedan los pedidos con ese estado (el
   filtro lo aplica el servidor).
4. ✅ Escribe `lucia` en el buscador de la tabla → aparece «Lucía Fernández»
   aunque el nombre lleve tilde.
5. ✅ Cambia el estado de un pedido a «Entregado» → cambia en la tabla y aparece
   en la lista de actividad.
6. ✅ Pulsa «Exportar CSV» → te pide el token: pega el valor de `ADMIN_TOKEN`
   del `.env` (`demo-token-dashboard-9f4c2b7e1a`).
7. ✅ Se descarga `csv` (`pedidos.csv`) → ábrelo: sale con BOM UTF-8, Excel lo
   muestra con los acentos bien.
8. ✅ (Opcional) Mira la vista Ajustes → es solo local, no guarda en la BD.

### 4.7 · `07-restaurante` — fecha, horas libres y reserva (puerto 3007)

**Qué hace:** web de restaurante con carta filtrable, horarios, opiniones, FAQ
y un motor de reservas que muestra **las horas con hueco libre**.

**Sección por sección:** `#inicio` → `#cifras` → `#carta` (chips por categoría
y buscador) → **`#reservar`** (formulario) → `#nosotros` → `#opiniones` →
`#faq` → `#contacto`.

**Qué rellena el visitante y qué pasa por detrás:**

| Qué escribe | Endpoint | Tabla |
|---|---|---|
| Fecha → consulta de huecos | `GET /api/disponibilidad?fecha=&comensales=` | lee `horarios` + `reservas` |
| Hora, comensales, nombre, teléfono, correo y notas | `POST /api/reservas` | `reservas` (referencia `CO-00xx`, estado `pendiente`) |
| – (carta, horarios y opiniones) | `GET /api/carta`, `/api/horarios`, `/api/resenas` | `platos`, `horarios`, `resenas` |

Reglas de la casa (todas del `.env`): huecos cada 30 minutos
(`INTERVALO_RESERVA`), máximo 4 reservas por hora (`MAX_POR_HORA`), 1 a 12
comensales (`COMENSALES_MAX`), hasta 90 días por delante (`DIAS_MAX_RESERVA`).

**Checklist de uso (8 clics):**

1. ✅ Abre `http://localhost:3007` → ves la web del restaurante.
2. ✅ En «Carta» pulsa el chip «Arroces» → se quedan los arroces (o busca
   `fideua`: encuentra «fideuà» sin tilde).
3. ✅ Baja a «Reservar mesa» y elige una fecha a partir de hoy → el desplegable
   de horas dice «Consultando disponibilidad…» y luego se rellena solo.
4. ✅ Comprueba que algún hueco aparece marcado como ocupada → eso viene de
   `GET /api/disponibilidad`, no de un texto fijo.
5. ✅ Elige hora y comensales, y rellena nombre y teléfono (9 dígitos).
6. ✅ Pulsa «Reservar» → mensaje «✓ Reserva recibida… **Referencia: CO-0041**».
7. ✅ Repite la misma reserva (misma fecha, hora y teléfono) → error
   «✗ Esa hora ya no está disponible» (409): el servidor lo vuelve a comprobar
   en el instante de guardar.
8. ✅ Consulta la bandeja (§5.1) con la fecha elegida → aparece tu reserva.

---

## 5. Dónde se ven los datos que llegan

Hay dos formas: **la API con token** (rápida, desde la terminal) y **la base de
datos** (visual, con un programa gratuito).

### 5.1 La API de administración con el token

Cada plantilla tiene un `ADMIN_TOKEN` en su `.env` (valor de demo ya puesto):

| Plantilla | Puerto | Endpoint de lectura | `ADMIN_TOKEN` del `.env` |
|---|---|---|---|
| 01-portfolio | 3000 | `GET /api/mensajes` | `demo-token-portfolio-9f4c2b7e1a` |
| 02-saas | 3000 | `GET /api/suscripciones` | `demo-token-saas-7c21e8b4f6` |
| 03-blog | 3003 | **no tiene** (el CRUD es `POST/PUT/DELETE /api/articulos`) | `demo-token-blog-7c1e5a93bd` |
| 04-tienda | 3004 | `GET /api/pedidos` | `demo-token-tienda-7b31e5c9d2` |
| 05-agencia | 3105 | `GET /api/presupuestos` | `demo-token-agencia-3b7e91c5d2` |
| 06-dashboard | 3006 | `GET /api/exportar/pedidos.csv` (`GET /api/pedidos` es público) | `demo-token-dashboard-9f4c2b7e1a` |
| 07-restaurante | 3007 | `GET /api/reservas?fecha=AAAA-MM-DD` | `demo-token-restaurante-7a3f91c258` |

La 03 es la excepción: **no existe un endpoint que liste los suscriptores**; se
leen directamente de la base de datos (§5.2) o se añade ese endpoint (receta en
su README §6.9).

**PowerShell** (pega el bloque entero; el token va en la cabecera
`x-admin-token`):

```powershell
# 1) Ver los mensajes de contacto de la plantilla 01
curl.exe -H "x-admin-token: demo-token-portfolio-9f4c2b7e1a" http://localhost:3000/api/mensajes

# 2) Enviar un cuerpo JSON desde PowerShell: guárdalo en un fichero primero
#    (Set-Content añadiría BOM en Windows PowerShell, por eso WriteAllText)
[System.IO.File]::WriteAllText("$PWD\cuerpo.json", @'
{
  "nombre": "Ana Prueba",
  "email": "ana@correo.com",
  "mensaje": "Quiero una web para mi negocio, ¿hablamos?"
}
'@)
curl.exe -X POST http://localhost:3000/api/contacto `
  -H "Content-Type: application/json" `
  --data-binary "@cuerpo.json"

# 3) Exportar el CSV de pedidos de la 06
curl.exe -H "x-admin-token: demo-token-dashboard-9f4c2b7e1a" `
  http://localhost:3006/api/exportar/pedidos.csv -o pedidos.csv
```

**bash / zsh** (el cuerpo puede ir en línea):

```bash
curl -H "x-admin-token: demo-token-portfolio-9f4c2b7e1a" http://localhost:3000/api/mensajes

curl -X POST http://localhost:3000/api/contacto \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana Prueba","email":"ana@correo.com","mensaje":"Quiero una web para mi negocio, ¿hablamos?"}'
```

> En las siete plantillas el token viaja **solo** en la cabecera
> `x-admin-token`; ya no se admite en la URL (`?token=…` se filtraba en los
> logs, en el historial del navegador y en la cabecera `Referer`). Si el token
> no coincide, la respuesta es `401 {"error": "Token de administración no
> válido…"}` (la comparación se hace en tiempo constante con
> `crypto.timingSafeEqual`).

**La 06, además, con usuario y contraseña** (24 h de duración):

```powershell
[System.IO.File]::WriteAllText("$PWD\login.json", '{ "usuario": "admin", "clave": "nova-demo-2026" }')
curl.exe -X POST http://localhost:3006/api/login -H "Content-Type: application/json" --data-binary "@login.json"
# → { "ok": true, "token": "…", "usuario": "admin", "caduca_en": "…" }
curl.exe -H "x-admin-token: PEGA_AQUÍ_EL_TOKEN" http://localhost:3006/api/yo
```

En la propia web, el «panel de login» es el diálogo que pide el token al pulsar
«Exportar CSV» (§4.6).

### 5.2 La base de datos con DB Browser for SQLite

Cada plantilla guarda su base en su carpeta `server/data/` (el fichero **se crea
solo** en el primer `npm start`):

| Plantilla | Fichero | Tablas que te interesan |
|---|---|---|
| 01-portfolio | `01-portfolio/server/data/portfolio.db` | `mensajes`, `proyectos` |
| 02-saas | `02-saas/server/data/saas.db` | `suscripciones`, `newsletter`, `planes` |
| 03-blog | `03-blog/server/data/blog.db` | `suscriptores`, `articulos` |
| 04-tienda | `04-tienda/server/data/tienda.db` | `pedidos`, `lineas_pedido`, `productos`, `suscriptores` |
| 05-agencia | `05-agencia/server/data/agencia.db` | `presupuestos`, `proyectos`, `servicios`, `cifras` |
| 06-dashboard | `06-dashboard/server/data/dashboard.db` | `pedidos`, `metricas`, `sesiones`, `actividad` |
| 07-restaurante | `07-restaurante/server/data/restaurante.db` | `reservas`, `horarios`, `platos`, `resenas` |

Pasos:

1. Descarga **DB Browser for SQLite** (<https://sqlitebrowser.org>) e instálalo.
2. `Archivo → Abrir base de datos` y elige el `.db` de la plantilla.
3. Pestaña **Examinar datos** para ver las filas; **Ejecutar SQL** para cambios
   puntuales (recetas en §6).
4. Guarda los cambios (`Ctrl + S`) y **recarga la web** (`Ctrl + F5`).

⚠️ No edites la BD mientras otra herramienta la tiene aberta en modo escritura y
tú además cambias cosas desde la web: elige una vía y recarga después. Y nunca
subas el `.db` a internet: el servidor lo bloquea con 403, pero mejor ni lo
publicas.

### 5.3 Verificación rápida de las siete APIs

Con cualquier plantilla arrancada:

```powershell
curl.exe http://localhost:3007/api/salud
# → { "ok": true, "servicio": "restaurante-api", … }
```

---

## 6. Cambios sin programar: solo tres palancas

| Palanca | Qué cambia | Cómo |
|---|---|---|
| **1. El `.env`** | Puerto, token de administración, límites, IVA, envío, tamaño de los turnos… | Edita y **reinicia** el servidor (`Ctrl + C` → `npm start`) |
| **2. Los datos de la BD** | Precios, estados, horarios, artículos, visibilidad | DB Browser (§5.2) o SQL de abajo; la web lo pinta sola al recargar |
| **3. `css/styles.css` → bloque `PALETA DE COLORES — EDITA AQUÍ`** | Todo el color de la web | Cambia `--color-primary` (y su gemelo en `[data-theme="dark"]`) |

### Recetas concretas (5)

**Receta A · Cambiar el precio de un producto (04-tienda).**
En DB Browser, pestaña SQL:

```sql
UPDATE productos SET precio = 89.99, descuento = 15 WHERE id = 1;
```

Recarga `http://localhost:3004`: el precio y el descuento de esa tarjeta cambian,
y **el servidor recalcula el subtotal, el envío y el IVA** con el nuevo valor.

**Receta B · Cerrar un día o alargar la noche (07-restaurante).**

```sql
UPDATE horarios SET cerrado = 1, turnos = '[]' WHERE dia = 'martes';
UPDATE horarios SET turnos = '[{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"01:00"}]'
  WHERE dia = 'viernes';
```

Los turnos se leen en cada petición: la tabla de horarios **y** la lista de horas
libres del formulario cambian sin reiniciar nada. Compruébalo con
`curl.exe "http://localhost:3007/api/disponibilidad?fecha=AAAA-MM-DD&comensales=2"`.

**Receta C · Publicar (o retirar) un artículo (03-blog).**

```sql
UPDATE articulos SET publicado = 1 WHERE slug = 'passkeys-en-la-practica';
UPDATE articulos SET publicado = 0 WHERE slug = 'passkeys-en-la-practica';  -- lo oculta
```

Con `publicado = 0` el artículo deja de aparecer en el listado, en las
categorías y en la portada (y `GET /api/articulos/:slug` responde 404 para los
demás). Si prefieres crear uno nuevo, usa el `curl` del README de la 03 §4.

**Receta D · Cambiar el precio de un plan (02-saas).**

```sql
UPDATE planes SET precio_anual = 17 WHERE clave = 'pro';
```

Recarga la landing: cambia el precio anual **y** la nota «Facturado anualmente
(…)» se recalcula sola (`precio_anual × 12`). También puedes marcar otro plan
como destacado con `UPDATE planes SET destacado = 0 WHERE clave = 'pro';`.

**Receta E · Cambiar puerto, token o límites (cualquier plantilla).**
Abre el `.env` de esa carpeta, por ejemplo en la 01:

```env
PORT=8080
ADMIN_TOKEN=cambia-esto-por-una-clave-larga-y-aleatoria
LIMITE_CONTACTO=20
```

Guarda, reinicia (`Ctrl + C` → `npm start`) y abre el puerto nuevo. Otros
valores útiles: `IVA` y `ENVIO_GRATIS_DESDE` (04), `POR_PAGINA` (03),
`MAX_POR_HORA`, `INTERVALO_RESERVA` y `COMENSALES_MAX` (07),
`ADMIN_USER`/`ADMIN_PASSWORD` (06).

Hay más recetas (añadir productos, secciones o campos a los formularios) en
[PERSONALIZACION.md](PERSONALIZACION.md) y en el README de cada plantilla, por
ejemplo [04-tienda/README.md](../04-tienda/README.md).

---

## 7. Prueba completa en 5 minutos antes de enseñar tu web

- [ ] ✅ `node -v` imprime **v22.13 o superior**.
- [ ] ✅ Las siete APIs responden: `powershell -ExecutionPolicy Bypass -File .\verificar.ps1`
      → «7 de 7 plantillas verificadas».
- [ ] ✅ Arrancas la plantilla que vas a enseñar y abres `http://localhost:<PUERTO>`
      con el puerto de su `.env` (tabla de §2.5).
- [ ] ✅ `curl.exe http://localhost:<PUERTO>/api/salud` devuelve `"ok": true`.
- [ ] ✅ Recorres la web entera arriba abajo: no hay enlaces rotos ni textos de
      relleno (si usaste el modo demo, recuerda que los formularios no guardan).
- [ ] ✅ Envías el formulario principal y aparece el mensaje de éxito
      (01 contacto · 02 registro · 03/04 newsletter · 04 pedido · 05 presupuesto
      · 07 reserva).
- [ ] ✅ Ves ese dato recién creado: con token (§5.1) o en la BD (§5.2).
- [ ] ✅ Compruebas los colores: si cambiaste la paleta, botones, enlaces y
      gráficas se ven en el nuevo color en tema claro **y** oscuro.
- [ ] ✅ Cambias algo de contenido (un precio o un horario) y la web lo refleja
      sin tocar el HTML.
- [ ] ✅ Cierras el navegador, lo vuelves a abrir y pruebas el recorrido
      completo «de visitante»: nadie debe ver tus datos de administración sin
      el token.

---

## 8. Si algo falla

| Fallo | Arreglo en una línea |
|---|---|
| `No se pudo cargar "node:sqlite"` | Instala Node ≥ 22.13 y comprueba con `node -v`. |
| `EADDRINUSE` / puerto ocupado | Cierra la otra plantilla (01 y 02 compiten por el 3000) o arranca con `$env:PORT=3101; npm start`. |
| El formulario dice «Modo demo» | No hay servidor: `npm start` en esa carpeta y abre `http://localhost:<PUERTO>`, no el `index.html` con doble clic. |
| `401 Token de administración no válido` | Usa el `ADMIN_TOKEN` de **ese** `.env` en la cabecera `x-admin-token` (§5.1). |
| `429 Demasiados envíos` | Espera 60 segundos o sube el `LIMITE_*` correspondiente en el `.env` y reinicia. |
| Los cambios del `.env` o de la BD no se ven | Reinicia el servidor y recarga con `Ctrl + F5`. |

Siete síntomas más (incluido el CSV de la 06 con símbolos raros y los avisos de
SQLite) están en la sección 10 del README de la raíz:
[README.md §10 · Problemas frecuentes](../README.md#10-problemas-frecuentes).

---

## 9. Documentación relacionada

- [API.md](API.md) — índice exhaustivo de los endpoints de las 7 plantillas.
- [GUIA-DESARROLLADOR.md](GUIA-DESARROLLADOR.md) — para quien va a tocar código,
  endpoints y esquema de la base de datos.
- [DESPLIEGUE.md](DESPLIEGUE.md) — cómo subirla a internet con HTTPS y copias
  de seguridad.
- [PERSONALIZACION.md](PERSONALIZACION.md) — recetas de personalización
  ampliadas (identidad, contenido, secciones nuevas).
- [README.md de la raíz](../README.md) — requisitos, estructura y patrones
  comunes de las 7 plantillas.
- README de cada plantilla:
  [01-portfolio](../01-portfolio/README.md) ·
  [02-saas](../02-saas/README.md) ·
  [03-blog](../03-blog/README.md) ·
  [04-tienda](../04-tienda/README.md) ·
  [05-agencia](../05-agencia/README.md) ·
  [06-dashboard](../06-dashboard/README.md) ·
  [07-restaurante](../07-restaurante/README.md)
