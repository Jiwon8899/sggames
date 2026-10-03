/* SG Games 공통 셸: 언어, 화면 전환, 점수, 입력, 사운드. 게임은 SG.run({...})만 구현한다. */
(function(){
  var q=new URLSearchParams(location.search).get('lang');
  var lang=q||((navigator.language||'en').toLowerCase().indexOf('ko')===0?'ko':'en');
  if(lang!=='ko')lang='en';
  document.documentElement.lang=lang;
  var T={ko:{start:'시작',retry:'다시 하기',over:'게임 오버',score:'점수',best:'최고'},
         en:{start:'Start',retry:'Play again',over:'Game Over',score:'Score',best:'Best'}}[lang];
  var store={get:function(k){try{return +localStorage.getItem(k)||0}catch(e){return 0}},
             set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  var ac=null;
  function beep(f,d,type){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();
    var o=ac.createOscillator(),g=ac.createGain();o.type=type||'square';o.frequency.value=f;
    g.gain.value=.06;g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+d);
    o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+d)}catch(e){}}
  function run(game){
    var W=game.W||360,H=game.H||640,stage=document.getElementById('stage');
    stage.innerHTML='<canvas width="'+W+'" height="'+H+'"></canvas>'+
      '<div class="hud"><span id="sg-score"></span><span id="sg-best"></span></div>'+
      '<div class="overlay" id="sg-ov"><h2 id="sg-title"></h2><p id="sg-msg"></p><button class="btn" id="sg-btn"></button></div>';
    var cv=stage.querySelector('canvas'),g=cv.getContext('2d'),ov=stage.querySelector('#sg-ov'),
        btn=stage.querySelector('#sg-btn'),elS=stage.querySelector('#sg-score'),elB=stage.querySelector('#sg-best');
    var key='sg-best-'+game.id,best=store.get(key),score=0,playing=false,last=0;
    var inp={x:null,down:false,left:false,right:false,up:false,tap:false};
    function hud(){elS.textContent=T.score+' '+score;elB.textContent=T.best+' '+best}
    function show(title,msg,label){stage.querySelector('#sg-title').textContent=title;
      stage.querySelector('#sg-msg').textContent=msg;btn.textContent=label;ov.hidden=false}
    function start(){ov.hidden=true;score=0;hud();game.init(api);playing=true;last=performance.now()}
    var api={W:W,H:H,lang:lang,beep:beep,
      add:function(n){score+=n;hud()},
      over:function(){if(!playing)return;playing=false;if(score>best){best=score;store.set(key,best)}hud();
        beep(140,.4,'sawtooth');show(T.over,T.score+' '+score+' · '+T.best+' '+best,T.retry)}};
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
      game.draw(g,api);requestAnimationFrame(loop)}
    hud();game.init(api);show(game.title[lang],game.how[lang],T.start);
    window.__sg={start:start,inp:inp,state:function(){return{playing:playing,score:score}}};
    requestAnimationFrame(loop);
  }
  window.SG={run:run,lang:lang};
})();
