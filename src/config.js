// Rutas y ajustes globales del servidor.
const path = require("path");
const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");

module.exports = {
  ROOT,
  DATA,
  HOSTING: path.join(ROOT, "hosting"),
  TMP: path.join(DATA, "tmp"),
  PUBLIC: path.join(ROOT, "public"),
  VERSION_FILE: path.join(DATA, "version.json"),
  PORT: process.env.PORT || 3001,
  SESSION_MS: 7 * 864e5,
};
