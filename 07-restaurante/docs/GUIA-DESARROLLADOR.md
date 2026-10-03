# 07-restaurante — Guía de desarrollador (Casa Olivera)

> **Para quién es esta guía**: desarrolladores que van a extender la API, cambiar el modelo de datos, añadir campos a la reserva, integrar correo real, cambiar la política de huecos o desplegar en producción.

> **Documentación relacionada**: [Guía de usuario](GUIA-USUARIO.md) · [README principal](../README.md) · [Guía global de despliegue](../docs/GUIA-DESPLIEGUE.md) · [Guía global de seguridad](../docs/GUIA-SEGURIDAD.md)

---

## 1. Mapa del código (arquitectura)

```
07-restaurante/
├── index.html            # Hero, carta, reserva, nosotros, opiniones, FAQ, contacto
├── css/styles.css        # :root { --color-primary #146b57, --font-heading… }
├── js/main.js            # 13 secciones: API client, carta, horarios, opiniones, reserva, contadores
├── .env                  # PORT=3007, ADMIN_TOKEN, MAX_POR_HORA, INTERVALO_RESERVA…
├── .env.example          # Plantilla comentada
├── package.json          # start, dev, reiniciar (Node ≥ 22.13)
└── server/
    ├── server.js         # HTTP server: .env → BD → API router → estáticos
    ├── api.js            # 9 endpoints REST (ver §5)
    ├── reset.js          # Borra BD y resiembra
    ├── datos/semillas.js # ESQUEMA SQL + 4 tablas + datos demo (23 platos, 7 horarios, 4 reseñas)
    ├── data/restaurante.db# SQLite (WAL mode)
    └── lib/
        ├── env.js        # Lee .env (sin deps)
        ├── db.js         # Wrapper node:sqlite (todos, uno, ejecutar)
        ├── router.js     # REST router con params :id
        ├── limitador.js  # Rate limit en memoria (Map + setInterval)
        ├── http.js       # json(), error(), estatico(), leerCuerpo()
        └── email.js      # Resend / SMTP (opcional)
```

---

## 2. Ciclo de petición (trazas reales)

### 2.1 `GET /api/disponibilidad?fecha=2026-10-06&comensales=4` (lectura típica)

```
navegador → fetch('/api/disponibilidad?fecha=2026-10-06&comensales=4')
  → server.js:48 req.url.startsWith('/api/')
  → api.manejar(req, res) [router.js:45]
  → router encuentra api.get('/api/disponibilidad', handler) [api.js:311]
  → handler(ctx):
      1. valida fecha (AAAA-MM-DD, no pasado, ≤ DIAS_MAX_RESERVA)
      2. horario = horarioDeFecha(bd, fecha) → SELECT * FROM horarios WHERE dia = ?
      3. si cerrado → {fecha, cerrado:true, horas:[]}
      4. turnos = JSON.parse(horario.turnos)
      5. horas = horasDelDia(turnos, INTERVALO_RESERVA)  // ej. ['13:00','13:30'…'23:00']
      6. ocupadas = reservasPorHora(bd, fecha)          // Map {'20:30':2, …}
      7. horas.map(h => ({hora:h, libre: (ocupadas.get(h)||0) < MAX_POR_HORA}))
      8. ctx.json({fecha, cerrado:false, horas:[…], comensales})
  → json(res, datos, 200) [http.js:43] → application/json; charset=utf-8
```

**Algoritmo exacto de disponibilidad** (`api.js:134-153, 343-349`):
- `INTERVALO_RESERVA` (defecto 30 min) → huecos cada 30 min dentro de cada turno
- Turno `20:00–00:00` se trata como `20:00–24:00` (fin ≤ inicio → +24h)
- Un hueco sale `libre:false` cuando `COUNT(reservas WHERE fecha=? AND hora=? AND estado<>'cancelado') ≥ MAX_POR_HORA` (defecto 4)
- Si el día está cerrado (`horarios.cerrado=1` o sin fila) → `{cerrado:true, horas:[]}`

### 2.2 `POST /api/reservas` (escritura con validación, límite y re-comprobación)

