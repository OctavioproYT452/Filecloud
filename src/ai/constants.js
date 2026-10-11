// Constantes del agente de IA.
const GROK_BASE = "https://api.x.ai/v1";
const GROK_KEYS_URL = "https://console.x.ai/";
const DEF = { grokModel: "grok-4.7", ollamaUrl: "http://localhost:11434", ollamaModel: "llama3.1", count: 20, period: "hour" };
const MAX_STEPS = 8, MAX_READ = 60000, MAX_WRITE = 1e6, MAX_HISTORY = 20, LLM_TIMEOUT = 120000;

module.exports = { GROK_BASE, GROK_KEYS_URL, DEF, MAX_STEPS, MAX_READ, MAX_WRITE, MAX_HISTORY, LLM_TIMEOUT };
