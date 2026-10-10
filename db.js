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
  used_bytes INTEGER DEFAULT 0, used_at INTEGER DEFAULT 0, created_at INTEGER, last_login INTEGER, last_ip TEXT, theme TEXT, uuid TEXT);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER, expires_at INTEGER, ip TEXT, ua TEXT);
CREATE TABLE IF NOT EXISTS shares(
  token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  path TEXT, is_dir INTEGER, expires_at INTEGER, created_at INTEGER, pw TEXT);
DROP TABLE IF EXISTS logs;
CREATE TABLE IF NOT EXISTS favs(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, path TEXT, PRIMARY KEY(user_id,path));
CREATE TABLE IF NOT EXISTS user_themes(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, name TEXT, data TEXT, public INTEGER DEFAULT 0, PRIMARY KEY(user_id,name));
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
INSERT OR IGNORE INTO settings VALUES('allow_registration','1'),('default_quota_mb','100');
`);

for (const q of ["ALTER TABLE users ADD COLUMN theme TEXT", "ALTER TABLE shares ADD COLUMN pw TEXT", "ALTER TABLE user_themes ADD COLUMN public INTEGER DEFAULT 0", "ALTER TABLE users ADD COLUMN uuid TEXT"]) try { db.exec(q); } catch { }

// UUID permanente por usuario (v4). Se genera solo al crear la cuenta y nunca cambia.
const UUID = "lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))";
db.exec(`UPDATE users SET uuid=${UUID} WHERE uuid IS NULL OR uuid='';
CREATE UNIQUE INDEX IF NOT EXISTS users_uuid ON users(uuid);
CREATE TRIGGER IF NOT EXISTS users_uuid_ai AFTER INSERT ON users WHEN NEW.uuid IS NULL BEGIN UPDATE users SET uuid=${UUID} WHERE id=NEW.id; END;`);

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
  let list = [];
  try { list = JSON.parse(fs.readFileSync(old, "utf8").replace(/^\uFEFF/, "")); }
  catch (e) { console.error("No se pudo leer users.json:", e.message); }
  let ok = 0, bad = 0;
  for (const u of Array.isArray(list) ? list : []) {
    try { // cada usuario se importa por separado: uno defectuoso no bloquea a los demás
      if (!u || !String(u.username || "").trim()) throw Error("sin nombre de usuario");
      run("INSERT OR IGNORE INTO users(username,password_hash,is_admin,max_space_mb,created_at) VALUES(?,?,?,?,?)",
        String(u.username).trim(), hash(String(u.password ?? "")), u.admin ? 1 : 0, Number.isFinite(Number(u.maxSpaceMB)) ? Number(u.maxSpaceMB) : 100, now());
      ok++;
    } catch (e) { bad++; console.error("Usuario omitido en la migración:", u && u.username, "-", e.message); }
  }
  if (ok || !bad) { try { fs.renameSync(old, old + ".migrado"); } catch { } }
  console.log(`Migración de users.json: ${ok} usuario(s) importado(s), ${bad} omitido(s).`);
}

// Las carpetas de usuario se llaman como su UUID. Las antiguas (con el nombre de usuario) se renombran solas.
const HOSTING = path.join(__dirname, "hosting");
fs.mkdirSync(HOSTING, { recursive: true });
try {
  const dirs = new Map(fs.readdirSync(HOSTING).map(n => [n.toLowerCase(), n]));
  for (const u of all("SELECT username,uuid FROM users")) {
    const legacy = dirs.get(u.username.toLowerCase());
    if (legacy && legacy !== u.uuid && !fs.existsSync(path.join(HOSTING, u.uuid))) {
      try { fs.renameSync(path.join(HOSTING, legacy), path.join(HOSTING, u.uuid)); console.log(`Carpeta "${legacy}" -> ${u.uuid}`); }
      catch (e) { console.error(`No se pudo renombrar la carpeta "${legacy}" a ${u.uuid}: ${e.message}`); }
    }
  }
} catch (e) { console.error("Migración de carpetas:", e.message); }

module.exports = { get, all, run, now, hash, verify };
