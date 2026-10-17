// Discord: estado de la cuenta vinculada (para el perfil) y ajustes del bot (para el panel de administración).
const router = require("express").Router();
const { wrap } = require("../lib/utils");
const { need, needAdmin } = require("../middleware/auth");
const dc = require("../discord");
const store = require("../discord/store");
const logger = require("../discord/logger");

router.get("/api/discord", need, (req, res) => {
  const l = store.linkOf(req.user.id);
  res.json({ enabled: dc.enabled(), linked: l ? { name: l.discord_name, since: l.linked_at } : null });
});
router.post("/api/discord/unlink", need, (req, res) => { store.unlink(req.user.id); res.json({ success: true }); });

router.get("/api/admin/discord", needAdmin, wrap(async (req, res) => {
  const s = dc.state, ch = async w => { const id = store.channel(w); return id ? { id, name: await dc.channelName(id) } : null; };
  res.json({
    configured: s.configured, ready: s.ready, tag: s.tag, error: s.error, invite: s.invite, guilds: s.guilds,
    log_channel: await ch("log"), update_channel: await ch("update"),
    events: Object.entries(store.EVENTS).map(([key, label]) => ({ key, label, on: store.eventOn(key) })),
    actions: store.actionsOn(), linked: store.countLinks(), public_url: !!process.env.PUBLIC_URL,
  });
}));
router.post("/api/admin/discord", needAdmin, wrap(async (req, res) => {
  const ev = req.body.events || {};
  for (const k of Object.keys(store.EVENTS)) if (ev[k] !== undefined) store.setEvent(k, !!ev[k]);
  if (req.body.actions !== undefined) store.setActions(!!req.body.actions);
  res.json({ success: true });
}));
router.post("/api/admin/discord/clear", needAdmin, wrap(async (req, res) => {
  const w = req.body.which === "update" ? "update" : req.body.which === "log" ? "log" : null;
  if (!w) throw Error("Canal inválido");
  store.setChannel(w, null); res.json({ success: true });
}));
router.post("/api/admin/discord/test", needAdmin, wrap(async (req, res) => {
  if (!dc.state.ready) throw Error("El bot no está conectado");
  const sent = [];
  for (const [w, label] of [["log", "registros"], ["update", "actualizaciones"]]) {
    const id = store.channel(w); if (!id) continue;
    await logger.sendTo(id, { embeds: [{ color: 0x4f8cff, title: "Mensaje de prueba", description: `El canal de ${label} funciona. Enviado por ${logger.md(req.user.username)} desde el panel web.`, footer: { text: "File Cloud" } }] })
      .catch(e => { throw Error(`No se pudo escribir en el canal de ${label}: ${e.message}`); });
    sent.push(label);
  }
  if (!sent.length) throw Error("Aún no hay ningún canal configurado: usa /config en Discord");
  res.json({ success: true, sent });
}));

module.exports = router;
