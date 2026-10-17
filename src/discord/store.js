// Bot de Discord: vínculos usuario <-> Discord y ajustes (canales y eventos) guardados en la base de datos.
// El token del bot NUNCA se guarda aquí: solo vive en el archivo .env.
const { get, run, now } = require("../db");
const { setting } = require("../lib/settings");

const setS = (k, v) => run("INSERT OR REPLACE INTO settings VALUES(?,?)", k, String(v));
const delS = k => run("DELETE FROM settings WHERE key=?", k);

// Qué se envía al canal de registros (todo activado por defecto; el admin lo cambia en Admin → Discord).
const EVENTS = {
  cuentas: "Cuentas: registros, cambios de usuario o contraseña, 2FA, Discord",
  acceso: "Inicios de sesión",
  archivos: "Archivos: subidas, nuevas carpetas, ediciones, cambios de nombre, mover y copiar",
  borrados: "Archivos borrados",
  enlaces: "Enlaces para compartir (creados y revocados)",
  colab: "Carpetas colaborativas",
  admin: "Acciones de los administradores",
};
const eventOn = k => (setting("discord_ev_" + k) ?? "1") === "1";
const setEvent = (k, on) => setS("discord_ev_" + k, on ? "1" : "0");

// Canales: "log" (registros de actividad) y "update" (avisos de actualización). Se guardan como ID de canal de Discord.
const channel = which => setting("discord_ch_" + which) || null;
const setChannel = (which, id) => id ? setS("discord_ch_" + which, id) : delS("discord_ch_" + which);

// ¿Pueden los usuarios vinculados crear enlaces y usar la IA desde Discord?
const actionsOn = () => (setting("discord_actions") ?? "1") === "1";
const setActions = on => setS("discord_actions", on ? "1" : "0");

const linkOf = userId => get("SELECT * FROM discord_links WHERE user_id=?", userId);
const userByDiscord = did => get("SELECT u.* FROM discord_links l JOIN users u ON u.id=l.user_id WHERE l.discord_id=?", String(did));
const link = (userId, did, name) => run("INSERT OR REPLACE INTO discord_links(user_id,discord_id,discord_name,linked_at) VALUES(?,?,?,?)", userId, String(did), String(name || "").slice(0, 80), now());
const unlink = userId => run("DELETE FROM discord_links WHERE user_id=?", userId);
const countLinks = () => get("SELECT COUNT(*) n FROM discord_links").n;

module.exports = { EVENTS, eventOn, setEvent, channel, setChannel, actionsOn, setActions, linkOf, userByDiscord, link, unlink, countLinks, setS, setting };
