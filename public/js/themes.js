let list=[],me={},saved=null,cur=null,filt='all';
const prev=t=>{const g=k=>t[k]||'#888888',r=t.r??12,im=t.mu&&t.bgf&&!/\.(mp4|webm)$/i.test(t.bgf)?`url('/tm/${t.mu}/${encodeURIComponent(t.bgf)}') center/cover,`:'';return `<div class="tprev" style="background:${im}${g('bg')};border-radius:${r}px;font-family:${FONTS[t.font]||FONTS.system}"><div style="background:${g('card')};color:${g('text')};border-radius:${r*.8}px;padding:10px"><b>Título</b><div style="color:${g('muted')};font-size:12px;margin:2px 0 8px">Texto de ejemplo</div><span style="display:inline-block;background:${g('accent')};color:${g('on')};border-radius:${r*.6}px;padding:4px 10px;font-size:12px;margin-right:6px">Botón</span><span style="display:inline-block;background:${g('card2')};border-radius:${r*.6}px;padding:4px 10px;font-size:12px">Elemento</span></div></div>`};
const DEV={mobile:'Celular',pc:'PC'},isMobile=()=>matchMedia('(max-width:820px)').matches||matchMedia('(pointer:coarse)').matches;
function render(){const q=$('#q').value.toLowerCase(),s=$('#s').value,dv=$('#dv').value;
  const v=list.filter(c=>(filt==='all'||c.mine)&&(!dv||(c.theme.dev||'both')==='both'||c.theme.dev===dv)&&(c.name+' '+c.author).toLowerCase().includes(q)).sort((a,b)=>s==='name'?a.name.localeCompare(b.name):s==='author'?a.author.localeCompare(b.author):b.id-a.id);
  $('#cnt').textContent=list.length?`${v.length} de ${list.length} tema${list.length===1?'':'s'}`:'';
  $('#g').innerHTML=v.map(c=>`<article class="tc" data-id="${c.id}">${prev(c.theme)}<div class="tc-info"><b>${esc(c.name)}</b><small>por ${esc(c.author)}${c.mine?' <span class="badge ad">TÚ</span>':''} <span class="badge">${DEV[c.theme.dev]?'Solo '+DEV[c.theme.dev]:'Celular y PC'}</span></small>${(c.theme.bgf||c.theme.btf)&&c.theme.dev&&c.theme.dev!==(isMobile()?'mobile':'pc')?`<small class="warn">Pensado para ${c.theme.dev==='pc'?'PC':'celular'}: el fondo puede verse mal en ${isMobile()?'tu celular':'tu PC'}.</small>`:''}</div><div class="tc-main"><button class="btn sm ghost" data-a="try">${ic('eye')} Probar</button><button class="btn sm" data-a="use">${ic('check')} Usar</button></div><div class="tc-sec"><button class="lnk" data-a="save">${ic('plus')} Guardar en Mis temas</button>${c.mine?`<button class="lnk" data-a="unpub">${ic('x')} Dejar de compartir</button>`:''}${me.admin&&!c.mine?`<button class="lnk bad" data-a="rm">${ic('trash')} Retirar</button>`:''}</div></article>`).join('')
    ||`<div class="empty">${ic('globe')}<b>${list.length?'Sin resultados':'Aún no hay temas publicados'}</b><p class="muted">${list.length?'Prueba con otra búsqueda o filtro.':'Sé el primero: Apariencia → Mis temas → icono del globo.'}</p></div>`}
async function use(c){const r=await api('/api/community/save',{id:c.id});await api('/api/theme',{theme:r.theme});saved=r.theme;applyTheme(r.theme);$('#tryBar').hidden=true;toast('Tema aplicado')}
async function load(){list=(await api('/api/community')).themes;render()}
$('#q').oninput=$('#s').onchange=$('#dv').onchange=render;
$('#seg').onclick=e=>{const b=e.target.closest('[data-f]');if(!b)return;filt=b.dataset.f;$$('#seg button').forEach(x=>x.classList.toggle('on',x===b));render()};
$('#g').onclick=async e=>{const b=e.target.closest('[data-a]');if(!b)return;const c=list.find(x=>x.id===+b.closest('.tc').dataset.id);if(!c)return;
  try{const a=b.dataset.a;
    if(a==='try'){cur=c;applyTheme(c.theme);$('#tn').textContent=c.name;$('#tryBar').hidden=false}
    if(a==='save'){const r=await api('/api/community/save',{id:c.id});toast('Guardado en Mis temas como «'+r.name+'»')}
    if(a==='use')await use(c);
    if(a==='unpub'&&await yes('Dejar de compartir',`«${c.name}» dejará de aparecer en la comunidad. Seguirá en Mis temas.`)){await api('/api/community/unpublish',{id:c.id});toast('Tema retirado de la comunidad');await load()}
    if(a==='rm'&&await yes('Retirar tema',`¿Retirar "${c.name}" de la comunidad? Seguirá en la cuenta de su autor, pero dejará de ser público.`)){await api('/api/admin/community/unpublish',{id:c.id});await load()}
  }catch(x){toast(x.message,1)}};
$('#tryBar').onclick=async e=>{const a=e.target.closest('[data-t]')?.dataset.t;if(!a)return;
  try{if(a==='use')await use(cur);else{applyTheme(saved||{});$('#tryBar').hidden=true}}catch(x){toast(x.message,1)}};
Promise.all([api('/api/session'),api('/api/theme')]).then(([s,t])=>{me=s;saved=t.theme;updateNotice(s);return load()}).catch(x=>toast(x.message,1));
