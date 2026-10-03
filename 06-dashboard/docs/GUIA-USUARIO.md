# 06-dashboard — Guía de usuario (Nova Analytics)

> **Para quién es esta guía**: gestores de producto, analistas, administradores de tiendas online o cualquier persona que necesite vigilar KPIs, pedidos, clientes y productos sin programar.

> **Documentación relacionada**: [Guía de desarrollador](GUIA-DESARROLLADOR.md) · [README principal](../README.md) · [Guía global de despliegue](../docs/GUIA-DESPLIEGUE.md) · [Guía global de seguridad](../docs/GUIA-SEGURIDAD.md)

---

## 1. Arranque rápido

| Método | Comando / Acción | URL resultado |
|---|---|---|
| **Con servidor (recomendado)** | `npm start` | `http://localhost:3006` |
| **Sin servidor (modo estático)** | Doble clic en `index.html` | `file:///…/06-dashboard/index.html` |
| **Resetear BD a datos de ejemplo** | `npm run reiniciar` | — |
| **Modo desarrollo (auto-recarga)** | `npm run dev` | `http://localhost:3006` |

**Requisito**: Node 22.13+ (`node -v` para comprobar).

El puerto real sale de `.env` (`PORT=3006`). Si cambias `.env`, **reinicia** el servidor (`Ctrl+C` → `npm start`).

---

## 2. Recorrido por el panel (IDs reales del HTML)

| Sección | `id` en `index.html` | Qué ves / haces |
|---|---|---|
| **Login + Panel** | `vista-resumen`, `vista-pedidos`, `vista-ventas`, `vista-productos`, `vista-clientes`, `vista-ajustes` | Navegación lateral (`data-vista`). Login real vía `POST /api/login` (`ADMIN_USER`/`ADMIN_PASSWORD` del `.env`). Sesión 24 h en cookie `sessionStorage` (`nova-token`). |
| **Resumen** | `kpiIngresos`, `kpiVentas`, `kpiVisitantes`, `kpiConversion`, `contenedorGraficaLineas`, `contenedorDona`, `cuerpoPedidosResumen`, `listaActividad` | 4 KPIs animados, gráfica líneas (ingresos vs objetivo), dona (ventas categoría), 5 últimos pedidos, actividad reciente. |
| **Ventas** | `kpiFacturacion`, `kpiCerrados`, `kpiTicket`, `contenedorGraficaBarras`, `cuerpoVendedores` | 3 KPIs, barras mensuales, tabla equipo con barras de objetivo. |
| **Productos** | `rejillaProductos` | 12 tarjetas con stock, ventas, badge «Stock bajo» (<10 u.). |
| **Clientes** | `rejillaClientes` | 10 tarjetas con plan, país, pedidos, facturado. |
| **Pedidos** | `cuerpoPedidos`, `btnExportarPedidos`, chips `data-filtro` | Tabla completa con filtro server-side por estado (`todos\|Entregado\|En curso\|Pendiente`) y búsqueda `q`. Exporta CSV real con `x-admin-token`. |
| **Ajustes** | `formAjustes`, `campoTema` | Perfil, notificaciones (switches), tema claro/oscuro (guarda en `localStorage`). |

---

## 3. Dónde ver / tocar los datos (sin programar)

### 3.1 Base de datos SQLite
```bash
# Abrir con DB Browser for SQLite (gratuito)
# Archivo: 06-dashboard/server/data/dashboard.db

# O desde terminal:
sqlite3 server/data/dashboard.db ".tables"
sqlite3 server/data/dashboard.db "SELECT * FROM pedidos ORDER BY referencia DESC LIMIT 5;"
sqlite3 server/data/dashboard.db "SELECT * FROM metricas WHERE clave='ingresos';"
```

### 3.2 API con curl (PowerShell: guarda body en fichero)
```powershell
# Salud
curl http://localhost:3006/api/salud

# Panel completo
curl http://localhost:3006/api/resumen
curl "http://localhost:3006/api/pedidos?estado=Pendiente"
curl "http://localhost:3006/api/pedidos?q=lucia"

# Login (devuelve token 24 h)
[System.IO.File]::WriteAllText("$PWD\login.json", '{"usuario":"admin","clave":"nova-demo-2026"}')
curl -X POST http://localhost:3006/api/login -H "Content-Type: application/json" --data-binary "@login.json"

# Ver quién eres (Bearer o x-admin-token)
curl -H "Authorization: Bearer TOKEN" http://localhost:3006/api/yo

# Cambiar estado pedido (requiere token admin)
[System.IO.File]::WriteAllText("$PWD\estado.json", '{"estado":"Entregado"}')
curl -X PATCH http://localhost:3006/api/pedidos/1043/estado -H "Content-Type: application/json" -H "x-admin-token: demo-token-dashboard-9f4c2b7e1a" --data-binary "@estado.json"

# Exportar CSV
curl -i -H "x-admin-token: demo-token-dashboard-9f4c2b7e1a" http://localhost:3006/api/exportar/pedidos.csv -o pedidos.csv
```

**Variables del `.env` usadas aquí**:
- `ADMIN_USER=admin`
- `ADMIN_PASSWORD=nova-demo-2026`
- `ADMIN_TOKEN=demo-token-dashboard-9f4c2b7e1a`

---

## 4. Cambios sin programar (4 recetas)

