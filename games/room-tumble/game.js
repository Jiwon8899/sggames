/* 데굴데굴 인형의 집 (Room Tumble) — 고양이는 못 움직인다. 방 전체를 90도씩 돌리면 중력이 바뀌고,
   느슨한 것들이 전부 새 바닥으로 떨어진다. 격자 물리는 DOM 없이도 돌도록 분리(node 검증용 module.exports). */
(function(){
  'use strict';
  /* ---------- 논리(격자 물리) : DOM 없이 동작 ---------- */
  var DIRS=[[0,1],[1,0],[0,-1],[-1,0]];   /* 방을 시계 방향으로 o번 돌렸을 때 방 좌표계에서의 중력 */
  function rng(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  function clone(s){return{o:s.o,x:s.x.slice(),y:s.y.slice(),st:s.st.slice(),al:s.al.slice()}}
  function key(s){var k=''+s.o;for(var i=0;i<s.x.length;i++)k+=s.al[i]?','+s.x[i]+s.y[i]+s.st[i]:',x';return k}
  function occOf(lv,s){var n=lv.n,occ=new Int8Array(n*n);for(var i=0;i<lv.objs.length;i++)if(s.al[i]){var c=lv.objs[i].cells;
    for(var j=0;j<c.length;j++)occ[(s.y[i]+c[j][1])*n+s.x[i]+c[j][0]]=i+1}return occ}
  function canMove(lv,s,occ,i,dx,dy){var n=lv.n,c=lv.objs[i].cells;for(var j=0;j<c.length;j++){var x=s.x[i]+c[j][0]+dx,y=s.y[i]+c[j][1]+dy;
    if(x<0||y<0||x>=n||y>=n)return false;var q=y*n+x;if(lv.stat[q])return false;if(occ[q]&&occ[q]!==i+1)return false}return true}
  /* 이동시키고, 새로 꿀 칸에 들어갔으면 true */
  function doMove(lv,s,occ,i,dx,dy){var n=lv.n,c=lv.objs[i].cells,j,old=[],stick=false;
    for(j=0;j<c.length;j++){var q=(s.y[i]+c[j][1])*n+s.x[i]+c[j][0];occ[q]=0;old.push(q)}
    s.x[i]+=dx;s.y[i]+=dy;
    for(j=0;j<c.length;j++){var p=(s.y[i]+c[j][1])*n+s.x[i]+c[j][0];occ[p]=i+1;if(lv.honey[p]&&old.indexOf(p)<0)stick=true}
    return stick}
  function fixedPoint(lv,s,g,frozen,dist){var occ=occOf(lv,s),m=lv.objs.length,ord=[],i;
    for(i=0;i<m;i++)ord.push(i);
    function proj(i){var d=lv.objs[i].t==='bal'?-1:1;return d*(s.x[i]*g[0]+s.y[i]*g[1])}
    for(var guard=0;guard<200;guard++){var moved=false;
      ord.sort(function(a,b){var A=lv.objs[a].t==='bal'?1:0,B=lv.objs[b].t==='bal'?1:0;return A-B||proj(b)-proj(a)||a-b});
      for(var k=0;k<m;k++){i=ord[k];if(!s.al[i]||frozen[i])continue;var d=lv.objs[i].t==='bal'?-1:1,dx=g[0]*d,dy=g[1]*d;
        if(canMove(lv,s,occ,i,dx,dy)){if(doMove(lv,s,occ,i,dx,dy)){s.st[i]=2;frozen[i]=1}dist[i]++;moved=true}}
      if(!moved)break}}
  function hazard(lv,s){var g=DIRS[s.o],n=lv.n;for(var i=0;i<lv.ncat;i++){if(s.st[i])continue;var x=s.x[i]+g[0],y=s.y[i]+g[1];
    if(x<0||y<0||x>=n||y>=n)continue;var t=lv.stat[y*n+x];if(t>1)return{who:i,type:t}}return null}
  function isWin(lv,s){if(s.y[0]*lv.n+s.x[0]!==lv.goalC)return false;return lv.ncat<2||s.y[1]*lv.n+s.x[1]===lv.goalK}
  /* 한 번 돌리기: dir=+1 시계, -1 반시계 */
  function turn(lv,s0,dir){var s=clone(s0),m=lv.objs.length,i,frozen=new Uint8Array(m),phases=[];
    s.o=(s.o+dir+4)%4;var g=DIRS[s.o];
    for(i=0;i<m;i++){if(s.st[i]===2){s.st[i]=1;frozen[i]=1}else if(s.st[i]===1)s.st[i]=0}
    function settle(){for(var guard=0;guard<20;guard++){var dist=new Int16Array(m),broke=[];fixedPoint(lv,s,g,frozen,dist);
      for(var j=0;j<m;j++)if(s.al[j]&&lv.objs[j].t==='gls'&&dist[j]>=3&&s.st[j]!==2){s.al[j]=0;broke.push(j)}
      phases.push({k:'fall',x:s.x.slice(),y:s.y.slice(),broke:broke});if(!broke.length)break}}
    settle();
    var walked=false,occ=occOf(lv,s),px=g[0]?0:1,py=g[0]?1:0;
    for(i=0;i<m;i++)if(s.al[i]&&lv.objs[i].t==='mou'&&!frozen[i]&&s.st[i]===0){
      var d=(s.x[0]-s.x[i])*px+(s.y[0]-s.y[i])*py;d=d>0?1:d<0?-1:0;
      if(d&&canMove(lv,s,occ,i,px*d,py*d)){if(doMove(lv,s,occ,i,px*d,py*d)){s.st[i]=2;frozen[i]=1}walked=true}}
    if(walked){phases.push({k:'walk',x:s.x.slice(),y:s.y.slice(),broke:[]});settle()}
    var hz=hazard(lv,s);
    return{s:s,phases:phases,fail:hz,win:!hz&&lv.goalC>=0&&isWin(lv,s)}}
  /* 레벨 조립: objs=[{t,cells,x,y,id}] */
  function build(n,stat,honey,objs,goalC,goalK){var rank={cat:0,kit:1};
    objs=objs.map(function(o,i){return{o:o,i:i}}).sort(function(a,b){var A=rank[a.o.t],B=rank[b.o.t];if(A==null)A=2;if(B==null)B=2;return A-B||a.i-b.i}).map(function(e){return e.o});
    var lv={n:n,stat:stat,honey:honey,goalC:goalC==null?-1:goalC,goalK:goalK==null?-1:goalK,
      objs:objs.map(function(o){return{t:o.t,cells:o.cells||[[0,0]],id:o.id||0}})};
    lv.ncat=(objs.length>1&&objs[1].t==='kit')?2:1;
    var m=objs.length,s={o:0,x:[],y:[],st:[],al:[]},frozen=new Uint8Array(m),dist=new Int16Array(m),i,j;
    for(i=0;i<m;i++){s.x.push(objs[i].x);s.y.push(objs[i].y);s.st.push(0);s.al.push(1);
      var c=lv.objs[i].cells;for(j=0;j<c.length;j++)if(honey[(objs[i].y+c[j][1])*n+objs[i].x+c[j][0]]){s.st[i]=2;frozen[i]=1}}
    fixedPoint(lv,s,DIRS[0],frozen,dist);
    lv.unstable=false;for(i=0;i<m;i++)if(dist[i])lv.unstable=true;
    lv.init=s;lv.bad=!!hazard(lv,s);return lv}
  function parse(rows){var n=rows.length,stat=new Uint8Array(n*n),honey=new Uint8Array(n*n),objs=[],blk={},gc=-1,gk=-1;
    for(var y=0;y<n;y++)for(var x=0;x<n;x++){var ch=rows[y].charAt(x),q=y*n+x;
      if(ch==='#')stat[q]=1;else if(ch==='F')stat[q]=2;else if(ch==='X')stat[q]=3;else if(ch==='H')honey[q]=1;
      else if(ch==='c')gc=q;else if(ch==='k')gk=q;
      else if(ch==='C')objs.push({t:'cat',x:x,y:y});else if(ch==='K')objs.push({t:'kit',x:x,y:y});
      else if(ch==='B')objs.push({t:'bal',x:x,y:y});else if(ch==='G')objs.push({t:'gls',x:x,y:y});else if(ch==='M')objs.push({t:'mou',x:x,y:y});
      else if(ch>='1'&&ch<='9'){if(!blk[ch]){blk[ch]={t:'blk',x:x,y:y,cells:[],id:+ch};objs.push(blk[ch])}blk[ch].cells.push([x-blk[ch].x,y-blk[ch].y])}}
    return build(n,stat,honey,objs,gc,gk)}
  /* 전체 상태 공간 BFS. useGoal=false면 목표를 무시하고 닿을 수 있는 상태를 전부 모은다 */
  function bfs(lv,useGoal,cap){var s0=lv.init,seen={},list=[{s:s0,d:0,p:-1,m:0}],h=0;seen[key(s0)]=1;cap=cap||8000;
    while(h<list.length){var cur=list[h++];
      for(var mv=-1;mv<=1;mv+=2){var r=turn(lv,cur.s,mv);if(r.fail)continue;
        if(useGoal&&r.win){var path=[mv],e=cur;while(e.p>=0){path.unshift(e.m);e=list[e.p]}return{par:cur.d+1,path:path,states:list.length}}
        var k=key(r.s);if(seen[k])continue;seen[k]=1;list.push({s:r.s,d:cur.d+1,p:h-1,m:mv});if(list.length>cap)return{par:-1,over:true,list:list}}}
    return{par:-1,list:list,states:list.length}}
  /* 절차 생성: 무작위 방을 만들고, BFS로 닿는 상태 중 깊이가 충분한 곳에 방석을 놓는다 */
  var SHAPES=[[[0,0]],[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[0,1]],[[0,0],[1,0],[1,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[1,1]]];
  function gen(seed,tier){
    for(var at=0;at<600;at++){var r=rng((seed*7919+at*104729+17)>>>0);r();
      var n=tier<2?5:tier<5?5+(r()<.6?1:0):6+(r()<.5?1:0),N=n*n,stat=new Uint8Array(N),honey=new Uint8Array(N),used=new Uint8Array(N),objs=[],i,q;
      var ns=n-3+(r()*4|0);for(i=0;i<ns;i++){q=r()*N|0;stat[q]=1;used[q]=1}
      var nh=r()<.55?1+(r()<.35?1:0):0;for(i=0;i<nh;i++){q=r()*N|0;if(!used[q]){stat[q]=r()<.5?2:3;used[q]=1}}
      if(tier>=1&&r()<.4){var hc=1+(r()<.4?1:0);for(i=0;i<hc;i++){q=r()*N|0;if(!used[q])honey[q]=1}}
      var place=function(t,cells,id){for(var tr=0;tr<30;tr++){var x=r()*n|0,y=r()*n|0,ok=true,j;
          for(j=0;j<cells.length;j++){var cx=x+cells[j][0],cy=y+cells[j][1];if(cx>=n||cy>=n||used[cy*n+cx]){ok=false;break}}
          if(!ok)continue;for(j=0;j<cells.length;j++)used[(y+cells[j][1])*n+x+cells[j][0]]=1;objs.push({t:t,cells:cells,x:x,y:y,id:id});return true}return false};
      if(!place('cat',[[0,0]]))continue;
      var kit=tier>=2&&r()<.38;if(kit&&!place('kit',[[0,0]]))continue;
      var nb=1+(r()*(n-3)|0);for(i=0;i<nb;i++)place('blk',SHAPES[r()*SHAPES.length|0],i+1);
      if(r()<.35)place('bal',[[0,0]]);
      var ng=r()<.45?1+(r()<.3?1:0):0;for(i=0;i<ng;i++)place('gls',[[0,0]]);
      if(tier>=3&&r()<.3)place('mou',[[0,0]]);
      var lv=build(n,stat,honey,objs,-1,-1);if(lv.bad)continue;lv.unstable=false;
      /* build가 가라앉힌 뒤의 배치에서 꿀 위에 있는 것은 붙은 상태로 시작한다 */
      var ex=bfs(lv,false,2500);if(ex.over)continue;
      var first={},L=ex.list,c0=lv.init.y[0]*n+lv.init.x[0],k0=kit?lv.init.y[1]*n+lv.init.x[1]:-1;
      for(i=0;i<L.length;i++){var s=L[i].s,pc=s.y[0]*n+s.x[0],pk=kit?s.y[1]*n+s.x[1]:-1,kk=pc+'_'+pk;if(first[kk]==null)first[kk]={d:L[i].d,c:pc,k:pk}}
      var lo=3+Math.min(2,tier/3|0),want=lo+(r()*2|0),best=null;
      for(var kk2 in first){var f=first[kk2];if(f.d<lo||f.d>lo+3)continue;if(f.c===c0||honey[f.c])continue;if(kit&&(f.k===k0||honey[f.k]))continue;
        var sc=Math.abs(f.d-want)+r()*.5;if(!best||sc<best.sc)best={sc:sc,f:f}}
      if(!best)continue;
      lv.goalC=best.f.c;lv.goalK=best.f.k;var sol=bfs(lv,true,5000);if(sol.par!==best.f.d)continue;
      lv.par=sol.par;lv.path=sol.path;lv.seed=seed;return lv}
    var fb=parse(['.....','.....','..#..','....c','C....']);var fs=bfs(fb,true);fb.par=fs.par;fb.path=fs.path;return fb}
  var HAND_SRC=[
    {r:['.....','.....','.....','.....','C...c'],h:{ko:'방을 돌려요',en:'Turn the room'}},
    {r:['....c','.....','.....','.....','C....'],h:{ko:'이번엔 두 번!',en:'Twice this time!'}},
    {r:['C....','#....','.....','....c','.1...'],h:{ko:'가구가 계단이 돼요',en:'Furniture makes a step'}},
    {r:['.....','..C..','..##.','....c','...1F'],h:{ko:'어항 위로 떨어지면 안 돼요',en:'Never land on the fishbowl'}},
    {r:['...F.','c....','....X','..#..','.11C#'],h:{ko:'선인장도 조심!',en:'Mind the cactus too'}},
    {r:['#.11..','..1...','.##...','c.....','....2.','..C.2.'],h:{ko:'큰 가구는 통째로 떨어져요',en:'Big furniture falls as one piece'}},
    {r:['.cG...','..#...','......','...#.C','.....#','..11..'],h:{ko:'유리 장식은 3칸 떨어지면 깨져요',en:'Glass breaks after a 3-cell fall'}},
    {r:['..1..c','..1...','..B#..','......','C.....','#.#...'],h:{ko:'풍선은 위로 떨어져요',en:'Balloons fall upward'}},
    {r:['......','c....#','...11.','....#.','.#.H..','....HC'],h:{ko:'꿀은 한 번 붙잡아 줘요',en:'Honey holds on for one turn'}},
    {r:['......','...#..','......','kc....','....K.','.#11#C'],h:{ko:'아기 고양이는 바구니로',en:'The kitten needs its basket'}},
    {r:['..c.#.','X.....','......','......','1....#','M..C#.'],h:{ko:'태엽 쥐는 매번 고양이 쪽으로 한 칸',en:'The toy mouse steps toward the cat'}},
    {r:['.......','.....11','......G','.....##','....#..','...F#..','..c...C'],h:{ko:'깨져야 열리는 길도 있어요',en:'Some paths open only by breaking'}},
    {r:['...#.C.','.....22','.....#c','..#.X.k','....11#','...H#1.','...H.K.'],h:{ko:'천천히, 차근차근',en:'Slow and steady'}},
    {r:['..X.kMc','22FH.#.','.#C#...','..B..#.','.......','...1.K.','#..11G.'],h:{ko:'전부 다 나왔어요!',en:'Everything at once!'}}
  ];
  var HAND=[];
  function handLevel(i){if(!HAND[i]){var lv=parse(HAND_SRC[i].r),s=bfs(lv,true,20000);lv.par=s.par;lv.path=s.path;lv.hint=HAND_SRC[i].h;HAND[i]=lv}return HAND[i]}
  var Logic={DIRS:DIRS,parse:parse,build:build,turn:turn,bfs:bfs,gen:gen,key:key,clone:clone,HAND_SRC:HAND_SRC,handLevel:handLevel,isWin:isWin};
  if(typeof module!=='undefined'&&module.exports)module.exports=Logic;
  if(typeof window==='undefined'||typeof SG==='undefined')return;

  /* ---------- 게임 ---------- */
  var W=360,H=640,CX=180,CY=266,S=296,H2=S/2,FR=11,PI=Math.PI;
  var BTN=[{x:62,y:566,r:32,k:'ccw'},{x:262,y:566,r:32,k:'cw'},{x:136,y:574,r:21,k:'undo'},{x:188,y:574,r:21,k:'re'}];
  var BLK=[['#5fb6ad','#3f8f87'],['#e58a7b','#b9604f'],['#8fa8e0','#6079b8'],['#e2b65a','#b58a2e'],['#b58bd6','#8660a8']];
  var api=null,lv=null,idx=0,st=null,undo=[],moves=0,time=50,streak=0,runSeed=1,vo=[],ang=0,A=null,buf=null,
      winT=0,failT=0,fade=0,awake=0,T=0,puffs=[],keyQ=null,pend=[{p:0,w:0},{p:0,w:0},{p:0,w:0},{p:0,w:0}],bp=[0,0,0,0],lastGain=0,hearts=0;
  var cache={};
  function getLevel(i){if(i<HAND_SRC.length)return handLevel(i);var k=runSeed+'_'+i;if(!cache[k])cache[k]=gen(runSeed*131+i,i-HAND_SRC.length);return cache[k]}
  function sync(){vo=lv.objs.map(function(o,i){return{x:st.x[i],y:st.y[i],rot:0,sq:0,al:!!st.al[i]}})}
  function loadLevel(i){idx=i;lv=getLevel(i);st=clone(lv.init);undo=[];moves=0;ang=0;A=null;buf=null;winT=0;failT=0;awake=0;sync();fade=1}
  function fitK(){var c=Math.abs(Math.cos(ang)),s=Math.abs(Math.sin(ang));return Math.min(1,350/((S+2*FR)*(c+s)))}
  function toScreen(px,py){var k=fitK(),c=Math.cos(ang),s=Math.sin(ang);return[CX+k*(px*c-py*s),CY+k*(px*s+py*c)]}
  function cellPx(x,y){var u=S/lv.n;return[-H2+(x+.5)*u,-H2+(y+.5)*u]}
  function objScreen(i){var o=lv.objs[i],mx=0,my=0;for(var j=0;j<o.cells.length;j++){mx+=o.cells[j][0];my+=o.cells[j][1]}
    var p=cellPx(vo[i].x+mx/o.cells.length,vo[i].y+my/o.cells.length);return toScreen(p[0],p[1])}

  function act(dir){if(winT>0||failT>0||!lv)return;if(A){buf=dir;return}
    var r=turn(lv,st,dir);undo.push(st);st=r.s;moves++;
    A={k:'rot',t:0,dur:.44,a0:ang,a1:ang+dir*PI/2,list:r.phases,i:-1,res:r};api.beep(dir>0?330:290,.16,'sine')}
  function doUndo(){if(A||winT>0||failT>0||!undo.length)return;var prev=undo.pop(),dd=(prev.o-st.o+4)%4,dir=dd===1?1:-1;
    st=prev;moves--;sync();A={k:'rot',t:0,dur:.2,a0:ang,a1:ang+dir*PI/2,list:null,nc:true};api.sfx('tap')}
  function resetRoom(snd){st=clone(lv.init);undo=[];moves=0;sync();var tgt=Math.round(ang/(2*PI))*2*PI;
    A=Math.abs(tgt-ang)>.01?{k:'rot',t:0,dur:.28,a0:ang,a1:tgt,list:null,nc:true}:null;buf=null;if(snd)api.sfx('tap')}
  function doRestart(){if(A||winT>0||failT>0||!moves)return;resetRoom(true)}
  function carry(d){var i;for(i=0;i<vo.length;i++)vo[i].rot+=d;for(i=0;i<pend.length;i++)pend[i].p+=d*(i===3?.75:.92)}
  function nextPhase(){A.i++;if(A.i>=A.list.length){finish();return}
    var p=A.list[A.i];A.k=p.k;A.t=0;A.fx=[];A.fy=[];A.T=[];A.done=[];A.max=0;
    for(var i=0;i<vo.length;i++){A.fx.push(vo[i].x);A.fy.push(vo[i].y);var d=Math.abs(p.x[i]-vo[i].x)+Math.abs(p.y[i]-vo[i].y),Ti=0;
      if(d>0&&vo[i].al)Ti=p.k==='walk'?.26:(.08+.105*Math.sqrt(d))*(lv.objs[i].t==='bal'?1.7:1);else d=0;
      A.T.push(Ti);A.done.push(d===0);if(Ti>A.max)A.max=Ti}
    if(A.max===0&&!p.broke.length)nextPhase()}
  function land(i,p){var o=lv.objs[i],v=vo[i];v.sq=1;var sp=objScreen(i),u=S/lv.n*fitK();
    if(p.k==='walk'){api.beep(1200,.03,'square');return}
    if(o.t==='bal'){api.beep(520,.05,'sine');return}
    puffs.push({x:sp[0],y:sp[1]+u*.42*(o.t==='blk'?Math.max(1,o.cells.length*.5):1),t:0,w:u*(o.t==='blk'?.8:.5)});
    if(o.t==='blk'){api.beep(88,.12,'sine');api.shake(2+o.cells.length)}
    else if(o.t==='cat'||o.t==='kit')api.beep(o.t==='cat'?196:262,.09,'triangle');
    else if(o.t==='gls')api.beep(1568,.05,'sine');else api.beep(700,.04,'square')}
  function finish(){var r=A.res;A=null;awake=2.6;var sp;
    if(r.fail){failT=1.05;streak=0;buf=null;sp=objScreen(r.fail.who);api.sfx('hit');api.shake(7);
      api.burst(sp[0],sp[1],r.fail.type===2?'#7fd0ff':'#7ed36b',16);api.pop(sp[0],sp[1]-26,api.lang==='ko'?'야옹!!':'MEOW!!','#ff6b6b');return}
    if(r.win){var par=moves<=lv.par,gl=0,i;for(i=0;i<lv.objs.length;i++)if(lv.objs[i].t==='gls'&&st.al[i])gl++;
      streak=par?streak+1:0;var gain=10+(par?10:Math.max(0,10-3*(moves-lv.par)))+5*gl+(par?Math.min(10,2*(streak-1)):0);
      api.add(gain);lastGain=gain;time=Math.min(70,time+12);winT=1.3;hearts=0;buf=null;sp=objScreen(0);api.sfx('win');
      api.burst(sp[0],sp[1],'#ffd35a',18);api.pop(sp[0],sp[1]-30,'+'+gain+(par?' ★':''),'#fff3a8');
      if(gl)api.pop(sp[0],sp[1]-52,(api.lang==='ko'?'유리 무사 +':'Glass safe +')+5*gl,'#aee9ff');
      try{getLevel(idx+1)}catch(e){}return}
    if(buf!=null){var b=buf;buf=null;act(b)}}
  function stepAnim(dt){var sp=buf!=null?2.4:1,i;A.t+=dt*sp;
    if(A.k==='rot'){var q=Math.min(1,A.t/A.dur),e=q<.5?4*q*q*q:1-Math.pow(-2*q+2,3)/2,na=A.a0+(A.a1-A.a0)*e,d=na-ang;ang=na;
      if(!A.nc)carry(d);else for(i=0;i<pend.length;i++)pend[i].p+=d*.9;
      if(q>=1){ang=A.a1;if(A.list)nextPhase();else{A=null;if(Math.abs(ang)>20)ang=ang%(2*PI)}}return}
    var p=A.list[A.i];
    for(i=0;i<vo.length;i++){if(A.done[i])continue;var q2=Math.min(1,A.t/A.T[i]),e2=p.k==='walk'?q2:lv.objs[i].t==='bal'?1-(1-q2)*(1-q2):q2*q2;
      vo[i].x=A.fx[i]+(p.x[i]-A.fx[i])*e2;vo[i].y=A.fy[i]+(p.y[i]-A.fy[i])*e2;
      if(q2>=1){A.done[i]=true;vo[i].x=p.x[i];vo[i].y=p.y[i];land(i,p)}}
    if(A.t>=A.max+.07){for(i=0;i<p.broke.length;i++){var j=p.broke[i],s2=objScreen(j);vo[j].al=false;
        api.burst(s2[0],s2[1],'#bff3ff',14);api.beep(2093,.06,'triangle');api.beep(2794,.1,'sine');api.shake(3);
        api.pop(s2[0],s2[1]-18,api.lang==='ko'?'쨍그랑!':'Crash!','#bff3ff')}
      nextPhase()}}

  if(!window.__roomTumbleKeys){window.__roomTumbleKeys=true;
    window.addEventListener('keydown',function(e){if(e.repeat)return;
      if(e.code==='KeyZ'||e.code==='Backspace'){keyQ='undo';if(e.code==='Backspace')e.preventDefault()}
      else if(e.code==='KeyR')keyQ='re'})}

  function init(a){api=a;runSeed=1+(Math.random()*1e6|0);time=50;streak=0;T=T||0;puffs=[];keyQ=null;loadLevel(0);fade=0}
  function update(dt,inp,a){api=a;if(time<=0)return;
    time-=dt;if(time<=0){time=0;a.over();return}
    a.tempo(time<10?1.35:1);
    var cmd=keyQ;keyQ=null;
    if(inp.swipe==='left')cmd='ccw';else if(inp.swipe==='right')cmd='cw';
    else if(inp.tap&&inp.x!=null)for(var i=0;i<BTN.length;i++){var b=BTN[i],dx=inp.x-b.x,dy=inp.y-b.y;if(dx*dx+dy*dy<(b.r+5)*(b.r+5)){cmd=b.k;bp[i]=1}}
    if(cmd==='ccw')act(-1);else if(cmd==='cw')act(1);else if(cmd==='undo')doUndo();else if(cmd==='re')doRestart();
    if(A)stepAnim(dt);
    if(awake>0&&!A)awake-=dt;
    if(failT>0){failT-=dt;if(failT<=0){failT=0;resetRoom(false);fade=.6}}
    if(winT>0){winT-=dt;hearts+=dt;if(hearts>.22){hearts=0;var sp=objScreen(0);a.pop(sp[0]+(Math.random()-.5)*30,sp[1]-22,'♥','#ff8fb1')}
      if(winT<=0){winT=0;loadLevel(idx+1)}}}

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath()}
  function ell(g,x,y,rx,ry){g.beginPath();g.ellipse(x,y,rx,ry,0,0,7)}
  function drawDesk(g){var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#3d4f6b');gr.addColorStop(.55,'#56617f');gr.addColorStop(1,'#7a6a86');g.fillStyle=gr;g.fillRect(0,0,W,H);
    /* 천천히 흐르는 창문 빛 조각 */
    g.save();g.globalAlpha=.07;g.fillStyle='#ffe9b8';for(var i=0;i<3;i++){var x=((T*9+i*170)%520)-120;g.beginPath();g.moveTo(x,0);g.lineTo(x+70,0);g.lineTo(x-90,H);g.lineTo(x-160,H);g.fill()}g.restore();
    /* 떠다니는 먼지 */
    for(var j=0;j<16;j++){var px=(j*83+T*(5+j%4)*1.4)%W,py=(j*137+Math.sin(T*.4+j)*18+T*(2+j%3))%H;g.globalAlpha=.13+.1*Math.sin(T+j);g.fillStyle='#fff6dc';g.beginPath();g.arc(px,py,1.2+(j%3)*.6,0,7);g.fill()}
    g.globalAlpha=1;
    /* 책상 */
    var dg=g.createLinearGradient(0,470,0,H);dg.addColorStop(0,'#c99a6b');dg.addColorStop(1,'#a87a52');g.fillStyle=dg;g.fillRect(0,478,W,H-478);
    g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,478,W,3);g.strokeStyle='rgba(90,55,30,.16)';g.lineWidth=1;
    for(var k=0;k<5;k++){g.beginPath();g.moveTo(0,500+k*30);g.bezierCurveTo(100,494+k*30,240,510+k*30,W,498+k*30);g.stroke()}}
  function drawCat(g,u,mood,kit,sq,seed){var r=u*(kit?.3:.4),body=kit?'#c3ccdb':'#f2a65a',dark=kit?'#8f9bb0':'#d07f35',lite=kit?'#f4f6fa':'#ffe2bd';
    g.save();g.translate(0,u*.5);g.scale(1+sq*.22,1-sq*.26);
    if(mood==='startle')g.translate(Math.sin(T*60)*1.2,0);
    g.fillStyle='rgba(60,30,20,.16)';ell(g,0,0,r*1.05,r*.2);g.fill();
    g.strokeStyle=dark;g.lineWidth=r*.3;g.lineCap='round';g.beginPath();
    if(mood==='startle'){g.moveTo(r*.8,-r*.5);g.quadraticCurveTo(r*1.5,-r*1.2,r*1.1,-r*2)}else{g.moveTo(r*.7,-r*.25);g.quadraticCurveTo(r*1.45,-r*.2+Math.sin(T*2+seed)*r*.1,r*1.2,-r*.9)}g.stroke();
    var by=mood==='sleep'?-r*.8+Math.sin(T*2.2+seed)*r*.03:-r*.86,ry=mood==='sleep'?r*.8+Math.sin(T*2.2+seed)*r*.03:r*.86;
    g.fillStyle=body;ell(g,0,by,r*1.08,ry);g.fill();
    g.fillStyle='rgba(255,255,255,.22)';ell(g,-r*.3,by-ry*.45,r*.5,ry*.3);g.fill();
    g.fillStyle=lite;ell(g,0,by+ry*.45,r*.62,ry*.48);g.fill();
    /* 귀 */
    for(var s=-1;s<=1;s+=2){g.fillStyle=body;g.beginPath();g.moveTo(s*r*.9,by-ry*.45);g.lineTo(s*r*.78,by-ry*1.35);g.lineTo(s*r*.25,by-ry*.88);g.fill();
      g.fillStyle='#ffb3b8';g.beginPath();g.moveTo(s*r*.76,by-ry*.66);g.lineTo(s*r*.7,by-ry*1.13);g.lineTo(s*r*.42,by-ry*.86);g.fill()}
    /* 줄무늬 */
    g.strokeStyle=dark;g.lineWidth=r*.11;for(var k=-1;k<=1;k++){g.beginPath();g.moveTo(k*r*.2,by-ry*.98);g.lineTo(k*r*.22,by-ry*.7);g.stroke()}
    /* 얼굴 */
    var ey=by-ry*.12,ex=r*.42;g.strokeStyle='#4a2e22';g.fillStyle='#4a2e22';g.lineWidth=Math.max(1.3,r*.1);
    var blink=((T+seed*1.7)%3.3)<.13;
    for(s=-1;s<=1;s+=2){
      if(mood==='sleep'||(mood==='loaf'&&blink)){g.beginPath();g.arc(s*ex,ey-r*.06,r*.17,.15*PI,.85*PI);g.stroke()}
      else if(mood==='purr'){g.beginPath();g.arc(s*ex,ey+r*.08,r*.17,1.15*PI,1.85*PI);g.stroke()}
      else if(mood==='startle'){g.fillStyle='#fff';ell(g,s*ex,ey,r*.25,r*.27);g.fill();g.stroke();g.fillStyle='#4a2e22';ell(g,s*ex,ey,r*.08,r*.1);g.fill()}
      else{ell(g,s*ex,ey,r*.13,r*.16);g.fill();g.fillStyle='#fff';ell(g,s*ex-r*.04,ey-r*.06,r*.045,r*.05);g.fill();g.fillStyle='#4a2e22'}}
    g.fillStyle='#ff8a9a';g.beginPath();g.moveTo(-r*.09,ey+r*.2);g.lineTo(r*.09,ey+r*.2);g.lineTo(0,ey+r*.31);g.fill();
    g.lineWidth=Math.max(1,r*.07);
    if(mood==='startle'){g.fillStyle='#7a2d3a';ell(g,0,ey+r*.52,r*.13,r*.17);g.fill()}
    else{g.beginPath();g.arc(-r*.11,ey+r*.33,r*.11,0,PI*.9);g.stroke();g.beginPath();g.arc(r*.11,ey+r*.33,r*.11,PI*.1,PI);g.stroke()}
    if(mood==='purr'){g.fillStyle='rgba(255,120,140,.45)';ell(g,-r*.66,ey+r*.24,r*.16,r*.1);g.fill();ell(g,r*.66,ey+r*.24,r*.16,r*.1);g.fill()}
    g.strokeStyle='rgba(74,46,34,.5)';g.lineWidth=1;for(s=-1;s<=1;s+=2){g.beginPath();g.moveTo(s*r*.62,ey+r*.25);g.lineTo(s*r*1.12,ey+r*.16);g.moveTo(s*r*.62,ey+r*.34);g.lineTo(s*r*1.1,ey+r*.42);g.stroke()}
    g.restore()}
  function drawMouse(g,u,sq,flip){g.save();g.translate(0,u*.5);g.scale((flip?-1:1)*(1+sq*.2),1-sq*.25);var r=u*.26;
    g.fillStyle='rgba(60,30,20,.16)';ell(g,0,0,r*1.2,r*.2);g.fill();
    g.strokeStyle='#e79aa6';g.lineWidth=2;g.beginPath();g.moveTo(-r*1.1,-r*.3);g.quadraticCurveTo(-r*1.7,-r*.2,-r*1.5,-r*.9);g.stroke();
    g.fillStyle='#aab3c2';g.beginPath();g.ellipse(0,-r*.62,r*1.2,r*.66,0,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.3)';ell(g,-r*.2,-r*.9,r*.5,r*.18);g.fill();
    g.fillStyle='#f4a9b4';ell(g,r*.45,-r*1.2,r*.33,r*.33);g.fill();g.fillStyle='#aab3c2';ell(g,r*.45,-r*1.2,r*.19,r*.19);g.fill();
    g.fillStyle='#3a2a2a';ell(g,r*.8,-r*.7,r*.09,r*.1);g.fill();g.fillStyle='#f4a9b4';ell(g,r*1.2,-r*.55,r*.1,r*.1);g.fill();
    /* 태엽 */
    g.save();g.translate(-r*.3,-r*1.25);g.strokeStyle='#d9a441';g.lineWidth=2.2;g.beginPath();g.moveTo(0,r*.3);g.lineTo(0,-r*.1);g.stroke();
    g.scale(Math.cos(T*5),1);g.beginPath();g.ellipse(-r*.25,-r*.35,r*.22,r*.26,0,0,7);g.ellipse(r*.25,-r*.35,r*.22,r*.26,0,0,7);g.stroke();g.restore();
    g.fillStyle='#5a6270';ell(g,-r*.5,-r*.06,r*.2,r*.2);g.fill();ell(g,r*.5,-r*.06,r*.2,r*.2);g.fill();g.restore()}
  function drawBalloon(g,u,sq){var r=u*.34;g.save();g.scale(1+sq*.12,1-sq*.14);
    g.strokeStyle='rgba(90,70,60,.6)';g.lineWidth=1.2;g.beginPath();g.moveTo(0,r*.95);g.quadraticCurveTo(r*.35*Math.sin(T*2),r*1.2,0,u*.5);g.stroke();
    var gr=g.createRadialGradient(-r*.3,-r*.5,r*.1,0,-r*.1,r*1.1);gr.addColorStop(0,'#ff9d9d');gr.addColorStop(1,'#e2485a');g.fillStyle=gr;
    ell(g,0,-r*.12+Math.sin(T*2.4)*r*.05,r*.92,r*1.05);g.fill();g.fillStyle='#e2485a';g.beginPath();g.moveTo(-r*.14,r*1.02);g.lineTo(r*.14,r*1.02);g.lineTo(0,r*.84);g.fill();
    g.fillStyle='rgba(255,255,255,.55)';ell(g,-r*.36,-r*.5,r*.16,r*.26);g.fill();g.restore()}
  function drawGlass(g,u,sq){var r=u*.3;g.save();g.translate(0,u*.5-r*1.02);g.scale(1+sq*.1,1-sq*.12);
    g.fillStyle='rgba(60,30,20,.14)';ell(g,0,r*1.02,r*.8,r*.14);g.fill();
    var gr=g.createRadialGradient(-r*.35,-r*.35,r*.05,0,0,r);gr.addColorStop(0,'#f2fdff');gr.addColorStop(.45,'#8fe3f0');gr.addColorStop(1,'#3fa9c4');g.fillStyle=gr;ell(g,0,0,r,r);g.fill();
    g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1.4;g.beginPath();g.arc(0,0,r*.72,PI*1.1,PI*1.55);g.stroke();
    g.fillStyle='#e0b24a';g.fillRect(-r*.22,-r*1.2,r*.44,r*.26);g.strokeStyle='#e0b24a';g.lineWidth=1.5;g.beginPath();g.arc(0,-r*1.3,r*.13,0,7);g.stroke();
    var tw=(Math.sin(T*3)+1)/2;g.fillStyle='rgba(255,255,255,'+(.4+.5*tw)+')';g.beginPath();g.moveTo(r*.35,-r*.1);g.lineTo(r*.42,r*.12);g.lineTo(r*.64,r*.19);g.lineTo(r*.42,r*.26);g.lineTo(r*.35,r*.48);g.lineTo(r*.28,r*.26);g.lineTo(r*.06,r*.19);g.lineTo(r*.28,r*.12);g.fill();
    g.restore()}
  function drawBowl(g,u){var r=u*.43;g.fillStyle='rgba(205,236,255,.4)';ell(g,0,0,r,r);g.fill();
    g.save();ell(g,0,0,r*.93,r*.93);g.clip();g.rotate(pend[3].p*.5);
    var wg=g.createLinearGradient(0,-r*.3,0,r);wg.addColorStop(0,'#7fd0ff');wg.addColorStop(1,'#3d8fd6');g.fillStyle=wg;g.beginPath();g.moveTo(-r*1.5,-r*.25);
    for(var i=-3;i<=3;i++)g.lineTo(i*r*.5,-r*.25+Math.sin(T*3+i)*r*.04);g.lineTo(r*1.5,r*1.5);g.lineTo(-r*1.5,r*1.5);g.fill();
    var fx=Math.sin(T*1.1)*r*.3,fd=Math.cos(T*1.1)>0?1:-1;g.save();g.translate(fx,r*.3);g.scale(fd,1);
    g.fillStyle='#ff9838';ell(g,0,0,r*.3,r*.18);g.fill();g.beginPath();g.moveTo(-r*.25,0);g.lineTo(-r*.5,-r*.17);g.lineTo(-r*.5,r*.17);g.fill();
    g.fillStyle='#fff';ell(g,r*.14,-r*.04,r*.06,r*.06);g.fill();g.fillStyle='#222';ell(g,r*.16,-r*.04,r*.03,r*.03);g.fill();g.restore();
    g.restore();g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=2;ell(g,0,0,r,r);g.stroke();
    g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=2;g.beginPath();g.arc(0,0,r*.74,PI*1.08,PI*1.4);g.stroke()}
  function drawCactus(g,u){var r=u*.3;g.strokeStyle='#e9f5d2';g.lineWidth=1.3;for(var i=0;i<12;i++){var a=i*PI/6+.2;g.beginPath();g.moveTo(Math.cos(a)*r*.9,Math.sin(a)*r*.9);g.lineTo(Math.cos(a)*r*1.42,Math.sin(a)*r*1.42);g.stroke()}
    var gr=g.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r);gr.addColorStop(0,'#9ee08a');gr.addColorStop(1,'#3f9a54');g.fillStyle=gr;ell(g,0,0,r,r);g.fill();
    g.strokeStyle='rgba(30,90,50,.45)';g.lineWidth=1.2;for(var k=-1;k<=1;k++){g.beginPath();g.ellipse(0,0,Math.abs(k)*r*.55+r*.02,r*.97,0,0,7);g.stroke()}
    g.fillStyle='#ff86b0';for(var p=0;p<5;p++){var b=p*PI*.4;ell(g,Math.cos(b)*r*.2,-r*.92+Math.sin(b)*r*.2,r*.16,r*.16);g.fill()}g.fillStyle='#ffe27a';ell(g,0,-r*.92,r*.12,r*.12);g.fill()}
  function drawGoal(g,u,kit,pulse){var w=u*(kit?.66:.84),c1=kit?'#d9a066':'#a78be8',c2=kit?'#a86f3a':'#7a5cc4';
    g.fillStyle='rgba(255,240,170,'+(.25+.2*pulse)+')';rr(g,-u*.48,-u*.48,u*.96,u*.96,u*.2);g.fill();
    g.fillStyle=c2;rr(g,-w/2,-w/2+2,w,w,w*.3);g.fill();g.fillStyle=c1;rr(g,-w/2,-w/2-1,w,w,w*.3);g.fill();
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1.3;g.setLineDash([3,3]);rr(g,-w/2+4,-w/2+3,w-8,w-8,w*.22);g.stroke();g.setLineDash([]);
    if(kit){g.strokeStyle=c2;g.lineWidth=1.2;for(var i=-1;i<=1;i++){g.beginPath();g.moveTo(-w*.32,i*w*.2);g.lineTo(w*.32,i*w*.2);g.stroke()}}
    /* 고양이 얼굴 표시 */
    var r=w*.2;g.fillStyle='rgba(255,255,255,.8)';ell(g,0,r*.15,r,r*.82);g.fill();g.beginPath();g.moveTo(-r*.95,-r*.1);g.lineTo(-r*.8,-r*1.1);g.lineTo(-r*.15,-r*.55);g.moveTo(r*.95,-r*.1);g.lineTo(r*.8,-r*1.1);g.lineTo(r*.15,-r*.55);g.fill()}
  function drawRoom(g,playing){var n=lv.n,u=S/n,k=fitK(),i,x,y,q,p;
    /* 책상에 드리운 그림자 */
    g.save();g.translate(CX,CY);g.fillStyle='rgba(20,15,35,.28)';ell(g,0,(H2+FR)*k*(Math.abs(Math.cos(ang))+Math.abs(Math.sin(ang)))+10,150*k,13);g.fill();
    g.scale(k,k);g.rotate(ang);
    var fg=g.createLinearGradient(-H2,-H2,H2,H2);fg.addColorStop(0,'#b07a50');fg.addColorStop(1,'#7d5236');g.fillStyle=fg;rr(g,-H2-FR,-H2-FR,S+2*FR,S+2*FR,12);g.fill();
    g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=2;rr(g,-H2-FR+2,-H2-FR+2,S+2*FR-4,S+2*FR-4,10);g.stroke();
    g.save();g.beginPath();g.rect(-H2,-H2,S,S);g.clip();
    /* 벽지 */
    g.fillStyle='#f7e6d3';g.fillRect(-H2,-H2,S,S);g.fillStyle='#f2d9c6';for(i=0;i<S/24;i+=2)g.fillRect(-H2+i*24,-H2,24,S);
    g.fillStyle='rgba(214,140,130,.35)';for(y=0;y<13;y++)for(x=0;x<13;x++)if((x+y)%2===0){var wx=-H2+12+x*24,wy=-H2+12+y*24;g.beginPath();g.moveTo(wx,wy-3.5);g.lineTo(wx+3.5,wy);g.lineTo(wx,wy+3.5);g.lineTo(wx-3.5,wy);g.fill()}
    /* 창문: 하늘은 화면 기준으로 똑바로 → 지평선이 기울어 보인다 */
    var wx0=-S*.21,wy0=-S*.19,ww=S*.34,wh=S*.34;g.save();g.beginPath();g.rect(wx0-ww/2,wy0-wh/2,ww,wh);g.clip();g.translate(wx0,wy0);g.rotate(-ang);
    var sg=g.createLinearGradient(0,-ww,0,ww);sg.addColorStop(0,'#7cc4ff');sg.addColorStop(.55,'#d8f1ff');sg.addColorStop(1,'#ffe9c2');g.fillStyle=sg;g.fillRect(-ww,-ww,ww*2,ww*2);
    g.fillStyle='#fff3b0';ell(g,ww*.2,-ww*.22,ww*.11,ww*.11);g.fill();
    g.fillStyle='rgba(255,255,255,.9)';for(i=0;i<3;i++){var cxp=((T*5+i*70)%(ww*2.4))-ww*1.2,cyp=-ww*.3+i*ww*.13;ell(g,cxp,cyp,ww*.17,ww*.06);g.fill();ell(g,cxp+ww*.1,cyp-ww*.04,ww*.1,ww*.06);g.fill()}
    g.fillStyle='#8fcf86';g.beginPath();g.moveTo(-ww,ww*.2);g.quadraticCurveTo(-ww*.4,-ww*.08,0,ww*.16);g.quadraticCurveTo(ww*.5,ww*.34,ww,ww*.08);g.lineTo(ww,ww);g.lineTo(-ww,ww);g.fill();
    g.fillStyle='#6fb873';g.fillRect(-ww,ww*.3,ww*2,ww);g.restore();
    g.strokeStyle='#fffaf0';g.lineWidth=5;g.strokeRect(wx0-ww/2,wy0-wh/2,ww,wh);g.lineWidth=3;g.beginPath();g.moveTo(wx0,wy0-wh/2);g.lineTo(wx0,wy0+wh/2);g.moveTo(wx0-ww/2,wy0);g.lineTo(wx0+ww/2,wy0);g.stroke();
    g.strokeStyle='rgba(120,80,50,.35)';g.lineWidth=1;g.strokeRect(wx0-ww/2-3,wy0-wh/2-3,ww+6,wh+6);
    /* 액자 둘: 못에 걸려 흔들린다 */
    var pics=[[S*.27,-S*.33,40,30,'#f6c8a8'],[S*.3,S*.16,28,34,'#b9dcc7']];
    for(i=0;i<2;i++){p=pics[i];g.save();g.translate(p[0],p[1]);g.fillStyle='#6b4a36';ell(g,0,0,2,2);g.fill();g.rotate(-ang+pend[i].p);
      g.strokeStyle='rgba(90,60,40,.7)';g.lineWidth=1;g.beginPath();g.moveTo(-p[2]*.4,9);g.lineTo(0,0);g.lineTo(p[2]*.4,9);g.stroke();
      g.fillStyle='rgba(60,30,20,.15)';g.fillRect(-p[2]/2+2,11,p[2],p[3]);g.fillStyle='#9a6a45';g.fillRect(-p[2]/2,9,p[2],p[3]);g.fillStyle=p[4];g.fillRect(-p[2]/2+4,13,p[2]-8,p[3]-8);
      g.fillStyle='rgba(255,255,255,.75)';if(i===0){g.beginPath();g.moveTo(-10,31);g.lineTo(-2,19);g.lineTo(5,31);g.fill();ell(g,8,19,3,3);g.fill()}else{ell(g,0,25,6,5);g.fill();g.beginPath();g.moveTo(-6,23);g.lineTo(-4,16);g.lineTo(0,21);g.lineTo(4,16);g.lineTo(6,23);g.fill()}
      g.restore()}
    /* 전등: 항상 지금의 아래쪽으로 늘어진다 */
    g.save();g.translate(S*.04,-S*.03);g.rotate(-ang+pend[2].p);var cl=S*.15;
    var lg=g.createRadialGradient(0,cl+12,2,0,cl+12,S*.3);lg.addColorStop(0,'rgba(255,236,160,.42)');lg.addColorStop(1,'rgba(255,236,160,0)');g.fillStyle=lg;ell(g,0,cl+12,S*.3,S*.3);g.fill();
    g.strokeStyle='#6b4a36';g.lineWidth=1.6;g.beginPath();g.moveTo(0,0);g.lineTo(0,cl);g.stroke();g.fillStyle='#6b4a36';ell(g,0,0,3,3);g.fill();
    g.fillStyle='#fff1b8';ell(g,0,cl+13,6,6);g.fill();g.fillStyle='#e9806e';g.beginPath();g.moveTo(-5,cl);g.lineTo(5,cl);g.lineTo(15,cl+13);g.lineTo(-15,cl+13);g.fill();
    g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.moveTo(-5,cl);g.lineTo(-1,cl);g.lineTo(-7,cl+13);g.lineTo(-15,cl+13);g.fill();g.restore();
    /* 격자 점 */
    g.fillStyle='rgba(120,80,60,.2)';for(y=1;y<n;y++)for(x=1;x<n;x++){ell(g,-H2+x*u,-H2+y*u,1.4,1.4);g.fill()}
    /* 방석·바구니 */
    var pulse=(Math.sin(T*3.2)+1)/2;
    for(i=0;i<2;i++){q=i?lv.goalK:lv.goalC;if(q<0)continue;p=cellPx(q%n,(q/n)|0);g.save();g.translate(p[0],p[1]);g.rotate(-ang);drawGoal(g,u,i===1,pulse);g.restore()}
    /* 선반·어항·선인장·꿀 */
    for(y=0;y<n;y++)for(x=0;x<n;x++){q=y*n+x;p=cellPx(x,y);
      if(lv.stat[q]===1){g.fillStyle='#8a5a3a';rr(g,p[0]-u/2+1,p[1]-u/2+1,u-2,u-2,5);g.fill();g.fillStyle='#bd8858';rr(g,p[0]-u/2+1,p[1]-u/2+1,u-2,u-5,5);g.fill();
        g.strokeStyle='rgba(110,70,40,.45)';g.lineWidth=1;g.beginPath();g.moveTo(p[0]-u*.32,p[1]-u*.14);g.lineTo(p[0]+u*.3,p[1]-u*.18);g.moveTo(p[0]-u*.28,p[1]+u*.14);g.lineTo(p[0]+u*.34,p[1]+u*.1);g.stroke();
        g.fillStyle='rgba(255,255,255,.25)';g.fillRect(p[0]-u/2+4,p[1]-u/2+3,u-8,2.5)}
      else if(lv.stat[q]===2){g.save();g.translate(p[0],p[1]);g.rotate(-ang);drawBowl(g,u);g.restore()}
      else if(lv.stat[q]===3){g.save();g.translate(p[0],p[1]);g.rotate(-ang);drawCactus(g,u);g.restore()}
      if(lv.honey[q]){g.save();g.translate(p[0],p[1]);g.fillStyle='rgba(240,170,40,.5)';rr(g,-u*.46,-u*.46,u*.92,u*.92,u*.26);g.fill();
        g.fillStyle='rgba(255,205,80,.6)';ell(g,-u*.12,-u*.1,u*.24,u*.2);g.fill();ell(g,u*.2,u*.18,u*.15,u*.13);g.fill();
        g.fillStyle='rgba(255,255,255,.6)';ell(g,-u*.2,-u*.2,u*.07,u*.04);g.fill();g.restore()}}
    /* 가구(방 좌표계에 그린다) */
    var sc=Math.cos(-ang),ss=Math.sin(-ang),shx=2.5*sc*0-3.5*ss*-1,shy=0;shx=-3.5*ss*-1;shx=3.5*Math.sin(ang);shy=3.5*Math.cos(ang);
    for(i=0;i<lv.objs.length;i++){var o=lv.objs[i],v=vo[i];if(o.t!=='blk'||!v.al)continue;var col=BLK[(o.id-1)%BLK.length],has={},j,c;
      for(j=0;j<o.cells.length;j++)has[o.cells[j][0]+','+o.cells[j][1]]=1;
      var bx=-H2+v.x*u,byy=-H2+v.y*u;
      g.fillStyle='rgba(50,25,20,.2)';for(j=0;j<o.cells.length;j++){c=o.cells[j];g.fillRect(bx+c[0]*u+1+shx,byy+c[1]*u+1+shy,u-2,u-2)}
      g.fillStyle=col[0];for(j=0;j<o.cells.length;j++){c=o.cells[j];var x0=bx+c[0]*u,y0=byy+c[1]*u,L=has[(c[0]-1)+','+c[1]]?0:1.5,R=has[(c[0]+1)+','+c[1]]?0:1.5,U=has[c[0]+','+(c[1]-1)]?0:1.5,D=has[c[0]+','+(c[1]+1)]?0:1.5;
        g.fillRect(x0+L,y0+U,u-L-R,u-U-D)}
      for(j=0;j<o.cells.length;j++){c=o.cells[j];var mx=bx+(c[0]+.5)*u,my=byy+(c[1]+.5)*u;
        g.fillStyle='rgba(255,255,255,.2)';rr(g,mx-u*.36,my-u*.36,u*.72,u*.72,5);g.fill();g.strokeStyle=col[1];g.lineWidth=1.5;rr(g,mx-u*.36,my-u*.36,u*.72,u*.72,5);g.stroke();
        g.fillStyle=col[1];ell(g,mx,my,u*.07,u*.07);g.fill();g.fillStyle='rgba(255,255,255,.6)';ell(g,mx-u*.02,my-u*.02,u*.025,u*.025);g.fill()}
      g.strokeStyle=col[1];g.lineWidth=2;g.beginPath();
      for(j=0;j<o.cells.length;j++){c=o.cells[j];x0=bx+c[0]*u;y0=byy+c[1]*u;
        if(!has[(c[0]-1)+','+c[1]]){g.moveTo(x0+1.5,y0+1);g.lineTo(x0+1.5,y0+u-1)}if(!has[(c[0]+1)+','+c[1]]){g.moveTo(x0+u-1.5,y0+1);g.lineTo(x0+u-1.5,y0+u-1)}
        if(!has[c[0]+','+(c[1]-1)]){g.moveTo(x0+1,y0+1.5);g.lineTo(x0+u-1,y0+1.5)}if(!has[c[0]+','+(c[1]+1)]){g.moveTo(x0+1,y0+u-1.5);g.lineTo(x0+u-1,y0+u-1.5)}}
      g.stroke()}
    /* 똑바로 서는 것들 */
    var mood=!playing?'sleep':winT>0?'purr':(failT>0||(A&&A.list))?'startle':awake>0?'loaf':'sleep';
    for(i=lv.objs.length-1;i>=0;i--){o=lv.objs[i];v=vo[i];if(o.t==='blk'||!v.al)continue;p=cellPx(v.x,v.y);
      g.save();g.translate(p[0],p[1]);g.rotate(-ang+v.rot);
      if(o.t==='cat')drawCat(g,u,mood,false,v.sq,0);else if(o.t==='kit')drawCat(g,u,mood,true,v.sq,2.1);
      else if(o.t==='bal')drawBalloon(g,u,v.sq);else if(o.t==='gls')drawGlass(g,u,v.sq);
      else if(o.t==='mou'){var hop=A&&A.k==='walk'&&!A.done[i]?-Math.abs(Math.sin(A.t/.26*PI*2))*u*.12:0;g.translate(0,hop);
        var gg=DIRS[st.o],dd=(vo[0].x-v.x)*(gg[0]?0:1)+(vo[0].y-v.y)*(gg[0]?1:0);var flip=(st.o===0||st.o===1)?dd<0:dd>0;drawMouse(g,u,v.sq,flip)}
      if(st.st[i]>0&&!A){g.fillStyle='rgba(245,180,50,.75)';ell(g,-u*.2,u*.4,u*.1,u*.07);g.fill();ell(g,u*.16,u*.42,u*.13,u*.06);g.fill();ell(g,0,u*.36,u*.06,u*.1);g.fill()}
      g.restore()}
    g.restore();
    /* 안쪽 가장자리 음영 */
    g.strokeStyle='rgba(70,40,25,.35)';g.lineWidth=3;g.strokeRect(-H2+1.5,-H2+1.5,S-3,S-3);
    g.restore()}
  function arcArrow(g,r,cw){g.beginPath();if(cw)g.arc(0,0,r,PI*.75,PI*2.02);else g.arc(0,0,r,PI*.25,PI*.98,true);g.stroke();
    var a=cw?PI*.02:PI*.98,ex=Math.cos(a)*r,ey=Math.sin(a)*r;g.save();g.translate(ex,ey);g.rotate(a+(cw?PI/2:-PI/2));g.beginPath();g.moveTo(r*.5,0);g.lineTo(-r*.25,-r*.45);g.lineTo(-r*.25,r*.45);g.closePath();g.fill();g.restore()}
  function drawUI(g,a,playing){var ko=a.lang==='ko',i;
    /* 시간 막대 */
    var f=Math.max(0,time/70);g.fillStyle='rgba(0,0,0,.28)';rr(g,16,36,328,8,4);g.fill();
    g.fillStyle=time<10?(Math.sin(T*10)>0?'#ff6b6b':'#ffb3a0'):'#ffd35a';if(f>0.01){rr(g,16,36,Math.max(8,328*f),8,4);g.fill()}
    g.textBaseline='alphabetic';g.textAlign='left';g.fillStyle='#fff8e8';g.font='20px Jua, system-ui, sans-serif';g.fillText((ko?'방 ':'Room ')+(idx+1),18,70);
    g.textAlign='right';g.font='15px Jua, system-ui, sans-serif';g.fillStyle=moves>lv.par?'#ffc9a8':'#fff8e8';
    g.fillText((ko?'목표 ':'Par ')+lv.par+(ko?' · 회전 ':' · Turns ')+moves,342,69);
    g.textAlign='center';g.fillStyle=time<10?'#ff9c8c':'#ffe9a8';g.font='16px Jua, system-ui, sans-serif';g.fillText(Math.ceil(time)+(ko?'초':'s'),180,69);
    /* 힌트 한 줄 */
    if(lv.hint){g.font='19px Jua, system-ui, sans-serif';if(g.measureText(lv.hint[a.lang]).width>336)g.font='16px Jua, system-ui, sans-serif';g.fillStyle='rgba(40,25,30,.35)';g.fillText(lv.hint[a.lang],181,466);g.fillStyle='#fff6d8';g.fillText(lv.hint[a.lang],180,464)}
    /* 버튼 */
    for(i=0;i<BTN.length;i++){var b=BTN[i],s=1-bp[i]*.12;g.save();g.translate(b.x,b.y);g.scale(s,s);
      if(idx===0&&moves===0&&b.k==='cw'){g.fillStyle='rgba(255,230,140,'+(.25+.25*Math.sin(T*5))+')';ell(g,0,0,b.r+9,b.r+9);g.fill()}
      g.fillStyle='rgba(50,25,15,.3)';ell(g,0,4,b.r,b.r);g.fill();
      var big=b.r>25,gr=g.createLinearGradient(0,-b.r,0,b.r);gr.addColorStop(0,big?'#fff4dc':'#f1dcc0');gr.addColorStop(1,big?'#f2cf96':'#d9b88e');g.fillStyle=gr;ell(g,0,0,b.r,b.r);g.fill();
      g.strokeStyle='#7d5236';g.fillStyle='#7d5236';g.lineWidth=big?4.5:3;g.lineCap='round';
      if(b.k==='cw')arcArrow(g,15,true);else if(b.k==='ccw')arcArrow(g,15,false);
      else if(b.k==='undo'){g.globalAlpha=undo.length?1:.35;g.beginPath();g.moveTo(-7,-3);g.lineTo(4,-3);g.arc(4,2,5,-PI/2,PI/2);g.lineTo(-3,7);g.stroke();g.beginPath();g.moveTo(-12,-3);g.lineTo(-5,-8.5);g.lineTo(-5,2.5);g.fill()}
      else{g.globalAlpha=moves?1:.35;g.beginPath();g.arc(0,0,8,-PI*.35,PI*1.3);g.stroke();g.save();g.translate(Math.cos(-PI*.35)*8,Math.sin(-PI*.35)*8);g.rotate(-PI*.35+PI/2);g.beginPath();g.moveTo(5,0);g.lineTo(-3,-5);g.lineTo(-3,5);g.fill();g.restore()}
      g.restore()}
    g.font='11px Jua, system-ui, sans-serif';g.fillStyle='rgba(60,35,20,.75)';g.textAlign='center';
    g.fillText(ko?'되돌리기':'Undo',136,610);g.fillText(ko?'처음부터':'Restart',188,610);
    /* 첫 방: 손으로 그린 화살표 */
    if(idx===0&&moves===0&&playing){var wob=Math.sin(T*6)*1.5;g.strokeStyle='#fff6d8';g.fillStyle='#fff6d8';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(248+wob,474);g.bezierCurveTo(286,478-wob,298+wob,496,278,522);g.stroke();
      g.beginPath();g.moveTo(272,532);g.lineTo(271+wob*.3,515);g.lineTo(288,523);g.closePath();g.fill();
      /* 방 위쪽에도 도는 방향 표시 */
      g.globalAlpha=.75;g.beginPath();g.arc(CX,CY,176,-PI*.62+wob*.004,-PI*.4);g.stroke();var ax=CX+Math.cos(-PI*.4)*176,ay=CY+Math.sin(-PI*.4)*176;g.save();g.translate(ax,ay);g.rotate(-PI*.4+PI/2);g.beginPath();g.moveTo(11,0);g.lineTo(-4,-8);g.lineTo(-4,8);g.fill();g.restore();g.globalAlpha=1}}
  function draw(g,a,dt){api=a;dt=dt||0;T+=dt;var playing=window.__sg?window.__sg.state().playing:false,i;
    /* 진자: 액자 2, 전등, 어항 물 */
    var K=[46,38,26,60],C=[3.6,3.1,2.4,5];for(i=0;i<4;i++){var p=pend[i];p.w+=(-K[i]*p.p-C[i]*p.w)*dt;p.p+=p.w*dt}
    for(i=0;i<vo.length;i++){if(!A||A.k!=='rot'||A.nc)vo[i].rot*=Math.exp(-13*dt);vo[i].sq*=Math.exp(-9*dt)}
    for(i=0;i<4;i++)bp[i]*=Math.exp(-10*dt);
    drawDesk(g);if(!lv)return;
    drawRoom(g,playing);
    /* 먼지 구름 */
    for(i=puffs.length-1;i>=0;i--){var pf=puffs[i];pf.t+=dt;if(pf.t>.45){puffs.splice(i,1);continue}var q=pf.t/.45;g.globalAlpha=.55*(1-q);g.fillStyle='#fff7e6';
      for(var s=-1;s<=1;s++){ell(g,pf.x+s*pf.w*(.4+q*.7),pf.y-q*5-Math.abs(s)*-2,4+q*7,3+q*5);g.fill()}g.globalAlpha=1}
    /* 잠꼬대 z z */
    if(lv&&!A&&winT<=0&&failT<=0&&(awake<=0||!playing)){var sp=objScreen(0);g.fillStyle='#fff6d8';g.textAlign='center';
      for(i=0;i<3;i++){var ph=(T*.6+i*.33)%1;g.globalAlpha=(1-ph)*.9;g.font=(10+ph*9)+'px Jua, system-ui, sans-serif';g.fillText('z',sp[0]+16+ph*14+Math.sin(ph*6)*3,sp[1]-14-ph*26)}g.globalAlpha=1}
    drawUI(g,a,playing);
    if(fade>0){fade=Math.max(0,fade-dt*3.2);g.fillStyle='rgba(255,246,220,'+fade*.85+')';g.fillRect(0,0,W,H)}}

  window.__rt={L:Logic,go:function(i){loadLevel(i)},info:function(){return{idx:idx,par:lv.par,path:lv.path,moves:moves,o:st.o,anim:!!A,time:time,win:winT>0,fail:failT>0}}};
  SG.run({id:'room-tumble',title:{ko:'데굴데굴 인형의 집',en:'Room Tumble'},
    how:{ko:'고양이는 쿨쿨, 움직일 수 있는 건 방뿐! 방을 90도씩 돌려 고양이를 방석 위에 떨어뜨려요. (밀기 ←→ · Z 되돌리기 · R 처음부터)',
         en:'The cat is fast asleep — you can only turn the room! Rotate it 90° at a time so the cat tumbles onto its cushion. (Swipe or ←→ · Z undo · R restart)'},
    init:init,update:update,draw:draw});
})();
