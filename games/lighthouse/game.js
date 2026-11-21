/* 폭풍의 등대지기 — 등대 빛줄기를 돌려, 어둠 속 배들이 바위를 보고 피해 가게 한다.
   시뮬레이션(배 조종, 빛 가림 레이캐스트, 기름, 봇)은 DOM 없이 돌도록 분리했다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640;
  /* ---------- 상수 ---------- */
  var BR=7,TURN=1.9,SEE=.35,HALF=.2,REACH=560,FOGK=2.2,FLASHR=190,FLASHT=.8,FLASHC=.3,AMB_LH=44,AMB_HB=64,
      ROW_LOST=2.0,KEYROT=3.2,DRAGROT=11,DIZZY=1.2,BACKV=150,LIVES=3,T0=50,T_ADD=14,T_CAP=70,T_FAIL=8,
      WHALE_R=18,WHALE_P=8,WHALE_UP=3.5,LOOK=80;
  var MOUTH={x:96,y:584};
  var LHS=[{x:250,y:552},{x:30,y:300}];
  var COAST=[[250,600,30],[214,622,26],[288,620,28],[330,628,30],[160,636,22],[30,634,28]];
  var HEAD2=[[6,318,30],[-10,290,30]];
  var BOUND={x0:6,x1:354,y0:40,y1:606};

  function rng(s){s=(s>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function wrap(a){while(a>Math.PI)a-=6.283185307;while(a<-Math.PI)a+=6.283185307;return a}
  function spawnPos(side,p){return side==='T'?{x:p,y:-12}:side==='L'?{x:-14,y:p}:{x:374,y:p}}

  /* ---------- 손으로 만든 10밤 ----------
     boats:[출발시각, 변(T/L/R), 위치, 속도, 종류('r'=길 잃은 쪽배)]
     rocks:[x,y,r] 또는 ['p',배번호,경로비율,옆으로,r] (그 배의 곧은 항로 위에 놓는다) */
  var DEFS=[
    {boats:[[.6,'T',118,32]],rocks:[['p',0,.42,0,16],['p',0,.72,-3,17],[260,330,18,1],[300,180,12]],a0:-1.0,
     hint:{ko:'빛을 비춰 배를 이끌어요',en:'Shine the light to guide the boats'}},
    {boats:[[.5,'L',150,42],[1.2,'R',190,42]],rocks:[['p',0,.34,0,17],['p',1,.34,2,17],['p',0,.5,-4,15],['p',1,.5,4,15],['p',0,.66,0,16],['p',1,.66,0,16],['p',0,.82,0,15],['p',1,.82,0,15],[170,330,18,1]],a0:-1.57,
     hint:{ko:'두 배를 번갈아 비춰요',en:'Swap the light between both boats'}},
    {boats:[[.5,'T',60,42],[2.2,'R',120,42],[4.4,'L',260,42]],rocks:[['p',0,.3,0,15],['p',1,.32,0,15],['p',2,.35,0,15],['p',0,.56,2,15],['p',1,.58,0,15],['p',2,.62,0,14],['p',0,.8,0,14],['p',1,.8,0,14],[230,250,18,1]],a0:-1.57,
     hint:{ko:'한곳만 비추면 기름이 닳아요 — 살살 흔들어요',en:'A still beam burns oil — keep it moving'}},
    {boats:[[.5,'T',190,42],[2.2,'L',120,42],[4.2,'R',260,42]],rocks:[['p',0,.35,0,16],['p',1,.45,0,15],['p',2,.42,0,16],['p',0,.68,0,15],['p',2,.75,0,14],[200,380,17,1]],
     fog:[[110,230,58,6],[290,160,52,-5]],a0:-1.57,
     hint:{ko:'안개 속에서는 빛이 짧아져요',en:'Fog shortens the beam'}},
    {boats:[[.3,'T',40,40],[1.2,'T',190,40],[7.6,'R',330,40],[10,'R',480,38]],rocks:[['p',0,.5,0,15],['p',0,.85,0,15],['p',1,.45,0,15],['p',1,.78,0,15],['p',2,.5,0,15],['p',3,.3,0,15],[300,200,18,1]],a0:-1.57,
     hint:{ko:'등대를 톡! 잠깐 사방을 밝혀요',en:'Tap the lighthouse to flash all around'}},
    {boats:[[.5,'L',120,42],[2.4,'T',250,42],[4.4,'R',220,42]],rocks:[['p',0,.6,0,15],['p',1,.68,0,15],['p',2,.72,0,14],[180,90,13],[300,330,17,1]],whales:[['p',0,.33,0],['p',1,.35,0],['p',2,.42,4]],a0:-1.57,
     hint:{ko:'고래가 떠오르면 피해 가야 해요',en:'Boats must steer around surfaced whales'}},
    {boats:[[.5,'L',330,26,'r'],[2.5,'T',300,42],[5,'R',150,42]],rocks:[['p',0,.45,0,14],['p',1,.45,0,15],['p',2,.45,0,15],['p',1,.75,0,13],[60,200,13],[190,300,18,1]],a0:-2.6,
     hint:{ko:'길 잃은 쪽배는 끝까지 비춰 주세요',en:'Keep the lost rowboat lit all the way'}},
    {boats:[[.5,'T',70,42],[2.3,'L',230,42],[4.2,'T',220,42],[6.2,'R',330,42]],rocks:[['p',0,.42,0,15],['p',1,.5,0,15],['p',2,.45,0,15],['p',3,.5,0,15],['p',0,.75,0,14],['p',2,.78,0,14],[160,300,18,1]],storm:[20,0],a0:-1.57,
     hint:{ko:'파도가 배를 옆으로 밀어요',en:'Storm waves push boats sideways'}},
    {boats:[[.5,'T',300,42],[1.5,'L',150,42],[3.5,'R',200,42],[5.5,'L',440,40]],rocks:[['p',0,.4,0,15],['p',1,.45,0,15],['p',2,.42,0,15],['p',3,.5,0,14],['p',1,.75,0,13],['p',0,.72,0,14],[200,240,18,1]],two:1,a0:-1.57,
     hint:{ko:'등대가 둘! 빛줄기를 끌어서 각각 돌려요',en:'Two lighthouses! Drag each beam'}},
    {boats:[[.5,'T',140,42],[1.8,'R',160,42],[3.3,'L',120,42],[5,'T',280,44],[6.8,'L',430,42]],rocks:[['p',0,.4,0,15],['p',1,.42,0,15],['p',2,.45,0,15],['p',3,.5,0,15],['p',4,.5,0,14],['p',0,.72,0,14],[260,280,18,1]],
     fog:[[230,200,55,5]],whales:[['p',1,.7,0]],storm:[12,0],two:1,a0:-1.57,
     hint:{ko:'마지막 폭풍의 밤! 모든 걸 기억해요',en:'The last stormy night — use everything!'}}
  ];


  function pathPt(bd,f,off,storm){var s=spawnPos(bd[1],bd[2]),dx=MOUTH.x-s.x,dy=MOUTH.y-s.y,L=Math.hypot(dx,dy),ts=f*L/bd[3];
    var wx=storm?storm[0]*.55*ts:0,wy=storm?storm[1]*.55*ts:0;
    return {x:s.x+dx*f-dy/L*off+wx,y:s.y+dy*f+dx/L*off+wy}}
  function build(def,n){
    var rocks=(def.rocks||[]).map(function(r){if(r[0]==='p'){var p=pathPt(def.boats[r[1]],r[2],r[3],def.storm);return [Math.round(p.x),Math.round(p.y),r[4]]}return r.slice()});
    var whales=(def.whales||[]).map(function(w,i){if(w[0]==='p'){var p=pathPt(def.boats[w[1]],w[2],0,def.storm);return [Math.round(p.x),Math.round(p.y),w[3]||0]}return w.slice()});
    return {n:n,boats:def.boats.map(function(b){return b.slice()}),rocks:rocks,whales:whales,fog:(def.fog||[]).map(function(f){return f.slice()}),
      storm:def.storm||null,two:!!def.two,quota:def.boats.length,hint:def.hint||null,a0:def.a0==null?-1.57:def.a0,seed:def.seed||(n*7919+3)}}

  /* ---------- 절차 생성 (11밤부터) — 봇으로 검증한 것만 쓴다 ---------- */
  function genDef(n,seed){
    var R=rng(seed),k=n-10,i,j;
    var two=n>=12&&R()<.5,fog=R()<.5,whale=R()<.45,row=R()<.3,storm=R()<.4;
    var nb=Math.min(6,3+Math.floor(k/5)+(R()<.5?1:0)),boats=[],t=.5,v0=Math.min(46,40+k*.3);
    for(i=0;i<nb;i++){var side=R()<.4?'T':R()<.5?'L':'R',p;
      if(side==='T')p=30+R()*300;else{p=70+R()*330;if(two&&side==='L'&&p>230&&p<360)p=p<300?200:400}
      var isRow=row&&i===1;boats.push([+t.toFixed(2),side,Math.round(p),isRow?24:Math.round(v0+R()*4),isRow?'r':undefined]);
      t+=isRow?3:1.1+R()*1.7}
    boats.forEach(function(b){if(b[4]===undefined)b.length=4});
    var rocks=[];
    function okRock(x,y,r){if(x<20||x>340||y<70||y>520)return false;if(Math.hypot(x-LHS[0].x,y-LHS[0].y)<115)return false;if(two&&Math.hypot(x-LHS[1].x,y-LHS[1].y)<100)return false;
      if(Math.hypot(x-MOUTH.x,y-MOUTH.y)<80||Math.hypot(x-LHS[0].x,y-LHS[0].y)<70)return false;
      if(two&&Math.hypot(x-LHS[1].x,y-LHS[1].y)<70)return false;
      for(var q=0;q<rocks.length;q++)if(Math.hypot(x-rocks[q][0],y-rocks[q][1])<r+rocks[q][2]+2*BR+14)return false;return true}
    for(i=0;i<nb;i++){var f=.3+R()*.3;for(j=0;j<8;j++){var p2=pathPt(boats[i],f+j*.03,(R()-.5)*10),r=13+Math.round(R()*4);
        if(okRock(p2.x,p2.y,r)){rocks.push([Math.round(p2.x),Math.round(p2.y),r]);break}}}
    for(i=0;i<2+Math.floor(R()*3);i++){for(j=0;j<10;j++){var x=30+R()*300,y=90+R()*400,r2=11+Math.round(R()*4);if(okRock(x,y,r2)){rocks.push([Math.round(x),Math.round(y),r2]);break}}}
    for(i=0;i<1+Math.floor(R()*2);i++){for(j=0;j<12;j++){var x3=40+R()*280,y3=110+R()*330,r3=16+Math.round(R()*4);if(okRock(x3,y3,r3)){rocks.push([Math.round(x3),Math.round(y3),r3,1]);break}}}
    var whales=[];if(whale){var wb=boats[Math.floor(R()*nb)],wp=pathPt(wb,.62+R()*.1,0);whales.push([Math.round(wp.x),Math.round(wp.y),Math.round(R()*6)])}
    var fogs=[];if(fog)fogs.push([Math.round(60+R()*240),Math.round(150+R()*200),Math.round(55+R()*20),(R()<.5?-1:1)*(4+Math.round(R()*4))]);
    return {boats:boats,rocks:rocks,whales:whales,fog:fogs,storm:storm?[(R()<.5?-1:1)*(10+Math.round(R()*8)),0]:null,two:two,a0:-1.57,seed:seed}}
  var cache={},genTries=0;
  function getLevel(n){
    if(cache[n])return cache[n];var lv;
    if(n<DEFS.length)lv=build(DEFS[n],n);
    else{for(var i=0;i<40;i++){genTries++;var cand=build(genDef(n,n*7919+i*104729+13),n);if(validate(cand).ok){lv=cand;break}}
      if(!lv)lv=build(DEFS[9],n)}
    return cache[n]=lv}

  /* ---------- 기하 ---------- */
  /* 선분 (x,y)+(dx,dy)*t, t∈[0,len] 이 원과 처음 만나는 t (없으면 -1) */
  function rayCircle(x,y,dx,dy,len,cx,cy,r){var fx=x-cx,fy=y-cy,b=fx*dx+fy*dy,c=fx*fx+fy*fy-r*r;
    if(c<=0)return 0;var d=b*b-c;if(d<0)return -1;var t=-b-Math.sqrt(d);return t>=0&&t<=len?t:-1}
  function chord(x,y,dx,dy,cx,cy,r){var fx=x-cx,fy=y-cy,b=fx*dx+fy*dy,c=fx*fx+fy*fy-r*r,d=b*b-c;if(d<=0)return null;
    var s=Math.sqrt(d),t0=-b-s,t1=-b+s;if(t1<=0)return null;return [Math.max(0,t0),t1]}

  /* ---------- 시뮬레이션 ---------- */
  function newSim(lv){
    var S={lv:lv,t:0,R:rng(lv.seed),boats:[],spawn:0,docked:0,lives:LIVES,failed:false,cleared:false,ev:[],flash:[0,0],
      beams:[],lightT:0,nextLight:0,fog:lv.fog.map(function(f){return {x:f[0],y:f[1],r:f[2],vx:f[3]}}),drift:{x:0,y:0},bonks:0};
    var nb=lv.two?2:1;for(var i=0;i<nb;i++)S.beams.push({x:LHS[i].x,y:LHS[i].y,a:i?-.6:lv.a0,ta:null,oil:1,act:0,still:0,flashT:0});
    S.nextLight=9+S.R()*7;
    S.obsStatic=lv.rocks.map(function(r){return {x:r[0],y:r[1],r:r[2],rock:1,tall:!!r[3]}}).concat(COAST.map(function(c){return {x:c[0],y:c[1],r:c[2]}}));
    if(lv.two)S.obsStatic=S.obsStatic.concat(HEAD2.map(function(c){return {x:c[0],y:c[1],r:c[2]}}));
    return S}
  function whaleUp(S,w){var ph=((S.t+w[2])%WHALE_P+WHALE_P)%WHALE_P;return ph<WHALE_UP}
  function whalePhase(S,w){return ((S.t+w[2])%WHALE_P+WHALE_P)%WHALE_P}
  function obstacles(S,plan){var o=S.obsStatic.slice();S.lv.whales.forEach(function(w){var ph=whalePhase(S,w);
      if(ph<WHALE_UP||(plan&&ph>WHALE_P-1.3))o.push({x:w[0],y:w[1],r:WHALE_R,whale:1})});return o}
  function reachOf(B){return REACH*(.35+.65*B.oil)}
  /* 빛이 ang 방향으로 닿는 거리 (바위 그림자 + 안개) */
  function rayEnd(S,B,ang,reach){
    var dx=Math.cos(ang),dy=Math.sin(ang),best=reach*FOGK,i,o;
    for(i=0;i<S.obsStatic.length;i++){o=S.obsStatic[i];if(!o.tall)continue;var t=rayCircle(B.x,B.y,dx,dy,best,o.x,o.y,o.r);if(t>=0&&t<best)best=t}
    var iv=[];for(i=0;i<S.fog.length;i++){var f=S.fog[i],c=chord(B.x,B.y,dx,dy,f.x,f.y,f.r);if(c)iv.push(c)}
    iv.sort(function(a,b){return a[0]-b[0]});
    var cur=0,eff=0,fr=null;
    for(i=0;i<iv.length&&fr==null;i++){var a=Math.max(iv[i][0],cur),b=iv[i][1];if(b<=cur)continue;
      if(eff+(a-cur)>=reach){fr=cur+(reach-eff);break}eff+=a-cur;cur=a;
      if(eff+(b-a)*FOGK>=reach){fr=a+(reach-eff)/FOGK;break}eff+=(b-a)*FOGK;cur=b}
    if(fr==null)fr=cur+(reach-eff);
    return Math.min(best,fr)}
  function litBy(S,B,px,py,ang){
    var dx=px-B.x,dy=py-B.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
    if(d<AMB_LH)return 2;
    if(B.flashT>0&&d<=FLASHR&&rayEnd(S,B,a,FLASHR)>=d-2)return 2;
    if(Math.abs(wrap(a-(ang==null?B.a:ang)))>HALF)return 0;
    return rayEnd(S,B,a,reachOf(B))>=d-2?1:0}
  function isLit(S,x,y){
    if(S.lightT>0||Math.hypot(x-MOUTH.x,y-MOUTH.y)<AMB_HB)return 2;
    var r=0;for(var i=0;i<S.beams.length;i++)r=Math.max(r,litBy(S,S.beams[i],x,y));return r}
  function clearRay(obs,x,y,ang,len,pad){var dx=Math.cos(ang),dy=Math.sin(ang);
    for(var i=0;i<obs.length;i++){var o=obs[i];if(rayCircle(x,y,dx,dy,len,o.x,o.y,o.r+pad)>=0)return false}return true}
  /* 바람(파도)을 고려해 '땅 위 진행 방향' u 로 가려면 뱃머리를 어디로 둘지 */
  function headingFor(u,v,w){var ux=Math.cos(u),uy=Math.sin(u),wd=w.x*ux+w.y*uy,px=w.x-wd*ux,py=w.y-wd*uy,pp=px*px+py*py;
    if(pp>=v*v*.8)return u;var s=Math.sqrt(v*v-pp);return Math.atan2(uy*s-py,ux*s-px)}
  /* 볼 수 있을 때 선장이 고르는 진행 방향 */
  function desired(S,b,obs){
    var base=Math.atan2(MOUTH.y-b.y,MOUTH.x-b.x),look=LOOK+b.v*1.5,dm=Math.hypot(MOUTH.x-b.x,MOUTH.y-b.y);
    look=Math.min(look,dm);var pad=BR+4,step=.16;
    for(var k=0;k<=10;k++){
      for(var s=0;s<(k?2:1);s++){var sg=(s===0?b.pref:-b.pref),ang=base+sg*k*step;
        if(clearRay(obs,b.x,b.y,ang,look,pad)){if(k)b.pref=sg;return ang}}}
    return base+b.pref*1.6}
  function timeToHit(S,b,obs,horizon){ /* 지금 방향으로 계속 가면 몇 초 뒤 부딪히나 */
    var vx=Math.cos(b.h)*b.v+S.drift.x,vy=Math.sin(b.h)*b.v+S.drift.y,sp=Math.hypot(vx,vy);if(sp<1)return Infinity;
    var dx=vx/sp,dy=vy/sp,best=Infinity;
    for(var i=0;i<obs.length;i++){var o=obs[i],t=rayCircle(b.x,b.y,dx,dy,sp*horizon,o.x,o.y,o.r+BR);if(t>=0&&t/sp<best)best=t/sp}
    return best}
  function spawnBoat(S,bd,idx){var p=spawnPos(bd[1],bd[2]);
    return {idx:idx,x:p.x,y:p.y,sx:p.x,sy:p.y,h:Math.atan2(MOUTH.y-p.y,MOUTH.x-p.x),v:bd[3],kind:bd[4]==='r'?'row':'boat',
      st:'sail',tm:0,lit:false,darkT:0,pref:(idx%2?1:-1),litT:0,wake:[],id:idx}}
  function loseLife(S,b,why){S.lives--;S.bonks++;b.st='dizzy';b.tm=0;S.ev.push({k:why,x:b.x,y:b.y,boat:b});
    if(S.lives<=0){S.failed=true;S.ev.push({k:'fail'})}}
  function step(S,dt,ctl){
    if(S.failed||S.cleared)return;ctl=ctl||{};S.t+=dt;var i,lv=S.lv;
    /* 바람 · 안개 · 번개 */
    if(lv.storm){var m=.55+.45*Math.sin(S.t*.9);S.drift.x=lv.storm[0]*m;S.drift.y=lv.storm[1]*m}
    S.fog.forEach(function(f){f.x+=f.vx*dt;if(f.x<-f.r)f.x=W+f.r;if(f.x>W+f.r)f.x=-f.r});
    if(S.lightT>0)S.lightT-=dt;
    if(S.t>=S.nextLight&&lv.n>0){S.lightT=.4;S.nextLight=S.t+10+S.R()*8;S.ev.push({k:'lightning'})}
    /* 빛줄기 */
    S.beams.forEach(function(B,bi){var a0=B.a,c=(ctl.beams||[])[bi]||{};
      if(c.ta!=null){var d=wrap(c.ta-B.a),mx=(c.rate||DRAGROT)*dt;B.a=wrap(B.a+Math.max(-mx,Math.min(mx,d)))}
      if(c.rot)B.a=wrap(B.a+c.rot*KEYROT*dt);
      var w=Math.abs(wrap(B.a-a0))/Math.max(dt,1e-4);B.act+=(w-B.act)*Math.min(1,dt/.6);
      if(B.act<.3)B.still+=dt;else B.still=Math.max(0,B.still-dt*3);
      if(B.still>1)B.oil=Math.max(0,B.oil-.2*dt);else B.oil=Math.min(1,B.oil+.1*dt);
      if(B.flashT>0)B.flashT-=dt;
      if(c.flash){if(B.oil>=FLASHC&&B.flashT<=0){B.oil-=FLASHC;B.flashT=FLASHT;S.ev.push({k:'flash',b:bi})}else S.ev.push({k:'noflash',b:bi})}});
    /* 배 등장 */
    while(S.spawn<lv.boats.length&&S.t>=lv.boats[S.spawn][0]){S.boats.push(spawnBoat(S,lv.boats[S.spawn],S.spawn));S.spawn++}
    var obs=obstacles(S),pobs=obstacles(S,1);
    /* 고래가 막 떠오르면 위에 있던 배는 살짝 밀려난다 */
    lv.whales.forEach(function(w){var ph=whalePhase(S,w);if(ph<dt*1.5)S.boats.forEach(function(b){var dx=b.x-w[0],dy=b.y-w[1],d=Math.hypot(dx,dy)||1;
      if(d<WHALE_R+BR+2){b.x=w[0]+dx/d*(WHALE_R+BR+2);b.y=w[1]+dy/d*(WHALE_R+BR+2)}})});
    for(i=0;i<S.boats.length;i++){var b=S.boats[i];b.tm+=dt;
      if(b.st==='docked')continue;
      if(b.st==='dock'){b.x+=(MOUTH.x-b.x)*Math.min(1,dt*3);b.y+=(MOUTH.y+22-b.y)*Math.min(1,dt*3);if(b.tm>.8)b.st='docked';continue}
      if(b.st==='dizzy'){b.h+=dt*5;if(b.tm>DIZZY){b.st='back';b.tm=0}continue}
      if(b.st==='back'){var bx=b.sx-b.x,by=b.sy-b.y,bd=Math.hypot(bx,by);
        if(bd<BACKV*dt){b.x=b.sx;b.y=b.sy;b.st='sail';b.tm=0;b.h=Math.atan2(MOUTH.y-b.y,MOUTH.x-b.x);b.darkT=0}
        else{b.x+=bx/bd*BACKV*dt;b.y+=by/bd*BACKV*dt}continue}
      /* 항해 */
      var L=isLit(S,b.x,b.y);b.lit=L>0;b.amb=L===2;
      if(b.lit){b.darkT=0;b.litT+=dt}else{if(b.x>0&&b.x<W&&b.y>0)b.darkT+=dt;b.litT=0}
      b.sees=b.lit&&(b.litT>=SEE||S.lightT>0||b.amb);
      if(b.sees){var u=desired(S,b,pobs),hh=headingFor(u,b.v,S.drift),dh=wrap(hh-b.h);b.h=wrap(b.h+Math.max(-TURN*dt,Math.min(TURN*dt,dh)))}
      else{
        var out=(b.x<BOUND.x0&&Math.cos(b.h)<0)||(b.x>BOUND.x1&&Math.cos(b.h)>0)||(b.y<BOUND.y0&&Math.sin(b.h)<0)||(b.y>BOUND.y1-14&&Math.sin(b.h)>0);
        if(out){var bs=Math.atan2(MOUTH.y-b.y,MOUTH.x-b.x),d2=wrap(bs-b.h);b.h=wrap(b.h+Math.max(-TURN*dt,Math.min(TURN*dt,d2)))}}
      b.x+=Math.cos(b.h)*b.v*dt+S.drift.x*dt;b.y+=Math.sin(b.h)*b.v*dt+S.drift.y*dt;
      if(Math.hypot(MOUTH.x-b.x,MOUTH.y-b.y)<20){b.st='dock';b.tm=0;S.docked++;S.ev.push({k:'dock',x:b.x,y:b.y,boat:b});
        if(S.docked>=lv.quota){S.cleared=true;S.ev.push({k:'clear'})}continue}
      if(b.kind==='row'&&b.darkT>ROW_LOST){loseLife(S,b,'lost');continue}
      for(var j=0;j<obs.length;j++){var o=obs[j];if(Math.hypot(o.x-b.x,o.y-b.y)<o.r+BR-1){loseLife(S,b,o.whale?'whale':'bonk');
          b.x+=(b.x-o.x)/(Math.hypot(o.x-b.x,o.y-b.y)||1)*3;break}}
      if(S.failed)return}
  }

  /* ---------- 봇: 가장 먼저 부딪힐 배를 비춘다 (키보드 회전 속도 제한) ---------- */
  function bot(S,dt){
    var obs=obstacles(S),pobs=obstacles(S,1),cands=[],ctl={beams:[]};
    S.boats.forEach(function(b){if(b.st!=='sail')return;
      var ttc=timeToHit(S,b,obs,8),save={pref:b.pref},u=desired(S,b,pobs);b.pref=save.pref;
      var hh=headingFor(u,b.v,S.drift),off=Math.abs(wrap(hh-b.h)),urg=Infinity;
      if(ttc<Infinity)urg=ttc;
      if(off>.25)urg=Math.min(urg,2.2+(1-Math.min(1,off))*1.5);
      if(b.kind==='row')urg=Math.min(urg,b.lit?ROW_LOST-.3:Math.max(0,ROW_LOST-b.darkT-.1));
      if(b.x<-4||b.x>W+4||b.y<-4)urg=Math.max(urg,3);
      if(urg<Infinity)cands.push({b:b,urg:urg,ttc:ttc})});
    cands.sort(function(a,b){return a.urg-b.urg});
    var used={};
    S.beams.forEach(function(B,bi){var best=null,bestS=Infinity;
      cands.forEach(function(c){if(used[c.b.id])return;var ang=Math.atan2(c.b.y-B.y,c.b.x-B.x);
        if(!litBy(S,B,c.b.x,c.b.y,ang)&&Math.hypot(c.b.x-B.x,c.b.y-B.y)>AMB_LH)return;
        var turn=Math.abs(wrap(ang-B.a))/KEYROT,need=turn+(c.b.sees?0:SEE)+.3,sc=c.urg-need;if(sc<-.2)sc+=6;if(B.lockId===c.b.id)sc-=c.b.litT<SEE+.35?1:.25;if(sc<bestS){bestS=sc;best=c}});
      var c2={};
      if(best){used[best.b.id]=1;B.lockId=best.b.id;var tgt=Math.atan2(best.b.y-B.y,best.b.x-B.x);
        if(Math.abs(wrap(tgt-B.a))<HALF*.6)tgt+=Math.sin(S.t*16)*.11;c2.ta=tgt;c2.rate=KEYROT}
      else{B.lockId=null;c2.ta=B.a+Math.sin(S.t*3)*.4;c2.rate=KEYROT}
      /* 번쩍: 곧 부딪힐 배가 둘 이상 근처에 있거나, 빛이 제때 못 닿는 배가 근처에 있을 때 */
      var near=cands.filter(function(c){return c.ttc<1.1&&Math.hypot(c.b.x-B.x,c.b.y-B.y)<FLASHR-8&&!c.b.lit});
      var late=near.filter(function(c){return Math.abs(wrap(Math.atan2(c.b.y-B.y,c.b.x-B.x)-B.a))/KEYROT>c.ttc*.7});
      if(B.oil>=FLASHC&&B.flashT<=0&&(near.length>=2||late.length))c2.flash=1;
      ctl.beams[bi]=c2});
    return ctl}
  function fixedBot(a){return function(S){return {beams:S.beams.map(function(){return {}})}}}
  function randomBot(seed){var R=rng(seed),tg=[];return function(S,dt){return {beams:S.beams.map(function(B,i){
      if(tg[i]==null||R()<dt*1.2)tg[i]=-Math.PI+R()*Math.PI;return {ta:tg[i],rate:KEYROT}})}}}
  function trial(lv,brain,opts){opts=opts||{};var S=newSim(lv),dt=1/30,lim=opts.limit||30;
    if(opts.a!=null)S.beams.forEach(function(B,i){B.a=i?opts.a2:opts.a});
    var flashes=0;
    while(!S.failed&&!S.cleared&&S.t<lim){step(S,dt,brain(S,dt));S.ev.forEach(function(e){if(e.k==='flash')flashes++});S.ev.length=0}
    return {ok:S.cleared,lives:S.lives,time:S.t,docked:S.docked,bonks:S.bonks,flashes:flashes}}
  function validate(lv){var r=trial(lv,bot,{limit:20});if(!r.ok||r.lives<2)return {ok:false,r:r};
    for(var a=-Math.PI;a<Math.PI-.01;a+=Math.PI/12){if(trial(lv,fixedBot(),{a:a,a2:a+.4,limit:24}).ok)return {ok:false,fixed:a}}
    for(var s=1;s<=4;s++)if(trial(lv,randomBot(s*13+lv.n),{limit:24}).ok)return {ok:false,rnd:s};
    return {ok:true,r:r}}

  var CORE={W:W,H:H,DEFS:DEFS,build:build,genDef:genDef,getLevel:getLevel,newSim:newSim,step:step,bot:bot,fixedBot:fixedBot,randomBot:randomBot,
    trial:trial,validate:validate,isLit:isLit,litBy:litBy,rayEnd:rayEnd,obstacles:obstacles,timeToHit:timeToHit,whaleUp:whaleUp,
    K:{T0:T0,T_ADD:T_ADD,T_CAP:T_CAP,T_FAIL:T_FAIL,LIVES:LIVES,KEYROT:KEYROT},genTries:function(){return genTries}};
  if(typeof module!=='undefined'&&module.exports)module.exports=CORE;
  if(typeof window==='undefined'||!window.SG)return;

  /* =================== 화면 =================== */
  function hash(n){n=(n|0)*374761393+668265263|0;n=(n^(n>>>13))*1274126177|0;return ((n^(n>>>16))>>>0)/4294967296}
  var HULL=['#e2574c','#3fb6a8','#f2c14e','#9b7bd8','#f08a4b','#5fa8e8'];
  var G=null,tG=0,keys={l:0,r:0},kTap=0,kSwitch=0,kUsed=false,rain=[],glints=[],stars=[];
  for(var ri=0;ri<70;ri++)rain.push({x:hash(ri)*W,y:hash(ri+99)*H,v:420+hash(ri+7)*260,l:8+hash(ri+3)*10});
  for(var gi=0;gi<46;gi++)glints.push({x:hash(gi+300)*W,y:40+hash(gi+400)*560,p:hash(gi+500)*6.28,s:.6+hash(gi+600)*.8});
  if(!window.__lhKeys){window.__lhKeys=1;
    window.addEventListener('keydown',function(e){var c=e.code;
      if(c==='ArrowLeft'||c==='KeyA'){keys.l=1;kUsed=true}else if(c==='ArrowRight'||c==='KeyD'){keys.r=1;kUsed=true}
      else if(c==='Space'){if(!e.repeat)kTap=1;kUsed=true}
      else if(c==='ArrowDown'||c==='KeyS'||c==='Tab'||c==='ArrowUp'||c==='KeyW'){if(!e.repeat)kSwitch=1;kUsed=true;if(c==='Tab'&&G&&G.playing)e.preventDefault()}});
    window.addEventListener('keyup',function(e){var c=e.code;if(c==='ArrowLeft'||c==='KeyA')keys.l=0;else if(c==='ArrowRight'||c==='KeyD')keys.r=0})}

  function rockShape(r,i){var pts=[],n=9;for(var k=0;k<n;k++){var a=k/n*6.283+hash(i*31+k)*.5,q=r*(.82+hash(i*17+k*5)*.3);pts.push([Math.cos(a)*q,Math.sin(a)*q])}return pts}
  function prep(lv){if(lv._shapes)return;lv._shapes=lv.rocks.map(function(r,i){return rockShape(r[2],i+lv.n*13)})}
  function poly(g,x,y,pts,sc){g.beginPath();for(var k=0;k<pts.length;k++){var px=x+pts[k][0]*(sc||1),py=y+pts[k][1]*(sc||1);if(k)g.lineTo(px,py);else g.moveTo(px,py)}g.closePath()}

  function init(a){
    G={n:0,time:T0,phase:'play',pt:0,S:null,lv:null,active:0,drag:-1,score:0,cat:{mood:0,mt:0,blink:2,look:-1.57},
       banner:0,bolt:null,flashRing:[],playing:true,shake:0,lastDrag:0};
    keys.l=keys.r=0;kTap=kSwitch=0;kUsed=false;
    startNight(0)}
  function startNight(n){G.n=n;G.lv=getLevel(n);prep(G.lv);G.S=newSim(G.lv);G.phase='play';G.pt=0;G.banner=2.2;if(G.active>=G.S.beams.length)G.active=0;if(G.drag>=G.S.beams.length)G.drag=-1}
  function catMood(m,d){G.cat.mood=m;G.cat.mt=d||1.4}
  function beamAt(S,x,y){ /* 손가락에 가장 가까운(각도) 빛줄기 */
    var best=0,bd=99;S.beams.forEach(function(B,i){var d=Math.abs(wrap(Math.atan2(y-B.y,x-B.x)-B.a))+Math.hypot(x-B.x,y-B.y)/900;if(d<bd){bd=d;best=i}});return best}
  function onLighthouse(S,x,y){for(var i=0;i<S.beams.length;i++){var B=S.beams[i];if(Math.abs(x-B.x)<24&&y>B.y-22&&y<B.y+(i?34:50))return i}return -1}

  function update(dt,inp,a){
    tG+=dt;var S=G.S,ko=a.lang==='ko';G.banner=Math.max(0,G.banner-dt);
    if(G.cat.mt>0){G.cat.mt-=dt;if(G.cat.mt<=0)G.cat.mood=0}
    G.cat.blink-=dt;if(G.cat.blink<-.14)G.cat.blink=2+Math.random()*3;
    G.flashRing=G.flashRing.filter(function(f){f.t+=dt;return f.t<.7});
    if(G.bolt){G.bolt.t+=dt;if(G.bolt.t>.5)G.bolt=null}
    if(G.phase!=='play'){G.pt+=dt;cosmetic(S,dt);
      if(G.pt>1.9){if(G.phase==='clear')startNight(G.n+1);else startNight(G.n)}
      kTap=kSwitch=0;return}
    /* 입력 → 조종 */
    var ctl={beams:S.beams.map(function(){return {}})},ptrTap=inp.tap&&!kTap&&inp.x!=null;
    if(ptrTap){kUsed=false;var lh=onLighthouse(S,inp.x,inp.y);
      if(lh>=0){ctl.beams[lh].flash=1;G.drag=-1;G.active=lh}else{G.drag=beamAt(S,inp.x,inp.y);G.active=G.drag}}
    if(inp.down&&inp.x!=null&&G.drag>=0){var B=S.beams[G.drag],dx=inp.x-B.x,dy=inp.y-B.y;
      if(dx*dx+dy*dy>26*26){ctl.beams[G.drag].ta=Math.atan2(dy,dx);ctl.beams[G.drag].rate=DRAGROT;G.lastDrag=tG}}
    if(!inp.down)G.drag=-1;
    if(kSwitch&&S.beams.length>1)G.active=(G.active+1)%S.beams.length;
    if(G.active>=S.beams.length)G.active=0;
    var rot=(keys.r?1:0)-(keys.l?1:0);if(rot){ctl.beams[G.active].rot=rot;G.lastDrag=tG}
    if(kTap)ctl.beams[G.active].flash=1;
    kTap=kSwitch=0;
    if(window.__lhAuto)ctl=bot(S,dt);
    /* 시뮬레이션 (작게 나눠 진행) */
    var n=Math.max(1,Math.ceil(dt*60)),h=dt/n;
    for(var i=0;i<n&&!S.failed&&!S.cleared;i++){step(S,h,ctl);ctl.beams.forEach(function(c){c.flash=0})}
    var bk=S.beams[0];G.cat.look=bk.a;
    S.ev.forEach(function(e){var b=e.boat;
      if(e.k==='dock'){var pts=10+(b.kind==='row'?10:0);G.score+=pts;a.add(pts);a.sfx('coin');a.beep(196,.3,'triangle');
        a.burst(MOUTH.x,MOUTH.y+10,'#ffd36b',14);a.pop(MOUTH.x+20,MOUTH.y-18,'+'+pts,'#ffe08a');catMood(1,1.3)}
      else if(e.k==='bonk'||e.k==='whale'){a.sfx('hit');a.shake(7);a.burst(e.x,e.y,'#dff4ff',16);
        a.pop(e.x,e.y-16,e.k==='whale'?(ko?'고래랑 쿵!':'Whale bonk!'):(ko?'쿵!':'Bonk!'),'#ff8f7a');catMood(2,1.2)}
      else if(e.k==='lost'){a.sfx('hit');a.burst(e.x,e.y,'#9fd0ff',12);a.pop(e.x,e.y-16,ko?'길을 잃었어요':'Lost!','#9fd0ff');catMood(2,1.2)}
      else if(e.k==='flash'){var B2=S.beams[e.b];a.beep(1320,.18,'sine');a.beep(880,.25,'triangle');G.flashRing.push({x:B2.x,y:B2.y,t:0});catMood(3,.8)}
      else if(e.k==='noflash'){a.beep(150,.15,'square');var B3=S.beams[e.b];a.pop(B3.x,B3.y-34,ko?'기름 부족':'Low oil','#ffb26b')}
      else if(e.k==='lightning'){G.bolt={x:30+Math.random()*300,t:0,seed:Math.random()*1000};a.beep(70,.6,'sawtooth');a.shake(3)}
    });S.ev.length=0;
    if(S.cleared){G.phase='clear';G.pt=0;var bonus=20+10*S.lives;G.score+=bonus;a.add(bonus);a.sfx('win');
      G.time=Math.min(T_CAP,G.time+T_ADD);a.burst(MOUTH.x,MOUTH.y,'#ffd36b',24);a.burst(250,520,'#fff3c4',18);catMood(1,2);
      a.tempo(1+Math.min(.6,(G.n+1)*.05));return}
    if(S.failed){G.phase='fail';G.pt=0;G.time-=T_FAIL;a.sfx('hit');a.shake(10);catMood(2,2);if(G.time<=0){G.time=0;a.over();return}return}
    G.time-=dt;if(G.time<=0){G.time=0;a.over()}
  }
  function cosmetic(S,dt){S.boats.forEach(function(b){b.tm+=dt;if(b.st==='dock'){b.x+=(MOUTH.x-b.x)*Math.min(1,dt*3);b.y+=(MOUTH.y+22-b.y)*Math.min(1,dt*3)}
    else if(b.st==='dizzy')b.h+=dt*5})}

  /* ---------- 그리기 도우미 ---------- */
  function beamPoly(S,B,half,reach,n){var pts=[[B.x,B.y]];for(var k=0;k<=n;k++){var a=B.a-half+2*half*k/n,d=rayEnd(S,B,a,reach)+7;pts.push([B.x+Math.cos(a)*d,B.y+Math.sin(a)*d])}return pts}
  function circlePoly(S,B,r,n){var pts=[];for(var k=0;k<n;k++){var a=k/n*6.283,d=rayEnd(S,B,a,r);pts.push([B.x+Math.cos(a)*d,B.y+Math.sin(a)*d])}return pts}
  function pathPts(g,pts){g.moveTo(pts[0][0],pts[0][1]);for(var k=1;k<pts.length;k++)g.lineTo(pts[k][0],pts[k][1]);g.closePath()}

  function drawSea(g,lit){
    var t=tG,i;
    if(!lit){var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#030814');gr.addColorStop(.55,'#071427');gr.addColorStop(1,'#0b2034');
      g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40)}
    else{var gl=g.createLinearGradient(0,0,0,H);gl.addColorStop(0,'#0e2c42');gl.addColorStop(1,'#16465a');g.fillStyle=gl;g.fillRect(-20,-20,W+40,H+40)}
    /* 느린 너울 띠 */
    for(i=0;i<9;i++){var y=((i*78+t*9)%720)-40;g.fillStyle=lit?'rgba(140,210,230,.07)':'rgba(40,80,120,.10)';
      g.beginPath();g.moveTo(-10,y);for(var x=0;x<=W+20;x+=30)g.lineTo(x,y+Math.sin(x*.025+t*.8+i)*7);
      g.lineTo(W+20,y+18);for(var x2=W+20;x2>=-10;x2-=30)g.lineTo(x2,y+18+Math.sin(x2*.03+t*.7+i*2)*6);g.closePath();g.fill()}
    /* 물결 반짝임 */
    g.lineCap='round';
    for(i=0;i<glints.length;i++){var p=glints[i],gx=(p.x+t*7*p.s)%(W+20)-10,gy=p.y+Math.sin(t*.6+p.p)*4,al=.5+.5*Math.sin(t*1.7+p.p);
      g.strokeStyle=lit?'rgba(220,250,255,'+(.25+.45*al)+')':'rgba(120,170,220,'+(.06+.12*al)+')';g.lineWidth=lit?1.6:1.2;
      g.beginPath();g.arc(gx,gy,6*p.s,3.6,5.8);g.stroke()}}
  function drawFog(g,S,lit){S.fog.forEach(function(f,i){for(var k=0;k<4;k++){var ox=Math.cos(k*1.7+i)*f.r*.4+Math.sin(tG*.3+k)*6,oy=Math.sin(k*2.3+i)*f.r*.3,r=f.r*(.75+hash(k+i*7)*.3);
      var gr=g.createRadialGradient(f.x+ox,f.y+oy,0,f.x+ox,f.y+oy,r);gr.addColorStop(0,lit?'rgba(230,236,240,.42)':'rgba(120,140,160,.20)');gr.addColorStop(1,'rgba(120,140,160,0)');
      g.fillStyle=gr;g.beginPath();g.arc(f.x+ox,f.y+oy,r,0,7);g.fill()}})}
  function drawRocks(g,S,lit){var lv=S.lv;
    lv.rocks.forEach(function(r,i){var x=r[0],y=r[1],sh=lv._shapes[i],tall=r[3];
      /* 파도 거품 */
      var fa=.18+.12*Math.sin(tG*2+i);g.strokeStyle=lit?'rgba(240,252,255,'+(fa+.35)+')':'rgba(170,200,230,'+fa+')';g.lineWidth=lit?2.2:1.6;
      poly(g,x,y,sh,1.22+.05*Math.sin(tG*2.4+i));g.stroke();
      if(tall){ /* 바위섬: 옆면을 쌓아 높이를 보여준다 */
        g.fillStyle='rgba(0,0,0,.35)';poly(g,x+4,y+9,sh,1.08);g.fill();
        for(var k=9;k>=1;k-=2){g.fillStyle=lit?(k>5?'#39424d':'#4a5562'):(k>5?'#070c12':'#0d151e');poly(g,x,y+k-6,sh,1);g.fill()}
        var tg=g.createLinearGradient(x,y-r[2]-6,x,y+r[2]-6);
        if(lit){var B0=S.beams[0],la0=Math.atan2(B0.y-y,B0.x-x);tg=g.createRadialGradient(x+Math.cos(la0)*r[2]*.6,y-6+Math.sin(la0)*r[2]*.6,1,x,y-6,r[2]*1.2);tg.addColorStop(0,'#c3ccd6');tg.addColorStop(1,'#56616e')}
        else{tg.addColorStop(0,'#24323f');tg.addColorStop(1,'#16202b')}
        g.fillStyle=tg;poly(g,x,y-6,sh,1);g.fill();g.strokeStyle=lit?'rgba(255,255,255,.7)':'rgba(110,140,170,.4)';g.lineWidth=1.2;g.stroke();
        g.fillStyle=lit?'#6f8a5a':'#1a2a1c';g.beginPath();g.ellipse(x-2,y-8,r[2]*.35,r[2]*.22,0,0,7);g.fill();
        if(lit){var la1=Math.atan2(S.beams[0].y-y,S.beams[0].x-x);g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1.5;g.beginPath();g.arc(x,y-6,r[2]*.8,la1-.6,la1+.6);g.stroke()}
        return}
      if(!lit){g.fillStyle='#0c141d';poly(g,x,y,sh);g.fill();g.strokeStyle='rgba(60,90,120,.35)';g.lineWidth=1;g.stroke();return}
      /* 비춰진 바위: 젖은 하이라이트는 등대 쪽 면에만 */
      var B=S.beams[0],la=Math.atan2(B.y-y,B.x-x);
      var gr=g.createRadialGradient(x+Math.cos(la)*r[2]*.5,y+Math.sin(la)*r[2]*.5,1,x,y,r[2]*1.2);gr.addColorStop(0,'#8a95a3');gr.addColorStop(.6,'#4a5361');gr.addColorStop(1,'#272d36');
      g.fillStyle=gr;poly(g,x,y,sh);g.fill();
      g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=1.6;g.beginPath();g.arc(x,y,r[2]*.78,la-.7,la+.7);g.stroke();
      g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1;g.beginPath();g.arc(x+Math.cos(la)*2,y+Math.sin(la)*2,r[2]*.45,la-.5,la+.4);g.stroke();
      g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(x+Math.cos(la+.3)*r[2]*.55,y+Math.sin(la+.3)*r[2]*.55,1.4,0,7);g.fill()})}
  function drawWhales(g,S,lit){S.lv.whales.forEach(function(w,i){var ph=whalePhase(S,w),x=w[0],y=w[1];
      if(ph>WHALE_P-1.3){for(var k=0;k<5;k++){var bp=(ph*1.3+k*.21)%1;g.strokeStyle='rgba(190,230,255,'+(.5*(1-bp))+')';g.lineWidth=1.2;
          g.beginPath();g.arc(x+Math.sin(k*2.1)*10,y+Math.cos(k*1.3)*6,2+bp*4,0,7);g.stroke()}return}
      if(ph>=WHALE_UP)return;var e=Math.min(1,ph/.4,(WHALE_UP-ph)/.4);
      g.save();g.translate(x,y);g.scale(e,e);
      g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(2,4,24,13,0,0,7);g.fill();
      g.fillStyle=lit?'#5f7fa3':'#22344c';g.beginPath();g.ellipse(0,0,22,12,0,0,7);g.fill();
      g.fillStyle=lit?'#8fb0d0':'#2e4664';g.beginPath();g.ellipse(-3,-3,15,6,0,0,7);g.fill();
      g.fillStyle=lit?'#4d6b8e':'#1b2b40';g.beginPath();g.moveTo(-20,0);g.lineTo(-31,-8);g.quadraticCurveTo(-27,0,-31,8);g.closePath();g.fill();
      var bl=G.cat.blink<0;g.strokeStyle='#0b1420';g.fillStyle='#0b1420';g.lineWidth=1.3;
      if(bl){g.beginPath();g.moveTo(10,-2);g.lineTo(14,-2);g.stroke()}else{g.beginPath();g.arc(12,-2,1.8,0,7);g.fill()}
      g.fillStyle='rgba(255,140,160,.45)';g.beginPath();g.arc(14,3,2,0,7);g.fill();
      if(ph<1.2){for(var k2=0;k2<6;k2++){var sp=ph/1.2,ang=-1.57+(k2-2.5)*.25;g.fillStyle='rgba(210,240,255,'+(1-sp)*.8+')';
          g.beginPath();g.arc(6+Math.cos(ang)*sp*18,-6+Math.sin(ang)*sp*22,1.6,0,7);g.fill()}}
      g.restore()})}
  function landPath(g){g.beginPath();g.moveTo(-10,H+10);g.lineTo(-10,606);g.lineTo(52,602);g.quadraticCurveTo(62,598,66,610);g.lineTo(66,H+10);g.closePath();
    g.moveTo(128,H+10);g.lineTo(128,610);g.quadraticCurveTo(132,598,146,600);g.quadraticCurveTo(190,602,214,594);g.quadraticCurveTo(232,572,256,574);
    g.quadraticCurveTo(282,578,292,596);g.quadraticCurveTo(320,606,370,604);g.lineTo(370,H+10);g.closePath()}
  function headPath(g){g.beginPath();g.moveTo(-10,250);g.quadraticCurveTo(30,262,44,292);g.quadraticCurveTo(52,322,30,346);g.quadraticCurveTo(10,360,-10,356);g.closePath()}
  function drawLand(g,S,lit){
    g.fillStyle=lit?'#26342d':'#0a120f';landPath(g);g.fill();
    g.strokeStyle=lit?'rgba(230,255,240,.5)':'rgba(120,170,150,.22)';g.lineWidth=2;g.stroke();
    if(S.lv.two){g.fillStyle=lit?'#26342d':'#0a120f';headPath(g);g.fill();g.stroke()}
    if(!lit){g.fillStyle='#0c2236';g.fillRect(66,606,62,40)}
    /* 등대 바위 */
    g.fillStyle=lit?'#56606b':'#141c25';g.beginPath();g.ellipse(250,592,32,14,0,0,7);g.fill()}
  function drawHarbour(g,S,t){
    /* 항구 불빛 + 부두 */
    var gl=g.createRadialGradient(MOUTH.x,MOUTH.y+20,4,MOUTH.x,MOUTH.y+20,AMB_HB+10);gl.addColorStop(0,'rgba(255,200,110,.28)');gl.addColorStop(1,'rgba(255,200,110,0)');
    g.globalCompositeOperation='lighter';g.fillStyle=gl;g.beginPath();g.arc(MOUTH.x,MOUTH.y+20,AMB_HB+10,0,7);g.fill();g.globalCompositeOperation='source-over';
    g.fillStyle='#5a3d28';g.fillRect(58,598,12,4);g.fillRect(124,598,12,4);
    g.fillStyle='#7a5434';for(var p=0;p<3;p++){g.fillRect(70+p*20,616,3,24)}
    /* 집들 */
    var houses=[[8,612,20,16,'#3b2f3a'],[30,618,18,14,'#2f3747'],[150,612,22,16,'#40323a'],[176,618,18,13,'#2d3a3f']];
    houses.forEach(function(hs,i){var x=hs[0],y=hs[1],w=hs[2],h=hs[3];g.fillStyle=hs[4];g.fillRect(x,y,w,h);
      g.fillStyle='#1d1820';g.beginPath();g.moveTo(x-2,y);g.lineTo(x+w/2,y-8);g.lineTo(x+w+2,y);g.closePath();g.fill();
      var fl=.75+.25*Math.sin(t*3+i*1.7)*Math.sin(t*1.3+i);g.fillStyle='rgba(255,206,110,'+fl+')';g.fillRect(x+3,y+4,5,5);g.fillRect(x+w-8,y+4,5,5);
      g.globalCompositeOperation='lighter';var wg=g.createRadialGradient(x+w/2,y+6,1,x+w/2,y+6,16);wg.addColorStop(0,'rgba(255,190,90,.25)');wg.addColorStop(1,'rgba(255,190,90,0)');
      g.fillStyle=wg;g.beginPath();g.arc(x+w/2,y+6,16,0,7);g.fill();g.globalCompositeOperation='source-over'});
    /* 정박한 배 */
    var dk=S.boats.filter(function(b){return b.st==='docked'});
    dk.forEach(function(b,i){var x=76+(i%3)*18,y=626+Math.floor(i/3)*8;g.fillStyle=b.kind==='row'?'#9a6a3e':HULL[b.id%HULL.length];
      g.beginPath();g.ellipse(x,y+Math.sin(t*2+i)*.8,7,3.4,0,0,7);g.fill();g.fillStyle='#ffd27a';g.fillRect(x-2,y-2,3,2)});
    /* 도착 계수판 */
    var q=S.lv.quota,d=Math.min(q,S.docked);g.fillStyle='#5b3f27';g.fillRect(150,586,4,14);
    g.fillStyle='#e9d4ad';g.strokeStyle='#6b4a2c';g.lineWidth=2;g.beginPath();g.rect(132,568,44,20);g.fill();g.stroke();
    g.fillStyle='#3b2a1a';g.font='15px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('⚓ '+d+'/'+q,154,583)}
  function drawBoat(g,b,lit,S){
    var x=b.x,y=b.y,t=tG,col=b.kind==='row'?'#9a6a3e':HULL[b.id%HULL.length],al=b.st==='back'?.45:1;
    if(b.st==='docked')return;
    g.save();g.globalAlpha=al;
    /* 물살 */
    if(b.st==='sail'&&!lit){var wx=-Math.cos(b.h),wy=-Math.sin(b.h);g.strokeStyle='rgba(170,210,240,.16)';g.lineWidth=1.5;
      for(var k=1;k<=3;k++){var d=k*7+(t*20)%7;g.beginPath();g.moveTo(x+wx*d-wy*(3+k*2),y+wy*d+wx*(3+k*2));g.lineTo(x+wx*(d+4),y+wy*(d+4));g.lineTo(x+wx*d+wy*(3+k*2),y+wy*d-wx*(3+k*2));g.stroke()}}
    if(lit&&b.st==='sail'){var wx2=-Math.cos(b.h),wy2=-Math.sin(b.h);g.strokeStyle='rgba(240,255,255,.4)';g.lineWidth=1.4;
      for(var k3=1;k3<=3;k3++){var d3=k3*7+(t*20)%7;g.beginPath();g.moveTo(x+wx2*d3-wy2*(3+k3*2),y+wy2*d3+wx2*(3+k3*2));g.lineTo(x+wx2*(d3+4),y+wy2*(d3+4));g.lineTo(x+wx2*d3+wy2*(3+k3*2),y+wy2*d3-wx2*(3+k3*2));g.stroke()}}
    g.translate(x,y);g.scale(1.25,1.25);
    var bob=Math.sin(t*3+b.id)*.06;g.save();g.rotate(b.h+bob);
    g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(1,3,12,6,0,0,7);g.fill();
    if(b.kind==='row'){g.fillStyle=lit?'#c08a52':'#3a2a1c';g.beginPath();g.ellipse(0,0,9,5,0,0,7);g.fill();
      g.strokeStyle=lit?'#7a5232':'#22180f';g.lineWidth=1.5;g.stroke();
      var oa=Math.sin(t*5)*.5;g.strokeStyle=lit?'#e2c08a':'#4a3a26';g.lineWidth=1.6;
      g.beginPath();g.moveTo(-1,-4);g.lineTo(-1-Math.cos(oa)*6,-11);g.moveTo(-1,4);g.lineTo(-1-Math.cos(oa)*6,11);g.stroke()}
    else{g.fillStyle=lit?col:shade(col);g.beginPath();g.moveTo(13,0);g.quadraticCurveTo(8,-6.5,0,-6.5);g.lineTo(-11,-5.5);g.lineTo(-12,0);g.lineTo(-11,5.5);g.lineTo(0,6.5);g.quadraticCurveTo(8,6.5,13,0);g.fill();
      g.strokeStyle=lit?'rgba(255,255,255,.55)':'rgba(0,0,0,.4)';g.lineWidth=1.2;g.stroke();
      g.fillStyle=lit?'#f3ead8':'#2a2a30';g.fillRect(-7,-4,8,8);
      g.fillStyle='#ffcf6e';g.fillRect(-6,-3,2,2);g.fillRect(-6,1,2,2)}
    g.restore();
    /* 따뜻한 선실 불빛 */
    if(!lit){g.globalCompositeOperation='lighter';var cg=g.createRadialGradient(0,0,1,0,0,13);cg.addColorStop(0,'rgba(255,190,90,.35)');cg.addColorStop(1,'rgba(255,190,90,0)');
      g.fillStyle=cg;g.beginPath();g.arc(0,0,13,0,7);g.fill();g.globalCompositeOperation='source-over'}
    drawCaptain(g,b,lit);
    g.restore()}
  function shade(c){var n=parseInt(c.slice(1),16),r=(n>>16)*.38,gg=(n>>8&255)*.38,bb=(n&255)*.45;return 'rgb('+(r|0)+','+(gg|0)+','+(bb|0)+')'}
  function drawCaptain(g,b,lit){
    var row=b.kind==='row',y0=-7,t=tG;g.save();g.translate(0,y0);
    var skin=lit?'#ffd7ae':'#7a6656';g.fillStyle=skin;g.beginPath();g.arc(0,0,5.6,0,7);g.fill();
    if(row){g.fillStyle=lit?'#ffd23f':'#6b5a1c';g.beginPath();g.arc(0,-1,6.2,3.3,6.12);g.fill()}
    else{g.fillStyle=lit?'#22345a':'#141c2c';g.beginPath();g.arc(0,-2,5.8,3.2,6.22);g.fill();g.fillStyle=lit?'#fff':'#666';g.fillRect(-5.2,-3.2,10.4,1.6)}
    var ink=lit?'#2a1d18':'#d9cbbf';g.strokeStyle=ink;g.fillStyle=ink;g.lineWidth=1.2;
    var st=b.st==='dizzy'?'dizzy':b.st==='dock'||b.st==='docked'?'happy':b.sees?'happy':b.lit?'wow':'dark',blink=Math.sin(t*1.3+b.id*2.1)>.97;
    if(st==='dizzy'){for(var s=-1;s<=1;s+=2){g.beginPath();for(var k=0;k<10;k++){var a=k*.9+t*8,r=k*.22;g.lineTo(s*2.2+Math.cos(a)*r,.5+Math.sin(a)*r)}g.stroke()}
      for(var k2=0;k2<3;k2++){var a2=t*4+k2*2.1;g.fillStyle='#ffe066';g.font='7px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('★',Math.cos(a2)*9,-7+Math.sin(a2)*3)}}
    else if(st==='happy'){g.beginPath();g.arc(-2.2,1,1.4,3.4,6);g.stroke();g.beginPath();g.arc(2.2,1,1.4,3.4,6);g.stroke();g.beginPath();g.arc(0,2.4,1.6,.2,2.9);g.stroke()}
    else if(st==='wow'){g.beginPath();g.arc(-2.2,.6,1.3,0,7);g.arc(2.2,.6,1.3,0,7);g.fill();g.beginPath();g.arc(0,3.2,.9,0,7);g.stroke()}
    else{if(blink){g.beginPath();g.moveTo(-3.2,.8);g.lineTo(-1.2,.8);g.moveTo(1.2,.8);g.lineTo(3.2,.8);g.stroke()}
      else{g.beginPath();g.arc(-2.2,.8,.9,0,7);g.arc(2.2,.8,.9,0,7);g.fill()}
      g.beginPath();g.moveTo(-1.5,3.4);g.quadraticCurveTo(0,2.6,1.5,3.4);g.stroke();
      if(row){g.fillStyle='rgba(140,200,255,.9)';g.beginPath();g.arc(-3.4,2.6+((t*2)%1)*2,.9,0,7);g.fill()}}
    g.restore()}

  function drawCat(g,x,y,look,mood,binoc){
    var t=tG,bl=G.cat.blink<0;g.save();g.translate(x,y);
    var bob=mood===1?-Math.abs(Math.sin(t*10))*2:0;g.translate(0,bob);
    /* 꼬리 */
    g.strokeStyle='#e08a3c';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(5,9);g.quadraticCurveTo(14,8+Math.sin(t*2)*3,12,-2);g.stroke();
    /* 몸 */
    g.fillStyle='#f4a24f';g.beginPath();g.ellipse(0,7,7,6,0,0,7);g.fill();
    g.fillStyle='#ffe2bf';g.beginPath();g.ellipse(0,9,4,3.5,0,0,7);g.fill();
    /* 비옷 목도리 */
    g.fillStyle='#ffd23f';g.beginPath();g.ellipse(0,2.5,6.5,2.4,0,0,7);g.fill();
    /* 머리 */
    g.fillStyle='#f4a24f';g.beginPath();g.arc(0,-4,7.4,0,7);g.fill();
    g.beginPath();g.moveTo(-6.5,-7);g.lineTo(-5.5,-14);g.lineTo(-1.5,-10);g.closePath();g.moveTo(6.5,-7);g.lineTo(5.5,-14);g.lineTo(1.5,-10);g.closePath();g.fill();
    g.fillStyle='#ffb0a8';g.beginPath();g.moveTo(-5.4,-8.5);g.lineTo(-5,-12);g.lineTo(-3,-10);g.closePath();g.moveTo(5.4,-8.5);g.lineTo(5,-12);g.lineTo(3,-10);g.closePath();g.fill();
    g.strokeStyle='#c96a22';g.lineWidth=1.2;g.beginPath();g.moveTo(-2,-11);g.lineTo(-1.5,-8.5);g.moveTo(2,-11);g.lineTo(1.5,-8.5);g.stroke();
    g.fillStyle='rgba(255,120,120,.4)';g.beginPath();g.arc(-4.4,-2,1.6,0,7);g.arc(4.4,-2,1.6,0,7);g.fill();
    var lx=Math.cos(look)*1.3,ly=Math.sin(look)*1.1;g.fillStyle='#2b1a12';g.strokeStyle='#2b1a12';g.lineWidth=1.3;
    if(binoc&&mood===0){ /* 쌍안경 */
      g.save();g.translate(lx*1.4,-4.5+ly);g.fillStyle='#2f3542';g.beginPath();g.arc(-2.4,0,2.6,0,7);g.arc(2.4,0,2.6,0,7);g.fill();
      g.fillStyle='#9ad7ff';g.beginPath();g.arc(-2.4+lx,ly*.6,1.2,0,7);g.arc(2.4+lx,ly*.6,1.2,0,7);g.fill();
      g.fillStyle='#f4a24f';g.beginPath();g.arc(-5,3,1.8,0,7);g.arc(5,3,1.8,0,7);g.fill();g.restore()}
    else if(mood===1){g.beginPath();g.arc(-2.6,-4,1.7,3.4,6);g.stroke();g.beginPath();g.arc(2.6,-4,1.7,3.4,6);g.stroke()}
    else if(mood===2){g.fillStyle='#fff';g.beginPath();g.arc(-2.6,-4.4,2.2,0,7);g.arc(2.6,-4.4,2.2,0,7);g.fill();g.fillStyle='#2b1a12';g.beginPath();g.arc(-2.6,-4.4,1,0,7);g.arc(2.6,-4.4,1,0,7);g.fill()}
    else if(bl){g.beginPath();g.moveTo(-4,-4);g.lineTo(-1.4,-4);g.moveTo(1.4,-4);g.lineTo(4,-4);g.stroke()}
    else{g.beginPath();g.arc(-2.6+lx,-4.2+ly,1.4,0,7);g.arc(2.6+lx,-4.2+ly,1.4,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(-2.2+lx,-4.7+ly,.5,0,7);g.arc(3+lx,-4.7+ly,.5,0,7);g.fill()}
    g.fillStyle='#d9576a';g.beginPath();g.arc(0,-1.6,.9,0,7);g.fill();
    g.strokeStyle='#2b1a12';g.lineWidth=1;g.beginPath();if(mood===2){g.arc(0,.6,1.3,0,7)}else{g.arc(-1,-.8,1,.3,2.6);g.arc(1,-.8,1,.5,2.8)}g.stroke();
    if(mood===1){g.fillStyle='#f4a24f';g.beginPath();g.ellipse(-8,-6+Math.sin(t*14)*2,2,3,.4,0,7);g.fill()}
    g.restore()}
  function drawLighthouse(g,S,B,i){
    var x=B.x,y=B.y,t=tG,sc=i?.78:1;g.save();g.translate(x,y);g.scale(sc,sc);
    /* 탑 */
    var tw=g.createLinearGradient(-12,0,12,0);tw.addColorStop(0,'#cfd4da');tw.addColorStop(.45,'#ffffff');tw.addColorStop(1,'#9aa2ad');
    g.fillStyle=tw;g.beginPath();g.moveTo(-7,6);g.lineTo(7,6);g.lineTo(12,44);g.lineTo(-12,44);g.closePath();g.fill();
    g.save();g.clip();g.fillStyle='#d9473f';for(var k=0;k<3;k++){g.fillRect(-14,10+k*12,28,6)}
    g.fillStyle='rgba(0,0,0,.18)';g.fillRect(4,0,10,46);g.restore();
    g.fillStyle='#ffd77a';g.fillRect(-2,28,4,6);
    /* 난간 + 등실 */
    g.fillStyle='#2b2f3a';g.fillRect(-11,4,22,3);
    g.fillStyle='#39404d';g.fillRect(-7,-9,14,13);
    var oil=B.oil,lamp=.55+.45*oil;g.fillStyle='rgba(255,236,170,'+lamp+')';g.fillRect(-5.5,-7.5,11,10);
    g.fillStyle='#d9473f';g.beginPath();g.moveTo(-9,-9);g.quadraticCurveTo(0,-19,9,-9);g.closePath();g.fill();
    g.fillStyle='#2b2f3a';g.fillRect(-1,-21,2,4);
    g.restore();
    /* 등불 후광 */
    g.globalCompositeOperation='lighter';var r=26+6*B.oil+(B.flashT>0?30:0),gl=g.createRadialGradient(x,y,1,x,y,r);
    gl.addColorStop(0,'rgba(255,240,190,.9)');gl.addColorStop(.3,'rgba(255,210,120,.35)');gl.addColorStop(1,'rgba(255,200,100,0)');
    g.fillStyle=gl;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.globalCompositeOperation='source-over';
    if(i===0)drawCat(g,x+19,y-1,B.a,G.cat.mood,tG-G.lastDrag<.6);
    /* 기름 게이지 */
    var gx=i?x+18:x-24,gy=y+12,gh=30;g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.rect(gx-3.5,gy-1,7,gh+2);g.fill();
    var oc=oil<.3?'#ff7a5c':oil<.6?'#ffc65c':'#ffe9a0';g.fillStyle=oc;g.fillRect(gx-2.5,gy+gh*(1-oil),5,gh*oil);
    g.fillStyle=oc;g.beginPath();g.moveTo(gx,gy-9);g.quadraticCurveTo(gx+4,gy-4,gx,gy-2);g.quadraticCurveTo(gx-4,gy-4,gx,gy-9);g.fill();
    if(B.still>1&&oil<.98&&Math.sin(t*10)>0){g.fillStyle='#ffb26b';g.font='10px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('↻',gx,gy+gh+12)}}

  function drawLightLayer(g,S,a){
    var all=S.lightT>0,polys=[];
    S.beams.forEach(function(B){var rch=REACH*(.35+.65*B.oil);polys.push({B:B,p:beamPoly(S,B,HALF,rch,44),rch:rch});
      if(B.flashT>0)polys.push({B:B,p:circlePoly(S,B,FLASHR,72),rch:FLASHR,flash:1})});
    g.save();
    if(!all){g.beginPath();polys.forEach(function(P){pathPts(g,P.p)});
      g.clip()}
    drawSea(g,true);drawFog(g,S,true);drawRocks(g,S,true);drawWhales(g,S,true);drawLand(g,S,true);
    S.boats.forEach(function(b){drawBoat(g,b,true,S)});
    g.restore();
    /* 항구 불빛·등대 발치 불빛 안의 배는 따로 밝게 */
    if(!all)S.boats.forEach(function(b){if(b.st==='docked')return;var near=Math.hypot(b.x-MOUTH.x,b.y-MOUTH.y)<AMB_HB||S.beams.some(function(B){return Math.hypot(b.x-B.x,b.y-B.y)<AMB_LH});
      if(near&&!inPolys(polys,b.x,b.y))drawBoat(g,b,true,S)});
    /* 부피감 있는 빛줄기 */
    g.save();g.globalCompositeOperation='lighter';
    polys.forEach(function(P){var B=P.B;
      if(P.flash){var fa=B.flashT/FLASHT,fg=g.createRadialGradient(B.x,B.y,10,B.x,B.y,FLASHR);fg.addColorStop(0,'rgba(255,245,210,'+(.5*fa)+')');fg.addColorStop(1,'rgba(255,240,200,0)');
        g.fillStyle=fg;g.beginPath();pathPts(g,P.p);g.fill();return}
      var bg=g.createRadialGradient(B.x,B.y,6,B.x,B.y,P.rch*1.02);bg.addColorStop(0,'rgba(255,244,200,.42)');bg.addColorStop(.35,'rgba(255,232,170,.16)');bg.addColorStop(1,'rgba(255,225,160,0)');
      g.fillStyle=bg;g.beginPath();pathPts(g,P.p);g.fill();
      var soft=beamPoly(S,B,HALF*1.2,P.rch,30),sg=g.createRadialGradient(B.x,B.y,6,B.x,B.y,P.rch);sg.addColorStop(0,'rgba(255,240,200,.12)');sg.addColorStop(1,'rgba(255,240,200,0)');
      g.fillStyle=sg;g.beginPath();pathPts(g,soft);g.fill();
      var core=beamPoly(S,B,HALF*.35,P.rch,12),cg=g.createRadialGradient(B.x,B.y,4,B.x,B.y,P.rch*.8);cg.addColorStop(0,'rgba(255,250,225,.35)');cg.addColorStop(1,'rgba(255,250,225,0)');
      g.fillStyle=cg;g.beginPath();pathPts(g,core);g.fill();
      /* 빛 속의 빗줄기 */
      g.strokeStyle='rgba(255,250,230,.18)';g.lineWidth=1;g.beginPath();
      for(var k=0;k<26;k++){var d=40+hash(k*7)*P.rch*.9,an=B.a+(hash(k*13)-.5)*2*HALF,yy=(d+tG*380+hash(k)*200)%P.rch;
        var px=B.x+Math.cos(an)*yy,py=B.y+Math.sin(an)*yy;if(rayEnd(S,B,an,P.rch)<yy)continue;g.moveTo(px,py);g.lineTo(px-2,py+9)}g.stroke()});
    g.restore()}

  function drawBolt(g){if(!G.bolt)return;var b=G.bolt,al=1-b.t/.5;g.strokeStyle='rgba(230,240,255,'+al+')';g.lineWidth=2.2;g.beginPath();
    var x=b.x,y=30;g.moveTo(x,y);for(var k=0;k<7;k++){x+=(hash(b.seed+k)-.5)*26;y+=14;g.lineTo(x,y)}g.stroke();
    g.fillStyle='rgba(200,215,255,'+(al*.18)+')';g.fillRect(0,0,W,H)}

  function draw(g,a,dt){
    var S=G&&G.S,ko=a.lang==='ko',t=tG,i;
    if(!S){drawSea(g,false);return}
    drawSea(g,false);drawFog(g,S,false);drawRocks(g,S,false);drawWhales(g,S,false);drawLand(g,S,false);
    S.boats.forEach(function(b){drawBoat(g,b,false,S)});
    drawLightLayer(g,S,a);drawHarbour(g,S,t);
    /* 위험 표시: 어둠 속 배의 진로 */
    var obs=obstacles(S);
    S.boats.forEach(function(b){if(b.st!=='sail'||b.sees||b.x<-2||b.x>W+2||b.y<-2)return;
      var ttc=timeToHit(S,b,obs,3),vx=Math.cos(b.h),vy=Math.sin(b.h),len=ttc<3?ttc*b.v:44,danger=ttc<2.6;
      g.setLineDash([3,5]);g.lineDashOffset=-t*16;g.strokeStyle=danger?'rgba(255,110,90,.75)':'rgba(200,220,255,.22)';g.lineWidth=1.5;
      g.beginPath();g.moveTo(b.x+vx*12,b.y+vy*12);g.lineTo(b.x+vx*Math.max(14,len),b.y+vy*Math.max(14,len));g.stroke();g.setLineDash([]);
      if(danger){var pu=1+.15*Math.sin(t*14),bx=b.x+10,by=b.y-22;g.fillStyle='#ff5a4a';g.beginPath();g.arc(bx,by,7*pu,0,7);g.fill();
        g.beginPath();g.moveTo(bx-3,by+5);g.lineTo(bx-6,by+10);g.lineTo(bx+1,by+6);g.fill();
        g.fillStyle='#fff';g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('!',bx,by+4)}
      if(b.lit){g.strokeStyle='rgba(255,240,170,.95)';g.lineWidth=2;g.beginPath();g.arc(b.x,b.y,15,-1.57,-1.57+6.283*Math.min(1,b.litT/SEE));g.stroke()}
      if(b.kind==='row'&&!b.lit&&b.darkT>0){var left=1-b.darkT/ROW_LOST;g.strokeStyle='rgba(140,200,255,.9)';g.lineWidth=2.4;g.beginPath();g.arc(b.x,b.y,15,-1.57,-1.57+6.283*left);g.stroke()}});
    /* 비 */
    g.strokeStyle='rgba(170,200,235,.22)';g.lineWidth=1;g.beginPath();
    for(i=0;i<rain.length;i++){var r=rain[i],ry=(r.y+t*r.v)%(H+20)-10,rx=(r.x-t*r.v*.18)%(W+20);if(rx<-10)rx+=W+20;g.moveTo(rx,ry);g.lineTo(rx-r.l*.2,ry+r.l)}g.stroke();
    drawBolt(g);
    if(S.lightT>0){g.fillStyle='rgba(220,230,255,'+(S.lightT/.4*.22)+')';g.fillRect(0,0,W,H)}
    S.beams.forEach(function(B,bi){drawLighthouse(g,S,B,bi)});
    G.flashRing.forEach(function(f){g.strokeStyle='rgba(255,245,200,'+(1-f.t/.7)+')';g.lineWidth=3;g.beginPath();g.arc(f.x,f.y,20+f.t/.7*FLASHR,0,7);g.stroke()});
    if(S.beams.length>1){var AB=S.beams[G.active];g.strokeStyle='rgba(255,230,140,'+(.5+.4*Math.sin(t*6))+')';g.lineWidth=2;g.setLineDash([4,4]);
      g.beginPath();g.arc(AB.x,AB.y,17,0,7);g.stroke();g.setLineDash([])}
    /* 상단 띠 */
    var bar=g.createLinearGradient(0,30,0,58);bar.addColorStop(0,'rgba(0,0,0,.45)');bar.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=bar;g.fillRect(0,30,W,28);
    g.font='16px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='#ffe7a8';g.fillText((ko?'🌙 밤 ':'🌙 Night ')+(G.n+1),12,50);
    for(i=0;i<LIVES;i++){var lx=W/2-22+i*22,on=i<S.lives;g.lineWidth=3.4;g.strokeStyle=on?'#ffffff':'rgba(255,255,255,.18)';g.beginPath();g.arc(lx,44,6.5,0,7);g.stroke();
      if(on){g.strokeStyle='#ef4b3f';for(var q=0;q<4;q++){g.beginPath();g.arc(lx,44,6.5,q*1.57+.2,q*1.57+.75);g.stroke()}}}
    var tw=Math.ceil(G.time),low=G.time<10;g.textAlign='right';g.font=(low?18+Math.sin(t*12)*1.5:17)+'px Jua, system-ui, sans-serif';
    g.fillStyle=low?'#ff7a6a':'#e8f2ff';g.fillText('⏱ '+tw,W-12,50);
    /* 힌트 / 배너 */
    if(S.lv.hint&&S.t<9&&G.phase==='play'){var tx=S.lv.hint[ko?'ko':'en'];g.font='16px Jua, system-ui, sans-serif';var wd=g.measureText(tx).width+26,al=Math.min(1,(9-S.t)/1.2);
      g.globalAlpha=al;g.fillStyle='rgba(10,20,36,.72)';rr(g,W/2-wd/2,66,wd,28,14);g.fill();g.strokeStyle='rgba(255,226,140,.6)';g.lineWidth=1.4;g.stroke();
      g.fillStyle='#ffe7a8';g.textAlign='center';g.fillText(tx,W/2,86);g.globalAlpha=1}
    if(G.n===4&&S.t<9&&G.phase==='play'){var B0=S.beams[0];g.strokeStyle='rgba(255,240,170,'+(.4+.4*Math.sin(t*8))+')';g.lineWidth=2;g.beginPath();g.arc(B0.x,B0.y+16,30,0,7);g.stroke()}
    if(G.banner>0&&G.phase==='play'){var ba=Math.min(1,G.banner/.5,(2.2-G.banner)/.3);g.globalAlpha=ba;g.textAlign='center';
      g.font='34px Jua, system-ui, sans-serif';g.fillStyle='rgba(0,0,0,.4)';g.fillText((ko?'밤 ':'Night ')+(G.n+1),W/2+2,232);g.fillStyle='#fff0c2';g.fillText((ko?'밤 ':'Night ')+(G.n+1),W/2,230);
      g.font='14px Jua, system-ui, sans-serif';g.fillStyle='#cfe3ff';g.fillText((ko?'배 ':'Boats ')+S.lv.quota+(ko?'척을 항구로':' to harbour'),W/2,254);g.globalAlpha=1}
    if(G.phase!=='play'){var cl=G.phase==='clear',pa=Math.min(1,G.pt/.25);g.globalAlpha=pa;g.fillStyle='rgba(5,10,22,.5)';g.fillRect(0,200,W,84);
      g.textAlign='center';g.font='28px Jua, system-ui, sans-serif';g.fillStyle=cl?'#ffe08a':'#ff9a8a';
      g.fillText(cl?(ko?'모두 무사히 도착!':'Everyone made it home!'):(ko?'구명튜브가 바닥났어요':'Out of lifebuoys'),W/2,238);
      g.font='16px Jua, system-ui, sans-serif';g.fillStyle='#e8f2ff';g.fillText(cl?(ko?'시간 +'+T_ADD+'초':'+'+T_ADD+'s'):(ko?'이 밤을 다시 · 시간 −'+T_FAIL+'초':'Retry this night · −'+T_FAIL+'s'),W/2,266);g.globalAlpha=1}
    if(kUsed&&G.n<2&&G.phase==='play'){g.font='12px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle='rgba(220,235,255,.7)';
      g.fillText(ko?'←→ 빛 돌리기 · 스페이스 번쩍'+(S.beams.length>1?' · ↓ 등대 전환':''):'←→ turn beam · Space flash'+(S.beams.length>1?' · ↓ switch':''),W/2,108)}
  }
  function inPolys(polys,x,y){for(var k=0;k<polys.length;k++)if(pip(polys[k].p,x,y))return true;return false}
  function pip(p,x,y){var c=false;for(var i=0,j=p.length-1;i<p.length;j=i++){if((p[i][1]>y)!==(p[j][1]>y)&&x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0])c=!c}return c}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

  if(/[?&]lhdebug/.test(location.search))window.__lhT=function(){return {n:G.n,time:+G.time.toFixed(1),lives:G.S.lives,ph:G.phase,a:+G.S.beams[0].a.toFixed(2),boats:G.S.boats.map(function(b){return b.st+(b.x|0)+','+(b.y|0)}).join(' ')}};
  if(/[?&]lhdebug/.test(location.search)){window.__lhOil=function(){return +G.S.beams[0].oil.toFixed(2)};window.__lhBeams=function(){return G.S.beams.map(function(B){return +B.a.toFixed(2)}).concat(['active',G.active])}}
  if(/[?&]lhdebug/.test(location.search))window.__lhJump=function(n,auto){window.__lhAuto=auto;startNight(n);G.time=70};
  if(/[?&]lhdebug/.test(location.search))window.__lh=function(){var S=G.S,c=bot(S,1/60),B=S.beams[0],ta=c.beams[0].ta,o=obstacles(S),shot=false;
    var lit=S.boats.filter(function(b){return b.st==='sail'&&b.sees&&o.some(function(q){return q.rock&&Math.hypot(q.x-b.x,q.y-b.y)<q.r+38})});
    var dark=S.boats.filter(function(b){return b.st==='sail'&&!b.lit&&b.x>10&&b.x<W-10&&b.y>60});
    shot=lit.length>0&&dark.length>0&&S.lightT<=0;
    return {n:G.n,over:!window.__sg.state().playing,shot:shot,target:ta==null?null:[B.x+Math.cos(ta)*170,B.y+Math.sin(ta)*170]}};
  SG.run({id:'lighthouse',title:{ko:'폭풍의 등대지기',en:'Storm Lighthouse'},
    how:{ko:'끌어서 등대 빛을 돌려요. 빛을 받은 배만 바위를 보고 피해 가요. 등대를 톡 치면 번쩍!',en:'Drag to swing the lighthouse beam. Only boats in the light can see the rocks. Tap the lighthouse to flash!'},
    init:init,update:update,draw:draw});
})();
