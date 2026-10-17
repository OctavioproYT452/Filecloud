// Funciones de FCScript. Cada una: F(categoría, nombre, argumentos, descripción, función, opciones)
//   opciones: min/max (nº de argumentos), lazy (recibe los argumentos sin evaluar), q (no deja salto de línea en la salida)
const { get, all, run } = require("../../db");
const { usage } = require("../../lib/storage");
const { limitB } = require("../../lib/paths");
const ver = require("../../version");
const R = require("./runtime");

const FN = {}, LIST = [], QUIET = new Set();
const F = (c, n, a, d, fn, o = {}) => { FN[n.toLowerCase()] = { n, a, d, c, fn, ...o }; LIST.push({ n, a, d, c, min: o.min || 0, q: !!o.q }); if (o.q) QUIET.add(n.toLowerCase()); };
const S = (v, d = "") => (v === undefined || v === "" ? d : String(v));
const N = (v, d = 0) => { const x = R.num(v); return isNaN(x) ? d : x; };
const id = v => String(v || "").replace(/\D/g, "");
const fmtB = n => n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : n < 1073741824 ? (n / 1048576).toFixed(1) + " MB" : (n / 1073741824).toFixed(2) + " GB";
const say = (ctx, text) => { if (ctx.dry) ctx.sim.push(text); };

// ---- ayudantes ----
async function who(ctx, v) {
  const uid = id(v) || ctx.user.id;
  if (uid === ctx.user.id) return { id: uid, user: ctx.user, member: ctx.member };
  if (ctx.dry) return { id: uid, user: { id: uid, username: "usuario" + uid.slice(-4), displayAvatarURL: () => "" }, member: null };
  const member = ctx.guild ? await ctx.guild.members.fetch(uid).catch(() => null) : null;
  const user = member?.user || await ctx.client.users.fetch(uid).catch(() => null);
  if (!user) throw Error("No encuentro a ese usuario");
  return { id: uid, user, member };
}
const perm = (ctx, p) => ctx.dry || !!ctx.member?.permissions?.has?.(String(p).trim());
function need(ctx, p) { if (!perm(ctx, p)) throw Error(`quien usa el comando necesita el permiso de Discord «${p}»`); }
const act = async (ctx, desc, fn) => { if (ctx.dry) { ctx.sim.push(desc); return; } await fn(); };
const sameGuild = ctx => { if (!ctx.guild) throw Error("solo funciona dentro de un servidor"); return ctx.guild; };

// Variables guardadas (en la base de datos, con límites)
const SC = { user: "user", server: "guild", global: "global" };
const vkey = (ctx, sc, who2) => sc === "user" ? (id(who2) || ctx.user.id) : sc === "guild" ? (ctx.guild?.id || "dm") : "g";
function vget(ctx, sc, key, name) {
  const k = `${sc}|${key}|${name}`; if (ctx.dry && ctx.dryVars?.has(k)) return ctx.dryVars.get(k);
  return get("SELECT value FROM discord_vars WHERE scope=? AND key=? AND name=?", sc, key, name)?.value;
}
function vset(ctx, sc, key, name, value) {
  value = String(value).slice(0, 1000); if (!/^[\w.-]{1,40}$/.test(name)) throw Error("el nombre de la variable solo puede tener letras, números, _ . - (máx. 40)");
  if (ctx.dry) { (ctx.dryVars ||= new Map()).set(`${sc}|${key}|${name}`, value); ctx.sim.push(`guardaría la variable ${sc}:${name} = ${value.slice(0, 40)}`); return; }
  if (get("SELECT 1 x FROM discord_vars WHERE scope=? AND key=? AND name=?", sc, key, name) === undefined && get("SELECT COUNT(*) n FROM discord_vars").n >= 20000) throw Error("se alcanzó el máximo de variables guardadas (20 000)");
  run("INSERT OR REPLACE INTO discord_vars(scope,key,name,value) VALUES(?,?,?,?)", sc, key, name, value);
}

