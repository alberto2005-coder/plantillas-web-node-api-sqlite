/* ==========================================================================
   ESTUDIO VÉRTICE — JavaScript vanilla
   Sin librerías. Todo se ejecuta al cargar index.html.
   Secciones:
     0. Cliente de la API (con fallback a modo estático)
     1. Tema claro / oscuro
     2. Menú móvil (hamburguesa)
     3. Navbar al hacer scroll
     4. Animaciones al hacer scroll (IntersectionObserver)
     5. Contadores animados
     6. Modal de proyectos
     7. Formulario de presupuesto (validación + envío real)
     8. Año dinámico en el footer
     9. API: proyectos, cifras y servicios desde el servidor
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* ======================================================================
     0. CLIENTE DE LA API (envoltorio mínimo de fetch)
     --------------------------------------------------------------------
     Esta plantilla funciona de dos formas:
       a) Abriendo index.html directamente → todo lo local funciona y el
          formulario responde en modo demo (no envía nada).
       b) Con servidor (`npm start` → http://localhost:3105) → el formulario
          envía de verdad a POST /api/presupuesto (se guarda en SQLite) y los
          proyectos, cifras y servicios se leen de GET /api/*.
     Si el fetch falla (modalidad a), el código continúa sin romperse.
     ====================================================================== */
  var API_BASE = ''; // '' = mismo dominio. Ej: 'http://localhost:3105'

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

  /* ======================================================================
     1. TEMA CLARO / OSCURO
     Cambia data-theme en <html>, guarda la preferencia en localStorage
     y actualiza el aria-pressed del botón.
     ====================================================================== */
  const html = document.documentElement;
  const btnTema = document.getElementById('toggler-tema');
  const CLAVE = 'tema';

  function temaActual() {
    return html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function aplicarTema(tema, guardar) {
    html.setAttribute('data-theme', tema);
    if (btnTema) {
      btnTema.setAttribute('aria-pressed', String(tema === 'dark'));
      btnTema.setAttribute(
        'aria-label',
        tema === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
      );
    }
    if (guardar) {
      try { localStorage.setItem(CLAVE, tema); } catch (e) { /* modo privado */ }
    }
  }

  // Estado inicial (el script del <head> ya evita el parpadeo)
  aplicarTema(temaActual(), false);

  if (btnTema) {
    btnTema.addEventListener('click', function () {
      aplicarTema(temaActual() === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* ======================================================================
     2. MENÚ MÓVIL (HAMBURGUESA)
     ====================================================================== */
  const hamburguesa = document.getElementById('hamburguesa');
  const nav = document.getElementById('nav');

  function cerrarMenu() {
    if (!nav || !hamburguesa) return;
    nav.classList.remove('abierto');
    hamburguesa.setAttribute('aria-expanded', 'false');
    hamburguesa.setAttribute('aria-label', 'Abrir menú');
  }

  if (hamburguesa && nav) {
    hamburguesa.addEventListener('click', function () {
      const abierto = nav.classList.toggle('abierto');
      hamburguesa.setAttribute('aria-expanded', String(abierto));
      hamburguesa.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });

    // Al pulsar un enlace del menú, se cierra
    nav.querySelectorAll('a').forEach(function (enlace) {
      enlace.addEventListener('click', cerrarMenu);
    });

    // Al ampliar la ventana (escritorio) se cierra también
    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) cerrarMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrarMenu();
    });
  }

  /* ======================================================================
     3. NAVBAR AL HACER SCROLL
     ====================================================================== */
  const navbar = document.getElementById('navbar');

  function actualizarNavbar() {
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }

  actualizarNavbar();
  window.addEventListener('scroll', actualizarNavbar, { passive: true });

  /* ======================================================================
     4. ANIMACIONES AL HACER SCROLL
     IntersectionObserver añade la clase .visible a los .reveal
     ====================================================================== */
  const elementosReveal = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observador = new IntersectionObserver(function (entradas, obs) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('visible');
          obs.unobserve(entrada.target); // solo una vez
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    // Retraso escalonado para las tarjetas de una misma fila
    document.querySelectorAll('.servicio, .proyecto, .miembro, .premio').forEach(function (el, i) {
      el.style.setProperty('--delay', (i % 4) * 0.09 + 's');
    });

    elementosReveal.forEach(function (el) { observador.observe(el); });
  } else {
    // Navegador antiguo: mostramos todo directamente
    elementosReveal.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ======================================================================
     5. CONTADORES ANIMADOS
     Suben desde 0 hasta data-objetivo cuando la sección entra en pantalla.
     ====================================================================== */
  const bloqueContadores = document.getElementById('contadores');

  function animarContador(elemento) {
    const objetivo = parseInt(elemento.dataset.objetivo, 10) || 0;
    const duracion = 1600;
    const inicio = performance.now();

    function paso(ahora) {
      const transcurrido = Math.min((ahora - inicio) / duracion, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - transcurrido, 3);
      elemento.textContent = Math.round(objetivo * eased);
      if (transcurrido < 1) {
        requestAnimationFrame(paso);
      } else {
        elemento.textContent = objetivo;
        elemento.dataset.animado = 'si'; // para no pisarlo si llega la API después
      }
    }

    requestAnimationFrame(paso);
  }

  if (bloqueContadores) {
    if ('IntersectionObserver' in window) {
      const obsContadores = new IntersectionObserver(function (entradas, obs) {
        entradas.forEach(function (entrada) {
          if (entrada.isIntersecting) {
            bloqueContadores
              .querySelectorAll('.contador__valor')
              .forEach(animarContador);
            obs.disconnect();
          }
        });
      }, { threshold: 0.35 });

      obsContadores.observe(bloqueContadores);
    } else {
      bloqueContadores
        .querySelectorAll('.contador__valor')
        .forEach(function (el) {
          el.textContent = el.dataset.objetivo;
          el.dataset.animado = 'si';
        });
    }
  }

  /* ======================================================================
     6. MODAL DE PROYECTOS
     Datos de cada proyecto + apertura/cierre accesible (Escape, clic fuera).
     ====================================================================== */
  const PROYECTOS = {
    lumen: {
      titulo: 'Lumen Café',
      categoria: 'Branding · Packaging',
      gradiente: 'gradiente-1',
      anio: '2025',
      cliente: 'Lumen Café S.L.',
      servicios: 'Identidad, packaging, cartas',
      descripcion:
        'Reposicionamiento completo de una tostadora de barrio que quería crecer sin ' +
        'perder su lado artesanal. Diseñamos un sistema de marca flexible con un ' +
        'gradiente como firma, tipografía a medida y un packaging que funciona igual ' +
        'de bien en el lineal que en redes sociales.'
    },
    norte: {
      titulo: 'Hotel Norte',
      categoria: 'Web · UI',
      gradiente: 'gradiente-2',
      anio: '2024',
      cliente: 'Grupo Norte Hoteles',
      servicios: 'UX, diseño UI, desarrollo front-end',
      descripcion:
        'Web de reservas directas para una cadena de hoteles rurales. Rediseñamos la ' +
        'arquitectura de información, redujimos el embudo de reserva a tres pasos y ' +
        'construimos el front-end a mano para cargar en menos de un segundo.'
    },
    fibra: {
      titulo: 'Fibra Studio',
      categoria: 'Motion',
      gradiente: 'gradiente-3',
      anio: '2024',
      cliente: 'Fibra Studio',
      servicios: 'Dirección de arte, animación 2D',
      descripcion:
        'Paquete de motion para el lanzamiento de un estudio de música electrónica: ' +
        'bucles de marca, plantillas para redes y una pieza de apertura de 20 segundos ' +
        'proyectada en directo durante la gira.'
    },
    mercado: {
      titulo: 'Mercado 22',
      categoria: 'Identidad · Señalética',
      gradiente: 'gradiente-4',
      anio: '2023',
      cliente: 'Ayuntamiento de Valencia',
      servicios: 'Identidad, señalética, guía de uso',
      descripcion:
        'Identidad y sistema de señalética para el mercado municipal del barrio de ' +
        'Ruzafa. Un lenguaje modular basado en la numeración de los puestos, pensado ' +
        'para imprimir con dos tintas y resistir el uso diario.'
    },
    aurea: {
      titulo: 'Aurea Cosmética',
      categoria: 'Branding · Ecommerce',
      gradiente: 'gradiente-5',
      anio: '2023',
      cliente: 'Aurea Lab',
      servicios: 'Marca, packaging, tienda online',
      descripcion:
        'Marca y ecommerce para una línea de cosmética natural. Trabajamos una paleta ' +
        'cálida, fotografía de producto propia y una ficha de producto que explica cada ' +
        'ingrediente sin tecnicismos.'
    },
    orbita: {
      titulo: 'Órbita Tech',
      categoria: 'Marca · Producto digital',
      gradiente: 'gradiente-6',
      anio: '2022',
      cliente: 'Órbita Tech',
      servicios: 'Naming, identidad, design system',
      descripcion:
        'Naming e identidad para una startup de infraestructura cloud, junto con un ' +
        'design system de 60 componentes para que su equipo de producto pudiera ' +
        'construir pantallas nuevas sin frenar el desarrollo.'
    }
  };

  const modal = document.getElementById('modal');
  const btnCerrar = document.getElementById('modal-cerrar');
  let elementoAnterior = null;

  /* Catálogo que usa el modal. Arranca con los datos locales de arriba (fallback
     para abrir index.html sin servidor) y se sustituye por los de
     GET /api/proyectos cuando el servidor responde. */
  let catalogoProyectos = PROYECTOS;

  function rellenarModal(id) {
    const datos = catalogoProyectos[id];
    if (!datos || !modal) return false;

    document.getElementById('modal-titulo').textContent = datos.titulo;
    document.getElementById('modal-categoria').textContent = datos.categoria;
    document.getElementById('modal-descripcion').textContent = datos.descripcion;
    document.getElementById('modal-anio').textContent = datos.anio;
    document.getElementById('modal-cliente').textContent = datos.cliente;
    document.getElementById('modal-servicios').textContent = datos.servicios;

    const visual = document.getElementById('modal-visual');
    visual.className = 'modal__visual ' + datos.gradiente;

    return true;
  }

  function abrirModal(id, origen) {
    if (!modal || !rellenarModal(id)) return;
    elementoAnterior = origen || null;
    modal.hidden = false;
    document.body.classList.add('modal-abierto');
    if (btnCerrar) btnCerrar.focus();
  }

  function cerrarModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('modal-abierto');
    if (elementoAnterior && typeof elementoAnterior.focus === 'function') {
      elementoAnterior.focus();
    }
    elementoAnterior = null;
  }

  // Abrir al pulsar cualquier tarjeta (ratón o teclado)
  document.querySelectorAll('.proyecto').forEach(function (tarjeta) {
    tarjeta.addEventListener('click', function () {
      abrirModal(tarjeta.dataset.proyecto, tarjeta);
    });

    tarjeta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        abrirModal(tarjeta.dataset.proyecto, tarjeta);
      }
    });
  });

  if (btnCerrar) btnCerrar.addEventListener('click', cerrarModal);

  if (modal) {
    // Clic en el fondo oscuro
    const fondo = modal.querySelector('.modal__fondo');
    if (fondo) fondo.addEventListener('click', cerrarModal);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cerrarModal();
  });

  /* ======================================================================
     7. FORMULARIO DE PRESUPUESTO
     Validación en cliente + envío real a POST /api/presupuesto.
     Si no hay servidor (index.html abierto directamente) responde en
     "modo demo": no guarda nada, pero la web sigue funcionando.
     ====================================================================== */
  const formPresupuesto = document.getElementById('form-presupuesto');

  if (formPresupuesto) {
    const campoNombre = document.getElementById('nombre');
    const campoEmail = document.getElementById('email');
    const campoEmpresa = document.getElementById('empresa');
    const campoTipo = document.getElementById('tipo');
    const campoPresupuesto = document.getElementById('presupuesto');
    const campoMensaje = document.getElementById('mensaje');
    const avisoNombre = document.getElementById('error-nombre');
    const avisoEmail = document.getElementById('error-email');
    const avisoTipo = document.getElementById('error-tipo');
    const avisoMensaje = document.getElementById('error-mensaje');
    const mensajeExito = document.getElementById('presupuesto-exito');
    const patronEmail = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    let temporizadorAviso;

    // Relación campo → nodo de aviso (la usa también la respuesta 4xx del servidor)
    const avisos = {
      nombre: { campo: campoNombre, aviso: avisoNombre },
      email: { campo: campoEmail, aviso: avisoEmail },
      tipo: { campo: campoTipo, aviso: avisoTipo },
      mensaje: { campo: campoMensaje, aviso: avisoMensaje }
    };

    function marcarCampo(campo, aviso, esValido) {
      if (!campo) return true;
      campo.classList.toggle('es-invalido', !esValido);
      campo.setAttribute('aria-invalid', esValido ? 'false' : 'true');
      if (aviso) aviso.hidden = esValido;
      return esValido;
    }

    function validarCampo(campo) {
      if (!campo) return true;
      const valor = campo.value.trim();

      if (campo === campoNombre) return marcarCampo(campo, avisoNombre, valor.length >= 2);
      if (campo === campoEmail) return marcarCampo(campo, avisoEmail, patronEmail.test(valor));
      if (campo === campoTipo) return marcarCampo(campo, avisoTipo, valor !== '');
      if (campo === campoMensaje) return marcarCampo(campo, avisoMensaje, valor.length >= 10);
      return true;
    }

    function limpiarAvisos() {
      Object.keys(avisos).forEach(function (clave) {
        marcarCampo(avisos[clave].campo, avisos[clave].aviso, true);
      });
    }

    function mostrarAviso(texto, esError) {
      if (!mensajeExito) return;
      mensajeExito.textContent = texto;
      mensajeExito.classList.toggle(
        'formulario-presupuesto__exito--error',
        Boolean(esError)
      );
      mensajeExito.hidden = false;
      window.clearTimeout(temporizadorAviso);
      temporizadorAviso = window.setTimeout(function () {
        mensajeExito.hidden = true;
      }, 9000);
    }

    // Validación en vivo al salir de cada campo y al escribir (borra el error)
    Object.keys(avisos).forEach(function (clave) {
      const campo = avisos[clave].campo;
      if (!campo) return;
      campo.addEventListener('blur', function () { validarCampo(campo); });
      campo.addEventListener('input', function () {
        if (campo.classList.contains('es-invalido')) validarCampo(campo);
      });
      campo.addEventListener('change', function () {
        if (campo.classList.contains('es-invalido')) validarCampo(campo);
      });
    });

    formPresupuesto.addEventListener('submit', function (evento) {
      evento.preventDefault(); // no recargamos la página

      const camposObligatorios = [campoNombre, campoEmail, campoTipo, campoMensaje];
      const todosValidos = camposObligatorios.map(validarCampo).every(Boolean);

      if (!todosValidos) {
        const primeroInvalido = formPresupuesto.querySelector('.es-invalido');
        if (primeroInvalido) primeroInvalido.focus();
        if (mensajeExito) mensajeExito.hidden = true;
        return;
      }

      // ---- Envío real a la API (con modo demo si no hay servidor) ----
      const boton = formPresupuesto.querySelector('button[type="submit"]');
      const textoBoton = boton ? boton.textContent : '';
      if (boton) { boton.disabled = true; boton.textContent = 'Enviando…'; }

      api('/api/presupuesto', {
        method: 'POST',
        body: JSON.stringify({
          nombre: campoNombre.value.trim(),
          email: campoEmail.value.trim(),
          empresa: campoEmpresa ? campoEmpresa.value.trim() : '',
          tipo: campoTipo.value,
          presupuesto: campoPresupuesto ? campoPresupuesto.value : '',
          mensaje: campoMensaje.value.trim()
        })
      })
        .then(function (datos) {
          let texto = '✓ ' + (datos.mensaje || 'Solicitud recibida.');
          if (datos.referencia) texto += ' Referencia: ' + datos.referencia;
          mostrarAviso(texto, false);
          formPresupuesto.reset();
          limpiarAvisos();
        })
        .catch(function (fallo) {
          if (fallo.estado) {
            // El servidor respondió (400/429/500): marcamos los campos que indique
            const detalle = fallo.datos && fallo.datos.detalle;
            if (detalle && typeof detalle === 'object' && !Array.isArray(detalle)) {
              Object.keys(detalle).forEach(function (clave) {
                const objetivo = avisos[clave];
                if (objetivo) marcarCampo(objetivo.campo, objetivo.aviso, false);
              });
              const primeroInvalido = formPresupuesto.querySelector('.es-invalido');
              if (primeroInvalido) primeroInvalido.focus();
            } else if (Array.isArray(detalle) && detalle.length) {
              mostrarAviso('✗ ' + fallo.message + ' ' + detalle[0], true);
              return;
            }
            mostrarAviso('✗ ' + fallo.message, true);
          } else {
            // Sin servidor (index.html abierto directamente): modo demo
            mostrarAviso(
              '✓ ¡Gracias! Hemos recibido tu solicitud de presupuesto. ' +
              '(Modo demo: ejecuta `npm start` para guardarla en el servidor.)',
              false
            );
            formPresupuesto.reset();
            limpiarAvisos();
          }
        })
        .then(function () {
          if (boton) { boton.disabled = false; boton.textContent = textoBoton; }
        });
    });
  }

  /* ======================================================================
     8. AÑO DINÁMICO EN EL FOOTER
     ====================================================================== */
  const anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();

  /* ======================================================================
     9. API: PROYECTOS, CIFRAS Y SERVICIOS DEL SERVIDOR
     --------------------------------------------------------------------
     Si hay servidor, el contenido se toma de la base de datos (única
     fuente de verdad). Si no lo hay, se queda el del index.html / el
     objeto PROYECTOS local: la web se ve y funciona igual.
     ====================================================================== */

  // 9.1 Proyectos → datos del modal y tarjetas del grid
  api('/api/proyectos')
    .then(function (filas) {
      if (!Array.isArray(filas) || !filas.length) return;

      const porClave = {};
      filas.forEach(function (p) {
        if (!p || !p.clave) return;

        porClave[p.clave] = {
          titulo: p.titulo,
          categoria: p.categoria,
          gradiente: p.gradiente,
          anio: p.anio,
          cliente: p.cliente,
          servicios: p.servicios,
          descripcion: p.descripcion
        };

        const tarjeta = document.querySelector('.proyecto[data-proyecto="' + p.clave + '"]');
        if (!tarjeta) return;

        const titulo = tarjeta.querySelector('.proyecto__titulo');
        const categoria = tarjeta.querySelector('.proyecto__categoria');
        const visual = tarjeta.querySelector('.proyecto__visual');

        if (titulo && p.titulo) titulo.textContent = p.titulo;
        if (categoria && p.categoria) categoria.textContent = p.categoria;
        if (visual && p.gradiente) visual.className = 'proyecto__visual ' + p.gradiente;
        if (p.titulo) tarjeta.setAttribute('aria-label', 'Abrir proyecto ' + p.titulo);
      });

      if (Object.keys(porClave).length) {
        catalogoProyectos = porClave;
        console.info('[api] ' + Object.keys(porClave).length + ' proyectos cargados desde el servidor.');
      }
    })
    .catch(function () {
      console.info('[api] Sin servidor: los proyectos salen de js/main.js (modo estático).');
    });

  // 9.2 Cifras → data-objetivo de los contadores
  api('/api/cifras')
    .then(function (filas) {
      if (!Array.isArray(filas) || !filas.length) return;

      document.querySelectorAll('.contador').forEach(function (bloque) {
        const valor = bloque.querySelector('.contador__valor');
        const etiqueta = bloque.querySelector('.contador__etiqueta');
        if (!valor || !etiqueta) return;

        const texto = etiqueta.textContent.trim();
        const dato = filas.filter(function (c) { return c.etiqueta === texto; })[0];
        if (!dato) return;

        valor.dataset.objetivo = String(dato.valor);
        // Si el contador ya terminó de animarse, lo actualizamos en pantalla
        if (valor.dataset.animado === 'si') valor.textContent = String(dato.valor);
      });

      console.info('[api] ' + filas.length + ' cifras cargadas desde el servidor.');
    })
    .catch(function () {
      console.info('[api] Sin servidor: los contadores salen del data-objetivo del HTML.');
    });

  // 9.3 Servicios → títulos y descripciones por número/clave
  api('/api/servicios')
    .then(function (filas) {
      if (!Array.isArray(filas) || !filas.length) return;

      document.querySelectorAll('.servicio').forEach(function (item) {
        const numero = item.querySelector('.servicio__numero');
        const titulo = item.querySelector('.servicio__titulo');
        const texto = item.querySelector('.servicio__texto');
        if (!numero) return;

        const claveNumero = numero.textContent.trim();
        const dato =
          filas.filter(function (s) { return s.numero === claveNumero; })[0] ||
          filas.filter(function (s) { return s.clave === item.dataset.servicio; })[0];
        if (!dato) return;

        if (titulo && dato.titulo) titulo.textContent = dato.titulo;
        if (texto && dato.descripcion) texto.textContent = dato.descripcion;
        if (dato.numero) numero.textContent = dato.numero;
      });

      console.info('[api] ' + filas.length + ' servicios cargados desde el servidor.');
    })
    .catch(function () {
      console.info('[api] Sin servidor: los servicios salen del index.html (modo estático).');
    });

});
