// Registro de actividad hacia Discord. NO se guarda nada en disco: los eventos esperan unos segundos en memoria
// (máximo 100) y se envían agrupados en un solo mensaje al canal de registros. Sin canal configurado no se acumula nada.
const store = require("./store");

let sender = null;              // (idCanal, mensaje) => Promise, lo pone el bot cuando está conectado
let queue = [], dropped = 0, timer = null;
const MAX = 100, WAIT = 3000;

const setSender = f => { sender = f; if (!f) { queue = []; dropped = 0; } };
const ready = () => !!sender;
const active = () => !!sender && !!store.channel("log"); // ¿hay alguien a quien enviar? (evita trabajo inútil)

// Texto seguro para Discord: sin menciones ni formato accidental
const md = s => String(s ?? "").replace(/[\\`*_~|>]/g, "\\$&").replace(/</g, "\\<").replace(/@/g, "@\u200b").slice(0, 120);
const code = s => "`" + String(s ?? "").replace(/[`\r\n]/g, "'").replace(/@/g, "@\u200b").slice(0, 150) + "`";

const fmt = n => n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : n < 1073741824 ? (n / 1048576).toFixed(1) + " MB" : (n / 1073741824).toFixed(2) + " GB";

function log(event, line) {
  if (!active() || !store.eventOn(event)) return;
  if (queue.length >= MAX) { queue.shift(); dropped++; }
  queue.push({ ts: Math.floor(Date.now() / 1000), line });
  if (!timer) { timer = setTimeout(flush, WAIT); timer.unref?.(); }
}

let warned = 0;
async function sendTo(channelId, payload) {
  if (!sender) throw Error("El bot de Discord no está conectado");
  return sender(channelId, payload);
}

async function flush() {
  timer = null;
  const items = queue; queue = []; const omitted = dropped; dropped = 0;
  const ch = store.channel("log");
  if (!sender || !ch || !items.length) return;
  const pages = [[]]; let len = 0;
  const lines = items.map(e => `<t:${e.ts}:T> ${e.line}`.slice(0, 600));
  if (omitted) lines.unshift(`*… ${omitted} evento(s) anteriores omitidos por exceso de actividad*`);
  for (const l of lines) { if (len + l.length > 3800) { pages.push([]); len = 0; } pages[pages.length - 1].push(l); len += l.length + 1; }
  for (const p of pages.slice(0, 4)) {
    try { await sendTo(ch, { embeds: [{ color: 0x4f8cff, description: p.join("\n"), footer: { text: "File Cloud · registro de actividad" } }] }); }
    catch (e) { if (Date.now() - warned > 6e4) { warned = Date.now(); console.warn("[Discord] No se pudo enviar al canal de registros:", e.message); } break; }
  }
}

module.exports = { setSender, ready, active, log, sendTo, md, code, fmt };
