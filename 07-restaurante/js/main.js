/* ==========================================================================
   CASA OLIVERA — Lógica de la plantilla
   JavaScript vanilla, sin librerías. Todo se ejecuta al cargar index.html.
   --------------------------------------------------------------------------
   Secciones:
      0. Cliente de la API (con fallback a modo estático)
      1. Tema claro / oscuro
      2. Menú móvil (hamburguesa)
      3. Navbar: sombra al hacer scroll + sección activa
      4. Animaciones al hacer scroll (IntersectionObserver)
      5. Año dinámico en el pie
      6. Datos locales de respaldo (CARTA, HORARIOS, RESENAS)
      7. Carta: pintado, chips de categoría y buscador
      8. Opiniones (pintado desde RESENAS o desde la API)
      9. Horarios de la tabla de contacto
     10. FAQ: acordeón (un solo panel abierto)
     11. Formulario de reserva (disponibilidad + validación + envío)
     12. Contadores animados de la franja de cifras
     13. Carga inicial desde el servidor (GET /api/*)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* ======================================================================
     0. CLIENTE DE LA API (envoltorio mínimo de fetch)
     --------------------------------------------------------------------
     Esta plantilla funciona de dos formas:
       a) Doble clic en index.html (sin servidor) → mandan los arrays locales
          de la sección 6: la carta, los horarios y las opiniones se pintan
          igual y el formulario de reserva responde en «modo demo».
       b) Con servidor (`npm start`) → GET /api/carta, /api/horarios y
          /api/resenas sustituyen a los datos locales, y la reserva se guarda
          de verdad en POST /api/reservas.
     Si el fetch falla (modalidad a), el rechazo llega con `estado: 0` y el
     código continúa sin romperse: sin servidor → modo estático.
     ====================================================================== */
  var API_BASE = ''; // '' = mismo dominio. Ej: 'http://localhost:3107'

  function api(ruta, opciones) {
    return fetch(API_BASE + ruta, Object.assign({
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    }, opciones || {})).then(function (respuesta) {
      return respuesta.json().catch(function () { return {}; }).then(function (cuerpo) {
        if (!respuesta.ok) {
          var fallo = new Error(cuerpo.error || ('Error HTTP ' + respuesta.status));
          fallo.datos = cuerpo;
          fallo.estado = respuesta.status;
          throw fallo;
        }
        return cuerpo;
      });
    }).catch(function (fallo) {
      // El servidor ha respondido con un error (400, 409, 500…) → tal cual
      if (fallo && typeof fallo.estado === 'number' && fallo.estado > 0) throw fallo;
      // Sin conexión (file:// o servidor parado) → estado 0
      var sinServidor = new Error('Sin servidor: modo estático');
      sinServidor.estado = 0;
      sinServidor.datos = {};
      throw sinServidor;
    });
  }

  /** Texto de `detalle` cuando el servidor responde con un error detallado */
  function detalleDeError(fallo) {
    var detalle = fallo && fallo.datos ? fallo.datos.detalle : null;
    if (Array.isArray(detalle) && detalle.length) return ' ' + detalle[0];
    if (typeof detalle === 'string' && detalle) return ' ' + detalle;
    return '';
  }

  /* ======================================================================
     1. TEMA CLARO / OSCURO
     El script del <head> aplica el tema antes de pintar (sin parpadeo);
     aquí solo guardamos la elección y dejamos el botón sincronizado.
     ====================================================================== */
  const btnTema = document.getElementById('btnTema');
  const CLAVE_TEMA = 'casa-olivera-tema';

  function temaActual() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function aplicarTema(tema, guardar) {
    document.documentElement.setAttribute('data-theme', tema);
    if (guardar) {
      try { localStorage.setItem(CLAVE_TEMA, tema); } catch (e) { /* modo privado */ }
    }
    if (btnTema) {
      const oscuro = tema === 'dark';
      btnTema.setAttribute('aria-pressed', String(oscuro));
      btnTema.setAttribute('aria-label', oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
      btnTema.setAttribute('title', oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }
  }

  aplicarTema(temaActual(), false);

  if (btnTema) {
    btnTema.addEventListener('click', function () {
      aplicarTema(temaActual() === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* ======================================================================
     2. MENÚ MÓVIL (HAMBURGUESA)
     ====================================================================== */
  const btnMenu = document.getElementById('btnMenu');
  const navEnlaces = document.getElementById('navEnlaces');

  function cerrarMenu() {
    if (!navEnlaces || !btnMenu) return;
    navEnlaces.classList.remove('abierto');
    btnMenu.setAttribute('aria-expanded', 'false');
    btnMenu.setAttribute('aria-label', 'Abrir menú de navegación');
  }

  if (btnMenu && navEnlaces) {
    btnMenu.addEventListener('click', function () {
      const abierto = navEnlaces.classList.toggle('abierto');
      btnMenu.setAttribute('aria-expanded', String(abierto));
      btnMenu.setAttribute('aria-label', abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    });

    navEnlaces.querySelectorAll('a').forEach(function (enlace) {
      enlace.addEventListener('click', cerrarMenu);
    });

    document.addEventListener('click', function (evento) {
      if (!navEnlaces.classList.contains('abierto')) return;
      if (navEnlaces.contains(evento.target) || btnMenu.contains(evento.target)) return;
      cerrarMenu();
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && navEnlaces.classList.contains('abierto')) {
        cerrarMenu();
        btnMenu.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) cerrarMenu();
    });
  }

  /* ======================================================================
     3. NAVBAR: sombra al hacer scroll + sección activa (aria-current)
     ====================================================================== */
  const navbar = document.getElementById('navbar');

  function actualizarNavbar() {
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 12);
  }
  actualizarNavbar();
  window.addEventListener('scroll', actualizarNavbar, { passive: true });

  // Marca el enlace de la sección que esté en pantalla
  const enlacesNav = navEnlaces
    ? Array.prototype.slice.call(navEnlaces.querySelectorAll('a[href^="#"]'))
    : [];
  const mapaSecciones = enlacesNav
    .map(function (enlace) {
      const destino = document.querySelector(enlace.getAttribute('href'));
      return destino ? { enlace: enlace, seccion: destino } : null;
    })
    .filter(Boolean);

  function marcarSeccionActiva(seccion) {
    mapaSecciones.forEach(function (item) {
      if (item.seccion === seccion) item.enlace.setAttribute('aria-current', 'true');
      else item.enlace.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window && mapaSecciones.length) {
    const visibles = new Set();
    const observadorSecciones = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) visibles.add(entrada.target.id);
        else visibles.delete(entrada.target.id);
      });
      let activa = null;
      mapaSecciones.forEach(function (item) {
        if (!activa && visibles.has(item.seccion.id)) activa = item.seccion;
      });
      marcarSeccionActiva(activa);
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    mapaSecciones.forEach(function (item) { observadorSecciones.observe(item.seccion); });

    // De forma inmediata al pulsar (la animación de scroll es lenta)
    mapaSecciones.forEach(function (item) {
      item.enlace.addEventListener('click', function () { marcarSeccionActiva(item.seccion); });
    });
  }

  /* ======================================================================
     4. ANIMACIONES AL HACER SCROLL
     Cualquier elemento con la clase .animar obtiene .visible cuando entra
     en el viewport (una sola vez).
     ====================================================================== */
  const elementosAnimar = document.querySelectorAll('.animar');

  if ('IntersectionObserver' in window && elementosAnimar.length) {
    const observador = new IntersectionObserver(function (entradas, obs) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('visible');
          obs.unobserve(entrada.target); // solo una vez
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    elementosAnimar.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 80 + 'ms'; // escalonado suave
      observador.observe(el);
    });
  } else {
    elementosAnimar.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ======================================================================
     5. AÑO DINÁMICO EN EL PIE DE PÁGINA
     ====================================================================== */
  const anyo = document.getElementById('anyo');
  if (anyo) anyo.textContent = String(new Date().getFullYear());

  /* ======================================================================
     6. DATOS LOCALES DE RESPALDO
     --------------------------------------------------------------------
     Se usan si no hay servidor (doble clic en index.html). Cuando la API
     responde, estos arrays se sustituyen por los de la base de datos.
     ====================================================================== */

  /* --- 6.1 Carta (≥ 14 platos) ---------------------------------------- */
  const CARTA = [
    { id: 'e1', nombre: 'Esgarraet de la casa', descripcion: 'Pimiento asado a la brasa, bacalao curado en aceite de oliva nuevo de la Ribera y un hilo de ajo laminado.', categoria: 'entrantes', precio: 12.5, alergenos: ['Pescado'], vegetariano: false, picante: false, destacado: false, disponible: true },
    { id: 'e2', nombre: 'Croquetas de jamón ibérico (6 u.)', descripcion: 'Bechamel de cocción lenta con jamón de Teruel, rebozadas y fritas al momento.', categoria: 'entrantes', precio: 9.8, alergenos: ['Gluten', 'Lactosa', 'Huevo'], vegetariano: false, picante: false, destacado: false, disponible: true },
    { id: 'e3', nombre: 'Alcachofas de Benicarló a la brasa con romesco', descripcion: 'Pochadas con laurel, terminadas a la brasa y con romesco de ñora y avellana.', categoria: 'entrantes', precio: 12.9, alergenos: ['Frutos secos'], vegetariano: true, picante: false, destacado: false, disponible: true },
    { id: 'e4', nombre: 'Patatas bravas de la casa', descripcion: 'Patata de cuarta generación, salsa brava con pimentón de la Vera y alioli de ajo negro.', categoria: 'entrantes', precio: 7.5, alergenos: ['Huevo'], vegetariano: true, picante: true, destacado: false, disponible: true },
    { id: 'e5', nombre: 'Tomate de la huerta con ventresca y albahaca', descripcion: 'Tomate de rama de Alboraya cortado a cuchillo, ventresca de bonito y albahaca fresca.', categoria: 'entrantes', precio: 11.0, alergenos: ['Pescado'], vegetariano: false, picante: false, destacado: false, disponible: true },

    { id: 'a1', nombre: 'Arroz seco de bogavante y alioli de azafrán', descripcion: 'Fondo de cabezas de gamba hecho a primera hora, bogavante de la lonja y alioli montado en casa. Mínimo 2 personas.', categoria: 'arroces', precio: 26.5, alergenos: ['Moluscos', 'Huevo'], vegetariano: false, picante: false, destacado: true, disponible: true },
    { id: 'a2', nombre: 'Paella valenciana de carne', descripcion: 'Gallina, conejo, garrofó y tomate de la huerta. Solo los jueves y domingos, con 20 minutos de reposo.', categoria: 'arroces', precio: 18.5, alergenos: [], vegetariano: false, picante: false, destacado: false, disponible: true },
    { id: 'a3', nombre: 'Fideuà de sepia y gambas', descripcion: 'Fideo número 2 tostado, sepia tierna, gamba roja y alioli suave. Mínimo 2 personas.', categoria: 'arroces', precio: 19.8, alergenos: ['Moluscos'], vegetariano: false, picante: false, destacado: false, disponible: false },
    { id: 'a4', nombre: 'Arroz negro con calamares y alioli', descripcion: 'Tinta de sepia casera, calamar fresco y un golpe de limón. Se mancha: va con guante de tela.', categoria: 'arroces', precio: 21.0, alergenos: ['Moluscos', 'Huevo'], vegetariano: false, picante: false, destacado: false, disponible: true },

    { id: 'p1', nombre: 'Suquet de rape, almejas y patata panadera', descripcion: 'Rape de roca, almeja de la Albufera y patata confitada en su propio jugo con azafrán.', categoria: 'principales', precio: 22.0, alergenos: ['Pescado', 'Moluscos'], vegetariano: false, picante: false, destacado: false, disponible: true },
    { id: 'p2', nombre: 'Carrillera de buey al vino tinto', descripcion: 'Seis horas de cocción con Bobal de la tierra y parmentier de puerro.', categoria: 'principales', precio: 19.5, alergenos: ['Lactosa'], vegetariano: false, picante: false, destacado: false, disponible: true },
    { id: 'p3', nombre: 'Albóndigas de la abuela en salsa de tomate', descripcion: 'Carne picada a cuchillo, pan remojado en leche y tomate triturado cocinado dos horas.', categoria: 'principales', precio: 15.0, alergenos: ['Gluten', 'Huevo', 'Lactosa'], vegetariano: false, picante: false, destacado: false, disponible: true },
    { id: 'p4', nombre: 'Berenjena al calipso con miel de azahar', descripcion: 'Berenjena asada, leche de coco, cacahuete tostado y miel de azahar de la Serra de Cazorla.', categoria: 'principales', precio: 13.5, alergenos: ['Frutos secos'], vegetariano: true, picante: false, destacado: false, disponible: true },
    { id: 'p5', nombre: 'Secreto ibérico a la brasa con puré de manzana', descripcion: 'Bellota de Extremadura, 6 minutos de brasa de encina y puré de manzana reineta.', categoria: 'principales', precio: 23.0, alergenos: [], vegetariano: false, picante: false, destacado: false, disponible: true },

    { id: 'd1', nombre: 'Flan de la casa con nata montada', descripcion: 'Huevo campero, leche entera y caramelo oscuro. La receta no ha cambiado desde 1998.', categoria: 'postres', precio: 5.5, alergenos: ['Huevo', 'Lactosa'], vegetariano: true, picante: false, destacado: false, disponible: true },
    { id: 'd2', nombre: 'Tarta de queso al horno con membrillo', descripcion: 'Cuajada al horno a 220 °C, queso curado de oveja y compota de membrillo casera.', categoria: 'postres', precio: 6.5, alergenos: ['Gluten', 'Huevo', 'Lactosa'], vegetariano: true, picante: false, destacado: false, disponible: true },
    { id: 'd3', nombre: 'Horchata artesana con farton', descripcion: 'Chufa de València, canela en rama y farton de canela recién hecho.', categoria: 'postres', precio: 4.9, alergenos: ['Gluten', 'Frutos secos'], vegetariano: true, picante: false, destacado: false, disponible: true },
    { id: 'd4', nombre: 'Torrija caramelizada con helado de canela', descripcion: 'Bollo de brioche empapado en leche con canela, caramelizado a la plancha.', categoria: 'postres', precio: 6.2, alergenos: ['Gluten', 'Huevo', 'Lactosa'], vegetariano: true, picante: false, destacado: false, disponible: false },
    { id: 'd5', nombre: 'Naranjas de Valencia con canela y aceite', descripcion: 'Naranja de Ribera pelada a cuchillo, canela en polvo y un hilo de aceite de oliva virgen extra.', categoria: 'postres', precio: 4.5, alergenos: [], vegetariano: true, picante: false, destacado: false, disponible: true },

    { id: 'v1', nombre: 'Copa «Mar i Vent» blanco de Utiel-Requena', descripcion: 'Fermentado en tinaja, con tufa a flor y frescura de garnacha blanca. Copas de 15 cl.', categoria: 'vinos', precio: 4.5, alergenos: [], vegetariano: true, picante: false, destacado: false, disponible: true },
    { id: 'v2', nombre: 'Bobal ecológico, añada 2022 (botella)', descripcion: 'Viña de secano en altura, crianza de 4 meses en roble usado. 75 cl.', categoria: 'vinos', precio: 24.0, alergenos: [], vegetariano: true, picante: false, destacado: false, disponible: true },
    { id: 'v3', nombre: 'Xarel·lo «Pedra de Guix» (botella)', descripcion: 'Viña vieja sobre suelo calizo, fermentación en barrica y 8 meses sobre lías. 75 cl.', categoria: 'vinos', precio: 26.0, alergenos: [], vegetariano: true, picante: false, destacado: false, disponible: true },
    { id: 'v4', nombre: 'Cava brut nature de la casa (copa)', descripcion: 'Macabeo y parellada, 24 meses de crianza y sin azúcar de dosificación. Copas de 10 cl.', categoria: 'vinos', precio: 6.0, alergenos: [], vegetariano: true, picante: false, destacado: false, disponible: true }
  ];

  /* --- 6.2 Horarios (7 entradas) -------------------------------------- */
  const HORARIOS = [
    { dia: 'lunes', cerrado: true, turnos: [] },
    { dia: 'martes', cerrado: false, turnos: [{ desde: '13:00', hasta: '15:30' }, { desde: '20:00', hasta: '23:30' }] },
    { dia: 'miércoles', cerrado: false, turnos: [{ desde: '13:00', hasta: '15:30' }, { desde: '20:00', hasta: '23:30' }] },
    { dia: 'jueves', cerrado: false, turnos: [{ desde: '13:00', hasta: '15:30' }, { desde: '20:00', hasta: '23:30' }] },
    { dia: 'viernes', cerrado: false, turnos: [{ desde: '13:00', hasta: '15:30' }, { desde: '20:00', hasta: '23:30' }] },
    { dia: 'sábado', cerrado: false, turnos: [{ desde: '20:00', hasta: '00:00' }] },
    { dia: 'domingo', cerrado: false, turnos: [{ desde: '13:00', hasta: '16:00' }] }
  ];

  /* --- 6.3 Opiniones (4 reseñas) -------------------------------------- */
  const RESENAS = [
    {
      autor: 'Marta Sanchís',
      fecha: '12 de septiembre de 2026',
      estrellas: 5,
      texto: 'Fuimos por el arroz de bogavante y volvimos por el esgarrat. El trato es de barrio, el vino está a precio justo y te explican de dónde viene cada cosa sin postureo. Reserva, porque los sábados no hay mesa.',
      fuente: 'Google'
    },
    {
      autor: 'Jordi Peiró',
      fecha: '30 de agosto de 2026',
      estrellas: 5,
      texto: 'Cena de aniversario con el menú degustación de seis pasos. La alcachofa a la brasa y la torrija fueron lo mejor de la noche. Maridaje muy bien pensado y nos dejaron tardar sin problema.',
      fuente: 'Tripadvisor'
    },
    {
      autor: 'Lucía Herrera',
      fecha: '17 de agosto de 2026',
      estrellas: 5,
      texto: 'Soy celíaca y avisé al reservar: tenían plancha dedicada y me trajeron una ficha de alérgenos completa. Se agradece que te tomen en serio. El flan, de otra época.',
      fuente: 'Google'
    },
    {
      autor: 'Álvaro Mestre',
      fecha: '2 de agosto de 2026',
      estrellas: 5,
      texto: 'Comimos en la terraza de la Mercè con los niños. Menú infantil razonable, tronas disponibles y nadie nos miró mal cuando sonó el bebé. Paella valenciana de libro los domingos.',
      fuente: 'Tripadvisor'
    }
  ];

  /* Catálogo vivo: arranca con los locales y lo sustituye la API */
  let carta = CARTA.slice();

  /* --- Utilidades comunes --------------------------------------------- */
  function normalizar(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function euros(cantidad) {
    const n = Number(cantidad);
    return (isFinite(n) ? n : 0).toFixed(2).replace('.', ',') + ' €';
  }

  function crear(tag, clase, texto) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
  }

  /** Crea un SVG a partir de una cadena LITERAL (nunca datos del usuario) */
  function icono(html) {
    const nodo = document.createElement('span');
    nodo.setAttribute('aria-hidden', 'true');
    nodo.innerHTML = html;
    return nodo;
  }

  const SVG_VEGGIE =
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">' +
    '<path d="M20.5 3.5C10.5 3.5 4 9.4 4 17.3c0 1 .1 1.9.4 2.7.6-3.8 3.2-7.7 8-9.7-3.7 2.6-6 6.4-6.6 10.2 1 .4 2.2.6 3.3.6 7.4 0 11.4-7.7 11.4-17.6z"/>' +
    '</svg>';

  const SVG_PICANTE =
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">' +
    '<path d="M16.4 6.6c1.9-.4 3.6.4 4.6 2-1.2.8-2.7 1-4.1.5.5 1.3.4 2.8-.4 4-1.4 2.1-4 3.1-6.5 2.6-3.4-.7-6-3.9-6.3-7.4 3.3.4 6.5 1.9 8.7 4.5 1.4-2.1 2.1-4.7 1.9-7.2z"/>' +
    '<path d="M17.4 7.1c.9-.6 2-1 3.1-1.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '</svg>';

  const SVG_ESTRELLA =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"/>' +
    '</svg>';

  /* ======================================================================
     7. CARTA: pintado, chips de categoría y buscador
     ====================================================================== */
  const listaCarta = document.getElementById('listaCarta');
  const cartaVacia = document.getElementById('cartaVacia');
  const buscarCarta = document.getElementById('buscarCarta');
  const platoDestacado = document.getElementById('platoDestacado');
  const chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-categoria]'));

  let categoriaActiva = 'todos';
  let textoBusqueda = '';

  function platoFiltrado(plato) {
    if (categoriaActiva !== 'todos' && plato.categoria !== categoriaActiva) return false;
    if (!textoBusqueda) return true;
    const bate = normalizar(
      plato.nombre + ' ' + plato.descripcion + ' ' + plato.categoria + ' ' +
      (plato.alergenos || []).join(' ') + (plato.vegetariano ? ' vegetariano' : '')
    );
    return bate.indexOf(textoBusqueda) !== -1;
  }

  function tarjetaPlato(plato) {
    const tarjeta = crear('article', 'tarjeta');
    if (plato.disponible === false) tarjeta.classList.add('tarjeta--agotado');

    // Cabecera: nombre + precio
    const cabecera = crear('div', 'tarjeta__cabecera');
    cabecera.appendChild(crear('h3', 'tarjeta__nombre', plato.nombre));
    cabecera.appendChild(crear('span', 'tarjeta__precio', euros(plato.precio)));
    tarjeta.appendChild(cabecera);

    tarjeta.appendChild(crear('p', 'tarjeta__descripcion', plato.descripcion));

    // Etiquetas y alérgenos
    const etiquetas = crear('div', 'tarjeta__etiquetas');

    if (plato.destacado) {
      const b = crear('span', 'badge badge--destacado', 'Destacado');
      etiquetas.appendChild(b);
    }
    if (plato.vegetariano) {
      const b = crear('span', 'badge badge--veggie');
      b.appendChild(icono(SVG_VEGGIE));
      b.appendChild(document.createTextNode('Vegetariano'));
      etiquetas.appendChild(b);
    }
    if (plato.picante) {
      const b = crear('span', 'badge badge--picante');
      b.appendChild(icono(SVG_PICANTE));
      b.appendChild(document.createTextNode('Picante'));
      etiquetas.appendChild(b);
    }
    if (plato.disponible === false) {
      etiquetas.appendChild(crear('span', 'badge badge--agotado', 'Agotado hoy'));
    }

    (plato.alergenos || []).forEach(function (alergeno) {
      etiquetas.appendChild(crear('span', 'badge badge--alergeno', alergeno));
    });

    tarjeta.appendChild(etiquetas);
    return tarjeta;
  }

  function pintarCarta() {
    if (!listaCarta) return;
    const visibles = carta.filter(platoFiltrado);

    listaCarta.textContent = '';
    visibles.forEach(function (plato) {
      listaCarta.appendChild(tarjetaPlato(plato));
    });

    if (cartaVacia) cartaVacia.hidden = visibles.length > 0;
  }

  function pintarDestacado() {
    if (!platoDestacado) return;
    const plato = carta.filter(function (p) { return p.destacado && p.disponible !== false; })[0] ||
                  carta.filter(function (p) { return p.destacado; })[0];
    if (!plato) return;

    const nombre = platoDestacado.querySelector('.destacado__nombre');
    const descripcion = platoDestacado.querySelector('.destacado__descripcion');
    const precio = platoDestacado.querySelector('.destacado__precio');
    const nota = platoDestacado.querySelector('.destacado__nota');

    if (nombre) nombre.textContent = plato.nombre;
    if (descripcion) descripcion.textContent = plato.descripcion;
    if (precio) precio.textContent = euros(plato.precio);
    if (nota) {
      const extras = [plato.categoria].concat(plato.alergenos || []);
      nota.textContent = extras.join(' · ');
    }
  }

  // Chips de categoría (aria-pressed = activo)
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      categoriaActiva = chip.dataset.categoria || 'todos';
      chips.forEach(function (otro) {
        const activo = otro === chip;
        otro.classList.toggle('chip--activo', activo);
        otro.setAttribute('aria-pressed', String(activo));
      });
      pintarCarta();
    });
  });

  // Buscador insensible a tildes y mayúsculas
  if (buscarCarta) {
    buscarCarta.addEventListener('input', function () {
      textoBusqueda = normalizar(buscarCarta.value);
      pintarCarta();
    });
  }

  pintarCarta();
  pintarDestacado();

  /* ======================================================================
     8. OPINIONES (RESENAS locales o GET /api/resenas)
     ====================================================================== */
  const listaOpiniones = document.getElementById('listaOpiniones');

  function iniciales(nombre) {
    return String(nombre || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(function (palabra) { return palabra.charAt(0); })
      .join('')
      .toUpperCase();
  }

  function pintarOpiniones(resenas) {
    if (!listaOpiniones) return;
    const filas = Array.isArray(resenas) && resenas.length ? resenas : RESENAS;
    listaOpiniones.textContent = '';

    filas.forEach(function (reseña) {
      const figura = crear('figure', 'resena');

      const estrellas = crear('div', 'resena__estrellas');
      const total = Math.max(0, Math.min(5, Number(reseña.estrellas) || 5));
      estrellas.setAttribute('aria-label', 'Valoración: ' + total + ' de 5 estrellas');
      for (let i = 0; i < total; i++) estrellas.appendChild(icono(SVG_ESTRELLA));
      figura.appendChild(estrellas);

      figura.appendChild(crear('blockquote', 'resena__texto', '«' + reseña.texto + '»'));

      const pie = crear('figcaption', 'resena__pie');
      pie.appendChild(crear('span', 'resena__avatar', iniciales(reseña.autor)));

      const quien = crear('span', 'resena__quien');
      quien.appendChild(crear('span', 'resena__autor', reseña.autor));
      quien.appendChild(crear('span', 'resena__meta', reseña.fecha));
      pie.appendChild(quien);

      pie.appendChild(crear('span', 'resena__fuente', reseña.fuente));
      figura.appendChild(pie);

      listaOpiniones.appendChild(figura);
    });
  }

  pintarOpiniones(RESENAS);

  /* ======================================================================
     9. HORARIOS DE LA TABLA DE CONTACTO
     ====================================================================== */
  const tablaHorarios = document.getElementById('tablaHorarios');
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  function pintarHorarios(horarios) {
    if (!tablaHorarios) return;
    const filas = Array.isArray(horarios) && horarios.length ? horarios : HORARIOS;
    const hoy = DIAS[new Date().getDay()];

    tablaHorarios.textContent = '';

    filas.forEach(function (dia) {
      const tr = document.createElement('tr');
      if (dia.cerrado) tr.classList.add('cerrado');
      if (normalizar(dia.dia) === normalizar(hoy)) tr.classList.add('hoy');

      const th = document.createElement('td');
      th.textContent = dia.dia.charAt(0).toUpperCase() + dia.dia.slice(1);
      tr.appendChild(th);

      const td = document.createElement('td');
      td.textContent = dia.cerrado
        ? 'Cerrado por descanso'
        : (dia.turnos || [])
            .map(function (turno) { return turno.desde + ' – ' + turno.hasta; })
            .join(' · ');
      tr.appendChild(td);

      tablaHorarios.appendChild(tr);
    });
  }

  pintarHorarios(HORARIOS);

  /* ======================================================================
     10. FAQ: ACORDEÓN (un solo panel abierto a la vez)
     ====================================================================== */
  const preguntas = Array.prototype.slice.call(document.querySelectorAll('.faq-pregunta'));

  preguntas.forEach(function (boton) {
    boton.addEventListener('click', function () {
      const abierto = boton.getAttribute('aria-expanded') === 'true';

      preguntas.forEach(function (otra) {
        otra.setAttribute('aria-expanded', 'false');
        const panel = document.getElementById(otra.getAttribute('aria-controls'));
        if (panel) panel.hidden = true;
        const item = otra.closest ? otra.closest('.faq-item') : null;
        if (item) item.classList.remove('faq-item--abierto');
      });

      if (!abierto) {
        boton.setAttribute('aria-expanded', 'true');
        const panel = document.getElementById(boton.getAttribute('aria-controls'));
        if (panel) panel.hidden = false;
        const item = boton.closest ? boton.closest('.faq-item') : null;
        if (item) item.classList.add('faq-item--abierto');
      }
    });
  });

  /* ======================================================================
     11. FORMULARIO DE RESERVA
     --------------------------------------------------------------------
     · Al elegir fecha o comensales → GET /api/disponibilidad
     · Validación campo a campo
     · Envío → POST /api/reservas (201 · 400/409 · estado 0 = modo demo)
     ====================================================================== */
  const formReserva = document.getElementById('formReserva');

  if (formReserva) {
    const campoFecha = document.getElementById('fecha');
    const campoHora = document.getElementById('hora');
    const campoComensales = document.getElementById('comensales');
    const campoNombre = document.getElementById('nombre');
    const campoTelefono = document.getElementById('telefono');
    const campoEmail = document.getElementById('email');
    const notaReserva = document.getElementById('reservaNota');
    const botonReserva = document.getElementById('btnReserva');

    const errFecha = document.getElementById('errFecha');
    const errHora = document.getElementById('errHora');
    const errComensales = document.getElementById('errComensales');
    const errNombre = document.getElementById('errNombre');
    const errTelefono = document.getElementById('errTelefono');
    const errEmail = document.getElementById('errEmail');

    const patronEmail = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    let peticionDisponibilidad = 0;
    let temporizadorNota;

    /* --- Utilidades de fecha --- */
    function aISO(fecha) {
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      return anio + '-' + mes + '-' + dia;
    }

    const hoy = new Date();
    const hoyISO = aISO(hoy);
    const limite = new Date(hoy.getTime());
    limite.setDate(limite.getDate() + 90);
    const limiteISO = aISO(limite);

    if (campoFecha) {
      campoFecha.min = hoyISO;          // no se puede reservar en el pasado
      campoFecha.max = limiteISO;       // máximo 90 días por delante
    }

    /* --- Horas: servidor o lista fija local --- */
    // true cuando el servidor responde que ese día el restaurante está cerrado
    let diaCerrado = false;

    function horasFijas() {
      return ['13:00', '13:30', '14:00', '14:30', '15:00',
              '20:00', '20:30', '21:00', '21:30', '22:00', '22:30']
        .map(function (hora) { return { hora: hora, libre: true }; });
    }

    function ponerHoras(horas, textoPlaceholder) {
      if (!campoHora) return;
      campoHora.textContent = '';

      const inicial = document.createElement('option');
      inicial.value = '';
      inicial.textContent = textoPlaceholder;
      campoHora.appendChild(inicial);

      horas.forEach(function (item) {
        const opcion = document.createElement('option');
        opcion.value = item.hora;
        opcion.textContent = item.libre === false ? item.hora + ' (ocupada)' : item.hora;
        if (item.libre === false) opcion.disabled = true;
        campoHora.appendChild(opcion);
      });

      campoHora.value = '';
    }

    function cargarDisponibilidad() {
      if (!campoFecha || !campoHora) return;
      const fecha = campoFecha.value;

      if (!fecha) {
        ponerHoras([], 'Elige primero una fecha…');
        return;
      }

      const comensales = parseInt(campoComensales ? campoComensales.value : '2', 10) || 2;
      const peticion = ++peticionDisponibilidad;

      diaCerrado = false;
      marcarCampo(campoHora, errHora, true);
      campoHora.disabled = true;
      ponerHoras([], 'Consultando disponibilidad…');

      api('/api/disponibilidad?fecha=' + encodeURIComponent(fecha) +
          '&comensales=' + comensales)
        .then(function (datos) {
          if (peticion !== peticionDisponibilidad) return; // respuesta obsoleta

          if (datos && datos.cerrado) {
            // Día cerrado según el servidor: no se ofrecen horas y se explica
            // el motivo (así no se llega al 400 del backend).
            diaCerrado = true;
            ponerHoras([], 'Cerrado ese día — elige otra fecha…');
            marcarCampo(campoHora, errHora, false);
            textoError(errHora, 'Ese día no abrimos. Elige otra fecha o llámanos al 963 12 34 56.');
            return;
          }

          if (datos && Array.isArray(datos.horas) && datos.horas.length) {
            ponerHoras(
              datos.horas.map(function (h) {
                return { hora: String(h.hora), libre: h.libre !== false };
              }),
              'Elige una hora…'
            );
            return;
          }

          ponerHoras(horasFijas(), 'Elige una hora…');
        })
        .catch(function (fallo) {
          if (peticion !== peticionDisponibilidad) return;
          if (fallo && fallo.estado === 0) {
            console.info('[api] Modo demo: sin servidor, se usan las horas fijas de js/main.js.');
          } else {
            console.info('[api] Disponibilidad no disponible: ' + (fallo && fallo.message));
          }
          // El formulario nunca se queda sin horas
          ponerHoras(horasFijas(), 'Elige una hora…');
        })
        .then(function () {
          if (peticion === peticionDisponibilidad) campoHora.disabled = false;
        });
    }

    if (campoFecha) campoFecha.addEventListener('change', function () {
      limpiarCampo(campoFecha, errFecha);
      cargarDisponibilidad();
    });
    if (campoComensales) campoComensales.addEventListener('change', function () {
      limpiarCampo(campoComensales, errComensales);
      if (campoFecha && campoFecha.value) cargarDisponibilidad();
    });

    /* --- Validación campo a campo --- */
    function marcarCampo(campo, aviso, esValido) {
      if (!campo) return true;
      campo.classList.toggle('es-invalido', !esValido);
      campo.setAttribute('aria-invalid', esValido ? 'false' : 'true');
      if (aviso) aviso.hidden = esValido;
      return esValido;
    }

    function limpiarCampo(campo, aviso) {
      marcarCampo(campo, aviso, true);
    }

    function textoError(aviso, mensaje) {
      if (aviso) aviso.textContent = mensaje;
    }

    function validarFecha() {
      const valor = campoFecha ? campoFecha.value : '';
      let ok = Boolean(valor) && valor >= hoyISO && valor <= limiteISO;
      textoError(errFecha, valor && valor < hoyISO
        ? 'Esa fecha ya ha pasado. Elige un día desde hoy.'
        : 'Elige una fecha entre hoy y los próximos 90 días.');
      return marcarCampo(campoFecha, errFecha, ok);
    }

    function validarHora() {
      const ok = Boolean(campoHora && campoHora.value);
      textoError(errHora, diaCerrado
        ? 'Ese día no abrimos. Elige otra fecha o llámanos al 963 12 34 56.'
        : 'Elige una hora entre las disponibles.');
      return marcarCampo(campoHora, errHora, ok);
    }

    function validarComensales() {
      const n = parseInt(campoComensales ? campoComensales.value : '', 10);
      const ok = n >= 1 && n <= 12;
      textoError(errComensales, 'Entre 1 y 12 comensales; para grupos mayores, llámanos al 963 12 34 56.');
      return marcarCampo(campoComensales, errComensales, ok);
    }

    function validarNombre() {
      const ok = Boolean(campoNombre) && campoNombre.value.trim().length >= 2;
      textoError(errNombre, 'Escribe tu nombre y apellidos (mínimo 2 caracteres).');
      return marcarCampo(campoNombre, errNombre, ok);
    }

    function validarTelefono() {
      const digitos = campoTelefono ? campoTelefono.value.replace(/\D/g, '') : '';
      const ok = digitos.length >= 9;
      textoError(errTelefono, 'Necesitamos un teléfono válido de al menos 9 dígitos.');
      return marcarCampo(campoTelefono, errTelefono, ok);
    }

    function validarEmail() {
      const valor = campoEmail ? campoEmail.value.trim() : '';
      const ok = valor === '' || patronEmail.test(valor);
      textoError(errEmail, 'Escribe un correo válido (nombre@dominio.com) o déjalo vacío.');
      return marcarCampo(campoEmail, errEmail, ok);
    }

    const validaciones = [
      { campo: campoFecha, aviso: errFecha, validar: validarFecha },
      { campo: campoHora, aviso: errHora, validar: validarHora },
      { campo: campoComensales, aviso: errComensales, validar: validarComensales },
      { campo: campoNombre, aviso: errNombre, validar: validarNombre },
      { campo: campoTelefono, aviso: errTelefono, validar: validarTelefono },
      { campo: campoEmail, aviso: errEmail, validar: validarEmail }
    ];

    validaciones.forEach(function (item) {
      if (!item.campo) return;
      item.campo.addEventListener('blur', item.validar);
      item.campo.addEventListener('change', function () {
        if (item.campo.classList.contains('es-invalido')) item.validar();
      });
      item.campo.addEventListener('input', function () {
        if (item.campo.classList.contains('es-invalido')) item.validar();
      });
    });

    /* --- Aviso de resultado --- */
    function mostrarNota(texto, esError) {
      if (!notaReserva) return;
      notaReserva.textContent = texto;
      notaReserva.classList.toggle('exito', !esError);
      notaReserva.classList.toggle('error', Boolean(esError));
      window.clearTimeout(temporizadorNota);
      if (!esError) {
        temporizadorNota = window.setTimeout(function () {
          notaReserva.textContent = '';
          notaReserva.classList.remove('exito', 'error');
        }, 12000);
      }
    }

    function limpiarFormulario() {
      formReserva.reset();
      validaciones.forEach(function (item) { marcarCampo(item.campo, item.aviso, true); });
      ponerHoras([], 'Elige primero una fecha…');
      diaCerrado = false;
      if (notaReserva) notaReserva.classList.remove('error');
    }

    /* --- Envío --- */
    formReserva.addEventListener('submit', function (evento) {
      evento.preventDefault();

      const todos = validaciones.map(function (item) { return item.validar(); });
      if (todos.indexOf(false) !== -1) {
        const primero = formReserva.querySelector('.es-invalido');
        if (primero) primero.focus();
        return;
      }

      const textoBoton = botonReserva ? botonReserva.textContent : '';
      if (botonReserva) {
        botonReserva.disabled = true;
        botonReserva.setAttribute('aria-busy', 'true');
        botonReserva.textContent = 'Enviando…';
      }

      function restaurarBoton() {
        if (!botonReserva) return;
        botonReserva.disabled = false;
        botonReserva.removeAttribute('aria-busy');
        botonReserva.textContent = textoBoton;
      }

      api('/api/reservas', {
        method: 'POST',
        body: JSON.stringify({
          fecha: campoFecha.value,
          hora: campoHora.value,
          comensales: parseInt(campoComensales.value, 10),
          nombre: campoNombre.value.trim(),
          telefono: campoTelefono.value.trim(),
          email: campoEmail.value.trim(),
          notas: document.getElementById('notas')
            ? document.getElementById('notas').value.trim()
            : ''
        })
      })
        .then(function (datos) {
          let texto = '✓ Reserva solicitada. Te confirmamos por teléfono en menos de 2 h.';
          if (datos.mensaje) texto = '✓ ' + datos.mensaje;
          if (datos.referencia) texto += ' Referencia: ' + datos.referencia;
          mostrarNota(texto, false);
          limpiarFormulario();
        })
        .catch(function (fallo) {
          if (fallo && fallo.estado) {
            // 400 / 409 u otro error que decide el servidor
            mostrarNota('✗ ' + fallo.message + detalleDeError(fallo), true);
          } else {
            // Sin servidor (index.html abierto directamente): modo demo
            console.info('[api] Modo demo: no hay servidor, la reserva no se ha enviado. Ejecuta `npm start`.');
            mostrarNota(
              '✓ ¡Mesa apuntada! Te llamaremos para confirmarla. ' +
              '(Modo demo: ejecuta `npm start` para guardar la reserva en el servidor.)',
              false
            );
            limpiarFormulario();
          }
        })
        .then(restaurarBoton);
    });
  }

  /* ======================================================================
     12. CONTADORES ANIMADOS DE LA FRANJA DE CIFRAS
     Suben desde 0 hasta data-objetivo cuando la franja entra en pantalla.
     ====================================================================== */
  const idsCifras = ['cifra1', 'cifra2', 'cifra3', 'cifra4'];
  const nodosCifra = idsCifras
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  function animarCifra(elemento) {
    const objetivo = parseInt(elemento.dataset.objetivo, 10) || 0;
    const duracion = 1700;
    const inicio = performance.now();

    function paso(ahora) {
      const transcurrido = Math.min((ahora - inicio) / duracion, 1);
      const eased = 1 - Math.pow(1 - transcurrido, 3); // ease out cubic
      const valor = Math.round(objetivo * eased);
      elemento.textContent = valor.toLocaleString('es-ES');
      if (transcurrido < 1) {
        requestAnimationFrame(paso);
      } else {
        elemento.textContent = objetivo.toLocaleString('es-ES');
        elemento.dataset.animado = 'si'; // no pisar si llega la API después
      }
    }

    requestAnimationFrame(paso);
  }

  if (nodosCifra.length) {
    const bloqueCifras = document.getElementById('cifras');
    if ('IntersectionObserver' in window && bloqueCifras) {
      const obsCifras = new IntersectionObserver(function (entradas, obs) {
        entradas.forEach(function (entrada) {
          if (entrada.isIntersecting) {
            nodosCifra.forEach(animarCifra);
            obs.disconnect();
          }
        });
      }, { threshold: 0.35 });
      obsCifras.observe(bloqueCifras);
    } else {
      nodosCifra.forEach(function (elemento) {
        const objetivo = parseInt(elemento.dataset.objetivo, 10) || 0;
        elemento.textContent = objetivo.toLocaleString('es-ES');
        elemento.dataset.animado = 'si';
      });
    }
  }

  /* ======================================================================
     13. CARGA INICIAL DESDE EL SERVIDOR (GET /api/*)
     --------------------------------------------------------------------
     Si la API responde, los datos de la base de datos SUSTITUYEN a los
     arrays locales. Si no responde, se quedan los locales: la web se ve y
     funciona exactamente igual (modo estático / modo demo).
     ====================================================================== */

  // 13.1 Carta
  api('/api/carta')
    .then(function (filas) {
      if (!Array.isArray(filas) || !filas.length) return;
      carta = filas;
      pintarCarta();
      pintarDestacado();
      console.info('[api] ' + filas.length + ' platos cargados desde el servidor.');
    })
    .catch(function () {
      console.info('[api] Modo demo: sin servidor, la carta sale del array CARTA de js/main.js (modo estático).');
    });

  // 13.2 Horarios
  api('/api/horarios')
    .then(function (filas) {
      if (!Array.isArray(filas) || !filas.length) return;
      pintarHorarios(filas);
      console.info('[api] ' + filas.length + ' días de horario cargados desde el servidor.');
    })
    .catch(function () {
      console.info('[api] Modo demo: sin servidor, los horarios salen del array HORARIOS de js/main.js (modo estático).');
    });

  // 13.3 Opiniones
  api('/api/resenas')
    .then(function (filas) {
      if (!Array.isArray(filas) || !filas.length) return;
      pintarOpiniones(filas);
      console.info('[api] ' + filas.length + ' opiniones cargadas desde el servidor.');
    })
    .catch(function () {
      console.info('[api] Modo demo: sin servidor, las opiniones salen del array RESENAS de js/main.js (modo estático).');
    });

});
