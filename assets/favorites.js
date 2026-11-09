/* 손안의도구 즐겨찾기(마이 툴박스) + 구글 로그인 + 저장한 날짜 동기화
 * - 로그인 없이도 즐겨찾기는 브라우저(LocalStorage)에 바로 저장된다.
 * - 로그인하면 Firebase Auth(구글) + Firestore users/{uid} 문서에 같은 목록을 저장해 기기 간에 맞춘다.
 * - 메인 화면에서는 카드의 별과 '내 툴박스'를, 각 도구 페이지에서는 제목 옆 별과 헤더 검색·로그인을 붙인다.
 * - Firebase SDK는 로그인 창을 열거나, 이전에 로그인한 적이 있을 때만 불러온다.
 * - 새 도구를 만들면 아래 TOOLS 목록에 주소를 추가해야 별이 동작한다.
 */
(function(){
'use strict';
var KEY='sonandogu-favs-v1', DKEY='sonandogu-date-saved', HINT='sonandogu-authed', TIPKEY='sonandogu-fav-tip', V='10.12.2';
var BASE='https://www.gstatic.com/firebasejs/'+V+'/';
var MAX=30, DMAX=12;
var TOOLS=['/percent/','/dutch/','/wage/','/salary/','/severance/','/leave/','/date/','/age/','/charcount/','/receipt/','/traditional/yut/','/party/team/','/party/roulette/','/party/ladder/','/party/lots/','/party/manito/'];
var $=function(id){return document.getElementById(id);};
function el(tag,cls,text){var e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e;}
function ls(k,v){try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v);}catch(e){} return null;}

var cards=[].slice.call(document.querySelectorAll('.cat a.t'));
var isHome=cards.length>0;
var valid={}; TOOLS.forEach(function(h){valid[h]=1;}); cards.forEach(function(c){valid[c.getAttribute('href')]=1;});
var byHref={}; cards.forEach(function(c){byHref[c.getAttribute('href')]=c;});
var here=(function(){var p=location.pathname.replace(/index\.html$/,''); return /\/$/.test(p)?p:p+'/';})();

function clean(a){var seen={},o=[]; (a||[]).forEach(function(h){ if(typeof h==='string'&&valid[h]&&!seen[h]){seen[h]=1; o.push(h);} }); return o.slice(0,MAX);}
function union(a,b){return clean((a||[]).concat(b||[]));}
function same(a,b){return a.length===b.length&&a.every(function(x,i){return x===b[i];});}
function loadLocal(){try{return clean(JSON.parse(ls(KEY)||'[]'));}catch(e){return [];}}

/* 저장한 날짜(날짜 계산기) */
function cleanDates(a){
  var o=[]; (Array.isArray(a)?a:[]).forEach(function(x){
    if(!x||typeof x!=='object') return; if(x.t!=='dday'&&x.t!=='anniv') return;
    if(typeof x.d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x.d)) return;
    var it={t:x.t,d:x.d,n:String(x.n==null?'':x.n).slice(0,40)}; if(x.t==='anniv') it.one=!!x.one;
    if(!o.some(function(y){return y.t===it.t&&y.d===it.d;})) o.push(it);
  });
  return o.slice(0,DMAX);
}
function loadDates(){try{return cleanDates(JSON.parse(ls(DKEY)||'[]'));}catch(e){return [];}}
function unionDates(a,b){return cleanDates((a||[]).concat(b||[]));}
function sameDates(a,b){return JSON.stringify(a)===JSON.stringify(b);}

ls('sonandogu-recent',null); /* 예전 '최근 쓴 도구' 기록은 더 쓰지 않으므로 지운다 */

var favs=loadLocal();
var subs=[];
var user=null, wasUser=false, pulled=false, touched=false, loginFlag=false, editing=false;
var fb=null, booted=false, bootP=null;
var wt=null;

