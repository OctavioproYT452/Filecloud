#!/usr/bin/env node
// File Cloud - configuración inicial del agente de IA. Lo ejecutan install.sh / install.ps1 justo después de "npm install".
// Pregunta si quieres un agente de IA (Grok de xAI u Ollama) y guarda la respuesta en la base de datos.
// El servidor la lee al arrancar: si dijiste que no, toda la IA queda oculta (el admin puede activarla luego desde su panel).
//
//   node setup-ai.js            pregunta (si ya está configurada, no vuelve a preguntar)
//   node setup-ai.js --force    vuelve a preguntar aunque ya esté configurada
//   node setup-ai.js --skip     no pregunta ni cambia nada
// Instalación sin teclado (variables de entorno):
//   FILECLOUD_AI=none | grok | ollama   FILECLOUD_AI_KEY=...   FILECLOUD_AI_MODEL=...   FILECLOUD_OLLAMA_URL=http://localhost:11434
const fs = require("fs"), tty = require("tty"), readline = require("readline");
const ai = require("./ai");

const args = process.argv.slice(2), FORCE = args.includes("--force"), SKIP = args.includes("--skip");
const c = (n, t) => process.stdout.isTTY ? `\x1b[${n}m${t}\x1b[0m` : t;
const info = t => console.log(c("1;36", "==>") + " " + t), ok = t => console.log(c("1;32", " OK") + " " + t), warn = t => console.log(c("1;33", " !!") + " " + t);

// Con "curl | bash" la entrada estándar no es el teclado: se abre la terminal directamente.
function openInput() {
  if (process.stdin.isTTY) return process.stdin;
  try { return new tty.ReadStream(fs.openSync(process.platform === "win32" ? "CONIN$" : "/dev/tty", "r")); } catch { return null; }
}

async function fromEnv() {
  const p = String(process.env.FILECLOUD_AI || "").toLowerCase();
  if (!p) return false;
  if (!["none", "grok", "ollama"].includes(p)) throw Error("FILECLOUD_AI debe ser none, grok u ollama");
  ai.save({ provider: p, api_key: process.env.FILECLOUD_AI_KEY, model: process.env.FILECLOUD_AI_MODEL, url: process.env.FILECLOUD_OLLAMA_URL });
  ok("IA configurada desde variables de entorno: " + (p === "none" ? "sin IA" : ai.describe()));
  return true;
}

async function main() {
  ai.reload();
  if (SKIP) return info("Configuración de IA omitida (--skip).");
  if (await fromEnv()) return;
  if (ai.publicConfig().configured && !FORCE) {
    return info(`IA ya configurada (${ai.describe()}). Para cambiarla: node setup-ai.js --force, o desde el panel de administración.`);
  }
  const input = openInput();
  if (!input) {
    return info("Sin terminal interactiva: no se configuró la IA (quedará desactivada). El admin puede activarla desde su panel, o ejecuta: node setup-ai.js");
  }
  const rl = readline.createInterface({ input, output: process.stdout, terminal: !!input.isTTY });
  rl.on("close", () => { /* Ctrl+D / Ctrl+C */ });
  let closed = false; rl.on("close", () => { closed = true; });
  const ask = q => new Promise((res, rej) => { if (closed) return rej(Error("cancelado")); rl.question(q, a => res(a.trim())); rl.once("close", () => rej(Error("cancelado"))); });
  const askUntil = async (q, valid, again) => { for (;;) { const a = await ask(q); const v = valid(a); if (v !== null && v !== undefined) return v; console.log(again); } };
  const yesNo = q => askUntil(q + " (s/n): ", a => /^(s|si|sí|y|yes)$/i.test(a) ? true : /^(n|no)$/i.test(a) ? false : null, "Responde s (sí) o n (no).");

  console.log("\n" + c("1", "Agente de IA para File Cloud") + "\nLos usuarios podrán pedirle que cree carpetas y archivos, y que mueva, copie o borre\nelementos, siempre solo dentro de su propia carpeta (nunca ejecuta nada).\n");
  try {
    if (!await yesNo("¿Quieres configurar un agente de IA?")) {
      ai.save({ provider: "none" });
      ok("Sin IA: el servidor ocultará todo lo relacionado con la IA. El admin podrá activarla luego desde su panel.");
      return;
    }
    const prov = await askUntil("¿Qué proveedor quieres usar?\n  1) Grok (xAI, en la nube, requiere API key)\n  2) Ollama (modelos locales en tu propio equipo o servidor)\nElige 1 o 2: ", a => /^(1|grok)$/i.test(a) ? "grok" : /^(2|ollama)$/i.test(a) ? "ollama" : null, "Escribe 1 (Grok) o 2 (Ollama).");

    if (prov === "grok") {
      console.log("\nConsigue tu API key de Grok aquí:  " + c("1;4", ai.GROK_KEYS_URL) + "\n(inicia sesión, abre \"API Keys\" y pulsa \"Create API key\")\n");
      const key = await askUntil("Pega aquí tu API key de Grok: ", a => a.length >= 8 && !/\s/.test(a) ? a : null, "La API key no parece válida (sin espacios, mínimo 8 caracteres). Pégala de nuevo.");
      const model = (await ask(`Modelo de Grok [${ai.DEF.grokModel}]: `)) || ai.DEF.grokModel;
      info("Probando la conexión con Grok…");
      try { await ai.test({ provider: "grok", api_key: key, model }); ok("Grok responde correctamente."); }
      catch (e) { warn("No se pudo verificar ahora (" + e.message + (e.detail ? ": " + e.detail : "") + "). Se guardará igual; puedes cambiarla desde el panel de admin."); }
      ai.save({ provider: "grok", api_key: key, model });
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
  if (e && e.message === "cancelado") { console.log("\nConfiguración de IA cancelada: no se guardó nada. Puedes repetirla con: node setup-ai.js"); process.exit(0); }
  console.error("No se pudo configurar la IA:", e.message); process.exit(0); // nunca rompe la instalación
});
