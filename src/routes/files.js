// Archivos y carpetas: los del propio usuario y los de carpetas compartidas con él (parámetro ?collab=<id>).
// Con una carpeta compartida, los archivos pertenecen al dueño (su cuota) y el rol del colaborador limita cada acción.
const router = require("express").Router();
const multer = require("multer");
const fsp = require("fs").promises, path = require("path");
const { all, run } = require("../db");
const { TMP } = require("../config");
const { wrap, fix } = require("../lib/utils");
const { safe, nm, limitB, fileOf } = require("../lib/paths");
const { dirSize, usage, uniq, move } = require("../lib/storage");
const { serve } = require("../lib/serve");
const { zipTo } = require("../lib/zip");
const { need } = require("../middleware/auth");
const { space, relOf, moved, removed } = require("../services/collab");

const exists = f => fsp.access(f).then(() => 1, () => 0);

router.get("/api/list", need, wrap(async (req, res) => {
  const sp = await space(req, "read"), u = sp.owner;
  if (!sp.collab) await fsp.mkdir(sp.root, { recursive: true });
  const dir = safe(sp.root, req.query.path);
  const es = await fsp.readdir(dir, { withFileTypes: true }).catch(() => { throw Error("Ruta no encontrada"); });
  const items = [];
  for (const e of es) {
    const s = await fsp.stat(path.join(dir, e.name)).catch(() => null);
    if (s) items.push({ name: e.name, isDir: s.isDirectory(), size: s.isDirectory() ? 0 : s.size, mtime: s.mtimeMs });
  }
  if (sp.collab) return res.json({ items, collab: { id: sp.collab.id, role: sp.role, owner: u.username, name: path.basename(sp.root) } });
  const used = await usage(u);
  res.json({
    items, usedBytes: used, maxMB: u.max_space_mb, favs: all("SELECT path FROM favs WHERE user_id=?", u.id).map(r => r.path),
    shared: [...new Set(all("SELECT path FROM collabs WHERE owner_id=?", u.id).map(r => r.path))], // carpetas con colaboradores
  });
}));

router.post("/api/mkdir", need, wrap(async (req, res) => {
  const sp = await space(req, "create");
  await fsp.mkdir(safe(safe(sp.root, req.body.path), nm(req.body.name))); res.json({ success: true });
}));

router.post("/api/create-file", need, wrap(async (req, res) => {
  const sp = await space(req, "create"), u = sp.owner, content = String(req.body.content || "");
  if (await usage(u, true) + Buffer.byteLength(content) > limitB(u)) throw Error(sp.collab ? "El dueño de la carpeta no tiene espacio suficiente" : "Has alcanzado tu límite de almacenamiento");
  const dir = safe(sp.root, req.body.path), n = nm(req.body.name);
  if (await exists(path.join(dir, n))) throw Error("Ya existe un archivo con ese nombre");
  await fsp.writeFile(path.join(dir, n), content); await usage(u, true); res.json({ success: true });
}));

router.post("/api/upload", need, wrap(async (req, res) => {
  const sp = await space(req, "create"), u = sp.owner, rem = limitB(u) - await usage(u, true), NOSPACE = "No hay espacio suficiente";
  if (Number(req.headers["content-length"] || 0) > rem + 1e6) throw Error(NOSPACE);
  await new Promise((ok, ko) => multer({ dest: TMP, limits: { fileSize: Number.isFinite(rem) ? Math.max(rem, 1) : undefined } })
    .array("files")(req, res, e => e ? ko(e.code === "LIMIT_FILE_SIZE" ? Error(NOSPACE) : e) : ok()));
  const files = req.files || [];
  try {
    if (files.reduce((s, f) => s + f.size, 0) > rem) throw Error(NOSPACE);
    const dir = safe(sp.root, req.body.destPath);
    await fsp.mkdir(dir, { recursive: true });
    const rels = [].concat(req.body.paths ?? []);
    for (const [i, f] of files.entries()) { // "paths" conserva la estructura al subir carpetas
      const sub = path.dirname(String(rels[i] || "")), d2 = sub === "." ? dir : safe(dir, sub);
      await fsp.mkdir(d2, { recursive: true });
      await move(f.path, path.join(d2, await uniq(d2, nm(path.basename(fix(f.originalname))))));
    }
  } finally { await Promise.all(files.map(f => fsp.rm(f.path, { force: true }))); }
  await usage(u, true); res.json({ success: true });
}));

