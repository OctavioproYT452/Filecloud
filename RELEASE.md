# Versión 2.11.1

Botón para avisar de una actualización en Discord desde la web.

## Novedades
- **Admin → Discord → Actividad → Enviar aviso:** consulta GitHub al momento y publica en el canal de actualizaciones un mensaje con la versión, las notas de la versión y los archivos modificados. Funciona aunque esa versión ya se hubiera anunciado.
- Los avisos automáticos también muestran el apartado **Archivos modificados** de `RELEASE.md`.
- Nueva ruta `POST /api/admin/discord/update-notice` (solo administradores; queda en el registro de actividad).

## Archivos modificados
- `src/discord/updates.js`
- `src/routes/discord-custom.js`
- `public/js/dc-panel.js`
- `README.md`, `RELEASE.md`, `package.json`, `data/version.json`
