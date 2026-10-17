// Bot de Discord de File Cloud (OPCIONAL). Solo se activa si en el archivo .env hay un DISCORD_TOKEN.
// Sin token no se carga nada: el servidor funciona exactamente igual que siempre.
//   - Vincular cuentas con un formulario privado (usuario, contraseña y 2FA).
//   - Registro de actividad en un canal (sin guardar nada en disco) y avisos de actualización en otro.
//   - Comandos de barra: unos para todos los usuarios vinculados y otros solo para administradores.
const logger = require("./logger");
const updates = require("./updates");
const welcome = require("./welcome");
const ver = require("../version");

let client = null, cmds = null, D = null;
const state = { configured: false, ready: false, tag: null, error: null, invite: null, guilds: 0, members: false };

function start() {
  const token = String(process.env.DISCORD_TOKEN || "").trim();
  if (!token) return;
  state.configured = true;
  try { D = require("discord.js"); }
  catch { state.error = "Falta la librería discord.js: ejecuta «npm install» en la carpeta del proyecto"; console.warn("[Discord] " + state.error); return; }
  try { cmds = require("./commands")(D); }
  catch (e) { state.error = "No se pudo preparar el bot: " + e.message; console.error("[Discord] " + state.error); return; }
  connect(token, true);
  ver.onCheck(() => { if (state.ready) updates.announce().catch(() => { }); }); // avisa de versiones nuevas
}

// Se intenta con el intent «Server Members» (necesario para las bienvenidas). Si el bot no lo tiene activado en el
// Developer Portal, se conecta igualmente sin él: todo funciona salvo las bienvenidas automáticas.
function connect(token, withMembers) {
  try {
    client = new D.Client({ intents: withMembers ? [D.GatewayIntentBits.Guilds, D.GatewayIntentBits.GuildMembers] : [D.GatewayIntentBits.Guilds] });
  } catch (e) { state.error = "No se pudo preparar el bot: " + e.message; console.error("[Discord] " + state.error); return; }
  state.members = withMembers;
  client.once(D.Events.ClientReady, onReady);
  client.on(D.Events.InteractionCreate, handle);
  if (withMembers) client.on(D.Events.GuildMemberAdd, m => welcome.onJoin(m));
  client.on(D.Events.Error, e => console.error("[Discord]", e.message));
  client.login(token).catch(e => {
    if (withMembers && /disallowed/i.test(e.code + " " + e.message)) {
      console.warn("[Discord] El intent «Server Members» no está activado: las bienvenidas automáticas no funcionarán hasta que lo actives (Developer Portal → Bot → Privileged Gateway Intents).");
      try { client.destroy(); } catch { }
      return connect(token, false);
    }
    state.error = "No se pudo iniciar sesión: " + (/token/i.test(e.code + " " + e.message) ? "el token no es válido" : e.message);
    console.error("[Discord] " + state.error);
  });
}

async function onReady(c) {
  state.ready = true; state.error = null; state.tag = c.user.tag; state.guilds = c.guilds.cache.size;
  state.invite = `https://discord.com/oauth2/authorize?client_id=${c.user.id}&scope=bot%20applications.commands&permissions=19456`; // ver canal + enviar mensajes + insertar enlaces
  logger.setSender(async (id, payload) => {
    const ch = await client.channels.fetch(id);
    if (!ch || !ch.isTextBased()) throw Error("El canal no existe o no es de texto");
    return ch.send({ allowedMentions: { parse: [] }, ...payload }); // sin menciones, salvo el rol que el admin pida para las actualizaciones
  });
  try { await c.application.commands.set(cmds.json, String(process.env.DISCORD_GUILD_ID || "").trim() || undefined); }
  catch (e) { console.error("[Discord] No se pudieron registrar los comandos:", e.message); }
  console.log(`Bot de Discord conectado como ${c.user.tag}. Invítalo con: ${state.invite}`);
  updates.announce().catch(() => { });
}

async function handle(i) {
  try {
    if (i.isChatInputCommand()) await cmds.run(i);
    else if (i.isModalSubmit() && i.customId === "fc-link") await cmds.submitLink(i);
    else if (i.isModalSubmit() && i.customId === "fc-welcome") await cmds.submitWelcome(i);
  } catch (e) {
    console.error("[Discord]", e.message);
    try { if (!i.replied && !i.deferred) await i.reply({ content: "Ocurrió un error inesperado.", flags: D.MessageFlags.Ephemeral }); } catch { /* la interacción ya caducó */ }
  }
}

// Servidores del bot con sus canales de texto en los que puede escribir y su bienvenida (para el panel web)
function guildList() {
  if (!client || !state.ready) return [];
  return [...client.guilds.cache.values()].map(g => {
    const me = g.members.me;
    return {
      id: g.id, name: g.name, members: g.memberCount,
      channels: [...g.channels.cache.values()].filter(c => (c.type === D.ChannelType.GuildText || c.type === D.ChannelType.GuildAnnouncement) && (!me || c.permissionsFor(me)?.has(["ViewChannel", "SendMessages"])))
        .sort((a, b) => a.rawPosition - b.rawPosition).map(c => ({ id: c.id, name: c.name })),
      welcome: welcome.config(g.id),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

// Nombre del canal para mostrarlo en el panel de administración
async function channelName(id) {
  if (!id || !client || !state.ready) return null;
  const ch = client.channels.cache.get(id) || await client.channels.fetch(id).catch(() => null);
  return ch?.name || null;
}

module.exports = { start, state, channelName, guildList, enabled: () => state.configured };
