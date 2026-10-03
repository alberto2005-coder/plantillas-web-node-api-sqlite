/* ==========================================================================
   ENVÍO DE CORREOS — opcional y sin dependencias obligatorias
   --------------------------------------------------------------------------
   Orden de prioridad:
   1. RESEND_API_KEY  → API REST de Resend (no instala nada).
   2. SMTP_HOST       → necesita `npm install nodemailer`.
   3. Nada configurado → se guarda el correo en la BD y se responde "demo".

   Activa cualquiera de las dos en el fichero .env
   ========================================================================== */

'use strict';

const { opcional } = require('./env');

/**
 * @param {{para:string, asunto:string, texto:string, html?:string}} opciones
 * @returns {Promise<{enviado:boolean, medio:string, motivo?:string}>}
 */
async function enviarCorreo({ para, asunto, texto, html }) {
  const resend = opcional(process.env.RESEND_API_KEY);
  const de = opcional(process.env.EMAIL_DE) || 'onboarding@resend.dev';

  // 1) Resend por API REST (fetch ya viene en Node)
  if (resend) {
    try {
      const respuesta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resend}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: de, to: [para], subject: asunto, text: texto, html })
      });
      if (!respuesta.ok) {
        const detalle = await respuesta.text();
        return { enviado: false, medio: 'resend', motivo: `HTTP ${respuesta.status}: ${detalle}` };
      }
      return { enviado: true, medio: 'resend' };
    } catch (e) {
      return { enviado: false, medio: 'resend', motivo: e.message };
    }
  }

  // 2) SMTP con nodemailer (librería opcional)
  const smtpHost = opcional(process.env.SMTP_HOST);
  if (smtpHost) {
    let nodemailer;
    try {
      nodemailer = require('nodemailer'); // npm install nodemailer
    } catch (e) {
      return {
        enviado: false,
        medio: 'smtp',
        motivo: 'SMTP_HOST está definido pero falta nodemailer: ejecuta `npm install nodemailer`'
      };
    }
    try {
      const transport = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PUERTO || 587),
        secure: String(process.env.SMTP_PUERTO || 587) === '465',
        auth: process.env.SMTP_USUARIO
          ? { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_CLAVE }
          : undefined
      });
      await transport.sendMail({ from: de, to: para, subject: asunto, text: texto, html });
      return { enviado: true, medio: 'smtp' };
    } catch (e) {
      return { enviado: false, medio: 'smtp', motivo: e.message };
    }
  }

  // 3) Modo demo: nada configurado
  return { enviado: false, medio: 'ninguno', motivo: 'sin correo configurado (.env)' };
}

module.exports = { enviarCorreo };
