// Generador ZIP en streaming (sin dependencias). Soporta archivos y carpetas, hasta 4 GB.
const fs = require("fs"), fsp = fs.promises, path = require("path"), zlib = require("zlib");
const T = new Uint32Array(256).map((_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xEDB88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
const crc = (c, b) => { c ^= 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const dos = d => ({ t: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), d: (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() });

async function collect(items) {
  const files = []; let total = 0;
  const add = async (abs, rel) => {
    const s = await fsp.lstat(abs);
    if (s.isSymbolicLink()) return;
    if (s.isDirectory()) {
      const es = await fsp.readdir(abs);
      if (!es.length) files.push({ rel: rel + "/", dir: true, mtime: s.mtime });
      for (const e of es) await add(path.join(abs, e), rel + "/" + e);
    } else if (s.isFile()) {
      total += s.size;
      if (s.size >= 0xFFFFFFFF || total >= 0xFFFFFFFF) throw Error("Demasiado grande para un ZIP (máx. 4 GB)");
      files.push({ abs, rel, mtime: s.mtime });
    }
  };
  for (const it of items) await add(it.abs, it.name);
  if (files.length > 65000) throw Error("Demasiados archivos para un ZIP");
  return files;
}

async function zipTo(res, items, name) {
  const files = await collect(items); // si falla, aún no se han enviado cabeceras
  res.set({ "Content-Type": "application/zip", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}.zip` });
  let off = 0; const cd = [];
  const w = b => new Promise((ok, ko) => { if (res.destroyed) return ko(Error("abort")); off += b.length; res.write(b) ? ok() : res.once("drain", ok); });
  try {
    for (const f of files) {
      const nb = Buffer.from(f.rel, "utf8"), { t, d } = dos(f.mtime), start = off, flag = f.dir ? 0x0800 : 0x0808, method = f.dir ? 0 : 8;
      const h = Buffer.alloc(30);
      h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(flag, 6); h.writeUInt16LE(method, 8);
      h.writeUInt16LE(t, 10); h.writeUInt16LE(d, 12); h.writeUInt16LE(nb.length, 26);
      await w(h); await w(nb);
      let c = 0, us = 0, cs = 0;
      if (!f.dir) {
        const def = zlib.createDeflateRaw(), rs = fs.createReadStream(f.abs);
        rs.on("data", b => { c = crc(c, b); us += b.length; }).on("error", e => def.destroy(e));
        rs.pipe(def);
        for await (const ch of def) { cs += ch.length; await w(ch); }
        const dd = Buffer.alloc(16);
        dd.writeUInt32LE(0x08074b50, 0); dd.writeUInt32LE(c, 4); dd.writeUInt32LE(cs, 8); dd.writeUInt32LE(us, 12);
        await w(dd);
      }
      cd.push({ nb, t, d, c, cs, us, flag, method, start, dir: f.dir });
    }
    const cdStart = off;
    for (const e of cd) {
      const h = Buffer.alloc(46);
      h.writeUInt32LE(0x02014b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(20, 6); h.writeUInt16LE(e.flag, 8); h.writeUInt16LE(e.method, 10);
      h.writeUInt16LE(e.t, 12); h.writeUInt16LE(e.d, 14); h.writeUInt32LE(e.c, 16); h.writeUInt32LE(e.cs, 20); h.writeUInt32LE(e.us, 24);
      h.writeUInt16LE(e.nb.length, 28); h.writeUInt32LE(e.dir ? 0x10 : 0, 38); h.writeUInt32LE(e.start, 42);
      await w(h); await w(e.nb);
    }
    const end = Buffer.alloc(22), size = off - cdStart;
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(cd.length, 8); end.writeUInt16LE(cd.length, 10);
    end.writeUInt32LE(size, 12); end.writeUInt32LE(cdStart, 16);
    await w(end); res.end();
  } catch { res.destroy(); }
}
module.exports = { zipTo };
