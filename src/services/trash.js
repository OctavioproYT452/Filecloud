// Papelera de reciclaje. Lo que un usuario borra no desaparece: se mueve a data/trash/<uuid>/<id> y se anota en la tabla "trash".
//   - Se puede restaurar a su sitio original (con otro nombre si ya existe) o eliminar definitivamente.
//   - No cuenta para la cuota de espacio, pero tiene un tope por usuario; si no cabe, se borra lo más antiguo.
//   - Se vacía sola pasados N días (ajustes del administrador).
//   - Los archivos de una carpeta compartida van a la papelera del DUEÑO de la carpeta; el colaborador no puede restaurarlos.
const fsp = require("fs").promises, path = require("path"), crypto = require("crypto");
const { get, all, run, now } = require("../db");
const { DATA } = require("../config");
const { safe, base, limitB } = require("../lib/paths");
const { dirSize, usage, uniq } = require("../lib/storage");
const { setting } = require("../lib/settings");

const ROOT = path.join(DATA, "trash"), DAY = 864e5;
const dirOf = u => path.join(ROOT, u.uuid);
function config() {
  const days = Number(setting("trash_days")), cap = setting("trash_cap_mb") === undefined ? 2048 : Number(setting("trash_cap_mb"));
  return { enabled: setting("trash_enabled") !== "0", days: Number.isFinite(days) && days >= 1 ? Math.min(365, Math.floor(days)) : 30, capMB: Number.isFinite(cap) ? cap : 2048 };
}
async function moveAny(a, b) { // renombra; si está en otro disco, copia y borra (también carpetas)
  try { await fsp.rename(a, b); } catch (e) { if (e.code !== "EXDEV") throw e; await fsp.cp(a, b, { recursive: true, dereference: false, errorOnExist: true, force: false }); await fsp.rm(a, { recursive: true, force: true }); }
}
const usedBy = id => get("SELECT COALESCE(SUM(size),0) n FROM trash WHERE user_id=?", id).n;

// Manda un archivo o carpeta a la papelera. Si la papelera está desactivada, o no cabe, se borra de forma definitiva (trashed:false).
async function put(owner, f, by) {
  const c = config(), st = await fsp.lstat(f), isDir = st.isDirectory(), size = isDir ? await dirSize(f) : st.size, capB = c.capMB < 0 ? Infinity : c.capMB * 1048576;
  if (!c.enabled || size > capB) { await fsp.rm(f, { recursive: true, force: true }); return { trashed: false, size }; }
  let used = usedBy(owner.id);
  if (used + size > capB) for (const r of all("SELECT id,size FROM trash WHERE user_id=? ORDER BY deleted_at ASC", owner.id)) { if (used + size <= capB) break; await drop(owner, r.id); used -= r.size; }
  const id = crypto.randomBytes(8).toString("hex"); await fsp.mkdir(dirOf(owner), { recursive: true });
  await moveAny(f, path.join(dirOf(owner), id));
  run("INSERT INTO trash(id,user_id,name,orig,is_dir,size,deleted_at,deleted_by) VALUES(?,?,?,?,?,?,?,?)", id, owner.id, path.basename(f), path.relative(base(owner), f), isDir ? 1 : 0, size, now(), by || null);
  return { trashed: true, id, size };
}
const rowOf = (owner, id) => { const r = get("SELECT * FROM trash WHERE user_id=? AND id=?", owner.id, String(id || "")); if (!r) throw Error("Ese elemento ya no está en la papelera"); return r; };
async function drop(owner, id) { await fsp.rm(path.join(dirOf(owner), String(id)), { recursive: true, force: true }); run("DELETE FROM trash WHERE user_id=? AND id=?", owner.id, String(id)); }

function list(owner) {
  const c = config();
  return all("SELECT * FROM trash WHERE user_id=? ORDER BY deleted_at DESC", owner.id).map(r => ({ id: r.id, name: r.name, path: "/" + r.orig.replace(/\\/g, "/"), isDir: !!r.is_dir, size: r.size, deleted_at: r.deleted_at, deleted_by: r.deleted_by, expires_at: r.deleted_at + c.days * DAY }));
}
const summary = owner => { const c = config(), r = get("SELECT COUNT(*) n, COALESCE(SUM(size),0) s FROM trash WHERE user_id=?", owner.id); return { enabled: c.enabled, days: c.days, cap_bytes: c.capMB < 0 ? -1 : c.capMB * 1048576, count: r.n, bytes: r.s }; };

async function restore(owner, id) {
  const r = rowOf(owner, id), src = path.join(dirOf(owner), r.id), root = base(owner);
  if (!(await fsp.stat(src).catch(() => null))) { run("DELETE FROM trash WHERE id=?", r.id); throw Error("El archivo ya no existe en la papelera"); }
  if (await usage(owner, true) + r.size > limitB(owner)) throw Error("No hay espacio suficiente para restaurarlo: libera espacio o amplía tu cuota");
  let dest = safe(root, r.orig), parent = path.dirname(dest);
  try { await fsp.mkdir(parent, { recursive: true }); } catch { dest = path.join(root, path.basename(r.orig)); parent = root; }
  const name = await uniq(parent, path.basename(dest)); dest = path.join(parent, name);
  await moveAny(src, dest); run("DELETE FROM trash WHERE id=?", r.id); run("UPDATE users SET used_at=0 WHERE id=?", owner.id);
  return "/" + path.relative(root, dest).replace(/\\/g, "/");
}
async function remove(owner, id) { rowOf(owner, id); await drop(owner, id); }
async function empty(owner) { const rows = all("SELECT id FROM trash WHERE user_id=?", owner.id); for (const r of rows) await drop(owner, r.id); await fsp.rm(dirOf(owner), { recursive: true, force: true }).catch(() => { }); return rows.length; }
async function wipeUser(uuid) { await fsp.rm(path.join(ROOT, uuid), { recursive: true, force: true }); }

// Mantenimiento: borra lo que lleva más de N días
async function sweep() {
  const c = config(), old = all("SELECT t.id, u.uuid FROM trash t JOIN users u ON u.id=t.user_id WHERE t.deleted_at<?", now() - c.days * DAY);
  for (const r of old) { await fsp.rm(path.join(ROOT, r.uuid, r.id), { recursive: true, force: true }).catch(() => { }); run("DELETE FROM trash WHERE id=?", r.id); }
  return old.length;
}

module.exports = { put, list, summary, restore, remove, empty, wipeUser, sweep, config };
