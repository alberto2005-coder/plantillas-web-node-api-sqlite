# Guía de Personalización — Global

> **Para quién es este documento**: usuarios y desarrolladores que quieran adaptar las plantillas a su imagen de marca y necesidades.

Adaptar cualquiera de las 7 plantillas es rápido. Aquí se recogen las recetas comunes a todas ellas.

## 1. Cambiar los colores de la plantilla

Cada plantilla usa variables CSS nativas centralizadas. Abre el archivo `css/styles.css` y busca el bloque `:root` al principio del archivo.

```css
:root {
  --color-primary: #2563eb;    /* Color principal de la marca (botones, enlaces) */
  --color-secondary: #475569;  /* Color secundario */
  --color-background: #ffffff; /* Fondo principal */
  --color-text: #1e293b;       /* Color de texto base */
}
```
Cambiando `--color-primary`, alterarás inmediatamente el aspecto de botones, bordes, estados de hover y acentos gráficos en toda la web.

## 2. Cambiar la tipografía

Las plantillas cargan tipografías desde Google Fonts en el `<head>` del `index.html`.

1. Entra en [Google Fonts](https://fonts.google.com/) y selecciona tus fuentes.
2. Reemplaza el `<link href="...">` en el `index.html`.
3. En `css/styles.css`, actualiza las variables de fuente:

```css
:root {
  --font-heading: 'Outfit', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```

## 3. Modificar Textos e Imágenes

Todo el contenido estático reside en `index.html`. No hay CMS por defecto.
*   Abre `index.html` con cualquier editor de texto o código.
*   Busca el texto que quieras cambiar y edítalo directamente.
*   Para imágenes, reemplaza la ruta en los atributos `src="..."` de las etiquetas `<img>`.

## 4. Reemplazar Iconos

Las plantillas pueden usar SVGs inline o librerías de iconos como Phosphor Icons / Lucide.
Para cambiar un icono SVG, simplemente borra la etiqueta `<svg>...</svg>` antigua en el HTML y pega la nueva obtenida de sitios como [Lucide](https://lucide.dev) o [Heroicons](https://heroicons.com).

## 5. Personalización de Base de Datos (avanzado)

Si necesitas añadir un nuevo campo al formulario de contacto o registro:
1. Modifica el HTML (`index.html`) para añadir el nuevo `<input>`.
2. Modifica la captura de datos en `js/main.js`.
3. Edita la tabla SQL en `server/datos/semillas.js` añadiendo el nuevo campo.
4. Ejecuta `npm run reiniciar` para recrear la base de datos con el nuevo esquema.
5. Actualiza la inserción en `server/api.js`.
