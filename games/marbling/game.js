/* 물결 마블링 — 물 위에 잉크를 떨어뜨리고 갈퀴로 끌어 목표 무늬를 똑같이 찍어 내는 퍼즐.
   잉크는 점으로 된 다각형이고, 모든 조작(방울·갈퀴·빗·소용돌이)은 기존 점 전체에 적용되는
   매끄럽고 되돌릴 수 있는 기하 변환이다(수학적 마블링 모델). 엔진은 DOM 없이 돈다(node 검증용). */
(function(){
  'use strict';
  /* ================= 엔진 ================= */
  var TRAY=300,GS=30,Z=50,HALF=22,U=Math.pow(.5,1/HALF),ZC=44,UC=Math.pow(.5,1/8),CSP=60,VA=2.2,VHALF=46,VU=Math.pow(.5,1/VHALF),
      MAXSEG=2.4,MINSEG=.45,RN=72;
  var PAL=['#27407a','#d2452f','#e8a92e','#2b8c84','#7b3b7a','#2b2724','#e889a0','#f7f0e0','#6f9c3a','#86b8d8','#e9e3d3'];
  var S2=Math.SQRT1_2,DIR8=[[1,0],[S2,S2],[0,1],[-S2,S2],[-1,0],[-S2,-S2],[0,-1],[S2,-S2]];
  function dirOf(op){if(op.a!=null)return DIR8[op.a];var l=Math.sqrt(op.dx*op.dx+op.dy*op.dy);return [op.dx/l,op.dy/l]}
  /* 조작 하나를 점 변환 함수로. t(0..1)은 애니메이션용 세기 */
  function opMap(op,t){
    if(t==null)t=1;
    if(op.k==='d'){var cx=op.x,cy=op.y,r2=op.r*t*op.r*t;
      return function(x,y,o){var dx=x-cx,dy=y-cy,q=dx*dx+dy*dy;if(q<1e-12){dx=1e-6;dy=0;q=1e-12}
        var s=Math.sqrt(1+r2/q);o[0]=cx+dx*s;o[1]=cy+dy*s}}
    if(op.k==='t'||op.k==='c'){var m=dirOf(op),mx=m[0],my=m[1],nx=-my,ny=mx,comb=op.k==='c',z=(comb?ZC:Z)*t,bx=op.x,by=op.y;
      return function(x,y,o){var s=(x-bx)*nx+(y-by)*ny,dsp;
        if(!comb)dsp=z*Math.pow(U,Math.abs(s));
        else{var k0=Math.round(s/CSP);dsp=0;for(var k=k0-2;k<=k0+2;k++)dsp+=z*Math.pow(UC,Math.abs(s-k*CSP))}
        o[0]=x+mx*dsp;o[1]=y+my*dsp}}
    if(op.k==='s'){var sx=op.x,sy=op.y,va=VA*t*(op.cw===false?-1:1);
      return function(x,y,o){var dx=x-sx,dy=y-sy,d=Math.sqrt(dx*dx+dy*dy),th=va*Math.pow(VU,d),c=Math.cos(th),s=Math.sin(th);
        o[0]=sx+dx*c-dy*s;o[1]=sy+dx*s+dy*c}}
    return function(x,y,o){o[0]=x;o[1]=y}}
  function circle(cx,cy,r){var n=Math.max(64,Math.ceil(2*Math.PI*r/1.6)),p=new Array(n*2);
    for(var i=0;i<n;i++){var a=i/n*Math.PI*2;p[2*i]=cx+Math.cos(a)*r;p[2*i+1]=cy+Math.sin(a)*r}return p}
  function far(ax,ay,bx,by){var M=60;return (ax<-M&&bx<-M)||(ax>TRAY+M&&bx>TRAY+M)||(ay<-M&&by<-M)||(ay>TRAY+M&&by>TRAY+M)}
  function refine(f,ax,ay,bx,by,qax,qay,qbx,qby,out,dep){
    var dx=qbx-qax,dy=qby-qay;if(dx*dx+dy*dy<=MAXSEG*MAXSEG||dep>8||far(qax,qay,qbx,qby))return;
    var mx=(ax+bx)/2,my=(ay+by)/2,o=[0,0];f(mx,my,o);var ox=o[0],oy=o[1];
    refine(f,ax,ay,mx,my,qax,qay,ox,oy,out,dep+1);out.push(ox,oy);refine(f,mx,my,bx,by,ox,oy,qbx,qby,out,dep+1)}
  function emptyState(ground){return {ground:ground,polys:[]}}
  function applyOp(st,op,t){
    if(t==null)t=1;var f=opMap(op,t),o=[0,0],polys=[],pi,i;
    for(pi=0;pi<st.polys.length;pi++){var P=st.polys[pi],a=P.p,n=a.length/2,q=new Array(n*2);
      for(i=0;i<n;i++){f(a[2*i],a[2*i+1],o);q[2*i]=o[0];q[2*i+1]=o[1]}
      var out=[];
      for(i=0;i<n;i++){var j=(i+1)%n;out.push(q[2*i],q[2*i+1]);
        refine(f,a[2*i],a[2*i+1],a[2*j],a[2*j+1],q[2*i],q[2*i+1],q[2*j],q[2*j+1],out,0)}
      var d=[out[0],out[1]],lx=out[0],ly=out[1];
      for(i=2;i<out.length;i+=2){var ex=out[i]-lx,ey=out[i+1]-ly;
        if(ex*ex+ey*ey>=MINSEG*MINSEG){d.push(out[i],out[i+1]);lx=out[i];ly=out[i+1]}}
      polys.push({c:P.c,p:d})}
    if(op.k==='d'&&op.r*t>.5)polys.push({c:op.c,p:circle(op.x,op.y,op.r*t)});
    return {ground:st.ground,polys:polys}}
  function runOps(ground,ops){var st=emptyState(ground);for(var i=0;i<ops.length;i++)st=applyOp(st,ops[i]);return st}
  function area(p){var s=0,n=p.length/2;for(var i=0;i<n;i++){var j=(i+1)%n;s+=p[2*i]*p[2*j+1]-p[2*j]*p[2*i+1]}return s/2}
  /* 래스터: 각 칸 중심이 어느 잉크(나중 것이 위)에 속하는지 */
  function raster(st,N){N=N||RN;var g=new Int8Array(N*N),sc=N/TRAY,pi,i,j;g.fill(st.ground);
    for(pi=0;pi<st.polys.length;pi++){var P=st.polys[pi],p=P.p,n=p.length/2,rows=[];
      for(i=0;i<n;i++){var k=(i+1)%n,x0=p[2*i]*sc,y0=p[2*i+1]*sc,x1=p[2*k]*sc,y1=p[2*k+1]*sc;
        if(y0===y1)continue;var lo=Math.min(y0,y1),hi=Math.max(y0,y1),ja=Math.max(0,Math.ceil(lo-.5)),jb=Math.min(N-1,Math.ceil(hi-.5)-1);
        for(j=ja;j<=jb;j++){var yc=j+.5;(rows[j]||(rows[j]=[])).push(x0+(yc-y0)*(x1-x0)/(y1-y0))}}
      for(j=0;j<N;j++){var r=rows[j];if(!r)continue;r.sort(function(a,b){return a-b});
        for(i=0;i+1<r.length;i+=2){var xa=Math.max(0,Math.ceil(r[i]-.5)),xb=Math.min(N-1,Math.ceil(r[i+1]-.5)-1);
          for(var x=xa;x<=xb;x++)g[j*N+x]=P.c}}}
    return g}
  function nb(G,N,x,y,c){for(var yy=Math.max(0,y-1);yy<=Math.min(N-1,y+1);yy++)for(var xx=Math.max(0,x-1);xx<=Math.min(N-1,x+1);xx++)if(G[yy*N+xx]===c)return true;return false}
  /* 일치도: 둘 중 하나라도 잉크가 있는 칸만 센다(빈 판은 0%). 같은 색 1점, 바로 옆 같은 색 0.5점. 전체 평균과 색깔별 평균을 반반 */
  function similarity(A,B,ground,N){N=N||RN;var u=0,s=0,cu={},cs={};
    function add(c,v){if(c===ground)return;cu[c]=(cu[c]||0)+1;cs[c]=(cs[c]||0)+v}
    for(var y=0;y<N;y++)for(var x=0;x<N;x++){var i=y*N+x,a=A[i],b=B[i];if(a===ground&&b===ground)continue;u++;
      var v=a===b?1:(nb(A,N,x,y,b)||nb(B,N,x,y,a))?.5:0;s+=v;add(a,v);if(b!==a)add(b,v)}
    if(!u)return 100;var m=0,k=0;for(var c in cu){m+=cs[c]/cu[c];k++}
    return (s/u*.5+m/k*.5)*100}
  function coverage(G,ground){var c=0;for(var i=0;i<G.length;i++)if(G[i]!==ground)c++;return c/G.length}
  /* 스냅: 격자 30 간격(30..270). 갈퀴는 시작점을 격자에, 방향은 45도 근처면 45도 단위로 */
  function snapV(v){return Math.max(1,Math.min(9,Math.round(v/GS)))*GS}
  function snapPt(x,y){return [snapV(x),snapV(y)]}
  function dragOp(kind,x0,y0,x1,y1){var s=snapPt(x0,y0),dx=x1-x0,dy=y1-y0,ang=Math.atan2(dy,dx),q=ang/(Math.PI/4),a8=Math.round(q);
    if(kind==='c'){var a4=((Math.round(ang/(Math.PI/2))%4)+4)%4;return {k:'c',x:s[0],y:s[1],a:a4*2}}
    if(Math.abs(q-a8)*45<14)return {k:'t',x:s[0],y:s[1],a:((a8%8)+8)%8};
    var l=Math.sqrt(dx*dx+dy*dy);return {k:'t',x:s[0],y:s[1],dx:Math.round(dx/l*1000)/1000,dy:Math.round(dy/l*1000)/1000}}
  function rng(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}

  /* ---------- 디자인 ---------- */
  function D(x,y,r,c){return {k:'d',x:x,y:y,r:r,c:c}}
  function T(x,y,a){return {k:'t',x:x,y:y,a:a}}
  function C(x,y,a){return {k:'c',x:x,y:y,a:a}}
  function V(x,y){return {k:'s',x:x,y:y}}
  var HAND=[
    {n:{ko:'첫 방울',en:'First Drop'},g:10,ops:[D(150,150,70,1)],
     hint:{ko:'물 위에 잉크를 떨어뜨려요 — 가운데를 톡!',en:'Drop ink onto the water — tap the centre!'}},
    {n:{ko:'과녁',en:'Bullseye'},g:10,ops:[D(150,150,60,0),D(150,150,45,2),D(150,150,30,1)],
     hint:{ko:'같은 자리에 또 떨어뜨리면 고리가 생겨요',en:'Drop on the same spot again to make rings'}},
    {n:{ko:'불꽃',en:'Flame'},g:10,ops:[D(150,270,96,0),D(150,270,74,2),D(150,270,52,1),D(150,270,30,7),T(150,240,6)],
     hint:{ko:'고리 위를 아래에서 위로 쭉 끌어요',en:'Drag straight up through the rings'}},
    {n:{ko:'하트',en:'Heart'},g:10,ops:[D(150,120,62,6),D(150,120,32,1),T(150,60,2)],
     hint:{ko:'원 한가운데를 세로로 끌면 하트가 돼요',en:'Pull down through the middle of a circle for a heart'}},
    {n:{ko:'물결',en:'Waves'},g:10,ops:[D(60,150,42,3),D(150,150,42,2),D(240,150,42,3),C(150,60,2)],
     hint:{ko:'빗을 고르고 끌면 갈퀴 여러 개가 함께 지나가요',en:'Pick the comb and drag: many tines pull at once'}},
    {n:{ko:'겹화살',en:'Double Arrow'},g:10,ops:[D(150,150,70,4),D(150,150,50,7),D(150,150,30,2),T(120,60,2),T(180,240,6)],
     hint:{ko:'왼쪽 선은 아래로, 오른쪽 선은 위로',en:'Left line down, right line up'}},
    {n:{ko:'꽃',en:'Flower'},g:0,ops:[D(150,90,28,7),D(210,150,28,6),D(150,210,28,7),D(90,150,28,6),D(150,150,40,2),V(150,150)],
     hint:{ko:'소용돌이 도구로 가운데를 톡 — 빙글 감겨요',en:'Swirl tool, tap the centre — it curls'}},
    {n:{ko:'튤립',en:'Tulip'},g:10,ops:[D(150,180,64,8),D(150,180,44,1),D(150,180,24,2),T(150,240,6)]},
    {n:{ko:'쌍하트',en:'Twin Hearts'},g:10,ops:[D(90,120,46,6),D(210,120,46,4),T(90,60,2),T(210,60,2)]},
    {n:{ko:'달팽이',en:'Snail'},g:10,ops:[D(150,150,74,3),D(150,150,54,7),D(150,150,34,1),V(120,150),V(180,150)]},
    {n:{ko:'공작 깃',en:'Peacock'},g:7,ops:[D(60,150,36,0),D(150,150,36,3),D(240,150,36,0),D(150,150,20,2),C(150,60,2),C(120,240,6)]},
    {n:{ko:'잎사귀',en:'Leaf'},g:10,ops:[D(150,150,72,8),D(150,150,42,2),T(150,150,1),T(120,180,5)]}
  ];
  var NAMES=[{ko:'바람',en:'Breeze'},{ko:'달무리',en:'Moon Halo'},{ko:'파도',en:'Surf'},{ko:'불꽃',en:'Flame'},{ko:'깃털',en:'Feather'},
    {ko:'구름',en:'Cloud'},{ko:'노을',en:'Sunset'},{ko:'연못',en:'Pond'},{ko:'매듭',en:'Knot'},{ko:'새벽',en:'Dawn'},{ko:'씨앗',en:'Seed'},{ko:'별똥',en:'Comet'}];
  function budgetOf(ops){var b={drops:[],t:0,c:0,s:0};ops.forEach(function(o){if(o.k==='d')b.drops.push({c:o.c,r:o.r});else b[o.k]++});return b}
  function finalize(L,idx){L.idx=idx;L.target=runOps(L.g,L.ops);L.raster=raster(L.target);L.budget=budgetOf(L.ops);
    if(L.extra)L.budget[L.extra]++;L.thr=idx<6?80:85;L.grid=idx<6;return L}
  function dropOutScore(L,i){var ops=L.ops.slice(0,i).concat(L.ops.slice(i+1));return similarity(L.raster,raster(runOps(L.g,ops)),L.g)}
  function pick(R,a){return a[Math.floor(R()*a.length)]}
  function genOps(R,kind){
    var ground=R()<.75?10:(R()<.5?7:0),inks=ground===0?[7,2,6,9,1,3]:ground===7?[0,1,3,4,5,2]:[0,1,2,3,4,6,8,5];
    var ops=[],i,last=-1;
    function col(){var c;do{c=pick(R,inks)}while(c===last);last=c;return c}
    if(kind===0){var cx=GS*(4+Math.floor(R()*3)),cy=GS*(4+Math.floor(R()*3)),k=2+Math.floor(R()*3),r=56+Math.floor(R()*16);
      for(i=0;i<k;i++){ops.push(D(cx,cy,r,col()));r=Math.round(r*.72)}
      var a=Math.floor(R()*8),off=pick(R,[0,0,30,-30]),m=DIR8[a],px=Math.round(-m[1]),py=Math.round(m[0]);
      ops.push(T(snapV(cx+px*off),snapV(cy+py*off),a));
      if(R()<.5){var off2=off+pick(R,[60,-60,30,-30]);ops.push(T(snapV(cx+px*off2),snapV(cy+py*off2),R()<.6?(a+4)%8:a))}}
    else if(kind===1){var row=GS*(3+Math.floor(R()*5)),n=2+Math.floor(R()*3),x0=150-(n-1)*45,rr=34+Math.floor(R()*10);
      for(i=0;i<n;i++)ops.push(D(snapV(x0+i*90*(n>2?.75:1)),row,rr,col()));
      if(R()<.4)ops.push(D(150,row,rr-6,col()));
      var va=R()<.5?2:6;ops.push(C(pick(R,[150,120]),60,va));
      if(R()<.35)ops.push(T(60,pick(R,[120,150,180]),R()<.5?0:4))}
    else if(kind===2){var fx=GS*(4+Math.floor(R()*3)),fy=GS*(4+Math.floor(R()*3)),pc=col(),pr=22+Math.floor(R()*8),
        pts=R()<.5?[[0,-60],[60,0],[0,60],[-60,0]]:[[-60,-60],[60,-60],[60,60],[-60,60]];
      pts.forEach(function(p){ops.push(D(fx+p[0],fy+p[1],pr,pc))});last=pc;
      ops.push(D(fx,fy,34+Math.floor(R()*12),col()));
      if(R()<.5)ops.push(D(fx,fy,20,col()));
      var sw=V(fx,fy);if(R()<.4)sw.cw=false;ops.push(sw);
      if(R()<.3)ops.push(T(fx,60,2))}
    else if(kind===3){var vx=R()<.5,hx=GS*(3+Math.floor(R()*5)),hy=GS*(2+Math.floor(R()*2)),r1=40+Math.floor(R()*12),gap=90+Math.floor(R()*3)*30;
      var A=vx?[hx,hy]:[hy,hx],B=vx?[hx,Math.min(240,hy+gap)]:[Math.min(240,hy+gap),hx];
      ops.push(D(A[0],A[1],r1,col()));if(R()<.5)ops.push(D(A[0],A[1],Math.round(r1*.55),col()));
      ops.push(D(B[0],B[1],r1,col()));if(R()<.5)ops.push(D(B[0],B[1],Math.round(r1*.55),col()));
      var da=vx?(R()<.5?2:6):(R()<.5?0:4);ops.push(T(vx?hx:60,vx?60:hx,da))}
    else if(kind===4){var side=Math.floor(R()*4),e=[[150,270],[30,150],[150,30],[270,150]][side],ta=[6,0,2,4][side],nr=3+Math.floor(R()*2),rad=100;
      for(i=0;i<nr;i++){ops.push(D(e[0],e[1],rad,col()));rad-=24}
      var ofs=pick(R,[0,0,30,-30]);ops.push(T(side%2?60:150+ofs,side%2?150+ofs:60,ta));
      if(R()<.4)ops.push(T(side%2?60:150+ofs+pick(R,[60,-60]),side%2?150+ofs+pick(R,[60,-60]):60,ta))}
    else{var ox=GS*(4+Math.floor(R()*3)),oy=GS*(4+Math.floor(R()*3)),k5=3+Math.floor(R()*2),r5=70;
      for(i=0;i<k5;i++){ops.push(D(ox,oy,r5,col()));r5=Math.round(r5*.74)}
      var q=pick(R,[[30,0],[-30,0],[0,30],[0,-30],[30,30],[-30,-30]]),s5=V(ox+q[0],oy+q[1]);if(R()<.5)s5.cw=false;ops.push(s5);
      if(R()<.5){var s6=V(ox-q[0],oy-q[1]);s6.cw=s5.cw;ops.push(s6)}}
    return {g:ground,ops:ops}}
  function edgeInk(G,ground){var N=RN,c=0,t=0;for(var i=0;i<N;i++){[i,(N-1)*N+i,i*N,i*N+N-1].forEach(function(j){t++;if(G[j]!==ground)c++})}return c/t}
  function genLevel(idx,seed){var R=rng((seed*7919+idx*104729+17)>>>0),best=null;
    var kind=(idx*5+(seed%6))%6;
    for(var tries=0;tries<80;tries++){var o=genOps(R,tries<40?kind:Math.floor(R()*6)),L=finalize({n:pick(R,NAMES),g:o.g,ops:o.ops,gen:true},idx);
      var cov=coverage(L.raster,L.g);if(cov<.14||cov>.8||edgeInk(L.raster,L.g)>.04)continue;
      var ok=true;for(var i=0;i<L.ops.length&&ok;i++)if(dropOutScore(L,i)>=L.thr-2)ok=false;
      if(!ok){if(!best)best=L;continue}
      if(R()<.35){L.extra=pick(R,['t','t','c']);L.budget[L.extra]++}
      return L}
    return best||finalize({n:NAMES[0],g:10,ops:[D(150,150,60,1),D(150,150,36,0),T(150,60,2)],gen:true},idx)}
  function getLevel(idx,seed){if(idx<HAND.length){var h=HAND[idx];return finalize({n:h.n,g:h.g,ops:h.ops.slice(),hint:h.hint},idx)}
    return genLevel(idx,seed||1)}
  var E={TRAY:TRAY,GS:GS,PAL:PAL,DIR8:DIR8,HAND:HAND,RN:RN,opMap:opMap,applyOp:applyOp,runOps:runOps,emptyState:emptyState,
    raster:raster,similarity:similarity,coverage:coverage,area:area,snapPt:snapPt,snapV:snapV,dragOp:dragOp,
    getLevel:getLevel,genLevel:genLevel,budgetOf:budgetOf,dropOutScore:dropOutScore,Z:Z,U:U,circle:circle,rng:rng};
  if(typeof module!=='undefined'&&module.exports)module.exports=E;
  if(typeof window!=='undefined')window.__marbleEngine=E;
  if(typeof SG==='undefined')return;
  /* ================= 게임 ================= */
  var W=360,H=640,TX=30,TY=184,TS=300,CX=14,CY=38,CS=116;
  var lv,L,ops,states,anim,sim,simShown,time,streak,mode,modeT,tool,drag,prevDown,kb,crane,leaves,motes,ripples,hintA,
      trayCv=null,tgtCv=null,paperCv=null,trayDirty,printSim,newT,seed,warned,tG=0,active=false,keyQ=[],totalPass;
  if(!window.__marblingKeys){window.__marblingKeys=true;
    var KEYS=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyT','KeyC','KeyV','KeyZ','KeyP','Escape','Enter','KeyD','Backspace'];
    window.addEventListener('keydown',function(e){if(!active)return;var c=e.code;if(KEYS.indexOf(c)<0)return;
      if(e.repeat&&c.indexOf('Arrow')!==0)return;keyQ.push(c);if(c!=='Enter')e.preventDefault()})}
  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function ease(t){t=Math.max(0,Math.min(1,t));return 1-Math.pow(1-t,3)}
  function lerp(a,b,t){return a+(b-a)*t}
  function F(n){return n+'px Jua, system-ui, sans-serif'}
  function used(k){var n=0;for(var i=0;i<ops.length;i++)if(ops[i].k===k)n++;return n}
  function left(k){return k==='d'?L.budget.drops.length-used('d'):L.budget[k]-used(k)}
  function nextDrop(){return L.budget.drops[used('d')]}
  function cur(){return states[states.length-1]}
  function mk(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function shade(hex,f){var n=parseInt(hex.slice(1),16),r=n>>16,gg=n>>8&255,b=n&255;
    function c(v){return Math.max(0,Math.min(255,Math.round(f<0?v*(1+f):v+(255-v)*f)))}return 'rgb('+c(r)+','+c(gg)+','+c(b)+')'}
  function renderState(c,st,size){var g=c.getContext('2d'),s=size/TS;g.save();g.setTransform(1,0,0,1,0,0);
    g.fillStyle=E.PAL[st.ground];g.fillRect(0,0,c.width,c.height);g.scale(s,s);g.lineJoin='round';
    for(var i=0;i<st.polys.length;i++){var P=st.polys[i],p=P.p;g.beginPath();g.moveTo(p[0],p[1]);
      for(var j=2;j<p.length;j+=2)g.lineTo(p[j],p[j+1]);g.closePath();g.fillStyle=E.PAL[P.c];g.fill();
      g.strokeStyle=shade(E.PAL[P.c],.35);g.globalAlpha=.55;g.lineWidth=1.6/s*(size/TS);g.stroke();g.globalAlpha=1}
    g.restore()}
  function makePaper(){paperCv=mk(TS,TS);var p=paperCv.getContext('2d'),i;p.fillStyle='#fbf6ea';p.fillRect(0,0,TS,TS);
    for(i=0;i<900;i++){p.strokeStyle=hash(i)>.5?'rgba(170,140,100,.10)':'rgba(255,255,255,.5)';p.lineWidth=.6+hash(i+.2);
      var x=hash(i+.3)*TS,y=hash(i+.7)*TS,a=hash(i+.9)*6.28,l=3+hash(i+.4)*9;p.beginPath();p.moveTo(x,y);
      p.quadraticCurveTo(x+Math.cos(a)*l*.6+2,y+Math.sin(a)*l*.6,x+Math.cos(a)*l,y+Math.sin(a)*l);p.stroke()}}
  function load(n){lv=n;L=E.getLevel(n,seed);ops=[];states=[E.emptyState(L.g)];anim=null;sim=0;simShown=0;tool='d';drag=null;
    kb.mode=null;hintA=L.hint?1:0;trayDirty=true;mode='play';modeT=0;ripples=[];newT=0;
    if(!tgtCv)tgtCv=mk(104,104);renderState(tgtCv,L.target,104)}
  function init(a){
    seed=1+Math.floor(Math.random()*1e6);time=55;streak=0;totalPass=0;prevDown=true;warned=0;active=false;keyQ.length=0;
    kb={on:false,gx:5,gy:5,mode:null,sx:5,sy:5};crane={blink:2,nod:0,mood:null,moodT:0};
    leaves=[];for(var i=0;i<6;i++)leaves.push(newLeaf(i,true));
    motes=[];for(i=0;i<18;i++)motes.push({x:hash(i+20)*W,y:40+hash(i+40)*150,p:hash(i+60)*6.28,v:4+hash(i+80)*6});
    if(!trayCv)trayCv=mk(TS,TS);if(!paperCv)makePaper();load(0)}
  function newLeaf(i,init){var c=['#d98b3a','#c9603a','#e2b04a','#9fae4e'][Math.floor(hash(i*3.7+tG)*4)];
    return {x:init?hash(i+1.3)*W:W+20,y:init?hash(i+2.1)*500:-20-hash(i+tG)*80,vx:-14-hash(i+5)*12,vy:16+hash(i+7)*12,r:hash(i)*6,vr:(hash(i+9)-.5)*1.6,s:.7+hash(i+11)*.6,c:c,ph:hash(i+13)*6}}

  function simNow(){return E.similarity(L.raster,E.raster(cur()),L.g)}
  function addOp(op,a){ops.push(op);var base=cur();states.push(E.applyOp(base,op));anim={op:op,base:base,t:0};sim=simNow();
    trayDirty=true;crane.nod=1;if(L.hint)hintA=Math.min(hintA,.99);
    var sx=TX+op.x,sy=TY+op.y;
    if(op.k==='d'){ripples.push({x:sx,y:sy,t:0,r:op.r});a.beep(1250,.035,'sine');setTimeout(function(){a.beep(620,.08,'sine')},35);a.beep(180,.06,'triangle')}
    else if(op.k==='s'){ripples.push({x:sx,y:sy,t:0,r:40,sw:1});[392,494,587,740].forEach(function(f,i){setTimeout(function(){a.beep(f,.07,'sine')},i*45)})}
    else{[260,340,430].forEach(function(f,i){setTimeout(function(){a.beep(f*(op.k==='c'?.8:1),.07,'triangle')},i*40)})}
    if(sim>=L.thr&&simShown<L.thr)setTimeout(function(){a.beep(1568,.08,'sine')},180)}
  function say(a,x,y,ko,en,col){a.pop(x,y,a.lang==='ko'?ko:en,col||'#fff3c4');a.beep(200,.09,'triangle')}
  function tryDrop(a,x,y){var nd=nextDrop();if(!nd){say(a,TX+x,TY+y-20,'잉크를 다 썼어요','Out of ink');return}
    var s=E.snapPt(x,y);addOp({k:'d',x:s[0],y:s[1],r:nd.r,c:nd.c},a)}
  function trySwirl(a,x,y){if(left('s')<=0){say(a,TX+x,TY+y-20,'소용돌이 없음','No swirls left');return}
    var s=E.snapPt(x,y);addOp({k:'s',x:s[0],y:s[1]},a);tool='d'}
  function tryLine(a,kind,x0,y0,x1,y1){if(left(kind)<=0){say(a,TX+x1,TY+y1-20,kind==='c'?'빗이 없어요':'갈퀴를 다 썼어요',kind==='c'?'No combs left':'No tines left');return}
    addOp(E.dragOp(kind,x0,y0,x1,y1),a);if(kind==='c')tool='d'}
  function undo(a){if(mode!=='play'||!ops.length){a.beep(160,.06,'square');return}ops.pop();states.pop();anim=null;sim=ops.length?simNow():0;trayDirty=true;
    a.beep(520,.05,'square');setTimeout(function(){a.beep(390,.06,'square')},50)}
  function doPrint(a){if(mode!=='play')return;anim=null;trayDirty=true;drag=null;kb.mode=null;printSim=ops.length?simNow():0;mode='print';modeT=0;
    a.beep(330,.08,'triangle');crane.nod=1}

  /* ---------- 버튼 배치 ---------- */
  function buttons(){var b=[],i,n=L.budget.drops.length,pw=Math.min(40,232/Math.max(1,n));
    for(i=0;i<n;i++)b.push({k:'pot',i:i,x:20+i*pw,y:500,w:pw-2,h:46});
    b.push({k:'undo',x:272,y:503,w:40,h:40});
    var x=18;['t','c','s'].forEach(function(t){if(L.budget[t]>0){b.push({k:'tool',t:t,x:x,y:552,w:68,h:40});x+=72}});
    b.push({k:'print',x:236,y:552,w:76,h:40});return b}
  function hit(x,y){var b=buttons();for(var i=0;i<b.length;i++){var o=b[i];if(x>=o.x-2&&x<=o.x+o.w+2&&y>=o.y-2&&y<=o.y+o.h+2)return o}return null}
  function press(o,a){if(o.k==='undo')undo(a);else if(o.k==='print')doPrint(a);
    else if(o.k==='pot'){tool='d';a.beep(880,.03,'sine')}
    else if(o.k==='tool'){if(o.t==='t'){tool='d';say(a,o.x+34,o.y-6,'물 위를 끌어요','Drag on the water')}
      else if(left(o.t)<=0)say(a,o.x+34,o.y-6,'다 썼어요','None left');else{tool=tool===o.t?'d':o.t;a.beep(740,.04,'sine')}}}

  function update(dt,inp,a){
    active=true;tG+=dt;var i,ko=a.lang==='ko';
    /* 배경 */
    for(i=0;i<leaves.length;i++){var lf=leaves[i];lf.x+=(lf.vx+Math.sin(tG*1.3+lf.ph)*10)*dt;lf.y+=lf.vy*dt;lf.r+=lf.vr*dt;
      if(lf.y>H+20||lf.x<-30)leaves[i]=newLeaf(i+Math.floor(tG*10),false)}
    crane.blink-=dt;if(crane.blink<-.13)crane.blink=2+Math.random()*2.5;crane.nod=Math.max(0,crane.nod-dt*2.6);crane.moodT-=dt;
    for(i=ripples.length-1;i>=0;i--){ripples[i].t+=dt;if(ripples[i].t>1.1)ripples.splice(i,1)}
    simShown+=(sim-simShown)*Math.min(1,dt*7);newT+=dt;
    if(anim){anim.t+=dt/(anim.op.k==='d'?.38:.45);trayDirty=true;if(anim.t>=1)anim=null}
    if(hintA<1&&hintA>0)hintA=Math.max(0,hintA-dt*1.5);
    /* 시간 */
    if(mode==='play'){time-=dt;if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(880,.04,'square')}
      if(time<=0){time=0;active=false;a.over();return}}
    /* 포인터 */
    var fresh=inp.down&&!prevDown,rel=!inp.down&&prevDown;prevDown=inp.down;
    if(fresh&&inp.x!=null){kb.on=false;var o=hit(inp.x,inp.y);
      if(o){if(mode==='play'||o.k==='undo')press(o,a)}
      else if(mode==='play'&&inp.x>TX-8&&inp.x<TX+TS+8&&inp.y>TY-8&&inp.y<TY+TS+8)drag={x0:inp.x-TX,y0:inp.y-TY,x:inp.x-TX,y:inp.y-TY,moved:false}}
    if(drag&&inp.down&&inp.x!=null){drag.x=inp.x-TX;drag.y=inp.y-TY;if(Math.hypot(drag.x-drag.x0,drag.y-drag.y0)>16)drag.moved=true}
    if(drag&&rel){var d=drag;drag=null;if(mode==='play'){
      if(!d.moved){if(tool==='s')trySwirl(a,d.x0,d.y0);else if(tool==='c')say(a,TX+d.x0,TY+d.y0-20,'빗은 끌어서 써요','Drag to comb');else tryDrop(a,d.x0,d.y0)}
      else if(tool==='c')tryLine(a,'c',d.x0,d.y0,d.x,d.y);
      else if(tool==='s')trySwirl(a,d.x,d.y);
      else if(left('t')>0)tryLine(a,'t',d.x0,d.y0,d.x,d.y);
      else if(left('d')>0)tryDrop(a,d.x,d.y);
      else say(a,TX+d.x,TY+d.y-20,'갈퀴를 다 썼어요','No tines left')}}
    /* 키보드 */
    while(keyQ.length){var c=keyQ.shift();kb.on=true;
      if(c==='ArrowLeft')kb.gx=Math.max(1,kb.gx-1);else if(c==='ArrowRight')kb.gx=Math.min(9,kb.gx+1);
      else if(c==='ArrowUp')kb.gy=Math.max(1,kb.gy-1);else if(c==='ArrowDown')kb.gy=Math.min(9,kb.gy+1);
      else if(c==='KeyZ'||c==='Backspace')undo(a);
      else if(mode!=='play')continue;
      else if(c==='KeyP'||c==='Enter')doPrint(a);
      else if(c==='Escape'){kb.mode=null;tool='d'}
      else if(c==='KeyD'){kb.mode=null;tool='d'}
      else if(c==='KeyV')trySwirl(a,kb.gx*30,kb.gy*30);
      else if(c==='KeyT'||c==='KeyC'){var m=c==='KeyT'?'t':'c';if(kb.mode===m)kb.mode=null;
        else if(left(m)<=0)say(a,TX+kb.gx*30,TY+kb.gy*30-20,m==='c'?'빗이 없어요':'갈퀴를 다 썼어요',m==='c'?'No combs left':'No tines left');
        else{kb.mode=m;kb.sx=kb.gx;kb.sy=kb.gy;a.beep(660,.04,'sine')}}
      else if(c==='Space'){
        if(kb.mode){if(kb.sx===kb.gx&&kb.sy===kb.gy)say(a,TX+kb.gx*30,TY+kb.gy*30-20,'방향키로 끝점을 옮겨요','Move the end with arrows');
          else{tryLine(a,kb.mode,kb.sx*30,kb.sy*30,kb.gx*30,kb.gy*30);kb.mode=null}}
        else if(tool==='s')trySwirl(a,kb.gx*30,kb.gy*30);
        else if(left('d')>0)tryDrop(a,kb.gx*30,kb.gy*30);
        else if(left('t')>0){kb.mode='t';kb.sx=kb.gx;kb.sy=kb.gy;say(a,TX+kb.gx*30,TY+kb.gy*30-20,'끝점으로 옮기고 Space','Move to the end, Space')}
        else say(a,TX+kb.gx*30,TY+kb.gy*30-20,'P로 인쇄','Press P to print')}}
    /* 인쇄 연출 */
    if(mode==='print'){var m0=modeT;modeT+=dt;
      if(m0<.45&&modeT>=.45){a.beep(150,.12,'sine');a.shake(2)}
      if(modeT>=1.35){var pass=printSim>=L.thr;
        if(pass){var unusedN=left('d')+left('t')+left('c')+left('s'),bonus=Math.round(Math.max(0,printSim-L.thr)),
            pts=10+bonus+unusedN*4+Math.min(15,streak*3);streak++;totalPass++;a.add(pts);time=Math.min(70,time+14);
          mode='done';modeT=0;crane.mood='happy';crane.moodT=1.6;a.sfx('win');
          ['#d2452f','#e8a92e','#2b8c84','#27407a','#e889a0'].forEach(function(cc){a.burst(W/2,TY+120,cc,8)});
          a.pop(W/2,TY+40,'+'+pts,'#ffe08a');if(streak>1)a.pop(W/2,TY+66,(ko?'연속 ':'Streak ')+streak,'#fff');
          a.tempo(1+Math.min(.4,totalPass*.03))}
        else{time=Math.max(0,time-3);streak=0;mode='fail';modeT=0;crane.mood='sad';crane.moodT=1.4;a.sfx('hit');a.shake(5);
          a.burst(W/2,TY+150,'#9a8f80',10);a.pop(W/2,TY+60,'-3s','#ff9a8a')}}}
    else if(mode==='done'){modeT+=dt;if(modeT>1.05)load(lv+1)}
    else if(mode==='fail'){modeT+=dt;if(modeT>1.2){mode='play';modeT=0}}
  }

  /* ---------- 그리기 ---------- */
  function refreshTray(){if(!trayDirty)return;trayDirty=false;
    var st=anim?E.applyOp(anim.base,anim.op,ease(anim.t)):cur();renderState(trayCv,st,TS)}
  function drawLeaf(g,l){g.save();g.translate(l.x,l.y);g.rotate(l.r);g.scale(l.s,l.s);g.fillStyle=l.c;g.globalAlpha=.85;
    g.beginPath();g.moveTo(-9,0);g.quadraticCurveTo(0,-7,9,0);g.quadraticCurveTo(0,7,-9,0);g.fill();
    g.strokeStyle='rgba(90,50,20,.45)';g.lineWidth=.8;g.beginPath();g.moveTo(-9,0);g.lineTo(11,0);g.stroke();g.restore()}
  function drawBack(g){
    var bg=g.createLinearGradient(0,0,0,180);bg.addColorStop(0,'#efe1c8');bg.addColorStop(1,'#dcc4a0');g.fillStyle=bg;g.fillRect(0,0,W,180);
    /* 벽 판자 무늬 */
    g.strokeStyle='rgba(150,110,70,.12)';g.lineWidth=1;for(var x=18;x<W;x+=46){g.beginPath();g.moveTo(x,0);g.lineTo(x,170);g.stroke()}
    /* 창문 */
    var wx=244,wy=34,ww=106,wh=118,sky=g.createLinearGradient(0,wy,0,wy+wh);sky.addColorStop(0,'#bfe0ef');sky.addColorStop(1,'#fbe9c6');
    g.fillStyle='rgba(80,50,30,.25)';g.fillRect(wx+3,wy+4,ww,wh);g.fillStyle=sky;g.fillRect(wx,wy,ww,wh);
    g.fillStyle='rgba(255,255,255,.7)';for(var k=0;k<2;k++){var cx=wx+((tG*5+k*60)%(ww+40))-20,cy=wy+24+k*30;
      g.beginPath();g.ellipse(cx,cy,14,5,0,0,7);g.ellipse(cx+9,cy-3,9,5,0,0,7);g.fill()}
    g.fillStyle='#8a9a52';g.beginPath();g.ellipse(wx+20,wy+wh-6,30,16,0,0,7);g.fill();g.fillStyle='#a5b45e';g.beginPath();g.ellipse(wx+80,wy+wh-2,34,14,0,0,7);g.fill();
    g.strokeStyle='#8b5a34';g.lineWidth=5;g.strokeRect(wx,wy,ww,wh);g.lineWidth=3;g.beginPath();g.moveTo(wx+ww/2,wy);g.lineTo(wx+ww/2,wy+wh);g.moveTo(wx,wy+wh/2);g.lineTo(wx+ww,wy+wh/2);g.stroke();
    g.fillStyle='#7a4c2a';g.fillRect(wx-6,wy+wh,ww+12,7);
    /* 햇살 */
    g.save();g.globalCompositeOperation='lighter';
    for(k=0;k<3;k++){var al=.05+.025*Math.sin(tG*.7+k*2);g.fillStyle='rgba(255,236,190,'+al+')';g.beginPath();
      g.moveTo(wx+10+k*30,wy+10);g.lineTo(wx+40+k*30,wy+10);g.lineTo(wx-120+k*40,520);g.lineTo(wx-190+k*40,520);g.closePath();g.fill()}
    g.restore();
    for(k=0;k<motes.length;k++){var m=motes[k],mx=(m.x-tG*m.v+W*4)%W,my=m.y+Math.sin(tG*.8+m.p)*8;g.fillStyle='rgba(255,250,230,'+(.25+.25*Math.sin(tG+m.p))+')';
      g.beginPath();g.arc(mx,my,1.3,0,7);g.fill()}}
  function drawTable(g){var tb=g.createLinearGradient(0,165,0,H);tb.addColorStop(0,'#9a6a42');tb.addColorStop(1,'#6d4529');g.fillStyle=tb;g.fillRect(0,165,W,H-165);
    g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,165,W,4);
    g.strokeStyle='rgba(50,25,10,.18)';g.lineWidth=1.2;for(var i=0;i<9;i++){var y=190+i*52;g.beginPath();g.moveTo(0,y);
      g.bezierCurveTo(90,y+8*Math.sin(i),220,y-9*Math.cos(i),W,y+4);g.stroke()}}
  function drawCrane(g,x,y){var c=crane,bob=Math.sin(tG*2.2)*1.2,nod=Math.sin(Math.min(1,c.nod)*Math.PI)*7,
      happy=c.mood==='happy'&&c.moodT>0,sad=c.mood==='sad'&&c.moodT>0;
    g.save();g.translate(x,y);g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(0,1,22,4,0,0,7);g.fill();
    g.strokeStyle='#3a3330';g.lineWidth=2.2;g.lineCap='round';g.beginPath();g.moveTo(-5,0);g.lineTo(-4,-22);g.moveTo(5,0);g.lineTo(3,-22);g.stroke();
    g.fillStyle='#2b2724';g.beginPath();g.moveTo(12,-36+bob*.3);g.quadraticCurveTo(32,-34,34,-22);g.quadraticCurveTo(24,-26,14,-24);g.fill();
    var bd=g.createRadialGradient(-4,-38,4,2,-32,24);bd.addColorStop(0,'#ffffff');bd.addColorStop(1,'#d8d2c8');g.fillStyle=bd;
    g.beginPath();g.ellipse(2,-31+bob*.3,21,13,-.15,0,7);g.fill();
    /* 앞치마 */
    g.fillStyle='#2f4a86';g.beginPath();g.moveTo(-14,-32);g.quadraticCurveTo(-6,-14,8,-20);g.lineTo(6,-28);g.closePath();g.fill();
    /* 날개 */
    g.save();g.translate(6,-34+bob*.3);g.rotate(happy?-.9+Math.sin(tG*14)*.25:sad?.25:0);g.fillStyle='#e9e4dc';g.beginPath();g.ellipse(8,0,15,8,.2,0,7);g.fill();
    g.fillStyle='#2b2724';g.beginPath();g.ellipse(19,3,6,4,.4,0,7);g.fill();g.restore();
    /* 목과 머리 */
    var hx=-17,hy=-66+nod+bob+(sad?7:0);g.strokeStyle='#f6f3ee';g.lineWidth=6;g.beginPath();g.moveTo(-10,-38+bob*.3);g.quadraticCurveTo(-24,-50,hx,hy+4);g.stroke();
    g.strokeStyle='#2b2724';g.lineWidth=4;g.beginPath();g.moveTo(-20,-50+bob*.5);g.quadraticCurveTo(-21,-56,hx,hy+5);g.stroke();
    g.fillStyle='#fbf8f2';g.beginPath();g.arc(hx,hy,8,0,7);g.fill();
    g.fillStyle='#d2452f';g.beginPath();g.arc(hx+1,hy-5,4.2,Math.PI,0);g.fill();
    g.fillStyle='#2f4a86';g.fillRect(hx-8,hy-3,16,3);g.beginPath();g.moveTo(hx+7,hy-2);g.lineTo(hx+14,hy-5+Math.sin(tG*4)*1.5);g.lineTo(hx+13,hy+1);g.fill();
    g.fillStyle='#c9a15a';g.beginPath();g.moveTo(hx-6,hy+1);g.lineTo(hx-23,hy+(sad?7:3));g.lineTo(hx-6,hy+4);g.closePath();g.fill();
    g.fillStyle='rgba(232,137,160,.55)';g.beginPath();g.arc(hx+1,hy+3,2.2,0,7);g.fill();
    g.strokeStyle='#2b2724';g.fillStyle='#2b2724';g.lineWidth=1.6;
    if(happy){g.beginPath();g.arc(hx-3,hy,2.4,Math.PI*1.1,Math.PI*1.9);g.stroke()}
    else if(crane.blink<0){g.beginPath();g.moveTo(hx-5.5,hy);g.lineTo(hx-1,hy);g.stroke()}
    else{g.beginPath();g.arc(hx-3,hy-.5,2,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(hx-3.6,hy-1.2,.7,0,7);g.fill()}
    if(sad){g.fillStyle='#7fc0e8';g.beginPath();g.moveTo(hx+9,hy-9);g.quadraticCurveTo(hx+13,hy-3,hx+9,hy-2);g.quadraticCurveTo(hx+6,hy-4,hx+9,hy-9);g.fill()}
    g.restore()}
  function drawTray(g,a){
    g.fillStyle='rgba(0,0,0,.28)';rr(g,TX-12+5,TY-12+8,TS+24,TS+24,10);g.fill();
    var fr=g.createLinearGradient(0,TY-12,0,TY+TS+12);fr.addColorStop(0,'#c08a55');fr.addColorStop(1,'#8a5a32');g.fillStyle=fr;rr(g,TX-12,TY-12,TS+24,TS+24,10);g.fill();
    g.strokeStyle='rgba(255,230,190,.35)';g.lineWidth=1.5;rr(g,TX-11,TY-11,TS+22,TS+22,9);g.stroke();
    refreshTray();var inkA=mode==='done'?1-ease(modeT/.5):1;
    g.fillStyle=E.PAL[L.g];g.fillRect(TX,TY,TS,TS);g.globalAlpha=inkA;g.drawImage(trayCv,TX,TY);g.globalAlpha=1;
    g.save();g.beginPath();g.rect(TX,TY,TS,TS);g.clip();
    /* 물빛 */
    g.globalCompositeOperation='lighter';
    for(var k=0;k<3;k++){var off=((tG*14+k*130)%520)-160,gr=g.createLinearGradient(TX+off,TY,TX+off+90,TY+120);
      gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,'rgba(255,255,255,.05)');gr.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=gr;g.beginPath();g.moveTo(TX+off,TY);g.lineTo(TX+off+70,TY);g.lineTo(TX+off-110,TY+TS);g.lineTo(TX+off-180,TY+TS);g.fill()}
    g.globalCompositeOperation='source-over';
    for(k=0;k<ripples.length;k++){var rp=ripples[k],e=ease(rp.t/1.1);g.strokeStyle='rgba(255,255,255,'+(.45*(1-e))+')';g.lineWidth=2;
      g.beginPath();if(rp.sw)g.arc(rp.x,rp.y,10+e*rp.r,e*6,e*6+4.5);else g.arc(rp.x,rp.y,rp.r*(.9+e*.6),0,7);g.stroke()}
    var vg=g.createRadialGradient(TX+TS/2,TY+TS/2,TS*.42,TX+TS/2,TY+TS/2,TS*.75);vg.addColorStop(0,'rgba(40,30,20,0)');vg.addColorStop(1,'rgba(40,30,20,.28)');
    g.fillStyle=vg;g.fillRect(TX,TY,TS,TS);
    /* 격자 */
    var dark=L.g===0||L.g===5;g.fillStyle=dark?'rgba(255,255,255,'+(L.grid?.4:.14)+')':'rgba(60,40,20,'+(L.grid?.3:.11)+')';
    for(var i=1;i<=9;i++)for(var j=1;j<=9;j++){g.beginPath();g.arc(TX+i*30,TY+j*30,i===5&&j===5?2.2:1.5,0,7);g.fill()}
    /* 가이드 */
    var ln=null;if(drag&&mode==='play'){
      if(drag.moved&&(tool==='c'||(tool!=='s'&&left('t')>0)))ln=E.dragOp(tool==='c'?'c':'t',drag.x0,drag.y0,drag.x,drag.y);
      else if(!drag.moved||left('t')<=0){var sp=E.snapPt(drag.moved?drag.x:drag.x0,drag.moved?drag.y:drag.y0);ghost(g,sp,dark)}}
    if(kb.on&&mode==='play'){if(kb.mode&&(kb.gx!==kb.sx||kb.gy!==kb.sy))ln=E.dragOp(kb.mode,kb.sx*30,kb.sy*30,kb.gx*30,kb.gy*30);
      else if(!kb.mode)ghost(g,[kb.gx*30,kb.gy*30],dark);
      var cx=TX+kb.gx*30,cy=TY+kb.gy*30,pl=1+Math.sin(tG*6)*.15;g.strokeStyle=dark?'#fff':'#3a2a1a';g.lineWidth=2;
      g.beginPath();g.arc(cx,cy,9*pl,0,7);g.moveTo(cx-15,cy);g.lineTo(cx-6,cy);g.moveTo(cx+6,cy);g.lineTo(cx+15,cy);g.moveTo(cx,cy-15);g.lineTo(cx,cy-6);g.moveTo(cx,cy+6);g.lineTo(cx,cy+15);g.stroke();
      if(kb.mode){g.fillStyle=dark?'#fff':'#3a2a1a';g.beginPath();g.arc(TX+kb.sx*30,TY+kb.sy*30,4,0,7);g.fill()}}
    if(ln)guide(g,ln,dark);
    g.restore();
    /* 붓 받침 장식: 틀 오른쪽 위에 놓인 붓 */
    g.save();g.translate(TX+TS-6,TY-14);g.rotate(-.18);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(-58,4,64,4);
    g.fillStyle='#d9b77a';g.fillRect(-60,-2,52,5);g.fillStyle='#3a2a1a';g.fillRect(-8,-3,6,7);
    g.fillStyle='#2b2724';g.beginPath();g.moveTo(-2,-3);g.quadraticCurveTo(10,1,-2,4);g.fill();g.restore()}
  function ghost(g,sp,dark){var nd=tool==='s'?null:nextDrop(),x=TX+sp[0],y=TY+sp[1];g.setLineDash([4,4]);g.lineWidth=2;
    if(nd){g.strokeStyle=E.PAL[nd.c];g.globalAlpha=.9;g.beginPath();g.arc(x,y,nd.r,0,7);g.stroke();g.globalAlpha=1}
    else if(tool==='s'){g.strokeStyle=dark?'#fff':'#3a2a1a';g.beginPath();g.arc(x,y,22,0,5);g.stroke()}
    g.setLineDash([]);g.fillStyle=dark?'#fff':'#3a2a1a';g.beginPath();g.arc(x,y,3,0,7);g.fill()}
  function guide(g,op,dark){var m=op.a!=null?E.DIR8[op.a]:[op.dx,op.dy],n=[-m[1],m[0]],ks=op.k==='c'?[-5,-4,-3,-2,-1,0,1,2,3,4,5]:[0];
    g.strokeStyle=dark?'rgba(255,255,255,.85)':'rgba(50,30,15,.75)';g.fillStyle=g.strokeStyle;g.lineWidth=2;g.setLineDash([7,6]);g.lineDashOffset=-tG*30;
    ks.forEach(function(k){var bx=TX+op.x+n[0]*k*60,by=TY+op.y+n[1]*k*60;g.beginPath();g.moveTo(bx-m[0]*450,by-m[1]*450);g.lineTo(bx+m[0]*450,by+m[1]*450);g.stroke()});
    g.setLineDash([]);
    ks.forEach(function(k){var bx=TX+op.x+n[0]*k*60,by=TY+op.y+n[1]*k*60;for(var s=-2;s<=2;s++){var px=bx+m[0]*(s*70+((tG*40)%70)),py=by+m[1]*(s*70+((tG*40)%70));
      g.beginPath();g.moveTo(px+m[0]*7,py+m[1]*7);g.lineTo(px-m[0]*5+n[0]*6,py-m[1]*5+n[1]*6);g.lineTo(px-m[0]*5-n[0]*6,py-m[1]*5-n[1]*6);g.fill()}});
    g.beginPath();g.arc(TX+op.x,TY+op.y,5,0,7);g.fill()}
  function drawCard(g,a){var ko=a.lang==='ko',bounce=newT<.5?Math.sin(newT/.5*Math.PI)*.06:0;
    g.save();g.translate(CX+CS/2,CY+CS/2);g.scale(1+bounce,1+bounce);g.rotate(-.025);
    g.fillStyle='rgba(0,0,0,.25)';g.fillRect(-CS/2+3,-CS/2+5,CS,CS);g.drawImage(paperCv,0,0,TS,TS,-CS/2,-CS/2,CS,CS);
    g.drawImage(tgtCv,-52,-52);g.globalCompositeOperation='multiply';g.globalAlpha=.5;g.drawImage(paperCv,0,0,TS,TS,-52,-52,104,104);g.globalAlpha=1;g.globalCompositeOperation='source-over';
    g.fillStyle='rgba(240,225,170,.75)';g.save();g.rotate(.1);g.fillRect(-20,-CS/2-6,40,13);g.restore();
    g.restore();
    /* 정보 */
    g.textAlign='left';g.fillStyle='#4a3020';g.font=F(16);g.fillText((lv+1)+'. '+L.n[a.lang],140,58);
    var s=Math.round(simShown),ok=simShown>=L.thr,tk=140+96*L.thr/100;g.font=F(13);g.fillStyle='#6b4a32';g.fillText((ko?'일치 ':'Match ')+(ops.length?s+'%':'—'),140,79);
    rr(g,140,85,96,11,5.5);g.fillStyle='rgba(90,60,40,.2)';g.fill();
    if(ops.length){g.save();rr(g,140,85,96,11,5.5);g.clip();var bw=96*Math.min(1,simShown/100);
      g.fillStyle=ok?'#4f9a4a':simShown>L.thr-15?'#e0a12e':'#c8573a';g.fillRect(140,85,bw,11);g.fillStyle='rgba(255,255,255,.3)';g.fillRect(140,85,bw,4);g.restore()}
    g.fillStyle='#4a3020';g.fillRect(tk-1,82,2,17);g.beginPath();g.moveTo(tk,99);g.lineTo(tk-4,104);g.lineTo(tk+4,104);g.fill();
    g.font=F(10.5);g.textAlign='center';g.fillStyle='#7a5a40';g.fillText((ko?'목표 ':'goal ')+L.thr+'%',Math.min(tk,212),114);
    var tw=96*Math.max(0,time)/70,lowT=time<10;g.textAlign='left';g.font=F(13);g.fillStyle=lowT?'#c0392b':'#6b4a32';g.fillText((ko?'시간 ':'Time ')+Math.ceil(time)+'s',140,131);
    rr(g,140,136,96,9,4.5);g.fillStyle='rgba(90,60,40,.2)';g.fill();rr(g,140,136,Math.max(4,tw),9,4.5);g.fillStyle=lowT&&Math.sin(tG*12)>0?'#e8553f':'#5a7fb5';g.fill();
    if(streak>1){g.fillStyle='#b5562e';g.font=F(12);g.textAlign='left';g.fillText((ko?'연속 ':'Streak ')+streak,140,160)}}
  function drawPot(g,o,i,a){var it=L.budget.drops[i],usedN=used('d'),isNext=i===usedN&&tool!=='s',isUsed=i<usedN,cx=o.x+o.w/2,by=o.y+40,lift=isNext?Math.sin(tG*4)*1.5-2:0;
    g.save();g.translate(0,lift);g.globalAlpha=isUsed?.45:1;
    g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(cx,by+2,15,4,0,0,7);g.fill();
    var pg=g.createLinearGradient(cx-15,0,cx+15,0);pg.addColorStop(0,'#cfc6b8');pg.addColorStop(.4,'#f4efe6');pg.addColorStop(1,'#b8ae9e');g.fillStyle=pg;
    g.beginPath();g.moveTo(cx-14,by-24);g.quadraticCurveTo(cx-17,by,cx-9,by);g.lineTo(cx+9,by);g.quadraticCurveTo(cx+17,by,cx+14,by-24);g.closePath();g.fill();
    g.fillStyle=isUsed?'#8a8070':E.PAL[it.c];g.beginPath();g.ellipse(cx,by-24,14,5,0,0,7);g.fill();
    g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=1;g.beginPath();g.ellipse(cx,by-24,14,5,0,0,7);g.stroke();
    if(!isUsed){var dr=4+it.r/100*9;g.fillStyle=E.PAL[it.c];g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1.5;g.beginPath();g.arc(cx,by-11,dr*.6,0,7);g.fill();g.stroke()}
    g.restore();
    if(isNext){g.strokeStyle='#ffe08a';g.lineWidth=2;rr(g,o.x,o.y-4+lift,o.w,o.h+2,8);g.stroke();
      g.save();g.translate(cx+8,o.y+2+lift);g.rotate(.5);g.fillStyle='#d9b77a';g.fillRect(-2,-22,4,22);g.fillStyle=E.PAL[it.c];g.beginPath();g.moveTo(-3,0);g.lineTo(3,0);g.lineTo(0,8);g.fill();g.restore()}}
  function toolIcon(g,t,x,y,col){g.strokeStyle=col;g.fillStyle=col;g.lineWidth=2.2;g.lineCap='round';
    if(t==='t'){g.beginPath();g.moveTo(x-8,y-9);g.lineTo(x+8,y+9);g.stroke();g.beginPath();g.arc(x-8,y-9,2.5,0,7);g.fill()}
    else if(t==='c'){g.beginPath();g.moveTo(x-10,y-7);g.lineTo(x+10,y-7);for(var k=-9;k<=9;k+=6){g.moveTo(x+k,y-7);g.lineTo(x+k,y+8)}g.stroke()}
    else{g.beginPath();for(var i=0;i<26;i++){var an=i*.45,rd=1+i*.38;i?g.lineTo(x+Math.cos(an)*rd,y+Math.sin(an)*rd):g.moveTo(x,y)}g.stroke()}}
  function drawUI(g,a){var ko=a.lang==='ko',b=buttons();
    g.fillStyle='rgba(60,35,18,.35)';rr(g,12,498,306,50,10);g.fill();
    b.forEach(function(o,i){
      if(o.k==='pot')drawPot(g,o,o.i,a);
      else if(o.k==='undo'){var en=ops.length&&mode==='play';g.fillStyle=en?'#f4e6cc':'rgba(244,230,204,.4)';g.beginPath();g.arc(o.x+20,o.y+20,18,0,7);g.fill();
        g.strokeStyle='#6b4a32';g.lineWidth=2.6;g.beginPath();g.arc(o.x+20,o.y+21,8,-2.6,1.6);g.stroke();g.fillStyle='#6b4a32';g.beginPath();g.moveTo(o.x+9,o.y+10);g.lineTo(o.x+17,o.y+15);g.lineTo(o.x+9,o.y+19);g.fill()}
      else if(o.k==='tool'){var n=left(o.t),sel=tool===o.t||(o.t==='t'&&tool==='d'&&n>0&&left('d')<=0);
        g.fillStyle='rgba(0,0,0,.25)';rr(g,o.x,o.y+3,o.w,o.h,9);g.fill();g.fillStyle=sel?'#ffe7a8':n>0?'#f4e6cc':'#bfae94';rr(g,o.x,o.y,o.w,o.h,9);g.fill();
        if(sel){g.strokeStyle='#d2452f';g.lineWidth=2;rr(g,o.x+1,o.y+1,o.w-2,o.h-2,8);g.stroke()}
        toolIcon(g,o.t,o.x+18,o.y+20,n>0?'#4a3020':'#8a7a64');g.fillStyle=n>0?'#4a3020':'#8a7a64';g.font=F(15);g.textAlign='left';g.fillText('×'+n,o.x+33,o.y+26)}
      else if(o.k==='print'){var pr=mode==='play';g.fillStyle='#8e2f20';rr(g,o.x,o.y+4,o.w,o.h,10);g.fill();g.fillStyle=pr?(simShown>=L.thr?'#e0563b':'#c9503a'):'#9a6a5a';rr(g,o.x,o.y,o.w,o.h,10);g.fill();
        if(pr&&ops.length&&simShown>=L.thr){g.strokeStyle='rgba(255,230,160,'+(.5+.5*Math.sin(tG*6))+')';g.lineWidth=2.5;rr(g,o.x-2,o.y-2,o.w+4,o.h+4,11);g.stroke()}
        g.fillStyle='#fff6e6';g.font=F(18);g.textAlign='center';g.fillText(ko?'인쇄':'Print',o.x+o.w/2,o.y+27)}});
    g.textAlign='center';g.font=F(11.5);g.fillStyle='rgba(255,240,215,.8)';
    if(kb.on){g.fillText(ko?'방향키 이동 · Space 떨어뜨리기 · T 갈퀴 · C 빗 · V 소용돌이':'Arrows move · Space drop · T tine · C comb · V swirl',158,612);
      g.fillText(kb.mode?(ko?'끝점으로 옮기고 Space · Esc 취소':'Move to the end, Space · Esc cancel'):(ko?'Z 되돌리기 · P 인쇄':'Z undo · P print'),158,628)}
    else{g.fillText(tool==='c'?(ko?'물 위를 끌면 빗질':'Drag on the water to comb'):tool==='s'?(ko?'톡 하면 그 자리에 소용돌이':'Tap to swirl there'):(ko?'톡: 잉크 떨어뜨리기 · 끌기: 갈퀴로 당기기':'Tap: drop ink · Drag: pull a tine'),158,614);
      g.fillText(ko?'목표 그림과 같아지면 인쇄!':'Match the card, then Print!',158,630)}}
  function drawPrint(g,a){if(mode!=='print'&&mode!=='done'&&mode!=='fail')return;var ko=a.lang==='ko',t=modeT,x=TX,y=TY,s=1,rot=0,soak=1,al=1;
    if(mode==='print'){if(t<.45){y=lerp(-330,TY,ease(t/.45));soak=0}else if(t<.8){soak=(t-.45)/.35}else{var u=ease((t-.8)/.55);y=TY-u*16;rot=-u*.05;s=1-u*.04}}
    else if(mode==='done'){var u2=ease(t/.7);x=lerp(TX,CX+6,u2);y=lerp(TY-16,CY+6,u2);s=lerp(.96,(CS-12)/TS,u2);rot=lerp(-.05,-.025,u2);al=t>.8?1-(t-.8)/.25:1}
    else{var u3=ease(t/1.2);x=TX-u3*60;y=TY-16+u3*260;rot=-.05-u3*.5;al=1-u3}
    g.save();g.globalAlpha=Math.max(0,al);g.translate(x+TS*s/2,y+TS*s/2);g.rotate(rot);g.scale(s,s);
    g.fillStyle='rgba(0,0,0,.3)';g.fillRect(-TS/2+6,-TS/2+10,TS,TS);g.drawImage(paperCv,-TS/2,-TS/2);
    if(soak>0){g.globalAlpha=Math.max(0,al)*Math.min(1,soak)*.92;g.globalCompositeOperation='multiply';g.drawImage(trayCv,-TS/2,-TS/2);g.globalCompositeOperation='source-over'}
    g.restore();
    if((mode==='print'&&t>.9)||mode!=='print'){var pass=printSim>=L.thr,ap=mode==='print'?Math.min(1,(t-.9)/.2):mode==='fail'?Math.min(1,(1.2-t)/.4):1-t;
      if(ap>0){g.globalAlpha=ap;g.textAlign='center';g.fillStyle='rgba(40,24,14,.72)';rr(g,W/2-118,TY+TS/2-50,236,96,18);g.fill();g.font=F(46);g.fillStyle='rgba(0,0,0,.35)';g.fillText(Math.round(printSim)+'%',W/2+2,TY+TS/2+4);
        g.fillStyle=pass?'#fff2c0':'#ffd0c4';g.fillText(Math.round(printSim)+'%',W/2,TY+TS/2);g.font=F(22);
        g.fillText(pass?(ko?'멋진 마블링!':'Beautiful print!'):(ko?'조금 달라요 · 되돌려 다시':'Not quite · undo and retry'),W/2,TY+TS/2+34);g.globalAlpha=1}}}
  function draw(g,a){
    drawBack(g);g.save();g.translate(306,151);g.scale(1.18,1.18);drawCrane(g,0,0);g.restore();
    for(var i=0;i<leaves.length;i++)drawLeaf(g,leaves[i]);
    drawTable(g);drawTray(g,a);drawCard(g,a);drawUI(g,a);drawPrint(g,a);
    if(hintA>0&&L.hint){var ko=a.lang==='ko',tx=L.hint[a.lang];g.globalAlpha=Math.min(1,hintA*1.3);g.font=F(14);var tw=g.measureText(tx).width+24;
      g.fillStyle='rgba(255,248,232,.92)';rr(g,W/2-tw/2,TY+8,tw,28,14);g.fill();g.fillStyle='#5a3a24';g.textAlign='center';g.fillText(tx,W/2,TY+27);g.globalAlpha=1}}

  SG.run({id:'marbling',title:{ko:'물결 마블링',en:'Marble Bath'},
    how:{ko:'물 위에 잉크를 톡 떨어뜨리고, 끌어서 당겨 왼쪽 위 그림과 똑같은 무늬를 만든 뒤 인쇄하세요.',
         en:'Tap to drop ink on the water, drag to pull it, match the card in the corner, then Print.'},
    init:init,update:update,draw:draw});
})();
