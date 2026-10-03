/* SG Games 공통 셸: 언어, 화면 전환, 점수, 입력, 효과음, 배경음악, 파티클, 화면 흔들림.
   게임은 SG.run({...})만 구현한다. */
(function(){
  var q=new URLSearchParams(location.search).get('lang');
  var lang=q||((navigator.language||'en').toLowerCase().indexOf('ko')===0?'ko':'en');
  if(lang!=='ko')lang='en';
  document.documentElement.lang=lang;
  var T={ko:{start:'시작',retry:'다시 하기',over:'게임 오버',score:'점수',best:'최고',rec:'신기록!'},
         en:{start:'Start',retry:'Play again',over:'Game Over',score:'Score',best:'Best',rec:'New record!'}}[lang];
  var store={get:function(k){try{return +localStorage.getItem(k)||0}catch(e){return 0}},
             set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

  /* ---- 오디오 ---- */
  var ac=null,master=null,muted=store.get('sg-mute')===1;
  function ctx(){try{if(!ac){ac=new (window.AudioContext||window.webkitAudioContext)();
      master=ac.createGain();master.gain.value=muted?0:1;master.connect(ac.destination)}
    if(ac.state==='suspended')ac.resume();return ac}catch(e){return null}}
  function note(f,t,d,type,vol){var a=ctx();if(!a)return;var o=a.createOscillator(),g=a.createGain();
    o.type=type||'square';o.frequency.setValueAtTime(f,t);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol||.06,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.02)}
  function beep(f,d,type){var a=ctx();if(a)note(f,a.currentTime,d,type,.07)}
  function sfx(name){var a=ctx();if(!a)return;var t=a.currentTime;
    if(name==='coin'){note(988,t,.07,'square',.06);note(1319,t+.07,.14,'square',.06)}
    else if(name==='hit'){note(180,t,.25,'sawtooth',.09);note(90,t+.05,.35,'sawtooth',.09)}
    else if(name==='jump'){var o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.setValueAtTime(300,t);
      o.frequency.exponentialRampToValueAtTime(700,t+.12);g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.0001,t+.14);
      o.connect(g);g.connect(master);o.start(t);o.stop(t+.16)}
    else if(name==='win'){[523,659,784,1047].forEach(function(f,i){note(f,t+i*.09,.16,'triangle',.07)})}
    else note(660,t,.06,'square',.05)}
  /* 게임 id로 시드를 만들어 게임마다 다른 배경음악 루프를 생성한다 */
  var mus={timer:null,step:0,next:0,fast:1};
  function music(id){var a=ctx();if(!a||mus.timer)return;
    var s=7;for(var i=0;i<id.length;i++)s=(s*31+id.charCodeAt(i))>>>0;
    function r(){s=(s*1664525+1013904223)>>>0;return s/4294967296}
    var root=174.6*Math.pow(2,Math.floor(r()*6)/12),pent=[0,2,4,7,9,12,14,16],mel=[],prev=3;
    for(var k=0;k<32;k++){if(r()<.72){prev=Math.max(0,Math.min(7,prev+Math.floor(r()*5)-2));mel.push(pent[prev])}else mel.push(null)}
    for(var k2=16;k2<24;k2++)mel[k2]=mel[k2-16];
    var bars=[0,-3,-7,-5],spb=60/(104+Math.floor(r()*36))/2;
    mus.next=a.currentTime+.08;
    mus.timer=setInterval(function(){while(mus.next<a.currentTime+.25){var i=mus.step%32,b=bars[(i>>3)%4],t=mus.next,sp=spb/mus.fast;
        if(mel[i]!=null)note(root*2*Math.pow(2,mel[i]/12),t,sp*.9,'triangle',.045);
        if(i%2===0)note(root/2*Math.pow(2,b/12),t,sp*1.7,'sine',.09);
        if(i%4===0){note(root*Math.pow(2,b/12),t,sp*3.5,'sine',.025);note(root*Math.pow(2,(b+7)/12),t,sp*3.5,'sine',.02)}
        if(i%2===1)note(6000,t,.02,'square',.008);
        mus.next+=sp;mus.step++}},40)}

  function run(game){
    var W=game.W||360,H=game.H||640,stage=document.getElementById('stage');
    stage.innerHTML='<canvas width="'+W+'" height="'+H+'"></canvas>'+
      '<div class="hud"><span id="sg-score"></span><span id="sg-best"></span></div>'+
      '<button class="mute" id="sg-mute" aria-label="sound"></button>'+
      '<div class="overlay" id="sg-ov"><h2 id="sg-title"></h2><p id="sg-msg"></p><button class="btn" id="sg-btn"></button></div>';
    var cv=stage.querySelector('canvas'),g=cv.getContext('2d'),ov=stage.querySelector('#sg-ov'),
        btn=stage.querySelector('#sg-btn'),elS=stage.querySelector('#sg-score'),elB=stage.querySelector('#sg-best'),mb=stage.querySelector('#sg-mute');
    var key='sg-best-'+game.id,best=store.get(key),score=0,playing=false,last=0,shake=0,parts=[],pops=[];
    var inp={x:null,y:null,down:false,left:false,right:false,up:false,tap:false};
    function hud(){elS.textContent=T.score+' '+score;elB.textContent=T.best+' '+best}
    function show(title,msg,label){stage.querySelector('#sg-title').textContent=title;
      stage.querySelector('#sg-msg').textContent=msg;btn.textContent=label;ov.hidden=false}
    function start(){ov.hidden=true;score=0;parts=[];pops=[];shake=0;mus.fast=1;hud();game.init(api);playing=true;last=performance.now();music(game.id);sfx('tap')}
    function setMute(){mb.textContent=muted?'🔇':'🔊';if(master)master.gain.value=muted?0:1}
    mb.addEventListener('click',function(e){e.stopPropagation();muted=!muted;store.set('sg-mute',muted?1:0);ctx();setMute()});setMute();
    var api={W:W,H:H,lang:lang,beep:beep,sfx:sfx,
      add:function(n){score+=n;hud();elS.classList.remove('bump');void elS.offsetWidth;elS.classList.add('bump')},
      shake:function(v){shake=Math.max(shake,v)},
      tempo:function(v){mus.fast=Math.max(1,Math.min(1.6,v))},
      burst:function(x,y,color,n){for(var i=0;i<(n||10);i++){var a=Math.random()*6.28,v=60+Math.random()*180;
        parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,l:.5+Math.random()*.4,t:0,c:color||'#fff',r:2+Math.random()*3})}},
      pop:function(x,y,text,color){pops.push({x:x,y:y,s:text,c:color||'#fff',t:0})},
      over:function(){if(!playing)return;playing=false;var rec=score>best&&score>0;if(score>best){best=score;store.set(key,best)}hud();
        sfx(rec?'win':'hit');shake=14;show(rec?T.rec:T.over,T.score+' '+score+' · '+T.best+' '+best,T.retry)}};
    function pos(e){var r=cv.getBoundingClientRect();inp.x=(e.clientX-r.left)/r.width*W;inp.y=(e.clientY-r.top)/r.height*H}
    cv.addEventListener('pointerdown',function(e){pos(e);inp.down=true;inp.tap=true;e.preventDefault()});
    cv.addEventListener('pointermove',function(e){if(inp.down||e.pointerType==='mouse')pos(e)});
    window.addEventListener('pointerup',function(){inp.down=false});
    function k(e,v){var c=e.key;if(c==='ArrowLeft'||c==='a')inp.left=v;else if(c==='ArrowRight'||c==='d')inp.right=v;
      else if(c===' '||c==='ArrowUp'||c==='w'){inp.up=v;if(v)inp.tap=true}else return;
      if(playing)e.preventDefault();if(v&&c!==' ')inp.x=null}
    window.addEventListener('keydown',function(e){if(!playing&&(e.key==='Enter'||e.key===' ')){e.preventDefault();start();return}k(e,true)});
    window.addEventListener('keyup',function(e){k(e,false)});
    btn.addEventListener('click',start);
    function loop(t){var dt=Math.min(.05,(t-last)/1000);last=t;
      if(playing){game.update(dt,inp,api);inp.tap=false}
      g.save();if(shake>.3){g.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=Math.pow(.002,dt)}else shake=0;
      game.draw(g,api,dt);
      for(var i=parts.length-1;i>=0;i--){var p=parts[i];p.t+=dt;if(p.t>p.l){parts.splice(i,1);continue}
        p.vy+=520*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;g.globalAlpha=1-p.t/p.l;g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.fill()}
      g.font='800 20px Jua,system-ui,sans-serif';g.textAlign='center';
      for(var j=pops.length-1;j>=0;j--){var o=pops[j];o.t+=dt;if(o.t>.7){pops.splice(j,1);continue}
        g.globalAlpha=1-o.t/.7;g.fillStyle='rgba(0,0,0,.35)';g.fillText(o.s,o.x+1,o.y-o.t*50+2);g.fillStyle=o.c;g.fillText(o.s,o.x,o.y-o.t*50)}
      g.globalAlpha=1;g.restore();requestAnimationFrame(loop)}
    hud();game.init(api);show(game.title[lang],game.how[lang],T.start);
    window.__sg={start:start,inp:inp,state:function(){return{playing:playing,score:score}}};
    requestAnimationFrame(loop);
  }
  window.SG={run:run,lang:lang};
})();
