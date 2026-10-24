// Discord: estado de la cuenta vinculada (para el perfil) y ajustes del bot (para el panel de administración).
const router = require("express").Router();
const { wrap } = require("../lib/utils");
const { need, needAdmin } = require("../middleware/auth");
const dc = require("../discord");
const store = require("../discord/store");
const logger = require("../discord/logger");
const welcome = require("../discord/welcome");

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
    members_intent: s.members, content_intent: s.content, prefix: require("../discord/custom").prefix(), guilds: dc.guildList(), welcome_vars: welcome.VARS, welcome_limits: { message: welcome.MAX_MSG, title: welcome.MAX_TITLE },
  });
}));
router.post("/api/admin/discord", needAdmin, wrap(async (req, res) => {
  const ev = req.body.events || {};
  for (const k of Object.keys(store.EVENTS)) if (ev[k] !== undefined) store.setEvent(k, !!ev[k]);
  if (req.body.actions !== undefined) store.setActions(!!req.body.actions);
  res.json({ success: true });
}));

// Bienvenidas: se configuran por servidor de Discord (el mismo ajuste que /bienvenida en Discord)
const guildOf = id => {
  const g = dc.guildList().find(x => x.id === String(id || ""));
  if (!g) throw Error("Ese servidor de Discord no existe o el bot no está en él");
  return g;
};
router.post("/api/admin/discord/welcome", needAdmin, wrap(async (req, res) => {
  const b = req.body || {}, g = guildOf(b.guild_id), patch = {};
  if (b.channel_id !== undefined) {
    const id = String(b.channel_id || "");
    if (id && !g.channels.some(c => c.id === id)) throw Error("Ese canal no existe en el servidor o el bot no puede escribir en él");
    patch.channel_id = id || null;
  }
  if (b.role_id !== undefined) {
    const id = String(b.role_id || "");
    if (id && !g.roles.some(r => r.id === id)) throw Error("Ese rol no existe o el bot no puede darlo (debe estar por debajo del rol del bot y el bot necesita «Gestionar roles»)");
    patch.role_id = id || null;
  }
  if (b.message !== undefined) patch.message = String(b.message);
  if (b.title !== undefined) patch.title = String(b.title);
  if (b.embed !== undefined) patch.embed = !!b.embed;
  if (b.enabled !== undefined) patch.enabled = !!b.enabled;
  if (patch.enabled && !dc.state.members) throw Error("El bot no tiene activado «Server Members Intent» (Developer Portal → Bot → Privileged Gateway Intents). Actívalo y reinicia SynapseBox");
  welcome.save(g.id, patch);
  logger.log("admin", `**${logger.md(req.user.username)}** *(admin, por la web)* cambió las bienvenidas de **${logger.md(g.name)}**`);
  res.json({ success: true });
}));
// Tickets: la misma configuración que /tickets en Discord (rol de soporte, categoría, registro, máximo por persona) y el envío del panel
const tkGuild = id => { const g = dc.guildOf(id), t = dc.tickets(); if (!g || !t) throw Error("Ese servidor de Discord no existe o el bot no está conectado"); return { g, t }; };
router.post("/api/admin/discord/tickets", needAdmin, wrap(async (req, res) => {
  const b = req.body || {}, { g, t } = tkGuild(b.guild_id); t.saveCfg(g, b);
  logger.log("admin", `**${logger.md(req.user.username)}** *(admin, por la web)* configuró los tickets de **${logger.md(g.name)}**`);
  res.json({ success: true, tickets: t.info(g) });
}));
router.post("/api/admin/discord/tickets/panel", needAdmin, wrap(async (req, res) => {
  const b = req.body || {}, { g, t } = tkGuild(b.guild_id); const ch = await t.sendPanel(g, b.channel_id, b.title, b.description);
  logger.log("admin", `**${logger.md(req.user.username)}** *(admin, por la web)* envió el panel de tickets a <#${ch.id}>`);
  res.json({ success: true });
}));
router.post("/api/admin/discord/tickets/reset", needAdmin, wrap(async (req, res) => {
  const { g, t } = tkGuild(req.body?.guild_id); t.reset(g.id);
  logger.log("admin", `**${logger.md(req.user.username)}** *(admin, por la web)* desactivó los tickets de **${logger.md(g.name)}**`);
  res.json({ success: true });
}));
router.post("/api/admin/discord/welcome/test", needAdmin, wrap(async (req, res) => {
  if (!dc.state.ready) throw Error("El bot no está conectado");
  const g = guildOf(req.body?.guild_id), cfg = welcome.config(g.id);
  if (!cfg.channel_id) throw Error("Elige primero el canal de bienvenidas y guarda");
  const out = welcome.build(cfg, { username: req.user.username, nickname: req.user.username, server: g.name, members: g.members });
  await logger.sendTo(cfg.channel_id, out).catch(e => { throw Error("No se pudo escribir en el canal: " + e.message); });
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
    await logger.sendTo(id, { embeds: [{ color: 0x4f8cff, title: "Mensaje de prueba", description: `El canal de ${label} funciona. Enviado por ${logger.md(req.user.username)} desde el panel web.`, footer: { text: "SynapseBox" } }] })
      .catch(e => { throw Error(`No se pudo escribir en el canal de ${label}: ${e.message}`); });
    sent.push(label);
  }
  if (!sent.length) throw Error("Aún no hay ningún canal configurado: usa /config en Discord");
  res.json({ success: true, sent });
}));

module.exports = router;
