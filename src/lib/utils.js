// Utilidades generales sin dependencias del resto del servidor.
const crypto = require("crypto");

const sha = t => crypto.createHash("sha256").update(t).digest("hex");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const wrap = fn => (req, res) => Promise.resolve(fn(req, res)).catch(e => res.status(400).json({ error: e.message }));
const cookies = req => Object.fromEntries((req.headers.cookie || "").split(";").map(c => c.trim().split(/=(.*)/s).slice(0, 2)).filter(a => a[0]));
const fix = n => { const d = Buffer.from(n, "latin1").toString("utf8"); return d.includes("\ufffd") ? n : d; };

module.exports = { sha, esc, wrap, cookies, fix };
