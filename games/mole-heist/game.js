/* 두더지 대작전 (Mole Heist) — 이번엔 내가 두더지! 허수아비 로봇의 시선을 피해 채소를 뽑아 굴로 나른다.
   시뮬레이션(SIM)은 DOM 없이 돌아가며 상태가 전부 JSON 이라 봇이 복제해서 미리 돌려 볼 수 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,GX=180,GY=222,D2R=Math.PI/180,SPEED=175,T0=50,TADD=13,TCAP=70,UT=476;
  /* t:뽑는 시간 pts:점수 w:무게 loud:소리 크기(1 조용, 2 덜그럭, 3 호박) */
  var VT={c:{t:.8,pts:10,w:1,loud:1},t:{t:1.3,pts:20,w:1.5,loud:1},p:{t:1.7,pts:40,w:2.5,loud:3}};
  var LOOK=[0,1.7,2.7,2.3],CURIOUS=.9,GRACE=.22,CROWT=5;

  /* g: 행별 문자열. c 당근 t 순무 p 호박 B 굴 . 빈 구멍 / guards.pat: [각도(90=아래,0=오른쪽), 머무는 시간] */
  var LEVELS=[
    {g:['c.c','cB.'],q:3,guards:[{pat:[[135,2.6],[45,2.6]]}],
      hint:{ko:'안 볼 때 쏙! 구멍을 꾹 눌러 당근을 뽑아요',en:'Pop up when it looks away — hold to pull'}},
    {g:['.cc','B.c'],q:3,guards:[{pat:[[45,9]]}],
      hint:{ko:'빈 구멍에서 꾹! 덜그럭 소리로 속여요',en:'Hold on an empty hole to rattle a decoy'}},
    {g:['c.tc','cB.c'],q:4,guards:[{pat:[[140,2],[90,1.5],[40,2],[90,1.5]]}],
      hint:{ko:'굴에 넣어야 점수! 많이 들면 느려져요',en:'Bank at the burrow — a full sack is slow'}},
    {g:['c..p','.Bc.'],q:3,guards:[{pat:[[130,2.4],[50,2.4]]}],
      hint:{ko:'호박은 시끄러워요. 끊어서 뽑아요',en:'Pumpkins are loud — pull in short bursts'}},
    {g:['ct.c','B.tc'],q:4,guards:[{pat:[[135,2.2],[45,2.2]]},{x:20,y:344,hw:17,ph:.8,pat:[[-25,1.6],[25,1.6]]}],
      hint:{ko:'허수아비가 둘! 박자가 달라요',en:'Two guards, two rhythms'}},
    {g:['c.tc','.cc.','B..p'],q:4,guards:[{pat:[[140,2.1],[40,2.1]]}],dog:[180,316],
      hint:{ko:'멍멍이는 호박 소리에 깨요',en:'The dog wakes to pumpkin noise'}},
    {g:['c.c.','.t.c','.B.t'],q:4,guards:[{pat:[[135,1.9],[90,1.3],[45,1.9],[90,1.3]]}],spr:[[100,282,0],[180,350,1.6],[260,418,.8]],
      hint:{ko:'물줄기를 지나면 흙더미가 들켜요',en:'Sprinklers give your dirt bump away'}},
    {g:['c.pc','.t..','cB.t'],q:4,crow:1,guards:[{pat:[[135,1.8],[90,1.4],[45,1.8]]}],
      hint:{ko:'뽑다 만 채소는 까마귀가 채 가요',en:'The crow takes half-pulled veggies'}},
    {g:['c.tc','.c..','B.ct'],q:4,night:1,guards:[{pat:[[130,2],[60,2]]}],flies:[[100,350],[260,316]],
      hint:{ko:'밤! 반딧불을 건드리면 멀리서도 보여요',en:'Night — fireflies light you up'}},
    {g:['ct.p','.c.c','tB.c'],q:5,guards:[{pat:[[140,1.9],[45,1.9]]},{x:20,y:350,hw:16,ph:.6,pat:[[-28,1.4],[0,1.2],[28,1.4],[0,1.2]]}],dog:[100,384],
      hint:{ko:'전부 다 나왔어요. 침착하게!',en:'Everything at once — stay cool'}}
  ];

  function rng(s){s=s>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  /* 11번째 밭부터는 번호를 시드로 만든다(같은 번호는 항상 같은 밭) */
  function gen(n){
    var r=rng(n*7919+13),rows=r()<.3?2:3,cols=4,N=rows*cols,i,cells=[];
    for(i=0;i<N;i++)cells.push('.');
    var b=(rows-1)*cols+Math.floor(r()*cols);cells[b]='B';
    var feats=['dog','spr','crow','night'],f={},k=1+(r()<.5?1:0);while(k--)f[feats[Math.floor(r()*4)]]=1;
    var q=3+(r()<.45?1:0),nv=q+1+(f.crow?1:0),types=[];
    if(f.dog||r()<.5)types.push('p');types.push('t');if(r()<.5)types.push('t');while(types.length<nv)types.push('c');
    var free=[];for(i=0;i<N;i++)if(i!==b)free.push(i);
    for(i=free.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),t=free[i];free[i]=free[j];free[j]=t}
    var pump=-1;for(i=0;i<nv;i++){cells[free[i]]=types[i];if(types[i]==='p')pump=free[i]}
    var g=[];for(i=0;i<rows;i++)g.push(cells.slice(i*cols,i*cols+cols).join(''));
    var d=1.5+r()*.8,P=[[[135,d],[45,d]],[[140,d],[90,d*.7],[40,d],[90,d*.7]],[[120,d],[60,d]],[[145,d],[100,d*.8],[35,d]],[[40,d],[140,d]]];
    var L={g:g,q:q,guards:[{pat:P[Math.floor(r()*P.length)],hw:22+Math.floor(r()*5)}]};
    if(r()<.4&&!f.night){var left=r()<.5,base=left?0:180,sg=left?1:-1,e=1.2+r()*.6;
      L.guards.push({x:left?20:340,y:rows===2?344:350,hw:16,ph:r()*1.5,
        pat:rows===2?[[base-25*sg,e+.3],[base+25*sg,e+.3]]:[[base-28*sg,e],[base,e*.8],[base+28*sg,e],[base,e*.8]]})}
    var y0=rows===2?305:282,dy=rows===2?78:68,cx=[100,180,260],cy=[];for(i=0;i<rows-1;i++)cy.push(y0+dy*i+dy/2);
    if(f.dog){var opts=[];for(i=0;i<3;i++)for(var jj=0;jj<cy.length;jj++){var pc=pump%cols,pr=Math.floor(pump/cols);
        if(!((pc===i||pc===i+1)&&(pr===jj||pr===jj+1)))opts.push([cx[i],cy[jj]])}
      L.dog=opts[Math.floor(r()*opts.length)]}
    if(f.spr){L.spr=[];for(i=0;i<2;i++)L.spr.push([cx[Math.floor(r()*3)],y0+dy*Math.floor(r()*rows),r()*3.2])}
    if(f.crow)L.crow=1;
    if(f.night){L.night=1;L.flies=[];for(i=0;i<2;i++)L.flies.push([cx[Math.floor(r()*3)],cy[Math.floor(r()*cy.length)]])}
    return L}

  function build(n){
    var d=n<LEVELS.length?LEVELS[n]:gen(n),rows=d.g.length,cols=d.g[0].length,sx=cols===3?96:80,
        y0=rows===2?305:282,dy=rows===2?78:68,G={n:n,cols:cols,rows:rows,y0:y0,dy:dy,holes:[],veg:[],burrow:0,quota:d.q,banked:0,spots:0,t:0,
          night:!!d.night,crow:!!d.crow,hint:d.hint||null,dog:null,spr:[],flies:[],guards:[]};
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){var ch=d.g[r].charAt(c),i=G.holes.length;
      G.holes.push({x:180+(c-(cols-1)/2)*sx,y:y0+r*dy,c:c,r:r});
      if(ch==='B')G.burrow=i;else if(VT[ch])G.veg.push({h:i,type:ch,prog:0,st:0,exp:0,re:0})}
    d.guards.forEach(function(q){G.guards.push({x:q.x||GX,y:q.y||GY,pat:q.pat,pi:0,pt:q.ph||0,ang:q.pat[0][0]*D2R,hw:(q.hw||24)*D2R,
      range:d.night?190:340,mode:'patrol',timer:0,tx:0,ty:0,loud:0})});
    if(d.dog)G.dog={x:d.dog[0],y:d.dog[1],r:62,hear:240,st:0,t:0};
    (d.spr||[]).forEach(function(s){G.spr.push({x:s[0],y:s[1],r:24,ph:s[2]||0})});
    (d.flies||[]).forEach(function(s){G.flies.push({x:s[0],y:s[1],r:30,hot:0})});
    var b=G.holes[G.burrow];
    G.m={h:G.burrow,from:-1,to:-1,p:0,x:b.x,y:b.y,up:0,pop:false,dizzy:0,carry:[],glow:0,rcd:0,sus:0,seen:0,sawn:false,wet:false,q:-1,lock:false};
    return G}
  function newRun(){return{n:0,time:T0,T:0,score:0,spots:0,cleared:0,trans:0,over:false,ev:[],G:build(0)}}

  function wrap(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a}
  function inCone(g,x,y,far){var dx=x-g.x,dy=y-g.y,d=Math.sqrt(dx*dx+dy*dy);if(d>g.range&&!far)return false;
    return Math.abs(wrap(Math.atan2(dy,dx)-g.ang))<=g.hw}
  function vegAt(G,h){for(var i=0;i<G.veg.length;i++)if(G.veg[i].h===h&&G.veg[i].st===0)return G.veg[i];return null}
  function weight(G){var w=0;G.m.carry.forEach(function(i){w+=VT[G.veg[i].type].w});return w}
  function vegPos(G,v){var h=G.holes[v.h];return[h.x+24,h.y-4]}
  function E(S,t,o){o=o||{};o.t=t;S.ev.push(o)}

  function noise(S,G,x,y,loud){E(S,'noise',{x:x,y:y,loud:loud});
    G.guards.forEach(function(g,i){if(g.mode==='bonk')return;
      if(g.mode==='patrol'||loud>g.loud||(g.mode==='look'&&loud>=g.loud)){g.mode='curious';g.timer=CURIOUS;g.tx=x;g.ty=y;g.loud=loud;E(S,'q',{g:i})}});
    var d=G.dog;if(d&&loud>=3&&d.st===0&&Math.hypot(x-d.x,y-d.y)<d.hear){d.st=1;d.t=.6;E(S,'dogq')}}
  function spot(S,G,g){var m=G.m;G.spots++;S.spots++;m.dizzy=2;m.up=0;m.pop=false;m.sus=0;m.q=-1;m.lock=true;
    var v=vegAt(G,m.h);if(v)v.prog=0;
    m.carry.forEach(function(i){G.veg[i].st=0;G.veg[i].prog=0;G.veg[i].exp=0});E(S,'bonk',{x:m.x,y:m.y,n:m.carry.length,dog:!g});m.carry=[];
    if(g){g.mode='bonk';g.timer=1;g.tx=m.x;g.ty=m.y;g.loud=9}}
  function bank(S,G){var m=G.m,k=m.carry.length,pts=0;if(!k)return;
    m.carry.forEach(function(i){pts+=VT[G.veg[i].type].pts;G.veg[i].st=2});
    pts=Math.round(pts*(1+.25*(k-1)));S.score+=pts;G.banked+=k;m.carry=[];E(S,'bank',{k:k,pts:pts});
    if(G.banked>=G.quota){var bonus=G.spots?0:30;S.score+=bonus;S.time=Math.min(TCAP,S.time+TADD);S.trans=1.4;S.cleared++;E(S,'clear',{bonus:bonus})}}
  function startMove(G,m,to){m.from=m.h;m.to=to;m.h=-1;m.p=0;m.seen=0;m.sawn=false;m.wet=false;m.up=0;m.pop=false}

  function updGuard(S,g,dt,i){var tgt=g.ang,fast=g.mode!=='patrol';
    if(g.mode==='patrol'){g.pt+=dt;if(g.pt>=g.pat[g.pi][1]){g.pt=0;g.pi=(g.pi+1)%g.pat.length}tgt=g.pat[g.pi][0]*D2R}
    else{g.timer-=dt;
      if(g.mode==='curious'){if(g.timer<=0){g.mode='look';g.timer=LOOK[g.loud]||2;E(S,'bang',{g:i})}}
      else{tgt=Math.atan2(g.ty-g.y,g.tx-g.x);if(g.timer<=0){g.mode='patrol';g.loud=0;g.pt=0}}}
    var d=wrap(tgt-g.ang),sp=Math.min(fast?4:2.6,Math.abs(d)*7+.5)*dt;
    g.ang=Math.abs(d)<=sp?g.ang+d:g.ang+(d>0?sp:-sp)}

  function updMole(S,G,m,dt,cmd){
    if(m.glow>0)m.glow-=dt;if(m.rcd>0)m.rcd-=dt;
    if(m.dizzy>0){m.dizzy-=dt;m.up=0;m.sus=0;return}
    var go=cmd&&cmd.go!=null&&cmd.go>=0&&cmd.go<G.holes.length?cmd.go:-1,hold=!!(cmd&&cmd.hold),i;
    if(m.to>=0){if(go>=0)m.q=go;
      var a=G.holes[m.from],b=G.holes[m.to],d=Math.hypot(b.x-a.x,b.y-a.y);
      m.p+=SPEED/(1+.2*weight(G))*dt/d;
      if(m.p>=1){m.h=m.to;m.to=-1;m.x=b.x;m.y=b.y;E(S,'arrive');if(m.h===G.burrow)bank(S,G);
        if(m.q>=0&&m.q!==m.h&&S.trans<=0)startMove(G,m,m.q);m.q=-1;return}
      m.x=a.x+(b.x-a.x)*m.p;m.y=a.y+(b.y-a.y)*m.p;
      for(i=0;i<G.guards.length;i++)if(G.guards[i].mode!=='bonk'&&inCone(G.guards[i],m.x,m.y,m.glow>0))m.seen+=dt;
      if(m.seen>.3&&!m.sawn){m.sawn=true;E(S,'seen',{x:m.x,y:m.y});noise(S,G,m.x,m.y,1)}
      for(i=0;i<G.spr.length;i++){var s=G.spr[i];if(!m.wet&&(G.t+s.ph)%3.2<1.6&&Math.hypot(m.x-s.x,m.y-s.y)<s.r){m.wet=true;E(S,'splash',{x:m.x,y:m.y});noise(S,G,m.x,m.y,1)}}
      for(i=0;i<G.flies.length;i++){var f=G.flies[i];if(f.hot<=0&&Math.hypot(m.x-f.x,m.y-f.y)<f.r){f.hot=3;m.glow=3;E(S,'fly',{x:f.x,y:f.y})}}
      return}
    if(go>=0&&go!==m.h)m.q=go;
    if(m.q>=0){if(m.up<=0){startMove(G,m,m.q);m.q=-1;return}hold=false}
    var v=vegAt(G,m.h);
    if(!hold)m.lock=false;else if(m.lock)hold=false;
    if(hold){if(!m.pop){m.pop=true;
        if(v){var vp=vegPos(G,v);noise(S,G,vp[0],vp[1],VT[v.type].loud)}
        else if(m.rcd<=0){m.rcd=1;E(S,'rattle',{x:m.x,y:m.y});noise(S,G,m.x,m.y,2)}}
      m.up=Math.min(1,m.up+dt*9)}
    else{m.up=Math.max(0,m.up-dt*9);if(m.up<=0)m.pop=false}
    if(m.up>=1&&v){v.prog+=dt;if(v.prog>=VT[v.type].t){v.st=1;v.exp=0;m.carry.push(G.veg.indexOf(v));m.lock=true;E(S,'pulled',{h:v.h,type:v.type})}}
    if(m.up>.4){var seen=null;
      for(i=0;i<G.guards.length;i++)if(G.guards[i].mode!=='bonk'&&inCone(G.guards[i],m.x,m.y,m.glow>0))seen=G.guards[i];
      var dog=G.dog&&G.dog.st===2&&Math.hypot(m.x-G.dog.x,m.y-G.dog.y)<G.dog.r;
      if(seen||dog){m.sus+=dt;if(m.sus>GRACE)spot(S,G,seen)}else m.sus=Math.max(0,m.sus-dt*2)}
    else m.sus=Math.max(0,m.sus-dt*2)}

  /* cmd: {go: 구멍 번호 또는 -1, hold: 올라와서 뽑기} */
  function step(S,dt,cmd){
    S.ev=[];if(S.over)return;S.T+=dt;
    if(S.trans>0){S.trans-=dt;if(S.trans<=0){S.n++;S.G=build(S.n);E(S,'garden')}return}
    S.time-=dt;if(S.time<=0){S.time=0;S.over=true;E(S,'over');return}
    var G=S.G,m=G.m,i;G.t+=dt;
    updMole(S,G,m,dt,cmd);
    for(i=0;i<G.guards.length;i++)updGuard(S,G.guards[i],dt,i);
    var d=G.dog;if(d&&d.st){d.t-=dt;if(d.t<=0){if(d.st===1){d.st=2;d.t=3.5;E(S,'bark')}else d.st=0}}
    for(i=0;i<G.flies.length;i++)if(G.flies[i].hot>0)G.flies[i].hot-=dt;
    if(G.crow)for(i=0;i<G.veg.length;i++){var v=G.veg[i];
      if(v.st===0&&v.prog>0&&!(m.h===v.h&&m.up>0)){v.exp+=dt;if(v.exp>CROWT){v.st=3;E(S,'crow',{h:v.h});
          var av=G.banked;G.veg.forEach(function(u){if(u.st<2)av++});if(av<G.quota)v.re=2.5}}
      else if(v.st===3&&v.re>0){v.re-=dt;if(v.re<=0){v.st=0;v.type='c';v.prog=0;v.exp=0;E(S,'grow',{h:v.h})}}}}

  function holeAt(G,x,y){var best=-1,bd=42;G.holes.forEach(function(h,i){var d=Math.hypot(x-h.x-8,y-h.y+6);if(d<bd){bd=d;best=i}});return best}

  var SIM={LEVELS:LEVELS,VT:VT,build:build,gen:gen,newRun:newRun,step:step,holeAt:holeAt,vegAt:vegAt,inCone:inCone,weight:weight};
  if(typeof module!=='undefined'&&module.exports)module.exports=SIM;
  if(typeof window==='undefined'||!window.SG)return;

  /* =================== 화면 =================== */
  var S,tt=0,press=false,space=false,shown=0,rings=[],flyers=[],banner=null,pullTick=0,blink=0,tapFx=null,poof=[],hintT=0,kb=false;
  if(!window.__moleHeistKeys){window.__moleHeistKeys=1;
    window.addEventListener('keydown',function(e){if(e.code==='Space'){space=true;kb=true}});
    window.addEventListener('keyup',function(e){if(e.code==='Space')space=false});
    window.addEventListener('blur',function(){space=false})}

  window.__moleHeist=function(){return S};
  function init(){S=newRun();press=false;shown=0;rings=[];flyers=[];banner=null;poof=[];hintT=0;tapFx=null}

  function update(dt,inp,a){
    var G=S.G,m=G.m,cmd={go:-1,hold:false},ko=a.lang==='ko';
    if(inp.tap&&inp.down&&inp.x!=null){kb=false;var h=holeAt(G,inp.x,inp.y);
      if(h>=0){if(m.to<0&&h===m.h&&m.q<0)press=true;else{cmd.go=h;press=false;tapFx={h:h,t:0}}}}
    if(!inp.down)press=false;
    if(inp.swipe&&inp.x==null){kb=true;var bi=m.to>=0?m.to:m.h,b=G.holes[bi],c=b.c,r=b.r;
      if(inp.swipe==='left')c--;else if(inp.swipe==='right')c++;else if(inp.swipe==='up')r--;else r++;
      if(c>=0&&c<G.cols&&r>=0&&r<G.rows){cmd.go=r*G.cols+c;tapFx={h:cmd.go,t:0}}}
    cmd.hold=press||space;
    step(S,dt,cmd);G=S.G;m=G.m;hintT+=dt;
    for(var i=0;i<S.ev.length;i++){var e=S.ev[i],hp;
      if(e.t==='noise'){rings.push({x:e.x,y:e.y,loud:e.loud,t:0});a.beep(e.loud===3?140:e.loud===2?880:260,.09,e.loud===2?'square':'triangle')}
      else if(e.t==='q')a.beep(520,.07,'sine');
      else if(e.t==='bang')a.beep(820,.1,'square');
      else if(e.t==='rattle'){a.beep(1180,.05,'square');a.pop(e.x,e.y-34,ko?'덜그럭!':'Clank!','#fff3b0')}
      else if(e.t==='pulled'){hp=G.holes[e.h];a.sfx('coin');a.burst(hp.x+24,hp.y-4,'#8a5a2b',12);a.burst(hp.x+24,hp.y-8,'#7ccf5a',5);
        flyers.push({type:e.type,x:hp.x+24,y:hp.y-10,t:0});a.pop(hp.x+24,hp.y-30,ko?'쏙!':'Pop!','#fff')}
      else if(e.t==='bank'){hp=G.holes[G.burrow];a.sfx('coin');a.beep(660+e.k*90,.16,'triangle');a.burst(hp.x,hp.y-6,'#ffd65a',8+e.k*5);
        a.pop(hp.x,hp.y-26,'+'+e.pts+(e.k>1?(ko?' 콤보 x':' combo x')+e.k:''),'#ffe27a')}
      else if(e.t==='bonk'){a.sfx('hit');a.shake(10);a.burst(e.x,e.y-10,'#ffffff',18);poof.push({x:e.x,y:e.y,t:0});
        a.pop(e.x,e.y-40,e.dog?(ko?'멍멍!':'Woof!'):(ko?'들켰다!':'Bonk!'),'#ff8a8a')}
      else if(e.t==='clear'){a.sfx('win');banner={t:0,bonus:e.bonus,n:G.n+1}}
      else if(e.t==='arrive')a.beep(200,.04,'sine');
      else if(e.t==='seen')a.pop(e.x,e.y-16,'?','#ffd9a0');
      else if(e.t==='splash'){a.beep(1500,.08,'sine');a.burst(e.x,e.y,'#bfe9ff',10)}
      else if(e.t==='fly'){a.beep(1400,.12,'triangle');a.burst(e.x,e.y,'#eaff8a',10)}
      else if(e.t==='bark'){a.beep(170,.1,'sawtooth');a.pop(G.dog.x,G.dog.y-26,ko?'멍!':'Woof!','#fff')}
      else if(e.t==='dogq')a.beep(300,.08,'sine');
      else if(e.t==='crow'){hp=G.holes[e.h];a.beep(620,.12,'sawtooth');a.burst(hp.x+24,hp.y-8,'#2b2b3a',10);a.pop(hp.x+24,hp.y-30,ko?'까악!':'Caw!','#dfe3ff')}
      else if(e.t==='garden'){hintT=0;press=false}
      else if(e.t==='over')a.over()}
    if(S.score!==shown){a.add(S.score-shown);shown=S.score}
    var v=m.to<0&&m.up>=1?vegAt(G,m.h):null;
    if(v){pullTick-=dt;if(pullTick<=0){pullTick=.11;a.beep(300+v.prog/VT[v.type].t*500,.04,'triangle')}}
    a.tempo(S.time<10?1.4:1)}

  /* ---------- 그리기 도우미 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function ell(g,x,y,rx,ry,c){g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fill()}
  function leaf(g,x,y,a,l,w,c){g.save();g.translate(x,y);g.rotate(a);g.fillStyle=c;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(w,-l*.5,0,-l);g.quadraticCurveTo(-w,-l*.5,0,0);g.fill();g.restore()}
  /* 채소: 원점은 몸통 맨 위(잎이 붙는 곳), 몸통은 +y 로 뻗는다 */
  function veggie(g,t,x,y,s,wig){g.save();g.translate(x,y);g.scale(s,s);
    if(t==='c'){var gr=g.createLinearGradient(-6,0,6,0);gr.addColorStop(0,'#ff9a3c');gr.addColorStop(1,'#e8651a');g.fillStyle=gr;
      g.beginPath();g.moveTo(-6.5,1);g.quadraticCurveTo(-5,16,0,24);g.quadraticCurveTo(5,16,6.5,1);g.quadraticCurveTo(0,-3,-6.5,1);g.fill();
      g.strokeStyle='rgba(150,60,0,.45)';g.lineWidth=1;g.beginPath();g.moveTo(-4,6);g.lineTo(0,7);g.moveTo(-1,13);g.lineTo(3,12);g.stroke();
      leaf(g,0,1,-.5+wig,15,4,'#4fae3d');leaf(g,0,1,.5+wig,15,4,'#4fae3d');leaf(g,0,1,wig*1.3,19,4.5,'#6cc94e')}
    else if(t==='t'){ell(g,0,9,9.5,9,'#fbf4ff');g.fillStyle='#c36bd0';g.beginPath();g.ellipse(0,9,9.5,9,0,Math.PI,0);g.fill();
      ell(g,-3,5,2.5,1.6,'rgba(255,255,255,.5)');g.strokeStyle='#e9dcef';g.lineWidth=1.5;g.beginPath();g.moveTo(0,18);g.lineTo(1,23);g.stroke();
      leaf(g,0,1,-.6+wig,16,5.5,'#3f9d48');leaf(g,0,1,.6+wig,16,5.5,'#3f9d48');leaf(g,0,1,wig*1.3,20,6,'#5cbc55')}
    else{ell(g,0,10,14,10.5,'#f28a1f');ell(g,-6,10,6,10,'#f79b32');ell(g,6,10,6,10,'#e57812');ell(g,0,10,5,10.5,'#ffab45');
      ell(g,-5,5,3,1.8,'rgba(255,255,255,.35)');g.strokeStyle='#4c8a2e';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(0,1);g.quadraticCurveTo(1,-4,4+wig*8,-7);g.stroke();
      leaf(g,2,-3,1.1+wig,14,6,'#5cbc55');leaf(g,-1,-2,-1+wig,11,5,'#3f9d48')}
    g.restore()}

  function drawSky(g,a,night){
    var sk=g.createLinearGradient(0,0,0,220);
    if(night){sk.addColorStop(0,'#141a4a');sk.addColorStop(1,'#3b4a8c')}else{sk.addColorStop(0,'#8fd6ff');sk.addColorStop(1,'#e9f8d8')}
    g.fillStyle=sk;g.fillRect(0,0,W,230);var i;
    if(night){for(i=0;i<26;i++){var sx=(i*97)%W,sy=34+(i*53)%120;g.globalAlpha=.4+.5*Math.abs(Math.sin(tt*1.3+i));ell(g,sx,sy,1.2,1.2,'#fff')}g.globalAlpha=1;
      ell(g,62,92,20,20,'#fff6c9');ell(g,70,86,17,17,'#27306b')}
    else{ell(g,62,92,30,30,'rgba(255,240,170,.35)');ell(g,62,92,20,20,'#ffe680')}
    for(i=0;i<3;i++){var cx=((tt*(6+i*3)+i*150)%(W+140))-70,cy=70+i*26;g.globalAlpha=night?.25:.9;
      ell(g,cx,cy,30,11,'#fff');ell(g,cx-16,cy+4,18,9,'#fff');ell(g,cx+18,cy+3,20,9,'#fff');ell(g,cx+2,cy-7,16,10,'#fff')}
    g.globalAlpha=1;
    /* 언덕 3겹 */
    var cols=night?['#3d5a7a','#34636a','#2d6a52']:['#b5e0a0','#93d27e','#74c264'];
    for(i=0;i<3;i++){g.fillStyle=cols[i];g.beginPath();g.moveTo(0,240);
      for(var x=0;x<=W;x+=12)g.lineTo(x,168+i*13-Math.sin(x*.012*(1.4-i*.25)+i*2.1+tt*.02*(i+1))*(20-i*5)-Math.sin(x*.031+i)*5);
      g.lineTo(W,240);g.fill()}
    /* 농가와 굴뚝 연기 */
    var hx=284,hy=160;
    for(i=0;i<4;i++){var p=((tt*.22+i*.25)%1);g.globalAlpha=(1-p)*.55;ell(g,hx+16+Math.sin(p*4+i)*5+p*10,hy-32-p*42,4+p*8,4+p*7,night?'#aab2d8':'#fff')}
    g.globalAlpha=1;g.fillStyle='#9b5a3c';g.fillRect(hx+12,hy-32,8,14);
    g.fillStyle=night?'#b9a58c':'#fff1d6';g.fillRect(hx-20,hy-12,40,26);
    g.fillStyle='#d6543f';g.beginPath();g.moveTo(hx-26,hy-10);g.lineTo(hx,hy-30);g.lineTo(hx+26,hy-10);g.fill();
    g.fillStyle='#8a5a3a';g.fillRect(hx-5,hy,10,14);g.fillStyle=night?'#ffe27a':'#9fd8ff';g.fillRect(hx+8,hy-4,8,8);g.fillRect(hx-17,hy-4,8,8);
    /* 나무 */
    [[36,176,15],[236,180,11],[330,178,13]].forEach(function(t,k){var sw=Math.sin(tt*1.1+k)*1.5;g.fillStyle='#7a5234';g.fillRect(t[0]-2,t[1],4,16);
      ell(g,t[0]+sw,t[1]-4,t[2],t[2]+2,night?'#285c4a':'#4faa55');ell(g,t[0]+sw-4,t[1]-8,t[2]*.5,t[2]*.5,night?'#32705a':'#6cc46a')});
  }
  function drawGround(g,a,G){
    var night=G.night,gr=g.createLinearGradient(0,196,0,UT);gr.addColorStop(0,night?'#2f7350':'#86cf63');gr.addColorStop(1,night?'#235c44':'#5fb84f');
    g.fillStyle=gr;g.fillRect(0,196,W,UT-196);var i,x;
    /* 구름 그림자 */
    if(!night)for(i=0;i<2;i++){x=((tt*(9+i*4)+i*210)%(W+200))-100;ell(g,x,300+i*110,70,22,'rgba(20,70,30,.10)')}
    /* 울타리 */
    g.fillStyle=night?'#8f8a7a':'#f7ead0';for(x=8;x<W;x+=24){rr(g,x,198,7,24,3);g.fill()}
    g.fillRect(0,204,W,4);g.fillRect(0,214,W,4);
    /* 밭 */
    var top=G.y0-46,bot=G.holes[G.holes.length-1].y+38,sg=g.createLinearGradient(0,top,0,bot);
    sg.addColorStop(0,night?'#5a4032':'#a8744a');sg.addColorStop(1,night?'#4a3328':'#8c5c38');
    g.fillStyle='rgba(0,0,0,.14)';rr(g,12,top+4,W-24,bot-top,20);g.fill();g.fillStyle=sg;rr(g,12,top,W-24,bot-top,20);g.fill();
    g.strokeStyle='rgba(60,30,10,.16)';g.lineWidth=3;
    for(var y=top+16;y<bot-6;y+=17){g.beginPath();g.moveTo(26,y);g.quadraticCurveTo(W/2,y+5,W-26,y);g.stroke()}
    /* 가장자리 풀과 꽃 */
    for(i=0;i<14;i++){x=18+i*25.5;var yy=i%2?top-2:bot+3,sw=Math.sin(tt*1.6+i*1.3)*.22;
      leaf(g,x,yy,-.4+sw,11,3,night?'#2f7d54':'#4fae3d');leaf(g,x+3,yy,.35+sw,12,3,night?'#3a8f60':'#6cc94e');
      if(i%4===1){ell(g,x+8,yy-9+sw*4,3,3,i%8===1?'#ffd9ec':'#fff6a8');ell(g,x+8,yy-9+sw*4,1.2,1.2,'#f2a03c')}}
  }
  function drawHole(g,G,i){var h=G.holes[i],b=i===G.burrow;
    ell(g,h.x,h.y+3,24,10,'rgba(60,30,10,.35)');ell(g,h.x,h.y,22,9,b?'#7a5236':'#6b4428');ell(g,h.x,h.y+1,17,6.5,'#24130b');
    if(b){/* 굴 표시: 조약돌과 깃발 */
      for(var k=0;k<5;k++)ell(g,h.x-20+k*10,h.y+9+(k%2)*1.5,4,2.6,'#cfc6b8');
      g.strokeStyle='#7a5234';g.lineWidth=2;g.beginPath();g.moveTo(h.x-25,h.y+2);g.lineTo(h.x-25,h.y-24);g.stroke();
      var fw=Math.sin(tt*3)*1.5;g.fillStyle='#ffcf4a';g.beginPath();g.moveTo(h.x-25,h.y-24);g.lineTo(h.x-11,h.y-20+fw);g.lineTo(h.x-25,h.y-15);g.fill();
      ell(g,h.x-21,h.y-20,1.4,1.4,'#7a4a12')}}
  function drawVeg(g,G,v){if(v.st!==0)return;var h=G.holes[v.h],x=h.x+24,y=h.y-4,T=VT[v.type].t,p=v.prog/T,m=G.m,
      pulling=m.h===v.h&&m.up>=1,wig=pulling?Math.sin(tt*38)*.22:Math.sin(tt*1.8+v.h)*.07,
      rise=(v.type==='p'?14:v.type==='t'?8:6)+p*(v.type==='c'?20:14)+(pulling?Math.sin(tt*30)*1:0);
    g.save();g.beginPath();g.rect(x-30,y-60,60,62);g.clip();veggie(g,v.type,x,y+2-rise,1.25,wig);g.restore();
    ell(g,x,y+3,v.type==='p'?16:11,4,'#6b4428');ell(g,x-4,y+2,4,2,'#8a5d3a');
    if(v.prog>0){g.lineWidth=5;g.lineCap='round';g.strokeStyle='rgba(30,20,10,.35)';g.beginPath();g.arc(x,y-34,10,0,7);g.stroke();
      g.strokeStyle=v.type==='p'?'#ffb347':'#fff';g.beginPath();g.arc(x,y-34,10,-Math.PI/2,-Math.PI/2+p*6.283);g.stroke();
      if(G.crow&&!pulling){g.strokeStyle='#39304f';g.lineWidth=2.5;g.beginPath();g.arc(x,y-34,15,-Math.PI/2,-Math.PI/2+(v.exp/CROWT)*6.283);g.stroke()}}}
  function drawCone(g,gd){var c=gd.mode==='patrol'?'255,238,140':gd.mode==='curious'?'255,200,100':gd.mode==='look'?'255,160,70':'255,90,90';
    g.save();g.beginPath();g.rect(0,186,W,UT-186);g.clip();
    var gr=g.createRadialGradient(gd.x,gd.y,6,gd.x,gd.y,gd.range);gr.addColorStop(0,'rgba('+c+',.5)');gr.addColorStop(.75,'rgba('+c+',.24)');gr.addColorStop(1,'rgba('+c+',.12)');
    g.fillStyle=gr;g.beginPath();g.moveTo(gd.x,gd.y);g.arc(gd.x,gd.y,gd.range,gd.ang-gd.hw,gd.ang+gd.hw);g.closePath();g.fill();
    g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=2;g.stroke();g.restore()}
  function bubble(g,x,y,s,col,k){g.save();g.translate(x,y);g.scale(k,k);ell(g,0,0,11,11,'#fff');g.fillStyle='#fff';g.beginPath();g.moveTo(-4,8);g.lineTo(0,17);g.lineTo(5,8);g.fill();
    g.fillStyle=col;g.font='17px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(s,0,6);g.restore()}
  function drawGuard(g,gd,G){var x=gd.x,y=gd.y,fx=Math.cos(gd.ang),fy=Math.sin(gd.ang),bob=Math.sin(tt*2+x)*.8;
    ell(g,x,y+40,15,5,'rgba(0,0,0,.22)');
    g.strokeStyle='#8a5f3a';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(x,y+40);g.lineTo(x,y+8);g.moveTo(x-19,y+16);g.lineTo(x+19,y+16);g.stroke();
    /* 몸통: 누더기 조끼를 입은 양철통 */
    var bg=g.createLinearGradient(x-11,0,x+11,0);bg.addColorStop(0,'#d9e2ea');bg.addColorStop(1,'#93a3b3');g.fillStyle=bg;rr(g,x-11,y+8,22,20,5);g.fill();
    g.fillStyle='#d6543f';g.beginPath();g.moveTo(x-11,y+10);g.lineTo(x-3,y+10);g.lineTo(x-7,y+28);g.lineTo(x-11,y+28);g.fill();
    g.beginPath();g.moveTo(x+11,y+10);g.lineTo(x+3,y+10);g.lineTo(x+7,y+28);g.lineTo(x+11,y+28);g.fill();
    ell(g,x,y+19,2,2,'#ffd65a');
    g.strokeStyle='#e8c860';g.lineWidth=2;for(var k=-1;k<=1;k+=2){g.beginPath();g.moveTo(x+k*19,y+16);g.lineTo(x+k*24,y+13);g.moveTo(x+k*19,y+16);g.lineTo(x+k*24,y+19);g.stroke()}
    /* 베개 망치 */
    var bk=gd.mode==='bonk'?1-gd.timer:-1,px=x+20,py=y-2+bob,rot=.25;
    if(bk>=0){var u=bk<.35?bk/.35:Math.max(0,1-(bk-.35)/.5);px=x+20+(gd.tx-x-20)*u;py=y-2+(gd.ty-14-y+2)*u-Math.sin(u*Math.PI)*46;rot=.25+u*5}
    g.save();g.translate(px,py);g.rotate(rot);g.strokeStyle='#8a5f3a';g.lineWidth=3;g.beginPath();g.moveTo(0,18);g.lineTo(0,0);g.stroke();
    g.fillStyle='#fff';rr(g,-11,-9,22,13,6);g.fill();g.strokeStyle='#ffb3c7';g.lineWidth=1.5;g.beginPath();g.moveTo(-6,-9);g.lineTo(-6,4);g.moveTo(6,-9);g.lineTo(6,4);g.stroke();g.restore();
    /* 머리 */
    var hx=x+fx*2.5,hy=y-3+bob;
    var hg=g.createLinearGradient(hx-12,0,hx+12,0);hg.addColorStop(0,'#eef3f7');hg.addColorStop(1,'#a9b7c4');g.fillStyle=hg;rr(g,hx-12,hy-10,24,20,6);g.fill();
    g.fillStyle='#e8c860';g.beginPath();g.ellipse(hx,hy-10,18,4,0,0,7);g.fill();g.fillStyle='#d9b244';rr(g,hx-9,hy-20,18,11,4);g.fill();g.fillStyle='#d6543f';g.fillRect(hx-9,hy-13,18,3);
    var ex=fx*5,ey=Math.max(-1,fy)*2.5,lc=gd.mode==='patrol'?'#ffe66b':gd.mode==='bonk'?'#ff6b6b':'#ffae4a';
    ell(g,hx-5+ex,hy-1+ey,4,4,'#3a4654');ell(g,hx+5+ex,hy-1+ey,4,4,'#3a4654');ell(g,hx-5+ex+fx,hy-1+ey+fy,2.4,2.4,lc);ell(g,hx+5+ex+fx,hy-1+ey+fy,2.4,2.4,lc);
    g.strokeStyle='#3a4654';g.lineWidth=1.5;g.beginPath();g.moveTo(hx-4+ex,hy+6);g.lineTo(hx-2+ex,hy+5);g.lineTo(hx+ex,hy+6);g.lineTo(hx+2+ex,hy+5);g.lineTo(hx+4+ex,hy+6);g.stroke();
    if(gd.mode==='curious')bubble(g,x+20,y-30,'?','#e08a1a',1+Math.sin(tt*14)*.08);
    else if(gd.mode==='bonk'||(gd.mode==='look'&&gd.timer>(LOOK[gd.loud]||2)-.8))bubble(g,x+20,y-30,'!','#e03c3c',1.15)}
  function drawSack(g,x,y,n,G,m){var r=6+Math.min(n,5)*2.6;
    m.carry.forEach(function(vi,k){var t=G.veg[vi].type;leaf(g,x-4+k*4,y-r+3,-.4+k*.4,9,2.6,t==='t'?'#3f9d48':'#5cbc55');
      ell(g,x-4+k*4,y-r+3,2.2,2.2,t==='c'?'#f28a1f':t==='t'?'#c36bd0':'#f79b32')});
    var sg=g.createRadialGradient(x-r*.3,y-r*.3,1,x,y,r);sg.addColorStop(0,'#e9cf9a');sg.addColorStop(1,'#b98f55');
    g.fillStyle=sg;g.beginPath();g.ellipse(x,y,r,r*.92,0,0,7);g.fill();g.strokeStyle='#8a6332';g.lineWidth=1.5;g.beginPath();g.moveTo(x-r*.5,y-r*.75);g.lineTo(x+r*.5,y-r*.75);g.stroke();
    g.fillStyle='rgba(120,80,30,.5)';g.fillRect(x-2,y-2,5,4)}
  function drawMole(g,G,a){var m=G.m,night=G.night;
    if(m.to>=0){/* 흙더미 */
      var A=G.holes[m.from],B=G.holes[m.to];g.strokeStyle='rgba(60,30,10,.28)';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(A.x,A.y);g.lineTo(m.x,m.y);g.stroke();
      g.setLineDash([3,7]);g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.beginPath();g.moveTo(m.x,m.y);g.lineTo(B.x,B.y);g.stroke();g.setLineDash([]);
      var wob=Math.sin(tt*24)*1.5;ell(g,m.x,m.y+3,17,6,'rgba(0,0,0,.2)');ell(g,m.x,m.y-2+wob*.4,15,9,'#8a5d3a');ell(g,m.x-4,m.y-5+wob*.4,8,4,'#a8794e');
      for(var k=0;k<3;k++)ell(g,m.x-(B.x-A.x)*.04*(k+1)+Math.sin(tt*20+k)*5,m.y-(B.y-A.y)*.04*(k+1)+Math.cos(tt*17+k)*3,2.2,2.2,'#6b4428');
      if(m.sawn)ell(g,m.x,m.y-2,19,12,'rgba(255,170,80,.3)');
      if(m.glow>0)ell(g,m.x,m.y-4,24,16,'rgba(230,255,120,.35)');return}
    var h=G.holes[m.h],x=h.x,y=h.y,u=m.up,gd=G.guards[0],bd=1e9;
    G.guards.forEach(function(q){var d=Math.hypot(q.x-x,q.y-y);if(d<bd){bd=d;gd=q}});
    var lx=(gd.x-x)/bd,ly=(gd.y-y)/bd;
    if(m.dizzy>0){for(var s=0;s<3;s++){var an=tt*6+s*2.09;g.fillStyle='#ffe27a';g.font='13px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('★',x+Math.cos(an)*16,y-14+Math.sin(an)*5)}
      g.strokeStyle='#fff';g.lineWidth=1.5;g.beginPath();g.arc(x-5,y,2.5,tt*8,tt*8+4.5);g.stroke();g.beginPath();g.arc(x+5,y,2.5,tt*8,tt*8+4.5);g.stroke();return}
    if(u<=.02){/* 굴 속에서 반짝이는 안경 */
      var bl=blink>0?.2:1;g.globalAlpha=.9;ell(g,x-5+lx*2,y+1,3.2,3.2*bl,'#dff3ff');ell(g,x+5+lx*2,y+1,3.2,3.2*bl,'#dff3ff');
      ell(g,x-5+lx*3,y+1+ly,1.3,1.3*bl,'#1b1b22');ell(g,x+5+lx*3,y+1+ly,1.3,1.3*bl,'#1b1b22');g.globalAlpha=1;
      if(m.carry.length){g.save();g.beginPath();g.rect(x-20,y-30,40,31);g.clip();drawSack(g,x-10,y+6-m.carry.length,m.carry.length,G,m);g.restore()}
      return}
    var top=y+12-46*u,v=vegAt(G,m.h),pulling=u>=1&&v,scared=m.sus>0||G.guards.some(function(q){return Math.abs(wrap(Math.atan2(y-q.y,x-q.x)-q.ang))<q.hw+.25});
    if(m.glow>0)ell(g,x,top+20,30,30,'rgba(230,255,120,.3)');
    g.save();g.beginPath();g.rect(x-34,y-70,80,74);g.clip();
    if(m.carry.length)drawSack(g,x-15,top+30,m.carry.length,G,m);
    var sh=pulling?Math.sin(tt*38)*1:scared?Math.sin(tt*40)*.7:0,bx=x+sh;
    var mg=g.createLinearGradient(bx-15,0,bx+15,0);mg.addColorStop(0,'#8b7468');mg.addColorStop(1,'#5f4d45');g.fillStyle=mg;rr(g,bx-15,top,30,60,15);g.fill();
    ell(g,bx,top+36,9,12,'#bca79a');
    /* 안경과 눈 */
    var ey=top+13,bl2=blink>0?.15:1,pr=scared?1.4:2.1;
    ell(g,bx-6.5,ey,5.6,5.6,'#fff');ell(g,bx+6.5,ey,5.6,5.6,'#fff');
    ell(g,bx-6.5+lx*2.4,ey+ly*2.4,pr,pr*bl2,'#1b1b22');ell(g,bx+6.5+lx*2.4,ey+ly*2.4,pr,pr*bl2,'#1b1b22');
    g.strokeStyle='#2b2b3a';g.lineWidth=1.8;g.beginPath();g.arc(bx-6.5,ey,5.6,0,7);g.stroke();g.beginPath();g.arc(bx+6.5,ey,5.6,0,7);g.stroke();g.beginPath();g.moveTo(bx-1,ey);g.lineTo(bx+1,ey);g.stroke();
    ell(g,bx,top+22,4.5,3.2,'#ff8fa6');ell(g,bx-1,top+21,1.4,1,'#ffd0da');
    g.strokeStyle='rgba(40,30,25,.6)';g.lineWidth=1;g.beginPath();g.moveTo(bx-5,top+23);g.lineTo(bx-13,top+21);g.moveTo(bx-5,top+25);g.lineTo(bx-13,top+27);g.moveTo(bx+5,top+23);g.lineTo(bx+13,top+21);g.moveTo(bx+5,top+25);g.lineTo(bx+13,top+27);g.stroke();
    g.fillStyle='#fff';g.fillRect(bx-2,top+25,4,3.5);
    if(scared){g.fillStyle='#9fd8ff';g.beginPath();g.moveTo(bx+13,top+3);g.quadraticCurveTo(bx+17,top+9,bx+13,top+10);g.quadraticCurveTo(bx+10,top+9,bx+13,top+3);g.fill()}
    g.restore();
    /* 앞발 */
    if(u>.7){if(v){g.strokeStyle='#6b574d';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(bx+10,top+32);g.lineTo(x+22,y-14-(v.prog/VT[v.type].t)*10);g.stroke();ell(g,x+22,y-14-(v.prog/VT[v.type].t)*10,3.6,3.6,'#ff9fb2')}
      else{/* 덜그럭: 냄비 뚜껑 두 개 */var cl=Math.abs(Math.sin(tt*16))*7;
        ell(g,bx-13-cl*.3,top+34,3.4,3.4,'#ff9fb2');ell(g,bx+13+cl*.3,top+34,3.4,3.4,'#ff9fb2');
        if(m.rcd>.2){ell(g,bx+4+cl,top+2,6,7,'#d9e2ea');ell(g,bx-4-cl,top+2,6,7,'#c2ccd6');ell(g,bx+4+cl,top+2,1.6,1.6,'#7a8794');ell(g,bx-4-cl,top+2,1.6,1.6,'#7a8794')}}}
    /* 구멍 앞 테두리 */
    g.fillStyle='#6b4428';g.beginPath();g.ellipse(x,y+3,20,7,0,0,Math.PI);g.fill();
    if(m.sus>0){g.strokeStyle='#ff5a5a';g.lineWidth=4;g.beginPath();g.arc(x,top-10,8,-Math.PI/2,-Math.PI/2+Math.min(1,m.sus/GRACE)*6.283);g.stroke()}}
  function drawDog(g,d,a){var aw=d.st===2,x=d.x,y=d.y;
    g.setLineDash(aw?[]:[4,6]);g.strokeStyle=aw?'rgba(255,90,90,.85)':'rgba(255,255,255,.4)';g.lineWidth=aw?3:1.5;g.beginPath();g.arc(x,y,d.r,0,7);g.stroke();g.setLineDash([]);
    if(aw)ell(g,x,y,d.r,d.r,'rgba(255,90,90,.16)');
    ell(g,x,y+9,17,5,'rgba(0,0,0,.2)');var up=aw?-5:0;
    ell(g,x,y+3+up*.4,15,aw?9:8,'#f3e2c3');ell(g,x+6,y+2+up*.4,6,5,'#c98b4e');
    ell(g,x-11,y-4+up,9,8,'#f3e2c3');ell(g,x-17,y-3+up,4,7,'#a8683a');ell(g,x-6,y-9+up,4,4,'#c98b4e');ell(g,x-17,y-1+up,2.2,1.8,'#2b2b3a');
    if(aw){ell(g,x-12,y-6+up,1.7,2.2,'#2b2b3a');g.strokeStyle='#fff';g.lineWidth=2;for(var k=0;k<2;k++){g.beginPath();g.arc(x-22,y-2+up,6+k*5+Math.sin(tt*14)*1.5,2.4,3.9);g.stroke()}}
    else{g.strokeStyle='#2b2b3a';g.lineWidth=1.5;g.beginPath();g.moveTo(x-14,y-6);g.lineTo(x-10,y-6);g.stroke();
      if(d.st===1)bubble(g,x+4,y-28,'?','#e08a1a',1);
      else{g.fillStyle='rgba(255,255,255,.85)';g.font='12px Jua, system-ui, sans-serif';g.textAlign='center';var z=(tt*.7)%1;g.globalAlpha=1-z;g.fillText('z',x+2+z*6,y-12-z*14);g.globalAlpha=1}}
    g.strokeStyle='#c98b4e';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(x+14,y+2);g.quadraticCurveTo(x+21,y-2+(aw?Math.sin(tt*20)*4:0),x+19,y-8);g.stroke()}
  function drawUnder(g,G,a){
    var gr=g.createLinearGradient(0,UT,0,H);gr.addColorStop(0,'#7b4f30');gr.addColorStop(1,'#4a2c1a');g.fillStyle=gr;g.fillRect(0,UT,W,H-UT);
    var i,x;for(i=0;i<16;i++)ell(g,(i*71)%W,UT+22+(i*37)%130,3+(i%3),2+(i%2),'rgba(0,0,0,.14)');
    g.fillStyle=G.night?'#2f7350':'#5fb84f';g.beginPath();g.moveTo(0,UT+7);for(x=0;x<=W;x+=10)g.lineTo(x,UT+5+(x%20?3:0));g.lineTo(W,UT-2);g.lineTo(0,UT-2);g.fill();
    function uy(y){return UT+38+(y-G.y0)/G.dy*21}
    var b=G.holes[G.burrow],cx=Math.max(60,Math.min(250,b.x)),cy=612;
    g.strokeStyle='#2a170d';g.lineCap='round';g.lineWidth=9;
    G.holes.forEach(function(h,k){g.beginPath();g.moveTo(h.x,UT+10);g.lineTo(h.x,uy(h.y));g.stroke();
      if(h.c<G.cols-1){var n=G.holes[k+1];g.beginPath();g.moveTo(h.x,uy(h.y));g.lineTo(n.x,uy(n.y));g.stroke()}});
    g.beginPath();g.moveTo(b.x,uy(b.y));g.lineTo(cx,cy-8);g.stroke();
    ell(g,cx,cy,50,19,'#2a170d');ell(g,cx,cy+12,40,5,'#3b2415');
    /* 굴 속 채소 더미: 목표 칸과 채운 채소 */
    var done=[];G.veg.forEach(function(v){if(v.st===2)done.push(v.type)});
    for(i=0;i<Math.max(G.quota,done.length);i++){var px=cx-((Math.min(G.quota,6)-1)*15)/2+(i%6)*15,py=cy+1-Math.floor(i/6)*12;
      if(i<done.length){g.save();g.translate(px,py-10);g.rotate(.5);veggie(g,done[i],0,0,.62,0);g.restore()}
      else{g.setLineDash([2,3]);g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=1.5;g.beginPath();g.arc(px,py-2,5.5,0,7);g.stroke();g.setLineDash([])}}
    /* 단면 속 두더지 */
    var m=G.m,mx=m.x,my=uy(m.y)-(m.to<0?m.up*24:0);
    if(m.carry.length)ell(g,mx-8,my+1,3+m.carry.length*1.6,3+m.carry.length*1.5,'#d6b578');
    ell(g,mx,my,8,6,'#8b7468');ell(g,mx+5,my-1,2,1.6,'#ff8fa6');ell(g,mx+1,my-2,1.6,1.6,'#fff');ell(g,mx+1.5,my-2,.8,.8,'#1b1b22');
    g.fillStyle='rgba(255,236,200,.75)';g.font='11px Jua, system-ui, sans-serif';g.textAlign='left';g.fillText(a.lang==='ko'?'굴':'Burrow',cx-46,cy-16)}

  function draw(g,a,dt){
    dt=dt||0;tt+=dt;blink-=dt;if(blink<-2.6-Math.random()*2)blink=.13;
    var G=S.G,m=G.m,ko=a.lang==='ko',i;
    drawSky(g,a,G.night);drawGround(g,a,G);
    /* 스프링클러 */
    G.spr.forEach(function(s){var on=(G.t+s.ph)%3.2<1.6;ell(g,s.x,s.y,s.r,s.r*.7,on?'rgba(150,215,255,.4)':'rgba(40,20,10,.12)');
      if(on){g.strokeStyle='rgba(215,242,255,.95)';g.lineWidth=2;for(var k=0;k<5;k++){var an=tt*5+k*1.257;g.beginPath();g.moveTo(s.x,s.y-6);g.quadraticCurveTo(s.x+Math.cos(an)*s.r*.5,s.y-20,s.x+Math.cos(an)*s.r,s.y+Math.sin(an)*s.r*.6);g.stroke()}}
      g.fillStyle='#6f7f8c';g.fillRect(s.x-2,s.y-7,4,9);ell(g,s.x,s.y-8,4,3,'#d6543f')});
    for(i=0;i<G.holes.length;i++)drawHole(g,G,i);
    G.veg.forEach(function(v){drawVeg(g,G,v)});
    if(tapFx){tapFx.t+=dt;var th=G.holes[tapFx.h];if(th&&tapFx.t<.3){g.strokeStyle='rgba(255,255,255,'+(1-tapFx.t/.3)+')';g.lineWidth=3;g.beginPath();g.ellipse(th.x,th.y,22+tapFx.t*50,9+tapFx.t*20,0,0,7);g.stroke()}}
    if(G.dog)drawDog(g,G.dog,a);
    if(G.night){g.fillStyle='rgba(10,16,58,.5)';g.fillRect(0,0,W,UT)}
    G.guards.forEach(function(q){drawCone(g,q)});
    /* 소리 고리 */
    for(i=rings.length-1;i>=0;i--){var r=rings[i];r.t+=dt;if(r.t>.8){rings.splice(i,1);continue}
      g.globalAlpha=1-r.t/.8;g.strokeStyle=r.loud===3?'#ff8a3c':r.loud===2?'#fff3a0':'#ffffff';g.lineWidth=r.loud+1;
      for(var k=0;k<r.loud;k++){var rad=8+(r.t*(70+r.loud*30))-k*12;if(rad>2){g.beginPath();g.ellipse(r.x,r.y,rad,rad*.55,0,0,7);g.stroke()}}g.globalAlpha=1}
    /* 반딧불 */
    G.flies.forEach(function(f,k){for(var j=0;j<6;j++){var an=tt*(1+j*.23)+j*1.7+k,hot=f.hot>0,fx=hot&&m.glow>0?m.x+Math.cos(an*3)*16:f.x+Math.cos(an)*f.r*.7,fy=hot&&m.glow>0?m.y-12+Math.sin(an*2.3)*12:f.y+Math.sin(an*1.4)*f.r*.45;
        ell(g,fx,fy,5,5,'rgba(230,255,120,.22)');ell(g,fx,fy,1.8,1.8,'#f4ffb0')}});
    G.guards.forEach(function(q){drawGuard(g,q,G)});
    if(m.to<0){g.save();g.translate(m.x,m.y);g.scale(1.16,1.16);g.translate(-m.x,-m.y);drawMole(g,G,a);g.restore()}else drawMole(g,G,a);
    /* 까마귀 */
    if(G.crow){var cv=null;G.veg.forEach(function(v){if(v.st===0&&v.prog>0&&v.exp>CROWT*.45)cv=v});
      var crx=318,cry=194;if(cv){var ch=G.holes[cv.h],cu=Math.min(1,(cv.exp/CROWT-.45)/.55);crx=318+(ch.x+24-318)*cu;cry=194+(ch.y-52-194)*cu-Math.sin(cu*3.14)*30}
      var fl=cv?Math.sin(tt*18)*7:0;ell(g,crx,cry,9,6.5,'#2b2b3a');ell(g,crx-7,cry-5,5,5,'#2b2b3a');
      g.fillStyle='#f2a03c';g.beginPath();g.moveTo(crx-11,cry-6);g.lineTo(crx-17,cry-4);g.lineTo(crx-11,cry-3);g.fill();ell(g,crx-8,cry-6,1.4,1.4,'#fff');
      g.fillStyle='#3d3d52';g.beginPath();g.moveTo(crx-2,cry-2);g.lineTo(crx+10,cry-6-fl);g.lineTo(crx+8,cry+2);g.fill()}
    /* 뽑은 채소가 자루로 날아간다 */
    for(i=flyers.length-1;i>=0;i--){var f=flyers[i];f.t+=dt;if(f.t>.32){flyers.splice(i,1);continue}var u=f.t/.32;
      g.save();g.translate(f.x+(m.x-15-f.x)*u,f.y+(m.y-20-f.y)*u-Math.sin(u*3.14)*26);g.rotate(u*5);veggie(g,f.type,0,-8,.9,0);g.restore()}
    for(i=poof.length-1;i>=0;i--){var p=poof[i];p.t+=dt;if(p.t>.5){poof.splice(i,1);continue}if(p.t<.3)continue;
      g.globalAlpha=1-(p.t-.3)/.2;g.fillStyle='#fff';g.font='22px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(ko?'퍽!':'POOF',p.x,p.y-22);g.globalAlpha=1}
    drawUnder(g,G,a);
    /* 상단 정보: 밭 번호, 남은 시간, 목표 */
    g.fillStyle='rgba(20,30,50,.5)';rr(g,10,33,W-20,20,10);g.fill();
    g.font='13px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='#fff';g.fillText((ko?'밭 ':'Garden ')+(S.n+1),18,48);
    var bx=ko?64:88,bw=W-bx-78,fr=Math.max(0,S.time/TCAP),low=S.time<10;
    g.fillStyle='rgba(255,255,255,.25)';rr(g,bx,38,bw,10,5);g.fill();
    if(fr>0){g.fillStyle=low?(Math.sin(tt*12)>0?'#ff6b6b':'#ffb0a0'):'#8ff07a';rr(g,bx,38,Math.max(10,bw*fr),10,5);g.fill()}
    g.fillStyle='#fff';g.textAlign='right';g.fillText(Math.ceil(S.time)+(ko?'초':'s'),W-52,48);
    g.fillStyle='#ffe27a';g.fillText(Math.min(G.banked,G.quota)+'/'+G.quota,W-18,48);
    if(G.hint&&S.n<LEVELS.length&&!banner){var s=G.hint[a.lang];g.font='15px Jua, system-ui, sans-serif';var tw=g.measureText(s).width+22;
      g.fillStyle='rgba(255,255,255,.9)';rr(g,W/2-tw/2,58,tw,24,12);g.fill();g.fillStyle='#4a3324';g.textAlign='center';g.fillText(s,W/2,75)}
    if(kb&&S.n===0){g.font='12px Jua, system-ui, sans-serif';g.fillStyle='rgba(255,255,255,.85)';g.textAlign='center';g.fillText(ko?'방향키: 구멍 이동 · 스페이스 꾹: 뽑기':'Arrows: tunnel · hold Space: pull',W/2,UT-6)}
    if(banner){banner.t+=dt;if(banner.t>1.4)banner=null;else{var k2=Math.min(1,banner.t*6),al=banner.t>1.1?(1.4-banner.t)/.3:1;g.globalAlpha=al;
        g.fillStyle='rgba(30,40,70,.72)';rr(g,W/2-120*k2,250,240*k2,banner.bonus?74:52,18);g.fill();
        if(k2>=1){g.textAlign='center';g.fillStyle='#fff';g.font='24px Jua, system-ui, sans-serif';g.fillText(ko?'밭 '+banner.n+' 털기 성공!':'Garden '+banner.n+' cleared!',W/2,284);
          if(banner.bonus){g.fillStyle='#ffe27a';g.font='16px Jua, system-ui, sans-serif';g.fillText((ko?'한 번도 안 들켰다! +':'Never spotted! +')+banner.bonus,W/2,310)}}
        g.globalAlpha=1}}
  }

  window.SG.run({id:'mole-heist',title:{ko:'두더지 대작전',en:'Mole Heist'},
    how:{ko:'이번엔 내가 두더지! 구멍을 톡 눌러 땅속으로 이동하고, 내 구멍을 꾹 눌러 채소를 뽑아요. 불빛에 들키면 베개 망치!',
      en:'This time YOU are the mole. Tap a hole to tunnel, hold your own hole to pop up and pull. Stay out of the beam!'},
    init:init,update:update,draw:draw});
})();
