/* ==========================================================================
   FLUXO — Lógica de la plantilla
   JavaScript vanilla, sin librerías.
   Secciones:
      0. Cliente de la API (envoltorio de fetch con modo demo)
      1. Tema claro / oscuro
      2. Menú móvil (hamburguesa)
      3. Navbar con sombra al hacer scroll
      4. Animaciones al hacer scroll (IntersectionObserver)
      5. Año dinámico en el pie
      6. Precios: conmutador mensual / anual + precios de GET /api/planes
      7. FAQ: acordeón (solo uno abierto a la vez)
      8. Formulario de registro del hero (POST /api/registro)
      9. Pago con Stripe (enlace "Contratar" → POST /api/pago/sesion)
     10. Aviso de vuelta del checkout (?pago=ok)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* ======================================================================
     0. CLIENTE DE LA API (envoltorio mínimo de fetch)
     --------------------------------------------------------------------
     Esta plantilla funciona de dos formas:
       a) Abriendo index.html directamente → todo lo local funciona y el
          formulario responde en "modo demo" (no envía nada).
       b) Con servidor (`npm start` → http://localhost:3000) → el formulario
          registra de verdad en POST /api/registro (se guarda en SQLite) y
          los precios se leen de GET /api/planes.
     Si el fetch falla (modalidad a), el código continúa sin romperse.
     ====================================================================== */

  const API_BASE = ''; // '' = mismo dominio. Ej: 'http://localhost:3000'

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

  /** Texto de `detalle` cuando el servidor responde con un error detallado */
  function detalleDeError(fallo) {
    const detalle = fallo && fallo.datos ? fallo.datos.detalle : null;
    if (Array.isArray(detalle) && detalle.length) return ' ' + detalle[0];
    if (typeof detalle === 'string' && detalle) return ' ' + detalle;
    return '';
  }

  /* ======================================================================
     1. TEMA CLARO / OSCURO
     El script del <head> ya aplica el tema antes de pintar para evitar
     parpadeos; aquí solo guardamos la elección y dejamos el botón listo.
     ====================================================================== */
  const btnTema = document.getElementById('btnTema');
  const CLAVE_TEMA = 'fluxo-tema';

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
      btnTema.setAttribute('aria-label', oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
      btnTema.setAttribute('title', oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }
  }

  // Sincroniza el atributo aria con el tema ya cargado
  aplicarTema(temaActual(), false);

  if (btnTema) {
    btnTema.addEventListener('click', function () {
      aplicarTema(temaActual() === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* ======================================================================
     2. MENÚ MÓVIL (hamburguesa)
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

    // Al pulsar un enlace se cierra el menú
    navEnlaces.querySelectorAll('a').forEach(function (enlace) {
      enlace.addEventListener('click', cerrarMenu);
    });

    // Al pulsar fuera del menú se cierra
    document.addEventListener('click', function (evento) {
      if (!navEnlaces.classList.contains('abierto')) return;
      if (navEnlaces.contains(evento.target) || btnMenu.contains(evento.target)) return;
      cerrarMenu();
    });

    // Con Escape se cierra y se devuelve el foco al botón
    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && navEnlaces.classList.contains('abierto')) {
        cerrarMenu();
        btnMenu.focus();
      }
    });

    // Al pasar a escritorio el menú vuelve a su estado normal
    window.addEventListener('resize', function () {
      if (window.innerWidth > 640) cerrarMenu();
    });
  }

  /* ======================================================================
     3. NAVBAR: sombra al hacer scroll
     ====================================================================== */
  const navbar = document.getElementById('navbar');

  function actualizarNavbar() {
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 12);
  }
  actualizarNavbar();
  window.addEventListener('scroll', actualizarNavbar, { passive: true });

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
      // Pequeño escalonado entre tarjetas hermanas
      el.style.transitionDelay = (i % 3) * 90 + 'ms';
      observador.observe(el);
    });
  } else {
    // Navegadores sin soporte: mostramos todo de inmediato
    elementosAnimar.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ======================================================================
     5. AÑO DINÁMICO EN EL PIE DE PÁGINA
     ====================================================================== */
  const anio = document.getElementById('anio');
  if (anio) anio.textContent = String(new Date().getFullYear());

  /* ======================================================================
     6. PRECIOS: CONMUTADOR MENSUAL / ANUAL
     Los importes están en el HTML con data-mensual y data-anual.
     Si hay servidor, antes de pintar se leen de GET /api/planes y se
     sobrescriben esos atributos; si no hay, se quedan los del HTML.
     ====================================================================== */
  const btnPeriodo = document.getElementById('btnPeriodo');
  const etiquetaMensual = document.getElementById('etiquetaMensual');
  const etiquetaAnual = document.getElementById('etiquetaAnual');
  let facturacionAnual = false;

  function pintarPrecios() {
    // Importes
    document.querySelectorAll('.plan-precio .importe').forEach(function (nodo) {
      const valor = facturacionAnual ? nodo.dataset.anual : nodo.dataset.mensual;
      if (!valor) return;
      const contenedor = nodo.closest('.plan-precio');
      if (contenedor) contenedor.classList.add('importe-cambiando');
      setTimeout(function () {
        nodo.textContent = valor;
        if (contenedor) contenedor.classList.remove('importe-cambiando');
      }, 160);
    });

    // Nota bajo el precio
    document.querySelectorAll('.plan-nota').forEach(function (nodo) {
      nodo.textContent = facturacionAnual ? nodo.dataset.notaAnual : nodo.dataset.notaMensual;
    });

    // Estados accesibles y etiquetas
    if (btnPeriodo) btnPeriodo.setAttribute('aria-checked', String(facturacionAnual));
    if (etiquetaMensual) etiquetaMensual.classList.toggle('activo', !facturacionAnual);
    if (etiquetaAnual) etiquetaAnual.classList.toggle('activo', facturacionAnual);
  }

  if (btnPeriodo) {
    btnPeriodo.addEventListener('click', function () {
      facturacionAnual = !facturacionAnual;
      pintarPrecios();
    });
  }

  /* --- 6b. Los precios pueden llegar de la base de datos ---------------- */
  // "Básico" → "basico": así comparamos el nombre del HTML con `clave`
  function textoPlano(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  // 84 en vez de 84.00 (para las notas "Facturado anualmente (84 €)")
  function euros(cantidad) {
    const n = Math.round(Number(cantidad) * 100) / 100;
    return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
  }

  function sincronizarPlan(plan) {
    if (!plan || !plan.clave) return;

    let tarjeta = null;
    document.querySelectorAll('#precios .plan').forEach(function (t) {
      const nombre = t.querySelector('.plan-nombre');
      const texto = nombre ? nombre.textContent.trim() : '';
      if (textoPlano(texto) === textoPlano(plan.clave) || texto === plan.nombre) tarjeta = t;
    });
    if (!tarjeta) return; // plan de la BD que no está en el HTML: se ignora

    const importe = tarjeta.querySelector('.importe');
    if (importe && plan.precio_mensual !== undefined) {
      importe.dataset.mensual = String(plan.precio_mensual);
      importe.dataset.anual = String(plan.precio_anual);
    }

    const nota = tarjeta.querySelector('.plan-nota');
    if (nota) {
      if (nota.hasAttribute('data-nota-mensual')) nota.dataset.notaMensual = 'Facturado mes a mes';
      if (nota.hasAttribute('data-nota-anual')) {
        nota.dataset.notaAnual = 'Facturado anualmente (' + euros(plan.precio_anual * 12) + ' €)';
      }
    }
  }

  let preciosPintados = false;
  function pintarPreciosInicial() {
    if (preciosPintados) return;
    preciosPintados = true;
    pintarPrecios();
  }

  api('/api/planes')
    .then(function (planes) {
      if (Array.isArray(planes) && planes.length) {
        planes.forEach(sincronizarPlan);
        console.info('[api] Precios sincronizados desde el servidor (' + planes.length + ' planes).');
      }
      pintarPreciosInicial();
    })
    .catch(function () {
      console.info('[api] Sin servidor: los precios salen del index.html (modo estático).');
      pintarPreciosInicial();
    });

  // Por si el fetch no responde (por ejemplo, abriendo el archivo con file://)
  window.setTimeout(pintarPreciosInicial, 800);

  /* ======================================================================
     7. FAQ: ACORDEÓN
     Usamos <details> nativo; aquí limitamos a que solo esté abierta una
     pregunta a la vez (experiencia más limpia).
     ====================================================================== */
  const preguntas = Array.from(document.querySelectorAll('.faq-lista details'));

  preguntas.forEach(function (detalle) {
    detalle.addEventListener('toggle', function () {
      if (!detalle.open) return;
      preguntas.forEach(function (otra) {
        if (otra !== detalle) otra.open = false;
      });
    });
  });

  /* ======================================================================
     8. FORMULARIO DE REGISTRO DEL HERO
     Validación en cliente + alta real en POST /api/registro.
     Sin servidor (index.html suelto) → mensaje de éxito de siempre y
     aviso por consola de "modo demo".
     ====================================================================== */
  const formRegistro = document.getElementById('formRegistro');
  const notaRegistro = document.getElementById('registroNota');
  const NOTA_INICIAL = notaRegistro ? notaRegistro.textContent : '';
  const CLAVE_PLAN = 'fluxo-plan';

  // Plan elegido: ?plan=pro en la URL → localStorage → 'pro' por defecto
  function obtenerPlan() {
    try {
      const params = new URLSearchParams(window.location.search);
      const enUrl = params.get('plan');
      if (enUrl) {
        localStorage.setItem(CLAVE_PLAN, enUrl);
        return enUrl;
      }
      return localStorage.getItem(CLAVE_PLAN) || 'pro';
    } catch (e) {
      return 'pro';
    }
  }
  const planElegido = obtenerPlan();

  if (formRegistro && notaRegistro) {
    formRegistro.addEventListener('submit', function (evento) {
      evento.preventDefault();
      const campo = formRegistro.querySelector('input[type="email"]');
      const valor = campo ? campo.value.trim() : '';
      const esValido = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor);

      notaRegistro.classList.remove('exito', 'error');

      if (!esValido) {
        notaRegistro.classList.add('error');
        notaRegistro.textContent = 'Introduce un correo válido, por ejemplo tu@empresa.com';
        if (campo) campo.focus();
        return;
      }

      const boton = formRegistro.querySelector('button[type="submit"]');
      const textoBoton = boton ? boton.textContent : '';
      if (boton) {
        boton.disabled = true;
        boton.textContent = 'Enviando…';
      }

      function restaurarBoton() {
        if (boton) {
          boton.disabled = false;
          boton.textContent = textoBoton;
        }
      }

      function mostrarExito(texto) {
        notaRegistro.classList.remove('error');
        notaRegistro.classList.add('exito');
        notaRegistro.textContent = texto;
        formRegistro.reset();
        // Volvemos al texto original pasados unos segundos
        setTimeout(function () {
          notaRegistro.classList.remove('exito');
          notaRegistro.textContent = NOTA_INICIAL;
        }, 6000);
      }

      api('/api/registro', {
        method: 'POST',
        body: JSON.stringify({
          email: valor,
          plan: planElegido,
          periodo: facturacionAnual ? 'anual' : 'mensual'
        })
      })
        .then(function (datos) {
          mostrarExito(datos.mensaje || ('¡Listo! Te hemos enviado un enlace a ' + valor));
        })
        .catch(function (fallo) {
          if (fallo.estado) {
            // El servidor respondió (400, 429…): mostramos su mensaje
            notaRegistro.classList.remove('exito');
            notaRegistro.classList.add('error');
            notaRegistro.textContent = fallo.message + detalleDeError(fallo);
            if (campo) campo.value = valor;
          } else {
            // Sin servidor (index.html abierto directamente): modo demo
            console.info('[api] Modo demo: no hay servidor, el registro no se ha enviado. Ejecuta `npm start`.');
            mostrarExito('¡Listo! Te hemos enviado un enlace a ' + valor);
          }
        })
        .then(restaurarBoton);
    });
  }

  /* ======================================================================
     9. PAGO CON STRIPE (enlace "Contratar ahora con tarjeta")
     --------------------------------------------------------------------
     Llama a POST /api/pago/sesion con el plan elegido:
       · Con claves en .env → te redirige al checkout real de Stripe.
       · Sin configurar     → mensaje de modo demo + te lleva al alta.
       · Sin servidor       → aviso de que hace falta `npm start`.
     El email del formulario se envía si ya lo has escrito.
     ====================================================================== */
  let temporizadorNota;

  function avisarEnRegistro(texto, esError) {
    if (!notaRegistro) return;
    notaRegistro.classList.toggle('error', Boolean(esError));
    notaRegistro.classList.toggle('exito', !esError);
    notaRegistro.textContent = texto;
    window.clearTimeout(temporizadorNota);
    temporizadorNota = window.setTimeout(function () {
      notaRegistro.classList.remove('exito', 'error');
      notaRegistro.textContent = NOTA_INICIAL;
    }, 9000);
  }

  function irAlRegistro() {
    const destino = document.getElementById('registro');
    if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const campo = formRegistro ? formRegistro.querySelector('input[type="email"]') : null;
    if (campo) {
      window.setTimeout(function () {
        try { campo.focus({ preventScroll: true }); } catch (e) { campo.focus(); }
      }, 500);
    }
  }

  document.querySelectorAll('[data-comprar]').forEach(function (boton) {
    boton.addEventListener('click', function (evento) {
      evento.preventDefault();

      const plan = boton.getAttribute('data-comprar') || 'pro';
      const campoEmail = formRegistro ? formRegistro.querySelector('input[type="email"]') : null;
      const email = campoEmail ? campoEmail.value.trim() : '';
      const textoOriginal = boton.textContent;

      // La elección se guarda para que el formulario de alta la utilice
      try { localStorage.setItem(CLAVE_PLAN, plan); } catch (e) { /* sin storage */ }

      boton.textContent = 'Abriendo pago seguro…';
      boton.setAttribute('aria-busy', 'true');

      api('/api/pago/sesion', {
        method: 'POST',
        body: JSON.stringify({
          plan: plan,
          periodo: facturacionAnual ? 'anual' : 'mensual',
          email: email
        })
      })
        .then(function (datos) {
          if (datos.modo === 'stripe' && datos.url) {
            window.location.href = datos.url; // → checkout de Stripe
            return;
          }
          // Modo demo: no se cobra nada, seguimos por la prueba gratuita
          console.info('[api] Pago en modo demo. ' + (datos.mensaje || ''));
          avisarEnRegistro('💳 ' + (datos.mensaje || 'Pagos en modo demo: no se cobra nada.'), false);
          irAlRegistro();
        })
        .catch(function (fallo) {
          if (fallo.estado) {
            // El servidor ha respondido con un error de configuración/validación
            console.info('[api] Error de pago:', fallo.message);
            avisarEnRegistro('⚠️ ' + fallo.message + detalleDeError(fallo), true);
            irAlRegistro();
          } else {
            // index.html abierto directamente, sin servidor
            console.info('[api] Sin servidor no hay checkout. Ejecuta `npm start`.');
            avisarEnRegistro('Para contratar hace falta el servidor: ejecuta `npm start` y vuelve a intentarlo.', true);
            irAlRegistro();
          }
        })
        .then(function () {
          boton.textContent = textoOriginal;
          boton.removeAttribute('aria-busy');
        });
    });
  });

  /* ======================================================================
     10. VUELTA DEL CHECKOUT: ?pago=ok
     Stripe redirige a /?pago=ok#registro tras pagar. Avisamos y limpiamos
     la URL para que no se repita al recargar.
     ====================================================================== */
  (function avisoPagoExitoso() {
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (e) {
      return;
    }
    if (params.get('pago') !== 'ok') return;

    params.delete('pago');
    const limpia =
      window.location.pathname +
      (params.toString() ? '?' + params.toString() : '') +
      window.location.hash;
    try { window.history.replaceState({}, '', limpia); } catch (e) { /* IE */ }

    avisarEnRegistro(
      '✅ ¡Pago enviado a Stripe! Si has configurado STRIPE_WEBHOOK_SECRET en .env, ' +
        'tu suscripción aparecerá como activa en /api/suscripciones. (Modo demo: no se ha cobrado nada.)',
      false
    );
    irAlRegistro();
  })();

});
