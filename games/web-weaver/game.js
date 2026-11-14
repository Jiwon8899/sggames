/* 이슬 거미줄 (Web Weaver) — 가지 사이에 진짜 탄성 실을 걸어 떨어지는 이슬과 반딧불이를 받는다.
   실은 XPBD 줄(마디 여러 개)이라 처지고 늘어나고 떨리며, 너무 길거나 팽팽하면 끊어진다.
   물리·장면·거미 길찾기는 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var WF=26,W=360,H=640,G=600,HS=1/480,CS=2e-5,NM=.05,MAXLEN=290,MINLEN=26,TOPY=66,SPD=150,REST=1;
  /* 떨어지는 것들: r 반지름, m 질량, vy 종단 속도, sw 흔들림, wa 바람 면적 */
  var IT={d:{r:5,m:1,vy:78,sw:0,wa:.12},f:{r:5,m:.4,vy:34,sw:26,wa:.25},l:{r:9,m:.45,vy:44,sw:34,wa:1},a:{r:8,m:3.2,vy:300,sw:0,wa:.05}};
  function lim(L){return .12+.21*Math.pow(140/L,4)}  /* 실을 길게 뽑을수록 가늘어져 약하다: 끊어지는 변형률 한계 */
  function comp(){return CS}
  function rng(s){s=(s>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function hs(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}

  /* ---------- 음높이: 길이와 장력 → 펜타토닉 ---------- */
  var PENT=[0,2,4,7,9];
  function quant(f){var s=12*Math.log(f/261.63)/Math.LN2,o=Math.floor(s/12),r=s-o*12,best=0,bd=99;
    for(var i=0;i<=5;i++){var v=i<5?PENT[i]:12,d=Math.abs(r-v);if(d<bd){bd=d;best=v}}
    var n=Math.max(-5,Math.min(26,o*12+best));return 261.63*Math.pow(2,n/12)}
  function rawPitch(L,strain){var T=Math.max(0,strain)/comp(L);return 300*(140/L)*Math.sqrt(1+T/1200)}
  function pitch(L,strain){return quant(rawPitch(L,strain))}

  /* ---------- 장면 ---------- */
  function sq(t0,dt,k,xs){return xs.map(function(x,i){return [+(t0+i*dt).toFixed(2),k[i%k.length],x]})}
  function cat(){return [].concat.apply([],arguments).sort(function(a,b){return a[0]-b[0]})}
  /* br: 가지마다 뻗어 나온 화면 가장자리(l r t b), an: [x,y,가지], plan: 검증 봇이 짓는 거미줄(앵커 쌍) */
  var SCENES=[
    {br:'lr',an:[[80,330,0],[280,330,1]],home:0,quota:2,silk:300,regen:8,plan:[[0,1]],
      sp:sq(1.6,3.2,'d',[175,205,150,190]),loop:13,ghost:1,
      tip:{ko:'가지 사이에 거미줄을 이어요',en:'Spin silk between branches'}},
    {br:'ltr',an:[[60,330,0],[180,220,1],[300,330,2]],home:1,quota:5,silk:620,regen:10,plan:[[0,1],[1,2],[0,2]],
      sp:sq(1.4,1.4,'d',[100,260,135,225,175,115,245,150]),loop:12.5,ghost:1,
      tip:{ko:'줄을 여러 개 이어 더 많이 받아요',en:'More strands catch more'}},
    {br:'ltr',an:[[40,300,0],[180,300,1],[320,300,2]],home:1,quota:5,silk:560,regen:10,plan:[[0,1],[1,2]],
      sp:cat(sq(1.4,1.7,'d',[112,250,140,222,100,262,165]),sq(3.2,4,'a',[118,246,150])),loop:13.5,
      tip:{ko:'도토리는 긴 줄을 끊어요. 짧게!',en:'Acorns snap long strands. Keep them short!'}},
    {br:'lrtlr',an:[[50,290,0],[310,290,1],[180,200,2],[95,440,3],[265,440,4]],home:2,quota:5,silk:780,regen:10,bird:1,
      plan:[[2,0],[2,1],[0,1],[0,3],[1,4],[3,4]],
      sp:sq(1.2,1.6,'fdfdfdfd',[120,240,200,110,150,250,230,130]),loop:13.5,
      tip:{ko:'반딧불이를 톡! 새보다 먼저 거둬요',en:'Tap fireflies before the bird does!'}},
    {br:'lrtb',an:[[70,310,0],[290,310,1],[180,220,2],[180,410,3]],home:2,quota:6,silk:620,regen:12,
      plan:[[2,0],[2,1],[0,3],[3,1]],gust:[[4,750,1.8],[10,-750,1.8]],
      sp:sq(1.2,1.25,'ddfd',[110,250,150,210,125,235,180,100,260,160]),loop:14,
      tip:{ko:'바람! 길고 팽팽한 줄은 끊겨요',en:'Wind! Long, taut strands snap'}},
    {br:'llrrt',an:[[44,250,0],[60,420,1],[316,250,2],[300,420,3],[180,180,4]],home:4,quota:6,silk:860,regen:13,leaf:1,
      plan:[[4,0],[4,2],[0,1],[2,3],[1,3],[0,2]],
      sp:sq(1.2,1.3,'dldfdldd',[110,180,250,140,220,120,200,160,240,130]),loop:14.5,
      tip:{ko:'잎이 붙은 줄은 두 번 톡 쳐서 끊어요',en:'Leaf stuck? Double-tap the strand to cut it'}},
    {br:'ltrlr',an:[[40,280,0],[180,200,1],[320,280,2],[95,455,3],[265,455,4]],home:1,quota:9,silk:860,regen:13,rain:1,
      plan:[[1,0],[1,2],[0,2],[0,3],[2,4],[3,4]],
      sp:cat(sq(1.5,.32,'d',[90,140,190,240,270,120,170,220]),sq(6.5,.32,'d',[100,250,160,210,130,280,190,230]),sq(4.2,4,'f',[170,200])),loop:13,
      tip:{ko:'비가 와요! 이슬을 거둬 무게를 덜어요',en:'Rain! Collect drops to lighten the web'}},
    {br:'lrtlr',an:[[44,300,0],[316,300,1],[180,196,2],[100,465,3],[260,465,4]],home:2,quota:6,silk:860,regen:13,night:1,bird:1,
      plan:[[2,0],[2,1],[0,1],[0,3],[1,4],[3,4]],
      sp:sq(1.2,1.4,'ffdfdfdf',[130,230,180,110,250,160,210,140,260]),loop:14,
      tip:{ko:'밤엔 반딧불이가 등불이에요',en:'At night, fireflies are the light'}},
    {br:'ltrlr',an:[[60,270,0],[180,215,1],[180,340,1],[300,270,2],[80,420,3],[280,420,4]],home:1,quota:7,silk:880,regen:14,bird:1,
      plan:[[1,0],[1,3],[2,0],[2,3],[2,4],[2,5]],gust:[[5,650,1.6],[11,-650,1.6]],
      sp:cat(sq(1.1,1.2,'dfddfdd',[110,250,150,210,120,240,170,90,270,190]),sq(3.4,4.5,'a',[130,230,180])),loop:14.5,
      tip:{ko:'바람과 도토리를 함께 버텨요',en:'Hold on through wind and acorns'}},
    {br:'ltrlr',an:[[50,290,0],[180,230,1],[180,360,1],[310,290,2],[70,450,3],[290,450,4]],home:1,quota:9,silk:980,regen:15,night:1,rain:1,bird:1,
      plan:[[1,0],[1,3],[2,0],[2,3],[2,4],[2,5],[4,5]],
      sp:cat(sq(1.4,.36,'d',[100,160,220,270,130,190,250]),sq(7,.36,'d',[90,150,210,260,120,180,240]),sq(3.6,3.2,'fa',[150,220,200,120])),loop:14,
      tip:{ko:'마지막 장면! 비 오는 밤',en:'Final scene: a rainy night'}}
  ];
  var SIDE={l:1,r:1,t:1,b:1};

  function genScene(n){
    var r=rng(n*9973+7),d=Math.min(1,(n-10)/25),k=4+Math.floor(r()*3),hub=true,i;
    var Rm=Math.min(118,146/(2.3*Math.sin(Math.PI/k))),R=Rm*(.82+r()*.18),cx=150+r()*60,cy=300+r()*80,rot=r()*6.283,an=[],br='';
    for(i=0;i<k;i++){var ang=rot+i*6.283/k+(r()-.5)*.2,x=Math.max(30,Math.min(330,cx+Math.cos(ang)*R*1.15)),y=Math.max(130,Math.min(560,cy+Math.sin(ang)*R));
      if(x>292&&y>540)y=540;
      var ds={l:x,r:W-x,t:y-60,b:H-y},side='l';for(var s in ds)if(ds[s]<ds[side])side=s;
      an.push([Math.round(x),Math.round(y),i]);br+=side}
    if(hub){an.push([Math.round(cx),Math.round(cy),k]);br+='t'}
    var plan=[];for(i=0;i<k;i++)plan.push([i,(i+1)%k]);if(hub)for(i=0;i<k;i++)plan.push([k,i]);
    var tot=0;plan.forEach(function(p){tot+=Math.hypot(an[p[0]][0]-an[p[1]][0],an[p[0]][1]-an[p[1]][1])});
    var home=0;for(i=1;i<k;i++)if(an[i][1]<an[home][1])home=i;
    var rain=n%5===4,night=n%4===2,quota=4+Math.floor(d*3)+Math.floor(r()*2)+(rain?2:0),sp=[],t=1.2,cnt=quota*2+3,
        xs=an.slice(0,k).map(function(a){return a[0]}),x0=Math.min.apply(null,xs)+22,x1=Math.max.apply(null,xs)-22;
    for(i=0;i<cnt;i++){var u=r(),kind=u<.07+.08*d?'a':(u<.13+.14*d&&n>=13?'l':(u<.4+.1*d?'f':'d'));
      if(rain&&kind!=='a')kind=u<.3?'f':'d';
      sp.push([+t.toFixed(2),kind,Math.round(x0+r()*(x1-x0))]);t+=rain?.35+r()*.4:.9+r()*.8}
    var gust=n%3===1?[[3+r()*2,(r()<.5?-1:1)*(450+350*d),1.6],[9+r()*2,(r()<.5?-1:1)*(450+350*d),1.6]]:null;
    return {br:br,an:an,home:home,quota:quota,silk:Math.round(tot*1.12+60),regen:10+4*d,plan:plan,sp:sp,loop:Math.max(t+1.5,12),
      gust:gust,bird:n>=12?1:0,night:night?1:0,rain:rain?1:0,leaf:sp.some(function(e){return e[1]==='l'})?1:0,gen:1}}
  function getScene(n){return n<SCENES.length?SCENES[n]:genScene(n)}

  /* ---------- 월드 ---------- */
  function newP(w,x,y,pin){var p={x:x,y:y,px:x,py:y,pin:!!pin,m:NM,wa:0,id:w.uid++,dead:false};w.P.push(p);return p}
  function makeWorld(sc,n){
    var w={sc:sc,n:n||0,t:0,acc:0,P:[],S:[],items:[],anchors:[],col:0,silk:sc.silk,silkMax:sc.silk,ev:[],si:0,cyc:0,gi:0,
      wind:0,gust:0,bird:null,uid:1,cleared:false,gver:1,graph:null,count:0,warnG:-1};
    sc.an.forEach(function(a,i){var p=newP(w,a[0],a[1],true);p.anchor=i;p.branch=a[2];w.anchors.push(p)});
    w.bedges=[];var byB={};w.anchors.forEach(function(p){(byB[p.branch]=byB[p.branch]||[]).push(p)});
    for(var b in byB)for(var i=0;i+1<byB[b].length;i++)w.bedges.push([byB[b][i],byB[b][i+1]]);
    var h=w.anchors[sc.home];
    w.sp={at:h,home:h,path:null,i:0,d:0,item:null,hold:null,holdT:0,x:h.x,y:h.y,walk:0,face:1,mood:0,moodT:0,fall:0};
    return w}

  function strandsAt(w,p){return w.S.filter(function(s){return s.on&&!s.broken&&s.n.indexOf(p)>=0})}
  function spin(w,A,B){
    if(!A||!B||A===B||A.dead||B.dead)return {ok:false,why:'same'};
    var L=dist(A,B);
    if(L<MINLEN)return {ok:false,why:'short'};
    if(L>MAXLEN)return {ok:false,why:'long'};
    for(var i=0;i<w.S.length;i++){var s=w.S[i];if(!s.on||s.broken)continue;
      if(s.n.indexOf(A)>=0&&s.n.indexOf(B)>=0)return {ok:false,why:'same'}}
    if(w.silk<L)return {ok:false,why:'silk'};
    var segs=Math.max(3,Math.min(9,Math.round(L/28))),nodes=[A];
    for(i=1;i<segs;i++)nodes.push(newP(w,A.x+(B.x-A.x)*i/segs,A.y+(B.y-A.y)*i/segs,false));
    nodes.push(B);
    var s2={id:w.uid++,n:nodes,rest:L/segs*REST,len:L,lim:lim(L),c:comp(L),on:true,broken:0,cut:-1,over:0,strain:0,vib:0,leaf:null,born:w.t};
    w.S.push(s2);w.silk-=L;w.gver++;w.ev.push({t:'spin',s:s2});return {ok:true,s:s2}}

  function relItems(w,s){
    w.items.forEach(function(it){if((it.st==='stuck'||it.st==='contact')&&it.s===s){
      var a=s.n[it.k2],b=s.n[it.k2+1];it.st='fall';it.ign=s;if(it.k==='l')it.free=1;
      it.vx=((a.x-a.px)+(b.x-b.px))/2/HS*.5+(hs(it.id)-.5)*30;it.vy=Math.max(20,((a.y-a.py)+(b.y-b.py))/2/HS*.5);it.s=null}})}
  function breakS(w,s,k,why){if(s.broken)return;s.cut=k;s.broken=w.t;s.leaf=null;relItems(w,s);w.gver++;
    var a=s.n[Math.max(0,k)],b=s.n[Math.max(0,k)+1];
    w.ev.push({t:why,s:s,x:(a.x+b.x)/2,y:(a.y+b.y)/2})}
  function cut(w,s){if(!s||!s.on||s.broken)return false;breakS(w,s,Math.floor((s.n.length-1)/2),'cut');w.silk=Math.min(w.silkMax,w.silk+s.len*.4);return true}
  function pluck(w,s,amt){if(!s||!s.on||s.broken)return;var m=s.n.length-1;
    for(var i=1;i<m;i++){var p=s.n[i],k=Math.sin(Math.PI*i/m)*(amt||1)*90*HS;p.py-=k}s.vib=1;
    w.ev.push({t:'pluck',s:s})}

  /* 앵커에 이어지지 않은 줄은 떨어진다 */
  function connect(w){
    var seen={},q=[],i,s,adj={};
    w.S.forEach(function(s){if(!s.on||s.broken)return;for(var k=0;k<s.n.length-1;k++){if(k===s.cut)continue;
      var a=s.n[k],b=s.n[k+1];(adj[a.id]=adj[a.id]||[]).push(b);(adj[b.id]=adj[b.id]||[]).push(a)}});
    w.anchors.forEach(function(p){seen[p.id]=1;q.push(p)});
    while(q.length){var p=q.pop();(adj[p.id]||[]).forEach(function(o){if(!seen[o.id]){seen[o.id]=1;q.push(o)}})}
    for(i=0;i<w.S.length;i++){s=w.S[i];if(!s.on||s.broken)continue;
      if(!s.n.some(function(p){return seen[p.id]}))breakS(w,s,-1,'fallS')}}

  function masses(w){var P=w.P,i;for(i=0;i<P.length;i++){P[i].m=NM;P[i].wa=0}
    for(i=0;i<w.items.length;i++){var it=w.items[i];if(it.st!=='stuck'&&it.st!=='contact')continue;
      var a=it.s.n[it.k2],b=it.s.n[it.k2+1],T=IT[it.k];a.m+=T.m*(1-it.t);b.m+=T.m*it.t;a.wa+=T.wa*(1-it.t);b.wa+=T.wa*it.t}}

  function substep(w,h){
    var P=w.P,i,k,p,s,vx,vy,dm=1-1.3*h,h2=h*h,wd=w.wind,wu=-.6*Math.abs(w.gust);
    for(i=0;i<P.length;i++){p=P[i];if(p.pin||p.dead)continue;
      vx=(p.x-p.px)*dm;vy=(p.y-p.py)*dm;p.px=p.x;p.py=p.y;
      var wf=(NM*WF+p.wa)/p.m;p.x+=vx+wd*wf*h2;p.y+=vy+(G+wu*wf)*h2}
    for(i=0;i<w.S.length;i++){s=w.S[i];if(!s.on)continue;
      var al=s.c*s.rest/h2;
      for(k=0;k<s.n.length-1;k++){if(k===s.cut)continue;
        var a=s.n[k],b=s.n[k+1],dx=b.x-a.x,dy=b.y-a.y,len=Math.sqrt(dx*dx+dy*dy),C=len-s.rest;if(C<=0||len<1e-9)continue;
        var wa=a.pin?0:1/a.m,wb=b.pin?0:1/b.m;if(wa+wb===0)continue;
        var dl=C/(wa+wb+al),nx=dx/len,ny=dy/len;a.x+=wa*dl*nx;a.y+=wa*dl*ny;b.x-=wb*dl*nx;b.y-=wb*dl*ny}}
    for(i=0;i<w.S.length;i++){s=w.S[i];if(!s.on||s.broken)continue;
      var mx=-1,mk=0;for(k=0;k<s.n.length-1;k++){var a2=s.n[k],b2=s.n[k+1],st=(Math.hypot(b2.x-a2.x,b2.y-a2.y)-s.rest)/s.rest;if(st>mx){mx=st;mk=k}}
      s.strain=mx;if(mx>s.lim){s.over+=h;if(s.over>.01)breakS(w,s,mk,'tear')}else s.over=Math.max(0,s.over-h*.5)}}

  function spawn(w,k,x){var T=IT[k],id=w.uid++;
    w.items.push({id:id,k:k,x:x,y:TOPY-4,x0:x,vx:0,vy:k==='a'?60:T.vy*.6,st:'fall',age:0,ph:hs(id)*6.28,fr:1+hs(id+3)*.6,
      s:null,k2:0,t:0,sage:0,ign:null,rot:hs(id+7)*6.28,warned:false,ct:0})}

  function hitTest(x0,y0,x1,y1,a,b,r){
    var ex=b.x-a.x,ey=b.y-a.y,l2=ex*ex+ey*ey;if(l2<1e-6)return -1;
    var t=((x1-a.x)*ex+(y1-a.y)*ey)/l2,tc=t<0?0:t>1?1:t,qx=a.x+ex*tc-x1,qy=a.y+ey*tc-y1;
    if(qx*qx+qy*qy<(r+1.5)*(r+1.5))return tc;
    var s0=ex*(y0-a.y)-ey*(x0-a.x),s1=ex*(y1-a.y)-ey*(x1-a.x);
    if((s0>0)!==(s1>0)&&s0!==s1){var f=s0/(s0-s1),ix=x0+(x1-x0)*f,iy=y0+(y1-y0)*f,u=((ix-a.x)*ex+(iy-a.y)*ey)/l2;if(u>=0&&u<=1)return u}
    return -1}
  function nodeV(p){return [(p.x-p.px)/HS,(p.y-p.py)/HS]}
  function hit(w,it,s,k,t){
    var T=IT[it.k];
    if(s.leaf&&it.k!=='a'){it.ign=s;it.vx+=(hs(it.id+w.t)-.5)*80;it.vy*=.6;w.ev.push({t:'deflect',s:s,it:it});return}
    var ns=[[s.n[k],1-t],[s.n[k+1],t]];
    ns.forEach(function(q){var p=q[0],sh=T.m*q[1];if(p.pin||sh<=0)return;var v=nodeV(p),
      vx=(v[0]*p.m+it.vx*sh)/(p.m+sh),vy=(v[1]*p.m+it.vy*sh)/(p.m+sh);p.px=p.x-vx*HS;p.py=p.y-vy*HS});
    it.s=s;it.k2=k;it.t=t;it.sage=0;s.vib=1;
    if(it.k==='a'){it.st='contact';it.ct=.3;w.ev.push({t:'acorn',s:s,it:it})}
    else{it.st='stuck';if(it.k==='l')s.leaf=it;w.ev.push({t:'stick',s:s,it:it})}}

  function items(w,dt){
    var i,j,k,it,T,s,list=w.items;
    for(i=0;i<list.length;i++){it=list[i];T=IT[it.k];it.age+=dt;
      if(it.st==='fall'){
        if(it.k==='a')it.vy=Math.min(T.vy,it.vy+G*.9*dt);else it.vy+=(T.vy-it.vy)*Math.min(1,dt*2.5);
        var sw=T.sw?Math.cos(it.age*1.7*it.fr+it.ph)*T.sw:0;
        it.vx+=(w.wind*T.wa*.35+sw-it.vx)*Math.min(1,dt*3);
        var x0=it.x,y0=it.y;it.x+=it.vx*dt;it.y+=it.vy*dt;it.rot+=(it.k==='l'?Math.cos(it.age*2+it.ph)*2.2:it.k==='a'?it.vx*.02:0)*dt;
        var done=false;
        for(j=0;j<w.S.length&&!done;j++){s=w.S[j];if(it.free||!s.on||s.broken||s===it.ign)continue;
          for(k=0;k<s.n.length-1;k++){if(k===s.cut)continue;var u=hitTest(x0,y0,it.x,it.y,s.n[k],s.n[k+1],T.r);
            if(u>=0){hit(w,it,s,k,u);done=true;break}}}
        if(it.y>H+24||it.x<-40||it.x>W+40)it.st='gone'}
      else if(it.st==='stuck'||it.st==='contact'){
        s=it.s;if(!s||!s.on||s.broken){it.st='fall';it.s=null;continue}
        var a=s.n[it.k2],b=s.n[it.k2+1];it.x=a.x+(b.x-a.x)*it.t;it.y=a.y+(b.y-a.y)*it.t;it.sage+=dt;
        if(it.st==='contact'){it.ct-=dt;if(it.ct<=0){var va=nodeV(a),vb=nodeV(b);it.st='fall';it.ign=s;it.s=null;
          it.vx=(va[0]+vb[0])*.25+(it.t<.5?-1:1)*80;it.vy=Math.max(70,(va[1]+vb[1])*.4);w.ev.push({t:'bounce',s:s,it:it})}}}}
    w.items=list.filter(function(it){return it.st!=='gone'&&it.st!=='done'})}

  /* ---------- 거미 길찾기: 앵커+실 마디 그래프, 같은 가지의 앵커끼리는 가지로 걸어간다 ---------- */
  function graph(w){if(w.graph&&w.graph.v===w.gver)return w.graph;
    var adj={},es={};function add(a,b){(adj[a.id]=adj[a.id]||[]).push(b);(adj[b.id]=adj[b.id]||[]).push(a);es[a.id+'-'+b.id]=es[b.id+'-'+a.id]=1}
    w.S.forEach(function(s){if(!s.on||s.broken)return;for(var k=0;k<s.n.length-1;k++)if(k!==s.cut)add(s.n[k],s.n[k+1])});
    w.bedges.forEach(function(e){add(e[0],e[1])});
    w.graph={v:w.gver,adj:adj,es:es};return w.graph}
  function route(w,from,to){
    var g=graph(w),D={},prev={},done={},open=[from],byId={};D[from.id]=0;byId[from.id]=from;
    while(open.length){var bi=0;for(var i=1;i<open.length;i++)if(D[open[i].id]<D[open[bi].id])bi=i;
      var u=open.splice(bi,1)[0];if(done[u.id])continue;done[u.id]=1;if(u===to)break;
      (g.adj[u.id]||[]).forEach(function(v){var nd=D[u.id]+dist(u,v);if(D[v.id]==null||nd<D[v.id]){D[v.id]=nd;prev[v.id]=u;byId[v.id]=v;open.push(v)}})}
    if(!done[to.id])return null;
    var path=[to];while(path[0]!==from)path.unshift(prev[path[0].id]);return path}
  function collect(w,it){var sp=w.sp;
    if(!it||it.st!=='stuck')return false;
    var from=sp.path?sp.path[Math.min(sp.i+1,sp.path.length-1)]:sp.at,a=it.s.n[it.k2],b=it.s.n[it.k2+1],
        tg=it.t<.5?[a,b]:[b,a],pth=null;
    for(var i=0;i<2&&!pth;i++)pth=route(w,from,tg[i]);
    if(!pth){w.ev.push({t:'nopath',it:it});return false}
    if(sp.path){var cur=sp.path[sp.i];sp.path=[cur].concat(pth);sp.i=0}else{sp.path=pth;sp.i=0;sp.d=0}
    sp.item=it;w.ev.push({t:'go',it:it});return true}
  function take(w,it){var sp=w.sp;if(sp.hold)absorb(w);it.st='held';it.s=null;w.col++;
    w.silk=Math.min(w.silkMax,w.silk+(it.k==='f'?90:25));sp.hold=it;sp.holdT=.75;sp.mood=1;sp.moodT=.9;w.ev.push({t:'collect',it:it})}
  function absorb(w){var sp=w.sp;if(sp.hold){sp.hold.st='done';sp.hold=null}}
  function spider(w,dt){var sp=w.sp,g=graph(w);
    if(sp.holdT>0){sp.holdT-=dt;if(sp.holdT<=0)absorb(w)}
    if(sp.moodT>0){sp.moodT-=dt;if(sp.moodT<=0)sp.mood=0}
    if(sp.fall>0)sp.fall=Math.max(0,sp.fall-dt);
    if(sp.path){
      if(sp.path.length<2){sp.at=sp.path[0];sp.path=null}
      else{var a=sp.path[sp.i],b=sp.path[sp.i+1];
        if(!g.es[a.id+'-'+b.id]){
          if(sp.d<4&&!a.dead&&(g.adj[a.id]||a.pin)){sp.at=a;sp.path=null;if(sp.item&&sp.item.st==='stuck')collect(w,sp.item)}
          else{fallHome(w)}}
        else{var L=Math.max(1,dist(a,b));sp.d+=SPD*dt;sp.walk+=dt;
          while(sp.path&&sp.d>=L){sp.d-=L;sp.i++;
            if(sp.i>=sp.path.length-1){sp.at=sp.path[sp.path.length-1];sp.path=null;sp.d=0;
              if(sp.item&&sp.item.st==='stuck')take(w,sp.item);sp.item=null;break}
            a=sp.path[sp.i];b=sp.path[sp.i+1];if(!g.es[a.id+'-'+b.id])break;L=Math.max(1,dist(a,b))}
          if(sp.path){a=sp.path[sp.i];b=sp.path[sp.i+1];var f=Math.min(1,sp.d/Math.max(1,dist(a,b)));
            sp.x=a.x+(b.x-a.x)*f;sp.y=a.y+(b.y-a.y)*f;sp.face=b.x>=a.x?1:-1}}}}
    if(!sp.path){if(sp.at.dead||(!sp.at.pin&&!(g.adj[sp.at.id]||[]).length))fallHome(w);sp.x=sp.at.x;sp.y=sp.at.y}
    if(sp.item&&sp.item.st!=='stuck'&&sp.path){sp.item=null}}
  function fallHome(w){var sp=w.sp;w.ev.push({t:'fall',x:sp.x,y:sp.y});sp.at=sp.home;sp.path=null;sp.item=null;sp.d=0;sp.fall=.8;sp.mood=2;sp.moodT=1;sp.x=sp.home.x;sp.y=sp.home.y}

  /* ---------- 새: 오래 붙어 있는 반딧불이를 채 간다(해치지 않는다) ---------- */
  function birdUp(w,dt){var sc=w.sc;if(!sc.bird)return;
    w.items.forEach(function(it){if(it.k==='f'&&it.st==='stuck'){if(it.sage>3.2&&!it.warned){it.warned=true;w.ev.push({t:'warn',it:it})}
      if(!w.bird&&it.sage>4.8){w.bird={it:it,t:0,side:it.x<W/2?1:-1,got:false,miss:false,x:0,y:0};w.ev.push({t:'swoop',it:it})}}});
    var b=w.bird;if(!b)return;b.t+=dt;var it=b.it,sx=b.side>0?W+40:-40,sy=90;
    if(b.t<1){var f=b.t,tx=it.x,ty=it.y;if(it.st!=='stuck'&&!b.miss){b.miss=true;b.mx=b.x;b.my=b.y;b.mt=b.t;w.ev.push({t:'miss'})}
      if(!b.miss){b.x=sx+(tx-sx)*f;b.y=sy+(ty-sy)*f-Math.sin(f*Math.PI)*40}}
    else if(!b.got&&!b.miss){if(it.st==='stuck'){it.st='taken';it.s=null;b.got=true;w.ev.push({t:'snatch',it:it,x:it.x,y:it.y})}else b.miss=true}
    if(b.miss||b.t>=1){var lt=b.miss?b.t-(b.mt||b.t):b.t-1;if(b.miss&&b.mt==null){b.mt=b.t;b.mx=b.x;b.my=b.y}
      var ox=b.miss?b.mx:it.x,oy=b.miss?b.my:it.y;b.x=ox-b.side*lt*260;b.y=oy-lt*lt*260-lt*60;if(b.got){it.x=b.x+b.side*-6;it.y=b.y+8}
      if(lt>1.3){if(b.got)it.st='done';w.bird=null}}}

  function windAt(w){var sc=w.sc,g=0,tt=w.t%sc.loop;
    (sc.gust||[]).forEach(function(q){var u=(tt-q[0])/q[2];if(u>0&&u<1)g+=q[1]*Math.pow(Math.sin(Math.PI*u),2);
      var wt=q[0]-1.2;if(tt>=wt&&tt<wt+.1&&w.warnG!==Math.floor(w.t/sc.loop)*100+q[0]){w.warnG=Math.floor(w.t/sc.loop)*100+q[0];w.ev.push({t:'gust',dir:q[1]>0?1:-1})}});
    w.gust=g;return 35*Math.sin(w.t*.7)+g}

  function step(w,dt){
    var sc=w.sc;w.t+=dt;
    while(true){var e=sc.sp[w.si],T=e[0]+w.cyc*sc.loop;if(w.t<T)break;spawn(w,e[1],e[2]);w.si++;if(w.si>=sc.sp.length){w.si=0;w.cyc++}}
    w.wind=windAt(w);
    w.silk=Math.min(w.silkMax,w.silk+(sc.regen||10)*dt);
    masses(w);
    w.acc+=dt;var n=0;while(w.acc>=HS&&n<40){substep(w,HS);w.acc-=HS;n++}if(n>=40)w.acc=0;
    items(w,dt);
    w.S.forEach(function(s){s.vib=Math.max(0,s.vib-dt*1.6)});
    /* 끊어진 줄 정리 */
    var rem=false;w.S.forEach(function(s){if(s.on&&s.broken&&w.t-s.broken>1.3){s.on=false;rem=true}});
    if(rem){var used={};w.S.forEach(function(s){if(s.on)s.n.forEach(function(p){used[p.id]=1})});
      w.P.forEach(function(p){if(!p.pin&&!used[p.id])p.dead=true});w.P=w.P.filter(function(p){return !p.dead});
      w.S=w.S.filter(function(s){return s.on});w.gver++;connect(w)}
    if(w.ev.some(function(e){return e.t==='tear'||e.t==='cut'}))connect(w);
    spider(w,dt);birdUp(w,dt);
    var c=w.col;w.items.forEach(function(it){if(it.st==='stuck'&&it.k==='d')c++});w.count=c;
    if(!w.cleared&&c>=sc.quota){w.cleared=true;w.ev.push({t:'clear'})}}

  /* 터치/커서 지점 고르기: 앵커 우선, 다음은 실 위의 가장 가까운 마디 */
  function pickPoint(w,x,y,ra,rs){var best=null,bd=(ra||26);
    w.anchors.forEach(function(p){var d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;best=p}});if(best)return best;
    bd=rs||16;var bs=null,bk=0,bt=0;
    w.S.forEach(function(s){if(!s.on||s.broken)return;for(var k=0;k<s.n.length-1;k++){if(k===s.cut)continue;var a=s.n[k],b=s.n[k+1],ex=b.x-a.x,ey=b.y-a.y,
      l2=ex*ex+ey*ey||1,t=Math.max(0,Math.min(1,((x-a.x)*ex+(y-a.y)*ey)/l2)),d=Math.hypot(a.x+ex*t-x,a.y+ey*t-y);if(d<bd){bd=d;bs=s;bk=k;bt=t}}});
    if(!bs)return null;return bt<.5?bs.n[bk]:bs.n[bk+1]}
  function strandNear(w,x,y,r){var bd=r||14,bs=null;
    w.S.forEach(function(s){if(!s.on||s.broken)return;for(var k=0;k<s.n.length-1;k++){if(k===s.cut)continue;var a=s.n[k],b=s.n[k+1],ex=b.x-a.x,ey=b.y-a.y,
      l2=ex*ex+ey*ey||1,t=Math.max(0,Math.min(1,((x-a.x)*ex+(y-a.y)*ey)/l2)),d=Math.hypot(a.x+ex*t-x,a.y+ey*t-y);if(d<bd){bd=d;bs=s}}});return bs}

  var CORE={W:W,H:H,HS:HS,CS:CS,MAXLEN:MAXLEN,MINLEN:MINLEN,SCENES:SCENES,IT:IT,lim:lim,pitch:pitch,rawPitch:rawPitch,quant:quant,
    getScene:getScene,genScene:genScene,makeWorld:makeWorld,spin:spin,cut:cut,pluck:pluck,step:step,collect:collect,
    route:route,pickPoint:pickPoint,strandNear:strandNear,strandsAt:strandsAt,substep:substep,masses:masses,newP:newP};
  if(typeof module!=='undefined'&&module.exports)module.exports=CORE;
  if(typeof SG==='undefined')return;
  /* ================= 게임 ================= */
  var C=CORE,w,sn,time,mode,modeT,tG=0,prevDown,drag,lastTap,kb,keyQ=[],initAt=0,fx,tones,lastTone=-1,banner,warnT,gustDir,
      orbs,fol,stars,rainL,branches,firstSpin,hintA,lowWarn,shown;
  if(!window.__webWeaverKeys){window.__webWeaverKeys=true;
    window.addEventListener('keydown',function(e){var c=e.code;
      if(/^(Arrow(Left|Right|Up|Down)|Space|KeyX|KeyC|Escape|Key[WASD])$/.test(c)&&!e.repeat)keyQ.push({c:c,at:performance.now()});
    })}

  function load(n,a){sn=n;w=C.makeWorld(C.getScene(n),n);mode='play';modeT=0;drag=null;lastTap={s:null,t:-9};
    kb.cur=w.sp.home;kb.start=null;firstSpin=false;hintA=1;banner=1.6;warnT=0;
    /* 가지 모양 */
    branches=[];var by={};w.anchors.forEach(function(p){(by[p.branch]=by[p.branch]||[]).push(p)});
    for(var b in by){var list=by[b],side=w.sc.br[b]||'l',a0=list[0],pts=[],i;
      if(side==='l')pts.push([-14,a0.y+22]);else if(side==='r')pts.push([W+14,a0.y+22]);else if(side==='t')pts.push([a0.x+16,40]);else pts.push([a0.x-12,H+14]);
      list.forEach(function(p){pts.push([p.x,p.y])});
      var L1=pts[pts.length-1],L0=pts[pts.length-2],dx=L1[0]-L0[0],dy=L1[1]-L0[1],dl=Math.hypot(dx,dy)||1;
      pts.push([L1[0]+dx/dl*24+3,L1[1]+dy/dl*24+6]);
      branches.push({pts:pts,id:+b,side:side})}
    a.tempo(1+Math.min(.4,n*.03))}

  function init(a){
    time=50;tG=tG||0;prevDown=true;kb={on:false,cur:null,start:null};keyQ.length=0;initAt=performance.now();
    fx=[];tones=[];lowWarn=0;shown=0;
    orbs=[];for(var i=0;i<16;i++)orbs.push({x:hs(i+1)*W,y:hs(i+11)*H,r:10+hs(i+21)*30,v:4+hs(i+31)*8,p:hs(i+41)*6.28,near:i>=11});
    fol=[];for(i=0;i<14;i++){var side=i%2;fol.push({x:side?W-hs(i+50)*40:hs(i+50)*40,y:90+hs(i+60)*520,r:30+hs(i+70)*40,a:hs(i+80)*6.28,side:side})}
    stars=[];for(i=0;i<40;i++)stars.push({x:hs(i+90)*W,y:40+hs(i+95)*260,p:hs(i+99)*6.28});
    rainL=[];for(i=0;i<46;i++)rainL.push({x:hs(i+120)*W,y:hs(i+130)*H,v:520+hs(i+140)*240,l:10+hs(i+150)*12});
    load(0,a);
    window.__ww={get:function(){return {sn:sn,mode:mode,time:time,count:w.count,quota:w.sc.quota,silk:w.silk,
      strands:w.S.filter(function(s){return s.on&&!s.broken}).length,
      stuck:w.items.filter(function(i){return i.st==='stuck'}).map(function(i){return {k:i.k,x:i.x,y:i.y}}),
      anchors:w.anchors.map(function(p){return [p.x,p.y]}),spider:[w.sp.x,w.sp.y],plan:w.sc.plan,
      cur:kb.cur?[kb.cur.x,kb.cur.y]:null,bird:!!w.bird,gust:w.gust}}}}

  function tone(a,f,soft){if(tG-lastTone<.055)return;lastTone=tG;a.beep(f,soft?.3:.55,'triangle');if(!soft)a.beep(f*2,.16,'sine')}
  function ring(x,y,c,r){fx.push({x:x,y:y,t:0,c:c||'255,255,255',r:r||26})}
  function sPitch(s){return C.pitch(s.len,s.strain)}
  function midOf(s){var m=s.n[Math.floor(s.n.length/2)];return m}

  function trySpin(A,B,a){var ko=a.lang==='ko',r=C.spin(w,A,B);
    if(r.ok){firstSpin=true;var s=r.s,m=midOf(s);a.beep(500,.06,'sine');a.beep(900,.08,'sine');tone(a,C.pitch(s.len,.01));ring(m.x,m.y,'255,255,255',18);
      a.burst(B.x,B.y,'#f4fbff',5);w.sp.mood=1;w.sp.moodT=.4;return true}
    var msg={long:ko?'너무 길어요!':'Too long!',short:ko?'너무 짧아요':'Too short',silk:ko?'실이 모자라요':'Not enough silk',same:ko?'이미 이어졌어요':'Already linked'}[r.why]||'';
    a.beep(150,.14,'sawtooth');a.pop((A.x+B.x)/2,(A.y+B.y)/2-10,msg,'#ff6b5b');return false}
  function send(it,a){var ko=a.lang==='ko';if(C.collect(w,it)){a.sfx('tap');ring(it.x,it.y,'255,230,140',14)}}

  function snapPts(){var pts=w.anchors.slice(),seen={};w.anchors.forEach(function(p){seen[p.id]=1});
    var cnt={};w.S.forEach(function(s){if(!s.on||s.broken)return;s.n.forEach(function(p){cnt[p.id]=(cnt[p.id]||0)+1})});
    w.S.forEach(function(s){if(!s.on||s.broken)return;s.n.forEach(function(p,i){if(seen[p.id])return;
      if(cnt[p.id]>1||i===Math.floor(s.n.length/2)){seen[p.id]=1;pts.push(p)}})});return pts}
  function moveCur(dx,dy){var c=kb.cur,best=null,bs=1e9;snapPts().forEach(function(q){if(q===c)return;var vx=q.x-c.x,vy=q.y-c.y,al=vx*dx+vy*dy;
      var dd=Math.hypot(vx,vy),cs=al/(dd||1);if(al<=3||cs<.35)return;var sc=dd*(1+(1-cs)*1.2);if(sc<bs){bs=sc;best=q}});if(best)kb.cur=best}
  function nearestCatch(){var sp=w.sp,best=null,bs=1e9;w.items.forEach(function(it){if(it.st!=='stuck'||it.k==='l')return;
    var d=Math.hypot(it.x-sp.x,it.y-sp.y)-(it.k==='f'?120+it.sage*30:0);if(d<bs){bs=d;best=it}});return best}
  function itemAt(x,y){var best=null,bd=22;w.items.forEach(function(it){if(it.st!=='stuck'||it.k==='l')return;var d=Math.hypot(it.x-x,it.y+4-y)-(it.k==='f'?4:0);if(d<bd){bd=d;best=it}});return best}

  function handleEv(a){var ko=a.lang==='ko';
    w.ev.forEach(function(e){var s=e.s,it=e.it;
      if(e.t==='pluck'){tone(a,sPitch(s));ring(midOf(s).x,midOf(s).y,'255,255,255',14)}
      else if(e.t==='stick'){tone(a,sPitch(s));
        if(it.k==='d'){a.add(10);a.burst(it.x,it.y,'#bfe8ff',6);a.pop(it.x,it.y-14,'+10','#e9f8ff')}
        else if(it.k==='f'){a.add(15);a.burst(it.x,it.y,'#fff3a0',8);a.pop(it.x,it.y-14,'+15','#fff07a');a.beep(1568,.08,'sine')}
        else{a.beep(170,.12,'sine');a.pop(it.x,it.y-16,ko?'잎이 붙었어요':'Leaf!','#d7f0a0');a.burst(it.x,it.y,'#9ccf5a',5)}}
      else if(e.t==='acorn'){tone(a,sPitch(s));a.beep(110,.12,'square');a.shake(3)}
      else if(e.t==='bounce'){a.sfx('tap');a.pop(it.x,it.y-12,ko?'통!':'Boing!','#ffe2b0')}
      else if(e.t==='deflect'){a.beep(240,.06,'triangle')}
      else if(e.t==='tear'){a.sfx('hit');a.shake(7);a.burst(e.x,e.y,'#ffffff',14);a.pop(e.x,e.y-14,ko?'툭! 끊어졌어요':'Snap!','#ff6b5b');ring(e.x,e.y,'255,120,100',30);w.sp.mood=2;w.sp.moodT=1}
      else if(e.t==='cut'){a.beep(1500,.04,'square');a.beep(950,.06,'square');a.burst(e.x,e.y,'#e8fff0',8);ring(e.x,e.y,'200,255,210',16)}
      else if(e.t==='collect'){a.sfx('coin');var pts=it.k==='f'?20:5;a.add(pts);a.burst(it.x,it.y,it.k==='f'?'#fff07a':'#bfe8ff',10);
        a.pop(it.x,it.y-18,'+'+pts+(it.k==='f'?(ko?' · 실+':' · silk+'):''),it.k==='f'?'#fff07a':'#e9f8ff')}
      else if(e.t==='nopath'){a.beep(200,.12,'sine');a.pop(it.x,it.y-18,ko?'갈 길이 없어요':'No path there','#ffc2a8')}
      else if(e.t==='warn'){a.beep(1320,.05,'square');a.beep(1320,.05,'square')}
      else if(e.t==='swoop'){a.beep(1200,.18,'sine');a.beep(800,.25,'sine')}
      else if(e.t==='snatch'){a.beep(520,.1,'triangle');a.beep(330,.2,'triangle');a.pop(e.x,e.y-18,ko?'앗, 새가 채 갔어요':'The bird took it!','#ffb0a0');a.burst(e.x,e.y,'#fff3a0',6);w.sp.mood=2;w.sp.moodT=1}
      else if(e.t==='miss'){a.pop(w.bird?w.bird.x:W/2,(w.bird?w.bird.y:120)+20,ko?'휴! 지켰어요':'Phew!','#c8ffb0')}
      else if(e.t==='gust'){warnT=1.5;gustDir=e.dir;a.beep(140,.4,'sine');a.beep(190,.4,'sine')}
      else if(e.t==='fall'){a.beep(400,.2,'sine');a.pop(e.x,e.y-14,ko?'으앗!':'Whoa!','#fff')}
      else if(e.t==='clear'){
        mode='clear';modeT=0;time=Math.min(70,time+14);var bonus=40+10*sn;a.add(bonus);a.sfx('win');
        var ss=w.S.filter(function(s){return s.on&&!s.broken}).sort(function(p,q){return sPitch(p)-sPitch(q)});
        ss.forEach(function(s,i){tones.push({at:tG+.15+i*.09,f:sPitch(s)});var m=midOf(s);a.burst(m.x,m.y,'#fff6c8',6)});
        tones.push({at:tG+.2+ss.length*.09,f:1047*1.5});
        a.pop(W/2,200,(ko?'장면 클리어! +':'Scene clear! +')+bonus,'#fff6c8');a.pop(W/2,232,ko?'+14초':'+14s','#c8ffb0')}});
    w.ev.length=0}

  function update(dt,inp,a){
    var ko=a.lang==='ko',fresh=inp.down&&!prevDown,rel=!inp.down&&prevDown,i;
    if(mode==='play'){time-=dt;if(time<=0){time=0;a.over();return}
      if(time<10&&Math.ceil(time)!==lowWarn){lowWarn=Math.ceil(time);a.beep(880,.05,'square')}}
    /* 터치 */
    if(fresh&&inp.x!=null&&mode==='play'){kb.on=false;
      drag={x0:inp.x,y0:inp.y,x:inp.x,y:inp.y,p:C.pickPoint(w,inp.x,inp.y,28,16),it:itemAt(inp.x,inp.y),moved:false}}
    if(drag&&inp.down&&inp.x!=null){drag.x=inp.x;drag.y=inp.y;if(Math.hypot(drag.x-drag.x0,drag.y-drag.y0)>12)drag.moved=true}
    if(rel&&drag){
      if(mode==='play'){
        if(drag.moved&&drag.p){var q=C.pickPoint(w,drag.x,drag.y,30,18);
          if(q&&q!==drag.p)trySpin(drag.p,q,a);else if(!q){a.beep(150,.1,'sine');a.pop(drag.x,drag.y-14,ko?'가지나 실 위에서 놓아요':'Release on a branch or strand','#ffd6c8')}}
        else if(!drag.moved){
          if(drag.it)send(drag.it,a);
          else{var s=C.strandNear(w,drag.x0,drag.y0,14);
            if(s){if(lastTap.s===s&&tG-lastTap.t<.42){C.cut(w,s);lastTap={s:null,t:-9}}else{C.pluck(w,s,1);lastTap={s:s,t:tG}}}}}}
      drag=null}
    /* 키보드 */
    while(keyQ.length){var k=keyQ.shift();if(k.at<initAt+150||mode!=='play')continue;kb.on=true;drag=null;
      if(!kb.cur||kb.cur.dead)kb.cur=w.sp.home;
      var c=k.c;
      if(c==='ArrowLeft'||c==='KeyA')moveCur(-1,0);else if(c==='ArrowRight'||c==='KeyD')moveCur(1,0);
      else if(c==='ArrowUp'||c==='KeyW')moveCur(0,-1);else if(c==='ArrowDown'||c==='KeyS')moveCur(0,1);
      else if(c==='Space'){if(!kb.start){kb.start=kb.cur;a.beep(660,.05,'sine')}else{if(kb.start!==kb.cur)trySpin(kb.start,kb.cur,a);kb.start=null}}
      else if(c==='Escape')kb.start=null;
      else if(c==='KeyX'){var list=C.strandsAt(w,kb.cur);if(list.length){var pick=list.filter(function(s){return s.n[0]!==kb.cur&&s.n[s.n.length-1]!==kb.cur})[0]||list[list.length-1];C.cut(w,pick)}}
      else if(c==='KeyC'){var it=nearestCatch();if(it)send(it,a);else a.beep(200,.08,'sine')}}
    if(kb.start&&kb.start.dead)kb.start=null;
    /* 월드 */
    C.step(w,dt);handleEv(a);
    for(i=tones.length-1;i>=0;i--)if(tG>=tones[i].at){a.beep(tones[i].f,.5,'triangle');a.beep(tones[i].f*2,.2,'sine');tones.splice(i,1)}
    if(mode==='clear'){modeT+=dt;if(modeT>2.1){load(sn+1,a)}}
    if(banner>0)banner-=dt;if(warnT>0)warnT-=dt;if(firstSpin&&hintA>0)hintA=Math.max(.0,hintA-dt*.25);
    prevDown=inp.down}

  /* ================= 그리기 ================= */
  function mood(){return w.sc.night?'night':w.sc.rain?'rain':'day'}
  function poly(g,pts,close){g.beginPath();g.moveTo(pts[0][0],pts[0][1]);
    for(var i=1;i<pts.length-1;i++){var mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;g.quadraticCurveTo(pts[i][0],pts[i][1],mx,my)}
    g.lineTo(pts[pts.length-1][0],pts[pts.length-1][1])}
  function drawBg(g,t,dt){var m=mood(),i,p,gr=g.createLinearGradient(0,0,0,H);
    if(m==='night'){gr.addColorStop(0,'#0a1431');gr.addColorStop(.55,'#18284d');gr.addColorStop(1,'#0e2a1e')}
    else if(m==='rain'){gr.addColorStop(0,'#8ea9b2');gr.addColorStop(.5,'#bfd0c2');gr.addColorStop(1,'#56806a')}
    else{gr.addColorStop(0,'#a3d8c6');gr.addColorStop(.45,'#e7f0c6');gr.addColorStop(1,'#78ad84')}
    g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
    if(m==='night'){for(i=0;i<stars.length;i++){p=stars[i];g.fillStyle='rgba(255,255,230,'+(.25+.35*Math.sin(t*1.6+p.p))+')';g.fillRect(p.x,p.y,1.6,1.6)}
      var mg=g.createRadialGradient(286,118,4,286,118,70);mg.addColorStop(0,'rgba(255,250,220,.9)');mg.addColorStop(.2,'rgba(255,248,210,.5)');mg.addColorStop(1,'rgba(255,248,210,0)');
      g.fillStyle=mg;g.beginPath();g.arc(286,118,70,0,7);g.fill()}
    else if(m==='day'){g.save();g.globalCompositeOperation='lighter';var rg=g.createRadialGradient(-30,-50,10,-30,-50,720);
      rg.addColorStop(0,'rgba(255,248,205,.22)');rg.addColorStop(.6,'rgba(255,245,200,.05)');rg.addColorStop(1,'rgba(255,245,200,0)');g.fillStyle=rg;g.beginPath();
      for(i=0;i<6;i++){var a0=.35+i*.2+Math.sin(t*.25+i)*.03,a1=a0+.06+hs(i+3)*.05;g.moveTo(-30,-50);g.lineTo(-30+Math.cos(a0)*900,-50+Math.sin(a0)*900);g.lineTo(-30+Math.cos(a1)*900,-50+Math.sin(a1)*900);g.closePath()}
      g.fill();g.restore()}
    else{g.fillStyle='rgba(255,255,255,.18)';for(i=0;i<3;i++){var cx=((t*8+i*150)%(W+200))-100;g.beginPath();g.ellipse(cx,70+i*24,90,18,0,0,7);g.fill()}}
    /* 먼 잎 덤불 (층 1) */
    for(i=0;i<fol.length;i++){p=fol[i];var sw=Math.sin(t*.6+p.a)*5;g.fillStyle=m==='night'?'rgba(10,40,30,.55)':m==='rain'?'rgba(50,95,70,.35)':'rgba(70,130,80,.3)';
      g.beginPath();g.ellipse(p.x+sw,p.y,p.r*.55,p.r,p.a+(p.side?.5:-.5),0,7);g.fill()}
    /* 바닥 고사리 (층 3) */
    for(i=0;i<9;i++){var fx0=i*44-10+hs(i+400)*20,fh=90+hs(i+410)*90,fs=Math.sin(t*.8+i*1.3)*.06,lean=(hs(i+420)-.5)*.7;
      g.save();g.translate(fx0,H+6);g.rotate(lean+fs);
      g.strokeStyle=m==='night'?'rgba(20,60,40,.8)':m==='rain'?'rgba(45,95,65,.65)':'rgba(60,120,70,.55)';g.lineWidth=2.2;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(8,-fh*.5,4,-fh);g.stroke();
      g.fillStyle=g.strokeStyle;for(var j=1;j<9;j++){var u=j/9,yy=-fh*u,xx=8*Math.sin(u*2.2)*(1-u)+4*u,ll=(1-u)*20+5;
        g.beginPath();g.ellipse(xx-ll*.55,yy,ll*.6,3.2,.5,0,7);g.ellipse(xx+ll*.55,yy,ll*.6,3.2,-.5,0,7);g.fill()}
      g.restore()}
    /* 보케 (층 2) */
    for(i=0;i<orbs.length;i++){p=orbs[i];if(p.near)continue;var ox=(p.x+Math.sin(t*.3+p.p)*20+W)%W,oy=((p.y-t*p.v)%H+H)%H;
      var col=m==='night'?'255,226,140':m==='rain'?'230,245,255':'255,250,215',al=m==='night'?.16:.22;
      var bg=g.createRadialGradient(ox,oy,0,ox,oy,p.r);bg.addColorStop(0,'rgba('+col+','+al+')');bg.addColorStop(.7,'rgba('+col+','+(al*.45)+')');bg.addColorStop(1,'rgba('+col+',0)');
      g.fillStyle=bg;g.beginPath();g.arc(ox,oy,p.r,0,7);g.fill()}}

  function drawBranches(g,t){var m=mood(),dark=m==='night';
    branches.forEach(function(b){var pts=b.pts;g.lineCap='round';g.lineJoin='round';
      g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=12;g.save();g.translate(3,5);poly(g,pts);g.stroke();g.restore();
      g.strokeStyle=dark?'#2e2016':'#4d3322';g.lineWidth=11;poly(g,pts);g.stroke();
      g.strokeStyle=dark?'#4a3526':'#7d5a3e';g.lineWidth=7.5;poly(g,pts);g.stroke();
      g.strokeStyle=dark?'rgba(140,110,80,.35)':'rgba(200,160,115,.7)';g.lineWidth=2;g.save();g.translate(-1,-2.2);poly(g,pts);g.stroke();g.restore();
      /* 이끼와 새잎 */
      for(var i=0;i<pts.length-1;i++){var a=pts[i],c=pts[i+1],L=Math.hypot(c[0]-a[0],c[1]-a[1]);
        for(var d=6;d<L;d+=9){var h=hs(b.id*97+i*31+d);if(h<.45)continue;var x=a[0]+(c[0]-a[0])*d/L,y=a[1]+(c[1]-a[1])*d/L;
          g.fillStyle=dark?'rgba(60,110,70,.8)':h>.8?'#8fc95a':'#6fae4c';g.beginPath();g.arc(x+(h-.5)*4,y-4,2+h*2.2,0,7);g.fill()}
        if(i>0&&hs(b.id+i*7)>.35){var lx=a[0],ly=a[1],sw=Math.sin(t*1.3+i+b.id)*.15,dir=hs(b.id*3+i)>.5?1:-1;
          g.save();g.translate(lx+dir*8,ly-2);g.rotate(-1.2*dir+sw);drawLeaf(g,0,-9,6,13,dark?'#2f6a3e':'#79c25a',dark?'#1f4a2a':'#4f9a3c');g.restore()}}});
    w.anchors.forEach(function(p){g.fillStyle=dark?'#3a2a1d':'#5a3d28';g.beginPath();g.arc(p.x,p.y,6.2,0,7);g.fill();
      g.fillStyle=dark?'#6a5038':'#a67c55';g.beginPath();g.arc(p.x-1,p.y-1.3,4,0,7);g.fill();
      g.fillStyle='rgba(255,240,210,.7)';g.beginPath();g.arc(p.x-2,p.y-2.6,1.4,0,7);g.fill()})}
  function drawLeaf(g,x,y,rw,rh,c1,c2){var gr=g.createLinearGradient(x-rw,y,x+rw,y);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;
    g.beginPath();g.moveTo(x,y-rh);g.quadraticCurveTo(x+rw*1.4,y,x,y+rh);g.quadraticCurveTo(x-rw*1.4,y,x,y-rh);g.fill();
    g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.beginPath();g.moveTo(x,y-rh*.8);g.lineTo(x,y+rh*.9);g.stroke()}

  function nodesPath(g,ns){g.beginPath();g.moveTo(ns[0].x,ns[0].y);
    for(var i=1;i<ns.length-1;i++){g.quadraticCurveTo(ns[i].x,ns[i].y,(ns[i].x+ns[i+1].x)/2,(ns[i].y+ns[i+1].y)/2)}
    g.lineTo(ns[ns.length-1].x,ns[ns.length-1].y)}
  function along(s,f){var segs=s.n.length-1,u=Math.max(0,Math.min(segs-1e-6,f*segs)),k=Math.floor(u),r=u-k,a=s.n[k],b=s.n[k+1];return [a.x+(b.x-a.x)*r,a.y+(b.y-a.y)*r,k]}
  function drawStrands(g,t){var m=mood(),night=m==='night',glowAll=mode==='clear'?Math.max(0,1-Math.abs(modeT-.6)/1.5):0;
    w.S.forEach(function(s){if(!s.on)return;var fade=s.broken?Math.max(0,1-(w.t-s.broken)/1.3):1,born=Math.min(1,(w.t-s.born)*5);
      var r=Math.max(0,Math.min(1.4,s.strain/s.lim)),stress=Math.max(0,(r-.55)/.45),col;
      if(stress>0){var rr=255,gg=Math.round(255-stress*150),bb=Math.round(255-stress*190);col=rr+','+gg+','+bb}else col=night?'215,240,255':'255,255,255';
      if(glowAll>0)col='255,236,150';
      var pieces=s.cut>=0?[s.n.slice(0,s.cut+1),s.n.slice(s.cut+1)]:[s.n];
      g.lineCap='round';g.lineJoin='round';
      if(night||glowAll>0){g.save();g.globalCompositeOperation='lighter'}
      if(!night)pieces.forEach(function(ns){if(ns.length<2)return;g.save();g.translate(.6,1.6);g.strokeStyle='rgba(30,55,45,'+(fade*.22)+')';g.lineWidth=2.4;nodesPath(g,ns);g.stroke();g.restore()});
      pieces.forEach(function(ns){if(ns.length<2)return;
        g.strokeStyle='rgba('+col+','+(fade*(.16+s.vib*.25+glowAll*.22+stress*.2))+')';g.lineWidth=4.5+s.vib*2+glowAll*2.5;nodesPath(g,ns);g.stroke();
        g.strokeStyle='rgba('+col+','+(fade*born*(night?.75:.92))+')';g.lineWidth=1.6+stress*.7;nodesPath(g,ns);g.stroke()});
      if(night||glowAll>0)g.restore();
      if(s.broken)return;
      /* 실 위 이슬 구슬 */
      var segs=s.n.length-1,nb=Math.round(s.len/16);
      for(var j=0;j<nb;j++){var f=(j+.5)/nb+(hs(s.id*7+j)-.5)*.5/nb,q=along(s,f),tw=.5+.5*Math.sin(t*2.4+j*1.7+s.id);
        g.fillStyle='rgba(255,255,255,'+(.55+tw*.4)+')';g.beginPath();g.arc(q[0],q[1]+.8,1.15+hs(s.id+j)*.7,0,7);g.fill();
        if(tw>.96){g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=.8;g.beginPath();g.moveTo(q[0]-4,q[1]);g.lineTo(q[0]+4,q[1]);g.moveTo(q[0],q[1]-4);g.lineTo(q[0],q[1]+4);g.stroke()}}
      /* 반짝이는 빛 */
      var gf=(t*.22+hs(s.id))%1,gq=along(s,gf),gl=g.createRadialGradient(gq[0],gq[1],0,gq[0],gq[1],7);
      gl.addColorStop(0,'rgba(255,255,255,.9)');gl.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gl;g.beginPath();g.arc(gq[0],gq[1],7,0,7);g.fill()})}

  function drawDew(g,x,y,r,a){g.save();g.globalAlpha=a==null?1:a;
    g.fillStyle='rgba(20,60,90,.18)';g.beginPath();g.ellipse(x+2,y+r+2,r*.9,r*.35,0,0,7);g.fill();
    var gr=g.createRadialGradient(x-r*.35,y-r*.3,r*.1,x,y,r*1.2);gr.addColorStop(0,'rgba(255,255,255,.98)');gr.addColorStop(.35,'rgba(190,232,255,.85)');gr.addColorStop(1,'rgba(70,150,215,.9)');
    g.fillStyle=gr;g.beginPath();g.moveTo(x,y-r*1.75);g.quadraticCurveTo(x+r*.9,y-r*.7,x+r,y);g.arc(x,y,r,0,Math.PI);g.quadraticCurveTo(x-r*.9,y-r*.7,x,y-r*1.75);g.fill();
    g.strokeStyle='rgba(40,110,170,.55)';g.lineWidth=1;g.stroke();
    g.fillStyle='rgba(255,255,255,.95)';g.beginPath();g.ellipse(x-r*.38,y-r*.35,r*.22,r*.36,-.5,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.arc(x+r*.42,y+r*.45,r*.16,0,7);g.fill();g.restore()}
  function drawFly(g,x0,y0,t,ph,warn){var pu=.75+.25*Math.sin(t*5+ph),x=0,y=0;g.save();g.translate(x0,y0);g.scale(1.3,1.3);
    g.save();g.globalCompositeOperation='lighter';var gr=g.createRadialGradient(x,y,0,x,y,26*pu);
    gr.addColorStop(0,'rgba(255,245,150,.75)');gr.addColorStop(.3,'rgba(220,255,120,.3)');gr.addColorStop(1,'rgba(200,255,120,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,26*pu,0,7);g.fill();g.restore();
    var wf=Math.sin(t*40+ph)*.5;g.fillStyle='rgba(235,250,255,.6)';g.beginPath();g.ellipse(x-4,y-4,4,2.2,-.6+wf,0,7);g.ellipse(x+4,y-4,4,2.2,.6-wf,0,7);g.fill();
    g.fillStyle='#3d3550';g.beginPath();g.arc(x,y-3.5,2.6,0,7);g.fill();
    g.fillStyle='rgb(255,'+Math.round(230+25*pu)+','+Math.round(90+60*pu)+')';g.beginPath();g.ellipse(x,y+1.5,3.2,4.2,0,0,7);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(x-1,y-4,.9,0,7);g.arc(x+1.2,y-4,.9,0,7);g.fill();
    if(warn){var bl=Math.sin(t*14)>0;g.strokeStyle=bl?'rgba(255,90,70,.95)':'rgba(255,200,80,.8)';g.lineWidth=2;g.beginPath();g.arc(x,y,13,0,7);g.stroke();
      g.fillStyle='#ff5a46';g.font='14px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('!',x+13,y-10)}g.restore()}
  function drawAcorn(g,x,y,rot){g.save();g.translate(x,y);g.rotate(rot);
    g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(2,10,7,2.5,0,0,7);g.fill();
    var gr=g.createLinearGradient(-7,0,7,0);gr.addColorStop(0,'#d8924a');gr.addColorStop(1,'#8f5422');g.fillStyle=gr;
    g.beginPath();g.moveTo(-7,-1);g.quadraticCurveTo(-7,9,0,11);g.quadraticCurveTo(7,9,7,-1);g.fill();
    g.fillStyle='#6b4524';g.beginPath();g.ellipse(0,-2,8.5,4.5,0,0,7);g.fill();
    g.strokeStyle='rgba(40,25,10,.5)';g.lineWidth=.8;for(var i=-6;i<=6;i+=3){g.beginPath();g.moveTo(i,-5.5);g.lineTo(i+2,1);g.stroke()}
    g.strokeStyle='#4a2f18';g.lineWidth=2;g.beginPath();g.moveTo(0,-6);g.lineTo(1.5,-10);g.stroke();
    g.fillStyle='rgba(255,240,210,.55)';g.beginPath();g.ellipse(-3,3,1.6,3,.2,0,7);g.fill();g.restore()}
  function drawItem(g,it,t){var x=it.x,y=it.y,fadeIn=Math.min(1,it.age*4);
    var hang=it.st==='stuck'||it.st==='contact';
    if(it.k==='d')drawDew(g,x,hang?y+5:y,5,fadeIn);
    else if(it.k==='f')drawFly(g,x,hang?y+3:y,t,it.ph,it.warned&&it.st==='stuck');
    else if(it.k==='l'){g.save();g.globalAlpha=fadeIn;g.translate(x,y+(hang?6:0));g.rotate(it.rot);drawLeaf(g,0,0,6,11,'#e6a33c','#b8742a');g.restore()}
    else{g.save();g.globalAlpha=fadeIn;drawAcorn(g,x,y,it.rot);g.restore()}}

  function drawSpider(g,t){var sp=w.sp,x=sp.x,y=sp.y+(sp.path?0:Math.sin(t*2)*.8),walking=!!sp.path,ph=sp.walk*16,i,
      blink=(t%3.4)<.12,md=sp.mood,lookX=0,lookY=0,tg=null;
    if(sp.item)tg=sp.item;else if(drag)tg={x:drag.x,y:drag.y};else if(kb.on&&kb.cur)tg=kb.cur;else{var near=null,bd=1e9;w.items.forEach(function(it){if(it.st==='fall'){var d=Math.hypot(it.x-x,it.y-y);if(d<bd){bd=d;near=it}}});tg=near}
    if(tg){var dx=tg.x-x,dy=tg.y-y,dl=Math.hypot(dx,dy)||1;lookX=dx/dl*1.6;lookY=dy/dl*1.4}
    if(sp.fall>0){y-=Math.sin(sp.fall*Math.PI/.8)*0;g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1;g.beginPath();g.moveTo(x,y-40);g.lineTo(x,y);g.stroke()}
    g.save();g.translate(x,y+8);g.scale(1.15,1.15);
    g.fillStyle='rgba(0,0,0,.15)';g.beginPath();g.ellipse(2,13,11,3,0,0,7);g.fill();
    /* 다리 */
    g.strokeStyle='#3e2a62';g.lineWidth=2.2;g.lineCap='round';g.lineJoin='round';
    for(i=0;i<4;i++)for(var sd=-1;sd<=1;sd+=2){var a=(-.75+i*.5),wig=walking?Math.sin(ph+i*1.6+(sd>0?Math.PI:0))*.28:Math.sin(t*1.5+i)*.05,
        up=sp.hold&&i===0?-1.2:0,ax=sd*8*Math.cos(a*.6),ay=Math.sin(a)*5,kx=sd*(15+i*.5)*Math.cos(a+wig),ky=-7+i*4.5+Math.sin(a+wig)*4+up*10,fx2=sd*(19+i)*Math.cos(a*1.2+wig),fy=-1+i*5.5+up*6;
      if(up){kx=sd*10;ky=-14;fx2=sd*6;fy=-22}
      g.beginPath();g.moveTo(ax,ay);g.lineTo(kx,ky);g.lineTo(fx2,fy);g.stroke();g.fillStyle='#3e2a62';g.beginPath();g.arc(fx2,fy,1.4,0,7);g.fill()}
    /* 몸 */
    var gr=g.createRadialGradient(-4,-5,2,0,0,14);gr.addColorStop(0,'#b296de');gr.addColorStop(.6,'#7a5bb0');gr.addColorStop(1,'#523a84');
    g.fillStyle=gr;g.beginPath();g.ellipse(0,0,12.5,11.5,0,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(-4,-6,4,2.4,-.5,0,7);g.fill();
    g.strokeStyle='#5a3f8e';g.lineWidth=1.6;g.beginPath();g.moveTo(-2,-11);g.quadraticCurveTo(-1,-15,2,-15);g.stroke();
    g.fillStyle='rgba(255,130,160,.5)';g.beginPath();g.arc(-7.5,3.5,2.4,0,7);g.arc(7.5,3.5,2.4,0,7);g.fill();
    /* 눈 */
    g.fillStyle='#2a1c40';g.beginPath();g.arc(-2.6,-8.2,1.1,0,7);g.arc(2.6,-8.2,1.1,0,7);g.fill();
    if(md===1){g.strokeStyle='#2a1c40';g.lineWidth=1.8;g.beginPath();g.arc(-4.4,-1.5,3,3.5,5.9);g.stroke();g.beginPath();g.arc(4.4,-1.5,3,3.5,5.9);g.stroke()}
    else if(blink&&md!==2){g.strokeStyle='#2a1c40';g.lineWidth=1.8;g.beginPath();g.moveTo(-7,-2);g.lineTo(-2,-2);g.moveTo(2,-2);g.lineTo(7,-2);g.stroke()}
    else{var er=md===2?5.4:4.8;g.fillStyle='#fff';g.beginPath();g.arc(-4.4,-2,er,0,7);g.arc(4.4,-2,er,0,7);g.fill();
      g.strokeStyle='rgba(60,40,90,.4)';g.lineWidth=.8;g.stroke();
      g.fillStyle='#22163a';g.beginPath();g.arc(-4.4+lookX,-2+lookY,md===2?1.8:2.5,0,7);g.arc(4.4+lookX,-2+lookY,md===2?1.8:2.5,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(-5.3+lookX,-3.1+lookY,.95,0,7);g.arc(3.5+lookX,-3.1+lookY,.95,0,7);g.fill()}
    /* 입 */
    g.strokeStyle='#2a1c40';g.fillStyle='#2a1c40';g.lineWidth=1.3;
    if(md===1){g.fillStyle='#d4466a';g.beginPath();g.arc(0,4.2,2.6,0,Math.PI);g.fill()}
    else if(md===2){g.beginPath();g.ellipse(0,5.5,1.6,2.1,0,0,7);g.fill();g.fillStyle='rgba(150,210,255,.9)';g.beginPath();g.ellipse(11,-7,1.6,2.6,0,0,7);g.fill()}
    else{g.beginPath();g.arc(0,3.6,2,.3,2.84);g.stroke()}
    g.restore();
    if(sp.hold){var it=sp.hold,hy=y-18-Math.sin(Math.min(1,(.75-sp.holdT)*6)*1.57)*4;it.x=x;it.y=hy;
      if(it.k==='d')drawDew(g,x,hy,6,1);else drawFly(g,x,hy,t,it.ph,false)}}

  function drawBird(g,t){var b=w.bird;if(!b)return;var x=b.x,y=b.y,f=b.side>0?-1:1,fl=Math.sin(t*22);
    g.save();g.translate(x,y);g.scale(f,1);
    g.fillStyle='rgba(0,0,0,.12)';g.beginPath();g.ellipse(0,26,12,3,0,0,7);g.fill();
    g.fillStyle='#4f86c9';g.beginPath();g.moveTo(-12,0);g.lineTo(-22,-4);g.lineTo(-20,5);g.closePath();g.fill();
    var gr=g.createRadialGradient(-3,-4,2,0,0,15);gr.addColorStop(0,'#9ccaf5');gr.addColorStop(1,'#4f86c9');g.fillStyle=gr;g.beginPath();g.ellipse(0,0,14,11,0,0,7);g.fill();
    g.fillStyle='#e9f5ff';g.beginPath();g.ellipse(3,4,8,6,0,0,7);g.fill();
    g.fillStyle='#3d6fae';g.beginPath();g.moveTo(-4,-2);g.quadraticCurveTo(-8,-14-fl*8,-18,-10-fl*12);g.quadraticCurveTo(-10,-2,-4,2);g.fill();
    g.fillStyle='#ffb84d';g.beginPath();g.moveTo(12,-2);g.lineTo(19,0);g.lineTo(12,3);g.closePath();g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(7,-4,3.4,0,7);g.fill();g.fillStyle='#1d2a40';g.beginPath();g.arc(8,-4,1.8,0,7);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(8.6,-4.8,.7,0,7);g.fill();
    g.fillStyle='rgba(255,140,160,.5)';g.beginPath();g.arc(6,1.5,2,0,7);g.fill();g.restore()}

  function drawFore(g,t,dt){var m=mood(),i,p;
    if(w.sc.rain){g.strokeStyle=m==='night'?'rgba(180,200,255,.28)':'rgba(255,255,255,.4)';g.lineWidth=1.2;g.beginPath();
      for(i=0;i<rainL.length;i++){p=rainL[i];var ry=((p.y+t*p.v)%(H+40))-20,rx=(p.x+t*p.v*.12+w.wind*.03*ry/100)%W;g.moveTo(rx,ry);g.lineTo(rx-p.l*.15,ry-p.l)}g.stroke()}
    if(Math.abs(w.gust)>120){var al=Math.min(.5,Math.abs(w.gust)/1400),dir=w.gust>0?1:-1;g.strokeStyle='rgba(255,255,255,'+al+')';g.lineWidth=1.6;g.lineCap='round';
      for(i=0;i<9;i++){var sy=110+hs(i+300)*460,sx=((hs(i+310)*W+t*dir*420)%(W+120)+W+120)%(W+120)-60;g.beginPath();g.moveTo(sx,sy);g.quadraticCurveTo(sx-dir*20,sy-5,sx-dir*48,sy);g.stroke()}}
    for(i=0;i<orbs.length;i++){p=orbs[i];if(!p.near)continue;var ox=(p.x+Math.sin(t*.4+p.p)*30+W)%W,oy=((p.y-t*p.v*1.6)%H+H)%H,r=p.r*1.8;
      var col=m==='night'?'255,230,150':'255,255,235',bg=g.createRadialGradient(ox,oy,0,ox,oy,r);bg.addColorStop(0,'rgba('+col+',.1)');bg.addColorStop(1,'rgba('+col+',0)');
      g.fillStyle=bg;g.beginPath();g.arc(ox,oy,r,0,7);g.fill()}
    var vg=g.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,m==='night'?'rgba(0,0,10,.5)':'rgba(20,40,20,.25)');g.fillStyle=vg;g.fillRect(0,0,W,H)}

  function pill(g,x,y,wd,h,fill){g.fillStyle=fill;g.beginPath();var r=h/2;g.moveTo(x+r,y);g.lineTo(x+wd-r,y);g.arc(x+wd-r,y+r,r,-1.57,1.57);g.lineTo(x+r,y+h);g.arc(x+r,y+r,r,1.57,4.71);g.fill()}
  function drawUI(g,a,t){var ko=a.lang==='ko',i;
    /* 실 게이지 */
    pill(g,8,36,128,24,'rgba(20,30,40,.38)');
    g.fillStyle='#f1e6cf';g.beginPath();g.ellipse(22,48,6,8,0,0,7);g.fill();g.strokeStyle='#b89a6a';g.lineWidth=1.2;g.stroke();
    g.strokeStyle='rgba(150,120,80,.8)';g.lineWidth=.8;for(i=-4;i<=4;i+=2.5){g.beginPath();g.moveTo(17,48+i);g.lineTo(27,48+i);g.stroke()}
    var f=w.silk/w.silkMax,cost=0;
    if(drag&&drag.moved&&drag.p){var q=C.pickPoint(w,drag.x,drag.y,30,18);cost=q?Math.hypot(q.x-drag.p.x,q.y-drag.p.y):Math.hypot(drag.x-drag.p.x,drag.y-drag.p.y)}
    else if(kb.start&&kb.cur)cost=Math.hypot(kb.cur.x-kb.start.x,kb.cur.y-kb.start.y);
    pill(g,34,42,94,12,'rgba(255,255,255,.25)');
    if(f>0)pill(g,34,42,Math.max(12,94*f),12,f<.25?'#ff9a7a':'#f4f9ff');
    if(cost>0){var cf=Math.min(1,cost/w.silkMax),ok=cost<=w.silk&&cost<=C.MAXLEN;g.fillStyle=ok?'rgba(120,200,255,.85)':'rgba(255,90,70,.85)';
      var x1=34+94*f,x0=Math.max(34,x1-94*cf);g.fillRect(x0,44,Math.max(1,x1-x0),8)}
    /* 할당량 */
    var cnt=Math.min(w.count,w.sc.quota),q2=w.sc.quota;
    g.font='12px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle='rgba(255,255,255,.9)';
    pill(g,W/2-58,36,116,24,'rgba(20,30,40,.38)');
    drawDew(g,W/2-38,49,4.5,1);
    g.font='17px Jua, system-ui, sans-serif';g.fillStyle='#fff';g.textAlign='left';g.fillText(cnt+' / '+q2,W/2-26,55);
    g.font='11px Jua, system-ui, sans-serif';g.fillStyle='rgba(255,255,255,.75)';g.textAlign='right';g.fillText((ko?'장면 ':'S')+(sn+1),W/2+52,53);
    /* 시간 */
    var low=time<10;pill(g,W-82,36,74,24,low?'rgba(160,30,20,.55)':'rgba(20,30,40,.38)');
    g.strokeStyle='#fff';g.lineWidth=1.6;g.beginPath();g.arc(W-66,48,6.5,0,7);g.moveTo(W-66,48);g.lineTo(W-66,44);g.moveTo(W-66,48);g.lineTo(W-63,49.5);g.stroke();
    g.font=(low?19+Math.sin(t*12)*1.5:18)+'px Jua, system-ui, sans-serif';g.fillStyle=mode==='clear'?'#c8ffb0':'#fff';g.textAlign='left';g.fillText(Math.ceil(time),W-54,55);
    /* 장면 배너 */
    if(banner>0&&mode==='play'){var ba=Math.min(1,banner*2);g.globalAlpha=ba;g.font='26px Jua, system-ui, sans-serif';g.textAlign='center';
      g.fillStyle='rgba(30,40,40,.35)';g.fillText((ko?'장면 ':'Scene ')+(sn+1),W/2+1,108);g.fillStyle='#fff';g.fillText((ko?'장면 ':'Scene ')+(sn+1),W/2,106);g.globalAlpha=1}
    /* 바람 경고 */
    if(warnT>0){g.globalAlpha=Math.min(1,warnT*2);g.font='22px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle='#fff';
      g.fillText((gustDir>0?'':'← ')+(ko?'바람이 불어요':'Gust incoming')+(gustDir>0?' →':''),W/2,140);g.globalAlpha=1}
    /* 힌트 */
    var tip=w.sc.tip;if(tip&&mode==='play'){var tx=tip[ko?'ko':'en'];g.font='15px Jua, system-ui, sans-serif';var tw=Math.min(290,g.measureText(tx).width+28),al=w.sc.ghost?Math.max(.55,hintA):1;
      g.globalAlpha=al;pill(g,W/2-12-tw/2,598,tw,28,'rgba(25,35,30,.55)');g.fillStyle='#fffbe8';g.textAlign='center';g.fillText(tx,W/2-12,617);g.globalAlpha=1}
    if(kb.on&&mode==='play'){g.font='11px Jua, system-ui, sans-serif';g.fillStyle='rgba(255,255,255,.85)';g.textAlign='center';
      g.fillText(ko?'방향키 이동 · 스페이스 잇기 · X 끊기 · C 거두기':'Arrows move · Space spin · X cut · C collect',W/2-12,590)}}

  function drawGhost(g,t){if(!w.sc.ghost||mode!=='play')return;var A=w.anchors,al=hintA;if(al<=.02)return;
    w.sc.plan.forEach(function(pq,i){var p=A[pq[0]],q=A[pq[1]];
      for(var k=0;k<w.S.length;k++){var s=w.S[k];if(s.on&&!s.broken&&s.n.indexOf(p)>=0&&s.n.indexOf(q)>=0)return}
      g.strokeStyle='rgba(255,255,255,'+(.5*al)+')';g.lineWidth=2.5;g.setLineDash([3,9]);g.lineDashOffset=-t*20;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.stroke();g.setLineDash([]);
      if(i===0&&!firstSpin){var u=(t*.55)%1,fx2=p.x+(q.x-p.x)*u,fy=p.y+(q.y-p.y)*u;g.globalAlpha=al*(u<.85?1:(1-u)/.15);
        g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(fx2,fy,14,0,7);g.fill();g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(fx2,fy,7,0,7);g.fill();g.globalAlpha=1}})}

  function draw(g,a,dt){dt=dt||0;tG+=dt;var t=tG,i,p;if(!w)return;
    drawBg(g,t,dt);drawBranches(g,t);
    /* 앵커 하이라이트 (끌기 중이면 잇기 가능한 지점) */
    if((drag&&drag.moved&&drag.p)||(kb.on&&kb.start)||(w.sc.ghost&&!firstSpin)){w.anchors.forEach(function(p2){g.strokeStyle='rgba(255,255,240,'+(.45+.35*Math.sin(t*6))+')';g.lineWidth=2;g.beginPath();g.arc(p2.x,p2.y,11+Math.sin(t*6)*1.5,0,7);g.stroke()})}
    drawGhost(g,t);drawStrands(g,t);
    w.items.forEach(function(it){if(it.st!=='held'&&it.st!=='done')drawItem(g,it,t)});
    drawSpider(g,t);drawBird(g,t);
    /* 파문 */
    for(i=fx.length-1;i>=0;i--){p=fx[i];p.t+=dt;if(p.t>.5){fx.splice(i,1);continue}g.strokeStyle='rgba('+p.c+','+(1-p.t/.5)*.7+')';g.lineWidth=2;g.beginPath();g.arc(p.x,p.y,p.r*(.4+p.t*2),0,7);g.stroke()}
    /* 끌기 미리보기 */
    var A=null,B=null,bx=0,by=0;
    if(drag&&drag.moved&&drag.p){A=drag.p;B=C.pickPoint(w,drag.x,drag.y,30,18);bx=B?B.x:drag.x;by=B?B.y:drag.y}
    else if(kb.on&&kb.start&&kb.cur){A=kb.start;B=kb.cur;bx=B.x;by=B.y}
    if(A){var L=Math.hypot(bx-A.x,by-A.y),ok=B&&B!==A&&L<=C.MAXLEN&&L>=C.MINLEN&&L<=w.silk,risky=ok&&C.lim(L)<.2;
      g.strokeStyle=ok?(risky?'rgba(255,200,120,.9)':'rgba(255,255,255,.9)'):'rgba(255,100,80,.85)';g.lineWidth=2;g.setLineDash([6,5]);g.beginPath();g.moveTo(A.x,A.y);g.lineTo(bx,by);g.stroke();g.setLineDash([]);
      if(B){g.strokeStyle=ok?'#fff':'#ff6a50';g.lineWidth=2.5;g.beginPath();g.arc(bx,by,10,0,7);g.stroke()}
      if(L>C.MAXLEN||(risky&&B)){g.font='12px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle=L>C.MAXLEN?'#ffd0c8':'#fff0d0';
        g.fillText(L>C.MAXLEN?(a.lang==='ko'?'너무 길어요':'Too long'):(a.lang==='ko'?'긴 줄은 약해요':'Long = weak'),(A.x+bx)/2,(A.y+by)/2-10)}}
    if(kb.on&&kb.cur&&mode==='play'){var c=kb.cur;g.strokeStyle='rgba(255,240,120,.95)';g.lineWidth=2.5;g.beginPath();g.arc(c.x,c.y,9+Math.sin(t*8)*1.5,0,7);g.stroke();
      g.strokeStyle='rgba(255,240,120,.5)';g.beginPath();g.arc(c.x,c.y,15,0,7);g.stroke()}
    drawFore(g,t,dt);
    if(mode==='clear'){var ca=Math.max(0,1-modeT/1.8);g.fillStyle='rgba(255,240,180,'+ca*.18+')';g.fillRect(0,0,W,H)}
    drawUI(g,a,t)}

  SG.run({id:'web-weaver',title:{ko:'이슬 거미줄',en:'Web Weaver'},
    how:{ko:'가지에서 가지로 끌어 거미줄을 이어요. 떨어지는 이슬과 반딧불이를 받아요!',en:'Drag from branch to branch to spin silk. Catch the falling dew and fireflies!'},
    init:init,update:update,draw:draw});
})();
