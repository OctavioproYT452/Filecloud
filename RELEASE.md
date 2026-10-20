# Versión 2.11.0

**Papelera de reciclaje:** borrar ya no es definitivo.

## Novedades
- **Papelera** en la web (botón de la barra y menú de usuario): lista con ruta original, tamaño, quién lo borró y días restantes; **Restaurar**, **Eliminar definitivamente** y **Vaciar papelera**.
- Todo lo que se borra va a la papelera: panel web (también varios a la vez), **WebDAV**, el **asistente de IA** (ahora avisa de que se puede restaurar) y el borrado de archivos desde el panel de administración. Lo que borra un colaborador en una carpeta compartida va a la papelera del dueño.
- Restaurar recrea las carpetas que falten y no pisa nada: si el nombre ya existe, añade `(1)`. Comprueba la cuota.
- **Vaciado automático** a los N días y **tope por usuario** (se elimina lo más antiguo). La papelera no cuenta para la cuota.
- **Admin → Ajustes → Papelera de reciclaje:** activar, días (1–365) y tope en MB. Desactivada, borrar vuelve a ser definitivo.
- **Discord:** `/papelera ver | restaurar | vaciar` y eventos «borrados» en el registro de actividad.
- Al eliminar una cuenta se borra también su papelera.
- Nueva tabla `trash` (se crea sola) y carpeta `data/trash/`. Rutas `/api/trash`, `/api/trash/restore`, `/api/trash/delete`, `/api/trash/empty`.
