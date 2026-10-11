// Base de datos: conexión, esquema, ayudantes de consulta y migraciones.
const db = require("./connection");
require("./schema")(db);
const { hash, verify } = require("./passwords");

const get = (sql, ...a) => db.prepare(sql).get(...a);
const all = (sql, ...a) => db.prepare(sql).all(...a);
const run = (sql, ...a) => db.prepare(sql).run(...a);
const now = () => Date.now();

require("./migrations")({ all, run, now, hash });

module.exports = { get, all, run, now, hash, verify };
