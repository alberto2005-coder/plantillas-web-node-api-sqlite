/* =========================================================================
   BITÁCORA DIGITAL — PÁGINA DE ARTÍCULO (articulo.html)
   JavaScript vanilla, sin dependencias.
   Lee ?slug=… y pinta el artículo desde GET /api/articulos/:slug.

   Si NO hay servidor (index/articulo abiertos con doble clic) o el slug no
   existe, se muestra un mensaje claro con un enlace al listado: nunca se
   rompe la página.
   Secciones:
     1. Tema claro / oscuro
     2. Menú móvil (hamburguesa)
     3. Año dinámico en el footer
     4. Carga y pintado del artículo
   ========================================================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* =======================================================================
     1. TEMA CLARO / OSCURO
     ======================================================================= */
  const html = document.documentElement;
  const btnTema = document.getElementById('toggle-tema');

  function aplicarTema(tema) {
    html.setAttribute('data-theme', tema);
    if (btnTema) {
      const esOscuro = tema === 'dark';
      btnTema.setAttribute('aria-label', esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
      btnTema.setAttribute('title', esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }
  }

  aplicarTema(localStorage.getItem('tema') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  if (btnTema) {
    btnTema.addEventListener('click', function () {
      const actual = html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const nuevo = actual === 'dark' ? 'light' : 'dark';
      aplicarTema(nuevo);
      localStorage.setItem('tema', nuevo);
    });
  }

  /* =======================================================================
     2. MENÚ MÓVIL (HAMBURGUESA)
     ======================================================================= */
  const hamburguesa = document.getElementById('hamburguesa');
  const menu = document.getElementById('menu-principal');

  if (hamburguesa && menu) {
    hamburguesa.addEventListener('click', function () {
      const abierto = menu.classList.toggle('abierto');
      hamburguesa.setAttribute('aria-expanded', String(abierto));
      hamburguesa.setAttribute('aria-label', abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('abierto');
        hamburguesa.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') menu.classList.remove('abierto');
    });
  }

  /* =======================================================================
     3. AÑO DINÁMICO EN EL FOOTER
     ======================================================================= */
  const anio = document.getElementById('anio-actual');
  if (anio) anio.textContent = String(new Date().getFullYear());

  /* =======================================================================
     4. CARGA DEL ARTÍCULO
     ======================================================================= */
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const CATEGORIAS = {
    desarrollo: 'Desarrollo',
    ia: 'Inteligencia Artificial',
    seguridad: 'Seguridad',
    movil: 'Móvil',
    diseno: 'Diseño'
  };

  const aviso = document.getElementById('aviso-pagina');
  const caja = document.getElementById('articulo');

  function fechaLegible(iso) {
    const partes = String(iso || '').split('-');
    if (partes.length !== 3) return iso || '';
    return Number(partes[2]) + ' ' + (MESES[Number(partes[1]) - 1] || partes[1]) + ' ' + partes[0];
  }

  function texto(el, valor) {
    if (el) el.textContent = valor === undefined || valor === null ? '' : String(valor);
  }

  function mostrarAviso(titulo, detalle, esError) {
    if (!aviso) return;
    aviso.innerHTML = '';
    aviso.classList.toggle('aviso-pagina--error', Boolean(esError));

    const fuerte = document.createElement('strong');
    fuerte.textContent = titulo;
    aviso.appendChild(fuerte);

    if (detalle) {
      const p = document.createElement('p');
      p.textContent = detalle;
      aviso.appendChild(p);
    }

    const enlace = document.createElement('a');
    enlace.className = 'btn btn--primario';
    enlace.href = 'index.html';
    enlace.textContent = 'Ir al listado de artículos';
    aviso.appendChild(enlace);

    aviso.hidden = false;
    if (caja) caja.hidden = true;
  }

  /** slug desde la query: articulo.html?slug=mi-articulo */
  function leerSlug() {
    try {
      return new URLSearchParams(window.location.search).get('slug') || '';
    } catch (e) {
      return '';
    }
  }

  function pintar(a) {
    document.title = a.titulo + ' — Bitácora Digital';

    const pill = document.getElementById('articulo-pill');
    if (pill) {
      pill.textContent = a.categoria_etiqueta || a.categoria || '';
      pill.className = 'pill pill--' + (a.categoria || '');
    }

    texto(document.getElementById('articulo-fecha'), fechaLegible(a.fecha));
    texto(document.getElementById('articulo-titulo'), a.titulo);
    texto(document.getElementById('articulo-extracto'), a.extracto);
    texto(document.getElementById('articulo-avatar'), a.avatar_iniciales);
    texto(document.getElementById('articulo-autor'), a.autor);
    texto(document.getElementById('articulo-categoria'), a.categoria_etiqueta || a.categoria);
    texto(document.getElementById('articulo-minutos'), a.minutos + ' min de lectura');
    texto(
      document.getElementById('articulo-vistas'),
      Number(a.vistas || 0).toLocaleString('es-ES') + ' lecturas'
    );

    // Cuerpo: HTML generado en el servidor desde Markdown escapado
    const cuerpo = document.getElementById('articulo-cuerpo');
    if (cuerpo) cuerpo.innerHTML = a.cuerpo_html || '';

    // Etiquetas → vuelven al listado ya filtradas (main.js lee ?tag=)
    const contenedorTags = document.getElementById('articulo-tags');
    if (contenedorTags) {
      contenedorTags.innerHTML = '';
      (a.etiquetas || []).forEach(function (tag) {
        const enlace = document.createElement('a');
        enlace.className = 'tag';
        enlace.href = 'index.html?tag=' + encodeURIComponent(tag);
        enlace.textContent = '#' + tag;
        contenedorTags.appendChild(enlace);
      });
      if (!(a.etiquetas || []).length) {
        const avisoTags = document.createElement('span');
        avisoTags.className = 'lectura';
        avisoTags.textContent = 'Sin etiquetas';
        contenedorTags.appendChild(avisoTags);
      }
    }

    if (aviso) aviso.hidden = true;
    if (caja) caja.hidden = false;

    // JSON-LD (SEO): datos estructurados del artículo cargado
    if (a && a.titulo) {
      const datos = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.titulo,
        description: a.extracto || '',
        datePublished: a.fecha || undefined,
        author: { '@type': 'Person', name: a.autor || '' },
        inLanguage: 'es'
      }).replace(/</g, '\\u003c');
      let guion = document.getElementById('datos-estructurados');
      if (!guion) {
        guion = document.createElement('script');
        guion.id = 'datos-estructurados';
        guion.type = 'application/ld+json';
        document.head.appendChild(guion);
      }
      guion.textContent = datos;
    }
  }

  (function cargar() {
    const slug = leerSlug();

    if (!slug) {
      mostrarAviso(
        'Falta el identificador del artículo',
        'Abre esta página desde un artículo: articulo.html?slug=…',
        true
      );
      return;
    }

    fetch('/api/articulos/' + encodeURIComponent(slug), {
      headers: { Accept: 'application/json' }
    })
      .then(function (respuesta) {
        return respuesta.json().catch(function () { return {}; }).then(function (cuerpo) {
          if (!respuesta.ok) {
            const fallo = new Error(cuerpo.error || ('Error HTTP ' + respuesta.status));
            fallo.estado = respuesta.status;
            throw fallo;
          }
          return cuerpo;
        });
      })
      .then(pintar)
      .catch(function (fallo) {
        if (fallo && fallo.estado) {
          mostrarAviso(
            'No encontramos ese artículo',
            'Puede que se haya borrado, que esté sin publicar o que el slug ("' + slug + '") no exista.',
            true
          );
        } else {
          mostrarAviso(
            'No hay servidor conectado',
            'Esta página lee los artículos desde la API. Arranca el servidor (npm start) y vuelve a intentarlo.',
            true
          );
        }
      });
  })();
});
