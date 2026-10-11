<div align="center">

# File Cloud

**Tu propia nube de archivos, ligera y autoalojada.**
Sube, organiza, edita y comparte archivos desde cualquier dispositivo, con usuarios, cuotas de espacio y un panel de administración.

![Node](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/Base%20de%20datos-SQLite-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/Licencia-MIT-blue)

</div>

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
- Vista previa de imágenes, vídeo, audio, PDF y texto, y editor integrado para archivos de texto y código.
- Renombrar, mover, **duplicar** y eliminar, también en **selección múltiple**.
- **Descarga en ZIP** de carpetas o de una selección de elementos.
- **Enlaces para compartir** con caducidad, **contraseña opcional**, revocables en cualquier momento y con descarga de carpetas en ZIP.
- Cuota de almacenamiento por usuario con desglose por tipo (imágenes, vídeo, audio, documentos y otros).
- **12 temas** y personalización completa (colores con selector o código hex, tipografía, redondeo y densidad), con **temas propios que se pueden exportar e importar como JSON** y una **comunidad de temas** para compartirlos con los demás usuarios del servidor.
- Atajos de teclado: `/` filtra, `Supr` elimina la selección, `Ctrl+A` selecciona todo, `Esc` sale de la selección.
- Diseño responsivo: menú hamburguesa en móvil y barra superior completa en pantallas grandes.

**Para el administrador**

- Resumen con CPU, memoria y disco en vivo.
- Gestión de usuarios: crear, cambiar cuota y rol, suspender, restablecer contraseña, cerrar sesiones y eliminar.
- Explorador de los archivos de cualquier usuario.
- Listado y revocación de todos los enlaces compartidos.
- Ajustes: registro público, cuota por defecto y **anuncio** visible para todos los usuarios.

**Técnicas**

- Base de datos **SQLite** local, sin servidor externo.
- Contraseñas con `scrypt`, sesiones en base de datos y protección contra fuerza bruta.
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
bash install.sh        # Linux y macOS
```

En Windows, haz doble clic en `install.bat` o ejecuta `.\install.ps1` en PowerShell.

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
| Gestionar mis enlaces | **Enlaces** en el menú superior. |
| Cambiar el aspecto | **Apariencia** en el menú superior. |

Los enlaces compartidos tienen la forma `https://tu-dominio/s/<token>`. Cualquier persona con el enlace puede ver el contenido (y la contraseña, si la configuraste), sin necesidad de cuenta.

### Cuentas: UUID y nombre de usuario

- Cada usuario recibe al crearse un **UUID permanente** que nunca cambia. Sus archivos se guardan en `hosting/<uuid>/`, no con su nombre de usuario.
- El **nombre de usuario** solo existe en la base de datos y se puede cambiar (en **Mi cuenta → Cambiar nombre de usuario**, pidiendo la contraseña; los administradores pueden hacerlo desde el panel de admin). El cambio se refleja al instante en todas partes, por ejemplo como autor en la comunidad de temas, y no mueve ni renombra ningún archivo.
- Al actualizar desde una versión anterior, las carpetas antiguas (`hosting/<usuario>/`) se renombran solas a su UUID al primer arranque.

## Temas y personalización

Desde **Apariencia** puedes elegir un tema y retocar cada detalle. El cambio se ve al instante y se guarda en tu cuenta.

Temas incluidos: Medianoche, Océano, Bosque, Atardecer, Neón, Dracula, Terminal, Alto contraste, Claro suave, Nórdico, Papel y Menta.

Personalizable: 10 colores (fondo, tarjetas, elementos, texto, texto suave, acento, texto sobre acento, peligro, éxito y aviso), redondeo de esquinas, tipografía (moderna, clásica, monoespaciada o redondeada) y densidad (compacta, normal o amplia). Las páginas de enlaces compartidos usan el tema de quien comparte.

### Crear, exportar e importar temas

Cualquier usuario puede crear sus propios temas:

1. En **Apariencia**, ajusta los colores con el selector o escribiendo el código hex (`#RRGGBB`; también acepta `#RGB`), además del redondeo, la tipografía y la densidad.
2. Pulsa **Guardar como tema** para guardarlo en **Mis temas** (hasta 50 por usuario).
3. **Exportar (.json)** descarga el tema actual como archivo; **Exportar todos** descarga un paquete con todos tus temas.
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

Cada servidor tiene su propia comunidad de temas, accesible desde **Apariencia → Comunidad de temas** (`/themes.html`).

- **Publicar:** en **Mis temas**, pulsa el icono del globo de un tema. Se mostrará con tu nombre de usuario; vuelve a pulsarlo para dejar de compartirlo. Es opcional: tus temas son privados por defecto.
- **Explorar:** busca por nombre o autor y ordena por recientes, nombre o autor. Cada tema muestra una vista previa con sus colores.
- **Probar, usar o guardar:** **Probar** lo aplica temporalmente en la página, **Usar** lo guarda en tus temas y lo activa, y **Guardar** solo lo añade a **Mis temas**.
- Si cambias o borras un tema publicado, la comunidad se actualiza al instante. Los temas de usuarios suspendidos no se muestran.
- **Moderación:** los administradores pueden retirar cualquier tema de la comunidad (el autor lo conserva en su cuenta, pero deja de ser público).

