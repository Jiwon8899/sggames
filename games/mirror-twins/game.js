/* 거울 쌍둥이 (Mirror Twins) — 입력 하나로 두 고양이가 동시에 움직인다. 해냥이는 그대로, 달냥이는 거울처럼 반대로.
   벽에 한쪽만 부딪히게 해서 어긋남을 만들고, 둘을 동시에 자기 발판에 올린다.
   규칙(step/solve/gen)은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var DIRS={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]},DN=['right','down','left','up'];
  var OW={'<':[-1,0],'>':[1,0],'^':[0,-1],'v':[0,1]};
  /* 타일: . 바닥  # 벽  O 구멍  ~ 얼음  <>^v 일방통행  B 버튼  G 문  c 부서지는 타일  X 자리바꿈
           1 해냥이 시작  2 달냥이 시작  a 해 발판  b 달 발판
     m: 'h' 좌우 반전(좌우 배치)  'v' 상하 반전(위아래 배치)  'r' 시계 방향 90도 회전(좌우 배치) */
  var LEVELS=[
    {m:'h',p:2,g:['....|....','1.a.|.b.2','....|....','....|....'],
      tip:{ko:'밀면 둘 다 움직여요. 달냥이는 거울처럼 반대로!',en:'One swipe moves both. Moon mirrors you!'}},
    {m:'h',p:3,g:['....|....','1..a|#b.2','....|....','....|....'],
      tip:{ko:'벽에 막힌 쪽만 멈춰요',en:'Only the blocked twin stops'}},
    {m:'h',p:4,g:['1...|.#.2','....|....','..a.|..b.','....|....'],
      tip:{ko:'벽으로 박자를 어긋나게!',en:'Use a wall to fall out of step'}},
    {m:'h',p:6,g:['O...|....','#...|....','.#..|.2.b','..O1|...#','a...|....'],
      tip:{ko:'구멍에 빠지면 처음부터예요',en:'Fall in a hole and the level resets'}},
    {m:'h',p:6,g:['....|.~..','.a1.|.b..','....|..~.','....|.2.~','~...|~...'],
      tip:{ko:'얼음 위에서는 쭉 미끄러져요',en:'On ice you slide until something stops you'}},
    {m:'v',p:6,g:['.....','..1..','...#.','.a...','-----','2....','b....','.....','.....'],
      tip:{ko:'이번엔 위아래가 반대!',en:'Now up and down are flipped!'}},
    {m:'h',p:7,g:['.a..|....','..1.|b...','....|....','....|.<.2','.<.v|....'],
      tip:{ko:'화살표 타일은 그 방향으로만 들어가요',en:'Arrow tiles can only be entered their way'}},
    {m:'h',p:8,g:['....|...2','....|..#.','...#|....','.#1.|...B','#aG.|b...'],
      tip:{ko:'버튼을 밟고 있어야 문이 열려요',en:'The gate opens only while the button is held'}},
    {m:'v',p:8,g:['....~','#.a.O','..1..','.~..~','-----','.~...','O...2','.~.O.','.b.~~'],
      tip:{ko:'얼음과 구멍, 그리고 위아래 거울',en:'Ice, holes and the up-down mirror'}},
    {m:'h',p:8,g:['...a|.b#.','#...|..c.','.1..|.2c.','....|.#..','....|.#c.'],
      tip:{ko:'금 간 타일은 한 번 밟으면 무너져요',en:'Cracked tiles crumble after one step'}},
    {m:'r',p:6,g:['.a1.|....','....|....','....|2...','....|.#b.','....|....'],
      tip:{ko:'달냥이는 시계 방향으로 90도 돌아서!',en:'Moon turns your move 90° clockwise!'}},
    {m:'h',p:8,g:['1...|X...','..#.|....','....|....','#b..|2...','....|a...'],
      tip:{ko:'소용돌이를 밟으면 둘의 자리가 바뀌어요',en:'Step on the swirl to swap the twins'}},
    {m:'r',p:9,g:['...#|.B.b','..a.|....','#...|....','1G..|.2..','....|...#'],
      tip:{ko:'돌려서 생각하고, 버튼도 지켜요',en:'Think rotated, and hold that button'}},
    {m:'v',p:12,g:['O...c','.b#..','~c~..','1....','-----','#..~.','.2.~.','.#O.O','.cX~a'],
      tip:{ko:'전부 다 써 봐요!',en:'Use everything you know!'}}
  ];
  /*LEVELS_END*/

  function make(mode,w,h,t,tip){
    var lay=mode==='v'?'stack':'side',L={mode:mode,lay:lay,w:w,h:h,cw:lay==='side'?2*w:w,ch:lay==='side'?h:2*h,t:t,ci:{},nc:0,st:[0,0],tip:tip||null,par:0};
    for(var i=0;i<t.length;i++){var c=t[i];if(c==='1'){L.st[0]=i;t[i]='.'}else if(c==='2'){L.st[1]=i;t[i]='.'}else if(c==='c')L.ci[i]=L.nc++}
    return L}
  function parse(def){
    var t=[],w,h,rows=def.g,i,j;
    if(def.m==='v'){rows=rows.filter(function(r){return r[0]!=='-'});w=rows[0].length;h=rows.length/2;
      for(i=0;i<rows.length;i++)for(j=0;j<w;j++)t.push(rows[i][j])}
    else{h=rows.length;w=rows[0].indexOf('|');
      for(i=0;i<h;i++){var s=rows[i].replace('|','');for(j=0;j<2*w;j++)t.push(s[j])}}
    return make(def.m,w,h,t,def.tip)}
  function half(L,i){return L.lay==='side'?((i%L.cw)<L.w?0:1):(i<L.w*L.h?0:1)}
  function tileAt(L,i,m){var c=L.t[i];return c==='c'&&(m>>L.ci[i]&1)?'O':c}
  function moonDir(mode,d){return mode==='h'?[-d[0],d[1]]:mode==='v'?[d[0],-d[1]]:[-d[1],d[0]]}
  function start(L){return {p:[L.st[0],L.st[1]],m:0}}
  function walk(L,s,who,d,open){
    var from=s.p[who],x=from%L.cw,y=(from/L.cw)|0,path=[],fell=false,hf=half(L,from);
    for(;;){var nx=x+d[0],ny=y+d[1];if(nx<0||ny<0||nx>=L.cw||ny>=L.ch)break;
      var ni=ny*L.cw+nx;if(half(L,ni)!==hf)break;
      var c=tileAt(L,ni,s.m);if(c==='#'||(c==='G'&&!open))break;
      var ow=OW[c];if(ow&&(ow[0]!==d[0]||ow[1]!==d[1]))break;
      x=nx;y=ny;path.push(ni);if(c==='O'){fell=true;break}if(c!=='~')break}
    return {from:from,path:path,fell:fell,end:y*L.cw+x,d:d}}
  /* 한 번의 입력. 문은 "움직이기 직전"에 버튼을 밟고 있었는지로 판정한다. */
  function step(L,s,dir){
    var d=DIRS[dir],open=L.t[s.p[0]]==='B'||L.t[s.p[1]]==='B',a=walk(L,s,0,d,open),b=walk(L,s,1,moonDir(L.mode,d),open);
    if(!a.fell&&!b.fell&&a.end===b.end){a.path=[];a.end=a.from;b.path=[];b.end=b.from;a.clash=b.clash=true}
    var m=s.m;if(a.path.length&&L.t[a.from]==='c')m|=1<<L.ci[a.from];if(b.path.length&&L.t[b.from]==='c')m|=1<<L.ci[b.from];
    var dead=a.fell||b.fell,p=[a.end,b.end],
        swap=!dead&&((a.path.length>0&&L.t[a.end]==='X')||(b.path.length>0&&L.t[b.end]==='X'));
    if(swap)p=[b.end,a.end];
    return {s:{p:p,m:m},w:[a,b],dead:dead,swap:swap,moved:a.path.length>0||b.path.length>0,
      win:!dead&&L.t[p[0]]==='a'&&L.t[p[1]]==='b'}}
  function key(s){return s.p[0]+s.p[1]*64+s.m*4096}
  function solved(L,s){return L.t[s.p[0]]==='a'&&L.t[s.p[1]]==='b'}
  /* 두 고양이의 위치를 합친 상태 공간에서 BFS. 최소 수(par), 최단 해의 개수, 해 하나를 돌려준다. */
  function solve(L){
    var s0=start(L),q=[s0],dist={},cnt={},prev={},k0=key(s0),head=0,goal=-1,gk=null;dist[k0]=0;cnt[k0]=1;
    if(solved(L,s0))return {par:0,count:1,path:[],states:1};
    while(head<q.length){var s=q[head++],ks=key(s),ds=dist[ks];if(goal>=0&&ds>=goal)break;
      for(var i=0;i<4;i++){var r=step(L,s,DN[i]);if(r.dead||!r.moved)continue;var kn=key(r.s);
        if(dist[kn]===undefined){dist[kn]=ds+1;cnt[kn]=cnt[ks];prev[kn]=[ks,DN[i]];q.push(r.s);if(r.win&&goal<0){goal=ds+1;gk=kn}}
        else if(dist[kn]===ds+1)cnt[kn]+=cnt[ks]}}
    if(goal<0)return {par:-1,count:0,path:null,states:q.length};
    var path=[],k=gk;while(k!==k0){path.unshift(prev[k][1]);k=prev[k][0]}
    /* 최단 해 개수: 같은 거리의 모든 승리 상태 합 */
    var total=0;for(var j=0;j<q.length;j++){var kk=key(q[j]);if(dist[kk]===goal&&solved(L,q[j]))total+=cnt[kk]}
    return {par:goal,count:total,path:path,states:q.length}}
  /* 해가 실제로 쓰는 장치 */
  function used(L,path){var s=start(L),u={};
    for(var i=0;i<path.length;i++){var r=step(L,s,path[i]);
      for(var k=0;k<2;k++){var w=r.w[k];if(w.path.length>1)u.ice=1;
        for(var j=0;j<w.path.length;j++){var c=L.t[w.path[j]];if(c==='G')u.gate=1;if(OW[c])u.ow=1}
        if(!w.path.length&&!w.clash)u.bump=1}
      if(r.swap)u.swap=1;if(r.s.m!==s.m)u.cr=1;s=r.s}
    return u}

  function rng(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=Math.imul(s^s>>>15,1|s);
    t=(t+Math.imul(t^t>>>7,61|t))^t;return ((t^t>>>14)>>>0)/4294967296}}
  var FEATS=['hole','ice','ow','gate','cr','swap'];
  function build(r,o){
    var lay=o.mode==='v'?'stack':'side',w=o.w,h=o.h,cw=lay==='side'?2*w:w,ch=lay==='side'?h:2*h,n=cw*ch,t=[],i,f=o.feat;
    for(i=0;i<n;i++)t.push(r()<o.wall?'#':'.');
    var probe={lay:lay,w:w,h:h,cw:cw};
    function free(hf){var c=[];for(var j=0;j<n;j++)if(t[j]==='.'&&(hf<0||half(probe,j)===hf))c.push(j);return c}
    function put(ch_,hf){var c=free(hf);if(!c.length)return -1;var j=c[(r()*c.length)|0];t[j]=ch_;return j}
    function many(ch_,lo,hi){var k=lo+((r()*(hi-lo+1))|0);while(k-->0)put(typeof ch_==='string'?ch_:ch_(),-1)}
    var sw=f.swap&&r()<.6?1:0;
    put('1',0);put('2',1);put('a',sw);put('b',1-sw);
    if(f.gate){var gh=(r()*2)|0;put('B',gh);put('G',1-gh)}
    if(f.swap)many('X',1,2);
    if(f.ice)many('~',3,7);
    if(f.hole)many('O',1,3);
    if(f.ow)many(function(){return '<>^v'[(r()*4)|0]},1,3);
    if(f.cr)many('c',1,3);
    return make(o.mode,w,h,t,null)}
  /* 끝없는 레벨: 무작위 판을 만들고 BFS로 풀리는 것만, 목표 길이에 가깝고 최단 해가 적은 것을 고른다. n으로 시드를 정해 항상 같은 판이 나온다. */
  function gen(n){
    var r=rng(n*2654435761+12345),k=Math.max(0,n-LEVELS.length),T=6+Math.min(5,(k/4)|0),best=null,bs=-1e9;
    for(var tries=0;tries<160;tries++){
      var mode='hvr'[(r()*3)|0],f={},nf=1+((r()*3)|0),i;
      for(i=0;i<nf;i++)f[FEATS[(r()*FEATS.length)|0]]=1;
      var w=mode==='v'?4+((r()*2)|0):4+((r()*2)|0),h=mode==='v'?4+((r()*2)|0):5+((r()*2)|0);
      var L=build(r,{mode:mode,w:w,h:h,feat:f,wall:.12+r()*.12}),sv=solve(L);
      if(sv.par<2)continue;
      var u=used(L,sv.path),fu=0,fw=0;
      ['ice','ow','gate','cr','swap'].forEach(function(x){if(f[x]){fw++;if(u[x])fu++}});
      var sc=-Math.abs(sv.par-T)*3-Math.min(sv.count-1,8)*1.5+fu*4-(fw-fu)*2+(u.bump?2:0);
      if(sc>bs){bs=sc;best=L;L.par=sv.par;L.count=sv.count;L.sol=sv.path}
      if(tries>=40&&bs>=4&&best.par>=T-1)break}
    if(!best){best=parse(LEVELS[2]);var s2=solve(best);best.par=s2.par;best.count=s2.count;best.sol=s2.path}
    return best}
  function getLevel(n){
    if(n<LEVELS.length){var L=parse(LEVELS[n]),sv=solve(L);L.par=sv.par;L.count=sv.count;L.sol=sv.path;return L}
    return gen(n)}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={LEVELS:LEVELS,parse:parse,make:make,build:build,rng:rng,step:step,solve:solve,used:used,gen:gen,getLevel:getLevel,start:start,solved:solved,half:half,FEATS:FEATS};
  if(typeof SG==='undefined')return;

  /* ====================== 게임 ====================== */
  var W=360,H=640,GAP=18,BX=8,BY=84,BW=344,BH=462,MIDX=180,MIDY=BY+BH/2;
  var lvN,L,S,hist,moves,time,streak,ph,buf,tG=0,ts,ox,oy,blink=[0,0],blinkAt=[2,3.1],press,pads=[0,0],lvT,toast;
  var kb={sp:false,r:false};
  if(!window.__mirrorTwinsKeys){window.__mirrorTwinsKeys=true;
    window.addEventListener('keydown',function(e){if(e.repeat)return;
      if(e.code==='Space'||e.code==='KeyZ'||e.code==='Backspace')kb.sp=true;else if(e.code==='KeyR')kb.r=true})}
  var SUN={b:'#ffb637',d:'#e07f1f',l:'#ffe08a',e:'#5a3210'},MOON={b:'#cdd5ff',d:'#8a94dc',l:'#ffffff',e:'#2b2f6b'};
  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function ease(u){return u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2}

  function layout(){
    if(L.lay==='side')ts=Math.min(Math.floor((BW-GAP)/L.cw),Math.floor(BH/L.ch),46);
    else ts=Math.min(Math.floor(BW/L.cw),Math.floor((BH-GAP)/L.ch),46);
    var tw=L.cw*ts+(L.lay==='side'?GAP:0),th=L.ch*ts+(L.lay==='stack'?GAP:0);
    ox=MIDX-tw/2;oy=MIDY-th/2}
  function cxy(i){var x=i%L.cw,y=(i/L.cw)|0;
    return [ox+x*ts+ts/2+(L.lay==='side'&&x>=L.w?GAP:0),oy+y*ts+ts/2+(L.lay==='stack'&&y>=L.h?GAP:0)]}
  function load(n){lvN=n;L=getLevel(n);S=start(L);hist=[];moves=0;ph={k:'play'};buf=null;pads=[false,false];layout();lvT=0}

  function init(a){time=50;streak=0;kb.sp=kb.r=false;press=null;toast=null;load(0)}

  function doMove(dir,a){
    var r=step(L,S,dir),i;
    if(!r.moved){ph={k:'move',t:0,dur:.22,res:r,nomove:true};a.beep(150,.09,'sine');
      for(i=0;i<2;i++){var c=cxy(S.p[i]);a.burst(c[0]+r.w[i].d[0]*ts*.4,c[1]+r.w[i].d[1]*ts*.4,i?'#cdd5ff':'#ffd27a',3)}
      return}
    hist.push(S);moves++;
    var dur=.12;
    for(i=0;i<2;i++){var w=r.w[i],n=w.path.length;w.dur=n>1?.07*n+.05:.15;if(n)dur=Math.max(dur,w.dur);
      if(n&&L.t[w.from]==='c'){var p=cxy(w.from);a.burst(p[0],p[1],half(L,w.from)?'#8a94dc':'#d9a066',7)}}
    var slid=r.w[0].path.length>1||r.w[1].path.length>1,blocked=!r.w[0].path.length||!r.w[1].path.length;
    if(slid)a.beep(990,.14,'sine');else a.beep(470,.05,'triangle');
    if(blocked)a.beep(150,.09,'sine');
    S=r.s;ph={k:'move',t:0,dur:dur,res:r}}
  function undo(a){if(ph.k!=='play'||!hist.length){a.beep(200,.05,'sine');return}
    S=hist.pop();moves--;a.beep(330,.06,'triangle');for(var i=0;i<2;i++){var c=cxy(S.p[i]);a.burst(c[0],c[1],'#ffffff',4)}}
  function restart(a){if(ph.k!=='play')return;if(!hist.length){a.beep(200,.05,'sine');return}
    S=start(L);hist=[];moves=0;a.beep(260,.08,'triangle');for(var i=0;i<2;i++){var c=cxy(S.p[i]);a.burst(c[0],c[1],'#ffffff',6)}}
  function inBtn(x,y,b){return x>=b[0]&&x<=b[0]+b[2]&&y>=b[1]-4&&y<=b[1]+b[3]+4}
  var B_UNDO=[12,588,94,40],B_RST=[114,588,94,40];

  function update(dt,inp,a){
    if(!(dt>0))dt=0;tG+=dt;lvT+=dt;
    for(var i=0;i<2;i++){blinkAt[i]-=dt;if(blinkAt[i]<0){blink[i]=.14;blinkAt[i]=1.6+Math.random()*2.8}if(blink[i]>0)blink[i]-=dt}
    if(toast){toast.t+=dt;if(toast.t>1.3)toast=null}
    if(inp.tap&&inp.x!=null&&!kb.sp)press={x:inp.x,y:inp.y};
    if(!inp.down)press=press&&inp.swipe?press:null;
    if(kb.sp){kb.sp=false;undo(a)}
    else if(kb.r){kb.r=false;restart(a)}
    else if(inp.tap&&inp.x!=null){if(inBtn(inp.x,inp.y,B_UNDO))undo(a);else if(inBtn(inp.x,inp.y,B_RST))restart(a)}
    kb.sp=kb.r=false;
    if(inp.swipe){if(ph.k==='play')doMove(inp.swipe,a);else if(ph.k==='move'||ph.k==='swap')buf=inp.swipe}
    if(ph.k==='play'||ph.k==='move'||ph.k==='swap'){time-=dt;a.tempo(time<10?1.35:1)}
    if(ph.k!=='play'){ph.t+=dt;var r=ph.res,c,j;
      if(ph.k==='move'&&ph.t>=ph.dur){
        if(ph.nomove)ph={k:'play'};
        else if(r.dead){ph={k:'fall',t:0,res:r};a.sfx('hit');a.shake(7);buf=null;
          for(j=0;j<2;j++)if(r.w[j].fell){c=cxy(r.w[j].end);a.pop(c[0],c[1]-ts*.5,a.lang==='ko'?'앗!':'Oops!','#ff7a7a');a.burst(c[0],c[1],'#ffffff',8)}}
        else if(r.swap){ph={k:'swap',t:0,res:r};a.beep(660,.08,'triangle');a.beep(990,.16,'sine');
          for(j=0;j<2;j++){c=cxy(S.p[j]);a.burst(c[0],c[1],'#c58bff',8)}}
        else afterMove(r,a)}
      else if(ph.k==='swap'&&ph.t>=.36)afterMove(r,a);
      else if(ph.k==='fall'&&ph.t>=.62){S=start(L);hist=[];moves=0;ph={k:'play'}}
      else if(ph.k==='win'&&ph.t>=1.15)load(lvN+1)}
    if(ph.k==='play'&&buf){var b=buf;buf=null;doMove(b,a)}
    if(time<=0&&ph.k!=='win'){time=0;a.over()}}
  function afterMove(r,a){
    var j,c;
    if(r.win){var par=moves<=L.par,bonus=10+(par?10:0);streak=par?streak+1:0;if(par)bonus+=Math.min(streak-1,5)*2;
      a.add(bonus);a.sfx('win');time=Math.min(70,time+12);buf=null;
      for(j=0;j<2;j++){c=cxy(S.p[j]);a.burst(c[0],c[1],j?'#cfe0ff':'#ffe27a',16);a.burst(c[0],c[1],'#ffffff',8)}
      c=cxy(S.p[0]);var c2=cxy(S.p[1]);
      a.pop((c[0]+c2[0])/2,Math.min(c[1],c2[1])-ts*.9,'+'+bonus,'#fff3a0');
      toast={t:0,s:par?(streak>1?(a.lang==='ko'?'최소 수! ×'+streak:'Par! ×'+streak):(a.lang==='ko'?'최소 수 달성!':'Solved at par!')):(a.lang==='ko'?'클리어!':'Clear!')};
      ph={k:'win',t:0,res:r};return}
    for(j=0;j<2;j++){var onPad=L.t[S.p[j]]===(j?'b':'a');if(onPad&&!pads[j]){c=cxy(S.p[j]);a.beep(j?659:784,.1,'triangle');a.burst(c[0],c[1],j?'#cfe0ff':'#ffe27a',6)}pads[j]=onPad}
    ph={k:'play'}}

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function tx(g,s,x,y,sz,col,al){g.font=sz+'px Jua, system-ui, sans-serif';g.textAlign=al||'center';g.textBaseline='middle';
    g.fillStyle='rgba(0,0,0,.3)';g.fillText(s,x+1,y+1.5);g.fillStyle=col;g.fillText(s,x,y)}
  function arrow(g,x,y,d,len,col,lw){g.save();g.translate(x,y);g.rotate(Math.atan2(d[1],d[0]));g.strokeStyle=col;g.lineWidth=lw||3;g.lineCap='round';g.lineJoin='round';
    g.beginPath();g.moveTo(-len/2,0);g.lineTo(len/2,0);g.moveTo(len/2-len*.32,-len*.3);g.lineTo(len/2,0);g.lineTo(len/2-len*.32,len*.3);g.stroke();g.restore()}
  function cloud(g,x,y,s,col){g.fillStyle=col;g.beginPath();g.arc(x,y,14*s,0,7);g.arc(x+16*s,y-7*s,17*s,0,7);g.arc(x+35*s,y,13*s,0,7);g.arc(x+17*s,y+5*s,15*s,0,7);g.fill()}
  function crescent(g,x,y,r,col,bg){g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.fillStyle=bg;g.beginPath();g.arc(x+r*.42,y-r*.18,r*.82,0,7);g.fill()}
  function sunIcon(g,x,y,r,col){g.fillStyle=col;g.beginPath();g.arc(x,y,r*.55,0,7);g.fill();g.strokeStyle=col;g.lineWidth=Math.max(1.2,r*.18);g.lineCap='round';g.beginPath();
    for(var i=0;i<8;i++){var an=i*Math.PI/4+tG*.5;g.moveTo(x+Math.cos(an)*r*.75,y+Math.sin(an)*r*.75);g.lineTo(x+Math.cos(an)*r,y+Math.sin(an)*r)}g.stroke()}

  function drawBg(g){
    var side=L.lay==='side',i,x,y,gr;
    /* 낮 */
    g.save();g.beginPath();if(side)g.rect(0,0,MIDX,H);else g.rect(0,0,W,MIDY);g.clip();
    gr=g.createLinearGradient(0,0,0,side?H:MIDY);gr.addColorStop(0,'#ffe9a6');gr.addColorStop(.55,'#ffc890');gr.addColorStop(1,'#ff9d8c');g.fillStyle=gr;g.fillRect(0,0,W,H);
    gr=g.createRadialGradient(34,58,4,34,58,150);gr.addColorStop(0,'rgba(255,255,230,.95)');gr.addColorStop(.25,'rgba(255,244,180,.5)');gr.addColorStop(1,'rgba(255,240,170,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);
    for(i=0;i<5;i++){x=((hash(i)*460+tG*(7+i*3))%460)-70;y=side?70+i*118+hash(i+9)*30:44+i*52;cloud(g,x,y,.8+hash(i+3)*.6,'rgba(255,255,255,.55)')}
    for(i=0;i<14;i++){x=hash(i+20)*W+Math.sin(tG*.6+i)*10;y=H-((hash(i+40)*H+tG*(10+hash(i)*14))%H);g.fillStyle='rgba(255,255,255,'+(.25+.25*Math.sin(tG*2+i))+')';g.beginPath();g.arc(x,y,1.5+hash(i+60)*2,0,7);g.fill()}
    g.restore();
    /* 밤 */
    g.save();g.beginPath();if(side)g.rect(MIDX,0,W-MIDX,H);else g.rect(0,MIDY,W,H-MIDY);g.clip();
    gr=g.createLinearGradient(0,side?0:MIDY,0,H);gr.addColorStop(0,'#141a4c');gr.addColorStop(.6,'#332a70');gr.addColorStop(1,'#5b3f8c');g.fillStyle=gr;g.fillRect(0,0,W,H);
    for(i=0;i<46;i++){x=(hash(i+100)*W+tG*(1.5+hash(i)*2))%W;y=hash(i+200)*H;var tw=.35+.65*Math.abs(Math.sin(tG*(.8+hash(i+300)*1.6)+i));
      g.fillStyle='rgba(255,255,255,'+tw*.9+')';var s=.7+hash(i+400)*1.5;g.beginPath();g.arc(x,y,s,0,7);g.fill();
      if(i%9===0){g.strokeStyle='rgba(255,255,255,'+tw*.6+')';g.lineWidth=1;g.beginPath();g.moveTo(x-4,y);g.lineTo(x+4,y);g.moveTo(x,y-4);g.lineTo(x,y+4);g.stroke()}}
    var mx=side?W-40:W-30,my=side?62:MIDY+46;gr=g.createRadialGradient(mx,my,4,mx,my,70);gr.addColorStop(0,'rgba(210,220,255,.4)');gr.addColorStop(1,'rgba(210,220,255,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);
    crescent(g,mx,my,17,'#f3f0ff',side?'#1a1e52':'#4c3883');
    for(i=0;i<4;i++){x=W-(((hash(i+50)*460+tG*(5+i*2))%460)-70);y=side?150+i*120:MIDY+60+i*62;cloud(g,x,y,.9+hash(i+7)*.5,'rgba(120,110,200,.22)')}
    g.restore()}

  function drawRibbon(g){
    var side=L.lay==='side',len=side?H:W,i,p,col=L.mode==='r'?'#d7a6ff':L.mode==='v'?'#ffb3d9':'#aef3ff';
    function pt(u,off){var wv=Math.sin(u*.045+tG*2.2+off)*3.2+Math.sin(u*.11-tG*1.3)*1.2;return side?[MIDX+wv,u]:[u,MIDY+wv]}
    g.save();g.lineCap='round';g.globalCompositeOperation='lighter';
    [[16,.10],[9,.20],[4,.5]].forEach(function(z){g.strokeStyle=col;g.globalAlpha=z[1];g.lineWidth=z[0];g.beginPath();
      for(i=0;i<=len;i+=8){p=pt(i,0);if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])}g.stroke()});
    g.globalCompositeOperation='source-over';g.globalAlpha=.95;g.strokeStyle='#ffffff';g.lineWidth=1.6;g.beginPath();
    for(i=0;i<=len;i+=8){p=pt(i,0);if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])}g.stroke();
    for(i=0;i<7;i++){var u=(hash(i+70)*len+tG*(26+i*5))%len;p=pt(u,0);var s=1.5+1.5*Math.abs(Math.sin(tG*3+i));g.globalAlpha=.9;g.fillStyle='#fff';
      g.beginPath();g.moveTo(p[0],p[1]-s*2.2);g.lineTo(p[0]+s*.7,p[1]);g.lineTo(p[0],p[1]+s*2.2);g.lineTo(p[0]-s*.7,p[1]);g.closePath();g.fill()}
    g.restore()}

  function gateOpen(){return L.t[S.p[0]]==='B'||L.t[S.p[1]]==='B'}
  function drawTile(g,i){
    var c=tileAt(L,i,S.m),night=half(L,i)===1,p=cxy(i),x=p[0]-ts/2,y=p[1]-ts/2,s=ts,q=s-2,r=Math.max(4,s*.2),cx=p[0],cy=p[1],k;
    var top=night?'#5d64b4':'#fff3d0',edge=night?'#3a3f86':'#e2b574',alt=((i%L.cw)+((i/L.cw)|0))%2;
    if(alt)top=night?'#666dbd':'#ffeec0';
    if(c==='O'){g.fillStyle=night?'#0c0f33':'#7a4a2c';rr(g,x+1,y+1,q,q,r);g.fill();
      var gr=g.createRadialGradient(cx,cy+s*.1,1,cx,cy,s*.5);gr.addColorStop(0,'rgba(0,0,0,.85)');gr.addColorStop(1,'rgba(0,0,0,.15)');g.fillStyle=gr;rr(g,x+3,y+4,q-4,q-5,r);g.fill();
      if(night){g.strokeStyle='rgba(150,120,255,.55)';g.lineWidth=1.5;rr(g,x+2,y+2,q-2,q-2,r);g.stroke()}
      if(L.t[i]==='c'){g.fillStyle=edge;g.fillRect(x+3,y+s-6,5,3);g.fillRect(x+s-10,y+3,4,3)}return}
    if(c==='#'){g.fillStyle='rgba(0,0,0,.25)';rr(g,x+1,y+3,q,q,r);g.fill();
      g.fillStyle=night?'#080a2c':'#b8693a';rr(g,x+1,y+1,q,q,r);g.fill();
      g.fillStyle=night?'#1a1f66':'#e09052';rr(g,x+1,y-3,q,q-2,r);g.fill();
      if(night){g.strokeStyle='rgba(175,190,255,.75)';g.lineWidth=1.5;rr(g,x+1.75,y-2.25,q-1.5,q-3.5,r);g.stroke()}
      g.fillStyle=night?'rgba(160,170,255,.2)':'rgba(255,230,180,.5)';rr(g,x+4,y-1,q-6,s*.22,r*.6);g.fill();
      if(night){g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(x+s*.7,y+s*.55,1.2,0,7);g.arc(x+s*.3,y+s*.68,.9,0,7);g.fill()}
      else{g.fillStyle='rgba(120,60,20,.25)';g.fillRect(x+s*.2,y+s*.5,s*.6,2);g.fillRect(x+s*.45,y+s*.28,2,s*.22)}return}
    g.fillStyle=edge;rr(g,x+1,y+3,q,q-2,r);g.fill();
    if(c==='~')top=night?'#9fd8ff':'#c9f1ff';
    g.fillStyle=top;rr(g,x+1,y+1,q,q-3,r);g.fill();
    if(c==='~'){g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=2;g.lineCap='round';g.beginPath();g.moveTo(x+s*.22,y+s*.55);g.lineTo(x+s*.48,y+s*.22);g.moveTo(x+s*.5,y+s*.66);g.lineTo(x+s*.72,y+s*.38);g.stroke();
      g.fillStyle='rgba(255,255,255,'+(.5+.4*Math.sin(tG*3+i))+')';g.beginPath();g.arc(x+s*.75,y+s*.24,1.6,0,7);g.fill()}
    else if(OW[c]){g.fillStyle=night?'rgba(255,170,90,.28)':'rgba(240,110,40,.2)';rr(g,x+4,y+4,q-6,q-9,r*.7);g.fill();
      var d=OW[c],o=Math.sin(tG*5)*s*.05;arrow(g,cx+d[0]*o,cy-1+d[1]*o,d,s*.46,night?'#ffc37a':'#e8691f',Math.max(2.5,s*.1))}
    else if(c==='B'){var dn=S.p[0]===i||S.p[1]===i;g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(cx,cy+1,s*.33,s*.26,0,0,7);g.fill();
      g.fillStyle='#c2386f';g.beginPath();g.ellipse(cx,cy,s*.3,s*.23,0,0,7);g.fill();
      g.fillStyle='#ff6fa3';g.beginPath();g.ellipse(cx,cy-(dn?1:4),s*.3,s*.23,0,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(cx-s*.08,cy-(dn?3:6),s*.1,s*.05,-.4,0,7);g.fill()}
    else if(c==='G'){var op=gateOpen();g.strokeStyle=op?'rgba(255,111,163,.35)':'#ff6fa3';g.lineWidth=Math.max(3,s*.11);g.lineCap='round';
      for(k=0;k<3;k++){var bx=x+s*(.25+.25*k);g.beginPath();g.moveTo(bx,y+s*(op?.62:.16));g.lineTo(bx,y+s*.74);g.stroke()}
      if(!op){g.strokeStyle='#c2386f';g.beginPath();g.moveTo(x+s*.18,y+s*.3);g.lineTo(x+s*.82,y+s*.3);g.stroke()}}
    else if(c==='c'){g.strokeStyle=night?'rgba(20,20,70,.75)':'rgba(140,80,30,.75)';g.lineWidth=1.6;g.lineCap='round';g.lineJoin='round';g.beginPath();
      g.moveTo(x+s*.2,y+s*.25);g.lineTo(x+s*.42,y+s*.4);g.lineTo(x+s*.36,y+s*.58);g.lineTo(x+s*.6,y+s*.72);
      g.moveTo(x+s*.42,y+s*.4);g.lineTo(x+s*.66,y+s*.3);g.lineTo(x+s*.8,y+s*.42);g.stroke()}
    else if(c==='X'){g.save();g.translate(cx,cy-1);g.rotate(tG*1.6);g.strokeStyle='#a45bf0';g.lineWidth=Math.max(2.5,s*.09);g.lineCap='round';
      for(k=0;k<2;k++){g.rotate(Math.PI);g.beginPath();g.arc(0,0,s*.25,.3,2.3);g.stroke();
        g.fillStyle='#a45bf0';g.beginPath();g.arc(Math.cos(2.3)*s*.25,Math.sin(2.3)*s*.25,s*.07,0,7);g.fill()}g.restore();
      g.fillStyle='rgba(196,139,255,.25)';g.beginPath();g.arc(cx,cy-1,s*.36,0,7);g.fill()}
    else if(c==='a'||c==='b'){var mo=c==='b',on=S.p[mo?1:0]===i,pu=.5+.5*Math.sin(tG*3.2+(mo?1.5:0)),col=mo?'#b7c8ff':'#ffb21f';
      g.fillStyle=mo?'rgba(150,175,255,'+(.25+.2*pu)+')':'rgba(255,196,40,'+(.3+.2*pu)+')';g.beginPath();g.arc(cx,cy-1,s*(.4+.03*pu),0,7);g.fill();
      g.strokeStyle=on?'#ffffff':col;g.lineWidth=Math.max(2.5,s*.08);g.setLineDash([s*.16,s*.1]);g.lineDashOffset=-tG*8;g.beginPath();g.arc(cx,cy-1,s*.36,0,7);g.stroke();g.setLineDash([]);
      if(mo)crescent(g,cx,cy-1,s*.19,'#e9eeff',top);else sunIcon(g,cx,cy-1,s*.24,'#ff9a1a')}}

  function drawCat(g,x,y,k,o){
    var C=k?MOON:SUN,r=ts*.34,e;
    g.fillStyle='rgba(0,0,0,'+.24*(o.sc==null?1:o.sc)+')';g.beginPath();g.ellipse(x,y+ts*.3,r*.95*(1-o.hop*.3)*(o.sc==null?1:o.sc),r*.3*(o.sc==null?1:o.sc),0,0,7);g.fill();
    g.save();g.translate(x+o.shx,y+ts*.26-o.hop*ts*.34);g.rotate(o.rot||0);g.scale(o.sx*(o.sc==null?1:o.sc),o.sy*(o.sc==null?1:o.sc));g.translate(0,-r*.95);
    /* 꼬리 */
    g.strokeStyle=C.d;g.lineWidth=r*.26;g.lineCap='round';g.beginPath();var tw=Math.sin(tG*3+k*2)*r*.25;
    g.moveTo((k?-1:1)*r*.7,r*.55);g.quadraticCurveTo((k?-1:1)*r*1.35,r*.5,(k?-1:1)*r*1.25+tw,-r*.15);g.stroke();
    /* 귀 */
    for(e=-1;e<=1;e+=2){g.fillStyle=C.d;g.beginPath();g.moveTo(e*r*.92,-r*.3);g.lineTo(e*r*.78,-r*1.22);g.lineTo(e*r*.18,-r*.84);g.closePath();g.fill();
      g.fillStyle=k?'#ffc4e0':'#ff9d7a';g.beginPath();g.moveTo(e*r*.76,-r*.5);g.lineTo(e*r*.7,-r*1);g.lineTo(e*r*.36,-r*.8);g.closePath();g.fill()}
    /* 몸 */
    var gr=g.createRadialGradient(-r*.3,-r*.4,r*.1,0,0,r*1.1);gr.addColorStop(0,C.l);gr.addColorStop(.55,C.b);gr.addColorStop(1,C.d);
    g.fillStyle=gr;g.beginPath();g.ellipse(0,0,r,r*.93,0,0,7);g.fill();
    g.fillStyle=k?'rgba(255,255,255,.55)':'rgba(255,246,210,.7)';g.beginPath();g.ellipse(0,r*.42,r*.52,r*.36,0,0,7);g.fill();
    /* 이마 무늬 */
    if(k)crescent(g,0,-r*.62,r*.2,'#7f8ae0',C.b);else{g.fillStyle='#ff7a1a';g.beginPath();g.arc(0,-r*.62,r*.13,0,7);g.fill()}
    /* 눈 */
    var lx=o.lx*r*.1,ly=o.ly*r*.1,ey=-r*.08;
    for(e=-1;e<=1;e+=2){var ex=e*r*.38;
      if(o.happy){g.strokeStyle=C.e;g.lineWidth=r*.12;g.lineCap='round';g.beginPath();g.arc(ex,ey+r*.06,r*.16,Math.PI*1.1,Math.PI*1.9);g.stroke()}
      else if(o.blink){g.strokeStyle=C.e;g.lineWidth=r*.11;g.lineCap='round';g.beginPath();g.moveTo(ex-r*.15,ey);g.lineTo(ex+r*.15,ey);g.stroke()}
      else if(o.dizzy){g.strokeStyle=C.e;g.lineWidth=r*.1;g.lineCap='round';g.beginPath();g.moveTo(ex-r*.13,ey-r*.13);g.lineTo(ex+r*.13,ey+r*.13);g.moveTo(ex+r*.13,ey-r*.13);g.lineTo(ex-r*.13,ey+r*.13);g.stroke()}
      else{g.fillStyle='#fff';g.beginPath();g.ellipse(ex,ey,r*.21,r*.24,0,0,7);g.fill();
        g.fillStyle=C.e;g.beginPath();g.arc(ex+lx,ey+ly,r*.13,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(ex+lx-r*.04,ey+ly-r*.05,r*.045,0,7);g.fill()}}
    /* 볼, 코, 입 */
    g.fillStyle=k?'rgba(255,150,200,.5)':'rgba(255,110,90,.45)';g.beginPath();g.ellipse(-r*.62,r*.22,r*.15,r*.1,0,0,7);g.ellipse(r*.62,r*.22,r*.15,r*.1,0,0,7);g.fill();
    g.fillStyle='#ff7f9a';g.beginPath();g.moveTo(-r*.08,r*.16);g.lineTo(r*.08,r*.16);g.lineTo(0,r*.26);g.closePath();g.fill();
    g.strokeStyle=C.e;g.lineWidth=r*.07;g.lineCap='round';g.beginPath();
    if(o.happy){g.arc(0,r*.3,r*.14,0,Math.PI);}else{g.moveTo(0,r*.26);g.lineTo(0,r*.34);g.moveTo(-r*.12,r*.4);g.quadraticCurveTo(-r*.04,r*.44,0,r*.34);g.quadraticCurveTo(r*.04,r*.44,r*.12,r*.4)}
    g.stroke();g.restore()}

  /* 각 고양이의 화면 상태를 현재 단계(ph)에서 계산 */
  function catState(k){
    var o={hop:0,sx:1,sy:1,shx:0,rot:0,lx:0,ly:0,blink:blink[k]>0,happy:false,dizzy:false},p=cxy(S.p[k]),u,w,n,f,a,b,i;
    if(ph.k==='move'){w=ph.res.w[k];n=w.path.length;
      if(!n){p=cxy(w.from);u=Math.min(1,ph.t/.22);var am=(1-u)*ts*.13;o.shx=Math.sin(ph.t*46)*am;p=[p[0]+w.d[0]*am*Math.sin(u*Math.PI)*.9,p[1]+w.d[1]*am*Math.sin(u*Math.PI)*.9];o.blink=!w.clash&&u<.8;o.sx=1+.1*Math.sin(u*Math.PI);o.sy=1-.1*Math.sin(u*Math.PI)}
      else{u=Math.min(1,ph.t/w.dur);var cells=[w.from].concat(w.path);f=(n>1?u:ease(u))*n;i=Math.min(n-1,Math.floor(f));a=cxy(cells[i]);b=cxy(cells[i+1]);f-=i;p=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
        if(n===1){o.hop=Math.sin(u*Math.PI);o.sy=1+.18*Math.sin(u*Math.PI)-(u>.8?(u-.8)*1.2:0);o.sx=2-o.sy}
        else{o.sx=1.12;o.sy=.9;o.rot=(w.d[0]||0)*.12}}}
    else if(ph.k==='swap'){u=ease(Math.min(1,ph.t/.36));a=cxy(ph.res.w[k].end);b=p;p=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];o.hop=Math.sin(u*Math.PI)*1.5;o.rot=u*Math.PI*2*(k?-1:1);o.sc=1-.35*Math.sin(u*Math.PI)}
    else if(ph.k==='fall'){w=ph.res.w[k];p=cxy(w.end);if(w.fell){u=Math.min(1,ph.t/.5);o.sc=1-u;o.rot=u*5;o.dizzy=true}else{o.shx=Math.sin(ph.t*40)*2;o.dizzy=false;o.blink=false}}
    else if(ph.k==='win'){u=Math.min(1,ph.t/.8);o.rot=ease(u)*Math.PI*2*(k?-1:1);o.hop=Math.abs(Math.sin(u*Math.PI*2))*.9;o.happy=true;o.sx=1+.08*Math.sin(u*20);o.sy=2-o.sx}
    else{var br=Math.sin(tG*2.6+k*1.7)*.03;o.sx=1+br;o.sy=1-br}
    o.x=p[0];o.y=p[1];return o}

  function ghost(g,k,dir){
    var d=k?moonDir(L.mode,DIRS[dir]):DIRS[dir],w=walk(L,S,k,d,gateOpen()),a=cxy(S.p[k]),col=k?'#e6ebff':'#ff8a1a',pu=.55+.3*Math.sin(tG*6);
    g.save();g.globalAlpha=pu;
    if(!w.path.length){var bx=a[0]+d[0]*ts*.5,by=a[1]+d[1]*ts*.5;g.strokeStyle='#ff5a6a';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(bx-5,by-5);g.lineTo(bx+5,by+5);g.moveTo(bx+5,by-5);g.lineTo(bx-5,by+5);g.stroke()}
    else{var b=cxy(w.end);g.strokeStyle=col;g.lineWidth=3;g.setLineDash([5,5]);g.lineDashOffset=-tG*20;g.beginPath();g.moveTo(a[0]+d[0]*ts*.38,a[1]+d[1]*ts*.38);g.lineTo(b[0]-d[0]*ts*.1,b[1]-d[1]*ts*.1);g.stroke();g.setLineDash([]);
      arrow(g,b[0]+d[0]*ts*.02,b[1]+d[1]*ts*.02,d,ts*.34,col,3.5);
      g.globalAlpha=.22;g.fillStyle=col;g.beginPath();g.arc(b[0],b[1]-ts*.05,ts*.32,0,7);g.fill()}
    g.restore()}

  function badge(g,x,y,dir){
    var d=DIRS[dir],m=moonDir(L.mode,d);
    g.fillStyle='rgba(20,20,60,.5)';rr(g,x,y,94,40,13);g.fill();g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1.5;rr(g,x+.75,y+.75,92.5,38.5,13);g.stroke();
    sunIcon(g,x+15,y+20,8,'#ffc83a');arrow(g,x+35,y+20,d,15,'#ffd66a',3);
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1.5;g.beginPath();g.moveTo(x+47,y+8);g.lineTo(x+47,y+32);g.stroke();
    crescent(g,x+60,y+20,7,'#dfe6ff','#2a2a5c');arrow(g,x+79,y+20,m,15,'#cdd5ff',3)}
  function button(g,b,label,icon,dim){
    g.fillStyle='rgba(0,0,0,.25)';rr(g,b[0],b[1]+3,b[2],b[3],13);g.fill();
    g.fillStyle=dim?'rgba(255,255,255,.4)':'rgba(255,255,255,.92)';rr(g,b[0],b[1],b[2],b[3],13);g.fill();
    var cx=b[0]+20,cy=b[1]+b[3]/2;g.strokeStyle='#5a4a9a';g.lineWidth=2.6;g.lineCap='round';g.lineJoin='round';g.beginPath();
    if(icon==='u'){g.arc(cx+1,cy+1,7,Math.PI*1.1,Math.PI*.4);g.stroke();g.beginPath();g.moveTo(cx-10,cy-5);g.lineTo(cx-6,cy+1);g.lineTo(cx-1,cy-4)}
    else{g.arc(cx,cy,7,-Math.PI*.3,Math.PI*1.35);g.stroke();g.beginPath();g.moveTo(cx+1,cy-10);g.lineTo(cx+5,cy-6);g.lineTo(cx,cy-3)}
    g.stroke();
    g.font='15px Jua, system-ui, sans-serif';g.textAlign='left';g.textBaseline='middle';g.fillStyle='#4a3d8a';g.fillText(label,b[0]+35,cy+1)}

  function draw(g,a){
    if(!L)return;
    var ko=a.lang==='ko',i,k,side=L.lay==='side';
    drawBg(g);drawRibbon(g);
    /* 판 받침 */
    for(k=0;k<2;k++){var p0=cxy(k?(side?L.w:L.w*L.h):0),bw=L.w*ts,bh=L.h*ts;
      g.fillStyle=k?'rgba(8,10,50,.42)':'rgba(170,90,40,.28)';rr(g,p0[0]-ts/2-5,p0[1]-ts/2-4,bw+10,bh+12,12);g.fill()}
    for(i=0;i<L.t.length;i++)drawTile(g,i);
    /* 튜토리얼: 유령 화살표 */
    var cyc=DN[Math.floor(Math.abs(tG)/1.1)%4],gd=null;
    if(press&&a&&window.__sg&&__sg.inp.down&&__sg.inp.x!=null){var dx=__sg.inp.x-press.x,dy=__sg.inp.y-press.y;
      if(Math.max(Math.abs(dx),Math.abs(dy))>24)gd=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')}
    if(ph.k==='play'&&(gd||lvN<3||((lvN===5||lvN===10)&&moves<2))){ghost(g,0,gd||cyc);ghost(g,1,gd||cyc)}
    /* 고양이: 아래쪽에 있는 쪽을 나중에 */
    var cs=[catState(0),catState(1)];
    for(k=0;k<2;k++){var o=cs[k],t=cs[1-k],dd=Math.hypot(t.x-o.x,t.y-o.y)||1;o.lx=(t.x-o.x)/dd;o.ly=(t.y-o.y)/dd}
    var ord=cs[0].y<=cs[1].y?[0,1]:[1,0];
    for(k=0;k<2;k++)drawCat(g,cs[ord[k]].x,cs[ord[k]].y,ord[k],cs[ord[k]]);
    if(ph.k==='win'){for(k=0;k<2;k++)for(i=0;i<6;i++){var an=ph.t*5+i*1.047,rd=ts*(.5+ph.t*.5),sx=cs[k].x+Math.cos(an)*rd,sy=cs[k].y-ts*.2+Math.sin(an)*rd*.7,ss=3*(1-ph.t/1.15)+1;
      g.fillStyle=k?'#e6ecff':'#fff2a0';g.beginPath();g.moveTo(sx,sy-ss*2);g.lineTo(sx+ss*.6,sy);g.lineTo(sx,sy+ss*2);g.lineTo(sx-ss*.6,sy);g.closePath();g.fill();
      g.beginPath();g.moveTo(sx-ss*2,sy);g.lineTo(sx,sy+ss*.6);g.lineTo(sx+ss*2,sy);g.lineTo(sx,sy-ss*.6);g.closePath();g.fill()}}
    /* 상단: 시간 막대, 레벨, 이동 수 */
    var tf=Math.max(0,Math.min(1,time/70)),low=time<10;
    g.fillStyle='rgba(20,20,60,.45)';rr(g,12,36,336,12,6);g.fill();
    if(tf>0){var tg=g.createLinearGradient(12,0,348,0);tg.addColorStop(0,low?'#ff6a6a':'#ffcf4a');tg.addColorStop(1,low?'#ff9a6a':'#9fb4ff');g.fillStyle=tg;
      g.globalAlpha=low?.7+.3*Math.sin(tG*10):1;rr(g,14,38,Math.max(8,332*tf),8,4);g.fill();g.globalAlpha=1}
    g.fillStyle='rgba(20,20,60,.45)';rr(g,12,53,336,24,12);g.fill();
    tx(g,(ko?'레벨 ':'Level ')+(lvN+1),22,65.5,16,'#fff','left');
    tx(g,Math.ceil(time)+(ko?'초':'s'),180,65.5,16,low?'#ff9a9a':'#ffe9a0');
    tx(g,(ko?'이동 ':'Moves ')+moves+' / '+(ko?'목표 ':'par ')+L.par,338,65.5,15,moves>L.par?'#ffc0c0':'#fff','right');
    /* 하단 */
    if(L.tip&&lvN<LEVELS.length){var s=L.tip[ko?'ko':'en'];g.font='15px Jua, system-ui, sans-serif';var wd=g.measureText(s).width+22;
      g.fillStyle='rgba(20,20,60,.5)';rr(g,180-wd/2,553,wd,26,13);g.fill();tx(g,s,180,566.5,15,'#fff')}
    button(g,B_UNDO,ko?'되돌리기':'Undo','u',!hist.length);
    button(g,B_RST,ko?'다시':'Reset','r',!hist.length);
    badge(g,216,588,gd||cyc);
    if(toast){var al=toast.t<.15?toast.t/.15:toast.t>1?1-(toast.t-1)/.3:1,sc=1+.25*Math.max(0,1-toast.t*5);g.save();g.globalAlpha=Math.max(0,al);g.translate(180,Math.max(112,oy-36));g.scale(sc,sc);
      g.font='26px Jua, system-ui, sans-serif';var tw2=g.measureText(toast.s).width+36;g.fillStyle='rgba(30,25,80,.85)';rr(g,-tw2/2,-22,tw2,44,22);g.fill();
      tx(g,toast.s,0,1,26,'#fff3a0');g.restore()}}

  SG.run({id:'mirror-twins',
    title:{ko:'거울 쌍둥이',en:'Mirror Twins'},
    how:{ko:'한 번 밀면 두 고양이가 함께 움직여요. 달냥이는 거울처럼 반대로! 벽을 이용해 둘을 동시에 자기 발판에 올리세요.',
         en:'One swipe moves both kittens, but Moon mirrors you. Use walls to land both on their own pads at once.'},
    init:init,update:update,draw:draw});
})();