// ---- calculadora segura (sin eval) ----
function calc(src) {
  const t = src.replace(/\s+/g, "").replace(/,/g, "."); let p = 0;
  const peek = () => t[p], eat = c => t[p] === c ? (p++, true) : false;
  const prim = () => { if (eat("(")) { const v = add(); if (!eat(")")) throw Error("falta «)»"); return v; } if (eat("-")) return -pow(); if (eat("+")) return pow(); const m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(t.slice(p)); if (!m) throw Error("expresión no válida cerca de «" + t.slice(p, p + 6) + "»"); p += m[0].length; return Number(m[0]); };
  const pow = () => { const b = prim(); return eat("^") ? Math.pow(b, pow()) : b; };
  const mul = () => { let v = pow(); for (;;) { if (eat("*")) v *= pow(); else if (eat("/")) { const d = pow(); if (d === 0) throw Error("división entre cero"); v /= d; } else if (eat("%")) { const d = pow(); if (d === 0) throw Error("división entre cero"); v %= d; } else return v; } };
  const add = () => { let v = mul(); for (;;) { if (eat("+")) v += mul(); else if (eat("-")) v -= mul(); else return v; } };
  if (t.length > 200) throw Error("expresión demasiado larga");
  const v = add(); if (p < t.length) throw Error("expresión no válida cerca de «" + peek() + "»");
  return Number.isFinite(v) ? Math.round(v * 1e10) / 1e10 : (() => { throw Error("resultado no válido"); })();
}
const human = s => { s = Math.max(0, Math.floor(s)); const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return [d && d + " d", h && h + " h", m && m + " min", (x || !(d || h || m)) && x + " s"].filter(Boolean).join(" "); };
const pad = (n, l = 2) => String(n).padStart(l, "0");
function dateFmt(f, d) { return f.replace(/YYYY|MM|DD|HH|mm|ss/g, t => ({ YYYY: d.getFullYear(), MM: pad(d.getMonth() + 1), DD: pad(d.getDate()), HH: pad(d.getHours()), mm: pad(d.getMinutes()), ss: pad(d.getSeconds()) })[t]); }
const cool = new Map();

// =================== Quién y dónde ===================
const C1 = "Contexto";
F(C1, "message", "[n]", "Todo lo que escribió quien usó el comando después del nombre; con un número, solo esa palabra.", (c, a) => a[0] ? (c.argv.join(" ").split(/\s+/).filter(Boolean)[N(a[0]) - 1] ?? "") : c.argv.join(" "));
F(C1, "argCount", "", "Cuántas palabras escribió después del comando.", c => c.argv.join(" ").split(/\s+/).filter(Boolean).length);
F(C1, "option", "nombre", "Valor de una opción de un comando slash.", (c, a) => c.opts?.get(S(a[0]).toLowerCase()) ?? "", { min: 1 });
F(C1, "mentioned", "[n]", "ID del usuario mencionado (n.º 1 por defecto) o de la opción de tipo usuario.", (c, a) => c.mentions?.[N(a[0], 1) - 1] ?? "");
F(C1, "commandName", "", "Nombre del comando que se ejecuta.", c => c.cmd.name);
F(C1, "prefix", "", "Prefijo de los comandos de mensaje.", c => c.prefix || "!");
F(C1, "userId", "", "ID de Discord de quien usa el comando.", c => c.user.id);
F(C1, "username", "[id]", "Nombre de usuario (el tuyo o el del ID indicado).", async (c, a) => (await who(c, a[0])).user.username);
F(C1, "nickname", "[id]", "Apodo en el servidor (o el nombre si no tiene).", async (c, a) => { const w = await who(c, a[0]); return w.member?.displayName || w.user.globalName || w.user.username; });
F(C1, "mention", "[id]", "Menciona a un usuario (por defecto a quien usa el comando).", (c, a) => `<@${id(a[0]) || c.user.id}>`);
F(C1, "avatar", "[id]", "Enlace de la foto de perfil.", async (c, a) => (await who(c, a[0])).user.displayAvatarURL({ size: 512 }));
F(C1, "isBot", "[id]", "true si el usuario es un bot.", async (c, a) => !!(await who(c, a[0])).user.bot);
F(C1, "serverName", "", "Nombre del servidor de Discord.", c => c.guild?.name ?? "Mensaje directo");
F(C1, "serverId", "", "ID del servidor.", c => c.guild?.id ?? "");
F(C1, "memberCount", "", "Número de miembros del servidor.", c => c.guild?.memberCount ?? 0);
F(C1, "channelId", "", "ID del canal donde se usó.", c => c.channel?.id ?? "");
F(C1, "channelName", "", "Nombre del canal donde se usó.", c => c.channel?.name ?? "");
F(C1, "roleName", "idRol", "Nombre de un rol del servidor.", (c, a) => c.dry ? "rol" : sameGuild(c).roles.cache.get(id(a[0]))?.name ?? "", { min: 1 });
F(C1, "hasRole", "idRol;[idUsuario]", "true si el usuario tiene ese rol.", async (c, a) => { const w = await who(c, a[1]); return !!w.member?.roles?.cache?.has?.(id(a[0])); }, { min: 1 });
F(C1, "hasPerm", "permiso;[idUsuario]", "true si tiene el permiso de Discord (ManageMessages, BanMembers, Administrator…).", async (c, a) => { const w = await who(c, a[1]); return c.dry ? true : !!w.member?.permissions?.has?.(S(a[0]).trim()); }, { min: 1 });
F(C1, "isFcAdmin", "", "true si quien lo usa tiene su cuenta de File Cloud vinculada y es administrador.", c => !!(c.fc && c.fc.is_admin));
F(C1, "isLinked", "", "true si quien lo usa tiene una cuenta de File Cloud vinculada.", c => !!c.fc);

