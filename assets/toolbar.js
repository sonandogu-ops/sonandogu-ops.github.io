/* 손안의도구 도구 공통 버튼: 결과 링크 복사 · 초기화 · 결과 복사
 * <head>에서 이렇게 불러요(defer 없이):
 *   <script src="/assets/toolbar.js?v=1" data-keys="저장키 ..." data-ids="입력칸id ..." data-anchor="복사버튼id"
 *           data-reset="지울 저장키 ..." data-copyfn="window의 함수 이름" data-place="버튼 줄을 넣을 자리(선택자)"></script>
 * - data-keys/data-ids가 있으면, 그 도구의 '결과 복사/결과 공유' 버튼(data-anchor)으로 복사·공유하는 글 끝에
 *   같은 입력값으로 열리는 링크(#s=...)가 자동으로 붙어요. 링크를 연 사람은 같은 결과를 보게 돼요.
 *   주소의 # 뒤 내용은 서버로 가지 않아서, 입력값이 사이트 서버나 분석 도구에 남지 않아요.
 * - data-reset이 있으면 '초기화'가 생겨요. 그 저장값을 지우고 페이지를 다시 열어요.
 * - data-copyfn이 있으면 '결과 복사'가 생겨요. 함수가 돌려준 글을 복사해요.
 */
