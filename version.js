// Comprueba cada 2 minutos si hay una versión más reciente publicada en GitHub.
const fs = require("fs"), path = require("path");
const FILE = path.join(__dirname, "data", "version.json");
const REMOTE = process.env.FILECLOUD_VERSION_URL || "https://raw.githubusercontent.com/OctavioproYT452/Filecloud/HEAD/data/version.json";
const REPO = process.env.FILECLOUD_REPO_URL || "https://github.com/OctavioproYT452/Filecloud";
let versionActual = "0", versionRemota = null;

const parts = v => String(v).split(".").map(n => parseInt(n, 10) || 0);
function isNewer(a, b) { // ¿a es más nueva que b? (compara cada número: 2.10 > 2.9)
  const x = parts(a), y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; }
  return false;
}
const readVersion = t => String(JSON.parse(t.replace(/^\uFEFF/, "")).version || "");

async function checkVersion() {
  try { versionActual = readVersion(fs.readFileSync(FILE, "utf8")) || "0"; } catch { /* sin archivo local */ }
  try {
    const r = await fetch(REMOTE + "?_=" + Date.now(), { signal: AbortSignal.timeout(8000) });
    if (r.ok) versionRemota = readVersion(await r.text()) || versionRemota;
  } catch { /* sin conexión: se conserva el último valor conocido */ }
}
const info = () => ({ available: !!versionRemota && isNewer(versionRemota, versionActual), current: versionActual, latest: versionRemota, url: REPO });
const start = () => { checkVersion(); setInterval(checkVersion, 120000).unref(); };
module.exports = { start, info, checkVersion, isNewer };
