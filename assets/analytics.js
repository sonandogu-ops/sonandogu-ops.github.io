// 손안의도구 방문자 통계 (Cloudflare Web Analytics · 쿠키를 쓰지 않는 방식)
// Cloudflare에서 받은 토큰을 아래 따옴표 안에 넣으면 통계가 켜집니다.
(function(){
  var TOKEN='50724541c83044168f096f10e8e2c461';
  if(!TOKEN||TOKEN.indexOf('PASTE')===0) return;
  if(location.hostname!=='sonandogu.com') return;          // 내 컴퓨터에서 열어볼 땐 세지 않음
  var s=document.createElement('script'); s.defer=true;
  s.src='https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon',JSON.stringify({token:TOKEN}));
  document.head.appendChild(s);
})();