## Panel de administración

Disponible en `/admin/` solo para administradores.

- **Resumen:** usuarios, almacenamiento total, enlaces activos, sesiones activas y estado del servidor (se actualiza cada 5 s).
- **Usuarios:** alta, edición de cuota y rol, suspensión, cambio de contraseña, cierre de sesiones, explorador de archivos y eliminación.
- **Enlaces:** todos los enlaces compartidos, con opción de revocarlos.
- **IA:** activar o desactivar el agente de IA, elegir Grok u Ollama, API key, modelo y límite de usos (ver [Agente de IA](#agente-de-ia-opcional)).
- **Ajustes:** registro público, cuota por defecto y anuncio global.

### Actualizaciones

- La versión instalada está en `data/version.json`:

  ```json
  { "version": "2.3" }
  ```

- Cada 2 minutos el servidor lee ese archivo local y lo compara con el `data/version.json` publicado en GitHub. Si el de GitHub es más nuevo (se comparan los números: `2.10` es mayor que `2.9`), los **administradores** ven un aviso de nueva versión con instrucciones para actualizar.
- El aviso se puede cerrar, pero vuelve a aparecer cada vez que se abre el panel, el de administración o la comunidad de temas, hasta que actualices.
- Para actualizar: `git pull`, `npm install` y reiniciar el servidor. `data/version.json` es el único archivo de `data/` que se versiona.
- **Para publicar una versión nueva** (mantenedores): sube el número en `data/version.json` y haz _push_.
- Variables opcionales: `FILECLOUD_VERSION_URL` (otra URL de comprobación, útil en _forks_) y `FILECLOUD_REPO_URL` (enlace que muestra el aviso).

## Agente de IA (opcional)

Al terminar `npm install`, los instaladores (`install.sh`, `install.ps1`, `install.bat` y los de una línea) ejecutan `setup-ai.js`, que pregunta:

1. **¿Quieres configurar un agente de IA?**
   - **No** → se guarda en la base de datos que no hay IA. Al arrancar, el servidor lo lee y **oculta todo lo relacionado con la IA** (botón, chat, campos de límites y la propia API `/api/ai/*`, que responde 404).
   - **Sí** → eliges proveedor:
     - **Grok (xAI):** te muestra el enlace para conseguir la API key (<https://console.x.ai/>) y te pide que la pegues. También puedes indicar el modelo.
     - **Ollama:** indicas la URL (por defecto `http://localhost:11434`) y el modelo (por defecto `llama3.1`; instálalo con `ollama pull llama3.1`).

Puedes repetir el asistente con `npm run setup-ai`. Para instalaciones sin teclado: `FILECLOUD_AI=none|grok|ollama` junto con `FILECLOUD_AI_KEY`, `FILECLOUD_AI_MODEL` y `FILECLOUD_OLLAMA_URL`. Si no hay terminal interactiva, no se cambia nada y la IA queda desactivada.

### Activar, cambiar o desactivar desde el panel

En **Admin → IA** el administrador puede, en cualquier momento y sin reiniciar el servidor, activar la IA (aunque en la instalación dijera que no), pegar o cambiar la API key de Grok (con el enlace para conseguirla), cambiar de Grok a Ollama (URL + modelo), probar la conexión o desactivarla.

### Límites de uso

- **General:** número de usos **por hora o por día** para cada usuario (`-1` = ilimitado, `0` = nadie). Por defecto, 20 por hora.
- **Por usuario:** en **Admin → Usuarios → Editar** se puede dar a un usuario otro límite y otro periodo (vacío = usar el general; `0` = bloquearle la IA).
- Cada mensaje enviado al agente cuenta como **un uso** (aunque haga varias operaciones). Si el proveedor falla, el uso no se descuenta. Solo se procesa una petición a la vez por usuario.

### Qué puede hacer el agente (y qué no)

El agente trabaja **únicamente dentro de la carpeta del usuario que lo usa** (para él es la raíz `/`) y dispone solo de estas herramientas: listar, leer archivos de texto, crear carpetas, crear archivos de texto, mover, copiar y borrar. **No existe ninguna herramienta para ejecutar nada**: los archivos que crea son datos (permisos `0644`, nunca ejecutables) y las copias pierden el bit de ejecución.

- Las rutas se validan en el servidor (no se confía en el modelo): se rechazan `..`, rutas absolutas hacia fuera, caracteres de control y enlaces simbólicos, y no se puede operar sobre la carpeta raíz.
- Se respeta la cuota de almacenamiento del usuario.
- La API key se guarda en la base de datos (`data/filecloud.db`) y nunca se devuelve al navegador. Protege esa carpeta y sus copias de seguridad.
- Con Grok, lo que el usuario escriba y el contenido de los archivos que el agente lea se envían a xAI; con Ollama todo queda en tu servidor. Tenlo en cuenta al elegir proveedor.

## Seguridad

- Contraseñas cifradas con `scrypt` y sal individual.
- Sesiones aleatorias de 256 bits guardadas con hash en la base de datos; cookie `HttpOnly` y `SameSite=Lax` (y `Secure` bajo HTTPS).
- Bloqueo temporal tras 5 intentos fallidos de acceso.
- Protección CSRF mediante comprobación del origen.
- Rutas validadas contra _path traversal_; los archivos de los usuarios nunca se sirven de forma pública sin un enlace.
- Los archivos HTML o de script subidos se sirven aislados (`sandbox`) para que no puedan actuar con la sesión de nadie.
- Cabeceras `Content-Security-Policy`, `X-Content-Type-Options` y `X-Frame-Options`.
- Los enlaces compartidos usan tokens aleatorios, pueden caducar y se pueden proteger con contraseña.

> Recomendación: publícalo siempre detrás de HTTPS.

## Estructura del proyecto

```
.
├── server.js        # Servidor Express y API
├── db.js            # SQLite, contraseñas y migración
├── ai.js            # Agente de IA (Grok/Ollama), herramientas con sandbox y límites de uso
├── setup-ai.js      # Asistente de configuración de la IA (lo ejecuta el instalador)
├── zip.js           # Generador ZIP en streaming (sin dependencias)
├── reset-password.js # Recuperación de cuentas desde la terminal
├── install.sh / install.ps1 / install.bat   # Instaladores (Linux·macOS / Windows)
├── get.sh / get.ps1 # Instalación en una línea (git + clonar + instalar)
├── public/
│   ├── index.html   # Inicio de sesión y registro
│   ├── panel.html   # Panel del usuario
│   ├── themes.html  # Comunidad de temas
│   ├── admin/       # Panel de administración
│   ├── js/          # common.js, auth.js, panel.js, admin.js, ai.js
│   ├── style.css    # Sistema de diseño compartido
│   └── icons.svg    # Iconos SVG
├── version.js       # Comprobación de nuevas versiones
├── hosting/         # Archivos de los usuarios (una carpeta por usuario, nombrada con su UUID)
└── data/            # Base de datos SQLite (se crea sola) y version.json
```

## API

Todas las rutas `/api/*` devuelven JSON y requieren sesión, salvo `login`, `register` y `session`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/register`, `/api/login`, `/api/logout` | Cuenta y sesión. |
| `GET` | `/api/session` | Estado de la sesión. |
| `POST` | `/api/password`, `/api/username` | Cambiar contraseña y nombre de usuario. |
| `GET` | `/api/list?path=` | Listar una carpeta. |
| `GET` | `/api/search?q=`, `/api/recent`, `/api/favs` | Búsqueda, recientes y favoritos. |
| `POST` | `/api/mkdir`, `/api/create-file`, `/api/upload` | Crear y subir. |
| `POST` | `/api/rename`, `/api/move`, `/api/copy`, `/api/delete`, `/api/edit`, `/api/fav` | Operaciones sobre elementos. |
| `GET` | `/api/download`, `/api/preview`, `/api/zip`, `/api/file-content` | Lectura y descarga. |
| `POST` / `GET` | `/api/share`, `/api/shares`, `/api/share/revoke` | Enlaces compartidos. |
| `GET` / `POST` | `/api/theme` | Tema activo del usuario. |
| `GET` / `POST` / `DELETE` | `/api/themes` | Temas propios guardados (Mis temas). |
| `POST` / `GET` | `/api/themes/publish`, `/api/community`, `/api/community/save`, `/api/community/unpublish` | Comunidad de temas. |
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
| «Credenciales inválidas» con cuentas de la versión 1 | Comprueba que `data/users.json` estaba en la carpeta al primer arranque (la consola indica cuántos usuarios se importaron). Si no, crea o recupera la cuenta con `node reset-password.js <usuario> <contraseña> --admin`. |
| Olvidé la contraseña | Otro administrador puede restablecerla desde el panel, o ejecuta `node reset-password.js <usuario> <nueva-contraseña>` en el servidor. Sin argumentos, el comando lista los usuarios existentes. |
| El ZIP de una carpeta falla | El límite es 4 GB por ZIP y 65 000 archivos. |

## Créditos

- **Autor:** Jesús Octavio Olivera Silva
- **Co-Owner:** [TwisSpark](https://github.com/TwisSpark)

¿Encontraste un fallo o tienes una idea? Abre un _issue_ o un _pull request_.

## Licencia

Distribuido bajo la licencia [MIT](LICENSE).
