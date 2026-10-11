// Carga de la sesión desde la cookie y guardas de acceso (usuario / administrador).
const { get, now } = require("../db");
const { sha, cookies } = require("../lib/utils");

const session = (req, res, next) => {
  req.user = null;
  const t = cookies(req).fc_sid;
  if (t) {
    const r = get("SELECT u.*,s.token sid FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?", sha(t), now());
    if (r && !r.suspended) { req.user = r; req.sid = r.sid; }
  }
  next();
};
const need = (req, res, next) => req.user ? next() : res.status(401).json({ error: "No autorizado" });
const needAdmin = (req, res, next) => !req.user ? res.status(401).json({ error: "No autorizado" }) : req.user.is_admin ? next() : res.status(403).json({ error: "Solo administradores" });

module.exports = { session, need, needAdmin };
