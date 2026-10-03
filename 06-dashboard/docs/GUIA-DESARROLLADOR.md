# 06-dashboard — Guía de desarrollador (Nova Analytics)

> **Para quién es esta guía**: desarrolladores que van a extender la API, cambiar el modelo de datos, añadir autenticación real, integrar Stripe/GA4 o desplegar en producción.

> **Documentación relacionada**: [Guía de usuario](GUIA-USUARIO.md) · [README principal](../README.md) · [Guía global de despliegue](../docs/GUIA-DESPLIEGUE.md) · [Guía global de seguridad](../docs/GUIA-SEGURIDAD.md)

---

## 1. Mapa del código (arquitectura)

```
06-dashboard/
├── index.html            # 6 vistas (ids: vista-resumen, vista-pedidos…)
├── css/styles.css        # :root { --color-primary, --color-accent… }
├── js/main.js            # 17 secciones: API client, render, gráficas SVG, login
├── .env                  # PORT=3006, ADMIN_USER, ADMIN_PASSWORD, ADMIN_TOKEN…
├── package.json          # start, dev, reiniciar (Node ≥ 22.13)
└── server/
    ├── server.js         # HTTP server: .env → BD → API router → estáticos
    ├── api.js            # 11 endpoints REST (ver §5)
    ├── reset.js          # Borra BD y resiembra
    ├── datos/semillas.js # ESQUEMA SQL + 7 tablas + datos demo
    ├── data/dashboard.db # SQLite (WAL mode)
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

### 2.1 `GET /api/resumen` (petición típica de lectura)
```
navegador → fetch('/api/resumen')
  → server.js:48 req.url.startsWith('/api/')
  → api.manejar(req, res) [router.js:45]
  → router encuentra api.get('/api/resumen', handler) [api.js:139]
  → handler(ctx):
      ctx.json({
        kpis: { ingresos: último de serie('ingresos'), ventas: metrica('ventas','30d')… },
        serie: { meses, ingresos, objetivo },
        dona: SELECT periodo AS n, valor AS v FROM metricas WHERE clave='dona',
        donaTotal: metrica('dona_total','30d'),
        pedidos: SELECT referencia AS id, cliente, producto, fecha, importe, estado
                 FROM pedidos ORDER BY referencia DESC LIMIT 5,
        actividad: SELECT id, tipo AS t, texto AS txt, detalle AS sub, tiempo
                   FROM actividad ORDER BY id DESC LIMIT 8
      })
  → json(res, datos, 200) [http.js:43] → application/json; charset=utf-8
```

### 2.2 `POST /api/login` → sesión cookie 24 h
```
fetch('/api/login', {method:'POST', body:{usuario,clave}})
  → api.post('/api/login', async ctx) [api.js:323]
  → limiteLogin.permitido(ip) [limitador.js:30] → 429 si >5/min
  → valida usuario === process.env.ADMIN_USER && clave === process.env.ADMIN_PASSWORD
  → bd.ejecutar('DELETE FROM sesiones WHERE caduca_en < ?', now)
  → token = crypto.randomUUID() [api.js:343]
  → bd.ejecutar('INSERT INTO sesiones (token, usuario, creado_en, caduca_en) VALUES (?,?,?,?)',
                token, usuario, now, now+24h)
  → limiteLogin.reiniciar(ip)
  → ctx.json({ok:true, token, usuario, caduca_en}, 201)
```

### 2.3 Front guarda token en `sessionStorage` (`nova-token`)
```js
// js/main.js:1241-1252
function tokenAdmin(pedir) {
  let token = sessionStorage.getItem('nova-token');
  if (token) return token;
  if (!pedir) return null;
  token = prompt('Token de administración…');
  sessionStorage.setItem('nova-token', token);
  return token;
}
```

### 2.4 `PATCH /api/pedidos/:id/estado` (requiere admin)
```
fetch('/api/pedidos/1043/estado', {method:'PATCH', headers:{'x-admin-token':TOKEN}, body:{estado:'Entregado'}})
  → api.patch('/api/pedidos/:id/estado', async ctx) [api.js:260]
  → esAdmin(ctx) [api.js:53-58]:
      token = Authorization: Bearer … o cabecera x-admin-token (la query ya NO se admite)
      true si tokenValido(token, process.env.ADMIN_TOKEN) — comparación en tiempo constante — O sesionValida(bd, token)
  → valida estado ∈ ['Entregado','En curso','Pendiente']
  → bd.ejecutar('UPDATE pedidos SET estado = ? WHERE referencia = ?', estado, ref)
  → inserta en actividad (tipo según estado)
  → ctx.json({ok:true, pedido: fila})
