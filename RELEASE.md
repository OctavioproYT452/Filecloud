# Versión 2.7.6

Rediseño de la administración, del diálogo de Apariencia y de la comunidad de temas: más aire, menos cosas a la vez y cada opción explicada. Para la documentación completa, consulta el [README](README.md).

## Novedades

### Menú común
- Administración y Comunidad de temas usan ahora el mismo **menú de usuario** (avatar) que el panel, en lugar del antiguo menú hamburguesa. Incluye acceso a Mis archivos, Administración, Comunidad, Apariencia y Cerrar sesión.

### Administración
- Cabecera de sección con título y descripción en cada pestaña.
- **Resumen**: tarjetas con icono y medidores de CPU, memoria y disco en columnas.
- **Usuarios**: buscador, avatar, etiquetas de rol, espacio con barra y botones claros (*Archivos*, *Editar*, eliminar). El diálogo de edición se divide en Cuenta, Espacio, Asistente de IA y Sesiones, con ayudas bajo cada campo.
- **Enlaces**: botones *Copiar* y *Revocar* y estado vacío explicado.
- **IA** y **Ajustes**: tarjetas por tema en dos columnas y botón de guardado siempre visible.

### Apariencia
- Tres pestañas: **Temas**, **Mis temas** (guardar, importar, exportar, publicar) y **Personalizar** (colores agrupados en Fondo y tarjetas, Texto, Acento y estados; más forma, tipografía y densidad).
- El botón *Aplicar* queda fijo al pie del diálogo.

### Comunidad de temas
- Cabecera, buscador, filtro **Todos / Míos**, orden y contador.
- Tarjetas con vista previa más grande; acciones principales (*Probar*, *Usar*) destacadas y las secundarias (*Guardar en Mis temas*, *Dejar de compartir*, *Retirar*) discretas.
- Estado vacío y explicación de cómo publicar un tema.

## Archivos modificados
- Nuevo: `public/js/nav.js`.
- Modificados: `public/admin/index.html`, `public/themes.html`, `public/js/admin.js`, `public/js/themes.js`, `public/js/common.js`, `public/style.css`.
- Versión: `package.json` y `data/version.json` pasan a `2.7.6`.

## Actualizar
Copia los archivos sobre tu instalación y reinicia el servidor. No hay cambios en la base de datos ni en los datos de los usuarios.
