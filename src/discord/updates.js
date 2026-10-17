// Avisos de actualización: cuando el servidor detecta una versión nueva en GitHub (cada 2 minutos), la anuncia UNA vez
// en el canal de actualizaciones. La última versión avisada se guarda en la base de datos para no repetirla al reiniciar.
const ver = require("../version");
const store = require("./store");
const logger = require("./logger");

// Notas de la versión: se leen de RELEASE.md en GitHub (solo la sección de esa versión, resumida)
async function notes(v) {
  try {
    const r = await fetch(ver.releaseUrl() + "?_=" + Date.now(), { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return "";
    const t = (await r.text()).replace(/\r/g, "");
    const h = new RegExp("^# Versión " + String(v).replace(/\./g, "\\.") + "[ \\t]*$", "m").exec(t);
    if (!h) return "";
    let s = t.slice(h.index + h[0].length);
    const end = s.search(/\n---|\n# Versión /); if (end >= 0) s = s.slice(0, end);
    const files = s.search(/\n## (Archivos modificados|Actualizar)/); if (files >= 0) s = s.slice(0, files);
    s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^#{2,4} +(.+)$/gm, "**$1**").trim();
    if (s.length > 1100) s = s.slice(0, 1100).replace(/\n[^\n]*$/, "") + "\n…";
    return s;
  } catch { return ""; }
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
        color: 0x2ecc71, title: "Hay una versión nueva de File Cloud", url: info.url,
        description: `Versión instalada **${info.current}** → nueva versión **${info.latest}**${n ? "\n\n" + n : ""}`.slice(0, 3800),
        fields: [{ name: "Cómo actualizar", value: "`git pull`, `npm install` y reiniciar el servidor." }, { name: "Notas completas", value: info.url + "/blob/HEAD/RELEASE.md" }],
        footer: { text: "File Cloud · aviso de actualización" },
      }],
    });
    store.setS("discord_update_announced", info.latest);
    return true;
  } finally { busy = false; }
}

module.exports = { announce };
