<div align="center">

# File Cloud

**Tu propia nube de archivos, ligera y autoalojada.**
Sube, organiza, edita y comparte archivos desde cualquier dispositivo, con usuarios, cuotas de espacio y un panel de administración.

![Node](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/Base%20de%20datos-SQLite-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/Licencia-MIT-blue)

</div>

> **Versión 2.8.1.** Qué ha cambiado en esta versión: consulta [RELEASE.md](RELEASE.md).

---

## Índice

1. [Características](#características)
2. [Requisitos](#requisitos)
3. [Instalación](#instalación)
4. [Primer arranque](#primer-arranque)
5. [Configuración](#configuración)
6. [Guía de uso](#guía-de-uso)
7. [Temas y personalización](#temas-y-personalización)
8. [Panel de administración](#panel-de-administración)
   - Relacionado: [Visor de documentos](#visor-de-documentos) y [Acceso WebDAV](#acceso-webdav)
9. [Agente de IA (opcional)](#agente-de-ia-opcional)
10. [Seguridad](#seguridad)
11. [Estructura del proyecto](#estructura-del-proyecto)
12. [API](#api)
13. [Despliegue en producción](#despliegue-en-producción)
14. [Copias de seguridad](#copias-de-seguridad)
15. [Migrar desde la versión 1](#migrar-desde-la-versión-1)
16. [Solución de problemas](#solución-de-problemas)
17. [Créditos](#créditos)
18. [Licencia](#licencia)

## Características

**Para los usuarios**

- Subida de archivos y **carpetas completas**, con barra de progreso y arrastrar y soltar.
- Explorador con vista de cuadrícula o lista, orden por nombre, fecha o tamaño y filtro instantáneo.
- **Búsqueda en todas tus carpetas**, **favoritos** y **archivos recientes**.
- Vista previa de imágenes, vídeo, audio, **PDF** y texto, **visor de documentos de Office** (doc, docx, xls, xlsx, ppt, pptx…) y editor integrado para archivos de texto y código.
- **Acceso WebDAV** opcional por usuario: monta tu carpeta como unidad de red con una clave aleatoria que tú generas.
- Renombrar, mover, **duplicar** y eliminar, también en **selección múltiple**.
- **Descarga en ZIP** de carpetas o de una selección de elementos.
- **Enlaces para compartir** con caducidad, **contraseña opcional**, revocables en cualquier momento y con descarga de carpetas en ZIP.
- **Carpetas colaborativas**: comparte una carpeta con otros usuarios por su UUID y asigna a cada uno un rol (solo lectura, edición, creación o permisos totales).
- Cuota de almacenamiento por usuario con desglose por tipo (imágenes, vídeo, audio, documentos y otros).
- **12 temas** y personalización completa (colores con selector o código hex, tipografía, redondeo y densidad), con **temas propios que se pueden exportar e importar como JSON** y una **comunidad de temas** para compartirlos con los demás usuarios del servidor.
- Atajos de teclado: `/` filtra, `Supr` elimina la selección, `Ctrl+A` selecciona todo, `Esc` sale de la selección.
- **Menú de usuario** ordenado por secciones (*Mis archivos*, *Personalización*, *Mi cuenta*): desplegable en escritorio y panel lateral (hamburguesa) en móvil.
- **Perfil** con tarjetas separadas: almacenamiento, datos de acceso, seguridad y sesiones.
- **Verificación en dos pasos (2FA/TOTP)** opcional para cada cuenta y **códigos de recuperación** para volver a entrar si olvidas el usuario o la contraseña.
- Inicio de sesión animado (todo por código, sin imágenes) con fondo ligero que se adapta al dispositivo y respeta `prefers-reduced-motion`.
- Diseño responsivo: barra superior completa en pantallas grandes y panel lateral en móvil.

**Para el administrador**

- Resumen con CPU, memoria y disco en vivo.
- Gestión de usuarios: crear, cambiar cuota y rol, suspender, restablecer contraseña, cerrar sesiones y eliminar.
- Explorador de los archivos de cualquier usuario.
- Listado y revocación de todos los enlaces compartidos.
- Ajustes: registro público, cuota por defecto y **anuncio** visible para todos los usuarios.

**Técnicas**

- Base de datos **SQLite** local, sin servidor externo.
- Contraseñas con `scrypt`, sesiones en base de datos, 2FA (TOTP) opcional y protección contra fuerza bruta.
- **Sin registros de actividad**, para no consumir disco ni memoria.
- Iconos SVG propios, sin librerías de iconos ni de interfaz externas.

## Requisitos

- [Node.js](https://nodejs.org) **18 o superior** (recomendado 22.13 o superior).
- npm.

La base de datos usa `node:sqlite` si tu Node lo incluye (22.13 o superior) y `better-sqlite3` en caso contrario. `better-sqlite3` se instala automáticamente como dependencia opcional; en algunos sistemas necesita herramientas de compilación si no hay binario precompilado.

## Instalación

### Opción 1: instalación en una línea

**Linux y macOS** (instala git y Node.js si faltan, clona el repositorio y ejecuta el instalador):

```bash
curl -fsSL https://raw.githubusercontent.com/OctavioproYT452/Filecloud/HEAD/get.sh | bash
```

**Windows** (PowerShell):

```powershell
irm https://raw.githubusercontent.com/OctavioproYT452/Filecloud/HEAD/get.ps1 | iex
```

Se instala en `~/Filecloud` (Linux/macOS) o `%USERPROFILE%\Filecloud` (Windows). Variables opcionales:

| Variable | Descripción |
| --- | --- |
| `FILECLOUD_DIR` | Carpeta de destino. |
| `FILECLOUD_REPO` | URL del repositorio (para usar un _fork_). |
| `FILECLOUD_START=1` | (Linux/macOS) arranca el servidor al terminar. |

Si ya existe la carpeta de destino como repositorio, se actualiza con `git pull`.

### Opción 2: clonar y ejecutar el instalador

```bash
git clone https://github.com/OctavioproYT452/Filecloud.git
cd Filecloud
bash scripts/unix/install.sh        # Linux y macOS
```

En Windows, haz doble clic en `scripts\windows\install.bat` o ejecuta `.\scripts\windows\install.ps1` en PowerShell.

Los instaladores detectan el sistema (apt, dnf/yum, pacman, zypper, apk, Homebrew, winget o Chocolatey), instalan Node.js y npm si no están, y ejecutan `npm install`. En Linux instalan Node.js 22 mediante NodeSource (apt, dnf, yum) o el repositorio de la distribución; necesitan `root` o `sudo` para instalar paquetes.

### Opción 3: manual

```bash
git clone https://github.com/OctavioproYT452/Filecloud.git
cd Filecloud
npm install
```

### Iniciar

```bash
npm start
```

Abre <http://localhost:3001>.

## Primer arranque

1. Abre la aplicación y pulsa **Registrarse**.
2. **El primer usuario que se registre es administrador** automáticamente.
3. Entra en **Admin** (menú superior) para crear usuarios, ajustar cuotas o cerrar el registro público.

## Configuración

Variables de entorno:

| Variable | Por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `3001` | Puerto en el que escucha el servidor. |
| `TRUST_PROXY` | _(vacío)_ | Pon `1` si estás detrás de un proxy inverso (Nginx, Caddy, Cloudflare…) para obtener la IP real y las cookies `Secure`. |

Ejemplo:

```bash
PORT=8080 TRUST_PROXY=1 npm start
```

Ajustes desde el panel de administración: registro público (activar o desactivar), cuota por defecto para nuevos usuarios y anuncio global. Una cuota de `-1` significa almacenamiento ilimitado.

## Guía de uso

| Quiero… | Cómo |
| --- | --- |
| Subir archivos | Botón **Subir**, o arrástralos a la ventana. |
| Subir una carpeta entera | **Subir carpeta**. |
| Buscar en todo mi espacio | Escribe en el filtro y pulsa **Enter**. |
| Descargar una carpeta | Menú **⋯** del elemento → **Descargar ZIP**. |
| Descargar varios elementos | **Seleccionar** → marca elementos → **ZIP**. |
| Compartir | Menú **⋯** → **Compartir**: elige caducidad y, si quieres, contraseña. |
| Gestionar mis enlaces | Menú de usuario → **Enlaces compartidos**. |
| Cambiar el aspecto | Menú de usuario → **Apariencia**. |
| Cambiar usuario o contraseña | Menú de usuario → **Mi perfil** → *Datos de acceso*. |
| Activar el 2FA o crear códigos de recuperación | Menú de usuario → **Seguridad**. |
| Recuperar mi cuenta | En el inicio de sesión: **¿Olvidaste tu usuario o contraseña?** |

Los enlaces compartidos tienen la forma `https://tu-dominio/s/<token>`. Cualquier persona con el enlace puede ver el contenido (y la contraseña, si la configuraste), sin necesidad de cuenta.

### Carpetas colaborativas

El dueño de una carpeta puede invitar a otros usuarios de la instancia:

1. En el menú de una carpeta (`⋯`), elige **Colaboración**.
2. Escribe el **UUID** del usuario (lo encuentra en *Mi perfil*, junto a su nombre), elige su rol y pulsa **Añadir**. Puedes cambiar el rol o quitar a alguien cuando quieras.
3. El usuario añadido verá la carpeta en su panel, en la sección **Compartidas conmigo**, junto al nombre del **dueño** y su rol. Puede abandonar la colaboración con el botón de salida de esa tarjeta.

| Rol | Ver y descargar | Editar contenido, renombrar y mover | Crear carpetas/archivos, subir y copiar | Borrar |
| --- | :-: | :-: | :-: | :-: |
| Solo lectura | ✔ | | | |
| Lectura y edición | ✔ | ✔ | | |
| Lectura, edición y creación | ✔ | ✔ | ✔ | |
| Permisos totales | ✔ | ✔ | ✔ | ✔ |

Notas:

- Los archivos siguen siendo del dueño y **cuentan para su cuota de espacio**.
- Los colaboradores solo ven la carpeta compartida y su contenido, nunca el resto de la cuenta del dueño. No pueden compartir con enlace, marcar favoritos ni cambiar los colaboradores.
- No se puede compartir la carpeta raíz. Si el dueño renombra o mueve la carpeta, la colaboración la sigue; si la borra, se elimina.
- Los permisos se comprueban siempre en el servidor, no solo en la interfaz.

### Menú de usuario y perfil

- El botón con tu inicial (en móvil, la hamburguesa) abre el menú: arriba tu nombre y el espacio usado, y debajo las opciones agrupadas con una breve explicación. Se cierra con `Esc`, tocando fuera o al elegir una opción.
- **Mi perfil** reúne en tarjetas el almacenamiento (con desglose por tipo), los datos de acceso (cada cambio en su propio diálogo, con confirmación de contraseña), la seguridad (estado del 2FA y cierre de otras sesiones) y el cierre de sesión.

### Registro, 2FA y recuperación de cuenta

- **Registro**: la contraseña se escribe dos veces (con indicador de coincidencia y de fuerza) y se generan **10 códigos de recuperación** de un solo uso, que se muestran una única vez y se pueden copiar o descargar.
- **2FA (TOTP)**: compatible con Google Authenticator, Aegis, Authy, 1Password… Cualquier cuenta, también las ya existentes, puede activarlo o desactivarlo en **Seguridad**. Se configura con la clave manual (o con el enlace `otpauth://` en el móvil). Desactivarlo pide la contraseña y un código.
- **Recuperación**: en el inicio de sesión, **¿Olvidaste tu usuario o contraseña?** pide un código de recuperación, muestra el usuario de la cuenta y permite elegir una contraseña nueva; al terminar se cierran todas las sesiones. Cada código solo sirve una vez; en **Seguridad** se pueden generar códigos nuevos (invalidan los anteriores).
- Con 2FA activado, el inicio de sesión también acepta un código de recuperación si no tienes la app a mano.
- Si te quedas sin acceso, un administrador con acceso al servidor puede ejecutar `node tools/reset-password.js <usuario> <nueva-contraseña>`, que además desactiva el 2FA de esa cuenta.

### Cuentas: UUID y nombre de usuario

- Cada usuario recibe al crearse un **UUID permanente** que nunca cambia. Sus archivos se guardan en `hosting/<uuid>/`, no con su nombre de usuario.
- El **nombre de usuario** solo existe en la base de datos y se puede cambiar (en **Mi perfil → Datos de acceso**, pidiendo la contraseña; los administradores pueden hacerlo desde el panel de admin). El cambio se refleja al instante en todas partes, por ejemplo como autor en la comunidad de temas, y no mueve ni renombra ningún archivo.
- Al actualizar desde una versión anterior, las carpetas antiguas (`hosting/<usuario>/`) se renombran solas a su UUID al primer arranque.

## Temas y personalización

Desde **Apariencia** puedes elegir un tema y retocar cada detalle. El cambio se ve al instante y se guarda en tu cuenta. El diálogo se organiza en tres pestañas: **Temas** (los incluidos), **Mis temas** (guardar, importar, exportar y publicar) y **Personalizar** (colores agrupados, redondeo, tipografía y densidad).

Temas incluidos: Medianoche, Océano, Bosque, Atardecer, Neón, Dracula, Terminal, Alto contraste, Claro suave, Nórdico, Papel y Menta.

Personalizable: 10 colores (fondo, tarjetas, elementos, texto, texto suave, acento, texto sobre acento, peligro, éxito y aviso), redondeo de esquinas, tipografía (moderna, clásica, monoespaciada o redondeada) y densidad (compacta, normal o amplia). Las páginas de enlaces compartidos usan el tema de quien comparte.

### Crear, exportar e importar temas

Cualquier usuario puede crear sus propios temas:

1. En **Apariencia → Personalizar**, ajusta los colores con el selector o escribiendo el código hex (`#RRGGBB`; también acepta `#RGB`), además del redondeo, la tipografía y la densidad.
2. En **Mis temas**, pulsa **Guardar el tema actual** para guardarlo en **Mis temas** (hasta 50 por usuario).
3. **Exportar actual** descarga el tema actual como archivo; **Exportar todos** descarga un paquete con todos tus temas.
4. **Importar (.json)** añade a Mis temas uno o varios archivos. Así puedes compartir temas por cualquier medio (GitHub, Discord, correo…).

Formato del archivo (también se acepta un objeto con solo los valores del tema):

```json
{
  "filecloud": "theme",
  "version": 1,
  "name": "Mi tema",
  "theme": {
    "bg": "#0b1020", "card": "#121a2e", "card2": "#18223a",
    "text": "#e8eefc", "muted": "#8d9ab3",
    "accent": "#6ea8fe", "on": "#04213f",
    "danger": "#ff6b7a", "ok": "#34d399", "warn": "#fbbf24",
    "r": 14, "font": "system", "sp": "1"
  }
}
```

- `r`: redondeo de 0 a 28. `font`: `system`, `serif`, `mono` o `rounded`. `sp` (densidad): `0.8`, `1` o `1.25`.
- Los paquetes usan `{"filecloud": "theme-pack", "themes": [ {…}, {…} ]}`.
- Los valores se validan al importar: solo se aceptan colores hex y los valores anteriores, así que un archivo ajeno no puede introducir código.

### Comunidad de temas

Cada servidor tiene su propia comunidad de temas, accesible desde el menú de usuario → **Comunidad de temas** (`/themes.html`).

- **Publicar:** en **Mis temas**, pulsa el icono del globo de un tema. Se mostrará con tu nombre de usuario; vuelve a pulsarlo para dejar de compartirlo. Es opcional: tus temas son privados por defecto.
- **Explorar:** busca por nombre o autor, filtra entre **Todos** y **Míos** y ordena por recientes, nombre o autor. Cada tema muestra una vista previa con sus colores.
- **Probar, usar o guardar:** **Probar** lo aplica temporalmente en la página, **Usar** lo guarda en tus temas y lo activa, y **Guardar en Mis temas** solo lo añade a **Mis temas**.
- Si cambias o borras un tema publicado, la comunidad se actualiza al instante. Los temas de usuarios suspendidos no se muestran.
- **Moderación:** los administradores pueden retirar cualquier tema de la comunidad (el autor lo conserva en su cuenta, pero deja de ser público).

## Visor de documentos

Al abrir un archivo en el panel se muestra una vista previa integrada:

- Los **enlaces compartidos** (`/s/<token>`) usan estos mismos visores en su vista previa, también para visitantes sin cuenta.
- **PDF**: visor propio con pdf.js (incluido en `public/vendor/`, no necesita Internet). Funciona en escritorio y móvil, con zoom y carga perezosa de páginas. Sustituye al visor del navegador, que fallaba en muchos dispositivos.
- **Word, Excel y PowerPoint** (`.doc .docx .xls .xlsx .ppt .pptx`, y también `.odt .ods .odp .rtf`):
  - Si el servidor tiene **LibreOffice** instalado (`soffice` en el PATH, o la variable `SOFFICE` con su ruta), el documento se convierte a PDF y se ve con total fidelidad. Las conversiones se guardan en caché (6 h), se hacen de una en una y el límite es de 40 MB.
  - Sin LibreOffice, **docx, xlsx y pptx** se dibujan directamente en el navegador (texto con formato, tablas, imágenes, hojas con pestañas y diapositivas). Es una vista aproximada. Los formatos antiguos (`.doc`, `.xls`, `.ppt`) y OpenDocument necesitan LibreOffice.
  - Instalar LibreOffice en Debian/Ubuntu: `sudo apt install libreoffice-core libreoffice-writer libreoffice-calc libreoffice-impress`.

## Acceso WebDAV

Cada usuario puede montar su carpeta como unidad de red (Windows, macOS, Linux y apps móviles con WebDAV).

1. **Menú de usuario → Acceso WebDAV → Activar** (pide la contraseña de la cuenta).
2. Se muestra **una sola vez** la clave generada al azar. El usuario es el mismo de la cuenta y la dirección es `https://tu-servidor/dav/`.
3. **Generar clave nueva** invalida la anterior; **Desactivar** cierra el acceso al instante.

Detalles:
- La clave **no sirve para entrar en la web** ni da acceso a nada fuera de tu carpeta de archivos; las cuentas suspendidas quedan bloqueadas.
- Se admiten `GET`, `PUT`, `DELETE`, `MKCOL`, `COPY`, `MOVE`, `PROPFIND`, `PROPPATCH`, `LOCK` y `UNLOCK` (los bloqueos son de cortesía, sin exclusión real). Se respeta la cuota (`507` si no hay espacio).
- Windows solo admite la autenticación Basic por **HTTPS** salvo que se cambie una opción del sistema; usa HTTPS siempre que sea posible. Detrás de Nginx no hace falta ninguna configuración extra (conviene `client_max_body_size 0`).

## Panel de administración

Disponible en `/admin/` solo para administradores. Usa el mismo menú de usuario que el panel (avatar arriba a la derecha) y cada sección explica qué hace: formularios con ayudas, opciones agrupadas y acciones principales destacadas.

- **Resumen:** usuarios, almacenamiento total, enlaces activos, sesiones activas y estado del servidor (se actualiza cada 5 s).
- **Usuarios:** alta, edición de cuota y rol, suspensión, cambio de contraseña, cierre de sesiones, explorador de archivos y eliminación.
- **Enlaces:** todos los enlaces compartidos, con opción de revocarlos.
- **IA:** activar o desactivar el agente de IA, elegir Grok, OpenAI (ChatGPT), Gemini u Ollama, API key, modelo y límite de usos (ver [Agente de IA](#agente-de-ia-opcional)).
- **Ajustes:** registro público, cuota por defecto y anuncio global.

### Actualizaciones

- La versión instalada está en `data/version.json`:

  ```json
  { "version": "2.8.1" }
  ```

- Cada 2 minutos el servidor lee ese archivo local y lo compara con el `data/version.json` publicado en GitHub. Si el de GitHub es más nuevo (se comparan los números: `2.10` es mayor que `2.9`), los **administradores** ven un aviso de nueva versión con instrucciones para actualizar.
- El aviso se puede cerrar, pero vuelve a aparecer cada vez que se abre el panel, el de administración o la comunidad de temas, hasta que actualices.
- Para actualizar: `git pull`, `npm install` y reiniciar el servidor. `data/version.json` es el único archivo de `data/` que se versiona.
- **Para publicar una versión nueva** (mantenedores): sube el número en `data/version.json` y haz _push_.
- Variables opcionales: `FILECLOUD_VERSION_URL` (otra URL de comprobación, útil en _forks_) y `FILECLOUD_REPO_URL` (enlace que muestra el aviso).

## Agente de IA (opcional)

Al terminar `npm install`, los instaladores (`scripts/unix/install.sh`, `scripts/windows/install.ps1`, `scripts/windows/install.bat` y los de una línea) ejecutan `tools/setup-ai.js`, que pregunta:

1. **¿Quieres configurar un agente de IA?**
   - **No** → se guarda en la base de datos que no hay IA. Al arrancar, el servidor lo lee y **oculta todo lo relacionado con la IA** (botón, chat, campos de límites y la propia API `/api/ai/*`, que responde 404).
   - **Sí** → eliges proveedor:
     - **Grok (xAI):** te muestra el enlace para conseguir la API key (<https://console.x.ai/>) y te pide que la pegues. También puedes indicar el modelo (por defecto `grok-4.7`).
     - **OpenAI (ChatGPT):** API key en <https://platform.openai.com/api-keys> (es la API de pago de OpenAI, distinta de una suscripción a ChatGPT). Modelo por defecto: `gpt-5-mini`.
     - **Google Gemini:** API key gratuita o de pago en <https://aistudio.google.com/apikey>. Modelo por defecto: `gemini-2.5-flash`.
     - **Ollama:** indicas la URL (por defecto `http://localhost:11434`) y el modelo (por defecto `llama3.1`; instálalo con `ollama pull llama3.1`).

Puedes repetir el asistente con `npm run setup-ai`. Para instalaciones sin teclado: `FILECLOUD_AI=none|grok|openai|gemini|ollama` junto con `FILECLOUD_AI_KEY`, `FILECLOUD_AI_MODEL` y `FILECLOUD_OLLAMA_URL`. Si no hay terminal interactiva, no se cambia nada y la IA queda desactivada.

### Activar, cambiar o desactivar desde el panel

En **Admin → IA** el administrador puede, en cualquier momento y sin reiniciar el servidor, activar la IA (aunque en la instalación dijera que no), pegar o cambiar la API key (con el enlace para conseguirla), cambiar entre Grok, OpenAI, Gemini y Ollama, elegir el modelo, probar la conexión o desactivarla. Cada proveedor en la nube conserva su propia API key y su modelo, así que puedes cambiar de uno a otro sin volver a pegarlos.

### Límites de uso

- **General:** número de usos **por hora o por día** para cada usuario (`-1` = ilimitado, `0` = nadie). Por defecto, 20 por hora.
- **Por usuario:** en **Admin → Usuarios → Editar** se puede dar a un usuario otro límite y otro periodo (vacío = usar el general; `0` = bloquearle la IA).
- Cada mensaje enviado al agente cuenta como **un uso** (aunque haga varias operaciones). Si el proveedor falla, el uso no se descuenta. Solo se procesa una petición a la vez por usuario.

### Qué puede hacer el agente (y qué no)

El agente trabaja **únicamente dentro de la carpeta del usuario que lo usa** (para él es la raíz `/`) y dispone solo de estas herramientas: listar, leer archivos de texto, crear carpetas, crear archivos de texto, mover, copiar y borrar. **No existe ninguna herramienta para ejecutar nada**: los archivos que crea son datos (permisos `0644`, nunca ejecutables) y las copias pierden el bit de ejecución.

- Las rutas se validan en el servidor (no se confía en el modelo): se rechazan `..`, rutas absolutas hacia fuera, caracteres de control y enlaces simbólicos, y no se puede operar sobre la carpeta raíz.
- Se respeta la cuota de almacenamiento del usuario.
- La API key se guarda en la base de datos (`data/filecloud.db`) y nunca se devuelve al navegador. Protege esa carpeta y sus copias de seguridad.
- Con Grok, OpenAI o Gemini, lo que el usuario escriba y el contenido de los archivos que el agente lea se envían a xAI, OpenAI o Google respectivamente; con Ollama todo queda en tu servidor. Tenlo en cuenta al elegir proveedor.

## Seguridad

- Contraseñas cifradas con `scrypt` y sal individual.
- Sesiones aleatorias de 256 bits guardadas con hash en la base de datos; cookie `HttpOnly` y `SameSite=Lax` (y `Secure` bajo HTTPS).
- Bloqueo temporal tras 5 intentos fallidos de acceso, también en el segundo factor y en la recuperación de cuenta.
- 2FA con TOTP (RFC 6238): cada código solo se acepta una vez y el paso intermedio del inicio de sesión caduca a los 5 minutos.
- Los códigos de recuperación se guardan solo como hash y se gastan al usarse.
- Protección CSRF mediante comprobación del origen.
- Rutas validadas contra _path traversal_; los archivos de los usuarios nunca se sirven de forma pública sin un enlace.
- Los archivos HTML o de script subidos se sirven aislados (`sandbox`) para que no puedan actuar con la sesión de nadie.
- **WebDAV**: la clave se genera al azar (≈100 bits), solo se guarda su hash, cada usuario solo ve su carpeta (también se comprueban los enlaces simbólicos), hay bloqueo tras 5 intentos fallidos y la cuota se respeta.
- Cabeceras `Content-Security-Policy`, `X-Content-Type-Options` y `X-Frame-Options`.
- Los enlaces compartidos usan tokens aleatorios, pueden caducar y se pueden proteger con contraseña.

> Recomendación: publícalo siempre detrás de HTTPS.

## Estructura del proyecto

```
.
├── server.js              # Punto de entrada (para npm start, pm2 y systemd): carga src/
├── src/                   # Código del servidor
│   ├── index.js           # Arranque: Express, middleware, rutas y tareas periódicas
│   ├── config.js          # Rutas (data, hosting, public), puerto y duración de sesión
│   ├── version.js         # Comprobación de nuevas versiones
│   ├── db/                # Base de datos SQLite
│   │   ├── index.js       #   Ayudantes get / all / run / now
│   │   ├── connection.js  #   Apertura (node:sqlite o better-sqlite3)
│   │   ├── schema.js      #   Tablas, columnas y UUID de usuario
│   │   ├── passwords.js   #   Contraseñas con scrypt
│   │   └── migrations.js  #   Migración desde users.json y carpetas antiguas
│   ├── middleware/
│   │   ├── security.js    #   Cabeceras, cuerpo de las peticiones y CSRF
│   │   └── auth.js        #   Sesión y guardas need / needAdmin
│   ├── services/
│   │   ├── auth.js        #   Sesiones, intentos fallidos y validaciones de cuenta
│   │   ├── collab.js      #   Roles, permisos y espacio de cada petición
│   │   ├── twofa.js       #   2FA (TOTP) y códigos de recuperación
│   │   ├── themes.js      #   Validación de temas y generación del CSS
│   │   └── webdav.js      #   Servidor WebDAV (/dav)
│   ├── routes/
│   │   ├── auth.js        #   Registro, login, sesión, usuario y contraseña
│   │   ├── security.js    #   2FA, códigos de recuperación y recuperación de cuenta
│   │   ├── files.js       #   Archivos: listar, subir, editar, mover, copiar, ZIP…
│   │   ├── shares.js      #   API de enlaces para compartir
│   │   ├── collab.js      #   Carpetas colaborativas: colaboradores y roles
│   │   ├── webdav.js      #   Ajustes de WebDAV de cada usuario
│   │   ├── office.js      #   Conversión de documentos a PDF (LibreOffice) para la vista previa
│   │   ├── share-page.js  #   Páginas públicas /s/<token>
│   │   ├── explore.js     #   Búsqueda, estadísticas, favoritos y recientes
│   │   ├── themes.js      #   Apariencia y comunidad de temas
│   │   ├── admin.js       #   Panel de administración
│   │   └── ai.js          #   API del agente de IA
│   ├── views/
│   │   └── share-helpers.js # HTML y formato de la página compartida
│   ├── lib/
│   │   ├── utils.js       #   sha, esc, cookies, wrap…
│   │   ├── settings.js    #   Ajustes globales (tabla settings)
│   │   ├── paths.js       #   Rutas seguras dentro de la carpeta del usuario
│   │   ├── storage.js     #   Tamaños, cuota, nombres únicos y mover archivos
│   │   ├── serve.js       #   Envío y vista previa aislada de archivos
│   │   └── zip.js         #   Generador ZIP en streaming (sin dependencias)
│   └── ai/                # Agente de IA (Grok/OpenAI/Gemini/Ollama)
│       ├── index.js       #   API pública del módulo
│       ├── config.js      #   Configuración guardada en la base de datos
│       ├── validate.js    #   Validación de URL, modelo, clave y límites
│       ├── limits.js      #   Límites de uso por usuario
│       ├── llm.js         #   Cliente del proveedor y prueba de conexión
│       ├── tools.js       #   Herramientas con sandbox (confinadas a la carpeta del usuario)
│       ├── chat.js        #   Bucle de conversación
│       └── constants.js   #   Constantes
├── tools/                 # Utilidades de terminal
│   ├── setup-ai.js        #   Asistente de configuración de la IA (lo ejecuta el instalador)
│   └── reset-password.js  #   Recuperación de cuentas
├── scripts/               # Instaladores
│   ├── unix/              #   Linux y macOS
│   │   ├── install.sh
│   │   └── lib/           #     common.sh, node.sh
│   └── windows/           #   Windows
│       ├── install.ps1
│       ├── install.bat    #     Doble clic
│       └── lib/           #     common.ps1, node.ps1
├── get.sh / get.ps1       # Instalación en una línea (git + clonar + instalar)
├── public/
│   ├── index.html         # Inicio de sesión, registro y recuperación
│   ├── panel.html         # Panel del usuario
│   ├── vendor/            # pdf.js y JSZip (incluidos, sin depender de Internet)
│   ├── themes.html        # Comunidad de temas
│   ├── admin/             # Panel de administración
│   ├── js/                # common.js, auth.js, bg.js, menu.js, nav.js, viewer.js, webdav.js, security.js, panel.js, admin.js, ai.js
│   ├── auth.css           # Animaciones del inicio de sesión
│   ├── style.css          # Sistema de diseño compartido
│   └── icons.svg          # Iconos SVG
├── hosting/               # Archivos de los usuarios (una carpeta por usuario, nombrada con su UUID)
└── data/                  # Base de datos SQLite (se crea sola) y version.json
```

## API

Todas las rutas `/api/*` devuelven JSON y requieren sesión, salvo `login`, `register` y `session`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/register`, `/api/login`, `/api/login/2fa`, `/api/logout` | Cuenta y sesión (el registro pide la contraseña dos veces y devuelve los códigos de recuperación; `login/2fa` completa el inicio de sesión con el código TOTP). |
| `GET`/`POST` | `/api/security`, `/api/2fa/setup`, `/api/2fa/enable`, `/api/2fa/disable`, `/api/recovery/regenerate` | 2FA (TOTP) y códigos de recuperación de la cuenta propia. |
| `POST` | `/api/recover/check`, `/api/recover` | Recuperar usuario y contraseña con un código de recuperación (sin sesión). |
| `GET` | `/api/session` | Estado de la sesión. |
| `POST` | `/api/password`, `/api/username` | Cambiar contraseña y nombre de usuario. |
| `GET` | `/api/list?path=` | Listar una carpeta. Con `collab=<id>` (también en las demás rutas de archivos) actúa dentro de una carpeta compartida contigo, según tu rol. |
| `GET` | `/api/search?q=`, `/api/recent`, `/api/favs` | Búsqueda, recientes y favoritos. |
| `POST` | `/api/mkdir`, `/api/create-file`, `/api/upload` | Crear y subir. |
| `POST` | `/api/rename`, `/api/move`, `/api/copy`, `/api/delete`, `/api/edit`, `/api/fav` | Operaciones sobre elementos. |
| `GET` | `/api/download`, `/api/preview`, `/api/zip`, `/api/file-content` | Lectura y descarga. |
| `POST` / `GET` | `/api/share`, `/api/shares`, `/api/share/revoke` | Enlaces compartidos. |
| `GET` | `/api/collab/shared` | Carpetas que otros han compartido conmigo (dueño y rol). |
| `GET` / `POST` | `/api/collab/folder`, `/api/collab/add`, `/api/collab/role`, `/api/collab/remove`, `/api/collab/mine`, `/api/collab/roles` | Gestión de colaboradores (dueño); `remove` también permite abandonar una carpeta compartida. |
| `GET` / `POST` | `/api/theme` | Tema activo del usuario. |
| `GET` / `POST` / `DELETE` | `/api/themes` | Temas propios guardados (Mis temas). |
| `POST` / `GET` | `/api/themes/publish`, `/api/community`, `/api/community/save`, `/api/community/unpublish` | Comunidad de temas. |
| `GET` | `/api/convert` | Convierte un documento de Office a PDF con LibreOffice para la vista previa (501 si no está instalado). |
| `GET` / `POST` | `/api/webdav`, `/api/webdav/enable`, `/api/webdav/disable` | Estado, activación (pide la contraseña y devuelve la clave una sola vez) y desactivación del acceso WebDAV. |
| `*` | `/dav/*` | Servidor WebDAV (Basic: tu usuario y la clave WebDAV). |
| `GET` | `/api/stats` | Uso de espacio por tipo. |
| `GET` / `POST` | `/api/ai/status`, `/api/ai/chat` | Agente de IA (404 si está desactivada). |
| `*` | `/api/admin/*` | Administración (solo admins), incluida `/api/admin/ai`. |

## Despliegue en producción

### Con PM2

```bash
npm install -g pm2
TRUST_PROXY=1 pm2 start server.js --name file-cloud
pm2 save && pm2 startup
```

### Con systemd

```ini
# /etc/systemd/system/file-cloud.service
[Unit]
Description=File Cloud
After=network.target

[Service]
WorkingDirectory=/opt/file-cloud
ExecStart=/usr/bin/node server.js
Environment=PORT=3001 TRUST_PROXY=1
Restart=always
User=filecloud

[Install]
WantedBy=multi-user.target
```

### Proxy inverso con Nginx

```nginx
server {
    server_name nube.ejemplo.com;
    client_max_body_size 0;          # sin límite de subida (la cuota la controla la app)

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
    }
}
```

Añade HTTPS con Certbot o usa Caddy, que lo configura solo.

## Copias de seguridad

Todo el estado de la aplicación está en dos carpetas:

- `data/` → base de datos (usuarios, sesiones, enlaces, favoritos y ajustes).
- `hosting/` → archivos de los usuarios (una carpeta por UUID; la relación UUID ↔ nombre está en la base de datos, así que guarda ambas carpetas juntas).

Con el servidor parado, copia ambas carpetas. Para restaurar, devuélvelas a su sitio.

## Migrar desde la versión 1

Si tienes un `data/users.json` de la versión anterior, se importa solo al primer arranque: los usuarios, sus cuotas y roles se conservan, y las contraseñas en texto plano se cifran. El archivo original se renombra a `users.json.migrado`.

Las carpetas de usuario pasan a nombrarse con su UUID (se renombran solas al arrancar).

Los enlaces antiguos (`/share/usuario/ruta` y `/files/...`) dejan de funcionar por seguridad: vuelve a compartir los elementos para generar enlaces nuevos.

## Solución de problemas

| Problema | Solución |
| --- | --- |
| `Cannot find module 'better-sqlite3'` | Usa Node 22.13+ o ejecuta `npm install` con herramientas de compilación disponibles. |
| Las subidas grandes fallan tras un proxy | Aumenta `client_max_body_size` en Nginx o su equivalente. |
| Todos los usuarios aparecen con la misma IP | Arranca con `TRUST_PROXY=1` si usas proxy inverso. |
| «Credenciales inválidas» con cuentas de la versión 1 | Comprueba que `data/users.json` estaba en la carpeta al primer arranque (la consola indica cuántos usuarios se importaron). Si no, crea o recupera la cuenta con `node tools/reset-password.js <usuario> <contraseña> --admin`. |
| Olvidé la contraseña o el usuario | En el login pulsa «¿Olvidaste tu usuario o contraseña?» e introduce uno de tus códigos de recuperación (Menú de usuario → Seguridad). Si no los tienes: Otro administrador puede restablecerla desde el panel, o ejecuta `node tools/reset-password.js <usuario> <nueva-contraseña>` en el servidor. Sin argumentos, el comando lista los usuarios existentes. |
| El ZIP de una carpeta falla | El límite es 4 GB por ZIP y 65 000 archivos. |

## Créditos

- **Autor:** Jesús Octavio Olivera Silva
- **Co-Owner:** [TwisSpark](https://github.com/TwisSpark)

¿Encontraste un fallo o tienes una idea? Abre un _issue_ o un _pull request_.

## Licencia

Distribuido bajo la licencia [MIT](LICENSE).