(function(){
'use strict';
var me=document.currentScript; if(!me) return;
var D=me.dataset, split=function(s){return (s||'').split(/\s+/).filter(Boolean);};
var KEYS=split(D.keys), IDS=split(D.ids), RESET=split(D.reset);
function b64e(s){return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function b64d(s){s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='='; return decodeURIComponent(escape(atob(s)));}
/* 짧은 링크용 표기: 따옴표·괄호가 적은 JSON 비슷한 글 (예: (amount:'3,600',mode:annual))을 만든 뒤
   영문·숫자만 쓰는 base64로 감싸요. 메신저가 링크 끝 괄호를 잘라먹지 않게요. */
var SAFE=/^[A-Za-z_][A-Za-z0-9_.-]*$/;
function renc(v){
  if(v===null||v===undefined) return '!n';
  if(v===true) return '!t'; if(v===false) return '!f';
  if(typeof v==='number') return isFinite(v)?String(v):'!n';
  if(typeof v==='string'){ if(SAFE.test(v)&&!/^(-?\d|\.)/.test(v)) return v;
    return "'"+v.replace(/!/g,'!!').replace(/'/g,"!'")+"'"; }
  if(Array.isArray(v)) return '!('+v.map(renc).join(',')+')';
  if(typeof v==='object') return '('+Object.keys(v).map(function(k){return renc(k)+':'+renc(v[k]);}).join(',')+')';
  return '!n';
}
function rdec(str){
  var i=0;
  function val(){
    var c=str[i];
    if(c==='!'){ var n=str[i+1]; i+=2; if(n==='n') return null; if(n==='t') return true; if(n==='f') return false;
      if(n==='('){ var a=[]; if(str[i]===')'){i++; return a;} for(;;){ a.push(val()); if(str[i]===','){i++; continue;} if(str[i]===')'){i++; return a;} throw 0; } }
      throw 0; }
    if(c==='('){ i++; var o={}; if(str[i]===')'){i++; return o;} for(;;){ var k=val(); if(str[i]!==':') throw 0; i++; o[k]=val(); if(str[i]===','){i++; continue;} if(str[i]===')'){i++; return o;} throw 0; } }
    if(c==="'"){ i++; var out=''; for(;;){ if(i>=str.length) throw 0; var ch=str[i];
        if(ch==='!'){ out+=str[i+1]; i+=2; continue; } if(ch==="'"){ i++; break; } out+=ch; i++; }
      return out; }
    var j=i; while(i<str.length&&!/[,:)(]/.test(str[i])) i++; var t=str.slice(j,i); if(!t) throw 0;
    return /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)?Number(t):t;
  }
  var r=val(); if(i!==str.length) throw 0; return r;
}
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v); return true;}catch(e){return false;}}
function lsDel(k){try{localStorage.removeItem(k);}catch(e){}}

/* 1) 공유 링크로 들어왔다면, 도구 스크립트가 읽기 전에 저장값을 넣어 둔다 */
var pendingIds=null, opened=false;
var raw=(location.href.split('#')[1]||'');
var m=raw.match(/^s=([A-Za-z0-9_-]{1,12000})$/), mr=raw.match(/^z=([A-Za-z0-9_-]{1,12000})$/);
if(mr){
  /* 짧은 링크: k는 저장키 순서대로, i는 입력칸 값 */
  try{ var R=rdec(b64d(mr[1])), K={};
    (Array.isArray(R.k)?R.k:[]).forEach(function(v,n){ if(KEYS[n]&&v!==null) K[KEYS[n]]=typeof v==='string'?v:JSON.stringify(v); });
    m=['', b64e(JSON.stringify({k:K,i:R.i||{}}))];
  }catch(e){ m=null; }
}
if(m||mr){
  try{
    var d=JSON.parse(b64d(m[1]));
    if(d&&d.k&&typeof d.k==='object') Object.keys(d.k).forEach(function(k){ if(KEYS.indexOf(k)>=0&&typeof d.k[k]==='string'&&d.k[k].length<8000) lsSet(k,d.k[k]); });
    if(d&&d.i&&typeof d.i==='object') pendingIds=d.i;
    opened=true;
  }catch(e){}
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
}

function makeLink(){
  var d={k:{},i:{}}, kk=[], ii={}, hasI=false;
  KEYS.forEach(function(k){ var v=lsGet(k); if(v!=null) d.k[k]=v;
    var pv=null; if(v!=null){ try{ pv=JSON.parse(v); if(pv===null||typeof pv!=='object') pv=v; }catch(e){ pv=v; } } kk.push(pv); });
  IDS.forEach(function(id){var el=document.getElementById(id); if(el&&el.value){ d.i[id]=String(el.value).slice(0,200); ii[id]=d.i[id]; hasI=true; }});
  var base=location.origin+location.pathname;
  var a='#s='+b64e(JSON.stringify(d)), o={}; if(kk.length) o.k=kk; if(hasI) o.i=ii;
  var b='#z='+b64e(renc(o));
  /* 두 방식 중 더 짧은 쪽 (한글이 많으면 #s=가 짧을 때가 있어요) */
  return base+(b.length<=a.length?b:a);
}
async function copyText(t){
  try{ await navigator.clipboard.writeText(t); return true; }
  catch(e){ try{ var ta=document.createElement('textarea'); ta.value=t; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); var ok=document.execCommand('copy'); ta.remove(); return ok; }catch(e2){ return false; } }
}
function flash(b,txt){ var o=b.dataset.label; b.textContent=txt; clearTimeout(b._t); b._t=setTimeout(function(){b.textContent=o;},1600); }
function btn(label,cls){ var b=document.createElement('button'); b.type='button'; b.className='tb '+cls; b.textContent=label; b.dataset.label=label; return b; }
function toast(msg){
  var t=document.createElement('div'); t.className='tbtoast'; t.setAttribute('role','status'); t.textContent=msg; document.body.appendChild(t);
  setTimeout(function(){t.classList.add('out');},2600); setTimeout(function(){t.remove();},3100);
}

