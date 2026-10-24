// Avisos de actualización: cuando el servidor detecta una versión nueva en GitHub (cada 2 minutos), la anuncia UNA vez
// en el canal de actualizaciones. La última versión avisada se guarda en la base de datos para no repetirla al reiniciar.
const ver = require("../version");
const store = require("./store");
const logger = require("./logger");

// Notas de la versión y archivos modificados: se leen de RELEASE.md en GitHub (la sección de esa versión, o la más reciente si v es null)
async function notes(v) {
  try {
    const r = await fetch(ver.releaseUrl() + "?_=" + Date.now(), { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { text: "", files: "" };
    const t = (await r.text()).replace(/\r/g, "");
    const h = v ? new RegExp("^# Versión " + String(v).replace(/\./g, "\\.") + "[ \\t]*$", "m").exec(t) : /^# Versión .+$/m.exec(t);
    if (!h) return { text: "", files: "" };
    let s = t.slice(h.index + h[0].length);
    const end = s.search(/\n---|\n# Versión /); if (end >= 0) s = s.slice(0, end);
    const fi = s.search(/\n## (Archivos modificados|Archivos)/);
    let files = "";
    if (fi >= 0) { files = s.slice(fi).replace(/^\n## [^\n]*\n/, "").replace(/\n## [\s\S]*$/, "").trim(); s = s.slice(0, fi); }
    const up = s.search(/\n## Actualizar/); if (up >= 0) s = s.slice(0, up);
    const clean = x => x.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^#{2,4} +(.+)$/gm, "**$1**").trim();
    s = clean(s); if (s.length > 1100) s = s.slice(0, 1100).replace(/\n[^\n]*$/, "") + "\n…";
    files = clean(files); if (files.length > 900) files = files.slice(0, 900).replace(/\n[^\n]*$/, "") + "\n…";
    return { text: s, files };
  } catch { return { text: "", files: "" }; }
}

let busy = false;
// force = volver a anunciar aunque esa versión ya se hubiera avisado (lo usa /actualizar)
async function announce(force = false) {
  if (busy || !logger.ready()) return false;
  const ch = store.channel("update"), info = ver.info();
  if (!ch || !info.available) return false;
  if (!force && store.setting("discord_update_announced") === info.latest) return false;
  busy = true;
  try {
    const n = await notes(info.latest), role = /^\d{5,25}$/.test(process.env.DISCORD_UPDATE_ROLE_ID || "") ? process.env.DISCORD_UPDATE_ROLE_ID : null;
    await logger.sendTo(ch, {
      content: role ? `<@&${role}>` : undefined, allowedMentions: role ? { roles: [role] } : { parse: [] },
      embeds: [{
        color: 0x2ecc71, title: "Hay una versión nueva de SynapseBox", url: info.url,
        description: `Versión instalada **${info.current}** → nueva versión **${info.latest}**${n.text ? "\n\n" + n.text : ""}`.slice(0, 3800),
        fields: [...(n.files ? [{ name: "Archivos modificados", value: n.files.slice(0, 1000) }] : []), { name: "Cómo actualizar", value: "`git pull`, `npm install` y reiniciar el servidor." }, { name: "Notas completas", value: info.url + "/blob/HEAD/RELEASE.md" }],
        footer: { text: "SynapseBox · aviso de actualización" },
      }],
    });
    store.setS("discord_update_announced", info.latest);
    return true;
  } finally { busy = false; }
}

// Lo lanza un administrador desde la web: consulta GitHub ahora mismo y avisa de la versión publicada allí, aunque ya se hubiera avisado.
async function notify(by) {
  if (!logger.ready()) throw Error("El bot no está conectado");
  const ch = store.channel("update"); if (!ch) throw Error("Configura primero el canal de actualizaciones");
  await ver.checkVersion();
  const info = ver.info(); if (!info.latest) throw Error("No se pudo consultar GitHub. Inténtalo de nuevo en un momento");
  const n = await notes(info.latest);
  if (!n.text && !n.files) { const m = await notes(null); if (m.text || m.files) Object.assign(n, m); }
  const role = /^\d{5,25}$/.test(process.env.DISCORD_UPDATE_ROLE_ID || "") ? process.env.DISCORD_UPDATE_ROLE_ID : null;
  await logger.sendTo(ch, {
    content: role ? `<@&${role}>` : undefined, allowedMentions: role ? { roles: [role] } : { parse: [] },
    embeds: [{
      color: 0x2ecc71, title: info.available ? "Nueva actualización de SynapseBox" : "Información de la última versión de SynapseBox", url: info.url,
      description: `${info.available ? `Versión instalada **${info.current}** → nueva versión **${info.latest}**` : `Última versión en GitHub: **${info.latest}** (instalada: **${info.current}**)`}${n.text ? "\n\n" + n.text : ""}`.slice(0, 3800),
      fields: [...(n.files ? [{ name: "Archivos modificados", value: n.files.slice(0, 1000) }] : []), { name: "Cómo actualizar", value: "`git pull`, `npm install` y reiniciar el servidor." }, { name: "Notas completas", value: info.url + "/blob/HEAD/RELEASE.md" }],
      footer: { text: "SynapseBox · aviso enviado por " + String(by || "un administrador").slice(0, 60) },
    }],
  });
  if (info.available) store.setS("discord_update_announced", info.latest);
  return info.latest;
}

module.exports = { announce, notify };
