let list=[],me={},saved=null,cur=null;
const prev=t=>{const g=k=>t[k]||'#888888',r=t.r??12;return `<div class="tprev" style="background:${g('bg')};border-radius:${r}px;font-family:${FONTS[t.font]||FONTS.system}"><div style="background:${g('card')};color:${g('text')};border-radius:${r*.8}px;padding:10px"><b>Título</b><div style="color:${g('muted')};font-size:12px;margin:2px 0 8px">Texto de ejemplo</div><span style="display:inline-block;background:${g('accent')};color:${g('on')};border-radius:${r*.6}px;padding:4px 10px;font-size:12px;margin-right:6px">Botón</span><span style="display:inline-block;background:${g('card2')};border-radius:${r*.6}px;padding:4px 10px;font-size:12px">Elemento</span></div></div>`};
function render(){const q=$('#q').value.toLowerCase(),s=$('#s').value;
  const v=list.filter(c=>(c.name+' '+c.author).toLowerCase().includes(q)).sort((a,b)=>s==='name'?a.name.localeCompare(b.name):s==='author'?a.author.localeCompare(b.author):b.id-a.id);
  $('#g').innerHTML=v.map(c=>`<div class="tc" data-id="${c.id}">${prev(c.theme)}<div><b>${esc(c.name)}</b><br><small>por ${esc(c.author)}${c.mine?' (tú)':''}</small></div><div class="row"><button class="btn sm ghost" data-a="try">${ic('eye')} Probar</button><button class="btn sm" data-a="use">${ic('palette')} Usar</button><button class="btn sm ghost" data-a="save">${ic('plus')} Guardar</button>${me.admin?`<button class="btn sm danger" data-a="rm" aria-label="Retirar">${ic('trash')}</button>`:''}</div></div>`).join('')
    ||`<p class="muted">${list.length?'Sin resultados.':'Todavía no hay temas publicados en este servidor. Sé el primero: Apariencia → Mis temas → icono del globo.'}</p>`}
async function use(c){await api('/api/community/save',{id:c.id});await api('/api/theme',{theme:c.theme});saved=c.theme;applyTheme(c.theme);$('#tryBar').hidden=true;toast('Tema aplicado')}
async function load(){list=(await api('/api/community')).themes;render()}
$('#q').oninput=$('#s').onchange=render;$('#th').onclick=appearance;
$('#g').onclick=async e=>{const b=e.target.closest('[data-a]');if(!b)return;const c=list.find(x=>x.id===+b.closest('.tc').dataset.id);if(!c)return;
  try{const a=b.dataset.a;
    if(a==='try'){cur=c;applyTheme(c.theme);$('#tn').textContent=c.name;$('#tryBar').hidden=false}
    if(a==='save'){const r=await api('/api/community/save',{id:c.id});toast('Guardado en Mis temas como «'+r.name+'»')}
    if(a==='use')await use(c);
    if(a==='rm'&&await yes('Retirar tema',`¿Retirar "${c.name}" de la comunidad? Seguirá en la cuenta de su autor, pero dejará de ser público.`)){await api('/api/admin/community/unpublish',{id:c.id});await load()}
  }catch(x){toast(x.message,1)}};
$('#tryBar').onclick=async e=>{const a=e.target.closest('[data-t]')?.dataset.t;if(!a)return;
  try{if(a==='use')await use(cur);else{applyTheme(saved||{});$('#tryBar').hidden=true}}catch(x){toast(x.message,1)}};
Promise.all([api('/api/session'),api('/api/theme')]).then(([s,t])=>{me=s;saved=t.theme;return load()}).catch(x=>toast(x.message,1));
