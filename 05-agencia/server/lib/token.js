/* ==========================================================================
   TOKENS — comparación segura de secretos (sin dependencias)
   --------------------------------------------------------------------------
   const { tokenValido } = require('./lib/token');
   if (!tokenValido(ctx.cabecera('x-admin-token'), process.env.ADMIN_TOKEN)) {
     return ctx.fallo(401, 'Token no válido');
   }

   Por qué no un `===`:
   - `===` compara byte a byte y corta en la primera diferencia, lo que
     permite a un atacante ir adivinando el token carácter a carácter.
   - `crypto.timingSafeEqual` (nativo de Node) tarda lo mismo sea cual sea
     dónde coincidan las cadenas.

   Y por qué SOLO por cabecera: un token en la query string (`?token=...`)
   acaba en los logs del servidor/proxy, en el historial del navegador y en
   la cabecera Referer de cada enlace que se pulsa desde esa URL.
   ========================================================================== */

'use strict';

const crypto = require('node:crypto');

/**
 * ¿Coinciden `recibido` y `esperado`? Comparación en tiempo constante.
 * Devuelve false si faltan valores o si las longitudes difieren.
 */
function tokenValido(recibido, esperado) {
  if (typeof recibido !== 'string' || typeof esperado !== 'string') return false;
  if (!recibido || !esperado) return false;
  const a = Buffer.from(recibido, 'utf8');
  const b = Buffer.from(esperado, 'utf8');
  if (a.length !== b.length) return false; // timingSafeEqual lanza si difieren
  return crypto.timingSafeEqual(a, b);
}

module.exports = { tokenValido };