function persistLocal(){ls(KEY,JSON.stringify(favs));}
function emit(){render(); subs.forEach(function(f){try{f();}catch(e){}});}
function setFavs(next){favs=clean(next); persistLocal(); emit();}
function labelOf(h){var s=byHref[h]&&byHref[h].querySelector('strong'); return s?s.textContent:(h===here&&document.querySelector('h1')?document.querySelector('h1').firstChild.textContent.trim():h);}
function datesChanged(){try{window.dispatchEvent(new CustomEvent('sonandogu-dates-updated'));}catch(e){}}

/* ---------- 클라우드 ---------- */
function pushCloud(){
  clearTimeout(wt);
  wt=setTimeout(function(){
    if(!user||!pulled||!fb) return;
    var ref=fb.fs.doc(fb.db,'users',user.uid);
    fb.fs.setDoc(ref,{favs:favs.slice(),dates:JSON.stringify(loadDates()),updated:fb.fs.serverTimestamp()},{merge:true}).catch(function(){
      note('클라우드 저장이 늦어지고 있어요. 이 기기에는 저장됐어요.');
    });
  },500);
}
async function pull(u){
  var ref=fb.fs.doc(fb.db,'users',u.uid), cloud=[], cloudD=[], exists=false;
  try{
    var snap=await fb.fs.getDoc(ref); exists=snap.exists();
    if(exists){
      var d=snap.data()||{}; cloud=clean(Array.isArray(d.favs)?d.favs:[]);
      try{cloudD=cleanDates(JSON.parse(d.dates||'[]'));}catch(e){}
    }
  }catch(e){ note('즐겨찾기를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.'); return; }
  if(user!==u) return;
  var merge=loginFlag||touched||!exists;
  var next=merge?union(cloud,favs):cloud;
  var localD=loadDates(), nextD=merge?unionDates(cloudD,localD):cloudD;
  pulled=true; loginFlag=false;
  setFavs(next);
  if(!sameDates(nextD,localD)){ ls(DKEY,JSON.stringify(nextD)); datesChanged(); }
  if(merge&&(!same(next,cloud)||!sameDates(nextD,cloudD))) pushCloud();
}
function boot(){
  if(bootP) return bootP;
  var cfg=window.SONANDOGU_FIREBASE||{};
  if(!cfg.apiKey||/^PASTE/.test(cfg.apiKey)) return Promise.reject(new Error('nocfg'));
  bootP=Promise.all([import(BASE+'firebase-app.js'),import(BASE+'firebase-auth.js'),import(BASE+'firebase-firestore.js')]).then(function(m){
    var appM=m[0], authM=m[1], fs=m[2];
    var app=appM.getApps().length?appM.getApp():appM.initializeApp(cfg);
    var auth=authM.getAuth(app), db=fs.getFirestore(app);
    fb={app:app,auth:auth,authM:authM,fs:fs,db:db}; booted=true;
    authM.onAuthStateChanged(auth,onAuth);
  }).catch(function(e){bootP=null; throw e;});
  return bootP;
}
function onAuth(u){
  user=u||null; pulled=false;
  if(user){ wasUser=true; ls(HINT,'1'); drawAcct(); closeModal(); pull(user); }
  else{
    ls(HINT,null); drawAcct(); closePanel();
    if(wasUser){ wasUser=false; touched=false; favs=[]; persistLocal(); ls(DKEY,null); emit(); datesChanged(); }
  }
}

