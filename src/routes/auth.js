// Registro, inicio y cierre de sesión, y ajustes de la cuenta propia.
const router = require("express").Router();
const { get, run, now, hash, verify } = require("../db");
const fsp = require("fs").promises, path = require("path");
const { HOSTING } = require("../config");
const { sha, wrap, cookies } = require("../lib/utils");
const { setting } = require("../lib/settings");
const { need } = require("../middleware/auth");
const { locked, addFail, fails, startSession, confirmPw, setUsername, checkPw } = require("../services/auth");
const ver = require("../version");
const ai = require("../ai");

router.post("/api/register", wrap(async (req, res) => {
  if (setting("allow_registration") !== "1") throw Error("El registro está desactivado");
  const { username, password } = req.body;
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username || "")) throw Error("Usuario: 3-32 caracteres (letras, números, _ . -)");
  checkPw(password);
  if (get("SELECT 1 x FROM users WHERE username=?", username)) throw Error("Ese usuario ya existe");
  const first = get("SELECT COUNT(*) n FROM users").n === 0; // el primer usuario es administrador
  const r = run("INSERT INTO users(username,password_hash,is_admin,max_space_mb,created_at) VALUES(?,?,?,?,?)",
    username, hash(password), first ? 1 : 0, Number(setting("default_quota_mb")) || 100, now());
  await fsp.mkdir(path.join(HOSTING, get("SELECT uuid FROM users WHERE username=?", username).uuid), { recursive: true });
  startSession(req, res, Number(r.lastInsertRowid));
  req.user = { username }; 
  res.json({ success: true });
}));

router.post("/api/login", (req, res) => {
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
router.post("/api/logout", (req, res) => { logout(req, res); res.json({ success: true }); });
router.get("/logout", (req, res) => { logout(req, res); res.redirect("/"); });

router.get("/api/session", (req, res) => res.json(req.user ? { logged: true, user: req.user.username, admin: !!req.user.is_admin, uuid: req.user.uuid, update: req.user.is_admin ? ver.info() : null, registration: false, announcement: setting("announcement") || "", ai: ai.enabled() } : { logged: false, registration: setting("allow_registration") === "1" }));

router.post("/api/username", need, wrap(async (req, res) => {
  confirmPw(req, req.body.password);
  setUsername(req.user.id, req.body.username);
  res.json({ success: true, user: String(req.body.username).trim() });
}));
router.post("/api/password", need, wrap(async (req, res) => {
  const { current, next } = req.body;
  confirmPw(req, current);
  checkPw(next);
  run("UPDATE users SET password_hash=? WHERE id=?", hash(next), req.user.id);
  run("DELETE FROM sessions WHERE user_id=? AND token<>?", req.user.id, req.sid); // cierra las demás sesiones
  res.json({ success: true });
}));
router.post("/api/sessions/revoke-others", need, (req, res) => { run("DELETE FROM sessions WHERE user_id=? AND token<>?", req.user.id, req.sid); res.json({ success: true }); });

module.exports = router;
