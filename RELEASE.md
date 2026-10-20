# Versión 2.12.0

Herramienta para recuperar espacio.

## Novedades
- **Limpieza de espacio** (botón en la barra del panel y en el menú de usuario): los 25 archivos más grandes y los grupos de **archivos duplicados** (mismo contenido, por SHA-256) con el espacio que se puede liberar. Eliminar desde ahí manda el archivo a la **papelera**, así que se puede deshacer.
- Análisis acotado para no cargar el servidor: máximo 30 000 archivos y no calcula huellas de archivos de más de 512 MB. Si se queda corto, lo indica.
- Nueva ruta `GET /api/cleanup`. Sin cambios en la base de datos.

## Archivos modificados
- `src/routes/cleanup.js` (nuevo), `src/index.js`
- `public/js/panel.js`, `public/js/menu.js`, `public/panel.html`
- `README.md`, `RELEASE.md`, `package.json`, `data/version.json`
