/* =========================================================================
   BITÁCORA DIGITAL — JavaScript vanilla
   Sin dependencias. Todo se ejecuta al cargar el DOM.
   Secciones:
     1. Tema claro / oscuro
     2. Menú móvil (hamburguesa)
     3. Animaciones al hacer scroll (IntersectionObserver)
     4. Año dinámico en el footer
     5. Buscador de artículos
     6. Filtro por categoría y por etiquetas
     7. Paginación (visual sin servidor / real con API)
     8. Formularios de newsletter
     9. API: listado paginado, contadores y modo estático

   La plantilla funciona de dos formas:
     a) Abriendo index.html directamente → todo lo local funciona y nada se
        rompe: el listado, los filtros y los contadores son los del HTML.
     b) Con servidor (`npm start` → http://localhost:3003) → el grid se pinta
        con GET /api/articulos (paginado de verdad), los contadores de
        categorías se recalculan con GET /api/categorias y el newsletter se
        guarda con POST /api/newsletter.
   Si el fetch falla, se conserva intacto el HTML original (modo estático).
   ========================================================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* =======================================================================
     0. CLIENTE DE LA API (envoltorio mínimo de fetch)
     ======================================================================= */
  const API_BASE = ''; // '' = mismo dominio. Ej: 'http://localhost:3003'

  function api(ruta, opciones) {
    return fetch(API_BASE + ruta, Object.assign({
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    }, opciones || {})).then(function (respuesta) {
      return respuesta.json().catch(function () { return {}; }).then(function (cuerpo) {
        if (!respuesta.ok) {
          const fallo = new Error(cuerpo.error || ('Error HTTP ' + respuesta.status));
          fallo.datos = cuerpo;
          fallo.estado = respuesta.status;
          throw fallo;
        }
        return cuerpo;
      });
    });
  }


  /* =======================================================================
     1. TEMA CLARO / OSCURO
     Cambia data-theme en <html> y guarda la preferencia en localStorage.
     (La carga inicial sin parpadeo la hace el script inline del <head>.)
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

  // Estado inicial guardado (o preferencia del sistema)
  const temaGuardado = localStorage.getItem('tema');
  const temaSistema = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  aplicarTema(temaGuardado || temaSistema);

  if (btnTema) {
    btnTema.addEventListener('click', function () {
      const actual = html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const nuevo = actual === 'dark' ? 'light' : 'dark';
      aplicarTema(nuevo);
      localStorage.setItem('tema', nuevo);
    });
  }

  // Si el usuario cambia el tema del sistema en caliente y no ha elegido uno a mano
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem('tema')) {
      aplicarTema(e.matches ? 'dark' : 'light');
    }
  });


  /* =======================================================================
     2. MENÚ MÓVIL (HAMBURGUESA)
     ======================================================================= */
  const hamburguesa = document.getElementById('hamburguesa');
  const menu = document.getElementById('menu-principal');

  function cerrarMenu() {
    if (!menu || !hamburguesa) return;
    menu.classList.remove('abierto');
    hamburguesa.setAttribute('aria-expanded', 'false');
    hamburguesa.setAttribute('aria-label', 'Abrir menú de navegación');
  }

  if (hamburguesa && menu) {
    hamburguesa.addEventListener('click', function () {
      const abierto = menu.classList.toggle('abierto');
      hamburguesa.setAttribute('aria-expanded', String(abierto));
      hamburguesa.setAttribute('aria-label', abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    });

    // Cerrar el menú al pulsar cualquier enlace y al cambiar a escritorio
    menu.querySelectorAll('a').forEach(function (enlace) {
      enlace.addEventListener('click', cerrarMenu);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) cerrarMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrarMenu();
    });
  }

  // Enlace activo según la sección visible
  const enlacesMenu = Array.from(document.querySelectorAll('.menu__enlace'));
  const secciones = enlacesMenu
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && secciones.length) {
    const obsSecciones = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          enlacesMenu.forEach(function (a) {
            a.classList.toggle('activo', a.getAttribute('href') === '#' + entrada.target.id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    secciones.forEach(function (s) { obsSecciones.observe(s); });
  }


  /* =======================================================================
     3. ANIMACIONES AL HACER SCROLL
     IntersectionObserver añade la clase .visible a los elementos .reveal
     ======================================================================= */
  const elementosReveal = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const obsReveal = new IntersectionObserver(function (entradas, observador) {
      entradas.forEach(function (entrada, i) {
        if (entrada.isIntersecting) {
          // Pequeño escalonado para las tarjetas del grid
          const retardo = entrada.target.classList.contains('tarjeta') ? i * 70 : 0;
          setTimeout(function () { entrada.target.classList.add('visible'); }, retardo);
          observador.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    elementosReveal.forEach(function (el) { obsReveal.observe(el); });
  } else {
    // Navegadores muy antiguos: mostramos todo directamente
    elementosReveal.forEach(function (el) { el.classList.add('visible'); });
  }


  /* =======================================================================
     4. AÑO DINÁMICO EN EL FOOTER
     ======================================================================= */
  const anio = document.getElementById('anio-actual');
  if (anio) anio.textContent = String(new Date().getFullYear());


  /* =======================================================================
     5. BUSCADOR DE ARTÍCULOS (navbar y sidebar)
     Filtra las tarjetas por texto en título, extracto o etiquetas.
     ======================================================================= */
  const inputBuscarNav = document.getElementById('buscar-nav');
  const inputBuscarSide = document.getElementById('buscar-side');

  // Normaliza tildes/mayúsculas para una búsqueda más amable
  function normalizar(texto) {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }


  /* =======================================================================
     6. FILTRO POR CATEGORÍA Y POR ETIQUETAS
     ======================================================================= */
  const grid = document.getElementById('grid-articulos');
  let tarjetas = grid ? Array.from(grid.querySelectorAll('.tarjeta')) : [];
  const contador = document.getElementById('contador-resultados');
  const sinResultados = document.getElementById('sin-resultados');
  const chips = Array.from(document.querySelectorAll('.chip'));
  const itemsCategoria = Array.from(document.querySelectorAll('.item-categoria'));
  const tags = Array.from(document.querySelectorAll('.tag'));
  const btnLimpiar = document.getElementById('limpiar-filtros');

  // Estado combinado de filtros (pagina solo se usa con la API)
  const estado = { categoria: 'todos', etiqueta: '', texto: '', pagina: 1 };
  let primeraCarga = true;   // para respetar las animaciones de scroll iniciales

  // null = aún no lo sabemos · true = hay servidor · false = modo estático
  let conApi = null;
  let peticionActual = 0;      // descarta respuestas fuera de orden
  let temporizadorCarga = null;

  function textoDeTarjeta(tarjeta) {
    return normalizar(
      (tarjeta.dataset.titulo || '') + ' ' +
      tarjeta.textContent + ' ' +
      (tarjeta.dataset.tags || '')
    );
  }

  function hayFiltroActivo() {
    return estado.categoria !== 'todos' || estado.etiqueta !== '' || estado.texto !== '';
  }

  function aplicarFiltros() {
    // Con API disponible el servidor manda: aquí solo sincronizamos controles
    // y programamos la recarga (el pintado lo hace pintarArticulos()).
    if (conApi === true) {
      sincronizarControles();
      if (btnLimpiar) btnLimpiar.hidden = !hayFiltroActivo();
      programarCarga();
      return;
    }

    // Vuelvo a leer el grid: puede que las tarjetas vengan de la API
    tarjetas = grid ? Array.from(grid.querySelectorAll('.tarjeta')) : [];

    let visibles = 0;
    const texto = normalizar(estado.texto);
    const etiqueta = normalizar(estado.etiqueta);

    tarjetas.forEach(function (tarjeta) {
      const coincideCategoria =
        estado.categoria === 'todos' || tarjeta.dataset.categoria === estado.categoria;
      const coincideTexto = texto === '' || textoDeTarjeta(tarjeta).indexOf(texto) !== -1;
      const coincideEtiqueta =
        etiqueta === '' || normalizar(tarjeta.dataset.tags).split(',').indexOf(etiqueta) !== -1;

      const visible = coincideCategoria && coincideTexto && coincideEtiqueta;

      if (visible) {
        visibles++;
        tarjeta.classList.remove('oculta');

        // En la primera carga dejamos trabajar al IntersectionObserver
        // (que añade .visible al hacer scroll); después animamos nosotros.
        if (primeraCarga) {
          tarjeta.style.animation = '';
        } else {
          tarjeta.classList.add('visible');
          tarjeta.style.animation = 'none';
          void tarjeta.offsetWidth;          // fuerza reflow
          tarjeta.style.animation = 'aparecer 0.45s ease forwards';
        }
      } else {
        tarjeta.classList.add('oculta');
        tarjeta.style.animation = '';
      }
    });

    // Contador de resultados
    if (contador) {
      contador.textContent = visibles === 1 ? '1 artículo' : visibles + ' artículos';
    }
    if (sinResultados) {
      sinResultados.hidden = visibles !== 0;
    }

    // Botón "limpiar filtros" visible solo si hay algo activo
    if (btnLimpiar) {
      btnLimpiar.hidden = !hayFiltroActivo();
    }

    sincronizarControles();
  }

  function sincronizarControles() {
    chips.forEach(function (c) {
      c.classList.toggle('activo', c.dataset.categoria === estado.categoria);
    });
    itemsCategoria.forEach(function (c) {
      c.classList.toggle('activo', c.dataset.categoria === estado.categoria);
    });
    tags.forEach(function (t) {
      t.classList.toggle('activo', normalizar(t.dataset.tag) === normalizar(estado.etiqueta));
    });
  }

  function setCategoria(cat) {
    const nueva = cat || 'todos';
    if (nueva === estado.categoria) return;
    estado.categoria = nueva;
    estado.pagina = 1;
    aplicarFiltros();
  }

  // Chips superiores
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { setCategoria(chip.dataset.categoria); });
  });

  // Categorías de la sidebar
  itemsCategoria.forEach(function (item) {
    item.addEventListener('click', function () {
      setCategoria(item.dataset.categoria);
      const zona = document.getElementById('articulos');
      if (zona && window.innerWidth <= 980) {
        zona.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Etiquetas clicables
  tags.forEach(function (tag) {
    tag.addEventListener('click', function () {
      const valor = normalizar(tag.dataset.tag);
      const igual = normalizar(estado.etiqueta) === valor;
      estado.etiqueta = igual ? '' : tag.dataset.tag;
      estado.pagina = 1;
      aplicarFiltros();
      const zona = document.getElementById('articulos');
      if (zona && estado.etiqueta && window.innerWidth <= 980) {
        zona.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Limpiar todos los filtros
  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', function () {
      estado.categoria = 'todos';
      estado.etiqueta = '';
      estado.texto = '';
      estado.pagina = 1;
      if (inputBuscarNav) inputBuscarNav.value = '';
      if (inputBuscarSide) inputBuscarSide.value = '';
      aplicarFiltros();
    });
  }

  // Búsqueda (sincronizada entre navbar y sidebar)
  function alBuscar(valor, origen) {
    estado.texto = valor;
    estado.pagina = 1;
    if (origen === 'nav' && inputBuscarSide) inputBuscarSide.value = valor;
    if (origen === 'side' && inputBuscarNav) inputBuscarNav.value = valor;
    aplicarFiltros();
  }

  if (inputBuscarNav) {
    inputBuscarNav.addEventListener('input', function () { alBuscar(inputBuscarNav.value, 'nav'); });
  }
  if (inputBuscarSide) {
    inputBuscarSide.addEventListener('input', function () { alBuscar(inputBuscarSide.value, 'side'); });
  }

  // Evitar que el envío del formulario recargue la página
  ['form-buscar-nav', 'form-buscar-side'].forEach(function (id) {
    const f = document.getElementById(id);
    if (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        aplicarFiltros();
        const zona = document.getElementById('articulos');
        if (zona) zona.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  });


  /* =======================================================================
     7. PAGINACIÓN
     - Sin servidor: solo cambia el estado activo (adorno, como siempre).
     - Con servidor: cambia estado.pagina y recarga desde GET /api/articulos.
     ======================================================================= */
  const navPaginacion = document.querySelector('.paginacion');
  const botonesPagina = Array.from(document.querySelectorAll('.paginacion__btn'))
    .filter(function (b) { return /^[0-9]+$/.test(b.textContent.trim()); });

  /** Marca visualmente la página activa (modo estático) */
  function marcarActivo(btn) {
    botonesPagina.forEach(function (b) {
      b.classList.remove('activo');
      b.removeAttribute('aria-current');
    });
    if (btn) {
      btn.classList.add('activo');
      btn.setAttribute('aria-current', 'page');
    }
  }

  function irAZonaArticulos() {
    const zona = document.getElementById('articulos');
    if (zona) zona.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Modo estático: ‹ › mueven la página activa de forma puramente visual */
  function moverActivoVisual(delta) {
    const activo = botonesPagina.filter(function (b) { return b.classList.contains('activo'); })[0];
    const indice = Math.max(0, botonesPagina.indexOf(activo));
    const destino = Math.min(botonesPagina.length - 1, Math.max(0, indice + delta));
    marcarActivo(botonesPagina[destino]);
  }

  botonesPagina.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (conApi === true) {
        irAPagina(Number(btn.textContent.trim()));
        return;
      }
      marcarActivo(btn);
      irAZonaArticulos();
    });
  });

  Array.from(document.querySelectorAll('.paginacion__btn'))
    .filter(function (b) { return !/^[0-9]+$/.test(b.textContent.trim()); })
    .forEach(function (btn) {
      btn.addEventListener('click', function () {
        const delta = btn.textContent.trim() === '›' ? 1 : -1;
        if (conApi === true) {
          irAPagina(estado.pagina + delta);
          return;
        }
        moverActivoVisual(delta);
        irAZonaArticulos();
      });
    });

  function irAPagina(n) {
    if (conApi !== true) {
      const boton = botonesPagina.filter(function (b) { return b.textContent.trim() === String(n); })[0];
      marcarActivo(boton);
      irAZonaArticulos();
      return;
    }
    estado.pagina = Math.max(1, n);
    cargarDesdeApi().then(irAZonaArticulos);
  }


  /* =======================================================================
     8. FORMULARIOS DE NEWSLETTER
     Validación local + envío real a POST /api/newsletter (con modo demo
     si no hay servidor).
     ======================================================================= */
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  document.querySelectorAll('form[data-newsletter]').forEach(function (form) {
    const input = form.querySelector('.campo-email');
    const mensaje = form.querySelector('.mensaje-form');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!input || !mensaje) return;

      const valor = input.value.trim();

      if (valor === '') {
        mostrarMensaje('Por favor escribe tu correo electrónico.', false, input, mensaje);
        return;
      }
      if (!EMAIL_REGEX.test(valor)) {
        mostrarMensaje('Ese correo no parece válido. Revísalo e inténtalo de nuevo.', false, input, mensaje);
        return;
      }

      const boton = form.querySelector('button[type="submit"]');
      const textoBoton = boton ? boton.textContent : '';
      if (boton) { boton.disabled = true; boton.textContent = 'Enviando…'; }

      // El formulario de la zona ancha lleva origen "ancha"; el lateral, "lateral"
      const origen = input.id === 'email-ancha' ? 'ancha' : 'lateral';

      api('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email: valor, origen: origen })
      })
        .then(function (datos) {
          mostrarMensaje(datos.mensaje || '¡Listo! Revisa tu bandeja para confirmar la suscripción. 🎉', true, input, mensaje);
          form.reset();
        })
        .catch(function (fallo) {
          if (fallo && fallo.estado) {
            // El servidor respondió: mostramos su error (validación, límite…)
            const extra = fallo.datos && Array.isArray(fallo.datos.detalle)
              ? ' ' + fallo.datos.detalle[0]
              : '';
            mostrarMensaje('✗ ' + fallo.message + extra, false, input, mensaje);
          } else {
            // Sin servidor: comportamiento de siempre (modo demo local)
            mostrarMensaje('¡Listo! Revisa tu bandeja para confirmar la suscripción. 🎉', true, input, mensaje);
            form.reset();
          }
        })
        .then(function () {
          if (boton) { boton.disabled = false; boton.textContent = textoBoton; }
        });
    });

    // Quita el error en cuanto el usuario vuelve a escribir
    input.addEventListener('input', function () {
      input.classList.remove('error');
      if (mensaje) {
        mensaje.textContent = '';
        mensaje.classList.remove('exito', 'falla');
      }
    });
  });

  function mostrarMensaje(texto, esExito, input, mensaje) {
    mensaje.textContent = texto;
    mensaje.classList.toggle('exito', esExito);
    mensaje.classList.toggle('falla', !esExito);
    input.classList.toggle('error', !esExito);
    if (esExito) input.classList.remove('error');
  }


  /* =======================================================================
     9. API: LISTADO PAGINADO, CONTADORES Y MODO ESTÁTICO
     ---------------------------------------------------------------------
     - Si la API responde, se REPINTA #grid-articulos con las filas de la
       base de datos (enlaces a articulo.html?slug=…), se recalcula el
       contador, el mensaje de "sin resultados" y los contadores de
       #categorias.
     - Si la API falla, NO se toca nada: el HTML sigue exactamente igual
       que hoy (modo estático).
     ======================================================================= */

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const ETIQUETAS_CATEGORIA = {
    todos: 'Todas',
    desarrollo: 'Desarrollo',
    ia: 'Inteligencia Artificial',
    seguridad: 'Seguridad',
    movil: 'Móvil',
    diseno: 'Diseño'
  };

  // Un icono por categoría (los mismos SVG del index.html)
  const ICONOS_CATEGORIA = {
    desarrollo: 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm1 2v10h14V7H5zm2 2h5v2H7V9zm0 4h8v2H7v-2z',
    ia: 'M12 2a5 5 0 015 5v1a5 5 0 01-1 3 5 5 0 011 3v1a5 5 0 01-10 0v-1a5 5 0 011-3 5 5 0 01-1-3V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v1a3 3 0 006 0V7a3 3 0 00-3-3zm0 12a3 3 0 003-3v-1a3 3 0 00-6 0v1a3 3 0 003 3z',
    seguridad: 'M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4zm0 2.2L6 6.9V12c0 3.9 2.6 7.4 6 7.9 3.4-.5 6-4 6-7.9V6.9l-6-2.7zm-1 4v2H8v2h3v2h2v-2h3v-2h-3V8.2h-2z',
    movil: 'M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zm0 3v12h10V5H7zm3 13h4v1h-4v-1z',
    diseno: 'M12 3a9 9 0 000 18V3zm0 0v18a9 9 0 000-18z'
  };

  /** Escapa texto antes de meterlo en innerHTML */
  function esc(valor) {
    return String(valor === null || valor === undefined ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fechaCorta(iso) {
    const partes = String(iso || '').split('-');
    if (partes.length !== 3) return iso || '';
    return Number(partes[2]) + ' ' + (MESES[Number(partes[1]) - 1] || partes[1]) + ' ' + partes[0];
  }

  /** Tarjeta idéntica a las del HTML, pero con enlace a articulo.html?slug=… */
  function htmlTarjeta(a) {
    const cat = String(a.categoria || '');
    const icono = ICONOS_CATEGORIA[cat] || ICONOS_CATEGORIA.desarrollo;
    const etiquetaCat = a.categoria_etiqueta || ETIQUETAS_CATEGORIA[cat] || cat;
    const gradiente = Math.min(7, Math.max(1, Number(a.gradiente) || 1));

    return '' +
      '<article class="tarjeta reveal visible" data-categoria="' + esc(cat) + '"' +
      ' data-tags="' + esc(a.tags || '') + '" data-titulo="' + esc(normalizar(a.titulo)) + '">' +
        '<div class="tarjeta__media gradiente-' + gradiente + '" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" class="media-icono"><path d="' + icono + '"/></svg>' +
        '</div>' +
        '<div class="tarjeta__cuerpo">' +
          '<span class="pill pill--' + esc(cat) + '">' + esc(etiquetaCat) + '</span>' +
          '<h3 class="tarjeta__titulo"><a href="articulo.html?slug=' + encodeURIComponent(a.slug || '') + '">' +
            esc(a.titulo) + '</a></h3>' +
          '<p class="tarjeta__extracto">' + esc(a.extracto) + '</p>' +
          '<div class="tarjeta__pie">' +
            '<span class="avatar avatar--sm" aria-hidden="true">' + esc(a.avatar_iniciales || '') + '</span>' +
            '<span class="tarjeta__autor">' + esc(a.autor || '') + '</span>' +
            '<span class="punto-separador" aria-hidden="true">•</span>' +
            '<span class="meta-fecha">' + esc(fechaCorta(a.fecha)) + '</span>' +
            '<span class="lectura">' + (Number(a.minutos) || 0) + ' min</span>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /** Pinta el grid + contador + "sin resultados" + paginación real */
  function pintarArticulos(datos) {
    if (!grid || !datos) return;
    const items = Array.isArray(datos.items) ? datos.items : [];

    grid.innerHTML = items.map(htmlTarjeta).join('');
    tarjetas = Array.from(grid.querySelectorAll('.tarjeta'));

    // El servidor recorta la página al rango válido: sincronizamos el estado
    estado.pagina = Number(datos.pagina) || 1;

    const total = Number(datos.total !== undefined ? datos.total : items.length);
    if (contador) {
      contador.textContent = total === 1 ? '1 artículo' : total + ' artículos';
    }
    if (sinResultados) {
      sinResultados.hidden = items.length !== 0;
    }
    pintarPaginacion(datos);
  }

  /** Reconstruye los botones de paginación según las páginas reales */
  function pintarPaginacion(datos) {
    if (!navPaginacion) return;
    const paginas = Math.max(1, Number(datos.paginas) || 1);
    const pagina = Math.min(paginas, Math.max(1, Number(datos.pagina) || 1));

    navPaginacion.innerHTML = '';
    navPaginacion.appendChild(crearBotonPagina('‹', 'Página anterior', pagina > 1 ? pagina - 1 : null));

    digitosVisibles(pagina, paginas).forEach(function (d) {
      if (d === '…') {
        const puntos = document.createElement('span');
        puntos.className = 'paginacion__puntos';
        puntos.setAttribute('aria-hidden', 'true');
        puntos.textContent = '…';
        navPaginacion.appendChild(puntos);
        return;
      }
      navPaginacion.appendChild(crearBotonPagina(String(d), 'Ir a la página ' + d, d));
    });

    navPaginacion.appendChild(crearBotonPagina('›', 'Página siguiente', pagina < paginas ? pagina + 1 : null));
  }

  function digitosVisibles(pagina, paginas) {
    if (paginas <= 7) {
      const todos = [];
      for (let i = 1; i <= paginas; i++) todos.push(i);
      return todos;
    }
    const conjunto = [1, paginas, pagina, pagina - 1, pagina + 1]
      .filter(function (n, i, arr) { return n >= 1 && n <= paginas && arr.indexOf(n) === i; })
      .sort(function (a, b) { return a - b; });

    const salida = [];
    let anterior = 0;
    conjunto.forEach(function (n) {
      if (anterior && n - anterior > 1) salida.push('…');
      salida.push(n);
      anterior = n;
    });
    return salida;
  }

  function crearBotonPagina(texto, etiqueta, destino) {
    const btn = document.createElement('button');
    btn.className = 'paginacion__btn';
    btn.textContent = texto;
    btn.setAttribute('aria-label', etiqueta);

    if (texto === String(estado.pagina)) {
      btn.classList.add('activo');
      btn.setAttribute('aria-current', 'page');
    }

    if (destino === null) {
      btn.disabled = true;
      btn.style.opacity = '0.45';
      btn.style.cursor = 'default';
    } else {
      btn.addEventListener('click', function () { irAPagina(destino); });
    }
    return btn;
  }

  /** Recarga el listado desde la API con los filtros actuales */
  function cargarDesdeApi() {
    window.clearTimeout(temporizadorCarga);
    if (conApi === false) return Promise.resolve(null);

    const miPeticion = ++peticionActual;
    const params = new URLSearchParams();

    if (estado.categoria && estado.categoria !== 'todos') params.set('categoria', estado.categoria);
    if (estado.texto) params.set('q', estado.texto);
    if (estado.etiqueta) params.set('tag', estado.etiqueta);
    params.set('pagina', String(estado.pagina || 1));

    return api('/api/articulos?' + params.toString())
      .then(function (datos) {
        if (miPeticion !== peticionActual) return datos;  // respuesta obsoleta
        conApi = true;
        pintarArticulos(datos);
        return datos;
      })
      .catch(function (fallo) {
        if (miPeticion !== peticionActual) return null;
        if (fallo && fallo.estado) {
          // Hay servidor, pero la petición fue rechazada: no se toca el grid
          conApi = true;
          console.warn('[api] GET /api/articulos →', fallo.message);
        } else {
          // Sin servidor: el HTML del listado se queda como está
          conApi = false;
          console.info('[api] Sin servidor: los artículos salen del index.html (modo estático).');
        }
        return null;
      });
  }

  /** Pequeña pausa para no saturar el servidor mientras se teclea */
  function programarCarga() {
    if (conApi === false) return;
    window.clearTimeout(temporizadorCarga);
    temporizadorCarga = window.setTimeout(function () { cargarDesdeApi(); }, 280);
  }

  /** Recalcula los contadores de #categorias desde GET /api/categorias */
  function cargarContadores() {
    api('/api/categorias')
      .then(function (datos) {
        conApi = conApi === false ? false : true;
        const items = (datos && datos.items) || [];

        items.forEach(function (c) {
          if (c.clave && c.etiqueta) ETIQUETAS_CATEGORIA[c.clave] = c.etiqueta;
        });

        itemsCategoria.forEach(function (el) {
          const encontrado = items.filter(function (c) { return c.clave === el.dataset.categoria; })[0];
          if (!encontrado) return;
          const contadorItem = el.querySelector('.contador');
          if (contadorItem) contadorItem.textContent = String(encontrado.total);
        });

        console.info('[api] Contadores de categorías recalculados (' + (datos.total || 0) + ' artículos).');
      })
      .catch(function () {
        // Modo estático: los contadores del HTML (8, 2, 2, 2, 1, 1) se quedan
      });
  }

  /** El botón del destacado apunta al artículo real si hay servidor */
  function enlazarDestacado() {
    api('/api/destacado')
      .then(function (a) {
        if (!a || !a.slug) return;
        const enlace = document.querySelector('.destacado__contenido .btn');
        if (enlace) enlace.setAttribute('href', 'articulo.html?slug=' + encodeURIComponent(a.slug));
      })
      .catch(function () { /* sin servidor: el enlace sigue como en el HTML */ });
  }

  /** Filtros iniciales desde la URL: index.html?categoria=ia&tag=ia&q=… */
  function leerFiltrosDeURL() {
    try {
      const params = new URLSearchParams(window.location.search);
      const categoria = params.get('categoria');
      const tag = params.get('tag');
      const q = params.get('q');

      if (categoria && (categoria === 'todos' || ETIQUETAS_CATEGORIA[categoria])) {
        estado.categoria = categoria;
      }
      if (tag) {
        estado.etiqueta = tag;
      }
      if (q) {
        estado.texto = q;
        if (inputBuscarNav) inputBuscarNav.value = q;
        if (inputBuscarSide) inputBuscarSide.value = q;
      }
    } catch (e) {
      /* sin URLSearchParams seguimos con el estado por defecto */
    }
  }


  /* =======================================================================
     ARRANQUE
     1) Filtros locales iniciales (idéntico al de siempre).
     2) Si hay servidor, se pinta el listado y los contadores desde la API.
     ======================================================================= */
  leerFiltrosDeURL();
  aplicarFiltros();
  primeraCarga = false;

  cargarDesdeApi();
  cargarContadores();
  enlazarDestacado();
});
