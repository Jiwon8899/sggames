/* 살살 양몰이 (Gentle Herd) — 양치기 개 보리는 양을 직접 건드리지 못한다. 양 떼는 보이드처럼 뭉치고,
   개가 가까이·빠르게 올수록 세게 달아난다. 한가운데로 돌진하면 떼가 갈라지므로 뒤로 빙 돌아 살살 밀어야 한다.
   시뮬레이션(Sim)은 DOM 없이 돌아가도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,X0=8,X1=352,Y0=48,Y1=630,SR=8,DR=8,SI=18; /* 양은 가장자리 흙길(SI)에 못 들어가고, 개는 흙길로 돌아갈 수 있다 */
  var P={RF:95,FB:55,FV:75,DOGV:150,VA:78,VP:128,VC:18,NR:58,SEP:20,BR:115,BP:50,RW:125,T0:45,TCAP:70,TLV:15};

  function rng(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=Math.imul(s^s>>>15,1|s);
    t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  /* ---------- 레벨 ----------
     sheep:[x,y,마릿수,색(0 흰/1 검정)]  pens:{x,y,w,h,side(문이 난 변),gate(문 너비),c(받는 색, -1=전부)}
     stream:{y,h,bx,bw} 가로 개울과 다리  mud:[x,y,w,h]  goat/wolf: 순찰 경로 */
  var LEVELS=[
    {sheep:[[150,340,5,0]],dog:[52,340],pens:[{x:236,y:288,w:104,h:104,side:'l',gate:66,c:-1}],
      tip:{ko:'양 뒤에서 살살 밀어 우리로!',en:'Nudge the flock from behind into the pen!'}},
    {sheep:[[105,160,8,0]],dog:[190,360],pens:[{x:222,y:518,w:118,h:100,side:'t',gate:60,c:-1}],
      tip:{ko:'돌진하면 흩어져요. 빙 돌아가세요',en:'Charging splits the flock — circle around'}},
    {sheep:[[262,490,9,0]],dog:[120,560],pens:[{x:20,y:60,w:120,h:100,side:'b',gate:58,c:-1}],mud:[[120,286,150,84]],
      tip:{ko:'멍! 짖으면 떼가 확 돌아요 (스페이스)',en:'Bark (Space) to turn the flock fast'}},
    {sheep:[[255,165,9,0]],dog:[90,120],pens:[{x:20,y:518,w:112,h:100,side:'r',gate:58,c:-1}],stream:{y:318,h:26,bx:158,bw:58},
      tip:{ko:'양은 다리로만 개울을 건너요',en:'Sheep only cross at the bridge'}},
    {sheep:[[100,500,10,0]],dog:[250,560],pens:[{x:226,y:60,w:114,h:100,side:'l',gate:58,c:-1}],
      goat:[[70,300],[170,230],[130,410],[50,200]],
      tip:{ko:'양은 고집쟁이 염소를 따라가요',en:'Sheep love to follow the stubborn goat'}},
    {sheep:[[150,330,5,0],[205,335,4,1]],dog:[180,470],pens:[{x:20,y:518,w:112,h:100,side:'t',gate:58,c:0},{x:228,y:60,w:112,h:100,side:'b',gate:58,c:1}],
      tip:{ko:'검은 양은 어두운 우리로!',en:'Black sheep go to the dark pen!'}},
    {sheep:[[265,140,10,0]],dog:[110,110],pens:[{x:228,y:518,w:112,h:100,side:'l',gate:58,c:-1}],stream:{y:262,h:26,bx:84,bw:62},
      wolf:[[60,430],[300,380],[310,450],[80,580]],dusk:1,
      tip:{ko:'늑대 그림자엔 멍! 하고 짖어요',en:'Bark at the wolf shadow to chase it off'}},
    {sheep:[[150,125,6,0],[215,120,5,1]],dog:[60,200],pens:[{x:20,y:518,w:112,h:100,side:'t',gate:58,c:0},{x:228,y:518,w:112,h:100,side:'t',gate:58,c:1}],
      stream:{y:286,h:26,bx:150,bw:60},mud:[[222,372,110,62]],goat:[[60,90],[300,100],[290,220],[70,230]],wolf:[[40,360],[330,350],[190,440]],dusk:1,
      tip:{ko:'전부 다! 해 지기 전에 몰아요',en:'Everything at once — beat the dusk!'}}
  ];
  function procLevel(n){var r=rng(977+n*7919),L={sheep:[],pens:[],proc:1};
    var hasStream=r()<.55,sort=r()<.45,cnt=8+Math.floor(r()*Math.min(7,3+(n-8)*.6));if(cnt>14)cnt=14;
    var sx=70+r()*220,sy=110+r()*70;
    if(sort){var nb=Math.max(3,Math.floor(cnt*(.35+r()*.2))),sw=r()<.5;L.sheep.push([sx-25,sy,cnt-nb,0],[sx+25,sy,nb,1]);
      L.pens.push({x:sw?228:20,y:518,w:112,h:100,side:'t',gate:56,c:0},{x:sw?20:228,y:518,w:112,h:100,side:'t',gate:56,c:1})}
    else{L.sheep.push([sx,sy,cnt,0]);var lf=r()<.5;L.pens.push({x:lf?20:228,y:518,w:112,h:100,side:r()<.6?'t':(lf?'r':'l'),gate:56,c:-1})}
    if(hasStream)L.stream={y:270+r()*50,h:26,bx:30+r()*240,bw:60};
    if(r()<.5){var my=hasStream?L.stream.y+50:260+r()*80;L.mud=[[40+r()*170,my,100+r()*40,56]]}
    if(r()<.45)L.goat=[[60,80+r()*40],[300,90+r()*40],[280,200+r()*40],[80,210+r()*30]];
    if(r()<.5){L.wolf=[[40,380+r()*30],[320,370+r()*30],[190,430]];L.dusk=1}
    L.dog=[sx<180?300:60,230];return L}
  function buildPen(p){var x=p.x,y=p.y,w=p.w,h=p.h,g=p.gate,walls=[],k,s;
    var sides={t:[x,y,x+w,y],b:[x,y+h,x+w,y+h],l:[x,y,x,y+h],r:[x+w,y,x+w,y+h]},nm={t:[0,-1],b:[0,1],l:[-1,0],r:[1,0]};
    for(k in sides){s=sides[k];if(k!==p.side){walls.push(s);continue}
      var mx=(s[0]+s[2])/2,my=(s[1]+s[3])/2,ln=Math.hypot(s[2]-s[0],s[3]-s[1]),ux=(s[2]-s[0])/ln,uy=(s[3]-s[1])/ln;
      walls.push([s[0],s[1],mx-ux*g/2,my-uy*g/2],[mx+ux*g/2,my+uy*g/2,s[2],s[3]]);
      p.gs=[mx-ux*g/2,my-uy*g/2,mx+ux*g/2,my+uy*g/2];p.gx=mx;p.gy=my;p.nx=nm[k][0];p.ny=nm[k][1]}
    p.walls=walls;p.cx=x+w/2;p.cy=y+h/2;return p}
  function getLevel(n){var b=n<LEVELS.length?LEVELS[n]:procLevel(n),L={n:n,sheep:b.sheep,dog:b.dog,tip:b.tip||null,dusk:!!b.dusk,
      mud:b.mud||[],goat:b.goat||null,wolf:b.wolf||null,stream:b.stream||null,water:[],proc:!!b.proc};
    L.pens=b.pens.map(function(p){return buildPen({x:p.x,y:p.y,w:p.w,h:p.h,side:p.side,gate:p.gate,c:p.c})});
    if(L.stream){var s=L.stream;L.water=[[X0-20,s.y,s.bx-X0+20,s.h],[s.bx+s.bw,s.y,X1+20-s.bx-s.bw,s.h]]}
    L.total=0;L.sheep.forEach(function(q){L.total+=q[2]});return L}

  /* ---------- 충돌 도우미 ---------- */
  function segPush(o,s,rad){var dx=s[2]-s[0],dy=s[3]-s[1],l=dx*dx+dy*dy,t=l>0?((o.x-s[0])*dx+(o.y-s[1])*dy)/l:0;t=t<0?0:t>1?1:t;
    var qx=s[0]+dx*t,qy=s[1]+dy*t,ex=o.x-qx,ey=o.y-qy,d=Math.hypot(ex,ey);
    if(d<rad){if(d<.001){ex=1;ey=0;d=1}o.x=qx+ex/d*rad;o.y=qy+ey/d*rad;return true}return false}
  function rectPush(o,r,rad){var x0=r[0]-rad,y0=r[1]-rad,x1=r[0]+r[2]+rad,y1=r[1]+r[3]+rad;
    if(o.x<=x0||o.x>=x1||o.y<=y0||o.y>=y1)return false;
    var a=o.x-x0,b=x1-o.x,c=o.y-y0,d=y1-o.y,m=Math.min(a,b,c,d);
    if(m===c)o.y=y0;else if(m===d)o.y=y1;else if(m===a)o.x=x0;else o.x=x1;return true}
  function inRect(x,y,r){return x>r[0]&&x<r[0]+r[2]&&y>r[1]&&y<r[1]+r[3]}
  function inAny(x,y,rs){for(var i=0;i<rs.length;i++)if(inRect(x,y,rs[i]))return true;return false}

  /* ---------- 상태 ---------- */
  function newState(L,seed){var r=rng(seed||1),S={L:L,r:r,t:0,sheep:[],ev:[],penned:0,panics:0,barkCd:0,barkT:9,
      dog:{x:L.dog[0],y:L.dog[1],vx:0,vy:0,h:0,spd:0},goat:null,wolf:null};
    L.sheep.forEach(function(q){for(var i=0;i<q[2];i++){var a=r()*6.283,d=8+Math.sqrt(r())*(10+q[2]*3.2),x=q[0]+Math.cos(a)*d,y=q[1]+Math.sin(a)*d;
      S.sheep.push({x:x,y:y,vx:0,vy:0,c:q[3],ar:0,panic:0,pang:0,fx:0,fy:1,mood:0,pen:-1,ax:x,ay:y,wa:r()*6.283,
        lx:0,ly:1,hop:0,tx:0,ty:0,ph:r()*6.283,bl:r()*4,rej:0,gz:r()*5})}});
    for(var k=0;k<30;k++)for(var i=0;i<S.sheep.length;i++)for(var j=i+1;j<S.sheep.length;j++){var a=S.sheep[i],b=S.sheep[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
      if(d<SR*2+2){var m=(SR*2+2-d)/2;a.x-=dx/d*m;a.y-=dy/d*m;b.x+=dx/d*m;b.y+=dy/d*m}}
    S.sheep.forEach(function(s){s.ax=s.x;s.ay=s.y});
    if(L.goat)S.goat={x:L.goat[0][0],y:L.goat[0][1],vx:0,vy:0,k:1,startle:0,h:0};
    if(L.wolf)S.wolf={x:L.wolf[0][0],y:L.wolf[0][1],k:1,scared:0,h:0,al:0};
    return S}

  function panicIt(S,s){if(s.panic>0)return;s.panic=2.6+S.r()*1.3;s.pang=(S.r()-.5)*1.7;s.ar=1.2;S.panics++;S.ev.push({t:'panic',x:s.x,y:s.y})}

  /* ctl:{mx,my(-1..1 크기=세기),bark} */
  function step(S,dt,ctl){var L=S.L,D=S.dog,r=S.r,i,j,s,o,dx,dy,d,p,w;
    S.t+=dt;S.barkCd-=dt;S.barkT+=dt;
    /* 개 */
    var mm=Math.hypot(ctl.mx,ctl.my),mx=ctl.mx,my=ctl.my;if(mm>1){mx/=mm;my/=mm}
    var slow=(inAny(D.x,D.y,L.water)?.5:1)*(inAny(D.x,D.y,L.mud)?.6:1),k=Math.min(1,dt*(mm>.01?6:10));
    D.vx+=(mx*P.DOGV*slow-D.vx)*k;D.vy+=(my*P.DOGV*slow-D.vy)*k;D.x+=D.vx*dt;D.y+=D.vy*dt;
    D.spd=Math.hypot(D.vx,D.vy);if(D.spd>12)D.h=Math.atan2(D.vy,D.vx);
    D.x=D.x<X0+4?X0+4:D.x>X1-4?X1-4:D.x;D.y=D.y<Y0+4?Y0+4:D.y>Y1-4?Y1-4:D.y; /* 개는 울타리를 폴짝 넘는다 */
    var ratio=D.spd/P.DOGV,barked=false;
    if(ctl.bark&&S.barkCd<=0){S.barkCd=1.1;S.barkT=0;barked=true;S.ev.push({t:'bark',x:D.x,y:D.y})}
    /* 염소 */
    var G=S.goat;if(G){var gp=L.goat[G.k],gx=gp[0]-G.x,gy=gp[1]-G.y,gd=Math.hypot(gx,gy)||1;if(gd<10)G.k=(G.k+1)%L.goat.length;
      var tvx=gx/gd*20,tvy=gy/gd*20;dx=G.x-D.x;dy=G.y-D.y;d=Math.hypot(dx,dy)||1;
      if(barked&&d<P.BR)G.startle=3;
      if(G.startle>0){G.startle-=dt;tvx=dx/d*70;tvy=dy/d*70}else if(d<46){tvx+=dx/d*26;tvy+=dy/d*26}
      G.vx+=(tvx-G.vx)*Math.min(1,dt*4);G.vy+=(tvy-G.vy)*Math.min(1,dt*4);G.x+=G.vx*dt;G.y+=G.vy*dt;
      if(Math.hypot(G.vx,G.vy)>4)G.h=Math.atan2(G.vy,G.vx);
      G.x=G.x<X0+10?X0+10:G.x>X1-10?X1-10:G.x;G.y=G.y<Y0+10?Y0+10:G.y>Y1-10?Y1-10:G.y;
      for(i=0;i<L.water.length;i++)rectPush(G,L.water[i],9);
      for(i=0;i<L.pens.length;i++){p=L.pens[i];for(j=0;j<p.walls.length;j++)segPush(G,p.walls[j],11);segPush(G,p.gs,11)}}
    /* 늑대 그림자 */
    var Wf=S.wolf;if(Wf){dx=Wf.x-D.x;dy=Wf.y-D.y;d=Math.hypot(dx,dy)||1;
      if(barked&&d<140&&Wf.scared<=0){Wf.scared=6;S.ev.push({t:'wolf',x:Wf.x,y:Wf.y})}
      if(Wf.scared>0){Wf.scared-=dt;Wf.al=Math.max(0,Wf.al-dt*2.5);Wf.x+=dx/d*60*dt;Wf.y+=dy/d*60*dt}
      else{Wf.al=Math.min(1,Wf.al+dt*.8);var wp=L.wolf[Wf.k],wx=wp[0]-Wf.x,wy=wp[1]-Wf.y,wd=Math.hypot(wx,wy)||1;if(wd<10)Wf.k=(Wf.k+1)%L.wolf.length;
        Wf.x+=wx/wd*30*dt;Wf.y+=wy/wd*30*dt;Wf.h=Math.atan2(wy,wx)}
      Wf.x=Wf.x<X0+6?X0+6:Wf.x>X1-6?X1-6:Wf.x;Wf.y=Wf.y<Y0+6?Y0+6:Wf.y>Y1-6?Y1-6:Wf.y}
    /* 양 */
    var sh=S.sheep,n=sh.length;
    for(i=0;i<n;i++){s=sh[i];s.ph+=dt*(3+Math.hypot(s.vx,s.vy)*.22);s.bl-=dt;if(s.bl<-.12)s.bl=1.5+r()*3.5;if(s.hop>0)s.hop-=dt;if(s.rej>0)s.rej-=dt;
      if(s.pen>=0){p=L.pens[s.pen];dx=s.tx-s.x;dy=s.ty-s.y;d=Math.hypot(dx,dy);
        if(d<5&&r()<dt*.25){s.tx=p.x+16+r()*(p.w-32);s.ty=p.y+16+r()*(p.h-32)}
        var sp=d>5?Math.min(46,d*3):0,qx=d>5?dx/d*sp:0,qy=d>5?dy/d*sp:0;
        for(j=0;j<n;j++){o=sh[j];if(o===s||o.pen!==s.pen)continue;var ex=s.x-o.x,ey=s.y-o.y,ed=Math.hypot(ex,ey)||1;if(ed<17){qx+=ex/ed*(17-ed)*5;qy+=ey/ed*(17-ed)*5}}
        s.vx+=(qx-s.vx)*Math.min(1,dt*5);s.vy+=(qy-s.vy)*Math.min(1,dt*5);s.x+=s.vx*dt;s.y+=s.vy*dt;
        s.x=Math.max(p.x+SR+3,Math.min(p.x+p.w-SR-3,s.x));s.y=Math.max(p.y+SR+3,Math.min(p.y+p.h-SR-3,s.y));
        s.ar=Math.max(0,s.ar-dt);s.mood=0;s.panic=0;if(sp>8){s.lx=dx/d;s.ly=dy/d}continue}
      var cx=0,cy=0,ax=0,ay=0,nn=0,sx=0,sy=0,pn=0;
      for(j=0;j<n;j++){o=sh[j];if(o===s||o.pen>=0)continue;dx=o.x-s.x;dy=o.y-s.y;d=Math.hypot(dx,dy)||.01;
        if(d<P.NR){nn++;cx+=o.x;cy+=o.y;ax+=o.vx;ay+=o.vy;if(o.panic>0&&d<26)pn++}
        if(d<P.SEP){sx-=dx/d*(P.SEP-d)/P.SEP;sy-=dy/d*(P.SEP-d)/P.SEP}}
      /* 위협 */
      var fx=0,fy=0,tar=0,sd;dx=s.x-D.x;dy=s.y-D.y;d=Math.hypot(dx,dy)||.01;
      if(d<P.RF){sd=1-d/P.RF;var f=sd*(P.FB+P.FV*ratio);fx+=dx/d*f;fy+=dy/d*f;tar=sd*(.5+1.2*ratio);s.lx=-dx/d;s.ly=-dy/d}
      if(barked&&d<P.BR){var bi=(1-d/P.BR)*150+40;s.vx+=dx/d*bi;s.vy+=dy/d*bi;s.fx=dx/d;s.fy=dy/d;if(d<P.BP)panicIt(S,s);else if(s.ar<.85)s.ar=.85}
      if(Wf&&Wf.scared<=0){var ux=s.x-Wf.x,uy=s.y-Wf.y,ud=Math.hypot(ux,uy)||.01;
        if(ud<P.RW){sd=1-ud/P.RW;fx+=ux/ud*sd*150;fy+=uy/ud*sd*150;tar=Math.max(tar,sd*1.35);if(sd>.3){s.lx=-ux/ud;s.ly=-uy/ud}}}
      if(pn>0)tar=Math.max(tar,.5);
      if(tar>s.ar)s.ar+=(tar-s.ar)*Math.min(1,dt*9);else s.ar=Math.max(0,s.ar-dt*.38);
      var fm=Math.hypot(fx,fy);if(fm>1){s.fx=fx/fm;s.fy=fy/fm}
      if(s.ar>=1&&s.panic<=0)panicIt(S,s);
      var was=s.mood,vx,vy,vm,lim;
      if(s.panic>0){s.panic-=dt;s.mood=2;var ca=Math.cos(s.pang),sa=Math.sin(s.pang);vx=(s.fx*ca-s.fy*sa)*P.VP+sx*60;vy=(s.fx*sa+s.fy*ca)*P.VP+sy*60;lim=P.VP;
        if(s.panic<=0)s.ar=.7}
      else if(s.ar>.18){s.mood=1;vx=fx+sx*70;vy=fy+sy*70;
        if(nn){cx=cx/nn-s.x;cy=cy/nn-s.y;d=Math.hypot(cx,cy)||1;var cw=Math.min(1,d/26)*24;vx+=cx/d*cw+ax/nn*.42;vy+=cy/d*cw+ay/nn*.42}
        for(j=0;j<L.pens.length;j++){p=L.pens[j];if(p.c>=0&&p.c!==s.c)continue;dx=p.gx-p.nx*14-s.x;dy=p.gy-p.ny*14-s.y;d=Math.hypot(dx,dy)||1;
          if(d<62){vx+=dx/d*34;vy+=dy/d*34}}
        /* 개울가에 몰리면 다리 쪽으로 슬금슬금 */
        if(L.stream){var st=L.stream,sdy=s.y<st.y?st.y-s.y:s.y-st.y-st.h,bxc=st.bx+st.bw/2;
          if(sdy>0&&sdy<44&&Math.abs(s.x-bxc)<120&&Math.abs(s.x-bxc)>st.bw/2-12)vx+=(s.x<bxc?1:-1)*32*(1-sdy/44)}
        lim=P.VA}
      else{s.mood=0;if(was!==0){s.ax=Math.max(X0+SI+18,Math.min(X1-SI-18,s.x));s.ay=Math.max(Y0+SI+18,Math.min(Y1-SI-18,s.y))}
        s.wa+=(r()-.5)*dt*5;s.gz-=dt;if(s.gz<-2.5)s.gz=1.5+r()*4;var gs=s.gz>0?0:9;
        vx=Math.cos(s.wa)*gs+sx*45;vy=Math.sin(s.wa)*gs+sy*45;dx=s.ax-s.x;dy=s.ay-s.y;d=Math.hypot(dx,dy);if(d>14){vx+=dx/d*10;vy+=dy/d*10}
        if(gs>0){s.lx+=(Math.cos(s.wa)-s.lx)*dt*3;s.ly+=(Math.sin(s.wa)-s.ly)*dt*3}
        lim=P.VC}
      if(G&&G.startle<=0&&s.mood<2){dx=G.x-s.x;dy=G.y-s.y;d=Math.hypot(dx,dy)||1;
        if(d<90&&d>22){var ga=s.mood?26:15;vx+=dx/d*ga;vy+=dy/d*ga;if(!s.mood){s.ax=s.x;s.ay=s.y;lim=22}}}
      /* 들판 가장자리에서 안쪽으로 살짝 */
      var e0=SI+16;if(s.x<X0+e0)vx+=(X0+e0-s.x)*2.5;if(s.x>X1-e0)vx-=(s.x-X1+e0)*2.5;if(s.y<Y0+e0)vy+=(Y0+e0-s.y)*2.5;if(s.y>Y1-e0)vy-=(s.y-Y1+e0)*2.5;
      vm=Math.hypot(vx,vy);if(vm>lim){vx=vx/vm*lim;vy=vy/vm*lim}
      k=Math.min(1,dt*5.5);s.vx+=(vx-s.vx)*k;s.vy+=(vy-s.vy)*k;
      vm=Math.hypot(s.vx,s.vy);if(vm>170){s.vx*=170/vm;s.vy*=170/vm}
      var ms=inAny(s.x,s.y,L.mud)?.45:1;s.x+=s.vx*dt*ms;s.y+=s.vy*dt*ms;
      dx=s.x-D.x;dy=s.y-D.y;d=Math.hypot(dx,dy)||.01;if(d<SR+DR){s.x=D.x+dx/d*(SR+DR);s.y=D.y+dy/d*(SR+DR)}
      s.x=s.x<X0+SI?X0+SI:s.x>X1-SI?X1-SI:s.x;s.y=s.y<Y0+SI?Y0+SI:s.y>Y1-SI?Y1-SI:s.y;
      for(j=0;j<L.water.length;j++)rectPush(s,L.water[j],SR);
      for(j=0;j<L.pens.length;j++){p=L.pens[j];for(w=0;w<p.walls.length;w++)segPush(s,p.walls[w],SR+2);
        if(p.c>=0&&p.c!==s.c){if(segPush(s,p.gs,SR+2)&&s.rej<=0){s.rej=1.5;S.ev.push({t:'reject',x:s.x,y:s.y})}}
        else if(s.x>p.x+5&&s.x<p.x+p.w-5&&s.y>p.y+5&&s.y<p.y+p.h-5){s.pen=j;s.hop=.45;s.panic=0;s.tx=p.x+16+r()*(p.w-32);s.ty=p.y+16+r()*(p.h-32);
          S.penned++;S.ev.push({t:'pen',x:s.x,y:s.y,pen:j,c:s.c})}}
    }
  }

  /* ---------- 한 판(타이머·점수·레벨 진행) ---------- */
  function newRun(seed){var R={seed:seed||1,lvl:0,time:P.T0,score:0,phase:'play',pt:0,over:false,ev:[],lt:0,S:null,cleared:0};
    R.S=newState(getLevel(0),R.seed);return R}
  function runStep(R,dt,ctl){R.ev.length=0;if(R.over)return;var S=R.S,i,e;
    if(R.phase==='clear'){R.pt-=dt;S.ev.length=0;step(S,dt,{mx:0,my:0,bark:false});
      if(R.pt<=0){R.lvl++;R.S=newState(getLevel(R.lvl),R.seed+R.lvl*101);R.phase='play';R.lt=0;R.ev.push({t:'level'})}return}
    R.time-=dt;R.lt+=dt;S.ev.length=0;step(S,dt,ctl);
    for(i=0;i<S.ev.length;i++){e=S.ev[i];R.ev.push(e);
      if(e.t==='pen'){R.score+=10;R.time=Math.min(P.TCAP,R.time+1);R.ev.push({t:'score',n:10,x:e.x,y:e.y})}}
    if(S.penned>=S.sheep.length){var par=14+S.L.total*1.6+(S.L.stream?8:0)+(S.L.pens.length>1?8:0),tb=Math.max(0,Math.round((par-R.lt)*2)),
        gentle=S.panics===0?40:0;R.score+=30+tb+gentle;R.time=Math.min(P.TCAP,R.time+P.TLV);R.cleared++;
      R.phase='clear';R.pt=1.5;R.ev.push({t:'clear',tb:tb,gentle:gentle,n:30+tb+gentle});return}
    if(R.time<=0){R.time=0;R.over=true;R.ev.push({t:'over'})}}

  var Sim={P:P,LEVELS:LEVELS,getLevel:getLevel,newState:newState,step:step,newRun:newRun,runStep:runStep,W:W,H:H,X0:X0,X1:X1,Y0:Y0,Y1:Y1,SI:SI};
  if(typeof module!=='undefined'&&module.exports)module.exports=Sim;
  if(typeof SG==='undefined')return;
/* ================= 화면·입력 ================= */
  var FONT='px Jua, system-ui, sans-serif',BX=180,BY=606,BR2=21,PI=Math.PI;
  var R=null,T=0,ko=true,keys={},barkQ=false,kbHold=0,btnHold=false,lastTap=-9,ltx=0,lty=0,usedInput=false,
      bg=null,bgN=-1,tufts=[],bfly=[],clouds=[],foot=[],dust=[],rings=[],tipT=0,banner=null,baaT=3,panicSnd=0,dogHappy=0,dogOops=0,moved=false,api=null;
  if(!window.__sheepHerdKeys){window.__sheepHerdKeys=true;
    window.addEventListener('keydown',function(e){keys[e.code]=true;if(e.code==='Space'&&!e.repeat)barkQ=true});
    window.addEventListener('keyup',function(e){keys[e.code]=false});
    window.addEventListener('blur',function(){keys={}})}

  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function ell(g,x,y,a,b,rot){g.beginPath();g.ellipse(x,y,a,b,rot||0,0,PI*2)}

  function baa(a,p){a.beep(p,.08,'sawtooth');setTimeout(function(){a.beep(p*.88,.08,'sawtooth')},65);setTimeout(function(){a.beep(p*.95,.07,'sawtooth')},130);setTimeout(function(){a.beep(p*.82,.12,'sawtooth')},195)}
  function woof(a){a.beep(330,.045,'square');setTimeout(function(){a.beep(196,.11,'sawtooth')},38)}
  function bell(a,k){var f=1568*Math.pow(2,[0,2,4,7,9,12,14,16][k%8]/12);a.beep(f,.16,'sine');setTimeout(function(){a.beep(f*1.5,.3,'sine')},70)}

  function levelFx(L){var r=rng(77+L.n*13),i,x,y,tries;tufts=[];bfly=[];foot=[];dust=[];rings=[];
    for(i=0,tries=0;i<34&&tries<300;tries++){x=30+r()*300;y=70+r()*540;
      if(inAny(x,y,L.water)||inAny(x,y,L.mud))continue;var ok=true;L.pens.forEach(function(p){if(x>p.x-6&&x<p.x+p.w+6&&y>p.y-6&&y<p.y+p.h+6)ok=false});
      if(ok){tufts.push({x:x,y:y,p:r()*6.28,s:.8+r()*.5});i++}}
    for(i=0;i<4;i++)bfly.push({x:40+r()*280,y:90+r()*500,a:r()*6.28,p:r()*6.28,c:['#ffd24a','#ff9ec4','#fff','#9fd8ff'][i]});
    clouds=[];for(i=0;i<3;i++)clouds.push({x:r()*W,y:120+i*190+r()*60,w:90+r()*60,v:7+r()*6});
    tipT=L.tip?(L.n===0?999:5):0}
  function buildBg(L){var c=document.createElement('canvas');c.width=W;c.height=H;var g=c.getContext('2d'),r=rng(31+L.n*17),i,x,y,dk=L.dusk;
    g.fillStyle=dk?'#b49a86':'#e0c78f';g.fillRect(0,0,W,H);
    for(i=0;i<120;i++){g.fillStyle=i%2?'rgba(255,255,255,.22)':'rgba(120,90,50,.18)';g.beginPath();g.arc(r()*W,Y0-8+r()*(H-Y0+8),.8+r()*1.4,0,7);g.fill()}
    var gr=g.createLinearGradient(0,Y0,0,Y1);gr.addColorStop(0,dk?'#93c383':'#bce882');gr.addColorStop(1,dk?'#5e9d6b':'#7fca5e');
    g.fillStyle='rgba(70,110,40,.35)';rr(g,X0+8,Y0+10,X1-X0-16,Y1-Y0-16,18);g.fill();
    g.fillStyle=gr;rr(g,X0+8,Y0+8,X1-X0-16,Y1-Y0-16,18);g.fill();
    g.save();g.clip();
    for(i=-2;i<12;i+=2){g.fillStyle='rgba(255,255,255,.075)';g.beginPath();g.moveTo(i*36,Y0);g.lineTo(i*36+36,Y0);g.lineTo(i*36+96,Y1);g.lineTo(i*36+60,Y1);g.fill()}
    for(i=0;i<90;i++){x=r()*W;y=Y0+r()*(Y1-Y0);g.strokeStyle='rgba(60,120,50,.22)';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x+1,y-3-r()*2);g.stroke()}
    for(i=0;i<36;i++){x=r()*W;y=Y0+r()*(Y1-Y0);var fc=['#fff','#ffe36e','#ffb3d1','#fff'][i%4];
      g.fillStyle=fc;for(var k=0;k<4;k++){g.beginPath();g.arc(x+Math.cos(k*1.57)*1.6,y+Math.sin(k*1.57)*1.6,1.2,0,7);g.fill()}g.fillStyle='#f6a81c';g.beginPath();g.arc(x,y,.9,0,7);g.fill()}
    L.mud.forEach(function(m){g.fillStyle='rgba(60,40,20,.25)';rr(g,m[0]-3,m[1]-1,m[2]+6,m[3]+6,26);g.fill();
      g.fillStyle='#8d6b4a';rr(g,m[0],m[1],m[2],m[3],24);g.fill();g.fillStyle='#7a5a3c';
      for(i=0;i<9;i++){ell(g,m[0]+14+r()*(m[2]-28),m[1]+12+r()*(m[3]-24),6+r()*9,3+r()*4);g.fill()}
      g.fillStyle='rgba(255,255,255,.18)';for(i=0;i<6;i++){ell(g,m[0]+14+r()*(m[2]-28),m[1]+10+r()*(m[3]-24),4+r()*5,1.3);g.fill()}});
    if(L.stream){var s=L.stream;g.fillStyle='rgba(60,110,50,.5)';g.fillRect(0,s.y-3,W,s.h+6);
      var wg=g.createLinearGradient(0,s.y,0,s.y+s.h);wg.addColorStop(0,dk?'#6fa9d6':'#8ad8f5');wg.addColorStop(1,dk?'#4d86c0':'#56b4e6');g.fillStyle=wg;g.fillRect(0,s.y,W,s.h);
      for(i=0;i<10;i++){g.fillStyle='#b9b3a6';ell(g,r()*W,s.y+(i%2?2:s.h-2),4+r()*3,2.5);g.fill()}}
    L.pens.forEach(function(p){g.fillStyle=p.c===1?'#857597':'#f3e2a4';rr(g,p.x+2,p.y+2,p.w-4,p.h-4,8);g.fill();
      g.strokeStyle=p.c===1?'rgba(60,45,80,.5)':'rgba(190,150,60,.55)';g.lineWidth=1.2;
      for(i=0;i<26;i++){x=p.x+10+r()*(p.w-20);y=p.y+10+r()*(p.h-20);var an=r()*3;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(an)*6,y+Math.sin(an)*6);g.stroke()}});
    g.restore();
    if(L.stream){s=L.stream;g.fillStyle='rgba(0,0,0,.2)';g.fillRect(s.bx-1,s.y-4,s.bw+2,s.h+11);
      g.fillStyle='#c79a5e';g.fillRect(s.bx,s.y-6,s.bw,s.h+12);g.strokeStyle='#9a7040';g.lineWidth=1;
      for(y=s.y-6;y<s.y+s.h+6;y+=6){g.beginPath();g.moveTo(s.bx,y);g.lineTo(s.bx+s.bw,y);g.stroke()}
      g.fillStyle='#8a5f33';g.fillRect(s.bx-3,s.y-8,4,s.h+16);g.fillRect(s.bx+s.bw-1,s.y-8,4,s.h+16)}
    /* 위쪽 산울타리 */
    g.fillStyle=dk?'#2f6a52':'#3f9a56';g.fillRect(0,0,W,Y0-10);
    for(x=-6;x<W+12;x+=17){g.fillStyle=dk?'#2f6a52':'#3f9a56';g.beginPath();g.arc(x+r()*4,Y0-12,11,0,7);g.fill();g.fillStyle='rgba(255,255,255,.1)';g.beginPath();g.arc(x-2,Y0-17,5,0,7);g.fill()}
    return c}

  function init(a){api=a;ko=a.lang==='ko';R=newRun((Date.now()%1e9)|1);T=0;barkQ=false;kbHold=0;btnHold=false;lastTap=-9;banner=null;baaT=3;dogHappy=0;dogOops=0;moved=false;usedInput=false;
    levelFx(R.S.L);a.tempo(1)}

  function update(dt,inp,a){T+=dt;var D=R.S.dog,mx=0,my=0,bark=barkQ,dx,dy,d,m;barkQ=false;
    var kx=((keys.ArrowRight||keys.KeyD)?1:0)-((keys.ArrowLeft||keys.KeyA)?1:0),ky=((keys.ArrowDown||keys.KeyS)?1:0)-((keys.ArrowUp||keys.KeyW)?1:0);
    if(kx||ky){kbHold+=dt;m=(.55+.45*Math.min(1,kbHold/.7))/Math.hypot(kx,ky);mx=kx*m;my=ky*m}
    else{kbHold=0;
      if(inp.tap&&inp.x!=null&&inp.down){if(Math.hypot(inp.x-BX,inp.y-BY)<BR2+6){bark=true;btnHold=true}
        else{if(T-lastTap<.33&&Math.hypot(inp.x-ltx,inp.y-lty)<44)bark=true;lastTap=T;ltx=inp.x;lty=inp.y}}
      if(!inp.down)btnHold=false;
      if(inp.down&&inp.x!=null&&!btnHold){dx=inp.x-D.x;dy=inp.y-D.y;d=Math.hypot(dx,dy);if(d>5){m=Math.min(1,d/55);mx=dx/d*m;my=dy/d*m}}}
    if(mx||my)moved=true;
    var n=dt>.02?2:1,i,k,e,S;
    for(k=0;k<n;k++){runStep(R,dt/n,{mx:mx,my:my,bark:bark});bark=false;
      for(i=0;i<R.ev.length;i++){e=R.ev[i];S=R.S;
        if(e.t==='pen'){bell(a,S.penned);a.burst(e.x,e.y,e.c?'#cdb7ff':'#fff3b0',9);if(R.lvl===0)tipT=Math.min(tipT,1)}
        else if(e.t==='score'){a.add(e.n);a.pop(e.x,e.y-14,'+'+e.n,'#fff7c2')}
        else if(e.t==='panic'){if(T-panicSnd>.25){panicSnd=T;baa(a,620+Math.random()*120)}a.burst(e.x,e.y,'#ff8d7a',4);dogOops=.9}
        else if(e.t==='bark'){woof(a);a.shake(3);rings.push({x:e.x,y:e.y,t:0});a.pop(e.x,e.y-20,ko?'멍!':'Woof!','#fff')}
        else if(e.t==='reject'){a.beep(170,.12,'square');a.pop(e.x,e.y-16,ko?'여긴 아냐!':'Wrong pen!','#ffd0d0')}
        else if(e.t==='wolf'){a.beep(240,.2,'triangle');a.pop(e.x,e.y-18,ko?'깨갱!':'Yipe!','#d9ccff');a.burst(e.x,e.y,'#6a5aa0',10)}
        else if(e.t==='clear'){a.sfx('win');a.add(e.n);dogHappy=1.5;banner={t:0,tb:e.tb,gentle:e.gentle};a.burst(D.x,D.y,'#ffe36e',16)}
        else if(e.t==='level'){levelFx(R.S.L);banner=null;a.sfx('jump')}
        else if(e.t==='over'){a.over()}}}
    S=R.S;D=S.dog;
    /* 꾸밈: 발자국·먼지·나비·구름 */
    if(D.spd>20){D._fd=(D._fd||0)+D.spd*dt;if(D._fd>13){D._fd=0;D._fs=!D._fs;var px=-Math.sin(D.h)*(D._fs?3:-3),py=Math.cos(D.h)*(D._fs?3:-3);foot.push({x:D.x+px,y:D.y+py+4,t:0,r:1.8})}
      if(D.spd>95&&Math.random()<dt*22)dust.push({x:D.x-Math.cos(D.h)*9+(Math.random()-.5)*5,y:D.y-Math.sin(D.h)*9+4+(Math.random()-.5)*4,t:0,r:2+Math.random()*2.5})}
    for(i=0;i<S.sheep.length;i++){var s=S.sheep[i],sv=Math.hypot(s.vx,s.vy);if(sv>30&&s.pen<0){s._fd=(s._fd||0)+sv*dt;if(s._fd>20){s._fd=0;foot.push({x:s.x+(Math.random()-.5)*6,y:s.y+6,t:1.2,r:1.3})}
        if(s.mood===2&&Math.random()<dt*10)dust.push({x:s.x,y:s.y+5,t:0,r:2+Math.random()*2})}}
    if(foot.length>170)foot.splice(0,foot.length-170);
    for(i=foot.length-1;i>=0;i--){foot[i].t+=dt;if(foot[i].t>3.2)foot.splice(i,1)}
    for(i=dust.length-1;i>=0;i--){dust[i].t+=dt;dust[i].y-=dt*8;if(dust[i].t>.55)dust.splice(i,1)}
    for(i=rings.length-1;i>=0;i--){rings[i].t+=dt;if(rings[i].t>.42)rings.splice(i,1)}
    if(banner)banner.t+=dt;if(tipT>0&&tipT<900)tipT-=dt;if(dogHappy>0)dogHappy-=dt;if(dogOops>0)dogOops-=dt;
    baaT-=dt;if(baaT<0){baaT=3.5+Math.random()*4;var cs=S.sheep[Math.floor(Math.random()*S.sheep.length)];if(cs&&cs.mood===0&&moved){baa(a,cs.pen>=0?470:400+Math.random()*60);cs._note=1.1}}
    a.tempo(R.time<10?1.35:1)}

  /* ---------- 그리기 ---------- */
  function drawSheep(g,s){var spd=Math.hypot(s.vx,s.vy),hop=s.hop>0?Math.sin((1-s.hop/.45)*PI)*11:0,bob=spd>8?Math.abs(Math.sin(s.ph))*1.8:Math.sin(T*2+s.ph)*.3,
      x=s.x,y=s.y-hop-bob,blk=s.c===1,hd=Math.atan2(s.vy,s.vx),i;
    g.fillStyle='rgba(20,50,20,'+(hop>2?.12:.22)+')';ell(g,s.x,s.y+7,9-hop*.2,4-hop*.1);g.fill();
    /* 다리 */
    g.strokeStyle=blk?'#25232b':'#5a4a40';g.lineWidth=2.6;g.lineCap='round';var sw=spd>8?Math.sin(s.ph)*2.6:0;
    for(i=0;i<4;i++){var lx=(i<2?-4.5:4.5),ph=(i%3===0?sw:-sw);g.beginPath();g.moveTo(x+lx,y+4);g.lineTo(x+lx+ph*Math.cos(hd),s.y+8-hop*.6+ph*Math.sin(hd)*.4-(i%2?0:1.5));g.stroke()}
    /* 털 */
    var c1=blk?'#35323c':'#e2dccb',c2=blk?'#4d4957':'#fffdf5',sq=1+(spd>8?Math.sin(s.ph*2)*.05:0);
    g.fillStyle=c1;for(i=0;i<7;i++){var an=i*.9+s.ph*.02;g.beginPath();g.arc(x+Math.cos(an)*6.2*sq,y+1.6+Math.sin(an)*5.2/sq,4.6,0,7);g.fill()}
    g.fillStyle=c2;for(i=0;i<7;i++){an=i*.9+s.ph*.02;g.beginPath();g.arc(x+Math.cos(an)*5.8*sq,y-.6+Math.sin(an)*4.8/sq,4.4,0,7);g.fill()}
    ell(g,x,y-.5,6.6*sq,5.6/sq);g.fill();
    g.fillStyle=blk?'rgba(255,255,255,.1)':'rgba(255,255,255,.9)';g.beginPath();g.arc(x-2.5,y-3.5,2.4,0,7);g.fill();
    /* 머리: 위협(또는 가는 쪽)을 돌아본다 */
    var lm=Math.hypot(s.lx,s.ly)||1,hx=x+s.lx/lm*7.2,hy=y+s.ly/lm*6-1,fa=Math.atan2(s.ly,s.lx),face=blk?'#d8cfc2':'#5b4a42';
    g.fillStyle=blk?'#b9ae9f':'#46382f';ell(g,hx-Math.sin(fa)*4.6,hy+Math.cos(fa)*4.6,2.6,1.5,fa+.5);g.fill();ell(g,hx+Math.sin(fa)*4.6,hy-Math.cos(fa)*4.6,2.6,1.5,fa-.5);g.fill();
    g.fillStyle=face;ell(g,hx,hy,4.9,4.3,fa);g.fill();
    g.fillStyle=c2;g.beginPath();g.arc(hx-s.lx/lm*2.6,hy-s.ly/lm*2.6-1,2.5,0,7);g.fill();
    var ex=-Math.sin(fa)*2.2,ey=Math.cos(fa)*2.2,fx=s.lx/lm*1.3,fy=s.ly/lm*1.3,pan=s.mood===2;
    if(s.bl<0&&!pan){g.strokeStyle=blk?'#333':'#fff';g.lineWidth=1.1;g.beginPath();g.moveTo(hx+ex+fx-1.2,hy+ey+fy);g.lineTo(hx+ex+fx+1.2,hy+ey+fy);g.moveTo(hx-ex+fx-1.2,hy-ey+fy);g.lineTo(hx-ex+fx+1.2,hy-ey+fy);g.stroke()}
    else{g.fillStyle='#fff';g.beginPath();g.arc(hx+ex+fx,hy+ey+fy,pan?2.1:1.6,0,7);g.arc(hx-ex+fx,hy-ey+fy,pan?2.1:1.6,0,7);g.fill();
      g.fillStyle='#1b1b22';g.beginPath();g.arc(hx+ex+fx*1.4,hy+ey+fy*1.4,pan?.7:.9,0,7);g.arc(hx-ex+fx*1.4,hy-ey+fy*1.4,pan?.7:.9,0,7);g.fill()}
    /* 기분 아이콘 */
    var iy=y-15;g.textAlign='center';
    if(s._pm===undefined)s._pm=0;if(s._pm!==s.mood){if(s.mood===0&&s.pen<0)s._calm=1.3;s._pm=s.mood}
    if(pan){var jx=Math.sin(T*40+s.ph)*1.2;g.fillStyle='#ff4d4d';g.beginPath();g.arc(x+jx,iy-3,6.5,0,7);g.fill();g.fillStyle='#fff';g.font='11'+FONT;g.fillText('!!',x+jx,iy+1)}
    else if(s.mood===1){g.fillStyle='#ffd23e';g.beginPath();g.arc(x,iy-1,4,0,7);g.fill();g.fillStyle='#6b4a00';g.font='9'+FONT;g.fillText('!',x,iy+2.2)}
    else if(s._calm>0){s._calm-=1/60;g.globalAlpha=Math.min(1,s._calm*2);g.fillStyle='#4fae4a';g.beginPath();g.arc(x-2,iy-1,2.6,0,7);g.arc(x+2,iy-1,2.6,0,7);g.fill();g.beginPath();g.moveTo(x-4.4,iy);g.lineTo(x,iy+5);g.lineTo(x+4.4,iy);g.fill();g.globalAlpha=1}
    if(s._note>0){s._note-=1/60;g.globalAlpha=Math.min(1,s._note*1.5);g.fillStyle='#fff';g.font='10'+FONT;g.fillText(ko?'메~':'baa',x+9,iy-(1.1-s._note)*10);g.globalAlpha=1}
  }
  function drawGoat(g,G){var x=G.x,y=G.y-Math.abs(Math.sin(T*5))*1,sp=Math.hypot(G.vx,G.vy),lx=Math.cos(G.h),ly=Math.sin(G.h);
    g.fillStyle='rgba(20,50,20,.22)';ell(g,G.x,G.y+8,11,4.5);g.fill();
    g.strokeStyle='#5c4a3a';g.lineWidth=2.8;g.lineCap='round';var sw=Math.sin(T*9)*2.4*(sp>4?1:0);
    for(var i=0;i<4;i++){var ox=i<2?-5:5;g.beginPath();g.moveTo(x+ox,y+4);g.lineTo(x+ox+(i%3?sw:-sw)*lx,G.y+9);g.stroke()}
    g.fillStyle='#b9a385';ell(g,x,y+1.5,10,7.5);g.fill();g.fillStyle='#d8c6a6';ell(g,x,y-.5,9.5,7);g.fill();g.fillStyle='#8f7a5e';ell(g,x-3,y+1,3.5,2.6);g.fill();
    var hx=x+lx*9,hy=y+ly*7-2;
    g.strokeStyle='#6e5b46';g.lineWidth=2.4;g.beginPath();g.arc(hx-ly*3-lx*4,hy+lx*3-ly*4,4,G.h+2.2,G.h+4.6);g.stroke();g.beginPath();g.arc(hx+ly*3-lx*4,hy-lx*3-ly*4,4,G.h+1.7,G.h+4.1);g.stroke();
    g.fillStyle='#efe3cc';ell(g,hx,hy,5.4,4.4,G.h);g.fill();g.fillStyle='#cdbb9c';g.beginPath();g.moveTo(hx+lx*4-ly*1.5,hy+ly*4+lx*1.5);g.lineTo(hx+lx*8,hy+ly*8+2);g.lineTo(hx+lx*4+ly*1.5,hy+ly*4-lx*1.5);g.fill();
    g.fillStyle='#2a2320';g.beginPath();g.arc(hx-ly*2.2+lx*1.5,hy+lx*2.2+ly*1.5,1.2,0,7);g.arc(hx+ly*2.2+lx*1.5,hy-lx*2.2+ly*1.5,1.2,0,7);g.fill();
    g.strokeStyle='#4a3a2c';g.lineWidth=1.2;g.beginPath();g.moveTo(hx-ly*3.6+lx*.4,hy+lx*3.6+ly*.4-1.6);g.lineTo(hx-ly*1+lx*2.4,hy+lx*1+ly*2.4-1.2);g.moveTo(hx+ly*3.6+lx*.4,hy-lx*3.6+ly*.4-1.6);g.lineTo(hx+ly*1+lx*2.4,hy-lx*1+ly*2.4-1.2);g.stroke();
    g.fillStyle='#ffc93e';g.beginPath();g.arc(x+lx*4,y+ly*3+4,2.2,0,7);g.fill();
    g.textAlign='center';if(G.startle>0){g.fillStyle='#ffd23e';g.beginPath();g.arc(x,y-17,5,0,7);g.fill();g.fillStyle='#6b4a00';g.font='10'+FONT;g.fillText('!',x,y-13.4)}
    else{g.fillStyle='rgba(255,255,255,.9)';g.font='11'+FONT;g.fillText('♪',x+8+Math.sin(T*3)*2,y-13-Math.abs(Math.sin(T*2))*3)}}
  function drawWolf(g,w){if(w.al<=.02)return;var x=w.x,y=w.y,lx=Math.cos(w.h),ly=Math.sin(w.h),i;g.save();g.globalAlpha=w.al*.62;
    g.fillStyle='#1c1433';for(i=0;i<6;i++){var a=i*1.05+T*.8;g.beginPath();g.arc(x-lx*4+Math.cos(a)*9,y-ly*4+Math.sin(a)*6,7+Math.sin(T*3+i)*1.5,0,7);g.fill()}
    ell(g,x-lx*3,y-ly*3,15,10,w.h);g.fill();var hx=x+lx*13,hy=y+ly*13;g.beginPath();g.arc(hx,hy,7.5,0,7);g.fill();
    g.beginPath();g.moveTo(hx-ly*7-lx*1,hy+lx*7-ly*1);g.lineTo(hx-ly*10-lx*8,hy+lx*10-ly*8);g.lineTo(hx-ly*2-lx*4,hy+lx*2-ly*4);g.fill();
    g.beginPath();g.moveTo(hx+ly*7-lx*1,hy-lx*7-ly*1);g.lineTo(hx+ly*10-lx*8,hy-lx*10-ly*8);g.lineTo(hx+ly*2-lx*4,hy-lx*2-ly*4);g.fill();
    g.beginPath();g.moveTo(hx+lx*5-ly*4,hy+ly*5+lx*4);g.lineTo(hx+lx*14,hy+ly*14);g.lineTo(hx+lx*5+ly*4,hy+ly*5-lx*4);g.fill();
    g.globalAlpha=w.al*(Math.sin(T*1.7)>.93?0.1:1);g.fillStyle='#ffe34d';ell(g,hx-ly*3.2+lx*2,hy+lx*3.2+ly*2,2.2,1.3,w.h+.4);g.fill();ell(g,hx+ly*3.2+lx*2,hy-lx*3.2+ly*2,2.2,1.3,w.h-.4);g.fill();
    g.restore()}
  function drawDog(g,D,S){var ratio=Math.min(1,D.spd/P.DOGV),hopz=0,i,j;
    for(i=0;i<S.L.pens.length;i++)for(j=0;j<S.L.pens[i].walls.length;j++){var w=S.L.pens[i].walls[j],o={x:D.x,y:D.y};if(segPush(o,w,11))hopz=Math.max(hopz,(11-Math.hypot(o.x-D.x,o.y-D.y)>0?8:0))}
    if(dogHappy>0)hopz=Math.max(hopz,Math.abs(Math.sin(dogHappy*9))*9);
    var wet=inAny(D.x,D.y,S.L.water);
    /* 압박 고리: 빨리 달릴수록 붉게 */
    if(R.phase==='play'){g.strokeStyle='rgba(255,'+Math.round(255-ratio*190)+','+Math.round(255-ratio*200)+','+(.26+ratio*.4)+')';g.lineWidth=1.6;g.setLineDash([4,5]);g.beginPath();g.arc(D.x,D.y,39,T*.6,T*.6+PI*2);g.stroke();g.setLineDash([])}
    g.fillStyle='rgba(20,50,20,'+(hopz>2?.13:.25)+')';ell(g,D.x,D.y+7,10-hopz*.2,4.2);g.fill();
    if(wet){g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1.3;ell(g,D.x,D.y+2,12+Math.sin(T*8)*2,6+Math.sin(T*8)*1);g.stroke()}
    g.save();g.translate(D.x,D.y-hopz-(ratio>.2?Math.abs(Math.sin(T*16))*1.4:0));g.rotate(D.h);
    var wag=Math.sin(T*(dogHappy>0?26:13))*(.5+.3*(1-ratio));
    g.strokeStyle='#b8692a';g.lineWidth=3.4;g.lineCap='round';g.beginPath();g.moveTo(-8,0);g.quadraticCurveTo(-13,wag*5,-16,wag*9);g.stroke();
    g.strokeStyle='#fff6e6';g.lineWidth=3;g.beginPath();g.moveTo(-15.4,wag*8);g.lineTo(-16,wag*9);g.stroke();
    var tr=ratio>.1?Math.sin(T*20)*2.6:0;g.strokeStyle='#fff6e6';g.lineWidth=2.8;
    g.beginPath();g.moveTo(-5,-5);g.lineTo(-5+tr,-7.5);g.moveTo(-5,5);g.lineTo(-5-tr,7.5);g.moveTo(4,-5);g.lineTo(4-tr,-7.5);g.moveTo(4,5);g.lineTo(4+tr,7.5);g.stroke();
    g.fillStyle='#c97a30';ell(g,-1,0,10,6.6);g.fill();g.fillStyle='#e39a47';ell(g,-1,-.8,9.4,5.6);g.fill();
    g.fillStyle='#fff6e6';ell(g,-3,0,3.2,5.4);g.fill();
    g.fillStyle='#e94f4f';g.fillRect(3.2,-4.6,2.2,9.2);
    var flap=.25+ratio*.75+Math.sin(T*19)*.28*ratio;
    g.fillStyle='#7a4420';ell(g,7.5-flap*2.5,-6.2,4.6,2.5,-.5-flap*.5);g.fill();ell(g,7.5-flap*2.5,6.2,4.6,2.5,.5+flap*.5);g.fill();
    g.fillStyle='#e39a47';g.beginPath();g.arc(9,0,6.2,0,7);g.fill();
    g.fillStyle='#fff6e6';ell(g,13.2,0,4,3.2);g.fill();ell(g,8,0,1.6,4.4);g.fill();
    g.fillStyle='#2a1c14';g.beginPath();g.arc(16,0,1.5,0,7);g.fill();
    if(ratio>.6||dogHappy>0){g.fillStyle='#ff8fa3';ell(g,14,2.6,1.6,1.1);g.fill()}
    if(Math.sin(T*1.3+1)>.96){g.strokeStyle='#2a1c14';g.lineWidth=1.1;g.beginPath();g.moveTo(10.6,-3.6);g.lineTo(10.6,-1.8);g.moveTo(10.6,1.8);g.lineTo(10.6,3.6);g.stroke()}
    else{g.fillStyle='#2a1c14';g.beginPath();g.arc(10.6,-2.7,dogOops>0?1.9:1.5,0,7);g.arc(10.6,2.7,dogOops>0?1.9:1.5,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(11.1,-3.1,.5,0,7);g.arc(11.1,2.3,.5,0,7);g.fill()}
    g.restore();
    g.textAlign='center';
    if(dogOops>0){g.globalAlpha=Math.min(1,dogOops*2);g.fillStyle='#fff';g.font='12'+FONT;g.fillText(ko?'앗..':'oops',D.x,D.y-16-hopz);g.globalAlpha=1}
    else if(dogHappy>0){g.fillStyle='#ff6f91';var hy=D.y-18-hopz-(1.5-dogHappy)*8;g.beginPath();g.arc(D.x-2.4,hy,2.8,0,7);g.arc(D.x+2.4,hy,2.8,0,7);g.fill();g.beginPath();g.moveTo(D.x-4.9,hy+1);g.lineTo(D.x,hy+6.5);g.lineTo(D.x+4.9,hy+1);g.fill()}
  }
  function drawFence(g,p,S){var i,w,k,n,dark=p.c===1;g.lineCap='round';
    for(i=0;i<p.walls.length;i++){w=p.walls[i];var len=Math.hypot(w[2]-w[0],w[3]-w[1]);if(len<2)continue;
      g.strokeStyle='rgba(40,30,10,.25)';g.lineWidth=5;g.beginPath();g.moveTo(w[0],w[1]+3);g.lineTo(w[2],w[3]+3);g.stroke();
      g.strokeStyle=dark?'#5a4636':'#a8743e';g.lineWidth=4.5;g.beginPath();g.moveTo(w[0],w[1]);g.lineTo(w[2],w[3]);g.stroke();
      g.strokeStyle=dark?'#806650':'#d7a366';g.lineWidth=1.6;g.beginPath();g.moveTo(w[0],w[1]-1.2);g.lineTo(w[2],w[3]-1.2);g.stroke();
      n=Math.max(1,Math.round(len/15));for(k=0;k<=n;k++){var px=w[0]+(w[2]-w[0])*k/n,py=w[1]+(w[3]-w[1])*k/n;g.fillStyle=dark?'#4a382a':'#8a5a2c';g.beginPath();g.arc(px,py,3.3,0,7);g.fill();g.fillStyle=dark?'#806650':'#e0b47c';g.beginPath();g.arc(px-.6,py-1,1.5,0,7);g.fill()}}
    /* 문기둥과 깃발 */
    var gs=p.gs,cnt=0,need=0;S.sheep.forEach(function(s){if(s.pen>=0&&L_pen(S,s)===p)cnt++;if(p.c<0||p.c===s.c)need++});
    for(k=0;k<2;k++){var qx=gs[k*2],qy=gs[k*2+1];g.fillStyle='rgba(40,30,10,.25)';g.beginPath();g.arc(qx,qy+3,5,0,7);g.fill();g.fillStyle=dark?'#3d2e22':'#7a4c22';g.beginPath();g.arc(qx,qy,5,0,7);g.fill();
      g.fillStyle=dark?'#3b3350':p.c===0?'#fff':'#ffcf3e';g.beginPath();g.arc(qx,qy-1,3,0,7);g.fill()}
    /* 점멸하는 문 안내 */
    if(cnt<need){g.globalAlpha=.35+Math.sin(T*4)*.2;g.strokeStyle=dark?'#d9ccff':'#fff';g.lineWidth=2.5;g.setLineDash([5,5]);g.beginPath();g.moveTo(gs[0],gs[1]);g.lineTo(gs[2],gs[3]);g.stroke();g.setLineDash([]);
      var ax=p.gx+p.nx*(18+Math.sin(T*5)*3),ay=p.gy+p.ny*(18+Math.sin(T*5)*3);g.fillStyle=dark?'#d9ccff':'#fff';g.beginPath();g.moveTo(ax-p.nx*9,ay-p.ny*9);g.lineTo(ax+p.nx*3-p.ny*7,ay+p.ny*3+p.nx*7);g.lineTo(ax+p.nx*3+p.ny*7,ay+p.ny*3-p.nx*7);g.fill();g.globalAlpha=1}
    p._cnt=cnt;p._need=need}
  function L_pen(S,s){return S.L.pens[s.pen]}
  function drawSign(g,p){var ux=p.gs[2]-p.gs[0],uy=p.gs[3]-p.gs[1],l=Math.hypot(ux,uy);ux/=l;uy/=l;
    var sx=p.gs[0]-ux*20-p.nx*0,sy=p.gs[1]-uy*20-(p.ny===0?0:0),done=p._cnt>=p._need,tx=p._cnt+'/'+p._need,dark=p.c===1;
    if(p.side==='t'||p.side==='b'){sy+=p.side==='t'?-9:9}else sy-=0;
    sx=Math.max(26,Math.min(W-26,sx));
    g.fillStyle='rgba(30,20,10,.3)';rr(g,sx-17,sy-8,34,19,5);g.fill();
    g.fillStyle=done?'#7ed957':dark?'#4a4063':'#fff6dc';rr(g,sx-17,sy-10,34,19,5);g.fill();g.strokeStyle=dark?'#2c2540':'#8a5a2c';g.lineWidth=1.5;g.stroke();
    g.fillStyle=done?'#1f5a14':dark?'#fff':'#5a3a18';g.font='13'+FONT;g.textAlign='center';g.fillText(tx,sx,sy+4)}

  function draw(g,a){if(!R)return;var S=R.S,L=S.L,i,s,x,y;
    if(bgN!==L.n||!bg){bg=buildBg(L);bgN=L.n}
    g.drawImage(bg,0,0);
    /* 개울 물결 */
    if(L.stream){var st=L.stream;g.save();g.beginPath();g.rect(0,st.y,st.bx,st.h);g.rect(st.bx+st.bw,st.y,W,st.h);g.clip();g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.4;g.lineCap='round';
      for(i=0;i<16;i++){x=((i*53+T*22)%(W+40))-20;y=st.y+5+(i*7)%(st.h-9);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+5,y-2,x+10,y);g.stroke()}g.restore()}
    /* 발자국 */
    for(i=0;i<foot.length;i++){var f=foot[i];g.fillStyle='rgba(50,90,40,'+(.3*(1-f.t/3.2))+')';g.beginPath();g.arc(f.x,f.y,f.r,0,7);g.fill()}
    /* 풀 포기 */
    g.lineCap='round';for(i=0;i<tufts.length;i++){var tf=tufts[i],sw=Math.sin(T*1.6+tf.p)*2.2*tf.s;g.strokeStyle=L.dusk?'#3f7f52':'#4fa646';g.lineWidth=1.6;
      g.beginPath();g.moveTo(tf.x-3,tf.y);g.lineTo(tf.x-4+sw,tf.y-6*tf.s);g.moveTo(tf.x,tf.y);g.lineTo(tf.x+sw*1.2,tf.y-8*tf.s);g.moveTo(tf.x+3,tf.y);g.lineTo(tf.x+4+sw,tf.y-6*tf.s);g.stroke()}
    for(i=0;i<L.mud.length;i++){var m=L.mud[i],bt=(T*.7+i)%1;g.strokeStyle='rgba(255,255,255,'+(.4*(1-bt))+')';g.lineWidth=1;g.beginPath();g.arc(m[0]+m[2]*(.3+.4*((Math.floor(T*.7+i)*.37)%1)),m[1]+m[3]*.5,1+bt*4,0,7);g.stroke()}
    for(i=0;i<L.pens.length;i++)drawFence(g,L.pens[i],S);
    for(i=0;i<dust.length;i++){var du=dust[i];g.fillStyle='rgba(235,220,180,'+(.55*(1-du.t/.55))+')';g.beginPath();g.arc(du.x,du.y,du.r+du.t*7,0,7);g.fill()}
    /* y 순서대로 */
    var ents=[];for(i=0;i<S.sheep.length;i++)ents.push({y:S.sheep[i].y,k:0,o:S.sheep[i]});
    ents.push({y:S.dog.y,k:1,o:S.dog});if(S.goat)ents.push({y:S.goat.y,k:2,o:S.goat});
    ents.sort(function(p,q){return p.y-q.y});
    if(S.wolf)drawWolf(g,S.wolf);
    for(i=0;i<ents.length;i++){var e=ents[i];if(e.k===0)drawSheep(g,e.o);else if(e.k===1)drawDog(g,e.o,S);else drawGoat(g,e.o)}
    for(i=0;i<rings.length;i++){var rg=rings[i],rt=rg.t/.42;g.strokeStyle='rgba(255,255,255,'+(.8*(1-rt))+')';g.lineWidth=4*(1-rt)+1;g.beginPath();g.arc(rg.x,rg.y,14+rt*(P.BR-14),0,7);g.stroke();
      g.strokeStyle='rgba(255,120,100,'+(.5*(1-rt))+')';g.lineWidth=1.5;g.beginPath();g.arc(rg.x,rg.y,Math.min(P.BP,10+rt*90),0,7);g.stroke()}
    for(i=0;i<L.pens.length;i++)drawSign(g,L.pens[i]);
    /* 나비 */
    for(i=0;i<bfly.length&&!L.dusk;i++){var b=bfly[i];b.a+=Math.sin(T*.9+b.p)*.03;b.x+=Math.cos(b.a)*.35;b.y+=Math.sin(b.a)*.3+Math.sin(T*3+b.p)*.2;
      if(b.x<24||b.x>W-24)b.a=PI-b.a;if(b.y<70||b.y>H-30)b.a=-b.a;b.x=Math.max(22,Math.min(W-22,b.x));b.y=Math.max(68,Math.min(H-28,b.y));
      var fl=Math.abs(Math.sin(T*11+b.p));g.fillStyle='rgba(20,50,20,.15)';ell(g,b.x,b.y+9,3,1.2);g.fill();g.fillStyle=b.c;ell(g,b.x-2.4*fl,b.y,2.6*fl+.4,3.2);g.fill();ell(g,b.x+2.4*fl,b.y,2.6*fl+.4,3.2);g.fill();g.fillStyle='#5a4030';g.fillRect(b.x-.5,b.y-2.5,1,5)}
    /* 구름 그림자 */
    for(i=0;i<clouds.length;i++){var c=clouds[i],cx=((c.x+T*c.v)%(W+2*c.w))-c.w;g.fillStyle=L.dusk?'rgba(30,20,70,.045)':'rgba(30,60,60,.055)';ell(g,cx,c.y,c.w,c.w*.42);g.fill();ell(g,cx+c.w*.5,c.y+14,c.w*.6,c.w*.3);g.fill()}
    /* 해질녘 */
    if(L.dusk){var dg=g.createLinearGradient(0,0,0,H);dg.addColorStop(0,'rgba(255,120,70,.20)');dg.addColorStop(.5,'rgba(90,50,130,.24)');dg.addColorStop(1,'rgba(30,25,90,.36)');g.fillStyle=dg;g.fillRect(0,0,W,H);
      g.globalCompositeOperation='lighter';for(i=0;i<L.pens.length;i++){var pp=L.pens[i],lg=g.createRadialGradient(pp.gx,pp.gy,2,pp.gx,pp.gy,58);lg.addColorStop(0,'rgba(255,200,110,.38)');lg.addColorStop(1,'rgba(255,200,110,0)');g.fillStyle=lg;g.beginPath();g.arc(pp.gx,pp.gy,58,0,7);g.fill()}
      var dl=g.createRadialGradient(S.dog.x,S.dog.y,2,S.dog.x,S.dog.y,46);dl.addColorStop(0,'rgba(255,230,170,.22)');dl.addColorStop(1,'rgba(255,230,170,0)');g.fillStyle=dl;g.beginPath();g.arc(S.dog.x,S.dog.y,46,0,7);g.fill();g.globalCompositeOperation='source-over'}
    /* 1레벨 안내 화살표 */
    if(R.lvl===0&&S.penned===0&&R.phase==='play'){var p0=L.pens[0],ph=(T*.7)%1,ax=S.dog.x+20+(p0.gx-34-S.dog.x)*ph;g.globalAlpha=.75*Math.sin(ph*PI);g.fillStyle='#fff';
      g.beginPath();g.moveTo(ax+10,S.dog.y-26);g.lineTo(ax-2,S.dog.y-33);g.lineTo(ax-2,S.dog.y-19);g.fill();g.fillRect(ax-14,S.dog.y-28.5,13,5);g.globalAlpha=1}
    /* 시간 막대 */
    var tw=244,tx0=56,fr=Math.max(0,R.time/P.TCAP),low=R.time<10;
    g.fillStyle='rgba(0,0,0,.35)';rr(g,tx0-2,35,tw+4,11,5.5);g.fill();
    g.fillStyle=low?(Math.sin(T*10)>0?'#ff5a4d':'#ff8a6a'):R.time<20?'#ffb640':'#8be35a';if(fr>.02){rr(g,tx0,37,Math.max(7,tw*fr),7,3.5);g.fill()}
    g.fillStyle='#fff';g.font='14'+FONT;g.textAlign='left';g.fillText('Lv '+(R.lvl+1),12,46);g.textAlign='right';g.fillText(Math.ceil(R.time)+(ko?'초':'s'),W-10,46);
    /* 짖기 버튼 */
    var cd=Math.max(0,S.barkCd)/1.1;g.globalAlpha=.9;g.fillStyle='rgba(40,30,20,.3)';g.beginPath();g.arc(BX,BY+2,BR2,0,7);g.fill();
    g.fillStyle=cd>0?'#d9cfc0':'#fff8e8';g.beginPath();g.arc(BX,BY,BR2,0,7);g.fill();g.strokeStyle='#c97a30';g.lineWidth=2.5;g.stroke();
    if(cd>0){g.strokeStyle='#e94f4f';g.lineWidth=3;g.beginPath();g.arc(BX,BY,BR2-4,-PI/2,-PI/2+PI*2*(1-cd));g.stroke()}
    g.fillStyle='#8a4a1c';g.font='15'+FONT;g.textAlign='center';g.fillText(ko?'멍!':'Bark',BX,BY+5);g.globalAlpha=1;
    /* 힌트 */
    if(L.tip&&tipT>0&&R.phase==='play'){var tt=L.tip[ko?'ko':'en'];g.font='15'+FONT;var wd=g.measureText(tt).width+22,ty=74,topPen=false,botPen=false;
      L.pens.forEach(function(p){if(p.y<130)topPen=true;if(p.y>400)botPen=true});if(topPen)ty=botPen?250:560;
      g.globalAlpha=Math.min(1,tipT);g.fillStyle='rgba(40,60,30,.78)';rr(g,W/2-wd/2,ty-17,wd,26,13);g.fill();g.fillStyle='#fff';g.textAlign='center';g.fillText(tt,W/2,ty+1);g.globalAlpha=1}
    /* 레벨 클리어 */
    if(banner&&R.phase==='clear'){var bt2=Math.min(1,banner.t*4),sc=.6+.4*bt2+Math.sin(Math.min(1,banner.t*3)*PI)*.12;g.save();g.translate(W/2,270);g.scale(sc,sc);g.textAlign='center';
      var lines=[[ko?'모두 우리로!':'All penned!','#fff',26]];if(banner.tb>0)lines.push([(ko?'빠른 몰이 +':'Speedy +')+banner.tb,'#ffe36e',17]);if(banner.gentle)lines.push([(ko?'살살 양치기 +':'Gentle shepherd +')+banner.gentle,'#b8f5a0',17]);
      var hh=22+lines.length*24;g.fillStyle='rgba(40,60,30,.8)';rr(g,-124,-34,248,hh+14,16);g.fill();
      for(i=0;i<lines.length;i++){g.font=lines[i][2]+FONT;g.fillStyle=lines[i][1];g.fillText(lines[i][0],0,i?i*24+2:-4)}g.restore()}
  }

  SG.run({id:'sheep-herd',title:{ko:'살살 양몰이',en:'Gentle Herd'},
    how:{ko:'양치기 개 보리로 양 떼 뒤를 빙 돌아 살살 밀어 우리에 넣어요. 돌진하면 흩어져요!',en:'Circle behind the flock and nudge it gently into the pen. Charge in and it scatters!'},
    init:init,update:update,draw:draw});
})();
