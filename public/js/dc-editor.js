// Editor de comandos propios de Discord (FCScript): árbol de carpetas, formulario, editor con resaltado y autocompletado, pruebas.
(()=>{
const S={list:{folders:[],commands:[]},docs:[],fn:new Set(),blk:new Set(),cur:null,dirty:false,open:new Set(['']),q:'',errs:[]};
const side=$('#side'),work=$('#work');
const TT={slash:['/','','Slash'],prefijo:['!','p','Prefijo'],mensaje:['msg','m','Mensaje']};
const TPL={slash:'$title[¡Hola $nickname!]\n$description[Escribiste: $option[texto]]\n$color[#4f8cff]',prefijo:'Hola $nickname, usaste $prefix$commandName\n',mensaje:'¡Hola $mention!'};
const newMeta=t=>({tipo:t,descripcion:'',acceso:'todos',activo:true,alias:[],opciones:[],disparador:'',coincidencia:'contiene'});
const slug=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32);
const guard=async()=>!S.dirty||await yes('Cambios sin guardar','Perderás los cambios del comando actual. ¿Continuar?');
window.addEventListener('beforeunload',e=>{if(S.dirty){e.preventDefault();e.returnValue=''}});

async function load(keep){const[l,d]=await Promise.all([api('/api/admin/discord/cmds'),S.docs.length?S.docs:api('/api/admin/discord/script/docs')]);
  S.list=l;if(!S.docs.length){S.docs=d;S.fn=new Set(d.filter(x=>!x.blk).map(x=>x.n.toLowerCase()));S.blk=new Set(d.filter(x=>x.blk).map(x=>x.n.toLowerCase()))}
  tree();if(!keep)editor()}

// ---------------- barra lateral ----------------
function tree(){const l=S.list,q=S.q.toLowerCase(),b=l.bot;
  const build=()=>{const root={k:{},c:[]};const at=p=>p?p.split('/').reduce((n,s)=>n.k[s]??={k:{},c:[]},root):root;l.folders.forEach(at);l.commands.forEach(c=>{if(!q||c.name.includes(q)||c.descripcion.toLowerCase().includes(q))at(c.folder).c.push(c)});return root};
  const cm=c=>`<div class="cm ${S.cur?.id===c.id?'on':''} ${c.activo?'':'off'}" draggable="true" data-id="${esc(c.id)}"><span class="tg ${TT[c.tipo][1]}">${TT[c.tipo][0]}</span><span class="nm">${esc(c.name)}</span>${c.errores?'<span class="bad" title="Tiene errores"></span>':''}</div>`;
  const rec=(n,p)=>Object.keys(n.k).sort().map(k=>{const fp=p?p+'/'+k:k,o=S.open.has(fp)||q;return`<div class="fo" data-f="${esc(fp)}">${ic(o?'folder':'folder')} <span>${esc(k)}</span><span class="fa"><button class="btn ghost sm" data-fa="rename" data-p="${esc(fp)}" title="Renombrar">${ic('edit')}</button><button class="btn ghost sm" data-fa="delete" data-p="${esc(fp)}" title="Borrar">${ic('trash')}</button></span></div>${o?`<div class="kids">${rec(n.k[k],fp)}${n.k[k].c.map(cm).join('')}</div>`:''}`}).join('');
  const t=build();
  side.innerHTML=`<div class="tools"><button class="btn sm" id="nc">${ic('plus')} Comando</button><button class="btn ghost sm" id="nf">${ic('folder')} Carpeta</button><button class="btn ghost sm hide-lg" id="tgs" style="margin-left:auto">${ic('menu')}</button></div>
  <input type="search" id="sq" placeholder="Buscar comando…" value="${esc(S.q)}">
  <div class="st">${b.ready?'Bot conectado.':b.configured?'<span class="warn">El bot aún no está conectado.</span>':'<span class="warn">Falta DISCORD_TOKEN en .env: puedes crear y probar comandos, pero no se ejecutarán.</span>'}
  ${b.ready&&!b.content&&l.commands.some(c=>c.activo&&c.tipo!=='slash')?'<br><span class="warn">Para los comandos de prefijo y de mensaje activa «Message Content Intent» en el Developer Portal (Bot → Privileged Gateway Intents) y reinicia.</span>':''}<br>Comandos: <b>${l.commands.length}</b>/${l.limits.cmds}</div>
  <div class="row" style="gap:6px;margin-bottom:8px"><input class="mini" id="px" maxlength="3" value="${esc(l.prefix)}" style="width:64px;margin:0" title="Prefijo"><button class="btn ghost sm" id="pxs">Guardar prefijo</button></div>
  <div class="tree dct" id="tree">${rec(t,'')}${t.c.map(cm).join('')||(Object.keys(t.k).length?'':'<p class="muted" style="font-size:13px">Aún no hay comandos.</p>')}</div>`;
}
side.addEventListener('click',async e=>{const t=e.target,id=t.id;
  const fa=t.closest('[data-fa]');if(fa){e.stopPropagation();return folderAct(fa.dataset.fa,fa.dataset.p)}
  if(t.closest('#nc'))return newCmd();if(t.closest('#nf'))return newFolder();if(t.closest('#tgs')){side.classList.toggle('fold');return}
  if(id==='pxs'){try{await api('/api/admin/discord/prefix',{prefix:$('#px').value});toast('Prefijo guardado');load(true)}catch(x){toast(x.message,1)}return}
  const f=t.closest('.fo');if(f){const p=f.dataset.f;S.open.has(p)?S.open.delete(p):S.open.add(p);return tree()}
  const c=t.closest('.cm');if(c&&await guard())open(c.dataset.id)});
side.addEventListener('input',e=>{if(e.target.id==='sq'){S.q=e.target.value;const p=e.target.selectionStart;tree();const i=$('#sq');i.focus();i.setSelectionRange(p,p)}});
// arrastrar un comando a una carpeta (o a la raíz) para moverlo
side.addEventListener('dragstart',e=>{const c=e.target.closest('.cm');if(c)e.dataTransfer.setData('text/plain',c.dataset.id)});
side.addEventListener('dragover',e=>{e.preventDefault();$$('.over',side).forEach(x=>x.classList.remove('over'));(e.target.closest('.fo')||$('#tree'))?.classList.add('over')});
side.addEventListener('drop',async e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain'),fo=e.target.closest('.fo'),to=fo?fo.dataset.f:'';$$('.over',side).forEach(x=>x.classList.remove('over'));if(!id)return;
  try{if(S.cur?.id===id&&S.dirty){toast('Guarda el comando antes de moverlo',1);return}const c=await api('/api/admin/discord/cmds/get?id='+encodeURIComponent(id));await api('/api/admin/discord/cmds/save',{id,folder:to,name:c.name,meta:c.meta,code:c.code});toast('Movido');const nid=(to?to+'/':'')+c.name;if(S.cur?.id===id)S.cur.id=nid,S.cur.folder=to;S.open.add(to);await load(true);S.cur&&editor()}catch(x){toast(x.message,1)}});

