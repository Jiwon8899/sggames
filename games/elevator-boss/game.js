/* 엘리베이터 반장 (Lift Boss) — 동물 아파트의 엘리베이터 배차원이 되어 주민을 목적층까지 보낸다.
   시뮬레이션(고정 스텝, 결정적)과 배차 봇은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var CAP=6,ACC=7,VMAX=3.2,VEX=4.8,DOOR=.3,DWELL=.7,PER=.13,STEP=1/60;
  var KINDS={n:{size:1,pts:10,pat:0},ele:{size:3,pts:20,pat:2},owl:{size:1,pts:25,pat:6},fam:{size:5,pts:40,pat:6}};

  /* ---------- 근무(스테이지) 데이터 ----------
     spawns:[시각, 출발층, 도착층, 종류]  층 0 = 로비(L)  cars:{type:'n'|'ex'(급행: L·짝수층)|'mt'(점검 예정), at, maintAt} */
  var SHIFTS=[
    {nf:6,cars:[{at:0}],pat:40,quota:3,rush:'down',
      spawns:[[0,3,0],[0,5,0],[0,4,0]],
      tip:{ko:'엘리베이터를 눌러 층을 보내요',en:'Tap a lift, then a floor'}},
    {nf:7,cars:[{at:0}],pat:36,quota:5,rush:'down',
      spawns:[[0,6,0],[0,4,0],[0,2,0],[3,0,5],[6,3,0],[9,0,6]],
      tip:{ko:'여러 층을 차례로 눌러 경로를 만들어요',en:'Tap several floors to queue a route'}},
    {nf:8,cars:[{at:0},{at:7}],pat:32,quota:7,rush:'mixed',
      spawns:[[0,7,0],[0,6,0],[0,0,5],[0,0,6],[1,1,4],[3,5,0],[4,0,7],[6,4,1],[8,2,7]],
      tip:{ko:'두 대에 일을 나눠 주세요',en:'Split the work between two lifts'}},
    {nf:8,cars:[{at:6},{at:0}],pat:30,quota:10,rush:'up',
      spawns:[[0,0,5,'ele'],[0,0,3],[0,0,6],[0,0,7],[.5,0,4],[1,7,0],[1.5,5,0],[2,0,2],[3,0,6],[4,7,0],[5,6,0],[6,0,5],[7,3,0],[8,0,7]],
      tip:{ko:'코끼리는 세 자리를 차지해요 (정원 6)',en:'The elephant takes 3 of 6 seats'}},
    {nf:9,cars:[{at:8},{at:4}],pat:28,quota:9,rush:'down',
      spawns:[[0,8,0],[0,7,0],[0,5,0],[0,3,0],[1,6,0],[2,2,0],[3,8,0],[4,4,0],[5,7,0],[7,1,0],[8,6,0]],
      tip:{ko:'출근 시간! 모두 로비로 내려가요',en:'Morning rush: everyone heads to the lobby'}},
    {nf:9,cars:[{at:0},{at:8}],pat:28,quota:9,rush:'mixed',
      spawns:[[0,1,6],[0,3,8],[0,5,7],[0,8,2],[0,6,1],[0,4,0],[2,0,4],[3,7,3],[4,2,5],[6,0,8],[7,5,1]],
      tip:{ko:'한 방향으로 쭉 훑으면 매끈 보너스!',en:'Sweep one way for a Smooth ride bonus'}},
    {nf:9,cars:[{at:0},{at:5}],pat:27,quota:9,rush:'mixed',
      spawns:[[0,6,0,'owl'],[0,0,4],[0,0,7],[1,3,8],[2,8,0],[3,5,0],[4,0,2],[5,7,1],[6,2,6],[8,4,0],[9,0,5]],
      tip:{ko:'졸린 부엉이는 혼자 타야 해요',en:'The sleepy owl must ride alone'}},
    {nf:10,cars:[{at:0},{at:0,type:'ex'},{at:6}],pat:26,quota:13,rush:'up',
      spawns:[[0,0,8],[0,0,6],[0,0,4],[0,0,9],[.5,0,5],[1,0,8],[2,0,3],[3,0,6],[4,7,0],[5,0,7],[5,0,4],[6,9,0],[7,0,2],[8,4,0],[9,0,6],[10,8,0]],
      tip:{ko:'급행(EX)은 로비와 짝수층만 서요',en:'Express (EX) stops at L and even floors only'}},
    {nf:10,cars:[{at:0},{at:5},{at:9}],pat:26,quota:11,rush:'mixed',
      spawns:[[0,0,8,'fam'],[0,9,0],[0,7,2],[0,0,5],[1,4,9],[2,6,0],[3,0,7],[4,8,3],[5,2,0],[6,0,6],[7,5,9],[8,9,1],[9,3,0]],
      tip:{ko:'다섯 식구는 거의 빈 칸이 필요해요',en:'The family of five needs a nearly empty car'}},
    {nf:10,cars:[{at:0},{at:0},{at:0,type:'mt',maintAt:10}],pat:25,quota:14,rush:'up',
      spawns:[[0,0,9],[0,0,7],[0,0,5],[0,0,3],[0,0,8],[.5,9,1],[1,0,6],[1.5,7,0],[2,0,4,'ele'],[3,0,9],[4,0,2],[5,0,7],[6,8,0],[7,0,5],[8,0,6],[9,6,0],[10,0,8],[11,0,3],[12,9,0]],
      tip:{ko:'저녁 귀가! C호기는 곧 점검이에요',en:'Evening rush! Lift C is due for maintenance'}}
  ];

  function rng(seed){var s=(seed>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}

  /* ---------- 시뮬레이션 ---------- */
  function makeSim(def){
    var s={def:def,nf:def.nf,t:0,cars:[],fl:[],si:0,del:0,to:0,ev:[],id:1,done:false,r:rng(def.seed||7),exT:0,lastT:0};
    for(var f=0;f<def.nf;f++)s.fl.push([]);
    def.cars.forEach(function(cd,i){var at=cd.at||0;
      s.cars.push({i:i,type:cd.type||'n',pos:at,vel:0,q:[],st:'idle',door:0,tm:0,pax:[],floor:at,mdir:0,park:null,
        maintAt:cd.type==='mt'?cd.maintAt:null,pend:false,oos:false,sw:{dir:0,stops:0,del:0},moved:0})});
    s.spawns=def.spawns.slice().sort(function(a,b){return a[0]-b[0]});
    s.lastT=s.spawns.length?s.spawns[s.spawns.length-1][0]:0;
    return s}
  function allowed(c,f){return c.type!=='ex'||f%2===0}
  function used(c){var u=0;for(var i=0;i<c.pax.length;i++)u+=c.pax[i].size;return u}
  function hasOwl(c){return c.pax.length>0&&c.pax[0].kind==='owl'}
  function dirAfter(c){for(var i=0;i<c.q.length;i++)if(c.q[i]!==c.floor)return c.q[i]>c.floor?1:-1;return 0}
  function canBoard(c,r,d){
    if(c.oos||c.pend||!allowed(c,r.to))return false;
    if(d!==0&&(r.to>c.floor?1:-1)!==d)return false;
    if(hasOwl(c)||(r.kind==='owl'&&c.pax.length))return false;
    return used(c)+r.size<=CAP}
  function wantsHere(s,c){var W=s.fl[c.floor],d=dirAfter(c);for(var i=0;i<W.length;i++)if(canBoard(c,W[i],d))return true;return false}
  function addRes(s,from,to,kind){kind=kind||'n';var k=KINDS[kind],pat=(s.def.pat||24)+k.pat;
    var r={id:s.id++,kind:kind,from:from,to:to,size:k.size,max:pat,p:pat,sp:Math.floor(s.r()*8)};
    s.fl[from].push(r);s.ev.push({t:'spawn',r:r,f:from});return r}
  function extra(s){ /* 정해진 손님이 다 나온 뒤에도 계속 손님이 온다(막힌 판 방지) */
    var nf=s.nf,r=s.r,rush=s.def.rush,from,to,tries=0;
    do{if(rush==='down'&&r()<.8){from=1+Math.floor(r()*(nf-1));to=0}
      else if(rush==='up'&&r()<.8){from=0;to=1+Math.floor(r()*(nf-1))}
      else{from=Math.floor(r()*nf);to=Math.floor(r()*(nf-1));if(to>=from)to++}
      tries++}while(s.fl[from].length>=4&&tries<6);
    if(s.fl[from].length<5)addRes(s,from,to,'n')}
  function stopFloor(c,nf){
    var bd=c.vel*c.vel/(2*ACC*1.6),f;
    if(c.vel>.05)f=Math.ceil(c.pos+bd-.001);else if(c.vel<-.05)f=Math.floor(c.pos-bd+.001);else f=Math.round(c.pos);
    f=Math.max(0,Math.min(nf-1,f));var dir=c.vel<0?-1:1,n=0;
    while(!allowed(c,f)&&n<30){f+=dir;if(f<0||f>nf-1){dir=-dir;f+=2*dir}n++}
    return f}
  function endSweep(s,c){if(c.sw.stops>=3&&c.sw.del>=2)s.ev.push({t:'smooth',c:c.i,n:c.sw.del,stops:c.sw.stops});c.sw={dir:0,stops:0,del:0}}
  function board(s,c){if(c.pend||c.oos)return 0;var W=s.fl[c.floor],d=dirAfter(c),n=0;
    for(var i=0;i<W.length;i++){var r=W[i];if(canBoard(c,r,d)){W.splice(i,1);i--;c.pax.push(r);n++;s.ev.push({t:'board',r:r,c:c.i,f:c.floor})}}
    return n}
  function exchange(s,c){var n=0,i,r;
    for(i=c.pax.length-1;i>=0;i--){r=c.pax[i];if(r.to===c.floor){c.pax.splice(i,1);s.del++;c.sw.del++;n++;s.ev.push({t:'del',r:r,c:c.i,f:c.floor})}}
    if(c.pend){for(i=c.pax.length-1;i>=0;i--){r=c.pax[i];r.p=Math.max(r.p,r.max*.6);r.from=c.floor;s.fl[c.floor].unshift(r);n++;
        s.ev.push({t:'eject',r:r,c:c.i,f:c.floor})}c.pax=[]}
    else{n+=board(s,c);var W=s.fl[c.floor],d=dirAfter(c),why=null;
      for(i=0;i<W.length&&!why;i++){r=W[i];
        if(!allowed(c,r.to))why='ex';else if(d!==0&&(r.to>c.floor?1:-1)!==d)why='dir';
        else if(hasOwl(c)||(r.kind==='owl'&&c.pax.length))why='owl';else if(used(c)+r.size>CAP)why='full'}
      if(why)s.ev.push({t:'refuse',why:why,c:c.i,f:c.floor})}
    c.moved=n}
  function arrive(s,c,tg){
    c.pos=tg;c.vel=0;c.floor=tg;c.park=null;
    while(c.q.length&&c.q[0]===tg)c.q.shift();
    var md=c.mdir;if(md!==0){if(md===c.sw.dir)c.sw.stops++;else{endSweep(s,c);c.sw={dir:md,stops:1,del:0}}}
    c.st='open';s.ev.push({t:'ding',c:c.i,f:tg})}
  function updCar(s,c,dt){
    if(c.oos)return;
    if(c.maintAt!=null&&!c.pend&&s.t>=c.maintAt){c.pend=true;s.ev.push({t:'maint',c:c.i});
      if(c.st==='move'){var tg0=c.q.length?c.q[0]:c.park;c.q=[];c.park=tg0}else c.q=[];
      if(c.st==='idle')c.st='open'}
    var tg,d,vm,des,dv,lim;
    switch(c.st){
      case 'idle':
        if(c.q.length&&c.q[0]===c.floor){c.q.shift();c.st='open';s.ev.push({t:'ding',c:c.i,f:c.floor})}
        else if(wantsHere(s,c)){c.st='open';s.ev.push({t:'ding',c:c.i,f:c.floor})}
        else if(c.q.length){c.st='move';c.mdir=c.q[0]>c.floor?1:-1}
        break;
      case 'move':
        if(c.q.length){tg=c.q[0];c.park=null}else{if(c.park==null)c.park=stopFloor(c,s.nf);tg=c.park}
        d=tg-c.pos;vm=c.type==='ex'?VEX:VMAX;des=(d>0?1:-1)*Math.min(vm,Math.sqrt(2*ACC*Math.abs(d)));
        dv=des-c.vel;lim=ACC*1.6*dt;c.vel+=dv>lim?lim:dv<-lim?-lim:dv;
        c.pos+=c.vel*dt;if(Math.abs(c.vel)>.2)c.mdir=c.vel>0?1:-1;
        if(Math.abs(tg-c.pos)<.02&&Math.abs(c.vel)<.8)arrive(s,c,tg);
        break;
      case 'open':
        c.door=Math.min(1,c.door+dt/DOOR);
        if(c.door>=1){exchange(s,c);c.st='dwell';c.tm=DWELL+PER*c.moved}
        break;
      case 'dwell':
        var nb=board(s,c);if(nb)c.tm=Math.max(c.tm,.3+PER*nb);
        c.tm-=dt;if(c.tm<=0)c.st='close';
        break;
      case 'close':
        if(!c.pend&&wantsHere(s,c)){c.st='open';break}
        c.door=Math.max(0,c.door-dt/DOOR);
        if(c.door<=0){
          if(c.pend){c.oos=true;c.st='idle';c.q=[];s.ev.push({t:'oos',c:c.i});break}
          while(c.q.length&&c.q[0]===c.floor)c.q.shift();
          if(c.q.length){c.st='move';c.mdir=c.q[0]>c.floor?1:-1}else{endSweep(s,c);c.st='idle'}}
        break}}
  function step(s,dt){
    s.t+=dt;var i,f,W,r;
    while(s.si<s.spawns.length&&s.spawns[s.si][0]<=s.t){var sp=s.spawns[s.si++];addRes(s,sp[1],sp[2],sp[3])}
    if(s.si>=s.spawns.length&&s.t>s.lastT+2){s.exT+=dt;if(s.exT>=(s.def.exGap||3.4)){s.exT=0;extra(s)}}
    for(f=0;f<s.nf;f++){W=s.fl[f];for(i=W.length-1;i>=0;i--){r=W[i];r.p-=dt;if(r.p<=0){W.splice(i,1);s.to++;s.ev.push({t:'out',r:r,f:f})}}}
    for(i=0;i<s.cars.length;i++)updCar(s,s.cars[i],dt);
    if(!s.done&&s.del>=s.def.quota){s.done=true;s.ev.push({t:'done'})}}

  /* 플레이어 조작: 정차 목록 토글. 반환 'add'|'del'|'no'|'ex'|'oos'|'full' */
  function toggleStop(s,k,f){var c=s.cars[k];if(!c)return 'no';
    if(c.oos||c.pend)return 'oos';
    var i=c.q.lastIndexOf(f);if(i>=0){c.q.splice(i,1);return 'del'}
    if(!allowed(c,f))return 'ex';
    if(c.q.length>=8)return 'full';
    if(c.q.length===0&&c.st!=='move'&&c.floor===f&&c.st!=='idle'){c.tm+=.4;return 'no'}
    c.q.push(f);return 'add'}
  function moveStop(s,k,from,to){var c=s.cars[k];if(!c||from<0||from>=c.q.length)return;var v=c.q.splice(from,1)[0];
    to=Math.max(0,Math.min(c.q.length,to));c.q.splice(to,0,v)}

  /* ---------- 배차 봇: 가장 가까운 칸에 호출을 배정하고 SCAN(한 방향 훑기) 순서로 정렬 ---------- */
  function couldServe(c,r){return allowed(c,r.to)&&allowed(c,r.from)&&!hasOwl(c)&&(r.kind!=='owl'||c.pax.length===0)&&used(c)+r.size<=CAP}
  /* LOOK: 진행 방향으로 목적층과 같은 방향 호출을 훑고, 가장 먼 요청에서 돌아선다 */
  function scanOrder(c,D,P){
    var moving=c.st==='move',p=moving?c.pos:c.floor,md=moving?(c.vel>.05?1:c.vel<-.05?-1:c.mdir):c.mdir,out=[],leg,f;
    function ahead(x){return md>0?x>p+1e-6:x<p-1e-6}
    if(!md){var nu=0,nd=0;for(f in D){if(+f>p)nu++;else nd++}for(f in P){if(+f>p)nu++;else nd++}md=nu>=nd?1:-1}
    for(leg=0;leg<4;leg++){var pick=[],far=null,k;
      for(k in D){k=+k;if(ahead(k)){pick.push(k);if(far==null||(k-far)*md>0)far=k}}
      for(k in P){k=+k;if(ahead(k)){if(P[k][md])pick.push(k);if(far==null||(k-far)*md>0)far=k}}
      if(far==null){md=-md;continue}
      if(pick.indexOf(far)<0)pick.push(far);
      pick=pick.filter(function(v,i){return pick.indexOf(v)===i}).sort(function(a,b){return (a-b)*md});
      pick.forEach(function(v){out.push(v);delete D[v];if(P[v]){delete P[v][md];if(v===far)delete P[v][-md];if(!P[v][1]&&!P[v][-1])delete P[v]}});
      p=far;md=-md}
    return out}
  function botPlan(s){
    var cars=s.cars.filter(function(c){return !c.oos&&!c.pend}),asg=cars.map(function(){return {}}),f,k;
    for(f=0;f<s.nf;f++){var W=s.fl[f];if(!W.length)continue;var best=-1,bc=1e9;
      for(k=0;k<cars.length;k++){var c=cars[k],ok=false,j;
        for(j=0;j<W.length;j++)if(couldServe(c,W[j])){ok=true;break}
        if(!ok)continue;
        var p=c.st==='move'?c.pos:c.floor,cost=Math.abs(p-f)/(c.type==='ex'?VEX:VMAX)+c.q.length*.7+used(c)*.25,
            md=c.st==='move'?(c.vel>0?1:-1):0;
        if(md&&(f-p)*md<-.3)cost+=2.5;
        if(cost<bc){bc=cost;best=k}}
      if(best>=0){var dirs=asg[best][f]={};for(j=0;j<W.length;j++)if(couldServe(cars[best],W[j]))dirs[W[j].to>f?1:-1]=1}}
    cars.forEach(function(c,k){var D={},P={},i,ff;
      for(i=0;i<c.pax.length;i++)D[c.pax[i].to]=1;
      for(ff in asg[k])P[ff]=asg[k][ff];
      if(c.st!=='move'){delete D[c.floor];delete P[c.floor]}
      c.q=scanOrder(c,D,P)})}
  /* 순진한 봇: 한 칸만, 먼저 온 손님부터 한 명씩 */
  function naivePlan(s){var c=s.cars[0];if(c.oos||c.pend)return;var best=null,tgt=null,i,f;
    for(i=0;i<c.pax.length;i++)if(!best||c.pax[i].id<best.id){best=c.pax[i];tgt=best.to}
    for(f=0;f<s.nf;f++)for(i=0;i<s.fl[f].length;i++){var r=s.fl[f][i];if(!best||r.id<best.id){best=r;tgt=f}}
    c.q=tgt==null||(tgt===c.floor&&c.st!=='move'&&c.st!=='idle')?[]:[tgt]}
  function runBot(def,kind,budget){var s=makeSim(def),acc=0,plan=kind==='naive'?naivePlan:botPlan,smooth=0;
    while(s.t<budget&&!s.done){if(acc<=0){plan(s);acc=.2}step(s,STEP);acc-=STEP;
      for(var i=0;i<s.ev.length;i++)if(s.ev[i].t==='smooth')smooth++;s.ev.length=0}
    return {done:s.done,t:+s.t.toFixed(2),to:s.to,del:s.del,smooth:smooth}}

  /* ---------- 절차 생성 근무 (봇으로 검증) ---------- */
  function budgetOf(def){return 12+def.quota*1.6}
  function genRaw(n,seed){
    var r=rng(seed*2654435761+n*97),lvl=n-SHIFTS.length,nf=9+Math.floor(r()*2),nc=lvl<2?2:(r()<.65?3:2),cars=[],i;
    for(i=0;i<nc;i++)cars.push({at:Math.floor(r()*nf)});
    if(nc===3&&r()<.5){cars[1].type='ex';cars[1].at=2*Math.floor(cars[1].at/2)}
    if(nc>=2&&r()<.4){var mk=nc-1;cars[mk].type='mt';cars[mk].maintAt=7+Math.floor(r()*9)}
    var pats=['down','up','mixed','mixed'],rush=pats[Math.floor(r()*4)],cnt=Math.min(17,9+Math.floor(lvl/2)),spawns=[];
    for(i=0;i<cnt;i++){var t=i<cnt*.4?r()*1.5:1.5+r()*(8+Math.min(8,lvl*.5)),from,to;
      if(rush==='down'&&r()<.85){from=1+Math.floor(r()*(nf-1));to=0}
      else if(rush==='up'&&r()<.85){from=0;to=1+Math.floor(r()*(nf-1))}
      else{from=Math.floor(r()*nf);to=Math.floor(r()*(nf-1));if(to>=from)to++}
      spawns.push([+t.toFixed(2),from,to,'n'])}
    var sp=[];if(r()<.4)sp.push('ele');if(r()<.3)sp.push('owl');if(nc===3&&r()<.3)sp.push('fam');
    sp.forEach(function(k,j){spawns[(j*3+1)%cnt][3]=k});
    var quota=cnt-1-(lvl>8?1:0);
    return {nf:nf,cars:cars,pat:Math.round(24-Math.min(4,lvl*.3)),quota:quota,rush:rush,spawns:spawns,seed:seed*13+n,exGap:3.2,gen:true}}
  function genShift(n,seed){var def,res,i;
    for(i=0;i<40;i++){def=genRaw(n,seed+i*1009);res=runBot(def,'scan',budgetOf(def));
      if(res.done&&res.to<=2){def.botT=res.t;return def}}
    return def}
  function getShift(n,seed){if(n<SHIFTS.length){var d=JSON.parse(JSON.stringify(SHIFTS[n]));d.seed=n*31+5;return d}return genShift(n,seed)}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={SHIFTS:SHIFTS,makeSim:makeSim,step:step,toggleStop:toggleStop,moveStop:moveStop,botPlan:botPlan,naivePlan:naivePlan,
      runBot:runBot,genRaw:genRaw,genShift:genShift,getShift:getShift,budgetOf:budgetOf,STEP:STEP,CAP:CAP};
  if(typeof SG==='undefined')return;

  /* ---------- 게임 ---------- */
  var W=360,H=640,BOT=594,FTOP=114,RIB=601;
  var CC=['#ff7b6b','#36b3a3','#9b7be0'],CD=['#b9473b','#1f7a6e','#6648a8'];
  var SP=[{b:'#f4e8d8',d:'#c7ad92',e:'long'},{b:'#b98256',d:'#7d5234',e:'round'},{b:'#f4a65c',d:'#b8692a',e:'tri'},
          {b:'#f7b9c3',d:'#cf7f8e',e:'pig'},{b:'#8fd06c',d:'#4e9a3c',e:'frog'},{b:'#ffd75a',d:'#d39d1c',e:'duck'},
          {b:'#fbf7f0',d:'#bdb3a6',e:'sheep'},{b:'#a9abbd',d:'#696b80',e:'coon'}];
  var WALL=['#f3d6a4','#efc4a2','#e7d0ac','#f1c8b8','#e3d5a2','#ecd0bf'];
  var sim,def,LY,shiftN,phase,phT,time,sel,cur,kbOn,prevDown,drag,vis,walkers,combo,streak,acc,runSeed,tG=0,warned,
      mood,moodT,initAt=0,gainT,lastBonus,stars,clouds,flash;
  var keyQ=[],ptr={n:0};
  if(!window.__liftBossKeys){window.__liftBossKeys=true;
    window.addEventListener('pointerdown',function(e){if(e.target&&e.target.tagName==='CANVAS')ptr.n++},true);
    window.addEventListener('keydown',function(e){var c=e.code;
      if(/^(Digit|Numpad)[1-3]$/.test(c)||c==='ArrowUp'||c==='ArrowDown'||c==='ArrowLeft'||c==='ArrowRight'||c==='Space'||c==='KeyW'||c==='KeyS'||c==='KeyA'||c==='KeyD'){
        if(!e.repeat||c==='ArrowUp'||c==='ArrowDown'||c==='KeyW'||c==='KeyS')keyQ.push({c:c,t:performance.now()})}})}

  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function layout(d){var nf=d.nf,fh=Math.min(62,(BOT-FTOP)/nf),n=d.cars.length,SW=n===1?50:n===2?44:40,gap=6,sx=[],k;
    for(k=0;k<n;k++)sx.push(346-(n-k)*SW-(n-1-k)*gap);
    return {nf:nf,fh:fh,top:BOT-nf*fh,SW:SW,sx:sx,hallR:sx[0]-5,n:n}}
  function fy(f){return BOT-(f+1)*LY.fh}
  function lab(f){return f===0?'L':''+f}
  function loadShift(n){shiftN=n;def=getShift(n,runSeed);sim=makeSim(def);LY=layout(def);phase='intro';phT=0;
    sel=0;cur=0;drag=null;vis={};walkers=[];acc=0;flash=0}

  function init(a){
    time=50;combo=0;streak=0;prevDown=true;ptr.n=0;kbOn=false;warned=0;mood=0;moodT=0;gainT=0;lastBonus=0;keyQ.length=0;
    initAt=performance.now();runSeed=Math.floor(Math.random()*1e6);
    stars=[];for(var i=0;i<40;i++)stars.push({x:hash(i+3)*W,y:hash(i+50)*300,p:hash(i+90)*6.28,r:.6+hash(i+7)*1.1});
    clouds=[];for(i=0;i<4;i++)clouds.push({x:hash(i+11)*W,y:60+hash(i+21)*220,s:.6+hash(i+31)*.6,v:4+hash(i+41)*6});
    loadShift(0);a.tempo(1)}

  function say(ko,en,a){return a.lang==='ko'?ko:en}
  function buzz(a){a.beep(140,.12,'square');a.beep(110,.14,'square')}
  function select(k,a){if(k<0||k>=LY.n)return;sel=k;var c=sim.cars[k];
    if(c.oos){buzz(a);a.pop(LY.sx[k]+LY.SW/2,fy(c.pos)-6,say('점검 중','Closed',a),'#ffd23f')}else a.beep(760+k*90,.05,'triangle')}
  function toggle(k,f,a){var r=toggleStop(sim,k,f),c=sim.cars[k],x=LY.sx[k]+LY.SW/2,y=fy(f)+LY.fh/2;
    if(r==='add'){a.beep(520+f*45,.07,'triangle');a.burst(x,y,CC[k],4)}
    else if(r==='del')a.beep(330,.07,'sine');
    else if(r==='ex'){buzz(a);a.pop(x,y,say('급행: L·짝수층만','EX: L & even only',a),'#ffd23f')}
    else if(r==='oos'){buzz(a);a.pop(x,y,say('점검 중','Closed',a),'#ffd23f')}
    else if(r==='full')buzz(a);
    else a.beep(600,.04,'sine')}
  function shaftAt(x){for(var k=0;k<LY.n;k++)if(x>=LY.sx[k]-3&&x<=LY.sx[k]+LY.SW+3)return k;return -1}
  function chipX(i){return 52+i*33}
  function press(x,y,a){
    if(phase!=='play')return;
    if(y>=RIB-2){if(x<44){select((sel+1)%LY.n,a);return}
      var q=sim.cars[sel].q,i=Math.floor((x-chipX(0)+2)/33);
      if(i>=0&&i<q.length&&x<chipX(i)+31)drag={i:i,x0:x,x:x,moved:false};return}
    var k=shaftAt(x);
    if(y<LY.top&&y>LY.top-34&&k>=0){select(k,a);return}
    if(y<LY.top||y>BOT)return;
    var f=Math.max(0,Math.min(LY.nf-1,Math.floor((BOT-y)/LY.fh)));
    if(k>=0){var c=sim.cars[k],cy=fy(c.pos);
      if(y>=cy-2&&y<=cy+LY.fh+2&&sel!==k){select(k,a);return}
      if(sel!==k)select(k,a);toggle(k,f,a);return}
    toggle(sel,f,a)}

  function addTime(v){time=Math.max(0,Math.min(70,time+v));if(v>0)gainT=1}
  function handleEvents(a){var ko=a.lang==='ko',i,e,r,k,x,y;
    for(i=0;i<sim.ev.length;i++){e=sim.ev[i];r=e.r;k=e.c;
      x=k!=null?LY.sx[k]+LY.SW/2:0;y=e.f!=null?fy(e.f)+LY.fh-8:0;
      if(e.t==='spawn'){vis[r.id]={x:108,y:fy(e.f)+LY.fh-3,f:e.f,walk:0,born:tG}}
      else if(e.t==='board'){var v=vis[r.id];walkers.push({r:r,x:v?v.x:LY.hallR-10,y:fy(e.f)+LY.fh-3,tx:x,mode:'in',t:0});delete vis[r.id];
        a.beep(880+Math.random()*200,.04,'triangle')}
      else if(e.t==='del'){streak++;var mult=1+Math.min(streak-1,10)*.1,pts=Math.round(KINDS[r.kind].pts*mult);a.add(pts);addTime(1);
        walkers.push({r:r,x:x-6,y:fy(e.f)+LY.fh-3,tx:110,mode:'out',t:0});
        a.sfx('coin');a.burst(x-14,y-10,'#ff8fb1',7);a.pop(x-24,y-16,'+'+pts,'#ff8a3d');mood=1;moodT=1}
      else if(e.t==='out'){var v2=vis[r.id];walkers.push({r:r,x:v2?v2.x:LY.hallR-10,y:fy(e.f)+LY.fh-3,tx:96,mode:'stomp',t:0});delete vis[r.id];
        streak=0;combo=0;addTime(-3);a.sfx('hit');a.shake(4);a.burst(v2?v2.x:200,fy(e.f)+LY.fh-24,'#c9c9d6',9);
        a.pop(v2?v2.x:200,fy(e.f)+LY.fh-30,ko?'흥! -3초':'Hmph! -3s','#ff6b5b');mood=2;moodT=1.2}
      else if(e.t==='eject'){vis[r.id]={x:x-10,y:fy(e.f)+LY.fh-3,f:e.f,walk:0,born:tG}}
      else if(e.t==='smooth'){combo++;var b=e.n*5*combo;a.add(b);addTime(2);a.sfx('win');
        a.burst(x,y-20,'#ffd23f',14);a.burst(x,y-20,'#fff3b0',8);
        a.pop(Math.min(290,Math.max(80,x-40)),y-36,(ko?'매끈하게! ':'Smooth ride! ')+(combo>1?'x'+combo+' ':'')+'+'+b,'#ff4f9a');mood=3;moodT=1.2}
      else if(e.t==='refuse'){var msg={dir:say('반대 방향이에요','Wrong way!',a),full:say('자리가 없어요','No room!',a),owl:say('혼자 탈래요','Owl rides alone',a),ex:say('급행은 안 서요','EX skips it',a)}[e.why];
        a.pop(Math.max(150,LY.hallR-50),fy(e.f)+LY.fh*.45,msg,'#e8483a');a.beep(260,.09,'triangle')}
      else if(e.t==='ding'){a.beep(1568,.14,'sine');a.beep(1175,.22,'sine')}
      else if(e.t==='maint'){a.beep(440,.1,'square');a.beep(330,.16,'square');
        a.pop(Math.min(300,x),fy(sim.cars[k].pos)-8,ko?'점검 들어가요!':'Going offline!','#ffd23f')}
      else if(e.t==='oos'){a.shake(3);a.beep(196,.25,'sawtooth')}
      else if(e.t==='done'){phase='clear';phT=0;var cb=30+10*(shiftN+1);lastBonus=cb;a.add(cb);addTime(14);a.sfx('win');
        a.beep(1568,.3,'sine');a.beep(2093,.45,'sine');
        ['#ffd23f','#ff7b6b','#36b3a3','#9b7be0','#8be28b'].forEach(function(c,j){a.burst(70+j*55,300+(j%2)*60,c,10)});
        a.tempo(1+Math.min(.5,(shiftN+1)*.04));mood=3;moodT=1.6}}
    sim.ev.length=0}

  function update(dt,inp,a){
    var fresh=(inp.tap&&ptr.n>0)||(inp.down&&!prevDown),i;ptr.n=0;
    if(fresh&&inp.x!=null){kbOn=false;press(inp.x,inp.y,a)}
    if(drag){if(inp.down&&inp.x!=null){drag.x=inp.x;if(Math.abs(inp.x-drag.x0)>7)drag.moved=true}
      if(!inp.down){var q=sim.cars[sel].q;
        if(drag.moved){var to=Math.round((drag.x-16-chipX(0))/33);moveStop(sim,sel,drag.i,to);a.beep(660,.05,'triangle')}
        else if(drag.i<q.length){toggleStop(sim,sel,q[drag.i]);a.beep(330,.07,'sine')}
        drag=null}}
    prevDown=inp.down;
    while(keyQ.length){var kq=keyQ.shift();if(kq.t<initAt+40||phase!=='play')continue;var c=kq.c;kbOn=true;
      if(/[1-3]$/.test(c)&&/^(Digit|Numpad)/.test(c))select(+c.slice(-1)-1,a);
      else if(c==='ArrowUp'||c==='KeyW'){cur=Math.min(LY.nf-1,cur+1);a.beep(500+cur*30,.03,'sine')}
      else if(c==='ArrowDown'||c==='KeyS'){cur=Math.max(0,cur-1);a.beep(500+cur*30,.03,'sine')}
      else if(c==='ArrowLeft'||c==='KeyA')select((sel+LY.n-1)%LY.n,a);
      else if(c==='ArrowRight'||c==='KeyD')select((sel+1)%LY.n,a);
      else if(c==='Space')toggle(sel,cur,a)}
    if(moodT>0){moodT-=dt;if(moodT<=0)mood=0}
    if(gainT>0)gainT-=dt*1.5;
    phT+=dt;
    if(phase==='intro'){if(phT>1.1){phase='play';phT=0}}
    else if(phase==='clear'){if(phT>1.6)loadShift(shiftN+1)}
    if(phase==='play'){
      time-=dt;if(time<=0){time=0;a.over();return}
      if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(880,.05,'square')}
      acc+=dt;var n=0;while(acc>=STEP&&n<6){step(sim,STEP);acc-=STEP;n++;handleEvents(a);if(phase!=='play')break}if(n>=6)acc=0}
    /* 걷는 연출 */
    for(i=walkers.length-1;i>=0;i--){var w=walkers[i];w.t+=dt;var sp=w.mode==='stomp'?110:w.mode==='in'?120:70,dx=w.tx-w.x;
      w.x+=Math.max(-sp*dt,Math.min(sp*dt,dx));if((Math.abs(dx)<2&&w.mode==='in')||w.t>2.2)walkers.splice(i,1)}}

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function font(s){return s+'px Jua, system-ui, sans-serif'}
  function blinkOn(id,t){return ((t*.37+hash(id)*7)%3.3)<.12}

  function face(g,x,y,m,id,t,happy,s){ /* m: 1 calm .. 0 furious */
    var ang=m<.25,imp=m<.55,bl=blinkOn(id,t);g.strokeStyle='#3a2620';g.fillStyle='#3a2620';g.lineWidth=1.3*s;g.lineCap='round';
    if(happy){g.beginPath();g.arc(x-2.7*s,y+.5*s,1.6*s,3.5,5.9);g.stroke();g.beginPath();g.arc(x+2.7*s,y+.5*s,1.6*s,3.5,5.9);g.stroke()}
    else if(bl){g.beginPath();g.moveTo(x-4*s,y);g.lineTo(x-1.6*s,y);g.moveTo(x+1.6*s,y);g.lineTo(x+4*s,y);g.stroke()}
    else{g.beginPath();g.arc(x-2.7*s,y,1.25*s,0,7);g.arc(x+2.7*s,y,1.25*s,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(x-2.4*s,y-.5*s,.45*s,0,7);g.arc(x+3*s,y-.5*s,.45*s,0,7);g.fill();g.fillStyle='#3a2620'}
    if(ang&&!happy){g.beginPath();g.moveTo(x-4.4*s,y-3.2*s);g.lineTo(x-1.4*s,y-2*s);g.moveTo(x+4.4*s,y-3.2*s);g.lineTo(x+1.4*s,y-2*s);g.stroke()}
    g.beginPath();
    if(happy){g.fillStyle='#c2413b';g.arc(x,y+2.6*s,1.9*s,0,3.14);g.fill()}
    else if(ang){g.arc(x,y+4.2*s,1.8*s,3.5,5.9);g.stroke()}
    else if(imp){g.moveTo(x-1.6*s,y+3*s);g.lineTo(x+1.6*s,y+3*s);g.stroke()}
    else{g.arc(x,y+2*s,1.6*s,.3,2.84);g.stroke()}
    g.fillStyle=ang?'rgba(255,70,60,.55)':'rgba(255,120,130,.45)';g.beginPath();g.arc(x-4.6*s,y+2*s,1.5*s,0,7);g.arc(x+4.6*s,y+2*s,1.5*s,0,7);g.fill()}

  function critter(g,x,y,r,m,t,sc,happy,walk){
    var ang=m<.25,imp=m<.55&&!ang,id=r.id,tap=imp&&Math.sin(t*15+id)>0;
    g.save();g.translate(x+(ang&&!happy?Math.sin(t*45+id)*.8:0),y);g.scale(sc,sc);
    var bob=walk?-Math.abs(Math.sin(t*12+id))*2:0;
    g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(0,0,r.kind==='fam'?22:r.kind==='ele'?12:8,2.4,0,0,7);g.fill();
    g.translate(0,bob);
    if(r.kind==='ele'){
      g.fillStyle='#9aa3b5';g.beginPath();g.ellipse(-1,-8,11,8,0,0,7);g.fill();
      g.fillStyle='#7d8699';g.fillRect(-9,-3,4,3);g.fillRect(4,-3-(tap?2:0),4,3);
      g.fillStyle='#8790a4';g.beginPath();g.ellipse(-8,-19,6,7,-.3,0,7);g.ellipse(10,-19,6,7,.3,0,7);g.fill();
      g.fillStyle='#f0b3c0';g.beginPath();g.ellipse(-8,-19,3.4,4.4,-.3,0,7);g.ellipse(10,-19,3.4,4.4,.3,0,7);g.fill();
      g.fillStyle='#a9b1c2';g.beginPath();g.arc(1,-19,8.5,0,7);g.fill();
      g.strokeStyle='#a9b1c2';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(1,-15);g.quadraticCurveTo(2,-7,6+Math.sin(t*3+id)*1.5,-6);g.stroke();
      face(g,1,-21,m,id,t,happy,1)}
    else if(r.kind==='owl'){
      g.fillStyle='#9c6b45';g.beginPath();g.ellipse(0,-10,8.5,10,0,0,7);g.fill();
      g.fillStyle='#e9cfa6';g.beginPath();g.ellipse(0,-7,5.5,6.5,0,0,7);g.fill();
      g.fillStyle='#7a4f30';g.beginPath();g.moveTo(-7,-17);g.lineTo(-6,-23);g.lineTo(-3,-18);g.moveTo(7,-17);g.lineTo(6,-23);g.lineTo(3,-18);g.fill();
      g.fillStyle='#5b6fd6';g.beginPath();g.moveTo(-6,-18);g.quadraticCurveTo(2,-30,9,-26);g.lineTo(5,-18);g.closePath();g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(9.5,-26,2,0,7);g.fill();
      g.strokeStyle='#3a2620';g.lineWidth=1.3;g.lineCap='round';
      if(ang&&!happy){g.fillStyle='#ffe066';g.beginPath();g.arc(-3,-13,2.6,0,7);g.arc(3,-13,2.6,0,7);g.fill();g.fillStyle='#3a2620';g.beginPath();g.arc(-3,-13,1,0,7);g.arc(3,-13,1,0,7);g.fill()}
      else{g.beginPath();g.arc(-3,-14,2,.3,2.8);g.stroke();g.beginPath();g.arc(3,-14,2,.3,2.8);g.stroke()}
      g.fillStyle='#f2a93b';g.beginPath();g.moveTo(-1.3,-11.5);g.lineTo(1.3,-11.5);g.lineTo(0,-9);g.fill();
      if(!ang){g.fillStyle='rgba(255,255,255,.85)';g.font=font(7);g.textAlign='center';var zp=(t*.6+hash(id))%1;g.globalAlpha=1-zp;g.fillText('z',8+zp*5,-24-zp*8);g.globalAlpha=1}}
    else if(r.kind==='fam'){
      var P=[[-15,1],[-7,.7],[0,.62],[7,.7],[15,1]];
      for(var j=0;j<5;j++){var px=P[j][0],ps=P[j][1],hop=walk||happy?-Math.abs(Math.sin(t*12+j))*2:0;
        g.save();g.translate(px,hop);g.scale(ps,ps);
        g.fillStyle='#8a5a3b';g.beginPath();for(var q=0;q<9;q++){var aa=Math.PI+q*Math.PI/8,rr2=q%2?7:9.5;g.lineTo(Math.cos(aa)*rr2-1,-7+Math.sin(aa)*rr2)}g.closePath();g.fill();
        g.fillStyle='#f1d6b0';g.beginPath();g.ellipse(2,-6,5,5.5,0,0,7);g.fill();
        g.fillStyle='#3a2620';g.beginPath();g.arc(6.5,-6,1,0,7);g.fill();
        face(g,2,-7,m,id+j,t,happy,.75);g.restore()}}
    else{
      var S=SP[r.sp%8];
      g.fillStyle=S.d;g.beginPath();g.ellipse(-3,-1,2.6,1.6,0,0,7);g.ellipse(3,-1-(tap?2:0),2.6,1.6,0,0,7);g.fill();
      g.fillStyle=S.b;g.beginPath();g.ellipse(0,-6.5,6.5,6,0,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(0,-5.5,3.6,3.6,0,0,7);g.fill();
      var hy=-15.5;
      if(S.e==='long'){g.fillStyle=S.b;g.beginPath();g.ellipse(-3,hy-9,2.2,6,-.15,0,7);g.ellipse(3,hy-9,2.2,6,.15+(imp?Math.sin(t*6)*.15:0),0,7);g.fill();
        g.fillStyle='#f3b4c0';g.beginPath();g.ellipse(-3,hy-9,1,4,-.15,0,7);g.ellipse(3,hy-9,1,4,.15,0,7);g.fill()}
      else if(S.e==='round'||S.e==='coon'){g.fillStyle=S.d;g.beginPath();g.arc(-5.5,hy-5,2.8,0,7);g.arc(5.5,hy-5,2.8,0,7);g.fill()}
      else if(S.e==='tri'){g.fillStyle=S.b;g.beginPath();g.moveTo(-7,hy-2);g.lineTo(-5,hy-10);g.lineTo(-1,hy-5);g.moveTo(7,hy-2);g.lineTo(5,hy-10);g.lineTo(1,hy-5);g.fill()}
      else if(S.e==='pig'){g.fillStyle=S.d;g.beginPath();g.moveTo(-6,hy-4);g.lineTo(-6,hy-9);g.lineTo(-2,hy-6);g.moveTo(6,hy-4);g.lineTo(6,hy-9);g.lineTo(2,hy-6);g.fill()}
      else if(S.e==='frog'){g.fillStyle=S.b;g.beginPath();g.arc(-3.5,hy-6,3,0,7);g.arc(3.5,hy-6,3,0,7);g.fill()}
      if(S.e==='sheep'){g.fillStyle='#fffdf8';for(var u=0;u<7;u++){g.beginPath();g.arc(Math.cos(u*.9+2.6)*6.5,hy-1+Math.sin(u*.9+2.6)*6.5,3,0,7);g.fill()}}
      g.fillStyle=S.b;g.beginPath();g.arc(0,hy,7.3,0,7);g.fill();
      if(S.e==='sheep'){g.fillStyle='#fffdf8';g.beginPath();g.arc(-3,hy-6,3,0,7);g.arc(2,hy-7,3.2,0,7);g.arc(5,hy-5,2.6,0,7);g.fill()}
      if(S.e==='coon'){g.fillStyle='#4b4d5e';g.beginPath();g.ellipse(-3,hy,3.3,2.2,0,0,7);g.ellipse(3,hy,3.3,2.2,0,0,7);g.fill()}
      face(g,0,hy,m,id,t,happy,1);
      if(S.e==='duck'){g.fillStyle='#f28c28';g.beginPath();g.ellipse(0,hy+2.6,3.4,1.6,0,0,7);g.fill()}
      if(S.e==='pig'){g.fillStyle='#e8909f';g.beginPath();g.ellipse(0,hy+2.4,2.6,1.8,0,0,7);g.fill();g.fillStyle='#a8505f';g.fillRect(-1.2,hy+2,.8,.9);g.fillRect(.5,hy+2,.8,.9)}}
    if(ang&&!happy){for(var st=0;st<2;st++){var ph=(t*1.4+st*.5+hash(id))%1;g.fillStyle='rgba(255,255,255,'+(.8*(1-ph))+')';
      g.beginPath();g.arc((st?6:-6)+Math.sin(ph*6)*2,-26-ph*12,2.5+ph*3,0,7);g.fill()}}
    g.restore()}

  function pcol(fr){return fr>.55?'#5cc76a':fr>.25?'#f2c14e':'#ef5b4b'}
  function bubble(g,x,y,r,t){var fr=Math.max(0,r.p/r.max),warn=fr<.25;
    g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.arc(x+1,y+1.5,9.5,0,7);g.fill();
    g.fillStyle='#fffaf0';g.beginPath();g.arc(x,y,9,0,7);g.fill();g.beginPath();g.arc(x-3,y+11,2,0,7);g.fill();
    g.strokeStyle='rgba(0,0,0,.12)';g.lineWidth=3;g.beginPath();g.arc(x,y,10.8,0,7);g.stroke();
    g.strokeStyle=pcol(fr);g.lineWidth=3;g.lineCap='round';if(!warn||Math.sin(t*16)>-.3){g.beginPath();g.arc(x,y,10.8,-Math.PI/2,-Math.PI/2+fr*6.283);g.stroke()}
    g.fillStyle='#3a2a24';g.font=font(12);g.textAlign='center';g.textBaseline='middle';g.fillText(lab(r.to),x,y+.5);
    var up=r.to>r.from;g.fillStyle=up?'#3fa45a':'#d0633b';g.beginPath();
    if(up){g.moveTo(x+11,y-4);g.lineTo(x+14,y);g.lineTo(x+8,y)}else{g.moveTo(x+11,y+4);g.lineTo(x+14,y);g.lineTo(x+8,y)}g.fill();
    if(r.size>1||r.kind==='owl'){g.fillStyle='#5a4a6e';g.beginPath();g.arc(x-11,y-6,5.2,0,7);g.fill();g.fillStyle='#fff';g.font=font(8);
      g.fillText(r.kind==='owl'?'1!':'x'+r.size,x-11,y-5.5)}
    g.textBaseline='alphabetic'}
  function slotW(r){var k=LY?Math.min(1.3,LY.fh/44):1;return (r.kind==='fam'?44:r.kind==='ele'?30:21)*k}

  function sky(g,t){
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#1a1c46');gr.addColorStop(.25,'#40327a');gr.addColorStop(.55,'#b0607f');gr.addColorStop(.8,'#f19a6c');gr.addColorStop(1,'#f7c27e');
    g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);var i,p;
    for(i=0;i<stars.length;i++){p=stars[i];g.fillStyle='rgba(255,250,230,'+(.35+.35*Math.sin(t*1.6+p.p))+')';g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.fill()}
    g.fillStyle='rgba(255,246,214,.95)';g.beginPath();g.arc(300,128,15,0,7);g.fill();g.fillStyle='rgba(64,50,122,.9)';g.beginPath();g.arc(307,123,13,0,7);g.fill();
    for(i=0;i<clouds.length;i++){p=clouds[i];var cx=((p.x+t*p.v)%(W+140))-70;g.fillStyle='rgba(255,190,200,.22)';
      g.beginPath();g.ellipse(cx,p.y,40*p.s,9*p.s,0,0,7);g.ellipse(cx+16*p.s,p.y-6*p.s,20*p.s,9*p.s,0,0,7);g.fill()}
    /* 먼 스카이라인 / 가까운 스카이라인 */
    for(var layer=0;layer<2;layer++){var sp=layer?9:3.5,base=layer?H:H-30,col=layer?'#3b2a52':'#5a3f6e',bw=layer?34:24,off=(t*sp)%bw;
      for(i=-1;i<W/bw+2;i++){var idx=i+Math.floor(t*sp/bw),hh=(layer?170:240)+hash(idx*3.7+layer*50)*(layer?160:200),bx=i*bw-off;
        g.fillStyle=col;g.fillRect(bx,base-hh,bw-2,hh);
        if(layer){for(var wy=base-hh+8;wy<base-10;wy+=12)for(var wx=bx+5;wx<bx+bw-8;wx+=9){var hv=hash(idx*13+wx*.7+wy*.31);
          if(hv<.25+.25*Math.sin(t*.2+hv*9)){g.fillStyle='rgba(255,214,130,.75)';g.fillRect(wx,wy,4,5)}}}}}}

  function roomScene(g,f,x,y,w,h,t){
    var th=(f*5+2)%6,s=h/52,k;
    g.fillStyle=WALL[f%6];g.fillRect(x,y,w,h);
    var lg=g.createRadialGradient(x+w*.6,y+h*.3,2,x+w*.6,y+h*.3,w*.8);lg.addColorStop(0,'rgba(255,230,160,.55)');lg.addColorStop(1,'rgba(255,200,120,0)');g.fillStyle=lg;g.fillRect(x,y,w,h);
    /* 창문: 바깥 하늘이 비친다 */
    var wx=x+5,wy=y+5*s,ww=22,wh=h*.48;
    g.fillStyle='#6b4a3a';g.fillRect(wx-2,wy-2,ww+4,wh+4);
    var sg=g.createLinearGradient(0,wy,0,wy+wh);sg.addColorStop(0,'#3a3070');sg.addColorStop(1,'#d9817a');g.fillStyle=sg;g.fillRect(wx,wy,ww,wh);
    g.fillStyle='#2c2346';for(k=0;k<4;k++){var bh=wh*(.3+hash(f*9+k)*.4),bx=wx+((k*8-t*2+f*5)%32+32)%32-6;g.fillRect(bx,wy+wh-bh,6,bh)}
    g.fillStyle='rgba(255,246,214,.9)';g.beginPath();g.arc(wx+5+f%3*5,wy+4,1,0,7);g.fill();
    g.strokeStyle='#6b4a3a';g.lineWidth=1.5;g.beginPath();g.moveTo(wx+ww/2,wy);g.lineTo(wx+ww/2,wy+wh);g.stroke();
    g.fillStyle='rgba(0,0,0,.12)';g.fillRect(x,y+h-6*s,w,6*s);
    var fl=y+h-1,bx2=x+34;
    if(th===0){ /* 소파와 화분 */
      g.fillStyle='#d0675a';rr(g,bx2,fl-15*s,36,13*s,4);g.fill();g.fillStyle='#e9877a';rr(g,bx2+2,fl-22*s,32,9*s,4);g.fill();
      g.fillStyle='#7a4a30';g.fillRect(x+w-14,fl-9*s,9,9*s);var sw=Math.sin(t*1.5+f)*2;g.fillStyle='#5aa857';
      g.beginPath();g.ellipse(x+w-12+sw,fl-16*s,4,7*s,-.4,0,7);g.ellipse(x+w-6+sw,fl-17*s,4,7*s,.4,0,7);g.fill()}
    else if(th===1){ /* 책장 위 고양이 */
      g.fillStyle='#8a5a3b';g.fillRect(bx2+4,fl-30*s,30,30*s);g.fillStyle='#6b432b';g.fillRect(bx2+6,fl-20*s,26,1.5);g.fillRect(bx2+6,fl-10*s,26,1.5);
      var bc=['#e56b5d','#5b8fd6','#f2c14e','#7cc36e','#b47be0'];for(k=0;k<8;k++){g.fillStyle=bc[k%5];g.fillRect(bx2+7+(k%4)*6,fl-(k<4?19:9)*s,4,8*s)}
      g.fillStyle='#3d3a46';g.beginPath();g.ellipse(bx2+19,fl-33*s,7,4,0,0,7);g.arc(bx2+25,fl-36*s,4,0,7);g.fill();
      g.beginPath();g.moveTo(bx2+22,fl-39*s);g.lineTo(bx2+23,fl-43*s);g.lineTo(bx2+25,fl-40*s);g.moveTo(bx2+26,fl-40*s);g.lineTo(bx2+28,fl-43*s);g.lineTo(bx2+29,fl-38*s);g.fill();
      g.strokeStyle='#3d3a46';g.lineWidth=2;g.lineCap='round';g.beginPath();g.moveTo(bx2+13,fl-32*s);g.quadraticCurveTo(bx2+8,fl-26*s+Math.sin(t*3+f)*3,bx2+10+Math.sin(t*3+f)*3,fl-21*s);g.stroke();
      g.fillStyle=blinkOn(f*7,t)?'#3d3a46':'#ffe066';g.beginPath();g.arc(bx2+24,fl-36*s,.9,0,7);g.arc(bx2+27,fl-36*s,.9,0,7);g.fill()}
    else if(th===2){ /* 부엌: 김이 나는 냄비 */
      g.fillStyle='#c9ccd6';g.fillRect(bx2,fl-16*s,40,16*s);g.fillStyle='#8d92a0';g.fillRect(bx2,fl-17*s,40,2);
      g.fillStyle='#3d3a46';g.fillRect(bx2+5,fl-11*s,12,7*s);
      g.fillStyle='#e0574b';rr(g,bx2+20,fl-25*s,15,8*s,2);g.fill();g.fillRect(bx2+18,fl-24*s,19,2);
      for(k=0;k<3;k++){var ph=(t*.8+k/3)%1;g.fillStyle='rgba(255,255,255,'+(.6*(1-ph))+')';g.beginPath();g.arc(bx2+24+k*4+Math.sin(ph*7+k)*2,fl-28*s-ph*14*s,2+ph*3,0,7);g.fill()}}
    else if(th===3){ /* 침대와 스탠드 */
      g.fillStyle='#8a5a3b';g.fillRect(bx2,fl-14*s,42,4);g.fillRect(bx2,fl-22*s,4,22*s);
      g.fillStyle='#8fb4e8';rr(g,bx2+3,fl-14*s,39,8*s,3);g.fill();g.fillStyle='#fff';rr(g,bx2+4,fl-18*s,10,5*s,2);g.fill();
      g.fillStyle='#f2c14e';g.beginPath();g.moveTo(x+w-13,fl-26*s);g.lineTo(x+w-5,fl-26*s);g.lineTo(x+w-7,fl-20*s);g.lineTo(x+w-11,fl-20*s);g.fill();
      g.fillStyle='rgba(255,230,140,'+(.25+.1*Math.sin(t*2))+')';g.beginPath();g.arc(x+w-9,fl-22*s,10,0,7);g.fill();
      g.fillStyle='#6b432b';g.fillRect(x+w-10,fl-20*s,2,20*s)}
    else if(th===4){ /* 어항 */
      g.fillStyle='#7a4a30';g.fillRect(bx2+4,fl-8*s,34,8*s);g.fillStyle='rgba(120,200,235,.7)';rr(g,bx2+5,fl-26*s,32,18*s,3);g.fill();
      var fx2=bx2+12+((t*8+f*9)%20),dir=Math.floor((t*8+f*9)/20)%2;g.fillStyle='#ff8a3d';g.beginPath();g.ellipse(dir?bx2+42-fx2+bx2-4:fx2,fl-17*s,3.5,2,0,0,7);g.fill();
      for(k=0;k<3;k++){var bp=(t*.7+k/3)%1;g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1;g.beginPath();g.arc(bx2+28+k*2,fl-10*s-bp*14*s,1.2,0,7);g.stroke()}}
    else{ /* 라디오와 음표 */
      g.fillStyle='#7a4a30';g.fillRect(bx2+2,fl-10*s,30,10*s);g.fillStyle='#e9a23b';rr(g,bx2+6,fl-21*s,22,11*s,3);g.fill();
      g.fillStyle='#7a4a30';g.beginPath();g.arc(bx2+12,fl-15.5*s,3,0,7);g.fill();g.fillRect(bx2+18,fl-18*s,7,1.5);g.fillRect(bx2+18,fl-15*s,7,1.5);
      for(k=0;k<2;k++){var np=(t*.5+k*.5)%1;g.fillStyle='rgba(90,60,110,'+(1-np)+')';g.font=font(10);g.textAlign='center';g.fillText(k?'♫':'♪',bx2+30+np*8,fl-22*s-np*14*s)}}}

  function lobbyScene(g,x,y,w,h,t){
    g.fillStyle='#ead9bf';g.fillRect(x,y,w,h);
    for(var i=0;i<12;i++){g.fillStyle=i%2?'#c9a77e':'#f3e6cf';g.fillRect(x+i*(w/12),y+h-6,w/12,6)}
    g.fillStyle='rgba(150,200,230,.6)';g.fillRect(x+3,y+h*.25,12,h*.75-6);g.strokeStyle='#8a6a3a';g.lineWidth=1.5;g.strokeRect(x+3,y+h*.25,12,h*.75-6);
    /* 경비 고양이 (마스코트) */
    var cx=x+52,cy=y+h-20,s=Math.min(1.15,h/50),bl=blinkOn(99,t),bounce=mood===3||mood===1?-Math.abs(Math.sin(t*10))*3:0;
    g.save();g.translate(cx,cy+bounce);g.scale(s,s);
    g.fillStyle='#4a4a58';g.beginPath();g.ellipse(0,-2,10,8,0,0,7);g.fill();
    g.beginPath();g.arc(0,-14,9,0,7);g.fill();
    g.beginPath();g.moveTo(-8,-18);g.lineTo(-7,-27);g.lineTo(-2,-21);g.moveTo(8,-18);g.lineTo(7,-27);g.lineTo(2,-21);g.fill();
    g.fillStyle='#fff';g.beginPath();g.ellipse(0,-10,5.5,4.5,0,0,7);g.fill();
    g.fillStyle='#4a90d9';g.fillRect(-9,-25,18,4);g.fillStyle='#2f6fb3';g.fillRect(-6,-29,12,5);g.fillStyle='#ffd23f';g.beginPath();g.arc(0,-26.5,1.5,0,7);g.fill();
    g.strokeStyle='#fff';g.fillStyle='#fff';g.lineWidth=1.6;g.lineCap='round';
    if(mood===1||mood===3){g.beginPath();g.arc(-3.5,-14,2,3.5,5.9);g.stroke();g.beginPath();g.arc(3.5,-14,2,3.5,5.9);g.stroke()}
    else if(mood===2){g.beginPath();g.moveTo(-5.5,-16.5);g.lineTo(-1.5,-14.5);g.moveTo(5.5,-16.5);g.lineTo(1.5,-14.5);g.stroke();
      g.fillStyle='#7fd0ff';g.beginPath();g.ellipse(8,-19,1.6,2.6,0,0,7);g.fill()}
    else if(bl){g.beginPath();g.moveTo(-5,-14);g.lineTo(-2,-14);g.moveTo(5,-14);g.lineTo(2,-14);g.stroke()}
    else{g.fillStyle='#ffe066';g.beginPath();g.arc(-3.5,-14,2.2,0,7);g.arc(3.5,-14,2.2,0,7);g.fill();g.fillStyle='#222';g.beginPath();g.arc(-3.3,-14,1,0,7);g.arc(3.7,-14,1,0,7);g.fill()}
    g.strokeStyle='#4a4a58';g.lineWidth=1.3;g.beginPath();
    if(mood===2)g.arc(0,-8.5,1.8,3.5,5.9);else g.arc(0,-11,1.8,.3,2.8);g.stroke();
    g.restore();
    /* 데스크 */
    g.fillStyle='#8a5a3b';rr(g,cx-20,y+h-18,40,17,3);g.fill();g.fillStyle='#a8714b';g.fillRect(cx-20,y+h-19,40,4);
    g.fillStyle='#ffd23f';g.beginPath();g.arc(cx+12,y+h-21,2.5,0,7);g.fill();
    g.fillStyle='#5aa857';var sw=Math.sin(t*1.3)*1.5;g.beginPath();g.ellipse(x+w-9+sw,y+h-18,4,8,.2,0,7);g.fill();g.fillStyle='#b36b3a';g.fillRect(x+w-13,y+h-11,8,10)}

  function drawCar(g,k,t){
    var c=sim.cars[k],SW=LY.SW,fh=LY.fh,x=LY.sx[k]+3,w=SW-6,y=fy(c.pos)+3,h=fh-5,col=CC[k],isSel=k===sel&&phase!=='intro';
    /* 케이블 */
    g.strokeStyle='rgba(30,25,35,.9)';g.lineWidth=1.4;g.beginPath();g.moveTo(x+w/2-3,LY.top);g.lineTo(x+w/2-3,y);g.moveTo(x+w/2+3,LY.top);g.lineTo(x+w/2+3,y);g.stroke();
    if(isSel){g.save();g.shadowColor=col;g.shadowBlur=14+4*Math.sin(t*6);g.fillStyle=col;rr(g,x-3,y-3,w+6,h+6,6);g.fill();g.restore()}
    g.fillStyle='rgba(0,0,0,.3)';rr(g,x+2,y+3,w,h,5);g.fill();
    var bg=g.createLinearGradient(x,0,x+w,0);bg.addColorStop(0,'#a87a2c');bg.addColorStop(.5,'#f2d58a');bg.addColorStop(1,'#a87a2c');
    g.fillStyle=c.oos?'#6d6a72':bg;rr(g,x,y,w,h,5);g.fill();
    var ix=x+3,iy=y+7,iw=w-6,ih=h-10;
    var ig=g.createLinearGradient(0,iy,0,iy+ih);ig.addColorStop(0,c.oos?'#3a3840':'#fff0c8');ig.addColorStop(1,c.oos?'#2a2830':'#f4c27a');g.fillStyle=ig;g.fillRect(ix,iy,iw,ih);
    /* 승객 */
    if(!c.oos){var slot=0,i,scl=Math.min(.62,fh/80);g.save();g.beginPath();g.rect(ix,iy,iw,ih);g.clip();
      for(i=0;i<c.pax.length;i++){var r=c.pax[i],row=slot<3?1:0,col3=slot%3,px=ix+iw*(col3+.5)/3,py=iy+ih-(row?1:9);
        if(r.size>=3){px=ix+iw/2;py=iy+ih-(slot<3?1:6)}
        critter(g,px,py,r,1,t,scl*(r.kind==='fam'?.75:1),false,false);slot+=r.size}
      g.restore()}
    /* 문 */
    var dw=iw/2*(1-c.door);
    if(dw>.5){var dg=g.createLinearGradient(ix,0,ix+iw,0);dg.addColorStop(0,c.oos?'#55525c':'#c7ccd6');dg.addColorStop(.5,c.oos?'#6d6a75':'#eef1f6');dg.addColorStop(1,c.oos?'#55525c':'#c7ccd6');
      g.fillStyle=dg;g.fillRect(ix,iy+ih*.55,dw,ih*.45);g.fillRect(ix+iw-dw,iy+ih*.55,dw,ih*.45);
      g.globalAlpha=.42;g.fillRect(ix,iy,dw,ih*.55);g.fillRect(ix+iw-dw,iy,dw,ih*.55);g.globalAlpha=1;
      g.fillStyle='rgba(255,255,255,.5)';g.fillRect(ix+2,iy+3,1.5,ih*.4);g.fillRect(ix+iw-dw+2,iy+3,1.5,ih*.4);
      g.fillStyle='rgba(0,0,0,.25)';g.fillRect(ix+dw-1,iy,1,ih);g.fillRect(ix+iw-dw,iy,1,ih);
}
    /* 머리띠: 호기 표시 */
    g.fillStyle=c.oos?'#4a4850':col;rr(g,x+2,y+1,w-4,6,2);g.fill();
    g.fillStyle='#fff';g.font=font(8);g.textAlign='center';g.textBaseline='middle';
    g.fillText(['A','B','C'][k]+(c.type==='ex'?' EX':''),x+w/2,y+4.5);g.textBaseline='alphabetic';
    g.strokeStyle='rgba(90,60,20,.8)';g.lineWidth=1;rr(g,x,y,w,h,5);g.stroke();
    if(c.oos){g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.translate(x+w/2,y+h/2);g.rotate(-.5);
      for(i=-4;i<4;i++){g.fillStyle=i%2?'#222':'#ffd23f';g.fillRect(i*8,-4,8,8)}g.restore()}
    if(c.maintAt!=null&&!c.pend&&sim.t>c.maintAt-4&&Math.sin(t*12)>0){g.fillStyle='#ffd23f';g.beginPath();g.arc(x+w/2,y-8,6,0,7);g.fill();
      g.fillStyle='#3a2a24';g.font=font(10);g.textAlign='center';g.fillText('!',x+w/2,y-4.5)}
    if(c.pax.length){var u=0;for(i=0;i<c.pax.length;i++)u+=c.pax[i].size;
      for(i=0;i<6;i++){g.fillStyle=i<u?col:'rgba(255,255,255,.35)';g.fillRect(x+3+i*(w-6)/6,y+h-3,(w-6)/6-1,2)}}}

  function draw(g,a,dt){
    dt=dt||0;tG+=dt;var t=tG,ko=a.lang==='ko',i,k,f,c;
    sky(g,t);
    if(!LY)return;
    var top=LY.top,fh=LY.fh,hallL=106,hallR=LY.hallR;
    /* 건물 외벽 */
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(14,top-14,340,BOT-top+20);
    g.fillStyle='#7c4b48';g.fillRect(8,top-16,344,BOT-top+22);
    g.fillStyle='#9a5d55';g.fillRect(4,top-22,352,8);g.fillStyle='#5e3633';g.fillRect(4,top-14,352,2);
    /* 지붕 소품 */
    if(top-50>64){g.fillStyle='#5e3633';g.fillRect(30,top-40,26,18);g.fillRect(34,top-46,18,6);g.fillStyle='#7c4b48';g.fillRect(28,top-24,30,3);
    g.strokeStyle='#5e3633';g.lineWidth=2;g.beginPath();g.moveTo(80,top-22);g.lineTo(80,top-48);g.stroke();
    g.fillStyle=Math.sin(t*3)>0?'#ff5b5b':'#7a2a2a';g.beginPath();g.arc(80,top-49,2.5,0,7);g.fill()}
    /* 층 */
    for(f=0;f<LY.nf;f++){var y=fy(f);
      if(f===0)lobbyScene(g,12,y,hallL-14,fh-3,t);else roomScene(g,f,12,y,hallL-14,fh-3,t);
      var hg=g.createLinearGradient(0,y,0,y+fh);hg.addColorStop(0,f===0?'#efe2c8':'#e2c79c');hg.addColorStop(1,f===0?'#d9c3a0':'#c9a678');
      g.fillStyle=hg;g.fillRect(hallL,y,hallR-hallL,fh-3);
      g.fillStyle=f===0?'rgba(140,100,60,.25)':'rgba(140,80,50,.28)';g.fillRect(hallL,y+fh*.62,hallR-hallL,fh*.38-3);
      g.fillStyle='rgba(255,240,200,.25)';for(i=0;i<3;i++){var lx=hallL+18+i*((hallR-hallL-20)/3);g.beginPath();g.arc(lx,y+5,3,0,3.14);g.fill()}
      if(f>0){var px=hallL+30+((f*37)%3)*16,pyy=y+fh*.18;g.fillStyle='#8a5a3b';g.fillRect(px-1,pyy-1,18,14);g.fillStyle=['#9bd3e8','#f6c26b','#b8e0a0','#f3a6b6'][f%4];g.fillRect(px+1,pyy+1,14,10);
        g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.arc(px+5+(f%3)*2,pyy+5,2,0,7);g.fill();g.fillStyle='rgba(60,40,30,.35)';g.beginPath();g.moveTo(px+1,pyy+11);g.lineTo(px+7,pyy+5);g.lineTo(px+15,pyy+11);g.fill()}
      g.fillStyle=f===0?'#b0413e':'#9a6a8a';g.fillRect(hallL+2,y+fh-6,12,2);
      /* 문틀 */
      g.fillStyle='#6b432b';g.fillRect(hallL-3,y+fh*.2,4,fh*.8-3);
      /* 층 번호판 */
      g.fillStyle='rgba(60,35,25,.8)';rr(g,hallL+4,y+4,16,13,3);g.fill();g.fillStyle='#ffe9b0';g.font=font(10);g.textAlign='center';g.fillText(lab(f),hallL+12,y+14);
      /* 키보드 커서 */
      if(kbOn&&f===cur&&phase==='play'){g.strokeStyle='rgba(255,236,120,'+(.7+.3*Math.sin(t*8))+')';g.lineWidth=2.5;rr(g,10,y+1,340,fh-4,5);g.stroke();
        g.fillStyle='#ffe066';g.beginPath();g.moveTo(4,y+fh/2-6);g.lineTo(11,y+fh/2);g.lineTo(4,y+fh/2+6);g.fill()}
      /* 호출 버튼 */
      var W0=sim.fl[f],hu=false,hd=false;for(i=0;i<W0.length;i++){if(W0[i].to>f)hu=true;else hd=true}
      g.fillStyle='#8a6a3a';rr(g,hallR-6,y+fh*.35,5,12,1.5);g.fill();
      g.fillStyle=hu?'#ffe066':'#5e4a30';g.beginPath();g.moveTo(hallR-3.5,y+fh*.35+1.5);g.lineTo(hallR-1.6,y+fh*.35+4.5);g.lineTo(hallR-5.4,y+fh*.35+4.5);g.fill();
      g.fillStyle=hd?'#ffe066':'#5e4a30';g.beginPath();g.moveTo(hallR-3.5,y+fh*.35+10.5);g.lineTo(hallR-1.6,y+fh*.35+7.5);g.lineTo(hallR-5.4,y+fh*.35+7.5);g.fill();
      /* 바닥 슬래브 */
      g.fillStyle='#5a3532';g.fillRect(8,y+fh-3,344,4);g.fillStyle='rgba(255,220,180,.18)';g.fillRect(8,y+fh-3,344,1)}
    /* 승강로 */
    for(k=0;k<LY.n;k++){var sx=LY.sx[k],SW=LY.SW;c=sim.cars[k];
      var sg2=g.createLinearGradient(sx,0,sx+SW,0);sg2.addColorStop(0,'#211c28');sg2.addColorStop(.5,'#332b3c');sg2.addColorStop(1,'#211c28');
      g.fillStyle=sg2;g.fillRect(sx,top,SW,BOT-top);
      if(k===sel&&phase!=='intro'){g.fillStyle=CC[k];g.globalAlpha=.13+.05*Math.sin(t*5);g.fillRect(sx,top,SW,BOT-top);g.globalAlpha=1}
      g.strokeStyle='rgba(120,110,130,.5)';g.lineWidth=1;g.beginPath();g.moveTo(sx+2.5,top);g.lineTo(sx+2.5,BOT);g.moveTo(sx+SW-2.5,top);g.lineTo(sx+SW-2.5,BOT);g.stroke();
      for(f=0;f<LY.nf;f++){var yy=fy(f);g.fillStyle='#b8893a';g.fillRect(sx,yy+fh-4,SW,2);
        if(c.type==='ex'&&f%2===1){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(sx+1,yy,SW-2,fh-4);g.strokeStyle='rgba(255,210,63,.35)';g.lineWidth=1.5;
          g.beginPath();g.moveTo(sx+SW/2-5,yy+fh/2-7);g.lineTo(sx+SW/2+5,yy+fh/2+3);g.moveTo(sx+SW/2+5,yy+fh/2-7);g.lineTo(sx+SW/2-5,yy+fh/2+3);g.stroke()}}
      /* 다이얼 */
      var dx=sx+SW/2,dy=top-16,dr=Math.min(SW/2-3,15);
      g.fillStyle='#b8893a';g.beginPath();g.arc(dx,dy,dr+2.5,Math.PI,0);g.closePath();g.fill();
      g.fillStyle='#2b2230';g.beginPath();g.arc(dx,dy,dr,Math.PI,0);g.closePath();g.fill();
      for(f=0;f<LY.nf;f++){var aa=Math.PI+f/(LY.nf-1)*Math.PI;g.strokeStyle=c.q.indexOf(f)>=0?CC[k]:'rgba(255,233,176,.55)';g.lineWidth=1.2;
        g.beginPath();g.moveTo(dx+Math.cos(aa)*(dr-1),dy+Math.sin(aa)*(dr-1));g.lineTo(dx+Math.cos(aa)*(dr-4),dy+Math.sin(aa)*(dr-4));g.stroke()}
      var na=Math.PI+c.pos/(LY.nf-1)*Math.PI;g.strokeStyle=c.oos?'#777':CC[k];g.lineWidth=2;g.lineCap='round';
      g.beginPath();g.moveTo(dx,dy);g.lineTo(dx+Math.cos(na)*(dr-3),dy+Math.sin(na)*(dr-3));g.stroke();
      g.fillStyle='#f2d58a';g.beginPath();g.arc(dx,dy,2.4,0,7);g.fill();
      g.fillStyle=CC[k];rr(g,dx-8,dy+1,16,10,3);g.fill();g.fillStyle='#fff';g.font=font(9);g.textAlign='center';g.fillText(['A','B','C'][k],dx,dy+9.5)}
    /* 경로 리본 + 승객 목적지 표시 */
    for(k=0;k<LY.n;k++){c=sim.cars[k];var cx=LY.sx[k]+LY.SW/2,q=c.q,py=fy(c.pos)+fh/2;
      if(q.length){g.save();g.strokeStyle=CC[k];g.lineWidth=3;g.globalAlpha=.85;g.setLineDash([6,4]);g.lineDashOffset=-t*24;g.beginPath();g.moveTo(cx,py);
        for(i=0;i<q.length;i++){var qy=fy(q[i])+fh/2,ox=(i%2?5:-5);g.lineTo(cx+ox,py);g.lineTo(cx+ox,qy);py=qy}g.stroke();g.restore();
        for(i=q.length-1;i>=0;i--){var by=fy(q[i])+fh/2,big=i===0;g.fillStyle=CD[k];g.beginPath();g.arc(cx,by,big?9:7.5,0,7);g.fill();
          g.fillStyle=CC[k];g.beginPath();g.arc(cx,by,big?7.5:6,0,7);g.fill();g.fillStyle='#fff';g.font=font(big?11:9);g.textAlign='center';g.textBaseline='middle';
          g.fillText(i+1,cx,by+.5);g.textBaseline='alphabetic'}}
      var cnt={};for(i=0;i<c.pax.length;i++)cnt[c.pax[i].to]=(cnt[c.pax[i].to]||0)+1;
      for(var ff in cnt){ff=+ff;var ty=fy(ff)+4,tx=LY.sx[k]+1,miss=q.indexOf(ff)<0;
        var bl2=miss&&Math.sin(t*8)>0;g.fillStyle=bl2?'#fff3b0':CC[k];rr(g,tx,ty,15,12,4);g.fill();
        g.fillStyle=bl2?CD[k]:'#fff';g.beginPath();g.arc(tx+4.5,ty+4.3,2,0,7);g.fill();g.beginPath();g.arc(tx+4.5,ty+10.5,3.2,3.14,0);g.fill();
        g.font=font(9);g.textAlign='center';g.fillText(cnt[ff],tx+11,ty+9.5)}}
    for(k=0;k<LY.n;k++)drawCar(g,k,t);
    /* 기다리는 주민 */
    for(f=0;f<LY.nf;f++){var Wf=sim.fl[f],xr=hallR-14,tot=0;for(i=0;i<Wf.length;i++)tot+=slotW(Wf[i]);
      var room=hallR-hallL-30,squeeze=tot>room?room/tot:1;
      for(i=0;i<Wf.length;i++){var r=Wf[i],sw3=slotW(r)*squeeze,v=vis[r.id];if(!v){v=vis[r.id]={x:108,y:fy(f)+fh-3,f:f,born:t}}
        var tx2=xr-sw3/2;var mv=tx2-v.x;v.x+=Math.max(-90*dt,Math.min(90*dt,mv));v.y=fy(f)+fh-3;xr-=sw3;
        var scl=Math.min(1.3,fh/44),m=r.p/r.max;critter(g,v.x,v.y,r,m,t,scl,false,Math.abs(mv)>1);
        bubble(g,v.x+(r.kind==='fam'?-6:0),Math.max(fy(f)+12,v.y-(r.kind==='ele'?36:r.kind==='owl'?40:32)*scl-4),r,t)}}
    for(i=0;i<walkers.length;i++){var wk=walkers[i],al=wk.mode==='in'?1:Math.max(0,1-wk.t/2.2);g.globalAlpha=al;
      critter(g,wk.x,wk.y,wk.r,wk.mode==='stomp'?0:1,t,Math.min(1.3,fh/44)*(wk.mode==='in'?.9:1),wk.mode==='out',true);
      if(wk.mode==='out'){g.fillStyle='#ff6b8b';g.font=font(12);g.textAlign='center';g.fillText('♥',wk.x+8,wk.y-30-wk.t*10)}g.globalAlpha=1}
    /* 상단 정보 */
    g.fillStyle='rgba(25,18,40,.55)';rr(g,8,34,344,28,10);g.fill();
    g.fillStyle='#fff';g.font=font(15);g.textAlign='left';g.fillText((ko?'근무 ':'Shift ')+(shiftN+1),18,53);
    var qn=def.quota,dn=Math.min(sim.del,qn),pw=Math.min(11,120/qn),px0=180-qn*pw/2;
    for(i=0;i<qn;i++){g.fillStyle=i<dn?'#ffd23f':'rgba(255,255,255,.25)';g.beginPath();g.arc(px0+i*pw+pw/2,48,Math.min(4.5,pw*.4),0,7);g.fill()}
    g.fillStyle='rgba(255,255,255,.8)';g.font=font(11);g.textAlign='left';g.fillText(dn+'/'+qn,px0+qn*pw+4,52);
    var tc=time<10?(Math.sin(t*10)>0?'#ff6b5b':'#ffd0c8'):'#fff';g.fillStyle=tc;g.font=font(16);g.textAlign='right';g.fillText(Math.ceil(time)+(ko?'초':'s'),342,53);
    g.strokeStyle=tc;g.lineWidth=1.6;g.beginPath();g.arc(296,48,6,0,7);g.stroke();g.beginPath();g.moveTo(296,48);g.lineTo(296,44);g.moveTo(296,48);g.lineTo(299,49);g.stroke();
    g.fillStyle='rgba(255,255,255,.18)';g.fillRect(14,58,332,2.5);g.fillStyle=time<10?'#ff6b5b':gainT>0?'#8be28b':'#ffd23f';g.fillRect(14,58,332*time/70,2.5);
    if(streak>1){g.fillStyle='#ff8fb1';g.font=font(12);g.textAlign='right';g.fillText('♥'+streak,px0-6,53)}
    var tip=def.tip?def.tip[a.lang]:null;
    if(!tip&&def.gen)tip=def.rush==='down'?(ko?'출근 러시':'Morning rush'):def.rush==='up'?(ko?'퇴근 러시':'Evening rush'):(ko?'바쁜 오후':'Busy afternoon');
    if(tip&&top>74){g.font=font(14);g.textAlign='center';g.fillStyle='rgba(0,0,0,.4)';g.fillText(tip,181,79);g.fillStyle='#fff3d6';g.fillText(tip,180,78)}
    /* 하단 경로 리본 */
    var c0=sim.cars[sel],q0=c0.q;
    g.fillStyle='rgba(25,18,40,.72)';rr(g,6,RIB,302,35,10);g.fill();
    g.fillStyle=CC[sel];g.beginPath();g.arc(25,RIB+17.5,13,0,7);g.fill();g.fillStyle='#fff';g.font=font(15);g.textAlign='center';g.fillText(['A','B','C'][sel],25,RIB+23);
    if(LY.n>1){g.fillStyle='rgba(255,255,255,.5)';g.font=font(8);g.fillText('▶',41,RIB+21)}
    if(!q0.length){g.fillStyle='rgba(255,255,255,.65)';g.font=font(12);g.textAlign='left';
      g.fillText(c0.oos?(ko?'점검 중이라 운행 못 해요':'Out of service'):(ko?'층을 눌러 경로를 추가해요':'Tap floors to queue stops'),50,RIB+22)}
    for(i=0;i<q0.length;i++){if(drag&&drag.moved&&drag.i===i)continue;var chx=chipX(i);
      if(i>0){g.fillStyle='rgba(255,255,255,.4)';g.font=font(9);g.textAlign='center';g.fillText('›',chx-1.5,RIB+21)}
      g.fillStyle=i===0?CC[sel]:'rgba(255,255,255,.88)';rr(g,chx,RIB+6,28,23,7);g.fill();
      g.fillStyle=i===0?'#fff':'#3a2a24';g.font=font(14);g.textAlign='center';g.fillText(lab(q0[i]),chx+14,RIB+23)}
    if(drag&&drag.moved&&drag.i<q0.length){var dxp=Math.max(40,Math.min(296,drag.x));g.fillStyle='rgba(0,0,0,.3)';rr(g,dxp-12,RIB+4,28,23,7);g.fill();
      g.fillStyle='#ffe066';rr(g,dxp-14,RIB+1,28,23,7);g.fill();g.fillStyle='#3a2a24';g.font=font(14);g.textAlign='center';g.fillText(lab(q0[drag.i]),dxp,RIB+18)}
    /* 배너 */
    if(phase==='intro'||phase==='clear'){var pt=phase==='intro'?phT/1.1:phT/1.6,al2=Math.min(1,pt*5,(1-pt)*5);g.globalAlpha=Math.max(0,al2);
      g.fillStyle='rgba(30,20,45,.82)';rr(g,40,270,280,80,16);g.fill();g.strokeStyle='#f2d58a';g.lineWidth=2;rr(g,40,270,280,80,16);g.stroke();
      g.fillStyle='#ffe9b0';g.font=font(26);g.textAlign='center';
      if(phase==='intro'){g.fillText((ko?'근무 ':'Shift ')+(shiftN+1),180,306);g.fillStyle='#fff';g.font=font(13);
        g.fillText((ko?'주민 ':'Deliver ')+def.quota+(ko?'명을 배달하세요':' residents'),180,332)}
      else{g.fillText(ko?'근무 완료!':'Shift clear!',180,306);g.fillStyle='#8be28b';g.font=font(14);g.fillText('+'+lastBonus+(ko?'점 · +14초':' pts · +14s'),180,332)}
      g.globalAlpha=1}}

  window.__liftBoss=function(){return {sim:sim,phase:phase,shift:shiftN,time:time,sel:sel,LY:LY}};
  SG.run({id:'elevator-boss',title:{ko:'엘리베이터 반장',en:'Lift Boss'},
    how:{ko:'엘리베이터를 누르고 층을 눌러 경로를 만들어요. 주민 머리 위 숫자가 목적층! 한 방향으로 쭉 훑으면 보너스.',
         en:'Tap a lift, then tap floors to queue its route. The bubble shows where each resident wants to go. Sweep one way for bonuses.'},
    init:init,update:update,draw:draw});
})();
