// Cliente LLM (API compatible con OpenAI: Grok, OpenAI/ChatGPT, Gemini y Ollama).
const { PROVIDERS, CLOUD, ALL, LLM_TIMEOUT } = require("./constants");
const { getConfig, usable } = require("./config");
const { cleanUrl, cleanModel, cleanKey } = require("./validate");

async function llm(c, messages, tools, timeout = LLM_TIMEOUT) {
  const P = PROVIDERS[c.provider]; // undefined si es Ollama
  const url = (P ? P.base : c.ollamaUrl.replace(/\/+$/, "") + "/v1") + "/chat/completions";
  const headers = { "Content-Type": "application/json" };
  if (P) headers.Authorization = "Bearer " + c.keys[c.provider];
  const body = { model: P ? c.models[c.provider] : c.ollamaModel, messages, stream: false };
  if (!P || P.temperature) body.temperature = 0.2; // los modelos GPT-5 de OpenAI no admiten otra temperatura que la de por defecto
  if (tools) { body.tools = tools; body.tool_choice = "auto"; }
  let r, txt;
  try { r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) }); txt = await r.text(); }
  catch (e) { const err = Error(e.name === "TimeoutError" ? "El proveedor de IA tardó demasiado en responder" : "No se pudo conectar con el proveedor de IA"); err.detail = e.message + (e.cause?.message ? " - " + e.cause.message : ""); err.provider = true; throw err; }
  if (!r.ok) { const err = Error(`El proveedor de IA devolvió un error (${r.status})`); err.detail = txt.slice(0, 300); err.provider = true; throw err; }
  let m; try { m = JSON.parse(txt).choices[0].message; } catch { const err = Error("Respuesta inesperada del proveedor de IA"); err.detail = txt.slice(0, 300); err.provider = true; throw err; }
  return m;
}
// Prueba de conexión con la configuración indicada (o la guardada si no se pasan datos)
async function test(b = {}) {
  const c = { ...getConfig(), keys: { ...getConfig().keys }, models: { ...getConfig().models } };
  if (ALL.includes(b.provider)) {
    c.provider = b.provider;
    if (CLOUD.includes(b.provider)) { if (b.api_key) c.keys[b.provider] = cleanKey(b.api_key); c.models[b.provider] = cleanModel(b.model || c.models[b.provider]); }
    else { c.ollamaUrl = cleanUrl(b.url || c.ollamaUrl); c.ollamaModel = cleanModel(b.model || c.ollamaModel); }
  }
  if (!usable(c)) throw Error("La IA no está configurada");
  const m = await llm(c, [{ role: "user", content: "Responde solo con la palabra: ok" }], null, 30000);
  return String(m.content || "").slice(0, 80);
}

module.exports = { llm, test };