function newFolder(){dialog('Nueva carpeta',`<label class="fld"><span>Nombre (puedes usar a/b para subcarpetas)</span><input id="fn" maxlength="70" placeholder="moderacion"></label>`,async d=>{const p=$('#fn',d).value.split('/').map(slug).filter(Boolean).join('/');if(!p)throw Error('Escribe un nombre');await api('/api/admin/discord/folders',{action:'create',path:p});S.open.add(p);await load(true)},'Crear')}
async function folderAct(a,p){
  if(a==='rename')dialog('Renombrar carpeta',`<label class="fld"><span>Nuevo nombre completo</span><input id="fn" value="${esc(p)}" maxlength="70"></label>`,async d=>{const to=$('#fn',d).value.split('/').map(slug).filter(Boolean).join('/');await api('/api/admin/discord/folders',{action:'rename',path:p,to});S.cur=null;await load()},'Renombrar');
  else if(await yes('Borrar carpeta',`Se borrará «${p}» con todos los comandos que contiene. No se puede deshacer.`)){try{await api('/api/admin/discord/folders',{action:'delete',path:p,force:true});if(S.cur&&(S.cur.folder===p||S.cur.folder.startsWith(p+'/')))S.cur=null,S.dirty=false;await load()}catch(x){toast(x.message,1)}}}
