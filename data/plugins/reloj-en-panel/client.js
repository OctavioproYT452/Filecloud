// Reloj flotante (solo cliente)
SynapseBox.ready(() => {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:50;padding:6px 12px;border-radius:999px;background:var(--card,#222);color:var(--text,#fff);border:1px solid var(--line,#444);font:600 13px system-ui";
  document.body.append(el);
  const tick = () => el.textContent = new Date().toLocaleTimeString();
  tick(); setInterval(tick, 1000);
});
