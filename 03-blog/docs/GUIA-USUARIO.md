# Guía de usuario — 03 · Blog «Bitácora Digital»

Guía práctica para **llevar el blog a producción sin programar**: arrancarlo,
recorrerlo, comprobar que lo que envían los visitantes llega a la base de datos
y ajustar lo más habitual (artículos, número de artículos por página, colores).

> Esta guía **no** sustituye al [README](../README.md): el README explica el
> montaje, las variables, el despliegue y la seguridad; aquí vamos al uso real,
> clic a clic.

---

## 1. Para quién es

Para el **dueño del blog** que quiere publicar contenido, enseñar la web y
tocar lo básico (textos, colores, cuántos artículos salen por página) **sin
escribir una línea de código**.

Lo único que necesitas:

| Requisito | Detalle |
|---|---|
| Un navegador | Chrome, Firefox, Edge o Safari (cualquiera moderno) |
| Node 22.13 o superior | Solo para arrancar el servidor: compruébalo con `node -v` |
| Un editor de texto | El Bloc de notas vale para tocar `.env` y los HTML |
| (Opcional) DB Browser for SQLite | Para mirar y editar la base de datos con ratón |

No hace falta `npm install`: la plantilla usa solo módulos nativos de Node.

---

## 2. Arranque en 5 minutos

### 2.1 Opción recomendada: con servidor

1. Abre una terminal dentro de la carpeta `03-blog`.
2. Ejecuta:

```powershell
npm start
```

3. Verás un recuadro como este en la terminal:

```
──────────────────────────────────────────────
  03-blog · Bitácora Digital · servidor en marcha
  Web:  http://127.0.0.1:3003
  API:  http://127.0.0.1:3003/api/salud
  BD:   server/data/blog.db
  Para parar: Ctrl + C
──────────────────────────────────────────────
```

4. Abre en el navegador: **<http://localhost:3003>**

El puerto es el de la variable `PORT` de tu `.env` (**3003** en la plantilla
tal cual viene). Si cambias `PORT`, cambia la dirección del navegador.

Otras órdenes útiles (mismas que en el README §2):

```powershell
npm run dev        # recarga automática al guardar cambios
npm run reiniciar  # vuelve a la BD de ejemplo (borra lo que hayas creado)
node server/server.js   # si prefieres no usar npm
```

### 2.2 Alternativa: doble clic en `index.html` (modo demo)

Si abres `index.html` directamente, **no hay servidor** y la web entra en
«modo demo». Esto es lo que pasa:

| Función | ¿Funciona sin servidor? | Qué ves |
|---|---|---|
| Diseño, menú, tema claro/oscuro | ✅ | Igual que siempre |
| Filtros por categoría, etiquetas y buscador | ✅ parcial | Filtran las 8 tarjetas que trae el HTML |
| Paginación | ⚠️ | Solo cambia el botón activo; no cambian los artículos |
| Contadores de la barra lateral | ⚠️ | Los números fijos del HTML (8, 2, 2, 2, 1, 1) |
| Newsletter | ⚠️ | Muestra el mensaje de éxito, **pero no guarda nada** |
| Página de detalle `articulo.html?slug=…` | ❌ | Aviso «No hay servidor conectado» |
| Artículos nuevos por API | ❌ | Necesitas el servidor corriendo |

En consola del navegador (F12) verás:
`[api] Sin servidor: los artículos salen del index.html (modo estático).`

**Conclusión**: el doble clic sirve para enseñar el diseño; para publicar
contenido, usa siempre `npm start`.

### 2.3 ¿Cómo saber si el servidor está vivo?

- Abre **<http://localhost:3003/api/salud>**. Si responde un JSON con
  `"ok": true`, está vivo.
- O ejecuta en la terminal:

```powershell
curl.exe http://localhost:3003/api/salud
```

```json
{
  "ok": true,
  "servicio": "bitacora-digital-api",
  "version": "1.0.0",
  "node": "v22.x.x",
  "hora": "2026-10-02T10:00:00.000Z",
  "uptime_s": 12
}
```

