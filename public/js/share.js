// Página pública de un enlace: abre el visor de PDF y documentos de Office.
const vwHost=$('#vw');if(vwHost)openViewer(vwHost,vwHost.dataset.ext,null,'',{raw:vwHost.dataset.raw,conv:vwHost.dataset.conv});
