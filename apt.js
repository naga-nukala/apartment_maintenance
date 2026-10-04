// Shared apartment/session helpers. One active apartment per browser.
const APT_BASE='as_aptmaintenance_v1', APT_KEY=APT_BASE+'_apt', PASS_KEY=APT_BASE+'_passcode', ROLE_KEY=APT_BASE+'_role', NAME_KEY=APT_BASE+'_aptname';
(function(){ // a link like index.html?apt=sunrise-heights selects that apartment
  const q=new URLSearchParams(location.search).get('apt');
  if(q){const c=q.trim().toLowerCase();
    if(c&&c!==localStorage.getItem(APT_KEY)){localStorage.setItem(APT_KEY,c);[PASS_KEY,ROLE_KEY,NAME_KEY].forEach(k=>localStorage.removeItem(k))}}
})();
// existing installs (signed in, no code stored) belong to apartment 'default'
function curApt(){return localStorage.getItem(APT_KEY)||(localStorage.getItem(PASS_KEY)?'default':'')}
// cache keys: 'default' keeps its old names, other apartments get their own
function aptKey(b){const a=curApt();return(!a||a==='default')?b:b+'__'+a}
