// Resolución segura de rutas dentro de la carpeta de cada usuario.
const path = require("path");
const { HOSTING } = require("../config");

function safe(base, rel = "") {
  rel = String(rel);
  if (rel.includes("\0")) throw Error("Ruta inválida");
  const f = path.resolve(base, "." + path.sep + rel.replace(/\\/g, "/"));
  if (f !== base && !f.startsWith(base + path.sep)) throw Error("Ruta inválida");
  return f;
}
const nm = n => { n = String(n || "").trim(); if (!n || /[\/\\\0]/.test(n) || n === "." || n === ".." || n.length > 200) throw Error("Nombre inválido"); return n; };
const base = u => path.join(HOSTING, u.uuid); // la carpeta usa el UUID, no el nombre de usuario
const limitB = u => u.max_space_mb < 0 ? Infinity : u.max_space_mb * 1048576;
// Ruta absoluta del archivo indicado en ?path= o en el cuerpo (nunca la carpeta raíz del usuario)
const fileOf = (req, root = base(req.user)) => { const f = safe(root, req.query.path || req.body.path); if (f === root) throw Error("Falta ruta"); return f; };

module.exports = { safe, nm, base, limitB, fileOf };
