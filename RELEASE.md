# Versión 2.10.7

Las funciones de File Cloud de FCScript pueden hablar de otra persona, no solo de quien usa el comando.

## Novedades
- `$isLinked`, `$isFcAdmin`, `$fcUser`, `$fcSpace`, `$fcQuota` y `$fcPercent` aceptan un **ID o mención de Discord**: `$fcSpace[$mentioned[1]]`. Sin argumento siguen refiriéndose a quien usó el comando. Si esa persona no está vinculada (o está suspendida), `$isLinked` da false, `$fcUser` vacío y las demás un error claro.
- Revisadas todas las funciones: las demás que hablan de un usuario ya aceptaban ID (`$username`, `$nickname`, `$avatar`, `$mention`, `$isBot`, `$hasRole`, `$hasPerm`, `$isOwner`, `$createdAt`, `$joinedAt`, `$userRoles`, las variables de usuario y la moderación).
- Nueva guía de la wiki **Hablar de otra persona** con una receta de `!perfil @usuario` y una tabla de qué función acepta qué.
- La prueba del editor reconoce menciones (`<@ID>`) o IDs escritos en los argumentos.

## Archivos modificados
`src/discord/script/functions.js`, `wiki.js`, `src/discord/custom.js`, `public/js/dc-wiki.js`, `README.md`, `RELEASE.md`, `package.json`, `data/version.json`.

## Actualizar
Copia los archivos y reinicia. Sin cambios en la base de datos ni dependencias nuevas.
