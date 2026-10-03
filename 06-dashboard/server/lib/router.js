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

/**
 * IP real de la petición (la usa el limitador anti-spam).
 *
 * - Por defecto: la dirección del socket (correcto en local y en directo).
 * - Con `TRUST_PROXY=1` en .env (detrás de Caddy/nginx/Cloudflare, tal como
 *   recomienda docs/DESPLIEGUE.md): la primera IP del header X-Forwarded-For,
 *   que es la que ha escrito el proxy. Sin esto, TODOS los visitantes
 *   compartirían la IP del proxy y un único usuario agotaría el límite
 *   de envíos de todos.
 *
 * Nunca actives TRUST_PROXY si el servidor es público y no hay proxy delante:
 * entonces cualquiera podría mandar un X-Forwarded-For falso y esquivar el límite.
 */
function ipCliente(req) {
  const confiado = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';
  if (confiado) {
    const cabecera = req.headers['x-forwarded-for'];
    if (typeof cabecera === 'string' && cabecera.trim()) {
      return cabecera.split(',')[0].trim();
    }
  }
  return (req.socket && req.socket.remoteAddress) || 'desconocida';
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
        ip: ipCliente(req)
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
