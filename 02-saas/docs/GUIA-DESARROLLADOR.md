# 02-saas — Guía de desarrollador

> **Documentación relacionada**: [Guía de usuario](GUIA-USUARIO.md) · [README principal](../README.md)

---

## 1. Mapa del código

```
02-saas/
├── index.html            # Landing page del SaaS (Hero, Features, Pricing)
├── css/styles.css        # Estilos y variables (colores de marca)
├── js/main.js            # Lógica front, captura de emails para lista de espera
├── .env                  # Variables locales (PORT, ADMIN_TOKEN)
├── package.json          # Node scripts
└── server/
    ├── server.js         # Entrada backend
    ├── api.js            # Endpoints (alta usuarios, lista de espera)
    ├── datos/semillas.js # Esquema de BD
    └── data/saas.db      # Base de datos SQLite
```

## 2. Base de datos (Tablas)

| Tabla | Columnas | Uso |
|---|---|---|
| `waitlist` | `id PK`, `email`, `creado_en`, `ip` | Almacena registros de usuarios interesados |
| `contactos` | `id PK`, `nombre`, `email`, `mensaje` | Para consultas directas de empresas |

## 3. API REST

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/waitlist` | Registra un email en la lista de espera. |
| GET | `/api/waitlist` | Obtiene los correos registrados (requiere token admin). |
| POST | `/api/contacto` | Envía mensaje de contacto. |

## 4. Personalización del servidor

Para habilitar un webhook cuando un usuario se registra (por ejemplo para enviarlo a Zapier o ConvertKit):
Abre `server/api.js` y en el endpoint `POST /api/waitlist` añade una llamada `fetch` a la URL externa antes de retornar `201`.
