# 07-restaurante — Guía de usuario (Casa Olivera)

> **Para quién es esta guía**: propietarios, gestores o camareros del restaurante que necesitan ver reservas, comprobar disponibilidad y gestionar la carta sin programar.

> **Documentación relacionada**: [Guía de desarrollador](GUIA-DESARROLLADOR.md) · [README principal](../README.md) · [Guía global de despliegue](../docs/GUIA-DESPLIEGUE.md) · [Guía global de seguridad](../docs/GUIA-SEGURIDAD.md)

---

## 1. Arranque rápido

| Método | Comando / Acción | URL resultado |
|---|---|---|
| **Con servidor (recomendado)** | `npm start` | `http://localhost:3007` |
| **Sin servidor (modo demo)** | Doble clic en `index.html` | `file:///…/07-restaurante/index.html` |
| **Resetear BD a datos de ejemplo** | `npm run reiniciar` | — |
| **Modo desarrollo (auto-recarga)** | `npm run dev` | `http://localhost:3007` |

**Requisito**: Node 22.13+ (`node -v` para comprobar).

El puerto real sale de `.env` (`PORT=3007`). Si cambias `.env`, **reinicia** el servidor (`Ctrl+C` → `npm start`).

---

## 2. Recorrido por la web (IDs reales del HTML)

| Sección | `id` en `index.html` | Qué ves / haces |
|---|---|---|
| **Hero / Inicio** | `#inicio` | Título, claim, botones a Carta y Reservar, 3 datos (valoración, año, estado abierto). |
| **Cifras** | `#cifras` | 4 contadores animados (años, platos/año, productores, comensales/año). |
| **Carta** | `#carta` | Chips de categoría (`data-categoria`: `todos`, `entrantes`, `arroces`, `principales`, `postres`, `vinos`), buscador `#buscarCarta`, plato destacado `#platoDestacado`, rejilla `#listaCarta` (23 platos con badges: vegetariano, picante, destacado, alérgenos, agotado). |
| **Reservar** | `#reservar` | Formulario `#formReserva`: fecha `#fecha` (min=hoy, max=+90 días), hora `#hora` (se carga vía `GET /api/disponibilidad`), comensales `#comensales` (1–12), nombre `#nombre`, teléfono `#telefono`, email `#email` (opcional), notas `#notas`. Botón `#btnReserva`. Reglas de la casa en `<aside class="reglas">`. |
| **Nosotros** | `#nosotros` | Historia, 3 puntos clave (kilómetro cero, menú degustación, bodega). |
| **Opiniones** | `#opiniones` | Rejilla `#listaOpiniones` (4 reseñas con avatar, autor, fecha, estrellas, fuente). |
| **FAQ** | `#faq` | 5 acordeones (`.faq-pregunta` + `.faq-respuesta`), uno solo abierto a la vez. |
| **Contacto** | `#contacto` | Dirección, teléfono, email, tabla horarios `#tablaHorarios` (pintada desde API/local), mapa SVG decorativo. |

---

## 3. Dónde ver / tocar los datos (sin programar)

### 3.1 Base de datos SQLite
```bash
# Abrir con DB Browser for SQLite (gratuito)
# Archivo: 07-restaurante/server/data/restaurante.db

# O desde terminal:
sqlite3 server/data/restaurante.db ".tables"
sqlite3 server/data/restaurante.db "SELECT * FROM platos ORDER BY orden LIMIT 5;"
sqlite3 server/data/restaurante.db "SELECT * FROM horarios;"
sqlite3 server/data/restaurante.db "SELECT * FROM resenas ORDER BY orden;"
sqlite3 server/data/restaurante.db "SELECT id, referencia, fecha, hora, comensales, nombre, estado FROM reservas ORDER BY fecha DESC, hora ASC;"
```

### 3.2 API con curl (PowerShell: guarda body en fichero)
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

# Salud
curl.exe http://localhost:3007/api/salud

# Carta (23 platos)
curl.exe "http://localhost:3007/api/carta?categoria=arroces"
curl.exe "http://localhost:3007/api/carta?q=fideua"        # busca sin tildes
curl.exe http://localhost:3007/api/carta/1

# Horarios y opiniones
curl.exe http://localhost:3007/api/horarios
curl.exe http://localhost:3007/api/resenas

# Disponibilidad (huecos libres de un día)
curl.exe "http://localhost:3007/api/disponibilidad?fecha=2026-10-06&comensales=2"

