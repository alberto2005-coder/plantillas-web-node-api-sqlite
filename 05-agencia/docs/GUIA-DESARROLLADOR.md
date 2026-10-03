# 05-agencia — Guía de desarrollador

> **Documentación relacionada**: [Guía de usuario](GUIA-USUARIO.md) · [README principal](../README.md)

---

## 1. Mapa del código

```
05-agencia/
├── index.html            # Landing de servicios, portfolio y formulario
├── css/styles.css        # Diseño premium
├── js/main.js            # Filtros de trabajos, validación de presupuestos
├── server/
│   ├── server.js         # Servidor backend
│   ├── api.js            # API para mensajes y leads
│   └── datos/semillas.js # Trabajos del portfolio
```

## 2. Base de datos (Tablas)

| Tabla | Columnas | Uso |
|---|---|---|
| `leads` | `id PK`, `nombre`, `email`, `servicio`, `presupuesto`, `mensaje` | Solicitudes de presupuesto |
| `portfolio` | `id PK`, `titulo`, `categoria`, `imagen` | Casos de estudio / trabajos |

## 3. API REST

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/leads` | Crea una nueva solicitud de presupuesto. |
| GET | `/api/leads` | Obtiene los leads recibidos (requiere token admin). |
| GET | `/api/portfolio` | Obtiene los trabajos para mostrar en el sitio. |

## 4. Manejo de Correos

Para notificaciones de nuevos leads:
En `server/api.js`, usa `lib/email.js` (Resend/SMTP). Añade `await email.enviar({ para: process.env.AGENCIA_EMAIL, asunto: 'Nuevo Lead', html: ... })` dentro del controlador de `POST /api/leads`.