```

---

## 3. Base de datos (tablas y columnas reales)

| Tabla | Columnas | Índices / Uniques | Quién escribe |
|---|---|---|---|
| `productos` | `id PK`, `nombre`, `categoria`, `precio REAL`, `stock`, `ventas`, `icono`, `orden`, `activo` | — | semillas / manual |
| `clientes` | `id PK`, `nombre`, `email`, `plan`, `pais`, `pedidos`, `facturado REAL`, `activo` | — | semillas / manual |
| `pedidos` | `id PK`, `referencia UNIQUE`, `cliente`, `producto`, `fecha`, `importe REAL`, `estado`, `creado_en` | `referencia UNIQUE` | semillas + `PATCH /api/pedidos/:id/estado` |
| `actividad` | `id PK`, `tipo`, `texto`, `detalle`, `tiempo`, `creado_en` | — | semillas + cada PATCH |
| `vendedores` | `id PK`, `nombre`, `pedidos`, `facturado REAL`, `objetivo` | — | semillas / manual |
| `metricas` | `id PK`, `clave`, `periodo`, `valor REAL` | `UNIQUE(clave, periodo)` | semillas / manual (series KPIs) |
| `sesiones` | `id PK`, `token UNIQUE`, `usuario`, `creado_en`, `caduca_en` | `token UNIQUE` | `POST /api/login` (24 h) |

**Consultar**:
```bash
sqlite3 server/data/dashboard.db ".schema"
sqlite3 server/data/dashboard.db "SELECT * FROM metricas WHERE clave='ingresos';"
sqlite3 server/data/dashboard.db "SELECT * FROM sesiones;"
```

---

## 4. API REST completa (verificada contra `server/api.js`)

| Método | Ruta | Query / Body | Respuesta | Auth | Código fuente |
|---|---|---|---|---|---|
| GET | `/api/salud` | — | `{ok, servicio, version, node, uptime_s}` | — | `api.js:125` |
| GET | `/api/resumen` | — | `{kpis, serie, dona, donaTotal, pedidos[5], actividad[8]}` | — | `api.js:139` |
| GET | `/api/ventas` | — | `{kpis, serie, vendedores}` | — | `api.js:171` |
| GET | `/api/productos` | — | `[{n,c,p,stock,v,i}]` | — | `api.js:187` |
| GET | `/api/clientes` | — | `[{n,mail,plan,pais,ped,fact}]` | — | `api.js:204` |
| GET | `/api/actividad` | — | `[{id,t,txt,sub,tiempo}]` | — | `api.js:221` |
| GET | `/api/pedidos` | `estado`, `q` | `[{id,cliente,producto,fecha,importe,estado}]` | — | `api.js:231` |
| PATCH | `/api/pedidos/:id/estado` | `{estado}` | `{ok, pedido}` | `x-admin-token` | `api.js:260` |
| GET | `/api/exportar/pedidos.csv` | — | `text/csv` (BOM UTF-8) | `x-admin-token` | `api.js:291` |
| POST | `/api/login` | `{usuario, clave}` | `{ok, token, usuario, caduca_en}` (201) | user+pass | `api.js:323` |
| GET | `/api/yo` | — | `{ok, usuario, origen, caduca_en?}` | Bearer/x-admin-token | `api.js:357` |

**Detalles de filtrado `/api/pedidos`** (`api.js:231-257`):
- `estado` ∈ `todos` \| `Entregado` \| `En curso` \| `Pendiente` (otro → 400)
- `q` busca en `referencia`, `cliente`, `producto` con `sinAcentos()` + `LIKE` case-insensitive
- Orden: `referencia DESC`

**Errores**: siempre `{ "error": "mensaje", "detalle"?: [...] }` con HTTP 400/401/404/429/500.

---

## 5. Front ↔ API (`js/main.js`)

| Función | Qué hace | Endpoint |
|---|---|---|
| `api(ruta, opts)` | Wrapper `fetch` con JSON, maneja errores, fallback estático | §0 (línea 44) |
| `cargarResumen()` | `Promise.all([api('/api/resumen'), api('/api/pedidos')])` → sustituye `INGRESOS`, `OBJETIVO`, `DONA`, `PEDIDOS`, `ACTIVIDAD`, KPIs | `api.js:139,231` |
| `cargarVentas()` | `api('/api/ventas')` → `VENTAS_MES`, `VENDEDORES`, KPIs ventas | `api.js:171` |
| `cargarProductos()` | `api('/api/productos')` → `PRODUCTOS` | `api.js:187` |
| `cargarClientes()` | `api('/api/clientes')` → `CLIENTES` | `api.js:204` |
| `cargarPedidos()` | `api('/api/pedidos?estado=&q=')` → `pedidosRemotos` o `PEDIDOS` | `api.js:231` |
| `aplicarKPI(id, valor)` | Actualiza `data-contador` y re-anima si cambió | — |
| `pintarVista(vista)` | Re-render completo de la vista activa | — |
| `tokenAdmin(pedir)` | Lee `sessionStorage.nova-token` o `prompt()` | — |

**IDs HTML usados**:
- Gráficas: `#contenedorGraficaLineas`, `#contenedorDona`, `#contenedorGraficaBarras`
- Tablas: `#cuerpoPedidosResumen`, `#cuerpoPedidos`, `#cuerpoVendedores`, `#rejillaProductos`, `#rejillaClientes`
- Actividad: `#listaActividad`
- Botones: `#btnRefrescarPedidos`, `#btnExportarPedidos`, chips `[data-filtro]`
- Login: token en `sessionStorage` + `x-admin-token` header