async function newCmd(){if(!await guard())return;
  const fo=['',...S.list.folders].map(f=>`<option value="${esc(f)}">${f?esc(f):'(sin carpeta)'}</option>`).join('');
  dialog('Nuevo comando',`<div class="dcf"><label class="wide">Nombre<input id="nn" maxlength="32" placeholder="saludo"></label><label>Tipo<select id="nt"><option value="slash">Slash (/comando)</option><option value="prefijo">Prefijo (!comando)</option><option value="mensaje">Mensaje (responde a un texto)</option></select></label><label>Carpeta<select id="nfo">${fo}</select></label></div>`,d=>{const name=slug($('#nn',d).value),t=$('#nt',d).value;if(!name)throw Error('Escribe un nombre');
    S.cur={id:null,folder:$('#nfo',d).value,name,meta:{...newMeta(t),descripcion:t==='slash'?'Comando personalizado':'',disparador:t==='mensaje'?'hola bot':''},code:TPL[t]};S.dirty=true;editor();tree()},'Crear')}
async function open(id){try{S.cur=await api('/api/admin/discord/cmds/get?id='+encodeURIComponent(id));S.dirty=false;S.errs=S.cur.errors||[];editor();tree();side.classList.add('fold');work.scrollIntoView?.({block:'start'})}catch(x){toast(x.message,1)}}

