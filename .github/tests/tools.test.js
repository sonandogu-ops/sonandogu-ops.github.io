// 손안의도구 자동 검사: 부가세·연말정산·대출·적금·3.3%·랜덤 뽑기 검산과 화면
// 실행: node .github/tests/tools.test.js (http://localhost:8765 에서 사이트를 띄운 상태)
const {chromium,devices}=require('playwright');
const B=process.env.BASE||'http://localhost:8765';
const out=[]; const ok=(n,g,e)=>{const p=JSON.stringify(g)===JSON.stringify(e); out.push((p?'OK  ':'FAIL')+' '+n+'  '+JSON.stringify(g)+(p?'':'  기대 '+JSON.stringify(e)));};
(async()=>{const b=await chromium.launch(); const errs=[];
 const page=async(u,o)=>{const c=await b.newContext(o||{}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(u+' '+e.message)); p.on('console',m=>{if(m.type()==='error'&&!/google|doubleclick|firebase|ERR_|403/i.test(m.text()))errs.push(u+' console '+m.text());}); await p.goto(B+u,{waitUntil:'load'}); await p.waitForTimeout(400); return p;};
 // 부가세
 let p=await page('/vat/');
 let r=await p.evaluate(()=>{const v=window.__vat.vat; return [v('supply',100000),v('supply',12345),v('total',110000),v('total',33000),v('total',10000),v('total',1)].map(x=>[x.s,x.v,x.t]);});
 ok('부가세 공급 10만',r[0],[100000,10000,110000]); ok('부가세 공급 12,345 (원 미만 버림)',r[1],[12345,1234,13579]);
 ok('부가세 합계 11만',r[2],[100000,10000,110000]); ok('부가세 합계 33,000',r[3],[30000,3000,33000]); ok('부가세 합계 10,000',r[4],[9091,909,10000]); ok('부가세 합계 1원',r[5],[1,0,1]);
 await p.click('#a'); await p.keyboard.type('250000'); await p.waitForTimeout(200);
 ok('부가세 화면(공급 250,000)',(await p.textContent('#res')).trim(),'275,000원');
 await p.click('button[data-mode="total"]'); await p.fill('#a',''); await p.click('#a'); await p.keyboard.type('55000'); await p.waitForTimeout(200);
 ok('부가세 화면(합계 55,000)',(await p.textContent('#res')).trim(),'50,000원');
 ok('부가세 내역',(await p.textContent('#brk')).replace(/\s/g,''),'공급가액50,000원부가세(10%)5,000원합계55,000원');
 await p.context().close();
 // 연말정산 (손계산: 총급여 4천, 1인, 신용 1,200만·체크 600만)
 p=await page('/year-end-tax/');
 r=await p.evaluate(()=>{const Y=window.__ye; const c=Y.yeCard(40e6,12e6,6e6,0,0); const b=Y.yeCalc({S:40e6,fam:1,credit:12e6,check:6e6});
   const w=Y.yeCalc({S:40e6,fam:1,credit:12e6,check:6e6,rent:7.2e6,psav:6e6}); const k=Y.yeCard(60e6,60e6,0,0,2);
   return {c:[c.th,c.ded],b:[b.wd,b.R.TB,b.R.T,b.R.wc,b.fin,b.back],w:[w.pension,w.rent,w.fin,w.back,w.R.cr-w.R.T],k:k.ded,lim:[30e6,40e6,60e6,80e6,130e6].map(S=>Y.yeWorkCredit(5e6,S)),ch:[1,2,3,4].map(Y.yeChildCredit)};});
 ok('연말정산 카드 공제(글 예시 210만)',r.c,[10000000,2100000]);
 ok('연말정산 4천 1인 (근로공제, 과표, 산출, 근로세액공제, 결정, 환급)',r.b,[11250000,21263560,1929534,684000,1245534,18676]);
 ok('연말정산 월세+연금저축 결정 0원, 남는 공제(글)',r.w,[900000,1224000,0,1388760,878466]);
 ok('연말정산 카드 한도 자녀 2명 400만',r.k,4000000);
 ok('근로소득세액공제 한도',r.lim,[740000,684000,660000,500000,200000]);
 ok('자녀세액공제 1~4명',r.ch,[250000,550000,950000,1350000]);
 await p.fill('#amt',''); await p.click('#amt'); await p.keyboard.type('40000000'); await p.fill('#credit','12000000'); await p.fill('#check','6000000'); await p.fill('#psav',''); await p.fill('#rent',''); await p.waitForTimeout(200);
 ok('연말정산 화면 환급액',(await p.textContent('#big')).trim(),'18,676원');
 await p.context().close();
 // 대출 이자 (알려진 값: 1억·연 5%·30년 원리금균등 월 536,822원)
 p=await page('/loan/');
 r=await p.evaluate(()=>{const L=window.__loan.loanCalc; const a=L(1e8,5,360,0,'equal'), b=L(1e8,5,360,0,'principal'), c=L(1e8,5,360,0,'bullet'), g=L(3e7,4.5,36,12,'equal'), z=L(12e6,0,12,0,'equal');
   return {a:[a.firstPay,a.last.bal],b:[b.firstPay,b.last.bal],c:[c.firstPay,c.totI],g:[g.rows[0].pay,g.rows[11].bal,g.last.bal],z:[z.firstPay,z.totI],sum:[a,b,c,g].every(x=>x.rows.reduce((s,r)=>s+r.pr,0)===x.P)};});
 ok('대출 원리금균등 1억 5% 30년 (월, 마지막 잔액)',r.a,[536822,0]); ok('대출 원금균등 첫 달',r.b,[694445,0]);
 ok('대출 만기일시 (월 이자, 총 이자)',r.c,[416667,150000120]); ok('대출 거치 12개월 (이자만, 거치 끝 잔액, 마지막 잔액)',r.g,[112500,30000000,0]);
 ok('대출 0% (월, 이자)',r.z,[1000000,0]); ok('대출 갚은 원금 합계 = 대출금',r.sum,true);
 await p.context().close();
 // 적금·예금 이자 (손계산: 월 100만·12개월·5% 단리 이자 325,000원)
 p=await page('/savings/');
 r=await p.evaluate(()=>{const C=window.__sav.saveCalc; const a=C('saving',1e6,12,5,'simple','normal'), d=C('deposit',1e7,12,4,'simple','normal'), m=C('deposit',1e7,12,5,'monthly','normal'), q=C('deposit',1e7,12,5,'simple','pref'), f=C('saving',1e6,12,5,'simple','free');
   return {a:[a.I,a.tx.a,a.tx.b,a.net,a.total],d:[d.I,d.net],m:m.I,q:q.tx.t,f:f.net,eff:+a.eff.toFixed(2)};});
 ok('적금 100만×12개월 5% (이자, 소득세, 지방세, 세후, 만기)',r.a,[325000,45500,4550,274950,12274950]);
 ok('예금 1천만 4% 12개월 (이자, 세후)',r.d,[400000,338400]); ok('예금 월복리 1천만 5%',r.m,511618);
 ok('세금우대 9.5% 50만 이자의 세금',r.q,47500); ok('비과세',r.f,325000); ok('적금 체감 금리',r.eff,2.71);
 await p.context().close();
 // 3.3%
 p=await page('/freelance-tax/');
 r=await p.evaluate(()=>{const F=window.__ft; const g=[1000000,500000,123456,333].map(x=>{const y=F.fromGross(x);return [y.it,y.lt,y.net];}); const n=F.fromNet(1000000), n2=F.fromNet(967000);
   let bad=0; for(let x=1;x<200000;x+=37){ const y=F.fromNet(x); if(y.net<x||F.fromGross(y.g-1).net>=x) bad++; } return {g,n:[n.g,n.net,n.exact],n2:[n2.g,n2.exact],bad};});
 ok('3.3% 100만',r.g[0],[30000,3000,967000]); ok('3.3% 50만 (가이드 483,500)',r.g[1],[15000,1500,483500]); ok('3.3% 123,456 (10원 미만 버림)',r.g[2],[3700,370,119386]); ok('3.3% 333원',r.g[3],[0,0,333]);
 ok('3.3% 실수령 100만 역산 (가이드 1,034,120)',r.n,[1034120,1000000,true]); ok('3.3% 실수령 967,000 역산',r.n2,[999980,true]); ok('3.3% 역산 최소 지급액 5,400가지 검사',r.bad,0);
 await p.click('#a'); await p.keyboard.type('2000000'); await p.waitForTimeout(200); ok('3.3% 화면 200만',(await p.textContent('#res')).trim(),'1,934,000원');
 await p.context().close();
 // 랜덤
 p=await page('/random/');
 r=await p.evaluate(()=>{const R=window.__rd; const cnt=new Array(10).fill(0); for(let i=0;i<100000;i++) cnt[R.rint(10)]++;
   let dupBad=0, rangeBad=0; for(let i=0;i<2000;i++){ const a=R.pickNums(1,45,6,false); if(new Set(a).size!==6) dupBad++; if(a.some(x=>x<1||x>45)) rangeBad++; }
   const full=R.pickNums(1,10,10,false).sort((a,b)=>a-b); const neg=R.pickNums(-5,5,11,false).sort((a,b)=>a-b);
   const names=R.parseNames('민수\n지우, 서연\n\n 도윤 '); const nm=new Map(); for(let i=0;i<40000;i++){ const w=R.pickNames(['a','b','c','d'],1)[0]; nm.set(w,(nm.get(w)||0)+1); }
   return {min:Math.min(...cnt),max:Math.max(...cnt),dupBad,rangeBad,full,neg,names,nm:[...nm.values()]};});
 out.push(`  난수 0~9 10만 번: 최소 ${r.min}, 최대 ${r.max} (기대 약 10,000씩)`);
 ok('중복 없이 1~45 6개 2,000번 중복·범위 오류',[r.dupBad,r.rangeBad],[0,0]); ok('1~10에서 10개 = 전부',r.full,[1,2,3,4,5,6,7,8,9,10]); ok('음수 범위 -5~5 11개',r.neg,[-5,-4,-3,-2,-1,0,1,2,3,4,5]);
 ok('이름 나누기',r.names,['민수','지우','서연','도윤']); out.push('  이름 4명 1명 추첨 4만 번: '+r.nm.join(', ')+' (기대 약 10,000씩)');
 await p.click('#draw'); await p.waitForTimeout(500); const balls=await p.$$eval('#balls span',s=>s.map(x=>+x.textContent)); ok('화면 로또 버튼 기본 6개',[balls.length,new Set(balls).size,balls.every(x=>x>=1&&x<=45),JSON.stringify(balls)===JSON.stringify([...balls].sort((a,b)=>a-b))],[6,6,true,true]);
 await p.fill('#cnt','50'); await p.click('#draw'); await p.waitForTimeout(200); ok('1~45에서 50개 중복 없이 → 막기',(await p.textContent('#res')).trim(),'중복 없이는 최대 45개까지 뽑을 수 있어요');
 await p.click('button[data-mode="name"]'); await p.fill('#names','가\n나\n다\n라\n마'); await p.fill('#win','2'); await p.click('#draw'); await p.waitForTimeout(500);
 const nb=await p.$$eval('#balls span',s=>s.map(x=>x.textContent)); ok('이름 5명 중 2명',[nb.length,new Set(nb).size,nb.every(x=>'가나다라마'.includes(x))],[2,2,true]);
 await p.context().close();
 // 화면 폭
 for(const [n,o] of [['SE',devices['iPhone SE']],['13',devices['iPhone 13']],['PC',{viewport:{width:1280,height:900}}],['dark',{...devices['iPhone 13'],colorScheme:'dark'}]]){
  for(const u of ['/vat/','/freelance-tax/','/random/']){ const q=await page(u,o); if(u==='/random/'){ await q.click('#draw'); await q.click('button[data-mode="name"]'); }
   const w=await q.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth,!!document.querySelector('.top .hsrch')]); if(w[0]>w[1]+1||!w[2]) out.push(`FAIL 화면 ${n} ${u} ${w}`); await q.context().close(); } }
 out.push('화면 점검 끝'); out.push('오류 '+errs.length+' '+errs.slice(0,5).join(' | '));
 console.log(out.join('\n')); await b.close();
 const bad=out.filter(x=>x.startsWith('FAIL')).length+errs.length; process.exit(bad?1:0);})().catch(e=>{console.error(e); process.exit(1);});
