/* 열쇠 장인 (Key Smith) — 유리 자물쇠 속 핀을 보고 빈 열쇠에 홈을 깎는다.
   한 번 깊게 깎은 홈은 되돌릴 수 없다. 흐린 핀은 시험 결과로 추리하고,
   마스터키 자물쇠는 서로 다른 열쇠 두 개로, 복사 주문은 손님 열쇠를 재서, 뒷판 주문은 거꾸로 읽어서 푼다.
   자물쇠 모델은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,S=292,BT=300,U=10,L0=8,REST=350,CHT=172,DRV=22,JT=446,DMAX=5,STEP=26,BH=58;
  var T0=55,TADD=14,TCAP=70;
  var BTN_TEST=[16,546,150,46],BTN_NEW=[176,546,126,46];

  function mk(seed){var s=((seed|0)^0x9e3779b9)>>>0;if(!s)s=1;
    return function(){s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
  function ri(r,a,b){return a+Math.floor(r()*(b-a+1))}

  /* ---------- 주문 데이터 ----------
     vis: c=투명, f=흐림(높이 범위만 보임), d=어두움(안 보임). fr: 흐린 핀의 [최소,최대] 깊이 */
  var HAND=[
    {cuts:[2,4,1],vis:'ccc',guides:1,spare:2,hint:{ko:'핀 높이에 맞춰 홈을 깎아요',en:'Cut each notch to match its pin'}},
    {cuts:[3,1,4,2],vis:'cccc',spare:2,hint:{ko:'핀의 줄무늬 수 = 홈 깊이',en:'Bands on a pin = notch depth'}},
    {cuts:[5,2,4,3],vis:'cccc',spare:1,hint:{ko:'너무 깊게 깎으면 되돌릴 수 없어요!',en:'Too deep can\'t be undone!'}},
    {cuts:[2,3,1,4],vis:'cfcc',fr:{1:[2,4]},spare:2,hint:{ko:'흐린 핀은 조금씩 깎고 시험해요',en:'Frosted pin: cut a little, then test'}},
    {cuts:[1,4,2,5,3],vis:'cfcfc',fr:{1:[3,4],3:[4,5]},spare:2,hint:{ko:'▼ 표시는 더 깎으라는 뜻이에요',en:'▼ means cut that notch deeper'}},
    {cuts:[1,2,1],wafers:[2,3,3],vis:'ccc',spare:2,hint:{ko:'서로 다른 열쇠 2개가 모두 열어야 해요',en:'Two different keys must both open it'}},
    {cuts:[3,1,4,2],vis:'dddd',ref:1,spare:2,hint:{ko:'손님 열쇠를 탭해서 깊이를 재요',en:'Tap the customer\'s key to measure'}},
    {cuts:[4,2,5,1,3],vis:'ffcff',fr:{0:[3,4],1:[1,3],3:[0,1],4:[3,4]},spare:2,hint:{ko:'흐린 핀은 가장 얕은 쪽부터',en:'Frosted pins: start shallow'}},
    {cuts:[1,3,5,2],vis:'dddd',plate:1,spare:2,hint:{ko:'뒷판 번호는 거꾸로 읽어요',en:'Back plate: read it right to left'}},
    {cuts:[2,1,3,0],wafers:[2,4,1,2],vis:'cccc',spare:2,hint:{ko:'두 번째 열쇠는 금색 조각 위까지',en:'Key 2: go past a gold wafer'}},
    {cuts:[2,5,1,3,4],vis:'ddfdd',fr:{2:[0,2]},ref:1,thumb:2,spare:2,hint:{ko:'가려진 홈은 흐린 핀으로 찾아요',en:'Covered notch? Use the frosted pin'}},
    {cuts:[4,1,3,0,2,5],vis:'dddfdd',fr:{3:[0,1]},plate:1,worn:3,spare:2,hint:{ko:'지워진 번호는 시험해서 찾아요',en:'Worn digit? Find it by testing'}}
  ];
  var NAMES={ko:['여우 손님','곰 손님','토끼 손님','너구리 손님','개구리 손님','펭귄 손님'],en:['Fox','Bear','Bunny','Raccoon','Frog','Penguin']};

  function layout(n){var sp=n<=4?50:n===5?44:40,x0=204-(n-1)*sp/2,xs=[];for(var i=0;i<n;i++)xs.push(Math.round(x0+i*sp));return {xs:xs,sp:sp}}
  function frange(r,c){var w=ri(r,1,2),lo=c-ri(r,0,w),hi;if(lo<0)lo=0;hi=lo+w;if(hi>DMAX){hi=DMAX;lo=DMAX-w}return [lo,hi]}
  function genDef(k,seed){
    var r=mk(seed*7919+k*104729+13),types=['frost','master','copy','plate'],type=types[ri(r,0,3)],i;
    if(k%4===0)type=types[(k>>2)%4];
    var n=type==='master'?ri(r,3,5):ri(r,4,6),cuts=[],vis=[],fr={},def;
    for(i=0;i<n;i++)cuts.push(ri(r,0,DMAX));
    if(cuts.every(function(c){return c===cuts[0]}))cuts[0]=(cuts[0]+2)%6;
    def={cuts:cuts,spare:2};
    if(type==='frost'){var nf=0;for(i=0;i<n;i++){vis[i]=r()<.5?'f':'c';if(vis[i]==='f')nf++}
      if(nf===0)vis[ri(r,0,n-1)]='f';if(nf===n)vis[ri(r,0,n-1)]='c';
      for(i=0;i<n;i++)if(vis[i]==='f')fr[i]=frange(r,cuts[i])}
    else if(type==='master'){
      if(cuts.every(function(c){return c===DMAX}))cuts[ri(r,0,n-1)]=ri(r,0,3);
      def.wafers=cuts.map(function(c){return c<DMAX?ri(r,1,Math.min(3,DMAX-c)):1});
      /* 전부 최대로 깎은 열쇠나 빈 열쇠가 우연히 열리지 않게 */
      if(cuts.every(function(c,j){return c===DMAX||c+def.wafers[j]===DMAX})){cuts[0]=Math.min(cuts[0],2);def.wafers[0]=1}
      if(cuts.every(function(c){return c===0}))cuts[n-1]=ri(r,1,3);
      for(i=0;i<n;i++)vis[i]='c'}
    else{for(i=0;i<n;i++)vis[i]='d';
      var hid=r()<.45?ri(r,0,n-1):-1;
      if(hid>=0){vis[hid]='f';fr[hid]=frange(r,cuts[hid])}
      if(type==='copy'){def.ref=1;if(hid>=0)def.thumb=hid}else{def.plate=1;if(hid>=0)def.worn=hid}}
    def.vis=vis.join('');def.fr=fr;return def}
  function build(def,k){
    var n=def.cuts.length,L=layout(n),vis=def.vis.split(''),fr=[],i;
    for(i=0;i<n;i++)fr[i]=def.fr&&def.fr[i]?def.fr[i].slice():null;
    return {k:k,type:def.wafers?'master':def.ref?'copy':def.plate?'plate':(vis.indexOf('f')>=0?'frost':'clear'),
      n:n,cuts:def.cuts.slice(),wafers:def.wafers?def.wafers.slice():null,vis:vis,fr:fr,ref:!!def.ref,
      thumb:def.thumb==null?-1:def.thumb,plate:!!def.plate,worn:def.worn==null?-1:def.worn,
      spare:def.spare==null?2:def.spare,guides:!!def.guides,hint:def.hint||null,keys:def.wafers?2:1,
      animal:k%6,xs:L.xs,sp:L.sp}}
  function getOrder(k,seed){return build(k<HAND.length?HAND[k]:genDef(k,seed||0),k)}

  /* ---------- 자물쇠 모델 ---------- */
  function gatesOf(o,i){return o.wafers?[o.cuts[i],o.cuts[i]+o.wafers[i]]:[o.cuts[i]]}
  /* 0: 전단선에 맞음, 1: 핀이 너무 높음(더 깎으면 맞출 수 있음), -1: 너무 깊음(되돌릴 수 없음) */
  function pinStatus(o,i,d){var g=gatesOf(o,i),j;
    for(j=0;j<g.length;j++)if(d===g[j])return 0;
    for(j=0;j<g.length;j++)if(g[j]>d&&g[j]<=DMAX)return 1;
    return -1}
  function sameKey(a,b){for(var i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true}
  function testKey(o,depths,made){var st=[],ok=true,dup=false,i;
    for(i=0;i<o.n;i++){st[i]=pinStatus(o,i,depths[i]);if(st[i])ok=false}
    if(ok&&made)for(i=0;i<made.length;i++)if(sameKey(made[i],depths))dup=true;
    return {st:st,open:ok&&!dup,dup:dup}}
  function newKey(n){var d=[],m=[];for(var i=0;i<n;i++){d.push(0);m.push(0)}return {d:d,mk:m}}
  /* 홈은 깊어지기만 한다: 되돌리는 함수는 없다 */
  function fileStep(key,i){if(key.d[i]>=DMAX)return false;key.d[i]++;key.mk[i]=0;return true}
  /* 키 핀 아랫면이 y일 때 핀 윗면(=키 핀과 위 조각 사이의 틈) 높이 */
  function pinTopY(o,i,yb){return yb-L0-o.cuts[i]*U}
  function plateDigits(o){var out=[];for(var j=0;j<o.n;j++){var i=o.n-1-j;out.push(i===o.worn?null:o.cuts[i])}return out}
  function refDepths(o){return o.cuts.map(function(c,i){return i===o.thumb?null:c})}
  function surfaceAt(o,depths,kx){ /* 열쇠 좌표 kx에서 날 윗면이 얼마나 내려가 있는지(px). 날이 없으면 null */
    var xs=o.xs,n=o.n,sh=xs[0]-30,ts=xs[n-1]+22,te=ts+14,s=0,i,dx;
    if(kx<sh||kx>te)return null;
    if(kx>ts)s=(kx-ts)/14*26;
    for(i=0;i<n;i++){dx=Math.abs(kx-xs[i]);if(dx<11){var v=depths[i]*U*(dx<=4?1:(11-dx)/7);if(v>s)s=v}}
    return s}

  var MODEL={HAND:HAND,getOrder:getOrder,genDef:genDef,build:build,gatesOf:gatesOf,pinStatus:pinStatus,testKey:testKey,
    newKey:newKey,fileStep:fileStep,pinTopY:pinTopY,plateDigits:plateDigits,refDepths:refDepths,surfaceAt:surfaceAt,layout:layout,
    C:{S:S,BT:BT,U:U,L0:L0,REST:REST,DMAX:DMAX,STEP:STEP,JT:JT,T0:T0,TADD:TADD,TCAP:TCAP,BTN_TEST:BTN_TEST,BTN_NEW:BTN_NEW}};
  if(typeof module!=='undefined'&&module.exports){module.exports=MODEL;return}
  if(typeof SG==='undefined')return;

  /* ---------- 게임 상태 ---------- */
  var o,key,oldKey,spare,tests,keysDone,made,measured,mAnim,phase,ph,time,streak,orderNo,runSeed,sel,drag,res,
      pinY,shav,kb,fileFx,lastGain,mood,moodT,blinkT,catWake,warned,denyT,pts0,tG=0,dust,hang;
  var kq=[];
  if(!window.__keySmithKeys){window.__keySmithKeys=true;
    window.addEventListener('keydown',function(e){var c=e.code,m={ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R',ArrowDown:'F',KeyS:'F',
      KeyT:'T',Enter:'T',Space:'T',KeyN:'N',KeyG:'G'}[c];
      if(!m||(e.repeat&&m!=='L'&&m!=='R'))return;kq.push(m);if(kq.length>8)kq.shift()})}

  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function ease(p){p=p<0?0:p>1?1:p;return p*p*(3-2*p)}
  function lerp(a,b,p){return a+(b-a)*p}

  function loadOrder(k){orderNo=k;o=getOrder(k,runSeed);key=newKey(o.n);oldKey=null;spare=o.spare;tests=0;keysDone=0;made=[];
    measured=[];mAnim=[];pinY=[];for(var i=0;i<o.n;i++){pinY.push(REST);measured.push(0);mAnim.push(0)}
    sel=0;drag=null;res=null;phase='intro';ph=0;mood='idle';moodT=0;denyT=0}
  function init(a){time=T0;streak=0;runSeed=Math.floor(Math.random()*1e6);shav=[];kb=false;fileFx=0;lastGain=0;catWake=0;warned=0;blinkT=2;
    dust=[];for(var i=0;i<18;i++)dust.push({x:hash(i+3)*W,y:hash(i+7)*H,p:hash(i+11)*6.28,v:4+hash(i+13)*8});
    hang=[];for(i=0;i<6;i++)hang.push({x:22+i*48,p:hash(i+40)*6,c:i%3});
    kq.length=0;loadOrder(0);a.tempo(1)}

  function doFile(a,i){
    if(!fileStep(key,i)){denyT=.4;a.beep(160,.08,'square');return}
    fileFx=.18;sel=i;
    a.beep(900+Math.random()*500,.05,'sawtooth');a.beep(2300,.025,'square');
    var x=o.xs[i],y=JT+key.d[i]*U;
    for(var j=0;j<7;j++)shav.push({x:x+(Math.random()-.5)*14,y:y,vx:(Math.random()-.5)*90,vy:-40-Math.random()*80,r:1+Math.random()*1.6,
      rot:Math.random()*6,vr:(Math.random()-.5)*20,l:.6+Math.random()*.4,t:0,c:Math.random()<.5?'#f6e7b0':'#d8dde6'})}
  function doTest(a){phase='test';ph=0;res=null;tests++;mood='think';a.sfx('tap')}
  function doNew(a){
    if(spare<=0){failOrder(a);return}
    spare--;oldKey=key;key=newKey(o.n);phase='swap';ph=0;a.beep(520,.06,'triangle');a.beep(780,.08,'triangle')}
  function doMeasure(a,i){
    if(!o.ref||measured[i])return;
    measured[i]=1;mAnim[i]=0;var ko=a.lang==='ko';
    if(i===o.thumb){a.beep(240,.08,'sine');a.pop(o.xs[i],112,ko?'가려졌어요':'Covered!','#ffb3a0')}
    else{a.beep(1400,.05,'sine');a.beep(1900,.06,'sine');a.pop(o.xs[i],112,''+o.cuts[i],'#9df0ff')}}
  function failOrder(a){phase='fail';ph=0;streak=0;mood='sad';moodT=0;a.sfx('hit');a.shake(5);
    a.pop(W/2,440,a.lang==='ko'?'주문 실패…':'Order lost…','#ff8f7a');a.burst(W/2,440,'#8a6d5a',12)}
  function finishOrder(a){
    var tb=tests<=o.keys?5:tests<=o.keys+1?3:tests<=o.keys+2?1:0,pts=10+3*spare+tb+2*Math.min(streak,5),ko=a.lang==='ko';
    streak++;a.add(pts);time=Math.min(TCAP,time+TADD);lastGain=1.2;pts0=pts;
    a.pop(W/2,430,'+'+pts,'#ffd36b');
    if(tb>=5)a.pop(W/2,404,ko?'한 번에!':'First try!','#a8f0b0');
    else if(streak>1)a.pop(W/2,404,(ko?'연속 ':'Streak ')+streak,'#a8d8ff');
    a.tempo(1+Math.min(.5,orderNo*.03));phase='leave';ph=0}

  function inBox(b,x,y){return x>=b[0]&&x<=b[0]+b[2]&&y>=b[1]&&y<=b[1]+b[3]}
  function colAt(x){var best=-1,bd=1e9;for(var i=0;i<o.n;i++){var d=Math.abs(x-o.xs[i]);if(d<bd){bd=d;best=i}}return bd<o.sp/2+6?best:-1}

  function update(dt,inp,a){
    var ko=a.lang==='ko',i,c;
    time-=dt;if(time<=0){time=0;a.over();return}
    if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(1200,.04,'square')}
    ph+=dt;moodT+=dt;fileFx=Math.max(0,fileFx-dt);denyT=Math.max(0,denyT-dt);lastGain=Math.max(0,lastGain-dt);catWake=Math.max(0,catWake-dt);
    for(i=0;i<o.n;i++)if(measured[i])mAnim[i]=Math.min(1,mAnim[i]+dt*3);
    for(i=shav.length-1;i>=0;i--){var s=shav[i];s.t+=dt;s.vy+=420*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.rot+=s.vr*dt;
      if(s.y>536){s.y=536;s.vy*=-.25;s.vx*=.6}if(s.t>s.l)shav.splice(i,1)}
    if(inp.tap&&inp.x!=null)kb=false;
    var keys=kq.splice(0,kq.length);if(keys.length)kb=true;
    if(phase==='intro'){if(ph>.6){phase='work';ph=0}}
    else if(phase==='work'){
      if(inp.tap&&inp.x!=null){var x=inp.x,y=inp.y;
        if(inBox(BTN_TEST,x,y))doTest(a);
        else if(inBox(BTN_NEW,x,y))doNew(a);
        else if(o.ref&&y>56&&y<126&&x>92){c=colAt(x);if(c>=0)doMeasure(a,c)}
        else if(y>396&&y<540){c=colAt(x);if(c>=0){drag={i:c,y:y,acc:0};sel=c}}}
      if(drag&&phase==='work'){
        if(!inp.down||inp.y==null)drag=null;
        else{var dy=inp.y-drag.y;drag.y=inp.y;if(dy>0){drag.acc+=dy;while(drag.acc>=STEP&&drag){drag.acc-=STEP;doFile(a,drag.i)}}}}
      for(i=0;i<keys.length&&phase==='work';i++){c=keys[i];
        if(c==='L')sel=(sel+o.n-1)%o.n;else if(c==='R')sel=(sel+1)%o.n;else if(c==='F')doFile(a,sel);
        else if(c==='T')doTest(a);else if(c==='N')doNew(a);else if(c==='G')doMeasure(a,sel)}}
    else if(phase==='test'){
      if(!res&&ph>=.65){res=testKey(o,key.d,made);
        for(i=0;i<o.n;i++){key.mk[i]=res.st[i]===0?1:res.st[i]>0?2:3;(function(j,st){setTimeout(function(){a.beep(st===0?1320:st>0?520:300,.05,st===0?'triangle':'square')},j*55)})(i,res.st[i])}
        if(res.open){a.sfx('coin')}
        else{a.beep(200,.18,'sine');a.beep(150,.22,'sine');mood='oops';moodT=0;
          a.pop(W/2,424,res.dup?(ko?'이미 만든 열쇠예요':'Same as key 1'):(ko?'안 맞아요':'Not yet'),res.dup?'#ffe08a':'#ff9a8a')}}
      if(res&&res.open&&ph>=.95){phase='open';ph=0;mood='happy';moodT=0;catWake=1.6;a.sfx('win');a.shake(3);
        ['#ffd36b','#fff3c4','#8fe3ff','#ffb0c8'].forEach(function(col){a.burst(W/2,462,col,10)})}
      else if(res&&!res.open){
        if(ph>.95&&ph<1.55&&((inp.tap&&inp.x!=null)||keys.length))ph=1.55;
        if(ph>=2.05){phase='work';ph=0;mood='idle';
          if(spare<=0&&res.st.some(function(v){return v<0}))failOrder(a)}}}
    else if(phase==='open'){
      if(ph>=2.0){
        if(keysDone+1<o.keys){keysDone++;made.push(key.d.slice());
          a.pop(W/2,430,ko?'열쇠 1 완성!':'Key 1 done!','#ffd36b');a.add(0);
          if(spare<=0){failOrder(a);return}
          spare--;oldKey=key;key=newKey(o.n);phase='swap';ph=0;mood='idle';oldKey.done=1}
        else finishOrder(a)}}
    else if(phase==='swap'){if(ph>=.6){phase='work';ph=0;oldKey=null}}
    else if(phase==='leave'){if(ph>=.75)loadOrder(orderNo+1)}
    else if(phase==='fail'){if(ph>=1.5)loadOrder(orderNo+1)}
  }

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function font(s){return s+'px Jua, system-ui, sans-serif'}

  function keyAnim(){ /* 열쇠 위치: kx(가로 오프셋), ky(날 윗면 y), turn(0..1) */
    if(phase==='test'){var t=ph;
      if(t<.25){var p=ease(t/.25);return {kx:lerp(0,-84,p),ky:lerp(JT,BT,p),turn:0}}
      if(t<.65)return {kx:lerp(-84,0,ease((t-.25)/.4)),ky:BT,turn:0};
      if(t<1.55||res&&res.open)return {kx:0,ky:BT,turn:0};
      if(t<1.8)return {kx:lerp(0,-84,ease((t-1.55)/.25)),ky:BT,turn:0};
      return {kx:lerp(-84,0,ease((t-1.8)/.25)),ky:lerp(BT,JT,ease((t-1.8)/.25)),turn:0}}
    if(phase==='open')return {kx:0,ky:BT,turn:ease(ph/.4)};
    if(phase==='intro')return {kx:(1-ease(ph/.6))*280,ky:JT,turn:0};
    if(phase==='swap')return {kx:(1-ease(ph/.6))*280,ky:JT,turn:0};
    if(phase==='leave')return {kx:0,ky:BT,turn:1};
    return {kx:0,ky:JT,turn:0}}

  function drawBg(g,t){
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#4a2e1d');gr.addColorStop(.5,'#3a2416');gr.addColorStop(1,'#26170e');
    g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
    var i,x;
    for(i=0;i<9;i++){x=i*42+8;g.fillStyle=i%2?'rgba(255,220,170,.035)':'rgba(0,0,0,.08)';g.fillRect(x,0,42,H);
      g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1.5;g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();
      g.strokeStyle='rgba(255,210,150,.05)';g.lineWidth=1;g.beginPath();
      for(var k=0;k<3;k++){var yy=hash(i*7+k)*H;g.moveTo(x+6,yy);g.bezierCurveTo(x+16,yy+30,x+26,yy-20,x+36,yy+20)}g.stroke()}
    /* 흔들리는 램프 빛 */
    var lx=180+Math.sin(t*.7)*22;
    var lg=g.createRadialGradient(lx,40,10,lx,300,330);lg.addColorStop(0,'rgba(255,214,140,.28)');lg.addColorStop(.5,'rgba(255,190,110,.10)');lg.addColorStop(1,'rgba(255,190,110,0)');
    g.fillStyle=lg;g.beginPath();g.moveTo(lx-24,30);g.lineTo(lx+24,30);g.lineTo(lx+230,H);g.lineTo(lx-230,H);g.closePath();g.fill();
    /* 떠다니는 먼지 */
    for(i=0;i<dust.length;i++){var p=dust[i],my=((p.y-t*p.v)%H+H)%H,mx=p.x+Math.sin(t*.6+p.p)*12;
      g.fillStyle='rgba(255,230,180,'+(.18+.18*Math.sin(t*1.4+p.p))+')';g.beginPath();g.arc(mx,my,1.4,0,7);g.fill()}
    /* 아래 선반: 매달린 열쇠들이 살랑 */
    g.fillStyle='#2a190f';g.fillRect(0,614,W,30);g.fillStyle='#6b4428';g.fillRect(0,612,W,6);g.fillStyle='rgba(255,220,160,.2)';g.fillRect(0,612,W,1.5);
    for(i=0;i<hang.length;i++){var hk=hang[i],ang=Math.sin(t*1.3+hk.p)*.18;
      g.save();g.translate(hk.x,618);g.rotate(ang);
      g.fillStyle='#a07a3c';g.beginPath();g.arc(0,0,2.5,0,7);g.fill();
      g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;g.beginPath();g.moveTo(0,0);g.lineTo(0,6);g.stroke();
      var kc=['#e6c46a','#c9ced8','#d9915a'][hk.c];g.fillStyle=kc;g.strokeStyle='rgba(60,30,10,.6)';
      g.beginPath();g.arc(0,13,7,0,7);g.fill();g.stroke();g.fillStyle='#2a190f';g.beginPath();g.arc(0,13,2.4,0,7);g.fill();
      g.fillStyle=kc;g.fillRect(-2,19,4,16);g.fillRect(2,27,4,2.5);g.fillRect(2,31,3,2.5);g.restore()}
  }

  function drawAnimal(g,x,y,type,md,t){
    var bob=md==='happy'?-Math.abs(Math.sin(t*10))*5:Math.sin(t*2)*1;y+=bob;
    var col=['#e8833a','#9a6a44','#f1ece4','#8d8f99','#7cc06a','#3b4152'][type],dk=['#a8541f','#6b4528','#cfc4b8','#5c5e68','#4e8d42','#22262f'][type];
    g.save();
    /* 몸 */
    g.fillStyle=dk;g.beginPath();g.ellipse(x,y+40,26,18,0,0,7);g.fill();
    g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(x+3,y+26,20,5,0,0,7);g.fill();
    /* 귀 */
    g.fillStyle=col;g.strokeStyle=dk;g.lineWidth=2;
    if(type===0){g.beginPath();g.moveTo(x-20,y-10);g.lineTo(x-16,y-34);g.lineTo(x-4,y-20);g.closePath();g.moveTo(x+20,y-10);g.lineTo(x+16,y-34);g.lineTo(x+4,y-20);g.closePath();g.fill();g.stroke()}
    else if(type===1||type===3){g.beginPath();g.arc(x-17,y-17,8,0,7);g.arc(x+17,y-17,8,0,7);g.fill();g.stroke()}
    else if(type===2){var ew=Math.sin(t*3)*.08;g.save();g.translate(x-9,y-18);g.rotate(-.15+ew);g.beginPath();g.ellipse(0,-14,6,16,0,0,7);g.fill();g.stroke();g.fillStyle='#f5b3c0';g.beginPath();g.ellipse(0,-14,3,11,0,0,7);g.fill();g.restore();
      g.save();g.translate(x+9,y-18);g.rotate(.15-ew);g.beginPath();g.ellipse(0,-14,6,16,0,0,7);g.fill();g.stroke();g.fillStyle='#f5b3c0';g.beginPath();g.ellipse(0,-14,3,11,0,0,7);g.fill();g.restore()}
    else if(type===4){g.beginPath();g.arc(x-11,y-18,9,0,7);g.arc(x+11,y-18,9,0,7);g.fill();g.stroke()}
    /* 머리 */
    g.fillStyle=col;g.beginPath();g.arc(x,y,23,0,7);g.fill();g.stroke();
    g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.ellipse(x-7,y-10,9,5,-.4,0,7);g.fill();
    if(type===0||type===5){g.fillStyle='#fff6ea';g.beginPath();g.ellipse(x,y+9,type===5?17:12,type===5?13:9,0,0,7);g.fill()}
    if(type===3){g.fillStyle='#3a3c44';g.beginPath();g.ellipse(x-9,y-2,8,5,.2,0,7);g.ellipse(x+9,y-2,8,5,-.2,0,7);g.fill()}
    if(type===1){g.fillStyle='#c79b74';g.beginPath();g.ellipse(x,y+8,10,7,0,0,7);g.fill()}
    /* 눈 */
    var ex=type===4?11:8,ey=type===4?-18:-2,blink=(blinkT%3.4)<.12&&md!=='happy';
    g.strokeStyle='#1f140e';g.fillStyle='#1f140e';g.lineWidth=2;
    var lookX=md==='think'?2.2:0,lookY=md==='think'?2:0;
    for(var s=-1;s<=1;s+=2){var cx=x+s*ex,cy=y+ey;
      if(type===4){g.fillStyle='#fff';g.beginPath();g.arc(cx,cy,5.5,0,7);g.fill();g.fillStyle='#1f140e'}
      if(md==='happy'){g.beginPath();g.arc(cx,cy+1.5,3.4,3.5,5.9);g.stroke()}
      else if(blink){g.beginPath();g.moveTo(cx-3,cy);g.lineTo(cx+3,cy);g.stroke()}
      else{g.fillStyle=type===3?'#fff':'#1f140e';if(type===3){g.beginPath();g.arc(cx+lookX,cy+lookY,3.2,0,7);g.fill();g.fillStyle='#1f140e'}
        g.beginPath();g.arc(cx+lookX,cy+lookY,2.6,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(cx+lookX-.8,cy+lookY-1,.9,0,7);g.fill();g.fillStyle='#1f140e'}
      if(md==='sad'||md==='oops'){g.beginPath();g.moveTo(cx+s*4,cy-5);g.lineTo(cx-s*4,cy-8.5);g.stroke()}}
    /* 볼, 입 */
    g.fillStyle='rgba(255,110,120,.4)';g.beginPath();g.arc(x-14,y+6,3.5,0,7);g.arc(x+14,y+6,3.5,0,7);g.fill();
    g.strokeStyle='#1f140e';g.lineWidth=1.8;g.beginPath();
    if(type===5){g.fillStyle='#f2a83a';g.beginPath();g.moveTo(x-5,y+4);g.lineTo(x+5,y+4);g.lineTo(x,y+10);g.closePath();g.fill()}
    else{g.fillStyle='#1f140e';g.beginPath();g.ellipse(x,y+5,2.6,1.9,0,0,7);g.fill();g.beginPath();
      if(md==='happy'){g.fillStyle='#c2413b';g.arc(x,y+9,4.5,0,3.14);g.fill()}
      else if(md==='sad'||md==='oops'){g.arc(x,y+14,3.5,3.5,5.9);g.stroke()}
      else{g.moveTo(x-4,y+9);g.quadraticCurveTo(x,y+12,x+4,y+9);g.stroke()}}
    if(md==='sad'){g.fillStyle='#8fd3ff';g.beginPath();g.ellipse(x+ex+2,y+6+((t*30)%10),2,3,0,0,7);g.fill()}
    g.restore()}

  function drawCat(g,x,y,t){ /* 자물쇠 위에서 자는 고양이 */
    var wake=catWake>0,br=Math.sin(t*1.6)*1.2;
    g.save();
    g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y+12,26,4,0,0,7);g.fill();
    var tw=Math.sin(t*1.1)*.35;g.strokeStyle='#d28a48';g.lineWidth=5;g.lineCap='round';
    g.beginPath();g.moveTo(x+20,y+8);g.quadraticCurveTo(x+34,y+12,x+32+Math.sin(tw)*8,y+28+Math.cos(tw)*4);g.stroke();
    g.fillStyle='#e9a25b';g.beginPath();g.ellipse(x+2,y+2-br*.3,23,11+br*.4,0,0,7);g.fill();
    g.strokeStyle='rgba(160,90,40,.6)';g.lineWidth=2;for(var i=0;i<3;i++){g.beginPath();g.moveTo(x-4+i*8,y-8);g.lineTo(x-1+i*8,y-2);g.stroke()}
    var hx=x-18,hy=y-1+(wake?-3:0);
    g.fillStyle='#e9a25b';g.beginPath();g.moveTo(hx-11,hy-5);g.lineTo(hx-9,hy-17+(wake?-2:0));g.lineTo(hx-2,hy-9);g.closePath();
    g.moveTo(hx+11,hy-5);g.lineTo(hx+9,hy-17+(wake?-2:0));g.lineTo(hx+2,hy-9);g.closePath();g.fill();
    g.beginPath();g.ellipse(hx,hy,12,10,0,0,7);g.fill();
    g.fillStyle='#fff3e2';g.beginPath();g.ellipse(hx,hy+4,6,4,0,0,7);g.fill();
    g.strokeStyle='#4a2a1c';g.fillStyle='#4a2a1c';g.lineWidth=1.5;
    if(wake){g.beginPath();g.arc(hx-4.5,hy-1,2,0,7);g.arc(hx+4.5,hy-1,2,0,7);g.fill()}
    else{g.beginPath();g.arc(hx-4.5,hy-2,2.4,.3,2.8);g.stroke();g.beginPath();g.arc(hx+4.5,hy-2,2.4,.3,2.8);g.stroke()}
    g.beginPath();g.arc(hx,hy+2.5,1,0,7);g.fill();
    g.restore();
    if(!wake){g.fillStyle='rgba(255,240,210,.7)';for(var z=0;z<3;z++){var zp=(t*.45+z/3)%1;g.globalAlpha=(1-zp)*.8;
      g.font=font(8+zp*6);g.textAlign='center';g.fillText('z',hx-10-zp*10,hy-14-zp*20)}g.globalAlpha=1}
    else{g.fillStyle='#fff3c4';g.font=font(13);g.textAlign='center';g.fillText('!',hx,hy-20)}}

  /* 열쇠: oy는 날 윗면 y, ox는 가로 오프셋 */
  function keyPath(g,o,d,ox,oy){var xs=o.xs,n=o.n,sh=xs[0]-30+ox,ts=xs[n-1]+22+ox,te=ts+14,i,x;
    g.beginPath();g.moveTo(sh,oy);
    for(i=0;i<n;i++){x=xs[i]+ox;g.lineTo(x-11,oy);g.lineTo(x-4,oy+d[i]*U);g.lineTo(x+4,oy+d[i]*U);g.lineTo(x+11,oy)}
    g.lineTo(ts,oy);g.lineTo(te,oy+26);g.lineTo(ts,oy+BH);g.lineTo(sh,oy+BH);g.closePath()}
  function drawKey(g,o,k,ox,oy,opt,t){
    opt=opt||{};var xs=o.xs,n=o.n,sh=xs[0]-30+ox,ts=xs[n-1]+22+ox,i,x,d=k.d;
    g.save();if(opt.alpha!=null)g.globalAlpha=opt.alpha;
    /* 그림자 */
    if(!opt.noShadow){g.fillStyle='rgba(0,0,0,.3)';g.save();g.translate(3,5);keyPath(g,o,d,ox,oy);g.fill();g.restore()}
    /* 손잡이 */
    var bx=sh-24,by=oy+BH/2,ts2=opt.turn?Math.cos(opt.turn*Math.PI/2)*.85+.15:1;
    g.save();g.translate(bx,by);g.scale(1,ts2);
    var bg=g.createLinearGradient(0,-24,0,24);bg.addColorStop(0,'#f8e5a6');bg.addColorStop(.5,'#d9b25a');bg.addColorStop(1,'#9c7428');
    g.fillStyle=bg;g.strokeStyle='#6e4f18';g.lineWidth=2;g.beginPath();g.arc(0,0,25,0,7);g.fill();g.stroke();
    g.fillStyle='#3a2416';g.beginPath();g.arc(-8,0,5.5,0,7);g.fill();
    g.strokeStyle='rgba(255,250,220,.6)';g.lineWidth=2;g.beginPath();g.arc(0,0,16,3.6,4.8);g.stroke();
    g.fillStyle=bg;g.fillRect(19,-11,8,22);g.restore();
    /* 날 */
    var gr=g.createLinearGradient(0,oy,0,oy+BH);gr.addColorStop(0,'#fbefc4');gr.addColorStop(.35,'#e0bf6c');gr.addColorStop(1,'#a8822f');
    keyPath(g,o,d,ox,oy);g.fillStyle=gr;g.fill();g.strokeStyle='#6e4f18';g.lineWidth=1.6;g.stroke();
    g.save();keyPath(g,o,d,ox,oy);g.clip();
    g.fillStyle='rgba(110,80,25,.35)';g.fillRect(sh,oy+40,ts-sh+20,6);g.fillStyle='rgba(255,250,220,.35)';g.fillRect(sh,oy+47,ts-sh+20,1.5);
    /* 반짝임 */
    var gx=((t*70)%520)-80+ox;var sg=g.createLinearGradient(gx-30,0,gx+30,0);sg.addColorStop(0,'rgba(255,255,255,0)');sg.addColorStop(.5,'rgba(255,255,240,.55)');sg.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=sg;g.fillRect(gx-30,oy,60,BH);g.restore();
    /* 막 깎은 면은 은빛 */
    for(i=0;i<n;i++)if(d[i]>0){x=xs[i]+ox;g.strokeStyle='#f4f6fb';g.lineWidth=2.2;g.beginPath();
      g.moveTo(x-10,oy+.5);g.lineTo(x-4,oy+d[i]*U);g.lineTo(x+4,oy+d[i]*U);g.lineTo(x+10,oy+.5);g.stroke();
      g.strokeStyle='rgba(120,130,150,.6)';g.lineWidth=1;g.beginPath();g.moveTo(x-4,oy+d[i]*U+1.5);g.lineTo(x+4,oy+d[i]*U+1.5);g.stroke()}
    g.restore()}

  function drawLock(g,a,t,ka){
    var xs=o.xs,n=o.n,lx=xs[0]-40,rx=Math.min(352,xs[n-1]+48),i,x,top=160,bot=384;
    var show=res&&phase==='test'&&ph>=.65&&ph<1.55||phase==='open'||phase==='leave';
    /* 몸체 */
    g.fillStyle='rgba(0,0,0,.35)';rr(g,lx+5,top+8,rx-lx,bot-top,14);g.fill();
    var bg=g.createLinearGradient(0,top,0,bot);bg.addColorStop(0,'#e7c26a');bg.addColorStop(.45,'#c39a45');bg.addColorStop(1,'#8b6526');
    g.fillStyle=bg;rr(g,lx,top,rx-lx,bot-top,14);g.fill();g.strokeStyle='#5e4214';g.lineWidth=2;g.stroke();
    /* 유리 창 */
    g.fillStyle='rgba(205,232,240,.22)';rr(g,lx+8,top+8,rx-lx-16,S-top-8,8);g.fill();
    /* 플러그 */
    var turn=ka.turn,pg=g.createLinearGradient(0,S,0,bot-6);pg.addColorStop(0,turn>0?'#f3d58a':'#d9b35e');pg.addColorStop(1,'#9a742e');
    g.fillStyle=pg;rr(g,lx+6,S,rx-lx-12,bot-S-8,8);g.fill();g.strokeStyle='rgba(80,55,15,.6)';g.lineWidth=1.5;g.stroke();
    g.fillStyle='rgba(40,25,10,.75)';rr(g,lx+12,BT-4,rx-lx-24,BH+8,5);g.fill();
    /* 핀 구멍 */
    for(i=0;i<n;i++){x=xs[i];g.fillStyle='rgba(30,40,50,.35)';g.fillRect(x-10,CHT,20,BT-CHT);
      g.fillStyle='rgba(220,245,255,.16)';g.fillRect(x-10,CHT,4,BT-CHT)}
    /* 열쇠(자물쇠 안) */
    var inLock=Math.abs(ka.ky-BT)<1;
    if(inLock){g.save();g.beginPath();g.rect(lx-80,BT-6,rx-lx+100,BH+12);g.clip();drawKey(g,o,key,ka.kx,ka.ky,{noShadow:1,turn:turn},t);g.restore()}
    /* 핀 */
    for(i=0;i<n;i++){x=xs[i];var target=REST;
      if(inLock){var s=surfaceAt(o,key.d,x-ka.kx);if(s!=null)target=Math.min(REST,BT+s)}
      pinY[i]+=(target-pinY[i])*Math.min(1,(a.__dt||.016)*28);
      var yb=pinY[i],st=show&&res?res.st[i]:null,wob=0;
      if(st&&phase==='test'){wob=Math.sin(t*46)*2*Math.max(0,1-(ph-.65)/.8)}
      if(turn>0)wob=0;
      var kt=pinTopY(o,i,yb),wt=o.wafers?kt-o.wafers[i]*U:kt,dt2=wt-DRV,ox=x+wob;
      /* 스프링 */
      var sp0=CHT+2,sp1=dt2,coils=7;g.strokeStyle='#cfd6e2';g.lineWidth=1.8;g.beginPath();g.moveTo(ox,sp0);
      for(var c=1;c<=coils*2;c++)g.lineTo(ox+(c%2?7:-7),sp0+(sp1-sp0)*c/(coils*2));g.lineTo(ox,sp1);g.stroke();
      g.strokeStyle='rgba(80,90,110,.5)';g.lineWidth=.8;g.stroke();
      /* 위 핀(드라이버) */
      var dg=g.createLinearGradient(ox-8,0,ox+8,0);dg.addColorStop(0,'#8e9bb0');dg.addColorStop(.4,'#e8eef7');dg.addColorStop(1,'#7a869a');
      g.fillStyle=dg;rr(g,ox-8,dt2,16,DRV,3);g.fill();g.strokeStyle='#4f5a6c';g.lineWidth=1.2;g.stroke();
      /* 마스터 조각 */
      if(o.wafers){var wg=g.createLinearGradient(ox-8,0,ox+8,0);wg.addColorStop(0,'#c99a22');wg.addColorStop(.45,'#ffe48a');wg.addColorStop(1,'#b0861c');
        g.fillStyle=wg;g.fillRect(ox-8,wt,16,kt-wt);g.strokeStyle='#7a5a10';g.lineWidth=1.2;g.strokeRect(ox-8,wt,16,kt-wt);
        g.strokeStyle='rgba(120,80,10,.55)';g.lineWidth=1;for(c=1;c<o.wafers[i];c++){g.beginPath();g.moveTo(ox-8,wt+c*U);g.lineTo(ox+8,wt+c*U);g.stroke()}}
      /* 키 핀: 줄무늬 수 = 깊이 */
      var cg=g.createLinearGradient(ox-8,0,ox+8,0);cg.addColorStop(0,'#b45a2c');cg.addColorStop(.45,'#f5a66e');cg.addColorStop(1,'#9c4a22');
      g.fillStyle=cg;g.beginPath();g.moveTo(ox-8,kt);g.lineTo(ox+8,kt);g.lineTo(ox+8,yb-L0);g.lineTo(ox+2,yb);g.lineTo(ox-2,yb);g.lineTo(ox-8,yb-L0);g.closePath();g.fill();
      g.strokeStyle='#5e2a10';g.lineWidth=1.2;g.stroke();
      for(c=0;c<o.cuts[i];c++){g.fillStyle=c%2?'rgba(255,236,210,.35)':'rgba(80,25,5,.28)';g.fillRect(ox-8,kt+c*U+1,16,U-2)}
      g.strokeStyle='#4a1e08';g.lineWidth=1.6;for(c=1;c<=o.cuts[i];c++){g.beginPath();g.moveTo(ox-8,kt+c*U);g.lineTo(ox+8,kt+c*U);g.stroke()}
      /* 흐림 / 어두움 */
      var v=o.vis[i];
      if(v!=='c'){var FB=BT+BH+4;g.save();g.beginPath();g.rect(x-11,CHT-2,22,FB-CHT+2);g.clip();
        if(v==='f'){var fg=g.createLinearGradient(0,CHT,0,BT);fg.addColorStop(0,'rgba(235,242,248,.97)');fg.addColorStop(1,'rgba(214,226,236,.97)');g.fillStyle=fg;g.fillRect(x-11,CHT-2,22,FB-CHT+2);
          var r0=o.fr[i],ylo=yb-L0-r0[0]*U,yhi=yb-L0-r0[1]*U-2;
          g.fillStyle='rgba(150,80,50,.75)';g.fillRect(x-6,ylo,12,yb-ylo);
          var hg=g.createLinearGradient(0,yhi,0,ylo);hg.addColorStop(0,'rgba(170,100,70,0)');hg.addColorStop(1,'rgba(150,80,50,.7)');g.fillStyle=hg;g.fillRect(x-6,yhi,12,ylo-yhi);
          for(c=0;c<18;c++){g.fillStyle='rgba(255,255,255,'+(.25+hash(c+i*31)*.3)+')';g.fillRect(x-10+hash(c*3+i)*18,CHT+hash(c*5+i*7)*(FB-CHT),3,2)}}
        else{var dk=g.createLinearGradient(0,CHT,0,BT);dk.addColorStop(0,'#3d3a44');dk.addColorStop(1,'#2a2830');g.fillStyle=dk;g.fillRect(x-11,CHT-2,22,FB-CHT+2);
          g.fillStyle='rgba(255,255,255,.15)';g.font=font(14);g.textAlign='center';g.fillText('?',x,S-40)}
        g.restore()}
      /* 결과 표시 */
      if(st!=null){var good=st===0,col=good?'rgba(90,230,120,':'rgba(255,90,80,';
        if(v!=='c'){g.fillStyle=col+'.35)';g.fillRect(x-11,CHT-2,22,BT+BH+6-CHT)}
        g.fillStyle=col+'.95)';g.fillRect(x-13,S-2,26,4);
        g.fillStyle=good?'#5ae67a':'#ff6a5e';g.beginPath();g.arc(x,top-1,6,0,7);g.fill();g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1;g.stroke()}
      else{g.fillStyle='rgba(50,35,15,.5)';g.beginPath();g.arc(x,top-1,4,0,7);g.fill()}}
    /* 전단선 */
    g.strokeStyle=turn>0?'rgba(140,255,160,.9)':'rgba(255,248,210,.75)';g.lineWidth=1.5;g.setLineDash([5,4]);g.lineDashOffset=-t*8;
    g.beginPath();g.moveTo(lx+6,S);g.lineTo(rx-6,S);g.stroke();g.setLineDash([]);
    g.fillStyle='rgba(255,248,210,.8)';g.font=font(10);g.textAlign='right';g.fillText(a.lang==='ko'?'전단선':'shear line',rx-8,S-4);
    /* 유리 반사 */
    g.fillStyle='rgba(255,255,255,.08)';g.beginPath();g.moveTo(lx+20,top+8);g.lineTo(lx+60,top+8);g.lineTo(lx+20,S);g.lineTo(lx+10,S);g.closePath();g.fill();
    /* 나사 */
    [[lx+9,top+9],[rx-9,top+9],[lx+9,bot-9],[rx-9,bot-9]].forEach(function(p){g.fillStyle='#8b6526';g.beginPath();g.arc(p[0],p[1],4,0,7);g.fill();
      g.strokeStyle='#4f3810';g.lineWidth=1.2;g.beginPath();g.moveTo(p[0]-2.5,p[1]);g.lineTo(p[0]+2.5,p[1]);g.stroke()});
    drawCat(g,rx-34,top-12,t)}

  function drawJig(g,a,t,ka){
    var xs=o.xs,n=o.n,i,x,ko=a.lang==='ko';
    /* 작업대 */
    var wg=g.createLinearGradient(0,396,0,540);wg.addColorStop(0,'#8a5a32');wg.addColorStop(1,'#5e3a1e');
    g.fillStyle='rgba(0,0,0,.35)';rr(g,10,402,W-16,140,10);g.fill();
    g.fillStyle=wg;rr(g,6,396,W-12,140,10);g.fill();g.strokeStyle='#3e2512';g.lineWidth=2;g.stroke();
    g.strokeStyle='rgba(255,220,170,.08)';g.lineWidth=1;for(i=0;i<5;i++){g.beginPath();g.moveTo(10,412+i*26);g.bezierCurveTo(120,404+i*26,240,420+i*26,W-10,410+i*26);g.stroke()}
    /* 조준 칸 */
    for(i=0;i<n;i++){x=xs[i];var on=(kb&&i===sel)||(drag&&drag.i===i);
      g.fillStyle=on?'rgba(255,230,150,.22)':'rgba(0,0,0,.12)';rr(g,x-o.sp/2+3,404,o.sp-6,128,6);g.fill();
      /* 깊이 눈금 */
      g.strokeStyle='rgba(255,230,180,.25)';g.lineWidth=1;for(var dd=0;dd<=DMAX;dd++){g.beginPath();g.moveTo(x+13,JT+dd*U);g.lineTo(x+(dd%5===0?19:16),JT+dd*U);g.stroke()}}
    /* 바이스 */
    g.fillStyle='#596273';rr(g,xs[0]-46,JT+BH+1,xs[n-1]-xs[0]+70,6,2);g.fill();g.fillStyle='#8c96a8';g.fillRect(xs[0]-46,JT+BH+1,xs[n-1]-xs[0]+70,1.5);
    /* 열쇠 */
    if(phase==='swap'&&oldKey){var p=ph/.6;
      if(oldKey.done)drawKey(g,o,oldKey,-ease(p)*300,JT-ease(p)*40,{alpha:1-p},t);
      else drawKey(g,o,oldKey,0,JT+ease(p)*160,{alpha:Math.max(0,1-p*1.5)},t)}
    if(Math.abs(ka.ky-BT)>=1)drawKey(g,o,key,ka.kx,ka.ky,{},t);
    /* 가이드 */
    if(o.guides&&(phase==='work'||phase==='intro'))for(i=0;i<n;i++){x=xs[i]+ka.kx;var gy=JT+o.cuts[i]*U;
      g.strokeStyle='rgba(255,90,90,.9)';g.lineWidth=2;g.setLineDash([3,3]);g.beginPath();g.moveTo(x-10,gy);g.lineTo(x+10,gy);g.stroke();g.setLineDash([]);
      g.fillStyle='rgba(255,90,90,.9)';g.beginPath();g.moveTo(x+12,gy);g.lineTo(x+18,gy-4);g.lineTo(x+18,gy+4);g.fill()}
    /* 줄칼 */
    if(phase==='work'&&(drag||fileFx>0||kb)){var fi=drag?drag.i:sel,fx=xs[fi],fy=JT+key.d[fi]*U,str=drag||fileFx>0?Math.sin(t*40)*7:0;
      g.save();g.translate(fx+str,fy-2);g.rotate(-.12);g.globalAlpha=drag||fileFx>0?1:.55;
      g.fillStyle='rgba(0,0,0,.3)';g.fillRect(-36,-2,72,7);
      var fg=g.createLinearGradient(0,-8,0,0);fg.addColorStop(0,'#9aa3b2');fg.addColorStop(1,'#4c5463');g.fillStyle=fg;g.fillRect(-34,-8,68,8);
      g.strokeStyle='rgba(30,35,45,.6)';g.lineWidth=1;for(i=-32;i<34;i+=4){g.beginPath();g.moveTo(i,-8);g.lineTo(i+3,0);g.stroke()}
      g.fillStyle='#8a4a2a';rr(g,34,-10,28,12,4);g.fill();g.fillStyle='rgba(255,200,160,.3)';g.fillRect(36,-9,24,3);g.restore()}
    /* 홈 번호 / 시험 표시 */
    for(i=0;i<n;i++){x=xs[i];var y=JT+BH+18,m=key.mk[i];
      g.fillStyle='rgba(30,18,10,.55)';g.beginPath();g.arc(x,y,10,0,7);g.fill();
      g.fillStyle=m===1?'#7dffa0':m===2?'#ffb35e':m===3?'#ff6a5e':'#fff2d6';g.font=font(14);g.textAlign='center';
      g.fillText(m===2?'▼':m===3?'✕':''+key.d[i],x,y+5);
      if(m===1){g.font=font(10);g.fillText('✓',x+12,y-7)}}
    if(denyT>0){g.fillStyle='rgba(255,120,100,'+denyT*2+')';g.font=font(13);g.textAlign='center';g.fillText(ko?'최대 깊이':'Max depth',xs[sel],JT-12)}
    /* 쇳가루 */
    for(i=0;i<shav.length;i++){var s=shav[i];g.save();g.translate(s.x,s.y);g.rotate(s.rot);g.globalAlpha=Math.max(0,1-s.t/s.l);g.fillStyle=s.c;
      g.fillRect(-s.r*1.6,-s.r*.4,s.r*3.2,s.r*.8);g.restore()}g.globalAlpha=1}

  function drawButton(g,b,label,sub,col,dk,on){
    var x=b[0],y=b[1],w=b[2],h=b[3];g.globalAlpha=on?1:.45;
    g.fillStyle=dk;rr(g,x,y+4,w,h,12);g.fill();
    var gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,col[0]);gr.addColorStop(1,col[1]);g.fillStyle=gr;rr(g,x,y,w,h,12);g.fill();
    g.fillStyle='rgba(255,255,255,.25)';rr(g,x+6,y+4,w-12,8,4);g.fill();
    g.fillStyle='#fff';g.font=font(19);g.textAlign='center';g.fillText(label,x+w/2,y+h/2+(sub?1:7));
    if(sub){g.font=font(11);g.fillStyle='rgba(255,255,255,.85)';g.fillText(sub,x+w/2,y+h-6)}g.globalAlpha=1}

  function drawBubble(g,a,t,cx){
    var ko=a.lang==='ko',bx=92,by=36,bw=258,bh=86,i,x;
    g.globalAlpha=Math.min(1,phase==='intro'?ph/.4:1);
    g.fillStyle='rgba(0,0,0,.3)';rr(g,bx+3,by+4,bw,bh,12);g.fill();
    g.fillStyle='#fff7e8';rr(g,bx,by,bw,bh,12);g.fill();g.beginPath();g.moveTo(bx+2,by+44);g.lineTo(bx-10,by+56);g.lineTo(bx+2,by+58);g.fill();
    var line=o.hint?o.hint[ko?'ko':'en']:null;
    if(!line)line={frost:ko?'흐린 유리 자물쇠예요':'Frosted glass lock',master:ko?'마스터키 자물쇠, 열쇠 2개!':'Master-keyed: two keys!',
      copy:ko?'이 열쇠 복사해 주세요':'Copy my key, please',plate:ko?'뒷판 번호만 있어요':'All I have is the back plate',clear:ko?'열쇠 하나 부탁해요':'One key, please'}[o.type];
    g.fillStyle='#4a2e1d';g.font=font(o.ref?14:15);g.textAlign='left';g.fillText(line,bx+12,by+(o.ref?18:22));
    g.fillStyle='#a08070';g.font=font(11);if(!o.ref)g.fillText((ko?'주문 #':'Order #')+(orderNo+1)+' · '+NAMES[ko?'ko':'en'][o.animal],bx+12,by+bh-8);
    if(o.ref){ /* 손님 열쇠: 기울고 흐릿함 */
      g.save();g.beginPath();rr(g,bx+4,by+24,bw-8,bh-28,8);g.clip();
      g.translate(220,by+34);g.rotate(.045);g.translate(-220,0);g.scale(1,.55);
      var fk={d:refDepths(o).map(function(v){return v==null?0:v}),mk:[]};
      for(var b=0;b<3;b++){g.save();g.translate((b-1)*1.8,(b-1)*2.2);g.globalAlpha=b===1?.6:.3;drawKey(g,o,fk,0,0,{noShadow:1},t);g.restore()}
      g.restore();
      /* 손님 앞발 */
      g.fillStyle=['#e8833a','#9a6a44','#f1ece4','#8d8f99','#7cc06a','#3b4152'][o.animal];
      g.beginPath();g.ellipse(bx+14,by+50,14,11,0,0,7);g.fill();
      if(o.thumb>=0){x=o.xs[o.thumb];g.beginPath();g.ellipse(x,by+46,13,15,.2,0,7);g.fill();g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1.5;g.stroke()}
      for(i=0;i<o.n;i++){x=o.xs[i];if(measured[i]&&i!==o.thumb){var ma=mAnim[i];
          g.strokeStyle='rgba(40,140,170,'+ma+')';g.lineWidth=1.5;g.beginPath();g.moveTo(x-9,by+28);g.lineTo(x-9,by+66);g.moveTo(x+9,by+28);g.lineTo(x+9,by+66);g.moveTo(x-12,by+28+o.cuts[i]*U*.55);g.lineTo(x+12,by+28+o.cuts[i]*U*.55);g.stroke();
          g.fillStyle='rgba(30,120,150,'+ma+')';rr(g,x-10,by+66,20,16,4);g.fill();g.fillStyle='#fff';g.font=font(13);g.textAlign='center';g.fillText(''+o.cuts[i],x,by+79)}
        else if(!measured[i]&&phase==='work'){g.fillStyle='rgba(40,140,170,'+(.35+.25*Math.sin(t*4+i))+')';g.beginPath();g.arc(x,by+74,3.5,0,7);g.fill()}}}
    else if(o.plate){ /* 뒷판 */
      var dg=plateDigits(o),pw=o.n*24+40,px=bx+bw-pw-12,py=by+30;
      var pg=g.createLinearGradient(0,py,0,py+40);pg.addColorStop(0,'#d8b35c');pg.addColorStop(1,'#9c7428');g.fillStyle=pg;rr(g,px,py,pw,40,8);g.fill();g.strokeStyle='#6e4f18';g.lineWidth=1.5;g.stroke();
      g.fillStyle='#6e4f18';g.beginPath();g.arc(px+8,py+20,3,0,7);g.arc(px+pw-8,py+20,3,0,7);g.fill();
      g.fillStyle='rgba(60,40,10,.8)';g.font=font(9);g.textAlign='center';g.fillText(ko?'뒷면':'BACK',px+pw/2,py+10);
      for(i=0;i<o.n;i++){x=px+32+i*24;g.fillStyle='rgba(255,240,200,.35)';g.font=font(18);g.fillText(dg[i]==null?'?':''+dg[i],x+1,py+33);
        g.fillStyle=dg[i]==null?'rgba(70,45,10,.45)':'#4a300c';g.fillText(dg[i]==null?'?':''+dg[i],x,py+32);
        if(dg[i]==null){g.strokeStyle='rgba(70,45,10,.5)';g.lineWidth=1;g.beginPath();g.moveTo(x-7,py+18);g.lineTo(x+6,py+34);g.moveTo(x-4,py+16);g.lineTo(x+8,py+28);g.stroke()}}
      /* 뒤집힌 열쇠 구멍 아이콘 */
      var ix=bx+30,iy=by+52;g.fillStyle='#c8a050';rr(g,ix-14,iy-14,28,28,6);g.fill();g.fillStyle='#3a2416';g.beginPath();g.arc(ix,iy-3,4.5,0,7);g.fill();g.beginPath();g.moveTo(ix-3,iy);g.lineTo(ix+3,iy);g.lineTo(ix+4,iy+9);g.lineTo(ix-4,iy+9);g.fill();
      g.strokeStyle='#4a2e1d';g.lineWidth=1.5;g.beginPath();g.moveTo(ix+26,iy);g.lineTo(ix+16,iy);g.moveTo(ix+20,iy-4);g.lineTo(ix+16,iy);g.lineTo(ix+20,iy+4);g.stroke()}
    else if(o.wafers){
      for(i=0;i<2;i++){x=bx+30+i*44;var dn=i<keysDone||(i===keysDone&&(phase==='open'||phase==='leave'));
        g.save();g.translate(x,by+52);g.fillStyle=dn?'#e7c26a':'rgba(160,130,90,.35)';g.beginPath();g.arc(-8,0,8,0,7);g.fill();g.fillRect(-1,-3,22,6);g.fillRect(14,3,3,4);g.fillRect(9,3,3,3);
        if(dn){g.fillStyle='#3aa655';g.font=font(14);g.textAlign='center';g.fillText('✓',8,-8)}g.restore()}
      g.fillStyle='#7a5a40';g.font=font(12);g.textAlign='left';g.fillText(ko?'금색 조각 = 두 번째 틈':'Gold wafer = a 2nd gap',bx+120,by+57)}
    else{ /* 투명/흐림 */
      g.fillStyle='#7a5a40';g.font=font(12);g.textAlign='left';
      var nf=o.vis.filter(function(v){return v==='f'}).length;
      g.fillText(nf?(ko?'흐린 핀 '+nf+'개 · 시험해서 찾기':nf+' frosted pin'+(nf>1?'s':'')+' · test to find'):(ko?'유리 자물쇠라 다 보여요':'Clear glass: all pins visible'),bx+12,by+48)}
    g.globalAlpha=1}

  function drawChest(g,cx,cy,p,t){
    if(p<=0)return;var s=Math.min(1,p*3),sc=s<1?ease(s)*1.15:1+Math.sin(t*6)*.02,open=ease((p-.25)/.35);
    g.save();g.translate(cx,cy);g.scale(sc*1.45,sc*1.45);
    var gl=g.createRadialGradient(0,-10,4,0,-10,70);gl.addColorStop(0,'rgba(255,230,140,'+(.6*open)+')');gl.addColorStop(1,'rgba(255,230,140,0)');g.fillStyle=gl;g.beginPath();g.arc(0,-10,70,0,7);g.fill();
    g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(0,30,40,7,0,0,7);g.fill();
    g.fillStyle='#8a4f24';rr(g,-34,-6,68,36,5);g.fill();g.strokeStyle='#4e2a10';g.lineWidth=2;g.stroke();
    g.fillStyle='#e7c26a';g.fillRect(-34,4,68,5);g.fillRect(-22,-6,6,36);g.fillRect(16,-6,6,36);
    if(open>0){g.fillStyle='#ffd65a';g.beginPath();g.ellipse(0,-6,30,8,0,0,7);g.fill();
      for(var i=0;i<5;i++){g.fillStyle=['#ffe27a','#8fe3ff','#ff9ac0','#b7ff8a','#ffe27a'][i];g.beginPath();g.arc(-18+i*9,-8-Math.sin(i*1.7)*3,3.5,0,7);g.fill()}}
    g.save();g.translate(0,-6);g.scale(1,Math.cos(open*Math.PI*.62));
    g.fillStyle='#9a5a2a';g.beginPath();g.moveTo(-34,0);g.lineTo(-34,-12);g.quadraticCurveTo(0,-30,34,-12);g.lineTo(34,0);g.closePath();g.fill();g.strokeStyle='#4e2a10';g.lineWidth=2;g.stroke();
    g.fillStyle='#e7c26a';g.fillRect(-22,-20,6,20);g.fillRect(16,-20,6,20);g.restore();
    g.fillStyle='#ffe48a';rr(g,-6,-4,12,12,2);g.fill();g.fillStyle='#4e2a10';g.beginPath();g.arc(0,1,2,0,7);g.fill();
    if(open>.5)for(i=0;i<6;i++){var ang=t*1.5+i*1.05,r=36+Math.sin(t*3+i)*6;g.fillStyle='rgba(255,248,200,'+(.5+.5*Math.sin(t*5+i))+')';
      g.save();g.translate(Math.cos(ang)*r,-14+Math.sin(ang)*r*.5);g.rotate(t);g.fillRect(-1,-5,2,10);g.fillRect(-5,-1,10,2);g.restore()}
    g.restore()}

  function draw(g,a,dt){
    tG+=dt||0;var t=tG,ko=a.lang==='ko';a.__dt=dt;blinkT+=dt||0;
    drawBg(g,t);
    if(!o)return;
    var ka=keyAnim();
    /* 손님 */
    var cx=48,cy=76;if(phase==='intro')cx=lerp(-50,48,ease(ph/.6));
    if(phase==='leave'||phase==='fail'&&ph>.9)cx=lerp(48,-60,ease((phase==='leave'?ph/.75:(ph-.9)/.6)));
    var md=mood;if((md==='oops')&&moodT>1.2)md='idle';
    drawAnimal(g,cx,cy,o.animal,md,t);
    g.fillStyle='#6b4428';g.fillRect(0,116,90,8);g.fillStyle='rgba(255,220,160,.2)';g.fillRect(0,116,90,1.5);
    drawBubble(g,a,t,cx);
    /* 상태 줄: 시간, 남은 빈 열쇠 */
    var tx=16,ty=130,tw=150,fr=Math.max(0,time/TCAP),low=time<10;
    g.fillStyle='rgba(0,0,0,.35)';rr(g,tx,ty,tw,16,8);g.fill();
    var tg=g.createLinearGradient(tx,0,tx+tw,0);tg.addColorStop(0,low?'#ff6a5e':'#ffcf6b');tg.addColorStop(1,low?'#ff9a6a':'#ffe9a8');
    g.fillStyle=tg;rr(g,tx,ty,Math.max(16,tw*fr),16,8);g.fill();
    /* 째깍 시계 */
    g.fillStyle='#f7ecd6';g.beginPath();g.arc(tx,ty+8,11,0,7);g.fill();g.strokeStyle='#6e4f18';g.lineWidth=2;g.stroke();
    var hand=Math.floor(t)*Math.PI/6;g.strokeStyle='#3a2416';g.lineWidth=1.6;g.beginPath();g.moveTo(tx,ty+8);g.lineTo(tx+Math.sin(hand)*8,ty+8-Math.cos(hand)*8);g.stroke();
    g.fillStyle=low?'#fff':'#4a2e1d';g.font=font(12);g.textAlign='left';g.fillText(Math.ceil(time)+(ko?'초':'s'),tx+16,ty+12.5);
    if(lastGain>0){g.globalAlpha=Math.min(1,lastGain);g.fillStyle='#a8f0b0';g.font=font(13);g.fillText('+'+TADD+(ko?'초':'s'),tx+tw+6,ty+13);g.globalAlpha=1}
    drawLock(g,a,t,ka);
    drawJig(g,a,t,ka);
    /* 상자 */
    if(phase==='open')drawChest(g,W/2,470,ph-.25,t);else if(phase==='leave')drawChest(g,W/2+ph*0,470,1-ph/.75,t);
    /* 버튼 */
    var on=phase==='work';
    drawButton(g,BTN_TEST,ko?'🔑 시험':'🔑 Test',ko?'T · 자물쇠에 꽂기':'T · try it in the lock',['#5cc27a','#2f8a4c'],'#1d5a31',on);
    drawButton(g,BTN_NEW,spare>0?(ko?'새 열쇠':'New blank'):(ko?'포기':'Give up'),spare>0?('N · '+(ko?'남은 ':'left ')+spare):(ko?'N · 다음 손님':'N · next order'),spare>0?['#d9a24a','#9c6a22']:['#c46a5a','#8a3a2e'],spare>0?'#5e3a12':'#5a2018',on);
    /* 아래 안내 */
    g.font=font(11);g.textAlign='left';g.fillStyle='rgba(255,233,196,.75)';
    g.fillText(kb?(ko?'←→ 칸 선택 · ↓ 한 칸 깎기 · T 시험 · N 새 열쇠'+(o.ref?' · G 재기':''):'←→ pick · ↓ file · T test · N new'+(o.ref?' · G gauge':''))
      :(ko?'열쇠 홈 자리를 아래로 끌어 깎아요':'Drag down on a notch to file it'),12,607);
    if(phase==='fail'){g.fillStyle='rgba(30,10,5,'+Math.min(.45,ph)+')';g.fillRect(0,0,W,H)}
  }

  window.__ksState=function(){return {phase:phase,order:orderNo,d:key?key.d.slice():null,spare:spare}};
  SG.run({id:'key-smith',title:{ko:'열쇠 장인',en:'Key Smith'},
    how:{ko:'유리 자물쇠 속 핀을 보고 빈 열쇠에 홈을 깎아요. 너무 깊게 깎으면 되돌릴 수 없어요!',en:'Read the pins in the glass lock and file notches into the blank key. Cut too deep and there\'s no going back!'},
    init:init,update:update,draw:draw});
})();
