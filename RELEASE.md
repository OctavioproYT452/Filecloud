# Versión 2.10.11

Nuevo panel de Discord en su propia página, más claro y menos cargado.

## Novedades
- **`/admin/discord-panel.html`** con menú lateral (en móvil, pestañas arriba) y una sección por pantalla en lugar de una sola página larga:
  - **Estado:** conexión del bot, invitación, mensaje de prueba, cifras (servidores, cuentas vinculadas, tickets abiertos), avisos de intents y permisos que faltan, y accesos rápidos.
  - **Actividad:** canales de registros y de actualizaciones, eventos que se registran y acciones permitidas a los usuarios.
  - **Tickets:** configuración y envío del panel en dos tarjetas, con la lista de tickets abiertos.
  - **Bienvenidas:** ajustes y mensaje con vista previa en vivo, lado a lado.
  - **Comandos propios:** accesos al editor y a la wiki.
- **Selector de servidor** (solo si el bot está en más de uno) para Tickets y Bienvenidas: se ve un servidor cada vez en lugar de una tarjeta por servidor. Se recuerda el último elegido.
- En **Admin → Discord** queda un resumen con el estado y botones que llevan al panel (cada tarjeta abre su sección). El editor de comandos también enlaza al panel.
- Sin cambios en la API ni en la base de datos.

## Archivos modificados
- Nuevos: `public/admin/discord-panel.html`, `public/js/dc-panel.js`, `public/dc-panel.css`.
- Modificados: `public/js/admin.js` (la sección de Discord pasa a ser un resumen), `public/admin/discord.html`, `README.md`, `RELEASE.md`, `package.json`, `data/version.json`.

## Actualizar
Copia los archivos y reinicia. Sin dependencias nuevas.