router.get("/api/download", need, wrap(async (req, res) => { const sp = await space(req, "read"); serve(res, fileOf(req, sp.root), true); }));
router.get("/api/preview", need, wrap(async (req, res) => { const sp = await space(req, "read"); serve(res, fileOf(req, sp.root)); }));
router.get("/api/file-content", need, wrap(async (req, res) => {
  const sp = await space(req, "read"), f = fileOf(req, sp.root), s = await fsp.stat(f);
  if (s.isDirectory() || s.size > 2e6) throw Error("No se puede editar este archivo");
  res.json({ content: await fsp.readFile(f, "utf8") });
}));
router.post("/api/edit", need, wrap(async (req, res) => {
  const sp = await space(req, "write"), u = sp.owner, f = fileOf(req, sp.root), c = String(req.body.content ?? ""), old = (await fsp.stat(f)).size;
  if (await usage(u, true) - old + Buffer.byteLength(c) > limitB(u)) throw Error(sp.collab ? "El dueño de la carpeta no tiene espacio suficiente" : "Has alcanzado tu límite de almacenamiento");
  await fsp.writeFile(f, c); await usage(u, true); res.json({ success: true });
}));
router.post("/api/rename", need, wrap(async (req, res) => {
  const sp = await space(req, "write"), f = fileOf(req, sp.root), t = path.join(path.dirname(f), nm(req.body.newName));
  if (await exists(t)) throw Error("Ya existe ese nombre");
  await fsp.rename(f, t); moved(sp.owner.id, relOf(sp.owner, f), relOf(sp.owner, t)); res.json({ success: true });
}));
router.post("/api/move", need, wrap(async (req, res) => {
  const sp = await space(req, "write"), f = fileOf(req, sp.root), dir = safe(sp.root, req.body.dest), t = path.join(dir, path.basename(f));
  if (t === f) return res.json({ success: true });
  if ((dir + path.sep).startsWith(f + path.sep)) throw Error("No puedes mover una carpeta dentro de sí misma");
  if (!(await fsp.stat(dir).catch(() => null))?.isDirectory()) throw Error("La carpeta destino no existe");
  if (await exists(t)) throw Error("Ya existe un elemento con ese nombre en el destino");
  await fsp.rename(f, t); moved(sp.owner.id, relOf(sp.owner, f), relOf(sp.owner, t)); res.json({ success: true });
}));
router.post("/api/delete", need, wrap(async (req, res) => {
  const sp = await space(req, "delete"), u = sp.owner, f = fileOf(req, sp.root), rel = path.relative(sp.base, f);
  await fsp.rm(f, { recursive: true, force: true });
  for (const s of all("SELECT token,path FROM shares WHERE user_id=?", u.id))
    if (s.path === rel || s.path.startsWith(rel + path.sep)) run("DELETE FROM shares WHERE token=?", s.token);
  removed(u.id, relOf(u, f));
  await usage(u, true); res.json({ success: true });
}));
router.post("/api/copy", need, wrap(async (req, res) => {
  const sp = await space(req, "create"), u = sp.owner, f = fileOf(req, sp.root), dir = safe(sp.root, req.body.dest ?? path.dirname(path.relative(sp.root, f)));
  if (!(await fsp.stat(dir).catch(() => null))?.isDirectory()) throw Error("La carpeta destino no existe");
  if ((dir + path.sep).startsWith(f + path.sep)) throw Error("No puedes copiar una carpeta dentro de sí misma");
  const s = await fsp.stat(f), size = s.isDirectory() ? await dirSize(f) : s.size;
  if (await usage(u, true) + size > limitB(u)) throw Error("No hay espacio suficiente");
  await fsp.cp(f, path.join(dir, await uniq(dir, path.basename(f))), { recursive: true });
  await usage(u, true); res.json({ success: true });
}));

router.get("/api/zip", need, wrap(async (req, res) => {
  const sp = await space(req, "read"), ps = [].concat(req.query.path || []).map(String), abs = ps.map(p => safe(sp.root, p));
  if (!abs.length || abs.includes(sp.root)) throw Error("Falta ruta");
  await zipTo(res, abs.map(a => ({ abs: a, name: path.basename(a) })), abs.length === 1 ? path.basename(abs[0]) : "archivos");
}));

module.exports = router;
