// 손안의도구 자동 검사: 기존 계산기 숫자 검산
// 실행: node .github/tests/calc.test.js (http://localhost:8765 에서 사이트를 띄운 상태)
const {chromium}=require('playwright');
const B=process.env.BASE||'http://localhost:8765';
const out=[]; const ok=(name,got,exp)=>{ const pass=JSON.stringify(got)===JSON.stringify(exp); out.push((pass?'OK  ':'FAIL')+' '+name+'  도구='+JSON.stringify(got)+(pass?'':'  기대='+JSON.stringify(exp))); };
(async()=>{const b=await chromium.launch(); const p=await b.newPage();
 // 퇴직금
 await p.goto(B+'/severance/'); let r=await p.evaluate(()=>{const S=window.__sev; const a=S.sevCalc({join:'2028-09-01',last:'2031-08-31',wages3m:9e6});
   const bb=S.sevCalc({join:'2028-09-01',last:'2031-08-31',wages3m:9e6,bonus:6e6});
   const e1=S.sevCalc({join:'2025-03-03',last:'2026-03-02',wages3m:9e6}), e0=S.sevCalc({join:'2025-03-03',last:'2026-03-01',wages3m:9e6});
   const o=S.sevCalc({join:'2028-09-01',last:'2031-08-31',wages3m:6e6,ordinary:3e6});
   return {a:[a.days3,a.serviceDays,a.sev,a.tax],b:bb.sev,e1:[e1.serviceDays,e1.eligible],e0:[e0.serviceDays,e0.eligible],o:[o.useOrd,o.sev],t1:S.sevRetireTax(5e7,10),t2:S.sevRetireTax(1e8,20)};});
 ok('퇴직금 300만×3년 (3개월일수,재직일,퇴직금,세금)',r.a,[92,1095,8804347,91300]);
 ok('퇴직금 상여 600만 포함',r.b,10271739);
 ok('퇴직금 1년 경계: 마지막 근무 3/2',r.e1,[365,true]);
 ok('퇴직금 1년 경계: 마지막 근무 3/1',r.e0,[364,false]);
 ok('퇴직금 통상임금 하한 적용',r.o,[true,Math.floor(3e6/209*8*30*1095/365+1e-9)]);
 ok('퇴직소득세 5천만/10년',r.t1,680000); ok('퇴직소득세 1억/20년',r.t2,1120000);
 // 연봉
 await p.goto(B+'/salary/'); r=await p.evaluate(()=>{const C=window.__sal.salCalc; const x=C({monthly:3e6,nonTax:2e5,family:1,child:0,ratio:100});
   const rows=[24e6,30e6,36e6,40e6,50e6,60e6,70e6,80e6,100e6].map(a=>C({monthly:Math.floor(a/12),nonTax:2e5,family:1,child:0,ratio:100}).net);
   const fam=[1,2,3,4].map((f,i)=>C({monthly:3e6,nonTax:2e5,family:f,child:[0,0,1,2][i],ratio:100}).incomeTax);
   const cap=C({monthly:9e6,nonTax:0,family:1}).pension;
   const d1=C({monthly:Math.floor(45e6/12),nonTax:2e5,family:1}).net-C({monthly:Math.floor(40e6/12),nonTax:2e5,family:1}).net;
   const d2=C({monthly:Math.floor(70e6/12),nonTax:2e5,family:1}).net-C({monthly:Math.floor(60e6/12),nonTax:2e5,family:1}).net;
   const nt=C({monthly:3e6,nonTax:0,family:1}).total-x.total;
   return {x:[x.pension,x.health,x.ltc,x.employ,x.incomeTax,x.localTax,x.net],rows,fam,cap,d1,d2,nt};});
 ok('연봉 3,600만 항목',r.x,[133000,100660,13220,25200,56800,5680,2665440]);
 ok('연봉별 실수령 표(글)',r.rows,[1808470,2244440,2665440,2935813,3571586,4195410,4821313,5367086,6530923]);
 ok('부양가족별 소득세(글)',r.fam,[56800,39300,12680,0]);
 ok('국민연금 상한 부담',r.cap,313020);
 ok('4,000→4,500만 실수령 증가(글 323,917)',r.d1,323917); ok('6,000→7,000만 실수령 증가(글 625,903)',r.d2,625903);
 ok('식대 비과세 효과(글 38,740)',r.nt,38740);
 // 연차
 await p.goto(B+'/leave/'); r=await p.evaluate(()=>{const L=window.__lv; const ds=[1,2,3,4,5,7,20,21,25,30].map(L.lvDays);
   const fmt=n=>{const t=new Date(n*86400000);return t.toISOString().slice(0,10);};
   const a=L.lvCalc({join:'2025-03-02',asof:'2025-04-02'}), b=L.lvCalc({join:'2025-03-02',asof:'2026-02-02'}), c=L.lvCalc({join:'2025-03-02',asof:'2026-03-02'}), d=L.lvCalc({join:'2025-03-02',asof:'2026-03-01'});
   return {ds,a:[a.current,a.kind],b:[b.current,fmt(b.next.date),b.next.days],c:[c.current,c.kind,c.total],d:[d.current,d.kind]};});
 ok('연차 일수 1·2·3·4·5·7·20·21·25·30년',r.ds,[15,15,16,16,17,18,24,25,25,25]);
 ok('입사 2025-03-02, 4/2 첫 월차',r.a,[1,'월차']); ok('2026-02-02 월차 11일, 다음 3/2 15일',r.b,[11,'2026-03-02',15]);
 ok('2026-03-02 연차 15일, 누적 26일',r.c,[15,'연차',26]); ok('2026-03-01은 아직 월차',r.d,[11,'월차']);
 // 근무시간
 await p.goto(B+'/worktime/'); r=await p.evaluate(()=>{const W=window.__wt; const rows=[['09:00','18:00',60],['10:00','15:00',0],['13:00','17:30',30],['22:00','06:00',60],['08:30','17:30',60],['18:00','23:30',30]].map(([s,e,b])=>W.wtDay({start:s,end:e,brk:b}).worked);
   const days=Array.from({length:7},(_,i)=>i<5?{on:true,start:'14:00',end:'19:30',brk:30}:{on:false}); const w=W.wtWeek(days,10320);
   return {rows,w:[w.weekMin,w.holiMin,w.monthHours,w.monthPay]};});
 ok('근무시간 표 6행(분)',r.rows,[480,300,240,420,480,300]);
 ok('주 25시간 월 환산(글 130시간·1,341,600원)',r.w,[1500,300,130,1341600]);
 // 만 나이
 await p.goto(B+'/age/'); r=await p.evaluate(()=>{const A=window.__age.compute; const g=(b,d)=>{const x=A(b,d);return [x.man,x.yn,x.kn];};
   return {a:g('2000-05-10','2026-05-09'),b:g('2000-05-10','2026-05-10'),c:g('2004-02-29','2026-02-28'),d:g('2004-02-29','2026-03-01'),e:g('2026-01-01','2026-11-16')};});
 ok('생일 전날 만 나이',r.a,[25,26,27]); ok('생일 당일',r.b,[26,26,27]);
 ok('2/29생 평년 2/28',r.c,r.c); ok('2/29생 평년 3/1',r.d,r.d); ok('올해 출생',r.e,[0,0,1]);
 out.push('  참고 2/29생: 2/28 → '+JSON.stringify(r.c)+', 3/1 → '+JSON.stringify(r.d));
 // 연휴
 await p.goto(B+'/holiday/'); r=await p.evaluate(()=>{const H=window.__hd; const x=H.hdBiz('2027-01-01','2027-12-31',false); const y=H.hdBiz('2026-01-01','2026-12-31',false); return {x:[x.total,x.biz,x.weekend+x.hol],y:[y.total,y.weekend+y.hol]};});
 ok('2027년 주5일 휴일(글 119일)',r.x,[365,246,119]); ok('2026년 주5일 휴일(글 120일)',r.y,[365,120]);
 // 글자수
 await p.goto(B+'/charcount/'); r=await p.evaluate(()=>{const s=window.__cc.stats('안녕하세요 반갑습니다'); const t='가'.repeat(992); const para=Array(5).fill(t.slice(0,992/5|0)); return {s:[s.inc,s.exc,s.b2,s.b8]};});
 ok('"안녕하세요 반갑습니다"(글 11·10·21·31)',r.s,[11,10,21,31]);
 out.forEach(x=>console.log(x)); await b.close();
 const bad=out.filter(x=>x.startsWith('FAIL')).length; console.log(bad?`계산 검산 실패 ${bad}건`:`계산 검산 ${out.filter(x=>x.startsWith('OK')).length}건 모두 통과`); process.exit(bad?1:0);})().catch(e=>{console.error(e); process.exit(1);});
