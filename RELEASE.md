# Versión 2.10.8

El editor de comandos de Discord puede programar comandos con IA leyendo la wiki.

## Novedades
- **Botón ✨ IA en el editor:** describes lo que quieres (y, si quieres, el tipo de comando) y la IA configurada escribe el comando FCScript completo: nombre, tipo, descripción, acceso, opciones y código, más unas notas de uso.
- **Lee toda la wiki:** en cada petición recibe las guías, las recetas y la referencia de las funciones con sus ejemplos, y se le prohíbe inventar funciones.
- **Se comprueba y se corrige sola:** el resultado pasa por el analizador de FCScript; si hay errores se le devuelven a la IA para que los arregle (hasta 2 reintentos).
- **No guarda nada:** el comando aparece en el editor sin guardar, para que lo revises, lo pruebes y lo guardes tú. Con un comando abierto puedes pedirle modificaciones sobre él.
- **Límites:** solo administradores; una petición a la vez; cuenta un uso (aunque haya reintentos) del límite de IA del administrador; cada petición envía unos 10 000 tokens de contexto, así que conviene un modelo con buena ventana de contexto. Queda anotado en el registro del bot.
- Nueva API `POST /api/admin/discord/cmds/ai` y nueva función interna `ai.session` (sesiones largas de IA sin recortar respuestas).

## Archivos modificados
- Nuevo: `src/discord/script/aigen.js`.
- Modificados: `src/ai/ask.js`, `src/ai/index.js`, `src/discord/custom.js`, `src/routes/discord-custom.js`, `src/discord/script/wiki.js`, `public/js/dc-editor.js`, `README.md`, `RELEASE.md`, `package.json`, `data/version.json`.

## Actualizar
Copia los archivos y reinicia. Sin cambios en la base de datos ni dependencias nuevas.
