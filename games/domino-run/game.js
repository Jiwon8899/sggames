/* 냥발 도미노 (Paw Dominoes) — 끊긴 도미노 길을 손가락으로 그려 잇고, Go! 로 연쇄 반응을 본다.
   규칙(쓰러짐 전파·놓기·레벨 생성)은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,HT=26,TH=5,WD=15,MIN=.4*HT,MAX=.9*HT,SP=12.8,MINP=10.5,ANG=35*Math.PI/180,
      DT=.13,SLOPE_R=1.3*HT,SLOPE_SP=22,SLOPE_DT=.08,MV=170,WV=330,RMIN=40,RMAX=150,SPW=14,BRL=46,BRW=11,
      TX0=14,TX1=346,TY0=68,TY1=534,KZ=.85,TF=.28;

  /* ---------- 기하 ---------- */
  function segD(px,py,ax,ay,bx,by){var dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l>0?((px-ax)*dx+(py-ay)*dy)/l:0;
    t=t<0?0:t>1?1:t;return Math.hypot(px-ax-dx*t,py-ay-dy*t)}
  function arc(cx,cy,r,a0,a1){var o=[],n=Math.ceil(Math.abs(a1-a0)/4),i,a;
    for(i=0;i<=n;i++){a=(a0+(a1-a0)*i/n)*Math.PI/180;o.push([cx+r*Math.cos(a),cy+r*Math.sin(a)])}return o}
  function cr(P,n){var o=[],i,j,t,k;n=n||8;
    for(i=0;i<P.length-1;i++){var p0=P[i?i-1:0],p1=P[i],p2=P[i+1],p3=P[i+2<P.length?i+2:i+1];
      for(j=0;j<n;j++){t=j/n;var t2=t*t,t3=t2*t,q=[];
        for(k=0;k<2;k++)q.push(.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3));
        o.push(q)}}
    o.push(P[P.length-1]);return o}

  /* ---------- 레벨 ----------
     runs: 미리 놓인 도미노 줄(폴리라인)  goals:{k,run,d}|{k,x,y}  obs:{k,x,y,x2,y2,r}  slopes:{x,y,w,h,dx,dy}
     fans:{x,y,a(도),len,bx,by}  papers:[x,y,a(도)]  tray:{ramp,split,bridge}  sol(E): 풀이 스트로크 */
  var LEVELS=[
    {runs:[[[60,130],[131.6,213.5]],[[183.7,274.2],[249,350.3]]],goals:[{k:'bell',run:1,d:22}],ghost:1,
      obs:[{k:'mug',x:262,y:150,r:25}],
      tip:{ko:'빈 곳에 도미노를 그려요',en:'Draw dominoes across the gap'},
      sol:function(E){return [{t:'d',p:[E.e(0),E.s(1)]}]}},
    {runs:[[[50,170],[150,170]],[[250,270],[250,400]]],goals:[{k:'popper',run:1,d:22}],ghost:1,slack:2,
      obs:[{k:'mug',x:96,y:330,r:25}],
      tip:{ko:'둥글게! 너무 꺾으면 빗나가요',en:'Curve it — sharp turns miss'},
      sol:function(E){return [{t:'d',p:[E.e(0)].concat(arc(150,270,100,-90,0))}]}},
    {runs:[[[120,110],[120,170]],[[120,350],[120,440]]],goals:[{k:'rocket',run:1,d:22}],tray:{ramp:1},ghost:1,
      obs:[{k:'mug',x:250,y:250,r:25}],
      tip:{ko:'구슬 레일을 끌어서 먼 틈을 건너요',en:'Drag the marble rail over the long gap'},
      sol:function(E){return [{t:'ramp',p:[E.e(0),E.s(1)]},{t:'d',p:['R',E.s(1)]}]}},
    {runs:[[[180,90],[180,200]],[[146,262],[90,400]],[[214,262],[270,400]]],goals:[{k:'bell',run:1,d:22},{k:'popper',run:2,d:22}],
      tray:{split:1},ghost:1,
      tip:{ko:'넓은 도미노는 두 갈래로 갈라져요',en:'The wide domino starts two branches'},
      sol:function(E){return [{t:'split',p:[E.e(0)]},{t:'d',p:[[170,219],E.s(1)]},{t:'d',p:[[190,219],E.s(2)]}]}},
    {runs:[[[180,100],[180,170]],[[180,316],[180,370]]],goals:[{k:'bell',run:1,d:22}],slack:3,
      obs:[{k:'cat',x:188,y:240,r:31},{k:'tail',x:214,y:232,x2:264,y2:206,r:9}],
      tip:{ko:'자는 고양이는 건드리지 말고 돌아가요',en:'Go around the sleeping cat'},
      sol:function(E){return [{t:'d',p:cr([E.e(0),[173,188],[150,212],[136,240],[150,268],[173,292],E.s(1)])}]}},
    {runs:[[[120,96],[120,180]],[[120,330],[120,420]]],goals:[{k:'popper',run:1,d:22}],tray:{bridge:1},
      obs:[{k:'pencil',x:6,y:252,x2:354,y2:262,r:14},{k:'mug',x:262,y:150,r:25}],
      tip:{ko:'연필 위에는 다리를 놓아요',en:'Lay the bridge over the pencil'},
      sol:function(E){return [{t:'bridge',p:[[120,255]]},{t:'d',p:[E.e(0),E.s(1)]}]}},
    {runs:[[[180,84],[180,150]],[[180,395],[180,460]]],goals:[{k:'bell',run:1,d:22}],
      slopes:[{x:110,y:172,w:140,h:198,dx:0,dy:1}],
      tip:{ko:'책 계단 내리막은 멀리 닿아요',en:'Downhill on the book steps reaches further'},
      sol:function(E){return [{t:'d',p:[E.e(0),E.s(1)]}]}},
    {runs:[[[60,124],[60,200]],[[290,360],[290,440]]],goals:[{k:'rocket',run:1,d:22}],
      fans:[{x:40,y:300,a:0,len:215,bx:60,by:234}],papers:[[82,300,0],[112,300,0],[142,300,0],[172,300,0],[202,300,0],[232,300,0]],
      obs:[{k:'mug',x:200,y:170,r:25}],
      tip:{ko:'버튼을 누르면 선풍기가 종이를 넘겨요',en:'Hit the button — the fan blows the paper ones'},
      sol:function(E){return [{t:'d',p:[E.e(0),[60,226]]},{t:'d',p:[[232,300]].concat(arc(232,358,58,-90,0),[E.s(1)])}]}},
    {runs:[[[40,124],[80,124]],[[311,206],[311,300]],[[200,400],[100,400]]],goals:[{k:'bell',run:2,d:22}],tray:{ramp:1},slack:2,
      obs:[{k:'cat',x:205,y:268,r:30},{k:'tail',x:180,y:290,x2:150,y2:318,r:9}],
      tip:{ko:'레일 + 곡선!',en:'Rail + curves!'},
      sol:function(E){return [{t:'ramp',p:[E.e(0),[260,124]]},{t:'d',p:['R'].concat(arc(241.2,194,70,-90,0),[E.s(1)])},
        {t:'d',p:[E.e(1)].concat(arc(211,300,100,0,90),[E.s(2)])}]}},
    {runs:[[[180,84],[180,130]],[[152,176],[96,330]],[[250,290],[262,420]]],goals:[{k:'bell',run:1,d:22},{k:'popper',run:2,d:22}],
      tray:{split:1,bridge:1},
      obs:[{k:'pencil',x:186,y:235,x2:354,y2:235,r:14}],
      tip:{ko:'갈라지고, 건너고',en:'Split, then cross'},
      sol:function(E){return [{t:'split',p:[E.e(0)]},{t:'d',p:[[170,149],E.s(1)]},{t:'bridge',p:[[227,235]]},{t:'d',p:[[190,149],E.s(2)]}]}},
    {runs:[[[64,112],[64,140]],[[142,420],[170,420]],[[296,420],[312,420]]],goals:[{k:'rocket',run:2,d:22}],tray:{ramp:1},slack:2,
      slopes:[{x:28,y:156,w:76,h:176,dx:0,dy:1}],obs:[{k:'mug',x:210,y:250,r:25}],
      tip:{ko:'내리막, 곡선, 레일',en:'Downhill, curve, rail'},
      sol:function(E){return [{t:'d',p:[E.e(0),[64,350]].concat(arc(134,350,70,180,90),[E.s(1)])},{t:'ramp',p:[E.e(1),E.s(2)]},{t:'d',p:['R',E.s(2)]}]}},
    {runs:[[[180,78],[180,104]],[[110,352],[110,410]],[[250,392],[250,430]]],goals:[{k:'bell',run:1,d:22},{k:'rocket',run:2,d:22}],
      tray:{split:1,bridge:1},slack:2,
      slopes:[{x:64,y:196,w:92,h:140,dx:0,dy:1}],
      fans:[{x:250,y:200,a:90,len:125,bx:241,by:179}],papers:[[250,222,90],[250,252,90],[250,282,90],[250,312,90]],
      obs:[{k:'pencil',x:204,y:356,x2:354,y2:356,r:14}],
      tip:{ko:'전부 다 써 봐요!',en:'Use everything!'},
      sol:function(E){return [{t:'split',p:[E.e(0)]},
        {t:'d',p:cr([[170,131],[161,152],[140,178],[118,198],[110,222],[110,300],E.s(1)])},
        {t:'d',p:cr([[190,131],[197,148],[210,163],[228,173]])},
        {t:'bridge',p:[[250,356]]},{t:'d',p:[[250,312],E.s(2)]}]}}
  ];

  function slopeAt(L,x,y,dx,dy){for(var i=0;i<L.slopes.length;i++){var z=L.slopes[i];
      if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h){var l=Math.hypot(dx,dy)||1;if((dx*z.dx+dy*z.dy)/l>.5)return z}}return null}
  function spacing(L,lx,ly,qx,qy){return slopeAt(L,lx,ly,qx-lx,qy-ly)?SLOPE_SP:SP}
  function layRun(L,pts,ri,out){
    var ids=[],last=null,i,j,n,d,q;
    function put(x,y){out.push({k:'d',x:x,y:y,a:0,fx:1,run:ri});ids.push(out.length-1);last=[x,y]}
    put(pts[0][0],pts[0][1]);
    for(i=0;i<pts.length-1;i++){d=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);n=Math.ceil(d/.5);
      for(j=1;j<=n;j++){q=[pts[i][0]+(pts[i+1][0]-pts[i][0])*j/n,pts[i][1]+(pts[i+1][1]-pts[i][1])*j/n];
        if(Math.hypot(q[0]-last[0],q[1]-last[1])>=spacing(L,last[0],last[1],q[0],q[1])-1e-6)put(q[0],q[1])}}
    for(i=0;i<ids.length;i++){var p=out[ids[i]],a=out[ids[i?i-1:0]],b=out[ids[i+1<ids.length?i+1:i]];
      p.a=ids.length>1?Math.atan2(b.y-a.y,b.x-a.x):Math.atan2(pts[1][1]-pts[0][1],pts[1][0]-pts[0][0])}
    return ids}

  function build(def){
    var L={fixed:[],goals:[],obs:[],slopes:def.slopes||[],fans:[],runs:[],tip:def.tip||null,ghost:!!def.ghost,
      tray:{d:0,ramp:0,split:0,bridge:0},sol:[],ok:false,emptyWin:false},t=def.tray||{},i;
    (def.obs||[]).forEach(function(o){L.obs.push({k:o.k,x:o.x,y:o.y,x2:o.x2==null?o.x:o.x2,y2:o.y2==null?o.y:o.y2,r:o.r})});
    def.runs.forEach(function(pts,ri){L.runs.push(layRun(L,pts,ri,L.fixed))});
    (def.papers||[]).forEach(function(p){L.fixed.push({k:'paper',x:p[0],y:p[1],a:p[2]*Math.PI/180,fx:1})});
    (def.fans||[]).forEach(function(f){L.fans.push({x:f.x,y:f.y,a:f.a*Math.PI/180,len:f.len,bx:f.bx,by:f.by})});
    def.goals.forEach(function(o){var x=o.x,y=o.y;if(o.run!=null){var r=L.runs[o.run],p=L.fixed[r[r.length-1]];
        x=p.x+Math.cos(p.a)*o.d;y=p.y+Math.sin(p.a)*o.d}L.goals.push({k:o.k,x:x,y:y})});
    L.tray.ramp=t.ramp||0;L.tray.split=t.split||0;L.tray.bridge=t.bridge||0;
    var E={e:function(i){var r=L.runs[i],p=L.fixed[r[r.length-1]];return [p.x,p.y]},s:function(i){var p=L.fixed[L.runs[i][0]];return [p.x,p.y]}};
    L.sol=def.sol?def.sol(E):[];
    L.tray.d=999;var S=newState(L);applyStrokes(S,L.sol);
    var used=999-S.tray.d;L.tray.d=used+(def.slack==null?1:def.slack);L.used=used;
    L.ok=simulate(L,S.pieces).win&&S.tray.ramp>=0&&S.tray.split>=0&&S.tray.bridge>=0;
    L.emptyWin=simulate(L,L.fixed).win;
    return L}

  /* ---------- 놓기 ---------- */
  function newState(L){return {L:L,pieces:L.fixed.map(function(p){var o={};for(var k in p)o[k]=p[k];return o}),
    tray:{d:L.tray.d,ramp:L.tray.ramp,split:L.tray.split,bridge:L.tray.bridge},strokes:[]}}
  function inBridge(S,x,y){for(var i=0;i<S.pieces.length;i++){var p=S.pieces[i];if(p.k!=='bridge')continue;
      var c=Math.cos(p.a),s=Math.sin(p.a),rx=x-p.x,ry=y-p.y;if(Math.abs(rx*c+ry*s)<=BRL/2&&Math.abs(-rx*s+ry*c)<=BRW)return true}return false}
  function obsFree(S,x,y,pad,bridgeOk){var L=S.L,i,o;
    if(x<TX0||x>TX1||y<TY0||y>TY1)return false;
    for(i=0;i<L.obs.length;i++){o=L.obs[i];if(segD(x,y,o.x,o.y,o.x2,o.y2)<o.r+pad){if(bridgeOk&&o.k==='pencil'&&inBridge(S,x,y))continue;return false}}
    for(i=0;i<L.goals.length;i++)if(Math.hypot(x-L.goals[i].x,y-L.goals[i].y)<13+pad)return false;
    for(i=0;i<L.fans.length;i++){o=L.fans[i];if(Math.hypot(x-o.x,y-o.y)<13+pad||Math.hypot(x-o.bx,y-o.by)<8+pad)return false}
    return true}
  function canPlace(S,x,y){var i,p;
    if(!obsFree(S,x,y,0,true))return false;
    for(i=0;i<S.pieces.length;i++){p=S.pieces[i];
      if(p.k==='d'||p.k==='paper'){if(Math.hypot(x-p.x,y-p.y)<MINP)return false}
      else if(p.k==='split'){var sx=-Math.sin(p.a)*SPW,sy=Math.cos(p.a)*SPW;if(segD(x,y,p.x-sx,p.y-sy,p.x+sx,p.y+sy)<8)return false}
      else if(p.k==='ramp'){if(segD(x,y,p.x,p.y,p.x2,p.y2)<8)return false}}
    return true}
  function nearAnchor(S,x,y,rad,noRamp){var b=null,bd=rad,i,p,d;
    for(i=0;i<S.pieces.length;i++){p=S.pieces[i];
      if(p.k==='d'||p.k==='paper'){d=Math.hypot(x-p.x,y-p.y);if(d<bd){bd=d;b={x:p.x,y:p.y,p:p}}}
      else if(p.k==='ramp'&&!noRamp){d=Math.hypot(x-p.x2,y-p.y2);if(d<bd){bd=d;b={x:p.x2,y:p.y2,p:null}}}}
    return b}
  function sBegin(S,tool,x,y){
    var st={tool:tool,base:S.pieces.length,n:0,x0:x,y0:y,px:x,py:y,x:x,y:y,lx:null,ly:null,anc:null,dry:false};
    if(tool==='d'){var a=nearAnchor(S,x,y,16);
      if(a){st.anc=a;st.lx=a.x;st.ly=a.y}else dPut(S,st,x,y)}
    return st}
  function dPut(S,st,x,y){
    if(S.tray.d<=0){st.dry=true;return false}
    if(!canPlace(S,x,y))return false;
    var P=S.pieces,pr=st.n?P[P.length-1]:st.anc,p={k:'d',x:x,y:y,a:pr?Math.atan2(y-pr.y,x-pr.x):0};
    if(st.n){var bf=st.n>1?P[P.length-2]:st.anc||pr;pr.a=Math.atan2(y-bf.y,x-bf.x)}
    P.push(p);S.tray.d--;st.n++;st.lx=x;st.ly=y;return true}
  function sMove(S,st,x,y){
    st.x=x;st.y=y;if(st.tool!=='d')return;
    var d=Math.hypot(x-st.px,y-st.py),n=Math.max(1,Math.ceil(d/2)),i,qx,qy,dd,sp;
    for(i=1;i<=n;i++){qx=st.px+(x-st.px)*i/n;qy=st.py+(y-st.py)*i/n;
      if(st.lx==null){dPut(S,st,qx,qy);continue}
      dd=Math.hypot(qx-st.lx,qy-st.ly);sp=spacing(S.L,st.lx,st.ly,qx,qy);
      if(dd>=sp){if(!dPut(S,st,st.lx+(qx-st.lx)/dd*sp,st.ly+(qy-st.ly)/dd*sp)&&dd>sp+2)dPut(S,st,qx,qy)}}
    st.px=x;st.py=y}
  function rampFit(S,x0,y0,x,y){
    var dx=x-x0,dy=y-y0,l=Math.hypot(dx,dy);if(l<16)return null;dx/=l;dy/=l;
    var a=nearAnchor(S,x0,y0,24,true),sx=x0,sy=y0,len,t,ok,i,p,ex,ey;
    if(a){sx=a.x+dx*SP;sy=a.y+dy*SP}
    len=Math.min(RMAX,Math.max(RMIN,(x-sx)*dx+(y-sy)*dy));
    for(;len>=RMIN;len-=2){ok=true;ex=sx+dx*len;ey=sy+dy*len;
      for(t=0;t<=len&&ok;t+=4)if(!obsFree(S,sx+dx*t,sy+dy*t,2,false))ok=false;
      if(ok&&!obsFree(S,ex,ey,2,false))ok=false;
      for(i=0;i<S.pieces.length&&ok;i++){p=S.pieces[i];
        if(p.k==='d'||p.k==='paper'||p.k==='split'){if(segD(p.x,p.y,sx,sy,ex,ey)<9)ok=false}
        else if(p.k==='ramp'){if(segD(sx,sy,p.x,p.y,p.x2,p.y2)<12||segD(ex,ey,p.x,p.y,p.x2,p.y2)<12)ok=false}}
      if(ok)return {k:'ramp',x:sx,y:sy,x2:ex,y2:ey,a:Math.atan2(dy,dx),len:len}}
    return null}
  function splitFit(S,x0,y0,x,y){
    var a=nearAnchor(S,x0,y0,24,true),px=x0,py=y0,ang,i,p,s,c;
    if(a&&a.p){var ax=Math.cos(a.p.a),ay=Math.sin(a.p.a),sg=((x-a.x)*ax+(y-a.y)*ay)<-4?-1:1;ang=Math.atan2(ay*sg,ax*sg);px=a.x+ax*sg*SP;py=a.y+ay*sg*SP}
    else ang=Math.hypot(x-x0,y-y0)>10?Math.atan2(y-y0,x-x0):Math.PI/2;
    s=-Math.sin(ang);c=Math.cos(ang);
    for(i=-2;i<=2;i++)if(!obsFree(S,px+s*SPW*i/2,py+c*SPW*i/2,0,true))return null;
    for(i=0;i<S.pieces.length;i++){p=S.pieces[i];
      if(p.k==='d'||p.k==='paper'||p.k==='split'){var d=segD(p.x,p.y,px-s*SPW,py-c*SPW,px+s*SPW,py+c*SPW);
        if(d<8||Math.hypot(p.x-px,p.y-py)<MINP)return null}
      else if(p.k==='ramp'&&segD(px,py,p.x,p.y,p.x2,p.y2)<12)return null}
    return {k:'split',x:px,y:py,a:ang}}
  function bridgeFit(S,x,y){var L=S.L,b=null,bd=36,i,o,dx,dy,l,t,cx,cy,d;
    for(i=0;i<L.obs.length;i++){o=L.obs[i];if(o.k!=='pencil')continue;dx=o.x2-o.x;dy=o.y2-o.y;l=dx*dx+dy*dy;
      t=Math.max(0,Math.min(1,((x-o.x)*dx+(y-o.y)*dy)/l));cx=o.x+dx*t;cy=o.y+dy*t;d=Math.hypot(x-cx,y-cy);
      if(d<bd){bd=d;b={k:'bridge',x:cx,y:cy,a:Math.atan2(dx,-dy)}}}
    if(!b||b.x<TX0+BRW||b.x>TX1-BRW)return null;
    for(i=0;i<S.pieces.length;i++)if(S.pieces[i].k==='bridge'&&Math.hypot(S.pieces[i].x-b.x,S.pieces[i].y-b.y)<2*BRW+2)return null;
    return b}
  function fit(S,st){return st.tool==='ramp'?rampFit(S,st.x0,st.y0,st.x,st.y):st.tool==='split'?splitFit(S,st.x0,st.y0,st.x,st.y):
    st.tool==='bridge'?bridgeFit(S,st.x,st.y):null}
  /* 반환: 놓인 조각 수(0이면 아무것도 못 놓음) */
  function sEnd(S,st){
    var P=S.pieces,i,p;
    if(st.tool==='d'){
      if(st.n){var X=P[P.length-1],bf=st.n>1?P[P.length-2]:st.anc,ux=Math.cos(X.a),uy=Math.sin(X.a),b=null,bd=MAX+2,ex,ey,d;
        for(i=0;i<st.base;i++){p=P[i];if(p.k==='bridge')continue;if(st.anc&&p===st.anc.p)continue;
          ex=p.x;ey=p.y;d=Math.hypot(ex-X.x,ey-X.y);
          if(d<bd&&d>1&&(bf?((ex-X.x)*ux+(ey-X.y)*uy)/d>.3:true)){bd=d;b=[ex,ey]}}
        if(b)X.a=Math.atan2(b[1]-(bf||X).y,b[0]-(bf||X).x)}}
    else{if(S.tray[st.tool]>0&&(p=fit(S,st))){P.push(p);S.tray[st.tool]--;st.n=1}}
    if(st.n)S.strokes.push(st);
    return st.n}
  function undo(S){var st=S.strokes.pop();if(!st)return false;
    S.tray[st.tool]+=S.pieces.length-st.base;S.pieces.length=st.base;return true}
  function clearAll(S){var n=0;while(undo(S))n++;return n}
  function applyStrokes(S,list){list.forEach(function(k){
    var pts=k.p.map(function(q){if(q!=='R')return q;for(var i=S.pieces.length-1;i>=0;i--)if(S.pieces[i].k==='ramp')return [S.pieces[i].x2,S.pieces[i].y2];return [0,0]});
    var st=sBegin(S,k.t,pts[0][0],pts[0][1]),i;for(i=1;i<pts.length;i++)sMove(S,st,pts[i][0],pts[i][1]);sEnd(S,st)})}

  /* ---------- 쓰러짐 전파 ----------
     조각 0이 t=0에 자기 방향으로 쓰러진다. 반환 fall[i]={t,dx,dy,tw,dep,hit} */
  function simulate(L,pieces){
    var n=pieces.length,fall=new Array(n),used=new Array(n),q=[],i,
      res={fall:fall,ev:[],goalT:L.goals.map(function(){return null}),marbles:[],winds:[],cat:null,twist:null,win:false,tEnd:0,last:null},
      fanOn=L.fans.map(function(){return false}),CA=Math.cos(ANG)-1e-9;
    function emit(sx,sy,dx,dy,extra,reach,minr,t,dep,multi){
      var best=-1,bd=1e9,hits=[],j,p,rx,ry,f,lat,d,c,sg;
      for(j=0;j<n;j++){p=pieces[j];if(fall[j]||p.k==='bridge'||used[j])continue;
        rx=p.x-sx;ry=p.y-sy;f=rx*dx+ry*dy;if(f<=0)continue;lat=Math.abs(rx*dy-ry*dx)-extra;if(lat<0)lat=0;
        d=Math.hypot(f,lat);if(d>reach||d<minr||Math.atan2(lat,f)>ANG+1e-9)continue;
        if(multi)hits.push(j);else if(d<bd){bd=d;best=j}}
      if(!multi&&best>=0)hits.push(best);
      for(j=0;j<hits.length;j++){p=pieces[hits[j]];c=Math.cos(p.a)*dx+Math.sin(p.a)*dy;
        if(p.k==='ramp'){if(c>=CA){used[hits[j]]=1;var l=Math.hypot(p.x2-p.x,p.y2-p.y);
            res.marbles.push({i:hits[j],t0:t,t1:t+l/MV});q.push({t:t+l/MV,ty:1,i:hits[j],dep:dep})}}
        else if(Math.abs(c)>=CA){sg=c>=0?1:-1;q.push({t:t,ty:0,i:hits[j],dx:Math.cos(p.a)*sg,dy:Math.sin(p.a)*sg,tw:false,dep:dep})}
        else q.push({t:t,ty:0,i:hits[j],dx:dx,dy:dy,tw:true,dep:dep})}
      for(j=0;j<L.goals.length;j++){p=L.goals[j];rx=p.x-sx;ry=p.y-sy;d=Math.hypot(rx,ry);f=rx*dx+ry*dy;
        if(f>0&&d<=reach+6&&f/d>=.7&&(res.goalT[j]==null||t<res.goalT[j]))res.goalT[j]=t}
      for(j=0;j<L.fans.length;j++){p=L.fans[j];rx=p.bx-sx;ry=p.by-sy;d=Math.hypot(rx,ry);f=rx*dx+ry*dy;
        if(!fanOn[j]&&f>0&&d<=reach+2&&f/d>=.7){fanOn[j]=true;res.winds.push({f:j,t:t});q.push({t:t+.15,ty:2,f:j,dep:dep})}}
      return hits.length>0}
    var p0=pieces[0];q.push({t:0,ty:0,i:0,dx:Math.cos(p0.a),dy:Math.sin(p0.a),tw:false,dep:0});
    while(q.length){var bi=0;for(i=1;i<q.length;i++)if(q[i].t<q[bi].t)bi=i;var e=q.splice(bi,1)[0],p;
      if(e.t>res.tEnd)res.tEnd=e.t;
      if(e.ty===0){if(fall[e.i])continue;p=pieces[e.i];
        var f={t:e.t,dx:e.dx,dy:e.dy,tw:e.tw,dep:e.dep,hit:false,i:e.i};fall[e.i]=f;res.ev.push(f);res.last=f;
        for(i=0;i<L.obs.length;i++){var o=L.obs[i];if(o.k!=='cat'&&o.k!=='tail')continue;
          if((segD(p.x+e.dx*HT*.95,p.y+e.dy*HT*.95,o.x,o.y,o.x2,o.y2)<o.r-2||segD(p.x+e.dx*HT*.6,p.y+e.dy*HT*.6,o.x,o.y,o.x2,o.y2)<o.r-2)&&!res.cat)
            res.cat={t:e.t+DT,x:o.x,y:o.y}}
        if(e.tw){if(!res.twist)res.twist={t:e.t,x:p.x,y:p.y};continue}
        var z=slopeAt(L,p.x,p.y,e.dx,e.dy),sp=p.k==='split';
        f.hit=emit(p.x,p.y,e.dx,e.dy,sp?SPW:0,z?SLOPE_R:MAX,sp?0:MIN,e.t+(z?SLOPE_DT:DT),e.dep+1,sp)}
      else if(e.ty===1){p=pieces[e.i];emit(p.x2,p.y2,Math.cos(p.a),Math.sin(p.a),0,MAX,0,e.t,e.dep+1,false)}
      else{var fn=L.fans[e.f],cx=Math.cos(fn.a),cy=Math.sin(fn.a),k=0;
        for(i=0;i<n;i++){p=pieces[i];if(p.k!=='paper'||fall[i])continue;var al=(p.x-fn.x)*cx+(p.y-fn.y)*cy,la=Math.abs((p.x-fn.x)*cy-(p.y-fn.y)*cx);
          if(al>0&&al<=fn.len&&la<=14)q.push({t:e.t+al/WV,ty:0,i:i,dx:cx,dy:cy,tw:false,dep:e.dep+(++k)})}}}
    res.win=!res.cat&&res.goalT.every(function(t){return t!=null});
    for(i=0;i<res.goalT.length;i++)if(res.goalT[i]>res.tEnd)res.tEnd=res.goalT[i];
    if(res.cat&&res.cat.t>res.tEnd)res.tEnd=res.cat.t;
    return res}

  /* ---------- 절차 생성 ---------- */
  function genTry(R,n){
    var x=70+R()*220,y=94,h=(90+(R()-.5)*50)*Math.PI/180,pts=[[x,y]],seg=[],cum=[0],ns=4+(n>17?1:0),s,i,j,len,k;
    for(s=0;s<ns;s++){var st=pts.length-1;
      if(s%2===0){len=85+R()*105;for(k=3;k<=len;k+=3){x+=Math.cos(h)*3;y+=Math.sin(h)*3;pts.push([x,y])}seg.push({a:st,b:pts.length-1,str:true})}
      else{var sgn=R()<.5?-1:1,turn=(50+R()*65)*Math.PI/180,r=48+R()*30,tx=x+Math.cos(h+sgn*turn/2)*r*1.4,ty=y+Math.sin(h+sgn*turn/2)*r*1.4;
        if(tx<50||tx>310||ty<100||ty>490)sgn=-sgn;
        for(k=3;k<=r*turn;k+=3){h+=sgn*3/r;x+=Math.cos(h)*3;y+=Math.sin(h)*3;pts.push([x,y])}seg.push({a:st,b:pts.length-1,str:false})}}
    for(i=0;i<pts.length;i++){if(pts[i][0]<36||pts[i][0]>324||pts[i][1]<90||pts[i][1]>498)return null;if(i)cum.push(cum[i-1]+3)}
    for(i=0;i<pts.length;i+=2)for(j=i+22;j<pts.length;j+=2)if(Math.hypot(pts[i][0]-pts[j][0],pts[i][1]-pts[j][1])<40)return null;
    var tot=cum[cum.length-1],gaps=[],ramps=0,maxR=n>20?2:1;
    seg.forEach(function(sg){var a=Math.max(cum[sg.a]+10,42),b=Math.min(cum[sg.b]-10,tot-44),l=b-a,g0,gl;if(l<50)return;
      if(sg.str&&l>=125&&ramps<maxR&&R()<.65){gl=Math.min(l,150+R()*18);g0=a+R()*(l-gl);gaps.push({a:g0,b:g0+gl,ramp:true});ramps++}
      else if(R()<.75){gl=45+R()*Math.min(40,l-45);g0=a+R()*(l-gl);gaps.push({a:g0,b:g0+gl,ramp:false})}});
    if(!gaps.length)return null;
    function sub(a,b){var o=[];for(var i=0;i<pts.length;i++)if(cum[i]>=a-1e-6&&cum[i]<=b+1e-6)o.push(pts[i]);return o}
    var runs=[],prev=0;gaps.forEach(function(g){runs.push(sub(prev,g.a));prev=g.b});runs.push(sub(prev,tot));
    for(i=0;i<runs.length;i++)if(runs[i].length<2)return null;
    var obs=[],tries;
    function far(px,py,d){for(var i=0;i<pts.length;i+=2)if(Math.hypot(pts[i][0]-px,pts[i][1]-py)<d)return false;
      for(var j=0;j<obs.length;j++)if(Math.hypot(obs[j].x-px,obs[j].y-py)<70)return false;return true}
    for(tries=0;tries<30;tries++){var mx=50+R()*260,my=110+R()*380;if(far(mx,my,50)){obs.push({k:'mug',x:mx,y:my,r:25});break}}
    if(n>=14&&R()<.6)for(tries=0;tries<30;tries++){mx=60+R()*240;my=130+R()*340;
      if(far(mx,my,64)){obs.push({k:'cat',x:mx,y:my,r:30});break}}
    return {runs:runs,goals:[{k:['bell','popper','rocket'][n%3],run:runs.length-1,d:22}],obs:obs,tray:{ramp:ramps},slack:1,
      sol:function(E){var o=[];gaps.forEach(function(g,i){
        if(g.ramp){o.push({t:'ramp',p:[E.e(i),E.s(i+1)]});o.push({t:'d',p:['R',E.s(i+1)]})}
        else o.push({t:'d',p:[E.e(i)].concat(sub(g.a,g.b),[E.s(i+1)])})});return o}}}
  function gen(n){var seed=(n*7919+13)>>>0;function R(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
    for(var k=0;k<3000;k++){var def=genTry(R,n);if(!def)continue;var L=build(def);if(L.ok&&!L.emptyWin)return L}
    return build(LEVELS[n%LEVELS.length])}
  function getLevel(n){return n<LEVELS.length?build(LEVELS[n]):gen(n)}

  if(typeof module!=='undefined'&&module.exports){
    module.exports={LEVELS:LEVELS,build:build,gen:gen,getLevel:getLevel,newState:newState,simulate:simulate,sBegin:sBegin,sMove:sMove,sEnd:sEnd,
      undo:undo,clearAll:clearAll,applyStrokes:applyStrokes,canPlace:canPlace,arc:arc,cr:cr,
      K:{HT:HT,MIN:MIN,MAX:MAX,SP:SP,ANG:ANG,DT:DT,MV:MV,SLOPE_R:SLOPE_R,SLOPE_DT:SLOPE_DT,SPW:SPW,RMAX:RMAX}};
    return}

  /* ====================== 게임 ====================== */
  var TXT={ko:{go:'Go!',undo:'되돌리기',clear:'지우기',table:'테이블',gap:'끊겼어요!',twist:'너무 꺾였어요!',cat:'고양이가 깼어요!',more:'목표가 하나 더!',
      dry:'도미노가 없어요',drag:'끌어서 놓아요',nofit:'여긴 안 돼요',first:'한 번에 성공!',nice:'성공!'},
    en:{go:'Go!',undo:'Undo',clear:'Clear',table:'Table',gap:'Chain broke!',twist:'Too sharp!',cat:'Woke the cat!',more:'One more goal!',
      dry:'Out of dominoes',drag:'Drag to place',nofit:'Not here',first:'First try!',nice:'Nice!'}};
  var PAL=['#ff6b6b','#ffd166','#3ddc97','#4cc9f0','#b794f6','#ff9f43'],TOOLS=['d','ramp','split','bridge'];
  var lv,L,S,tool,mode,time,pt,sim,tries,streak,cur,stk,wasDown,T=0,evi,ft,wt,cam,gfx,why,stuck,kbMode=false,dried,
      motes=[],conf=[],steam=[],bgc=null,lampX=40,lampY=92,eye={x:0,y:0},blink=0,placedN,wonAll,mood='idle',marbTick=0,
      K={l:0,r:0,u:0,d:0,sp:0,go:0,undo:0,clear:0,num:0,kt:0};
  if(!window.__dominoRunKeys){window.__dominoRunKeys=true;
    var kd=function(e,v){var c=e.code,hit=true;
      if(c==='ArrowLeft')K.l=v;else if(c==='ArrowRight')K.r=v;else if(c==='ArrowUp')K.u=v;else if(c==='ArrowDown')K.d=v;
      else if(c==='Space')K.sp=v;else if(v&&!e.repeat&&c==='KeyG')K.go=1;else if(v&&!e.repeat&&c==='KeyZ')K.undo=1;
      else if(v&&!e.repeat&&c==='KeyC')K.clear=1;else if(v&&/^Digit[1-4]$/.test(c))K.num=+c.charAt(5);else hit=false;
      if(v&&(c==='Space'||c==='ArrowUp'||c==='KeyW'))K.kt=1;if(hit&&v)kbMode=true};
    window.addEventListener('keydown',function(e){kd(e,1)});window.addEventListener('keyup',function(e){kd(e,0)})}

  function tools(){return TOOLS.filter(function(k){return k!=='d'&&L.tray[k]>0})}
  function load(n){lv=n;L=getLevel(n);S=newState(L);tool='d';mode='edit';sim=null;tries=0;stk=null;cur={x:L.fixed[0].x,y:L.fixed[0].y+30};
    cam={z:1,x:180,y:300};gfx=[];why=null;stuck=-1;conf=[];steam=[];mood='idle'}
  function init(a){time=55;streak=0;wasDown=false;K.go=K.undo=K.clear=K.num=0;K.sp=0;load(0);
    if(!motes.length)for(var i=0;i<16;i++)motes.push({x:Math.random()*W,y:60+Math.random()*470,p:Math.random()*6.28,s:.4+Math.random()*.8})}
  function slot(i){return {x:8+i*54,y:546,w:50,h:44}}
  var GO={x:232,y:546,w:120,h:44},UN={x:8,y:598,w:84,h:34},CL={x:98,y:598,w:84,h:34};
  function inR(r,x,y){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h}

  function go(a){if(mode!=='edit')return;if(stk){sEnd(S,stk);stk=null}
    sim=simulate(L,S.pieces);mode='play';pt=-.4;evi=0;tries++;gfx=L.goals.map(function(){return -1});wonAll=false;mood='watch';a.sfx('jump')}
  function doUndo(a){if(mode!=='edit')return;if(undo(S)){a.sfx('tap')}}
  function doClear(a){if(mode!=='edit')return;if(clearAll(S))a.beep(300,.1,'triangle')}

  function update(dt,inp,a){
    var t=TXT[a.lang],i,p;
    var ptap=inp.tap&&!K.kt;K.kt=0;if(ptap)kbMode=false;
    var px,py,down;
    if(kbMode){var sp=150*dt;cur.x=Math.max(TX0+2,Math.min(TX1-2,cur.x+(K.r-K.l)*sp));cur.y=Math.max(TY0+2,Math.min(TY1-2,cur.y+(K.d-K.u)*sp));
      px=cur.x;py=cur.y;down=!!K.sp}
    else{px=inp.x;py=inp.y;down=(inp.down||ptap)&&px!=null;if(px!=null){cur.x=Math.max(TX0,Math.min(TX1,px));cur.y=Math.max(TY0,Math.min(TY1,py))}}
    var press=kbMode?down&&!wasDown:ptap&&px!=null,rel=!down&&wasDown;wasDown=down;
    if(mode==='edit'){
      time-=dt;a.tempo(time<12?1.35:1);
      if(time<=0){time=0;if(stk){sEnd(S,stk);stk=null}mood='sad';a.over();return}
      var tl=tools();
      if(K.num){if(K.num===1)tool='d';else if(tl[K.num-2])tool=tl[K.num-2];K.num=0;a.sfx('tap')}
      if(K.go){K.go=0;go(a);return}
      if(K.undo){K.undo=0;doUndo(a)}
      if(K.clear){K.clear=0;doClear(a)}
      if(press){
        if(!kbMode&&py>538){
          if(inR(GO,px,py)){go(a);return}
          if(inR(UN,px,py))doUndo(a);else if(inR(CL,px,py))doClear(a);
          else{var all=['d'].concat(tl);for(i=0;i<all.length;i++)if(inR(slot(i),px,py)){tool=all[i];a.sfx('tap')}}}
        else if(py>=TY0-8&&py<=538){
          if(S.tray[tool]<=0&&tool!=='d')tool='d';
          placedN=S.pieces.length;dried=false;stk=sBegin(S,tool,px,py)}}
      else if(down&&stk){sMove(S,stk,px,py)}
      if(stk){
        while(placedN<S.pieces.length){p=S.pieces[placedN++];a.beep(620+((placedN*37)%5)*40,.035,'triangle');a.burst(p.x,p.y-6,'#fff3d6',2)}
        if(stk.dry&&!dried){dried=true;a.pop(px,py-18,t.dry,'#ffb4a2');a.beep(200,.12,'sawtooth')}}
      if(rel&&stk){var st=stk;stk=null;var n=sEnd(S,st);
        if(st.tool!=='d'){if(n){p=S.pieces[S.pieces.length-1];a.sfx('coin');a.burst(p.x,p.y,'#ffe08a',10);if(S.tray[st.tool]<=0)tool='d'}
          else{a.pop(px,py-16,st.tool==='ramp'&&Math.hypot(st.x-st.x0,st.y-st.y0)<16?t.drag:t.nofit,'#ffb4a2');a.beep(200,.12,'sawtooth')}}}
    }else if(mode==='play'){
      var sc=1,tg=null;
      if(sim.win)for(i=0;i<sim.goalT.length;i++)if(pt>sim.goalT[i]-.5&&pt<sim.goalT[i]){sc=.38;tg=L.goals[i]}
      var cz=tg?1.16:1;cam.z+=(cz-cam.z)*Math.min(1,dt*6);if(tg){cam.x+=(tg.x-cam.x)*Math.min(1,dt*8);cam.y+=(tg.y-cam.y)*Math.min(1,dt*8)}
      pt+=dt*sc;
      while(evi<sim.ev.length&&sim.ev[evi].t<=pt){var e=sim.ev[evi++];p=S.pieces[e.i];
        if(e.dep>0||evi>1){a.beep(Math.min(2400,(sc<1?560:420)*Math.pow(2,Math.min(e.dep,40)/20)),sc<1?.07:.04,sc<1?'triangle':'square');
          if(sc<1)a.burst(p.x,p.y-12,'#fff6c9',4)}
        if(e.tw){a.pop(p.x,p.y-24,'?','#ffb4a2')}}
      for(i=0;i<sim.marbles.length;i++){var m=sim.marbles[i];if(pt>m.t0&&pt<m.t1){marbTick-=dt;if(marbTick<=0){marbTick=.07;a.beep(900+Math.random()*200,.02,'sine')}}}
      for(i=0;i<L.goals.length;i++)if(gfx[i]<0&&sim.goalT[i]!=null&&pt>=sim.goalT[i]){gfx[i]=0;var gl=L.goals[i];a.sfx('coin');a.shake(5);
        if(gl.k==='bell'){a.beep(1568,.5,'sine');a.beep(2093,.6,'triangle')}
        else if(gl.k==='popper'){a.beep(160,.12,'sawtooth');for(var c=0;c<40;c++)conf.push({x:gl.x,y:gl.y-10,vx:(Math.random()-.5)*260,vy:-120-Math.random()*220,c:PAL[c%6],t:0,r:Math.random()*6})}
        else{a.sfx('jump');a.beep(120,.5,'sawtooth')}
        PAL.forEach(function(col){a.burst(gl.x,gl.y-8,col,5)})}
      if(sim.cat&&!wonAll&&pt>=sim.cat.t&&why!=='catshown'){why='catshown';a.sfx('hit');a.shake(8);a.pop(sim.cat.x,sim.cat.y-40,'!!','#ff6b6b')}
      if(pt>sim.tEnd+(sim.win?.25:.55)){
        cam.z=1;
        if(sim.win){mode='win';wt=0;mood='happy';var un=S.tray.ramp+S.tray.split+S.tray.bridge,first=tries===1;
          streak=first?streak+1:0;var pts=10+Math.min(5,S.tray.d)+3*un+(first?5:0)+Math.min(10,streak*2);
          a.add(pts);a.sfx('win');time=Math.min(70,time+14);
          a.pop(180,250,(first?t.first:t.nice)+' +'+pts,'#ffe08a')}
        else{mode='fail';ft=0;mood='sad';streak=0;time=Math.max(.5,time-3);a.sfx('hit');a.shake(6);
          var hitN=sim.goalT.filter(function(x){return x!=null}).length;
          why=sim.cat?'cat':sim.twist?'twist':hitN?'more':'gap';
          var lp=S.pieces[sim.last.i],sx=sim.twist?sim.twist.x:lp.x+sim.last.dx*14,sy=sim.twist?sim.twist.y:lp.y+sim.last.dy*14;
          stuck=-1;var bd=70;for(i=0;i<S.pieces.length;i++){p=S.pieces[i];if(sim.fall[i]||p.k==='bridge'||p.k==='ramp')continue;
            var d=Math.hypot(p.x-sx,p.y-sy);if(d<bd){bd=d;stuck=i}}
          a.pop(Math.max(70,Math.min(290,sx)),Math.max(100,sy-30),t[why]+' -3s','#ffb4a2');a.burst(sx,sy,'#c9b8a3',8)}}
    }else if(mode==='win'){wt+=dt;for(i=0;i<gfx.length;i++)if(gfx[i]>=0)gfx[i]+=dt;if(wt>1.5)load(lv+1)}
    else if(mode==='fail'){ft+=dt;if(ft>1.1){mode='edit';sim=null;stuck=-1;why=null;mood='idle'}}
    if(mode==='play')for(i=0;i<gfx.length;i++)if(gfx[i]>=0)gfx[i]+=dt;
    /* 눈이 쫓는 지점 */
    var fx=cur.x,fy=cur.y;if(sim&&evi>0){var le=sim.ev[evi-1];fx=S.pieces[le.i].x;fy=S.pieces[le.i].y}
    eye.x+=(fx-eye.x)*Math.min(1,dt*10);eye.y+=(fy-eye.y)*Math.min(1,dt*10)}

  /* ---------- 그리기 ---------- */
  function rgb(h){return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]}
  function sh(c,f){return 'rgb('+Math.min(255,c[0]*f|0)+','+Math.min(255,c[1]*f|0)+','+Math.min(255,c[2]*f|0)+')'}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function hull(P){P.sort(function(a,b){return a[0]-b[0]||a[1]-b[1]});var h=[],k=0,i,t;
    function c(o,a,b){return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])}
    for(i=0;i<P.length;i++){while(k>=2&&c(h[k-2],h[k-1],P[i])<=0)k--;h[k++]=P[i]}
    for(i=P.length-2,t=k+1;i>=0;i--){while(k>=t&&c(h[k-2],h[k-1],P[i])<=0)k--;h[k++]=P[i]}
    h.length=k-1;return h}
  var PIP=[[],[[0,0]],[[-.5,-.5],[.5,.5]],[[-.55,-.55],[0,0],[.55,.55]],[[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]]];
  /* 기울어지는 직육면체: 그림자(sha=true) 또는 본체 */
  function box(g,x,y,dx,dy,th,w,ht,tilt,col,pip,sha,ink){
    var c=Math.cos(tilt),s=Math.sin(tilt),sx=-dy,sy=dx,sgn=tilt<0?-1:1,px=x+dx*th/2*sgn,py=y+dy*th/2*sgn,hw=w/2,u0=sgn>0?-th:0,u1=sgn>0?0:th;
    function P(u,v,z){var u2=u*c+z*s,z2=-u*s+z*c;if(z2<0)z2=0;return [px+dx*u2+sx*v,py+dy*u2+sy*v-z2*KZ,z2]}
    if(sha){var lx=x-lampX,ly=y-lampY,ll=Math.hypot(lx,ly)||1,k=.35+ll/520,pts=[],a,b,d,q;lx=lx/ll*k;ly=ly/ll*k;
      for(a=0;a<2;a++)for(b=0;b<2;b++)for(d=0;d<2;d++){q=P(a?u1:u0,b?hw:-hw,d?ht:0);pts.push([q[0]+lx*q[2],q[1]+q[2]*KZ+ly*q[2]])}
      var hh=hull(pts);g.beginPath();for(a=0;a<hh.length;a++)g[a?'lineTo':'moveTo'](hh[a][0],hh[a][1]);g.closePath();g.fill();return}
    var F=[[[dx*c,dy*c,-s],[u1,-hw,0],[u1,hw,0],[u1,hw,ht],[u1,-hw,ht],1],
           [[-dx*c,-dy*c,s],[u0,-hw,0],[u0,hw,0],[u0,hw,ht],[u0,-hw,ht],1],
           [[dx*s,dy*s,c],[u0,-hw,ht],[u1,-hw,ht],[u1,hw,ht],[u0,hw,ht],0],
           [[-dx*s,-dy*s,-c],[u0,-hw,0],[u1,-hw,0],[u1,hw,0],[u0,hw,0],0],
           [[sx,sy,0],[u0,hw,0],[u1,hw,0],[u1,hw,ht],[u0,hw,ht],0],
           [[-sx,-sy,0],[u0,-hw,0],[u1,-hw,0],[u1,-hw,ht],[u0,-hw,ht],0]],
      lvx=lampX-x,lvy=lampY-y,lvz=170,ln=Math.hypot(lvx,lvy,lvz),i,j,f,vis,br,q2;
    for(i=0;i<6;i++){f=F[i];vis=f[0][1]*KZ+f[0][2];if(vis<=.02)continue;
      br=.62+.5*Math.max(0,(f[0][0]*lvx+f[0][1]*lvy+f[0][2]*lvz)/ln);
      g.beginPath();for(j=1;j<=4;j++){q2=P(f[j][0],f[j][1],f[j][2]);g[j>1?'lineTo':'moveTo'](q2[0],q2[1])}g.closePath();
      g.fillStyle=sh(col,br);g.fill();g.strokeStyle=sh(col,.45);g.lineWidth=.8;g.stroke();
      if(f[5]&&pip&&vis>.22){var u=f[1][0],a1=P(u,-hw+1.5,ht/2),b1=P(u,hw-1.5,ht/2);
        g.strokeStyle=ink;g.lineWidth=1;g.beginPath();g.moveTo(a1[0],a1[1]);g.lineTo(b1[0],b1[1]);g.stroke();g.fillStyle=ink;
        for(var hf=0;hf<2;hf++){var pp=PIP[pip[hf]],zc=hf?ht*.75:ht*.25;
          for(j=0;j<pp.length;j++){q2=P(u,pp[j][0]*hw*.75,zc+pp[j][1]*ht*.2);g.beginPath();g.arc(q2[0],q2[1],1.35,0,7);g.fill()}}}}}

  function makeBg(){bgc=document.createElement('canvas');bgc.width=W;bgc.height=H;var b=bgc.getContext('2d'),i,y,gr=b.createLinearGradient(0,0,0,H);
    gr.addColorStop(0,'#c98f55');gr.addColorStop(.6,'#b87c45');gr.addColorStop(1,'#9c6435');b.fillStyle=gr;b.fillRect(0,0,W,H);
    var s=7;function R(){s=(s*1664525+1013904223)>>>0;return s/4294967296}
    for(i=0;i<5;i++){b.fillStyle='rgba(90,50,20,.07)';b.fillRect(0,i*128+R()*20,W,60)}
    for(i=0;i<70;i++){y=R()*H;b.strokeStyle='rgba('+(R()<.5?'70,36,12':'255,220,170')+','+(.05+R()*.1)+')';b.lineWidth=.6+R()*1.4;
      b.beginPath();b.moveTo(0,y);var k=R()*6,ph=R()*6;for(var x=0;x<=W;x+=20)b.lineTo(x,y+Math.sin(x*.02+ph)*k);b.stroke()}
    for(i=0;i<4;i++){var kx=R()*W,ky=70+R()*440;for(var r=3;r<16;r+=3){b.strokeStyle='rgba(70,36,12,.12)';b.beginPath();b.ellipse(kx,ky,r*1.8,r,0,0,7);b.stroke()}}
    for(i=1;i<3;i++){b.fillStyle='rgba(50,24,8,.25)';b.fillRect(0,i*190+20,W,1.5)}}

  function drawMug(g,o){var x=o.x,y=o.y,r=o.r-7;
    g.fillStyle='rgba(40,18,4,.28)';g.beginPath();g.ellipse(x+10,y+12,r+8,r+2,.5,0,7);g.fill();
    g.strokeStyle='#e9edf2';g.lineWidth=5;g.beginPath();g.arc(x+r+3,y-8,7,-1.6,1.6);g.stroke();
    var gr=g.createLinearGradient(x-r,0,x+r,0);gr.addColorStop(0,'#f7f9fb');gr.addColorStop(1,'#b9c3cf');
    g.fillStyle=gr;g.beginPath();g.moveTo(x-r,y-16);g.lineTo(x-r,y);g.arc(x,y,r,Math.PI,0,true);g.lineTo(x+r,y-16);g.closePath();g.fill();
    g.fillStyle='#fdfefe';g.beginPath();g.ellipse(x,y-16,r,r*.62,0,0,7);g.fill();
    g.fillStyle='#6b3f22';g.beginPath();g.ellipse(x,y-15,r-3.5,r*.62-3,0,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(x-4,y-17,r*.4,r*.16,-.3,0,7);g.fill();
    g.lineCap='round';for(var i=0;i<3;i++){var ph=T*.9+i*2.1,k=(ph%3)/3;g.strokeStyle='rgba(255,255,255,'+(.3*(1-k))+')';g.lineWidth=3;
      g.beginPath();for(var j=0;j<6;j++){var yy=y-20-k*34-j*5;g[j?'lineTo':'moveTo'](x-8+i*8+Math.sin(ph*2+j*.9)*3.5,yy)}g.stroke()}}
  function drawPencil(g,o){var a=Math.atan2(o.y2-o.y,o.x2-o.x),l=Math.hypot(o.x2-o.x,o.y2-o.y);g.save();g.translate(o.x,o.y);g.rotate(a);
    g.fillStyle='rgba(40,18,4,.3)';rr(g,2,-3,l,14,5);g.fill();
    g.fillStyle='#f4b6c2';g.fillRect(-4,-7,14,14);g.fillStyle='#c9ced6';g.fillRect(10,-7,7,14);
    var gr=g.createLinearGradient(0,-7,0,7);gr.addColorStop(0,'#ffe066');gr.addColorStop(.5,'#f5b700');gr.addColorStop(1,'#c98d00');g.fillStyle=gr;g.fillRect(17,-7,l-40,14);
    g.fillStyle='rgba(255,255,255,.35)';g.fillRect(17,-4,l-40,2.5);
    g.fillStyle='#f1d3a8';g.beginPath();g.moveTo(l-23,-7);g.lineTo(l-2,0);g.lineTo(l-23,7);g.closePath();g.fill();
    g.fillStyle='#3a3a44';g.beginPath();g.moveTo(l-9,-2.6);g.lineTo(l-2,0);g.lineTo(l-9,2.6);g.closePath();g.fill();g.restore()}
  function drawSlope(g,z){var n=5,i,cols=['#5b8def','#e76f51','#2a9d8f','#e9c46a','#9d6bd6'];
    g.fillStyle='rgba(40,18,4,.3)';rr(g,z.x+6,z.y+8,z.w,z.h,5);g.fill();
    for(i=0;i<n;i++){var y=z.y+z.h*i/n,h=z.h/n,ins=i*3;g.fillStyle=cols[i];rr(g,z.x+ins*.4,y,z.w-ins*.8,h+4,4);g.fill();
      g.fillStyle='rgba(255,255,255,.75)';g.fillRect(z.x+ins*.4+4,y+h-3,z.w-ins*.8-8,4);
      g.fillStyle='rgba(0,0,0,'+(.04+i*.04)+')';rr(g,z.x+ins*.4,y,z.w-ins*.8,h,4);g.fill();
      g.fillStyle='rgba(30,10,0,.28)';g.fillRect(z.x+ins*.4,y+h,z.w-ins*.8,3)}
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2.5;g.lineCap='round';
    for(i=0;i<3;i++){var k=((T*.6+i/3)%1),cy=z.y+12+k*(z.h-24);g.globalAlpha=Math.sin(k*Math.PI)*.8;
      g.beginPath();g.moveTo(z.x+z.w/2-9,cy-5);g.lineTo(z.x+z.w/2,cy+3);g.lineTo(z.x+z.w/2+9,cy-5);g.stroke()}g.globalAlpha=1}
  function drawRamp(g,p,al,mt){var l=Math.hypot(p.x2-p.x,p.y2-p.y);g.save();g.globalAlpha=al;g.translate(p.x,p.y);g.rotate(p.a);
    g.fillStyle='rgba(40,18,4,.3)';rr(g,-3,-3,l+10,15,6);g.fill();
    var gr=g.createLinearGradient(0,-8,0,8);gr.addColorStop(0,'#f6d9a8');gr.addColorStop(1,'#d9a766');g.fillStyle=gr;rr(g,-6,-8,l+10,16,7);g.fill();
    g.fillStyle='#8a5a2b';rr(g,-2,-3,l+2,6,3);g.fill();g.fillStyle='rgba(0,0,0,.25)';rr(g,-2,-3,l+2,2.5,1.5);g.fill();
    g.fillStyle='#e76f51';rr(g,-8,-9,7,18,3);g.fill();
    var mx=Math.max(0,Math.min(1,mt))*l;g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(mx+3,3,6,4,0,0,7);g.fill();
    var mg=g.createRadialGradient(mx-2,-5,1,mx,-3,7);mg.addColorStop(0,'#d8f6ff');mg.addColorStop(.5,'#3aa0e8');mg.addColorStop(1,'#12508a');
    g.fillStyle=mg;g.beginPath();g.arc(mx,-3,6.5,0,7);g.fill();g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.arc(mx-2.2,-5.4,1.8,0,7);g.fill();
    g.restore()}
  function drawBridge(g,p,al){g.save();g.globalAlpha=al;g.translate(p.x,p.y);g.rotate(p.a);
    g.fillStyle='rgba(40,18,4,.35)';rr(g,-BRL/2+3,-BRW+4,BRL,BRW*2,3);g.fill();
    g.fillStyle='#f0d9a6';rr(g,-BRL/2,-BRW-1,BRL,BRW*2+2,3);g.fill();g.strokeStyle='#b98b4e';g.lineWidth=1;
    for(var i=-2;i<=2;i++){g.beginPath();g.moveTo(i*8,-BRW-1);g.lineTo(i*8,BRW+1);g.stroke()}
    g.strokeStyle='#8a5a2b';g.lineWidth=1.5;rr(g,-BRL/2,-BRW-1,BRL,BRW*2+2,3);g.stroke();g.restore()}
  function drawFan(g,f,on){var c=Math.cos(f.a),s=Math.sin(f.a),i;
    g.strokeStyle='#40342c';g.lineWidth=2;g.beginPath();g.moveTo(f.bx,f.by);g.quadraticCurveTo(f.bx-12,(f.by+f.y)/2,f.x-c*6,f.y-s*6);g.stroke();
    g.fillStyle='rgba(40,18,4,.3)';g.beginPath();g.ellipse(f.bx+2,f.by+3,9,6,0,0,7);g.fill();
    g.fillStyle='#5a5a66';g.beginPath();g.ellipse(f.bx,f.by,9,6.5,0,0,7);g.fill();
    g.fillStyle=on?'#ff9aa2':'#ff4d5e';g.beginPath();g.ellipse(f.bx,f.by-(on?1:3),6.5,4.5,0,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(f.bx-2,f.by-(on?2:4),2.5,1.3,0,0,7);g.fill();
    g.fillStyle='rgba(40,18,4,.3)';g.beginPath();g.ellipse(f.x+6,f.y+8,15,10,0,0,7);g.fill();
    g.fillStyle='#7fd1c7';g.beginPath();g.arc(f.x,f.y-6,14,0,7);g.fill();g.strokeStyle='#3e9c92';g.lineWidth=2.5;g.stroke();
    g.fillStyle='#eafffb';var sp=T*(on?30:1.2);for(i=0;i<3;i++){g.beginPath();g.ellipse(f.x+Math.cos(sp+i*2.09)*5,f.y-6+Math.sin(sp+i*2.09)*5,6,3,sp+i*2.09,0,7);g.fill()}
    g.fillStyle='#3e9c92';g.beginPath();g.arc(f.x,f.y-6,2.6,0,7);g.fill();
    if(on){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;g.lineCap='round';
      for(i=0;i<5;i++){var k=((T*2.2+i*.2)%1),d=16+k*f.len,o=(i-2)*5;g.globalAlpha=(1-k)*.8;
        g.beginPath();g.moveTo(f.x+c*d-s*o,f.y+s*d+c*o-4);g.lineTo(f.x+c*(d+16)-s*o,f.y+s*(d+16)+c*o-4);g.stroke()}g.globalAlpha=1}}
  function drawGoal(g,o,t){var x=o.x,y=o.y,i,pu=1+Math.sin(T*4)*.08;
    if(t<0){g.strokeStyle='rgba(255,240,170,.75)';g.lineWidth=2;g.setLineDash([5,5]);g.lineDashOffset=-T*14;g.beginPath();g.ellipse(x,y,17*pu,12*pu,0,0,7);g.stroke();g.setLineDash([])}
    g.fillStyle='rgba(40,18,4,.3)';g.beginPath();g.ellipse(x+7,y+5,13,7,.3,0,7);g.fill();
    if(o.k==='bell'){var sw=t>=0?Math.sin(t*26)*.5*Math.exp(-t*2.2):0;g.save();g.translate(x,y-26);g.rotate(sw);
      g.fillStyle='#8a5a2b';g.fillRect(-1.5,-4,3,6);var gr=g.createLinearGradient(-11,0,11,0);gr.addColorStop(0,'#ffe680');gr.addColorStop(.5,'#ffc93c');gr.addColorStop(1,'#c98d00');
      g.fillStyle=gr;g.beginPath();g.moveTo(-11,22);g.quadraticCurveTo(-10,2,0,0);g.quadraticCurveTo(10,2,11,22);g.closePath();g.fill();
      g.fillStyle='#c98d00';rr(g,-13,20,26,5,2.5);g.fill();g.fillStyle='#7a4b12';g.beginPath();g.arc(-sw*10,27,3,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.ellipse(-4,9,2,6,.2,0,7);g.fill();g.restore();
      if(t>=0)for(i=0;i<3;i++){var k=(t*1.6+i*.33)%1;g.strokeStyle='rgba(255,236,150,'+(1-k)*Math.max(0,1-t*.6)+')';g.lineWidth=2.5;
        g.beginPath();g.arc(x,y-14,14+k*26,-.9,.9);g.stroke();g.beginPath();g.arc(x,y-14,14+k*26,Math.PI-.9,Math.PI+.9);g.stroke()}}
    else if(o.k==='popper'){g.save();g.translate(x,y-2);g.rotate(-.25+(t>=0?Math.sin(t*30)*.15*Math.exp(-t*3):0));
      var cols=['#ff6b6b','#ffd166','#4cc9f0'];for(i=0;i<3;i++){g.fillStyle=cols[i];g.beginPath();g.moveTo(-3-i*3.3,-i*9);g.lineTo(3+i*3.3,-i*9);g.lineTo(3+(i+1)*3.3,-(i+1)*9);g.lineTo(-3-(i+1)*3.3,-(i+1)*9);g.closePath();g.fill()}
      g.fillStyle='#fff';g.beginPath();g.ellipse(0,-27,13,4,0,0,7);g.fill();g.strokeStyle='#e0b000';g.lineWidth=1.5;g.stroke();g.restore()}
    else{var up=t>=0?t*t*380:0,ry=y-up;
      if(t>=0){for(i=0;i<5;i++){var kk=(t*3+i*.2)%1;g.fillStyle='rgba(240,240,240,'+(.5*(1-kk))+')';g.beginPath();g.arc(x+Math.sin(i*2.3)*8*kk,ry+4+kk*26,4+kk*7,0,7);g.fill()}
        g.fillStyle='#ffd166';g.beginPath();g.moveTo(x-5,ry);g.lineTo(x,ry+14+Math.sin(T*50)*4);g.lineTo(x+5,ry);g.closePath();g.fill();
        g.fillStyle='#ff6b6b';g.beginPath();g.moveTo(x-3,ry);g.lineTo(x,ry+8);g.lineTo(x+3,ry);g.closePath();g.fill()}
      g.fillStyle='#4cc9f0';g.beginPath();g.moveTo(x-8,ry-6);g.lineTo(x-14,ry+2);g.lineTo(x-7,ry);g.closePath();g.fill();
      g.beginPath();g.moveTo(x+8,ry-6);g.lineTo(x+14,ry+2);g.lineTo(x+7,ry);g.closePath();g.fill();
      var rg=g.createLinearGradient(x-8,0,x+8,0);rg.addColorStop(0,'#fff');rg.addColorStop(1,'#cfd6e0');g.fillStyle=rg;
      g.beginPath();g.moveTo(x-8,ry);g.lineTo(x-8,ry-22);g.quadraticCurveTo(x,ry-44,x+8,ry-22);g.lineTo(x+8,ry);g.closePath();g.fill();
      g.fillStyle='#ff6b6b';g.beginPath();g.moveTo(x-7.5,ry-25);g.quadraticCurveTo(x,ry-44,x+7.5,ry-25);g.closePath();g.fill();
      g.fillStyle='#4cc9f0';g.beginPath();g.arc(x,ry-15,3.6,0,7);g.fill();g.strokeStyle='#2b6f8f';g.lineWidth=1.2;g.stroke()}}
  function drawNap(g,o,tail,awake){var x=o.x,y=o.y,br=1+Math.sin(T*1.6)*.03;
    g.fillStyle='rgba(40,18,4,.3)';g.beginPath();g.ellipse(x+8,y+10,o.r+2,o.r*.72,0,0,7);g.fill();
    if(tail){g.strokeStyle='#8d99ae';g.lineWidth=11;g.lineCap='round';g.beginPath();g.moveTo(x-8,y+12);g.quadraticCurveTo(tail.x+14,tail.y-6,tail.x2,tail.y2);g.stroke();
      g.strokeStyle='#6c788c';g.lineWidth=11;g.beginPath();g.moveTo(tail.x2,tail.y2);g.lineTo(tail.x2+.1,tail.y2);g.stroke()}
    var gr=g.createRadialGradient(x-8,y-12,4,x,y,o.r);gr.addColorStop(0,'#b7c1d1');gr.addColorStop(1,'#8d99ae');g.fillStyle=gr;
    g.beginPath();g.ellipse(x,y,(o.r-4)*br,(o.r-10)*br,0,0,7);g.fill();
    g.strokeStyle='#6c788c';g.lineWidth=2;for(var i=0;i<3;i++){g.beginPath();g.arc(x+4+i*7,y-6,9,3.6,4.9);g.stroke()}
    var hx=x-13,hy=y+3;g.fillStyle='#9aa6ba';g.beginPath();g.moveTo(hx-11,hy-6);g.lineTo(hx-9,hy-17);g.lineTo(hx-2,hy-10);g.closePath();g.fill();
    g.beginPath();g.moveTo(hx+3,hy-10);g.lineTo(hx+10,hy-17);g.lineTo(hx+11,hy-5);g.closePath();g.fill();
    g.beginPath();g.ellipse(hx,hy,12.5,10.5,0,0,7);g.fill();
    g.strokeStyle='#39404d';g.lineWidth=1.6;g.lineCap='round';
    if(awake){g.fillStyle='#fff';g.beginPath();g.arc(hx-5,hy-1,3.4,0,7);g.arc(hx+5,hy-1,3.4,0,7);g.fill();g.fillStyle='#39404d';g.beginPath();g.arc(hx-5,hy-1,1.5,0,7);g.arc(hx+5,hy-1,1.5,0,7);g.fill()}
    else{g.beginPath();g.arc(hx-5,hy-1,2.6,.2,2.9);g.stroke();g.beginPath();g.arc(hx+5,hy-1,2.6,.2,2.9);g.stroke();
      g.fillStyle='#fff';g.font='13px Jua, system-ui, sans-serif';g.textAlign='center';for(i=0;i<3;i++){var k=((T*.5+i/3)%1);g.globalAlpha=1-k;g.fillText('z',x+12+k*16+i*2,y-o.r+8-k*24)}g.globalAlpha=1}
    g.fillStyle='#f4a6b5';g.beginPath();g.arc(hx,hy+3,1.5,0,7);g.fill()}
  function drawPaw(g,x,y,a,al){g.save();g.globalAlpha=al;g.translate(x,y);g.rotate(a);
    g.fillStyle='rgba(40,18,4,.25)';rr(g,-34,-4,36,16,8);g.fill();
    var gr=g.createLinearGradient(0,-9,0,9);gr.addColorStop(0,'#ffcf8f');gr.addColorStop(1,'#f0a85a');g.fillStyle=gr;rr(g,-40,-9,44,18,9);g.fill();
    g.fillStyle='#fff6ea';g.beginPath();g.arc(2,0,9.5,0,7);g.fill();
    g.fillStyle='#f48fa6';g.beginPath();g.ellipse(1,0,3.6,4.2,0,0,7);g.fill();
    [[7,-5],[8.5,0],[7,5]].forEach(function(q){g.beginPath();g.arc(q[0],q[1],2,0,7);g.fill()});g.restore()}
  function drawMascot(g,a){var x=236,y=624,b=mood==='happy'?Math.abs(Math.sin(T*9))*7:mood==='sad'?-3:Math.sin(T*2)*1.2;y-=b;
    g.fillStyle='#f0a85a';g.beginPath();g.moveTo(x-22,y-10);g.lineTo(x-19,y-31);g.lineTo(x-5,y-19);g.closePath();g.fill();
    g.beginPath();g.moveTo(x+22,y-10);g.lineTo(x+19,y-31);g.lineTo(x+5,y-19);g.closePath();g.fill();
    g.fillStyle='#f9b9c4';g.beginPath();g.moveTo(x-18,y-13);g.lineTo(x-17,y-25);g.lineTo(x-9,y-18);g.closePath();g.fill();
    g.beginPath();g.moveTo(x+18,y-13);g.lineTo(x+17,y-25);g.lineTo(x+9,y-18);g.closePath();g.fill();
    var gr=g.createRadialGradient(x-8,y-12,3,x,y,26);gr.addColorStop(0,'#ffd9a0');gr.addColorStop(1,'#f0a85a');g.fillStyle=gr;g.beginPath();g.ellipse(x,y,25,21,0,0,7);g.fill();
    g.fillStyle='#fff6ea';g.beginPath();g.ellipse(x,y+8,12,8,0,0,7);g.fill();
    var bl=(T+blink)%3.4<.13,ex=x,ey=y-3,dx=eye.x-x,dy=eye.y-(y-60),l=Math.hypot(dx,dy)||1,ox=dx/l*2.6,oy=dy/l*2.2;
    g.strokeStyle='#3b2a20';g.lineWidth=2.2;g.lineCap='round';
    if(mood==='happy'){g.beginPath();g.arc(ex-9,ey+1,4,Math.PI+.2,-.2);g.stroke();g.beginPath();g.arc(ex+9,ey+1,4,Math.PI+.2,-.2);g.stroke()}
    else if(bl){g.beginPath();g.moveTo(ex-13,ey);g.lineTo(ex-5,ey);g.moveTo(ex+5,ey);g.lineTo(ex+13,ey);g.stroke()}
    else{var big=mood==='watch'?1.2:1;g.fillStyle='#fff';g.beginPath();g.ellipse(ex-9,ey,5*big,5.6*big,0,0,7);g.ellipse(ex+9,ey,5*big,5.6*big,0,0,7);g.fill();
      if(mood==='sad'){ox=-2.4;oy=1.6}g.fillStyle='#3b2a20';g.beginPath();g.arc(ex-9+ox,ey+oy,2.6,0,7);g.arc(ex+9+ox,ey+oy,2.6,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(ex-10+ox,ey+oy-1,.9,0,7);g.arc(ex+8+ox,ey+oy-1,.9,0,7);g.fill()}
    g.fillStyle='#f48fa6';g.beginPath();g.moveTo(x-2.5,y+4);g.lineTo(x+2.5,y+4);g.lineTo(x,y+7);g.closePath();g.fill();
    g.strokeStyle='#3b2a20';g.lineWidth=1.5;g.beginPath();
    if(mood==='happy'){g.arc(x,y+8,4,.1,Math.PI-.1)}else if(mood==='sad'){g.arc(x,y+13,3.5,Math.PI+.4,-.4)}else{g.arc(x-2.5,y+8,2.5,.1,Math.PI-.3);g.arc(x+2.5,y+8,2.5,.3,Math.PI-.1)}g.stroke();
    if(mood==='sad'){g.fillStyle='rgba(255,120,140,.45)';g.beginPath();g.ellipse(x-15,y+5,4.5,2.6,0,0,7);g.ellipse(x+15,y+5,4.5,2.6,0,0,7);g.fill();
      g.fillStyle='#8fd3ff';g.beginPath();g.moveTo(x+21,y-16);g.quadraticCurveTo(x+26,y-8,x+21,y-6);g.quadraticCurveTo(x+16,y-8,x+21,y-16);g.fill()}}
  function icon(g,k,x,y){
    if(k==='d'){box(g,x,y+9,.5,.87,4,11,18,0,rgb('#fff6e0'),[2,3],false,'#c0392b')}
    else if(k==='ramp'){g.strokeStyle='#d9a766';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(x-12,y+7);g.lineTo(x+12,y-5);g.stroke();
      g.fillStyle='#3aa0e8';g.beginPath();g.arc(x-8,y,5,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x-9.5,y-1.5,1.4,0,7);g.fill()}
    else if(k==='split'){box(g,x,y+9,0,1,4,28,16,0,rgb('#b794f6'),null,false)}
    else{g.fillStyle='#f0d9a6';rr(g,x-14,y-5,28,12,2);g.fill();g.strokeStyle='#8a5a2b';g.lineWidth=1.2;g.stroke();for(var i=-1;i<=1;i++){g.beginPath();g.moveTo(x+i*7,y-5);g.lineTo(x+i*7,y+7);g.stroke()}}}

  function draw(g,a,dt){
    dt=dt||0;T+=dt;var t=TXT[a.lang],i,p,o;
    if(!bgc)makeBg();
    lampX=40+Math.sin(T*.45)*9;lampY=92+Math.cos(T*.37)*5;
    g.save();
    if(cam&&cam.z>1.002){g.translate(cam.x,cam.y);g.scale(cam.z,cam.z);g.translate(-cam.x,-cam.y)}
    g.drawImage(bgc,0,0);
    /* 스탠드 불빛 */
    var lg=g.createRadialGradient(lampX+70,lampY+90,20,lampX+70,lampY+90,430);lg.addColorStop(0,'rgba(255,224,150,.42)');lg.addColorStop(.45,'rgba(255,200,120,.12)');lg.addColorStop(1,'rgba(30,12,4,.5)');
    g.fillStyle=lg;g.fillRect(-40,-40,W+80,H+80);
    /* 연필밥 */
    for(i=0;i<6;i++){var qx=40+((lv*53+i*97)%280),qy=110+((lv*31+i*71)%400);g.save();g.translate(qx,qy);g.rotate(i*1.3+lv);
      g.strokeStyle='rgba(245,183,0,.55)';g.lineWidth=2;g.beginPath();g.arc(0,0,4,0,3.6);g.stroke();g.strokeStyle='rgba(241,211,168,.8)';g.lineWidth=1.5;g.beginPath();g.arc(0,0,2.4,.3,3.9);g.stroke();g.restore()}
    L.slopes.forEach(function(z){drawSlope(g,z)});
    L.obs.forEach(function(o){if(o.k==='pencil')drawPencil(g,o)});
    var ghostPc=(mode==='edit'&&stk&&stk.tool!=='d')?fit(S,stk):null;
    S.pieces.forEach(function(p){if(p.k==='bridge')drawBridge(g,p,1)});
    if(ghostPc&&ghostPc.k==='bridge')drawBridge(g,ghostPc,.55);
    /* 힌트 점선 */
    if(mode==='edit'&&(L.ghost||tries>=2)&&S.strokes.length===0&&!stk){g.lineCap='round';
      L.sol.forEach(function(k){if(k.t==='split'||k.t==='bridge'){var q=k.p[0];g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=2;g.setLineDash([3,4]);g.beginPath();g.arc(q[0],q[1]+(k.t==='split'?13:0),15,0,7);g.stroke();g.setLineDash([]);return}
        var pts=k.p.filter(function(q){return q!=='R'});if(pts.length<2)return;
        g.strokeStyle=k.t==='ramp'?'rgba(140,220,255,.8)':'rgba(255,255,255,.65)';g.lineWidth=3;g.setLineDash([6,7]);g.lineDashOffset=-T*22;
        g.beginPath();pts.forEach(function(q,j){g[j?'lineTo':'moveTo'](q[0],q[1])});g.stroke();g.setLineDash([]);
        var tot=0,ls=[];for(var j=1;j<pts.length;j++){ls.push(Math.hypot(pts[j][0]-pts[j-1][0],pts[j][1]-pts[j-1][1]));tot+=ls[j-1]}
        var d=((T*.55)%1)*tot;for(j=0;j<ls.length&&d>ls[j];j++)d-=ls[j];if(j<ls.length){var f=d/ls[j],hx=pts[j][0]+(pts[j+1][0]-pts[j][0])*f,hy=pts[j][1]+(pts[j+1][1]-pts[j][1])*f;
          g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(hx,hy,7,0,7);g.fill();g.fillStyle='rgba(255,180,90,.9)';g.beginPath();g.arc(hx,hy,4,0,7);g.fill()}})}
    S.pieces.forEach(function(p,i){if(p.k!=='ramp')return;var mt=0;if(sim)sim.marbles.forEach(function(m){if(m.i===i)mt=(pt-m.t0)/(m.t1-m.t0)});drawRamp(g,p,1,mode==='edit'?0:mt)});
    if(ghostPc&&ghostPc.k==='ramp')drawRamp(g,ghostPc,.55,0);
    var windOn=L.fans.map(function(){return false});if(sim&&mode!=='edit')sim.winds.forEach(function(w){if(pt>=w.t&&pt<w.t+1.3)windOn[w.f]=true});
    L.fans.forEach(function(f,i){drawFan(g,f,windOn[i])});
    /* 도미노: 그림자 → 본체(깊이순) */
    var items=[],tl;
    function tiltOf(i){var f=sim&&sim.fall[i];if(!f){if(i===stuck&&mode==='fail')return Math.sin(ft*34)*.16*Math.max(0,1-ft*1.3);return 0}
      var k=(pt-f.t)/TF;if(k<=0)return 0;var rest=f.hit?1.2:1.5;k=Math.min(1,k);var v=rest*k*k;
      if(mode==='fail'&&ft>.55)v*=Math.max(0,1-(ft-.55)/.4);return v}
    for(i=0;i<S.pieces.length;i++){p=S.pieces[i];if(p.k==='ramp'||p.k==='bridge')continue;
      var f=sim&&sim.fall[i],dx=f?f.dx:Math.cos(p.a),dy=f?f.dy:Math.sin(p.a);tl=tiltOf(i);
      items.push({p:p,i:i,dx:dx,dy:dy,tl:tl,key:(tl>.5&&dy>.15)?-10000-p.y:p.y})}
    if(ghostPc&&ghostPc.k==='split')items.push({p:ghostPc,i:-1,dx:Math.cos(ghostPc.a),dy:Math.sin(ghostPc.a),tl:0,key:ghostPc.y,gh:1});
    g.fillStyle='rgba(45,20,5,.3)';
    items.forEach(function(it){var p=it.p;box(g,p.x,p.y,it.dx,it.dy,p.k==='paper'?2:TH,p.k==='split'?2*SPW+12:WD,p.k==='paper'?22:HT,it.tl,null,null,true)});
    L.obs.forEach(function(o){if(o.k==='mug')items.push({o:o,key:o.y+6});else if(o.k==='cat')items.push({o:o,key:o.y})});
    L.goals.forEach(function(o,i){items.push({gl:o,gi:i,key:o.y})});
    items.sort(function(a,b){return a.key-b.key});
    items.forEach(function(it){
      if(it.o){if(it.o.k==='mug')drawMug(g,it.o);else{var tail=null;L.obs.forEach(function(q){if(q.k==='tail'&&Math.hypot(q.x-it.o.x,q.y-it.o.y)<60)tail=q});
          drawNap(g,it.o,tail,!!(sim&&sim.cat&&mode!=='edit'&&pt>=sim.cat.t))}return}
      if(it.gl){drawGoal(g,it.gl,gfx&&gfx[it.gi]!=null?gfx[it.gi]:-1);return}
      var p=it.p,col,pip,ink='#3b2a20';
      if(it.gh)g.globalAlpha=.55;
      if(p.k==='paper'){box(g,p.x,p.y,it.dx,it.dy,2,WD,22,it.tl,rgb('#f7fbff'),null,false)}
      else if(p.k==='split'){box(g,p.x,p.y,it.dx,it.dy,TH,2*SPW+12,HT,it.tl,rgb('#b794f6'),[3,3],false,'#fff')}
      else{if(p.fx){col=rgb(PAL[(p.run*2+(it.i%3))%6]);ink='#fff'}else{col=rgb('#fff6e0');ink='#c0392b'}
        pip=[1+(it.i*7)%4,1+(it.i*3)%4];box(g,p.x,p.y,it.dx,it.dy,TH,WD,HT,it.tl,col,pip,false,ink)}
      g.globalAlpha=1});
    /* 냥발 */
    p=S.pieces[0];var fl=mode==='play'?(pt<0?-Math.sin((pt+.4)/.4*Math.PI)*8:Math.max(0,1-pt*3)*9):0;
    drawPaw(g,p.x-Math.cos(p.a)*(17-fl),p.y-Math.sin(p.a)*(17-fl)-8,p.a,1);
    if(mode==='edit'&&S.strokes.length===0&&!stk){g.fillStyle='rgba(255,255,255,'+(.5+Math.sin(T*5)*.3)+')';g.font='13px Jua, system-ui, sans-serif';g.textAlign='center'}
    /* 색종이 */
    for(i=conf.length-1;i>=0;i--){o=conf[i];o.t+=dt;if(o.t>1.6){conf.splice(i,1);continue}o.vy+=420*dt;o.vx*=Math.pow(.3,dt);o.x+=o.vx*dt;o.y+=o.vy*dt;
      g.save();g.translate(o.x,o.y);g.rotate(o.r+o.t*9);g.globalAlpha=Math.min(1,1.6-o.t);g.fillStyle=o.c;g.fillRect(-3,-1.5,6,3);g.restore()}
    /* 먼지 */
    for(i=0;i<motes.length;i++){o=motes[i];o.x+=Math.sin(T*.3+o.p)*6*dt+3*dt*o.s;o.y-=5*dt*o.s;if(o.y<60){o.y=530;o.x=Math.random()*W}if(o.x>W)o.x=0;
      g.fillStyle='rgba(255,240,200,'+(.18+.14*Math.sin(T+o.p))+')';g.beginPath();g.arc(o.x,o.y,1.2+o.s,0,7);g.fill()}
    /* 스탠드 갓 */
    g.fillStyle='#3b3f4a';g.beginPath();g.moveTo(0,60);g.lineTo(lampX-6,lampY-18);g.lineTo(lampX+2,lampY-22);g.lineTo(10,52);g.closePath();g.fill();
    g.fillStyle='#2f9e8f';g.beginPath();g.ellipse(lampX,lampY-12,24,15,.5,0,7);g.fill();g.fillStyle='#fff3bf';g.beginPath();g.ellipse(lampX+5,lampY-6,15,8,.5,0,7);g.fill();
    /* 커서 */
    if(mode==='edit'&&kbMode){g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.arc(cur.x,cur.y,8+Math.sin(T*6)*1.5,0,7);g.stroke();g.strokeStyle='rgba(0,0,0,.5)';g.beginPath();g.arc(cur.x,cur.y,10+Math.sin(T*6)*1.5,0,7);g.stroke()}
    g.restore();

    /* ---- UI ---- */
    var tw=Math.max(0,Math.min(1,time/70));g.fillStyle='rgba(40,20,8,.55)';rr(g,10,34,340,8,4);g.fill();
    g.fillStyle=time<10?(Math.sin(T*12)>0?'#ff6b6b':'#ffb4a2'):'#ffd166';if(tw>.01){rr(g,10,34,340*tw,8,4);g.fill()}
    var label=(lv+1)+' · '+(L.tip?L.tip[a.lang]:t.table+' '+(lv+1));
    g.font='15px Jua, system-ui, sans-serif';g.textAlign='center';var lw=g.measureText(label).width+22;
    g.fillStyle='rgba(40,20,8,.6)';rr(g,180-lw/2,46,lw,22,11);g.fill();g.fillStyle='#fff6e0';g.fillText(label,180,62);
    g.fillStyle='rgba(50,26,10,.86)';g.fillRect(0,540,W,100);g.fillStyle='rgba(255,220,170,.25)';g.fillRect(0,540,W,2);
    var all=['d'].concat(tools());
    all.forEach(function(k,i){var s=slot(i),sel=tool===k&&mode==='edit',n=S.tray[k];
      g.fillStyle=sel?'#ffe8b0':'rgba(255,240,215,.2)';rr(g,s.x,s.y+(sel?-3:0),s.w,s.h,9);g.fill();
      if(sel){g.strokeStyle='#ff9f43';g.lineWidth=2.5;g.stroke()}
      g.globalAlpha=n>0?1:.35;icon(g,k,s.x+18,s.y+18+(sel?-3:0));g.globalAlpha=1;
      g.font='14px Jua, system-ui, sans-serif';g.textAlign='right';g.fillStyle=sel?'#5a3312':'#fff6e0';if(n<=0)g.fillStyle='#ff8f8f';g.fillText('×'+n,s.x+s.w-4,s.y+s.h-6+(sel?-3:0));
      g.font='10px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle=sel?'rgba(90,51,18,.6)':'rgba(255,246,224,.5)';g.fillText(i+1,s.x+4,s.y+11+(sel?-3:0))});
    var pu=mode==='edit'?1+Math.sin(T*4)*.02:1,gg=g.createLinearGradient(0,GO.y,0,GO.y+GO.h);gg.addColorStop(0,mode==='edit'?'#5fe08a':'#8aa192');gg.addColorStop(1,mode==='edit'?'#22a65a':'#5f7468');
    g.save();g.translate(GO.x+GO.w/2,GO.y+GO.h/2);g.scale(pu,pu);g.fillStyle='rgba(0,0,0,.3)';rr(g,-GO.w/2,-GO.h/2+3,GO.w,GO.h,12);g.fill();
    g.fillStyle=gg;rr(g,-GO.w/2,-GO.h/2,GO.w,GO.h,12);g.fill();g.fillStyle='rgba(255,255,255,.3)';rr(g,-GO.w/2+4,-GO.h/2+3,GO.w-8,12,7);g.fill();
    g.font='24px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle='#fff';g.fillText(t.go,0,9);g.restore();
    [[UN,t.undo,S.strokes.length>0],[CL,t.clear,S.strokes.length>0]].forEach(function(b){var r=b[0];g.fillStyle='rgba(255,240,215,'+(b[2]&&mode==='edit'?.22:.09)+')';rr(g,r.x,r.y,r.w,r.h,9);g.fill();
      g.font='14px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle=b[2]&&mode==='edit'?'#fff6e0':'rgba(255,246,224,.4)';g.fillText(b[1],r.x+r.w/2,r.y+22)});
    drawMascot(g,a);
    g.font='16px Jua, system-ui, sans-serif';g.textAlign='right';g.fillStyle=time<10?'#ff8f8f':'#fff6e0';g.fillText(Math.ceil(time)+'s',306,622);
  }

  SG.run({id:'domino-run',title:{ko:'냥발 도미노',en:'Paw Dominoes'},
    how:{ko:'끊긴 길에 손가락으로 도미노를 그려 잇고 Go! · 키보드: 방향키+스페이스로 그리기, 숫자키 도구, G 출발, Z 되돌리기',
         en:'Draw dominoes across the gaps, then hit Go! · Keys: arrows + hold Space to draw, numbers pick tools, G go, Z undo'},
    init:init,update:update,draw:draw});
})();
