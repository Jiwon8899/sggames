/* 물레 공방 (Clay Wheel) — 돌아가는 점토의 옆을 누르고, 끌어올리고, 열고, 넓혀서 손님이 원하는 그릇을 빚는다.
   점토는 '높이별 반지름' 단면을 회전시킨 입체이며, 부피는 늘 보존된다(누르면 다른 곳이 솟고, 끌어올리면 벽이 얇아진다). */
(function(){
  'use strict';
  /* ---------- 점토 모델 (DOM 없음, node 검증용) ----------
     점토 = 높이 H 위의 N개 단면. r[i] 바깥 반지름, q[i] 안쪽 빈 공간 반지름(0이면 꽉 참).
     부피 ∝ Σ(r²-q²)·H/N 은 모든 조작 뒤 정확히 보존된다(높이를 늘이거나 줄여서 맞춤). */
  var N=64,WMIN=3.2,RMIN=4.5,RMAX=124,HMIN=34,HMAX=238,FLOOR=.1;
  function lump(){var c={r:new Float64Array(N),q:new Float64Array(N),H:72},i,t;
    for(i=0;i<N;i++){t=i/(N-1);var r=52*(1-.06*t);if(t>.86){var u=(t-.86)/.14;r*=Math.sqrt(Math.max(0,1-u*u*.3))}if(t<.06)r*=.94+t;c.r[i]=r}
    c.V=vol(c);return c}
  var V0=null;
  function vol(c){var s=0;for(var i=0;i<N;i++)s+=c.r[i]*c.r[i]-c.q[i]*c.q[i];return s*c.H/N}
  function clone(c){return {r:new Float64Array(c.r),q:new Float64Array(c.q),H:c.H,V:c.V}}
  function yAt(c,i){return i/(N-1)*c.H}
  function rAt(c,h,arr){arr=arr||c.r;if(h<0||h>c.H)return 0;var f=h/c.H*(N-1),i=Math.min(N-2,Math.floor(f)),u=f-i;return arr[i]*(1-u)+arr[i+1]*u}
  function gauss(c,i,h,s){var d=(yAt(c,i)-h)/s;return Math.exp(-.5*d*d)}
  /* 부피를 원래대로: 먼저 높이로, 높이 한계에 걸리면 반지름 비율로 */
  function conserve(c){var S=0,i;for(i=0;i<N;i++)S+=c.r[i]*c.r[i]-c.q[i]*c.q[i];S/=N;if(S<=1e-6)return;
    var H=c.V/S;
    if(H>HMAX||H<HMIN){var Hc=H>HMAX?HMAX:HMIN,k=Math.sqrt(c.V/(Hc*S));for(i=0;i<N;i++){c.r[i]*=k;c.q[i]*=k}c.H=Hc}else c.H=H}
  function smooth(c,a){if(a<=0)return;var r=c.r,q=c.q,nr=new Float64Array(N),nq=new Float64Array(N),i;a=Math.min(.45,a);
    for(i=0;i<N;i++){var l=r[Math.max(0,i-1)],R=r[Math.min(N-1,i+1)];nr[i]=r[i]+a*((l+R)/2-r[i]);
      if(q[i]>0){var ql=q[Math.max(0,i-1)],qr=q[Math.min(N-1,i+1)];if(i===N-1)qr=q[i];nq[i]=q[i]+a*((ql+qr)/2-q[i]);if(ql<=0)nq[i]=q[i]}}
    for(i=0;i<N;i++){r[i]=nr[i];q[i]=Math.max(0,nq[i])}}
  function clampR(c){for(var i=0;i<N;i++){if(c.r[i]>RMAX){c.q[i]=Math.max(0,c.q[i]-(c.r[i]-RMAX));c.r[i]=RMAX}if(c.r[i]<.5)c.r[i]=.5;if(c.q[i]<.4)c.q[i]=0}}
  /* 둘레를 안쪽으로 누르기: 빠진 점토의 40%는 주변이 살짝 부풀고 나머지는 위로 올라간다 */
  function push(c,h,d,s){var i,lost=0,w=new Float64Array(N);if(d<=0)return;
    for(i=0;i<N;i++){w[i]=gauss(c,i,h,s);var dd=Math.min(d*w[i],c.r[i]-1),r0=c.r[i],q0=c.q[i];if(dd<=0)continue;
      c.r[i]-=dd;if(q0>0)c.q[i]=Math.max(0,q0-dd*.9);lost+=r0*r0-q0*q0-(c.r[i]*c.r[i]-c.q[i]*c.q[i])}
    var den=0,b=new Float64Array(N);
    for(i=0;i<N;i++){var e=(yAt(c,i)-h)/(3.2*s);b[i]=(1-w[i])*Math.exp(-e*e);den+=2*Math.max(1,c.r[i]-c.q[i])*b[i]}
    if(den>0){var k=.4*lost/den;for(i=0;i<N;i++)c.r[i]+=k*b[i]}}
  /* 바깥으로 밀기(빈 공간이 있으면 벽째 넓히고, 없으면 살짝 부풀림) */
  function widen(c,h,d,s){if(d<=0)return;for(var i=0;i<N;i++){var dd=d*gauss(c,i,h,s);if(c.q[i]>0){c.r[i]+=dd*.86;c.q[i]+=dd}else c.r[i]+=dd*.35}}
  /* h 아래에서 위로 끌어올리기: 위쪽 벽이 얇아지고 보존 법칙 때문에 키가 커진다 */
  function pull(c,h,a,s){if(a<=0)return;for(var i=0;i<N;i++){var y=yAt(c,i),t=(y-(h-s))/(2*s),w=t<=0?0:t>=1?1:t*t*(3-2*t);if(!w)continue;
      if(c.q[i]>0)c.r[i]-=a*w*(c.r[i]-c.q[i])*.9;else c.r[i]-=a*w*c.r[i]*.42}}
  /* 윗면 가운데 누르기: 바닥 위쪽에 빈 공간을 만들고 점점 넓힌다 */
  function open(c,a){if(a<=0)return;for(var i=0;i<N;i++){var t=(i/(N-1)-FLOOR)/(1-FLOOR);if(t<=0)continue;
      var w=t>=.32?1:(t/.32)*(t/.32)*(3-2*t/.32),goal=.62*c.r[i];if(goal>c.q[i])c.q[i]+=Math.min(1,a)*w*(goal-c.q[i])}}
  function settle(c,sm){clampR(c);smooth(c,sm);clampR(c);conserve(c)}
  /* 무너짐 판정: 벽이 너무 얇음 / 목이 너무 가늘음 / 위가 바닥보다 너무 넓음 */
  function collapsed(c){var rb=(c.r[0]+c.r[1]+c.r[2])/3,mx=0;
    for(var i=0;i<N;i++){if(c.q[i]>0&&c.r[i]-c.q[i]<WMIN)return 'thin';if(c.r[i]<RMIN&&i<N-1)return 'neck';if(i>N*.3)mx=Math.max(mx,c.r[i])}
    if(mx>rb*3.3)return 'slump';return null}
  function depth(c){for(var i=0;i<N;i++)if(c.q[i]>.8)return c.H*(1-i/(N-1));return 0}
  /* 점수: 같은 비율 높이끼리 바깥 반지름 오차(평균·RMS·최대) + 높이 차 + 입구(안쪽 반지름, 깊이) 차 */
  function compare(c,t){var Hm=Math.max(c.H,t.H),M=48,s=0,s2=0,mx=0,i;
    for(i=0;i<M;i++){var u=(i+.5)/M,d=Math.abs(rAt(c,u*c.H)-rAt(t,u*t.H));s+=d;s2+=d*d;if(d>mx)mx=d}
    var dh=Math.abs(c.H-t.H),dq=Math.abs(c.q[N-1]-t.q[N-1]),dd=Math.abs(depth(c)-depth(t));
    return .5*s/M+.5*Math.sqrt(s2/M)+.25*mx+.2*dh+.14*dq+.05*dd}
  var STAR=[4,7.5,12];
  function stars(err){return err<STAR[0]?3:err<STAR[1]?2:err<STAR[2]?1:0}
  /* 레시피(조작 순서)를 시작 덩어리에서 실행해 목표를 만든다 → 항상 만들 수 있는 모양.
     조작 높이는 현재 높이에 대한 비율 */
  /* 레시피 한 줄 = [종류, 높이 비율, 세기, 반복]. p 누르기, u 끌어올리기, o 열기, w 넓히기 */
  function apply(c,op){var h=op[1]*c.H;
    if(op[0]==='p')push(c,h,op[2],9);else if(op[0]==='u')pull(c,h,op[2],9);
    else if(op[0]==='o')open(c,op[2]);else if(op[0]==='w')widen(c,h,op[2],9);settle(c,.06)}
  function recipe(ops){var c=lump();ops.forEach(function(op){for(var k=0;k<(op[3]||1);k++)apply(c,op)});return c}
  /* 무작위 목표: 시작 덩어리에서 무작위 손놀림을 실제로 실행해서 만든다 → 항상 도달 가능 */
  function genOps(rnd){var ops=[],i,n;function R(a,b){return a+(b-a)*rnd()}function I(a,b){return Math.floor(R(a,b+1))}
    n=I(1,2);for(i=0;i<n;i++)ops.push(['u',R(.04,.35),R(.07,.13),I(2,6)]);
    var tail=[];if(rnd()<.7){ops.push(['o',0,.5,I(2,5)]);n=I(0,2);for(i=0;i<n;i++)tail.push(['w',R(.35,.95),R(2,3.5),I(2,6)])}
    n=I(rnd()<.5?1:0,2);for(i=0;i<n;i++)tail.push(['p',R(.2,.92),R(3,5),I(2,5)]);
    for(i=tail.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),t=tail[i];tail[i]=tail[j];tail[j]=t}
    return ops.concat(tail)}
  function generate(rnd){for(var tries=0;tries<200;tries++){var ops=genOps(rnd),c=lump(),ok=true;
      for(var i=0;i<ops.length&&ok;i++)for(var k=0;k<ops[i][3]&&ok;k++){apply(c,ops[i]);if(collapsed(c))ok=false}
      if(!ok)continue;var mn=1e9;for(i=0;i<N;i++)if(c.q[i]>0)mn=Math.min(mn,c.r[i]-c.q[i]);
      if(mn<WMIN+2.5||compare(c,lump())<12)continue;c.ops=ops;return c}
    return recipe([['u',.08,.12,5]])}

  /* ---------- 주문 ---------- */
  var HAND=[
    {id:'cyl',ko:'기둥 컵',en:'Tall tumbler',ops:[['u',.08,.12,7]]},
    {id:'bowl',ko:'밥그릇',en:'Rice bowl',ops:[['o',0,.5,4],['w',.85,3,6],['w',.6,2,4]]},
    {id:'waist',ko:'잘록 꽃병',en:'Waisted vase',ops:[['u',.08,.12,5],['p',.5,4,6]]},
    {id:'jar',ko:'목 좁은 항아리',en:'Narrow-neck jar',ops:[['u',.08,.1,4],['o',0,.5,4],['w',.45,3,4],['p',.88,4,5]]},
    {id:'cup',ko:'머그컵',en:'Mug',ops:[['u',.08,.12,5],['o',0,.5,5]]},
    {id:'dish',ko:'넓은 접시',en:'Wide dish',ops:[['o',0,.5,5],['w',.92,3.5,7],['w',.75,2.5,4]]},
    {id:'twin',ko:'쌍둥이 탑',en:'Twin tower',ops:[['u',.06,.12,7],['p',.35,4,4],['p',.75,4,4]]},
    {id:'pot',ko:'화분',en:'Flower pot',ops:[['u',.08,.1,3],['o',0,.5,4],['w',.9,3,5],['w',.6,2,3],['p',.12,3,4]]},
    {id:'urn',ko:'나팔 항아리',en:'Flared urn',ops:[['u',.08,.11,5],['o',0,.5,4],['w',.42,3,4],['p',.78,4,5],['w',.97,2.5,4]]},
    {id:'bottle',ko:'물병',en:'Water bottle',ops:[['u',.06,.12,8],['o',0,.5,3],['p',.8,4,6],['w',.97,2,3]]},
    {id:'moon',ko:'달항아리',en:'Moon jar',ops:[['u',.08,.1,3],['o',0,.5,4],['w',.5,3.5,5],['p',.93,4,5]]},
    {id:'slender',ko:'긴 꽃병',en:'Tall vase',ops:[['u',.06,.13,9],['o',0,.5,3],['p',.55,3.5,4],['w',.95,2.5,4]]}];
  var HINT=[{ko:'누르면서 위로 끌어올려요',en:'Press and drag up to raise the clay'},
    {ko:'윗면 가운데를 눌러 열고, 안에서 바깥으로',en:'Open the top, then push out from inside'},
    {ko:'옆을 눌러 허리를 잘록하게',en:'Press the side to pinch a waist'},
    {ko:'열고 → 넓히고 → 목을 조여요',en:'Open, widen, then squeeze the neck'}];
  var GUEST=[
    {ko:'보리',en:'Bori',kind:'bear',fur:'#b98559',in:'#f0d2ae',gl:[64,118,196]},
    {ko:'모모',en:'Momo',kind:'bunny',fur:'#f3eee6',in:'#f6b8c4',gl:[226,112,140]},
    {ko:'루루',en:'Ruru',kind:'fox',fur:'#e88a3c',in:'#fff1dc',gl:[86,164,128]},
    {ko:'피피',en:'Pipi',kind:'peng',fur:'#33405a',in:'#f6f2ea',gl:[238,186,58]},
    {ko:'토리',en:'Tori',kind:'frog',fur:'#7cbf58',in:'#d8f0b4',gl:[150,104,196]},
    {ko:'나비',en:'Nabi',kind:'cat',fur:'#8d8d9c',in:'#f2c6cc',gl:[214,96,62]}];
  function nameFor(t){var mx=0,i;for(i=0;i<N;i++)mx=Math.max(mx,t.r[i]);var top=t.r[N-1];
    if(t.q[N-1]<=0)return {ko:'장식 기둥',en:'Ornament'};
    if(top<mx*.62)return {ko:'항아리',en:'Jar'};if(t.H<mx*1.2)return {ko:'그릇',en:'Bowl'};return {ko:'꽃병',en:'Vase'}}
  function makeOrder(n,rnd){var t,nm;
    if(n<HAND.length){t=recipe(HAND[n].ops);nm={ko:HAND[n].ko,en:HAND[n].en}}else{t=generate(rnd);nm=nameFor(t)}
    return {t:t,name:nm,guest:GUEST[n%GUEST.length],n:n}}

  /* ---------- 화면 배치 ---------- */
  var CX=180,BY=512,K=.22,FONT='Jua, system-ui, sans-serif';
  var BTN={reset:{x:12,y:584,w:72,h:42},speed:{x:90,y:584,w:92,h:42},fire:{x:188,y:584,w:116,h:42}};
  var c,ord,orderN,phase,pt,time,streak,fast,spin,T,blink,mood,moodT,mode,lastPy,drops,motes,sparks,flopC,flopDir,
      fired,kb,cursor,hintT=0,strokeLow=1e9,kbLow=null,keys,hintOn,touched,lastStars,embers,shown,live,tickS,resultPts,wasDown;
  function L(a,ko,en){return a.lang==='ko'?ko:en}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function inB(b,x,y){return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h}
  function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
  function rgb(col,k,add){add=add||0;return 'rgb('+Math.max(0,Math.min(255,col[0]*k+add|0))+','+Math.max(0,Math.min(255,col[1]*k+add|0))+','+Math.max(0,Math.min(255,col[2]*k+add|0))+')'}
  var CLAY=[150,122,104];

  function newClay(){c=lump();cursor=c.H*.5}
  function nextOrder(a){ord=makeOrder(orderN,Math.random);newClay();phase='shape';pt=0;mood='idle';moodT=0;shown=0;touched=false;hintOn=true;hintT=0}
  function sigma(){return fast?14:9}

  /* ---------- 조작 ---------- */
  function drip(x,y,dir){if(drops.length<60)drops.push({x:x,y:y,vx:dir*(50+Math.random()*90),vy:-60-Math.random()*90,l:.5+Math.random()*.3,t:0})}
  function shapeInput(dt,inp,a){var did=false,s=sigma(),pullK=(fast?.42:.26)/Math.max(60,c.H),i;
    if(inp.down&&inp.x!=null&&mode){var px=inp.x,py=inp.y,h=BY-py,dx=Math.abs(px-CX),hc=Math.max(0,Math.min(c.H,h)),side=px<CX?-1:1;
      if(mode==='out'){var r0=rAt(c,hc);
        if(dx<r0&&h<=c.H+4){push(c,hc,(r0-Math.max(dx,RMIN+.6))*Math.min(1,6*dt),s);did=true}
        if(dx<r0+14)strokeLow=Math.min(strokeLow,hc);var up=lastPy!=null?lastPy-py:0;if(up>0&&dx<r0+14&&h<c.H+6){pull(c,Math.max(0,Math.min(strokeLow,hc)-4),up*pullK,s);did=true}
        if(did&&Math.random()<.5)drip(CX+side*r0,py,side)}
      else if(mode==='in'){var hi=Math.min(hc,c.H-1),q0=rAt(c,hi,c.q);
        if(q0>.5&&dx>q0){widen(c,hi,Math.min(RMAX,dx)-q0>0?(Math.min(RMAX,dx)-q0)*Math.min(1,5*dt):0,s);did=true;if(Math.random()<.3)drip(CX+side*rAt(c,hi),py,side)}}
      else if(mode==='open'){open(c,1.25*dt);did=true;if(Math.random()<.25)drip(CX+(Math.random()-.5)*20,BY-c.H,Math.random()<.5?-1:1)}
      lastPy=py}else lastPy=null;
    /* 키보드: ↑↓ 높이, ← 누르기, → 넓히기, Shift+↑ 끌어올리기, O 열기 */
    var sh=keys.ShiftLeft||keys.ShiftRight;
    if(keys.ArrowUp&&sh){if(kbLow==null)kbLow=cursor;pull(c,Math.min(kbLow,cursor),(fast?.75:.45)*dt,s);cursor+=30*dt;did=true;if(Math.random()<.3)drip(CX-rAt(c,cursor),BY-cursor,-1)}
    else if(keys.ArrowUp)cursor+=95*dt;
    if(!(keys.ArrowUp&&sh))kbLow=null;
    if(keys.ArrowDown)cursor-=95*dt;
    cursor=Math.max(0,Math.min(c.H,cursor));
    if(keys.ArrowLeft){push(c,cursor,22*dt,s);did=true;if(Math.random()<.3)drip(CX-rAt(c,cursor),BY-cursor,-1)}
    if(keys.ArrowRight){widen(c,cursor,16*dt,s);did=true}
    if(keys.KeyO){open(c,1.2*dt);did=true}
    if(did){touched=true;settle(c,(fast?1.6:.8)*dt);cursor=Math.min(cursor,c.H);
      if(Math.random()<dt*14)a.beep(90+Math.random()*30,.05,'sine');
      var why=collapsed(c);if(why)flop(a,why)}}
  function flop(a,why){phase='flop';pt=0;flopC=clone(c);flopDir=Math.random()<.5?-1:1;time=Math.max(0,time-3);streak=0;mode=null;
    mood='shock';moodT=1.4;a.sfx('hit');a.shake(9);a.burst(CX,BY-30,'#9a7a66',16);
    a.pop(CX,BY-c.H-20,L(a,'철퍼덕! -3초','Flop! -3s'),'#e2492c')}
  function fire(a){if(phase!=='shape')return;phase='kiln';pt=0;mode=null;
    var e=compare(c,ord.t);fired={c:clone(c),err:e,st:stars(e)};a.sfx('tap');a.beep(220,.3,'triangle')}
  function finish(a){var st=fired.st;phase='result';pt=0;shown=0;
    if(st>0){streak++;resultPts=st*10+Math.floor(time/5)+Math.min(streak,5)*2;a.add(resultPts);time=Math.min(70,time+14);mood='happy';moodT=2;
      a.sfx('win');a.burst(CX,BY-fired.c.H-12,'#ffe27a',18);a.burst(CX,BY-fired.c.H-12,'#ffffff',8);a.pop(CX,BY-fired.c.H-26,'+'+resultPts,'#ff8a1e')}
    else{streak=0;resultPts=0;mood='sad';moodT=2;a.sfx('hit');a.pop(CX,BY-fired.c.H-26,L(a,'다시 부탁해요…','Try again…'),'#d9472b')}}

  /* ---------- 그리기: 물레 위 그릇 ---------- */
  function drawPot(g,cl,cx,by,s,o){var i,r=cl.r,q=cl.q,H=cl.H,dy=H/(N-1),col=o.col,gl=o.glaze,al=o.alpha==null?1:o.alpha;
    g.save();g.globalAlpha=al;var hl=.3+.04*Math.sin(T*1.3);
    for(i=0;i<N-1;i++){var y0=by-i*dy*s,y1=by-(i+1)*dy*s,r0=r[i]*s,r1=r[i+1]*s,rm=Math.max(r0,r1);
      var up=(r[i]-r[i+1])/dy,lk=.86+.3*up/Math.sqrt(1+up*up),ft=gl&&i<3;
      var cc=ft?CLAY:col,gr=g.createLinearGradient(cx-rm,0,cx+rm,0);
      gr.addColorStop(0,rgb(cc,.5*lk));gr.addColorStop(.16,rgb(cc,.82*lk));
      gr.addColorStop(Math.max(.2,hl-.06),rgb(cc,1.02*lk));gr.addColorStop(hl,rgb(cc,1.08*lk,gl?(ft?20:95):34));gr.addColorStop(hl+.06,rgb(cc,1.0*lk,gl?10:0));
      gr.addColorStop(.62,rgb(cc,.86*lk));gr.addColorStop(.86,rgb(cc,.62*lk));gr.addColorStop(1,rgb(cc,.42*lk));
      g.fillStyle=gr;g.beginPath();g.ellipse(cx,y0,Math.max(.1,r0),Math.max(.1,r0*K),0,0,Math.PI);g.ellipse(cx,y1-.8,Math.max(.1,r1),Math.max(.1,r1*K),0,Math.PI,0,true);g.closePath();g.fill();
      if(o.warn&&q[i]>0&&r[i]-q[i]<WMIN+2.6){g.fillStyle='rgba(255,70,50,'+(.25+.25*Math.sin(T*16))+')';g.fill()}}
    /* 물레 자국: 회전하며 올라가는 나선 */
    if(o.wet){var P=9,ph=(spin%(Math.PI*2))/(Math.PI*2)*P,y,k;g.lineWidth=1;
      for(y=-P+ph,k=0;y<H;y+=P,k++){g.strokeStyle=k%2?'rgba(255,240,225,.08)':'rgba(55,35,25,.1)';g.beginPath();var st=false;
        for(var j=0;j<=12;j++){var f=j/12*Math.PI,hh=y+P*f/(Math.PI*2);if(hh<1||hh>H-1){st=false;continue}var rh=rAt(cl,hh)*s,X=cx+rh*Math.cos(f),Y=by-hh*s+rh*K*Math.sin(f);
          if(st)g.lineTo(X,Y);else{g.moveTo(X,Y);st=true}}g.stroke()}
      /* 표면 얼룩이 회전 방향으로 흘러간다 */
      for(i=0;i<18;i++){var an=i*2.39+spin,sn=Math.sin(an);if(sn<.12)continue;var h2=((i*37)%97)/97*H*.94+2,r2=rAt(cl,h2)*s;
        g.fillStyle=i%3?'rgba(60,40,30,'+(.22*sn)+')':'rgba(255,245,235,'+(.3*sn)+')';g.beginPath();g.ellipse(cx+r2*Math.cos(an),by-h2*s+r2*K*sn,2.4*sn+.6,1.1,0,0,7);g.fill()}}
    /* 윗면 / 입구 */
    var yt=by-H*s,rt=r[N-1]*s,qt=q[N-1]*s;
    if(qt>.8){g.fillStyle=gl?rgb(col,1.15,40):rgb(col,1.08,26);g.beginPath();g.ellipse(cx,yt,rt,rt*K,0,0,7);g.fill();
      var ig=g.createLinearGradient(0,yt-qt*K,0,yt+qt*K);ig.addColorStop(0,rgb(gl?col:col,.95,gl?20:6));ig.addColorStop(.55,rgb(col,.42));ig.addColorStop(1,rgb(col,.22));
      g.fillStyle=ig;g.beginPath();g.ellipse(cx,yt,qt,qt*K,0,0,7);g.fill();
      g.save();g.beginPath();g.ellipse(cx,yt,qt,qt*K,0,0,7);g.clip();g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(cx,yt+qt*K*1.25,qt*1.05,qt*K*1.3,0,0,7);g.fill();g.restore();
      g.strokeStyle=gl?'rgba(255,255,255,.55)':'rgba(255,240,226,.35)';g.lineWidth=1.2;g.beginPath();g.ellipse(cx,yt,rt-.6,rt*K-.4,0,Math.PI*1.05,Math.PI*1.75);g.stroke()}
    else{g.fillStyle=rgb(col,1.06,gl?30:22);g.beginPath();g.ellipse(cx,yt,Math.max(.1,rt),Math.max(.1,rt*K),0,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,'+(gl?.45:.2)+')';g.beginPath();g.ellipse(cx-rt*.25,yt-rt*K*.25,rt*.35,rt*K*.3,0,0,7);g.fill()}
    /* 움직이는 반사광 줄기 */
    if(o.wet||gl){g.globalAlpha=al*(gl?.55:.3);g.strokeStyle='#fff';g.lineCap='round';g.lineWidth=gl?2.6:2;g.beginPath();var x0=null;
      for(i=4;i<N-3;i+=2){var hx=cx-r[i]*s*(1-2*(hl+.02+.012*Math.sin(T*2.1+i*.3))),hy=by-i*dy*s;if(x0==null){g.moveTo(hx,hy);x0=1}else g.lineTo(hx,hy)}g.stroke()}
    g.restore()}
  /* 목표 점선: 지금 점토보다 넓어야 하는 곳은 하늘색, 좁아야 하는 곳은 주황, 맞으면 흰색 */
  function drawGhost(g,t,cl){var i,H=t.H;g.save();g.lineJoin='round';g.lineCap='round';
    g.beginPath();for(i=0;i<N;i++)g.lineTo(CX-t.r[i],BY-i/(N-1)*H);g.moveTo(CX+t.r[0],BY);for(i=0;i<N;i++)g.lineTo(CX+t.r[i],BY-i/(N-1)*H);
    g.strokeStyle='rgba(60,30,20,.35)';g.lineWidth=4.5;g.stroke();
    if(cl){g.lineWidth=3.2;for(i=0;i<N-1;i++){var h=(i+.5)/(N-1)*H,d=rAt(cl,h)-(t.r[i]+t.r[i+1])/2,y0=BY-i/(N-1)*H,y1=BY-(i+1)/(N-1)*H;if(Math.abs(d)<3.5)continue;
        g.strokeStyle=d>0?'rgba(255,128,80,.9)':'rgba(90,200,255,.9)';g.beginPath();g.moveTo(CX-t.r[i],y0);g.lineTo(CX-t.r[i+1],y1);g.moveTo(CX+t.r[i],y0);g.lineTo(CX+t.r[i+1],y1);g.stroke()}}
    g.beginPath();for(i=0;i<N;i++)g.lineTo(CX-t.r[i],BY-i/(N-1)*H);g.moveTo(CX+t.r[0],BY);for(i=0;i<N;i++)g.lineTo(CX+t.r[i],BY-i/(N-1)*H);
    g.setLineDash([6,5]);g.lineDashOffset=-T*10;g.strokeStyle='rgba(255,252,240,.95)';g.lineWidth=2;g.stroke();
    var rt=t.r[N-1],qt=t.q[N-1],dh=cl?cl.H-H:0;g.beginPath();g.ellipse(CX,BY-H,rt,rt*K,0,0,7);
    if(Math.abs(dh)>5){g.save();g.setLineDash([]);g.strokeStyle=dh>0?'rgba(255,128,80,.75)':'rgba(90,200,255,.75)';g.lineWidth=4;g.stroke();g.restore()}g.stroke();
    if(qt>.8){g.beginPath();g.ellipse(CX,BY-H,qt,qt*K,0,0,7);g.stroke()}
    g.restore()}
  function drawWheel(g){var i;
    /* 물받이 */
    g.fillStyle='#5d6f78';g.beginPath();g.ellipse(CX,BY+18,168,40,0,0,7);g.fill();
    g.fillStyle='#3c4a52';g.beginPath();g.ellipse(CX,BY+14,156,34,0,0,7);g.fill();
    g.fillStyle='rgba(150,120,100,.5)';g.beginPath();g.ellipse(CX,BY+18,146,28,0,0,7);g.fill();
    /* 물레 머리 */
    g.fillStyle='#2e3438';g.beginPath();g.ellipse(CX,BY+10,128,25,0,0,Math.PI);g.lineTo(CX-128,BY);g.ellipse(CX,BY,128,25,0,Math.PI,0,true);g.fill();
    var wg=g.createLinearGradient(CX-128,0,CX+128,0);wg.addColorStop(0,'#8a8f92');wg.addColorStop(.35,'#c9cdcf');wg.addColorStop(1,'#6d7376');
    g.fillStyle=wg;g.beginPath();g.ellipse(CX,BY,128,24,0,0,7);g.fill();
    g.fillStyle='rgba(140,110,92,.55)';g.beginPath();g.ellipse(CX,BY,100,19,0,0,7);g.fill();
    g.strokeStyle='rgba(60,50,45,.28)';g.lineWidth=1;[40,64,88,112].forEach(function(rr2){g.beginPath();g.ellipse(CX,BY,rr2,rr2*.19,0,0,7);g.stroke()});
    for(i=0;i<8;i++){var a=spin+i*Math.PI/4,cs=Math.cos(a),sn=Math.sin(a);g.strokeStyle='rgba(40,30,25,'+(.18+.18*Math.max(0,sn))+')';g.lineWidth=2;
      g.beginPath();g.moveTo(CX+cs*92,BY+sn*17.5);g.lineTo(CX+cs*120,BY+sn*22.8);g.stroke()}}

  /* ---------- 손님 ---------- */
  function drawGuest(g,gu,x,y){var hop=mood==='happy'?Math.abs(Math.sin(T*10))*6:0,shk=mood==='shock'?Math.sin(T*50)*2:0;y-=hop;x+=shk;
    var f=gu.fur,k=gu.kind;
    g.fillStyle='rgba(0,0,0,.15)';g.beginPath();g.ellipse(x,186,40,7,0,0,7);g.fill();
    g.fillStyle=f;g.beginPath();g.ellipse(x,y+56,34,30,0,Math.PI,0);g.lineTo(x+34,186);g.lineTo(x-34,186);g.fill();
    g.fillStyle=gu.in;g.beginPath();g.ellipse(x,y+66,18,20,0,0,7);g.fill();
    function ear(dx,rot){g.save();g.translate(x+dx,y-22);g.rotate(rot);
      if(k==='bunny'){g.fillStyle=f;g.beginPath();g.ellipse(0,-20,9,24,0,0,7);g.fill();g.fillStyle=gu.in;g.beginPath();g.ellipse(0,-20,4.5,17,0,0,7);g.fill()}
      else if(k==='fox'||k==='cat'){g.fillStyle=f;g.beginPath();g.moveTo(-12,8);g.lineTo(0,-20);g.lineTo(12,8);g.fill();g.fillStyle=gu.in;g.beginPath();g.moveTo(-6,5);g.lineTo(0,-10);g.lineTo(6,5);g.fill()}
      else if(k==='bear'){g.fillStyle=f;g.beginPath();g.arc(0,0,11,0,7);g.fill();g.fillStyle=gu.in;g.beginPath();g.arc(0,0,5.5,0,7);g.fill()}
      g.restore()}
    var wig=Math.sin(T*2.2)*.08;
    if(k!=='peng'&&k!=='frog'){ear(-20,-.25+wig);ear(20,.25-wig)}
    var hg=g.createRadialGradient(x-10,y-12,4,x,y,36);hg.addColorStop(0,'rgba(255,255,255,.25)');hg.addColorStop(1,'rgba(0,0,0,.12)');
    g.fillStyle=f;g.beginPath();g.ellipse(x,y,32,29,0,0,7);g.fill();g.fillStyle=hg;g.fill();
    if(k==='frog'){[-14,14].forEach(function(o){g.fillStyle=f;g.beginPath();g.arc(x+o,y-24,11,0,7);g.fill()})}
    if(k==='peng'){g.fillStyle=gu.in;g.beginPath();g.ellipse(x-10,y+4,12,15,0,0,7);g.ellipse(x+10,y+4,12,15,0,0,7);g.fill()}
    else if(k!=='frog'){g.fillStyle=gu.in;g.beginPath();g.ellipse(x,y+10,13,9,0,0,7);g.fill()}
    /* 눈: 물레 쪽을 본다 */
    var ey=k==='frog'?y-24:y-4,eo=k==='frog'?14:11,lx=2.4,ly=2;
    [-1,1].forEach(function(sd){var ex=x+sd*eo;
      if(mood==='happy'){g.strokeStyle='#2a2026';g.lineWidth=2.6;g.lineCap='round';g.beginPath();g.arc(ex,ey+2,5,Math.PI*1.15,Math.PI*1.85);g.stroke()}
      else if(blink<.13&&mood!=='shock'){g.strokeStyle='#2a2026';g.lineWidth=2;g.beginPath();g.moveTo(ex-4,ey);g.lineTo(ex+4,ey);g.stroke()}
      else{var big=mood==='shock'?1.35:1;g.fillStyle='#fff';g.beginPath();g.ellipse(ex,ey,5.4*big,6*big,0,0,7);g.fill();
        g.fillStyle='#2a2026';g.beginPath();g.ellipse(ex+lx,ey+ly,2.8,3.4,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(ex+lx+1,ey+ly-1.2,1,0,7);g.fill()}
      if(mood==='sad'){g.strokeStyle='#2a2026';g.lineWidth=1.6;g.beginPath();g.moveTo(ex-5,ey-9+sd*-1);g.lineTo(ex+5,ey-9-sd*2.5);g.stroke()}});
    /* 입 */
    var my=k==='frog'?y+6:y+12;g.strokeStyle='#3a2a2a';g.lineWidth=1.8;g.lineCap='round';g.beginPath();
    if(k==='peng'){g.fillStyle='#f2a43a';g.beginPath();g.moveTo(x-6,y+6);g.lineTo(x+6,y+6);g.lineTo(x,y+13);g.fill()}
    else{g.fillStyle='#3a2a2a';g.beginPath();g.ellipse(x,my-4,3,2.2,0,0,7);g.fill();g.beginPath();
      if(mood==='happy')g.arc(x,my-1,5,.15,Math.PI-.15);else if(mood==='sad')g.arc(x,my+4,4.5,Math.PI+.3,-.3);else if(mood==='shock')g.ellipse(x,my+2,3,4,0,0,7);
      else{g.moveTo(x-5,my);g.quadraticCurveTo(x-2.5,my+3,x,my);g.quadraticCurveTo(x+2.5,my+3,x+5,my)}g.stroke()}
    g.fillStyle='rgba(255,120,130,.35)';g.beginPath();g.ellipse(x-20,y+8,6,3.5,0,0,7);g.ellipse(x+20,y+8,6,3.5,0,0,7);g.fill();
    if(mood==='sad'){g.fillStyle='#8fd0ff';g.beginPath();g.ellipse(x+14,y+6+(T*20%8),2,3,0,0,7);g.fill()}}

  /* ---------- 배경: 햇살 드는 공방 ---------- */
  var SHELF=[[[14,6,12,[96,140,170]],[40,9,17,[200,120,90]]],[[12,8,10,[120,160,110]],[34,5,15,[220,190,120]],[52,6,9,[150,110,170]]],[[22,10,13,[200,96,70]],[46,6,18,[90,120,180]]]];
  function drawBG(g,a){var W=a.W,H=a.H,i;
    var bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#f7e6c8');bg.addColorStop(.55,'#efd2a6');bg.addColorStop(1,'#d9b083');
    g.fillStyle=bg;g.fillRect(-20,-20,W+40,H+40);
    /* 창문 + 화분 */
    var wx=266,wy=212,ww=84,wh=128;g.fillStyle='rgba(120,80,50,.25)';rr(g,wx-6,wy-4,ww+12,wh+14,6);g.fill();
    var sky=g.createLinearGradient(0,wy,0,wy+wh);sky.addColorStop(0,'#bfe6ff');sky.addColorStop(1,'#fff3cf');g.fillStyle=sky;g.fillRect(wx,wy,ww,wh);
    g.fillStyle='rgba(255,255,255,.75)';var cxo=(T*6)%140;g.beginPath();g.ellipse(wx+cxo-20,wy+30,18,7,0,0,7);g.ellipse(wx+cxo-6,wy+26,12,8,0,0,7);g.fill();
    g.fillStyle='#a5d48a';g.beginPath();g.ellipse(wx+ww/2,wy+wh+6,70,26,0,Math.PI,0);g.fill();
    g.strokeStyle='#f6ead6';g.lineWidth=5;g.strokeRect(wx,wy,ww,wh);g.beginPath();g.moveTo(wx+ww/2,wy);g.lineTo(wx+ww/2,wy+wh);g.moveTo(wx,wy+wh/2);g.lineTo(wx+ww,wy+wh/2);g.stroke();
    g.fillStyle='#e2c79f';g.fillRect(wx-10,wy+wh,ww+20,8);
    for(i=0;i<2;i++){var px=wx+18+i*46,sw=Math.sin(T*1.6+i*2)*3;g.strokeStyle='#4f8a3c';g.lineWidth=2;
      for(var l=-2;l<=2;l++){g.beginPath();g.moveTo(px,wy+wh-8);g.quadraticCurveTo(px+l*6+sw,wy+wh-26,px+l*9+sw*1.6,wy+wh-38-Math.abs(l)*-3);g.stroke();
        g.fillStyle=l%2?'#6fb04f':'#5a9a40';g.beginPath();g.ellipse(px+l*9+sw*1.6,wy+wh-38+Math.abs(l)*3,5,3,l*.5,0,7);g.fill()}
      g.fillStyle='#c46a46';g.beginPath();g.moveTo(px-9,wy+wh-10);g.lineTo(px+9,wy+wh-10);g.lineTo(px+7,wy+wh);g.lineTo(px-7,wy+wh);g.fill()}
    /* 선반 위 완성품 */
    for(var s=0;s<3;s++){var sy=250+s*92;g.fillStyle='rgba(80,50,30,.18)';g.fillRect(0,sy+6,70,6);g.fillStyle='#a8754a';g.fillRect(0,sy,70,7);g.fillStyle='#c48d5c';g.fillRect(0,sy,70,2);
      SHELF[s].forEach(function(p){var gx=p[0],w=p[1],h=p[2],cl=p[3];var gg=g.createLinearGradient(gx-w,0,gx+w,0);gg.addColorStop(0,rgb(cl,.55));gg.addColorStop(.3,rgb(cl,1.1,30));gg.addColorStop(1,rgb(cl,.5));
        g.fillStyle=gg;g.beginPath();g.moveTo(gx-w*.6,sy);g.quadraticCurveTo(gx-w*1.2,sy-h*.6,gx-w*.45,sy-h);g.lineTo(gx+w*.45,sy-h);g.quadraticCurveTo(gx+w*1.2,sy-h*.6,gx+w*.6,sy);g.fill();
        g.fillStyle=rgb(cl,.4);g.beginPath();g.ellipse(gx,sy-h,w*.45,1.8,0,0,7);g.fill()})}
    /* 바닥 */
    var fg=g.createLinearGradient(0,540,0,H);fg.addColorStop(0,'#b07c50');fg.addColorStop(1,'#8a5a36');g.fillStyle=fg;g.fillRect(-20,540,W+40,H-520);
    g.strokeStyle='rgba(60,35,20,.25)';g.lineWidth=1;for(i=0;i<5;i++){g.beginPath();g.moveTo(-20,556+i*18);g.lineTo(W+20,556+i*18);g.stroke()}
    /* 햇살 줄기 + 먼지 */
    g.save();g.globalCompositeOperation='lighter';
    for(i=0;i<3;i++){var sh=.05+.025*Math.sin(T*.7+i*1.7);g.fillStyle='rgba(255,236,190,'+sh+')';g.beginPath();
      g.moveTo(wx+i*26,wy);g.lineTo(wx+22+i*26,wy);g.lineTo(wx-150+i*30,BY+30);g.lineTo(wx-210+i*30,BY+30);g.fill()}
    g.restore();
    for(i=0;i<motes.length;i++){var m=motes[i],t2=(m.p+T*m.v)%1,mx=wx+30-t2*220+Math.sin(T*m.w+i)*8+m.o,my=wy+10+t2*290+Math.cos(T*m.w*.7+i)*6;
      g.fillStyle='rgba(255,250,225,'+(.35+.35*Math.sin(T*2+i))*(1-Math.abs(t2-.5)*1.6)+')';g.beginPath();g.arc(mx,my,m.r,0,7);g.fill()}}

  function drawKiln(g,a){var t=pt,fade=t<.35?ease(t/.35):t>2.05?1-ease((t-2.05)/.35):1,door=t<.4?0:t<.7?ease((t-.4)/.3):t<1.7?1:t<2?1-ease((t-1.7)/.3):0,
      heat=t<.7?0:t<1.7?Math.sin((t-.7)/1*Math.PI):0,i;
    if(fade<=0)return;g.save();g.globalAlpha=fade;
    var kx=CX,ky=BY+30,kw=136,kh=292,ow=100,oh=236,top=ky-kh;
    g.fillStyle='rgba(30,15,10,.35)';g.beginPath();g.ellipse(kx,ky,kw+10,18,0,0,7);g.fill();
    g.fillStyle='#5a2a1c';g.fillRect(kx+56,top-30,26,50);g.fillStyle='#3a1a10';g.fillRect(kx+52,top-34,34,8);
    var bg=g.createLinearGradient(kx-kw,0,kx+kw,0);bg.addColorStop(0,'#7a3b28');bg.addColorStop(.38,'#b9603f');bg.addColorStop(1,'#6a3022');
    g.fillStyle=bg;g.beginPath();g.moveTo(kx-kw,ky);g.lineTo(kx-kw,top+70);g.quadraticCurveTo(kx-kw,top,kx,top-6);g.quadraticCurveTo(kx+kw,top,kx+kw,top+70);g.lineTo(kx+kw,ky);g.closePath();g.fill();
    g.save();g.clip();g.strokeStyle='rgba(60,25,15,.4)';g.lineWidth=1.5;for(var row=0;row<15;row++){var yy=ky-row*21;g.beginPath();g.moveTo(kx-kw,yy);g.lineTo(kx+kw,yy);g.stroke();
      for(var bx=-kw+(row%2)*19;bx<kw;bx+=38){g.beginPath();g.moveTo(kx+bx,yy);g.lineTo(kx+bx,yy-21);g.stroke()}}g.restore();
    /* 입구 아치 */
    g.save();g.beginPath();g.moveTo(kx-ow,ky);g.lineTo(kx-ow,ky-oh+ow);g.arc(kx,ky-oh+ow,ow,Math.PI,0);g.lineTo(kx+ow,ky);g.closePath();
    g.lineWidth=10;g.strokeStyle='#8a4630';g.stroke();g.clip();
    var hot=t>1.65?Math.max(0,1-(t-1.7)*1.2):heat,ig=g.createRadialGradient(kx,ky-90,10,kx,ky-90,200);
    ig.addColorStop(0,'rgb(255,'+(200+40*hot|0)+','+(90+100*hot|0)+')');ig.addColorStop(1,'rgb('+(70+170*hot|0)+','+(30+60*hot|0)+',18)');g.fillStyle=ig;g.fillRect(kx-ow,ky-oh-20,ow*2,oh+20);
    var glazed=t>1.75;drawPot(g,fired.c,CX,BY,1,{col:glazed?ord.guest.gl:CLAY,glaze:glazed,wet:!glazed});
    /* 철문: 내려와서 달아오르고 다시 올라간다 */
    if(door>0){var dh=(oh+10)*door,dy=ky-oh-10,dg=g.createLinearGradient(kx-ow,0,kx+ow,0);dg.addColorStop(0,'#2c2c33');dg.addColorStop(.4,'#55555e');dg.addColorStop(1,'#26262c');
      g.save();g.translate(0,dh-(oh+10));g.fillStyle=dg;g.fillRect(kx-ow,dy,ow*2,oh+10);
      if(heat>0){var hg=g.createLinearGradient(0,ky,0,dy);hg.addColorStop(0,'rgba(255,'+(90+80*heat|0)+',30,'+(.85*heat)+')');hg.addColorStop(1,'rgba(255,60,20,'+(.25*heat)+')');g.fillStyle=hg;g.fillRect(kx-ow,dy,ow*2,oh+10)}
      g.fillStyle='rgba(0,0,0,.3)';[.3,.62].forEach(function(f){g.fillRect(kx-ow,dy+(oh+10)*f,ow*2,6)});
      g.fillStyle='rgba(255,255,255,.18)';for(i=0;i<6;i++){g.beginPath();g.arc(kx-ow+14+i*((ow*2-28)/5),dy+(oh+10)*.3+3,2.6,0,7);g.arc(kx-ow+14+i*((ow*2-28)/5),dy+(oh+10)*.62+3,2.6,0,7);g.fill()}
      var pe=.5+.5*heat+.15*Math.sin(T*20);g.fillStyle='#1a1a1e';g.beginPath();g.arc(kx,dy+(oh+10)*.46,13,0,7);g.fill();
      g.fillStyle='rgba(255,'+(150+60*heat|0)+',40,'+pe+')';g.beginPath();g.arc(kx,dy+(oh+10)*.46,8,0,7);g.fill();
      g.strokeStyle='#8e8e98';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(kx+ow-26,dy+(oh+10)*.78);g.lineTo(kx+ow-26,dy+(oh+10)*.9);g.stroke();g.restore()}
    g.restore();
    if(heat>0){g.strokeStyle='rgba(255,230,200,'+(.35*heat)+')';g.lineWidth=1.5;for(i=0;i<4;i++){g.beginPath();for(var s2=0;s2<=10;s2++){var yy2=top-10-s2*7,xx=kx+68+Math.sin(T*9+s2*.9+i)*5+(i-1.5)*8;if(s2)g.lineTo(xx,yy2);else g.moveTo(xx,yy2)}g.stroke()}
      g.fillStyle='rgba(255,150,60,'+(.18*heat)+')';g.beginPath();g.arc(kx,ky-120,190,0,7);g.fill()}
    /* 명패 */
    g.fillStyle='#e9cf9e';rr(g,kx-58,top+22,116,28,8);g.fill();g.strokeStyle='#7a4a2a';g.lineWidth=2;g.stroke();
    g.fillStyle='#5a3218';g.font='17px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(t<1.75?L(a,'굽는 중…','Firing…'):L(a,'완성!','Done!'),kx,top+37);g.textBaseline='alphabetic';
    g.restore()}
  function drawButton(g,b,label,base,on){var p=on?2:0;g.fillStyle='rgba(60,30,15,.35)';rr(g,b.x,b.y+4,b.w,b.h,13);g.fill();
    g.fillStyle=base;rr(g,b.x,b.y+p,b.w,b.h-2,13);g.fill();g.fillStyle='rgba(255,255,255,.22)';rr(g,b.x+4,b.y+p+3,b.w-8,b.h*.38,9);g.fill();
    g.fillStyle='#fff';g.font='17px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(label,b.x+b.w/2,b.y+b.h/2+p);g.textBaseline='alphabetic'}
  function starStr(n,of){var s='';for(var i=0;i<of;i++)s+=i<n?'★':'☆';return s}

  function draw(g,a){var i,W=a.W;
    drawBG(g,a);
    /* 손님 + 말풍선 */
    drawGuest(g,ord.guest,52,118);
    g.fillStyle='rgba(80,45,25,.18)';rr(g,102,52,246,134,16);g.fill();
    g.fillStyle='#fffaf0';rr(g,100,48,246,134,16);g.fill();g.beginPath();g.moveTo(102,104);g.lineTo(88,116);g.lineTo(102,124);g.fill();
    g.textAlign='left';g.fillStyle='#6a4a36';g.font='14px '+FONT;g.fillText(L(a,'주문 ','Order ')+(ord.n+1),114,72);
    g.fillStyle='#3a2618';g.font='18px '+FONT;var nm=ord.name[a.lang],ws=nm.split(' ');
    if(g.measureText(nm).width>96&&ws.length>1){g.fillText(ws.slice(0,-1).join(' '),114,96);g.fillText(ws[ws.length-1],114,118)}else g.fillText(nm,114,96);
    g.fillStyle='#8a6a52';g.font='13px '+FONT;g.fillText('— '+ord.guest[a.lang],114,170);
    g.fillStyle=rgb(ord.guest.gl,1);rr(g,114,140,18,14,5);g.fill();g.fillStyle='#8a6a52';g.fillText(L(a,'유약','glaze'),138,152);
    var t=ord.t,mr=0;for(i=0;i<N;i++)mr=Math.max(mr,t.r[i]);var ps=Math.min(.6,108/t.H,110/(2*mr));
    g.fillStyle='rgba(0,0,0,.12)';g.beginPath();g.ellipse(268,172,mr*ps+6,5,0,0,7);g.fill();
    drawPot(g,t,268,170,ps,{col:ord.guest.gl,glaze:true});
    /* 타이머 */
    var tw=200,tx=74,tr=Math.max(0,time)/70,low=time<10;
    g.fillStyle='rgba(60,30,15,.35)';rr(g,tx-2,32,tw+4,10,5);g.fill();
    g.fillStyle=low?(Math.sin(T*10)>0?'#ff6b5a':'#ffb09a'):'#ff9a4a';if(tr>0){rr(g,tx,34,Math.max(6,tw*tr),6,3);g.fill()}
    g.font='15px '+FONT;g.textAlign='left';g.textBaseline='middle';g.fillStyle=low?'#c0392b':'#6a3a1c';g.fillText(Math.ceil(Math.max(0,time))+L(a,'초','s'),tx+tw+8,38);g.textBaseline='alphabetic';
    /* 물레 */
    drawWheel(g);
    var cur=phase==='flop'?flopC:c;
    g.fillStyle='rgba(30,20,15,.3)';g.beginPath();g.ellipse(CX,BY+3,cur.r[0]+6,(cur.r[0]+6)*K,0,0,7);g.fill();
    if(phase==='shape'){drawPot(g,c,CX,BY,1,{col:CLAY,wet:true,warn:true});drawGhost(g,ord.t,c)}
    else if(phase==='flop'){var e=ease(pt/1),sk=Math.sin(pt*22)*.3*(1-e)+flopDir*e*.9;g.save();g.translate(CX,BY);g.transform(1,0,-sk*.5,1,0,0);g.scale(1+e*.7,1-e*.78);
      drawPot(g,flopC,0,0,1,{col:CLAY,wet:true});g.restore();drawGhost(g,ord.t)}
    else if(phase==='result'||phase==='kiln'){if(phase==='result'||pt>2.2){drawPot(g,fired.c,CX,BY,1,{col:ord.guest.gl,glaze:true});
        for(i=0;i<sparks.length;i++){var sp=sparks[i],al=Math.max(0,1-sp.t/sp.l);g.save();g.translate(sp.x,sp.y);g.rotate(sp.t*3);g.fillStyle='rgba(255,250,210,'+al+')';
          g.beginPath();for(var k=0;k<8;k++){var rad=k%2?1.6:sp.s*al+1;g.lineTo(Math.cos(k*Math.PI/4)*rad,Math.sin(k*Math.PI/4)*rad)}g.fill();g.restore()}}
      if(phase==='kiln')drawKiln(g,a)}
    /* 손끝 고리 / 키보드 커서 */
    if(phase==='shape'){
      if(inp0&&inp0.down&&inp0.x!=null&&mode){var col=mode==='open'?'120,200,255':mode==='in'?'140,240,170':'255,214,120',pr=12+Math.sin(T*12)*1.5;
        g.save();g.shadowColor='rgba('+col+',1)';g.shadowBlur=14;g.strokeStyle='rgba('+col+',.95)';g.lineWidth=3;g.beginPath();g.arc(inp0.x,inp0.y,pr,0,7);g.stroke();
        g.fillStyle='rgba('+col+',.25)';g.fill();g.restore()}
      if(kb){var ch=cursor,rx=rAt(c,ch),ky=BY-ch;g.save();g.shadowColor='#ffd27a';g.shadowBlur=12;g.strokeStyle='rgba(255,214,120,.95)';g.lineWidth=3;
        g.beginPath();g.arc(CX-rx-10,ky,9,0,7);g.stroke();g.restore();g.fillStyle='rgba(255,230,170,.9)';g.beginPath();g.moveTo(CX-rx-1,ky);g.lineTo(CX-rx-6,ky-4);g.lineTo(CX-rx-6,ky+4);g.fill()}}
    /* 물방울 */
    g.fillStyle='rgba(200,225,240,.85)';for(i=0;i<drops.length;i++){var d=drops[i];g.globalAlpha=1-d.t/d.l;g.beginPath();g.ellipse(d.x,d.y,1.8,2.6,Math.atan2(d.vy,d.vx)+1.57,0,7);g.fill()}g.globalAlpha=1;
    /* 불티 */
    for(i=0;i<embers.length;i++){var em=embers[i];g.fillStyle='rgba(255,'+(150+80*Math.random()|0)+',60,'+(1-em.t/em.l)+')';g.beginPath();g.arc(em.x,em.y,em.r,0,7);g.fill()}
    /* 점토 양 게이지 */
    var mh=120,my=372,mx0=332,fill=vol(c)/c.V;g.fillStyle='rgba(70,40,25,.25)';rr(g,mx0-2,my-2,14,mh+4,7);g.fill();g.fillStyle='rgba(255,250,240,.5)';rr(g,mx0,my,10,mh,5);g.fill();
    var lv=my+mh*(1-Math.min(1,fill)*.96)+Math.sin(T*4)*1.2;g.fillStyle=rgb(CLAY,.95);g.beginPath();g.moveTo(mx0,lv);for(i=0;i<=10;i++)g.lineTo(mx0+i,lv+Math.sin(T*5+i*.8)*(touched?1.2:.5));g.lineTo(mx0+10,my+mh-5);g.quadraticCurveTo(mx0+10,my+mh,mx0+5,my+mh);g.quadraticCurveTo(mx0,my+mh,mx0,my+mh-5);g.fill();
    g.save();g.translate(mx0-5,my+mh/2);g.rotate(-Math.PI/2);g.font='12px '+FONT;g.textAlign='center';g.fillStyle='rgba(90,55,30,.75)';g.fillText(L(a,'점토 ','clay ')+Math.round(fill*100)+'%',0,-2);g.restore();
    /* 버튼 + 실시간 별 */
    drawButton(g,BTN.reset,L(a,'↺ 새 점토','↺ Reset'),'#9b7b62',false);
    drawButton(g,BTN.speed,'   '+(fast?L(a,'빠르게','Fast'):L(a,'느리게','Slow')),fast?'#d0743c':'#6f8fa0',false);
    var ix=BTN.speed.x+17,iy=BTN.speed.y+20;g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.ellipse(ix,iy,9,9,0,0,7);g.stroke();
    for(i=0;i<3;i++){var sa=spin*.6+i*2.09;g.beginPath();g.moveTo(ix,iy);g.lineTo(ix+Math.cos(sa)*8,iy+Math.sin(sa)*8);g.stroke()}
    var ready=live>0&&phase==='shape';drawButton(g,BTN.fire,L(a,'🔥 굽기!','🔥 Fire!'),ready?(Math.sin(T*6)>0?'#e8572e':'#f06a38'):'#c98a6a',false);
    if(phase==='shape'){g.font='16px '+FONT;g.textAlign='center';g.fillStyle='rgba(60,30,15,.4)';g.fillText(starStr(live,3),BTN.fire.x+BTN.fire.w/2+1,BTN.fire.y-6);
      g.fillStyle=live?'#ffd34a':'rgba(255,245,230,.8)';g.fillText(starStr(live,3),BTN.fire.x+BTN.fire.w/2,BTN.fire.y-7)}
    if(streak>1){g.font='14px '+FONT;g.textAlign='right';g.fillStyle='#b4441c';g.fillText(L(a,'연속 ','Streak x')+streak+(a.lang==='ko'?'회':''),346,214)}
    /* 결과 별 */
    if(phase==='result'){var st=fired.st;g.font='38px '+FONT;g.textAlign='center';
      for(i=0;i<3;i++){var sx=CX+(i-1)*44,sy=BY-fired.c.H-40,ap=Math.max(0,Math.min(1,(pt-i*.22)*4)),sc2=ap<1?1+.6*(1-ap):1;if(ap<=0)continue;
        g.save();g.translate(sx,sy);g.scale(sc2,sc2);g.fillStyle='rgba(60,30,15,.35)';g.fillText(i<st?'★':'☆',1,3);g.fillStyle=i<st?'#ffcf3a':'rgba(255,250,240,.9)';g.fillText(i<st?'★':'☆',0,0);g.restore()}
      if(st===0){g.font='16px '+FONT;g.fillStyle='#7a2a18';g.fillText(L(a,'모양이 많이 달라요','Too far from the order'),CX,BY+60)}}
    /* 힌트 한 줄 */
    var hint=HINT[ord.n];if(hint&&phase==='shape'&&hintOn){var tx2=hint[a.lang],fs2=15;g.font=fs2+'px '+FONT;while(g.measureText(tx2).width>300&&fs2>11){fs2--;g.font=fs2+'px '+FONT}var w2=g.measureText(tx2).width+26;
      g.fillStyle='rgba(60,32,18,.85)';rr(g,CX-w2/2,196,w2,26,13);g.fill();g.fillStyle='#fff3dc';g.textAlign='center';g.textBaseline='middle';g.fillText(tx2,CX,209);g.textBaseline='alphabetic'}
    if(kb&&phase==='shape'&&ord.n<2){g.font='12px '+FONT;g.textAlign='center';g.fillStyle='rgba(80,45,25,.8)';
      g.fillText(L(a,'↑↓ 높이 · ← 누르기 · → 넓히기','↑↓ height · ← press · → widen'),CX,238);g.fillText(L(a,'Shift+↑ 끌어올리기 · O 열기 · F 굽기 · S 속도','Shift+↑ pull · O open · F fire · S speed'),CX,253)}}

  var inp0=null;
  var game={
    id:'clay-wheel',
    title:{ko:'물레 공방',en:'Clay Wheel'},
    how:{ko:'돌아가는 점토를 눌러 손님이 원하는 그릇 모양을 빚고 가마에 구워요',en:'Press the spinning clay to shape the pot each customer wants, then fire it in the kiln'},
    init:function(a){orderN=0;time=55;streak=0;fast=false;spin=0;T=T||0;blink=2;mode=null;lastPy=null;drops=[];sparks=[];embers=[];kb=false;hintOn=true;live=0;tickS=99;wasDown=false;
      keys=keys||{};for(var kk in keys)keys[kk]=false;
      motes=[];for(var i=0;i<26;i++)motes.push({p:Math.random(),v:.03+Math.random()*.05,w:.4+Math.random(),r:.8+Math.random()*1.4,o:(Math.random()-.5)*60});
      if(!window.__clayKeys){window.__clayKeys=1;
        window.addEventListener('keydown',function(e){var k=e.code;if(/^(Arrow|Shift|KeyO|KeyF|KeyR|KeyS)/.test(k)){if(!keys[k]&&!e.repeat)(game._press||function(){})(k);keys[k]=true;game._kb=true}});
        window.addEventListener('keyup',function(e){keys[e.code]=false});window.addEventListener('blur',function(){for(var kk in keys)keys[kk]=false})}
      game._press=null;nextOrder(a)},
    update:function(dt,inp,a){var i;inp0=inp;
      if(game._kb){game._kb=false;kb=true}
      game._press=function(k){if(!(window.__sg&&__sg.state().playing))return;if(k==='KeyF')fire(a);else if(k==='KeyR'&&phase==='shape'){newClay();a.sfx('tap')}else if(k==='KeyS'){fast=!fast;a.beep(fast?660:440,.08,'triangle')}};
      if(inp.tap&&inp.x!=null){kb=false;mode=null;
        if(inBtn(BTN.fire,inp))fire(a);
        else if(inBtn(BTN.reset,inp)){if(phase==='shape'){newClay();a.sfx('tap');a.burst(CX,BY-30,'#a88a74',8)}}
        else if(inBtn(BTN.speed,inp)){fast=!fast;a.beep(fast?660:440,.08,'triangle')}
        else if(phase==='shape'){var h=BY-inp.y,dx=Math.abs(inp.x-CX),qt=c.q[N-1],rt=c.r[N-1];
          if(qt>2&&dx<qt+3&&h>c.H-depth(c)-4&&h<c.H+40)mode=dx<qt*.42&&h>c.H-14?'open':'in';
          else if(qt<=2&&h>c.H-18&&h<c.H+40&&dx<Math.max(14,rt*.62))mode='open';
          else if(h>-24&&h<c.H+24&&dx<rAt(c,Math.max(0,Math.min(c.H,h)))+50)mode='out';
          lastPy=inp.y;strokeLow=1e9}}
      if(!inp.down)mode=null;
      spin+=dt*(fast?7.5:3.2);
      if(phase==='shape'){shapeInput(dt,inp,a);if(phase==='shape')live=stars(compare(c,ord.t));
        time-=dt;if(time<8&&Math.ceil(time)<tickS&&time>0)a.beep(880,.04,'square');tickS=Math.ceil(time);a.tempo(time<10?1.3:1);
        if(touched)hintT+=dt;if(touched&&(ord.n===0?live>0:hintT>5))hintOn=false;
        if(time<=0){time=0;a.over();return}}
      else if(phase==='flop'){pt+=dt;time-=dt;if(time<=0){time=0;a.over();return}if(pt>1){newClay();phase='shape'}}
      else if(phase==='kiln'){pt+=dt;
        if(pt>.7&&pt<1.7&&Math.random()<dt*30)embers.push({x:CX+62+Math.random()*14,y:BY-300,vx:(Math.random()-.5)*20,vy:-40-Math.random()*50,l:.8+Math.random()*.6,t:0,r:1+Math.random()*2});
        if(pt>.7&&pt<1.7&&Math.random()<dt*6)a.beep(70+Math.random()*40,.12,'sawtooth');
        if(pt>1.75&&pt-dt<=1.75){a.beep(1320,.12,'triangle');a.beep(1760,.18,'triangle');for(i=0;i<16;i++)sparks.push({x:CX+(Math.random()-.5)*fired.c.r[0]*2.4,y:BY-Math.random()*fired.c.H,t:-Math.random()*.6,l:.9,s:4+Math.random()*4})}
        if(pt>2.4)finish(a)}
      else if(phase==='result'){pt+=dt;var sh=Math.min(3,Math.floor(pt/.22)+1);if(sh>shown&&shown<3){shown=sh;if(shown<=fired.st)a.beep(660+shown*220,.12,'triangle')}
        if(pt>1.7){if(fired.st>0)orderN++;nextOrder(a)}}
      for(i=drops.length-1;i>=0;i--){var d=drops[i];d.t+=dt;if(d.t>d.l||d.y>BY+30){drops.splice(i,1);continue}d.vy+=600*dt;d.x+=d.vx*dt;d.y+=d.vy*dt}
      for(i=embers.length-1;i>=0;i--){var e=embers[i];e.t+=dt;if(e.t>e.l){embers.splice(i,1);continue}e.x+=e.vx*dt;e.y+=e.vy*dt}
      for(i=sparks.length-1;i>=0;i--){sparks[i].t+=dt;if(sparks[i].t>sparks[i].l)sparks.splice(i,1)}
      moodT-=dt;if(moodT<=0&&mood!=='idle')mood='idle'},
    draw:function(g,a,dt){dt=dt||.016;T+=dt;blink-=dt;if(blink<0)blink=2+Math.random()*3;draw(g,a)},
    _logic:{N:N,WMIN:WMIN,RMIN:RMIN,lump:lump,vol:vol,clone:clone,rAt:rAt,push:push,widen:widen,pull:pull,open:open,settle:settle,collapsed:collapsed,depth:depth,
      compare:compare,stars:stars,apply:apply,recipe:recipe,generate:generate,HAND:HAND,STAR:STAR}
  };
  function inBtn(b,inp){return inp.x>=b.x-4&&inp.x<=b.x+b.w+4&&inp.y>=b.y-6&&inp.y<=b.y+b.h+4}
  if(typeof location!=='undefined'&&/[?&]cwdbg=1/.test(location.search))window.__cw={state:function(){return{phase:phase,n:orderN,time:time,H:c.H,live:live,mode:mode}},
    target:function(){return ord.t},clay:function(){return c},setTime:function(v){time=v}};
  SG.run(game);
})();
