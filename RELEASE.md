# Versión 2.14.0

Funciones HTTP y JSON en SBScript, FCScript pasa a llamarse SBScript y arreglo de los iconos del login.

## Novedades
- **Funciones HTTP** (como las de BDFD): `$httpGet`, `$httpPost`, `$httpPut`, `$httpPatch`, `$httpDelete`, `$httpAddHeader[nombre;valor]`, `$httpStatus` y `$httpResult[clave;…]` (sin claves devuelve el texto; con claves entra en el JSON de la respuesta). Un último argumento opcional en las peticiones es un mensaje de error propio.
- **Funciones JSON:** `$jsonParse`, `$json`, `$jsonSet`, `$jsonSetString`, `$jsonUnset`, `$jsonClear`, `$jsonExists`, `$jsonStringify`, `$jsonPretty`, `$jsonArray`, `$jsonArrayAppend`, `$jsonArrayUnshift`, `$jsonArrayPop`, `$jsonArrayShift`, `$jsonArrayCount`, `$jsonArrayIndex`, `$jsonArrayReverse`, `$jsonArraySort` y `$jsonJoinArray`. Las listas empiezan en la posición 0; los corchetes de un JSON escrito a mano se escapan como `\[` y `\]`.
- **Seguridad de HTTP:** solo `http://` y `https://`; nunca hacia `localhost`, redes privadas ni direcciones internas (se comprueba la IP ya resuelta, también en redirecciones); máximo 5 peticiones por comando, 8 s y 1 MB por respuesta, 3 redirecciones, sin enviar credenciales a otro sitio al redirigir. Los datos JSON solo viven mientras se ejecuta el comando.
- **FCScript → SBScript:** el lenguaje de comandos propios se llama ahora SBScript. Las funciones `$fcUser`, `$fcSpace`, `$fcQuota`, `$fcPercent`, `$fcUsers` y `$fcVersion` pasan a `$sbUser`, `$sbSpace`, `$sbQuota`, `$sbPercent`, `$sbUsers` y `$sbVersion`. **Los comandos ya creados con los nombres antiguos siguen funcionando.**
- **Wiki:** categorías nuevas «HTTP» y «JSON» con ejemplos, una guía «HTTP y JSON (APIs)» y una receta para consultar una API. El recuadro **«Nuevo en la versión»** ahora muestra solo las funciones añadidas en esta versión (las 27 de HTTP y JSON), no todas las que se han ido añadiendo.
- **Generador de comandos con IA del editor:** su wiki está actualizada: conoce las funciones HTTP y JSON, la guía nueva y las reglas para usarlas (valida con `$httpStatus`, mensaje de error, listas desde 0, corchetes escapados en JSON escrito a mano, límites).

## Correcciones
- **Iconos del login:** los iconos de usuario y candado quedaban arriba del campo y el ojo de «mostrar contraseña» caía fuera de él. Ahora quedan centrados dentro del campo en escritorio y móvil.

## Archivos modificados
- `src/discord/script/httpjson.js` (nuevo), `src/discord/script/functions.js`, `src/discord/script/runtime.js`, `src/discord/script/parser.js`, `src/discord/script/wiki.js`, `src/discord/script/aigen.js`, `src/discord/custom.js`, `src/ai/ask.js`
- `public/auth.css`, `public/admin/discord-wiki.html`, `public/dc-editor.css`, `public/js/dc-panel.js`, `public/js/dc-editor.js`, `public/js/dc-wiki.js`, `public/js/admin.js`
- `README.md`, `RELEASE.md`, `package.json`, `data/version.json`
