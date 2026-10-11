// Apertura de la base de datos local SQLite. Usa node:sqlite (Node >= 22.13) o better-sqlite3 como alternativa.
const fs = require("fs"), path = require("path");
const { DATA } = require("../config");

fs.mkdirSync(DATA, { recursive: true });
const file = path.join(DATA, "filecloud.db");
let db;
try { db = new (require("node:sqlite").DatabaseSync)(file); }
catch { db = new (require("better-sqlite3"))(file); }

module.exports = db;
