// Agente de IA de File Cloud (Grok de xAI u Ollama).
// - La configuración vive en la tabla "settings" de la base de datos y se lee al iniciar el servidor (init / reload).
// - El agente SOLO puede tocar la carpeta del usuario que lo usa: listar, leer, crear carpetas/archivos, mover, copiar y borrar.
//   No existe ninguna herramienta para ejecutar nada: los archivos que crea son datos (modo 0644, nunca ejecutables).
const { reload, enabled, describe, save, publicConfig } = require("./config");
const { status, usedBy, limitFor, purge } = require("./limits");
const { test } = require("./llm");
const { chat } = require("./chat");
const { IMPL } = require("./tools");
const { GROK_KEYS_URL, DEF } = require("./constants");

module.exports = { init: reload, reload, enabled, describe, save, publicConfig, test, chat, status, usedBy, limitFor, purge, GROK_KEYS_URL, DEF, _impl: IMPL };
