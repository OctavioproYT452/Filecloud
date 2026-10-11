// Gestión de enlaces para compartir (crear, listar y revocar).
const router = require("express").Router();
const crypto = require("crypto"), fsp = require("fs").promises, path = require("path");
const { all, run, now, hash } = require("../db");
const { wrap } = require("../lib/utils");
const { base, fileOf } = require("../lib/paths");
const { need } = require("../middleware/auth");

router.post("/api/share", need, wrap(async (req, res) => {
  const f = fileOf(req), s = await fsp.stat(f), days = Number(req.body.days) || 0, token = crypto.randomBytes(12).toString("base64url");
  run("INSERT INTO shares VALUES(?,?,?,?,?,?,?)", token, req.user.id, path.relative(base(req.user), f), s.isDirectory() ? 1 : 0, days > 0 ? now() + days * 864e5 : null, now(), req.body.password ? hash(String(req.body.password)) : null);
  res.json({ success: true, url: `${req.protocol}://${req.get("host")}/s/${token}` });
}));
router.get("/api/shares", need, (req, res) => res.json({ shares: all("SELECT * FROM shares WHERE user_id=? ORDER BY created_at DESC", req.user.id) }));
router.post("/api/share/revoke", need, (req, res) => { run("DELETE FROM shares WHERE token=? AND user_id=?", String(req.body.token), req.user.id); res.json({ success: true }); });

module.exports = router;
