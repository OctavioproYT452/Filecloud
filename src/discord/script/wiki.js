// Contenido de la wiki de FCScript (guías y ejemplos). Las funciones y sus descripciones salen de functions.js.
// Bloques: p (párrafo), code (código), ul (lista), tip (consejo). `código` en comillas invertidas.
const G = [
  { id: "inicio", title: "Primeros pasos", b: [
    { t: "p", v: "**FCScript** es el lenguaje de los comandos propios del bot. Escribes texto normal y, donde quieras algo dinámico, usas una **función** que empieza por `$`. El bot sustituye cada función por su resultado." },
    { t: "code", v: "Hola $nickname, estás en $serverName y hay $memberCount miembros." },
    { t: "p", v: "Para crear tu primer comando: en el editor pulsa **+ Comando**, elige nombre y tipo, escribe el código, pulsa **Probar** para ver el resultado sin enviar nada a Discord y luego **Guardar**." },
    { t: "ul", v: ["**Slash** (`/saludo`): aparece en el menú de Discord y puede tener opciones (texto, número, usuario…).", "**Prefijo** (`!saludo`): el usuario escribe el prefijo + nombre. Necesita «Message Content Intent».", "**Mensaje**: responde cuando alguien escribe un texto concreto (exacto, que lo contenga o que empiece así). También necesita «Message Content Intent»."] },
    { t: "tip", v: "Cada comando se guarda como un archivo `.fcs` en `data/discord-commands/<carpeta>/`. Puedes hacer copia de seguridad de esa carpeta." },
  ] },
  { id: "sintaxis", title: "Sintaxis", b: [
    { t: "p", v: "Una función se escribe `$nombre` o `$nombre[arg1;arg2;arg3]`. Los argumentos se separan con `;` y pueden contener otras funciones (anidadas)." },
    { t: "code", v: "$upper[$username]\n$replace[$message;malo;bueno]\n$calc[$random[1;6]+$random[1;6]]" },
    { t: "ul", v: ["Los nombres de función no distinguen mayúsculas: `$userName` = `$username`.", "**Escapes:** para escribir un carácter especial como texto usa `\\$`, `\\;`, `\\[`, `\\]` o `\\\\`.", "**Comentarios:** una línea que empieza por `//` se ignora, y `$c[texto]` también.", "**Saltos de línea:** las funciones que no escriben nada (`$title`, `$set`, `$onlyIf`, `$if`…) no dejan líneas en blanco en la respuesta."] },
    { t: "tip", v: "El nombre de una función termina en el primer carácter que no sea letra, número o `_`. Si pegas texto justo detrás sin espacio (`$usernamehola`), se leerá como otra función: separa con un espacio, un signo o usa `$newline`." },
    { t: "code", v: "// Esto es un comentario\nEl precio es \\$5 (el \\$ se escribe como texto)\n$c[otro comentario]" },
  ] },
  { id: "condiciones", title: "Condiciones y bucles", b: [
    { t: "p", v: "`$if[condición]` … `$elseif[condición]` … `$else` … `$endif`. Operadores: `==` `!=` `>` `<` `>=` `<=` y `~=` (contiene, sin distinguir mayúsculas). Combina con `&&` (y) y `||` (o). Si ambos lados son números se comparan como números." },
    { t: "code", v: "$if[$message==]\n  Escribe algo después del comando.\n$elseif[$message~=hola && $argCount<3]\n  ¡Hola a ti también!\n$else\n  Dijiste: $message\n$endif" },
    { t: "tip", v: "Los operadores solo cuentan si los escribes tú en el código: si el texto de un usuario contiene `&&` o `==`, no cambia la condición." },
    { t: "p", v: "`$for[variable;desde;hasta;paso]` repite, y lees la variable con `$get[variable]`. `$while[condición]` repite mientras se cumpla. Máximo 200 vueltas; `$break` sale del bucle." },
    { t: "code", v: "$for[i;1;5]\n$get[i]x2 = $calc[$get[i]*2]\n$endfor" },
  ] },
  { id: "variables", title: "Variables", b: [
    { t: "p", v: "**Temporales:** `$set[nombre;valor]` y `$get[nombre]`; duran solo mientras se ejecuta el comando." },
    { t: "p", v: "**Guardadas:** se conservan siempre (en la base de datos). Hay tres ámbitos: de usuario (`$setUserVar`, `$getUserVar`), de servidor de Discord (`$setServerVar`, `$getServerVar`) y globales (`$setGlobalVar`, `$getGlobalVar`). Los valores son texto de hasta 1000 caracteres; usa `$calc` para sumar." },
    { t: "code", v: "$setUserVar[monedas;$calc[$getUserVar[monedas;0]+10]]\nTienes $getUserVar[monedas;0] monedas." },
    { t: "p", v: "`$topUserVar[monedas;10]` devuelve un ranking de mayor a menor." },
  ] },
  { id: "respuestas", title: "Respuestas y tarjetas", b: [
    { t: "p", v: "El texto que no es una función es el mensaje. Si usas `$title`, `$description`, `$color`, `$addField`, `$footer`, `$image`, `$thumbnail` o `$author`, se envía además una **tarjeta** (embed). En comandos slash, `$ephemeral` hace que solo la vea quien lo usó." },
    { t: "code", v: "$title[Perfil de $nickname]\n$color[#4f8cff]\n$thumbnail[$avatar]\n$addField[Cuenta;$fcUser;yes]\n$addField[Espacio;$fcSpace de $fcQuota;yes]\n$footer[$serverName]\n$ephemeral" },
  ] },
  { id: "opciones", title: "Opciones y entrada del usuario", b: [
    { t: "p", v: "En un comando **slash** defines opciones en el formulario (nombre, tipo, obligatoria). Las lees con `$option[nombre]`. Tipos: `string` (texto), `integer`, `number`, `boolean`, `user`, `channel`, `role`." },
    { t: "p", v: "En comandos de **prefijo** y de **mensaje**, `$message` es todo lo que se escribió después del comando, `$message[2]` la segunda palabra y `$mentioned[1]` el ID del primer usuario mencionado." },
    { t: "code", v: "// Comando slash «saludar» con la opción «usuario» (tipo user)\nHola $mention[$option[usuario]], de parte de $username." },
  ] },
  { id: "permisos", title: "Permisos y control de acceso", b: [
    { t: "p", v: "En el formulario eliges quién puede usar el comando: todos, solo cuentas vinculadas, solo admins de File Cloud, o admins y gestores del servidor. Dentro del código puedes afinar:" },
    { t: "ul", v: ["`$onlyIf[condición;mensaje]` detiene el comando si no se cumple.", "`$onlyAdmin`, `$onlyPerms[BanMembers;mensaje]`, `$onlyRoles[idRol;mensaje]`, `$onlyLinked`.", "`$cooldown[segundos;mensaje]` limita cada cuánto lo usa cada persona.", "Las funciones de moderación (`$kick`, `$ban`, `$timeout`, `$giveRole`, `$deleteMessages`) exigen que **quien usa el comando** tenga el permiso de Discord correspondiente."] },
  ] },
  { id: "limites", title: "Límites y errores comunes", b: [
    { t: "ul", v: ["Máx. 4000 operaciones y 4 segundos por ejecución; 200 vueltas por bucle; 20 000 caracteres por comando; 200 comandos (60 slash).", "Si falta un `]`, un `$endif` o escribes una función que no existe, el editor marca la línea en rojo y la lista de **Problemas** lo explica.", "Un nombre de comando slash solo admite letras minúsculas, números, `-` y `_`, y no puede coincidir con los comandos del propio bot (`/ayuda`, `/cuenta`…).", "Cambiar un slash tarda unos segundos en aparecer en Discord.", "Los comandos de prefijo y de mensaje no responden si falta «Message Content Intent» (Developer Portal → Bot)."] },
  ] },
  { id: "recetas", title: "Recetas listas para copiar", b: [
    { t: "p", v: "**Contador de usos (prefijo):**" },
    { t: "code", v: "$setUserVar[usos;$calc[$getUserVar[usos;0]+1]]\n$mention, has usado este comando $getUserVar[usos] veces." },
    { t: "p", v: "**Bola 8 (slash con opción `pregunta`):**" },
    { t: "code", v: "$cooldown[5;Espera un poco.]\n$title[🎱 Bola 8]\n$description[**$option[pregunta]**\n$choose[Sí;No;Quizá;Seguro;Ni lo sueñes]]" },
    { t: "p", v: "**Mi espacio en File Cloud (slash, solo vinculados):**" },
    { t: "code", v: "$onlyLinked\n$ephemeral\n$title[Tu espacio]\n$description[Usas $fcSpace de $fcQuota ($fcPercent%)]" },
    { t: "p", v: "**Expulsar (prefijo, `!expulsar @usuario motivo`):**" },
    { t: "code", v: "$onlyPerms[KickMembers;No tienes permiso.]\n$onlyIf[$mentioned[1]!=;Menciona a alguien.]\n$kick[$mentioned[1];$message[2]]\nExpulsado $mention[$mentioned[1]]." },
    { t: "p", v: "**Responder a «buenos días» (tipo mensaje, contiene):**" },
    { t: "code", v: "$choose[¡Buenos días!;¡Muy buenas!;¡Hola!] $mention" },
    { t: "p", v: "**Ranking de monedas (slash):**" },
    { t: "code", v: "$title[🏆 Top monedas]\n$description[$topUserVar[monedas;10;{pos}. {user} — {value}]]" },
  ] },
];

