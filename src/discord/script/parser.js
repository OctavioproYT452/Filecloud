// FCScript: analizador del lenguaje de comandos propios (parecido a BDScript de BDFD).
// Convierte el código en un árbol UNA sola vez (se guarda en caché) y señala los errores con su línea y columna.
//   Funciones:  $nombre   o   $nombre[arg1;arg2]      Bloques: $if / $elseif / $else / $endif, $for / $endfor, $while / $endwhile
//   Escapes:    \$  \;  \[  \]  \\       Comentarios: líneas que empiezan por //   o   $c[texto]
const BLOCKS = { if: ["elseif", "else", "endif"], for: ["endfor"], while: ["endwhile"] };
const ENDS = new Set(["elseif", "else", "endif", "endfor", "endwhile"]);
const NAME = /\$([A-Za-z_][A-Za-z0-9_]*)/y, NL = /[ \t]*\r?\n/y;

function parse(src, quiet = new Set()) {
  src = String(src).split("\n").map(l => /^\s*\/\//.test(l) ? "" : l).join("\n"); // los comentarios conservan su línea
  const n = src.length, errors = []; let i = 0;
  const lineOf = pos => { let l = 1, c = 1; for (let k = 0; k < pos && k < n; k++) { if (src[k] === "\n") { l++; c = 1; } else c++; } return { line: l, col: c }; };
  const err = (pos, msg) => errors.push({ ...lineOf(pos), msg });
  const eatNl = () => { NL.lastIndex = i; if (NL.test(src)) i = NL.lastIndex; };

  function seq(arg, ends) {
    const nodes = []; let buf = "";
    const flush = () => { if (buf) { nodes.push({ t: "text", v: buf }); buf = ""; } };
    while (i < n) {
      const ch = src[i];
      if (ch === "\\" && i + 1 < n && "\\$;[]".includes(src[i + 1])) { buf += src[i + 1]; i += 2; continue; }
      if (arg && (ch === ";" || ch === "]")) { flush(); return { nodes, end: { ch } }; }
      if (ch !== "$") { buf += ch; i++; continue; }
      NAME.lastIndex = i; const m = NAME.exec(src);
      if (!m) { buf += ch; i++; continue; }
      const raw = m[1], low = raw.toLowerCase(), start = i; i += m[0].length;
      if (ENDS.has(low)) {
        if (ends && ends.has(low)) { flush(); return { nodes, end: { name: low, pos: start } }; }
        err(start, `$${raw} no tiene el bloque que cerrar`); if (src[i] === "[") args(start, raw); eatNl(); continue;
      }
      flush();
      if (BLOCKS[low]) { nodes.push(block(low, start)); continue; }
      const a = src[i] === "[" ? args(start, raw) : null;
      nodes.push({ t: "call", name: low, raw, args: a || [], br: !!a, pos: start });
      if (quiet.has(low)) eatNl();
    }
    flush(); return { nodes, end: null };
  }

  function args(start, raw) {
    i++; const out = [];
    for (;;) {
      const r = seq(true, null); out.push(r.nodes);
      if (!r.end) { err(start, `Falta cerrar el «]» de $${raw}`); break; }
      i++; if (r.end.ch === "]") break;
    }
    return out;
  }

  function block(kind, start) {
    const node = { t: kind, pos: start }, ends = new Set(BLOCKS[kind]);
    const first = (pos, nm) => { if (src[i] !== "[") { err(pos, `$${nm} necesita algo entre [ ]`); return []; } const a = args(pos, nm); if (a.length > 1) err(pos, `$${nm} solo admite una condición: usa && y || en lugar de «;»`); return a[0] || []; };
    if (kind === "if") {
      node.branches = []; node.else = null; let cond = first(start, "if"); eatNl();
      for (;;) {
        const r = seq(false, ends);
        if (!r.end) { err(start, "Falta $endif para cerrar este $if"); node.branches.push({ cond, body: r.nodes }); break; }
        if (cond === null) node.else = r.nodes; else node.branches.push({ cond, body: r.nodes });
        const nm = r.end.name;
        if (nm === "endif") { eatNl(); break; }
        if (nm === "else") { if (cond === null) err(r.end.pos, "$else repetido"); cond = null; eatNl(); }
        else { if (cond === null) err(r.end.pos, "$elseif después de $else"); cond = first(r.end.pos, "elseif"); eatNl(); }
      }
    } else {
      const close = kind === "for" ? "endfor" : "endwhile";
      if (src[i] !== "[") { err(start, `$${kind} necesita argumentos entre [ ]`); node.args = []; } else node.args = args(start, kind);
      if (kind === "while") { node.cond = node.args[0] || []; if (node.args.length > 1) err(start, "$while solo admite una condición"); }
      eatNl(); const r = seq(false, ends); node.body = r.nodes;
      if (!r.end) err(start, `Falta $${close} para cerrar este $${kind}`); else eatNl();
    }
    return node;
  }

  const r = seq(false, null);
  return { ast: r.nodes, errors, lineOf };
}

// Revisa que las funciones existan y tengan los argumentos mínimos. FN: tabla de funciones.
function check(ast, errors, lineOf, FN) {
  const bad = (pos, msg) => errors.push({ ...lineOf(pos), msg });
  const list = ns => { for (const x of ns) walk(x); };
  function walk(x) {
    if (x.t === "call") {
      const f = FN[x.name];
      if (!f) bad(x.pos, `La función $${x.raw} no existe`);
      else {
        const given = x.args.filter((a, k) => a.length || k < x.args.length - 1 || x.args.length > 1).length;
        if (f.min && given < f.min) bad(x.pos, `$${f.n} necesita al menos ${f.min} argumento(s)`);
        if (f.max !== undefined && x.args.length > f.max) bad(x.pos, `$${f.n} admite como mucho ${f.max} argumento(s)`);
      }
      x.args.forEach(list);
    } else if (x.t === "if") { x.branches.forEach(b => { list(b.cond); list(b.body); }); if (x.else) list(x.else); }
    else if (x.t === "for") { x.args.forEach(list); list(x.body); }
    else if (x.t === "while") { list(x.cond); list(x.body); }
  }
  list(ast);
}

module.exports = { parse, check };
