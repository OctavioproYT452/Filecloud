// Límites de uso de la IA por usuario (por hora o por día).
const { get, run, now } = require("../db");
const { getConfig } = require("./config");

const win = p => p === "day" ? 864e5 : 36e5;
function limitFor(u) {
  return { limit: u.ai_limit === null || u.ai_limit === undefined ? getConfig().count : u.ai_limit, period: u.ai_period === "day" || u.ai_period === "hour" ? u.ai_period : getConfig().period };
}
function status(u) {
  const { limit, period } = limitFor(u), since = now() - win(period);
  const r = get("SELECT COUNT(*) n, MIN(ts) first FROM ai_usage WHERE user_id=? AND ts>?", u.id, since);
  return { limit, period, used: r.n, remaining: limit < 0 ? null : Math.max(0, limit - r.n), reset_at: r.first ? r.first + win(period) : null };
}
const usedBy = (id, period) => get("SELECT COUNT(*) n FROM ai_usage WHERE user_id=? AND ts>?", id, now() - win(period)).n;
const purge = () => run("DELETE FROM ai_usage WHERE ts<?", now() - 2 * 864e5);

module.exports = { limitFor, status, usedBy, purge };
