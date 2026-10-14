# Versión 2.7.5

Rediseño de la interfaz de usuario del panel: el perfil y el menú estaban demasiado amontonados y ahora están ordenados y explicados. Para la documentación completa, consulta el [README](README.md).

## Novedades

### Menú de usuario
- El botón de la esquina muestra ahora tu inicial y tu nombre. En escritorio abre un **desplegable**; en móvil, la hamburguesa abre un **panel lateral** con el mismo contenido.
- Cabecera con avatar, nombre (y etiqueta ADMIN si procede) y barra de espacio usado.
- Opciones agrupadas, cada una con una línea que explica qué hace:
  - **Mis archivos**: Enlaces compartidos y Asistente IA (si está activado).
  - **Personalización**: Apariencia y Comunidad de temas.
  - **Mi cuenta**: Mi perfil, Seguridad y Administración (solo administradores).
- **Cerrar sesión** separado al final y en rojo.
- Se cierra con `Esc`, tocando fuera o al elegir una opción.

### Mi perfil
- Sustituye al antiguo diálogo «Mi cuenta», que mezclaba todo en un solo bloque. Ahora son tarjetas:
  - **Cabecera**: avatar grande, nombre y chip con el ID de la cuenta (se copia al pulsarlo).
  - **Almacenamiento**: barra de uso y desglose por tipo de archivo desplegable.
  - **Datos de acceso**: nombre de usuario y contraseña, cada uno con su botón «Cambiar» y su propio diálogo.
  - **Seguridad**: estado del 2FA y códigos de recuperación disponibles, acceso a su gestión y cierre de otras sesiones (con confirmación).
  - **Cerrar sesión**.
- El cambio de contraseña pide **repetir la nueva**; el servidor también lo comprueba (`next2`).

## Archivos modificados
- Nuevo: `public/js/menu.js`.
- Modificados: `public/panel.html`, `public/js/panel.js`, `public/style.css`, `src/routes/auth.js`.
- Versión: `package.json` y `data/version.json` pasan a `2.7.5`.

## Actualizar
Copia los archivos sobre tu instalación y reinicia el servidor. No hay cambios en la base de datos ni en los datos de los usuarios.

## Nota
Las páginas de la comunidad de temas y de administración conservan su menú hamburguesa anterior.
