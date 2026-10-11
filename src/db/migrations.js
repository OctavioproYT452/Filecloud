// Migraciones únicas desde versiones anteriores (users.json y carpetas con nombre de usuario).
const fs = require("fs"), path = require("path");
const { DATA, HOSTING } = require("../config");

module.exports = function migrate({ all, run, now, hash }) {
  // Migración única desde el antiguo data/users.json (las contraseñas en texto plano se cifran)
  const old = path.join(DATA, "users.json");
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
};
