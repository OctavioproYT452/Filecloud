// Herramientas del agente: todas confinadas a la carpeta del usuario. No existe ninguna para ejecutar nada.
const fs = require("fs"), fsp = fs.promises, path = require("path");
const { all, run } = require("../db");
const { MAX_READ, MAX_WRITE } = require("./constants");
const { base, safe, limitB } = require("../lib/paths");
const { usage, dirSize } = require("../lib/storage");

const segOk = s => s.length > 0 && s.length <= 200 && !/[\0-\x1f]/.test(s);
// Convierte una ruta relativa del usuario en una ruta absoluta DENTRO de su carpeta (o falla).
async function R(u, rel, { root = false } = {}) {
  const b = base(u);
  rel = String(rel ?? "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  const parts = rel.split("/").filter(x => x && x !== ".");
  if (parts.some(x => x === ".." || !segOk(x))) throw Error("Ruta inválida");
  const f = safe(b, parts.join("/"));
  if (f === b && !root) throw Error("No puedes operar sobre la carpeta raíz");
  await fsp.mkdir(b, { recursive: true });
  // Defensa extra: ningún tramo existente de la ruta puede ser un enlace simbólico (evita escapar de la carpeta)
  let cur = b;
  for (const p of parts) {
    cur = path.join(cur, p);
    const s = await fsp.lstat(cur).catch(() => null);
    if (!s) break;
    if (s.isSymbolicLink()) throw Error("Ruta inválida");
  }
  return f;
}
const rel = (u, f) => "/" + path.relative(base(u), f).split(path.sep).join("/");
const exists = f => fsp.lstat(f).then(() => true, () => false);
const isDir = f => fsp.stat(f).then(s => s.isDirectory(), () => false);
const hasLinks = async d => { // ¿contiene enlaces simbólicos? (no se copian)
  const s = await fsp.lstat(d); if (s.isSymbolicLink()) return true; if (!s.isDirectory()) return false;
  for (const e of await fsp.readdir(d)) if (await hasLinks(path.join(d, e))) return true;
  return false;
};
async function quota(u, extra) { if (await usage(u, true) + extra > limitB(u)) throw Error("No hay espacio suficiente en la cuenta del usuario"); }
// destino de mover/copiar: si "to" es una carpeta existente, el elemento va dentro con su mismo nombre
async function dest(u, from, to) {
  const t = await R(u, to, { root: true });
  const final = (await isDir(t)) ? path.join(t, path.basename(from)) : t;
  if (final === base(u)) throw Error("Destino inválido");
  if (await exists(final)) throw Error("Ya existe un elemento con ese nombre en el destino: " + rel(u, final));
  if ((final + path.sep).startsWith(from + path.sep)) throw Error("No se puede mover/copiar una carpeta dentro de sí misma");
  await fsp.mkdir(path.dirname(final), { recursive: true });
  return final;
}

const IMPL = {
  async list_dir(u, a) {
    const d = await R(u, a.path, { root: true });
    if (!(await isDir(d))) throw Error("No es una carpeta o no existe");
    const es = await fsp.readdir(d, { withFileTypes: true }), out = [];
    for (const e of es.slice(0, 300)) {
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) out.push(e.name + "/");
      else { const s = await fsp.stat(path.join(d, e.name)).catch(() => null); if (s) out.push(`${e.name} (${s.size} bytes)`); }
    }
    return out.length ? out.join("\n") + (es.length > 300 ? "\n… (lista recortada)" : "") : "(carpeta vacía)";
  },
  async read_file(u, a) {
    const f = await R(u, a.path), s = await fsp.stat(f).catch(() => null);
    if (!s || s.isDirectory()) throw Error("El archivo no existe");
    const fd = await fsp.open(f, "r");
    try {
      const buf = Buffer.alloc(Math.min(s.size, MAX_READ)); await fd.read(buf, 0, buf.length, 0);
      if (buf.includes(0)) throw Error("Es un archivo binario: solo puedo leer texto");
      return buf.toString("utf8") + (s.size > MAX_READ ? "\n… (archivo recortado)" : "");
    } finally { await fd.close(); }
  },
  async create_folder(u, a) {
    const f = await R(u, a.path);
    if (await exists(f)) throw Error("Ya existe: " + rel(u, f));
    await fsp.mkdir(f, { recursive: true }); return "Carpeta creada: " + rel(u, f);
  },
  async write_file(u, a) {
    const f = await R(u, a.path), content = String(a.content ?? "");
    if (Buffer.byteLength(content) > MAX_WRITE) throw Error("Contenido demasiado grande (máx. 1 MB por archivo)");
    const old = await fsp.lstat(f).catch(() => null);
    if (old?.isDirectory()) throw Error("Ya existe una carpeta con ese nombre");
    if (old && !a.overwrite) throw Error("El archivo ya existe. Usa overwrite=true solo si el usuario pidió sustituirlo");
    await quota(u, Buffer.byteLength(content) - (old?.size || 0));
    await fsp.mkdir(path.dirname(f), { recursive: true });
    await fsp.writeFile(f, content, { mode: 0o644 }); await fsp.chmod(f, 0o644); // nunca ejecutable
    await usage(u, true); return (old ? "Archivo sobrescrito: " : "Archivo creado: ") + rel(u, f);
  },
  async move_item(u, a) {
    const from = await R(u, a.from); if (!(await exists(from))) throw Error("No existe: " + rel(u, from));
    const to = await dest(u, from, a.to); await fsp.rename(from, to); return `Movido a ${rel(u, to)}`;
  },
  async copy_item(u, a) {
    const from = await R(u, a.from), s = await fsp.lstat(from).catch(() => null); if (!s) throw Error("No existe: " + rel(u, from));
    if (await hasLinks(from)) throw Error("El origen contiene enlaces simbólicos y no se puede copiar");
    const to = await dest(u, from, a.to);
    await quota(u, s.isDirectory() ? await dirSize(from) : s.size);
    await fsp.cp(from, to, { recursive: true, dereference: false, errorOnExist: true, force: false });
    for (const p of [to]) await fixModes(p);
    await usage(u, true); return `Copiado a ${rel(u, to)}`;
  },
  async delete_item(u, a) {
    const f = await R(u, a.path); if (!(await exists(f))) throw Error("No existe: " + rel(u, f));
    const r = path.relative(base(u), f);
    await fsp.rm(f, { recursive: true, force: true });
    for (const s of all("SELECT token,path FROM shares WHERE user_id=?", u.id)) if (s.path === r || s.path.startsWith(r + path.sep)) run("DELETE FROM shares WHERE token=?", s.token);
    await usage(u, true); return "Borrado: " + rel(u, f);
  },
};
async function fixModes(p) { // las copias nunca conservan el bit de ejecución
  const s = await fsp.lstat(p);
  if (s.isDirectory()) { for (const e of await fsp.readdir(p)) await fixModes(path.join(p, e)); } else if (s.isFile() && (s.mode & 0o111)) await fsp.chmod(p, s.mode & 0o666);
}