// ---------------- formulario + editor ----------------
function editor(){const c=S.cur;if(!c){work.innerHTML='<div class="card dc-empty"><h3>Comandos propios del bot</h3><p class="muted">Crea comandos con <b>FCScript</b>, un lenguaje sencillo parecido a BDScript. Elige uno de la lista o crea uno nuevo.</p></div>';return}
  const m=c.meta,fo=['',...S.list.folders].map(f=>`<option value="${esc(f)}" ${f===c.folder?'selected':''}>${f?esc(f):'(sin carpeta)'}</option>`).join('');
  const sel=(id,arr,v,lab)=>`<select id="${id}">${arr.map(x=>`<option value="${x}" ${x===v?'selected':''}>${lab?.[x]||x}</option>`).join('')}</select>`;
  work.innerHTML=`<div class="card"><div class="bar"><b style="font-size:17px">${TT[m.tipo][0]==='/'?'/':m.tipo==='prefijo'?esc(S.list.prefix):''}<span id="ttl">${esc(c.name)}</span></b><span class="muted">${c.id?esc(c.id):'Sin guardar'}</span><span class="grow"></span><span class="muted" id="dty"></span>
    <button class="btn" id="sv">${ic('check')} Guardar</button>
    <button class="btn ghost sm" id="rf">${ic('code')} Funciones</button><button class="btn ghost sm" id="tst">${ic('send')} Probar</button>${c.id?`<button class="btn ghost sm dng" id="del">${ic('trash')} Borrar</button>`:''}</div>
  <div class="dcf"><label>Nombre<input id="fname" maxlength="32" value="${esc(c.name)}"></label><label>Carpeta<select id="ffo">${fo}</select></label><label>Tipo${sel('ftipo',['slash','prefijo','mensaje'],m.tipo,{slash:'Slash (/comando)',prefijo:'Prefijo',mensaje:'Mensaje'})}</label>
  <label>Quién puede usarlo${sel('facc',S.list.access,m.acceso,{todos:'Todos',vinculados:'Cuentas vinculadas',admin:'Admins de File Cloud',gestores:'Admins y gestores del servidor'})}</label>
  <label class="ck"><input type="checkbox" id="fact" ${m.activo?'checked':''}> Activo</label>
  ${m.tipo==='slash'?`<label class="wide">Descripción (se ve en Discord, máx. 100)<input id="fdes" maxlength="100" value="${esc(m.descripcion)}"></label>`:''}
  ${m.tipo==='prefijo'?`<label class="wide">Otros nombres (separados por comas)<input id="fal" value="${esc(m.alias.join(', '))}" placeholder="hola, hi"></label>`:''}
  ${m.tipo==='mensaje'?`<label class="wide">Texto que lo activa<input id="fdi" maxlength="100" value="${esc(m.disparador)}"></label><label>Coincidencia${sel('fco',S.list.match,m.coincidencia,{exacta:'El mensaje es exactamente eso',contiene:'El mensaje contiene eso',empieza:'El mensaje empieza así'})}</label>`:''}</div>
  ${m.tipo==='slash'?`<div class="opts" id="opts">${m.opciones.map((o,i)=>`<div class="opt" data-i="${i}"><input data-k="name" value="${esc(o.name)}" placeholder="nombre" maxlength="32"><select data-k="type">${S.list.types.map(t=>`<option ${t===o.type?'selected':''}>${t}</option>`).join('')}</select><select data-k="required"><option value="0">Opcional</option><option value="1" ${o.required?'selected':''}>Obligatoria</option></select><input data-k="desc" value="${esc(o.desc)}" placeholder="descripción" maxlength="100"><button class="btn ghost sm" data-rm="${i}">${ic('x')}</button></div>`).join('')}</div><button class="btn ghost sm" id="ao" style="margin:6px 0 10px" ${m.opciones.length>=25?'disabled':''}>${ic('plus')} Opción</button>`:''}
  <div class="ed"><div class="gut" id="gut"></div><div class="box"><pre class="hl" id="hl" aria-hidden="true"></pre><textarea id="code" spellcheck="false" wrap="off" autocapitalize="off" autocomplete="off" aria-label="Código del comando"></textarea><div class="ac" id="ac"></div></div></div>
  <div id="errs" class="errs"></div></div>
  <div class="row sticky-act"><button class="btn" id="sv2">${ic('check')} Guardar comando</button></div>
  <div class="card ref" id="ref" hidden><h4 class="h0">Funciones</h4><input type="search" id="rq" placeholder="Buscar función…"><div class="list" id="rl"></div></div>
  <div class="card" id="tp" hidden><h4 class="h0">Probar (no envía nada a Discord)</h4><div class="dcf" id="tin"></div><button class="btn" id="run">${ic('send')} Ejecutar prueba</button><div id="tout" style="margin-top:12px"></div></div>`;
  const ta=$('#code');ta.value=c.code;paint();wireForm();checkSoon(0)}
function readForm(){const c=S.cur,m=c.meta;c.name=slug($('#fname').value);c.folder=$('#ffo').value;m.acceso=$('#facc').value;m.activo=$('#fact').checked;
  if($('#fdes'))m.descripcion=$('#fdes').value;if($('#fal'))m.alias=$('#fal').value.split(',').map(slug).filter(Boolean);if($('#fdi'))m.disparador=$('#fdi').value;if($('#fco'))m.coincidencia=$('#fco').value;
  if($('#opts'))m.opciones=$$('.opt').map(r=>({name:$('[data-k=name]',r).value,type:$('[data-k=type]',r).value,required:$('[data-k=required]',r).value==='1',desc:$('[data-k=desc]',r).value}));c.code=$('#code').value}
function wireForm(){const c=S.cur;
  S.prevT=c.meta.tipo;
  $('#sv').onclick=save;$('#sv2').onclick=save;showDirty();$('#rf').onclick=()=>{const r=$('#ref');r.hidden=!r.hidden;if(!r.hidden)refList('')};$('#tst').onclick=()=>{const t=$('#tp');t.hidden=!t.hidden;if(!t.hidden)testForm()};
  const dl=$('#del');if(dl)dl.onclick=async()=>{if(await yes('Borrar comando',`Se borrará «${c.id}». No se puede deshacer.`)){try{await api('/api/admin/discord/cmds/delete',{id:c.id});S.cur=null;S.dirty=false;toast('Comando borrado');await load()}catch(x){toast(x.message,1)}}};
  const ao=$('#ao');if(ao)ao.onclick=()=>{readForm();c.meta.opciones.push({name:'texto',type:'string',required:false,desc:'Opción'});S.dirty=true;editor()};
  $$('[data-rm]').forEach(b=>b.onclick=()=>{readForm();c.meta.opciones.splice(+b.dataset.rm,1);S.dirty=true;editor()});
  $('#rq').oninput=e=>refList(e.target.value);$('#run').onclick=runTest;wireCode()}