```
fetch('/api/reservas', {method:'POST', body:{fecha,hora,comensales,nombre,telefono,email,notas}})
  → api.post('/api/reservas', async ctx) [api.js:353]
  → 1) VALIDACIÓN CAMPO A CAMPO → 400 con detalle[] (va ANTES del límite por IP)
       - fecha: obligatoria, AAAA-MM-DD válida, ≥ hoy, ≤ hoy+DIAS_MAX_RESERVA
       - hora: obligatoria, HH:MM, minuto múltiplo de INTERVALO_RESERVA, dentro de turnos del día
       - comensales: entero 1..COMENSALES_MAX
       - nombre: ≥ 2 chars
       - teléfono: ≥ 9 dígitos (solo dígitos)
       - email: opcional, formato válido si presente
       - notas: ≤ 500 chars
  → 2) LÍMITE POR IP → 429 si > LIMITE_RESERVAS/min (defecto 5)
       limiteReservas.permitido(ctx.ip) [limitador.js:30]
  → 3) RE-COMPROBACIÓN DISPONIBILIDAD EN EL INSTANTE → 409
       ocupadas = reservasPorHora(bd, fecha)
       huecoLleno = (ocupadas.get(hora)||0) >= MAX_POR_HORA
       duplicada = busca en reservas de esa fecha+hora (estado<>'cancelado')
           donde coincida teléfono (solo dígitos) OR email OR nombre normalizado OR ip
       si huecoLleno OR duplicada → 409 con mensaje específico
  → 4) GUARDA
       referencia = nuevaReferencia(bd)  // CO-0041, CO-0042… (empezando en 41)
       INSERT INTO reservas (referencia, fecha, hora, comensales, nombre, telefono, email, notas, estado, ip)
  → 5) CORREO (opcional: solo si RESEND_API_KEY o SMTP_HOST configurados)
       enviarCorreo() [email.js] → cliente + aviso interno (CONTACTO_DESTINO/EMAIL_RESERVAS)
       respuesta.correo = 'enviado' | 'demo'
  → ctx.json({ok:true, id, referencia, fecha, hora, comensales, correo, mensaje}, 201)
```

### 2.3 Front: carga inicial y reserva (`js/main.js`)

```
DOMContentLoaded
  → api('/api/carta')  → sustituye array CARTA local → pintarCarta()
  → api('/api/horarios') → sustituye HORARIOS local → pintarHorarios()
  → api('/api/resenas') → sustituye RESENAS local → pintarOpiniones()

Reserva:
  campoFecha.change / campoComensales.change → cargarDisponibilidad()
     → api('/api/disponibilidad?fecha=…&comensales=…')
     → pone <option> en #hora (deshabilita las libre:false)
     → si datos.cerrado → diaCerrado=true, placeholder «Cerrado ese día…»
  form submit → validaciones locales → api('/api/reservas', POST)
     → 201: toast ✓ + referencia + limpiar formulario
     → 400/409: toast ✗ con detalle
     → estado 0 (sin servidor): modo demo → toast ✓ ficticio
```

---

## 3. Base de datos (tablas y columnas reales)

| Tabla | Columnas | Índices / Uniques | Quién escribe |
|---|---|---|---|
| `platos` | `id PK`, `nombre`, `descripcion`, `categoria` (entrantes\|arroces\|principales\|postres\|vinos), `precio REAL`, `alergenos TEXT` (JSON `["Gluten","Lactosa"]`), `vegetariano` (1/0), `picante` (1/0), `destacado` (1/0), `disponible` (1/0), `orden` | — | semillas / manual |
| `horarios` | `id PK`, `dia UNIQUE` (lunes…domingo), `cerrado` (1/0), `turnos TEXT` (JSON `[{"desde":"13:00","hasta":"15:30"}]`) | `dia UNIQUE` | semillas / manual |
| `resenas` | `id PK`, `autor`, `fecha`, `estrellas`, `texto`, `fuente`, `orden` | — | semillas / manual |
| `reservas` | `id PK`, `referencia UNIQUE` (`CO-0041`), `fecha` (YYYY-MM-DD), `hora` (HH:MM), `comensales`, `nombre`, `telefono`, `email`, `notas`, `estado` (`pendiente`\|`confirmada`\|`cancelada`), `ip`, `creado_en` | `referencia UNIQUE`, `idx_reservas_fecha_hora (fecha, hora)` | `POST /api/reservas` |

**Notas**:
- Booleanos se guardan como `1/0` (requisito `node:sqlite`) y la API los devuelve como `true/false`.
- `alergenos` y `turnos` son **JSON en texto**; se leen con `JSON.parse` y escriben con `JSON.stringify` (`api.js:68-75`).
- `fecha` = `AAAA-MM-DD`, `hora` = `HH:MM`; índice compuesto `(fecha, hora)` para disponibilidad.
- Consulta con DB Browser for SQLite, VS Code + extensión, o `sqlite3` CLI.
- Reset: `npm run reiniciar` (borra `server/data/` y resiembra).

---