- Si el navegador no abre nada: revisa §7 de esta guía y §10 del
  [README](../README.md#10-problemas-frecuentes).

---

## 3. Recorrido por la web, sección por sección

Abre <http://localhost:3003> y ve bajando. Esta es cada zona, qué hace el
visitante y qué ocurre por detrás.

### 3.1 Barra superior (`header#inicio`)

| Lo que ves | Lo que hace el visitante | Por detrás |
|---|---|---|
| Buscador `#buscar-nav` (formulario `#form-buscar-nav`) | Escribe una palabra y pulsa intro | `GET /api/articulos?q=…` → tabla `articulos` (busca en título, extracto, autor y etiquetas **sin tildes**) |
| Botón `#toggle-tema` | Cambia tema claro/oscuro | Nada en el servidor: guarda la preferencia en el navegador (`localStorage`) |
| Botón `#hamburguesa` (móvil) | Abre/cierra el menú `#menu-principal` | Nada en el servidor |

### 3.2 Artículo destacado (`section.destacado`, `#titulo-destacado`)

- El visitante ve el artículo grande de portada y pulsa «Leer el artículo».
- Por detrás: `GET /api/destacado` → fila de `articulos` con `destacado = 1`.
  El JS reescribe el botón para que apunte a `articulo.html?slug=…` del
  artículo real.
- Solo puede haber **un** destacado a la vez (si marcas otro, el anterior
  pierde la marca).

### 3.3 Listado de artículos (`section#articulos`)

| Elemento | Acción del visitante | Por detrás |
|---|---|---|
| `#contador-resultados` | Ve «8 artículos» (o el total real) | Se pinta con el `total` que devuelve la API |
| `#chips-filtro` (chips `data-categoria`) | Filtra por categoría | `GET /api/articulos?categoria=ia` → tabla `articulos` |
| `#grid-articulos` | Pulsa un título y entra al artículo | `GET /api/articulos` (paginado) → tarjetas con enlace a `articulo.html?slug=…` |
| `#sin-resultados` | Mensaje si no hay coincidencias | Se muestra cuando la API devuelve `items: []` |
| `nav.paginacion` (botones `‹ 1 2 … 12 ›`) | Cambia de página | `GET /api/articulos?pagina=2` → la API recorta la página al rango válido y devuelve `paginas`; el JS **reconstruye los botones** con el número real de páginas |

La paginación es **de verdad**: con `POR_PAGINA=3` (tu `.env`) y 8 artículos
publicados sin contar el destacado, salen 3 páginas, no 12 (el 12 es el
adorno del HTML estático que la API sustituye).

### 3.4 Barra lateral (`aside.sidebar`)

| Widget | Acción | Por detrás |
|---|---|---|
| «Buscar» `#form-buscar-side` / `#buscar-side` | Busca (sincronizado con el de arriba) | Mismo `GET /api/articulos?q=…` |
| «Categorías» `#categorias` (`.item-categoria`) | Filtra y ve contadores | `GET /api/categorias` → contadores recalculados con `COUNT(*)` sobre `articulos` |
| «Lo más leído» | Enlaces informativos | **Es texto fijo del HTML**; no lee la BD (las `vistas` sí se acumulan al abrir artículos) |
| «Etiquetas» `#nube-tags` | Filtra por etiqueta | `GET /api/articulos?tag=javascript` |
| `#limpiar-filtros` | Quita todos los filtros | Vuelve al estado inicial y recarga |
| Newsletter lateral (`#email-side`) | Escribe su correo y se suscribe | `POST /api/newsletter` con `origen: "lateral"` → INSERT en tabla `suscriptores` |

### 3.5 Newsletter ancha (`section#newsletter`, `#email-ancha`)

- Mismo formulario que el lateral pero con `origen: "ancha"`, lo que se
  guarda en la columna `suscriptores.origen`.
- Respuesta correcta: **201** con mensaje «¡Suscripción registrada!…» y
  `correo: "demo"` (o `"enviado"` si configuraste Resend/SMTP en `.env`).
- Si el correo ya estaba: responde 200 con `ya_suscrito: true`.
- Si repite 5 veces en un minuto desde la misma IP: **429**
  «Demasiadas suscripciones…» (`LIMITE_NEWSLETTER=5`).

### 3.6 Pie de página

- `#anio-actual` se rellena con el año actual desde el navegador.

### 3.7 Página de detalle (`articulo.html?slug=…`)

Al pulsar cualquier tarjeta se abre `articulo.html?slug=css-grid-en-produccion-10-patrones`
y `js/articulo.js` pinta:

| Id del elemento | Qué muestra |
|---|---|
| `#aviso-pagina` | Mensaje de error (slug inexistente o sin servidor) |
| `#articulo-pill`, `#articulo-fecha`, `#articulo-titulo`, `#articulo-extracto` | Categoría, fecha, título y extracto |
| `#articulo-avatar`, `#articulo-autor`, `#articulo-categoria`, `#articulo-minutos` | Datos del autor y lectura |
| `#articulo-vistas` | Número de lecturas (se suma **1 en cada visita**) |
| `#articulo-cuerpo` | El cuerpo del artículo en HTML, generado en el servidor desde el Markdown |
| `#articulo-tags` | Etiquetas que devuelven al listado ya filtradas (`index.html?tag=…`) |

Por detrás: `GET /api/articulos/:slug` → tabla `articulos`
(`cuerpo_md` convertido a `cuerpo_html`).

### 3.8 Feed RSS (`/feed.xml`)

- No se ve en la página: es un enlace en la cabecera de `index.html` y
  `articulo.html`
  (`<link rel="alternate" type="application/rss+xml" href="/feed.xml">`) que
  detectan solos los lectores de RSS (Feedly, NetNewsWire, Inoreader…).
- Prueba rápida desde una terminal:

```bash
curl http://localhost:3003/feed.xml
```

- Devuelve un RSS 2.0 en XML con los **20 últimos artículos publicados**.
- Los enlaces de cada artículo salen de `SITE_URL` en `.env`: en local apuntan
  a `http://localhost:3003`; cámbialo a tu dominio antes de publicar (§5,
  palanca 1) para que el feed no enlace a localhost.

---

## 4. Dónde ves lo que llega

Esta plantilla **no incluye panel gráfico de administración**: lo que llega
del formulario del newsletter se guarda en SQLite y se lee con curl o con un
visor de bases de datos. Son dos caminos.

### 4.1 Cómo sacar el `ADMIN_TOKEN`

1. Abre el fichero `.env` de `03-blog` con el Bloc de notas.
2. Busca la línea:

```
ADMIN_TOKEN=demo-token-blog-7c1e5a93bd
```

Ese valor es la llave de edición de artículos. **Cámbialo** antes de publicar
y no lo compartas. También aparece en `.env.example` como texto de ejemplo.

### 4.2 Ejemplos de `curl` en PowerShell

> En PowerShell, `curl` es un alias de otro comando: usa **`curl.exe`**.
> Y no pegues el JSON con comillas en la línea de comandos: guárdalo en un
> fichero y usa `--data-binary "@fichero"`.

**Paso 1 — crear el fichero del cuerpo** (escribe esto tal cual en PowerShell;
`WriteAllText` guarda el fichero en UTF-8 **sin BOM**, que es lo que el
servidor espera):

```powershell
$json = @'
{ "email": "ana@correo.com", "origen": "ancha" }
'@
[System.IO.File]::WriteAllText("$PWD\body.json", $json)
```

**Paso 2 — leer, editar y borrar artículos:**

```powershell
# Leer: el listado entero (público, no lleva token)
curl.exe http://localhost:3003/api/articulos

# Leer: una página concreta
curl.exe "http://localhost:3003/api/articulos?pagina=2&por_pagina=3"

# Leer: el newsletter NO tiene endpoint de consulta; sí el detalle de un artículo
curl.exe http://localhost:3003/api/articulos/css-grid-en-produccion-10-patrones

# Leer el feed RSS (XML con los 20 últimos artículos publicados)
curl.exe http://localhost:3003/feed.xml

# Editar (token en la cabecera): subir los minutos de lectura
$json = @'
{ "minutos": 12 }
'@
[System.IO.File]::WriteAllText("$PWD\edit.json", $json)
curl.exe -X PUT http://localhost:3003/api/articulos/css-grid-en-produccion-10-patrones `
  -H "Content-Type: application/json" `
  -H "x-admin-token: demo-token-blog-7c1e5a93bd" `
  --data-binary "@edit.json"

# Borrar
curl.exe -X DELETE http://localhost:3003/api/articulos/css-grid-en-produccion-10-patrones `
  -H "x-admin-token: demo-token-blog-7c1e5a93bd"
```

Mismos ejemplos en bash (Linux/macOS), con `curl` normal:

```bash
echo '{"email":"ana@correo.com","origen":"ancha"}' > body.json
curl -X POST http://localhost:3003/api/newsletter \
  -H "Content-Type: application/json" --data-binary "@body.json"

echo '{"minutos":12}' > edit.json
curl -X PUT http://localhost:3003/api/articulos/css-grid-en-produccion-10-patrones \
  -H "Content-Type: application/json" \
  -H "x-admin-token: TU_TOKEN" --data-binary "@edit.json"

curl -X DELETE http://localhost:3003/api/articulos/css-grid-en-produccion-10-patrones \
  -H "x-admin-token: TU_TOKEN"
```

Errores que puede devolver:

| Código | Significado |
|---|---|
| 400 | El cuerpo no cumple las reglas (título < 5 caracteres, fecha con otro formato…) |
| 401 | Token incorrecto o ausente |
| 404 | Ese `slug` no existe (o el artículo no está publicado) |
| 409 | Ya hay un artículo con ese slug |
| 429 | Demasiadas suscripciones en un minuto |

### 4.3 Ver los datos con DB Browser for SQLite

1. Descarga e instala **DB Browser for SQLite** (sqlitebrowser.org).
2. *Archivo → Abrir base de datos* y elige, dentro de la carpeta `03-blog`:
   **`server/data/blog.db`** (si ves también `blog.db-wal`, no pasa nada: son
   ficheros auxiliares del modo escritura de SQLite).
3. Pestaña *Tabla de datos* → tablas `articulos` y `suscriptores`.
4. Para leer las suscripciones, la pestaña *Ejecutar SQL*:

```sql
SELECT id, email, origen, confirmado, creado_en
FROM suscriptores
ORDER BY id DESC;
```

```sql
-- Artículos publicados, ordenados por fecha
SELECT slug, titulo, categoria, fecha, vistas, publicado
FROM articulos
ORDER BY fecha DESC;
```

⚠️ Si el servidor está en marcha, los últimos cambios pueden estar en
`blog.db-wal`: guarda y cierra el visor o consulta con el servidor corriendo.

---

## 5. Cambios sin programar (3 palancas)

### Palanca 1 — El fichero `.env`

Edita, guarda y **reinicia el servidor** (`Ctrl + C` y `npm start`):

| Variable | Para qué |
|---|---|
| `PORT` | Cambiar el puerto (por defecto `3003`) |
| `POR_PAGINA` | Artículos por página del listado (por defecto `3`) |
| `LIMITE_NEWSLETTER` | Suscripciones máximas por IP y minuto (`5`) |
| `ADMIN_TOKEN` | La llave del CRUD de artículos |
| `SITE_URL` | URL pública: de aquí salen los enlaces de los correos **y** del feed RSS (`/feed.xml`) |
| `NEWSLETTER_DESTINO` | Correo que recibe el aviso de cada suscripción |
| `RESEND_API_KEY` / `SMTP_HOST` | Activan el envío real de correos |

### Palanca 2 — Los datos de la base de datos

Con DB Browser (§4.3) puedes editar celdas a mano: título, extracto,
`publicado` (1 visible / 0 oculto), `destacado` (solo uno puede valer 1) o
`vistas`. Con `npm run reiniciar` vuelves al estado original.

### Palanca 3 — El bloque de colores del CSS

Abre `css/styles.css` y busca el bloque comentado
**`PALETA DE COLORES — EDITA AQUÍ`** (al principio del fichero). Ahí están
las variables `--color-primary`, acentos y gradientes que usan todos los
componentes; debajo, la variante del tema oscuro
(`[data-theme="dark"]`).

### 4 recetas concretas de esta plantilla

**Receta 1 — Publicar un artículo nuevo (recomendada)**

```powershell
$json = @'
{
  "titulo": "Mi primer artículo en la bitácora",
  "extracto": "Un extracto breve pero con suficientes caracteres para validar.",
  "cuerpo_md": "## Hola\n\nEsto es **Markdown**: el servidor lo convierte en HTML seguro.",
  "categoria": "desarrollo",
  "tags": "node,sqlite",
  "autor": "Ana Serrano",
  "fecha": "2026-10-02",
  "minutos": 4
}
'@
[System.IO.File]::WriteAllText("$PWD\nuevo.json", $json)
curl.exe -X POST http://localhost:3003/api/articulos `
  -H "Content-Type: application/json" `
  -H "x-admin-token: demo-token-blog-7c1e5a93bd" `
  --data-binary "@nuevo.json"
```

Responde **201** con `{ "ok": true, "id": 7, "slug": "mi-primer-articulo-en-la-bitacora", … }`.
El `slug` lo genera el servidor desde el título; recarga la web y aparece en
el listado (si `POR_PAGINA=3`, en la primera página). Categorías válidas:
`desarrollo`, `ia`, `seguridad`, `movil`, `diseno`.

**Receta 2 — Cambiar cuántos artículos salen por página**

1. Abre `.env` y pon `POR_PAGINA=6`.
2. Reinicia el servidor.
3. Recarga la portada: la paginación se reconstruye sola con el número
   real de páginas.

**Receta 3 — Cambiar el artículo de portada**

```powershell
$json = @'
{ "destacado": 1 }
'@
[System.IO.File]::WriteAllText("$PWD\dest.json", $json)
curl.exe -X PUT http://localhost:3003/api/articulos/ARTICULO-NUEVO `
  -H "Content-Type: application/json" `
  -H "x-admin-token: demo-token-blog-7c1e5a93bd" `
  --data-binary "@dest.json"
```

El anterior deja de ser destacado automáticamente.

**Receta 4 — Sacar un artículo del listado sin borrarlo**

```powershell
$json = @'
{ "publicado": 0 }
'@
[System.IO.File]::WriteAllText("$PWD\off.json", $json)
curl.exe -X PUT http://localhost:3003/api/articulos/passkeys-en-la-practica `
  -H "Content-Type: application/json" `
  -H "x-admin-token: demo-token-blog-7c1e5a93bd" `
  --data-binary "@off.json"
```

Desaparece del listado y de los contadores de categorías, pero sigue en la BD
(vuelve con `"publicado": 1`).

Para cambios más profundos (añadir secciones, conectar un CMS, cambiar
tipografías), sigue la guía global de
[personalización](../../docs/PERSONALIZACION.md).

---

## 6. Checklist «pruébala antes de enseñarla»

Con el servidor arrancado (`npm start`), haz estos clics y comprueba el
resultado esperado.

| # | Clic | Resultado esperado |
|---|---|---|
| 1 | Abrir <http://localhost:3003/api/salud> | JSON con `"ok": true` |
| 2 | Cargar la portada | El destacado ocupa la cabecera y el contador dice «8 artículos» |
| 3 | Pulsar el chip «Inteligencia Artificial» | Solo quedan artículos de IA y el contador baja |
| 4 | Escribir `passkeys` en el buscador de la barra lateral | Aparece el artículo de passkeys (la búsqueda ignora tildes) |
| 5 | Pulsar «Limpiar filtros ✕» | Vuelve el listado completo |
| 6 | Pulsar «2» en la paginación | Cambian las tarjetas y el botón 2 queda activo |
| 7 | Abrir cualquier artículo | Se ve el cuerpo completo y «lecturas» suma 1 cada vez que recargas |
| 8 | Suscribir un correo en el newsletter ancha | Mensaje de éxito; aparece en `suscriptores` (§4.3) |
| 9 | Repetir la suscripción 6 veces seguidas en menos de un minuto | El sexto intento responde «Demasiadas suscripciones…» |
| 10 | Pulsar el botón de tema (arriba a la derecha) | Cambia a oscuro y se queda al recargar |

Si alguno falla, ve a §7.

---

## 7. Si algo falla

| Síntoma | Causa más probable |
|---|---|
| «No hay servidor conectado» en `articulo.html` | No estás en <http://localhost:3003>: arranca `npm start` y abre la web desde ahí |
| La portada no cambia al paginar / salen siempre los mismos 8 | Abres `index.html` con doble clic (modo estático) |
| `EADDRINUSE: port 3003` | Otro proceso usa ese puerto: cambia `PORT` en `.env` o cierra la pestaña anterior |
| `401 Token de administración no válido` | El `x-admin-token` no coincide con `ADMIN_TOKEN` de tu `.env` |
| `409 Ya existe un artículo con ese slug` | Ese título ya se publicó: cambia el título o el slug |
| Los cambios de `.env` no se notan | Falta reiniciar el servidor (`Ctrl + C` → `npm start`) |

Hay más casos (Node antiguo, `409` de slug, `429`, caché del navegador) en la
[sección 10 «Problemas frecuentes» del README](../README.md#10-problemas-frecuentes).

---

## 8. Documentación relacionada

- [README de esta plantilla](../README.md) — arranque, variables, API resumida,
  despliegue, seguridad y problemas frecuentes.
- [Guía de desarrollador](GUIA-DESARROLLADOR.md) — arquitectura, API completa
  con ejemplos y recetas de extensión con código.
- Índice global de endpoints: [`../../docs/API.md`](../../docs/API.md)
  *(pendiente de publicar)*.
- Personalización global: [`../../docs/PERSONALIZACION.md`](../../docs/PERSONALIZACION.md)
  *(pendiente de publicar)*.
- Despliegue global: [`../../docs/DESPLIEGUE.md`](../../docs/DESPLIEGUE.md)
  *(pendiente de publicar)*.
