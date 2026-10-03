/* ==========================================================================
   LIMITADOR DE PETICIONES (anti-spam) — en memoria, sin dependencias
   --------------------------------------------------------------------------
   Sirve para proteger los endpoints de formulario (contacto, newsletter…).

   const limite = crearLimitador({ max: 5, ventanaMs: 60000 });
   if (!limite.permitido(ip)) return ctx.fallo(429, 'Demasiados envíos, inténtalo en un minuto.');

   En producción, sustitúyelo por Redis o por el límite de tu proxy/CDN.
   ========================================================================== */

'use strict';

function crearLimitador({ max = 6, ventanaMs = 60000 } = {}) {
  const intentos = new Map(); // ip → [timestamp, ...]

  // Limpieza periódica para no acumular memoria
  const limpiador = setInterval(() => {
    const ahora = Date.now();
    intentos.forEach((tiempos, ip) => {
      const vivos = t => ahora - t < ventanaMs;
      if (!tiempos.some(vivos)) intentos.delete(ip);
      else intentos.set(ip, tiempos.filter(vivos));
    });
  }, ventanaMs);
  if (limpiador.unref) limpiador.unref();

  return {
    /** @returns {boolean} true si la petición entra dentro del límite */
    permitido(ip) {
      const ahora = Date.now();
      const vivos = (intentos.get(ip) || []).filter((t) => ahora - t < ventanaMs);
      if (vivos.length >= max) {
        intentos.set(ip, vivos);
        return false;
      }
      vivos.push(ahora);
      intentos.set(ip, vivos);
      return true;
    },
    /** Restaura el contador (por ejemplo tras un envío correcto) */
    reiniciar(ip) {
      intentos.delete(ip);
    }
  };
}

module.exports = { crearLimitador };
