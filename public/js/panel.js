let favs=new Set(),viewTitle='Resultados',sel=new Set(),selMode=false,searching=false,cwd='',items=[],me=null,list=localStorage.fcList==='1';
const EDIT=new Set('.txt .md .js .json .html .css .csv .log .xml .py .java .c .cpp .h .php .yml .ini'.split(' '));
const ext=n=>n.includes('.')?n.slice(n.lastIndexOf('.')).toLowerCase():'';
const join=n=>cwd?cwd+'/'+n:n;
const KIND={image:'.png .jpg .jpeg .gif .webp .svg .bmp .ico',video:'.mp4 .webm .mov .mkv',audio:'.mp3 .wav .flac .m4a .aac .ogg',doc:'.pdf .doc .docx .txt .md .odt .csv',code:'.js .json .html .css .xml .py .java .c .cpp .h .php .yml'};
const icon=i=>{if(i.isDir)return ic('folder');const e=ext(i.name);return ic(Object.keys(KIND).find(k=>KIND[k].split(' ').includes(e))||'file')};

async function load(){
  searching=false;sel.clear();
  try{const d=await api('/api/list?path='+encodeURIComponent(cwd));items=d.items;favs=new Set(d.favs||[]);
    const max=d.maxMB<0?Infinity:d.maxMB*1048576,p=max===Infinity?0:Math.min(100,d.usedBytes/max*100);
    $('#space').textContent=`${fmt(d.usedBytes)} / ${max===Infinity?'∞':fmt(max)}`;$('#pct').textContent=max===Infinity?'':Math.round(p)+'%';
    $('#bar i').style.width=p+'%';$('#bar').className='bar'+(p>=100?' full':p>=90?' hi':'');render()}catch(e){toast(e.message,1);if(cwd){cwd='';load()}}}

function render(){
  const parts=cwd?cwd.split('/'):[];
  $('#crumbs').innerHTML=searching?`<button data-p="${esc(cwd)}">${ic('back')} Volver</button> ${esc(viewTitle)}`:`<button data-p="">${ic('home')} Inicio</button>`+parts.map((p,i)=>`›<button data-p="${esc(parts.slice(0,i+1).join('/'))}">${esc(p)}</button>`).join('');
  const f=$('#filter').value.toLowerCase(),s=$('#sort').value;
  const v=items.filter(i=>i.name.toLowerCase().includes(f)).sort((a,b)=>b.isDir-a.isDir||(s==='size'?b.size-a.size:s==='date'?b.mtime-a.mtime:a.name.localeCompare(b.name,undefined,{numeric:true})));
  const g=$('#grid');g.className='grid'+(list?' list':'');
  g.innerHTML=v.map(i=>`<div class="item${sel.has(i.name)?' picked':''}" data-n="${esc(i.name)}" data-d="${i.isDir?1:''}"${i.path?` data-pa="${esc(i.path)}"`:''}><div class="ico">${selMode&&!i.path?(sel.has(i.name)?ic('checksq'):ic('square')):icon(i)}</div><div class="meta"><b>${favs.has(i.path||join(i.name))?ic('star','fill')+' ':''}${esc(i.name)}</b><small>${i.isDir?'Carpeta':fmt(i.size)} · ${new Date(i.mtime).toLocaleDateString()}${i.path?' · '+esc(i.path):''}</small></div>${i.path?'':'<button class="more" data-m aria-label="Opciones">'+ic('more')+'</button>'}</div>`).join('')||`<p class="muted">${f?'Sin resultados.':'Carpeta vacía. Sube archivos o arrástralos aquí.'}</p>`;
  $('#bulk').hidden=!selMode;$('#bn').textContent=sel.size;
}
$('#crumbs').onclick=e=>{const b=e.target.closest('[data-p]');if(b){cwd=b.dataset.p;load()}};
$('#filter').oninput=render;$('#sort').value=localStorage.fcSort||'name';$('#sort').onchange=()=>{localStorage.fcSort=$('#sort').value;render()};
$('#filter').onkeydown=async e=>{if(e.key!=='Enter')return;try{const d=await api('/api/search?q='+encodeURIComponent(e.target.value.trim()));items=d.items;searching=true;viewTitle='Resultados';selMode=false;sel.clear();render()}catch(x){toast(x.message,1)}};
$('#grid').onclick=e=>{const it=e.target.closest('.item');if(!it)return;const n=it.dataset.n,dir=!!it.dataset.d;
  if(e.target.closest('[data-m]'))return menu(n,dir);if(it.dataset.pa!==undefined){const p=it.dataset.pa.split('/');p.pop();cwd=dir?it.dataset.pa:p.join('/');$('#filter').value=dir?'':n;return load()}if(selMode){sel.has(n)?sel.delete(n):sel.add(n);return render()}if(dir){cwd=join(n);$('#filter').value='';load()}else preview(n)};

