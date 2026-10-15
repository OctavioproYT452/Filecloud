# Versión 2.9.1

Arreglo de la interfaz en móvil y aviso de dispositivo en los temas. Para la documentación completa, consulta el [README](README.md).

## Cambios
- **Móvil:** el diálogo de Apariencia ya no se desborda a los lados. Las pestañas se reparten en dos filas, los diálogos ocupan el ancho de la pantalla con márgenes ajustados y las cuadrículas de colores, temas y medios pasan a una o dos columnas.
- **Dispositivo del tema:** nueva opción «Este tema está pensado para» (Celular y PC / Solo celular / Solo PC) en *Fondo y botones*, y se pregunta al publicar el tema. La comunidad muestra una etiqueta en cada tema, permite filtrar por dispositivo y avisa cuando el fondo o los botones con imagen no son para tu dispositivo.

## Archivos modificados
`public/js/common.js`, `public/js/themes.js`, `public/themes.html`, `public/style.css`, `src/routes/themes.js`, `src/services/themes.js`. Versión: `package.json` y `data/version.json` pasan a `2.9.1`. Sin cambios en la base de datos.

---

# Versión 2.9.0

Comprimir y descomprimir ZIP, y fondos con imagen, GIF o vídeo en los temas. Para la documentación completa, consulta el [README](README.md).

## Novedades

### Comprimir y descomprimir
- **Comprimir en ZIP** (menú de cada archivo o carpeta, y botón *Comprimir* en selección múltiple): el ZIP se crea en la misma carpeta, dentro del espacio del propio usuario, con nombre único. Respeta la cuota y los permisos de las carpetas compartidas.
- **Descomprimir aquí** en los `.zip`: crea una carpeta nueva con el contenido. Protegido contra rutas peligrosas, enlaces simbólicos y bombas de compresión; comprueba el CRC; no admite ZIP con contraseña ni ZIP64.

### Temas con medios
- Nueva pestaña **Fondo y botones** en Apariencia:
  - **Fondo:** imagen, GIF o vídeo (MP4/WebM), con ajuste, oscurecido y desenfoque.
  - **Botones:** imagen o GIF, con ajuste y oscurecido.
- Los archivos se guardan en la carpeta **Temas** del usuario y ocupan su espacio; el tema solo guarda el nombre y desde ahí los dibuja. Galería para elegir o borrar archivos ya subidos.
- Al guardar o usar un tema de la comunidad, sus medios se **copian** a la carpeta Temas de quien lo guarda. Las páginas de enlaces compartidos también muestran el fondo del tema de quien comparte.

## Archivos modificados
- Nuevos: `src/lib/unzip.js`, `src/routes/tmedia.js`, `public/js/bgmedia.js`.
- Modificados: `src/lib/zip.js`, `src/routes/files.js`, `src/routes/themes.js`, `src/services/themes.js`, `src/views/share-helpers.js`, `src/index.js`, `public/js/common.js`, `public/js/panel.js`, `public/js/themes.js`, `public/panel.html`, `public/index.html`, `public/themes.html`, `public/admin/index.html`, `public/style.css`.
- Versión: `package.json` y `data/version.json` pasan a `2.9.0`. Sin cambios en la base de datos.

## Actualizar
Copia los archivos sobre tu instalación y reinicia el servidor.

---

# Versión 2.8.1

Los enlaces para compartir (`/s/<token>`) usan ahora los mismos visores de PDF y de Office que el panel, también para visitantes sin cuenta; si el enlace tiene contraseña, hay que desbloquearlo antes. Nuevos: `public/js/share.js` y la ruta `/s/<token>/convert`; modificados: `src/routes/share-page.js`, `src/routes/office.js`, `src/views/share-helpers.js`, `public/js/viewer.js`. Versión: `package.json` y `data/version.json` pasan a `2.8.1`.

---

# Versión 2.8.0

Visor de documentos (PDF y Office) y acceso WebDAV por usuario. Para la documentación completa, consulta el [README](README.md).

## Novedades

### Visor de PDF (arreglado)
- El PDF ya no depende del visor del navegador (que daba error o quedaba en blanco, sobre todo en móvil): ahora se dibuja con **pdf.js**, incluido en `public/vendor/`, con zoom y carga de páginas bajo demanda.

### Visor de documentos de Office
- Vista previa de `.doc .docx .xls .xlsx .ppt .pptx` (y `.odt .ods .odp .rtf`).
- Con **LibreOffice** instalado en el servidor se convierten a PDF para verlos con total fidelidad (caché de 6 h, límite de 40 MB).
- Sin LibreOffice, `docx`, `xlsx` y `pptx` se muestran directamente en el navegador (vista aproximada). Los formatos antiguos requieren LibreOffice.

### Acceso WebDAV por usuario
- **Menú de usuario → Acceso WebDAV**: el usuario lo activa o desactiva cuando quiera.
- Usuario de acceso = el de su cuenta. Contraseña = **clave aleatoria** nueva cada vez que se activa o se pulsa «Generar clave nueva»; se muestra una sola vez y en el servidor solo se guarda su hash. Activar pide la contraseña de la cuenta.
- Solo da acceso a la carpeta de archivos del propio usuario (no puede salir de ella, ni por rutas relativas ni por enlaces simbólicos) y respeta su cuota.
- Métodos: `GET PUT DELETE MKCOL COPY MOVE PROPFIND PROPPATCH LOCK UNLOCK`. Bloqueo tras 5 intentos fallidos. La clave no sirve para iniciar sesión en la web.

## Archivos modificados
- Nuevos: `src/services/webdav.js`, `src/routes/webdav.js`, `src/routes/office.js`, `public/js/viewer.js`, `public/js/webdav.js`, `public/vendor/` (pdf.js y JSZip).
- Modificados: `src/index.js`, `src/db/schema.js`, `src/middleware/security.js` (la CSP permite WebAssembly de pdf.js), `public/js/panel.js`, `public/js/menu.js`, `public/panel.html`, `public/style.css`.
- Base de datos: columnas nuevas `dav_on`, `dav_hash` y `dav_at` en `users` (se añaden solas al arrancar).
- Versión: `package.json` y `data/version.json` pasan a `2.8.0`.

## Actualizar
Copia los archivos sobre tu instalación y reinicia el servidor. No hay que instalar paquetes de npm. Opcional: instala LibreOffice para la vista completa de Office.
