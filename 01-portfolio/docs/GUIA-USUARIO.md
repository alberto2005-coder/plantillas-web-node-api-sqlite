# Guía de usuario · 01-portfolio

## 1. Para quién es

Esta guía es para **quien tiene la web del portfolio y no programa**: quieres
cambiar tus proyectos, saber si alguien te ha escrito desde el formulario y
enseñar la web sin miedo a romperla.

| Lo que necesitas | Cuánto |
|---|---|
| Un navegador (Chrome, Edge, Firefox o Safari) | ya lo tienes |
| Node 22.13 o superior, solo para el servidor | `node -v` |
| Cuenta de correo, tarjeta o instalaciones | ❌ nada de eso |

- **No hace falta** `npm install`: los scripts de la plantilla no tienen
  dependencias obligatorias.
- **No hay panel gráfico**: la bandeja de mensajes se consulta con la API
  (te enseño dos formas copiables en la §4) o abriendo la base de datos con un
  programa gratuito.
- Si algo de esta guía no cuadra con tu plantilla, el README de la plantilla
  (§2 arranque, §4 API, §10 problemas) es la referencia técnica.

**Recorrido de la guía:** arranque en 5 minutos → visita guiada por las
secciones → dónde ves los mensajes → cambios sin programar → checklist →
fallos típicos.

---

## 2. Arranque en 5 minutos

1. Abre la carpeta `01-portfolio` en la terminal (o en el explorador de
   Windows, escribe `powershell` en la barra de dirección).
