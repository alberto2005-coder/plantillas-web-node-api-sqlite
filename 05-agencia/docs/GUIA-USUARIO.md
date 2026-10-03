# Guía de usuario · 05 · Agencia creativa

> Recorrido práctico de la landing de agencia **Estudio Vértice**: cómo ponerla
> en marcha, qué ve y qué rellena cada visitante, dónde mirar las solicitudes de
> presupuesto que llegan y qué puedes cambiar sin escribir una sola línea de
> código.

## 1. Para quién es

Para el dueño de un estudio o agencia que quiere publicar una web con
**formulario de presupuesto que funciona de verdad** y que no programa (o no
quiere programar para esto).

| Necesitas | No necesitas |
|---|---|
| Un navegador (Chrome, Edge, Firefox…) | Saber programar |
| [Node](https://nodejs.org) **22.13 o superior** (`node -v` para comprobarlo) | Instalar bases de datos ni crear cuentas |
| Cinco minutos y esta carpeta | Dependencias: `npm install` es opcional |

⚠️ **Esta plantilla no tiene panel web.** No verás ninguna pantalla de
administración: la bandeja de solicitudes se consulta con un comando (§4)
o abriendo el fichero de base de datos con un programa gratuito. Es
intencionado: es una landing pública, no un gestor.

---

## 2. Arranque en 5 minutos

### Paso 1 — Arranca el servidor

Abre una terminal **dentro de la carpeta `05-agencia`** y ejecuta:

```bash
npm start
```

Verás este cartel (es la señal de que todo va bien):

```text
──────────────────────────────────────────────
  05-agencia · servidor en marcha
  Web:  http://127.0.0.1:3105
  API:  http://127.0.0.1:3105/api/salud
  BD:   server/data/agencia.db
  Para parar: Ctrl + C
──────────────────────────────────────────────
```

### Paso 2 — Abre la web

<http://localhost:3105>

El **3105** no es una casualidad: es el valor de `PORT` en el fichero `.env`
de esta plantilla. Si cambias `PORT`, cambia la dirección.

### Alternativa — doble clic en `index.html` (modo demo)

Puedes abrir `index.html` directamente con doble clic, sin servidor. La web se
ve **idéntica**, pero cambia de dónde salen los datos:

| Funciona igual | En modo demo NO funciona |
|---|---|
| ✅ Diseño, menú, tema claro/oscuro | ❌ El formulario **no guarda nada**: aparece «Modo demo: ejecuta `npm start` para guardarla en el servidor» |
| ✅ Modal de proyectos, contadores, animaciones | ❌ Los proyectos, servicios y cifras salen del propio HTML/JS, no de la base de datos |
| ✅ Validación del formulario (te marca los campos en rojo) | ❌ No hay bandeja: no hay servidor al que consultar |

### Cómo saber si el servidor está vivo

1. **La terminal**: si el cartel de arriba sigue en pantalla, está vivo; si
   terminó con `EADDRINUSE: port 3105`, otro proceso ocupa ese puerto.
2. **El navegador**: abre <http://localhost:3105/api/salud> y debe aparecer
   `{"ok": true, "servicio": "agencia-api", …}`.
3. **Con un comando** (en PowerShell usa `curl.exe`; el `curl` a secas es otro
   comando de Windows):

```powershell
curl.exe http://localhost:3105/api/salud
```

Para pararlo: `Ctrl + C` en la terminal. Otros comandos útiles:

```bash
npm run dev       # recarga automática al guardar cambios
npm run reiniciar # devuelve la BD a los datos de ejemplo (borra solicitudes)
```

---

## 3. Recorrido por la web, sección por sección

Esto es lo que ve el visitante, de arriba abajo, y qué pasa por detrás de cada
clic. Los identificadores (`#…`) son los reales del `index.html` por si alguien
te pide «cambia la sección #contacto».

| # | Sección (`id`) | Qué ve el visitante | Qué rellena / qué pasa por detrás |
|---|---|---|---|
| 1 | `#navbar` (con `#nav`, `#hamburguesa`, `#toggler-tema`) | Cabecera fija con logo, menú (Trabajo, Servicios, Estudio, Contacto), botón «Hablemos» y sol/luna | Clic en la luna → tema oscuro guardado en el navegador; en móvil, `#hamburguesa` abre `#nav` |
| 2 | `#inicio` (hero) | Titular «Diseñamos marcas que no pasan desapercibidas», subtítulo y dos botones | «Ver nuestro trabajo» salta a `#trabajo`; «Qué hacemos» a `#servicios` |
| 3 | Marquesina (sin id) | Cinta animada «Branding · Web · Motion · SEO» | Decorativa, sin acciones |
| 4 | `#servicios` | 4 servicios numerados (01–04): Identidad, Web, Motion, Estrategia y SEO | Al cargar (y si hay servidor) se sustituyen por `GET /api/servicios` → tabla **`servicios`** |
| 5 | `#trabajo` | Rejilla de 6 proyectos (`data-proyecto="lumen"`, `norte`, `fibra`, `mercado`, `aurea`, `orbita`) | Clic en una tarjeta → se abre el `#modal` con título, año, cliente y servicios. Si hay servidor, los datos vienen de `GET /api/proyectos` → tabla **`proyectos`** |
| 6 | `#estudio` (con `#contadores`) | Manifiesto + 4 contadores que suben al entrar en pantalla: 248, 17, 11, 96 | El número final llega de `GET /api/cifras` → tabla **`cifras`** (si no hay servidor, vale el `data-objetivo` del HTML) |
| 7 | Equipo y Reconocimientos (sin `id`) | 4 miembros y 5 premios | Solo HTML: se editan en `index.html`, no tienen endpoint |
| 8 | `#contacto` | Titular, correo `hola@vertice.studio` (enlace `mailto:`) y el **formulario `#form-presupuesto`** | Es el corazón de la plantilla: ver abajo |

### El formulario `#form-presupuesto`

| Campo (`id`) | Obligatorio | Qué comprueba el navegador |
|---|---|---|
| `#nombre` | sí | mínimo 2 caracteres |
| `#email` | sí | formato de correo |
| `#empresa` | no | — |
| `#tipo` | sí | una de: `web`, `landing`, `branding`, `app`, `seo`, `otro` |
| `#presupuesto` | no | una de: `menos-3000`, `3000-8000`, `8000-20000`, `mas-20000` |
| `#mensaje` | sí | mínimo 10 caracteres |

Al pulsar **«Enviar solicitud»**:

1. El navegador valida los campos y, si falta algo, marca en rojo los avisos
   `#error-nombre`, `#error-email`, `#error-tipo` y `#error-mensaje`.
2. Si todo está bien, envía `POST /api/presupuesto` con esos seis valores.
3. El servidor vuelve a validar, guarda la fila en la tabla
   **`presupuestos`** y contesta con un **código de referencia**
   (`VTX-0001-88XK`, por ejemplo).
4. El visitante ve en `#presupuesto-exito`: *«✓ Solicitud recibida. Te
   respondemos en menos de 24 h laborables. Referencia: VTX-…»* y el
   formulario se queda vacío.

⚠️ Si rellenas mal el formulario, el servidor contesta `400 Revisa el
formulario` con un campo `detalle` que dice **qué** está mal; el navegador
marca ese mismo campo en rojo.

---

## 4. Dónde ves lo que llega

Hay tres formas, de más cómoda a más técnica.

### 4.1 La bandeja por API (con token)

El token está en el fichero `.env` de la carpeta, línea
`ADMIN_TOKEN=demo-token-agencia-3b7e91c5d2`. Ábrelo con el Bloc de notas
(está en la raíz de `05-agencia`, no se sube a git).

**En PowerShell** — primero guardamos el cuerpo en un fichero (si no, PowerShell
estropea las comillas) y luego lo mandamos con `--data-binary "@fichero"`:

```powershell
# 1) Guardar una solicitud de prueba en un fichero (sin BOM: por eso WriteAllText)
$json = @'
{
  "nombre": "Ana Ruiz",
  "email": "ana@correo.com",
  "empresa": "Norte S.L.",
  "tipo": "web",
  "presupuesto": "3000-8000",
  "mensaje": "Quiero una web nueva para mi tienda."
}
'@
[IO.File]::WriteAllText("$PWD\presupuesto.json", $json)

# 2) Enviarla
curl.exe -X POST http://localhost:3105/api/presupuesto `
  -H "Content-Type: application/json" `
  --data-binary "@presupuesto.json"

# 3) Ver la bandeja (con el token del .env)
curl.exe -H "x-admin-token: demo-token-agencia-3b7e91c5d2" `
  http://localhost:3105/api/presupuestos

# 4) Borrar una solicitud (el 1 es su id)
curl.exe -X DELETE -H "x-admin-token: demo-token-agencia-3b7e91c5d2" `
  http://localhost:3105/api/presupuestos/1
```

⚠️ **No uses `Set-Content -Encoding utf8` para guardar el JSON**: en Windows
PowerShell 5.1 añade un BOM al principio y el servidor responde
`400 El cuerpo no es JSON válido` (comprobado). `[IO.File]::WriteAllText` no
pone BOM.

**En bash** (macOS / Linux / Git Bash):

```bash
cat > presupuesto.json <<'EOF'
{
  "nombre": "Ana Ruiz",
  "email": "ana@correo.com",
  "empresa": "Norte S.L.",
  "tipo": "web",
  "presupuesto": "3000-8000",
  "mensaje": "Quiero una web nueva para mi tienda."
}
EOF

curl -X POST http://localhost:3105/api/presupuesto \
  -H "Content-Type: application/json" \
  --data-binary "@presupuesto.json"

curl -H "x-admin-token: demo-token-agencia-3b7e91c5d2" \
  http://localhost:3105/api/presupuestos

curl -X DELETE -H "x-admin-token: demo-token-agencia-3b7e91c5d2" \
  http://localhost:3105/api/presupuestos/1
```

La bandeja devuelve las **últimas 200 solicitudes** con estos campos:
`id`, `nombre`, `email`, `empresa`, `tipo`, `presupuesto`, `mensaje`,
`referencia`, `creado_en` (la IP no se muestra).

### 4.2 Con un visor de base de datos (sin comandos)

1. Descarga **DB Browser for SQLite** (gratis) y ábrelo.
2. **Abrir base de datos** → el fichero
   `05-agencia/server/data/agencia.db` (ruta relativa a la carpeta de la
   plantilla; es el valor de `DB_FILE` en el `.env`).
3. Pestaña **Examinar datos** → tabla `presupuestos`: ahí están las
   solicitudes, con su `referencia` y `creado_en`.

También sirven VS Code con una extensión de SQLite o el comando `sqlite3`.

### 4.3 Cómo sacar el `ADMIN_TOKEN`

No hay «olvidé mi contraseña»: el token **es el valor de `ADMIN_TOKEN` del
`.env`**. Ábrelo, copia el valor y pégalo en el header `x-admin-token`. Si
pierdes el `.env`, crea otro (`ADMIN_TOKEN=mi-clave-larga`) y reinicia el
servidor; el valor de ejemplo que trae la plantilla solo sirve en local.

---

## 5. Cambios sin programar (3 palancas)

### Palanca 1 — El fichero `.env`

Está en la raíz de `05-agencia`. Edítalo y **reinicia el servidor**
(`Ctrl + C` y `npm start`): los cambios no se aplican en caliente.

| Variable | Para qué sirve |
|---|---|
| `PORT` | Cambiar el puerto (por defecto `3105`) |
| `ADMIN_TOKEN` | La clave de la bandeja; cámbiala antes de publicar |
| `LIMITE_PRESUPUESTO` | Envíos máximos por IP y minuto (por defecto `5`) |
| `CONTACTO_DESTINO` | Correo que recibe las solicitudes (por defecto `hola@vertice.studio`) |
| `RESEND_API_KEY` / `SMTP_HOST` | Activan el correo real; vacío = se guarda igual y no se envía nada |

### Palanca 2 — Los datos de la base de datos

`server/data/agencia.db` con DB Browser (§4.2). Recuerda: `servicios`,
`cifras` y `proyectos` **solo se siembran la primera vez**; si ya existe la BD,
editar `server/datos/semillas.js` no surte efecto hasta que ejecutes
`npm run reiniciar` (eso **borra las solicitudes**).

### Palanca 3 — El bloque `PALETA DE COLORES — EDITA AQUÍ`

En `css/styles.css`, arriba del todo. Solo con cambiar `--color-primary` y
`--color-primary-hover` tienes toda la web recoloreada; `--color-accent` es el
color de acento y en `:root` también están `--radius`, `--font-heading` y
`--font-body`. Los valores del tema oscuro están justo debajo, en
`[data-theme="dark"]`.

### Cuatro recetas concretas de esta plantilla

**Receta A — Cambiar los 4 servicios.**
1. Edita el HTML: en `index.html`, sección `#servicios`, cada servicio es un
   `<li class="servicio">` con `.servicio__numero`, `.servicio__titulo` y
   `.servicio__texto`.
2. Edita la BD: tabla `servicios` (columnas `numero`, `titulo`,
   `descripcion`). Con DB Browser, doble clic en la celda y «Aplicar».
3. Si prefieres editar `server/datos/semillas.js`, ejecuta después
   `npm run reiniciar`.
   Con servidor, el texto que se ve es **el de la BD** (pisa el del HTML).

**Receta B — Cambiar los tramos de precio del presupuesto.**
Los tramos viven en dos sitios: las etiquetas del `<select id="presupuesto">`
en `index.html` y la lista de valores admitidos en `server/api.js`. Para
cambiar **solo las etiquetas visibles** («Menos de 3.000 €» → «Presupuesto
ajustado») toca únicamente el HTML. ⚠️ No toques el atributo `value` de las
opciones (`menos-3000`, `3000-8000`, `8000-20000`, `mas-20000`): si lo haces,
el servidor rechazará el formulario con `400` (eso ya requiere abrir
`server/api.js`).

**Receta C — Cambiar los textos del formulario.**
Todo está en `index.html`: etiquetas, *placeholders*, el aviso «Sin compromiso
y sin spam…», el título «Cuéntanos tu proyecto» y los mensajes de error
`#error-nombre`, `#error-email`, `#error-tipo`, `#error-mensaje`. El único
texto que **no** está ahí es la frase final de confirmación («Te respondemos en
menos de 24 h laborables»): la manda el servidor desde `server/api.js`, así
que para cambiarla hay que tocar código.

**Receta D — Cambiar los contadores de `#estudio`.**
Dos sitios: el `data-objetivo="248"` de cada `.contador__valor` en `index.html`
(y su `.contador__etiqueta`) y, si hay servidor, la tabla `cifras`
(columnas `valor` y `etiqueta`). ⚠️ El emparejamiento se hace **por el texto de
la etiqueta**: si cambias «Proyectos entregados» en la BD, pon exactamente el
mismo texto en el HTML o el número no se actualizará.

Para paletas, tipografías, imágenes y demás, tienes la guía global:
[personalización](../../docs/PERSONALIZACION.md).

---

## 6. Checklist «pruébala antes de enseñarla»

Marca cada casilla cuando la compruebes. Todo con el servidor arrancado.

| ✅ | Qué haces | Resultado esperado |
|---|---|---|
| ✅ | Abrir <http://localhost:3105> | Ves el titular «Diseñamos marcas que no pasan desapercibidas» y el menú Trabajo/Servicios/Estudio/Contacto |
| ✅ | Clic en el sol/luna de la cabecera (`#toggler-tema`) | Toda la web cambia a tema oscuro y se recuerda al recargar |
| ✅ | Clic en «Ver nuestro trabajo» | Saltas a `#trabajo` con 6 proyectos |
| ✅ | Clic en la tarjeta «Lumen Café» | Se abre el modal con año **2025** y cliente **Lumen Café S.L.**; `Escape` lo cierra |
| ✅ | Bajar hasta `#estudio` | Los contadores suben hasta **248 · 17 · 11 · 96** |
| ✅ | Enviar `#form-presupuesto` vacío | No se envía nada; aparecen avisos en rojo en `#error-nombre`, `#error-email`, `#error-tipo` y `#error-mensaje` |
| ✅ | Rellenarlo bien y enviar | Mensaje `✓ … Referencia: VTX-…` en `#presupuesto-exito`; el formulario queda vacío |
| ✅ | Repetir la consulta de la bandeja (§4.1) | La solicitud aparece con su `referencia` y `creado_en` |
| ✅ | Enviar 6 veces seguidas sin esperar | La sexta responde `429 Demasiadas solicitudes…` (límite de 5 por minuto) |
| ✅ | `npm run reiniciar` y recargar | La bandeja queda vacía y vuelven los 6 proyectos, 4 servicios y 4 cifras de ejemplo |

---

## 7. Si algo falla

| Qué ves | Qué hacer |
|---|---|
| `EADDRINUSE: port 3105` | Otro proceso usa el puerto: ciérralo o cambia `PORT` en `.env` y reinicia |
| El formulario dice «Modo demo» | No hay servidor: ejecuta `npm start` y abre <http://localhost:3105> (no `index.html`) |
| `429 Demasiadas solicitudes` | Espera un minuto o sube `LIMITE_PRESUPUESTO` en `.env` |
| `401 Token de administración no válido` en la bandeja | El header `x-admin-token` no coincide con `ADMIN_TOKEN` del `.env` |
| `400 El cuerpo no es JSON válido` | El fichero del body tiene BOM o comillas rotas: usa `[IO.File]::WriteAllText` (§4.1) |
| `No se pudo cargar "node:sqlite"` | Instala Node ≥ 22.13 y comprueba con `node -v` |

La tabla completa de síntomas y soluciones está en el
[§10 del README](../README.md#10-problemas-frecuentes).

---

## 8. Documentación relacionada

- [Guía de desarrollador](GUIA-DESARROLLADOR.md) — arquitectura, API completa y
  recetas para añadir secciones, campos y endpoints.
- [README de esta plantilla](../README.md) — arranque, `.env`, despliegue,
  problemas y seguridad.
- Docs globales del repositorio (pendientes de crear en esta rama):
  [índice de endpoints](../../docs/API.md) ·
  [personalización](../../docs/PERSONALIZACION.md) ·
  [despliegue](../../docs/DESPLIEGUE.md) ·
  [índice general](../../README.md)
