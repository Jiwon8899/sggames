  /* ================= 코어 시뮬레이션 (DOM 없이 동작, 고정 스텝, 결정적) ================= */
  var E=(typeof process!=='undefined'&&process.env)||{},RTW=+E.RTW||140,RGP=+E.RGP||70,RS=+E.RS||5200,RD=+E.RD||75;
  var DT=1/120,WALK=100,G=900,R=11,FY=380,WB=FY+78,CH=150,CR=13,DR=9;
  function mul32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  /* ---- 레벨 조립 도구 ---- */
  function newL(){return {x:0,solids:[],mags:[],spikes:[],pits:[],crates:[],bolts:[],drone:null,hint:null,len:0,par:1}}
  function flat(L,w){L.solids.push({x:L.x,y:FY,w:w,h:100});L.x+=w}
  function pit(L,w){L.pits.push({x:L.x,w:w});L.x+=w}
  function mag(L,o){var m={x:o.x,y:o.y,w:o.w,h:o.h||18,p:o.p,S:o.S,d0:o.d0,R:o.R,k:o.k,mv:o.mv||null,pu:o.pu||null};L.mags.push(m);return m}
  function padM(L,w,p,pu){mag(L,{x:L.x,y:FY,w:w,p:p,S:2700,d0:40,R:180,k:'pad',pu:pu});L.solids.push({x:L.x,y:FY+18,w:w,h:82});L.x+=w}
  function gird(L,x0,x1){L.solids.push({x:x0,y:-90,w:x1-x0,h:FY-CH+90,gd:1})}
  function ceilM(L,x,w,p,o){o=o||{};if(o.mv)return mag(L,{x:x,y:-90,w:w,h:FY-CH+90,p:p,S:5200,d0:75,R:235,k:'tram',mv:o.mv});
    if(!o.ng)gird(L,x-64,x+w+64);return mag(L,{x:x,y:FY-CH-18,w:w,p:p,S:5200,d0:75,R:235,k:'ceil',pu:o.pu})}
  function bolt(L,x,y){L.bolts.push({x:x,y:y})}

  /* ---- 청크: 모두 바닥에서 시작해 바닥에서 끝난다. p=자석 극(+1 N, -1 S) ---- */
  var CHUNK={
    pad:function(L,p,r){var g=92+Math.floor(r()*4)*8;flat(L,40);padM(L,64,p);bolt(L,L.x+g*.5,FY-96);pit(L,g);flat(L,70)},
    ceil:function(L,p,r){var n=150+Math.floor(r()*4)*30;flat(L,60);var x0=L.x;flat(L,n);
      L.spikes.push({x:x0+24,y:FY-12,w:n-60,h:12});ceilM(L,x0-56,n+50,p);bolt(L,x0+n*.5,FY-CH+26);flat(L,70)},
    drop:function(L,p,r){var g=110+Math.floor(r()*3)*20;flat(L,60);var x0=L.x;pit(L,g);flat(L,210);
      ceilM(L,x0-56,g+56+110,p);L.solids.push({x:x0+g+110,y:FY-CH-18,w:26,h:CH+18-46});bolt(L,x0+g*.5,FY-CH+26);bolt(L,x0+g+150,FY-24)},
    bed:function(L,p,r){var n=150+Math.floor(r()*3)*30;flat(L,40);var x0=L.x;
      mag(L,{x:x0,y:FY,w:n,p:p,S:2300,d0:46,R:180,k:'bed'});L.solids.push({x:x0,y:FY+18,w:n,h:82});L.x+=n;
      L.spikes.push({x:x0+40,y:FY-9,w:n-52,h:9});bolt(L,x0+n*.55,FY-70);flat(L,80)},
    rail:function(L,p,r){var k=2+Math.floor(r()*2),tw=RTW,gp=RGP;flat(L,60);var x0=L.x;pit(L,k*tw);gird(L,x0-120,x0+k*tw+88);
      for(var i=0;i<k;i++){var m=ceilM(L,x0+i*tw-(i?0:56),tw-gp+(i?0:56)+(i===k-1?gp+24:0),i%2?-p:p,{ng:1});m.k='rail';m.S=RS;m.d0=RD;bolt(L,x0+i*tw+(tw-gp)*.5,FY-CH+26)}flat(L,80)},
    crate:function(L,p,r){flat(L,150);L.crates.push({x:L.x-80,y:FY-CR,p:p});var x0=L.x;pit(L,30);L.pits[L.pits.length-1].sh=1;
      L.solids.push({x:x0,y:FY+2*CR,w:30,h:100-2*CR});L.spikes.push({x:x0+4,y:FY+12,w:22,h:14});flat(L,80);bolt(L,x0+15,FY-40)},
    pulse:function(L,p,r){var g=150+Math.floor(r()*2)*30;flat(L,60);var x0=L.x;pit(L,g);
      ceilM(L,x0-56,g+80,p,{pu:{per:1.3,on:.95,ph:r()}});bolt(L,x0+g*.5,FY-CH+30);flat(L,80)},
    tram:function(L,p,r){flat(L,60);var x0=L.x;pit(L,300);
      ceilM(L,x0-50,120,p,{mv:{ax:150,per:4.2,ph:-(x0-40)/WALK}});ceilM(L,x0+205,125,-p);bolt(L,x0+100,FY-CH+26);bolt(L,x0+250,FY-CH+26);flat(L,80)},
    drone:function(L,p,r){flat(L,90);padM(L,56,p);flat(L,250);L.drone={x:L.x-30,y:FY-16};bolt(L,L.x-190,FY-95)}
  };
  var HINTS=[
    {ko:'탭해서 극을 바꿔요',en:'Tap to flip your pole'},
    {ko:'반대 극 천장에 착! 붙어요',en:'Opposite poles stick — ride the ceiling'},
    {ko:'공중에서 뒤집어 내려와요',en:'Flip in mid-air to drop down'},
    {ko:'같은 극 위에서는 둥실 떠요',en:'Same poles make you hover'},
    {ko:'타일마다 리듬에 맞춰 탭!',en:'Flip in rhythm, tile by tile'},
    {ko:'같은 극으로 상자를 밀어 구멍을 메워요',en:'Push the crate with the same pole to fill the hole'},
    {ko:'움직이는 자석에 올라타요',en:'Hitch a ride on the moving magnet'},
    {ko:'전자석은 깜빡여요',en:'Electromagnets blink on and off'},
    {ko:'청개구리 드론은 늘 나와 반대 극!',en:'The contrary drone is always your opposite!'},
    {ko:'배운 걸 전부 써 봐요!',en:'Put it all together!'}];
  /* 손으로 짠 10구역: [청크, 극] 목록. 구역 시작 문(게이트)을 지나면 항상 N극이 된다. */
  var HAND=[
    {lead:300,c:[['pad',-1,0]]},
    {lead:110,c:[['ceil',1,1]]},
    {lead:110,c:[['drop',1,1]]},
    {lead:110,c:[['bed',-1,1]]},
    {lead:110,c:[['rail',1,3]]},
    {lead:110,c:[['crate',-1,0]]},
    {lead:110,c:[['tram',1,0]]},
    {lead:110,c:[['pulse',1,1],['pad',1,1]]},
    {lead:110,c:[['drone',-1,0],['ceil',-1,0]]},
    {lead:110,c:[['pad',-1,2],['rail',-1,0],['bed',1,0]]}];
  var POOL=['pad','ceil','drop','bed','rail','crate','pulse','tram','drone'];
  function fixedR(v){return function(){return v/4+.01}}
  function genSpec(seed){var r=mul32(seed*7919+13),n=2+(r()<.5?1:0),c=[],last='';
    for(var i=0;i<n;i++){var k;do{k=POOL[Math.floor(r()*POOL.length)]}while(k===last||(k==='drone'&&i>0));last=k;c.push([k,r()<.5?1:-1,-1])}
    return {lead:110,c:c,seed:seed}}
  function build(spec){var L=newL(),r=spec.seed!=null?mul32(spec.seed*104729+7):null;flat(L,spec.lead);
    spec.c.forEach(function(q){CHUNK[q[0]](L,q[1],q[2]>=0?fixedR(q[2]):r)});
    flat(L,110);L.len=L.x-0;L.len=L.x;flat(L,40);L.x=L.len;L.solids[L.solids.length-1].tail=1;return L}

  /* ---- 상태 ---- */
  function init(L){var s={x:0,y:FY-R,vx:WALK,vy:0,pole:1,gr:1,svx:0,stuck:0,t:0,flips:0,bolts:0,status:0,why:0,endGr:0,cr:[],dr:null};
    for(var i=0;i<L.crates.length;i++){var c=L.crates[i];s.cr.push({x:c.x,y:c.y,vx:0,vy:0,p:c.p,g:1})}
    if(L.drone)s.dr={x:L.drone.x,y:L.drone.y,vx:0,vy:0};return s}
  function clone(s){var o={x:s.x,y:s.y,vx:s.vx,vy:s.vy,pole:s.pole,gr:s.gr,svx:s.svx,stuck:s.stuck,t:s.t,flips:s.flips,bolts:s.bolts,status:s.status,why:s.why,endGr:s.endGr,cr:[],dr:null};
    for(var i=0;i<s.cr.length;i++){var c=s.cr[i];o.cr.push({x:c.x,y:c.y,vx:c.vx,vy:c.vy,p:c.p,g:c.g})}
    if(s.dr)o.dr={x:s.dr.x,y:s.dr.y,vx:s.dr.vx,vy:s.dr.vy};return o}
  function tri(u){u=u-Math.floor(u);return u<.5?u*2:2-u*2}
  function magX(m,t){if(!m.mv)return m.x;var u=t/m.mv.per+m.mv.ph/m.mv.per;return m.x+m.mv.ax*tri(u<0?0:u)}
  function magV(m,t){if(!m.mv)return 0;var u=t/m.mv.per+m.mv.ph/m.mv.per;if(u<0)return 0;u-=Math.floor(u);return (u<.5?2:-2)*m.mv.ax/m.mv.per}
  function magOn(m,t){if(!m.pu)return 1;var u=t/m.pu.per+m.pu.ph;return (u-Math.floor(u))*m.pu.per<m.pu.on?1:0}
  function fall(m,d){if(d>=m.R)return 0;var f=1/(1+(d/m.d0)*(d/m.d0)),a=m.R*.72;if(d>a){var u=(m.R-d)/(m.R-a);f*=u*u*(3-2*u)}return f}
  /* 물체(ox,oy, 반지름 r, 극 pole)가 받는 자기 가속도. out이 있으면 작용 중인 자석 목록을 채운다(그리기용). */
  var FA=[0,0];
  function field(L,t,ox,oy,r,pole,k,out){var ax=0,ay=0;
    for(var i=0;i<L.mags.length;i++){var m=L.mags[i];if(!magOn(m,t))continue;var mx=magX(m,t);
      var px=ox<mx?mx:ox>mx+m.w?mx+m.w:ox,py=oy<m.y?m.y:oy>m.y+m.h?m.y+m.h:oy,dx=ox-px,dy=oy-py,dd=Math.sqrt(dx*dx+dy*dy);
      if(dd<1e-6){dx=0;dy=oy<m.y+m.h/2?-1:1;dd=1}
      var d=dd-r;if(d<0)d=0;var f=fall(m,d);if(f<=0)continue;var a=(m.p===pole?1:-1)*m.S*f*k;
      ax+=a*dx/dd;ay+=a*dy/dd;if(out)out.push({i:i,px:px,py:py,rep:m.p===pole,f:f})}
    FA[0]=ax;FA[1]=ay}
  function hit(o,r,rx,ry,rw,rh){var px=o.x<rx?rx:o.x>rx+rw?rx+rw:o.x,py=o.y<ry?ry:o.y>ry+rh?ry+rh:o.y,dx=o.x-px,dy=o.y-py,d2=dx*dx+dy*dy;
    if(d2>=r*r)return 0;var nx,ny;
    if(d2<1e-9){var a=o.x-rx,b=rx+rw-o.x,c=o.y-ry,e=ry+rh-o.y,m=Math.min(a,b,c,e);
      if(m===c){nx=0;ny=-1;py=ry}else if(m===e){nx=0;ny=1;py=ry+rh}else if(m===a){nx=-1;ny=0;px=rx}else{nx=1;ny=0;px=rx+rw}}
    else{var d=Math.sqrt(d2);nx=dx/d;ny=dy/d}
    o.x=px+nx*r;o.y=py+ny*r;var vn=o.vx*nx+o.vy*ny;if(vn<0){o.vx-=vn*nx;o.vy-=vn*ny}
    return ny<-.5?1:ny>.5?2:3}
  function boxFix(c,rx,ry,rw,rh){var ox=Math.min(c.x+CR,rx+rw)-Math.max(c.x-CR,rx),oy=Math.min(c.y+CR,ry+rh)-Math.max(c.y-CR,ry);
    if(ox<=0||oy<=0)return 0;
    if(oy<=ox){if(c.y<ry+rh/2){c.y-=oy;if(c.vy>0)c.vy=0;return 1}c.y+=oy;if(c.vy<0)c.vy=0;return 2}
    if(c.x<rx+rw/2){c.x-=ox;if(c.vx>0)c.vx=0}else{c.x+=ox;if(c.vx<0)c.vx=0}return 3}
  /* why: 1 낙하 2 가시 3 끼임 4 상자에 붙음 5 드론 */
  function step(L,s,flip){var i,m,c,q,ph;
    if(s.status)return;
    if(flip){s.pole=-s.pole;s.flips++}
    s.t+=DT;var t=s.t,x0=s.x;
    field(L,t,s.x,s.y,R,s.pole,1,null);var ax=FA[0],ay=FA[1]+G;
    if(s.gr===1||s.gr===2)s.vx=WALK+s.svx;
    else{s.vx+=((WALK-s.vx)*3+ax*.6)*DT;if(s.vx<45)s.vx=45;else if(s.vx>270)s.vx=270}
    s.vy+=ay*DT;s.vy-=s.vy*1.1*DT;if(s.vy>950)s.vy=950;else if(s.vy<-950)s.vy=-950;
    s.x+=s.vx*DT;s.y+=s.vy*DT;
    /* 상자 */
    for(i=0;i<s.cr.length;i++){c=s.cr[i];var dx=c.x-s.x,dy=c.y-s.y,dd=Math.sqrt(dx*dx+dy*dy)||1,d=dd-R-CR;if(d<0)d=0;
      if(d<100){var f=1/(1+(d/30)*(d/30));if(d>60)f*=(100-d)/40;var a=(c.p===s.pole?1:-1)*950*f;c.vx+=a*dx/dd*DT;c.vy+=a*dy/dd*DT}
      c.vy+=G*DT;if(c.g)c.vx-=c.vx*8*DT;if(c.vx>320)c.vx=320;else if(c.vx<-320)c.vx=-320;if(c.vy>900)c.vy=900;else if(c.vy<-600)c.vy=-600;
      c.x+=c.vx*DT;c.y+=c.vy*DT;c.g=0;
      for(q=0;q<L.solids.length;q++){m=L.solids[q];if(boxFix(c,m.x,m.y,m.w,m.h)===1)c.g=1}
      for(q=0;q<L.mags.length;q++){m=L.mags[q];if(boxFix(c,magX(m,t),m.y,m.w,m.h)===1)c.g=1}}
    /* 드론: 늘 나와 반대 극 */
    if(s.dr){c=s.dr;var ex=s.x-c.x,ey=s.y-c.y,ed=Math.sqrt(ex*ex+ey*ey)||1;
      if(ed<270){c.vx+=ex/ed*330*DT;c.vy+=ey/ed*330*DT}
      field(L,t,c.x,c.y,DR,-s.pole,.5,null);c.vx+=FA[0]*DT;c.vy+=FA[1]*DT;
      c.vx-=c.vx*2.6*DT;c.vy-=c.vy*2.6*DT;var sp=Math.sqrt(c.vx*c.vx+c.vy*c.vy);if(sp>88){c.vx*=88/sp;c.vy*=88/sp}
      c.x+=c.vx*DT;c.y+=c.vy*DT;
      for(q=0;q<L.solids.length;q++){m=L.solids[q];hit(c,DR,m.x,m.y,m.w,m.h)}
      for(q=0;q<L.mags.length;q++){m=L.mags[q];hit(c,DR,magX(m,t),m.y,m.w,m.h)}
      ex=s.x-c.x;ey=s.y-c.y;if(ex*ex+ey*ey<(R+DR-3)*(R+DR-3)){s.status=2;s.why=5;return}}
    /* 주인공 충돌 */
    var gr=0,svx=0,k;
    for(q=0;q<L.solids.length;q++){m=L.solids[q];k=hit(s,R,m.x,m.y,m.w,m.h);if(k===1||k===2)gr=k}
    for(q=0;q<L.mags.length;q++){m=L.mags[q];k=hit(s,R,magX(m,t),m.y,m.w,m.h);if(k===1||k===2){gr=k;svx=magV(m,t)}}
    for(i=0;i<s.cr.length;i++){c=s.cr[i];k=hit(s,R,c.x-CR,c.y-CR,2*CR,2*CR);
      if(k){if(c.p!==s.pole){s.status=2;s.why=4;return}if(k===1)gr=1}}
    if(s.y<-70){s.y=-70;if(s.vy<0)s.vy=0}
    s.gr=gr;s.svx=svx;
    if(s.x-x0<.12*WALK*DT){s.stuck+=DT;if(s.stuck>.9){s.status=2;s.why=3;return}}else if(s.stuck>0)s.stuck=Math.max(0,s.stuck-DT*2);
    if(s.y>WB){s.status=2;s.why=1;return}
    for(q=0;q<L.spikes.length;q++){m=L.spikes[q];var px=s.x<m.x?m.x:s.x>m.x+m.w?m.x+m.w:s.x,py=s.y<m.y?m.y:s.y>m.y+m.h?m.y+m.h:s.y;
      if((s.x-px)*(s.x-px)+(s.y-py)*(s.y-py)<(R-3)*(R-3)){s.status=2;s.why=2;return}}
    for(q=0;q<L.bolts.length;q++){if(s.bolts>>q&1)continue;m=L.bolts[q];if((s.x-m.x)*(s.x-m.x)+(s.y-m.y)*(s.y-m.y)<24*24)s.bolts|=1<<q}
    if(s.x>=L.len){s.status=1;s.endGr=gr}}
  var CORE={DT:DT,WALK:WALK,FY:FY,HAND:HAND,build:build,genSpec:genSpec,init:init,clone:clone,step:step};
