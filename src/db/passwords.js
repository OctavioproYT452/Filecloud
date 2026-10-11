// Contraseñas con scrypt + sal propia.
const crypto = require("crypto");

const hash = pw => { const s = crypto.randomBytes(16); return `s1$${s.toString("hex")}$${crypto.scryptSync(pw, s, 64).toString("hex")}`; };
const verify = (pw, h) => {
  const [v, s, k] = String(h).split("$");
  if (v !== "s1") return false;
  const a = crypto.scryptSync(pw, Buffer.from(s, "hex"), 64), b = Buffer.from(k, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = { hash, verify };