/* 결과 복사·공유 버튼을 누른 직후의 복사/공유 글 끝에 링크를 붙인다 */
function armLink(anchor){
  var armed=0;
  anchor.addEventListener('click',function(){ armed=Date.now(); },true);
  var add=function(t){ if(typeof t!=='string'||Date.now()-armed>4000||t.indexOf('#s=')>=0||t.indexOf('#z=')>=0) return t; armed=0; var L=makeLink();
    /* 글 안에 이 페이지 주소가 이미 있으면 그 자리를 결과 링크로 바꾸고, 없으면 끝에 붙인다 */
    var plain=[location.origin+location.pathname,'https://sonandogu.com'+location.pathname];
    for(var i=0;i<plain.length;i++){ var re=new RegExp(plain[i].replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&')+'(?![#\\w/-])'); if(re.test(t)) return t.replace(re,L); }
    return t.replace(/\s+$/,'')+'\n\n이 결과 다시 보기: '+L; };
  try{ var cb=navigator.clipboard; if(cb&&cb.writeText){ var w=cb.writeText.bind(cb); cb.writeText=function(t){ return w(add(t)); }; } }catch(e){}
  try{ if(navigator.share){ var sh=navigator.share.bind(navigator); navigator.share=function(d){ if(d&&typeof d.text==='string'){ d=Object.assign({},d,{text:add(d.text)}); } return sh(d); }; } }catch(e){}
}
function init(){
  /* 공유 링크로 받은 입력칸 값 채우기 (저장값을 쓰지 않는 도구용) */
  if(pendingIds) IDS.forEach(function(id){ var el=document.getElementById(id), v=pendingIds[id];
    if(el&&typeof v==='string'){ el.value=v.slice(0,200); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); } });
  if(opened) setTimeout(function(){toast('공유받은 계산 결과를 열었어요. 숫자를 바꿔 다시 계산해 볼 수 있어요.');},400);

  var anchor=D.anchor?document.getElementById(D.anchor):null;
  var host=D.place?document.querySelector(D.place):(anchor&&anchor.closest('.acts2,.acts,.dfoot,.wacts'));
  if(!host) return;
  var bar=document.createElement('div'); bar.className='tbar';

  if(D.copyfn){
    var c=btn('결과 복사','tcopy');
    c.addEventListener('click',async function(){ var f=window[D.copyfn], t=typeof f==='function'?f():''; if(!t){ flash(c,'복사할 결과가 아직 없어요'); return; } flash(c,(await copyText(t))?'복사했어요':'복사하지 못했어요'); });
    bar.appendChild(c);
  }
  if((KEYS.length||IDS.length)&&anchor) armLink(anchor);
  if(RESET.length){
    var r=btn('초기화','treset');
    r.addEventListener('click',function(){ RESET.forEach(lsDel); location.reload(); });
    bar.appendChild(r);
  }
  if(bar.children.length) host.parentNode.insertBefore(bar,host.nextSibling);
}
/* 휴대폰 키보드가 결과를 가릴 때: 입력하는 동안 화면 위쪽에 결과를 작게 띄워요 */
function peek(){
  var src=document.getElementById('res')||document.getElementById('jrText')||document.getElementById('big')||document.getElementById('month'); if(!src) return;
  var cap=document.getElementById('cap');
  var pill=document.createElement('div'); pill.className='tbpeek'; pill.setAttribute('aria-hidden','true'); pill.hidden=true; document.body.appendChild(pill);
  var on=false;
  function text(){ var t=src.innerText.replace(/\s+/g,' ').replace(/\s*보기$/,'').trim(); if(/^[-0\s원]*$/.test(t)) return ''; var c=(cap&&src.id==='res')?cap.innerText.replace(/\s+/g,' ').trim():''; return (c?c+' ':'')+t; }
  function upd(){
    if(!on){ pill.hidden=true; return; }
    var vv=window.visualViewport, vh=vv?vv.height:innerHeight, vt=vv?vv.offsetTop:0;
    var r=src.getBoundingClientRect(), hidden=r.top>vt+vh-24||r.bottom<vt+60;
    var t=text(); if(!hidden||!t){ pill.hidden=true; return; }
    pill.textContent=t; pill.style.top=(vt+8)+'px'; pill.hidden=false;
  }
  document.addEventListener('focusin',function(e){ if(e.target.matches('input:not([type=checkbox]):not([type=radio]),textarea')&&matchMedia('(pointer:coarse)').matches){ on=true; setTimeout(upd,350); } });
  document.addEventListener('focusout',function(){ on=false; setTimeout(upd,50); });
  document.addEventListener('input',function(){ setTimeout(upd,30); });
  if(window.visualViewport){ visualViewport.addEventListener('resize',upd); visualViewport.addEventListener('scroll',upd); }
  window.addEventListener('scroll',upd,{passive:true});
}
function start(){ init(); peek(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
window.SonShare={link:makeLink};
})();