function menu(n,dir){const ed=!dir&&EDIT.has(ext(n)),acts=[[ic(dir?'folder':'eye')+(dir?' Abrir':' Ver'),'open'],!dir&&[ic('download')+' Descargar','dl'],dir&&[ic('zip')+' Descargar ZIP','zip'],ed&&[ic('edit')+' Editar','edit'],[ic('star')+(favs.has(join(n))?' Quitar de favoritos':' Añadir a favoritos'),'fav'],[ic('link')+' Compartir','share'],[ic('edit')+' Renombrar','ren'],[ic('copy')+' Duplicar','dup'],[ic('move')+' Mover a…','mv'],[ic('trash')+' Eliminar','del']].filter(Boolean);
  const d=dialog(n,`<div class="menu">${acts.map(([l,k])=>`<button type="button" data-k="${k}">${l}</button>`).join('')}</div>`);
  d.onclick=async e=>{const k=e.target.dataset?.k;if(!k)return;d.close();({open:()=>dir?(cwd=join(n),load()):preview(n),dl:()=>location.href='/api/download?path='+encodeURIComponent(join(n)),edit:()=>editor(n),share:()=>share(n),ren:()=>rename(n),mv:()=>moveTo(n),dup:()=>act('/api/copy',{path:join(n)}),zip:()=>location.href='/api/zip?path='+encodeURIComponent(join(n)),fav:()=>act('/api/fav',{path:join(n)}),del:()=>del(n)})[k]()}}

async function rename(n){const v=await ask('Renombrar','Nuevo nombre',n);if(v&&v!==n)act('/api/rename',{path:join(n),newName:v})}
async function moveTo(n){const v=await ask('Mover','Carpeta destino (vacío = inicio)','');if(v!==null)act('/api/move',{path:join(n),dest:v.replace(/^\/+/,'')})}
async function del(n){if(await yes('Eliminar',`¿Eliminar "${n}"? Esta acción no se puede deshacer.`))act('/api/delete',{path:join(n)})}
async function act(url,body){try{await api(url,body);toast('Hecho');load()}catch(e){toast(e.message,1)}}

function preview(n){const p=join(n),u='/api/preview?path='+encodeURIComponent(p),e=ext(n);let h;
  if('.png .jpg .jpeg .gif .webp .bmp .ico'.includes(e)&&e)h=`<img class="pv" src="${u}">`;
  else if('.mp4 .webm .ogg .mov'.includes(e)&&e)h=`<video class="pv" controls src="${u}"></video>`;
  else if('.mp3 .wav .flac .m4a .aac'.includes(e)&&e)h=`<audio controls style="width:100%" src="${u}"></audio>`;
  else if(e==='.pdf')h=`<iframe class="frame" src="${u}"></iframe>`;
  else if(EDIT.has(e))return editor(n);
  else h=`<p class="muted">Sin vista previa para este tipo de archivo.</p>`;
  dialog(n,`<div class="center">${h}</div><div class="row" style="margin-top:12px"><a class="btn sm" href="/api/download?path=${encodeURIComponent(p)}">${ic('download')} Descargar</a></div>`,null,'','wide')}

async function editor(n){try{const{content}=await api('/api/file-content?path='+encodeURIComponent(join(n)));
  dialog('Editar: '+n,`<textarea class="code" spellcheck="false">${esc(content)}</textarea>`,async d=>{await api('/api/edit',{path:join(n),content:$('textarea',d).value});toast('Guardado');load()},'Guardar','wide')}catch(e){toast(e.message,1)}}

