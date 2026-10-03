/* ==========================================================================
   ENRUTADOR mínimo para la API (sin dependencias)
   --------------------------------------------------------------------------
   const api = crearRouter();
   api.get('/api/salud', (ctx) => ctx.json({ ok: true }));
   api.post('/api/contacto', async (ctx) => { const datos = await ctx.cuerpo(); ... });
   api.get('/api/proyectos/:slug', ...);
   await api.manejar(req, res);
   ========================================================================== */

'use strict';

const { json, error, leerCuerpo, consulta } = require('./http');

/** Convierte '/api/posts/:slug' en un comprobador de coincidencia */
function compilar(patron) {
  const partes = patron.split('/').filter(Boolean);
  return (ruta) => {
    const actual = ruta.split('/').filter(Boolean);
    const params = {};
    if (partes.length !== actual.length) return null;
    for (let i = 0; i < partes.length; i++) {
      const p = partes[i];
      if (p.startsWith(':')) {
        params[p.slice(1)] = decodeURIComponent(actual[i]);
      } else if (p !== actual[i]) {
        return null;
      }
    }
    return params;
  };
}

function crearRouter() {
  const rutas = [];
  const router = {};

  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach((metodo) => {
    router[metodo.toLowerCase()] = (patron, manejador) => {
      rutas.push({ metodo, patron, comprobar: compilar(patron), manejador });
      return router;
    };
  });

  router.manejar = async function manejar(req, res) {
    const { url, params: query } = consulta(req);
    const ruta = url.pathname;

    // Cabecera CORS opcional (para usar la API desde otro dominio en dev)
    if (process.env.CORS === '1' || process.env.CORS === 'true') {
      res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGEN || '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
      }
    }

    // Buscamos coincidencia: primero por método, luego cualquiera para 405
    let coincideMetodo = false;
    for (const rutaDef of rutas) {
      const params = rutaDef.comprobar(ruta);
      if (!params) continue;
      coincideMetodo = true;
      if (rutaDef.metodo !== req.method) continue;

      const contexto = {
        req,
        res,
        url,
        query,
        params,
        metodo: req.method,
        json: (datos, codigo = 200) => json(res, datos, codigo),
        fallo: (codigo, mensaje, detalle) => error(res, codigo, mensaje, detalle),
        cuerpo: () => leerCuerpo(req),
        cabecera: (nombre) => req.headers[nombre.toLowerCase()],
        ip: (req.socket && req.socket.remoteAddress) || 'desconocida'
      };

      try {
        const salida = await rutaDef.manejador(contexto);
        if (!res.writableEnded && salida !== undefined) json(res, salida);
      } catch (e) {
        const codigo = e.codigo || 500;
        console.error(`[api] ${req.method} ${ruta} →`, e);
        if (!res.writableEnded) {
          error(res, codigo, e.message || 'Error interno del servidor');
        }
      }
      return true;
    }

    if (coincideMetodo) {
      error(res, 405, 'Método no permitido para ' + ruta);
      return true;
    }
    return false; // el servidor probará con un fichero estático
  };

  return router;
}

module.exports = { crearRouter };
