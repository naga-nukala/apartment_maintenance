
const SUPABASE_URL = 'https://oqwmpxcxkxucapxgrgas.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd21weGN4a3h1Y2FweGdyZ2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Mzc4NjEsImV4cCI6MjEwNjMxMzg2MX0.ttKexMlzPuyzcfQgdjWVOQpIEcTI3dzAu8dWrjd4x1w';

const PASS_KEY='as_aptmaintenance_v1_passcode'; // shared with the tracker page
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ord=d=>d>3&&d<21?'th':({1:'st',2:'nd',3:'rd'}[d%10]||'th');
function fmtDate(iso){if(!iso)return '';const d=new Date(iso+'T00:00:00');if(isNaN(d))return '';return d.getDate()+ord(d.getDate())+' '+MON[d.getMonth()]+' '+d.getFullYear()}
function fmtMoney(n){const x=Number(n)||0;return (x<0?'-':'')+'\u20B9'+Math.abs(x).toLocaleString('en-IN')}

function initList(c){
  const K='as_aptmaintenance_v1_'+c.key,$=id=>document.getElementById(id);
  let all=[],eid=null,timer=null,tt=null,pass=localStorage.getItem(PASS_KEY)||'';
  try{all=JSON.parse(localStorage.getItem(K))||[]}catch(e){}
  const money=c.fields.find(f=>f.type==='money');
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const persist=()=>{try{localStorage.setItem(K,JSON.stringify(all))}catch(e){}};
  const toast=m=>{const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),1800)};

  // sync pill + passcode gate (same look as the tracker)
  const pill=document.createElement('div');pill.className='syncpill offline';
  pill.innerHTML='<span class="dot"></span><span id="pt">Local only</span>';
  const gate=document.createElement('form');gate.className='row hidden';gate.style.marginBottom='14px';
  gate.innerHTML='<input type="password" id="gp" placeholder="Shared passcode" autocomplete="off" required><button type="submit" class="btn" style="flex:0 0 auto">Unlock sync</button>';
  const gmsg=document.createElement('div');gmsg.style.cssText='font-size:12px;color:var(--coral);margin:-8px 0 10px';
  $('summary').before(pill,gate,gmsg);
  const st=(k,t,m)=>{pill.className='syncpill '+k;$('pt').textContent=t;gmsg.textContent=m||''};

  async function rpc(fn,args){
    const h={'Content-Type':'application/json',apikey:SUPABASE_ANON_KEY};
    if(SUPABASE_ANON_KEY.startsWith('eyJ'))h.Authorization='Bearer '+SUPABASE_ANON_KEY;
    const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:h,body:JSON.stringify(args)});
    const j=await r.json().catch(()=>null);
    if(!r.ok){const m=(j&&j.message)||'',e=new Error(m);e.bad=/invalid passcode/i.test(m);throw e}
    return j;
  }
  const sig=a=>a.map(i=>i.id+':'+(i.u||0)).sort().join('|');
  function merge(a,b){const m=new Map();[...a,...b].forEach(i=>{const o=m.get(i.id);if(!o||(i.u||0)>(o.u||0))m.set(i.id,i)});return [...m.values()]}
  async function sync(){
    if(typeof SUPABASE_URL==='undefined'||!SUPABASE_URL.startsWith('http')){st('offline','Local only');return}
    if(!pass){gate.classList.remove('hidden');st('offline','Enter passcode to sync');return}
    st('syncing','Syncing\u2026');
    try{
      let remote=await rpc('get_apartment_list',{p_passcode:pass,p_key:c.key});
      if(!Array.isArray(remote))remote=[];
      all=merge(all,remote);persist();render();
      if(sig(all)!==sig(remote))await rpc('save_apartment_list',{p_passcode:pass,p_key:c.key,p_data:all});
      gate.classList.add('hidden');st('synced','Synced');
    }catch(e){
      if(e.bad){pass='';localStorage.removeItem(PASS_KEY);gate.classList.remove('hidden');st('offline','Passcode needed','Incorrect passcode \u2014 try again')}
      else st('offline','Offline \u2014 will retry');
    }
  }
  const commit=m=>{persist();render();toast(m);clearTimeout(timer);timer=setTimeout(sync,600)};
  gate.onsubmit=e=>{e.preventDefault();pass=$('gp').value.trim();localStorage.setItem(PASS_KEY,pass);$('gp').value='';sync()};
  addEventListener('online',sync);

  // form
  $('fields').innerHTML=c.fields.map(f=>{
    const r=f.req?' required':'';
    const inp=f.type==='textarea'?`<textarea id="f_${f.id}"${r}></textarea>`
      :f.type==='select'?`<select id="f_${f.id}">${f.opts.map(o=>`<option>${o}</option>`).join('')}</select>`
      :f.type==='money'?`<input id="f_${f.id}" type="number" inputmode="decimal" min="0" step="any">`
      :`<input id="f_${f.id}" type="${f.type||'text'}"${r}>`;
    return `<div><label class="small">${f.label}${f.req?' *':''}</label>${inp}</div>`}).join('');
  function reset(){eid=null;$('f').reset();$('saveBtn').textContent='Add';$('cancelBtn').classList.add('hidden')}
  $('f').onsubmit=e=>{e.preventDefault();
    const o={};c.fields.forEach(f=>o[f.id]=$('f_'+f.id).value.trim());
    if(eid)Object.assign(all.find(x=>x.id===eid),o,{u:Date.now()});
    else all.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),done:false,u:Date.now(),...o});
    const m=eid?'Updated':'Added';reset();commit(m)};
  $('cancelBtn').onclick=reset;
  $('q').oninput=render;
  $('list').onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;
    const id=b.dataset.id,i=all.find(x=>x.id===id),a=b.dataset.a;
    if(a==='del'){if(confirm('Delete this entry?')){all=all.map(x=>x.id===id?{id,del:true,u:Date.now()}:x);commit('Deleted')}}
    else if(a==='edit'){eid=id;c.fields.forEach(f=>$('f_'+f.id).value=i[f.id]||'');$('saveBtn').textContent='Save';$('cancelBtn').classList.remove('hidden');window.scrollTo(0,0)}
    else if(a==='tick'){i.done=b.checked;i.u=Date.now();commit(b.checked?'Marked done':'Marked open')}};

  const val=(f,v)=>f.type==='date'?fmtDate(v):f.type==='money'?fmtMoney(v):f.type==='tel'?`<a href="tel:${esc(v)}">${esc(v)}</a>`:esc(v);
  function render(){
    const L=all.filter(i=>!i.del),q=$('q').value.toLowerCase();
    let cs;
    if(c.check){const d=L.filter(i=>i.done).length;cs=[['Open',L.length-d,'paid'],['Done',d,'received']]}
    else{cs=[['Entries',L.length,'opening']];if(money)cs.push(['Total '+money.label.replace(/ \(.*\)/,''),fmtMoney(L.reduce((s,i)=>s+(Number(i[money.id])||0),0)),'received'])}
    $('summary').innerHTML=cs.map(([l,v,k])=>`<div class="card ${k}${cs.length===1?' wide':''}"><div class="label">${l}</div><div class="value">${v}</div></div>`).join('');
    const v=L.filter(i=>!q||JSON.stringify(i).toLowerCase().includes(q)).sort((a,b)=>(b.u||0)-(a.u||0));
    if(c.check)v.sort((a,b)=>a.done-b.done);
    const rest=c.fields.slice(1).filter(f=>f!==money&&f.id!==c.badge);
    $('list').innerHTML=v.length?v.map(i=>{
      const bf=c.badge&&i[c.badge];
      return `<li class="item${i.done?' done':''}">${c.check?`<input type="checkbox" data-a="tick" data-id="${i.id}"${i.done?' checked':''}>`:''}<div class="info"><div class="title">${esc(i[c.fields[0].id])}</div>${bf?`<div class="sub"><span class="badge ${bf==='High'?'unpaid':'paid'}">${esc(bf)}</span></div>`:''}${rest.filter(f=>i[f.id]).map(f=>`<div class="sub">${f.label}: ${val(f,i[f.id])}</div>`).join('')}</div>${money&&i[money.id]!==''&&i[money.id]!=null?`<div class="amt">${fmtMoney(i[money.id])}</div>`:''}<div class="actions"><button class="icon-btn" data-a="edit" data-id="${i.id}" title="Edit">\u270E</button><button class="icon-btn danger" data-a="del" data-id="${i.id}" title="Delete">\u2715</button></div></li>`}).join(''):'<div class="empty">Nothing here yet.</div>';
  }
  render();sync();
}
