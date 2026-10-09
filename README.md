# File Cloud 2.0
```
npm install
npm start      # http://localhost:3001  (PORT=8080 npm start para cambiar el puerto)
```
- Base de datos: `data/filecloud.db` (SQLite). Si existe `data/users.json`, se migra solo al primer arranque (las contraseñas se cifran).
- El primer usuario que se registre en una instalación vacía es administrador. Panel: `/admin/`.
- Detrás de un proxy inverso (nginx, Cloudflare…) arranca con `TRUST_PROXY=1` para obtener la IP real.
- Con HTTPS las cookies de sesión se marcan `Secure` automáticamente.
- Los enlaces antiguos `/share/usuario/ruta` y `/files/...` ya no funcionan: ahora se comparte con enlaces de `/s/<token>` que pueden caducar y revocarse.
