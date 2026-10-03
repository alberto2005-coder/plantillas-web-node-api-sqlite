# 07 · Restaurante (Casa Olivera) — plantilla con servidor, API y base de datos

Plantilla de **restaurante** (HTML5 + CSS3 + JavaScript vanilla) que ya incluye
**servidor Node, API REST y base de datos SQLite**: la carta, los horarios y las
opiniones se pintan desde la API, y el formulario de reserva guarda de verdad la
mesa, comprueba los huecos libres y envía la confirmación.

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
| Base de datos | ✅ SQLite (`node:sqlite`) | `server/data/restaurante.db` |
| Carta con filtros y buscador | ✅ `GET /api/carta` | `js/main.js` (repinta desde la API) |
| Horarios y opiniones | ✅ `GET /api/horarios`, `/api/resenas` | `server/datos/semillas.js` |
| Reservas de mesa reales | ✅ `POST /api/reservas` | `server/api.js` + `js/main.js` |
| Disponibilidad por huecos | ✅ `GET /api/disponibilidad` | turnos cada 30 min |
| Protección anti-spam | ✅ límite por IP | `server/lib/limitador.js` |
| Panel de reservas | ⚪ API con token | `GET /api/reservas` |
| Envío de confirmación por correo | ⚪ opcional | `.env` → Resend o SMTP |
| Librerías externas | ⚪ ninguna obligatoria | ver §9 |
| HTTPS, dominio, despliegue | 📄 documentado | §8 |

**Reglas de la casa (configurables en `.env`)**: mesas de hasta **12
comensales**, huecos cada **30 minutos**, máximo **4 reservas por hora** y
reservas hasta **90 días** por delante. Lunes cerrado (viernes y sábados de
noche hasta tarde).

---

## 2. Arranque rápido