/* ---------- 로그인 · 로그아웃 · 계정 삭제 ---------- */
var inApp=/KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|; wv\)/i.test(navigator.userAgent||'');
function errMsg(e){
  var c=(e&&e.code)||'';
  if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request') return '';
  if(c==='auth/popup-blocked') return '팝업이 막혔어요. 팝업을 허용한 뒤 다시 눌러 주세요.';
  if(c==='auth/unauthorized-domain') return '이 주소는 아직 로그인 허용 도메인에 등록되지 않았어요. (관리자: Firebase 승인된 도메인 확인)';
  if(c==='auth/operation-not-allowed') return '구글 로그인이 아직 켜져 있지 않아요. (관리자: Firebase 로그인 방법 확인)';
  if(c==='auth/network-request-failed') return '네트워크 연결을 확인해 주세요.';
  if(e&&e.message==='nocfg') return '로그인 설정이 아직 준비되지 않았어요.';
  return '로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
}
async function login(btn,msg){
  msg.className='fmsg'; msg.textContent='';
  if(inApp){ msg.textContent='카카오톡·인스타그램 같은 앱 안의 브라우저에서는 구글 로그인이 막혀요. 크롬이나 사파리에서 열어 주세요.'; return; }
  if(!booted){
    msg.className='fmsg ok'; msg.textContent='로그인 창을 준비하고 있어요. 잠시 뒤 한 번 더 눌러 주세요.';
    boot().then(function(){msg.textContent='준비됐어요. 버튼을 눌러 주세요.';}).catch(function(e){msg.className='fmsg'; msg.textContent=errMsg(e);});
    return;
  }
  btn.disabled=true; loginFlag=true;
  try{
    var p=new fb.authM.GoogleAuthProvider(); p.setCustomParameters({prompt:'select_account'});
    await fb.authM.signInWithPopup(fb.auth,p);
  }catch(e){ loginFlag=false; var t=errMsg(e); msg.className='fmsg'; msg.textContent=t; }
  btn.disabled=false;
}
function logout(){ if(fb&&fb.auth) fb.authM.signOut(fb.auth).catch(function(){}); }
async function deleteAccount(msg){
  if(!user||!fb) return false;
  var u=fb.auth.currentUser||user;
  try{ await fb.fs.deleteDoc(fb.fs.doc(fb.db,'users',u.uid)); }
  catch(e){
    if(e&&e.code==='permission-denied'){ msg.textContent='삭제 권한이 아직 설정되지 않았어요. (관리자: Firestore 규칙에 삭제 허용 추가)'; return false; }
    msg.textContent='삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.'; return false;
  }
  try{ await fb.authM.deleteUser(u); }
  catch(e){
    if(e&&e.code==='auth/requires-recent-login'){
      try{
        var p=new fb.authM.GoogleAuthProvider(); p.setCustomParameters({prompt:'select_account'});
        await fb.authM.reauthenticateWithPopup(u,p); await fb.authM.deleteUser(u);
      }catch(e2){ msg.textContent=errMsg(e2)||'본인 확인이 끝나지 않아 계정은 그대로 남아 있어요. 다시 시도해 주세요.'; return false; }
    }else{ msg.textContent='계정을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요.'; return false; }
  }
  return true;
}

/* ---------- 즐겨찾기 토글 ---------- */
function toggle(h){
  var i=favs.indexOf(h), adding=i<0;
  if(adding){ if(favs.length>=MAX) return; favs=favs.concat([h]); } else favs=favs.filter(function(x){return x!==h;});
  if(!pulled) touched=true;
  persistLocal(); emit(); if(user) pushCloud();
  if(adding&&!user&&!ls(TIPKEY)){ ls(TIPKEY,'1'); showTip(); }
}

