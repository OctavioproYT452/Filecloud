// Menú de usuario (panel): desplegable en escritorio y panel lateral en móvil (botón hamburguesa).
const ini=n=>(String(n||'?').trim()[0]||'?').toUpperCase();
function userUI(){const a=$('#avI');if(a&&me)a.textContent=ini(me.user)}
(()=>{const scrim=document.createElement('div');scrim.className='uscrim';
const m=document.createElement('aside');m.className='umenu';m.id='umenu';m.setAttribute('aria-label','Menú de usuario');document.body.append(scrim,m);
let acts=[];const isOpen=()=>m.classList.contains('open');
const toggler=()=>[$('#avBtn'),$('#burger')].filter(Boolean);
function build(){const ai=$('#aiBtn');
  const G=[['Mis archivos',[['chart','Limpieza de espacio','Archivos grandes y duplicados',()=>cleanDlg()],['info','Estadísticas','Uso por tipo, carpetas y archivos antiguos',()=>statsDlg()],['trash','Papelera','Restaura lo que has borrado',()=>trashDlg()],['link','Enlaces compartidos','Revisa y elimina lo que has compartido',()=>shares()],...(ai?[['bot','Asistente IA','Pídele que organice tus archivos',()=>ai.click()]]:[])]],
    ['Personalización',[['palette','Apariencia','Temas, colores y tipografía',()=>appearance()],['globe','Comunidad de temas','Temas publicados por otros usuarios',null,'/themes.html']]],
    ['Mi cuenta',[['user','Mi perfil','Usuario, contraseña y sesiones',()=>account()],['shield','Seguridad','Verificación en dos pasos y recuperación',()=>security().catch(x=>toast(x.message,1))],['folder','Acceso WebDAV','Monta tu carpeta como unidad de red',()=>webdavDialog()],...(me.admin?[['settings','Administración','Usuarios, espacio y ajustes del servidor',null,'/admin/']]:[])]]];
  acts=[];const item=(i,t,d,f,href,cls='')=>{const k=f?acts.push(f)-1:'',inner=`<span class="mic">${ic(i)}</span><span class="grow"><b>${t}</b>${d?`<small>${d}</small>`:''}</span>`;
    return href?`<a class="mi ${cls}" href="${href}" role="menuitem">${inner}</a>`:`<button type="button" class="mi ${cls}" role="menuitem" data-k="${k}">${inner}</button>`};
  const sp=$('#space')?.textContent||'',pc=$('#pct')?.textContent||'',w=$('#bar i')?.style.width||'0%',bc=$('#bar')?.className||'bar';
  m.innerHTML=`<div class="uhead"><span class="uav lg">${esc(ini(me.user))}</span><div class="grow" style="min-width:0"><div class="uname">${esc(me.user)}${me.admin?' <span class="badge ad">ADMIN</span>':''}</div><small>Tu cuenta en File Cloud</small></div></div>
  <div class="uquota"><div class="row"><small class="grow">${esc(sp)}</small><small>${esc(pc)}</small></div><div class="${bc}"><i style="width:${w}"></i></div></div>`+
  G.map(([g,l])=>`<div class="ugrp">${g}</div>`+l.map(x=>item(...x)).join('')).join('')+`<hr>`+item('logout','Cerrar sesión','Salir de este dispositivo',()=>logout(),null,'out')}
function open(){build();m.classList.add('open');scrim.classList.add('on');toggler().forEach(b=>b.setAttribute('aria-expanded',true))}
function close(){m.classList.remove('open');scrim.classList.remove('on');toggler().forEach(b=>b.setAttribute('aria-expanded',false))}
// En el panel la hamburguesa abre este menú (se intercepta antes que el manejador genérico de common.js)
document.addEventListener('click',e=>{if(e.target.closest('#burger,#avBtn')){e.stopPropagation();isOpen()?close():open()}},true);
scrim.onclick=close;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen())close()});
m.addEventListener('click',e=>{const b=e.target.closest('[data-k]'),a=e.target.closest('a.mi');if(!b&&!a)return;close();if(b){const f=acts[+b.dataset.k];setTimeout(()=>{try{const r=f();r&&r.catch&&r.catch(x=>toast(x.message,1))}catch(x){toast(x.message,1)}},120)}});
})();
