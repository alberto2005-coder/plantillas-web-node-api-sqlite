# Guía de usuario — 02-saas (Fluxo)

> **Para quién es esta guía**  
> Dueños de negocio, marketers, diseñadores o fundadores que quieren poner en marcha la landing y ver los resultados **sin escribir código**. Solo necesitas un navegador y Node instalado.

---

## 1. Arranque en 5 minutos

| Paso | Qué hacer | Qué verás |
|------|-----------|-----------|
| 1 | Abre una terminal en la carpeta `02-saas` | — |
| 2 | Ejecuta `npm start` | `Web: http://localhost:3000` · `API: http://localhost:3000/api/salud` |
| 3 | Abre el navegador en `http://localhost:3000` | La landing completa con precios, formulario y FAQ |
| 4 | (Opcional) Doble clic en `index.html` | **Modo demo**: la web se ve igual, pero el formulario **no guarda nada** y los precios salen del HTML estático |

### ¿Cómo sé si el servidor está vivo?
- En la terminal ves `──────────────────────────────────────────────` y la URL.
- Entra a `http://localhost:3000/api/salud`: devuelve JSON con `ok: true`, versión, Node y uptime.
- Si ves "modo demo" en la consola del navegador (F12 → Console), es que **no hay servidor** corriendo.

> ⚠️ El puerto real viene del `.env`: **`PORT=3000`** (no 3002 como en otras plantillas).

---

## 2. Recorrido por la web (sección a sección)

| Sección (id HTML) | Qué ve el visitante | Qué puede hacer | Qué pasa detrás (endpoint + tabla) |
|-------------------|---------------------|-----------------|-------------------------------------|
| `#registro` (hero) | Título, subtítulo, **formulario de email** + botón "Empezar gratis" | Escribe su correo y pulsa | `POST /api/registro` → guarda en `suscripciones` (estado `prueba`), envía correo de verificación |
| `#funciones` | 6 tarjetas con icono, título y descripción | Solo lectura | — |
| `#precios` | 3 planes (Básico, **Pro**, Empresa) con conmutador mensual/anual | Cambia mensual↔anual; pulsa "Probar 14 días" (va a `#registro`) o **"Contratar ahora con tarjeta →"** (solo en Pro) | Precios iniciales del HTML; si hay servidor, `GET /api/planes` los sobrescribe desde BD. Botón "Contratar" → `POST /api/pago/sesion` |
| `#testimonios` | 3 tarjetas con cita, avatar y cargo | Solo lectura | — |
| `#faq` | 7 preguntas tipo acordeón (solo una abierta a la vez) | Abre/cierra | — |
| `#cta` | Botones "Crear cuenta gratis" (va a `#registro`) y "Ver demo" | Navegación | — |
| Footer | Enlaces a Producto, Empresa, Recursos, Legal + redes | Navegación | — |

### Detalle de los formularios

**Hero (`#formRegistro`)**  
- Campo: `email` (requerido, validado en cliente y servidor)  
- Envía: `POST /api/registro` con `{email, plan, periodo}`  
  - `plan` = `pro` por defecto (o el que venga en `?plan=` o `localStorage`)  
  - `periodo` = `mensual` o `anual` según el conmutador  
- Respuesta exitosa: `{ok:true, id, mensaje, correo:"enviado"|"demo", plan, periodo, dias_prueba:14}`  
- Si el email ya existe: `{ok:true, id, mensaje:"…ya estaba registrado…", repetido:true}`

**Newsletter** (no hay formulario visible en el HTML actual, pero el endpoint existe)  
- Endpoint: `POST /api/newsletter` → `{email, origen?}`  
- Guarda en tabla `newsletter`

---

## 3. Dónde ves lo que llega (bandeja de entradas)

### Opción A: `curl` (PowerShell y bash)

Guarda el body en un fichero y usa `--data-binary "@fichero"` para evitar problemas de comillas en PowerShell.

**PowerShell**
```powershell
# Ver todas las suscripciones (últimas 200)
$env:ADMIN_TOKEN = "demo-token-saas-7c21e8b4f6"
curl -H "x-admin-token: $env:ADMIN_TOKEN" http://localhost:3000/api/suscripciones

# Ver newsletter
curl -H "x-admin-token: $env:ADMIN_TOKEN" http://localhost:3000/api/suscripciones
# (usa GET /api/suscripciones para ver suscripciones; no hay endpoint público para newsletter)
```

**bash / Git Bash / WSL**
```bash
export ADMIN_TOKEN="demo-token-saas-7c21e8b4f6"
curl -H "x-admin-token: $ADMIN_TOKEN" http://localhost:3000/api/suscripciones
```

> El `ADMIN_TOKEN` sale del `.env` (línea 21). Cámbialo antes de publicar.

### Opción B: DB Browser for SQLite (visual)

1. Descarga <https://sqlitebrowser.org/> (gratis, Windows/Mac/Linux).
2. Abre `server/data/saas.db`.
3. Pestaña **Browse Data** → elige tabla:
   - `suscripciones` → verás `id, email, plan, periodo, estado (prueba/activa/cancelada), stripe_session_id, ip, creado_en`
   - `newsletter` → `id, email, origen, creado_en`
   - `planes` → los 3 planes con precios y funciones (JSON)

### Opción C: CLI `sqlite3`
```bash
sqlite3 server/data/saas.db ".mode table" "SELECT * FROM suscripciones ORDER BY creado_en DESC LIMIT 20;"
```

