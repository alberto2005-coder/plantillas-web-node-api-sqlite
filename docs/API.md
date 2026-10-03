# API Común de las Plantillas

> **Para quién es este documento**: desarrolladores o integradores que van a interactuar con los endpoints de las plantillas desde el exterior.

Cada plantilla tiene su propio conjunto de endpoints específicos, pero comparten una convención de API REST común descrita aquí.

## 1. Convenciones generales

*   **Ruta Base**: Todas las llamadas a la API se hacen bajo el prefijo `/api`.
*   **Formato de datos**: Todas las respuestas son JSON (`application/json`). Las peticiones POST/PATCH deben enviar JSON y tener la cabecera `Content-Type: application/json`.
*   **Cabeceras de seguridad**: cada respuesta (JSON, HTML y estáticos) lleva `Content-Security-Policy` (solo recursos propios + Google Fonts) y `Permissions-Policy`, además de `X-Content-Type-Options`, `Referrer-Policy` y `X-Frame-Options`. Se configuran con `CSP` en el `.env` (`CSP=0` la apaga, un valor personalizado la cambia; ver [despliegue](DESPLIEGUE.md)).
*   **CORS**: Deshabilitado por defecto. Se puede habilitar poniendo `CORS=1` en el `.env`, útil si alojas el front y back separados.

## 2. Formato de Respuesta

### Respuestas correctas
Devuelven un código HTTP 2xx (200 OK, 201 Created).
```json
{
  "ok": true,
  "id": 1,
  "data": { ... }
}
```

### Respuestas de error
Devuelven códigos HTTP 4xx (400, 401, 404, 429) o 500. Siempre incluyen la clave `error`.
```json
{
  "error": "El campo email es obligatorio"
}
```

## 3. Endpoints estándar (en todas las plantillas)

### `GET /api/salud`
Devuelve el estado del servidor. Útil para checks de uptime o balanceadores de carga.
*   **Respuesta**: `{ "ok": true, "version": "1.0.0", "node": "v22.x.x", "uptime_s": 120 }`
*   **Auth**: Ninguna.

### `GET /feed.xml` (solo 03-blog)

Feed RSS 2.0 del blog (no lleva prefijo `/api`).
*   **Respuesta**: `application/rss+xml; charset=utf-8` con los **20 últimos artículos publicados** (`publicado = 1`, ordenados por fecha descendente): `title`, `link`, `guid`, `description`, `category`, `dc:creator` y `pubDate` de cada uno.
*   **Auth**: Ninguna. Cacheada 5 minutos (`Cache-Control: public, max-age=300`).
*   **Enlaces**: construidos con `SITE_URL` del `.env` (`https://tudominio.com/articulo.html?slug=…`), igual que en los correos.
*   **Detección**: `index.html` y `articulo.html` declaran `<link rel="alternate" type="application/rss+xml" href="/feed.xml">`, así que cualquier lector de RSS lo encuentra solo.

```bash
curl http://localhost:3000/feed.xml
```

## 4. Patrones de Autenticación

Las áreas protegidas (lectura de mensajes, exportación de CSV, cambio de estado de pedidos) se protegen mediante un token definido en el `.env` (ej. `ADMIN_TOKEN`).

El token viaja **solo** en una cabecera:

1.  **Cabecera personalizada**: `x-admin-token: tu-token-secreto`

```bash
curl -H "x-admin-token: TU_TOKEN" http://localhost:3000/api/mensajes
```

*   **Nunca** por la query string (`?token=…`): se filtraría en los logs del servidor y del proxy, en el historial del navegador y en la cabecera `Referer`.
*   La comparación con `ADMIN_TOKEN` se hace en **tiempo constante** (`crypto.timingSafeEqual`, `server/lib/token.js`), no con `===`.
*   Excepción: la **06-dashboard** admite además `Authorization: Bearer <token>` (el token fijo o el que devuelve `POST /api/login`).

## 5. Códigos HTTP de Error Comunes

*   `400 Bad Request`: Faltan datos requeridos o el formato no es válido (ej. falta el email).
*   `401 Unauthorized`: Se intentó acceder a un endpoint protegido sin token o con uno inválido.
*   `404 Not Found`: La ruta o el recurso solicitado no existe.
*   `429 Too Many Requests`: Se excedió el límite de peticiones (ej. demasiados intentos de login o contacto desde la misma IP).
*   `500 Internal Server Error`: Error del servidor, típicamente de la base de datos o fallo en el código.
