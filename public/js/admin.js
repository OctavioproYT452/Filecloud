let tab='dash',timer;
const bar=(p,l)=>`<div class="bar${p>=95?' full':p>=80?' hi':''}" title="${l}"><i style="width:${Math.min(100,p)}%"></i></div>`;
$('#out').onclick=logout;$('#th').onclick=appearance;
$$('.tab').forEach(b=>b.onclick=()=>{tab=b.dataset.t;$$('.tab').forEach(x=>x.classList.toggle('on',x===b));$$('main section').forEach(s=>s.hidden=s.id!==tab);show()});
function show(){clearInterval(timer);({dash:()=>{dash();timer=setInterval(dash,5000)},users,links,set:settings})[tab]()}

async function dash(){try{const s=await api('/api/admin/server'),c=s.cpu,m=s.memUsed/s.memTotal*100,d=s.diskUsed/s.diskTotal*100;
 $('#dash').innerHTML=`<div class="stats">${[['Usuarios',s.users],['Almacenado',fmt(s.stored)],['Enlaces activos',s.shares],['Sesiones activas',s.sessions],['Versión',s.version]].map(([l,v])=>`<div class="card stat"><small>${l}</small><b>${v}</b></div>`).join('')}</div>
 <div class="card"><h3>Servidor</h3>${[['CPU',c,Math.round(c)+'%'],['Memoria',m,`${fmt(s.memUsed)} / ${fmt(s.memTotal)}`],['Disco',d,`${fmt(s.diskUsed)} / ${fmt(s.diskTotal)}`]].map(([l,p,t])=>`<div style="margin:12px 0"><div class="row"><b class="grow">${l}</b><small>${t}</small></div>${bar(p,l)}</div>`).join('')}<small>Activo desde hace ${Math.floor(s.uptime/3600)} h · se actualiza cada 5 s</small></div>`}catch(e){toast(e.message,1)}}

async function users(){const{users:us,me}=await api('/api/admin/users');
 $('#users').innerHTML=`<div class="row" style="margin-bottom:10px"><button class="btn" id="nu">${ic('plus')} Nuevo usuario</button><input class="input grow" id="uf" placeholder="Buscar usuario…" style="max-width:260px"></div><div class="card scroll"><table class="tbl rt"><thead><tr><th>Usuario</th><th>Rol</th><th>Uso</th><th>Último acceso</th><th></th></tr></thead><tbody>${us.map(u=>{const mx=u.max_space_mb<0?0:u.max_space_mb*1048576,p=mx?u.used_bytes/mx*100:0;
 return`<tr data-u="${esc(u.username)}" data-id="${u.id}"><td data-l="Usuario"><b>${esc(u.username)}</b></td><td data-l="Rol"><span class="badge ${u.is_admin?'ad':''}">${u.is_admin?'ADMIN':'USER'}</span> ${u.suspended?'<span class="badge bad">SUSPENDIDO</span>':''}</td><td data-l="Uso" style="min-width:150px">${fmt(u.used_bytes)} / ${mx?fmt(mx):'∞'}${mx?bar(p,''):''}</td><td data-l="Acceso"><small>${when(u.last_login)}${u.last_ip?'<br>'+esc(u.last_ip):''}</small></td><td data-l=""><div class="row"><button class="btn sm" data-k="files">${ic('folder')}</button><button class="btn sm ghost" data-k="edit">Editar</button>${u.id===me?'':'<button class="btn sm danger" data-k="del">'+ic('trash')+'</button>'}</div></td></tr>`}).join('')}</tbody></table></div>`;
 $('#nu').onclick=newUser;$('#uf').oninput=e=>$$('#users tbody tr').forEach(r=>r.hidden=!r.dataset.u.toLowerCase().includes(e.target.value.toLowerCase()));
 $('#users tbody').onclick=e=>{const k=e.target.dataset.k,tr=e.target.closest('tr');if(!k)return;const u=us.find(x=>x.id==tr.dataset.id);({files:()=>explore(u.username),edit:()=>edit(u),del:()=>delUser(u)})[k]()}}

function newUser(){dialog('Nuevo usuario',`<label>Usuario<input class="input" autocomplete="off"></label><label>Contraseña (mín. 8)<input class="input" type="password" autocomplete="new-password"></label><label>Cuota en MB (-1 = ilimitado)<input class="input" type="number" value="100"></label><label class="row"><input type="checkbox"> Administrador</label>`,async d=>{const i=$$('input',d);
 await api('/api/admin/users',{username:i[0].value.trim(),password:i[1].value,max_space_mb:i[2].value,is_admin:i[3].checked});toast('Usuario creado');users()},'Crear')}