**Requisito: Node 22.13 o superior** ([nodejs.org](https://nodejs.org)). Compruébalo con `node -v`.

```bash
# Opción A — con servidor (recomendada): API + web en el mismo puerto
npm start
# → abre http://localhost:3007

# Opción B — sin servidor: doble clic en index.html
# (la carta, los horarios y las opiniones salen de los arrays de js/main.js
#  y la reserva responde en «modo demo»)

# Volver a la base de datos de ejemplo (borra las reservas guardadas)
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
| `PORT` | no (3007) | Puerto del servidor |
| `HOST` | no (127.0.0.1) | IP de escucha. Usa `0.0.0.0` en contenedores/servidor |
| `SITE_URL` | no | URL pública (se usa en correos y enlaces) |
| `DB_FILE` | no | Ruta del fichero SQLite (se crea solo) |
| `ADMIN_TOKEN` | sí para admin | Clave de la bandeja de reservas (`x-admin-token`) |
| **`LIMITE_RESERVAS`** | no (5) | **Envíos de reserva por IP y minuto → si lo superas, 429** |
| **`MAX_POR_HORA`** | no (4) | **Reservas máximas por hora; al llegarlo, el hueco pasa a `libre:false` (y un POST da 409)** |
| **`INTERVALO_RESERVA`** | no (30) | **Minutos entre hueco y hueco de reserva** |
| **`COMENSALES_MAX`** | no (12) | **Máximo de comensales por reserva (1…N)** |
| **`DIAS_MAX_RESERVA`** | no (90) | **Días máximos por delante para reservar** |
| `CONTACTO_DESTINO` | no | Correo del restaurante que recibe el aviso de cada reserva |
| `EMAIL_RESERVAS` | no | Bandeja interna de avisos (si está vacía se usa `CONTACTO_DESTINO`) |
| `RESEND_API_KEY` | opcional | Activa la confirmación real vía [Resend](https://resend.com) |
| `EMAIL_DE` | opcional | Remitente visible (`Casa Olivera <hola@x.com>`) |
| `SMTP_HOST` / `SMTP_PUERTO` / `SMTP_USUARIO` / `SMTP_CLAVE` | opcional | Envío por SMTP (requiere `npm install nodemailer`) |
| `CORS` / `CORS_ORIGEN` | no (`0`) | Para consumir la API desde otro dominio |

Cambios en `.env`: **reinicia el servidor** (`Ctrl + C` y `npm start`).

---

## 4. API REST

Todas las respuestas son JSON. Las de escritura aceptan `Content-Type: application/json`.

| Método | Ruta | Body | Respuesta | Auth |
|---|---|---|---|---|
| GET | `/api/salud` | – | `{ok, servicio, version, node, uptime_s}` | no |
| GET | `/api/carta?categoria=&q=` | – | **array** de platos (23) | no |
| GET | `/api/carta/:id` | – | un plato (404 si no existe) | no |
| GET | `/api/horarios` | – | array de 7 días | no |
| GET | `/api/resenas` | – | array de 4 opiniones | no |
| GET | `/api/disponibilidad?fecha=&comensales=` | – | `{fecha, cerrado, horas:[{hora, libre}]}` | no |
| POST | `/api/reservas` | `{fecha, hora, comensales, nombre, telefono, email?, notas?}` | `{ok, id, referencia, fecha, hora, comensales, correo, mensaje}` (**201**) | no |
| GET | `/api/reservas?fecha=&q=` | – | `{total, reservas}` | `x-admin-token` |
| DELETE | `/api/reservas/:id` | – | `{borrados}` | `x-admin-token` |

**Códigos**: `200` ok · `201` reserva creada · `400` validación (viene `detalle[]`)
· `401` token · `404` no existe · `409` hora ocupada · `429` límite de envíos ·
`500` servidor. Los errores son siempre `{ "error": "mensaje" }`.

**Ejemplos con curl** (PowerShell: guarda el body en un fichero y usa
`--data-binary "@fichero.json"`; `Set-Content` de Windows PowerShell añade BOM,
por eso usamos `WriteAllText`):

```powershell
# 1) Body de la reserva (UTF-8 sin BOM)
[System.IO.File]::WriteAllText("$PWD\reserva.json", @'
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

curl.exe http://localhost:3007/api/salud

curl.exe "http://localhost:3007/api/carta?categoria=arroces"
curl.exe "http://localhost:3007/api/carta?q=fideua"        # busca sin tildes
curl.exe http://localhost:3007/api/carta/1

curl.exe http://localhost:3007/api/horarios
curl.exe http://localhost:3007/api/resenas
curl.exe "http://localhost:3007/api/disponibilidad?fecha=2026-10-06&comensales=2"

curl.exe -X POST http://localhost:3007/api/reservas `
  -H "Content-Type: application/json" `
  --data-binary "@reserva.json"

curl.exe -H "x-admin-token: demo-token-restaurante-7a3f91c258" `
  "http://localhost:3007/api/reservas?fecha=2026-10-06"

curl.exe -X DELETE -H "x-admin-token: demo-token-restaurante-7a3f91c258" `
  http://localhost:3007/api/reservas/1
```

Comportamiento de las reservas:

- **`GET /api/disponibilidad`** genera los huecos de cada turno cada
  `INTERVALO_RESERVA` minutos (la hora de inicio debe ser anterior al fin del
  turno; `20:00–00:00` se lee como `20:00–24:00`). Un hueco sale
  `libre:false` cuando ya tiene `MAX_POR_HORA` reservas. Si el día está
  cerrado devuelve `{cerrado:true, horas:[]}`.
- **`POST /api/reservas`** valida campo a campo (400 + `detalle[]`), aplica el
  límite por IP (429), **vuelve a comprobar la disponibilidad en ese instante**
  (409 si el hueco está lleno o si esa misma reserva ya existe) y guarda la
  fila con una referencia correlativa `CO-0041`, `CO-0042`…
- **`correo`** vale `"demo"` mientras no configures Resend o SMTP; con correo
  configurado pasa a `"enviado"`.

---

## 5. Estructura

```
07-restaurante/
├── index.html            ← contenido y estructura (en español)
├── css/styles.css        ← paleta, tipografías y componentes
├── js/main.js            ← tema, menú, carta, opiniones, reserva y cliente API
├── .env                  ← configuración local (no se sube a git)
├── .env.example          ← plantilla comentada de variables
├── .gitignore            ← ignora .env y server/data/
├── package.json          ← scripts npm
├── README.md             ← este documento
├── docs/
│   ├── GUIA-USUARIO.md   ← arranque, vistas, datos, recetas, checklist, fallos
│   └── GUIA-DESARROLLADOR.md ← mapa, ciclo petición, BD, API, front, recetas, pruebas, seguridad
└── server/
    ├── server.js         ← arranque: .env → BD → API → estáticos
    ├── api.js            ← rutas de la API (aquí se añaden endpoints)
    ├── reset.js          ← `npm run reiniciar`
    ├── datos/semillas.js ← esquema SQL + carta + horarios + reseñas
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

### 6.1 Cambiar textos, color y tipografía
- **Textos e imágenes**: todo en `index.html`.
- **Color principal**: `css/styles.css` → bloque `:root` → `--color-primary`.
- **Tipografías**: se cargan de Google Fonts en el `<head>`; cambia el `<link>` y
  luego `--font-heading` / `--font-body` en el CSS.

### 6.2 Añadir un plato
1. **Rápido (solo HTML)**: la web funciona sin servidor y pinta el array
   `CARTA` de `js/main.js`; añade un objeto con su `categoria` y listo.
2. **Completo (API)**: añade una fila en `server/datos/semillas.js` → `PLATOS`
   y ejecuta `npm run reiniciar`, o insértalo sin reiniciar:
   ```sql
   INSERT INTO platos (nombre, descripcion, categoria, precio, alergenos,
                       vegetariano, picante, destacado, disponible, orden)
   VALUES ('Arroz al horno de la abuela', 'Bomba de la Albufera, garrofó, tomate y uva pasas.',
           'arroces', 16.5, '["Gluten"]', 1, 0, 0, 1, 24);
   ```
   Los booleanos van como `1/0` y los alérgenos como **JSON**. `GET /api/carta`
   devolverá 24 platos y la web los repintará sola.
3. Para quitarlo del menú sin borrarlo: `disponible = 0` (aparece con el badge
   «Agotado hoy»).

### 6.3 Añadir una categoría nueva (p. ej. `enelnaranjo`)
1. `index.html`, en la barra de filtros:
   ```html
   <button class="chip" data-categoria="enelnaranjo" aria-pressed="false">En el naranjo</button>
   ```
2. `server/api.js`, en la constante `CATEGORIAS`:
   ```js
   const CATEGORIAS = ['entrantes', 'arroces', 'principales', 'postres', 'vinos', 'enelnaranjo'];
   ```
   (si no lo añades, `GET /api/carta?categoria=enelnaranjo` responde 400).
3. Marca los platos con `categoria: 'enelnaranjo'`.

### 6.4 Cambiar turnos y días de cierre
- **Rápido**: `server/datos/semillas.js` → array `HORARIOS` y `npm run reiniciar`.
  Ejemplo: cerrar los martes y alargar la noche del viernes:
  ```js
  { dia: 'martes', cerrado: true, turnos: [] },
  { dia: 'viernes', cerrado: false, turnos: [{ desde: '13:00', hasta: '15:30' }, { desde: '20:00', hasta: '01:00' }] },
  ```
- **Sin reiniciar** (ya hay reservas guardadas):
  ```sql
  UPDATE horarios SET cerrado = 1, turnos = '[]' WHERE dia = 'martes';
  UPDATE horarios SET turnos = '[{"desde":"13:00","hasta":"16:00"},{"desde":"20:00","hasta":"00:30"}]'
    WHERE dia = 'viernes';
  ```
  Los turnos se leen en cada petición, así que la disponibilidad y la validación
  del POST cambian al instante.

### 6.5 Subir el máximo de reservas por hora
`.env`:
```env
MAX_POR_HORA=6
```
Reinicia. Mientras una hora no llegue a 6 reservas seguirá saliendo
`libre:true` en `GET /api/disponibilidad`; al llegar, el hueco se marca
`ocupada` y `POST /api/reservas` responde **409**. Si prefieres huecos más
grandes, sube también el intervalo (`INTERVALO_RESERVA=60`).

### 6.6 Añadir el estado de cancelación (o un panel de reservas)
La tabla `reservas` ya tiene la columna `estado` (`pendiente` por defecto).
Para cancelar desde la API añade esto en `server/api.js`:

```js
/** Cambia el estado de una reserva (admin) */
api.patch('/api/reservas/:id/estado', async (ctx) => {
  if (!esAdmin(ctx)) return ctx.fallo(401, 'Token de administración no válido');
  const { estado } = await ctx.cuerpo();
  const VALIDOS = ['pendiente', 'confirmada', 'cancelada'];
  if (!VALIDOS.includes(estado)) {
    return ctx.fallo(400, 'Estado no válido', [`Estados admitidos: ${VALIDOS.join(', ')}.`]);
  }
  const r = bd.ejecutar('UPDATE reservas SET estado = ? WHERE id = ?', estado, ctx.params.id);
  if (!r.changes) return ctx.fallo(404, 'No existe esa reserva');
  ctx.json({ ok: true, id: Number(ctx.params.id), estado });
});
```

Y en `server/api.js`, dentro de `GET /api/reservas`, filtra por estado:

```js
const estado = String(ctx.query.estado || '').trim();
if (estado) { sql.push('WHERE estado = ?'); params.push(estado); }
```

Una reserva **cancelada deja de contar** para la disponibilidad (la consulta ya
excluye `estado = 'cancelada'`), así que el hueco se libera solo. Con eso
montas un panel sencillo: `GET /api/reservas?estado=pendiente` + botones que
hagan `PATCH /api/reservas/7/estado` con la cabecera `x-admin-token`.

### 6.7 Añadir una API nueva
En `server/api.js`, dentro de `registrar(api, { bd })`:

```js
api.get('/api/eventos', (ctx) => {
  ctx.json(bd.todos('SELECT * FROM eventos ORDER BY fecha ASC'));
});

api.post('/api/eventos', async (ctx) => {
  if (!esAdmin(ctx)) return ctx.fallo(401, 'Token no válido');
  const d = await ctx.cuerpo();
  if (!d.titulo) return ctx.fallo(400, 'Falta el título', ['Escribe un título.']);
  const r = bd.ejecutar('INSERT INTO eventos (titulo, fecha) VALUES (?, ?)', d.titulo, d.fecha);
  ctx.json({ ok: true, id: Number(r.lastInsertRowid) }, 201);
});
```

Crea la tabla dentro de `ESQUEMA` (en `server/datos/semillas.js`). Prueba:

```powershell
curl.exe -X POST http://localhost:3007/api/eventos -H "Content-Type: application/json" --data-binary "@evento.json"
```

### 6.8 Activar el correo de confirmación
- **Resend (más fácil)**: cuenta gratis → API key → en `.env`:
  `RESEND_API_KEY=re_xxx` y `EMAIL_DE="Casa Olivera <hola@tudominio.com>"`.
  Verifica tu dominio en Resend.
- **SMTP (Gmail, Outlook, Mailgun)**: `npm install nodemailer` y en `.env`:
  `SMTP_HOST=smtp.gmail.com`, `SMTP_PUERTO=587`, `SMTP_USUARIO=...`,
  `SMTP_CLAVE=...` (contraseña de aplicación de Gmail).
- Con nada configurado, la reserva **se guarda igualmente** y la API responde
  `correo: "demo"`. Con correo configurado responde `correo: "enviado"` y llegan
  dos mensajes: la confirmación al cliente (`EMAIL_RESERVAS`/`CONTACTO_DESTINO`
  recibe el aviso interno).

### 6.9 Añadir una sección nueva al HTML
1. Copia un bloque `<section id="carta">` en `index.html` y cambia `id`, título
   y contenido.
2. Añade su enlace en el menú `#navEnlaces` (`<a href="#nueva">Nueva</a>`).
3. Si necesita datos de la API, pídelos en la sección 13 de `js/main.js`:
   ```js
   api('/api/eventos').then(function (filas) {
     if (!Array.isArray(filas) || !filas.length) return;
     pintarEventos(filas);
   }).catch(function () { /* sin servidor: se queda la versión estática */ });
   ```
4. Los efectos (`.animar`, navbar activa) se aplican solos a los elementos
   nuevos que cumplan las clases.

### 6.10 Quitar secciones
Borra el bloque `<section>` correspondiente en `index.html` y su enlace del menú
`#navEnlaces`. El JS es defensivo: si `document.getElementById(...` devuelve
`null`, no falla (lo mismo con `#listaCarta`, `#tablaHorarios`,
`#formReserva`…). Puedes borrar toda la sección de reserva y la web seguirá
mostrando carta, horarios y opiniones.

### 6.11 Cambiar puerto o ponerla en internet (resumen)
`.env` → `PORT=8080`. En un servidor público: `HOST=0.0.0.0`,
`SITE_URL=https://tudominio.com` y un proxy inverso (Caddy/Nginx) con HTTPS
delante. El detalle completo está en §8.

---

## 7. Qué se guarda en la base de datos

| Tabla | Columnas | Quién la escribe |
|---|---|---|
| `platos` | id, nombre, descripcion, categoria, precio REAL, alergenos (JSON), vegetariano, picante, destacado, disponible, orden | semillas / tú |
| `horarios` | id, dia UNIQUE, cerrado, turnos (JSON `[{desde,hasta}]`) | semillas / tú |
| `resenas` | id, autor, fecha, estrellas, texto, fuente, orden | semillas / tú |
| `reservas` | id, referencia UNIQUE (`CO-0041`), fecha, hora, comensales, nombre, telefono, email, notas, estado, ip, creado_en | `POST /api/reservas` |

Notas:
- Los booleanos se guardan como `1/0` (requisito de `node:sqlite`) y la API los
  devuelve como `true/false`.
- `alergenos` y `turnos` son **JSON en texto**; se leen con `JSON.parse` y se
  escriben con `JSON.stringify`.
- `fecha` es `AAAA-MM-DD` y `hora` es `HH:MM`; hay un índice sobre
  `(fecha, hora)` porque es lo que consulta la disponibilidad.
- Consulta las reservas con el token (§4) o con cualquier cliente SQLite
  (DB Browser for SQLite, VS Code con extensión, `sqlite3` CLI).
- Para volver al estado de fábrica: `npm run reiniciar` (borra `server/data/`).

---

## 8. Despliegue

1. Sube la carpeta a tu servidor/VPS o a un servicio Node (Railway, Render, Fly.io…).
2. Variables de entorno en el panel: `PORT` (suele darlo la plataforma),
   `HOST=0.0.0.0`, `ADMIN_TOKEN` (uno largo), `SITE_URL=https://tudominio.com`,
   `CONTACTO_DESTINO` / `EMAIL_RESERVAS` con el correo real de la casa,
   `MAX_POR_HORA` y `COMENSALES_MAX` según tu salón, `RESEND_API_KEY`…
3. Comando de arranque: `node server/server.js` (el `PORT` llega del entorno).
4. La BD SQLite se crea sola; para que sobreviva a despliegues, monta un
   **volumen** en `server/data/` o cambia `DB_FILE` a una ruta persistente.
5. Activa HTTPS (la plataforma o Caddy/Let's Encrypt) y no expongas
   `ADMIN_TOKEN` en el navegador.
6. Si la web y la API van en dominios distintos, activa `CORS=1` y
   `CORS_ORIGEN=https://tudominio.com`, y cambia `API_BASE` en `js/main.js`.

---

## 9. Librerías opcionales (si quieres ir más allá)

| Librería | Para qué | Cuándo |
|---|---|---|
| `nodemailer` | enviar correos por SMTP | si activas `SMTP_HOST` |
| `express` | servidor web más amplio | si la API crece mucho |
| `better-sqlite3` | SQLite alternativa a `node:sqlite` | si usas Node < 22.13 |
| `zod` / `joi` | validación de datos declarativa | muchos endpoints |
| `bcrypt` + `jsonwebtoken` | usuarios y login reales | si añades área privada |
| `stripe` | pagos de señales al reservar | si cobras por adelantado |
| `nodemon` | reinicio automático | ya cubierto con `npm run dev` |

---

## 10. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `No se pudo cargar "node:sqlite"` | Instala Node ≥ 22.13 y comprueba con `node -v` |
| `EADDRINUSE: port 3007` | Cambia `PORT` en `.env` o cierra el proceso anterior |
| El formulario dice «modo demo» | No hay servidor: ejecuta `npm start` y abre `http://localhost:3007` |
| **`409 Esa hora ya no está disponible`** | Otro cliente (o tú mismo) ya tiene esa fecha y hora ocupada: la disponibilidad se re comprueba en el instante del envío. Elige otra hora — el desplegable ya te la muestra como «(ocupada)» cuando `libre:false` |
| **`429 Demasiados reservas`** | `LIMITE_RESERVAS` (5) por IP y minuto: espera 60 segundos o sube el valor en `.env`. Las peticiones con errores de validación (400) **no** consumen cuota |
| **`400 Revisa los datos de la reserva`** | Mira el array `detalle[]` de la respuesta: te dice exactamente qué campo falla (fecha, hora fuera de turno, comensales, teléfono…) |
| `401 Token no válido` | Usa el `ADMIN_TOKEN` del `.env` en el header `x-admin-token` |
| `404 No existe esa reserva` | El id ya fue borrado; vuelve a pedir `GET /api/reservas` |
| La carta no cambia al editar `semillas.js` | Las semillas solo entran con la BD vacía: `npm run reiniciar` |
| Los cambios del `.env` no hacen efecto | Reinicia el servidor |
| Un día cerrado aparece con horas | Revisa `horarios.cerrado` y los `turnos` de ese día |
| El navegador cachea CSS/JS antiguos | Ctrl + F5 (el servidor manda `no-cache` en HTML) |

---

## 11. Seguridad (antes de publicar)

Checklist:

- [ ] Cambia `ADMIN_TOKEN` por una clave larga y aleatoria.
- [ ] Mantén `.env` fuera de git (ya está en `.gitignore`).
- [ ] El servidor **nunca** sirve `.env`, `.env.example`, `*.md` ni la carpeta
      `server/` (devuelve 403).
- [ ] Añade HTTPS (obligatorio para datos de contacto).
- [ ] Revisa `LIMITE_RESERVAS` (anti-spam) y `MAX_POR_HORA` (cuota de mesas).
- [ ] El límite por IP está en memoria: para múltiples servidores usa Redis o
      el límite de tu proxy/CDN.
- [ ] No expongas la IP del cliente ni el `ADMIN_TOKEN` en el front-end.
- [ ] Si habilitas CORS, pon un origen concreto en `CORS_ORIGEN` (nunca `*` en producción).
- [ ] Haz copia de `server/data/restaurante.db` con regularidad.
- [ ] Si guardas datos personales (nombre, teléfono, correo), informa de la
      finalidad y del plazo de conservación (RGPD) y limpia la tabla de vez en cuando.

---

## 12. Licencia y personalización

Libre para usar en tus proyectos. Cambia textos, colores, platos, horarios,
mesas y endpoints a tu gusto: la estructura está pensada para copiar la carpeta
y hacerla tuya.

La licencia completa está en [`../LICENSE`](../LICENSE) (MIT — Copyright (c) 2026 Alberto Ortiz).

---

## 13. Recorrido del código

1. **`server/server.js`** arranca: lee `.env`, abre (y siembra) la BD, monta el
   enrutador con `server/api.js` y sirve los estáticos de la raíz. Todo en el
   mismo puerto (`3007`).
2. **`server/lib/`** son piezas reutilizables: `env.js` (lector de `.env`),
   `db.js` (SQLite nativo), `http.js` (JSON + estáticos protegidos),
   `router.js` (rutas `GET/POST/…`), `limitador.js` (cuota por IP) y
   `email.js` (Resend/SMTP, opcional).
3. **`server/api.js`** es el corazón: `GET /api/carta` filtra por categoría y
   búsqueda sin tildes, `GET /api/disponibilidad` traduce los turnos del día en
   huecos de 30 minutos y los cruza con las reservas existentes, y
   `POST /api/reservas` valida → limita → re comprueba → guarda → avisa por
   correo → responde `201` con la referencia `CO-00xx`.
4. **`server/datos/semillas.js`** documenta las 4 tablas y arranca con la carta
   real (23 platos), los 7 días de horario y las 4 opiniones.
5. **`js/main.js`** es el cliente: si la API responde, sus arrays
   (`CARTA`, `HORARIOS`, `RESENAS`) se sustituyen por los de la BD; si no
   responde, la web se queda en modo estático y sigue viéndose igual.
6. **`index.html` + `css/styles.css`** son la parte visual: textos, colores y
   secciones se cambian ahí sin tocar JavaScript.

Libre para usar en tus proyectos. Cambia textos, colores, carta, turnos y
endpoints a tu gusto: la estructura está pensada para copiar la carpeta y hacerla
tuya.