## 4. API REST completa (verificada contra `server/api.js`)

| Método | Ruta | Query / Body | Respuesta | Auth | Código fuente |
|---|---|---|---|---|---|
| GET | `/api/salud` | — | `{ok, servicio, version, node, uptime_s}` | — | `api.js:252` |
| GET | `/api/carta` | `categoria`, `q` | `[{id,nombre,descripcion,categoria,precio,alergenos[],vegetariano,picante,destacado,disponible}]` | — | `api.js:264` |
| GET | `/api/carta/:id` | — | plato único (404 si no existe) | — | `api.js:294` |
| GET | `/api/horarios` | — | `[{dia,cerrado,turnos:[{desde,hasta}]}]` (7 filas) | — | `api.js:301` |
| GET | `/api/resenas` | — | `[{autor,fecha,estrellas,texto,fuente}]` (4 filas) | — | `api.js:306` |
| GET | `/api/disponibilidad` | `fecha` (req), `comensales` (opt) | `{fecha, cerrado, horas:[{hora, libre}], comensales?}` | — | `api.js:311` |
| POST | `/api/reservas` | `{fecha,hora,comensales,nombre,telefono,email?,notas?}` | `{ok,id,referencia,fecha,hora,comensales,correo,mensaje}` (201) | — | `api.js:353` |
| GET | `/api/reservas` | `fecha`, `q` | `{total, reservas:[{id,referencia,fecha,hora,comensales,nombre,telefono,email,notas,estado,ip,creado_en}]}` | `x-admin-token` | `api.js:516` |
| DELETE | `/api/reservas/:id` | — | `{borrados}` | `x-admin-token` | `api.js:541` |

**Códigos de error** (siempre `{ "error": "mensaje", "detalle"?: [...] }`):
- `400` validación (body o query) → `detalle[]` con campos exactos
- `401` token admin inválido / faltante
- `404` no existe (plato, reserva)
- `409` hora ocupada (`MAX_POR_HORA` alcanzado) **o** reserva duplicada (mismo tel/email/nombre/IP en misma fecha+hora)
- `429` límite de envíos por IP (`LIMITE_RESERVAS`/min)
- `500` error interno

**Validación de `/api/carta?categoria=`** (`api.js:267-272`): 400 si categoría no está en `CATEGORIAS = ['entrantes','arroces','principales','postres','vinos']`.

---

## 5. Front ↔ API (`js/main.js`)

| Función | Qué hace | Endpoint |
|---|---|---|
| `api(ruta, opts)` | Wrapper `fetch` con JSON, maneja errores, `estado:0` = sin servidor | §0 (línea 39) |
| `pintarCarta()` | Render `#listaCarta` con `tarjetaPlato()` (filtra `categoriaActiva` + `textoBusqueda`) | — |
| `pintarDestacado()` | Plato `destacado:true` → `#platoDestacado` | — |
| `pintarOpiniones(resenas)` | Render `#listaOpiniones` con avatar + estrellas | — |
| `pintarHorarios(horarios)` | Render `#tablaHorarios` (marca `hoy` y `cerrado`) | — |
| `cargarDisponibilidad()` | `GET /api/disponibilidad` → puebla `#hora` con `libre:false` disabled | `api.js:311` |
| `validarFecha/hora/comensales/…` | Validación campo a campo en `blur/change/input` | — |
| `formReserva submit` | `POST /api/reservas` → toast resultado + limpiar | `api.js:353` |
| `animarCifra()` | Contadores `#cifra1..4` al entrar en viewport | — |

**IDs HTML usados**:
- Carta: `#listaCarta`, `#buscarCarta`, `.chip[data-categoria]`, `#platoDestacado`, `#cartaVacia`
- Horarios: `#tablaHorarios`
- Opiniones: `#listaOpiniones`
- Reserva: `#formReserva`, `#fecha`, `#hora`, `#comensales`, `#nombre`, `#telefono`, `#email`, `#notas`, `#btnReserva`, `#reservaNota`, `#errFecha`, `#errHora`, `#errComensales`, `#errNombre`, `#errTelefono`, `#errEmail`
- FAQ: `.faq-pregunta`, `.faq-respuesta`

**Fallback**: si `fetch` falla con `estado === 0` → modo estático con arrays locales (`CARTA`, `HORARIOS`, `RESENAS`), `horasFijas()` para el select de hora.

---

## 6. Recetas de personalización (código)

