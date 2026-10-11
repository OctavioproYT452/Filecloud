// Agente de IA: uso por los usuarios y configuración por el administrador.
const router = require("express").Router();
const { wrap } = require("../lib/utils");
const { need, needAdmin } = require("../middleware/auth");
const ai = require("../ai");

const needAI = (req, res, next) => ai.enabled() ? next() : res.status(404).json({ error: "No encontrado" }); // IA desactivada: la API no existe
router.get("/api/ai/status", need, needAI, (req, res) => res.json({ usage: ai.status(req.user) }));
router.post("/api/ai/chat", need, needAI, async (req, res) => {
  try { res.json(await ai.chat(req.user, req.body.messages)); }
  catch (e) { res.status(e.code || 400).json({ error: e.message }); }
});
router.get("/api/admin/ai", needAdmin, (req, res) => res.json(ai.publicConfig()));
router.post("/api/admin/ai", needAdmin, wrap(async (req, res) => { ai.save(req.body || {}); res.json({ success: true, ...ai.publicConfig() }); }));
router.post("/api/admin/ai/test", needAdmin, async (req, res) => {
  try { res.json({ ok: true, reply: await ai.test(req.body || {}) }); }
  catch (e) { res.status(400).json({ error: e.message + (e.detail ? " (" + e.detail + ")" : "") }); }
});
module.exports = router;