const showDirty=()=>{const d=$('#dty');if(d)d.textContent=S.dirty?'● Sin guardar':''};
const mark=()=>{S.dirty=true;showDirty()};
work.addEventListener('input',e=>{if(S.cur&&!e.target.closest('#tp,#rq')){S.dirty=true;showDirty()}});
work.addEventListener('change',e=>{if(!S.cur||e.target.closest('#tp,#rq'))return;S.dirty=true;if(e.target.id==='ftipo'){const c=S.cur;readForm();const old=S.prevT;c.meta.tipo=e.target.value;if(!c.id&&c.code===TPL[old])c.code=TPL[c.meta.tipo];if(c.meta.tipo==='slash'&&!c.meta.descripcion)c.meta.descripcion='Comando personalizado';editor();tree()}});
async function save(){try{readForm();const c=S.cur;if(!c.name)throw Error('Escribe un nombre');const r=await api('/api/admin/discord/cmds/save',{id:c.id,folder:c.folder,name:c.name,meta:c.meta,code:c.code});
  c.id=r.id;S.dirty=false;showDirty();S.errs=r.errors;if(c.folder)S.open.add(c.folder);toast(r.errors.length?'Guardado, pero con errores en el código':'Guardado');await load(true);editor()}catch(x){toast(x.message,1)}}

// ---------------- resaltado de sintaxis ----------------
const RE=/(^[ \t]*\/\/[^\n]*)|(\\[\\$;\[\]])|(\$[A-Za-z_]\w*)|(\[)|(\])|(;)|(\d+(?:\.\d+)?)|([^$\\\[\];\d\/\n]+|[\s\S])/gm;
function hl(src){let d=0,o='';RE.lastIndex=0;let m;
  while((m=RE.exec(src))&&m[0]!==''){const t=m[0];
    if(m[1])o+=`<span class="c">${esc(t)}</span>`;else if(m[2])o+=`<span class="e">${esc(t)}</span>`;
    else if(m[3]){const n=t.slice(1).toLowerCase();o+=`<span class="${S.blk.has(n)?'k':S.fn.has(n)?'f':'u'}">${esc(t)}</span>`}
    else if(m[4]){o+=`<span class="d${d%4}">[</span>`;d++}else if(m[5]){d=Math.max(0,d-1);o+=`<span class="d${d%4}">]</span>`}
    else if(m[6])o+='<span class="s">;</span>';else if(m[7])o+=`<span class="n">${t}</span>`;else o+=esc(t)}
  return o+'\n '}
let raf=0;function paint(){const ta=$('#code');if(!ta)return;$('#hl').innerHTML=hl(ta.value);gutter()}
function gutter(){const ta=$('#code'),n=ta.value.split('\n').length,bad=new Set(S.errs.map(e=>e.line));$('#gut').innerHTML=Array.from({length:n},(_,i)=>bad.has(i+1)?`<span class="er">${i+1}</span>`:i+1).join('\n');syncScroll()}
function syncScroll(){const ta=$('#code');if(!ta)return;$('#hl').scrollTop=ta.scrollTop;$('#hl').scrollLeft=ta.scrollLeft;$('#gut').scrollTop=ta.scrollTop}
let ct=0;function checkSoon(ms=600){clearTimeout(ct);ct=setTimeout(async()=>{if(!S.cur||!$('#code'))return;try{readForm();S.errs=(await api('/api/admin/discord/cmds/check',{code:S.cur.code,meta:S.cur.meta})).errors;showErrs();gutter()}catch{}},ms)}
function showErrs(){const e=$('#errs');if(!e)return;e.innerHTML=S.errs.length?S.errs.map((x,i)=>`<button data-go="${i}">Línea ${x.line}: ${esc(x.msg)}</button>`).join(''):'<span class="okmsg">Sin errores de sintaxis.</span>'}
function go(i){const x=S.errs[i],ta=$('#code'),ls=ta.value.split('\n');let p=0;for(let k=0;k<x.line-1;k++)p+=ls[k].length+1;ta.focus();ta.setSelectionRange(p+x.col-1,p+x.col-1);ta.scrollTop=Math.max(0,(x.line-4)*20)}

