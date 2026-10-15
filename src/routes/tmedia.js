// Medios de los temas (imagen, GIF o vídeo de fondo; imagen o GIF en botones).
// Los archivos viven en la carpeta «Temas» del propio usuario (cuentan en su espacio) y el tema solo guarda el nombre.
const router = require("express").Router();
const multer = require("multer");
const fsp = require("fs").promises, path = require("path");
const { get, all, run } = require("../db");
const { TMP } = require("../config");
const { wrap, fix } = require("../lib/utils");
const { base, limitB, nm } = require("../lib/paths");
const { usage, uniq, move } = require("../lib/storage");
const { need } = require("../middleware/auth");
const { MEDIA_DIR, IMG, VID, mediaOk, userTheme, cleanTheme } = require("../services/themes");

const dirOf = u => path.join(base(u), MEDIA_DIR);
const MAXB = { image: 20 * 1048576, video: 150 * 1048576 };
// Comprueba que el contenido corresponde a la extensión (no basta con fiarse del nombre)
function sniff(b, ext) {
  const s = (o, t) => b.subarray(o, o + t.length).toString("latin1") === t;
  if (ext === ".png") return s(1, "PNG"); if (ext === ".jpg" || ext === ".jpeg") return b[0] === 0xFF && b[1] === 0xD8;
  if (ext === ".gif") return s(0, "GIF8"); if (ext === ".webp") return s(0, "RIFF") && s(8, "WEBP");
  if (ext === ".avif" || ext === ".mp4") return s(4, "ftyp"); if (ext === ".webm") return b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3;
  return false;
}
// ¿Algún tema de ese usuario que sea visible para otros usa este archivo? (tema activo o temas publicados)
function exposed(owner, f) {
  const uses = t => t && (t.bgf === f || t.btf === f);
  if (uses(userTheme(owner))) return true;
  return all("SELECT data FROM user_themes WHERE user_id=? AND public=1", owner.id).some(r => { try { return uses(cleanTheme(JSON.parse(r.data))); } catch { return false; } });
}

router.get("/tm/:uuid/:file", wrap(async (req, res) => {
  const f = req.params.file, owner = get("SELECT * FROM users WHERE uuid=? AND suspended=0", String(req.params.uuid));
  if (!owner || !mediaOk(f, true)) return res.sendStatus(404);
  if (!(req.user && req.user.id === owner.id) && !exposed(owner, f)) return res.sendStatus(404);
  const full = path.join(dirOf(owner), f), st = await fsp.lstat(full).catch(() => null);
  if (!st || !st.isFile()) return res.sendStatus(404);
  res.set({ "Content-Security-Policy": "sandbox", "Cache-Control": "private, max-age=120" });
  res.sendFile(full, { dotfiles: "deny" });
}));

router.get("/api/theme-media", need, wrap(async (req, res) => {
  const d = dirOf(req.user), out = [];
  for (const e of await fsp.readdir(d, { withFileTypes: true }).catch(() => [])) {
    if (e.isFile() && mediaOk(e.name, true)) out.push({ name: e.name, size: (await fsp.stat(path.join(d, e.name))).size, video: VID.includes(path.extname(e.name).toLowerCase()) });
  }
  res.json({ files: out.sort((a, b) => a.name.localeCompare(b.name)), folder: MEDIA_DIR, uuid: req.user.uuid });
}));

router.post("/api/theme-media", need, wrap(async (req, res) => {
  const u = req.user, rem = limitB(u) - await usage(u, true);
  if (Number(req.headers["content-length"] || 0) > Math.min(rem, MAXB.video) + 1e6) throw Error("El archivo es demasiado grande o no tienes espacio suficiente");
  await new Promise((ok, ko) => multer({ dest: TMP, limits: { files: 1, fileSize: Math.min(MAXB.video, Math.max(rem, 1)) } }).single("file")(req, res, e => e ? ko(e.code === "LIMIT_FILE_SIZE" ? Error("El archivo es demasiado grande o no tienes espacio suficiente") : e) : ok()));
  const f = req.file; if (!f) throw Error("Falta el archivo");
  try {
    const name = nm(path.basename(fix(f.originalname))), ext = path.extname(name).toLowerCase(), video = VID.includes(ext);
    if (!IMG.includes(ext) && !video) throw Error("Formato no admitido. Usa PNG, JPG, GIF, WebP, AVIF" + (req.body.kind === "bt" ? "" : ", MP4 o WebM"));
    if (video && req.body.kind === "bt") throw Error("En los botones solo se admiten imágenes y GIF");
    if (f.size > (video ? MAXB.video : MAXB.image)) throw Error(`Máximo ${video ? 150 : 20} MB para ${video ? "vídeos" : "imágenes"}`);
    if (f.size > rem) throw Error("No hay espacio suficiente");
    const fh = await fsp.open(f.path, "r"), head = Buffer.alloc(16); await fh.read(head, 0, 16, 0); await fh.close();
    if (!sniff(head, ext)) throw Error("El contenido del archivo no coincide con su formato");
    const dir = dirOf(u); await fsp.mkdir(dir, { recursive: true });
    const final = await uniq(dir, name); if (!mediaOk(final, true)) throw Error("Nombre de archivo no válido");
    await move(f.path, path.join(dir, final));
    await usage(u, true); res.json({ success: true, file: final, video });
  } finally { await fsp.rm(f.path, { force: true }); }
}));

router.delete("/api/theme-media", need, wrap(async (req, res) => {
  const f = String(req.body.file || ""); if (!mediaOk(f, true)) throw Error("Archivo no válido");
  await fsp.rm(path.join(dirOf(req.user), f), { force: true });
  // quita la referencia de los temas del usuario que lo usaban
  const strip = j => { try { const t = JSON.parse(j); if (!t) return null; let ch = false; for (const [k, k2] of [["bgf", ["bgfit", "bgdim", "bgblur"]], ["btf", ["btfit", "btdim"]]]) if (t[k] === f) { delete t[k]; k2.forEach(x => delete t[x]); ch = true; } return ch ? JSON.stringify(t) : null; } catch { return null; } };
  const a = strip(req.user.theme); if (a !== null) run("UPDATE users SET theme=? WHERE id=?", a, req.user.id);
  for (const r of all("SELECT name,data FROM user_themes WHERE user_id=?", req.user.id)) { const n = strip(r.data); if (n) run("UPDATE user_themes SET data=? WHERE user_id=? AND name=?", n, req.user.id, r.name); }
  await usage(req.user, true); res.json({ success: true });
}));

module.exports = router;
