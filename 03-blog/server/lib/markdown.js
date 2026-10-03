/* ==========================================================================
   MARKDOWN → HTML (y Markdown → texto) — SIN dependencias, seguro
   --------------------------------------------------------------------------
   El orden es la clave de la seguridad:
     1) se ESCAPA todo el HTML del original (& < > " '), así que cualquier
        <script> del markdown termina convertido en texto visible;
     2) después se aplican las reglas de formato, que solo AÑADEN etiquetas
        que nosotros mismos generamos.

   Soporta:
     # … ######   encabezados
     **negrita**  *cursiva*  `código`
     [texto](url) enlaces — SOLO http:// y https:// (el resto se queda literal)
     - viñetas    1. listas numeradas
     ``` bloques de código ```
     > citas
     párrafos y saltos de línea (<br>)

   Uso:
     const { markdownAHTML, markdownATexto } = require('./lib/markdown');
     ctx.json({ cuerpo_html: markdownAHTML(articulo.cuerpo_md) });

   Nota: se usa un conversor propio en lugar de `marked`/`dompurify` para que
   la plantilla no necesite `npm install`. Ver README §9 (librerías opcionales).
   ========================================================================== */

'use strict';

/** Caracteres que se escapan SIEMPRE (se ejecuta primero) */
const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/** Escapa HTML para que el texto se vea como texto y no como marcado */
function escaparHTML(texto) {
  return String(texto === null || texto === undefined ? '' : texto).replace(
    /[&<>"']/g,
    (c) => ESCAPES[c]
  );
}

/* --- Auxiliares internos -------------------------------------------------- */

/** Marcas temporales para ir guardando trozos ya convertidos (código, enlaces) */
function marcador(indice) {
  return '\u0001' + indice + '\u0001';
}

/** Sustituye todas las marcas (pueden estar anidadas: un enlace dentro de…) */
function restaurarMarcas(html, trozos) {
  let salida = html;
  for (let vueltas = 0; vueltas < 12 && salida.indexOf('\u0001') !== -1; vueltas++) {
    salida = salida.replace(/\u0001(\d+)\u0001/g, (todo, n) => {
      const trozo = trozos[Number(n)];
      return trozo === undefined ? '' : trozo;
    });
  }
  return salida;
}

/**
 * Formato dentro de una línea: código `x`, enlaces [a](b), **negrita**, *cursiva*.
 * @param {string} texto ya escapado
 * @param {string[]} trozos acumulador compartido de todo el documento
 */
function formatoEnLinea(texto, trozos) {
  let t = texto;

  // 1) Código inline → se guarda ya convertido para que no le apliquen más formatos
  t = t.replace(/`([^`]+)`/g, (todo, contenido) => {
    trozos.push('<code>' + contenido + '</code>');
    return marcador(trozos.length - 1);
  });

  // 2) Enlaces [texto](url) → solo http/https (evita javascript:, data:, etc.)
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (todo, etiqueta, url) => {
    if (!/^https?:\/\//i.test(url)) return todo; // URL no permitida: se queda literal
    const interior = formatoEnLinea(etiqueta, trozos);
    trozos.push('<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + interior + '</a>');
    return marcador(trozos.length - 1);
  });

  // 3) Negrita y cursiva (se dejan para el final para no romper los anteriores)
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');

  return t;
}

/** ¿Esta línea empieza un bloque especial? (para cortar el párrafo) */
function esInicioDeBloque(linea) {
  return (
    /^\s*```/.test(linea) ||
    /^#{1,6}\s+\S/.test(linea) ||
    /^\s*>\s?/.test(linea) ||
    /^\s*[-*+]\s+\S/.test(linea) ||
    /^\s*\d+[.)]\s+\S/.test(linea)
  );
}

