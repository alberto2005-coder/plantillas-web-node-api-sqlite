/* ==========================================================================
   CAPA DE DATOS — SQLite con el módulo nativo `node:sqlite`
   --------------------------------------------------------------------------
   Ventaja: NO hay que instalar nada (`npm install` no hace falta).
   Requisito: Node 22.13 o superior (el módulo es experimental y Node avisa
   con un warning; es inofensivo. Los scripts de package.json ya lo silencian).

   Uso:
     const { crearBase } = require('./lib/db');
     const bd = crearBase({ fichero, esquema, sembrar });
     bd.todos('SELECT * FROM proyectos');
     bd.uno('SELECT * FROM proyectos WHERE id = ?', 1);
     bd.ejecutar('INSERT INTO mensajes (nombre) VALUES (?)', 'Ana');

   IMPORTANTE (node:sqlite):
   - Los parámetros van posicionales con `?`.
   - NO admite booleanos ni objetos: pasa 1/0 para true/false y
     JSON.stringify(...) para objetos.
   ========================================================================== */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (e) {
  console.error(
    '\n[bd] No se pudo cargar "node:sqlite".\n' +
      '     Necesitas Node 22.13 o superior (actual: ' + process.version + ').\n' +
      '     Instálalo desde https://nodejs.org y vuelve a arrancar.\n'
  );
  process.exit(1);
}

/**
 * Abre (y crea si no existe) una base SQLite.
 * @param {{fichero:string, esquema:string, sembrar?:(db:any)=>void}} opciones
 */
function crearBase({ fichero, esquema, sembrar }) {
  const memoria = fichero === ':memory:';
  if (!memoria) {
    fs.mkdirSync(path.dirname(path.resolve(fichero)), { recursive: true });
  }

  const db = new DatabaseSync(fichero);
  db.exec('PRAGMA foreign_keys = ON;');
  if (!memoria) db.exec('PRAGMA journal_mode = WAL;');
  if (esquema) db.exec(esquema);

  if (sembrar) {
    // Quien llama decide: lo normal es comprobar antes si la tabla está vacía.
    sembrar(db);
  }

  return {
    /** Todas las filas: bd.todos('SELECT * FROM t WHERE activo = ?', 1) */
    todos(sql, ...params) {
      return db.prepare(sql).all(...params);
    },
    /** Una fila (o undefined): bd.uno('SELECT * FROM t WHERE id = ?', 1) */
    uno(sql, ...params) {
      return db.prepare(sql).get(...params);
    },
    /** INSERT/UPDATE/DELETE → { changes, lastInsertRowid } */
    ejecutar(sql, ...params) {
      return db.prepare(sql).run(...params);
    },
    /** Ejecuta varias sentencias DDL seguidas */
    ejecutarScript(sql) {
      db.exec(sql);
    },
    /** true si la tabla está vacía */
    vacia(tabla) {
      const fila = db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get();
      return Number(fila.n) === 0;
    },
    cerrar() {
      db.close();
    },
    db
  };
}

/** Convierte booleanos/objetos a algo que node:sqlite acepta */
function valor(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

/** Añade WHERE con filtros dinámicos de forma segura */
function donde(filtros = {}) {
  const clause = [];
  const params = [];
  Object.entries(filtros).forEach(([columna, valorFiltro]) => {
    if (valorFiltro === undefined || valorFiltro === null || valorFiltro === '') return;
    clause.push(`${columna} = ?`);
    params.push(valor(valorFiltro));
  });
  return { sql: clause.length ? ' WHERE ' + clause.join(' AND ') : '', params };
}

module.exports = { crearBase, valor, donde };
