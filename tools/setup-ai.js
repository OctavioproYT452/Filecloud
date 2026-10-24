#!/usr/bin/env node
// SynapseBox - configuración inicial del agente de IA. Lo ejecutan install.sh / install.ps1 justo después de "npm install".
// Pregunta si quieres un agente de IA (Grok de xAI, OpenAI/ChatGPT, Google Gemini u Ollama) y guarda la respuesta en la base de datos.
// El servidor la lee al arrancar: si dijiste que no, toda la IA queda oculta (el admin puede activarla luego desde su panel).
//
//   node tools/setup-ai.js            pregunta (si ya está configurada, no vuelve a preguntar)
//   node tools/setup-ai.js --force    vuelve a preguntar aunque ya esté configurada
//   node tools/setup-ai.js --skip     no pregunta ni cambia nada
// Instalación sin teclado (variables de entorno):
//   SYNAPSEBOX_AI=none | grok | openai | gemini | ollama   SYNAPSEBOX_AI_KEY=...   SYNAPSEBOX_AI_MODEL=...   SYNAPSEBOX_OLLAMA_URL=http://localhost:11434
const fs = require("fs"), tty = require("tty"), readline = require("readline");
const ai = require("../src/ai");

const args = process.argv.slice(2), FORCE = args.includes("--force"), SKIP = args.includes("--skip");
const c = (n, t) => process.stdout.isTTY ? `\x1b[${n}m${t}\x1b[0m` : t;
const info = t => console.log(c("1;36", "==>") + " " + t), ok = t => console.log(c("1;32", " OK") + " " + t), warn = t => console.log(c("1;33", " !!") + " " + t);

// Con "curl | bash" la entrada estándar no es el teclado: se abre la terminal directamente.
function openInput() {
  if (process.stdin.isTTY) return process.stdin;
  try { return new tty.ReadStream(fs.openSync(process.platform === "win32" ? "CONIN$" : "/dev/tty", "r")); } catch { return null; }
}

async function fromEnv() {
  const p = String(process.env.SYNAPSEBOX_AI || process.env.FILECLOUD_AI || "").toLowerCase();
  if (!p) return false;
  if (p !== "none" && ![...ai.CLOUD, "ollama"].includes(p)) throw Error("SYNAPSEBOX_AI debe ser none, grok, openai, gemini u ollama");
  ai.save({ provider: p, api_key: process.env.SYNAPSEBOX_AI_KEY || process.env.FILECLOUD_AI_KEY, model: process.env.SYNAPSEBOX_AI_MODEL || process.env.FILECLOUD_AI_MODEL, url: process.env.SYNAPSEBOX_OLLAMA_URL || process.env.FILECLOUD_OLLAMA_URL });
  ok("IA configurada desde variables de entorno: " + (p === "none" ? "sin IA" : ai.describe()));
  return true;
}

