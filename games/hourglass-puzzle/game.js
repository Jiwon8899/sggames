/* 모래시계 요리사 (Hourglass Chef) — 숫자 시계 없이 모래시계 몇 개만으로 '정확히 N분'을 재는 퍼즐.
   시간은 '딩!'(모래시계 하나가 다 떨어지는 순간)까지만 흐르고, 모든 행동은 그 순간에만 할 수 있다.
   상태 모델과 탐색기(solve/genPuzzle)는 DOM 없이 돌아간다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,SPM=0.5,TIME0=55,TIME_ADD=14,TIME_CAP=70,PENALTY=5;

  /* ---------- 모래시계 상태 모델 ----------
     glass {c: 용량(분), top: 위쪽 모래(분)}. 뒤집으면 top = c - top (반쯤 흐른 것도 그대로 뒤집힌다).
     위쪽에 모래가 있으면 1분에 1씩 흐른다. 시간은 다음 사건까지만 건너뛴다. */
  function mkGlasses(caps){return caps.map(function(c){return {c:c,top:0}})}
  function flip(gl){gl.top=gl.c-gl.top}
  function nextDt(gls){var m=Infinity;for(var i=0;i<gls.length;i++)if(gls[i].top>0&&gls[i].top<m)m=gls[i].top;return m}
  function advance(gls){var dt=nextDt(gls),out=[];if(dt===Infinity)return null;
    for(var i=0;i<gls.length;i++)if(gls[i].top>0){gls[i].top-=dt;if(gls[i].top===0)out.push(i)}
    return {dt:dt,emptied:out}}
  /* 한 판의 진행: t는 사건 순간에만 정확한 정수. e0 퍼즐은 달걀이 t=0에 이미 들어가 있다 */
  function newRun(pz){return {gls:mkGlasses(pz.caps),t:0,egg:pz.e0?0:null,served:0,flips:0,done:false}}
  /* known=false 는 '사건 사이(모래가 흐르는 중)' — 정확한 시각을 모르므로 거절한다 */
  function tryEgg(run,known){if(!known)return {ok:false,why:'unknown'};if(run.egg!=null)return {ok:false,why:'already'};run.egg=run.t;return {ok:true}}
  function tryServe(run,pz,known){
    if(!known)return {ok:false,why:'unknown'};
    if(run.egg==null)return {ok:false,why:'noegg'};
    var e=run.t-run.egg,want=pz.tg[run.served];
    if(e!==want)return {ok:false,why:'wrong',off:e-want};
    run.served++;if(run.served>=pz.tg.length)run.done=true;return {ok:true,dish:run.served-1}}
  function tryFlip(run,i,known){if(!known)return {ok:false,why:'unknown'};flip(run.gls[i]);run.flips++;return {ok:true}}
  function tryWait(run){var r=advance(run.gls);if(!r)return null;run.t+=r.dt;return r}

  /* ---------- 사건 상태 공간 탐색 ----------
     상태 = (위쪽 모래들, 달걀 후 경과 e(-1=아직), 담은 접시 수 k). 뒤집기 비용 1, 나머지 0 인 0-1 BFS.
     noPartial=true 면 '반쯤 흐른 모래시계 뒤집기'를 금지(그 요령이 꼭 필요한 퍼즐인지 판별). */
  function solve(pz,noPartial){
    var caps=pz.caps,tg=pz.tg,maxT=tg[tg.length-1],n=caps.length,dist={},seen=0;
    function key(tops,e,k){return tops.join(',')+'|'+e+'|'+k}
    var st={tops:caps.map(function(){return 0}),e:pz.e0?0:-1,k:0,f:0,par:null,a:null};
    dist[key(st.tops,st.e,st.k)]=0;
    var front=[st],fi=0,back=[];
    function push(s,tops,e,k,df,a){var c={tops:tops,e:e,k:k,f:s.f+df,par:s,a:a},kc=key(tops,e,k);
      if(dist[kc]==null||dist[kc]>c.f){dist[kc]=c.f;(df?back:front).push(c)}}
    while(true){
      if(fi>=front.length){if(!back.length)return null;front=back;fi=0;back=[]}
      var s=front[fi++];if(dist[key(s.tops,s.e,s.k)]<s.f)continue;
      if(++seen>300000)return null;
      if(s.k>=tg.length){var path=[],p=s;while(p.par){path.unshift(p.a);p=p.par}return {flips:s.f,path:path}}
      for(var i=0;i<n;i++){
        if(noPartial&&s.tops[i]>0&&s.tops[i]<caps[i])continue;
        var t2=s.tops.slice();t2[i]=caps[i]-t2[i];push(s,t2,s.e,s.k,1,'F'+i)}
      if(s.e<0)push(s,s.tops,0,s.k,0,'E');
      if(s.e>=0&&s.e===tg[s.k])push(s,s.tops,s.e,s.k+1,0,'S');
      var m=Infinity;for(i=0;i<n;i++)if(s.tops[i]>0&&s.tops[i]<m)m=s.tops[i];
      if(m<Infinity&&(s.e<0||s.e+m<=maxT))push(s,s.tops.map(function(v){return v>0?v-m:0}),s.e<0?-1:s.e+m,s.k,0,'W')}
  }
  /* 경로를 실제 게임 규칙(tryFlip/tryEgg/tryServe/tryWait)으로 재생해 본다 → 총 게임 시간 */
  function replay(pz,path){var run=newRun(pz);
    for(var i=0;i<path.length;i++){var a=path[i],r;
      if(a[0]==='F')r=tryFlip(run,+a.slice(1),true);else if(a==='E')r=tryEgg(run,true);
      else if(a==='S'){r=tryServe(run,pz,true);if(!r.ok)return null}else if(a==='W'){if(!tryWait(run))return null}}
    return run.done?run.t:null}

  /* ---------- 손으로 만든 14 퍼즐 ----------
     caps: 모래시계 용량, tg: 달걀을 넣고 몇 분 뒤에 담을지(접시 수만큼), e0: 달걀이 이미 들어가 있음 */
  var HAND=[
    {caps:[3],tg:[3],hint:{ko:'모래시계로 시간을 재요',en:'Measure time with hourglasses'}},
    {caps:[2,3],tg:[5],hint:{ko:'딩! 하면 다음 모래시계를 뒤집어요',en:'On the ding, flip the next glass'}},
    {caps:[3,4],tg:[1],hint:{ko:'달걀은 아무 딩! 순간에나 넣어도 돼요',en:'The egg can go in at any ding'}},
    {caps:[3,5],tg:[7],e0:1,hint:{ko:'반쯤 흐른 모래시계도 뒤집을 수 있어요',en:'You can flip a glass that is half run'}},
    {caps:[4,7],tg:[9],e0:1,hint:{ko:'전설의 문제: 4분과 7분으로 9분!',en:'The classic: 9 minutes from 4 and 7'}},
    {caps:[5,7],tg:[3],hint:{ko:'달걀을 늦게 넣는 게 답일 때도 있어요',en:'Sometimes the egg should go in late'}},
    {caps:[7,11],tg:[15],e0:1,hint:{ko:'남은 모래를 다시 쓰세요',en:'Reuse the leftover sand'}},
    {caps:[4,7],tg:[2]},
    {caps:[3,4,6],tg:[5],e0:1,hint:{ko:'모래시계가 세 개!',en:'Three glasses!'}},
    {caps:[4,9,11],tg:[6]},
    {caps:[4,5,9],tg:[11],e0:1},
    {caps:[3,5],tg:[2,4],hint:{ko:'달걀 두 개! 접시마다 시간이 달라요',en:'Two eggs, two serving times'}},
    {caps:[5,7],tg:[3,6]},
    {caps:[3,8],tg:[2,7]}
  ];
  HAND.forEach(function(p){p.hand=true});

  /* ---------- 절차 생성 ---------- */
  function rng(seed){var s=seed>>>0||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  /* 해가 있고, 최소 뒤집기 3~6, 총 시간 ≤ 22분. 가능하면 '반쯤 흐른 뒤집기'가 꼭 필요한 퍼즐을 고른다 */
  function genPuzzle(level,seed){
    var r=rng(seed*7919+level*104729+13),fallback=null;
    for(var tries=0;tries<80;tries++){
      var n=(level>18&&r()<.55)||r()<.25?3:2,caps=[],guard=0;
      while(caps.length<n&&guard++<50){var c=2+Math.floor(r()*(n===3?9:10));if(caps.indexOf(c)<0)caps.push(c)}
      caps.sort(function(a,b){return a-b});
      var two=r()<.28,e0=!two&&r()<.6,tg=[1+Math.floor(r()*14)];
      if(two){tg=[1+Math.floor(r()*8)];tg.push(tg[0]+1+Math.floor(r()*6))}
      if(!two&&caps.indexOf(tg[0])>=0)continue;
      var pz={caps:caps,tg:tg,e0:e0?1:0},s=solve(pz);
      if(!s||s.flips<3||s.flips>6)continue;
      var T=replay(pz,s.path);if(T==null||T>22)continue;
      pz.min=s.flips;pz.sol=s.path;pz.T=T;
      var np=solve(pz,true);pz.partial=!np||np.flips>s.flips;
      if(pz.partial)return pz;if(!fallback)fallback=pz}
    return fallback||{caps:[4,7],tg:[9],e0:1,min:5,partial:true}}
  function puzzleFor(level,seed){
    if(level<HAND.length){var h=HAND[level];if(h.min==null){var s=solve(h);h.min=s.flips;h.sol=s.path}return h}
    return genPuzzle(level,seed)}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={mkGlasses:mkGlasses,flip:flip,nextDt:nextDt,advance:advance,newRun:newRun,tryEgg:tryEgg,tryServe:tryServe,
      tryFlip:tryFlip,tryWait:tryWait,solve:solve,replay:replay,HAND:HAND,genPuzzle:genPuzzle,puzzleFor:puzzleFor};
  if(typeof SG==='undefined')return;

  /* =================================================================== 게임 =================================================================== */
  var SAND=[['#f4c45a','#c98a2a','#ffe6a0'],['#f29a7e','#c2604a','#ffd2c2'],['#9fd8b0','#4f9a6c','#d9f5df']];
  var GY0=126,GY1=334,GCY=(GY0+GY1)/2;
  var BTN=[
    {id:'egg',x:14,y:488,w:160,h:44,ko:'달걀 넣기',en:'Put egg in',k:'E'},
    {id:'serve',x:186,y:488,w:160,h:44,ko:'담기',en:'Serve',k:'S'},
    {id:'skip',x:14,y:540,w:236,h:48,ko:'다음 딩!까지',en:'Skip to next',k:'Space'},
    {id:'reset',x:258,y:540,w:88,h:48,ko:'처음부터',en:'Reset',k:'R'}];
  var lvl,pz,run,mode,modeT,flow,timeLeft,streak,attempt,seed,toast,gfx,cat,egg,reveal,steam,clouds,stars,tG=0,keyQ=[],kbFlag=false,kbUsed=false,
      initT=0,pendingSkip=false,press={},dishes,lastGain=0,api=null;

  if(!window.__hgKeys){window.__hgKeys=true;
    window.addEventListener('keydown',function(e){kbFlag=true;if(e.repeat)return;keyQ.push(e.code)})}

  function layout(n){var xs=n===1?[180]:n===2?[112,248]:[66,180,294],w=n===3?96:n===2?118:126;return xs.map(function(x){return {x:x,w:w}})}
  function startPuzzle(){pz=puzzleFor(lvl,seed);run=newRun(pz);mode='play';modeT=0;flow=null;attempt=0;pendingSkip=false;
    var L=layout(pz.caps.length);
    gfx=pz.caps.map(function(c,i){return {x:L[i].x,w:L[i].w,flipT:0,fromTop:0,glow:0,grains:[],wob:0}});
    egg={inT:pz.e0?1:0,drop:0};dishes=[];reveal=null}
  function resetPuzzle(){run=newRun(pz);mode='play';modeT=0;flow=null;pendingSkip=false;egg={inT:pz.e0?1:0,drop:0};dishes=[];
    gfx.forEach(function(g){g.flipT=0;g.glow=0;g.grains=[]})}

  function init(a){api=a;lvl=0;seed=(Math.random()*1e9)>>>0;timeLeft=TIME0;streak=0;toast=null;keyQ=[];kbFlag=false;initT=0;lastGain=0;
    cat={nod:0,joy:0,shock:0,blink:2,tap:0,shrug:0};
    if(!steam){steam=[];clouds=[];stars=[];for(var i=0;i<4;i++)clouds.push({x:200+i*60,y:118+i*17%40,s:.5+i%3*.2,v:5+i*2});
      for(i=0;i<14;i++)stars.push({x:206+((i*53)%132),y:106+((i*37)%70),p:i*1.7})}
    startPuzzle()}

  function say(ko,en,col){toast={s:api&&api.lang==='ko'?ko:en,t:0,c:col||'#fff4dc'}}
  function unknown(){say('어, 정확히 몇 분인지 모르겠어요','Hmm, not sure exactly when that is');cat.shrug=1;api.beep(220,.12,'triangle')}
  function anyFlipping(){for(var i=0;i<gfx.length;i++)if(gfx[i].flipT>0)return true;return false}
  function known(){return mode==='play'}

  /* ---------- 행동 ---------- */
  function doFlip(i){if(mode==='win'||mode==='fail'||i>=gfx.length)return;
    if(!known()){unknown();return}
    var gf=gfx[i];if(gf.flipT>0)return;gf.fromTop=run.gls[i].top;gf.fromC=run.gls[i].c;tryFlip(run,i,true);gf.flipT=1;
    api.beep(380+i*60,.06,'triangle');setTimeout(function(){api.beep(260+i*40,.08,'sine')},120);
    if(run.gls[i].top>0||gf.fromTop>0)api.burst(gf.x,GCY,SAND[i][0],6)}
  function doEgg(){if(mode==='win'||mode==='fail')return;
    if(!known()){unknown();return}
    var r=tryEgg(run,true);if(!r.ok){say('달걀은 이미 냄비 속이에요','The egg is already in');return}
    egg.drop=1;api.sfx('jump')}
  function doServe(){if(mode==='win'||mode==='fail')return;
    if(!known()){unknown();return}
    var r=tryServe(run,pz,true);
    if(!r.ok&&r.why==='noegg'){say('먼저 달걀을 넣어요','Put the egg in first');api.beep(240,.1,'triangle');return}
    if(!r.ok){fail(r.off);return}
    if(!run.done){dishes.push(1);api.sfx('coin');api.burst(240,400,'#fff3c4',12);
      api.pop(240,380,(api.lang==='ko'?'한 접시 완벽!':'One perfect!'),'#ffe27a');cat.joy=.8;return}
    win()}
  function doSkip(){if(mode==='win'||mode==='fail')return;
    if(mode==='flow'){unknown();return}
    if(nextDt(run.gls)===Infinity){say('먼저 모래시계를 뒤집어요','Flip an hourglass first');api.beep(240,.1,'triangle');return}
    if(anyFlipping()){pendingSkip=true;return}
    startFlow()}
  function startFlow(){pendingSkip=false;var dt=nextDt(run.gls);
    flow={dt:dt,el:0,dur:dt*SPM,from:run.gls.map(function(g){return g.top})};mode='flow';api.beep(520,.05,'sine')}
  function endFlow(){var r=tryWait(run);mode='play';flow=null;cat.nod=1;
    r.emptied.forEach(function(i){gfx[i].glow=1;api.burst(gfx[i].x,GY1-30,SAND[i][2],8)});
    api.beep(1568,.45,'sine');setTimeout(function(){api&&api.beep(2093,.35,'sine')},70);
    if(pendingSkip)pendingSkip=false}
  function fail(off){mode='fail';modeT=0;streak=0;attempt++;timeLeft-=PENALTY;
    reveal={kind:off>0?'hard':'runny',off:off,t:0};
    api.sfx('hit');api.shake(6);cat.shock=1;
    api.pop(180,232,(off>0?'+':'')+off+(api.lang==='ko'?'분':' min'),'#ff8f7a');api.pop(300,70,'-'+PENALTY+'s','#ff8f7a');
    api.burst(240,400,off>0?'#e7d9a6':'#ffb300',14)}
  function win(){mode='win';modeT=0;
    var extra=Math.max(0,run.flips-pz.min),bonus=Math.max(0,10-4*extra),first=attempt===0;
    if(first)streak++;var sb=first?3*Math.min(streak,5):0,pts=10+bonus+sb;
    api.add(pts);timeLeft=Math.min(TIME_CAP,timeLeft+TIME_ADD);lastGain=1;
    reveal={kind:'perfect',t:0,pts:pts,extra:extra,bonus:bonus,sb:sb};
    api.sfx('win');cat.joy=1;api.burst(180,250,'#ffe27a',18);api.burst(180,250,'#ffffff',10);
    api.pop(180,190,'+'+pts,'#ffe27a')}

  /* ---------- 업데이트 ---------- */
  function hit(b,x,y){return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h}
  function update(dt,inp,a){
    api=a;initT+=dt;modeT+=dt;
    if(mode!=='win')timeLeft-=dt;
    if(lastGain>0)lastGain-=dt;
    if(toast){toast.t+=dt;if(toast.t>2.2)toast=null}
    for(var k in press){press[k]-=dt*4;if(press[k]<=0)delete press[k]}
    /* 키보드 */
    var q=keyQ;keyQ=[];
    if(initT>.25)q.forEach(function(c){kbUsed=true;
      if(c==='Digit1'||c==='Numpad1')doFlip(0);else if(c==='Digit2'||c==='Numpad2')doFlip(1);else if(c==='Digit3'||c==='Numpad3')doFlip(2);
      else if(c==='Space'){press.skip=1;doSkip()}else if(c==='KeyE'){press.egg=1;doEgg()}else if(c==='KeyS'){press.serve=1;doServe()}
      else if(c==='KeyR'){press.reset=1;doReset()}});
    /* 터치/마우스 */
    if(inp.tap&&!kbFlag&&inp.x!=null){var x=inp.x,y=inp.y,done=false;
      for(var i=0;i<BTN.length&&!done;i++)if(hit(BTN[i],x,y)){done=true;press[BTN[i].id]=1;
        ({egg:doEgg,serve:doServe,skip:doSkip,reset:doReset})[BTN[i].id]()}
      if(!done&&y>GY0-14&&y<GY1+22)for(i=0;i<gfx.length;i++)if(Math.abs(x-gfx[i].x)<gfx[i].w/2+4){doFlip(i);break}}
    kbFlag=false;
    /* 뒤집기 애니메이션 */
    for(i=0;i<gfx.length;i++){var gf=gfx[i];if(gf.flipT>0){gf.flipT-=dt/.38;if(gf.flipT<=0){gf.flipT=0;gf.wob=1;
          if(run.gls[i].top>0)api.burst(gf.x,GCY-20,SAND[i][0],5)}}
      if(gf.glow>0)gf.glow-=dt*.9;if(gf.wob>0)gf.wob-=dt*3}
    if(pendingSkip&&mode==='play'&&!anyFlipping())startFlow();
    if(mode==='flow'){flow.el+=dt;cat.tap+=dt;if(flow.el>=flow.dur)endFlow()}
    if(egg.drop>0){egg.drop-=dt/.45;if(egg.drop<=0){egg.drop=0;egg.inT=1;api.burst(240,402,'#bfe6ff',12);api.beep(300,.08,'sine')}}
    if(mode==='fail'&&modeT>1.7)resetPuzzle();
    if(mode==='win'&&modeT>1.9){lvl++;startPuzzle()}
    cat.nod=Math.max(0,cat.nod-dt*2.2);cat.joy=Math.max(0,cat.joy-dt*.6);cat.shock=Math.max(0,cat.shock-dt*.6);cat.shrug=Math.max(0,cat.shrug-dt*1.5);
    cat.blink-=dt;if(cat.blink<-.13)cat.blink=2+Math.random()*2.5;
    if(timeLeft<=0){timeLeft=0;a.over()}
  }
  function doReset(){if(mode==='win')return;if(mode==='fail'){resetPuzzle();return}resetPuzzle();say('처음부터 다시!','Starting over!');api.beep(330,.08,'triangle')}

  /* =================================================================== 그리기 =================================================================== */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function font(s){return s+'px Jua, system-ui, sans-serif'}
  function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}

  function drawBackground(g,t,dt){
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#161b36');gr.addColorStop(.35,'#272a4e');gr.addColorStop(.7,'#4a3446');gr.addColorStop(1,'#2a1c24');
    g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
    /* 타일 벽 */
    var fl=.85+Math.sin(t*9)*.05+Math.sin(t*23)*.04;
    g.save();g.beginPath();g.rect(0,210,W,232);g.clip();
    for(var y=210;y<442;y+=22)for(var x=((y/22)%2)*-15;x<W;x+=30){
      g.fillStyle='rgba(255,236,214,.055)';g.fillRect(x+1,y+1,28,20);g.fillStyle='rgba(255,255,255,.05)';g.fillRect(x+2,y+2,26,3)}
    var rg=g.createRadialGradient(240,450,10,240,450,260);rg.addColorStop(0,'rgba(255,150,70,'+(.38*fl)+')');rg.addColorStop(1,'rgba(255,120,60,0)');
    g.fillStyle=rg;g.fillRect(0,210,W,232);g.restore();
    /* 창문 */
    var wx=200,wy=100,ww=146,wh=104;
    g.fillStyle='#3b2a2c';rr(g,wx-7,wy-7,ww+14,wh+14,8);g.fill();
    var sk=g.createLinearGradient(0,wy,0,wy+wh);sk.addColorStop(0,'#0c1530');sk.addColorStop(1,'#2a3a6e');
    g.fillStyle=sk;g.fillRect(wx,wy,ww,wh);
    g.save();g.beginPath();g.rect(wx,wy,ww,wh);g.clip();
    stars.forEach(function(s){g.fillStyle='rgba(255,250,220,'+(.35+.35*Math.sin(t*1.7+s.p))+')';g.fillRect(s.x,s.y,1.6,1.6)});
    var mg=g.createRadialGradient(310,128,4,310,128,46);mg.addColorStop(0,'rgba(255,246,200,.5)');mg.addColorStop(1,'rgba(255,246,200,0)');
    g.fillStyle=mg;g.fillRect(wx,wy,ww,wh);
    g.fillStyle='#fff3c6';g.beginPath();g.arc(310,128,15,0,7);g.fill();g.fillStyle='rgba(210,190,140,.5)';g.beginPath();g.arc(305,124,3,0,7);g.arc(314,134,2.2,0,7);g.fill();
    clouds.forEach(function(c){c.x+=c.v*dt;if(c.x>wx+ww+50)c.x=wx-50;
      g.fillStyle='rgba(150,165,215,.45)';g.beginPath();g.ellipse(c.x,c.y,26*c.s+8,8*c.s+3,0,0,7);g.ellipse(c.x-9,c.y-5,12*c.s+3,8*c.s+2,0,0,7);g.ellipse(c.x+9,c.y-6,14*c.s+4,9*c.s+2,0,0,7);g.fill()});
    g.restore();
    g.fillStyle='#5a3f38';g.fillRect(wx+ww/2-3,wy,6,wh);g.fillRect(wx,wy+wh/2-3,ww,6);
    g.fillStyle='#6d4c42';rr(g,wx-12,wy+wh+4,ww+24,9,4);g.fill();
    /* 걸린 조리도구 */
    g.strokeStyle='#b9a58a';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(14,108);g.lineTo(176,108);g.stroke();
    g.fillStyle='#d8c6a8';g.beginPath();g.arc(14,108,4,0,7);g.arc(176,108,4,0,7);g.fill();
    for(var i=0;i<4;i++){var ux=34+i*40,sw=Math.sin(t*1.3+i*1.1)*.09;g.save();g.translate(ux,108);g.rotate(sw);
      g.strokeStyle='#cbb89a';g.lineWidth=1.5;g.beginPath();g.arc(0,5,4,0,7);g.stroke();
      if(i===0){g.strokeStyle='#9aa6b8';g.lineWidth=4;g.beginPath();g.moveTo(0,9);g.lineTo(0,52);g.stroke();
        g.fillStyle='#8792a6';g.beginPath();g.arc(0,60,11,0,3.14);g.fill();g.fillStyle='#b9c4d6';g.fillRect(-11,58,22,3)}
      else if(i===1){g.fillStyle='#8a5a3a';g.fillRect(-2.5,9,5,34);g.fillStyle='#e9a24f';rr(g,-9,42,18,26,5);g.fill();g.fillStyle='rgba(0,0,0,.15)';g.fillRect(-6,48,2,14);g.fillRect(-1,48,2,14);g.fillRect(4,48,2,14)}
      else if(i===2){g.fillStyle='#8a5a3a';g.fillRect(-2.5,9,5,24);g.strokeStyle='#c7d0dc';g.lineWidth=1.6;
        for(var k=-2;k<=2;k++){g.beginPath();g.ellipse(0,48,3+Math.abs(k)*2.6,16,0,0,7);g.stroke()}}
      else{g.fillStyle='#5b6170';g.fillRect(-2.5,9,5,22);g.fillStyle='#3e4350';g.beginPath();g.ellipse(0,52,20,20,0,0,7);g.fill();
        g.fillStyle='#4f5564';g.beginPath();g.ellipse(-2,50,15,15,0,0,7);g.fill()}
      g.restore()}
    /* 선반 */
    g.fillStyle='rgba(0,0,0,.28)';g.fillRect(0,350,W,10);
    var sh=g.createLinearGradient(0,336,0,352);sh.addColorStop(0,'#a87a52');sh.addColorStop(1,'#6d4a30');g.fillStyle=sh;g.fillRect(0,336,W,15);
    g.fillStyle='rgba(255,220,170,.25)';g.fillRect(0,336,W,2)}

  /* 모래시계 하나: 로컬 좌표(가운데 0,0), 위 bulb 는 y<0 */
  function bulbHW(u,bw){var nk=3.5,v=Math.min(1,u/.72),h=nk+(bw-nk)*Math.pow(Math.sin(v*Math.PI/2),.85);if(u>.84)h*=1-.16*Math.pow((u-.84)/.16,2);return h}
  function bulbPath(g,dir,L,bw){g.beginPath();var N=18,i,u;
    for(i=0;i<=N;i++){u=i/N;g.lineTo(bulbHW(u,bw),dir*u*L)}
    for(i=N;i>=0;i--){u=i/N;g.lineTo(-bulbHW(u,bw),dir*u*L)}g.closePath()}
  function drawGlass(g,i,x,top,cap,rot,lift,flowing,glow,wob,t){
    var w=gfx[i].w,h=GY1-GY0,H2=h/2,L=H2-13,bw=w/2-14,col=SAND[i],ft=top/cap,fb=(cap-top)/cap;
    g.save();g.translate(x,GCY-lift);g.rotate(rot+Math.sin(wob*9)*wob*.04);
    /* 그림자/빛 */
    if(glow>0){var gg=g.createRadialGradient(0,0,10,0,0,H2+10);gg.addColorStop(0,'rgba(255,230,140,'+(.35*glow)+')');gg.addColorStop(1,'rgba(255,230,140,0)');
      g.fillStyle=gg;g.fillRect(-w,-H2-20,w*2,h+40)}
    /* 기둥 */
    var px=bw+5;g.fillStyle='#7a4f30';g.fillRect(-px-3,-H2+6,6,h-12);g.fillRect(px-3,-H2+6,6,h-12);
    g.fillStyle='rgba(255,210,160,.35)';g.fillRect(-px-2,-H2+6,2,h-12);g.fillRect(px-2,-H2+6,2,h-12);
    /* 유리 안쪽 */
    for(var d=-1;d<=1;d+=2){g.save();g.scale(1,1);bulbPath(g,d,L,bw);
      var ig=g.createLinearGradient(-bw,0,bw,0);ig.addColorStop(0,'rgba(200,230,255,.16)');ig.addColorStop(.5,'rgba(200,230,255,.05)');ig.addColorStop(1,'rgba(200,230,255,.13)');
      g.fillStyle=ig;g.fill();g.clip();
      /* 모래 */
      var amt=d<0?ft:fb;
      if(amt>0.001){var sg=g.createLinearGradient(-bw,0,bw,0);sg.addColorStop(0,col[1]);sg.addColorStop(.35,col[0]);sg.addColorStop(.7,col[0]);sg.addColorStop(1,col[1]);g.fillStyle=sg;
        if(d<0){var hgt=amt*L*.9+2;g.beginPath();g.moveTo(-bw-2,0);g.lineTo(-bw-2,-hgt);
          var dip=flowing?Math.min(7,hgt*.5):1.5;g.quadraticCurveTo(0,-hgt+dip*2,bw+2,-hgt);g.lineTo(bw+2,0);g.closePath();g.fill();
          g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.ellipse(-bw*.25,-hgt+dip*.9,bw*.35,1.6,0,0,7);g.fill()}
        else{var hb=amt*L*.9+1.5,mound=Math.min(9,hb*.6);g.beginPath();g.moveTo(-bw-2,L);g.lineTo(-bw-2,L-hb+mound*.4);
          g.quadraticCurveTo(0,L-hb-mound,bw+2,L-hb+mound*.4);g.lineTo(bw+2,L);g.closePath();g.fill();
          g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.ellipse(-2,L-hb-mound*.3+2,bw*.28,1.5,0,0,7);g.fill()}}
      g.restore()}
    /* 모래 줄기와 알갱이 */
    if(flowing&&top>0){var bh=fb*L*.9+1.5,mnd=Math.min(9,bh*.6),endY=L-bh-mnd*.5;
      g.strokeStyle=col[0];g.lineWidth=1.8;g.beginPath();g.moveTo(0,-1);g.lineTo(0,endY);g.stroke();
      var gr=gfx[i].grains;if(gr.length<14&&Math.random()<.9)gr.push({y:0,v:60+Math.random()*60,x:(Math.random()-.5)*1.6});
      g.fillStyle=col[2];
      for(var q=gr.length-1;q>=0;q--){var p=gr[q];p.v+=500/60;p.y+=p.v/60;if(p.y>endY){gr.splice(q,1);continue}g.fillRect(p.x-.8+Math.sin(p.y)*.6,p.y,1.6,1.6)}
      /* 바닥 튀는 알갱이 */
      for(q=0;q<3;q++){var ph=(t*3+q*.33)%1;g.globalAlpha=1-ph;g.fillRect((q-1)*5*ph*2,endY-ph*5+ph*ph*6,1.5,1.5)}g.globalAlpha=1}
    else gfx[i].grains.length=0;
    /* 눈금 */
    g.strokeStyle='rgba(255,255,255,.32)';g.lineWidth=1;
    for(var m=1;m<cap;m++){var uu=m/cap*.9;for(d=-1;d<=1;d+=2){var yy=d*(uu*L+(d<0?2:1.5)),hw=bulbHW(Math.abs(yy)/L,bw);g.beginPath();g.moveTo(hw-4,yy);g.lineTo(hw-.5,yy);g.stroke()}}
    /* 유리 테두리와 반사광 */
    for(d=-1;d<=1;d+=2){bulbPath(g,d,L,bw);g.strokeStyle='rgba(220,240,255,.75)';g.lineWidth=2;g.stroke();
      g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2.5;g.lineCap='round';g.beginPath();
      for(var s2=.3;s2<=.72;s2+=.06){var hx=-bulbHW(s2,bw)+5;if(s2===.3)g.moveTo(hx,d*s2*L);else g.lineTo(hx,d*s2*L)}g.stroke()}
    /* 마개 */
    for(d=-1;d<=1;d+=2){var cy=d*(H2-6),cg=g.createLinearGradient(0,cy-7,0,cy+7);cg.addColorStop(0,'#c08a5a');cg.addColorStop(1,'#6e4527');
      g.fillStyle=cg;rr(g,-bw-12,cy-7,bw*2+24,14,6);g.fill();g.fillStyle='rgba(255,226,180,.35)';g.fillRect(-bw-8,cy-6,bw*2+16,2)}
    g.restore()}

  function drawCat(g,x,y,t){
    var nod=Math.sin(cat.nod*Math.PI)*6,jump=cat.joy>0?Math.abs(Math.sin(t*10))*8*cat.joy:0,shk=cat.shock>0?Math.sin(t*40)*2*cat.shock:0;
    var tilt=cat.shrug>0?Math.sin(cat.shrug*Math.PI)*.18:0;
    g.save();g.translate(x+shk,y+nod-jump);
    /* 꼬리 */
    g.strokeStyle='#e9a25a';g.lineWidth=8;g.lineCap='round';g.beginPath();g.moveTo(22,30);g.quadraticCurveTo(46,10+Math.sin(t*2)*8,40,-14+Math.sin(t*2.3)*6);g.stroke();
    /* 몸 */
    g.fillStyle='#f3b26b';g.beginPath();g.ellipse(0,36,30,24,0,0,7);g.fill();g.fillStyle='#fff6e8';g.beginPath();g.ellipse(0,40,17,16,0,0,7);g.fill();
    /* 앞치마 끈 */
    g.strokeStyle='#e26d5c';g.lineWidth=3;g.beginPath();g.moveTo(-18,24);g.lineTo(18,24);g.stroke();
    g.rotate(tilt);
    /* 머리 */
    g.fillStyle='#f3b26b';g.beginPath();g.moveTo(-24,-6);g.lineTo(-22,-34);g.lineTo(-8,-22);g.closePath();g.moveTo(24,-6);g.lineTo(22,-34);g.lineTo(8,-22);g.closePath();g.fill();
    g.fillStyle='#ffb3a6';g.beginPath();g.moveTo(-20,-12);g.lineTo(-20,-27);g.lineTo(-11,-20);g.closePath();g.moveTo(20,-12);g.lineTo(20,-27);g.lineTo(11,-20);g.closePath();g.fill();
    var hg=g.createRadialGradient(-6,-14,4,0,-6,30);hg.addColorStop(0,'#ffd59a');hg.addColorStop(1,'#eaa25a');
    g.fillStyle=hg;g.beginPath();g.ellipse(0,-6,27,23,0,0,7);g.fill();
    g.fillStyle='rgba(200,110,50,.45)';g.fillRect(-3,-28,2,8);g.fillRect(2,-28,2,8);
    /* 요리사 모자 */
    g.fillStyle='#ffffff';g.beginPath();g.ellipse(0,-38,17,12,0,0,7);g.ellipse(-11,-34,9,8,0,0,7);g.ellipse(11,-34,9,8,0,0,7);g.fill();
    g.fillStyle='#f1ece4';rr(g,-14,-32,28,9,3);g.fill();g.fillStyle='rgba(0,0,0,.08)';g.fillRect(-14,-25,28,2);
    /* 눈 */
    var happy=cat.joy>.15,shock=cat.shock>.2,closed=cat.blink<0;
    g.strokeStyle='#3a2418';g.fillStyle='#3a2418';g.lineWidth=2.2;g.lineCap='round';
    if(happy){g.beginPath();g.arc(-9,-6,4,3.4,6.0);g.stroke();g.beginPath();g.arc(9,-6,4,3.4,6.0);g.stroke()}
    else if(shock){g.fillStyle='#fff';g.beginPath();g.arc(-9,-7,5.5,0,7);g.arc(9,-7,5.5,0,7);g.fill();g.fillStyle='#3a2418';g.beginPath();g.arc(-9,-7,2,0,7);g.arc(9,-7,2,0,7);g.fill()}
    else if(closed){g.beginPath();g.moveTo(-13,-6);g.lineTo(-5,-6);g.moveTo(5,-6);g.lineTo(13,-6);g.stroke()}
    else{var look=mode==='flow'?-1.5:0;g.beginPath();g.ellipse(-9,-7+look,3.6,4.6,0,0,7);g.ellipse(9,-7+look,3.6,4.6,0,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(-8,-9+look,1.3,0,7);g.arc(10,-9+look,1.3,0,7);g.fill()}
    /* 볼, 코, 입, 수염 */
    g.fillStyle='rgba(255,120,110,.4)';g.beginPath();g.arc(-16,2,4,0,7);g.arc(16,2,4,0,7);g.fill();
    g.fillStyle='#d8635a';g.beginPath();g.moveTo(-2.5,-1);g.lineTo(2.5,-1);g.lineTo(0,1.8);g.closePath();g.fill();
    g.strokeStyle='#3a2418';g.lineWidth=1.6;
    if(shock){g.beginPath();g.ellipse(0,6,3,4,0,0,7);g.stroke()}
    else{g.beginPath();g.arc(-2.6,2.5,2.6,0,3.1);g.arc(2.6,2.5,2.6,0,3.1);g.stroke()}
    g.strokeStyle='rgba(80,50,30,.5)';g.lineWidth=1;g.beginPath();g.moveTo(-14,0);g.lineTo(-27,-2);g.moveTo(-14,3);g.lineTo(-27,5);g.moveTo(14,0);g.lineTo(27,-2);g.moveTo(14,3);g.lineTo(27,5);g.stroke();
    if(cat.shock>.2||cat.shrug>.2){g.fillStyle='rgba(140,200,255,.85)';g.beginPath();g.moveTo(24,-22);g.quadraticCurveTo(30,-12,24,-10);g.quadraticCurveTo(18,-12,24,-22);g.fill()}
    g.restore();
    /* 앞발: 기다리는 동안 톡톡 */
    var tapY=mode==='flow'?Math.max(0,Math.sin(cat.tap*14))*-6:0,up=cat.joy>.2?-26:0;
    g.fillStyle='#f3b26b';g.strokeStyle='rgba(120,60,20,.4)';g.lineWidth=1.2;
    g.beginPath();g.ellipse(x-18,438+up-jump,9,6,0,0,7);g.fill();g.stroke();
    g.beginPath();g.ellipse(x+18,438+tapY+up-jump,9,6,0,0,7);g.fill();g.stroke()}

  function drawEgg(g,x,y,r,kind,t){ /* 반으로 가른 달걀 */
    g.fillStyle='#fffdf6';g.beginPath();g.ellipse(x,y,r*.82,r,0,0,7);g.fill();g.strokeStyle='rgba(180,160,130,.6)';g.lineWidth=1.5;g.stroke();
    if(kind==='perfect'){var yg=g.createRadialGradient(x-2,y+r*.12,1,x,y+r*.15,r*.48);yg.addColorStop(0,'#ff9a1f');yg.addColorStop(.7,'#ffb53d');yg.addColorStop(1,'#f7c860');
      g.fillStyle=yg;g.beginPath();g.ellipse(x,y+r*.15,r*.46,r*.46,0,0,7);g.fill();g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(x-r*.15,y,r*.12,r*.07,-.4,0,7);g.fill()}
    else if(kind==='hard'){g.fillStyle='#f1e2a2';g.beginPath();g.arc(x,y+r*.15,r*.46,0,7);g.fill();g.strokeStyle='#a9b28a';g.lineWidth=2.2;g.stroke();
      g.fillStyle='rgba(190,170,110,.6)';for(var i=0;i<6;i++)g.fillRect(x-r*.3+((i*13)%10)/10*r*.6,y+((i*7)%10)/10*r*.5-r*.05,2,2)}
    else{g.fillStyle='#ffad1f';g.beginPath();g.ellipse(x,y+r*.12,r*.44,r*.4,0,0,7);g.fill();
      var drip=Math.min(1,t*1.4);g.beginPath();g.moveTo(x-r*.2,y+r*.4);g.quadraticCurveTo(x-r*.1,y+r*(0.9+drip*.9),x+r*.05,y+r*(0.8+drip*.95));g.quadraticCurveTo(x+r*.2,y+r*.6,x+r*.2,y+r*.4);g.fill();
      g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.ellipse(x+r*.25,y-r*.25,r*.2,r*.12,.3,0,7);g.fill()}}

  function drawStove(g,t,dt){
    /* 조리대 */
    var ct=g.createLinearGradient(0,436,0,452);ct.addColorStop(0,'#d9cbb8');ct.addColorStop(1,'#a8987f');g.fillStyle=ct;g.fillRect(0,436,W,16);
    g.fillStyle='rgba(255,255,255,.35)';g.fillRect(0,436,W,1.5);
    var cb=g.createLinearGradient(0,452,0,H);cb.addColorStop(0,'#5a3b2e');cb.addColorStop(1,'#2d1d18');g.fillStyle=cb;g.fillRect(0,452,W,H-452);
    g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,452,W,5);
    /* 화구와 불 */
    g.fillStyle='#2b2b33';g.beginPath();g.ellipse(240,440,66,8,0,0,7);g.fill();
    for(var i=0;i<9;i++){var fx=196+i*11,fh=9+Math.sin(t*18+i*1.9)*3+Math.sin(t*7+i)*2;
      var fg=g.createLinearGradient(0,440-fh,0,440);fg.addColorStop(0,'rgba(255,200,90,0)');fg.addColorStop(.5,'rgba(255,150,60,.9)');fg.addColorStop(1,'rgba(90,140,255,.95)');
      g.fillStyle=fg;g.beginPath();g.moveTo(fx-4,440);g.quadraticCurveTo(fx-3,440-fh*.6,fx,440-fh);g.quadraticCurveTo(fx+3,440-fh*.6,fx+4,440);g.fill()}
    /* 냄비 */
    var px=240,top=392,bot=434;
    g.fillStyle='#4a5160';g.fillRect(px-70,top+8,14,6);g.fillRect(px+56,top+8,14,6);
    var pg=g.createLinearGradient(px-56,0,px+56,0);pg.addColorStop(0,'#5d6676');pg.addColorStop(.3,'#a9b3c2');pg.addColorStop(.55,'#7d8798');pg.addColorStop(1,'#454c5a');
    g.fillStyle=pg;g.beginPath();g.moveTo(px-56,top);g.lineTo(px-52,bot-4);g.quadraticCurveTo(px,bot+6,px+52,bot-4);g.lineTo(px+56,top);g.closePath();g.fill();
    g.fillStyle='#2f3542';g.beginPath();g.ellipse(px,top,56,10,0,0,7);g.fill();
    var wg=g.createLinearGradient(0,top-6,0,top+8);wg.addColorStop(0,'#7cc6ea');wg.addColorStop(1,'#3a7fb0');
    g.fillStyle=wg;g.beginPath();g.ellipse(px,top+1,51,7.5,0,0,7);g.fill();
    for(i=0;i<6;i++){var bp=(t*1.4+i*.37)%1,bx=px-38+((i*29)%76);g.strokeStyle='rgba(255,255,255,'+(.6*(1-bp))+')';g.lineWidth=1;g.beginPath();g.arc(bx,top+2-bp*2,1.5+bp*2.5,0,7);g.stroke()}
    g.strokeStyle='#c7d0dc';g.lineWidth=2;g.beginPath();g.ellipse(px,top,56,10,0,3.14,6.28);g.stroke();
    /* 달걀 */
    if(egg.drop>0){var ey=top-70+(1-egg.drop)*(70);g.fillStyle='#fffaf0';g.beginPath();g.ellipse(px,ey,9,11.5,0,0,7);g.fill();g.strokeStyle='rgba(150,130,110,.5)';g.lineWidth=1;g.stroke()}
    if(egg.inT>0){var cnt=pz.tg.length-dishes.length;for(var e=0;e<cnt;e++){var exx=px-10+e*20-(cnt-1)*0,eyy=top+1+Math.sin(t*3+e)*1.2;
        g.fillStyle='#fffaf0';g.beginPath();g.ellipse(exx,eyy-3,8,6.5,Math.sin(t*2+e)*.2,0,7);g.fill();g.fillStyle='rgba(60,130,180,.35)';g.fillRect(exx-8,eyy+1,16,3)}}
    /* 김 */
    if(steam.length<26&&Math.random()<dt*14)steam.push({x:px-36+Math.random()*72,y:top-4,t:0,l:1.3+Math.random()*.8,p:Math.random()*6,r:5+Math.random()*5});
    for(i=steam.length-1;i>=0;i--){var s=steam[i];s.t+=dt;if(s.t>s.l){steam.splice(i,1);continue}
      var k=s.t/s.l,sy2=s.y-s.t*30;g.fillStyle='rgba(235,240,255,'+(.22*Math.sin(k*3.14)*Math.max(0,Math.min(1,(sy2-334)/30)))+')';g.beginPath();g.arc(s.x+Math.sin(s.t*2.5+s.p)*7,sy2,s.r*(1+k*1.4),0,7);g.fill()}
    /* 손잡이 */
    g.fillStyle='#2d2f38';rr(g,px-80,top+5,18,8,4);g.fill();rr(g,px+62,top+5,18,8,4);g.fill();
    /* 오븐 손잡이 */
    for(i=0;i<3;i++){g.fillStyle='#d9cbb8';g.beginPath();g.arc(176+i*32,470,6,0,7);g.fill();g.fillStyle='#7a6a55';g.fillRect(175+i*32,465,2,6)}}

  function drawButtons(g,t){
    var ko=api.lang==='ko',hintB=tutorialTarget();
    BTN.forEach(function(b){var p=press[b.id]||0,dis=(b.id==='egg'&&run.egg!=null),active=mode==='play'||mode==='flow';
      g.save();g.translate(b.x+b.w/2,b.y+b.h/2);g.scale(1-p*.06,1-p*.06);g.translate(-b.w/2,-b.h/2);
      g.fillStyle='rgba(0,0,0,.35)';rr(g,0,4,b.w,b.h,12);g.fill();
      var base=b.id==='skip'?['#ffd27a','#e09a3a']:b.id==='serve'?['#ffe9c8','#e8b98a']:b.id==='egg'?['#fff6e6','#e6cfae']:['#c9b8a6','#9a8572'];
      if(dis)base=['#8d7e72','#6d6056'];
      var bg=g.createLinearGradient(0,0,0,b.h);bg.addColorStop(0,base[0]);bg.addColorStop(1,base[1]);g.fillStyle=bg;rr(g,0,0,b.w,b.h,12);g.fill();
      g.fillStyle='rgba(255,255,255,.35)';rr(g,4,3,b.w-8,b.h*.38,9);g.fill();
      if(b.id==='skip'&&mode==='play'&&nextDt(run.gls)<Infinity&&active){g.strokeStyle='rgba(255,240,180,'+(.5+.4*Math.sin(t*5))+')';g.lineWidth=2.5;rr(g,-1,-1,b.w+2,b.h+2,13);g.stroke()}
      /* 아이콘 */
      var ix=b.id==='reset'?b.w/2:22,iy=b.h/2;g.fillStyle='#5a3424';g.strokeStyle='#5a3424';g.lineWidth=2.5;g.lineCap='round';
      if(b.id==='egg'){g.fillStyle=dis?'#cfc2b4':'#fffdf6';g.beginPath();g.ellipse(ix,iy,8,10,0,0,7);g.fill();g.strokeStyle='#8a6a50';g.lineWidth=1.5;g.stroke()}
      else if(b.id==='serve'){g.fillStyle='#fff';g.beginPath();g.ellipse(ix,iy+3,13,5,0,0,7);g.fill();g.strokeStyle='#8a6a50';g.lineWidth=1.5;g.stroke();
        g.fillStyle='#ffb53d';g.beginPath();g.arc(ix,iy+1,4,0,7);g.fill()}
      else if(b.id==='skip'){g.beginPath();g.moveTo(ix-8,iy-8);g.lineTo(ix,iy);g.lineTo(ix-8,iy+8);g.closePath();g.fill();g.beginPath();g.moveTo(ix,iy-8);g.lineTo(ix+8,iy);g.lineTo(ix,iy+8);g.closePath();g.fill()}
      else{g.beginPath();g.arc(ix,iy-6,7,-.4,4.2);g.stroke();g.beginPath();g.moveTo(ix+7,iy-12);g.lineTo(ix+7,iy-5);g.lineTo(ix+1,iy-6);g.stroke()}
      g.fillStyle=dis?'#e8dccf':'#4a2a1c';g.textAlign=b.id==='reset'?'center':'left';
      var lab=b.id==='egg'&&dis?(ko?'달걀 넣음 ✓':'Egg is in ✓'):(ko?b.ko:b.en);
      if(b.id==='reset'){g.font=font(12);g.fillText(lab,b.w/2,b.h-8)}else{g.font=font(b.id==='skip'?18:17);g.fillText(lab,40,b.h/2+6)}
      if(kbUsed){g.font=font(10);g.fillStyle='rgba(74,42,28,.55)';g.textAlign='right';g.fillText(b.k,b.w-7,13)}
      if(hintB===b.id){g.strokeStyle='rgba(255,255,255,'+(.55+.45*Math.sin(t*7))+')';g.lineWidth=3;rr(g,-4,-4,b.w+8,b.h+8,15);g.stroke()}
      g.restore()})}

  /* 첫 퍼즐만: 다음에 할 일을 반짝여 알려준다 */
  function tutorialTarget(){if(lvl!==0||mode!=='play'||attempt>1)return null;
    if(run.gls[0].top===0&&run.t===0)return run.egg==null?'egg':'glass';
    if(run.egg==null)return 'egg';if(run.t-run.egg<pz.tg[0])return 'skip';return 'serve'}

  function draw(g,a,dt){
    dt=dt||0;tG+=dt;var t=tG,ko=a.lang==='ko',i;api=a;
    if(!pz)init(a);
    drawBackground(g,t,dt);
    /* 모래시계 */
    for(i=0;i<gfx.length;i++){var gf=gfx[i],gl=run.gls[i],rot=0,lift=0,top=gl.top,flowing=false;
      if(gf.flipT>0){var p=ease(1-gf.flipT);rot=p*Math.PI;lift=Math.sin(p*Math.PI)*14;top=gf.fromTop}
      else if(mode==='flow'&&flow){top=Math.max(0,flow.from[i]-flow.el/SPM);flowing=flow.from[i]>0}
      g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(gf.x,GY1+3,gf.w/2-4,5,0,0,7);g.fill();
      drawGlass(g,i,gf.x,top,gl.c,rot,lift,flowing&&top>0,Math.max(0,gf.glow),Math.max(0,gf.wob),t);
      /* 이벤트 링 */
      if(gf.glow>0){var rg=(1-gf.glow);g.strokeStyle='rgba(255,226,130,'+gf.glow+')';g.lineWidth=3;g.beginPath();g.ellipse(gf.x,GCY,gf.w/2+rg*30,(GY1-GY0)/2+rg*30,0,0,7);g.stroke()}
      /* 용량 표시판 */
      var lx=gf.x;g.fillStyle='rgba(40,24,16,.75)';rr(g,lx-24,GY1+4,48,15,7);g.fill();g.fillStyle=SAND[i][2];g.font=font(12);g.textAlign='center';
      g.fillText(gl.c+(ko?'분':' min'),lx,GY1+16);
      if(kbUsed){g.fillStyle='rgba(255,255,255,.5)';g.font=font(10);g.fillText('['+(i+1)+']',lx,GY0-6)}
      if(tutorialTarget()==='glass'&&i===0){g.strokeStyle='rgba(255,255,255,'+(.5+.45*Math.sin(t*7))+')';g.lineWidth=3;g.setLineDash([8,6]);g.lineDashOffset=-t*20;
        rr(g,lx-gf.w/2-4,GY0-8,gf.w+8,GY1-GY0+16,16);g.stroke();g.setLineDash([]);
        g.fillStyle='#fff';g.font=font(13);g.fillText(ko?'눌러서 뒤집기':'Tap to flip',lx,GY0-12)}}
    drawStove(g,t,dt);
    drawCat(g,78,402,t);
    drawButtons(g,t);
    /* 상단 배너 */
    var bn=g.createLinearGradient(0,32,0,82);bn.addColorStop(0,'rgba(255,244,222,.96)');bn.addColorStop(1,'rgba(240,220,190,.96)');
    g.fillStyle='rgba(0,0,0,.3)';rr(g,10,36,250,46,10);g.fill();g.fillStyle=bn;rr(g,10,33,250,46,10);g.fill();
    g.fillStyle='#8a5a3a';g.font=font(12);g.textAlign='left';
    g.fillText((ko?'퍼즐 ':'Puzzle ')+(lvl+1)+(pz.e0?(ko?' · 달걀은 이미 냄비 속':' · egg already in'):''),20,50);
    g.fillStyle='#4a2a1c';g.font=font(19);
    var goal=pz.tg.length===1?(ko?'정확히 '+pz.tg[0]+'분 삶기':'Boil exactly '+pz.tg[0]+' min'):
      (ko?pz.tg.join('분, ')+'분에 하나씩':'Serve at '+pz.tg.join(' & ')+' min');
    g.fillText(goal,20,72);
    if(pz.tg.length>1){for(i=0;i<pz.tg.length;i++){var cx=236-(pz.tg.length-1-i)*20;g.fillStyle=i<dishes.length?'#7bc47f':'rgba(120,90,60,.25)';g.beginPath();g.arc(cx,60,7,0,7);g.fill();
        if(i<dishes.length){g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.moveTo(cx-3,60);g.lineTo(cx-1,63);g.lineTo(cx+3,57);g.stroke()}}}
    /* 남은 시간 */
    var low=timeLeft<10,fr=Math.max(0,Math.min(1,timeLeft/TIME_CAP));
    g.fillStyle='rgba(0,0,0,.3)';rr(g,268,36,82,46,10);g.fill();g.fillStyle=low?'#5a1e1e':'#2b2340';rr(g,268,33,82,46,10);g.fill();
    g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=5;g.beginPath();g.arc(290,56,11,0,7);g.stroke();
    g.strokeStyle=lastGain>0?'#8fe39a':low?'#ff7a6a':'#ffd27a';g.beginPath();g.arc(290,56,11,-Math.PI/2,-Math.PI/2+fr*Math.PI*2);g.stroke();
    g.fillStyle=lastGain>0?'#8fe39a':low?'#ffb0a0':'#fff4dc';g.font=font(low?21+Math.sin(t*12)*1.5:20);g.textAlign='left';g.fillText(Math.ceil(timeLeft),308,63);
    if(lastGain>0){g.globalAlpha=Math.min(1,lastGain*2);g.fillStyle='#8fe39a';g.font=font(12);g.fillText('+'+TIME_ADD,312,93);g.globalAlpha=1}
    /* 힌트 / 말풍선 슬롯 */
    var line=null,col='#fff4dc';
    if(toast){line=toast.s;col=toast.c}else if(pz.hint&&mode!=='win')line=pz.hint[ko?'ko':'en'];
    if(line){g.font=font(14);var tw=g.measureText(line).width+26,al=toast?Math.min(1,(2.2-toast.t)*3):1;g.globalAlpha=al;
      g.fillStyle=toast?'rgba(90,40,30,.88)':'rgba(20,16,40,.72)';rr(g,W/2-tw/2,86,tw,24,12);g.fill();
      g.fillStyle=col;g.textAlign='center';g.fillText(line,W/2,103);g.globalAlpha=1}
    /* 결과 공개 */
    if(reveal&&(mode==='win'||mode==='fail')){reveal.t+=dt;var k=Math.min(1,reveal.t/.35),sc=k<1?1-Math.pow(1-k,3)*1+Math.sin(k*Math.PI)*.15:1;
      g.fillStyle='rgba(10,8,24,'+(.45*k)+')';g.fillRect(0,0,W,H);
      g.save();g.translate(180,250);g.scale(sc,sc);
      g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(0,52,92,20,0,0,7);g.fill();
      var pl=g.createRadialGradient(0,40,10,0,40,90);pl.addColorStop(0,'#ffffff');pl.addColorStop(1,'#d9dbe6');g.fillStyle=pl;g.beginPath();g.ellipse(0,40,90,26,0,0,7);g.fill();
      g.strokeStyle='#b8bccd';g.lineWidth=2;g.beginPath();g.ellipse(0,40,70,18,0,0,7);g.stroke();
      drawEgg(g,-26,10,34,reveal.kind,reveal.t);drawEgg(g,26,10,34,reveal.kind,reveal.t);
      if(reveal.kind==='perfect'){for(i=0;i<5;i++){var sa=t*2+i*1.26,sr=72+Math.sin(t*3+i)*6;g.fillStyle='#fff6b0';
          var sx=Math.cos(sa)*sr,sy=Math.sin(sa)*sr*.6-6,ss=3+Math.sin(t*6+i)*1.5;g.beginPath();g.moveTo(sx,sy-ss*2);g.lineTo(sx+ss*.6,sy);g.lineTo(sx,sy+ss*2);g.lineTo(sx-ss*.6,sy);g.closePath();g.fill()}}
      g.textAlign='center';g.font=font(24);var msg,sub;
      if(reveal.kind==='perfect'){msg=ko?'완벽한 반숙!':'Perfectly soft-boiled!';
        sub=(ko?'뒤집기 ':'Flips ')+run.flips+(ko?' (최소 ':' (best ')+pz.min+')'+(reveal.sb?(ko?' · 연속 +':' · streak +')+reveal.sb:'')}
      else if(reveal.kind==='hard'){msg=ko?'너무 익었어요! 딱딱…':'Overcooked! Rock hard…';sub=(ko?'목표보다 ':'')+'+'+reveal.off+(ko?'분':' min too long')}
      else{msg=ko?'덜 익었어요! 주르륵…':'Undercooked! Runny…';sub=(ko?'목표보다 ':'')+reveal.off+(ko?'분':' min too short')}
      g.fillStyle='rgba(0,0,0,.4)';g.fillText(msg,1,-50);g.fillStyle=reveal.kind==='perfect'?'#ffe27a':'#ffb0a0';g.fillText(msg,0,-52);
      g.font=font(14);g.fillStyle='#fff4dc';g.fillText(sub,0,-28);g.restore()}
    /* 하단 안내 */
    g.textAlign='left';g.font=font(11);g.fillStyle='rgba(255,236,214,.55)';
    g.fillText(kbUsed?(ko?'1·2·3 뒤집기  Space 다음  E 달걀  S 담기  R 처음':'1·2·3 flip · Space next · E egg · S serve · R reset'):
      (ko?'시계는 없어요. 딩! 순간에만 시각을 알 수 있어요':'No clock: you only know the time at a ding'),14,612)}

  SG.run({id:'hourglass-puzzle',title:{ko:'모래시계 요리사',en:'Hourglass Chef'},
    how:{ko:'시계 없이 모래시계만으로 정확히 N분! 모래가 다 떨어지는 딩! 순간에만 달걀을 넣고 담을 수 있어요.',
         en:'No clock, only hourglasses: boil for exactly N minutes. You can add and serve the egg only at a ding, when a glass runs out.'},
    init:init,update:update,draw:draw});
})();
