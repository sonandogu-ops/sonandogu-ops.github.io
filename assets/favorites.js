/* 손안의도구 즐겨찾기(마이 툴박스) + 구글 로그인 + 저장한 날짜 동기화
 * - 로그인 없이도 즐겨찾기는 브라우저(LocalStorage)에 바로 저장된다.
 * - 로그인하면 Firebase Auth(구글) + Firestore users/{uid} 문서에 같은 목록을 저장해 기기 간에 맞춘다.
 * - 메인 화면에서는 카드의 별과 '내 툴박스'를, 각 도구 페이지에서는 제목 옆 별과 헤더 검색·로그인을 붙인다.
 * - Firebase SDK는 로그인 창을 열거나, 이전에 로그인한 적이 있을 때만 불러온다.
 * - 새 도구를 만들면 아래 TOOLS 목록과 NAMES에 주소를 추가해야 별이 동작한다.
 * - 블로그 글에는 하트(좋아요)를 단다. 좋아요는 로그인한 사람만 누를 수 있고, users/{uid}.likes에 저장돼 '마이'에서 모아 본다.
 */
(function(){
'use strict';
var KEY='sonandogu-favs-v1', DKEY='sonandogu-date-saved', HINT='sonandogu-authed', TIPKEY='sonandogu-fav-tip', V='10.12.2';
var BASE='https://www.gstatic.com/firebasejs/'+V+'/';
var MAX=30, DMAX=12, LKEY='sonandogu-likes-v1', LMAX=100;
var TOOLS=['/wage/','/salary/','/freelance-tax/','/severance/','/leave/','/worktime/','/vat/','/date/','/age/','/holiday/','/dutch/','/percent/','/pyeong/','/charcount/','/receipt/','/party/team/','/party/roulette/','/party/ladder/','/party/manito/','/party/lots/','/random/','/traditional/yut/'];
var NAMES={'/wage/':'알바 급여 계산기','/salary/':'연봉 실수령액 계산기','/freelance-tax/':'3.3% 계산기','/severance/':'퇴직금 계산기','/leave/':'연차 계산기','/worktime/':'근무시간 계산기','/vat/':'부가세 계산기','/date/':'날짜 계산기','/age/':'만 나이 계산기','/holiday/':'연휴 계산기','/dutch/':'더치페이 계산기','/percent/':'퍼센트 계산기','/pyeong/':'평수 계산기','/charcount/':'글자수 세기','/receipt/':'간이영수증 작성기','/party/team/':'팀 나누기','/party/roulette/':'룰렛 돌리기','/party/ladder/':'사다리타기','/party/manito/':'마니또 뽑기','/party/lots/':'제비뽑기','/random/':'랜덤 숫자 뽑기','/traditional/yut/':'온라인 윷놀이'};
var CATS=[{"id":"work","n":"급여·근로","c":"#FF4A12","c1":"#FF8A3D","g":"급","t":["/wage/","/salary/","/freelance-tax/","/severance/","/leave/","/worktime/"]},{"id":"tax","n":"세금·금융","c":"#E08600","c1":"#F7B32B","g":"세","t":["/vat/"]},{"id":"date","n":"날짜·시간","c":"#2F66F0","c1":"#5E9BFF","g":"날","t":["/date/","/age/","/holiday/"]},{"id":"life","n":"생활 계산","c":"#E5485E","c1":"#FF7A8A","g":"생","t":["/dutch/","/percent/","/pyeong/"]},{"id":"doc","n":"글·문서","c":"#6A4FE8","c1":"#9B8AFB","g":"글","t":["/charcount/","/receipt/"]},{"id":"party","n":"모임·뽑기","c":"#12985B","c1":"#3DCB8C","g":"뽑","t":["/party/team/","/party/roulette/","/party/ladder/","/party/manito/","/party/lots/","/random/"]},{"id":"game","n":"게임·놀이","c":"#0E9494","c1":"#2CC5C5","g":"놀","t":["/traditional/yut/"]}];/*cats*/  /* 분류와 도구 목록 (build_tools.py가 채움) */
var ICONS={"/wage/":"₩","/salary/":"연","/freelance-tax/":"3.3","/severance/":"퇴","/leave/":"휴","/worktime/":"시","/vat/":"부","/date/":"<svg width=\"26\" height=\"26\" viewBox=\"0 0 26 26\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4\" y=\"5.5\" width=\"18\" height=\"16\" rx=\"3\"/><path d=\"M4 10.5h18M9 3.5v4M17 3.5v4\"/><path d=\"M9.5 15.5l2.2 2.2 4.3-4.4\"/></svg>","/age/":"만","/holiday/":"공","/dutch/":"<svg width=\"26\" height=\"26\" viewBox=\"0 0 26 26\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.2\" stroke-linecap=\"round\"><circle cx=\"8\" cy=\"8\" r=\"3.2\"/><circle cx=\"18\" cy=\"8\" r=\"3.2\"/><path d=\"M3 21c0-3 2.2-5 5-5s5 2 5 5M13 21c0-3 2.2-5 5-5s5 2 5 5\"/></svg>","/percent/":"%","/pyeong/":"평","/charcount/":"가","/receipt/":"<svg width=\"26\" height=\"26\" viewBox=\"0 0 26 26\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 3h14v20l-3.5-2-3.5 2-3.5-2L6 23z\"/><path d=\"M10 9h6M10 13h6\"/></svg>","/party/team/":"<svg width=\"26\" height=\"26\" viewBox=\"0 0 26 26\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.2\" stroke-linecap=\"round\"><circle cx=\"7\" cy=\"8\" r=\"2.6\"/><circle cx=\"19\" cy=\"8\" r=\"2.6\"/><path d=\"M2.5 19c0-2.6 2-4.4 4.5-4.4s4.5 1.8 4.5 4.4M14.5 19c0-2.6 2-4.4 4.5-4.4s4.5 1.8 4.5 4.4\"/><path d=\"M13 4v18\" stroke-dasharray=\"2 3\"/></svg>","/party/roulette/":"<svg width=\"26\" height=\"26\" viewBox=\"0 0 26 26\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.2\"><circle cx=\"13\" cy=\"14\" r=\"9\"/><path d=\"M13 5v18M4 14h18M6.6 7.6l12.8 12.8M19.4 7.6L6.6 20.4\" stroke-width=\"1.4\"/><path d=\"M10.5 1.8h5L13 5z\" fill=\"#fff\" stroke=\"none\"/></svg>","/party/ladder/":"<svg width=\"26\" height=\"26\" viewBox=\"0 0 26 26\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.2\" stroke-linecap=\"round\"><path d=\"M6 3v20M13 3v20M20 3v20M6 8h7M13 13h7M6 18h7\"/></svg>","/party/manito/":"<svg width=\"26\" height=\"26\" viewBox=\"0 0 26 26\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3.5\" y=\"10\" width=\"19\" height=\"5\" rx=\"1.5\"/><path d=\"M5 15v7.5h16V15M13 10v12.5M13 10c-1.6-4.4-6.6-4.2-6.6-1.6 0 1.8 3 1.7 6.6 1.6zM13 10c1.6-4.4 6.6-4.2 6.6-1.6 0 1.8-3 1.7-6.6 1.6z\"/></svg>","/party/lots/":"<svg width=\"26\" height=\"26\" viewBox=\"0 0 26 26\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"6\" width=\"10\" height=\"14\" rx=\"2\" transform=\"rotate(-10 8 13)\"/><rect x=\"12\" y=\"5\" width=\"10\" height=\"14\" rx=\"2\" transform=\"rotate(8 17 12)\"/></svg>","/random/":"<svg width=\"26\" height=\"26\" viewBox=\"0 0 26 26\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><rect x=\"4\" y=\"4\" width=\"18\" height=\"18\" rx=\"4\"/><circle cx=\"9.5\" cy=\"9.5\" r=\"1.4\" fill=\"#fff\" stroke=\"none\"/><circle cx=\"16.5\" cy=\"16.5\" r=\"1.4\" fill=\"#fff\" stroke=\"none\"/><circle cx=\"13\" cy=\"13\" r=\"1.4\" fill=\"#fff\" stroke=\"none\"/></svg>","/traditional/yut/":"<svg width=\"26\" height=\"26\" viewBox=\"0 0 28 28\" fill=\"#fff\"><rect x=\"3\" y=\"4\" width=\"4\" height=\"20\" rx=\"2\"/><rect x=\"9.3\" y=\"4\" width=\"4\" height=\"20\" rx=\"2\" opacity=\".75\"/><rect x=\"15.6\" y=\"4\" width=\"4\" height=\"20\" rx=\"2\"/><rect x=\"21.9\" y=\"4\" width=\"4\" height=\"20\" rx=\"2\" opacity=\".75\"/></svg>"};/*icons*/  /* 도구 아이콘 (build_tools.py가 채움) */
var HOT=[["자소서","자소서 줄바꿈"],["n빵","N빵 계산기"],["팀","팀정하기 룰렛"],["제비","제비뽑기"],["마니또","마니또 뽑기"],["만 나이","만 나이"],["윷놀이","윷놀이 게임"],["조 이름","조 이름 추천"]];/*hot*/  /* 검색창 아래 많이 찾는 검색어 (build_tools.py가 채움) */
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

/* 좋아요한 글: [{p:'/blog/slug/', t:'글 제목'}], 최근 누른 것이 앞 */
function cleanLikes(a){
  var o=[],seen={}; (Array.isArray(a)?a:[]).forEach(function(x){
    if(!x||typeof x.p!=='string'||!/^\/blog\/[a-z0-9-]+\/$/.test(x.p)||seen[x.p]) return;
    seen[x.p]=1; o.push({p:x.p,t:String(x.t==null?'':x.t).replace(/\s+/g,' ').trim().slice(0,80)||x.p});
  });
  return o.slice(0,LMAX);
}
function loadLikes(){try{return cleanLikes(JSON.parse(ls(LKEY)||'[]'));}catch(e){return [];}}
var likes=loadLikes(), likesOK=true;

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
    var data={favs:favs.slice(),dates:JSON.stringify(loadDates()),updated:fb.fs.serverTimestamp()};
    if(likesOK) data.likes=JSON.stringify(likes);
    fb.fs.setDoc(ref,data,{merge:true}).catch(function(e){
      /* 보안 규칙이 likes 필드를 아직 모르면 즐겨찾기만이라도 저장한다 */
      if(likesOK&&e&&e.code==='permission-denied'){ likesOK=false; delete data.likes; fb.fs.setDoc(ref,data,{merge:true}).catch(function(){}); note('좋아요를 계정에 저장하지 못했어요. 즐겨찾기는 저장됐어요.'); return; }
      note('클라우드 저장이 늦어지고 있어요. 이 기기에는 저장됐어요.');
    });
  },500);
}
async function pull(u){
  var ref=fb.fs.doc(fb.db,'users',u.uid), cloud=[], cloudD=[], cloudL=[], exists=false;
  try{
    var snap=await fb.fs.getDoc(ref); exists=snap.exists();
    if(exists){
      var d=snap.data()||{}; cloud=clean(Array.isArray(d.favs)?d.favs:[]);
      try{cloudD=cleanDates(JSON.parse(d.dates||'[]'));}catch(e){}
      try{cloudL=cleanLikes(JSON.parse(d.likes||'[]'));}catch(e){}
    }
  }catch(e){ note('즐겨찾기를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.'); return; }
  if(user!==u) return;
  var merge=loginFlag||touched||!exists;
  var next=merge?union(cloud,favs):cloud;
  var localD=loadDates(), nextD=merge?unionDates(cloudD,localD):cloudD;
  pulled=true; loginFlag=false;
  setLikes(cloudL);
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
    if(wasUser){ wasUser=false; touched=false; favs=[]; persistLocal(); ls(DKEY,null); setLikes([]); emit(); datesChanged(); }
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

/* ---------- 공개 숫자판: 도구 별 수·글 하트 수 (counts/{f_경로|l_경로}.n) ---------- */
function ckey(kind,path){ return kind+path.replace(/\//g,'_'); }
function bump(kind,path,d){ if(!user||!fb||!fb.fs.increment) return; try{ fb.fs.setDoc(fb.fs.doc(fb.db,'counts',ckey(kind,path)),{n:fb.fs.increment(d)},{merge:true}).catch(function(){}); }catch(e){} }

/* ---------- 즐겨찾기 토글 ---------- */
function toggle(h){
  var i=favs.indexOf(h), adding=i<0;
  if(adding){ if(favs.length>=MAX) return; favs=favs.concat([h]); } else favs=favs.filter(function(x){return x!==h;});
  if(!pulled) touched=true;
  persistLocal(); emit(); if(user){ pushCloud(); bump('f',h,adding?1:-1); }
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

/* ---------- 좋아요 (블로그 글) ---------- */
var HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s-7.6-4.6-9.2-9.4C1.7 7.4 3.9 4.3 7.2 4.3c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.5 3.1 4.4 6.6-1.6 4.8-9.2 9.4-9.2 9.4z"/></svg>';
var hearts=[];
var postTitle=(function(){
  var h=document.querySelector('article.post h1'); if(!h) return '';
  var c=h.cloneNode(true); [].slice.call(c.querySelectorAll('br')).forEach(function(b){b.replaceWith(' ');});
  [].slice.call(c.querySelectorAll('.fav')).forEach(function(x){x.remove();});
  return c.textContent.replace(/\s+/g,' ').trim();
})();
var isPost=/^\/blog\/[a-z0-9-]+\/$/.test(here)&&!!postTitle;
function liked(){return likes.some(function(x){return x.p===here;});}
function setLikes(next){
  likes=cleanLikes(next);
  if(user) ls(LKEY,JSON.stringify(likes)); else ls(LKEY,null);
  paintHearts(); if(!panel.hidden) drawPanel(); if(typeof drawSidebar==='function'&&sb.isConnected) drawSidebar();
}
function toggleLike(){
  if(!user){ openModal('로그인하면 좋아요한 글을 마이에서 언제든 다시 볼 수 있어요!'); return; }
  if(!pulled){ note('계정 정보를 불러오는 중이에요. 잠시 뒤 다시 눌러 주세요.'); return; }
  var on=liked();
  setLikes(on?likes.filter(function(x){return x.p!==here;}):[{p:here,t:postTitle}].concat(likes));
  pushCloud(); bump('l',here,on?-1:1);
  if(!on) note('좋아요했어요. 오른쪽 위 마이에서 모아 볼 수 있어요.');
}
function paintHearts(){
  var on=liked();
  hearts.forEach(function(b){
    b.setAttribute('aria-pressed',on?'true':'false');
    var t=b.querySelector('.lt'); if(t) t.textContent=on?'좋아요함':'좋아요';
  });
}
if(isPost){
  var pub=document.querySelector('article.post .meta.pub');
  if(pub){ var hs=el('button','like sm'); hs.type='button'; hs.innerHTML=HEART; hs.setAttribute('aria-label','이 글 좋아요'); hs.title='좋아요'; pub.appendChild(hs); hearts.push(hs); }
  var art=document.querySelector('article.post'), at=art.querySelector('nav.next')||art.querySelector('[data-comments]');
  var lb=el('div','likebox'), lt=el('p',null,'이 글이 도움이 됐다면 하트를 눌러 주세요. 좋아요한 글은 마이에서 다시 찾아볼 수 있어요.');
  var hb=el('button','like'); hb.type='button'; hb.innerHTML=HEART; hb.appendChild(el('span','lt','좋아요'));
  lb.appendChild(lt); lb.appendChild(hb);
  if(at) art.insertBefore(lb,at); else art.appendChild(lb);
  hearts.push(hb);
  hearts.forEach(function(b){ b.addEventListener('click',toggleLike); });
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
    var hq=el('input'); hq.type='search'; hq.id='hq'; hq.placeholder='도구·글 검색'; hq.autocomplete='off'; hq.setAttribute('aria-label','도구와 글 검색 (예: 할인, 주휴수당, 사다리)');
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
  var sec=function(title,items,empty){
    var w=el('div','fsec'), hd=el('div','fsh'); hd.appendChild(el('strong',null,title)); hd.appendChild(el('span',null,items.length+'개')); w.appendChild(hd);
    if(!items.length){ w.appendChild(el('p','fe',empty)); return w; }
    var ul=el('ul','flist'); items.forEach(function(it){ var li=el('li'), a=el('a',null,it.t); a.href=it.h; li.appendChild(a); ul.appendChild(li); }); w.appendChild(ul); return w;
  };
  panel.appendChild(sec('찜한 도구',favs.map(function(h){return {h:h,t:NAMES[h]||labelOf(h)};}),'도구 이름 옆 별을 누르면 여기 모여요.'));
  panel.appendChild(sec('좋아요한 글',likes.map(function(x){return {h:x.p,t:x.t};}),'블로그 글의 하트를 누르면 여기 모여요.'));
  panel.appendChild(el('p',null,'다른 기기에서 같은 계정으로 로그인하면 그대로 이어져요.'));
  instBtns=instBtns.filter(function(b){ return b.isConnected; }); var ib=installBtn(); panel.appendChild(ib); paintInstall();
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
function openPanel(){ var tp=document.querySelector('.top'); if(tp) document.documentElement.style.setProperty('--hdr',(Math.round(tp.getBoundingClientRect().bottom)+8)+'px'); drawPanel(); panel.hidden=false; acct.setAttribute('aria-expanded','true');}
function closePanel(){panel.hidden=true; if(delArmed){clearTimeout(delArmed); delArmed=null;} if(user) acct.setAttribute('aria-expanded','false');}
acct.onclick=function(){ if(user){ panel.hidden?openPanel():closePanel(); } else openModal(); };
document.addEventListener('click',function(e){ if(!panel.hidden&&!panel.contains(e.target)&&!acct.contains(e.target)) closePanel(); });

/* ---------- 앱으로 설치 (홈 화면에 추가) ---------- */
var deferredInstall=window.__bip||null, instBtns=[];  /* 페이지 머리에서 먼저 받아 둔 설치 신호 */
var UA=navigator.userAgent||'';
var isIOS=/iPhone|iPad|iPod/.test(UA)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
var isAndroid=/Android/i.test(UA);
function isStandalone(){ try{ return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true; }catch(e){ return false; } }
window.addEventListener('beforeinstallprompt',function(e){ e.preventDefault(); deferredInstall=e; window.__bip=e; paintInstall(); });
window.addEventListener('appinstalled',function(){ deferredInstall=null; paintInstall(); closeGuide(); note('홈 화면에 손안의도구를 추가했어요!'); });
var installedHere=false;
/* 크롬·엣지는 이 기기에 이미 설치됐는지 알려줘요 (manifest의 related_applications) */
try{ if(navigator.getInstalledRelatedApps) navigator.getInstalledRelatedApps().then(function(a){ installedHere=!!(a&&a.length); paintInstall(); }).catch(function(){}); }catch(e){}
function paintInstall(){ var hide=isStandalone(); instBtns.forEach(function(b){ b.hidden=hide; var t=b.querySelector('span'); if(t) t.textContent=(installedHere&&!deferredInstall)?'이 기기에는 이미 설치돼 있어요':'홈 화면에 앱으로 설치'; }); }
function installBtn(){
  var b=el('button','finst'); b.type='button';
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M12 8v7M9 12l3 3 3-3"/></svg>';
  b.appendChild(el('span',null,'홈 화면에 앱으로 설치'));
  b.onclick=doInstall; instBtns.push(b); return b;
}
function doInstall(){
  if(!deferredInstall&&window.__bip) deferredInstall=window.__bip;
  if(deferredInstall){ var d=deferredInstall; deferredInstall=null; window.__bip=null; d.prompt(); if(d.userChoice) d.userChoice.then(function(c){ if(c&&c.outcome==='accepted') note('홈 화면에 손안의도구를 추가했어요!'); paintInstall(); }).catch(function(){}); return; }
  if(installedHere){ note('이 기기에는 이미 설치돼 있어요. 바탕화면이나 홈 화면의 손안의도구 아이콘으로 열어 보세요.'); return; }
  openGuide();
}
var guide=el('div','fmodal'); guide.hidden=true;
var gb=el('div','fbox'); gb.setAttribute('role','dialog'); gb.setAttribute('aria-modal','true'); gb.setAttribute('aria-labelledby','fgt');
var gt=el('h2',null,'홈 화면에 손안의도구 추가하기'); gt.id='fgt';
var gl=el('ol','fsteps'), gn=el('p','fsmall','앱처럼 아이콘으로 바로 열리고, 주소창 없이 넓게 보여요. 따로 내려받는 파일은 없어요.');
var gc=el('button','fclose','×'); gc.type='button'; gc.setAttribute('aria-label','닫기'); gc.onclick=function(){closeGuide();};
var gok=el('button','fgoogle','알겠어요'); gok.type='button'; gok.style.marginTop='16px'; gok.onclick=function(){closeGuide();};
gb.appendChild(gc); gb.appendChild(gt); gb.appendChild(gl); gb.appendChild(gn); gb.appendChild(gok); guide.appendChild(gb); document.body.appendChild(guide);
guide.addEventListener('click',function(e){ if(e.target===guide) closeGuide(); });
function steps(a){ gl.textContent=''; a.forEach(function(t){ var li=el('li'); li.innerHTML=t; gl.appendChild(li); }); }
function openGuide(){
  closePanel(); if(!modal.hidden) closeModal();
  if(inApp) steps(['카카오톡·네이버 앱 안의 브라우저에서는 설치가 안 돼요.','화면 오른쪽 아래(또는 위) <b>⋮</b>나 <b>공유</b> 버튼을 누르고 <b>다른 브라우저로 열기</b>를 골라요.','Safari나 Chrome에서 열린 뒤 이 버튼을 다시 눌러 주세요.']);
  else if(isIOS) steps(['화면 아래(또는 주소창 옆) <b>공유 버튼</b>을 눌러요. 네모에서 화살표가 위로 나온 모양이에요.','목록을 아래로 내려 <b>홈 화면에 추가</b>를 눌러요.','오른쪽 위 <b>추가</b>를 누르면 홈 화면에 손안의도구 아이콘이 생겨요.']);
  else if(isAndroid) steps(['Chrome 오른쪽 위 <b>⋮</b> 메뉴를 눌러요.','<b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 눌러요.','<b>설치</b>를 누르면 홈 화면에 아이콘이 생겨요.']);
  else steps(['Chrome·Edge라면 주소창 오른쪽의 <b>설치 아이콘</b>(모니터에 화살표 모양)을 눌러요.','아이콘이 없으면 오른쪽 위 <b>⋮</b> 메뉴 → <b>전송, 저장, 공유</b>(또는 바로 메뉴 안)에서 <b>손안의도구 설치</b>를 골라요.','주소창에 <b>앱에서 열기</b> 아이콘이 보이거나 메뉴에 <b>손안의도구 열기</b>가 있다면 이미 설치돼 있는 거예요. 크롬 주소창에 chrome://apps 를 치면 설치된 앱을 볼 수 있어요.']);
  guide.hidden=false; gok.focus();
}
function closeGuide(){ guide.hidden=true; }
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!guide.hidden) closeGuide(); });

/* ---------- 로그인 모달 ---------- */
var modal=el('div','fmodal'); modal.hidden=true;
var mb=el('div','fbox'); mb.setAttribute('role','dialog'); mb.setAttribute('aria-modal','true'); mb.setAttribute('aria-labelledby','fmt');
var mt=el('h2',null,'내 도구 상자, 어디서든 그대로'); mt.id='fmt';
var ml=el('p','fl1','로그인하면 기기가 바뀌어도 내 즐겨찾기가 유지돼요!');
var mg=el('button','fgoogle'); mg.type='button';
mg.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
var mgt=el('span',null,'구글로 1초 로그인'); mg.appendChild(mgt);
var mm=el('p','fmsg'); mm.setAttribute('aria-live','polite');
var ms=el('p','fsmall'); ms.appendChild(document.createTextNode('로그인하지 않아도 즐겨찾기는 이 브라우저에 저장돼요. 로그인 정보는 즐겨찾기, 저장한 날짜, 좋아요한 글을 저장하는 데만 써요. '));
var pa=el('a',null,'개인정보처리방침'); pa.href='/privacy/'; ms.appendChild(pa);
var mc=el('button','fclose','×'); mc.type='button'; mc.setAttribute('aria-label','닫기');
var mdiv=el('div','fdiv'); mdiv.appendChild(el('span',null,'또는'));
var mib=installBtn(); var mis=el('p','fsmall','로그인하지 않아도 앱처럼 설치해서 쓸 수 있어요.');
mb.appendChild(mc); mb.appendChild(mt); mb.appendChild(ml); mb.appendChild(mg); mb.appendChild(mm); mb.appendChild(ms); mb.appendChild(mdiv); mb.appendChild(mib); mb.appendChild(mis); modal.appendChild(mb); document.body.appendChild(modal);
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

/* ---------- 검색창을 누르면 아래에 '많이 찾는' 검색어 ---------- */
(function(){
  var inp=$('q')||$('hq'); if(!inp||!HOT.length) return;
  var lab=inp.closest('.hsrch')||inp.parentNode; lab.classList.add('has-hot');
  var box=el('div','hotdrop'); box.hidden=true; box.setAttribute('role','listbox'); box.setAttribute('aria-label','많이 찾는 검색어');
  box.appendChild(el('span','hl','많이 찾는'));
  HOT.forEach(function(h){ var b=el('button',null,h[1]); b.type='button'; b.setAttribute('role','option');
    b.addEventListener('mousedown',function(e){ e.preventDefault(); });
    b.addEventListener('click',function(){ box.hidden=true;
      if(inp.id==='q'){ inp.value=h[0]; inp.dispatchEvent(new Event('input',{bubbles:true})); inp.blur(); }
      else location.href='/?q='+encodeURIComponent(h[0]); });
    box.appendChild(b); });
  lab.appendChild(box);
  var edge=function(){ box.classList.toggle('more', box.scrollLeft+box.clientWidth < box.scrollWidth-4); };
  box.addEventListener('scroll',edge,{passive:true});
  box.addEventListener('wheel',function(e){ if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){ box.scrollLeft+=e.deltaY; e.preventDefault(); } },{passive:false});
  var show=function(){ box.hidden=!!inp.value.trim(); if(!box.hidden) edge(); };
  inp.addEventListener('focus',show); inp.addEventListener('input',show);
  inp.addEventListener('blur',function(){ setTimeout(function(){ box.hidden=true; },120); });
  inp.addEventListener('keydown',function(e){ if(e.key==='Escape') box.hidden=true; });
})();

/* ---------- 왼쪽 도구 메뉴 (넓은 화면은 늘 보이고, 좁은 화면은 ☰ 버튼으로 서랍처럼) ---------- */
var SBKEY='sonandogu-sidebar-off';
var sb=el('aside','sbar'); sb.id='sbar'; sb.setAttribute('aria-label','도구 메뉴');
var sbBack=el('div','sbback'); sbBack.hidden=true;
var sbBtn=el('button','sbtn'); sbBtn.type='button'; sbBtn.setAttribute('aria-label','도구 메뉴 열기'); sbBtn.setAttribute('aria-controls','sbar');
sbBtn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
function wide(){ return matchMedia('(min-width:1200px)').matches; }
var sbTab=ls('sonandogu-sb-tab')==='like'?'like':'fav';
function catOf(h){ for(var i=0;i<CATS.length;i++) if(CATS[i].t.indexOf(h)>=0) return CATS[i]; return null; }
function toolLink(h){
  var c=catOf(h), a=el('a','sbi'); a.href=h; if(h===here) a.setAttribute('aria-current','page');
  var ic=el('span','sbic'); ic.innerHTML=ICONS[h]||''; if(c) ic.style.background='linear-gradient(145deg,'+c.c1+','+c.c+')';
  a.appendChild(ic); a.appendChild(el('span','sbn',NAMES[h]||h)); return a;
}
function drawSidebar(){
  sb.textContent='';
  /* 머리: 엔도와 '손안의 서랍' */
  var hd=el('div','sbhd');
  var who=el('div','sbwho'); var im=el('img'); im.src='/assets/endo/wave.webp'; im.alt=''; im.width=34; im.height=34; who.appendChild(im);
  var tt=el('div'); tt.appendChild(el('b',null,'손안의 서랍')); tt.appendChild(el('span',null,'도구 '+CATS.reduce(function(n,c){return n+c.t.length;},0)+'개')); who.appendChild(tt);
  var close=el('button','sbx'); close.type='button'; close.setAttribute('aria-label','서랍 닫기'); close.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  close.onclick=function(){ if(wide()){ ls(SBKEY,'1'); document.documentElement.classList.add('sb-off'); } else closeDrawer(); };
  hd.appendChild(who); hd.appendChild(close); sb.appendChild(hd);
  /* 내 것: 즐겨찾기 | 좋아요 탭 */
  var mine=el('div','sbmine'), tabs=el('div','sbtabs'), pane=el('div','sbpane');
  [['fav','★ 즐겨찾기',favs.length],['like','♥ 좋아요',likes.length]].forEach(function(x){
    var b=el('button',null,x[1]+' '); b.type='button'; b.appendChild(el('small',null,String(x[2]))); b.setAttribute('aria-pressed',sbTab===x[0]?'true':'false');
    b.onclick=function(){ sbTab=x[0]; ls('sonandogu-sb-tab',x[0]==='like'?'like':null); drawSidebar(); }; tabs.appendChild(b); });
  if(sbTab==='fav'){
    if(favs.length) favs.forEach(function(h){ pane.appendChild(toolLink(h)); });
    else pane.appendChild(el('p','sbempty','도구 이름 옆 ☆을 누르면 여기 모여요'));
  }else{
    if(likes.length) likes.slice(0,20).forEach(function(x){ var a=el('a','sbi sbpost'); a.href=x.p; if(x.p===here) a.setAttribute('aria-current','page'); a.appendChild(el('span','sbic sbh','♥')); a.appendChild(el('span','sbn',x.t)); pane.appendChild(a); });
    else pane.appendChild(el('p','sbempty',user?'블로그 글의 ♡를 누르면 여기 모여요':'로그인하고 글의 ♡를 누르면 여기 모여요'));
  }
  mine.appendChild(tabs); mine.appendChild(pane); sb.appendChild(mine);
  /* 분류 */
  sb.appendChild(el('div','sbt','분류'));
  CATS.forEach(function(c){
    var d=el('details','sbcat'); if(c.t.indexOf(here)>=0) d.open=true;
    var sm=el('summary'); var tile=el('span','sbtile',c.g); tile.style.background='linear-gradient(145deg,'+c.c1+','+c.c+')';
    sm.appendChild(tile); sm.appendChild(el('span','sbcn',c.n)); sm.appendChild(el('small',null,String(c.t.length))); d.appendChild(sm);
    var box=el('div','sbtools'); c.t.forEach(function(h){ box.appendChild(toolLink(h)); }); d.appendChild(box); sb.appendChild(d);
  });
  /* 아래: 블로그 · 모든 도구 */
  var ft=el('div','sbfoot');
  [['/blog/','블로그'],['/tools/','모든 도구']].forEach(function(x){ var a=el('a',null,x[1]+' →'); a.href=x[0]; ft.appendChild(a); });
  sb.appendChild(ft);
}
function openDrawer(){ if(wide()){ ls(SBKEY,null); document.documentElement.classList.remove('sb-off'); return; } sb.classList.add('open'); sbBack.hidden=false; sbBtn.setAttribute('aria-expanded','true'); var f=sb.querySelector('a'); if(f) f.focus(); }
function closeDrawer(){ sb.classList.remove('open'); sbBack.hidden=true; sbBtn.setAttribute('aria-expanded','false'); }
sbBtn.onclick=function(){ sb.classList.contains('open')?closeDrawer():openDrawer(); };
sbBack.onclick=closeDrawer;
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&sb.classList.contains('open')) closeDrawer(); });
if(CATS.length&&!document.querySelector('.admin-page')){
  var tin=document.querySelector('.top .in'), tb=tin&&tin.querySelector('.brand');
  if(tin&&tb){ tin.insertBefore(sbBtn,tb); document.body.appendChild(sbBack); document.body.appendChild(sb); document.documentElement.classList.add('has-sb'); if(ls(SBKEY)==='1') document.documentElement.classList.add('sb-off'); drawSidebar(); subs.push(drawSidebar); }
}

