/* ==========================================================================
   PORTFOLIO PERSONAL · PLANTILLA 01
   JavaScript vanilla — sin librerías
   Secciones:
     1. Tema claro / oscuro
     2. Menú móvil (hamburguesa)
     3. Navbar al hacer scroll
     4. Animaciones al hacer scroll (IntersectionObserver)
     5. Año dinámico en el pie
     6. Filtro de proyectos por categoría
     7. Barras de progreso animadas
     8. Navegación activa según sección visible
     9. Formulario de contacto (validación + envío real a la API)
    10. API: enlaces de los proyectos y comprobación del servidor
   ========================================================================== */

(function () {
  'use strict';

  /* Esperamos a que el DOM esté completamente cargado */
  document.addEventListener('DOMContentLoaded', function () {

    /* ====================================================================
       0. CLIENTE DE LA API (envoltorio mínimo de fetch)
       --------------------------------------------------------------------
       Esta plantilla funciona de dos formas:
         a) Abriendo index.html directamente → todo lo local funciona y el
            formulario responde en modo demo (no envía nada).
         b) Con servidor (`npm start` → http://localhost:3000) → el formulario
            envía de verdad a POST /api/contacto (se guarda en SQLite) y los
            enlaces de los proyectos se rellenan desde GET /api/proyectos.
       Si el fetch falla (modalidad a), el código continúa sin romperse.
       ==================================================================== */

    var API_BASE = ''; // '' = mismo dominio. Ej: 'http://localhost:3000'

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
      });
    }

    /* ====================================================================
       1. TEMA CLARO / OSCURO
       Se guarda la preferencia en localStorage. Al cargar, el pequeño
       script del <head> ya aplicó el tema (así no hay "parpadeo").
       ==================================================================== */
    var btnTema = document.getElementById('btn-tema');
    var raiz = document.documentElement;

    function obtenerTema() {
      return raiz.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function aplicarTema(tema) {
      raiz.setAttribute('data-theme', tema);
      // aria-pressed para indicar a los lectores de pantalla el estado
      if (btnTema) {
        btnTema.setAttribute('aria-pressed', tema === 'dark' ? 'true' : 'false');
        btnTema.setAttribute(
          'aria-label',
          tema === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
        );
      }
      try {
        localStorage.setItem('tema', tema);
      } catch (e) {
        /* Si el navegador bloquea localStorage, seguimos sin guardar */
      }
    }

    // Sincronizamos el estado inicial del botón
    aplicarTema(obtenerTema());

    if (btnTema) {
      btnTema.addEventListener('click', function () {
        aplicarTema(obtenerTema() === 'dark' ? 'light' : 'dark');
      });
    }

    /* ====================================================================
       2. MENÚ MÓVIL (HAMBURGUESA)
       ==================================================================== */
    var btnHamburguesa = document.getElementById('btn-hamburguesa');
    var menuNavegacion = document.getElementById('menu-navegacion');

    function cerrarMenu() {
      if (!btnHamburguesa || !menuNavegacion) return;
      btnHamburguesa.classList.remove('is-abierto');
      menuNavegacion.classList.remove('is-abierto');
      btnHamburguesa.setAttribute('aria-expanded', 'false');
      btnHamburguesa.setAttribute('aria-label', 'Abrir menú de navegación');
    }

    function alternarMenu() {
      if (!btnHamburguesa || !menuNavegacion) return;
      var abierto = menuNavegacion.classList.toggle('is-abierto');
      btnHamburguesa.classList.toggle('is-abierto', abierto);
      btnHamburguesa.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      btnHamburguesa.setAttribute(
        'aria-label',
        abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
      );
    }

    if (btnHamburguesa) {
      btnHamburguesa.addEventListener('click', alternarMenu);
    }

    // Cerramos el menú al pulsar cualquier enlace
    if (menuNavegacion) {
      menuNavegacion.addEventListener('click', function (evento) {
        if (evento.target.closest('a')) cerrarMenu();
      });
    }

    // Cerramos con la tecla Escape
    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') cerrarMenu();
    });

    // Al volver a escritorio, nos aseguramos de que el menú quede visible
    var anchoEscritorio = window.matchMedia('(min-width: 981px)');
    function comprobarAncho(e) {
      if (e.matches && menuNavegacion) {
        menuNavegacion.classList.remove('is-abierto');
        if (btnHamburguesa) btnHamburguesa.classList.remove('is-abierto');
      }
    }
    if (anchoEscritorio.addEventListener) {
      anchoEscritorio.addEventListener('change', comprobarAncho);
    }

    /* ====================================================================
       3. NAVBAR CON SOMBRA AL HACER SCROLL
       ==================================================================== */
    var navbar = document.getElementById('navbar');

    function controlarNavbar() {
      if (!navbar) return;
      navbar.classList.toggle('is-scrolled', window.scrollY > 20);
    }

    controlarNavbar();
    window.addEventListener('scroll', controlarNavbar, { passive: true });

    /* ====================================================================
       4. ANIMACIONES AL HACER SCROLL
       Añade la clase .visible a los elementos con clase .reveal
       ==================================================================== */
    var elementosReveal = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entradas, obs) {
          entradas.forEach(function (entrada) {
            if (entrada.isIntersecting) {
              entrada.target.classList.add('visible');
              obs.unobserve(entrada.target); // solo una vez
            }
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
      );

      elementosReveal.forEach(function (el) {
        observer.observe(el);
      });
    } else {
      // Navegador antiguo: mostramos todo sin animación
      elementosReveal.forEach(function (el) {
        el.classList.add('visible');
      });
    }

    /* ====================================================================
       5. AÑO DINÁMICO EN EL PIE DE PÁGINA
       ==================================================================== */
    var anioActual = document.getElementById('anio-actual');
    if (anioActual) {
      anioActual.textContent = String(new Date().getFullYear());
    }

    /* ====================================================================
       6. FILTRO DE PROYECTOS POR CATEGORÍA
       ==================================================================== */
    var botonesFiltro = document.querySelectorAll('.filtro');
    var tarjetasProyecto = document.querySelectorAll('.proyecto');
    var mensajeVacio = document.getElementById('proyectos-vacio');

    function filtrarProyectos(categoria) {
      var visibles = 0;

      tarjetasProyecto.forEach(function (tarjeta) {
        var coincide =
          categoria === 'todos' || tarjeta.dataset.categoria === categoria;
        tarjeta.classList.toggle('oculto', !coincide);
        if (coincide) visibles++;
      });

      if (mensajeVacio) {
        mensajeVacio.hidden = visibles !== 0;
      }
    }

    botonesFiltro.forEach(function (boton) {
      boton.addEventListener('click', function () {
        botonesFiltro.forEach(function (b) {
          b.classList.remove('is-activo');
          b.setAttribute('aria-pressed', 'false');
        });
        boton.classList.add('is-activo');
        boton.setAttribute('aria-pressed', 'true');
        filtrarProyectos(boton.dataset.filtro);
      });

      boton.setAttribute(
        'aria-pressed',
        boton.classList.contains('is-activo') ? 'true' : 'false'
      );
    });

    /* ====================================================================
       7. BARRAS DE PROGRESO ANIMADAS
       Se rellenan cuando la barra entra en pantalla.
       ==================================================================== */
    var barras = document.querySelectorAll('.barra');

    function animarBarra(barra) {
      if (barra.dataset.animada === 'si') return;

      var valor = parseInt(barra.dataset.valor, 10) || 0;
      var relleno = barra.querySelector('.barra__relleno');
      var etiqueta = barra.querySelector('.barra__porcentaje');
      var pista = barra.querySelector('.barra__pista');

      barra.dataset.animada = 'si';

      // Dibujamos la barra
      if (relleno) relleno.style.width = valor + '%';
      if (pista) pista.setAttribute('aria-valuenow', String(valor));

      // Contador animado de 0 al valor final
      var inicio = null;
      var duracion = 1200;

      function paso(momento) {
        if (inicio === null) inicio = momento;
        var progreso = Math.min((momento - inicio) / duracion, 1);
        var suave = 1 - Math.pow(1 - progreso, 3); // easeOutCubic
        if (etiqueta) {
          etiqueta.textContent = Math.round(suave * valor) + '%';
        }
        if (progreso < 1) {
          requestAnimationFrame(paso);
        }
      }

      requestAnimationFrame(paso);
    }

    if ('IntersectionObserver' in window && barras.length) {
      var observerBarras = new IntersectionObserver(
        function (entradas, obs) {
          entradas.forEach(function (entrada) {
            if (entrada.isIntersecting) {
              animarBarra(entrada.target);
              obs.unobserve(entrada.target);
            }
          });
        },
        { threshold: 0.4 }
      );

      barras.forEach(function (barra) {
        observerBarras.observe(barra);
      });
    } else {
      barras.forEach(animarBarra);
    }

    /* ====================================================================
       8. NAVEGACIÓN ACTIVA SEGÚN LA SECCIÓN VISIBLE
       ==================================================================== */
    var enlacesNav = document.querySelectorAll('.navbar__link');
    var secciones = document.querySelectorAll('main section[id]');

    if ('IntersectionObserver' in window && secciones.length) {
      var observerSecciones = new IntersectionObserver(
        function (entradas) {
          entradas.forEach(function (entrada) {
            if (!entrada.isIntersecting) return;

            var id = entrada.target.id;
            enlacesNav.forEach(function (enlace) {
              var activo = enlace.getAttribute('href') === '#' + id;
              enlace.classList.toggle('is-active', activo);
            });
          });
        },
        { threshold: 0.35, rootMargin: '-80px 0px -50% 0px' }
      );

      secciones.forEach(function (seccion) {
        observerSecciones.observe(seccion);
      });
    }

    /* ====================================================================
       9. FORMULARIO DE CONTACTO (validación básica + éxito simulado)
       ==================================================================== */
    var formulario = document.getElementById('formulario-contacto');

    if (formulario) {
      var campoNombre = document.getElementById('nombre');
      var campoEmail = document.getElementById('email');
      var campoMensaje = document.getElementById('mensaje');
      var avisoNombre = document.getElementById('error-nombre');
      var avisoEmail = document.getElementById('error-email');
      var avisoMensaje = document.getElementById('error-mensaje');
      var mensajeExito = document.getElementById('form-exito');
      var temporizadorAviso;

      // Expresión sencilla para comprobar el correo
      var patronEmail = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

      function marcarCampo(campo, aviso, esValido) {
        campo.classList.toggle('es-invalido', !esValido);
        campo.setAttribute('aria-invalid', esValido ? 'false' : 'true');
        if (aviso) aviso.hidden = esValido;
        return esValido;
      }

      // Validación en vivo al salir de cada campo
      [campoNombre, campoEmail, campoMensaje].forEach(function (campo) {
        campo.addEventListener('blur', function () {
          validarCampo(campo);
        });
      });

      function validarCampo(campo) {
        var valor = campo.value.trim();

        if (campo === campoNombre) {
          return marcarCampo(campo, avisoNombre, valor.length >= 2);
        }
        if (campo === campoEmail) {
          return marcarCampo(campo, avisoEmail, patronEmail.test(valor));
        }
        if (campo === campoMensaje) {
          return marcarCampo(campo, avisoMensaje, valor.length >= 10);
        }
        return true;
      }

      formulario.addEventListener('submit', function (evento) {
        evento.preventDefault(); // no recargamos la página

        var validoNombre = validarCampo(campoNombre);
        var validoEmail = validarCampo(campoEmail);
        var validoMensaje = validarCampo(campoMensaje);

        if (!(validoNombre && validoEmail && validoMensaje)) {
          // Colocamos el foco en el primer campo con error
          var primeroInvalido = formulario.querySelector('.es-invalido');
          if (primeroInvalido) primeroInvalido.focus();
          if (mensajeExito) mensajeExito.hidden = true;
          return;
        }

        // ---- Envío real a la API (con modo demo si no hay servidor) ----
        var boton = formulario.querySelector('button[type="submit"]');
        var textoBoton = boton ? boton.textContent : '';
        if (boton) { boton.disabled = true; boton.textContent = 'Enviando…'; }

        function mostrarAviso(texto, esError) {
          if (!mensajeExito) return;
          mensajeExito.textContent = texto;
          mensajeExito.classList.toggle('formulario__exito--error', Boolean(esError));
          mensajeExito.hidden = false;
          window.clearTimeout(temporizadorAviso);
          temporizadorAviso = window.setTimeout(function () {
            mensajeExito.hidden = true;
          }, 7000);
        }

        api('/api/contacto', {
          method: 'POST',
          body: JSON.stringify({
            nombre: campoNombre.value.trim(),
            email: campoEmail.value.trim(),
            mensaje: campoMensaje.value.trim()
          })
        })
          .then(function (datos) {
            mostrarAviso('✓ ' + datos.mensaje, false);
            formulario.reset();
          })
          .catch(function (fallos) {
            if (fallos.estado) {
              // El servidor respondió: mostramos su error de validación
              var extra = fallos.datos && Array.isArray(fallos.datos.detalle)
                ? ' ' + fallos.datos.detalle[0]
                : '';
              mostrarAviso('✗ ' + fallos.message + extra, true);
            } else {
              // Sin servidor (index.html abierto directamente): modo demo
              mostrarAviso('✓ ¡Gracias por escribir! He recibido tu mensaje. (Modo demo: ejecuta `npm start` para guardarlo en el servidor.)', false);
              formulario.reset();
            }
          })
          .then(function () {
            if (boton) { boton.disabled = false; boton.textContent = textoBoton; }
          });
      });
    }

    /* ====================================================================
       10. API: ENLACES DE LOS PROYECTOS
       --------------------------------------------------------------------
       Los enlaces "Ver demo" / "Código" del HTML vienen con href="#".
       Si hay servidor, se rellenan con las URLs de la base de datos
       (GET /api/proyectos). Si abres el index.html directamente, no pasa
       nada: se queda como está y se avisa por consola.
       ==================================================================== */
    (function enlacesDesdeApi() {
      api('/api/proyectos')
        .then(function (proyectos) {
          if (!Array.isArray(proyectos) || !proyectos.length) return;
          var tarjetas = Array.prototype.slice.call(
            document.querySelectorAll('#grid-proyectos .proyecto')
          );

          proyectos.forEach(function (p) {
            var tarjeta = tarjetas.filter(function (el) {
              var titulo = el.querySelector('.proyecto__titulo');
              return titulo && titulo.textContent.trim() === p.titulo;
            })[0];
            if (!tarjeta) return;

            var enlaces = tarjeta.querySelectorAll('.proyecto__enlaces a');

            if (enlaces[0]) {
              if (p.url_demo) enlaces[0].setAttribute('href', p.url_demo);
              else enlaces[0].removeAttribute('href'); // sin URL: no molesta
            }
            if (enlaces[1]) {
              if (p.url_codigo) enlaces[1].setAttribute('href', p.url_codigo);
              else enlaces[1].removeAttribute('href');
              if (p.texto_enlace2) enlaces[1].textContent = p.texto_enlace2;
            }
          });

          console.info('[api] Proyectos sincronizados desde el servidor (' + proyectos.length + ').');
        })
        .catch(function () {
          console.info('[api] Sin servidor: los proyectos salen del index.html (modo estático).');
        });
    })();

  }); // fin DOMContentLoaded
})();
