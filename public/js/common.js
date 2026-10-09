const ic=(n,c='')=>`<svg class="i ${c}"><use href="/icons.svg#${n}"/></svg>`;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=b=>{if(b==null)return'—';const u=['B','KB','MB','GB','TB'];let i=0;while(b>=1024&&i<4){b/=1024;i++}return(i?b.toFixed(b<10?2:1):b)+' '+u[i]};
const when=t=>t?new Date(t).toLocaleString():'—';
async function api(url,body,method){const o={method:method||(body?'POST':'GET'),headers:{}};if(body instanceof FormData)o.body=body;else if(body){o.headers['Content-Type']='application/json';o.body=JSON.stringify(body)}
const r=await fetch(url,o),d=await r.json().catch(()=>({}));if(r.status===401&&!/login|register/.test(url)){location.href='/';throw Error('Sesión expirada')}if(!r.ok)throw Error(d.error||'Error '+r.status);return d}
function toast(m,err){const t=document.createElement('div');t.className='toast'+(err?' err':'');t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),3500)}
function dialog(title,html,onOk,okText='Aceptar',cls=''){const d=document.createElement('dialog');d.className=cls;
d.innerHTML=`<form method="dialog"><h3>${esc(title)}</h3><div>${html}</div><div class="row end" style="margin-top:14px"><button type="button" class="btn ghost" data-x>${onOk?'Cancelar':'Cerrar'}</button>${onOk?`<button class="btn" value="ok">${okText}</button>`:''}</div></form>`;
document.body.append(d);$('[data-x]',d).onclick=()=>d.close();d.addEventListener('close',()=>d.remove());
$('form',d).addEventListener('submit',async e=>{e.preventDefault();if(!onOk)return;try{await onOk(d);d.close()}catch(x){toast(x.message,1)}});d.showModal();$('input,textarea',d)?.focus();return d}
const ask=(title,label,value='')=>new Promise(r=>{let v=null;dialog(title,`<label>${esc(label)}<input class="input" value="${esc(value)}"></label>`,d=>{v=$('input',d).value.trim()}).addEventListener('close',()=>r(v))});
const yes=(title,msg)=>new Promise(r=>{let v=false;dialog(title,`<p>${esc(msg)}</p>`,()=>{v=true},'Confirmar').addEventListener('close',()=>r(v))});
const logout=async()=>{await api('/api/logout',{});location.href='/'};

