/* 시소 동물원 (Seesaw Zoo) — 동물들을 모두 앉혀 시소의 수평을 맞추는 토크 퍼즐.
   퍼즐 논리(토크, 규칙, 전수 탐색 풀이, 생성기)는 DOM 없이도 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  /* ---------- 동물 ---------- */
  var AN={
    M:{w:1,r:11,c:'#c3c6d6',d:'#8f93aa',v:[1568,1865]},   /* 생쥐 */
    C:{w:2,r:13,c:'#ffb14a',d:'#e0862a',v:[784,1047]},    /* 고양이 */
    T:{w:2,r:13,c:'#fff7ee',d:'#e3c9c2',v:[988,988]},     /* 쌍둥이 토끼 */
    D:{w:3,r:15,c:'#c98f5c',d:'#9a6335',v:[392,330]},     /* 강아지 */
    S:{w:4,r:16,c:'#cdb89a',d:'#8d7556',v:[220,196]},     /* 나무늘보 */
    P:{w:5,r:17,c:'#ff9db4',d:'#e86f8f',v:[311,277]},     /* 돼지 */
    B:{w:8,r:20,c:'#8a5a3c',d:'#5f3a24',v:[147,131]},     /* 곰 */
    E:{w:13,r:23,c:'#9fb4d6',d:'#6f86ad',v:[98,147]}      /* 코끼리 */
  };
  /* ---------- 손으로 만든 14개 레벨 ----------
     n:한쪽 좌석 수  q:대기열(동물 코드)  bk:부서진 좌석 위치  bag:[[위치,무게]] 모래주머니
     live:위험 토크(이 값을 넘으면 뒤집힘)  sub:{at:매달린 위치,n,bk,bag} 아래 매달린 두 번째 막대 */
  var LEVELS=[
    {n:2,q:'CC',tip:{ko:'양쪽 무게를 맞춰요',en:'Balance both sides'}},
    {n:5,q:'PM',tip:{ko:'무거우면 가까이, 가벼우면 멀리!',en:'Heavy sits close, light sits far!'}},
    {n:3,q:'MDP',tip:{ko:'무게 × 거리, 셋이서 맞춰요',en:'Weight × distance, three this time'}},
    {n:3,q:'CDCD',tip:{ko:'고양이와 강아지는 옆자리 싫어!',en:'Cat and dog won\'t sit side by side!'}},
    {n:3,q:'MPDM',bk:[1],tip:{ko:'부서진 자리는 못 앉아요',en:'Nobody sits on a broken seat'}},
    {n:3,q:'MPDM',live:4,tip:{ko:'빨간 선을 넘으면 와르르! 순서가 중요해요',en:'Past the red line it tips! Order matters'}},
    {n:4,q:'MCDM',tip:{ko:'생쥐는 고양이 반대편에만 앉아요',en:'Mice only sit across from the cat'}},
    {n:3,q:'PMCD',bag:[[-3,2]],tip:{ko:'모래주머니는 안 움직여요',en:'The sandbag stays put'}},
    {n:4,q:'DBPD',tip:{ko:'곰은 맨 끝자리만 고집해요',en:'The bear insists on an end seat'}},
    {n:3,q:'TMDT',tip:{ko:'쌍둥이는 같은 거리로 마주 앉아요',en:'Twins mirror each other'}},
    {n:3,q:'DSCD',bk:[2],tip:{ko:'나무늘보는 앉으면 잠들어요. 신중하게!',en:'The sloth dozes off once seated. Choose well!'}},
    {n:3,q:'CMCM',sub:{at:-2,n:1},tip:{ko:'매달린 막대도 수평이어야 해요',en:'The hanging beam must balance too'}},
    {n:4,q:'PMBCD',sub:{at:-3,n:2},tip:{ko:'아래 막대의 무게가 통째로 매달려요',en:'The lower beam hangs with all its weight'}},
    {n:4,q:'MPEBCD',live:16,bk:[-1],tip:{ko:'마지막 무대! 코끼리 조심',en:'The finale! Mind the elephant'}}
  ];

  function build(def,idx){
    var L={idx:idx||0,n:def.n,types:def.q.split(''),live:def.live||0,sub:def.sub?{at:def.sub.at,n:def.sub.n}:null,seats:[],tip:def.tip||null,gen:def.gen||null},p;
    function add(b,n,d){for(p=-n;p<=n;p++){if(p===0||(b===0&&def.sub&&p===def.sub.at))continue;
      var s={b:b,pos:p,broken:(d.bk||[]).indexOf(p)>=0,bag:0};
      (d.bag||[]).forEach(function(x){if(x[0]===p)s.bag=x[1]});L.seats.push(s)}}
    add(0,def.n,def);if(def.sub)add(1,def.sub.n,def.sub);
    L.bn=[def.n,def.sub?def.sub.n:0];
    L.rules=rulesOf(L.types);L.def=def;return L}
  function rulesOf(t){var has={},r=[];t.forEach(function(x){has[x]=1});
    if(has.C&&has.D)r.push('cd');if(has.M&&has.C)r.push('mc');if(has.B)r.push('be');if(has.T)r.push('tw');if(has.S)r.push('sl');return r}
  function free(s){return !s.broken&&!s.bag}

  /* asg[i] = i번째 동물이 앉은 좌석 번호(-1 = 아직 대기 중) */
  function torques(L,asg){var T=[0,0],w1=0,i,s,w;
    for(i=0;i<L.seats.length;i++){s=L.seats[i];if(s.bag){T[s.b]+=s.bag*s.pos;if(s.b)w1+=s.bag}}
    for(i=0;i<asg.length;i++){if(asg[i]<0)continue;s=L.seats[asg[i]];w=AN[L.types[i]].w;T[s.b]+=w*s.pos;if(s.b)w1+=w}
    if(L.sub)T[0]+=w1*L.sub.at;return T}
  function sides(L,asg){var S=[[0,0],[0,0]],w1=0,i,s,w;
    function put(b,pos,w){if(pos<0)S[b][0]-=w*pos;else S[b][1]+=w*pos}
    for(i=0;i<L.seats.length;i++){s=L.seats[i];if(s.bag){put(s.b,s.pos,s.bag);if(s.b)w1+=s.bag}}
    for(i=0;i<asg.length;i++){if(asg[i]<0)continue;s=L.seats[asg[i]];w=AN[L.types[i]].w;put(s.b,s.pos,w);if(s.b)w1+=w}
    if(L.sub)put(0,L.sub.at,w1);return S}
  function violations(L,asg){var v=[],i,j,a,b,ti,tj,tw=[];
    for(i=0;i<asg.length;i++){ti=L.types[i];if(ti==='T')tw.push(i);if(asg[i]<0)continue;a=L.seats[asg[i]];
      if(ti==='B'&&Math.abs(a.pos)!==L.bn[a.b])v.push({r:'be',a:i,b:i});
      for(j=0;j<asg.length;j++){if(asg[j]<0||j===i)continue;tj=L.types[j];b=L.seats[asg[j]];
        if(ti==='C'&&tj==='D'&&a.b===b.b&&Math.abs(a.pos-b.pos)===1)v.push({r:'cd',a:i,b:j});
        if(ti==='M'&&tj==='C'&&a.b===b.b&&a.pos*b.pos>0)v.push({r:'mc',a:i,b:j})}}
    if(tw.length===2&&asg[tw[0]]>=0&&asg[tw[1]]>=0){a=L.seats[asg[tw[0]]];b=L.seats[asg[tw[1]]];
      if(a.b!==b.b||a.pos!==-b.pos)v.push({r:'tw',a:tw[0],b:tw[1]})}
    return v}
  function allSeated(asg){for(var i=0;i<asg.length;i++)if(asg[i]<0)return false;return true}
  function solved(L,asg){if(!allSeated(asg))return false;var T=torques(L,asg);return T[0]===0&&T[1]===0&&violations(L,asg).length===0}

  /* 라이브 레벨: 컨베이어 앞의 두 마리 중 하나를 골라 앉힌다. 매 순간 |토크| <= D 여야 한다.
     주어진 최종 배치에 대해, 가능한 순서 중 최대 토크의 최솟값과 그 순서를 돌려준다. */
  function liveBest(L,asg){var n=asg.length,cur=[],best={d:1e9,order:null},i;for(i=0;i<n;i++)cur.push(-1);
    var t0=Math.abs(torques(L,cur)[0]);
    (function rec(done,mx,order){
      if(mx>=best.d)return;
      if(order.length===n){best={d:mx,order:order.slice()};return}
      var c=0,k;for(k=0;k<n&&c<2;k++){if(done[k])continue;c++;
        done[k]=1;cur[k]=asg[k];order.push(k);
        rec(done,Math.max(mx,Math.abs(torques(L,cur)[0])),order);
        order.pop();cur[k]=-1;done[k]=0}
    })([],t0,[]);
    return best}

  /* 전수 탐색: 같은 종류 동물끼리 자리만 바꾼 것은 한 가지로 센다 */
  function solve(L,cap){var n=L.types.length,asg=[],used=[],sols=[],count=0,i,minD=1e9;for(i=0;i<n;i++)asg.push(-1);
    (function rec(k){
      if(k===n){var T=torques(L,asg);if(T[0]!==0||T[1]!==0||violations(L,asg).length)return;
        if(L.live){var lb=liveBest(L,asg);if(lb.d<minD)minD=lb.d;if(lb.d>L.live)return;
          count++;if(sols.length<(cap||50))sols.push({asg:asg.slice(),order:lb.order});return}
        count++;if(sols.length<(cap||50))sols.push({asg:asg.slice(),order:null});return}
      var lo=0,j;for(j=k-1;j>=0;j--)if(L.types[j]===L.types[k]){lo=asg[j]+1;break}
      for(var s=lo;s<L.seats.length;s++){if(used[s]||!free(L.seats[s]))continue;
        used[s]=1;asg[k]=s;rec(k+1);used[s]=0;asg[k]=-1}
    })(0);
    return {count:count,sols:sols,minD:minD}}

  /* ---------- 생성기: 먼저 균형 잡힌 배치를 만들고, 거기서 대기열과 규칙을 끌어낸다 ---------- */
  function rng(seed){var s=(seed>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function generate(seed,tier){
    var r=rng(seed*7919+tier*104729+17),best=null,att,cands=0;
    function ri(n){return Math.floor(r()*n)}
    for(att=0;att<3000&&cands<6;att++){
      var x=r(),mode=tier>=1&&x<.34?'live':tier>=1&&x<.62?'mobile':'plain';
      var n=mode==='mobile'?4:(r()<.45?3:4),def={n:n,q:'',bk:[],bag:[]};
      if(mode==='mobile')def.sub={at:(r()<.5?-1:1)*(2+ri(2)),n:2,bk:[],bag:[]};
      if(r()<.45){var bp=(1+ri(n))*(r()<.5?-1:1);if(!def.sub||bp!==def.sub.at)def.bk.push(bp)}
      var L0=build(def),fs=[];L0.seats.forEach(function(s,i){if(free(s))fs.push(i)});
      var k=Math.min(mode==='mobile'?5:6,4+ri(2)+(tier>=2?1:0),fs.length-1),types=[],pool='MCDSPBEMCDP';
      if(r()<.3&&k>=4){types.push('T','T')}
      while(types.length<k){var c=pool[ri(pool.length)];
        if((c==='S'||c==='B'||c==='E')&&types.indexOf(c)>=0)continue;
        if(c==='E'&&n<4)continue;types.push(c)}
      for(var i=types.length-1;i>0;i--){var j=ri(i+1),tmp=types[i];types[i]=types[j];types[j]=tmp}
      def.q=types.join('');
      for(i=fs.length-1;i>0;i--){j=ri(i+1);tmp=fs[i];fs[i]=fs[j];fs[j]=tmp}
      var asg=fs.slice(0,k),L=build(def);
      /* 쌍둥이는 마주 보게, 곰은 끝자리로 미리 옮겨 본다 */
      if(violations(L,asg).length)continue;
      var T=torques(L,asg),ok=true,b;
      for(b=1;b>=0&&ok;b--){T=torques(L,asg);if(T[b]===0)continue;if(b===1&&!L.sub){ok=false;break}
        var fixed=false;for(i=k;i<fs.length&&!fixed;i++){var s=L.seats[fs[i]];if(s.b!==b||s.bag)continue;
          var w=-T[b]/s.pos;if(w>=1&&w<=9&&w===Math.floor(w)){(b?def.sub.bag:def.bag).push([s.pos,w]);fixed=true}}
        if(!fixed)ok=false;else L=build(def)}
      if(!ok)continue;
      /* 좌석 번호는 모래주머니를 더해도 바뀌지 않는다 */
      if(!solved(L,asg))continue;
      if(mode==='live'){var lb=liveBest(L,asg);def.live=lb.d+(tier<3?1:0);if(def.live<2)continue;L=build(def)}
      var res=solve(L,4);if(res.count<1)continue;
      if(mode==='live'){def.live=Math.max(2,res.minD+(tier<3?1:0));L=build(def);res=solve(L,4);if(res.count<1)continue}
      cands++;def.gen={mode:mode,count:res.count,sol:res.sols[0]};
      if(!best||res.count<best.gen.count)best=def;
      if(res.count<=2)break}
    if(!best)return generate(seed+1,tier);
    return best}
  function levelDef(i,seed){if(i<LEVELS.length)return LEVELS[i];
    return generate((seed||1)+i*131,Math.min(4,1+Math.floor((i-LEVELS.length)/3)))}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={AN:AN,LEVELS:LEVELS,build:build,torques:torques,sides:sides,violations:violations,solved:solved,solve:solve,liveBest:liveBest,generate:generate,levelDef:levelDef,free:free};
  if(typeof SG==='undefined')return;
  /* ---------- 게임 ---------- */
  var W=360,H=640,GY=392,TAU=6.2832;
  var lv,L,asg,an,th,om,hist,changes,peeked,showBars,hold,mode,modeT,time,streak,tG=0,runSeed,
      sel,tgt,kbOn,drag,prevDown,falls,tipDir,G,clouds,creakT,lastWarn,viol,chimeT,lvScore,lvBlind=0,slideT,api;
  var keyq=[];
  var pressAt=null;
  if(!window.__seesawZooKeys){window.__seesawZooKeys=true;
    /* 누른 순간의 좌표를 따로 기억한다(프레임 사이에 손가락이 빨리 움직여도 집은 동물을 놓치지 않게) */
    window.addEventListener('pointerdown',function(e){var cv=e.target;if(!cv||cv.tagName!=='CANVAS')return;var r=cv.getBoundingClientRect();
      pressAt={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}},true);
    window.addEventListener('keydown',function(e){var c=e.code;
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Space','KeyZ','KeyX','KeyR','KeyA','KeyD','KeyW','KeyS'].indexOf(c)<0)return;
      if(c==='Tab'&&window.__sg&&window.__sg.state().playing)e.preventDefault();
      if(e.repeat&&(c==='Space'||c==='KeyZ'||c==='KeyR'||c==='KeyX'))return;
      keyq.push(c==='KeyA'?'ArrowLeft':c==='KeyD'?'ArrowRight':c==='KeyW'?'ArrowUp':c==='KeyS'?'ArrowDown':c)})}

  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function T_(o){return o[api.lang]||o.en}

  function geo(){var mob=!!L.sub;
    G={mob:mob,px:180,py:mob?210:346,sp:L.n<=3?44:L.n===4?(mob?34:38):32,sp2:mob&&L.sub.n===1?32:26,rope:102,max:mob?.17:.26,max2:.2};
    G.len=L.n*G.sp+17;G.len2=mob?L.sub.n*G.sp2+15:0;
    G.s=L.live?L.live/.693:7;G.dang=G.max*.6}
  function hang(){var a=L.sub.at*G.sp;return {x:G.px+a*Math.cos(th[0]),y:G.py+a*Math.sin(th[0])}}
  function seatPos(i){var s=L.seats[i],c,sn,lx,ly,ox,oy,a;
    if(s.b===0){a=th[0];ox=G.px;oy=G.py;lx=s.pos*G.sp;ly=-7}
    else{var h=hang();a=th[1];ox=h.x;oy=h.y+G.rope;lx=s.pos*G.sp2;ly=-6}
    c=Math.cos(a);sn=Math.sin(a);return {x:ox+lx*c-ly*sn,y:oy+lx*sn+ly*c,a:a}}
  function unseated(){var u=[],i;for(i=0;i<asg.length;i++)if(asg[i]<0)u.push(i);return u}
  function queuePos(i){var u,k,gap;
    if(L.live){u=unseated();k=u.indexOf(i);return {x:40+k*50,y:566,front:k<2}}
    k=asg.length;gap=Math.min(54,300/k);return {x:180+(i-(k-1)/2)*gap,y:566,front:true}}
  function pickable(i){if(mode!=='play')return false;
    if(asg[i]<0){return L.live?unseated().indexOf(i)<2:true}
    return L.types[i]!=='S'}
  function eff(){if(drag&&drag.lift){var e=asg.slice();e[drag.i]=-1;return e}return asg}
  function occupied(s){for(var i=0;i<asg.length;i++)if(asg[i]===s)return true;return false}
  function openSeat(s){return free(L.seats[s])&&(!occupied(s)||(drag&&drag.lift&&asg[drag.i]===s))}
  function voice(ty){var A=AN[ty],w=ty==='E'||ty==='B'?'sawtooth':ty==='M'||ty==='T'?'square':'triangle';
    api.beep(A.v[0],.07,w);setTimeout(function(){api.beep(A.v[1],.09,w)},75)}

  function load(n){lv=n;L=build(levelDef(n,runSeed),n);geo();asg=[];an=[];
    for(var i=0;i<L.types.length;i++){asg.push(-1);an.push({x:W+40+i*30,y:566,rot:0,ph:hash(n*13+i)*6.28,lock:false})}
    th=[0,0];om=[0,0];hist=[];changes=0;peeked=false;showBars=n<6;hold=0;mode='play';modeT=0;sel=null;tgt=null;drag=null;falls=[];viol=[];slideT=0;chimeT=0}

  function init(a){api=a;time=50;streak=0;prevDown=true;kbOn=false;creakT=0;lastWarn=0;keyq.length=0;lvScore=0;
    runSeed=1+Math.floor(Math.random()*9e5);
    clouds=[];for(var i=0;i<5;i++)clouds.push({x:hash(i+1)*W,y:104+hash(i+9)*150,s:.6+hash(i+5)*.7,v:4+hash(i+3)*8});
    load(0);a.tempo(1)}

  function commit(i,seat){hist.push(asg.slice());if(hist.length>40)hist.shift();asg[i]=seat;changes++;an[i].lock=false;
    voice(L.types[i]);if(seat>=0){var p=seatPos(seat);api.burst(p.x,p.y-4,'#ffe9a8',5);api.sfx('tap');
      if(L.types[i]==='S'){hist=[];api.pop(p.x,p.y-44,'Zzz','#dfe6ff')}}
    hold=0}
  function undo(){if(mode!=='play'||!hist.length){api.beep(160,.08,'sine');return}
    asg=hist.pop();for(var i=0;i<an.length;i++)an[i].lock=false;hold=0;api.beep(520,.05,'triangle');api.beep(390,.08,'triangle');fixSel()}
  function reset(){if(mode!=='play')return;var any=false,i;for(i=0;i<asg.length;i++)if(asg[i]>=0)any=true;if(!any)return;
    for(i=0;i<asg.length;i++){asg[i]=-1;an[i].lock=false}hist=[];streak=0;hold=0;sel=null;api.beep(300,.08,'square');api.beep(220,.12,'square');fixSel()}
  function tip(dir){mode='tip';modeT=0;tipDir=dir;streak=0;falls=[];drag=null;
    for(var i=0;i<asg.length;i++){if(asg[i]<0)continue;var p=seatPos(asg[i]);
      falls[i]={vx:dir*(40+hash(i+tG)*70),vy:-120-hash(i*3+tG)*120,vr:dir*(3+hash(i*7)*5)};an[i].lock=false;asg[i]=-1}
    hist=[];sel=null;api.sfx('hit');api.shake(12);api.pop(180,G.py-70,api.lang==='ko'?'와르르!':'Whoa!','#ff6b6b');
    api.burst(G.px+dir*G.len,G.py+30,'#e8c98a',16)}
  function win(){mode='win';modeT=0;var par=L.types.length,mb=Math.max(0,6-2*(changes-par)),nb=(lv>=6&&!peeked)?5:0,sb=Math.min(10,streak*2);
    lvScore=10+mb+nb+sb;streak++;api.add(lvScore);api.sfx('win');
    lvBlind=nb;api.pop(180,(G.mob?376:226)-34,'+'+lvScore,'#fff3a0');
    for(var i=0;i<asg.length;i++){var p=seatPos(asg[i]);api.burst(p.x,p.y-20,['#ffd75e','#7fe0c8','#ff9db4'][i%3],6)}
    time=Math.min(70,time+13)}

  function kbList(){var q=[],s=[],i;for(i=0;i<asg.length;i++){if(!pickable(i))continue;if(asg[i]<0)q.push(i);else s.push(i)}
    s.sort(function(a,b){return asg[a]-asg[b]});return q.concat(s)}
  function tgtList(){var t=[],s;for(s=0;s<L.seats.length;s++)if(free(L.seats[s])&&!occupied(s))t.push(s);
    if(sel!=null&&asg[sel]>=0&&!L.live)t.push(-1);return t}
  function fixSel(){if(!kbOn)return;var l=kbList();if(sel==null||l.indexOf(sel)<0)sel=l.length?l[0]:null;
    var t=tgtList();if(tgt==null||t.indexOf(tgt)<0)tgt=t.length?t[0]:null}
  function keys(){var c;while(keyq.length){c=keyq.shift();
      if(mode!=='play')continue;
      if(c==='KeyZ'){undo();continue}if(c==='KeyR'){reset();continue}if(c==='KeyX'){togglePeek();continue}
      var first=!kbOn;kbOn=true;drag=null;fixSel();var l=kbList(),t=tgtList(),k;if(first&&c!=='Space'){api.beep(700,.03,'sine');continue}
      if(c==='ArrowLeft'||c==='ArrowRight'){if(!l.length)continue;k=l.indexOf(sel);k=(k+(c==='ArrowLeft'?l.length-1:1))%l.length;sel=l[k];
        voice(L.types[sel]);tgt=null;fixSel()}
      else if(c==='ArrowUp'||c==='ArrowDown'||c==='Tab'){if(!t.length)continue;k=t.indexOf(tgt);k=(k+(c==='ArrowUp'?t.length-1:1))%t.length;tgt=t[k];api.beep(700,.03,'sine')}
      else if(c==='Space'){if(sel==null||tgt==null){api.beep(160,.08,'sine');continue}
        var was=asg[sel]<0;commit(sel,tgt);if(was||tgt<0)sel=null;tgt=null;fixSel()}}}
  function togglePeek(){if(lv<6)return;showBars=!showBars;if(showBars)peeked=true;api.beep(showBars?880:440,.06,'sine')}

  function hitAnimal(x,y){var best=null,bd=1e9,i,A,d;for(i=0;i<an.length;i++){if(!pickable(i))continue;A=AN[L.types[i]];
      d=Math.hypot(x-an[i].x,y-(an[i].y-A.r));if(d<A.r+12&&d<bd){bd=d;best=i}}return best}
  function nearSeat(x,y,rad){var best=null,bd=rad,s,p,d;for(s=0;s<L.seats.length;s++){if(!openSeat(s))continue;p=seatPos(s);
      d=Math.hypot(x-p.x,y-(p.y-12));if(d<bd){bd=d;best=s}}return best}
  function pointer(inp){var press=inp.down&&!prevDown,rel=!inp.down&&prevDown;prevDown=inp.down;
    if(mode!=='play'){drag=null;return}
    if(press&&inp.x!=null){kbOn=false;tgt=null;var x=pressAt?pressAt.x:inp.x,y=pressAt?pressAt.y:inp.y;pressAt=null;
      if(y>594&&x<56){undo();return}if(y>594&&x<110){reset();return}
      if(lv>=6&&y>66&&y<102&&x>90&&x<270){togglePeek();return}
      var h=hitAnimal(x,y);
      if(sel!=null&&(h==null||h===sel)){var s0=nearSeat(x,y+10,30);if(s0!=null&&pickable(sel)){commit(sel,s0);sel=null;return}}
      if(h!=null){drag={i:h,sx:x,sy:y,moved:false,lift:false};voice(L.types[h]);return}
      sel=null}
    if(drag&&inp.down&&inp.x!=null){
      if(!drag.moved&&Math.hypot(inp.x-drag.sx,inp.y-drag.sy)>9){drag.moved=true;sel=null;if(asg[drag.i]>=0){drag.lift=true;an[drag.i].lock=false}}
      if(drag.moved)drag.hover=nearSeat(inp.x,inp.y-8,36)}
    if(rel&&drag){var d=drag;
      if(!d.moved){drag=null;sel=sel===d.i?null:d.i;return}
      var s=d.hover;
      if(s!=null&&s!==asg[d.i]){drag=null;commit(d.i,s)}
      else if(s==null&&asg[d.i]>=0&&!L.live&&inp.y>486){drag=null;commit(d.i,-1)}
      else{drag=null;an[d.i].lock=false;api.beep(240,.05,'sine')}}}

  function update(dt,inp,a){api=a;tG+=dt;modeT+=dt;var i,b;
    keys();pointer(inp);
    /* 시소 물리: 토크에 따른 평형각을 향해 감쇠 진동 */
    var e=eff(),T=torques(L,e),mx=[G.max,G.max2];
    for(b=0;b<2;b++){var eq=mode==='tip'&&b===0?tipDir*(G.mob?.42:G.max):mx[b]*Math.tanh(T[b]/(b?6:G.s)),k=mode==='tip'?90:38;
      om[b]+=(k*(eq-th[b])-6.2*om[b])*dt;th[b]+=om[b]*dt;
      if(b===0&&!G.mob&&Math.abs(th[0])>G.max){th[0]=G.max*(th[0]>0?1:-1);if(Math.abs(om[0])>.5){a.beep(90,.1,'sine');a.burst(G.px+(th[0]>0?1:-1)*G.len,GY-2,'#e8d7a0',5)}om[0]*=-.25}}
    creakT-=dt;if(Math.abs(om[0])>.16&&creakT<=0){creakT=.085;a.beep(80+Math.abs(th[0])/G.max*190+Math.abs(om[0])*40,.045,'sawtooth')}
    viol=violations(L,e);
    if(mode==='play'){
      time-=dt;
      if(L.live&&Math.abs(T[0])>L.live&&Math.abs(th[0])>=G.dang*.97)tip(T[0]>0?1:-1);
      else if(!drag&&solved(L,asg)){var ph=hold;hold+=dt;if(ph===0){a.beep(1319,.12,'sine')}
        if(Math.floor(hold/.5)>Math.floor(ph/.5))a.beep(1047+Math.floor(hold/.5)*262,.1,'sine');
        if(hold>=1.5)win()}else hold=0;
      if(time<=5&&Math.ceil(time)!==lastWarn&&time>0){lastWarn=Math.ceil(time);a.beep(440,.08,'square')}
      a.tempo(time<12?1.3:1);
      if(time<=0){time=0;a.over();return}}
    else if(mode==='tip'){if(modeT>1.5){mode='play';modeT=0;falls=[];fixSel()}}
    else if(mode==='win'){if(modeT>1.5){load(lv+1);fixSel();return}}
    /* 동물 위치 */
    for(i=0;i<an.length;i++){var o=an[i],tx,ty,tr=0,p;
      if(mode==='tip'&&falls[i]){var f=falls[i];f.vy+=900*dt;o.x+=f.vx*dt;o.y+=f.vy*dt;o.rot+=f.vr*dt;
        if(o.x<16||o.x>W-16){o.x=o.x<16?16:W-16;f.vx*=-.6}
        if(o.y>GY+6&&f.vy>0){o.y=GY+6;f.vy*=-.45;f.vx*=.7;f.vr*=.6;if(Math.abs(f.vy)>60)a.beep(120+hash(i)*80,.05,'sine')}continue}
      if(drag&&drag.i===i&&drag.moved&&inp.x!=null){tx=inp.x;ty=inp.y-8;if(drag.hover!=null){p=seatPos(drag.hover);tx=tx*.4+p.x*.6;ty=ty*.4+(p.y-10)*.6}}
      else if(asg[i]>=0){p=seatPos(asg[i]);tx=p.x;ty=p.y;tr=p.a;if(o.lock){o.x=tx;o.y=ty;o.rot=tr;continue}
        if(Math.hypot(tx-o.x,ty-o.y)<2.5){o.lock=true}}
      else{p=queuePos(i);tx=p.x;ty=p.y}
      var kk=1-Math.exp(-dt*(drag&&drag.i===i?30:14));o.x+=(tx-o.x)*kk;o.y+=(ty-o.y)*kk;
      var dr=tr-o.rot;while(dr>3.1416)dr-=TAU;while(dr<-3.1416)dr+=TAU;o.rot+=dr*kk}
    for(i=0;i<clouds.length;i++){clouds[i].x+=clouds[i].v*dt;if(clouds[i].x>W+70)clouds[i].x=-70}}

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function ell(g,x,y,rx,ry,rot){g.beginPath();g.ellipse(x,y,rx,ry,rot||0,0,TAU)}
  function ears(g,ty,r,cy,A){g.fillStyle=A.d;
    if(ty==='M'){g.fillStyle=A.c;ell(g,-r*.75,cy-r*.75,r*.5,r*.5);g.fill();ell(g,r*.75,cy-r*.75,r*.5,r*.5);g.fill();
      g.fillStyle='#f6b8c4';ell(g,-r*.75,cy-r*.75,r*.28,r*.28);g.fill();ell(g,r*.75,cy-r*.75,r*.28,r*.28);g.fill()}
    else if(ty==='C'){[-1,1].forEach(function(s){g.fillStyle=A.c;g.beginPath();g.moveTo(s*r*.95,cy-r*.3);g.lineTo(s*r*.8,cy-r*1.35);g.lineTo(s*r*.2,cy-r*.85);g.fill();
        g.fillStyle='#ffd9b0';g.beginPath();g.moveTo(s*r*.8,cy-r*.55);g.lineTo(s*r*.74,cy-r*1.12);g.lineTo(s*r*.42,cy-r*.82);g.fill()})}
    else if(ty==='T'){[-1,1].forEach(function(s){g.fillStyle=A.c;ell(g,s*r*.42,cy-r*1.35,r*.24,r*.7,s*.14);g.fill();g.fillStyle='#ffc2cf';ell(g,s*r*.42,cy-r*1.35,r*.11,r*.48,s*.14);g.fill()})}
    else if(ty==='D'){[-1,1].forEach(function(s){ell(g,s*r*.95,cy-r*.25,r*.3,r*.62,s*-.3);g.fill()})}
    else if(ty==='S'){}
    else if(ty==='P'){[-1,1].forEach(function(s){g.beginPath();g.moveTo(s*r*.9,cy-r*.45);g.lineTo(s*r*.75,cy-r*1.15);g.lineTo(s*r*.3,cy-r*.85);g.fill()})}
    else if(ty==='B'){[-1,1].forEach(function(s){g.fillStyle=A.c;ell(g,s*r*.7,cy-r*.8,r*.3,r*.3);g.fill();g.fillStyle=A.d;ell(g,s*r*.7,cy-r*.8,r*.15,r*.15);g.fill()})}
    else if(ty==='E'){[-1,1].forEach(function(s){g.fillStyle=A.d;ell(g,s*r*1.02,cy-r*.2,r*.5,r*.72,s*.2);g.fill();g.fillStyle='#c9d5ea';ell(g,s*r*1.04,cy-r*.2,r*.3,r*.5,s*.2);g.fill()})}}
  function drawAnimal(g,ty,x,y,rot,sc,mood,ph,o){
    var A=AN[ty],r=A.r,cy=-r*.92,bob=0,trm=0,ex=r*.36,ey=cy-r*.2,er=Math.max(1.8,r*.13),i,s;
    if(mood==='cheer')bob=-Math.abs(Math.sin(tG*7-x*.03))*7;
    if(mood==='scared')trm=Math.sin(tG*60)*1.4;
    g.save();g.translate(x+trm,y+bob);g.rotate(rot);g.scale(sc,sc);if(o&&o.alpha!=null)g.globalAlpha=o.alpha;
    /* 다리 */
    var sw=mood==='nervous'?Math.sin(tG*10+ph)*.5:mood==='cheer'?Math.sin(tG*12+ph)*.3:Math.sin(tG*1.5+ph)*.08;
    g.fillStyle=A.d;for(s=-1;s<=1;s+=2){g.save();g.translate(s*r*.4,-2);g.rotate(sw*s);ell(g,0,r*.3+2,r*.2,r*.34);g.fill();g.restore()}
    /* 꼬리 */
    g.strokeStyle=A.d;g.lineWidth=2;g.lineCap='round';
    if(ty==='M'||ty==='C'){g.beginPath();g.moveTo(r*.8,cy+r*.6);g.quadraticCurveTo(r*1.5,cy+r*.5+Math.sin(tG*3+ph)*3,r*1.35,cy-r*.2);g.stroke()}
    if(ty==='P'){g.beginPath();g.arc(r*1.02,cy+r*.3,r*.16,0,5);g.stroke()}
    ears(g,ty,r,cy,A);
    /* 몸 */
    var gr=g.createRadialGradient(-r*.3,cy-r*.4,r*.2,0,cy,r*1.15);gr.addColorStop(0,'#fff');gr.addColorStop(.25,A.c);gr.addColorStop(1,A.d);
    g.fillStyle=gr;ell(g,0,cy,r,r*.96);g.fill();g.lineWidth=1.2;g.strokeStyle='rgba(60,40,30,.35)';g.stroke();
    if(ty==='C'){g.strokeStyle=A.d;g.lineWidth=1.6;for(i=-1;i<=1;i++){g.beginPath();g.moveTo(i*r*.2,cy-r*.9);g.lineTo(i*r*.2,cy-r*.66);g.stroke()}}
    if(ty==='S'){g.fillStyle='#7a6248';ell(g,-ex,ey,r*.26,r*.19,.5);g.fill();ell(g,ex,ey,r*.26,r*.19,-.5);g.fill()}
    /* 팔 */
    g.fillStyle=A.d;
    if(mood==='cheer'){for(s=-1;s<=1;s+=2){g.save();g.translate(s*r*.85,cy-r*.1);g.rotate(s*(.5+Math.sin(tG*12+ph)*.3));ell(g,0,-r*.42,r*.17,r*.38);g.fill();g.restore()}}
    else{for(s=-1;s<=1;s+=2){ell(g,s*r*.86,cy+r*.32,r*.17,r*.3,s*.35);g.fill()}}
    /* 눈 */
    var blink=((tG+ph*3)%3.6)<.12,ink='#33241c';
    g.fillStyle=ink;g.strokeStyle=ink;g.lineWidth=Math.max(1.3,r*.09);
    if(mood==='cheer'){for(s=-1;s<=1;s+=2){g.beginPath();g.arc(s*ex,ey+er*.4,er*1.1,3.5,5.9);g.stroke()}}
    else if(ty==='S'&&mood!=='wow'){for(s=-1;s<=1;s+=2){g.strokeStyle='#fff';g.beginPath();g.arc(s*ex,ey-er*.3,er,.4,2.74);g.stroke()}}
    else if(blink){for(s=-1;s<=1;s+=2){g.beginPath();g.moveTo(s*ex-er,ey);g.lineTo(s*ex+er,ey);g.stroke()}}
    else if(mood==='nervous'||mood==='scared'||mood==='wow'){for(s=-1;s<=1;s+=2){g.fillStyle='#fff';ell(g,s*ex,ey,er*1.7,er*1.8);g.fill();g.fillStyle=ink;ell(g,s*ex,ey+(mood==='nervous'?er*.5:0),er*.7,er*.7);g.fill()}}
    else{for(s=-1;s<=1;s+=2){g.fillStyle=ink;ell(g,s*ex,ey,er,er*1.15);g.fill();g.fillStyle='#fff';ell(g,s*ex-er*.3,ey-er*.4,er*.35,er*.35);g.fill()}
      if(mood==='smug'){g.fillStyle=A.c;g.fillRect(-ex-er*1.6,ey-er*1.5,ex*2+er*3.2,er*1.25);g.strokeStyle=ink;for(s=-1;s<=1;s+=2){g.beginPath();g.moveTo(s*ex-er*1.2,ey-er*.25);g.lineTo(s*ex+er*1.2,ey-er*.25);g.stroke()}}
      if(mood==='angry'){g.strokeStyle=ink;for(s=-1;s<=1;s+=2){g.beginPath();g.moveTo(s*(ex+er*1.3),ey-er*2.2);g.lineTo(s*(ex-er*1.1),ey-er*1.2);g.stroke()}}}
    /* 코와 입 */
    var my=cy+r*.12;g.strokeStyle=ink;g.lineWidth=Math.max(1.2,r*.08);
    if(ty==='P'){g.fillStyle='#ff7d9c';ell(g,0,my-r*.02,r*.3,r*.21);g.fill();g.fillStyle='#c94a6b';ell(g,-r*.1,my-r*.02,r*.05,r*.08);g.fill();ell(g,r*.1,my-r*.02,r*.05,r*.08);g.fill();my+=r*.2}
    else if(ty==='E'){g.strokeStyle=A.d;g.lineWidth=r*.3;g.beginPath();g.moveTo(0,my-r*.1);g.quadraticCurveTo(-r*.05,my+r*.5,r*.3+Math.sin(tG*2+ph)*r*.1,my+r*.42+(mood==='cheer'?-r*.5:0));g.stroke();g.strokeStyle=ink;g.lineWidth=1.3;my+=r*.02}
    else if(ty==='D'||ty==='B'){g.fillStyle=ty==='D'?'#f3dcc0':'#c9a27f';ell(g,0,my+r*.05,r*.34,r*.25);g.fill();g.fillStyle=ink;ell(g,0,my-r*.06,r*.12,r*.09);g.fill();my+=r*.1}
    else if(ty==='S'){g.fillStyle='#5a4634';ell(g,0,my-r*.04,r*.11,r*.08);g.fill();my+=r*.06}
    else{g.fillStyle='#ff8fa3';ell(g,0,my-r*.06,r*.09,r*.07);g.fill();
      if(ty!=='T'){g.strokeStyle='rgba(60,40,30,.5)';g.lineWidth=1;for(s=-1;s<=1;s+=2){g.beginPath();g.moveTo(s*r*.2,my-r*.02);g.lineTo(s*r*.7,my-r*.1);g.moveTo(s*r*.2,my+r*.04);g.lineTo(s*r*.7,my+r*.1);g.stroke()}}
      g.strokeStyle=ink;g.lineWidth=Math.max(1.2,r*.08)}
    if(ty!=='E'){g.beginPath();
      if(mood==='cheer'){g.fillStyle='#7a2f3a';g.arc(0,my+r*.08,r*.16,0,3.1416);g.fill()}
      else if(mood==='nervous'||mood==='scared'){g.moveTo(-r*.16,my+r*.14);g.lineTo(-r*.05,my+r*.08);g.lineTo(r*.05,my+r*.14);g.lineTo(r*.16,my+r*.08);g.stroke()}
      else if(mood==='angry'){g.arc(0,my+r*.2,r*.14,3.6,5.8);g.stroke()}
      else{g.arc(0,my+r*.02,r*(mood==='smug'?.2:.13),.3,2.84);g.stroke()}}
    if(mood==='nervous'){g.fillStyle='#8fd3ff';g.beginPath();g.moveTo(r*.78,cy-r*.75);g.quadraticCurveTo(r*.98,cy-r*.4,r*.78,cy-r*.36);g.quadraticCurveTo(r*.58,cy-r*.4,r*.78,cy-r*.75);g.fill()}
    if(ty==='T'){g.fillStyle='#ff6f91';g.beginPath();g.moveTo(0,cy-r*.92);g.lineTo(-r*.3,cy-r*1.12);g.lineTo(-r*.3,cy-r*.72);g.lineTo(r*.3,cy-r*1.12);g.lineTo(r*.3,cy-r*.72);g.fill()}
    /* 무게 배지 */
    g.rotate(-rot);var by=cy+r*.62,br=r>14?8:7;g.fillStyle='rgba(0,0,0,.25)';ell(g,.8,by+1.2,br,br);g.fill();
    g.fillStyle='#fffdf2';ell(g,0,by,br,br);g.fill();g.lineWidth=1.5;g.strokeStyle='#3b6fb0';g.stroke();
    g.fillStyle='#234a7d';g.font='800 '+(A.w>9?10:11)+'px Jua, system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(A.w,0,by+.5);g.textBaseline='alphabetic';
    g.restore()}
  function head(g,ty,x,y,r){var A=AN[ty];g.save();g.translate(x,y+r*.92);ears(g,ty,r,-r*.92,A);g.fillStyle=A.c;ell(g,0,-r*.92,r,r*.95);g.fill();g.strokeStyle='rgba(60,40,30,.5)';g.lineWidth=1;g.stroke();
    g.fillStyle='#33241c';ell(g,-r*.36,-r*1.05,1.3,1.5);g.fill();ell(g,r*.36,-r*1.05,1.3,1.5);g.fill();
    if(ty==='P'){g.fillStyle='#ff7d9c';ell(g,0,-r*.72,r*.32,r*.22);g.fill()}
    if(ty==='E'){g.strokeStyle=A.d;g.lineWidth=2.2;g.beginPath();g.moveTo(0,-r*.9);g.lineTo(0,-r*.3);g.stroke()}
    if(ty==='S'){g.strokeStyle='#7a6248';g.lineWidth=2;g.beginPath();g.moveTo(-r*.7,-r*1.05);g.lineTo(r*.7,-r*1.05);g.stroke()}
    g.restore()}

  function bg(g){var i,c,gr=g.createLinearGradient(0,0,0,GY);gr.addColorStop(0,'#58b7f2');gr.addColorStop(.6,'#a9defa');gr.addColorStop(1,'#e6f6e0');
    g.fillStyle=gr;g.fillRect(-20,-20,W+40,GY+20);
    /* 해 */
    g.save();g.translate(306,92);g.rotate(tG*.08);g.fillStyle='rgba(255,236,150,.35)';for(i=0;i<10;i++){g.rotate(TAU/10);g.beginPath();g.moveTo(-5,0);g.lineTo(0,-46);g.lineTo(5,0);g.fill()}
    g.restore();gr=g.createRadialGradient(302,88,4,306,92,26);gr.addColorStop(0,'#fffbe0');gr.addColorStop(1,'#ffd95a');g.fillStyle=gr;ell(g,306,92,24,24);g.fill();
    /* 구름 */
    for(i=0;i<clouds.length;i++){c=clouds[i];g.fillStyle='rgba(255,255,255,'+(.55+.3*hash(i))+')';
      ell(g,c.x,c.y,30*c.s,12*c.s);g.fill();ell(g,c.x-16*c.s,c.y+3*c.s,18*c.s,9*c.s);g.fill();ell(g,c.x+12*c.s,c.y-7*c.s,17*c.s,12*c.s);g.fill()}
    /* 언덕 */
    g.fillStyle='#9ad8a0';g.beginPath();g.moveTo(-20,GY);g.quadraticCurveTo(70,GY-84,190,GY-20);g.quadraticCurveTo(290,GY-76,380,GY-30);g.lineTo(380,GY);g.fill();
    g.fillStyle='#7fca86';g.beginPath();g.moveTo(-20,GY);g.quadraticCurveTo(110,GY-40,220,GY-8);g.quadraticCurveTo(310,GY-36,380,GY-8);g.lineTo(380,GY);g.fill();
    /* 연 */
    var kx=62+Math.sin(tG*.7)*14,ky=150+Math.cos(tG*.9)*9,ka=Math.sin(tG*.9)*.2;
    g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1;g.beginPath();g.moveTo(8,GY-30);g.quadraticCurveTo(30,GY-150,kx,ky+14);g.stroke();
    g.save();g.translate(kx,ky);g.rotate(ka);g.fillStyle='#ff6f6f';g.beginPath();g.moveTo(0,-17);g.lineTo(12,0);g.lineTo(0,17);g.lineTo(-12,0);g.fill();
    g.fillStyle='#ffd75e';g.beginPath();g.moveTo(0,-17);g.lineTo(12,0);g.lineTo(0,0);g.fill();g.beginPath();g.moveTo(0,17);g.lineTo(-12,0);g.lineTo(0,0);g.fill();
    g.strokeStyle='#ff9db4';g.lineWidth=2;g.beginPath();g.moveTo(0,17);for(i=1;i<=5;i++)g.lineTo(Math.sin(tG*4+i)*5,17+i*7);g.stroke();g.restore();
    /* 나무 */
    [[18,1.05,0],[344,.9,2]].forEach(function(t){var sw=Math.sin(tG*1.1+t[2])*4;g.fillStyle='#8a5a34';g.fillRect(t[0]-5,GY-70*t[1],10,70*t[1]+4);
      g.fillStyle='#3f9d5c';ell(g,t[0]+sw*.5,GY-84*t[1],30*t[1],28*t[1]);g.fill();g.fillStyle='#57b972';ell(g,t[0]-8+sw,GY-98*t[1],20*t[1],18*t[1]);g.fill();ell(g,t[0]+12+sw,GY-76*t[1],16*t[1],13*t[1]);g.fill()});
    /* 잔디와 모래밭 */
    gr=g.createLinearGradient(0,GY,0,H);gr.addColorStop(0,'#74c365');gr.addColorStop(.25,'#5aad55');gr.addColorStop(1,'#3d8a49');g.fillStyle=gr;g.fillRect(-20,GY,W+40,H-GY+20);
    g.fillStyle='rgba(255,255,255,.12)';for(i=0;i<14;i++){var fx=hash(i+70)*W,fy=GY+8+hash(i+90)*70;g.beginPath();g.moveTo(fx-3,fy);g.lineTo(fx+Math.sin(tG*1.6+i)*2,fy-7);g.lineTo(fx+3,fy);g.fill()}
    g.fillStyle='#b98a52';rr(g,236,410,100,34,8);g.fill();g.fillStyle='#f3dfa2';rr(g,241,414,90,26,6);g.fill();
    g.fillStyle='#e8cf8a';ell(g,266,428,14,6);g.fill();g.fillStyle='#ff7b7b';g.beginPath();g.moveTo(300,416);g.lineTo(316,416);g.lineTo(313,432);g.lineTo(303,432);g.fill();
    g.strokeStyle='#fff';g.lineWidth=1.5;g.beginPath();g.arc(308,416,7,3.1416,0);g.stroke()}

  function beam(g,b){var n=L.bn[b],sp=b?G.sp2:G.sp,len=b?G.len2:G.len,th_=b?9:13,i,s,p;
    var gr=g.createLinearGradient(0,-th_/2,0,th_/2);gr.addColorStop(0,'#e6b877');gr.addColorStop(.5,'#c98f4d');gr.addColorStop(1,'#96622c');
    g.fillStyle='rgba(0,0,0,.18)';rr(g,-len+2,-th_/2+4,len*2,th_,5);g.fill();
    g.fillStyle=gr;rr(g,-len,-th_/2,len*2,th_,5);g.fill();g.strokeStyle='#7a4c1f';g.lineWidth=1.3;g.stroke();
    g.strokeStyle='rgba(122,76,31,.35)';g.lineWidth=1;for(i=0;i<4;i++){g.beginPath();g.moveTo(-len+10+hash(i+b*5)*len,-1+i%2*3);g.lineTo(-len+40+hash(i+b*5)*len*1.6,-1+i%2*3);g.stroke()}
    g.font='800 '+(b?9:10)+'px Jua, system-ui, sans-serif';g.textAlign='center';
    for(i=0;i<L.seats.length;i++){s=L.seats[i];if(s.b!==b)continue;p=s.pos*sp;
      if(s.broken){g.fillStyle='#4a2f16';g.beginPath();g.moveTo(p-9,-th_/2-1);g.lineTo(p-4,1);g.lineTo(p,-3);g.lineTo(p+4,2);g.lineTo(p+9,-th_/2-1);g.fill();
        g.strokeStyle='#ff5252';g.lineWidth=2.5;g.beginPath();g.moveTo(p-6,-th_/2-15);g.lineTo(p+6,-th_/2-5);g.moveTo(p+6,-th_/2-15);g.lineTo(p-6,-th_/2-5);g.stroke();continue}
      g.fillStyle=s.pos<0?'#ff9a5a':'#3fc1b0';rr(g,p-9,-th_/2-3,18,4,2);g.fill();
      g.fillStyle='rgba(255,250,235,.95)';g.fillText(Math.abs(s.pos),p,th_/2-2.2);
      if(s.bag){var y0=-th_/2-3;g.fillStyle='#b99b6b';g.beginPath();g.moveTo(p-12,y0);g.quadraticCurveTo(p-15,y0-20,p-5,y0-23);g.lineTo(p+5,y0-23);g.quadraticCurveTo(p+15,y0-20,p+12,y0);g.fill();
        g.strokeStyle='#7d6238';g.lineWidth=1.3;g.stroke();g.fillStyle='#8f7446';g.beginPath();g.moveTo(p-6,y0-22);g.lineTo(p,y0-30);g.lineTo(p+6,y0-22);g.fill();
        g.fillStyle='#fffdf2';ell(g,p,y0-10,7.5,7.5);g.fill();g.strokeStyle='#7d6238';g.stroke();g.fillStyle='#5a431f';g.font='800 11px Jua, system-ui, sans-serif';g.textBaseline='middle';g.fillText(s.bag,p,y0-9.5);g.textBaseline='alphabetic';g.font='800 '+(b?9:10)+'px Jua, system-ui, sans-serif'}}}

  function seesaw(g){var i,h;
    if(G.mob){/* 그네 틀 */
      g.strokeStyle='#d9534f';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(20,GY+4);g.lineTo(44,118);g.lineTo(316,118);g.lineTo(340,GY+4);g.stroke();
      g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.beginPath();g.moveTo(46,116);g.lineTo(314,116);g.stroke();
      g.strokeStyle='#f5efe0';g.lineWidth=2;g.beginPath();g.moveTo(180,118);g.lineTo(G.px,G.py);g.stroke();
    }else{g.fillStyle='rgba(0,0,0,.16)';ell(g,180,GY+3,150,9);g.fill();
      var gr=g.createLinearGradient(150,0,212,0);gr.addColorStop(0,'#d9a561');gr.addColorStop(1,'#8f5c28');
      g.fillStyle=gr;g.beginPath();g.moveTo(G.px,G.py-4);g.lineTo(G.px+32,GY+2);g.lineTo(G.px-32,GY+2);g.closePath();g.fill();g.strokeStyle='#6d431a';g.lineWidth=1.5;g.stroke()}
    /* 위험 구역 */
    if(L.live){for(i=0;i<4;i++){var sg=i<2?1:-1,base=i%2?3.1416:0,a0=base+sg*G.dang,a1=base+sg*(G.dang+.2);
        g.fillStyle='rgba(255,70,70,'+(.16+.06*Math.sin(tG*5))+')';g.beginPath();g.moveTo(G.px,G.py);g.arc(G.px,G.py,G.len+8,Math.min(a0,a1),Math.max(a0,a1));g.closePath();g.fill();
        g.strokeStyle='#ff4d4d';g.lineWidth=1.6;g.setLineDash([5,4]);g.beginPath();g.moveTo(G.px+Math.cos(a0)*30,G.py+Math.sin(a0)*30);g.lineTo(G.px+Math.cos(a0)*(G.len+8),G.py+Math.sin(a0)*(G.len+8));g.stroke();g.setLineDash([])}}
    if(G.mob){h=hang();g.strokeStyle='#f5efe0';g.lineWidth=2;g.beginPath();g.moveTo(h.x,h.y);g.lineTo(h.x,h.y+G.rope-4);g.stroke();
      g.save();g.translate(h.x,h.y+G.rope);g.rotate(th[1]);beam(g,1);g.fillStyle='#6d431a';ell(g,0,-1,4,4);g.fill();g.restore()}
    g.save();g.translate(G.px,G.py);g.rotate(th[0]);beam(g,0);
    if(G.mob){g.fillStyle='#f5efe0';ell(g,L.sub.at*G.sp,0,4.5,4.5);g.fill();g.strokeStyle='#6d431a';g.lineWidth=1.5;g.stroke()}
    g.restore();
    g.fillStyle='#5b3713';ell(g,G.px,G.py,6,6);g.fill();g.fillStyle='#f0c987';ell(g,G.px,G.py,2.5,2.5);g.fill();
    /* 수평계 */
    var vx=180,vy=G.mob?132:GY-18,ok=hold>0||mode==='win',bx=Math.max(-15,Math.min(15,-th[0]/G.max*15));
    g.fillStyle='rgba(40,30,20,.55)';rr(g,vx-23,vy-8,46,16,8);g.fill();
    g.fillStyle=ok?'#b9ffb0':'#d8f6a0';rr(g,vx-20,vy-5.5,40,11,5.5);g.fill();
    g.strokeStyle='rgba(40,60,20,.6)';g.lineWidth=1;g.beginPath();g.moveTo(vx-6,vy-5.5);g.lineTo(vx-6,vy+5.5);g.moveTo(vx+6,vy-5.5);g.lineTo(vx+6,vy+5.5);g.stroke();
    if(ok){g.fillStyle='rgba(255,255,200,'+(.5+.4*Math.sin(tG*14))+')';ell(g,vx,vy,9+hold*3,9+hold*3);g.fill()}
    g.fillStyle='rgba(255,255,255,.95)';ell(g,vx+bx,vy,4.6,4.2);g.fill();g.strokeStyle='rgba(70,110,40,.7)';g.stroke();
    if(hold>0&&mode==='play'){g.strokeStyle='#fff';g.lineWidth=4;g.lineCap='round';g.beginPath();g.arc(vx,vy,17,-1.57,-1.57+TAU*Math.min(1,hold/1.5));g.stroke()}}

  function bars(g){var S=sides(L,eff()),rows=L.sub?2:1,b,y,i;
    if(!showBars){g.fillStyle='rgba(20,40,70,.4)';rr(g,104,72,152,24,12);g.fill();
      g.strokeStyle='#fff';g.lineWidth=1.6;g.beginPath();g.moveTo(118,84);g.quadraticCurveTo(127,76,136,84);g.quadraticCurveTo(127,92,118,84);g.stroke();g.fillStyle='#fff';ell(g,127,84,2.6,2.6);g.fill();
      g.font='12px Jua, system-ui, sans-serif';g.textAlign='left';g.fillText(api.lang==='ko'?'엿보기 (보너스 포기)':'Peek (lose bonus)',142,88);return}
    for(b=0;b<rows;b++){var l=S[b][0],r=S[b][1],sc=Math.max(10,l,r),hw=rows>1?9:13,eq=l===r&&l>0;y=rows>1?72+b*17:76;
      g.fillStyle='rgba(20,40,70,.32)';rr(g,22,y-hw/2-2,316,hw+4,(hw+4)/2);g.fill();
      for(i=0;i<2;i++){var v=i?r:l,w=v/sc*132,col=i?'#3fc1b0':'#ff9a5a';if(w<=0)continue;
        g.save();g.shadowColor=eq?'#fff3a0':col;g.shadowBlur=eq?14:7;g.fillStyle=eq?'#ffe066':col;
        if(i)rr(g,196,y-hw/2,Math.max(w,6),hw,hw/2);else rr(g,164-Math.max(w,6),y-hw/2,Math.max(w,6),hw,hw/2);g.fill();g.restore()}
      g.fillStyle='#fff';g.font='800 '+(rows>1?12:15)+'px Jua, system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';
      g.fillText(l===r?'=':l>r?'>':'<',180,y+1);g.textAlign='right';g.fillText(l,172-(rows>1?6:8),y+1);g.textAlign='left';g.fillText(r,188+(rows>1?6:8),y+1);
      g.textBaseline='alphabetic'}}

  function chip(g,x,rule,bad){var w=50,y=42;g.fillStyle=bad?'rgba(255,80,80,'+(.75+.25*Math.sin(tG*12))+')':'rgba(255,255,255,.78)';rr(g,x,y,w,22,11);g.fill();
    g.strokeStyle='#d63b3b';g.fillStyle='#d63b3b';g.lineWidth=2;g.lineCap='round';var cx=x+w/2,cy=y+11;
    if(bad){g.strokeStyle='#fff';g.fillStyle='#fff'}
    if(rule==='cd'){head(g,'C',x+11,cy+1,6);head(g,'D',x+w-11,cy+1,6);g.beginPath();g.moveTo(cx-4,cy-4);g.lineTo(cx+4,cy+4);g.moveTo(cx+4,cy-4);g.lineTo(cx-4,cy+4);g.stroke()}
    else if(rule==='mc'){head(g,'M',x+11,cy+1,5.5);head(g,'C',x+w-11,cy+1,6);g.beginPath();g.moveTo(cx,cy-5);g.lineTo(cx+5,cy+5);g.lineTo(cx-5,cy+5);g.closePath();g.fill()}
    else if(rule==='be'){head(g,'B',x+13,cy+1,6.5);g.beginPath();g.moveTo(cx-1,cy);g.lineTo(cx+12,cy);g.moveTo(cx+8,cy-4);g.lineTo(cx+12,cy);g.lineTo(cx+8,cy+4);g.moveTo(cx+16,cy-6);g.lineTo(cx+16,cy+6);g.stroke()}
    else if(rule==='tw'){head(g,'T',x+11,cy+3,5);head(g,'T',x+w-11,cy+3,5);g.beginPath();g.moveTo(cx-4,cy-2);g.lineTo(cx+4,cy-2);g.moveTo(cx-4,cy+3);g.lineTo(cx+4,cy+3);g.stroke()}
    else if(rule==='sl'){head(g,'S',x+14,cy+1,6.5);g.fillStyle=bad?'#fff':'#555';rr(g,cx+4,cy-1,12,9,2);g.fill();g.strokeStyle=bad?'#fff':'#555';g.beginPath();g.arc(cx+10,cy-1,3.6,3.1416,0);g.stroke()}}

  function draw(g,a){api=a;if(!L)return;var i,p,o,s;
    bg(g);seesaw(g);
    /* 좌석 안내 */
    if(mode==='play'&&(drag&&drag.moved||sel!=null)){for(s=0;s<L.seats.length;s++){if(!openSeat(s))continue;p=seatPos(s);
        var hot=(drag&&drag.hover===s)||(kbOn&&tgt===s);g.fillStyle=hot?'rgba(255,255,255,.85)':'rgba(255,255,255,.4)';ell(g,p.x,p.y-12,hot?13+Math.sin(tG*9)*2:5,hot?13+Math.sin(tG*9)*2:5);g.fill();
        if(hot){g.strokeStyle='#ffb300';g.lineWidth=2.5;g.stroke();g.fillStyle='#ffb300';var ay=p.y-40+Math.sin(tG*8)*3;g.beginPath();g.moveTo(p.x-7,ay);g.lineTo(p.x+7,ay);g.lineTo(p.x,ay+9);g.fill()}}}
    /* 대기석 / 컨베이어 */
    if(L.live){g.fillStyle='#4b5563';rr(g,8,566,300,14,7);g.fill();g.fillStyle='#9aa4b5';for(i=0;i<16;i++){var bx=8+((i*20+tG*26)%300);if(bx<300)g.fillRect(bx,569,7,8)}
      g.fillStyle='#2f3742';ell(g,16,573,7,7);g.fill();ell(g,300,573,7,7);g.fill();
      g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=2;g.setLineDash([6,4]);rr(g,12,508,104,74,12);g.stroke();g.setLineDash([]);
      g.fillStyle='#fff';g.font='12px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(a.lang==='ko'?'지금 탈 차례':'Up next',64,503)}
    else{g.fillStyle='rgba(0,0,0,.15)';rr(g,16,572,328,12,6);g.fill();g.fillStyle='#c98f4d';rr(g,14,566,332,10,5);g.fill();g.strokeStyle='#7a4c1f';g.lineWidth=1.2;g.stroke();
      g.fillStyle='#96622c';g.fillRect(34,576,8,12);g.fillRect(318,576,8,12)}
    /* 동물 */
    var order=[];for(i=0;i<an.length;i++)order.push(i);order.sort(function(x,y){return (drag&&drag.i===x?1:0)-(drag&&drag.i===y?1:0)||AN[L.types[y]].r-AN[L.types[x]].r});
    var vio={};viol.forEach(function(v){vio[v.a]=v.r;vio[v.b]=v.r});
    order.forEach(function(i){o=an[i];var ty=L.types[i],mood='calm',sc=1,al=1,st;
      if(mode==='win'||hold>.05)mood='cheer';
      else if(mode==='tip'&&falls[i])mood='wow';
      else if(drag&&drag.i===i&&drag.moved)mood='wow';
      else if(asg[i]>=0){st=L.seats[asg[i]];var t=th[st.b]*(st.pos>0?1:-1);
        if(vio[i]){mood=ty==='M'?'scared':'angry'}else if(t>.035)mood='smug';else if(t<-.035)mood='nervous'}
      else if(L.live){p=queuePos(i);if(!p.front){sc=.78;al=.6}}
      if(mode==='play'&&(sel===i||(drag&&drag.i===i))){g.strokeStyle='#ffb300';g.lineWidth=3;g.setLineDash([6,5]);g.lineDashOffset=-tG*20;
        ell(g,o.x,o.y-AN[ty].r*.9,AN[ty].r+7,AN[ty].r+7);g.stroke();g.setLineDash([])}
      drawAnimal(g,ty,o.x,o.y,o.rot,sc,mood,o.ph,{alpha:al});
      if(vio[i]&&mode==='play'&&asg[i]>=0){g.fillStyle='#ff3b3b';ell(g,o.x+AN[ty].r*.8,o.y-AN[ty].r*1.9,7,7);g.fill();g.fillStyle='#fff';g.font='800 12px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('!',o.x+AN[ty].r*.8,o.y-AN[ty].r*1.9+4.5)}
      if(ty==='S'&&asg[i]>=0&&mood!=='cheer'){g.fillStyle='rgba(255,255,255,.9)';g.font='11px Jua, system-ui, sans-serif';g.textAlign='left';var zz=(tG*.8+o.ph)%1;g.globalAlpha=1-zz;g.fillText('z',o.x+12+zz*6,o.y-34-zz*14);g.globalAlpha=1}});
    if(kbOn&&tgt===-1&&mode==='play'){g.strokeStyle='#ffb300';g.lineWidth=3;rr(g,12,520,336,66,12);g.stroke()}
    /* 상단: 시간, 레벨, 규칙 */
    var fr=Math.max(0,time/70);g.fillStyle='rgba(20,40,70,.3)';rr(g,10,32,340,6,3);g.fill();
    g.fillStyle=time<10?'#ff5d5d':time<25?'#ffc94d':'#7be08a';rr(g,10,32,Math.max(6,340*fr),6,3);g.fill();
    g.font='16px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='rgba(0,0,0,.25)';g.fillText('Lv '+(lv+1),11,60);g.fillStyle='#fff';g.fillText('Lv '+(lv+1),10,59);
    g.textAlign='right';g.fillStyle=time<10?'#ffe0e0':'#fff';g.fillText(Math.ceil(time)+(a.lang==='ko'?'초':'s'),350,59);
    for(i=0;i<L.rules.length;i++){var bad=false;viol.forEach(function(v){if(v.r===L.rules[i])bad=true});chip(g,58+i*53,L.rules[i],bad)}
    if(L.live){}
    bars(g);
    /* 힌트 */
    var tip=L.tip?T_(L.tip):L.gen?(L.gen.mode==='live'?(a.lang==='ko'?'순서 조심! 빨간 선을 넘지 마요':'Mind the order! Stay inside the red line'):L.gen.mode==='mobile'?(a.lang==='ko'?'두 막대 모두 수평으로':'Level both beams'):(a.lang==='ko'?'모두 앉히고 수평으로':'Seat everyone, keep it level')):'';
    if(tip){g.font='15px Jua, system-ui, sans-serif';g.textAlign='center';var tw=g.measureText(tip).width+26;g.fillStyle='rgba(20,50,30,.45)';rr(g,180-tw/2,456,tw,26,13);g.fill();g.fillStyle='#fff';g.fillText(tip,180,474)}
    /* 아래 버튼 */
    g.fillStyle=hist.length?'rgba(255,255,255,.9)':'rgba(255,255,255,.4)';rr(g,8,598,44,34,10);g.fill();
    g.fillStyle='rgba(255,255,255,.9)';rr(g,60,598,44,34,10);g.fill();
    g.strokeStyle='#2f6f4f';g.lineWidth=2.6;g.lineCap='round';g.beginPath();g.arc(31,617,8,3.6,1.3);g.stroke();g.beginPath();g.moveTo(20,609);g.lineTo(23,616);g.lineTo(30,612);g.stroke();
    g.beginPath();g.arc(82,615,8,.6,5.5);g.stroke();g.beginPath();g.moveTo(90,604);g.lineTo(90,611);g.lineTo(83,611);g.stroke();
    g.font='13px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='#fff';
    g.fillText((a.lang==='ko'?'자리 바꿈 ':'Moves ')+changes+'/'+L.types.length+(streak>1?(a.lang==='ko'?'  ·  연속 ':'  ·  Streak ')+streak:''),116,620);
    if(mode==='win'){g.font='30px Jua, system-ui, sans-serif';g.textAlign='center';var z=Math.min(1,modeT*4);g.save();g.translate(180,G.mob?376:226);g.scale(.6+z*.4,.6+z*.4);
      g.fillStyle='rgba(0,0,0,.3)';g.fillText(a.lang==='ko'?'수평 성공!':'Balanced!',2,3);g.fillStyle='#fff3a0';g.fillText(a.lang==='ko'?'수평 성공!':'Balanced!',0,0);g.restore()
      if(lvBlind){g.font='14px Jua, system-ui, sans-serif';g.fillStyle='#d6fff4';g.fillText((a.lang==='ko'?'엿보지 않고 성공 +':'No-peek bonus +')+lvBlind,180,(G.mob?376:226)+22)}}}

  SG.run({id:'seesaw-zoo',title:{ko:'시소 동물원',en:'Seesaw Zoo'},
    how:{ko:'동물을 끌어다 자리에 앉혀 시소를 수평으로! 무게 × 거리가 양쪽이 같아야 해요. 키보드: ←→ 동물, ↑↓ 자리, Space 앉히기, Z 되돌리기',
         en:'Drag every animal onto a seat and level the seesaw! Weight × distance must match on both sides. Keys: ←→ animal, ↑↓ seat, Space to seat, Z to undo'},
    init:init,update:update,draw:draw});
})();
