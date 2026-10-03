/* ==========================================================================
   CARGA DE VARIABLES DE ENTORNO (.env) — sin dependencias externas
   --------------------------------------------------------------------------
   Uso:
     const { cargarEnv, entero, booleano } = require('./lib/env');
     cargarEnv(require('node:path').join(__dirname, '..', '.env'));

   Reglas:
   - No sobreescribe una variable que ya esté definida en el sistema
     (así puedes hacer `PORT=8080 npm start` en Linux/macOS).
   - Admite `CLAVE=valor`, `CLAVE="valor con espacios"` y comentarios `#`.
   ========================================================================== */

'use strict';

const fs = require('node:fs');

/**
 * Lee un fichero .env y vuelca sus claves en process.env.
 * @param {string} ruta ruta absoluta o relativa al fichero .env
 * @returns {string[]} claves que ha cargado
 */
function cargarEnv(ruta) {
  const cargadas = [];
  let texto;
  try {
    texto = fs.readFileSync(ruta, 'utf8');
  } catch (e) {
    // No hay .env: se continúa con los valores por defecto del código.
    return cargadas;
  }

  texto.split(/\r?\n/).forEach((linea) => {
    const sinComentarios = linea.replace(/\s#.*$/, '');
    const m = sinComentarios.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) return;

    const clave = m[1];
    let valor = m[2].trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"') && valor.length > 1) ||
      (valor.startsWith("'") && valor.endsWith("'") && valor.length > 1)
    ) {
      valor = valor.slice(1, -1);
    }
    if (process.env[clave] === undefined) {
      process.env[clave] = valor;
      cargadas.push(clave);
    }
  });

  return cargadas;
}

/** '3000' → 3000 (con valor por defecto si no es un número) */
function entero(valor, defecto) {
  const n = parseInt(valor, 10);
  return Number.isFinite(n) ? n : defecto;
}

/** 'true' | '1' | 'si' → true */
function booleano(valor, defecto = false) {
  if (valor === undefined || valor === '') return defecto;
  return /^(1|true|si|sí|yes|on)$/i.test(String(valor).trim());
}

/** Devuelve la clave solo si tiene contenido (útil para integraciones opcionales) */
function opcional(valor) {
  const v = (valor || '').trim();
  return v && !/^tuya-aqui$|^cambia-esto$|^xxxxxxxx$/i.test(v) ? v : null;
}

module.exports = { cargarEnv, entero, booleano, opcional };
