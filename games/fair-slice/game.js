/* 공평하게 한 판 (Fair Slice) — 직선 칼질 몇 번으로 음식을 나눠, 손님 모두가 똑같은 몫(넓이·토핑)을 받게 한다.
   기하(다각형 직선 분할, 신발끈 넓이, 점-다각형 판정), 공평 배분 탐색, 레벨 생성은 DOM 없이 돌도록 분리되어 있다
   (node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,FX=180,FY=310,TAU=Math.PI*2,D2R=Math.PI/180;
  function mulberry(a){a=a>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}

  /* ================= 기하 ================= */
  function area(P){var a=0,n=P.length;for(var i=0;i<n;i++){var p=P[i],q=P[(i+1)%n];a+=p.x*q.y-q.x*p.y}return a/2}
  function centroid(P){var a=0,cx=0,cy=0,n=P.length,i;
    for(i=0;i<n;i++){var p=P[i],q=P[(i+1)%n],c=p.x*q.y-q.x*p.y;a+=c;cx+=(p.x+q.x)*c;cy+=(p.y+q.y)*c}
    if(Math.abs(a)<1e-9){cx=0;cy=0;for(i=0;i<n;i++){cx+=P[i].x;cy+=P[i].y}return {x:cx/n,y:cy/n}}
    return {x:cx/(3*a),y:cy/(3*a)}}
  function pip(P,x,y){var c=false;for(var i=0,j=P.length-1;i<P.length;j=i++){var a=P[i],b=P[j];
    if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)c=!c}return c}
  function segDist(ax,ay,bx,by,px,py){var dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?((px-ax)*dx+(py-ay)*dy)/l:0;t=t<0?0:t>1?1:t;
    return Math.hypot(ax+dx*t-px,ay+dy*t-py)}
  function edgeDist(P,x,y){var m=1e9;for(var i=0,n=P.length;i<n;i++){var p=P[i],q=P[(i+1)%n],d=segDist(p.x,p.y,q.x,q.y,x,y);if(d<m)m=d}return m}
  /* 자르는 선 c=[x1,y1,x2,y2] → 단위 법선 n, 방향 u, 거리 d (부호 = n·p - d) */
  function lineOf(c){var dx=c[2]-c[0],dy=c[3]-c[1],l=Math.hypot(dx,dy);if(l<1e-6)return null;
    var ux=dx/l,uy=dy/l,nx=-uy,ny=ux;return {nx:nx,ny:ny,ux:ux,uy:uy,d:nx*c[0]+ny*c[1]}}
  /* 단순 다각형(오목 포함)을 직선으로 분할. 교점을 선을 따라 정렬해 짝지은 뒤, 교점에서 짝으로 건너뛰며 고리를 만든다.
     꼭짓점 f=1 이면 그 꼭짓점→다음 꼭짓점 변이 칼로 자른 면이다(단면 그리기용). */
  function splitPoly(P,L){
    var n=P.length,s=new Array(n),i,pos=0,neg=0;
    for(i=0;i<n;i++){var v=L.nx*P[i].x+L.ny*P[i].y-L.d;if(Math.abs(v)<1e-7)v=1e-7;s[i]=v;if(v>0)pos++;else neg++}
    if(!pos||!neg)return [P];
    var A=[],X=[];
    for(i=0;i<n;i++){var p=P[i],q=P[(i+1)%n],j=(i+1)%n;A.push({x:p.x,y:p.y,f:p.f||0,ix:false});
      if((s[i]>0)!==(s[j]>0)){var t=s[i]/(s[i]-s[j]),x=p.x+(q.x-p.x)*t,y=p.y+(q.y-p.y)*t;
        A.push({x:x,y:y,f:p.f||0,ix:true,t:x*L.ux+y*L.uy})}}
    for(i=0;i<A.length;i++){A[i].i=i;if(A[i].ix)X.push(A[i])}
    X.sort(function(a,b){return a.t-b.t});
    for(i=0;i+1<X.length;i+=2){X[i].pair=X[i+1].i;X[i+1].pair=X[i].i}
    var m=A.length,vis=new Array(m),out=[];
    for(var st=0;st<m;st++){if(vis[st]||A[st].ix)continue;
      var poly=[],cur=st,jumped=false,guard=0;
      do{var nd=A[cur];vis[cur]=true;
        if(nd.ix&&!jumped){poly.push({x:nd.x,y:nd.y,f:1});cur=nd.pair;jumped=true}
        else{poly.push({x:nd.x,y:nd.y,f:nd.f});cur=(cur+1)%m;jumped=false}
      }while(cur!==st&&++guard<m*3);
      if(poly.length>=3)out.push(poly)}
    return out}
  function cutAll(poly,cuts){var ps=[poly];
    for(var k=0;k<cuts.length;k++){var L=lineOf(cuts[k]);if(!L)continue;var nx=[];
      for(var i=0;i<ps.length;i++){var r=splitPoly(ps[i],L);for(var j=0;j<r.length;j++)if(Math.abs(area(r[j]))>1e-3)nx.push(r[j])}
      ps=nx}
    return ps}
  /* 선이 다각형을 실제로 가르는가 */
  function crosses(poly,c){var L=lineOf(c);if(!L)return false;var pos=0,neg=0;
    for(var i=0;i<poly.length;i++){var v=L.nx*poly[i].x+L.ny*poly[i].y-L.d;if(v>.5)pos++;else if(v<-.5)neg++}return pos>0&&neg>0}

  /* ================= 음식 모양 ================= */
  function mk(pts){var P=pts.map(function(p){return {x:p[0],y:p[1],f:0}}),x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    P.forEach(function(p){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y)});
    var cx=(x0+x1)/2,cy=(y0+y1)/2;P.forEach(function(p){p.x-=cx;p.y-=cy});if(area(P)<0)P.reverse();return P}
  function arc(cx,cy,rx,ry,a0,a1,n){var o=[];for(var i=0;i<=n;i++){var a=a0+(a1-a0)*i/n;o.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry])}return o}
  function rrect(w,h,r){var o=[],hw=w/2-r,hh=h/2-r;
    [[hw,hh,0],[-hw,hh,Math.PI/2],[-hw,-hh,Math.PI],[hw,-hh,Math.PI*1.5]].forEach(function(c){o=o.concat(arc(c[0],c[1],r,r,c[2],c[2]+Math.PI/2,5))});return o}
  function crescent(){var a=20*D2R,ox=Math.cos(a)*100,oy=Math.sin(a)*100,c=15,ri=Math.hypot(ox-c,oy),b=Math.atan2(oy,ox-c);
    return arc(0,0,100,100,a,TAU-a,80).concat(arc(c,0,ri,ri,-b,-TAU+b,70).slice(1,-1))}
  function bagel(){var g=26*D2R,o=arc(0,0,100,100,g,TAU-g,80),ri=46,gi=Math.asin(Math.sin(g)*100/ri*.98);
    var inner=arc(0,0,ri,ri,TAU-gi,gi,40);return o.concat(inner)}
  var FOODS={
    pizza:{poly:mk(arc(0,0,100,100,0,TAU*(95/96),95)),h:7,kinds:['pep','olive','mush'],steam:1,
      side:'#c98a3e',layers:[['#ffd66b',.3],['#d8412f',.15],['#f2d39a',.55]],name:{ko:'피자',en:'pizza'}},
    cake:{poly:mk(rrect(176,176,10)),h:22,kinds:['candle','berry'],
      side:'#f7c6d3',layers:[['#fff3f6',.16],['#f6c08a',.24],['#fff7e8',.12],['#f6c08a',.24],['#e85d75',.08],['#f6c08a',.16]],name:{ko:'케이크',en:'cake'}},
    sandwich:{poly:mk(rrect(240,128,22)),h:18,kinds:['olive','berry'],
      side:'#d9a25e',layers:[['#e8b26a',.22],['#7dc85a',.12],['#f29a9a',.2],['#ffd84d',.14],['#f3dcb0',.32]],name:{ko:'샌드위치',en:'sandwich'}},
    melon:{poly:mk(arc(0,0,122,92,0,TAU*(79/80),79)),h:14,kinds:['seed'],
      side:'#3f8f3a',layers:[['#ff5a64',.55],['#ffe9e0',.15],['#8fd16a',.12],['#2f7a2c',.18]],name:{ko:'수박',en:'watermelon'}},
    hexpie:{poly:mk(arc(0,0,110,110,Math.PI/6,Math.PI/6+TAU*5/6,5)),h:8,kinds:['pep','olive','mush'],steam:1,
      side:'#c98a3e',layers:[['#ffd66b',.3],['#d8412f',.15],['#f2d39a',.55]],name:{ko:'육각 피자',en:'hex pizza'}},
    crescent:{poly:mk(crescent()),h:12,kinds:['berry'],
      side:'#d79a4a',layers:[['#fff1c7',.35],['#ffcf6a',.25],['#e7b26a',.4]],name:{ko:'초승달 파이',en:'moon pie'}},
    bagel:{poly:mk(bagel()),h:16,kinds:['sesame'],steam:1,
      side:'#b8732e',layers:[['#f5e3c0',.85],['#b8732e',.15]],name:{ko:'베이글',en:'bagel'}}
  };
  var TOPR={pep:10,olive:7,mush:9,candle:6,berry:8,seed:5,sesame:4.5};
  var FOODA={};Object.keys(FOODS).forEach(function(k){FOODA[k]=Math.abs(area(FOODS[k].poly))});

  /* ================= 공평 판정 ================= */
  function pieceVals(L,pieces){return pieces.map(function(P){return L.fair.map(function(d){
    if(d==='area')return Math.abs(area(P));var c=0;for(var i=0;i<L.tops.length;i++){var t=L.tops[i];if(t.k===d&&pip(P,t.x,t.y))c++}return c})})}
  function targets(L){var tgt=[],tol=[];L.fair.forEach(function(d){
    if(d==='area'){tgt.push(FOODA[L.food]/L.n);tol.push(L.tol*FOODA[L.food])}
    else{tgt.push(L.tops.filter(function(t){return t.k===d}).length/L.n);tol.push(.49)}});return {tgt:tgt,tol:tol}}
  /* 조각 → 손님 배정 탐색(N<=6). fixed[i]>=0 이면 그 조각은 이미 그 손님 것. 손님은 대칭이므로 빈 손님은 하나만 시도한다. */
  function solveAssign(vals,N,tgt,tol,one,fixed){
    var P=vals.length,D=tgt.length,i,g,d;if(one&&P!==N)return null;if(P<N)return null;
    var sums=[],cnt=[],fixedG=[],asg=new Array(P),free=[],nodes=0;
    for(g=0;g<N;g++){sums.push(new Array(D).fill(0));cnt.push(0);fixedG.push(false)}
    for(i=0;i<P;i++){var f=fixed?fixed[i]:-1;if(f!=null&&f>=0){asg[i]=f;cnt[f]++;fixedG[f]=true;for(d=0;d<D;d++)sums[f][d]+=vals[i][d]}else free.push(i)}
    for(g=0;g<N;g++){if(one&&cnt[g]>1)return null;for(d=0;d<D;d++)if(sums[g][d]>tgt[d]+tol[d]+1e-9)return null}
    free.sort(function(a,b){return vals[b][0]-vals[a][0]});
    function dfs(k){if(++nodes>250000)return false;
      var emp=0;for(var q=0;q<N;q++)if(cnt[q]===0)emp++;if(emp>free.length-k)return false;
      if(k===free.length){for(var g2=0;g2<N;g2++){if(one&&cnt[g2]!==1)return false;for(var d2=0;d2<D;d2++)if(sums[g2][d2]<tgt[d2]-tol[d2]-1e-9)return false}return true}
      var i2=free[k],v=vals[i2],triedEmpty=false;
      for(var g3=0;g3<N;g3++){if(one&&cnt[g3]>0)continue;
        if(cnt[g3]===0&&!fixedG[g3]){if(triedEmpty)continue;triedEmpty=true}
        var ok=true;for(var d3=0;d3<D;d3++)if(sums[g3][d3]+v[d3]>tgt[d3]+tol[d3]+1e-9){ok=false;break}
        if(!ok)continue;
        for(d3=0;d3<D;d3++)sums[g3][d3]+=v[d3];cnt[g3]++;asg[i2]=g3;
        if(dfs(k+1))return true;
        for(d3=0;d3<D;d3++)sums[g3][d3]-=v[d3];cnt[g3]--}
      return false}
    return dfs(0)?asg:null}
  /* 공평 배정이 없을 때 보여 줄 '그나마 나은' 배정(욕심쟁이) */
  function greedyAssign(vals,N,tgt,fixed){var P=vals.length,asg=new Array(P),sums=[],g,i,d;
    for(g=0;g<N;g++)sums.push(new Array(tgt.length).fill(0));
    var free=[];for(i=0;i<P;i++){if(fixed&&fixed[i]>=0){asg[i]=fixed[i];for(d=0;d<tgt.length;d++)sums[fixed[i]][d]+=vals[i][d]}else free.push(i)}
    free.sort(function(a,b){return vals[b][0]-vals[a][0]});
    free.forEach(function(i2){var bg=0,bs=1e9;for(var g2=0;g2<N;g2++){var s=0;for(var d2=0;d2<tgt.length;d2++)s+=tgt[d2]?sums[g2][d2]/tgt[d2]:0;if(s<bs){bs=s;bg=g2}}
      asg[i2]=bg;for(var d3=0;d3<tgt.length;d3++)sums[bg][d3]+=vals[i2][d3]});return asg}
  function judge(L,cuts,fixed,margin){var pieces=cutAll(FOODS[L.food].poly,cuts),vals=pieceVals(L,pieces),T=targets(L),
    tol=T.tol.map(function(t,i){return L.fair[i]==='area'?t*(margin||1):t}),asg=solveAssign(vals,L.n,T.tgt,tol,L.one,fixed);
    return {pieces:pieces,vals:vals,tgt:T.tgt,tol:T.tol,asg:asg,ok:!!asg}}
  function sharesOf(vals,asg,N,D){var s=[];for(var g=0;g<N;g++)s.push(new Array(D).fill(0));
    for(var i=0;i<vals.length;i++)if(asg[i]>=0)for(var d=0;d<D;d++)s[asg[i]][d]+=vals[i][d];return s}

  /* ================= 레벨 ================= */
  function fanCuts(angles){return angles.map(function(a){var c=Math.cos(a*D2R)*300,s=Math.sin(a*D2R)*300;return [-c,-s,c,s]})}
  /* 방향 a(도)의 평행선 n-1개로 넓이를 n등분 */
  function stripCuts(poly,a,n){var ux=Math.cos(a*D2R),uy=Math.sin(a*D2R),nx=-uy,ny=ux,lo=1e9,hi=-1e9,tot=Math.abs(area(poly)),out=[];
    poly.forEach(function(p){var v=nx*p.x+ny*p.y;lo=Math.min(lo,v);hi=Math.max(hi,v)});
    function below(c){var cut=[nx*c-ux*400,ny*c-uy*400,nx*c+ux*400,ny*c+uy*400],L=lineOf(cut),s=0;
      splitPoly(poly,L).forEach(function(q){var m=centroid(q);if(nx*m.x+ny*m.y<c)s+=Math.abs(area(q))});return s}
    for(var j=1;j<n;j++){var a0=lo,a1=hi,goal=tot*j/n;for(var it=0;it<50;it++){var mid=(a0+a1)/2;if(below(mid)<goal)a0=mid;else a1=mid}
      var c=(a0+a1)/2;out.push([nx*c-ux*400,ny*c-uy*400,nx*c+ux*400,ny*c+uy*400])}
    return out}
  function defTol(n){return n<=2?.045:n===3?.04:n===4?.035:.03}
  var T=function(ko,en){return {ko:ko,en:en}};
  var SPECS=[
    {food:'pizza',n:2,k:1,fair:['area'],sol:{t:'fan',a:[0]},tol:.06,tip:T('선을 그어 똑같이 나눠요','Draw a line to split it fairly')},
    {food:'pizza',n:2,k:1,fair:['pep'],tops:{pep:3},sol:{t:'line',c:[-120,-62,120,8]},tip:T('이번엔 페퍼로니 개수만 똑같이!','This time only the pepperoni count matters')},
    {food:'pizza',n:4,k:2,fair:['area'],sol:{t:'fan',a:[0,90]},tip:T('넷이서! 칼질은 두 번','Four guests, two cuts')},
    {food:'pizza',n:3,k:2,fair:['area'],one:true,sol:{t:'strips',a:90},tip:T('셋이서 딱 한 조각씩 — 가운데는 함정!','Three guests, one slice each — the middle is a trap!')},
    {food:'pizza',n:2,k:1,fair:['area','pep'],tops:{pep:3},sol:{t:'fan',a:[33]},tip:T('크기도 토핑도 똑같이','Same size AND same pepperoni')},
    {food:'cake',n:4,k:2,fair:['area','candle'],tops:{candle:1},sol:{t:'fan',a:[22,112]},tip:T('정사각형은 어떤 십자로 잘라도 넓이가 같아요','Any cross through a square cake splits it evenly')},
    {food:'sandwich',n:3,k:2,fair:['area','olive'],tops:{olive:2},sol:{t:'strips',a:64},tip:T('비스듬히 잘라도 띠의 넓이는 그대로','Slanted strips keep the same area')},
    {food:'hexpie',n:2,k:1,fair:['pep','olive'],tops:{pep:2,olive:2},sol:{t:'line',c:[-120,40,120,-25]},tip:T('두 가지 토핑을 칼질 한 번에','Two toppings, one cut')},
    {food:'melon',n:3,k:2,fair:['area','seed'],tops:{seed:2},sol:{t:'strips',a:68},tip:T('씨앗까지 공평하게!','Share the seeds fairly too!')},
    {food:'crescent',n:3,k:1,fair:['area'],sol:{t:'line',c:[-68,-300,-68,300]},tol:.045,tip:T('칼질 한 번에 세 조각이 나올 수도?','Can one cut make three pieces?')},
    {food:'pizza',n:6,k:3,fair:['area'],sol:{t:'fan',a:[0,60,120]},tip:T('여섯 손님, 칼질 세 번','Six guests, three cuts')},
    {food:'pizza',n:5,k:3,fair:['area','mush'],tops:{mush:1},sol:{t:'fan',a:[12,84,156]},tip:T('다섯 명이면… 작은 조각 둘을 한 접시에?','Five guests… two small slices on one plate?')},
    {food:'bagel',n:2,k:1,fair:['area','sesame'],tops:{sesame:4},sol:{t:'strips',a:118},tip:T('구멍 난 베이글은 조각이 셋이 되기도 해요','A bagel can fall into three pieces')},
    {food:'pizza',n:4,k:2,fair:['area','pep','mush'],tops:{pep:2,mush:1},sol:{t:'fan',a:[17,107]},tip:T('마지막 코스! 전부 다 공평하게','Final course: everything fair!')}
  ];

  function solveCuts(sol,food,n){var poly=FOODS[food].poly;
    if(sol.t==='fan')return fanCuts(sol.a);if(sol.t==='strips')return stripCuts(poly,sol.a,n);return sol.c.map?[sol.c]:sol.c}
  /* 해답의 조각들을 손님에게 나눈 뒤, 각 손님의 조각 안에 토핑을 똑같이 뿌린다 → 그 해답으로 반드시 풀린다 */
  function placeTops(L,tops,R){
    var pieces=cutAll(FOODS[L.food].poly,L.sol),N=L.n,asg;
    if(L.fair.indexOf('area')>=0){var vals=pieces.map(function(P){return [Math.abs(area(P))]});
      asg=solveAssign(vals,N,[FOODA[L.food]/N],[FOODA[L.food]*.004],L.one,null);if(!asg)return false}
    else{if(pieces.length<N)return false;var ord=pieces.map(function(_,i){return i});
      for(var s=ord.length-1;s>0;s--){var j=Math.floor(R()*(s+1)),t=ord[s];ord[s]=ord[j];ord[j]=t}
      asg=new Array(pieces.length);ord.forEach(function(pi,k){asg[pi]=k<N?k:Math.floor(R()*N)})}
    L.tops=[];var kinds=Object.keys(tops);
    for(var ki=0;ki<kinds.length;ki++){var k=kinds[ki],c=tops[k],r=TOPR[k];
      for(var g=0;g<N;g++){var mine=pieces.filter(function(_,i){return asg[i]===g}),tot=0;
        mine.forEach(function(P){tot+=Math.abs(area(P))});
        for(var m=0;m<c;m++){var placed=false;
          for(var tr=0;tr<400&&!placed;tr++){var pick=R()*tot,P=mine[0];for(var q=0;q<mine.length;q++){pick-=Math.abs(area(mine[q]));if(pick<=0){P=mine[q];break}}
            var x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;P.forEach(function(p){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y)});
            var x=x0+R()*(x1-x0),y=y0+R()*(y1-y0);
            if(!pip(P,x,y)||edgeDist(P,x,y)<r+6)continue;
            if(m%2===0&&lineDist(L.sol,x,y)>r+24)continue;
            var clash=false;for(var o=0;o<L.tops.length;o++){var u=L.tops[o];if(Math.hypot(u.x-x,u.y-y)<r+TOPR[u.k]+5){clash=true;break}}
            if(clash)continue;L.tops.push({k:k,x:x,y:y,r:r,rot:R()*TAU});placed=true}
          if(!placed)return false}}}
    return true}
  function lineDist(cuts,x,y){var m=1e9;cuts.forEach(function(c){var l=lineOf(c);m=Math.min(m,Math.abs(l.nx*x+l.ny*y-l.d))});return m}
  function centreSets(k){return k===1?[[0],[90]]:k===2?[[0,90],[45,135]]:[[0,60,120],[30,90,150]]}
  /* 가운데를 지나는 단순한 칼질로 풀리면 안 되는 레벨인지 확인 */
  function trivialRate(L,R,samples){var hit=0;
    for(var s=0;s<samples;s++){var a=[];for(var j=0;j<L.k;j++)a.push(R()*180);if(judge(L,fanCuts(a)).ok)hit++}return hit/samples}
  function trivialOK(L,R){if(!L.check)return true;
    var sets=centreSets(L.k);for(var i=0;i<sets.length;i++)if(judge(L,fanCuts(sets[i])).ok)return false;
    return trivialRate(L,R,60)<=.2}
  function build(sp,seed){var R=mulberry(seed),food=FOODS[sp.food];
    var L={food:sp.food,n:sp.n,k:sp.k,fair:sp.fair.slice(),one:!!sp.one,tol:sp.tol||defTol(sp.n),tip:sp.tip||null,tops:[],
      check:!!(sp.tops||sp.one)&&sp.check!==false,seed:seed};
    L.sol=solveCuts(sp.sol,sp.food,sp.n);
    for(var at=0;at<80;at++){
      if(sp.tops&&!placeTops(L,sp.tops,R))continue;
      if(!judge(L,L.sol,null,.3).ok){if(!sp.tops)return null;continue}
      if(!trivialOK(L,R)){if(!sp.tops)return null;continue}
      return L}
    return null}
  /* 절차 생성: 먼저 해답 칼질과 배정을 정하고, 그에 맞춰 토핑을 놓는다 */
  var FAN=[[4,[0,90]],[3,[0,60]],[6,[0,60,120]],[5,[0,72,144]],[4,[0,90,135]],[3,[0,60,120]]];
  function genSpec(idx,R){var d=idx-SPECS.length,r=R(),foods=Object.keys(FOODS),sp,convex=['pizza','cake','sandwich','melon','hexpie'];
    function pick(a){return a[Math.floor(R()*a.length)]}
    function topsFor(food,maxKinds,lo,hi){var ks=FOODS[food].kinds.slice(),o={},nk=1+Math.floor(R()*Math.min(maxKinds,ks.length));
      for(var i=0;i<nk;i++){var k=ks.splice(Math.floor(R()*ks.length),1)[0];o[k]=lo+Math.floor(R()*(hi-lo+1))}return o}
    if(r<.25){var f=pick(foods),t=topsFor(f,2,2,3);sp={food:f,n:2,k:1,fair:['area'].concat(Object.keys(t)),tops:t,sol:{t:'strips',a:R()*180}}}
    else if(r<.5){var f2=pick(convex),n=R()<.6?3:4,t2=R()<.6?topsFor(f2,1,1,2):null;
      sp={food:f2,n:n,k:n-1,fair:['area'].concat(t2?Object.keys(t2):[]),tops:t2,one:!t2||R()<.4,sol:{t:'strips',a:R()*180}};if(!sp.tops)delete sp.tops}
    else if(r<.75){var fp=pick(FAN),rot=R()*180,t3=topsFor('pizza',2,1,fp[0]<=3?2:1);
      sp={food:'pizza',n:fp[0],k:fp[1].length,fair:['area'].concat(Object.keys(t3)),tops:t3,sol:{t:'fan',a:fp[1].map(function(a){return a+rot})}}}
    else{var f4=pick(foods),k=1+Math.floor(R()*3),n2=Math.min(4,2+Math.floor(R()*k*1.4)),t4=topsFor(f4,2,1,n2<=2?3:2),cuts=[];
      for(var j=0;j<k;j++){var a=R()*Math.PI,o=(R()-.5)*90,ux=Math.cos(a),uy=Math.sin(a);cuts.push([-uy*o-ux*300,ux*o-uy*300,-uy*o+ux*300,ux*o+uy*300])}
      sp={food:f4,n:n2,k:k,fair:Object.keys(t4),tops:t4,sol:{t:'line',c:cuts}}}
    sp.tol=defTol(sp.n)*Math.max(.75,1-d*.015);return sp}
  function genLevel(idx,seed){var R=mulberry((seed^Math.imul(idx+1,2654435761))>>>0);
    for(var tr=0;tr<60;tr++){var sp=genSpec(idx,R),L=build(sp,Math.floor(R()*1e9));if(L){L.gen=true;return L}}
    return build(SPECS[idx%SPECS.length],idx)}
  var built={};
  function getLevel(idx,seed){var L;if(idx<SPECS.length){if(!built[idx])built[idx]=build(SPECS[idx],1000+idx*17);L=built[idx]}else L=genLevel(idx,seed||0);
    return L}

  if(typeof module!=='undefined'&&module.exports){module.exports={area:area,centroid:centroid,pip:pip,splitPoly:splitPoly,cutAll:cutAll,lineOf:lineOf,
    FOODS:FOODS,FOODA:FOODA,solveAssign:solveAssign,judge:judge,fanCuts:fanCuts,stripCuts:stripCuts,SPECS:SPECS,getLevel:getLevel,genLevel:genLevel,
    build:build,trivialRate:trivialRate,centreSets:centreSets}}
  if(typeof SG==='undefined')return;
  /* ================= 게임 상태 ================= */
  var A_=null,L=null,li=0,cuts=[],pieces=[],time=0,mode='play',modeT=0,streak=0,runSeed=1,drag=null,prevDown=false,
      kb=false,kp=null,res=null,guests=[],tG=0,levelT=0,lastGain=0,foodCv=null,FS=0,cloth=null,knife=null,hintOff=false,
      leaves=[],motes=[],steam=[],msg=null,crunchT=0,total=0;
  var KB={l:0,r:0,u:0,d:0,q:0,e:0,sh:0,hold:0,queue:[]};
  var BTN={undo:{x:12,y:576,w:88,h:42},serve:{x:108,y:576,w:136,h:42}};
  var SPC=[
    {c:'#c08552',d:'#8a5634',m:'#f0d2ad',ear:'round'},{c:'#f6efe8',d:'#cdbcae',m:'#ffffff',ear:'long',inn:'#f8b6c6'},
    {c:'#f28b3a',d:'#b9581b',m:'#fff4e6',ear:'point'},{c:'#86cc6f',d:'#4f9444',m:'#d3efb9',ear:'frog'},
    {c:'#44506e',d:'#262f45',m:'#f7f6f1',ear:'none'},{c:'#a3a9b1',d:'#636870',m:'#f0f2f4',ear:'round',mask:1}];
  var ACC=['#ff6b6b','#3fa7f5','#40c463','#f7b500','#b65de8','#ff8a2b'];
  function H_(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function ko(){return A_&&A_.lang==='ko'}

  function guestPos(i,n){var a=Math.PI/2+TAU*i/n;return {x:FX+Math.cos(a)*148,y:FY+Math.sin(a)*190}}
  function platePos(G){var dx=FX-G.x,dy=FY-G.y,l=Math.hypot(dx,dy);return {x:G.x+dx/l*52,y:G.y+dy/l*52}}

  function setLevel(i){li=i;L=getLevel(i,runSeed);total=FOODA[L.food];cuts=[];res=null;drag=null;mode='play';modeT=0;levelT=0;hintOff=false;
    var R=mulberry(L.seed+7),ord=[0,1,2,3,4,5];for(var s=5;s>0;s--){var j=Math.floor(R()*(s+1)),t=ord[s];ord[s]=ord[j];ord[j]=t}
    guests=[];for(var g=0;g<L.n;g++){var p=guestPos(g,L.n);guests.push({x:p.x,y:p.y,sp:SPC[ord[g]],acc:ACC[ord[g]],mood:'idle',blink:R()*3,
      lx:FX,ly:FY,bub:null,rival:-1,pop:R()*.3})}
    kp={x1:FX-150,y1:FY,x2:FX+150,y2:FY};
    renderFood();rebuild(false)}
  function kerfOff(c,list,mult){var ox=0,oy=0;for(var k=0;k<list.length;k++){var l=lineOf(list[k]);if(!l)continue;var sd=l.nx*c.x+l.ny*c.y-l.d>0?1:-1;
    ox+=sd*l.nx*1.6*mult;oy+=sd*l.ny*1.6*mult}return {x:ox,y:oy}}
  function rebuild(fromCut){var polys=cutAll(FOODS[L.food].poly,cuts),done=cuts.length>=L.k,mult=done?4:1;
    pieces=polys.map(function(P){var c=centroid(P),o=kerfOff(c,cuts,mult),o0=fromCut?kerfOff(c,cuts.slice(0,-1),1):o;
      return {P:P,c:c,a:Math.abs(area(P)),hx:FX+c.x+o.x,hy:FY+c.y+o.y,d:{x:FX+c.x+o0.x,y:FY+c.y+o0.y,s:1},asg:-1}})}
  function homeOf(p){if(p.asg>=0){var G=guests[p.asg];return {x:p.hx+(G.x-p.hx)*.2,y:p.hy+(G.y-p.hy)*.2,s:.9}}return {x:p.hx,y:p.hy,s:1}}

  function init(a){A_=a;runSeed=(Math.random()*1e9)|0;time=55;streak=0;lastGain=0;msg=null;kb=false;KB.queue=[];
    if(!leaves.length){for(var i=0;i<5;i++)leaves.push({x:H_(i)*W,y:60+H_(i+9)*520,s:.8+H_(i+3)*.8,v:4+H_(i+5)*5,p:H_(i+7)*6});
      for(i=0;i<22;i++)motes.push({x:H_(i+40)*W,y:H_(i+60)*H,v:6+H_(i+80)*10,p:H_(i+90)*6})}
    setLevel(0)}

  /* ---------- 키보드(e.code) ---------- */
  if(typeof window!=='undefined'&&!window.__fairSliceKeys){window.__fairSliceKeys=1;
    function kd(e,v){var c=e.code,act=window.__fairSliceActive;
      if(c==='ArrowLeft')KB.l=v;else if(c==='ArrowRight')KB.r=v;else if(c==='ArrowUp')KB.u=v;else if(c==='ArrowDown')KB.d=v;
      else if(c==='KeyQ')KB.q=v;else if(c==='KeyE')KB.e=v;
      else if(v&&!e.repeat&&(c==='Space'||c==='KeyS'||c==='KeyZ'||c==='Enter')){if(act)KB.queue.push(c==='Space'||c==='Enter'?'cut':c==='KeyS'?'serve':'undo')}
      else return;
      KB.sh=e.shiftKey?1:0;if(act){e.preventDefault();if(v&&c!=='Enter')window.__fairSliceKb=1}}
    window.addEventListener('keydown',function(e){kd(e,1)});window.addEventListener('keyup',function(e){kd(e,0)})}

  /* ---------- 행동 ---------- */
  function lineScreenToLocal(x1,y1,x2,y2){return [x1-FX,y1-FY,x2-FX,y2-FY]}
  function tryCut(x1,y1,x2,y2){if(cuts.length>=L.k){A_.pop(FX,FY-130,ko()?'칼질을 다 썼어요':'No cuts left','#e8590c');A_.beep(200,.12,'square');return}
    var c=lineScreenToLocal(x1,y1,x2,y2);if(Math.hypot(c[2]-c[0],c[3]-c[1])<24)return;
    if(!crosses(FOODS[L.food].poly,c)){A_.pop(FX,FY-130,ko()?'빗나갔어요!':'Missed!','#e8590c');A_.beep(240,.1,'triangle');return}
    var l=lineOf(c),ts=[];FOODS[L.food].poly.forEach(function(p){ts.push(p.x*l.ux+p.y*l.uy)});
    var t0=Math.min.apply(null,ts)-26,t1=Math.max.apply(null,ts)+26,px=l.nx*l.d,py=l.ny*l.d;
    knife={c:c,ax:FX+px+l.ux*t0,ay:FY+py+l.uy*t0,bx:FX+px+l.ux*t1,by:FY+py+l.uy*t1,t:0};mode='knife';crunchT=0;hintOff=true}
  function finishCut(){cuts.push(knife.c);rebuild(true);var mx=(knife.ax+knife.bx)/2,my=(knife.ay+knife.by)/2;
    A_.burst(mx,my,FOODS[L.food].layers[0][0],8);A_.shake(3);A_.beep(150,.08,'triangle');knife=null;mode='play';
    if(cuts.length>=L.k){A_.pop(FX,FY-140,ko()?'이제 나눠 줘요!':'Now serve it!','#ff7a3d');A_.beep(880,.08,'triangle')}}
  function undo(){if(mode!=='play'||!cuts.length)return;cuts.pop();rebuild(false);A_.beep(420,.06,'triangle');A_.beep(300,.08,'triangle')}
  function serve(){if(mode!=='play')return;
    if(!cuts.length){A_.pop(FX,FY-130,ko()?'먼저 잘라 주세요':'Cut it first','#e8590c');A_.beep(240,.1,'triangle');return}
    var vals=pieceVals(L,pieces.map(function(p){return p.P})),T2=targets(L),fixed=pieces.map(function(p){return p.asg}),
        asg=solveAssign(vals,L.n,T2.tgt,T2.tol,L.one,fixed),ok=!!asg;if(!asg)asg=greedyAssign(vals,L.n,T2.tgt,fixed);
    var D=L.fair.length,sh=sharesOf(vals,asg,L.n,D);
    pieces.forEach(function(p,i){p.asg=asg[i]});
    var per=guests.map(function(_,g){var off=-1,worst=0;for(var d=0;d<D;d++){var dv=(sh[g][d]-T2.tgt[d])/(T2.tol[d]||1);
      if(dv<-1&&-dv>worst){worst=-dv;off=d}}return off});
    var cnt=new Array(L.n).fill(0);pieces.forEach(function(p){p.slot=cnt[p.asg]++});
    guests.forEach(function(G,g){var d=per[g]>=0?per[g]:0,tt=T2.tgt[d]*L.n;G.bub={frac:tt?sh[g][d]/tt:0,dim:L.fair[d],val:sh[g][d],tgt:T2.tgt[d]};
      G.short=per[g]>=0;G.rival=-1;
      if(G.short){var bm=-1,bv=-1;for(var q=0;q<L.n;q++)if(q!==g&&sh[q][d]>bv){bv=sh[q][d];bm=q}G.rival=bm}});
    var prec=5;if(ok&&L.fair[0]==='area'){var md=0;for(var g=0;g<L.n;g++)md=Math.max(md,Math.abs(sh[g][0]-T2.tgt[0])/T2.tol[0]);prec=Math.max(0,Math.min(5,Math.round(5*(1-md))))}
    res={ok:ok,prec:prec,reacted:false};mode='judge';modeT=0;A_.sfx('tap')}
  function react(){res.reacted=true;
    if(res.ok){var unused=L.k-cuts.length,pts=10+res.prec+unused*3+Math.min(streak,5)*2;streak++;A_.add(pts);A_.sfx('win');
      time=Math.min(70,time+14);lastGain=1;
      guests.forEach(function(G){G.mood='happy';A_.burst(G.x,G.y-10,G.acc,8)});
      for(var i=0;i<4;i++)A_.burst(FX+(H_(tG+i)-.5)*160,FY-60+(H_(tG+i+3)-.5)*80,ACC[i],10);
      A_.pop(FX,FY-20,'+'+pts,'#ff7a3d');
      msg={t:0,s:res.prec>=5?(ko()?'완벽하게 공평해요!':'Perfectly fair!'):unused?(ko()?'칼질 아낌 +'+unused*3:'Cuts saved +'+unused*3):(ko()?'모두 만족!':'Everyone\'s happy!')}}
    else{streak=0;time=Math.max(0,time-3);A_.sfx('hit');A_.shake(8);A_.pop(W-40,58,'-3s','#ff6b6b');
      guests.forEach(function(G){G.mood=G.short?'grumpy':'smug';if(G.short)A_.pop(G.x,G.y-34,ko()?'흥!':'Hmph!','#ff8a8a')});
      msg={t:0,s:ko()?'누군가 손해를 봤어요…':'Somebody got shortchanged…'}}}

  /* ---------- 갱신 ---------- */
  function hitPiece(x,y){for(var i=pieces.length-1;i>=0;i--){var p=pieces[i],lx=(x-p.d.x)/p.d.s+p.c.x,ly=(y-p.d.y)/p.d.s+p.c.y;if(pip(p.P,lx,ly))return i}return -1}
  function inBtn(b,x,y){return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h}
  function update(dt,inp,a){A_=a;tG+=dt;levelT+=dt;modeT+=dt;if(lastGain>0)lastGain-=dt;if(msg){msg.t+=dt;if(msg.t>2.2)msg=null}
    window.__fairSliceActive=1;if(window.__fairSliceKb){window.__fairSliceKb=0;kb=true}
    var pressed=inp.tap&&!inp.up&&inp.x!=null,released=(prevDown&&!inp.down)||(pressed&&!inp.down);prevDown=inp.down;
    if(mode==='play'||mode==='knife'){time-=dt;if(time<=0){time=0;window.__fairSliceActive=0;a.over();return}}
    /* 포인터 */
    if(pressed&&inp.x!=null){kb=false;var x=inp.x,y=inp.y;
      if(inBtn(BTN.undo,x,y)){undo();drag=null}
      else if(inBtn(BTN.serve,x,y)){serve();drag=null}
      else if(mode==='play'){
        var hp=cuts.length>=L.k?hitPiece(x,y):-1;
        if(hp>=0){var p=pieces[hp];pieces.splice(hp,1);pieces.push(p);drag={t:'piece',p:p,ox:p.d.x-x,oy:p.d.y-y,x0:x,y0:y,moved:false};a.beep(520,.04,'triangle')}
        else drag={t:'cut',x0:x,y0:y,x1:x,y1:y}}}
    if(drag&&inp.down&&inp.x!=null){if(drag.t==='cut'){drag.x1=inp.x;drag.y1=inp.y}
      else{drag.p.d.x=inp.x+drag.ox;drag.p.d.y=inp.y+drag.oy;drag.p.d.s=.9;if(Math.hypot(inp.x-drag.x0,inp.y-drag.y0)>8)drag.moved=true}}
    if(released&&drag){
      if(drag.t==='cut'){if(mode==='play'&&Math.hypot(drag.x1-drag.x0,drag.y1-drag.y0)>=24)tryCut(drag.x0,drag.y0,drag.x1,drag.y1)}
      else{var pp=drag.p,best=-1,bd=80;
        if(drag.moved){guests.forEach(function(G,g){var pl=platePos(G),d=Math.min(Math.hypot(pp.d.x-G.x,pp.d.y-G.y),Math.hypot(pp.d.x-pl.x,pp.d.y-pl.y));if(d<bd){bd=d;best=g}});
          pp.asg=best;if(best>=0){a.beep(700,.05,'triangle');a.beep(940,.06,'triangle');guests[best].pop=.35}else a.beep(330,.05,'triangle')}
        else{pp.asg=-1;a.beep(330,.05,'triangle')}}
      drag=null}
    /* 키보드 */
    if(kb&&mode==='play'){var mv=KB.l||KB.r||KB.u||KB.d;KB.hold=mv?KB.hold+dt:0;var sp=(36+Math.min(1,KB.hold/.9)*150)*dt,
        dx=(KB.r-KB.l)*sp,dy=(KB.d-KB.u)*sp;
      if(KB.sh){kp.x2=Math.max(0,Math.min(W,kp.x2+dx));kp.y2=Math.max(40,Math.min(H-60,kp.y2+dy))}
      else{kp.x1=Math.max(0,Math.min(W,kp.x1+dx));kp.y1=Math.max(40,Math.min(H-60,kp.y1+dy))}
      var rot=(KB.e-KB.q)*1.1*dt;if(rot){var mx=(kp.x1+kp.x2)/2,my=(kp.y1+kp.y2)/2,cs=Math.cos(rot),sn=Math.sin(rot);
        [['x1','y1'],['x2','y2']].forEach(function(k){var ex=kp[k[0]]-mx,ey=kp[k[1]]-my;kp[k[0]]=mx+ex*cs-ey*sn;kp[k[1]]=my+ex*sn+ey*cs})}}
    while(KB.queue.length){var q=KB.queue.shift();kb=true;if(mode!=='play')continue;
      if(q==='cut')tryCut(kp.x1,kp.y1,kp.x2,kp.y2);else if(q==='serve')serve();else undo()}
    /* 칼 애니메이션 + 바삭 소리 */
    if(mode==='knife'&&knife){knife.t+=dt/.3;crunchT-=dt;
      if(crunchT<=0){crunchT=.026;a.beep(70+Math.random()*150,.035,'sawtooth');if(Math.random()<.5)a.beep(1400+Math.random()*1600,.012,'square')}
      if(knife.t>=1)finishCut()}
    /* 판정 연출 */
    if(mode==='judge'){if(!res.reacted&&modeT>.5)react();
      if(res.ok&&modeT>.75&&modeT<1.9&&Math.floor(modeT*7)!==Math.floor((modeT-dt)*7)){guests.forEach(function(G){A_.burst(G.x,G.y+6,FOODS[L.food].layers[0][0],2)});a.beep(240+Math.random()*80,.04,'triangle')}
      if(modeT>(res.ok?2.1:2.2)){if(res.ok){setLevel(li+1)}
        else{mode='play';pieces.forEach(function(p){p.asg=-1});guests.forEach(function(G){G.mood='idle';G.bub=null})}}}
    /* 조각 위치 보간 */
    pieces.forEach(function(p){if(drag&&drag.p===p)return;var tx,ty,ts;
      if(mode==='judge'&&p.asg>=0){var G=guests[p.asg],pl=platePos(G),sz=Math.sqrt(p.a);ts=Math.min(.55,30/sz+.08);
        tx=pl.x+(p.slot%3-1)*7*(p.slot>0?1:0);ty=pl.y-p.slot*5;
        if(res.ok&&modeT>.8){var k2=Math.min(1,(modeT-.8)/1.1);ts*=1-k2*.9;tx+=(G.x-tx)*k2*.6;ty+=(G.y-ty)*k2*.6}}
      else{var h=homeOf(p);tx=h.x;ty=h.y;ts=h.s}
      var k=1-Math.pow(.0005,dt);p.d.x+=(tx-p.d.x)*k;p.d.y+=(ty-p.d.y)*k;p.d.s+=(ts-p.d.s)*k});
    /* 손님 시선과 깜빡임 */
    var look=null;if(drag&&drag.t==='cut')look={x:drag.x1,y:drag.y1};else if(drag)look={x:drag.p.d.x,y:drag.p.d.y};
    else if(knife)look={x:knife.ax+(knife.bx-knife.ax)*knife.t,y:knife.ay+(knife.by-knife.ay)*knife.t};else if(kb&&mode==='play')look={x:(kp.x1+kp.x2)/2,y:(kp.y1+kp.y2)/2};
    guests.forEach(function(G){G.blink-=dt;if(G.blink<-.13)G.blink=1.5+Math.random()*3;G.pop=Math.max(0,G.pop-dt);
      var tx=FX,ty=FY;if(G.mood==='grumpy'&&G.rival>=0){tx=guests[G.rival].x;ty=guests[G.rival].y}else if(look){tx=look.x;ty=look.y}
      G.lx+=(tx-G.lx)*Math.min(1,dt*10);G.ly+=(ty-G.ly)*Math.min(1,dt*10)})}

  /* ================= 그리기 ================= */
  function path(g,P,ox,oy){g.beginPath();for(var i=0;i<P.length;i++){var p=P[i];if(i)g.lineTo(p.x+(ox||0),p.y+(oy||0));else g.moveTo(p.x+(ox||0),p.y+(oy||0))}g.closePath()}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function makeCloth(){cloth=document.createElement('canvas');cloth.width=W;cloth.height=H;var c=cloth.getContext('2d'),i,j;
    var gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#fff4e2');gr.addColorStop(1,'#f6e2c4');c.fillStyle=gr;c.fillRect(0,0,W,H);
    c.fillStyle='rgba(226,86,86,.2)';for(i=-1;i<W/24+1;i++)if(i%2===0)c.fillRect(i*24+6,0,24,H);for(j=0;j<H/24+1;j++)if(j%2===0)c.fillRect(0,j*24+6,W,24);
    c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=1;for(i=0;i<W;i+=4){c.beginPath();c.moveTo(i,0);c.lineTo(i,H);c.stroke()}
    for(i=0;i<1800;i++){c.fillStyle=H_(i)>.5?'rgba(255,255,255,.18)':'rgba(120,60,40,.05)';c.fillRect(H_(i+.3)*W,H_(i+.7)*H,1+H_(i+.1)*1.5,1)}
    /* 부스러기 */
    for(i=0;i<40;i++){var x=H_(i+500)*W,y=40+H_(i+600)*(H-40),r=.8+H_(i+700)*2;if(Math.hypot(x-FX,y-FY)<140)continue;
      c.fillStyle=['#e0a85a','#c98a3e','#f3d39a'][i%3];c.beginPath();c.ellipse(x,y,r*1.3,r,H_(i)*3,0,7);c.fill()}
    var vg=c.createRadialGradient(FX,FY,120,FX,FY,460);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(90,40,20,.25)');c.fillStyle=vg;c.fillRect(0,0,W,H)}
  function drawCup(g,x,y,col,t){g.fillStyle='rgba(80,40,20,.18)';g.beginPath();g.ellipse(x+4,y+6,19,17,0,0,7);g.fill();
    g.fillStyle='#fdfdfd';g.beginPath();g.arc(x,y,18,0,7);g.fill();g.strokeStyle='rgba(120,140,170,.6)';g.lineWidth=2;g.stroke();
    var gr=g.createRadialGradient(x-4,y-4,2,x,y,15);gr.addColorStop(0,'#fff');gr.addColorStop(.3,col);gr.addColorStop(1,col);g.fillStyle=gr;g.beginPath();g.arc(x,y,14,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.7)';for(var i=0;i<3;i++){g.beginPath();g.arc(x-5+i*5,y+3-((t*6+i*4)%12),1.4,0,7);g.fill()}
    g.strokeStyle='#ff7aa2';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(x+3,y-2);g.lineTo(x+16,y-22);g.lineTo(x+22,y-24);g.stroke();
    g.strokeStyle='#fff';g.lineWidth=1.4;g.setLineDash([3,3]);g.beginPath();g.moveTo(x+3,y-2);g.lineTo(x+16,y-22);g.stroke();g.setLineDash([])}

  /* ---------- 토핑 ---------- */
  function drawTop(g,t){var x=t.x,y=t.y,r=t.r;g.save();g.translate(x,y);g.rotate(t.rot);
    g.fillStyle='rgba(90,30,10,.22)';g.beginPath();g.ellipse(1.5,2.5,r*1.02,r*.95,0,0,7);g.fill();
    if(t.k==='pep'){var gr=g.createRadialGradient(-3,-3,1,0,0,r);gr.addColorStop(0,'#e8604a');gr.addColorStop(1,'#a8281c');g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,7);g.fill();
      g.fillStyle='rgba(255,220,190,.55)';[[-3,-2],[4,1],[0,5],[-5,4],[3,-5]].forEach(function(s){g.beginPath();g.arc(s[0],s[1],1.1,0,7);g.fill()});
      g.strokeStyle='rgba(110,20,10,.5)';g.lineWidth=1.2;g.beginPath();g.arc(0,0,r-.6,0,7);g.stroke()}
    else if(t.k==='olive'){g.fillStyle='#2b2b30';g.beginPath();g.arc(0,0,r,0,7);g.fill();g.fillStyle='#ffd66b';g.beginPath();g.arc(0,0,r*.42,0,7);g.fill();
      g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=1.5;g.beginPath();g.arc(0,0,r*.72,3.6,4.8);g.stroke()}
    else if(t.k==='mush'){g.fillStyle='#f3e6cf';g.strokeStyle='#9c7a52';g.lineWidth=1.4;g.beginPath();g.moveTo(-r,-1);g.quadraticCurveTo(-r,-r*1.05,0,-r*1.05);
      g.quadraticCurveTo(r,-r*1.05,r,-1);g.lineTo(r*.4,-1);g.lineTo(r*.45,r*.9);g.lineTo(-r*.45,r*.9);g.lineTo(-r*.4,-1);g.closePath();g.fill();g.stroke();
      g.fillStyle='rgba(156,122,82,.35)';g.beginPath();g.ellipse(0,-r*.55,r*.55,r*.2,0,0,7);g.fill()}
    else if(t.k==='candle'){g.rotate(-t.rot);g.fillStyle='#fff';g.fillRect(-3,-15,6,15);g.fillStyle='#5ab0f0';for(var i=0;i<3;i++){g.save();g.beginPath();g.rect(-3,-15,6,15);g.clip();
        g.translate(0,-3-i*5);g.rotate(-.5);g.fillRect(-6,-1.2,12,2.4);g.restore()}
      g.fillStyle='#e6eef7';g.beginPath();g.ellipse(0,0,3,1.4,0,0,7);g.fill();g.strokeStyle='#333';g.lineWidth=1;g.beginPath();g.moveTo(0,-15);g.lineTo(0,-18);g.stroke()}
    else if(t.k==='berry'){g.fillStyle='#e8344a';g.beginPath();g.moveTo(0,r);g.bezierCurveTo(-r*1.3,r*.1,-r*.8,-r,0,-r*.75);g.bezierCurveTo(r*.8,-r,r*1.3,r*.1,0,r);g.fill();
      g.fillStyle='#ffe28a';[[-3,0],[3,0],[0,3.5],[-2,-3.5],[2.5,-3.5]].forEach(function(s){g.beginPath();g.arc(s[0],s[1],.8,0,7);g.fill()});
      g.fillStyle='#3fae4a';for(var j=0;j<4;j++){g.save();g.translate(0,-r*.75);g.rotate(-1.2+j*.8);g.beginPath();g.ellipse(0,-3,1.6,3.5,0,0,7);g.fill();g.restore()}}
    else if(t.k==='seed'){g.fillStyle='#1d1612';g.beginPath();g.moveTo(0,-r*1.4);g.quadraticCurveTo(r,0,0,r);g.quadraticCurveTo(-r,0,0,-r*1.4);g.fill();
      g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.ellipse(-1,-1.5,1,2,0,0,7);g.fill()}
    else if(t.k==='sesame'){g.fillStyle='#fff6dc';g.strokeStyle='#c9a66a';g.lineWidth=1;g.beginPath();g.ellipse(0,0,r*.6,r,0,0,7);g.fill();g.stroke()}
    g.restore()}

  /* ---------- 음식 미리 그리기 ---------- */
  function renderFood(){var F=FOODS[L.food],P=F.poly,ext=0;P.forEach(function(p){ext=Math.max(ext,Math.abs(p.x),Math.abs(p.y))});
    FS=Math.ceil(ext*2+24);var sc=2;foodCv=document.createElement('canvas');foodCv.width=FS*sc;foodCv.height=FS*sc;
    var g=foodCv.getContext('2d'),R=mulberry(L.seed+3),i;g.scale(sc,sc);g.translate(FS/2,FS/2);
    function scaled(k){return P.map(function(p){return {x:p.x*k,y:p.y*k}})}
    function spots(n,col,rmin,rmax,clipP){g.save();if(clipP){path(g,clipP);g.clip()}g.fillStyle=col;
      for(var s=0;s<n;s++){var x=(R()-.5)*ext*2,y=(R()-.5)*ext*2,r=rmin+R()*(rmax-rmin);g.beginPath();g.ellipse(x,y,r*1.2,r,R()*3,0,7);g.fill()}g.restore()}
    var gr;
    if(L.food==='pizza'||L.food==='hexpie'){gr=g.createRadialGradient(0,0,40,0,0,ext);gr.addColorStop(0,'#f3c47a');gr.addColorStop(.8,'#e0a050');gr.addColorStop(1,'#b8742e');
      g.fillStyle=gr;path(g,P);g.fill();var inner=scaled(.87);
      g.fillStyle='#d8412f';path(g,scaled(.9));g.fill();
      gr=g.createRadialGradient(-20,-20,10,0,0,ext);gr.addColorStop(0,'#fff0a8');gr.addColorStop(.7,'#ffd25e');gr.addColorStop(1,'#f5a83a');g.fillStyle=gr;path(g,inner);g.fill();
      spots(26,'rgba(216,65,47,.35)',2,5,inner);spots(30,'rgba(196,110,30,.35)',1.5,4,inner);spots(18,'rgba(255,255,230,.6)',2,5,inner);
      g.strokeStyle='rgba(255,230,170,.5)';g.lineWidth=2;g.save();path(g,P);g.clip();for(i=0;i<14;i++){var a=R()*TAU,rr2=ext*.95;g.beginPath();g.arc(0,0,rr2,a,a+.25);g.stroke()}g.restore()}
    else if(L.food==='cake'){gr=g.createLinearGradient(-90,-90,90,90);gr.addColorStop(0,'#ffe0e8');gr.addColorStop(1,'#f7a8bd');g.fillStyle=gr;path(g,P);g.fill();
      g.fillStyle='#fff7fa';for(i=0;i<P.length;i++){var p=P[i],q=P[(i+1)%P.length];for(var s=0;s<1;s+=.34){var x=p.x+(q.x-p.x)*s,y=p.y+(q.y-p.y)*s;g.beginPath();g.arc(x*.9,y*.9,5,0,7);g.fill()}}
      var cols=['#ffd43b','#74c0fc','#8ce99a','#fff','#b197fc'];for(i=0;i<60;i++){g.save();g.translate((R()-.5)*140,(R()-.5)*140);g.rotate(R()*3);g.fillStyle=cols[i%5];g.fillRect(-2.5,-.9,5,1.8);g.restore()}}
    else if(L.food==='sandwich'){g.fillStyle='#c98a45';path(g,P);g.fill();gr=g.createLinearGradient(0,-60,0,60);gr.addColorStop(0,'#fbe6bf');gr.addColorStop(1,'#efcf95');g.fillStyle=gr;path(g,scaled(.9));g.fill();
      g.fillStyle='#7dc85a';g.beginPath();for(i=0;i<=60;i++){var a2=i/60*TAU,rx=96+Math.sin(i*1.7)*5,ry=44+Math.cos(i*2.3)*4;g.lineTo(Math.cos(a2)*rx,Math.sin(a2)*ry)}g.fill();
      g.fillStyle='#f4a6a6';g.beginPath();g.ellipse(0,0,84,36,0,0,7);g.fill();g.fillStyle='#ffdd57';g.beginPath();g.moveTo(-70,-26);g.lineTo(60,-30);g.lineTo(70,24);g.lineTo(-64,30);g.closePath();g.fill();
      spots(26,'rgba(255,255,255,.35)',1.5,3,scaled(.86))}
    else if(L.food==='melon'){g.fillStyle='#2f7a2c';path(g,P);g.fill();g.fillStyle='#8fd16a';path(g,scaled(.95));g.fill();g.fillStyle='#ffeee6';path(g,scaled(.9));g.fill();
      gr=g.createRadialGradient(0,0,10,0,0,ext);gr.addColorStop(0,'#ff7b7b');gr.addColorStop(1,'#f0434f');g.fillStyle=gr;path(g,scaled(.87));g.fill();
      spots(40,'rgba(255,255,255,.18)',1,2.5,scaled(.85))}
    else if(L.food==='crescent'){gr=g.createRadialGradient(-50,0,10,0,0,ext);gr.addColorStop(0,'#ffe9a8');gr.addColorStop(1,'#e5a650');g.fillStyle=gr;path(g,P);g.fill();
      g.strokeStyle='rgba(180,110,40,.5)';g.lineWidth=2;path(g,scaled(.93));g.stroke();spots(70,'rgba(255,255,255,.7)',.8,1.6,P)}
    else if(L.food==='bagel'){gr=g.createRadialGradient(-20,-30,10,0,0,ext);gr.addColorStop(0,'#e8b06a');gr.addColorStop(.75,'#c07a35');gr.addColorStop(1,'#9a5a24');g.fillStyle=gr;path(g,P);g.fill();
      g.strokeStyle='rgba(255,230,180,.45)';g.lineWidth=5;g.lineCap='round';g.beginPath();g.arc(0,0,74,3.4,4.6);g.stroke()}
    L.tops.forEach(function(t){drawTop(g,t)})}

  /* ---------- 조각 ---------- */
  function drawPiece(g,p,shadowOnly){var F=FOODS[L.food],P=p.P,h=F.h,s=p.d.s;g.save();g.translate(p.d.x,p.d.y);g.scale(s,s);g.translate(-p.c.x,-p.c.y);
    if(shadowOnly){g.fillStyle='rgba(80,30,10,.2)';path(g,P,4,h+5);g.fill();g.restore();return}
    g.fillStyle=F.side;path(g,P,0,h);g.fill();
    for(var i=0,n=P.length;i<n;i++){var a=P[i],b=P[(i+1)%n];if(b.x-a.x>=0)continue;
      if(a.f){var y0=0;for(var k=0;k<F.layers.length;k++){var y1=y0+F.layers[k][1]*h;g.fillStyle=F.layers[k][0];g.beginPath();
          g.moveTo(a.x,a.y+y0);g.lineTo(b.x,b.y+y0);g.lineTo(b.x,b.y+y1+.4);g.lineTo(a.x,a.y+y1+.4);g.closePath();g.fill();y0=y1}}
      else{g.fillStyle=F.side;g.strokeStyle=F.side;g.lineWidth=.8;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(b.x,b.y+h);g.lineTo(a.x,a.y+h);g.closePath();g.fill();g.stroke()}}
    var sg=g.createLinearGradient(0,p.c.y,0,p.c.y+130);sg.addColorStop(0,'rgba(0,0,0,0)');sg.addColorStop(1,'rgba(60,20,0,.25)');g.fillStyle=sg;path(g,P,0,h);g.fill();
    g.save();path(g,P);g.clip();g.drawImage(foodCv,-FS/2,-FS/2,FS,FS);g.restore();
    g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=1.2/s;g.beginPath();for(i=0;i<n;i++){a=P[i];b=P[(i+1)%n];if(a.f){g.moveTo(a.x,a.y);g.lineTo(b.x,b.y)}}g.stroke();
    if(p.asg>=0&&mode==='play'){g.strokeStyle=guests[p.asg].acc;g.lineWidth=3/s;path(g,P);g.stroke()}
    g.restore()}
  function flames(g){L.tops.forEach(function(t,i){if(t.k!=='candle')return;for(var j=0;j<pieces.length;j++){var p=pieces[j];if(!pip(p.P,t.x,t.y))continue;
      var s=p.d.s,x=p.d.x+(t.x-p.c.x)*s,y=p.d.y+(t.y-p.c.y)*s-20*s,f=1+Math.sin(tG*17+i*2)*.12;
      g.fillStyle='rgba(255,210,90,.3)';g.beginPath();g.arc(x,y,8*s,0,7);g.fill();
      g.fillStyle='#ffb02e';g.beginPath();g.moveTo(x,y-7*s*f);g.quadraticCurveTo(x+4*s,y,x,y+3*s);g.quadraticCurveTo(x-4*s,y,x,y-7*s*f);g.fill();
      g.fillStyle='#fff3b0';g.beginPath();g.ellipse(x,y,1.4*s,2.6*s,0,0,7);g.fill();break}})}

  /* ---------- 손님 ---------- */
  function drawGuest(g,G){var S=G.sp,t=tG,happy=G.mood==='happy',grump=G.mood==='grumpy',munch=happy&&mode==='judge'&&res&&res.ok&&modeT>.75&&modeT<1.9,
      bob=happy?-Math.abs(Math.sin(t*9))*3:grump?Math.sin(t*30)*1.2:Math.sin(t*2+G.x)*1,pop=G.pop>0?1+Math.sin(G.pop/.35*Math.PI)*.15:1;
    g.save();g.translate(G.x,G.y+bob);g.scale(pop,pop);
    g.fillStyle='rgba(70,30,15,.2)';g.beginPath();g.ellipse(3,24,27,8,0,0,7);g.fill();
    g.fillStyle=S.d;g.beginPath();g.ellipse(0,22,25,13,0,0,7);g.fill();
    /* 귀 */
    g.fillStyle=S.c;g.strokeStyle=S.d;g.lineWidth=1.5;
    if(S.ear==='round'){[-1,1].forEach(function(k){g.fillStyle=S.c;g.beginPath();g.arc(k*15,-15,8,0,7);g.fill();g.stroke();g.fillStyle=S.mask?'#4a4e55':'#e7b48a';g.beginPath();g.arc(k*15,-15,4,0,7);g.fill()})}
    else if(S.ear==='long'){[-1,1].forEach(function(k){g.save();g.translate(k*8,-22);g.rotate(k*(.15+(happy?Math.sin(t*9)*.15:0)));g.fillStyle=S.c;g.beginPath();g.ellipse(0,-10,6.5,16,0,0,7);g.fill();g.stroke();
      g.fillStyle=S.inn;g.beginPath();g.ellipse(0,-10,3,11,0,0,7);g.fill();g.restore()})}
    else if(S.ear==='point'){[-1,1].forEach(function(k){g.fillStyle=S.c;g.beginPath();g.moveTo(k*6,-17);g.lineTo(k*19,-33);g.lineTo(k*21,-9);g.closePath();g.fill();g.stroke();
      g.fillStyle='#3a2418';g.beginPath();g.moveTo(k*15,-26);g.lineTo(k*19,-33);g.lineTo(k*19.6,-24);g.closePath();g.fill()})}
    else if(S.ear==='frog'){[-1,1].forEach(function(k){g.fillStyle=S.c;g.beginPath();g.arc(k*9,-16,9,0,7);g.fill();g.stroke()})}
    else{g.fillStyle=S.d;g.beginPath();g.moveTo(-3,-21);g.quadraticCurveTo(0,-30,4,-22);g.fill()}
    /* 얼굴 */
    var gr=g.createRadialGradient(-6,-8,3,0,0,23);gr.addColorStop(0,S.c);gr.addColorStop(1,S.d);g.fillStyle=gr;g.beginPath();g.arc(0,0,21,0,7);g.fill();
    g.fillStyle=S.c;g.beginPath();g.arc(-2,-2,17,0,7);g.fill();
    if(S.ear==='none'){g.fillStyle=S.m;g.beginPath();g.arc(-7,1,10,0,7);g.arc(7,1,10,0,7);g.arc(0,7,11,0,7);g.fill()}
    else{g.fillStyle=S.m;g.beginPath();g.ellipse(0,8,10.5,7.5,0,0,7);g.fill()}
    if(S.mask){g.fillStyle='#4a4e55';g.beginPath();g.ellipse(-8,-3,7.5,5,-.2,0,7);g.ellipse(8,-3,7.5,5,.2,0,7);g.fill()}
    /* 눈 */
    var ey=S.ear==='frog'?-16:-3,ex=S.ear==='frog'?9:7.5,dx=G.lx-G.x,dy=G.ly-G.y,dl=Math.hypot(dx,dy)||1,px=dx/dl*2,py=dy/dl*2;
    g.strokeStyle='#2a1a12';g.fillStyle='#2a1a12';g.lineWidth=2;g.lineCap='round';
    if(happy||munch){[-1,1].forEach(function(k){g.beginPath();g.arc(k*ex,ey+1.5,3.2,3.5,5.9);g.stroke()})}
    else if(G.blink<0){[-1,1].forEach(function(k){g.beginPath();g.moveTo(k*ex-3,ey);g.lineTo(k*ex+3,ey);g.stroke()})}
    else{[-1,1].forEach(function(k){g.fillStyle='#fff';g.beginPath();g.arc(k*ex,ey,4.6,0,7);g.fill();g.fillStyle='#2a1a12';g.beginPath();g.arc(k*ex+px,ey+py,2.5,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(k*ex+px-.8,ey+py-.9,.8,0,7);g.fill()})}
    if(grump){g.strokeStyle='#2a1a12';g.lineWidth=2.2;[-1,1].forEach(function(k){g.beginPath();g.moveTo(k*(ex+5),ey-8);g.lineTo(k*(ex-3),ey-5);g.stroke()})}
    /* 코와 입 */
    if(S.ear==='none'){g.fillStyle='#ffa630';g.beginPath();g.moveTo(-4,4);g.lineTo(4,4);g.lineTo(0,9);g.closePath();g.fill()}
    else if(S.ear!=='frog'){g.fillStyle='#3a2418';g.beginPath();g.ellipse(0,4,3,2.2,0,0,7);g.fill()}
    g.strokeStyle='#3a2418';g.lineWidth=1.6;
    if(munch){var o=Math.abs(Math.sin(t*16));g.fillStyle='#a8323a';g.beginPath();g.ellipse(0,11,4.5,1+o*4,0,0,7);g.fill();
      g.fillStyle=S.c;g.beginPath();g.arc(-12,8,4.5+o*1.5,0,7);g.arc(12,8,4.5+o*1.5,0,7);g.fill()}
    else if(happy){g.fillStyle='#a8323a';g.beginPath();g.arc(0,9,5,0,Math.PI);g.closePath();g.fill();g.fillStyle='#ff8fa0';g.beginPath();g.arc(0,12,2.5,0,Math.PI);g.fill()}
    else if(grump){g.beginPath();g.moveTo(-5,12);g.quadraticCurveTo(-2.5,9,0,11.5);g.quadraticCurveTo(2.5,9,5,12);g.stroke()}
    else{g.beginPath();g.arc(-2.5,8.5,2.5,.3,2.8);g.stroke();g.beginPath();g.arc(2.5,8.5,2.5,.3,2.8);g.stroke()}
    g.fillStyle=grump?'rgba(255,80,80,.45)':'rgba(255,120,140,.4)';g.beginPath();g.arc(-13,5,3.4,0,7);g.arc(13,5,3.4,0,7);g.fill();
    /* 냅킨 */
    g.fillStyle='#fff';g.strokeStyle='rgba(0,0,0,.12)';g.lineWidth=1;g.beginPath();g.moveTo(-13,17);g.lineTo(13,17);g.lineTo(0,33);g.closePath();g.fill();g.stroke();
    g.fillStyle=G.acc;g.beginPath();g.moveTo(-13,17);g.lineTo(13,17);g.lineTo(11,20);g.lineTo(-11,20);g.closePath();g.fill();
    g.beginPath();g.arc(0,27,1.6,0,7);g.fill();
    g.restore()}
  function drawPlate(g,G){var p=platePos(G);g.fillStyle='rgba(70,30,15,.15)';g.beginPath();g.ellipse(p.x+2,p.y+4,22,16,0,0,7);g.fill();
    g.fillStyle='#fdfcf8';g.beginPath();g.ellipse(p.x,p.y,22,16,0,0,7);g.fill();g.strokeStyle=G.acc;g.globalAlpha=.6;g.lineWidth=2;g.beginPath();g.ellipse(p.x,p.y,18,12.5,0,0,7);g.stroke();g.globalAlpha=1;
    g.fillStyle='rgba(200,200,210,.35)';g.beginPath();g.ellipse(p.x,p.y+1,13,8,0,0,7);g.fill()}
  function iconFor(g,k,x,y,s){if(k==='area'){g.fillStyle='#ffd25e';g.beginPath();g.arc(x,y,7*s,0,7);g.fill();g.fillStyle='#e08a2e';g.beginPath();g.moveTo(x,y);g.arc(x,y,7*s,-1.57,1.57);g.closePath();g.fill();
      g.strokeStyle='#7a4a12';g.lineWidth=1.2;g.beginPath();g.arc(x,y,7*s,0,7);g.moveTo(x,y-7*s);g.lineTo(x,y+7*s);g.stroke();return}
    drawTop(g,{k:k,x:x,y:y+(k==='candle'?6:0),r:TOPR[k]*s*(k==='seed'||k==='sesame'?1.5:k==='olive'?1.1:.8),rot:0})}
  function bubble(g,G){var B=G.bub;if(!B)return;var a=Math.min(1,(modeT-.5)*4);if(a<=0)return;
    var bx=G.x+(G.x<=FX?44:-44),by=G.y-30;if(G.y<FY-150)by=G.y+8;bx=Math.max(30,Math.min(W-30,bx));
    g.save();g.globalAlpha=a;g.fillStyle='#fff';g.strokeStyle=G.short?'#ff6b6b':'#40c463';g.lineWidth=2.5;g.beginPath();g.arc(bx,by,19,0,7);g.fill();g.stroke();
    g.beginPath();g.moveTo(bx+(G.x-bx)*.45-4,by+(G.y-by)*.45);g.lineTo(G.x+(bx-G.x)*.35,G.y+(by-G.y)*.35);g.lineTo(bx+(G.x-bx)*.45+4,by+(G.y-by)*.45);g.fill();
    if(B.dim==='area'){var fr=Math.max(0,Math.min(1,B.frac*Math.min(1,(modeT-.5)*2)));g.fillStyle='#f1e6d2';g.beginPath();g.arc(bx,by,13,0,7);g.fill();
      g.fillStyle=G.short?'#ff8a7a':'#ffc94a';g.beginPath();g.moveTo(bx,by);g.arc(bx,by,13,-1.57,-1.57+fr*TAU);g.closePath();g.fill();
      var fa=-1.57+TAU/L.n;g.strokeStyle='#3a2418';g.lineWidth=1.5;g.beginPath();g.moveTo(bx,by);g.lineTo(bx+Math.cos(-1.57)*15,by+Math.sin(-1.57)*15);g.moveTo(bx,by);g.lineTo(bx+Math.cos(fa)*15,by+Math.sin(fa)*15);g.stroke()}
    else{g.fillStyle='#fff';rr(g,bx-27,by-14,54,28,14);g.fill();g.stroke();iconFor(g,B.dim,bx-13,by,.8);g.fillStyle=G.short?'#e03131':'#2b8a3e';g.font='15px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(B.val+'/'+Math.round(B.tgt),bx+9,by+5)}
    g.restore()}

  /* ---------- 미리보기 ---------- */
  function previewLabels(g,c){var list=cuts.concat([c]),ps=cutAll(FOODS[L.food].poly,list),fair=1/L.n;
    var tops=L.fair.filter(function(d){return d!=='area'});
    ps.forEach(function(P){var m=centroid(P),a=Math.abs(area(P))/total,x=FX+m.x,y=FY+m.y,txt=Math.round(a*100)+'%';
      var good=L.fair[0]==='area'&&Math.abs(a-fair)<=L.tol;
      var cnt=tops.map(function(k){var n=0;L.tops.forEach(function(t){if(t.k===k&&pip(P,t.x,t.y))n++});return n});
      g.font='13px Jua, system-ui, sans-serif';var w=Math.max(34,g.measureText(txt).width+12),hh=18+cnt.length*15;
      g.fillStyle=good?'rgba(64,196,99,.92)':'rgba(40,24,16,.78)';rr(g,x-w/2,y-hh/2,w,hh,8);g.fill();
      g.fillStyle='#fff';g.textAlign='center';g.fillText(txt,x,y-hh/2+13);
      cnt.forEach(function(n,i){iconFor(g,tops[i],x-8,y-hh/2+25+i*15,.55);g.fillStyle='#fff';g.fillText(''+n,x+8,y-hh/2+30+i*15)})})}
  function drawKnife(g,x,y,ang,al){g.save();g.globalAlpha=al;g.translate(x,y);g.rotate(ang);
    g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.moveTo(-4,10);g.lineTo(40,6);g.lineTo(40,16);g.lineTo(-4,16);g.fill();
    var gr=g.createLinearGradient(0,-8,0,4);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#9aa6b2');g.fillStyle=gr;
    g.beginPath();g.moveTo(-26,2);g.quadraticCurveTo(-18,-9,4,-9);g.lineTo(6,4);g.lineTo(-26,2);g.closePath();g.fill();g.strokeStyle='#6b7785';g.lineWidth=1;g.stroke();
    g.fillStyle='#8a5634';rr(g,6,-5,30,10,4);g.fill();g.fillStyle='#e8c9a4';g.beginPath();g.arc(14,0,1.6,0,7);g.arc(26,0,1.6,0,7);g.fill();g.restore()}
  function drawLine(g,x1,y1,x2,y2,col){var dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l;
    g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=5;g.setLineDash([]);g.beginPath();g.moveTo(x1-ux*900,y1-uy*900);g.lineTo(x1+ux*900,y1+uy*900);g.stroke();
    g.strokeStyle=col;g.lineWidth=2.5;g.setLineDash([9,7]);g.lineDashOffset=-tG*30;g.beginPath();g.moveTo(x1-ux*900,y1-uy*900);g.lineTo(x1+ux*900,y1+uy*900);g.stroke();g.setLineDash([]);g.lineDashOffset=0}

  function draw(g,a,dt){A_=a;if(!L)return;if(!cloth)makeCloth();var t=tG,K=ko(),i;
    g.drawImage(cloth,0,0);
    /* 움직이는 나뭇잎 그림자 + 햇살 먼지 */
    leaves.forEach(function(l,k){var x=((l.x+t*l.v)%(W+200))-100,y=l.y+Math.sin(t*.4+l.p)*10;g.fillStyle='rgba(60,80,30,.07)';
      for(var j=0;j<5;j++){g.beginPath();g.ellipse(x+Math.cos(j*1.3+l.p)*30*l.s,y+Math.sin(j*1.9)*22*l.s,22*l.s,12*l.s,j+Math.sin(t*.5+k)*.2,0,7);g.fill()}});
    motes.forEach(function(m){var y=((m.y-t*m.v)%H+H)%H,x=m.x+Math.sin(t*.6+m.p)*12;g.fillStyle='rgba(255,250,220,'+(.35+.3*Math.sin(t*1.7+m.p))+')';g.beginPath();g.arc(x,y,1.5,0,7);g.fill()});
    drawCup(g,30,118,'#ffb347',t);drawCup(g,332,514,'#7ad3ff',t+1);
    /* 접시와 손님 */
    guests.forEach(function(G){drawPlate(g,G)});
    var intro=Math.min(1,levelT/.45),bounce=1+Math.sin(intro*Math.PI)*.06;
    guests.forEach(function(G,k){var ap=Math.min(1,Math.max(0,levelT*3-k*.25));if(ap<=0)return;g.save();g.globalAlpha=ap;drawGuest(g,G);g.restore()});
    /* 음식 조각 */
    g.save();if(intro<1){g.translate(FX,FY);g.scale(bounce*(.7+.3*intro),bounce*(.7+.3*intro));g.translate(-FX,-FY);g.globalAlpha=intro}
    var order=pieces.slice();if(drag&&drag.p){order.splice(order.indexOf(drag.p),1);order.push(drag.p)}
    order.forEach(function(p){drawPiece(g,p,true)});order.forEach(function(p){drawPiece(g,p,false)});flames(g);g.restore();
    /* 김 */
    if(FOODS[L.food].steam&&mode!=='judge'){g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=3;g.lineCap='round';
      for(i=0;i<3;i++){var ph=(t*.35+i/3)%1,sx=FX-40+i*40,sy=FY-20-ph*90;g.globalAlpha=Math.sin(ph*Math.PI)*.8;g.beginPath();
        for(var s=0;s<=10;s++){var yy=sy-s*4,xx=sx+Math.sin(s*.7+t*2+i)*6;if(s)g.lineTo(xx,yy);else g.moveTo(xx,yy)}g.stroke()}g.globalAlpha=1}
    /* 칼질 미리보기 */
    var pend=null;if(drag&&drag.t==='cut'&&Math.hypot(drag.x1-drag.x0,drag.y1-drag.y0)>12)pend=[drag.x0,drag.y0,drag.x1,drag.y1];
    else if(kb&&mode==='play'&&cuts.length<L.k)pend=[kp.x1,kp.y1,kp.x2,kp.y2];
    if(pend&&mode==='play'&&cuts.length<L.k){drawLine(g,pend[0],pend[1],pend[2],pend[3],'#e03131');
      var lc=lineScreenToLocal(pend[0],pend[1],pend[2],pend[3]);if(crosses(FOODS[L.food].poly,lc))previewLabels(g,lc);
      if(kb){g.fillStyle='#e03131';[[pend[0],pend[1]],[pend[2],pend[3]]].forEach(function(q,k){g.beginPath();g.arc(q[0],q[1],k?5:7,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.stroke()})}
      drawKnife(g,pend[2],pend[3],Math.atan2(pend[3]-pend[1],pend[2]-pend[0])+Math.PI,1)}
    if(knife){var kx=knife.ax+(knife.bx-knife.ax)*knife.t,ky=knife.ay+(knife.by-knife.ay)*knife.t;
      g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=3;g.beginPath();g.moveTo(knife.ax,knife.ay);g.lineTo(kx,ky);g.stroke();
      drawKnife(g,kx,ky,Math.atan2(knife.by-knife.ay,knife.bx-knife.ax)+Math.PI,1)}
    /* 첫 판 시범 */
    if(li===0&&!cuts.length&&!drag&&mode==='play'&&!kb){var ph2=(t*.55)%1,hx=FX-130+ph2*260;g.globalAlpha=.6*Math.sin(ph2*Math.PI);
      g.strokeStyle='#fff';g.lineWidth=3;g.setLineDash([4,8]);g.beginPath();g.moveTo(FX-130,FY+4);g.lineTo(hx,FY+4);g.stroke();g.setLineDash([]);
      drawKnife(g,hx,FY+4,Math.PI,1);g.globalAlpha=1}
    if(mode==='judge')guests.forEach(function(G){bubble(g,G)});
    /* 상단 판 */
    var wg=g.createLinearGradient(0,0,0,34);wg.addColorStop(0,'#6b3f26');wg.addColorStop(1,'#4e2c19');g.fillStyle=wg;g.fillRect(0,0,W,34);
    g.fillStyle='rgba(255,255,255,.06)';for(i=0;i<6;i++)g.fillRect(0,5+i*5,W,1);
    g.fillStyle='rgba(0,0,0,.2)';g.fillRect(0,34,W,3);
    g.font='15px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='#fff';
    g.fillStyle='rgba(78,44,25,.88)';rr(g,10,40,70,24,12);g.fill();g.fillStyle='#fff';g.fillText((K?'단계 ':'Lv ')+(li+1),20,57);
    /* 칼 개수 */
    for(i=0;i<L.k;i++){var used=i<cuts.length,kx2=FX-(L.k-1)*17+i*34;g.save();g.globalAlpha=used?.3:1;g.translate(kx2,52);g.rotate(-.6);g.scale(.62,.62);drawKnife(g,0,0,0,1);g.restore()}
    var low=time<10;g.fillStyle=low?'rgba(224,49,49,.92)':lastGain>0?'rgba(47,158,68,.92)':'rgba(78,44,25,.88)';rr(g,W-84,40,74,24,12);g.fill();
    g.fillStyle='#fff';g.textAlign='center';g.font=(low?16+Math.sin(t*12):15)+'px Jua, system-ui, sans-serif';g.fillText('⏱ '+Math.ceil(time),W-47,57);
    /* 규칙 칩 */
    var chips=[{ic:'guest',tx:K?'손님 '+L.n:L.n+' guests'}];
    L.fair.forEach(function(d){if(d==='area')chips.push({ic:'area',tx:K?'크기 같게':'same size'});
      else{var n=L.tops.filter(function(q){return q.k===d}).length/L.n;chips.push({ic:d,tx:K?'각 '+n+'개':n+' each'})}});
    if(L.one)chips.push({ic:'one',tx:K?'한 조각씩':'1 slice each'});
    g.font='13px Jua, system-ui, sans-serif';var tw=0;chips.forEach(function(c){c.w=g.measureText(c.tx).width+(c.ic==='one'||c.ic==='guest'?14:30);tw+=c.w+6});
    var cx=FX-tw/2+3;chips.forEach(function(c){g.fillStyle='rgba(255,255,255,.88)';rr(g,cx,68,c.w,22,11);g.fill();g.strokeStyle='rgba(120,70,40,.35)';g.lineWidth=1;g.stroke();
      if(c.ic!=='one'&&c.ic!=='guest')iconFor(g,c.ic,cx+12,79,.75);g.fillStyle='#5a3420';g.textAlign='left';g.fillText(c.tx,cx+(c.ic==='one'||c.ic==='guest'?7:23),84);cx+=c.w+6});
    /* 안내 */
    var tip=null;if(msg)tip=msg.s;else if(L.tip&&!hintOff&&!cuts.length)tip=L.tip[K?'ko':'en'];
    if(tip){g.font='17px Jua, system-ui, sans-serif';var ww=Math.min(W-20,g.measureText(tip).width+26);g.fillStyle=msg?(res&&res.ok?'rgba(47,158,68,.92)':'rgba(224,49,49,.9)'):'rgba(78,44,25,.85)';
      rr(g,FX-ww/2,538,ww,30,15);g.fill();g.fillStyle='#fff';g.textAlign='center';g.fillText(tip,FX,559)}
    /* 버튼 */
    function btn(b,label,on,col){g.fillStyle='rgba(60,30,15,.25)';rr(g,b.x,b.y+4,b.w,b.h,14);g.fill();g.fillStyle=on?col:'#cbb9a6';rr(g,b.x,b.y,b.w,b.h,14);g.fill();
      g.fillStyle='rgba(255,255,255,.25)';rr(g,b.x+4,b.y+3,b.w-8,b.h*.4,10);g.fill();g.fillStyle='#fff';g.font='17px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(label,b.x+b.w/2,b.y+27)}
    btn(BTN.undo,(K?'↶ 취소':'↶ Undo'),cuts.length>0&&mode==='play','#8a6a52');
    var ready=cuts.length>=L.k&&mode==='play',pul=ready?1+Math.sin(t*6)*.04:1;g.save();g.translate(BTN.serve.x+BTN.serve.w/2,BTN.serve.y+BTN.serve.h/2);g.scale(pul,pul);g.translate(-(BTN.serve.x+BTN.serve.w/2),-(BTN.serve.y+BTN.serve.h/2));
    btn(BTN.serve,(K?'🍽 나눠 주기':'🍽 Serve'),cuts.length>0&&mode==='play','#ff7a3d');g.restore();
    if(kb){g.font='11px Jua, system-ui, sans-serif';g.fillStyle='rgba(90,52,32,.85)';g.textAlign='left';
      g.fillText(K?'방향키·Shift+방향키: 끝점  Q/E: 회전  Space: 자르기':'Arrows / Shift+Arrows: ends  Q/E: rotate  Space: cut',8,632);
      g.fillText(K?'S: 나눠 주기':'S: serve',254,592);g.fillText(K?'Z: 취소':'Z: undo',254,608)}
  }

  SG.run({id:'fair-slice',title:{ko:'공평하게 한 판',en:'Fair Slice'},
    how:{ko:'선을 그어 음식을 자르고, 손님 모두에게 똑같은 몫을 나눠 주세요! 크기와 토핑 개수가 공평해야 해요.',
         en:'Drag a line to slice the food, then serve every guest an equal share — same size, same toppings!'},
    init:init,update:update,draw:draw});
  if(typeof window!=='undefined')window.__fs={state:function(){return {li:li,mode:mode,cuts:cuts.length,k:L&&L.k,time:time,n:L&&L.n,pieces:pieces.length}},
    sol:function(){return L.sol.map(function(c){return [c[0]+FX,c[1]+FY,c[2]+FX,c[3]+FY]})},FX:FX,FY:FY,go:function(i){setLevel(i)}};
})();
