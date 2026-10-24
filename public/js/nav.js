// Menú de usuario para las páginas secundarias (Administración y Comunidad de temas): mismo diseño que el del panel.
(()=>{const page=document.body.dataset.page,btn=$('#avBtn');if(!btn)return;let s=null;
const scrim=document.createElement('div');scrim.className='uscrim';const m=document.createElement('aside');m.className='umenu';m.setAttribute('aria-label','Menú de usuario');document.body.append(scrim,m);
const ini=n=>(String(n||'?').trim()[0]||'?').toUpperCase();let acts=[];
const item=(i,t,d,f,href,cls='')=>{const k=f?acts.push(f)-1:'',inner=`<span class="mic">${ic(i)}</span><span class="grow"><b>${t}</b>${d?`<small>${d}</small>`:''}</span>`;
  return href?`<a class="mi ${cls}" href="${href}" role="menuitem">${inner}</a>`:`<button type="button" class="mi ${cls}" role="menuitem" data-k="${k}">${inner}</button>`};
const build=()=>{acts=[];const G=[['Ir a',[['home','Mis archivos','Volver a tu panel',null,'/panel.html'],...(s.admin&&page!=='admin'?[['settings','Administración','Usuarios, espacio y ajustes',null,'/admin/']]:[]),...(page!=='themes'?[['globe','Comunidad de temas','Temas de otros usuarios',null,'/themes.html']]:[])]],
  ['Personalización',[['palette','Apariencia','Temas, colores y tipografía',()=>appearance()]]]];
  m.innerHTML=`<div class="uhead"><span class="uav lg">${esc(ini(s.user))}</span><div class="grow" style="min-width:0"><div class="uname">${esc(s.user)}${s.admin?' <span class="badge ad">ADMIN</span>':''}</div><small>Tu cuenta en SynapseBox</small></div></div>`+
  G.map(([g,l])=>`<div class="ugrp">${g}</div>`+l.map(x=>item(...x)).join('')).join('')+'<hr>'+item('logout','Cerrar sesión','Salir de este dispositivo',()=>logout(),null,'out')};
const isOpen=()=>m.classList.contains('open'),close=()=>{m.classList.remove('open');scrim.classList.remove('on');btn.setAttribute('aria-expanded',false)};
btn.onclick=()=>{if(!s)return;if(isOpen())return close();build();m.classList.add('open');scrim.classList.add('on');btn.setAttribute('aria-expanded',true)};
scrim.onclick=close;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen())close()});
m.addEventListener('click',e=>{const b=e.target.closest('[data-k]'),a=e.target.closest('a.mi');if(!b&&!a)return;close();if(b){const f=acts[+b.dataset.k];setTimeout(()=>{try{const r=f();r&&r.catch&&r.catch(x=>toast(x.message,1))}catch(x){toast(x.message,1)}},120)}});
api('/api/session').then(r=>{s=r;btn.innerHTML=`<span class="uav">${esc(ini(r.user))}</span><span class="uname-s">${esc(r.user||'')}</span>`}).catch(()=>{});
})();
