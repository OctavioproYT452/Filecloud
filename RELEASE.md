# Versión 2.10.5

FCScript gana tarjetas completas, captcha con imagen, 40 funciones nuevas y funciones de IA; la wiki se rediseña. Documentación: [README](README.md#comandos-propios-fcscript).

## Novedades
- **Tarjetas completas:** `$footerIcon`, `$authorIcon`, `$authorUrl` y `$titleUrl` (junto a `$thumbnail`, `$image`, `$footer`, `$author`, que ya existían). Solo se aceptan enlaces `http(s)`.
- **Captcha:** `$genCaptcha[longitud]` dibuja una imagen PNG (letras y números deformados, ondas y ruido; sin dependencias nuevas), la envía **dentro de la tarjeta** junto con el resto del mensaje y guarda el código en la variable de usuario `captcha`. `$checkCaptcha[texto]` lo comprueba (sin distinguir mayúsculas, lo borra si acierta y lo invalida tras 5 fallos) y `$clearCaptcha` lo descarta. El botón Probar muestra la imagen.
- **Funciones nuevas (sin IA):**
  - Contexto: `$createdAt`, `$joinedAt`, `$userRoles`, `$serverIcon`, `$mentionRole`, `$mentionChannel`.
  - Variables: `$incUserVar`, `$incServerVar`, `$incGlobalVar` (con mínimo y máximo) y `$rankUserVar`.
  - Matemáticas: `$clamp`, `$percent`, `$progressBar`, `$randomColor`, `$plural`.
  - Texto: `$titleCase`, `$truncate`, `$pad`, `$count`, `$startsWith`, `$endsWith`, `$indexOf`, `$slug`, `$hash`, `$randomString`, `$shuffle`.
  - Tiempo: `$parseDate`, `$timeAgo`, `$daysBetween`. Lógica: `$chance`.
  - Moderación: `$setNickname`, `$unban`, `$slowmode`.
- **Funciones de IA** (usan la IA configurada): `$ai`, `$aiPersona`, `$aiAvailable`, `$aiSummarize`, `$aiTranslate`, `$aiFix`, `$aiRewrite`, `$aiExplain`, `$aiIdeas`, `$aiSentiment`, `$aiClassify`, `$aiModerate`.
  - Solo envían y reciben texto: no tienen acceso a archivos. Lo que escribe el usuario se envía como datos, no como instrucciones, y las menciones de la respuesta se desactivan.
  - Máximo 3 llamadas por ejecución; cuentan en el límite de IA de la cuenta vinculada de quien usa el comando (10 por hora si no tiene) y hay un tope global de 120 por hora.
  - Los comandos slash con IA responden «pensando…» y no caducan; los de prefijo/mensaje muestran «escribiendo…». La espera no cuenta para el límite de 4 s.
- **Wiki rediseñada** (160 funciones): portada con accesos rápidos y lista de novedades, índice lateral que marca la sección actual, filtros por categoría, buscador (tecla `/`), tarjetas con argumentos obligatorios/opcionales, etiqueta «Nuevo», enlace directo a cada función, anatomía de la tarjeta, tablas, y guías nuevas: **Captcha paso a paso**, **Funciones de IA** y **Problemas frecuentes**, más recetas nuevas (recompensa diaria, ficha de usuario, barra de progreso, traductor con IA).

## Archivos modificados
- Nuevos: `src/discord/script/captcha.js`, `src/ai/ask.js`.
- Modificados: `src/discord/script/functions.js`, `runtime.js`, `wiki.js`, `src/discord/custom.js`, `src/ai/index.js`, `src/routes/discord-custom.js`, `public/js/dc-wiki.js`, `public/js/dc-editor.js`, `public/dc-editor.css`, `README.md`, `RELEASE.md`.
- Versión: `package.json` y `data/version.json` pasan a `2.10.5`.

## Actualizar
Copia los archivos sobre tu instalación y reinicia. No hay cambios en la base de datos ni dependencias nuevas.
