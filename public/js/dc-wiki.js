// Wiki de FCScript: guías y referencia de todas las funciones, con ejemplos y buscador.
(()=>{
const nav=$('#wnav'),body=$('#wbody');
const md=t=>esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/`([^`]+)`/g,'<code>$1</code>');
const sig=d=>'$'+d.n+(d.a?'['+d.a+']':'');
const slug=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-');
let W=null;
function guideHtml(g){return`<h2 id="g-${g.id}">${esc(g.title)}</h2>`+g.b.map(b=>b.t==='p'?`<p>${md(b.v)}</p>`:b.t==='ul'?`<ul>${b.v.map(x=>`<li>${md(x)}</li>`).join('')}</ul>`:b.t==='tip'?`<div class="dc-tip">💡 ${md(b.v)}</div>`:`<pre><button class="btn ghost sm dc-cp" data-cp>Copiar</button><code>${esc(b.v)}</code></pre>`).join('')}
function fnHtml(d){const ex=d.ex||[d.a?sig(d):'$'+d.n,''];
  return`<div class="dc-fcard" id="f-${slug(d.n)}"><h4>${esc(sig(d))}</h4><p>${esc(d.d)}</p><pre><button class="btn ghost sm dc-cp" data-cp>Copiar</button><code>${esc(ex[0])}</code></pre>${ex[1]?`<div class="dc-res">${esc(ex[1])}</div>`:''}</div>`}
function render(q){q=(q||'').toLowerCase().trim();let h='';
  const gs=W.guides.filter(g=>!q||g.title.toLowerCase().includes(q)||g.b.some(b=>String(b.v).toLowerCase().includes(q)));
  h+=gs.map(guideHtml).join('');
  const fs=W.functions.filter(d=>!q||d.n.toLowerCase().includes(q)||d.d.toLowerCase().includes(q)||d.c.toLowerCase().includes(q));
  const by={};fs.forEach(d=>(by[d.c]??=[]).push(d));
  h+=Object.entries(by).map(([c,l])=>`<h2 id="c-${slug(c)}">Funciones: ${esc(c)}</h2>`+l.map(fnHtml).join('')).join('');
  body.innerHTML=h||'<p class="muted">No hay resultados.</p>';
  nav.innerHTML=`<input type="search" id="wq" placeholder="Buscar en la wiki…" value="${esc(q)}"><div class="dc-cat">Guías</div>${W.guides.map(g=>`<a href="#g-${g.id}">${esc(g.title)}</a>`).join('')}<div class="dc-cat">Funciones (${W.functions.length})</div>${[...new Set(W.functions.map(d=>d.c))].map(c=>`<a href="#c-${slug(c)}">${esc(c)}</a>`).join('')}`;
  const i=$('#wq');if(q){i.focus();i.setSelectionRange(q.length,q.length)}}
nav.addEventListener('input',e=>{if(e.target.id==='wq')render(e.target.value)});
body.addEventListener('click',async e=>{const b=e.target.closest('[data-cp]');if(!b)return;const t=b.parentElement.querySelector('code').textContent;try{await navigator.clipboard.writeText(t);b.textContent='¡Copiado!'}catch{b.textContent='No se pudo'}setTimeout(()=>b.textContent='Copiar',1400)});
const x=document.createElement('button');x.className='btn dc-wclose';x.id='wclose';x.textContent='✕ Cerrar wiki';
x.onclick=()=>{window.close();setTimeout(()=>{location.href='/admin/discord.html'},200)};document.body.append(x);
api('/api/admin/discord/script/wiki').then(w=>{W=w;render('');if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView()}).catch(x=>{body.innerHTML=`<p style="color:var(--danger)">${esc(x.message)}</p>`});
})();
