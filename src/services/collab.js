// Carpetas colaborativas: roles, resolución del espacio sobre el que actúa cada petición y mantenimiento de rutas.
const fsp = require("fs").promises, path = require("path");
const { get, all, run } = require("../db");
const { safe, base } = require("../lib/paths");

// Cada rol incluye los permisos del anterior.
//   read   → solo ver y descargar
//   write  → + editar el contenido, renombrar y mover (no crear ni borrar)
//   create → + crear carpetas/archivos, subir y copiar (no borrar)
//   full   → + borrar (permisos totales)
const ROLES = {
  read: { level: 0, label: "Solo lectura" },
  write: { level: 1, label: "Lectura y edición (sin crear ni borrar)" },
  create: { level: 2, label: "Lectura, edición y creación (sin borrar)" },
  full: { level: 3, label: "Permisos totales" },
};
const NEEDS = { read: 0, write: 1, create: 2, delete: 3 };
const validRole = r => Object.hasOwn(ROLES, r);
const can = (role, perm) => validRole(role) && ROLES[role].level >= NEEDS[perm];

// Ruta relativa a la carpeta del dueño, siempre con "/"
const relOf = (owner, f) => path.relative(base(owner), f).split(path.sep).join("/");

// Espacio sobre el que actúa la petición: la carpeta del propio usuario o una carpeta compartida con él (?collab=<id>).
// Devuelve { owner, base, root, role, collab } donde "owner" es a quien pertenecen los archivos (y su cuota).
async function space(req, perm) {
  const id = req.query?.collab ?? req.body?.collab;
  if (id === undefined || id === null || id === "") {
    const b = base(req.user);
    return { owner: req.user, base: b, root: b, role: "full", collab: null };
  }
  const c = get("SELECT * FROM collabs WHERE id=? AND user_id=?", Number(id), req.user.id);
  const owner = c && get("SELECT * FROM users WHERE id=? AND suspended=0", c.owner_id);
  if (!c || !owner) throw Error("Esta carpeta colaborativa ya no está disponible");
  if (!can(c.role, perm)) throw Error("Tu rol en esta carpeta no permite esta acción");
  const b = base(owner), root = safe(b, c.path);
  if (!(await fsp.stat(root).catch(() => null))?.isDirectory()) throw Error("Esta carpeta colaborativa ya no existe");
  return { owner, base: b, root, role: c.role, collab: c };
}

// Si el dueño renombra o mueve una carpeta compartida (o una que la contiene), la colaboración la sigue.
function moved(ownerId, fromRel, toRel) {
  for (const c of all("SELECT id,path FROM collabs WHERE owner_id=?", ownerId))
    if (c.path === fromRel || c.path.startsWith(fromRel + "/")) run("UPDATE collabs SET path=? WHERE id=?", toRel + c.path.slice(fromRel.length), c.id);
}
// Si se borra una carpeta compartida (o una que la contiene), la colaboración desaparece.
function removed(ownerId, rel) {
  for (const c of all("SELECT id,path FROM collabs WHERE owner_id=?", ownerId))
    if (c.path === rel || c.path.startsWith(rel + "/")) run("DELETE FROM collabs WHERE id=?", c.id);
}

module.exports = { ROLES, validRole, can, relOf, space, moved, removed };
