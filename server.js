const express = require("express"), fs = require("fs"), fsp = fs.promises, path = require("path"),
  crypto = require("crypto"), os = require("os"), multer = require("multer"), si = require("systeminformation");
const { get, all, run, now, hash, verify } = require("./db");
const { zipTo } = require("./zip");

const PORT = process.env.PORT || 3001;
const HOSTING = path.join(__dirname, "hosting"), TMP = path.join(__dirname, "data", "tmp");
fs.mkdirSync(HOSTING, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", 1);

// ---------- utilidades ----------
const sha = t => crypto.createHash("sha256").update(t).digest("hex");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const setting = k => get("SELECT value FROM settings WHERE key=?", k)?.value;
const wrap = fn => (req, res) => Promise.resolve(fn(req, res)).catch(e => res.status(400).json({ error: e.message }));
const cookies = req => Object.fromEntries((req.headers.cookie || "").split(";").map(c => c.trim().split(/=(.*)/s).slice(0, 2)).filter(a => a[0]));
const fix = n => { const d = Buffer.from(n, "latin1").toString("utf8"); return d.includes("\ufffd") ? n : d; };

function safe(base, rel = "") {
  rel = String(rel);
  if (rel.includes("\0")) throw Error("Ruta inválida");
  const f = path.resolve(base, "." + path.sep + rel.replace(/\\/g, "/"));
  if (f !== base && !f.startsWith(base + path.sep)) throw Error("Ruta inválida");
  return f;
}
const nm = n => { n = String(n || "").trim(); if (!n || /[\/\\\0]/.test(n) || n === "." || n === ".." || n.length > 200) throw Error("Nombre inválido"); return n; };
const base = u => path.join(HOSTING, nm(u.username));
const limitB = u => u.max_space_mb < 0 ? Infinity : u.max_space_mb * 1048576;

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
const SAFE = new Set(".png .jpg .jpeg .gif .webp .bmp .ico .mp4 .webm .ogg .mp3 .wav .m4a .flac .aac .pdf".split(" "));
function serve(res, full, dl) {
  if (dl) return res.download(full, { dotfiles: "allow" });
  // Todo lo que no sea multimedia segura se sirve aislado (sandbox) para que no pueda actuar con tu sesión
  if (SAFE.has(path.extname(full).toLowerCase())) res.removeHeader("Content-Security-Policy");
  else res.set("Content-Security-Policy", "sandbox allow-scripts");
  res.sendFile(full, { dotfiles: "allow" });
}

// ---------- middleware ----------
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff", "X-Frame-Options": "SAMEORIGIN", "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; frame-src 'self'; object-src 'none'; base-uri 'self'"
  });
  next();
});
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use((req, res, next) => { // protección CSRF: el origen debe coincidir con el host
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin) {
    try { if (new URL(req.headers.origin).host !== req.headers.host) throw 0; }
    catch { return res.status(403).json({ error: "Origen no permitido" }); }
  }
  next();
});
app.use((req, res, next) => {
  req.user = null;
  const t = cookies(req).fc_sid;
  if (t) {
    const r = get("SELECT u.*,s.token sid FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?", sha(t), now());
    if (r && !r.suspended) { req.user = r; req.sid = r.sid; }
  }
  next();
});
const need = (req, res, next) => req.user ? next() : res.status(401).json({ error: "No autorizado" });
const needAdmin = (req, res, next) => !req.user ? res.status(401).json({ error: "No autorizado" }) : req.user.is_admin ? next() : res.status(403).json({ error: "Solo administradores" });

// ---------- autenticación ----------
const SESSION_MS = 7 * 864e5, fails = new Map();
const locked = k => { const f = fails.get(k); return f && f.n >= 5 && f.until > now(); };
const addFail = k => { const f = fails.get(k) || { n: 0 }; f.n++; f.until = now() + 15 * 60e3; fails.set(k, f); };

function startSession(req, res, uid) {
  const t = crypto.randomBytes(32).toString("hex");
  run("INSERT INTO sessions VALUES(?,?,?,?,?,?)", sha(t), uid, now(), now() + SESSION_MS, req.ip, String(req.headers["user-agent"] || "").slice(0, 200));
  res.set("Set-Cookie", `fc_sid=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}${req.secure ? "; Secure" : ""}`);
}
const checkPw = p => { if (String(p || "").length < 8) throw Error("La contraseña debe tener al menos 8 caracteres"); };

app.post("/api/register", wrap(async (req, res) => {
  if (setting("allow_registration") !== "1") throw Error("El registro está desactivado");
  const { username, password } = req.body;
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username || "")) throw Error("Usuario: 3-32 caracteres (letras, números, _ . -)");
  checkPw(password);
  if (get("SELECT 1 x FROM users WHERE username=?", username)) throw Error("Ese usuario ya existe");
  const first = get("SELECT COUNT(*) n FROM users").n === 0; // el primer usuario es administrador
  const r = run("INSERT INTO users(username,password_hash,is_admin,max_space_mb,created_at) VALUES(?,?,?,?,?)",
    username, hash(password), first ? 1 : 0, Number(setting("default_quota_mb")) || 100, now());
  await fsp.mkdir(path.join(HOSTING, username), { recursive: true });
  startSession(req, res, Number(r.lastInsertRowid));
  req.user = { username }; 
  res.json({ success: true });
}));

