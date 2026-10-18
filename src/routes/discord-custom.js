// Comandos propios del bot de Discord: API del editor web (solo administradores).
const router = require("express").Router();
const { wrap } = require("../lib/utils");
const { needAdmin } = require("../middleware/auth");
const dc = require("../discord");
const custom = require("../discord/custom");
const store = require("../discord/store");
const logger = require("../discord/logger");
const updates = require("../discord/updates");

const log = (req, t) => logger.log("admin", `**${logger.md(req.user.username)}** *(admin, por la web)* ${t}`);

router.get("/api/admin/discord/cmds", needAdmin, wrap(async (req, res) => {
  res.json({ ...custom.list(), prefix: custom.prefix(), limits: custom.limits, types: custom.OPT_TYPES, access: custom.ACCESS, match: custom.MATCH, bot: { ready: dc.state.ready, content: dc.state.content, configured: dc.state.configured } });
}));
router.get("/api/admin/discord/cmds/get", needAdmin, wrap(async (req, res) => res.json(custom.read(String(req.query.id || "")))));
router.get("/api/admin/discord/script/wiki", needAdmin, (req, res) => {
  const w = require("../discord/script/wiki");
  res.json({ guides: w.GUIDES, functions: custom.docs().map(d => ({ ...d, ex: w.EXAMPLES[d.n] || null })) });
});
router.get("/api/admin/discord/script/docs", needAdmin, (req, res) => res.json(custom.docs()));

router.post("/api/admin/discord/cmds/save", needAdmin, wrap(async (req, res) => {
  const b = req.body || {}, r = custom.save({ id: b.id ? String(b.id) : null, folder: b.folder, name: b.name, meta: b.meta, code: b.code });
  log(req, `${b.id ? "guardó" : "creó"} el comando propio **${logger.md(r.id)}**`);
  res.json({ success: true, ...r });
}));
router.post("/api/admin/discord/cmds/delete", needAdmin, wrap(async (req, res) => {
  const id = String(req.body?.id || ""); custom.remove(id); log(req, `borró el comando propio **${logger.md(id)}**`); res.json({ success: true });
}));
router.post("/api/admin/discord/cmds/check", needAdmin, wrap(async (req, res) => res.json({ errors: custom.checkCode(req.body?.code, req.body?.meta) })));
router.post("/api/admin/discord/cmds/test", needAdmin, wrap(async (req, res) => {
  const b = req.body || {}; res.json(await custom.dry(b.code, b.meta, { args: b.args, options: b.options || {}, fc: req.user }));
}));
router.post("/api/admin/discord/folders", needAdmin, wrap(async (req, res) => {
  const b = req.body || {}; custom.folder(String(b.action), String(b.path || ""), b.to, !!b.force);
  log(req, `${{ create: "creó", rename: "renombró", delete: "borró" }[b.action] || "cambió"} la carpeta de comandos **${logger.md(b.path)}**`); res.json({ success: true });
}));
router.post("/api/admin/discord/prefix", needAdmin, wrap(async (req, res) => { custom.setPrefix(req.body?.prefix); res.json({ success: true, prefix: custom.prefix() }); }));

// Canales de registros y de actualizaciones, elegidos desde la web (igual que /config en Discord)
router.post("/api/admin/discord/channel", needAdmin, wrap(async (req, res) => {
  const w = req.body?.which === "update" ? "update" : req.body?.which === "log" ? "log" : null, cid = String(req.body?.channel_id || "");
  if (!w) throw Error("Canal inválido");
  if (!cid) { store.setChannel(w, null); return res.json({ success: true }); }
  if (!dc.state.ready) throw Error("El bot no está conectado");
  if (!dc.guildList().some(g => g.channels.some(c => c.id === cid))) throw Error("Ese canal no existe o el bot no puede escribir en él");
  await logger.sendTo(cid, { embeds: [{ color: 0x2ecc71, title: w === "log" ? "Canal de registros configurado" : "Canal de actualizaciones configurado", description: `Configurado por ${logger.md(req.user.username)} desde la web.`, footer: { text: "File Cloud" } }] }).catch(e => { throw Error("El bot no puede escribir en ese canal: " + e.message); });
  store.setChannel(w, cid); if (w === "update") updates.announce().catch(() => { });
  log(req, `configuró el canal de ${w === "log" ? "registros" : "actualizaciones"}`); res.json({ success: true });
}));

module.exports = router;
