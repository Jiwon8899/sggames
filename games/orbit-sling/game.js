/* 궤도 슬링 (Orbit Sling) — 누르는 동안에만 중력이 켜진다. 가장 가까운 행성이 꼬마 혜성을 붙잡아 돌리고,
   손을 떼면 접선으로 날아간다. 시뮬레이션은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,V=165,DT=1/120,DEC=Math.exp(-8*DT),TOL=7*Math.PI/180,GR=32,CR=8,TAU=Math.PI*2;

  function rng(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=Math.imul(s^s>>>15,1|s);
    t=(t+Math.imul(t^t>>>7,61|t))^t;return((t^t>>>14)>>>0)/4294967296}}
  function rot(d,a){var c=Math.cos(a),s=Math.sin(a);return [d[0]*c-d[1]*s,d[0]*s+d[1]*c]}

  /* ---------- 스테이지 정의 ----------
     hops:[직진 거리, 궤도 반지름, 행성이 놓이는 쪽(+1 오른쪽/-1 왼쪽), 도는 각도(도), 행성 반지름?]
     haz : ['belt',광선,거리,틈 반폭,왼쪽 개수,오른쪽 개수] ['ast',광선,거리,옆,반지름] ['sat',행성,반지름,각속도,위상]
           ['hole',광선,거리,옆,세기] ['rep',광선,거리,옆] ['decoy',광선,거리,옆]   (옆: + 는 진행 방향의 오른쪽) */
  var HAND=[
    {hops:[[230,70,1,90]],gate:120,lk:0},
    {hops:[[190,70,-1,90],[115,60,1,90]],gate:150,lk:1,tip:{ko:'행성에서 행성으로 이어 가요',en:'Swing from planet to planet'}},
    {hops:[[170,48,1,62],[150,62,-1,105]],gate:170,lk:3,tip:{ko:'가까이 붙잡을수록 빨리 돌아요',en:'Grab closer to spin faster'}},
    {hops:[[160,60,1,40],[200,56,-1,65]],gate:165,lk:0,haz:[['belt',1,105,34,2,2]],tip:{ko:'운석 사이 틈을 노려요',en:'Thread the gap in the asteroids'}},
    {hops:[[175,62,1,40],[165,58,-1,115]],gate:180,lk:2,haz:[['sat',1,92,1.25,1]],tip:{ko:'위성이 지나간 뒤에!',en:'Wait for the satellite to pass'}},
    {hops:[[175,60,1,55],[215,58,-1,100]],gate:160,lk:4,haz:[['rep',1,80,-58],['rep',2,60,70]],tip:{ko:'빨간 행성은 밀어내요',en:'Red planets push you away'}},
    {hops:[[175,64,1,40],[140,60,-1,115]],gate:180,lk:1,haz:[['hole',2,90,-85,120]],tip:{ko:'블랙홀은 항상 끌어당겨요',en:'The black hole always pulls'}},
    {hops:[[175,56,1,335],[190,60,1,70]],gate:180,lk:3,haz:[['belt',1,90,34,1,2],['ast',0,300,0,12]],tip:{ko:'한 바퀴 크게 돌아서!',en:'Go the long way round'}},
    {hops:[[150,52,-1,40],[190,56,1,130],[190,52,-1,115]],gate:160,lk:2,haz:[['sat',1,88,-1.4,2],['belt',2,85,34,2,1],['rep',1,70,60]],tip:{ko:'침착하게, 한 번에 하나씩',en:'Stay calm, one swing at a time'}},
    {hops:[[175,58,-1,55],[215,54,1,130],[215,58,-1,115]],gate:180,lk:0,haz:[['hole',2,95,-100,75],['sat',0,90,1.3,2.5],['belt',1,100,34,2,2],['belt',3,95,36,2,2]],tip:{ko:'전부 다 나와요!',en:'Everything at once!'}}
  ];

  function adv(O,D,h){var L=h[0],rho=h[1],sd=h[2],sw=h[3]*Math.PI/180,C=[O[0]+D[0]*L,O[1]+D[1]*L],
      P=[C[0]-sd*rho*D[1],C[1]+sd*rho*D[0]],a0=Math.atan2(C[1]-P[1],C[0]-P[0]),a1=a0+sd*sw;
    return {C:C,P:P,a0:a0,sw:sw,O:[P[0]+rho*Math.cos(a1),P[1]+rho*Math.sin(a1)],D:rot(D,sd*sw)}}

  function build(spec,sx,sy){
    var st={sx:sx,sy:sy,planets:[],route:[],ast:[],holes:[],sats:[],dust:[],tip:spec.tip||null,ok:true,path:[]},
        O=[sx,sy],D=[0,-1],rays=[],lk=spec.lk||0,t,j;
    function seg(o,d,l){for(var q=0;q<l;q+=6)st.path.push([o[0]+d[0]*q,o[1]+d[1]*q])}
    spec.hops.forEach(function(h){var q=adv(O,D,h),rho=h[1],R=h[4]||Math.round(Math.max(17,Math.min(30,rho-28)));
      rays.push({o:O,d:D,l:h[0]});seg(O,D,h[0]);
      for(t=0;t<q.sw;t+=6/rho)st.path.push([q.P[0]+rho*Math.cos(q.a0+h[2]*t),q.P[1]+rho*Math.sin(q.a0+h[2]*t)]);
      st.route.push(st.planets.length);
      st.planets.push({x:q.P[0],y:q.P[1],R:R,o:rho,sd:h[2],range:Math.min(140,Math.max(rho+30,R+78)),kind:0,look:lk++});
      O=q.O;D=q.D});
    rays.push({o:O,d:D,l:spec.gate});seg(O,D,spec.gate);
    st.gate={x:O[0]+D[0]*spec.gate,y:O[1]+D[1]*spec.gate};
    function pt(i,dist,lat){var r=rays[Math.min(i,rays.length-1)];return [r.o[0]+r.d[0]*dist-r.d[1]*lat,r.o[1]+r.d[1]*dist+r.d[0]*lat]}
    function clear(c,rad){for(var i=0;i<st.route.length;i++){var p=st.planets[i],d=Math.hypot(c[0]-p.x,c[1]-p.y);
        if(d<p.R+rad+10||Math.abs(d-p.o)<rad+14)return false}
      return Math.hypot(c[0]-st.gate.x,c[1]-st.gate.y)>GR+rad+14}
    function rock(c,r){if(c[0]>-14&&c[0]<W+14&&clear(c,r))st.ast.push({x:c[0],y:c[1],r:r})}
    (spec.haz||[]).forEach(function(z){var k=z[0],c,p;
      if(k==='ast')rock(pt(z[1],z[2],z[3]),z[4]||12);
      else if(k==='belt'){for(j=0;j<z[4];j++)rock(pt(z[1],z[2],-(z[3]+13+j*25)),12-(j%2));for(j=0;j<z[5];j++)rock(pt(z[1],z[2],z[3]+13+j*25),11+(j%2))}
      else if(k==='hole'){c=pt(z[1],z[2],z[3]);if(clear(c,10))st.holes.push({x:c[0],y:c[1],core:13,range:135,pull:z[4]})}
      else if(k==='sat'){p=st.planets[z[1]];if(p)st.sats.push({cx:p.x,cy:p.y,r:z[2],w:z[3],ph:z[4]||0,sz:7})}
      else{c=pt(z[1],z[2],z[3]);if(clear(c,26)&&c[0]>24&&c[0]<W-24)
        st.planets.push({x:c[0],y:c[1],R:16,o:0,sd:1,range:k==='rep'?82:88,kind:k==='rep'?1:0,look:lk++})}});
    var lo=sy,hi=st.gate.y;
    st.path.forEach(function(q,i){if(q[0]<20||q[0]>W-20)st.ok=false;if(q[1]>lo)lo=q[1];if(q[1]<hi)hi=q[1];
      if(i>=8&&i%8===0&&Math.hypot(q[0]-st.gate.x,q[1]-st.gate.y)>44)st.dust.push({x:q[0],y:q[1]})});
    st.planets.forEach(function(p){if(p.x-p.R<6||p.x+p.R>W-6)st.ok=false});
    if(st.gate.x<40||st.gate.x>W-40||st.gate.y>sy-150||lo>sy+90)st.ok=false;
    st.low=lo;st.high=hi;return st}

  /* ---------- 절차 생성: 경로를 먼저 만들고 그 위에 행성을 놓은 뒤 봇으로 검증 ---------- */
  function genSpec(rd,d,sx,sy,simple){
    var nh=2+(d>2&&rd()<.6?1:0)+(d>10&&rd()<.4?1:0),hops=[],O=[sx,sy],D=[0,-1],Ps=[],i,t,q,gl=0,G;
    for(i=0;i<nh;i++){var ok=null;
      for(t=0;t<40&&!ok;t++){var L=(i?105:150)+rd()*95,rho=44+rd()*40,sd=rd()<.5?1:-1,h0=Math.atan2(D[0],-D[1]),
            sw=sd*((rd()*2-1)*1.1-h0);sw=((sw%TAU)+TAU)%TAU;
        if(sw<.7||sw>5.3)continue;
        var h=[Math.round(L),Math.round(rho),sd,Math.round(sw*180/Math.PI)];q=adv(O,D,h);
        if(q.P[0]-rho<20||q.P[0]+rho>W-20||q.C[0]<22||q.C[0]>W-22)continue;
        var fx=q.O[0]+q.D[0]*140;if(fx<40||fx>W-40)continue;
        if(Ps.some(function(p){return Math.hypot(p[0]-q.P[0],p[1]-q.P[1])<128}))continue;
        ok=h}
      if(!ok)return null;hops.push(ok);q=adv(O,D,ok);Ps.push(q.P);O=q.O;D=q.D}
    for(t=0;t<20;t++){gl=Math.round(125+rd()*80);G=[O[0]+D[0]*gl,O[1]+D[1]*gl];
      if(G[0]>45&&G[0]<W-45&&Math.abs(G[0]-sx)>45&&G[1]<sy-260)break;gl=0}
    if(!gl)return null;
    var haz=[],nr=nh+1;function len(i){return i<nh?hops[i][0]:gl}
    if(!simple){
      if(rd()<.75){i=1+Math.floor(rd()*(nr-1));if(len(i)>120)haz.push(['belt',i,Math.round(len(i)*(.4+rd()*.25)),Math.round(31+rd()*8),1+Math.floor(rd()*3),1+Math.floor(rd()*3)])}
      if(rd()<Math.min(.7,.3+d*.03)){i=Math.floor(rd()*nh);haz.push(['sat',i,Math.round(hops[i][1]+24+rd()*14),(rd()<.5?1:-1)*(1+rd()*.7),rd()*TAU])}
      if(d>3&&rd()<.4){i=Math.floor(rd()*nr);haz.push(['hole',i,Math.round(len(i)*.5),(rd()<.5?1:-1)*Math.round(88+rd()*32),45+rd()*40])}
      if(d>1&&rd()<.45){i=Math.floor(rd()*nh);haz.push(['rep',i,Math.round(hops[i][0]*(.45+rd()*.2)),(rd()<.5?1:-1)*Math.round(54+rd()*20)])}
    }
    return {hops:hops,gate:gl,haz:haz,lk:Math.floor(rd()*5)}}

  function gen(n,sx,sy){
    for(var a=0;a<90;a++){var spec=genSpec(rng(n*7919+a*104729+17),n-HAND.length,sx,sy,a>=60);if(!spec)continue;
      var st=build(spec,sx,sy);st.n=n;st.tries=a;
      if(st.ok&&botPlay(st,24)>0&&!idleWins(st))return st}
    var sd=sx<180?1:-1,fb=build({hops:[[190,60,sd,40]],gate:150},sx,sy);fb.fallback=true;return fb}

  var cache=[];
  function getStage(n){if(cache[n])return cache[n];var sx=110,sy=0,st;
    if(n>0){var p=getStage(n-1);sx=p.gate.x;sy=p.gate.y}
    st=n<HAND.length?build(HAND[n],sx,sy):gen(n,sx,sy);st.n=n;return cache[n]=st}

  /* ---------- 시뮬레이션 ---------- */
  function ev(r,k,v){if(!r.quiet)r.ev.push({k:k,x:r.x,y:r.y,v:v||0})}
  function enter(r){var s=r.st;r.x=s.sx;r.y=s.sy;r.vx=0;r.vy=-V;r.te=-1;r.ck=null;r.t=0;r.got=[];r.freeze=0;r.last=-1;r.swing=0;
    r.rr=0;r.th=0;r.vr=0;r.sd=1;r.push=-1;r.done=false;return r}
  function mkRun(st){return enter({st:st,n:st.n|0,lives:3,time:45,chain:0,over:false,ev:[],score:0,solo:true,quiet:true})}
  function newRun(){return enter({st:getStage(0),n:0,lives:3,time:45,chain:0,over:false,ev:[],score:0,solo:false,quiet:false})}
  function clone(r){var c={},k;for(k in r)c[k]=r[k];c.got=r.got.slice();c.ev=[];c.quiet=true;c.solo=true;c.ck=null;return c}
  function nearest(r){var ps=r.st.planets,b=-1,bd=1e9,i,d;
    for(i=0;i<ps.length;i++){d=Math.hypot(r.x-ps[i].x,r.y-ps[i].y);if(d<=ps[i].range&&d<bd){bd=d;b=i}}return b}
  function satPos(s,t){var a=s.ph+s.w*t;return [s.cx+s.r*Math.cos(a),s.cy+s.r*Math.sin(a)]}
  /* 지금 놓으면 날아갈 방향이 이상적인 선과 얼마나 가까운가 */
  function aim(r){var s=r.st,i=s.route.indexOf(r.te),cur=Math.atan2(r.vy,r.vx),ang,tx,ty,pl=null;
    if(i>=0&&i+1<s.route.length){pl=s.planets[s.route[i+1]];var dx=pl.x-r.x,dy=pl.y-r.y,d=Math.hypot(dx,dy);
      if(d<pl.o+8)return {ok:false,ang:cur,diff:9,tx:pl.x,ty:pl.y};
      ang=Math.atan2(dy,dx)-pl.sd*Math.asin(pl.o/d);tx=pl.x;ty=pl.y}
    else{ang=Math.atan2(s.gate.y-r.y,s.gate.x-r.x);tx=s.gate.x;ty=s.gate.y}
    var df=Math.abs(((ang-cur)%TAU+TAU*1.5)%TAU-Math.PI);
    return {ok:df<TOL&&r.swing>.25,ang:ang,diff:df,tx:tx,ty:ty}}
  function grab(r,k){var p=r.st.planets[k],dx=r.x-p.x,dy=r.y-p.y,d=Math.hypot(dx,dy)||1;
    r.ck={x:r.x-r.vx*.4,y:r.y-r.vy*.4,vx:r.vx,vy:r.vy,last:r.last};
    r.sd=dx*r.vy-dy*r.vx>=0?1:-1;r.rr=d;r.th=Math.atan2(dy,dx);r.vr=(r.vx*dx+r.vy*dy)/d;r.te=k;r.swing=0;ev(r,'grab')}
  function release(r){var am=aim(r);r.last=r.te;r.te=-1;
    if(am.ok){r.vx=V*Math.cos(am.ang);r.vy=V*Math.sin(am.ang);r.chain++;var v=20*Math.min(10,r.chain);r.score+=v;ev(r,'perfect',v)}
    else{if(r.swing>.25)r.chain=0;ev(r,'release')}}
  function lose(r){r.lives--;r.chain=0;ev(r,'lost');
    if(r.lives<=0){r.over=true;ev(r,'over');return}
    var s=r.st,c=r.ck;r.te=-1;r.freeze=.7;
    if(c){r.x=c.x;r.y=c.y;r.vx=c.vx;r.vy=c.vy;r.last=c.last}else{r.x=s.sx;r.y=s.sy;r.vx=0;r.vy=-V;r.last=-1}}
  function step(r,hold){
    if(r.over||r.done)return;
    r.time-=DT;if(r.time<=0){r.time=0;r.over=true;ev(r,'over');return}
    r.t+=DT;if(r.freeze>0){r.freeze-=DT;return}
    var s=r.st,ps=s.planets,p,dx,dy,d,i,k,m;r.push=-1;
    if(r.te>=0&&!hold)release(r);
    if(r.te<0&&hold){k=nearest(r);if(k>=0){if(ps[k].kind===0)grab(r,k);else r.push=k}}
    if(r.te>=0){p=ps[r.te];var rmin=p.R+CR+6;
      r.vr*=DEC;if(r.rr<rmin)r.vr=Math.max(r.vr,(rmin-r.rr)*6);
      if(r.vr>V*.98)r.vr=V*.98;if(r.vr<-V*.98)r.vr=-V*.98;
      var vt=Math.sqrt(V*V-r.vr*r.vr),da=vt/r.rr*DT;r.rr+=r.vr*DT;r.th+=r.sd*da;r.swing+=da;
      var c=Math.cos(r.th),sn=Math.sin(r.th);r.x=p.x+r.rr*c;r.y=p.y+r.rr*sn;
      r.vx=r.vr*c-r.sd*vt*sn;r.vy=r.vr*sn+r.sd*vt*c}
    else{
      for(i=0;i<s.holes.length;i++){p=s.holes[i];dx=p.x-r.x;dy=p.y-r.y;d=Math.hypot(dx,dy);
        if(d<p.range&&d>1){m=p.pull*(1-d/p.range)*DT/d;r.vx+=dx*m;r.vy+=dy*m}}
      if(r.push>=0){p=ps[r.push];dx=r.x-p.x;dy=r.y-p.y;d=Math.hypot(dx,dy)||1;m=560*(1-.6*d/p.range)*DT/d;r.vx+=dx*m;r.vy+=dy*m}
      m=V/(Math.hypot(r.vx,r.vy)||1);r.vx*=m;r.vy*=m;r.x+=r.vx*DT;r.y+=r.vy*DT;
      for(i=0;i<ps.length;i++){p=ps[i];dx=r.x-p.x;dy=r.y-p.y;d=Math.hypot(dx,dy);
        if(d<p.R+CR-1&&d>0){dx/=d;dy/=d;m=r.vx*dx+r.vy*dy;if(m<0){r.vx-=2*m*dx;r.vy-=2*m*dy;ev(r,'bounce')}
          r.x=p.x+dx*(p.R+CR-1);r.y=p.y+dy*(p.R+CR-1)}}}
    if(!r.nodust)for(i=0;i<s.dust.length;i++)if(!r.got[i]){p=s.dust[i];if(Math.abs(p.x-r.x)<17&&Math.hypot(p.x-r.x,p.y-r.y)<17){r.got[i]=1;r.score+=5;ev(r,'dust',5)}}
    for(i=0;i<s.ast.length;i++){p=s.ast[i];if(Math.hypot(p.x-r.x,p.y-r.y)<p.r+CR-3)return lose(r)}
    for(i=0;i<s.sats.length;i++){p=satPos(s.sats[i],r.t);if(Math.hypot(p[0]-r.x,p[1]-r.y)<s.sats[i].sz+CR-3)return lose(r)}
    for(i=0;i<s.holes.length;i++){p=s.holes[i];if(Math.hypot(p.x-r.x,p.y-r.y)<p.core)return lose(r)}
    if(Math.hypot(s.gate.x-r.x,s.gate.y-r.y)<GR){
      r.score+=50;r.bonus=Math.round(Math.max(8,12-Math.max(0,r.n-9)*.2));ev(r,'gate',50);r.time=Math.min(70,r.time+r.bonus);
      if(r.solo){r.done=true;return}
      r.pst=s;r.pt=r.t;r.n++;r.st=getStage(r.n);enter(r);return}
    if(r.x<-25||r.x>W+25||r.y>s.low+130||r.y<s.high-200)lose(r)}

  /* ---------- 봇: 목표 행성의 궤도에 닿으면 누르고, 접선이 다음 목표를 향하면 놓는다 ---------- */
  function target(r){var s=r.st,i=s.route.indexOf(r.te>=0?r.te:r.last);return i+1<s.route.length?s.route[i+1]:-1}
  function botHold(r,inner){var s=r.st,T=target(r),p,dx,dy,d;
    if(r.te<0){if(T<0)return false;p=s.planets[T];dx=r.x-p.x;dy=r.y-p.y;d=Math.hypot(dx,dy);
      return nearest(r)===T&&(d<=p.o+1||dx*r.vx+dy*r.vy>=0)}
    if(inner||r.swing<.3)return true;
    if(!aim(r).ok&&r.swing<TAU*1.15)return true;
    var c=clone(r),n=0;c.nodust=true;step(c,false);
    for(;n<840;n++){step(c,botHold(c,true));
      if(c.lives<r.lives||c.over)return true;
      if(c.done)return false;
      if(c.te>=0)return !(c.te===T&&c.rr>=s.planets[T].R+CR+8)}
    return true}
  function botPlay(st,maxT){var r=mkRun(st),t=0;while(t<maxT&&!r.done&&!r.over&&r.lives===3){step(r,botHold(r));t+=DT}
    return r.done&&r.lives===3?t:-1}
  function idleWins(st){var r=mkRun(st),t=0;while(t<60&&!r.done&&!r.over){step(r,false);t+=DT}return r.done}

  var API={W:W,H:H,V:V,DT:DT,HAND:HAND,build:build,getStage:getStage,mkRun:mkRun,newRun:newRun,step:step,aim:aim,
    botHold:botHold,botPlay:botPlay,idleWins:idleWins,nearest:nearest,clone:clone};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  if(typeof SG==='undefined')return;

  /* =================== 화면 =================== */
  var R=null,acc=0,cam={x:0,y:0},trail=[],sparks=[],rings=[],chq=[],clk=0,grabT=9,stT=0,held=false,everHeld=false,lowBeep=0,tick=0,
      key={sp:false};
  if(!window.__orbitKeys){window.__orbitKeys=true;
    window.addEventListener('keydown',function(e){if(e.code==='Space'&&!e.repeat)key.sp=true});
    window.addEventListener('keyup',function(e){if(e.code==='Space')key.sp=false});
    window.addEventListener('blur',function(){key.sp=false})}
  window.__orbit={s:function(){return {n:R.n,te:R.te,lives:R.lives,time:R.time,x:R.x,y:R.y,gold:R.te>=0&&aim(R).ok,over:R.over}},
    bot:function(){return botHold(R)},go:function(n){R.n=n;R.st=getStage(n);R.pst=null;enter(R);trail=[];cam.y=R.y-430}};

  var PAL=[['#aef0e4','#3fb8a6','#17605f','rgba(90,230,210,.28)','#1d7c78'],
           ['#ffe0a8','#f29a4a','#8a3d1e','rgba(255,170,90,.28)','#c96a2c'],
           ['#e6d8ff','#a488f0','#49318f','rgba(170,140,255,.3)','#7458c8'],
           ['#ffd0e4','#f078a8','#8a2c5c','rgba(255,130,180,.28)','#c84a80'],
           ['#cfeaff','#5aa6f0','#1f4a94','rgba(110,180,255,.3)','#3676c8']],
      REP=['#ffb0b0','#ee4466','#6a1030','rgba(255,70,110,.3)','#b01c44'];
  var stars=[],neb=[];
  (function(){var rd=rng(4242),i,l;
    for(l=0;l<3;l++)for(i=0;i<[46,30,16][l];i++)stars.push({x:rd()*W,y:rd()*(H+40),l:l,s:[.8,1.2,1.9][l],p:rd()*TAU});
    var cs=['120,70,220','40,130,220','230,80,160','60,190,190','150,90,240'];
    for(i=0;i<6;i++)neb.push({x:rd()*W,y:i*230+rd()*90,r:130+rd()*90,c:cs[i%cs.length],p:rd()*TAU})})();
  function T(a,ko,en){return a.lang==='ko'?ko:en}
  function mod(a,n){return ((a%n)+n)%n}
  function txt(g,s,x,y,size,col,al){g.font=size+'px Jua, system-ui, sans-serif';g.textAlign=al||'center';g.lineJoin='round';
    g.lineWidth=4;g.strokeStyle='rgba(12,8,40,.75)';g.strokeText(s,x,y);g.fillStyle=col||'#fff';g.fillText(s,x,y)}

  function init(a){R=newRun();acc=0;trail=[];sparks=[];rings=[];chq=[];grabT=9;stT=0;everHeld=false;lowBeep=0;key.sp=false;
    cam.x=0;cam.y=R.y-430;getStage(1);a.tempo(1)}

  function update(dt,inp,a){
    held=!!(inp.down||key.sp);clk+=dt;grabT+=dt;stT+=dt;
    acc+=dt;var n=0;
    while(acc>=DT&&n<8){step(R,held);acc-=DT;n++;tick++;
      if(tick%2===0&&R.freeze<=0){var l=trail[trail.length-1];trail.push({x:R.x,y:R.y,t:clk,b:!l||Math.hypot(l.x-R.x,l.y-R.y)>14})}}
    if(acc>DT*8)acc=0;
    while(trail.length&&clk-trail[0].t>1.7)trail.shift();
    if(Math.random()<dt*26&&R.freeze<=0)sparks.push({x:R.x+(Math.random()-.5)*8,y:R.y+(Math.random()-.5)*8,t:0,l:.5+Math.random()*.6,
      vx:-R.vx*.12+(Math.random()-.5)*26,vy:-R.vy*.12+(Math.random()-.5)*26,p:Math.random()*TAU});
    var sx,sy,i,e;
    for(i=0;i<R.ev.length;i++){e=R.ev[i];sx=e.x-cam.x;sy=e.y-cam.y;
      if(e.k==='grab'){grabT=0;everHeld=true;a.beep(440,.09,'sine');a.beep(660,.12,'triangle')}
      else if(e.k==='release')a.beep(560,.06,'triangle');
      else if(e.k==='perfect'){a.add(e.v);a.pop(sx,sy-22,T(a,'퍼펙트 슬링!','Perfect sling!')+(R.chain>1?' x'+R.chain:''),'#ffe27a');
        a.burst(sx,sy,'#ffe27a',10);a.beep(784*Math.pow(1.122,Math.min(8,R.chain-1)),.14,'triangle');a.beep(1568,.1,'sine');rings.push({x:e.x,y:e.y,t:0,c:'255,226,122',s:.6})}
      else if(e.k==='dust'){a.add(e.v);a.burst(sx,sy,'#bff4ff',4);a.beep(1320+Math.random()*240,.05,'sine')}
      else if(e.k==='bounce'){a.beep(170,.09,'square');a.shake(4);a.burst(sx,sy,'#fff',5)}
      else if(e.k==='gate'){a.add(e.v);a.sfx('coin');a.burst(sx,sy,'#9ff7ff',16);a.burst(sx,sy,'#ffe27a',12);a.pop(sx,sy-34,'+'+R.bonus+'s','#9ff7ff');a.shake(5);
        rings.push({x:e.x,y:e.y,t:0,c:'160,250,255',s:1},{x:e.x,y:e.y,t:-.12,c:'255,226,122',s:1.3},{x:e.x,y:e.y,t:-.24,c:'255,255,255',s:1.7});
        [523,659,784,1047,1319].forEach(function(f,j){chq.push({t:j*.075,f:f})});stT=0;a.tempo(1+Math.min(.5,R.n*.03))}
      else if(e.k==='lost'){a.sfx('hit');a.shake(9);a.burst(Math.max(14,Math.min(W-14,sx)),Math.max(40,Math.min(H-20,sy)),'#ff8a9a',14);
        a.pop(Math.max(40,Math.min(W-40,sx)),Math.max(90,Math.min(H-60,sy)),'-1','#ff8a9a');trail=[]}
      else if(e.k==='over')a.over()}
    R.ev.length=0;
    for(i=chq.length-1;i>=0;i--){chq[i].t-=dt;if(chq[i].t<=0){a.beep(chq[i].f,.2,'triangle');chq.splice(i,1)}}
    if(!R.over&&R.time<8&&Math.ceil(R.time)!==lowBeep){lowBeep=Math.ceil(R.time);a.beep(330,.06,'square')}
    R.st.planets.forEach(function(p,j){var on=R.te===j||R.push===j;p.aw=Math.max(0,Math.min(1,(p.aw||0)+(on?dt*7:-dt*2.5)))});
    if(R.pst)R.pst.planets.forEach(function(p){p.aw=Math.max(0,(p.aw||0)-dt*2.5)});
    for(i=sparks.length-1;i>=0;i--){e=sparks[i];e.t+=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;if(e.t>e.l)sparks.splice(i,1)}
    for(i=rings.length-1;i>=0;i--){rings[i].t+=dt;if(rings[i].t>.8)rings.splice(i,1)}
    var k=1-Math.exp(-4.5*dt);cam.y+=(R.y-430+R.vy*.3-cam.y)*k;cam.x+=(R.vx*.075-cam.x)*(1-Math.exp(-3*dt))}

  /* ---------- 그리기 ---------- */
  function drawBg(g,t){
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#070b24');gr.addColorStop(.55,'#141040');gr.addColorStop(1,'#2a1250');
    g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
    var i,n,x,y,rg;
    for(i=0;i<neb.length;i++){n=neb[i];x=n.x+Math.sin(t*.07+n.p)*30-cam.x*.15;y=mod(n.y-cam.y*.13+Math.cos(t*.05+n.p)*20,1380)-340;
      if(y<-n.r||y>H+n.r)continue;
      rg=g.createRadialGradient(x,y,0,x,y,n.r);rg.addColorStop(0,'rgba('+n.c+',.3)');rg.addColorStop(.55,'rgba('+n.c+',.1)');rg.addColorStop(1,'rgba('+n.c+',0)');
      g.fillStyle=rg;g.fillRect(x-n.r,y-n.r,n.r*2,n.r*2)}
    for(i=0;i<stars.length;i++){n=stars[i];var par=[.08,.22,.5][n.l];x=mod(n.x-cam.x*par*2,W);y=mod(n.y-cam.y*par,H+40)-20;
      g.globalAlpha=(.35+.2*n.l)+.3*Math.sin(t*(1.2+n.l)+n.p);g.fillStyle=n.l===2?'#fff6d8':'#cfe0ff';
      if(n.l===2){g.beginPath();g.moveTo(x,y-n.s*2);g.lineTo(x+n.s*.5,y-n.s*.5);g.lineTo(x+n.s*2,y);g.lineTo(x+n.s*.5,y+n.s*.5);g.lineTo(x,y+n.s*2);
        g.lineTo(x-n.s*.5,y+n.s*.5);g.lineTo(x-n.s*2,y);g.lineTo(x-n.s*.5,y-n.s*.5);g.fill()}
      else g.fillRect(x,y,n.s,n.s)}
    g.globalAlpha=1}

  function blobs(g,r,t,p,col,n){g.fillStyle=col;for(var i=0;i<n;i++){var lon=i*2.4+p.look+t*.22,c=Math.cos(lon);if(c<=.05)continue;
      var lat=((i*37)%11)/11*1.5-.75,rr=r*(.14+((i*53)%7)/7*.13);
      g.beginPath();g.ellipse(Math.sin(lon)*r*Math.cos(lat*.9),lat*r,rr*c,rr,0,0,TAU);g.fill()}}
  function bands(g,r,t,p,col,al){g.save();g.rotate(-.28);g.fillStyle=col;
    for(var i=0;i<4;i++){var y=-r+r*.18+i*r*.5+Math.sin(t*.3+i+p.look)*r*.03;g.globalAlpha=al*(i%2?.55:1);
      g.beginPath();g.moveTo(-r,y);g.quadraticCurveTo(0,y+r*.12,r,y);g.lineTo(r,y+r*.2);g.quadraticCurveTo(0,y+r*.32,-r,y+r*.2);g.fill()}
    g.restore();g.globalAlpha=1}
  function drawPlanet(g,p,t,cand,cx,cy){
    var x=p.x,y=p.y,r=p.R,aw=p.aw||0,rep=p.kind===1,c=rep?REP:PAL[p.look%5],lk=p.look%5,i;
    g.save();g.translate(x,y);
    g.setLineDash([4,8]);g.lineDashOffset=t*(rep?10:-7);g.lineWidth=cand?1.8:1;
    g.strokeStyle=(rep?'rgba(255,120,150,':'rgba(190,228,255,')+(cand?.6:.17+aw*.2)+')';
    g.beginPath();g.arc(0,0,p.range,0,TAU);g.stroke();g.setLineDash([]);
    var h=g.createRadialGradient(0,0,r*.7,0,0,r*2);h.addColorStop(0,c[3]);h.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=h;g.beginPath();g.arc(0,0,r*2,0,TAU);g.fill();
    if(rep){var pu=mod(t*.9,1);g.strokeStyle='rgba(255,120,150,'+(.5*(1-pu))+')';g.lineWidth=2;g.beginPath();g.arc(0,0,r+6+pu*(aw>.3?46:22),0,TAU);g.stroke();
      g.fillStyle=c[4];for(i=0;i<10;i++){var a=i/10*TAU+t*.4;g.beginPath();g.moveTo(Math.cos(a-.2)*r*.9,Math.sin(a-.2)*r*.9);g.lineTo(Math.cos(a)*(r+6+aw*3),Math.sin(a)*(r+6+aw*3));g.lineTo(Math.cos(a+.2)*r*.9,Math.sin(a+.2)*r*.9);g.fill()}}
    if(lk===2&&!rep){g.save();g.rotate(-.35);g.scale(1,.3);g.strokeStyle='rgba(235,220,255,.75)';g.lineWidth=5;g.beginPath();g.arc(0,0,r*1.6,Math.PI,TAU);g.stroke();g.restore()}
    var b=g.createRadialGradient(-r*.35,-r*.4,r*.1,0,0,r);b.addColorStop(0,c[0]);b.addColorStop(.6,c[1]);b.addColorStop(1,c[2]);
    g.fillStyle=b;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
    g.save();g.beginPath();g.arc(0,0,r,0,TAU);g.clip();
    if(!rep){if(lk===0)blobs(g,r,t,p,'rgba(15,70,80,.38)',8);else if(lk===1)bands(g,r,t,p,c[4],.5);else if(lk===2)bands(g,r,t,p,c[4],.3);
      else if(lk===3)blobs(g,r,t,p,'rgba(255,240,250,.5)',7);else{bands(g,r,t,p,c[4],.4);blobs(g,r,t,p,'rgba(240,250,255,.55)',3)}}
    var sh=g.createRadialGradient(-r*.4,-r*.45,r*.5,-r*.2,-r*.2,r*1.5);sh.addColorStop(0,'rgba(0,0,30,0)');sh.addColorStop(1,'rgba(8,0,40,.6)');
    g.fillStyle=sh;g.fillRect(-r,-r,r*2,r*2);g.restore();
    if(lk===2&&!rep){g.save();g.rotate(-.35);g.scale(1,.3);g.strokeStyle='rgba(245,235,255,.9)';g.lineWidth=5;g.beginPath();g.arc(0,0,r*1.6,0,Math.PI);g.stroke();g.restore()}
    /* 얼굴 */
    var ex=r*.32,ey=-r*.04,es=Math.max(2.4,r*.15),dk='#1a1440',la=Math.atan2(cy-y,cx-x),open=rep?1:aw;
    if(open<.45){g.strokeStyle=dk;g.lineWidth=1.8;g.lineCap='round';
      for(i=-1;i<=1;i+=2){g.beginPath();g.arc(i*ex,ey-es*.3,es,.2*Math.PI,.8*Math.PI);g.stroke()}
      g.beginPath();g.arc(0,ey+r*.3,r*.09,0,Math.PI);g.stroke();
      var z=mod(t*.5+p.look*.37,1);g.globalAlpha=(1-z)*.8;g.font=(8+z*5)+'px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle='#fff';g.fillText('z',r*.75+z*8,-r*.7-z*14);g.globalAlpha=1}
    else{for(i=-1;i<=1;i+=2){g.fillStyle='#fff';g.beginPath();g.ellipse(i*ex,ey,es*1.15,es*1.25*open,0,0,TAU);g.fill();
        g.fillStyle=dk;g.beginPath();g.arc(i*ex+Math.cos(la)*es*.4,ey+Math.sin(la)*es*.4,es*.6,0,TAU);g.fill();
        if(rep){g.strokeStyle=dk;g.lineWidth=2;g.beginPath();g.moveTo(i*(ex+es*1.3),ey-es*1.9);g.lineTo(i*(ex-es*1.1),ey-es*1.1);g.stroke()}}
      g.fillStyle=dk;g.beginPath();if(rep)g.arc(0,ey+r*.42,r*.14,Math.PI,TAU);else g.arc(0,ey+r*.24,r*.17,0,Math.PI);g.fill()}
    g.restore()}

  function drawRock(g,a,t){g.save();g.translate(a.x,a.y);g.rotate(t*.25*((a.x|0)%2?1:-1)+a.x);
    var i,n=7,r=a.r+2,gr=g.createRadialGradient(-r*.3,-r*.3,1,0,0,r);gr.addColorStop(0,'#b9a9c9');gr.addColorStop(1,'#4a3f6a');
    g.fillStyle=gr;g.strokeStyle='rgba(20,10,50,.6)';g.lineWidth=1.5;g.beginPath();
    for(i=0;i<n;i++){var q=i/n*TAU,k=r*(.78+.22*Math.sin(i*2.3+a.x*.7+a.y));if(i)g.lineTo(Math.cos(q)*k,Math.sin(q)*k);else g.moveTo(Math.cos(q)*k,Math.sin(q)*k)}
    g.closePath();g.fill();g.stroke();g.fillStyle='rgba(30,20,60,.35)';g.beginPath();g.arc(r*.2,r*.1,r*.22,0,TAU);g.arc(-r*.3,r*.3,r*.13,0,TAU);g.fill();g.restore()}
  function drawHole(g,h,t){g.save();g.translate(h.x,h.y);
    var rg=g.createRadialGradient(0,0,h.core,0,0,h.range);rg.addColorStop(0,'rgba(150,80,255,.3)');rg.addColorStop(.4,'rgba(110,50,200,.1)');rg.addColorStop(1,'rgba(90,40,180,0)');
    g.fillStyle=rg;g.beginPath();g.arc(0,0,h.range,0,TAU);g.fill();
    for(var i=0;i<3;i++){var k=mod(1-t*.3+i/3,1);g.strokeStyle='rgba(190,140,255,'+(.4*(1-k))+')';g.lineWidth=1.3;g.beginPath();g.arc(0,0,h.core+4+k*(h.range-h.core-10),0,TAU);g.stroke()}
    g.rotate(-t*1.6);g.lineCap='round';
    for(i=0;i<4;i++){g.rotate(TAU/4);g.strokeStyle=i%2?'rgba(255,170,90,.85)':'rgba(220,150,255,.85)';g.lineWidth=3;g.beginPath();g.arc(0,0,h.core+7,0,1.1);g.stroke();
      g.lineWidth=1.5;g.beginPath();g.arc(0,0,h.core+13,.5,1.5);g.stroke()}
    g.fillStyle='#03010a';g.beginPath();g.arc(0,0,h.core+2,0,TAU);g.fill();g.strokeStyle='rgba(255,220,170,.9)';g.lineWidth=1.5;g.stroke();g.restore()}
  function drawSat(g,s,t,now){var p=satPos(s,t);g.strokeStyle='rgba(255,200,120,.2)';g.lineWidth=1;g.setLineDash([2,6]);g.beginPath();g.arc(s.cx,s.cy,s.r,0,TAU);g.stroke();g.setLineDash([]);
    g.save();g.translate(p[0],p[1]);g.rotate(s.ph+s.w*t+Math.PI/2);
    g.fillStyle='#4a78d8';g.fillRect(-13,-3,8,6);g.fillRect(5,-3,8,6);g.strokeStyle='#bcd4ff';g.lineWidth=1;g.strokeRect(-13,-3,8,6);g.strokeRect(5,-3,8,6);
    g.fillStyle='#e8e4f4';g.beginPath();g.arc(0,0,5.5,0,TAU);g.fill();g.fillStyle='#8f88ac';g.beginPath();g.arc(1.5,1.5,3,0,TAU);g.fill();
    g.fillStyle=mod(now*2,1)<.5?'#ff5a6a':'#7a2030';g.beginPath();g.arc(0,-6,1.8,0,TAU);g.fill();g.restore()}
  function drawGate(g,gt,t,used){g.save();g.translate(gt.x,gt.y);
    var pu=1+Math.sin(t*3)*.05,rg=g.createRadialGradient(0,0,4,0,0,GR*1.9);
    rg.addColorStop(0,used?'rgba(160,250,255,.1)':'rgba(160,250,255,.42)');rg.addColorStop(1,'rgba(120,200,255,0)');g.fillStyle=rg;g.beginPath();g.arc(0,0,GR*1.9,0,TAU);g.fill();
    g.globalAlpha=used?.3:1;g.strokeStyle='rgba(170,250,255,.95)';g.lineWidth=4;g.beginPath();g.arc(0,0,(GR-3)*pu,0,TAU);g.stroke();
    g.strokeStyle='#ffe27a';g.lineWidth=2.2;g.setLineDash([9,9]);g.lineDashOffset=-t*26;g.beginPath();g.arc(0,0,(GR-10)*pu,0,TAU);g.stroke();g.setLineDash([]);
    if(!used){g.rotate(t*.8);g.fillStyle='#fff8d0';g.beginPath();for(var i=0;i<8;i++){var a=i/8*TAU,k=i%2?3:8+Math.sin(t*4)*1.5;g.lineTo(Math.cos(a)*k,Math.sin(a)*k)}g.fill()}
    g.restore();g.globalAlpha=1}

  function drawStage(g,st,t,mode,now){
    var top=cam.y-170,bot=cam.y+H+170,i,p,cand=-1;
    if(mode===1&&R.te<0&&R.freeze<=0)cand=nearest(R);
    for(i=0;i<st.holes.length;i++)if(st.holes[i].y>top&&st.holes[i].y<bot)drawHole(g,st.holes[i],now);
    if(mode>0)for(i=0;i<st.dust.length;i++){p=st.dust[i];if((mode===1&&R.got[i])||p.y<top||p.y>bot)continue;
      var tw=.6+.4*Math.sin(now*5+i*1.7),s=3.2+tw*1.6;g.fillStyle='rgba(190,244,255,'+(.25*tw)+')';g.beginPath();g.arc(p.x,p.y,8,0,TAU);g.fill();
      g.fillStyle='#eafcff';g.beginPath();g.moveTo(p.x,p.y-s);g.lineTo(p.x+s*.32,p.y-s*.32);g.lineTo(p.x+s,p.y);g.lineTo(p.x+s*.32,p.y+s*.32);g.lineTo(p.x,p.y+s);
      g.lineTo(p.x-s*.32,p.y+s*.32);g.lineTo(p.x-s,p.y);g.lineTo(p.x-s*.32,p.y-s*.32);g.fill()}
    if(st.gate.y>top&&st.gate.y<bot)drawGate(g,st.gate,now,mode===0);
    for(i=0;i<st.ast.length;i++)if(st.ast[i].y>top&&st.ast[i].y<bot)drawRock(g,st.ast[i],now);
    for(i=0;i<st.planets.length;i++){p=st.planets[i];if(p.y>top&&p.y<bot)drawPlanet(g,p,now,i===cand,R.x,R.y)}
    for(i=0;i<st.sats.length;i++)if(st.sats[i].cy>top-100&&st.sats[i].cy<bot+100)drawSat(g,st.sats[i],t,now)}

  function drawComet(g,x,y,vx,vy,now,mood,al){
    var a=Math.atan2(vy,vx),fx=Math.cos(a)*2.2,fy=Math.sin(a)*2.2,r=9.5;
    g.save();g.translate(x,y);g.globalAlpha=al;
    var gl=g.createRadialGradient(0,0,3,0,0,26);gl.addColorStop(0,'rgba(255,240,170,.55)');gl.addColorStop(1,'rgba(255,220,120,0)');g.fillStyle=gl;g.beginPath();g.arc(0,0,26,0,TAU);g.fill();
    g.save();g.rotate(a);g.scale(1.1,.93);var b=g.createRadialGradient(-2,-3,1,0,0,r);b.addColorStop(0,'#fffdf0');b.addColorStop(.7,'#ffe38a');b.addColorStop(1,'#f5a64a');
    g.fillStyle=b;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();g.restore();
    g.fillStyle='rgba(255,130,150,.55)';g.beginPath();g.arc(fx-5.2,fy+2.6,1.9,0,TAU);g.arc(fx+5.2,fy+2.6,1.9,0,TAU);g.fill();
    var bl=mod(now,3.4)<.12,dk='#2a1848';g.fillStyle=dk;g.strokeStyle=dk;g.lineWidth=1.5;g.lineCap='round';
    if(bl){g.beginPath();g.moveTo(fx-4.6,fy-1);g.lineTo(fx-1.8,fy-1);g.moveTo(fx+1.8,fy-1);g.lineTo(fx+4.6,fy-1);g.stroke()}
    else{var e=mood===2?2.5:2;g.beginPath();g.arc(fx-3.2,fy-1,e,0,TAU);g.arc(fx+3.2,fy-1,e,0,TAU);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(fx-3.8,fy-1.7,.75,0,TAU);g.arc(fx+2.6,fy-1.7,.75,0,TAU);g.fill()}
    g.fillStyle=dk;g.beginPath();
    if(mood===1){g.arc(fx,fy+2.6,2.4,0,Math.PI);g.fill()}else if(mood===2){g.arc(fx,fy+4,1.7,0,TAU);g.fill()}
    else{g.arc(fx,fy+2.4,1.9,.1*Math.PI,.9*Math.PI);g.stroke()}
    g.restore();g.globalAlpha=1}

  function draw(g,a){
    var now=performance.now()/1000,i,p,q;
    drawBg(g,now);
    g.save();g.translate(-cam.x,-cam.y);
    if(R.pst)drawStage(g,R.pst,R.pt,0,now);
    var nx=getStage(R.n+1);drawStage(g,nx,0,2,now);
    drawStage(g,R.st,R.t,1,now);
    /* 꼬리: 지나온 길 그대로의 리본 */
    g.lineCap='round';
    for(i=1;i<trail.length;i++){p=trail[i-1];q=trail[i];if(q.b)continue;var f=1-(clk-q.t)/1.7;if(f<=0)continue;
      g.strokeStyle='rgba(120,200,255,'+(f*f*.28)+')';g.lineWidth=2+f*13;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.stroke()}
    for(i=1;i<trail.length;i++){p=trail[i-1];q=trail[i];if(q.b)continue;f=1-(clk-q.t)/1.7;if(f<=0)continue;
      g.strokeStyle='rgba('+(255)+','+Math.round(200+55*f)+','+Math.round(255-110*f*f)+','+(.15+f*.8)+')';g.lineWidth=.8+f*f*7;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.stroke()}
    for(i=0;i<sparks.length;i++){p=sparks[i];f=1-p.t/p.l;var s=(1.2+2.6*f)*(.7+.3*Math.sin(now*14+p.p));g.fillStyle='rgba(255,246,200,'+f+')';
      g.beginPath();g.moveTo(p.x,p.y-s);g.lineTo(p.x+s*.3,p.y-s*.3);g.lineTo(p.x+s,p.y);g.lineTo(p.x+s*.3,p.y+s*.3);g.lineTo(p.x,p.y+s);g.lineTo(p.x-s*.3,p.y+s*.3);g.lineTo(p.x-s,p.y);g.lineTo(p.x-s*.3,p.y-s*.3);g.fill()}
    var am=null;
    if(R.te>=0){p=R.st.planets[R.te];am=aim(R);
      /* 탄성 있는 줄 */
      var mx=(p.x+R.x)/2,my=(p.y+R.y)/2,dx=R.x-p.x,dy=R.y-p.y,d=Math.hypot(dx,dy)||1,wb=Math.exp(-5*grabT)*Math.sin(grabT*24)*16+Math.sin(now*9)*1.5;
      mx+=-dy/d*wb;my+=dx/d*wb;
      g.strokeStyle='rgba(140,240,255,.25)';g.lineWidth=8;g.beginPath();g.moveTo(p.x,p.y);g.quadraticCurveTo(mx,my,R.x,R.y);g.stroke();
      g.strokeStyle='#e8fdff';g.lineWidth=2.2;g.beginPath();g.moveTo(p.x,p.y);g.quadraticCurveTo(mx,my,R.x,R.y);g.stroke();
      g.strokeStyle='rgba(190,240,255,.16)';g.lineWidth=1.2;g.beginPath();g.arc(p.x,p.y,R.rr,0,TAU);g.stroke();
      /* 첫 스테이지: 언제 놓을지 보여 주는 유령 */
      if(R.n===0){var gd=Math.hypot(am.tx-p.x,am.ty-p.y);if(gd>R.rr+4){var ga=Math.atan2(am.ty-p.y,am.tx-p.x)-R.sd*Math.acos(R.rr/gd),
            hx=p.x+R.rr*Math.cos(ga),hy=p.y+R.rr*Math.sin(ga),pl=.55+.3*Math.sin(now*7);
          g.setLineDash([3,5]);g.strokeStyle='rgba(255,226,122,'+(pl*.7)+')';g.lineWidth=1.5;g.beginPath();g.moveTo(hx,hy);g.lineTo(am.tx,am.ty);g.stroke();g.setLineDash([]);
          drawComet(g,hx,hy,am.tx-hx,am.ty-hy,now,0,pl*.6);
          g.strokeStyle='rgba(255,226,122,'+pl+')';g.lineWidth=2;g.beginPath();g.arc(hx,hy,14+Math.sin(now*7)*2,0,TAU);g.stroke()}}
      /* 지금 놓으면 날아갈 길 */
      var ang=am.ok?am.ang:Math.atan2(R.vy,R.vx),ux=Math.cos(ang),uy=Math.sin(ang),off=mod(now*60,14),len=am.ok?Math.min(420,Math.hypot(am.tx-R.x,am.ty-R.y)):250;
      for(var k=14+off;k<len;k+=14){f=1-k/(len+40);g.fillStyle=am.ok?'rgba(255,226,122,'+(.35+.65*f)+')':'rgba(255,255,255,'+(.2+.6*f)+')';
        g.beginPath();g.arc(R.x+ux*k,R.y+uy*k,am.ok?2.9:2.1,0,TAU);g.fill()}
      if(am.ok){g.strokeStyle='rgba(255,226,122,.3)';g.lineWidth=7;g.beginPath();g.moveTo(R.x+ux*14,R.y+uy*14);g.lineTo(R.x+ux*len,R.y+uy*len);g.stroke()}
    }
    for(i=0;i<rings.length;i++){p=rings[i];if(p.t<0)continue;f=p.t/.8;g.strokeStyle='rgba('+p.c+','+(1-f)+')';g.lineWidth=3*(1-f)+.6;g.beginPath();g.arc(p.x,p.y,(GR+f*80)*p.s,0,TAU);g.stroke()}
    var danger=R.x<26||R.x>W-26||R.y<R.st.high-90;
    if(R.freeze<=0||mod(now*9,1)<.6)drawComet(g,R.x,R.y,R.vx,R.vy,now,R.freeze>0||danger?2:R.te>=0?1:0,1);
    g.restore();

    /* HUD */
    var gy=R.st.gate.y-cam.y;
    if(gy<40&&!R.over){var gx=Math.max(24,Math.min(W-24,R.st.gate.x-cam.x)),bb=Math.sin(now*6)*3;g.fillStyle='rgba(170,250,255,.9)';
      g.beginPath();g.moveTo(gx,62+bb);g.lineTo(gx-8,74+bb);g.lineTo(gx+8,74+bb);g.fill();g.strokeStyle='#ffe27a';g.lineWidth=2;g.beginPath();g.arc(gx,84+bb,5,0,TAU);g.stroke()}
    for(i=0;i<3;i++){g.globalAlpha=i<R.lives?1:.22;g.fillStyle='#ffe38a';g.beginPath();g.arc(20+i*20,46,6.5,0,TAU);g.fill();
      g.fillStyle='rgba(140,220,255,.8)';g.beginPath();g.moveTo(15+i*20,50);g.lineTo(11+i*20,58);g.lineTo(20+i*20,53);g.fill();
      g.fillStyle='#2a1848';g.beginPath();g.arc(18+i*20,45,1.1,0,TAU);g.arc(22.4+i*20,45,1.1,0,TAU);g.fill()}
    g.globalAlpha=1;
    var bw=130,bx=W/2-bw/2,fr=Math.max(0,R.time/70),low=R.time<8;
    g.fillStyle='rgba(10,8,40,.55)';g.beginPath();g.roundRect(bx-2,39,bw+4,12,6);g.fill();
    g.fillStyle=low?(mod(now*3,1)<.5?'#ff6a7a':'#ffb0b8'):'#8ff0ff';g.beginPath();g.roundRect(bx,41,Math.max(8,bw*fr),8,4);g.fill();
    txt(g,Math.ceil(R.time)+'s',bx+bw+20,51,14,low?'#ff9aa6':'#dffaff');
    txt(g,T(a,'스테이지 ','Stage ')+(R.n+1),W-10,70,14,'#cfd8ff','right');
    if(R.chain>1)txt(g,T(a,'연속 x','Chain x')+R.chain,10,74,14,'#ffe27a','left');
    var msg=null;
    if(R.n===0&&!R.over){if(R.te>=0)msg=am&&am.ok?T(a,'지금! 손을 떼요','Now! Let go'):T(a,'점선이 빛나는 문을 향하면 손을 떼요','Let go when the dots point at the gate');
      else if(R.last<0)msg=T(a,'꾹 누르면(Space) 가까운 행성이 붙잡아요','Hold (or Space): the nearest planet grabs you')}
    else if(R.st.tip&&stT<4.5&&!R.over)msg=R.st.tip[a.lang];
    if(msg){g.globalAlpha=R.n===0?1:Math.min(1,(4.5-stT)*2);txt(g,msg,W/2-10,604,16,am&&am.ok&&R.n===0?'#ffe27a':'#fff');g.globalAlpha=1}
  }

  SG.run({id:'orbit-sling',title:{ko:'궤도 슬링',en:'Orbit Sling'},
    how:{ko:'누르고 있는 동안에만 중력이 켜져요. 가까운 행성에 매달려 돌다가, 손을 떼어 빛나는 문으로 날아가세요!',
         en:'Gravity only exists while you hold. Swing around the nearest planet, then let go to fly through the glowing gate!'},
    init:init,update:update,draw:draw});
})();
