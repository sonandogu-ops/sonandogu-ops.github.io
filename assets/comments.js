// 손안의도구 익명 댓글 · 후기 · 도구 요청 (Firebase Firestore)
const V='10.12.2';
const cfg=window.SONANDOGU_FIREBASE||{};
const ready=cfg.apiKey&&!/^PASTE/.test(cfg.apiKey);
let db=null, fs=null, settings=null;
async function boot(){
  if(!ready) return false; if(db) return true;
  const app=await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  fs=await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const a=app.getApps().length?app.getApp():app.initializeApp(cfg); db=fs.getFirestore(a); return true;
}
/* ---------- 부적절한 표현 거르기 ---------- */
const BAD=['씨발','시발','씨바','시바알','씨팔','시팔','ㅅㅂ','ㅆㅂ','ㅅㅃ','좆','존나','ㅈㄴ','병신','븅신','빙신','ㅂㅅ','개새','개색','개세','ㅅㄲ','미친놈','미친년','미친새','ㅁㅊ','지랄','ㅈㄹ','염병','엿먹','꺼져','닥쳐','등신','찐따','애미','애비','느금','니미','니엄','엠창','썅','쌍놈','쌍년','창녀','한남충','한녀','김치녀','틀딱','급식충','맘충','장애인새','fuck','shit','bitch','asshole','sex','porn','씹새','씹년','씹창','개씹','씹할','씨발새끼','썅년'];
const norm=s=>s.toLowerCase().replace(/[\s\d!-\/:-@\[-`{-~·•ㆍ_]+/g,'');
export function bad(s){ const n=norm(s); return BAD.some(w=>n.includes(w)); }
export function spam(s){ return /(https?:\/\/|www\.|\.com|\.kr|\.net|open\.kakao)/i.test(s)||/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/.test(s)||/[\w.]+@[\w.]+\.\w+/.test(s); }
const ANI=['호랑이','토끼','다람쥐','펭귄','판다','여우','고양이','강아지','햄스터','부엉이','수달','코알라'];
const ANI_E=['🐯','🐰','🐿️','🐧','🐼','🦊','🐱','🐶','🐹','🦉','🦦','🐨'];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ago=t=>{ if(!t) return '방금'; const d=(Date.now()-t.toMillis())/1000; if(d<60) return '방금'; if(d<3600) return Math.floor(d/60)+'분 전'; if(d<86400) return Math.floor(d/3600)+'시간 전'; if(d<86400*30) return Math.floor(d/86400)+'일 전'; const x=t.toDate(); return `${x.getFullYear()}.${x.getMonth()+1}.${x.getDate()}`; };
async function getSettings(){ if(settings) return settings; try{ const s=await fs.getDoc(fs.doc(db,'settings','main')); settings=s.exists()?s.data():{moderation:true}; }catch(e){ settings={moderation:true}; } return settings; }
export async function submit({page,nick,text,priv,kind}){
  text=(text||'').trim(); nick=(nick||'').trim().slice(0,20);
  if(text.length<2) return {ok:false,msg:'두 글자 이상 적어주세요.'};
  if(bad(text)||bad(nick)) return {ok:false,msg:'욕설이나 다른 사람을 깎아내리는 표현은 올릴 수 없어요. 고쳐서 다시 적어주세요.'};
  if(spam(text)) return {ok:false,msg:'링크, 전화번호, 이메일은 남길 수 없어요. 개인정보 보호를 위해서예요.'};
  if(!await boot()) return {ok:false,msg:'댓글 기능을 준비하고 있어요. 조금만 기다려주세요!'};
  const st=await getSettings();
  const status= priv||kind==='request' ? 'private' : (st.moderation?'pending':'public');
  try{ await fs.addDoc(fs.collection(db,'comments'),{page,nick:nick||'익명',text,status,kind:kind||'comment',createdAt:fs.serverTimestamp()}); }
  catch(e){ return {ok:false,msg:'올리지 못했어요. 잠시 뒤 다시 시도해주세요.'}; }
  return {ok:true,status};
}
export async function mount(el){
  const page=el.dataset.page, kind=el.dataset.kind||'post', isTool=kind==='tool';
  const title=isTool?'사용 후기 · 의견':'댓글', ph=isTool?'써보니 어땠나요? 불편한 점이나 바라는 기능도 좋아요.':'글을 읽고 든 생각이나 궁금한 점을 남겨주세요.';
  const k=Math.floor(Math.random()*ANI.length);
  el.innerHTML=`<h2>${title} <span class="cn" id="cn-${page.replace(/\W/g,'')}">0</span></h2>
  <p class="lead2">로그인 없이 익명으로 남길 수 있어요. 개발자가 직접 읽고 답해요.</p>
  <form class="cform" novalidate>
    <div class="top"><span class="ava">${ANI_E[k]}</span><input type="text" maxlength="20" placeholder="닉네임 (비워두면 익명의 ${ANI[k]})" aria-label="닉네임"></div>
    <textarea maxlength="500" placeholder="${ph}" aria-label="${title}"></textarea>
    <div class="bot"><label class="pv"><input type="checkbox"> 개발자에게만 보이기</label><span class="cnt2">0/500</span><button class="send" type="submit">올리기</button></div>
    <div class="cmsg" hidden></div>
  </form>
  <p class="cguide">남긴 글은 서버에 저장돼요. 욕설, 비하, 광고, 개인정보(전화번호·이메일·링크)는 올릴 수 없고, 운영 원칙에 맞지 않는 글은 숨겨질 수 있어요. <a href="/privacy/" style="color:inherit">개인정보처리방침</a></p>
  <ul class="clist"></ul>`;
  const f=el.querySelector('form'), ta=f.querySelector('textarea'), nk=f.querySelector('input[type=text]'), pv=f.querySelector('.pv input'), msg=f.querySelector('.cmsg'), btn=f.querySelector('.send'), list=el.querySelector('.clist'), cnt=el.querySelector('.cnt2'), cn=el.querySelector('.cn');
  const show=(ok,t,img)=>{ msg.hidden=false; msg.className='cmsg '+(ok?'ok':'no'); msg.innerHTML=`<img src="/assets/endo/${img}.webp" alt=""><span>${esc(t)}</span>`; };
  ta.addEventListener('input',()=>{ cnt.textContent=ta.value.length+'/500'; if(!msg.hidden&&msg.classList.contains('no')) msg.hidden=true; });
  f.addEventListener('submit',async e=>{ e.preventDefault(); btn.disabled=true;
    const r=await submit({page,nick:nk.value||('익명의 '+ANI[k]),text:ta.value,priv:pv.checked,kind:isTool?'review':'comment'}); btn.disabled=false;
    if(!r.ok){ show(false,r.msg,'oops'); return; }
    ta.value=''; cnt.textContent='0/500'; pv.checked=false;
    show(true, r.status==='private'?'개발자에게만 전달했어요. 꼼꼼히 읽어볼게요!': r.status==='pending'?'고마워요! 확인을 거쳐 곧 모두에게 보여요.':'올렸어요. 고마워요!', 'thumbs');
    if(r.status==='public') load(); });
  async function load(){
    if(!await boot()){ list.innerHTML='<li class="cempty">댓글 기능을 준비하고 있어요.</li>'; return; }
    try{
      const q=fs.query(fs.collection(db,'comments'),fs.where('page','==',page),fs.where('status','==','public'),fs.limit(300));
      const snap=await fs.getDocs(q); const all=snap.docs.map(d=>({id:d.id,...d.data()}));
      const top=all.filter(c=>!c.parent).sort((a,b)=>(a.createdAt?.toMillis()||0)-(b.createdAt?.toMillis()||0));
      const reps=all.filter(c=>c.parent);
      cn.textContent=top.length;
      if(!top.length){ list.innerHTML=`<li class="cempty">아직 ${isTool?'후기':'댓글'}가 없어요. 첫 번째로 남겨주세요!</li>`; return; }
      list.innerHTML=top.map(c=>`<li class="c"><div class="meta2"><b>${esc(c.nick||'익명')}</b><span>${ago(c.createdAt)}</span></div><p class="txt">${esc(c.text)}</p>${
        reps.filter(r=>r.parent===c.id).sort((a,b)=>(a.createdAt?.toMillis()||0)-(b.createdAt?.toMillis()||0)).map(r=>`<div class="rep"><img src="/assets/endo/thumbs.webp" alt=""><div><div class="meta2"><b>손안의도구</b><span class="dev">개발자</span><span>${ago(r.createdAt)}</span></div><p class="txt">${esc(r.text)}</p></div></div>`).join('')}</li>`).join('');
    }catch(e){ list.innerHTML='<li class="cempty">댓글을 불러오지 못했어요. 잠시 뒤 다시 열어주세요.</li>'; }
  }
  const io=new IntersectionObserver(es=>{ if(es.some(x=>x.isIntersecting)){ io.disconnect(); load(); } },{rootMargin:'400px'}); io.observe(el);
}
document.querySelectorAll('section.cmts[data-page]').forEach(mount);
window.__sonandoguComments={submit,bad,spam};
