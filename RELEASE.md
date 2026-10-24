# Versión 2.15.0

Sistema de plugins: amplía SynapseBox con código propio y compártelo en un repositorio de GitHub.

## Novedades
- **Plugins en Node.js:** un plugin puede cambiar iconos, imágenes, CSS, rutas, funciones y comportamiento, tanto en el servidor (`server.js`) como en las páginas (`client.js` y `style.css`). Se guardan en `data/plugins/<id>/`.
- **Activar y desactivar en caliente:** nueva pestaña **Admin → Plugins**. Los cambios se aplican al instante, sin reiniciar. El estado se guarda en `data/plugins-state.json`.
- **API para plugins (servidor):** `use`, `get`, `post`, `serveFile`, `serveDir`, `on`/`emit`, `transformHtml`, `inject`, `data` (almacenamiento propio), `db`, `core()`… Los plugins se montan **antes** que las rutas de SynapseBox, así que pueden sustituirlas. SDK de cliente: `window.SynapseBox`.
- **Descargar plugins:** pestaña «Repositorio» con las imágenes, categorías y botón Descargar/Actualizar, leídos de https://github.com/OctavioproYT452/SynapseBox-Puglins/.
- **Subir plugins:** formulario con **título, descripción, categoría, versión, de 1 a 5 imágenes (mínimo una) y archivo(s) obligatorios**. Node ejecuta `git` y crea una **rama y un pull request directamente en el repositorio principal (sin forks)** en `Categoría/nombre-del-plugin/` con su `plugin.json`, `images/` y los archivos. La cuenta debe tener permiso de escritura: se vincula desde el panel (código de dispositivo, sin clave en archivos) o con `PLUGINS_GITHUB_TOKEN` (push directo).
- **Variables nuevas (opcionales):** `PLUGINS_REPO`, `PLUGINS_GITHUB_CLIENT_ID` y `PLUGINS_GITHUB_TOKEN`.
- **Documentación:** web aparte con la guía para crear plugins y 6 plugins de ejemplo ya incluidos en el repositorio.

## Seguridad
- Los plugins se ejecutan con acceso total al servidor: solo se gestionan desde administradores y conviene activar únicamente los de confianza.
- Rutas de archivos validadas (sin `..`), extensiones permitidas, límites de tamaño (5 MB por archivo, 5 imágenes, 20 archivos), `git` sin shell y token oculto en los errores. El código `server.js` de un plugin nunca se sirve al navegador.

## Archivos modificados
- `src/services/plugins.js` (nuevo), `src/routes/plugins.js` (nuevo), `public/plugins-sdk.js` (nuevo), `src/index.js`, `public/admin/index.html`, `public/js/admin.js`, `src/discord/script/wiki.js`, `.env.example`
- `README.md`, `RELEASE.md`, `package.json`, `data/version.json`