**Fallback**: si `fetch` falla con `estado === 0` (sin servidor) → `estadoServidor = 'sin'` → modo estático con arrays locales.

---

## 6. Recetas de personalización (código)

### 6.1 Cambiar modelo de sesión / añadir roles
```js
// server/api.js - reemplazar sesionValida + tabla sesiones
// 1. npm install bcrypt jsonwebtoken
// 2. En POST /api/login:
const hash = await bcrypt.hash(clave, 12);
// guardar hash en BD (nueva tabla usuarios)
const jwt = require('jsonwebtoken');
const token = jwt.sign({ sub: user.id, rol: user.rol }, process.env.JWT_SECRETO, { expiresIn: '7d' });

// 3. En esAdmin/GET /api/yo: verificar JWT en vez de tabla sesiones
// 4. Servir solo HTTPS + cookie HttpOnly; borrar sessionStorage del front.
```
Ver `server/api.js:61-68` (`sesionValida`) y `323-354` (`POST /api/login`).

### 6.2 Añadir columna a tabla de pedidos
1. `index.html` → `<thead>` nuevo `<th>` + `<tbody>` en `filaPedido()` (`js/main.js:424`)
2. `server/api.js` → `COLS_PEDIDO` (`api.js:102`) + `SELECT` en `/api/pedidos` y `/api/resumen`
3. `server/datos/semillas.js` → `ALTER TABLE pedidos ADD COLUMN nueva_columna…` o recrea con `npm run reiniciar`

### 6.3 Cambiar moneda (€ → USD)
```js
// js/main.js:81-82
const dinero = (n) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'USD' });
// O dinámico: currency: document.documentElement.lang === 'en' ? 'USD' : 'EUR'
```

### 6.4 Añadir endpoint `/api/envios` (ejemplo README §6.4)
```js
// server/api.js dentro de registrar(api, { bd })
api.get('/api/envios', (ctx) => {
  ctx.json(bd.todos(
    "SELECT referencia AS id, cliente, fecha FROM pedidos WHERE estado = 'En curso' ORDER BY referencia DESC"
  ));
});
api.post('/api/envios', async (ctx) => {
  if (!esAdmin(ctx)) return ctx.fallo(401, 'Token no válido');
  const d = await ctx.cuerpo();
  if (!d.referencia) return ctx.fallo(400, 'Falta la referencia');
  const r = bd.ejecutar('INSERT INTO actividad (tipo, texto, detalle) VALUES (?, ?, ?)',
    'pedido', 'Envío creado', 'Pedido #' + d.referencia);
  ctx.json({ ok: true, id: Number(r.lastInsertRowid) }, 201);
});
```