async function share(n){const d=dialog('Compartir "'+n+'"',`<label>Caducidad<select><option value="1">1 día</option><option value="7" selected>7 días</option><option value="30">30 días</option><option value="0">Sin caducidad</option></select></label><label>Contraseña (opcional)<input class="input" type="password" autocomplete="new-password"></label><p class="muted">Cualquiera con el enlace podrá verlo. Puedes revocarlo en "Enlaces".</p>`,async d=>{
  const r=await api('/api/share',{path:join(n),days:$('select',d).value,password:$('input',d).value});setTimeout(()=>showLink(r.url),50)},'Crear enlace')}
function showLink(url){dialog('Enlace creado',`<input class="input" readonly value="${esc(url)}">`,async d=>{try{await navigator.clipboard.writeText(url);toast('Copiado')}catch{$('input',d).select();throw Error('Copia el enlace manualmente')}},'Copiar')}
async function shares(){const{shares}=await api('/api/shares');
  const d=dialog('Mis enlaces',shares.length?`<div class="menu">${shares.map(s=>`<div class="item" style="cursor:default"><div class="meta"><b>${esc(s.path)}</b><small>${s.expires_at?'Caduca '+new Date(s.expires_at).toLocaleDateString():'Sin caducidad'}</small></div><button type="button" class="btn sm ghost" data-c="${s.token}">Copiar</button><button type="button" class="btn sm danger" data-r="${s.token}">${ic('x')}</button></div>`).join('')}</div>`:'<p class="muted">No tienes enlaces activos.</p>',null);
  d.onclick=async e=>{const c=e.target.dataset?.c,r=e.target.dataset?.r;if(c){await navigator.clipboard?.writeText(location.origin+'/s/'+c);toast('Copiado')}if(r){await api('/api/share/revoke',{token:r});d.close();shares_()}}}
const shares_=shares;

function account(){const d=dialog('Mi cuenta',`<p>Sesión: <b>${esc(me.user)}</b> ${me.admin?'<span class="badge ad">ADMIN</span>':''}</p><p><small class="muted">ID de cuenta (permanente): <code>${esc(me.uuid)}</code></small></p><button type="button" class="btn ghost sm" data-rn>${ic('edit')} Cambiar nombre de usuario</button><label>Contraseña actual<input class="input" type="password" autocomplete="current-password"></label><label>Nueva contraseña (mín. 8)<input class="input" type="password" autocomplete="new-password"></label><div id="st" class="muted" style="margin:10px 0">Calculando uso…</div><div class="row"><button type="button" class="btn ghost sm" data-rv>Cerrar otras sesiones</button><button type="button" class="btn danger sm" data-out>Cerrar sesión</button></div>`,async d=>{const i=$$('input',d);
  if(!i[1].value)return;await api('/api/password',{current:i[0].value,next:i[1].value});toast('Contraseña actualizada; las demás sesiones se cerraron')},'Cambiar contraseña');$('[data-out]',d).onclick=logout;$('[data-rn]',d).onclick=()=>renameUser(d);$('[data-rv]',d).onclick=async()=>{await api('/api/sessions/revoke-others',{});toast('Otras sesiones cerradas')};
  api('/api/stats').then(({stats})=>{const t=Object.values(stats).reduce((a,b)=>a+b,0)||1;$('#st',d).innerHTML=Object.entries(stats).map(([k,v])=>`<div class="row"><span class="grow">${k}</span><small>${fmt(v)}</small></div><div class="bar"><i style="width:${v/t*100}%"></i></div>`).join('')}).catch(()=>{})}

async function newDir(){const n=await ask('Nueva carpeta','Nombre');if(n)act('/api/mkdir',{name:n,path:cwd})}
function newFile(){dialog('Nuevo archivo',`<label>Nombre<input class="input" placeholder="nota.txt"></label><textarea class="code" style="height:30vh" spellcheck="false"></textarea>`,async d=>{await api('/api/create-file',{name:$('input',d).value.trim(),content:$('textarea',d).value,path:cwd});toast('Creado');load()},'Crear')}

