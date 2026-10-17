// Middleware de actividad: observa las acciones de los usuarios (después de que terminan bien) y las manda al canal de
// registros de Discord. No toca los archivos ni la base de datos, y sin canal configurado no hace NADA (una comprobación).
// Nunca se envían contraseñas, códigos, claves ni enlaces completos (los tokens de los enlaces dan acceso).
const { get } = require("../db");
const { fix } = require("../lib/utils");
const { ROLES } = require("../services/collab");
const { md, code, log, active, fmt } = require("./logger");

const P = v => "/" + String(v ?? "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");   // ruta legible: "" -> "/"
const J = (dir, name) => P(String(dir ?? "") + "/" + String(name ?? ""));
const pth = r => r.query?.path ?? r.body?.path;
const plural = (n, a, b) => n === 1 ? a : b;
const role = k => ROLES[k]?.label || k;
// Si la acción se hizo dentro de una carpeta que otro usuario compartió, se indica de quién es
const where = r => {
  const id = r.query?.collab ?? r.body?.collab;
  if (id === undefined || id === null || id === "") return "";
  const o = get("SELECT o.username n FROM collabs c JOIN users o ON o.id=c.owner_id WHERE c.id=?", Number(id));
  return o ? ` *(carpeta compartida de ${md(o.n)})*` : "";
};
const lastOf = r => { const a = [].concat(r.body?.paths ?? r.body?.path ?? []); return a.length; };