/* ---------- 홈 인기 도구·인기 글: 별·하트 수로 다시 줄 세우기 ---------- */
function loadCounts(){
  var boxes=['popT','popP'].map(function(id){return document.getElementById(id);}).filter(Boolean); if(!boxes.length) return;
  var cfg=window.SONANDOGU_FIREBASE||{}; if(!cfg.apiKey||/^PASTE/.test(cfg.apiKey)) return;
  Promise.all([import(BASE+'firebase-app.js'),import(BASE+'firebase-firestore-lite.js')]).then(function(m){
    var app=m[0].getApps().filter(function(a){return a.name==='counts';})[0]||m[0].initializeApp(cfg,'counts');
    var db=m[1].getFirestore(app);
    return m[1].getDocs(m[1].collection(db,'counts')).then(function(snap){
      var C={}; snap.forEach(function(d){ var n=(d.data()||{}).n; if(typeof n==='number'&&n>0) C[d.id]=n; });
      boxes.forEach(function(box){ rerank(box,C); });
    });
  }).catch(function(){});
}
function rerank(box,C){
  var kind=box.id==='popT'?'f':'l', ol=box.querySelector('ol'); if(!ol) return;
  /* 후보: 상자에 있던 기본 순서 + 숫자판에 있는 다른 항목 */
  var items=[].slice.call(ol.children).map(function(li,i){ var a=li.querySelector('a'); return {li:li,k:a.dataset.k,i:i}; });
  var have={}; items.forEach(function(x){have[x.k]=1;});
  Object.keys(C).forEach(function(k){
    if(k.charAt(0)!==kind||have[k]) return; var path=k.slice(1).replace(/_/g,'/');
    var name=kind==='f'?NAMES[path]:null; if(kind==='f'&&!name) return;
    var li=el('li'), a=el('a'); a.href=path; a.dataset.k=k; a.appendChild(el('b',null,name||path)); var cn=''; if(kind==='f') CATS.forEach(function(c){ if(c.t.indexOf(path)>=0) cn=c.n; }); a.appendChild(el('span',null,kind==='f'?(cn||'도구'):'블로그 글')); li.appendChild(a);
    if(kind==='l'){ fetch(path).then(function(r){return r.text();}).then(function(t){ var m=t.match(/<h1>([\s\S]*?)<\/h1>/); if(m) a.querySelector('b').textContent=m[1].replace(/<br\s*\/?>/g,' ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(); }).catch(function(){}); }
    items.push({li:li,k:k,i:99});
  });
  items.forEach(function(x){ x.n=C[x.k]||0; var em=x.li.querySelector('.cnt'); if(x.n){ if(!em){ em=el('em','cnt'); x.li.querySelector('a').appendChild(em); } em.textContent=(kind==='f'?'★ ':'♥ ')+x.n; } });
  items.sort(function(a,b){ return (b.n-a.n)||(a.i-b.i); });
  ol.textContent=''; items.slice(0,5).forEach(function(x){ ol.appendChild(x.li); });
}
if(document.getElementById('popT')){ (window.requestIdleCallback||function(f){setTimeout(f,1200);})(loadCounts); }

/* ---------- 바깥에서 쓰는 창구 ---------- */
window.SonInstall={open:doInstall, available:function(){return !!deferredInstall;}};
window.SonFav={
  list:function(){return favs.slice();}, has:function(h){return favs.indexOf(h)>=0;}, onChange:function(f){subs.push(f);}, toggle:toggle,
  syncDates:function(){ if(!pulled) touched=true; if(user) pushCloud(); }
};

drawAcct(); render(); paintInstall();
/* 상단 메뉴에서 지금 있는 곳(블로그/도구) 표시 */
[].slice.call(document.querySelectorAll('.top nav a')).forEach(function(a){
  var h=a.getAttribute('href'); if((h==='/blog/'&&/^\/blog\//.test(here))||(h==='/'&&here==='/')) a.setAttribute('aria-current','page');
});
if(ls(HINT)==='1'){ setTimeout(function(){boot().catch(function(){});},700); }
})();
