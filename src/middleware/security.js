// Cabeceras de seguridad, cuerpo de las peticiones y protección CSRF.
const express = require("express");

const headers = (req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff", "X-Frame-Options": "SAMEORIGIN", "Referrer-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; frame-src 'self'; object-src 'none'; base-uri 'self'"
  });
  next();
};
const body = [express.json({ limit: "3mb" }), express.urlencoded({ extended: false, limit: "10kb" })];
const csrf = (req, res, next) => { // protección CSRF: el origen debe coincidir con el host
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin) {
    try { if (new URL(req.headers.origin).host !== req.headers.host) throw 0; }
    catch { return res.status(403).json({ error: "Origen no permitido" }); }
  }
  next();
};

module.exports = { headers, body, csrf };
