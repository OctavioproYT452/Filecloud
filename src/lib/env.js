// Carga mínima del archivo .env de la raíz (sin dependencias). No pisa las variables que ya existan en el entorno.
const fs = require("fs"), path = require("path");

function load(file = path.join(__dirname, "..", "..", ".env")) {
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch { return; } // sin .env: no pasa nada
  for (let line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    line = line.trim();
    if (!line || line[0] === "#") continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.length > 1 && (v[0] === '"' || v[0] === "'") && v.endsWith(v[0])) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, ""); // comentario al final de la línea
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
load();

module.exports = { load };
