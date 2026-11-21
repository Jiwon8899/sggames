/* 연못 물결 (Ripple Pond) — 배는 만질 수 없다. 조약돌을 떨어뜨려 생긴 물결(격자 파동 방정식)이 종이배를 연꽃 선착장까지 밀어 준다.
   시뮬레이션은 + - * / sqrt floor 만 써서 어느 기기에서나 같은 결과가 나오고, DOM 없이도 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,CELL=6,GW=60,GH=100,OY=40,N=GW*GH;
  var KW=.42,DAMP=.992,AMP=-10,PR=2.7;          /* 파동: 전파 계수, 감쇠, 조약돌 깊이, 반지름(칸) */
  var KF=1300,DRAG=1.3,VMAX=125,BR=11,DR=12,DOCKR=20,DT=1/60,SPLASH=10;
  var CAP=360,CALM=80,CATCH=50,PULL=140;                              /* 마지막 물결 뒤 최대 6초, 최소 1.3초 지나 멈추면 판정 */

  /* ---------- 레벨 ----------
     boat, dock:[x,y]  peb: 조약돌 수  rocks:[x,y,r] (물결 반사·배 막음)  pads:[x,y,r] (연잎: 배만 막고 물결은 통과)
     reeds:[x1,y1,x2,y2,w] (갈대: 물결·배 모두 막음)  whirls:[x,y,r,세기]  duck:[x,y]  min: 조약돌 1개로는 안 되어야 하는 레벨 */
  var LEVELS=[
    {boat:[180,420],dock:[180,280],peb:2,hint:{ko:'배 뒤쪽 물을 톡! 물결이 배를 밀어요',en:'Tap the water behind the boat!'}},
    {boat:[110,470],dock:[250,220],peb:3,min:2,hint:{ko:'물결은 퍼지면서 약해져요',en:'Ripples weaken as they spread'}},
    {boat:[180,480],dock:[180,160],peb:4,min:2,pads:[[180,330,34]],hint:{ko:'연잎은 배를 막지만 물결은 지나가요',en:'Lily pads stop boats, not ripples'}},
    {boat:[90,460],dock:[280,460],peb:2,min:2,rocks:[[180,430,44]],hint:{ko:'돌은 물결을 튕겨 내요',en:'Rocks bounce ripples back'}},
    {boat:[180,500],dock:[180,150],peb:4,min:2,reeds:[[14,330,150,330,10],[210,330,346,330,10]],hint:{ko:'갈대 틈으로 살살',en:'Ease through the reed gap'}},
    {boat:[90,480],dock:[280,170],peb:4,min:2,duck:[200,330],hint:{ko:'오리를 깨우지 마세요',en:'Don\'t wake the duck'}},
    {boat:[80,520],dock:[290,180],peb:3,min:2,whirls:[[180,340,80,70]],hint:{ko:'소용돌이를 타 봐요',en:'Ride the whirl'}},
    {boat:[300,500],dock:[70,170],peb:4,min:2,rocks:[[150,360,30]],pads:[[250,300,30],[110,240,26]],hint:{ko:'돌아서 가요',en:'Go around'}},
    {boat:[180,520],dock:[180,140],peb:4,min:2,reeds:[[14,420,130,420,10],[190,420,346,420,10],[14,270,170,270,10],[230,270,346,270,10]],duck:[90,340],hint:{ko:'지그재그 갈대밭',en:'Zigzag reeds'}},
    {boat:[70,520],dock:[290,150],peb:3,min:2,rocks:[[230,450,28]],pads:[[120,330,30]],whirls:[[250,300,70,-70]],duck:[170,220],hint:{ko:'연못의 모든 것',en:'The whole pond'}}
  ];

  /* ---------- 결정적 난수·노이즈 (정수 연산만) ---------- */
  function hs(n){n=Math.imul(n^61^(n>>>16),9);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return (n>>>0)/4294967296}
  function wob(t,seed){var k=Math.floor(t/48),f=t/48-k,a=hs(k*7+seed*131),b=hs(k*7+7+seed*131);f=f*f*(3-2*f);return a+(b-a)*f}
  function rng(seed){var s=seed>>>0||1;return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}

  /* 생성 레벨: 시드 하나로 만든다. 실제로 쓰는 시드 목록은 node 검증기가 풀 수 있음을 증명한 것만 넣는다. */
  var GEN=[1,2,3,4,5,7,10,12,17,18,19,20,22,23,24,25,26,30,31,33,36,40,41,42,43,44,47,49,51,53,54,55,56,57,59];
  function genLevel(seed){
    var r=rng(seed*977+13),d={peb:3+Math.floor(r()*2),min:2,rocks:[],pads:[],reeds:[],whirls:[],gen:seed},i,tries;
    var lo=r()<.5;d.boat=[60+r()*240,lo?500+r()*50:150+r()*40];d.dock=[60+r()*240,lo?140+r()*40:500+r()*50];
    function clear(x,y,m){if(Math.abs(x-d.boat[0])<m&&Math.abs(y-d.boat[1])<m)return false;
      if(Math.abs(x-d.dock[0])<m&&Math.abs(y-d.dock[1])<m)return false;return true}
    var nOb=2+Math.floor(r()*3);
    for(i=0;i<nOb;i++){for(tries=0;tries<20;tries++){var x=50+r()*260,y=230+r()*180;if(!clear(x,y,70))continue;
      var k=r();
      if(k<.3)d.rocks.push([x,y,20+r()*18]);
      else if(k<.6)d.pads.push([x,y,22+r()*12]);
      else if(k<.8&&!d.whirls.length)d.whirls.push([x,y,60+r()*20,(r()<.5?-1:1)*(50+r()*30)]);
      else if(!d.duck)d.duck=[x,y];
      else d.rocks.push([x,y,18+r()*14]);
      break}}
    if(r()<.35){var gy=Math.floor(260+r()*120),gx=90+r()*180;d.reeds.push([14,gy,gx-32,gy,10],[gx+32,gy,346,gy,10])}
    return d}

  /* ---------- 지형 굽기 ---------- */
  function inWater(x,y){
    var l=14+wob(y,1)*10,r=346-wob(y,2)*10,t=88+wob(x,3)*10,b=592-wob(x,4)*10,R=40,cx,cy;
    if(x<l||x>r||y<t||y>b)return false;
    cx=x<l+R?l+R:x>r-R?r-R:x;cy=y<t+R?t+R:y>b-R?b-R:y;
    return (x-cx)*(x-cx)+(y-cy)*(y-cy)<=R*R}
  function segD(ax,ay,bx,by,px,py){var dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l>0?((px-ax)*dx+(py-ay)*dy)/l:0;
    t=t<0?0:t>1?1:t;var qx=ax+dx*t-px,qy=ay+dy*t-py;return Math.sqrt(qx*qx+qy*qy)}
  function build(def){
    var L={def:def,peb:def.peb,min:def.min||1,boat:def.boat.slice(),dock:def.dock.slice(),rocks:def.rocks||[],pads:def.pads||[],
      reeds:def.reeds||[],whirls:def.whirls||[],duck:def.duck?def.duck.slice():null,hint:def.hint||null,gen:def.gen},
      wet=new Uint8Array(N),mask=new Uint8Array(N),sdf=new Float64Array(N),bd=new Float64Array(N),i,j,c,x,y,k,d,o;
    for(j=0;j<GH;j++)for(i=0;i<GW;i++){c=j*GW+i;x=i*CELL+3;y=OY+j*CELL+3;wet[c]=inWater(x,y)?1:0}
    /* 둑까지 거리(chamfer) */
    for(c=0;c<N;c++)bd[c]=wet[c]?1e9:0;
    var D1=1,D2=1.41421356;
    for(j=0;j<GH;j++)for(i=0;i<GW;i++){c=j*GW+i;if(!bd[c])continue;
      if(i>0)bd[c]=Math.min(bd[c],bd[c-1]+D1);if(j>0){bd[c]=Math.min(bd[c],bd[c-GW]+D1);
        if(i>0)bd[c]=Math.min(bd[c],bd[c-GW-1]+D2);if(i<GW-1)bd[c]=Math.min(bd[c],bd[c-GW+1]+D2)}}
    for(j=GH-1;j>=0;j--)for(i=GW-1;i>=0;i--){c=j*GW+i;if(!bd[c])continue;
      if(i<GW-1)bd[c]=Math.min(bd[c],bd[c+1]+D1);if(j<GH-1){bd[c]=Math.min(bd[c],bd[c+GW]+D1);
        if(i<GW-1)bd[c]=Math.min(bd[c],bd[c+GW+1]+D2);if(i>0)bd[c]=Math.min(bd[c],bd[c+GW-1]+D2)}}
    for(j=0;j<GH;j++)for(i=0;i<GW;i++){c=j*GW+i;x=i*CELL+3;y=OY+j*CELL+3;
      var s=bd[c]*CELL-3,m=wet[c];
      for(k=0;k<L.rocks.length;k++){o=L.rocks[k];d=Math.sqrt((x-o[0])*(x-o[0])+(y-o[1])*(y-o[1]))-o[2];if(d<s)s=d;if(d<1)m=0}
      for(k=0;k<L.reeds.length;k++){o=L.reeds[k];d=segD(o[0],o[1],o[2],o[3],x,y)-o[4]/2;if(d<s)s=d;if(d<1.5)m=0}
      for(k=0;k<L.pads.length;k++){o=L.pads[k];d=Math.sqrt((x-o[0])*(x-o[0])+(y-o[1])*(y-o[1]))-o[2];if(d<s)s=d}
      sdf[c]=s;mask[c]=m}
    L.wet=wet;L.mask=mask;L.sdf=sdf;return L}

  /* ---------- 상태 ---------- */
  function makeState(L){
    var s={u:new Float64Array(N),up:new Float64Array(N),bx:L.boat[0],by:L.boat[1],bvx:0,bvy:0,
      dx:L.duck?L.duck[0]:0,dy:L.duck?L.duck[1]:0,dvx:0,dvy:0,t:0,last:-9999,used:0,st:'run',why:'',ev:[],q:[],awake:0};
    return s}
  function clone(s){var c={};for(var k in s)c[k]=s[k];c.u=new Float64Array(s.u);c.up=new Float64Array(s.up);c.ev=[];c.q=s.q.slice();return c}
  function canDrop(L,x,y){if(x<0||x>=W||y<OY||y>=H)return false;var i=Math.floor(x/CELL),j=Math.floor((y-OY)/CELL),c=j*GW+i;
    return L.mask[c]===1&&L.sdf[c]>2}
  /* 조약돌이 수면에 닿는 순간 */
  function splash(s,L,x,y){
    var ci=x/CELL-.5,cj=(y-OY)/CELL-.5,i0=Math.floor(ci-PR)-1,i1=Math.floor(ci+PR)+1,j0=Math.floor(cj-PR)-1,j1=Math.floor(cj+PR)+1,i,j,c,d2,f;
    for(j=j0;j<=j1;j++)for(i=i0;i<=i1;i++){if(i<1||j<1||i>=GW-1||j>=GH-1)continue;c=j*GW+i;if(!L.mask[c])continue;
      d2=((i-ci)*(i-ci)+(j-cj)*(j-cj))/(PR*PR);if(d2>=1)continue;f=(1-d2)*(1-d2)*AMP;s.u[c]+=f;s.up[c]+=f}
    s.used++;s.last=s.t;s.ev.push({t:'s',x:x,y:y})}
  /* 물결 운동량(-u_t ∇u)을 한 점에서 샘플링: 바깥으로 퍼지는 물결은 언제나 바깥쪽으로 민다 */
  function fluxAt(s,L,x,y,out){
    var gx=x/CELL-.5,gy=(y-OY)/CELL-.5,i=Math.floor(gx),j=Math.floor(gy),fx=gx-i,fy=gy-j,a,b,ii,jj,c,w,v,u=s.u,up=s.up;
    out[0]=0;out[1]=0;if(i<1||j<1||i>=GW-2||j>=GH-2)return;
    for(b=0;b<2;b++)for(a=0;a<2;a++){ii=i+a;jj=j+b;c=jj*GW+ii;w=(a?fx:1-fx)*(b?fy:1-fy);
      v=u[c]-up[c];out[0]-=w*v*(u[c+1]-u[c-1])*.5;out[1]-=w*v*(u[c+GW]-u[c-GW])*.5}}
  function sdfAt(L,x,y){var gx=x/CELL-.5,gy=(y-OY)/CELL-.5,i=Math.floor(gx),j=Math.floor(gy),fx,fy,c;
    if(i<0)i=0;if(j<0)j=0;if(i>GW-2)i=GW-2;if(j>GH-2)j=GH-2;fx=gx-i;fy=gy-j;if(fx<0)fx=0;if(fx>1)fx=1;if(fy<0)fy=0;if(fy>1)fy=1;
    c=j*GW+i;var s=L.sdf;return s[c]*(1-fx)*(1-fy)+s[c+1]*fx*(1-fy)+s[c+GW]*(1-fx)*fy+s[c+GW+1]*fx*fy}
  function current(L,x,y,out){out[0]=0;out[1]=0;for(var k=0;k<L.whirls.length;k++){var w=L.whirls[k],dx=x-w[0],dy=y-w[1],d=Math.sqrt(dx*dx+dy*dy);
      if(d<w[2]&&d>1){var q=d/w[2],t=w[3]*q*(1-q)*4;out[0]+=(-dy/d)*t-dx/d*Math.abs(t)*.12;out[1]+=(dx/d)*t-dy/d*Math.abs(t)*.12}}}
  var F=[0,0],F2=[0,0],CUR=[0,0],OFF=[[0,0],[6,0],[-6,0],[0,6],[0,-6]];
  function body(s,L,px,py,vx,vy,rad,kf,isDuck){
    var fx=0,fy=0,k;for(k=0;k<5;k++){fluxAt(s,L,px+OFF[k][0],py+OFF[k][1],F2);fx+=F2[0];fy+=F2[1]}
    fx*=kf/5;fy*=kf/5;current(L,px,py,CUR);
    var ax=fx+DRAG*(CUR[0]-vx),ay=fy+DRAG*(CUR[1]-vy);
    if(isDuck){ax+=(L.duck[0]-px)*1.2;ay+=(L.duck[1]-py)*1.2}
    else{var kx=L.dock[0]-px,ky=L.dock[1]-py,kd=Math.sqrt(kx*kx+ky*ky);if(kd<CATCH&&kd>.5){var kp=PULL*(1-kd/CATCH)/kd;ax+=kx*kp;ay+=ky*kp}}
    vx+=ax*DT;vy+=ay*DT;var sp=Math.sqrt(vx*vx+vy*vy);if(sp>VMAX){vx*=VMAX/sp;vy*=VMAX/sp}
    px+=vx*DT;py+=vy*DT;
    var d=sdfAt(L,px,py),bump=0;
    if(d<rad){var e=1.5,nx=sdfAt(L,px+e,py)-sdfAt(L,px-e,py),ny=sdfAt(L,px,py+e)-sdfAt(L,px,py-e),nl=Math.sqrt(nx*nx+ny*ny);
      if(nl>1e-9){nx/=nl;ny/=nl;px+=nx*(rad-d);py+=ny*(rad-d);var vn=vx*nx+vy*ny;if(vn<0){vx-=1.5*vn*nx;vy-=1.5*vn*ny;bump=-vn}}}
    return [px,py,vx,vy,bump]}
  function step(s,L){
    if(s.st!=='run')return;
    var u=s.u,up=s.up,m=L.mask,i,j,c,n,q;
    /* 대기 중인 조약돌 */
    for(i=s.q.length-1;i>=0;i--){q=s.q[i];if(q[0]<=s.t){splash(s,L,q[1],q[2]);s.q.splice(i,1)}}
    for(j=1;j<GH-1;j++){c=j*GW;for(i=1;i<GW-1;i++){c=j*GW+i;
      if(!m[c]){up[c]=0;continue}
      n=u[c-1]+u[c+1]+u[c-GW]+u[c+GW]-4*u[c];up[c]=(2*u[c]-up[c]+KW*n)*DAMP}}
    s.u=up;s.up=u;
    var r=body(s,L,s.bx,s.by,s.bvx,s.bvy,BR,KF,false);s.bx=r[0];s.by=r[1];s.bvx=r[2];s.bvy=r[3];
    if(r[4]>25)s.ev.push({t:'b',v:r[4]});
    if(L.duck){r=body(s,L,s.dx,s.dy,s.dvx,s.dvy,DR,KF*.5,true);s.dx=r[0];s.dy=r[1];s.dvx=r[2];s.dvy=r[3];
      var ddx=s.bx-s.dx,ddy=s.by-s.dy;if(ddx*ddx+ddy*ddy<(BR+DR)*(BR+DR)){s.st='fail';s.why='duck';s.awake=1}}
    s.t++;
    var kx=s.bx-L.dock[0],ky=s.by-L.dock[1];if(kx*kx+ky*ky<DOCKR*DOCKR){s.st='win';return}
    if(s.st!=='run')return;
    if(s.used>=L.peb&&!s.q.length){var e=s.t-s.last,sp=s.bvx*s.bvx+s.bvy*s.bvy;
      if(e>CAP||(e>CALM&&sp<9)){s.st='fail';s.why='calm'}}}
  /* 조약돌 예약: 지금 손을 떼면 SPLASH 틱 뒤에 물에 닿는다 */
  function queue(s,L,x,y,delay){if(s.used+s.q.length>=L.peb||!canDrop(L,x,y))return false;s.q.push([s.t+(delay==null?SPLASH:delay),x,y]);return true}
  function pebLeft(s,L){return L.peb-s.used-s.q.length}
  function getLevel(n){if(n<LEVELS.length)return build(LEVELS[n]);var sd=GEN.length?GEN[(n-LEVELS.length)%GEN.length]:n;
    var L=build(genLevel(sd));L.n=n;return L}

  var CORE={LEVELS:LEVELS,GEN:GEN,genLevel:genLevel,build:build,makeState:makeState,clone:clone,step:step,queue:queue,splash:splash,
    canDrop:canDrop,pebLeft:pebLeft,getLevel:getLevel,sdfAt:sdfAt,W:W,H:H,CELL:CELL,GW:GW,GH:GH,OY:OY,N:N,BR:BR,DR:DR,DOCKR:DOCKR,SPLASH:SPLASH};
  if(typeof module!=='undefined'&&module.exports)module.exports=CORE;
  if(typeof SG==='undefined')return;
  /* ================= 게임 ================= */
  var lvN,L,s,acc,mode,modeT,time,warned,lastGain,cur,kbOn,initAt=0,tG=0,fallers,sprays,blinkT,blink,face,faceT,
      heading,tilt,duckFlap,prevBx,keyTap=false,dropReq=false,tries,clearPts,startPeb,trail;
  var keys={l:false,r:false,u:false,d:false};
  if(!window.__ripplePondKeys){window.__ripplePondKeys=true;
    var kf=function(e,v){var c=e.code;
      if(c==='ArrowLeft'||c==='KeyA')keys.l=v;else if(c==='ArrowRight'||c==='KeyD')keys.r=v;
      else if(c==='ArrowUp'||c==='KeyW'){keys.u=v;if(v)keyTap=true}else if(c==='ArrowDown'||c==='KeyS')keys.d=v;
      else if(c==='Space'||c==='Enter'){if(v){keyTap=true;if(!e.repeat&&performance.now()-initAt>200)dropReq=true}}};
    window.addEventListener('keydown',function(e){kf(e,true)});
    window.addEventListener('keyup',function(e){kf(e,false)});
    window.addEventListener('blur',function(){keys.l=keys.r=keys.u=keys.d=false})}
  var PENT=[0,2,4,7,9,12,14,16,19,21];
  function noteAt(x){return 392*Math.pow(2,PENT[Math.max(0,Math.min(9,Math.floor(x/36)))]/12)}
  function later(ms,f){setTimeout(f,ms)}

  function load(n){lvN=n;L=getLevel(n);s=makeState(L);acc=0;mode='play';modeT=0;fallers=[];sprays=[];tries=0;
    heading=1;tilt=0;duckFlap=0;prevBx=L.boat[0];trail=[];face='calm';faceT=0;bakeBase();
    cur.x=Math.max(30,Math.min(W-30,L.boat[0]));cur.y=Math.min(560,L.boat[1]+50)}
  function retry(a){tries++;s=makeState(L);acc=0;mode='play';modeT=0;fallers=[];face='calm';trail=[]}

  function init(a){time=45;warned=0;lastGain=0;cur={x:180,y:460};kbOn=false;initAt=performance.now();dropReq=false;keyTap=false;
    blinkT=2;blink=0;load(0);a.tempo(1);
    window.__ripple={go:function(n){load(n)},st:function(){return {t:s.t,st:s.st,bx:s.bx,by:s.by,lv:lvN,mode:mode,time:time,used:s.used,q:s.q.length}}}}

  function spent(){return s.used>=L.peb&&!s.q.length&&s.t-s.last>40&&s.bvx*s.bvx+s.bvy*s.bvy<400}
  function tryDrop(a,x,y){
    if(mode!=='play')return;
    if(pebLeft(s,L)<=0){if(spent()){retry(a);a.beep(523,.08,'sine')}return}
    if(!queue(s,L,x,y)){a.beep(180,.08,'triangle');a.pop(x,y-10,a.lang==='ko'?'여긴 안 돼요':'Not here','#fff');return}
    fallers.push({x:x,y:y,at:s.t+SPLASH});a.beep(1700,.025,'sine')}

  function update(dt,inp,a){
    var ko=a.lang==='ko',i,e;
    if(mode!=='clear'){time-=dt;if(time<=0){time=0;a.over();return}
      if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(660,.05,'sine')}}
    if(lastGain>0)lastGain-=dt;
    /* 입력 */
    if(keys.l||keys.r||keys.u||keys.d)kbOn=true;
    var sp=200*dt;if(keys.l)cur.x-=sp;if(keys.r)cur.x+=sp;if(keys.u)cur.y-=sp;if(keys.d)cur.y+=sp;
    cur.x=Math.max(8,Math.min(W-8,cur.x));cur.y=Math.max(OY+40,Math.min(H-40,cur.y));
    if(inp.tap&&!keyTap&&inp.x!=null){kbOn=false;tryDrop(a,inp.x,inp.y)}
    if(dropReq){dropReq=false;kbOn=true;tryDrop(a,cur.x,cur.y)}
    keyTap=false;
    /* 시뮬레이션: 고정 60Hz */
    if(mode==='play'){acc+=dt;var n=0;
      while(acc>=DT&&n<4&&s.st==='run'){step(s,L);acc-=DT;n++;
        for(i=0;i<s.ev.length;i++){e=s.ev[i];
          if(e.t==='s'){var f=noteAt(e.x);a.beep(f,.5,'sine');later(60,function(){a.beep(f*2,.22,'sine')});
            for(var k=0;k<10;k++){var an=k/10*6.283+Math.random()*.4,v=30+Math.random()*50;
              sprays.push({x:e.x,y:e.y,vx:Math.cos(an)*v,vy:Math.sin(an)*v*.6,z:0,vz:60+Math.random()*60,l:0})}}
          else if(e.t==='b'){a.beep(150+e.v,.07,'triangle');face='oops';faceT=.6}}
        s.ev.length=0}
      if(n>=4)acc=0;
      for(i=fallers.length-1;i>=0;i--)if(fallers[i].at<=s.t)fallers.splice(i,1);
      var spd=Math.sqrt(s.bvx*s.bvx+s.bvy*s.bvy);
      if(spd>55&&face!=='oops'){face='whee';faceT=.4}
      if(L.duck){var dd=Math.sqrt((s.bx-s.dx)*(s.bx-s.dx)+(s.by-s.dy)*(s.by-s.dy));if(dd<60&&face==='calm'){face='worry';faceT=.3}}
      if(s.st==='win'){mode='clear';modeT=0;
        var left=L.peb-s.used,pts=10+left*5+(tries===0?5:0);clearPts=pts;a.add(pts);time=Math.min(60,time+12);lastGain=1.2;
        a.sfx('win');[0,2,4,7,9,12].forEach(function(p,j){later(80+j*90,function(){a.beep(523*Math.pow(2,p/12),.35,'sine')})});
        ['#ff9ec4','#ffd6e6','#fff2a8','#9be3c0'].forEach(function(c){a.burst(L.dock[0],L.dock[1]-6,c,8)});
        a.pop(L.dock[0],L.dock[1]-34,'+'+pts,'#fff6a8');
        if(left>0)a.pop(L.dock[0],L.dock[1]-58,(ko?'조약돌 ':'Pebbles ')+'+'+left*5,'#d8f6ff');
        face='joy';a.tempo(1+Math.min(.4,(lvN+1)*.03))}
      else if(s.st==='fail'){mode='fail';modeT=0;
        if(s.why==='duck'){a.beep(560,.08,'sawtooth');later(90,function(){a.beep(430,.12,'sawtooth')});a.shake(7);duckFlap=1.2;
          a.burst(s.dx,s.dy-10,'#ffffff',10);a.pop(s.dx,s.dy-30,ko?'꽥!':'Quack!','#ffe066');face='sad'}
        else{a.beep(330,.22,'sine');later(160,function(){a.beep(247,.35,'sine')});a.pop(s.bx,s.by-30,ko?'다시!':'Again!','#d8f6ff');face='sad'}}}
    else if(mode==='clear'){modeT+=dt;if(modeT>1.5)load(lvN+1)}
    else if(mode==='fail'){modeT+=dt;if(modeT>1.1)retry(a)}
    if(faceT>0){faceT-=dt;if(faceT<=0&&mode==='play')face='calm'}
    /* 눈 깜빡임 */
    blinkT-=dt;if(blinkT<0){blink=.14;blinkT=2+Math.random()*3}if(blink>0)blink-=dt;
    for(i=sprays.length-1;i>=0;i--){var p=sprays[i];p.l+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vz-=320*dt;p.z+=p.vz*dt;if(p.z<0||p.l>1)sprays.splice(i,1)}
    if(duckFlap>0)duckFlap-=dt}

  /* ---------- 물 렌더링 (격자 → 3px 이미지) ---------- */
  var WP=3,IW=120,IH=200,wc=null,wx=null,img=null,base=null,GXc=new Float32Array(N),GYc=new Float32Array(N),LAP=new Float32Array(N),
      NT=null,NS=64,land=null;
  function noiseTex(){NT=[new Float32Array(NS*NS),new Float32Array(NS*NS),new Float32Array(NS*NS)];
    for(var k=0;k<3;k++){var sc=k===2?16:8,i,j,c;
      for(j=0;j<NS;j++)for(i=0;i<NS;i++){var gi=Math.floor(i/sc),gj=Math.floor(j/sc),fx=i/sc-gi,fy=j/sc-gj,m=NS/sc;
        fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
        function h(a,b){return hs(((a%m+m)%m)*73+((b%m+m)%m)*9157+k*99991)}
        var v=h(gi,gj)*(1-fx)*(1-fy)+h(gi+1,gj)*fx*(1-fy)+h(gi,gj+1)*(1-fx)*fy+h(gi+1,gj+1)*fx*fy;NT[k][j*NS+i]=v}}}
  function tex(k,x,y){var i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,t=NT[k];i=((i%NS)+NS)%NS;j=((j%NS)+NS)%NS;var i2=(i+1)%NS,j2=(j+1)%NS;
    return t[j*NS+i]*(1-fx)*(1-fy)+t[j*NS+i2]*fx*(1-fy)+t[j2*NS+i]*(1-fx)*fy+t[j2*NS+i2]*fx*fy}
  function bil(arr,gx,gy){var i=Math.floor(gx),j=Math.floor(gy);if(i<0)i=0;if(j<0)j=0;if(i>GW-2)i=GW-2;if(j>GH-2)j=GH-2;
    var fx=gx-i,fy=gy-j,c=j*GW+i;if(fx<0)fx=0;if(fx>1)fx=1;if(fy<0)fy=0;if(fy>1)fy=1;
    return arr[c]*(1-fx)*(1-fy)+arr[c+1]*fx*(1-fy)+arr[c+GW]*(1-fx)*fy+arr[c+GW+1]*fx*fy}
  function bakeBase(){if(typeof document==='undefined')return;
    if(!wc){wc=document.createElement('canvas');wc.width=IW;wc.height=IH;wx=wc.getContext('2d');img=wx.createImageData(IW,IH);base=new Float32Array(IW*IH*4);noiseTex()}
    var wetF=new Float32Array(N),i,j;for(i=0;i<N;i++)wetF[i]=L.wet[i];
    for(j=0;j<IH;j++)for(i=0;i<IW;i++){var x=i*WP+1.5,y=OY+j*WP+1.5,gx=x/CELL-.5,gy=(y-OY)/CELL-.5,w=bil(wetF,gx,gy),
        dep=Math.max(0,Math.min(1,(sdfBank(x,y))/70)),o=(j*IW+i)*4,vy=j/IH;
      /* 깊을수록 진한 청록, 얕은 가장자리는 연한 옥색 */
      var r=120-70*dep-10*vy,g=196-60*dep-14*vy,b=186-30*dep+6*vy;
      var sh2=Math.max(0,Math.min(1,(sdfBank(x,y)+4)/14));r=r*sh2+136*(1-sh2);g=g*sh2+160*(1-sh2);b=b*sh2+118*(1-sh2);
      base[o]=r;base[o+1]=g;base[o+2]=b;base[o+3]=255}
    land=null}
  function sdfBank(x,y){var gx=x/CELL-.5,gy=(y-OY)/CELL-.5;var v=sdfAt(L,x,y);return v}
  function drawWater(g,t){
    var u=s.u,i,j,c,d=img.data;
    for(j=1;j<GH-1;j++)for(i=1;i<GW-1;i++){c=j*GW+i;GXc[c]=(u[c+1]-u[c-1])*.5;GYc[c]=(u[c+GW]-u[c-GW])*.5;LAP[c]=u[c-1]+u[c+1]+u[c-GW]+u[c+GW]-4*u[c]}
    var ox1=t*1.6,oy1=t*1.1,ox2=-t*1.3,oy2=t*1.7,cx=t*.9;
    for(j=0;j<IH;j++){var y=OY+j*WP+1.5,gy=(y-OY)/CELL-.5;
      for(i=0;i<IW;i++){var o=(j*IW+i)*4;
        var x=i*WP+1.5,gx=x/CELL-.5,ddx=bil(GXc,gx,gy),ddy=bil(GYc,gx,gy),lap=bil(LAP,gx,gy);
        /* 굴절된 좌표로 잔잔한 물빛 무늬와 구름 반사를 샘플링 */
        var rx=i*.5+ddx*6,ry=j*.5+ddy*6,
            n1=tex(0,rx+ox1,ry+oy1),n2=tex(1,rx+ox2,ry+oy2),caus=1-Math.abs(n1-n2)*6;caus=caus>0?caus*caus*caus:0;
        var cl=tex(2,(i+ddx*10)*.35+cx,(j+ddy*10)*.35)-.52;cl=cl>0?cl*2.4:0;
        var sh=(-ddx*.55-ddy*.85)*6.5;sh=sh>2.6?2.6:sh<-2.6?-2.6:sh;var spec=sh>1.3?(sh-1.3)*42:0,foc=lap<0?-lap*18:0;foc=foc>40?40:foc;
        var lit=sh*14+caus*22+cl*70+spec+foc;
        d[o]=base[o]+lit;d[o+1]=base[o+1]+lit*1.02;d[o+2]=base[o+2]+lit*.95+caus*6;d[o+3]=base[o+3]}}
    wx.putImageData(img,0,0);g.imageSmoothingEnabled=true;g.drawImage(wc,0,OY,W,IH*WP)}

  /* ---------- 땅(둑) ---------- */
  function drawLand(g,t){
    if(!land){land=document.createElement('canvas');land.width=W;land.height=H;var p=land.getContext('2d'),i;
      var gr=p.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#6fae6a');gr.addColorStop(.5,'#5d9e5e');gr.addColorStop(1,'#4f8f57');
      p.fillStyle=gr;p.fillRect(0,0,W,H);
      for(i=0;i<900;i++){var x=hs(i*3+1)*W,y=hs(i*3+2)*H,c=hs(i*3+3);p.fillStyle=c<.5?'rgba(255,255,220,.07)':'rgba(20,60,30,.09)';
        p.beginPath();p.ellipse(x,y,2+c*4,1+c*2,c*3,0,7);p.fill()}
      for(i=0;i<26;i++){var fx=hs(i+500)*W,fy=hs(i+600)*H;if(inWater(fx,fy)||inWater(fx,fy+14)||inWater(fx,fy-14)||inWater(fx-14,fy)||inWater(fx+14,fy))continue;
        if(fy<34||(fx>300&&fy>590))continue;
        var col=['#fff7d6','#ffd1e3','#fff0a0','#d9ecff'][i%4];p.fillStyle=col;
        for(var k=0;k<5;k++){p.beginPath();p.arc(fx+Math.cos(k*1.256)*3,fy+Math.sin(k*1.256)*3,2.3,0,7);p.fill()}
        p.fillStyle='#f2b84b';p.beginPath();p.arc(fx,fy,1.6,0,7);p.fill()}
      /* 물 자리를 부드럽게 오려 내고, 가장자리에 젖은 흙 테두리 */
      var im=p.getImageData(0,0,W,H),d=im.data,x2,y2;
      for(y2=80;y2<610;y2++)for(x2=0;x2<W;x2++){
        var cov=(inWater(x2+.25,y2+.25)+inWater(x2+.75,y2+.25)+inWater(x2+.25,y2+.75)+inWater(x2+.75,y2+.75))/4,o=(y2*W+x2)*4;
        if(cov<1){var nr=0;for(var r2=2;r2<=8;r2+=3){if(inWater(x2+r2,y2)||inWater(x2-r2,y2)||inWater(x2,y2+r2)||inWater(x2,y2-r2)){nr=1-(r2-2)/9;break}}
          if(nr>0){d[o]=d[o]*(1-nr)+92*nr;d[o+1]=d[o+1]*(1-nr)+84*nr;d[o+2]=d[o+2]*(1-nr)+52*nr}}
        d[o+3]=255*(1-cov)}
      p.putImageData(im,0,0)}
    g.drawImage(land,0,0)}
  function drawGrassTufts(g,t){ /* 물가 풀잎: 바람에 살랑 */
    g.lineCap='round';
    for(var i=0;i<60;i++){var u=hs(i+700),x,y;
      if(i<20){x=8+u*344;y=90+wob(x,3)*10-3}else if(i<40){x=8+u*344;y=594-wob(x,4)*10+6}
      else if(i<50){y=110+u*460;x=14+wob(y,1)*10-3}else{y=110+u*460;x=346-wob(y,2)*10+3}
      if(x>300&&y>580)continue;
      var sw=Math.sin(t*1.3+i*.9)*2.5,hgt=7+hs(i+800)*8;
      g.strokeStyle=i%3?'rgba(70,140,70,.95)':'rgba(110,170,90,.95)';g.lineWidth=2;
      g.beginPath();g.moveTo(x,y+3);g.quadraticCurveTo(x+sw*.4,y-hgt*.5,x+sw,y-hgt);g.stroke();
      g.beginPath();g.moveTo(x+3,y+3);g.quadraticCurveTo(x+3+sw*.3,y-hgt*.3,x+5+sw,y-hgt*.7);g.stroke()}}

  /* ---------- 사물 ---------- */
  function drawRock(g,o,i){var x=o[0],y=o[1],r=o[2];
    g.fillStyle='rgba(10,40,40,.28)';g.beginPath();g.ellipse(x+5,y+7,r*1.02,r*.95,0,0,7);g.fill();
    var gr=g.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r*1.05);gr.addColorStop(0,'#c9c4bb');gr.addColorStop(.6,'#958f87');gr.addColorStop(1,'#6b6660');
    g.fillStyle=gr;g.beginPath();
    for(var k=0;k<=12;k++){var a=k/12*6.283,rr=r*(.92+hs(i*31+k%12)*.12);if(k)g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);else g.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}
    g.closePath();g.fill();g.strokeStyle='rgba(60,55,50,.5)';g.lineWidth=1.5;g.stroke();
    g.fillStyle='rgba(120,170,90,.55)';g.beginPath();g.ellipse(x-r*.25,y-r*.5,r*.4,r*.18,-.3,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(x-r*.4,y-r*.3,r*.18,r*.1,-.6,0,7);g.fill()}
  function drawPad(g,o,i,t){var x=o[0],y=o[1],r=o[2],a0=hs(i*17+3)*6.283,bob=Math.sin(t*1.2+i)*.8;
    g.fillStyle='rgba(10,50,40,.25)';g.beginPath();g.arc(x+4,y+5,r,0,7);g.fill();
    g.fillStyle='#4fa25a';g.beginPath();g.moveTo(x,y+bob);g.arc(x,y+bob,r,a0+.28,a0+6.0);g.closePath();g.fill();
    g.fillStyle='#63b86a';g.beginPath();g.moveTo(x,y+bob);g.arc(x,y+bob,r*.86,a0+.32,a0+5.96);g.closePath();g.fill();
    g.strokeStyle='rgba(40,110,50,.55)';g.lineWidth=1.2;g.beginPath();
    for(var k=1;k<8;k++){var a=a0+.3+k*.72;g.moveTo(x,y+bob);g.lineTo(x+Math.cos(a)*r*.82,y+bob+Math.sin(a)*r*.82)}g.stroke();
    g.fillStyle='rgba(255,255,255,.16)';g.beginPath();g.ellipse(x-r*.3,y+bob-r*.35,r*.35,r*.15,-.4,0,7);g.fill()}
  function drawReeds(g,o,i,t){var x1=o[0],y1=o[1],x2=o[2],y2=o[3],len=Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1)),n=Math.max(2,Math.floor(len/7)),k;
    g.strokeStyle='rgba(60,100,60,.35)';g.lineWidth=o[4]+4;g.lineCap='round';g.beginPath();g.moveTo(x1+3,y1+4);g.lineTo(x2+3,y2+4);g.stroke();
    g.strokeStyle='#5b8a4a';g.lineWidth=o[4];g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
    for(k=0;k<=n;k++){var f=k/n,x=x1+(x2-x1)*f+(hs(i*50+k)-.5)*5,y=y1+(y2-y1)*f+(hs(i*50+k+9)-.5)*5,sw=Math.sin(t*1.5+k*.7+i)*2.2,h=16+hs(i*70+k)*12;
      g.strokeStyle=k%2?'#3f7d3d':'#5c9a4a';g.lineWidth=2;g.beginPath();g.moveTo(x,y+2);g.quadraticCurveTo(x+sw*.3,y-h*.5,x+sw,y-h);g.stroke();
      if(k%3===0){g.fillStyle='#8a5a34';g.beginPath();g.ellipse(x+sw*.9,y-h+3,2.4,5,sw*.05,0,7);g.fill()}}}
  function drawWhirl(g,o,t){var x=o[0],y=o[1],r=o[2],dir=o[3]>0?1:-1,k,rot=dir*t*Math.abs(o[3])/r*.9;
    g.save();g.translate(x,y);g.lineCap='round';
    var gr=g.createRadialGradient(0,0,2,0,0,r);gr.addColorStop(0,'rgba(10,50,70,.32)');gr.addColorStop(.5,'rgba(20,80,90,.12)');gr.addColorStop(1,'rgba(20,80,90,0)');
    g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,7);g.fill();
    for(k=0;k<4;k++){g.strokeStyle='rgba(225,250,245,.38)';g.lineWidth=2.2;g.beginPath();
      for(var q=0;q<=24;q++){var f=q/24,rr=r*(.12+.8*f),a=rot+k*1.571+dir*f*2.6;if(q)g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);else g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}g.stroke()}
    for(k=0;k<10;k++){var ph=(hs(k+40)+t*.3)%1,a0=hs(k+80)*6.283+rot*1.3,rr2=r*(.25+.7*hs(k+120));
      g.strokeStyle='rgba(255,255,255,'+(.4*Math.sin(ph*3.14))+')';g.lineWidth=1.6;g.beginPath();g.arc(0,0,rr2,a0,a0+dir*.7,dir<0);g.stroke()}
    g.restore()}
  function drawDock(g,t){var x=L.dock[0],y=L.dock[1],p=1+Math.sin(t*2.2)*.06;
    if(mode!=='clear'){g.strokeStyle='rgba(255,236,170,'+(.45+.25*Math.sin(t*2.2))+')';g.lineWidth=2.5;g.setLineDash([6,6]);g.lineDashOffset=-t*10;
      g.beginPath();g.arc(x,y,DOCKR+4*p,0,7);g.stroke();g.setLineDash([]);g.lineDashOffset=0}
    g.fillStyle='rgba(10,50,40,.25)';g.beginPath();g.ellipse(x+4,y+6,30,13,0,0,7);g.fill();
    g.fillStyle='#4f9e57';g.beginPath();g.ellipse(x,y+3,30,12,0,0,7);g.fill();g.fillStyle='#69b86c';g.beginPath();g.ellipse(x,y+1,26,9.5,0,0,7);g.fill();
    /* 연꽃 */
    var fx=x+14,fy=y-4;
    for(var k=0;k<7;k++){var a=-1.57+(k-3)*.42,len=13+(k%2?0:3);g.save();g.translate(fx,fy);g.rotate(a);
      var gr=g.createLinearGradient(0,0,0,-len);gr.addColorStop(0,'#ffd8e8');gr.addColorStop(1,'#ff86b4');g.fillStyle=gr;
      g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(-6,-len*.55,0,-len);g.quadraticCurveTo(6,-len*.55,0,0);g.fill();g.restore()}
    g.fillStyle='#ffe27a';g.beginPath();g.ellipse(fx,fy-1,4,2.6,0,0,7);g.fill()}
  function drawDuck(g,t){var x=s.dx,y=s.dy,aw=s.awake||duckFlap>0,bob=Math.sin(t*1.4)*1.2;
    g.fillStyle='rgba(10,50,40,.25)';g.beginPath();g.ellipse(x+4,y+8,15,7,0,0,7);g.fill();
    g.save();g.translate(x,y+bob);
    g.fillStyle='#fffaf0';g.strokeStyle='#d9cdb8';g.lineWidth=1.5;g.beginPath();g.ellipse(0,0,15,10,0,0,7);g.fill();g.stroke();
    g.fillStyle='#f1e6d2';g.beginPath();g.ellipse(-8,-2,7,4,.4,0,7);g.fill();
    if(aw){var fl=Math.sin(t*30)*6;g.fillStyle='#fffaf0';g.beginPath();g.ellipse(-4,-8-fl,9,4,-.6,0,7);g.fill();g.stroke();
      g.beginPath();g.arc(9,-12,7,0,7);g.fill();g.stroke();g.fillStyle='#ff9f2e';g.beginPath();g.moveTo(15,-13);g.lineTo(22,-10);g.lineTo(15,-8);g.fill();
      g.fillStyle='#2b2320';g.beginPath();g.arc(10,-14,1.8,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(10.5,-14.6,.6,0,7);g.fill()}
    else{g.fillStyle='#fffaf0';g.beginPath();g.arc(8,-5,7,0,7);g.fill();g.stroke();
      g.fillStyle='#ff9f2e';g.beginPath();g.ellipse(4,-1,5,2.2,.5,0,7);g.fill();
      g.strokeStyle='#2b2320';g.lineWidth=1.3;g.beginPath();g.arc(10,-6,2,.2,2.9);g.stroke();
      g.fillStyle='rgba(255,140,150,.5)';g.beginPath();g.arc(12,-3,1.8,0,7);g.fill()}
    g.restore();
    if(!aw){g.fillStyle='rgba(255,255,255,.85)';for(var i=0;i<3;i++){var zp=(t*.45+i/3)%1;g.globalAlpha=(1-zp)*.9;
      g.font=(9+zp*7)+'px Jua, system-ui, sans-serif';g.textAlign='left';g.fillText('z',x+14+zp*10,y-14-zp*22)}g.globalAlpha=1}}
  /* 종이배 + 개구리 퐁이 */
  function drawBoat(g,x,y,t,alpha){
    var sp=Math.sqrt(s.bvx*s.bvx+s.bvy*s.bvy);
    if(sp>6)heading=s.bvx>=0?1:-1;
    g.save();g.globalAlpha=alpha;
    /* 물 위 그림자와 물살 고리 */
    g.fillStyle='rgba(10,45,45,.28)';g.beginPath();g.ellipse(x+4,y+7,17,6.5,0,0,7);g.fill();
    g.strokeStyle='rgba(255,255,255,'+(.25+Math.min(.4,sp/200))+')';g.lineWidth=1.5;g.beginPath();g.ellipse(x,y+3,19+Math.sin(t*3)*1.2,7,0,0,7);g.stroke();
    g.translate(x,y);g.rotate(tilt);g.scale(heading*1.2,1.2);
    /* 선체 */
    g.fillStyle='#f4f1ea';g.strokeStyle='#b9b2a3';g.lineWidth=1.3;
    g.beginPath();g.moveTo(-18,-4);g.lineTo(18,-4);g.lineTo(11,5);g.lineTo(-11,5);g.closePath();g.fill();g.stroke();
    g.fillStyle='#e2ddd1';g.beginPath();g.moveTo(-11,5);g.lineTo(11,5);g.lineTo(8,1);g.lineTo(-8,1);g.closePath();g.fill();
    /* 개구리 (돛 앞) */
    var fx=6,fy=-6,j=face==='joy'?-Math.abs(Math.sin(t*10))*4:0;fy+=j;
    g.fillStyle='#6cc46a';g.strokeStyle='#3d8a45';g.lineWidth=1.2;
    g.beginPath();g.ellipse(fx,fy,6.5,5,0,0,7);g.fill();g.stroke();
    g.beginPath();g.arc(fx-3,fy-4.5,3,0,7);g.arc(fx+3.2,fy-4.5,3,0,7);g.fill();g.stroke();
    var bl=blink>0&&face!=='joy'&&face!=='whee';
    g.fillStyle='#fff';g.beginPath();g.arc(fx-3,fy-4.6,2.1,0,7);g.arc(fx+3.2,fy-4.6,2.1,0,7);g.fill();
    g.strokeStyle='#22301f';g.fillStyle='#22301f';g.lineWidth=1.2;
    if(face==='joy'){g.beginPath();g.arc(fx-3,fy-4,1.4,3.4,6.0);g.stroke();g.beginPath();g.arc(fx+3.2,fy-4,1.4,3.4,6.0);g.stroke()}
    else if(bl){g.beginPath();g.moveTo(fx-4.4,fy-4.5);g.lineTo(fx-1.6,fy-4.5);g.moveTo(fx+1.8,fy-4.5);g.lineTo(fx+4.6,fy-4.5);g.stroke()}
    else{var er=face==='whee'||face==='oops'?1.4:1;g.beginPath();g.arc(fx-2.6,fy-4.5,er,0,7);g.arc(fx+3.6,fy-4.5,er,0,7);g.fill()}
    if(face==='sad'||face==='worry'){g.beginPath();g.arc(fx+.5,fy+2.6,2,3.5,5.9);g.stroke()}
    else if(face==='whee'||face==='oops'){g.beginPath();g.ellipse(fx+.5,fy+1.2,1.5,1.8,0,0,7);g.fill()}
    else{g.beginPath();g.arc(fx+.5,fy-.2,2.4,.4,2.7);g.stroke()}
    g.fillStyle='rgba(255,120,140,.5)';g.beginPath();g.arc(fx-4.5,fy,1.2,0,7);g.arc(fx+5.5,fy,1.2,0,7);g.fill();
    if(face==='worry'){g.fillStyle='#bfe8ff';g.beginPath();g.ellipse(fx+8,fy-6,1.4,2.2,0,0,7);g.fill()}
    /* 종이 돛 */
    g.fillStyle='#fffdf8';g.strokeStyle='#b9b2a3';g.lineWidth=1.2;g.beginPath();g.moveTo(-12,-4);g.lineTo(-3,-22);g.lineTo(2,-4);g.closePath();g.fill();g.stroke();
    g.fillStyle='#ece7dc';g.beginPath();g.moveTo(-3,-22);g.lineTo(2,-4);g.lineTo(-3,-4);g.closePath();g.fill();
    g.restore()}

  function drawStone(g,x,y,r,col){g.fillStyle=col||'#9a948b';g.beginPath();g.ellipse(x,y,r,r*.78,0,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(x-r*.3,y-r*.3,r*.35,r*.2,-.5,0,7);g.fill()}

  var DECO=null;
  function draw(g,a,dt){
    dt=dt||0;tG+=dt;var t=tG,ko=a.lang==='ko',i;
    if(!L)return;
    if(!wc)bakeBase();
    drawWater(g,t);
    drawLand(g,t);
    /* 떠다니는 꽃잎 (움직이는 층) */
    if(!DECO){DECO=[];for(i=0;i<9;i++)DECO.push({x:hs(i+900)*W,y:110+hs(i+950)*460,a:hs(i+990)*6,v:3+hs(i+1010)*5})}
    for(i=0;i<DECO.length;i++){var p=DECO[i],px=(p.x+t*p.v)%(W+20)-10,py=p.y+Math.sin(t*.5+p.a)*8;
      if(!inWater(px,py))continue;var gx=px/CELL-.5,gy=(py-OY)/CELL-.5,du=bil(GXc,gx,gy),dv=bil(GYc,gx,gy);
      g.save();g.translate(px-du*4,py-dv*4);g.rotate(p.a+t*.2);g.fillStyle='rgba(255,200,220,.85)';g.beginPath();g.ellipse(0,0,4,2.2,0,0,7);g.fill();g.restore()}
    for(i=0;i<L.whirls.length;i++)drawWhirl(g,L.whirls[i],t);
    for(i=0;i<L.pads.length;i++)drawPad(g,L.pads[i],i,t);
    for(i=0;i<L.rocks.length;i++)drawRock(g,L.rocks[i],i);
    drawDock(g,t);
    /* 떨어지는 조약돌 */
    for(i=0;i<fallers.length;i++){var f=fallers[i],k=Math.max(0,(f.at-s.t-acc/DT)/SPLASH);
      g.fillStyle='rgba(10,40,40,'+(.35*(1-k*.6))+')';g.beginPath();g.ellipse(f.x,f.y,4+k*4,2.5+k*2,0,0,7);g.fill();
      drawStone(g,f.x,f.y-k*70,4+k*3)}
    /* 물보라 */
    for(i=0;i<sprays.length;i++){var q=sprays[i];g.fillStyle='rgba(235,252,255,'+(.9-q.l*.8)+')';g.beginPath();g.arc(q.x,q.y-q.z,1.8,0,7);g.fill()}
    /* 오리·배 (아래쪽부터) */
    var bx=s.bx,by=s.by,gxB=bx/CELL-.5,gyB=(by-OY)/CELL-.5,slope=bil(GXc,gxB,gyB);
    tilt+=(Math.max(-.35,Math.min(.35,slope*.25+s.bvx*.0015))-tilt)*Math.min(1,dt*8);
    var bob=bil(s.u,gxB,gyB)*.6;
    if(mode==='clear'){var e=Math.min(1,modeT/.5);bx+= (L.dock[0]-bx)*e;by+=(L.dock[1]-6-by)*e}
    if(L.duck&&s.dy<by)drawDuck(g,t);
    drawBoat(g,bx,by+bob,t,mode==='fail'&&modeT>.7?Math.max(0,1-(modeT-.7)/.4):1);
    if(L.duck&&s.dy>=by)drawDuck(g,t);
    for(i=0;i<L.reeds.length;i++)drawReeds(g,L.reeds[i],i,t);
    drawGrassTufts(g,t);
    /* 키보드 조준 */
    if(kbOn&&mode==='play'){var ok=canDrop(L,cur.x,cur.y);g.strokeStyle=ok?'rgba(255,255,255,.9)':'rgba(255,140,140,.9)';g.lineWidth=2;
      g.beginPath();g.arc(cur.x,cur.y,9+Math.sin(t*5)*1.5,0,7);g.stroke();g.beginPath();g.moveTo(cur.x-14,cur.y);g.lineTo(cur.x-6,cur.y);
      g.moveTo(cur.x+6,cur.y);g.lineTo(cur.x+14,cur.y);g.moveTo(cur.x,cur.y-14);g.lineTo(cur.x,cur.y-6);g.moveTo(cur.x,cur.y+6);g.lineTo(cur.x,cur.y+14);g.stroke()}
    /* 위 띠: 조약돌, 시간, 연못 번호 */
    g.fillStyle='rgba(30,70,40,.35)';g.fillRect(0,0,W,34);
    var left=pebLeft(s,L);
    for(i=0;i<L.peb;i++){var sx=22+i*25,sy=58;g.fillStyle='rgba(20,50,30,.4)';g.beginPath();g.ellipse(sx+2,sy+4,10,6.5,0,0,7);g.fill();
      if(i<left){drawStone(g,sx,sy,10,'#e8e1d4');g.strokeStyle='#6d665c';g.lineWidth=1.5;g.beginPath();g.ellipse(sx,sy,10,7.8,0,0,7);g.stroke()}
      else{g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.5;g.setLineDash([3,3]);g.beginPath();g.ellipse(sx,sy,9,7,0,0,7);g.stroke();g.setLineDash([])}}
    var tw=Math.ceil(time),low=time<10;g.textAlign='right';g.font=(low?21+Math.sin(t*12)*2:19)+'px Jua, system-ui, sans-serif';
    g.fillStyle='rgba(20,50,30,.4)';g.fillText('⏱ '+tw,W-11,64);g.fillStyle=lastGain>0?'#fff6a8':(low?'#ffb3a8':'#ffffff');g.fillText('⏱ '+tw,W-12,62);
    if(lastGain>0){g.font='13px Jua, system-ui, sans-serif';g.fillStyle='#fff6a8';g.globalAlpha=Math.min(1,lastGain);g.fillText('+12',W-14,80);g.globalAlpha=1}
    g.textAlign='center';g.font='16px Jua, system-ui, sans-serif';g.fillStyle='rgba(20,50,30,.4)';
    var lbl=(ko?'연못 ':'Pond ')+(lvN+1);g.fillText(lbl,W/2+1,63);g.fillStyle='#fff';g.fillText(lbl,W/2,62);
    /* 아래 안내 */
    var msg=null;
    if(mode==='play'&&spent())msg=ko?'탭하면 다시 시작':'Tap to retry';
    else if(L.hint&&mode==='play'&&tries<2)msg=L.hint[ko?'ko':'en'];
    else if(kbOn&&mode==='play')msg=ko?'방향키로 조준 · 스페이스로 퐁':'Arrows aim · Space drops';
    if(msg){g.font='15px Jua, system-ui, sans-serif';g.textAlign='center';var wd=g.measureText(msg).width+22;
      g.fillStyle='rgba(20,55,35,.55)';g.beginPath();g.rect(W/2-wd/2-20,605,wd,26);g.fill();
      g.fillStyle='#fffbe8';g.fillText(msg,W/2-20,623)}
    if(mode==='clear'&&modeT>.2){g.font='26px Jua, system-ui, sans-serif';g.textAlign='center';g.globalAlpha=Math.min(1,(modeT-.2)*3);
      g.fillStyle='rgba(20,55,35,.45)';g.fillText(ko?'도착!':'Docked!',W/2+2,332);g.fillStyle='#fff6d8';g.fillText(ko?'도착!':'Docked!',W/2,330);g.globalAlpha=1}
  }

  SG.run({id:'ripple-pond',title:{ko:'연못 물결',en:'Ripple Pond'},
    how:{ko:'배는 만질 수 없어요. 물을 톡 쳐서 조약돌을 떨어뜨리면 물결이 개구리 퐁이의 종이배를 연꽃 선착장까지 밀어 줘요. (PC: 방향키 + 스페이스)',
         en:'You can\'t touch the boat. Tap the water to drop a pebble — the ripples push Pong the frog\'s paper boat to the lotus dock. (PC: arrows + Space)'},
    init:init,update:update,draw:draw});
})();
