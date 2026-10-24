// Administración de plugins: instalados, activar/desactivar, catálogo del repositorio, descargar y subir.
const router = require("express").Router();
const multer = require("multer");
const { wrap } = require("../lib/utils");
const { needAdmin } = require("../middleware/auth");
const pl = require("../services/plugins");

const up = multer({ storage: multer.memoryStorage(), limits: { files: 25, fileSize: 5 * 1024 * 1024, fields: 12 } })
  .fields([{ name: "images", maxCount: 5 }, { name: "files", maxCount: 20 }]);

router.get("/api/admin/plugins", needAdmin, wrap(async (req, res) => res.json({ plugins: pl.listInstalled() })));
router.post("/api/admin/plugins/:id/toggle", needAdmin, wrap(async (req, res) => { await pl.setEnabled(req.params.id, !!req.body.enabled); res.json({ success: true }); }));
router.delete("/api/admin/plugins/:id", needAdmin, wrap(async (req, res) => { await pl.uninstall(req.params.id); res.json({ success: true }); }));
router.get("/api/admin/plugins/market", needAdmin, wrap(async (req, res) => res.json({ plugins: await pl.catalog(), installed: pl.listInstalled().map(p => ({ id: p.id, version: p.version })) })));
router.post("/api/admin/plugins/market/install", needAdmin, wrap(async (req, res) => {
  const { catFolder, folder } = req.body || {};
  if (![catFolder, folder].every(x => typeof x === "string" && x && !x.includes("..") && !x.includes("/"))) throw Error("Datos inválidos");
  const m = await pl.install(catFolder, folder); res.json({ success: true, id: m.id });
}));
// Imágenes del repositorio (la CSP solo permite imágenes propias, así que se sirven desde aquí)
router.get("/api/admin/plugins/market/img", needAdmin, wrap(async (req, res) => {
  const p = String(req.query.p || ""); if (!pl.IMG.test(p)) throw Error("No es una imagen");
  const buf = await pl.remoteFile(p);
  res.set({ "Content-Type": /\.svg$/i.test(p) ? "image/svg+xml" : "image/" + (p.split(".").pop().toLowerCase().replace("jpg", "jpeg")), "Content-Security-Policy": "sandbox", "Cache-Control": "private, max-age=300" }).send(buf);
}));
router.get("/api/admin/plugins/github", needAdmin, wrap(async (req, res) => res.json(pl.githubStatus())));
router.post("/api/admin/plugins/github/start", needAdmin, wrap(async (req, res) => res.json(await pl.githubStart())));
router.post("/api/admin/plugins/github/poll", needAdmin, wrap(async (req, res) => res.json(await pl.githubPoll(String(req.body?.device_code || "")))));
router.delete("/api/admin/plugins/github", needAdmin, wrap(async (req, res) => { pl.githubUnlink(); res.json({ success: true }); }));
router.post("/api/admin/plugins/publish", needAdmin, (req, res) => {
  up(req, res, err => {
    if (err) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Cada archivo puede pesar como máximo 5 MB" : err.message });
    const f = req.files || {}, b = req.body || {};
    pl.publish({ ...b, author: req.user.username, images: (f.images || []).map(x => ({ name: x.originalname, buffer: x.buffer })), files: (f.files || []).map(x => ({ name: x.originalname, buffer: x.buffer })) })
      .then(r => res.json({ success: true, ...r })).catch(e => res.status(400).json({ error: e.message }));
  });
});

module.exports = router;