// Ejemplos: nombre -> [código, resultado]; n: nota extra
const E = {
  message: ["$message[2]", "con «!cmd hola mundo» → mundo"], argCount: ["Escribiste $argCount palabras", "→ Escribiste 2 palabras"], option: ["$option[texto]", "valor de la opción «texto»"],
  mentioned: ["$mention[$mentioned[1]]", "menciona al primer usuario citado"], username: ["$username", "→ juan"], nickname: ["¡Hola $nickname!", "→ ¡Hola Juan!"], mention: ["$mention", "→ @Juan"],
  avatar: ["$thumbnail[$avatar]", "foto de perfil en la tarjeta"], serverName: ["Bienvenido a $serverName", ""], memberCount: ["Somos $memberCount", "→ Somos 42"],
  hasRole: ["$if[$hasRole[123456789012345678]==true]Eres VIP$endif", ""], hasPerm: ["$if[$hasPerm[ManageMessages]==true]…$endif", "permisos de Discord: ManageMessages, BanMembers, Administrator…"],
  title: ["$title[Hola]", ""], description: ["$description[Texto principal]", ""], color: ["$color[#ff5555]", ""], footer: ["$footer[Pie]", ""], image: ["$image[https://…/foto.png]", "solo enlaces http(s)"],
  addField: ["$addField[Nivel;$getUserVar[nivel;1];yes]", "tercer argumento: yes = en línea"], ephemeral: ["$ephemeral", "solo en slash"], sendMessage: ["$sendMessage[123456789012345678;Hola al canal]", "canal del mismo servidor"],
  sendDM: ["$sendDM[Te escribo por privado]", ""], addReaction: ["$addReaction[👍]", "solo prefijo/mensaje"], deleteCommand: ["$deleteCommand", "borra el mensaje del usuario"],
  onlyIf: ["$onlyIf[$message!=;Escribe algo.]", "si no se cumple, para y muestra el mensaje"], onlyAdmin: ["$onlyAdmin[Solo admins.]", ""], onlyPerms: ["$onlyPerms[BanMembers,KickMembers;Sin permiso.]", ""],
  onlyRoles: ["$onlyRoles[111,222;Necesitas un rol.]", ""], onlyLinked: ["$onlyLinked", "exige cuenta de File Cloud vinculada"], cooldown: ["$cooldown[30;Espera 30 segundos.]", "por persona y comando"],
  stop: ["$stop[Cancelado]", ""], default: ["$default[$message;nada]", "→ nada, si no se escribió nada"], set: ["$set[x;5]", ""], get: ["$get[x]", "→ 5"],
  setUserVar: ["$setUserVar[monedas;100]", ""], getUserVar: ["$getUserVar[monedas;0]", "segundo argumento: valor si no existe"], setServerVar: ["$setServerVar[bienvenida;Hola]", ""], getServerVar: ["$getServerVar[bienvenida]", ""],
  setGlobalVar: ["$setGlobalVar[eventos;3]", ""], getGlobalVar: ["$getGlobalVar[eventos;0]", ""], topUserVar: ["$topUserVar[monedas;5;{pos}. {user}: {value}]", "plantilla: {pos} {user} {value}"],
  calc: ["$calc[(2+3)*4]", "→ 20"], random: ["$random[1;6]", "→ 4"], round: ["$round[3.14159;2]", "→ 3.14"], floor: ["$floor[3.9]", "→ 3"], ceil: ["$ceil[3.1]", "→ 4"], abs: ["$abs[-5]", "→ 5"],
  min: ["$min[3;8;1]", "→ 1"], max: ["$max[3;8;1]", "→ 8"], sum: ["$sum[1;2;3]", "→ 6"], formatNumber: ["$formatNumber[1234567]", "→ 1.234.567"],
  trim: ["[$trim[  hola  ]]", "→ [hola]"], upper: ["$upper[hola]", "→ HOLA"], lower: ["$lower[HOLA]", "→ hola"], capitalize: ["$capitalize[hola]", "→ Hola"], length: ["$length[hola]", "→ 4"], wordCount: ["$wordCount[uno dos tres]", "→ 3"],
  replace: ["$replace[a-b-c;-;+]", "→ a+b+c"], substring: ["$substring[abcdef;1;4]", "→ bcd"], repeatText: ["$repeatText[ab;3]", "→ ababab"], reverse: ["$reverse[hola]", "→ aloh"],
  split: ["$split[a,b,c;,;2]", "→ b"], contains: ["$contains[Hola mundo;MUNDO]", "→ true"], choose: ["$choose[rojo;verde;azul]", "→ una al azar"], urlEncode: ["$urlEncode[a b]", "→ a%20b"], newline: ["Hola$newline$newline¿Qué tal?", "dos saltos de línea"],
  unix: ["$unix", "segundos desde 1970"], date: ["$date[DD/MM/YYYY HH:mm]", "→ 17/10/2026 20:30"], discordTime: ["$discordTime[$unix;R]", "→ «hace un momento» en la zona de cada persona"],
  duration: ["$duration[3700]", "→ 1 h 1 min 40 s"], uptime: ["$uptime", ""], fcUser: ["$fcUser", "vacío si no está vinculado"], fcSpace: ["$fcSpace", "→ 1.2 GB"], fcQuota: ["$fcQuota", ""], fcPercent: ["$fcPercent%", ""],
  fcUsers: ["$fcUsers cuentas", ""], fcVersion: ["File Cloud $fcVersion", ""],
  giveRole: ["$giveRole[123456789012345678;$mentioned[1]]", "necesita «Gestionar roles»"], takeRole: ["$takeRole[123456789012345678]", ""], kick: ["$kick[$mentioned[1];Spam]", "necesita «Expulsar miembros»"],
  ban: ["$ban[$mentioned[1];Spam]", "necesita «Banear miembros»"], timeout: ["$timeout[$mentioned[1];10;Calma]", "minutos; 0 quita el aislamiento"], deleteMessages: ["$deleteMessages[10]", "necesita «Gestionar mensajes»"],
  break: ["$for[i;1;9]$if[$get[i]==3]$break$endif$get[i]$endfor", "→ 12"], c: ["$c[nota]", ""], userId: ["$userId", ""], commandName: ["$commandName", ""], prefix: ["$prefix", ""],
  isBot: ["$isBot[$mentioned[1]]", ""], serverId: ["$serverId", ""], channelId: ["$channelId", ""], channelName: ["$channelName", ""], roleName: ["$roleName[123456789012345678]", ""],
  isFcAdmin: ["$if[$isFcAdmin==true]admin$endif", ""], isLinked: ["$if[$isLinked==true]vinculado$endif", ""], timestamp: ["$timestamp", "hora actual en la tarjeta"], author: ["$author[$username]", ""], thumbnail: ["$thumbnail[$avatar]", ""],
  delUserVar: ["$delUserVar[monedas]", ""], delServerVar: ["$delServerVar[x]", ""], delGlobalVar: ["$delGlobalVar[x]", ""],
};
module.exports = { GUIDES: G, EXAMPLES: E };