// [método, ruta (texto o expresión), evento, qué hizo (null = no registrar), consulta previa opcional]
const RULES = [
  ["POST", "/api/register", "cuentas", () => "creó su cuenta"],
  ["POST", "/api/login", "acceso", (r, s) => s._body?.success && !s._body.need2fa ? "inició sesión" : null],
  ["POST", "/api/login/2fa", "acceso", (r, s) => s._body?.success ? "inició sesión (con 2FA)" : null],
  ["POST", "/api/recover", "cuentas", () => "recuperó su cuenta con un código de recuperación y puso una contraseña nueva"],
  ["POST", "/api/username", "cuentas", (r, s) => `cambió su nombre de usuario a **${md(s._body?.user)}**`],
  ["POST", "/api/password", "cuentas", () => "cambió su contraseña"],
  ["POST", "/api/2fa/enable", "cuentas", () => "activó la verificación en dos pasos (2FA)"],
  ["POST", "/api/2fa/disable", "cuentas", () => "desactivó la verificación en dos pasos (2FA)"],
  ["POST", "/api/recovery/regenerate", "cuentas", () => "generó códigos de recuperación nuevos"],
  ["POST", "/api/webdav/enable", "cuentas", () => "activó (o renovó) su acceso WebDAV"],
  ["POST", "/api/webdav/disable", "cuentas", () => "desactivó su acceso WebDAV"],
  ["POST", "/api/discord/unlink", "cuentas", () => "desvinculó su cuenta de Discord"],

  ["POST", "/api/mkdir", "archivos", r => `creó la carpeta ${code(J(P(r.body.path), r.body.name))}${where(r)}`],
  ["POST", "/api/create-file", "archivos", r => `creó el archivo ${code(J(P(r.body.path), r.body.name))}${where(r)}`],
  ["POST", "/api/upload", "archivos", r => {
    const f = r.files || []; if (!f.length) return null;
    const names = f.slice(0, 3).map(x => code(fix(x.originalname))).join(", ");
    return `subió ${f.length} ${plural(f.length, "archivo", "archivos")} (${fmt(f.reduce((a, x) => a + x.size, 0))}) a ${code(P(r.body.destPath))}${where(r)}: ${names}${f.length > 3 ? ` y ${f.length - 3} más` : ""}`;
  }],
  ["POST", "/api/edit", "archivos", r => `editó ${code(P(pth(r)))}${where(r)}`],
  ["POST", "/api/rename", "archivos", r => `renombró ${code(P(pth(r)))} a ${code(r.body.newName)}${where(r)}`],
  ["POST", "/api/move", "archivos", r => `movió ${code(P(pth(r)))} a ${code(P(r.body.dest))}${where(r)}`],
  ["POST", "/api/copy", "archivos", r => `copió ${code(P(pth(r)))}${r.body.dest ? " a " + code(P(r.body.dest)) : ""}${where(r)}`],
  ["POST", "/api/compress", "archivos", (r, s) => `comprimió ${lastOf(r)} ${plural(lastOf(r), "elemento", "elementos")} en ${code(s._body?.name)}${where(r)}`],
  ["POST", "/api/extract", "archivos", (r, s) => `descomprimió ${code(P(pth(r)))} en la carpeta ${code(s._body?.name)}${where(r)}`],
  ["POST", "/api/delete", "borrados", r => `eliminó ${code(P(pth(r)))}${where(r)}`],

  ["POST", "/api/share", "enlaces", r => `creó un enlace para compartir ${code(P(pth(r)))}${r.body.password ? " con contraseña" : ""}${Number(r.body.days) > 0 ? `, caduca en ${Number(r.body.days)} ${plural(Number(r.body.days), "día", "días")}` : ""}`],
  ["POST", "/api/share/revoke", "enlaces", () => "revocó uno de sus enlaces compartidos"],

  ["POST", "/api/collab/add", "colab", (r, s) => `añadió a **${md(s._body?.username)}** a la carpeta ${code(P(r.body.path))} con el rol «${md(role(r.body.role))}»`],
  ["POST", "/api/collab/role", "colab", r => r._dc?.c ? `cambió el rol de **${md(r._dc.c.username)}** en ${code(P(r._dc.c.path))} a «${md(role(r.body.role))}»` : null,
    r => ({ c: get("SELECT c.path,u.username FROM collabs c JOIN users u ON u.id=c.user_id WHERE c.id=? AND c.owner_id=?", Number(r.body.id), r.user.id) })],
  ["POST", "/api/collab/remove", "colab", r => {
    const c = r._dc?.c; if (!c) return null;
    return c.owner_id === r.user.id ? `quitó a **${md(c.cu)}** de la carpeta ${code(P(c.path))}` : `salió de la carpeta compartida ${code(P(c.path))} de **${md(c.ou)}**`;
  }, r => ({ c: get("SELECT c.path,c.owner_id,u.username cu,o.username ou FROM collabs c JOIN users u ON u.id=c.user_id JOIN users o ON o.id=c.owner_id WHERE c.id=?", Number(r.body.id)) })],

  ["POST", "/api/admin/users", "admin", r => `creó el usuario **${md(r.body.username)}**`],
  ["POST", /^\/api\/admin\/users\/(\d+)$/, "admin", r => {
    const t = r._dc?.t, b = r.body || {}; if (!t) return null; const ch = [];
    if (b.suspended !== undefined && !!b.suspended !== !!t.suspended) ch.push(b.suspended ? "la suspendió" : "la reactivó");
    if (b.is_admin !== undefined && !!b.is_admin !== !!t.is_admin) ch.push(b.is_admin ? "le dio rol de administrador" : "le quitó el rol de administrador");
    if (b.username !== undefined && String(b.username).trim() !== t.username) ch.push(`cambió su nombre a **${md(String(b.username).trim())}**`);
    if (b.password) ch.push("puso una contraseña nueva");
    else if (b.logout) ch.push("cerró sus sesiones");
    if (b.max_space_mb !== undefined && Number(b.max_space_mb) !== t.max_space_mb) ch.push(`cambió su cuota a ${Number(b.max_space_mb) < 0 ? "sin límite" : Number(b.max_space_mb) + " MB"}`);
    if (b.ai_limit !== undefined || b.ai_period !== undefined) ch.push("revisó su límite de IA");
    return ch.length ? `editó la cuenta de **${md(t.username)}**: ${ch.join(", ")}` : null;
  }, (r, m) => ({ t: get("SELECT username,is_admin,suspended,max_space_mb FROM users WHERE id=?", Number(m[1])) })],
  ["DELETE", /^\/api\/admin\/users\/(\d+)$/, "admin", r => r._dc?.t ? `eliminó al usuario **${md(r._dc.t.username)}** y todos sus archivos` : null,
    (r, m) => ({ t: get("SELECT username FROM users WHERE id=?", Number(m[1])) })],
  ["POST", "/api/admin/delete-file", "admin", r => `eliminó ${code(P(r.body.path))} de la carpeta de **${md(r.body.user)}**`],
  ["POST", "/api/admin/shares/revoke", "admin", r => r._dc?.s ? `revocó el enlace de **${md(r._dc.s.username)}** (${code(P(r._dc.s.path))})` : null,
    r => ({ s: get("SELECT s.path,u.username FROM shares s JOIN users u ON u.id=s.user_id WHERE s.token=?", String(r.body.token)) })],
  ["POST", "/api/admin/settings", "admin", () => "cambió los ajustes generales del servidor"],
  ["POST", "/api/admin/ai", "admin", () => "cambió la configuración de la IA"],
  ["POST", "/api/admin/community/unpublish", "admin", () => "retiró un tema de la comunidad"],
  ["POST", "/api/admin/discord", "admin", () => "cambió los ajustes del bot de Discord"],
  ["POST", "/api/admin/discord/clear", "admin", () => "quitó un canal del bot de Discord"],
];

const EXACT = new Map(RULES.filter(r => typeof r[1] === "string").map(r => [r[0] + " " + r[1], r]));
const PATTERN = RULES.filter(r => typeof r[1] !== "string");
function find(req) {
  const hit = EXACT.get(req.method + " " + req.path);
  if (hit) return [hit, null];
  for (const r of PATTERN) { if (r[0] !== req.method) continue; const m = r[1].exec(req.path); if (m) return [r, m]; }
  return null;
}

module.exports = function activity(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD" || !req.path.startsWith("/api/") || !active()) return next();
  const found = find(req); if (!found) return next();
  const [[, , event, build, pre], m] = found;
  try { if (pre) req._dc = pre(req, m); } catch { /* sin datos previos: se omite el detalle */ }
  const json = res.json;
  res.json = function (body) { res._body = body; return json.call(this, body); }; // para leer el resultado (nunca se copia)
  res.on("finish", () => {
    try {
      if (res.statusCode >= 400) return;
      const who = req.user?.username || res._body?.username; if (!who) return;
      const what = build(req, res); if (!what) return;
      log(event, `**${md(who)}**${event === "admin" ? " *(admin)*" : ""} ${what}`);
    } catch { /* un fallo al registrar nunca debe afectar a la petición */ }
  });
  next();
};
