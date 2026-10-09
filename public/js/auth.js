let mode='login';
const setMode=m=>{mode=m;$$('.tab').forEach(t=>t.classList.toggle('on',t.dataset.m===m));$('#go').textContent=m==='login'?'Entrar':'Crear cuenta';$('#p').autocomplete=m==='login'?'current-password':'new-password';$('#p').placeholder=m==='login'?'':'Mínimo 8 caracteres';$('#e').textContent=''};
$$('.tab').forEach(t=>t.onclick=()=>setMode(t.dataset.m));
api('/api/session').then(s=>{if(!s.registration)$('#regTab').hidden=true});
$('#f').onsubmit=async e=>{e.preventDefault();$('#go').disabled=true;$('#e').textContent='';
try{await api('/api/'+mode,{username:$('#u').value.trim(),password:$('#p').value});location.href='/panel.html'}
catch(x){$('#e').textContent=x.message}$('#go').disabled=false};
