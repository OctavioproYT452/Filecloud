// Fondo con imagen, GIF o vídeo y botones con imagen: lee las variables que define el tema (theme.css o applyTheme) y dibuja la capa.
(()=>{const R=document.documentElement;
function fcBg(){const cs=getComputedStyle(R),g=k=>cs.getPropertyValue(k).trim().replace(/^["']|["']$/g,''),src=g('--bgs'),kind=g('--bgk');let L=document.getElementById('fcbg');
  R.classList.toggle('hasbt',!!cs.getPropertyValue('--btu').trim());
  if(!src||!document.body){L?.remove();R.classList.remove('hasbg');return}
  R.classList.add('hasbg');if(L&&L.dataset.s===src)return;L?.remove();
  L=document.createElement('div');L.id='fcbg';L.dataset.s=src;
  const m=document.createElement(kind==='video'?'video':'img');m.src=src;m.setAttribute('aria-hidden','true');
  if(kind==='video'){m.muted=true;m.loop=true;m.playsInline=true;m.preload='auto';m.setAttribute('muted','');
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)m.autoplay=false;else{m.autoplay=true;m.play?.().catch(()=>{})}}
  m.onerror=()=>{L.remove();R.classList.remove('hasbg')};
  const dim=document.createElement('div');dim.className='fcdim';L.append(m,dim);document.body.prepend(L)}
window.fcBg=fcBg;
if(document.body)fcBg();else document.addEventListener('DOMContentLoaded',fcBg);
})();
