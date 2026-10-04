/* 그늘 건너기 — 해가 움직이면 그림자도 움직인다. 눈꼬마 뭉이를 그늘로만 이끌어 냉동 트럭까지 데려간다.
   그림자는 실제 물체(기둥·나무·전차·구름·양산…)의 윤곽을 해 반대 방향으로 투영해 계산한다. */
(function(){
  'use strict';
  var W=360,H=640,TOP=96,SPEED=100,PR=7,MELT_T=1.1,RECOV=0.55,COOL=1.4,HK=0.55;
  var X0=10,X1=350,Y0=104,Y1=630;

  /* ================= 논리(헤드리스에서도 실행) ================= */
  /* s: 0(아침)…0.5(정오)…1(저녁). 그림자 벡터 = 높이 1당 (dx,dy) */
  function sunAt(s){var e=(10+50*Math.sin(Math.PI*s))*Math.PI/180,L=1/Math.tan(e),th=Math.PI*(.12+.76*s);
    return {dx:Math.cos(th)*L,dy:Math.sin(th)*L,L:L,s:s}}
  function tri(u){u=((u%2)+2)%2;return u>1?2-u:u}
  function ease(u){return u*u*(3-2*u)}
  function sunParam(room,t){return room.sun[0]+(room.sun[1]-room.sun[0])*tri(t/room.sun[2])}
  function rectP(x,y,w,d){return [x-w/2,y-d/2,x+w/2,y-d/2,x+w/2,y+d/2,x-w/2,y+d/2]}
  function hull(p){var n=p.length>>1,id=[],i,k=0,h=[],t,out=[];for(i=0;i<n;i++)id.push(i);
    id.sort(function(a,b){return p[2*a]-p[2*b]||p[2*a+1]-p[2*b+1]});
    function cr(o,a,b){return (p[2*a]-p[2*o])*(p[2*b+1]-p[2*o+1])-(p[2*a+1]-p[2*o+1])*(p[2*b]-p[2*o])}
    for(i=0;i<n;i++){while(k>=2&&cr(h[k-2],h[k-1],id[i])<=0)k--;h[k++]=id[i]}
    for(i=n-2,t=k+1;i>=0;i--){while(k>=t&&cr(h[k-2],h[k-1],id[i])<=0)k--;h[k++]=id[i]}
    k--;for(i=0;i<k;i++)out.push(p[2*h[i]],p[2*h[i]+1]);return out}
  function inPoly(P,x,y){var n=P.length,s=0,i,j,c;for(i=0,j=n-2;i<n;j=i,i+=2){
      c=(P[i]-P[j])*(y-P[j+1])-(P[i+1]-P[j+1])*(x-P[j]);
      if(c>1e-9){if(s<0)return false;s=1}else if(c<-1e-9){if(s>0)return false;s=-1}}return true}
  var _q=[0,0];
  function segD2(ax,ay,bx,by,x,y){var vx=bx-ax,vy=by-ay,l=vx*vx+vy*vy,u=l?((x-ax)*vx+(y-ay)*vy)/l:0;u=u<0?0:u>1?1:u;
    _q[0]=ax+vx*u;_q[1]=ay+vy*u;var dx=x-_q[0],dy=y-_q[1];return dx*dx+dy*dy}
  function polyDist(P,x,y){var n=P.length,b=1e18,i,j,d;for(i=0,j=n-2;i<n;j=i,i+=2){d=segD2(P[j],P[j+1],P[i],P[i+1],x,y);if(d<b)b=d}return Math.sqrt(b)}
  function lobes(o,x,y){var r=o.r;return [[x-.6*r,y+.05*r,.7*r],[x,y-.1*r,r],[x+.62*r,y+.1*r,.74*r]]}
  /* 움직이는 물체의 현재 위치 */
  function posOf(o,t,dev){var u;
    if(o.t==='cloud'){u=(((t/o.per+(o.ph||0))%1)+1)%1;return [o.x+(o.x2-o.x)*u,o.y+(o.y2-o.y)*u]}
    if(o.t==='tram'||o.t==='walker'){u=ease(tri(t/o.per+(o.ph||0)));return [o.x+(o.x2-o.x)*u,o.y+(o.y2-o.y)*u]}
    if(o.t==='cart'){u=ease(dev[o.di]);return [o.x+(o.x2-o.x)*u,o.y+(o.y2-o.y)*u]}
    return [o.x,o.y]}
  function boardAng(o,t){return o.a0+o.w*t}
  /* 가림막 목록: {P|cx,cy,r, h0,h1, solid, soft} */
  function occ(room,t,dev){var out=[],i,o,p,a,L,ca,sa,nx,ny,k;
    for(i=0;i<room.objs.length;i++){o=room.objs[i];
      switch(o.t){
        case 'pillar':out.push({P:rectP(o.x,o.y,o.w,o.d),h0:0,h1:o.h,solid:1});break;
        case 'statue':out.push({cx:o.x,cy:o.y,r:o.r,h0:0,h1:o.h,solid:1});break;
        case 'fountain':out.push({cx:o.x,cy:o.y,r:o.r,h0:0,h1:5,solid:1});break;
        case 'tree':out.push({cx:o.x,cy:o.y,r:4,h0:0,h1:o.h*.6,solid:1});out.push({cx:o.x,cy:o.y,r:o.r,h0:o.h*.6,h1:o.h});break;
        case 'awning':out.push({P:rectP(o.x,o.y,o.w,o.d),h0:o.h,h1:o.h});break;
        case 'cloud':p=posOf(o,t);L=lobes(o,p[0],p[1]);for(k=0;k<3;k++)out.push({cx:L[k][0],cy:L[k][1],r:L[k][2]*.85,h0:0,h1:0,soft:1});break;
        case 'tram':p=posOf(o,t);out.push({P:rectP(p[0],p[1],o.w,o.d),h0:0,h1:o.h,solid:1});break;
        case 'walker':p=posOf(o,t);out.push({cx:p[0],cy:p[1],r:19,h0:12,h1:12});break;
        case 'flag':out.push({cx:o.x,cy:o.y,r:2,h0:0,h1:o.h,solid:1});a=.3+.22*Math.sin(t*2.3+o.x);L=24+4*Math.sin(t*3.1);
          out.push({P:[o.x,o.y,o.x+Math.cos(a)*L,o.y+Math.sin(a)*L,o.x+Math.cos(a)*L+.5,o.y+Math.sin(a)*L+.5],h0:o.h*.7,h1:o.h});break;
        case 'board':out.push({cx:o.x,cy:o.y,r:3,h0:0,h1:o.h1,solid:1});a=boardAng(o,t);ca=Math.cos(a);sa=Math.sin(a);nx=-sa*9;ny=ca*9;
          out.push({P:[o.x+nx,o.y+ny,o.x+ca*o.len+nx,o.y+sa*o.len+ny,o.x+ca*o.len-nx,o.y+sa*o.len-ny,o.x-nx,o.y-ny],h0:o.h0,h1:o.h1});break;
        case 'cart':p=posOf(o,t,dev);out.push({P:rectP(p[0],p[1],o.w,o.d),h0:0,h1:o.h,solid:1});break;
        case 'stand':out.push({cx:o.x,cy:o.y,r:3,h0:0,h1:14,solid:1});out.push({cx:o.x,cy:o.y,r:o.r*(.15+.85*dev[o.di]),h0:14,h1:14});break;
      }}
    return out}
  /* 그림자 도형: 볼록 다각형 {P} 또는 캡슐 {ax,ay,bx,by,r} */
  function shadows(sn,oc){var out=[],i,c,j,pts;
    for(i=0;i<oc.length;i++){c=oc[i];
      if(c.P){pts=[];for(j=0;j<c.P.length;j+=2){pts.push(c.P[j]+sn.dx*c.h0,c.P[j+1]+sn.dy*c.h0);
          if(c.h1!==c.h0)pts.push(c.P[j]+sn.dx*c.h1,c.P[j+1]+sn.dy*c.h1)}
        out.push({P:c.h1!==c.h0||pts.length<8?hull(pts):pts})}
      else out.push({ax:c.cx+sn.dx*c.h0,ay:c.cy+sn.dy*c.h0,bx:c.cx+sn.dx*c.h1,by:c.cy+sn.dy*c.h1,r:c.r,soft:c.soft})}
    return out}
  function shapesAt(room,t,dev){return shadows(sunAt(sunParam(room,t)),occ(room,t,dev))}
  function inShade(sh,x,y){for(var i=0,s;i<sh.length;i++){s=sh[i];
      if(s.P){if(inPoly(s.P,x,y))return true}else if(segD2(s.ax,s.ay,s.bx,s.by,x,y)<=s.r*s.r)return true}return false}
  var FOOT=[0,0,5,0,-5,0,0,5,0,-5];
  function sunFrac(sh,x,y){var n=0;for(var i=0;i<10;i+=2)if(!inShade(sh,x+FOOT[i],y+FOOT[i+1]))n++;return n/5}
  function sprkOn(o,t){return (((t+(o.ph||0))%o.per)+o.per)%o.per<o.on}
  function cooled(room,t,x,y){for(var i=0,o;i<room.sprk.length;i++){o=room.sprk[i];
      if(sprkOn(o,t)&&(x-o.x)*(x-o.x)+(y-o.y)*(y-o.y)<o.r*o.r)return true}return false}
  function pushOut(st,oc){var i,c,dx,dy,d,P,n,b,bx,by,j,k,q,ins;
    for(i=0;i<oc.length;i++){c=oc[i];if(!c.solid)continue;
      if(c.P){P=c.P;n=P.length;b=1e18;for(k=0,j=n-2;k<n;j=k,k+=2){q=segD2(P[j],P[j+1],P[k],P[k+1],st.x,st.y);if(q<b){b=q;bx=_q[0];by=_q[1]}}
        d=Math.sqrt(b);ins=inPoly(P,st.x,st.y);
        if(ins){if(d<1e-6){st.y+=PR}else{st.x=bx+(bx-st.x)/d*PR;st.y=by+(by-st.y)/d*PR}}
        else if(d<PR){if(d<1e-6)st.y+=PR;else{st.x=bx+(st.x-bx)/d*PR;st.y=by+(st.y-by)/d*PR}}}
      else{dx=st.x-c.cx;dy=st.y-c.cy;d=Math.sqrt(dx*dx+dy*dy);if(d<c.r+PR){if(d<1e-6){dx=0;dy=1;d=1}st.x=c.cx+dx/d*(c.r+PR);st.y=c.cy+dy/d*(c.r+PR)}}}}
  function devNear(room,st,o){var p;if(o.t==='cart'){p=posOf(o,st.t,st.dev);return polyDist(rectP(p[0],p[1],o.w,o.d),st.x,st.y)<24||inPoly(rectP(p[0],p[1],o.w,o.d),st.x,st.y)}
    return Math.sqrt((st.x-o.x)*(st.x-o.x)+(st.y-o.y)*(st.y-o.y))<32}
  function nearDev(room,st){for(var i=0;i<room.devs.length;i++)if(devNear(room,st,room.devs[i]))return room.devs[i];return null}
  /* 방 준비: 출발 차양과 냉동 트럭을 가림막으로 추가 */
  function prep(r){var room={sun:r.sun,sx:r.sx==null?180:r.sx,sy:r.sy==null?606:r.sy,gx:r.gx,gy:r.gy==null?148:r.gy,limit:r.limit||0,hint:r.hint||null,objs:[],devs:[],sprk:[],ice:[]};
    room.objs.push({t:'awning',x:room.sx,y:room.sy+4,w:66,d:44,h:5,home:1});
    room.objs.push({t:'pillar',x:room.gx,y:room.gy-22,w:46,d:24,h:22,truck:1});
    (r.objs||[]).forEach(function(o){var c={},k;for(k in o)c[k]=o[k];
      if(c.t==='sprk')room.sprk.push(c);else if(c.t==='ice')room.ice.push(c);
      else{if(c.t==='pillar'){c.w=c.w||30;c.d=c.d||22}
        if(c.t==='cart'||c.t==='stand'){c.di=room.devs.length;room.devs.push(c)}room.objs.push(c)}});
    return room}
  function newState(room){var d=[],g=[],ic=[],i;for(i=0;i<room.devs.length;i++){d.push(0);g.push(0)}for(i=0;i<room.ice.length;i++)ic.push(false);
    return {x:room.sx,y:room.sy,m:0,t:0,dev:d,tg:g,ice:ic,dead:0,won:false,peak:0,got:0,frac:0,cool:false,acted:null,sh:null,oc:null,sn:null}}
  /* 한 틱. ix,iy: -1..1 이동, act: 행동 버튼 */
  function step(st,room,ix,iy,act,dt){var i,o,l,oc,sn;
    st.t+=dt;st.acted=null;st.gotNow=0;
    for(i=0;i<st.dev.length;i++){if(st.dev[i]<st.tg[i])st.dev[i]=Math.min(st.tg[i],st.dev[i]+dt/.6);else if(st.dev[i]>st.tg[i])st.dev[i]=Math.max(st.tg[i],st.dev[i]-dt/.6)}
    if(act){o=nearDev(room,st);if(o){if(o.t==='cart')st.tg[o.di]=st.tg[o.di]?0:1;else st.tg[o.di]=1;st.acted=o}}
    l=Math.sqrt(ix*ix+iy*iy);if(l>1){ix/=l;iy/=l}
    st.x+=ix*SPEED*dt;st.y+=iy*SPEED*dt;
    oc=occ(room,st.t,st.dev);pushOut(st,oc);pushOut(st,oc);
    st.x=st.x<X0?X0:st.x>X1?X1:st.x;st.y=st.y<Y0?Y0:st.y>Y1?Y1:st.y;
    sn=sunAt(sunParam(room,st.t));st.sn=sn;st.oc=oc;st.sh=shadows(sn,oc);
    st.frac=sunFrac(st.sh,st.x,st.y);st.cool=cooled(room,st.t,st.x,st.y);
    if(st.cool)st.m-=COOL*dt;else if(st.frac>0)st.m+=st.frac*dt/MELT_T;else st.m-=RECOV*dt;
    if(st.m<0)st.m=0;if(st.m>st.peak)st.peak=st.m;
    for(i=0;i<room.ice.length;i++){o=room.ice[i];if(!st.ice[i]&&(st.x-o.x)*(st.x-o.x)+(st.y-o.y)*(st.y-o.y)<15*15){st.ice[i]=true;st.got++;st.gotNow=i+1}}
    if((st.x-room.gx)*(st.x-room.gx)+(st.y-room.gy)*(st.y-room.gy)<15*15)st.won=true;
    else if(st.m>=1)st.dead=1;
    else if(room.limit&&st.t>room.limit)st.dead=2;
    return st}

  /* ================= 광장 10개 (손으로 만든 것) ================= */
  var HAND=[
    /* 1: 기둥 그늘 징검다리 */
    {sun:[.2,.22,14],gx:100,hint:{ko:'그늘로만 다녀요',en:'Stay in the shade'},objs:[
      {t:'pillar',x:204,y:532,h:64},{t:'pillar',x:176,y:460,h:64},{t:'pillar',x:148,y:388,h:64},{t:'pillar',x:120,y:316,h:64},{t:'pillar',x:92,y:244,h:64},{t:'pillar',x:64,y:172,h:64},
      {t:'fountain',x:270,y:300,r:30},{t:'tree',x:306,y:470,r:24,h:46},{t:'flag',x:300,y:190,h:50},{t:'ice',x:236,y:424}]},
    /* 2: 해가 기울면 닫히는 틈 */
    {sun:[.68,.9,8],gx:300,hint:{ko:'그림자가 이어질 때까지 기다려요',en:'Wait for the shadows to join'},objs:[
      {t:'pillar',x:170,y:505,h:70},{t:'pillar',x:240,y:335,h:112,w:26,d:22},{t:'pillar',x:292,y:232,h:74},
      {t:'statue',x:70,y:300,r:13,h:40},{t:'fountain',x:90,y:470,r:26},{t:'ice',x:120,y:392}]},
    /* 3: 구름 그림자를 타고 */
    {sun:[.45,.55,10],gx:236,hint:{ko:'구름 그림자를 타고 가요',en:'Ride the cloud shadow'},objs:[
      {t:'cloud',x:150,y:720,x2:240,y2:40,per:9.5,ph:.02,r:44},{t:'cloud',x:150,y:720,x2:240,y2:40,per:9.5,ph:.52,r:44},
      {t:'fountain',x:206,y:372,r:22},{t:'pillar',x:70,y:420,h:40},{t:'pillar',x:310,y:300,h:40},{t:'ice',x:120,y:300},{t:'flag',x:60,y:220,h:50}]},
    /* 4: 수레 밀기 */
    {sun:[.2,.3,12],gx:120,hint:{ko:'수레 옆에서 버튼(스페이스)으로 밀어요',en:'Push the cart: button or Space'},objs:[
      {t:'pillar',x:200,y:522,h:62},{t:'cart',x:272,y:492,x2:182,y2:408,w:58,d:34,h:70},
      {t:'pillar',x:150,y:300,h:72},{t:'tree',x:100,y:214,r:25,h:52},{t:'fountain',x:290,y:250,r:28},{t:'ice',x:262,y:380}]},
    /* 5: 전차 그림자 따라 */
    {sun:[.4,.5,10],sx:60,gx:300,hint:{ko:'전차 그림자를 따라 걸어요',en:'Walk along with the tram'},objs:[
      {t:'tree',x:104,y:545,r:22,h:40},{t:'pillar',x:66,y:452,h:90},{t:'tram',x:90,y:384,x2:270,y2:384,per:3.2,ph:1.19,w:92,d:30,h:44},
      {t:'pillar',x:318,y:318,h:92},{t:'pillar',x:292,y:232,h:86},{t:'tree',x:262,y:196,r:22,h:40},{t:'tree',x:150,y:250,r:24,h:44},{t:'ice',x:180,y:470},{t:'flag',x:40,y:250,h:50}]},
    /* 6: 시곗바늘 광고판 */
    {sun:[.3,.42,12],gx:180,hint:{ko:'돌아가는 그림자에 올라타요',en:'Hop on the turning shadow'},objs:[
      {t:'board',x:180,y:352,len:128,w:1,a0:.5,h0:14,h1:60},{t:'tree',x:150,y:548,r:22,h:40},
      {t:'tree',x:196,y:214,r:24,h:44},{t:'ice',x:60,y:350},{t:'ice',x:304,y:372}]},
    /* 7: 양산 든 사람들과 파라솔 */
    {sun:[.44,.56,10],gx:276,gy:264,hint:{ko:'파라솔을 펴고(버튼·스페이스) 양산을 따라가요',en:'Open the parasol (button/Space), follow the umbrellas'},objs:[
      {t:'stand',x:128,y:574,r:28},{t:'walker',x:70,y:548,x2:70,y2:440,per:2.2,ph:1.1},{t:'tree',x:38,y:428,r:24,h:40},
      {t:'walker',x:104,y:412,x2:270,y2:412,per:2.8,ph:.5},{t:'tree',x:304,y:402,r:24,h:40},
      {t:'tree',x:276,y:320,r:24,h:44},{t:'ice',x:196,y:330},{t:'fountain',x:214,y:500,r:24},{t:'walker',x:60,y:200,x2:200,y2:200,per:3,ph:.3},{t:'flag',x:60,y:300,h:50}]},
    /* 8: 정오 — 그늘이 거의 없다 */
    {sun:[.47,.53,10],gx:150,hint:{ko:'정오! 물뿌리개에서 식혀요',en:'Noon! Cool off in the sprinklers'},objs:[
      {t:'sprk',x:190,y:520,r:30,per:3,on:1.9,ph:0},{t:'sprk',x:120,y:442,r:30,per:3,on:1.9,ph:2},{t:'pillar',x:196,y:350,h:70,w:40},
      {t:'sprk',x:136,y:296,r:30,per:3,on:1.9,ph:1},{t:'walker',x:60,y:222,x2:300,y2:222,per:4.2},{t:'cloud',x:-90,y:262,x2:450,y2:250,per:10,ph:.3,r:40},
      {t:'ice',x:268,y:430},{t:'fountain',x:286,y:330,r:26}]},
    /* 9: 종합 */
    {sun:[.16,.4,9],sx:268,gx:70,hint:{ko:'전부 다 써 봐요',en:'Use everything you know'},objs:[
      {t:'pillar',x:300,y:520,h:70},{t:'cart',x:236,y:520,x2:236,y2:452,w:44,d:30,h:66},
      {t:'tram',x:90,y:384,x2:270,y2:384,per:3.2,w:88,d:28,h:44,ph:1.6},{t:'board',x:120,y:286,len:92,w:-1,a0:0,h0:14,h1:56},
      {t:'cloud',x:-90,y:210,x2:450,y2:226,per:8,ph:.1,r:42},{t:'tree',x:70,y:206,r:22,h:40},{t:'sprk',x:250,y:300,r:28,per:3,on:1.8},
      {t:'ice',x:300,y:240},{t:'ice',x:60,y:470}]},
    /* 10: 해 질 녘 — 트럭이 떠나기 전에 */
    {sun:[.84,.97,12],sx:268,gx:70,limit:15,hint:{ko:'해가 진다! 트럭이 떠나기 전에',en:'Dusk! Before the truck leaves'},objs:[
      {t:'pillar',x:330,y:560,h:60},{t:'pillar',x:250,y:500,h:70,w:60},{t:'statue',x:300,y:410,r:14,h:60},
      {t:'pillar',x:320,y:300,h:80},{t:'pillar',x:230,y:250,h:60,w:60},{t:'pillar',x:160,y:190,h:50},{t:'fountain',x:80,y:400,r:26},
      {t:'ice',x:60,y:520},{t:'ice',x:150,y:330}]}
  ];
  /* ================= 무한 광장 생성 (봇으로 검증한 시드만 사용) ================= */
  function rng(seed){var s=(seed*2654435761)>>>0||1;return function(){s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
  function gen(seed){var r=rng(seed),am=r()<.5,s0=.14+r()*.18,s1=s0+.12+r()*.16,objs=[],rows=[532,448,364,280,196],row,y,k,h,x,q,n,i,sm,sx,px,sg,w,cr;
    function cl(v,a,b){return v<a?a:v>b?b:v}
    if(!am){s0=1-s0;s1=1-s1}
    sm=sunAt((s0+s1)/2);sg=sm.dx>0?1:-1;sx=Math.round(100+r()*160);px=sx;
    /* 길(px)을 따라 줄마다 그늘을 놓고, 길에서 먼 곳에 장식을 둔다 */
    for(row=0;row<5;row++){y=rows[row]+Math.floor(r()*12-6);k=r();
      if(k<.5){h=Math.round(56+r()*34);w=r()<.3?44:30;x=Math.round(cl(px-sm.dx*h*.9+r()*10-5,30,330));objs.push({t:'pillar',x:x,y:y,h:h,w:w});px=cl(x+sg*(w/2+13),16,344)}
      else if(k<.64){h=Math.round(40+r()*14);cr=Math.round(22+r()*5);x=Math.round(cl(px-sm.dx*h*.8+r()*12-6,34,326));objs.push({t:'tree',x:x,y:y,r:cr,h:h});px=cl(x+sm.dx*h*.4+sg*8,16,344)}
      else if(k<.76){objs.push({t:'tram',x:80,y:y,x2:280,y2:y,per:3+r()*1.2,w:88,d:28,h:44,ph:r()*2});px=60+r()*240;continue}
      else if(k<.88){q=3+r()*1.2;n=r()*2;objs.push({t:'walker',x:40,y:y,x2:320,y2:y,per:q,ph:n});objs.push({t:'walker',x:40,y:y,x2:320,y2:y,per:q,ph:n+1});px=60+r()*240}
      else{objs.push({t:'cloud',x:-90,y:y,x2:450,y2:y+Math.round(r()*24-12),per:6+r()*3,ph:r(),r:Math.round(40+r()*8)});px=60+r()*240}
      if(r()<.6){x=Math.round(px+(r()<.5?-1:1)*(96+r()*80));if(x>30&&x<330){q=r();
          objs.push(q<.4?{t:'statue',x:x,y:y,r:12,h:50}:q<.7?{t:'fountain',x:x,y:y,r:22}:{t:'pillar',x:x,y:y,h:Math.round(40+r()*30)})}}}
    q=r();y=rows[1+Math.floor(r()*3)]-40;x=Math.round(60+r()*240);
    if(q<.25)objs.push({t:'board',x:x,y:y,len:76,w:(r()<.5?1:-1)*(.8+r()*.4),a0:r()*6,h0:14,h1:54});
    else if(q<.45)objs.push({t:'sprk',x:x,y:y,r:28,per:3,on:1.8,ph:r()*3});
    else if(q<.6)objs.push({t:'stand',x:x,y:y,r:27});
    else if(q<.75)objs.push({t:'cloud',x:x,y:720,x2:Math.round(60+r()*240),y2:40,per:9+r()*2,ph:r(),r:42});
    else if(q<.85)objs.push({t:'flag',x:x,y:y,h:50});
    n=1+(r()<.5?1:0);for(i=0;i<n;i++)objs.push({t:'ice',x:Math.round(40+r()*280),y:Math.round(190+r()*340)});
    return {sun:[s0,s1,8+r()*4],sx:sx,gx:Math.round(cl(px,40,320)),objs:objs}}
  var SEEDS=[314,110,403,261,742,506,288,232,62,277,71,360,221,608,637,355,795,141,464,465,469,522,557,725,270,303,494,613,262,596,55,74,178,285,191,598,486,620,135,222,427,734,66,195,354,628,631,544,468,124,194,388,417,32,371,404,736,104,147,325,182,256,535,177,431,546,690,745,768,629,660,313,362,559,564,759,72,647,728,305,508,33,491,502,685,318,340,419,651,762,374,565,326,552,604,673,497,145,373,553];
  function roomAt(i){return prep(i<HAND.length?HAND[i]:gen(SEEDS.length?SEEDS[(i-HAND.length)%SEEDS.length]:i+1))}

  var CORE={W:W,H:H,MELT_T:MELT_T,RECOV:RECOV,COOL:COOL,SPEED:SPEED,PR:PR,X0:X0,X1:X1,Y0:Y0,Y1:Y1,sunAt:sunAt,sunParam:sunParam,hull:hull,inPoly:inPoly,rectP:rectP,occ:occ,shadows:shadows,shapesAt:shapesAt,
    inShade:inShade,sunFrac:sunFrac,cooled:cooled,polyDist:polyDist,prep:prep,newState:newState,step:step,HAND:HAND,gen:gen,SEEDS:SEEDS,roomAt:roomAt,devNear:devNear,posOf:posOf};
  if(typeof module!=='undefined'&&module.exports){module.exports=CORE}
  if(typeof window==='undefined'||!window.SG)return;

  /* ================= 화면 ================= */
  var K={l:0,r:0,u:0,d:0,act:false};
  if(!window.__shadeWalkKeys){window.__shadeWalkKeys=true;
    var kc=function(e,v){var c=e.code;
      if(c==='ArrowLeft'||c==='KeyA')K.l=v;else if(c==='ArrowRight'||c==='KeyD')K.r=v;else if(c==='ArrowUp'||c==='KeyW')K.u=v;else if(c==='ArrowDown'||c==='KeyS')K.d=v;
      else if(c==='Space'){if(v&&!e.repeat)K.act=true}}
    window.addEventListener('keydown',function(e){kc(e,1)});window.addEventListener('keyup',function(e){kc(e,0)});
    window.addEventListener('blur',function(){K.l=K.r=K.u=K.d=0})}
  var BTN={x:40,y:594,r:27};
  var S=null,tiles=null,tilesFor=-1,shA=null,shB=null,gT=0;
  function mk(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
  function mix(a,b,k){return 'rgb('+Math.round(a[0]+(b[0]-a[0])*k)+','+Math.round(a[1]+(b[1]-a[1])*k)+','+Math.round(a[2]+(b[2]-a[2])*k)+')'}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function loadRoom(i){S.idx=i;S.room=roomAt(i);S.st=newState(S.room);step(S.st,S.room,0,0,false,0);S.phase='play';S.pt=0;S.rt=0;S.drips=[];S.joy=null;S.wasSun=false;S.lastDir=S.room.sun[1]>=S.room.sun[0]?1:-1;S.puff=0;S.hy=hintY(S.room)}
  function hintY(room){var c=[566,540,512,180,210,240,484,456,270,300],i,j,o,y,n,ys,best=566,bn=99;
    for(i=0;i<c.length;i++){y=c[i];n=0;for(j=0;j<room.objs.length;j++){o=room.objs[j];if(o.t==='cloud')continue;ys=[o.y,o.y2==null?o.y:o.y2];
        if(Math.max(ys[0],ys[1])+12>y-18&&Math.min(ys[0],ys[1])-(o.h||o.h1||24)*HK-12<y+8)n+=(o.t==='stand'||o.t==='cart')?3:1}
      for(j=0;j<room.sprk.length;j++)if(Math.abs(room.sprk[j].y-y)<36)n++;
      if(n<bn){bn=n;best=y}}return best}
  function init(a){S={idx:0,left:50,streak:0,blink:2,bt:0,face:0,wob:0,sizz:0,grace:.25,fx:[]};K.act=false;loadRoom(0)}

  function update(dt,inp,a){var st=S.st,room=S.room,ix=0,iy=0,act=false,dx,dy,l,o;
    gT+=dt;S.left-=dt;S.rt+=dt;S.grace-=dt;
    if(S.left<=0){S.left=0;a.over();return}
    S.bt+=dt;if(S.bt>S.blink){S.bt=0;S.blink=1.6+Math.random()*2.6}
    if(S.phase!=='play'){S.pt+=dt;
      if(S.phase==='win'&&S.pt>.75)loadRoom(S.idx+1);
      else if(S.phase!=='win'&&S.pt>.95)loadRoom(S.idx);
      K.act=false;return}
    /* 입력 */
    if(K.act){act=S.grace<0;K.act=false}
    ix=(K.r?1:0)-(K.l?1:0);iy=(K.d?1:0)-(K.u?1:0);
    if(inp.tap&&inp.x!=null){
      if(room.devs.length&&Math.sqrt((inp.x-BTN.x)*(inp.x-BTN.x)+(inp.y-BTN.y)*(inp.y-BTN.y))<BTN.r+6){act=true;S.joy=null;S.btnT=.15}
      else S.joy={ox:inp.x,oy:inp.y,x:inp.x,y:inp.y}}
    if(!inp.down)S.joy=null;
    if(S.joy&&inp.x!=null){dx=inp.x-S.joy.ox;dy=inp.y-S.joy.oy;l=Math.sqrt(dx*dx+dy*dy);S.joy.x=inp.x;S.joy.y=inp.y;
      if(l>5){var k=Math.min(1,l/24);ix=dx/l*k;iy=dy/l*k}
      if(l>40){S.joy.ox+=dx/l*(l-40);S.joy.oy+=dy/l*(l-40)}}
    if(S.btnT>0)S.btnT-=dt;
    var pm=st.m,ps=sunParam(room,st.t);
    step(st,room,ix,iy,act,dt);
    S.moving=(ix||iy)?1:0;if(ix)S.face=ix>0?1:-1;
    /* 종탑: 해가 방향을 바꿀 때 */
    var ns=sunParam(room,st.t),dir=ns>ps?1:ns<ps?-1:S.lastDir;if(dir!==S.lastDir){S.lastDir=dir;a.beep(784,.5,'sine');setTimeout(function(){a.beep(1047,.7,'sine')},180)}
    if(st.acted){a.sfx('jump');a.burst(st.x,st.y-8,'#ffe9a8',8);a.pop(st.x,st.y-26,st.acted.t==='cart'?(a.lang==='ko'?'영차!':'Heave!'):(a.lang==='ko'?'활짝!':'Pop!'),'#fff3c4')}
    else if(act&&room.devs.length)a.beep(200,.06,'square');
    if(st.gotNow){o=room.ice[st.gotNow-1];a.sfx('coin');a.add(3);a.burst(o.x,o.y,'#ff9ec4',12);a.pop(o.x,o.y-14,'+3','#ffd1e3')}
    /* 햇빛/그늘 반응 */
    var sunny=st.frac>0&&!st.cool;
    if(sunny){S.sizz-=dt;if(S.sizz<=0){S.sizz=.22-st.m*.12;a.beep(300+st.m*500,.04,'triangle');S.drips.push({x:st.x+(Math.random()*8-4),y:st.y+3,t:0})}}
    if(!sunny&&S.wasSun&&pm>.25){a.beep(520,.12,'sine');setTimeout(function(){a.beep(390,.2,'sine')},90);S.puff=.9}
    if(st.cool&&pm>.05&&Math.random()<.2)S.fx.push({x:st.x+Math.random()*16-8,y:st.y-10,t:0});
    S.wasSun=sunny;if(S.puff>0)S.puff-=dt;
    a.tempo(1+st.m*.5);
    for(var i=S.drips.length-1;i>=0;i--){S.drips[i].t+=dt;if(S.drips[i].t>2.2)S.drips.splice(i,1)}
    if(st.won){var bonus=10+(st.peak<.5?5:0)+Math.min(5,S.streak);a.add(bonus);S.streak++;S.left=Math.min(70,S.left+(S.idx<HAND.length?13:Math.max(6,13-(S.idx-HAND.length+1)*.5)));S.phase='win';S.pt=0;
      a.sfx('win');a.burst(room.gx,room.gy-8,'#bfe9ff',22);a.burst(room.gx,room.gy-8,'#ffffff',12);
      a.pop(room.gx,room.gy-34,'+'+bonus+(st.peak<.5?(a.lang==='ko'?' 시원!':' Cool!'):''),'#e8f8ff')}
    else if(st.dead){S.phase=st.dead===1?'melt':'closed';S.pt=0;S.streak=0;S.left-=3;a.sfx('hit');a.shake(8);
      a.burst(st.x,st.y,'#cfefff',18);a.pop(st.x,st.y-28,st.dead===1?(a.lang==='ko'?'녹았다… -3초':'Melted… -3s'):(a.lang==='ko'?'트럭 출발… -3초':'Truck left… -3s'),'#ffd0c0')}
  }

  /* ---------- 그리기 ---------- */
  function buildTiles(i){var c=mk(W,H-TOP),g=c.getContext('2d'),r=rng(i*7+3),x,y,row=0,gr;
    gr=g.createLinearGradient(0,0,0,H-TOP);gr.addColorStop(0,'#f7e3b6');gr.addColorStop(1,'#efd29c');g.fillStyle=gr;g.fillRect(0,0,W,H-TOP);
    for(y=0;y<H-TOP;y+=32,row++)for(x=(row%2?-24:0);x<W;x+=48){var v=r();
        g.fillStyle=v<.12?'rgba(214,150,96,.28)':v<.3?'rgba(255,246,220,.5)':v<.5?'rgba(226,190,130,.3)':'rgba(255,255,255,0)';
        g.fillRect(x+1,y+1,46,30);g.strokeStyle='rgba(176,132,80,.32)';g.lineWidth=1;g.strokeRect(x+.5,y+.5,48,32);
        g.fillStyle='rgba(255,255,255,.22)';g.fillRect(x+2,y+2,44,2)}
    /* 가운데 문양 */
    g.save();g.translate(180,270);g.strokeStyle='rgba(190,120,70,.35)';g.lineWidth=3;g.beginPath();g.arc(0,0,74,0,7);g.stroke();
    g.lineWidth=1.5;g.beginPath();g.arc(0,0,60,0,7);g.stroke();
    for(var k=0;k<12;k++){g.rotate(Math.PI/6);g.fillStyle=k%2?'rgba(190,120,70,.2)':'rgba(120,150,170,.18)';g.beginPath();g.moveTo(0,-58);g.lineTo(9,-20);g.lineTo(-9,-20);g.fill()}
    g.restore();
    g.strokeStyle='rgba(150,100,60,.5)';g.lineWidth=4;g.strokeRect(2,2,W-4,H-TOP-4);return c}
  function drawSky(g,a,s,room){var k=Math.max(0,Math.min(1,(Math.abs(s-.5)-.26)/.22)),gr=g.createLinearGradient(0,0,0,TOP),i,x;
    gr.addColorStop(0,mix([86,170,236],[236,120,86],k));gr.addColorStop(1,mix([188,230,250],[252,206,140],k));g.fillStyle=gr;g.fillRect(0,0,W,TOP);
    /* 흘러가는 구름 */
    g.fillStyle='rgba(255,255,255,.75)';for(i=0;i<3;i++){x=((gT*(6+i*3)+i*150)%440)-40;var y=38+i*14;
      g.beginPath();g.arc(x,y,9,0,7);g.arc(x+11,y-4,11,0,7);g.arc(x+24,y,8,0,7);g.fill()}
    /* 해 길(해시계) */
    function sp(u){return [34+292*u,88-50*Math.sin(Math.PI*u)]}
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;g.setLineDash([2,5]);g.beginPath();for(i=0;i<=40;i++){var p=sp(i/40);if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])}g.stroke();g.setLineDash([]);
    var lo=Math.min(room.sun[0],room.sun[1]),hi=Math.max(room.sun[0],room.sun[1]);
    g.strokeStyle='rgba(255,214,90,.95)';g.lineWidth=4;g.lineCap='round';g.beginPath();for(i=0;i<=16;i++){p=sp(lo+(hi-lo)*i/16);if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])}g.stroke();
    for(i=1;i<8;i++){p=sp(i/8);g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.arc(p[0],p[1],i===4?3:2,0,7);g.fill()}
    p=sp(s);g.save();g.translate(p[0],p[1]);g.fillStyle='rgba(255,236,150,.35)';g.beginPath();g.arc(0,0,17+Math.sin(gT*3)*1.5,0,7);g.fill();
    g.strokeStyle='#ffd23f';g.lineWidth=2.5;g.rotate(gT*.6);for(i=0;i<8;i++){g.rotate(Math.PI/4);g.beginPath();g.moveTo(11,0);g.lineTo(15,0);g.stroke()}
    g.fillStyle='#ffdf4a';g.beginPath();g.arc(0,0,9,0,7);g.fill();g.fillStyle='#fff6b8';g.beginPath();g.arc(-2.5,-2.5,4,0,7);g.fill();g.restore();
    /* 지붕 */
    for(i=0;i<9;i++){x=i*42-6;g.fillStyle=i%2?'#f3e2c2':'#ecd6b0';g.fillRect(x,78+(i%3)*3,42,20);g.fillStyle=i%2?'#d9774e':'#c9653f';
      g.beginPath();g.moveTo(x-2,80+(i%3)*3);g.lineTo(x+21,70+(i%3)*3);g.lineTo(x+44,80+(i%3)*3);g.fill();
      g.fillStyle='rgba(90,120,150,.6)';g.fillRect(x+16,86+(i%3)*3,9,8)}
    g.fillStyle='#b98a5a';g.fillRect(0,TOP-3,W,3);
    /* 시간·광장 번호 */
    g.textAlign='center';g.font='11px Jua, system-ui, sans-serif';g.fillStyle='rgba(40,60,90,.75)';
    g.fillText((a.lang==='ko'?'광장 ':'Plaza ')+(S.idx+1),180,58);
    var low=S.left<10;g.font=(low?20:17)+'px Jua, system-ui, sans-serif';g.fillStyle='rgba(255,255,255,.9)';g.fillText(Math.ceil(S.left)+(a.lang==='ko'?'초':'s'),181,76);
    g.fillStyle=low?'#e23b2e':'#2b4a72';g.fillText(Math.ceil(S.left)+(a.lang==='ko'?'초':'s'),180,75)}
  function shadePath(g,s){var i,P;
    if(s.P){P=s.P;g.beginPath();g.moveTo(P[0],P[1]-TOP);for(i=2;i<P.length;i+=2)g.lineTo(P[i],P[i+1]-TOP);g.closePath();g.fill()}
    else if(s.soft){var gr=g.createRadialGradient(s.ax,s.ay-TOP,s.r*.7,s.ax,s.ay-TOP,s.r*1.22);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr;g.beginPath();g.arc(s.ax,s.ay-TOP,s.r*1.22,0,7);g.fill();g.fillStyle='#000'}
    else{g.beginPath();g.arc(s.ax,s.ay-TOP,s.r,0,7);g.fill();g.beginPath();g.arc(s.bx,s.by-TOP,s.r,0,7);g.fill();
      var dx=s.bx-s.ax,dy=s.by-s.ay,l=Math.sqrt(dx*dx+dy*dy);if(l>.5){var nx=-dy/l*s.r,ny=dx/l*s.r;
        g.beginPath();g.moveTo(s.ax+nx,s.ay+ny-TOP);g.lineTo(s.bx+nx,s.by+ny-TOP);g.lineTo(s.bx-nx,s.by-ny-TOP);g.lineTo(s.ax-nx,s.ay-ny-TOP);g.closePath();g.fill()}}}
  function drawShade(g,sh,dusk){if(!shA){shA=mk(W,H-TOP);shB=mk(W,H-TOP)}
    var ga=shA.getContext('2d'),gb=shB.getContext('2d'),i;
    ga.clearRect(0,0,W,H-TOP);ga.fillStyle='#000';for(i=0;i<sh.length;i++)shadePath(ga,sh[i]);
    ga.globalCompositeOperation='source-in';ga.fillStyle=dusk>0?mix([126,142,216],[150,120,190],dusk):'#7e8ed8';ga.fillRect(0,0,W,H-TOP);ga.globalCompositeOperation='source-over';
    gb.clearRect(0,0,W,H-TOP);gb.shadowColor=dusk>0?mix([126,142,216],[150,120,190],dusk):'#7e8ed8';gb.shadowBlur=4;gb.drawImage(shA,0,0);gb.shadowBlur=0;
    g.save();g.globalCompositeOperation='multiply';g.drawImage(shB,0,TOP);g.restore()}
  function wedge(g,x,y,r,c1,c2,n,rot){for(var i=0;i<n;i++){g.fillStyle=i%2?c1:c2;g.beginPath();g.moveTo(x,y);g.arc(x,y,r,rot+i*6.2832/n,rot+(i+1)*6.2832/n);g.fill()}
    g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1;g.beginPath();g.arc(x,y,r,0,7);g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(x,y,2,0,7);g.fill()}
  function box(g,x,y,w,d,h,top,front,line){var hh=h*HK;var gr=g.createLinearGradient(x,0,x+w,0);gr.addColorStop(0,front[0]);gr.addColorStop(1,front[1]);
    g.fillStyle=gr;g.fillRect(x,y+d-hh,w,hh);g.fillStyle=top;g.fillRect(x,y-hh,w,d);
    g.strokeStyle=line;g.lineWidth=1;g.strokeRect(x+.5,y-hh+.5,w-1,d+hh-1);g.beginPath();g.moveTo(x,y+d-hh);g.lineTo(x+w,y+d-hh);g.stroke()}
  function drawObj(g,a,o,st,room){var x,y,hh,p,i,t=st.t,ang;
    switch(o.t){
      case 'pillar':
        if(o.truck){drawTruck(g,a,o,room,st);break}
        x=o.x-o.w/2;y=o.y-o.d/2;hh=o.h*HK;box(g,x,y,o.w,o.d,o.h,'#fff7e6',['#ead9bb','#c8b392'],'rgba(120,92,60,.5)');
        g.strokeStyle='rgba(120,92,60,.22)';for(i=6;i<o.w;i+=6){g.beginPath();g.moveTo(x+i,y+o.d-hh+3);g.lineTo(x+i,y+o.d-2);g.stroke()}
        g.fillStyle='#d8c4a0';g.fillRect(x-2,y+o.d-4,o.w+4,4);g.fillStyle='rgba(255,255,255,.5)';g.fillRect(x+2,y-hh+2,o.w-4,3);break;
      case 'statue':hh=o.h*HK;g.fillStyle='#cdbb9a';g.beginPath();g.ellipse(o.x,o.y,o.r,o.r*.7,0,0,7);g.fill();
        g.fillStyle='#b9a585';g.fillRect(o.x-o.r*.8,o.y-hh*.5,o.r*1.6,hh*.5);g.fillStyle='#e6d6b6';g.beginPath();g.ellipse(o.x,o.y-hh*.5,o.r*.8,o.r*.5,0,0,7);g.fill();
        /* 고양이 동상 */
        g.fillStyle='#5fa08d';g.beginPath();g.ellipse(o.x,o.y-hh*.5-8,7,9,0,0,7);g.fill();g.beginPath();g.arc(o.x,o.y-hh*.5-20,6.5,0,7);g.fill();
        g.beginPath();g.moveTo(o.x-6,o.y-hh*.5-23);g.lineTo(o.x-5,o.y-hh*.5-30);g.lineTo(o.x-1,o.y-hh*.5-25);g.fill();
        g.beginPath();g.moveTo(o.x+6,o.y-hh*.5-23);g.lineTo(o.x+5,o.y-hh*.5-30);g.lineTo(o.x+1,o.y-hh*.5-25);g.fill();
        g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(o.x-2,o.y-hh*.5-22,2,0,7);g.fill();break;
      case 'fountain':g.fillStyle='#d9c7a4';g.beginPath();g.arc(o.x,o.y,o.r,0,7);g.fill();g.strokeStyle='rgba(120,92,60,.5)';g.lineWidth=1.5;g.stroke();
        var gr=g.createRadialGradient(o.x,o.y,2,o.x,o.y,o.r-4);gr.addColorStop(0,'#c9f1ff');gr.addColorStop(1,'#4fb4de');g.fillStyle=gr;g.beginPath();g.arc(o.x,o.y,o.r-4,0,7);g.fill();
        for(i=0;i<3;i++){p=((gT*.7+i/3)%1);g.strokeStyle='rgba(255,255,255,'+(.7*(1-p))+')';g.lineWidth=1.5;g.beginPath();g.arc(o.x,o.y,3+p*(o.r-8),0,7);g.stroke()}
        g.fillStyle='#e8d8b8';g.beginPath();g.arc(o.x,o.y,5,0,7);g.fill();
        for(i=0;i<6;i++){p=((gT*1.6+i/6)%1);ang=i*1.047+gT*.4;g.fillStyle='rgba(255,255,255,'+(1-p)+')';g.beginPath();g.arc(o.x+Math.cos(ang)*p*10,o.y-12+p*p*16-p*6+Math.sin(ang)*p*3,1.8,0,7);g.fill()}break;
      case 'tree':hh=o.h*HK;g.fillStyle='#8a5a3a';g.fillRect(o.x-3,o.y-hh,6,hh);g.fillStyle='#6f4a2f';g.beginPath();g.ellipse(o.x,o.y,5,3,0,0,7);g.fill();
        y=o.y-hh-o.r*.35;var ga=g.globalAlpha;g.globalAlpha=ga*.94;g.fillStyle='#3f9a55';g.beginPath();g.arc(o.x,y,o.r,0,7);g.fill();
        g.fillStyle='#57b868';g.beginPath();g.arc(o.x-o.r*.3,y-o.r*.25,o.r*.62,0,7);g.arc(o.x+o.r*.35,y+o.r*.1+Math.sin(gT*1.3+o.x)*1,o.r*.5,0,7);g.fill();
        g.fillStyle='#8fda8a';g.beginPath();g.arc(o.x-o.r*.38,y-o.r*.38,o.r*.28,0,7);g.fill();g.globalAlpha=ga;break;
      case 'awning':x=o.x-o.w/2;y=o.y-o.d/2-o.h*HK-6;g.globalAlpha=.42;for(i=0;i<6;i++){g.fillStyle=i%2?'#ffffff':'#58b7e8';g.fillRect(x+i*o.w/6,y,o.w/6,o.d)}
        g.globalAlpha=1;g.strokeStyle='rgba(40,80,120,.5)';g.lineWidth=1.5;g.strokeRect(x,y,o.w,o.d);break;
      case 'tram':p=posOf(o,t);x=p[0]-o.w/2;y=p[1]-o.d/2;hh=o.h*HK;
        g.fillStyle='#d6453a';rr(g,x,y+o.d-hh,o.w,hh,4);g.fill();g.fillStyle='#fff3d6';g.fillRect(x,y+o.d-hh,o.w,hh*.45);
        g.fillStyle='#8fd0ee';for(i=0;i<5;i++)g.fillRect(x+6+i*(o.w-10)/5,y+o.d-hh+3,(o.w-10)/5-4,hh*.36);
        g.fillStyle='#fbe8c0';rr(g,x,y-hh,o.w,o.d,5);g.fill();g.strokeStyle='rgba(120,40,30,.6)';g.lineWidth=1;g.stroke();
        g.fillStyle='#e9cf9c';g.fillRect(x+8,y-hh+6,o.w-16,o.d-12);g.fillStyle='#ffe27a';g.beginPath();g.arc(x+4,y+o.d-5,2,0,7);g.arc(x+o.w-4,y+o.d-5,2,0,7);g.fill();break;
      case 'walker':p=posOf(o,t);y=p[1]+Math.abs(Math.sin(t*7+o.per))*1.5;
        g.fillStyle=o.per*10%3<1?'#e76f51':o.per*10%3<2?'#4f86c6':'#8e6fc2';g.beginPath();g.ellipse(p[0],y,6,7,0,0,7);g.fill();
        g.fillStyle='#f3c9a0';g.beginPath();g.arc(p[0],y-9,4.5,0,7);g.fill();g.strokeStyle='#7a5a3a';g.lineWidth=1.5;g.beginPath();g.moveTo(p[0]+4,y-2);g.lineTo(p[0]+3,y-16);g.stroke();
        g.globalAlpha=.93;wedge(g,p[0],y-17,19,'#ff8fa3','#fff4e0',8,.2);g.globalAlpha=1;break;
      case 'flag':hh=o.h*HK;g.strokeStyle='#8a6a4a';g.lineWidth=2.5;g.beginPath();g.moveTo(o.x,o.y);g.lineTo(o.x,o.y-hh);g.stroke();
        g.fillStyle='#e85d75';g.beginPath();g.moveTo(o.x,o.y-hh);for(i=0;i<=6;i++)g.lineTo(o.x+i*4.5,o.y-hh+Math.sin(t*5+i*.9)*2.5*(i/6));
        for(i=6;i>=0;i--)g.lineTo(o.x+i*4.5,o.y-hh+13+Math.sin(t*5+i*.9)*2.5*(i/6));g.fill();g.fillStyle='#ffd23f';g.beginPath();g.arc(o.x,o.y-hh,2.5,0,7);g.fill();break;
      case 'board':ang=boardAng(o,t);var ca=Math.cos(ang),sa=Math.sin(ang),nx=-sa*9,ny=ca*9,ex=o.x+ca*o.len,ey=o.y+sa*o.len,q;
        g.strokeStyle='#6b5a4a';g.lineWidth=4;g.beginPath();g.moveTo(o.x,o.y);g.lineTo(o.x,o.y-o.h1*HK);g.stroke();
        for(q=0;q<2;q++){y=(q?o.h1:o.h0)*HK;g.fillStyle=q?'#ffcf5a':'#c98a2b';g.beginPath();g.moveTo(o.x+nx,o.y+ny-y);g.lineTo(ex+nx,ey+ny-y);g.lineTo(ex-nx,ey-ny-y);g.lineTo(o.x-nx,o.y-ny-y);g.closePath();g.fill();
          g.strokeStyle='#b5651d';g.lineWidth=1.5;g.stroke();
          if(!q){g.fillStyle='#d99a3a';g.beginPath();g.moveTo(ex+nx,ey+ny-y);g.lineTo(ex-nx,ey-ny-y);g.lineTo(ex-nx,ey-ny-o.h1*HK);g.lineTo(ex+nx,ey+ny-o.h1*HK);g.fill()}}
        g.fillStyle='#e8573a';for(i=1;i<5;i++){g.beginPath();g.arc(o.x+ca*o.len*i/5,o.y+sa*o.len*i/5-o.h1*HK,4,0,7);g.fill()}
        g.fillStyle='#6b5a4a';g.beginPath();g.arc(o.x,o.y-o.h1*HK,4,0,7);g.fill();break;
      case 'cart':p=posOf(o,t,st.dev);x=p[0]-o.w/2;y=p[1]-o.d/2;hh=o.h*HK;
        g.fillStyle='#4a3a2a';g.beginPath();g.arc(x+8,y+o.d,5,0,7);g.arc(x+o.w-8,y+o.d,5,0,7);g.fill();
        box(g,x,y+o.d-12,o.w,12,22,'#c98a4b',['#b9793e','#94602e'],'rgba(70,40,20,.6)');
        g.strokeStyle='#7a5a3a';g.lineWidth=2;g.beginPath();g.moveTo(x+3,y+o.d-12);g.lineTo(x+3,y-hh+o.d);g.moveTo(x+o.w-3,y+o.d-12);g.lineTo(x+o.w-3,y-hh+o.d);g.stroke();
        for(i=0;i<6;i++){g.fillStyle=i%2?'#fff6e6':'#f08a4b';g.fillRect(x+i*o.w/6,y-hh,o.w/6+.5,o.d)}
        g.strokeStyle='rgba(120,60,20,.6)';g.lineWidth=1.2;g.strokeRect(x,y-hh,o.w,o.d);
        g.fillStyle='#ff6b6b';g.beginPath();g.arc(x+o.w*.3,y+o.d-16,3.5,0,7);g.fill();g.fillStyle='#ffd23f';g.beginPath();g.arc(x+o.w*.5,y+o.d-16,3.5,0,7);g.fill();g.fillStyle='#7bd389';g.beginPath();g.arc(x+o.w*.7,y+o.d-16,3.5,0,7);g.fill();break;
      case 'stand':p=st.dev[o.di];g.strokeStyle='#7a5a3a';g.lineWidth=3;g.beginPath();g.moveTo(o.x,o.y);g.lineTo(o.x,o.y-14);g.stroke();
        g.fillStyle='#9a8a7a';g.beginPath();g.ellipse(o.x,o.y,6,3.5,0,0,7);g.fill();g.globalAlpha=.93;wedge(g,o.x,o.y-16,o.r*(.2+.8*p),'#3fb6a8','#fff4e0',10,.3);g.globalAlpha=1;break;
    }}
  function drawTruck(g,a,o,room,st){var x=o.x-o.w/2,y=o.y-o.d/2,hh=o.h*HK,k=S.phase==='closed'?Math.min(1,S.pt*2):0,ox=k*k*200*(room.gx<180?-1:1);
    g.save();g.translate(ox,0);
    g.fillStyle='#3a3a44';g.beginPath();g.arc(x+9,y+o.d,5,0,7);g.arc(x+o.w-9,y+o.d,5,0,7);g.fill();
    var gr=g.createLinearGradient(x,0,x+o.w,0);gr.addColorStop(0,'#dff4ff');gr.addColorStop(1,'#a9d8f2');g.fillStyle=gr;rr(g,x,y+o.d-hh-10,o.w,hh+10,4);g.fill();
    g.fillStyle='#f6fcff';rr(g,x,y-hh-10,o.w,o.d,4);g.fill();g.strokeStyle='rgba(50,110,160,.7)';g.lineWidth=1.2;g.stroke();
    g.strokeStyle='#4aa3d8';g.lineWidth=1.6;g.save();g.translate(x+o.w/2,y-hh-10+o.d/2);for(var i=0;i<3;i++){g.rotate(Math.PI/3);g.beginPath();g.moveTo(-7,0);g.lineTo(7,0);g.stroke()}g.restore();
    g.fillStyle='#2f5f86';rr(g,o.x-8,y+o.d-hh-4,16,hh+4,2);g.fill();g.fillStyle='rgba(190,240,255,.9)';g.fillRect(o.x-6,y+o.d-hh-2,12,hh);
    g.restore();
    for(i=0;i<4;i++){var p=((gT*.6+i/4)%1);g.fillStyle='rgba(225,247,255,'+(.6*(1-p))+')';g.beginPath();g.arc(room.gx+Math.sin(i*2.1+gT)*8,room.gy-4+p*12,4+p*5,0,7);g.fill()}
    if(room.limit&&S.phase==='play'){var left=Math.max(0,room.limit-st.t);g.font='14px Jua, system-ui, sans-serif';g.textAlign='center';
      var tx2=o.x+(o.x>250?-1:1)*(o.w/2+22);g.fillStyle='rgba(30,50,90,.75)';rr(g,tx2-19,y-hh-8,38,20,9);g.fill();g.fillStyle=left<4?'#ff8a7a':'#fff';g.fillText('⏱'+Math.ceil(left),tx2,y-hh+7)}}
  function drawKid(g,a,st){var x=st.x,y=st.y,m=st.m,sunny=st.frac>0&&!st.cool,sc=1-m*.22,wob=sunny?Math.sin(gT*22)*m*1.6:0,bob=S.moving?Math.sin(gT*14)*1.2:Math.sin(gT*2.4)*.5,i;
    if(S.phase==='melt'){var k=Math.min(1,S.pt/.6);g.fillStyle='rgba(190,232,255,.9)';g.beginPath();g.ellipse(x,y+2,10+k*10,5+k*4,0,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(x-4,y,4+k*3,2,0,0,7);g.fill();
      sc=1-k*.75;y+=k*4;if(k>=1){g.fillStyle='#2b2b3a';g.beginPath();g.arc(x-3,y,1.3,0,7);g.arc(x+3,y,1.3,0,7);g.fill();return}}
    if(S.phase==='win'){sc*=Math.max(0,1-S.pt*1.6);y-=S.pt*14}
    /* 제 그림자 */
    if(st.sn&&sunny){g.fillStyle='rgba(60,70,130,.3)';g.beginPath();g.ellipse(x+st.sn.dx*7,y+st.sn.dy*7+2,8*sc,4*sc,Math.atan2(st.sn.dy,st.sn.dx),0,7);g.fill()}
    else{g.fillStyle='rgba(40,50,90,.22)';g.beginPath();g.ellipse(x,y+3,8*sc,3.5*sc,0,0,7);g.fill()}
    g.save();g.translate(x+wob,y);g.scale(sc*(1+m*.12)*1.25,sc*1.25);
    var body=sunny?'#ffffff':'#e3ecff',edge=sunny?'#c9dcf2':'#9fb2e0';
    g.fillStyle=body;g.strokeStyle=edge;g.lineWidth=1.3;
    g.beginPath();g.ellipse(0,-5+bob*.3,9,8.5,0,0,7);g.fill();g.stroke();
    /* 팔 */
    g.strokeStyle='#8a5a3a';g.lineWidth=1.5;g.beginPath();g.moveTo(-8,-7);g.lineTo(-13,-11+bob);g.moveTo(8,-7);g.lineTo(13,-11-bob);g.stroke();
    /* 목도리 */
    g.fillStyle='#ff6b6b';g.fillRect(-7,-13+bob*.5,14,3.5);g.fillRect(3+S.face*1,-12+bob*.5,3.5,7);
    g.fillStyle=body;g.strokeStyle=edge;g.lineWidth=1.3;g.beginPath();g.arc(0,-19+bob,7.5,0,7);g.fill();g.stroke();
    /* 모자: 작은 양동이 */
    g.fillStyle='#4aa3d8';g.beginPath();g.moveTo(-5,-25+bob);g.lineTo(-4,-31+bob);g.lineTo(4,-31+bob);g.lineTo(5,-25+bob);g.fill();g.fillStyle='#2f7fb4';g.fillRect(-6,-26+bob,12,2);
    /* 얼굴 */
    var ex=S.face*1.2,blink=S.bt<.12;g.fillStyle='#2b2b3a';
    if(blink){g.fillRect(-4+ex,-20+bob,3,1.2);g.fillRect(1.5+ex,-20+bob,3,1.2)}
    else{var er=m>.6&&sunny?2.1:1.6;g.beginPath();g.arc(-2.6+ex,-20+bob,er,0,7);g.arc(2.8+ex,-20+bob,er,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(-3+ex,-20.6+bob,.6,0,7);g.arc(2.4+ex,-20.6+bob,.6,0,7);g.fill()}
    g.fillStyle='#ffb0b8';g.globalAlpha=.7;g.beginPath();g.arc(-5.2+ex,-17+bob,1.5,0,7);g.arc(5.4+ex,-17+bob,1.5,0,7);g.fill();g.globalAlpha=1;
    g.strokeStyle='#2b2b3a';g.lineWidth=1.1;g.beginPath();
    if(sunny&&m>.3){g.ellipse(ex,-15.5+bob,1.6,1.2+m*1.3,0,0,7);g.fillStyle='#7a3040';g.fill()}
    else if(S.puff>0){g.ellipse(ex,-15.5+bob,1.3,1.3,0,0,7);g.stroke()}
    else{g.arc(ex,-16.6+bob,2.2,.2,2.94);g.stroke()}
    g.restore();
    /* 땀 */
    if(sunny)for(i=0;i<3;i++){var p=((gT*2.2+i/3)%1);g.fillStyle='rgba(120,200,255,'+(1-p)+')';g.beginPath();g.arc(x+(i-1)*11+wob,y-28*sc+p*16,1.8,0,7);g.fill()}
    if(S.puff>0&&!sunny){p=1-S.puff/.9;g.fillStyle='rgba(255,255,255,'+(.7*(1-p))+')';g.beginPath();g.arc(x+S.face*8+p*8*(S.face||1),y-16-p*10,3+p*4,0,7);g.fill()}
    /* 녹음 게이지 */
    if(m>.02&&S.phase==='play'){g.fillStyle='rgba(30,40,70,.55)';rr(g,x-14,y-52,28,6,3);g.fill();
      g.fillStyle=m<.5?'#7fd1ff':m<.8?'#ffb347':'#ff5a4a';rr(g,x-13,y-51,Math.max(3,26*Math.min(1,m)),4,2);g.fill()}}
  function draw(g,a){if(!S)return;var st=S.st,room=S.room,i,o,p,s=sunParam(room,st.t),dusk=Math.max(0,Math.min(1,(Math.abs(s-.5)-.26)/.22));
    if(tilesFor!==S.idx%7){tiles=buildTiles(S.idx%7);tilesFor=S.idx%7}
    drawSky(g,a,s,room);g.drawImage(tiles,0,TOP);
    if(dusk>0){g.fillStyle='rgba(255,150,70,'+(dusk*.2)+')';g.fillRect(0,TOP,W,H-TOP)}
    /* 바닥 장식: 선로, 레일, 물뿌리개, 출발·도착 깔개, 물방울 자국 */
    for(i=0;i<room.objs.length;i++){o=room.objs[i];
      if(o.t==='tram'){g.strokeStyle='rgba(110,90,70,.55)';g.lineWidth=2;g.beginPath();g.moveTo(0,o.y-7);g.lineTo(W,o.y-7);g.moveTo(0,o.y+9);g.lineTo(W,o.y+9);g.stroke();
        g.strokeStyle='rgba(110,90,70,.3)';g.lineWidth=3;for(p=6;p<W;p+=14){g.beginPath();g.moveTo(p,o.y-10);g.lineTo(p,o.y+12);g.stroke()}}
      else if(o.t==='cart'){g.strokeStyle='rgba(120,80,40,.55)';g.lineWidth=3;g.setLineDash([7,6]);g.beginPath();g.moveTo(o.x,o.y);g.lineTo(o.x2,o.y2);g.stroke();g.setLineDash([]);
        g.fillStyle='rgba(120,80,40,.6)';g.beginPath();g.arc(o.x,o.y,4,0,7);g.arc(o.x2,o.y2,4,0,7);g.fill()}
      else if(o.t==='walker'){g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.setLineDash([2,7]);g.beginPath();g.moveTo(o.x,o.y);g.lineTo(o.x2,o.y2);g.stroke();g.setLineDash([])}
      else if(o.t==='board'){g.strokeStyle='rgba(120,80,40,.2)';g.lineWidth=1.5;g.setLineDash([3,6]);g.beginPath();g.arc(o.x,o.y,o.len,0,7);g.stroke();g.setLineDash([])}}
    g.fillStyle='rgba(120,200,240,.35)';g.beginPath();g.ellipse(room.gx,room.gy,17,9,0,0,7);g.fill();
    g.strokeStyle='rgba(255,255,255,'+(.6+.3*Math.sin(gT*5))+')';g.lineWidth=2;g.beginPath();g.ellipse(room.gx,room.gy,17+Math.sin(gT*5)*2,9+Math.sin(gT*5),0,0,7);g.stroke();
    for(i=0;i<room.sprk.length;i++){o=room.sprk[i];g.strokeStyle='rgba(60,150,210,.5)';g.lineWidth=1.5;g.setLineDash([4,5]);g.beginPath();g.arc(o.x,o.y,o.r,0,7);g.stroke();g.setLineDash([])}
    for(i=0;i<S.drips.length;i++){o=S.drips[i];g.fillStyle='rgba(90,150,200,'+(.4*(1-o.t/2.2))+')';g.beginPath();g.ellipse(o.x,o.y,3*(1-o.t/4),1.6,0,0,7);g.fill()}
    /* 아지랑이 */
    g.save();g.globalCompositeOperation='lighter';g.strokeStyle='rgba(255,250,220,.055)';g.lineWidth=7;
    for(i=0;i<6;i++){var yy=TOP+((i*97-gT*16)%540+540)%540;g.beginPath();for(p=0;p<=W;p+=20)g.lineTo(p,yy+Math.sin(p*.05+gT*2.2+i)*5);g.stroke()}
    g.restore();
    /* 그늘 */
    if(st.sh)drawShade(g,st.sh,dusk);
    /* 물뿌리개 물 */
    for(i=0;i<room.sprk.length;i++){o=room.sprk[i];var on=sprkOn(o,st.t);
      if(on){g.fillStyle='rgba(120,210,255,.28)';g.beginPath();g.arc(o.x,o.y,o.r,0,7);g.fill();
        for(p=0;p<10;p++){var an=p*.628+gT*2.4,q=((gT*1.8+p*.37)%1);g.fillStyle='rgba(235,250,255,'+(1-q*.6)+')';g.beginPath();g.arc(o.x+Math.cos(an)*q*o.r,o.y+Math.sin(an)*q*o.r-Math.sin(q*3.14)*9,1.8,0,7);g.fill()}}
      else{var w=1-((((st.t+(o.ph||0))%o.per)+o.per)%o.per-o.on)/(o.per-o.on);g.strokeStyle='rgba(60,150,210,.8)';g.lineWidth=2.5;g.beginPath();g.arc(o.x,o.y,7,-1.57,-1.57+6.283*(1-w));g.stroke()}
      g.fillStyle='#6b7c8c';g.beginPath();g.arc(o.x,o.y,3.5,0,7);g.fill();g.fillStyle='#b8c8d6';g.beginPath();g.arc(o.x-1,o.y-1,1.5,0,7);g.fill()}
    /* 물체 + 뭉이 (y 정렬) */
    var list=[];for(i=0;i<room.objs.length;i++){o=room.objs[i];if(o.t==='cloud')continue;p=posOf(o,st.t,st.dev);
      list.push({y:p[1]+(o.d?o.d/2:o.t==='awning'?-999:0)+(o.t==='awning'?2000:0),o:o})}
    for(i=0;i<room.ice.length;i++)if(!st.ice[i])list.push({y:room.ice[i].y,ice:room.ice[i]});
    list.push({y:st.y,kid:1});list.sort(function(u,v){return u.y-v.y});
    for(i=0;i<list.length;i++){o=list[i];
      if(o.kid)drawKid(g,a,st);
      else if(o.ice){var b=Math.sin(gT*3+o.ice.x)*2;g.fillStyle='rgba(40,50,90,.2)';g.beginPath();g.ellipse(o.ice.x,o.ice.y+4,5,2,0,0,7);g.fill();
        g.fillStyle='#e0a45a';g.beginPath();g.moveTo(o.ice.x-4.5,o.ice.y-8+b);g.lineTo(o.ice.x+4.5,o.ice.y-8+b);g.lineTo(o.ice.x,o.ice.y+2+b);g.fill();
        g.fillStyle='#ff9ec4';g.beginPath();g.arc(o.ice.x,o.ice.y-11+b,5.5,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(o.ice.x-2,o.ice.y-13+b,1.6,0,7);g.fill()}
      else{var ob=o.o,cov=false,hh2,pp;
        if(o.y>st.y&&!ob.truck){if(ob.t==='pillar'||ob.t==='tram'||ob.t==='cart'){pp=posOf(ob,st.t,st.dev);hh2=ob.h*HK;cov=Math.abs(st.x-pp[0])<ob.w/2+7&&st.y-10>pp[1]-ob.d/2-hh2-8&&st.y-10<pp[1]+ob.d/2}
          else if(ob.t==='tree'){hh2=ob.h*HK+ob.r*.35;cov=(st.x-ob.x)*(st.x-ob.x)+(st.y-12-ob.y+hh2)*(st.y-12-ob.y+hh2)<(ob.r+6)*(ob.r+6)}
          else if(ob.t==='walker'||ob.t==='stand'){pp=posOf(ob,st.t,st.dev);hh2=ob.t==='stand'?ob.r*(.2+.8*st.dev[ob.di]):19;cov=(st.x-pp[0])*(st.x-pp[0])+(st.y-12-pp[1]+17)*(st.y-12-pp[1]+17)<(hh2+8)*(hh2+8)}}
        if(cov)g.globalAlpha=.45;drawObj(g,a,ob,st,room);g.globalAlpha=1}}
    /* 구름 본체(희미하게) */
    for(i=0;i<room.objs.length;i++){o=room.objs[i];if(o.t!=='cloud')continue;p=posOf(o,st.t);var L=lobes(o,p[0]-26,p[1]-46);
      g.fillStyle='rgba(255,255,255,.2)';g.beginPath();for(var k2=0;k2<3;k2++){g.moveTo(L[k2][0]+L[k2][2]*.8,L[k2][1]);g.arc(L[k2][0],L[k2][1],L[k2][2]*.8,0,7)}g.fill()}
    for(i=S.fx.length-1;i>=0;i--){o=S.fx[i];o.t+=.016;if(o.t>.5){S.fx.splice(i,1);continue}g.fillStyle='rgba(200,240,255,'+(1-o.t*2)+')';g.beginPath();g.arc(o.x,o.y-o.t*20,2,0,7);g.fill()}
    /* 위험 비네트 */
    if(st.m>.55&&S.phase==='play'){var v=g.createRadialGradient(180,360,150,180,360,380);v.addColorStop(0,'rgba(255,90,40,0)');v.addColorStop(1,'rgba(255,90,40,'+((st.m-.55)*.9*(0.7+.3*Math.sin(gT*12)))+')');g.fillStyle=v;g.fillRect(0,TOP,W,H-TOP)}
    /* 힌트 */
    if(room.hint&&S.rt<6&&S.idx<HAND.length){var al=Math.min(1,S.rt*3,(6-S.rt)*2),tx=room.hint[a.lang];g.globalAlpha=al;g.font='15px Jua, system-ui, sans-serif';g.textAlign='center';
      var tw=g.measureText(tx).width+22,hx=Math.max(tw/2+6,Math.min(W-tw/2-6,180)),hy=S.hy;
      g.fillStyle='rgba(30,50,90,.78)';rr(g,hx-tw/2,hy-17,tw,25,12);g.fill();g.fillStyle='#fff';g.fillText(tx,hx,hy);g.globalAlpha=1}
    /* 행동 버튼 */
    if(room.devs.length){var nd=S.phase==='play'&&nearDev(room,st),pr=S.btnT>0?-2:0;
      if(nd){p=posOf(nd,st.t,st.dev);g.fillStyle='#fff';g.strokeStyle='#e8573a';g.lineWidth=2;g.beginPath();g.arc(p[0],p[1]-(nd.t==='cart'?nd.h*HK+24:38)+Math.sin(gT*6)*2,9,0,7);g.fill();g.stroke();
        g.fillStyle='#e8573a';g.font='14px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('!',p[0],p[1]-(nd.t==='cart'?nd.h*HK+19:33)+Math.sin(gT*6)*2)}
      g.fillStyle='rgba(30,40,70,.25)';g.beginPath();g.arc(BTN.x,BTN.y+3,BTN.r+pr,0,7);g.fill();
      g.fillStyle=nd?'#ff8a4a':'rgba(255,255,255,.55)';g.beginPath();g.arc(BTN.x,BTN.y,BTN.r+pr+(nd?Math.sin(gT*6)*1.5:0),0,7);g.fill();
      g.strokeStyle=nd?'#fff':'rgba(90,70,50,.5)';g.lineWidth=2.5;g.stroke();
      g.fillStyle=nd?'#fff':'rgba(90,70,50,.7)';g.font='13px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(((nd||room.devs[0]).t==='cart')?(a.lang==='ko'?'밀기':'PUSH'):(a.lang==='ko'?'펴기':'OPEN'),BTN.x,BTN.y+5)}
    /* 조이스틱 */
    if(S.joy){g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=2;g.beginPath();g.arc(S.joy.ox,S.joy.oy,26,0,7);g.stroke();g.fillStyle='rgba(30,50,90,.18)';g.fill();
      g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.arc(S.joy.x,S.joy.y,10,0,7);g.fill()}
  }
  window.__shadeWalk={core:CORE,dbg:function(){return S?{idx:S.idx,phase:S.phase,x:S.st.x,y:S.st.y,t:S.st.t,m:S.st.m,frac:S.st.frac,left:S.left,dev:S.st.dev.slice()}:null}};
  SG.run({id:'shade-walk',
    title:{ko:'그늘 건너기',en:'Shade Walk'},
    how:{ko:'햇빛에 닿으면 녹아요! 움직이는 그림자를 타고 냉동 트럭까지. 끌어서 이동 · 방향키',en:'Sunlight melts you! Ride the moving shadows to the freezer truck. Drag to move · arrow keys'},
    init:init,update:update,draw:draw});
})();