// ---------------- teclado y autocompletado ----------------
const acEl=()=>$('#ac');let acList=[],acI=0,acFrom=0;
const SNIP={if:['$if[]\n  \n$endif',4],for:['$for[i;1;5]\n  \n$endfor',5],while:['$while[]\n  \n$endwhile',7]};
function insert(ta,text,caret){const s=ta.selectionStart,e=ta.selectionEnd;ta.setRangeText(text,s,e,'end');if(caret!=null)ta.setSelectionRange(s+caret,s+caret);input()}
function acClose(){const a=acEl();if(a)a.style.display='none';acList=[]}
function acOpen(){const ta=$('#code'),pos=ta.selectionStart,m=/\$([A-Za-z_]\w*)$/.exec(ta.value.slice(0,pos));if(!m)return acClose();
  const q=m[1].toLowerCase();acFrom=pos-m[0].length;acList=S.docs.filter(d=>d.n.toLowerCase().startsWith(q)&&d.n.toLowerCase()!==q).slice(0,12);if(!acList.length)return acClose();acI=0;
  const ls=ta.value.slice(0,pos).split('\n'),lh=20,cw=charW(),a=acEl();a.style.display='block';
  a.style.top=Math.min(ta.clientHeight-40,(ls.length)*lh+10-ta.scrollTop)+'px';a.style.left=Math.min(Math.max(0,ta.clientWidth-270),10+ls.at(-1).length*cw-ta.scrollLeft)+'px';acDraw()}
function acDraw(){acEl().innerHTML=acList.map((d,i)=>`<div class="${i===acI?'on':''}" data-i="${i}"><b>$${esc(d.n)}${d.a?`[${esc(d.a)}]`:''}</b><small>${esc(d.d)}</small></div>`).join('')}
function acPick(i){const d=acList[i],ta=$('#code');if(!d)return;ta.setSelectionRange(acFrom,ta.selectionStart);const k=d.n.toLowerCase();acClose();
  if(SNIP[k])return insert(ta,...SNIP[k]);const t='$'+d.n+(d.a?'[]':'');insert(ta,t,d.a?t.length-1:t.length)}
let cwv=0;const charW=()=>cwv||(cwv=(()=>{const c=document.createElement('canvas').getContext('2d');c.font='13px ui-monospace,Menlo,Consolas,monospace';return c.measureText('MMMMMMMMMM').width/10})());
function input(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{paint();acOpen()});mark();checkSoon()}
function wireCode(){const ta=$('#code');
  ta.addEventListener('input',input);ta.addEventListener('scroll',()=>{syncScroll();acClose()});ta.addEventListener('blur',()=>setTimeout(acClose,150));
  ta.addEventListener('keydown',e=>{const open=acEl().style.display==='block';
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();return save()}
    if(open){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();acI=(acI+(e.key==='ArrowDown'?1:-1)+acList.length)%acList.length;return acDraw()}if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();return acPick(acI)}if(e.key==='Escape')return acClose()}
    if(e.key==='Tab'){e.preventDefault();return insert(ta,'  ')}
    if(e.key==='['&&!e.ctrlKey&&!e.metaKey){e.preventDefault();return insert(ta,'[]',1)}
    if(e.key===']'&&ta.value[ta.selectionStart]===']'&&ta.selectionStart===ta.selectionEnd){e.preventDefault();return ta.setSelectionRange(ta.selectionStart+1,ta.selectionStart+1)}
    if(e.key==='Backspace'&&ta.selectionStart===ta.selectionEnd&&ta.value.slice(ta.selectionStart-1,ta.selectionStart+1)==='[]'){e.preventDefault();ta.setRangeText('',ta.selectionStart-1,ta.selectionStart+1,'end');return input()}});
  acEl().addEventListener('mousedown',e=>{const d=e.target.closest('[data-i]');if(d){e.preventDefault();acPick(+d.dataset.i)}});
  $('#errs').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)go(+b.dataset.go)})}

