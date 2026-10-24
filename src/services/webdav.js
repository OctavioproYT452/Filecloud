// Servidor WebDAV mínimo (clase 1 y 2) para montar la carpeta del usuario como unidad de red.
// Acceso: usuario = su nombre de usuario; contraseña = clave aleatoria que genera el propio usuario (solo guardamos su hash).
// Cada usuario solo ve su carpeta (base(u)); ninguna ruta puede salir de ella.
const fs = require("fs"), fsp = fs.promises, path = require("path"), crypto = require("crypto");
const { Transform } = require("stream"), { pipeline } = require("stream/promises");
const { get, run, now } = require("../db");
const { TMP } = require("../config");
const { sha, esc } = require("../lib/utils");
const { safe, nm, base, limitB } = require("../lib/paths");
const { usage, dirSize, move } = require("../lib/storage");
const { locked, addFail, fails } = require("./auth");

const PREFIX = "/dav";
const ALLOW = "OPTIONS, GET, HEAD, PUT, DELETE, MKCOL, COPY, MOVE, PROPFIND, PROPPATCH, LOCK, UNLOCK";
const MIME = { ".txt": "text/plain", ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".xml": "application/xml", ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".webm": "video/webm", ".zip": "application/zip", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".ppt": "application/vnd.ms-powerpoint", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".md": "text/markdown", ".csv": "text/csv" };
const mime = f => MIME[path.extname(f).toLowerCase()] || "application/octet-stream";

const send = (res, code, headers = {}, body = "") => { res.writeHead(code, { "Content-Length": Buffer.byteLength(body), ...headers }); res.end(body); };
const drain = req => new Promise(r => { req.on("end", r); req.on("error", r); req.on("close", r); req.resume(); });
const readBody = async req => { let s = ""; for await (const c of req) { s += c; if (s.length > 1e5) break; } return s; };
const href = (rel, dir) => PREFIX + "/" + rel.split("/").filter(Boolean).map(encodeURIComponent).join("/") + (dir && rel ? "/" : "");

// Comprueba (siguiendo enlaces simbólicos) que la ruta real sigue dentro de la carpeta del usuario
async function guard(root, f) {
  const rr = await fsp.realpath(root); let p = f;
  for (; ;) {
    let r = null;
    try { r = await fsp.realpath(p); } catch (e) { if (e.code !== "ENOENT" && e.code !== "ENOTDIR") throw e; }
    if (r) { if (r !== rr && !r.startsWith(rr + path.sep)) throw Object.assign(Error("fuera"), { code: "EOUT" }); return; }
    const q = path.dirname(p); if (q === p) return; p = q;
  }
}
const stat = f => fsp.stat(f).catch(() => null);

