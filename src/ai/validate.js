// Validación y limpieza de los datos de configuración de la IA.
const cleanUrl = u => {
  let x; try { x = new URL(String(u || "").trim()); } catch { throw Error("URL de Ollama inválida (ej: http://localhost:11434)"); }
  if (!/^https?:$/.test(x.protocol)) throw Error("La URL de Ollama debe empezar por http:// o https://");
  return x.origin + x.pathname.replace(/\/+$/, "");
};
const cleanModel = m => { m = String(m || "").trim(); if (!m || m.length > 100 || /[\s\0]/.test(m)) throw Error("Nombre de modelo inválido"); return m; };
const cleanKey = k => { k = String(k || "").trim(); if (k.length < 8 || k.length > 400 || /\s/.test(k)) throw Error("API key inválida"); return k; };
const cleanCount = n => { n = Math.floor(Number(n)); if (!Number.isFinite(n) || n < -1 || n > 1e6) throw Error("Límite de usos inválido (-1 = ilimitado, 0 = nadie)"); return n; };

module.exports = { cleanUrl, cleanModel, cleanKey, cleanCount };
