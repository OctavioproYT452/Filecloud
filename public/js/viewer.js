// Visores de documentos: PDF (pdf.js) y Office. Con LibreOffice en el servidor todo se convierte a PDF;
// si no está instalado, docx, xlsx y pptx se dibujan aquí mismo leyendo el archivo (.docx/.xlsx/.pptx son ZIP con XML).
const loadScript=src=>new Promise((ok,no)=>{if(loadScript.c?.[src])return ok();const s=document.createElement('script');s.src=src;s.onload=()=>{(loadScript.c??={})[src]=1;ok()};s.onerror=()=>no(Error('No se pudo cargar el visor'));document.head.append(s)});
const getBuf=async u=>{const r=await fetch(u);if(!r.ok){const d=await r.json().catch(()=>({}));throw Object.assign(Error(d.error||'Error '+r.status),{status:r.status})}return r.arrayBuffer()};
const xml=s=>new DOMParser().parseFromString(s,'application/xml');
const qa=(n,t)=>n?[...n.getElementsByTagNameNS('*',t)]:[];
const q1=(n,t)=>qa(n,t)[0];
const kids=(n,t)=>n?[...n.children].filter(c=>c.localName===t):[];
const el=(t,css,txt)=>{const e=document.createElement(t);if(css)e.style.cssText=css;if(txt!=null)e.textContent=txt;return e};
const HEXC=/^[0-9a-f]{6}$/i;
const MIMEI={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',bmp:'image/bmp',webp:'image/webp'};
async function ztext(z,p){const f=z.file(p);return f?xml(await f.async('string')):null}
async function zrels(z,p){const d=await ztext(z,p.replace(/([^/]+)$/,'_rels/$1.rels')),m={};qa(d,'Relationship').forEach(r=>m[r.getAttribute('Id')]={t:r.getAttribute('Target'),y:r.getAttribute('Type')||''});return m}
const rpath=(from,t)=>{if(t.startsWith('/'))return t.slice(1);const a=from.split('/').slice(0,-1);for(const s of t.split('/')){if(s==='..')a.pop();else if(s!=='.')a.push(s)}return a.join('/')};
async function zimg(z,from,rel){if(!rel)return null;const p=rpath(from,rel.t),m=MIMEI[p.split('.').pop().toLowerCase()],f=z.file(p);return m&&f?`data:${m};base64,`+await f.async('base64'):null}

// ---------- PDF ----------
async function pdfView(host,buf){
  const pdfjs=await import('/vendor/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.mjs';
  const doc=await pdfjs.getDocument({data:new Uint8Array(buf),isEvalSupported:false,useSystemFonts:true,wasmUrl:'/vendor/wasm/'}).promise;
  let zoom=1,io;host.innerHTML=`<div class="vbar"><span class="grow">${doc.numPages} página${doc.numPages==1?'':'s'}</span><button type="button" class="btn sm ghost" data-z="-" aria-label="Alejar">−</button><b data-zv>100%</b><button type="button" class="btn sm ghost" data-z="+" aria-label="Acercar">+</button></div><div class="vpages"></div>`;
  const box=$('.vpages',host);host.closest('dialog')?.addEventListener('close',()=>{io?.disconnect();doc.destroy()});
  async function build(){io?.disconnect();box.innerHTML='';const first=await doc.getPage(1),b=first.getViewport({scale:1}),sc=Math.max(.2,(box.clientWidth-20)/b.width*zoom),dpr=window.devicePixelRatio||1;
    $('[data-zv]',host).textContent=Math.round(zoom*100)+'%';
    io=new IntersectionObserver(es=>es.forEach(async en=>{const p=en.target;if(!en.isIntersecting||p.dataset.d)return;p.dataset.d=1;
      try{const pg=await doc.getPage(+p.dataset.n),vp=pg.getViewport({scale:sc}),c=document.createElement('canvas');c.width=Math.floor(vp.width*dpr);c.height=Math.floor(vp.height*dpr);c.style.width=vp.width+'px';c.style.height=vp.height+'px';
        p.style.width=vp.width+'px';p.style.height=vp.height+'px';p.append(c);await pg.render({canvas:c,viewport:vp,transform:dpr!==1?[dpr,0,0,dpr,0,0]:null}).promise}catch{p.textContent='No se pudo dibujar esta página'}}),{root:box,rootMargin:'700px 0px'});
    for(let i=1;i<=doc.numPages;i++){const p=el('div');p.className='vpage';p.dataset.n=i;p.style.width=b.width*sc+'px';p.style.height=b.height*sc+'px';box.append(p);io.observe(p)}}
  host.onclick=e=>{const z=e.target.closest('[data-z]')?.dataset.z;if(!z)return;zoom=Math.min(3,Math.max(.4,zoom+(z==='+'?.25:-.25)));build()};
  await build()}

// ---------- DOCX ----------
async function docxView(host,buf){await loadScript('/vendor/jszip.min.js');const z=await JSZip.loadAsync(buf),P='word/document.xml',d=await ztext(z,P);if(!d)throw Error('Documento no válido');const rel=await zrels(z,P);
  const run=async(r,p)=>{const rp=kids(r,'rPr')[0],on=t=>{const n=q1(rp,t);return n&&n.getAttribute('w:val')!=='0'&&n.getAttribute('w:val')!=='false'},col=q1(rp,'color')?.getAttribute('w:val'),sz=q1(rp,'sz')?.getAttribute('w:val');
    const css=(on('b')?'font-weight:700;':'')+(on('i')?'font-style:italic;':'')+(on('u')?'text-decoration:underline;':'')+(HEXC.test(col||'')?`color:#${col};`:'')+(+sz?`font-size:${Math.min(40,Math.max(8,sz/2))}pt;`:'');
    for(const c of r.children){if(c.localName==='t'||c.localName==='tab'||c.localName==='br'){if(c.localName==='br')p.append(el('br'));else p.append(el('span',css,c.localName==='tab'?' ':c.textContent))}
      else if(c.localName==='drawing'||c.localName==='pict'){const b=q1(c,'blip'),src=b&&await zimg(z,P,rel[b.getAttribute('r:embed')]);if(src){const i=el('img','max-width:100%;height:auto');i.src=src;p.append(i)}}}};
  const para=async p=>{const pr=kids(p,'pPr')[0],st=q1(pr,'pStyle')?.getAttribute('w:val')||'',h=/^(title|heading\s*(\d))/i.exec(st)||/^(t[ií]tulo\s*(\d)?)/i.exec(st),lv=h?(h[2]||'1'):0,n=lv?el('h'+Math.min(4,+lv+1)):el('p');
    const jc=q1(pr,'jc')?.getAttribute('w:val');if(jc)n.style.textAlign=jc==='both'?'justify':jc==='right'||jc==='end'?'right':jc==='center'?'center':'';
    if(q1(pr,'numPr')){n.style.marginLeft=(1.4+(+q1(pr,'ilvl')?.getAttribute('w:val')||0)*1.4)+'em';n.append(el('span',null,'• '))}
    for(const c of p.children){if(c.localName==='r')await run(c,n);else if(c.localName==='hyperlink'||c.localName==='smartTag'||c.localName==='ins')for(const r of kids(c,'r'))await run(r,n)}
    if(!n.childNodes.length)n.append(el('br'));return n};
  const tbl=async t=>{const T=el('table','border-collapse:collapse;margin:8px 0;max-width:100%');for(const tr of kids(t,'tr')){const R=T.insertRow();for(const tc of kids(tr,'tc')){const C=R.insertCell();C.style.cssText='border:1px solid #bbb;padding:4px 8px;vertical-align:top';const sp=+q1(tc,'gridSpan')?.getAttribute('w:val');if(sp>1)C.colSpan=sp;for(const b of tc.children){if(b.localName==='p')C.append(await para(b));else if(b.localName==='tbl')C.append(await tbl(b))}}}return T};
  const page=el('div');page.className='vdoc';let n=0;for(const b of q1(d,'body').children){if(++n>4000){page.append(el('p',null,'… documento truncado en la vista previa'));break}if(b.localName==='p')page.append(await para(b));else if(b.localName==='tbl')page.append(await tbl(b))}
  host.replaceChildren(page)}

// ---------- XLSX ----------
const colN=r=>{let n=0;for(const ch of r.replace(/\d/g,''))n=n*26+ch.charCodeAt(0)-64;return n-1};
const colL=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s};
async function xlsxView(host,buf){await loadScript('/vendor/jszip.min.js');const z=await JSZip.loadAsync(buf),W='xl/workbook.xml',wb=await ztext(z,W);if(!wb)throw Error('Libro no válido');const rel=await zrels(z,W);
  const ss=qa(await ztext(z,'xl/sharedStrings.xml'),'si').map(s=>qa(s,'t').filter(t=>t.parentNode.localName!=='rPh').map(t=>t.textContent).join(''));
  const sheets=qa(wb,'sheet').map(s=>({n:s.getAttribute('name'),p:rpath(W,rel[s.getAttribute('r:id')]?.t||'')}));
  host.innerHTML='<div class="vtabs"></div><div class="vsheet scroll"></div>';const tabs=$('.vtabs',host),body=$('.vsheet',host);
  async function show(i){$$('button',tabs).forEach((b,j)=>b.classList.toggle('on',i===j));const sh=await ztext(z,sheets[i].p);if(!sh){body.textContent='Hoja vacía';return}
    const rows=qa(sh,'row'),grid=[];let mc=0,cut=rows.length>1000;
    for(const r of rows.slice(0,1000)){const row=[];for(const c of kids(r,'c')){const ci=colN(c.getAttribute('r')||'A1');if(ci>150)continue;const t=c.getAttribute('t'),v=q1(c,'v')?.textContent??'';
      row[ci]=t==='s'?ss[+v]??'':t==='inlineStr'?qa(c,'t').map(x=>x.textContent).join(''):t==='b'?(v==='1'?'VERDADERO':'FALSO'):v;mc=Math.max(mc,ci+1)}grid[+r.getAttribute('r')-1||grid.length]=row}
    const T=el('table');T.className='vtbl';const h=T.createTHead().insertRow();h.append(el('th'));for(let c=0;c<mc;c++)h.append(el('th',null,colL(c)));
    grid.forEach((row,ri)=>{if(!row)return;const R=T.insertRow();R.append(el('th',null,ri+1));for(let c=0;c<mc;c++)R.insertCell().textContent=row[c]??''});
    body.replaceChildren(T);if(cut)body.append(el('p','color:var(--muted);font-size:12px','Se muestran las primeras 1000 filas.'))}
  sheets.forEach((s,i)=>{const b=el('button',null,s.n);b.type='button';b.onclick=()=>show(i);tabs.append(b)});await show(0)}

// ---------- PPTX ----------
async function pptxView(host,buf){await loadScript('/vendor/jszip.min.js');const z=await JSZip.loadAsync(buf),PR='ppt/presentation.xml',pr=await ztext(z,PR);if(!pr)throw Error('Presentación no válida');const prel=await zrels(z,PR),sz=q1(pr,'sldSz'),CX=+sz.getAttribute('cx')||9144000,CY=+sz.getAttribute('cy')||6858000;
  const wrap=el('div');wrap.className='vslides';let k=0;
  for(const id of qa(pr,'sldId')){const sp=rpath(PR,prel[id.getAttribute('r:id')]?.t||''),sd=await ztext(z,sp);if(!sd)continue;const rel=await zrels(z,sp);
    const lr=Object.values(rel).find(r=>/slideLayout$/.test(r.y)),lp=lr&&rpath(sp,lr.t),ld=lp&&await ztext(z,lp),mr=ld&&Object.values(await zrels(z,lp)).find(r=>/slideMaster$/.test(r.y)),md=mr&&await ztext(z,rpath(lp,mr.t));
    const S=el('div',`aspect-ratio:${CX}/${CY}`);S.className='vslide';const bg=q1(q1(sd,'bg'),'srgbClr')?.getAttribute('val');if(HEXC.test(bg||''))S.style.background='#'+bg;
    const xf=(s,tp)=>{let x=q1(q1(s,'spPr'),'xfrm');if(x)return x;const ph=q1(s,'ph');if(!ph)return null;const idx=ph.getAttribute('idx'),ty=ph.getAttribute('type');
      for(const d of [ld,md])for(const o of qa(d,'sp')){const p=q1(o,'ph');if(p&&(idx&&p.getAttribute('idx')===idx||ty&&p.getAttribute('type')===ty)){x=q1(q1(o,'spPr'),'xfrm');if(x)return x}}return null};
    const place=(node,x)=>{const o=q1(x,'off'),e=q1(x,'ext');if(!o||!e)return false;const p=(a,b)=>(100*a/b)+'%';Object.assign(node.style,{position:'absolute',left:p(+o.getAttribute('x'),CX),top:p(+o.getAttribute('y'),CY),width:p(+e.getAttribute('cx'),CX),height:p(+e.getAttribute('cy'),CY),overflow:'hidden'});return true};
    const fs=pt=>(100*pt/(CX/12700))+'cqw';
    for(const s of qa(q1(sd,'spTree'),'sp')){const x=xf(s),box=el('div');if(!place(box,x))continue;const ph=q1(s,'ph')?.getAttribute('type'),big=ph==='title'||ph==='ctrTitle';
      for(const p of qa(q1(s,'txBody'),'p').filter(p=>p.parentNode.localName==='txBody')){const ppr=kids(p,'pPr')[0],a=ppr?.getAttribute('algn'),line=el('div',`text-align:${a==='ctr'?'center':a==='r'?'right':'left'};margin:0 0 .2em;line-height:1.15`);
        if(ppr&&(kids(ppr,'buChar')[0]||kids(ppr,'buAutoNum')[0]))line.append(el('span',null,'• '));
        for(const r of p.children){if(r.localName==='br')line.append(el('br'));if(r.localName!=='r')continue;const rp=kids(r,'rPr')[0],c=q1(q1(rp,'solidFill'),'srgbClr')?.getAttribute('val'),pt=(+rp?.getAttribute('sz')||(big?3200:1800))/100;
          line.append(el('span',`font-size:${fs(pt)};${rp?.getAttribute('b')==='1'||big?'font-weight:700;':''}${rp?.getAttribute('i')==='1'?'font-style:italic;':''}${HEXC.test(c||'')?`color:#${c};`:''}`,q1(r,'t')?.textContent||''))}
        if(!line.childNodes.length)line.append(el('br'));box.append(line)}S.append(box)}
    for(const pc of qa(q1(sd,'spTree'),'pic')){const b=q1(pc,'blip'),src=b&&await zimg(z,sp,rel[b.getAttribute('r:embed')]),box=el('div');if(!src||!place(box,q1(q1(pc,'spPr'),'xfrm')))continue;const i=el('img','width:100%;height:100%;object-fit:contain');i.src=src;box.append(i);S.append(box)}
    for(const g of qa(q1(sd,'spTree'),'graphicFrame')){const t=q1(g,'tbl'),box=el('div');if(!t||!place(box,q1(g,'xfrm')))continue;const T=el('table',`border-collapse:collapse;width:100%;font-size:${fs(12)}`);
      for(const tr of kids(t,'tr')){const R=T.insertRow();for(const tc of kids(tr,'tc')){const C=R.insertCell();C.style.cssText='border:1px solid #bbb;padding:2px 4px';C.textContent=qa(tc,'t').map(x=>x.textContent).join(' ')}}box.append(T);S.append(box)}
    const lab=el('div',null,'Diapositiva '+(++k));lab.className='vslab';wrap.append(lab,S)}
  host.replaceChildren(wrap)}

// ---------- punto de entrada ----------
const FALL={'.docx':docxView,'.xlsx':xlsxView,'.pptx':pptxView};
async function openViewer(host,e,p,cq,U){const base=U?'':encodeURIComponent(p)+cq,raw=U?.raw||'/api/preview?path='+base,conv=U?.conv||'/api/convert?path='+base;
  try{
    if(e==='.pdf')return await pdfView(host,await getBuf(raw));
    host.innerHTML='<p class="muted">Preparando vista previa…</p>';
    try{return await pdfView(host,await getBuf(conv))}catch{}
    if(!FALL[e])throw Error('Este formato necesita LibreOffice instalado en el servidor para verse aquí. Puedes descargarlo.');
    await FALL[e](host,await getBuf(raw))
  }catch(x){host.innerHTML=`<p class="muted">${esc(x.message||'No se pudo mostrar el archivo')}</p>`}}
