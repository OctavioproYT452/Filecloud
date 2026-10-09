// Base de datos local SQLite. Usa node:sqlite (Node >= 22.13) o better-sqlite3 como alternativa.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const DIR = path.join(__dirname, "data");
fs.mkdirSync(DIR, { recursive: true });
const file = path.join(DIR, "filecloud.db");
let db;
try { db = new (require("node:sqlite").DatabaseSync)(file); }
catch { db = new (require("better-sqlite3"))(file); }

db.exec(`
PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, username TEXT UNIQUE COLLATE NOCASE NOT NULL, password_hash TEXT NOT NULL,
  is_admin INTEGER DEFAULT 0, suspended INTEGER DEFAULT 0, max_space_mb REAL DEFAULT 100,
  used_bytes INTEGER DEFAULT 0, used_at INTEGER DEFAULT 0, created_at INTEGER, last_login INTEGER, last_ip TEXT, theme TEXT);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER, expires_at INTEGER, ip TEXT, ua TEXT);
CREATE TABLE IF NOT EXISTS shares(
  token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  path TEXT, is_dir INTEGER, expires_at INTEGER, created_at INTEGER, pw TEXT);
DROP TABLE IF EXISTS logs;
CREATE TABLE IF NOT EXISTS favs(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, path TEXT, PRIMARY KEY(user_id,path));
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
INSERT OR IGNORE INTO settings VALUES('allow_registration','1'),('default_quota_mb','100');
`);

for (const q of ["ALTER TABLE users ADD COLUMN theme TEXT", "ALTER TABLE shares ADD COLUMN pw TEXT"]) try { db.exec(q); } catch { }

const get = (sql, ...a) => db.prepare(sql).get(...a);
const all = (sql, ...a) => db.prepare(sql).all(...a);
const run = (sql, ...a) => db.prepare(sql).run(...a);
const now = () => Date.now();

// Contraseñas con scrypt + sal propia
const hash = pw => { const s = crypto.randomBytes(16); return `s1$${s.toString("hex")}$${crypto.scryptSync(pw, s, 64).toString("hex")}`; };
const verify = (pw, h) => {
  const [v, s, k] = String(h).split("$");
  if (v !== "s1") return false;
  const a = crypto.scryptSync(pw, Buffer.from(s, "hex"), 64), b = Buffer.from(k, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Migración única desde el antiguo data/users.json (las contraseñas en texto plano se cifran)
const old = path.join(DIR, "users.json");
if (fs.existsSync(old)) {
  try {
    for (const u of JSON.parse(fs.readFileSync(old, "utf8")))
      run("INSERT OR IGNORE INTO users(username,password_hash,is_admin,max_space_mb,created_at) VALUES(?,?,?,?,?)",
        u.username, hash(String(u.password)), u.admin ? 1 : 0, u.maxSpaceMB ?? 100, now());
    fs.renameSync(old, old + ".migrado");
    console.log("users.json migrado a SQLite (copia: users.json.migrado)");
  } catch (e) { console.error("Migración fallida:", e.message); }
}

module.exports = { get, all, run, now, hash, verify };
