// Sistema de tickets de soporte (comando /tickets). Un botón abre un canal privado con quien lo pulsa y el rol de soporte.
//   - Quien abre el ticket SOLO puede escribir en su canal (sin comandos, hilos, menciones masivas, ni botones de gestión).
//   - El rol de soporte puede ver el ticket, reclamarlo y cerrarlo. Al reclamarlo, el resto del rol deja de poder escribir (siguen viéndolo).
//   - Solo quien lo reclamó puede cerrarlo o soltarlo (o alguien con «Gestionar servidor»).
//   - Al cerrar se guarda una transcripción en un canal de registro (opcional) y se borra el canal.
const { get, run, now } = require("../db");

const LIMIT_CHARS = 1000;
module.exports = function tickets(D) {
  const { SlashCommandBuilder, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, PermissionFlagsBits: P, AttachmentBuilder } = D;
  const EPH = MessageFlags.Ephemeral, COLOR = 0x4f8cff;
  const pad = n => String(n).padStart(4, "0");
  const perms = l => l.filter(n => P[n]).map(n => P[n]); // ignora permisos que la versión de discord.js no conozca
  const CHAT = ["ViewChannel", "SendMessages", "ReadMessageHistory", "AttachFiles", "EmbedLinks"];
  const USER_DENY = ["UseApplicationCommands", "UseExternalApps", "CreatePublicThreads", "CreatePrivateThreads", "SendMessagesInThreads", "MentionEveryone", "CreateInstantInvite", "ManageMessages", "ManageChannels", "ManageWebhooks"];
  const BOT_NEED = ["ManageChannels", "ViewChannel", "SendMessages", "EmbedLinks", "AttachFiles", "ReadMessageHistory", "ManageRoles"];

  const cfgOf = g => get("SELECT * FROM discord_ticket_cfg WHERE guild_id=?", g);
  const ticketOf = ch => get("SELECT * FROM discord_tickets WHERE channel_id=?", ch);
  const staffOf = (i, cfg) => !!(i.member?.roles?.cache?.has(cfg.role_id) || i.memberPermissions?.has(P.ManageGuild));
  const eph = (i, text) => (i.deferred || i.replied) ? i.editReply({ content: text }) : i.reply({ content: text, flags: EPH });
  const btn = (id, label, style, emoji, disabled) => { const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(!!disabled); if (emoji) b.setEmoji(emoji); return b; };
  const row = (...b) => new ActionRowBuilder().addComponents(...b);

  // ---------- /tickets ----------
  const builder = new SlashCommandBuilder().setName("tickets").setDescription("(Admin) Sistema de tickets de soporte con botón").setDMPermission(false)
    .addSubcommand(s => s.setName("configurar").setDescription("Elige el rol de soporte y dónde se crean los tickets")
      .addRoleOption(o => o.setName("rol").setDescription("Rol que verá, reclamará y cerrará los tickets").setRequired(true))
      .addChannelOption(o => o.setName("categoria").setDescription("Categoría donde se crean los canales de ticket").addChannelTypes(ChannelType.GuildCategory))
      .addChannelOption(o => o.setName("registro").setDescription("Canal donde se guardan las transcripciones al cerrar").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addIntegerOption(o => o.setName("maximo").setDescription("Tickets abiertos a la vez por persona (1-5, por defecto 1)").setMinValue(1).setMaxValue(5)))
    .addSubcommand(s => s.setName("panel").setDescription("Envía el mensaje con el botón «Abrir ticket»")
      .addChannelOption(o => o.setName("canal").setDescription("Dónde enviarlo (por defecto, este canal)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addStringOption(o => o.setName("titulo").setDescription("Título del mensaje").setMaxLength(100))
      .addStringOption(o => o.setName("descripcion").setDescription("Texto del mensaje").setMaxLength(1000)))
    .addSubcommand(s => s.setName("estado").setDescription("Muestra la configuración y los tickets abiertos"));

  function botProblem(g) {
    const me = g.members.me; if (!me) return "No encuentro al bot en el servidor.";
    const miss = BOT_NEED.filter(n => P[n] && !me.permissions.has(P[n]));
    return miss.length ? `Al bot le faltan permisos en el servidor: **${miss.join(", ")}**. Vuelve a invitarlo con el enlace del panel o dáselos en Ajustes → Roles.` : "";
  }

  // ---------- servicio compartido (lo usan /tickets y la web: Admin → Discord → Tickets) ----------
  // g: servidor de Discord (objeto de discord.js). Todas lanzan Error con un mensaje claro si algo no cuadra.
  function saveCfg(g, { role_id, category_id, log_id, max_open }) {
    const role = g.roles.cache.get(String(role_id || "")); if (!role) throw Error("Elige el rol de soporte");
    if (role.id === g.id || role.managed) throw Error("Ese rol no sirve: elige un rol normal (no @everyone ni el de una integración)");
    const bp = botProblem(g); if (bp) throw Error(bp.replace(/\*\*/g, ""));
    const me = g.members.me, cat = category_id ? g.channels.cache.get(String(category_id)) : null, log = log_id ? g.channels.cache.get(String(log_id)) : null, max = Math.min(5, Math.max(1, parseInt(max_open, 10) || 1));
    if (category_id && (!cat || cat.type !== ChannelType.GuildCategory)) throw Error("La categoría no existe");
    if (cat && !cat.permissionsFor(me)?.has(P.ManageChannels)) throw Error("El bot no puede gestionar canales en esa categoría");
    if (log_id && (!log || !log.isTextBased?.())) throw Error("El canal de registro no existe o no es de texto");
    if (log && !log.permissionsFor(me)?.has(["ViewChannel", "SendMessages", "AttachFiles"])) throw Error(`El bot no puede escribir ni adjuntar archivos en #${log.name}`);
    run("INSERT INTO discord_ticket_cfg(guild_id,role_id,category_id,log_id,max_open,counter) VALUES(?,?,?,?,?,0) ON CONFLICT(guild_id) DO UPDATE SET role_id=excluded.role_id,category_id=excluded.category_id,log_id=excluded.log_id,max_open=excluded.max_open", g.id, role.id, cat?.id || null, log?.id || null, max);
    return { role, cat, log, max };
  }
  async function sendPanel(g, channelId, title, description) {
    if (!cfgOf(g.id)) throw Error("Primero configura el rol de soporte");
    const ch = g.channels.cache.get(String(channelId || ""));
    if (!ch?.isTextBased?.() || !ch.permissionsFor(g.members.me)?.has(["ViewChannel", "SendMessages", "EmbedLinks"])) throw Error("El bot no puede escribir (con tarjetas) en ese canal");
    const bp = botProblem(g); if (bp) throw Error(bp.replace(/\*\*/g, ""));
    const e = new EmbedBuilder().setColor(COLOR).setTitle(String(title || "").trim().slice(0, 100) || "🎫 Soporte").setDescription(String(description || "").trim().slice(0, 1000) || "¿Necesitas ayuda? Pulsa el botón y se abrirá un canal privado con nuestro equipo.\nCuéntanos tu problema con el mayor detalle posible.");
    await ch.send({ embeds: [e], components: [row(btn("tk:open", "Abrir ticket", ButtonStyle.Success, "🎫"))], allowedMentions: { parse: [] } });
    return ch;
  }
  // Estado para la web: configuración, problemas y tickets abiertos
  function info(g) {
    const c = cfgOf(g.id), nm = id => g.members.cache.get(id)?.displayName || id;
    const open = require("../db").all("SELECT * FROM discord_tickets WHERE guild_id=? ORDER BY number DESC LIMIT 50", g.id).filter(t => g.channels.cache.has(t.channel_id)).map(t => ({ channel_id: t.channel_id, number: t.number, user: nm(t.user_id), claimed_by: t.claimed_by ? nm(t.claimed_by) : null, subject: String(t.subject || "").slice(0, 120), created: t.created }));
    return { configured: !!c, role_id: c?.role_id || null, category_id: c?.category_id || null, log_id: c?.log_id || null, max_open: c?.max_open || 1, counter: c?.counter || 0, role_ok: !c || g.roles.cache.has(c.role_id), problem: botProblem(g).replace(/\*\*/g, ""), open };
  }
  const reset = gid => { run("DELETE FROM discord_ticket_cfg WHERE guild_id=?", gid); };

  async function run_(i) {
    const sub = i.options.getSubcommand(), g = i.guild;
    if (sub === "configurar") {
      let r; try { r = saveCfg(g, { role_id: i.options.getRole("rol")?.id, category_id: i.options.getChannel("categoria")?.id, log_id: i.options.getChannel("registro")?.id, max_open: i.options.getInteger("maximo") || 1 }); } catch (e) { return eph(i, e.message); }
      return eph(i, `✅ Tickets configurados.\n• Rol de soporte: ${r.role}\n• Categoría: ${r.cat ? r.cat.name : "(ninguna)"}\n• Registro: ${r.log ? r.log.toString() : "(sin transcripciones)"}\n• Máximo por persona: ${r.max}\nAhora usa **/tickets panel** para enviar el botón (o hazlo desde la web).`);
    }
    const cfg = cfgOf(g.id);
    if (!cfg) return eph(i, "Primero configura el rol de soporte con **/tickets configurar**.");
    if (sub === "estado") {
      const n = info(g);
      return eph(i, `**Tickets de ${g.name}**\n• Rol de soporte: <@&${cfg.role_id}>\n• Categoría: ${cfg.category_id ? `<#${cfg.category_id}>` : "(ninguna)"}\n• Registro: ${cfg.log_id ? `<#${cfg.log_id}>` : "(sin transcripciones)"}\n• Máximo por persona: ${cfg.max_open}\n• Abiertos ahora: ${n.open.length} · Creados en total: ${cfg.counter}${n.problem ? "\n⚠️ " + n.problem : ""}`);
    }
    try { const ch = await sendPanel(g, (i.options.getChannel("canal") || i.channel).id, i.options.getString("titulo"), i.options.getString("descripcion")); return eph(i, `✅ Panel enviado a ${ch}.`); } catch (e) { return eph(i, e.message); }
  }

  // ---------- botones y formulario ----------
  async function open(i) {
    const cfg = cfgOf(i.guildId); if (!cfg) return eph(i, "Los tickets no están configurados en este servidor.");
    if (mine(i, cfg).length >= cfg.max_open) return eph(i, `Ya tienes ${cfg.max_open === 1 ? "un ticket abierto" : "el máximo de tickets abiertos"}: ${mine(i, cfg).map(t => `<#${t.channel_id}>`).join(" ")}`);
    const m = new ModalBuilder().setCustomId("tk:modal").setTitle("Abrir ticket").addComponents(row(new TextInputBuilder().setCustomId("problema").setLabel("Describe tu problema").setStyle(TextInputStyle.Paragraph).setMinLength(10).setMaxLength(LIMIT_CHARS).setRequired(true).setPlaceholder("Cuéntanos qué te pasa con el mayor detalle posible")));
    return i.showModal(m);
  }
  function mine(i, cfg) { // tickets abiertos de quien pulsa (se limpian los de canales que ya no existen)
    const rows = require("../db").all("SELECT * FROM discord_tickets WHERE guild_id=? AND user_id=?", i.guildId, i.user.id), live = [];
    for (const t of rows) { if (i.guild.channels.cache.has(t.channel_id)) live.push(t); else run("DELETE FROM discord_tickets WHERE channel_id=?", t.channel_id); }
    return live;
  }
  async function create(i) {
    const g = i.guild, cfg = cfgOf(g.id); if (!cfg) return eph(i, "Los tickets no están configurados en este servidor.");
    await i.deferReply({ flags: EPH });
    if (mine(i, cfg).length >= cfg.max_open) return eph(i, "Ya tienes un ticket abierto.");
    const bp = botProblem(g); if (bp) return eph(i, "No se puede abrir el ticket ahora mismo: avisa a un administrador (al bot le faltan permisos).");
    if (!g.roles.cache.has(cfg.role_id)) return eph(i, "El rol de soporte ya no existe: un administrador debe volver a configurar los tickets.");
    const problem = i.fields.getTextInputValue("problema").trim().slice(0, LIMIT_CHARS);
    run("UPDATE discord_ticket_cfg SET counter=counter+1 WHERE guild_id=?", g.id); const n = cfgOf(g.id).counter;
    const me = g.members.me.id;
    let ch;
    try {
      ch = await g.channels.create({
        name: `ticket-${pad(n)}`, type: ChannelType.GuildText, parent: cfg.category_id && g.channels.cache.has(cfg.category_id) ? cfg.category_id : undefined, topic: `Ticket #${pad(n)} de ${i.user.username} (${i.user.id})`, reason: `Ticket de ${i.user.username}`,
        permissionOverwrites: [
          { id: g.id, deny: perms(["ViewChannel"]) },
          { id: i.user.id, allow: perms(CHAT), deny: perms(USER_DENY) },
          { id: cfg.role_id, allow: perms(CHAT) },
          { id: me, allow: perms([...CHAT, "ManageChannels", "ManageMessages"]) },
        ],
      });
    } catch (e) { console.error("[Tickets]", e.message); return eph(i, "No pude crear el canal del ticket. Avisa a un administrador."); }
    run("INSERT INTO discord_tickets(channel_id,guild_id,user_id,number,claimed_by,subject,created) VALUES(?,?,?,?,NULL,?,?)", ch.id, g.id, i.user.id, n, problem, now());
    const e = new EmbedBuilder().setColor(COLOR).setTitle(`🎫 Ticket #${pad(n)}`).setDescription(`Hola ${i.user}, el equipo de <@&${cfg.role_id}> te atenderá en cuanto pueda. Mientras tanto, puedes escribir aquí más detalles o enviar capturas.`).addFields({ name: "Problema", value: problem.slice(0, 1000) }).setFooter({ text: "Solo el equipo de soporte puede reclamar y cerrar el ticket" });
    await ch.send({ content: `${i.user} <@&${cfg.role_id}>`, embeds: [e], components: [staffRow(null)], allowedMentions: { users: [i.user.id], roles: [cfg.role_id] } }).catch(() => { });
    return eph(i, `✅ Ticket creado: ${ch}`);
  }
  const staffRow = claimed => row(claimed ? btn("tk:release", "Soltar", ButtonStyle.Secondary, "↩️") : btn("tk:claim", "Reclamar", ButtonStyle.Primary, "🙋"), btn("tk:close", "Cerrar", ButtonStyle.Danger, "🔒"));

  async function claim(i, t, cfg) {
    if (t.claimed_by) return eph(i, `Ya lo reclamó <@${t.claimed_by}>.`);
    await i.deferUpdate();
    run("UPDATE discord_tickets SET claimed_by=? WHERE channel_id=?", i.user.id, t.channel_id);
    await i.channel.permissionOverwrites.edit(cfg.role_id, { SendMessages: false }, { reason: "Ticket reclamado" }); // el resto del equipo solo puede mirar
    await i.channel.permissionOverwrites.edit(i.user.id, Object.fromEntries(CHAT.map(n => [n, true])), { reason: "Ticket reclamado" });
    const e = EmbedBuilder.from(i.message.embeds[0]).setFields(...(i.message.embeds[0].fields || []).filter(f => f.name !== "Atiende"), { name: "Atiende", value: `${i.user}` });
    await i.editReply({ embeds: [e], components: [staffRow(true)] });
    await i.channel.send({ content: `🙋 ${i.user} ha reclamado este ticket y será quien te atienda.`, allowedMentions: { parse: [] } }).catch(() => { });
  }
  async function release(i, t, cfg) {
    if (!t.claimed_by) return eph(i, "Este ticket no está reclamado.");
    if (t.claimed_by !== i.user.id && !i.memberPermissions?.has(P.ManageGuild)) return eph(i, `Solo <@${t.claimed_by}> (o alguien con «Gestionar servidor») puede soltarlo.`);
    await i.deferUpdate();
    run("UPDATE discord_tickets SET claimed_by=NULL WHERE channel_id=?", t.channel_id);
    await i.channel.permissionOverwrites.edit(cfg.role_id, { SendMessages: true }, { reason: "Ticket soltado" });
    await i.channel.permissionOverwrites.delete(t.claimed_by, "Ticket soltado").catch(() => { });
    const e = EmbedBuilder.from(i.message.embeds[0]).setFields((i.message.embeds[0].fields || []).filter(f => f.name !== "Atiende"));
    await i.editReply({ embeds: [e], components: [staffRow(null)] });
    await i.channel.send({ content: "↩️ El ticket vuelve a estar libre: cualquiera del equipo puede reclamarlo.", allowedMentions: { parse: [] } }).catch(() => { });
  }
  function canClose(i, t) { return !t.claimed_by || t.claimed_by === i.user.id || !!i.memberPermissions?.has(P.ManageGuild); }
  async function closeAsk(i, t) {
    if (!canClose(i, t)) return eph(i, `Solo <@${t.claimed_by}> (quien lo reclamó) puede cerrarlo.`);
    return i.reply({ content: "¿Cerrar este ticket? Se guardará la transcripción y se borrará el canal.", components: [row(btn("tk:closeok", "Sí, cerrar", ButtonStyle.Danger, "🔒"))], flags: EPH });
  }
  async function transcript(ch) {
    const all = []; let before;
    for (let k = 0; k < 5; k++) { const b = await ch.messages.fetch({ limit: 100, before }).catch(() => null); if (!b?.size) break; all.push(...b.values()); before = b.last().id; if (b.size < 100) break; }
    return all.reverse().map(m => `[${new Date(m.createdTimestamp).toISOString().slice(0, 16).replace("T", " ")}] ${m.author.username}${m.author.bot ? " (bot)" : ""}: ${m.content || (m.embeds.length ? "[tarjeta]" : "")}${m.attachments.size ? " " + [...m.attachments.values()].map(a => a.url).join(" ") : ""}`).join("\n");
  }
  async function closeNow(i, t, cfg) {
    if (!canClose(i, t)) return eph(i, "No puedes cerrar este ticket.");
    await i.update({ content: "🔒 Cerrando el ticket…", components: [] }).catch(() => { });
    const ch = i.channel, g = i.guild;
    run("DELETE FROM discord_tickets WHERE channel_id=?", ch.id);
    try {
      const logCh = cfg.log_id ? await g.channels.fetch(cfg.log_id).catch(() => null) : null;
      if (logCh?.isTextBased?.()) {
        const txt = await transcript(ch), e = new EmbedBuilder().setColor(0xe74c3c).setTitle(`Ticket #${pad(t.number)} cerrado`).addFields({ name: "Abierto por", value: `<@${t.user_id}>`, inline: true }, { name: "Atendido por", value: t.claimed_by ? `<@${t.claimed_by}>` : "nadie", inline: true }, { name: "Cerrado por", value: `${i.user}`, inline: true }, { name: "Problema", value: String(t.subject || "").slice(0, 1000) || "—" }).setTimestamp();
        await logCh.send({ embeds: [e], files: [new AttachmentBuilder(Buffer.from(txt || "(vacío)", "utf8"), { name: `ticket-${pad(t.number)}.txt` })], allowedMentions: { parse: [] } }).catch(() => { });
      }
    } catch { /* la transcripción es opcional */ }
    await ch.send({ content: "🔒 Este canal se borrará en 5 segundos.", allowedMentions: { parse: [] } }).catch(() => { });
    setTimeout(() => ch.delete(`Ticket cerrado por ${i.user.username}`).catch(() => { }), 5000);
  }

  // Punto de entrada de botones y formularios que empiezan por «tk:»
  async function component(i) {
    if (!i.inGuild() || !i.guild) return;
    if (i.isModalSubmit()) return create(i);
    const id = i.customId;
    if (id === "tk:open") return open(i);
    const cfg = cfgOf(i.guildId), t = ticketOf(i.channelId);
    if (!cfg || !t) return eph(i, "Este botón ya no funciona (el ticket no existe o los tickets se reconfiguraron).");
    if (!staffOf(i, cfg)) return eph(i, "Solo el equipo de soporte puede hacer esto.");
    if (id === "tk:claim") return claim(i, t, cfg);
    if (id === "tk:release") return release(i, t, cfg);
    if (id === "tk:close") return closeAsk(i, t);
    if (id === "tk:closeok") return closeNow(i, t, cfg);
  }
  return { builder, run: run_, component, saveCfg, sendPanel, info, reset };
};