// =================== Respuesta ===================
const C2 = "Respuesta";
const E = (n, a, d, k, tr = x => x) => F(C2, n, a, d, (c, v) => { c.out.embed[k] = tr(S(v[0])); return ""; }, { q: true, min: 1 });
E("title", "texto", "Título de la tarjeta (embed).", "title"); E("description", "texto", "Texto principal de la tarjeta.", "description");
E("footer", "texto", "Pie de la tarjeta.", "footer"); E("author", "texto", "Autor de la tarjeta.", "author");
E("image", "url", "Imagen grande de la tarjeta.", "image", x => /^https?:\/\//i.test(x) ? x : ""); E("thumbnail", "url", "Imagen pequeña de la tarjeta.", "thumbnail", x => /^https?:\/\//i.test(x) ? x : "");
E("color", "#rrggbb", "Color de la tarjeta, en hexadecimal.", "color", x => { const m = /^#?([0-9a-f]{6})$/i.exec(x.trim()); if (!m) throw Error("el color debe ser como #4f8cff"); return parseInt(m[1], 16); });
F(C2, "addField", "nombre;valor;[enLinea]", "Añade un campo a la tarjeta (máx. 25).", (c, a) => { if (c.out.fields.length < 25) c.out.fields.push({ name: S(a[0], "\u200b").slice(0, 256), value: S(a[1], "\u200b").slice(0, 1024), inline: R.truthy(S(a[2], "no")) }); return ""; }, { q: true, min: 2 });
F(C2, "timestamp", "", "Pone la hora actual en la tarjeta.", c => { c.out.embed.timestamp = new Date().toISOString(); return ""; }, { q: true });
F(C2, "ephemeral", "", "Solo quien usó el comando ve la respuesta (comandos slash).", c => { c.out.eph = true; return ""; }, { q: true });
F(C2, "deleteCommand", "", "Borra el mensaje que escribió el usuario (comandos de mensaje).", c => { c.out.del = true; return ""; }, { q: true });
F(C2, "addReaction", "emoji", "Reacciona al mensaje del usuario (comandos de mensaje).", async (c, a) => { if (c.kind === "slash" || c.kind === "test") return say(c, "reaccionaría con " + a[0]); await c.msg.react(S(a[0]).trim()).catch(() => { throw Error("emoji no válido"); }); }, { min: 1 });
F(C2, "sendMessage", "idCanal;texto", "Envía un mensaje a otro canal del mismo servidor.", async (c, a) => { const g = sameGuild(c); await act(c, `enviaría «${S(a[1]).slice(0, 40)}» al canal ${a[0]}`, async () => { const ch = await g.channels.fetch(id(a[0])).catch(() => null); if (!ch?.isTextBased?.()) throw Error("ese canal no existe o no es de texto"); await ch.send({ content: S(a[1]).slice(0, 2000), allowedMentions: { parse: [] } }); }); }, { min: 2 });
F(C2, "sendDM", "texto", "Envía un mensaje privado a quien usó el comando.", async (c, a) => act(c, `enviaría un privado: «${S(a[0]).slice(0, 40)}»`, async () => { await c.user.send({ content: S(a[0]).slice(0, 2000), allowedMentions: { parse: [] } }).catch(() => { throw Error("no se pudo enviar el privado (¿los tiene cerrados?)"); }); }), { min: 1 });

// =================== Lógica ===================
const C3 = "Lógica y control";
F(C3, "onlyIf", "condición;mensajeSiFalla", "Detiene el comando (y muestra el mensaje) si la condición no se cumple.", async (c, a) => { if (!(await R.cond(c, a[0] || []))) throw new R.Stop(a[1] ? await R.ev(c, a[1]) : ""); }, { lazy: true, min: 1, q: true });
F(C3, "onlyAdmin", "[mensaje]", "Solo para administradores de File Cloud (vinculados) o con permiso «Gestionar servidor».", (c, a) => { if (!(c.fc?.is_admin || perm(c, "ManageGuild"))) throw new R.Stop(S(a[0], "Solo los administradores pueden usar este comando.")); }, { q: true });
F(C3, "onlyPerms", "permisos;[mensaje]", "Solo quien tenga TODOS los permisos de Discord (separados por coma).", (c, a) => { for (const p of S(a[0]).split(",")) if (p.trim() && !perm(c, p)) throw new R.Stop(S(a[1], "No tienes permiso para usar este comando.")); }, { q: true, min: 1 });
F(C3, "onlyRoles", "idRoles;[mensaje]", "Solo quien tenga alguno de esos roles (IDs separados por coma).", (c, a) => { if (c.dry) return; const ok = S(a[0]).split(",").some(r => c.member?.roles?.cache?.has?.(id(r))); if (!ok) throw new R.Stop(S(a[1], "No tienes el rol necesario.")); }, { q: true, min: 1 });
F(C3, "onlyLinked", "[mensaje]", "Solo para quien haya vinculado su cuenta de File Cloud.", (c, a) => { if (!c.fc) throw new R.Stop(S(a[0], "Primero vincula tu cuenta con /vincular.")); }, { q: true });
F(C3, "cooldown", "segundos;[mensaje]", "Limita cada cuánto puede usarlo cada persona (máx. 1 día).", (c, a) => { if (c.dry) return; const k = c.cmd.id + "|" + c.user.id, t = Date.now(), s = Math.min(86400, N(a[0], 5)), nx = cool.get(k) || 0; if (t < nx) throw new R.Stop(S(a[1], `Espera ${human((nx - t) / 1000 + 0.99)} para usarlo otra vez.`)); cool.set(k, t + s * 1000); if (cool.size > 5000) for (const [x, v] of cool) if (v < t) cool.delete(x); }, { q: true, min: 1 });
F(C3, "stop", "[mensaje]", "Termina el comando aquí (con un mensaje opcional).", (c, a) => { throw new R.Stop(S(a[0])); }, { q: true });
F(C3, "break", "", "Sale del bucle actual.", () => { throw new R.Brk(); }, { q: true });
F(C3, "default", "texto;porDefecto", "Devuelve el texto, o el valor por defecto si está vacío.", (c, a) => S(a[0], S(a[1])), { min: 2 });
F(C3, "c", "texto", "Comentario: no hace nada.", () => "", { q: true });
F(C3, "set", "variable;valor", "Guarda un valor temporal (solo mientras se ejecuta el comando).", (c, a) => { c.vars.set(S(a[0]).trim(), S(a[1])); return ""; }, { q: true, min: 2 });
F(C3, "get", "variable;[porDefecto]", "Lee un valor temporal guardado con $set o un $for.", (c, a) => c.vars.get(S(a[0]).trim()) ?? S(a[1]), { min: 1 });

// =================== Variables guardadas ===================
const C4 = "Variables guardadas";
for (const [nm, sc, lab] of [["User", "user", "de cada usuario"], ["Server", "server", "de cada servidor"], ["Global", "global", "global"]]) {
  const idArg = sc === "user" ? ";[idUsuario]" : "";
  F(C4, `set${nm}Var`, `nombre;valor${idArg}`, `Guarda una variable ${lab} que se conserva siempre.`, (c, a) => { vset(c, SC[sc], vkey(c, SC[sc], a[2]), S(a[0]).trim(), S(a[1])); return ""; }, { q: true, min: 2 });
  F(C4, `get${nm}Var`, `nombre;[porDefecto]${idArg}`, `Lee una variable ${lab}.`, (c, a) => vget(c, SC[sc], vkey(c, SC[sc], a[2]), S(a[0]).trim()) ?? S(a[1]), { min: 1 });
  F(C4, `del${nm}Var`, `nombre${idArg}`, `Borra una variable ${lab}.`, (c, a) => { const k = vkey(c, SC[sc], a[1]); if (c.dry) c.sim.push(`borraría la variable ${a[0]}`); else run("DELETE FROM discord_vars WHERE scope=? AND key=? AND name=?", SC[sc], k, S(a[0]).trim()); return ""; }, { q: true, min: 1 });
}
F(C4, "topUserVar", "nombre;[cuántos];[plantilla]", "Ranking de la variable de usuario (de mayor a menor). Plantilla: {pos} {user} {value}.", (c, a) => all("SELECT key,value FROM discord_vars WHERE scope='user' AND name=? ORDER BY CAST(value AS REAL) DESC LIMIT ?", S(a[0]).trim(), Math.min(25, Math.max(1, N(a[1], 10)))).map((r, k) => S(a[2], "{pos}. {user} — {value}").replace(/\{pos\}/g, k + 1).replace(/\{user\}/g, `<@${r.key}>`).replace(/\{value\}/g, r.value)).join("\n"), { min: 1 });

// =================== Matemáticas ===================
const C5 = "Matemáticas";
F(C5, "calc", "operación", "Calcula: + - * / % ^ y paréntesis. Ej.: $calc[(2+3)*4].", (c, a) => calc(S(a[0])), { min: 1 });
F(C5, "random", "mínimo;máximo", "Número entero al azar entre dos valores.", (c, a) => { const lo = Math.ceil(N(a[0])), hi = Math.floor(N(a[1])); if (hi < lo) throw Error("el máximo debe ser mayor que el mínimo"); return lo + Math.floor(Math.random() * (hi - lo + 1)); }, { min: 2 });
F(C5, "round", "número;[decimales]", "Redondea.", (c, a) => { const m = 10 ** Math.min(10, N(a[1])); return Math.round(N(a[0]) * m) / m; }, { min: 1 });
F(C5, "floor", "número", "Redondea hacia abajo.", (c, a) => Math.floor(N(a[0])), { min: 1 });
F(C5, "ceil", "número", "Redondea hacia arriba.", (c, a) => Math.ceil(N(a[0])), { min: 1 });
F(C5, "abs", "número", "Valor absoluto.", (c, a) => Math.abs(N(a[0])), { min: 1 });
F(C5, "min", "a;b;…", "El menor de varios números.", (c, a) => Math.min(...a.map(x => N(x))), { min: 1 });
F(C5, "max", "a;b;…", "El mayor de varios números.", (c, a) => Math.max(...a.map(x => N(x))), { min: 1 });
F(C5, "sum", "a;b;…", "Suma varios números.", (c, a) => a.reduce((s, x) => s + N(x), 0), { min: 1 });
F(C5, "formatNumber", "número", "Pone separador de miles (1.234.567).", (c, a) => N(a[0]).toLocaleString("es-ES"), { min: 1 });

// =================== Texto ===================
const C6 = "Texto";
F(C6, "upper", "texto", "MAYÚSCULAS.", (c, a) => S(a[0]).toUpperCase(), { min: 1 });
F(C6, "lower", "texto", "minúsculas.", (c, a) => S(a[0]).toLowerCase(), { min: 1 });
F(C6, "capitalize", "texto", "Primera letra en mayúscula.", (c, a) => { const t = S(a[0]); return t.charAt(0).toUpperCase() + t.slice(1); }, { min: 1 });
F(C6, "length", "texto", "Número de caracteres.", (c, a) => S(a[0]).length, { min: 1 });
F(C6, "wordCount", "texto", "Número de palabras.", (c, a) => S(a[0]).split(/\s+/).filter(Boolean).length, { min: 1 });
F(C6, "trim", "texto", "Quita espacios al principio y al final.", (c, a) => S(a[0]).trim(), { min: 1 });
F(C6, "replace", "texto;buscar;reemplazo", "Reemplaza todas las apariciones.", (c, a) => S(a[0]).split(S(a[1])).join(S(a[2])), { min: 3 });
F(C6, "substring", "texto;desde;[hasta]", "Parte del texto (desde 0).", (c, a) => S(a[0]).slice(N(a[1]), a[2] === undefined || a[2] === "" ? undefined : N(a[2])), { min: 2 });
F(C6, "repeatText", "texto;veces", "Repite el texto (máx. 50 veces).", (c, a) => S(a[0]).repeat(Math.min(50, Math.max(0, N(a[1])))), { min: 2 });
F(C6, "reverse", "texto", "Invierte el texto.", (c, a) => [...S(a[0])].reverse().join(""), { min: 1 });
F(C6, "split", "texto;separador;n", "La parte n (desde 1) del texto separado.", (c, a) => S(a[0]).split(S(a[1])).at(N(a[2]) > 0 ? N(a[2]) - 1 : N(a[2])) ?? "", { min: 3 });
F(C6, "contains", "texto;buscar", "true si el texto contiene lo buscado (sin distinguir mayúsculas).", (c, a) => S(a[0]).toLowerCase().includes(S(a[1]).toLowerCase()), { min: 2 });
F(C6, "choose", "a;b;c;…", "Elige una opción al azar.", (c, a) => a[Math.floor(Math.random() * a.length)] ?? "", { min: 1 });
F(C6, "urlEncode", "texto", "Codifica el texto para usarlo en un enlace.", (c, a) => encodeURIComponent(S(a[0])), { min: 1 });
F(C6, "newline", "", "Salto de línea.", () => "\n");

// =================== Tiempo ===================
const C7 = "Tiempo";
F(C7, "unix", "", "Segundos desde 1970 (ahora).", () => Math.floor(Date.now() / 1000));
F(C7, "date", "[formato];[unix]", "Fecha y hora. Formato con YYYY MM DD HH mm ss (por defecto DD/MM/YYYY HH:mm).", (c, a) => dateFmt(S(a[0], "DD/MM/YYYY HH:mm"), a[1] ? new Date(N(a[1]) * 1000) : new Date()));
F(C7, "discordTime", "unix;[estilo]", "Hora que Discord muestra en la zona de cada persona (estilo: t T d D f F R).", (c, a) => `<t:${Math.floor(N(a[0]))}:${/^[tTdDfFR]$/.test(S(a[1])) ? a[1] : "f"}>`, { min: 1 });
F(C7, "duration", "segundos", "Convierte segundos en «1 d 2 h 3 min».", (c, a) => human(N(a[0])), { min: 1 });
F(C7, "uptime", "", "Tiempo que lleva encendido el servidor.", () => human(process.uptime()));

// =================== File Cloud ===================
const C8 = "File Cloud";
F(C8, "fcUser", "", "Usuario de File Cloud vinculado a quien lo usa (vacío si no hay).", c => c.fc?.username ?? "");
F(C8, "fcSpace", "", "Espacio usado (requiere cuenta vinculada).", async c => { if (!c.fc) throw Error("necesita la cuenta vinculada"); return fmtB(await usage(c.fc)); });
F(C8, "fcQuota", "", "Espacio total de la cuenta vinculada.", c => { if (!c.fc) throw Error("necesita la cuenta vinculada"); const l = limitB(c.fc); return Number.isFinite(l) ? fmtB(l) : "sin límite"; });
F(C8, "fcPercent", "", "Porcentaje de espacio usado.", async c => { if (!c.fc) throw Error("necesita la cuenta vinculada"); const l = limitB(c.fc); return Number.isFinite(l) ? Math.round(await usage(c.fc) / l * 100) : 0; });
F(C8, "fcUsers", "", "Número de cuentas del servidor de File Cloud.", () => get("SELECT COUNT(*) n FROM users").n);
F(C8, "fcVersion", "", "Versión instalada de File Cloud.", () => ver.info().current);

// =================== Moderación (el que usa el comando debe tener el permiso en Discord) ===================
const C9 = "Moderación";
F(C9, "giveRole", "idRol;[idUsuario]", "Da un rol (quien lo usa necesita «Gestionar roles»).", async (c, a) => { need(c, "ManageRoles"); const g = sameGuild(c), w = await who(c, a[1]); await act(c, `daría el rol ${a[0]} a ${w.user.username}`, async () => { const m = w.member || await g.members.fetch(w.id); await m.roles.add(id(a[0])); }); }, { q: true, min: 1 });
F(C9, "takeRole", "idRol;[idUsuario]", "Quita un rol (necesita «Gestionar roles»).", async (c, a) => { need(c, "ManageRoles"); const g = sameGuild(c), w = await who(c, a[1]); await act(c, `quitaría el rol ${a[0]} a ${w.user.username}`, async () => { const m = w.member || await g.members.fetch(w.id); await m.roles.remove(id(a[0])); }); }, { q: true, min: 1 });
F(C9, "kick", "idUsuario;[motivo]", "Expulsa a un miembro (necesita «Expulsar miembros»).", async (c, a) => { need(c, "KickMembers"); const g = sameGuild(c), w = await who(c, a[0]); await act(c, `expulsaría a ${w.user.username}`, async () => { await (w.member || await g.members.fetch(w.id)).kick(S(a[1]).slice(0, 200)); }); }, { q: true, min: 1 });
F(C9, "ban", "idUsuario;[motivo]", "Banea a un usuario (necesita «Banear miembros»).", async (c, a) => { need(c, "BanMembers"); const g = sameGuild(c), w = await who(c, a[0]); await act(c, `baneará a ${w.user.username}`, async () => { await g.members.ban(w.id, { reason: S(a[1]).slice(0, 200) }); }); }, { q: true, min: 1 });
F(C9, "timeout", "idUsuario;minutos;[motivo]", "Aísla a un miembro (necesita «Aislar miembros»). 0 = quitar.", async (c, a) => { need(c, "ModerateMembers"); const g = sameGuild(c), w = await who(c, a[0]), min = Math.min(40320, Math.max(0, N(a[1]))); await act(c, `aislaría a ${w.user.username} ${min} min`, async () => { await (w.member || await g.members.fetch(w.id)).timeout(min ? min * 60000 : null, S(a[2]).slice(0, 200)); }); }, { q: true, min: 2 });
F(C9, "deleteMessages", "cantidad", "Borra mensajes recientes del canal (1-100; necesita «Gestionar mensajes»).", async (c, a) => { need(c, "ManageMessages"); const n = Math.min(100, Math.max(1, N(a[0]))); await act(c, `borraría ${n} mensajes`, async () => { await c.channel.bulkDelete(n, true); }); }, { q: true, min: 1 });

const BLOCKDOCS = [
  { n: "if", a: "condición", d: "Empieza una condición. Operadores: == != > < >= <= ~= (contiene), && (y), || (o).", c: "Bloques", blk: true },
  { n: "elseif", a: "condición", d: "Otra condición si la anterior no se cumplió.", c: "Bloques", blk: true },
  { n: "else", a: "", d: "Lo que pasa si ninguna condición se cumplió.", c: "Bloques", blk: true },
  { n: "endif", a: "", d: "Cierra el $if.", c: "Bloques", blk: true },
  { n: "for", a: "variable;desde;hasta;[paso]", d: "Repite (máx. 200 vueltas). Lee la variable con $get[variable].", c: "Bloques", blk: true },
  { n: "endfor", a: "", d: "Cierra el $for.", c: "Bloques", blk: true },
  { n: "while", a: "condición", d: "Repite mientras se cumpla la condición (máx. 200 vueltas).", c: "Bloques", blk: true },
  { n: "endwhile", a: "", d: "Cierra el $while.", c: "Bloques", blk: true },
];
R.bind(FN);
module.exports = { FN, QUIET, DOCS: [...BLOCKDOCS, ...LIST] };
