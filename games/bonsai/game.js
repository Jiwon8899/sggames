/* 분재 정원 (Bonsai Seasons) — 계절마다 자라는 나무를 자르고(가지치기) 철사로 휘어 목표 수형에 맞춘다.
   성장 모델은 DOM 없이 결정적으로 돌아간다(같은 시드 + 같은 행동 = 같은 나무). node 검증용 module.exports. */
(function(){
  'use strict';
  var W=360,H=640,BX=180,BY=440;
  var SUN=[-1.05,-.55,0,.55,1.05],SEAS_F=[1,.85,.55,.2],RSNAP=3.1;
  var CELL=6,GX0=-180,GY0=-150,GW=60,GH=86;

  /* ---------- 성장 모델 ---------- */
  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function adiff(a,b){var d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d}
  function rng(st){var t=st.r=(st.r+0x6D2B79F5)>>>0;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
  function newTree(seed,sun,s0){
    return {segs:[{id:0,p:-1,a:0,len:18,age:1,limb:0,side:1,wire:0,cut:0,boost:0,born:-1}],next:1,r:(seed>>>0)||1,sun:sun==null?2:sun,tick:0,s0:s0||0}}
  function clone(st){var o={segs:[],next:st.next,r:st.r,sun:st.sun,tick:st.tick,s0:st.s0};
    for(var i=0;i<st.segs.length;i++){var s=st.segs[i];
      o.segs.push({id:s.id,p:s.p,a:s.a,len:s.len,age:s.age,limb:s.limb,side:s.side,wire:s.wire,cut:s.cut,boost:s.boost,born:s.born})}
    return o}
  /* 위치, 자식, 끝눈 수, 굵기를 다시 계산한다(부모가 항상 배열에서 먼저 나온다) */
  function index(st){var by={},n=st.segs.length,i,s,p;
    for(i=0;i<n;i++){s=st.segs[i];by[s.id]=s;s.ch=[];s.tips=0}
    for(i=0;i<n;i++){s=st.segs[i];
      if(s.p>=0){p=by[s.p];p.ch.push(s);s.x0=p.x1;s.y0=p.y1;s.d=p.d+1}else{s.x0=0;s.y0=0;s.d=0}
      s.x1=s.x0+Math.sin(s.a)*s.len;s.y1=s.y0+Math.cos(s.a)*s.len}
    for(i=n-1;i>=0;i--){s=st.segs[i];if(!s.ch.length)s.tips=1;s.r=.8+.2*s.age+.5*Math.sqrt(s.tips);if(s.p>=0)by[s.p].tips+=s.tips}
    st.by=by;return by}
  function season(st){return (st.s0+st.tick)%4}
  function addSeg(st,par,a,len,lat){var id=st.next++,sd=rng(st)<.5?-1:1;
    st.segs.push({id:id,p:par.id,a:clamp(a,-2.9,2.9),len:len,age:0,limb:lat?id:par.limb,side:lat?sd:par.side,wire:0,cut:0,boost:0,born:st.tick})}
  /* 한 계절 성장: 끝눈마다 활력 = 정단우세(높을수록) x 빛(해 쪽) x 가지치기 보너스, 전체 에너지를 나눠 갖는다 */
  function vigor(st,tips){var mn=1e9,mx=-1e9,sa=SUN[st.sun],vs=[],sum=0,i,t;
    for(i=0;i<tips.length;i++){t=tips[i];if(t.y1<mn)mn=t.y1;if(t.y1>mx)mx=t.y1}
    for(i=0;i<tips.length;i++){t=tips[i];var h=Math.max(0,t.y1)/(Math.max(0,mx)+20),dom=(.5+1.3*h*h)*(t.limb===0?1.3:1),
        li=Math.max(.15,.55+.3*Math.cos(t.a-sa)+.25*clamp(t.x1*Math.sin(sa)/70,-1,1)),v=dom*li*(1+t.boost);vs.push(v);sum+=v}
    return {vs:vs,sum:sum}}
  function grow(st,fo){var by=index(st),segs=st.segs,tips=[],i,s,f=fo||SEAS_F[season(st)],sa=SUN[st.sun];
    for(i=0;i<segs.length;i++){s=segs[i];if(!s.ch.length)tips.push(s)}
    var V=vigor(st,tips),E=f*Math.min(300,70+22*segs[0].age),gl={};
    for(i=0;i<segs.length;i++){s=segs[i];s.age++;s.wire=0}
    var full=segs.length>=420;
    for(i=0;i<tips.length;i++){var t=tips[i],g=Math.min(38,E*V.vs[i]/V.sum);gl[t.id]=g;
      if(g<3.5||full){t.cut=0;continue}
      if(t.cut){t.cut=0;addSeg(st,t,t.a-.55,g*.75,true);addSeg(st,t,t.a+.55,g*.75,true);continue}
      var a=t.a+.15*adiff(sa,t.a)+.06*adiff(0,t.a)+(rng(st)-.5)*.3;
      if(g>8&&rng(st)<.5+.35*Math.min(1,(g-8)/16)){addSeg(st,t,t.a+t.side*(.6+rng(st)*.3),g*.65,true);t.side=-t.side;g*=.8}
      addSeg(st,t,a,g,false)}
    for(i=0;i<segs.length;i++)segs[i].boost=0;
    st.tick++;index(st);return gl}
  function subtree(st,id){var rm={},i;rm[id]=1;for(i=0;i<st.segs.length;i++){var s=st.segs[i];if(rm[s.p])rm[s.id]=1}return rm}
  /* 가지치기: 잘린 가지의 양만큼 가까운 눈들이 다음 계절에 더 세게 자란다. 끝이 사라진 가지는 잘린 자리에서 새 눈 두 개를 틔운다 */
  function snip(st,id){var by=index(st),s=by[id];if(!s||s.p<0)return null;
    var rm=subtree(st,id),M=0,gone=[],i;
    for(i=0;i<st.segs.length;i++){var q=st.segs[i];if(rm[q.id]){M+=q.len;gone.push({x0:q.x0,y0:q.y0,x1:q.x1,y1:q.y1,r:q.r,age:q.age})}}
    var cx=s.x0,cy=s.y0,P=by[s.p];
    st.segs=st.segs.filter(function(q){return !rm[q.id]});index(st);
    if(!P.ch.length)P.cut=1;
    var b=Math.min(2,M/45),got=[];
    for(i=0;i<st.segs.length;i++){var t=st.segs[i];if(!t.ch.length){var d=Math.hypot(t.x1-cx,t.y1-cy),add=b*Math.exp(-d/70);t.boost+=add;if(add>.08)got.push(t.id)}}
    return {snip:1,gone:gone,M:M,x:cx,y:cy,got:got}}
  function limbStart(st,id){var by=index(st),s=by[id];return s?(by[s.limb]||s):null}
  function stiff(L){return L.r>RSNAP}
  /* 철사: 가지(곁가지 시작점부터 그 끝까지)를 밑동 기준으로 돌린다. 굵은 묵은 가지는 부러진다 */
  function wire(st,id,delta){var L=limbStart(st,id);if(!L)return null;
    if(stiff(L)){if(L.p<0)return {stiff:1};var r=snip(st,L.id);if(r)r.snap=1;return r}
    var na=clamp(L.a+delta,-2.7,2.7),d=na-L.a,rm=subtree(st,L.id);
    for(var i=0;i<st.segs.length;i++){var s=st.segs[i];if(rm[s.id])s.a+=d}
    L.wire=1;index(st);return {ok:1,id:L.id,d:d}}
  function rotate(st,dir){var n=clamp(st.sun+dir,0,SUN.length-1);if(n===st.sun)return false;st.sun=n;return true}

  /* ---------- 실루엣과 점수 ---------- */
  function leaves(st){index(st);var pts=[];for(var i=0;i<st.segs.length;i++){var s=st.segs[i];
      if(!s.ch.length)pts.push([s.x1,s.y1,16,s.id]);else if(s.age<=3&&s.d>1)pts.push([s.x1,s.y1,12,s.id])}return pts}
  function raster(pts){var m=new Uint8Array(GW*GH);
    for(var k=0;k<pts.length;k++){var p=pts[k],r=p[2],r2=r*r,
        i0=Math.max(0,Math.floor((p[0]-r-GX0)/CELL)),i1=Math.min(GW-1,Math.floor((p[0]+r-GX0)/CELL)),
        j0=Math.max(0,Math.floor((p[1]-r-GY0)/CELL)),j1=Math.min(GH-1,Math.floor((p[1]+r-GY0)/CELL));
      for(var j=j0;j<=j1;j++){var cy=GY0+(j+.5)*CELL-p[1];for(var i=i0;i<=i1;i++){var cx=GX0+(i+.5)*CELL-p[0];if(cx*cx+cy*cy<=r2)m[j*GW+i]=1}}}
    return m}
  function cellAt(x,y){var i=Math.floor((x-GX0)/CELL),j=Math.floor((y-GY0)/CELL);return (i<0||j<0||i>=GW||j>=GH)?-1:j*GW+i}
  function score(st,T){var F=raster(leaves(st)),I=0,U=0,k,inn=T.inside;
    for(k=0;k<F.length;k++){if(F[k]&&inn[k])I++;if(F[k]||inn[k])U++}
    var iou=U?I/U:0,out=0,tot=0;
    for(var i=0;i<st.segs.length;i++){var s=st.segs[i],n=Math.max(1,Math.round(s.len/6));
      for(var q=1;q<=n;q++){var x=s.x0+(s.x1-s.x0)*q/n,y=s.y0+(s.y1-s.y0)*q/n;if(x*x+y*y<3600)continue;
        tot++;var c=cellAt(x,y);if(c<0||!inn[c])out++}}
    var pen=.4*out/Math.max(1,tot);return {iou:iou,pen:pen,s:Math.max(0,iou-pen),F:F}}
  function finishTarget(field){var inside=new Uint8Array(GW*GH),n=0;
    for(var j0=0;j0<GH;j0++)for(var i0=0;i0<GW;i0++){var xx=GX0+(i0+.5)*CELL,yy=GY0+(j0+.5)*CELL;if(Math.abs(xx)>144||yy>290||yy<-100)field[j0*GW+i0]=Math.min(field[j0*GW+i0],-.05)}
for(var k=0;k<field.length;k++)if(field[k]>0){inside[k]=1;n++}
    return {field:field,inside:inside,area:n,contour:contour(field)}}
  function targetFromEll(E){var field=new Float32Array(GW*GH);
    for(var j=0;j<GH;j++)for(var i=0;i<GW;i++){var x=GX0+(i+.5)*CELL,y=GY0+(j+.5)*CELL,v=-9;
      for(var k=0;k<E.length;k++){var e=E[k],c=Math.cos(e[4]||0),s=Math.sin(e[4]||0),dx=x-e[0],dy=y-e[1],u=(dx*c-dy*s)/e[2],w=(dx*s+dy*c)/e[3],q=1-u*u-w*w;if(q>v)v=q}
      field[j*GW+i]=v}
    return finishTarget(field)}
  function targetFromMask(m){var a=new Float32Array(GW*GH),b=new Float32Array(GW*GH),k,i,j,p;
    for(k=0;k<m.length;k++)a[k]=m[k];
    for(p=0;p<3;p++){for(j=0;j<GH;j++)for(i=0;i<GW;i++){var s=0,c=0;for(var dj=-1;dj<=1;dj++)for(var di=-1;di<=1;di++){var x=i+di,y=j+dj;if(x>=0&&y>=0&&x<GW&&y<GH){s+=a[y*GW+x];c++}}b[j*GW+i]=s/c}
      var t=a;a=b;b=t}
    for(k=0;k<a.length;k++)a[k]-=.5;
    return finishTarget(a)}
  /* 마칭 스퀘어 윤곽선(셀 중심 격자, 선형 보간) */
  function contour(f){var segs=[],i,j;
    function P(i,j){return [GX0+(i+.5)*CELL,GY0+(j+.5)*CELL]}
    function lerp(a,b,va,vb){var t=va/(va-vb);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
    for(j=0;j<GH-1;j++)for(i=0;i<GW-1;i++){
      var v0=f[j*GW+i],v1=f[j*GW+i+1],v2=f[(j+1)*GW+i+1],v3=f[(j+1)*GW+i],p0=P(i,j),p1=P(i+1,j),p2=P(i+1,j+1),p3=P(i,j+1),e=[];
      if((v0>0)!==(v1>0))e.push(lerp(p0,p1,v0,v1));if((v1>0)!==(v2>0))e.push(lerp(p1,p2,v1,v2));
      if((v2>0)!==(v3>0))e.push(lerp(p2,p3,v2,v3));if((v3>0)!==(v0>0))e.push(lerp(p3,p0,v3,v0));
      if(e.length>=2)segs.push([e[0][0],e[0][1],e[1][0],e[1][1],(i+j)&1]);
      if(e.length===4)segs.push([e[2][0],e[2][1],e[3][0],e[3][1],(i+j)&1])}
    return segs}

  /* ---------- 레벨 ---------- */
  var STY={round:{ko:'둥근 수형',en:'Round'},upright:{ko:'직간 · 곧은 줄기',en:'Formal upright'},slant:{ko:'사간 · 비스듬히',en:'Slanting'},
    cascade:{ko:'현애 · 폭포',en:'Cascade'},wind:{ko:'취류 · 바람',en:'Windswept'},broom:{ko:'빗자루형',en:'Broom'},free:{ko:'자유 수형',en:'Freestyle'}};
  var LEVELS=[
    {seed:5,pre:3,N:3,s0:0,style:'round',ell:[[0,115,65,52,0]],
      hint:{ko:'삐져나온 가지를 잘라 모양을 다듬어요',en:'Snip branches that poke outside the shape'}},
    {seed:23,pre:4,preSun:0,N:4,s0:0,style:'round',ell:[[0,110,95,70,0]],
      hint:{ko:'어린 가지를 끌어 빈 쪽으로 휘어요',en:'Drag a young branch toward the empty side'}},
    {seed:31,pre:3,N:5,sun:0,s0:0,style:'slant',ell:[[66,114,88,66,-0.3],[22,48,44,44,0]],
      hint:{ko:'화분을 돌려요. 가지는 해를 따라 자라요',en:'Turn the pot: shoots grow toward the sun'}},
    {seed:47,pre:5,N:4,s0:0,style:'broom',ell:[[0,79,132,61,0]],
      hint:{ko:'꼭대기를 자르면 옆가지가 힘을 받아요',en:'Snip the top so side shoots surge'}},
    {seed:53,pre:2,N:6,s0:0,style:'cascade',ell:[[15,103,45,35,0],[70,54,35,35,0],[89,-15,30,45,0]],
      hint:{ko:'어린 줄기를 아래로 휘어 폭포처럼',en:'Bend the young trunk down like a waterfall'}},
    {seed:56,pre:3,N:6,s0:0,style:'upright',ell:[[0,210,40,45,0],[0,130,75,45,0],[0,65,95,35,0]]},
    {seed:71,pre:3,N:6,s0:0,sun:2,style:'wind',ell:[[70,120,90,45,-0.35],[25,55,52,32,0]]},
    {seed:83,pre:3,N:6,s0:0,style:'broom',ell:[[-25,113,99,72,0]]},
    {seed:97,pre:3,N:6,s0:0,sun:4,style:'slant',ell:[[-87,148,88,69,0.4],[-25,73,56,44,0]]},
    {seed:101,pre:3,N:7,s0:0,style:'round',ell:[[-91,147,61,50,0],[41,92,66,44,0]]}
  ];
  function applyAct(st,a){if(a[0]==='s')return snip(st,a[1]);if(a[0]==='w')return wire(st,a[1],a[2]);if(a[0]==='r')return rotate(st,a[1]);return null}
  function seedling(L){var st=newTree(L.seed,L.preSun==null?2:L.preSun,0),i;
    for(i=0;i<L.pre;i++){if(L.preAct&&L.preAct[i])for(var k=0;k<L.preAct[i].length;k++)applyAct(st,L.preAct[i][k]);grow(st,1)}
    st.tick=0;st.s0=L.s0||0;st.sun=L.sun==null?2:L.sun;
    for(i=0;i<st.segs.length;i++){st.segs[i].born=-1;st.segs[i].boost=0;st.segs[i].wire=0}
    index(st);return st}
  /* 절차 생성: 같은 성장 모델에 봇의 무작위 손질 계획을 돌린 결과 잎 실루엣을 목표로 쓴다(도달 가능 보장) */
  function genLevel(n){var R={r:(n*2654435761)>>>0||7},tries=0;
    while(true){tries++;
      var L={n:n,seed:(rng(R)*1e9)>>>0,pre:2+Math.floor(rng(R)*2),preSun:Math.floor(rng(R)*5),sun:2,s0:Math.floor(rng(R)*2),N:4+Math.floor(rng(R)*3),style:'free',gen:1};
      var st=seedling(L),plan=[],s,k;
      for(s=0;s<L.N;s++){var acts=[];
        if(rng(R)<.45)acts.push(['r',rng(R)<.5?-1:1]);
        var ns=Math.floor(rng(R)*3);for(k=0;k<ns;k++){index(st);var cand=st.segs.filter(function(q){return q.p>=0&&q.d>=2});
          if(cand.length){cand.sort(function(a,b){return b.y1-a.y1});var pick=cand[Math.floor(Math.pow(rng(R),2)*cand.length)];acts.push(['s',pick.id])}}
        if(rng(R)<.4){index(st);var lb=st.segs.filter(function(q){return q.limb===q.id&&!stiff(q)});
          if(lb.length)acts.push(['w',lb[Math.floor(rng(R)*lb.length)].id,(rng(R)<.5?-1:1)*(.3+rng(R)*.45)])}
        for(k=0;k<acts.length;k++)applyAct(st,acts[k]);plan.push(acts);grow(st)}
      var T=targetFromMask(raster(leaves(st)));L.target=T;L.plan=plan;
      var replay=score(st,T).s,idle=seedling(L);for(s=0;s<L.N;s++)grow(idle);var is=score(idle,T).s;
      if((T.area>140&&replay>=.7&&is<.55)||tries>30){L.replay=replay;L.idle=is;return L}}}
  function getLevel(n){if(n<LEVELS.length){var L=LEVELS[n];if(!L.target)L.target=targetFromEll(L.ell);L.n=n;return L}return genLevel(n)}

  var API={W:W,H:H,BX:BX,BY:BY,cellAt:cellAt,SUN:SUN,RSNAP:RSNAP,newTree:newTree,clone:clone,index:index,grow:grow,snip:snip,wire:wire,rotate:rotate,
    limbStart:limbStart,stiff:stiff,leaves:leaves,raster:raster,score:score,targetFromEll:targetFromEll,targetFromMask:targetFromMask,
    LEVELS:LEVELS,getLevel:getLevel,genLevel:genLevel,seedling:seedling,applyAct:applyAct,season:season,vigor:vigor,GW:GW,GH:GH};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  if(typeof SG==='undefined')return;
  /* ================= 게임 ================= */
  var SEASON_T=7,GROW_T=1.1,FONT='px Jua, system-ui, sans-serif';
  var SNAME=[{ko:'봄',en:'Spring'},{ko:'여름',en:'Summer'},{ko:'가을',en:'Autumn'},{ko:'겨울',en:'Winter'}];
  var BG=[['#fbe9e4','#f3d6cf','#e9c5b8'],['#f1f2dc','#e1e6c2','#cfd6a8'],['#fbe7cc','#f1cfa0','#e2b47c'],['#e9eef4','#d6dfe9','#c3cedb']];
  var LEAF=[['#5f9e4f','#86c46a','#b6e08f'],['#3f7f3f','#5b9e4c','#8cc46c'],['#b8452a','#dc6a32','#f0a24a'],['#dfe8f2','#f3f7fb','#ffffff']];
  var lvN,L,T,st,period,seasonT,mode,modeT,growT,time,tool,sel,wireMode,drag,prevDown,kbOn,tG=0,sc,scPrev,res,stars,
      fallen,sparks,parts,tcv,sunDisp,potSpin,lastGain,mood,moodT,blinkT,nodT,sipT,hintOn,leafCache,bamboo,kq=[],dispOK,warned,firstLoad;
  var ko=true;
  if(!window.__bonsaiKeys){window.__bonsaiKeys=true;
    window.addEventListener('keydown',function(e){var s=window.__sg&&window.__sg.state();if(!s||!s.playing)return;
      var c=e.code;if(['Tab','KeyS','KeyW','KeyR','KeyN','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Escape','KeyE'].indexOf(c)<0)return;
      e.preventDefault();kq.push({c:c,sh:e.shiftKey,rep:e.repeat})})}

  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  var SC=1.2;function cx(x){return BX+x*SC}function cy(y){return BY-y*SC}
  function curSeason(){return (L.s0+period)%4}

  function buildTargetCanvas(){tcv=document.createElement('canvas');tcv.width=W;tcv.height=H;var t=tcv.getContext('2d'),i,j,k;
    t.fillStyle='rgba(255,255,255,.22)';
    for(j=0;j<GH;j++)for(i=0;i<GW;i++){k=j*GW+i;if(T.inside[k])t.fillRect(cx(GX0+i*CELL),cy(GY0+(j+1)*CELL),CELL*SC+.5,CELL*SC+.5)}
    t.lineCap='round';
    for(var pass=0;pass<2;pass++){t.strokeStyle=pass?'rgba(70,52,40,.55)':'rgba(255,255,255,.7)';t.lineWidth=pass?2:4.5;t.beginPath();
      for(i=0;i<T.contour.length;i++){var c=T.contour[i];if(c[4])continue;t.moveTo(cx(c[0]),cy(c[1]));t.lineTo(cx(c[2]),cy(c[3]))}t.stroke()}}

  function load(n,a){lvN=n;L=getLevel(n);T=L.target;st=seedling(L);period=0;seasonT=0;mode='play';modeT=0;growT=1;
    sel=null;wireMode=false;drag=null;fallen=[];sparks=[];res=null;stars=0;hintOn=true;warned=0;
    sunDisp=SUN[st.sun];buildTargetCanvas();refresh(true);scPrev=sc.s}
  function refresh(silent){index(st);sc=score(st,T);leafCache=leaves(st);
    if(sel!=null&&!st.by[sel])sel=null}
  function init(a){ko=a.lang==='ko';time=55;tool='snip';prevDown=true;kbOn=false;parts=[];lastGain=0;mood='calm';moodT=0;blinkT=2;nodT=0;sipT=3;
    bamboo=[];for(var i=0;i<5;i++)bamboo.push({x:i<2?10+i*34:250+(i-2)*42,w:6+hash(i)*4,p:hash(i+3)*6});
    for(i=0;i<22;i++)parts.push(newPart(true));
    load(0,a);a.tempo(1)}
  function newPart(any){return {x:Math.random()*W,y:any?Math.random()*H:-10,vx:-6-Math.random()*10,vy:14+Math.random()*16,
    r:Math.random()*6.28,vr:(Math.random()-.5)*3,ph:Math.random()*6.28,s:.7+Math.random()*.6}}

  /* ---------- 화면 좌표(바람 흔들림 + 성장 애니 + 철사 미리보기) ---------- */
  function layoutDisp(){var by=st.by,i,s,p,ease=growT>=1?1:1-Math.pow(1-growT,3),seas=curSeason(),amp=seas===3?.006:.012;
    var dsub=drag&&drag.ok&&drag.d?drag.sub:null;
    for(i=0;i<st.segs.length;i++){s=st.segs[i];var gsc=(s.born===st.tick-1&&growT<1)?ease:1;p=s.p>=0?by[s.p]:null;
      s.off=(p?p.off:0)+Math.sin(tG*1.3+s.d*.55+hash(s.id)*2)*amp*Math.min(1,s.d/3);
      s.da=s.a+s.off+(dsub&&dsub[s.id]?drag.d:0);s.dl=s.len*gsc*SC;s.gs=gsc;
      if(p){s.X0=p.X1;s.Y0=p.Y1}else{s.X0=cx(0);s.Y0=cy(0)}
      s.X1=s.X0+Math.sin(s.da)*s.dl;s.Y1=s.Y0-Math.cos(s.da)*s.dl}
    dispOK=true}
  function segDist(s,x,y){var dx=s.X1-s.X0,dy=s.Y1-s.Y0,l=dx*dx+dy*dy,t=l>0?((x-s.X0)*dx+(y-s.Y0)*dy)/l:0;t=clamp(t,0,1);
    return Math.hypot(x-(s.X0+dx*t),y-(s.Y0+dy*t))}
  function pick(x,y,allowRoot){var best=null,bd=1e9;for(var i=0;i<st.segs.length;i++){var s=st.segs[i];if(!allowRoot&&s.p<0)continue;
      var d=segDist(s,x,y)-s.d*.02;if(d<bd){bd=d;best=s}}return bd<18?best:null}

  /* ---------- 행동 ---------- */
  function afterChange(a,x,y){var old=sc.s;refresh();var d=Math.round((sc.s-old)*100);
    if(d!==0)a.pop(x,y-14,(d>0?'+':'')+d+'%',d>0?'#3f8f3a':'#c0503c');
    if(d>0){nodT=.8;mood='calm'}
    return d}
  function doSnip(a,id){var s=st.by[id];if(!s)return;if(s.p<0){a.beep(160,.12,'triangle');a.pop(s.X1,s.Y1-10,ko?'밑동은 못 잘라요':'Not the trunk base','#8a5a3a');return}
    var mx=(s.X0+s.X1)/2,my=(s.Y0+s.Y1)/2,X0=s.X0,Y0=s.Y0;
    var segsScr=[];var rm={};rm[id]=1;st.segs.forEach(function(q){if(rm[q.p])rm[q.id]=1;if(rm[q.id])segsScr.push(q)});
    var r=snip(st,id);if(!r)return;
    segsScr.forEach(function(q){fallen.push({x0:q.X0,y0:q.Y0,x1:q.X1,y1:q.Y1,w:Math.max(1.4,q.r*1.6),vx:(Math.random()-.5)*40,vy:-30-Math.random()*40,vr:(Math.random()-.5)*4,ang:0,t:0,leaf:!q.ch||!q.ch.length,cx:(q.X0+q.X1)/2,cy:(q.Y0+q.Y1)/2})});
    a.sfx('tap');a.beep(1500,.04,'square');a.beep(900,.05,'triangle');
    var lc=LEAF[curSeason()];a.burst(mx,my,curSeason()===3?'#9b8570':lc[1],8);
    afterChange(a,mx,my);
    r.got.forEach(function(gid,i){var t=st.by[gid];if(t)sparks.push({x0:X0,y0:Y0,id:gid,t:-i*.04})});
  }
  function doWire(a,id,delta,x,y){var L0=limbStart(st,id);if(!L0)return;
    var r=wire(st,id,delta);if(!r)return;
    if(r.stiff){a.beep(110,.18,'sawtooth');a.shake(3);a.pop(x,y-12,ko?'너무 굵어요!':'Too stiff!','#b5482f');mood='shock';moodT=.9;return}
    if(r.snap){a.sfx('hit');a.shake(8);a.pop(x,y-12,ko?'뚝! 부러졌어요':'Snap!','#c0392b');mood='shock';moodT=1.2;
      r.gone.forEach(function(q){fallen.push({x0:cx(q.x0),y0:cy(q.y0),x1:cx(q.x1),y1:cy(q.y1),w:Math.max(1.4,q.r*1.6),vx:(Math.random()-.5)*60,vy:-60-Math.random()*40,vr:(Math.random()-.5)*6,ang:0,t:0,leaf:false,cx:(cx(q.x0)+cx(q.x1))/2,cy:(cy(q.y0)+cy(q.y1))/2})});
      a.burst(x,y,'#8a5a3a',14);refresh();return}
    a.beep(520,.05,'triangle');a.beep(780,.07,'triangle');a.burst(x,y,'#d9894a',6);afterChange(a,x,y)}
  function doRotate(a,dir){if(rotate(st,dir)){a.beep(dir>0?620:520,.06,'sine');a.beep(dir>0?820:420,.08,'sine');potSpin=(potSpin||0)+dir;refresh();
      var sp=sunPos(SUN[st.sun]);a.burst(sp[0],sp[1],'#ffd36b',8)}else a.beep(200,.06,'square')}
  function nextSeason(a){if(mode!=='play')return;
    if(period<L.N){grow(st);period++;seasonT=0;growT=0;wireMode=false;refresh();sparks=[];
      a.beep(392,.12,'sine');a.beep(523,.16,'sine');hintOn=period<2}
    else evaluate(a)}
  function evaluate(a){var s=sc.s,pct=Math.round(s*100);stars=s>=.8?3:s>=.7?2:s>=.6?1:0;res={s:s,pct:pct};modeT=0;drag=null;
    if(stars>0){mode='clear';var pts=pct+stars*20;a.add(pts);time=Math.min(70,time+14);lastGain=1.2;a.sfx('win');mood='happy';moodT=2.4;
      ['#ffd36b','#ff9eb5','#9fdc7c','#ffffff'].forEach(function(c){a.burst(BX,BY-150,c,10)});a.pop(BX,BY-200,'+'+pts,'#e2793a');
      a.tempo(1+Math.min(.4,(lvN+1)*.04))}
    else{mode='fail';time-=4;a.sfx('hit');a.shake(6);mood='sad';moodT=2;a.pop(BX,BY-180,'-4s','#c0392b');a.burst(BX,BY-120,'#a07a5a',12)}}

  function sunPos(an){return [BX+Math.sin(an)*162,96+(1-Math.cos(an))*150]}

  /* ---------- 업데이트 ---------- */
  var BTN={snip:[10,594,80,38],wire:[96,594,80,38],next:[182,594,124,38]},ROT=[[BX-46,BY+86],[BX+46,BY+86]];
  function inRect(r,x,y){return x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3]}
  function limbList(){var out=[];for(var i=0;i<st.segs.length;i++){var s=st.segs[i];if(s.limb===s.id)out.push(s)}
    out.sort(function(p,q){return Math.atan2(p.X1-BX,BY-p.Y1)-Math.atan2(q.X1-BX,BY-q.Y1)});return out}
  function update(dt,inp,a){ko=a.lang==='ko';var fresh=inp.down&&!prevDown,rel=!inp.down&&prevDown;
    if(!dispOK)layoutDisp();
    if(mode!=='clear'){time-=dt;if(time<=0){time=0;a.over();prevDown=inp.down;return}
      if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(880,.05,'square')}}
    if(lastGain>0)lastGain-=dt;
    if(growT<1)growT=Math.min(1,growT+dt/GROW_T);
    if(mode==='play'){
      seasonT+=dt;if(seasonT>=SEASON_T&&!drag&&growT>=1)nextSeason(a);
      /* 포인터 */
      if(fresh&&inp.x!=null){kbOn=false;var x=inp.x,y=inp.y;
        if(inRect(BTN.snip,x,y)){tool='snip';a.sfx('tap')}
        else if(inRect(BTN.wire,x,y)){tool='wire';a.sfx('tap')}
        else if(inRect(BTN.next,x,y)){nextSeason(a)}
        else if(Math.hypot(x-ROT[0][0],y-ROT[0][1])<24)doRotate(a,-1);
        else if(Math.hypot(x-ROT[1][0],y-ROT[1][1])<24)doRotate(a,1);
        else{var s=pick(x,y,tool==='wire');
          if(s&&tool==='snip')doSnip(a,s.id);
          else if(s&&tool==='wire'){var Lm=st.by[s.limb]||s,sub=subtree(st,Lm.id);
            drag={id:Lm.id,px:Lm.X0,py:Lm.Y0,ga:Math.atan2(x-Lm.X0,Lm.Y0-y),d:0,sub:sub,ok:!stiff(Lm),gx:x,gy:y,moved:false};a.beep(300,.04,'triangle')}
          else if(Math.hypot(x-46,y-540)<34){nodT=.8;a.beep(700,.05,'sine')}}}
      if(drag&&inp.down&&inp.x!=null){var na=Math.atan2(inp.x-drag.px,drag.py-inp.y),dd=adiff(na,drag.ga);
        var Ls=st.by[drag.id];if(Ls){var tgt=clamp(Ls.a+dd,-2.7,2.7);dd=tgt-Ls.a}
        if(Math.hypot(inp.x-drag.gx,inp.y-drag.gy)>6)drag.moved=true;drag.d=drag.moved?dd:0;drag.cx=inp.x;drag.cy=inp.y}
      if(drag&&rel){var dg=drag;drag=null;if(dg.moved&&st.by[dg.id]){if(!dg.ok||Math.abs(dg.d)>.04)doWire(a,dg.id,dg.ok?dg.d:.3,dg.cx||dg.gx,dg.cy||dg.gy)}}
      /* 키보드 */
      while(kq.length){var k=kq.shift(),c=k.c;kbOn=true;
        var lim=limbList();
        if(sel==null||!st.by[sel]){sel=lim.length?lim[Math.floor(lim.length/2)].id:0;if(c==='Tab')continue}
        var cur=st.by[sel];
        if(c==='Tab'||(!wireMode&&(c==='ArrowLeft'||c==='ArrowRight'))){var li=st.by[cur.limb]||cur,ix=lim.indexOf(li),dir=(c==='ArrowLeft'||(c==='Tab'&&k.sh))?-1:1;
          ix=(ix+dir+lim.length)%lim.length;sel=lim[ix].id;wireMode=false;a.beep(600,.03,'square')}
        else if(c==='ArrowUp'&&!wireMode){var nx=null;for(var j=0;j<cur.ch.length;j++)if(cur.ch[j].limb===cur.limb)nx=cur.ch[j];if(!nx&&cur.ch.length)nx=cur.ch[0];if(nx){sel=nx.id;a.beep(660,.03,'square')}}
        else if(c==='ArrowDown'&&!wireMode){if(cur.p>=0){sel=cur.p;a.beep(540,.03,'square')}}
        else if(c==='KeyS'){tool='snip';var pid=cur.p;doSnip(a,cur.id);if(st.by[pid])sel=pid}
        else if(c==='KeyW'){wireMode=!wireMode;tool='wire';a.beep(wireMode?740:440,.05,'triangle')}
        else if(wireMode&&(c==='ArrowLeft'||c==='ArrowRight')){var Lw=st.by[cur.limb]||cur;
          doWire(a,Lw.id,c==='ArrowLeft'?-.16:.16,(Lw.X0+Lw.X1)/2,(Lw.Y0+Lw.Y1)/2);if(!st.by[sel])sel=null;if(!st.by[Lw.id]){wireMode=false}}
        else if(c==='Enter'||c==='Escape'){wireMode=false}
        else if(c==='KeyR'||c==='KeyE'){var dr=c==='KeyE'?-1:1;if(c==='KeyR'&&st.sun===SUN.length-1)dr=-1;
          if(c==='KeyR'&&k.sh)dr=-1;doRotate(a,dr)}
        else if(c==='KeyN'){nextSeason(a)}}
    }else{kq.length=0;drag=null;modeT+=dt;
      if(mode==='clear'&&modeT>2.3)load(lvN+1,a);
      else if(mode==='fail'&&modeT>1.9)load(lvN,a)}
    sunDisp+=(SUN[st.sun]-sunDisp)*Math.min(1,dt*5);
    if(moodT>0){moodT-=dt;if(moodT<=0)mood='calm'}
    blinkT-=dt;if(blinkT<-.14)blinkT=2+Math.random()*2.5;
    if(nodT>0)nodT-=dt;sipT-=dt;if(sipT<-1.6)sipT=4+Math.random()*3;
    prevDown=inp.down;dispOK=false}

  /* ---------- 그리기 ---------- */
  function mix(c1,c2,t){var a=parseInt(c1.slice(1),16),b=parseInt(c2.slice(1),16),r=(a>>16)+((b>>16)-(a>>16))*t,g=((a>>8)&255)+(((b>>8)&255)-((a>>8)&255))*t,bl=(a&255)+((b&255)-(a&255))*t;
    return 'rgb('+(r|0)+','+(g|0)+','+(bl|0)+')'}
  function drawBack(g,t,seas,prev,bl){var i,c0=BG[seas],c1=BG[prev];
    var gr=g.createLinearGradient(0,0,0,500);gr.addColorStop(0,mix(c1[0],c0[0],bl));gr.addColorStop(.6,mix(c1[1],c0[1],bl));gr.addColorStop(1,mix(c1[2],c0[2],bl));
    g.fillStyle=gr;g.fillRect(-20,-20,W+40,540);
    /* 해: 창호지 너머 빛 */
    var sp=sunPos(sunDisp),rg=g.createRadialGradient(sp[0],sp[1],4,sp[0],sp[1],120);
    rg.addColorStop(0,'rgba(255,240,190,.75)');rg.addColorStop(.25,'rgba(255,226,160,.35)');rg.addColorStop(1,'rgba(255,220,150,0)');
    g.fillStyle=rg;g.fillRect(sp[0]-130,sp[1]-130,260,260);
    /* 대나무 그림자(흔들림) */
    for(i=0;i<bamboo.length;i++){var b=bamboo[i],sw=Math.sin(t*.6+b.p)*6;g.save();g.translate(b.x,500);g.rotate(sw*.004);
      g.fillStyle='rgba(60,80,50,.075)';g.fillRect(-b.w/2,-500,b.w,500);
      for(var k=0;k<6;k++){var yy=-60-k*78;g.fillRect(-b.w/2-1,yy,b.w+2,3);
        g.save();g.translate(0,yy-4);g.rotate((k%2?.7:-.7)+Math.sin(t*1.1+k+b.p)*.12);g.beginPath();g.ellipse(18,0,22,4.5,0,0,7);g.fill();
        g.rotate(k%2?-.5:.5);g.beginPath();g.ellipse(16,0,18,3.6,0,0,7);g.fill();g.restore()}
      g.restore()}
    /* 창살 */
    g.strokeStyle='rgba(120,86,56,.22)';g.lineWidth=2;g.beginPath();
    for(i=1;i<6;i++){g.moveTo(i*60,30);g.lineTo(i*60,488)}for(i=1;i<8;i++){g.moveTo(0,30+i*58);g.lineTo(W,30+i*58)}g.stroke();
    /* 햇살 기둥 */
    g.save();g.globalCompositeOperation='lighter';var ba=.05+.02*Math.sin(t*.8);
    for(i=-1;i<=1;i++){g.fillStyle='rgba(255,236,190,'+ba+')';g.beginPath();g.moveTo(sp[0]+i*12-8,sp[1]);g.lineTo(sp[0]+i*12+8,sp[1]);
      g.lineTo(BX+i*70+40-(sp[0]-BX)*.2,BY-40);g.lineTo(BX+i*70-40-(sp[0]-BX)*.2,BY-40);g.fill()}g.restore();
    /* 해 원반 */
    g.fillStyle='rgba(255,214,120,.9)';g.beginPath();g.arc(sp[0],sp[1],13,0,7);g.fill();
    g.strokeStyle='rgba(255,190,90,.7)';g.lineWidth=2;for(i=0;i<8;i++){var an=i*.785+t*.3;g.beginPath();g.moveTo(sp[0]+Math.cos(an)*17,sp[1]+Math.sin(an)*17);g.lineTo(sp[0]+Math.cos(an)*22,sp[1]+Math.sin(an)*22);g.stroke()}
    /* 툇마루 */
    var fg=g.createLinearGradient(0,488,0,640);fg.addColorStop(0,'#a8774a');fg.addColorStop(1,'#6e4a2c');g.fillStyle=fg;g.fillRect(-20,488,W+40,170);
    g.fillStyle='#5a3b22';g.fillRect(-20,486,W+40,5);
    g.strokeStyle='rgba(60,36,18,.35)';g.lineWidth=1.5;g.beginPath();for(i=0;i<7;i++){var yy2=500+i*i*3.2+i*10;g.moveTo(0,yy2);g.lineTo(W,yy2)}g.stroke();
    g.strokeStyle='rgba(255,220,170,.12)';g.beginPath();for(i=0;i<7;i++){var y3=502+i*i*3.2+i*10;g.moveTo(0,y3);g.lineTo(W,y3)}g.stroke();
    /* 석등 */
    drawLantern(g,326,488);
  }
  function drawLantern(g,x,y){g.save();g.translate(x,y);
    g.fillStyle='rgba(40,30,20,.18)';g.beginPath();g.ellipse(0,2,26,5,0,0,7);g.fill();
    g.fillStyle='#9a958c';g.fillRect(-16,-10,32,10);g.fillRect(-6,-46,12,36);g.fillRect(-15,-54,30,8);
    g.fillStyle='#b3aea4';g.fillRect(-12,-76,24,22);g.fillStyle='#ffd98a';g.fillRect(-6,-71,12,12);
    g.fillStyle='rgba(255,214,120,.25)';g.beginPath();g.arc(0,-65,16,0,7);g.fill();
    g.fillStyle='#8a857c';g.beginPath();g.moveTo(-24,-76);g.lineTo(24,-76);g.lineTo(8,-90);g.lineTo(-8,-90);g.closePath();g.fill();
    g.fillStyle='#9a958c';g.beginPath();g.arc(0,-93,5,0,7);g.fill();
    g.fillStyle='#6f9a4a';[[-12,-77,7,2.4],[14,-11,6,2.6],[-10,-2,8,3]].forEach(function(e){g.beginPath();g.ellipse(e[0],e[1],e[2],e[3],0,0,7);g.fill()});
    g.restore()}
  function drawPot(g,t){var x=BX,y=BY;
    /* 받침대 */
    g.fillStyle='rgba(40,24,12,.28)';g.beginPath();g.ellipse(x,y+60,96,8,0,0,7);g.fill();
    g.fillStyle='#4e321d';g.fillRect(x-82,y+40,164,10);g.fillRect(x-74,y+50,10,12);g.fillRect(x+64,y+50,10,12);
    g.fillStyle='#6a4428';g.fillRect(x-82,y+40,164,3);
    /* 화분 */
    var pg=g.createLinearGradient(0,y,0,y+38);pg.addColorStop(0,'#5f7fa8');pg.addColorStop(1,'#34507a');
    g.fillStyle=pg;g.beginPath();g.moveTo(x-62,y-2);g.lineTo(x+62,y-2);g.lineTo(x+54,y+36);g.lineTo(x-54,y+36);g.closePath();g.fill();
    g.fillStyle='#2c4266';g.fillRect(x-48,y+36,14,5);g.fillRect(x+34,y+36,14,5);
    g.fillStyle='#7d9cc4';g.fillRect(x-64,y-4,128,6);
    /* 회전하면 움직이는 무늬 */
    g.save();g.beginPath();g.moveTo(x-60,y+3);g.lineTo(x+60,y+3);g.lineTo(x+54,y+34);g.lineTo(x-54,y+34);g.closePath();g.clip();
    var off=(sunDisp/1.05)*40;g.strokeStyle='rgba(220,232,250,.55)';g.lineWidth=1.6;
    for(var k=-3;k<=3;k++){var px=x+k*40-off;g.beginPath();g.arc(px,y+19,7,0,7);g.stroke();g.beginPath();g.arc(px,y+19,3,0,7);g.stroke()}
    g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x-60,y+4,120,5);g.restore()}
  function drawSoil(g){var x=BX,y=BY;g.fillStyle='#4a3424';g.beginPath();g.ellipse(x,y-1,58,5,0,0,7);g.fill();
    for(var i=0;i<14;i++){var mx=x-50+i*7.6,mr=3+hash(i+7)*3;g.fillStyle=i%2?'#6f9a46':'#86b052';g.beginPath();g.ellipse(mx,y-2-hash(i)*1.5,mr+2,mr*.8,0,0,7);g.fill()}}

  function bw(s){return Math.max(1.2,(s.r*1.6+(s.r>2.6?(s.r-2.6)*1.3:0))*SC)}
  function drawTree(g,seas){var i,s,segs=st.segs;
    /* 그림자 */
    g.strokeStyle='rgba(40,25,15,.18)';g.lineCap='round';
    for(i=0;i<segs.length;i++){s=segs[i];if(s.dl<.5)continue;g.lineWidth=bw(s);g.beginPath();g.moveTo(s.X0+3,s.Y0+2);g.lineTo(s.X1+3,s.Y1+2);g.stroke()}
    for(i=0;i<segs.length;i++){s=segs[i];if(s.dl<.5)continue;var w=bw(s);
      g.strokeStyle=s.age<2?'#7d6a3a':'#5e3e26';g.lineWidth=w;g.beginPath();g.moveTo(s.X0,s.Y0);g.lineTo(s.X1,s.Y1);g.stroke()}
    /* 결 하이라이트 + 껍질 무늬 */
    for(i=0;i<segs.length;i++){s=segs[i];if(s.dl<.5)continue;var w2=bw(s);if(w2<2.4)continue;
      var nx=Math.cos(s.da),ny=Math.sin(s.da);
      g.strokeStyle='rgba(190,150,110,.45)';g.lineWidth=w2*.28;g.beginPath();g.moveTo(s.X0-nx*w2*.22,s.Y0-ny*w2*.22);g.lineTo(s.X1-nx*w2*.22,s.Y1-ny*w2*.22);g.stroke();
      if(w2>4.5){g.strokeStyle='rgba(40,24,12,.4)';g.lineWidth=1;var n=Math.floor(s.dl/7);
        for(var q=0;q<n;q++){var f=(q+.5)/n,bx=s.X0+(s.X1-s.X0)*f,by2=s.Y0+(s.Y1-s.Y0)*f,o=(hash(s.id*7+q)-.5)*w2*.5;
          g.beginPath();g.moveTo(bx+nx*o,by2+ny*o);g.lineTo(bx+nx*o+Math.sin(s.da)*3,by2+ny*o-Math.cos(s.da)*3);g.stroke()}}}}
  function drawLeaves(g,seas,t){var lc=LEAF[seas],i,p,s,by=st.by,arr=[];
    for(i=0;i<leafCache.length;i++){p=leafCache[i];s=by[p[3]];if(!s)continue;var gs=s.gs==null?1:s.gs;if(gs<.05)continue;arr.push([s.X1,s.Y1,p[2]*SC*(.4+.6*gs),p[3]])}
    var k,pass,dark=['#2f5a2a','#24461f','#7a2a17','#a9b9cc'][seas];if(seas===3)g.globalAlpha=.4;
    for(pass=0;pass<4;pass++){g.fillStyle=pass===0?'rgba(30,40,20,.2)':pass===1?dark:lc[pass-1];
      for(i=0;i<arr.length;i++){p=arr[i];var r=p[2],id=p[3];
        for(k=0;k<5;k++){var a=hash(id*5+k)*6.28,dd=r*.5*hash(id+k*3),rr=r*(.45+.25*hash(id*3+k));
          var ox=Math.cos(a)*dd+Math.sin(t*1.5+id)*.8,oy=Math.sin(a)*dd*.75;
          if(pass===0){ox+=3;oy+=5;rr+=1}else if(pass===1){rr+=1.6;oy+=.8}else if(pass===3){ox-=rr*.25;oy-=rr*.32;rr*=.5}
          g.beginPath();g.arc(p[0]+ox,p[1]+oy,rr,0,7);g.fill()}}}
    g.globalAlpha=1;
    if(seas===3){for(i=0;i<arr.length;i++){p=arr[i];g.fillStyle='#8a5a3a';g.beginPath();g.arc(p[0],p[1],2.4,0,7);g.fill();
        g.fillStyle='rgba(255,255,255,.95)';g.beginPath();g.ellipse(p[0],p[1]-2.6,4.2,1.9,0,0,7);g.fill()}}
    if(seas===0){for(i=0;i<arr.length;i++){p=arr[i];for(k=0;k<3;k++){var a2=hash(p[3]*9+k)*6.28,d2=p[2]*.6*hash(p[3]+k*5);
        var bx=p[0]+Math.cos(a2)*d2,by2=p[1]+Math.sin(a2)*d2;g.fillStyle='#ffc2d4';g.beginPath();g.arc(bx,by2,2.6,0,7);g.fill();g.fillStyle='#fff3f6';g.beginPath();g.arc(bx-.6,by2-.6,1,0,7);g.fill()}}}}
  function drawWires(g){var i,s;for(i=0;i<st.segs.length;i++){s=st.segs[i];if(!s.wire)continue;
      var chain=[s];for(var j=i+1;j<st.segs.length;j++){var q=st.segs[j];if(q.limb===s.id&&chain.indexOf(st.by[q.p])>=0)chain.push(q)}
      chain.forEach(function(c){var n=Math.max(2,Math.floor(c.dl/3.6)),w=bw(c)*.5+1.6,nx=Math.cos(c.da),ny=Math.sin(c.da);
        g.beginPath();
        for(var q2=0;q2<n;q2++){var f=q2/n,f2=(q2+.75)/n,ax=c.X0+(c.X1-c.X0)*f,ay=c.Y0+(c.Y1-c.Y0)*f,bx=c.X0+(c.X1-c.X0)*f2,by=c.Y0+(c.Y1-c.Y0)*f2;
          g.moveTo(ax-nx*w,ay-ny*w);g.lineTo(bx+nx*w,by+ny*w)}
        g.strokeStyle='#6e3a16';g.lineWidth=3;g.stroke();g.strokeStyle='#e08a45';g.lineWidth=1.8;g.stroke();g.strokeStyle='rgba(255,226,180,.8)';g.lineWidth=.6;g.stroke()})}}
  function drawHighlight(g,id,col,wide){var s=st.by[id];if(!s)return;var Lm=wide?(st.by[s.limb]||s):null,sub=Lm?subtree(st,Lm.id):null;
    g.strokeStyle=col;g.lineCap='round';
    for(var i=0;i<st.segs.length;i++){var q=st.segs[i];if(sub?sub[q.id]:q.id===id){g.lineWidth=bw(q)+5;g.beginPath();g.moveTo(q.X0,q.Y0);g.lineTo(q.X1,q.Y1);g.stroke()}}}

  function drawCat(g,x,y,t){g.save();g.translate(x,y);var bob=Math.sin(t*1.6)*1.2,nod=nodT>0?Math.sin((.8-nodT)*16)*3:0,happy=mood==='happy',shock=mood==='shock',sad=mood==='sad';
    if(happy)bob-=Math.abs(Math.sin(t*9))*4;
    /* 방석 */
    g.fillStyle='rgba(30,20,10,.25)';g.beginPath();g.ellipse(0,30,34,6,0,0,7);g.fill();
    g.fillStyle='#8d3a3a';g.beginPath();g.ellipse(0,25,32,9,0,0,7);g.fill();g.fillStyle='#a84a48';g.beginPath();g.ellipse(0,22,30,7,0,0,7);g.fill();
    g.translate(0,bob);
    /* 꼬리 */
    g.strokeStyle='#7d7f86';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(14,18);g.quadraticCurveTo(34,14+Math.sin(t*2)*4,30,0+Math.sin(t*2)*3);g.stroke();
    /* 몸(가사) */
    g.fillStyle='#e0913a';g.beginPath();g.moveTo(-20,22);g.quadraticCurveTo(-22,-4,0,-6);g.quadraticCurveTo(22,-4,20,22);g.closePath();g.fill();
    g.fillStyle='#c46f22';g.beginPath();g.moveTo(-14,-2);g.lineTo(6,22);g.lineTo(-2,22);g.lineTo(-18,4);g.closePath();g.fill();
    g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.ellipse(-8,4,5,10,.3,0,7);g.fill();
    /* 머리 */
    g.save();g.translate(0,-16+nod);
    g.fillStyle='#9a9ca3';g.beginPath();g.moveTo(-15,-6);g.lineTo(-13,-22);g.lineTo(-4,-13);g.closePath();g.moveTo(15,-6);g.lineTo(13,-22);g.lineTo(4,-13);g.closePath();g.fill();
    g.fillStyle='#f2b8c0';g.beginPath();g.moveTo(-12,-9);g.lineTo(-12,-18);g.lineTo(-7,-13);g.closePath();g.moveTo(12,-9);g.lineTo(12,-18);g.lineTo(7,-13);g.closePath();g.fill();
    var hg=g.createRadialGradient(-4,-6,2,0,0,17);hg.addColorStop(0,'#b9bbc2');hg.addColorStop(1,'#8b8d95');g.fillStyle=hg;g.beginPath();g.ellipse(0,0,16,14,0,0,7);g.fill();
    g.fillStyle='#f4f1ea';g.beginPath();g.ellipse(0,6,8,5.5,0,0,7);g.fill();
    /* 눈 */
    var bl=blinkT<0;g.strokeStyle='#2b2320';g.fillStyle='#2b2320';g.lineWidth=1.8;g.lineCap='round';
    if(happy){g.beginPath();g.arc(-6,-1,3,3.4,6.0);g.stroke();g.beginPath();g.arc(6,-1,3,3.4,6.0);g.stroke()}
    else if(shock){g.fillStyle='#fff';g.beginPath();g.arc(-6,-1,3.6,0,7);g.arc(6,-1,3.6,0,7);g.fill();g.fillStyle='#2b2320';g.beginPath();g.arc(-6,-1,1.5,0,7);g.arc(6,-1,1.5,0,7);g.fill()}
    else if(bl||sipT<0){g.beginPath();g.moveTo(-9,-1);g.quadraticCurveTo(-6,1,-3,-1);g.moveTo(3,-1);g.quadraticCurveTo(6,1,9,-1);g.stroke()}
    else{g.beginPath();g.ellipse(-6,-1,2.2,3,0,0,7);g.ellipse(6,-1,2.2,3,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(-5.3,-2.2,.8,0,7);g.arc(6.7,-2.2,.8,0,7);g.fill()}
    if(sad){g.strokeStyle='#2b2320';g.beginPath();g.moveTo(-9,-6);g.lineTo(-4,-5);g.moveTo(9,-6);g.lineTo(4,-5);g.stroke()}
    g.fillStyle='#e8838f';g.beginPath();g.moveTo(-1.6,3.5);g.lineTo(1.6,3.5);g.lineTo(0,5.2);g.fill();
    g.strokeStyle='#2b2320';g.lineWidth=1.2;g.beginPath();
    if(shock){g.ellipse(0,8.5,1.8,2.2,0,0,7)}else if(sad){g.arc(0,10,2.5,3.5,5.9)}else{g.moveTo(-3,6.5);g.quadraticCurveTo(-1.5,8,0,6.5);g.quadraticCurveTo(1.5,8,3,6.5)}g.stroke();
    g.strokeStyle='rgba(60,50,45,.5)';g.lineWidth=.8;g.beginPath();g.moveTo(-9,5);g.lineTo(-17,3);g.moveTo(-9,7);g.lineTo(-17,8);g.moveTo(9,5);g.lineTo(17,3);g.moveTo(9,7);g.lineTo(17,8);g.stroke();
    g.fillStyle='rgba(255,130,140,.4)';g.beginPath();g.arc(-10,4,2.4,0,7);g.arc(10,4,2.4,0,7);g.fill();
    g.restore();
    /* 찻잔 */
    var sip=sipT<0?Math.min(1,-sipT*3,(1.6+sipT)*3):0,tx=-12+sip*8,ty=10-sip*14;
    g.fillStyle='#9a9ca3';g.beginPath();g.ellipse(tx+6,ty+6,4,3.4,0,0,7);g.fill();
    g.fillStyle='#e9e4d6';g.beginPath();g.moveTo(tx-6,ty-3);g.lineTo(tx+6,ty-3);g.lineTo(tx+4.5,ty+6);g.lineTo(tx-4.5,ty+6);g.closePath();g.fill();
    g.fillStyle='#6f9a46';g.beginPath();g.ellipse(tx,ty-3,6,1.6,0,0,7);g.fill();
    if(!sip){g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1.2;for(var k=0;k<2;k++){var ph=(t*.7+k*.5)%1;g.globalAlpha=1-ph;g.beginPath();g.moveTo(tx-2+k*4,ty-6-ph*12);g.quadraticCurveTo(tx+1+k*4,ty-10-ph*12,tx-2+k*4,ty-14-ph*12);g.stroke()}g.globalAlpha=1}
    g.restore()}

  function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function drawScissors(g,x,y,s,col){g.save();g.translate(x,y);g.scale(s,s);g.strokeStyle=col;g.lineWidth=2.2;g.lineCap='round';
    g.beginPath();g.arc(-5,6,3.5,0,7);g.stroke();g.beginPath();g.arc(5,6,3.5,0,7);g.stroke();g.beginPath();g.moveTo(-3,3.5);g.lineTo(6,-9);g.moveTo(3,3.5);g.lineTo(-6,-9);g.stroke();g.restore()}
  function drawCoil(g,x,y,s,col){g.save();g.translate(x,y);g.scale(s,s);g.strokeStyle=col;g.lineWidth=2;g.lineCap='round';g.beginPath();
    for(var i=0;i<5;i++){g.moveTo(-10+i*5,6);g.quadraticCurveTo(-6+i*5,-10,-4+i*5,6)}g.stroke();g.restore()}
  function drawSeasonIcon(g,x,y,seas,t){g.save();g.translate(x,y);
    if(seas===0){for(var i=0;i<5;i++){var a=i*1.2566+t*.4;g.fillStyle='#ff9fb8';g.beginPath();g.ellipse(Math.cos(a)*4.5,Math.sin(a)*4.5,4,2.6,a,0,7);g.fill()}g.fillStyle='#ffd36b';g.beginPath();g.arc(0,0,2.4,0,7);g.fill()}
    else if(seas===1){g.fillStyle='#5b9e4c';g.beginPath();g.ellipse(0,0,8,4.5,-.6,0,7);g.fill();g.strokeStyle='#d9f0c0';g.lineWidth=1;g.beginPath();g.moveTo(-5,3);g.lineTo(5,-3);g.stroke()}
    else if(seas===2){g.fillStyle='#dc6a32';g.beginPath();for(var k=0;k<5;k++){var b=k*1.2566-1.57;g.lineTo(Math.cos(b)*8,Math.sin(b)*8);g.lineTo(Math.cos(b+.63)*3.5,Math.sin(b+.63)*3.5)}g.fill()}
    else{g.strokeStyle='#7fa6d6';g.lineWidth=1.8;g.lineCap='round';g.beginPath();for(var j=0;j<3;j++){var c=j*1.047;g.moveTo(Math.cos(c)*7,Math.sin(c)*7);g.lineTo(-Math.cos(c)*7,-Math.sin(c)*7)}g.stroke()}
    g.restore()}

  function draw(g,a,dt){tG+=dt||0;var t=tG,i;ko=a.lang==='ko';if(!st)return;if(!dispOK)layoutDisp();
    var seas=curSeason(),prev=(seas+3)%4,bl=growT<1?growT:1;if(period===0&&growT>=1)bl=1;
    drawBack(g,t,seas,prev,bl);
    /* 목표 실루엣 */
    g.globalAlpha=.9+.1*Math.sin(t*2);g.drawImage(tcv,0,0);g.globalAlpha=1;
    drawPot(g,t);
    drawTree(g,seas);
    drawSoil(g);
    if(drag&&drag.ok){g.globalAlpha=.55;drawHighlight(g,drag.id,'rgba(230,140,70,.6)',true);g.globalAlpha=1}
    if(drag&&!drag.ok){drawHighlight(g,drag.id,'rgba(220,60,40,'+(.35+.25*Math.sin(t*20))+')',true)}
    drawLeaves(g,seas,t);
    drawWires(g);
    /* 바깥으로 삐져나온 끝눈 표시 (자르기 도구) */
    if(mode==='play'&&tool==='snip'&&lvN<3){g.fillStyle='rgba(214,70,50,'+(.55+.3*Math.sin(t*5))+')';
      for(i=0;i<st.segs.length;i++){var s=st.segs[i];if(s.ch.length||s.gs<1)continue;var c=cellAt(s.x1,s.y1);if(c<0||!T.inside[c]){g.beginPath();g.arc(s.X1,s.Y1,3.2,0,7);g.fill()}}}
    /* 가지치기 보너스 받은 눈 */
    for(i=0;i<st.segs.length;i++){var b=st.segs[i];if(b.boost>.08&&!b.ch.length){g.strokeStyle='rgba(140,220,90,'+(.4+.3*Math.sin(t*6+b.id))+')';g.lineWidth=2;g.beginPath();g.arc(b.X1,b.Y1,5+Math.min(5,b.boost*4),0,7);g.stroke()}}
    if(kbOn&&sel!=null&&st.by[sel]&&mode==='play'){drawHighlight(g,sel,wireMode?'rgba(214,120,50,.55)':'rgba(255,214,90,.6)',wireMode);
      var ss=st.by[sel];g.fillStyle='#fff';g.strokeStyle='#5a3b22';g.lineWidth=2;g.beginPath();g.arc((ss.X0+ss.X1)/2,(ss.Y0+ss.Y1)/2,4,0,7);g.fill();g.stroke()}
    /* 떨어지는 가지 */
    for(i=fallen.length-1;i>=0;i--){var f=fallen[i];f.t+=dt||0;if(f.t>1.3){fallen.splice(i,1);continue}f.vy+=500*(dt||0);
      var ox=f.vx*f.t,oy=f.vy*f.t*.5+f.t*f.t*120;f.ang+=f.vr*(dt||0);g.save();g.globalAlpha=1-f.t/1.3;g.translate(f.cx+ox,f.cy+oy);g.rotate(f.ang);
      g.strokeStyle='#5e3e26';g.lineWidth=f.w;g.lineCap='round';g.beginPath();g.moveTo(f.x0-f.cx,f.y0-f.cy);g.lineTo(f.x1-f.cx,f.y1-f.cy);g.stroke();
      if(f.leaf&&seas!==3){g.fillStyle=LEAF[seas][1];g.beginPath();g.arc(f.x1-f.cx,f.y1-f.cy,6,0,7);g.fill()}g.restore()}
    g.globalAlpha=1;
    /* 에너지 불씨 */
    for(i=sparks.length-1;i>=0;i--){var sp=sparks[i];sp.t+=(dt||0)*1.6;var tt=st.by[sp.id];if(sp.t>1||!tt){sparks.splice(i,1);continue}if(sp.t<0)continue;
      var u=sp.t,mx=(sp.x0+tt.X1)/2,my=Math.min(sp.y0,tt.Y1)-30,px=(1-u)*(1-u)*sp.x0+2*(1-u)*u*mx+u*u*tt.X1,py=(1-u)*(1-u)*sp.y0+2*(1-u)*u*my+u*u*tt.Y1;
      g.fillStyle='rgba(200,255,140,.9)';g.beginPath();g.arc(px,py,3,0,7);g.fill();g.fillStyle='rgba(200,255,140,.3)';g.beginPath();g.arc(px,py,7,0,7);g.fill()}
    /* 화분 돌리기 버튼 */
    for(i=0;i<2;i++){var R=ROT[i],dir=i?1:-1,can=i?st.sun<SUN.length-1:st.sun>0;g.save();g.translate(R[0],R[1]);g.globalAlpha=can?1:.4;
      g.fillStyle='rgba(40,24,12,.25)';g.beginPath();g.arc(1,3,18,0,7);g.fill();
      g.fillStyle='#f6ead2';g.strokeStyle='#7a5434';g.lineWidth=2;g.beginPath();g.arc(0,0,17,0,7);g.fill();g.stroke();
      g.scale(dir,1);g.strokeStyle='#c4733a';g.lineWidth=3;g.lineCap='round';g.beginPath();g.arc(0,3,9,Math.PI*1.05,Math.PI*1.85);g.stroke();
      g.fillStyle='#c4733a';g.beginPath();g.moveTo(10,-6);g.lineTo(3,-9);g.lineTo(8,0);g.closePath();g.fill();
      g.fillStyle='#ffc94d';g.beginPath();g.arc(0,3,3.4,0,7);g.fill();g.restore()}
    g.globalAlpha=1;
    drawCat(g,46,532,t);
    /* 계절 입자(전경 레이어) */
    for(i=0;i<parts.length;i++){var p=parts[i];p.x+=(p.vx+Math.sin(t+p.ph)*8)*(dt||0);p.y+=p.vy*(dt||0);p.r+=p.vr*(dt||0);
      if(p.y>H+10||p.x<-20){parts[i]=newPart(false);parts[i].x=Math.random()*(W+60);continue}
      g.save();g.translate(p.x,p.y);g.rotate(p.r);g.scale(p.s,p.s);
      if(seas===0){g.fillStyle='rgba(255,182,204,.85)';g.beginPath();g.ellipse(0,0,4,2.4,0,0,7);g.fill()}
      else if(seas===1){g.fillStyle='rgba(255,250,220,.5)';g.beginPath();g.arc(0,0,1.6,0,7);g.fill()}
      else if(seas===2){g.fillStyle=i%2?'rgba(220,100,50,.85)':'rgba(236,160,60,.85)';g.beginPath();g.ellipse(0,0,4.5,2.6,0,0,7);g.fill()}
      else{g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(0,0,2,0,7);g.fill()}
      g.restore()}
    drawUI(g,a,t,seas)}

  function drawUI(g,a,t,seas){var i;
    /* 상단 띠 */
    var tg=g.createLinearGradient(0,0,0,80);tg.addColorStop(0,'rgba(60,38,22,.92)');tg.addColorStop(1,'rgba(60,38,22,.78)');g.fillStyle=tg;g.fillRect(-20,-20,W+40,100);
    g.fillStyle='#c4733a';g.fillRect(-20,79,W+40,2);
    g.textAlign='left';g.fillStyle='#f6ead2';g.font='15'+FONT;
    var sty=STY[L.style]||STY.free;g.fillText((ko?'나무 ':'Tree ')+(lvN+1)+' · '+sty[ko?'ko':'en'],12,51);
    /* 계절 */
    drawSeasonIcon(g,W/2+38,46,seas,t);
    /* 시간 */
    var low=time<10;g.textAlign='right';g.font=(low?20+Math.sin(t*12)*2:18)+FONT;g.fillStyle=lastGain>0?'#9fdc7c':(low?'#ff8a6a':'#f6ead2');
    g.fillText('⏱ '+Math.ceil(time),W-12,52);
    if(lastGain>0){g.font='12'+FONT;g.fillText('+14',W-14,70)}
    g.textAlign='left';g.font='14'+FONT;g.fillStyle='#f6ead2';
    g.fillText(SNAME[seas][ko?'ko':'en'],W/2+50,51);
    /* 일치도 막대 */
    var mx=12,my=62,mw=236,v=sc?sc.s:0;
    g.fillStyle='rgba(255,255,255,.15)';roundRect(g,mx,my,mw,11,5.5);g.fill();
    var col=v>=.6?'#8fd16a':'#e9b04a';g.fillStyle=col;roundRect(g,mx,my,Math.max(11,mw*Math.min(1,v)),11,5.5);g.fill();
    g.fillStyle='rgba(255,255,255,.3)';g.fillRect(mx+5,my+2,Math.max(0,mw*Math.min(1,v)-10),2.5);
    [.6,.7,.8].forEach(function(q,k){var x=mx+mw*q;g.fillStyle=k?'rgba(255,214,90,.9)':'#fff';g.fillRect(x-1,my-2,2,15);
      if(k){drawStar(g,x,my-6,4);g.fill()}});
    g.font='13'+FONT;g.fillStyle='#f6ead2';g.textAlign='left';g.fillText((ko?'일치 ':'Match ')+Math.round(v*100)+'%',mx+mw+8,my+10);
    /* 아래 도구함 */
    g.fillStyle='rgba(50,30,16,.55)';roundRect(g,4,588,306,48,12);g.fill();
    var tools=[['snip',ko?'자르기':'Snip'],['wire',ko?'철사':'Wire']];
    for(i=0;i<2;i++){var r=BTN[tools[i][0]],on=tool===tools[i][0];
      g.fillStyle=on?'#f6ead2':'rgba(246,234,210,.18)';roundRect(g,r[0],r[1],r[2],r[3],10);g.fill();
      if(on){g.strokeStyle='#c4733a';g.lineWidth=2.5;roundRect(g,r[0],r[1],r[2],r[3],10);g.stroke()}
      var ic=on?'#5a3b22':'#f6ead2';if(i===0)drawScissors(g,r[0]+18,r[1]+20,.9,ic);else drawCoil(g,r[0]+18,r[1]+20,.75,on?'#c4733a':'#f6ead2');
      g.fillStyle=ic;g.font='15'+FONT;g.textAlign='left';g.fillText(tools[i][1],r[0]+33,r[1]+25)}
    var nb=BTN.next,last=period>=L.N,prog=mode==='play'?Math.min(1,seasonT/SEASON_T):0;
    g.fillStyle=last?'#e2793a':'#6f9a46';roundRect(g,nb[0],nb[1],nb[2],nb[3],10);g.fill();
    g.fillStyle='rgba(255,255,255,.22)';roundRect(g,nb[0],nb[1],nb[2]*prog,nb[3],10);g.fill();
    g.fillStyle='#fff';g.font='15'+FONT;g.textAlign='center';
    g.fillText(last?(ko?'완성! ✓':'Finish ✓'):(ko?'다음 계절 ▶':'Next season ▶'),nb[0]+nb[2]/2,nb[1]+19);
    for(i=0;i<=L.N;i++){var ddx=nb[0]+nb[2]/2+(i-L.N/2)*9;g.fillStyle=i<period?'#fff':i===period?'#ffe28a':'rgba(255,255,255,.35)';g.beginPath();g.arc(ddx,nb[1]+30,i===period?3:2.3,0,7);g.fill()}
    /* 힌트 */
    if(L.hint&&hintOn&&mode==='play'){var tx=L.hint[ko?'ko':'en'],fs=15;g.font=fs+FONT;while(g.measureText(tx).width>W-40&&fs>10){fs--;g.font=fs+FONT}var wd=g.measureText(tx).width+24;
      g.fillStyle='rgba(255,250,238,.92)';roundRect(g,W/2-wd/2,556,wd,26,13);g.fill();g.strokeStyle='rgba(122,84,52,.5)';g.lineWidth=1.5;g.stroke();
      g.fillStyle='#5a3b22';g.textAlign='center';g.fillText(tx,W/2,574)}
    if(kbOn&&mode==='play'){g.font='11'+FONT;g.fillStyle='rgba(255,250,238,.85)';g.textAlign='center';
      g.fillText(wireMode?(ko?'←→ 휘기 · W/Enter 끝':'←→ bend · W/Enter done'):(ko?'Tab 가지 · ↑↓ 위치 · S 자르기 · W 철사 · R 해 · N 다음':'Tab branch · ↑↓ move · S snip · W wire · R sun · N next'),W/2,551)}
    /* 결과 */
    if(mode==='clear'||mode==='fail'){var k2=Math.min(1,modeT*3);g.fillStyle='rgba(40,24,12,'+(.45*k2)+')';g.fillRect(0,250,W,120);
      g.textAlign='center';g.fillStyle='#fff';g.font='30'+FONT;
      g.fillText(mode==='clear'?(ko?'아름다워요!':'Beautiful!'):(ko?'모양이 아직 달라요':'Not quite the shape'),W/2,292);
      g.font='18'+FONT;g.fillText((ko?'일치 ':'Match ')+res.pct+'%'+(mode==='fail'?(ko?' · 60% 필요 · -4초':' · need 60% · -4s'):''),W/2,322);
      if(mode==='clear')for(i=0;i<3;i++){var on2=i<stars,sx=W/2+(i-1)*40,pop=Math.min(1,Math.max(0,modeT*4-i*.6));g.save();g.translate(sx,352);g.scale(.4+.6*pop,.4+.6*pop);
        g.fillStyle=on2?'#ffd36b':'rgba(255,255,255,.25)';g.strokeStyle=on2?'#c98a12':'rgba(255,255,255,.4)';g.lineWidth=2;drawStar(g,0,0,14);g.fill();g.stroke();g.restore()}}}
  function drawStar(g,x,y,r){g.beginPath();for(var i=0;i<10;i++){var a=i*Math.PI/5-Math.PI/2,q=i%2?r*.5:r;if(i)g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);else g.moveTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}g.closePath()}

  window.__bonsai={get st(){return st},get L(){return L},get period(){return period},get mode(){return mode},get sc(){return sc},get lvN(){return lvN},get time(){return time},get sel(){return sel},get tool(){return tool},get wireMode(){return wireMode},
    jump:function(n){load(n)},pick:function(x,y,r){var q=pick(x,y,r);return q?q.id:null},dump:function(){return JSON.stringify({segs:st.segs.map(function(q){return {id:q.id,p:q.p,a:q.a,len:q.len,age:q.age,limb:q.limb,side:q.side,wire:q.wire,cut:q.cut,boost:q.boost,born:q.born}}),next:st.next,r:st.r,sun:st.sun,tick:st.tick,s0:st.s0})},seg:function(id){var s=st&&st.by[id];return s?{x0:s.X0,y0:s.Y0,x1:s.X1,y1:s.Y1,mx:(s.X0+s.X1)/2,my:(s.Y0+s.Y1)/2,limb:s.limb}:null},api:API};

  SG.run({id:'bonsai',title:{ko:'분재 정원',en:'Bonsai Seasons'},
    how:{ko:'계절마다 나무가 자라요. 가지를 자르고 철사로 휘어 점선 모양에 맞춰 주세요!',en:'The tree grows every season. Snip and wire it to fill the dashed outline!'},
    init:init,update:update,draw:draw});
})();
