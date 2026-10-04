/* 톱니 공방 (Gear Up) — 모터와 장난감 사이에 톱니바퀴를 끼워 넣는 기계 퍼즐.
   운동학(맞물림·방향·속도비·끼임)과 풀이 탐색기는 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,K=2,TOL=1.5,CL=6.5,AD=3,DD=3.6,BX0=12,BX1=348,BY0=76,BY1=484,CX=180,CY=282;

  /* ================= 핵심 로직 (headless) ================= */
  var WC={};
  function wheels(kind){return WC[kind]||(WC[kind]=String(kind).split('+').map(Number))}
  function tri(A,B,dA,dB,side){var dx=B[0]-A[0],dy=B[1]-A[1],d=Math.hypot(dx,dy),x=(dA*dA-dB*dB+d*d)/(2*d),h=Math.sqrt(Math.max(0,dA*dA-x*x)),
    ux=dx/d,uy=dy/d;return [A[0]+x*ux-side*h*uy,A[1]+x*uy+side*h*ux]}

  /* def: pegs(톱니 수 단위: [x,y] | ['p',i,거리,각도°] | ['t',i,j,di,dj,side] | ['h',i,j] 삼각 격자),
     motor:[p,kind,dir], fixed:[[p,kind]], targets:[[p,kind|0,dir,종류,lo,hi]], cats:[[p,kind]], belts:[[a,b,ra,rb]], tray:{kind:n} */
  function build(def){
    var P=[],i,j;
    def.pegs.forEach(function(s){var o,a;
      if(s[0]==='p'){o=P[s[1]];a=s[3]*Math.PI/180;P.push([o[0]+s[2]*K*Math.cos(a),o[1]+s[2]*K*Math.sin(a)])}
      else if(s[0]==='t')P.push(tri(P[s[1]],P[s[2]],s[3]*K,s[4]*K,s[5]));
      else if(s[0]==='h')P.push([24*K*(s[1]+s[2]/2),24*K*.8660254*s[2]]);
      else P.push([s[0]*K,s[1]*K])});
    var n=P.length,base=[];for(i=0;i<n;i++)base.push(null);
    base[def.motor[0]]=String(def.motor[1]);
    (def.fixed||[]).forEach(function(f){base[f[0]]=String(f[1])});
    (def.cats||[]).forEach(function(f){base[f[0]]=String(f[1])});
    var targets=(def.targets||[]).map(function(t){if(t[1])base[t[0]]=String(t[1]);return {p:t[0],dir:t[2],kind:t[3]||'box',lo:t[4]||0,hi:t[5]||0}});
    var x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for(i=0;i<n;i++){var r=base[i]?wheels(base[i])[0]*K+AD:18;x0=Math.min(x0,P[i][0]-r);x1=Math.max(x1,P[i][0]+r);y0=Math.min(y0,P[i][1]-r);y1=Math.max(y1,P[i][1]+r)}
    var ox=CX-(x0+x1)/2,oy=CY-(y0+y1)/2+(def.oy||0);for(i=0;i<n;i++){P[i][0]+=ox;P[i][1]+=oy}
    var D=[];for(i=0;i<n;i++){D.push([]);for(j=0;j<n;j++)D[i].push(Math.hypot(P[i][0]-P[j][0],P[i][1]-P[j][1]))}
    var free=[];for(i=0;i<n;i++)if(!base[i])free.push(i);
    var tray={},kinds=Object.keys(def.tray).filter(function(k){return def.tray[k]>0});
    kinds.sort(function(a,b){var A=wheels(a),B=wheels(b);return (A.length-B.length)||(A[0]-B[0])});
    kinds.forEach(function(k){tray[k]=def.tray[k]});
    return {pegs:P,base:base,motor:{p:def.motor[0],dir:def.motor[2]||1},targets:targets,cats:(def.cats||[]).map(function(c){return c[0]}),
      belts:def.belts||[],tray:tray,kinds:kinds,D:D,free:free,tip:def.tip||null,
      fits:x1-x0<=BX1-BX0&&y1-y0<=BY1-BY0}}

  /* 두 축의 관계: 'mesh' | 'block'(겹쳐서 못 끼움) | 'free' */
  function rel(d,wi,wj){var a,b,s,min=1e9,mesh=false;
    for(a=0;a<wi.length;a++)for(b=0;b<wj.length;b++){s=K*(wi[a]+wj[b]);if(Math.abs(d-s)<=TOL)mesh=true;if(s<min)min=s}
    return mesh?'mesh':d<min+CL?'block':'free'}
  function canPlace(L,place,i,kind){
    if(L.base[i])return false;var w=wheels(kind),r=w[0]*K+AD,p=L.pegs[i],j,k;
    if(w.length>1&&w[1]>w[0])r=w[1]*K+AD;
    if(p[0]-r<BX0||p[0]+r>BX1||p[1]-r<BY0||p[1]+r>BY1)return false;
    for(j=0;j<L.pegs.length;j++){if(j===i)continue;k=L.base[j]||place[j];if(k&&rel(L.D[i][j],w,wheels(k))==='block')return false}
    return true}

  /* 운동학: 모터 축 속도를 dir(±1)로 두고 맞물림(반대 방향, 톱니 수 비)·벨트(같은 방향, 풀리 비)를 따라 전파.
     이미 속도가 정해진 축에 다른 값이 들어오면 끼임(jam). */
  function solve(L,place){
    var n=L.pegs.length,ax=[],adj=[],i,j,a,b,d,k;
    for(i=0;i<n;i++){k=L.base[i]||place[i];ax.push(k?wheels(k):null);adj.push([])}
    for(i=0;i<n;i++)if(ax[i])for(j=i+1;j<n;j++)if(ax[j]){d=L.D[i][j];
      for(a=0;a<ax[i].length;a++)for(b=0;b<ax[j].length;b++)if(Math.abs(d-K*(ax[i][a]+ax[j][b]))<=TOL){
        adj[i].push({to:j,k:-ax[i][a]/ax[j][b],a:ax[i][a],b:ax[j][b]});adj[j].push({to:i,k:-ax[j][b]/ax[i][a],a:ax[j][b],b:ax[i][a]})}}
    L.belts.forEach(function(B){adj[B[0]].push({to:B[1],k:B[2]/B[3],belt:1});adj[B[1]].push({to:B[0],k:B[3]/B[2],belt:1})});
    var w=[],comp=[],par=[],order=[],jam=false;for(i=0;i<n;i++){w.push(0);comp.push(-1);par.push(null)}
    function bfs(root,c,w0){comp[root]=c;w[root]=w0;var q=[root],u,v,e,ww,x;
      while(q.length){u=q.shift();order.push(u);for(x=0;x<adj[u].length;x++){e=adj[u][x];v=e.to;ww=w[u]*e.k;
        if(comp[v]<0){comp[v]=c;w[v]=ww;par[v]={from:u,e:e};q.push(v)}else if(Math.abs(w[v]-ww)>1e-6)jam=true}}}
    bfs(L.motor.p,0,L.motor.dir);
    var c=1;for(i=0;i<n;i++)if(comp[i]<0)bfs(i,c++,0);
    if(jam)for(i=0;i<n;i++)w[i]=0;
    var tok=L.targets.map(function(t){var v=w[t.p],s=Math.abs(v);if(s<1e-9)return 0;if((v>0?1:-1)!==t.dir)return 2;
      if(t.lo&&s<t.lo-1e-9)return 3;if(t.hi&&s>t.hi+1e-9)return 4;return 1});
    var cat=L.cats.map(function(p){return Math.abs(w[p])>1e-9});
    return {w:w,comp:comp,par:par,order:order,jam:jam,tok:tok,cat:cat,
      win:!jam&&tok.every(function(s){return s===1})&&!cat.some(function(x){return x})}}

  /* 전수 탐색: 트레이로 가능한 모든 배치를 세고, 군더더기 없는(하나만 빼도 실패하는) 풀이를 모은다 */
  function solveAll(L,cap){
    var free=L.free,place=[],tray={},wins=[],states=0,i;for(i=0;i<L.pegs.length;i++)place.push(null);
    L.kinds.forEach(function(k){tray[k]=L.tray[k]});
    function rec(x){if(cap&&states>cap)return;
      if(x===free.length){states++;if(solve(L,place).win)wins.push(place.slice());return}
      var p=free[x];rec(x+1);
      for(var q=0;q<L.kinds.length;q++){var k=L.kinds[q];if(tray[k]>0&&canPlace(L,place,p,k)){place[p]=k;tray[k]--;rec(x+1);tray[k]++;place[p]=null}}}
    rec(0);
    var minimal=wins.filter(function(pl){for(var j=0;j<pl.length;j++)if(pl[j]){var c=pl.slice();c[j]=null;if(solve(L,c).win)return false}return true});
    return {states:states,wins:wins.length,minimal:minimal,over:!!(cap&&states>cap)}}
  function countGears(pl){var c=0;for(var i=0;i<pl.length;i++)if(pl[i])c++;return c}

  /* ---------- 손으로 만든 14개 보드 ---------- */
  var DEFS=[
    {pegs:[[0,0],['p',0,48,0],['p',1,48,0]],motor:[0,20,1],targets:[[2,20,1,'box']],tray:{28:1},
      tip:{ko:'톱니바퀴를 끼워 넣어요',en:'Drop in a gear'}},
    {pegs:[[0,0],['p',0,64,0],['p',0,32,0],['p',0,32,-67.976],['p',1,32,-112.024]],motor:[0,12,1],targets:[[1,12,-1,'box']],tray:{20:2},
      tip:{ko:'화살표 방향으로 돌려야 해요',en:'Match the arrow direction'}},
    {pegs:[[0,0],['p',0,40,25],['p',1,48,-20]],motor:[0,12,1],targets:[[2,20,1,'mill']],tray:{8:1,12:1,20:1,28:1},
      tip:{ko:'간격에 딱 맞는 크기를 찾아요',en:'Find the size that fits the gap'}},
    {pegs:[[0,0],['p',0,48,0],['t',0,1,40,28,-1],['t',0,1,32,32,1]],motor:[0,20,1],targets:[[1,0,1,'box',.8,1.25]],tray:{8:1,12:1,20:1,28:1},
      tip:{ko:'속도계를 초록 칸에 맞춰요',en:'Keep the gauge in the green'}},
    {pegs:[[0,0],['p',0,40,0],['t',0,1,40,40,-1],['p',1,40,0],['p',0,32,28.955],['p',3,32,151.045]],motor:[0,20,1],targets:[[3,20,-1,'box']],tray:{12:2,20:2},
      tip:{ko:'셋이 서로 물리면 꽉 끼어요!',en:'Three in a ring will jam!'}},
    {pegs:[[0,0],['p',0,40,180],['p',1,24,150],['p',0,36,-50],['p',3,20,-20],['p',0,36,50],['p',5,16,10],['p',6,20,60]],
      motor:[2,12,1],fixed:[[0,28]],targets:[[4,12,1,'box'],[7,12,-1,'mill']],tray:{8:3,12:1},
      tip:{ko:'박혀 있는 큰 바퀴를 이용해요',en:'Use the big bolted wheel'}},
    {pegs:[[0,0],['p',0,64,0],['p',0,32,0],['p',2,32,-90],['p',0,24,70],['p',1,24,110],['t',4,5,24,24,1]],
      motor:[0,12,1],targets:[[1,12,1,'ride']],cats:[[3,12]],tray:{12:3,20:1},
      tip:{ko:'쉿! 고양이를 깨우지 마요',en:"Shh! Don't wake the cat"}},
    {pegs:[[0,0],['p',0,47,0],['t',0,1,20,32,-1],['t',0,1,32,32,1]],motor:[0,12,1],targets:[[1,12,1,'box',2,3]],tray:{20:1,'20+8':1},
      tip:{ko:'겹톱니는 속도를 바꿔 줘요',en:'A double gear changes the speed'}},
    {pegs:[[0,0],['p',0,64,0],['p',0,32,0],['p',0,24,-33.557],['p',1,24,-146.443],['p',1,70,90],['p',5,24,180],['p',6,24,180]],
      motor:[0,12,1],fixed:[[1,12],[5,12]],targets:[[7,12,-1,'ride']],belts:[[1,5,10,10]],tray:{12:3,20:1},
      tip:{ko:'벨트는 같은 방향으로 전해요',en:'A belt keeps the same direction'}},
    {pegs:[['h',0,0],['h',3,0],['h',1,0],['h',2,0],['h',0,1],['h',1,1],['h',2,1],['h',1,-1],['h',2,-1],['h',3,-1],['h',1,2]],
      motor:[0,12,1],targets:[[1,12,1,'clock']],cats:[[10,12]],tray:{12:4},
      tip:{ko:'몇 번 맞물리는지 세어 봐요',en:'Count the meshes'}},
    {pegs:[[0,0],['p',0,32,-20],['p',1,16,20],['p',2,20,20],['t',1,3,32,24,1]],motor:[0,12,1],targets:[[3,12,-1,'box',.3,.5]],tray:{8:1,12:1,20:1,'20+8':1},
      tip:{ko:'느리게, 아주 느리게…',en:'Slow it right down…'}},
    {pegs:[[0,0],['p',0,80,0],['p',1,32,150],['t',0,2,24,32,1],['p',1,24,-60],['p',4,24,-10]],
      motor:[0,12,1],targets:[[2,20,-1,'ride'],[5,12,1,'mill']],belts:[[0,1,10,10]],tray:{12:3},
      tip:{ko:'벨트로 건너뛰어요',en:'Jump across with the belt'}},
    {pegs:[[0,0],['p',0,32,-40],['p',1,20,10],['p',0,32,50],['p',3,40,0]],motor:[0,20,1],
      targets:[[2,0,1,'box',2.2,2.8],[4,0,1,'ride',.6,.8]],tray:{8:1,12:2,20:1,28:1},
      tip:{ko:'둘 다 딱 맞게!',en:'Get both just right!'}},
    (function(){var c=[],i,j,x,id=function(a,b){for(var q=0;q<c.length;q++)if(c[q][1]===a&&c[q][2]===b)return q};
      for(j=-1;j<=3;j++)for(i=-2;i<=3;i++){x=i+j/2;if(x>=-.6&&x<=3.1)c.push(['h',i,j])}
      return {pegs:c,motor:[id(0,0),12,1],targets:[[id(3,0),12,1,'box'],[id(-1,3),12,-1,'clock']],cats:[[id(1,1),12]],tray:{12:5},
        tip:{ko:'마지막 설계도!',en:'The final blueprint!'}}})()
  ];
  var HAND=DEFS.map(build);

  /* ---------- 절차 생성 ---------- */
  var KINDS=['box','mill','clock','ride'];
  function pick(r,a){return a[Math.floor(r()*a.length)]}
  function genChain(r,lvl){
    var k=2+Math.floor(r()*Math.min(3,1+lvl/8)),mN=r()<.5?12:20,bare=r()<.4,ch=[],i,j,t,ok;
    for(i=0;i<k;i++)ch.push(pick(r,[8,12,12,20,20,28]));
    var seq=ch.slice();if(!bare)seq.push(r()<.5?12:20);
    var nodes=[{n:mN,x:0,y:0}],ang=r()*360;
    for(i=0;i<seq.length;i++){var pv=nodes[nodes.length-1],d=pv.n+seq[i];ok=false;
      for(t=0;t<14&&!ok;t++){var a2=(ang+(r()-.5)*170)*Math.PI/180,x=pv.x+d*Math.cos(a2),y=pv.y+d*Math.sin(a2);ok=true;
        for(j=0;j<nodes.length-1;j++)if(Math.hypot(x-nodes[j].x,y-nodes[j].y)<nodes[j].n+seq[i]+CL/K+1.5){ok=false;break}
        if(ok){nodes.push({n:seq[i],x:x,y:y});ang=a2*180/Math.PI}}
      if(!ok)return null}
    var pegs=nodes.map(function(o){return [o.x,o.y]}),nd=1+Math.floor(r()*3),tray={};
    function far(x,y,m){for(var q=0;q<pegs.length;q++)if(Math.hypot(x-pegs[q][0],y-pegs[q][1])<m)return false;return true}
    for(i=0;i<nd;i++)for(t=0;t<10;t++){var g=pick(r,nodes),s=pick(r,[8,12,20]),a3=r()*6.283,dx=g.x+(g.n+s)*Math.cos(a3),dy=g.y+(g.n+s)*Math.sin(a3);
      if(far(dx,dy,11)){pegs.push([dx,dy]);break}}
    ch.forEach(function(s){tray[s]=(tray[s]||0)+1});
    var ex=1+Math.floor(r()*2);for(i=0;i<ex;i++){var e=pick(r,[8,12,20,28]);tray[e]=(tray[e]||0)+1}
    var cats=[],last=nodes.length-1,dir=(seq.length%2===0)?1:-1; /* 맞물림 수 = seq.length, 홀수면 반대 방향 */
    if(pegs.length>nodes.length&&r()<.3+Math.min(.3,lvl/60)){var dq=pegs[nodes.length+Math.floor(r()*(pegs.length-nodes.length))],s2=pick(r,Object.keys(tray).map(Number)),a4=r()*6.283,
        cx=dq[0]+(s2+12)*Math.cos(a4),cy=dq[1]+(s2+12)*Math.sin(a4);ok=far(cx,cy,22);
      for(j=0;j<nodes.length&&ok;j++)if(Math.hypot(cx-nodes[j].x,cy-nodes[j].y)<nodes[j].n+12+CL/K+1.5)ok=false;
      if(ok){pegs.push([cx,cy]);cats.push([pegs.length-1,12])}}
    var v=mN/seq[seq.length-1],tg=bare?[last,0,dir,pick(r,KINDS),v*.8,v*1.25]:[last,seq[seq.length-1],dir,pick(r,KINDS)];
    return {pegs:pegs,motor:[0,mN,1],targets:[tg],cats:cats,tray:tray}}
  function genLat(r,lvl){
    var cells=[[0,0]],key={'0,0':1},NB=[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]],size=9+Math.floor(r()*4),g=0,i;
    while(cells.length<size&&g++<400){var c=pick(r,cells),o=pick(r,NB),ni=c[0]+o[0],nj=c[1]+o[1];
      if(key[ni+','+nj]||Math.abs(nj)>2||Math.abs(ni+nj/2)>2.6)continue;key[ni+','+nj]=1;cells.push([ni,nj])}
    function adjc(a,b){var di=b[0]-a[0],dj=b[1]-a[1];return NB.some(function(o){return o[0]===di&&o[1]===dj})}
    var m=Math.floor(r()*cells.length),dist=cells.map(function(){return -1}),q=[m];dist[m]=0;
    while(q.length){var u=q.shift();for(i=0;i<cells.length;i++)if(dist[i]<0&&adjc(cells[u],cells[i])){dist[i]=dist[u]+1;q.push(i)}}
    var cand=[];for(i=0;i<cells.length;i++)if(dist[i]>=3)cand.push(i);if(!cand.length)return null;
    var t1=pick(r,cand),tg=[[t1,12,r()<.5?1:-1,pick(r,KINDS)]],cats=[];
    if(r()<.35){var c2=cand.filter(function(x){return x!==t1&&!adjc(cells[x],cells[t1])});if(c2.length)tg.push([pick(r,c2),12,r()<.5?1:-1,pick(r,KINDS)])}
    if(r()<.45){var c3=[];for(i=0;i<cells.length;i++)if(i!==m&&dist[i]>=2&&!tg.some(function(t){return t[0]===i||adjc(cells[i],cells[t[0]])}))c3.push(i);
      if(c3.length)cats.push([pick(r,c3),12])}
    return {pegs:cells.map(function(c){return ['h',c[0],c[1]]}),motor:[m,12,1],targets:tg,cats:cats,tray:{12:6},lat:1}}
  function generate(r,lvl){
    for(var t=0;t<400;t++){var lat=r()<.45,def=lat?genLat(r,lvl):genChain(r,lvl);if(!def)continue;
      var L=build(def);if(!L.fits)continue;
      var res=solveAll(L,6000);if(res.over||!res.minimal.length)continue;
      var mn=1e9;res.minimal.forEach(function(p){mn=Math.min(mn,countGears(p))});
      if(lat){if(mn<2)continue;def.tray={12:mn+(r()<.4?1:0)};L=build(def);res=solveAll(L,6000);if(!res.minimal.length)continue}
      else if(res.minimal.length>6)continue;
      L.nsol=res.minimal.length;L.gen=1;return L}
    return HAND[4]}
  function rng(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}

  var CORE={K:K,build:build,solve:solve,solveAll:solveAll,canPlace:canPlace,rel:rel,generate:generate,rng:rng,HAND:HAND,DEFS:DEFS,countGears:countGears,wheels:wheels,
    bounds:[BX0,BX1,BY0,BY1],AD:AD};
  if(typeof module!=='undefined'&&module.exports)module.exports=CORE;
  if(typeof SG==='undefined')return;

  /* ================= 게임 ================= */
  var SP=1.5,LIFT=24,SNAP=34,TY=552,ko=SG.lang==='ko';
  var COL={8:'#ee6a5b',12:'#f3b53a',20:'#3db7a4',28:'#8a86ea'},STEEL='#aab4c2',WOOD='#dba66a',MOTOR='#ff8d3a',CREAM='#efdcb8';
  var MEL=[0,4,7,12,9,7,4,7,5,9,12,16,14,12,7,4];
  var S=null,keyq=[];
  function tx(k,e){return ko?k:e}
  var SC={};
  function shade(hex,f){var key=hex+f;if(SC[key])return SC[key];var n=parseInt(hex.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255,t=f>0?255:0,a=Math.abs(f);
    return SC[key]='rgb('+Math.round(r+(t-r)*a)+','+Math.round(g+(t-g)*a)+','+Math.round(b+(t-b)*a)+')'}

  var ptr={dn:false,x:0,y:0};
  if(!window.__gearUpKeys){window.__gearUpKeys=true;
    /* 누름은 이벤트로 직접 받는다: 한 프레임 안에 눌렀다 떼도 놓치지 않는다 */
    window.addEventListener('pointerdown',function(e){var c=e.target;if(!c||c.tagName!=='CANVAS')return;var r=c.getBoundingClientRect();
      ptr.dn=true;ptr.x=(e.clientX-r.left)/r.width*W;ptr.y=(e.clientY-r.top)/r.height*H},true);
    window.addEventListener('keydown',function(e){
      if(!S||!window.__sg||!window.__sg.state().playing||performance.now()-S.t0<120)return;
      var c=e.code;if(c==='Tab'||c==='Space'||c==='Escape'||c==='Enter'||c.indexOf('Arrow')===0||c==='KeyA'||c==='KeyD'||c==='KeyW'||c==='KeyS'){
        if(c==='Tab')e.preventDefault();if(e.repeat&&(c==='Space'||c==='Enter'||c==='Tab'))return;
        keyq.push(c==='KeyA'?'ArrowLeft':c==='KeyD'?'ArrowRight':c==='KeyW'?'ArrowUp':c==='KeyS'?'ArrowDown':c==='Tab'&&e.shiftKey?'BackTab':c)}})}

  function load(n){
    var L=n<HAND.length?HAND[n]:generate(Math.random,n);
    S.lv=n;S.L=L;S.place=L.pegs.map(function(){return null});S.tray={};L.kinds.forEach(function(k){S.tray[k]=L.tray[k]});
    S.phi=L.pegs.map(function(p,i){return i*1.7});S.theta=0;S.sol=solve(L,S.place);S.won=0;S.clean=true;S.drag=null;S.fade=1;
    S.acc=0;S.ni=0;S.grind=0;S.need=L.targets.map(function(){return 0});S.kb.mode=0;S.kb.slot=0;S.kb.peg=L.free[0];S.wasJam=false;S.wasCat=false}
  function init(a){
    S={t0:performance.now(),time:50,streak:0,kb:{on:false,mode:0,slot:0,peg:0},notes:[],mood:0,moodT:0,blink:2,bt:0,t:0,cleared:0,low:0};
    keyq.length=0;ptr.dn=false;load(0)}

  function slotX(i){return 190+(i-(S.L.kinds.length-1)/2)*50}
  function refresh(a,silent){
    var L=S.L,sol=S.sol=solve(L,S.place);
    if(sol.jam&&!S.wasJam&&!silent){a.sfx('hit');a.shake(9);S.clean=false;S.mood=2;S.moodT=1.2;
      var m=L.pegs[L.motor.p];a.pop(m[0],m[1]-34,tx('끼었어요!','Jammed!'),'#ff8a8a')}
    var cat=sol.cat.some(function(x){return x});
    if(cat&&!S.wasCat&&!silent){a.sfx('hit');S.clean=false;var c=L.pegs[L.cats[sol.cat.indexOf(true)]];a.pop(c[0],c[1]-30,tx('야옹?!','Meow?!'),'#ffd27a');a.burst(c[0],c[1],'#ffd27a',8)}
    S.wasJam=sol.jam;S.wasCat=cat;
    if(sol.win&&!S.won&&!S.drag)win(a)}
  function win(a){
    var L=S.L,un=0,k;for(k in S.tray)un+=S.tray[k];
    var pts=10+2*un+(S.clean?5:0)+Math.min(5,S.streak);
    S.streak=S.clean?S.streak+1:0;S.won=.0001;S.cleared++;S.time=Math.min(70,S.time+13);S.mood=1;S.moodT=2;
    a.add(pts);a.sfx('coin');
    L.targets.forEach(function(t){var p=L.pegs[t.p];a.burst(p[0],p[1],'#ffe27a',14)});
    var p0=L.pegs[L.targets[0].p];a.pop(p0[0],p0[1]-40,'+'+pts+(S.clean?tx(' 깔끔!',' Clean!'):''),'#fff3a8')}
  function giveBack(kind){S.tray[kind]=(S.tray[kind]||0)+1}
  function tryPlace(a,peg,kind){
    if(canPlace(S.L,S.place,peg,kind)){S.place[peg]=kind;a.sfx('tap');a.beep(520,.05,'triangle');var p=S.L.pegs[peg];a.burst(p[0],p[1],'#ffe9b0',5);refresh(a);return true}
    var q=S.L.pegs[peg];a.beep(150,.12,'sawtooth');a.pop(q[0],q[1]-26,tx('안 맞아요','No fit'),'#ffb0a0');return false}
  function pegAt(x,y,rad,needGear){var L=S.L,best=-1,bd=rad,i,p,d;
    for(i=0;i<L.free.length;i++){p=L.free[i];if(needGear?!S.place[p]:!!S.place[p])continue;
      d=Math.hypot(L.pegs[p][0]-x,L.pegs[p][1]-y);if(needGear)d-=wheels(S.place[p])[0]*K-10;if(d<bd){bd=d;best=p}}
    return best}
  function movePeg(dx,dy){var L=S.L,c=L.pegs[S.kb.peg],best=-1,bs=1e9;
    L.free.forEach(function(p){if(p===S.kb.peg)return;var vx=L.pegs[p][0]-c[0],vy=L.pegs[p][1]-c[1],f=vx*dx+vy*dy,s=Math.abs(vx*dy-vy*dx);
      if(f<=4)return;var sc=f+s*2.2;if(sc<bs){bs=sc;best=p}});
    if(best>=0){S.kb.peg=best;return true}return false}

  function update(dt,inp,a){
    var L=S.L,i,k;S.t+=dt;
    if(S.won){S.won+=dt;if(S.won>1.9){load(S.lv+1);L=S.L}}
    else{S.time-=dt;if(S.time<=0){S.time=0;a.over();return}
      a.tempo(S.time<10?1.35:1)}
    if(S.moodT>0){S.moodT-=dt;if(S.moodT<=0&&!S.sol.jam)S.mood=0}
    if(S.sol.jam){S.mood=2;S.moodT=.2}
    /* --- 포인터 --- */
    var px=inp.x,py=inp.y,press=ptr.dn,cx=px,cy=py;ptr.dn=false;
    if(press&&!S.won&&!S.drag){S.kb.on=false;px=ptr.x;py=ptr.y;
      var hit=-1;for(i=0;i<L.kinds.length;i++)if(Math.abs(px-slotX(i))<25&&Math.abs(py-TY)<42)hit=i;
      if(hit>=0){k=L.kinds[hit];S.kb.slot=hit;if(S.tray[k]>0){S.tray[k]--;S.drag={kind:k,x:px,y:py,sx:px,sy:py,lift:0,from:-1,moved:true};a.sfx('tap')}
        else a.beep(160,.08,'sawtooth')}
      else{var g=pegAt(px,py,16,true);if(g>=0){k=S.place[g];S.place[g]=null;S.drag={kind:k,x:px,y:py,sx:px,sy:py,lift:0,from:g,moved:false};refresh(a,true);a.beep(420,.04,'triangle')}}}
    px=cx;py=cy;
    if(S.drag){var d=S.drag;if(px!=null){d.x=px;d.y=py;if(Math.hypot(px-d.sx,py-d.sy)>9)d.moved=true}
      d.lift+=((d.moved?LIFT:0)-d.lift)*Math.min(1,dt*14);
      if(!inp.down&&d.moved)d.lift=LIFT;
      d.snap=d.moved?pegAt(d.x,d.y-d.lift,SNAP,false):-1;
      if(!inp.down){S.drag=null;
        if(!d.moved){giveBack(d.kind);a.sfx('jump');refresh(a)}
        else if(d.snap>=0&&tryPlace(a,d.snap,d.kind)){}
        else{giveBack(d.kind);if(d.snap<0)a.beep(300,.05,'triangle');refresh(a)}}}
    /* --- 키보드 --- */
    while(keyq.length){var c=keyq.shift(),kb=S.kb;if(S.won||S.drag)continue;kb.on=true;
      var nk=L.kinds.length;
      if(kb.mode===0){
        if(c==='ArrowLeft'){kb.slot=(kb.slot+nk-1)%nk;a.beep(500,.03,'triangle')}
        else if(c==='ArrowRight'){kb.slot=(kb.slot+1)%nk;a.beep(500,.03,'triangle')}
        else if(c==='Space'||c==='Enter'||c==='ArrowUp'||c==='Tab'||c==='BackTab'){kb.mode=1;a.beep(620,.04,'triangle');if(L.free.indexOf(kb.peg)<0)kb.peg=L.free[0]}}
      else{
        if(c==='ArrowLeft')movePeg(-1,0);else if(c==='ArrowRight')movePeg(1,0);else if(c==='ArrowUp')movePeg(0,-1);
        else if(c==='ArrowDown'){if(!movePeg(0,1))kb.mode=0}
        else if(c==='Tab'||c==='BackTab'){var ix=L.free.indexOf(kb.peg);kb.peg=L.free[(ix+(c==='Tab'?1:L.free.length-1))%L.free.length]}
        else if(c==='Escape')kb.mode=0;
        else if(c==='Space'||c==='Enter'){
          if(S.place[kb.peg]){giveBack(S.place[kb.peg]);S.place[kb.peg]=null;a.sfx('jump');refresh(a)}
          else{k=L.kinds[kb.slot];if(S.tray[k]>0){if(tryPlace(a,kb.peg,k)){S.tray[k]--;kb.mode=0}}else{a.beep(160,.08,'sawtooth');kb.mode=0}}}
        if(c.indexOf('Arrow')===0)a.beep(440,.025,'triangle')}}
    /* --- 소리: 첫 번째 장난감의 멜로디 빠르기가 톱니 비를 그대로 따른다 --- */
    var sol=S.sol;
    if(sol.jam){S.grind-=dt;if(S.grind<=0){S.grind=.1;a.beep(55+Math.random()*45,.09,'sawtooth');if(Math.random()<.3)a.shake(3)}}
    else{var T=L.targets[0],st=sol.tok[0],w=Math.abs(sol.w[T.p]);
      if(w>0){var rate=T.lo?6*w/Math.sqrt(T.lo*T.hi):Math.max(3,Math.min(8,5*w));S.acc+=rate*dt;
        while(S.acc>=1){S.acc-=1;var ni=S.ni++,m=MEL[(st===2?MEL.length-1-ni%MEL.length:ni%MEL.length)],f=523.25*Math.pow(2,m/12),p=L.pegs[T.p];
          if(st===1){a.beep(f,.24,'triangle');S.notes.push({x:p[0]+(Math.random()-.5)*20,y:p[1]-16,t:0,c:ni%2})}
          else if(st===3)a.beep(f/2,.4,'sine');else if(st===4)a.beep(f*2,.045,'square');
          else a.beep(f*.75*(ni%2?1:.94),.13,'sawtooth')}}}
    for(i=S.notes.length-1;i>=0;i--){S.notes[i].t+=dt;if(S.notes[i].t>1.1)S.notes.splice(i,1)}
  }

  /* ================= 그리기 ================= */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function toothPath(g,x,y,n,phi){var r=n*K,p=6.2831853/n,ro=r+AD,ri=r-DD,k,a;g.beginPath();
    for(k=0;k<n;k++){a=phi+k*p;
      g.lineTo(x+ri*Math.cos(a-.31*p),y+ri*Math.sin(a-.31*p));g.lineTo(x+ro*Math.cos(a-.15*p),y+ro*Math.sin(a-.15*p));
      g.lineTo(x+ro*Math.cos(a+.15*p),y+ro*Math.sin(a+.15*p));g.lineTo(x+ri*Math.cos(a+.31*p),y+ri*Math.sin(a+.31*p))}
    g.closePath()}
  function drawWheel(g,x,y,n,phi,col,o){
    var r=n*K,i,a,gr;o=o||{};
    g.fillStyle='rgba(8,20,48,.33)';toothPath(g,x+2.5,y+4,n,phi);g.fill();
    gr=g.createRadialGradient(x-r*.45,y-r*.5,r*.1,x,y,r*1.25);gr.addColorStop(0,shade(col,.45));gr.addColorStop(.5,col);gr.addColorStop(1,shade(col,-.38));
    g.fillStyle=gr;toothPath(g,x,y,n,phi);g.fill();g.strokeStyle=shade(col,-.5);g.lineWidth=1.2;g.stroke();
    /* 안쪽 테두리(빗면) */
    g.lineWidth=2;g.strokeStyle=shade(col,-.3);g.beginPath();g.arc(x,y,r-DD-2.5,0,6.3);g.stroke();
    g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=1.5;g.beginPath();g.arc(x,y,r-DD-4,3.5,4.9);g.stroke();
    /* 구멍: 바퀴와 함께 돈다 */
    var hc=n<=8?0:n<=12?3:n<=20?5:6,hr=n<=12?4.2:n<=20?6.5:8.5,hd=n<=12?r*.52:r*.56;
    for(i=0;i<hc;i++){a=phi+i*6.2832/hc+.5;var hx=x+hd*Math.cos(a),hy=y+hd*Math.sin(a);
      g.fillStyle=shade(col,-.55);g.beginPath();g.arc(hx,hy,hr,0,6.3);g.fill();
      g.fillStyle='rgba(20,40,80,.55)';g.beginPath();g.arc(hx+.8,hy+1.2,hr-1.2,0,6.3);g.fill();
      g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.beginPath();g.arc(hx,hy,hr,.4,1.9);g.stroke()}
    /* 반짝임: 바퀴와 함께 도는 줄 */
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2.2;g.lineCap='round';
    g.beginPath();g.arc(x,y,r-DD-7>3?r-DD-7:3,phi+.2,phi+.85);g.stroke();
    if(n>=20){g.strokeStyle='rgba(255,255,255,.3)';g.beginPath();g.arc(x,y,r-DD-7,phi+3.3,phi+3.75);g.stroke()}
    g.lineCap='butt';
    if(o.bolts){for(i=0;i<3;i++){a=i*2.094+.3;g.fillStyle='#5d6878';g.beginPath();g.arc(x+r*.3*Math.cos(a),y+r*.3*Math.sin(a),2.2,0,6.3);g.fill()}}
    if(!o.nohub){g.fillStyle=shade(col,-.45);g.beginPath();g.arc(x,y,5.5,0,6.3);g.fill();
      g.fillStyle='#f6e6c0';g.beginPath();g.arc(x,y,3,0,6.3);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x-1,y-1,1,0,6.3);g.fill()}}
  function kindCol(kind,i){return COL[wheels(kind)[i]]}
  function drawKind(g,x,y,kind,phi,layer){var w=wheels(kind);
    if(w.length===1){if(layer!==2)drawWheel(g,x,y,w[0],phi,COL[w[0]]);return}
    if(layer!==2)drawWheel(g,x,y,w[0],phi,shade(COL[w[0]],-.12),{nohub:1});
    if(layer!==1){g.fillStyle='rgba(8,20,48,.3)';g.beginPath();g.arc(x+1.5,y+2.5,w[1]*K+5,0,6.3);g.fill();
      g.fillStyle='#6b4a2a';g.beginPath();g.arc(x,y,w[1]*K+4.5,0,6.3);g.fill();drawWheel(g,x,y,w[1],phi,COL[w[1]])}}

  function drawBg(g,now){
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#7a5132');gr.addColorStop(.5,'#8d6039');gr.addColorStop(1,'#6a4428');g.fillStyle=gr;g.fillRect(0,0,W,H);
    g.strokeStyle='rgba(50,28,12,.22)';g.lineWidth=1.5;var i;
    for(i=0;i<6;i++){g.beginPath();g.moveTo(0,36+i*118);g.lineTo(W,30+i*118);g.stroke()}
    g.strokeStyle='rgba(255,220,170,.06)';for(i=0;i<9;i++){g.beginPath();g.moveTo(i*47-20,0);g.bezierCurveTo(i*47+10,200,i*47-30,420,i*47+6,H);g.stroke()}
    /* 설계도 판 */
    g.fillStyle='rgba(30,14,4,.4)';rr(g,7,52,346,440,12);g.fill();
    gr=g.createLinearGradient(0,48,0,488);gr.addColorStop(0,'#3568aa');gr.addColorStop(1,'#254b85');g.fillStyle=gr;rr(g,6,48,348,440,12);g.fill();
    g.save();rr(g,6,48,348,440,12);g.clip();
    g.strokeStyle='rgba(255,255,255,.07)';g.lineWidth=1;g.beginPath();
    for(i=18;i<W;i+=24){g.moveTo(i,48);g.lineTo(i,488)}for(i=60;i<488;i+=24){g.moveTo(6,i);g.lineTo(354,i)}g.stroke();
    /* 천천히 흘러가는 설계도 낙서 */
    g.strokeStyle='rgba(255,255,255,.09)';g.lineWidth=1.2;g.setLineDash([5,5]);
    for(i=0;i<3;i++){var bx=((now*6+i*150)%460)-50,by=120+i*150+Math.sin(now*.3+i)*10;g.beginPath();g.arc(bx,by,26+i*8,0,6.3);g.moveTo(bx-40,by);g.lineTo(bx+40,by);g.moveTo(bx,by-40);g.lineTo(bx,by+40);g.stroke()}
    g.setLineDash([]);
    /* 진자 */
    var sw=Math.sin(now*2.1)*.55,px=30+Math.sin(sw)*46,py=54+Math.cos(sw)*46;
    g.strokeStyle='rgba(255,226,160,.45)';g.lineWidth=2;g.beginPath();g.moveTo(30,54);g.lineTo(px,py);g.stroke();
    g.fillStyle='rgba(255,210,120,.6)';g.beginPath();g.arc(px,py,7,0,6.3);g.fill();g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(px-2,py-2,2,0,6.3);g.fill();
    g.fillStyle='#caa15a';g.beginPath();g.arc(30,54,3.5,0,6.3);g.fill();
    g.restore();
    g.strokeStyle='#5a3a1e';g.lineWidth=3;rr(g,6,48,348,440,12);g.stroke();
    g.strokeStyle='rgba(255,230,180,.25)';g.lineWidth=1;rr(g,8,50,344,436,10);g.stroke()}
  function drawSteam(g,now){var i;for(i=0;i<5;i++){var u=((now*.22+i*.2)%1),x=338+Math.sin(now*1.3+i*2)*8*u-u*10,y=506-u*64;
      g.fillStyle='rgba(255,255,255,'+(.26*(1-u))+')';g.beginPath();g.arc(x,y,4+u*10,0,6.3);g.fill()}
    g.fillStyle='#b9833f';rr(g,330,500,16,10,3);g.fill();g.fillStyle='#8a5c26';g.fillRect(333,508,10,90)}
  function drawBulbs(g,now){var i,jam=S.sol.jam;for(i=0;i<7;i++){var x=62+i*39.5,on=S.won?1:jam?(Math.sin(now*18)>0?1:0):(Math.floor(now*2.5)%7===i||Math.sin(now*1.7+i*2.1)>.8)?1:0,
        c=S.won?'#8dff9a':jam?'#ff6a5a':'#ffd866';
      g.fillStyle='#4a2f17';g.beginPath();g.arc(x,497,5,0,6.3);g.fill();
      g.fillStyle=on?c:'#7c6248';g.beginPath();g.arc(x,497,3.4,0,6.3);g.fill();
      if(on){g.fillStyle=c;g.globalAlpha=.22;g.beginPath();g.arc(x,497,8.5,0,6.3);g.fill();g.globalAlpha=1}}}

  function arrow(g,x,y,R,dir,col,now,still){
    var a0=-1.9*dir-1.5708,a1=a0+dir*3.9;g.strokeStyle=col;g.lineWidth=3;g.lineCap='round';g.setLineDash([7,6]);g.lineDashOffset=-dir*now*(still?14:34);
    g.beginPath();g.arc(x,y,R,a0,a1,dir<0);g.stroke();g.setLineDash([]);
    var hx=x+R*Math.cos(a1),hy=y+R*Math.sin(a1),ta=a1+dir*1.5708;g.fillStyle=col;g.beginPath();
    g.moveTo(hx+9*Math.cos(ta),hy+9*Math.sin(ta));g.lineTo(hx+6*Math.cos(ta+2.4),hy+6*Math.sin(ta+2.4));g.lineTo(hx+6*Math.cos(ta-2.4),hy+6*Math.sin(ta-2.4));g.fill();g.lineCap='butt'}
  function gpos(v){var u=(Math.log(v)/Math.LN2+2.6)/5.2;return u<0?0:u>1?1:u}
  function gauge(g,x,y,t,i,w){
    var gw=54,x0=x-gw/2;g.fillStyle='rgba(10,20,44,.8)';rr(g,x0-3,y-3,gw+6,13,5);g.fill();
    g.fillStyle='#e9eef7';rr(g,x0,y,gw,7,3);g.fill();
    g.fillStyle='#8fb4e8';g.fillRect(x0+1,y,gpos(t.lo)*gw-1,7);g.fillStyle='#ff9a84';g.fillRect(x0+gpos(t.hi)*gw,y,gw-gpos(t.hi)*gw-1,7);
    g.fillStyle='#4fd67a';g.fillRect(x0+gpos(t.lo)*gw,y,(gpos(t.hi)-gpos(t.lo))*gw,7);
    S.need[i]+=((w>0?gpos(w):0)-S.need[i])*.15;var nx=x0+S.need[i]*gw;
    g.fillStyle='#1a2540';g.beginPath();g.moveTo(nx,y+1);g.lineTo(nx-4.5,y+12);g.lineTo(nx+4.5,y+12);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(nx,y+8.5,1.4,0,6.3);g.fill()}
  function machine(g,x,y,kind,phi,st,now){
    var i,a;g.save();g.translate(x,y);
    g.fillStyle='rgba(8,20,48,.3)';g.beginPath();g.arc(1.5,2.5,13.5,0,6.3);g.fill();
    if(kind==='box'){var gr=g.createLinearGradient(-12,-12,12,12);gr.addColorStop(0,'#ffe9a6');gr.addColorStop(1,'#b9842c');g.fillStyle=gr;g.beginPath();g.arc(0,0,12.5,0,6.3);g.fill();
      g.strokeStyle='#7d5516';g.lineWidth=1.2;g.stroke();g.fillStyle='#6b4410';
      for(i=0;i<9;i++){a=phi+i*.698;var rr2=4+((i*5)%7);g.beginPath();g.arc(rr2*Math.cos(a),rr2*Math.sin(a),1.3,0,6.3);g.fill()}
      g.fillStyle='#fff8dc';g.beginPath();g.arc(0,0,2.2,0,6.3);g.fill();
      g.fillStyle='#dfe6ee';g.fillRect(13,-8,6,16);g.strokeStyle='#7c8794';g.lineWidth=1;for(i=-6;i<=6;i+=3){g.beginPath();g.moveTo(10.5,i);g.lineTo(19,i);g.stroke()}}
    else if(kind==='mill'){g.rotate(phi);for(i=0;i<4;i++){g.rotate(1.5708);g.fillStyle=i%2?'#fff4e0':'#ff8f7a';g.beginPath();g.moveTo(0,0);g.lineTo(15,-2);g.lineTo(15,7);g.lineTo(3,5);g.fill();g.strokeStyle='#8a4a3a';g.lineWidth=1;g.stroke()}
      g.fillStyle='#7a4b2a';g.beginPath();g.arc(0,0,3.5,0,6.3);g.fill()}
    else if(kind==='clock'){g.fillStyle='#fffaf0';g.beginPath();g.arc(0,0,12.5,0,6.3);g.fill();g.strokeStyle='#8a5a2c';g.lineWidth=2.2;g.stroke();
      g.strokeStyle='#8a5a2c';g.lineWidth=1.2;for(i=0;i<12;i++){a=i*.5236;g.beginPath();g.moveTo(9.5*Math.cos(a),9.5*Math.sin(a));g.lineTo(11.5*Math.cos(a),11.5*Math.sin(a));g.stroke()}
      g.strokeStyle='#d2493a';g.lineWidth=2;g.lineCap='round';g.beginPath();g.moveTo(0,0);g.lineTo(8.5*Math.cos(phi),8.5*Math.sin(phi));g.stroke();
      g.strokeStyle='#3b2a1a';g.beginPath();g.moveTo(0,0);g.lineTo(5.5*Math.cos(phi/6),5.5*Math.sin(phi/6));g.stroke();g.lineCap='butt';
      if(st===1){var b=Math.abs(Math.sin(now*6))*4;g.fillStyle='#ffd23f';g.beginPath();g.arc(0,-15-b,4,0,6.3);g.fill();g.fillStyle='#ff8a3c';g.beginPath();g.moveTo(3.5,-15-b);g.lineTo(8,-14-b);g.lineTo(3.5,-13-b);g.fill();g.fillStyle='#222';g.beginPath();g.arc(1,-16-b,.9,0,6.3);g.fill()}}
    else{g.rotate(phi);for(i=0;i<8;i++){g.fillStyle=i%2?'#fff4e0':'#ff7fa0';g.beginPath();g.moveTo(0,0);g.arc(0,0,12.5,i*.7854,(i+1)*.7854);g.fill()}
      g.strokeStyle='#a14868';g.lineWidth=1.2;g.beginPath();g.arc(0,0,12.5,0,6.3);g.stroke();
      for(i=0;i<4;i++){a=i*1.5708+.4;var bb=1+.25*Math.sin(now*7+i*1.6)*(st?1:0);g.fillStyle=['#7ad0ff','#ffe066','#b6f29a','#d9a8ff'][i];g.beginPath();g.arc(15.5*Math.cos(a),15.5*Math.sin(a),2.8*bb,0,6.3);g.fill()}
      g.fillStyle='#ffd23f';g.beginPath();g.arc(0,0,3,0,6.3);g.fill()}
    g.restore()}
  function drawCat(g,x,y,awake,phi,now){
    g.save();g.translate(x,y);if(awake)g.rotate(Math.sin(now*30)*.12);
    g.fillStyle='rgba(8,20,48,.3)';g.beginPath();g.ellipse(1.5,4,14,10,0,0,6.3);g.fill();
    var br=awake?0:Math.sin(now*2)*.6;
    g.fillStyle='#f6a04a';g.beginPath();g.ellipse(1,2,13.5,9.5+br,0,0,6.3);g.fill();
    g.strokeStyle='#d47a24';g.lineWidth=2.5;g.lineCap='round';g.beginPath();g.arc(2,3,11,.3,2.2);g.stroke();
    g.fillStyle='#f6a04a';g.beginPath();g.arc(-7,-3,7.5,0,6.3);g.fill();
    g.beginPath();g.moveTo(-13,-7);g.lineTo(-12.5,-14);g.lineTo(-7.5,-9.5);g.fill();g.beginPath();g.moveTo(-6,-10);g.lineTo(-1.5,-13.5);g.lineTo(-1,-6.5);g.fill();
    g.strokeStyle='#4a2a12';g.lineWidth=1.3;
    if(awake){g.fillStyle='#fff';g.beginPath();g.arc(-9.5,-3.5,2.6,0,6.3);g.arc(-4.5,-3.5,2.6,0,6.3);g.fill();g.fillStyle='#222';g.beginPath();g.arc(-9.5,-3.5,1.1,0,6.3);g.arc(-4.5,-3.5,1.1,0,6.3);g.fill();
      g.fillStyle='#ff5a4a';g.font='16px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('!',9,-10)}
    else{g.beginPath();g.arc(-9.5,-3,2,.3,2.8);g.stroke();g.beginPath();g.arc(-4.5,-3,2,.3,2.8);g.stroke();
      g.fillStyle='rgba(255,255,255,.85)';g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';var u=(now*.6)%1;g.globalAlpha=1-u;g.fillText('z',8+u*6,-12-u*12);g.globalAlpha=1}
    g.fillStyle='#ff8fa0';g.beginPath();g.arc(-7,-.5,1,0,6.3);g.fill();g.lineCap='butt';g.restore()}
  function drawMouse(g,x,y,now){
    var mood=S.mood,bob=mood===1?Math.abs(Math.sin(now*9))*5:Math.sin(now*2)*.8,tilt=mood===1?Math.sin(now*9)*.16:0;
    g.save();g.translate(x,y-bob);g.rotate(tilt);
    g.fillStyle='rgba(20,8,0,.3)';g.beginPath();g.ellipse(0,25+bob,17,4,0,0,6.3);g.fill();
    g.strokeStyle='#e9a2a2';g.lineWidth=2.5;g.lineCap='round';g.beginPath();g.moveTo(10,18);g.quadraticCurveTo(26,20,22,6+Math.sin(now*3)*3);g.stroke();
    g.fillStyle='#b9b2c4';g.beginPath();g.ellipse(0,13,12,13,0,0,6.3);g.fill();
    g.fillStyle='#7a5a3a';g.beginPath();g.moveTo(-8,7);g.lineTo(8,7);g.lineTo(9.5,24);g.lineTo(-9.5,24);g.fill();g.fillStyle='#ffd866';g.fillRect(-3,13,6,5);
    /* 귀 */
    g.fillStyle='#b9b2c4';g.beginPath();g.arc(-12,-15,8.5,0,6.3);g.arc(12,-15,8.5,0,6.3);g.fill();g.fillStyle='#f3b6c0';g.beginPath();g.arc(-12,-15,5,0,6.3);g.arc(12,-15,5,0,6.3);g.fill();
    g.fillStyle='#cbc5d6';g.beginPath();g.arc(0,-6,13.5,0,6.3);g.fill();
    /* 고글 */
    g.fillStyle='#5a3a1e';g.fillRect(-13.5,-10,27,3.5);
    var ex=0,ey=0;if(S.drag){ex=Math.max(-1.6,Math.min(1.6,(S.drag.x-x)/60));ey=Math.max(-1.6,Math.min(1,(S.drag.y-y)/90))}else{ex=1;ey=-1}
    [-6,6].forEach(function(o){g.fillStyle='#d9a03a';g.beginPath();g.arc(o,-7,6.4,0,6.3);g.fill();g.fillStyle='#e8f7ff';g.beginPath();g.arc(o,-7,4.8,0,6.3);g.fill();
      if(mood===2){g.strokeStyle='#33264a';g.lineWidth=1.6;g.beginPath();g.moveTo(o-2.5,-9);g.lineTo(o+1.5,-7);g.lineTo(o-2.5,-5);g.stroke()}
      else if(S.blink<.12||mood===1){g.strokeStyle='#33264a';g.lineWidth=1.6;g.beginPath();g.arc(o,mood===1?-6:-7,2.6,mood===1?3.4:.3,mood===1?6:2.8);g.stroke()}
      else{g.fillStyle='#33264a';g.beginPath();g.arc(o+ex,-7+ey,2.2,0,6.3);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(o+ex-.7,-7.8+ey,.8,0,6.3);g.fill()}
      g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.arc(o-2,-9.5,1.2,0,6.3);g.fill()});
    g.fillStyle='#ff8fa0';g.beginPath();g.arc(0,.5,2,0,6.3);g.fill();
    g.strokeStyle='#8d86a0';g.lineWidth=1;g.beginPath();g.moveTo(-3,1);g.lineTo(-11,-.5);g.moveTo(-3,2);g.lineTo(-11,3.5);g.moveTo(3,1);g.lineTo(11,-.5);g.moveTo(3,2);g.lineTo(11,3.5);g.stroke();
    if(mood===1){g.strokeStyle='#4a3a5a';g.lineWidth=1.4;g.beginPath();g.arc(0,2.5,2.6,.2,2.9);g.stroke()}
    /* 팔 */
    g.strokeStyle='#b9b2c4';g.lineWidth=4.5;g.beginPath();
    if(mood===2){g.moveTo(-9,8);g.lineTo(-15,-6);g.moveTo(9,8);g.lineTo(15,-6)}
    else if(mood===1){var wv=Math.sin(now*9)*4;g.moveTo(-9,8);g.lineTo(-18,-4+wv);g.moveTo(9,8);g.lineTo(18,-4-wv)}
    else{g.moveTo(-9,9);g.lineTo(-13,17);g.moveTo(9,9);g.lineTo(13,17)}
    g.stroke();
    if(mood===2){g.fillStyle='#cbc5d6';g.beginPath();g.arc(-14,-13,5,0,6.3);g.arc(14,-13,5,0,6.3);g.fill()}
    g.lineCap='butt';g.restore()}

  function phases(dt){
    var L=S.L,sol=S.sol,ph=S.phi,P=L.pegs,i,v,pr,e,al;
    if(!sol.jam)S.theta+=SP*dt;
    ph[L.motor.p]=S.theta*L.motor.dir;
    for(i=0;i<sol.order.length;i++){v=sol.order[i];pr=sol.par[v];if(!pr)continue;e=pr.e;
      if(e.belt)ph[v]=ph[pr.from]*e.k;
      else{al=Math.atan2(P[v][1]-P[pr.from][1],P[v][0]-P[pr.from][0]);ph[v]=al+Math.PI-Math.PI/e.b+(e.a/e.b)*(al-ph[pr.from])}}}

  function draw(g,a,dt){
    if(!S)return;var now=performance.now()/1000,L=S.L,P=L.pegs,sol=S.sol,i,k,p;dt=dt||0;
    S.bt+=dt;S.blink-=dt;if(S.blink<0)S.blink=2+Math.random()*3;
    if(S.fade>0)S.fade=Math.max(0,S.fade-dt*3);
    phases(dt);
    drawBg(g,now);
    /* 제한 시간 */
    var tw=332*Math.min(1,S.time/70);g.fillStyle='rgba(30,14,4,.55)';rr(g,14,33,332,9,4.5);g.fill();
    g.fillStyle=S.time<10?(Math.sin(now*10)>0?'#ff6a5a':'#ffb0a0'):'#ffd866';if(tw>4){rr(g,14,33,tw,9,4.5);g.fill()}
    g.fillStyle='rgba(255,255,255,.35)';if(tw>8)g.fillRect(18,35,tw-8,2);
    /* 보드 번호와 한 줄 안내 */
    g.textAlign='left';g.font='13px Jua, system-ui, sans-serif';g.fillStyle='rgba(255,255,255,.75)';g.fillText(tx('보드 ','Board ')+(S.lv+1),58,68);
    if(L.tip){g.textAlign='right';g.font='15px Jua, system-ui, sans-serif';g.fillStyle='#fff6d8';g.fillText(L.tip[ko?'ko':'en'],344,69)}
    g.save();g.globalAlpha=1-S.fade*.9;
    var jit=function(j){return sol.jam&&sol.comp[j]===0?Math.sin(now*75+j*2)*.035:0};
    /* 벨트 */
    L.belts.forEach(function(B){var A=P[B[0]],C=P[B[1]],dx=C[0]-A[0],dy=C[1]-A[1],d=Math.hypot(dx,dy),nx=-dy/d,ny=dx/d,s;
      for(s=-1;s<=1;s+=2){g.strokeStyle='rgba(8,20,48,.3)';g.lineWidth=5;g.beginPath();g.moveTo(A[0]+nx*B[2]*s+2,A[1]+ny*B[2]*s+3);g.lineTo(C[0]+nx*B[3]*s+2,C[1]+ny*B[3]*s+3);g.stroke();
        g.strokeStyle='#3a2a22';g.lineWidth=4.5;g.beginPath();g.moveTo(A[0]+nx*B[2]*s,A[1]+ny*B[2]*s);g.lineTo(C[0]+nx*B[3]*s,C[1]+ny*B[3]*s);g.stroke();
        g.strokeStyle='#c9a36a';g.lineWidth=1.5;g.setLineDash([5,9]);g.lineDashOffset=-s*S.phi[B[0]]*B[2];g.stroke();g.setLineDash([])}});
    /* 빈 못 */
    for(i=0;i<P.length;i++){p=P[i];if(L.base[i]||S.place[i])continue;
      var pu=.5+.5*Math.sin(now*3+i);g.strokeStyle='rgba(255,255,255,'+(.25+.25*pu)+')';g.lineWidth=1.5;g.setLineDash([4,4]);g.beginPath();g.arc(p[0],p[1],11+pu*1.5,0,6.3);g.stroke();g.setLineDash([]);
      g.fillStyle='rgba(8,20,48,.35)';g.beginPath();g.arc(p[0]+1,p[1]+2,5,0,6.3);g.fill();
      g.fillStyle='#e7c477';g.beginPath();g.arc(p[0],p[1],4.5,0,6.3);g.fill();g.fillStyle='#fff3c9';g.beginPath();g.arc(p[0]-1.2,p[1]-1.2,1.6,0,6.3);g.fill()}
    /* 톱니: 겹톱니의 큰 바퀴 → 보통 톱니 → 겹톱니의 작은 바퀴 */
    var tset={},cset={};L.targets.forEach(function(t){tset[t.p]=t});L.cats.forEach(function(c){cset[c]=1});
    for(var pass=0;pass<3;pass++)for(i=0;i<P.length;i++){k=L.base[i]||S.place[i];if(!k)continue;p=P[i];var w=wheels(k),ph=S.phi[i]+jit(i);
      if(w.length>1){if(pass===0)drawKind(g,p[0],p[1],k,ph,1);else if(pass===2)drawKind(g,p[0],p[1],k,ph,2);continue}
      if(pass!==1)continue;
      if(!L.base[i])drawWheel(g,p[0],p[1],w[0],ph,COL[w[0]]);
      else if(i===L.motor.p){drawWheel(g,p[0],p[1],w[0],ph,MOTOR,{nohub:1});
        g.fillStyle='#7a2f12';g.beginPath();g.arc(p[0],p[1],10.5,0,6.3);g.fill();g.fillStyle=sol.jam?'#ff5a4a':'#ffe27a';g.beginPath();g.arc(p[0],p[1],8.5,0,6.3);g.fill();
        g.fillStyle='#7a2f12';g.beginPath();g.moveTo(p[0]+1.5,p[1]-6.5);g.lineTo(p[0]-4,p[1]+1);g.lineTo(p[0]-.5,p[1]+1);g.lineTo(p[0]-1.5,p[1]+6.5);g.lineTo(p[0]+4,p[1]-1);g.lineTo(p[0]+.5,p[1]-1);g.fill()}
      else if(tset[i])drawWheel(g,p[0],p[1],w[0],ph,WOOD,{nohub:1});
      else if(cset[i])drawWheel(g,p[0],p[1],w[0],ph,CREAM,{nohub:1});
      else drawWheel(g,p[0],p[1],w[0],ph,STEEL,{bolts:1})}
    /* 벨트 풀리 */
    L.belts.forEach(function(B){[0,1].forEach(function(e){var q=P[B[e]],r=B[2+e];g.fillStyle='#3a2a22';g.beginPath();g.arc(q[0],q[1],r+1.5,0,6.3);g.fill();
      g.fillStyle='#8a6a4a';g.beginPath();g.arc(q[0],q[1],r-2,0,6.3);g.fill();
      if(B[e]!==L.motor.p){g.strokeStyle='#3a2a22';g.lineWidth=2;var a2=S.phi[B[e]];g.beginPath();g.moveTo(q[0]-Math.cos(a2)*(r-2),q[1]-Math.sin(a2)*(r-2));g.lineTo(q[0]+Math.cos(a2)*(r-2),q[1]+Math.sin(a2)*(r-2));g.stroke()}})});
    /* 고양이 */
    L.cats.forEach(function(c,j){drawCat(g,P[c][0],P[c][1],sol.cat[j],S.phi[c],now)});
    /* 장난감과 화살표·속도계 */
    L.targets.forEach(function(t,j){p=P[t.p];var kk=L.base[t.p]||S.place[t.p],r=kk?wheels(kk)[0]*K:12,st=sol.tok[j],
        col=st===1?'#7dffa0':st===2?'#ff7a6a':st===0?'#ffe9a0':'#ffb85a';
      machine(g,p[0],p[1],t.kind,S.phi[t.p]+jit(t.p),st,now);
      arrow(g,p[0],p[1],Math.max(r+AD+6,22),t.dir,col,now,st!==1);
      if(t.lo)gauge(g,p[0],p[1]+Math.max(r+AD+6,22)+7,t,j,Math.abs(sol.w[t.p]))});
    /* 키보드 커서 */
    if(S.kb.on&&S.kb.mode===1&&!S.won){p=P[S.kb.peg];k=L.kinds[S.kb.slot];
      if(!S.place[S.kb.peg]&&S.tray[k]>0){g.globalAlpha=.5;drawKind(g,p[0],p[1],k,0);g.globalAlpha=1;
        g.strokeStyle=canPlace(L,S.place,S.kb.peg,k)?'#8dff9a':'#ff7a6a'}else g.strokeStyle='#fff';
      g.lineWidth=3;g.setLineDash([6,5]);g.lineDashOffset=now*20;g.beginPath();g.arc(p[0],p[1],(S.place[S.kb.peg]?wheels(S.place[S.kb.peg])[0]*K:14)+8,0,6.3);g.stroke();g.setLineDash([])}
    g.restore();
    /* 음표 */
    g.textAlign='center';g.font='17px Jua, system-ui, sans-serif';
    S.notes.forEach(function(n){g.globalAlpha=1-n.t/1.1;g.fillStyle=n.c?'#fff3a8':'#a8f0ff';g.fillText(n.c?'♪':'♫',n.x+Math.sin(n.t*6+n.x)*5,n.y-n.t*46)});g.globalAlpha=1;
    /* 받침대와 트레이 */
    drawBulbs(g,now);drawSteam(g,now);
    g.fillStyle='rgba(30,14,4,.4)';rr(g,60,510,252,90,14);g.fill();
    var tg=g.createLinearGradient(0,506,0,596);tg.addColorStop(0,'#5b3a20');tg.addColorStop(1,'#3f2613');g.fillStyle=tg;rr(g,60,506,252,90,14);g.fill();
    g.strokeStyle='rgba(255,220,160,.3)';g.lineWidth=1.5;rr(g,62,508,248,86,12);g.stroke();
    for(i=0;i<L.kinds.length;i++){k=L.kinds[i];var x=slotX(i),w2=wheels(k),cnt=S.tray[k],sel=S.kb.on&&S.kb.slot===i,sc=(10+w2[0]*.42)/(w2[0]*K);
      g.fillStyle=sel?'rgba(255,230,150,.28)':'rgba(255,255,255,.07)';rr(g,x-23,514,46,74,10);g.fill();
      if(sel){g.strokeStyle='#ffe27a';g.lineWidth=2;rr(g,x-23,514,46,74,10);g.stroke()}
      g.save();g.translate(x,TY-8);g.scale(sc,sc);g.globalAlpha=cnt>0?1:.25;drawKind(g,0,0,k,now*.4+i);g.restore();
      g.textAlign='center';g.font='12px Jua, system-ui, sans-serif';g.fillStyle=cnt>0?'#fff1c9':'rgba(255,241,201,.4)';g.fillText(w2.join('·'),x,584);
      if(cnt>0){g.fillStyle='#ffe27a';g.beginPath();g.arc(x+15,523,8.5,0,6.3);g.fill();g.fillStyle='#4a2a10';g.font='12px Jua, system-ui, sans-serif';g.fillText(cnt,x+15,527.5)}}
    drawMouse(g,31,566,now);
    if(S.kb.on&&!S.won){g.textAlign='center';g.font='11px Jua, system-ui, sans-serif';g.fillStyle='rgba(255,241,201,.8)';
      g.fillText(S.kb.mode===0?tx('←→ 고르기 · 스페이스 집기','←→ choose · Space pick up'):tx('방향키/탭 이동 · 스페이스 끼우기·빼기','Arrows/Tab move · Space place/remove'),186,612)}
    /* 드래그 중인 톱니 */
    if(S.drag){var d=S.drag,gx=d.x,gy=d.y-d.lift;
      if(d.snap>=0){p=P[d.snap];var okp=canPlace(L,S.place,d.snap,d.kind);g.globalAlpha=.45;drawKind(g,p[0],p[1],d.kind,0);g.globalAlpha=1;
        g.strokeStyle=okp?'#8dff9a':'#ff7a6a';g.lineWidth=3;g.beginPath();g.arc(p[0],p[1],wheels(d.kind)[0]*K+8,0,6.3);g.stroke()}
      g.globalAlpha=.92;drawKind(g,gx,gy,d.kind,now*.6);g.globalAlpha=1}
    if(S.won){g.textAlign='center';g.font='26px Jua, system-ui, sans-serif';var sc2=1+.08*Math.sin(now*10);g.save();g.translate(180,104);g.scale(sc2,sc2);
      g.fillStyle='rgba(10,20,44,.5)';g.fillText(tx('돌아간다!','It works!'),1.5,2.5);g.fillStyle='#fff3a8';g.fillText(tx('돌아간다!','It works!'),0,0);g.restore()}
  }

  window.__gearUp=function(){return {S:S,core:CORE}};
  SG.run({id:'gear-up',title:{ko:'톱니 공방',en:'Gear Up'},
    how:{ko:'톱니바퀴를 못에 끌어다 끼워 모터와 장난감을 이어요. 화살표 방향과 속도계를 맞추면 오르골이 노래해요!',
         en:'Drag gears onto the pegs to link the motor to the toy. Match the arrow and the gauge and the music box sings!'},
    init:init,update:update,draw:draw});
})();