/** Quita los caracteres de control (nos dejan las marcas y los saltos) */
function limpiar(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/* --------------------------------------------------------------------------
   MARKDOWN → HTML
   -------------------------------------------------------------------------- */

/**
 * Convierte un texto Markdown en HTML seguro.
 * @param {string} md
 * @returns {string} HTML listo para insertar con innerHTML
 */
function markdownAHTML(md) {
  const original = limpiar(md);
  if (!original.trim()) return '';

  const trozos = [];                 // trozos ya convertidos (compartido)
  const salida = [];
  const lineas = original.split('\n');
  let i = 0;

  /** Convierte un grupo de líneas en párrafos HTML */
  function grupoAParrafos(grupo) {
    const parrafos = [];
    let actual = [];
    grupo.forEach((linea) => {
      if (!linea.trim()) {
        if (actual.length) parrafos.push(actual);
        actual = [];
      } else {
        actual.push(linea);
      }
    });
    if (actual.length) parrafos.push(actual);
    return parrafos
      .map((p) => '<p>' + p.map((l) => formatoEnLinea(escaparHTML(l), trozos)).join('<br>') + '</p>')
      .join('');
  }

  while (i < lineas.length) {
    const linea = lineas[i];

    // ---- Bloque de código ``` … ``` -------------------------------------
    if (/^\s*```/.test(linea)) {
      let j = i + 1;
      while (j < lineas.length && !/^\s*```/.test(lineas[j])) j++;
      const contenido = lineas.slice(i + 1, j).join('\n');
      salida.push('<pre><code>' + escaparHTML(contenido) + '</code></pre>');
      i = j + 1;
      continue;
    }

    // ---- Encabezados # … ###### ----------------------------------------
    const encabezado = linea.match(/^(#{1,6})\s+(.*)$/);
    if (encabezado) {
      const nivel = encabezado[1].length;
      salida.push(
        '<h' + nivel + '>' + formatoEnLinea(escaparHTML(encabezado[2].trim()), trozos) + '</h' + nivel + '>'
      );
      i++;
      continue;
    }

    // ---- Citas > --------------------------------------------------------
    if (/^\s*>\s?/.test(linea)) {
      const grupo = [];
      while (i < lineas.length && /^\s*>\s?/.test(lineas[i])) {
        grupo.push(lineas[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      salida.push('<blockquote>' + grupoAParrafos(grupo) + '</blockquote>');
      continue;
    }

    // ---- Lista con viñetas - / * / + ------------------------------------
    if (/^\s*[-*+]\s+\S/.test(linea)) {
      const items = [];
      while (i < lineas.length && /^\s*[-*+]\s+\S/.test(lineas[i])) {
        items.push(lineas[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      salida.push(
        '<ul>' + items.map((it) => '<li>' + formatoEnLinea(escaparHTML(it), trozos) + '</li>').join('') + '</ul>'
      );
      continue;
    }

    // ---- Lista numerada 1. / 1) -----------------------------------------
    if (/^\s*\d+[.)]\s+\S/.test(linea)) {
      const items = [];
      while (i < lineas.length && /^\s*\d+[.)]\s+\S/.test(lineas[i])) {
        items.push(lineas[i].replace(/^\s*\d+[.)]\s+/, ''));
        i++;
      }
      salida.push(
        '<ol>' + items.map((it) => '<li>' + formatoEnLinea(escaparHTML(it), trozos) + '</li>').join('') + '</ol>'
      );
      continue;
    }

    // ---- Línea en blanco: separa párrafos --------------------------------
    if (!linea.trim()) {
      i++;
      continue;
    }

    // ---- Párrafo (recoge líneas hasta el siguiente bloque) ---------------
    const grupo = [];
    while (i < lineas.length && lineas[i].trim() && !esInicioDeBloque(lineas[i])) {
      grupo.push(lineas[i]);
      i++;
    }
    salida.push(grupoAParrafos(grupo));
  }

  return restaurarMarcas(salida.join('\n'), trozos);
}

/* --------------------------------------------------------------------------
   MARKDOWN → TEXTO PLANO (útil para extractos, búsquedas o metaetiquetas)
   -------------------------------------------------------------------------- */

/**
 * Convierte Markdown en texto plano legible: sin #, **, *, enlaces, listas…
 * @param {string} md
 * @returns {string}
 */
function markdownATexto(md) {
  const texto = limpiar(md);
  if (!texto.trim()) return '';

  return texto
    .replace(/```[a-z]*\n?/gi, ' ')             // aperturas/cierres de bloque
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')          // encabezados
    .replace(/^\s{0,3}>\s?/gm, '')               // citas
    .replace(/^\s*[-*+]\s+/gm, '')               // viñetas
    .replace(/^\s*\d+[.)]\s+/gm, '')             // numeradas
    .replace(/\*\*([^*]+)\*\*/g, '$1')           // negrita
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1$2') // cursiva
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1') // enlaces → solo el texto
    .replace(/`([^`]+)`/g, '$1')                 // código inline
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { markdownAHTML, markdownATexto, escaparHTML };