// ---------------- referencia de funciones ----------------
function refList(q){q=q.toLowerCase();const by={};S.docs.filter(d=>!q||d.n.toLowerCase().includes(q)||d.d.toLowerCase().includes(q)).forEach(d=>(by[d.c]??=[]).push(d));
  $('#rl').innerHTML=Object.entries(by).map(([c,l])=>`<div class="cat">${esc(c)}</div>`+l.map(d=>`<button class="fn" data-n="${esc(d.n)}"><code>$${esc(d.n)}${d.a?`[${esc(d.a)}]`:''}</code><small>${esc(d.d)}</small></button>`).join('')).join('')||'<p class="muted">Nada coincide.</p>';
  $$('.fn',$('#rl')).forEach(b=>b.onclick=()=>{const d=S.docs.find(x=>x.n===b.dataset.n),ta=$('#code'),k=d.n.toLowerCase();ta.focus();if(SNIP[k])return insert(ta,...SNIP[k]);const t='$'+d.n+(d.a&&!d.a.startsWith('[')?'[]':'');insert(ta,t,t.endsWith(']')?t.length-1:t.length)})}

// ---------------- pruebas ----------------
function testForm(){const m=S.cur.meta;$('#tin').innerHTML=m.tipo==='slash'?(m.opciones.map(o=>`<label>${esc(o.name)}${o.required?' *':''}<input data-o="${esc(o.name)}" placeholder="${esc(o.type)}"></label>`).join('')||'<span class="muted">Este comando no tiene opciones.</span>'):`<label class="wide">Lo que escribe el usuario después del comando<input id="targs" placeholder="palabra1 palabra2"></label>`}
async function runTest(){readForm();const o={};$$('[data-o]').forEach(i=>{if(i.value)o[i.dataset.o]=i.value});const b=$('#run');b.disabled=true;
  try{const r=await api('/api/admin/discord/cmds/test',{code:S.cur.code,meta:S.cur.meta,args:$('#targs')?.value||'',options:o});const out=$('#tout');
    if(r.errors?.length){S.errs=r.errors;showErrs();gutter();out.innerHTML='<p class="muted">Corrige primero los errores de sintaxis.</p>';return}
    if(r.error){out.innerHTML=`<p style="color:var(--danger)">⚠ ${esc(r.error)}</p>`;return}
    const m=r.message||{},e=m.embeds?.[0];
    out.innerHTML=`<div class="pv">${m.content?esc(m.content):(e?'':'<i>(sin texto: en Discord se respondería con ✓)</i>')}${e?`<div class="emb" style="border-color:#${(e.color??0x4f8cff).toString(16).padStart(6,'0')}">${e.author?`<small>${esc(e.author.name)}</small>`:''}${e.title?`<h5>${esc(e.title)}</h5>`:''}${esc(e.description||'')}${(e.fields||[]).map(f=>`<div class="fl"><b>${esc(f.name)}</b>${esc(f.value)}</div>`).join('')}${e.image?`<img src="${esc(e.image.url)}" alt="">`:''}${e.footer?`<div><small>${esc(e.footer.text)}</small></div>`:''}</div>`:''}${r.ephemeral||r.stopped?'<span class="eph">Solo la ve quien usa el comando</span>':''}</div>${r.stopped?'<p class="muted">El comando se detuvo con $stop / $onlyIf.</p>':''}${r.simulated?.length?`<ul class="sim">${r.simulated.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}`}
  catch(x){toast(x.message,1)}finally{b.disabled=false}}

load().catch(x=>toast(x.message,1));
})();
