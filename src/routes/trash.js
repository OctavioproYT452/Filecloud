// Papelera de reciclaje del usuario (ver, restaurar, eliminar definitivamente y vaciar).
const router = require("express").Router();
const { wrap } = require("../lib/utils");
const { need } = require("../middleware/auth");
const trash = require("../services/trash");

router.get("/api/trash", need, (req, res) => res.json({ ...trash.summary(req.user), items: trash.list(req.user) }));
router.post("/api/trash/restore", need, wrap(async (req, res) => res.json({ success: true, path: await trash.restore(req.user, req.body.id) })));
router.post("/api/trash/delete", need, wrap(async (req, res) => { await trash.remove(req.user, req.body.id); res.json({ success: true }); }));
router.post("/api/trash/empty", need, wrap(async (req, res) => res.json({ success: true, removed: await trash.empty(req.user) })));

module.exports = router;