/* ---------- 별 달기 (메인 카드 / 도구 페이지 제목 옆) ---------- */
var STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.6l6.1-.8z"/></svg>';
var stars={}, pageStar=null;
function bindStar(s,h){
  var fire=function(e){ e.preventDefault(); e.stopPropagation(); toggle(h); };
  s.addEventListener('click',fire);
  s.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '||e.key==='Spacebar') fire(e); });
}
cards.forEach(function(c){
  var h=c.getAttribute('href'), s=el('span','fav'); s.setAttribute('role','button'); s.setAttribute('tabindex','0'); s.innerHTML=STAR;
  var go=c.querySelector('.go'); if(go) c.insertBefore(s,go); else c.appendChild(s);
  bindStar(s,h); stars[h]=s;
});
if(!isHome&&valid[here]){
  var h1=document.querySelector('h1');
  if(h1){ pageStar=el('span','fav pg'); pageStar.setAttribute('role','button'); pageStar.setAttribute('tabindex','0'); pageStar.innerHTML=STAR; h1.appendChild(document.createTextNode(' ')); h1.appendChild(pageStar); bindStar(pageStar,here); }
}
function paintStars(){
  cards.forEach(function(c){
    var h=c.getAttribute('href'), s=stars[h], on=favs.indexOf(h)>=0;
    s.setAttribute('aria-pressed',on?'true':'false');
    s.setAttribute('aria-label',labelOf(h)+(on?' 고정 해제':' 첫 화면에 고정'));
    s.setAttribute('title',on?'고정 해제':'첫 화면에 고정');
  });
  if(pageStar){
    var on2=favs.indexOf(here)>=0;
    pageStar.setAttribute('aria-pressed',on2?'true':'false');
    pageStar.setAttribute('aria-label',on2?'내 툴박스에서 빼기':'내 툴박스에 담기');
    pageStar.setAttribute('title',on2?'내 툴박스에서 빼기':'내 툴박스에 담기');
  }
}

/* ---------- 내 툴박스 (메인) ---------- */
var box=$('rgrid'), sub=$('fsub'), editBtn=$('fedit');
function move(i,d){var j=i+d; if(j<0||j>=favs.length) return; var a=favs.slice(), t=a[i]; a[i]=a[j]; a[j]=t; if(!pulled) touched=true; favs=a; persistLocal(); emit(); if(user) pushCloud();}
function drawChips(){
  if(!box) return; box.textContent='';
  if(!favs.length){ box.appendChild(el('p','fempty','도구 카드의 별을 누르면 여기에 고정돼요.')); return; }
  favs.forEach(function(h,i){
    var c=byHref[h]; if(!c) return; var ic=c.querySelector('.ic');
    var w=el('div','fchip'+(editing?' editing':'')), a=el('a'); a.href=h;
    var i1=el('span','ic'); i1.innerHTML=ic.innerHTML; i1.style.backgroundImage=getComputedStyle(ic).backgroundImage; a.appendChild(i1); a.appendChild(el('span',null,labelOf(h)));
    w.appendChild(a);
    if(editing){
      var L=el('button','fc','‹'), R=el('button','fc','›');
      [L,R].forEach(function(b){b.type='button';});
      L.setAttribute('aria-label',labelOf(h)+' 앞으로'); R.setAttribute('aria-label',labelOf(h)+' 뒤로');
      L.disabled=i===0; R.disabled=i===favs.length-1;
      L.onclick=function(){move(i,-1);}; R.onclick=function(){move(i,1);};
      w.appendChild(L); w.appendChild(R);
    }
    var S=el('button','fc st'); S.type='button'; S.innerHTML=STAR; S.setAttribute('aria-label',labelOf(h)+' 고정 해제'); S.setAttribute('title','고정 해제');
    S.onclick=function(){toggle(h);};
    w.appendChild(S);
    box.appendChild(w);
  });
}
function drawSub(){
  if(!sub) return; sub.textContent='';
  if(user){ sub.textContent='내가 고정한 도구 · 기기가 바뀌어도 그대로예요'; return; }
  sub.appendChild(document.createTextNode('로그인하면 기기가 바뀌어도 내 즐겨찾기가 유지돼요!'));
  var b=el('button','flink','로그인'); b.type='button'; b.onclick=function(){openModal();}; sub.appendChild(b);
}
function render(){
  if(!favs.length) editing=false;
  paintStars(); drawChips(); drawSub();
  if(editBtn){ editBtn.hidden=favs.length<2; editBtn.textContent=editing?'완료':'순서 편집'; editBtn.setAttribute('aria-pressed',editing?'true':'false'); }
}
if(editBtn) editBtn.onclick=function(){editing=!editing; render();};

