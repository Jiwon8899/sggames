/* 택배 분류소 (Parcel Sort) — 벨트와 스위치를 미리 깔아 두고 "실행"을 누르면 상자들이 정해진 규칙대로 한 칸씩 흘러간다.
   시뮬레이션·레벨·생성기·탐색기는 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var COLS=6,ROWS=8,GAP=2,MAXSTEP=150;
  var DX=[0,1,0,-1],DY=[-1,0,1,0];
  var COLORS=['r','b','g','y'];
  /* 타일: b 벨트, s 색 스위치(c 색), t 토글, k 카운터(3번째마다), m 합류, u 버퍼, x 짐더미 */
  var TYPES=['b','sr','sb','sg','sy','t','k','m','u'];
  function tileOf(key,d,fixed){var t=key.charAt(0)==='s'?{t:'s',c:key.charAt(1)}:{t:key};t.d=d|0;t.fixed=!!fixed;t.key=key;return t}
  function keyOf(t){return t.t==='s'?'s'+t.c:t.t}
  function toggleOuts(d){return [(d+3)%4,(d+1)%4]}

  /* ---------- 레벨 파싱 ----------
     map: 8줄 x 6칸. '.' 빈칸(배치 가능) '#' 짐더미 '^>v<' 고정 벨트
     fix: [r,c,key,d] 고정 특수 타일, ch: [변,번호,'큐',지연] (변 T/L/R), tr: [변,번호,색,수량] (변 B/L/R), bud: 손에 든 타일 */
  function edgePos(side,i){
    if(side==='T')return {r:-1,c:i,d:2};if(side==='B')return {r:ROWS,c:i,d:0};
    if(side==='L')return {r:i,c:-1,d:1};return {r:i,c:COLS,d:3}}
  function parse(def){
    var grid=[],r,c,ch,k;
    for(r=0;r<ROWS;r++)for(c=0;c<COLS;c++){ch=def.map[r].charAt(c);
      grid.push(ch==='#'?tileOf('x',0,true):'^>v<'.indexOf(ch)>=0?tileOf('b','^>v<'.indexOf(ch),true):null)}
    (def.fix||[]).forEach(function(f){grid[f[0]*COLS+f[1]]=tileOf(f[2],f[3],true)});
    var L={grid:grid,chutes:[],trucks:[],budget:{},tip:def.tip||null,name:def.name||null};
    def.ch.forEach(function(q){var p=edgePos(q[0],q[1]);L.chutes.push({r:p.r,c:p.c,d:p.d,q:q[2].split(''),delay:q[3]||0})});
    def.tr.forEach(function(q){var p=edgePos(q[0],q[1]);L.trucks.push({r:p.r,c:p.c,side:q[0],col:q[2],cap:q[3]})});
    for(k in def.bud)if(def.bud[k]>0)L.budget[k]=def.bud[k];
    return L}

  /* ---------- 시뮬레이션 ---------- */
  function inGrid(r,c){return r>=0&&r<ROWS&&c>=0&&c<COLS}
  function makeSim(L,layout,needMode){
    /* layout: 칸 번호 -> 타일 (플레이어가 놓은 것) */
    var tiles=L.grid.slice(),i;
    for(i in layout)if(layout[i])tiles[+i]=layout[i];
    var s={L:L,tiles:tiles,ts:{},parcels:[],step:0,qi:L.chutes.map(function(){return 0}),next:L.chutes.map(function(ch){return ch.delay}),
      load:L.trucks.map(function(){return 0}),gone:L.trucks.map(function(){return false}),res:null,why:'',jam:null,need:-1,needMode:!!needMode,total:0,done:0,ev:[]};
    L.chutes.forEach(function(ch){s.total+=ch.q.length});
    spawn(s);return s}
  function tst(s,idx){return s.ts[idx]||(s.ts[idx]={idx:0,cnt:0,held:null})}
  function spawn(s){
    s.L.chutes.forEach(function(ch,i){
      if(s.qi[i]<ch.q.length&&s.step>=s.next[i]){
        var p={id:s.parcels.length,col:ch.q[s.qi[i]],r:ch.r,c:ch.c,pr:ch.r,pc:ch.c,dir:ch.d,st:'mv',chute:i,born:s.step};
        s.parcels.push(p);s.qi[i]++;s.next[i]=s.step+GAP;s.ev.push({t:'spawn',p:p})}})}
  function truckAt(s,r,c){for(var i=0;i<s.L.trucks.length;i++){var t=s.L.trucks[i];if(t.r===r&&t.c===c)return i}return -1}
  function fail(s,why,r,c,ids){s.res='fail';s.why=why;s.jam={r:r,c:c,ids:ids||[]};s.ev.push({t:'fail',why:why,r:r,c:c})}

  function step(s){
    if(s.res)return s;
    s.ev=[];s.step++;
    var P=s.parcels,i,j,p,q,live=[],tile,idx;
    for(i=0;i<P.length;i++){p=P[i];if(p.st==='done')continue;p.pr=p.r;p.pc=p.c;p.wait=false;live.push(p)}
    /* 1) 목표 칸 */
    var movers=[];
    for(i=0;i<live.length;i++){p=live[i];if(p.st!=='mv')continue;
      p.tr=p.r+DY[p.dir];p.tc=p.c+DX[p.dir];
      if(inGrid(p.tr,p.tc)){idx=p.tr*COLS+p.tc;tile=s.tiles[idx];
        if(!tile){if(s.needMode){s.res='need';s.need=idx;return s}}}
      movers.push(p)}
    /* 2) 합류 타일: 동시에 들어오려 하면 뒤에서 오는(직진) 상자가 먼저, 나머지는 한 칸 기다린다 */
    var byT={};
    for(i=0;i<movers.length;i++){p=movers[i];if(!inGrid(p.tr,p.tc))continue;idx=p.tr*COLS+p.tc;tile=s.tiles[idx];
      if(tile&&tile.t==='m')(byT[idx]=byT[idx]||[]).push(p)}
    for(idx in byT){var g=byT[idx];if(g.length<2)continue;tile=s.tiles[idx];
      g.sort(function(a,b){return pri(a.dir,tile.d)-pri(b.dir,tile.d)||a.id-b.id});
      for(j=1;j<g.length;j++){g[j].wait=true;s.ev.push({t:'wait',p:g[j]})}}
    movers=movers.filter(function(p){return !p.wait});
    /* 3) 맞바꾸기(정면 충돌) */
    for(i=0;i<movers.length;i++)for(j=i+1;j<movers.length;j++){p=movers[i];q=movers[j];
      if(p.tr===q.r&&p.tc===q.c&&q.tr===p.r&&q.tc===p.c){fail(s,'crash',(p.r+q.r)/2,(p.c+q.c)/2,[p.id,q.id]);return s}}
    /* 4) 이동 */
    var arrived=[];
    for(i=0;i<movers.length;i++){p=movers[i];
      if(inGrid(p.tr,p.tc)){idx=p.tr*COLS+p.tc;tile=s.tiles[idx];p.r=p.tr;p.c=p.tc;
        if(!tile){fail(s,'fall',p.r,p.c,[p.id]);return s}
        if(tile.t==='x'){fail(s,'crate',p.r,p.c,[p.id]);return s}
        arrived.push(p)}
      else{var ti=truckAt(s,p.tr,p.tc);p.r=p.tr;p.c=p.tc;
        if(ti<0){fail(s,'fall',p.r,p.c,[p.id]);return s}
        var T=s.L.trucks[ti];
        if(s.gone[ti]||s.load[ti]>=T.cap){fail(s,'full',p.r,p.c,[p.id]);return s}
        if(T.col!=='*'&&T.col!==p.col){fail(s,'wrong',p.r,p.c,[p.id]);return s}
        p.st='done';p.dStep=s.step;s.load[ti]++;s.done++;s.ev.push({t:'deliver',p:p,truck:ti});
        if(s.load[ti]>=T.cap){s.gone[ti]=true;s.ev.push({t:'depart',truck:ti})}}}
    /* 5) 같은 칸 충돌 (버퍼 칸은 '보관 중 1 + 새로 온 1' 허용) */
    var occ={};
    for(i=0;i<live.length;i++){p=live[i];if(p.st==='done'||!inGrid(p.r,p.c))continue;(occ[p.r*COLS+p.c]=occ[p.r*COLS+p.c]||[]).push(p)}
    for(idx in occ){var o=occ[idx];if(o.length<2)continue;tile=s.tiles[idx];
      var ok=tile&&tile.t==='u'&&o.length===2&&(o[0].st==='held'||o[1].st==='held')&&arrived.indexOf(o[0].st==='held'?o[1]:o[0])>=0;
      if(!ok){fail(s,'crash',o[0].r,o[0].c,o.map(function(x){return x.id}));return s}}
    /* 6) 도착한 칸의 타일이 방향을 정한다 */
    for(i=0;i<arrived.length;i++){p=arrived[i];idx=p.r*COLS+p.c;tile=s.tiles[idx];var st;
      if(tile.t==='b'||tile.t==='m')p.dir=tile.d;
      else if(tile.t==='s'){var hit=p.col===tile.c;p.dir=hit?tile.d:p.dir;s.ev.push({t:'sw',idx:idx,hit:hit})}
      else if(tile.t==='k'){st=tst(s,idx);st.cnt++;var on=st.cnt%3===0;if(on)p.dir=tile.d;s.ev.push({t:'cnt',idx:idx,hit:on,n:st.cnt})}
      else if(tile.t==='t'){st=tst(s,idx);p.dir=toggleOuts(tile.d)[st.idx];st.idx^=1;s.ev.push({t:'tog',idx:idx})}
      else if(tile.t==='u'){st=tst(s,idx);
        if(st.held!==null){q=P[st.held];q.st='mv';q.dir=tile.d;s.ev.push({t:'release',idx:idx,p:q})}
        st.held=p.id;p.st='held';s.ev.push({t:'hold',idx:idx,p:p})}}
    /* 7) 새 상자 */
    spawn(s);
    /* 8) 모두 멈췄고 더 올 상자도 없으면 버퍼를 비운다 */
    var moving=false,more=false,k2;
    for(i=0;i<P.length;i++)if(P[i].st==='mv')moving=true;
    for(i=0;i<s.L.chutes.length;i++)if(s.qi[i]<s.L.chutes[i].q.length)more=true;
    if(!moving&&!more)for(k2 in s.ts){st=s.ts[k2];if(st.held!==null){q=P[st.held];q.st='mv';q.dir=s.tiles[k2].d;st.held=null;s.ev.push({t:'release',idx:+k2,p:q})}}
    if(s.done>=s.total&&!more){s.res='win';s.ev.push({t:'win'});return s}
    if(s.step>=MAXSTEP)fail(s,'loop',0,0,[]);
    return s}
  function pri(dir,md){return dir===md?0:dir===(md+1)%4?1:dir===(md+3)%4?2:3}
  function runAll(L,layout,needMode){var s=makeSim(L,layout,needMode);while(!s.res)step(s);return s}

  /* ---------- 탐색기: 상자가 빈칸에 처음 들어가려는 순간에만 갈래를 친다(그 칸 말고는 결과에 영향이 없다) ---------- */
  function solve(L,opt){
    opt=opt||{};var cap=opt.cap||1,sols=[],nodes=0,budget={},k,best=null;
    for(k in L.budget)budget[k]=L.budget[k];
    function rec(layout,used){
      if(sols.length>=cap||nodes>(opt.maxNodes||400000))return;nodes++;
      var s=runAll(L,layout,true);
      if(s.res==='win'){var cp={};for(var i in layout)cp[i]=layout[i];sols.push({layout:cp,used:used});if(!best||used<best.used)best=sols[sols.length-1];return}
      if(s.res!=='need')return;
      for(var key in budget){if(!budget[key])continue;budget[key]--;
        for(var d=0;d<4;d++){layout[s.need]=tileOf(key,d);rec(layout,used+1);if(sols.length>=cap)break}
        delete layout[s.need];budget[key]++;if(sols.length>=cap)break}}
    rec({},0);
    return {ok:sols.length>0,sols:sols,best:best,nodes:nodes}}

  /* ---------- 손으로 만든 시설 ---------- */
  var LEVELS=[
    {tip:{ko:'벨트를 놓고 실행해요',en:'Place belts, then run'},
     map:['..v...','..v...','..v...','..v...','......','..v...','..v...','..v...'],ch:[['T',2,'rrr']],tr:[['B',2,'r',3]],bud:{b:1}},
    {tip:{ko:'빨강 스위치: 빨간 상자만 꺾여요',en:'Red switch: only red boxes turn'},
     map:['.v....','.v....','.v....','.v....','..>>>>','.v....','.v....','.v....'],ch:[['T',1,'rbrb']],tr:[['R',4,'r',2],['B',1,'b',2]],bud:{sr:1}},
    {tip:{ko:'꺾인 다음엔 길을 이어 줘요',en:'After the turn, build the road'},
     map:['...v..','...v..','...v..','...v..','...v..','<.....','...v..','...v..'],ch:[['T',3,'gbbg']],tr:[['L',5,'g',2],['B',3,'b',2]],bud:{sg:1,b:2}},
    {tip:{ko:'토글은 왼쪽, 오른쪽 번갈아 보내요',en:'A toggle sends left, right, left…'},
     map:['..v...','..v...','..v...','<<.>>>','......','.#..#.','......','......'],ch:[['T',2,'rrrr']],tr:[['L',3,'r',2],['R',3,'r',2]],bud:{t:1,sr:1}},
    {tip:{ko:'같은 칸에서 만나면 쾅! 길을 늘려 봐요',en:'Same cell, same time = crash! Go the long way'},
     map:['.v.v..','.v.v..','...v..','...v..','...v..','...v..','...?>>'.replace('?','.'),'...v..'],fix:[[6,3,'sr',1]],ch:[['T',1,'rr'],['T',3,'bb']],tr:[['R',6,'r',2],['B',3,'b',2]],bud:{b:7}},
    {tip:{ko:'카운터: 세 번째마다 옆으로',en:'Counter: every 3rd box turns'},
     map:['..v...','..v...','..v...','..v...','<<....','..v...','..v...','..v...'],ch:[['T',2,'yyyyyy']],tr:[['L',4,'y',2],['B',2,'y',4]],bud:{k:1,t:1}},
    {tip:{ko:'합류 벨트는 한 줄로 차례차례',en:'A merge belt lets them take turns'},
     map:['.v.v..','.v.v..','.v.v..','.v.v..','.v.v..','.>.<..','<<....','..v...'],fix:[[6,2,'sr',3]],ch:[['T',1,'rrr'],['T',3,'bbb']],tr:[['L',6,'r',3],['B',2,'b',3]],bud:{m:1,b:1}},
    {tip:{ko:'버퍼는 다음 상자가 올 때까지 붙잡아요',en:'A buffer holds a box until the next arrives'},
     map:['.v....','...#..','......','>v>>>>','.v....','.v..#.','.v....','.v..##'],fix:[[3,1,'sr',2]],ch:[['T',1,'rr'],['L',3,'bb']],tr:[['R',3,'b',2],['B',1,'r',2]],bud:{u:1,b:1}},
    {tip:{ko:'스위치 순서가 중요해요',en:'Switch order matters'},
     map:['..v...','..v...','.<....','..v...','..v...','<....>','......','......'],ch:[['T',2,'brbbrb']],tr:[['L',2,'r',2],['L',5,'b',2],['R',5,'b',2]],bud:{sr:1,t:1,b:4}},
    {tip:{ko:'스위치는 다리도 돼요',en:'A switch can be a crossing'},
     map:['..v...','..v...','..v...','>..>.>','..v...','..v...','..v...','..v...'],ch:[['T',2,'rrr'],['L',3,'bbb']],tr:[['B',2,'r',3],['R',3,'b',3]],bud:{sr:1,b:3}},
    {tip:{ko:'색 스위치가 없어요… 순서를 봐요',en:'No colour switch… look at the order'},
     map:['...v..','...v..','...v..','...v..','......','......','......','......'],ch:[['T',3,'rgrgrg']],tr:[['L',4,'r',3],['R',4,'g',3]],bud:{t:1,b:5}},
    {tip:{ko:'규칙을 찾아 봐요',en:'Spot the pattern'},
     map:['..v...','..v...','..v...','......','..v...','..v...','..v...','..v...'],ch:[['T',2,'bbrbbrbbr']],tr:[['R',3,'r',3],['B',2,'b',6]],bud:{k:1,t:1,b:3}},
    {tip:null,
     map:['.v.v..','.v.v..','.v.v..','.v.v..','.>.<..','<.....','..v...','..v...'],ch:[['T',1,'rbr'],['T',3,'brb']],tr:[['L',5,'r',3],['B',2,'b',3]],bud:{m:1,sr:1,sb:1,b:2}},
    {tip:null,
     map:['..v.v.','..v.v.','<.....','#...v#','#...v#','##..v.','#...v.','#...v.'],ch:[['T',2,'gygy'],['T',4,'yyy']],tr:[['L',2,'g',2],['B',4,'y',5]],bud:{t:1,m:1,sg:1,b:2}}
  ];

  /* ---------- 생성기: 정답 배치를 먼저 만들고, 큐와 트럭을 거기서 끌어낸 뒤 일부 타일을 지운다 ---------- */
  function rng(seed){var x=(seed*2654435761>>>0)||1;return function(){x^=x<<13;x>>>=0;x^=x>>>17;x^=x<<5;x>>>=0;return x/4294967296}}
  function generate(n,seed){
    var R=rng(seed||(n*7919+13)),tries=0;
    for(;tries<400;tries++){var L=genTry(n,R);if(L)return L}
    return null}
  function genTry(n,R){
    var lv=Math.min(n,12),grid=[],i,r,c;
    for(i=0;i<ROWS*COLS;i++)grid.push(null);
    var nch=lv>=4&&R()<.4?2:1,chutes=[],used={};
    var cols=[0,1,2,3,4,5];
    for(i=0;i<nch;i++){c=cols.splice(Math.floor(R()*cols.length),1)[0];chutes.push({r:-1,c:c,d:2})}
    var pal=COLORS.slice(0,2+(lv>=3?1:0)+(lv>=8&&R()<.5?1:0));
    /* 경로 만들기 */
    var pool=['b','b','b'];if(lv>=0)pool.push('s','s');if(lv>=2)pool.push('t');if(lv>=4)pool.push('k');
    var nsw=0,maxSw=1+Math.min(2,Math.floor(lv/3));
    function build(r,c,dir,len){
      if(!inGrid(r,c))return;
      var idx=r*COLS+c;if(grid[idx])return; /* 기존 길과 만나면 합쳐진다 */
      if(len>14){grid[idx]=tileOf('b',dir);build(r+DY[dir],c+DX[dir],dir,len+1);return}
      var kind=pool[Math.floor(R()*pool.length)];
      if(kind!=='b'&&(nsw>=maxSw||len<1||r>=ROWS-1))kind='b';
      if(kind==='b'){var nd=dir;var x=R();
        if(x<.25)nd=(dir+1)%4;else if(x<.5)nd=(dir+3)%4;
        if(nd===0)nd=dir===0?2:dir;
        if(r===0&&nd===0)nd=2;
        grid[idx]=tileOf('b',nd);build(r+DY[nd],c+DX[nd],nd,len+1);return}
      nsw++;
      if(kind==='t'){var td=dir;grid[idx]=tileOf('t',td);var o=toggleOuts(td);
        build(r+DY[o[0]],c+DX[o[0]],o[0],len+1);build(r+DY[o[1]],c+DX[o[1]],o[1],len+1);return}
      var a=R()<.5?(dir+1)%4:(dir+3)%4;if(a===0)a=2;
      if(kind==='s'){var col=pal[Math.floor(R()*pal.length)];grid[idx]=tileOf('s'+col,a)}
      else grid[idx]=tileOf('k',a);
      build(r+DY[a],c+DX[a],a,len+1);build(r+DY[dir],c+DX[dir],dir,len+1)}
    chutes.forEach(function(ch){build(0,ch.c,2,0)});
    /* 큐 */
    var qlen=3+Math.min(4,Math.floor(lv/2))+Math.floor(R()*2);
    var Ld={grid:grid,chutes:[],trucks:[],budget:{},tip:null};
    chutes.forEach(function(ch,ci){var q=[];var per=nch>1?Math.max(2,Math.ceil(qlen/2)):qlen;
      for(var j=0;j<per;j++)q.push(pal[Math.floor(R()*pal.length)]);
      Ld.chutes.push({r:ch.r,c:ch.c,d:ch.d,q:q,delay:ci&&R()<.5?1:0})});
    /* 출구를 미리 모두 트럭으로 열어 두고 돌려 본다 */
    var probe={grid:grid,chutes:Ld.chutes,trucks:[],budget:{}};
    for(c=0;c<COLS;c++)probe.trucks.push({r:ROWS,c:c,col:'*',cap:99});
    for(r=0;r<ROWS;r++){probe.trucks.push({r:r,c:-1,col:'*',cap:99});probe.trucks.push({r:r,c:COLS,col:'*',cap:99})}
    var s=makeSim(probe,{}),hits={},seen={};
    while(!s.res){step(s);
      s.ev.forEach(function(e){if(e.t==='deliver'){var t=probe.trucks[e.truck],key=t.r+','+t.c;(hits[key]=hits[key]||[]).push(e.p.col)}});
      s.parcels.forEach(function(p){if(inGrid(p.r,p.c))seen[p.r*COLS+p.c]=1})}
    /* 트럭이 '*' 이라 wrong 은 안 나지만 cap 99 라 full 도 없다. 충돌/낙하/루프면 버린다 */
    if(s.res!=='win')return null;
    var keys=Object.keys(hits);if(keys.length<2||keys.length>4)return null;
    for(i=0;i<keys.length;i++){var hs=hits[keys[i]];for(var j2=1;j2<hs.length;j2++)if(hs[j2]!==hs[0])return null}
    keys.forEach(function(kk){var rc=kk.split(',').map(Number),side=rc[0]===ROWS?'B':rc[1]<0?'L':'R';
      Ld.trucks.push({r:rc[0],c:rc[1],side:side,col:hits[kk][0],cap:hits[kk].length})});
    /* 같은 색 트럭끼리 바로 옆에 붙어 있으면 헷갈리니 버린다 */
    /* 지나가지 않은 타일은 지우고, 빈 곳 몇 칸엔 짐더미 */
    for(i=0;i<grid.length;i++)if(grid[i]&&!seen[i])grid[i]=null;
    var visited=[];for(i=0;i<grid.length;i++)if(grid[i])visited.push(i);
    var special=visited.filter(function(i){return grid[i].t!=='b'}),belts=visited.filter(function(i){return grid[i].t==='b'});
    if(lv>=2&&!special.length)return null;
    var nrem=Math.min(2+Math.floor(lv/3),5),rem=[];
    special.sort(function(){return R()-.5});belts.sort(function(){return R()-.5});
    var nsp=Math.min(special.length,Math.max(1,Math.ceil(nrem/2)));
    rem=special.slice(0,nsp).concat(belts.slice(0,nrem-nsp));
    if(rem.length<2)return null;
    rem.forEach(function(i){var k=keyOf(grid[i]);Ld.budget[k]=(Ld.budget[k]||0)+1;grid[i]=null});
    /* 가끔 미끼 타일 하나 */
    if(lv>=3&&R()<.35){var dk=['b','t','k','sr','sb','sg'][Math.floor(R()*6)];if(dk.charAt(0)!=='s'||pal.indexOf(dk.charAt(1))>=0)Ld.budget[dk]=(Ld.budget[dk]||0)+1}
    var crates=Math.floor(R()*4);
    for(i=0;i<crates;i++){var ci2=Math.floor(R()*grid.length);if(!grid[ci2]&&!seen[ci2])grid[ci2]=tileOf('x',0,true)}
    grid.forEach(function(t){if(t)t.fixed=true});
    if(Object.keys(Ld.budget).length>5)return null;
    var sol=solve(Ld,{cap:1,maxNodes:60000});if(!sol.ok)return null;
    if(runAll(Ld,{}).res==='win')return null;
    Ld.gen=true;
    return Ld}

  var cache={};
  function getLevel(n){if(n<LEVELS.length)return parse(LEVELS[n]);
    if(!cache[n])cache[n]=generate(n-LEVELS.length+3,n*1013+77)||parse(LEVELS[4+n%10]);return cache[n]}

  var API={COLS:COLS,ROWS:ROWS,DX:DX,DY:DY,TYPES:TYPES,LEVELS:LEVELS,parse:parse,makeSim:makeSim,step:step,runAll:runAll,solve:solve,
    generate:generate,getLevel:getLevel,tileOf:tileOf,keyOf:keyOf,toggleOuts:toggleOuts};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  if(typeof SG==='undefined')return;

  /* =================== 게임 =================== */
  var W=360,H=640,GX=48,GY=144,S=44,TY=566;
  var PCOL={r:'#ff6b6b',b:'#4f9fe8',g:'#5ccb7c',y:'#ffc94a'},PDK={r:'#c84646',b:'#2f6db0',g:'#379157',y:'#d4951a'};
  var FONT=function(n){return n+'px Jua, system-ui, sans-serif'};
  var TXT={
    run:{ko:'▶ 실행',en:'▶ Run'},stop:{ko:'■ 멈춤',en:'■ Stop'},fac:{ko:'시설 ',en:'Facility '},
    crash:{ko:'쾅! 상자끼리 부딪혔어요',en:'Bonk! Two boxes collided'},fall:{ko:'앗, 벨트 밖으로 떨어졌어요',en:'Oops, it fell off the belt'},
    crate:{ko:'짐더미에 막혔어요',en:'It hit the crate pile'},wrong:{ko:'색이 다른 트럭이에요!',en:'Wrong truck colour!'},
    full:{ko:'트럭이 이미 꽉 찼어요',en:'That truck is already full'},loop:{ko:'빙글빙글… 끝나지 않아요',en:'Round and round… it never ends'},
    good:{ko:'완벽한 분류예요!',en:'Perfectly sorted!'},first:{ko:'한 번에!',en:'First run!'},plan:{ko:'큐 순서를 보고 미리 깔아 두세요',en:'Read the queue, lay the tiles, run'},
    none:{ko:'남은 타일이 없어요',en:'No tiles left'},locked:{ko:'고정된 타일이에요',en:'That tile is bolted down'},
    watch:{ko:'두근두근…',en:'Here we go…'},kb:{ko:'방향키 이동 · 숫자 선택 · 스페이스 놓기/돌리기 · X 빼기 · R 실행 · Z 되돌리기',en:'Arrows move · 1-5 pick · Space place/rotate · X remove · R run · Z undo'}};
  function tr(o,a){return o[a.lang==='ko'?'ko':'en']}

  var lvN,L,lay,mode,modeT,time,streak,runs,jams,sim,acc,speed,sel,undo,cur,kbOn,prevDown,press,cat,catT,bub,bubT,fx,tG=0,
      truckV,gainT,penT,motes,fork,lastRot,warned,trayFlash,jamInfo,keysQ=[];
  if(!window.__parcelSortKeys){window.__parcelSortKeys=true;
    window.addEventListener('keydown',function(e){keysQ.push(e.code);if(keysQ.length>12)keysQ.shift()})}

  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function cxp(c){return GX+c*S+S/2}
  function cyp(r){return GY+r*S+S/2}
  function trayKeys(){return TYPES.filter(function(k){return L.budget[k]})}
  function placed(key){var n=0;for(var i in lay)if(lay[i]&&keyOf(lay[i])===key)n++;return n}
  function left(key){return (L.budget[key]||0)-placed(key)}
  function totalLeft(){var n=0;trayKeys().forEach(function(k){n+=left(k)});return n}
  function say(t,d){bub=t;bubT=d||0}

  function load(n){
    lvN=n;L=getLevel(n);lay={};mode='edit';modeT=0;runs=0;jams=0;sim=null;acc=0;undo=[];sel=0;press=null;jamInfo=null;
    truckV=L.trucks.map(function(_,i){return {off:70+i*14,honk:0}});
    cur={r:3,c:2};say(L.tip,0);cat='idle';catT=0}

  function init(a){
    time=55;streak=0;speed=1;kbOn=false;prevDown=true;fx=[];gainT=0;penT=0;warned=0;lastRot={};trayFlash=0;keysQ.length=0;
    motes=[];for(var i=0;i<18;i++)motes.push({x:hash(i+3)*W,y:40+hash(i+7)*(H-120),p:hash(i+11)*6.28,v:4+hash(i+13)*8});
    fork={x:-40,v:26};
    load(0);a.tempo(1)}

  /* ---------- 배치 ---------- */
  function tileAt(r,c){var i=r*COLS+c;return lay[i]||L.grid[i]}
  function chuteAt(r,c){for(var i=0;i<L.chutes.length;i++)if(L.chutes[i].r===r&&L.chutes[i].c===c)return L.chutes[i];return null}
  function truckIdx(r,c){for(var i=0;i<L.trucks.length;i++)if(L.trucks[i].r===r&&L.trucks[i].c===c)return i;return -1}
  function feeds(r,c){var res=[],d,nr,nc,t,ch;
    for(d=0;d<4;d++){nr=r-DY[d];nc=c-DX[d];
      if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS){t=tileAt(nr,nc);if(!t)continue;
        if((t.t==='b'||t.t==='m'||t.t==='u'||t.t==='s'||t.t==='k')&&t.d===d)res.push(d);
        else if(t.t==='t'&&toggleOuts(t.d).indexOf(d)>=0)res.push(d)}
      else{ch=chuteAt(nr,nc);if(ch&&ch.d===d)res.push(d)}}
    return res}
  function accepts(r,c,d){var nr=r+DY[d],nc=c+DX[d];
    if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS){var t=tileAt(nr,nc);return !!t&&t.t!=='x'&&!(t.t==='b'&&t.d===(d+2)%4)}
    return truckIdx(nr,nc)>=0}
  function guess(idx,key){var r=Math.floor(idx/COLS),c=idx%COLS,ins=feeds(r,c),din=ins.length?ins[0]:(lastRot[key]!=null?lastRot[key]:2),i,d,list;
    if(key==='t')return din;
    if(!ins.length)return din;
    if(key.charAt(0)==='s'||key==='k')list=[(din+1)%4,(din+3)%4];else list=[din,(din+1)%4,(din+3)%4];
    for(i=0;i<list.length;i++){d=list[i];if(accepts(r,c,d))return d}
    return list[0]}
  function snap(){var o={};for(var i in lay)o[i]=tileOf(keyOf(lay[i]),lay[i].d);return o}
  function pushUndo(){undo.push(snap());if(undo.length>40)undo.shift()}
  function addFx(k,x,y,o){o=o||{};o.k=k;o.x=x;o.y=y;o.t=0;fx.push(o)}
  function tapCell(r,c,a){
    var idx=r*COLS+c,t=lay[idx],ko=a.lang==='ko';
    if(L.grid[idx]){a.beep(160,.08,'square');addFx('nope',cxp(c),cyp(r));say(TXT.locked,1.2);return}
    if(t){pushUndo();t.d=(t.d+1)%4;lastRot[keyOf(t)]=t.d;t.spin=1;a.beep(520+t.d*90,.04,'triangle');return}
    var keys=trayKeys(),key=keys[sel];
    if(!key||left(key)<=0){var alt=keys.filter(function(k){return left(k)>0})[0];
      if(!alt){a.beep(150,.12,'square');trayFlash=1;say(TXT.none,1.2);return}
      sel=keys.indexOf(alt);key=alt}
    pushUndo();var nt=tileOf(key,guess(idx,key));nt.pop=1;lay[idx]=nt;lastRot[key]=nt.d;
    a.beep(700,.05,'triangle');a.beep(1050,.06,'sine');a.burst(cxp(c),cyp(r),'#fff3c4',5);
    if(left(key)<=0){var nx=keys.filter(function(k){return left(k)>0})[0];if(nx)sel=keys.indexOf(nx)}}
  function removeAt(r,c,a){var idx=r*COLS+c;if(!lay[idx]){if(L.grid[idx]){a.beep(160,.08,'square');addFx('nope',cxp(c),cyp(r))}return}
    pushUndo();var k=keyOf(lay[idx]);delete lay[idx];sel=Math.max(0,trayKeys().indexOf(k));
    a.beep(300,.08,'triangle');a.burst(cxp(c),cyp(r),'#c9b8a0',8);addFx('poof',cxp(c),cyp(r))}
  function doUndo(a){if(!undo.length){a.beep(170,.06,'square');return}lay=undo.pop();a.beep(440,.05,'triangle')}

  /* ---------- 실행 ---------- */
  function startRun(a){runs++;sim=makeSim(L,lay,false);acc=0;mode='run';modeT=0;cat='watch';say(TXT.watch,0);
    a.beep(660,.08,'square');a.beep(990,.12,'square');handleEv(sim.ev,a)}
  function stopRun(){mode='edit';sim=null;modeT=0;cat='idle';say(L.tip,0);truckV.forEach(function(v){if(v.off!==0)v.off=70})}
  function stepDur(){return speed===3?.09:.27}
  function handleEv(evs,a){
    evs.forEach(function(e){var x,y;
      if(e.t==='spawn')a.beep(420,.04,'triangle');
      else if(e.t==='sw'){x=cxp(e.idx%COLS);y=cyp(Math.floor(e.idx/COLS));addFx('flash',x,y,{c:e.hit?'#fff':'rgba(255,255,255,.4)'});a.beep(e.hit?880:520,.05,'square')}
      else if(e.t==='tog'){x=cxp(e.idx%COLS);y=cyp(Math.floor(e.idx/COLS));addFx('flash',x,y,{c:'#e6d6ff'});a.beep(740,.05,'square')}
      else if(e.t==='cnt'){x=cxp(e.idx%COLS);y=cyp(Math.floor(e.idx/COLS));addFx('flash',x,y,{c:e.hit?'#fff':'rgba(200,255,250,.5)'});a.beep(e.hit?1170:480+((e.n-1)%3)*120,.05,'square')}
      else if(e.t==='hold')a.beep(330,.06,'triangle');
      else if(e.t==='release')a.beep(560,.06,'triangle');
      else if(e.t==='deliver'){var T=L.trucks[e.truck];a.beep(988,.05,'square');a.beep(1319,.09,'square');a.burst(cxp(T.c),cyp(T.r),PCOL[T.col],6)}
      else if(e.t==='depart'){var T2=L.trucks[e.truck];truckV[e.truck].honk=1;a.beep(392,.14,'sawtooth');a.beep(494,.18,'sawtooth');
        a.pop(cxp(T2.c),cyp(T2.r)-24,a.lang==='ko'?'빵빵!':'Honk!','#fff2b0');if(mode==='run'){cat='nod';catT=0}}})}
  function onWin(a){
    mode='clear';modeT=0;var unused=totalLeft(),first=runs===1;
    if(first)streak++;else streak=0;
    var pts=10+3*unused+(first?5:0)+(streak>1?2*Math.min(streak-1,5):0);
    a.add(pts);time=Math.min(70,time+14);gainT=1.4;cat='cheer';catT=0;say(TXT.good,0);
    a.sfx('win');a.tempo(1+Math.min(.4,(lvN+1)*.025));
    ['#ff6b6b','#4f9fe8','#5ccb7c','#ffc94a','#fff'].forEach(function(c,i){a.burst(W/2-60+i*30,GY+150,c,8)});
    a.pop(W/2,GY+170,'+'+pts,'#ffe066');
    if(first)a.pop(W/2,GY+196,tr(TXT.first,a)+(streak>1?' x'+streak:''),'#ffffff')}
  function onFail(a){
    mode='jam';modeT=0;jams++;time-=2;penT=1.2;cat='facepalm';catT=0;
    var j=sim.jam,x=cxp(j.c),y=cyp(j.r),why=sim.why;jamInfo={why:why,x:x,y:y,ids:j.ids,half:(j.r%1!==0||j.c%1!==0)};
    say(TXT[why]||TXT.crash,0);
    if(why==='crash'||why==='crate'){a.sfx('hit');a.shake(9);a.burst(x,y,'#ffe08a',14);a.pop(x,y-26,a.lang==='ko'?'쾅!':'BONK!','#ffef9a');addFx('stars',x,y)}
    else if(why==='fall'){a.beep(500,.1,'triangle');a.beep(300,.16,'triangle');a.beep(160,.25,'triangle');a.shake(4);a.pop(x,y-22,a.lang==='ko'?'툭!':'Plop!','#fff')}
    else if(why==='loop'){a.beep(300,.2,'sine');a.beep(250,.3,'sine')}
    else{a.beep(220,.25,'sawtooth');a.beep(233,.25,'sawtooth');a.shake(6);a.burst(x,y,'#ff9a9a',10);a.pop(x,y-26,a.lang==='ko'?'빵-!':'HONK!','#ffb0b0');
      var ti=truckIdx(j.r,j.c);if(ti>=0)truckV[ti].honk=1}
    a.pop(W/2+30,52,'-2s','#ff6a5a')}

  function hitTray(x,y){var keys=trayKeys();
    if(y>=TY&&y<=TY+68)for(var i=0;i<keys.length;i++){var bx=6+i*51;if(x>=bx&&x<=bx+48)return {k:'slot',i:i}}
    if(x>=262&&x<=354&&y>=560&&y<=594)return {k:'run'};
    if(x>=262&&x<=312&&y>=598&&y<=636)return {k:'small'};
    return null}
  function cellAt(x,y){var c=Math.floor((x-GX)/S),r=Math.floor((y-GY)/S);if(r>=0&&r<ROWS&&c>=0&&c<COLS)return {r:r,c:c};return null}

  function update(dt,inp,a){
    if(!a.__pc){var op=a.pop;a.pop=function(x,y,tx,c){op(Math.max(36,Math.min(W-36,x)),y,tx,c)};a.__pc=1}
    var fresh=inp.down&&!prevDown&&inp.x!=null,rel=!inp.down&&prevDown,i,k;
    if(mode==='edit'){time-=dt;
      if(time<=0){time=0;a.over();prevDown=inp.down;return}
      if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(880,.05,'square')}}
    if(fresh)kbOn=false;
    gainT=Math.max(0,gainT-dt);penT=Math.max(0,penT-dt);trayFlash=Math.max(0,trayFlash-dt*2);catT+=dt;if(cat==='nod'&&catT>.9)cat=mode==='run'?'watch':'idle';if(bubT>0){bubT-=dt;if(bubT<=0)say(mode==='edit'?L.tip:bub,0)}
    truckV.forEach(function(v,ti){v.honk=Math.max(0,v.honk-dt*2);
      var gone=sim&&sim.gone[ti]&&(mode==='run'||mode==='jam'||mode==='clear');
      if(gone)v.off+=dt*(40+v.off*3);else if(v.off>0&&!(sim&&sim.gone[ti]))v.off=Math.max(0,v.off-dt*(30+v.off*2.2))});
    /* 키보드 */
    while(keysQ.length){k=keysQ.shift();
      if(mode==='edit'){
        if(k==='ArrowLeft'||k==='KeyA'){cur.c=Math.max(0,cur.c-1);kbOn=true}
        else if(k==='ArrowRight'||k==='KeyD'){cur.c=Math.min(COLS-1,cur.c+1);kbOn=true}
        else if(k==='ArrowUp'||k==='KeyW'){cur.r=Math.max(0,cur.r-1);kbOn=true}
        else if(k==='ArrowDown'||k==='KeyS'){cur.r=Math.min(ROWS-1,cur.r+1);kbOn=true}
        else if(k==='Space'){if(kbOn)tapCell(cur.r,cur.c,a);kbOn=true}
        else if(k==='KeyX'||k==='Delete'||k==='Backspace'){removeAt(cur.r,cur.c,a);kbOn=true}
        else if(k==='KeyR'||k==='Enter')startRun(a);
        else if(k==='KeyZ')doUndo(a);
        else{var m=/^(Digit|Numpad)([1-9])$/.exec(k);if(m){var n=+m[2]-1;if(n<trayKeys().length){sel=n;a.beep(600,.04,'triangle');kbOn=true}}}}
      else if(mode==='run'){if(k==='KeyR'||k==='Escape')stopRun();else if(k==='Space'||k==='KeyF'){speed=speed===1?3:1;a.beep(speed===3?880:520,.05,'square')}}
      else if(mode==='jam'&&modeT>.4&&(k==='Space'||k==='KeyR'||k==='Enter'))modeT=99}
    if(mode==='edit'){
      if(fresh){var h=hitTray(inp.x,inp.y),cl=cellAt(inp.x,inp.y);
        if(h&&h.k==='slot'){sel=h.i;a.beep(600,.04,'triangle')}
        else if(h&&h.k==='run')startRun(a);
        else if(h&&h.k==='small')doUndo(a);
        else if(cl)press={r:cl.r,c:cl.c,x:inp.x,y:inp.y,t:0,done:false}}
      if(press&&mode==='edit'){
        if(inp.down){press.t+=dt;if(inp.x!=null){press.mx=inp.x;press.my=inp.y}
          if(!press.done&&press.t>.45&&lay[press.r*COLS+press.c]&&Math.hypot(press.mx-press.x,press.my-press.y)<S*.5){press.done=true;removeAt(press.r,press.c,a)}}
        else if(rel){var mx=press.mx!=null?press.mx:press.x,my=press.my!=null?press.my:press.y;
          if(!press.done){if(Math.hypot(mx-press.x,my-press.y)<S*.6)tapCell(press.r,press.c,a);
            else if(lay[press.r*COLS+press.c])removeAt(press.r,press.c,a)}
          press=null}}
      cur.r=Math.max(0,Math.min(ROWS-1,cur.r))}
    else if(mode==='run'){
      modeT+=dt;
      if(fresh){var h2=hitTray(inp.x,inp.y);
        if(h2&&h2.k==='run'){stopRun();a.beep(300,.08,'triangle')}
        else if(h2&&h2.k==='small'){speed=speed===1?3:1;a.beep(speed===3?880:520,.05,'square')}}
      if(mode==='run'){acc+=dt;var sd=stepDur(),guard=0;
        while(acc>=sd&&!sim.res&&guard<6){step(sim);handleEv(sim.ev,a);acc-=sd;guard++}
        if(sim.res){acc=0;if(sim.res==='win')onWin(a);else onFail(a)}}}
    else if(mode==='jam'){modeT+=dt;if(fresh&&modeT>.4)modeT=99;
      if(modeT>1.8){if(time<=0){time=0;a.over();prevDown=inp.down;return}stopRun()}}
    else if(mode==='clear'){modeT+=dt;if(modeT>1.7)load(lvN+1)}
    for(i=fx.length-1;i>=0;i--){fx[i].t+=dt;if(fx[i].t>(fx[i].k==='stars'?1.8:.5))fx.splice(i,1)}
    for(i in lay){var t=lay[i];if(t.pop)t.pop=Math.max(0,t.pop-dt*4);if(t.spin)t.spin=Math.max(0,t.spin-dt*6)}
    prevDown=inp.down}

  /* =================== 그리기 =================== */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function sym(g,col,x,y,s){ /* 색맹 배려: 색마다 모양 */
    g.beginPath();
    if(col==='r')g.arc(x,y,s,0,7);
    else if(col==='b'){g.moveTo(x,y-s*1.15);g.lineTo(x+s*1.1,y);g.lineTo(x,y+s*1.15);g.lineTo(x-s*1.1,y);g.closePath()}
    else if(col==='g'){g.moveTo(x,y-s*1.1);g.lineTo(x+s*1.15,y+s*.9);g.lineTo(x-s*1.15,y+s*.9);g.closePath()}
    else{for(var i=0;i<10;i++){var an=-Math.PI/2+i*Math.PI/5,q=i%2?s*.5:s*1.2;if(i)g.lineTo(x+Math.cos(an)*q,y+Math.sin(an)*q);else g.moveTo(x+Math.cos(an)*q,y+Math.sin(an)*q)}g.closePath()}
    g.fill()}
  function arrow(g,len,w){g.beginPath();g.moveTo(-len*.5,0);g.lineTo(len*.25,0);g.stroke();
    g.beginPath();g.moveTo(len*.5,0);g.lineTo(len*.12,-w);g.lineTo(len*.12,w);g.closePath();g.fill()}
  function ang(d){return (d-1)*Math.PI/2}

  function drawBG(g,t,dt){
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#f7d9a8');gr.addColorStop(.35,'#e9c48e');gr.addColorStop(1,'#b98f62');
    g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
    /* 뒤쪽 선반 (양옆 여백과 위쪽에 보인다) */
    var i,j,x,y;
    for(j=0;j<2;j++){x=j?W-38:2;
      g.fillStyle='rgba(120,80,48,.35)';g.fillRect(x,40,36,H-110);
      for(y=86;y<H-80;y+=64){g.fillStyle='#8a5a34';g.fillRect(x-2,y,40,5);
        for(i=0;i<3;i++){var h0=hash(j*50+y+i*7),bw=9+h0*6,bh=12+h0*14,bx=x+2+i*12;
          g.fillStyle=['#d9a066','#c48a52','#e6b67a','#b77b47'][Math.floor(h0*4)];g.fillRect(bx,y-bh,bw,bh);
          g.fillStyle='rgba(255,255,255,.25)';g.fillRect(bx+bw/2-1,y-bh,2,bh)}}}
    /* 지게차가 뒤쪽을 오간다 */
    fork.x+=fork.v*(dt||0);if(fork.x>W+50){fork.v=-26}if(fork.x<-50){fork.v=26}
    g.save();g.translate(fork.x,138);if(fork.v<0)g.scale(-1,1);g.globalAlpha=.55;
    g.fillStyle='#e8a33a';rr(g,-14,-12,22,12,3);g.fill();g.fillStyle='#55606e';g.fillRect(-6,-22,2,10);g.fillRect(4,-22,2,10);g.fillRect(-6,-23,12,2);
    g.fillStyle='#55606e';g.fillRect(10,-22,2,22);g.fillRect(10,-2,10,2);
    var lift=6+Math.sin(t*1.3)*5;g.fillStyle='#c48a52';g.fillRect(12,-8-lift,10,8);
    g.fillStyle='#333';g.beginPath();g.arc(-9,0,3.5,0,7);g.arc(4,0,3.5,0,7);g.fill();g.restore();g.globalAlpha=1;
    /* 떠다니는 먼지 */
    for(i=0;i<motes.length;i++){var p=motes[i],my=((p.y-t*p.v)%(H-60)+(H-60))%(H-60)+30,mx=p.x+Math.sin(t*.6+p.p)*10;
      g.fillStyle='rgba(255,250,220,'+(.25+.2*Math.sin(t*1.7+p.p))+')';g.beginPath();g.arc(mx,my,1.5,0,7);g.fill()}}

  function lampSway(i,t){return Math.sin(t*(.9+i*.17)+i*2)*.12}
  function drawLampsTop(g,t){
    for(var i=0;i<3;i++){var ax=70+i*110,sw=lampSway(i,t);g.save();g.translate(ax,34);g.rotate(sw);
      g.strokeStyle='#4a3a30';g.lineWidth=1.5;g.beginPath();g.moveTo(0,0);g.lineTo(0,88);g.stroke();
      g.fillStyle='#3f6d6a';g.beginPath();g.moveTo(-11,100);g.lineTo(11,100);g.lineTo(5,88);g.lineTo(-5,88);g.closePath();g.fill();
      g.fillStyle='#5f9a95';g.fillRect(-5,86,10,3);
      g.fillStyle='rgba(255,236,170,.95)';g.beginPath();g.ellipse(0,100,9,3,0,0,7);g.fill();
      var rg=g.createRadialGradient(0,102,2,0,102,22);rg.addColorStop(0,'rgba(255,240,180,.55)');rg.addColorStop(1,'rgba(255,240,180,0)');g.fillStyle=rg;g.beginPath();g.arc(0,102,22,0,7);g.fill();
      g.restore()}}
  function drawLampLight(g,t){
    g.save();g.globalCompositeOperation='lighter';
    for(var i=0;i<3;i++){var ax=70+i*110,sw=lampSway(i,t),lx=ax+Math.sin(sw)*330,ly=GY+190;
      var rg=g.createRadialGradient(lx,ly,10,lx,ly,130);rg.addColorStop(0,'rgba(255,230,160,.16)');rg.addColorStop(1,'rgba(255,230,160,0)');
      g.fillStyle=rg;g.fillRect(lx-130,ly-130,260,260)}
    g.restore()}

  function drawFloor(g,t){
    /* 바깥 테두리 (노랑-검정 안전띠) */
    g.fillStyle='rgba(60,40,25,.35)';rr(g,GX-6,GY-2,COLS*S+12,ROWS*S+12,8);g.fill();
    g.save();rr(g,GX-5,GY-5,COLS*S+10,ROWS*S+10,7);g.clip();g.fillStyle='#2f2a26';g.fillRect(GX-5,GY-5,COLS*S+10,ROWS*S+10);
    g.strokeStyle='#ffc93c';g.lineWidth=5;for(var k=-ROWS*S;k<COLS*S+ROWS*S;k+=14){g.beginPath();g.moveTo(GX-5+k,GY-5);g.lineTo(GX-5+k-ROWS*S-10,GY+ROWS*S+5);g.stroke()}
    g.restore();
    var fg=g.createLinearGradient(0,GY,0,GY+ROWS*S);fg.addColorStop(0,'#d8d2c6');fg.addColorStop(1,'#bfb6a6');g.fillStyle=fg;g.fillRect(GX,GY,COLS*S,ROWS*S);
    g.strokeStyle='rgba(90,80,70,.18)';g.lineWidth=1;
    for(var r=0;r<=ROWS;r++){g.beginPath();g.moveTo(GX,GY+r*S+.5);g.lineTo(GX+COLS*S,GY+r*S+.5);g.stroke()}
    for(var c=0;c<=COLS;c++){g.beginPath();g.moveTo(GX+c*S+.5,GY);g.lineTo(GX+c*S+.5,GY+ROWS*S);g.stroke()}
    for(r=0;r<ROWS;r++)for(c=0;c<COLS;c++){var h0=hash(r*13+c*7);if(h0>.7){g.fillStyle='rgba(120,105,90,.12)';g.beginPath();g.arc(GX+c*S+8+h0*28,GY+r*S+10+hash(h0)*26,2+h0*3,0,7);g.fill()}}}

  function plate(g,x,y,col,dk){ /* 칸 위에 올라온 판 (두께감) */
    g.fillStyle='rgba(0,0,0,.18)';rr(g,x-S/2+3,y-S/2+6,S-6,S-5,7);g.fill();
    g.fillStyle=dk;rr(g,x-S/2+3,y-S/2+3,S-6,S-5,7);g.fill();
    g.fillStyle=col;rr(g,x-S/2+3,y-S/2+2,S-6,S-9,7);g.fill()}
  function bolts(g,x,y){g.fillStyle='rgba(60,50,40,.55)';
    [[-15,-14],[15,-14],[-15,12],[15,12]].forEach(function(b){g.beginPath();g.arc(x+b[0],y+b[1],1.6,0,7);g.fill()})}
  function beltBody(g,x,y,d,t,spd,fixed){
    plate(g,x,y,fixed?'#6e6a66':'#77706a','#4c4743');
    g.save();g.translate(x,y-2);g.rotate(ang(d));
    g.fillStyle='#3a3633';rr(g,-S/2+5,-13,S-10,26,5);g.fill();
    g.save();rr(g,-S/2+5,-13,S-10,26,5);g.clip();
    var off=(t*spd*30)%12;g.strokeStyle='#ffd54a';g.lineWidth=3;g.lineCap='round';g.lineJoin='round';
    for(var k=-3;k<3;k++){var cx=k*12+off;g.globalAlpha=.85;g.beginPath();g.moveTo(cx-4,-7);g.lineTo(cx+2,0);g.lineTo(cx-4,7);g.stroke()}
    g.globalAlpha=1;g.restore();
    g.fillStyle='#9a948e';g.fillRect(-S/2+5,-15,S-10,3);g.fillRect(-S/2+5,12,S-10,3);
    var ro=(t*spd*30)%8;g.fillStyle='#d8d2ca';for(var k2=-3;k2<3;k2++){var rx=k2*8+ro;if(rx>-S/2+6&&rx<S/2-6){g.fillRect(rx,-15,2,3);g.fillRect(rx,12,2,3)}}
    g.restore()}
  function drawTile(g,t,x,y,idx,tm,running){
    var spd=running?(speed===3?3:1):.25,st=sim&&sim.ts[idx];
    var pop=t.pop||0,sc=1+pop*.25;
    g.save();g.translate(x,y);g.scale(sc,sc);g.translate(-x,-y);
    if(t.spin){g.translate(x,y);g.rotate(-t.spin*Math.PI/2);g.translate(-x,-y)}
    if(t.t==='x'){ /* 짐더미 */
      g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(x,y+16,19,6,0,0,7);g.fill();
      [[-9,4,18,16,'#c48a52'],[8,6,16,14,'#b77b47'],[-1,-9,20,15,'#d9a066']].forEach(function(b){
        g.fillStyle=b[4];g.fillRect(x+b[0]-b[2]/2,y+b[1]-b[3]/2,b[2],b[3]);g.strokeStyle='rgba(90,55,25,.6)';g.lineWidth=1.5;g.strokeRect(x+b[0]-b[2]/2,y+b[1]-b[3]/2,b[2],b[3]);
        g.beginPath();g.moveTo(x+b[0]-b[2]/2,y+b[1]-b[3]/2);g.lineTo(x+b[0]+b[2]/2,y+b[1]+b[3]/2);g.stroke()});
      g.restore();return}
    if(t.t==='b'){beltBody(g,x,y,t.d,tm,spd,t.fixed)}
    else if(t.t==='m'){beltBody(g,x,y,t.d,tm,spd,t.fixed);
      g.save();g.translate(x,y-2);g.rotate(ang(t.d));g.fillStyle='#ffb02e';g.strokeStyle='#a8641a';g.lineWidth=1.5;
      [-1,1].forEach(function(sd){g.beginPath();g.moveTo(-14,sd*16);g.lineTo(-2,sd*16);g.lineTo(-8,sd*7);g.closePath();g.fill();g.stroke()});
      g.fillStyle='#fff';g.font=FONT(10);g.textAlign='center';g.restore()}
    else if(t.t==='u'){beltBody(g,x,y,t.d,tm,spd*.0,t.fixed);
      var held=st&&st.held!==null;
      g.save();g.translate(x,y-2);g.rotate(ang(t.d));
      g.fillStyle=held?'#ff7a3d':'#ffa45c';g.strokeStyle='#8a3d12';g.lineWidth=2;rr(g,10,-16,6,32,2);g.fill();g.stroke();
      g.fillStyle='#8a3d12';g.beginPath();g.arc(13,-16,2.5,0,7);g.arc(13,16,2.5,0,7);g.fill();
      g.restore();
      g.fillStyle='rgba(255,255,255,.85)';g.font=FONT(9);g.textAlign='center';g.fillText(held?'■':'□',x,y-14)}
    else{ /* 원판 계열: 색 스위치, 토글, 카운터 */
      var base=t.t==='s'?PCOL[t.c]:t.t==='t'?'#a786e8':'#3fc1b0',dk=t.t==='s'?PDK[t.c]:t.t==='t'?'#6c4cb3':'#23887b';
      plate(g,x,y,t.fixed?'#8c8780':'#9a948c','#5e5a55');
      g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.arc(x,y,17,0,7);g.fill();
      g.fillStyle=dk;g.beginPath();g.arc(x,y-1,17,0,7);g.fill();
      g.fillStyle=base;g.beginPath();g.arc(x,y-3,16,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(x-5,y-10,7,4,-.4,0,7);g.fill();
      g.save();g.translate(x,y-3);
      if(t.t==='s'){g.rotate(ang(t.d));g.strokeStyle='#fff';g.fillStyle='#fff';g.lineWidth=4;g.lineCap='round';arrow(g,26,6);g.restore();
        g.fillStyle='rgba(0,0,0,.35)';sym(g,t.c,x,y-3,4.2)}
      else if(t.t==='t'){var outs=toggleOuts(t.d),cidx=st?st.idx:0;
        g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=3;g.lineCap='round';
        outs.forEach(function(o){g.beginPath();g.moveTo(0,0);g.lineTo(DX[o]*13,DY[o]*13);g.stroke()});
        var on=outs[cidx];g.rotate(ang(on));g.fillStyle='#fff';g.strokeStyle='#fff';g.lineWidth=4;arrow(g,24,6);
        g.restore();g.fillStyle='#4a2f86';g.beginPath();g.arc(x,y-3,3.5,0,7);g.fill();
        g.fillStyle='rgba(255,255,255,.9)';g.font=FONT(9);g.textAlign='center';
        /* 다음 차례 표시: 작은 점 두 개 */
        outs.forEach(function(o,oi){g.fillStyle=oi===cidx?'#fff':'rgba(255,255,255,.35)';g.beginPath();g.arc(x+DX[o]*19,y-3+DY[o]*19,2.6,0,7);g.fill()})}
      else{var cnt=st?st.cnt%3:0;g.rotate(ang(t.d));g.strokeStyle='#fff';g.fillStyle='#fff';g.lineWidth=3.5;g.lineCap='round';arrow(g,24,5.5);g.restore();
        for(var q=0;q<3;q++){var qa=Math.PI/2+(q-1)*.75+ang(t.d)+Math.PI;var qx=x+Math.cos(qa)*11,qy=y-3+Math.sin(qa)*11;
          g.fillStyle=q<cnt?'#fff':'rgba(0,60,55,.45)';g.beginPath();g.arc(qx,qy,2.8,0,7);g.fill()}
        g.fillStyle='#0f4d45';g.font=FONT(10);g.textAlign='center';g.fillText('3',x+DX[t.d]*-1,y+1)}}
    if(t.fixed&&t.t!=='b')bolts(g,x,y);
    g.restore()}

  function drawChute(g,ch,i,t){
    var x=cxp(ch.c),y=cyp(ch.r),rot=ch.d===2?0:ch.d===1?-Math.PI/2:Math.PI/2;
    g.save();g.translate(x,y);g.rotate(rot);
    g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.moveTo(-20,-18);g.lineTo(20,-18);g.lineTo(14,24);g.lineTo(-14,24);g.fill();
    g.fillStyle='#7d8a99';g.beginPath();g.moveTo(-21,-22);g.lineTo(21,-22);g.lineTo(13,20);g.lineTo(-13,20);g.closePath();g.fill();
    g.fillStyle='#5a6573';g.beginPath();g.moveTo(-13,20);g.lineTo(13,20);g.lineTo(11,23);g.lineTo(-11,23);g.fill();
    g.fillStyle='#a7b4c2';g.fillRect(-21,-22,42,5);
    g.fillStyle='#2b3138';g.beginPath();g.ellipse(0,17,11,3.5,0,0,7);g.fill();
    g.restore();
    if(L.chutes.length>1){g.fillStyle=i?'#7a5cff':'#ff7a3d';g.beginPath();g.arc(x+(ch.d===2?16:0),y+(ch.d===2?-14:-18),7,0,7);g.fill();
      g.fillStyle='#fff';g.font=FONT(10);g.textAlign='center';g.fillText(i?'B':'A',x+(ch.d===2?16:0),y+(ch.d===2?-10.5:-14.5))}}

  function drawManifest(g,a,t){
    var n=L.chutes.length,rowH=n>1?16:22,y0=n>1?70:72,i,j;
    g.fillStyle='rgba(255,252,240,.82)';rr(g,68,66,286,34,8);g.fill();g.strokeStyle='rgba(120,90,60,.4)';g.lineWidth=1.5;g.stroke();
    for(i=0;i<n;i++){var ch=L.chutes[i],y=y0+i*rowH+rowH/2-1,q=ch.q,taken=sim?sim.qi[i]:0,bs=n>1?13:19,gap=bs+3;
      var x=78;
      if(n>1){g.fillStyle=i?'#7a5cff':'#ff7a3d';g.beginPath();g.arc(x,y,6,0,7);g.fill();g.fillStyle='#fff';g.font=FONT(9);g.textAlign='center';g.fillText(i?'B':'A',x,y+3.2);x+=12}
      else{g.fillStyle='#7a6a5a';g.font=FONT(11);g.textAlign='left';g.fillText(a.lang==='ko'?'순서':'Queue',x-4,y+4);x+=30}
      var maxN=Math.floor((344-x)/gap);
      for(j=0;j<q.length&&j<maxN;j++){var bx=x+j*gap,used=j<taken;
        g.globalAlpha=used?.25:1;
        g.fillStyle=PDK[q[j]];rr(g,bx,y-bs/2+2,bs,bs,3);g.fill();g.fillStyle=PCOL[q[j]];rr(g,bx,y-bs/2,bs,bs-1,3);g.fill();
        g.fillStyle='rgba(255,245,215,.8)';g.fillRect(bx+bs/2-1,y-bs/2,2,bs*.45);
        g.fillStyle='rgba(0,0,0,.35)';sym(g,q[j],bx+bs/2,y+.5,bs*.18);
        if(j===taken&&mode!=='edit'){g.strokeStyle='#ff7a3d';g.lineWidth=1.5;rr(g,bx-1.5,y-bs/2-1.5,bs+3,bs+3,4);g.stroke()}
        g.globalAlpha=1}
      if(j<q.length){g.fillStyle='#7a6a5a';g.font=FONT(10);g.textAlign='left';g.fillText('+'+(q.length-j),x+j*gap,y+4)}}}

  function drawTruck(g,ti,t,a){
    var T=L.trucks[ti],v=truckV[ti],x=cxp(T.c),y=cyp(T.r),rot=T.side==='B'?0:T.side==='L'?Math.PI/2:-Math.PI/2;
    var load=sim?sim.load[ti]:0,hk=v.honk;
    g.save();g.translate(x,y);g.rotate(rot);g.translate(0,v.off+(T.side==='B'?-1:0));
    if(hk>0)g.translate(Math.sin(hk*40)*1.5,0);
    var bodyH=T.side==='B'?36:34;
    g.fillStyle='rgba(0,0,0,.22)';rr(g,-19,-16,40,bodyH+12,6);g.fill();
    /* 짐칸 (열린 뒤쪽이 컨베이어를 향한다) */
    g.fillStyle='#eef0f2';rr(g,-19,-20,38,bodyH-8,5);g.fill();
    g.fillStyle=PCOL[T.col];g.fillRect(-19,-6,38,7);
    g.fillStyle='#5b636e';g.fillRect(-15,-20,30,4);
    g.fillStyle='rgba(0,0,0,.5)';sym(g,T.col,0,-11,4);
    /* 운전석 */
    g.fillStyle=PDK[T.col];rr(g,-16,bodyH-28,32,14,5);g.fill();g.fillStyle='#bfe6ff';rr(g,-11,bodyH-20,22,5,2);g.fill();
    g.fillStyle='#2a2a2a';g.fillRect(-21,-12,4,9);g.fillRect(17,-12,4,9);g.fillRect(-21,bodyH-26,4,8);g.fillRect(17,bodyH-26,4,8);
    /* 적재 칸 표시 */
    for(var k=0;k<T.cap;k++){var px=-14+((k%5)*7),py=3+Math.floor(k/5)*6;g.fillStyle=k<load?PCOL[T.col]:'rgba(0,0,0,.18)';rr(g,px,py,5,4,1);g.fill()}
    g.restore();
    if(hk>0&&v.off<20){g.fillStyle='rgba(255,255,255,'+hk+')';g.font=FONT(12);g.textAlign='center'}}

  function drawParcel(g,x,y,col,dir,st,t,id,sc){
    /* st: 0 평소, 1 신남, 2 어지러움 */
    g.save();g.translate(x,y);g.scale(sc,sc);
    var bob=st===1?-Math.abs(Math.sin(t*14+id))*3:Math.sin(t*6+id)*.6;
    g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(0,11,13,4.5,0,0,7);g.fill();
    g.translate(0,bob);
    g.fillStyle=PDK[col];rr(g,-12,-9,24,20,4);g.fill();
    g.fillStyle=PCOL[col];rr(g,-12,-12,24,18,4);g.fill();
    g.fillStyle='rgba(255,255,255,.22)';rr(g,-10,-11,20,5,2);g.fill();
    g.fillStyle='rgba(255,240,200,.75)';g.fillRect(-2,-12,4,18);
    var ex=DX[dir]*2.2,ey=DY[dir]*1.6;
    if(st===2){g.strokeStyle='#3a2a20';g.lineWidth=1.6;[-5,5].forEach(function(e){g.beginPath();g.moveTo(e-2.5,-5.5);g.lineTo(e+2.5,-.5);g.moveTo(e+2.5,-5.5);g.lineTo(e-2.5,-.5);g.stroke()});
      g.beginPath();g.ellipse(0,3,2.2,1.6,0,0,7);g.stroke()}
    else if(st===1){g.strokeStyle='#3a2a20';g.lineWidth=1.8;g.lineCap='round';[-5,5].forEach(function(e){g.beginPath();g.arc(e,-2,2.6,3.5,5.9);g.stroke()});
      g.fillStyle='#b8323a';g.beginPath();g.arc(0,2.5,2.6,0,3.14);g.fill()}
    else{var blink=hash(id+Math.floor(t*.5))>.9&&(t*2%1)<.15;
      [-5,5].forEach(function(e){if(blink){g.strokeStyle='#3a2a20';g.lineWidth=1.5;g.beginPath();g.moveTo(e-2.5,-3);g.lineTo(e+2.5,-3);g.stroke()}
        else{g.fillStyle='#fff';g.beginPath();g.arc(e,-3,3.2,0,7);g.fill();g.fillStyle='#3a2a20';g.beginPath();g.arc(e+ex,-3+ey,1.7,0,7);g.fill()}});
      g.strokeStyle='#3a2a20';g.lineWidth=1.3;g.beginPath();g.arc(0,2,2,.3,2.84);g.stroke()}
    g.fillStyle='rgba(255,120,120,.35)';g.beginPath();g.arc(-8.5,1.5,2,0,7);g.arc(8.5,1.5,2,0,7);g.fill();
    g.fillStyle='rgba(0,0,0,.28)';sym(g,col,8,-8,1.8);
    g.restore()}

  function drawParcels(g,t){
    if(!sim)return;
    var sd=stepDur(),f=mode==='run'?Math.min(1,acc/sd):1,ease=f*f*(3-2*f),list=[],i,p;
    for(i=0;i<sim.parcels.length;i++){p=sim.parcels[i];
      if(p.st==='done'&&!(mode==='run'&&p.dStep===sim.step))continue;
      var e=ease,stt=0,sc=1;
      if(mode==='jam'&&jamInfo&&jamInfo.ids.indexOf(p.id)>=0){var cap=jamInfo.why==='crash'?(jamInfo.half?.38:.62):1,mt=modeT*6;e=Math.min(cap,mt)-(jamInfo.why==='crash'&&mt>cap?Math.max(0,Math.sin(Math.min(1,(mt-cap)/2)*Math.PI))*.12:0);stt=2}
      else if(mode==='jam'||mode==='clear')e=1;
      var x=cxp(p.pc)+(cxp(p.c)-cxp(p.pc))*e,y=cyp(p.pr)+(cyp(p.r)-cyp(p.pr))*e;
      if(p.st==='done'){stt=1;sc=1-Math.max(0,e-.55)*2}
      if(p.born===sim.step&&mode==='run'){sc*=.4+.6*ease}
      if(p.st==='held'){x+=0;y-=2}
      if(mode==='jam'&&jamInfo&&jamInfo.why==='fall'&&jamInfo.ids.indexOf(p.id)>=0){var ft=Math.max(0,modeT-.2);sc*=Math.max(0,1-ft*1.3);y+=ft*14}
      if(mode==='jam'&&jamInfo&&(jamInfo.why==='wrong'||jamInfo.why==='full')&&jamInfo.ids.indexOf(p.id)>=0){
        var bt=Math.min(1,modeT*2.5),bx=cxp(p.pc)-x,by=cyp(p.pr)-y;x+=bx*bt*.8;y+=by*bt*.8-Math.sin(bt*Math.PI)*16}
      list.push({x:x,y:y,p:p,st:stt,sc:sc})}
    list.sort(function(a,b){return a.y-b.y});
    list.forEach(function(o){drawParcel(g,o.x,o.y,o.p.col,o.p.dir,o.st,t,o.p.id,o.sc)})}

  function drawCat(g,a,t){
    var x=34,y=104,s=cat,ct=catT,bob=0,headTilt=0;
    if(s==='cheer')bob=-Math.abs(Math.sin(ct*10))*5;
    if(s==='nod'||s==='cheer')headTilt=Math.sin(ct*12)*.12;
    g.save();g.translate(x,y+bob);
    g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(0,2,22,5,0,0,7);g.fill();
    /* 몸 + 조끼 */
    g.fillStyle='#f3a24b';rr(g,-15,-30,30,32,12);g.fill();
    g.fillStyle='#ff8a1f';rr(g,-15,-24,30,14,4);g.fill();g.fillStyle='#fff3a0';g.fillRect(-15,-19,30,3);
    /* 꼬리 */
    g.strokeStyle='#e08a32';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(13,-6);g.quadraticCurveTo(26,-10+Math.sin(t*3)*4,22,-26);g.stroke();
    /* 클립보드 팔 */
    if(s!=='facepalm'&&s!=='cheer'){g.save();g.translate(-12,-14);g.rotate(-.2);g.fillStyle='#a87344';rr(g,-8,-12,14,18,2);g.fill();g.fillStyle='#fff';g.fillRect(-6,-9,10,13);
      g.fillStyle='#bbb';for(var l=0;l<3;l++)g.fillRect(-5,-7+l*4,8,1.2);g.fillStyle='#777';g.fillRect(-3,-13,6,3);g.restore();
      g.fillStyle='#f3a24b';g.beginPath();g.arc(-6,-12,4.5,0,7);g.fill()}
    if(s==='cheer'){g.strokeStyle='#f3a24b';g.lineWidth=6;g.beginPath();g.moveTo(-12,-22);g.lineTo(-20,-40-Math.sin(ct*10)*3);g.moveTo(12,-22);g.lineTo(20,-40+Math.sin(ct*10)*3);g.stroke()}
    /* 머리 */
    g.translate(0,-40);g.rotate(headTilt+(s==='watch'?.08:0));
    if(s==='nod')g.translate(0,Math.abs(Math.sin(ct*9))*3);
    g.fillStyle='#f3a24b';g.beginPath();g.moveTo(-15,-4);g.lineTo(-14,-20);g.lineTo(-5,-12);g.closePath();g.fill();
    g.beginPath();g.moveTo(15,-4);g.lineTo(14,-20);g.lineTo(5,-12);g.closePath();g.fill();
    g.fillStyle='#ffb3a0';g.beginPath();g.moveTo(-12,-8);g.lineTo(-12,-16);g.lineTo(-7,-11);g.fill();g.beginPath();g.moveTo(12,-8);g.lineTo(12,-16);g.lineTo(7,-11);g.fill();
    g.fillStyle='#f6ad5c';g.beginPath();g.ellipse(0,0,17,14,0,0,7);g.fill();
    g.fillStyle='#e08a32';g.fillRect(-2,-13,4,5);g.fillRect(-8,-12,3,4);g.fillRect(5,-12,3,4);
    /* 안전모 */
    g.fillStyle='#ffd23f';g.beginPath();g.arc(0,-9,13,Math.PI,0);g.fill();g.fillRect(-17,-10,34,4);
    g.fillStyle='#e8b520';g.fillRect(-2,-21,4,11);g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.arc(-5,-14,3,0,7);g.fill();
    /* 얼굴 */
    var blink=(t%3.4)<.12;g.strokeStyle='#3a2416';g.fillStyle='#3a2416';g.lineWidth=1.8;g.lineCap='round';
    var lx=s==='watch'?2:0,ly=s==='watch'?2:0;
    if(s==='facepalm'){g.beginPath();g.moveTo(-9,1);g.lineTo(-4,1);g.moveTo(4,1);g.lineTo(9,1);g.stroke();
      g.beginPath();g.arc(0,8,3,3.4,6);g.stroke()}
    else if(s==='cheer'||s==='nod'){g.beginPath();g.arc(-6,2,3,3.5,5.9);g.stroke();g.beginPath();g.arc(6,2,3,3.5,5.9);g.stroke();
      g.fillStyle='#c2413b';g.beginPath();g.arc(0,6.5,3.2,0,3.14);g.fill()}
    else{if(blink){g.beginPath();g.moveTo(-8,1);g.lineTo(-4,1);g.moveTo(4,1);g.lineTo(8,1);g.stroke()}
      else{g.fillStyle='#fff';g.beginPath();g.arc(-6,1,3.6,0,7);g.arc(6,1,3.6,0,7);g.fill();g.fillStyle='#3a2416';g.beginPath();g.arc(-6+lx,1+ly,2,0,7);g.arc(6+lx,1+ly,2,0,7);g.fill()}
      g.beginPath();g.moveTo(-2.5,6);g.quadraticCurveTo(0,8,2.5,6);g.stroke()}
    g.fillStyle='#ff8f8f';g.beginPath();g.arc(-11,6,2.4,0,7);g.arc(11,6,2.4,0,7);g.fill();
    g.strokeStyle='rgba(60,36,22,.5)';g.lineWidth=1;g.beginPath();g.moveTo(-17,4);g.lineTo(-24,3);g.moveTo(-17,7);g.lineTo(-24,8);g.moveTo(17,4);g.lineTo(24,3);g.moveTo(17,7);g.lineTo(24,8);g.stroke();
    if(s==='facepalm'){g.fillStyle='#f3a24b';g.beginPath();g.ellipse(-3,0,9,6,-.3,0,7);g.fill();g.fillStyle='#ffd0c0';g.beginPath();g.arc(-6,-1,1.6,0,7);g.arc(-2,-3,1.6,0,7);g.arc(2,-2,1.6,0,7);g.fill()}
    g.restore()}

  function drawBubble(g,a,t){
    if(!bub)return;var tx=tr(bub,a),x0=70,w=284,y0=38,h=24,fs=15;
    g.font=FONT(fs);while(g.measureText(tx).width>w-16&&fs>10){fs--;g.font=FONT(fs)}
    g.fillStyle='rgba(0,0,0,.15)';rr(g,x0+1,y0+2,w,h,10);g.fill();
    g.fillStyle='#fffdf5';rr(g,x0,y0,w,h,10);g.fill();
    g.beginPath();g.moveTo(x0+2,y0+h-8);g.lineTo(x0-8,y0+h+4);g.lineTo(x0+12,y0+h-2);g.fill();
    g.fillStyle=mode==='jam'?'#c8402f':mode==='clear'?'#2f8f4a':'#4a3626';g.textAlign='center';g.fillText(tx,x0+w/2,y0+h/2+fs*.36)}

  function drawTray(g,a,t){
    var keys=trayKeys(),i;
    g.fillStyle='rgba(70,48,30,.92)';rr(g,0,556,W,96,0);g.fill();
    g.fillStyle='#ffc93c';g.fillRect(0,556,W,3);
    for(i=0;i<keys.length;i++){var k=keys[i],bx=6+i*51,by=TY,on=i===sel&&mode==='edit',n=left(k);
      var shake=trayFlash>0&&on?Math.sin(trayFlash*30)*3:0;
      g.fillStyle=on?'#fff2c2':'#8a6646';rr(g,bx+shake,by-(on?3:0),48,66,9);g.fill();
      if(on){g.strokeStyle='#ff9a2e';g.lineWidth=2.5;g.stroke()}
      g.globalAlpha=n>0?1:.35;
      var tl=tileOf(k,1);g.save();g.translate(bx+24+shake,by+26-(on?3:0));g.scale(.78,.78);drawTile(g,tl,0,0,-1,t,false);g.restore();
      g.fillStyle=on?'#4a3626':'#fff4dc';g.font=FONT(13);g.textAlign='center';g.fillText('×'+n,bx+24+shake,by+60-(on?3:0));
      g.fillStyle=on?'rgba(74,54,38,.6)':'rgba(255,244,220,.55)';g.font=FONT(9);g.textAlign='left';g.fillText(String(i+1),bx+5+shake,by+11-(on?3:0));
      g.globalAlpha=1}
    /* 실행 / 멈춤 */
    var running=mode==='run',busy=mode==='jam'||mode==='clear';
    g.globalAlpha=busy?.5:1;
    g.fillStyle=running?'#b23a3a':'#7a2a10';rr(g,262,564,92,30,10);g.fill();
    g.fillStyle=running?'#e85a5a':'#ff7a3d';rr(g,262,560,92,30,10);g.fill();
    var pulse=mode==='edit'&&lvN===0&&Object.keys(lay).length>0?1+Math.sin(t*8)*.06:1;
    g.save();g.translate(308,580);g.scale(pulse,pulse);g.fillStyle='#fff';g.font=FONT(17);g.textAlign='center';g.fillText(tr(running?TXT.stop:TXT.run,a),0,0);g.restore();
    /* 되돌리기 / 속도 */
    g.fillStyle='#5a3e28';rr(g,262,601,50,34,9);g.fill();g.fillStyle='#a37a52';rr(g,262,598,50,34,9);g.fill();
    g.fillStyle='#fff';g.font=FONT(running?15:20);g.textAlign='center';g.fillText(running?(speed===3?'3x ⏩':'1x ▶'):'↶',287,running?620:622);
    g.globalAlpha=1}

  function drawFx(g,t,dt){
    fx.forEach(function(f){var k=f.t;
      if(f.k==='flash'){g.globalAlpha=Math.max(0,1-k*3);g.strokeStyle=f.c;g.lineWidth=3;g.beginPath();g.arc(f.x,f.y-3,17+k*40,0,7);g.stroke();g.globalAlpha=1}
      else if(f.k==='poof'){g.globalAlpha=Math.max(0,1-k*2);g.fillStyle='#efe6d8';for(var i=0;i<5;i++){var an=i*1.26;g.beginPath();g.arc(f.x+Math.cos(an)*k*40,f.y+Math.sin(an)*k*40,7*(1-k),0,7);g.fill()}g.globalAlpha=1}
      else if(f.k==='nope'){g.globalAlpha=Math.max(0,1-k*2);g.strokeStyle='#e04a3a';g.lineWidth=3;g.beginPath();g.arc(f.x,f.y,14,0,7);g.moveTo(f.x-9,f.y+9);g.lineTo(f.x+9,f.y-9);g.stroke();g.globalAlpha=1}
      else if(f.k==='stars'){for(var j=0;j<5;j++){var an2=t*5+j*1.257,sx=f.x+Math.cos(an2)*20,sy=f.y-22+Math.sin(an2)*6;
        g.fillStyle='rgba(90,60,20,.5)';sym(g,'y',sx+1,sy+1,5);g.fillStyle=j%2?'#ffe066':'#fff';sym(g,'y',sx,sy,5)}}})}

  function draw(g,a,dt){
    dt=dt||0;tG+=dt;var t=tG,i,ko=a.lang==='ko';
    drawBG(g,t,dt);
    if(!L)return;
    var running=mode==='run';
    /* 위쪽 띠 */
    g.fillStyle='#3b2b20';g.fillRect(0,0,W,32);g.fillStyle='#ffc93c';g.fillRect(0,32,W,2);
    drawLampsTop(g,t);
    var tw=Math.ceil(time),low=time<10&&mode==='edit';
    g.textAlign='center';g.font=FONT(13);g.fillStyle='#e8d2b4';g.fillText(tr(TXT.fac,a)+(lvN+1),W/2-34,21);
    g.font=FONT(low?18+Math.sin(t*12)*1.5:17);g.fillStyle=gainT>0?'#8cf09a':low?'#ff7a6a':(mode==='edit'?'#fff':'#bcd8ff');
    g.fillText('⏱'+tw,W/2+30,22);
    if(gainT>0){g.globalAlpha=Math.min(1,gainT);g.font=FONT(12);g.fillStyle='#8cf09a';g.fillText('+14s',W/2+30,46);g.globalAlpha=1}
    drawFloor(g,t);
    for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){var idx=r*COLS+c,tl=lay[idx]||L.grid[idx],x=cxp(c),y=cyp(r);
      if(!tl){if(mode==='edit'){g.strokeStyle='rgba(110,95,80,.28)';g.lineWidth=1.5;g.setLineDash([4,4]);rr(g,x-S/2+6,y-S/2+6,S-12,S-12,6);g.stroke();g.setLineDash([])}continue}
      drawTile(g,tl,x,y,idx,t,running);
      if(lay[idx]&&mode==='edit'){g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(x+S/2-8,y-S/2+8,3,0,7);g.fill();g.fillStyle='#ff9a2e';g.beginPath();g.arc(x+S/2-8,y-S/2+8,2,0,7);g.fill()}}
    /* 1단계 안내: 빈칸을 깜빡인다 */
    if(lvN===0&&mode==='edit'&&!Object.keys(lay).length){var hx=cxp(2),hy=cyp(4),pu=.5+.5*Math.sin(t*6);
      g.strokeStyle='rgba(255,140,40,'+(.5+pu*.5)+')';g.lineWidth=3;rr(g,hx-S/2+4,hy-S/2+4,S-8,S-8,8);g.stroke();
      g.fillStyle='#fff';g.strokeStyle='#4a3626';g.lineWidth=2;g.save();g.translate(hx+12,hy+14+pu*5);g.rotate(-.4);
      rr(g,-5,0,10,16,4);g.fill();g.stroke();g.beginPath();g.arc(0,0,5,Math.PI,0);g.fill();g.stroke();g.restore()}
    drawLampLight(g,t);
    L.chutes.forEach(function(ch,i){drawChute(g,ch,i,t)});
    for(i=0;i<L.trucks.length;i++)drawTruck(g,i,t,a);
    drawParcels(g,t);
    drawFx(g,t,dt);
    /* 키보드 커서 */
    if(kbOn&&mode==='edit'){var kx=cxp(cur.c),ky=cyp(cur.r),pp=Math.sin(t*8)*1.5;g.strokeStyle='#ff7a3d';g.lineWidth=3;
      rr(g,kx-S/2+1-pp,ky-S/2+1-pp,S-2+pp*2,S-2+pp*2,8);g.stroke()}
    if(press&&mode==='edit'&&press.t>.12&&lay[press.r*COLS+press.c]&&!press.done){var px=cxp(press.c),py=cyp(press.r);
      g.strokeStyle='#e04a3a';g.lineWidth=3;g.beginPath();g.arc(px,py,20,-Math.PI/2,-Math.PI/2+Math.min(1,(press.t-.12)/.33)*6.283);g.stroke()}
    drawManifest(g,a,t);
    drawCat(g,a,t);drawBubble(g,a,t);
    drawTray(g,a,t);
  }

  SG.run({id:'parcel-sort',title:{ko:'택배 분류소',en:'Parcel Sort'},
    how:{ko:'벨트와 스위치를 미리 깔고 ▶실행! 상자들이 같은 색 트럭에 들어가게 하세요. 부딪히거나 떨어지면 다시 고쳐요.',
         en:'Lay belts and switches, then press ▶ Run. Get every box into the truck of its colour. Crash or spill? Tweak and run again.'},
    init:init,update:update,draw:draw});
  window.__psState=function(){return {lv:lvN,mode:mode,time:time,lay:Object.keys(lay).length}};
  window.__psJump=function(n){load(n)};
})();
