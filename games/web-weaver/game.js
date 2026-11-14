/* 이슬 거미줄 (Web Weaver) — 가지 사이에 진짜 탄성 실을 걸어 떨어지는 이슬과 반딧불이를 받는다.
   실은 XPBD 줄(마디 여러 개)이라 처지고 늘어나고 떨리며, 너무 길거나 팽팽하면 끊어진다.
   물리·장면·거미 길찾기는 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var WF=22,W=360,H=640,G=600,HS=1/480,CS=2e-5,NM=.05,MAXLEN=290,MINLEN=26,TOPY=66,SPD=150,REST=1;
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
    {br:'lrtlr',an:[[50,290,0],[310,290,1],[180,200,2],[90,440,0],[270,440,1]],home:2,quota:5,silk:780,regen:10,bird:1,
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
    {br:'ltrlr',an:[[40,280,0],[180,200,1],[320,280,2],[56,450,0],[304,450,2]],home:1,quota:9,silk:860,regen:13,rain:1,
      plan:[[1,0],[1,2],[0,2],[0,3],[2,4],[3,4]],
      sp:cat(sq(1.5,.32,'d',[90,140,190,240,270,120,170,220]),sq(6.5,.32,'d',[100,250,160,210,130,280,190,230]),sq(4.2,4,'f',[170,200])),loop:13,
      tip:{ko:'비가 와요! 이슬을 거둬 무게를 덜어요',en:'Rain! Collect drops to lighten the web'}},
    {br:'lrtlr',an:[[44,300,0],[316,300,1],[180,196,2],[70,470,0],[290,470,1]],home:2,quota:6,silk:860,regen:13,night:1,bird:1,
      plan:[[2,0],[2,1],[0,1],[0,3],[1,4],[3,4]],
      sp:sq(1.2,1.4,'ffdfdfdf',[130,230,180,110,250,160,210,140,260]),loop:14,
      tip:{ko:'밤엔 반딧불이가 등불이에요',en:'At night, fireflies are the light'}},
    {br:'ltrr',an:[[60,270,0],[180,215,1],[180,340,1],[300,270,2],[80,420,0],[280,420,3]],home:1,quota:7,silk:880,regen:14,bird:1,
      plan:[[1,0],[1,3],[2,0],[2,3],[2,4],[2,5]],gust:[[5,650,1.6],[11,-650,1.6]],
      sp:cat(sq(1.1,1.2,'dfddfdd',[110,250,150,210,120,240,170,90,270,190]),sq(3.4,4.5,'a',[130,230,180])),loop:14.5,
      tip:{ko:'바람과 도토리를 함께 버텨요',en:'Hold on through wind and acorns'}},
    {br:'ltrr',an:[[50,290,0],[180,230,1],[180,360,1],[310,290,2],[70,450,0],[290,450,3]],home:1,quota:9,silk:980,regen:15,night:1,rain:1,bird:1,
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
    var P=w.P,i,k,p,s,vx,vy,dm=1-1.3*h,h2=h*h,wd=w.wind;
    for(i=0;i<P.length;i++){p=P[i];if(p.pin||p.dead)continue;
      vx=(p.x-p.px)*dm;vy=(p.y-p.py)*dm;p.px=p.x;p.py=p.y;
      p.x+=vx+wd*(NM*WF+p.wa)/p.m*h2;p.y+=vy+G*h2}
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
    w.items.forEach(function(it){if(it.k==='f'&&it.st==='stuck'){if(it.sage>4.5&&!it.warned){it.warned=true;w.ev.push({t:'warn',it:it})}
      if(!w.bird&&it.sage>6.5){w.bird={it:it,t:0,side:it.x<W/2?1:-1,got:false,miss:false,x:0,y:0};w.ev.push({t:'swoop',it:it})}}});
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
    var c=w.col;w.items.forEach(function(it){if(it.st==='stuck'&&(it.k==='d'||it.k==='f'))c++});w.count=c;
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
  /*__GAME__*/
})();
