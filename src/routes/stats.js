// Estadísticas: uso de espacio por tipo, carpetas que más pesan y archivos antiguos sin tocar.
const router = require("express").Router();
const fsp = require("fs").promises, path = require("path");
const { wrap } = require("../lib/utils");
const { base } = require("../lib/paths");
const { need } = require("../middleware/auth");

const MAX_FILES = 30000, TIME = 20000, OLD_DAYS = 365;
const TYPES = {
  Imágenes: "jpg jpeg png gif webp svg bmp ico heic avif", Vídeos: "mp4 mkv webm mov avi m4v", Audio: "mp3 wav ogg flac m4a aac opus",
  Documentos: "pdf doc docx odt rtf txt md xls xlsx ods csv ppt pptx odp", Comprimidos: "zip rar 7z tar gz bz2 xz",
  Código: "js ts json html css py java c cpp cs go rs php sh sql xml yml yaml",
};
const EXT = {}; for (const [k, v] of Object.entries(TYPES)) for (const e of v.split(" ")) EXT[e] = k;

router.get("/api/stats", need, wrap(async (req, res) => {
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
  const types = new Map(), dirs = new Map(); let total = 0;
  for (const f of files) {
    const t = EXT[path.extname(f.p).slice(1).toLowerCase()] || "Otros", x = types.get(t) || { type: t, count: 0, bytes: 0 };
    x.count++; x.bytes += f.size; types.set(t, x); total += f.size;
    const top = path.relative(b, f.p).split(path.sep)[0], dn = top === path.basename(f.p) ? "(raíz)" : top, y = dirs.get(dn) || { name: dn, count: 0, bytes: 0 };
    y.count++; y.bytes += f.size; dirs.set(dn, y);
  }
  const limit = Date.now() - OLD_DAYS * 864e5;
  const old = files.filter(f => f.mtime < limit).sort((x, y) => y.size - x.size);
  res.json({
    scanned: files.length, partial: cut, total,
    types: [...types.values()].sort((x, y) => y.bytes - x.bytes),
    dirs: [...dirs.values()].sort((x, y) => y.bytes - x.bytes).slice(0, 15),
    oldDays: OLD_DAYS, oldCount: old.length, oldBytes: old.reduce((s, f) => s + f.size, 0),
    old: old.slice(0, 25).map(f => ({ name: path.basename(f.p), path: path.relative(b, f.p), size: f.size, mtime: f.mtime })),
  });
}));

module.exports = router;
