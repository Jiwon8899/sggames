/* 종이비행기 교실 (Paper Plane) — 먼저 접고, 그다음 날린다.
   접기(코·날개·날개끝·클립)가 양력·항력·안정성·코 무게를 바꾸고, 2D 글라이더 모델(받음각에 따른 양력, 항력,
   중력, 코 무게에서 오는 피칭 모멘트)이 비행을 만든다. 물리·레벨·생성기는 DOM 없이 돈다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,FY=584,ROOM=480,LX=62,LY=196,G=300,STEP=1/120,KL=0.012,CLA=3.3,AS=0.3,PR=5,TMAX=9,
      PMIN=80,PMAX=420,AMIN=-20,AMAX=75,PUFF=85,PUFFN=2;
  var DEF=[1,1,0,0];

  /* ---------- 접기 → 비행 특성 ----------
     f=[코(0 뾰족,1 뭉툭,2 접어넘김), 날개(0 좁게,1 보통,2 넓게), 날개끝(0 평평,1 위로,2 아래로), 클립(0,1)] */
  function stats(f){var n=f[0],w=f[1],t=f[2],c=f[3],nw=[0.15,0.3,0.75][n]+0.8*c;
    return {S:[0.5,0.8,1.2][w],k:[0.7,0.3,0.1][w],cd0:[0.03,0.07,0.05][n]+[0.09,0.04,0.03][w],
      m:1+0.2*c+(n===2?0.12:0),nw:nw,a0:0.30-0.2*nw+[0,0.03,-0.1][t],km:1+1.2*nw+[0,1.0,-0.35][t],kq:0.4+[0,0.5,0][t],pd:[0.05,0.6,0][t],fl:[0,0.05,0.3][w]}}
  function wrap(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a}
  function cl(a){var s=a<0?-1:1,x=Math.abs(a);if(x<=AS)return CLA*a;var mx=CLA*AS,v=mx*Math.max(0.45,1-1.8*(x-AS));
    if(x>1.2)v*=Math.max(0,Math.cos(x)/Math.cos(1.2));return s*v}
  function speedOf(pow){return PMIN+(PMAX-PMIN)*pow}

  /* ---------- 레벨 ----------
     세계 좌표: x 오른쪽, y 위(바닥 0, 천장 ROOM). w: 방 너비. tg: 목표.
       basket{x}  window{y0,y1}(오른쪽 벽)  ring{x,y,r}  desk{x0,x1,h}
     ob: [종류,x,y,w,h] 사각 장애물(y=아래). 종류: shelf, box, lamp, bear, cab, plant
     fan: [x,y,r] 천장 선풍기(원) */
  var LEVELS=[
    {w:360,tg:{k:'basket',x:270},sol:{f:[1,1,0,0]}},
    {w:850,tg:{k:'basket',x:780},sol:{f:[1,2,0,0]},hint:{ko:'복도 끝까지! 날개를 넓게 접어요',en:'Down the whole hall! Fold wide wings'}},
    {w:390,tg:{k:'window',y0:280,y1:362},sol:{f:[0,0,0,1]},hint:{ko:'높은 창문! 뾰족·좁게·클립 = 다트',en:'High window! Pointed, narrow + clip = dart'}},
    {w:822,tg:{k:'ring',x:680,y:144,r:34},ob:[['cab',182,351,108,129]],sol:{f:[0,0,1,1]},
      hint:{ko:'다트가 곤두박질? 날개 끝을 위로!',en:'Dart nosediving? Fold the tips up!'}},
    {w:560,tg:{k:'basket',x:470},ob:[['shelf',300,0,50,190]],fan:[[200,425,44]],sol:{f:[0,0,0,1]},
      hint:{ko:'선풍기 아래, 책장 위로 — 다트로!',en:'Under the fan, over the shelf — dart!'}},
    {w:560,tg:{k:'window',y0:91,y1:166},ob:[['cab',178,368,112,112]],sol:{f:[1,2,1,0]},
      hint:{ko:'넓은 날개 + 끝 위로 — 살살 던져요',en:'Wide wings, tips up — throw gently'}},
    {w:620,tg:{k:'desk',x0:470,x1:580,h:120},ob:[['bear',250,0,86,96],['lamp',380,330,56,150]],sol:{f:[1,1,0,0]},
      hint:{ko:'곰 선생님을 깨우지 말고 친구 책상에!',en:'Don\'t wake Teacher Bear — land on the desk!'}},
    {w:620,tg:{k:'ring',x:470,y:252,r:34},ob:[['shelf',300,0,56,190],['lamp',540,360,50,120]],sol:{f:[0,1,0,1]},
      hint:{ko:'종이 고리 통과! 높이 쭉 가는 다트로',en:'Through the paper ring — darts fly high'}},
    {w:920,tg:{k:'basket',x:845},ob:[['cab',280,290,180,190],['shelf',590,0,50,46]],fan:[[700,430,44]],sol:{f:[1,2,1,0]},
      hint:{ko:'긴 교실 끝 휴지통 — 넓은 날개, 끝은 위로',en:'Far basket — wide wings, tips up'}},
    {w:600,tg:{k:'window',y0:196,y1:272},ob:[['bear',220,0,86,96],['lamp',390,340,56,140]],fan:[[520,436,40]],sol:{f:[0,1,1,1]},
      hint:{ko:'전부 다! 곰·전등·선풍기를 지나 창문으로',en:'Everything! Past bear, lamp and fan'}}
  ];
  function rect(o){return {k:o[0],x:o[1],y:o[2],w:o[3],h:o[4]}}
  function prep(L){L.obs=(L.ob||[]).map(rect);L.fans=L.fan||[];
    var t=L.tg;if(t.k==='basket'){L.obs.push({k:'basketBody',x:t.x-26,y:0,w:52,h:40})}
    if(t.k==='desk'){L.obs.push({k:'deskBody',x:t.x0,y:0,w:t.x1-t.x0,h:t.h-6})}
    return L}

  /* 목표 판정 */
  function inTarget(L,s){var t=L.tg;
    if(t.k==='basket')return s.vy<0&&Math.abs(s.x-t.x)<24&&s.y<58&&s.y>36;
    if(t.k==='window')return s.x>L.w-PR-2&&s.y>t.y0+3&&s.y<t.y1-3;
    if(t.k==='ring')return Math.hypot(s.x-t.x,s.y-t.y)<t.r-3;
    if(t.k==='desk')return s.vy<0&&s.x>t.x0+6&&s.x<t.x1-4&&s.y<t.h+8&&s.y>t.h-6;
    return false}
  function hitObs(L,x,y){var i,o;
    for(i=0;i<L.obs.length;i++){o=L.obs[i];
      if(o.k==='lamp'){var cx=o.x+o.w/2;if((x>o.x-PR&&x<o.x+o.w+PR&&y>o.y-PR&&y<o.y+38+PR)||(Math.abs(x-cx)<3+PR&&y>o.y))return o;continue}
      if(x>o.x-PR&&x<o.x+o.w+PR&&y>o.y-PR&&y<o.y+o.h+PR)return o}
    for(i=0;i<L.fans.length;i++){o=L.fans[i];if(Math.hypot(x-o[0],(y-o[1])*2.2)<o[2]+PR)return {k:'fan'}}
    return null}

  function launch(L,f,ang,pow){var P=stats(f),sp=speedOf(pow),a=ang*Math.PI/180;
    return {L:L,P:P,f:f,x:LX,y:LY,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,th:a,om:0,al:0,v:sp,t:0,dth:0,maxDth:0,minDth:0,minTh:a,stall:false,
      st:'fly',why:'',hit:null,a0:ang,puffs:PUFFN,dist:0,acc:0}}
  function puff(s){if(s.puffs<=0||s.st!=='fly')return false;s.puffs--;s.vy+=PUFF;s.om+=1.2;return true}
  function tick(s){if(s.st!=='fly')return;var P=s.P,L=s.L,h=STEP,v=Math.hypot(s.vx,s.vy)||1e-6,gm=Math.atan2(s.vy,s.vx),al=wrap(s.th-gm),
      fv=Math.max(0,v-220)/100,c=cl(al),cd=P.cd0+P.k*c*c+0.6*Math.pow(Math.sin(al),2)+P.fl*fv*fv,q=KL*v*v*P.S,Lf=q*c,D=q*cd,ux=s.vx/v,uy=s.vy/v,
      qn=(v/200)*(v/200),mom=P.km*qn*Math.sin(P.a0-al)*60-P.kq*Math.sqrt(qn)*s.om*12-s.om*1.2;
    var gr=s.gm0==null?0:wrap(gm-s.gm0)/h,pa=-P.pd*gr*v;s.gm0=gm;
    s.vx+=((-uy*Lf-ux*D)/P.m-uy*pa)*h;s.vy+=((ux*Lf-uy*D)/P.m+ux*pa-G)*h;
    s.om+=mom*h;s.th+=s.om*h;s.dth+=s.om*h;if(s.dth>s.maxDth)s.maxDth=s.dth;if(s.dth<s.minDth)s.minDth=s.dth;
    if(Math.abs(al)>AS+0.15&&v<260)s.stall=true;if(s.th<s.minTh)s.minTh=s.th;
    var ox=s.x,oy=s.y;s.x+=s.vx*h;s.y+=s.vy*h;s.t+=h;s.al=al;s.v=v;s.dist+=Math.hypot(s.x-ox,s.y-oy);
    if(inTarget(L,s)){s.st='win';return}
    var o=hitObs(L,s.x,s.y);
    if(o){s.st='fail';s.why=o.k==='bear'?'bear':'obs';s.hit=o;return}
    if(s.y<PR){s.y=PR;s.st='fail';s.why='floor'}
    else if(s.y>ROOM-PR){s.y=ROOM-PR;s.st='fail';s.why='ceil'}
    else if(s.x>L.w-PR){s.x=L.w-PR;s.st='fail';s.why='wall'}
    else if(s.x<PR){s.x=PR;s.st='fail';s.why='wall'}
    else if(s.t>TMAX){s.st='fail';s.why='time'}}
  function advance(s,dt){s.acc+=dt;var n=0;while(s.acc>=STEP&&s.st==='fly'&&n<12){tick(s);s.acc-=STEP;n++}if(n>=12)s.acc=0}
  function runThrow(L,f,ang,pow){var s=launch(L,f,ang,pow);while(s.st==='fly')tick(s);return s}
  function loops(s){return Math.floor(Math.max(s.maxDth,-s.minDth)/(2*Math.PI)+0.08)}
  /* 조준 중 보여 주는 0.6초 미리보기 */
  function ghost(L,f,ang,pow){var s=launch(L,f,ang,pow),pts=[],i;for(i=0;i<72&&s.st==='fly';i++){tick(s);if(i%4===3)pts.push([s.x,s.y])}return pts}

  /* ---------- 결정적 난수 ---------- */
  function rng(seed){var s=(seed>>>0)^0x9e3779b9;return function(){s=(s+0x6D2B79F5)|0;var t=Math.imul(s^(s>>>15),1|s);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}}


  /* ---------- 절차 생성 레벨(11번째부터) ----------
     빈 방에서 무작위 접기+던지기로 실제 비행을 먼저 하고, 그 궤적 위에 목표를 놓고, 궤적에서 떨어진 곳에만 장애물을 둔다.
     그다음 같은 던지기로 정말 들어가는지, 조준이 조금 흔들려도(±2°, ±3%) 들어가는지 확인한 것만 쓴다. */
  function robustCount(L,f,a,p){var ok=0,da,dp;for(da=-2;da<=2;da++)for(dp=-2;dp<=2;dp++)
    if(runThrow(L,f,a+da,Math.max(0,Math.min(1,p+dp*0.015))).st==='win')ok++;return ok}
  function rectNear(o,x,y,m){return x>o.x-m&&x<o.x+o.w+m&&y>o.y-m&&y<o.y+o.h+m}
  function genLevel(n){
    var r=rng(n*7919+101),ri=function(a,b){return a+Math.floor(r()*(b-a+1))},at,i;
    for(at=0;at<80;at++){
      var w=ri(380,880),f=[ri(0,2),ri(0,2),ri(0,2),r()<0.45?1:0],a=ri(-12,55),p=Math.round((0.2+r()*0.8)*100)/100;
      var E=prep({w:w,tg:{k:'none'}}),s=launch(E,f,a,p),path=[];
      while(s.st==='fly'){tick(s);path.push([s.x,s.y,s.vy])}
      if(s.t<1.1)continue;
      var cands=[];
      for(i=1;i<path.length;i++)if(path[i][1]<=47&&path[i-1][1]>47&&path[i][2]<0){if(path[i][0]>180&&path[i][0]<w-40)cands.push({k:'basket',x:Math.round(path[i][0]+ri(-5,5))});break}
      if(s.why==='wall'&&s.x>w-PR-2&&s.y>100&&s.y<410){var y0=Math.round(s.y-ri(30,44));cands.push({k:'window',y0:y0,y1:y0+76})}
      var k0=Math.floor(path.length*(0.45+r()*0.4)),pt=path[k0];
      if(pt&&pt[0]>180&&pt[0]<w-50&&pt[1]>60&&pt[1]<420)cands.push({k:'ring',x:Math.round(pt[0]+ri(-5,5)),y:Math.round(pt[1]+ri(-5,5)),r:34});
      if(!cands.length)continue;
      var tg=cands[ri(0,cands.length-1)],L={w:w,tg:tg,ob:[],fan:[],gen:n},T=prep({w:w,tg:tg});
      /* 목표에 닿기 전까지의 궤적 */
      var s2=launch(T,f,a,p),pp=[];while(s2.st==='fly'){tick(s2);pp.push([s2.x,s2.y])}
      if(s2.st!=='win')continue;
      if(tg.k!=='window'){var mx=0;for(i=0;i<pp.length;i++)mx=Math.max(mx,pp[i][0]);L.w=w=Math.max(360,Math.round(Math.max(mx,tg.x)+ri(70,130)))}
      var want=Math.min(3,1+Math.floor((n-10)/3)),tries=0;
      while(L.ob.length+L.fan.length<want&&tries<40){tries++;
        var kind=r(),o,ox=ri(130,w-70);
        if(kind<0.25){var cy=ri(250,380);o=['cab',ox,cy,ri(70,180),ROOM-cy]}
        else if(kind<0.5)o=['shelf',ox,0,ri(36,64),ri(110,260)];
        else if(kind<0.65){var ly=ri(300,400);o=['lamp',ox,ly,ri(44,64),ROOM-ly]}
        else if(kind<0.8)o=['bear',ox,0,86,96];
        else o=['fan',ox,ROOM-ri(48,70),ri(36,48)];
        var ok=true,R0=o[0]==='fan'?{x:o[1]-o[3],y:o[2]-o[3]/2,w:o[3]*2,h:ROOM}:{x:o[1],y:o[2],w:o[3],h:o[4]};
        for(i=0;i<pp.length&&ok;i+=2)if(rectNear(R0,pp[i][0],pp[i][1],26))ok=false;
        if(R0.x<120)ok=false;
        if(tg.k==='basket'&&R0.x<tg.x+60&&R0.x+R0.w>tg.x-60&&R0.y<120)ok=false;
        if(tg.k==='ring'&&rectNear(R0,tg.x,tg.y,tg.r+24))ok=false;
        if(tg.k==='window'&&R0.x+R0.w>w-60)ok=false;
        for(i=0;i<L.ob.length&&ok;i++){var q=L.ob[i];if(R0.x<q[1]+q[3]+20&&R0.x+R0.w>q[1]-20)ok=false}
        for(i=0;i<L.fan.length&&ok;i++){if(Math.abs(R0.x+R0.w/2-L.fan[i][0])<R0.w/2+L.fan[i][2]+20)ok=false}
        if(ok){if(o[0]==='fan')L.fan.push([o[1],o[2],o[3]]);else L.ob.push(o)}}
      var Lp=prep(JSON.parse(JSON.stringify(L)));
      if(runThrow(Lp,f,a,p).st!=='win')continue;
      if(robustCount(Lp,f,a,p)<10)continue;
      L.sol={f:f,a:a,p:p};return prep(L)}
    var F={w:360,tg:{k:'basket',x:270},gen:n,sol:{f:DEF,a:10,p:0.4}};return prep(F)}
  function getLevel(n){if(n<LEVELS.length){var b=JSON.parse(JSON.stringify(LEVELS[n]));b.n=n;return prep(b)}var g=genLevel(n);g.n=n;return g}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={LEVELS:LEVELS,prep:prep,stats:stats,launch:launch,tick:tick,runThrow:runThrow,ghost:ghost,loops:loops,puff:puff,
      DEF:DEF,AMIN:AMIN,AMAX:AMAX,ROOM:ROOM,LX:LX,LY:LY,rng:rng,genLevel:genLevel,getLevel:getLevel,robustCount:robustCount};
  if(typeof SG==='undefined')return;

  /* ====================== 게임 ====================== */
  var TX={
    rows:{ko:['코','날개','날개 끝','클립'],en:['Nose','Wings','Tips','Clip']},
    opt:[{ko:['뾰족','뭉툭','접어 넘김'],en:['Pointed','Blunt','Folded']},{ko:['좁게','보통','넓게'],en:['Narrow','Normal','Wide']},
         {ko:['평평','위로','아래로'],en:['Flat','Up','Down']},{ko:['없음','클립'],en:['None','Clip']}],
    st:{ko:['양력','항력','안정성','코 무게'],en:['Lift','Drag','Stability','Nose wt']},
    go:{ko:'날리러 가기',en:'Go throw'},fold:{ko:'접기',en:'Fold'},stage:{ko:'스테이지 ',en:'Stage '},
    kbFold:{ko:'↑↓ 줄 · ←→ 선택 · F 확인',en:'↑↓ row · ←→ pick · F confirm'},
    kbAim:{ko:'↑↓ 각도 · ←→ 힘 · 스페이스 던지기 · F 접기',en:'↑↓ angle · ←→ power · Space throw · F fold'},
    puffHint:{ko:'날 때 탭: 선풍기 바람',en:'Tap in flight: fan puff'},
    why:{stall:{ko:'실속! 코가 너무 가벼워요',en:'Stalled! The nose is too light'},
         stallT:{ko:'실속! 더 낮게, 살살 던져요',en:'Stalled! Throw flatter and softer'},
         dive:{ko:'곤두박질! 코가 너무 무거워요',en:'Nosedive! Nose too heavy'},
         loop:{ko:'빙글! 살살 던지거나 코를 무겁게',en:'Looped! Softer, or a heavier nose'},
         ceil:{ko:'천장에 쿵! 덜 세게 던져요',en:'Bonk! Ceiling — throw softer'},
         short:{ko:'모자라요 — 넓은 날개가 멀리 가요',en:'Too short — wide wings glide farther'},
         low:{ko:'너무 낮아요 — 코를 무겁게!',en:'Too low — try a heavier nose'},
         high:{ko:'너무 높아요 — 조금 낮게 던져요',en:'Too high — aim a little lower'},
         lng:{ko:'지나쳤어요 — 살살 던져요',en:'Overshot — throw softer'},
         obs:{ko:'쿵! 돌아서 날려 봐요',en:'Bump! Find a way around'},
         bear:{ko:'곰 선생님이 깼어요! −3초',en:'Teacher Bear woke up! −3s'},
         time:{ko:'너무 오래 떠 있었어요',en:'Floated too long'}},
    tryF:{ko:'힌트: ',en:'Hint: '},
    clear:{ko:['좋아요!','명중!','완벽해요!'],en:['Nice!','Bullseye!','Perfect!']}
  };
  var lvN,L,fold,mode,modeT,time,warned,tries,cam,camT,ang,pow,drag,prevDown,kb,fl,trail,res,cheer,sad,blink,tG=0,lastGain,
      foldRow,foldAnim,ghostPts,ghostKey,clouds,motes,bearWake,tgWob,flash,puffFx,initAt=0,introT,hintShown,total=0,starsShown;
  var keys={u:0,d:0,l:0,r:0,sp:0,spAt:0,f:0,fAt:0,used:{}};
  if(!window.__paperPlaneKeys){window.__paperPlaneKeys=true;
    var kf=function(e,v){var c=e.code,now=performance.now();
      if(c==='ArrowUp'||c==='KeyW')keys.u=v;else if(c==='ArrowDown'||c==='KeyS')keys.d=v;
      else if(c==='ArrowLeft'||c==='KeyA')keys.l=v;else if(c==='ArrowRight'||c==='KeyD')keys.r=v;
      else if(c==='Space'){keys.sp=v;if(v&&!e.repeat)keys.spAt=now}
      else if(c==='KeyF'||c==='Enter'||c==='NumpadEnter'){keys.f=v;if(v&&!e.repeat)keys.fAt=now}
      else return;
      if(v&&!e.repeat){keys.press=keys.press||[];keys.press.push(c==='KeyW'?'ArrowUp':c==='KeyS'?'ArrowDown':c==='KeyA'?'ArrowLeft':c==='KeyD'?'ArrowRight':c==='KeyF'||c==='NumpadEnter'?'Enter':c)}};
    window.addEventListener('keydown',function(e){kf(e,true)});
    window.addEventListener('keyup',function(e){kf(e,false)});
    window.addEventListener('blur',function(){keys.u=keys.d=keys.l=keys.r=keys.sp=keys.f=0})}
  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function T(o,a){return o[a.lang==='ko'?'ko':'en']}
  function tgCenter(){var t=L.tg;if(t.k==='basket')return [t.x,48];if(t.k==='window')return [L.w-4,(t.y0+t.y1)/2];
    if(t.k==='ring')return [t.x,t.y];return [(t.x0+t.x1)/2,t.h]}

  function load(n,a){lvN=n;L=getLevel(n);tries=0;hintShown=false;bearWake=0;tgWob=0;trail=[];fl=null;res=null;
    ang=8;pow=0.45;drag=null;ghostKey='';introT=0;
    if(n===0){fold=DEF.slice();toAim(a)}else{mode='fold';modeT=0;foldRow=0}}
  function toAim(a){mode='aim';modeT=0;fl=null;trail=[];drag=null;
    var tc=tgCenter();cam=Math.max(0,Math.min(L.w-W,tc[0]-W/2));introT=cam>4?1.3:0;if(!introT)cam=0;camT=0}

  var ptr={t:0,x:0,y:0,q:[]};
  function hookPtr(){var cv=document.querySelector('#stage canvas');if(!cv||cv.__pp)return;cv.__pp=1;
    cv.addEventListener('pointerdown',function(e){var r=cv.getBoundingClientRect();ptr.q.push([(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H])})}
  function init(a){hookPtr();ptr.q.length=0;time=55;warned=0;lastGain=0;prevDown=true;kb=false;cheer=0;sad=0;blink=2;flash=0;puffFx=[];total=0;
    initAt=performance.now();keys.press=[];foldAnim=[0,0,0,0];foldRow=0;cam=0;starsShown=null;
    clouds=[];for(var i=0;i<5;i++)clouds.push({x:hash(i+1)*W,y:hash(i+9),s:.5+hash(i+5)*.5,v:5+hash(i+3)*7});
    motes=[];for(i=0;i<18;i++)motes.push({x:hash(i+20)*W,y:hash(i+40)*H,p:hash(i+60)*6.28,v:4+hash(i+80)*8});
    fold=DEF.slice();load(0,a);a.tempo(1)}

  /* ---- 접기 화면 배치 ---- */
  var ROWY=[366,416,466,516],CHX=[112,186,260],CHW=68,BTN={x:40,y:568,w:236,h:46};
  function chipAt(x,y){for(var r=0;r<4;r++){if(y<ROWY[r]-24||y>ROWY[r]+24)continue;var nOpt=r===3?2:3;
      for(var c=0;c<nOpt;c++)if(Math.abs(x-CHX[c])<CHW/2)return [r,c]}return null}
  function setFold(r,c,a){if(fold[r]===c)return;fold[r]=c;foldAnim[r]=1;
    a.beep(900+r*120,.03,'sawtooth');setTimeout(function(){a.beep(520+c*90,.05,'triangle')},40);ghostKey=''}
  function confirmFold(a){a.sfx('tap');a.beep(330,.08,'triangle');toAim(a)}

  function throwIt(a){if(mode!=='aim')return;tries++;fl=launch(L,fold.slice(),ang,pow);mode='fly';modeT=0;trail=[[fl.x,fl.y]];
    a.sfx('jump');a.beep(240+pow*300,.12,'triangle');cheer=0;sad=0;introT=0}
  function doPuff(a){if(fl&&puff(fl)){a.beep(260,.12,'sine');a.beep(390,.16,'sine');puffFx.push({x:fl.x,y:fl.y,t:0});a.burst(fl.x-cam,FY-fl.y+10,'#dff4ff',6)}}

  function classify(s){var tc=tgCenter(),w=s.why;
    if(w==='bear')return 'bear';if(w==='ceil')return 'ceil';if(loops(s)>=1)return 'loop';
    if(s.stall&&(w==='floor'||w==='obs'))return s.a0>6&&s.P.a0>0.12?'stallT':'stall';
    if(s.minTh<-0.9&&!s.stall&&w==='floor'&&s.x<tc[0]-30)return 'dive';
    if(w==='obs')return 'obs';if(w==='time')return 'time';
    var t=L.tg;if(t.k==='window'||t.k==='ring'){var cx=t.k==='ring'?t.x:L.w-6,yc=null,i;
      for(i=1;i<trail.length;i++)if(trail[i-1][0]<cx&&trail[i][0]>=cx){yc=trail[i][1];break}
      if(yc==null&&t.k==='window'&&w==='wall')yc=s.y;
      if(yc!=null){var lo=t.k==='ring'?t.y-t.r:t.y0,hi=t.k==='ring'?t.y+t.r:t.y1;if(yc<lo)return 'low';if(yc>hi)return 'high'}
      else if(s.x<cx-30)return t.k==='window'&&tc[1]>LY+40?'low':'short'}
    if(s.x<tc[0]-36)return 'short';if(s.x>tc[0]+36||w==='wall')return 'lng';return 'obs'}
  function foldName(f,a){var o=[];for(var i=0;i<4;i++){if(i===3&&!f[3])continue;if(i===2&&!f[2])continue;o.push(T(TX.opt[i],a)[f[i]])}return o.join('·')}

  function endFlight(a){var s=fl;
    if(s.st==='win'){var tc=tgCenter(),half=L.tg.k==='ring'?L.tg.r:L.tg.k==='window'?(L.tg.y1-L.tg.y0)/2:L.tg.k==='basket'?24:(L.tg.x1-L.tg.x0)/2,
        d=L.tg.k==='window'?Math.abs(s.y-tc[1]):L.tg.k==='basket'||L.tg.k==='desk'?Math.abs(s.x-tc[0]):Math.hypot(s.x-tc[0],s.y-tc[1]),
        acc=Math.max(0,1-d/half),lp=loops(s),first=tries===1,stars=1+(acc>0.5?1:0)+(first||lp>0?1:0),
        pts=10+Math.round(acc*5)+(first?5:0)+lp*3;
      a.add(pts);total++;time=Math.min(70,time+14);lastGain=1.2;mode='clear';modeT=0;cheer=1.6;tgWob=1;flash=.5;starsShown={n:stars,t:0};
      a.sfx('win');a.beep(1568,.22,'sine');setTimeout(function(){a.beep(2093,.3,'sine')},120);
      var sx=s.x-cam,sy=FY-s.y;['#ffd23f','#ff7a8a','#6fc3ff','#8be28b','#c79bff'].forEach(function(c){a.burst(sx,sy,c,9)});
      a.pop(sx,sy-34,'+'+pts,'#ff8a3d');a.pop(W/2,190,T(TX.clear,a)[stars-1],'#3f6fd8');
      if(lp>0)a.pop(sx,sy-60,(a.lang==='ko'?'공중제비 x':'Loop x')+lp,'#c25bd6');
      a.tempo(1+Math.min(.5,(lvN+1)*.03))}
    else{var why=classify(s);res={why:why,x:s.x,y:s.y,th:s.th};mode='miss';modeT=0;sad=1.3;
      if(why==='bear'){bearWake=2.5;time=Math.max(0.1,time-3);a.pop(s.x-cam,FY-s.y-30,'−3s','#e0533f');a.sfx('hit');a.shake(6)}
      else{a.beep(220,.12,'square');a.beep(150,.2,'triangle');a.shake(3)}
      a.burst(s.x-cam,FY-s.y,'#f7f2e6',8)}}

  function update(dt,inp,a){
    var ko=a.lang==='ko',pq=ptr.q.shift(),fresh=!!pq,i,pr=keys.press||[];keys.press=[];var tx=pq?pq[0]:0,ty=pq?pq[1]:0;if(ptr.q.length>3)ptr.q.length=0;
    var since=function(t){return t>initAt+40};
    tG+=0;blink-=dt;if(blink<-.12)blink=2+Math.random()*2.5;
    if(mode!=='clear'){time-=dt;if(time<=0){time=0;a.over();return}
      if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(880,.05,'square')}}
    if(pr.length)kb=true;if(fresh)kb=false;
    for(i=0;i<4;i++)foldAnim[i]=Math.max(0,foldAnim[i]-dt*3.2);
    cheer=Math.max(0,cheer-dt);sad=Math.max(0,sad-dt);bearWake=Math.max(0,bearWake-dt);tgWob=Math.max(0,tgWob-dt*1.2);flash=Math.max(0,flash-dt);
    if(lastGain>0)lastGain-=dt;
    for(i=puffFx.length-1;i>=0;i--){puffFx[i].t+=dt;if(puffFx[i].t>.6)puffFx.splice(i,1)}
    modeT+=dt;
    if(mode==='fold'){
      for(i=0;i<pr.length;i++){var k=pr[i];
        if(k==='ArrowUp')foldRow=(foldRow+4)%5;else if(k==='ArrowDown')foldRow=(foldRow+1)%5;
        else if((k==='ArrowLeft'||k==='ArrowRight')&&foldRow<4){var nO=foldRow===3?2:3,v=(fold[foldRow]+(k==='ArrowLeft'?nO-1:1))%nO;setFold(foldRow,v,a)}
        else if(k==='Enter'||(k==='Space'&&foldRow===4)){if(modeT>.25){confirmFold(a);break}}
        else if(k==='Space'&&foldRow<4){var nO2=foldRow===3?2:3;setFold(foldRow,(fold[foldRow]+1)%nO2,a)}}
      if(fresh&&mode==='fold'){var ch=chipAt(tx,ty);
        if(ch){foldRow=ch[0];setFold(ch[0],ch[1],a)}
        else if(tx>BTN.x&&tx<BTN.x+BTN.w&&ty>BTN.y-6&&ty<BTN.y+BTN.h+6&&modeT>.25)confirmFold(a)}}
    else if(mode==='aim'){
      if(introT>0){introT-=dt;var tc=tgCenter(),k2=introT>.75?0:1-introT/.75,e=k2*k2*(3-2*k2),c0=Math.max(0,Math.min(L.w-W,tc[0]-W/2));
        cam=c0*(1-e);if(fresh||pr.length){introT=0}if(introT<=0)cam=0}
      else cam+=(0-cam)*Math.min(1,dt*8);
      if(keys.u)ang=Math.min(AMAX,ang+40*dt);if(keys.d)ang=Math.max(AMIN,ang-40*dt);
      if(keys.r)pow=Math.min(1,pow+.55*dt);if(keys.l)pow=Math.max(0,pow-.55*dt);
      for(i=0;i<pr.length;i++){if(pr[i]==='Space'&&since(keys.spAt)&&modeT>.2){throwIt(a);break}if(pr[i]==='Enter'){mode='fold';modeT=0;foldRow=4;a.sfx('tap');break}}
      if(mode==='aim'){
        if(fresh){if(tx<92&&ty>36&&ty<92){mode='fold';modeT=0;foldRow=4;a.sfx('tap')}
          else if(ty>100)drag={x0:tx,y0:ty,x:tx,y:ty}}
        if(drag){if(inp.down&&inp.x!=null){drag.x=inp.x;drag.y=inp.y;var dx=drag.x0-drag.x,dy=drag.y0-drag.y,len=Math.hypot(dx,dy);
            if(len>8){var an=Math.atan2(-dy,dx)*180/Math.PI;if(dx<0)an=dy<0?AMAX:AMIN;ang=Math.max(AMIN,Math.min(AMAX,an));pow=Math.min(1,Math.max(0,(len-14)/120))}}
          else{var dl=Math.hypot(drag.x0-drag.x,drag.y0-drag.y);drag=null;if(dl>20)throwIt(a)}}}
      var gk=fold.join('')+'|'+ang.toFixed(1)+'|'+pow.toFixed(3);if(gk!==ghostKey){ghostKey=gk;ghostPts=ghost(L,fold,ang,pow)}}
    else if(mode==='fly'){
      advance(fl,dt);
      var lx=trail[trail.length-1];if(Math.hypot(fl.x-lx[0],fl.y-lx[1])>5){trail.push([fl.x,fl.y]);if(trail.length>160)trail.shift()}
      var want=Math.max(0,Math.min(L.w-W,fl.x-150));cam+=(want-cam)*Math.min(1,dt*5);
      if(fresh)doPuff(a);for(i=0;i<pr.length;i++)if(pr[i]==='Space')doPuff(a);
      if(fl.st!=='fly')endFlight(a)}
    else if(mode==='miss'){if(modeT>(res&&res.why==='bear'?1.3:.95)){toAim(a);introT=0;cam=Math.min(cam,L.w-W);
        if(tries>=3&&L.sol)hintShown=true}}
    else if(mode==='clear'){if(starsShown)starsShown.t+=dt;if(modeT>1.6){starsShown=null;load(lvN+1,a)}}
    prevDown=inp.down}


  /* ====================== 그리기 ====================== */
  var FONT=function(n){return n+'px Jua, system-ui, sans-serif'};
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function cloud(g,x,y,s){g.beginPath();g.ellipse(x,y,26*s,10*s,0,0,7);g.ellipse(x-11*s,y-6*s,12*s,9*s,0,0,7);g.ellipse(x+10*s,y-7*s,14*s,11*s,0,0,7);g.fill()}

  function drawRoom(g,a,dt){var t=tG,i,px;
    var gr=g.createLinearGradient(0,90,0,FY);gr.addColorStop(0,'#fff1cf');gr.addColorStop(1,'#ffd9a8');g.fillStyle=gr;g.fillRect(0,0,W,H);
    /* 뒷벽 창문(시차 0.45) — 구름이 흐르고 햇살이 들어온다 */
    var pc=cam*0.45;
    for(i=-1;i<5;i++){px=i*250-(pc%250);var wx=px+30,wy=150,ww=120,wh=170;
      g.save();rr(g,wx,wy,ww,wh,6);g.clip();var sk=g.createLinearGradient(0,wy,0,wy+wh);sk.addColorStop(0,'#7cc4f4');sk.addColorStop(1,'#d6efff');g.fillStyle=sk;g.fillRect(wx,wy,ww,wh);
      g.fillStyle='rgba(255,255,255,.92)';for(var c=0;c<clouds.length;c++){var cl0=clouds[c],cx=((cl0.x+t*cl0.v+i*97)%(ww+80))-40;cloud(g,wx+cx,wy+30+cl0.y*110,cl0.s)}
      g.fillStyle='#8fd18a';g.beginPath();g.ellipse(wx+30,wy+wh+6,50,26,0,0,7);g.ellipse(wx+100,wy+wh+10,46,30,0,0,7);g.fill();g.restore();
      g.strokeStyle='#e9e1d2';g.lineWidth=7;rr(g,wx,wy,ww,wh,6);g.stroke();g.strokeStyle='#c9b79c';g.lineWidth=1.5;rr(g,wx-3.5,wy-3.5,ww+7,wh+7,8);g.stroke();
      g.strokeStyle='#e9e1d2';g.lineWidth=5;g.beginPath();g.moveTo(wx+ww/2,wy);g.lineTo(wx+ww/2,wy+wh);g.moveTo(wx,wy+wh/2);g.lineTo(wx+ww,wy+wh/2);g.stroke();
      g.fillStyle='#d8c8ac';g.fillRect(wx-8,wy+wh,ww+16,7);
      /* 햇살 */
      g.fillStyle='rgba(255,247,200,'+(0.16+0.04*Math.sin(t*.8+i))+')';g.beginPath();g.moveTo(wx,wy);g.lineTo(wx+ww,wy);g.lineTo(wx+ww+150,FY);g.lineTo(wx+90,FY);g.closePath();g.fill();
      /* 칠판 */
      var bx=px+168,by=170;g.fillStyle='#8a6a48';rr(g,bx-5,by-5,74,104,4);g.fill();g.fillStyle='#2f5d4c';g.fillRect(bx,by,64,94);
      g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1.6;g.lineCap='round';g.beginPath();
      var dd=(i+5)%3;if(dd===0){g.arc(bx+32,by+40,13,0,7);g.moveTo(bx+22,by+30);g.lineTo(bx+20,by+21);g.lineTo(bx+28,by+28);g.moveTo(bx+42,by+30);g.lineTo(bx+44,by+21);g.lineTo(bx+36,by+28);
        g.moveTo(bx+27,by+44);g.quadraticCurveTo(bx+32,by+48,bx+37,by+44)}
      else if(dd===1){g.moveTo(bx+10,by+60);g.lineTo(bx+52,by+38);g.lineTo(bx+24,by+50);g.lineTo(bx+10,by+60);g.moveTo(bx+24,by+50);g.lineTo(bx+28,by+60);
        g.moveTo(bx+8,by+80);g.bezierCurveTo(bx+20,by+70,bx+34,by+90,bx+56,by+72)}
      else{g.moveTo(bx+12,by+26);g.lineTo(bx+22,by+26);g.moveTo(bx+17,by+21);g.lineTo(bx+17,by+31);g.moveTo(bx+30,by+26);g.lineTo(bx+40,by+26);g.moveTo(bx+30,by+30);g.lineTo(bx+40,by+30);
        g.arc(bx+50,by+28,4,0,7);g.moveTo(bx+12,by+60);g.lineTo(bx+50,by+60);g.moveTo(bx+12,by+70);g.lineTo(bx+40,by+70)}
      g.stroke();g.fillStyle='#f4f0e6';g.fillRect(bx+40,by+92,12,3);
      /* 창틀 화분 */
      g.fillStyle='#d9784f';g.beginPath();g.moveTo(wx+12,wy+wh-12);g.lineTo(wx+28,wy+wh-12);g.lineTo(wx+25,wy+wh);g.lineTo(wx+15,wy+wh);g.fill();
      g.fillStyle='#5fae5a';g.beginPath();g.ellipse(wx+16,wy+wh-18,5,9,-.4,0,7);g.ellipse(wx+24,wy+wh-19,5,9,.4,0,7);g.fill();
      /* 아래쪽: 게시판·포스터·시계(번갈아) */
      var kx=px+40,ky=372,kind=(i+6)%3;
      if(kind===0){g.fillStyle='#c79a63';rr(g,kx,ky,104,68,5);g.fill();g.fillStyle='#d9b27c';g.fillRect(kx+5,ky+5,94,58);
        var pcol=['#fff6a8','#bfe3ff','#ffc9d6','#c9f2c4'];for(var q=0;q<4;q++){g.save();g.translate(kx+18+q*23,ky+22+(q%2)*16);g.rotate((hash(q+i*3)-.5)*.3);g.fillStyle=pcol[q];g.fillRect(-9,-9,18,18);g.fillStyle='#e0533f';g.beginPath();g.arc(0,-7,2,0,7);g.fill();g.restore()}}
      else if(kind===1){g.save();g.translate(kx+52,ky+30);g.rotate(-.04);g.fillStyle='#fff';g.fillRect(-36,-30,72,60);g.fillStyle='#ffb35c';g.beginPath();g.arc(-12,-6,11,0,7);g.fill();
        g.fillStyle='#6cbf7a';g.beginPath();g.moveTo(-36,30);g.lineTo(-6,4);g.lineTo(14,18);g.lineTo(36,0);g.lineTo(36,30);g.fill();g.strokeStyle='#8fa6c9';g.lineWidth=1.5;g.beginPath();g.moveTo(4,-16);g.lineTo(26,-24);g.lineTo(18,-14);g.closePath();g.stroke();g.restore()}
      else{g.fillStyle='#fff';g.beginPath();g.arc(kx+52,ky+22,20,0,7);g.fill();g.strokeStyle='#7a5532';g.lineWidth=3;g.stroke();
        g.lineWidth=2;g.beginPath();g.moveTo(kx+52,ky+22);g.lineTo(kx+52+Math.cos(t*.2)*12,ky+22+Math.sin(t*.2)*12);g.moveTo(kx+52,ky+22);g.lineTo(kx+52,ky+9);g.stroke()}
      /* 종이 깃발 줄 */
      g.strokeStyle='rgba(140,100,60,.5)';g.lineWidth=1;g.beginPath();g.moveTo(px,116);g.quadraticCurveTo(px+125,140,px+250,116);g.stroke();
      for(var fq=1;fq<9;fq++){var fx=px+fq*27.7,fy=116+Math.sin(fq/9*Math.PI)*12;g.fillStyle=['#ff8f8f','#ffd36b','#8fd0ff','#9fe0a0'][fq%4];g.beginPath();g.moveTo(fx-7,fy);g.lineTo(fx+7,fy);g.lineTo(fx,fy+12+Math.sin(t*2+fq)*1.5);g.fill()}}
    /* 몰딩·벽판 (세계 고정) */
    g.fillStyle='#e6b98a';g.fillRect(0,FY-64,W,64);g.fillStyle='#d9a674';g.fillRect(0,FY-66,W,5);
    g.strokeStyle='rgba(150,95,50,.25)';g.lineWidth=2;for(i=-1;i<9;i++){px=i*60-(cam%60);g.strokeRect(px+8,FY-54,44,44)}
    /* 바닥 */
    var fg=g.createLinearGradient(0,FY,0,H);fg.addColorStop(0,'#c98b55');fg.addColorStop(1,'#a8693b');g.fillStyle=fg;g.fillRect(0,FY,W,H-FY);
    g.strokeStyle='rgba(90,50,20,.35)';g.lineWidth=1.5;for(i=0;i<4;i++){g.beginPath();g.moveTo(0,FY+12+i*13);g.lineTo(W,FY+12+i*13);g.stroke()}
    for(i=-1;i<12;i++){px=i*70-(cam%70);g.beginPath();g.moveTo(px+((i%2)*35),FY);g.lineTo(px+((i%2)*35),FY+12);g.stroke()}
    g.fillStyle='rgba(60,30,10,.18)';g.fillRect(0,FY,W,4);
    /* 방 끝 벽 */
    var ex=L.w-cam;if(ex<W+20){g.fillStyle='#e8c79c';g.fillRect(ex,90,W-ex+30,FY-90+60);g.fillStyle='rgba(120,80,40,.25)';g.fillRect(ex,90,6,FY-90)}
    /* 먼지 */
    for(i=0;i<motes.length;i++){var m=motes[i],my=((m.y-t*m.v)%H+H)%H,mx=((m.x+Math.sin(t*.6+m.p)*16-cam*0.3)%W+W)%W;
      if(my<100||my>FY)continue;g.fillStyle='rgba(255,250,220,'+(.4+.3*Math.sin(t*1.4+m.p))+')';g.beginPath();g.arc(mx,my,1.5,0,7);g.fill()}}

  function shadowAt(g,x,w){g.fillStyle='rgba(70,40,20,.22)';g.beginPath();g.ellipse(x,FY+3,w,4,0,0,7);g.fill()}
  function drawObs(g,o,a){var x=o.x-cam,y=FY-o.y-o.h,w=o.w,h=o.h,i;if(x>W+10||x+w<-10)return;
    if(o.k==='shelf'){shadowAt(g,x+w/2,w*.6);g.fillStyle='#9a6537';g.fillRect(x,y,w,h);g.fillStyle='#b77c48';g.fillRect(x+4,y+4,w-8,h-8);
      var nS=Math.max(1,Math.floor((h-8)/44));for(i=0;i<nS;i++){var sy0=y+4+i*((h-8)/nS),sh=(h-8)/nS;g.fillStyle='#8a5730';g.fillRect(x+4,sy0+sh-4,w-8,4);
        for(var b=0;b*9<w-12;b++){var bh=sh*(0.55+hash(b+i*7+o.x)*.35);g.fillStyle=['#e36c5d','#5b8fd9','#f2c14e','#6cbf7a','#b07cd8'][(b+i)%5];g.fillRect(x+6+b*9,sy0+sh-4-bh,7,bh)}}
      g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x,y,w,4)}
    else if(o.k==='cab'){g.fillStyle='#8e5d36';g.fillRect(x,y,w,h);g.fillStyle='#b5804f';g.fillRect(x+3,y,w-6,h-4);
      var nd=Math.max(1,Math.round(w/60));for(i=0;i<nd;i++){var dx=x+5+i*(w-10)/nd;g.strokeStyle='#8e5d36';g.lineWidth=2;g.strokeRect(dx+2,y+6,(w-10)/nd-4,h-16);
        g.fillStyle='#f2d18a';g.beginPath();g.arc(dx+(w-10)/nd-9,y+h-26,2.4,0,7);g.fill()}
      g.fillStyle='rgba(60,30,10,.25)';g.fillRect(x,y+h-4,w,4)}
    else if(o.k==='lamp'){var cx=x+w/2;g.strokeStyle='#555';g.lineWidth=2;g.beginPath();g.moveTo(cx,y);g.lineTo(cx,y+h-38);g.stroke();
      var ly=y+h-38;g.fillStyle='#ff9f6b';g.beginPath();g.moveTo(cx-8,ly);g.lineTo(cx+8,ly);g.lineTo(x+w,ly+34);g.lineTo(x,ly+34);g.closePath();g.fill();
      g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.moveTo(cx-6,ly+2);g.lineTo(cx-1,ly+2);g.lineTo(x+w*.3,ly+33);g.lineTo(x+4,ly+33);g.closePath();g.fill();
      g.fillStyle='rgba(255,240,170,.25)';g.beginPath();g.moveTo(x+4,ly+34);g.lineTo(x+w-4,ly+34);g.lineTo(x+w+24,ly+120);g.lineTo(x-24,ly+120);g.closePath();g.fill();
      g.fillStyle='#fff6c8';g.beginPath();g.ellipse(cx,ly+35,w/2-4,3,0,0,7);g.fill()}
    else if(o.k==='bear'){drawBear(g,x,y,w,h)}
    else if(o.k==='basketBody'||o.k==='deskBody'){}
  }
  function drawBear(g,x,y,w,h){var awake=bearWake>0,cx=x+w/2,t=tG;shadowAt(g,cx,w*.6);
    /* 책상 */
    g.fillStyle='#a0693d';g.fillRect(x-6,y+40,w+12,8);g.fillRect(x,y+48,6,h-48);g.fillRect(x+w-6,y+48,6,h-48);
    /* 곰 */
    var by=y+26+(awake?-10:Math.sin(t*1.6)*1.5);g.fillStyle='#9b6b45';g.beginPath();g.ellipse(cx,by+6,30,22,0,0,7);g.fill();
    g.beginPath();g.arc(cx-17,by-14,8,0,7);g.arc(cx+17,by-14,8,0,7);g.fill();g.fillStyle='#e0b48a';g.beginPath();g.arc(cx-17,by-14,4,0,7);g.arc(cx+17,by-14,4,0,7);g.fill();
    g.fillStyle='#9b6b45';g.beginPath();g.arc(cx,by-2,20,0,7);g.fill();g.fillStyle='#e9c7a0';g.beginPath();g.ellipse(cx,by+5,9,7,0,0,7);g.fill();
    g.fillStyle='#3a2416';g.beginPath();g.ellipse(cx,by+1,3.4,2.4,0,0,7);g.fill();g.strokeStyle='#3a2416';g.lineWidth=1.8;
    if(awake){g.fillStyle='#fff';g.beginPath();g.arc(cx-8,by-6,4,0,7);g.arc(cx+8,by-6,4,0,7);g.fill();g.fillStyle='#3a2416';g.beginPath();g.arc(cx-8,by-6,1.8,0,7);g.arc(cx+8,by-6,1.8,0,7);g.fill();
      g.beginPath();g.arc(cx,by+11,3,0,7);g.fill();g.fillStyle='#e0533f';g.font=FONT(22);g.textAlign='center';g.fillText('!',cx+26,by-20)}
    else{g.beginPath();g.arc(cx-8,by-5,3,.2,2.9);g.stroke();g.beginPath();g.arc(cx+8,by-5,3,.2,2.9);g.stroke();
      g.fillStyle='rgba(80,90,150,.8)';for(var i=0;i<3;i++){var zp=(t*.45+i/3)%1;g.globalAlpha=1-zp;g.font=FONT(10+zp*8);g.fillText('z',cx+22+zp*14,by-16-zp*24)}g.globalAlpha=1}
    /* 팔·안경 */
    g.fillStyle='#8a5c3a';g.beginPath();g.ellipse(cx-22,by+16,10,6,0,0,7);g.ellipse(cx+22,by+16,10,6,0,0,7);g.fill();
    g.fillStyle='#f6f1e4';g.fillRect(cx-12,y+34,24,6)}

  function drawFan(g,f){var x=f[0]-cam,y=FY-f[1],r=f[2],t=tG,i;if(x<-r-10||x>W+r+10)return;
    g.strokeStyle='#6b5b4b';g.lineWidth=4;g.beginPath();g.moveTo(x,FY-ROOM);g.lineTo(x,y-6);g.stroke();
    g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.ellipse(x,y+2,r+4,r/2.2,0,0,7);g.fill();
    /* 날개 3장: 옆에서 보면 길이가 바뀌며 돈다 */
    var bl=[];for(i=0;i<3;i++){var ph=t*8+i*2.094;bl.push([Math.sin(ph),Math.cos(ph)])}bl.sort(function(p,q){return p[0]-q[0]});
    for(i=0;i<3;i++){var c=bl[i][1],dep=bl[i][0],ex=x+c*r;g.fillStyle=dep>0?'#a7744a':'#8a5c36';g.strokeStyle='#5e3d22';g.lineWidth=1.2;
      g.beginPath();g.moveTo(x,y-2);g.quadraticCurveTo((x+ex)/2,y-5-dep*2,ex,y-1+dep*3);g.lineTo(ex,y+4+dep*3);g.quadraticCurveTo((x+ex)/2,y+3,x,y+3);g.closePath();g.fill();g.stroke()}
    g.fillStyle='#7a6a5a';g.beginPath();g.ellipse(x,y-4,11,7,0,0,7);g.fill();g.fillStyle='#d9c7a8';g.beginPath();g.ellipse(x,y+3,6,3.5,0,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(x-3,y-6,4,2,0,0,7);g.fill()}

  function drawTarget(g,a){var t=L.tg,wob=Math.sin(tG*30)*tgWob*6,pul=1+Math.sin(tG*4)*.06,x,y;
    if(t.k==='basket'){x=t.x-cam;y=FY;shadowAt(g,x,30);g.save();g.translate(x,y);g.rotate(wob*.02);
      g.fillStyle='#4f9bd9';g.beginPath();g.moveTo(-28,-54);g.lineTo(28,-54);g.lineTo(22,0);g.lineTo(-22,0);g.closePath();g.fill();
      g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1.5;for(var i=-3;i<=3;i++){g.beginPath();g.moveTo(i*8,-52);g.lineTo(i*6.4,-2);g.stroke()}
      g.fillStyle='#2f6ea6';g.beginPath();g.ellipse(0,-54,29,7,0,0,7);g.fill();g.fillStyle='#1d4a72';g.beginPath();g.ellipse(0,-54,24,4.5,0,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.25)';g.fillRect(-20,-46,6,40);g.restore();
      if(mode!=='clear'){g.strokeStyle='rgba(255,214,80,'+(.5+.3*Math.sin(tG*4))+')';g.lineWidth=3;g.setLineDash([6,5]);g.beginPath();g.ellipse(x,y-58,30*pul,9*pul,0,0,7);g.stroke();g.setLineDash([])}}
    else if(t.k==='window'){x=L.w-cam;var y0=FY-t.y1,hh=t.y1-t.y0;if(x>W+30)return;
      var sk=g.createLinearGradient(0,y0,0,y0+hh);sk.addColorStop(0,'#5fb6f0');sk.addColorStop(1,'#c9ecff');g.fillStyle=sk;g.fillRect(x-4,y0,40,hh);
      g.fillStyle='#fff';cloud(g,x+14+Math.sin(tG*.5)*6,y0+hh*.4,.6);
      g.fillStyle='#f0e6d6';g.fillRect(x-10,y0-8,14,8);g.fillRect(x-10,y0+hh,14,8);
      /* 커튼 */
      var fl0=Math.sin(tG*2)*3+wob;g.fillStyle='#ff8f8f';g.beginPath();g.moveTo(x-6,y0-8);g.quadraticCurveTo(x-20+fl0,y0+hh*.4,x-12+fl0,y0+hh*.9);g.lineTo(x-4,y0+hh*.9);g.lineTo(x-4,y0-8);g.fill();
      if(mode!=='clear'){g.strokeStyle='rgba(255,214,80,'+(.5+.3*Math.sin(tG*4))+')';g.lineWidth=3;g.setLineDash([6,5]);g.strokeRect(x-8,y0+2,10,hh-4);g.setLineDash([])}}
    else if(t.k==='ring'){x=t.x-cam;y=FY-t.y;var R=t.r*pul;g.save();g.translate(x,y);g.rotate(wob*.05);
      g.strokeStyle='rgba(140,110,80,.6)';g.lineWidth=1.2;g.beginPath();g.moveTo(-R*.6,-R*.8);g.lineTo(-R*.3,-(ROOM-t.y));g.moveTo(R*.6,-R*.8);g.lineTo(R*.3,-(ROOM-t.y));g.stroke();
      var cols=['#ff7a8a','#ffd23f','#6fc3ff','#8be28b','#c79bff'];for(var j=0;j<16;j++){var an=j/16*6.283+tG*.3;
        g.save();g.translate(Math.cos(an)*R,Math.sin(an)*R);g.rotate(an+(j%2?1.57:0));g.strokeStyle=cols[j%5];g.lineWidth=3.2;g.beginPath();g.ellipse(0,0,6.5,3.6,0,0,7);g.stroke();g.restore()}
      g.restore();if(mode!=='clear'){g.fillStyle='rgba(255,230,120,.16)';g.beginPath();g.arc(x,y,t.r-4,0,7);g.fill()}}
    else if(t.k==='desk'){x=t.x0-cam;var dw=t.x1-t.x0,top=FY-t.h;shadowAt(g,x+dw/2,dw*.55);
      g.fillStyle='#8f5b33';g.fillRect(x+6,top+8,7,t.h-8);g.fillRect(x+dw-13,top+8,7,t.h-8);g.fillStyle='#a76d40';g.fillRect(x+10,top+10,dw-20,26);
      g.fillStyle='#c98d55';g.fillRect(x,top,dw,10);g.fillStyle='rgba(255,255,255,.2)';g.fillRect(x,top,dw,3);
      /* 친구의 책과 필통 */
      g.fillStyle='#5b8fd9';g.fillRect(x+dw-36,top-8,24,8);g.fillStyle='#ffd23f';g.fillRect(x+dw-32,top-14,18,6);
      if(mode!=='clear'){g.strokeStyle='rgba(255,214,80,'+(.5+.3*Math.sin(tG*4))+')';g.lineWidth=3;g.setLineDash([6,5]);g.strokeRect(x+6,top-16,dw-48,14);g.setLineDash([])}}}

  /* 옆에서 본 종이비행기 — 날개 넓이·코·날개 끝·클립이 모양에 그대로 보인다 */
  function drawPlaneSide(g,x,y,th,f,sc,al){g.save();g.globalAlpha=al==null?1:al;g.translate(x,y);g.rotate(-th);g.scale(sc,sc);
    var inv=Math.cos(th)<0;if(inv)g.scale(1,-1);
    var ws=[5,8,12][f[1]],nx=f[0]===1?15:18,lit=0.5+0.5*Math.sin(th+0.6);
    g.fillStyle='rgba(0,0,0,.08)';g.beginPath();g.moveTo(nx,2);g.lineTo(-17,8);g.lineTo(-17,2);g.fill();
    /* 용골 */
    g.fillStyle='hsl(40,22%,'+(70+lit*8)+'%)';g.beginPath();g.moveTo(nx,0);g.lineTo(-16,0);g.lineTo(-15,6);g.closePath();g.fill();
    /* 날개 윗면 */
    g.fillStyle='hsl(45,40%,'+(90+lit*8)+'%)';g.beginPath();g.moveTo(nx,0);if(f[0]===1)g.lineTo(nx,-2);g.lineTo(-18,-ws);g.lineTo(-14,0);g.closePath();g.fill();
    g.strokeStyle='#5f523f';g.lineWidth=1.3/sc;g.lineJoin='round';g.stroke();
    /* 접은 코 */
    if(f[0]===2){g.fillStyle='hsl(42,30%,'+(80+lit*8)+'%)';g.beginPath();g.moveTo(nx,0);g.lineTo(nx-11,-ws*.38);g.lineTo(nx-9,0);g.closePath();g.fill();g.stroke()}
    /* 주름 */
    g.strokeStyle='rgba(120,100,70,.7)';g.beginPath();g.moveTo(nx,0);g.lineTo(-16,-ws*.35);g.stroke();
    /* 날개 끝 */
    if(f[2]){var up=f[2]===1;g.fillStyle=up?'#ffcf7a':'#9ccff0';g.beginPath();g.moveTo(-18,-ws);g.lineTo(-12,-ws*.8);g.lineTo(-14,-ws+(up?-6:6));g.lineTo(-19,-ws+(up?-5:5));g.closePath();g.fill();g.stroke()}
    if(f[3]){g.strokeStyle='#8c96a8';g.lineWidth=1.8/sc*1.6;g.beginPath();g.moveTo(nx-2,1);g.lineTo(nx-9,1);g.arc(nx-9,2.6,1.6,4.7,1.57,true);g.lineTo(nx-3,4.2);g.stroke()}
    g.restore()}

  /* 위에서 본 큰 종이비행기(접기 화면) */
  function drawPlaneTop(g,cx,cy,f,sc,mini){var Lh=78,span=[24,42,64][f[1]],t=tG,an=mini?[0,0,0,0]:foldAnim;
    g.save();g.translate(cx,cy);g.scale(sc,sc);
    var nose=Lh,tail=-Lh,flapY=function(k){return 1-an[k]*2*Math.max(0,1-an[k])};
    /* 그림자 */
    g.fillStyle='rgba(60,40,20,.18)';g.beginPath();g.moveTo(nose+6,8);g.lineTo(tail+6,span+8);g.lineTo(tail+6,-span+8);g.closePath();g.fill();
    g.save();g.scale(1,0.85+0.15*flapY(1));
    /* 날개 */
    var nw=f[0]===1?7:0;
    [-1,1].forEach(function(sd){g.fillStyle=sd<0?'#fffdf5':'#f4ecdc';g.beginPath();g.moveTo(nose,sd*nw);g.lineTo(tail,sd*span);g.lineTo(tail+10,sd*4);g.lineTo(tail+4,0);g.lineTo(nose-(f[0]===1?2:0),0);g.closePath();g.fill();
      g.strokeStyle='#a39072';g.lineWidth=1.4;g.stroke();
      g.strokeStyle='rgba(150,130,100,.55)';g.lineWidth=1;g.beginPath();g.moveTo(nose-4,sd*nw*.7);g.lineTo(tail+2,sd*span*.45);g.stroke();
      /* 날개 끝 */
      if(f[2]){var k=flapY(2),up=f[2]===1;g.fillStyle=up?'#ffcf7a':'#9ccff0';g.beginPath();g.moveTo(tail,sd*span);g.lineTo(tail+22,sd*span*.72);g.lineTo(tail+22,sd*(span*.72-7*k));g.lineTo(tail,sd*(span-8*k));g.closePath();g.fill();g.stroke();
        g.fillStyle=up?'#c27a12':'#2f7fb5';g.font=FONT(12);g.textAlign='center';g.fillText(up?'↑':'↓',tail+11,sd*(span*.86-4)+4)}});
    g.restore();
    /* 가운데 주름 */
    g.strokeStyle='#8a7a62';g.lineWidth=1.6;g.beginPath();g.moveTo(nose,0);g.lineTo(tail+4,0);g.stroke();
    /* 코 */
    var nk=flapY(0);
    if(f[0]===2){g.fillStyle='#efe2c6';g.beginPath();g.moveTo(nose,0);g.lineTo(nose-36*nk,-12);g.lineTo(nose-30*nk,0);g.lineTo(nose-36*nk,12);g.closePath();g.fill();g.strokeStyle='#a39072';g.lineWidth=1.3;g.stroke()}
    if(f[0]===1){g.fillStyle='#efe2c6';g.fillRect(nose-6*nk,-7,6*nk,14);g.strokeStyle='#a39072';g.strokeRect(nose-6*nk,-7,6*nk,14)}
    /* 클립 */
    if(f[3]){var ck=1-an[3];g.save();g.translate(nose-18,-2-12*(1-ck));g.strokeStyle='#8c96a8';g.lineWidth=2.4;g.lineCap='round';
      g.beginPath();g.moveTo(10,-3);g.lineTo(-10,-3);g.arc(-10,0,3,4.71,1.57,true);g.lineTo(8,3);g.arc(8,1,2,1.57,4.71,true);g.lineTo(-6,-1);g.stroke();g.restore()}
    /* 접는 순간의 하얀 주름 빛 */
    for(var r0=0;r0<4;r0++)if(an[r0]>0){g.strokeStyle='rgba(255,255,255,'+an[r0]+')';g.lineWidth=3;var px=tail+(1-an[r0])*(nose-tail);g.beginPath();g.moveTo(px,-span);g.lineTo(px,span);g.stroke()}
    g.restore()}

  /* 고양이 아이(던지는 친구) */
  function drawKid(g,a){var x=26-cam,base=FY,t=tG;if(x<-80)return;
    var happy=cheer>0,sadF=sad>0&&!happy,bob=happy?-Math.abs(Math.sin(t*10))*8:Math.sin(t*2)*1.2,hx=LX-cam,hy=FY-LY;
    shadowAt(g,x+6,26);g.save();g.translate(0,bob);
    /* 다리·몸 */
    g.fillStyle='#3d4f7a';g.fillRect(x-10,base-60,9,60);g.fillRect(x+5,base-60,9,60);g.fillStyle='#2b2b3a';g.fillRect(x-12,base-6,13,6);g.fillRect(x+4,base-6,13,6);
    g.fillStyle='#5f8de0';rr(g,x-18,base-138,40,84,12);g.fill();g.fillStyle='#fff';g.beginPath();g.moveTo(x-6,base-138);g.lineTo(x+2,base-124);g.lineTo(x+10,base-138);g.fill();
    g.fillStyle='#ff6b6b';g.beginPath();g.moveTo(x+2,base-128);g.lineTo(x-2,base-116);g.lineTo(x+2,base-108);g.lineTo(x+6,base-116);g.fill();
    /* 꼬리 */
    g.strokeStyle='#f0a24a';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(x-16,base-70);g.quadraticCurveTo(x-40,base-80+Math.sin(t*3)*8,x-34,base-110);g.stroke();
    /* 팔 */
    g.strokeStyle='#5f8de0';g.lineWidth=11;var ax=hx,ay=hy;
    if(mode==='aim'&&drag){var p=planeAimPos();ax=p[0];ay=p[1]}
    if(happy){ax=x+30;ay=base-200}
    g.beginPath();g.moveTo(x+14,base-128);g.lineTo(ax,ay+6);g.stroke();g.fillStyle='#f6b562';g.beginPath();g.arc(ax,ay+6,6,0,7);g.fill();
    g.strokeStyle='#5f8de0';g.beginPath();g.moveTo(x-14,base-128);g.lineTo(happy?x-34:x-24,happy?base-196:base-86);g.stroke();
    g.fillStyle='#f6b562';g.beginPath();g.arc(happy?x-34:x-24,happy?base-196:base-86,6,0,7);g.fill();
    /* 머리 */
    var hx0=x+2,hy0=base-166;g.fillStyle='#f6b562';g.beginPath();g.moveTo(hx0-24,hy0-10);g.lineTo(hx0-20,hy0-38+(sadF?10:0));g.lineTo(hx0-6,hy0-22);g.fill();
    g.beginPath();g.moveTo(hx0+24,hy0-10);g.lineTo(hx0+20,hy0-38+(sadF?10:0));g.lineTo(hx0+6,hy0-22);g.fill();
    g.fillStyle='#ffb3b3';g.beginPath();g.moveTo(hx0-20,hy0-16);g.lineTo(hx0-19,hy0-30+(sadF?8:0));g.lineTo(hx0-11,hy0-21);g.fill();g.beginPath();g.moveTo(hx0+20,hy0-16);g.lineTo(hx0+19,hy0-30+(sadF?8:0));g.lineTo(hx0+11,hy0-21);g.fill();
    g.fillStyle='#f6b562';g.beginPath();g.arc(hx0,hy0,25,0,7);g.fill();g.fillStyle='#e38f3a';g.beginPath();g.moveTo(hx0-6,hy0-25);g.lineTo(hx0,hy0-14);g.lineTo(hx0+6,hy0-25);g.fill();
    g.fillStyle='#fff3e0';g.beginPath();g.ellipse(hx0+2,hy0+9,13,9,0,0,7);g.fill();
    /* 눈: 비행기를 따라본다 */
    var lookX=0,lookY=0;if(fl&&mode==='fly'){var dx=fl.x-cam-hx0,dy=FY-fl.y-hy0,d=Math.hypot(dx,dy)||1;lookX=dx/d*2.2;lookY=dy/d*2.2}
    g.fillStyle='#3a2416';g.strokeStyle='#3a2416';g.lineWidth=2.2;
    if(happy){g.beginPath();g.arc(hx0-9,hy0-2,4,3.4,6.0);g.stroke();g.beginPath();g.arc(hx0+11,hy0-2,4,3.4,6.0);g.stroke()}
    else if(blink<0){g.beginPath();g.moveTo(hx0-13,hy0-2);g.lineTo(hx0-5,hy0-2);g.moveTo(hx0+7,hy0-2);g.lineTo(hx0+15,hy0-2);g.stroke()}
    else{g.beginPath();g.ellipse(hx0-9+lookX,hy0-2+lookY,3.4,4.4,0,0,7);g.ellipse(hx0+11+lookX,hy0-2+lookY,3.4,4.4,0,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(hx0-8+lookX,hy0-4+lookY,1.2,0,7);g.arc(hx0+12+lookX,hy0-4+lookY,1.2,0,7);g.fill();
      if(sadF){g.strokeStyle='#3a2416';g.beginPath();g.moveTo(hx0-14,hy0-10);g.lineTo(hx0-5,hy0-7);g.moveTo(hx0+16,hy0-10);g.lineTo(hx0+7,hy0-7);g.stroke()}}
    g.fillStyle='#e0533f';g.beginPath();g.ellipse(hx0+2,hy0+5,3,2.2,0,0,7);g.fill();g.strokeStyle='#3a2416';g.lineWidth=1.6;
    if(happy){g.fillStyle='#c2413b';g.beginPath();g.arc(hx0+2,hy0+10,5,0,3.14);g.fill()}
    else if(sadF){g.beginPath();g.arc(hx0+2,hy0+15,4,3.5,5.9);g.stroke()}
    else{g.beginPath();g.arc(hx0-1,hy0+8,3,.2,2.6);g.arc(hx0+5,hy0+8,3,.5,2.9);g.stroke()}
    g.fillStyle='rgba(255,120,120,.4)';g.beginPath();g.arc(hx0-15,hy0+6,4,0,7);g.arc(hx0+19,hy0+6,4,0,7);g.fill();
    g.strokeStyle='rgba(80,50,30,.5)';g.lineWidth=1;g.beginPath();g.moveTo(hx0-12,hy0+9);g.lineTo(hx0-24,hy0+7);g.moveTo(hx0+16,hy0+9);g.lineTo(hx0+28,hy0+7);g.stroke();
    g.restore()}
  function planeAimPos(){var hx=LX-cam,hy=FY-LY;if(!drag)return [hx,hy];var r=-pow*16,an=ang*Math.PI/180;return [hx+Math.cos(an)*r,hy-Math.sin(an)*r]}

  function drawTop(g,a){var ko=a.lang==='ko';
    /* 천장 띠 */
    var cg=g.createLinearGradient(0,30,0,FY-ROOM);cg.addColorStop(0,'#f7e7c6');cg.addColorStop(1,'#ecd2a6');g.fillStyle=cg;g.fillRect(0,0,W,FY-ROOM);
    g.fillStyle='#d4ae7c';g.fillRect(0,FY-ROOM-6,W,6);g.fillStyle='rgba(120,80,40,.2)';g.fillRect(0,FY-ROOM,W,4);
    g.fillStyle='#bd8a55';g.fillRect(0,0,W,32);
    /* 시간 */
    var low=time<10,tw=Math.ceil(time);g.textAlign='right';g.font=FONT(low?22+Math.sin(tG*12)*2:20);g.fillStyle=lastGain>0?'#3aa655':(low?'#e0533f':'#5a3d22');
    g.fillText('⏱ '+tw,W-12,64);if(lastGain>0){g.font=FONT(13);g.fillText('+14',W-14,82)}
    g.textAlign='center';g.font=FONT(15);g.fillStyle='#5a3d22';g.fillText(T(TX.stage,a)+(lvN+1)+(L.gen!=null?' ✦':''),W/2,58);
    var tip=L.hint?T(L.hint,a):null;if(hintShown&&L.sol&&mode!=='fold')tip=T(TX.tryF,a)+foldName(L.sol.f,a);
    if(tip&&mode==='fold'){g.font=FONT(13);g.fillStyle='#7a5532';g.fillText(tip,W/2,80)}
    else if(tip&&mode==='aim'&&!(res&&modeT<1.6)){g.font=FONT(13);var tw2=g.measureText(tip).width+20;g.fillStyle='rgba(255,250,236,.85)';rr(g,W/2-tw2/2,108,tw2,24,12);g.fill();g.fillStyle='#7a5532';g.fillText(tip,W/2,125)}}

  function drawFoldBtn(g,a){g.fillStyle='#fffaf0';rr(g,10,42,76,40,12);g.fill();g.strokeStyle='#c99a62';g.lineWidth=2;g.stroke();
    drawPlaneSide(g,32,62,0.15,fold,0.65,1);g.fillStyle='#7a5532';g.font=FONT(14);g.textAlign='left';g.fillText(T(TX.fold,a),48,68)}

  function drawThrow(g,a,dt){var ko=a.lang==='ko',i;
    drawRoom(g,a,dt);
    for(i=0;i<L.fans.length;i++)drawFan(g,L.fans[i]);
    for(i=0;i<L.obs.length;i++)drawObs(g,L.obs[i],a);
    drawTarget(g,a);drawKid(g,a);
    /* 궤적 */
    var pl=mode==='aim'?null:fl;if(pl){var hgt=Math.max(0,pl.y),sa=Math.max(0,.28-hgt/1400);g.fillStyle='rgba(70,40,20,'+sa+')';g.beginPath();g.ellipse(pl.x-cam,FY+3,14+hgt/30,3,0,0,7);g.fill()}
    if(trail.length>1){g.lineCap='round';for(i=1;i<trail.length;i++){g.strokeStyle='rgba(80,110,200,'+(0.1+0.55*i/trail.length)+')';g.lineWidth=2;g.beginPath();g.moveTo(trail[i-1][0]-cam,FY-trail[i-1][1]);g.lineTo(trail[i][0]-cam,FY-trail[i][1]);g.stroke()}}
    for(i=0;i<puffFx.length;i++){var pf=puffFx[i],k=pf.t/.6;g.strokeStyle='rgba(150,200,255,'+(1-k)+')';g.lineWidth=2;
      for(var j=0;j<3;j++){var px=pf.x-cam-14+j*14,py=FY-pf.y+26-k*30;g.beginPath();g.moveTo(px,py+12);g.quadraticCurveTo(px+5,py+5,px,py-4);g.stroke()}}
    if(mode==='aim'){
      var p=planeAimPos();
      if(ghostPts&&introT<=0){for(i=0;i<ghostPts.length;i++){g.fillStyle='rgba(70,90,170,'+(0.75*(1-i/ghostPts.length))+')';g.beginPath();g.arc(ghostPts[i][0]-cam,FY-ghostPts[i][1],2.6,0,7);g.fill()}}
      if(drag){g.strokeStyle='rgba(120,80,50,.55)';g.lineWidth=2;g.beginPath();g.moveTo(LX-cam-6,FY-LY-10);g.lineTo(p[0],p[1]);g.lineTo(LX-cam-6,FY-LY+10);g.stroke()}
      drawPlaneSide(g,p[0],p[1],ang*Math.PI/180,fold,1.25,1);
      /* 힘·각도 표시 */
      if(drag||kb){var an=ang*Math.PI/180,bx=LX-cam,by=FY-LY,gx=bx+34,gy=by+44;g.strokeStyle='rgba(255,140,60,.85)';g.lineWidth=3;g.setLineDash([2,6]);g.beginPath();g.moveTo(bx,by);g.lineTo(bx+Math.cos(an)*(30+pow*60),by-Math.sin(an)*(30+pow*60));g.stroke();g.setLineDash([]);
        g.fillStyle='rgba(255,255,255,.85)';rr(g,gx,gy,64,10,5);g.fill();g.fillStyle=pow>.8?'#e0533f':'#ff8a3d';rr(g,gx,gy,Math.max(6,64*pow),10,5);g.fill();
        g.font=FONT(12);g.textAlign='left';g.fillStyle='#5a3d22';g.fillText(Math.round(ang)+'°  '+Math.round(pow*100)+'%',gx,gy+24)}}
    else if(fl&&(mode==='fly'||mode==='clear')){drawPlaneSide(g,fl.x-cam,FY-fl.y,fl.th,fl.f,1.25,1)}
    else if(fl&&mode==='miss'){var k2=Math.min(1,modeT/.3);drawPlaneSide(g,fl.x-cam,FY-fl.y,fl.th*(1-k2)+(fl.why==='floor'?-0.12:fl.th)*k2,fl.f,1.25,1-Math.max(0,modeT-.6)/.35)}
    /* 화면 밖 목표 화살표 */
    var tc=tgCenter(),tsx=tc[0]-cam;if(tsx>W-6&&mode!=='clear'){var ay=Math.max(130,Math.min(FY-30,FY-tc[1]));g.fillStyle='rgba(255,140,60,.9)';g.beginPath();g.moveTo(W-6,ay);g.lineTo(W-22,ay-11);g.lineTo(W-22,ay+11);g.fill();
      g.font=FONT(12);g.textAlign='right';g.fillStyle='#7a5532';g.fillText(Math.round((tc[0]-cam-W)/50+1)+'m',W-24,ay+4)}
    drawTop(g,a);
    if(mode!=='clear')drawFoldBtn(g,a);
    /* 날개 바람 남은 수 */
    if(mode==='fly'){g.textAlign='left';g.font=FONT(13);g.fillStyle='#5a7ab0';var n=fl.puffs;for(i=0;i<PUFFN;i++){g.globalAlpha=i<n?1:.25;g.fillText('🌀',100+i*20,64)}g.globalAlpha=1}
    /* 첫 레벨 안내 + 실패 이유 */
    var msg=null;if(lvN===0&&mode==='aim'&&tries<2&&!drag)msg=ko?'당겼다 놓아서 날려요':'Pull back and release to throw';
    if(mode==='miss'&&res)msg=T(TX.why[res.why],a);
    if(mode==='aim'&&res&&modeT<1.6&&!drag)msg=T(TX.why[res.why],a);
    if(msg){var fs=17;g.font=FONT(fs);while(g.measureText(msg).width>W-50&&fs>12){fs--;g.font=FONT(fs)}var wd=g.measureText(msg).width+26,my=lvN===0&&mode==='aim'&&!res?330:140;g.fillStyle='rgba(255,252,240,.92)';rr(g,W/2-wd/2,my-22,wd,32,14);g.fill();
      g.strokeStyle='rgba(160,110,60,.5)';g.lineWidth=1.5;g.stroke();g.fillStyle='#5a3d22';g.textAlign='center';g.fillText(msg,W/2,my)}
    if(lvN===0&&mode==='aim'&&tries===0&&!drag&&!kb){var ph=(tG*.7)%1,hx=LX-cam-ph*60,hy=FY-LY+ph*46;g.globalAlpha=Math.sin(ph*3.14);
      g.fillStyle='#fff';g.strokeStyle='#5a3d22';g.lineWidth=2;g.beginPath();g.arc(hx,hy,11,0,7);g.fill();g.stroke();g.globalAlpha=1}
    if(lvN===1&&mode==='fly'&&fl.t<2){g.font=FONT(13);g.textAlign='center';g.fillStyle='#5a7ab0';g.fillText(T(TX.puffHint,a),W/2,128)}
    if(kb&&mode==='aim'){g.font=FONT(12);g.textAlign='center';g.fillStyle='rgba(90,61,34,.85)';g.fillText(T(TX.kbAim,a),W/2-20,H-18)}
    /* 별점 */
    if(mode==='clear'&&starsShown){for(i=0;i<3;i++){var sk=Math.max(0,Math.min(1,(starsShown.t-i*.15)*4)),sx=W/2-44+i*44,sy=230,on=i<starsShown.n;
      g.save();g.translate(sx,sy);g.scale(sk*(1+.2*Math.sin(Math.min(1,sk)*3.14)),sk);g.fillStyle=on?'#ffd23f':'rgba(255,255,255,.6)';g.strokeStyle=on?'#c98a12':'#bbb';g.lineWidth=2.5;
      g.beginPath();for(var q=0;q<10;q++){var aa=q*Math.PI/5-Math.PI/2,rq=q%2?8:18;g.lineTo(Math.cos(aa)*rq,Math.sin(aa)*rq)}g.closePath();g.fill();g.stroke();g.restore()}}
    if(flash>0){g.fillStyle='rgba(255,255,230,'+flash*.5+')';g.fillRect(0,0,W,H)}}

  /* ---- 접기 화면 ---- */
  function drawBlueprint(g,a,x0,y0,bw,bh){var s=Math.min((bw-12)/L.w,(bh-12)/ROOM),ox=x0+(bw-L.w*s)/2,oy=y0+bh-6,i;
    g.fillStyle='#2f5d4c';rr(g,x0,y0,bw,bh,8);g.fill();g.strokeStyle='#8a6a48';g.lineWidth=5;rr(g,x0,y0,bw,bh,8);g.stroke();
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1.5;g.strokeRect(ox,oy-ROOM*s,L.w*s,ROOM*s);
    g.fillStyle='rgba(255,255,255,.35)';for(i=0;i<L.obs.length;i++){var o=L.obs[i];if(o.k==='basketBody'||o.k==='deskBody')continue;
      if(o.k==='lamp'){g.fillRect(ox+(o.x+o.w/2)*s-.5,oy-ROOM*s,1.5,(ROOM-o.y)*s);g.fillRect(ox+o.x*s,oy-(o.y+38)*s,o.w*s,38*s)}
      else{g.fillStyle=o.k==='bear'?'rgba(255,200,150,.6)':'rgba(255,255,255,.35)';g.fillRect(ox+o.x*s,oy-(o.y+o.h)*s,o.w*s,o.h*s);g.fillStyle='rgba(255,255,255,.35)'}}
    for(i=0;i<L.fans.length;i++){var fn=L.fans[i];g.beginPath();g.ellipse(ox+fn[0]*s,oy-fn[1]*s,fn[2]*s,fn[2]*s/2.2,0,0,7);g.fill()}
    /* 아이와 목표 */
    g.fillStyle='#ffcf7a';g.beginPath();g.arc(ox+LX*s,oy-LY*s,3,0,7);g.fill();g.fillRect(ox+(LX-8)*s,oy-LY*s,2,LY*s);
    var tc=tgCenter(),p=1+.25*Math.sin(tG*5);g.strokeStyle='#ffd23f';g.lineWidth=2.2;g.beginPath();g.arc(ox+Math.min(tc[0],L.w-4)*s,oy-tc[1]*s,7*p,0,7);g.stroke();
    g.fillStyle='#ffd23f';g.beginPath();g.arc(ox+Math.min(tc[0],L.w-4)*s,oy-tc[1]*s,2.5,0,7);g.fill();
    g.setLineDash([3,4]);g.strokeStyle='rgba(255,210,63,.6)';g.lineWidth=1.2;g.beginPath();g.moveTo(ox+LX*s,oy-LY*s);
    g.quadraticCurveTo(ox+(LX+tc[0])/2*s,oy-Math.max(LY,tc[1])*s-20,ox+Math.min(tc[0],L.w-4)*s,oy-tc[1]*s);g.stroke();g.setLineDash([]);
    g.fillStyle='rgba(255,255,255,.8)';g.font=FONT(12);g.textAlign='left';g.fillText(Math.round(L.w/50)+'m',x0+10,y0+18)}

  function drawFold(g,a){var ko=a.lang==='ko',i,r,c;
    var bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#c58a55');bg.addColorStop(1,'#a8703f');g.fillStyle=bg;g.fillRect(0,0,W,H);
    g.strokeStyle='rgba(80,40,10,.18)';g.lineWidth=2;for(i=0;i<14;i++){g.beginPath();g.moveTo(0,40+i*46+Math.sin(i)*6);g.bezierCurveTo(120,30+i*46,240,56+i*46,W,40+i*46);g.stroke()}
    drawTop(g,a);
    drawBlueprint(g,a,14,96,W-28,108);
    /* 종이 */
    g.save();g.translate(W/2-56,288);g.rotate(-0.04);g.fillStyle='rgba(60,30,10,.25)';g.fillRect(-104,-66,212,140);g.fillStyle='#fffdf6';g.fillRect(-108,-72,212,140);
    g.strokeStyle='rgba(120,160,220,.25)';g.lineWidth=1;for(i=0;i<9;i++){g.beginPath();g.moveTo(-108,-56+i*15);g.lineTo(104,-56+i*15);g.stroke()}
    g.strokeStyle='rgba(230,120,120,.35)';g.beginPath();g.moveTo(-86,-72);g.lineTo(-86,68);g.stroke();g.restore();
    var bounce=1+Math.max.apply(null,foldAnim)*.06;drawPlaneTop(g,W/2-58,288,fold,0.95*bounce);
    /* 특성 막대 */
    var P=stats(fold),vals=[(P.S*(P.a0+0.15))/0.6,(P.cd0*P.S)/0.18,(P.km+P.kq*2+P.pd*2)/4.6,P.nw/1.55];
    for(i=0;i<4;i++){var y=232+i*30,v=Math.max(.05,Math.min(1,vals[i]));g.fillStyle='#fff6e6';g.font=FONT(12);g.textAlign='left';g.fillText(T(TX.st,a)[i],252,y);
      g.fillStyle='rgba(60,30,10,.35)';rr(g,252,y+5,92,9,4.5);g.fill();g.fillStyle=['#7fd18b','#ff9d6b','#6fb8ff','#c79bff'][i];rr(g,252,y+5,92*v,9,4.5);g.fill()}
    /* 선택 줄 */
    for(r=0;r<4;r++){var ry=ROWY[r],sel=kb&&foldRow===r;g.fillStyle=sel?'rgba(255,248,230,.28)':'rgba(255,248,230,.12)';rr(g,10,ry-24,W-20,48,12);g.fill();
      if(sel){g.strokeStyle='#ffe08a';g.lineWidth=2;g.stroke()}
      g.fillStyle='#fff6e6';g.font=FONT(15);g.textAlign='left';g.fillText(T(TX.rows,a)[r],20,ry+5);
      var nO=r===3?2:3;for(c=0;c<nO;c++){var cx=CHX[c],on=fold[r]===c;g.fillStyle=on?'#fffaf0':'rgba(255,250,240,.45)';rr(g,cx-CHW/2,ry-22,CHW,44,10);g.fill();
        if(on){g.strokeStyle='#ff8a3d';g.lineWidth=2.5;g.stroke()}
        g.globalAlpha=on?1:.7;chipIcon(g,r,c,cx,ry-6);g.globalAlpha=1;
        g.fillStyle=on?'#7a3d12':'#6b4a2a';g.font=FONT(11);g.textAlign='center';g.fillText(T(TX.opt[r],a)[c],cx,ry+18)}}
    /* 버튼 */
    var bs=kb&&foldRow===4,pulse=1+Math.sin(tG*5)*.02;g.save();g.translate(BTN.x+BTN.w/2,BTN.y+BTN.h/2);g.scale(pulse,pulse);
    g.fillStyle='#c9541f';rr(g,-BTN.w/2,-BTN.h/2+5,BTN.w,BTN.h,23);g.fill();g.fillStyle='#ff7a3d';rr(g,-BTN.w/2,-BTN.h/2,BTN.w,BTN.h,23);g.fill();
    if(bs){g.strokeStyle='#ffe08a';g.lineWidth=3;g.stroke()}g.fillStyle='#fff';g.font=FONT(19);g.textAlign='center';g.fillText(T(TX.go,a)+' ✈',0,7);g.restore();
    if(kb){g.font=FONT(11);g.fillStyle='rgba(255,246,230,.85)';g.textAlign='center';g.fillText(T(TX.kbFold,a),BTN.x+BTN.w/2,H-6)}
    /* 창가에서 응원하는 고양이 아이(작게) */
    drawMiniKid(g,312,200)}
  /* 선택 칸 아이콘: 바뀌는 부분만 크게 */
  function chipIcon(g,r,c,x,y){g.save();g.translate(x,y);g.lineJoin='round';g.lineCap='round';g.strokeStyle='#8a7a62';g.lineWidth=1.4;
    if(r===0){g.fillStyle='#fffdf5';g.beginPath();if(c===1){g.moveTo(-16,-9);g.lineTo(10,-4);g.lineTo(10,4);g.lineTo(-16,9)}else{g.moveTo(-16,-9);g.lineTo(16,0);g.lineTo(-16,9)}g.closePath();g.fill();g.stroke();
      g.beginPath();g.moveTo(c===1?10:16,0);g.lineTo(-16,0);g.stroke();
      if(c===2){g.fillStyle='#e8d6b0';g.beginPath();g.moveTo(16,0);g.lineTo(-2,-6);g.lineTo(2,0);g.lineTo(-2,6);g.closePath();g.fill();g.stroke()}}
    else if(r===1){drawPlaneTop(g,0,0,[0,c,0,0],0.2,true)}
    else if(r===2){g.strokeStyle='#8a7a62';g.lineWidth=3;g.beginPath();g.moveTo(-18,4);g.lineTo(6,4);g.stroke();
      g.strokeStyle=c===1?'#e29a2e':c===2?'#3f8fc9':'#8a7a62';g.beginPath();g.moveTo(6,4);g.lineTo(c===0?18:16,c===1?-8:c===2?14:4);g.stroke();
      if(c){g.fillStyle=g.strokeStyle;g.font=FONT(12);g.textAlign='center';g.fillText(c===1?'↑':'↓',-4,c===1?-4:-2)}}
    else{if(c===0){g.strokeStyle='rgba(120,90,60,.5)';g.lineWidth=2;g.beginPath();g.arc(0,0,8,0,7);g.moveTo(-6,6);g.lineTo(6,-6);g.stroke()}
      else{g.strokeStyle='#7f8a9e';g.lineWidth=2.4;g.beginPath();g.moveTo(14,-4);g.lineTo(-12,-4);g.arc(-12,0,4,4.71,1.57,true);g.lineTo(11,4);g.arc(11,1.5,2.5,1.57,4.71,true);g.lineTo(-7,-1);g.stroke()}}
    g.restore()}
  function drawMiniKid(g,x,y){var t=tG,bob=Math.sin(t*3)*2;g.save();g.translate(x,y+bob);
    g.fillStyle='#f6b562';g.beginPath();g.moveTo(-14,-6);g.lineTo(-12,-24);g.lineTo(-3,-13);g.fill();g.beginPath();g.moveTo(14,-6);g.lineTo(12,-24);g.lineTo(3,-13);g.fill();
    g.beginPath();g.arc(0,0,15,0,7);g.fill();g.fillStyle='#fff3e0';g.beginPath();g.ellipse(1,5,8,6,0,0,7);g.fill();
    g.fillStyle='#3a2416';if(blink<0){g.fillRect(-8,-2,5,1.6);g.fillRect(4,-2,5,1.6)}else{g.beginPath();g.ellipse(-5,-1,2.2,2.8,0,0,7);g.ellipse(6,-1,2.2,2.8,0,0,7);g.fill()}
    g.fillStyle='#e0533f';g.beginPath();g.arc(1,4,1.8,0,7);g.fill();g.strokeStyle='#f6b562';g.lineWidth=5;g.lineCap='round';
    g.beginPath();g.moveTo(-12,10);g.lineTo(-20,-12+Math.sin(t*8)*4);g.moveTo(12,10);g.lineTo(20,-12-Math.sin(t*8)*4);g.stroke();g.restore()}

  function draw(g,a,dt){tG+=dt||0;if(!L)return;
    if(mode==='fold')drawFold(g,a);else drawThrow(g,a,dt)}

  SG.run({id:'paper-plane',title:{ko:'종이비행기 교실',en:'Paper Plane Class'},
    how:{ko:'먼저 접고, 당겼다 놓아 날려요. 목표마다 맞는 접기가 달라요!',en:'Fold first, then pull back and release. Every target needs a different fold!'},
    init:init,update:update,draw:draw});
})();
