/* ==========================================================================
   NOVA ANALYTICS — JavaScript principal (vanilla, sin librerías)
   --------------------------------------------------------------------------
   Secciones:
     0.  Cliente de la API (con reserva en modo estático)
     1.  Utilidades generales
     2.  Tema claro / oscuro
     3.  Menú lateral (móvil)
     4.  Navegación de vistas
     5.  Contadores animados (KPI)
     6.  Datos de demostración
     7.  Render: pedidos, actividad y equipo
     8.  Render: productos y clientes
     9.  Filtros y búsqueda
    10.  Gráfica de líneas (ingresos vs. objetivo)
    11.  Gráfica de barras (ventas por mes)
    12.  Gráfica de dona (ventas por categoría)
    13.  Panel de notificaciones
    14.  Ajustes: switches y formulario
    15.  Buscador global (Ctrl K)
    16.  Arranque y redimensionado
    17.  Sincronización con el servidor (por vista)
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     0. CLIENTE DE LA API (envoltorio mínimo de fetch)
     --------------------------------------------------------------------
     Esta plantilla funciona de dos formas:
       a) Doble clic en index.html (sin servidor) → mandan los arrays de la
          sección 6: la web se ve y funciona exactamente igual que siempre.
       b) Con servidor (`npm start`) → al activar cada vista se piden los
          datos a la API y, si responde, SUSTITUYEN a los arrays locales
          justo antes de pintar.
     Si la API falla (o no hay servidor) se conservan los datos locales:
     el panel sigue en modo estático y no se rompe nada.
     ======================================================================== */

  /** '' = mismo dominio. Ej: 'http://localhost:3006' */
  var API_BASE = '';

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

  /** Estado de la API: 'desconocido' | 'ok' | 'sin' (modo estático) */
  let estadoServidor = 'desconocido';
  /** true mientras haya alguna esperanza de encontrar servidor */
  const hayServidor = () => estadoServidor !== 'sin';

  /* ========================================================================
     1. UTILIDADES GENERALES
     ======================================================================== */

  /** Atajo corto para document.querySelector */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  /** Atajo corto para document.querySelectorAll (devuelve array) */
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /** Escape de texto para insertar cadenas dentro de HTML */
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  /** 89.9 → '89,90 €' */
  const dinero = (n) =>
    n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  /** 48920 → '48.920' */
  const numero = (n) => n.toLocaleString('es-ES');

  /** 'Lucía Fernández' → 'LF' */
  const iniciales = (nombre) =>
    nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();

  /** Texto → tono de color estable (para avatares y tarjetas) */
  const tono = (texto) => {
    let h = 0;
    for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) % 360;
    return h;
  };

  /** true si el usuario prefiere menos animación */
  const menosMovimiento =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CLAVE_TEMA = 'nova-tema';

  /** Deja en espera un ejecución y agrupa las repetidas (resize) */
  const esperar = (fn, ms = 150) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  /* ========================================================================
     2. TEMA CLARO / OSCURO
     ======================================================================== */

  const btnTema = $('#btnTema');
  const campoTema = $('#campoTema');

  const temaActual = () =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);

    if (btnTema) {
      btnTema.setAttribute(
        'aria-label',
        tema === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
      );
    }
    if (campoTema && campoTema.value !== tema) campoTema.value = tema;

    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch (e) {
      /* almacenamiento no disponible: la web sigue funcionando */
    }
  }

  if (btnTema) {
    btnTema.addEventListener('click', () =>
      aplicarTema(temaActual() === 'dark' ? 'light' : 'dark')
    );
  }
  if (campoTema) {
    campoTema.value = temaActual();
    campoTema.addEventListener('change', () => aplicarTema(campoTema.value));
  }

  /* ========================================================================
     3. MENÚ LATERAL (MÓVIL)
     ======================================================================== */

  const sidebar = $('#sidebar');
  const fondoSidebar = $('#fondoSidebar');
  const btnAbrir = $('#abrirSidebar');
  const btnCerrar = $('#cerrarSidebar');

  function alternarSidebar(abierto) {
    if (!sidebar) return;
    sidebar.classList.toggle('is-abierto', abierto);
    if (fondoSidebar) fondoSidebar.hidden = !abierto;
    if (btnAbrir) btnAbrir.setAttribute('aria-expanded', String(abierto));
    document.body.style.overflow = abierto ? 'hidden' : '';
  }

  if (btnAbrir) btnAbrir.addEventListener('click', () => alternarSidebar(true));
  if (btnCerrar) btnCerrar.addEventListener('click', () => alternarSidebar(false));
  if (fondoSidebar) fondoSidebar.addEventListener('click', () => alternarSidebar(false));

  /* ========================================================================
     4. NAVEGACIÓN DE VISTAS
     ======================================================================== */

  /** Título y subtítulo de cada sección del panel */
  const VISTAS = {
    resumen: {
      titulo: 'Resumen',
      subtitulo: 'Bienvenida, Marta. Esto es lo que ha pasado hoy.'
    },
    ventas: {
      titulo: 'Ventas',
      subtitulo: 'Rendimiento del equipo y objetivos del trimestre.'
    },
    productos: {
      titulo: 'Productos',
      subtitulo: 'Gestiona el catálogo, los precios y el stock.'
    },
    clientes: {
      titulo: 'Clientes',
      subtitulo: 'Tu cartera de cuentas y su actividad reciente.'
    },
    pedidos: {
      titulo: 'Pedidos',
      subtitulo: 'Seguimiento de todos los pedidos de la tienda.'
    },
    ajustes: {
      titulo: 'Ajustes',
      subtitulo: 'Personaliza tu perfil, las notificaciones y la apariencia.'
    }
  };

  let vistaActual = 'resumen';
  const tituloVista = $('#tituloVista');
  const subtituloVista = $('#subtituloVista');

  function irA(vista) {
    if (!VISTAS[vista]) return;
    vistaActual = vista;

    $$('.vista').forEach((sec) => {
      const activa = sec.id === 'vista-' + vista;
      sec.hidden = !activa;
      sec.classList.toggle('vista--activa', activa);
    });

    $$('.menu__item[data-vista]').forEach((btn) => {
      const activa = btn.dataset.vista === vista;
      btn.classList.toggle('menu__item--activo', activa);
      if (activa) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    if (tituloVista) tituloVista.textContent = VISTAS[vista].titulo;
    if (subtituloVista) subtituloVista.textContent = VISTAS[vista].subtitulo;

    alternarSidebar(false);
    window.scrollTo({ top: 0, behavior: menosMovimiento ? 'auto' : 'smooth' });

    animarContadores($('#vista-' + vista));
    pintarGraficas(vista);
    refrescarListas();

    // Intenta traer los datos del servidor; si no responde, ya está pintado
    // con los arrays locales (modo estático).
    cargarVista(vista);
  }

  $$('.menu__item[data-vista]').forEach((btn) =>
    btn.addEventListener('click', () => irA(btn.dataset.vista))
  );

  /** Botones con data-ir ("Ver todos", atajos, etc.) */
  $$('[data-ir]').forEach((el) =>
    el.addEventListener('click', () => irA(el.dataset.ir))
  );

  /* ========================================================================
     5. CONTADORES ANIMADOS (KPI)
     ======================================================================== */

  function formatearContador(el, valor) {
    const dec = Number(el.dataset.decimales || 0);
    const prefijo = el.dataset.prefijo || '';
    const sufijo = el.dataset.sufijo || '';
    const txt = valor.toLocaleString('es-ES', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec
    });
    el.textContent = prefijo + txt + sufijo;
  }

  function animarContador(el) {
    if (!el || el.dataset.listo === '1') return;
    el.dataset.listo = '1';

    const destino = parseFloat(el.dataset.contador);
    if (isNaN(destino)) return;

    if (menosMovimiento) {
      formatearContador(el, destino);
      return;
    }

    const duracion = 1100;
    const inicio = performance.now();
    const paso = (ahora) => {
      const p = Math.min(1, (ahora - inicio) / duracion);
      const suave = 1 - Math.pow(1 - p, 3); // easeOutCubic
      formatearContador(el, destino * suave);
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  function animarContadores(contenedor) {
    if (!contenedor) return;
    $$('[data-contador]', contenedor).forEach(animarContador);
  }

  /* ========================================================================
     6. DATOS DE DEMOSTRACIÓN (edita estos arrays)
     ======================================================================== */

  let MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  /** Gráfica de líneas: ingresos reales y objetivo, en euros */
  let INGRESOS = [28500, 31200, 29800, 34500, 33100, 38900, 41200, 39800, 44600, 46100, 43900, 48920];
  let OBJETIVO = [30000, 31500, 33000, 34500, 36000, 37500, 39000, 40500, 42000, 44000, 46000, 48000];

  /** Gráfica de barras: unidades vendidas por mes */
  let VENTAS_MES = [
    { m: 'Ene', v: 820 }, { m: 'Feb', v: 910 }, { m: 'Mar', v: 760 },
    { m: 'Abr', v: 1040 }, { m: 'May', v: 980 }, { m: 'Jun', v: 1150 },
    { m: 'Jul', v: 1240 }, { m: 'Ago', v: 1080 }, { m: 'Sep', v: 1320 },
    { m: 'Oct', v: 1410 }, { m: 'Nov', v: 1265 }, { m: 'Dic', v: 1284 }
  ];

  /** Gráfica de dona: reparto de ventas por categoría (%) */
  let DONA = [
    { n: 'Electrónica', v: 38, c: '--color-primary' },
    { n: 'Accesorios', v: 24, c: '--color-accent' },
    { n: 'Oficina', v: 18, c: '--color-success' },
    { n: 'Hogar', v: 12, c: '--color-warning' },
    { n: 'Otros', v: 8, c: '--color-text-muted' }
  ];
  let DONA_TOTAL = 1284;

  /** Pedidos (los más recientes primero) */
  let PEDIDOS = [
    { id: 1043, cliente: 'Carlos Ruiz', producto: 'Teclado Mecánico K2', fecha: '2 oct 2026', importe: 89.9, estado: 'En curso' },
    { id: 1042, cliente: 'Lucía Fernández', producto: 'Monitor NovaView 27"', fecha: '2 oct 2026', importe: 249.9, estado: 'Entregado' },
    { id: 1041, cliente: 'Marta Peña', producto: 'Silla Ergo Flex', fecha: '1 oct 2026', importe: 329, estado: 'Pendiente' },
    { id: 1040, cliente: 'Diego Alonso', producto: 'Auriculares Nova H1', fecha: '1 oct 2026', importe: 149, estado: 'En curso' },
    { id: 1039, cliente: 'Sofía Vidal', producto: 'Webcam NovaCam 4K', fecha: '30 sep 2026', importe: 119.9, estado: 'Entregado' },
    { id: 1038, cliente: 'Iván Soto', producto: 'Portátil NovaBook 14', fecha: '30 sep 2026', importe: 1099, estado: 'Pendiente' },
    { id: 1037, cliente: 'Elena Bravo', producto: 'Dock USB-C Nova', fecha: '29 sep 2026', importe: 79.9, estado: 'Entregado' },
    { id: 1036, cliente: 'Pablo Nieto', producto: 'Monitor NovaView 24"', fecha: '29 sep 2026', importe: 189, estado: 'En curso' },
    { id: 1035, cliente: 'Nuria Cano', producto: 'Ratón Inalámbrico M3', fecha: '28 sep 2026', importe: 45.9, estado: 'Entregado' },
    { id: 1034, cliente: 'Javier Molina', producto: 'Teclado Mecánico K2', fecha: '28 sep 2026', importe: 89.9, estado: 'Pendiente' },
    { id: 1033, cliente: 'Rocío Díaz', producto: 'Silla Ergo Flex', fecha: '27 sep 2026', importe: 329, estado: 'En curso' },
    { id: 1032, cliente: 'Álvaro Sanz', producto: 'Auriculares Nova H1', fecha: '27 sep 2026', importe: 149, estado: 'Entregado' },
    { id: 1031, cliente: 'Patricia Gil', producto: 'Webcam NovaCam 4K', fecha: '26 sep 2026', importe: 119.9, estado: 'Pendiente' },
    { id: 1030, cliente: 'Marcos Vega', producto: 'Portátil NovaBook 14', fecha: '26 sep 2026', importe: 1099, estado: 'En curso' },
    { id: 1029, cliente: 'Teresa León', producto: 'Dock USB-C Nova', fecha: '25 sep 2026', importe: 79.9, estado: 'Entregado' },
    { id: 1028, cliente: 'Raúl Ortega', producto: 'Monitor NovaView 24"', fecha: '25 sep 2026', importe: 189, estado: 'Pendiente' },
    { id: 1027, cliente: 'Clara Mena', producto: 'Ratón Inalámbrico M3', fecha: '24 sep 2026', importe: 45.9, estado: 'En curso' },
    { id: 1026, cliente: 'Hugo Pastor', producto: 'Silla Ergo Flex', fecha: '24 sep 2026', importe: 329, estado: 'Pendiente' }
  ];

  const CLASE_ESTADO = { 'Entregado': 'entregado', 'En curso': 'curso', 'Pendiente': 'pendiente' };

  /** Actividad reciente del panel */
  let ACTIVIDAD = [
    { t: 'pedido', txt: 'Nuevo pedido #1043 de Carlos Ruiz', sub: 'Teclado Mecánico K2 · 89,90 €', tiempo: 'hace 5 min' },
    { t: 'exito', txt: 'Pedido #1042 entregado', sub: 'Lucía Fernández · 249,90 €', tiempo: 'hace 12 min' },
    { t: 'aviso', txt: 'Stock bajo en Auriculares Nova H1', sub: 'Quedan 6 unidades en el almacén', tiempo: 'hace 1 h' },
    { t: 'acento', txt: 'Nueva reseña de 5 estrellas', sub: 'Sobre Monitor NovaView 27"', tiempo: 'hace 3 h' },
    { t: 'pedido', txt: 'Marta Gil editó la ficha de Silla Ergo Flex', sub: 'Precio actualizado a 329,00 €', tiempo: 'hace 5 h' },
    { t: 'exito', txt: 'Cobro de 1.099,00 € confirmado', sub: 'Pedido #1038 · Iván Soto', tiempo: 'ayer, 18:42' }
  ];

  /** Iconos de la lista de actividad */
  const ICONOS = {
    pedido: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
    exito: '<path d="M20 6L9 17l-5-5"/>',
    aviso: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    acento: '<path d="M12 2l2.9 6.3 6.8.8-5 4.6 1.3 6.8L12 17.3 6 20.5l1.3-6.8-5-4.6 6.8-.8z"/>'
  };

  /** Rendimiento del equipo comercial */
  let VENDEDORES = [
    { n: 'Laura Ruiz', ped: 212, fact: 18420, obj: 86 },
    { n: 'Andrés Molina', ped: 198, fact: 16980, obj: 79 },
    { n: 'Carmen Ibáñez', ped: 176, fact: 15240, obj: 71 },
    { n: 'Sergio Lara', ped: 154, fact: 13110, obj: 61 },
    { n: 'Nerea Pou', ped: 132, fact: 11460, obj: 53 }
  ];

  /** Catálogo de productos (3 con stock bajo, como indica el encabezado) */
  let PRODUCTOS = [
    { n: 'Monitor NovaView 27"', c: 'Pantallas', p: 249.9, stock: 32, v: 184, i: '🖥️' },
    { n: 'Portátil NovaBook 14', c: 'Informática', p: 1099, stock: 8, v: 46, i: '💻' },
    { n: 'Auriculares Nova H1', c: 'Audio', p: 149, stock: 6, v: 132, i: '🎧' },
    { n: 'Teclado Mecánico K2', c: 'Periféricos', p: 89.9, stock: 54, v: 210, i: '⌨️' },
    { n: 'Ratón Inalámbrico M3', c: 'Periféricos', p: 45.9, stock: 78, v: 264, i: '🖱️' },
    { n: 'Webcam NovaCam 4K', c: 'Videollamadas', p: 119.9, stock: 9, v: 97, i: '📷' },
    { n: 'Silla Ergo Flex', c: 'Oficina', p: 329, stock: 21, v: 64, i: '🪑' },
    { n: 'Dock USB-C Nova', c: 'Accesorios', p: 79.9, stock: 43, v: 158, i: '🔌' },
    { n: 'Monitor NovaView 24"', c: 'Pantallas', p: 189, stock: 27, v: 121, i: '🖥️' },
    { n: 'Disco Nova SSD 1 TB', c: 'Almacenamiento', p: 99, stock: 62, v: 176, i: '💾' },
    { n: 'Lámpara Nova Light', c: 'Oficina', p: 59, stock: 35, v: 88, i: '💡' },
    { n: 'Mochila Nova Bag', c: 'Accesorios', p: 69, stock: 4, v: 52, i: '🎒' }
  ];

  /** Cartera de clientes destacados */
  let CLIENTES = [
    { n: 'Lucía Fernández', mail: 'lucia.fernandez@correo.es', plan: 'Pro', pais: 'España', ped: 34, fact: 8420 },
    { n: 'Carlos Ruiz', mail: 'carlos.ruiz@empresa.com', plan: 'Business', pais: 'España', ped: 21, fact: 6180 },
    { n: 'Sofía Vidal', mail: 'sofia.vidal@correo.mx', plan: 'Pro', pais: 'México', ped: 18, fact: 4970 },
    { n: 'Diego Alonso', mail: 'd.alonso@mail.ar', plan: 'Free', pais: 'Argentina', ped: 7, fact: 1240 },
    { n: 'Elena Bravo', mail: 'elena@bravo.cl', plan: 'Business', pais: 'Chile', ped: 44, fact: 11380 },
    { n: 'Iván Soto', mail: 'ivan.soto@correo.co', plan: 'Free', pais: 'Colombia', ped: 5, fact: 980 },
    { n: 'Marta Peña', mail: 'marta.pena@nova.es', plan: 'Pro', pais: 'España', ped: 27, fact: 7260 },
    { n: 'Pablo Nieto', mail: 'p.nieto@correo.pe', plan: 'Pro', pais: 'Perú', ped: 15, fact: 4310 },
    { n: 'Nuria Cano', mail: 'nuria.cano@correo.uy', plan: 'Business', pais: 'Uruguay', ped: 31, fact: 9040 }
  ];

  /* ========================================================================
     7. RENDER: PEDIDOS, ACTIVIDAD Y EQUIPO
     ======================================================================== */

  const cuerpoResumen = $('#cuerpoPedidosResumen');
  const cuerpoPedidos = $('#cuerpoPedidos');
  const pedidosVacio = $('#pedidosVacio');
  const contadorMenuPedidos = $('#contadorMenuPedidos');

  const botonAccion = (id) =>
    `<td class="celda-acciones">
       <button class="icono-btn icono-btn--sm" type="button" aria-label="Ver detalle del pedido ${id}">
         <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
           <circle cx="5" cy="12" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="19" cy="12" r="1.8"></circle>
         </svg>
       </button>
     </td>`;

  function filaPedido(p, conId) {
    const busqueda = (p.id + ' ' + p.cliente + ' ' + p.producto + ' ' + p.estado).toLowerCase();
    return `<tr data-estado="${esc(p.estado)}" data-busqueda="${esc(busqueda)}">
      ${conId ? `<td><span class="pedido-id">#${p.id}</span></td>` : ''}
      <td>
        <div class="celda-cliente">
          <span class="avatar avatar--sm" style="--h:${tono(p.cliente)}" aria-hidden="true">${iniciales(p.cliente)}</span>
          ${esc(p.cliente)}
        </div>
      </td>
      <td>${esc(p.producto)}</td>
      <td class="celda-mute">${esc(p.fecha)}</td>
      <td class="celda-num">${dinero(p.importe)}</td>
      <td><span class="estado estado--${CLASE_ESTADO[p.estado]}">${esc(p.estado)}</span></td>
      ${botonAccion(p.id)}
    </tr>`;
  }

  let filtroEstado = 'todos';
  let textoBusqueda = '';
  /** Último lote de pedidos devuelto por el servidor (null = filtro local) */
  let pedidosRemotos = null;

  function pedidosFiltrados() {
    // Si el servidor ya ha filtrado (estado + texto), su respuesta manda
    if (Array.isArray(pedidosRemotos)) return pedidosRemotos;
    return PEDIDOS.filter((p) => {
      const okEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
      const okTexto =
        !textoBusqueda ||
        (p.id + ' ' + p.cliente + ' ' + p.producto + ' ' + p.estado)
          .toLowerCase()
          .includes(textoBusqueda);
      return okEstado && okTexto;
    });
  }

  function renderPedidos() {
    if (!cuerpoPedidos) return;
    const lista = pedidosFiltrados();
    cuerpoPedidos.innerHTML = lista.map((p) => filaPedido(p, true)).join('');
    if (pedidosVacio) pedidosVacio.hidden = lista.length > 0;
  }

  /** Tabla "Últimos pedidos" del resumen + contador del menú lateral */
  function pintarPedidosResumen() {
    if (cuerpoResumen) {
      cuerpoResumen.innerHTML = PEDIDOS.slice(0, 5).map((p) => filaPedido(p, false)).join('');
    }
    if (contadorMenuPedidos) {
      contadorMenuPedidos.textContent = String(
        PEDIDOS.filter((p) => p.estado !== 'Entregado').length
      );
    }
  }
  pintarPedidosResumen();

  /** Chips de filtro de la vista de pedidos.
   *  Con servidor el filtrado lo hace la API (?estado=…); sin servidor, local. */
  $$('.filtros [data-filtro]').forEach((chip) => {
    chip.addEventListener('click', () => {
      filtroEstado = chip.dataset.filtro;
      $$('.filtros [data-filtro]').forEach((c) =>
        c.classList.toggle('chip--activo', c === chip)
      );
      if (hayServidor()) cargarPedidos();
      else renderPedidos();
    });
  });

  /** Lista de actividad reciente */
  const listaActividad = $('#listaActividad');

  function pintarActividad() {
    if (!listaActividad) return;
    listaActividad.innerHTML = ACTIVIDAD.map(
      (a) => `<li class="actividad__item">
        <span class="actividad__ico ${a.t ? 'actividad__ico--' + a.t : ''}" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            ${ICONOS[a.t] || ICONOS.pedido}
          </svg>
        </span>
        <p class="actividad__txt">${esc(a.txt)}
          <small>${esc(a.sub)} · ${esc(a.tiempo)}</small>
        </p>
      </li>`
    ).join('');
  }
  pintarActividad();

  /** Tabla de rendimiento del equipo */
  const cuerpoVendedores = $('#cuerpoVendedores');

  function pintarVendedores() {
    if (!cuerpoVendedores) return;
    cuerpoVendedores.innerHTML = VENDEDORES.map(
      (v) => `<tr>
        <td>
          <div class="vendedor">
            <span class="avatar avatar--sm" style="--h:${tono(v.n)}" aria-hidden="true">${iniciales(v.n)}</span>
            ${esc(v.n)}
          </div>
        </td>
        <td class="celda-num">${numero(v.ped)}</td>
        <td class="celda-num">${dinero(v.fact)}</td>
        <td class="col-ancha">
          <div class="objetivo">
            <span>${v.obj} %</span>
            <div class="barra" role="img" aria-label="Objetivo cumplido al ${v.obj} %">
              <span class="barra__relleno ${v.obj >= 75 ? '' : v.obj >= 60 ? 'barra__relleno--aviso' : ''}" style="width:${v.obj}%"></span>
            </div>
          </div>
        </td>
      </tr>`
    ).join('');
  }
  pintarVendedores();

  /* ========================================================================
     8. RENDER: PRODUCTOS Y CLIENTES
     ======================================================================== */

  const rejillaProductos = $('#rejillaProductos');
  const rejillaClientes = $('#rejillaClientes');

  function pintarProductos() {
    if (!rejillaProductos) return;
    rejillaProductos.innerHTML = PRODUCTOS.map((p) => {
      const bajo = p.stock < 10;
      const anchoStock = Math.min(100, Math.round((p.stock / 60) * 100));
      const busqueda = (p.n + ' ' + p.c).toLowerCase();
      return `<article class="producto" data-busqueda="${esc(busqueda)}">
        <div class="producto__media" style="--h:${tono(p.n)}" aria-hidden="true">${p.i}</div>
        <div class="producto__cuerpo">
          <span class="producto__cat">${esc(p.c)}</span>
          <h3 class="producto__nombre">${esc(p.n)}</h3>
          <div class="producto__pie">
            <span class="producto__precio">${dinero(p.p)}</span>
            <span class="badge ${bajo ? 'badge--aviso' : 'badge--ok'}">${bajo ? 'Stock bajo' : 'En stock'}</span>
          </div>
          <div class="producto__stock"><span>${numero(p.stock)} unidades</span><span>${numero(p.v)} ventas</span></div>
          <div class="barra">
            <span class="barra__relleno ${bajo ? 'barra__relleno--aviso' : ''}" style="width:${anchoStock}%"></span>
          </div>
        </div>
      </article>`;
    }).join('');

    const bajos = PRODUCTOS.filter((p) => p.stock < 10).length;
    const subtitulo = $('#vista-productos .tarjeta__subtitulo');
    if (subtitulo) {
      subtitulo.textContent =
        `${PRODUCTOS.length} artículos activos · ${bajos} con stock bajo`;
    }
  }
  pintarProductos();

  function pintarClientes() {
    if (!rejillaClientes) return;
    rejillaClientes.innerHTML = CLIENTES.map((c) => {
      const planClase = c.plan === 'Business' ? 'badge' : c.plan === 'Pro' ? 'badge badge--ok' : 'badge badge--gris';
      const busqueda = (c.n + ' ' + c.mail + ' ' + c.pais + ' ' + c.plan).toLowerCase();
      return `<article class="cliente" data-busqueda="${esc(busqueda)}">
        <div class="cliente__top">
          <span class="avatar avatar--lg" style="--h:${tono(c.n)}" aria-hidden="true">${iniciales(c.n)}</span>
          <div class="cliente__info">
            <p class="cliente__nombre">${esc(c.n)}</p>
            <p class="cliente__mail">${esc(c.mail)}</p>
          </div>
        </div>
        <div class="cliente__badges">
          <span class="${planClase}">${esc(c.plan)}</span>
          <span class="badge badge--gris">${esc(c.pais)}</span>
        </div>
        <div class="cliente__pie">
          <span class="cliente__dato"><strong>${c.ped}</strong> pedidos</span>
          <span class="cliente__dato"><strong>${dinero(c.fact)}</strong> facturado</span>
        </div>
      </article>`;
    }).join('');
  }
  pintarClientes();

  /* ========================================================================
     9. FILTROS Y BÚSQUEDA
     ======================================================================== */

  /** Crea (una sola vez) el aviso de "sin resultados" dentro de un contenedor */
  function avisoVacio(contenedor) {
    if (!contenedor) return null;
    let aviso = contenedor.parentElement.querySelector('[data-vacio-busqueda]');
    if (!aviso) {
      aviso = document.createElement('p');
      aviso.className = 'vacio';
      aviso.setAttribute('data-vacio-busqueda', '');
      aviso.hidden = true;
      contenedor.insertAdjacentElement('afterend', aviso);
    }
    return aviso;
  }

  function filtrarTarjetas(contenedor) {
    if (!contenedor) return 0;
    const tarjetas = $$('[data-busqueda]', contenedor);
    let visibles = 0;
    tarjetas.forEach((tarjeta) => {
      const coincide = !textoBusqueda || tarjeta.dataset.busqueda.includes(textoBusqueda);
      tarjeta.hidden = !coincide;
      if (coincide) visibles++;
    });
    const aviso = avisoVacio(contenedor);
    if (aviso) {
      aviso.hidden = visibles > 0;
      aviso.textContent = textoBusqueda
        ? `No hay resultados para "${textoBusqueda}".`
        : 'No hay resultados.';
    }
    return visibles;
  }

  function refrescarListas() {
    filtrarTarjetas(rejillaProductos);
    filtrarTarjetas(rejillaClientes);
    renderPedidos();
  }

  /* ========================================================================
     10. GRÁFICA DE LÍNEAS (ingresos vs. objetivo)
     ======================================================================== */

  /** Tooltip reutilizable dentro de un contenedor de gráfica */
  function tooltip(contenedor) {
    let t = contenedor.querySelector('.grafica__tooltip');
    if (!t) {
      t = document.createElement('div');
      t.className = 'grafica__tooltip';
      t.hidden = true;
      contenedor.appendChild(t);
    }
    return t;
  }

  /** Coloca el tooltip sin que se salga del gráfico (y por debajo si arriba falta sitio) */
  function situar(t, x, y, ancho) {
    t.style.left = Math.max(84, Math.min(ancho - 84, x)) + 'px';
    t.style.top = y + 'px';
    t.classList.toggle('grafica__tooltip--abajo', y < 110);
  }

  function pintarLineas() {
    const c = $('#contenedorGraficaLineas');
    if (!c) return;
    const W = c.clientWidth;
    const H = c.clientHeight;
    if (!W || !H) return; // la vista está oculta

    const p = { t: 18, r: 14, b: 30, l: 56 };
    const iw = W - p.l - p.r;
    const ih = H - p.t - p.b;
    const n = INGRESOS.length;

    const todos = INGRESOS.concat(OBJETIVO);
    const paso = 5000;
    const min = Math.floor(Math.min.apply(null, todos) / paso) * paso;
    const max = Math.ceil(Math.max.apply(null, todos) / paso) * paso;

    const x = (i) => p.l + (iw * i) / (n - 1);
    const y = (v) => p.t + ih * (1 - (v - min) / (max - min || 1));
    const linea = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const miles = (v) => (v >= 1000 ? Math.round(v / 1000) + 'k' : String(v));

    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de líneas con los ingresos y el objetivo de los últimos 12 meses">`;

    // Rejilla + eje Y
    const lineas = 5;
    for (let k = 0; k <= lineas; k++) {
      const v = min + ((max - min) * k) / lineas;
      const yy = y(v);
      svg += `<line class="rejilla-linea" x1="${p.l}" y1="${yy.toFixed(1)}" x2="${W - p.r}" y2="${yy.toFixed(1)}"/>`;
      svg += `<text class="eje-y" x="${p.l - 10}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${miles(v)}</text>`;
    }

    // Área bajo la serie principal
    const base = p.t + ih;
    svg += `<path class="serie-area" d="${linea(INGRESOS)} L${x(n - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z"/>`;

    // Serie objetivo + serie principal
    svg += `<path class="serie-linea serie-linea--acento" d="${linea(OBJETIVO)}"/>`;
    svg += `<path class="serie-linea" d="${linea(INGRESOS)}"/>`;

    // Puntos
    INGRESOS.forEach((v, i) => {
      svg += `<circle class="serie-punto" data-punto="${i}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4"/>`;
    });

    // Eje X
    INGRESOS.forEach((_, i) => {
      svg += `<text class="eje-x" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${MESES[i]}</text>`;
    });

    // Guía vertical + zonas de interacción
    svg += `<line class="zona-guia" data-guia x1="0" y1="${p.t}" x2="0" y2="${base}" style="display:none"/>`;
    const medio = iw / (n - 1) / 2;
    INGRESOS.forEach((_, i) => {
      const xz = Math.max(p.l, x(i) - medio);
      const wz = Math.min(medio * 2, W - p.r - xz);
      svg += `<rect class="zona" data-i="${i}" x="${xz.toFixed(1)}" y="${p.t}" width="${wz.toFixed(1)}" height="${ih}"/>`;
    });

    svg += '</svg>';
    c.innerHTML = svg;

    // Interacción: tooltip al pasar el ratón (o tocar) cada mes
    const t = tooltip(c);
    const guia = c.querySelector('[data-guia]');

    const mostrar = (i) => {
      const vIng = INGRESOS[i];
      const vObj = OBJETIVO[i];
      t.innerHTML = `<strong>${MESES[i]} 2026</strong>
        <span class="f"><span class="punto punto--primario"></span> Ingresos <b>${dinero(vIng)}</b></span>
        <span class="f"><span class="punto punto--acento"></span> Objetivo <b>${dinero(vObj)}</b></span>`;
      t.hidden = false;
      situar(t, x(i), y(vIng), W);

      if (guia) {
        guia.style.display = '';
        guia.setAttribute('x1', x(i).toFixed(1));
        guia.setAttribute('x2', x(i).toFixed(1));
      }
      $$('[data-punto]', c).forEach((dot) =>
        dot.classList.toggle('serie-punto--activo', Number(dot.dataset.punto) === i)
      );
    };

    const ocultar = () => {
      t.hidden = true;
      if (guia) guia.style.display = 'none';
      $$('[data-punto]', c).forEach((dot) => dot.classList.remove('serie-punto--activo'));
    };

    $$('.zona', c).forEach((z) => {
      const i = Number(z.dataset.i);
      z.addEventListener('mouseenter', () => mostrar(i));
      z.addEventListener('click', () => mostrar(i));
    });
    c.onmouseleave = ocultar;
  }

  /* ========================================================================
     11. GRÁFICA DE BARRAS (ventas por mes)
     ======================================================================== */

  function rutaBarra(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h));
    return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
  }

  function pintarBarras() {
    const c = $('#contenedorGraficaBarras');
    if (!c) return;
    const W = c.clientWidth;
    const H = c.clientHeight;
    if (!W || !H) return;

    const p = { t: 22, r: 14, b: 30, l: 50 };
    const iw = W - p.l - p.r;
    const ih = H - p.t - p.b;
    const n = VENTAS_MES.length;

    const max = Math.ceil(Math.max.apply(null, VENTAS_MES.map((d) => d.v)) / 200) * 200;
    const y = (v) => p.t + ih * (1 - v / max);
    const pasoZona = iw / n;
    const anchoBarra = Math.min(34, pasoZona * 0.58);
    const maximo = Math.max.apply(null, VENTAS_MES.map((d) => d.v));

    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de barras con las unidades vendidas cada mes">`;

    for (let k = 0; k <= 4; k++) {
      const v = (max * k) / 4;
      const yy = y(v);
      svg += `<line class="rejilla-linea" x1="${p.l}" y1="${yy.toFixed(1)}" x2="${W - p.r}" y2="${yy.toFixed(1)}"/>`;
      svg += `<text class="eje-y" x="${p.l - 10}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${numero(v)}</text>`;
    }

    const ocultarEtiqueta = W < 520;
    VENTAS_MES.forEach((d, i) => {
      const cx = p.l + pasoZona * i + pasoZona / 2;
      const bx = cx - anchoBarra / 2;
      const by = y(d.v);
      const bh = p.t + ih - by;
      svg += `<path class="barra-g ${d.v === maximo ? 'barra-g--acento' : ''}" d="${rutaBarra(bx, by, anchoBarra, bh, 7)}"><title>${d.m}: ${numero(d.v)} unidades</title></path>`;
      if (!ocultarEtiqueta || i % 2 === 0) {
        svg += `<text class="eje-x" x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle">${d.m}</text>`;
      }
      svg += `<rect class="zona" data-i="${i}" x="${(p.l + pasoZona * i).toFixed(1)}" y="${p.t}" width="${pasoZona.toFixed(1)}" height="${ih}"/>`;
    });

    svg += '</svg>';
    c.innerHTML = svg;

    const t = tooltip(c);
    $$('.zona', c).forEach((z) => {
      const i = Number(z.dataset.i);
      const d = VENTAS_MES[i];
      const cx = p.l + pasoZona * i + pasoZona / 2;
      const mostrar = () => {
        t.innerHTML = `<strong>${d.m} 2026</strong>
          <span class="f"><span class="punto punto--primario"></span> Unidades <b>${numero(d.v)}</b></span>
          <span class="f">Media <b>${numero(Math.round(max / 12))}</b></span>`;
        t.hidden = false;
        situar(t, cx, y(d.v), W);
      };
      z.addEventListener('mouseenter', mostrar);
      z.addEventListener('click', mostrar);
    });
    c.onmouseleave = () => { t.hidden = true; };
  }

  /* ========================================================================
     12. GRÁFICA DE DONA (ventas por categoría)
     ======================================================================== */

  function pintarDona() {
    const c = $('#contenedorDona');
    const leyenda = $('#leyendaDona');
    if (!c || !leyenda) return;

    const S = 220;
    const R = 78;
    const C = 2 * Math.PI * R;
    const centro = S / 2;

    let svg = `<svg viewBox="0 0 ${S} ${S}" role="img" aria-label="Reparto de ventas por categoría">`;
    svg += `<circle class="dona__pista" cx="${centro}" cy="${centro}" r="${R}"/>`;

    let acumulado = 0;
    DONA.forEach((d) => {
      const largo = (d.v / 100) * C;
      const hueco = 3;
      svg += `<circle class="dona__rebanada" cx="${centro}" cy="${centro}" r="${R}"
        style="stroke: var(${d.c})"
        stroke-dasharray="${Math.max(0, largo - hueco).toFixed(2)} ${(C - Math.max(0, largo - hueco)).toFixed(2)}"
        stroke-dashoffset="${(-acumulado).toFixed(2)}"
        transform="rotate(-90 ${centro} ${centro})">
        <title>${d.n}: ${d.v} %</title>
      </circle>`;
      acumulado += largo;
    });

    svg += `<text class="dona__total" x="${centro}" y="${centro - 2}">${numero(DONA_TOTAL)}</text>`;
    svg += `<text class="dona__etiqueta" x="${centro}" y="${centro + 22}">ventas · 30 días</text>`;
    svg += '</svg>';
    c.innerHTML = svg;

    leyenda.innerHTML = DONA.map((d) => {
      const unidades = Math.round((DONA_TOTAL * d.v) / 100);
      return `<li>
        <span class="punto" style="--punto-color: var(${d.c})" aria-hidden="true"></span>
        <span>${d.n}<small>${numero(unidades)} unidades</small></span>
        <strong>${d.v} %</strong>
      </li>`;
    }).join('');
  }

  /** Pinta las gráficas que corresponden a la vista activa */
  function pintarGraficas(vista) {
    if (vista === 'resumen') {
      pintarLineas();
      pintarDona();
    }
    if (vista === 'ventas') pintarBarras();
  }

  /* ========================================================================
     13. PANEL DE NOTIFICACIONES
     ======================================================================== */

  const btnNotificaciones = $('#btnNotificaciones');
  const panelNotificaciones = $('#panelNotificaciones');
  const badgeNotificaciones = $('#badgeNotificaciones');
  const marcarLeidas = $('#marcarLeidas');

  function alternarPanel(abrir) {
    if (!panelNotificaciones) return;
    panelNotificaciones.hidden = !abrir;
    if (btnNotificaciones) {
      btnNotificaciones.setAttribute('aria-expanded', String(abrir));
    }
  }

  if (btnNotificaciones) {
    btnNotificaciones.setAttribute('aria-expanded', 'false');
    btnNotificaciones.addEventListener('click', (e) => {
      e.stopPropagation();
      alternarPanel(panelNotificaciones.hidden);
    });
  }

  if (panelNotificaciones) {
    panelNotificaciones.addEventListener('click', (e) => e.stopPropagation());
  }
  document.addEventListener('click', () => alternarPanel(false));

  if (marcarLeidas) {
    marcarLeidas.addEventListener('click', () => {
      $$('li', panelNotificaciones).forEach((li) => li.classList.add('leido'));
      if (badgeNotificaciones) badgeNotificaciones.hidden = true;
      if (btnNotificaciones) {
        btnNotificaciones.setAttribute('aria-label', 'Notificaciones, sin novedades');
      }
      marcarLeidas.textContent = 'Todo leído';
      marcarLeidas.disabled = true;
    });
  }

  /* ========================================================================
     14. AJUSTES: SWITCHES Y FORMULARIO
     ======================================================================== */

  $$('.switch').forEach((sw) => {
    sw.addEventListener('click', () => {
      const activo = sw.getAttribute('aria-checked') === 'true';
      sw.setAttribute('aria-checked', String(!activo));
    });
  });

  const formAjustes = $('#formAjustes');
  const avisoExito = $('#avisoExito');
  let temporizadorAviso;

  if (formAjustes) {
    formAjustes.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!avisoExito) return;
      avisoExito.hidden = false;
      clearTimeout(temporizadorAviso);
      temporizadorAviso = setTimeout(() => {
        avisoExito.hidden = true;
      }, 3500);
    });

    formAjustes.addEventListener('reset', () => {
      if (avisoExito) avisoExito.hidden = true;
      // el reset es síncrono: se aplica el valor original al terminar
      setTimeout(() => {
        if (campoTema) aplicarTema(campoTema.value || temaActual());
      }, 0);
    });
  }

  /* ========================================================================
     15. BUSCADOR GLOBAL (Ctrl K)
     ======================================================================== */

  const buscador = $('#buscadorGlobal');

  /** Búsqueda de pedidos contra la API, con pausa para no martillear */
  const buscarPedidosRemoto = esperar(() => cargarPedidos(), 250);

  if (buscador) {
    buscador.addEventListener('input', () => {
      textoBusqueda = buscador.value.trim().toLowerCase();
      refrescarListas();
      // Vista de pedidos + servidor: el filtrado por texto lo hace la API
      if (vistaActual === 'pedidos' && hayServidor()) buscarPedidosRemoto();
    });

    buscador.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        buscador.value = '';
        textoBusqueda = '';
        refrescarListas();
        buscador.blur();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        // Si la vista actual no es buscable, saltamos a pedidos
        if (!['productos', 'clientes', 'pedidos'].includes(vistaActual)) irA('pedidos');
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    const ctrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
    if (ctrlK && buscador) {
      e.preventDefault();
      buscador.focus();
      buscador.select();
    }
    if (e.key === 'Escape') {
      alternarSidebar(false);
      alternarPanel(false);
    }
  });

  /* ========================================================================
     16. ARRANQUE Y REDIMENSIONADO
     ======================================================================== */

  const anioActual = $('#anioActual');
  if (anioActual) anioActual.textContent = String(new Date().getFullYear());

  // Dibuja por primera vez la vista de resumen
  vistaActual = 'resumen';
  animarContadores($('#vista-resumen'));
  pintarGraficas('resumen');
  refrescarListas();
  // (Si hay servidor, este primer pintado se sustituye por los datos reales:
  //  la llamada está al final del fichero, cuando ya existe CARGADORES.)

  // Las gráficas se dibujan al tamaño exacto: se repintan al cambiar la ventana
  window.addEventListener(
    'resize',
    esperar(() => pintarGraficas(vistaActual), 180)
  );

  // Si el sistema cambia de tema mientras la plantilla está abierta
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) {
      mq.addEventListener('change', (e) => {
        let guardado = null;
        try {
          guardado = localStorage.getItem(CLAVE_TEMA);
        } catch (err) { /* sin almacenamiento */ }
        if (!guardado) aplicarTema(e.matches ? 'dark' : 'light');
      });
    }
  }

  /* ========================================================================
     17. SINCRONIZACIÓN CON EL SERVIDOR (por vista)
     --------------------------------------------------------------------
     Cada vista tiene su cargador: pide los datos a la API y, si responde,
     SUSTITUYE el array local y vuelve a pintar. Si algo falla, se conserva
     lo local y el panel sigue funcionando en modo estático.
     ======================================================================== */

  /** Paleta de la dona: el color lo asigna el cliente según el orden */
  const PALETA_DONA = [
    '--color-primary', '--color-accent', '--color-success',
    '--color-warning', '--color-text-muted'
  ];

  /** Actualiza una tarjeta KPI; solo vuelve a animar si el valor cambió */
  function aplicarKPI(id, valor) {
    const el = document.getElementById(id);
    const n = Number(valor);
    if (!el || !Number.isFinite(n)) return;
    if (Number(el.dataset.contador) === n) return; // sin cambios: no reanima
    el.dataset.contador = String(n);
    el.dataset.listo = '0';
    animarContador(el);
  }

  /** Pinta de nuevo todo lo visible de una vista (los datos ya están cargados) */
  function pintarVista(vista) {
    if (vista === 'resumen') {
      pintarPedidosResumen();
      pintarActividad();
    }
    if (vista === 'ventas') pintarVendedores();
    if (vista === 'productos') pintarProductos();
    if (vista === 'clientes') pintarClientes();
    if (vista === 'pedidos') renderPedidos();
    animarContadores($('#vista-' + vista));
    pintarGraficas(vista);
    refrescarListas();
  }

  /* --------------------------------------------------------- por vista --- */

  /** Resumen: KPIs, serie de líneas, dona, últimos pedidos y actividad */
  async function cargarResumen() {
    const [r, pedidos] = await Promise.all([api('/api/resumen'), api('/api/pedidos')]);

    if (r.serie && Array.isArray(r.serie.ingresos) && r.serie.ingresos.length) {
      if (Array.isArray(r.serie.meses) && r.serie.meses.length === r.serie.ingresos.length) {
        MESES = r.serie.meses;
      }
      INGRESOS = r.serie.ingresos.map(Number);
      if (Array.isArray(r.serie.objetivo) && r.serie.objetivo.length === INGRESOS.length) {
        OBJETIVO = r.serie.objetivo.map(Number);
      }
    }

    if (Array.isArray(r.dona) && r.dona.length) {
      DONA = r.dona.map((d, i) => ({
        n: d.n,
        v: Number(d.v),
        c: PALETA_DONA[i % PALETA_DONA.length]
      }));
    }
    if (Number.isFinite(Number(r.donaTotal))) DONA_TOTAL = Number(r.donaTotal);

    if (Array.isArray(pedidos) && pedidos.length) {
      PEDIDOS = pedidos;
      pedidosRemotos = null;
    }
    if (Array.isArray(r.actividad) && r.actividad.length) ACTIVIDAD = r.actividad;

    if (r.kpis) {
      aplicarKPI('kpiIngresos', r.kpis.ingresos);
      aplicarKPI('kpiVentas', r.kpis.ventas);
      aplicarKPI('kpiVisitantes', r.kpis.visitantes);
      aplicarKPI('kpiConversion', r.kpis.conversion);
    }
  }

  /** Ventas: serie de barras, equipo comercial y sus KPIs */
  async function cargarVentas() {
    const r = await api('/api/ventas');

    if (Array.isArray(r.serie) && r.serie.length) {
      VENTAS_MES = r.serie.map((d) => ({ m: d.m, v: Number(d.v) }));
    }
    if (Array.isArray(r.vendedores) && r.vendedores.length) {
      VENDEDORES = r.vendedores.map((v) => ({
        n: v.n,
        ped: Number(v.ped),
        fact: Number(v.fact),
        obj: Number(v.obj)
      }));
    }
    if (r.kpis) {
      aplicarKPI('kpiFacturacion', r.kpis.facturacion);
      aplicarKPI('kpiCerrados', r.kpis.pedidosCerrados);
      aplicarKPI('kpiTicket', r.kpis.ticketMedio);
    }
  }

  /** Catálogo de productos (claves n, c, p, stock, v, i) */
  async function cargarProductos() {
    const filas = await api('/api/productos');
    if (Array.isArray(filas) && filas.length) PRODUCTOS = filas;
  }

  /** Cartera de clientes (claves n, mail, plan, pais, ped, fact) */
  async function cargarClientes() {
    const filas = await api('/api/clientes');
    if (Array.isArray(filas) && filas.length) CLIENTES = filas;
  }

  /** Pedidos con filtrado en el servidor (?estado=&q=).
   *  Sin servidor se mantiene el filtro local de toda la vida (fallback). */
  async function cargarPedidos() {
    if (!hayServidor()) {
      pedidosRemotos = null;
      renderPedidos();
      return;
    }

    const params = new URLSearchParams();
    params.set('estado', filtroEstado || 'todos');
    if (textoBusqueda) params.set('q', textoBusqueda);

    try {
      const filas = await api('/api/pedidos?' + params.toString());
      if (!Array.isArray(filas)) throw new Error('Respuesta inesperada');
      estadoServidor = 'ok';

      if ((filtroEstado || 'todos') === 'todos' && !textoBusqueda) {
        // Lista completa: además alimenta el resumen y el contador del menú
        PEDIDOS = filas;
        pedidosRemotos = null;
      } else {
        pedidosRemotos = filas;
      }
      renderPedidos();
      pintarPedidosResumen();
    } catch (e) {
      pedidosRemotos = null;
      throw e; // cargarVista marcará "sin servidor" y repintará en local
    }
  }

  /** Mapa vista → función que carga sus datos */
  const CARGADORES = {
    resumen: cargarResumen,
    ventas: cargarVentas,
    productos: cargarProductos,
    clientes: cargarClientes,
    pedidos: cargarPedidos
  };

  /**
   * Carga los datos de una vista desde la API y repinta.
   * Si no hay servidor, no pasa nada: la vista ya está pintada con los
   * arrays locales y dejamos de intentarlo (modo estático).
   */
  function cargarVista(vista) {
    const cargar = CARGADORES[vista];
    if (!cargar || estadoServidor === 'sin') return Promise.resolve(false);

    return Promise.resolve()
      .then(cargar)
      .then(() => {
        estadoServidor = 'ok';
        pintarVista(vista);
        return true;
      })
      .catch((e) => {
        estadoServidor = 'sin';
        console.info('[nova] API no disponible → modo estático:', e.message);
        pintarVista(vista);
        return false;
      });
  }

  /* ------------------------------------------ botones de la vista pedidos */

  const CLAVE_TOKEN = 'nova-token';
  let tokenYaPreguntado = false;

  /** Token de admin: usa el guardado en la sesión o (si `pedir`) pregunta */
  function tokenAdmin(pedir) {
    let token = null;
    try { token = sessionStorage.getItem(CLAVE_TOKEN); } catch (e) { /* sin storage */ }
    if (token) return token;
    if (!pedir) return null;

    const capturado = prompt('Token de administración (está en el .env → ADMIN_TOKEN):');
    if (!capturado || !capturado.trim()) return null;
    token = capturado.trim();
    try { sessionStorage.setItem(CLAVE_TOKEN, token); } catch (e) { /* sin storage */ }
    return token;
  }

  const btnRefrescarPedidos = $('#btnRefrescarPedidos');
  const btnExportarPedidos = $('#btnExportarPedidos');

  if (btnRefrescarPedidos) {
    btnRefrescarPedidos.addEventListener('click', () => {
      // La primera vez pide el token (queda en sessionStorage de esta pestaña)
      if (!tokenYaPreguntado) {
        tokenYaPreguntado = true;
        tokenAdmin(true);
      }
      estadoServidor = 'desconocido'; // fuerza una nueva prueba contra la API
      cargarVista(vistaActual);       // recarga los datos de la vista activa
    });
  }

  if (btnExportarPedidos) {
    btnExportarPedidos.addEventListener('click', async () => {
      const token = tokenAdmin(true);
      if (!token) {
        alert('Sin token de administración no se puede exportar el CSV.');
        return;
      }
      try {
        const respuesta = await fetch(API_BASE + '/api/exportar/pedidos.csv', {
          headers: { 'x-admin-token': token }
        });
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);

        const blob = await respuesta.blob();
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'pedidos.csv';
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        // Sin respuesta del servidor no hay CSV que descargar
        console.warn('[exportar] No se pudo descargar el CSV:', e);
        alert('No se pudo exportar el CSV. Comprueba que sigues con sesión iniciada.');
      }
    });
  }

  /* ----------------------------------------------------------------------
     Arranque con datos del servidor (si lo hay).
     Se deja para el FINAL del fichero porque `cargarVista` necesita que
     ya exista `CARGADORES` (sección 17). Si no hay servidor, la promesa
     falla sin más y el panel se queda en modo estático.
     ---------------------------------------------------------------------- */
  cargarVista('resumen');
})();
