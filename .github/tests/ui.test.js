// 손안의도구 자동 검사: 화면과 버튼
// 실행: node .github/tests/ui.test.js (python3 .github/tests/serve.py . 로 사이트를 띄운 상태)
// - 좁은 화면(아이폰 SE, 320px)에서 모든 페이지가 옆으로 삐져나오지 않는지
// - 모든 도구에 값을 넣고 버튼을 눌러도 오류·NaN이 없는지
// - 모든 도구에 결과 복사와 초기화 버튼이 있는지
// - 결과 복사 글에 든 링크를 열면 같은 결과가 나오는지
// - 평수 계산, 없는 주소(404) 추천
const {chromium,devices}=require('playwright');
const fs=require('fs'), path=require('path');
const B=process.env.BASE||'http://localhost:8765';
const ROOT=path.join(__dirname,'..','..');
const fails=[], notes=[];
const fail=m=>fails.push(m), note=m=>notes.push(m);

const sitemap=fs.readFileSync(path.join(ROOT,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>https:\/\/sonandogu\.com([^<]*)<\/loc>/g)].map(m=>m[1]);
const favjs=fs.readFileSync(path.join(ROOT,'assets/favorites.js'),'utf8');
const TOOLS=JSON.parse(favjs.match(/var TOOLS=(\[[^\]]*\])/)[1].replace(/'/g,'"'));

/* 결과 복사·초기화가 없어도 되는 도구 (이유) */
const NO_COPY={'/traditional/yut/':'게임이라 복사할 결과가 없음','/party/manito/':'진행자 화면에서 사람마다 복사'};
const COPY_RE=/복사|공유/, RESET_RE=/초기화|지우기|비우기|다시|처음부터/;

async function fillAll(p,s){
  if(s==='/worktime/'){ await p.fill('#d-s','09:00'); await p.fill('#d-e','18:00'); await p.dispatchEvent('#d-e','input'); await p.dispatchEvent('#d-e','change'); return; }
  if(s==='/rent-convert/'){ await p.fill('#J','300000000'); await p.dispatchEvent('#J','input'); await p.fill('#D','120000000'); await p.dispatchEvent('#D','input'); await p.fill('#base','3.25'); await p.dispatchEvent('#base','input'); return; }
  if(s==='/wage/'){ await p.click('#minBtn'); await p.click('#qFill').catch(()=>{}); return; }
  const els=await p.$$('main input:visible, .work input:visible, .card input:visible, main textarea:visible');
  for(const el of els){ try{
    const t=(await el.getAttribute('type'))||'text'; if(['checkbox','radio','hidden','file','search'].includes(t)) continue;
    if(t==='date') await el.fill(s==='/age/'?'1995-06-15':'2024-03-01');
    else if(t==='time') await el.fill('09:00');
    else if((await el.evaluate(e=>e.tagName))==='TEXTAREA') await el.fill('철수\n영희\n민수\n지우\n서준\n하윤');
    else { await el.fill(''); await el.type('35000'); }
    await el.dispatchEvent('input'); await el.dispatchEvent('change');
  }catch(e){} }
}
const live=p=>p.evaluate(()=>[...document.querySelectorAll('[aria-live]')].map(e=>e.innerText.replace(/\s+/g,' ').trim()).join(' / '));

(async()=>{
  const b=await chromium.launch();

  /* 1) 좁은 화면 */
  { const p=await b.newPage({...devices['iPhone SE']});
    for(const u of urls){ await p.goto(B+u,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(150);
      const r=await p.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
      if(r[0]>r[1]+1) fail(`좁은 화면에서 옆으로 삐져나옴: ${u} (${r[0]}px / ${r[1]}px)`); }
    note(`좁은 화면 ${urls.length}쪽 검사`); await p.close(); }

  /* 2) 모든 도구: 값 넣고 버튼 누르기, 버튼 갖춤 */
  for(const s of TOOLS){
    const ctx=await b.newContext({...devices['iPhone 13']}); const p=await ctx.newPage(); const errs=[];
    p.on('pageerror',e=>errs.push(e.message.slice(0,120))); p.on('dialog',d=>d.dismiss().catch(()=>{}));
    await p.goto(B+s,{waitUntil:'load'}); await p.waitForTimeout(400);
    const labels=await p.$$eval('button',bs=>bs.map(b=>(b.innerText||'')+' '+(b.getAttribute('aria-label')||'')));
    if(!NO_COPY[s]&&!labels.some(x=>COPY_RE.test(x))) fail(`결과 복사 버튼이 없음: ${s}`);
    if(!labels.some(x=>RESET_RE.test(x))) fail(`초기화 버튼이 없음: ${s}`);
    await fillAll(p,s); await p.waitForTimeout(300);
    const btns=await p.$$('main button:visible, section button:visible');
    for(const bt of btns.slice(0,40)){ try{ const t=((await bt.innerText())||'')+((await bt.getAttribute('aria-label'))||'');
      if(/공유|복사|인쇄|저장|PDF|이미지|로그인|삭제|초기화|지우기|share|copy|print|×/i.test(t)) continue;
      await bt.click({timeout:1500}); await p.waitForTimeout(100); }catch(e){} }
    await p.waitForTimeout(3500);
    const r=await p.evaluate(()=>({weird:(document.body.innerText.match(/\bNaN\b|undefined|\[object Object\]|Infinity/g)||[]).slice(0,3),sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth}));
    if(errs.length) fail(`자바스크립트 오류: ${s} ${errs.slice(0,2).join(' / ')}`);
    if(r.weird.length) fail(`화면에 이상한 글자: ${s} ${r.weird.join(',')}`);
    if(r.sw>r.W+1) fail(`눌러본 뒤 옆으로 삐져나옴: ${s} ${r.sw}/${r.W}`);
    await ctx.close();
  }
  note(`도구 ${TOOLS.length}개 눌러보기`);

  /* 3) 결과 복사 글 속 링크로 같은 결과 열기 */
  let shared=0;
  for(const s of TOOLS){
    const html=fs.readFileSync(path.join(ROOT,s,'index.html'),'utf8');
    const tag=(html.match(/<script src="\/assets\/toolbar\.js[^>]*>/)||[''])[0];
    const anchor=(tag.match(/data-anchor="([^"]+)"/)||[])[1];
    if(!anchor||!/data-(keys|ids)=/.test(tag)) continue;
    const c1=await b.newContext({viewport:{width:1280,height:900}}); await c1.grantPermissions(['clipboard-read','clipboard-write']);
    const p=await c1.newPage(); await p.goto(B+s); await p.waitForTimeout(400); await fillAll(p,s); await p.waitForTimeout(600);
    const before=await live(p);
    await p.click('#'+anchor); await p.waitForTimeout(400);
    const txt=await p.evaluate(()=>navigator.clipboard.readText()).catch(()=> '');
    const link=(txt.match(/https?:\/\/\S+#[sz]=\S+/)||[''])[0];
    if(!link){ fail(`결과 복사 글에 링크가 없음: ${s}`); await c1.close(); continue; }
    const c2=await b.newContext({viewport:{width:1280,height:900}}); const q=await c2.newPage(); await q.goto(link); await q.waitForTimeout(1200);
    const after=await live(q);
    if(after!==before) fail(`링크로 열면 결과가 다름: ${s}\n    원래: ${before.slice(0,120)}\n    링크: ${after.slice(0,120)}`);
    if(link.length>400) fail(`결과 링크가 너무 김: ${s} ${link.length}자`);
    shared++; await c1.close(); await c2.close();
  }
  note(`결과 링크 ${shared}개 도구`);

  /* 4) 평수 계산 */
  { const p=await b.newPage(); await p.goto(B+'/pyeong/'); await p.waitForTimeout(300);
    const v=await p.evaluate(()=>{const c=window.__py.conv; return [c('m2p',84).p,c('p2m',1).m,c('p2m',25).m];});
    if(Math.abs(v[0]-25.41)>0.001||Math.abs(v[1]-400/121)>1e-9||Math.abs(v[2]-82.6446)>0.001) fail(`평수 계산이 이상함: ${v}`);
    await p.close(); }

  /* 5) 없는 주소 → 비슷한 페이지 추천 */
  { const p=await b.newPage();
    for(const [u,exp] of [['/salry/','/salary/'],['/party/rulette/','/party/roulette/'],['/freelance/','/freelance-tax/']]){
      const r=await p.goto(B+u); await p.waitForTimeout(900);
      if(r.status()!==404) fail(`없는 주소인데 404가 아님: ${u}`);
      const h=await p.locator('#guess a').getAttribute('href').catch(()=>null);
      if(h!==exp) fail(`404 추천이 이상함: ${u} → ${h} (기대 ${exp})`); }
    await p.close(); }

  await b.close();
  notes.forEach(x=>console.log('· '+x));
  if(fails.length){ console.log(`\n문제 ${fails.length}건`); fails.forEach(x=>console.log('- '+x)); process.exit(1); }
  console.log('\n화면과 버튼 검사 모두 통과'); process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