2. Comprueba que tienes Node:
   ```powershell
   node -v
   ```
   Debe salir `v22.13.0` o superior. Si no, instálalo desde
   [nodejs.org](https://nodejs.org).
3. Arranca el servidor:
   ```powershell
   npm start
   ```
   Verás un cartel en la terminal con `01-portfolio · servidor en marcha`, la
   ruta de la web, la del API y la de la base de datos.
4. Abre la web en el navegador: **<http://localhost:3000>**
   El puerto `3000` sale de tu fichero `.env` (línea `PORT=3000`). Si cambias
   `PORT`, cambia también la dirección que abres.
5. Comprueba que el servidor está vivo abriendo
   **<http://localhost:3000/api/salud>**. Debe aparecer un JSON así:

   ```json
   {
     "ok": true,
     "servicio": "portfolio-api",
     "version": "1.0.0",
     "node": "v24.14.0",
     "hora": "2026-10-02T13:29:42.157Z",
     "uptime_s": 3
   }
   ```

   Si ves eso, **todo lo demás funciona**. Si el navegador dice
   «No se puede acceder a este sitio», el servidor no está arrancado.

6. Para pararlo: `Ctrl + C` en la terminal.

| Comando | Qué hace | Cuándo usarlo |
|---|---|---|
| `npm start` | levanta servidor + API + web en el mismo puerto | siempre |
| `npm run dev` | igual, pero se reinicia solo al guardar un cambio | si vas a editar textos |
| `npm run reiniciar` | **borra** `server/data/portfolio.db` y crea otra con los 6 proyectos de ejemplo | solo si quieres empezar de cero |
| `node server/server.js` | arranque directo sin npm | si npm te da problemas |

### Alternativa: doble clic en `index.html` (modo demo)

Puedes abrir `index.html` directamente, sin servidor. La web se ve completa,
pero cambia lo que «habla con el fondo»:

| Qué | Con servidor (`npm start`) | Doble clic en `index.html` |
|---|---|---|
| Ver y navegar la web, tema oscuro, menú, filtros, animaciones | ✅ funciona | ✅ funciona |
| Formulario de contacto | ✅ envía a `POST /api/contacto` y se guarda en la base de datos | ⚠️ responde «Modo demo: ejecuta `npm start` para guardarlo» y **no se guarda** |
| Enlaces «Ver demo» / «Código» de los proyectos | ✅ se rellenan desde `GET /api/proyectos` | ⚠️ se quedan vacíos (los enlaces del HTML apuntan a `#`) |
| Bandeja de mensajes | ✅ hay mensajes nuevos | ❌ no hay nada nuevo |
| Consola del navegador (F12) | mensaje `[api] Proyectos sincronizados…` | aviso `[api] Sin servidor: los proyectos salen del index.html` |

**Cómo saber si estás en uno u otro modo:** escribe `http://localhost:3000/api/salud`
en el navegador. Si responde JSON, hay servidor; si no, estás en modo demo.

---

## 3. Recorrido por la web, sección por sección

Nombres reales de las secciones del `index.html` (el identificador `#…` es el
que aparece en la barra de direcciones cuando haces clic en un enlace del menú).

| Sección (id) | Qué ve el visitante | Qué rellena | Qué pasa por detrás |
|---|---|---|---|
| Barra superior (`#navbar`, menú `#menu-navegacion`) | logo «AM · Alex Moreno», enlaces, botón de tema `#btn-tema` y hamburguesa `#btn-hamburguesa` | nada | el tema elegido se guarda en el navegador (`localStorage`) y se aplica sin parpadeo |
| Inicio / hero (`#inicio`, título `#hero-titulo`) | «¡Hola! Soy Alex Moreno», subtítulo, botones *Ver proyectos* y *Contactar*, redes | nada | es estático; solo cambia el texto de `index.html` |
| Sobre mí (`#sobre-mi`) | párrafos de presentación y 4 datos (experiencia, proyectos, clientes, valoración) | nada | estático |
| Proyectos (`#proyectos`, rejilla `#grid-proyectos`) | 6 tarjetas y 5 botones de filtro (`Todos`, `Web`, `Apps`, `Diseño`, `Branding`); mensaje vacío `#proyectos-vacio` | nada | al cargar, `GET /api/proyectos` rellena los enlaces de cada tarjeta (`url_demo`, `url_codigo` y el texto de `texto_enlace2`, p. ej. «Caso de estudio»); los filtros son de navegador |
| Habilidades (`#habilidades`) | 5 barras animadas y badges de tecnologías | nada | estático; cada barra lleva su porcentaje en `data-valor` |
| Experiencia (`#experiencia`) | cronología con 4 hitos | nada | estático |
| Contacto (`#contacto`, formulario `#formulario-contacto`) | 3 tarjetas de datos + formulario con `#nombre`, `#email` y `#mensaje` | nombre, correo y mensaje | validación en vivo al salir de cada campo (`#error-nombre`, `#error-email`, `#error-mensaje`) y, al enviar, `POST /api/contacto` con `{nombre, email, mensaje}`; la respuesta se muestra en `#form-exito` |
| Pie | navegación secundaria y año `#anio-actual` | nada | el año se pone solo |

### Qué le pasa tu mensaje por dentro

1. El navegador envía `POST /api/contacto` con `Content-Type: application/json`.
2. El servidor valida: nombre ≥ 2 caracteres, correo con formato válido y
   mensaje ≥ 10 caracteres. Si algo falla responde **400** con una lista de
   errores (`detalle`) que el formulario muestra tal cual.
3. Si pasa el **límite anti-spam** (`LIMITE_CONTACTO=5` envíos por IP y minuto)
   se guarda una fila en la tabla **`mensajes`** con columnas
   `id, nombre, email, mensaje, ip, leido, creado_en`.
4. Responde **201**:

   ```json
   {
     "ok": true,
     "id": 2,
     "mensaje": "Mensaje recibido. Gracias por escribir.",
     "correo": "demo",
     "detalleCorreo": "sin correo configurado (.env)"
   }
   ```

   `correo: "demo"` significa «guardado, pero no enviado por correo»: pasa
   mientras no configures Resend o SMTP (receta R4 de la §5).
5. Si envías más de 5 veces en un minuto desde la misma IP: **429**
   «Demasiados envíos desde esta conexión».

---

## 4. Dónde ves lo que llega

### 4.1 Saca tu token de administración del `.env`

1. Abre el fichero `.env` de la carpeta `01-portfolio` con el Bloc de notas.
2. Busca la línea:
   ```env
   ADMIN_TOKEN=demo-token-portfolio-9f4c2b7e1a
   ```
   o, desde la terminal:
   ```powershell
   Get-Content .env | Select-String ADMIN_TOKEN
   ```
3. Ese valor es la **contraseña de la bandeja**. Si lo cambias, reinicia el
   servidor (`Ctrl + C` → `npm start`). Nunca lo publiques.

### 4.2 Bandeja de mensajes con `curl` (PowerShell)

> En PowerShell, `curl` es un alias de otro comando: usa siempre **`curl.exe`**.
> Y guarda el cuerpo en un fichero: las comillas sueltas del `-d` directo se
> estropean al pasar por la consola.

```powershell
# 1) Mensajes recibidos (GET, no necesita cuerpo)
curl.exe -H "x-admin-token: demo-token-portfolio-9f4c2b7e1a" http://localhost:3000/api/mensajes

# 2) Enviar un mensaje de prueba desde la terminal
#    OJO: UTF-8 SIN BOM (File.WriteAllText no pone BOM; con Set-Content -Encoding utf8 de
#    PowerShell 5.1 sí, y el servidor respondería 400 "El cuerpo no es JSON válido")
[System.IO.File]::WriteAllText("$PWD\body.json", '{"nombre":"Ana","email":"ana@correo.com","mensaje":"Quiero un presupuesto para mi web."}')
curl.exe -X POST http://localhost:3000/api/contacto -H "Content-Type: application/json" --data-binary "@body.json"

# 3) Borrar el mensaje 2 (el token va SOLO en la cabecera: x-admin-token)
curl.exe -X DELETE -H "x-admin-token: demo-token-portfolio-9f4c2b7e1a" http://localhost:3000/api/mensajes/2
```

Y en **bash** (Linux, macOS o Git Bash):

```bash
curl -H "x-admin-token: demo-token-portfolio-9f4c2b7e1a" http://localhost:3000/api/mensajes

cat > body.json <<'EOF'
{"nombre":"Ana","email":"ana@correo.com","mensaje":"Quiero un presupuesto para mi web."}
EOF
curl -X POST http://localhost:3000/api/contacto \
  -H "Content-Type: application/json" --data-binary "@body.json"
```

Respuesta real de la bandeja (los mensajes salen de más reciente a antiguo,
máximo 200):

```json
[
  {
    "id": 1,
    "nombre": "Ana Prueba",
    "email": "ana@correo.com",
    "mensaje": "Hola, quiero hablar de un proyecto nuevo.",
    "leido": false,
    "creado_en": "2026-10-02 10:29:01"
  }
]
```

Si te equivocas de token: `401 {"error": "Token de administración no válido (header x-admin-token)"}`.

### 4.3 Viendo la base de datos con DB Browser for SQLite

1. Descarga [DB Browser for SQLite](https://sqlitebrowser.org) (gratis).
2. Abre el fichero **`01-portfolio/server/data/portfolio.db`**
   (esa es la ruta real que usa esta plantilla; `DB_FILE` del `.env` la puede
   cambiar).
3. Pestaña **Examinar datos** → verás dos tablas:

| Tabla | Contenido | Quién la escribe |
|---|---|---|
| `proyectos` | 6 filas: los proyectos del portafolio | la plantilla al crearse; tú |
| `mensajes` | lo que llega del formulario | el formulario (`POST /api/contacto`) |

4. La columna `leido` es un **1/0** (aquí se muestra como `0`): no hay botón de
   «marcar como leído», es un campo preparado para cuando lo añadas.
5. `creado_en` se rellena con la hora UTC de la base de datos
   (`datetime('now')`), por eso puede parecer que «faltan horas».

---

## 5. Cambios sin programar (3 palancas)

### Palanca 1 · el fichero `.env`

Es la configuración. Edítalo, **reinicia el servidor** y listo. Valores reales
de tu `.env` actual:

| Variable | Tu valor | Para qué sirve |
|---|---|---|
| `PORT` | `3000` | puerto de la web y del API |
| `HOST` | `127.0.0.1` | solo accesible desde tu equipo (`0.0.0.0` para servidor público) |
| `SITE_URL` | `http://localhost:3000` | enlaces que salen en correos |
| `DB_FILE` | `server/data/portfolio.db` | dónde está la base de datos |
| `ADMIN_TOKEN` | `demo-token-portfolio-9f4c2b7e1a` | llave de la bandeja de mensajes |
| `CONTACTO_DESTINO` | `hola@alexmoreno.dev` | correo que recibe los avisos |
| `LIMITE_CONTACTO` | `5` | envíos máximos por IP y minuto |
| `RESEND_API_KEY` / `EMAIL_DE` | vacío / `Alex Moreno <hola@alexmoreno.dev>` | correo real por Resend |
| `SMTP_HOST` … | vacío | correo real por SMTP (requiere `npm install nodemailer`) |
| `CORS` | `0` | déjalo así salvo que otra web consuma tu API |

### Palanca 2 · los datos de la base de datos

Todo lo que ves en la sección *Proyectos* vive en la tabla `proyectos`. Puedes
tocarlo con DB Browser for SQLite (§4.3) o con `npm run reiniciar` si quieres
volver al estado de fábrica (**borra también los mensajes**).

### Palanca 3 · el bloque `PALETA DE COLORES — EDITA AQUÍ`

Está en `css/styles.css`, en la línea 7. Cambia `--color-primary` dentro de
`:root` y vuelve a cargar la página (`Ctrl + F5`): botones, enlaces, pills,
barras y degradados se recolorean. Recuerda editar también el bloque
`[data-theme="dark"]`, que es el tema oscuro.

### Cuatro recetas concretas de esta plantilla

**R1 · Cambiar textos, nombre y datos de contacto**
Todo está en `index.html`:
- Título del navegador y descripción: las líneas `<title>` y
  `<meta name="description">` del `<head>`.
- Nombre grande del hero: dentro de `<h1 class="hero__titulo" id="hero-titulo">`.
- Nombre de la barra de navegación: `<span class="navbar__logo-text">`.
- Presentación y datos de `#sobre-mi`, texto de `#experiencia`, correo y
  ubicación de `#contacto`.
- El año del pie (`#anio-actual`) se actualiza solo.

**R2 · Cambiar los proyectos (añadir, quitar, ordenar)**
- *Opción A, solo HTML:* dentro de `#grid-proyectos` copia un bloque
  `<article class="proyecto" data-categoria="web">` y edítalo: pill, categoría,
  título, descripción y enlaces. `data-categoria` debe coincidir con el
  `data-filtro` de los botones (`web`, `app`, `diseno`, `marca`).
- *Opción B, con la base de datos:* los enlaces reales salen de `url_demo` y
  `url_codigo`. Abre `portfolio.db` y actualiza la fila por su `titulo`:
  ```sql
  UPDATE proyectos
  SET url_demo = 'https://mi-proyecto.example', url_codigo = 'https://github.com/usuario/repo'
  WHERE titulo = 'Panadería La Miga';
  ```
  Recarga la página y los enlaces cambian. Si una columna queda vacía, el
  enlace desaparece de la tarjeta (eso es esperado: así no queda un `#` roto).

**R3 · Cambiar los colores de la web**
`css/styles.css` → bloque `PALETA DE COLORES — EDITA AQUÍ` → `--color-primary`
(y `--color-primary-hover`). Hazlo en `:root` y en `[data-theme="dark"]`.
Detrás de la paleta, la tipografía se cambia en el `<link>` de Google Fonts del
`index.html` y luego en `--font-heading` / `--font-body`.

**R4 · Avisos por correo y anti-spam, sin tocar código**
- Quién recibe el aviso: `CONTACTO_DESTINO=tu-correo@tudominio.com`.
- Poder enviar más de 5 mensajes al minuto: `LIMITE_CONTACTO=10`.
- Que salga un correo de verdad (opción Resend, sin instalar nada): pega
  `RESEND_API_KEY=re_…` y deja `EMAIL_DE="Tu Nombre <hola@tudominio.com>"`
  (el dominio debe estar verificado en Resend) y reinicia. El campo
  `correo` de la respuesta pasará de `"demo"` a `"enviado"`.
- Opción SMTP: `SMTP_HOST=smtp.gmail.com`, `SMTP_PUERTO=587`,
  `SMTP_USUARIO` y `SMTP_CLAVE` (contraseña de aplicación) más
  `npm install nodemailer`.

Más recetas (imágenes, tipografías, secciones, despliegue) en la guía global de
[personalización](../../docs/PERSONALIZACION.md).

---

## 6. Checklist «pruébala antes de enseñarla»

Marca cada paso en tu propio navegador antes de pasar la web a nadie.

| # | Clic / acción | Resultado esperado |
|---|---|---|
| 1 | `npm start` y mirar la terminal | cartel `01-portfolio · servidor en marcha`, sin texto rojo |
| 2 | Abrir `http://localhost:3000/api/salud` | JSON con `"ok": true` y `"servicio": "portfolio-api"` |
| 3 | Abrir `http://localhost:3000` | hero con «Alex Moreno» y 6 tarjetas de proyecto |
| 4 | Pulsar el botón de tema `#btn-tema` y recargar | el tema elegido se mantiene |
| 5 | Filtro **Branding** en `#proyectos` | solo queda *Estudio Horizonte*; **Todos** vuelve a 6 |
| 6 | Enviar el formulario con `Ana` de 1 letra | aviso «Escribe tu nombre (mínimo 2 letras)» y no se envía |
| 7 | Enviar el formulario completo | `✓ Mensaje recibido. Gracias por escribir.` y el formulario se vacía |
| 8 | Repetir el paso 7 seis veces seguidas | el mensaje 6 llega con «Demasiados envíos…» (429) |
| 9 | Consultar la bandeja (§4.2) o abrir `portfolio.db` (§4.3) | aparece tu mensaje con `leido = 0` y la hora |
| 10 | Doble clic en `index.html` con el servidor parado | la web se ve igual, pero el formulario avisa «Modo demo» |

---

## 7. Si algo falla

| Fallo típico | Qué pasa en una línea |
|---|---|
| «Modo demo» al enviar el formulario | no hay servidor levantado: `npm start` y abre `http://localhost:3000` |
| `429 Demasiados envíos` | superaste `LIMITE_CONTACTO=5` por minuto; espera 60 s o sube el valor en `.env` |
| `401 Token no válido` en la bandeja | el `x-admin-token` no coincide con `ADMIN_TOKEN` del `.env` |
| `EADDRINUSE` al arrancar | el puerto 3000 está ocupado: cambia `PORT` en `.env` o cierra el proceso anterior |
| `No se pudo cargar "node:sqlite"` | tu Node es viejo: instala 22.13 o superior (`node -v`) |
| Los proyectos no tienen enlaces | `url_demo` / `url_codigo` están vacíos en la base de datos (receta R2) |

Estos y otros más, con sus soluciones, están en la
[§10 Problemas frecuentes del README](../README.md#10-problemas-frecuentes).

---

## 8. Documentación relacionada

| Documento | Para qué te sirve |
|---|---|
| [README de esta plantilla](../README.md) | referencia completa: arranque, `.env`, API, base de datos, despliegue y seguridad (12 secciones) |
| [Guía de desarrollador](GUIA-DESARROLLADOR.md) | si algún día quieres tocar código: arquitectura, API completa y recetas |
| [Índice de endpoints](../../docs/API.md) | consulta rápida de todas las APIs (global, pendiente de publicar) |
| [Personalización](../../docs/PERSONALIZACION.md) | recetas de identidad, colores y datos (global, pendiente de publicar) |
| [Despliegue](../../docs/DESPLIEGUE.md) | cómo publicarla en internet con HTTPS (global, pendiente de publicar) |
