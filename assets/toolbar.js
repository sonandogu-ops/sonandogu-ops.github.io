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
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v); return true;}catch(e){return false;}}
function lsDel(k){try{localStorage.removeItem(k);}catch(e){}}

/* 1) 공유 링크로 들어왔다면, 도구 스크립트가 읽기 전에 저장값을 넣어 둔다 */
var pendingIds=null, opened=false;
var m=location.hash.match(/^#s=([A-Za-z0-9_-]{1,12000})$/);
if(m){
  try{
    var d=JSON.parse(b64d(m[1]));
    if(d&&d.k&&typeof d.k==='object') Object.keys(d.k).forEach(function(k){ if(KEYS.indexOf(k)>=0&&typeof d.k[k]==='string'&&d.k[k].length<8000) lsSet(k,d.k[k]); });
    if(d&&d.i&&typeof d.i==='object') pendingIds=d.i;
    opened=true;
  }catch(e){}
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
}

function makeLink(){
  var d={k:{},i:{}};
  KEYS.forEach(function(k){var v=lsGet(k); if(v!=null) d.k[k]=v;});
  IDS.forEach(function(id){var el=document.getElementById(id); if(el&&el.value) d.i[id]=String(el.value).slice(0,200);});
  return location.origin+location.pathname+'#s='+b64e(JSON.stringify(d));
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
  var add=function(t){ if(typeof t!=='string'||Date.now()-armed>4000||t.indexOf('#s=')>=0) return t; armed=0; var L=makeLink();
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
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
window.SonShare={link:makeLink};
})();
