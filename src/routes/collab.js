// Colaboración en carpetas: el dueño añade usuarios por UUID y les asigna un rol; cada colaborador ve esas carpetas en su panel.
const router = require("express").Router();
const fsp = require("fs").promises;
const { get, all, run, now } = require("../db");
const { wrap } = require("../lib/utils");
const { safe, base } = require("../lib/paths");
const { need } = require("../middleware/auth");
const { ROLES, validRole, relOf } = require("../services/collab");

const MAX_PER_FOLDER = 50;
const roleOf = r => { if (!validRole(r)) throw Error("Rol inválido"); return r; };
const person = c => ({ id: c.id, uuid: c.uuid, username: c.username, role: c.role, created_at: c.created_at });
const COLS = "c.id,c.path,c.role,c.created_at,u.uuid,u.username";

// Carpeta propia (nunca la raíz) sobre la que el dueño gestiona la colaboración
async function ownFolder(req, rel) {
  const f = safe(base(req.user), rel);
  if (f === base(req.user)) throw Error("No puedes compartir tu carpeta raíz, elige una carpeta");
  if (!(await fsp.stat(f).catch(() => null))?.isDirectory()) throw Error("La carpeta no existe");
  return relOf(req.user, f);
}
// Colaboración que pertenece al usuario actual como dueño
const owned = (req, id) => { const c = get("SELECT * FROM collabs WHERE id=? AND owner_id=?", Number(id), req.user.id); if (!c) throw Error("Colaborador no encontrado"); return c; };

// Roles disponibles (para construir los selectores)
router.get("/api/collab/roles", need, (req, res) => res.json({ roles: Object.entries(ROLES).map(([id, r]) => ({ id, label: r.label })) }));

// Dueño: colaboradores de una carpeta
router.get("/api/collab/folder", need, wrap(async (req, res) => {
  const rel = await ownFolder(req, req.query.path);
  res.json({ collaborators: all(`SELECT ${COLS} FROM collabs c JOIN users u ON u.id=c.user_id WHERE c.owner_id=? AND c.path=? ORDER BY u.username`, req.user.id, rel).map(person) });
}));

// Dueño: añadir a un usuario (por su UUID) con un rol
router.post("/api/collab/add", need, wrap(async (req, res) => {
  const rel = await ownFolder(req, req.body.path), role = roleOf(req.body.role), uuid = String(req.body.uuid || "").trim();
  if (!uuid) throw Error("Introduce el UUID del usuario");
  const t = get("SELECT id,username,suspended FROM users WHERE lower(uuid)=lower(?)", uuid);
  if (!t) throw Error("No existe ningún usuario con ese UUID");
  if (t.id === req.user.id) throw Error("Ya eres el dueño de la carpeta");
  if (t.suspended) throw Error("Ese usuario está suspendido");
  if (get("SELECT 1 x FROM collabs WHERE owner_id=? AND path=? AND user_id=?", req.user.id, rel, t.id)) throw Error(`${t.username} ya colabora en esta carpeta`);
  if (get("SELECT COUNT(*) n FROM collabs WHERE owner_id=? AND path=?", req.user.id, rel).n >= MAX_PER_FOLDER) throw Error(`Máximo ${MAX_PER_FOLDER} colaboradores por carpeta`);
  run("INSERT INTO collabs(owner_id,user_id,path,role,created_at) VALUES(?,?,?,?,?)", req.user.id, t.id, rel, role, now());
  res.json({ success: true, username: t.username });
}));

// Dueño: cambiar el rol de un colaborador
router.post("/api/collab/role", need, wrap(async (req, res) => {
  const c = owned(req, req.body.id);
  run("UPDATE collabs SET role=? WHERE id=?", roleOf(req.body.role), c.id); res.json({ success: true });
}));

// Dueño: quitar a un colaborador. Colaborador: salir de una carpeta que le compartieron.
router.post("/api/collab/remove", need, wrap(async (req, res) => {
  const c = get("SELECT * FROM collabs WHERE id=? AND (owner_id=? OR user_id=?)", Number(req.body.id), req.user.id, req.user.id);
  if (!c) throw Error("Colaboración no encontrada");
  run("DELETE FROM collabs WHERE id=?", c.id); res.json({ success: true });
}));

// Dueño: todas las carpetas que comparte
router.get("/api/collab/mine", need, wrap(async (req, res) => {
  const by = new Map();
  for (const c of all(`SELECT ${COLS} FROM collabs c JOIN users u ON u.id=c.user_id WHERE c.owner_id=? ORDER BY c.path,u.username`, req.user.id)) {
    if (!by.has(c.path)) by.set(c.path, []);
    by.get(c.path).push(person(c));
  }
  res.json({ folders: [...by].map(([path, collaborators]) => ({ path, collaborators })) });
}));

// Colaborador: carpetas que otros usuarios han compartido conmigo (con su dueño y mi rol)
router.get("/api/collab/shared", need, wrap(async (req, res) => {
  const rows = all("SELECT c.id,c.path,c.role,c.created_at,o.username owner,o.uuid owner_uuid,o.id owner_id FROM collabs c JOIN users o ON o.id=c.owner_id WHERE c.user_id=? AND o.suspended=0 ORDER BY o.username,c.path", req.user.id);
  const out = [];
  for (const c of rows) {
    const ok = (await fsp.stat(safe(base({ uuid: c.owner_uuid }), c.path)).catch(() => null))?.isDirectory();
    if (ok) out.push({ id: c.id, name: c.path.split("/").pop(), owner: c.owner, role: c.role, role_label: ROLES[c.role]?.label, since: c.created_at });
  }
  res.json({ folders: out });
}));

module.exports = router;
