// Herramienta de recuperación: restablece una contraseña o crea un usuario desde la terminal.
//   node reset-password.js                       -> lista los usuarios
//   node reset-password.js <usuario> <clave>     -> cambia la contraseña (y quita la suspensión)
//   node reset-password.js <usuario> <clave> --admin -> además lo hace administrador (o lo crea si no existe)
const fs = require("fs"), path = require("path");
const { get, all, run, now, hash } = require("./db");
const [, , user, pass, flag] = process.argv;
if (!user) {
  console.log("Usuarios en la base de datos:");
  for (const u of all("SELECT username,is_admin,suspended FROM users ORDER BY username")) console.log(" -", u.username, u.is_admin ? "(admin)" : "", u.suspended ? "(suspendido)" : "");
  console.log("\nUso: node reset-password.js <usuario> <nueva-contraseña> [--admin]");
  process.exit(0);
}
if (!pass || pass.length < 8) { console.log("La contraseña debe tener al menos 8 caracteres."); process.exit(1); }
const u = get("SELECT * FROM users WHERE username=?", user), admin = flag === "--admin";
if (u) {
  run("UPDATE users SET password_hash=?,suspended=0" + (admin ? ",is_admin=1" : "") + " WHERE id=?", hash(pass), u.id);
  run("DELETE FROM sessions WHERE user_id=?", u.id);
  console.log("Contraseña actualizada para", u.username);
} else {
  run("INSERT INTO users(username,password_hash,is_admin,max_space_mb,created_at) VALUES(?,?,?,?,?)", user, hash(pass), admin ? 1 : 0, 100, now());
  fs.mkdirSync(path.join(__dirname, "hosting", user), { recursive: true });
  console.log("Usuario creado:", user, admin ? "(admin)" : "");
}
