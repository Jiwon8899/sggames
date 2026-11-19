/* 숨는 카멜레온 (Hide & Hue) — 새가 눈을 뜨기 전에 발밑 땅과 같은 색·무늬로 몸을 바꾼다.
   판정·스케줄·봇은 DOM 없이 돌도록 분리했다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640;
  /* ---------- 상수 ---------- */
  var OA=.35,GRACE=.12,WASH=.25,FADE=5.5,PIG_MAX=100,PIG_C=20,PIG_P=12,PIG_REG=16,T0=50,T_ADD=13,T_CAP=70,CX=118;
  var COLS=[
    {b:'#4fae4a',d:'#2c7a33',l:'#93da7c',ko:'초록',en:'Leaf'},
    {b:'#8e5c37',d:'#5a371d',l:'#c08a5c',ko:'갈색',en:'Bark'},
    {b:'#e2474f',d:'#a1243a',l:'#ff9a90',ko:'빨강',en:'Petal'},
    {b:'#f1a62f',d:'#bb6a12',l:'#ffd978',ko:'노랑',en:'Autumn'},
    {b:'#7b55c4',d:'#4a2f8c',l:'#b597f2',ko:'보라',en:'Berry'}];
  var PATN={ko:['민무늬','줄무늬','점무늬','체크'],en:['Plain','Stripes','Dots','Checker']};

  /* ---------- 손으로 만든 10 스테이지 ----------
     segs:[길이,색,무늬,(반딧불 교대색),(교대 주기s)]  w:[P(멈추지 않고 걸을 때 눈이 완전히 떠지는 위치px),종류,(뜬 시간),(경고 시간)] */
  var C=function(a){return a};
  var DEFS=[
    {v:66,warn:2.2,open:2.2,pat:0,segs:[[240,0,0],[260,1,0],[180,0,0],[240,1,0],[120,0,0]],w:[[300],[720]],
     hint:{ko:'아래 땅과 같은 색으로 바꿔요',en:'Match the ground under you'}},
    {v:68,warn:1.9,open:2.0,pat:1,segs:[[140,0,0],[240,0,1],[260,1,1],[340,0,1],[80,0,0]],w:[[180],[500],[820]],
     hint:{ko:'위·아래로 밀어 무늬도 맞춰요',en:'Swipe up/down to match the pattern too'}},
    {v:70,warn:1.7,open:2.2,pat:1,segs:C([[200,0,0]]).concat([[70,2,2],[70,0,0],[70,2,2],[70,0,0],[70,2,2],[70,0,0],[70,2,2],[70,0,0],[70,2,2],[70,0,0]],[[260,1,1]]),
     w:[[300],[640],[980]],hint:{ko:'꾹 누르면 멈춰요 — 맞는 자리에서 기다려요',en:'Hold to freeze — wait on a matching patch'}},
    {v:72,warn:1.6,open:2.0,pat:1,segs:[[160,0,1],[280,4,2],[240,1,0],[280,3,3],[160,0,0]],w:[[200],[520],[840]],bugs:[110,390,610,900,1040],
     hint:{ko:'눈이 감겼을 때 앞을 톡! 벌레 냠',en:'Tap ahead to eat bugs — only when unseen'}},
    {v:74,warn:1.4,open:2.0,pat:1,segs:[[120,1,1],[150,3,3],[110,0,2],[160,2,2],[90,3,3],[140,4,0],[120,1,1],[150,0,1],[120,3,0]],
     w:[[200],[520],[840]],bugs:[300,700,1000],hint:{ko:'경계가 빨라져요 — 미리 바꿔요',en:'Borders come faster — change early'}},
    {v:76,warn:1.3,open:1.9,kwarn:1.2,kopen:1.5,kid:1,pat:1,segs:[[140,0,0],[160,4,2],[120,2,0],[180,0,1],[100,1,3],[160,3,2],[140,4,1],[160,0,0]],
     w:[[180,'kid'],[460],[755,'kid'],[1022]],bugs:[360,660,960],hint:{ko:'돋보기 아이도 살펴봐요!',en:'A kid with a magnifier is watching too!'}},
    {v:78,warn:1.3,open:2.0,pat:1,rain:1,segs:[[460,0,1],[200,1,0],[180,4,2],[200,2,3],[160,0,0]],w:[[300],[620],[940]],bugs:[200,520,860],
     hint:{ko:'비가 색을 씻어요 — 같은 색을 다시 톡!',en:'Rain washes you out — tap your colour again'}},
    {v:80,warn:1.2,open:2.0,pat:1,night:1,segs:[[180,1,0],[240,0,2,4,3.2],[180,3,3],[220,2,0,3,3.0],[180,4,2],[200,0,0]],w:[[220],[540],[860]],bugs:[420,780,1100],
     hint:{ko:'반딧불이 빛에 땅 색이 바뀌어요',en:'Fireflies shift the ground colour'}},
    {v:82,warn:1.1,open:1.9,kwarn:1.0,kopen:1.4,kid:1,rain:1,pat:1,segs:[[140,3,3],[160,0,1],[120,2,2],[180,1,1],[120,4,0],[160,0,2],[140,3,1],[180,1,0]],
     w:[[160,'kid'],[440],[740,'kid'],[1030]],bugs:[380,690,980],hint:{ko:'비 + 돋보기!',en:'Rain and a magnifier!'}},
    {v:84,warn:1.0,open:1.9,kwarn:1.0,kopen:1.4,kid:1,night:1,pat:1,segs:[[120,0,0],[160,2,2,4,4.0],[140,1,3],[120,3,1],[160,0,1],[120,4,2],[140,2,0],[160,1,1],[100,0,0]],
     w:[[170],[480,'kid'],[750],[1060,'kid']],bugs:[300,620,900,1150],hint:{ko:'마지막 숲! 전부 다 기억해요',en:'Last grove — use everything!'}}
  ];

  function rng(s){s=(s>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function hsh(n){n=(n|0)*374761393+668265263|0;n=(n^(n>>>13))*1274126177|0;return ((n^(n>>>16))>>>0)/4294967296}

  function build(def,n){
    var x=0,segs=[];
    def.segs.forEach(function(s){segs.push({x0:x,x1:x+s[0],c:s[1],p:s[2],alt:s[3]==null?null:s[3],per:s[4]||2});x+=s[0]});
    var kw=def.kwarn||.9,ko=def.kopen||1.4;
    var ws=def.w.map(function(q){var k=q[1]||'bird';return {o:q[0]/def.v,d:q[2]||(k==='kid'?ko:def.open),w:q[3]||(k==='kid'?kw:def.warn),k:k}});
    var last=ws[ws.length-1],gap=Math.max(4.4,def.warn+OA+def.open+1.4),i=0;
    for(var o=last.o+gap;o<400;o+=gap,i++){var kid=def.kid&&i%2===1;ws.push({o:o,d:kid?ko:def.open,w:kid?kw:def.warn,k:kid?'kid':'bird',extra:1})}
    var R=rng(n*97+5);
    return {n:n,def:def,v:def.v,segs:segs,len:x,watches:ws,pat:!!def.pat,rain:!!def.rain,night:!!def.night,kid:!!def.kid,
      bugs:(def.bugs||[]).map(function(b){return {x:b,h:34+R()*34}}),hint:def.hint||null}}

  function segAt(stg,x){var s=stg.segs;if(x<0)x=0;for(var i=0;i<s.length;i++)if(x<s[i].x1)return s[i];return s[s.length-1]}
  function segLook(sg,t){var c=sg.c;if(sg.alt!=null&&Math.floor(t/sg.per)%2===1)c=sg.alt;return {c:c,p:sg.p}}
  function lookAt(stg,x,t){return segLook(segAt(stg,x),t)}
  function stable(sg,a,b){if(sg.alt==null)return true;return Math.floor(a/sg.per)===Math.floor(b/sg.per)}

  /* ---------- 절차 생성 (11스테이지부터) — 봇으로 검증해 통과한 것만 쓴다 ---------- */
  function genDef(n,seed){
    var R=rng(seed),k=n-10;
    var v=Math.min(94,84+k*.4),warn=Math.max(.9,1.1-k*.01),open=1.7+R()*.4,kopen=1.4;
    var night=R()<.35,rain=R()<.35,kid=R()<.45;
    var segs=[],len=0,target=v*15,prev=-1,minL=Math.max(55,90-k),maxL=Math.max(130,220-k*2);
    while(len<target){var L=Math.round(minL+R()*(maxL-minL)),c,p;
      do{c=R()*5|0;p=R()*4|0}while(c*4+p===prev);prev=c*4+p;
      var s=[L,c,p];if(night&&R()<.3){var a;do{a=R()*5|0}while(a===c);s.push(a,2.6+R()*1.0)}
      segs.push(s);len+=L}
    var w=[],P=v*2.4;
    while(true){var isKid=kid&&R()<.45,d=isKid?kopen:open,ww=isKid?.9:warn;if(P+d*v>len-10)break;
      w.push([Math.round(P),isKid?'kid':'bird',d,ww]);P+=d*v+(.5+1.1+OA+R()*1.3)*v}
    var bugs=[];for(var b=200;b<len-80;b+=220+R()*200)bugs.push(Math.round(b));
    return {v:v,warn:warn,open:open,kwarn:.9,kopen:kopen,pat:1,rain:rain?1:0,night:night?1:0,kid:kid?1:0,segs:segs,w:w,bugs:bugs}}
  var cache={},genTries=0;
  function getStage(n){
    if(cache[n])return cache[n];var st;
    if(n<DEFS.length)st=build(DEFS[n],n);
    else{for(var i=0;i<60;i++){genTries++;var cand=build(genDef(n,n*7919+i*104729+13),n);if(trial(cand,bot).ok){st=cand;break}}
      if(!st)st=build({v:86,warn:1.1,open:1.8,pat:1,segs:[[300,0,1],[300,1,0],[300,2,2],[300,3,3]],w:[[260],[600],[900]]},n)}
    return cache[n]=st}

  /* ---------- 시뮬레이션 ---------- */
  function newRun(){var st={n:0,stage:null,prev:null,s:0,t:0,wx:0,time:T0,hearts:3,skin:{c:0,p:0},from:{c:0,p:0},wash:0,age:0,
      pig:PIG_MAX,wi:0,combo:0,score:0,ev:[],over:false,why:'',frozen:false,tongue:0,tongueX:0,bugs:[],cleared:0,perfects:0,spots:0};
    load(st,getStage(0));return st}
  function load(st,stg){st.stage=stg;st.t=0;st.wi=0;st.bugs=stg.bugs.map(function(b){return {x:b.x,h:b.h,alive:true}})}
  function watchNow(st){return st.stage.watches[st.wi]||null}
  function phaseOf(st){var w=watchNow(st);if(!w)return {ph:'idle',u:0};var t=st.t,tw=w.o-OA-w.w;
    if(t<tw)return {ph:'idle',u:0,w:w,until:tw-t};
    if(t<w.o-OA)return {ph:'warn',u:(t-tw)/w.w,w:w};
    if(t<w.o)return {ph:'opening',u:(t-w.o+OA)/OA,w:w};
    return {ph:'open',u:Math.min(1,(t-w.o)/w.d),w:w}}
  function faded(st){return st.stage.rain&&st.age>FADE}
  function under(st){return lookAt(st.stage,st.s,st.t)}
  function mismatch(st){var L=under(st);return st.wash>0||st.skin.c!==L.c||(st.stage.pat&&st.skin.p!==L.p)||faded(st)}
  function paint(st,c,p,cost){if(st.pig<cost){st.ev.push({k:'nopig'});return false}
    st.pig-=cost;st.from={c:st.skin.c,p:st.skin.p};st.skin={c:c,p:p};st.wash=WASH;st.age=0;st.ev.push({k:'paint'});return true}
  function spot(st,why){st.hearts--;st.combo=0;st.spots++;st.ev.push({k:'spot',why:why,k2:(watchNow(st)||{}).k});st.wi++;
    if(st.hearts<=0){st.over=true;st.why='hearts'}}
  function act(st,a){
    if(a.a==='c')paint(st,a.v,st.skin.p,PIG_C);
    else if(a.a==='p')paint(st,st.skin.c,(st.skin.p+a.v+4)%4,PIG_P);
    else if(a.a==='t'){if(st.tongue>0)return;st.tongue=.32;var best=null;
      st.bugs.forEach(function(b){if(b.alive&&b.x>st.s+8&&b.x<st.s+150&&(!best||b.x<best.x))best=b});
      st.tongueX=best?best.x-st.s:90;st.tongueH=best?best.h:30;st.ev.push({k:'tongue'});
      var ph=phaseOf(st).ph;if(ph==='opening'||ph==='open'){spot(st,'tongue');return}
      if(best){best.alive=false;st.combo=st.combo;st.score+=25;st.ev.push({k:'bug',x:best.x-st.s,h:best.h})}}}
  function step(st,dt,ctl){
    if(st.over)return;ctl=ctl||{};
    if(!st.trial){st.time-=dt;if(st.time<=0){st.time=0;st.over=true;st.why='time';st.ev.push({k:'timeout'});return}}
    (ctl.actions||[]).forEach(function(a){if(!st.over)act(st,a)});if(st.over)return;
    st.pig=Math.min(PIG_MAX,st.pig+PIG_REG*dt);st.wash=Math.max(0,st.wash-dt);st.age+=dt;st.tongue=Math.max(0,st.tongue-dt);
    st.frozen=!!ctl.freeze;var stg=st.stage;
    if(!st.frozen){st.s+=stg.v*dt;st.wx+=stg.v*dt}
    st.t+=dt;
    var w=watchNow(st);
    if(w){var pv=st._ph;var ph=phaseOf(st).ph;if(ph!==pv){st._ph=ph;if(ph==='warn'||ph==='opening')st.ev.push({k:ph,kind:w.k})}
      if(st.t>=w.o+w.d){var L=under(st),perfect=st.skin.p===L.p;st.combo++;st.wi++;st._ph='';
        var pts=perfect?30*Math.min(st.combo,5):15;st.score+=pts;if(perfect){st.perfects++;st.time=Math.min(T_CAP,st.time+1)}
        st.ev.push({k:'hide',perfect:perfect,combo:st.combo,pts:pts})}
      else if(st.t>=w.o+GRACE&&mismatch(st)){spot(st,'seen');st._ph=''}}
    if(st.over)return;
    if(st.s>=stg.len){
      if(st.trial){st.done=true;return}
      st.s-=stg.len;st.prev=stg;st.n++;st.cleared++;var bonus=100+10*st.n;st.score+=bonus;
      st.time=Math.min(T_CAP,st.time+T_ADD);load(st,getStage(st.n));st._ph='';st.ev.push({k:'clear',n:st.n,pts:bonus})}}

  /* ---------- 봇: 앞으로 올 땅과 눈 일정을 읽고 미리 바꾸고 필요하면 멈춘다 ---------- */
  function bot(st,dt){
    var stg=st.stage,t=st.t,ctl={freeze:false,actions:[]},w=watchNow(st);
    if(!w)return ctl;var a=w.o,b=w.o+w.d,v=stg.v;
    if(t<a){
      var reach=st.s+v*(a-t);
      if(reach>=stg.len-1&&!st.plan)return ctl;
      if(!st.plan||st.plan.wi!==st.wi){
        var best=null;
        stg.segs.forEach(function(sg){if(sg.x1<=st.s||sg.x0>=reach)return;
          var x=Math.min(reach,sg.x1-.5);if(st.s>=sg.x0)x=Math.max(x,st.s);else if(x-sg.x0<5)return;
          if(!stable(sg,a,b+.02))return;if(!best||x>best.x)best={x:x,sg:sg}});
        if(!best)return ctl;
        st.plan={wi:st.wi,x:best.x,L:segLook(best.sg,a),locked:false}}
      var P=st.plan;
      if(t>=a-.6&&!P.locked){P.locked=true;var L=P.L;
        if(st.skin.c!==L.c||stg.rain)ctl.actions.push({a:'c',v:L.c});
        if(stg.pat&&st.skin.p!==L.p){var d=(L.p-st.skin.p+4)%4;if(d===3)ctl.actions.push({a:'p',v:-1});else for(var i=0;i<d;i++)ctl.actions.push({a:'p',v:1})}}
      if(st.s+v*dt>P.x)ctl.freeze=true;
    }else{
      st.plan=null;var nx=st.s+v*dt,sg=segAt(stg,nx),L2=segLook(sg,t);
      if(nx>=stg.len)return ctl;
      if(L2.c!==st.skin.c||(stg.pat&&L2.p!==st.skin.p)||!stable(sg,t,b+.02))ctl.freeze=true}
    /* 다음 눈(또는 이번 눈 다음 눈)에 숨을 자리가 남는지 확인하고, 없어질 것 같으면 그 자리에 멈춘다 */
    if(!ctl.freeze){var nw=t<a?null:stg.watches[st.wi+1];
      if(nw&&!feasible(stg,st.s+v*dt,nw,Math.max(t+dt,b))&&feasible(stg,st.s,nw,Math.max(t,b)))ctl.freeze=true}
    if(!ctl.freeze&&!ctl.actions.length&&phaseOf(st).ph==='idle'&&(phaseOf(st).until||9)>.6&&st.tongue<=0)
      for(var j=0;j<st.bugs.length;j++){var bg=st.bugs[j];if(bg.alive&&bg.x>st.s+60&&bg.x<st.s+140){ctl.actions.push({a:'t'});break}}
    return ctl}
  function feasible(stg,x,w,t){var reach=x+stg.v*Math.max(0,w.o-t-.05);if(reach>=stg.len-1)return true;
    for(var i=0;i<stg.segs.length;i++){var sg=stg.segs[i];if(sg.x1<=x||sg.x0>=reach)continue;
      var px=Math.min(reach,sg.x1-.5);if(x<sg.x0&&px-sg.x0<5)continue;if(stable(sg,w.o,w.o+w.d+.02))return true}
    return false}
  function trial(stg,brain,opts){opts=opts||{};
    var st={n:stg.n,trial:true,s:0,t:0,wx:0,time:999,hearts:99,skin:opts.skin||{c:(lookAt(stg,0,0).c+2)%5,p:(lookAt(stg,0,0).p+2)%4},from:{c:0,p:0},
      wash:0,age:opts.age||0,pig:opts.pig==null?60:opts.pig,wi:0,combo:0,score:0,ev:[],over:false,tongue:0,bugs:[],spots:0,perfects:0};
    load(st,stg);var dt=1/60,steps=0,nopig=0;
    while(!st.done&&steps<60*60){step(st,dt,brain(st,dt));st.ev.forEach(function(e){if(e.k==='nopig')nopig++});st.ev.length=0;steps++}
    return {ok:!!st.done&&st.spots===0,spots:st.spots,done:!!st.done,time:st.t,nopig:nopig,perfects:st.perfects,score:st.score}}

  var CORE={W:W,H:H,DEFS:DEFS,getStage:getStage,build:build,genDef:genDef,newRun:newRun,step:step,bot:bot,trial:trial,phaseOf:phaseOf,
    lookAt:lookAt,mismatch:mismatch,under:under,segAt:segAt,stable:stable,K:{OA:OA,GRACE:GRACE,WASH:WASH,FADE:FADE,T0:T0,T_ADD:T_ADD,T_CAP:T_CAP},
    genTries:function(){return genTries}};
  if(typeof module!=='undefined'&&module.exports)module.exports=CORE;
  if(typeof SG==='undefined')return;
  /* =================== 화면 =================== */
  var Y0=432,BH=86,PANEL=548,FONT=function(n){return n+'px Jua, system-ui, sans-serif'};
  var SW=[0,1,2,3,4].map(function(i){return {x:34+i*56,y:600,r:22}}),PB={x:277,y:560,w:34,h:50};
  var st,T,fx,press,shown,kb,lastN;
  var K=window.__chamKS||(window.__chamKS={space:false,q:[],kb:false});
  if(!window.__chamKeys){window.__chamKeys=true;
    window.addEventListener('keydown',function(e){var c=e.code;if(c==='Space'){K.space=true;K.kb=true;K.spTap=true;return}if(e.repeat)return;
      var m=/^(Digit|Numpad)([1-5])$/.exec(c);if(m){K.q.push({a:'c',v:+m[2]-1});K.kb=true}
      else if(c==='ArrowUp'||c==='KeyW'){K.q.push({a:'p',v:1});K.kb=true}
      else if(c==='ArrowDown'||c==='KeyS'){K.q.push({a:'p',v:-1});K.kb=true}
      else if(c==='KeyF'||c==='KeyJ'){K.q.push({a:'t'});K.kb=true}});
    window.addEventListener('keyup',function(e){if(e.code==='Space')K.space=false});
    window.addEventListener('blur',function(){K.space=false})}

  function init(){st=newRun();T=0;shown=0;press=null;K.q.length=0;K.space=false;lastN=0;
    fx={blink:2.2,blinkT:0,startle:0,swoop:0,basket:1,flash:0,spark:[],pollen:[],drops:[],eyeFlash:0,clearT:0,look:0,paintT:0};
    for(var i=0;i<26;i++)fx.pollen.push({x:Math.random()*W,y:40+Math.random()*380,r:1+Math.random()*2,s:.3+Math.random()*.7,p:Math.random()*6});
    for(var j=0;j<70;j++)fx.drops.push({x:Math.random()*W,y:Math.random()*H,v:420+Math.random()*260})}

  function update(dt,inp,a){
    T+=dt;var acts=K.q.splice(0),freeze=K.space,ko=a.lang==='ko';
    var spT=K.spTap;K.spTap=false;
    if(inp.tap&&inp.x!=null&&!spT){kb=false;K.kb=false;var x=inp.x,y=inp.y,z='field';
      for(var i=0;i<5;i++)if(Math.hypot(x-SW[i].x,y-SW[i].y)<SW[i].r+7){z='sw';acts.push({a:'c',v:i})}
      if(z==='field'&&x>PB.x-8&&x<PB.x+PB.w+6&&y>PB.y-12&&y<PB.y+PB.h+4){z='pb';acts.push({a:'p',v:y<PB.y+PB.h/2?1:-1})}
      if(z==='field'&&y>PANEL)z='panel';
      press={x:x,y:y,t:0,z:z}}
    if(press){press.t+=dt;
      if(inp.down){if(press.z==='field'||press.z==='panel')freeze=true}
      else{if(press.z==='field'||press.z==='panel'){
          if(inp.swipe==='up'||inp.swipe==='down')acts.push({a:'p',v:inp.swipe==='up'?1:-1});
          else if(!inp.swipe&&press.t<.3&&press.z==='field'&&press.x>CX+30)acts.push({a:'t'})}
        press=null}}
    if(K.kb)kb=true;
    step(st,dt,{freeze:freeze,actions:acts});
    var bx=CX,by=Y0-34;
    st.ev.forEach(function(e){
      if(e.k==='paint'){a.beep(420+st.skin.c*70,.05,'triangle');a.beep(820+st.skin.p*90,.07,'sine');fx.paintT=.3;a.burst(bx+20,by,COLS[st.skin.c].l,6)}
      else if(e.k==='nopig'){a.beep(130,.14,'square');a.pop(bx,by-40,ko?'물감 부족!':'Out of pigment!','#d9d2c4')}
      else if(e.k==='warn'){if(e.kind==='kid'){a.beep(990,.06,'triangle');a.beep(1180,.08,'triangle')}else{a.beep(220,.3,'sine');a.beep(180,.35,'sine')}}
      else if(e.k==='opening'){fx.eyeFlash=1;a.beep(760,.07,'square');a.beep(1140,.12,'triangle')}
      else if(e.k==='hide'){if(e.perfect){a.sfx('coin');a.burst(bx+10,by,'#fff6b0',16);a.burst(bx+10,by,COLS[st.skin.c].l,10);
          for(var i=0;i<9;i++)fx.spark.push({x:bx-40+Math.random()*110,y:by-30+Math.random()*50,t:0,l:.6+Math.random()*.5,r:4+Math.random()*5});
          a.pop(bx+20,by-50,(ko?'완벽 위장!':'Perfect hide!')+(e.combo>1?' x'+Math.min(e.combo,5):''),'#fff27a')}
        else{a.sfx('tap');a.pop(bx+20,by-50,ko?'숨었다!':'Hidden!','#c9f7b5')}}
      else if(e.k==='spot'){a.sfx('hit');a.shake(11);a.burst(bx,by,'#ff5a5a',18);fx.flash=1;fx.startle=1;fx.swoop=e.k2==='kid'?0:1;fx.kidLaugh=e.k2==='kid'?1:0;fx.basket=0;
        a.pop(bx+10,by-56,e.why==='tongue'?(ko?'혀를 들켰다!':'Tongue spotted!'):(ko?'들켰다!':'Spotted!'),'#ff7b6e')}
      else if(e.k==='tongue')a.beep(900,.04,'triangle');
      else if(e.k==='bug'){a.beep(1320,.05,'square');a.beep(1760,.08,'square');a.burst(CX+e.x,Y0-e.h,'#ffe066',8);a.pop(CX+e.x,Y0-e.h-10,ko?'냠! +25':'Yum! +25','#ffe066')}
      else if(e.k==='clear'){a.sfx('win');fx.clearT=1.6;a.burst(bx,by,'#9cf09c',22);a.pop(W/2,270,(ko?'스테이지 클리어! +':'Stage clear! +')+T_ADD+(ko?'초':'s'),'#b6ff9e')}});
    st.ev.length=0;
    if(st.score>shown){a.add(st.score-shown);shown=st.score}
    a.tempo(1+Math.min(.5,st.n*.04));
    fx.startle=Math.max(0,fx.startle-dt*1.4);fx.swoop=Math.max(0,fx.swoop-dt/1.2);fx.flash=Math.max(0,fx.flash-dt*2.2);fx.eyeFlash=Math.max(0,fx.eyeFlash-dt*2.5);
    fx.clearT=Math.max(0,fx.clearT-dt);fx.paintT=Math.max(0,fx.paintT-dt);fx.kidLaugh=Math.max(0,(fx.kidLaugh||0)-dt);
    if(fx.basket<1&&fx.swoop<=0)fx.basket=Math.min(1,fx.basket+dt*1.5);
    if(st.over)a.over()}

  /* ---------- 무늬 ---------- */
  function drawPat(g,p,ax,ay,x,y,w,h,ink,al){
    if(!p)return;g.save();g.globalAlpha*=al;g.fillStyle=ink;g.beginPath();var i,j;
    if(p===1){var P=17,sw=8,k0=Math.floor((x-h-ax)/P)-1;for(var k=k0;ax+k*P<x+w+P;k++){var x0=ax+k*P-(y+h-ay)*0;
        g.moveTo(x0,y+h);g.lineTo(x0+sw,y+h);g.lineTo(x0+sw+h,y);g.lineTo(x0+h,y);g.closePath()}}
    else if(p===2){var S=16,r=4.6,j0=Math.floor((y-ay)/S)-1,j1=Math.ceil((y+h-ay)/S)+1;
      for(j=j0;j<=j1;j++){var off=(j&1)*S/2,i0=Math.floor((x-ax-off)/S)-1,i1=Math.ceil((x+w-ax-off)/S)+1;
        for(i=i0;i<=i1;i++){var cx=ax+off+i*S+S/2,cy=ay+j*S+S/2;g.moveTo(cx+r,cy);g.arc(cx,cy,r,0,6.283)}}}
    else if(p===3){var Q=14,a0=Math.floor((x-ax)/Q)-1,a1=Math.ceil((x+w-ax)/Q)+1,b0=Math.floor((y-ay)/Q)-1,b1=Math.ceil((y+h-ay)/Q)+1;
      for(j=b0;j<=b1;j++)for(i=a0;i<=a1;i++)if(((i+j)&1)===0)g.rect(ax+i*Q,ay+j*Q,Q,Q)}
    g.fill();g.restore()}

  /* ---------- 배경 ---------- */
  function sky(g){var s=st.stage,night=s.night,rain=s.rain,gr=g.createLinearGradient(0,0,0,Y0);
    if(night){gr.addColorStop(0,'#0c1830');gr.addColorStop(.55,'#173a4a');gr.addColorStop(1,'#0f2e26')}
    else if(rain){gr.addColorStop(0,'#a9c2bb');gr.addColorStop(.5,'#5d8a78');gr.addColorStop(1,'#2d5a48')}
    else{gr.addColorStop(0,'#d4f2dc');gr.addColorStop(.45,'#7cc59a');gr.addColorStop(1,'#2f7356')}
    g.fillStyle=gr;g.fillRect(0,0,W,Y0+4);
    var wx=st.wx;
    if(!night&&!rain){g.save();g.globalCompositeOperation='lighter';
      for(var i=0;i<4;i++){var x=((i*130-wx*.05)%520+520)%520-80,al=.07+.04*Math.sin(T*.7+i*2);
        var lg=g.createLinearGradient(x,0,x+90,Y0);lg.addColorStop(0,'rgba(255,250,200,'+al+')');lg.addColorStop(1,'rgba(255,250,200,0)');
        g.fillStyle=lg;g.beginPath();g.moveTo(x,0);g.lineTo(x+46,0);g.lineTo(x+150,Y0);g.lineTo(x+70,Y0);g.fill()}g.restore()}
    if(night){for(var s2=0;s2<30;s2++){var sx=hsh(s2*3)*W,sy=hsh(s2*7)*150+30;g.fillStyle='rgba(255,255,230,'+(.3+.3*Math.sin(T*2+s2))+')';g.fillRect(sx,sy,1.6,1.6)}
      g.fillStyle='rgba(255,250,220,.85)';g.beginPath();g.arc(286,92,18,0,7);g.fill();g.fillStyle='#173a4a';g.beginPath();g.arc(278,86,16,0,7);g.fill()}
    /* 먼 숲 */
    layer(g,wx*.08,240,night?'#16362f':rain?'#4a7563':'#5aa57c',150,46,1);
    layer(g,wx*.18,200,night?'#11302a':rain?'#3e6a57':'#3f8c63',205,40,2);
    /* 줄기와 덩굴 */
    for(var k=-1;k<4;k++){var tx=((k*150-wx*.32)%600+600)%600-90+hsh(k+40)*30;
      g.fillStyle=night?'#1a2a22':rain?'#3a4e40':'#4a5e3e';g.fillRect(tx,40,16,Y0-40);
      g.fillStyle='rgba(0,0,0,.18)';g.fillRect(tx+10,40,6,Y0-40)}
    for(var v=0;v<6;v++){var vx=((v*80-wx*.45)%480+480)%480-60,len=90+hsh(v+9)*120,sw=Math.sin(T*1.1+v)*8;
      g.strokeStyle=night?'#1f4a33':'#2f7a3c';g.lineWidth=3;g.beginPath();g.moveTo(vx,0);g.quadraticCurveTo(vx+sw,len*.6,vx+sw*1.6,len);g.stroke();
      for(var lf=20;lf<len;lf+=22){var t=lf/len,lx=vx+sw*1.6*t*t,ly=lf;g.fillStyle=night?'#2a5e3e':'#47a24f';g.beginPath();
        g.ellipse(lx+(lf/22&1?6:-6),ly,7,3.5,(lf/22&1?.6:-.6),0,7);g.fill()}}
    layer(g,wx*.6,90,night?'#0e2a1f':rain?'#2f5443':'#2e6b45',Y0-26,30,3);
    /* 꽃가루 */
    g.fillStyle=night?'rgba(200,255,180,.6)':'rgba(255,255,220,.7)';
    fx.pollen.forEach(function(p){p.x-=(p.s*14+ (st.frozen?0:st.stage.v*.05))*(1/60);p.y+=Math.sin(T+p.p)*.15;if(p.x<-5)p.x=W+5;
      g.globalAlpha=.4+.4*Math.sin(T*2+p.p);g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.fill()});g.globalAlpha=1}
  function layer(g,off,tile,col,y,amp,seed){g.fillStyle=col;g.beginPath();g.moveTo(0,Y0+4);
    for(var x=-tile;x<=W+tile;x+=tile/6){var wxp=x+off,i=Math.floor(wxp/(tile/6));var h=amp*(.5+hsh(i*13+seed*101)*.8);
      var sx=x-((off%(tile/6))+(tile/6))%(tile/6);g.lineTo(sx,y-h);g.arc(sx+tile/12,y-h,tile/12,Math.PI,0)}
    g.lineTo(W,Y0+4);g.closePath();g.fill()}

  /* ---------- 땅(가지 위 무늬 띠) ---------- */
  function band(g){
    var s=st.stage,ox=CX-st.s;
    if(st.prev)stageBand(g,st.prev,ox-st.prev.len,999);
    stageBand(g,s,ox,st.t);
    stageBand(g,getStage(st.n+1),ox+s.len,0);
    var gr=g.createLinearGradient(0,Y0,0,Y0+BH);gr.addColorStop(0,'rgba(255,255,255,.22)');gr.addColorStop(.12,'rgba(255,255,255,0)');
    gr.addColorStop(.7,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.35)');g.fillStyle=gr;g.fillRect(0,Y0,W,BH);
    /* 가지 아랫면 */
    var bg=g.createLinearGradient(0,Y0+BH,0,PANEL);bg.addColorStop(0,'#4a3020');bg.addColorStop(1,'#20140c');g.fillStyle=bg;g.fillRect(0,Y0+BH,W,PANEL-Y0-BH);
    g.fillStyle='rgba(255,220,170,.08)';for(var i=0;i<9;i++){var x=((i*53-st.wx)%477+477)%477-40;g.fillRect(x,Y0+BH+8+(i%3)*6,30,2)}}
  function stageBand(g,stg,ox,t){
    for(var i=0;i<stg.segs.length;i++){var sg=stg.segs[i],x0=ox+sg.x0,x1=ox+sg.x1;if(x1<-30||x0>W+30)continue;
      var L=segLook(sg,t);material(g,L.c,L.p,x0,x1,ox,sg,i);
      if(sg.alt!=null)fireflies(g,x0,x1,sg,t)}}
  function material(g,c,p,x0,x1,ox,sg,si){var C=COLS[c],w=x1-x0;
    g.save();g.beginPath();g.rect(x0,Y0-16,w,BH+16);g.clip();
    var gr=g.createLinearGradient(0,Y0,0,Y0+BH);gr.addColorStop(0,C.l);gr.addColorStop(.35,C.b);gr.addColorStop(1,C.d);
    g.fillStyle=gr;g.fillRect(x0,Y0,w,BH);
    /* 재질 결 */
    g.strokeStyle='rgba(0,0,0,.12)';g.lineWidth=1.2;g.beginPath();
    var k0=Math.floor((x0-ox)/24)-1,k1=Math.ceil((x1-ox)/24)+1,k;
    if(c===1)for(k=0;k<6;k++){var yy=Y0+10+k*14;g.moveTo(x0,yy);for(var xx=x0;xx<=x1+8;xx+=8)g.lineTo(xx,yy+Math.sin((xx-ox)*.06+k)*2.5)}
    else if(c===0)for(k=k0;k<k1;k++){var vx=ox+k*24+hsh(k)*8,vy=Y0+22+hsh(k+3)*50;g.moveTo(vx-9,vy+4);g.quadraticCurveTo(vx,vy-6,vx+9,vy+4)}
    else for(k=k0;k<k1;k++){var cx=ox+k*24+hsh(k)*10,cy=Y0+18+hsh(k+7)*60;g.moveTo(cx+5,cy);g.arc(cx,cy,5,0,6.28)}
    g.stroke();
    drawPat(g,p,ox,Y0,x0,Y0,w,BH,C.d,.78);
    /* 위쪽 장식: 잎, 껍질 혹, 꽃, 단풍, 열매 */
    for(k=Math.floor((x0-ox)/22)-1;k<=Math.ceil((x1-ox)/22);k++){var dx=ox+k*22+hsh(k*5+c)*8,dy=Y0+1,r=hsh(k*3+1);
      if(c===0){g.fillStyle=r<.5?C.b:C.l;g.beginPath();g.ellipse(dx,dy-3,11,5,-.5+r,0,7);g.fill();g.strokeStyle=C.d;g.lineWidth=1;g.beginPath();g.moveTo(dx-8,dy);g.lineTo(dx+8,dy-6);g.stroke()}
      else if(c===1){g.fillStyle=C.d;g.beginPath();g.ellipse(dx,dy,8+r*5,3+r*2,0,Math.PI,0);g.fill()}
      else if(c===2){g.fillStyle=C.b;for(var pe=0;pe<5;pe++){var an=pe*1.2566+r;g.beginPath();g.arc(dx+Math.cos(an)*4.5,dy-4+Math.sin(an)*4.5,3.8,0,7);g.fill()}
        g.fillStyle=C.l;g.beginPath();g.arc(dx,dy-4,2.4,0,7);g.fill()}
      else if(c===3){g.fillStyle=r<.5?C.b:C.l;g.beginPath();for(var q=0;q<10;q++){var rr=q%2?4:9,aa=q*.628+r;g.lineTo(dx+Math.cos(aa)*rr,dy-3+Math.sin(aa)*rr)}g.fill()}
      else{g.fillStyle=C.b;[[0,0],[5,-3],[-5,-3]].forEach(function(o){g.beginPath();g.arc(dx+o[0],dy-3+o[1],4,0,7);g.fill()});
        g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(dx-1,dy-5,1.3,0,7);g.fill()}}
    g.restore();
    g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x0-1,Y0,2,BH)}
  function fireflies(g,x0,x1,sg,t){var nxt=Math.floor(t/sg.per)%2===1?sg.c:sg.alt,u=(t%sg.per)/sg.per;
    g.save();g.globalCompositeOperation='lighter';
    for(var i=0;i<6;i++){var fx_=x0+((i*37+T*12)%(x1-x0)),fy=Y0-22-hsh(i+sg.x0)*40+Math.sin(T*3+i)*6;
      var col=COLS[u>.7?nxt:(Math.floor(t/sg.per)%2===1?sg.alt:sg.c)].l,rad=u>.7?7+5*Math.sin(T*20):5;
      var rg=g.createRadialGradient(fx_,fy,0,fx_,fy,rad*2.4);rg.addColorStop(0,'rgba(255,255,200,.95)');rg.addColorStop(.3,col);rg.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=rg;g.beginPath();g.arc(fx_,fy,rad*2.4,0,7);g.fill()}
    g.restore()}

  /* ---------- 카멜레온 ---------- */
  function bodyPath(g){g.moveTo(-30,6);g.bezierCurveTo(-37,-14,-12,-28,8,-22);g.bezierCurveTo(17,-19,22,-18,26,-16);
    g.bezierCurveTo(29,-30,47,-29,53,-13);g.bezierCurveTo(59,-8,61,-1,54,3);g.bezierCurveTo(46,8,34,9,26,7);g.bezierCurveTo(12,15,-16,17,-30,6);g.closePath()}
  function tailPath(g,curl){var pts=[],N=26,i,cxp=-47,cyp=13;
    for(i=0;i<=N;i++){var u=i/N,th=-Math.PI/2-u*(2.2+curl*.5)*Math.PI,r=15-11*u;pts.push([cxp+Math.cos(th)*r,cyp+Math.sin(th)*r,8-5.6*u])}
    var path=[[-24,-1,9],[-36,-2,8.6]].concat(pts),L=[],R=[];
    for(i=0;i<path.length;i++){var a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l,t=path[i][2];
      L.push([path[i][0]+nx*t,path[i][1]+ny*t]);R.push([path[i][0]-nx*t,path[i][1]-ny*t])}
    g.moveTo(L[0][0],L[0][1]);for(i=1;i<L.length;i++)g.lineTo(L[i][0],L[i][1]);
    var e=path[path.length-1];g.arc(e[0],e[1],e[2],0,7);for(i=R.length-1;i>=0;i--)g.lineTo(R[i][0],R[i][1]);g.closePath()}
  function skinFill(g,look){var C=COLS[look.c];g.fillStyle=C.b;g.fillRect(-80,-50,150,100);
    if(look.p)drawPat(g,look.p,0,-40,-80,-50,150,100,C.d,.82);
    else{g.fillStyle='rgba(0,0,0,.08)';for(var i=-70;i<60;i+=7)for(var j=-36;j<20;j+=7){g.beginPath();g.arc(i+(j&4?3:0),j,1.2,0,7);g.fill()}}}
  function cham(g,x,y,dim){
    var walk=st.frozen?0:st.wx/7,bob=Math.sin(walk*2)*1.3,jump=-Math.sin(fx.startle*Math.PI)*10,ph=phaseOf(st);
    g.save();g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(x+4,Y0+3,48,7,0,0,7);g.fill();g.restore();
    g.save();g.translate(x,y+bob+jump);g.scale(1.12,1.12);
    var C=COLS[st.skin.c],legC=C.d;
    /* 다리(먼 쪽) */
    function leg(lx,ph2,far){var sw=st.frozen?0:Math.sin(walk+ph2)*5,lift=st.frozen?0:Math.max(0,Math.cos(walk+ph2))*3;
      g.strokeStyle=far?'rgba(0,0,0,.45)':'rgba(0,0,0,.55)';g.lineWidth=8;g.lineCap='round';g.beginPath();g.moveTo(lx,6);g.lineTo(lx+sw*.5,13);g.lineTo(lx+sw,19-lift);g.stroke();
      g.strokeStyle=far?legC:C.b;g.lineWidth=5.5;g.stroke();
      g.fillStyle=far?legC:C.b;g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=1.2;
      g.beginPath();g.ellipse(lx+sw-3,20-lift,3.4,2.4,0,0,7);g.fill();g.stroke();g.beginPath();g.ellipse(lx+sw+3,20-lift,3.4,2.4,0,0,7);g.fill();g.stroke()}
    leg(-12,Math.PI,true);leg(20,0,true);
    /* 먼 눈 */
    eye(g,45,-23,7,'far',ph);
    /* 몸: 색+무늬를 몸 모양 안에 칠하고, 바꿀 때는 머리→꼬리로 물감이 번진다 */
    g.save();g.beginPath();bodyPath(g);tailPath(g,st.frozen?1:0);g.clip();
    if(st.wash>0){skinFill(g,st.from);var u=1-st.wash/WASH,xe=64-u*150;
      g.save();g.beginPath();g.moveTo(80,-60);for(var yy=-60;yy<=60;yy+=6)g.lineTo(xe+Math.sin(yy*.22+T*25)*4,yy);g.lineTo(80,60);g.closePath();g.clip();skinFill(g,st.skin);g.restore();
      g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=3;g.beginPath();for(var y2=-60;y2<=60;y2+=6)g.lineTo(xe+Math.sin(y2*.22+T*25)*4,y2);g.stroke()}
    else skinFill(g,st.skin);
    var sh=g.createLinearGradient(0,-30,0,22);sh.addColorStop(0,'rgba(255,255,255,.32)');sh.addColorStop(.35,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(0,0,0,.32)');
    g.fillStyle=sh;g.fillRect(-80,-50,150,100);
    if(st.stage.rain){var fd=Math.max(0,Math.min(1,(st.age-FADE*.45)/(FADE*.55)));if(fd>0){g.fillStyle='rgba(225,232,236,'+(fd*.62)+')';g.fillRect(-80,-50,150,100);
        g.fillStyle='rgba(255,255,255,'+fd*.5+')';for(var d=0;d<5;d++){var dxp=-26+d*14,dyp=((T*20+d*13)%30)-8;g.beginPath();g.ellipse(dxp,dyp,1.6,3,0,0,7);g.fill()}}}
    g.restore();
    g.strokeStyle='rgba(25,30,20,.6)';g.lineWidth=2;g.beginPath();bodyPath(g);g.stroke();g.beginPath();tailPath(g,st.frozen?1:0);g.stroke();
    /* 볏, 입, 볼 */
    g.strokeStyle='rgba(25,30,20,.35)';g.lineWidth=1.5;g.beginPath();g.moveTo(28,-17);g.quadraticCurveTo(38,-31,51,-15);g.stroke();
    g.strokeStyle='rgba(25,30,20,.6)';g.lineWidth=1.6;g.beginPath();g.moveTo(56,1);g.quadraticCurveTo(46,5,38,2);g.stroke();
    g.fillStyle='rgba(255,120,140,.45)';g.beginPath();g.ellipse(44,-1,4,2.4,0,0,7);g.fill();
    /* 다리(가까운 쪽) */
    leg(-6,0,false);leg(26,Math.PI,false);
    /* 가까운 눈: 새(또는 돋보기)를 따라간다 */
    eye(g,37,-13,9.5,'near',ph);
    /* 간식 바구니 */
    if(fx.basket>.02){g.save();g.translate(-4,-25);g.scale(fx.basket,fx.basket);
      g.strokeStyle='#7a4a1c';g.lineWidth=2;g.beginPath();g.arc(0,-4,8,Math.PI,0);g.stroke();
      ['#ff4d6d','#ffb703','#ff4d6d'].forEach(function(c2,i){g.fillStyle=c2;g.beginPath();g.arc(-5+i*5,-4-(i===1?2:0),3.4,0,7);g.fill()});
      g.fillStyle='#c98a3c';g.beginPath();g.moveTo(-10,-3);g.lineTo(10,-3);g.lineTo(7,6);g.lineTo(-7,6);g.closePath();g.fill();
      g.strokeStyle='#8a5a22';g.lineWidth=1;for(var bb=-6;bb<=6;bb+=4){g.beginPath();g.moveTo(bb,-3);g.lineTo(bb*.8,6);g.stroke()}g.restore()}
    /* 혀 */
    if(st.tongue>0){var k=1-st.tongue/.32,ext=Math.sin(Math.min(1,k)*Math.PI),tx=56+(st.tongueX/1.12-56)*ext,ty=(22-st.tongueH)/1.12*ext+1*(1-ext);
      g.strokeStyle='#ff6f91';g.lineWidth=3.2;g.lineCap='round';g.beginPath();g.moveTo(55,1);g.quadraticCurveTo((55+tx)/2,ty-10*ext,tx,ty);g.stroke();
      g.fillStyle='#ff4f7b';g.beginPath();g.arc(tx,ty,4.4,0,7);g.fill()}
    g.restore()}
  function eye(g,ex,ey,r,which,ph){
    var tgt=null,sx=CX+ex*1.12,sy=Y0-22+ey*1.12;
    if(which==='near'&&ph.ph!=='idle'&&ph.w){var wp=watcherPos(ph);tgt=[wp[0]-sx,wp[1]-sy]}
    if(which==='far'){var nb=null;st.bugs.forEach(function(b){if(b.alive&&b.x>st.s&&b.x<st.s+200&&(!nb||b.x<nb.x))nb=b});
      tgt=nb?[nb.x-st.s-ex,Y0-nb.h-sy]:[60,10+Math.sin(T*.7)*20]}
    if(!tgt)tgt=[Math.cos(T*.9)*40+30,Math.sin(T*1.3)*20-10];
    var an=Math.atan2(tgt[1],tgt[0]),st2=fx.startle>.1,C=COLS[st.skin.c];
    var tg=g.createRadialGradient(ex-r*.3,ey-r*.3,1,ex,ey,r);tg.addColorStop(0,C.l);tg.addColorStop(1,C.b);
    g.fillStyle=tg;g.strokeStyle='rgba(25,30,20,.6)';g.lineWidth=1.6;g.beginPath();g.arc(ex,ey,r*(st2?1.15:1),0,7);g.fill();g.stroke();
    g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1;g.beginPath();g.arc(ex,ey,r*.75,0,7);g.stroke();
    var ox=Math.cos(an)*r*.32,oy=Math.sin(an)*r*.32,er=r*(st2?.72:.6);
    g.fillStyle='#fff';g.beginPath();g.arc(ex+ox,ey+oy,er,0,7);g.fill();
    g.fillStyle='#1d1a16';g.beginPath();g.arc(ex+ox+Math.cos(an)*er*.35,ey+oy+Math.sin(an)*er*.35,er*(st2?.32:.52),0,7);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(ex+ox-er*.25,ey+oy-er*.3,er*.2,0,7);g.fill();
    fx.blink-=1/120;if(fx.blink<0){fx.blinkT=.14;fx.blink=2+Math.random()*3}
    if(fx.blinkT>0&&!st2){if(which==='near')fx.blinkT-=1/60;g.fillStyle=C.b;g.beginPath();g.arc(ex,ey,r+.5,Math.PI,0);g.lineTo(ex+r,ey+1);g.lineTo(ex-r,ey+1);g.fill();
      g.strokeStyle='rgba(25,30,20,.6)';g.beginPath();g.moveTo(ex-r,ey+1);g.lineTo(ex+r,ey+1);g.stroke()}}

  /* ---------- 지켜보는 이: 새와 돋보기 아이 ---------- */
  var BIRD=[250,200];
  function watcherPos(ph){if(ph.w.k==='kid'){var l=lensPos(ph);return l}
    if(ph.ph==='warn')return birdCircle();return [BIRD[0]-10,BIRD[1]+8]}
  function birdCircle(){return [W/2+Math.cos(T*1.5)*125,160+Math.sin(T*3)*16]}
  function kidX(ph){var u=ph.ph==='warn'?ph.u:1;return 46-(1-Math.min(1,u*1.6))*120}
  function lensPos(ph){var kx=kidX(ph);if(ph.ph==='warn')return [kx+52,Y0-128+Math.sin(T*3)*4];
    return [CX+12+Math.sin(T*2.2)*22,Y0-38+Math.cos(T*1.7)*6]}
  function bird(g,x,y,s,flap,eyeU,face){g.save();g.translate(x,y);g.scale(s*face,s);
    var wf=Math.sin(flap)*.9;
    g.fillStyle='#2c6e8f';g.save();g.rotate(-.3-wf*.6);g.beginPath();g.ellipse(-4,-6,24,9,-.4,0,7);g.fill();g.restore();
    var bg=g.createRadialGradient(-4,-6,2,0,0,22);bg.addColorStop(0,'#5bc0d9');bg.addColorStop(1,'#2a7896');
    g.fillStyle=bg;g.beginPath();g.ellipse(0,0,22,17,0,0,7);g.fill();
    g.fillStyle='#f4e7c8';g.beginPath();g.ellipse(4,6,12,9,0,0,7);g.fill();
    g.fillStyle='#22597a';g.beginPath();g.moveTo(-6,-14);g.quadraticCurveTo(-10,-30,2,-24);g.quadraticCurveTo(4,-32,10,-22);g.lineTo(6,-14);g.fill();
    g.fillStyle='#ff9f1c';g.beginPath();g.moveTo(-18,-2);g.lineTo(-30,3);g.lineTo(-18,6);g.closePath();g.fill();
    g.fillStyle='#2a7896';g.save();g.rotate(.3+wf*.7);g.beginPath();g.ellipse(6,-4,22,8,.5,0,7);g.fill();g.restore();
    g.fillStyle='#ffeb99';g.beginPath();g.arc(-9,-5,5,0,7);g.fill();
    if(eyeU>0){g.fillStyle='#1b1b1b';g.beginPath();g.ellipse(-10,-4,2.6,2.6*eyeU,0,0,7);g.fill()}
    else{g.strokeStyle='#1b1b1b';g.lineWidth=1.5;g.beginPath();g.arc(-9,-5,3,.2,Math.PI-.2);g.stroke()}
    g.restore()}
  function bigEye(g,x,y,u,scan){/* 눈 아이콘: 눈꺼풀이 열리고 노란 시선이 가지를 훑는다 */
    g.save();g.translate(x,y);var w=34,h=20*u;
    g.fillStyle='rgba(20,10,0,.35)';g.beginPath();g.ellipse(2,3,w+6,22,0,0,7);g.fill();
    g.fillStyle='#fffdf2';g.strokeStyle='#3b2410';g.lineWidth=3.5;g.beginPath();g.moveTo(-w,0);g.quadraticCurveTo(0,-h*1.6,w,0);g.quadraticCurveTo(0,h*1.6,-w,0);g.closePath();g.fill();
    g.save();g.clip();var px=Math.max(-14,Math.min(14,(CX-x)*.08+Math.sin(T*3)*3));
    g.fillStyle='#f4b400';g.beginPath();g.arc(px,0,14,0,7);g.fill();g.fillStyle='#111';g.beginPath();g.ellipse(px,0,4,11,0,0,7);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(px-5,-5,3,0,7);g.fill();g.restore();
    g.stroke();
    g.strokeStyle='#3b2410';g.lineWidth=3;for(var i=-2;i<=2;i++){g.beginPath();g.moveTo(i*11,-h*.8-2);g.lineTo(i*14,-h*.8-10-(u*4));g.stroke()}
    g.restore()}
  function beam(g,x,y,al){var sw=Math.sin(T*2.4)*38,tx=CX+10+sw;
    g.save();var gr=g.createLinearGradient(x,y,tx,Y0);gr.addColorStop(0,'rgba(255,236,120,'+(.5*al)+')');gr.addColorStop(1,'rgba(255,236,120,'+(.16*al)+')');
    g.fillStyle=gr;g.beginPath();g.moveTo(x-8,y);g.lineTo(x+8,y);g.lineTo(tx+62,Y0+30);g.lineTo(tx-62,Y0+30);g.closePath();g.fill();
    g.strokeStyle='rgba(255,240,150,'+(.45*al)+')';g.lineWidth=2;g.setLineDash([6,6]);g.lineDashOffset=-T*40;g.stroke();g.setLineDash([]);g.restore()}
  function kid(g,ph){var kx=kidX(ph),ky=Y0-118+Math.sin(T*2)*2,lp=lensPos(ph);
    g.save();
    /* 몸(가지 뒤에서 상반신만) */
    var sg=g.createLinearGradient(0,ky+20,0,Y0);sg.addColorStop(0,'#ff9a62');sg.addColorStop(1,'#e2683a');g.fillStyle=sg;
    g.beginPath();g.moveTo(kx-30,Y0+4);g.quadraticCurveTo(kx-32,ky+30,kx,ky+26);g.quadraticCurveTo(kx+32,ky+30,kx+30,Y0+4);g.closePath();g.fill();
    g.fillStyle='rgba(255,255,255,.85)';g.fillRect(kx-24,ky+58,48,6);
    /* 팔: 어깨 → 손잡이 */
    var hx=lp[0]-20,hy=lp[1]+20;
    g.strokeStyle='#e2683a';g.lineWidth=11;g.lineCap='round';g.beginPath();g.moveTo(kx+18,ky+40);g.quadraticCurveTo(kx+30,hy+10,hx-6,hy+6);g.stroke();
    g.strokeStyle='#6b4a2a';g.lineWidth=6;g.beginPath();g.moveTo(lp[0]-18,lp[1]+18);g.lineTo(hx-12,hy+12);g.stroke();
    g.fillStyle='#f6c7a0';g.beginPath();g.arc(hx-8,hy+8,6,0,7);g.fill();
    /* 머리 */
    g.fillStyle='#f6c7a0';g.beginPath();g.arc(kx,ky,22,0,7);g.fill();
    g.fillStyle='#4a3022';g.beginPath();g.arc(kx-2,ky-4,22,Math.PI*.95,Math.PI*1.75);g.lineTo(kx-2,ky-4);g.fill();
    g.fillStyle='#3d8bfd';g.beginPath();g.ellipse(kx,ky-15,22,10,0,Math.PI,0);g.fill();g.beginPath();g.ellipse(kx+22,ky-15,14,4,0,0,Math.PI);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(kx,ky-22,3,0,7);g.fill();
    var look=Math.atan2(lp[1]-ky,lp[0]-kx);
    [[2,0,5],[15,-1,4.4]].forEach(function(e){g.fillStyle='#fff';g.beginPath();g.arc(kx+e[0],ky+e[1],e[2],0,7);g.fill();
      g.fillStyle='#222';g.beginPath();g.arc(kx+e[0]+Math.cos(look)*1.8,ky+e[1]+Math.sin(look)*1.8,2.5,0,7);g.fill()});
    g.fillStyle='rgba(255,110,120,.45)';g.beginPath();g.arc(kx-6,ky+9,4,0,7);g.fill();
    g.strokeStyle='#8a4a3a';g.lineWidth=2;g.beginPath();if(fx.kidLaugh>0)g.arc(kx+9,ky+9,5,0,Math.PI);else g.arc(kx+10,ky+12,2.6,0,7);g.stroke();
    /* 렌즈 */
    var open=ph.ph==='open'||ph.ph==='opening';
    if(open){g.save();g.beginPath();g.arc(lp[0],lp[1],27,0,7);g.clip();g.fillStyle='rgba(255,250,200,.22)';g.fillRect(lp[0]-30,lp[1]-30,60,60);g.restore()}
    g.fillStyle='rgba(200,240,255,.2)';g.strokeStyle='#5a3d22';g.lineWidth=5;g.beginPath();g.arc(lp[0],lp[1],28,0,7);g.fill();g.stroke();
    g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=3;g.beginPath();g.arc(lp[0],lp[1],20,3.6,4.4);g.stroke();
    g.restore()}

  /* ---------- 그리기 ---------- */
  function draw(g,a){
    var ko=a.lang==='ko',s=st.stage,ph=phaseOf(st);
    sky(g);
    /* 하늘의 새 */
    var watching=ph.ph==='opening'||ph.ph==='open',isKid=ph.w&&ph.w.k==='kid';
    if(fx.swoop>0){var q=1-fx.swoop,bx,by;if(q<.45){var e=q/.45;bx=BIRD[0]+(CX-BIRD[0])*e;by=BIRD[1]+(Y0-60-BIRD[1])*e*e}else{var e2=(q-.45)/.55;bx=CX-e2*220;by=Y0-60-e2*330}
      bird(g,bx,by,1.1,T*24,0,1);if(q>.45){g.fillStyle='#c98a3c';g.beginPath();g.moveTo(bx-6,by+16);g.lineTo(bx+8,by+16);g.lineTo(bx+5,by+24);g.lineTo(bx-3,by+24);g.fill();
        g.fillStyle='#ff4d6d';g.beginPath();g.arc(bx,by+14,3,0,7);g.fill()}}
    else if(ph.w&&!isKid&&(ph.ph==='warn')){var bc=birdCircle();bird(g,bc[0],bc[1],.75+ph.u*.2,T*14,0,Math.sin(T*1.5)>0?1:-1)}
    else if(watching&&!isKid){bird(g,BIRD[0],BIRD[1]+Math.sin(T*6)*2,1.15,T*10,ph.ph==='open'?1:ph.u,1)}
    band(g);
    /* 새 그림자가 땅을 지나간다 = 곧 눈을 뜬다 */
    if(ph.ph==='warn'&&!isKid){var shx=CX+Math.cos(T*1.5+.4)*150,al=.18+.22*ph.u;g.fillStyle='rgba(10,20,10,'+al+')';g.beginPath();g.ellipse(shx,Y0+30,46+ph.u*16,11,0,0,7);g.fill();
      g.beginPath();g.ellipse(shx-30,Y0+26,22,6,-.3,0,7);g.ellipse(shx+30,Y0+26,22,6,.3,0,7);g.fill()}
    /* 벌레 */
    var ox=CX-st.s;st.bugs.forEach(function(b){if(!b.alive)return;var x=ox+b.x,y=Y0-b.h+Math.sin(T*4+b.x)*4;if(x<-20||x>W+20)return;
      g.save();g.globalCompositeOperation='lighter';var rg=g.createRadialGradient(x,y,0,x,y,16);rg.addColorStop(0,'rgba(255,240,140,.55)');rg.addColorStop(1,'rgba(255,240,140,0)');g.fillStyle=rg;g.beginPath();g.arc(x,y,16,0,7);g.fill();g.restore();
      var wf=Math.sin(T*40+b.x)*3;g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(x-3,y-5-wf*.3,5,2.5+wf*.4,-.6,0,7);g.ellipse(x+3,y-5-wf*.3,5,2.5+wf*.4,.6,0,7);g.fill();
      g.fillStyle='#2b2b38';g.beginPath();g.ellipse(x,y,6,4.5,0,0,7);g.fill();g.fillStyle='#ffd23f';g.beginPath();g.ellipse(x+3,y+1,3,2.6,0,0,7);g.fill()});
    /* 발밑 표시 */
    var L=under(st),mm=mismatch(st);
    g.save();g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=2;g.setLineDash([4,4]);g.beginPath();g.ellipse(CX+4,Y0+16,26,6,0,0,7);g.stroke();g.setLineDash([]);g.restore();
    cham(g,CX,Y0-22);
    /* 눈 뜨는 순간 */
    if(watching){g.fillStyle='rgba(0,0,0,'+(.14*(ph.ph==='open'?1:ph.u))+')';g.fillRect(0,30,W,PANEL-30);
      if(!isKid){beam(g,BIRD[0]-12,BIRD[1]+30,ph.ph==='open'?1:ph.u);bigEye(g,BIRD[0]-6,BIRD[1]-60,ph.ph==='open'?1:ph.u)}}
    if(ph.w&&isKid&&ph.ph!=='idle')kid(g,ph);
    if(fx.kidLaugh>0&&!(ph.w&&isKid&&ph.ph!=='idle')){kid(g,{ph:'open',u:1,w:{k:'kid'}})}
    /* 숨었나? 말풍선 */
    if(ph.ph!=='idle'){var bx2=CX+30,by2=Y0-92+Math.sin(T*5)*2;g.fillStyle=mm?'#ff5a4f':'#46c46a';g.beginPath();g.arc(bx2,by2,13,0,7);g.fill();
      g.beginPath();g.moveTo(bx2-5,by2+10);g.lineTo(bx2-12,by2+20);g.lineTo(bx2+2,by2+12);g.fill();
      g.strokeStyle='#fff';g.lineWidth=3.2;g.lineCap='round';g.beginPath();if(mm){g.moveTo(bx2,by2-7);g.lineTo(bx2,by2+1);g.moveTo(bx2,by2+6);g.lineTo(bx2,by2+6.5)}else{g.moveTo(bx2-6,by2);g.lineTo(bx2-1,by2+5);g.lineTo(bx2+7,by2-5)}g.stroke()}
    /* 반짝이 */
    for(var i=fx.spark.length-1;i>=0;i--){var sp=fx.spark[i];sp.t+=1/60;if(sp.t>sp.l){fx.spark.splice(i,1);continue}var k=Math.sin(sp.t/sp.l*Math.PI),r=sp.r*k;
      g.fillStyle='rgba(255,250,190,'+k+')';g.beginPath();g.moveTo(sp.x,sp.y-r*2);g.lineTo(sp.x+r*.4,sp.y-r*.4);g.lineTo(sp.x+r*2,sp.y);g.lineTo(sp.x+r*.4,sp.y+r*.4);g.lineTo(sp.x,sp.y+r*2);g.lineTo(sp.x-r*.4,sp.y+r*.4);g.lineTo(sp.x-r*2,sp.y);g.lineTo(sp.x-r*.4,sp.y-r*.4);g.fill()}
    /* 날씨 */
    if(s.rain){g.strokeStyle='rgba(220,235,255,.45)';g.lineWidth=1.3;g.beginPath();fx.drops.forEach(function(d){d.y+=d.v/60;d.x-=d.v/600;if(d.y>PANEL){d.y=-10;d.x=Math.random()*W+40}g.moveTo(d.x,d.y);g.lineTo(d.x-3,d.y-14)});g.stroke()}
    if(s.night){g.fillStyle='rgba(8,14,40,.28)';g.fillRect(0,0,W,PANEL)}
    if(fx.flash>0){g.fillStyle='rgba(255,40,40,'+fx.flash*.28+')';g.fillRect(0,0,W,H)}
    if(fx.eyeFlash>0&&!isKid){g.fillStyle='rgba(255,250,210,'+fx.eyeFlash*.25+')';g.fillRect(0,0,W,PANEL)}
    ui(g,ko,ph)}

  function ui(g,ko,ph){var s=st.stage;
    /* 위 줄: 하트, 스테이지, 시간 */
    g.fillStyle='rgba(10,30,20,.35)';g.beginPath();g.roundRect?g.roundRect(8,34,W-16,28,14):g.rect(8,34,W-16,28);g.fill();
    for(var i=0;i<3;i++){var hx=24+i*24,hy=48,on=i<st.hearts;g.fillStyle=on?'#ff5a6e':'rgba(255,255,255,.25)';g.beginPath();g.moveTo(hx,hy+7);
      g.bezierCurveTo(hx-12,hy-1,hx-6,hy-10,hx,hy-4);g.bezierCurveTo(hx+6,hy-10,hx+12,hy-1,hx,hy+7);g.fill()}
    g.font=FONT(15);g.textAlign='center';g.fillStyle='#fff';
    g.fillText((ko?'스테이지 ':'Stage ')+(st.n+1)+(st.combo>1?(ko?'  · 연속 x':'  · combo x')+Math.min(st.combo,5):''),W/2,53);
    var tl=Math.ceil(st.time),low=st.time<10;g.textAlign='right';g.font=FONT(low?17+Math.sin(T*12):16);g.fillStyle=low?'#ff8a7a':'#fff';
    g.fillText(tl+(ko?'초':'s'),W-18,54);g.strokeStyle=g.fillStyle;g.lineWidth=2;g.beginPath();g.arc(W-58+(tl>=10?-4:0),48,6,0,7);g.moveTo(W-58+(tl>=10?-4:0),48);g.lineTo(W-58+(tl>=10?-4:0),44);g.stroke();
    /* 힌트 */
    var hint=s.hint;if(hint&&st.t<7){var al=Math.min(1,(7-st.t)/1.2);g.globalAlpha=al;g.font=FONT(17);g.textAlign='center';var tx=hint[ko?'ko':'en'],tw=g.measureText(tx).width+28;
      g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.roundRect?g.roundRect(W/2-tw/2,72,tw,32,16):g.rect(W/2-tw/2,72,tw,32);g.fill();g.fillStyle='#24513a';g.fillText(tx,W/2,94);
      if(kb&&st.n<4){g.font=FONT(12);g.fillStyle='rgba(255,255,255,.95)';g.fillText(ko?'1~5 색 · ↑↓ 무늬 · 스페이스 꾹 멈춤 · F 혀':'1-5 colour · ↑↓ pattern · hold Space freeze · F tongue',W/2,122)}
      g.globalAlpha=1}
    if(fx.clearT>0){g.globalAlpha=Math.min(1,fx.clearT);g.font=FONT(30);g.textAlign='center';g.fillStyle='rgba(0,0,0,.3)';g.fillText((ko?'스테이지 ':'Stage ')+(st.n+1),W/2+2,182);g.fillStyle='#fff';g.fillText((ko?'스테이지 ':'Stage ')+(st.n+1),W/2,180);g.globalAlpha=1}
    if(ph.ph==='warn'||ph.ph==='opening'){g.font=FONT(16);g.textAlign='center';g.fillStyle='rgba(255,255,255,'+(.6+.4*Math.sin(T*14))+')';
      var wt=ph.w.k==='kid'?(ko?'돋보기가 와요!':'Magnifier coming!'):(ko?'새가 눈을 떠요!':'The bird is about to look!');if(!(s.hint&&st.t<7))g.fillText(wt,W/2,94)}
    /* 아래 판 */
    var pg=g.createLinearGradient(0,PANEL,0,H);pg.addColorStop(0,'#2a1d14');pg.addColorStop(1,'#140d08');g.fillStyle=pg;g.fillRect(0,PANEL,W,H-PANEL);
    g.fillStyle='rgba(120,200,120,.18)';for(var l=0;l<12;l++){g.beginPath();g.ellipse(l*34+(T*3%34),PANEL+2,16,6,(l&1)?.4:-.4,0,7);g.fill()}
    /* 물감 */
    var pw=236;g.fillStyle='rgba(255,255,255,.12)';g.fillRect(14,560,pw,7);var pf=st.pig/100,pgr=g.createLinearGradient(14,0,14+pw,0);
    pgr.addColorStop(0,COLS[0].b);pgr.addColorStop(.25,COLS[3].b);pgr.addColorStop(.5,COLS[2].b);pgr.addColorStop(.75,COLS[4].b);pgr.addColorStop(1,COLS[1].l);
    g.fillStyle=pgr;g.fillRect(14,560,pw*pf,7);g.fillStyle='rgba(255,255,255,.35)';for(var m=1;m<5;m++)g.fillRect(14+pw*m*.2,560,1,7);
    SW.forEach(function(w,i){var sel=st.skin.c===i,lift=sel?-4:0,ok=st.pig>=20;g.save();g.globalAlpha=ok||sel?1:.5;
      g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.arc(w.x,w.y+3,w.r,0,7);g.fill();
      var C=COLS[i],rg=g.createRadialGradient(w.x-7,w.y-8+lift,2,w.x,w.y+lift,w.r);rg.addColorStop(0,C.l);rg.addColorStop(1,C.b);
      g.fillStyle=rg;g.beginPath();g.arc(w.x,w.y+lift,w.r,0,7);g.fill();
      if(sel){g.strokeStyle='#fff';g.lineWidth=3.5;g.stroke()}
      g.font=FONT(11);g.textAlign='center';g.fillStyle='rgba(255,255,255,.9)';g.fillText(i+1,w.x,w.y+lift+4);g.restore()});
    /* 무늬 상자 */
    var C2=COLS[st.skin.c];g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.roundRect?g.roundRect(PB.x-4,PB.y-6,PB.w+8,PB.h+12,10):g.rect(PB.x-4,PB.y-6,PB.w+8,PB.h+12);g.fill();
    g.save();g.beginPath();g.rect(PB.x+3,PB.y+12,PB.w-6,PB.h-24);g.clip();g.fillStyle=C2.b;g.fillRect(PB.x,PB.y,PB.w,PB.h);drawPat(g,st.skin.p,PB.x,PB.y,PB.x,PB.y,PB.w,PB.h,C2.d,.85);g.restore();
    g.fillStyle='#fff';g.beginPath();g.moveTo(PB.x+PB.w/2,PB.y-2);g.lineTo(PB.x+PB.w/2-7,PB.y+8);g.lineTo(PB.x+PB.w/2+7,PB.y+8);g.fill();
    g.beginPath();g.moveTo(PB.x+PB.w/2,PB.y+PB.h+2);g.lineTo(PB.x+PB.w/2-7,PB.y+PB.h-8);g.lineTo(PB.x+PB.w/2+7,PB.y+PB.h-8);g.fill();
    if(s.pat){g.font=FONT(11);g.textAlign='center';g.fillStyle='rgba(255,255,255,.75)';g.fillText(PATN[ko?'ko':'en'][st.skin.p],PB.x+PB.w/2+30>W-10?PB.x+PB.w/2:PB.x+PB.w/2,PB.y-10)}
    if(st.frozen){g.font=FONT(13);g.textAlign='center';g.fillStyle='rgba(255,255,255,.9)';g.fillText(ko?'멈춤':'Freeze',CX+4,Y0+BH+22)}}

  window.__cham={st:function(){return st},core:CORE};
  SG.run({id:'chameleon',title:{ko:'숨는 카멜레온',en:'Hide & Hue'},
    how:{ko:'새가 눈을 뜨면 발밑 땅과 같은 색·무늬여야 해요! 아래 물감을 톡, 위·아래로 밀면 무늬, 꾹 누르면 멈춰요.',
         en:'When the bird opens its eye, match the ground under you! Tap a paint, swipe up/down for patterns, hold to freeze.'},
    init:init,update:update,draw:draw});
})();
