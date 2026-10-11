// Cliente LLM (API compatible con OpenAI: Grok y Ollama).
const { GROK_BASE, LLM_TIMEOUT } = require("./constants");
const { getConfig, usable } = require("./config");
const { cleanUrl, cleanModel, cleanKey } = require("./validate");

async function llm(c, messages, tools, timeout = LLM_TIMEOUT) {
  const grok = c.provider === "grok";
  const url = (grok ? GROK_BASE : c.ollamaUrl.replace(/\/+$/, "") + "/v1") + "/chat/completions";
  const headers = { "Content-Type": "application/json" };
  if (grok) headers.Authorization = "Bearer " + c.key;
  const body = { model: grok ? c.grokModel : c.ollamaModel, messages, stream: false, temperature: 0.2 };
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
  const c = { ...getConfig() };
  if (b.provider === "grok" || b.provider === "ollama") {
    c.provider = b.provider;
    if (b.provider === "grok") { if (b.api_key) c.key = cleanKey(b.api_key); c.grokModel = cleanModel(b.model || c.grokModel); }
    else { c.ollamaUrl = cleanUrl(b.url || c.ollamaUrl); c.ollamaModel = cleanModel(b.model || c.ollamaModel); }
  }
  if (!usable(c)) throw Error("La IA no está configurada");
  const m = await llm(c, [{ role: "user", content: "Responde solo con la palabra: ok" }], null, 30000);
  return String(m.content || "").slice(0, 80);
}

module.exports = { llm, test };
