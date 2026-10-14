// Punto de arranque: crea la app de Express, monta middleware y rutas, y escucha en el puerto.
const express = require("express"), fs = require("fs"), path = require("path");
const { get, run, now } = require("./db");
const { PORT, HOSTING, TMP, PUBLIC } = require("./config");
const ver = require("./version");
const ai = require("./ai");
const security = require("./middleware/security");
const { session } = require("./middleware/auth");
const { purgeFails } = require("./services/auth");

fs.mkdirSync(HOSTING, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", 1);

// ---------- middleware ----------
app.use(security.headers);
app.use("/dav", require("./routes/webdav").dav); // WebDAV antes del lector de cuerpos: los PUT llegan como flujo
app.use(security.body);
app.use(security.csrf); // protección CSRF: el origen debe coincidir con el host
app.use(session);
ai.init(); // Agente de IA: la configuración se lee de la base de datos al iniciar (y cuando el admin la cambia)

// ---------- rutas de la API y páginas públicas ----------
app.use(require("./routes/auth"));
app.use(require("./routes/security"));
app.use(require("./routes/files"));
app.use(require("./routes/shares"));
app.use(require("./routes/collab"));
app.use(require("./routes/share-page"));
app.use(require("./routes/admin"));
app.use(require("./routes/ai"));
app.use(require("./routes/themes"));
app.use(require("./routes/explore"));
app.use(require("./routes/webdav"));
app.use(require("./routes/office"));

// ---------- páginas estáticas protegidas ----------
app.get(["/", "/index.html"], (req, res, next) => req.user ? res.redirect("/panel.html") : next());
app.get(["/panel.html", "/themes.html"], (req, res, next) => req.user ? next() : res.redirect("/"));
app.use("/admin", (req, res, next) => req.user?.is_admin ? next() : res.redirect("/"));
app.use(express.static(PUBLIC));
app.use((err, req, res, next) => res.status(500).json({ error: "Error interno" }));

// ---------- mantenimiento periódico ----------
setInterval(() => {
  run("DELETE FROM sessions WHERE expires_at<?", now());
  run("DELETE FROM shares WHERE expires_at IS NOT NULL AND expires_at<?", now());
  ai.purge();
  purgeFails();
  require("./services/twofa").purgeTickets();
}, 36e5).unref();

if (!get("SELECT COUNT(*) n FROM users").n)
  console.warn("AVISO: no hay usuarios en la base de datos. Si vienes de la versión anterior, copia tu users.json a data/ y reinicia; o crea un usuario con: node tools/reset-password.js <usuario> <contraseña> --admin");
ver.start();
app.listen(PORT, () => { console.log(`File Cloud corriendo en http://localhost:${PORT}`); console.log("Agente de IA: " + ai.describe()); });
