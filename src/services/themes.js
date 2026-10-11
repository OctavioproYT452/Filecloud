// Temas de apariencia: validación y generación del CSS.
const FONTS = { system: 'Inter,"Segoe UI",system-ui,sans-serif', serif: 'Georgia,"Times New Roman",serif', mono: "ui-monospace,Menlo,Consolas,monospace", rounded: 'ui-rounded,Nunito,"Segoe UI",system-ui,sans-serif' };
const COLORS = ["bg", "card", "card2", "text", "muted", "accent", "on", "danger", "ok", "warn"];
function cleanTheme(t) {
  if (!t || typeof t !== "object") return null;
  const o = {};
  for (const k of COLORS) if (/^#[0-9a-f]{6}$/i.test(t[k])) o[k] = t[k];
  if (t.r !== undefined && Number.isFinite(Number(t.r))) o.r = Math.max(0, Math.min(28, Math.round(Number(t.r))));
  if (FONTS[t.font]) o.font = t.font;
  if (["0.8", "1", "1.25"].includes(String(t.sp))) o.sp = String(t.sp);
  return Object.keys(o).length ? o : null;
}
const userTheme = u => { try { return cleanTheme(JSON.parse(u?.theme || "null")); } catch { return null; } };
const themeCss = t => t ? ":root{" + [...COLORS.filter(k => t[k]).map(k => `--${k}:${t[k]}`), t.r !== undefined && `--r:${t.r}px`, t.font && `--font:${FONTS[t.font]}`, t.sp && `--sp:${t.sp}`].filter(Boolean).join(";") + "}" : "";

module.exports = { FONTS, COLORS, cleanTheme, userTheme, themeCss };