/* ---------- 헤더: 검색(도구 페이지) · 로그인/마이 버튼 · 마이페이지 패널 ---------- */
if(!isHome&&!$('q')){
  var inn=document.querySelector('.top .in'), brand=inn&&inn.querySelector('.brand');
  if(inn&&brand){
    var lab=el('label','hsrch');
    lab.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
    var hq=el('input'); hq.type='search'; hq.id='hq'; hq.placeholder='도구 검색'; hq.autocomplete='off'; hq.setAttribute('aria-label','도구 검색 (예: 할인, 정산, 사다리)');
    var kb=el('kbd','','/'); kb.setAttribute('aria-hidden','true');
    lab.appendChild(hq); lab.appendChild(kb); brand.parentNode.insertBefore(lab,brand.nextSibling);
    hq.addEventListener('keydown',function(e){ if(e.key==='Enter'){ var v=hq.value.trim(); location.href='/'+(v?'?q='+encodeURIComponent(v):''); } });
    document.addEventListener('keydown',function(e){
      if(e.key==='/'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'')&&!(document.activeElement&&document.activeElement.isContentEditable)){ e.preventDefault(); hq.focus(); }
    });
  }
}
var nav=document.querySelector('.top nav'), acct=el('button','acct','로그인'); acct.type='button';
if(nav) nav.appendChild(acct);
var panel=el('div','fpanel'); panel.hidden=true; panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','마이페이지');
document.body.appendChild(panel);
function drawAcct(){
  acct.textContent='';
  if(user){
    var n=(user.displayName||user.email||'나').trim(), av=el('span','av',n.charAt(0).toUpperCase());
    acct.appendChild(av); acct.appendChild(document.createTextNode('마이')); acct.setAttribute('aria-expanded','false');
  }else{ acct.appendChild(document.createTextNode('로그인')); acct.removeAttribute('aria-expanded'); }
}
var delArmed=null;
function drawPanel(){
  panel.textContent='';
  panel.appendChild(el('b',null,user.displayName||'내 계정'));
  if(user.email) panel.appendChild(el('span','em',user.email));
  panel.appendChild(el('p',null,'즐겨찾기 '+favs.length+'개와 저장한 날짜가 이 계정에 저장돼 있어요. 다른 기기에서 같은 계정으로 로그인하면 그대로 이어져요.'));
  var o=el('button',null,'로그아웃'); o.type='button'; o.onclick=function(){closePanel(); logout();}; panel.appendChild(o);
  var dm=el('p','fdmsg'); dm.setAttribute('aria-live','polite');
  var d=el('button','fdel','계정과 저장된 데이터 삭제'); d.type='button';
  d.onclick=async function(){
    if(!delArmed){ d.textContent='정말 삭제할까요? 한 번 더 누르면 지워져요'; d.classList.add('arm'); delArmed=setTimeout(function(){delArmed=null; d.textContent='계정과 저장된 데이터 삭제'; d.classList.remove('arm');},6000); return; }
    clearTimeout(delArmed); delArmed=null; d.disabled=true; dm.className='fdmsg'; dm.textContent='삭제하고 있어요...';
    var ok=await deleteAccount(dm);
    if(ok){ closePanel(); note('계정과 저장된 데이터를 모두 지웠어요.'); }
    else{ d.disabled=false; d.textContent='계정과 저장된 데이터 삭제'; d.classList.remove('arm'); dm.className='fdmsg err'; }
  };
  panel.appendChild(d); panel.appendChild(dm);
}
function openPanel(){drawPanel(); panel.hidden=false; acct.setAttribute('aria-expanded','true');}
function closePanel(){panel.hidden=true; if(delArmed){clearTimeout(delArmed); delArmed=null;} if(user) acct.setAttribute('aria-expanded','false');}
acct.onclick=function(){ if(user){ panel.hidden?openPanel():closePanel(); } else openModal(); };
document.addEventListener('click',function(e){ if(!panel.hidden&&!panel.contains(e.target)&&!acct.contains(e.target)) closePanel(); });

