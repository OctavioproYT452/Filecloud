# Versión 2.12.2

Corrección de errores en los temas.

## Correcciones
- **Colores que se mezclaban al cambiar de tema:** lo que un tema no definía (colores, bordes, fuente, espaciado) volvía a los valores del tema guardado en vez de a los por defecto, y los colores se veían mal. Ahora, al probar o aplicar un tema, todo lo que no define vuelve al valor por defecto.
- **Fondo animado (GIF/vídeo/imagen) que no se quitaba, no se ponía o no cambiaba** al poner un tema o cambiar entre temas ya creados (Mis temas, predeterminados y comunidad, también con «Probar» y al cerrar sin aplicar). El fondo y la imagen de los botones del tema anterior ya no se quedan.

## Archivos modificados
- `public/js/common.js`, `src/services/themes.js`
- `README.md`, `RELEASE.md`, `package.json`, `data/version.json`

---

# Versión 2.12.1

Estadísticas de uso en la web y 8 funciones nuevas de FCScript.

## Novedades
- **Estadísticas** (botón en la barra del panel y en el menú de usuario): espacio usado **por tipo de archivo**, **carpetas que más pesan** y **archivos antiguos** (más de 365 días sin modificar). Los antiguos se pueden mandar a la **papelera** desde ahí.
- Nueva ruta `GET /api/stats` (solo lectura, máximo 30 000 archivos y 20 s). Sin cambios en la base de datos.
- **FCScript, 8 funciones nuevas:** `$average[a;b;…]`, `$median[a;b;…]`, `$dice[dados;caras]`, `$coinFlip` (Matemáticas); `$isPalindrome[texto]`, `$initials[texto;máx]` (Texto); `$weekday[unix]`, `$daysUntil[unix]` (Tiempo). Aparecen solas en la wiki y el editor. Las funciones existentes no cambian.

## Archivos modificados
- `src/routes/stats.js` (nuevo), `src/index.js`
- `src/discord/script/functions.js`
- `public/js/panel.js`, `public/js/menu.js`, `public/panel.html`
- `README.md`, `RELEASE.md`, `package.json`, `data/version.json`

---

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
