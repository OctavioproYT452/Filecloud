// Operaciones de disco: tamaños, cuota de espacio, nombres únicos y mover archivos.
const fsp = require("fs").promises, path = require("path");
const { run, now } = require("../db");
const { base } = require("./paths");

async function dirSize(d) {
  let t = 0, es;
  try { es = await fsp.readdir(d, { withFileTypes: true }); } catch { return 0; }
  for (const e of es) {
    const p = path.join(d, e.name);
    try { t += e.isDirectory() ? await dirSize(p) : (await fsp.stat(p)).size; } catch { }
  }
  return t;
}
async function usage(u, force) {
  if (!force && now() - u.used_at < 30000) return u.used_bytes;
  const b = await dirSize(base(u));
  run("UPDATE users SET used_bytes=?,used_at=? WHERE id=?", b, now(), u.id);
  u.used_bytes = b; u.used_at = now();
  return b;
}
async function uniq(dir, n) {
  const { name, ext } = path.parse(n); let c = n, i = 1;
  while (await fsp.access(path.join(dir, c)).then(() => 1, () => 0)) c = `${name} (${i++})${ext}`;
  return c;
}
async function move(a, b) {
  try { await fsp.rename(a, b); } catch (e) { if (e.code !== "EXDEV") throw e; await fsp.copyFile(a, b); await fsp.rm(a); }
}

module.exports = { dirSize, usage, uniq, move };