function edit(u){const d=dialog('Editar '+u.username,`<label>Cuota en MB (-1 = ilimitado)<input class="input" type="number" value="${u.max_space_mb}"></label><label class="row"><input type="checkbox" ${u.is_admin?'checked':''}> Administrador</label><label class="row"><input type="checkbox" ${u.suspended?'checked':''}> Cuenta suspendida</label><label>Nueva contraseña (opcional)<input class="input" type="password" autocomplete="new-password"></label><label>Nombre de usuario<input class="input" value="${esc(u.username)}" maxlength="32"></label><p><small class="muted">UUID (permanente): <code>${esc(u.uuid)}</code></small></p><button type="button" class="btn ghost sm" data-lo>Cerrar todas sus sesiones</button>`,async d=>{const i=$$('input',d);
 const b={max_space_mb:i[0].value,is_admin:i[1].checked,suspended:i[2].checked};if(i[3].value)b.password=i[3].value;if(i[4].value.trim()!==u.username)b.username=i[4].value.trim();await api('/api/admin/users/'+u.id,b);toast('Guardado');users()},'Guardar');
 $('[data-lo]',d).onclick=async()=>{try{await api('/api/admin/users/'+u.id,{logout:true});toast('Sesiones cerradas')}catch(e){toast(e.message,1)}}}

async function delUser(u){if(await yes('Eliminar usuario',`Se borrará "${u.username}" y TODOS sus archivos. No se puede deshacer.`)){try{await api('/api/admin/users/'+u.id,null,'DELETE');toast('Eliminado');users()}catch(e){toast(e.message,1)}}}

function explore(user,p=''){api(`/api/admin/files?user=${encodeURIComponent(user)}&path=${encodeURIComponent(p)}`).then(({items})=>{
 const q=n=>`user=${encodeURIComponent(user)}&path=${encodeURIComponent(p?p+'/'+n:n)}`;
 items.sort((a,b)=>b.isDir-a.isDir||a.name.localeCompare(b.name));
 const d=dialog(`${user}: /${p}`,`${p?'<button type="button" class="btn ghost sm" data-up>'+ic('back')+' Subir</button>':''}<div class="menu" style="margin-top:8px">${items.map(i=>`<div class="item" style="cursor:default" data-n="${esc(i.name)}" data-d="${i.isDir?1:''}"><div class="ico">${i.isDir?ic('folder'):ic('file')}</div><div class="meta"><b>${esc(i.name)}</b><small>${i.isDir?'Carpeta':fmt(i.size)}</small></div>${i.isDir?'<button type="button" class="btn sm" data-o>Abrir</button>':`<a class="btn sm ghost" target="_blank" rel="noopener" href="/api/admin/file?${q(i.name)}">Ver</a><a class="btn sm ghost hide-sm" href="/api/admin/file?${q(i.name)}&dl=1">${ic('download')}</a>`}<button type="button" class="btn sm danger" data-x2>${ic('trash')}</button></div>`).join('')||'<p class="muted">Vacío</p>'}</div>`,null,'','wide');
 $('[data-up]',d)&&($('[data-up]',d).onclick=()=>{d.close();explore(user,p.split('/').slice(0,-1).join('/'))});
 d.onclick=async e=>{const it=e.target.closest('.item');if(!it)return;const n=it.dataset.n,rel=p?p+'/'+n:n;
  if(e.target.dataset.o!==undefined){d.close();explore(user,rel)}
  if(e.target.dataset.x2!==undefined&&await yes('Eliminar',`¿Borrar "${n}" de ${user}?`)){await api('/api/admin/delete-file',{user,path:rel});d.close();explore(user,p)}}}).catch(e=>toast(e.message,1))}

async function links(){const{shares}=await api('/api/admin/shares');
 $('#links').innerHTML=`<div class="card scroll"><table class="tbl rt"><thead><tr><th>Usuario</th><th>Elemento</th><th>Caduca</th><th></th></tr></thead><tbody>${shares.map(s=>`<tr><td data-l="Usuario">${esc(s.username)}</td><td data-l="Elemento">${s.locked?ic('lock')+' ':''}${esc(s.path)}</td><td data-l="Caduca"><small>${s.expires_at?when(s.expires_at):'Nunca'}</small></td><td data-l=""><button class="btn sm ghost" data-c="${s.token}">Copiar</button> <button class="btn sm danger" data-r="${s.token}">Revocar</button></td></tr>`).join('')||'<tr><td colspan="4" class="muted">No hay enlaces</td></tr>'}</tbody></table></div>`;
 $('#links tbody').onclick=async e=>{const c=e.target.dataset.c,r=e.target.dataset.r;if(c){await navigator.clipboard?.writeText(location.origin+'/s/'+c);toast('Copiado')}if(r&&await yes('Revocar','¿Revocar este enlace?')){await api('/api/admin/shares/revoke',{token:r});links()}}}

async function settings(){const s=await api('/api/admin/settings');
 $('#set').innerHTML=`<div class="card" style="max-width:520px"><h3>Ajustes generales</h3><label>Anuncio para todos los usuarios (vacío = ninguno)<textarea class="input" id="an" maxlength="300" rows="2">${esc(s.announcement||'')}</textarea></label><label class="row"><input type="checkbox" id="reg" ${s.allow_registration?'checked':''}> Permitir registro público</label><label>Cuota por defecto para nuevos usuarios (MB)<input class="input" id="q" type="number" value="${s.default_quota_mb}"></label><button class="btn" id="sv">Guardar</button></div>`;
 $('#sv').onclick=async()=>{try{await api('/api/admin/settings',{allow_registration:$('#reg').checked,default_quota_mb:$('#q').value,announcement:$('#an').value});toast('Guardado')}catch(e){toast(e.message,1)}}}

api('/api/session').then(s=>{if(!s.logged||!s.admin)location.href='/';else{show();updateNotice(s)}});
