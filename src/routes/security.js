// Seguridad de la cuenta: 2FA (TOTP), códigos de recuperación y recuperación de acceso.
const router = require("express").Router();
const { get, run, hash } = require("../db");
const { wrap } = require("../lib/utils");
const { need } = require("../middleware/auth");
const { locked, addFail, fails, confirmPw, checkPw } = require("../services/auth");
const tf = require("../services/twofa");

const guard = req => { const k = "rec|" + req.ip; if (locked(k)) throw Error("Demasiados intentos. Prueba de nuevo en 15 minutos."); return k; };

router.get("/api/security", need, (req, res) => res.json({ totp: !!req.user.totp_on, codes: tf.codesLeft(req.user.id) }));

// 1) Genera un secreto pendiente (pide la contraseña). 2) El usuario lo añade a su app y confirma con un código.
router.post("/api/2fa/setup", need, wrap(async (req, res) => {
  if (req.user.totp_on) throw Error("El 2FA ya está activado");
  confirmPw(req, req.body.password);
  const secret = tf.newSecret();
  run("UPDATE users SET totp_pending=? WHERE id=?", secret, req.user.id);
  res.json({ secret: secret.match(/.{4}/g).join(" "), uri: tf.uri(req.user.username, secret) });
}));
router.post("/api/2fa/enable", need, wrap(async (req, res) => {
  const u = req.user, k = "2fa|" + u.id;
  if (locked(k)) throw Error("Demasiados intentos. Prueba de nuevo en 15 minutos.");
  if (!u.totp_pending) throw Error("Primero inicia la configuración del 2FA");
  const step = tf.matchStep(u.totp_pending, req.body.code);
  if (!step) { addFail(k); throw Error("Código incorrecto. Revisa la hora de tu dispositivo."); }
  fails.delete(k);
  run("UPDATE users SET totp_secret=?,totp_pending=NULL,totp_on=1,totp_last=? WHERE id=?", u.totp_pending, step, u.id);
  // si todavía no tiene códigos de recuperación se generan ahora (se muestran una sola vez)
  res.json({ success: true, codes: tf.codesLeft(u.id) ? null : tf.makeCodes(u.id) });
}));
router.post("/api/2fa/disable", need, wrap(async (req, res) => {
  const u = req.user; confirmPw(req, req.body.password);
  const k = "2fa|" + u.id;
  if (locked(k)) throw Error("Demasiados intentos. Prueba de nuevo en 15 minutos.");
  const code = String(req.body.code || "");
  const rc = tf.findCode(code);
  const ok = tf.checkTotp(u, code) || (rc && rc.user_id === u.id && (tf.useCode(code), true));
  if (!ok) { addFail(k); throw Error("Introduce un código válido de tu app (o un código de recuperación)"); }
  fails.delete(k);
  run("UPDATE users SET totp_on=0,totp_secret=NULL,totp_pending=NULL,totp_last=0 WHERE id=?", u.id);
  res.json({ success: true });
}));
router.post("/api/recovery/regenerate", need, wrap(async (req, res) => {
  confirmPw(req, req.body.password);
  res.json({ success: true, codes: tf.makeCodes(req.user.id) });
}));

// Recuperación sin sesión: con un código de recuperación se averigua el usuario y se pone una contraseña nueva.
router.post("/api/recover/check", wrap(async (req, res) => {
  const k = guard(req), rc = tf.findCode(req.body.code);
  if (!rc) { addFail(k); throw Error("Código de recuperación no válido o ya usado"); }
  const u = get("SELECT username,suspended FROM users WHERE id=?", rc.user_id);
  if (u.suspended) throw Error("Cuenta suspendida. Contacta con un administrador.");
  res.json({ success: true, username: u.username });
}));
router.post("/api/recover", wrap(async (req, res) => {
  const k = guard(req), { code, password, password2 } = req.body, rc = tf.findCode(code);
  if (!rc) { addFail(k); throw Error("Código de recuperación no válido o ya usado"); }
  if (password !== password2) throw Error("Las contraseñas no coinciden");
  checkPw(password);
  const u = get("SELECT * FROM users WHERE id=?", rc.user_id);
  if (u.suspended) throw Error("Cuenta suspendida. Contacta con un administrador.");
  tf.useCode(code);
  run("UPDATE users SET password_hash=? WHERE id=?", hash(password), u.id);
  run("DELETE FROM sessions WHERE user_id=?", u.id);
  fails.delete(k);
  res.json({ success: true, username: u.username, codes: tf.codesLeft(u.id) });
}));

module.exports = router;
