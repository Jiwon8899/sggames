/* 꿀벌 춤 (Bee Dance) — 정찰벌이 찾은 꽃밭을 8자 춤(꼬리 흔들기 춤)으로 알려 주는 퍼즐.
   벌집 위쪽 = 해 방향. 춤의 각도 = 해 기준 꽃의 방향, 춤의 길이 = 꽃까지의 거리.
   해는 시간이 지나면 움직이므로 같은 꽃이라도 나중엔 다른 각도로 춰야 한다.
   규칙(코어)은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,MT=32,MB=302,HX=180,HY=167,CT=302,CX=180,CY=471;
  var DK=1,MINLEN=24,MAXLEN=124,SPEED=150,COLLECT=.55,WANDER=.95,TURN=.35,SCOUT_T=1.6,CLEAR_T=1.8,
      T0=50,TADD=13,TCAP=70,D2R=Math.PI/180;

  /* ---------- 레벨 ----------
     각도는 지도 위쪽(북)에서 시계 방향, 단위 도. d는 벌집에서의 거리(px). f는 꽃 수(=한 번에 가져오는 꿀).
     sunW: 해가 1초에 도는 각도(시계 방향 = 실제 북반구 해의 움직임). */
  var LEVELS=[
    {sun0:0,sunW:0,quota:3,tol:18,ghost:1,arc:1,patches:[{b:0,d:70,f:3}],
      tip:{ko:'꽃이 해 쪽이면 위로 춤춰요',en:'Flower toward the sun? Dance straight up'}},
    {sun0:0,sunW:0,quota:3,tol:18,arc:1,patches:[{b:60,d:75,f:3}],
      tip:{ko:'해에서 오른쪽 60° 꽃 → 위에서 오른쪽 60°로',en:'60° right of the sun → dance 60° right of up'}},
    {sun0:270,sunW:0,quota:4,tol:16,arc:1,patches:[{b:220,d:45,f:1},{b:220,d:112,f:4}],
      tip:{ko:'멀리 있는 꽃은 길게 춤춰요',en:'Farther flowers need a longer dance'}},
    {sun0:100,sunW:6,quota:6,tol:14,patches:[{b:30,d:85,f:2}],
      tip:{ko:'해가 움직여요! 같은 꽃도 각도가 바뀌어요',en:'The sun moves! Same flower, new angle'}},
    {sun0:180,sunW:0,quota:5,tol:12,patches:[{b:110,d:60,f:1},{b:250,d:100,f:5},{b:20,d:55,f:2}],
      tip:{ko:'꽃이 가장 많은 곳을 알려 주세요',en:'Report the richest patch'}},
    {sun0:30,sunW:0,quota:6,tol:12,patches:[{b:100,d:95,f:4},{b:300,d:85,f:3}],rain:[{b:100,d:55,r:26}],
      tip:{ko:'일벌은 비구름을 지나가지 않아요',en:'Workers won\'t fly through rain'}},
    {sun0:300,sunW:6,quota:6,tol:12,patches:[{b:120,d:105,f:5},{b:225,d:80,f:3}],bird:[{b:120,d:58,r:20}],
      tip:{ko:'새가 있는 쪽으로 춤추면 일벌이 겁먹어요',en:'Dance toward the bird and they flee'}},
    {sun0:200,sunW:6,quota:8,tol:12,patches:[{b:120,d:105,f:4},{b:330,d:70,f:2}],rain:[{b:330,d:40,r:24}],
      tip:{ko:'해를 보면서 비를 피해요',en:'Watch the sun, dodge the rain'}},
    {sun0:60,sunW:7,quota:6,tol:12,patches:[{b:330,d:95,f:3},{b:200,d:100,f:4},{b:20,d:60,f:2}],bird:[{b:200,d:55,r:20}],
      tip:{ko:'새도 해도 조심!',en:'Mind the bird and the sun!'}},
    {sun0:120,sunW:7,quota:6,tol:12,patches:[{b:30,d:90,f:5},{b:300,d:110,f:4},{b:80,d:70,f:3}],
      rain:[{b:30,d:50,r:25}],bird:[{b:300,d:62,r:20}],
      tip:{ko:'모두 함께 — 진짜 정찰벌처럼!',en:'Everything at once — dance like a real scout!'}}
  ];

  function n360(a){a%=360;return a<0?a+360:a}
  function n180(a){a=n360(a);return a>180?a-360:a}
  function P(b,d){return {x:HX+d*Math.sin(b*D2R),y:HY-d*Math.cos(b*D2R)}}
  function sunAz(L,lt){return n360(L.sun0+L.sunW*lt)}
  /* 춤 → 지도 벡터. theta: 벌집 '위'에서 시계 방향 각도, len: 춤 길이(px) */
  function encode(theta,len,sun){var d=Math.max(0,Math.min(MAXLEN,len))*DK,b=n360(sun+theta),p=P(b,d);return {b:b,d:d,x:p.x,y:p.y}}
  function segCircle(ax,ay,bx,by,cx,cy,r){
    var dx=bx-ax,dy=by-ay,fx=ax-cx,fy=ay-cy,A=dx*dx+dy*dy,B=2*(fx*dx+fy*dy),Cc=fx*fx+fy*fy-r*r;
    if(Cc<=0)return 0;if(A<1e-9)return null;var disc=B*B-4*A*Cc;if(disc<0)return null;
    var t=(-B-Math.sqrt(disc))/(2*A);return t>=0&&t<=1?t:null}
  function finalize(src,n){
    var L={n:n,sun0:src.sun0,sunW:src.sunW,quota:src.quota,tol:src.tol||12,ghost:!!src.ghost,arc:!!src.arc,tip:src.tip||null,
      slant:src.slant||0,bonus:!!src.slant,
      patches:src.patches.map(function(p){var q=P(p.b,p.d);return {b:p.b,d:p.d,f:p.f,x:q.x,y:q.y,r:9+2*p.f}}),
      rain:(src.rain||[]).map(function(o){var q=P(o.b,o.d);return {b:o.b,d:o.d,r:o.r,x:q.x,y:q.y}}),
      bird:(src.bird||[]).map(function(o){var q=P(o.b,o.d);return {b:o.b,d:o.d,r:o.r||20,x:q.x,y:q.y}})};
    return L}
  /* 일벌의 비행 결과: 비/새에 막힘, 꽃밭 적중, 빗나감 */
  function resolve(L,enc){
    var best=null,i,o,t;
    for(i=0;i<L.rain.length;i++){o=L.rain[i];t=segCircle(HX,HY,enc.x,enc.y,o.x,o.y,o.r);if(t!=null&&(!best||t<best.t))best={t:t,kind:'rain',i:i}}
    for(i=0;i<L.bird.length;i++){o=L.bird[i];t=segCircle(HX,HY,enc.x,enc.y,o.x,o.y,o.r);if(t!=null&&(!best||t<best.t))best={t:t,kind:'bird',i:i}}
    if(best)return {kind:best.kind,i:best.i,at:{x:HX+(enc.x-HX)*best.t,y:HY+(enc.y-HY)*best.t},dist:enc.d*best.t};
    var bi=-1,bd=1e9;for(i=0;i<L.patches.length;i++){o=L.patches[i];t=Math.hypot(enc.x-o.x,enc.y-o.y);if(t<bd){bd=t;bi=i}}
    var p=L.patches[bi];
    if(bd<=p.r+L.tol)return {kind:'hit',i:bi,honey:p.f,err:bd,at:{x:enc.x,y:enc.y},dist:enc.d};
    return {kind:'miss',i:bi,err:bd,at:{x:enc.x,y:enc.y},dist:enc.d}}
  /* 학습용 힌트: 가장 가까운 꽃밭 기준 각도/거리 오차 (+면 시계 방향 = 오른쪽) */
  function hint(L,enc){var bi=0,bd=1e9;L.patches.forEach(function(p,i){var d=Math.hypot(enc.x-p.x,enc.y-p.y);if(d<bd){bd=d;bi=i}});
    var p=L.patches[bi];return {i:bi,da:n180(enc.b-p.b),dd:enc.d-p.d}}

  /* ---------- 상태 기계 ---------- */
  function newRun(n,L){var S={n:0,time:T0,score:0,ev:[],over:false};load(S,n||0,L);return S}
  function load(S,n,L){S.n=n;S.L=L||makeLevel(n);S.honey=0;S.phase='scout';S.pt=0;S.lt=0;S.trip=null;S.last=null;S.sunRef=null;S.tries=0;
    S.ev.push({t:'level',n:n})}
  function step(S,dt){
    if(S.over)return;
    if(S.phase!=='clear'){S.time-=dt;if(S.time<=0){S.time=0;S.over=true;S.ev.push({t:'over'});return}S.lt+=dt}
    S.pt+=dt;
    if(S.phase==='scout'){if(S.pt>=SCOUT_T){S.phase='dance';S.pt=0;if(S.sunRef==null)S.sunRef=sunAz(S.L,S.lt)}}
    else if(S.phase==='fly'){var tr=S.trip;
      if(!tr.landed&&S.pt>=tr.tOut){tr.landed=true;S.ev.push({t:'land',trip:tr})}
      if(S.pt>=tr.dur){S.last=tr;S.trip=null;
        if(tr.kind==='hit'){S.honey+=tr.honey;var gain=tr.honey*10+(tr.err<=6?10:0);S.score+=gain;tr.gain=gain;
          S.ev.push({t:'home',trip:tr,gain:gain});
          if(S.honey>=S.L.quota){S.phase='clear';S.pt=0;S.score+=25;S.time=Math.min(TCAP,S.time+TADD);S.ev.push({t:'clear',gain:25});return}}
        else S.ev.push({t:'home',trip:tr,gain:0});
        S.phase='dance';S.pt=0}}
    else if(S.phase==='clear'){if(S.pt>=CLEAR_T)load(S,S.n+1)}}
  function dance(S,theta,len){
    if(S.phase!=='dance'||S.over)return null;
    if(!(len>=MINLEN)){S.ev.push({t:'short'});return null}
    var sun=sunAz(S.L,S.lt),enc=encode(theta,len,sun),r=resolve(S.L,enc),out=r.dist/SPEED;
    r.enc=enc;r.sun=sun;r.theta=theta;r.len=len;r.tOut=out;r.hint=hint(S.L,enc);
    r.dur=r.kind==='hit'?out*2+COLLECT:r.kind==='miss'?out*2.1+WANDER:out*2+TURN;
    S.trip=r;S.phase='fly';S.pt=0;S.tries++;S.ev.push({t:'dance',trip:r});return r}

  /* ---------- 봇 (검증용) ---------- */
  function reach(L,p){return resolve(L,{x:p.x,y:p.y,d:p.d,b:p.b}).kind==='hit'}
  function bestPatch(L){var bi=-1;L.patches.forEach(function(p,i){if(!reach(L,p))return;
      if(bi<0||p.f>L.patches[bi].f||(p.f===L.patches[bi].f&&p.d<L.patches[bi].d))bi=i});return bi}
  /* mode: 'ok' 정답, 'up' 항상 위로, 'nosun' 레벨 시작 때의 해만 기억 */
  function botMove(S,mode){var L=S.L,i=bestPatch(L);if(i<0)i=0;var p=L.patches[i],
      sun=mode==='nosun'?S.sunRef:sunAz(L,S.lt);return {theta:mode==='up'?0:n180(p.b-sun),len:p.d/DK}}
  function simLevel(n,L,mode,limit,think){
    var S=newRun(n,L),dt=1/30,t=0;S.time=limit;think=think==null?1.2:think;
    while(!S.over&&S.phase!=='clear'){if(S.phase==='dance'&&S.pt>=think){var m=botMove(S,mode);dance(S,m.theta,m.len)}
      step(S,dt);t+=dt}
    return {ok:S.phase==='clear',t:t,tries:S.tries}}
  function simRun(mode,count,think){
    var S=newRun(0),dt=1/30,t=0,maxLv=0,lvStart=0;think=think==null?1.2:think;
    while(!S.over&&S.n<count){var n0=S.n;if(S.phase==='dance'&&S.pt>=think){var m=botMove(S,mode);dance(S,m.theta,m.len)}
      step(S,dt);t+=dt;if(S.n!==n0){maxLv=Math.max(maxLv,t-lvStart);lvStart=t}}
    return {cleared:S.n,over:S.over,t:t,maxLevelTime:maxLv,timeLeft:S.time,score:S.score}}

  /* ---------- 절차 생성 (11단계부터) ---------- */
  function rng(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=s;t=Math.imul(t^t>>>15,t|1);
    t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  function validate(L){
    if(bestPatch(L)<0)return false;
    if(!simLevel(L.n,L,'ok',12).ok)return false;
    if(simLevel(L.n,L,'up',40).ok)return false;
    if(L.sunW>0&&simLevel(L.n,L,'nosun',40).ok)return false;
    return true}
  var memo={};
  function gen(n){
    if(memo[n])return memo[n];
    var r=rng(n*7919+13),k,L=null;
    function r5(v){return Math.round(v/5)*5}
    for(k=0;k<80&&!L;k++){
      var moving=r()<.6,src={sun0:r5(r()*360),sunW:moving?5+Math.floor(r()*4):0,tol:12,patches:[],rain:[],bird:[]},
          np=1+(r()<.75?1:0)+(r()<.4?1:0),tries=0;
      while(src.patches.length<np&&tries++<60){var p={b:r5(r()*360),d:50+Math.round(r()*62),f:1+Math.floor(r()*5)},q=P(p.b,p.d);
        if(src.patches.some(function(o){var w=P(o.b,o.d);return Math.hypot(w.x-q.x,w.y-q.y)<54}))continue;src.patches.push(p)}
      var ri=-1;if(src.patches.length>=2&&r()<.5){ri=Math.floor(r()*src.patches.length);var t=src.patches[ri];
        src.rain.push({b:t.b+Math.round((r()-.5)*12),d:Math.round(30+r()*Math.max(4,t.d-48)),r:22+Math.round(r()*6)})}
      if(src.patches.length>=2&&r()<.45){var ui=Math.floor(r()*src.patches.length);if(ui===ri)ui=(ui+1)%src.patches.length;var u=src.patches[ui];
        src.bird.push({b:u.b+Math.round((r()-.5)*10),d:Math.round(34+r()*Math.max(4,u.d-52)),r:20})}
      if(n%4===3)src.slant=(r()<.5?-1:1)*(20+Math.floor(r()*15));
      var cand=finalize(src,n),bi=bestPatch(cand);if(bi<0)continue;
      cand.quota=cand.patches[bi].f*(moving?2:(r()<.5?1:2));if(cand.quota<2)cand.quota=2;
      if(validate(cand))L=cand}
    if(!L)L=finalize({sun0:(n*47)%360,sunW:0,quota:3,tol:12,patches:[{b:((n*47)+90)%360,d:80,f:3}]},n);
    memo[n]=L;return L}
  function makeLevel(n){return n<LEVELS.length?finalize(LEVELS[n],n):gen(n)}

  var CORE={LEVELS:LEVELS,makeLevel:makeLevel,encode:encode,resolve:resolve,hint:hint,sunAz:sunAz,newRun:newRun,step:step,dance:dance,
    botMove:botMove,bestPatch:bestPatch,simLevel:simLevel,simRun:simRun,validate:validate,n180:n180,n360:n360,P:P,
    K:{HX:HX,HY:HY,DK:DK,MINLEN:MINLEN,MAXLEN:MAXLEN,SPEED:SPEED,T0:T0,TADD:TADD,TCAP:TCAP,SCOUT_T:SCOUT_T}};
  if(typeof module!=='undefined'&&module.exports)module.exports=CORE;
  if(typeof SG==='undefined')return;

  /* =================================================================== 게임 */
  var S,tG=0,initAt=0,drag=null,kbOn=false,kbA=0,kbL=70,kbAnim=null,buzzT=0,dz,workers,motes,shadows,
      queen,banner,bannerT,lastLv,found,warned,clearT,meadow=null,comb=null,combGlow=[],keyQ=[];
  if(!window.__beeDanceKeys){window.__beeDanceKeys=true;
    window.addEventListener('keydown',function(e){var c=e.code;
      if(c==='ArrowLeft'||c==='KeyA'||c==='ArrowRight'||c==='KeyD'||c==='ArrowUp'||c==='KeyW'||c==='ArrowDown'||c==='KeyS'||(c==='Space'&&!e.repeat))
        keyQ.push({c:c,t:performance.now()})})}
  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function F(s){return s+'px Jua, system-ui, sans-serif'}

  function init(a){
    S=CORE.newRun(0);drag=null;kbOn=false;kbA=0;kbL=70;kbAnim=null;keyQ.length=0;initAt=performance.now();
    dz={x:CX,y:CY+20,ang:0,wag:0,tx:CX,ty:CY+20};
    workers=[];for(var i=0;i<7;i++)workers.push({x:CX+Math.cos(i)*60,y:CY+20+Math.sin(i)*60,ph:i*.9});
    motes=[];for(i=0;i<18;i++)motes.push({x:hash(i+3)*W,y:CT+hash(i+7)*(H-CT),v:5+hash(i+11)*10,p:hash(i+13)*6.3});
    shadows=[];for(i=0;i<3;i++)shadows.push({x:hash(i+30)*W,y:MT+40+hash(i+33)*200,s:.8+hash(i+36)*.6,v:6+hash(i+39)*6});
    queen={mood:0,moodT:0,clap:0,blink:2};banner=null;bannerT=0;lastLv=-1;found=[];warned=0;clearT=0;a.tempo(1)}

  function say(ko,en,col,t){banner={ko:ko,en:en,c:col||'#fff'};bannerT=t||2.6}

  function handleEvents(a){
    var ko=a.lang==='ko';
    for(var i=0;i<S.ev.length;i++){var e=S.ev[i],tr=e.trip;
      if(e.t==='level'){found=S.L.patches.map(function(){return 0});banner=null;kbA=0}
      else if(e.t==='short'){a.pop(dz.x,dz.y-30,ko?'더 길게 춤춰요!':'Dance longer!','#fff3c4');a.beep(180,.12,'triangle')}
      else if(e.t==='dance'){a.sfx('jump');a.beep(330,.08,'sine')}
      else if(e.t==='land'){
        if(tr.kind==='hit'){var p=S.L.patches[tr.i];a.sfx('coin');a.burst(p.x,p.y,'#ffe14d',14);
          a.pop(p.x,p.y-p.r-6,tr.err<=6?(ko?'딱 맞아요!':'Perfect!'):(ko?'찾았다!':'Found it!'),'#fff7b0')}
        else if(tr.kind==='miss'){a.beep(240,.14,'sine');a.beep(180,.2,'sine');a.burst(tr.at.x,tr.at.y,'#d9d3c0',8);a.pop(tr.at.x,tr.at.y-10,'?','#fff')}
        else if(tr.kind==='rain'){a.beep(150,.22,'triangle');a.burst(tr.at.x,tr.at.y,'#9fd0ff',12);a.pop(tr.at.x,tr.at.y-12,ko?'비다!':'Rain!','#cfe8ff');a.shake(3)}
        else {a.sfx('hit');a.burst(tr.at.x,tr.at.y,'#ffffff',12);a.pop(tr.at.x,tr.at.y-12,ko?'새다!':'Bird!','#ffd0c8');a.shake(5);queen.mood=3;queen.moodT=1}}
      else if(e.t==='home'){
        if(tr.kind==='hit'){a.add(e.gain);a.sfx('coin');a.beep(880,.1,'triangle');a.burst(HX,HY,'#ffc93c',10);a.pop(HX,HY-26,'+'+e.gain,'#ffe066');
          a.burst(336,470,'#ffb300',10);queen.mood=1;queen.moodT=1.6;queen.clap=1.4;
          say('꿀 +'+tr.honey+'!','Honey +'+tr.honey+'!','#ffe58a',1.6)}
        else{if(queen.mood!==3){queen.mood=2;queen.moodT=1.6}
          var h=tr.hint,da=Math.round(h.da/5)*5,detail=S.n<6;
          if(tr.kind==='rain')say('비구름에 막혔어요 — 다른 꽃으로!','Blocked by rain — try another patch!','#cfe8ff',3);
          else if(tr.kind==='bird')say('새가 무서워 돌아왔어요!','The bird scared them home!','#ffd0c8',3);
          else if(!detail)say('아무것도 못 찾았어요…','Nothing there…','#ffd9c0',2.4);
          else if(Math.abs(h.da)>=6)say((da>0?'+':'')+da+'° 너무 '+(da>0?'오른쪽':'왼쪽'),(da>0?'+':'')+da+'° too far '+(da>0?'right':'left'),'#ffd9c0',3.2);
          else if(h.dd>0)say('방향 좋아요! 조금 짧게','Right way! A bit shorter','#ffd9c0',3.2);
          else say('방향 좋아요! 조금 더 길게','Right way! A bit longer','#ffd9c0',3.2)}}
      else if(e.t==='clear'){a.add(e.gain);a.sfx('win');clearT=0;queen.mood=1;queen.moodT=2.2;queen.clap=2;
        ['#ffd23f','#ff9ec4','#ffffff','#ffb347'].forEach(function(c){a.burst(HX,HY,c,10)});a.tempo(1+Math.min(.5,S.n*.035))}
      else if(e.t==='over'){a.over()}}
    S.ev.length=0}

  function update(dt,inp,a){
    tG+=dt;var ko=a.lang==='ko',k,c;
    /* 키보드 */
    while(keyQ.length){k=keyQ.shift();if(k.t<initAt+40)continue;c=k.c;kbOn=true;drag=null;
      if(c==='ArrowLeft'||c==='KeyA')kbA=CORE.n180(kbA-5);else if(c==='ArrowRight'||c==='KeyD')kbA=CORE.n180(kbA+5);
      else if(c==='ArrowUp'||c==='KeyW')kbL=Math.min(MAXLEN,kbL+5);else if(c==='ArrowDown'||c==='KeyS')kbL=Math.max(25,kbL-5);
      else if(c==='Space'&&S.phase==='dance'&&!kbAnim){var tr=CORE.dance(S,kbA,kbL);if(tr)kbAnim={t:0,a:kbA,l:kbL}}
      if(c!=='Space')a.beep(520+kbL*2,.03,'square')}
    /* 터치/마우스: 벌집에서 끌어서 춤추기 */
    if(!drag&&inp.tap&&inp.down&&inp.x!=null&&inp.y>CT+4){
      kbOn=false;if(S.phase==='dance')drag={sx:inp.x,sy:inp.y,x:inp.x,y:inp.y,t:0};
      else if(S.phase==='fly')a.pop(inp.x,inp.y-20,ko?'일벌이 비행 중…':'Workers are out…','#fff3c4')}
    if(drag){
      if(inp.down&&inp.x!=null){drag.x=inp.x;drag.y=inp.y}
      drag.t+=dt;
      var dx=drag.x-drag.sx,dy=drag.y-drag.sy,len=Math.hypot(dx,dy);
      if(len>MAXLEN){drag.x=drag.sx+dx/len*MAXLEN;drag.y=drag.sy+dy/len*MAXLEN;len=MAXLEN}
      if(len>10){buzzT-=dt;if(buzzT<=0){buzzT=.085;a.beep(170+len*.6+(Math.random()*30),.05,'sawtooth')}}
      if(!inp.down){var ang=Math.atan2(dx,-dy)/D2R,theta=CORE.n180(ang-S.L.slant);
        CORE.dance(S,theta,len);drag=null}}
    if(kbAnim){kbAnim.t+=dt;buzzT-=dt;if(buzzT<=0&&kbAnim.t<.6){buzzT=.085;a.beep(200+kbAnim.l*.6,.05,'sawtooth')}if(kbAnim.t>.75)kbAnim=null}
    var pt0=S.pt;
    CORE.step(S,dt);
    if(S.phase==='scout')S.L.patches.forEach(function(p,i){if(!found[i]&&S.pt>=scoutReach(p)){found[i]=1;a.beep(1200+i*200,.06,'triangle');a.burst(p.x,p.y,'#fffbe0',6)}});
    else if(found.some(function(v){return !v}))found=found.map(function(){return 1});
    if(S.phase==='clear')clearT+=dt;
    handleEvents(a);
    if(S.over)return;
    if(S.time<10&&Math.ceil(S.time)!==warned&&S.phase!=='clear'){warned=Math.ceil(S.time);a.beep(880,.05,'square')}
    if(bannerT>0)bannerT-=dt;
    queen.moodT-=dt;if(queen.moodT<=0)queen.mood=0;queen.clap=Math.max(0,queen.clap-dt);
    queen.blink-=dt;if(queen.blink<-.13)queen.blink=2+Math.random()*2.5;
    /* 춤추는 벌 위치 */
    var sl=S.L.slant*D2R;
    if(drag){dz.tx=drag.x;dz.ty=drag.y;var ddx=drag.x-drag.sx,ddy=drag.y-drag.sy;if(Math.hypot(ddx,ddy)>6)dz.ang=Math.atan2(ddx,-ddy);dz.wag=Math.hypot(ddx,ddy)>6?1:.3}
    else if(kbAnim){var u=Math.min(1,kbAnim.t/.6),aa=(kbAnim.a+S.L.slant)*D2R;dz.tx=CX+Math.sin(aa)*kbAnim.l*u;dz.ty=CY-Math.cos(aa)*kbAnim.l*u;dz.ang=aa;dz.wag=u<1?1:0}
    else if(kbOn&&S.phase==='dance'){dz.tx=CX;dz.ty=CY;dz.ang=(kbA+S.L.slant)*D2R;dz.wag=0}
    else{dz.tx=CX+Math.sin(tG*.9)*14;dz.ty=CY+24+Math.sin(tG*1.8)*6;dz.ang=Math.sin(tG*.9)*.5+sl;dz.wag=0}
    var kk=drag||kbAnim?1:Math.min(1,dt*6);dz.x+=(dz.tx-dz.x)*kk;dz.y+=(dz.ty-dz.y)*kk;
    for(var i=0;i<workers.length;i++){var w=workers[i],wa=i/workers.length*6.283+tG*.25,rr=(drag||kbAnim?54:40)+Math.sin(tG*2+w.ph)*4;
      var tx=dz.x+Math.cos(wa)*rr,ty=dz.y+Math.sin(wa)*rr;w.x+=(tx-w.x)*Math.min(1,dt*(2.5+i*.3));w.y+=(ty-w.y)*Math.min(1,dt*(2.5+i*.3))}
    void pt0}

  function scoutReach(p){var md=0;S.L.patches.forEach(function(q){md=Math.max(md,q.d)});return .25+p.d/md*.7}

  /* ---------------- 그리기 도구 ---------------- */
  function mkMeadow(){var c=document.createElement('canvas');c.width=W;c.height=MB-MT;var m=c.getContext('2d'),h=MB-MT,i;
    var gr=m.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#b2dc7e');gr.addColorStop(1,'#78b552');m.fillStyle=gr;m.fillRect(0,0,W,h);
    var cols=['#8cc760','#6fae4c','#c3e590','#5f9e45','#a5d470'];
    for(i=0;i<300;i++){m.globalAlpha=.16;m.fillStyle=cols[i%5];m.beginPath();m.ellipse(hash(i)*W,hash(i+.5)*h,8+hash(i+.2)*22,5+hash(i+.7)*12,hash(i+.9)*3,0,7);m.fill()}
    m.globalAlpha=.55;m.strokeStyle='#4f8d3a';m.lineWidth=1.2;m.lineCap='round';
    for(i=0;i<260;i++){var x=hash(i+40)*W,y=hash(i+80)*h;m.beginPath();m.moveTo(x,y);m.lineTo(x-2+hash(i)*4,y-4-hash(i+1)*4);m.stroke()}
    m.globalAlpha=1;
    /* 연못 */
    m.fillStyle='rgba(40,80,40,.25)';m.beginPath();m.ellipse(344,152,40,24,0,0,7);m.fill();
    var pg=m.createRadialGradient(336,142,4,342,148,40);pg.addColorStop(0,'#bfe9ff');pg.addColorStop(1,'#4b9ccc');
    m.fillStyle=pg;m.beginPath();m.ellipse(342,148,38,22,0,0,7);m.fill();
    m.strokeStyle='rgba(255,255,255,.5)';m.lineWidth=1.5;m.beginPath();m.ellipse(338,144,20,8,0,3.4,5.6);m.stroke();
    m.fillStyle='#5aa148';m.beginPath();m.arc(326,156,5,.4,6.0);m.lineTo(326,156);m.fill();
    /* 나무 */
    [[22,40,20],[340,30,18],[332,226,22],[18,196,19],[24,118,14]].forEach(function(t,j){
      m.fillStyle='rgba(30,60,20,.28)';m.beginPath();m.ellipse(t[0]+8,t[1]+t[2]*.7,t[2]*1.1,t[2]*.55,0,0,7);m.fill();
      var tg=m.createRadialGradient(t[0]-t[2]*.4,t[1]-t[2]*.4,2,t[0],t[1],t[2]*1.2);tg.addColorStop(0,'#7fc35a');tg.addColorStop(1,'#2f6e2c');
      m.fillStyle=tg;for(var q=0;q<5;q++){m.beginPath();m.arc(t[0]+Math.cos(q*1.3+j)*t[2]*.45,t[1]+Math.sin(q*1.3+j)*t[2]*.4,t[2]*.7,0,7);m.fill()}
      m.fillStyle='rgba(220,255,180,.25)';m.beginPath();m.arc(t[0]-t[2]*.35,t[1]-t[2]*.35,t[2]*.35,0,7);m.fill()});
    /* 벌집 주변 흙 */
    var dg=m.createRadialGradient(HX,HY-MT,4,HX,HY-MT,26);dg.addColorStop(0,'rgba(170,130,80,.55)');dg.addColorStop(1,'rgba(170,130,80,0)');
    m.fillStyle=dg;m.beginPath();m.arc(HX,HY-MT,26,0,7);m.fill();
    return c}

  var HR=15,HW=HR*Math.sqrt(3);
  function hexPath(m,x,y,r){m.beginPath();for(var i=0;i<6;i++){var a=Math.PI/6+i*Math.PI/3;if(i)m.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);else m.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}m.closePath()}
  function mkComb(){var c=document.createElement('canvas'),Z=560;c.width=Z;c.height=Z;var m=c.getContext('2d');
    m.fillStyle='#8a4f14';m.fillRect(0,0,Z,Z);combGlow=[];
    for(var row=-1;row*HR*1.5<Z+HR;row++)for(var col=-1;col*HW<Z+HW;col++){
      var x=col*HW+(row%2?HW/2:0),y=row*HR*1.5,hs=hash(row*37+col*11+5),cx=x-Z/2,cy=y-Z/2;
      hexPath(m,x,y,HR-1.2);var ig=m.createRadialGradient(x-3,y-4,1,x,y,HR);
      if(hs<.26){ig.addColorStop(0,'#ffe27a');ig.addColorStop(.6,'#f7b52c');ig.addColorStop(1,'#c9781a');combGlow.push([cx,cy,hash(row+col*3)*6.3])}
      else if(hs<.38){ig.addColorStop(0,'#fff6dc');ig.addColorStop(.7,'#f2dcaa');ig.addColorStop(1,'#cfae6e')}
      else{ig.addColorStop(0,'#6b380c');ig.addColorStop(.7,'#94561a');ig.addColorStop(1,'#b8722a')}
      m.fillStyle=ig;m.fill();m.strokeStyle='#f4bf55';m.lineWidth=2.6;m.stroke();
      m.strokeStyle='rgba(120,60,10,.6)';m.lineWidth=1;hexPath(m,x+1,y+1.5,HR-3);m.stroke();
      if(hs<.26){m.fillStyle='rgba(255,255,255,.55)';m.beginPath();m.ellipse(x-4,y-5,4,2,-.5,0,7);m.fill()}
      else if(hs<.38){m.strokeStyle='rgba(160,120,60,.5)';m.lineWidth=1;m.beginPath();m.arc(x,y,5,3.6,5.8);m.stroke()}}
    return c}

  function flower(g,x,y,s,c1,c2,rot){g.fillStyle=c1;for(var i=0;i<5;i++){var a=rot+i*1.2566;g.beginPath();g.ellipse(x+Math.cos(a)*s*.55,y+Math.sin(a)*s*.55,s*.5,s*.32,a,0,7);g.fill()}
    g.fillStyle=c2;g.beginPath();g.arc(x,y,s*.3,0,7);g.fill();g.fillStyle='#ffd23a';g.beginPath();g.arc(x,y,s*.22,0,7);g.fill()}
  var PAL=[['#ff9cc2','#e8558f'],['#c4a2ff','#7f4fe0'],['#ffffff','#f0a020'],['#8fd6ff','#2f8fd8']];

  /* 작은 일벌 (지도) */
  function tinyBee(g,x,y,ang,pollen,t){g.save();g.translate(x,y);g.rotate(ang);
    g.fillStyle='rgba(255,255,255,.75)';var fl=1+Math.sin(t*60)*.35;g.beginPath();g.ellipse(-3,-1,3.2,1.8*fl,-.5,0,7);g.ellipse(3,-1,3.2,1.8*fl,.5,0,7);g.fill();
    g.fillStyle='#ffc61a';g.beginPath();g.ellipse(0,1,2.6,4,0,0,7);g.fill();g.fillStyle='#3a2410';g.fillRect(-2.6,1,5.2,1.3);g.beginPath();g.arc(0,-3,1.8,0,7);g.fill();
    if(pollen){g.fillStyle='#ff9f1a';g.beginPath();g.arc(-2.8,2.5,1.5,0,7);g.arc(2.8,2.5,1.5,0,7);g.fill()}
    g.restore()}

  /* 벌집 위의 벌. ang: 머리 방향(0=위). big이면 눈을 크게 그린다 */
  function bee(g,x,y,ang,s,wag,big,t,blink){
    g.save();g.translate(x,y);g.rotate(ang);g.scale(s,s);
    g.fillStyle='rgba(60,25,0,.35)';g.beginPath();g.ellipse(2,4,9,13,0,0,7);g.fill();
    var fl=Math.sin(t*50)*.25;
    g.fillStyle='rgba(235,248,255,.7)';g.strokeStyle='rgba(120,160,190,.6)';g.lineWidth=.8;
    g.save();g.rotate(-.5-fl);g.beginPath();g.ellipse(-6,-2,6,3.2,0,0,7);g.fill();g.stroke();g.restore();
    g.save();g.rotate(.5+fl);g.beginPath();g.ellipse(6,-2,6,3.2,0,0,7);g.fill();g.stroke();g.restore();
    /* 배(꼬리) — 춤출 때 좌우로 흔든다 */
    g.save();g.translate(0,1);g.rotate(Math.sin(t*75)*.42*wag);
    var bg=g.createLinearGradient(-6,0,6,0);bg.addColorStop(0,'#e89a10');bg.addColorStop(.5,'#ffd23a');bg.addColorStop(1,'#d88a0a');
    g.fillStyle=bg;g.beginPath();g.ellipse(0,7,6,8.5,0,0,7);g.fill();
    g.fillStyle='#3a2410';g.fillRect(-6,4,12,2.2);g.fillRect(-5.4,8.5,10.8,2.2);g.beginPath();g.moveTo(-1.5,15);g.lineTo(0,18);g.lineTo(1.5,15);g.fill();g.restore();
    g.fillStyle='#6a4318';g.beginPath();g.arc(0,-2,4.6,0,7);g.fill();g.fillStyle='rgba(255,220,120,.35)';g.beginPath();g.arc(-1.4,-3.4,2,0,7);g.fill();
    g.fillStyle='#3a2410';g.beginPath();g.arc(0,-8,4.4,0,7);g.fill();
    g.strokeStyle='#3a2410';g.lineWidth=1.1;g.beginPath();g.moveTo(-1.5,-11);g.quadraticCurveTo(-4,-15,-5,-17);g.moveTo(1.5,-11);g.quadraticCurveTo(4,-15,5,-17);g.stroke();
    if(big){g.fillStyle='#fff';if(blink){g.fillRect(-3.6,-9,2.6,.9);g.fillRect(1,-9,2.6,.9)}else{g.beginPath();g.arc(-2.2,-9,1.7,0,7);g.arc(2.2,-9,1.7,0,7);g.fill();
      g.fillStyle='#111';g.beginPath();g.arc(-2.2,-9.4,.9,0,7);g.arc(2.2,-9.4,.9,0,7);g.fill()}}
    else{g.fillStyle='#000';g.beginPath();g.arc(-2.2,-9,1,0,7);g.arc(2.2,-9,1,0,7);g.fill()}
    g.restore()}

  function sunIcon(g,x,y,r,t){g.save();g.translate(x,y);
    var gl=g.createRadialGradient(0,0,r*.3,0,0,r*2.6);gl.addColorStop(0,'rgba(255,240,150,.7)');gl.addColorStop(1,'rgba(255,240,150,0)');
    g.fillStyle=gl;g.beginPath();g.arc(0,0,r*2.6,0,7);g.fill();
    g.rotate(t*.6);g.strokeStyle='#ffb21e';g.lineWidth=r*.22;g.lineCap='round';
    for(var i=0;i<8;i++){g.rotate(.785);g.beginPath();g.moveTo(r*1.25,0);g.lineTo(r*(1.6+(i%2)*.25),0);g.stroke()}
    var sg=g.createRadialGradient(-r*.3,-r*.3,1,0,0,r);sg.addColorStop(0,'#fff6b0');sg.addColorStop(1,'#ffbe2e');
    g.fillStyle=sg;g.beginPath();g.arc(0,0,r,0,7);g.fill();g.restore()}

  function sunPos(az){var sx=Math.sin(az*D2R),sy=-Math.cos(az*D2R),x0=16,x1=W-16,y0=MT+16,y1=MB-16,t=1e9;
    if(sx>1e-6)t=Math.min(t,(x1-HX)/sx);if(sx<-1e-6)t=Math.min(t,(x0-HX)/sx);if(sy>1e-6)t=Math.min(t,(y1-HY)/sy);if(sy<-1e-6)t=Math.min(t,(y0-HY)/sy);
    return {x:HX+sx*t,y:HY+sy*t}}

  function dashLine(g,x0,y0,x1,y1,col,w,dash){g.strokeStyle=col;g.lineWidth=w;g.setLineDash(dash||[]);g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();g.setLineDash([])}
  function pill(g,x,y,w,h,col){g.fillStyle=col;g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,h/2);else g.rect(x,y,w,h);g.fill()}

  /* ---------------- 지도 ---------------- */
  function drawMap(g,a){
    var L=S.L,t=tG,i,p,ko=a.lang==='ko',sun=CORE.sunAz(L,S.lt);
    if(!meadow)meadow=mkMeadow();
    g.save();g.beginPath();g.rect(0,MT,W,MB-MT);g.clip();
    g.drawImage(meadow,0,MT);
    /* 바람에 흔들리는 풀빛 (움직이는 층 1) */
    g.globalAlpha=.08;g.fillStyle='#fffbd0';for(i=0;i<4;i++){var wx=((t*14+i*110)%(W+160))-80;g.beginPath();g.ellipse(wx,MT+60+i*55,70,14,-.3,0,7);g.fill()}g.globalAlpha=1;
    /* 거리 고리 (벌집 춤 각도기와 같은 크기) */
    g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=1;g.setLineDash([2,5]);
    [40,80,120].forEach(function(r){g.beginPath();g.arc(HX,HY,r,0,7);g.stroke()});g.setLineDash([]);
    /* 해 방향 광선 */
    var sp=sunPos(sun);var gr=g.createLinearGradient(HX,HY,sp.x,sp.y);gr.addColorStop(0,'rgba(255,230,120,0)');gr.addColorStop(1,'rgba(255,230,120,.55)');
    g.strokeStyle=gr;g.lineWidth=5;g.beginPath();g.moveTo(HX,HY);g.lineTo(sp.x,sp.y);g.stroke();
    /* 해가 갈 길 */
    if(L.sunW>0){g.fillStyle='rgba(255,236,150,.55)';for(i=1;i<=10;i++){var q=sunPos(sun+i*7);g.beginPath();g.arc(q.x,q.y,2.2-i*.12,0,7);g.fill()}}
    /* 비구름 지역 */
    L.rain.forEach(function(o){
      g.fillStyle='rgba(70,100,140,.28)';g.beginPath();g.arc(o.x,o.y,o.r,0,7);g.fill();
      g.strokeStyle='rgba(200,230,255,.7)';g.lineWidth=1.4;g.setLineDash([4,4]);g.beginPath();g.arc(o.x,o.y,o.r,0,7);g.stroke();g.setLineDash([]);
      g.save();g.beginPath();g.arc(o.x,o.y,o.r,0,7);g.clip();g.strokeStyle='rgba(210,235,255,.75)';g.lineWidth=1.2;
      for(var k=0;k<14;k++){var rx=o.x-o.r+((hash(k+o.x)*2*o.r+t*30)%(2*o.r)),ry=o.y-o.r+((hash(k*3+o.y)*2*o.r+t*170)%(2*o.r));
        g.beginPath();g.moveTo(rx,ry);g.lineTo(rx-2,ry+7);g.stroke()}g.restore();
      var cy=o.y-o.r*.55+Math.sin(t*1.2)*1.5;g.fillStyle='rgba(40,50,70,.25)';g.beginPath();g.ellipse(o.x+4,cy+12,o.r*.9,6,0,0,7);g.fill();
      var cg=g.createLinearGradient(0,cy-14,0,cy+8);cg.addColorStop(0,'#c9d3e0');cg.addColorStop(1,'#7d8aa0');g.fillStyle=cg;
      g.beginPath();g.arc(o.x-o.r*.45,cy,o.r*.38,0,7);g.arc(o.x,cy-6,o.r*.5,0,7);g.arc(o.x+o.r*.48,cy,o.r*.4,0,7);g.rect(o.x-o.r*.45,cy,o.r*.93,o.r*.38);g.fill()});
    /* 꽃밭 */
    L.patches.forEach(function(pp,j){if(!found[j])return;var c=PAL[j%PAL.length];
      g.fillStyle='rgba(40,70,20,.25)';g.beginPath();g.ellipse(pp.x+2,pp.y+3,pp.r,pp.r*.7,0,0,7);g.fill();
      g.fillStyle='rgba(120,190,80,.6)';g.beginPath();g.arc(pp.x,pp.y,pp.r*.85,0,7);g.fill();
      for(var k=0;k<pp.f;k++){var aa=k*2.4+j,rr=pp.f===1?0:pp.r*.62*Math.sqrt((k+.5)/pp.f),sw=Math.sin(t*2+k)*.6;
        flower(g,pp.x+Math.cos(aa)*rr+sw,pp.y+Math.sin(aa)*rr,8.5,c[0],c[1],k+t*.2)}
      /* 반짝이 */
      var tw=(t*1.3+j*.7)%2.2;if(tw<.6){var sa=1-tw/.6;g.strokeStyle='rgba(255,255,230,'+sa+')';g.lineWidth=1.6;var sx=pp.x+pp.r*.7,sy=pp.y-pp.r*.7,ss=4+tw*8;
        g.beginPath();g.moveTo(sx-ss,sy);g.lineTo(sx+ss,sy);g.moveTo(sx,sy-ss);g.lineTo(sx,sy+ss);g.stroke()}});
    /* 새 */
    L.bird.forEach(function(o){var scared=S.trip&&S.trip.kind==='bird'&&S.trip.landed;
      g.strokeStyle='rgba(255,120,100,.6)';g.lineWidth=1.3;g.setLineDash([3,4]);g.beginPath();g.arc(o.x,o.y,o.r,0,7);g.stroke();g.setLineDash([]);
      var by=o.y+Math.sin(t*3)*2-(scared?4:0);g.fillStyle='rgba(20,40,20,.3)';g.beginPath();g.ellipse(o.x+2,o.y+11,10,3.5,0,0,7);g.fill();
      var fw=Math.sin(t*(scared?30:6))*.4;g.fillStyle='#2f6fb8';
      g.save();g.translate(o.x-7,by);g.rotate(-.6-fw);g.beginPath();g.ellipse(-4,0,7,3.5,0,0,7);g.fill();g.restore();
      g.save();g.translate(o.x+7,by);g.rotate(.6+fw);g.beginPath();g.ellipse(4,0,7,3.5,0,0,7);g.fill();g.restore();
      var bg=g.createRadialGradient(o.x-3,by-4,1,o.x,by,10);bg.addColorStop(0,'#7fc0ff');bg.addColorStop(1,'#3a7fd0');g.fillStyle=bg;g.beginPath();g.arc(o.x,by,9,0,7);g.fill();
      g.fillStyle='#ffe9c8';g.beginPath();g.ellipse(o.x,by+3,5,4,0,0,7);g.fill();
      g.fillStyle='#ff9a2a';g.beginPath();g.moveTo(o.x-2.5,by-1);g.lineTo(o.x+2.5,by-1);g.lineTo(o.x,by+3);g.fill();
      var bl=((t+o.x)%3.2)<.12;g.fillStyle='#fff';g.beginPath();g.arc(o.x-3.5,by-4,2.4,0,7);g.arc(o.x+3.5,by-4,2.4,0,7);g.fill();
      g.fillStyle='#111';if(bl){g.fillRect(o.x-5.5,by-4.5,4,1);g.fillRect(o.x+1.5,by-4.5,4,1)}else{g.beginPath();g.arc(o.x-3.2,by-3.6,1.2,0,7);g.arc(o.x+3.2,by-3.6,1.2,0,7);g.fill()}
      g.fillStyle='#2f6fb8';g.beginPath();g.moveTo(o.x-2,by-9);g.lineTo(o.x,by-14);g.lineTo(o.x+2,by-9);g.fill()});
    /* 구름 그림자 (움직이는 층 2) */
    shadows.forEach(function(s){g.fillStyle='rgba(30,60,40,.12)';g.beginPath();g.ellipse(s.x,s.y,46*s.s,20*s.s,0,0,7);g.ellipse(s.x+30*s.s,s.y-8*s.s,30*s.s,16*s.s,0,0,7);g.fill()});
    /* 학습용 각도 호 (1~3단계) */
    if(L.arc&&S.phase!=='scout'){var tp=L.patches[L.patches.length-1],rel=CORE.n180(tp.b-sun),a0=(sun-90)*D2R,a1=(sun+rel-90)*D2R;
      g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=2;g.beginPath();g.arc(HX,HY,30,Math.min(a0,a1),Math.max(a0,a1));g.stroke();
      dashLine(g,HX,HY,tp.x,tp.y,'rgba(255,255,255,.5)',1.5,[4,4]);
      if(Math.abs(rel)>3){var am=(sun+rel/2)*D2R,lx=HX+Math.sin(am)*48,ly=HY-Math.cos(am)*48;pill(g,lx-20,ly-10,40,20,'rgba(40,30,10,.55)');
        g.fillStyle='#fff';g.font=F(13);g.textAlign='center';g.textBaseline='middle';g.fillText((rel>0?'↻':'↺')+Math.round(Math.abs(rel))+'°',lx,ly+1)}}
    /* 지난 비행 결과: 점선 = 내 춤, 흐린 선 = 정답 방향 */
    var lt=S.trip||S.last;
    if(lt&&lt.kind!=='hit'&&(S.phase==='dance'||(S.trip&&S.trip.landed))){var tp2=L.patches[lt.hint.i];
      dashLine(g,HX,HY,tp2.x,tp2.y,'rgba(255,240,170,.45)',4);
      dashLine(g,HX,HY,lt.enc.x,lt.enc.y,'rgba(255,255,255,.95)',2,[3,5]);
      g.strokeStyle='#ff6b5a';g.lineWidth=2.5;var ex=lt.enc.x,ey=lt.enc.y;g.beginPath();g.moveTo(ex-5,ey-5);g.lineTo(ex+5,ey+5);g.moveTo(ex+5,ey-5);g.lineTo(ex-5,ey+5);g.stroke()}
    /* 해 */
    sunIcon(g,sp.x,sp.y,11,t);
    /* 벌집(스켑) */
    g.fillStyle='rgba(40,30,10,.35)';g.beginPath();g.ellipse(HX+3,HY+12,17,6,0,0,7);g.fill();
    for(i=0;i<4;i++){var ry2=HY+8-i*6,rw=16-i*3;var hg=g.createLinearGradient(HX-rw,0,HX+rw,0);hg.addColorStop(0,'#b07a2a');hg.addColorStop(.4,'#f2c060');hg.addColorStop(1,'#9c6620');
      g.fillStyle=hg;g.beginPath();g.ellipse(HX,ry2,rw,5,0,0,7);g.fill();g.strokeStyle='rgba(110,70,20,.6)';g.lineWidth=1;g.stroke()}
    g.fillStyle='#3a2208';g.beginPath();g.ellipse(HX,HY+8,4,3,0,Math.PI,0);g.fill();
    /* 정찰벌 */
    if(S.phase==='scout')L.patches.forEach(function(pp,j){var r=scoutReach(pp),u=S.pt<r?S.pt/r:Math.max(0,1-(S.pt-r)/(SCOUT_T-r+.2)),
        ang=Math.atan2(pp.x-HX,-(pp.y-HY))+(S.pt>=r?Math.PI:0);tinyBee(g,HX+(pp.x-HX)*u,HY+(pp.y-HY)*u,ang,0,t+j)});
    /* 일벌 무리 */
    if(S.trip)drawSwarm(g,S.trip,S.pt,t);
    /* 비행 중 표시: 춤의 벡터 */
    if(S.trip&&!S.trip.landed)dashLine(g,HX,HY,S.trip.at.x,S.trip.at.y,'rgba(255,255,255,.35)',1.5,[2,6]);
    /* 정리 연출 */
    if(S.phase==='clear'){var u2=Math.min(1,clearT*3);g.globalAlpha=u2;pill(g,HX-96,HY-60,192,46,'rgba(70,40,5,.72)');
      g.fillStyle='#ffe58a';g.font=F(24);g.textAlign='center';g.textBaseline='middle';g.fillText(ko?'꿀 가득! +'+TADD+'초':'Honey full! +'+TADD+'s',HX,HY-37);g.globalAlpha=1}
    /* 위쪽 정보: 시간, 단계 */
    var tl=S.time,lowT=tl<10;pill(g,8,MT+6,74,24,lowT?'rgba(170,30,20,.75)':'rgba(40,30,10,.55)');
    g.strokeStyle=lowT?'#ffd0c8':'#fff';g.lineWidth=2;g.beginPath();g.arc(22,MT+18,6.5,0,7);g.stroke();
    g.beginPath();g.moveTo(22,MT+18);g.lineTo(22+Math.sin(-tl*.5)*4.5,MT+18-Math.cos(-tl*.5)*4.5);g.stroke();
    g.fillStyle='#fff';g.font=F(16);g.textAlign='left';g.textBaseline='middle';g.fillText(Math.ceil(tl)+(ko?'초':'s'),33,MT+19);
    var lv=(ko?'단계 ':'Lv ')+(S.n+1);g.font=F(15);var lw=g.measureText(lv).width+18;pill(g,W-8-lw,MT+6,lw,24,'rgba(40,30,10,.55)');
    g.fillStyle='#fff';g.textAlign='center';g.fillText(lv,W-8-lw/2,MT+19);
    g.restore();
    /* 지도와 벌집 경계 */
    var eg=g.createLinearGradient(0,MB-6,0,MB+8);eg.addColorStop(0,'rgba(60,30,0,0)');eg.addColorStop(.5,'rgba(60,30,0,.55)');eg.addColorStop(1,'rgba(60,30,0,0)');
    g.fillStyle=eg;g.fillRect(0,MB-6,W,14)}

  function drawSwarm(g,tr,pt,t){
    var N=7,tx=tr.at.x,ty=tr.at.y,dx=tx-HX,dy=ty-HY,ang=Math.atan2(dx,-dy),dur=tr.dur,out=tr.tOut,hold=dur-out*2;if(tr.kind==='miss')hold=dur-out*2.1;
    for(var i=0;i<N;i++){var lag=i*.05,q=pt-lag,u,x,y,a2=ang,pol=false,wob=Math.sin(t*9+i*1.7)*4;
      if(q<0)continue;
      if(q<out){u=q/out;x=HX+dx*u;y=HY+dy*u}
      else if(q<out+hold){var h=(q-out)/hold,ca=t*(tr.kind==='miss'?3:6)+i*.9,cr=tr.kind==='hit'?L_r(tr)*.7:tr.kind==='miss'?16+h*6:6;
        x=tx+Math.cos(ca)*cr;y=ty+Math.sin(ca)*cr*.8;a2=ca+1.6;if(tr.kind==='bird'||tr.kind==='rain'){x+=Math.sin(t*40+i)*2}}
      else{u=Math.max(0,1-(q-out-hold)/(dur-out-hold));x=HX+dx*u;y=HY+dy*u;a2=ang+Math.PI;pol=tr.kind==='hit';
        if(tr.kind==='miss'){wob*=1.6}}
      x+=Math.cos(ang)*wob;y+=Math.sin(ang)*wob;
      tinyBee(g,x,y,a2,pol,t+i)}
    if(tr.kind==='miss'&&pt>out&&pt<out+hold){g.fillStyle='rgba(255,255,255,.9)';g.font=F(14);g.textAlign='center';g.fillText('?',tx+Math.sin(t*4)*6,ty-22)}}
  function L_r(tr){return S.L.patches[tr.i]?S.L.patches[tr.i].r:10}

  /* ---------------- 벌집 ---------------- */
  function protBack(g,ox,oy){
    var up=S.L.slant*D2R;g.save();
    var dg=g.createRadialGradient(ox,oy,10,ox,oy,132);dg.addColorStop(0,'rgba(25,10,0,.62)');dg.addColorStop(.85,'rgba(25,10,0,.5)');dg.addColorStop(1,'rgba(25,10,0,0)');
    g.fillStyle=dg;g.beginPath();g.arc(ox,oy,134,0,7);g.fill();
    g.strokeStyle='rgba(255,236,180,.8)';g.lineWidth=1.6;g.setLineDash([3,5]);
    [40,80,120].forEach(function(r){g.beginPath();g.arc(ox,oy,r,0,7);g.stroke()});g.setLineDash([]);
    g.strokeStyle='rgba(255,236,180,.85)';g.lineWidth=1.5;
    for(var k=0;k<24;k++){var aa=up+k*15*D2R,r0=k%6===0?106:k%2?116:111;g.beginPath();g.moveTo(ox+Math.sin(aa)*r0,oy-Math.cos(aa)*r0);g.lineTo(ox+Math.sin(aa)*124,oy-Math.cos(aa)*124);g.stroke()}
    dashLine(g,ox,oy,ox+Math.sin(up)*124,oy-Math.cos(up)*124,'rgba(255,215,90,.95)',2.5,[6,4]);
    g.restore()}
  function protFront(g,ox,oy,theta,len){
    var sl=S.L.slant,up=sl*D2R,t=tG;g.save();
    sunIcon(g,ox+Math.sin(up)*138,oy-Math.cos(up)*138,8,t);
    if(len>2){var sa=(sl+theta)*D2R,ex=ox+Math.sin(sa)*len,ey=oy-Math.cos(sa)*len,a0=up-Math.PI/2,a1=sa-Math.PI/2;
      g.strokeStyle='rgba(255,226,120,.95)';g.lineWidth=3;g.beginPath();g.arc(ox,oy,26,Math.min(a0,a1),Math.max(a0,a1));g.stroke();
      g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=4;g.lineCap='round';g.setLineDash([8,6]);g.beginPath();g.moveTo(ox,oy);g.lineTo(ex,ey);g.stroke();g.setLineDash([]);
      g.fillStyle='#fff';g.beginPath();g.arc(ox,oy,4,0,7);g.fill();
      var am=(sl+theta/2)*D2R,lr=Math.abs(theta)<25?-30:44,lx=ox+Math.sin(am)*lr,ly=oy-Math.cos(am)*lr,th=Math.round(theta);
      if(Math.abs(theta)<25){lx=ox+Math.sin(sa+Math.PI)*30;ly=oy-Math.cos(sa+Math.PI)*30}
      pill(g,lx-31,ly-13,62,26,'rgba(50,25,0,.88)');g.fillStyle='#ffe58a';g.font=F(16);g.textAlign='center';g.textBaseline='middle';
      g.fillText(th===0?'0°':(th>0?'↻':'↺')+Math.abs(th)+'°',lx,ly+1)}
    g.restore()}

  function drawComb(g,a){
    var L=S.L,t=tG,i,ko=a.lang==='ko',sl=L.slant*D2R;
    if(!comb)comb=mkComb();
    g.save();g.beginPath();g.rect(0,CT,W,H-CT);g.clip();
    g.fillStyle='#5a3008';g.fillRect(0,CT,W,H-CT);
    g.save();g.translate(CX,CY);g.rotate(sl);g.drawImage(comb,-280,-280);
    /* 꿀 칸의 은은한 빛 */
    g.globalCompositeOperation='lighter';
    for(i=0;i<combGlow.length;i++){var c=combGlow[i],v=.5+.5*Math.sin(t*1.6+c[2]);if(v<.55)continue;g.fillStyle='rgba(255,190,60,'+((v-.55)*.35)+')';g.beginPath();g.arc(c[0],c[1],HR*.8,0,7);g.fill()}
    g.globalCompositeOperation='source-over';g.restore();
    /* 따뜻한 빛과 그늘 (움직이는 층) */
    var lx=CX+Math.sin(t*.3)*60,ly=CY+Math.cos(t*.23)*40,vg=g.createRadialGradient(lx,ly,30,CX,CY,300);
    vg.addColorStop(0,'rgba(255,220,130,.18)');vg.addColorStop(.6,'rgba(60,25,0,.05)');vg.addColorStop(1,'rgba(30,10,0,.6)');g.fillStyle=vg;g.fillRect(0,CT,W,H-CT);
    motes.forEach(function(m){var my=CT+(((m.y-CT-t*m.v)%(H-CT))+(H-CT))%(H-CT),mx=m.x+Math.sin(t*.8+m.p)*10;
      g.fillStyle='rgba(255,236,170,'+(.3+.3*Math.sin(t*2+m.p))+')';g.beginPath();g.arc(mx,my,1.7,0,7);g.fill()});
    /* 위 = 해 표시 (벌집 꼭대기) */
    var tx=CX+Math.sin(sl)*150,ty=CY-Math.cos(sl)*150;
    var bgg=g.createLinearGradient(0,CT,0,CT+40);bgg.addColorStop(0,'rgba(40,18,0,.75)');bgg.addColorStop(1,'rgba(40,18,0,0)');g.fillStyle=bgg;g.fillRect(0,CT,W,40);
    if(L.bonus){g.font=F(12);g.textAlign='left';g.textBaseline='middle';g.fillStyle='#ffb6d9';g.fillText(ko?'보너스: 기울어진 벌집':'Bonus: tilted comb',10,CT+14)}
    /* 1단계 길잡이 화살표 */
    if(L.ghost&&S.phase==='dance'&&!drag&&!kbOn&&!kbAnim){var gp=L.patches[0],ga=CORE.n180(gp.b-CORE.sunAz(L,S.lt)),gl=gp.d/DK,pul=.35+.25*Math.sin(t*4),
        ox=CX,oy=CY+50,gax=(ga+L.slant)*D2R,ex=ox+Math.sin(gax)*gl,ey=oy-Math.cos(gax)*gl,hand=(t*.8)%1;
      g.strokeStyle='rgba(255,255,255,'+pul+')';g.lineWidth=10;g.lineCap='round';g.beginPath();g.moveTo(ox,oy);g.lineTo(ex,ey);g.stroke();
      g.fillStyle='rgba(255,255,255,'+pul+')';g.beginPath();g.moveTo(ex,ey-14);g.lineTo(ex-11,ey+2);g.lineTo(ex+11,ey+2);g.fill();
      var hx=ox+(ex-ox)*hand,hy=oy+(ey-oy)*hand;g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(hx,hy,9,0,7);g.fill();
      g.strokeStyle='rgba(120,70,10,.6)';g.lineWidth=2;g.beginPath();g.arc(hx,hy,9,0,7);g.stroke()}
    /* 각도기 */
    var pr=null;
    if(drag){var ddx=drag.x-drag.sx,ddy=drag.y-drag.sy;pr=[drag.sx,drag.sy,CORE.n180(Math.atan2(ddx,-ddy)/D2R-L.slant),Math.hypot(ddx,ddy)]}
    else if(kbAnim)pr=[CX,CY,kbAnim.a,kbAnim.l];
    else if(kbOn&&S.phase==='dance')pr=[CX,CY,kbA,kbL];
    if(pr)protBack(g,pr[0],pr[1]);
    /* 일벌들: 춤추는 벌을 둘러싸고 더듬이로 만진다 */
    var nW=S.phase==='fly'?4:workers.length;
    for(i=0;i<nW;i++){var w=workers[i],wa=Math.atan2(dz.x-w.x,-(dz.y-w.y));bee(g,w.x,w.y,wa+Math.sin(t*3+w.ph)*.15,1.05,0,false,t+w.ph,false)}
    if(pr)protFront(g,pr[0],pr[1],pr[2],pr[3]);
    bee(g,dz.x,dz.y,dz.ang,1.45,dz.wag,true,t,queen.blink<0);
    /* 꿀단지 미터 */
    drawJar(g,ko);
    drawQueen(g,t);
    /* 안내 문구 */
    var msg=null,col='#fff';
    if(banner&&bannerT>0){msg=banner[a.lang];col=banner.c}
    else if(S.phase==='scout')msg=ko?'정찰벌이 꽃을 찾았어요!':'Scouts found flowers!';
    else if(S.phase==='fly')msg=ko?'일벌들이 날아가요…':'Workers are flying…';
    else if(S.phase==='dance'){
      if(L.tip&&S.n<LEVELS.length)msg=L.tip[a.lang];
      else msg=kbOn?(ko?'←→ 방향 · ↑↓ 길이 · Space 춤':'←→ angle · ↑↓ length · Space dance'):(ko?'벌집을 끌어서 춤춰요':'Drag on the comb to dance')}
    if(msg){var fs=16;g.font=F(fs);while(fs>12&&g.measureText(msg).width>W-48){fs--;g.font=F(fs)}var mw=Math.min(W-20,g.measureText(msg).width+28);pill(g,CX-mw/2,CT+30,mw,28,'rgba(45,20,0,.72)');
      g.fillStyle=col;g.textAlign='center';g.textBaseline='middle';g.fillText(msg,CX,CT+45)}
    sunIcon(g,tx,ty,8,t);g.fillStyle='rgba(255,236,170,.95)';g.font=F(12);g.textAlign='left';g.textBaseline='middle';
    if(L.bonus){g.save();g.translate(tx,ty);g.rotate(sl);g.strokeStyle='rgba(255,215,90,.9)';g.lineWidth=2;g.beginPath();g.moveTo(0,14);g.lineTo(0,40);g.stroke();g.restore()}
    var ux=Math.min(tx+16,W-80);g.fillText(ko?'↑ 위 = 해 쪽':'↑ up = sun',ux,ty+(L.bonus?-14:1));
    if(kbOn&&S.phase==='dance'&&L.tip&&S.n<3){g.font=F(12);g.fillStyle='rgba(255,236,170,.85)';g.fillText(ko?'←→ 방향 · ↑↓ 길이 · Space 춤':'←→ angle · ↑↓ length · Space dance',CX,CT+70)}
    g.restore()}

  function drawJar(g,ko){
    var x=322,y=404,w=30,h=150,f=Math.min(1,S.honey/S.L.quota);
    g.fillStyle='rgba(30,10,0,.45)';g.beginPath();g.ellipse(x+w/2+3,y+h+4,w*.65,6,0,0,7);g.fill();
    pill(g,x-2,y-2,w+4,h+4,'rgba(255,240,210,.55)');
    g.save();g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,12);else g.rect(x,y,w,h);g.clip();
    g.fillStyle='rgba(70,35,5,.7)';g.fillRect(x,y,w,h);
    var hy=y+h*(1-f),hg=g.createLinearGradient(x,0,x+w,0);hg.addColorStop(0,'#e88a0c');hg.addColorStop(.5,'#ffd23a');hg.addColorStop(1,'#e08008');
    g.fillStyle=hg;g.beginPath();g.moveTo(x,hy);for(var i=0;i<=6;i++)g.lineTo(x+i*w/6,hy+Math.sin(tG*3+i)*2);g.lineTo(x+w,y+h);g.lineTo(x,y+h);g.fill();
    g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x+5,y+6,4,h-12);g.restore();
    g.fillStyle='#c98a2a';pill(g,x-4,y-10,w+8,12,'#b8741e');
    g.fillStyle='#fff';g.font=F(14);g.textAlign='center';g.textBaseline='middle';g.fillText(S.honey+'/'+S.L.quota,x+w/2,y+h+18);
    g.font=F(11);g.fillStyle='rgba(255,236,170,.9)';g.fillText(ko?'꿀':'honey',x+w/2,y-20)}

  function drawQueen(g,t){
    var x=50,y=588,m=queen.mood,cl=queen.clap>0,b=Math.sin(t*2)*1.5+(m===1?-Math.abs(Math.sin(t*10))*4:0);
    g.save();g.translate(x,y+b);
    g.fillStyle='rgba(30,10,0,.45)';g.beginPath();g.ellipse(2,40-b,30,7,0,0,7);g.fill();
    /* 날개 */
    var fl=Math.sin(t*(m===1?30:4))*.15;g.fillStyle='rgba(235,248,255,.75)';g.strokeStyle='rgba(150,180,210,.7)';g.lineWidth=1;
    g.save();g.rotate(-.4-fl);g.beginPath();g.ellipse(-22,0,15,8,0,0,7);g.fill();g.stroke();g.restore();
    g.save();g.rotate(.4+fl);g.beginPath();g.ellipse(22,0,15,8,0,0,7);g.fill();g.stroke();g.restore();
    /* 몸 */
    var bg=g.createRadialGradient(-6,10,3,0,16,26);bg.addColorStop(0,'#ffe066');bg.addColorStop(1,'#e59a10');g.fillStyle=bg;g.beginPath();g.ellipse(0,18,19,22,0,0,7);g.fill();
    g.fillStyle='#4a2c10';g.beginPath();g.ellipse(0,16,18.6,3.2,0,0,7);g.ellipse(0,27,15,3,0,0,7);g.fill();
    /* 팔 (박수) */
    var ca=cl?Math.abs(Math.sin(t*14)):0,ax=13-ca*9,ay=6-ca*4;g.fillStyle='#4a2c10';
    g.beginPath();g.ellipse(-ax,ay,3.4,6,.5+ca*.6,0,7);g.ellipse(ax,ay,3.4,6,-.5-ca*.6,0,7);g.fill();
    if(cl&&ca>.92){g.strokeStyle='#fff3a0';g.lineWidth=1.5;g.beginPath();g.moveTo(-6,-4);g.lineTo(-10,-9);g.moveTo(6,-4);g.lineTo(10,-9);g.moveTo(0,-5);g.lineTo(0,-11);g.stroke()}
    /* 머리 */
    var hg=g.createRadialGradient(-5,-14,2,0,-10,16);hg.addColorStop(0,'#ffe58a');hg.addColorStop(1,'#f0a818');g.fillStyle=hg;g.beginPath();g.arc(0,-10,14,0,7);g.fill();
    /* 더듬이 */
    var dr=m===2?5:0;g.strokeStyle='#4a2c10';g.lineWidth=1.8;g.beginPath();g.moveTo(-5,-22);g.quadraticCurveTo(-12,-32+dr,-16,-28+dr);g.moveTo(5,-22);g.quadraticCurveTo(12,-32+dr,16,-28+dr);g.stroke();
    g.fillStyle='#4a2c10';g.beginPath();g.arc(-16,-28+dr,2.4,0,7);g.arc(16,-28+dr,2.4,0,7);g.fill();
    /* 왕관 */
    g.fillStyle='#ffcf3a';g.strokeStyle='#b07a10';g.lineWidth=1;g.beginPath();g.moveTo(-9,-21);g.lineTo(-9,-30);g.lineTo(-4.5,-25);g.lineTo(0,-32);g.lineTo(4.5,-25);g.lineTo(9,-30);g.lineTo(9,-21);g.closePath();g.fill();g.stroke();
    g.fillStyle='#ff5f97';g.beginPath();g.arc(0,-25,1.8,0,7);g.fill();
    /* 눈 */
    var bl=queen.blink<0;
    if(m===1&&!bl){g.strokeStyle='#2a1808';g.lineWidth=2;g.beginPath();g.arc(-5,-10,3,3.4,6);g.stroke();g.beginPath();g.arc(5,-10,3,3.4,6);g.stroke()}
    else if(bl){g.strokeStyle='#2a1808';g.lineWidth=2;g.beginPath();g.moveTo(-8,-10);g.lineTo(-2,-10);g.moveTo(2,-10);g.lineTo(8,-10);g.stroke()}
    else{var er=m===3?4.4:3.8;g.fillStyle='#fff';g.beginPath();g.arc(-5,-10,er,0,7);g.arc(5,-10,er,0,7);g.fill();
      var lx=(dz.x-x)/200,ly=(dz.y-y)/300;g.fillStyle='#2a1808';g.beginPath();g.arc(-5+lx*2,-10+ly*2,2,0,7);g.arc(5+lx*2,-10+ly*2,2,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(-5.6+lx*2,-11+ly*2,.7,0,7);g.arc(4.4+lx*2,-11+ly*2,.7,0,7);g.fill();
      if(m===2){g.strokeStyle='#2a1808';g.lineWidth=1.4;g.beginPath();g.moveTo(-9,-16);g.lineTo(-2,-15);g.moveTo(9,-16);g.lineTo(2,-15);g.stroke()}}
    g.fillStyle='rgba(255,110,120,.5)';g.beginPath();g.arc(-9,-5,2.6,0,7);g.arc(9,-5,2.6,0,7);g.fill();
    g.strokeStyle='#2a1808';g.fillStyle='#b8323c';g.lineWidth=1.5;
    if(m===1){g.beginPath();g.arc(0,-5,4,0,Math.PI);g.fill()}else if(m===2){g.beginPath();g.arc(0,-1,3,3.5,5.9);g.stroke()}
    else if(m===3){g.beginPath();g.ellipse(0,-4,2.2,3,0,0,7);g.fill()}else{g.beginPath();g.arc(0,-6,3,.3,2.8);g.stroke()}
    g.restore()}

  function draw(g,a,dt){
    var t=tG;
    shadows.forEach(function(s){s.x+=s.v*(dt||0);if(s.x>W+90)s.x=-90});
    var bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#2a1606');bg.addColorStop(1,'#140a02');g.fillStyle=bg;g.fillRect(-20,-20,W+40,H+40);
    /* HUD 띠 */
    var hb=g.createLinearGradient(0,0,0,MT);hb.addColorStop(0,'#5b3410');hb.addColorStop(1,'#3a1f06');g.fillStyle=hb;g.fillRect(-20,-20,W+40,MT+20);
    g.fillStyle='rgba(255,210,90,.12)';for(var i=0;i<8;i++){hexPath(g,((i*52+t*8)%(W+60))-30,16,10);g.fill()}
    drawMap(g,a);drawComb(g,a)}

  SG.run({id:'bee-dance',
    title:{ko:'꿀벌 춤',en:'Bee Dance'},
    how:{ko:'벌집 위쪽은 해 쪽이에요. 꽃이 해에서 얼마나 돌아 있는지 그 각도로, 멀면 길게 벌집을 끌어 춤추면 일벌이 날아가요. 해는 계속 움직여요!',
         en:'Up on the comb means toward the sun. Drag on the comb at the flower\'s angle from the sun — longer for farther — and the workers fly there. The sun keeps moving!'},
    init:init,update:update,draw:draw});
  window.__beeDance=function(){return {phase:S.phase,n:S.n,sun:CORE.sunAz(S.L,S.lt),honey:S.honey,tries:S.tries,last:S.last&&{k:S.last.kind,th:S.last.theta,len:S.last.len,sun:S.last.sun}}};
})();