function upload(files){if(!files.length)return;const f=new FormData();[...files].forEach(x=>{f.append('files',x);f.append('paths',x.webkitRelativePath||'')});f.append('destPath',cwd);
  const x=new XMLHttpRequest(),P=$('#prog');P.style.display='block';$('#progT').textContent=`Subiendo ${files.length} archivo(s)…`;
  x.upload.onprogress=e=>{if(e.lengthComputable)$('#progB').style.width=e.loaded/e.total*100+'%'};
  x.onload=()=>{P.style.display='none';$('#progB').style.width='0';let r={};try{r=JSON.parse(x.responseText)}catch{}x.status<300?toast('Subida completa'):toast(r.error||'Error al subir',1);load()};
  x.onerror=()=>{P.style.display='none';toast('Error de red',1)};x.open('POST','/api/upload');x.send(f)}
$('#up').onchange=$('#upd').onchange=e=>{upload(e.target.files);e.target.value=''};
let dc=0;addEventListener('dragenter',e=>{e.preventDefault();dc++;$('#drop').classList.add('on')});addEventListener('dragleave',()=>{if(--dc<=0){dc=0;$('#drop').classList.remove('on')}});
addEventListener('dragover',e=>e.preventDefault());addEventListener('drop',e=>{e.preventDefault();dc=0;$('#drop').classList.remove('on');upload(e.dataTransfer.files)});

document.addEventListener('click',e=>{const a=e.target.closest('[data-a]')?.dataset.a;if(!a)return;
  ({shares,account,newDir,newFile,favview:()=>showList('/api/favs','Favoritos'),recent:()=>showList('/api/recent','Recientes'),theme:appearance,select:()=>{selMode=!selMode;sel.clear();render()},view:()=>{list=!list;localStorage.fcList=list?'1':'0';render()}})[a]()});
api('/api/session').then(s=>{if(!s.logged)return location.href='/';me=s;$('#me').textContent=s.user;$('#adminLink').hidden=!s.admin;if(s.ai)aiInit();load();updateNotice(s);
  if(s.announcement&&localStorage.fcAnn!==s.announcement){const a=$('#ann');a.hidden=false;a.innerHTML=`${ic('info')}<span class="grow">${esc(s.announcement)}</span><button class="more" aria-label="Cerrar">${ic('x')}</button>`;$('button',a).onclick=()=>{localStorage.fcAnn=s.announcement;a.hidden=true}}});

async function bulk(k){const ns=[...sel];if(!ns.length)return;let dest;
  if(k==='zip'){location.href='/api/zip?'+ns.map(n=>'path='+encodeURIComponent(join(n))).join('&');return}
  if(k==='del'&&!await yes('Eliminar',`¿Eliminar ${ns.length} elemento(s)? No se puede deshacer.`))return;
  if(k!=='del'){dest=await ask(k==='mv'?'Mover':'Copiar','Carpeta destino (vacío = inicio)','');if(dest===null)return;dest=dest.replace(/^\/+/,'')}
  for(const n of ns)try{await api({del:'/api/delete',mv:'/api/move',cp:'/api/copy'}[k],{path:join(n),dest})}catch(e){toast(n+': '+e.message,1)}
  selMode=false;load()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-b]')?.dataset.b;if(b)bulk(b)});
addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;
  if(e.key==='/'){e.preventDefault();$('#filter').focus()}if(e.key==='Escape'&&selMode){selMode=false;sel.clear();render()}
  if(selMode&&e.key==='Delete')bulk('del');if(selMode&&e.ctrlKey&&e.key==='a'){e.preventDefault();items.forEach(i=>sel.add(i.name));render()}});
async function showList(url,title){try{const d=await api(url);items=d.items;searching=true;viewTitle=title;selMode=false;sel.clear();$('#filter').value='';render()}catch(e){toast(e.message,1)}}

async function renameUser(d){const n=await ask('Cambiar nombre de usuario','Nuevo nombre (3-32: letras, números, _ . -)',me.user);if(!n||n===me.user)return;
  const p=await ask('Confirma tu contraseña','Contraseña actual','','password');if(!p)return;
  try{const r=await api('/api/username',{username:n,password:p});me.user=r.user;$('#me').textContent=r.user;d.close();toast('Ahora te llamas '+r.user)}catch(e){toast(e.message,1)}}
