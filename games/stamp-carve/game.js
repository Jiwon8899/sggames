/* 판화 도장 — 고무판을 파서 주문서 그림대로 찍는다. 찍으면 좌우가 뒤집힌다는 것이 핵심. */
(function(){
  'use strict';
  var FONT='Jua, system-ui, sans-serif';
  function F(n){return n+'px '+FONT}

  /* ================= 논리 (headless 검증 가능) ================= */
  function rng(seed){var s=(seed>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function grid(rows,ch){var N=rows.length,a=new Array(N*N);for(var y=0;y<N;y++)for(var x=0;x<N;x++)a[y*N+x]=rows[y][x]===ch?1:0;return a}
  function mirror(N,a){var b=new Array(N*N);for(var y=0;y<N;y++)for(var x=0;x<N;x++)b[y*N+x]=a[y*N+N-1-x];return b}
  function inv(a){return a.map(function(v){return v?0:1})}
  function same(a,b){for(var i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true}
  /* 블록 좌표 → 화면 좌표 (시계 방향 r번) */
  function fwd(N,x,y,r){for(var i=0;i<r;i++){var t=x;x=N-1-y;y=t}return [x,y]}
  /* 화면 좌표 → 블록 좌표 */
  function back(N,x,y,r){for(var i=0;i<r;i++){var t=y;y=N-1-x;x=t}return [x,y]}
  function rotGrid(N,a,r){var b=new Array(N*N);for(var y=0;y<N;y++)for(var x=0;x<N;x++){var p=fwd(N,x,y,r);b[p[1]*N+p[0]]=a[y*N+x]}return b}
  /* 화면에 보이는 판(파인 칸=1) → 찍힌 종이(잉크=1). 찍으면 좌우가 뒤집힌다. */
  function printOf(N,carvedDisp){var p=new Array(N*N);for(var y=0;y<N;y++)for(var x=0;x<N;x++)p[y*N+x]=carvedDisp[y*N+N-1-x]?0:1;return p}
  function display(N,carvedBlock,r){return rotGrid(N,carvedBlock,r)}
  /* 한 번의 칼질: 같은 행 또는 같은 열의 직선 */
  function segCells(N,x0,y0,x1,y1){var out=[],i;
    if(y0===y1){for(i=Math.min(x0,x1);i<=Math.max(x0,x1);i++)out.push(y0*N+i)}
    else if(x0===x1){for(i=Math.min(y0,y1);i<=Math.max(y0,y1);i++)out.push(i*N+x0)}
    return out}
  /* 최소 칼질 수: allowed(파도 되는 칸) 안의 직선으로 need(새로 팔 칸)를 모두 덮는 최소 개수.
     칸 = (가로 최대 구간, 세로 최대 구간) 간선 → 이분 매칭 최대 = 최소 정점 덮개 (쾨니그) */
  function minCover(N,allowed,need){var H=[],V=[],hId=[],vId=[],x,y,i;
    for(y=0;y<N;y++){x=0;while(x<N){if(!allowed[y*N+x]){x++;continue}var s=x;while(x<N&&allowed[y*N+x]){hId[y*N+x]=H.length;x++}H.push({x0:s,y0:y,x1:x-1,y1:y})}}
    for(x=0;x<N;x++){y=0;while(y<N){if(!allowed[y*N+x]){y++;continue}var s2=y;while(y<N&&allowed[y*N+x]){vId[y*N+x]=V.length;y++}V.push({x0:x,y0:s2,x1:x,y1:y-1})}}
    var adj=H.map(function(){return []}),hasL=H.map(function(){return false});
    for(i=0;i<N*N;i++)if(need[i]){if(!allowed[i])return null;adj[hId[i]].push(vId[i]);hasL[hId[i]]=true}
    var mR=V.map(function(){return -1}),mL=H.map(function(){return -1});
    function aug(u,seen){for(var k=0;k<adj[u].length;k++){var v=adj[u][k];if(seen[v])continue;seen[v]=1;
        if(mR[v]<0||aug(mR[v],seen)){mR[v]=u;mL[u]=v;return true}}return false}
    for(i=0;i<H.length;i++)if(hasL[i])aug(i,[]);
    var zL=[],zR=[],q=[];for(i=0;i<H.length;i++)if(hasL[i]&&mL[i]<0){zL[i]=1;q.push(i)}
    while(q.length){var u=q.shift();adj[u].forEach(function(v){if(zR[v]||mL[u]===v)return;zR[v]=1;var w=mR[v];if(w>=0&&!zL[w]){zL[w]=1;q.push(w)}})}
    var segs=[];for(i=0;i<H.length;i++)if(hasL[i]&&!zL[i])segs.push(H[i]);for(i=0;i<V.length;i++)if(zR[i])segs.push(V[i]);
    return segs}

  /* ---------- 디자인 ---------- */
  var HAND=[
    {mode:'normal',name:{ko:'화살표',en:'Arrow'},g:['...#...','...##..','...###.','#######','...###.','...##..','...#...']},
    {mode:'normal',name:{ko:'기역',en:'Giyeok ㄱ'},g:['.......','.#####.','.....#.','.....#.','.....#.','.....#.','.......']},
    {mode:'normal',name:{ko:'알',en:'R'},g:['.......','.####..','.#...#.','.####..','.#..#..','.#...#.','.......']},
    {mode:'neg',name:{ko:'물음표',en:'Question'},g:['........','..####..','.##..##.','.....##.','....##..','...##...','........','...##...']},
    {mode:'normal',name:{ko:'리을',en:'Rieul ㄹ'},g:['.......','.#####.','.....#.','.#####.','.#.....','.#####.','.......']},
    {mode:'rot',sol:1,name:{ko:'피',en:'P'},g:['.......','.####..','.#...#.','.####..','.#.....','.#.....','.......']},
    {mode:'two',name:{ko:'돛단배',en:'Sailboat'},g:['........','...r....','...rr...','...rrr..','...rrrr.','...r....','bbbbbbb.','.bbbbb..']},
    {mode:'neg',name:{ko:'엔',en:'N'},g:['.......','.#...#.','.##..#.','.#.#.#.','.#..##.','.#...#.','.......']},
    {mode:'rot',sol:3,name:{ko:'에프',en:'F'},g:['.......','.#####.','.#.....','.####..','.#.....','.#.....','.......']},
    {mode:'two',name:{ko:'깃발',en:'Flag'},g:['........','.brrrr..','.brrrrr.','.brrr...','.b......','.b......','.b......','bbb.....']}
  ];
  var GLYPH={
    S:['.......','..####.','.#.....','..###..','.....#.','.####..','.......'],
    Z:['.......','.#####.','....#..','...#...','..#....','.#####.','.......'],
    L:['.......','.#.....','.#.....','.#.....','.#.....','.####..','.......'],
    J:['.......','....#..','....#..','....#..','.#..#..','..##...','.......'],
    G:['.......','..###..','.#.....','.#.##..','.#..#..','..##...','.......'],
    K:['.......','.#..#..','.#.#...','.##....','.#.#...','.#..#..','.......'],
    'ㄴ':['.......','.#.....','.#.....','.#.....','.#.....','.#####.','.......'],
    'ㄷ':['.......','.#####.','.#.....','.#.....','.#.....','.#####.','.......'],
    'ㅋ':['.......','.#####.','.....#.','.#####.','.....#.','.....#.','.......'],
    'ㅓ':['.......','....#..','....#..','.####..','....#..','....#..','.......'],
    'ㅕ':['.......','....#..','.####..','....#..','.####..','....#..','.......'],
    '4':['.......','...##..','..#.#..','.#..#..','.#####.','....#..','.......'],
    '7':['.......','.#####.','.....#.','....#..','...#...','...#...','.......'],
    '2':['.......','..###..','.#...#.','....#..','..##...','.#####.','.......'],
    '3':['.......','.####..','.....#.','..###..','.....#.','.####..','.......'],
    boot:['.......','..##...','..##...','..##...','..####.','..####.','.......'],
    flag:['.......','.#.....','.###...','.####..','.#.....','.#.....','.......'],
    arrow:['.......','..####.','....##.','...#.#.','..#..#.','.#.....','.......']
  };
  var GNAME={boot:{ko:'장화',en:'Boot'},flag:{ko:'깃발',en:'Flag'},arrow:{ko:'화살표',en:'Arrow'}};
  function glyphName(k){return GNAME[k]||{ko:k,en:k}}
  function place(rows,N,ox,oy){var out=[];for(var y=0;y<N;y++){var s='';for(var x=0;x<N;x++){var gy=y-oy,gx=x-ox;s+=(gy>=0&&gy<rows.length&&gx>=0&&gx<rows.length)?rows[gy][gx]:'.'}out.push(s)}return out}
  function walkBlob(N,rnd,ch,base){var a=base?base.slice():[];for(var y=0;y<N;y++)a[y]=a[y]||'.'.repeat(N);
    var cells=a.map(function(r){return r.split('')}),x=1+Math.floor(rnd()*(N-2)),y2=1+Math.floor(rnd()*(N-2)),d=Math.floor(rnd()*4),len=4+Math.floor(rnd()*4),D=[[1,0],[0,1],[-1,0],[0,-1]],tries=0;
    while(len>0&&tries<60){tries++;if(cells[y2][x]==='.'){cells[y2][x]=ch;len--}
      if(rnd()<.35)d=(d+(rnd()<.5?1:3))%4;var nx=x+D[d][0],ny=y2+D[d][1];
      if(nx<0||ny<0||nx>=N||ny>=N||(cells[ny][nx]!=='.'&&cells[ny][nx]!==ch)){d=(d+1)%4;continue}x=nx;y2=ny}
    return cells.map(function(r){return r.join('')})}
  function genSpec(idx,rnd){var modes=['normal','neg','rot','two','normal','rot','neg','two','normal','two'];
    var mode=modes[(idx+Math.floor(rnd()*3))%modes.length],ks=Object.keys(GLYPH),k=ks[Math.floor(rnd()*ks.length)];
    var N=mode==='two'||rnd()<.5?8:7,rows=place(GLYPH[k],N,N===8?Math.floor(rnd()*2):0,N===8?Math.floor(rnd()*2):0);
    if(rnd()<.25&&mode!=='two'){rows=walkBlob(N,rnd,'#');rows=walkBlob(N,rnd,'#',rows);k=null}
    if(mode==='two'){rows=rows.map(function(r){return r.replace(/#/g,'r')});rows=walkBlob(N,rnd,'b',rows)}
    return {mode:mode,sol:1+Math.floor(rnd()*3),name:k?glyphName(k):{ko:'낙서',en:'Doodle'},g:rows}}
  function asym(N,t){return !same(t,mirror(N,t))}
  /* 레벨 하나를 만든다. 만들 수 없으면 null */
  function build(spec,idx,rnd){var g=spec.g,N=g.length,mode=spec.mode,lv={N:N,mode:mode,name:spec.name,idx:idx,blocks:[]};
    var targets;
    if(mode==='two'){targets=[grid(g,'r'),grid(g,'b')];lv.inks=['#d8433a','#2f6db3']}
    else{lv.design=grid(g,'#');targets=[mode==='neg'?inv(lv.design):lv.design];lv.inks=['#2b2233']}
    lv.targets=targets;
    var anyAsym=targets.some(function(t){return asym(N,t)});if(!anyAsym)return null;
    var total=0,slack=idx<3?3:idx<7?2:(mode==='two'?2:1);
    for(var k=0;k<targets.length;k++){var t=targets[k],raisedD=mirror(N,t),carveD=inv(raisedD),b={pre:null,old:null};
      if(t.every(function(v){return v===0})||t.every(function(v){return v===1}))return null;
      lv.sol=0;var need=carveD.slice();
      if(mode==='rot'){var s=spec.sol||1,Bc=rotGrid(N,carveD,(4-s)%4);
        var pre=chooseCuts(N,Bc,carveD,s,rnd);if(!pre)return null;b.pre=pre;lv.sol=s;
        var preD=rotGrid(N,pre,s);for(var i=0;i<N*N;i++)if(preD[i])need[i]=0}
      var segs=minCover(N,carveD,need);if(!segs)return null;
      b.solution=segs;b.min=segs.length;total+=segs.length;lv.blocks.push(b)}
    lv.min=total;lv.budget=total+slack;return lv}
  /* 헌 블록의 옛 홈: 정답 방향 s에서만(또는 대칭 방향에서만) 들어맞도록 고른다 */
  function chooseCuts(N,Bc,carveD,s,rnd){var cand=[],i,r;for(i=0;i<N*N;i++)if(Bc[i])cand.push(i);
    for(i=cand.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),t=cand[i];cand[i]=cand[j];cand[j]=t}
    function fits(c,r){var x=c%N,y=(c/N)|0,p=fwd(N,x,y,r);return carveD[p[1]*N+p[0]]===1}
    var kill=[];for(r=0;r<4;r++)if(!same(rotGrid(N,Bc,r),carveD))kill.push(r);
    if(kill.indexOf(0)<0)return null;
    var pre=new Array(N*N).fill(0),cnt=0;
    while(kill.length){var best=-1,bk=0;cand.forEach(function(c){if(pre[c])return;var n=kill.filter(function(r){return !fits(c,r)}).length;if(n>bk){bk=n;best=c}});
      if(best<0)return null;pre[best]=1;cnt++;kill=kill.filter(function(r){return fits(best,r)})}
    var extra=2+Math.floor(rnd()*2);for(i=0;i<cand.length&&extra>0;i++)if(!pre[cand[i]]){pre[cand[i]]=1;extra--;cnt++}
    return pre}
  function levelFor(idx,seed){if(idx<HAND.length)return build(HAND[idx],idx,rng(1000+idx));
    var rnd=rng(seed*7919+idx*104729+13);for(var tr=0;tr<200;tr++){var lv=build(genSpec(idx,rnd),idx,rnd);if(lv&&lv.min<=(lv.mode==='two'?22:14)&&lv.min>=4)return lv}
    return build(HAND[idx%HAND.length],idx,rng(idx))}
  /* 상태 판정 */
  function newCarve(lv){return lv.blocks.map(function(b){return b.pre?b.pre.slice():new Array(lv.N*lv.N).fill(0)})}
  function prints(lv,carved,rot){return carved.map(function(c){return printOf(lv.N,display(lv.N,c,rot))})}
  function matches(lv,carved,rot){var p=prints(lv,carved,rot);return p.every(function(pp,k){return same(pp,lv.targets[k])})}
  /* 화면 좌표의 칼질을 적용한다. 새로 판 칸 수를 돌려준다 */
  function carveSeg(lv,carved,k,rot,seg){var N=lv.N,cells=segCells(N,seg.x0,seg.y0,seg.x1,seg.y1),n=0;
    cells.forEach(function(c){var p=back(N,c%N,(c/N)|0,rot),i=p[1]*N+p[0];if(!carved[k][i]){carved[k][i]=1;n++}});return n}

  /* ================= 게임 상태 ================= */
  var lv,carved,rot,rotAnim,cur,used,undo,phase,pt,level,time,seed,T,blink,mood,moodT,say,sayT,drag,kStroke,kb,prevDown,
      cardCv,printCv,mism,stampOK,tries,lastTick,motes,prints0,active,lastUpd,enter,btnFl,firstNeg,firstRot,firstTwo,hint,strokeFl;
  var KQ=[],ptrTap=false,resMsg=null;
  var IK=['#2b2233','#d8433a','#2f6db3'];
  function L(a,ko,en){return a.lang==='ko'?ko:en}

  function geom(){var N=lv.N,cs=Math.floor(264/N),w=cs*N,y0=lv.mode==='two'?256:248;return {N:N,cs:cs,x:180-w/2,y:y0+(270-w)/2,w:w}}
  var BTN={undo:{x:14,y:538,w:82,h:46},mid:{x:104,y:538,w:84,h:46},stamp:{x:196,y:538,w:110,h:46}};
  function inR(p,r){return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h}

  function setup(a){lv=levelFor(level,seed);carved=newCarve(lv);rot=0;rotAnim=0;cur={k:0,x:Math.floor(lv.N/2),y:Math.floor(lv.N/2)};
    used=0;undo=[];phase='carve';pt=0;drag=null;kStroke=null;mism=null;tries=0;enter=1;strokeFl=0;
    cardCv=null;printCv=null;
    hint=null;
    if(level===0)hint=['찍으면 좌우가 뒤집혀요! 거울처럼 파 보세요','Prints come out mirrored. Carve it flipped!'];
    else if(lv.mode==='neg'&&!firstNeg){firstNeg=1;hint=['반전 인쇄: 그림 부분을 파내요','Negative: carve out the picture itself']}
    else if(lv.mode==='rot'&&!firstRot){firstRot=1;hint=['헌 판! 돌려서 옛 홈이 맞는 방향을 찾아요','Old block! Rotate it until the old cuts fit']}
    else if(lv.mode==='two'&&!firstTwo){firstTwo=1;hint=['빨강 판과 파랑 판을 따로 파요','Carve a red block and a blue block']}}

  function snapshot(){undo.push({c:carved.map(function(c){return c.slice()}),u:used})}
  function commit(a,k,x0,y0,x1,y1){var N=lv.N,G=geom();
    var test=carved.map(function(c){return c.slice()}),n=carveSeg(lv,test,k,rot,{x0:x0,y0:y0,x1:x1,y1:y1});
    if(n===0)return;
    if(used>=lv.budget){a.beep(150,.18,'sawtooth');a.shake(5);strokeFl=1;a.pop(180,G.y-8,L(a,'칼질이 모자라요! 되돌리기','Out of strokes! Undo'),'#ffd2c0');setMood('sad',.8);return}
    snapshot();carved=test;used++;
    var cells=segCells(N,x0,y0,x1,y1);
    cells.forEach(function(c,i){if(i%2===0||cells.length<3)a.burst(G.x+(c%N+.5)*G.cs,G.y+(((c/N)|0)+.5)*G.cs,i%3?'#f2c6a0':'#e98b6e',3)});
    for(var i=0;i<Math.min(4,cells.length);i++)(function(i){setTimeout(function(){a.beep(1300+Math.random()*500,.035,'triangle')},i*35)})(i);
    a.beep(420,.05,'sawtooth')}
  function doUndo(a){if(!undo.length){a.beep(200,.08,'sine');return}var s=undo.pop();carved=s.c;used=s.u;a.beep(520,.06,'sine');a.beep(390,.08,'sine')}
  function doRot(a){rot=(rot+1)%4;rotAnim=1;a.beep(300,.08,'triangle');a.beep(200,.12,'sine')}
  function doSwitch(a){cur.k=(cur.k+1)%2;a.beep(640,.05,'triangle');a.beep(800,.05,'triangle')}
  function doStamp(a){if(phase!=='carve')return;drag=null;kStroke=null;phase='stamp';pt=0;tries++;
    var P=prints(lv,carved,rot);prints0=P;stampOK=P.every(function(pp,k){return same(pp,lv.targets[k])});
    mism=[];var N=lv.N;for(var i=0;i<N*N;i++){var bad=false;for(var k=0;k<P.length;k++)if(P[k][i]!==lv.targets[k][i])bad=true;if(bad)mism.push(i)}
    printCv=null;a.beep(330,.08,'triangle')}
  function setMood(m,t){mood=m;moodT=t}

  function pressDur(){return 1.05}
  function stampDur(){return pressDur()*lv.blocks.length+.15}

  function finishStamp(a){var G=geom();
    if(stampOK){var left=lv.budget-used,first=tries===1,pts=10+left*3+(first?5:0)+Math.min(10,level);a.add(pts);
      var bonus=Math.round(Math.min(26,7+lv.min*1.3));time=Math.min(99,time+bonus);
      a.sfx('win');a.burst(180,G.y+G.w/2,'#ffd76a',18);a.burst(270,120,'#ff9a7a',10);
      a.pop(180,G.y+G.w/2-10,(first?L(a,'한 번에! ','First try! '):'')+'+'+pts,'#fff2b0');a.pop(270,214,'+'+bonus+L(a,'초','s'),'#c8f7c0');
      setMood('happy',1.6);say=L(a,['딱 이거예요!','완벽해요!','최고의 도장!'][level%3],['Exactly this!','Perfect!','Lovely print!'][level%3]);sayT=2}
    else{time=Math.max(.5,time-3);a.sfx('hit');a.shake(6);a.pop(180,G.y+G.w/2,L(a,'다시! -3초','Not quite! -3s'),'#ffc0b0');
      var mir=prints0.every(function(pp,k){return same(mirror(lv.N,pp),lv.targets[k])});
      setMood('sad',1.5);say=mir?L(a,'좌우가 뒤집혔어요!','It came out mirrored!'):L(a,'조금 달라요…','Not quite right…');sayT=2.2}
    phase='result';pt=0}

  /* ================= 입력 ================= */
  if(typeof window!=='undefined'&&!window.__stampCarveKeys){window.__stampCarveKeys=1;
    var KEYS={ArrowLeft:1,ArrowRight:1,ArrowUp:1,ArrowDown:1,KeyA:1,KeyD:1,KeyW:1,KeyS:1,Space:1,Enter:1,KeyX:1,KeyZ:1,Backspace:1,KeyR:1,KeyE:1,KeyQ:1,Tab:1};
    window.addEventListener('keydown',function(e){if(!KEYS[e.code]||performance.now()-lastUpd>300)return;e.preventDefault();if(KQ.length<24)KQ.push({d:1,c:e.code,r:e.repeat})});
    window.addEventListener('pointerdown',function(e){if(e.target&&e.target.tagName==='CANVAS')ptrTap=true},true);
    window.addEventListener('keyup',function(e){if(!KEYS[e.code]||performance.now()-lastUpd>300)return;if(KQ.length<24)KQ.push({d:0,c:e.code})})}
  var DIR={ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]};
  function keys(a){while(KQ.length){var e=KQ.shift();kb=true;
      if(phase==='result'&&e.d&&!e.r&&(e.c==='Space'||e.c==='Enter'||e.c==='KeyX')){pt=Math.max(pt,9);continue}
      if(phase!=='carve')continue;
      var N=lv.N;
      if(DIR[e.c]&&e.d){var d=DIR[e.c];
        if(kStroke){if(!kStroke.ax)kStroke.ax=d[0]?'x':'y';if((kStroke.ax==='x')!==(d[0]!==0))continue}
        cur.x=Math.max(0,Math.min(N-1,cur.x+d[0]));cur.y=Math.max(0,Math.min(N-1,cur.y+d[1]));a.beep(900,.015,'sine')}
      else if(e.c==='Space'){if(e.d&&!e.r&&!kStroke)kStroke={x0:cur.x,y0:cur.y,ax:null};
        else if(!e.d&&kStroke){commit(a,cur.k,kStroke.x0,kStroke.y0,cur.x,cur.y);kStroke=null}}
      else if(!e.d||e.r)continue;
      else if(e.c==='Enter'||e.c==='KeyX'){if(kStroke){commit(a,cur.k,kStroke.x0,kStroke.y0,cur.x,cur.y);kStroke=null}doStamp(a)}
      else if(e.c==='KeyZ'||e.c==='Backspace'){kStroke=null;doUndo(a)}
      else if((e.c==='KeyR'||e.c==='KeyE')&&lv.mode==='rot'){kStroke=null;doRot(a)}
      else if((e.c==='KeyQ'||e.c==='Tab')&&lv.mode==='two'){kStroke=null;doSwitch(a)}}}
  function cellAt(G,x,y,clamp){var cx=Math.floor((x-G.x)/G.cs),cy=Math.floor((y-G.y)/G.cs);
    if(!clamp&&(cx<0||cy<0||cx>=G.N||cy>=G.N))return null;return {x:Math.max(0,Math.min(G.N-1,cx)),y:Math.max(0,Math.min(G.N-1,cy))}}
  function dragEnd(d){var dx=d.x1-d.x0,dy=d.y1-d.y0;return Math.abs(dx)>=Math.abs(dy)?{x:d.x1,y:d.y0}:{x:d.x0,y:d.y1}}
  function pointer(inp,a){var start=ptrTap&&inp.x!=null,end=!inp.down&&(prevDown||start);ptrTap=false;prevDown=inp.down;
    if(start)kb=false;
    if(phase==='result'&&start){pt=Math.max(pt,9);return}
    if(phase!=='carve'){drag=null;return}
    var G=geom(),p={x:inp.x,y:inp.y};
    if(start){var c=cellAt(G,p.x,p.y,false);
      if(c){drag={x0:c.x,y0:c.y,x1:c.x,y1:c.y};kStroke=null;cur.x=c.x;cur.y=c.y}
      else if(inR(p,BTN.undo)){btnFl.undo=.2;doUndo(a)}
      else if(inR(p,BTN.stamp)){btnFl.stamp=.2;doStamp(a)}
      else if(inR(p,BTN.mid)&&(lv.mode==='rot'||lv.mode==='two')){btnFl.mid=.2;lv.mode==='rot'?doRot(a):doSwitch(a)}
      else if(lv.mode==='two'&&p.y>=226&&p.y<=252){var k=p.x<180?0:1;if(k!==cur.k)doSwitch(a)}}
    else if(drag&&inp.down&&inp.x!=null){var c2=cellAt(G,p.x,p.y,true);if(c2.x!==drag.x1||c2.y!==drag.y1){drag.x1=c2.x;drag.y1=c2.y;a.beep(1500,.012,'sine')}}
    if(end&&drag){var e2=dragEnd(drag);commit(a,cur.k,drag.x0,drag.y0,e2.x,e2.y);cur.x=e2.x;cur.y=e2.y;drag=null}}

  /* ================= 그리기 도우미 ================= */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function mk(w,h){var c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c}
  /* 잉크 한 층: 살짝 번진 가장자리와 하얀 얼룩(잉크 결) */
  function inkLayer(N,cs,gr,col,seed,rough){var W=N*cs,c=mk(W,W),g=c.getContext('2d'),r=rng(seed),x,y;g.fillStyle=col;
    for(y=0;y<N;y++)for(x=0;x<N;x++)if(gr[y*N+x]){var j=rough?1.3:.2;g.fillRect(x*cs-r()*j,y*cs-r()*j,cs+r()*j*2+.5,cs+r()*j*2+.5)}
    if(rough){g.globalCompositeOperation='destination-out';var n=Math.floor(W*W/28);
      for(var k=0;k<n;k++){g.globalAlpha=.08+r()*.45;g.beginPath();g.arc(r()*W,r()*W,.4+r()*1.5,0,7);g.fill()}
      g.globalAlpha=.25;for(k=0;k<14;k++){g.beginPath();g.ellipse(r()*W,r()*W,3+r()*10,1+r()*2,r()*3,0,7);g.fill()}
      g.globalCompositeOperation='source-over';g.globalAlpha=1}
    return c}
  function composite(N,cs,layers,cols,seed,rough){var W=N*cs,c=mk(W,W),g=c.getContext('2d');
    layers.forEach(function(L2,k){if(!L2)return;g.globalCompositeOperation=k?'multiply':'source-over';g.globalAlpha=rough?.93:1;g.drawImage(inkLayer(N,cs,L2,cols[k],seed+k*31,rough),0,0)});
    g.globalCompositeOperation='source-over';g.globalAlpha=1;return c}
  var paperC=null;
  function paperTex(){if(paperC)return paperC;var c=mk(300,300),g=c.getContext('2d'),r=rng(77);g.fillStyle='#fbf3e2';g.fillRect(0,0,300,300);
    for(var i=0;i<900;i++){g.fillStyle=r()<.5?'rgba(160,120,70,.06)':'rgba(255,255,255,.35)';g.fillRect(r()*300,r()*300,1+r()*2,1)}
    paperC=c;return c}
  var woodC=null;
  function woodTex(){if(woodC)return woodC;var c=mk(360,440),g=c.getContext('2d'),r=rng(9);
    var gr=g.createLinearGradient(0,0,0,440);gr.addColorStop(0,'#b97c4b');gr.addColorStop(1,'#8c5631');g.fillStyle=gr;g.fillRect(0,0,360,440);
    for(var i=0;i<70;i++){var y=r()*440;g.strokeStyle=r()<.5?'rgba(80,40,15,.14)':'rgba(255,215,160,.10)';g.lineWidth=.6+r()*1.6;g.beginPath();g.moveTo(-10,y);
      for(var x=0;x<=380;x+=40)g.lineTo(x,y+Math.sin(x*.02+i)*3+r()*2);g.stroke()}
    for(i=0;i<5;i++){var kx=r()*360,ky=r()*440;g.strokeStyle='rgba(70,35,12,.18)';g.lineWidth=1;for(var k=1;k<5;k++){g.beginPath();g.ellipse(kx,ky,k*5,k*2.2,0,0,7);g.stroke()}}
    for(i=0;i<5;i++){g.fillStyle='rgba(40,30,50,'+(.05+r()*.06)+')';g.beginPath();g.ellipse(r()*360,r()*440,6+r()*16,4+r()*8,r()*3,0,7);g.fill()}
    woodC=c;return c}

  /* 고무판 그리기. disp: 화면 기준 파인 칸, old: 옛 홈(화면 기준) */
  function drawBlock(g,G,disp,old,ink,opt){var N=G.N,cs=G.cs,x0=G.x,y0=G.y,w=G.w,i,x,y;opt=opt||{};
    /* 나무 받침 */
    g.fillStyle='rgba(40,20,10,.35)';rr(g,x0-10,y0-6,w+24,w+26,10);g.fill();
    g.fillStyle='#7a4a28';rr(g,x0-10,y0-10,w+20,w+24,9);g.fill();
    g.fillStyle='#a8703f';rr(g,x0-10,y0-10,w+20,w+16,9);g.fill();
    g.fillStyle=ink;g.globalAlpha=.85;rr(g,x0-10,y0+w+6,w+20,6,3);g.fill();g.globalAlpha=1;
    /* 고무 면 */
    g.fillStyle='#e8937a';g.fillRect(x0,y0,w,w);
    var hg=g.createLinearGradient(x0,y0,x0+w,y0+w);hg.addColorStop(0,'rgba(255,230,210,.35)');hg.addColorStop(1,'rgba(120,40,30,.12)');g.fillStyle=hg;g.fillRect(x0,y0,w,w);
    function C(x,y){return x>=0&&y>=0&&x<N&&y<N&&disp[y*N+x]}
    for(y=0;y<N;y++)for(x=0;x<N;x++){var px=x0+x*cs,py=y0+y*cs;
      if(disp[y*N+x]){g.fillStyle=old&&old[y*N+x]?'#8f7a6c':'#b35f49';g.fillRect(px,py,cs,cs);
        /* 칼자국 */
        g.strokeStyle=old&&old[y*N+x]?'rgba(70,40,30,.25)':'rgba(120,45,30,.35)';g.lineWidth=1;
        var hor=(C(x-1,y)||C(x+1,y))&&!(C(x,y-1)||C(x,y+1));
        for(var s=1;s<4;s++){g.beginPath();if(hor){g.moveTo(px,py+s*cs/4);g.lineTo(px+cs,py+s*cs/4+((x+s)%2?1:-1))}else{g.moveTo(px+s*cs/4,py);g.lineTo(px+s*cs/4+((y+s)%2?1:-1),py+cs)}g.stroke()}
        /* 벽 그림자/빛 */
        var sh=Math.max(3,cs*.16);
        if(!C(x,y-1)){g.fillStyle='rgba(70,20,10,.45)';g.fillRect(px,py,cs,sh)}
        if(!C(x-1,y)){g.fillStyle='rgba(70,20,10,.32)';g.fillRect(px,py,sh,cs)}
        if(!C(x,y+1)){g.fillStyle='rgba(255,210,180,.35)';g.fillRect(px,py+cs-2,cs,2)}
        if(!C(x+1,y)){g.fillStyle='rgba(255,210,180,.25)';g.fillRect(px+cs-2,py,2,cs)}
        if(old&&old[y*N+x]){g.fillStyle='rgba(255,240,220,.18)';g.beginPath();g.arc(px+cs*.3,py+cs*.65,1.2,0,7);g.arc(px+cs*.7,py+cs*.4,1,0,7);g.fill()}}
      else if(opt.inked){g.fillStyle=ink;g.globalAlpha=.55;g.fillRect(px+.5,py+.5,cs-1,cs-1);g.globalAlpha=1}}
    /* 연필 격자 */
    g.strokeStyle='rgba(90,40,30,.16)';g.lineWidth=1;g.beginPath();
    for(i=1;i<N;i++){g.moveTo(x0+i*cs+.5,y0);g.lineTo(x0+i*cs+.5,y0+w);g.moveTo(x0,y0+i*cs+.5);g.lineTo(x0+w,y0+i*cs+.5)}g.stroke();
    g.strokeStyle='rgba(80,30,20,.5)';g.lineWidth=1.5;g.strokeRect(x0+.5,y0+.5,w-1,w-1)}
  function drawBack(g,G,ink){var x0=G.x,y0=G.y,w=G.w;
    g.fillStyle='#8a5530';rr(g,x0-10,y0-10,w+20,w+24,9);g.fill();
    var wg=g.createLinearGradient(x0,y0,x0+w,y0);wg.addColorStop(0,'#c08850');wg.addColorStop(.5,'#d59c62');wg.addColorStop(1,'#b47c46');g.fillStyle=wg;rr(g,x0-10,y0-10,w+20,w+16,9);g.fill();
    g.strokeStyle='rgba(90,45,15,.25)';g.lineWidth=1.2;for(var i=0;i<9;i++){g.beginPath();g.moveTo(x0-6,y0+i*w/8);g.bezierCurveTo(x0+w*.3,y0+i*w/8+8,x0+w*.6,y0+i*w/8-8,x0+w+6,y0+i*w/8);g.stroke()}
    g.fillStyle='rgba(60,30,10,.3)';g.beginPath();g.ellipse(180,y0+w/2+6,30,30,0,0,7);g.fill();
    var kg=g.createRadialGradient(170,y0+w/2-10,4,180,y0+w/2,30);kg.addColorStop(0,'#f0c48a');kg.addColorStop(1,'#9a6034');g.fillStyle=kg;g.beginPath();g.arc(180,y0+w/2,28,0,7);g.fill();
    g.fillStyle=ink;g.globalAlpha=.85;rr(g,x0-10,y0+w+6,w+20,6,3);g.fill();g.globalAlpha=1}

  function drawCard(g,a){var x=140,y=48,w=208,h=152,N=lv.N;
    g.save();g.translate(x+w/2,y+h/2);g.rotate(-.025);g.translate(-x-w/2,-y-h/2);
    g.fillStyle='rgba(50,25,10,.3)';rr(g,x+3,y+5,w,h,6);g.fill();
    g.drawImage(paperTex(),0,0,w,h,x,y,w,h);g.strokeStyle='rgba(150,110,60,.4)';g.lineWidth=1;rr(g,x+.5,y+.5,w-1,h-1,6);g.stroke();
    g.fillStyle='#d8433a';g.beginPath();g.arc(x+w/2,y+6,5,0,7);g.fill();g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.arc(x+w/2-1.5,y+4.5,1.6,0,7);g.fill();
    var cs=Math.floor(118/N),dw=cs*N,dx=x+10+(118-dw)/2,dy=y+22+(118-dw)/2;
    if(!cardCv){if(lv.mode==='neg')cardCv=composite(N,cs,[lv.design],['#6c6378'],5,false);else cardCv=composite(N,cs,lv.targets,lv.inks,5,false)}
    g.fillStyle='rgba(255,255,255,.8)';g.fillRect(dx-3,dy-3,dw+6,dw+6);g.strokeStyle='rgba(120,90,60,.35)';g.strokeRect(dx-3.5,dy-3.5,dw+7,dw+7);
    g.drawImage(cardCv,dx,dy);
    if(lv.mode==='neg'){g.save();g.beginPath();g.rect(dx,dy,dw,dw);g.clip();g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1;for(var i=-dw;i<dw;i+=5){g.beginPath();g.moveTo(dx+i,dy+dw);g.lineTo(dx+i+dw,dy);g.stroke()}g.restore()}
    g.font=F(13);g.textAlign='left';g.textBaseline='middle';g.fillStyle='#7a5a40';
    g.fillText(L(a,'주문 '+(level+1),'Order '+(level+1)),x+10,y+13);
    var tx=x+136,ty=y+30;g.font=F(14);g.fillStyle='#3a2a20';
    var nm=lv.name[a.lang];g.font=F(nm.length>6?12:14);g.fillText(nm,tx,ty);
    function tag(t,c,yy){g.font=F(t.length>8?10:12);var tw=Math.min(70,g.measureText(t).width+10);g.fillStyle=c;rr(g,tx-2,yy-9,tw,18,9);g.fill();g.fillStyle='#fff';g.fillText(t,tx+3,yy+.5)}
    var ty2=ty+24;
    if(lv.mode!=='neg')tag(L(a,'이대로 인쇄','Print this'),'#8a7a6a',ty2);
    if(lv.mode==='neg'){tag(L(a,'반전 인쇄','Negative'),'#3a3048',ty2);ty2-=24;
      /* 반전 아이콘: 그림=흰색, 배경=잉크 */
      g.fillStyle='#2b2233';g.fillRect(tx,ty2+40,22,22);g.fillStyle='#fbf3e2';g.fillRect(tx+7,ty2+46,8,10);
      g.fillStyle='#6c6378';g.font=F(11);g.fillText(L(a,'바탕=잉크','bg = ink'),tx+26,ty2+51)}
    if(lv.mode==='two')tag(L(a,'2색 겹찍기','2 colours'),'#7a3f8e',ty2+24);
    if(lv.mode==='rot')tag(L(a,'헌 판 재활용','Old block'),'#5a7a4a',ty2+24);
    g.restore()}

  function drawHog(g,a){var hx=64,hy=142,happy=mood==='happy'&&moodT>0,sad=mood==='sad'&&moodT>0,worry=time<10&&phase==='carve';
    var hop=happy?Math.abs(Math.sin(T*12))*8:0,sq=sad?Math.sin(T*30)*1.5:0;hy-=hop;hx+=sq;
    g.fillStyle='rgba(50,25,10,.25)';g.beginPath();g.ellipse(64,198,44,6,0,0,7);g.fill();
    /* 가시 */
    g.fillStyle='#5a3a28';g.beginPath();var n=13;
    for(var i=0;i<=n;i++){var an=Math.PI*.95+i/n*Math.PI*1.15,r1=44+(i%2)*2,r2=58+Math.sin(T*2+i)*1.2;
      var cx=hx-6,cy=hy+16;g.moveTo(cx+Math.cos(an-.13)*r1,cy+Math.sin(an-.13)*r1);g.lineTo(cx+Math.cos(an)*r2,cy+Math.sin(an)*r2);g.lineTo(cx+Math.cos(an+.13)*r1,cy+Math.sin(an+.13)*r1)}g.fill();
    var bg=g.createRadialGradient(hx-14,hy,6,hx-6,hy+16,50);bg.addColorStop(0,'#8a5f43');bg.addColorStop(1,'#4e3222');g.fillStyle=bg;g.beginPath();g.ellipse(hx-6,hy+18,46,40,0,0,7);g.fill();
    /* 얼굴 */
    var fg=g.createRadialGradient(hx+8,hy+6,4,hx+12,hy+16,34);fg.addColorStop(0,'#fff0d6');fg.addColorStop(1,'#e8c69a');g.fillStyle=fg;
    g.beginPath();g.ellipse(hx+12,hy+18,28,26,0,0,7);g.fill();
    g.beginPath();g.ellipse(hx+38,hy+24,13,9,.15,0,7);g.fill();
    g.fillStyle='#2a1a14';g.beginPath();g.arc(hx+50,hy+23,4.2,0,7);g.fill();g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.arc(hx+49,hy+21.5,1.3,0,7);g.fill();
    /* 베레모 */
    g.fillStyle='#c2413a';g.beginPath();g.ellipse(hx-2,hy-14,26,9,-.2,0,7);g.fill();g.fillStyle='#e05a4f';g.beginPath();g.ellipse(hx-4,hy-17,20,6,-.2,0,7);g.fill();
    g.fillStyle='#c2413a';g.beginPath();g.arc(hx+2,hy-24,3,0,7);g.fill();
    /* 눈: 판 쪽(아래)이나 주문서 쪽을 본다 */
    var lx=phase==='carve'&&drag?0:1.6,ly=phase==='carve'?1.8:0;
    [[hx+10,hy+12],[hx+28,hy+12]].forEach(function(e){
      if(happy){g.strokeStyle='#2a1a14';g.lineWidth=2.4;g.beginPath();g.arc(e[0],e[1]+2,5,Math.PI*1.15,Math.PI*1.85);g.stroke()}
      else if(blink<.12){g.strokeStyle='#2a1a14';g.lineWidth=2;g.beginPath();g.moveTo(e[0]-4,e[1]);g.lineTo(e[0]+4,e[1]);g.stroke()}
      else{g.fillStyle='#2a1a14';g.beginPath();g.ellipse(e[0]+lx,e[1]+ly,3.6,worry?4.8:4.3,0,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(e[0]+lx-1,e[1]+ly-1.5,1.3,0,7);g.fill()}
      if(sad){g.strokeStyle='#5a3a28';g.lineWidth=2;g.beginPath();g.moveTo(e[0]-5,e[1]-9);g.lineTo(e[0]+5,e[1]-6+(e[0]>hx+20?-3:0));g.stroke()}});
    g.fillStyle='rgba(240,120,110,.45)';g.beginPath();g.ellipse(hx+4,hy+26,5,3,0,0,7);g.ellipse(hx+34,hy+32,4,2.5,0,0,7);g.fill();
    g.strokeStyle='#5a3424';g.lineWidth=1.6;g.beginPath();
    if(happy)g.arc(hx+38,hy+30,5,.2,Math.PI-.2);else if(sad||worry)g.arc(hx+38,hy+36,4,Math.PI+.4,-.4);else{g.moveTo(hx+34,hy+32);g.quadraticCurveTo(hx+38,hy+34,hx+42,hy+31)}g.stroke();
    /* 앞발: 주문서 가리키기 */
    g.fillStyle='#e8c69a';g.beginPath();g.ellipse(hx+44,hy+50+Math.sin(T*3)*2,9,6,-.5,0,7);g.fill();
    if(worry){g.fillStyle='#9fd8ff';g.beginPath();g.ellipse(hx+44,hy+2+((T*24)%8),2.5,4,0,0,7);g.fill()}
  }

  function drawSay(g,a){var hx=64,hy=142;if(sayT>0&&say){g.font=F(14);var tw=g.measureText(say).width+18,bx=Math.max(6,Math.min(hx-10,350-tw)),by=hy-56;
      g.globalAlpha=Math.min(1,sayT*6);g.fillStyle='rgba(255,252,240,.97)';rr(g,bx,by,tw,26,13);g.fill();
      g.beginPath();g.moveTo(bx+24,by+25);g.lineTo(bx+30,by+34);g.lineTo(bx+36,by+25);g.fill();
      g.fillStyle=mood==='happy'?'#2f7a3a':'#b03a2a';g.textAlign='left';g.textBaseline='middle';g.fillText(say,bx+9,by+13.5);g.globalAlpha=1}}
  function drawBg(g,a){var W=a.W,i;
    var wg=g.createLinearGradient(0,0,0,210);wg.addColorStop(0,'#8a5a3c');wg.addColorStop(.35,'#d9a36c');wg.addColorStop(1,'#f0c68e');g.fillStyle=wg;g.fillRect(-20,-20,W+40,240);
    /* 창빛 (움직이는 층 1) */
    for(i=0;i<3;i++){var ox=((T*6+i*140)%520)-120;g.fillStyle='rgba(255,240,200,'+(.10+.04*Math.sin(T*.7+i))+')';
      g.beginPath();g.moveTo(ox,-10);g.lineTo(ox+46,-10);g.lineTo(ox+150,210);g.lineTo(ox+80,210);g.fill()}
    /* 빨랫줄에 걸린 판화들 (움직이는 층 2) */
    g.strokeStyle='rgba(70,40,20,.55)';g.lineWidth=1.2;g.beginPath();g.moveTo(-10,46);g.quadraticCurveTo(180,66,370,46);g.stroke();
    var cols=['#2b2233','#d8433a','#2f6db3','#2b2233','#7a3f8e'];
    for(i=0;i<6;i++){var px=10+i*62,py=48+Math.sin(i/5*Math.PI)*12,sw=Math.sin(T*1.3+i*1.7)*.09;
      g.save();g.translate(px,py);g.rotate(sw);g.fillStyle='rgba(40,20,10,.2)';g.fillRect(-13,3,28,32);g.fillStyle='#f8efdc';g.fillRect(-14,1,28,32);
      g.fillStyle=cols[i%5];var r=rng(i*13+3);for(var k=0;k<12;k++)if(r()<.55)g.fillRect(-10+(k%3)*7,5+((k/3)|0)*6,6,5);
      g.fillStyle='#b98a50';g.fillRect(-2,-3,4,7);g.restore()}
    /* 먼지 */
    for(i=0;i<motes.length;i++){var m=motes[i],mx=(m.x+T*m.v)%380-10,my=m.y+Math.sin(T*m.w+i)*8;
      g.fillStyle='rgba(255,245,215,'+(.25+.25*Math.sin(T*2+i))+')';g.beginPath();g.arc(mx,my,m.r,0,7);g.fill()}}

  function btn(g,r,label,sub,col,on,fl){var pr=fl>0?2:0;g.fillStyle='rgba(40,20,10,.35)';rr(g,r.x,r.y+4,r.w,r.h,12);g.fill();
    g.fillStyle=on?col:'#8d7766';rr(g,r.x,r.y+pr,r.w,r.h-2,12);g.fill();g.fillStyle='rgba(255,255,255,.18)';rr(g,r.x+3,r.y+pr+3,r.w-6,(r.h-2)/2-3,9);g.fill();
    g.fillStyle=on?'#fff':'rgba(255,255,255,.55)';g.textAlign='center';g.textBaseline='middle';g.font=F(r.w>100?20:16);g.fillText(label,r.x+r.w/2,r.y+pr+(sub?17:r.h/2-1));
    if(sub){g.font=F(10);g.globalAlpha=.8;g.fillText(sub,r.x+r.w/2,r.y+pr+34);g.globalAlpha=1}}

  function draw(g,a){var W=a.W,H=a.H,i;
    drawBg(g,a);drawHog(g,a);
    /* 계산대 + 작업대 */
    g.drawImage(woodTex(),0,206);g.fillStyle='#6e4224';g.fillRect(-20,200,W+40,8);g.fillStyle='#c98e58';g.fillRect(-20,198,W+40,3);
    g.fillStyle='rgba(40,20,10,.25)';g.fillRect(-20,208,W+40,4);
    drawCard(g,a);drawSay(g,a);
    /* 타이머 */
    var tr=Math.max(0,time)/99,low=time<10;g.fillStyle='rgba(30,14,6,.45)';rr(g,18,33,324,9,4.5);g.fill();
    g.fillStyle=low?(Math.sin(T*10)>0?'#ff6b5a':'#ffb09a'):'#ffd27a';if(tr>0){rr(g,19,34,Math.max(7,322*tr),7,3.5);g.fill()}
    /* 정보 줄 */
    var G=geom(),left=lv.budget-used;
    g.textBaseline='middle';g.textAlign='left';g.font=F(15);g.fillStyle=strokeFl>0?'#ffb0a0':'#fff4dc';
    g.fillText(L(a,'칼질 ','Strokes '),16,222);var lw=g.measureText(L(a,'칼질 ','Strokes ')).width;
    var sp=Math.min(13,(290-lw-40)/lv.budget);
    for(i=0;i<lv.budget;i++){var gx=16+lw+i*sp,on=i<left;g.save();g.translate(gx+5,222);g.rotate(-.6);
      g.fillStyle=on?'#ffe0a8':'rgba(255,255,255,.18)';g.fillRect(-1.5,-7,3,9);g.fillStyle=on?'#7a4a28':'rgba(0,0,0,.15)';g.fillRect(-2.5,2,5,6);g.restore()}
    g.textAlign='right';g.fillStyle='#fff4dc';g.font=F(15);g.fillText(Math.ceil(Math.max(0,time))+L(a,'초','s'),344,222);
    if(lv.mode==='two'){[0,1].forEach(function(k){var tx=k?184:26,on=cur.k===k;g.fillStyle=on?(k?'#2f6db3':'#d8433a'):'rgba(40,20,10,.3)';rr(g,tx,230,150,22,11);g.fill();
      g.fillStyle=on?'#fff':'rgba(255,240,220,.7)';g.textAlign='center';g.font=F(14);g.fillText((k?L(a,'파랑 판','Blue block'):L(a,'빨강 판','Red block'))+(on?' ✎':''),tx+75,241.5)})}
    /* 판 / 찍기 연출 */
    var k=cur.k,ink=lv.inks[k];
    if(phase==='carve'||(phase==='enter')){var dy=enter>0?-(enter*enter)*300:0,G2={N:G.N,cs:G.cs,x:G.x,y:G.y+dy,w:G.w};
      var ang=rotAnim>0?-rotAnim*rotAnim*(Math.PI/2):0;
      g.save();if(ang){g.translate(180,G.y+G.w/2);g.rotate(ang);g.translate(-180,-G.y-G.w/2)}
      var disp=display(G.N,carved[k],rot),old=lv.blocks[k].pre?display(G.N,lv.blocks[k].pre,rot):null;
      drawBlock(g,G2,disp,old,ink);g.restore();
      if(!ang&&enter<=0)drawSel(g,a,G);
    }else drawStamp(g,a,G);
    /* 버튼 */
    btn(g,BTN.undo,L(a,'↶ 되돌리기','↶ Undo'),kb?'Z':null,'#9a6a48',undo.length>0&&phase==='carve',btnFl.undo);
    if(lv.mode==='rot')btn(g,BTN.mid,L(a,'⟳ 돌리기','⟳ Rotate'),kb?'R':null,'#5a8a4a',phase==='carve',btnFl.mid);
    if(lv.mode==='two')btn(g,BTN.mid,L(a,'⇄ 판 바꾸기','⇄ Switch'),kb?'Q':null,cur.k?'#d8433a':'#2f6db3',phase==='carve',btnFl.mid);
    btn(g,BTN.stamp,L(a,'찍기!','Stamp!'),kb?'Enter':null,'#d8533a',phase==='carve',btnFl.stamp);
    if(phase==='result'&&resMsg){g.font=F(15);g.textAlign='center';g.textBaseline='middle';var w3=g.measureText(resMsg).width+24;g.fillStyle='rgba(40,20,10,.85)';rr(g,158-w3/2,594,w3,26,13);g.fill();
      g.fillStyle=stampOK?'#d4ffc8':'#ffd0c0';g.fillText(resMsg,158,607.5)}
    /* 힌트 */
    var ht=null;if(hint&&phase==='carve')ht=hint[a.lang==='ko'?0:1];
    if(ht){var fs=15;do{fs--;g.font=F(fs)}while(fs>10&&g.measureText(ht).width>284);g.textAlign='center';var w2=Math.min(300,g.measureText(ht).width+20);g.fillStyle='rgba(40,20,10,.75)';rr(g,158-w2/2,596,w2,24,12);g.fill();
      g.fillStyle='#fff2cf';g.fillText(ht,158,608.5)}
    if(level===0&&phase==='carve'){g.font=F(11);g.textAlign='center';g.fillStyle='rgba(255,240,215,.85)';
      g.fillText(kb?L(a,'방향키 이동 · Space 누른 채 이동=한 줄 파기 · Enter 찍기','Arrows move · hold Space + arrows = carve · Enter stamps'):L(a,'끌기 = 한 줄 파기 · 탭 = 한 칸 파기','Drag = carve a line · Tap = carve one cell'),158,630)}
    g.textBaseline='alphabetic'}

  function drawSel(g,a,G){var cs=G.cs,N=G.N,seg=null;
    if(drag){var e=dragEnd(drag);seg={x0:drag.x0,y0:drag.y0,x1:e.x,y1:e.y}}
    else if(kStroke)seg={x0:kStroke.x0,y0:kStroke.y0,x1:kStroke.ax==='y'?kStroke.x0:cur.x,y1:kStroke.ax==='x'?kStroke.y0:cur.y};
    if(seg){var cells=segCells(N,seg.x0,seg.y0,seg.x1,seg.y1),out=used>=lv.budget;
      g.fillStyle=out?'rgba(255,90,70,.35)':'rgba(255,240,150,.45)';cells.forEach(function(c){g.fillRect(G.x+(c%N)*cs+1,G.y+((c/N)|0)*cs+1,cs-2,cs-2)});
      var xa=Math.min(seg.x0,seg.x1),ya=Math.min(seg.y0,seg.y1),xb=Math.max(seg.x0,seg.x1),yb=Math.max(seg.y0,seg.y1);
      g.strokeStyle=out?'#ff6a50':'#fff3b0';g.lineWidth=2.5;rr(g,G.x+xa*cs+1,G.y+ya*cs+1,(xb-xa+1)*cs-2,(yb-ya+1)*cs-2,5);g.stroke();
      /* 조각칼 */
      var ex=G.x+(seg.x1+.5)*cs,ey=G.y+(seg.y1+.5)*cs;g.save();g.translate(ex,ey);g.rotate(-.7);g.fillStyle='rgba(30,10,5,.3)';g.fillRect(-2,4,8,40);
      g.fillStyle='#d8dde6';g.beginPath();g.moveTo(-3,0);g.lineTo(3,0);g.lineTo(4,14);g.lineTo(-4,14);g.fill();g.fillStyle='#9b5a2e';rr(g,-5,14,10,28,4);g.fill();g.restore()}
    if(kb&&!drag){var p=.6+.4*Math.sin(T*6);g.strokeStyle='rgba(255,255,255,'+p+')';g.lineWidth=2.5;g.setLineDash([5,4]);g.strokeRect(G.x+cur.x*cs+2,G.y+cur.y*cs+2,cs-4,cs-4);g.setLineDash([])}}

  /* 찍기 연출: 들기 → 뒤집기(좌우 반전) → 쾅 → 들어 올리기 */
  function drawStamp(g,a,G){var nb=lv.blocks.length,D=pressDur(),t=phase==='stamp'?pt:9,k=Math.min(nb-1,Math.floor(t/D)),u=phase==='stamp'?(t-k*D)/D:1;
    var N=G.N,cs=G.cs;
    /* 종이 */
    var pp=Math.min(1,t/.35),pyo=(1-pp)*(1-pp)*240;
    g.fillStyle='rgba(40,20,10,.3)';g.fillRect(G.x-14,G.y-10+pyo,G.w+28,G.w+28);
    g.drawImage(paperTex(),0,0,G.w+28,G.w+24,G.x-16,G.y-14+pyo,G.w+28,G.w+24);
    if(!printCv)printCv={};
    /* 이미 찍힌 층 */
    var layers=[];for(var j=0;j<nb;j++){var hit=phase==='result'||j<k||(j===k&&u>=.55);layers.push(hit?prints0[j]:null)}
    var key=layers.map(function(l){return l?1:0}).join('');
    if(!printCv[key])printCv[key]=composite(N,cs,layers,lv.inks,level*17+tries,true);
    g.globalAlpha=pp;g.drawImage(printCv[key],G.x,G.y+pyo);g.globalAlpha=1;
    if(phase==='result'){/* 비교 표시 */
      if(!stampOK){var bl=.5+.5*Math.sin(T*8);g.strokeStyle='rgba(230,50,40,'+(.5+.5*bl)+')';g.lineWidth=2.5;
        mism.forEach(function(c){g.beginPath();g.arc(G.x+(c%N+.5)*cs,G.y+(((c/N)|0)+.5)*cs,cs*.42,0,7);g.stroke()})}
      else{g.save();g.translate(G.x+G.w-30,G.y+G.w-20);g.rotate(-.25);g.strokeStyle='rgba(216,67,58,.9)';g.lineWidth=3;g.beginPath();g.arc(0,0,26,0,7);g.stroke();
        g.fillStyle='rgba(216,67,58,.9)';g.font=F(16);g.textAlign='center';g.textBaseline='middle';g.fillText(L(a,'합격','OK!'),0,1);g.restore()}
      var msg=stampOK?L(a,'주문서와 똑같아요!','Matches the order!'):L(a,'빨간 동그라미가 틀린 칸','Red circles = wrong cells');
      resMsg=msg;return}
    /* 도장 블록 */
    var lift,sx,sc,yoff,alpha=1;
    if(u<.2){var e=u/.2;lift=e;sx=1;yoff=-e*26;sc=1+e*.05}
    else if(u<.42){var e2=(u-.2)/.22;sx=Math.cos(e2*Math.PI);yoff=-26-Math.sin(e2*Math.PI)*14;sc=1.05}
    else if(u<.55){var e3=(u-.42)/.13;sx=-1;yoff=-26*(1-e3*e3);sc=1.05-.07*e3*e3}
    else if(u<.7){sx=-1;yoff=0;sc=.98}
    else{var e4=(u-.7)/.3;sx=-1;yoff=-e4*e4*420;sc=.98;alpha=1-e4}
    var ink=lv.inks[k],disp=display(N,carved[k],rot),old=lv.blocks[k].pre?display(N,lv.blocks[k].pre,rot):null;
    g.save();g.globalAlpha=Math.max(0,alpha);g.translate(180,G.y+G.w/2+yoff);g.scale(sx*sc,sc);g.translate(-180,-G.y-G.w/2);
    if(sx>0){g.fillStyle='rgba(30,10,5,'+(.2*sx)+')';drawBlock(g,G,disp,old,ink,{inked:u>.05})}else drawBack(g,G,ink);
    g.restore();g.globalAlpha=1}

  /* ================= SG 게임 ================= */
  var game={
    id:'stamp-carve',
    title:{ko:'판화 도장',en:'Stamp Carver'},
    how:{ko:'고무판을 끌어서 파고 찍기! 찍으면 좌우가 뒤집혀요',en:'Drag to carve the block, then stamp. Prints come out mirrored!'},
    init:function(a){level=0;time=50;seed=(Math.random()*1e9)>>>0;T=0;blink=2;mood='idle';moodT=0;say=null;sayT=0;kb=false;prevDown=false;KQ.length=0;
      firstNeg=0;firstRot=0;firstTwo=0;btnFl={undo:0,mid:0,stamp:0};lastTick=99;
      motes=[];for(var i=0;i<18;i++)motes.push({x:Math.random()*380,y:20+Math.random()*170,v:3+Math.random()*7,w:.4+Math.random(),r:.6+Math.random()*1.4});
      setup(a)},
    update:function(dt,inp,a){active=true;lastUpd=performance.now();
      pointer(inp,a);keys(a);
      if(phase==='carve'){time-=dt;
        if(time<10&&Math.ceil(time)<lastTick&&time>0)a.beep(880,.04,'square');lastTick=Math.ceil(time);
        a.tempo(time<12?1.3:1+Math.min(.2,level*.02));
        if(time<=0){time=0;a.over();return}}
      else if(phase==='stamp'){var D=pressDur(),before=pt;pt+=dt;
        for(var j=0;j<lv.blocks.length;j++){var hit=j*D+.55*D;if(before<hit&&pt>=hit){var G=geom();
            a.beep(70,.28,'sine');a.beep(110,.12,'triangle');a.beep(55,.35,'sine');a.shake(7);
            for(var q=0;q<10;q++)a.burst(G.x+Math.random()*G.w,G.y+(q%2?0:G.w),lv.inks[j],2)}}
        if(pt>=stampDur())finishStamp(a)}
      else if(phase==='result'){pt+=dt;if(pt>=(stampOK?1.5:1.8)||pt>=9){if(stampOK){level++;setup(a)}else{phase='carve';printCv=null}}}},
    draw:function(g,a,dt){dt=dt||.016;T+=dt;blink-=dt;if(blink<0)blink=2+Math.random()*3;moodT=Math.max(0,(moodT||0)-dt);sayT=Math.max(0,(sayT||0)-dt);
      if(enter>0)enter=Math.max(0,enter-dt/.35);if(rotAnim>0)rotAnim=Math.max(0,rotAnim-dt/.2);strokeFl=Math.max(0,(strokeFl||0)-dt);
      if(btnFl)for(var b in btnFl)btnFl[b]=Math.max(0,btnFl[b]-dt);
      draw(g,a)},
    _logic:{HAND:HAND,GLYPH:GLYPH,rng:rng,grid:grid,mirror:mirror,inv:inv,same:same,fwd:fwd,back:back,rotGrid:rotGrid,printOf:printOf,display:display,
      segCells:segCells,minCover:minCover,build:build,genSpec:genSpec,levelFor:levelFor,newCarve:newCarve,prints:prints,matches:matches,carveSeg:carveSeg,asym:asym}
  };
  if(typeof location!=='undefined'&&/[?&]scdbg=1/.test(location.search))window.__sc={
    lv:function(){return lv},geom:function(){return geom()},state:function(){return {level:level,phase:phase,used:used,budget:lv.budget,rot:rot,k:cur.k,time:time}},
    goto:function(n){level=n;setup()},setTime:function(t){time=t}};
  SG.run(game);
})();
