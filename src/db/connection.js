// Apertura de la base de datos local SQLite. Usa node:sqlite (Node >= 22.13) o better-sqlite3 como alternativa.
const fs = require("fs"), path = require("path");
const { DATA } = require("../config");

fs.mkdirSync(DATA, { recursive: true });
const file = path.join(DATA, "synapsebox.db");
// Migración desde File Cloud (≤ 2.12.x): la base de datos se llamaba filecloud.db. Se renombra una sola vez, con sus archivos auxiliares.
const oldDb = path.join(DATA, "filecloud.db");
if (fs.existsSync(oldDb) && !fs.existsSync(file))
  for (const ext of ["", "-wal", "-shm", "-journal"]) if (fs.existsSync(oldDb + ext)) fs.renameSync(oldDb + ext, file + ext);
let db;
try { db = new (require("node:sqlite").DatabaseSync)(file); }
catch { db = new (require("better-sqlite3"))(file); }

module.exports = db;
