// Apariencia: tema activo, temas guardados y comunidad de temas.
const router = require("express").Router();
const { get, all, run } = require("../db");
const { wrap } = require("../lib/utils");
const { need } = require("../middleware/auth");
const { cleanTheme, userTheme, themeCss } = require("../services/themes");

router.get("/theme.css", (req, res) => {
  const t = userTheme(req.user);
  res.type("css").set("Cache-Control", "no-cache");
  res.send(themeCss(t));
});
router.get("/api/theme", need, (req, res) => res.json({ theme: userTheme(req.user) }));
router.post("/api/theme", need, (req, res) => {
  const t = cleanTheme(req.body.theme);
  run("UPDATE users SET theme=? WHERE id=?", t ? JSON.stringify(t) : null, req.user.id); res.json({ success: true });
});

router.get("/api/themes", need, (req, res) => res.json({ themes: all("SELECT name,data,public FROM user_themes WHERE user_id=? ORDER BY name", req.user.id).map(r => ({ name: r.name, public: !!r.public, theme: cleanTheme(JSON.parse(r.data)) })) }));
router.post("/api/themes", need, wrap(async (req, res) => {
  const name = String(req.body.name || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40), t = cleanTheme(req.body.theme);
  if (!name || !t) throw Error("Tema inválido");
  if (!get("SELECT 1 x FROM user_themes WHERE user_id=? AND name=?", req.user.id, name) && get("SELECT COUNT(*) n FROM user_themes WHERE user_id=?", req.user.id).n >= 50) throw Error("Máximo 50 temas guardados");
  run("INSERT INTO user_themes(user_id,name,data) VALUES(?,?,?) ON CONFLICT(user_id,name) DO UPDATE SET data=excluded.data", req.user.id, name, JSON.stringify(t)); res.json({ success: true });
}));
router.post("/api/themes/publish", need, wrap(async (req, res) => {
  const r = run("UPDATE user_themes SET public=? WHERE user_id=? AND name=?", req.body.public ? 1 : 0, req.user.id, String(req.body.name || ""));
  if (!r.changes) throw Error("Tema no encontrado"); res.json({ success: true });
}));
router.get("/api/community", need, (req, res) => res.json({ themes: all("SELECT t.rowid id,t.name,t.data,t.user_id,u.username author FROM user_themes t JOIN users u ON u.id=t.user_id WHERE t.public=1 AND u.suspended=0 ORDER BY t.rowid DESC LIMIT 300").map(r => ({ id: r.id, name: r.name, author: r.author, mine: r.user_id === req.user.id, theme: cleanTheme(JSON.parse(r.data)) })) }));
router.post("/api/community/save", need, wrap(async (req, res) => {
  const r = get("SELECT t.name,t.data,u.username author FROM user_themes t JOIN users u ON u.id=t.user_id WHERE t.rowid=? AND t.public=1", Number(req.body.id));
  if (!r) throw Error("El tema ya no está disponible");
  const has = n => get("SELECT data FROM user_themes WHERE user_id=? AND name=?", req.user.id, n);
  let name = r.name;
  if (has(name) && has(name).data !== r.data) name = (r.name + " (" + r.author + ")").slice(0, 40);
  if (!has(name) && get("SELECT COUNT(*) n FROM user_themes WHERE user_id=?", req.user.id).n >= 50) throw Error("Máximo 50 temas guardados");
  run("INSERT INTO user_themes(user_id,name,data) VALUES(?,?,?) ON CONFLICT(user_id,name) DO UPDATE SET data=excluded.data", req.user.id, name, r.data);
  res.json({ success: true, name });
}));
router.post("/api/community/unpublish", need, wrap(async (req, res) => {
  const r = run("UPDATE user_themes SET public=0 WHERE rowid=? AND user_id=?", Number(req.body.id), req.user.id);
  if (!r.changes) throw Error("Tema no encontrado"); res.json({ success: true });
}));
router.delete("/api/themes", need, (req, res) => { run("DELETE FROM user_themes WHERE user_id=? AND name=?", req.user.id, String(req.body.name || "")); res.json({ success: true }); });
module.exports = router;
