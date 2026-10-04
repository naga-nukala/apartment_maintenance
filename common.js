const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ord=d=>d>3&&d<21?'th':({1:'st',2:'nd',3:'rd'}[d%10]||'th');
function fmtDate(iso){if(!iso)return '';const d=new Date(iso+'T00:00:00');if(isNaN(d))return '';return d.getDate()+ord(d.getDate())+' '+MON[d.getMonth()]+' '+d.getFullYear()}
function fmtMoney(n){const x=Number(n)||0;return (x<0?'-':'')+'\u20B9'+Math.abs(x).toLocaleString('en-IN')}
function todayISO(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function shrink(file){return new Promise((ok,no)=>{const r=new FileReader();r.onerror=no;r.onload=()=>{const im=new Image();im.onerror=no;im.onload=()=>{const k=Math.min(1,1000/Math.max(im.width,im.height)),cv=document.createElement('canvas');cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);ok(cv.toDataURL('image/jpeg',.6))};im.src=r.result};r.readAsDataURL(file)})}

function initList(c){
  const K=aptKey('as_aptmaintenance_v1_'+c.key),$=id=>document.getElementById(id);
  const configured=typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL.startsWith('http');
  let all=[],eid=null,timer=null,tt=null,imgs={},pass=localStorage.getItem(PASS_KEY)||'',role=configured?(localStorage.getItem(ROLE_KEY)||''):'';
  try{all=JSON.parse(localStorage.getItem(K))||[]}catch(e){}
  const money=c.fields.find(f=>f.type==='money'),cl=c.cl||['Open','Done'];
  const ro=()=>configured&&role!=='admin';
  const applyRole=()=>document.body.classList.toggle('viewer',ro());
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const persist=()=>{try{localStorage.setItem(K,JSON.stringify(all))}catch(e){toast('Storage full \u2013 remove old bill images')}};
  const toast=m=>{const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2200)};

  // sync pill + passcode gate
  const pill=document.createElement('div');pill.className='syncpill offline';pill.title='Tap to switch passcode';
  pill.innerHTML='<span class="dot"></span><span id="pt">Local only</span>';
  const gate=document.createElement('form');gate.className='row hidden';gate.style.cssText='margin-bottom:14px;flex-wrap:wrap';
  gate.innerHTML='<input type="text" id="ga" placeholder="Apartment code" autocomplete="off" autocapitalize="none" required style="min-width:140px"><input type="password" id="gp" placeholder="Passcode (admin edits, shared views)" autocomplete="off" required style="min-width:140px"><button type="submit" class="btn" style="flex:0 0 auto">Unlock</button>';gate.querySelector('#ga').value=curApt();
  const gmsg=document.createElement('div');gmsg.style.cssText='font-size:12px;color:var(--coral);margin:-8px 0 10px';
  let sm=$('summary');
  if(!sm){sm=document.createElement('div');sm.id='summary';sm.className='summary';$('f').closest('.section,.panel').before(sm)}
  sm.before(pill,gate,gmsg);
  const tag=()=>(localStorage.getItem(NAME_KEY)||curApt())+' \u00b7 '+(role==='admin'?'Admin':'View only');
  const st=(k,t,m)=>{pill.className='syncpill '+k;$('pt').textContent=t;gmsg.textContent=m||''};
  const signOut=()=>{pass='';role='';localStorage.removeItem(PASS_KEY);localStorage.removeItem(ROLE_KEY);applyRole();render()};

  async function rpc(fn,args){
    const h={'Content-Type':'application/json',apikey:SUPABASE_ANON_KEY};
    if(SUPABASE_ANON_KEY.startsWith('eyJ'))h.Authorization='Bearer '+SUPABASE_ANON_KEY;
    const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:h,body:JSON.stringify({p_apt:curApt(),...args})});
    const j=await r.json().catch(()=>null);
    if(!r.ok){const m=(j&&j.message)||'',e=new Error(m);e.bad=/invalid passcode/i.test(m);e.adm=/admin passcode required/i.test(m);throw e}
    return j;
  }
  const sig=a=>a.map(i=>i.id+':'+(i.u||0)).sort().join('|');
  function merge(a,b){const m=new Map();[...a,...b].forEach(i=>{const o=m.get(i.id);if(!o||(i.u||0)>(o.u||0))m.set(i.id,i)});return [...m.values()]}
  async function sync(){
    if(!configured){st('offline','Local only');return}
    if(!pass){gate.classList.remove('hidden');st('offline','Enter passcode to sync');return}
    st('syncing','Syncing\u2026');
    try{
      try{const rr=await rpc('get_apartment_role',{p_passcode:pass});role=rr.role;if(rr.name)localStorage.setItem(NAME_KEY,rr.name)}catch(e){if(e.bad)throw e;role=role||'viewer'}
      localStorage.setItem(ROLE_KEY,role);applyRole();
      let remote=await rpc('get_apartment_list',{p_passcode:pass,p_key:c.key});
      if(!Array.isArray(remote))remote=[];
      all=merge(all,remote);persist();render();
      if(role==='admin'&&sig(all)!==sig(remote))await rpc('save_apartment_list',{p_passcode:pass,p_key:c.key,p_data:all});
      gate.classList.add('hidden');st('synced','Synced \u00b7 '+tag());
    }catch(e){
      if(e.bad){signOut();gate.classList.remove('hidden');st('offline','Passcode needed','Incorrect passcode \u2014 try again')}
      else if(e.adm){role='viewer';applyRole();render();st('synced','Synced \u00b7 '+tag())}
      else st('offline','Offline \u2014 will retry');
    }
  }
  const commit=m=>{if(ro())return;persist();render();toast(m);clearTimeout(timer);timer=setTimeout(sync,600)};
  gate.onsubmit=e=>{e.preventDefault();const a=$('ga').value.trim().toLowerCase(),p=$('gp').value.trim();localStorage.setItem(PASS_KEY,p);$('gp').value='';if(a&&a!==curApt()){localStorage.setItem(APT_KEY,a);[ROLE_KEY,NAME_KEY].forEach(k=>localStorage.removeItem(k));location.reload();return}pass=p;sync()};
  pill.onclick=()=>{if(configured&&confirm('Sign out / switch passcode?')){signOut();gate.classList.remove('hidden');st('offline','Enter passcode','Admin passcode to edit, shared passcode to view')}};
  addEventListener('online',sync);

  // image lightbox
  const lb=document.createElement('div');lb.id='lb';lb.className='hidden';lb.innerHTML='<img alt="">';lb.onclick=()=>lb.classList.add('hidden');document.body.appendChild(lb);

  // form
  $('fields').innerHTML=c.fields.map(f=>{
    const r=f.req?' required':'';
    const inp=f.type==='textarea'?`<textarea id="f_${f.id}"${r}></textarea>`
      :f.type==='select'?`<select id="f_${f.id}">${f.opts.map(o=>`<option>${o}</option>`).join('')}</select>`
      :f.type==='money'?`<input id="f_${f.id}" type="number" inputmode="decimal" min="0" step="any">`
      :f.type==='image'?`<input id="f_${f.id}" type="file" accept="image/*"><div class="hint" id="fs_${f.id}"></div>`
      :`<input id="f_${f.id}" type="${f.type||'text'}"${r}>`;
    return `<div><label class="small">${f.label}${f.req?' *':''}</label>${inp}</div>`}).join('');
  c.fields.filter(f=>f.type==='image').forEach(f=>{$('f_'+f.id).onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{imgs[f.id]=await shrink(file);$('fs_'+f.id).textContent='Attached \u2713 ('+Math.round(imgs[f.id].length/1024)+' KB)'}
    catch(x){imgs[f.id]='';$('fs_'+f.id).textContent='Could not read that image'}}});
  const imgNote=()=>c.fields.filter(f=>f.type==='image').forEach(f=>{$('fs_'+f.id).textContent=imgs[f.id]?'Attached \u2713 (choose a file to replace)':''});
  function reset(){eid=null;imgs={};$('f').reset();imgNote();$('saveBtn').textContent='Add';$('cancelBtn').classList.add('hidden');$('addSection').open=false}
  $('f').onsubmit=e=>{e.preventDefault();
    const o={};c.fields.forEach(f=>o[f.id]=f.type==='image'?(imgs[f.id]||''):$('f_'+f.id).value.trim());
    if(eid)Object.assign(all.find(x=>x.id===eid),o,{u:Date.now()});
    else all.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),done:false,u:Date.now(),...o});
    const m=eid?'Updated':'Added';reset();commit(m)};
  $('cancelBtn').onclick=reset;
  $('q').oninput=render;

  // import owner names from a .txt file
  if(c.upload){
    const box=document.createElement('div');box.id='importBox';
    box.innerHTML='<label class="small">Import from text file (.txt)</label><input type="file" id="impFile" accept=".txt,text/plain"><div class="hint">One per line: <b>Flat, Owner name</b> (or just the name). Existing entries are skipped.</div>';
    $('q').before(box);
    $('impFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
      r.onload=()=>{const have=new Set(all.filter(i=>!i.del).map(i=>((i[c.upload.first]||'')+'|'+(i[c.upload.rest]||'')).toLowerCase()));let n=0;
        String(r.result).split(/\r?\n/).map(l=>l.trim()).filter(Boolean).forEach(l=>{
          const p=l.split(/\s*[,\t|]\s*/),first=p.length>1?p[0]:'',rest=p.length>1?p.slice(1).join(' '):p[0],k=(first+'|'+rest).toLowerCase();
          if(have.has(k))return;have.add(k);n++;
          all.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),done:false,u:Date.now(),[c.upload.first]:first,[c.upload.rest]:rest})});
        e.target.value='';commit(n?'Imported '+n+' names':'Nothing new to import')};
      r.readAsText(f)};
  }

  $('list').onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;
    const id=b.dataset.id,i=all.find(x=>x.id===id),a=b.dataset.a;
    if(a==='img'){lb.firstChild.src=b.src;lb.classList.remove('hidden');return}
    if(ro()){render();return}
    if(a==='del'){if(confirm('Delete this entry?')){all=all.map(x=>x.id===id?{id,del:true,u:Date.now()}:x);commit('Deleted')}}
    else if(a==='edit'){eid=id;imgs={};c.fields.forEach(f=>{if(f.type==='image')imgs[f.id]=i[f.id]||'';else $('f_'+f.id).value=i[f.id]||''});imgNote();$('saveBtn').textContent='Save';$('cancelBtn').classList.remove('hidden');$('addSection').open=true;window.scrollTo(0,0)}
    else if(a==='tick'){i.done=b.checked;i.u=Date.now();if(c.stamp)i[c.stamp]=b.checked?todayISO():'';commit(b.checked?'Marked '+cl[1].toLowerCase():'Marked '+cl[0].toLowerCase())}};

  const val=(f,v)=>f.type==='date'?fmtDate(v):f.type==='money'?fmtMoney(v):f.type==='tel'?`<a href="tel:${esc(v)}">${esc(v)}</a>`:f.type==='image'?`<img class="thumb" src="${esc(v)}" data-a="img" alt="">`:esc(v);
  function render(){
    applyRole();
    const L=all.filter(i=>!i.del),q=$('q').value.toLowerCase(),g=c.group,T=c.fields[0].id;
    let cs;
    if(g){const cur=L.filter(i=>i[g.id]===g.order[0]);cs=[[g.order[0],cur.length?esc(cur[0][T]):'\u2014','received'],[g.order[1],L.filter(i=>i[g.id]===g.order[1]).length,'opening']]}
    else if(c.check){const d=L.filter(i=>i.done).length;cs=[[cl[0],L.length-d,'paid'],[cl[1],d,'received']]}
    else{cs=[['Entries',L.length,'opening']];if(money)cs.push(['Total '+money.label.replace(/ \(.*\)/,''),fmtMoney(L.reduce((s,i)=>s+(Number(i[money.id])||0),0)),'received'])}
    sm.innerHTML=cs.map(([l,v,k])=>`<div class="card ${k}${cs.length===1?' wide':''}"><div class="label">${l}</div><div class="value">${v}</div></div>`).join('');
    const sf=c.fields.filter(f=>f.type!=='image');
    const v=L.filter(i=>!q||sf.map(f=>i[f.id]).join(' ').toLowerCase().includes(q)).sort((a,b)=>(b.u||0)-(a.u||0));
    if(c.check)v.sort((a,b)=>a.done-b.done);
    if(g){const so=c.sort,gi=i=>{const x=g.order.indexOf(i[g.id]);return x<0?99:x};
      v.sort((a,b)=>gi(a)-gi(b)||(so?String(b[so]||'').localeCompare(String(a[so]||''))*((g.asc||[]).includes(a[g.id])?-1:1):0))}
    const rest=c.fields.slice(1).filter(f=>f!==money&&f.id!==c.badge&&!(g&&f.id===g.id));
    let last=null;
    $('list').innerHTML=v.length?v.map(i=>{
      const bf=c.badge&&i[c.badge],gh=g&&i[g.id]!==last?(last=i[g.id],`<li class="ghead">${esc(last)}</li>`):'';
      return gh+`<li class="item${i.done?' done':''}">${c.check?`<input type="checkbox" data-a="tick" data-id="${i.id}"${i.done?' checked':''}${ro()?' disabled':''}>`:''}<div class="info"><div class="title">${esc(i[T])}</div>${bf?`<div class="sub"><span class="badge ${bf==='High'?'unpaid':'paid'}">${esc(bf)}</span></div>`:''}${rest.filter(f=>i[f.id]).map(f=>`<div class="sub">${f.label}: ${val(f,i[f.id])}</div>`).join('')}${c.stamp&&i[c.stamp]?`<div class="sub">${cl[1]} on ${fmtDate(i[c.stamp])}</div>`:''}</div>${money&&i[money.id]!==''&&i[money.id]!=null?`<div class="amt">${fmtMoney(i[money.id])}</div>`:''}<div class="actions"><button class="icon-btn" data-a="edit" data-id="${i.id}" title="Edit">\u270E</button><button class="icon-btn danger" data-a="del" data-id="${i.id}" title="Delete">\u2715</button></div></li>`}).join(''):'<div class="empty">Nothing here yet.</div>';
  }
  applyRole();render();sync();
}