function login(req) {
  const m = /^Basic (.+)$/i.exec(req.headers.authorization || ""); if (!m) return null;
  const s = Buffer.from(m[1], "base64").toString("utf8"), i = s.indexOf(":"); if (i < 0) return null;
  const name = s.slice(0, i).trim().toLowerCase(), key = s.slice(i + 1), ip = req.ip || req.socket.remoteAddress || "";
  const k1 = "dav|" + ip, k2 = "davu|" + name;
  if (locked(k1) || locked(k2)) return "locked";
  const u = get("SELECT * FROM users WHERE username=?", name);
  let ok = false;
  if (u && u.dav_on && u.dav_hash && !u.suspended) {
    const a = Buffer.from(sha(key)), b = Buffer.from(u.dav_hash);
    ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  if (!ok) { addFail(k1); addFail(k2); return null; }
  fails.delete(k1); fails.delete(k2);
  return u;
}

const props = (rel, st, isRoot, extra) => {
  const dir = st.isDirectory();
  return `<D:response><D:href>${esc(href(rel, dir))}</D:href><D:propstat><D:prop><D:displayname>${esc(rel ? path.basename(rel) : "")}</D:displayname><D:resourcetype>${dir ? "<D:collection/>" : ""}</D:resourcetype>${dir ? "" : `<D:getcontentlength>${st.size}</D:getcontentlength><D:getcontenttype>${esc(mime(rel))}</D:getcontenttype>`}<D:getlastmodified>${st.mtime.toUTCString()}</D:getlastmodified><D:creationdate>${(st.birthtime || st.mtime).toISOString()}</D:creationdate><D:getetag>"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"</D:getetag>${isRoot && extra ? extra : ""}<D:supportedlock><D:lockentry><D:lockscope><D:exclusive/></D:lockscope><D:locktype><D:write/></D:locktype></D:lockentry></D:supportedlock></D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response>`;
};

async function handle(req, res) {
  const u0 = login(req);
  if (u0 === "locked") return send(res, 429, { "Retry-After": "900" }, "Demasiados intentos");
  if (!u0) return send(res, 401, { "WWW-Authenticate": 'Basic realm="SynapseBox", charset="UTF-8"' }, "Autenticación necesaria");
  const u = u0, root = base(u);
  await fsp.mkdir(root, { recursive: true });
  const url = (req.originalUrl || req.url).split("?")[0];
  const m = req.method.toUpperCase();
  if (url !== PREFIX && !url.startsWith(PREFIX + "/")) return send(res, 404);
  const toFs = p => { // URL -> ruta en disco dentro de la carpeta del usuario
    let rel; try { rel = decodeURIComponent(p.slice(PREFIX.length)); } catch { throw Object.assign(Error("url"), { code: "EBADURL" }); }
    rel = rel.split("/").filter(Boolean).join("/");
    return [rel, safe(root, rel)];
  };
  const [rel, f] = toFs(url);
  await guard(root, f);
  const isRoot = f === root;

  if (m === "OPTIONS") { await drain(req); return send(res, 200, { Allow: ALLOW, DAV: "1, 2", "MS-Author-Via": "DAV" }); }

  if (m === "PROPFIND" || m === "PROPPATCH") {
    await drain(req);
    const st = await stat(f); if (!st) return send(res, 404);
    const H = { "Content-Type": 'application/xml; charset="utf-8"' }, X = '<?xml version="1.0" encoding="utf-8"?><D:multistatus xmlns:D="DAV:">';
    if (m === "PROPPATCH") return send(res, 207, H, X + `<D:response><D:href>${esc(href(rel, st.isDirectory()))}</D:href><D:propstat><D:prop/><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response></D:multistatus>`);
    let extra = "";
    if (isRoot) { const used = await usage(u), lim = limitB(u); extra = `<D:quota-used-bytes>${used}</D:quota-used-bytes>${Number.isFinite(lim) ? `<D:quota-available-bytes>${Math.max(0, lim - used)}</D:quota-available-bytes>` : ""}`; }
    let out = props(rel, st, isRoot, extra);
    if (st.isDirectory() && String(req.headers.depth) !== "0")
      for (const e of await fsp.readdir(f)) { const s = await stat(path.join(f, e)); if (s) out += props(rel ? rel + "/" + e : e, s, false); }
    return send(res, 207, H, X + out + "</D:multistatus>");
  }

  if (m === "GET" || m === "HEAD") {
    const st = await stat(f); if (!st) return send(res, 404, {}, "No existe");
    const SEC = { "Content-Security-Policy": "sandbox", "X-Content-Type-Options": "nosniff" };
    if (st.isDirectory()) {
      const items = (await fsp.readdir(f, { withFileTypes: true })).map(e => `<li><a href="${esc(href(rel ? rel + "/" + e.name : e.name, e.isDirectory()))}">${esc(e.name)}${e.isDirectory() ? "/" : ""}</a></li>`).join("");
      const body = `<!doctype html><meta charset="utf-8"><title>SynapseBox WebDAV</title><h3>/${esc(rel)}</h3><ul>${items}</ul>`;
      return send(res, 200, { ...SEC, "Content-Type": "text/html; charset=utf-8" }, m === "HEAD" ? "" : body);
    }
    const size = st.size; let start = 0, end = size - 1, code = 200;
    const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (r && (r[1] || r[2]) && size) {
      if (r[1] === "") start = Math.max(0, size - +r[2]); else { start = +r[1]; if (r[2]) end = Math.min(end, +r[2]); }
      if (start > end || start >= size) return send(res, 416, { "Content-Range": `bytes */${size}` });
      code = 206;
    }
    const H = { ...SEC, "Content-Type": mime(f), "Content-Length": size ? end - start + 1 : 0, "Accept-Ranges": "bytes", "Last-Modified": st.mtime.toUTCString(), ETag: `"${size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(f))}` };
    if (code === 206) H["Content-Range"] = `bytes ${start}-${end}/${size}`;
    res.writeHead(code, H);
    if (m === "HEAD" || !size) return res.end();
    return fs.createReadStream(f, { start, end }).on("error", () => res.destroy()).pipe(res);
  }

  if (m === "PUT") {
    if (isRoot) { await drain(req); return send(res, 405); }
    const par = await stat(path.dirname(f)); if (!par || !par.isDirectory()) { await drain(req); return send(res, 409, {}, "Falta la carpeta superior"); }
    nm(path.basename(f));
    const ex = await stat(f);
    if (ex && ex.isDirectory()) { await drain(req); return send(res, 405); }
    if (ex && req.headers["if-none-match"] === "*") { await drain(req); return send(res, 412); }
    const room = limitB(u) - await usage(u) + (ex ? ex.size : 0), cl = Number(req.headers["content-length"]);
    if (cl > room) { await drain(req); return send(res, 507, {}, "Sin espacio suficiente"); }
    const tmp = path.join(TMP, "dav-" + crypto.randomBytes(8).toString("hex")); let n = 0;
    await fsp.mkdir(TMP, { recursive: true });
    try {
      await pipeline(req, new Transform({ transform(c, _, cb) { n += c.length; n > room ? cb(Object.assign(Error("cuota"), { code: "EQUOTA" })) : cb(null, c); } }), fs.createWriteStream(tmp));
      await move(tmp, f);
    } catch (e) { await fsp.rm(tmp, { force: true }); if (e.code === "EQUOTA") return send(res, 507); throw e; }
    run("UPDATE users SET used_bytes=MAX(0,used_bytes+?) WHERE id=?", n - (ex ? ex.size : 0), u.id);
    return send(res, ex ? 204 : 201);
  }

  if (m === "DELETE") {
    await drain(req);
    if (isRoot) return send(res, 403);
    if (!await stat(f)) return send(res, 404);
    await require("./trash").put(u, f, u.username); run("UPDATE users SET used_at=0 WHERE id=?", u.id);
    return send(res, 204);
  }

  if (m === "MKCOL") {
    const body = await readBody(req); if (body.trim()) return send(res, 415);
    if (isRoot || await stat(f)) return send(res, 405);
    const par = await stat(path.dirname(f)); if (!par || !par.isDirectory()) return send(res, 409);
    nm(path.basename(f)); await fsp.mkdir(f);
    return send(res, 201);
  }

  if (m === "COPY" || m === "MOVE") {
    await drain(req);
    let dest; try { dest = new URL(String(req.headers.destination || ""), "http://x").pathname; } catch { return send(res, 400); }
    if (dest !== PREFIX && !dest.startsWith(PREFIX + "/")) return send(res, 502, {}, "Destino fuera del servidor");
    const [, df] = toFs(dest); await guard(root, df);
    const src = await stat(f); if (!src) return send(res, 404);
    if (isRoot || df === root || df === f || df.startsWith(f + path.sep)) return send(res, 403);
    const dp = await stat(path.dirname(df)); if (!dp || !dp.isDirectory()) return send(res, 409);
    nm(path.basename(df));
    const ex = await stat(df);
    if (ex) { if (String(req.headers.overwrite).toUpperCase() === "F") return send(res, 412); await fsp.rm(df, { recursive: true }); }
    if (m === "COPY") {
      const need = src.isDirectory() ? await dirSize(f) : src.size;
      if (need > limitB(u) - await usage(u, true)) return send(res, 507, {}, "Sin espacio suficiente");
      await fsp.cp(f, df, { recursive: true, errorOnExist: true, force: false });
    } else await fsp.rename(f, df);
    run("UPDATE users SET used_at=0 WHERE id=?", u.id);
    return send(res, ex ? 204 : 201);
  }

  if (m === "LOCK") { // bloqueos «de cortesía» (sin estado): Office y Finder los exigen para poder guardar
    await drain(req);
    let created = false;
    if (!await stat(f)) {
      const par = await stat(path.dirname(f)); if (!par || !par.isDirectory()) return send(res, 409);
      nm(path.basename(f)); await fsp.writeFile(f, ""); created = true;
    }
    const tok = "opaquelocktoken:" + crypto.randomUUID();
    return send(res, created ? 201 : 200, { "Content-Type": 'application/xml; charset="utf-8"', "Lock-Token": `<${tok}>` },
      `<?xml version="1.0" encoding="utf-8"?><D:prop xmlns:D="DAV:"><D:lockdiscovery><D:activelock><D:locktype><D:write/></D:locktype><D:lockscope><D:exclusive/></D:lockscope><D:depth>infinity</D:depth><D:owner/><D:timeout>Second-3600</D:timeout><D:locktoken><D:href>${tok}</D:href></D:locktoken><D:lockroot><D:href>${esc(href(rel, false))}</D:href></D:lockroot></D:activelock></D:lockdiscovery></D:prop>`);
  }
  if (m === "UNLOCK") { await drain(req); return send(res, 204); }

  await drain(req); return send(res, 405, { Allow: ALLOW });
}

const handler = (req, res) => handle(req, res).catch(e => {
  if (res.headersSent) return res.destroy();
  const c = e.code;
  send(res, c === "EOUT" || c === "EACCES" || c === "EPERM" || /inválid/i.test(e.message) ? 403 : c === "ENOENT" ? 404 : c === "EBADURL" ? 400 : c === "ENOTEMPTY" || c === "EEXIST" ? 409 : 500, {}, c === "EOUT" ? "Prohibido" : "Error");
});

module.exports = { handler };