| Qué cambias | Dónde | Ejemplo |
|---|---|---|
| **Usuario / contraseña admin** | `.env` → `ADMIN_USER`, `ADMIN_PASSWORD` | `ADMIN_USER=gestor` / `ADMIN_PASSWORD=clave-larga-2026` |
| **Moneda (€ → $, MXN…)** | `js/main.js` → `dinero()` (línea 81) | `currency: 'USD'` / `currency: 'MXN'` |
| **Columnas visibles en tablas** | `index.html` → `<thead>` + `js/main.js` → `filaPedido()` / `filaVendedor()` | Añade `<th>Vendedor</th>` y en JS `td.textContent = p.vendedor` |
| **Token admin fijo** | `.env` → `ADMIN_TOKEN` | `ADMIN_TOKEN=mi-token-secreto-2026` (largo, aleatorio) |

> **Nota**: tras editar `.env` → `Ctrl+C` + `npm start`.

---

## 5. Checklist de verificación (8–10 clics)

1. ✅ `npm start` → abre `http://localhost:3006` → ve 4 KPIs animados.
2. ✅ Menú lateral → **Ventas** → gráfica de barras + tabla vendedores.
3. ✅ Menú → **Productos** → 12 tarjetas, 3 con badge «Stock bajo».
4. ✅ Menú → **Clientes** → 10 tarjetas con banderas de país.
5. ✅ Menú → **Pedidos** → chip «Pendiente» → tabla filtrada server-side.
6. ✅ Chip «Todos» + buscador global (`Ctrl+K`) → escribe `lucia` → filtra.
7. ✅ Login: `POST /api/login` con `admin`/`nova-demo-2026` → token 24 h.
8. ✅ `PATCH /api/pedidos/1043/estado` con `x-admin-token` → estado «Entregado».
9. ✅ Botón «Exportar CSV» → pide token → descarga `pedidos.csv` con BOM UTF-8.
10. ✅ `npm run reiniciar` → BD vuelve a semillas originales.

---

## 6. Fallos típicos + §10 del README

| Síntoma | Causa | Solución |
|---|---|---|
| `No se pudo cargar "node:sqlite"` | Node < 22.13 | Actualiza Node (`node -v`). |
| `EADDRINUSE: port 3006` | Puerto ocupado | Cambia `PORT` en `.env` o mata proceso. |
| Panel no navega / datos estáticos | Sin servidor | Ejecuta `npm start` y usa `http://localhost:3006`. |
| `401 Token de administración no válido` | Token erróneo | Usa `ADMIN_TOKEN` del `.env` en header `x-admin-token`. |
| `429 Demasiados intentos` | Límite login IP | Espera 1 min o sube `LIMITE_LOGIN` en `.env`. |
| `401 Usuario o contraseña incorrectos` | Credenciales mal | Usa `ADMIN_USER`/`ADMIN_PASSWORD` del `.env`. |
| CSV con símbolos raros | Excel español usa `;` | En `server/api.js` cambia `join(',')` por `join(';')`. |
| Cambios en `.env` sin efecto | Servidor no reiniciado | `Ctrl+C` → `npm start`. |
| Navegador cachea CSS/JS | Cache agresiva | `Ctrl+F5` (HTML tiene `no-cache`). |
| `403` al abrir `/.env` o `/server/` | Protección intencional | Correcto: el servidor bloquea sensibles. |

---

## 7. Modo estático (doble clic `index.html`)

- Funciona **sin servidor**: datos vienen de arrays en `js/main.js` (sección 6).
- Gráficas, contadores, filtros, búsqueda: **todo igual**.
- **No funciona**: login real, `PATCH` pedidos, exportar CSV, datos frescos de BD.
- Consola muestra: `[nova] API no disponible → modo estático`.

---

## 8. Seguridad mínima antes de publicar

- Cambia `ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_TOKEN` por valores **largos y aleatorios**.
- Mantén `.env` fuera de git (ya en `.gitignore`).
- Sirve solo por **HTTPS** (proxy Caddy/Nginx + Let's Encrypt).
- No expongas `ADMIN_TOKEN` en frontend (solo en header servidor a servidor).
- Rate limiting en proxy/CDN para producción.

---

## 9. Estructura de carpetas (resumen)

```
06-dashboard/
├── index.html           # Vistas, tablas, gráficas (ids reales)
├── css/styles.css       # Tema, paleta, componentes
├── js/main.js           # API client, render, gráficas SVG, login
├── .env                 # Puerto 3006, credenciales, token
├── .env.example         # Plantilla comentada
├── package.json         # Scripts: start, dev, reiniciar
└── server/
    ├── server.js        # Arranque: .env → BD → API → estáticos
    ├── api.js           # Rutas REST (login, pedidos, CSV, métricas)
    ├── reset.js         # npm run reiniciar
    ├── datos/semillas.js# Esquema SQL + 18 pedidos, métricas, actividad
    ├── data/dashboard.db# SQLite (generado, no en git)
    └── lib/             # env, db, router, limitador, http, email
```

---

## 10. Referencia rápida de endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/salud` | — | Estado servidor |
| GET | `/api/resumen` | — | KPIs, series, dona, pedidos, actividad |
| GET | `/api/ventas` | — | Barras, vendedores, KPIs ventas |
| GET | `/api/productos` | — | Catálogo 12 ítems |
| GET | `/api/clientes` | — | Cartera 10 clientes |
| GET | `/api/actividad` | — | 8 últimos eventos |
| GET | `/api/pedidos?estado=&q=` | — | Filtrado server-side |
| PATCH | `/api/pedidos/:id/estado` | `x-admin-token` | Cambia estado |
| GET | `/api/exportar/pedidos.csv` | `x-admin-token` | CSV con BOM UTF-8 |
| POST | `/api/login` | user+pass | Token 24 h (`sessionStorage`) |
| GET | `/api/yo` | Bearer/x-admin-token | Quién soy |

---

*Generado a partir del código real (README, server/api.js, server/server.js, server/datos/semillas.js, js/main.js, index.html, .env, package.json).*