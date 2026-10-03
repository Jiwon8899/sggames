/* 녹는 얼음이 (Melt Cube) — 크기가 곧 자원인 슬라이딩 퍼즐.
   따뜻한 칸을 밟으면 1씩 녹는다. 커야 누를 수 있는 발판, 작아야 지나는 틈.
   규칙(로직)은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var GW=7,GH=9,NC=63,DX=[0,1,0,-1],DY=[-1,0,1,0],FAN={'^':0,'>':1,'v':2,'<':3};

  /* ---------- 레벨 ----------
     # 빈곳  - 찬 칸  ~ 따뜻한 칸  S 시작  T 둘째 얼음  E 냉동실 문  1-4 틈(그 크기 이하만)
     a-d 발판(크기 2-5 이상)  G 문(발판을 다 누르면 열림)  X/x 상자(찬/따뜻한 칸)  * 눈  H 히터  ^>v< 선풍기 */
  var DEFS=[
    {s:5,g:['#######','#######','##--E##','##-####','##-####','##S####','#######','#######','#######'],
      tip:{ko:'밀어서 냉동실 문까지 가요!',en:'Swipe to reach the freezer door!'}},
    {s:5,g:['#######','#######','#-~-###','#~#~###','#S#-~E#','#######','#######','#######','#######'],
      tip:{ko:'따뜻한 칸을 밟으면 1씩 녹아요',en:'Each warm tile melts you by 1'}},
    {s:5,g:['#######','###E###','###2###','#~--###','#-#-###','#~~-###','###S###','#######','#######'],
      tip:{ko:'틈은 크기 2 이하만! 일부러 녹아요',en:'Gap fits size 2 or less. Melt on purpose!'}},
    {s:5,g:['#######','##E####','##G####','##2####','#-~~~b#','#-#-#-#','#-~S~-#','#######','#######'],
      tip:{ko:'발판은 크기 3 이상, 틈은 2 이하',en:'Plate needs 3+, gap needs 2 or less'}},
    {s:3,g:['#######','#*--###','###-###','#S--~~#','#####~#','#####E#','#######','#######','#######'],
      tip:{ko:'눈을 먹으면 +1 커져요',en:'Snow makes you +1 bigger'}},
    {s:4,g:['#######','####E##','#S~~X-#','#-#-###','#---###','#######','#######','#######','#######'],
      tip:{ko:'상자는 크기 3 이상만 밀어요',en:'Only size 3+ can push a crate'}},
    {s:5,g:['#######','#S~-~~E','#-#H#-#','#-~-~-#','#-~~~-#','#######','#######','#######','#######'],
      tip:{ko:'히터 옆 칸은 2씩 녹아요!',en:'Tiles next to a heater melt 2!'}},
    {s:3,g:['#######','#S->~~#','#-###-#','#~~~--#','#####E#','#######','#######','#######','#######'],
      tip:{ko:'선풍기 바람! 작을수록 멀리 날려요',en:'Fans blow you. Smaller flies further'}},
    {s:4,min:3,freeze:true,g:['#######','#######','#E#####','#G#####','#S~b-##','#######','#######','#######','#######'],
      tip:{ko:'웅덩이는 3번 움직이면 얼어요. 문은 3 이상!',en:'Puddles freeze after 3 moves. Door needs 3+!'}},
    {s:1,sun:[2,3,4,5,4,3,2,1],g:['#######','#######','#S----E','#-----#','#######','#######','#######','#######','#######'],
      tip:{ko:'햇빛 줄기는 찬 칸도 데워요. 타이밍!',en:'The sunbeam warms cold tiles. Time it!'}},
    {s:2,s2:2,g:['#######','###E###','###G###','#S-c-T#','#######','#######','#######','#######','#######'],
      tip:{ko:'둘은 같이 움직여요. 부딪히면 합체!',en:'Both move together. Bump to merge!'}},
    {s:4,min:4,split:true,g:['#######','#######','#######','#######','#S-2--E','#######','#######','#######','#######'],
      tip:{ko:'나누기 누르고 방향! 지나서 다시 합체',en:'Split, then a direction. Merge again after'}},
    {s:2,g:['#######','#*S-b-#','#####~#','#####-#','###EG2#','#######','#######','#######','#######'],
      tip:{ko:'커졌다가, 다시 작아져요',en:'Grow first, then shrink'}},
    {s:5,min:3,g:['#######','#S~~~-#','#-###-#','#c#*2-#','#-#G###','#-X--E#','#######','#######','#######'],
      tip:{ko:'순서를 잘 생각해요!',en:'Think about the order!'}}
  ];

  function parse(d){
    var L={s:d.s||5,s2:d.s2||0,exitMin:d.min||0,sun:d.sun||null,freeze:!!d.freeze,split:!!d.split,tip:d.tip||null,gen:!!d.gen,
      f:[],o:[],hot:[],plates:[],snows:[],crates:[],heat:[],start:-1,second:-1,exit:-1,par:0},x,y,i,ch,f,o,k;
    for(y=0;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;ch=d.g[y].charAt(x);f='c';o='.';
      if(ch==='#')f='#';else if(ch==='~')f='w';else if(ch==='-'){}
      else if(ch==='x'){f='w';L.crates.push(i)}else if(ch==='X')L.crates.push(i);
      else if(ch==='S')L.start=i;else if(ch==='T')L.second=i;
      else if(ch==='H'){f='#';o='H';L.heat.push(i)}
      else{o=ch;if(ch==='E')L.exit=i;else if(ch==='*')L.snows.push(i);else if('abcd'.indexOf(ch)>=0)L.plates.push(i)}
      L.f[i]=f;L.o[i]=o;L.hot[i]=false}
    for(k=0;k<L.heat.length;k++){i=L.heat[k];x=i%GW;y=(i-x)/GW;
      if(x>0)L.hot[i-1]=true;if(x<GW-1)L.hot[i+1]=true;if(y>0)L.hot[i-GW]=true;if(y<GH-1)L.hot[i+GW]=true}
    L.all=(1<<L.plates.length)-1;return L}
  function initState(L){var S={c:[{p:L.start,s:L.s,id:0}],cr:L.crates.slice(),sn:0,pl:0,t:0,pd:{},won:false,dead:false,nid:2,ws:0};
    if(L.second>=0)S.c.push({p:L.second,s:L.s2,id:1});return S}
  function clone(S){var pd={},k;for(k in S.pd)pd[k]=S.pd[k];
    return {c:S.c.map(function(c){return {p:c.p,s:c.s,id:c.id}}),cr:S.cr.slice(),sn:S.sn,pl:S.pl,t:S.t,pd:pd,won:S.won,dead:S.dead,nid:S.nid,ws:S.ws}}
  function sunCol(L,t){return L.sun?L.sun[t%L.sun.length]:-1}
  function meltAt(L,S,n){if(S.pd[n]===9)return 0;if(L.hot[n])return 2;return (L.f[n]==='w'||n%GW===sunCol(L,S.t))?1:0}
  function cubeAt(S,p,ex){for(var i=0;i<S.c.length;i++){var c=S.c[i];if(c!==ex&&!c.gone&&c.p===p)return c}return null}
  function press(L,S,c,ev){var pi=L.plates.indexOf(c.p);
    if(pi>=0&&!(S.pl>>pi&1)&&c.s>='abcd'.indexOf(L.o[c.p])+2){S.pl|=1<<pi;if(ev)ev.push({k:'plate',id:c.id,p:c.p})}}
  /* 한 칸 이동. 0 막힘, 1 이동, 2 합체, 3 도착, 4 증발 */
  function step(L,S,c,d,ev){
    var x=c.p%GW,y=(c.p-x)/GW,nx=x+DX[d],ny=y+DY[d],n,o,oc,ci,bx,by,b,m,si;
    if(nx<0||ny<0||nx>=GW||ny>=GH)return 0;
    n=ny*GW+nx;o=L.o[n];if(L.f[n]==='#')return 0;
    oc=cubeAt(S,n,c);
    if(oc){oc.s=Math.min(5,oc.s+c.s);c.gone=true;if(ev)ev.push({k:'merge',id:c.id,into:oc.id,p:n,s:oc.s});press(L,S,oc,ev);return 2}
    if(o==='G'&&S.pl!==L.all)return 0;
    if(o>='1'&&o<='4'&&c.s>+o)return 0;
    if(o==='E'&&c.s<L.exitMin)return 0;
    ci=S.cr.indexOf(n);
    if(ci>=0){if(c.s<3)return 0;bx=nx+DX[d];by=ny+DY[d];if(bx<0||by<0||bx>=GW||by>=GH)return 0;b=by*GW+bx;
      if(L.f[b]==='#'||L.o[b]!=='.'||S.cr.indexOf(b)>=0||cubeAt(S,b,null))return 0;
      S.cr[ci]=b;if(ev)ev.push({k:'push',id:c.id,i:ci})}
    c.p=n;
    if(o==='E'){S.won=true;S.ws=c.s;if(ev)ev.push({k:'step',id:c.id,p:n,s:c.s,m:0},{k:'win',id:c.id});return 3}
    m=meltAt(L,S,n);if(m){c.s-=m;S.pd[n]=-1}
    if(ev)ev.push({k:'step',id:c.id,p:n,s:c.s,m:m});
    if(c.s<=0){c.gone=true;if(ev)ev.push({k:'die',id:c.id,p:n});return 4}
    if(o==='*'){si=L.snows.indexOf(n);if(!(S.sn>>si&1)){S.sn|=1<<si;c.s=Math.min(5,c.s+1);if(ev)ev.push({k:'snow',id:c.id,p:n,s:c.s})}}
    press(L,S,c,ev);return 1}
  function blowDist(s){return s>=4?1:s>=2?2:3}
  /* 첫 걸음 뒤의 연쇄: 얼음 위에서는 미끄러지고, 선풍기 칸에서는 날아간다 */
  function chain(L,S,c,d,ev){var fan=false,g=0,r,k,i,fd;
    while(g++<24){
      if(S.pd[c.p]===9){r=step(L,S,c,d,ev);if(r!==1)return;continue}
      fd=FAN[L.o[c.p]];
      if(!fan&&fd!==undefined){fan=true;d=fd;k=blowDist(c.s);if(ev)ev.push({k:'blow',id:c.id});
        for(i=0;i<k;i++){r=step(L,S,c,d,ev);if(r!==1)return}continue}
      return}}
  function finish(L,S){var k,v;S.c=S.c.filter(function(c){return !c.gone});
    for(k in S.pd){v=S.pd[k];if(v===9)continue;v++;
      if(L.freeze&&!L.hot[k]){if(v>=3)v=9}else if(v>=6){delete S.pd[k];continue}S.pd[k]=v}
    S.t++;S.dead=!S.won&&S.c.length===0}
  function move(L,S,d,ev){
    var ord=S.c.slice().sort(function(a,b){return (b.p%GW*DX[d]+(b.p/GW|0)*DY[d])-(a.p%GW*DX[d]+(a.p/GW|0)*DY[d])}),i,c,r,any=false;
    for(i=0;i<ord.length;i++){c=ord[i];if(c.gone||S.won)continue;r=step(L,S,c,d,ev);if(r)any=true;if(r===1)chain(L,S,c,d,ev)}
    if(!any)return false;finish(L,S);return true}
  function canSplit(L,S){return L.split&&S.c.length===1&&S.c[0].s>=2}
  function split(L,S,d,ev){
    if(!canSplit(L,S))return false;
    var c=S.c[0],o=c.s,nb={p:c.p,s:o>>1,id:S.nid},mark=ev?ev.length:0,r;
    c.s=o-nb.s;S.c.push(nb);if(ev)ev.push({k:'spawn',id:nb.id,p:c.p,s:nb.s,from:c.id,ps:c.s});
    r=step(L,S,nb,d,ev);
    if(!r){S.c.pop();c.s=o;if(ev)ev.length=mark;return false}
    S.nid++;if(r===1)chain(L,S,nb,d,ev);finish(L,S);return true}
  function key(L,S){
    var k=S.c.map(function(c){return c.p*8+c.s}).sort().join(',')+'|'+S.cr.slice().sort().join(',')+'|'+S.sn+'|'+S.pl,ps,i;
    if(L.sun)k+='|'+S.t%L.sun.length;
    if(L.freeze){ps=[];for(i in S.pd)ps.push(i+':'+S.pd[i]);k+='|'+ps.sort().join(',')}
    return k}
  /* 전체 상태 공간 BFS. 행동 0-3 이동, 4-7 나누기 */
  function solve(L,maxN){
    var S0=initState(L),q=[S0],par=[-1],act=[-1],seen={},h=0,S,T,a,ok,path,na=L.split?8:4;
    seen[key(L,S0)]=1;maxN=maxN||300000;
    while(h<q.length&&q.length<maxN){S=q[h];
      for(a=0;a<na;a++){T=clone(S);ok=a<4?move(L,T,a,null):split(L,T,a-4,null);
        if(!ok||T.dead)continue;
        if(T.won){path=[a];while(h>0){path.unshift(act[h]);h=par[h]}return {par:path.length,path:path,nodes:q.length}}
        var k=key(L,T);if(seen[k])continue;seen[k]=1;q.push(T);par.push(h);act.push(a)}
      h++}
    return null}
  /* 크기를 무시한 순수 최단 거리(벽과 히터만 막음) */
  function geo(L,wantPath){var dist=[],prev=[],q=[L.start],h=0,i,x,y,d,nx,ny,n,p;
    for(i=0;i<NC;i++)dist[i]=-1;dist[L.start]=0;
    while(h<q.length){i=q[h++];if(i===L.exit)break;x=i%GW;y=(i-x)/GW;
      for(d=0;d<4;d++){nx=x+DX[d];ny=y+DY[d];if(nx<0||ny<0||nx>=GW||ny>=GH)continue;n=ny*GW+nx;
        if(L.f[n]==='#'||dist[n]>=0)continue;dist[n]=dist[i]+1;prev[n]=i;q.push(n)}}
    if(!wantPath)return dist[L.exit];
    if(dist[L.exit]<0)return null;p=[];for(i=L.exit;i!==L.start;i=prev[i])p.unshift(i);return p}

  /* ---------- 절차 생성 ---------- */
  function rng(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=Math.imul(s^s>>>15,1|s);
    t=(t+Math.imul(t^t>>>7,61|t))^t;return ((t^t>>>14)>>>0)/4294967296}}
  function genOne(r){
    var g=[],i,S,E,tries=0,free,path,inner,rows=[],y,n,pick,gi,k;
    for(i=0;i<NC;i++)g[i]=r()<.25?'#':(r()<.55?'~':'-');
    do{S=r()*NC|0;E=r()*NC|0;tries++}while(tries<40&&(Math.abs(S%GW-E%GW)+Math.abs((S/GW|0)-(E/GW|0))<6));
    if(tries>=40)return null;
    g[S]='S';g[E]='E';
    for(y=0;y<GH;y++)rows.push(g.slice(y*GW,y*GW+GW).join(''));
    path=geo(parse({g:rows}),true);if(!path||path.length<7)return null;
    inner=path.slice(1,-1);
    pick=function(){for(var t=0;t<30;t++){var c=r()*NC|0;if((g[c]==='-'||g[c]==='~')&&path.indexOf(c)<0)return c}return -1};
    if(r()<.7){gi=inner[1+(r()*(inner.length-1)|0)];g[gi]=String(1+(r()*3|0))}
    if(r()<.5){gi=inner[1+(r()*(inner.length-1)|0)];if(g[gi]==='-'||g[gi]==='~'){n=pick();if(n>=0){g[gi]='G';g[n]='abc'.charAt(r()*3|0)}}}
    k=r()*3|0;while(k-->0){n=pick();if(n>=0)g[n]='*'}
    if(r()<.4){n=pick();if(n>=0)g[n]=g[n]==='~'?'x':'X'}
    if(r()<.35){n=pick();if(n>=0)g[n]='H'}
    if(r()<.3){n=pick();if(n>=0)g[n]='^>v<'.charAt(r()*4|0)}
    rows=[];for(y=0;y<GH;y++)rows.push(g.slice(y*GW,y*GW+GW).join(''));
    return {g:rows,s:3+(r()*3|0),min:r()<.25?2+(r()*2|0):0,gen:true}}
  function generate(seed){
    var r=rng(seed*7919+13),k,d,L,res,gd;
    for(k=0;k<600;k++){d=genOne(r);if(!d)continue;L=parse(d);res=solve(L,40000);if(!res)continue;
      gd=geo(L);if(res.par<9||res.par>26||res.par<=gd)continue;L.par=res.par;L.sol=res.path;L.geo=gd;return L}
    L=parse(DEFS[2+seed%12]);L.par=solve(L).par;return L}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={DEFS:DEFS,parse:parse,initState:initState,clone:clone,move:move,split:split,solve:solve,geo:geo,generate:generate,key:key,GW:GW,GH:GH};
  if(typeof SG==='undefined')return;

  /* ================= 게임 ================= */
  var W=360,H=640,TS=44,GX=26,GY=98,GY0=98,BY0=0,BY1=9,ID='melt-cube';
  var lvN,L,S,par,moves,undo,time,streak,mode,modeT,vis,vcr,pv,armed,tG=0,seedBase,drips,puffs,warn,plateT,prevDown,bestLv,gateA;
  var kq=[];
  if(!window.__meltCubeKeys){window.__meltCubeKeys=true;
    window.addEventListener('keydown',function(e){if(e.repeat)return;var c=e.code;
      if(c==='KeyZ'||c==='Backspace')kq.push('u');else if(c==='KeyR')kq.push('r');else if(c==='KeyX')kq.push('x');else return;
      if(c==='Backspace')e.preventDefault()})}
  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function cpGet(){try{return Math.min(12,+localStorage.getItem('melt-cube-cp')||0)}catch(e){return 0}}
  function cpSet(v){try{if(v>cpGet())localStorage.setItem('melt-cube-cp',v)}catch(e){}}
  function tx(i){return GX+(i%GW)*TS+TS/2}
  function ty(i){return GY+(i/GW|0)*TS+TS/2}
  function cw(s){return 13+s*5.4}

  function syncVis(){vis=S.c.map(function(c){return {id:c.id,x:c.p%GW,y:c.p/GW|0,s:c.s,ts:c.s,q:[],beam:0,bump:0,bd:0,bl:hash(c.id+3)*3}});
    vcr=S.cr.map(function(p){return {x:p%GW,y:p/GW|0}})}
  function load(n){lvN=n;
    if(n<DEFS.length){L=parse(DEFS[n]);L.par=solve(L).par}else L=generate(seedBase+n);
    par=L.par;S=initState(L);var x0=9,x1=0,y0=9,y1=0,q;for(q=0;q<NC;q++)if(L.f[q]!=='#'||L.o[q]==='H'){x0=Math.min(x0,q%GW);x1=Math.max(x1,q%GW);y0=Math.min(y0,q/GW|0);y1=Math.max(y1,q/GW|0)}
    BY0=y0;BY1=y1+1;GX=Math.round(180-(x0+x1+1)/2*TS);GY=Math.round(GY0+GH*TS/2-(y0+y1+1)/2*TS);moves=0;undo=[];mode='play';modeT=0;armed=false;pv={};plateT=0;gateA=0;syncVis();
    if(n%3===0&&n<=12)cpSet(n)}
  function init(a){time=50;streak=0;seedBase=(Math.random()*1e6)|0;drips=[];puffs=[];warn=0;prevDown=true;kq.length=0;load(cpGet())}
  function fv(id){for(var i=0;i<vis.length;i++)if(vis[i].id===id)return vis[i];return null}

  function apply(ev,a){var i,e,v,p;
    for(i=0;i<ev.length;i++){e=ev[i];v=fv(e.id);
      if(e.k==='spawn'){p=fv(e.from);p.ts=e.ps;p.s=e.ps;vis.push({id:e.id,x:p.x,y:p.y,s:e.s,ts:e.s,q:[],beam:0,bump:0,bd:0,bl:1});a.sfx('jump')}
      else if(v)v.q.push(e)}}
  function arrive(v,e,a){var px=GX+v.x*TS+TS/2,py=GY+v.y*TS+TS/2,o,i;
    if(e.k==='step'){v.ts=Math.max(0,e.s);
      if(e.m){a.beep(520-e.m*90+e.s*40,.09,'sine');for(i=0;i<5*e.m;i++)drips.push({x:px+(Math.random()-.5)*20,y:py+(Math.random()-.5)*10,vy:20+Math.random()*40,t:0});
        a.pop(px,py-22,'-'+e.m,e.m>1?'#ff8a6c':'#ffe08a')}
      else a.beep(880,.03,'triangle')}
    else if(e.k==='snow'){v.ts=e.s;v.beam=1.3;a.sfx('coin');a.burst(px,py,'#ffffff',12);a.pop(px,py-22,'+1','#bff0ff')}
    else if(e.k==='plate'){plateT=.5;a.sfx('jump');a.burst(px,py+8,'#9cf29c',10);a.pop(px,py-22,a.lang==='ko'?'철컥!':'Click!','#b8ffb8')}
    else if(e.k==='push')a.beep(150,.1,'square');
    else if(e.k==='blow')a.beep(300,.2,'sawtooth');
    else if(e.k==='merge'){o=fv(e.into);if(o){o.ts=e.s;o.beam=1}v.rm=true;a.sfx('coin');a.burst(px,py,'#bfe9ff',14)}
    else if(e.k==='die'){v.rm=true;a.sfx('hit');a.shake(6);for(i=0;i<9;i++)puffs.push({x:px+(Math.random()-.5)*16,y:py,vx:(Math.random()-.5)*30,vy:-30-Math.random()*40,t:0,l:.9,r:6+Math.random()*7})}
    else if(e.k==='win'){v.beam=2}}

  function act(d,a){
    if(mode!=='play')return;
    var ev=[],prev=clone(S),ok=armed?split(L,S,d,ev):move(L,S,d,ev),i;
    if(!ok){for(i=0;i<vis.length;i++){vis[i].bump=.16;vis[i].bd=d}a.beep(140,.06,'square');
      if(armed){armed=false;a.pop(180,GY0+GH*TS/2,a.lang==='ko'?'못 나눠요':'No room','#ffd0d0')}return}
    armed=false;undo.push(prev);if(undo.length>200)undo.shift();moves++;apply(ev,a);
    if(S.won){mode='win';modeT=0}else if(S.dead){mode='evap';modeT=0}}
  function doUndo(a){if(mode!=='play'||!undo.length)return;S=undo.pop();moves=Math.max(0,moves-1);armed=false;syncVis();a.sfx('tap')}
  function doReset(a){if(mode!=='play')return;S=initState(L);undo=[];moves=0;armed=false;pv={};syncVis();a.sfx('tap')}
  function doArm(a){if(mode!=='play')return;if(!canSplit(L,S)){if(L.split)a.beep(140,.06,'square');return}armed=!armed;a.sfx('tap')}

  var BT=[{k:'u',x:26,w:92},{k:'r',x:126,w:92},{k:'x',x:226,w:108}],BY=502,BH=36;
  function update(dt,inp,a){
    tG+=dt;var i,v,e,tp,dx,dy,d,sp,k;
    if(inp.tap&&inp.down&&inp.x!=null&&inp.y>=BY-4&&inp.y<=BY+BH+4){
      for(i=0;i<BT.length;i++)if(inp.x>=BT[i].x&&inp.x<=BT[i].x+BT[i].w)kq.push(BT[i].k)}
    while(kq.length){k=kq.shift();if(k==='u')doUndo(a);else if(k==='r')doReset(a);else doArm(a)}
    if(inp.swipe)act({up:0,right:1,down:2,left:3}[inp.swipe],a);
    /* 시각 큐 */
    for(i=vis.length-1;i>=0;i--){v=vis[i];v.bl+=dt;if(v.beam>0)v.beam-=dt;if(v.bump>0)v.bump-=dt;
      v.s+=(v.ts-v.s)*Math.min(1,dt*14);
      var budget=dt*(12+v.q.length*6);
      while(v.q.length&&budget>0){e=v.q[0];
        if(e.p!==undefined&&(e.k==='step'||e.k==='merge')){tp={x:e.p%GW,y:e.p/GW|0};dx=tp.x-v.x;dy=tp.y-v.y;d=Math.abs(dx)+Math.abs(dy);
          if(d>budget){v.x+=dx/d*budget;v.y+=dy/d*budget;budget=0;break}
          v.x=tp.x;v.y=tp.y;budget-=d}
        v.q.shift();arrive(v,e,a);if(v.rm){vis.splice(i,1);break}}}
    for(i=0;i<vcr.length;i++){if(S.cr[i]===undefined)continue;sp=Math.min(1,dt*18);
      vcr[i].x+=(S.cr[i]%GW-vcr[i].x)*sp;vcr[i].y+=((S.cr[i]/GW|0)-vcr[i].y)*sp}
    for(i=drips.length-1;i>=0;i--){drips[i].t+=dt;drips[i].y+=drips[i].vy*dt;if(drips[i].t>.5)drips.splice(i,1)}
    for(i=puffs.length-1;i>=0;i--){v=puffs[i];v.t+=dt;v.x+=v.vx*dt;v.y+=v.vy*dt;if(v.t>v.l)puffs.splice(i,1)}
    if(plateT>0)plateT-=dt;
    gateA+=((S.pl===L.all?1:0)-gateA)*Math.min(1,dt*8);
    /* 냉동실 문 숨결 */
    if(Math.random()<dt*5)puffs.push({x:tx(L.exit)+(Math.random()-.5)*26,y:ty(L.exit)+14,vx:(Math.random()-.5)*14,vy:6+Math.random()*10,t:0,l:1.3,r:5+Math.random()*5,mist:1});
    if(mode==='play'){time-=dt;
      if(time<10&&Math.floor(time)!==warn){warn=Math.floor(time);a.beep(700,.05,'square')}
      a.tempo(time<12?1.4:1);
      if(time<=0){time=0;a.over();return}}
    else if(mode==='win'){modeT+=dt;
      if(modeT>=.45&&modeT-dt<.45){var px=tx(L.exit),py=ty(L.exit),pts=10,under=moves<=par,sz=S.ws*2;
        if(under){streak++;pts+=10+3*Math.min(streak,5)}else{if(moves<=par+3)pts+=4;streak=0}
        pts+=sz;a.add(pts);a.sfx('win');a.burst(px,py,'#9fe6ff',22);a.burst(px,py,'#ffffff',10);
        a.pop(px,py-30,'+'+pts,'#fff27a');if(under)a.pop(180,GY0+20,streak>1?'PAR x'+streak+'!':'PAR!','#9cf29c');
        time=Math.min(70,time+12)}
      if(modeT>1.1)load(lvN+1)}
    else if(mode==='evap'){modeT+=dt;
      if(modeT>=.35&&modeT-dt<.35){streak=0;a.pop(180,GY0+GH*TS/2,a.lang==='ko'?'증발!':'Evaporated!','#ffd0c0')}
      if(modeT>1){S=initState(L);undo=[];moves=0;pv={};syncVis();mode='play'}}
  }

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function txt(g,s,x,y,sz,c,al){g.font=sz+'px Jua, system-ui, sans-serif';g.textAlign=al||'center';g.textBaseline='middle';g.fillStyle=c;g.fillText(s,x,y)}
  function badge(g,s,x,y,bg){g.fillStyle=bg||'rgba(30,34,60,.85)';rr(g,x-12,y-8,24,16,7);g.fill();txt(g,s,x,y+1,12,'#fff')}

  function drawBg(g){
    var gr=g.createLinearGradient(0,0,0,94);gr.addColorStop(0,'#ffe2b0');gr.addColorStop(1,'#ffc98a');g.fillStyle=gr;g.fillRect(0,0,W,94);
    /* 창문 */
    var wx=232,wy=32,ww=104,wh=54;g.fillStyle='#fff6da';rr(g,wx-4,wy-4,ww+8,wh+8,6);g.fill();
    gr=g.createLinearGradient(0,wy,0,wy+wh);gr.addColorStop(0,'#7fd0ff');gr.addColorStop(1,'#d8f3ff');g.fillStyle=gr;g.fillRect(wx,wy,ww,wh);
    g.fillStyle='#fff2a8';g.beginPath();g.arc(wx+78,wy+16,11+Math.sin(tG*2)*1.2,0,7);g.fill();
    g.fillStyle='rgba(255,242,168,.35)';g.beginPath();g.arc(wx+78,wy+16,18+Math.sin(tG*2)*2,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.8)';var cx=wx+((tG*5)%(ww+40))-20;g.save();g.beginPath();g.rect(wx,wy,ww,wh);g.clip();
    g.beginPath();g.arc(cx,wy+34,8,0,7);g.arc(cx+10,wy+30,10,0,7);g.arc(cx+22,wy+35,7,0,7);g.fill();g.restore();
    g.fillStyle='#fff6da';g.fillRect(wx+ww/2-2,wy,4,wh);g.fillRect(wx,wy+wh/2-2,ww,4);
    /* 커튼 */
    g.fillStyle='rgba(255,120,110,.85)';g.beginPath();g.moveTo(wx-10,wy-8);
    for(var i=0;i<=6;i++){var yy=wy-8+i*(wh+14)/6,sw=Math.sin(tG*1.3+i*.8)*4*i/6;g.lineTo(wx+18+sw+(i%2?4:0),yy)}
    g.lineTo(wx-10,wy+wh+6);g.closePath();g.fill();
    g.fillStyle='#b9764a';g.fillRect(wx-14,wy-11,ww+28,4);
    /* 조리대 */
    gr=g.createLinearGradient(0,94,0,H);gr.addColorStop(0,'#453c5e');gr.addColorStop(1,'#2a2540');g.fillStyle=gr;g.fillRect(0,94,W,H-94);
    g.fillStyle='#6b4a3a';g.fillRect(0,90,W,6);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,90,W,2);
    /* 창에서 드는 볕 */
    g.fillStyle='rgba(255,220,130,.07)';g.beginPath();g.moveTo(232,96);g.lineTo(340,96);g.lineTo(250+Math.sin(tG*.2)*10,H);g.lineTo(60+Math.sin(tG*.2)*10,H);g.closePath();g.fill();
    for(i=0;i<14;i++){var mx=(hash(i)*W+tG*(6+hash(i+9)*8))%W,my=110+hash(i+20)*500+Math.sin(tG+i)*8;
      g.fillStyle='rgba(255,240,200,'+(.12+.1*Math.sin(tG*1.5+i))+')';g.beginPath();g.arc(mx,my,1.3,0,7);g.fill()}
  }
  function drawFanShadow(g){g.save();g.beginPath();g.rect(0,96,W,H-96);g.clip();g.translate(180,300);g.rotate(tG*.55);g.fillStyle='rgba(10,8,30,.10)';
    for(var i=0;i<3;i++){g.rotate(Math.PI*2/3);g.beginPath();g.moveTo(0,-14);g.quadraticCurveTo(160,-70,330,-30);g.quadraticCurveTo(170,40,0,14);g.closePath();g.fill()}
    g.restore()}

  function drawTile(g,i,sc){
    var x=GX+(i%GW)*TS,y=GY+(i/GW|0)*TS,f=L.f[i],lit=i%GW===sc,gr,k,h=hash(i+lvN*.37);
    g.fillStyle='rgba(0,0,0,.35)';rr(g,x+2,y+5,TS-4,TS-4,8);g.fill();
    if(f==='w'){gr=g.createLinearGradient(x,y,x,y+TS);gr.addColorStop(0,'#ffc57a');gr.addColorStop(1,'#e8964c');g.fillStyle=gr;rr(g,x+2,y+2,TS-4,TS-4,8);g.fill();
      g.strokeStyle='rgba(170,90,40,.35)';g.lineWidth=1;
      for(k=0;k<3;k++){var yy=y+10+k*11+h*4;g.beginPath();g.moveTo(x+6,yy);g.quadraticCurveTo(x+TS/2,yy+(h-.5)*6,x+TS-6,yy+1);g.stroke()}}
    else{gr=g.createLinearGradient(x,y,x,y+TS);gr.addColorStop(0,'#f6fbff');gr.addColorStop(1,'#c9def2');g.fillStyle=gr;rr(g,x+2,y+2,TS-4,TS-4,8);g.fill();
      g.strokeStyle='rgba(120,150,190,.3)';g.lineWidth=1;g.beginPath();g.moveTo(x+6+h*10,y+6);g.lineTo(x+16+h*12,y+20);g.lineTo(x+10+h*20,y+TS-7);g.stroke();
      var tw=Math.sin(tG*2.2+i*1.7);if(tw>.55&&!lit){var sx=x+10+hash(i+5)*24,sy=y+10+hash(i+8)*24,r=(tw-.55)*7;g.fillStyle='#fff';
        g.beginPath();g.moveTo(sx,sy-r);g.lineTo(sx+r*.3,sy-r*.3);g.lineTo(sx+r,sy);g.lineTo(sx+r*.3,sy+r*.3);g.lineTo(sx,sy+r);g.lineTo(sx-r*.3,sy+r*.3);g.lineTo(sx-r,sy);g.lineTo(sx-r*.3,sy-r*.3);g.fill()}}
    if(lit&&f!=='w'){g.fillStyle='rgba(255,190,60,.5)';rr(g,x+2,y+2,TS-4,TS-4,8);g.fill()}
    if(L.hot[i]){g.fillStyle='rgba(255,50,20,'+(.3+.1*Math.sin(tG*5+i))+')';rr(g,x+2,y+2,TS-4,TS-4,8);g.fill();
      txt(g,'x2',x+TS-12,y+TS-10,11,'rgba(120,10,0,.8)')}
    g.fillStyle='rgba(255,255,255,.35)';rr(g,x+4,y+3,TS-8,3,1.5);g.fill();
    /* 아지랑이 */
    if((f==='w'||lit||L.hot[i])&&S.pd[i]!==9){g.save();rr(g,x+2,y+2,TS-4,TS-4,8);g.clip();g.strokeStyle='rgba(255,255,230,.5)';g.lineWidth=1.5;
      for(k=0;k<2;k++){var ph=(tG*(L.hot[i]?26:14)+h*40+k*22)%TS,yb=y+TS-ph;g.globalAlpha=Math.sin(ph/TS*Math.PI);g.beginPath();
        for(var s=0;s<=6;s++){var px=x+5+s*(TS-10)/6,py=yb+Math.sin(s*1.4+tG*4+k*2+i)*2.5;if(s)g.lineTo(px,py);else g.moveTo(px,py)}g.stroke()}
      g.restore();g.globalAlpha=1}
  }
  function passH(i){var x=i%GW;return (x>0&&L.f[i-1]!=='#')||(x<GW-1&&L.f[i+1]!=='#')}
  function drawObj(g,i){
    var o=L.o[i],x=GX+(i%GW)*TS,y=GY+(i/GW|0)*TS,cx=x+TS/2,cy=y+TS/2,k,gr,n,op,pi,dn;
    if(o==='.')return;
    if(o>='1'&&o<='4'){n=+o;op=cw(n)+5;var th=(TS-op)/2;g.fillStyle='#6a4fc4';
      if(passH(i)){rr(g,x+1,y,TS-2,th,5);g.fill();rr(g,x+1,y+TS-th,TS-2,th,5);g.fill();
        g.fillStyle='rgba(255,255,255,.25)';g.fillRect(x+4,y+2,TS-8,2);g.fillRect(x+4,y+TS-th+2,TS-8,2)}
      else{rr(g,x,y+1,th,TS-2,5);g.fill();rr(g,x+TS-th,y+1,th,TS-2,5);g.fill();
        g.fillStyle='rgba(255,255,255,.25)';g.fillRect(x+2,y+4,2,TS-8);g.fillRect(x+TS-th+2,y+4,2,TS-8)}
      g.strokeStyle='rgba(60,40,140,.5)';g.setLineDash([3,3]);g.lineWidth=1.5;rr(g,cx-op/2+2,cy-op/2+2,op-4,op-4,5);g.stroke();g.setLineDash([]);
      txt(g,'≤'+n,cx,cy+1,14,'#3a2a8a')}
    else if('abcd'.indexOf(o)>=0){pi=L.plates.indexOf(i);dn=S.pl>>pi&1;n='abcd'.indexOf(o)+2;
      g.fillStyle='rgba(0,0,0,.3)';rr(g,x+6,y+8,TS-12,TS-12,6);g.fill();
      gr=g.createLinearGradient(x,y,x,y+TS);gr.addColorStop(0,dn?'#8fe38f':'#e9edf3');gr.addColorStop(1,dn?'#4fb85f':'#9aa5b5');g.fillStyle=gr;
      rr(g,x+6,y+(dn?7:5),TS-12,TS-12,6);g.fill();g.strokeStyle=dn?'#2f8f45':'#5d6878';g.lineWidth=2;g.stroke();
      txt(g,n+'+',cx,cy+(dn?2:0),15,dn?'#1d6a30':'#3c4656')}
    else if(o==='G'){
      if(gateA<.98){g.globalAlpha=1-gateA;g.fillStyle='#39405a';rr(g,x+2,y+2,TS-4,TS-4,8);g.fill();
        for(k=0;k<4;k++){gr=g.createLinearGradient(x+7+k*9,0,x+12+k*9,0);gr.addColorStop(0,'#dfe6f0');gr.addColorStop(1,'#7c889c');g.fillStyle=gr;rr(g,x+7+k*9,y+4+gateA*30,5,TS-8-gateA*30,2.5);g.fill()}
        g.fillStyle='#ffcf4a';rr(g,cx-7,cy-5,14,11,3);g.fill();g.strokeStyle='#ffcf4a';g.lineWidth=2.5;g.beginPath();g.arc(cx,cy-5,4.5,Math.PI,0);g.stroke();g.globalAlpha=1}
      else{g.strokeStyle='rgba(60,80,120,.35)';g.setLineDash([4,4]);g.lineWidth=1.5;rr(g,x+7,y+7,TS-14,TS-14,5);g.stroke();g.setLineDash([])}}
    else if(o==='*'){if(S.sn>>L.snows.indexOf(i)&1)return;
      g.fillStyle='rgba(60,90,140,.3)';g.beginPath();g.ellipse(cx,cy+11,15,5,0,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(cx-7,cy+6,8,0,7);g.arc(cx+7,cy+6,8,0,7);g.arc(cx,cy-2+Math.sin(tG*3+i)*.8,10,0,7);g.fill();
      g.fillStyle='#d5ecff';g.beginPath();g.arc(cx+4,cy+8,5,0,7);g.fill();
      badge(g,'+1',cx+12,cy-13,'#3b8fd8')}
    else if(o==='H'){g.fillStyle='rgba(255,80,30,'+(.18+.08*Math.sin(tG*5))+')';g.beginPath();g.arc(cx,cy,30,0,7);g.fill();
      g.fillStyle='rgba(0,0,0,.35)';rr(g,x+5,y+9,TS-10,TS-10,7);g.fill();
      gr=g.createLinearGradient(x,y,x,y+TS);gr.addColorStop(0,'#8a8f9c');gr.addColorStop(1,'#4a4e5c');g.fillStyle=gr;rr(g,x+5,y+5,TS-10,TS-10,7);g.fill();
      g.strokeStyle='rgb(255,'+(120+60*Math.sin(tG*6)|0)+',40)';g.lineWidth=3;g.lineCap='round';
      for(k=0;k<3;k++){g.beginPath();g.moveTo(x+12,y+14+k*8);g.lineTo(x+TS-12,y+14+k*8);g.stroke()}g.lineCap='butt'}
    else if(FAN[o]!==undefined){var d=FAN[o];
      g.fillStyle='rgba(40,60,90,.25)';g.beginPath();g.arc(cx,cy+2,16,0,7);g.fill();
      g.fillStyle='#e7eef6';g.beginPath();g.arc(cx,cy,16,0,7);g.fill();g.strokeStyle='#5b7da6';g.lineWidth=2;g.stroke();
      g.save();g.translate(cx,cy);g.rotate(tG*14);g.fillStyle='#4fb3c9';
      for(k=0;k<3;k++){g.rotate(Math.PI*2/3);g.beginPath();g.ellipse(7,0,7,3.6,0,0,7);g.fill()}g.restore();
      g.fillStyle='#2c4a6a';g.beginPath();g.arc(cx,cy,3,0,7);g.fill();
      g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=2;g.lineCap='round';
      for(k=0;k<3;k++){var ph=((tG*1.6+k/3)%1),ox=(k-1)*9,len=TS*(.55+ph*1.6);g.globalAlpha=1-ph;
        g.beginPath();g.moveTo(cx+DX[d]*len+DY[d]*ox,cy+DY[d]*len+DX[d]*ox);g.lineTo(cx+DX[d]*(len+9)+DY[d]*ox,cy+DY[d]*(len+9)+DX[d]*ox);g.stroke()}
      g.globalAlpha=1;g.lineCap='butt';
      g.fillStyle='#ff9a3c';g.save();g.translate(cx+DX[d]*19,cy+DY[d]*19);g.rotate(d*Math.PI/2);g.beginPath();g.moveTo(0,-6);g.lineTo(6,3);g.lineTo(-6,3);g.fill();g.restore()}
    else if(o==='E'){var br=Math.sin(tG*2.2)*.5+.5;
      g.fillStyle='rgba(160,225,255,'+(.25+.2*br)+')';g.beginPath();g.arc(cx,cy,27+br*4,0,7);g.fill();
      g.fillStyle='rgba(0,0,0,.3)';rr(g,x+4,y+5,TS-8,TS-6,7);g.fill();
      gr=g.createLinearGradient(x,y,x+TS,y+TS);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#8fcdf2');g.fillStyle=gr;rr(g,x+4,y+1,TS-8,TS-5,7);g.fill();
      g.strokeStyle='#3f86c2';g.lineWidth=2.5;g.stroke();
      g.fillStyle='#3f86c2';rr(g,x+TS-14,cy-9,4,16,2);g.fill();
      g.strokeStyle='#5aa9e0';g.lineWidth=2;g.lineCap='round';
      for(k=0;k<3;k++){var an=k*Math.PI/3+tG*.5;g.beginPath();g.moveTo(cx-4-Math.cos(an)*8,cy-2-Math.sin(an)*8);g.lineTo(cx-4+Math.cos(an)*8,cy-2+Math.sin(an)*8);g.stroke()}g.lineCap='butt';
      if(L.exitMin)badge(g,L.exitMin+'+',cx+11,y+4,'#d8452f')}
  }
  function drawPuddle(g,i){
    var v=S.pd[i],x=GX+(i%GW)*TS,y=GY+(i/GW|0)*TS,cx=x+TS/2,cy=y+TS/2,tgt,k,cur;
    tgt=v===undefined?0:v===9?1:L.freeze?1:[1,1,.95,.85,.72,.58,.42][v+1];cur=pv[i]||0;cur+=(tgt-cur)*.12;pv[i]=cur;
    if(cur<.03){if(v===undefined)delete pv[i];return}
    if(v===9){g.fillStyle='rgba(190,235,255,.92)';rr(g,x+3,y+3,TS-6,TS-6,8);g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.stroke();
      g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=2.5;g.lineCap='round';
      g.beginPath();g.moveTo(x+10,y+22);g.lineTo(x+22,y+10);g.moveTo(x+18,y+32);g.lineTo(x+34,y+16);g.stroke();g.lineCap='butt';return}
    g.fillStyle='rgba(110,195,255,.78)';g.beginPath();
    for(k=0;k<5;k++){var a=k*1.257+hash(i+k)*.8,r=(7+hash(i*3+k)*5)*cur,d=(6+hash(i+k*7)*5)*cur;g.moveTo(cx+Math.cos(a)*d+r,cy+3+Math.sin(a)*d*.7);
      g.ellipse(cx+Math.cos(a)*d,cy+3+Math.sin(a)*d*.7,r,r*.72,0,0,7)}
    g.ellipse(cx,cy+3,11*cur,8*cur,0,0,7);g.fill();
    g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1.5;g.beginPath();g.arc(cx-3*cur,cy+1,6*cur,3.6,4.9);g.stroke();
    if(L.freeze&&v!==undefined){var left=3-Math.max(0,v);g.strokeStyle='rgba(255,255,255,'+(.3+.2*(3-left))+')';g.lineWidth=2;g.setLineDash([3,3]);
      g.beginPath();g.ellipse(cx,cy+3,16,12,0,0,7);g.stroke();g.setLineDash([]);badge(g,''+left,cx+13,cy-12,'#2f7fc4')}
  }
  function drawCrate(g,c){var x=GX+c.x*TS,y=GY+c.y*TS,k;
    g.fillStyle='rgba(0,0,0,.35)';rr(g,x+5,y+9,TS-10,TS-10,4);g.fill();
    var gr=g.createLinearGradient(x,y,x,y+TS);gr.addColorStop(0,'#d9a066');gr.addColorStop(1,'#a56a38');g.fillStyle=gr;rr(g,x+5,y+3,TS-10,TS-10,4);g.fill();
    g.strokeStyle='#6e4322';g.lineWidth=2;g.stroke();g.beginPath();g.moveTo(x+8,y+6);g.lineTo(x+TS-8,y+TS-10);g.moveTo(x+TS-8,y+6);g.lineTo(x+8,y+TS-10);g.stroke();
    g.fillStyle='#fff3d6';rr(g,x+TS/2-11,y+TS/2-10,22,15,4);g.fill();txt(g,'3+',x+TS/2,y+TS/2-2,12,'#6e4322')}

  function drawCube(g,cx,cy,sz,v,small){
    if(sz<.15)return;
    var w=cw(sz),h=w*.94,bob=Math.sin(tG*3+v.id*2)*1.2,r=w*(sz<1.6?.42:.24),x,y,gr,mood,blink,ex,ey,er,k;
    if(v.bump>0){var b=Math.sin(v.bump/.16*Math.PI)*4;cx+=DX[v.bd]*b;cy+=DY[v.bd]*b}
    mood=v.beam>0?'beam':sz>=3.5?'happy':sz>=2.5?'ok':'worry';
    if(mood==='worry')cx+=Math.sin(tG*30)*.5;
    g.fillStyle='rgba(20,30,70,.3)';g.beginPath();g.ellipse(cx,cy+h/2+1,w*.5,w*.16,0,0,7);g.fill();
    cy+=bob-2;x=cx-w/2;y=cy-h/2;
    gr=g.createLinearGradient(x,y,x+w*.4,y+h);gr.addColorStop(0,'rgba(240,252,255,.9)');gr.addColorStop(.55,'rgba(160,215,250,.8)');gr.addColorStop(1,'rgba(90,165,235,.86)');
    g.fillStyle=gr;rr(g,x,y,w,h,r);g.fill();
    g.save();rr(g,x,y,w,h,r);g.clip();
    g.fillStyle='rgba(255,255,255,.33)';g.beginPath();g.moveTo(x+w*.1,y+h);g.lineTo(x+w*.5,y);g.lineTo(x+w*.72,y);g.lineTo(x+w*.32,y+h);g.fill();
    g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.moveTo(x+w*.5,y+h);g.lineTo(x+w*.9,y);g.lineTo(x+w,y);g.lineTo(x+w*.6,y+h);g.fill();
    g.fillStyle='rgba(40,110,200,.22)';g.fillRect(x,y+h*.8,w,h*.2);g.restore();
    g.strokeStyle='rgba(50,120,205,.95)';g.lineWidth=2;rr(g,x,y,w,h,r);g.stroke();
    g.fillStyle='rgba(255,255,255,.9)';rr(g,x+w*.14,y+h*.12,w*.3,Math.max(2,h*.09),1.5);g.fill();
    /* 얼굴 */
    blink=(v.bl%3.1)<.12?.15:1;ex=w*.19;ey=cy-h*.04;er=Math.max(1.6,w*.075);
    g.fillStyle='#1d3557';g.strokeStyle='#1d3557';g.lineWidth=Math.max(1.3,w*.05);g.lineCap='round';
    if(mood==='beam'){for(k=-1;k<=1;k+=2){g.beginPath();g.arc(cx+k*ex,ey+er*.4,er*1.2,Math.PI*1.1,Math.PI*1.9);g.stroke()}
      g.fillStyle='#e8556a';g.beginPath();g.arc(cx,ey+h*.2,w*.12,0,Math.PI);g.fill()}
    else{for(k=-1;k<=1;k+=2){g.beginPath();g.ellipse(cx+k*ex,ey,er,er*blink,0,0,7);g.fill();
        if(blink===1){g.fillStyle='#fff';g.beginPath();g.arc(cx+k*ex-er*.3,ey-er*.3,er*.35,0,7);g.fill();g.fillStyle='#1d3557'}}
      if(mood==='happy'){g.beginPath();g.arc(cx,ey+h*.14,w*.11,.15*Math.PI,.85*Math.PI);g.stroke()}
      else if(mood==='ok'){g.beginPath();g.moveTo(cx-w*.08,ey+h*.22);g.lineTo(cx+w*.08,ey+h*.22);g.stroke()}
      else{g.beginPath();g.arc(cx,ey+h*.3,w*.1,1.15*Math.PI,1.85*Math.PI);g.stroke();
        for(k=-1;k<=1;k+=2){g.beginPath();g.moveTo(cx+k*(ex+er*1.3),ey-er*2.3);g.lineTo(cx+k*(ex-er),ey-er*1.5);g.stroke()}}}
    g.lineCap='butt';
    if(mood==='worry'||(mode==='play'&&time<10)){g.fillStyle='rgba(120,200,255,.95)';
      for(k=-1;k<=1;k+=2){var ph=(tG*1.3+(k>0?.5:0))%1,sx=cx+k*(w/2+3),sy=y+ph*h*.8;g.globalAlpha=1-ph;g.beginPath();g.moveTo(sx,sy-4);g.quadraticCurveTo(sx+3,sy+1,sx,sy+2.5);g.quadraticCurveTo(sx-3,sy+1,sx,sy-4);g.fill()}g.globalAlpha=1}
    /* 크기 점 */
    if(!small){var n=Math.round(sz),py=cy+h/2+8-bob+2;g.fillStyle='rgba(20,26,50,.75)';rr(g,cx-n*4-3,py-4.5,n*8+6,9,4.5);g.fill();
      for(k=0;k<n;k++){g.fillStyle=n<=1?'#ff7a5a':n<=2?'#ffd24a':'#aeeaff';g.beginPath();g.arc(cx-n*4+4+k*8,py,2.6,0,7);g.fill()}}
  }

  function drawUI(g,a){
    var ko=a.lang==='ko',i,b,on,lab,k,fr=Math.max(0,time/70);
    g.fillStyle='rgba(40,30,60,.78)';rr(g,12,36,206,48,12);g.fill();
    txt(g,'Lv '+(lvN+1),24,51,17,'#fff','left');
    txt(g,(ko?'이동 ':'Moves ')+moves+' / '+(ko?'파 ':'Par ')+par,208,51,13,moves>par?'#ffb0a0':'#bfeaff','right');
    g.fillStyle='rgba(255,255,255,.18)';rr(g,22,66,186,9,4.5);g.fill();
    g.fillStyle=time<10?(Math.sin(tG*12)>0?'#ff6a4a':'#ffd0c0'):'#7fd9ff';rr(g,22,66,Math.max(9,186*fr),9,4.5);g.fill();
    txt(g,Math.ceil(time)+'',22+Math.max(9,186*fr)-4,71,9,'#143','right');
    for(i=0;i<BT.length;i++){b=BT[i];if(b.k==='x'&&!L.split)continue;
      on=b.k==='u'?undo.length>0:b.k==='x'?canSplit(L,S):true;
      g.fillStyle='rgba(0,0,0,.3)';rr(g,b.x,BY+3,b.w,BH,10);g.fill();
      g.fillStyle=b.k==='x'?(armed?'#ffd24a':'#8fe0ff'):'#f4ecff';g.globalAlpha=on?1:.45;rr(g,b.x,BY,b.w,BH,10);g.fill();
      lab=b.k==='u'?(ko?'되돌리기 Z':'Undo Z'):b.k==='r'?(ko?'다시 R':'Restart R'):(ko?'나누기 X':'Split X');
      txt(g,lab,b.x+b.w/2,BY+BH/2+1,15,'#3a2a5a');g.globalAlpha=1}
    /* 크기 미터 */
    var tot=0;for(i=0;i<S.c.length;i++)tot=Math.max(tot,S.c[i].s);
    txt(g,ko?'크기':'Size',26,563,14,'#d8d0ee','left');
    for(k=0;k<5;k++){on=k<tot;g.fillStyle=on?(tot<=1?'#ff8a6a':tot<=2?'#ffd24a':'#9fe2ff'):'rgba(255,255,255,.13)';rr(g,68+k*24,553,19,19,5);g.fill();
      if(on){g.fillStyle='rgba(255,255,255,.6)';rr(g,71+k*24,556,8,3,1.5);g.fill()}}
    if(L.sun)txt(g,ko?'▼ 다음 햇빛':'▼ next beam',334,563,12,'#ffe08a','right');
    if(L.tip){var s=L.tip[a.lang];g.font='15px Jua, system-ui, sans-serif';var w=Math.min(292,g.measureText(s).width+22);
      g.fillStyle='rgba(255,246,218,.95)';rr(g,160-w/2,588,w,30,12);g.fill();
      var fs=15;while(fs>10){g.font=fs+'px Jua, system-ui, sans-serif';if(g.measureText(s).width<=w-14)break;fs--}
      txt(g,s,160,604,fs,'#4a3320')}
    else if(armed)txt(g,ko?'나눌 방향으로 밀어요':'Swipe a direction to split',160,604,15,'#ffe08a');
  }

  function draw(g,a){
    if(!L)return;
    var i,v,sc=sunCol(L,S.t),nc=sunCol(L,S.t+1),p;
    drawBg(g);drawFanShadow(g);
    for(i=0;i<NC;i++)if(L.f[i]!=='#')drawTile(g,i,sc);
    for(i=0;i<NC;i++)if(L.f[i]!=='#'&&(S.pd[i]!==undefined||pv[i]))drawPuddle(g,i);
    for(i=0;i<NC;i++)drawObj(g,i);
    if(L.sun){var bx=GX+sc*TS,T0=GY+BY0*TS,T1=GY+BY1*TS+4,gr=g.createLinearGradient(0,T0-10,0,T1);gr.addColorStop(0,'rgba(255,230,120,.5)');gr.addColorStop(1,'rgba(255,200,80,.12)');
      g.fillStyle=gr;g.beginPath();g.moveTo(bx+6,T0-12);g.lineTo(bx+TS-6,T0-12);g.lineTo(bx+TS,T1);g.lineTo(bx,T1);g.fill();
      g.fillStyle='#ffe08a';var nx=GX+nc*TS+TS/2,ny=T0-7+Math.sin(tG*6)*2;g.beginPath();g.moveTo(nx-7,ny-5);g.lineTo(nx+7,ny-5);g.lineTo(nx,ny+5);g.fill();
      g.strokeStyle='rgba(255,224,138,.5)';g.setLineDash([5,5]);g.lineWidth=2;g.strokeRect(GX+nc*TS+3,T0+2,TS-6,T1-T0-6);g.setLineDash([])}
    for(i=0;i<vcr.length;i++)drawCrate(g,vcr[i]);
    g.fillStyle='rgba(120,195,250,.9)';
    for(i=0;i<drips.length;i++){p=drips[i];g.globalAlpha=1-p.t/.5;g.beginPath();g.arc(p.x,p.y,2.2,0,7);g.fill()}g.globalAlpha=1;
    for(i=0;i<vis.length;i++){v=vis[i];var cx=GX+v.x*TS+TS/2,cy=GY+v.y*TS+TS/2,sz=v.s;
      if(mode==='win'&&S.won)sz*=Math.max(0,1-Math.max(0,modeT-.25)*2.2);
      drawCube(g,cx,cy,sz,v);
      if(armed){g.fillStyle='#ffd24a';for(var d=0;d<4;d++){g.save();g.translate(cx+DX[d]*(26+Math.sin(tG*8)*2),cy+DY[d]*(26+Math.sin(tG*8)*2));g.rotate(d*Math.PI/2);g.beginPath();g.moveTo(0,-6);g.lineTo(6,3);g.lineTo(-6,3);g.fill();g.restore()}}}
    for(i=0;i<puffs.length;i++){p=puffs[i];var f=p.t/p.l;g.globalAlpha=(p.mist?.28:.75)*(1-f);g.fillStyle=p.mist?'#dff4ff':'#fff';g.beginPath();g.arc(p.x,p.y,p.r*(.6+f),0,7);g.fill()}
    g.globalAlpha=1;
    drawUI(g,a);
  }

  SG.run({id:ID,title:{ko:'녹는 얼음이',en:'Melt Cube'},
    how:{ko:'밀어서 얼음이를 한 칸씩! 따뜻한 칸은 녹아요. 커야 누르고, 작아야 지나가요.',en:'Swipe to slide the ice cube. Warm tiles melt it. Be big to press plates, small to fit gaps.'},
    init:init,update:update,draw:draw});
})();