async function main() {
  ai.reload();
  if (SKIP) return info("Configuración de IA omitida (--skip).");
  if (await fromEnv()) return;
  if (ai.publicConfig().configured && !FORCE) {
    return info(`IA ya configurada (${ai.describe()}). Para cambiarla: node tools/setup-ai.js --force, o desde el panel de administración.`);
  }
  const input = openInput();
  if (!input) {
    return info("Sin terminal interactiva: no se configuró la IA (quedará desactivada). El admin puede activarla desde su panel, o ejecuta: node tools/setup-ai.js");
  }
  const rl = readline.createInterface({ input, output: process.stdout, terminal: !!input.isTTY });
  rl.on("close", () => { /* Ctrl+D / Ctrl+C */ });
  let closed = false; rl.on("close", () => { closed = true; });
  const ask = q => new Promise((res, rej) => { if (closed) return rej(Error("cancelado")); rl.question(q, a => res(a.trim())); rl.once("close", () => rej(Error("cancelado"))); });
  const askUntil = async (q, valid, again) => { for (;;) { const a = await ask(q); const v = valid(a); if (v !== null && v !== undefined) return v; console.log(again); } };
  const yesNo = q => askUntil(q + " (s/n): ", a => /^(s|si|sí|y|yes)$/i.test(a) ? true : /^(n|no)$/i.test(a) ? false : null, "Responde s (sí) o n (no).");

  console.log("\n" + c("1", "Agente de IA para SynapseBox") + "\nLos usuarios podrán pedirle que cree carpetas y archivos, y que mueva, copie o borre\nelementos, siempre solo dentro de su propia carpeta (nunca ejecuta nada).\n");
  try {
    if (!await yesNo("¿Quieres configurar un agente de IA?")) {
      ai.save({ provider: "none" });
      ok("Sin IA: el servidor ocultará todo lo relacionado con la IA. El admin podrá activarla luego desde su panel.");
      return;
    }
    const ids = [...ai.CLOUD, "ollama"], label = i => i === "ollama" ? "Ollama (modelos locales en tu propio equipo o servidor)" : ai.PROVIDERS[i].name + " (en la nube, requiere API key)";
    const prov = await askUntil("¿Qué proveedor quieres usar?\n" + ids.map((i, n) => `  ${n + 1}) ${label(i)}`).join("\n") + `\nElige 1-${ids.length}: `,
      a => ids.includes(a.toLowerCase()) ? a.toLowerCase() : (ids[Number(a) - 1] || null), `Escribe un número del 1 al ${ids.length}.`);

    if (prov !== "ollama") {
      const P = ai.PROVIDERS[prov];
      console.log(`\nConsigue tu API key de ${P.name} aquí:  ` + c("1;4", P.keysUrl) + "\n");
      const key = await askUntil(`Pega aquí tu API key de ${P.name}: `, a => a.length >= 8 && !/\s/.test(a) ? a : null, "La API key no parece válida (sin espacios, mínimo 8 caracteres). Pégala de nuevo.");
      const model = (await ask(`Modelo [${P.model}]: `)) || P.model;
      info(`Probando la conexión con ${P.name}…`);
      try { await ai.test({ provider: prov, api_key: key, model }); ok(`${P.name} responde correctamente.`); }
      catch (e) { warn("No se pudo verificar ahora (" + e.message + (e.detail ? ": " + e.detail : "") + "). Se guardará igual; puedes cambiarla desde el panel de admin."); }
      ai.save({ provider: prov, api_key: key, model });
    } else {
      const url = await askUntil(`URL de Ollama [${ai.DEF.ollamaUrl}]: `, a => { try { const u = new URL(a || ai.DEF.ollamaUrl); return /^https?:$/.test(u.protocol) ? (a || ai.DEF.ollamaUrl) : null; } catch { return null; } }, "URL inválida. Ejemplo: http://localhost:11434");
      const model = (await ask(`Modelo a usar [${ai.DEF.ollamaModel}]: `)) || ai.DEF.ollamaModel;
      info("Comprobando Ollama…");
      try {
        const r = await fetch(url.replace(/\/+$/, "") + "/api/tags", { signal: AbortSignal.timeout(6000) });
        const names = ((await r.json()).models || []).map(m => m.name || m.model);
        if (names.some(n => n === model || n === model + ":latest" || n.split(":")[0] === model)) ok("Ollama responde y el modelo está instalado.");
        else warn(`Ollama responde, pero no veo el modelo "${model}". Instálalo con:  ollama pull ${model}`);
      } catch (e) { warn("No se pudo conectar con Ollama ahora (" + e.message + "). Se guardará igual; asegúrate de que esté en marcha."); }
      ai.save({ provider: "ollama", url, model });
    }
    ok("IA configurada: " + ai.describe() + ". Los límites de uso por usuario se ajustan en el panel de admin (pestaña IA).");
  } finally { rl.close(); } // (el proceso termina con process.exit: no hace falta destruir la entrada)
}

main().then(() => process.exit(0), e => {
  if (e && e.message === "cancelado") { console.log("\nConfiguración de IA cancelada: no se guardó nada. Puedes repetirla con: node tools/setup-ai.js"); process.exit(0); }
  console.error("No se pudo configurar la IA:", e.message); process.exit(0); // nunca rompe la instalación
});
