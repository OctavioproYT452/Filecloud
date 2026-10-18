// Generador de captchas (imagen PNG) sin dependencias: fuente de píxeles propia, giros, ondas, ruido y líneas.
// Devuelve { code, png }. Los caracteres que se confunden (0 O 1 I) no se usan.
const zlib = require("zlib"), crypto = require("crypto");

const G = {
  A: ".###.#...##...#######...##...##...#", B: "####.#...##...#####.#...##...#####.", C: ".#####....#....#....#....#.....####",
  D: "####.#...##...##...##...##...#####.", E: "######....#....####.#....#....#####", F: "######....#....####.#....#....#....",
  G: ".#####....#....#.####...##...#.###.", H: "#...##...##...#######...##...##...#", J: "..###...#....#....#....#.#..#..##..",
  K: "#...##..#.#.#..##...#.#..#..#.#...#", L: "#....#....#....#....#....#....#####", M: "#...###.###.#.##.#.##...##...##...#",
  N: "#...###..##.#.##..###...##...##...#", P: "####.#...##...#####.#....#....#....", Q: ".###.#...##...##...##.#.##..#..##.#",
  R: "####.#...##...#####.#.#..#..#.#...#", S: ".#####....#.....###.....#....#####.", T: "#####..#....#....#....#....#....#..",
  U: "#...##...##...##...##...##...#.###.", V: "#...##...##...##...##...#.#.#...#..", W: "#...##...##...##.#.##.#.###.###...#",
  X: "#...##...#.#.#...#...#.#.#...##...#", Y: "#...##...#.#.#...#....#....#....#..", Z: "#####....#...#...#...#...#....#####",
  2: ".###.#...#....#...#...#...#...#####", 3: "####.....#....#.###.....#....#####.", 4: "...#...##..#.#.#..#.#####...#....#.",
  5: "######....####.....#....##...#.###.", 6: ".###.#....#....####.#...##...#.###.", 7: "#####....#...#...#...#...#....#....",
  8: ".###.#...##...#.###.#...##...#.###.", 9: ".###.#...##...#.####....#....#.###.",
};
for (const k of Object.keys(G)) if (G[k].length !== 35) throw Error("glifo mal definido: " + k);
const CHARS = Object.keys(G).join("");

const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => crypto.randomInt(a, b + 1);

const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = b => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, "ascii"); data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length); return out;
}
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
}

function genCaptcha(len = 5) {
  len = Math.min(8, Math.max(4, Math.floor(len) || 5));
  const code = Array.from({ length: len }, () => CHARS[ri(0, CHARS.length - 1)]).join("");
  const W = 60 + len * 48, H = 120, px = Buffer.alloc(W * H * 3);
  const set = (x, y, c) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 3; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; };
  // fondo con degradado y ruido suave
  const c1 = [ri(215, 245), ri(215, 245), ri(215, 245)], c2 = [ri(190, 235), ri(190, 235), ri(190, 235)];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const t = (x / W + y / H) / 2, n = ri(-10, 10); set(x, y, [0, 1, 2].map(k => Math.max(0, Math.min(255, c1[k] + (c2[k] - c1[k]) * t + n)))); }
  const line = (x0, y0, x1, y1, col, th) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let a = -th; a <= th; a++) for (let b = -th; b <= th; b++) set(x + a, y + b, col); } };
  const dark = () => [ri(10, 110), ri(10, 110), ri(10, 110)];
  for (let k = 0; k < 4; k++) line(ri(0, W / 3), ri(0, H), ri(W * 2 / 3, W), ri(0, H), [ri(150, 200), ri(150, 200), ri(150, 200)], 0); // líneas de fondo
  // letras
  const cw = (W - 40) / len;
  for (let c = 0; c < len; c++) {
    const g = G[code[c]], sc = rnd(6.6, 7.4), ang = rnd(-0.32, 0.32), cx = 20 + cw * (c + 0.5) + rnd(-3, 3), cy = H / 2 + rnd(-8, 8), col = dark(), ca = Math.cos(ang), sa = Math.sin(ang), bold = Math.random() < 0.5 ? 0.62 : 0.5;
    const R = sc * 5.2;
    for (let y = -R | 0; y <= R; y++) for (let x = -R | 0; x <= R; x++) {
      const u = (x * ca + y * sa) / sc + 2.5, v = (-x * sa + y * ca) / sc + 3.5;
      if (u < 0 || v < 0 || u >= 5 || v >= 7) continue;
      const gx = Math.floor(u), gy = Math.floor(v);
      if (g[gy * 5 + gx] === "#" && Math.abs(u - gx - 0.5) < bold + 0.12 && Math.abs(v - gy - 0.5) < bold + 0.12) set(cx + x, cy + y, col);
    }
  }
  // onda: desplaza columnas y filas
  const src = Buffer.from(px), ph = rnd(0, 6), ph2 = rnd(0, 6), amp = rnd(1.8, 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = Math.round(x + Math.sin(y / 11 + ph2) * 2.5), sy = Math.round(y + Math.sin(x / 13 + ph) * amp);
    const o = (y * W + x) * 3; if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
    const s = (sy * W + sx) * 3; px[o] = src[s]; px[o + 1] = src[s + 1]; px[o + 2] = src[s + 2];
  }
  // líneas por encima y puntos
  for (let k = 0; k < 2; k++) line(0, ri(25, H - 25), W, ri(25, H - 25), dark(), 0);
  for (let k = 0; k < W * H / 60; k++) set(ri(0, W - 1), ri(0, H - 1), dark());
  return { code, png: png(W, H, px) };
}

module.exports = { genCaptcha, CHARS };
