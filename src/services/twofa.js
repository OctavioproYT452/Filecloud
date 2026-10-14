// 2FA (TOTP, RFC 6238) y códigos de recuperación. Sin dependencias externas.
const crypto = require("crypto");
const { get, all, run, now } = require("../db");
const { sha } = require("../lib/utils");

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const b32enc = buf => { let bits = "", out = ""; for (const b of buf) bits += b.toString(2).padStart(8, "0"); for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)]; return out; };
const b32dec = s => { let bits = ""; for (const c of String(s).toUpperCase().replace(/[^A-Z2-7]/g, "")) bits += B32.indexOf(c).toString(2).padStart(5, "0"); const o = []; for (let i = 0; i + 8 <= bits.length; i += 8) o.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(o); };

const newSecret = () => b32enc(crypto.randomBytes(20));
function hotp(secret, counter) {
  const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", b32dec(secret)).update(b).digest(), o = h[19] & 15;
  return String(((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6).padStart(6, "0");
}
// Devuelve el paso (ventana de 30 s) que coincide con el código o 0 si no es válido (tolera ±1 paso de desfase)
function matchStep(secret, code) {
  code = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return 0;
  const cur = Math.floor(Date.now() / 30000);
  for (const d of [0, -1, 1]) { const a = Buffer.from(hotp(secret, cur + d)), b = Buffer.from(code); if (crypto.timingSafeEqual(a, b)) return cur + d; }
  return 0;
}
const uri = (user, secret) => `otpauth://totp/File%20Cloud:${encodeURIComponent(user)}?secret=${secret}&issuer=File%20Cloud&algorithm=SHA1&digits=6&period=30`;

// Verifica el código TOTP de un usuario; cada código solo sirve una vez (evita reutilización)
function checkTotp(u, code) {
  if (!u.totp_secret) return false;
  const step = matchStep(u.totp_secret, code);
  if (!step || step <= (u.totp_last || 0)) return false;
  run("UPDATE users SET totp_last=? WHERE id=?", step, u.id);
  return true;
}

// ---- códigos de recuperación: 10 códigos de un solo uso (XXXX-XXXX-XXXX, 60 bits); solo se guarda su hash ----
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const normCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
function makeCodes(uid) {
  run("DELETE FROM recovery_codes WHERE user_id=?", uid);
  const out = [];
  for (let i = 0; i < 10; i++) {
    const r = crypto.randomBytes(12); let c = "";
    for (const b of r) c += ALPHA[b % 32];
    run("INSERT INTO recovery_codes(hash,user_id,used,created_at) VALUES(?,?,0,?)", sha(c), uid, now());
    out.push(c.match(/.{4}/g).join("-"));
  }
  return out;
}
const codesLeft = uid => get("SELECT COUNT(*) n FROM recovery_codes WHERE user_id=? AND used=0", uid).n;
const findCode = c => { const n = normCode(c); return n.length === 12 ? get("SELECT * FROM recovery_codes WHERE hash=? AND used=0", sha(n)) : null; };
const useCode = c => run("UPDATE recovery_codes SET used=1 WHERE hash=?", sha(normCode(c)));

// Tickets de inicio de sesión pendientes de 2FA (en memoria, 5 min)
const tickets = new Map();
function newTicket(uid) { const t = crypto.randomBytes(24).toString("hex"); tickets.set(t, { uid, exp: now() + 3e5, n: 0 }); return t; }
const purgeTickets = () => { for (const [k, v] of tickets) if (v.exp < now()) tickets.delete(k); };

module.exports = { newSecret, uri, matchStep, checkTotp, makeCodes, codesLeft, findCode, useCode, tickets, newTicket, purgeTickets, hotp };