### 6.1 Añadir / quitar plato o categoría
```js
// server/datos/semillas.js → array PLATOS
{ id: 24, nombre: 'Arroz al horno de la abuela', descripcion: '…', categoria: 'arroces', precio: 16.5,
  alergenos: ['Gluten'], vegetariano: 1, picante: 0, destacado: 0, disponible: 1, orden: 24 }
// npm run reiniciar
```
Si añades categoría nueva (ej. `enelnaranjo`):
1. `index.html` → chip `<button class="chip" data-categoria="enelnaranjo">En el naranjo</button>`
2. `server/api.js:31` → `CATEGORIAS.push('enelnaranjo')` (si no, 400 en `GET /api/carta?categoria=enelnaranjo`)
3. Marca platos con `categoria: 'enelnaranjo'`

### 6.2 Cambiar campo de reserva (ej. añadir `alergias`)
1. `index.html` → `<textarea id="alergias" name="alergias">`
2. `js/main.js` → body del POST incluye `alergias: campoAlergias.value.trim()`
3. `server/api.js` → `CREATE TABLE reservas` añade `alergias TEXT DEFAULT ''`
4. `server/api.js` → `INSERT` añade `alergias` y `aReserva()` lo devuelve
5. `server/datos/semillas.js` → `ESQUEMA` añade la columna
6. `npm run reiniciar`

### 6.3 Cambiar política de huecos (`INTERVALO_RESERVA`, `MAX_POR_HORA`, `COMENSALES_MAX`, `DIAS_MAX_RESERVA`)
```env
# .env
INTERVALO_RESERVA=60      # huecos cada 60 min (en vez de 30)
MAX_POR_HORA=6            # hasta 6 reservas por hueco
COMENSALES_MAX=16         # mesas de hasta 16
DIAS_MAX_RESERVA=120      # 4 meses por delante
```
Reinicia servidor. La disponibilidad y validación cambian al instante (se leen en cada petición).

### 6.4 Añadir estado de cancelación / panel de reservas
```js
// server/api.js dentro de registrar(api, { bd })
const VALIDOS_ESTADO = ['pendiente','confirmada','cancelada'];
api.patch('/api/reservas/:id/estado', async (ctx) => {
  if (!esAdmin(ctx)) return ctx.fallo(401, 'Token de administración no válido');
  const { estado } = await ctx.cuerpo();
  if (!VALIDOS_ESTADO.includes(estado)) return ctx.fallo(400, 'Estado no válido', [`Admitidos: ${VALIDOS_ESTADO.join(', ')}`]);
  const r = bd.ejecutar('UPDATE reservas SET estado = ? WHERE id = ?', estado, ctx.params.id);
  if (!r.changes) return ctx.fallo(404, 'No existe esa reserva');
  ctx.json({ ok: true, id: Number(ctx.params.id), estado });
});

// En GET /api/reservas, filtra por estado:
const estado = String(ctx.query.estado || '').trim();
if (estado) { sql.push('WHERE estado = ?'); params.push(estado); }
```
Una reserva **cancelada deja de contar** para disponibilidad (la consulta `reservasPorHora` ya excluye `estado='cancelado'`).

### 6.5 Activar correo real (Resend o SMTP)
```env
# .env - Opción A: Resend
RESEND_API_KEY=re_xxx
EMAIL_DE="Casa Olivera <hola@tudominio.com>"
# Opción B: SMTP (requiere npm install nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PUERTO=587
SMTP_USUARIO=tu@gmail.com
SMTP_CLAVE=contraseña-app-gmail
```
Con nada configurado → `correo: "demo"`. Con correo → `correo: "enviado"` y llegan 2 mails (cliente + aviso interno).

---

## 7. Pruebas (verificar.ps1 puerto 3107)

El repo incluye `verificar.ps1` en la raíz. Para 07-restaurante:

```powershell
# Desde C:\Users\alors\Downloads\plantillas-web\
.\verificar.ps1 -Puerto 3007 -RutaBase "07-restaurante"

# Qué hace:
# 1. npm start en background
# 2. curl /api/salud → 200
# 3. curl /api/carta → 23 platos
# 4. curl /api/horarios → 7 días
# 5. curl /api/resenas → 4 opiniones
# 6. curl /api/disponibilidad?fecha=… → {cerrado:false, horas:[{hora,libre}]}
# 7. POST /api/reservas válida → 201 CO-0041
# 8. POST duplicada (mismo tel) → 409
# 9. POST hora llena (4 reservas) → 409
# 10. POST spam (6 seguidas) → 429
# 11. GET /api/reservas con x-admin-token → bandeja
# 12. DELETE /api/reservas/:id → borrados
# 13. npm run reiniciar → BD limpia
# 14. Mata proceso servidor
```