app.post("/api/login", (req, res) => {
  const username = String(req.body.username || ""), password = String(req.body.password || "");
  const key = req.ip + "|" + username.toLowerCase();
  if (locked(key)) return res.status(429).json({ error: "Demasiados intentos. Prueba de nuevo en 15 minutos." });
  const u = get("SELECT * FROM users WHERE username=?", username);
  if (!u || !verify(password, u.password_hash)) { addFail(key); return res.status(401).json({ error: "Credenciales inválidas" }); }
  if (u.suspended) return res.status(403).json({ error: "Cuenta suspendida. Contacta con un administrador." });
  fails.delete(key);
  run("UPDATE users SET last_login=?,last_ip=? WHERE id=?", now(), req.ip, u.id);
  startSession(req, res, u.id); req.user = u; 
  res.json({ success: true, admin: !!u.is_admin });
});

const logout = (req, res) => {
  const t = cookies(req).fc_sid;
  if (t) run("DELETE FROM sessions WHERE token=?", sha(t));
  res.set("Set-Cookie", "fc_sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
};
app.post("/api/logout", (req, res) => { logout(req, res); res.json({ success: true }); });
app.get("/logout", (req, res) => { logout(req, res); res.redirect("/"); });

app.get("/api/session", (req, res) => res.json(req.user ? { logged: true, user: req.user.username, admin: !!req.user.is_admin, registration: false, announcement: setting("announcement") || "" } : { logged: false, registration: setting("allow_registration") === "1" }));

app.post("/api/password", need, wrap(async (req, res) => {
  const { current, next } = req.body;
  if (!verify(String(current || ""), req.user.password_hash)) throw Error("La contraseña actual no es correcta");
  checkPw(next);
  run("UPDATE users SET password_hash=? WHERE id=?", hash(next), req.user.id);
  run("DELETE FROM sessions WHERE user_id=? AND token<>?", req.user.id, req.sid); // cierra las demás sesiones
  res.json({ success: true });
}));

// ---------- archivos del usuario ----------
app.get("/api/list", need, wrap(async (req, res) => {
  const u = req.user, dir = safe(base(u), req.query.path);
  await fsp.mkdir(base(u), { recursive: true });
  const es = await fsp.readdir(dir, { withFileTypes: true }).catch(() => { throw Error("Ruta no encontrada"); });
  const items = [];
  for (const e of es) {
    const s = await fsp.stat(path.join(dir, e.name)).catch(() => null);
    if (s) items.push({ name: e.name, isDir: s.isDirectory(), size: s.isDirectory() ? 0 : s.size, mtime: s.mtimeMs });
  }
  const used = await usage(u);
  res.json({ items, usedBytes: used, maxMB: u.max_space_mb, favs: all("SELECT path FROM favs WHERE user_id=?", u.id).map(r => r.path) });
}));

app.post("/api/mkdir", need, wrap(async (req, res) => {
  await fsp.mkdir(safe(safe(base(req.user), req.body.path), nm(req.body.name))); res.json({ success: true });
}));

app.post("/api/create-file", need, wrap(async (req, res) => {
  const u = req.user, content = String(req.body.content || "");
  if (await usage(u, true) + Buffer.byteLength(content) > limitB(u)) throw Error("Has alcanzado tu límite de almacenamiento");
  const dir = safe(base(u), req.body.path), n = nm(req.body.name);
  if (await fsp.access(path.join(dir, n)).then(() => 1, () => 0)) throw Error("Ya existe un archivo con ese nombre");
  await fsp.writeFile(path.join(dir, n), content); await usage(u, true); res.json({ success: true });
}));

app.post("/api/upload", need, wrap(async (req, res) => {
  const u = req.user, rem = limitB(u) - await usage(u, true), NOSPACE = "No hay espacio suficiente";
  if (Number(req.headers["content-length"] || 0) > rem + 1e6) throw Error(NOSPACE);
  await new Promise((ok, ko) => multer({ dest: TMP, limits: { fileSize: Number.isFinite(rem) ? Math.max(rem, 1) : undefined } })
    .array("files")(req, res, e => e ? ko(e.code === "LIMIT_FILE_SIZE" ? Error(NOSPACE) : e) : ok()));
  const files = req.files || [];
  try {
    if (files.reduce((s, f) => s + f.size, 0) > rem) throw Error(NOSPACE);
    const dir = safe(base(u), req.body.destPath);
    await fsp.mkdir(dir, { recursive: true });
    const rels = [].concat(req.body.paths ?? []);
    for (const [i, f] of files.entries()) { // "paths" conserva la estructura al subir carpetas
      const sub = path.dirname(String(rels[i] || "")), d2 = sub === "." ? dir : safe(dir, sub);
      await fsp.mkdir(d2, { recursive: true });
      await move(f.path, path.join(d2, await uniq(d2, nm(path.basename(fix(f.originalname))))));
    }
    
  } finally { await Promise.all(files.map(f => fsp.rm(f.path, { force: true }))); }
  await usage(u, true); res.json({ success: true });
}));

const fileOf = req => { const f = safe(base(req.user), req.query.path || req.body.path); if (f === base(req.user)) throw Error("Falta ruta"); return f; };
app.get("/api/download", need, wrap(async (req, res) => serve(res, fileOf(req), true)));
app.get("/api/preview", need, wrap(async (req, res) => serve(res, fileOf(req))));
app.get("/api/file-content", need, wrap(async (req, res) => {
  const f = fileOf(req), s = await fsp.stat(f);
  if (s.isDirectory() || s.size > 2e6) throw Error("No se puede editar este archivo");
  res.json({ content: await fsp.readFile(f, "utf8") });
}));
app.post("/api/edit", need, wrap(async (req, res) => {
  const u = req.user, f = fileOf(req), c = String(req.body.content ?? ""), old = (await fsp.stat(f)).size;
  if (await usage(u, true) - old + Buffer.byteLength(c) > limitB(u)) throw Error("Has alcanzado tu límite de almacenamiento");
  await fsp.writeFile(f, c); await usage(u, true); res.json({ success: true });
}));
app.post("/api/rename", need, wrap(async (req, res) => {
  const f = fileOf(req), t = path.join(path.dirname(f), nm(req.body.newName));
  if (await fsp.access(t).then(() => 1, () => 0)) throw Error("Ya existe ese nombre");
  await fsp.rename(f, t); res.json({ success: true });
}));
app.post("/api/move", need, wrap(async (req, res) => {
  const f = fileOf(req), dir = safe(base(req.user), req.body.dest), t = path.join(dir, path.basename(f));
  if (t === f) return res.json({ success: true });
  if ((dir + path.sep).startsWith(f + path.sep)) throw Error("No puedes mover una carpeta dentro de sí misma");
  if (!(await fsp.stat(dir).catch(() => null))?.isDirectory()) throw Error("La carpeta destino no existe");
  if (await fsp.access(t).then(() => 1, () => 0)) throw Error("Ya existe un elemento con ese nombre en el destino");
  await fsp.rename(f, t); res.json({ success: true });
}));
app.post("/api/delete", need, wrap(async (req, res) => {
  const u = req.user, f = fileOf(req), rel = path.relative(base(u), f);
  await fsp.rm(f, { recursive: true, force: true });
  for (const s of all("SELECT token,path FROM shares WHERE user_id=?", u.id))
    if (s.path === rel || s.path.startsWith(rel + path.sep)) run("DELETE FROM shares WHERE token=?", s.token);
  await usage(u, true); res.json({ success: true });
}));

// ---------- enlaces para compartir ----------
app.post("/api/share", need, wrap(async (req, res) => {
  const f = fileOf(req), s = await fsp.stat(f), days = Number(req.body.days) || 0, token = crypto.randomBytes(12).toString("base64url");
  run("INSERT INTO shares VALUES(?,?,?,?,?,?,?)", token, req.user.id, path.relative(base(req.user), f), s.isDirectory() ? 1 : 0, days > 0 ? now() + days * 864e5 : null, now(), req.body.password ? hash(String(req.body.password)) : null);
  res.json({ success: true, url: `${req.protocol}://${req.get("host")}/s/${token}` });
}));
app.get("/api/shares", need, (req, res) => res.json({ shares: all("SELECT * FROM shares WHERE user_id=? ORDER BY created_at DESC", req.user.id) }));
app.post("/api/share/revoke", need, (req, res) => { run("DELETE FROM shares WHERE token=? AND user_id=?", String(req.body.token), req.user.id); res.json({ success: true }); });

const IC = (n, c = "") => `<svg class="i ${c}"><use href="/icons.svg#${n}"/></svg>`;
const themeCss = t => t ? ":root{" + [...COLORS.filter(k => t[k]).map(k => `--${k}:${t[k]}`), t.r !== undefined && `--r:${t.r}px`, t.font && `--font:${FONTS[t.font]}`, t.sp && `--sp:${t.sp}`].filter(Boolean).join(";") + "}" : "";
const page = (t, b, th) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t)}</title><link rel="stylesheet" href="/style.css"><style>${themeCss(th)}</style></head><body><header class="top"><a class="brand" href="/"><span class="logo">${IC("cloud")}</span>File Cloud</a></header><main class="wrap share">${b}</main><footer class="foot muted">Compartido con File Cloud</footer></body></html>`;
const bytes = b => b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : b < 1073741824 ? (b / 1048576).toFixed(1) + " MB" : (b / 1073741824).toFixed(2) + " GB";
const KINDS = { image: ".png .jpg .jpeg .gif .webp .bmp .svg .ico", video: ".mp4 .webm .mov .mkv .ogg", audio: ".mp3 .wav .flac .m4a .aac", doc: ".pdf .doc .docx .txt .md .odt .csv", code: ".js .json .html .htm .css .xml .py .java .c .cpp .h .php .yml" };
const kind = e => Object.keys(KINDS).find(k => KINDS[k].split(" ").includes(e)) || "file";
const expTxt = s => s.expires_at ? "Caduca el " + new Date(s.expires_at).toLocaleDateString("es") : "Sin caducidad";

function shareCtx(req) {
  const s = get("SELECT s.*,u.username,u.suspended,u.theme FROM shares s JOIN users u ON u.id=s.user_id WHERE s.token=?", req.params.token);
  if (!s || s.suspended || (s.expires_at && s.expires_at < now())) return null;
  try {
    const root = safe(path.join(HOSTING, nm(s.username)), s.path), full = safe(root, req.query.p);
    return fs.existsSync(full) ? { s, root, full, th: userTheme(s) } : null;
  } catch { return null; }
}
const unlocked = (req, s) => !s.pw || cookies(req)["fc_s_" + s.token] === sha(s.pw + s.token);
app.post("/s/:token/unlock", (req, res) => {
  const tk = req.params.token, s = get("SELECT * FROM shares WHERE token=?", tk), key = "sh|" + req.ip + tk, back = "/s/" + encodeURIComponent(tk);
  if (!s || !s.pw) return res.redirect(back);
  if (locked(key) || !verify(String(req.body.password || ""), s.pw)) { addFail(key); return res.redirect(back + "?bad=1"); }
  fails.delete(key);
  res.set("Set-Cookie", `fc_s_${tk}=${sha(s.pw + tk)}; HttpOnly; SameSite=Lax; Path=/s/${tk}; Max-Age=86400${req.secure ? "; Secure" : ""}`);
  res.redirect(back);
});
app.get("/s/:token/raw", (req, res) => {
  const c = shareCtx(req);
  if (!c || fs.statSync(c.full).isDirectory()) return res.sendStatus(404);
  if (!unlocked(req, c.s)) return res.sendStatus(403);
  serve(res, c.full, req.query.dl);
});
app.get("/s/:token/zip", async (req, res) => {
  const c = shareCtx(req);
  if (!c || !fs.statSync(c.full).isDirectory()) return res.sendStatus(404);
  if (!unlocked(req, c.s)) return res.sendStatus(403);
  try { await zipTo(res, [{ abs: c.full, name: path.basename(c.full) }], path.basename(c.full)); } catch (e) { res.status(400).send(e.message); }
});
app.get("/s/:token", (req, res) => {
  try {
    const c = shareCtx(req), t = encodeURIComponent(req.params.token);
    if (!c) return res.status(404).send(page("No encontrado", `<div class="card sh-hero"><div class="sh-ico bad">${IC("ban")}</div><h2>Enlace no disponible</h2><p class="muted">Ha caducado, fue revocado o el archivo ya no existe.</p></div>`));
    if (!unlocked(req, c.s)) return res.send(page("Enlace protegido", `<div class="card sh-hero"><div class="sh-ico">${IC("lock")}</div><h2>Enlace protegido</h2><p class="muted">Introduce la contraseña para continuar.</p><form method="post" action="/s/${t}/unlock" class="sh-form"><input class="input" type="password" name="password" placeholder="Contraseña" autofocus required><div class="err">${req.query.bad ? "Contraseña incorrecta" : ""}</div><button class="btn">${IC("key")} Abrir</button></form></div>`, c.th));
    const q = p => `?p=${encodeURIComponent(p)}`, rel = path.relative(c.root, c.full), st = fs.statSync(c.full), name = path.basename(c.full), up = path.dirname(rel) === "." ? "" : path.dirname(rel);
    const meta = n => `<div class="sh-meta"><span>${IC("user")} ${esc(c.s.username)}</span>${n}<span>${IC("clock")} ${expTxt(c.s)}</span></div>`;
    const crumbs = () => { const ps = rel ? rel.split(path.sep) : []; return `<nav class="crumbs">${ps.length ? `<a href="/s/${t}">${esc(path.basename(c.root))}</a>` : `<b>${esc(path.basename(c.root))}</b>`}${ps.map((p, i) => i < ps.length - 1 ? `›<a href="/s/${t}${q(ps.slice(0, i + 1).join("/"))}">${esc(p)}</a>` : `›<b>${esc(p)}</b>`).join("")}</nav>`; };
    if (st.isDirectory()) {
      const es = fs.readdirSync(c.full, { withFileTypes: true }).sort((a, b) => b.isDirectory() - a.isDirectory() || a.name.localeCompare(b.name));
      const cards = es.map(e => { const isD = e.isDirectory(); return `<a class="item" href="/s/${t}${q(path.join(rel, e.name))}"><div class="ico">${IC(isD ? "folder" : kind(path.extname(e.name).toLowerCase()))}</div><div class="meta"><b>${esc(e.name)}</b><small>${isD ? "Carpeta" : bytes(fs.statSync(path.join(c.full, e.name)).size)}</small></div></a>`; }).join("") || `<p class="muted">Carpeta vacía</p>`;
      return res.send(page(name, `<div class="card sh-hero"><div class="sh-ico">${IC("folder")}</div><h2 class="sh-name">${esc(name)}</h2>${meta(`<span>${IC("file")} ${es.length} elemento(s)</span>`)}<div class="row sh-act"><a class="btn" href="/s/${t}/zip${q(rel)}">${IC("zip")} Descargar todo (.zip)</a></div></div><div class="card" style="margin-top:12px">${crumbs()}<div class="grid">${cards}</div></div>`, c.th));
    }
    const ext = path.extname(c.full).toLowerCase(), raw = `/s/${t}/raw${q(rel)}`;
    let pv = `<p class="muted">Sin vista previa para este tipo de archivo.</p>`;
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].includes(ext)) pv = `<img class="pv" src="${raw}" alt="${esc(name)}">`;
    else if ([".mp4", ".webm", ".ogg", ".mov"].includes(ext)) pv = `<video class="pv" controls src="${raw}"></video>`;
    else if ([".mp3", ".wav", ".flac", ".aac", ".m4a"].includes(ext)) pv = `<audio controls style="width:100%" src="${raw}"></audio>`;
    else if ([".pdf", ".html", ".htm"].includes(ext)) pv = `<iframe class="pv frame" src="${raw}" sandbox="allow-scripts"></iframe>`;
    else if ([".txt", ".md", ".json", ".log", ".csv", ".js", ".css", ".py", ".xml"].includes(ext) && st.size < 2e6) pv = `<pre class="code">${esc(fs.readFileSync(c.full, "utf8").slice(0, 20000))}</pre>`;
    res.send(page(name, `<div class="card sh-hero"><div class="sh-ico">${IC(kind(ext))}</div><h2 class="sh-name">${esc(name)}</h2>${meta(`<span>${IC("file")} ${bytes(st.size)}</span>`)}<div class="row sh-act"><a class="btn" href="${raw}&dl=1">${IC("download")} Descargar</a>${c.s.is_dir ? `<a class="btn ghost" href="/s/${t}${q(up)}">${IC("back")} Volver</a>` : ""}</div></div><div class="card sh-pv">${c.s.is_dir ? crumbs() : ""}${pv}</div>`, c.th));
  } catch { res.status(500).send("Error al mostrar el enlace"); }
});

// ---------- administración ----------
app.get("/api/admin/server", needAdmin, wrap(async (req, res) => {
  const [l, m, d] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize()]), dk = d[0] || {};
  res.json({
    cpu: l.currentLoad, memUsed: m.total - m.available, memTotal: m.total, diskUsed: dk.used, diskTotal: dk.size, uptime: os.uptime(),
    users: get("SELECT COUNT(*) n FROM users").n, stored: get("SELECT COALESCE(SUM(used_bytes),0) n FROM users").n,
    shares: get("SELECT COUNT(*) n FROM shares").n, sessions: get("SELECT COUNT(*) n FROM sessions WHERE expires_at>?", now()).n
  });
}));
app.get("/api/admin/users", needAdmin, wrap(async (req, res) => {
  const us = all("SELECT id,username,is_admin,suspended,max_space_mb,used_bytes,used_at,created_at,last_login,last_ip FROM users ORDER BY username");
  for (const u of us) await usage(u);
  res.json({ users: us.map(({ used_at, ...u }) => u), me: req.user.id });
}));
app.post("/api/admin/users", needAdmin, wrap(async (req, res) => {
  const { username, password, max_space_mb, is_admin } = req.body;
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username || "")) throw Error("Usuario inválido");
  checkPw(password);
  if (get("SELECT 1 x FROM users WHERE username=?", username)) throw Error("Ese usuario ya existe");
  const q = Number(max_space_mb);
  run("INSERT INTO users(username,password_hash,is_admin,max_space_mb,created_at) VALUES(?,?,?,?,?)", username, hash(password), is_admin ? 1 : 0, Number.isFinite(q) ? (q < 0 ? -1 : q) : 100, now());
  await fsp.mkdir(path.join(HOSTING, username), { recursive: true });
  res.json({ success: true });
}));
app.post("/api/admin/users/:id", needAdmin, wrap(async (req, res) => {
  const t = get("SELECT * FROM users WHERE id=?", req.params.id), b = req.body;
  if (!t) throw Error("Usuario no encontrado");
  if (t.id === req.user.id && (b.is_admin === false || b.suspended === true)) throw Error("No puedes quitarte el rol de admin ni suspenderte");
  if (b.max_space_mb !== undefined) { const v = Number(b.max_space_mb); if (!Number.isFinite(v)) throw Error("Límite inválido"); run("UPDATE users SET max_space_mb=? WHERE id=?", v < 0 ? -1 : v, t.id); }
  if (b.is_admin !== undefined) run("UPDATE users SET is_admin=? WHERE id=?", b.is_admin ? 1 : 0, t.id);
  if (b.suspended !== undefined) { run("UPDATE users SET suspended=? WHERE id=?", b.suspended ? 1 : 0, t.id); if (b.suspended) run("DELETE FROM sessions WHERE user_id=?", t.id); }
  if (b.password) { checkPw(b.password); run("UPDATE users SET password_hash=? WHERE id=?", hash(b.password), t.id); b.logout = true; }
  if (b.logout) run("DELETE FROM sessions WHERE user_id=? AND token<>?", t.id, req.sid);
  res.json({ success: true });
}));
app.delete("/api/admin/users/:id", needAdmin, wrap(async (req, res) => {
  const t = get("SELECT * FROM users WHERE id=?", req.params.id);
  if (!t) throw Error("Usuario no encontrado");
  if (t.id === req.user.id) throw Error("No puedes borrar tu propia cuenta");
  run("DELETE FROM users WHERE id=?", t.id);
  await fsp.rm(base(t), { recursive: true, force: true });
  res.json({ success: true });
}));

const target = req => { const u = get("SELECT * FROM users WHERE username=?", String(req.query.user || req.body.user)); if (!u) throw Error("Usuario no encontrado"); return u; };
app.get("/api/admin/files", needAdmin, wrap(async (req, res) => {
  const dir = safe(base(target(req)), req.query.path);
  const es = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
  const items = [];
  for (const e of es) { const s = await fsp.stat(path.join(dir, e.name)).catch(() => null); if (s) items.push({ name: e.name, isDir: s.isDirectory(), size: s.isDirectory() ? 0 : s.size }); }
  res.json({ items });
}));
app.get("/api/admin/file", needAdmin, wrap(async (req, res) => serve(res, safe(base(target(req)), req.query.path), req.query.dl)));
app.post("/api/admin/delete-file", needAdmin, wrap(async (req, res) => {
  const u = target(req), f = safe(base(u), req.body.path);
  if (f === base(u)) throw Error("Ruta inválida");
  await fsp.rm(f, { recursive: true, force: true }); await usage(u, true);
  res.json({ success: true });
}));
app.get("/api/admin/settings", needAdmin, (req, res) => res.json({ allow_registration: setting("allow_registration") === "1", default_quota_mb: Number(setting("default_quota_mb")), announcement: setting("announcement") || "" }));
app.post("/api/admin/settings", needAdmin, wrap(async (req, res) => {
  const q = Number(req.body.default_quota_mb);
  if (!Number.isFinite(q)) throw Error("Cuota inválida");
  run("UPDATE settings SET value=? WHERE key='allow_registration'", req.body.allow_registration ? "1" : "0");
  run("UPDATE settings SET value=? WHERE key='default_quota_mb'", String(q));
  run("INSERT OR REPLACE INTO settings VALUES('announcement',?)", String(req.body.announcement || "").slice(0, 300));
  res.json({ success: true });
}));

// ---------- apariencia (tema por usuario) ----------
const FONTS = { system: 'Inter,"Segoe UI",system-ui,sans-serif', serif: 'Georgia,"Times New Roman",serif', mono: "ui-monospace,Menlo,Consolas,monospace", rounded: 'ui-rounded,Nunito,"Segoe UI",system-ui,sans-serif' };
const COLORS = ["bg", "card", "card2", "text", "muted", "accent", "on", "danger", "ok", "warn"];
function cleanTheme(t) {
  if (!t || typeof t !== "object") return null;
  const o = {};
  for (const k of COLORS) if (/^#[0-9a-f]{6}$/i.test(t[k])) o[k] = t[k];
  if (t.r !== undefined && Number.isFinite(Number(t.r))) o.r = Math.max(0, Math.min(28, Math.round(Number(t.r))));
  if (FONTS[t.font]) o.font = t.font;
  if (["0.8", "1", "1.25"].includes(String(t.sp))) o.sp = String(t.sp);
  return Object.keys(o).length ? o : null;
}
const userTheme = u => { try { return cleanTheme(JSON.parse(u?.theme || "null")); } catch { return null; } };
app.get("/theme.css", (req, res) => {
  const t = userTheme(req.user);
  res.type("css").set("Cache-Control", "no-cache");
  res.send(themeCss(t));
});
app.get("/api/theme", need, (req, res) => res.json({ theme: userTheme(req.user) }));
app.post("/api/theme", need, (req, res) => {
  const t = cleanTheme(req.body.theme);
  run("UPDATE users SET theme=? WHERE id=?", t ? JSON.stringify(t) : null, req.user.id); res.json({ success: true });
});

app.get("/api/themes", need, (req, res) => res.json({ themes: all("SELECT name,data,public FROM user_themes WHERE user_id=? ORDER BY name", req.user.id).map(r => ({ name: r.name, public: !!r.public, theme: cleanTheme(JSON.parse(r.data)) })) }));
app.post("/api/themes", need, wrap(async (req, res) => {
  const name = String(req.body.name || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40), t = cleanTheme(req.body.theme);
  if (!name || !t) throw Error("Tema inválido");
  if (!get("SELECT 1 x FROM user_themes WHERE user_id=? AND name=?", req.user.id, name) && get("SELECT COUNT(*) n FROM user_themes WHERE user_id=?", req.user.id).n >= 50) throw Error("Máximo 50 temas guardados");
  run("INSERT INTO user_themes(user_id,name,data) VALUES(?,?,?) ON CONFLICT(user_id,name) DO UPDATE SET data=excluded.data", req.user.id, name, JSON.stringify(t)); res.json({ success: true });
}));
app.post("/api/themes/publish", need, wrap(async (req, res) => {
  const r = run("UPDATE user_themes SET public=? WHERE user_id=? AND name=?", req.body.public ? 1 : 0, req.user.id, String(req.body.name || ""));
  if (!r.changes) throw Error("Tema no encontrado"); res.json({ success: true });
}));
app.get("/api/community", need, (req, res) => res.json({ themes: all("SELECT t.rowid id,t.name,t.data,t.user_id,u.username author FROM user_themes t JOIN users u ON u.id=t.user_id WHERE t.public=1 AND u.suspended=0 ORDER BY t.rowid DESC LIMIT 300").map(r => ({ id: r.id, name: r.name, author: r.author, mine: r.user_id === req.user.id, theme: cleanTheme(JSON.parse(r.data)) })) }));
app.post("/api/community/save", need, wrap(async (req, res) => {
  const r = get("SELECT t.name,t.data,u.username author FROM user_themes t JOIN users u ON u.id=t.user_id WHERE t.rowid=? AND t.public=1", Number(req.body.id));
  if (!r) throw Error("El tema ya no está disponible");
  const has = n => get("SELECT data FROM user_themes WHERE user_id=? AND name=?", req.user.id, n);
  let name = r.name;
  if (has(name) && has(name).data !== r.data) name = (r.name + " (" + r.author + ")").slice(0, 40);
  if (!has(name) && get("SELECT COUNT(*) n FROM user_themes WHERE user_id=?", req.user.id).n >= 50) throw Error("Máximo 50 temas guardados");
  run("INSERT INTO user_themes(user_id,name,data) VALUES(?,?,?) ON CONFLICT(user_id,name) DO UPDATE SET data=excluded.data", req.user.id, name, r.data);
  res.json({ success: true, name });
}));
app.post("/api/admin/community/unpublish", needAdmin, (req, res) => { run("UPDATE user_themes SET public=0 WHERE rowid=?", Number(req.body.id)); res.json({ success: true }); });
app.delete("/api/themes", need, (req, res) => { run("DELETE FROM user_themes WHERE user_id=? AND name=?", req.user.id, String(req.body.name || "")); res.json({ success: true }); });

// ---------- extras: búsqueda, copiar, estadísticas, sesiones ----------
app.get("/api/search", need, wrap(async (req, res) => {
  const q = String(req.query.q || "").toLowerCase().trim(), b = base(req.user), out = [], stack = [b];
  if (q.length < 2) throw Error("Escribe al menos 2 caracteres");
  while (stack.length && out.length < 200) {
    const d = stack.pop(), es = await fsp.readdir(d, { withFileTypes: true }).catch(() => []);
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.name.toLowerCase().includes(q)) { const s = await fsp.stat(p).catch(() => null); if (s) out.push({ name: e.name, path: path.relative(b, p), isDir: s.isDirectory(), size: s.isDirectory() ? 0 : s.size, mtime: s.mtimeMs }); }
      if (e.isDirectory()) stack.push(p);
    }
  }
  res.json({ items: out });
}));
app.post("/api/copy", need, wrap(async (req, res) => {
  const u = req.user, f = fileOf(req), dir = safe(base(u), req.body.dest ?? path.dirname(path.relative(base(u), f)));
  if (!(await fsp.stat(dir).catch(() => null))?.isDirectory()) throw Error("La carpeta destino no existe");
  if ((dir + path.sep).startsWith(f + path.sep)) throw Error("No puedes copiar una carpeta dentro de sí misma");
  const s = await fsp.stat(f), size = s.isDirectory() ? await dirSize(f) : s.size;
  if (await usage(u, true) + size > limitB(u)) throw Error("No hay espacio suficiente");
  await fsp.cp(f, path.join(dir, await uniq(dir, path.basename(f))), { recursive: true });
  await usage(u, true); res.json({ success: true });
}));
app.get("/api/stats", need, wrap(async (req, res) => {
  const T = { "Imágenes": ".png .jpg .jpeg .gif .webp .bmp .svg", "Vídeo": ".mp4 .webm .mov .mkv", "Audio": ".mp3 .wav .flac .m4a .aac .ogg", "Documentos": ".pdf .doc .docx .xls .xlsx .ppt .pptx .txt .md .csv .odt" };
  const out = { "Imágenes": 0, "Vídeo": 0, "Audio": 0, "Documentos": 0, "Otros": 0 }, stack = [base(req.user)];
  while (stack.length) {
    const d = stack.pop(), es = await fsp.readdir(d, { withFileTypes: true }).catch(() => []);
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { stack.push(p); continue; }
      const s = await fsp.stat(p).catch(() => null); if (!s) continue;
      const x = path.extname(e.name).toLowerCase();
      out[Object.keys(T).find(k => T[k].split(" ").includes(x)) || "Otros"] += s.size;
    }
  }
  res.json({ stats: out });
}));
app.post("/api/sessions/revoke-others", need, (req, res) => { run("DELETE FROM sessions WHERE user_id=? AND token<>?", req.user.id, req.sid); res.json({ success: true }); });

app.get("/api/admin/shares", needAdmin, (req, res) => res.json({ shares: all("SELECT s.token,s.path,s.expires_at,s.created_at,s.pw IS NOT NULL locked,u.username FROM shares s JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC LIMIT 300") }));
app.post("/api/admin/shares/revoke", needAdmin, (req, res) => { run("DELETE FROM shares WHERE token=?", String(req.body.token)); res.json({ success: true }); });

app.post("/api/fav", need, wrap(async (req, res) => {
  const p = path.relative(base(req.user), fileOf(req)), had = get("SELECT 1 x FROM favs WHERE user_id=? AND path=?", req.user.id, p);
  if (had) run("DELETE FROM favs WHERE user_id=? AND path=?", req.user.id, p); else run("INSERT INTO favs VALUES(?,?)", req.user.id, p);
  res.json({ fav: !had });
}));
app.get("/api/favs", need, wrap(async (req, res) => {
  const b = base(req.user), items = [];
  for (const { path: p } of all("SELECT path FROM favs WHERE user_id=?", req.user.id)) {
    const s = await fsp.stat(safe(b, p)).catch(() => null);
    if (!s) { run("DELETE FROM favs WHERE user_id=? AND path=?", req.user.id, p); continue; }
    items.push({ name: path.basename(p), path: p, isDir: s.isDirectory(), size: s.isDirectory() ? 0 : s.size, mtime: s.mtimeMs });
  }
  res.json({ items });
}));
app.get("/api/recent", need, wrap(async (req, res) => {
  const b = base(req.user), top = [], stack = [b];
  while (stack.length) {
    const d = stack.pop(), es = await fsp.readdir(d, { withFileTypes: true }).catch(() => []);
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { stack.push(p); continue; }
      const s = await fsp.stat(p).catch(() => null); if (!s) continue;
      top.push({ name: e.name, path: path.relative(b, p), isDir: false, size: s.size, mtime: s.mtimeMs });
      if (top.length > 60) { top.sort((a, c) => c.mtime - a.mtime); top.length = 30; }
    }
  }
  res.json({ items: top.sort((a, c) => c.mtime - a.mtime).slice(0, 30) });
}));
app.get("/api/zip", need, wrap(async (req, res) => {
  const b = base(req.user), ps = [].concat(req.query.path || []).map(String), abs = ps.map(p => safe(b, p));
  if (!abs.length || abs.includes(b)) throw Error("Falta ruta");
  await zipTo(res, abs.map(a => ({ abs: a, name: path.basename(a) })), abs.length === 1 ? path.basename(abs[0]) : "archivos");
}));

// ---------- páginas estáticas protegidas ----------
app.get(["/", "/index.html"], (req, res, next) => req.user ? res.redirect("/panel.html") : next());
app.get(["/panel.html", "/themes.html"], (req, res, next) => req.user ? next() : res.redirect("/"));
app.use("/admin", (req, res, next) => req.user?.is_admin ? next() : res.redirect("/"));
app.use(express.static(path.join(__dirname, "public")));
app.use((err, req, res, next) => res.status(500).json({ error: "Error interno" }));

setInterval(() => {
  run("DELETE FROM sessions WHERE expires_at<?", now());
  run("DELETE FROM shares WHERE expires_at IS NOT NULL AND expires_at<?", now());
  for (const [k, f] of fails) if (f.until < now()) fails.delete(k);
}, 36e5).unref();

if (!get("SELECT COUNT(*) n FROM users").n)
  console.warn("AVISO: no hay usuarios en la base de datos. Si vienes de la versión anterior, copia tu users.json a data/ y reinicia; o crea un usuario con: node reset-password.js <usuario> <contraseña> --admin");
app.listen(PORT, () => console.log(`File Cloud corriendo en http://localhost:${PORT}`));
