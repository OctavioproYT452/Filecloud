// Comandos de barra del bot de Discord. Unos son para todos los usuarios vinculados y otros solo para administradores
// (se comprueba en cada uso contra la base de datos: si le quitas el rol de admin o suspendes la cuenta, el efecto es inmediato).
// Todas las respuestas son privadas ("efímeras"): solo las ve quien usó el comando.
const fsp = require("fs").promises, path = require("path"), crypto = require("crypto"), os = require("os");
const si = require("systeminformation");
const { get, all, run, now, verify } = require("../db");
const { safe, base, limitB } = require("../lib/paths");
const { usage } = require("../lib/storage");
const { errMsg } = require("../lib/utils");
const { locked, addFail, fails } = require("../services/auth");
const tf = require("../services/twofa");
const ai = require("../ai");
const ver = require("../version");
const store = require("./store");
const logger = require("./logger");
const updates = require("./updates");
const { md, code, fmt } = logger;

const P = v => "/" + String(v ?? "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
const publicUrl = () => String(process.env.PUBLIC_URL || "").trim().replace(/\/+$/, "");
const shareUrl = t => (publicUrl() || "") + "/s/" + t;
const unix = ms => Math.floor(ms / 1000);
const GENERIC = e => /^(Type|Reference|Range|Syntax)Error$/.test(e.name) ? "Ocurrió un error inesperado" : errMsg(e);

module.exports = function build(D) {
  const { SlashCommandBuilder, ChannelType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = D;
  const EPH = MessageFlags.Ephemeral, COLOR = 0x4f8cff;

  // ---------- ayudantes de respuesta ----------
  const emb = (title, desc) => { const e = new EmbedBuilder().setColor(COLOR).setFooter({ text: "File Cloud" }); if (title) e.setTitle(title); if (desc) e.setDescription(String(desc).slice(0, 4000)); return e; };
  const reply = (i, p) => (i.deferred || i.replied) ? i.editReply(p) : i.reply({ ...p, flags: EPH });
  const say = (i, text) => reply(i, { content: String(text).slice(0, 1900) });
  const defer = i => i.deferReply({ flags: EPH });
  const bar = pct => { const n = Math.max(0, Math.min(10, Math.round(pct / 10))); return "▰".repeat(n) + "▱".repeat(10 - n) + ` ${Math.round(pct)}%`; };
  const adminLine = u => `**${md(u.username)}** *(admin, por Discord)*`;

  // ---------- definición de comandos ----------
  const C = [];
  const cmd = (name, desc) => new SlashCommandBuilder().setName(name).setDescription(desc);
  const add = (b, fn, need) => C.push({ b, fn, need });
  const adminCmd = (name, desc) => cmd(name, "(Admin) " + desc).setDMPermission(false);

  // ===== Para todos =====
  add(cmd("ayuda", "Muestra lo que puede hacer el bot de File Cloud"), async (i, u) => {
    const e = emb("Bot de File Cloud", "Todas las respuestas son privadas: solo las ves tú.")
      .addFields({ name: "Para todos", value: [
        "**/vincular** · enlaza tu cuenta con usuario, contraseña y 2FA",
        "**/desvincular** · quita el enlace con tu cuenta",
        "**/cuenta** · tu espacio, 2FA, enlaces y uso de la IA",
        "**/archivos** · mira tu carpeta personal",
        "**/buscar** · busca archivos por nombre",
        "**/enlaces** · lista, crea o revoca tus enlaces para compartir",
        "**/ia** · pide algo al asistente de IA (si está activado)",
        "**/version** · versión instalada y si hay una nueva",
      ].join("\n") });
    if (u?.is_admin) e.addFields({ name: "Solo administradores", value: [
      "**/config** · canales de registros y de actualizaciones",
      "**/servidor** · CPU, memoria, disco y totales",
      "**/usuarios** · lista de cuentas  ·  **/usuario** · detalle de una cuenta",
      "**/suspender**  ·  **/reactivar** · bloquea o devuelve el acceso",
      "**/anuncio** · mensaje para todos en el panel  ·  **/registro** · abre o cierra el registro",
      "**/actualizar** · comprueba y anuncia una versión nueva",
    ].join("\n") });
    await reply(i, { embeds: [e] });
  }, "maybe");

  // Vincular: un formulario privado (solo lo ve quien lo usa) con usuario, contraseña y, si la cuenta lo tiene, el 2FA.
  add(cmd("vincular", "Vincula tu cuenta de File Cloud con tu Discord (usuario, contraseña y 2FA)"), async i => {
    const cur = store.userByDiscord(i.user.id);
    if (cur) return say(i, `Ya tienes vinculada la cuenta **${md(cur.username)}**. Si quieres cambiarla, usa **/desvincular** primero.`);
    const field = (id, label, ph, required, max) => new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setPlaceholder(ph).setRequired(required).setMaxLength(max));
    await i.showModal(new ModalBuilder().setCustomId("fc-link").setTitle("Vincular cuenta de File Cloud").addComponents(
      field("u", "Nombre de usuario", "Tu usuario de File Cloud", true, 32),
      field("p", "Contraseña", "Solo se comprueba, no se guarda", true, 128),
      field("c", "Código 2FA (solo si lo tienes activado)", "6 dígitos de tu app o un código de recuperación", false, 14)));
  });

  async function submitLink(i) {
    const u = i.fields.getTextInputValue("u").trim(), pw = i.fields.getTextInputValue("p"), c = (i.fields.getTextInputValue("c") || "").trim();
    const kd = "dc|" + i.user.id, ku = "dcu|" + u.toLowerCase().slice(0, 64); // bloqueo por persona de Discord y por cuenta objetivo
    if (locked(kd) || locked(ku)) return say(i, "Demasiados intentos fallidos. Prueba de nuevo en 15 minutos.");
    const fail = msg => { addFail(kd); addFail(ku); return say(i, msg); };
    const row = u ? get("SELECT * FROM users WHERE username=?", u) : null;
    if (!row || !verify(pw, row.password_hash)) return fail("Usuario o contraseña incorrectos.");
    if (row.suspended) return say(i, "Esa cuenta está suspendida. Contacta con un administrador.");
    if (row.totp_on) {
      if (!c) return say(i, "Esta cuenta tiene la verificación en dos pasos activada. Usa **/vincular** otra vez y escribe también el código de 6 dígitos de tu app (o un código de recuperación).");
      const rc = tf.findCode(c);
      if (!(tf.checkTotp(row, c) || (rc && rc.user_id === row.id && (tf.useCode(c), true)))) return fail("El código de verificación no es correcto.");
    }
    const mine = store.userByDiscord(i.user.id);
    if (mine) return say(i, `Ya tienes vinculada la cuenta **${md(mine.username)}**. Usa **/desvincular** primero.`);
    if (store.linkOf(row.id)) return say(i, "Esa cuenta ya está vinculada a otro usuario de Discord. Desvincúlala desde la web (Mi perfil → Discord) o con **/desvincular** desde la cuenta de Discord que la tiene.");
    store.link(row.id, i.user.id, i.user.globalName || i.user.username);
    fails.delete(kd); fails.delete(ku);
    logger.log("cuentas", `**${md(row.username)}** vinculó su cuenta con Discord (${md(i.user.username)})`);
    await reply(i, { embeds: [emb("Cuenta vinculada", `Ahora eres **${md(row.username)}** en File Cloud. Tu contraseña no se ha guardado.\nPrueba **/cuenta** o **/ayuda**. En la web verás el estado en *Mi perfil → Discord*.`)] });
  }

  add(cmd("desvincular", "Quita el enlace entre tu Discord y tu cuenta de File Cloud"), async i => {
    const u = store.userByDiscord(i.user.id);
    if (!u) return say(i, "No tienes ninguna cuenta vinculada.");
    store.unlink(u.id);
    logger.log("cuentas", `**${md(u.username)}** desvinculó su cuenta de Discord`);
    await say(i, `Listo: tu Discord ya no está vinculado a **${md(u.username)}**.`);
  });

  add(cmd("cuenta", "Tu cuenta: espacio, 2FA, enlaces y uso de la IA"), async (i, u) => {
    const used = await usage(u), lim = limitB(u), pct = Number.isFinite(lim) ? used / lim * 100 : 0;
    const e = emb("Tu cuenta de File Cloud").addFields(
      { name: "Usuario", value: `${md(u.username)}${u.is_admin ? " · administrador" : ""}`, inline: true },
      { name: "Verificación en dos pasos", value: u.totp_on ? "Activada" : "Desactivada", inline: true },
      { name: "Espacio", value: `${fmt(used)} de ${Number.isFinite(lim) ? fmt(lim) : "sin límite"}${Number.isFinite(lim) ? "\n" + bar(pct) : ""}` },
      { name: "Enlaces activos", value: String(get("SELECT COUNT(*) n FROM shares WHERE user_id=? AND (expires_at IS NULL OR expires_at>?)", u.id, now()).n), inline: true },
      { name: "Carpetas que compartes", value: String(get("SELECT COUNT(DISTINCT path) n FROM collabs WHERE owner_id=?", u.id).n), inline: true },
      { name: "Compartidas contigo", value: String(get("SELECT COUNT(*) n FROM collabs WHERE user_id=?", u.id).n), inline: true },
      { name: "Último acceso web", value: u.last_login ? `<t:${unix(u.last_login)}:R>` : "—", inline: true });
    if (ai.enabled()) { const s = ai.status(u); e.addFields({ name: "Asistente de IA", value: s.limit < 0 ? "Sin límite de uso" : s.limit === 0 ? "Desactivado para tu cuenta" : `${s.used} de ${s.limit} usos por ${s.period === "day" ? "día" : "hora"}`, inline: true }); }
    e.addFields({ name: "ID permanente", value: code(u.uuid) });
    await reply(i, { embeds: [e] });
  }, "user");

  add(cmd("archivos", "Mira los archivos de tu carpeta personal").addStringOption(o => o.setName("ruta").setDescription("Carpeta que quieres ver (vacío = inicio), por ejemplo: fotos/2024").setMaxLength(300)), async (i, u) => {
    const root = base(u), rel = (i.options.getString("ruta") || "").trim(), dir = safe(root, rel);
    if (!rel) await fsp.mkdir(root, { recursive: true });
    const es = await fsp.readdir(dir, { withFileTypes: true }).catch(() => { throw Error("No existe esa carpeta"); });
    es.sort((a, b) => b.isDirectory() - a.isDirectory() || a.name.localeCompare(b.name));
    const dirs = es.filter(e => e.isDirectory()).length, shown = es.slice(0, 25), lines = [];
    for (const e of shown) {
      if (e.isDirectory()) { lines.push(`**${md(e.name)}**/`); continue; }
      const s = await fsp.stat(path.join(dir, e.name)).catch(() => null);
      lines.push(`${md(e.name)}${s ? " — " + fmt(s.size) : ""}`);
    }
    await reply(i, { embeds: [emb(`Carpeta ${P(rel)}`, lines.join("\n") || "*Está vacía.*").setFooter({ text: `File Cloud · ${dirs} carpeta(s) y ${es.length - dirs} archivo(s)${es.length > shown.length ? ` · mostrando ${shown.length}` : ""}` })] });
  }, "user");

  add(cmd("buscar", "Busca archivos y carpetas por nombre").addStringOption(o => o.setName("texto").setDescription("Parte del nombre que buscas").setRequired(true).setMinLength(2).setMaxLength(100)), async (i, u) => {
    const q = i.options.getString("texto").trim().toLowerCase(), root = base(u), out = []; let seen = 0;
    if (q.length < 2) throw Error("Escribe al menos 2 letras");
    await defer(i);
    const walk = async (dir, depth) => {
      if (out.length >= 25 || seen > 20000 || depth > 12) return;
      let es; try { es = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of es) {
        if (out.length >= 25 || ++seen > 20000) return;
        const full = path.join(dir, e.name);
        if (e.name.toLowerCase().includes(q)) out.push({ rel: path.relative(root, full).split(path.sep).join("/"), dir: e.isDirectory() });
        if (e.isDirectory()) await walk(full, depth + 1);
      }
    };
    await walk(root, 0);
    await reply(i, { embeds: [emb(`Resultados para «${q.slice(0, 60)}»`, out.length ? out.map(r => `${r.dir ? "**" + md(P(r.rel)) + "**/" : md(P(r.rel))}`).join("\n") : "*No hay coincidencias.*").setFooter({ text: out.length >= 25 ? "File Cloud · mostrando los primeros 25" : "File Cloud" })] });
  }, "user");

  add(cmd("enlaces", "Mira, crea o revoca tus enlaces para compartir")
    .addSubcommand(s => s.setName("listar").setDescription("Tus enlaces activos"))
    .addSubcommand(s => s.setName("crear").setDescription("Crea un enlace para compartir un archivo o una carpeta")
      .addStringOption(o => o.setName("ruta").setDescription("Archivo o carpeta, por ejemplo: fotos/viaje.zip").setRequired(true).setMaxLength(300))
      .addIntegerOption(o => o.setName("dias").setDescription("Días hasta que caduque (vacío = no caduca)").setMinValue(1).setMaxValue(3650)))
    .addSubcommand(s => s.setName("revocar").setDescription("Elimina un enlace").addStringOption(o => o.setName("id").setDescription("El código que aparece en /enlaces listar").setRequired(true).setMinLength(4).setMaxLength(20))), async (i, u) => {
    const sub = i.options.getSubcommand();
    if (sub === "listar") {
      const rows = all("SELECT * FROM shares WHERE user_id=? AND (expires_at IS NULL OR expires_at>?) ORDER BY created_at DESC LIMIT 15", u.id, now());
      const total = get("SELECT COUNT(*) n FROM shares WHERE user_id=? AND (expires_at IS NULL OR expires_at>?)", u.id, now()).n;
      const lines = rows.map(s => `**${s.token.slice(0, 8)}** · ${code(P(s.path))} · ${s.expires_at ? `caduca <t:${unix(s.expires_at)}:R>` : "no caduca"}${s.pw ? " · con contraseña" : ""}${publicUrl() ? "\n" + shareUrl(s.token) : ""}`);
      return reply(i, { embeds: [emb("Tus enlaces", lines.join("\n") || "*No tienes enlaces activos.*").setFooter({ text: `File Cloud · ${total} activo(s)${total > rows.length ? ` · mostrando ${rows.length}` : ""} · revoca con /enlaces revocar` })] });
    }
    if (sub === "crear") {
      if (!store.actionsOn()) throw Error("Un administrador ha desactivado las acciones sobre archivos desde Discord");
      const rel = (i.options.getString("ruta") || "").trim(), f = safe(base(u), rel);
      if (f === base(u)) throw Error("Indica un archivo o una carpeta dentro de tu espacio");
      const s = await fsp.stat(f).catch(() => { throw Error("No existe ese archivo o carpeta"); });
      const token = crypto.randomBytes(12).toString("base64url"), days = i.options.getInteger("dias") || 0;
      run("INSERT INTO shares VALUES(?,?,?,?,?,?,?)", token, u.id, path.relative(base(u), f), s.isDirectory() ? 1 : 0, days > 0 ? now() + days * 864e5 : null, now(), null);
      logger.log("enlaces", `**${md(u.username)}** creó un enlace para compartir ${code(P(rel))} *(desde Discord)*`);
      return say(i, `Enlace creado para ${code(P(rel))}${days ? ` (caduca en ${days} día${days === 1 ? "" : "s"})` : ""}:\n${shareUrl(token)}${publicUrl() ? "" : "\n*Añade la dirección pública de tu servidor (variable PUBLIC_URL del .env) para recibir el enlace completo.*"}`);
    }
    const id = i.options.getString("id").trim(), rows = all("SELECT token,path FROM shares WHERE user_id=? AND substr(token,1,?)=?", u.id, id.length, id);
    if (!rows.length) throw Error("No encuentro ningún enlace tuyo con ese código");
    if (rows.length > 1) throw Error("Ese código coincide con varios enlaces: escribe más caracteres");
    run("DELETE FROM shares WHERE token=?", rows[0].token);
    logger.log("enlaces", `**${md(u.username)}** revocó el enlace de ${code(P(rows[0].path))} *(desde Discord)*`);
    await say(i, `Enlace revocado: ${code(P(rows[0].path))}.`);
  }, "user");

  add(cmd("ia", "Pídele algo al asistente de IA sobre tus archivos").addStringOption(o => o.setName("pregunta").setDescription("Qué quieres que haga o responda").setRequired(true).setMaxLength(2000)), async (i, u) => {
    if (!ai.enabled()) throw Error("La IA no está activada en este servidor");
    if (!store.actionsOn()) throw Error("Un administrador ha desactivado las acciones sobre archivos desde Discord");
    await defer(i);
    let r;
    try { r = await ai.chat(u, [{ role: "user", content: i.options.getString("pregunta") }]); }
    catch (e) { throw Error(e.message); } // los errores de la IA ya vienen redactados para el usuario
    const acts = (r.actions || []).slice(0, 10).map(a => `${a.ok ? "•" : "✗"} ${md(a.text)}`).join("\n");
    const e = emb(null, String(r.reply || "Hecho.").slice(0, 3500));
    if (acts) e.addFields({ name: "Acciones realizadas", value: acts.slice(0, 1000) });
    const s = r.usage; if (s) e.setFooter({ text: `File Cloud · IA${s.limit >= 0 ? ` · ${s.used}/${s.limit} usos por ${s.period === "day" ? "día" : "hora"}` : ""}` });
    await reply(i, { embeds: [e] });
  }, "user");

  add(cmd("version", "Versión instalada de File Cloud y si hay una nueva"), async i => {
    const v = ver.info();
    await reply(i, { embeds: [emb("File Cloud", v.url).addFields(
      { name: "Instalada", value: v.current, inline: true },
      { name: "Última publicada", value: v.latest || "sin comprobar", inline: true },
      { name: "Estado", value: v.available ? "Hay una versión nueva" : "Todo al día", inline: true },
      { name: "Servidor activo desde hace", value: `${Math.floor(process.uptime() / 3600)} h ${Math.floor(process.uptime() / 60) % 60} min`, inline: true })] });
  });

  // ===== Solo administradores =====
  const chOpt = o => o.setName("canal").setDescription("Canal de texto").setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
  add(adminCmd("config", "Canales y opciones del bot")
    .addSubcommand(s => s.setName("ver").setDescription("Muestra la configuración actual"))
    .addSubcommand(s => s.setName("registros").setDescription("Canal donde se publica lo que hace cada usuario").addChannelOption(chOpt))
    .addSubcommand(s => s.setName("actualizaciones").setDescription("Canal donde se avisa de las versiones nuevas").addChannelOption(chOpt))
    .addSubcommand(s => s.setName("quitar").setDescription("Deja de usar uno de los canales").addStringOption(o => o.setName("cual").setDescription("Qué canal quitar").setRequired(true).addChoices({ name: "Registros", value: "log" }, { name: "Actualizaciones", value: "update" }))), async (i, u) => {
    const sub = i.options.getSubcommand();
    if (sub === "ver") {
      const ch = w => store.channel(w) ? `<#${store.channel(w)}>` : "No configurado";
      return reply(i, { embeds: [emb("Configuración del bot").addFields(
        { name: "Canal de registros", value: ch("log"), inline: true },
        { name: "Canal de actualizaciones", value: ch("update"), inline: true },
        { name: "Cuentas vinculadas", value: String(store.countLinks()), inline: true },
        { name: "Se registra", value: Object.entries(store.EVENTS).map(([k, l]) => `${store.eventOn(k) ? "✓" : "✗"} ${l}`).join("\n") },
        { name: "Acciones sobre archivos desde Discord (enlaces e IA)", value: store.actionsOn() ? "Permitidas" : "Desactivadas" })
        .setFooter({ text: "File Cloud · los eventos y las acciones se cambian en la web: Admin → Discord" })] });
    }
    if (sub === "quitar") {
      const w = i.options.getString("cual"); store.setChannel(w, null);
      logger.log("admin", `${adminLine(u)} quitó el canal de ${w === "log" ? "registros" : "actualizaciones"}`);
      return say(i, `Listo: ya no se usa el canal de ${w === "log" ? "registros" : "actualizaciones"}.`);
    }
    const ch = i.options.getChannel("canal"), w = sub === "registros" ? "log" : "update";
    try { await logger.sendTo(ch.id, { embeds: [{ color: 0x2ecc71, title: w === "log" ? "Canal de registros configurado" : "Canal de actualizaciones configurado", description: `Configurado por ${md(u.username)}. ${w === "log" ? "Aquí se publicará lo que haga cada usuario." : "Aquí se avisará cuando haya una versión nueva."}`, footer: { text: "File Cloud" } }] }); }
    catch (e) { throw Error(`No puedo escribir en ${ch}. Dale al bot permiso para ver el canal, enviar mensajes e insertar enlaces. (${e.message})`); }
    store.setChannel(w, ch.id);
    if (w === "update") updates.announce().catch(() => { });
    logger.log("admin", `${adminLine(u)} configuró el canal de ${w === "log" ? "registros" : "actualizaciones"}`);
    await say(i, `Canal de ${w === "log" ? "registros" : "actualizaciones"}: ${ch}.`);
  }, "admin");

  add(adminCmd("servidor", "Estado del servidor: CPU, memoria, disco y totales"), async i => {
    await defer(i);
    const [l, m, d] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize()]), dk = d[0] || {};
    await reply(i, { embeds: [emb("Servidor de File Cloud").addFields(
      { name: "CPU", value: bar(l.currentLoad), inline: true },
      { name: "Memoria", value: `${fmt(m.total - m.available)} de ${fmt(m.total)}\n${bar((m.total - m.available) / m.total * 100)}`, inline: true },
      { name: "Disco", value: dk.size ? `${fmt(dk.used)} de ${fmt(dk.size)}\n${bar(dk.used / dk.size * 100)}` : "—", inline: true },
      { name: "Usuarios", value: String(get("SELECT COUNT(*) n FROM users").n), inline: true },
      { name: "Almacenado", value: fmt(get("SELECT COALESCE(SUM(used_bytes),0) n FROM users").n), inline: true },
      { name: "Enlaces / sesiones", value: `${get("SELECT COUNT(*) n FROM shares").n} / ${get("SELECT COUNT(*) n FROM sessions WHERE expires_at>?", now()).n}`, inline: true },
      { name: "Versión", value: ver.info().current, inline: true },
      { name: "Sistema encendido hace", value: `${Math.floor(os.uptime() / 3600)} h`, inline: true })] });
  }, "admin");

  add(adminCmd("usuarios", "Lista las cuentas del servidor").addStringOption(o => o.setName("buscar").setDescription("Parte del nombre (vacío = todas)").setMaxLength(32)), async i => {
    const q = (i.options.getString("buscar") || "").trim().toLowerCase();
    const us = all("SELECT username,is_admin,suspended,max_space_mb,used_bytes FROM users ORDER BY username").filter(u => !q || u.username.toLowerCase().includes(q));
    const lines = us.slice(0, 25).map(u => `**${md(u.username)}** · ${u.is_admin ? "admin" : "usuario"}${u.suspended ? " · suspendido" : ""} · ${fmt(u.used_bytes)}${u.max_space_mb < 0 ? "" : " de " + fmt(u.max_space_mb * 1048576)}`);
    await reply(i, { embeds: [emb(`Cuentas (${us.length})`, lines.join("\n") || "*No hay coincidencias.*").setFooter({ text: us.length > 25 ? "File Cloud · mostrando 25; afina con «buscar»" : "File Cloud" })] });
  }, "admin");

  const target = i => {
    const t = get("SELECT * FROM users WHERE username=?", String(i.options.getString("usuario") || "").trim());
    if (!t) throw Error("No existe ese usuario");
    return t;
  };
  const userOpt = o => o.setName("usuario").setDescription("Nombre de usuario exacto").setRequired(true).setMaxLength(32);

  add(adminCmd("usuario", "Detalle de una cuenta").addStringOption(userOpt), async i => {
    const t = target(i), dl = store.linkOf(t.id);
    await reply(i, { embeds: [emb(md(t.username)).addFields(
      { name: "Rol", value: t.is_admin ? "Administrador" : "Usuario", inline: true },
      { name: "Estado", value: t.suspended ? "Suspendida" : "Activa", inline: true },
      { name: "2FA", value: t.totp_on ? "Activado" : "Desactivado", inline: true },
      { name: "Espacio", value: `${fmt(t.used_bytes)} de ${t.max_space_mb < 0 ? "sin límite" : fmt(t.max_space_mb * 1048576)}`, inline: true },
      { name: "Enlaces activos", value: String(get("SELECT COUNT(*) n FROM shares WHERE user_id=?", t.id).n), inline: true },
      { name: "Discord", value: dl ? md(dl.discord_name || "vinculado") : "Sin vincular", inline: true },
      { name: "Último acceso", value: t.last_login ? `<t:${unix(t.last_login)}:R>${t.last_ip ? " · " + code(t.last_ip) : ""}` : "Nunca", inline: true },
      { name: "Creada", value: t.created_at ? `<t:${unix(t.created_at)}:D>` : "—", inline: true },
      { name: "ID permanente", value: code(t.uuid) })] });
  }, "admin");

  function setSusp(on) {
    return async (i, u) => {
      const t = target(i);
      if (t.id === u.id) throw Error("No puedes suspenderte a ti mismo");
      if (on === !!t.suspended) throw Error(on ? "Esa cuenta ya estaba suspendida" : "Esa cuenta no estaba suspendida");
      run("UPDATE users SET suspended=? WHERE id=?", on ? 1 : 0, t.id);
      if (on) run("DELETE FROM sessions WHERE user_id=?", t.id);
      logger.log("admin", `${adminLine(u)} ${on ? "suspendió" : "reactivó"} la cuenta de **${md(t.username)}**`);
      await say(i, `Cuenta de **${md(t.username)}** ${on ? "suspendida (sus sesiones se cerraron)" : "reactivada"}.`);
    };
  }
  add(adminCmd("suspender", "Bloquea el acceso de una cuenta y cierra sus sesiones").addStringOption(userOpt), setSusp(true), "admin");
  add(adminCmd("reactivar", "Devuelve el acceso a una cuenta suspendida").addStringOption(userOpt), setSusp(false), "admin");

  add(adminCmd("anuncio", "Pone o quita el mensaje que ven todos en el panel").addStringOption(o => o.setName("texto").setDescription("El mensaje (vacío = quitarlo)").setMaxLength(300)), async (i, u) => {
    const t = (i.options.getString("texto") || "").trim();
    store.setS("announcement", t);
    logger.log("admin", `${adminLine(u)} ${t ? "publicó un anuncio" : "quitó el anuncio"}`);
    await say(i, t ? "Anuncio publicado en el panel de todos los usuarios." : "Anuncio quitado.");
  }, "admin");

  add(adminCmd("registro", "Abre o cierra el registro público de cuentas").addBooleanOption(o => o.setName("activo").setDescription("¿Permitir que cualquiera cree una cuenta?").setRequired(true)), async (i, u) => {
    const on = i.options.getBoolean("activo");
    store.setS("allow_registration", on ? "1" : "0");
    logger.log("admin", `${adminLine(u)} ${on ? "abrió" : "cerró"} el registro público`);
    await say(i, `Registro público ${on ? "activado" : "desactivado"}.`);
  }, "admin");

  add(adminCmd("actualizar", "Comprueba ahora si hay una versión nueva y la anuncia"), async i => {
    await defer(i);
    await ver.checkVersion();
    const v = ver.info();
    if (!v.available) return say(i, `Todo al día: versión **${v.current}**${v.latest ? ` (la última publicada es la **${v.latest}**)` : " (no se pudo consultar GitHub)"}.`);
    let sent = false;
    if (store.channel("update")) sent = await updates.announce(true).catch(() => false);
    await say(i, `Hay una versión nueva: **${v.latest}** (tienes la **${v.current}**). ${sent ? "Ya lo anuncié en el canal de actualizaciones." : store.channel("update") ? "No pude escribir en el canal de actualizaciones." : "Configura un canal con **/config actualizaciones** para recibir el aviso."}`);
  }, "admin");

  // ---------- ejecución ----------
  const byName = new Map(C.map(c => [c.b.name, c]));
  const last = new Map();
  const cooldown = id => { const t = Date.now(), p = last.get(id) || 0; if (t - p < 1500) return true; last.set(id, t); if (last.size > 2000) for (const [k, v] of last) if (t - v > 6e4) last.delete(k); return false; };

  async function runCommand(i) {
    const c = byName.get(i.commandName); if (!c) return;
    if (cooldown(i.user.id)) return say(i, "Más despacio: espera un par de segundos.");
    let user = store.userByDiscord(i.user.id);
    try {
      if (c.need === "user" || c.need === "admin") {
        if (!user) return say(i, "Primero vincula tu cuenta con **/vincular**.");
        if (user.suspended) return say(i, "Tu cuenta de File Cloud está suspendida.");
        if (c.need === "admin" && !user.is_admin) return say(i, "Este comando es solo para administradores de File Cloud.");
      }
      if (user?.suspended) user = null;
      await c.fn(i, user);
    } catch (e) {
      console.error(`[Discord] /${i.commandName}:`, e.message);
      await Promise.resolve().then(() => say(i, "No se pudo completar: " + GENERIC(e))).catch(() => { });
    }
  }

  return { json: C.map(c => c.b.toJSON()), run: runCommand, submitLink };
};
