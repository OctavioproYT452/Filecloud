// Envío de archivos al navegador (descarga o vista previa aislada).
const path = require("path");

const SAFE = new Set(".png .jpg .jpeg .gif .webp .bmp .ico .mp4 .webm .ogg .mp3 .wav .m4a .flac .aac .pdf".split(" "));
function serve(res, full, dl) {
  if (dl) return res.download(full, { dotfiles: "allow" });
  // Todo lo que no sea multimedia segura se sirve aislado (sandbox) para que no pueda actuar con tu sesión
  if (SAFE.has(path.extname(full).toLowerCase())) res.removeHeader("Content-Security-Policy");
  else res.set("Content-Security-Policy", "sandbox allow-scripts");
  res.sendFile(full, { dotfiles: "allow" });
}

module.exports = { serve };
