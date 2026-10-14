// Fondo animado ligero: red de partículas en canvas.
// Cuida el rendimiento: máx. 30 fps, pocas partículas (según pantalla y dispositivo), DPR 1,
// se pausa con la pestaña oculta y se adapta solo si detecta que el equipo va justo.
(()=>{const cv=document.getElementById('bg');if(!cv||!cv.getContext)return;const ctx=cv.getContext('2d',{alpha:true});
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const weak=(navigator.hardwareConcurrency||4)<=4||(navigator.deviceMemory||4)<=4||innerWidth<700;
let W=0,H=0,P=[],link=true,run=false,last=0,slow=0,n=0,col='#6ea8fe';
const rnd=(a,b)=>a+Math.random()*(b-a);
function size(){W=cv.width=innerWidth;H=cv.height=innerHeight;const want=Math.max(14,Math.min(weak?28:52,Math.round(W*H/(weak?30000:24000))));
  while(P.length<want)P.push({x:rnd(0,W),y:rnd(0,H),vx:rnd(-.25,.25),vy:rnd(-.25,.25),r:rnd(1,2.4)});P.length=Math.min(P.length,want);
  col=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||col}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle=col;ctx.strokeStyle=col;const D=link?(weak?110:140):0,D2=D*D;
  for(let i=0;i<P.length;i++){const a=P[i];
    if(!reduce){a.x+=a.vx;a.y+=a.vy;if(a.x<-10)a.x=W+10;else if(a.x>W+10)a.x=-10;if(a.y<-10)a.y=H+10;else if(a.y>H+10)a.y=-10}
    ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,6.283);ctx.fill();
    if(link)for(let j=i+1;j<P.length;j++){const b=P[j],dx=a.x-b.x,dy=a.y-b.y,d=dx*dx+dy*dy;
      if(d<D2){ctx.globalAlpha=(1-d/D2)*.28;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}}
  ctx.globalAlpha=1}
function loop(t){if(!run)return;requestAnimationFrame(loop);if(t-last<33)return; // ~30 fps
  const dt=t-last;last=t;draw();
  // si los fotogramas tardan demasiado de forma sostenida: primero sin líneas, luego menos partículas
  if(dt>55){if(++slow>40){slow=0;if(link)link=false;else if(P.length>10)P.length=Math.ceil(P.length*.6);else stop()}}else if(slow>0)slow--}
function start(){if(run||reduce)return;run=true;last=0;requestAnimationFrame(loop)}
function stop(){run=false}
size();draw();start();
addEventListener('resize',()=>{clearTimeout(n);n=setTimeout(()=>{size();if(reduce)draw()},200)});
document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
})();
