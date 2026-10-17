// Mensajes de bienvenida del bot de Discord. Se configuran por servidor, tanto con /bienvenida en Discord como en Admin → Discord (web);
// ambos escriben en la misma tabla (discord_welcome). Necesita el intent privilegiado «Server Members» del bot.
const { get, run, now } = require("../db");
const logger = require("./logger");

const DEFAULT_MSG = "¡Bienvenido/a {mention} a **{server}**! 🎉\nEres el miembro número **{members}**.";
const DEFAULT_TITLE = "¡Bienvenido/a, {nickname}!";
const MAX_MSG = 1500, MAX_TITLE = 100;

// Códigos que se pueden usar en el mensaje y en el título
const VARS = [
  ["{username}", "Nombre de usuario de Discord"],
  ["{nickname}", "Apodo en el servidor (o su nombre visible si no tiene)"],
  ["{mention}", "Menciona a la persona (@usuario)"],
  ["{tag}", "Usuario con formato @usuario"],
  ["{id}", "ID de Discord de la persona"],
  ["{members}", "Número total de miembros del servidor"],
  ["{humans}", "Miembros sin contar bots (si el servidor lo permite; si no, igual que {members})"],
  ["{server}", "Nombre del servidor"],
  ["{created}", "Hace cuánto se creó su cuenta de Discord"],
  ["{date}", "Fecha de hoy"],
];

const getCfg = gid => get("SELECT * FROM discord_welcome WHERE guild_id=?", String(gid));
const publicCfg = r => ({
  enabled: !!r?.enabled, channel_id: r?.channel_id || null,
  message: r?.message ?? DEFAULT_MSG, title: r?.title ?? DEFAULT_TITLE, embed: r ? !!r.embed : true,
});
const config = gid => publicCfg(getCfg(gid));

// Guarda solo los campos indicados; el resto conserva su valor (o el de por defecto si es la primera vez)
function save(gid, patch) {
  const cur = publicCfg(getCfg(gid)), n = { ...cur, ...patch };
  if (typeof n.message !== "string" || !n.message.trim()) throw Error("El mensaje de bienvenida no puede estar vacío");
  if (n.message.length > MAX_MSG) throw Error(`El mensaje es demasiado largo (máximo ${MAX_MSG} caracteres)`);
  n.title = String(n.title ?? "").trim();
  if (n.title.length > MAX_TITLE) throw Error(`El título es demasiado largo (máximo ${MAX_TITLE} caracteres)`);
  if (n.enabled && !n.channel_id) throw Error("Elige primero el canal donde se enviarán las bienvenidas");
  run("INSERT OR REPLACE INTO discord_welcome(guild_id,enabled,channel_id,message,title,embed,updated_at) VALUES(?,?,?,?,?,?,?)",
    String(gid), n.enabled ? 1 : 0, n.channel_id || null, n.message, n.title, n.embed ? 1 : 0, now());
  return n;
}
const remove = gid => run("DELETE FROM discord_welcome WHERE guild_id=?", String(gid));

// Sustituye los {códigos}. Los códigos desconocidos se dejan tal cual. Los nombres se escapan para que nadie
// pueda colar formato, menciones (@everyone) ni enlaces con su apodo.
const vars = c => ({
  username: logger.md(c.username), nickname: logger.md(c.nickname || c.username), mention: c.id ? `<@${c.id}>` : logger.md(c.username),
  tag: "@" + logger.md(c.username), id: String(c.id || ""), members: String(c.members ?? "?"), humans: String(c.humans ?? c.members ?? "?"),
  server: logger.md(c.server), created: c.createdTs ? `<t:${c.createdTs}:R>` : "—", date: `<t:${Math.floor(Date.now() / 1000)}:D>`,
});
const render = (tpl, c) => { const v = vars(c); return String(tpl || "").replace(/\{(\w+)\}/g, (m, k) => Object.prototype.hasOwnProperty.call(v, k.toLowerCase()) ? v[k.toLowerCase()] : m); };

// Contexto a partir de un miembro de Discord (GuildMember)
function ctxOf(m) {
  const g = m.guild, bots = g.members.cache.filter(x => x.user.bot).size;
  return {
    id: m.id, username: m.user.username, nickname: m.displayName, server: g.name, members: g.memberCount,
    humans: g.members.cache.size >= g.memberCount ? g.memberCount - bots : g.memberCount, createdTs: Math.floor(m.user.createdTimestamp / 1000),
  };
}

// Mensaje listo para enviar (texto o embed), con menciones limitadas a la persona que entra
function build(cfg, c) {
  const body = render(cfg.message, c).slice(0, cfg.embed ? 3800 : 1900), title = cfg.title ? render(cfg.title, c).slice(0, 250) : "";
  const allowedMentions = c.id ? { parse: [], users: [String(c.id)] } : { parse: [] };
  if (!cfg.embed) return { content: (title ? `**${title}**\n` : "") + body, allowedMentions };
  return { content: undefined, allowedMentions, embeds: [{ color: 0x2ecc71, title: title || undefined, description: body, footer: { text: c.server + " · File Cloud" } }] };
}

// Cuando entra alguien nuevo
async function onJoin(m) {
  try {
    if (m.user.bot) return;
    const cfg = getCfg(m.guild.id); if (!cfg || !cfg.enabled || !cfg.channel_id) return;
    await logger.sendTo(cfg.channel_id, build(publicCfg(cfg), ctxOf(m)));
  } catch (e) { console.warn("[Discord] No se pudo enviar la bienvenida:", e.message); }
}

module.exports = { VARS, DEFAULT_MSG, DEFAULT_TITLE, MAX_MSG, MAX_TITLE, config, save, remove, render, build, ctxOf, onJoin };