// ---------- Apariencia: temas predeterminados + personalización total ----------
const FONTS={system:'Inter,"Segoe UI",system-ui,sans-serif',serif:'Georgia,"Times New Roman",serif',mono:'ui-monospace,Menlo,Consolas,monospace',rounded:'ui-rounded,Nunito,"Segoe UI",system-ui,sans-serif'};
const CK=[['bg','Fondo'],['card','Tarjetas'],['card2','Elementos'],['text','Texto'],['muted','Texto suave'],['accent','Acento'],['on','Texto sobre acento'],['danger','Peligro'],['ok','Éxito'],['warn','Aviso']];
const P=(n,bg,card,card2,text,muted,accent,on,r,font='system',sp='1')=>({n,bg,card,card2,text,muted,accent,on,danger:'#ff6b7a',ok:'#34d399',warn:'#fbbf24',r,font,sp});
const PRESETS=[
P('Medianoche','#0b1020','#121a2e','#18223a','#e8eefc','#8d9ab3','#6ea8fe','#04213f',14),
P('Océano','#06222b','#0b3340','#10475a','#e6fbff','#8cc4d1','#22d3ee','#032a33',16),
P('Bosque','#0d1a14','#14281f','#1b3629','#e8f7ee','#8bb59c','#4ade80','#062314',12),
P('Atardecer','#1f1020','#2d1630','#3b1d3f','#fff1e6','#d1a3b8','#fb923c','#2b1000',20,'rounded'),
P('Neón','#0a0014','#160028','#22003d','#fbe8ff','#b38ac9','#ff2bd6','#1a0014',4,'mono'),
P('Dracula','#1e1f29','#282a36','#343746','#f8f8f2','#a0a4c0','#bd93f9','#1e1f29',10),
P('Terminal','#000000','#06120a','#0b2012','#7cfc9a','#3f9f5f','#00ff66','#001a08',0,'mono','0.8'),
P('Alto contraste','#000000','#0d0d0d','#1a1a1a','#ffffff','#cccccc','#ffff00','#000000',6),
P('Claro suave','#f4f1ec','#ffffff','#efe9e0','#2b2118','#7a6b5a','#d97706','#ffffff',18,'serif','1.25'),
P('Nórdico','#eceff4','#ffffff','#e1e6ee','#2e3440','#6b7690','#5e81ac','#ffffff',10),
P('Papel','#fafafa','#ffffff','#f0f0f0','#111111','#666666','#111111','#ffffff',2,'serif'),
P('Menta','#eefaf4','#ffffff','#dff3e9','#0f2a1d','#4f7a63','#10b981','#ffffff',22,'rounded','1.25')];
function applyTheme(t){const s=document.documentElement.style;CK.forEach(([k])=>t[k]?s.setProperty('--'+k,t[k]):s.removeProperty('--'+k));
t.r!=null?s.setProperty('--r',t.r+'px'):s.removeProperty('--r');t.font?s.setProperty('--font',FONTS[t.font]):s.removeProperty('--font');t.sp?s.setProperty('--sp',t.sp):s.removeProperty('--sp')}
async function appearance(){const{theme}=await api('/api/theme');let t={...(theme||{})},saved=false;
const d=dialog('Apariencia',`<small>Elige un tema y ajusta lo que quieras. Se ve al instante y se guarda en tu cuenta.</small>
<div class="presets">${PRESETS.map((p,i)=>`<button type="button" class="pre" data-i="${i}" style="background:${p.bg};color:${p.text};border-color:${p.accent};border-radius:${p.r}px;font-family:${FONTS[p.font]}"><i style="background:${p.accent}"></i>${p.n}</button>`).join('')}<button type="button" class="pre" data-i="-1">${ic('refresh')} Predeterminado</button></div>
<div class="cgrid">${CK.map(([k,l])=>`<label>${l}<input type="color" data-k="${k}"></label>`).join('')}</div>
<label>Redondeo de esquinas: <b data-rv></b><input type="range" min="0" max="28" data-r></label>
<div class="row"><label class="grow">Tipografía<select data-f><option value="system">Moderna</option><option value="serif">Clásica</option><option value="mono">Monoespaciada</option><option value="rounded">Redondeada</option></select></label>
<label class="grow">Densidad<select data-s><option value="0.8">Compacta</option><option value="1">Normal</option><option value="1.25">Amplia</option></select></label></div>`,
async()=>{await api('/api/theme',{theme:t});saved=true;toast('Tema guardado')},'Guardar','wide');
const sync=()=>{const cs=getComputedStyle(document.documentElement);CK.forEach(([k])=>{const v=cs.getPropertyValue('--'+k).trim();$(`[data-k=${k}]`,d).value=/^#[0-9a-f]{6}$/i.test(v)?v:'#000000'});
const r=parseInt(cs.getPropertyValue('--r'))||14;$('[data-r]',d).value=r;$('[data-rv]',d).textContent=r+'px';$('[data-f]',d).value=t.font||'system';$('[data-s]',d).value=t.sp||'1'};
const set=()=>{applyTheme(t);sync()};
d.addEventListener('click',e=>{const b=e.target.closest('.pre');if(!b)return;const i=+b.dataset.i;t=i<0?{}:{...PRESETS[i]};delete t.n;set()});
d.addEventListener('input',e=>{const x=e.target;if(x.dataset.k)t[x.dataset.k]=x.value;else if('r'in x.dataset)t.r=+x.value;else if('f'in x.dataset)t.font=x.value;else if('s'in x.dataset)t.sp=x.value;applyTheme(t);if('r'in x.dataset)$('[data-rv]',d).textContent=x.value+'px'});
d.addEventListener('close',()=>{if(!saved)applyTheme(theme||{})});sync()}

// Menú hamburguesa (solo visible en pantallas pequeñas)
document.addEventListener('click',e=>{const b=$('#burger'),n=$('#nav');if(!b||!n)return;
  if(e.target.closest('#burger')){const o=n.classList.toggle('open');b.setAttribute('aria-expanded',o)}
  else if(n.classList.contains('open')&&(e.target.closest('#nav .btn')||!e.target.closest('#nav'))){n.classList.remove('open');b.setAttribute('aria-expanded',false)}});
