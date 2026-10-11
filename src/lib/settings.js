// Lectura de ajustes globales guardados en la tabla "settings".
const { get } = require("../db");

const setting = k => get("SELECT value FROM settings WHERE key=?", k)?.value;

module.exports = { setting };