**Curl con body en fichero temporal (PowerShell)**:
```powershell
[System.IO.File]::WriteAllText("$env:TEMP\reserva.json", @'
{
  "fecha": "2026-10-06",
  "hora": "20:30",
  "comensales": 4,
  "nombre": "Marta Sanchís",
  "telefono": "612 34 56 78",
  "email": "marta@correo.com",
  "notas": "Mesa junto a la ventana"
}
'@)
curl.exe -X POST http://localhost:3007/api/reservas -H "Content-Type: application/json" --data-binary "@$env:TEMP\reserva.json"
```

---

## 8. Seguridad (honestidad + RGPD)

| Qué **NO** tiene la plantilla | Qué **SÍ** tiene |
|---|---|
| Área privada de usuarios | Token admin único (`ADMIN_TOKEN`) para bandeja |
| Bcrypt / JWT | Rate limit por IP en memoria (`LIMITE_RESERVAS=5/min`) |
| HTTPS obligatorio | Validación exhaustiva campo a campo (400 con `detalle[]`) |
| Stripe / señales | Anti-duplicados (tel/email/nombre/IP en misma fecha+hora) |
| Limpieza automática RGPD | Datos personales en `reservas` (nombre, teléfono, email, IP) |

**Antes de publicar** (README §11):
- Cambia `ADMIN_TOKEN` por clave **larga y aleatoria**.
- `.env` fuera de git (`.gitignore`).
- Solo HTTPS (proxy Caddy/Nginx + Let's Encrypt).
- Rate limit en proxy/CDN (el de memoria no sirve en multi-instancia).
- `CORS_ORIGEN` concreto, nunca `*`.
- **RGPD**: informa en formulario de finalidad y plazo de conservación de datos personales; programa limpieza periódica de `reservas` (ej. > 2 años).
- No expongas `ADMIN_TOKEN` ni IP del cliente en frontend.

---

## 9. Variables de entorno (`.env` real)

| Variable | Valor demo | Uso en código |
|---|---|---|
| `PORT` | `3007` | `server.js:45` `entero(process.env.PORT, 3007)` |
| `HOST` | `127.0.0.1` | `server.js:46` |
| `ADMIN_TOKEN` | `demo-token-restaurante-7a3f91c258` | `api.js:52` |
| `LIMITE_RESERVAS` | `5` | `api.js:241` |
| `MAX_POR_HORA` | `4` | `api.js:248, 346, 425` |
| `INTERVALO_RESERVA` | `30` | `api.js:247, 134, 392` |
| `COMENSALES_MAX` | `12` | `api.js:246, 403` |
| `DIAS_MAX_RESERVA` | `90` | `api.js:246, 320, 377` |
| `CONTACTO_DESTINO` | `reservas@casaolivera.es` | `api.js:486` |
| `EMAIL_RESERVAS` | `reservas@casaolivera.es` | `api.js:486` |
| `RESEND_API_KEY` | *(vacío)* | `email.js:21` |
| `EMAIL_DE` | *(vacío)* | `email.js:22` |
| `SMTP_*` | *(vacíos)* | `email.js:46-66` |
| `CORS` | `0` | `router.js:50` |

---

## 10. Imprecisiones en README origen (para que lo sepas)

1. **§2 Arranque**: dice `http://localhost:3007` ✅ coincide con `.env` `PORT=3007`.
2. **§3 Variables**: `SITE_URL` marcada "no" obligatoria pero no se usa en código → debería ser "opcional" o quitarla.
3. **§6.4 Cambiar turnos**: ejemplo SQL usa `turnos = '[{"desde":"13:00","hasta":"16:00"}]'` pero el JSON válido requiere comillas dobles escapadas o parametrización → mejor `JSON.stringify` desde JS.
4. **§6.6 Panel de reservas**: sugiere `PATCH /api/reservas/:id/estado` pero ese endpoint **no existe** en la plantilla (es una receta, no código real).
5. **§7 Qué se guarda**: dice `reservas.estado` por defecto `pendiente` ✅, pero no menciona que la disponibilidad ya excluye `cancelada` (sí lo hace `reservasPorHora` en `api.js:158`).
6. **§10 Problemas**: "Un día cerrado aparece con horas" → solución correcta pero faltaría mencionar que `horarioDeFecha` devuelve `null` si no hay fila en `horarios` para ese día, y eso también provoca `cerrado:true`.

---

*Generado leyendo: `server/api.js`, `server/server.js`, `server/datos/semillas.js`, `server/lib/*.js`, `js/main.js`, `index.html`, `.env`, `package.json`, `README.md`.*