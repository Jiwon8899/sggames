/* 동물 행진 다리 (Plank Bridge) — 판자와 밧줄로 작은 다리를 짓고, 동물 행진을 건너보낸다.
   구조 해석(XPBD 거리 제약 + 부재력)과 레벨/봇은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,G=600,TPS=60,SUB=24,HS=1/(TPS*SUB);
  var MAXP=84,MAXR=190,COST={p:10,r:4},SNAP=15,TOPY=78;
  /* 강도(무게 단위). EA는 무게 단위의 축강성 */
  var LIM={pT:34,pC:26,rT:30},EA={p:24000,r:6000};
  var JM=.3,PM=.6,RM=.12,DAMP=2.2,WALK=118,QS=22;
  var ANIM=[{k:'mouse',w:1,r:7},{k:'cat',w:3,r:10},{k:'dog',w:5,r:12},{k:'bear',w:10,r:16},{k:'elephant',w:20,r:21}];
  var AW={mouse:0,cat:1,dog:2,bear:3,elephant:4};
  function riverY(L){return L.river||520}

  /* ---------- 레벨 ----------
     xL,yL: 왼쪽 강둑 끝(다리 시작 고정점) / xR,yR: 오른쪽. pegs: 절벽 말뚝 [x,y,'peg'|'post'|'rock'] */
  var LEVELS=[
    {xL:146,yL:330,xR:214,yR:330,an:['mouse'],budget:20,
      hint:{ko:'판자를 이어 다리를 만들어요',en:'Connect planks to build a bridge'}},
    {xL:104,yL:320,xR:256,yR:320,pegs:[[118,370,'peg'],[242,370,'peg']],an:['mouse','cat'],budget:50,
      hint:{ko:'처지면 삼각형으로 받쳐요',en:'Sagging? Brace it with a triangle'}},
    {xL:86,yL:310,xR:274,yR:310,pegs:[[94,372,'peg'],[266,372,'peg']],an:['mouse','cat','dog'],budget:70,
      hint:{ko:'강아지는 무거워요: 트러스!',en:'Dogs are heavy: build a truss!'}},
    {xL:76,yL:320,xR:284,yR:320,pegs:[[56,186,'post'],[304,186,'post']],an:['mouse','cat','dog'],budget:50,
      hint:{ko:'높은 기둥에 밧줄을 걸어요',en:'Hang ropes from the tall posts'}},
    {xL:106,yL:316,xR:254,yR:316,an:['cat','dog'],budget:48,
      hint:{ko:'당기는 곳은 밧줄이 싸요',en:'Where it pulls, rope is cheaper'}},
    {xL:104,yL:300,xR:256,yR:300,pegs:[[112,360,'peg'],[248,360,'peg']],an:['mouse','dog','bear','elephant'],budget:70,
      hint:{ko:'코끼리는 깊은 트러스가 필요해요',en:'Elephants need a deeper truss'}},
    {xL:46,yL:318,xR:314,yR:318,pegs:[[180,400,'rock']],an:['mouse','cat','dog','bear'],budget:120,
      hint:{ko:'강 가운데 바위를 써요',en:'Use the rock in the river'}},
    {xL:80,yL:330,xR:270,yR:296,pegs:[[88,388,'peg'],[262,352,'peg']],an:['cat','dog','bear'],budget:90,
      hint:{ko:'기울어진 다리도 괜찮아요',en:'A sloping bridge is fine'}},
    {xL:60,yL:320,xR:300,yR:320,pegs:[[40,250,'post'],[320,250,'post'],[68,380,'peg'],[292,380,'peg']],an:['mouse','dog','bear'],budget:50,
      hint:{ko:'밧줄과 판자를 섞어 봐요',en:'Mix ropes and planks'}},
    {xL:70,yL:310,xR:290,yR:310,pegs:[[78,372,'peg'],[282,372,'peg']],an:['mouse','cat','dog','bear','elephant'],budget:110,
      hint:{ko:'모두 건너요!',en:'Everyone across!'}}
  ];

  function rnd(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
  function finishLevel(b,n){
    var L={n:n,xL:b.xL,yL:b.yL,xR:b.xR,yR:b.yR,river:b.river||520,budget:b.budget,hint:b.hint||null,gen:!!b.gen,
      an:b.an.slice(),pegs:(b.pegs||[]).map(function(p){return p.slice()})};
    L.anchors=[[L.xL,L.yL,'bank'],[L.xR,L.yR,'bank']].concat(L.pegs);
    return L}
  /* 절벽 면: 아래로 갈수록 강 쪽으로 살짝 나온다 */
  function faceL(L,y){return L.xL+(y-L.yL)*.12}
  function faceR(L,y){return L.xR-(y-L.yR)*.12}
  function inTerrain(L,x,y){
    if(y>riverY(L)-8)return true;
    if(y>L.yL-2&&x<faceL(L,y)-2)return true;
    if(y>L.yR-2&&x>faceR(L,y)+2)return true;
    for(var i=0;i<L.pegs.length;i++){var p=L.pegs[i];
      if(p[2]==='rock'&&y>p[1]+4&&Math.abs(x-p[0])<22+(y-p[1])*.12)return true}
    return y<TOPY||x<4||x>W-4}

  /* ---------- 설계 ---------- */
  function newDesign(L){return {j:L.anchors.map(function(a){return {x:a[0],y:a[1],fix:true,k:a[2]}}),m:[]}}
  function cloneDesign(D){return {j:D.j.map(function(q){return {x:q.x,y:q.y,fix:q.fix,k:q.k}}),m:D.m.map(function(m){return {a:m.a,b:m.b,t:m.t}})}}
  function nearJoint(D,x,y,r){var best=-1,bd=r||SNAP;for(var i=0;i<D.j.length;i++){var d=Math.hypot(D.j[i].x-x,D.j[i].y-y);if(d<bd){bd=d;best=i}}return best}
  function mlen(D,m){var a=D.j[m.a],b=D.j[m.b];return Math.hypot(a.x-b.x,a.y-b.y)}
  function cost(D){var c=0;for(var i=0;i<D.m.length;i++)c+=COST[D.m[i].t];return c}
  /* a 관절에서 (x,y)로 부재를 끈다 → 끝점 계산(최대 길이·스냅·지형) */
  function planEnd(L,D,a,x,y,t){
    var A=D.j[a],mx=t==='p'?MAXP:MAXR,dx=x-A.x,dy=y-A.y,d=Math.hypot(dx,dy),j=nearJoint(D,x,y,SNAP);
    if(j>=0&&j!==a&&Math.hypot(D.j[j].x-A.x,D.j[j].y-A.y)<=mx+.5)return {x:D.j[j].x,y:D.j[j].y,j:j,ok:true};
    if(d>mx){x=A.x+dx/d*mx;y=A.y+dy/d*mx;d=mx}
    x=Math.round(x);y=Math.round(y);
    var j2=nearJoint(D,x,y,SNAP*.6);if(j2>=0&&j2!==a)return {x:D.j[j2].x,y:D.j[j2].y,j:j2,ok:Math.hypot(D.j[j2].x-A.x,D.j[j2].y-A.y)<=mx+.5};
    return {x:x,y:y,j:-1,ok:d>=14&&!inTerrain(L,x,y)}}
  function hasMember(D,a,b){for(var i=0;i<D.m.length;i++){var m=D.m[i];if((m.a===a&&m.b===b)||(m.a===b&&m.b===a))return i}return -1}
  function addMember(L,D,a,x,y,t){
    var e=planEnd(L,D,a,x,y,t);if(!e.ok)return null;var b=e.j;
    if(b<0){D.j.push({x:e.x,y:e.y,fix:false});b=D.j.length-1}
    if(b===a||hasMember(D,a,b)>=0)return null;
    D.m.push({a:a,b:b,t:t});return D.m[D.m.length-1]}
  function removeMember(D,i){D.m.splice(i,1);pruneJoints(D)}
  function pruneJoints(D){ /* 연결이 끊긴 자유 관절 제거 */
    for(var i=D.j.length-1;i>=0;i--){if(D.j[i].fix)continue;var used=false;
      for(var k=0;k<D.m.length;k++)if(D.m[k].a===i||D.m[k].b===i){used=true;break}
      if(!used){D.j.splice(i,1);for(k=0;k<D.m.length;k++){if(D.m[k].a>i)D.m[k].a--;if(D.m[k].b>i)D.m[k].b--}}}}
  /* 동물이 걷는 길: 왼쪽 강둑(0)에서 오른쪽(1)까지 판자 사슬, 가장 평평한 길 */
  function deckPath(D){
    var n=D.j.length,dist=[],prev=[],done=[],i,k;for(i=0;i<n;i++){dist[i]=1e9;prev[i]=-1;done[i]=false}dist[0]=0;
    for(var it=0;it<n;it++){var u=-1;for(i=0;i<n;i++)if(!done[i]&&(u<0||dist[i]<dist[u]))u=i;
      if(u<0||dist[u]>=1e9)break;done[u]=true;if(u===1)break;
      for(k=0;k<D.m.length;k++){var m=D.m[k];if(m.t!=='p')continue;var v=m.a===u?m.b:m.b===u?m.a:-1;if(v<0)continue;
        var dx=D.j[v].x-D.j[u].x,dy=D.j[v].y-D.j[u].y;if(dx<2||Math.abs(dy)>dx*.9)continue;
        var c=dist[u]+Math.hypot(dx,dy)+2.5*Math.abs(dy)+(v>1&&D.j[v].fix?40:0);if(c<dist[v]){dist[v]=c;prev[v]=[u,k]}}}
    if(dist[1]>=1e9)return null;
    var js=[1],ms=[],c2=1;while(c2!==0){ms.unshift(prev[c2][1]);c2=prev[c2][0];js.unshift(c2)}
    return {j:js,m:ms}}

  /* ---------- 시뮬레이션 ---------- */
  function makeSim(L,D,opt){
    opt=opt||{};var s={L:L,D:D,t:0,st:'run',ev:[],why:'',nodes:[],cons:[],path:null,animals:[],settle:opt.settle==null?.6:opt.settle,
      extra:opt.extra||null,maxStress:0,noParade:!!opt.noParade,timeLimit:opt.timeLimit||60};
    D.j.forEach(function(q){s.nodes.push({x:q.x,y:q.y,px:q.x,py:q.y,vx:0,vy:0,m0:JM,fix:q.fix,ex:0,iw:0})});
    D.m.forEach(function(m,i){var a=s.nodes[m.a],b=s.nodes[m.b],l=Math.hypot(a.x-b.x,a.y-b.y);
      a.m0+=(m.t==='p'?PM:RM)/2;b.m0+=(m.t==='p'?PM:RM)/2;
      s.cons.push({a:m.a,b:m.b,t:m.t,L:l,al:l/(EA[m.t]*G),f:0,fs:0,br:false,lam:0,mn:0,mx:0,len:l})});
    if(!s.noParade){s.path=deckPath(D);
      if(s.path){var cum=[0];for(var i=0;i<s.path.m.length;i++)cum.push(cum[i]+s.cons[s.path.m[i]].L);s.cum=cum;s.span=cum[cum.length-1];
        var sp=Math.max(80,s.span*.72+34);
        L.an.forEach(function(k,i){var A=ANIM[AW[k]];s.animals.push({k:k,w:A.w,r:A.r,s:queueOff(L.an,i),delay:i*sp/WALK,st:'wait',x:0,y:0,ang:0,fallT:0,vx:0,vy:0})})}
      else s.st='fail',s.why='nopath'}
    return s}
  function queueOff(an,i){var o=-8-ANIM[AW[an[0]]].r;for(var k=1;k<=i;k++)o-=ANIM[AW[an[k-1]]].r*.8+ANIM[AW[an[k]]].r*1.2+6;return o}
  function animalPos(s,a){ /* 길 위 위치 → (멤버, 비율) */
    var L=s.L;if(a.s<=0)return {k:-1,x:L.xL+a.s,y:L.yL,ang:0};
    if(a.s>=s.span)return {k:-2,x:L.xR+(a.s-s.span),y:L.yR,ang:0};
    var i=0;while(i<s.path.m.length-1&&s.cum[i+1]<a.s)i++;
    var u=(a.s-s.cum[i])/(s.cum[i+1]-s.cum[i]),n0=s.nodes[s.path.j[i]],n1=s.nodes[s.path.j[i+1]];
    return {k:i,u:u,n0:s.path.j[i],n1:s.path.j[i+1],x:n0.x+(n1.x-n0.x)*u,y:n0.y+(n1.y-n0.y)*u,ang:Math.atan2(n1.y-n0.y,n1.x-n0.x),c:s.path.m[i]}}
  function failSim(s,why){if(s.st==='run'){s.st='fail';s.why=why;s.ev.push({t:'fail',why:why})}}
  function stepSim(s){ /* 1/60초 한 틱 */
    var dt=1/TPS,i,k,n,c,a,ns=s.nodes,cs=s.cons,L=s.L,parade=s.t>=s.settle&&!s.noParade&&s.path;
    /* 동물 이동 */
    for(i=0;i<ns.length;i++)ns[i].ex=s.extra&&s.extra[i]||0;
    if(parade){
      var alive=0;
      for(k=0;k<s.animals.length;k++){a=s.animals[k];
        if(a.st==='fall'){a.fallT+=dt;a.vy+=G*dt;a.x+=a.vx*dt;a.y+=a.vy*dt;if(a.y>riverY(L)){a.y=riverY(L);a.vy=0;a.vx=0}continue}
        if(a.st==='done')continue;
        if(s.t-s.settle<a.delay){a.st='wait';alive++;continue}
        a.s+=WALK*dt;a.st='walk';if(a.s>s.span+18)a.st='done';
        var p=animalPos(s,a);a.x=p.x;a.y=p.y;a.ang=p.ang;
        if(p.k>=0){
          var cc=cs[p.c],dx=ns[p.n1].x-ns[p.n0].x,dy=ns[p.n1].y-ns[p.n0].y;
          var why=cc.br?'break':(dx<=1||Math.abs(dy)>dx*1.0)?'steep':(p.y>riverY(L)-10?'sink':'');
          if(why){a.st='fall';a.vx=WALK*.5;a.vy=-60;s.ev.push({t:'fall',k:k,why:why});failSim(s,why);continue}
          ns[p.n0].ex+=a.w*(1-p.u);ns[p.n1].ex+=a.w*p.u}
        if(a.st!=='done')alive++}
      if(alive===0&&s.st==='run'){s.st='win';s.ev.push({t:'win'})}}
    for(i=0;i<ns.length;i++){n=ns[i];n.iw=n.fix?0:1/(n.m0+n.ex)}
    for(c=0;c<cs.length;c++)cs[c].acc=0;
    var h=HS,h2=h*h,dmp=1-DAMP*h*(s.t<s.settle?4:1);
    for(var sub=0;sub<SUB;sub++){
      for(i=0;i<ns.length;i++){n=ns[i];if(n.fix)continue;n.vy+=G*h;n.vx*=dmp;n.vy*=dmp;n.px=n.x;n.py=n.y;n.x+=n.vx*h;n.y+=n.vy*h}
      for(var cc2=0;cc2<cs.length;cc2++){c=cs[(sub&1)?cs.length-1-cc2:cc2];if(c.br)continue;
        var A=ns[c.a],B=ns[c.b],ddx=B.x-A.x,ddy=B.y-A.y,d=Math.sqrt(ddx*ddx+ddy*ddy);if(d<1e-6)continue;
        var C=d-c.L;if(c.t==='r'&&C<=0)continue;
        var wsum=A.iw+B.iw;if(wsum===0)continue;
        var dl=-C/(wsum+c.al/h2),nx=ddx/d,ny=ddy/d;
        A.x-=nx*dl*A.iw;A.y-=ny*dl*A.iw;B.x+=nx*dl*B.iw;B.y+=ny*dl*B.iw;
        c.acc+=-dl/h2}
      for(i=0;i<ns.length;i++){n=ns[i];if(n.fix)continue;n.vx=(n.x-n.px)/h;n.vy=(n.y-n.py)/h}}
    var ms=0;
    for(c=0;c<cs.length;c++){var q=cs[c];if(q.br){q.f=0;continue}
      q.f=q.acc/SUB/G;q.fs+=(q.f-q.fs)*.35;
      var A2=ns[q.a],B2=ns[q.b];q.len=Math.hypot(B2.x-A2.x,B2.y-A2.y);
      if(s.t>=s.settle*.5){q.mn=Math.min(q.mn,q.f);q.mx=Math.max(q.mx,q.f)}
      var r=stressOf(q);if(r>ms)ms=r;
      if(s.t>.08&&r>1){q.br=true;s.ev.push({t:'break',c:c,x:(A2.x+B2.x)/2,y:(A2.y+B2.y)/2,mt:q.t})}}
    s.maxStress=ms;
    for(i=0;i<ns.length;i++){n=ns[i];if(!(Math.abs(n.x)<1e5&&Math.abs(n.y)<1e5)){n.x=n.px=0;n.y=n.py=2000;n.vx=n.vy=0;n.fix=true}}
    s.t+=dt;if(s.t>s.timeLimit&&s.st==='run')failSim(s,'time')}
  function stressOf(q){return q.f>=0?q.f/(q.t==='p'?LIM.pT:LIM.rT):(q.t==='p'?-q.f/LIM.pC:0)}
  /* 끝까지 돌려서 결과만 */
  function runParade(L,D,opt){var s=makeSim(L,D,opt);var guard=0;while(s.st==='run'&&guard++<TPS*70)stepSim(s);
    var peak=0;s.cons.forEach(function(c){peak=Math.max(peak,c.mx/(c.t==='p'?LIM.pT:LIM.rT),c.t==='p'?-c.mn/LIM.pC:0)});
    return {ok:s.st==='win',why:s.why,t:s.t,sim:s,peak:peak}}

  /* ---------- 봇: 다리 견본(트러스·현수·버팀) 생성 → 시뮬로 확인 ---------- */
  function build(L,spec){ /* spec: [[x1,y1,x2,y2,t],...] 좌표 기반 → 설계 */
    var D=newDesign(L);
    function jid(x,y){for(var i=0;i<D.j.length;i++)if(Math.hypot(D.j[i].x-x,D.j[i].y-y)<1.5)return i;D.j.push({x:x,y:y,fix:false});return D.j.length-1}
    for(var i=0;i<spec.length;i++){var e=spec[i],a=jid(e[0],e[1]),b=jid(e[2],e[3]);if(a===b||hasMember(D,a,b)>=0)continue;
      var l=Math.hypot(e[0]-e[2],e[1]-e[3]);if(l>(e[4]==='p'?MAXP:MAXR)+.5)return null;D.m.push({a:a,b:b,t:e[4]})}
    for(i=0;i<D.j.length;i++)if(!D.j[i].fix&&inTerrain(L,D.j[i].x,D.j[i].y))return null;
    return D}
  function templates(L,straightOnly){
    var out=[],ax=L.xL,ay=L.yL,bx=L.xR,by=L.yR,len=Math.hypot(bx-ax,by-ay),n0=Math.ceil(len/(MAXP-3));
    function R(v){return Math.round(v)}
    function deckNodes(n){var p=[];for(var i=0;i<=n;i++)p.push([R(ax+(bx-ax)*i/n),R(ay+(by-ay)*i/n)]);return p}
    function chain(P,t,o){for(var i=0;i<P.length-1;i++)o.push([P[i][0],P[i][1],P[i+1][0],P[i+1][1],t||'p'])}
    var posts=L.pegs.filter(function(p){return p[2]==='post'}),pegs=L.pegs.filter(function(p){return p[2]==='peg'}),rocks=L.pegs.filter(function(p){return p[2]==='rock'});
    for(var n=n0;n<=n0+1;n++){
      var P=deckNodes(n),base=[];chain(P,'p',base);
      out.push({name:'straight'+n,spec:base.slice()});if(straightOnly)continue;
      [-1,1].forEach(function(sg){[28,38,50,62].forEach(function(h){
        /* 워렌: 각 칸 가운데 위(아래)에 꼭짓점 */
        var T=[];for(var i=0;i<n;i++)T.push([R((P[i][0]+P[i+1][0])/2),R((P[i][1]+P[i+1][1])/2-sg*h)]);
        var sp=base.slice();for(i=0;i<n;i++){sp.push([P[i][0],P[i][1],T[i][0],T[i][1],'p']);sp.push([T[i][0],T[i][1],P[i+1][0],P[i+1][1],'p'])}
        chain(T,'p',sp);out.push({name:(sg>0?'warrenUp':'warrenDn')+n+'h'+h,spec:sp});
        /* 프랫: 내부 마디 위(아래)에 꼭짓점 + 대각 */
        if(n>=2){var U=[];for(i=1;i<n;i++)U.push([P[i][0],P[i][1]-sg*h]);
          var sq=base.slice();sq.push([P[0][0],P[0][1],U[0][0],U[0][1],'p']);sq.push([U[n-2][0],U[n-2][1],P[n][0],P[n][1],'p']);
          chain(U,'p',sq);for(i=1;i<n;i++)sq.push([P[i][0],P[i][1],U[i-1][0],U[i-1][1],'p']);
          for(i=1;i<n-1;i++){var mid=(n)/2;if(i<mid)sq.push([U[i-1][0],U[i-1][1],P[i+1][0],P[i+1][1],'p']);else sq.push([P[i][0],P[i][1],U[i][0],U[i][1],'p'])}
          out.push({name:(sg>0?'prattUp':'prattDn')+n+'h'+h,spec:sq})}})});
      /* 현수: 기둥에서 각 마디로 밧줄 */
      if(posts.length){var su=base.slice();for(var i2=1;i2<n;i2++){var best=null,bd=1e9;
          posts.forEach(function(p){var d=Math.hypot(p[0]-P[i2][0],p[1]-P[i2][1]);if(d<bd){bd=d;best=p}});
          if(bd<=MAXR)su.push([best[0],best[1],P[i2][0],P[i2][1],'r'])}
        out.push({name:'susp'+n,spec:su});
        var su2=base.slice();for(i2=1;i2<n;i2++)posts.forEach(function(p){if(Math.hypot(p[0]-P[i2][0],p[1]-P[i2][1])<=MAXR)su2.push([p[0],p[1],P[i2][0],P[i2][1],'r'])});
        out.push({name:'susp2_'+n,spec:su2})}
      /* 버팀: 말뚝/바위에서 마디로 판자 */
      if(pegs.length||rocks.length){var bs=base.slice();for(i2=1;i2<n;i2++){var pp=pegs.concat(rocks),bb=null,bd2=1e9;
          pp.forEach(function(p){var d=Math.hypot(p[0]-P[i2][0],p[1]-P[i2][1]);if(d<bd2){bd2=d;bb=p}});
          if(bd2<=MAXP)bs.push([bb[0],bb[1],P[i2][0],P[i2][1],'p'])}
        out.push({name:'brace'+n,spec:bs});
        var bs2=base.slice();for(i2=1;i2<n;i2++)pegs.concat(rocks).forEach(function(p){if(Math.hypot(p[0]-P[i2][0],p[1]-P[i2][1])<=MAXP)bs2.push([p[0],p[1],P[i2][0],P[i2][1],'p'])});
        out.push({name:'brace2_'+n,spec:bs2})}}
    /* 조합: 트러스 + 현수/버팀 */
    var extra=out.filter(function(o){return /^(susp|brace)/.test(o.name)}),tr=out.filter(function(o){return /^(warren|pratt)/.test(o.name)}),comb=[];
    tr.forEach(function(t){extra.forEach(function(e){if(t.name.match(/\d+/)[0]!==e.name.match(/\d+/)[0])return;
      var add=e.spec.filter(function(s){return s[4]==='r'||/brace/.test(e.name)});comb.push({name:t.name+'+'+e.name,spec:t.spec.concat(add)})})});
    return out.concat(comb)}
  /* 한 번도 압축되지 않은 판자는 밧줄로 바꿔 아낀다 */
  function ropeify(L,D,res){var E=cloneDesign(D),ch=0;
    res.sim.cons.forEach(function(c,i){if(E.m[i].t==='p'&&c.mn>-.15&&c.mx<LIM.rT*.85&&res.path.m.indexOf(i)<0){E.m[i].t='r';ch++}});return ch?E:null}
  function solve(L,opt){
    opt=opt||{};var list=templates(L),best=null,sims=0,maxSims=opt.maxSims||400,tried=[];
    list.forEach(function(t){t.D=build(L,t.spec);if(t.D){t.cost=cost(t.D);t.path=deckPath(t.D)}});
    list=list.filter(function(t){return t.D&&t.path}).sort(function(a,b){return a.cost-b.cost});
    for(var i=0;i<list.length&&sims<maxSims;i++){var t=list[i];if(best&&t.cost>=best.cost+30&&opt.quick)break;
      if(best&&t.cost-countRopeable(t)*(COST.p-COST.r)>=best.cost)continue;
      var r=runParade(L,t.D);sims++;tried.push(t.name+':'+(r.ok?'ok':r.why));
      if(!r.ok)continue;r.path=t.path;var cand={D:t.D,cost:t.cost,name:t.name};
      for(var it=0;it<3;it++){var E=ropeify(L,cand.D,r);if(!E)break;var r2=runParade(L,E);sims++;if(!r2.ok)break;r2.path=deckPath(E);r=r2;cand={D:E,cost:cost(E),name:t.name+'*'}}
      if(!best||cand.cost<best.cost)best=cand;if(opt.first)break}
    return best?{D:best.D,cost:best.cost,name:best.name,sims:sims}:{D:null,sims:sims,tried:tried}}
  function countRopeable(t){var n=0;t.spec.forEach(function(s){if(s[4]==='p')n++});return Math.max(0,n-(t.path?t.path.m.length:0))}

  /* ---------- 생성 레벨 (봇이 풀 수 있는지 확인한 것만) ---------- */
  var genCache={};
  function genLevel(n){
    if(genCache[n])return genCache[n];
    var idx=n-LEVELS.length;
    for(var tryN=0;tryN<40;tryN++){
      var r=rnd(9137+n*7919+tryN*104729),gap=Math.round(150+r()*120+Math.min(idx*3,20)),cx=Math.round(180+(r()-.5)*24);
      var xL=Math.max(40,cx-Math.round(gap/2)),xR=Math.min(320,xL+gap),yL=Math.round(286+r()*50),yR=r()<.35?yL+Math.round((r()-.5)*56):yL;
      var pegs=[],dep=50+Math.round(r()*16);
      if(r()<.75){pegs.push([0,yL+dep,'peg']);pegs.push([0,yR+dep,'peg'])}
      if(r()<.38){var ph=Math.round(72+r()*62);pegs.push([xL-20,yL-ph,'post']);pegs.push([xR+20,yR-ph,'post'])}
      if(gap>230&&r()<.6)pegs.push([Math.round((xL+xR)/2),Math.round(Math.max(yL,yR)+70+r()*20),'rock']);
      var b={xL:xL,yL:yL,xR:xR,yR:yR,pegs:pegs,gen:true};
      pegs.forEach(function(p,i){if(p[2]==='peg'){if(i===0)p[0]=Math.round(faceL(b,p[1])+1);else p[0]=Math.round(faceR(b,p[1])-1)}});
      var heavy=r(),pool=['mouse','cat','dog','bear','elephant'],top=heavy<.3-idx*.01?2:heavy<.75?3:4;
      var an=[];for(var i=0;i<=top;i++)if(i===top||r()<.55)an.push(pool[i]);if(an.length<2)an.unshift(pool[Math.max(0,top-2)]);
      b.an=an;b.budget=999;var L=finishLevel(b,n);
      var sol=solve(L,{quick:true,maxSims:40});if(!sol.D)continue;
      /* 직선 다리로는 안 되어야 퍼즐이다 */
      var st=templates(L,true),trivial=false;
      st.forEach(function(t){var D=build(L,t.spec);if(D&&!trivial&&runParade(L,D).ok)trivial=true});
      if(trivial)continue;
      L.budget=Math.ceil(sol.cost*1.25/5)*5;if(L.budget<sol.cost+8)L.budget+=5;L.botCost=sol.cost;L.botName=sol.name;
      genCache[n]=L;return L}
    var F=finishLevel(LEVELS[2],n);genCache[n]=F;return F}
  function getLevel(n){return n<LEVELS.length?finishLevel(LEVELS[n],n):genLevel(n)}

  var CORE={W:W,H:H,G:G,TPS:TPS,MAXP:MAXP,MAXR:MAXR,COST:COST,LIM:LIM,ANIM:ANIM,LEVELS:LEVELS,getLevel:getLevel,genLevel:genLevel,finishLevel:finishLevel,
    newDesign:newDesign,cloneDesign:cloneDesign,addMember:addMember,removeMember:removeMember,planEnd:planEnd,nearJoint:nearJoint,cost:cost,
    deckPath:deckPath,makeSim:makeSim,stepSim:stepSim,runParade:runParade,stressOf:stressOf,build:build,templates:templates,solve:solve,inTerrain:inTerrain,
    faceL:faceL,faceR:faceR};
  if(typeof module!=='undefined'&&module.exports)module.exports=CORE;
  if(typeof SG==='undefined')return;
    /* ================= 게임 ================= */
  var RV=520,PANEL=578;
  var lvN,L,D,path,mode,modeT,time,tests,streak,tG=0,tool,drag,prevDown,cur,kbOn,sim,acc,fast,debris,clouds,lily,lastGain,warned,
      creakT,banner,fallen,initAt=0,hist,msg,confetti,ripples,blinkT;
  var keys={l:false,r:false,u:false,d:false,q:[]};
  if(!window.__plankKeys){window.__plankKeys=true;
    var kf=function(e,v){var c=e.code;
      if(c==='ArrowLeft'||c==='KeyA')keys.l=v;else if(c==='ArrowRight'||c==='KeyD')keys.r=v;
      else if(c==='ArrowUp'||c==='KeyW')keys.u=v;else if(c==='ArrowDown'||c==='KeyS')keys.d=v;
      else if(v&&!e.repeat&&(c==='Space'||c==='Tab'||c==='KeyX'||c==='KeyG'||c==='KeyZ'||c==='KeyC'||c==='Escape'||c==='KeyF'||c==='Enter'))keys.q.push(c);
      else return;
      if(c==='Tab'||c==='Space')e.preventDefault()};
    window.addEventListener('keydown',function(e){kf(e,true)});
    window.addEventListener('keyup',function(e){kf(e,false)});
    window.addEventListener('blur',function(){keys.l=keys.r=keys.u=keys.d=false});
    window.addEventListener('pointerdown',function(e){var t=e.target;if(t&&t.tagName==='CANVAS'){var r=t.getBoundingClientRect();
      keys.ptr=true;keys.px=(e.clientX-r.left)/r.width*W;keys.py=(e.clientY-r.top)/r.height*H}})}

  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  var BTN={tool:[10,PANEL+10,112,44],undo:[128,PANEL+10,54,44],clear:[188,PANEL+10,54,44],go:[248,PANEL+10,60,44],
           stop:[10,PANEL+10,80,44],ff:[96,PANEL+10,60,44]};
  function inB(b,x,y){return x>=b[0]&&x<=b[0]+b[2]&&y>=b[1]&&y<=b[1]+b[3]}

  function queuePos(i){return {x:L.xL+queueOff(L.an,i),y:L.yL}}
  function load(n){lvN=n;L=getLevel(n);RV=L.river;D=newDesign(L);path=null;mode='build';modeT=0;tests=0;drag=null;sim=null;
    debris=[];hist=[];fallen=[];msg=null;banner=1.6;fast=false;
    cur.x=L.xL;cur.y=L.yL;cur.snap=0}
  function init(a){
    time=55;streak=0;prevDown=true;kbOn=false;tool='p';lastGain=0;warned=0;creakT=0;confetti=[];keys.q.length=0;initAt=performance.now();
    cur={x:150,y:330,snap:-1};blinkT=[0,0,0,0,0];
    clouds=[];for(var i=0;i<5;i++)clouds.push({x:hash(i+1)*W,y:70+hash(i+9)*120,s:.6+hash(i+5)*.6,v:4+hash(i+3)*7});
    lily=[];for(i=0;i<6;i++)lily.push({x:hash(i+40)*W,y:RV+12+hash(i+50)*44,r:7+hash(i+60)*5,p:hash(i+70)*6});
    ripples=[];load(0);a.tempo(1)}
  function refreshPath(){path=deckPath(D)}

  /* ---------- 행동 ---------- */
  function tryAdd(a,j,x,y){
    if(cost(D)+COST[tool]>L.budget){a.beep(150,.15,'square');a.pop(x,y-14,a.lang==='ko'?'동전 부족!':'Out of coins!','#e05a3a');a.shake(3);return false}
    var m=addMember(L,D,j,x,y,tool);
    if(!m){a.beep(180,.08,'square');return false}
    hist.push(m);refreshPath();
    var B=D.j[m.b];a.beep(tool==='p'?520:760,.05,'triangle');a.beep(tool==='p'?260:380,.07,'square');
    a.burst(B.x,B.y,tool==='p'?'#e8b878':'#f3e1b0',5);a.pop(B.x,B.y-16,'-'+COST[tool],'#ffcf3a');return true}
  function delMember(a,i){var m=D.m[i],A=D.j[m.a],B=D.j[m.b];a.burst((A.x+B.x)/2,(A.y+B.y)/2,'#c9935a',6);a.beep(330,.06,'sawtooth');
    a.pop((A.x+B.x)/2,(A.y+B.y)/2-12,'+'+COST[m.t],'#ffe680');
    var h=hist.indexOf(m);if(h>=0)hist.splice(h,1);removeMember(D,i);refreshPath()}
  function undo(a){if(!D.m.length){a.beep(160,.06,'square');return}var m=hist.length?hist.pop():D.m[D.m.length-1],i=D.m.indexOf(m);
    if(i<0)i=D.m.length-1;var A=D.j[D.m[i].a],B=D.j[D.m[i].b];a.burst((A.x+B.x)/2,(A.y+B.y)/2,'#c9935a',5);a.sfx('tap');removeMember(D,i);refreshPath()}
  function clearAll(a){if(!D.m.length)return;D=newDesign(L);hist=[];refreshPath();a.beep(300,.08,'sawtooth');a.beep(200,.12,'sawtooth');a.shake(3)}
  function memberAt(x,y,r){var best=-1,bd=r||11;
    for(var i=0;i<D.m.length;i++){var m=D.m[i],A=D.j[m.a],B=D.j[m.b],dx=B.x-A.x,dy=B.y-A.y,l=dx*dx+dy*dy,t=l?((x-A.x)*dx+(y-A.y)*dy)/l:0;
      t=t<0?0:t>1?1:t;var d=Math.hypot(x-A.x-dx*t,y-A.y-dy*t);if(d<bd){bd=d;best=i}}return best}
  function go(a){
    refreshPath();var ko=a.lang==='ko';
    if(!path){a.beep(150,.2,'square');a.shake(4);msg={t:2.2,s:ko?'강둑에서 강둑까지 판자를 이어요':'Planks must reach bank to bank'};return}
    drag=null;tests++;sim=makeSim(L,cloneDesign(D));acc=0;mode='parade';modeT=0;fallen=[];debris=[];a.sfx('jump');
    a.beep(660,.08,'triangle');a.beep(880,.1,'triangle')}
  function stopTest(){sim=null;mode='build';modeT=0;debris=[]}

  function update(dt,inp,a){
    var ko=a.lang==='ko',fresh=keys.ptr&&inp.x!=null,i,px=keys.px,py=keys.py;keys.ptr=false;
    if(banner>0)banner-=dt;if(msg){msg.t-=dt;if(msg.t<=0)msg=null}
    if(mode==='build'){time-=dt;
      if(time<=0){time=0;a.over();return}
      if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(880,.05,'square')}}
    if(inp.down)kbOn=false;
    var q=keys.q.splice(0,keys.q.length).filter(function(){return performance.now()>initAt+60});
    if(q.length||keys.l||keys.r||keys.u||keys.d)kbOn=true;
    if(mode==='build'){
      /* ---- 키보드 ---- */
      var sp=150*dt;if(keys.l)cur.x-=sp;if(keys.r)cur.x+=sp;if(keys.u)cur.y-=sp;if(keys.d)cur.y+=sp;
      cur.x=Math.max(6,Math.min(W-6,cur.x));cur.y=Math.max(TOPY,Math.min(RV-6,cur.y));
      var moving=keys.l||keys.r||keys.u||keys.d;cur.snap=nearJoint(D,cur.x,cur.y,12);
      if(!moving&&cur.snap>=0){cur.x+=(D.j[cur.snap].x-cur.x)*Math.min(1,dt*14);cur.y+=(D.j[cur.snap].y-cur.y)*Math.min(1,dt*14)}
      for(i=0;i<q.length;i++){var c=q[i];
        if(c==='Space'||c==='Enter'){
          if(drag&&drag.k){var ok=tryAdd(a,drag.j,cur.x,cur.y);if(ok){var nb=nearJoint(D,cur.x,cur.y,SNAP);drag=nb>=0?{j:nb,k:true}:null;if(!drag)cur.snap=-1}}
          else{var j0=nearJoint(D,cur.x,cur.y,16);if(j0>=0){drag={j:j0,k:true};a.beep(440,.04,'triangle')}else a.beep(170,.06,'square')}}
        else if(c==='Escape'){drag=null}
        else if(c==='Tab'){tool=tool==='p'?'r':'p';a.sfx('tap')}
        else if(c==='KeyX'){var mi=memberAt(cur.x,cur.y,30);if(mi>=0)delMember(a,mi);else a.beep(170,.05,'square')}
        else if(c==='KeyZ')undo(a);
        else if(c==='KeyC')clearAll(a);
        else if(c==='KeyG'){go(a);return}}
      /* ---- 터치/마우스 ---- */
      if(fresh){var x=px,y=py;
        if(inB(BTN.tool,x,y)){tool=tool==='p'?'r':'p';a.sfx('tap')}
        else if(inB(BTN.undo,x,y))undo(a);
        else if(inB(BTN.clear,x,y))clearAll(a);
        else if(inB(BTN.go,x,y)){go(a);prevDown=inp.down;return}
        else if(y<PANEL){var jj=nearJoint(D,x,y,19);drag={j:jj,k:false,sx:x,sy:y,moved:false,x:x,y:y};if(jj<0)drag.tapOnly=true}}
      if(drag&&!drag.k){
        if(inp.down&&inp.x!=null){drag.x=inp.x;drag.y=inp.y;if(Math.hypot(inp.x-drag.sx,inp.y-drag.sy)>9)drag.moved=true}
        else if(!inp.down){
          if(!drag.moved){if(drag.j<0){var mi2=memberAt(drag.sx,drag.sy,12);if(mi2>=0)delMember(a,mi2)}}
          else if(!drag.tapOnly)tryAdd(a,drag.j,drag.x,drag.y);
          drag=null}}
    }else if(mode==='parade'||mode==='fail'){
      modeT+=dt;
      for(i=0;i<q.length;i++){if(q[i]==='KeyF')fast=!fast;else if((q[i]==='KeyG'||q[i]==='Escape')&&mode==='parade'){stopTest();return}}
      if(fresh&&mode==='parade'){if(inB(BTN.stop,px,py)){stopTest();a.sfx('tap');prevDown=inp.down;return}
        if(inB(BTN.ff,px,py)){fast=!fast;a.sfx('tap')}}
      acc+=dt*(fast?2.5:1);var n=0;
      while(acc>=1/TPS&&n<8){stepSim(sim);acc-=1/TPS;n++;handleEvents(a)}if(n>=8)acc=0;
      /* 삐걱 소리: 응력이 높을수록 높은 음 */
      creakT-=dt;if(sim.maxStress>.45&&creakT<=0&&mode==='parade'){creakT=.16+(1-sim.maxStress)*.5;a.beep(140+sim.maxStress*520+Math.random()*30,.05,'sawtooth')}
      if(mode==='parade'&&sim.st==='win')clearLevel(a);
      else if(mode==='parade'&&sim.st==='fail'){mode='fail';modeT=0}
      if(mode==='fail'&&modeT>2.1){time=Math.max(0,time-3);a.pop(W/2,110,ko?'-3초':'-3s','#ff6a5a');a.beep(220,.12,'sine');
        streak=0;stopTest();if(time<=0){a.over();return}}
    }else if(mode==='clear'){modeT+=dt;
      if(modeT>.15&&modeT<1.6&&Math.random()<dt*10)a.burst(L.xR+20+Math.random()*60,L.yR-50-Math.random()*30,['#ffd23f','#ff7a8a','#6fc3ff','#8be28b'][Math.floor(Math.random()*4)],6);
      if(modeT>2.3)load(lvN+1)}
    updateFx(dt);prevDown=inp.down}

  function handleEvents(a){
    for(var i=0;i<sim.ev.length;i++){var e=sim.ev[i];
      if(e.t==='break'){var c=sim.cons[e.c],A=sim.nodes[c.a],B=sim.nodes[c.b];
        debris.push(piece(A.x,A.y,e.x,e.y,c.t,A,-1),piece(e.x,e.y,B.x,B.y,c.t,B,1));
        a.burst(e.x,e.y,c.t==='p'?'#b98250':'#e9d7a4',12);a.shake(c.t==='p'?7:4);
        a.beep(c.t==='p'?95:300,.18,'sawtooth');a.beep(c.t==='p'?60:200,.25,'square');a.pop(e.x,e.y-14,a.lang==='ko'?'뚝!':'Snap!','#ff6a4a')}
      else if(e.t==='fall'){var an=sim.animals[e.k];fallen.push(an);a.sfx('hit')}
      else if(e.t==='win'){}}
    sim.ev.length=0;
    for(i=0;i<sim.animals.length;i++){var b=sim.animals[i];if(b.st==='fall'&&!b.splashed&&b.y>=RV-1){b.splashed=true;
      a.burst(b.x,RV,'#bfe8ff',14);a.beep(500,.08,'sine');a.beep(250,.2,'sine');ripples.push({x:b.x,y:RV+4,t:0})}}}
  function piece(x1,y1,x2,y2,t,N,side){var cx=(x1+x2)/2,cy=(y1+y2)/2;
    return {x:cx,y:cy,l:Math.hypot(x2-x1,y2-y1),ang:Math.atan2(y2-y1,x2-x1),vx:(N.vx||0)*.5+side*30,vy:(N.vy||0)*.5-40,av:side*(2+Math.random()*3),t:t,life:3.5,wet:false}}
  function clearLevel(a){
    var ko=a.lang==='ko',left=L.budget-cost(D),first=tests===1,bonus=Math.floor(left/2),pts=10+bonus+(first?5:0)+(first?Math.min(streak,5)*2:0);
    if(first)streak++;else streak=0;
    a.add(pts);time=Math.min(70,time+14);lastGain=1.4;mode='clear';modeT=0;a.sfx('win');a.beep(1568,.25,'sine');
    var big=L.an.indexOf('elephant')>=0;
    for(var i=0;i<(big?70:30);i++)confetti.push({x:W/2+(Math.random()-.5)*80,y:160,vx:(Math.random()-.5)*300,vy:-150-Math.random()*250,c:['#ffd23f','#ff7a8a','#6fc3ff','#8be28b','#c79bff'][i%5],r:Math.random()*6,av:(Math.random()-.5)*12,t:0});
    a.pop(W/2,190,'+'+pts,'#ffcf3a');
    if(first)a.pop(W/2,214,(ko?'한 번에!':'First try!')+(streak>1?' x'+streak:''),'#7a5cff');
    if(left>0)a.pop(W/2,238,(ko?'남은 동전 +':'Coins left +')+bonus,'#ffe680');
    a.tempo(1+Math.min(.5,(lvN+1)*.04));
    if(lvN+1>=LEVELS.length)getLevel(lvN+1)}
  function updateFx(dt){
    for(var i=debris.length-1;i>=0;i--){var p=debris[i];p.life-=dt;if(p.life<=0){debris.splice(i,1);continue}
      if(p.y<RV+2){p.vy+=G*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.ang+=p.av*dt;if(p.y>=RV+2){p.wet=true;ripples.push({x:p.x,y:RV+4,t:0})}}
      else{p.y=RV+2+Math.sin(tG*3+p.x)*1.5;p.x+=8*dt;p.av*=.9;p.ang+=(Math.round(p.ang/Math.PI)*Math.PI-p.ang)*dt*2}}
    for(i=confetti.length-1;i>=0;i--){var c=confetti[i];c.t+=dt;c.vy+=380*dt;c.vx*=.99;c.x+=c.vx*dt;c.y+=c.vy*dt;c.r+=c.av*dt;if(c.t>3)confetti.splice(i,1)}
    for(i=ripples.length-1;i>=0;i--){ripples[i].t+=dt;if(ripples[i].t>1.4)ripples.splice(i,1)}
    if(lastGain>0)lastGain-=dt}

  /* ================= 그리기 ================= */
  function stressCol(r){r=Math.max(0,Math.min(1.1,r));var g=[[110,200,90],[245,205,60],[235,70,50]],k=r<.5?0:1,u=r<.5?r/.5:Math.min(1,(r-.5)/.5);
    return 'rgb('+Math.round(g[k][0]+(g[k+1][0]-g[k][0])*u)+','+Math.round(g[k][1]+(g[k+1][1]-g[k][1])*u)+','+Math.round(g[k][2]+(g[k+1][2]-g[k][2])*u)+')'}
  function drawSky(g,t,dt){
    var gr=g.createLinearGradient(0,0,0,RV);gr.addColorStop(0,'#7fc8f5');gr.addColorStop(.55,'#bfe6fb');gr.addColorStop(1,'#f4f8dc');
    g.fillStyle=gr;g.fillRect(-20,-20,W+40,RV+40);
    /* 해 */
    g.fillStyle='rgba(255,240,170,.35)';g.beginPath();g.arc(300,108,40+Math.sin(t*1.3)*2,0,7);g.fill();
    g.fillStyle='#ffe58a';g.beginPath();g.arc(300,108,24,0,7);g.fill();
    /* 구름 */
    for(var i=0;i<clouds.length;i++){var p=clouds[i];p.x+=p.v*dt;if(p.x>W+70)p.x=-70;
      g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.ellipse(p.x,p.y,30*p.s,10*p.s,0,0,7);g.ellipse(p.x-12*p.s,p.y-7*p.s,14*p.s,11*p.s,0,0,7);
      g.ellipse(p.x+11*p.s,p.y-9*p.s,17*p.s,13*p.s,0,0,7);g.fill();
      g.fillStyle='rgba(170,200,230,.35)';g.beginPath();g.ellipse(p.x,p.y+4*p.s,28*p.s,5*p.s,0,0,7);g.fill()}
    /* 먼 산 + 폭포 */
    var off=Math.sin(t*.05)*6;
    g.fillStyle='#a9d4c9';g.beginPath();g.moveTo(-20,RV);
    for(var x=-20;x<=W+20;x+=20)g.lineTo(x,250+Math.sin((x+off)*.018)*26+Math.sin(x*.05)*8);g.lineTo(W+20,RV);g.fill();
    var wx=226+off*.3;g.fillStyle='#8cc3b6';g.fillRect(wx-16,226,40,RV-226);
    g.fillStyle='rgba(235,250,255,.85)';g.fillRect(wx-4,236,14,RV-236);
    g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=1.5;
    for(i=0;i<6;i++){var yy=236+((t*70+i*40)%(RV-236));g.beginPath();g.moveTo(wx-2,yy);g.lineTo(wx-2,yy+14);g.moveTo(wx+7,yy+20);g.lineTo(wx+7,yy+30);g.stroke()}
    var off2=Math.sin(t*.09)*10;g.fillStyle='#86c48a';g.beginPath();g.moveTo(-20,RV);
    for(x=-20;x<=W+20;x+=16)g.lineTo(x,318+Math.sin((x+off2)*.03+1)*20+Math.cos(x*.011)*12);g.lineTo(W+20,RV);g.fill();
    /* 나무 실루엣 */
    for(i=0;i<7;i++){var tx=hash(i+3)*W+off2*.6,ty=318+Math.sin((tx)*.03+1)*20+Math.cos(tx*.011)*12-4;
      g.fillStyle='#6aa86f';g.beginPath();g.arc(tx,ty-10,9+hash(i)*5,0,7);g.fill();g.fillStyle='#5a8f5c';g.fillRect(tx-1.5,ty-3,3,8)}}
  function drawRiver(g,t){
    var gr=g.createLinearGradient(0,RV,0,H);gr.addColorStop(0,'#56b6d8');gr.addColorStop(1,'#2c84b8');g.fillStyle=gr;g.fillRect(-20,RV,W+40,H-RV+20);
    g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=1.6;g.lineCap='round';
    for(var i=0;i<14;i++){var y=RV+8+(i*9)%52,x=((hash(i)*W+t*(10+i%4*6))%(W+60))-30;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+8,y-2.5,x+16,y);g.stroke()}
    for(i=0;i<lily.length;i++){var p=lily[i],lx=(p.x+Math.sin(t*.4+p.p)*6),ly=p.y+Math.sin(t*1.2+p.p)*1.2;
      g.fillStyle='rgba(20,70,100,.25)';g.beginPath();g.ellipse(lx+2,ly+2,p.r,p.r*.45,0,0,7);g.fill();
      g.fillStyle='#5fbf62';g.beginPath();g.ellipse(lx,ly,p.r,p.r*.45,0,.25,6.1);g.lineTo(lx,ly);g.fill();
      if(i%3===0){g.fillStyle='#ffb3d1';g.beginPath();g.arc(lx-2,ly-2,2.6,0,7);g.fill()}}
    for(i=0;i<ripples.length;i++){var r=ripples[i];g.strokeStyle='rgba(255,255,255,'+(1-r.t/1.4)*.8+')';g.lineWidth=2;
      g.beginPath();g.ellipse(r.x,r.y,6+r.t*30,2+r.t*7,0,0,7);g.stroke()}}
  function bankPoly(g,side){
    var y0=side<0?L.yL:L.yR,x0=side<0?L.xL:L.xR,yb=RV+20,fb=side<0?faceL(L,yb):faceR(L,yb),edge=side<0?-20:W+20;
    g.beginPath();g.moveTo(edge,y0);g.lineTo(x0-side*4,y0);g.quadraticCurveTo(x0,y0,x0+side*0,y0+5);g.lineTo(fb,yb);g.lineTo(edge,yb);g.closePath()}
  function drawBanks(g,t){
    [-1,1].forEach(function(side){
      var y0=side<0?L.yL:L.yR,x0=side<0?L.xL:L.xR;
      bankPoly(g,side);var gr=g.createLinearGradient(0,y0,0,RV);gr.addColorStop(0,'#b98a5c');gr.addColorStop(1,'#7d5638');g.fillStyle=gr;g.fill();
      g.save();bankPoly(g,side);g.clip();
      g.strokeStyle='rgba(90,58,36,.35)';g.lineWidth=2;
      for(var k=0;k<9;k++){var yy=y0+22+k*24;g.beginPath();g.moveTo(side<0?-20:x0-60,yy+Math.sin(k)*3);
        for(var x=side<0?-20:x0-60;side<0?x<x0+30:x<W+20;x+=18)g.lineTo(x,yy+Math.sin(x*.07+k)*3);g.stroke()}
      for(k=0;k<14;k++){var sx=side<0?hash(k+side*9)*x0:x0+hash(k+side*9)*(W-x0),sy=y0+20+hash(k+31+side)*(RV-y0);
        g.fillStyle='rgba(70,46,30,.25)';g.beginPath();g.ellipse(sx,sy,5+hash(k)*5,3+hash(k+2)*2,0,0,7);g.fill()}
      /* 절벽면 그림자 */
      var fx=side<0?faceL(L,RV):faceR(L,RV);g.fillStyle='rgba(50,30,20,.22)';g.beginPath();g.moveTo(x0,y0);g.lineTo(fx,RV+20);g.lineTo(fx-side*16,RV+20);g.lineTo(x0-side*12,y0);g.fill();
      g.restore();
      /* 풀 */
      g.fillStyle='#78c35a';g.beginPath();g.moveTo(side<0?-20:x0-4,y0-3);g.lineTo(side<0?x0+3:W+20,y0-3);g.lineTo(side<0?x0+3:W+20,y0+7);g.lineTo(side<0?-20:x0-4,y0+7);g.fill();
      g.fillStyle='#5ea64a';for(k=0;k<10;k++){var gx=side<0?x0+2-k*12:x0-2+k*12;g.beginPath();g.arc(gx,y0+7,5,0,3.14);g.fill()}
      g.strokeStyle='#4f9a3c';g.lineWidth=2;g.lineCap='round';
      for(k=0;k<12;k++){var gx2=side<0?x0-4-k*10-hash(k)*4:x0+4+k*10+hash(k)*4,sw=Math.sin(t*1.6+k)*2;g.beginPath();g.moveTo(gx2,y0-2);g.quadraticCurveTo(gx2+sw*.4,y0-7,gx2+sw,y0-10-hash(k+5)*4);g.stroke()}
      /* 갈대 */
      var rx=side<0?faceL(L,RV)-6:faceR(L,RV)+6;for(k=0;k<5;k++){var rr=rx-side*k*5,sw2=Math.sin(t*1.3+k)*3;
        g.strokeStyle='#5c9b47';g.lineWidth=2;g.beginPath();g.moveTo(rr,RV+6);g.quadraticCurveTo(rr+sw2*.5,RV-12,rr+sw2,RV-24-k%2*6);g.stroke();
        if(k%2===0){g.fillStyle='#8a5a33';g.beginPath();g.ellipse(rr+sw2,RV-26-k%2*6,2,5,0,0,7);g.fill()}}});
    /* 기둥·바위·말뚝 */
    for(var i=0;i<L.pegs.length;i++){var p=L.pegs[i];
      if(p[2]==='post'){var by=p[0]<180?L.yL:L.yR;
        g.fillStyle='rgba(60,40,20,.25)';g.fillRect(p[0]-3,p[1]+4,10,by-p[1]);
        g.fillStyle='#8b5a32';g.fillRect(p[0]-5,p[1],10,by-p[1]+2);g.fillStyle='#a8723f';g.fillRect(p[0]-5,p[1],4,by-p[1]+2);
        g.strokeStyle='#6b4222';g.lineWidth=2;g.beginPath();g.moveTo(p[0]-12,by);g.lineTo(p[0],by-34);g.lineTo(p[0]+12,by);g.stroke();
        var fl=Math.sin(t*4+i)*3;g.strokeStyle='#6b4222';g.lineWidth=1.5;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(p[0],p[1]-16);g.stroke();
        g.fillStyle=p[0]<180?'#ff7a6a':'#6ab8ff';g.beginPath();g.moveTo(p[0],p[1]-16);g.quadraticCurveTo(p[0]+7,p[1]-14+fl,p[0]+13,p[1]-12+fl);g.lineTo(p[0],p[1]-9);g.fill()}
      else if(p[2]==='rock'){g.fillStyle='rgba(20,60,90,.3)';g.beginPath();g.ellipse(p[0],RV+6,34,6,0,0,7);g.fill();
        var rg=g.createLinearGradient(p[0]-25,0,p[0]+25,0);rg.addColorStop(0,'#9aa3a8');rg.addColorStop(1,'#6b767c');g.fillStyle=rg;
        g.beginPath();g.moveTo(p[0]-30,RV+6);g.quadraticCurveTo(p[0]-24,p[1]+12,p[0]-12,p[1]-2);g.quadraticCurveTo(p[0],p[1]-8,p[0]+12,p[1]-2);
        g.quadraticCurveTo(p[0]+24,p[1]+12,p[0]+30,RV+6);g.fill();
        g.fillStyle='#78b55c';g.beginPath();g.ellipse(p[0]-4,p[1]-3,10,4,-.2,0,7);g.fill()}
      else{g.fillStyle='#8f969a';g.beginPath();g.ellipse(p[0],p[1],9,7,0,0,7);g.fill();g.fillStyle='#b5bcc0';g.beginPath();g.ellipse(p[0]-2,p[1]-2,6,4,0,0,7);g.fill()}}}
  function bolt(g,x,y,r,fix){
    if(fix){g.fillStyle='#3f3a36';g.beginPath();g.arc(x,y,r+2.5,0,7);g.fill()}
    var gr=g.createRadialGradient(x-r*.4,y-r*.4,0,x,y,r);gr.addColorStop(0,'#fff2b0');gr.addColorStop(.5,'#e0b445');gr.addColorStop(1,'#9b6f1c');
    g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.strokeStyle='rgba(90,60,10,.7)';g.lineWidth=1;g.beginPath();g.moveTo(x-r*.5,y);g.lineTo(x+r*.5,y);g.stroke()}
  function plank(g,ax,ay,bx,by,deck,stress,alpha,ghost){
    var l=Math.hypot(bx-ax,by-ay),an=Math.atan2(by-ay,bx-ax),w=deck?9:7;g.save();g.globalAlpha=alpha==null?1:alpha;g.translate(ax,ay);g.rotate(an);
    g.fillStyle='rgba(40,25,10,.22)';g.fillRect(0,w/2-1,l,4);
    g.fillStyle=ghost||'#a86e3c';g.fillRect(-2,-w/2,l+4,w);
    if(!ghost){g.fillStyle='#c98d55';g.fillRect(-2,-w/2,l+4,w*.45);
      g.strokeStyle='rgba(110,66,30,.55)';g.lineWidth=.8;for(var k=0;k<3;k++){var o=(hash(l+k)*.6+.2)*l;g.beginPath();g.moveTo(o,-w/2+2+k*1.6);g.quadraticCurveTo(o+8,-w/2+1+k*1.6,o+16,-w/2+2.5+k*1.6);g.stroke()}
      if(deck){g.strokeStyle='rgba(90,50,20,.55)';g.lineWidth=1;for(var x=6;x<l;x+=8){g.beginPath();g.moveTo(x,-w/2);g.lineTo(x,w/2);g.stroke()}}
      if(stress!=null){g.globalAlpha=(alpha==null?1:alpha)*Math.min(.85,.5+stress*.4);g.fillStyle=stressCol(stress);g.fillRect(-2,-w/2,l+4,w);
        g.globalAlpha=alpha==null?1:alpha;g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.beginPath();g.moveTo(0,-w/2+1.5);g.lineTo(l,-w/2+1.5);g.stroke()}}
    g.restore()}
  function rope(g,ax,ay,bx,by,sag,stress,alpha,ghost){
    var mx=(ax+bx)/2,my=(ay+by)/2+sag;g.save();g.globalAlpha=alpha==null?1:alpha;g.lineCap='round';
    g.strokeStyle='rgba(40,25,10,.2)';g.lineWidth=3;g.beginPath();g.moveTo(ax+1,ay+3);g.quadraticCurveTo(mx+1,my+3,bx+1,by+3);g.stroke();
    g.strokeStyle=ghost||(stress!=null?stressCol(stress):'#d8b77a');g.lineWidth=3.2;g.beginPath();g.moveTo(ax,ay);g.quadraticCurveTo(mx,my,bx,by);g.stroke();
    if(!ghost){g.strokeStyle='rgba(120,85,40,.7)';g.lineWidth=1;g.setLineDash([2,3]);g.beginPath();g.moveTo(ax,ay);g.quadraticCurveTo(mx,my,bx,by);g.stroke();g.setLineDash([])}
    g.restore()}

  /* ---------- 동물 ---------- */
  function eye(g,x,y,r,mood,blink){g.fillStyle='#2a1d17';g.strokeStyle='#2a1d17';g.lineWidth=1.4;
    if(mood===3){g.beginPath();g.arc(x,y+r*.5,r,3.5,5.9);g.stroke();return}
    if(blink){g.beginPath();g.moveTo(x-r,y);g.lineTo(x+r,y);g.stroke();return}
    var rr=mood===2?r*1.35:r;if(mood===2){g.fillStyle='#fff';g.beginPath();g.arc(x,y,rr+.8,0,7);g.fill();g.fillStyle='#2a1d17'}
    g.beginPath();g.arc(x,y,mood===2?rr*.6:rr,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x+rr*.3,y-rr*.35,rr*.35,0,7);g.fill()}
  function legs(g,list,ph,len,wd,col,moving){g.strokeStyle=col;g.lineWidth=wd;g.lineCap='round';
    for(var i=0;i<list.length;i++){var sw=moving?Math.sin(ph+(i%2?Math.PI:0)+(i>1?.6:0))*.5:0;g.beginPath();g.moveTo(list[i],-len);g.lineTo(list[i]+Math.sin(sw)*len,-len+Math.cos(sw)*len);g.stroke()}}
  function drawAnimal(g,k,x,y,ang,ph,mood,blink,swim){
    g.save();g.translate(x,y);g.rotate(ang);var moving=mood===1||mood===2,bob=moving?Math.abs(Math.sin(ph))*1.5:0;
    if(mood===3)bob=Math.abs(Math.sin(tG*10))*4;g.translate(0,-bob);
    if(!swim){g.fillStyle='rgba(30,20,10,.22)';g.beginPath();g.ellipse(0,bob,ANIM[AW[k]].r+3,2.5,0,0,7);g.fill()}
    if(k==='mouse'){
      if(!swim)legs(g,[-5,-2,3,6],ph,4,1.6,'#8a7f86',moving);
      g.strokeStyle='#e79aa8';g.lineWidth=1.3;g.beginPath();g.moveTo(-8,-6);g.quadraticCurveTo(-15,-4+Math.sin(tG*5)*2,-16,-11);g.stroke();
      g.fillStyle='#a79ca3';g.beginPath();g.ellipse(0,-7,9,5.5,0,0,7);g.fill();g.fillStyle='#c2b9be';g.beginPath();g.ellipse(-1,-9,6,2.5,0,0,7);g.fill();
      g.fillStyle='#a79ca3';g.beginPath();g.arc(8,-9,5,0,7);g.fill();g.fillStyle='#c9bfc5';g.beginPath();g.arc(6,-14,3.8,0,7);g.fill();
      g.fillStyle='#f2a6b6';g.beginPath();g.arc(6,-14,2.2,0,7);g.fill();g.fillStyle='#e77f93';g.beginPath();g.arc(13,-8.5,1.4,0,7);g.fill();
      eye(g,9.5,-10,1.4,mood,blink);
      /* 깃발 */
      var fw=Math.sin(tG*7)*2.5;g.strokeStyle='#7b5230';g.lineWidth=1.4;g.beginPath();g.moveTo(3,-11);g.lineTo(5,-34);g.stroke();
      g.fillStyle='#ff5a5a';g.beginPath();g.moveTo(5,-34);g.quadraticCurveTo(11,-33+fw,18,-31+fw);g.quadraticCurveTo(11,-28+fw*.6,5,-26);g.fill();
      g.fillStyle='#ffe066';g.beginPath();g.arc(9.5,-30.5+fw*.6,1.6,0,7);g.fill()}
    else if(k==='cat'){
      if(!swim)legs(g,[-7,-3,5,9],ph,6,2.6,'#d9822b',moving);
      g.strokeStyle='#e8913a';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(-10,-12);g.quadraticCurveTo(-18,-16,-17+Math.sin(tG*3)*3,-27);g.stroke();
      g.fillStyle='#f2a04a';g.beginPath();g.ellipse(0,-12,11,6.5,0,0,7);g.fill();
      g.strokeStyle='rgba(180,95,30,.6)';g.lineWidth=1.6;for(var s2=-5;s2<=3;s2+=4){g.beginPath();g.moveTo(s2,-18);g.lineTo(s2+1,-13);g.stroke()}
      g.fillStyle='#f2a04a';g.beginPath();g.arc(11,-17,6.5,0,7);g.fill();
      g.beginPath();g.moveTo(6,-21);g.lineTo(7,-28);g.lineTo(11,-23);g.fill();g.beginPath();g.moveTo(12,-23);g.lineTo(16,-28);g.lineTo(16.5,-20);g.fill();
      g.fillStyle='#fff3e0';g.beginPath();g.ellipse(14,-14.5,3.5,2.4,0,0,7);g.fill();g.fillStyle='#e0607a';g.beginPath();g.arc(16.5,-16,1.1,0,7);g.fill();
      eye(g,12.5,-18.5,1.5,mood,blink)}
    else if(k==='dog'){
      if(!swim)legs(g,[-8,-4,5,9],ph,7,3,'#b9844e',moving);
      g.strokeStyle='#c99560';g.lineWidth=3;g.beginPath();g.moveTo(-11,-15);g.lineTo(-17,-21+Math.sin(tG*16)*3);g.stroke();
      g.fillStyle='#d9a56c';g.beginPath();g.ellipse(0,-14,12.5,7.5,0,0,7);g.fill();g.fillStyle='#fff1dc';g.beginPath();g.ellipse(2,-11,7,3,0,0,7);g.fill();
      g.fillStyle='#d9a56c';g.beginPath();g.arc(12,-20,7.5,0,7);g.fill();g.beginPath();g.ellipse(18,-17,5,3.6,0,0,7);g.fill();
      g.fillStyle='#2a1d17';g.beginPath();g.arc(22,-18,1.8,0,7);g.fill();
      g.fillStyle='#8a5a33';g.beginPath();g.ellipse(8,-19,3.2,6.5,.35+(moving?Math.sin(ph)*.2:0),0,7);g.fill();
      g.fillStyle='#e05a5a';g.fillRect(4,-14.5,6,2);eye(g,13.5,-22,1.6,mood,blink)}
    else if(k==='bear'){
      if(!swim)legs(g,[-11,-5,6,11],ph,8,5,'#6b4426',moving);
      g.fillStyle='#86552f';g.beginPath();g.ellipse(0,-18,17,11,0,0,7);g.fill();g.fillStyle='#9b6a40';g.beginPath();g.ellipse(-2,-23,11,4,0,0,7);g.fill();
      g.fillStyle='#86552f';g.beginPath();g.arc(15,-25,10,0,7);g.fill();g.beginPath();g.arc(9,-34,4,0,7);g.arc(18,-34.5,4,0,7);g.fill();
      g.fillStyle='#c79a6c';g.beginPath();g.arc(9,-34,2,0,7);g.arc(18,-34.5,2,0,7);g.fill();g.beginPath();g.ellipse(22,-22,5,4,0,0,7);g.fill();
      g.fillStyle='#2a1d17';g.beginPath();g.arc(25,-23.5,1.8,0,7);g.fill();eye(g,17,-28,1.8,mood,blink)}
    else{
      if(!swim)legs(g,[-14,-7,8,14],ph,11,7,'#7f8fa3',moving);
      g.strokeStyle='#8e9fb3';g.lineWidth=2;g.beginPath();g.moveTo(-21,-24);g.quadraticCurveTo(-26,-18,-25,-14+Math.sin(tG*4)*2);g.stroke();
      g.fillStyle='#93a4b8';g.beginPath();g.ellipse(0,-24,21,14,0,0,7);g.fill();g.fillStyle='#a9b8ca';g.beginPath();g.ellipse(-3,-30,13,5,0,0,7);g.fill();
      g.fillStyle='#93a4b8';g.beginPath();g.arc(19,-30,12,0,7);g.fill();
      var tr=Math.sin(tG*2.5+(moving?ph:0))*.25;g.strokeStyle='#93a4b8';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(28,-28);
      g.quadraticCurveTo(36,-20,33+Math.sin(tr)*8,-8+(mood===3?-22:0));g.stroke();
      g.fillStyle='#fffbe8';g.beginPath();g.moveTo(25,-23);g.lineTo(31,-19);g.lineTo(25,-21);g.fill();
      g.fillStyle='#7f8fa3';g.beginPath();g.ellipse(12,-29,8,11,-.2+Math.sin(tG*2)*.08,0,7);g.fill();g.fillStyle='#e8a9b6';g.beginPath();g.ellipse(12,-29,5,7.5,-.2,0,7);g.fill();
      eye(g,22,-34,2,mood,blink)}
    if(mood===2){g.fillStyle='#8fd3ff';var sx=ANIM[AW[k]].r+3,sy=-ANIM[AW[k]].r*2-4;g.beginPath();g.moveTo(sx,sy-5);g.quadraticCurveTo(sx+4,sy,sx,sy+3);g.quadraticCurveTo(sx-4,sy,sx,sy-5);g.fill()}
    if(swim){var r=ANIM[AW[k]].r+4;g.lineWidth=5;for(var q2=0;q2<8;q2++){g.strokeStyle=q2%2?'#fff':'#ff6f91';g.beginPath();g.ellipse(0,-r*.5,r+3,r*.45,0,q2*.785,(q2+1)*.785);g.stroke()}}
    g.restore()}

  function blinkOf(i){return ((tG+i*1.7)%3.4)<.12}
  function animalsDraw(g){
    var i;
    if(sim&&mode!=='build'){
      for(i=sim.animals.length-1;i>=0;i--){var b=sim.animals[i],mood=1,x=b.x,y=b.y,ang=b.ang;
        if(b.st==='wait'){var qp=queuePos(i);x=Math.min(qp.x,L.xL+b.s);y=L.yL;mood=0;ang=0}
        if(b.st==='fall'){if(b.splashed){var sw=Math.min(1,(b.fallT-.5)/1.5);x=b.x-Math.max(0,b.fallT-.6)*30;y=RV+3+Math.sin(tG*4)*1.5;drawAnimal(g,b.k,x,y,0,tG*6,2,false,true);continue}
          drawAnimal(g,b.k,x,y,b.fallT*4,0,2,false,false);continue}
        if(b.st==='done'||b.s>sim.span){if(b.st==='done'&&b.doneAt==null)b.doneAt=tG;
          var run=b.s-sim.span+(b.doneAt!=null?(tG-b.doneAt)*WALK:0),last=i===sim.animals.length-1,stopX=Math.min(36,(W-L.xR)*.45);
          if(last&&run>stopX)run=stopX;x=L.xR+run;y=L.yR;ang=0;mood=last&&run>=stopX?(mode==='clear'?3:0):1;
          if(x>W+40)continue}
        else if(b.st==='walk'&&sim.maxStress>.72&&b.s>0)mood=2;
        drawAnimal(g,b.k,x,y,ang,(b.s+(b.doneAt!=null?(tG-b.doneAt)*WALK:0))*.18,mood,blinkOf(i),false)}}
    else for(i=L.an.length-1;i>=0;i--){var p=queuePos(i);drawAnimal(g,L.an[i],p.x,p.y,0,0,0,blinkOf(i),false)}}

  function btn(g,b,label,col,on,sub){
    g.fillStyle='rgba(50,30,15,.35)';rr(g,b[0],b[1]+3,b[2],b[3],10);g.fill();
    g.fillStyle=on===false?'#c9b9a3':col;rr(g,b[0],b[1],b[2],b[3],10);g.fill();
    g.fillStyle='rgba(255,255,255,.25)';rr(g,b[0]+3,b[1]+3,b[2]-6,b[3]*.38,7);g.fill();
    g.fillStyle='#fff';g.textAlign='center';g.font='17px Jua, system-ui, sans-serif';g.fillText(label,b[0]+b[2]/2,b[1]+b[3]/2+(sub?-1:6));
    if(sub){g.font='11px Jua, system-ui, sans-serif';g.fillText(sub,b[0]+b[2]/2,b[1]+b[3]-6)}}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function coin(g,x,y,r){g.fillStyle='#c78a12';g.beginPath();g.arc(x,y+1,r,0,7);g.fill();g.fillStyle='#ffd23f';g.beginPath();g.arc(x,y,r,0,7);g.fill();
    g.strokeStyle='#e0a91e';g.lineWidth=1.2;g.beginPath();g.arc(x,y,r*.62,0,7);g.stroke()}

  function draw(g,a,dt){
    dt=dt||0;tG+=dt;var t=tG,ko=a.lang==='ko',i;
    if(!L)return;
    drawSky(g,t,dt);drawRiver(g,t);drawBanks(g,t);
    /* ---- 구조물 ---- */
    var live=sim&&mode!=='build',dpath=live?sim.path:path,onDeck={};
    if(dpath)dpath.m.forEach(function(k){onDeck[k]=1});
    if(live){
      for(i=0;i<sim.cons.length;i++){var c=sim.cons[i];if(c.br||c.t!=='r')continue;var A=sim.nodes[c.a],B=sim.nodes[c.b],sl=Math.max(0,c.L-c.len);
        rope(g,A.x,A.y,B.x,B.y,Math.sqrt(sl*c.L)*.6,stressOf(c),1)}
      for(i=0;i<sim.cons.length;i++){c=sim.cons[i];if(c.br||c.t!=='p')continue;A=sim.nodes[c.a];B=sim.nodes[c.b];plank(g,A.x,A.y,B.x,B.y,onDeck[i],stressOf(c),1)}
      for(i=0;i<debris.length;i++){var p=debris[i],hx=Math.cos(p.ang)*p.l/2,hy=Math.sin(p.ang)*p.l/2,al=Math.min(1,p.life);
        if(p.t==='p')plank(g,p.x-hx,p.y-hy,p.x+hx,p.y+hy,false,1,al);else rope(g,p.x-hx,p.y-hy,p.x+hx,p.y+hy,4,1,al)}
      for(i=0;i<sim.nodes.length;i++){var n=sim.nodes[i],used=n.fix;for(var k=0;k<sim.cons.length&&!used;k++)if(!sim.cons[k].br&&(sim.cons[k].a===i||sim.cons[k].b===i))used=true;
        if(used||n.fix)bolt(g,n.x,n.y,n.fix?5:3.6,n.fix)}}
    else{
      for(i=0;i<D.m.length;i++){var m=D.m[i];if(m.t!=='r')continue;A=D.j[m.a];B=D.j[m.b];rope(g,A.x,A.y,B.x,B.y,3,null,1)}
      for(i=0;i<D.m.length;i++){m=D.m[i];if(m.t!=='p')continue;A=D.j[m.a];B=D.j[m.b];plank(g,A.x,A.y,B.x,B.y,onDeck[i],null,1)}
      /* 끌기 미리보기 */
      var dj=-1,ex=0,ey=0;
      if(drag&&!drag.k&&!drag.tapOnly&&drag.moved){dj=drag.j;ex=drag.x;ey=drag.y}
      else if(drag&&drag.k){dj=drag.j;ex=cur.x;ey=cur.y}
      if(dj>=0){var J=D.j[dj],e=planEnd(L,D,dj,ex,ey,tool),ok=e.ok&&cost(D)+COST[tool]<=L.budget;
        g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.5;g.setLineDash([4,5]);g.beginPath();g.arc(J.x,J.y,tool==='p'?MAXP:MAXR,0,7);g.stroke();g.setLineDash([]);
        if(tool==='p')plank(g,J.x,J.y,e.x,e.y,false,null,.85,ok?null:'#e06a5a');else rope(g,J.x,J.y,e.x,e.y,3,null,.9,ok?null:'#e06a5a');
        g.fillStyle=ok?'rgba(255,255,255,.9)':'rgba(255,120,100,.9)';g.beginPath();g.arc(e.x,e.y,e.j>=0?8:5,0,7);g.fill();
        coin(g,e.x+14,e.y-14,6);g.fillStyle=ok?'#fff':'#ffb0a0';g.font='13px Jua, system-ui, sans-serif';g.textAlign='left';
        g.strokeStyle='rgba(40,25,10,.6)';g.lineWidth=3;g.strokeText(COST[tool],e.x+22,e.y-9);g.fillText(COST[tool],e.x+22,e.y-9)}
      for(i=0;i<D.j.length;i++){var q=D.j[i];bolt(g,q.x,q.y,q.fix?5:3.6,q.fix);
        if(q.fix&&D.m.length===0&&(mode==='build')){g.strokeStyle='rgba(255,255,255,'+(.4+.4*Math.sin(t*5+i))+')';g.lineWidth=2;g.beginPath();g.arc(q.x,q.y,10+Math.sin(t*5+i)*2,0,7);g.stroke()}}
      if(drag&&dj>=0){J=D.j[dj];g.strokeStyle='#fff';g.lineWidth=2.5;g.beginPath();g.arc(J.x,J.y,9,0,7);g.stroke()}}
    animalsDraw(g);
    /* 강물 앞쪽 물결(빠진 동물 위로) */
    g.fillStyle='rgba(86,182,216,.55)';g.fillRect(-20,RV+6,W+40,6);
    /* 레벨 1 시범 손가락 */
    if(lvN===0&&mode==='build'&&D.m.length===0&&!drag){var ph=(t*.55)%1,hx2=L.xL+(L.xR-L.xL)*Math.min(1,ph*1.4),hy2=L.yL;
      g.globalAlpha=ph<.85?1:Math.max(0,(1-ph)/.15);g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=4;g.setLineDash([3,8]);g.beginPath();g.moveTo(L.xL,L.yL);g.lineTo(hx2,hy2);g.stroke();g.setLineDash([]);
      hand(g,hx2+4,hy2+6);g.globalAlpha=1}
    /* 키보드 커서 */
    if(kbOn&&mode==='build'){g.strokeStyle=drag&&drag.k?'#ffe14d':'#fff';g.lineWidth=2;var cs=cur.snap>=0?11:8;
      g.beginPath();g.arc(cur.x,cur.y,cs,0,7);g.moveTo(cur.x-cs-5,cur.y);g.lineTo(cur.x-cs+3,cur.y);g.moveTo(cur.x+cs-3,cur.y);g.lineTo(cur.x+cs+5,cur.y);
      g.moveTo(cur.x,cur.y-cs-5);g.lineTo(cur.x,cur.y-cs+3);g.moveTo(cur.x,cur.y+cs-3);g.lineTo(cur.x,cur.y+cs+5);g.stroke()}
    /* 색종이 */
    for(i=0;i<confetti.length;i++){var f=confetti[i];g.save();g.translate(f.x,f.y);g.rotate(f.r);g.fillStyle=f.c;g.globalAlpha=Math.min(1,3-f.t);g.fillRect(-4,-2,8,4);g.restore()}
    drawUI(g,a,t,ko)}
  function hand(g,x,y){g.save();g.translate(x,y);g.fillStyle='#fff';g.strokeStyle='#5a4636';g.lineWidth=1.6;
    g.beginPath();g.moveTo(0,0);g.lineTo(-3,-14);g.quadraticCurveTo(0,-18,3,-14);g.lineTo(4,-4);g.lineTo(14,-2);g.quadraticCurveTo(18,6,12,14);g.lineTo(2,14);g.closePath();g.fill();g.stroke();g.restore()}

  function drawUI(g,a,t,ko){
    /* 상단 표지판 */
    g.fillStyle='rgba(80,50,25,.25)';rr(g,8,38,W-16,34,10);g.fill();
    g.fillStyle='#f6e2bc';rr(g,8,35,W-16,34,10);g.fill();g.strokeStyle='#b88a52';g.lineWidth=2;rr(g,8,35,W-16,34,10);g.stroke();
    g.fillStyle='#6b4423';g.font='15px Jua, system-ui, sans-serif';g.textAlign='left';g.fillText((ko?'다리 ':'Bridge ')+(lvN+1),18,58);
    var used=cost(D),left=L.budget-used;coin(g,110,52,8);g.fillStyle=left<COST.r?'#d0452f':'#6b4423';g.font='16px Jua, system-ui, sans-serif';
    g.fillText(left+' / '+L.budget,122,58);
    /* 다음 손님 */
    var ax=196;g.font='11px Jua, system-ui, sans-serif';g.fillStyle='#8a6440';
    var heavy=L.an[L.an.length-1];g.fillText(ko?'최대':'max',ax,57);g.save();g.translate(ax+40,64);var sc=heavy==='elephant'?.42:heavy==='bear'?.55:.75;g.scale(sc,sc);drawAnimal(g,heavy,0,0,0,0,0,false,false);g.restore();
    g.fillStyle='#6b4423';g.font='12px Jua, system-ui, sans-serif';g.fillText(ANIM[AW[heavy]].w+(ko?'톤':'t'),ax+56,58);
    var tw=Math.ceil(time),low=time<10&&mode==='build';g.textAlign='right';g.font=(low?20+Math.sin(t*12)*2:18)+'px Jua, system-ui, sans-serif';
    g.fillStyle=lastGain>0?'#3aa655':low?'#d0452f':'#6b4423';g.fillText((mode==='build'?'⏱ ':'⏸ ')+tw,W-16,59);
    if(lastGain>0){g.font='13px Jua, system-ui, sans-serif';g.fillText('+14',W-18,86)}
    /* 힌트 */
    if(L.hint&&mode==='build'&&(lvN<LEVELS.length)){var tx=L.hint[ko?'ko':'en'];g.font='16px Jua, system-ui, sans-serif';g.textAlign='center';
      var wd=g.measureText(tx).width+22,ty=96;g.globalAlpha=drag?.35:1;g.fillStyle='rgba(255,252,240,.88)';rr(g,W/2-wd/2,ty-17,wd,26,13);g.fill();
      g.fillStyle='#5b3d22';g.fillText(tx,W/2,ty+1);g.globalAlpha=1}
    if(banner>0&&mode==='build'){g.globalAlpha=Math.min(1,banner*2);g.font='30px Jua, system-ui, sans-serif';g.textAlign='center';
      g.lineWidth=5;g.strokeStyle='rgba(80,50,25,.7)';var bt=(ko?'다리 ':'Bridge ')+(lvN+1)+(L.gen?(ko?' · 새 지형':' · new valley'):'');g.strokeText(bt,W/2,166);g.fillStyle='#fff';g.fillText(bt,W/2,166);g.globalAlpha=1}
    if(msg){g.globalAlpha=Math.min(1,msg.t*2);g.font='16px Jua, system-ui, sans-serif';g.textAlign='center';var mw=g.measureText(msg.s).width+24;
      g.fillStyle='rgba(208,69,47,.92)';rr(g,W/2-mw/2,126,mw,28,14);g.fill();g.fillStyle='#fff';g.fillText(msg.s,W/2,145);g.globalAlpha=1}
    if(mode==='fail'&&sim){var why={break:ko?'뚝! 부러졌어요':'Snap! Something broke',steep:ko?'너무 기울었어요':'Too steep to walk',sink:ko?'다리가 내려앉았어요':'The bridge sank',nopath:ko?'길이 없어요':'No path',time:ko?'시간 초과':'Too slow'}[sim.why]||'';
      g.font='20px Jua, system-ui, sans-serif';g.textAlign='center';g.lineWidth=5;g.strokeStyle='rgba(60,30,20,.7)';g.strokeText(why,W/2,140);g.fillStyle='#fff';g.fillText(why,W/2,140);
      g.font='14px Jua, system-ui, sans-serif';g.strokeText(ko?'풍덩! 튜브 타고 돌아와요 · 다리는 그대로':'Splash! They float back. Your bridge stays.',W/2,162);g.fillText(ko?'풍덩! 튜브 타고 돌아와요 · 다리는 그대로':'Splash! They float back. Your bridge stays.',W/2,162)}
    if(mode==='clear'){g.font=(ko?34:28)+'px Jua, system-ui, sans-serif';g.textAlign='center';g.lineWidth=6;g.strokeStyle='rgba(60,40,20,.6)';
      var ct=ko?'모두 건넜어요!':'Everyone made it!';var sc2=1+Math.max(0,.3-modeT)*2;g.save();g.translate(W/2,150);g.scale(sc2,sc2);g.strokeText(ct,0,0);g.fillStyle='#fff';g.fillText(ct,0,0);g.restore()}
    /* 하단 부두 패널 */
    var pg=g.createLinearGradient(0,PANEL,0,H);pg.addColorStop(0,'#9a6a3e');pg.addColorStop(1,'#7a5030');g.fillStyle=pg;g.fillRect(-20,PANEL,W+40,H-PANEL+20);
    g.strokeStyle='rgba(60,35,15,.5)';g.lineWidth=1.5;for(var y=PANEL+20;y<H;y+=20){g.beginPath();g.moveTo(-20,y);g.lineTo(W+20,y);g.stroke()}
    g.fillStyle='#b88452';g.fillRect(-20,PANEL,W+40,4);
    if(mode==='build'){
      /* 도구 토글 */
      var b=BTN.tool;g.fillStyle='rgba(50,30,15,.35)';rr(g,b[0],b[1]+3,b[2],b[3],10);g.fill();g.fillStyle='#f3e3c4';rr(g,b[0],b[1],b[2],b[3],10);g.fill();
      var half=b[2]/2;g.fillStyle=tool==='p'?'#e58a3a':'#5aa0d8';rr(g,b[0]+(tool==='p'?2:half),b[1]+2,half-2,b[3]-4,8);g.fill();
      plank(g,b[0]+12,b[1]+17,b[0]+half-12,b[1]+17,false,null,1);rope(g,b[0]+half+10,b[1]+15,b[0]+b[2]-10,b[1]+15,4,null,1);
      g.font='12px Jua, system-ui, sans-serif';g.textAlign='center';
      g.fillStyle=tool==='p'?'#fff':'#7a5a3a';g.fillText((ko?'판자 ':'Plank ')+COST.p,b[0]+half/2+1,b[1]+38);
      g.fillStyle=tool==='r'?'#fff':'#7a5a3a';g.fillText((ko?'밧줄 ':'Rope ')+COST.r,b[0]+half*1.5,b[1]+38);
      btn(g,BTN.undo,'↶','#8f7a68',D.m.length>0,ko?'되돌리기':'Undo');btn(g,BTN.clear,'✕','#a0675a',D.m.length>0,ko?'모두':'Clear');
      btn(g,BTN.go,ko?'출발!':'Go!',path?'#3eae5c':'#7fa889',true);
      if(path&&Math.sin(t*6)>0){g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=2;rr(g,BTN.go[0]-2,BTN.go[1]-2,BTN.go[2]+4,BTN.go[3]+4,12);g.stroke()}
      if(kbOn){g.font='12px Jua, system-ui, sans-serif';g.textAlign='center';var kt=ko?'방향키 · 스페이스 잇기 · Tab 도구 · X 삭제 · Z 취소 · G 출발':'Arrows · Space link · Tab tool · X del · Z undo · G go',kw=g.measureText(kt).width+16;
        g.fillStyle='rgba(30,60,80,.55)';rr(g,W/2-kw/2,PANEL-24,kw,20,10);g.fill();g.fillStyle='#fff';g.fillText(kt,W/2,PANEL-9)}}
    else{
      btn(g,BTN.stop,ko?'■ 멈춤':'■ Stop','#a0675a',mode==='parade');btn(g,BTN.ff,fast?'▶▶':'▶',fast?'#e58a3a':'#8f7a68',mode==='parade');
      /* 응력 범례 */
      var lx=166,ly=PANEL+18,lw=132;for(var k=0;k<lw;k+=2){g.fillStyle=stressCol(k/lw);g.fillRect(lx+k,ly,2,10)}
      g.strokeStyle='rgba(60,35,15,.6)';g.lineWidth=1;g.strokeRect(lx,ly,lw,10);
      g.font='11px Jua, system-ui, sans-serif';g.fillStyle='#fff3dc';g.textAlign='left';g.fillText(ko?'튼튼':'easy',lx,ly+24);g.textAlign='right';g.fillText(ko?'뚝 직전':'about to snap',lx+lw,ly+24);
      if(sim){var ms=Math.min(1,sim.maxStress);g.fillStyle='#fff';g.beginPath();g.moveTo(lx+ms*lw,ly-1);g.lineTo(lx+ms*lw-4,ly-7);g.lineTo(lx+ms*lw+4,ly-7);g.fill()}}}

  SG.run({id:'plank-bridge',title:{ko:'동물 행진 다리',en:'Plank Bridge Parade'},
    how:{ko:'관절에서 끌어 판자와 밧줄을 잇고 출발! 동물들이 건너는 동안 판자가 빨개지면 위험해요.',en:'Drag from a bolt to add planks and ropes, then Go! Planks turn red as they strain — keep the parade dry.'},
    init:init,update:update,draw:draw});

})();
