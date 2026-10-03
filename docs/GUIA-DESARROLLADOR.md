# Guía de desarrollador — Global

> **Para quién es esta guía**: desarrolladores que van a modificar el núcleo de las plantillas (el servidor HTTP nativo de Node.js, la base de datos SQLite o la lógica de negocio de la API).

Esta guía explica la arquitectura técnica común a las 7 plantillas de este repositorio.

## 1. Arquitectura común

Todas las plantillas comparten el mismo stack tecnológico "Zero Dependencies":

*   **Frontend**: HTML5, CSS3, JavaScript Vanilla. No hay frameworks (React, Vue) ni preprocesadores CSS.
*   **Backend**: Node.js puro (`node:http`).
*   **Base de datos**: SQLite nativo de Node.js (`node:sqlite`), sin ORM.
*   **Sin servidor**: Cada plantilla puede funcionar abriendo directamente el `index.html` en el navegador ("modo estático").

### Estructura de directorios estándar

```text
├── index.html            # Punto de entrada de la SPA o sitio web
├── css/styles.css        # Estilos globales y variables de diseño
├── js/main.js            # Lógica de la interfaz (fetches a la API)
├── server/
│   ├── server.js         # Servidor HTTP y punto de entrada backend
│   ├── api.js            # Definición de rutas y endpoints REST
│   ├── reset.js          # Script para reiniciar la base de datos
│   ├── datos/semillas.js # Esquema SQL y datos iniciales (fixtures)
│   ├── data/             # Carpeta donde se guarda el archivo .db
│   └── lib/              # Librerías comunes (http, db, email, env, router)
├── .env.example          # Variables de entorno
└── package.json          # Scripts (start, dev, reiniciar)
```

## 2. El servidor Node (`server.js` y `lib/`)

El servidor no usa Express.js. Todo se maneja a través de módulos nativos en `server/lib/`:

*   `http.js`: Utilidades para devolver JSON (`ctx.json`), errores (`ctx.fallo`), parsear el body (`ctx.cuerpo`) y servir archivos estáticos (`estatico`).
*   `router.js`: Un enrutador muy simple basado en expresiones regulares que soporta parámetros de ruta (ej. `/api/pedidos/:id`).
*   `db.js`: Un wrapper muy fino sobre `node:sqlite` para proveer métodos `ejecutar`, `todos` y `uno`.
*   `env.js`: Parsea el archivo `.env` línea por línea.
*   `limitador.js`: Implementa un rate limit en memoria usando un `Map` (útil contra spam básico en formularios).

## 3. Base de datos (`node:sqlite`)

El proyecto usa el módulo nativo experimental `node:sqlite` (introducido en Node 22.5.0).
*   La base de datos se guarda en `server/data/archivo.db`.
*   El esquema y los datos semilla están en `server/datos/semillas.js`.
*   Para hacer alteraciones en el esquema, puedes modificar `semillas.js` y correr `npm run reiniciar`.

## 4. Frontend y modo estático

El frontend hace llamadas `fetch` a la API (`/api/...`).
Para soportar el modo estático, `js/main.js` incluye una lógica de *fallback*:
1.  Intenta hacer la petición.
2.  Si el servidor no responde (ej. abriste `index.html` sin el servidor corriendo), la promesa de `fetch` falla o devuelve un error de red.
3.  El catch activa el "modo estático", desactivando funciones que requieren backend (ej. mostrando alertas de demostración en los formularios de contacto).

## 5. Recomendaciones de desarrollo

*   **Para producción**: Reemplaza el servidor nativo por Express/Fastify si necesitas lógica muy compleja o middlewares pesados.
*   **Seguridad**: Las contraseñas en el panel de admin actual (plantilla 06) o los tokens son en texto plano para demostración. Implementa bcrypt o jwt para aplicaciones reales.
*   **Modificaciones rápidas**: Usa `npm run dev` que levanta el servidor usando `--watch` nativo de Node.
