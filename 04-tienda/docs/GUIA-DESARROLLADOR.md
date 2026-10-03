# 04-tienda — Guía de desarrollador

> **Documentación relacionada**: [Guía de usuario](GUIA-USUARIO.md) · [README principal](../README.md)

---

## 1. Mapa del código

```
04-tienda/
├── index.html            # Catálogo, carrito y checkout
├── css/styles.css        # Diseño e-commerce
├── js/main.js            # Lógica de carrito local, renderizado de productos, compra
├── server/
│   ├── server.js         # Servidor backend
│   ├── api.js            # Endpoints de productos, carrito, checkout
│   └── datos/semillas.js # Catálogo de productos inicial
```

## 2. Base de datos (Tablas)

| Tabla | Columnas | Uso |
|---|---|---|
| `productos` | `id PK`, `nombre`, `precio`, `imagen`, `descripcion`, `stock` | Catálogo de venta |
| `pedidos` | `id PK`, `cliente`, `total`, `estado`, `creado_en` | Registro de compras |
| `lineas_pedido` | `id PK`, `pedido_id`, `producto_id`, `cantidad`, `precio` | Detalle del carrito |

## 3. API REST

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/productos` | Obtiene el catálogo de productos. |
| POST | `/api/checkout` | Procesa el carrito y crea un pedido (modo demo por defecto). |
| GET | `/api/pedidos` | Lista pedidos entrantes (requiere token de admin). |

## 4. Integración de pagos

Por defecto, `/api/checkout` solo guarda el pedido y asume éxito. Para integrar **Stripe**:
1. Instala stripe: `npm install stripe`.
2. En `server/api.js`, modifica `POST /api/checkout` para crear una `Stripe Checkout Session`.
3. Devuelve la URL de pago al frontend, que redirigirá al cliente.
4. Implementa un webhook en `api.js` para recibir la confirmación de pago de Stripe y actualizar el estado en BD a `pagado`.
