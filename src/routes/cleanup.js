// Limpieza: ayuda a recuperar espacio mostrando los archivos más grandes y los duplicados (mismo contenido) del usuario.
const router = require("express").Router();
const fs = require("fs"), fsp = fs.promises, path = require("path"), crypto = require("crypto");
const { wrap } = require("../lib/utils");
const { base } = require("../lib/paths");
const { need } = require("../middleware/auth");

const MAX_FILES = 30000, MAX_HASH = 512 * 1048576, TIME = 20000;
const sha = f => new Promise((ok, no) => { const h = crypto.createHash("sha256"); fs.createReadStream(f).on("data", d => h.update(d)).on("end", () => ok(h.digest("hex"))).on("error", no); });

router.get("/api/cleanup", need, wrap(async (req, res) => {
  const b = base(req.user), stack = [b], files = [], end = Date.now() + TIME; let cut = false;
  while (stack.length) {
    if (files.length >= MAX_FILES || Date.now() > end) { cut = true; break; }
    const d = stack.pop(), es = await fsp.readdir(d, { withFileTypes: true }).catch(() => []);
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) { const s = await fsp.stat(p).catch(() => null); if (s) files.push({ p, size: s.size, mtime: s.mtimeMs }); }
    }
  }
  const view = f => ({ name: path.basename(f.p), path: path.relative(b, f.p), size: f.size, mtime: f.mtime });
  const big = [...files].sort((x, y) => y.size - x.size).slice(0, 25).map(view);
  const bySize = new Map(); for (const f of files) if (f.size > 0 && f.size <= MAX_HASH) (bySize.get(f.size) || bySize.set(f.size, []).get(f.size)).push(f);
  const groups = []; let wasted = 0;
  for (const list of bySize.values()) {
    if (list.length < 2) continue;
    const byHash = new Map();
    for (const f of list) { if (Date.now() > end + 10000) { cut = true; break; } const h = await sha(f.p).catch(() => null); if (h) (byHash.get(h) || byHash.set(h, []).get(h)).push(f); }
    for (const g of byHash.values()) if (g.length > 1) { g.sort((x, y) => x.mtime - y.mtime); wasted += g[0].size * (g.length - 1); groups.push({ size: g[0].size, files: g.map(view) }); }
  }
  groups.sort((x, y) => y.size * (y.files.length - 1) - x.size * (x.files.length - 1));
  res.json({ scanned: files.length, partial: cut, big, dupes: groups.slice(0, 40), wasted });
}));

module.exports = router;