---

## 7. Pruebas (verificar.ps1 puerto 3106)

El repo incluye `verificar.ps1` en la raíz. Para 06-dashboard:

```powershell
# Desde C:\Users\alors\Downloads\plantillas-web\
.\verificar.ps1 -Puerto 3006 -RutaBase "06-dashboard"

# Qué hace:
# 1. npm start en background
# 2. curl /api/salud → 200
# 3. curl /api/resumen → kpis, serie, dona
# 4. POST /api/login → token 201
# 5. PATCH /api/pedidos/1043/estado con token → 200
# 6. GET /api/exportar/pedidos.csv con token → CSV
# 7. 400 estado inválido, 401 sin token, 429 login brute force
# 8. npm run reiniciar → BD limpia
# 9. Mata proceso servidor
```

**Curl con body en fichero temporal (PowerShell)**:
```powershell
[System.IO.File]::WriteAllText("$env:TEMP\login.json", '{"usuario":"admin","clave":"nova-demo-2026"}')
curl -X POST http://localhost:3006/api/login -H "Content-Type: application/json" --data-binary "@$env:TEMP\login.json"
```

---

## 8. Seguridad (honestidad)

| Qué **NO** tiene la plantilla | Qué **SÍ** tiene |
|---|---|
| Alta de usuarios web | Login admin único (`ADMIN_USER`/`ADMIN_PASSWORD`) |
| Bcrypt / JWT | Sesiones en BD con `token UNIQUE` + caducidad 24 h |
| HTTPS obligatorio | Rate limit login por IP (`LIMITE_LOGIN=5/min`) |
| Roles/permisos | Token fijo `ADMIN_TOKEN` para PATCH/CSV |
| Stripe / pasarela | Export CSV real, métricas desde BD |

**Antes de publicar** (README §11):
- Cambia `ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_TOKEN` por valores **largos y aleatorios**.
- `.env` fuera de git (`.gitignore`).
- Solo HTTPS (proxy Caddy/Nginx).
- Rate limit en proxy/CDN (el de memoria no sirve en multi-instancia).
- `CORS_ORIGEN` concreto, nunca `*`.

---

## 9. Variables de entorno (`.env` real)

| Variable | Valor demo | Uso en código |
|---|---|---|
| `PORT` | `3006` | `server.js:44` `entero(process.env.PORT, 3006)` |
| `HOST` | `127.0.0.1` | `server.js:45` |
| `ADMIN_USER` | `admin` | `api.js:333` |
| `ADMIN_PASSWORD` | `nova-demo-2026` | `api.js:334` |
| `ADMIN_TOKEN` | `demo-token-dashboard-9f4c2b7e1a` | `api.js:55` |
| `LIMITE_LOGIN` | `5` | `api.js:107` |
| `DB_FILE` | `server/data/dashboard.db` | `server.js:33` |
| `RESEND_API_KEY` | *(vacío)* | `email.js:21` |
| `EMAIL_DE` | `Nova Analytics <hola@novaanalytics.es>` | `email.js:22` |
| `SMTP_*` | *(vacíos)* | `email.js:46-66` |
| `CORS` | `0` | `router.js:50` |

---

## 10. Imprecisiones en README origen (para que lo sepas)

1. **§2 Arranque**: dice `http://localhost:3006` ✅ coincide con `.env` `PORT=3006`.
2. **§3 Variables**: `SITE_URL` marcado "no" obligatoria pero se usa en `email.js:22` como fallback → debería ser "opcional".
3. **§6.6 Autenticación real**: menciona `npm install bcrypt jsonwebtoken` pero `package.json` no los tiene en `optionalDependencies` → añádelos tú.
4. **§7 Qué se guarda**: tabla `sesiones` tiene `caduca_en` pero README no menciona que se limpian en login (`api.js:341`).
5. **§10 Problemas**: "CSV se abre con símbolos raros" → solución dice cambiar `,` por `;` en `server/api.js` pero el CSV usa `,` estándar RFC4180; el problema real es Excel español que espera `;` → mejor documentar `sep=,` al inicio o usar `;` si tu locale lo requiere.

---

*Generado leyendo: `server/api.js`, `server/server.js`, `server/datos/semillas.js`, `server/lib/*.js`, `js/main.js`, `index.html`, `.env`, `package.json`, `README.md`.*