/* ---------- 로그인 모달 ---------- */
var modal=el('div','fmodal'); modal.hidden=true;
var mb=el('div','fbox'); mb.setAttribute('role','dialog'); mb.setAttribute('aria-modal','true'); mb.setAttribute('aria-labelledby','fmt');
var mt=el('h2',null,'내 도구 상자, 어디서든 그대로'); mt.id='fmt';
var ml=el('p','fl1','로그인하면 기기가 바뀌어도 내 즐겨찾기가 유지돼요!');
var mg=el('button','fgoogle'); mg.type='button';
mg.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
var mgt=el('span',null,'구글로 1초 로그인'); mg.appendChild(mgt);
var mm=el('p','fmsg'); mm.setAttribute('aria-live','polite');
var ms=el('p','fsmall'); ms.appendChild(document.createTextNode('로그인하지 않아도 즐겨찾기는 이 브라우저에 저장돼요. 로그인 정보는 즐겨찾기와 저장한 날짜를 저장하는 데만 써요. '));
var pa=el('a',null,'개인정보처리방침'); pa.href='/privacy/'; ms.appendChild(pa);
var mc=el('button','fclose','×'); mc.type='button'; mc.setAttribute('aria-label','닫기');
mb.appendChild(mc); mb.appendChild(mt); mb.appendChild(ml); mb.appendChild(mg); mb.appendChild(mm); mb.appendChild(ms); modal.appendChild(mb); document.body.appendChild(modal);
var lastFocus=null;
function openModal(text){
  closePanel(); hideTip(); mm.textContent=''; mm.className='fmsg';
  ml.textContent=text||'로그인하면 기기가 바뀌어도 내 즐겨찾기가 유지돼요!';
  lastFocus=document.activeElement; modal.hidden=false; mg.focus();
  if(!booted&&!inApp) boot().catch(function(){});
}
function closeModal(){ if(modal.hidden) return; modal.hidden=true; if(lastFocus&&lastFocus.focus) try{lastFocus.focus();}catch(e){} }
mc.onclick=closeModal;
modal.addEventListener('click',function(e){ if(e.target===modal) closeModal(); });
mg.onclick=function(){login(mg,mm);};
document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ if(!modal.hidden) closeModal(); else if(!panel.hidden) closePanel(); } });

/* ---------- 안내 토스트 ---------- */
var tip=el('div','ftip'); tip.hidden=true; tip.setAttribute('role','status');
var tt=el('span'), tg=el('button','go2','간편 로그인하기'), tx=el('button','x2','닫기'); tg.type='button'; tx.type='button';
tip.appendChild(tt); tip.appendChild(tg); tip.appendChild(tx); document.body.appendChild(tip);
var tipT=null;
function hideTip(){tip.hidden=true; clearTimeout(tipT);}
function showTip(){ tt.textContent=isHome?'로그인하고 이 도구를 첫 화면에 고정해 보세요!':'로그인하면 이 도구를 첫 화면에 고정해 두고 어느 기기에서든 꺼낼 수 있어요!'; tg.hidden=false; tip.hidden=false; clearTimeout(tipT); tipT=setTimeout(hideTip,9000); }
function note(msg){ tt.textContent=msg; tg.hidden=true; tip.hidden=false; clearTimeout(tipT); tipT=setTimeout(hideTip,5000); }
tg.onclick=function(){openModal(isHome?'로그인하고 이 도구를 첫 화면에 고정해 보세요!':'로그인하면 고정한 도구가 어느 기기에서든 첫 화면에 나와요!');};
tx.onclick=hideTip;

/* ---------- 바깥에서 쓰는 창구 ---------- */
window.SonFav={
  list:function(){return favs.slice();}, has:function(h){return favs.indexOf(h)>=0;}, onChange:function(f){subs.push(f);}, toggle:toggle,
  syncDates:function(){ if(!pulled) touched=true; if(user) pushCloud(); }
};

drawAcct(); render();
if(ls(HINT)==='1'){ setTimeout(function(){boot().catch(function(){});},700); }
})();
