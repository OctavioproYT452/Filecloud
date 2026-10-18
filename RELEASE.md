# Versión 2.10.4

Rediseño del editor de comandos de Discord, arreglo de la barra de edición y wiki de FCScript. Documentación: [README](README.md#comandos-propios-fcscript).

## Novedades
- **Arreglado:** la barra con los botones Guardar, Probar y Borrar no se veía porque el nombre de su clase (`bar`) coincidía con la barra de espacio de la web (10 px de alto y contenido oculto). Ahora todas las clases del editor llevan el prefijo `dc-`.
- **Editar, duplicar y borrar** comandos: botones en la barra del editor y en cada fila del explorador (también para carpetas). Sin guardar se marca con un punto naranja.
- **Nuevo diseño tipo editor de código:** explorador a la izquierda, pestaña del comando con barra de acciones, propiedades plegables, editor a pantalla completa con barra de estado (línea, columna, caracteres), panel de funciones a la derecha y panel inferior con **Problemas** y **Prueba**. En móvil el explorador y las funciones se abren como paneles.
- **Wiki de FCScript** (`/admin/discord-wiki.html`): guías (primeros pasos, sintaxis, condiciones, variables, respuestas, opciones, permisos, límites), recetas listas para copiar y las 100 funciones con descripción, ejemplo y resultado, con buscador y botón de copiar.

## Archivos modificados
- Nuevos: `src/discord/script/wiki.js`, `public/admin/discord-wiki.html`, `public/js/dc-wiki.js`.
- Modificados: `public/admin/discord.html`, `public/js/dc-editor.js`, `public/dc-editor.css`, `src/routes/discord-custom.js`, `README.md`, `RELEASE.md`.
- Versión: `package.json` y `data/version.json` pasan a `2.10.4`.

## Actualizar
Copia los archivos sobre tu instalación y reinicia. No hay cambios en la base de datos ni dependencias nuevas.
