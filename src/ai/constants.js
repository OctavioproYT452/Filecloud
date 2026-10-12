// Constantes del agente de IA.
// Proveedores en la nube: todos hablan la API compatible con OpenAI (/chat/completions), solo cambian la URL base, la API key y el modelo.
//   keySetting / modelSetting = clave en la tabla "settings" donde se guarda cada dato (la de Grok conserva su nombre original: ai_key).
//   temperature:false = no se envía "temperature" (los modelos GPT-5 y de razonamiento de OpenAI solo aceptan el valor por defecto).
const PROVIDERS = {
  grok:   { name: "Grok (xAI)",        base: "https://api.x.ai/v1",                                       keysUrl: "https://console.x.ai/",                  model: "grok-4.7",         keySetting: "ai_key",        modelSetting: "ai_grok_model",   temperature: true },
  openai: { name: "OpenAI (ChatGPT)",  base: "https://api.openai.com/v1",                                 keysUrl: "https://platform.openai.com/api-keys",   model: "gpt-5-mini",       keySetting: "ai_openai_key", modelSetting: "ai_openai_model", temperature: false },
  gemini: { name: "Google Gemini",     base: "https://generativelanguage.googleapis.com/v1beta/openai",   keysUrl: "https://aistudio.google.com/apikey",     model: "gemini-2.5-flash", keySetting: "ai_gemini_key", modelSetting: "ai_gemini_model", temperature: true },
};
const CLOUD = Object.keys(PROVIDERS);              // ["grok", "openai", "gemini"]
const ALL = [...CLOUD, "ollama"];                  // proveedores seleccionables (además de "none")
const DEF = { ollamaUrl: "http://localhost:11434", ollamaModel: "llama3.1", count: 20, period: "hour" };
const MAX_STEPS = 8, MAX_READ = 60000, MAX_WRITE = 1e6, MAX_HISTORY = 20, LLM_TIMEOUT = 120000;

module.exports = { PROVIDERS, CLOUD, ALL, DEF, MAX_STEPS, MAX_READ, MAX_WRITE, MAX_HISTORY, LLM_TIMEOUT };
