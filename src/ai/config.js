// Configuración de la IA: vive en la tabla "settings" y se lee al iniciar el servidor (reload()).
const { get, run } = require("../db");
const { GROK_KEYS_URL, DEF } = require("./constants");
const { cleanUrl, cleanModel, cleanKey, cleanCount } = require("./validate");

const getS = k => get("SELECT value FROM settings WHERE key=?", k)?.value;
const setS = (k, v) => run("INSERT OR REPLACE INTO settings VALUES(?,?)", k, String(v));
let cfg = { provider: "none" };
function readConfig() {
  const provider = getS("ai_provider") || "none";
  const count = Number(getS("ai_limit_count"));
  return {
    provider: ["grok", "ollama"].includes(provider) ? provider : "none",
    key: getS("ai_key") || "",
    grokModel: getS("ai_grok_model") || DEF.grokModel,
    ollamaUrl: getS("ai_ollama_url") || DEF.ollamaUrl,
    ollamaModel: getS("ai_ollama_model") || DEF.ollamaModel,
    count: Number.isFinite(count) && getS("ai_limit_count") !== undefined ? count : DEF.count,
    period: getS("ai_limit_period") === "day" ? "day" : "hour",
  };
}
const usable = c => (c.provider === "grok" && !!c.key) || (c.provider === "ollama" && !!c.ollamaUrl && !!c.ollamaModel);
function reload() { cfg = readConfig(); return enabled(); }
const enabled = () => usable(cfg);
const describe = () => !enabled() ? "desactivada" : cfg.provider === "grok" ? `Grok (${cfg.grokModel})` : `Ollama (${cfg.ollamaModel} en ${cfg.ollamaUrl})`;

// Guarda la configuración (usado por el script de instalación y por el panel de administración).
function save(b) {
  const p = String(b.provider || "none");
  if (!["none", "grok", "ollama"].includes(p)) throw Error("Proveedor inválido");
  if (p === "grok") {
    const key = b.api_key ? cleanKey(b.api_key) : (getS("ai_key") || "");
    if (!key) throw Error("Falta la API key de Grok");
    setS("ai_key", key); setS("ai_grok_model", cleanModel(b.model || getS("ai_grok_model") || DEF.grokModel));
  }
  if (p === "ollama") { setS("ai_ollama_url", cleanUrl(b.url || getS("ai_ollama_url") || DEF.ollamaUrl)); setS("ai_ollama_model", cleanModel(b.model || getS("ai_ollama_model") || DEF.ollamaModel)); }
  if (b.limit_count !== undefined) setS("ai_limit_count", cleanCount(b.limit_count));
  if (b.limit_period !== undefined) setS("ai_limit_period", b.limit_period === "day" ? "day" : "hour");
  setS("ai_provider", p);
  reload();
}
// Vista para el panel de administración (la API key nunca sale del servidor)
const publicConfig = () => ({
  provider: cfg.provider, enabled: enabled(), has_key: !!cfg.key, grok_model: cfg.grokModel, ollama_url: cfg.ollamaUrl, ollama_model: cfg.ollamaModel,
  limit_count: cfg.count, limit_period: cfg.period, keys_url: GROK_KEYS_URL, configured: getS("ai_provider") !== undefined,
});
const getConfig = () => cfg;

module.exports = { getConfig, reload, enabled, usable, describe, save, publicConfig };
