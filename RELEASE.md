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
