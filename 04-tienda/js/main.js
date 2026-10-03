/* ==========================================================================
   NovaTech Store — JavaScript principal (vanilla, sin librerías)
   Secciones:
     1. Utilidades generales + cliente de la API
     2. Toggle de tema (claro / oscuro)
     3. Menú móvil (hamburguesa)
     4. Barra de anuncio cerrable
     5. Animaciones al hacer scroll (IntersectionObserver)
     6. Año dinámico en el footer
     7. Sombra de la navbar al desplazarse
     8. Catálogo de productos (datos de respaldo)
     9. Render, filtros, orden y búsqueda del catálogo (+ sincronía con la API)
    10. CARRITO FUNCIONAL (drawer, cantidades, subtotal, localStorage)
    11. CHECKOUT REAL (POST /api/pedidos, con modo demo sin servidor)
    12. Newsletter con validación (POST /api/newsletter)
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     1. UTILIDADES GENERALES
     ======================================================================== */

  /** Atajo corto para document.querySelector */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  /** Atajo corto para document.querySelectorAll (devuelve array) */
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /** Formatea un número como precio en euros: 89.9 → "89,90 €" */
  const dinero = (n) =>
    n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  /** Claves de almacenamiento local (para no repetir strings mágicos) */
  const CLAVE_TEMA = 'novatech-tema';
  const CLAVE_CARRITO = 'novatech-carrito';

  /* ========================================================================
     1b. CLIENTE DE LA API (envoltorio mínimo de fetch)
     -----------------------------------------------------------------------
     Esta plantilla funciona de dos formas:
       a) Abriendo index.html directamente → todo lo local funciona y el
          checkout responde en "modo demo" (no se guarda nada).
       b) Con servidor (`npm start` → http://localhost:3004) → el catálogo
          llega de GET /api/productos, el pedido se crea de verdad con
          POST /api/pedidos (y se descuenta stock) y la suscripción del
          newsletter se guarda en la base de datos.
     Si el fetch falla (modalidad a), el código continúa sin romperse.
     ======================================================================== */

  const API_BASE = ''; // '' = mismo dominio. Ej: 'http://localhost:3004'

  /** Llamada a la API: devuelve JSON o lanza un Error con .estado y .datos */
  function api(ruta, opciones) {
    return fetch(
      API_BASE + ruta,
      Object.assign(
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
        opciones || {}
      )
    ).then((respuesta) =>
      respuesta
        .json()
        .catch(() => ({}))
        .then((cuerpo) => {
          if (!respuesta.ok) {
            const fallo = new Error(cuerpo.error || 'Error HTTP ' + respuesta.status);
            fallo.datos = cuerpo;
            fallo.estado = respuesta.status;
            throw fallo;
          }
          return cuerpo;
        })
    );
  }

  /* ========================================================================
     2. TOGGLE DE TEMA (claro / oscuro)
     ======================================================================== */

  const btnTema = $('#toggleTema');

  /** Devuelve el tema actual leyendo el atributo data-theme */
  function temaActual() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'dark'
      : 'light';
  }

  /** Aplica un tema, lo guarda en localStorage y actualiza la etiqueta aria */
  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    if (btnTema) {
      btnTema.setAttribute(
        'aria-label',
        tema === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
      );
    }
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch (e) {
      /* almacenamiento no disponible: la web sigue funcionando */
    }
  }

  if (btnTema) {
    btnTema.addEventListener('click', () => {
      aplicarTema(temaActual() === 'dark' ? 'light' : 'dark');
    });
  }

  /* ========================================================================
     3. MENÚ MÓVIL (hamburguesa)
     ======================================================================== */

  const btnMenu = $('#toggleMenu');
  const navMenu = $('#navMenu');

  function alternarMenu(forzar) {
    if (!navMenu || !btnMenu) return;
    const abierto =
      typeof forzar === 'boolean'
        ? forzar
        : !navMenu.classList.contains('is-abierto');
    navMenu.classList.toggle('is-abierto', abierto);
    btnMenu.setAttribute('aria-expanded', String(abierto));
    btnMenu.setAttribute(
      'aria-label',
      abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
    );
  }

  if (btnMenu) {
    btnMenu.addEventListener('click', () => alternarMenu());
  }

  // Al pulsar un enlace del menú, se cierra (útil en móvil)
  if (navMenu) {
    $$('a', navMenu).forEach((enlace) =>
      enlace.addEventListener('click', () => alternarMenu(false))
    );
  }

  // Al ampliar la ventana a escritorio, se cierra el menú móvil
  window.addEventListener('resize', () => {
    if (window.innerWidth > 640) alternarMenu(false);
  });

  /* ========================================================================
     4. BARRA DE ANUNCIO CERRABLE
     ======================================================================== */

  const anuncio = $('#anuncio');
  const btnCerrarAnuncio = $('#cerrarAnuncio');

  if (btnCerrarAnuncio && anuncio) {
    // Si el usuario ya lo cerró antes, no vuelve a aparecer
    try {
      if (localStorage.getItem('novatech-anuncio-cerrado') === '1') {
        anuncio.hidden = true;
      }
    } catch (e) { /* ignorar */ }

    btnCerrarAnuncio.addEventListener('click', () => {
      anuncio.hidden = true;
      try {
        localStorage.setItem('novatech-anuncio-cerrado', '1');
      } catch (e) { /* ignorar */ }
    });
  }

  /* ========================================================================
     5. ANIMACIONES AL HACER SCROLL
     Añade la clase .visible a los elementos .reveal cuando entran en pantalla
     ======================================================================== */

  const elementosReveal = $$('.reveal');

  if ('IntersectionObserver' in window && elementosReveal.length) {
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('visible');
            observador.unobserve(entrada.target); // solo una vez
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    elementosReveal.forEach((el) => observador.observe(el));
  } else {
    // Navegador sin IntersectionObserver: mostramos todo directamente
    elementosReveal.forEach((el) => el.classList.add('visible'));
  }

  /* ========================================================================
     6. AÑO DINÁMICO EN EL FOOTER
     ======================================================================== */

  const anio = $('#anio');
  if (anio) anio.textContent = String(new Date().getFullYear());

  /* ========================================================================
     7. SOMBRA DE LA NAVBAR AL DESPLAZARSE
     ======================================================================== */

  const navbar = $('#navbar');
  if (navbar) {
    const alDesplazar = () =>
      navbar.classList.toggle('navbar--sombra', window.scrollY > 8);
    window.addEventListener('scroll', alDesplazar, { passive: true });
    alDesplazar();
  }

  /* ========================================================================
     8. CATÁLOGO DE PRODUCTOS — EDITA AQUÍ PARA CAMBIAR LOS PRODUCTOS
     Campos: id, nombre, categoria, precio, descuento (0 = sin descuento),
             valoracion (estrellas), nuevo (badge "Nuevo"), colores del icono

     IMPORTANTE: este array es el RESPALDO (modo estático). Cuando hay
     servidor, la sección 9 lo sustituye por los productos de la base de
     datos (GET /api/productos), que además llevan `stock`.
     ======================================================================== */

  const productos = [
    { id: 1,  nombre: 'Auriculares Aura X2 con cancelación de ruido', categoria: 'auriculares', precio: 89.99,  descuento: 25, valoracion: 5,   nuevo: true,  colores: ['#5b5bf0', '#12c9a5'] },
    { id: 2,  nombre: 'Auriculares inalámbricos Pulse Go',            categoria: 'auriculares', precio: 49.99,  descuento: 0,  valoracion: 4,   nuevo: false, colores: ['#f97316', '#ef4444'] },
    { id: 3,  nombre: 'Teclado mecánico K87 RGB switches rojos',      categoria: 'teclados',    precio: 74.90,  descuento: 15, valoracion: 5,   nuevo: false, colores: ['#8b5cf6', '#5b5bf0'] },
    { id: 4,  nombre: 'Teclado compacto KeyMini 60% blanco',          categoria: 'teclados',    precio: 59.00,  descuento: 0,  valoracion: 4,   nuevo: true,  colores: ['#0ea5e9', '#22d3ee'] },
    { id: 5,  nombre: 'Ratón gaming Vortex 12K DPI',                  categoria: 'ratones',     precio: 39.95,  descuento: 20, valoracion: 5,   nuevo: false, colores: ['#12c9a5', '#0f766e'] },
    { id: 6,  nombre: 'Ratón ergonómico Silencio inalámbrico',        categoria: 'ratones',     precio: 29.99,  descuento: 0,  valoracion: 4,   nuevo: false, colores: ['#64748b', '#334155'] },
    { id: 7,  nombre: 'Monitor 27\" QHD 165Hz IPS NovaVision',        categoria: 'monitores',   precio: 249.99, descuento: 12, valoracion: 5,   nuevo: true,  colores: ['#5b5bf0', '#ec4899'] },
    { id: 8,  nombre: 'Monitor ultrapancho 34\" curvo UWQHD',         categoria: 'monitores',   precio: 389.00, descuento: 0,  valoracion: 4,   nuevo: false, colores: ['#1e293b', '#475569'] }
  ];

  /** Fuente de datos real del catálogo: el array de arriba, salvo que
   *  responda el servidor (ver sección 9). */
  let catalogo = productos;

  /** Iconos SVG por categoría (se insertan dentro del degradado de la imagen) */
  const iconos = {
    auriculares: `<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2.5" y="13.5" width="4.5" height="7" rx="2"/><rect x="17" y="13.5" width="4.5" height="7" rx="2"/></svg>`,
    teclados: `<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>`,
    ratones: `<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="6"/><path d="M12 6.5v3.5"/></svg>`,
    monitores: `<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M9 20.5h6M12 16.5v4"/></svg>`
  };

  /** Etiqueta legible de la categoría */
  const etiquetas = {
    auriculares: 'Auriculares',
    teclados: 'Teclados',
    ratones: 'Ratones',
    monitores: 'Monitores'
  };

  /* ========================================================================
     9. RENDER, FILTROS, ORDEN Y BÚSQUEDA DEL CATÁLOGO
     ======================================================================== */

  const grid = $('#gridProductos');
  const vacio = $('#productosVacio');
  const chips = $$('#filtrosCategorias .chip');
  const selectOrden = $('#ordenar');
  const inputBuscar = $('#buscar');
  const formBuscar = $('#formBuscador');

  // Estado de la vista
  const estado = { filtro: 'todas', orden: 'destacados', busqueda: '' };

  /** Precio final de un producto (aplica el descuento) */
  const precioFinal = (p) => p.precio * (1 - p.descuento / 100);

  /** Devuelve el listado de productos según filtros, orden y búsqueda */
  function obtenerProductos() {
    let lista = catalogo.slice();

    // Filtro por categoría
    if (estado.filtro !== 'todas') {
      lista = lista.filter((p) => p.categoria === estado.filtro);
    }

    // Búsqueda por texto (nombre o categoría)
    if (estado.busqueda.trim()) {
      const q = estado.busqueda.trim().toLowerCase();
      lista = lista.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          String(etiquetas[p.categoria] || p.categoria).toLowerCase().includes(q)
      );
    }

    // Orden
    switch (estado.orden) {
      case 'precio-asc':
        lista.sort((a, b) => precioFinal(a) - precioFinal(b));
        break;
      case 'precio-desc':
        lista.sort((a, b) => precioFinal(b) - precioFinal(a));
        break;
      case 'valoracion':
        lista.sort((a, b) => b.valoracion - a.valoracion);
        break;
      default:
        // "Destacados": primero novedades y con descuento
        lista.sort(
          (a, b) =>
            Number(b.nuevo) - Number(a.nuevo) ||
            b.descuento - a.descuento ||
            b.valoracion - a.valoracion
        );
    }

    return lista;
  }

  /** Genera el HTML de una tarjeta de producto */
  function tarjetaProducto(p) {
    const [c1, c2] = p.colores;
    const final = precioFinal(p);
    const hayDescuento = p.descuento > 0;

    // Badge: prioridad a la oferta; si no, "Nuevo"
    const badge = hayDescuento
      ? `<span class="badge badge--oferta">-${p.descuento}%</span>`
      : p.nuevo
        ? `<span class="badge badge--nuevo">Nuevo</span>`
        : '';

    const precioAntiguo = hayDescuento
      ? `<span class="producto__precio-antiguo">${dinero(p.precio)}</span>
         <span class="producto__descuento">Ahorras ${dinero(p.precio - final)}</span>`
      : '';

    const estrellas = '★'.repeat(p.valoracion) + '☆'.repeat(5 - p.valoracion);

    // Si la API informa de stock, los agotados se muestran inhabilitados
    const agotado = Number(p.stock) === 0;

    return `
      <article class="producto" data-id="${p.id}">
        <div class="producto__imagen" style="background:linear-gradient(135deg, ${c1}, ${c2});">
          ${badge}
          ${iconos[p.categoria] || ''}
        </div>
        <div class="producto__cuerpo">
          <span class="producto__categoria">${etiquetas[p.categoria] || p.categoria}</span>
          <h3 class="producto__nombre">${p.nombre}</h3>
          <div class="estrellas" aria-label="Valoración ${p.valoracion} de 5 estrellas">
            <span aria-hidden="true">${estrellas}</span>
            <small>${p.valoracion},0</small>
          </div>
          <div class="producto__precio-fila">
            <span class="producto__precio">${dinero(final)}</span>
            ${precioAntiguo}
          </div>
          <button class="btn btn--primario" type="button" data-add="${p.id}" ${agotado ? 'disabled' : ''}>
            ${agotado ? 'Agotado' : 'Añadir al carrito'}
          </button>
        </div>
      </article>`;
  }

  /** Pinta el grid con la lista resultante */
  function pintarCatalogo() {
    if (!grid) return;
    const lista = obtenerProductos();
    grid.innerHTML = lista.map(tarjetaProducto).join('');

    // JSON-LD (SEO): ItemList con los productos del catálogo.
    // Se inyecta justo después de pintar y se reutiliza el mismo <script>.
    const datos = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: catalogo.map((p, i) => {
        const oferta = {
          '@type': 'Offer',
          price: Number(precioFinal(p).toFixed(2)),
          priceCurrency: 'EUR'
        };
        if (typeof p.stock === 'number') {
          oferta.availability = p.stock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock';
        }
        return {
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Product',
            name: p.nombre,
            category: etiquetas[p.categoria] || p.categoria,
            offers: oferta
          }
        };
      })
    }).replace(/</g, '\\u003c');
    let guion = document.getElementById('datos-estructurados');
    if (!guion) {
      guion = document.createElement('script');
      guion.id = 'datos-estructurados';
      guion.type = 'application/ld+json';
      document.head.appendChild(guion);
    }
    guion.textContent = datos;

    if (vacio) vacio.hidden = lista.length > 0;

    // Reobservamos los nuevos elementos para que se animen al aparecer
    $$('.reveal', grid).forEach((el) => el.classList.add('visible'));
  }

  // Filtros por categoría
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('chip--activo'));
      chip.classList.add('chip--activo');
      estado.filtro = chip.dataset.filtro;
      pintarCatalogo();
    });
  });

  // Orden
  if (selectOrden) {
    selectOrden.addEventListener('change', () => {
      estado.orden = selectOrden.value;
      pintarCatalogo();
    });
  }

  // Búsqueda en vivo
  if (inputBuscar) {
    inputBuscar.addEventListener('input', () => {
      estado.busqueda = inputBuscar.value;
      pintarCatalogo();
    });
  }

  // Evitar que el formulario recargue la página
  if (formBuscar) {
    formBuscar.addEventListener('submit', (e) => {
      e.preventDefault();
      estado.busqueda = inputBuscar ? inputBuscar.value : '';
      pintarCatalogo();
      const seccion = $('#catalogo');
      if (seccion) seccion.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Botón "Añadir" del hero (producto destacado, id 1)
  $$('[data-add-rapido]').forEach((btn) => {
    btn.addEventListener('click', () => {
      añadirAlCarrito(1, 1);
      abrirCarrito();
    });
  });

  /* ========================================================================
     10. CARRITO FUNCIONAL
     ======================================================================== */

  const panelCarrito = $('#carritoPanel');
  const overlay = $('#overlayCarrito');
  const btnAbrirCarrito = $('#abrirCarrito');
  const btnCerrarCarrito = $('#cerrarCarrito');
  const listaCarrito = $('#listaCarrito');
  const contador = $('#contadorCarrito');
  const subtotalEl = $('#subtotalCarrito');
  const notaEnvio = $('#notaEnvio');
  const btnVaciar = $('#vaciarCarrito');
  const btnFinalizar = $('#finalizarCompra');
  const mensajeCompra = $('#mensajeCompra');
  const toast = $('#toast');

  // Campos del formulario de envío (checkout) y su formulario
  const formCheckout = $('#formCheckout');
  const camposEnvio = {
    nombre: $('#coNombre'),
    email: $('#coEmail'),
    direccion: $('#coDireccion'),
    ciudad: $('#coCiudad'),
    cp: $('#coCp')
  };

  /** Array de líneas del carrito: { id, cantidad } */
  let carrito = [];

  // Cargamos lo guardado en localStorage
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || '[]');
    if (Array.isArray(guardado)) {
      carrito = guardado.filter(
        (l) => l && catalogo.some((p) => p.id === l.id) && l.cantidad > 0
      );
    }
  } catch (e) {
    carrito = [];
  }

  /** Guarda el carrito en localStorage */
  function guardarCarrito() {
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch (e) { /* ignorar */ }
  }

  /** Devuelve el producto completo a partir de su id */
  const buscarProducto = (id) => catalogo.find((p) => p.id === Number(id));

  /** Número total de unidades del carrito */
  const unidadesTotales = () => carrito.reduce((s, l) => s + l.cantidad, 0);

  /** Suma el importe total del carrito */
  function subtotal() {
    return carrito.reduce((s, l) => {
      const p = buscarProducto(l.id);
      return p ? s + precioFinal(p) * l.cantidad : s;
    }, 0);
  }

  /** Añade unidades de un producto */
  function añadirAlCarrito(id, cantidad = 1) {
    const linea = carrito.find((l) => l.id === Number(id));
    if (linea) {
      linea.cantidad += cantidad;
    } else {
      carrito.push({ id: Number(id), cantidad });
    }
    guardarCarrito();
    renderCarrito();
    const p = buscarProducto(id);
    if (p) mostrarToast(`«${p.nombre}» añadido al carrito`);
  }

  /** Cambia la cantidad de una línea (negativo = restar) */
  function cambiarCantidad(id, delta) {
    const linea = carrito.find((l) => l.id === Number(id));
    if (!linea) return;
    linea.cantidad += delta;
    if (linea.cantidad <= 0) {
      carrito = carrito.filter((l) => l.id !== Number(id));
    }
    guardarCarrito();
    renderCarrito();
  }

  /** Elimina una línea completa */
  function eliminarLinea(id) {
    carrito = carrito.filter((l) => l.id !== Number(id));
    guardarCarrito();
    renderCarrito();
  }

  /** Dibuja el contenido del carrito y actualiza contador + subtotal.
   *  `limpiarMensaje: false` deja intacto el mensaje de #mensajeCompra
   *  (lo usamos al confirmar un pedido para no escribirlo dos veces). */
  function renderCarrito({ limpiarMensaje = true } = {}) {
    // Contador de unidades (badge de la navbar)
    const unidades = unidadesTotales();
    if (contador) {
      contador.textContent = String(unidades);
      contador.dataset.vacio = unidades === 0 ? 'true' : 'false';
    }
    if (btnAbrirCarrito) {
      btnAbrirCarrito.setAttribute(
        'aria-label',
        `Abrir el carrito de la compra, ${unidades} unidades`
      );
    }

    if (!listaCarrito) return;

    // Estado vacío
    if (carrito.length === 0) {
      listaCarrito.innerHTML = `
        <div class="carrito-vacio">
          <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>
            <path d="M2 3h2.2l2.3 12.1a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L21 7H5.4"/>
          </svg>
          <strong>Tu carrito está vacío</strong>
          <p>Añade productos del catálogo para empezar tu pedido.</p>
        </div>`;
    } else {
      listaCarrito.innerHTML = carrito
        .map((l) => {
          const p = buscarProducto(l.id);
          if (!p) return '';
          const [c1, c2] = p.colores;
          return `
            <div class="item-carrito" data-linea="${p.id}">
              <div class="item-carrito__mini" style="background:linear-gradient(135deg, ${c1}, ${c2});" aria-hidden="true">
                ${iconos[p.categoria] || ''}
              </div>
              <div class="item-carrito__info">
                <p class="item-carrito__nombre">${p.nombre}</p>
                <p class="item-carrito__precio">${dinero(precioFinal(p))}</p>
                <div class="cantidad">
                  <button type="button" data-menos="${p.id}" aria-label="Quitar una unidad de ${p.nombre}">−</button>
                  <span aria-live="polite">${l.cantidad}</span>
                  <button type="button" data-mas="${p.id}" aria-label="Añadir una unidad de ${p.nombre}">+</button>
                </div>
              </div>
              <button class="item-carrito__eliminar" type="button" data-quitar="${p.id}" aria-label="Eliminar ${p.nombre} del carrito">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
                  <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/>
                </svg>
              </button>
            </div>`;
        })
        .join('');
    }

    // Subtotal y envío gratis
    const total = subtotal();
    if (subtotalEl) subtotalEl.textContent = dinero(total);
    if (notaEnvio) {
      if (total === 0) {
        notaEnvio.textContent =
          'Añade productos para conseguir envío gratis desde 50€.';
      } else if (total >= 50) {
        notaEnvio.textContent = '¡Tu pedido tiene envío gratis! 🚚';
      } else {
        notaEnvio.textContent =
          `Te faltan ${dinero(50 - total)} para el envío gratis.`;
      }
    }
    if (limpiarMensaje && mensajeCompra) {
      mensajeCompra.textContent = '';
      mensajeCompra.className = 'mensaje';
    }
  }

  /* --- Apertura y cierre del panel lateral (drawer) --- */

  function abrirCarrito() {
    if (!panelCarrito) return;
    panelCarrito.classList.add('is-abierto');
    panelCarrito.setAttribute('aria-hidden', 'false');
    if (btnAbrirCarrito) btnAbrirCarrito.setAttribute('aria-expanded', 'true');
    if (overlay) {
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add('is-visible'));
    }
    document.body.style.overflow = 'hidden';
    if (btnCerrarCarrito) btnCerrarCarrito.focus();
  }

  function cerrarCarrito() {
    if (!panelCarrito) return;
    panelCarrito.classList.remove('is-abierto');
    panelCarrito.setAttribute('aria-hidden', 'true');
    if (btnAbrirCarrito) btnAbrirCarrito.setAttribute('aria-expanded', 'false');
    if (overlay) {
      overlay.classList.remove('is-visible');
      setTimeout(() => {
        if (overlay && !panelCarrito.classList.contains('is-abierto')) {
          overlay.hidden = true;
        }
      }, 300);
    }
    document.body.style.overflow = '';
    if (btnAbrirCarrito) btnAbrirCarrito.focus();
  }

  if (btnAbrirCarrito) btnAbrirCarrito.addEventListener('click', abrirCarrito);
  if (btnCerrarCarrito) btnCerrarCarrito.addEventListener('click', cerrarCarrito);
  if (overlay) overlay.addEventListener('click', cerrarCarrito);

  // Cerrar con la tecla Escape (accesibilidad)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelCarrito?.classList.contains('is-abierto')) {
      cerrarCarrito();
    }
  });

  /* --- Eventos delegados: añadir, cantidades, eliminar --- */

  document.addEventListener('click', (e) => {
    const btnAdd = e.target.closest('[data-add]');
    if (btnAdd) {
      añadirAlCarrito(btnAdd.dataset.add, 1);
      // Feedback visual momentáneo en el botón
      const textoOriginal = btnAdd.textContent;
      btnAdd.textContent = '¡Añadido! ✓';
      btnAdd.classList.add('btn--anadido');
      setTimeout(() => {
        btnAdd.textContent = textoOriginal;
        btnAdd.classList.remove('btn--anadido');
      }, 1200);
      return;
    }

    const btnMas = e.target.closest('[data-mas]');
    if (btnMas) {
      cambiarCantidad(btnMas.dataset.mas, 1);
      return;
    }

    const btnMenos = e.target.closest('[data-menos]');
    if (btnMenos) {
      cambiarCantidad(btnMenos.dataset.menos, -1);
      return;
    }

    const btnQuitar = e.target.closest('[data-quitar]');
    if (btnQuitar) {
      eliminarLinea(btnQuitar.dataset.quitar);
    }
  });

  /* --- Vaciar carrito --- */
  if (btnVaciar) {
    btnVaciar.addEventListener('click', () => {
      if (carrito.length === 0) return;
      if (confirm('¿Seguro que quieres vaciar el carrito?')) {
        carrito = [];
        guardarCarrito();
        renderCarrito();
        mostrarToast('Carrito vaciado');
      }
    });
  }

  /* ========================================================================
     11. CHECKOUT REAL — POST /api/pedidos
     -----------------------------------------------------------------------
     · Con servidor: crea el pedido en la BD, descuenta stock y devuelve la
       referencia (NV-2026-1042) con los importes calculados.
     · Sin servidor: se mantiene el mensaje de demo de siempre.
     · Si el servidor devuelve 4xx (stock agotado, validación, límite) se
       muestra el error y el carrito NO se vacía.
     ======================================================================== */

  /** Escribe el mensaje del checkout UNA sola vez (evita el texto duplicado) */
  function pintarMensajeCompra(texto, clase) {
    if (!mensajeCompra) return;
    mensajeCompra.textContent = texto;
    mensajeCompra.className = 'mensaje' + (clase ? ' ' + clase : '');
  }

  /** Lee y valida los datos de envío. Devuelve el objeto o null si hay errores */
  function datosDeEnvio() {
    const valor = (campo) => (campo && campo.value ? campo.value.trim() : '');
    const datos = {
      nombre: valor(camposEnvio.nombre),
      email: valor(camposEnvio.email),
      direccion: valor(camposEnvio.direccion),
      ciudad: valor(camposEnvio.ciudad),
      cp: valor(camposEnvio.cp)
    };

    const comprobaciones = [
      [camposEnvio.nombre, datos.nombre.length < 2, 'Escribe tu nombre y apellidos.'],
      [camposEnvio.email, !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(datos.email), 'El correo no tiene un formato válido (ej: hola@correo.com).'],
      [camposEnvio.direccion, datos.direccion.length < 5, 'La dirección debe tener al menos 5 caracteres.'],
      [camposEnvio.ciudad, datos.ciudad.length < 2, 'Escribe la ciudad de entrega.'],
      [camposEnvio.cp, !/^[0-9A-Za-z -]{4,10}$/.test(datos.cp), 'El código postal no es válido (4 a 10 caracteres).']
    ].filter(([, malo]) => malo);

    Object.values(camposEnvio).forEach((c) => c && c.classList.remove('is-error'));

    if (comprobaciones.length) {
      comprobaciones.forEach(([campo]) => campo && campo.classList.add('is-error'));
      pintarMensajeCompra('✗ ' + comprobaciones[0][2], 'is-error');
      if (comprobaciones[0][0]) comprobaciones[0][0].focus();
      return null;
    }
    return datos;
  }

  /** Vacía el carrito SIN borrar el mensaje (para no repetir el resultado) */
  function vaciarTrasCompra() {
    carrito = [];
    guardarCarrito();
    renderCarrito({ limpiarMensaje: false });
  }

  /** Texto original del botón (para restaurarlo tras "Enviando…") */
  const textoFinalizar = btnFinalizar ? btnFinalizar.textContent.trim() : 'Finalizar compra';

  function alFinalizarCompra(e) {
    if (e) e.preventDefault();

    if (carrito.length === 0) {
      pintarMensajeCompra('Tu carrito está vacío.', 'is-error');
      return;
    }

    // 1) Datos de envío del formulario (#formCheckout)
    const cliente = datosDeEnvio();
    if (!cliente) return;

    const unidades = unidadesTotales();
    const totalLocal = subtotal();
    const lineas = carrito.map((l) => ({ id: Number(l.id), cantidad: Number(l.cantidad) }));

    // 2) Estado "Enviando…"
    if (btnFinalizar) {
      btnFinalizar.disabled = true;
      btnFinalizar.textContent = 'Enviando…';
    }
    pintarMensajeCompra('Enviando el pedido…', '');

    // 3) Pedido real en el servidor
    api('/api/pedidos', { method: 'POST', body: JSON.stringify({ cliente, lineas }) })
      .then((pedido) => {
        vaciarTrasCompra();
        pintarMensajeCompra(
          `¡Pedido confirmado! Referencia ${pedido.referencia} · ${unidades} unidad(es) · ` +
            `Total ${dinero(pedido.total)} (envío ${Number(pedido.envio) === 0 ? 'gratis' : dinero(pedido.envio)}, ` +
            `IVA de ${dinero(pedido.iva)} incluido). Te avisaremos por correo.`,
          'is-exito'
        );
        mostrarToast(`¡Compra realizada! Pedido ${pedido.referencia}`);
        if (formCheckout) formCheckout.reset();
      })
      .catch((fallos) => {
        if (fallos && fallos.estado) {
          // El servidor respondió (400 validación, 409 stock, 429 límite…):
          // se queda el carrito tal cual y se muestra su mensaje
          const extra =
            fallos.datos && Array.isArray(fallos.datos.detalle)
              ? ' ' + fallos.datos.detalle.join(' ')
              : '';
          pintarMensajeCompra('✗ ' + fallos.message + extra, 'is-error');
          return;
        }
        // Sin servidor (index.html abierto directamente): modo demo, como antes
        vaciarTrasCompra();
        pintarMensajeCompra(
          `¡Pedido confirmado! ${unidades} unidad(es) por ${dinero(totalLocal)}. ` +
            'Recibirás el correo de seguimiento en unos minutos. ' +
            '(Modo demo: ejecuta `npm start` para guardarlo en el servidor.)',
          'is-exito'
        );
        mostrarToast('¡Compra realizada con éxito!');
      })
      .finally(() => {
        if (btnFinalizar) {
          btnFinalizar.disabled = false;
          btnFinalizar.textContent = textoFinalizar;
        }
      });
  }

  // El botón "Finalizar compra" es el submit del formulario de envío
  if (formCheckout) {
    formCheckout.addEventListener('submit', alFinalizarCompra);
  } else if (btnFinalizar) {
    // Respaldo por si quitas el formulario del HTML
    btnFinalizar.addEventListener('click', alFinalizarCompra);
  }

  /* --- Aviso flotante (toast) --- */
  let temporizadorToast = null;
  function mostrarToast(texto) {
    if (!toast) return;
    toast.textContent = texto;
    toast.classList.add('is-visible');
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2200);
  }

  /* ========================================================================
     12. NEWSLETTER CON VALIDACIÓN (POST /api/newsletter, con modo demo)
     ======================================================================== */

  const formNews = $('#formNewsletter');
  const inputEmail = $('#email');
  const msgEmail = $('#mensajeEmail');

  if (formNews) {
    formNews.addEventListener('submit', (e) => {
      e.preventDefault();
      const valor = inputEmail ? inputEmail.value.trim() : '';
      const esValido = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(valor);

      if (!msgEmail || !inputEmail) return;

      if (!valor) {
        msgEmail.textContent = 'Escribe tu correo electrónico.';
        msgEmail.className = 'mensaje is-error';
        inputEmail.classList.add('is-error');
        inputEmail.focus();
        return;
      }

      if (!esValido) {
        msgEmail.textContent = 'El formato del correo no es válido (ej: hola@correo.com).';
        msgEmail.className = 'mensaje is-error';
        inputEmail.classList.add('is-error');
        inputEmail.focus();
        return;
      }

      // Todo correcto: se envía al servidor (si no hay, responde en modo demo)
      inputEmail.classList.remove('is-error');
      const btnSuscribir = formNews.querySelector('button[type="submit"]');
      if (btnSuscribir) btnSuscribir.disabled = true;
      msgEmail.textContent = 'Enviando…';
      msgEmail.className = 'mensaje';

      api('/api/newsletter', { method: 'POST', body: JSON.stringify({ email: valor }) })
        .then((datos) => {
          msgEmail.textContent = datos.mensaje || '¡Listo! Revisa tu correo para confirmar la suscripción.';
          msgEmail.className = 'mensaje is-exito';
          formNews.reset();
          mostrarToast('Suscripción confirmada');
        })
        .catch((fallos) => {
          if (fallos && fallos.estado) {
            // El servidor ha respondido con un error (formato, límite por IP…)
            msgEmail.textContent = '✗ ' + fallos.message;
            msgEmail.className = 'mensaje is-error';
            inputEmail.classList.add('is-error');
            inputEmail.focus();
            return;
          }
          // Sin servidor (index.html abierto directamente): mensaje local
          msgEmail.textContent =
            '¡Listo! Revisa tu correo para confirmar la suscripción. ' +
            '(Modo demo: ejecuta `npm start` para guardarlo en el servidor.)';
          msgEmail.className = 'mensaje is-exito';
          formNews.reset();
          mostrarToast('Suscripción confirmada');
        })
        .finally(() => {
          if (btnSuscribir) btnSuscribir.disabled = false;
        });
    });

    // Quitar el estado de error al escribir de nuevo
    if (inputEmail) {
      inputEmail.addEventListener('input', () => {
        inputEmail.classList.remove('is-error');
        if (msgEmail && msgEmail.classList.contains('is-error')) {
          msgEmail.textContent = '';
          msgEmail.className = 'mensaje';
        }
      });
    }
  }

  /* ========================================================================
     INICIALIZACIÓN
     ======================================================================== */

  // Sincroniza el botón de tema con el tema ya aplicado por el script del <head>
  if (btnTema) aplicarTema(temaActual());

  // Pinta el catálogo y el carrito con los datos locales (respuesta inmediata)
  pintarCatalogo();
  renderCarrito();

  // Si hay servidor, el catálogo se sustituye por el de la base de datos
  // (GET /api/productos): mismos campos que el array local + `stock`.
  // Si no responde, nos quedamos con el array local → modo estático.
  api('/api/productos')
    .then((datos) => {
      if (!Array.isArray(datos) || !datos.length) return;
      catalogo = datos;
      pintarCatalogo(); // respeta estado.filtro / estado.orden / estado.busqueda
      renderCarrito(); // precios y subtotales al día con la BD
      console.info('[api] Catálogo sincronizado desde el servidor (' + datos.length + ' productos).');
    })
    .catch(() => {
      console.info('[api] Sin servidor: los productos salen del array local (modo estático).');
    });
})();
