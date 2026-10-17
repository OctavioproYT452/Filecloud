# Versión 2.10.3

Comandos propios para el bot de Discord con un lenguaje sencillo (FCScript), editor web con resaltado de sintaxis y más comandos integrados. Documentación completa: [README](README.md#comandos-propios-fcscript).

## Novedades
- **Editor de comandos (`/admin/discord.html`)**: solo para administradores. Árbol de carpetas (arrastrar para mover, renombrar, borrar), formulario del comando, editor con **resaltado de sintaxis**, autocompletado, errores con línea marcada, panel de funciones y **prueba en vivo** sin enviar nada a Discord.
- **FCScript**: lenguaje parecido a BDScript (`$funcion[arg;arg]`, `$if/$elseif/$else/$endif`, `$for`, `$while`, variables guardadas por usuario/servidor/global, cálculo seguro, texto, tiempo, datos de File Cloud y moderación). Más de 90 funciones.
- **Tipos de comando**: slash (con opciones tipadas), prefijo (con alias y prefijo configurable) y mensaje (responde a un texto exacto, que lo contenga o que empiece así). Acceso por comando: todos, vinculados, admins o gestores.
- **Archivos `.fcs`**: cada comando se guarda en `data/discord-commands/<carpeta>/`. Se compilan una vez y se ejecutan en memoria; los comandos slash se registran en Discord solo cuando cambian.
- **Bot**: nuevos `/dado`, `/moneda`, `/elegir`, `/encuesta`, `/recientes`, `/favoritos`, `/comandos`, `/limpiar` y `/config prefijo`.
- **Todo configurable desde la web**: los canales de registros y de actualizaciones ahora se eligen en Admin → Discord (además de `/config`); prefijo y comandos propios en el editor. Anuncio, registro y bienvenidas ya estaban en la web.
- **Intents**: el bot prueba con «Server Members» y «Message Content» y, si Discord no los permite, se conecta igualmente con los que sí estén activados.

## Archivos modificados
- Nuevos: `src/discord/custom.js`, `src/discord/script/` (`parser.js`, `runtime.js`, `functions.js`), `src/routes/discord-custom.js`, `public/admin/discord.html`, `public/js/dc-editor.js`, `public/dc-editor.css`.
- Modificados: `src/discord/index.js`, `src/discord/commands.js`, `src/routes/discord.js`, `src/index.js`, `src/db/schema.js`, `public/js/admin.js`, `README.md`, `RELEASE.md`.
- Versión: `package.json` y `data/version.json` pasan a `2.10.3`. Base de datos: nueva tabla `discord_vars` (se crea sola).

## Actualizar
Copia los archivos sobre tu instalación y reinicia el servidor. No hay dependencias nuevas. Para los comandos de prefijo o de mensaje, activa «Message Content Intent» en el Developer Portal (opcional).
