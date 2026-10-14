// Ajustes de acceso WebDAV de cada usuario (activar, desactivar y generar una clave nueva) y montaje del servidor /dav.
const router = require("express").Router();
const crypto = require("crypto");
const { run, now } = require("../db");
const { wrap, sha } = require("../lib/utils");
const { need } = require("../middleware/auth");
const { confirmPw } = require("../services/auth");

const ABC = "abcdefghjkmnpqrstuvwxyz23456789"; // sin caracteres que se confunden (i l o 0 1)
const newKey = () => Array.from({ length: 4 }, () => Array.from({ length: 5 }, () => ABC[crypto.randomInt(ABC.length)]).join("")).join("-");

router.get("/api/webdav", need, (req, res) => res.json({ enabled: !!req.user.dav_on, since: req.user.dav_at || null, username: req.user.username }));
router.post("/api/webdav/enable", need, wrap(async (req, res) => {
  confirmPw(req, req.body.password); // pide la contraseña de la cuenta para generar una clave nueva
  const key = newKey(); // se muestra una sola vez; en la base de datos solo queda su hash
  run("UPDATE users SET dav_on=1, dav_hash=?, dav_at=? WHERE id=?", sha(key), now(), req.user.id);
  res.json({ success: true, key, username: req.user.username });
}));
router.post("/api/webdav/disable", need, wrap(async (req, res) => {
  run("UPDATE users SET dav_on=0, dav_hash=NULL WHERE id=?", req.user.id);
  res.json({ success: true });
}));

module.exports = router;
module.exports.dav = require("../services/webdav").handler;