# Crear reserva (devuelve 201 con referencia CO-0041…)
curl.exe -X POST http://localhost:3007/api/reservas `
  -H "Content-Type: application/json" `
  --data-binary "@reserva.json"

# Bandeja de reservas (requiere x-admin-token del .env)
curl.exe -H "x-admin-token: demo-token-restaurante-7a3f91c258" `
  "http://localhost:3007/api/reservas?fecha=2026-10-06"

# Borrar reserva (admin)
curl.exe -X DELETE -H "x-admin-token: demo-token-restaurante-7a3f91c258" `
  http://localhost:3007/api/reservas/1
```

**Variables del `.env` usadas aquí**:
- `ADMIN_TOKEN=demo-token-restaurante-7a3f91c258`
- `MAX_POR_HORA=4`
- `INTERVALO_RESERVA=30`
- `COMENSALES_MAX=12`
- `DIAS_MAX_RESERVA=90`
- `LIMITE_RESERVAS=5`

---

## 4. Cambios sin programar (4 recetas)

| Qué cambias | Dónde | Ejemplo |
|---|---|---|
| **Precio de un plato** | `server/datos/semillas.js` → array `PLATOS` → `precio` | `{ ..., precio: 17.5, ... }` + `npm run reiniciar` |
| **Horario de un día** | `server/datos/semillas.js` → array `HORARIOS` | `{ dia: 'martes', cerrado: true, turnos: [] }` + `npm run reiniciar` |
| **Máximo de reservas por hora** | `.env` → `MAX_POR_HORA` | `MAX_POR_HORA=6` (reinicia servidor) |
| **Teléfono / correo de avisos** | `.env` → `CONTACTO_DESTINO`, `EMAIL_RESERVAS` | `CONTACTO_DESTINO=reservas@midominio.es` (reinicia servidor) |

> **Nota**: tras editar `.env` → `Ctrl+C` + `npm start`. Tras editar `semillas.js` → `npm run reiniciar`.

---

## 5. Checklist de verificación (8–10 clics)

1. ✅ `npm start` → abre `http://localhost:3007` → Hero + cifras animadas al hacer scroll.
2. ✅ Click «Carta» en navbar → chips de categoría filtran → buscador `#buscarCarta` escribe `fideua` → aparece Fideuà.
3. ✅ Click «Reservar» → elige **fecha con servicio** (ej. martes 2026-10-06) → se cargan horas en `#hora` (algunas `(ocupada)` si `MAX_POR_HORA` alcanzado).
4. ✅ Elige **fecha en día cerrado** (lunes) → `#hora` muestra «Cerrado ese día — elige otra fecha…» y bloquea envío.
5. ✅ Rellena formulario válido → «Confirmar reserva» → **201** → toast «✓ Reserva solicitada. Referencia: CO-0041».
6. ✅ Intenta **misma fecha + hora + teléfono** → **409** «Ya hay una reserva para las 20:30 del 2026-10-06 (CO-0041)».
7. ✅ Intenta **hora ya llena** (4 reservas en ese hueco) → **409** «Esa hora ya no está disponible. La 20:30 del 2026-10-06 ya tiene 4 reservas».
8. ✅ Spam: envía 6 reservas seguidas desde misma IP → **429** «Demasiadas reservas desde esta conexión».
9. ✅ `curl -H "x-admin-token: ..." /api/reservas` → ve la bandeja con tus reservas de prueba.
10. ✅ `npm run reiniciar` → BD vuelve a semillas (23 platos, 7 horarios, 4 reseñas, 0 reservas).

---

## 6. Fallos típicos + §10 del README

