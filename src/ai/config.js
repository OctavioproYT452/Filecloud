// Configuración de la IA: vive en la tabla "settings" y se lee al iniciar el servidor (reload()).
// Cada proveedor en la nube (Grok, OpenAI, Gemini) guarda su propia API key y su modelo, así que se puede cambiar de uno a otro sin perderlos.
const { get, run } = require("../db");
const { PROVIDERS, CLOUD, ALL, DEF } = require("./constants");
const { cleanUrl, cleanModel, cleanKey, cleanCount } = require("./validate");

const getS = k => get("SELECT value FROM settings WHERE key=?", k)?.value;
const setS = (k, v) => run("INSERT OR REPLACE INTO settings VALUES(?,?)", k, String(v));
let cfg = { provider: "none", keys: {}, models: {} };
function readConfig() {
  const provider = getS("ai_provider") || "none";
  const count = Number(getS("ai_limit_count"));
  const keys = {}, models = {};
  for (const id of CLOUD) { keys[id] = getS(PROVIDERS[id].keySetting) || ""; models[id] = getS(PROVIDERS[id].modelSetting) || PROVIDERS[id].model; }
  return {
    provider: ALL.includes(provider) ? provider : "none",
    keys, models,
    ollamaUrl: getS("ai_ollama_url") || DEF.ollamaUrl,
    ollamaModel: getS("ai_ollama_model") || DEF.ollamaModel,
    count: Number.isFinite(count) && getS("ai_limit_count") !== undefined ? count : DEF.count,
    period: getS("ai_limit_period") === "day" ? "day" : "hour",
  };
}
const usable = c => CLOUD.includes(c.provider) ? !!c.keys?.[c.provider] && !!c.models?.[c.provider] : c.provider === "ollama" && !!c.ollamaUrl && !!c.ollamaModel;
function reload() { cfg = readConfig(); return enabled(); }
const enabled = () => usable(cfg);
const describe = () => !enabled() ? "desactivada" : CLOUD.includes(cfg.provider) ? `${PROVIDERS[cfg.provider].name} (${cfg.models[cfg.provider]})` : `Ollama (${cfg.ollamaModel} en ${cfg.ollamaUrl})`;

// Guarda la configuración (usado por el script de instalación y por el panel de administración).
function save(b) {
  const p = String(b.provider || "none");
  if (p !== "none" && !ALL.includes(p)) throw Error("Proveedor inválido");
  if (CLOUD.includes(p)) {
    const P = PROVIDERS[p];
    const key = b.api_key ? cleanKey(b.api_key) : (getS(P.keySetting) || "");
    if (!key) throw Error("Falta la API key de " + P.name);
    setS(P.keySetting, key); setS(P.modelSetting, cleanModel(b.model || getS(P.modelSetting) || P.model));
  }
  if (p === "ollama") { setS("ai_ollama_url", cleanUrl(b.url || getS("ai_ollama_url") || DEF.ollamaUrl)); setS("ai_ollama_model", cleanModel(b.model || getS("ai_ollama_model") || DEF.ollamaModel)); }
  if (b.limit_count !== undefined) setS("ai_limit_count", cleanCount(b.limit_count));
  if (b.limit_period !== undefined) setS("ai_limit_period", b.limit_period === "day" ? "day" : "hour");
  setS("ai_provider", p);
  reload();
}
// Vista para el panel de administración (las API keys nunca salen del servidor: solo se indica si hay una guardada)
const publicConfig = () => ({
  provider: cfg.provider, enabled: enabled(),
  providers: Object.fromEntries(CLOUD.map(id => [id, { name: PROVIDERS[id].name, keys_url: PROVIDERS[id].keysUrl, default_model: PROVIDERS[id].model, model: cfg.models[id], has_key: !!cfg.keys[id] }])),
  ollama_url: cfg.ollamaUrl, ollama_model: cfg.ollamaModel,
  limit_count: cfg.count, limit_period: cfg.period, configured: getS("ai_provider") !== undefined,
});
const getConfig = () => cfg;

module.exports = { getConfig, reload, enabled, usable, describe, save, publicConfig };
