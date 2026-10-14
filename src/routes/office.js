// Vista previa de documentos de Office: se convierten a PDF con LibreOffice (si está instalado en el servidor).
// Sin LibreOffice el navegador usa sus visores integrados para docx, xlsx y pptx.
const router = require("express").Router();
const fs = require("fs"), fsp = fs.promises, path = require("path"), crypto = require("crypto");
const { execFile } = require("child_process"), { pathToFileURL } = require("url");
const { TMP } = require("../config");
const { wrap, sha } = require("../lib/utils");
const { fileOf } = require("../lib/paths");
const { need } = require("../middleware/auth");
const { space } = require("../services/collab");

const OFFICE = new Set(".doc .docx .xls .xlsx .ppt .pptx .odt .ods .odp .rtf".split(" "));
const CACHE = path.join(TMP, "office"), MAX = 40 * 1048576;
const exec = (c, a, o) => new Promise((ok, no) => execFile(c, a, o, (e, so, se) => e ? no(e) : ok(so)));
let lo; // comando de LibreOffice (null = no disponible)
async function find() {
  if (lo !== undefined) return lo;
  const w = ["C:\\Program Files\\LibreOffice\\program\\soffice.exe", "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe", "/Applications/LibreOffice.app/Contents/MacOS/soffice"];
  for (const c of [process.env.SOFFICE, "soffice", "libreoffice", ...w].filter(Boolean)) { try { await exec(c, ["--version"], { timeout: 30000 }); return lo = c; } catch { } }
  return lo = null;
}
let q = Promise.resolve(); // una conversión a la vez
const queue = fn => { const r = q.then(fn); q = r.catch(() => { }); return r; };
let swept = 0;
async function sweep() { // borra conversiones con más de 6 horas
  if (Date.now() - swept < 6e5) return; swept = Date.now();
  for (const n of await fsp.readdir(CACHE).catch(() => [])) if (n.endsWith(".pdf")) { const f = path.join(CACHE, n), s = await fsp.stat(f).catch(() => null); if (s && Date.now() - s.mtimeMs > 216e5) await fsp.rm(f, { force: true }); }
}

router.get("/api/convert", need, wrap(async (req, res) => {
  const sp = await space(req, "read"), f = fileOf(req, sp.root), st = await fsp.stat(f), ext = path.extname(f).toLowerCase();
  if (!st.isFile() || !OFFICE.has(ext)) throw Error("Tipo de archivo no compatible");
  if (st.size > MAX) throw Error("El archivo es demasiado grande para la vista previa");
  const cmd = await find();
  if (!cmd) return res.status(501).json({ error: "LibreOffice no está instalado en el servidor" });
  await fsp.mkdir(CACHE, { recursive: true }); sweep();
  const out = path.join(CACHE, sha(f + "|" + st.size + "|" + st.mtimeMs).slice(0, 32) + ".pdf");
  if (!fs.existsSync(out)) await queue(async () => {
    if (fs.existsSync(out)) return;
    const work = path.join(CACHE, "w-" + crypto.randomBytes(6).toString("hex")), input = path.join(work, "in" + ext);
    await fsp.mkdir(work, { recursive: true });
    try {
      await fsp.copyFile(f, input);
      await exec(cmd, ["--headless", "--norestore", "--nologo", "--nofirststartwizard", "-env:UserInstallation=" + pathToFileURL(path.join(CACHE, "profile")).href, "--convert-to", "pdf", "--outdir", work, input], { timeout: 120000 });
      await fsp.rename(path.join(work, "in.pdf"), out);
    } finally { await fsp.rm(work, { recursive: true, force: true }); }
  }).catch(() => { throw Error("No se pudo convertir el documento"); });
  res.set({ "Content-Type": "application/pdf", "Content-Security-Policy": "sandbox", "Cache-Control": "private, max-age=300" });
  res.sendFile(out);
}));

module.exports = router;