---

## 4. Cambios sin programar (solo editas ficheros)

| Qué quieres cambiar | Dónde tocar | Ejemplo |
|---------------------|-------------|---------|
| Puerto del servidor | `.env` → `PORT=8080` | `PORT=8080` y reinicia |
| Colores de la marca | `css/styles.css` → bloque `:root` → `--color-primary: #5b7cfa;` | Cambia a `#e63946` y toda la web se recolorea |
| Textos e imágenes | `index.html` | Edita el `<h1>`, subtítulos, FAQ, logos… |
| Correo de avisos | `.env` → `EMAIL_DE="Fluxo <hola@tudominio.com>"` | Requiere `RESEND_API_KEY` o SMTP (§6.7 del README) |
| Días de prueba | `.env` → `DIAS_PRUEBA=30` | Aparece en el correo de bienvenida |
| **Precios de los planes** | Ver recetas abajo | — |

### 4 recetas frecuentes

#### ✅ Cambiar precios de los planes
1. Edita `server/datos/semillas.js` → array `PLANES` (líneas 47–94): modifica `precio_mensual` y `precio_anual`.
2. Ejecuta `npm run reiniciar` (borra la BD y la resiembra).
3. O sin borrar: `sqlite3 server/data/saas.db "UPDATE planes SET precio_mensual=29, precio_anual=24 WHERE clave='pro';"`

#### ✅ Cambiar el nombre del producto ("Fluxo" → "MiSaaS")
1. `index.html`: busca "Fluxo" (aparece en `<title>`, `<meta description>`, logo, hero, footer, testimonios…).
2. `js/main.js`: línea 64 → `const CLAVE_TEMA = 'fluxo-tema';` (cámbialo si quieres otra clave de localStorage).
3. `server/datos/semillas.js`: en el correo de bienvenida (línea 262 de `api.js`) dice "Fluxo" — cámbialo allí si usas el servidor.

#### ✅ Cambiar el correo de avisos (remitente)
1. `.env` → `EMAIL_DE="MiSaaS <hola@misass.com>"`
2. Activa Resend (`RESEND_API_KEY`) o SMTP (§6.7 del README).
3. Reinicia.

#### ✅ Cambiar días de prueba gratis
1. `.env` → `DIAS_PRUEBA=30`
2. Reinicia. El cambio se ve en el correo de bienvenida y en `GET /api/verificar`.

> 📄 Personalización completa: [../../docs/PERSONALIZACION.md](../docs/PERSONALIZACION.md)

---

## 5. Checklist «pruébala antes de enseñarla» (8–10 clics)

| # | Acción | Resultado esperado |
|---|--------|--------------------|
| 1 | Abre `http://localhost:3000` | Landing completa, sin errores en consola (F12) |
| 2 | Cambia el conmutador **Mensual → Anual** | Los importes cambian (9→7, 19→15, 39→31) y la nota dice "Facturado anualmente (X €)" |
| 3 | Escribe un email válido en el hero y pulsa "Empezar gratis" | Mensaje verde "¡Listo! Te hemos enviado un enlace a…" |
| 4 | Vuelve a enviar el mismo email | Mensaje "Este correo ya estaba registrado…" |
| 5 | Pulsa **"Contratar ahora con tarjeta →"** en el plan Pro | Modo demo: aviso "Pagos en modo demo: no se cobra nada" + scroll al formulario |
| 6 | Abre `http://localhost:3000/api/planes` | JSON con 3 planes, precios, funciones y `destacado:true` solo en Pro |
| 7 | `curl -H "x-admin-token: demo-token-saas-7c21e8b4f6" http://localhost:3000/api/suscripciones` | Ver el registro que hiciste en el paso 3 (estado `prueba`) |
| 8 | Abre FAQ: abre una pregunta, luego otra | Solo queda abierta la última |
| 9 | Cambia tema claro/oscuro (botón ☀️/🌙) | Cambia al instante y persiste al recargar |
| 10 | Recarga la página | El tema y el conmutador anual/mensual se mantienen |

---

## 6. Si algo falla (5–6 problemas típicos)

| Síntoma | Solución en 1 línea | Véase README §10 |
|---------|---------------------|------------------|
| `No se pudo cargar "node:sqlite"` | Instala **Node ≥ 22.13** (`node -v`) | ✅ |
| `EADDRINUSE: port 3000` | Cambia `PORT` en `.env` o mata el proceso anterior | ✅ |
| El formulario dice "modo demo" | Ejecuta `npm start` y usa `http://localhost:3000` (no `file://`) | ✅ |
| Los precios no cambian al editar la BD | Reinicia el servidor y comprueba `curl /api/planes` | ✅ |
| `429 Demasiados registros` | Espera 1 min o sube `LIMITE_REGISTRO` en `.env` | ✅ |
| `401 Token no válido` en `/api/suscripciones` | Usa el `ADMIN_TOKEN` exacto del `.env` en header `x-admin-token` | ✅ |

---

## 7. Documentación relacionada

- [Guía de desarrollador](GUIA-DESARROLLADOR.md) — arquitectura, API completa y recetas de extensión
- Docs globales: [índice de endpoints](../docs/API.md) · [personalización](../docs/PERSONALIZACION.md) · [despliegue](../docs/DESPLIEGUE.md)
- README de la plantilla: [../README.md](../README.md)