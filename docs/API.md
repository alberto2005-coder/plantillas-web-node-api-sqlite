# API Común de las Plantillas

> **Para quién es este documento**: desarrolladores o integradores que van a interactuar con los endpoints de las plantillas desde el exterior.

Cada plantilla tiene su propio conjunto de endpoints específicos, pero comparten una convención de API REST común descrita aquí.

## 1. Convenciones generales

*   **Ruta Base**: Todas las llamadas a la API se hacen bajo el prefijo `/api`.
*   **Formato de datos**: Todas las respuestas son JSON (`application/json`). Las peticiones POST/PATCH deben enviar JSON y tener la cabecera `Content-Type: application/json`.
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

## 4. Patrones de Autenticación

Las áreas protegidas (lectura de mensajes, exportación de CSV, cambio de estado de pedidos) se protegen mediante un token definido en el `.env` (ej. `ADMIN_TOKEN`).

Se puede enviar de dos formas:
1.  **Cabecera personalizada**: `x-admin-token: tu-token-secreto`
2.  **Cabecera de Autorización**: `Authorization: Bearer tu-token-secreto`

## 5. Códigos HTTP de Error Comunes

*   `400 Bad Request`: Faltan datos requeridos o el formato no es válido (ej. falta el email).
*   `401 Unauthorized`: Se intentó acceder a un endpoint protegido sin token o con uno inválido.
*   `404 Not Found`: La ruta o el recurso solicitado no existe.
*   `429 Too Many Requests`: Se excedió el límite de peticiones (ej. demasiados intentos de login o contacto desde la misma IP).
*   `500 Internal Server Error`: Error del servidor, típicamente de la base de datos o fallo en el código.