const fn = (name, description, properties, required) => ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } });
const P = d => ({ type: "string", description: d });
const TOOLS = [
  fn("list_dir", "Lista el contenido de una carpeta. path vacío o \"/\" = carpeta raíz del usuario.", { path: P("Ruta de la carpeta") }, []),
  fn("read_file", "Lee un archivo de texto (máx. 60 KB).", { path: P("Ruta del archivo") }, ["path"]),
  fn("create_folder", "Crea una carpeta (y las carpetas intermedias que falten).", { path: P("Ruta de la nueva carpeta") }, ["path"]),
  fn("write_file", "Crea un archivo de texto con el contenido dado (crea las carpetas intermedias). Nunca se ejecuta.", { path: P("Ruta del archivo"), content: P("Contenido completo del archivo"), overwrite: { type: "boolean", description: "true solo si hay que sustituir un archivo existente" } }, ["path", "content"]),
  fn("move_item", "Mueve o renombra un archivo/carpeta. Si 'to' es una carpeta existente, el elemento se mueve dentro de ella.", { from: P("Ruta de origen"), to: P("Ruta de destino") }, ["from", "to"]),
  fn("copy_item", "Copia un archivo/carpeta. Si 'to' es una carpeta existente, la copia va dentro de ella.", { from: P("Ruta de origen"), to: P("Ruta de destino") }, ["from", "to"]),
  fn("delete_item", "Borra un archivo o carpeta (con todo su contenido). No se puede deshacer.", { path: P("Ruta a borrar") }, ["path"]),
];
const LABEL = {
  list_dir: a => `Listó ${a.path || "/"}`, read_file: a => `Leyó ${a.path}`, create_folder: a => `Creó la carpeta ${a.path}`,
  write_file: a => `${a.overwrite ? "Escribió" : "Creó"} el archivo ${a.path}`, move_item: a => `Movió ${a.from} → ${a.to}`,
  copy_item: a => `Copió ${a.from} → ${a.to}`, delete_item: a => `Borró ${a.path}`,
};
const MUTATES = new Set(["create_folder", "write_file", "move_item", "copy_item", "delete_item"]);


module.exports = { IMPL, TOOLS, LABEL, MUTATES };