| Síntoma | Causa | Solución |
|---|---|---|
| `No se pudo cargar "node:sqlite"` | Node < 22.13 | Actualiza Node (`node -v`). |
| `EADDRINUSE: port 3007` | Puerto ocupado | Cambia `PORT` en `.env` o mata proceso. |
| Formulario dice «modo demo» | Sin servidor | Ejecuta `npm start` y usa `http://localhost:3007`. |
| **`409 Esa hora ya no está disponible`** | Hueco lleno (`MAX_POR_HORA`) o reserva duplicada (mismo tel/email/nombre/IP) | Elige otra hora; el desplegable ya la muestra como `(ocupada)`. |
| **`429 Demasiadas reservas`** | `LIMITE_RESERVAS` (5/IP/min) | Espera 60 s o sube `LIMITE_RESERVAS` en `.env`. Los 400 no consumen cuota. |
| **`400 Revisa los datos de la reserva`** | Validación fallida | Mira `detalle[]` en la respuesta: dice qué campo falla (fecha, hora fuera de turno, comensales, teléfono…). |
| `401 Token no válido` | `ADMIN_TOKEN` erróneo | Usa el `ADMIN_TOKEN` del `.env` en header `x-admin-token`. |
| `404 No existe esa reserva` | ID borrado | Vuelve a pedir `GET /api/reservas`. |
| La carta no cambia al editar `semillas.js` | Semillas solo entran con BD vacía | `npm run reiniciar`. |
| Cambios en `.env` sin efecto | Servidor no reiniciado | `Ctrl+C` → `npm start`. |
| Un día cerrado aparece con horas | `horarios.cerrado` o `turnos` mal | Revisa la tabla `horarios` en la BD. |
| Navegador cachea CSS/JS | Cache agresiva | `Ctrl+F5` (HTML tiene `no-cache`). |

---

## 7. Modo demo (doble clic `index.html`)

- Funciona **sin servidor**: carta, horarios y opiniones salen de arrays en `js/main.js` (sección 6).
- Formulario de reserva: valida en cliente, simula éxito con toast «✓ ¡Mesa apuntada! (Modo demo…)».
- **No funciona**: disponibilidad real (`GET /api/disponibilidad`), guardado en BD, correo de confirmación, bandeja admin.
- Consola muestra: `[api] Modo demo: sin servidor, la carta sale del array CARTA…`.

---

## 8. Seguridad mínima antes de publicar

- Cambia `ADMIN_TOKEN` por una clave **larga y aleatoria**.
- Mantén `.env` fuera de git (ya en `.gitignore`).
- Sirve solo por **HTTPS** (proxy Caddy/Nginx + Let's Encrypt).
- No expongas `ADMIN_TOKEN` en frontend (solo en header servidor-a-servidor).
- Rate limiting en proxy/CDN para producción (el de memoria no sirve en multi-instancia).
- **Datos personales en reserva (nombre, teléfono, email) → RGPD**: informa de finalidad y plazo de conservación, y limpia la tabla `reservas` periódicamente.

---

## 9. Estructura de carpetas (resumen)

```
07-restaurante/
├── index.html            # Hero, carta, reserva, nosotros, opiniones, FAQ, contacto
├── css/styles.css        # Tema, paleta (--color-primary #146b57), componentes
├── js/main.js            # 13 secciones: API client, carta, horarios, opiniones, reserva, contadores
├── .env                  # Puerto 3007, ADMIN_TOKEN, reglas de reserva, correo
├── .env.example          # Plantilla comentada
├── package.json          # Scripts: start, dev, reiniciar
└── server/
    ├── server.js         # Arranque: .env → BD → API → estáticos
    ├── api.js            # 9 endpoints REST (carta, disponibilidad, reservas…)
    ├── reset.js          # npm run reiniciar
    ├── datos/semillas.js # ESQUEMA SQL + 23 platos, 7 horarios, 4 reseñas
    ├── data/restaurante.db# SQLite (generado, no en git)
    └── lib/              # env, db, router, limitador, http, email
```

---

## 10. Referencia rápida de endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/salud` | — | Estado servidor |
| GET | `/api/carta?categoria=&q=` | — | 23 platos (filtro categoría + búsqueda sin tildes) |
| GET | `/api/carta/:id` | — | Un plato (404 si no existe) |
| GET | `/api/horarios` | — | 7 días con turnos |
| GET | `/api/resenas` | — | 4 opiniones |
| GET | `/api/disponibilidad?fecha=&comensales=` | — | `{fecha, cerrado, horas:[{hora, libre}]}` |
| POST | `/api/reservas` | — | Crea reserva → 201 `CO-0041`, 400 `detalle[]`, 409 ocupado/duplicado, 429 IP |
| GET | `/api/reservas?fecha=&q=` | `x-admin-token` | Bandeja `{total, reservas[]}` |
| DELETE | `/api/reservas/:id` | `x-admin-token` | Borra reserva → `{borrados}` |

---

*Generado a partir del código real (README, server/api.js, server/server.js, server/datos/semillas.js, server/lib/*.js, js/main.js, index.html, .env, package.json).*