/* 해시계 정원 (Sundial Garden) — 해가 하루를 지나며 막대 그림자가 돈다. 꽃마다 정해진 시각에 그늘을 만들어 주는 퍼즐.
   논리(그림자 칸, 판정, 풀이기, 생성기)는 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  /* ---------- 해시계 논리 (DOM 없이 돈다) ---------- */
  var HOURS=[6,9,12,15,18];
  var DIR=[[1,0],[1,1],[0,1],[-1,1],[-1,0]];          /* 해가 왼쪽에서 떠서 오른쪽으로 진다 → 그림자는 반대쪽 */
  var SEASON={su:{L:[2,1,1,1,2],peak:.95},au:{L:[2,2,1,2,2],peak:.72},wi:{L:[3,2,2,2,3],peak:.5}};
  var HT={s:1,b:2,t:2};
  function inB(L,c,r){return c>=0&&r>=0&&c<L.w&&r<L.h}
  function shadowCells(L,c,r,h,k){var n=SEASON[L.season].L[k]*h,out=[],i,x,y;
    for(i=1;i<=n;i++){x=c+DIR[k][0]*i;y=r+DIR[k][1]*i;if(!inB(L,x,y))break;out.push([x,y])}return out}
  function casters(L,pieces){var a=[];(L.trees||[]).forEach(function(t){a.push([t[0],t[1],HT.t])});
    (pieces||[]).forEach(function(p){a.push([p[0],p[1],HT[p[2]]])});return a}
  /* hour k 에 그늘진 칸: 길이 w*h 불리언 배열 */
  function shadeMap(L,pieces,k){var m=new Array(L.w*L.h).fill(false);
    casters(L,pieces).forEach(function(o){shadowCells(L,o[0],o[1],o[2],k).forEach(function(q){m[q[1]*L.w+q[0]]=true})});return m}
  function blockedCell(L,c,r){var all=[].concat(L.fl,L.trees||[],L.rocks||[]);
    for(var i=0;i<all.length;i++)if(all[i][0]===c&&all[i][1]===r)return true;return false}
  /* 판정: 꽃마다 ok 여부, 실패 시각 */
  function judge(L,pieces){var maps=[0,1,2,3,4].map(function(k){return shadeMap(L,pieces,k)}),res=[],all=true;
    L.fl.forEach(function(f){var i=f[1]*L.w+f[0],bad=[];
      if(f[2].length)f[2].forEach(function(k){if(!maps[k][i])bad.push(k)});
      else for(var k=0;k<5;k++)if(maps[k][i])bad.push(k);
      res.push(bad);if(bad.length)all=false});
    return {ok:all,bad:res,maps:maps}}
  /* 비트마스크 풀이기: 해답 개수와 첫 해답 */
  function prep(L){var req=[],sun=[],i;
    L.fl.forEach(function(f,j){if(f[2].length)f[2].forEach(function(k){req.push([j,k])});else sun.push(j)});
    function maskOf(c,r,h){var m=0,v=0,k,j;for(k=0;k<5;k++)shadowCells(L,c,r,h,k).forEach(function(q){
        for(j=0;j<req.length;j++){var f=L.fl[req[j][0]];if(req[j][1]===k&&f[0]===q[0]&&f[1]===q[1])m|=1<<j}
        for(j=0;j<sun.length;j++){var s=L.fl[sun[j]];if(s[0]===q[0]&&s[1]===q[1])v|=1<<j}});return [m,v]}
    var bm=0,bv=0;(L.trees||[]).forEach(function(t){var q=maskOf(t[0],t[1],HT.t);bm|=q[0];bv|=q[1]});
    var free=[];for(var r=0;r<L.h;r++)for(var c=0;c<L.w;c++)if(!blockedCell(L,c,r))free.push([c,r,maskOf(c,r,1),maskOf(c,r,2)]);
    return {full:(1<<req.length)-1,bm:bm,bv:bv,free:free,nreq:req.length,nsun:sun.length}}
  function solve(L,cap){var P=prep(L),n=0,total=0,first=null,all=[],cur=[];cap=cap||1e9;
    (function rec(i,s,b,m,v){
      if(n>=cap)return;
      if(i===P.free.length||(s===0&&b===0)){total++;if(m===P.full&&v===0){n++;if(all.length<50)all.push(cur.slice())}return}
      var f=P.free[i];
      rec(i+1,s,b,m,v);
      if(s>0){cur.push([f[0],f[1],'s']);rec(i+1,s-1,b,m|f[2][0],v|f[2][1]);cur.pop()}
      if(b>0){cur.push([f[0],f[1],'b']);rec(i+1,s,b-1,m|f[3][0],v|f[3][1]);cur.pop()}
    })(0,L.s||0,L.b||0,P.bm,P.bv);
    return {count:n,total:total,first:all[0]||null,all:all}}

  /* ---------- 손으로 만든 10단계 ---------- */
  /* fl:[c,r,[시각 번호]] 빈 배열 = 해바라기(하루 종일 볕) */
  var LEVELS=[
    {season:'su',w:5,h:5,s:1,b:0,fl:[[2,3,[2]]],tip:{ko:'막대를 꽃 위에 놓으면 12시에 그늘이 져요',en:'Plant a stick to shade the flower at 12'}},
    {season:'su',w:5,h:5,s:1,b:0,fl:[[3,3,[1]],[1,3,[3]]],tip:{ko:'막대 하나로 두 꽃을!',en:'One stick, two flowers!'}},
    {season:'su',w:5,h:5,s:0,b:1,fl:[[2,4,[2]],[0,2,[4]]],tip:{ko:'큰 막대는 그림자가 두 배',en:'Tall sticks cast double shadows'}},
    {season:'su',w:5,h:5,s:1,b:0,fl:[[3,2,[0]],[3,3,[]],[4,2,[]]],tip:{ko:'해바라기는 그늘이 싫어요',en:'Sunflowers hate shade'}},
    {season:'su',w:5,h:6,s:1,b:1,fl:[[2,1,[0]],[1,2,[1]],[3,2,[3]],[0,3,[]]],rocks:[[2,0]],tip:{ko:'아침·저녁 그림자는 길어요',en:'Morning and evening shadows are long'}},
    {season:'su',w:6,h:6,s:2,b:0,fl:[[4,2,[0]],[1,3,[1]],[4,3,[]],[5,2,[]],[5,4,[0]]],trees:[[3,4]],rocks:[[2,5]],tip:{ko:'나무 그림자도 그늘이에요',en:'Trees cast shade too'}},
    {season:'au',w:6,h:6,s:1,b:1,fl:[[2,3,[0]],[3,5,[1]],[3,3,[3]],[4,3,[]],[3,2,[]]],rocks:[[1,2],[2,2]],tip:{ko:'가을 해는 낮아서 그림자가 길어요',en:'The autumn sun is lower: longer shadows'}},
    {season:'wi',w:6,h:6,s:2,b:0,fl:[[1,4,[2]],[3,5,[1]],[2,5,[0]],[4,4,[]],[4,5,[]]],rocks:[[5,1],[1,0]],tip:{ko:'겨울엔 그림자가 아주 길어요',en:'Winter shadows stretch far'}},
    {season:'su',w:6,h:6,s:1,b:1,fl:[[2,3,[0,4]],[0,4,[2]],[5,4,[1]],[0,5,[]],[3,2,[]]],trees:[[4,4]],rocks:[[1,5]],tip:{ko:'시계가 둘이면 두 번 다 그늘!',en:'Two clocks: shade at both times!'}},
    {season:'wi',w:6,h:6,s:2,b:1,fl:[[5,3,[2]],[3,4,[3]],[4,5,[0,2]],[0,5,[4]],[5,1,[0]],[4,0,[]],[5,0,[]],[5,5,[]]],trees:[[3,2]],rocks:[[5,4],[1,3]],tip:{ko:'정원 완성!',en:'The full garden!'}}
  ];

  /* ---------- 생성기: 해답부터 만들고 풀이기로 검증 ---------- */
  function rng32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function pieceMasks(L,pieces){var P=prep(L);return pieces.map(function(p){var f=P.free.filter(function(q){return q[0]===p[0]&&q[1]===p[1]})[0];return f?(p[2]==='s'?f[2]:f[3]):[0,0]})}
  function popc(x){var n=0;while(x){n+=x&1;x>>>=1}return n}
  function genTry(R,o){
    var L={season:o.season,w:o.w,h:o.h,s:0,b:0,fl:[],trees:[],rocks:[]},used={},i,k,c,r;
    function key(c,r){return c+','+r}
    function freeCell(edge){for(var t=0;t<60;t++){var c=Math.floor(R()*L.w),r=Math.floor(R()*L.h);
        if(edge&&(c===0||r===0||c===L.w-1||r===L.h-1))continue;if(!used[key(c,r)]){used[key(c,r)]=1;return [c,r]}}return null}
    for(i=0;i<o.trees;i++){var t=freeCell(true);if(t)L.trees.push(t)}
    for(i=0;i<o.rocks;i++){var q=freeCell();if(q)L.rocks.push(q)}
    var sol=[];for(i=0;i<o.s+o.b;i++){var p=freeCell();if(!p)return null;sol.push([p[0],p[1],i<o.s?'s':'b'])}
    var tm=[0,1,2,3,4].map(function(k){return shadeMap(L,[],k)});
    /* 각 막대가 그늘을 드리우는 칸 후보 → 꽃 */
    sol.forEach(function(p,pi){var own=[0,1,2,3,4].map(function(k){return shadeMap({season:L.season,w:L.w,h:L.h,trees:[]},[p],k)}),cand=[];
      for(k=0;k<5;k++)for(var j=0;j<L.w*L.h;j++)if(own[k][j]&&!tm[k][j]&&!used[key(j%L.w,Math.floor(j/L.w))])cand.push([j%L.w,Math.floor(j/L.w),k]);
      var want=pi<o.share?2:1;
      for(var w=0;w<want&&cand.length;w++){var ci=Math.floor(R()*cand.length),cc=cand[ci];
        cand=cand.filter(function(z){return !(z[0]===cc[0]&&z[1]===cc[1])&&z[2]!==cc[2]});
        used[key(cc[0],cc[1])]=1;L.fl.push([cc[0],cc[1],[cc[2]]])}});
    /* 두 시각을 원하는 꽃 */
    var full=[0,1,2,3,4].map(function(k){return shadeMap(L,sol,k)});
    if(o.multi)L.fl.forEach(function(f){if(R()<o.multi){var opts=[];for(k=0;k<5;k++)if(k!==f[2][0]&&full[k][f[1]*L.w+f[0]]&&!tm[k][f[1]*L.w+f[0]])opts.push(k);
      if(opts.length){f[2].push(opts[Math.floor(R()*opts.length)]);f[2].sort()}}});
    /* 해바라기: 해답에서 하루 종일 볕이 드는, 꽃 근처 칸 */
    var sc=[];for(r=0;r<L.h;r++)for(c=0;c<L.w;c++){if(used[key(c,r)])continue;var lit=true;for(k=0;k<5;k++)if(full[k][r*L.w+c])lit=false;
      if(!lit)continue;var near=L.fl.some(function(f){return Math.max(Math.abs(f[0]-c),Math.abs(f[1]-r))<=1});if(near)sc.push([c,r])}
    for(i=0;i<o.sun&&sc.length;i++){var si=Math.floor(R()*sc.length),sp=sc.splice(si,1)[0];used[key(sp[0],sp[1])]=1;L.fl.push([sp[0],sp[1],[]])}
    L.s=o.s;L.b=o.b;L._sol=sol;return L}
  function accept(L,o){
    if(!L||L.fl.filter(function(f){return f[2].length}).length<2)return false;
    var r=solve(L,o.maxSol+1);if(r.count<1||r.count>o.maxSol)return false;
    /* 막대가 하나라도 남으면 안 됨: 하나 줄여서 풀리면 탈락 */
    if(L.s>0&&solve({season:L.season,w:L.w,h:L.h,s:L.s-1,b:L.b,fl:L.fl,trees:L.trees,rocks:L.rocks},1).count)return false;
    if(L.b>0&&solve({season:L.season,w:L.w,h:L.h,s:L.s,b:L.b-1,fl:L.fl,trees:L.trees,rocks:L.rocks},1).count)return false;
    /* 해바라기는 장식이 아니라 제약이어야 한다: 빼면 해답이 늘어나야 함 */
    if(L.fl.some(function(f){return !f[2].length})&&solve({season:L.season,w:L.w,h:L.h,s:L.s,b:L.b,fl:L.fl.filter(function(f){return f[2].length}),trees:L.trees,rocks:L.rocks},r.count+1).count<=r.count)return false;
    /* 꽃 바로 위에 막대를 하나씩 꽂는 뻔한 배치는 실패해야 한다 */
    if(judge(L,naiveAbove(L)).ok)return false;
    /* 막대 하나가 꽃 둘 이상을 맡는 해답만 */
    if(o.share&&!r.all.every(function(s){return pieceMasks(L,s).some(function(m){return popc(m[0])>=2})}))return false;
    return true}
  function naiveAbove(L){var left={s:L.s||0,b:L.b||0},pc=[];
    L.fl.forEach(function(f){if(!f[2].length)return;var c=f[0],r=f[1]-1,t;if(r<0||blockedCell(L,c,r))return;
      for(var i=0;i<pc.length;i++)if(pc[i][0]===c&&pc[i][1]===r)return;t=left.s?'s':(left.b?'b':null);if(t){left[t]--;pc.push([c,r,t])}});return pc}
  var SEAS=['su','au','wi'];
  function genOpts(n){var d=Math.min(1,(n-10)/30);
    return {season:SEAS[n%3],w:6,h:6,s:1+(n%2),b:n%3===0?1:(d>.5?1:0),trees:n%4===1?1:(n%5===2?2:0),rocks:1+(n%3),sun:1+Math.floor(d*2+(n%2)),share:1,multi:.15+.25*d,maxSol:d>.6?2:4}}
  function genLevel(n){var o=genOpts(n),R=rng32(n*7919+13),L,t;
    for(t=0;t<400;t++){L=genTry(R,o);if(accept(L,o)){L.n=n;L.gen=true;delete L._sol;return L}}
    o.share=0;o.maxSol=12;for(t=0;t<400;t++){L=genTry(R,o);if(accept(L,o)){L.n=n;L.gen=true;delete L._sol;return L}}
    var b=LEVELS[n%LEVELS.length];return JSON.parse(JSON.stringify(b))}
  function getLevel(n){return n<LEVELS.length?LEVELS[n]:genLevel(n)}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={LEVELS:LEVELS,HOURS:HOURS,DIR:DIR,SEASON:SEASON,shadowCells:shadowCells,shadeMap:shadeMap,judge:judge,solve:solve,
      genLevel:genLevel,genOpts:genOpts,getLevel:getLevel,blockedCell:blockedCell,pieceMasks:pieceMasks,popc:popc};
  if(typeof SG==='undefined')return;

  /* ---------- 게임 ---------- */
  var W=360,H=640,BT=144,BH=312,TRAY=472,RUN={x:112,y:530,w:176,h:42};
  var HC=['#ff7f9e','#ff9d3a','#f2c22e','#f08a3c','#a77cf0'];   /* 시각별 색 */
  var SNAME={su:{ko:'여름',en:'Summer'},au:{ko:'가을',en:'Autumn'},wi:{ko:'겨울',en:'Winter'}};
  var lvN,L,CS,BX,BY,pieces,left,mode,modeT,time,tries,tG=0,prevK,showT,dayT,bell,bellT,marks,held,prevDown,downX,downY,
      kbOn,kc,kr,sel,lastGain,cat,clouds,floaters,shadeCv=null,warned,banner,flowerFx,kq=[];
  if(!window.__sundialKeys){window.__sundialKeys=true;
    window.addEventListener('keydown',function(e){if(e.repeat&&!/Arrow|Key[WASD]/.test(e.code))return;kq.push(e.code)});
    window.addEventListener('blur',function(){kq.length=0});
    /* 누른 순간의 좌표를 따로 기억한다(누르자마자 끌어도 시작 칸을 놓치지 않게) */
    window.addEventListener('pointerdown',function(e){var cv=document.querySelector('#stage canvas');if(!cv||e.target!==cv)return;
      var r=cv.getBoundingClientRect();window.__sundialDown=[(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H]},true)}

  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function cxy(c,r){return [BX+c*CS+CS/2,BY+r*CS+CS/2]}
  function pieceAt(c,r){for(var i=0;i<pieces.length;i++)if(pieces[i][0]===c&&pieces[i][1]===r)return i;return -1}
  function canPlace(c,r){return inB(L,c,r)&&!blockedCell(L,c,r)&&pieceAt(c,r)<0}
  function cellAt(x,y){if(x==null)return null;var c=Math.floor((x-BX)/CS),r=Math.floor((y-BY)/CS);return inB(L,c,r)?[c,r]:null}
  function sunXY(t){var u=(t-6)/12,ry=88*SEASON[L.season].peak;return [180-150*Math.cos(Math.PI*u),132-ry*Math.sin(Math.PI*u)]}
  function chipXY(k){return sunXY(HOURS[k])}

  function load(n){lvN=n;L=getLevel(n);CS=Math.min(56,Math.floor(BH/Math.max(L.w,L.h)));BX=(W-L.w*CS)/2;BY=BT+(BH-L.h*CS)/2;
    pieces=[];left={s:L.s||0,b:L.b||0};sel=left.s?'s':'b';mode='plan';modeT=0;tries=0;held=null;marks=null;
    prevK=L.fl[0][2].length?L.fl[0][2][0]:2;showT=HOURS[prevK];kc=Math.floor(L.w/2);kr=Math.max(0,Math.floor(L.h/2)-1);
    flowerFx=L.fl.map(function(){return {bloom:0,wilt:0,ok:0}});
    banner={t:0,txt:null};banner.txt=(lvN+1)+(SNAME[L.season]?'':'')}

  function init(a){time=45;lastGain=0;warned=0;prevDown=true;kbOn=false;kq.length=0;
    cat={blink:0,mood:'idle',moodT:0,jump:0};
    clouds=[];for(var i=0;i<4;i++)clouds.push({x:hash(i+1)*W,y:50+hash(i+9)*60,s:.5+hash(i+5)*.5,v:4+hash(i+3)*6});
    floaters=[];for(i=0;i<14;i++)floaters.push({x:hash(i+20)*W,y:hash(i+40)*H,p:hash(i+60)*6.28,v:8+hash(i+80)*12,s:hash(i+70)});
    load(0);a.tempo(1)}

  function place(c,r,type){if(!canPlace(c,r)||left[type]<=0)return false;pieces.push([c,r,type]);left[type]--;return true}
  function lift(i){var p=pieces.splice(i,1)[0];left[p[2]]++;return p}
  function fx(a,kind,x,y){if(kind==='place'){a.beep(520,.06,'triangle');a.beep(780,.05,'sine');a.burst(x,y+4,'#c9a36b',6)}
    else if(kind==='lift'){a.beep(420,.05,'triangle')}
    else if(kind==='no'){a.beep(160,.09,'square')}}

  function startDay(a){if(mode!=='plan')return;held=null;mode='day';modeT=0;dayT=6;bell=0;bellT=0;tries++;
    marks=L.fl.map(function(){return [0,0,0,0,0]});cat.mood='watch';a.sfx('jump')}

  var PENT=[523,587,659,784,880,1047,1175,1319];
  function ringBell(a,k){var J=judge(L,pieces),m=J.maps[k],ok=0,bad=0;
    a.beep(1568,.18,'sine');a.beep(2093,.12,'triangle');
    L.fl.forEach(function(f,i){var sh=m[f[1]*L.w+f[0]],p=cxy(f[0],f[1]);
      if(f[2].length){if(f[2].indexOf(k)<0)return;
        if(sh){marks[i][k]=1;ok++;flowerFx[i].ok=1;a.burst(p[0],p[1]-12,HC[k],7)}
        else{marks[i][k]=-1;bad++;a.pop(p[0],p[1]-26,'✗','#e0533f')}}
      else if(sh){marks[i][k]=-1;bad++;a.pop(p[0],p[1]-26,'✗','#e0533f')}});
    if(ok)setTimeout(function(){a.beep(PENT[(k*2)%8],.12,'triangle');a.beep(PENT[(k*2+2)%8],.16,'triangle')},90);
    if(bad)setTimeout(function(){a.beep(196,.18,'sawtooth')},90)}

  function endDay(a){var J=judge(L,pieces),ko=a.lang==='ko';modeT=0;
    if(J.ok){mode='bloom';var pts=10+Math.min(lvN,20)+(tries===1?10:0);a.add(pts);time=Math.min(60,time+15);lastGain=1;
      a.sfx('win');cat.mood='happy';cat.moodT=2;cat.jump=1;
      L.fl.forEach(function(f,i){var p=cxy(f[0],f[1]);flowerFx[i].bloom=.001;
        setTimeout(function(){a.burst(p[0],p[1]-12,f[2].length?'#9fb6ff':'#ffd84a',10);a.burst(p[0],p[1]-12,'#ffffff',4)},i*90)});
      var cx=BX+L.w*CS/2,cy=BY+L.h*CS/2;a.pop(cx,cy,'+'+pts,'#ff8a3d');
      if(tries===1)a.pop(cx,cy-26,ko?'한 번에!':'First try!','#7a5cff');
      a.tempo(1+Math.min(.45,(lvN+1)*.03))}
    else{mode='wilt';a.sfx('hit');a.shake(5);cat.mood='sad';cat.moodT=1.6;var fk=-1;
      L.fl.forEach(function(f,i){if(J.bad[i].length){flowerFx[i].wilt=.001;if(fk<0)fk=J.bad[i][0];var p=cxy(f[0],f[1]);
        a.burst(p[0],p[1]-8,'#a08a6a',5)}});
      if(fk>=0)prevK=fk;
      var bf=L.fl.filter(function(f,i){return J.bad[i].length})[0];
      if(bf){var q=cxy(bf[0],bf[1]);a.pop(Math.max(80,Math.min(280,q[0])),q[1]-40,bf[2].length?(ko?'그늘이 필요해':'Need shade'):(ko?'볕이 필요해':'Need sun'),'#e0533f')}}}

  function update(dt,inp,a){var i,c,ko=a.lang==='ko';
    if(mode!=='bloom'){time-=dt;if(time<=0){time=0;a.over();return}
      if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(880,.05,'square')}}
    if(lastGain>0)lastGain-=dt;
    if(inp.down)kbOn=false;
    var fresh=inp.down&&!prevDown,rel=!inp.down&&prevDown;
    /* 키보드 */
    while(kq.length){var k=kq.shift();
      if(/^(Arrow|Key[WASD]|Space|Enter|KeyQ|KeyE|KeyX|Backspace|KeyZ|Digit|Tab|KeyR)/.test(k))kbOn=true;else continue;
      if(mode!=='plan')continue;
      if(k==='ArrowLeft'||k==='KeyA')kc=Math.max(0,kc-1);else if(k==='ArrowRight'||k==='KeyD')kc=Math.min(L.w-1,kc+1);
      else if(k==='ArrowUp'||k==='KeyW')kr=Math.max(0,kr-1);else if(k==='ArrowDown'||k==='KeyS')kr=Math.min(L.h-1,kr+1);
      else if(k==='Space'||k==='KeyZ'){var pi=pieceAt(kc,kr),p0=cxy(kc,kr);
        if(pi>=0){var old=lift(pi);var nt=old[2]==='s'&&left.b>0?'b':null;if(nt&&place(kc,kr,nt)){fx(a,'place',p0[0],p0[1])}else fx(a,'lift')}
        else if(canPlace(kc,kr)){var t0=left[sel]>0?sel:(left.s>0?'s':(left.b>0?'b':null));
          if(t0&&place(kc,kr,t0))fx(a,'place',p0[0],p0[1]);else fx(a,'no')}
        else fx(a,'no')}
      else if(k==='KeyX'||k==='Backspace'){var pj=pieceAt(kc,kr);if(pj>=0){lift(pj);fx(a,'lift')}}
      else if(k==='Enter')startDay(a);
      else if(k==='KeyQ'){prevK=(prevK+4)%5;a.beep(700,.04,'sine')}
      else if(k==='KeyE'||k==='Tab'){prevK=(prevK+1)%5;a.beep(700,.04,'sine')}
      else if(/^Digit[1-5]$/.test(k)){prevK=+k.slice(5)-1;a.beep(700,.04,'sine')}}
    /* 포인터 */
    if(mode==='plan'){
      if(fresh&&inp.x!=null){var dp=window.__sundialDown||[inp.x,inp.y];window.__sundialDown=null;downX=dp[0];downY=dp[1];var x=dp[0],y=dp[1],hit=false;
        for(i=0;i<5;i++){var q=chipXY(i);if(Math.hypot(x-q[0],y-q[1])<17){prevK=i;a.beep(700,.04,'sine');hit=true}}
        if(!hit&&x>RUN.x-6&&x<RUN.x+RUN.w+6&&y>RUN.y-4&&y<RUN.y+RUN.h+6){startDay(a);hit=true}
        if(!hit){var cards=trayCards();cards.forEach(function(cd){if(x>cd.x&&x<cd.x+cd.w&&y>TRAY&&y<TRAY+46){hit=true;sel=cd.t;
            if(left[cd.t]>0){held={t:cd.t,from:null};a.beep(600,.04,'triangle')}else fx(a,'no')}})}
        if(!hit){c=cellAt(x,y);if(c){var pk=pieceAt(c[0],c[1]);
          if(pk>=0){var lp=lift(pk);held={t:lp[2],from:c,fresh:false};fx(a,'lift')}
          else if(canPlace(c[0],c[1])){var tt=left[sel]>0?sel:(left.s>0?'s':(left.b>0?'b':null));
            if(tt){place(c[0],c[1],tt);var pp=cxy(c[0],c[1]);fx(a,'place',pp[0],pp[1]);held={t:tt,from:c,fresh:true};lift(pieces.length-1)}else fx(a,'no')}
          else fx(a,'no')}}}
      if(rel&&held){var cc=cellAt(inp.x,inp.y),moved=Math.hypot((inp.x||0)-downX,(inp.y||0)-downY);
        if(held.from&&!held.fresh&&moved<10&&cc&&cc[0]===held.from[0]&&cc[1]===held.from[1]){/* 탭 = 회수 */}
        else if(cc&&canPlace(cc[0],cc[1])&&place(cc[0],cc[1],held.t)){var p2=cxy(cc[0],cc[1]);if(!held.fresh||moved>=10)fx(a,'place',p2[0],p2[1])}
        else if(held.fresh&&held.from&&place(held.from[0],held.from[1],held.t)){}
        else if(cc)fx(a,'no');
        held=null}
    }else held=null;
    /* 해 움직임 */
    if(mode==='plan'||mode==='wilt'){showT+=(HOURS[prevK]-showT)*Math.min(1,dt*7)}
    if(mode==='day'){modeT+=dt;
      if(bellT>0){bellT-=dt}
      else{dayT+=dt*(inp.down?7:4.2);
        if(bell<5&&dayT>=HOURS[bell]){dayT=HOURS[bell];ringBell(a,bell);bell++;bellT=.4}
        else if(bell>=5&&dayT>=18.4){endDay(a)}}
      showT=Math.min(18,dayT)}
    else if(mode==='bloom'){modeT+=dt;showT=Math.min(18,showT+dt*.2);if(modeT>2){load(lvN+1);banner.t=1.2}}
    else if(mode==='wilt'){modeT+=dt;if(modeT>1.5){mode='plan';marks=null;flowerFx.forEach(function(f){f.wilt=0;f.ok=0})}}
    flowerFx.forEach(function(f){if(f.bloom>0)f.bloom=Math.min(1,f.bloom+dt*2.5);if(f.wilt>0)f.wilt=Math.min(1,f.wilt+dt*3)});
    /* 고양이 */
    cat.blink-=dt;if(cat.blink<-.14)cat.blink=2+Math.random()*2.5;
    if(cat.moodT>0){cat.moodT-=dt;if(cat.moodT<=0)cat.mood='idle'}
    if(mode==='plan'&&cat.mood==='watch')cat.mood='idle';
    cat.jump=Math.max(0,cat.jump-dt*1.2);
    if(banner.t>0)banner.t-=dt;
    prevDown=inp.down}

  function trayCards(){var ts=[];if(L.s)ts.push('s');if(L.b)ts.push('b');var w=96,gap=14,tot=ts.length*w+(ts.length-1)*gap,x0=200-tot/2;
    return ts.map(function(t,i){return {t:t,x:x0+i*(w+gap),w:w}})}

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function lerpC(a,b,t){var pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16),r=Math.round((pa>>16)*(1-t)+(pb>>16)*t),
      gg=Math.round((pa>>8&255)*(1-t)+(pb>>8&255)*t),bb=Math.round((pa&255)*(1-t)+(pb&255)*t);return 'rgb('+r+','+gg+','+bb+')'}
  /* 연속적인 그림자: 정각에는 칸 중심에 정확히 닿는다 */
  function shadowVec(t,h){var p=Math.max(0,Math.min(4,(t-6)/3)),k0=Math.min(3,Math.floor(p)),f=p-k0,s=f*f*(3-2*f),
      Ls=SEASON[L.season].L,l0=Ls[k0]*h*(k0%2?1.4142:1),l1=Ls[k0+1]*h*((k0+1)%2?1.4142:1),len=(l0+(l1-l0)*s)*CS,th=Math.PI*(t-6)/12;
    return [Math.cos(th)*len,Math.sin(th)*len]}
  function castShadow(s,x,y,v,wb,wt){var l=Math.hypot(v[0],v[1]);if(l<1)return;var nx=-v[1]/l,ny=v[0]/l;
    s.beginPath();s.moveTo(x+nx*wb,y+ny*wb);s.lineTo(x+v[0]+nx*wt,y+v[1]+ny*wt);
    s.arc(x+v[0],y+v[1],wt,Math.atan2(ny,nx),Math.atan2(ny,nx)+Math.PI,true);s.lineTo(x-nx*wb,y-ny*wb);s.closePath();s.fill();
    s.beginPath();s.arc(x,y,wb,0,7);s.fill()}

  function drawStick(g,x,y,t,al,lift){var hh=t==='b'?40:22;g.save();g.globalAlpha=al;y-=lift||0;
    g.fillStyle='rgba(40,30,20,.25)';g.beginPath();g.ellipse(x,y+(lift||0)+2,7,3,0,0,7);g.fill();
    g.fillStyle='#8a5a34';rr(g,x-3.5,y-hh,7,hh+2,3);g.fill();g.fillStyle='#c98d55';rr(g,x-2,y-hh,3,hh,1.5);g.fill();
    if(t==='b'){g.fillStyle='#ef6b6b';g.beginPath();g.moveTo(x+3,y-hh+2);g.lineTo(x+16,y-hh+7);g.lineTo(x+3,y-hh+12);g.closePath();g.fill();
      g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.moveTo(x+3,y-hh+2);g.lineTo(x+16,y-hh+7);g.lineTo(x+3,y-hh+5);g.fill()}
    else{g.fillStyle='#5aa7e0';g.beginPath();g.ellipse(x+5,y-hh+6,4,2.4,.4,0,7);g.ellipse(x-5,y-hh+6,4,2.4,-.4,0,7);g.fill()}
    g.fillStyle='#ffe0a8';g.beginPath();g.arc(x,y-hh,4,0,7);g.fill();g.strokeStyle='#8a5a34';g.lineWidth=1.4;g.stroke();g.restore()}
  function drawTree(g,x,y,season,t){var sw=Math.sin(t*1.3+x)*1.5;
    g.fillStyle='rgba(40,30,20,.25)';g.beginPath();g.ellipse(x,y+3,11,4,0,0,7);g.fill();
    g.fillStyle='#7a4e2c';rr(g,x-4,y-22,8,25,3);g.fill();
    var cs=season==='au'?['#d9822b','#f0a43a','#c0602a']:season==='wi'?['#5f8f7a','#7fae96','#4c7764']:['#4e9f4a','#6cc160','#3d8a3d'];
    g.fillStyle=cs[2];g.beginPath();g.arc(x+sw,y-30,18,0,7);g.fill();g.fillStyle=cs[0];g.beginPath();g.arc(x-6+sw,y-34,13,0,7);g.arc(x+7+sw,y-33,12,0,7);g.arc(x+sw,y-42,11,0,7);g.fill();
    g.fillStyle=cs[1];g.beginPath();g.arc(x-6+sw,y-40,6,0,7);g.fill();
    if(season==='wi'){g.fillStyle='#fff';g.beginPath();g.ellipse(x+sw-2,y-50,9,4,0,0,7);g.ellipse(x+sw+9,y-41,5,3,0,0,7);g.fill()}
    if(season!=='wi'){g.fillStyle=season==='au'?'#ffe08a':'#ff8a8a';g.beginPath();g.arc(x+8+sw,y-28,2.4,0,7);g.arc(x-9+sw,y-30,2.4,0,7);g.fill()}}
  function drawPond(g,x,y,t){var s=CS*.42;g.fillStyle='#6fa0c8';g.beginPath();g.ellipse(x,y+2,s,s*.72,0,0,7);g.fill();
    g.fillStyle='#8ec0e6';g.beginPath();g.ellipse(x,y,s-3,s*.72-4,0,0,7);g.fill();
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1.3;var rp=(t*.5+hash(x))%1;g.globalAlpha=1-rp;g.beginPath();g.ellipse(x-4,y+2,4+rp*10,2+rp*5,0,0,7);g.stroke();g.globalAlpha=1;
    g.fillStyle='#5aa857';g.beginPath();g.arc(x+7,y-3,5,.5,6);g.lineTo(x+7,y-3);g.fill()}
  function face(g,x,y,mood,sc,blink){g.fillStyle='#3a2a20';g.strokeStyle='#3a2a20';g.lineWidth=1.2*sc;
    if(blink||mood==='sleep'){g.beginPath();g.moveTo(x-3.4*sc,y);g.lineTo(x-1.4*sc,y);g.moveTo(x+1.4*sc,y);g.lineTo(x+3.4*sc,y);g.stroke()}
    else if(mood==='happy'){g.beginPath();g.arc(x-2.4*sc,y+.6*sc,1.3*sc,3.4,6);g.stroke();g.beginPath();g.arc(x+2.4*sc,y+.6*sc,1.3*sc,3.4,6);g.stroke()}
    else{g.beginPath();g.arc(x-2.4*sc,y,1*sc,0,7);g.arc(x+2.4*sc,y,1*sc,0,7);g.fill()}
    g.beginPath();if(mood==='sad')g.arc(x,y+3.6*sc,1.4*sc,3.5,5.9);else if(mood==='happy')g.arc(x,y+1.6*sc,1.6*sc,.2,2.9);else g.arc(x,y+2*sc,.9*sc,.3,2.8);g.stroke()}
  function drawShadeFlower(g,x,y,st,t,i){var b=st.bloom,w=st.wilt,sway=Math.sin(t*2+i)*1.5*(1-w),hx=x+sway+w*6,hy=y-14+w*8;
    g.strokeStyle=w?'#7d8f5a':'#4f9a48';g.lineWidth=2.2;g.lineCap='round';g.beginPath();g.moveTo(x,y+8);g.quadraticCurveTo(x-2,y-4,hx,hy+4);g.stroke();
    g.fillStyle=w?'#93a26a':'#62b25a';g.beginPath();g.ellipse(x-6,y+2,6,2.6,-.5,0,7);g.ellipse(x+6,y+4,5,2.4,.5,0,7);g.fill();
    var col=w?'#9b98b8':lerpC('#6f7ee8','#8fa4ff',b),r=7+b*3;
    if(b>0){g.fillStyle=col;for(var j=0;j<5;j++){var an=j*1.2566-1.57+t*.3;g.beginPath();g.ellipse(hx+Math.cos(an)*r*.9,hy+Math.sin(an)*r*.9,r*.6*b,r*.42*b,an,0,7);g.fill()}}
    g.fillStyle=col;g.beginPath();g.moveTo(hx-r,hy+r*.5);g.quadraticCurveTo(hx-r,hy-r*1.1,hx,hy-r*1.15);g.quadraticCurveTo(hx+r,hy-r*1.1,hx+r,hy+r*.5);
    g.quadraticCurveTo(hx+r*.5,hy+r*.2,hx,hy+r*.7);g.quadraticCurveTo(hx-r*.5,hy+r*.2,hx-r,hy+r*.5);g.fill();
    g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(hx-r*.4,hy-r*.45,r*.25,r*.4,-.3,0,7);g.fill();
    var bl=cat.blink<0&&(i%2===0);face(g,hx,hy-1,w?'sad':(b>0||st.ok||st.happy?'happy':'idle'),.9+b*.2,bl&&!w&&!b)}
  function drawSunflower(g,x,y,st,t,i){var w=st.wilt,sad=st.sad||w,sway=Math.sin(t*1.7+i)*1.3*(1-w),hx=x+sway+w*5,hy=y-15+w*7,b=st.bloom;
    g.strokeStyle=w?'#7d8f5a':'#4f9a48';g.lineWidth=2.6;g.lineCap='round';g.beginPath();g.moveTo(x,y+8);g.lineTo(hx,hy);g.stroke();
    g.fillStyle=w?'#93a26a':'#62b25a';g.beginPath();g.ellipse(x-6,y+1,6,2.8,-.4,0,7);g.ellipse(x+6,y+3,6,2.6,.4,0,7);g.fill();
    var pr=10+b*2-(sad?1.5:0),spin=t*.25*(b>0?3:0);g.fillStyle=w?'#c9b476':(sad?'#e8c24a':'#ffcc2e');
    for(var j=0;j<12;j++){var an=j*.5236+spin;g.beginPath();g.ellipse(hx+Math.cos(an)*pr,hy+Math.sin(an)*pr*(sad?1.05:1),4.4,2.2,an,0,7);g.fill()}
    g.fillStyle='#8a5a2c';g.beginPath();g.arc(hx,hy,6.8,0,7);g.fill();g.fillStyle='#a8743c';g.beginPath();g.arc(hx-1.5,hy-1.5,3.5,0,7);g.fill();
    face(g,hx,hy,sad?'sad':(b>0?'happy':'idle'),.95,cat.blink<0&&i%2===1)}
  function bubble(g,x,y,k,mark,pulse,ko){g.fillStyle=HC[k];g.beginPath();g.arc(x,y,8.5+pulse*1.6,0,7);g.fill();
    g.strokeStyle='#fff';g.lineWidth=2;g.stroke();g.fillStyle='#fff';g.font='10px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(HOURS[k],x,y+3.6);
    if(mark){g.fillStyle=mark>0?'#3aa655':'#e0533f';g.beginPath();g.arc(x+7,y-6,5.5,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=1.6;g.beginPath();
      if(mark>0){g.moveTo(x+4.4,y-6);g.lineTo(x+6.4,y-4);g.lineTo(x+9.6,y-8.4)}else{g.moveTo(x+5,y-8);g.lineTo(x+9,y-4);g.moveTo(x+9,y-8);g.lineTo(x+5,y-4)}g.stroke()}}

  function drawCat(g,x,y,t,lx,ly){var m=cat.mood,j=Math.abs(Math.sin(cat.jump*9))*cat.jump*16,br=Math.sin(t*2.2)*1.2;y-=j;
    g.fillStyle='rgba(40,30,20,.22)';g.beginPath();g.ellipse(x,y+j+30,24,6,0,0,7);g.fill();
    /* 꼬리 */
    g.strokeStyle='#e8913f';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(x+16,y+24);g.quadraticCurveTo(x+34,y+20+Math.sin(t*3)*4,x+30,y+4+Math.sin(t*3)*6);g.stroke();
    /* 몸 */
    g.fillStyle='#f4a24f';g.beginPath();g.ellipse(x,y+18-br*.3,19,15+br*.3,0,0,7);g.fill();g.fillStyle='#fff3df';g.beginPath();g.ellipse(x,y+22,10,9,0,0,7);g.fill();
    /* 물뿌리개 */
    g.fillStyle='#69b7d9';rr(g,x-30,y+14,15,13,3);g.fill();g.strokeStyle='#4a90b0';g.lineWidth=2;g.beginPath();g.moveTo(x-30,y+18);g.lineTo(x-38,y+12);g.stroke();
    g.fillStyle='#f4a24f';g.beginPath();g.arc(x-14,y+22,4.5,0,7);g.fill();
    /* 머리 */
    var hy=y-4,ear=m==='sad'?.5:0;g.fillStyle='#f4a24f';
    g.beginPath();g.moveTo(x-16,hy-4);g.lineTo(x-14+ear*4,hy-22+ear*8);g.lineTo(x-4,hy-12);g.closePath();g.fill();
    g.beginPath();g.moveTo(x+16,hy-4);g.lineTo(x+14-ear*4,hy-22+ear*8);g.lineTo(x+4,hy-12);g.closePath();g.fill();
    g.fillStyle='#ffb3a7';g.beginPath();g.moveTo(x-13,hy-8);g.lineTo(x-12+ear*3,hy-17+ear*6);g.lineTo(x-7,hy-11);g.fill();g.beginPath();g.moveTo(x+13,hy-8);g.lineTo(x+12-ear*3,hy-17+ear*6);g.lineTo(x+7,hy-11);g.fill();
    g.fillStyle='#f4a24f';g.beginPath();g.ellipse(x,hy,18,15,0,0,7);g.fill();
    g.strokeStyle='#d9782c';g.lineWidth=2.2;g.beginPath();g.moveTo(x-4,hy-14);g.lineTo(x-3,hy-9);g.moveTo(x+4,hy-14);g.lineTo(x+3,hy-9);g.moveTo(x,hy-15);g.lineTo(x,hy-10);g.stroke();
    /* 밀짚모자 */
    g.fillStyle='#e9cf86';g.beginPath();g.ellipse(x,hy-13,22,5,0,0,7);g.fill();g.fillStyle='#f3dc9a';rr(g,x-11,hy-24,22,12,6);g.fill();
    g.fillStyle='#e05a5a';g.fillRect(x-11,hy-16,22,3.5);
    /* 눈 */
    var ex=Math.max(-2,Math.min(2,(lx-x)/60)),ey=Math.max(-1.5,Math.min(2,(ly-hy)/80));
    g.fillStyle='#3a2a20';g.strokeStyle='#3a2a20';g.lineWidth=2;
    if(cat.blink<0&&m!=='happy'){g.beginPath();g.moveTo(x-10,hy);g.lineTo(x-4,hy);g.moveTo(x+4,hy);g.lineTo(x+10,hy);g.stroke()}
    else if(m==='happy'){g.beginPath();g.arc(x-7,hy+1,3.4,3.5,5.9);g.stroke();g.beginPath();g.arc(x+7,hy+1,3.4,3.5,5.9);g.stroke()}
    else{g.fillStyle='#fff';g.beginPath();g.arc(x-7,hy,4.4,0,7);g.arc(x+7,hy,4.4,0,7);g.fill();g.fillStyle='#3a2a20';g.beginPath();g.arc(x-7+ex,hy+ey,2.6,0,7);g.arc(x+7+ex,hy+ey,2.6,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(x-6+ex,hy-1+ey,.9,0,7);g.arc(x+8+ex,hy-1+ey,.9,0,7);g.fill()}
    g.fillStyle='rgba(255,120,120,.5)';g.beginPath();g.arc(x-12,hy+5,3,0,7);g.arc(x+12,hy+5,3,0,7);g.fill();
    g.fillStyle='#c0504d';g.beginPath();g.moveTo(x-1.6,hy+4);g.lineTo(x+1.6,hy+4);g.lineTo(x,hy+6);g.fill();
    g.strokeStyle='#3a2a20';g.lineWidth=1.3;g.beginPath();
    if(m==='sad'){g.arc(x,hy+11,3,3.6,5.8)}else if(m==='happy'){g.arc(x-2,hy+6,2.2,.2,2.9);g.moveTo(x+4.2,hy+6.6);g.arc(x+2,hy+6,2.2,.2,2.9)}else{g.moveTo(x,hy+6);g.lineTo(x,hy+7.5)}g.stroke();
    if(m==='sad'){g.fillStyle='#7cc4ff';g.beginPath();g.ellipse(x+11,hy+5+(t*20%8),1.8,2.6,0,0,7);g.fill()}
    if(time<10&&m==='idle'){g.fillStyle='#7cc4ff';g.beginPath();g.ellipse(x+17,hy-8,2,3,0,0,7);g.fill()}}

  function draw(g,a,dt){dt=dt||0;tG+=dt;var t=tG,ko=a.lang==='ko',i,p;
    if(!L)return;
    var st=showT,u=(st-6)/12,dusk=Math.max(0,Math.abs(u-.5)*2-.45)/.55,S=L.season;
    /* 하늘 */
    var top=S==='wi'?'#9cc3e6':'#7fc4f2',bot=S==='au'?'#ffe2b0':S==='wi'?'#e4f0fa':'#d6f1ff';
    var sk=g.createLinearGradient(0,0,0,150);sk.addColorStop(0,lerpC(top,'#f59ab0',dusk*.75));sk.addColorStop(1,lerpC(bot,'#ffd09a',dusk*.8));
    g.fillStyle=sk;g.fillRect(-20,-20,W+40,170);
    /* 먼 언덕 (움직이는 층 1) */
    g.fillStyle=S==='wi'?'rgba(220,235,245,.9)':S==='au'?'rgba(214,170,96,.55)':'rgba(120,190,120,.5)';g.beginPath();g.moveTo(-10,140);
    for(i=0;i<=380;i+=20)g.lineTo(i-10,128-Math.sin(i*.02+t*.05)*8-Math.sin(i*.05)*4);g.lineTo(W+10,150);g.lineTo(-10,150);g.fill();
    /* 해 궤도 */
    var ry=88*SEASON[S].peak;g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;g.setLineDash([3,6]);g.beginPath();g.ellipse(180,132,150,ry,0,Math.PI,2*Math.PI);g.stroke();g.setLineDash([]);
    /* 구름 (움직이는 층 2) */
    for(i=0;i<clouds.length;i++){p=clouds[i];p.x+=p.v*dt;if(p.x>W+60)p.x=-60;g.fillStyle='rgba(255,255,255,.8)';
      g.beginPath();g.ellipse(p.x,p.y,26*p.s,9*p.s,0,0,7);g.ellipse(p.x-10*p.s,p.y-6*p.s,12*p.s,9*p.s,0,0,7);g.ellipse(p.x+10*p.s,p.y-7*p.s,14*p.s,11*p.s,0,0,7);g.fill()}
    /* 시각 칩 */
    for(i=0;i<5;i++){var q=chipXY(i),on=(mode==='plan'||mode==='wilt')&&i===prevK,done=mode==='day'&&bell>i;
      g.fillStyle=on?'#fff':'rgba(255,255,255,.55)';g.beginPath();g.arc(q[0],q[1],on?15:12,0,7);g.fill();
      g.fillStyle=HC[i];g.globalAlpha=on||done?1:.75;g.beginPath();g.arc(q[0],q[1],on?12:10,0,7);g.fill();g.globalAlpha=1;
      g.fillStyle='#fff';g.font=(on?13:11)+'px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(HOURS[i],q[0],q[1]+4)}
    /* 해 */
    var sp=sunXY(st);g.fillStyle='rgba(255,230,120,.35)';g.beginPath();g.arc(sp[0],sp[1],22+Math.sin(t*3)*2,0,7);g.fill();
    g.save();g.translate(sp[0],sp[1]);g.rotate(t*.4);g.strokeStyle='#ffb52e';g.lineWidth=3;g.lineCap='round';
    for(i=0;i<8;i++){g.rotate(Math.PI/4);g.beginPath();g.moveTo(16,0);g.lineTo(21,0);g.stroke()}g.restore();
    g.fillStyle='#ffd23f';g.beginPath();g.arc(sp[0],sp[1],13,0,7);g.fill();g.fillStyle='#fff3b0';g.beginPath();g.arc(sp[0]-4,sp[1]-4,4,0,7);g.fill();
    face(g,sp[0],sp[1]+1,mode==='wilt'?'sad':mode==='bloom'?'happy':'idle',1.3,false);
    /* 정원 바닥 */
    var gd=g.createLinearGradient(0,140,0,H);gd.addColorStop(0,S==='wi'?'#dfe9e4':S==='au'?'#e8d3a2':'#cfe8b0');gd.addColorStop(1,S==='wi'?'#c5d6cf':S==='au'?'#d9b97c':'#a9d68e');
    g.fillStyle=gd;g.fillRect(-20,140,W+40,H-120);
    /* 화단 */
    var gw=L.w*CS,gh=L.h*CS;g.fillStyle='rgba(60,40,20,.18)';rr(g,BX-8,BY-4,gw+16,gh+16,14);g.fill();
    g.fillStyle='#a8784a';rr(g,BX-9,BY-9,gw+18,gh+18,14);g.fill();g.fillStyle='#c79a63';rr(g,BX-6,BY-6,gw+12,gh+12,11);g.fill();
    var gA=S==='wi'?['#e6f0eb','#d2e2da']:S==='au'?['#b9c46a','#aab95e']:['#8fd16d','#80c463'];
    for(var r=0;r<L.h;r++)for(var c=0;c<L.w;c++){g.fillStyle=gA[(r+c)%2];g.fillRect(BX+c*CS,BY+r*CS,CS,CS);
      if(S==='wi'&&hash(r*7+c)>.6){g.fillStyle='rgba(150,190,160,.5)';g.beginPath();g.arc(BX+c*CS+hash(c+r)*CS,BY+r*CS+hash(c*3+r)*CS,3,0,7);g.fill()}
      else if(S!=='wi'){g.strokeStyle='rgba(60,120,50,.35)';g.lineWidth=1.3;var gx=BX+c*CS+8+hash(r*11+c)*(CS-16),gy=BY+r*CS+10+hash(r+c*13)*(CS-20);
        g.beginPath();g.moveTo(gx,gy);g.lineTo(gx-2,gy-5);g.moveTo(gx+3,gy);g.lineTo(gx+4,gy-6);g.stroke()}}
    /* 그림자 (오프스크린에 한 색으로 그린 뒤 반투명 합성) */
    if(!shadeCv){shadeCv=document.createElement('canvas');shadeCv.width=W;shadeCv.height=H}
    var s=shadeCv.getContext('2d');s.clearRect(0,0,W,H);s.save();s.beginPath();s.rect(BX,BY,gw,gh);s.clip();s.fillStyle='#173a28';
    (L.trees||[]).forEach(function(tr){var o=cxy(tr[0],tr[1]);castShadow(s,o[0],o[1],shadowVec(st,2),13,11)});
    pieces.forEach(function(pc){var o=cxy(pc[0],pc[1]);castShadow(s,o[0],o[1],shadowVec(st,pc[2]==='b'?2:1),4,pc[2]==='b'?6:5)});
    s.restore();g.globalAlpha=(S==='wi'?.4:.32)+.08*dusk;g.drawImage(shadeCv,0,0);g.globalAlpha=1;
    /* 정각 그늘 칸 표시 */
    var atKey=(mode==='plan'&&Math.abs(st-HOURS[prevK])<.05)||(mode==='day'&&bellT>0),kk=mode==='day'?bell-1:prevK;
    var J=judge(L,pieces);
    if(atKey&&kk>=0){var mp=J.maps[kk];for(i=0;i<mp.length;i++)if(mp[i]){var x0=BX+(i%L.w)*CS,y0=BY+Math.floor(i/L.w)*CS;
      g.strokeStyle=HC[kk];g.globalAlpha=.85;g.lineWidth=2;g.setLineDash([4,3]);rr(g,x0+3,y0+3,CS-6,CS-6,7);g.stroke();g.setLineDash([]);g.globalAlpha=1}}
    /* 노을빛 */
    if(dusk>0){g.fillStyle='rgba(255,140,60,'+(dusk*.12)+')';g.fillRect(BX,BY,gw,gh)}
    /* 물건들 (행 순서) */
    var objs=[];(L.rocks||[]).forEach(function(o){objs.push([o[1],0,o])});(L.trees||[]).forEach(function(o){objs.push([o[1],3,o])});
    L.fl.forEach(function(o,i){objs.push([o[1],1,o,i])});pieces.forEach(function(o){objs.push([o[1],2,o])});
    objs.sort(function(A,B){return A[0]-B[0]||A[1]-B[1]});
    objs.forEach(function(ob){var o=ob[2],q=cxy(o[0],o[1]);
      if(ob[1]===0)drawPond(g,q[0],q[1],t);else if(ob[1]===3)drawTree(g,q[0],q[1]+8,S,t);else if(ob[1]===2)drawStick(g,q[0],q[1]+4,o[2],1,0);
      else{var fi=ob[3],f=flowerFx[fi],sh=J.maps[prevK][o[1]*L.w+o[0]],stt={bloom:f.bloom,wilt:f.wilt,ok:f.ok};
        if(mode==='plan'){if(o[2].length)stt.happy=o[2].indexOf(prevK)>=0&&sh;else stt.sad=sh}
        if(mode==='day'&&!o[2].length)stt.sad=J.maps[Math.max(0,Math.min(4,Math.round((st-6)/3)))][o[1]*L.w+o[0]]&&bellT>0;
        var fs=CS/40;g.save();g.translate(q[0],q[1]+CS*.16);g.scale(fs,fs);
        if(o[2].length)drawShadeFlower(g,0,0,stt,t,fi);else drawSunflower(g,0,0,stt,t,fi);g.restore()}});
    /* 시계 말풍선 */
    L.fl.forEach(function(f,fi){if(!f[2].length)return;var q=cxy(f[0],f[1]),n=f[2].length;
      f[2].forEach(function(k,j){var bx=q[0]+CS*.3-(n-1-j)*17,by=q[1]-CS*.32,pl=(mode==='plan'&&k===prevK)?(.5+.5*Math.sin(t*6)):0,
        mk=marks?marks[fi][k]:(mode==='plan'&&k===prevK&&J.maps[k][f[1]*L.w+f[0]]?1:0);bubble(g,bx,by,k,mk,pl,ko)})});
    /* 미리보기 부채꼴: 들고 있는 막대 / 커서 칸 */
    var pv=null;
    if(mode==='plan'){if(held&&a&&window.__sg){var ip=window.__sg.inp;if(ip.x!=null){var hc=cellAt(ip.x,ip.y);
          if(hc&&canPlace(hc[0],hc[1]))pv=[hc[0],hc[1],held.t];
          drawStick(g,ip.x,ip.y+10,held.t,.9,10)}}
      else if(kbOn){var pk=pieceAt(kc,kr);if(pk>=0)pv=pieces[pk];else if(canPlace(kc,kr)&&(left[sel]>0||left.s||left.b))pv=[kc,kr,left[sel]>0?sel:(left.s?'s':'b')]}
      else if(window.__sg){var mp2=window.__sg.inp;if(mp2.x!=null&&!mp2.down){var mc=cellAt(mp2.x,mp2.y);if(mc&&canPlace(mc[0],mc[1])&&(left.s||left.b))pv=[mc[0],mc[1],left[sel]>0?sel:(left.s?'s':'b')]}}}
    if(pv){var o2=cxy(pv[0],pv[1]);g.lineCap='round';
      for(var k2=0;k2<5;k2++){var cells=shadowCells(L,pv[0],pv[1],pv[2]==='b'?2:1,k2);if(!cells.length)continue;
        var e=cxy(cells[cells.length-1][0],cells[cells.length-1][1]),off=(k2-2)*2;
        g.strokeStyle=HC[k2];g.lineWidth=k2===prevK?4:2.5;g.globalAlpha=k2===prevK?.95:.6;g.beginPath();g.moveTo(o2[0],o2[1]);g.lineTo(e[0]+off,e[1]+off);g.stroke();
        cells.forEach(function(cl){var z=cxy(cl[0],cl[1]);g.fillStyle=HC[k2];g.beginPath();g.arc(z[0]+off,z[1]+off,4,0,7);g.fill()});
        g.globalAlpha=1;g.fillStyle=HC[k2];g.beginPath();g.arc(e[0]+off,e[1]+off,8,0,7);g.fill();g.fillStyle='#fff';g.font='9px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(HOURS[k2],e[0]+off,e[1]+off+3)}
      if(!held){g.globalAlpha=.55;drawStick(g,o2[0],o2[1]+4,pv[2],1,0);g.globalAlpha=1}}
    /* 키보드 커서 */
    if(kbOn&&mode==='plan'){var kx=BX+kc*CS,ky=BY+kr*CS;g.strokeStyle='#fff';g.lineWidth=3;rr(g,kx+1.5,ky+1.5,CS-3,CS-3,8);g.stroke();
      g.strokeStyle='#ff8a3d';g.lineWidth=1.5;g.setLineDash([5,4]);g.lineDashOffset=-t*12;rr(g,kx+1.5,ky+1.5,CS-3,CS-3,8);g.stroke();g.setLineDash([]);g.lineDashOffset=0}
    /* 떠다니는 꽃잎/낙엽/눈 (움직이는 층 3) */
    for(i=0;i<floaters.length;i++){p=floaters[i];var fy=((p.y+t*p.v)%H+H)%H,fxx=p.x+Math.sin(t*.8+p.p)*16;
      g.save();g.translate(fxx,fy);g.rotate(t*(.5+p.s)+p.p);g.globalAlpha=.75;
      if(S==='wi'){g.fillStyle='#fff';g.beginPath();g.arc(0,0,2+p.s*1.5,0,7);g.fill()}
      else{g.fillStyle=S==='au'?(p.s>.5?'#e0782c':'#f2b134'):(p.s>.5?'#ffc0d0':'#fff2a8');g.beginPath();g.ellipse(0,0,4,2,0,0,7);g.fill()}
      g.restore()}
    g.globalAlpha=1;
    /* 트레이 */
    trayCards().forEach(function(cd){var on=sel===cd.t,n=left[cd.t];g.fillStyle='rgba(60,40,20,.16)';rr(g,cd.x+2,TRAY+4,cd.w,46,12);g.fill();
      g.fillStyle=on?'#fff8e6':'rgba(255,250,240,.8)';rr(g,cd.x,TRAY,cd.w,46,12);g.fill();
      g.strokeStyle=on?'#ff8a3d':'rgba(138,90,52,.4)';g.lineWidth=on?3:1.5;g.stroke();
      g.globalAlpha=n>0?1:.35;drawStick(g,cd.x+24,TRAY+(cd.t==='b'?44:38),cd.t,1,0);g.globalAlpha=1;
      g.fillStyle=n>0?'#5a3a20':'#b39a80';g.font='20px Jua, system-ui, sans-serif';g.textAlign='left';g.fillText('×'+n,cd.x+44,TRAY+24);
      g.font='11px Jua, system-ui, sans-serif';g.fillText(cd.t==='b'?(ko?'큰 막대':'Tall'):(ko?'작은 막대':'Short'),cd.x+44,TRAY+39)});
    /* 실행 버튼 */
    var canRun=mode==='plan',bp=canRun?1+Math.sin(t*4)*.02*(pieces.length>0?1:0):1;
    g.save();g.translate(RUN.x+RUN.w/2,RUN.y+RUN.h/2);g.scale(bp,bp);
    g.fillStyle='rgba(120,60,10,.25)';rr(g,-RUN.w/2,-RUN.h/2+4,RUN.w,RUN.h,20);g.fill();
    var bg=g.createLinearGradient(0,-RUN.h/2,0,RUN.h/2);bg.addColorStop(0,canRun?'#ffc04a':'#e0c48a');bg.addColorStop(1,canRun?'#ff8a3d':'#c8a874');
    g.fillStyle=bg;rr(g,-RUN.w/2,-RUN.h/2,RUN.w,RUN.h,20);g.fill();g.fillStyle='rgba(255,255,255,.3)';rr(g,-RUN.w/2+8,-RUN.h/2+4,RUN.w-16,10,6);g.fill();
    g.fillStyle='#fff';g.font='17px Jua, system-ui, sans-serif';g.textAlign='center';
    g.fillText(mode==='day'?(ko?'해가 지나가는 중…':'The sun is moving…'):(ko?'☀ 하루 흘려보내기':'☀ Let the day pass'),0,6);g.restore();
    /* 고양이 정원사 */
    var lk=window.__sg&&window.__sg.inp.x!=null?[window.__sg.inp.x,window.__sg.inp.y]:(kbOn?cxy(kc,kr):sp);
    if(mode==='day')lk=sp;drawCat(g,52,566,t,lk[0],lk[1]);
    /* 안내 문구 */
    g.textAlign='center';
    if(L.tip&&(mode==='plan'||mode==='day')&&tries<3){var tx=L.tip[ko?'ko':'en'],fz=14;g.font=fz+'px Jua, system-ui, sans-serif';while(g.measureText(tx).width>190&&fz>10){fz--;g.font=fz+'px Jua, system-ui, sans-serif'}
      var tw=g.measureText(tx).width+18,tcx=200;
      g.fillStyle='rgba(255,255,255,.85)';rr(g,tcx-tw/2,582,tw,24,12);g.fill();g.fillStyle='#5a3a20';g.fillText(tx,tcx,598+(14-fz)*.3)}
    if(kbOn&&mode==='plan'){var kz=11,kt=ko?'방향키 이동 · 스페이스 놓기 · Q/E 시각 · 엔터 시작':'Arrows move · Space place · Q/E hour · Enter go';
      g.font=kz+'px Jua, system-ui, sans-serif';while(g.measureText(kt).width>205&&kz>8){kz--;g.font=kz+'px Jua, system-ui, sans-serif'}g.fillStyle='rgba(70,50,30,.8)';
      g.fillText(kt,200,626)}
    /* 상단 정보 */
    g.textAlign='left';g.font='14px Jua, system-ui, sans-serif';g.fillStyle='rgba(40,60,90,.85)';
    g.fillText((ko?(lvN+1)+'단계':'Stage '+(lvN+1))+' · '+SNAME[S][ko?'ko':'en'],10,50);
    var tw2=Math.ceil(time),low=time<10;g.textAlign='right';g.font=(low?19+Math.sin(t*12)*1.5:17)+'px Jua, system-ui, sans-serif';
    g.fillStyle=lastGain>0?'#2f8f4a':(low?'#e0533f':'rgba(40,60,90,.9)');g.fillText('⏱ '+tw2,W-10,51);
    if(lastGain>0){g.font='12px Jua, system-ui, sans-serif';g.fillText('+15',W-12,67)}
    /* 단계 배너 */
    if(banner.t>0){var ba=Math.min(1,banner.t*2);g.globalAlpha=ba;g.fillStyle='rgba(255,250,235,.92)';rr(g,90,BY+14,180,44,16);g.fill();
      g.fillStyle='#5a3a20';g.font='22px Jua, system-ui, sans-serif';g.textAlign='center';
      g.fillText((ko?(lvN+1)+'단계 · ':'Stage '+(lvN+1)+' · ')+SNAME[S][ko?'ko':'en'],180,BY+44);g.globalAlpha=1}
  }

  window.__sundial={mode:function(){return mode},lv:function(){return lvN}};
  SG.run({id:'sundial',title:{ko:'해시계 정원',en:'Sundial Garden'},
    how:{ko:'막대를 꽂아 그림자를 만들어요. 꽃마다 적힌 시각에 그늘이 지도록 놓고, 하루를 흘려보내세요!',
         en:'Plant sticks to cast shadows. Shade each flower at the hour on its tag, then let the day pass!'},
    init:init,update:update,draw:draw});
})();
