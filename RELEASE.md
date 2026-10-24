# Versión 2.13.0

File Cloud pasa a llamarse **SynapseBox**.

## Novedades
- **Nuevo nombre en todo el proyecto:** web (títulos, textos, correos y avisos), bot de Discord, wiki y editor de FCScript, instaladores, README y archivos de descarga (`synapsebox-codigos-recuperacion.txt`). El paquete ahora es `synapsebox`.
- **Nuevo repositorio:** https://github.com/OctavioproYT452/SynapseBox. El comprobador de versiones, `get.sh`, `get.ps1` y el aviso de actualización apuntan ya al repositorio nuevo.
- **Icono nuevo:** favicon vectorial (un cubo conectado por nodos, en degradado azul-cian), `apple-touch-icon` para iOS y el mismo cubo como logo en la barra superior y la pantalla de acceso.
- Los temas exportados usan ahora la clave `synapsebox`; los archivos de temas antiguos (con `filecloud`) siguen importándose sin problema.

## Compatibilidad con instalaciones anteriores
- **La base de datos se renombra sola** de `data/filecloud.db` a `data/synapsebox.db` al arrancar (con sus archivos `-wal`/`-shm`). No se pierde ningún dato.
- Las variables `FILECLOUD_*` antiguas (`FILECLOUD_VERSION_URL`, `FILECLOUD_REPO_URL`, `FILECLOUD_AI*`, `FILECLOUD_DIR`, `FILECLOUD_REPO`, `FILECLOUD_START`) siguen funcionando; las nuevas son `SYNAPSEBOX_*`.
- Si ya tenías `~/Filecloud` (o `%USERPROFILE%\Filecloud`), `get.sh` y `get.ps1` siguen usando esa carpeta para no duplicar la instalación. Para actualizar a mano: `git pull` (GitHub redirige el nombre antiguo) o `git remote set-url origin https://github.com/OctavioproYT452/SynapseBox.git`.
- **FCScript** conserva su nombre y las funciones `$fc…` (`$fcUser`, `$fcSpace`…) para que no se rompan los comandos ya creados.

## Archivos modificados
- Cambio de nombre en: `README.md`, `.env.example`, `package.json`, `get.sh`, `get.ps1`, `scripts/**`, `tools/**`, `src/**` (incl. `src/discord/**`, `src/version.js`, `src/db/connection.js`) y `public/**`
- Icono: `public/favicon.svg` (nuevo), `public/apple-touch-icon.png` (nuevo), `public/icons.svg`, todas las páginas `public/**/*.html`, `src/views/share-helpers.js`
- `RELEASE.md`, `package.json`, `data/version.json`
