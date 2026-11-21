/* 극장 안내원 (Theater Usher) — 까다로운 동물 손님들을 좌석에 앉히고 상영 시작!
   좌석 규칙·판정·풀이기·레벨 생성은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports).
   좌표: r=0 이 스크린에 가장 가까운 앞줄(화면 아래쪽), c=0 이 왼쪽. 양 끝 칸(c=0, c=C-1)이 통로 옆 자리. */
(function(){
  'use strict';
  var W=360,H=640;
  var TALL={giraffe:1},SHORT={mouse:1,chick:1},NORMAL=['cat','bunny','bear','fox','pig'];
  var NAMES=[['보리','Bori'],['콩이','Kongi'],['두부','Tofu'],['호두','Walnut'],['모찌','Mochi'],['율무','Yulmu'],['단비','Danbi'],
    ['깨비','Kkaebi'],['누리','Nuri'],['찹쌀','Chapsal'],['라떼','Latte'],['밤톨','Chestnut'],['솜이','Fluff'],['감자','Potato'],
    ['몽실','Mongsil'],['구름','Cloud'],['초코','Choco'],['쑥이','Mugwort'],['나비','Nabi'],['방울','Bell'],['꼬미','Kkomi'],['자두','Plum']];
  var PAIRC=['#ff5d8f','#3fa7ff','#3fbf6a','#b07cff'];

  /* ---------- 손님 표기 ----------
     'cat'  'kid-bear'  'giraffe:pop'  'cat:quiet,aisle'  'fox#1'(커플 1번)  'kid-cat*2'(가족 2번)  'bear:pop@1,2'(고정 좌석 r,c) */
  function parseG(str){
    var m=/^([a-z-]+)(?::([a-z,]+))?(?:([#*])(\d+))?(?:@(\d+),(\d+))?$/.exec(str);
    if(!m)throw new Error('bad guest '+str);
    var base=m[1],kid=base.indexOf('kid-')===0,sp=kid?base.slice(4):base,t={};
    (m[2]?m[2].split(','):[]).forEach(function(k){t[k]=1});
    return {sp:sp,kid:kid,h:kid?0:TALL[sp]?2:SHORT[sp]?0:1,t:t,pid:m[4]!=null?+m[4]:-1,
      pk:m[3]==='*'?'family':m[3]==='#'?'couple':null,frc:m[5]!=null?[+m[5],+m[6]]:null}}
  function finish(P,salt){
    var byId={},i,g;
    for(i=0;i<P.guests.length;i++){g=P.guests[i];g.pair=-1;
      if(g.frc){g.fixed=g.frc[0]*P.C+g.frc[1];delete g.frc}else if(g.fixed==null)g.fixed=-1;
      g.name=(salt*5+i*3)%NAMES.length;g.shirt=(salt*3+i*5)%8;
      if(g.pid>=0){if(byId[g.pid]!=null){g.pair=byId[g.pid];P.guests[byId[g.pid]].pair=i}else byId[g.pid]=i}}
    if(!P.order){P.order=[];for(i=0;i<P.guests.length;i++)if(P.guests[i].fixed<0)P.order.push(i)}
    return P}
  function build(R,C,list,blocked,tip,salt){
    var P={R:R,C:C,N:R*C,blocked:[],guests:list.map(parseG),tip:tip||null},s;
    for(s=0;s<P.N;s++)P.blocked.push(false);
    (blocked||[]).forEach(function(rc){P.blocked[rc[0]*C+rc[1]]=true});
    return finish(P,salt)}

  /* ---------- 규칙 ---------- */
  function isCenter(C,c){return C%2?c===(C-1)/2:(c===C/2-1||c===C/2)}
  function frontLim(R){return Math.floor((R-1)/2)}
  function unary(P,g,s){var r=(s/P.C)|0,c=s%P.C;
    if(g.t.aisle&&c!==0&&c!==P.C-1)return 'aisle';
    if(g.t.center&&!isCenter(P.C,c))return 'center';
    if(g.t.glasses&&r>frontLim(P.R))return 'glasses';
    return null}
  function occOf(P,seat){var o=[],i;for(i=0;i<P.N;i++)o.push(-1);for(i=0;i<seat.length;i++)if(seat[i]>=0)o[seat[i]]=i;return o}
  /* 지각 손님이 통로에서 자리까지 지나쳐야 하는 (먼저 앉은) 손님 수 — 더 적은 쪽 통로 기준 */
  function passSide(P,occ,s){var C=P.C,r=(s/C)|0,c=s%C,L=0,Rt=0,k,j;
    for(k=0;k<c;k++){j=occ[r*C+k];if(j>=0&&!P.guests[j].t.late)L++}
    for(k=c+1;k<C;k++){j=occ[r*C+k];if(j>=0&&!P.guests[j].t.late)Rt++}
    return L<=Rt?{n:L,side:-1}:{n:Rt,side:1}}
  function evaluate(P,seat){
    var occ=occOf(P,seat),C=P.C,out=[],i,g,s,r,c,u,j,why,p;
    for(i=0;i<P.guests.length;i++){g=P.guests[i];s=seat[i];why=[];
      if(s<0){out.push(['none']);continue}
      r=(s/C)|0;c=s%C;u=unary(P,g,s);if(u)why.push(u);
      if(r>0){j=occ[s-C];if(j>=0&&P.guests[j].h>g.h)why.push('view')}
      if(g.t.quiet){if((c>0&&occ[s-1]>=0&&P.guests[occ[s-1]].t.pop)||(c<C-1&&occ[s+1]>=0&&P.guests[occ[s+1]].t.pop))why.push('noise')}
      p=g.pair;if(p>=0){var q=seat[p];if(q<0||((q/C)|0)!==r||Math.abs(q%C-c)!==1)why.push('pair')}
      if(g.t.late&&passSide(P,occ,s).n>1)why.push('late');
      out.push(why)}
    return out}
  function allHappy(res){for(var i=0;i<res.length;i++)if(res[i].length)return false;return true}
  function sig(P,i){var g=P.guests[i],t=Object.keys(g.t).sort().join(','),s=g.h+':'+t;
    if(g.pair>=0){var q=P.guests[g.pair];s+='|'+g.pk+(g.kid?'K':'')+'>'+q.h+':'+Object.keys(q.t).sort().join(',')}return s}
  function canon(P,occ,S){var a=[];for(var s=0;s<P.N;s++)a.push(occ[s]>=0?S[occ[s]]:P.blocked[s]?'#':'.');return a.join('/')}

  /* ---------- 풀이기: 서로 다른 배치(동일 손님 교환은 같은 배치로 침)를 cap+1개까지 센다 ----------
     opt.prefer: 현재 좌석 배열 — 이 좌석을 먼저 시도한다(힌트용, 대칭 제거 끔) */
  function solve(P,opt){
    opt=opt||{};var cap=opt.cap==null?3:opt.cap,limit=opt.limit||150000,prefer=opt.prefer||null;
    var n=P.guests.length,C=P.C,N=P.N,G=P.guests,seat=[],occ=[],i,s,k;
    for(i=0;i<N;i++)occ.push(-1);
    for(i=0;i<n;i++){seat.push(G[i].fixed);if(G[i].fixed>=0)occ[G[i].fixed]=i}
    var S=[];for(i=0;i<n;i++)S.push(sig(P,i));
    var vars=[],dom={};
    for(i=0;i<n;i++)if(G[i].fixed<0){var d=[];for(s=0;s<N;s++)if(!P.blocked[s]&&occ[s]<0&&!unary(P,G[i],s))d.push(s);
      if(prefer&&prefer[i]>=0){var pi=d.indexOf(prefer[i]);if(pi>0){d.splice(pi,1);d.unshift(prefer[i])}}
      dom[i]=d;vars.push(i)}
    vars.sort(function(a,b){return dom[a].length-dom[b].length||a-b});
    var order=[],used={};
    vars.forEach(function(v){if(used[v])return;order.push(v);used[v]=1;var p=G[v].pair;if(p>=0&&G[p].fixed<0&&!used[p]){order.push(p);used[p]=1}});
    var prev={};
    if(!prefer)for(k=0;k<order.length;k++){var v=order[k];if(G[v].pair>=0)continue;
      for(var k2=k-1;k2>=0;k2--){var w=order[k2];if(G[w].pair<0&&S[w]===S[v]){prev[v]=w;break}}}
    var lates=[];for(i=0;i<n;i++)if(G[i].t.late)lates.push(i);
    var nodes=0,seen={},sols=[],count=0,abort=false;
    function ok(i,s){var r=(s/C)|0,c=s%C,j,g=G[i];
      if(r>0){j=occ[s-C];if(j>=0&&G[j].h>g.h)return false}
      if(s+C<N){j=occ[s+C];if(j>=0&&g.h>G[j].h)return false}
      if(c>0){j=occ[s-1];if(j>=0&&((g.t.pop&&G[j].t.quiet)||(g.t.quiet&&G[j].t.pop)))return false}
      if(c<C-1){j=occ[s+1];if(j>=0&&((g.t.pop&&G[j].t.quiet)||(g.t.quiet&&G[j].t.pop)))return false}
      var p=g.pair;if(p>=0&&seat[p]>=0){var q=seat[p];if(((q/C)|0)!==r||Math.abs(q%C-c)!==1)return false}
      for(var a=0;a<lates.length;a++){var L=lates[a];if(seat[L]>=0&&((seat[L]/C)|0)===r&&passSide(P,occ,seat[L]).n>1)return false}
      return true}
    function rec(k){
      if(abort)return;if(++nodes>limit){abort=true;return}
      if(k===order.length){
        if(!allHappy(evaluate(P,seat)))return;
        var key=canon(P,occ,S);if(seen[key])return;seen[key]=1;count++;sols.push(seat.slice());
        if(count>cap)abort=true;return}
      var i=order[k],d=dom[i],lo=prev[i]!=null?seat[prev[i]]:-1;
      for(var a=0;a<d.length;a++){var s=d[a];if(occ[s]>=0||s<=lo)continue;
        occ[s]=i;seat[i]=s;
        if(ok(i,s))rec(k+1);
        occ[s]=-1;seat[i]=-1;if(abort)return}}
    rec(0);
    return {count:count,sols:sols,complete:!abort||count>cap,capped:count>cap,nodes:nodes}}

  /* ---------- 사소한 풀이(실패해야 정상) ---------- */
  /* 욕심쟁이: 줄 선 순서대로, 지금까지 앉은 손님과 부딪치지 않는 첫 좌석(앞줄 왼쪽부터)에 앉힌다 */
  function greedy(P){
    var G=P.guests,seat=G.map(function(g){return g.fixed}),k,s;
    for(k=0;k<P.order.length;k++){var i=P.order[k],placed=false;
      for(s=0;s<P.N&&!placed;s++){if(P.blocked[s]||seat.indexOf(s)>=0||unary(P,G[i],s))continue;
        seat[i]=s;var res=evaluate(P,seat),bad=false;
        for(var j=0;j<G.length&&!bad;j++){if(seat[j]<0)continue;
          for(var q=0;q<res[j].length;q++){var w=res[j][q];
            if(w==='pair'&&seat[G[j].pair]<0)continue;
            bad=true;break}}
        if(bad)seat[i]=-1;else placed=true}
      if(!placed)return {ok:false,seat:seat}}
    return {ok:allHappy(evaluate(P,seat)),seat:seat}}
  /* 그냥 채우기: 순서대로 빈 좌석에 */
  function naive(P){var seat=P.guests.map(function(g){return g.fixed}),s=0;
    for(var k=0;k<P.order.length;k++){while(s<P.N&&(P.blocked[s]||seat.indexOf(s)>=0))s++;seat[P.order[k]]=s++}
    return {ok:allHappy(evaluate(P,seat)),seat:seat}}

  /* ---------- 손수 만든 10개 상영관 ---------- */
  var HAND=[
    [2,3,['giraffe@0,1','cat','mouse','bunny','chick'],[],
      {ko:'손님을 탭하고 좌석을 탭! {tall}기린 바로 뒤는 안 보이고, {short}작은 손님은 앞이 트여야 해요',en:'Tap a guest, then a seat. {tall}Nobody sees past a giraffe; {short}little ones need a clear view'}],
    [2,4,['giraffe@0,1','cat#1','fox#1','mouse','bear','bunny','chick'],[],
      {ko:'같은 색 {heart} 커플은 같은 줄에 꼭 나란히!',en:'Same-color {heart} couples sit side by side in one row'}],
    [3,3,['bear:pop@1,1','giraffe','mouse','chick','bunny:quiet','cat:quiet','pig:quiet','fox:pop','bear:quiet'],[],
      {ko:'{pop} 팝콘 손님 바로 옆에 {quiet} 잠귀 밝은 손님은 안 돼요',en:'No {quiet} light sleeper right beside a {pop} popcorn muncher'}],
    [3,4,['giraffe@2,1','giraffe:center','fox:aisle','cat:center','bear:center','bunny:aisle','chick:aisle,quiet','mouse:pop','cat:aisle'],[[2,0],[2,3],[0,2]],
      {ko:'{aisle} 손님은 줄 끝 통로 옆, {center} 손님은 가운데 칸',en:'{aisle} wants an aisle end seat, {center} wants a middle column'}],
    [3,4,['kid-bunny:quiet*1','bunny:aisle*1','cat:glasses','giraffe:glasses','bear:glasses','mouse','fox:pop@1,1','pig:quiet,aisle','chick','cat'],[[2,0],[2,3]],
      {ko:'{family} 아기는 보호자 바로 옆, {glasses} 안경 손님은 앞쪽 절반 줄',en:'{family} Kids sit by their grown-up; {glasses} glasses sit in the front half'}],
    [3,5,['giraffe:aisle','giraffe@0,3','cat#1','pig#1','mouse:center','chick:aisle,pop','bunny:quiet,glasses','bear:pop,aisle','fox','cat:glasses,quiet'],[[0,2],[2,0],[2,4],[1,0]],
      {ko:'기린이 앞줄에? 그 뒤는 누가 앉죠?',en:'A giraffe up front? Who can sit behind it?'}],
    [3,5,['giraffe:center','bear@1,0','cat:late','pig','mouse','fox:aisle','bunny:aisle','fox:quiet@0,1','chick','chick','cat:pop@0,4'],[[2,0],[2,1],[2,3],[2,4]],
      {ko:'{late} 지각 손님은 영화 중에 들어와요. 통로에서 최대 1명만 지나갈 수 있어요',en:'{late} The late guest walks in mid-film and may squeeze past only 1 guest'}],
    [4,4,['giraffe@1,1','kid-fox*1','fox:aisle*1','mouse:glasses,center','bunny:aisle,quiet','cat:pop,aisle','pig:quiet,aisle','bear:center@0,2','chick','giraffe:aisle','bear:pop'],[[3,0],[3,3],[0,0]],
      {ko:'네 줄 극장! 키 순서를 생각해요',en:'Four rows now. Think in height order'}],
    [4,5,['giraffe:aisle,glasses','bear:glasses#1','cat:aisle#1','mouse:glasses','chick:glasses','fox:pop,glasses','bunny:quiet','pig:quiet,aisle','giraffe:center,quiet','kid-cat*2@2,2','cat:late*2'],[[0,0],[0,4],[3,2],[3,0],[3,4],[2,0]],
      {ko:'지각한 보호자가 아기 옆으로!',en:'A late grown-up must reach their kid!'}],
    [4,4,['giraffe','giraffe:aisle','cat:late','pig:pop@2,2','bear@2,3','fox#1','bear#1','bunny:quiet','kid-pig:aisle*2','pig*2','mouse:center,pop','chick'],[[3,0],[3,2],[3,3],[1,2]],
      {ko:'만석! 오늘의 특별 상영',en:'Full house! Tonight\'s special screening'}]
  ];
  function getHand(i){var d=HAND[i];return build(d[0],d[1],d[2],d[3],d[4],i+1)}

  /* ---------- 레벨 생성 (레벨 번호로 시드 고정 → 검증 스크립트가 같은 퍼즐을 증명) ---------- */
  function rng(seed){var s=(seed>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function shuffle(a,rnd){for(var i=a.length-1;i>0;i--){var j=(rnd()*(i+1))|0,t=a[i];a[i]=a[j];a[j]=t}return a}
  var MAXSOL=3;
  function tryGen(n,rnd){
    var d=n-10,sizes=d<6?[[3,4],[3,4],[3,5]]:d<16?[[3,5],[4,4],[3,4]]:[[4,4],[4,5],[3,5]];
    var sz=sizes[(rnd()*sizes.length)|0],R=sz[0],C=sz[1],N=R*C,s,i,c,r;
    var P={R:R,C:C,N:N,blocked:[],guests:[],tip:null};for(s=0;s<N;s++)P.blocked.push(false);
    /* 거의 만석: 줄 선 손님 5~10명 + 미리 앉은 손님, 남는 좌석은 0~1개, 나머지는 고장 좌석 */
    var q=Math.min(10,7+Math.floor(d/6)+((rnd()*2)|0)),nf0=N>=15?2:1,ng=q+nf0,emp=rnd()<.5?0:1;
    if(ng+emp>N-1){ng=N-1-emp;q=ng-nf0}
    var all=[];for(s=0;s<N;s++)all.push(s);shuffle(all,rnd);
    for(i=0;i<N-ng-emp;i++)P.blocked[all[i]]=true;
    var free=[];for(s=0;s<N;s++)if(!P.blocked[s])free.push(s);
    shuffle(free,rnd);var tgt=free.slice(0,ng),occ=[];for(s=0;s<N;s++)occ.push(-1);
    for(i=0;i<ng;i++){var x=rnd();P.guests.push({sp:'',kid:false,h:x<.22?2:x<.42?0:1,t:{},pid:-1,pk:null,fixed:-1});occ[tgt[i]]=i}
    /* 시야 규칙이 맞도록 앞에서부터 키를 올린다 */
    for(r=1;r<R;r++)for(c=0;c<C;c++){s=r*C+c;var j=occ[s],f=occ[s-C];if(j>=0&&f>=0&&P.guests[f].h>P.guests[j].h)P.guests[j].h=P.guests[f].h}
    /* 짝 */
    var np=rnd()<.25?0:rnd()<.7?1:2,pid=1;
    for(var tries=0;tries<30&&np>0;tries++){s=tgt[(rnd()*ng)|0];c=s%C;if(c===C-1)continue;
      var a=occ[s],b=occ[s+1];if(b<0||P.guests[a].pid>=0||P.guests[b].pid>=0)continue;
      var fam=d>=2&&rnd()<.45;
      if(fam){var kidL=rnd()<.5,ks=kidL?s:s+1,ki=occ[ks],pi=occ[kidL?s+1:s];
        var fr=ks>=C?occ[ks-C]:-1;
        if(fr<0||P.guests[fr].h===0){P.guests[ki].h=0;P.guests[ki].kid=true;P.guests[ki].pk=P.guests[pi].pk='family';
          P.guests[ki].pid=P.guests[pi].pid=pid++;np--;continue}}
      P.guests[a].pk=P.guests[b].pk='couple';P.guests[a].pid=P.guests[b].pid=pid++;np--}
    for(i=0;i<nf0;i++)P.guests[i].fixed=tgt[i];
    finish(P,n);
    var seatT=[];for(i=0;i<ng;i++)seatT.push(tgt[i]);
    if(!allHappy(evaluate(P,seatT)))return null;
    var pool=['pop','quiet','aisle','center','pop','quiet'];if(d>=0)pool.push('glasses');if(d>=3)pool.push('late');
    function nTr(g){return Object.keys(g.t).length+(g.pair>=0?1:0)}
    function addTrait(i){var g=P.guests[i],k=pool[(rnd()*pool.length)|0];
      if(g.t[k]||nTr(g)>=2)return false;if((k==='pop'&&g.t.quiet)||(k==='quiet'&&g.t.pop))return false;
      if(k==='late'){for(var q=0;q<ng;q++)if(P.guests[q].t.late)return false}
      g.t[k]=1;if(allHappy(evaluate(P,seatT)))return true;delete g.t[k];return false}
    for(i=0;i<ng;i++)if(rnd()<.45)addTrait(i);
    var res=solve(P,{cap:MAXSOL,limit:150000}),it=0,nfix=nf0,maxB=N;
    while((!res.complete||res.count>MAXSOL)&&it<90){it++;var m=rnd(),ch=false;
      if(m<.62)ch=addTrait((rnd()*ng)|0);
      else if(m<.74){i=(rnd()*ng)|0;var g=P.guests[i];if(!g.kid&&g.h===1){g.h=rnd()<.5?2:0;if(allHappy(evaluate(P,seatT)))ch=true;else g.h=1}}
      else if(m<.9){var nbk=0;for(s=0;s<N;s++)if(P.blocked[s])nbk++;
        if(nbk<maxB){s=(rnd()*N)|0;if(!P.blocked[s]&&occ[s]<0){P.blocked[s]=true;ch=true}}}
      else if(nfix<nf0+1){i=(rnd()*ng)|0;if(P.guests[i].fixed<0){P.guests[i].fixed=seatT[i];nfix++;ch=true}}
      if(ch)res=solve(P,{cap:MAXSOL,limit:150000})}
    if(!res.complete||res.count>MAXSOL||res.count<1)return null;
    /* 줄 순서를 섞어 욕심쟁이 풀이가 실패하는 순서를 고른다 */
    var base=[];for(i=0;i<ng;i++)if(P.guests[i].fixed<0)base.push(i);
    if(base.length<4)return null;
    for(var o=0;o<16;o++){P.order=shuffle(base.slice(),rnd);if(!greedy(P).ok&&!naive(P).ok){
      for(i=0;i<ng;i++){var gg=P.guests[i];
        gg.sp=gg.h===2?'giraffe':gg.h===0&&!gg.kid?(rnd()<.5?'mouse':'chick'):NORMAL[(rnd()*NORMAL.length)|0]}
      P.sol=seatT;P.nsol=res.count;return P}}
    return null}
  var genCache={};
  function genLevel(n){if(genCache[n])return genCache[n];
    for(var att=0;att<150;att++){var P=tryGen(n,rng(n*7919+att*104729+13));if(P){P.att=att;genCache[n]=P;return P}}
    var F=getHand(n%HAND.length);genCache[n]=F;return F}
  function getLevel(n){return n<HAND.length?getHand(n):genLevel(n)}

  var API={HAND:HAND,getHand:getHand,genLevel:genLevel,getLevel:getLevel,evaluate:evaluate,allHappy:allHappy,solve:solve,
    greedy:greedy,naive:naive,unary:unary,passSide:passSide,occOf:occOf,isCenter:isCenter,frontLim:frontLim,build:build};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  if(typeof SG==='undefined')return;
  /* ================= 게임 화면 ================= */
  var SPC={cat:['#f2a65a','#b8692a','#ffd6b5'],bunny:['#f6efe6','#bfae9b','#ffb7c5'],bear:['#a8744f','#6b4428','#e3b88f'],
    fox:['#ff8a3d','#c2541a','#fff3e6'],pig:['#ffb6c3','#d77a8f','#ff93a8'],giraffe:['#ffd166','#c98a2b','#fff1c4'],
    mouse:['#b9bdca','#7d8292','#ffb3c3'],chick:['#ffe066','#e0a400','#ffad5a']};
  var SPN={cat:['고양이','cat'],bunny:['토끼','bunny'],bear:['곰','bear'],fox:['여우','fox'],pig:['돼지','pig'],giraffe:['기린','giraffe'],mouse:['생쥐','mouse'],chick:['병아리','chick']};
  var SHIRT=['#5b8def','#ef6f6c','#43b77a','#9a6cf0','#f0a23b','#2fb4c8','#e86bb0','#7c8a99'];
  var TXT={
    tall:['키가 커요 — 바로 뒷자리를 가려요','Tall: blocks the seat right behind'],
    short:['키가 작아요 — 앞자리에 더 큰 손님이 있으면 안 보여요','Short: can\'t see past anyone taller in front'],
    normal:['보통 키 — 앞에 기린이 있으면 안 보여요','Average height: can\'t see past a giraffe'],
    pop:['팝콘 와삭와삭 — 양옆 잠귀 밝은 손님이 싫어해요','Crunchy popcorn: annoys light sleepers beside'],
    quiet:['잠귀 밝음 — 바로 옆 팝콘 손님은 싫어요','Light sleeper: no popcorn right beside'],
    couple:['커플 — 같은 줄 바로 옆자리에','Couple: must sit side by side'],
    kid:['아기 — 보호자 바로 옆에','Kid: must sit right by their grown-up'],
    parent:['보호자 — 아기 바로 옆에','Grown-up: must sit right by their kid'],
    aisle:['통로파 — 줄 맨 끝(통로 옆) 자리만','Aisle fan: only an end seat by the aisle'],
    center:['가운데파 — 가운데 칸만','Center fan: middle column only'],
    glasses:['눈이 나빠요 — 앞쪽 절반 줄만','Near-sighted: front half rows only'],
    late:['지각 — 영화 중에 들어와요. 최대 1명만 지나가요','Late: walks in mid-film, may pass only 1 guest'],
    fixed:['이미 앉은 손님 — 옮길 수 없어요','Already seated: can\'t be moved']};
  var WHY={view:['안 보여!','Can\'t see!'],noise:['와삭와삭 시끄러워!','Too crunchy!'],pair:['짝이랑 떨어졌어!','I miss my buddy!'],
    aisle:['통로 쪽이 좋은데…','I wanted the aisle…'],center:['가운데가 좋은데…','I wanted the middle…'],glasses:['너무 멀어서 흐려…','Too far, all blurry…'],
    late:['너무 많이 지나갔어…','Squeezed past too many…']};
  var WICON={view:'eye',noise:'pop',pair:'heart',aisle:'aisle',center:'center',glasses:'glasses',late:'late'};

  var P,lvN,seat,sel,press,drag,mode,modeT,time,hints,fails,marks,res,walkers,reveal,revealAt,hop,bump,blink,hintGlow,
      cur,lastQ=0,kbOn,prevDown,hover,infoI,warned,tG=0,motes,lastGain,usher,noteMsg,noteT,winStars;
  var keyQ=[];
  if(!window.__usherKeys){window.__usherKeys=true;
    window.addEventListener('keydown',function(e){var c=e.code,k=null;
      if(c==='ArrowLeft'||c==='KeyA')k='L';else if(c==='ArrowRight'||c==='KeyD')k='R';else if(c==='ArrowUp'||c==='KeyW')k='U';
      else if(c==='ArrowDown'||c==='KeyS')k='D';else if(c==='Space')k='act';else if(c==='Enter'||c==='NumpadEnter')k='go';
      else if(c==='KeyH')k='hint';else if(c==='Backspace'||c==='Delete'||c==='KeyX'||c==='Escape')k='back';
      if(k&&!e.repeat){keyQ.push(k);if(k==='back'||k==='go')e.preventDefault()}})}
  /* 눌린 바로 그 위치를 기억한다(프레임 사이에 손가락이 움직여도 집은 손님을 놓치지 않게) */
  var downAt=null;
  if(!window.__usherPtr){window.__usherPtr=true;
    window.addEventListener('pointerdown',function(e){var cv=document.querySelector('#stage canvas');if(!cv||e.target!==cv)return;
      var r=cv.getBoundingClientRect();downAt={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}},true)}

  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  /* ---------- 배치 계산 ---------- */
  var AW=24,GBOT=440;
  function lay(){var C=P.C,R=P.R,sw=Math.min(52,Math.floor((W-16-2*AW)/C)),rh=Math.min(60,Math.floor(250/R));
    return {sw:sw,rh:rh,x0:(W-C*sw)/2,gw:C*sw}}
  function seatXY(s){var L=lay(),r=(s/P.C)|0,c=s%P.C;return {x:L.x0+(c+.5)*L.sw,y:GBOT-r*L.rh-14,top:GBOT-(r+1)*L.rh,L:L}}
  function queue(){var q=[];for(var k=0;k<P.order.length;k++){var i=P.order[k];if(seat[i]<0&&!(drag&&drag.i===i))q.push(i)}return q}
  function queueSlots(){var q=[],all=[],k,i;for(k=0;k<P.order.length;k++){i=P.order[k];if(seat[i]<0)all.push(i)}
    var per=6,rows=all.length>per?2:1,out=[];
    for(k=0;k<all.length;k++){var row=rows===2?(k<Math.ceil(all.length/2)?0:1):0,inRow=rows===2?(row?all.length-Math.ceil(all.length/2):Math.ceil(all.length/2)):all.length,
      idx=row?k-Math.ceil(all.length/2):k,sp=Math.min(54,300/Math.max(1,inRow));
      out.push({i:all[k],x:W/2+(idx-(inRow-1)/2)*sp,y:rows===2?(row?166:118):146})}
    return out}
  function occAll(){return occOf(P,seat)}
  function hit(x,y){
    if(y>=550&&y<=598){if(x>=64&&x<=140)return {k:'hint'};if(x>=148&&x<=306)return {k:'go'}}
    var qs=queueSlots(),k;
    for(k=qs.length-1;k>=0;k--){var q=qs[k];if(Math.abs(x-q.x)<24&&y>q.y-44&&y<q.y+10)return {k:'q',i:q.i}}
    var L=lay();
    if(x>=L.x0&&x<L.x0+L.gw&&y<GBOT&&y>=GBOT-P.R*L.rh){var c=Math.floor((x-L.x0)/L.sw),r=Math.floor((GBOT-y)/L.rh),s=r*P.C+c;
      return {k:'s',s:s,i:occAll()[s]}}
    if(y>60&&y<GBOT-P.R*L.rh-4)return {k:'lobby'};
    return null}

  /* ---------- 레벨 ---------- */
  function load(n){lvN=n;P=getLevel(n);seat=P.guests.map(function(g){return g.fixed});
    sel=-1;press=null;drag=null;mode='edit';modeT=0;hints=0;fails=0;marks=null;res=null;walkers=[];reveal=[];
    hop=P.guests.map(function(){return 0});bump=hop.slice();blink=P.guests.map(function(g,i){return 1+hash(i+n*3)*3});hintGlow=hop.slice();
    infoI=-1;cur={z:'q',i:0,r:0,c:0};noteMsg=null;noteT=0;winStars=0}
  function init(a){time=50;kbOn=false;prevDown=true;warned=0;lastGain=0;keyQ.length=0;
    motes=[];for(var i=0;i<26;i++)motes.push({x:hash(i+1)*W,y:hash(i+7)*H,v:4+hash(i+3)*8,p:hash(i+5)*6.28,r:.8+hash(i+9)*1.6});
    usher={look:0,mood:0,moodT:0,blinkT:2};load(0);a.tempo(1)}
  function note(m){noteMsg=m;noteT=2.2}
  function allSeated(){for(var i=0;i<seat.length;i++)if(seat[i]<0)return false;return true}
  function left(){var n=0;for(var i=0;i<seat.length;i++)if(seat[i]<0)n++;return n}
  function mood(m,t){usher.mood=m;usher.moodT=t||1.4}

  function place(i,s,a){
    if(s<0||P.blocked[s]){a.beep(150,.12,'square');note('broken');mood(2,.8);return false}
    var j=occAll()[s];if(j===i){sel=-1;return true}
    if(j>=0&&P.guests[j].fixed>=0){a.beep(150,.12,'square');note('fixed');mood(2,.8);return false}
    var from=seat[i];seat[i]=s;if(j>=0){seat[j]=from;hop[j]=1}
    if(marks){marks[i]=[];if(j>=0)marks[j]=[]}
    sel=-1;hop[i]=1;var p=seatXY(s);
    a.beep(520+((s*37)%7)*40,.07,'triangle');a.burst(p.x,p.y-6,'#ffcf7a',5);
    if(allSeated()){a.beep(784,.09,'sine');a.beep(1046,.14,'sine');mood(1,1)}
    return true}
  function unseat(i,a){if(i<0||P.guests[i].fixed>=0)return;seat[i]=-1;sel=-1;if(marks)marks[i]=[];a.beep(330,.06,'triangle')}
  function doHint(a){
    if(mode!=='edit')return;
    var r=solve(P,{cap:0,limit:500000,prefer:seat});if(!r.sols.length){a.beep(150,.12);return}
    var sol=r.sols[0],occ=occAll(),S=P.guests.map(function(g,i){return sigOf(i)}),pick=-1,k,i;
    for(k=0;k<P.order.length&&pick<0;k++){i=P.order[k];if(seat[i]<0)continue;var o=occ[sol[i]];if(o<0||S[o]!==S[i])pick=i}
    for(k=0;k<P.order.length&&pick<0;k++){i=P.order[k];if(seat[i]<0)pick=i}
    if(pick<0){note('perfect');a.sfx('coin');return}
    /* 같은 손님끼리는 바꿔도 같으니, 그 자리에 이미 같은 종류가 앉아 있으면 다음 후보 */
    hints++;place(pick,sol[pick],a);hintGlow[pick]=1.6;var p=seatXY(sol[pick]);
    a.pop(p.x,p.y-40,a.lang==='ko'?'여기!':'Here!','#ffe27a');a.sfx('coin');mood(1,1)}
  function sigOf(i){var g=P.guests[i],s=g.h+':'+Object.keys(g.t).sort().join(',');if(g.pair>=0)s+='|'+g.pk+(g.kid?'K':'');return s}

  function startShow(a){
    if(mode!=='edit')return;
    if(!allSeated()){note('left');a.beep(200,.1,'square');mood(2,.8);return}
    sel=-1;drag=null;press=null;mode='show';modeT=0;res=evaluate(P,seat);marks=null;
    var occ=occAll(),L=lay();walkers=[];
    for(var i=0;i<P.guests.length;i++)if(P.guests[i].t.late){var ps=passSide(P,occ,seat[i]),p=seatXY(seat[i]);
      walkers.push({i:i,x0:ps.side<0?L.x0-AW/2:L.x0+L.gw+AW/2,x1:p.x,y:p.y,done:false,passed:{}})}
    reveal=[];var order=P.guests.map(function(g,i){return i}).sort(function(x,y){return seat[x]-seat[y]});
    var t0=walkers.length?2.3:1.1;revealAt={};order.forEach(function(i,k){revealAt[i]=t0+k*.12});
    a.beep(98,.5,'sine');a.beep(147,.5,'sine')}
  function finishShow(a){
    if(allHappy(res)){
      winStars=hints?1:fails?2:3;var pts=winStars*10+P.order.length*2+lvN;a.add(pts);
      var bonus=10+P.order.length*2;time=Math.min(99,time+bonus);lastGain=bonus;
      mode='win';modeT=0;a.sfx('win');mood(1,2.6);
      ['#ffd23f','#ff7a8a','#6fc3ff','#8be28b','#fff'].forEach(function(c,k){a.burst(80+k*50,300,c,10)});
      a.pop(W/2,250,'+'+pts,'#ffd23f');a.tempo(1+Math.min(.4,lvN*.03))}
    else{fails++;marks=res;mode='fail';modeT=0;a.sfx('hit');a.shake(5);mood(2,2.4)}}

  /* ---------- 입력 ---------- */
  function pdown(x,y,a){
    if(mode==='win'){if(modeT>.7)load(lvN+1);return}
    if(mode==='fail'){mode='edit';return}
    if(mode!=='edit')return;
    var h=hit(x,y);infoI=-1;
    if(!h){sel=-1;return}
    if(h.k==='hint'){doHint(a);return}
    if(h.k==='go'){startShow(a);return}
    if(h.k==='q'){press={i:h.i,x0:x,y0:y};return}
    if(h.k==='s'){
      if(h.i>=0&&P.guests[h.i].fixed<0){press={i:h.i,x0:x,y0:y};return}
      if(h.i>=0){infoI=h.i;if(sel>=0)place(sel,h.s,a);else a.beep(300,.05,'triangle');return}
      if(sel>=0)place(sel,h.s,a);else if(P.blocked[h.s]){note('broken');a.beep(180,.06)}
      return}
    if(h.k==='lobby'){if(sel>=0&&seat[sel]>=0)unseat(sel,a);else sel=-1}}
  function pmove(x,y){if(!press)return;if(!drag&&Math.hypot(x-press.x0,y-press.y0)>9){drag={i:press.i,x:x,y:y};sel=-1}
    if(drag){drag.x=x;drag.y=y}}
  function pup(x,y,a){var pr=press;press=null;if(!pr)return;
    if(drag){var i=drag.i;drag=null;var h=hit(x,y);
      if(h&&h.k==='s')place(i,h.s,a);
      else if(h&&(h.k==='lobby'||h.k==='q'))unseat(i,a);
      return}
    var i2=pr.i;
    if(sel>=0&&sel!==i2&&seat[i2]>=0){place(sel,seat[i2],a);return}
    if(sel===i2){sel=-1;a.beep(360,.04,'triangle')}else{sel=i2;hop[i2]=.6;a.beep(620,.05,'triangle');a.beep(820,.05,'triangle')}}
  function key(k,a){kbOn=true;
    if(mode==='win'){if((k==='act'||k==='go')&&modeT>.7)load(lvN+1);return}
    if(mode==='fail'){if(k==='act'||k==='go'||k==='back')mode='edit';return}
    if(mode!=='edit')return;
    if(k==='go'){startShow(a);return}
    if(k==='hint'){doHint(a);return}
    var qs=queueSlots(),L=lay();
    if(cur.z==='q'&&!qs.length)cur={z:'s',r:P.R-1,c:Math.floor(P.C/2)};
    function near(x){var c=Math.floor((x-L.x0)/L.sw);return Math.max(0,Math.min(P.C-1,c))}
    if(k==='L'||k==='R'){var d=k==='L'?-1:1;
      if(cur.z==='q')cur.i=Math.max(0,Math.min(qs.length-1,cur.i+d));
      else if(cur.z==='s')cur.c=Math.max(0,Math.min(P.C-1,cur.c+d));
      else cur.i=d<0?0:1;
      a.beep(500,.025,'triangle');return}
    if(k==='U'){if(cur.z==='b')cur={z:'s',r:0,c:cur.i?Math.floor(P.C/2):0};
      else if(cur.z==='s'){if(cur.r<P.R-1)cur.r++;else if(qs.length){var best=0,bd=1e9,sx=L.x0+(cur.c+.5)*L.sw;
        qs.forEach(function(q,k2){var dd=Math.abs(q.x-sx)+(q.y>140?0:30);if(dd<bd){bd=dd;best=k2}});cur={z:'q',i:best}}}
      else{var q0=qs[cur.i];if(q0){var up=-1,bd2=1e9;qs.forEach(function(q,k2){if(q.y<q0.y-10){var dd=Math.abs(q.x-q0.x);if(dd<bd2){bd2=dd;up=k2}}});if(up>=0)cur.i=up}}
      a.beep(540,.025,'triangle');return}
    if(k==='D'){if(cur.z==='q'){var q1=qs[cur.i],dn=-1,bd3=1e9;if(q1)qs.forEach(function(q,k2){if(q.y>q1.y+10){var dd=Math.abs(q.x-q1.x);if(dd<bd3){bd3=dd;dn=k2}}});
        if(dn>=0)cur.i=dn;else cur={z:'s',r:P.R-1,c:q1?near(q1.x):0}}
      else if(cur.z==='s'){if(cur.r>0)cur.r--;else cur={z:'b',i:1}}
      a.beep(460,.025,'triangle');return}
    var s=cur.z==='s'?cur.r*P.C+cur.c:-1,occ=occAll();
    if(k==='back'){if(sel>=0&&seat[sel]>=0)unseat(sel,a);else if(s>=0&&occ[s]>=0)unseat(occ[s],a);else sel=-1;return}
    if(k==='act'){
      if(cur.z==='b'){if(cur.i)startShow(a);else doHint(a);return}
      if(cur.z==='q'){var qq=qs[cur.i];if(!qq)return;lastQ=cur.i;if(sel===qq.i)sel=-1;else{sel=qq.i;hop[sel]=.6;a.beep(620,.05,'triangle')}return}
      if(sel>=0){if(place(sel,s,a)){var q2=queueSlots();if(q2.length)cur={z:'q',i:Math.min(lastQ,q2.length-1)}}return}
      if(occ[s]>=0&&P.guests[occ[s]].fixed<0){sel=occ[s];hop[sel]=.6;a.beep(620,.05,'triangle')}else if(occ[s]>=0){infoI=occ[s];a.beep(300,.05)}}}

  function update(dt,inp,a){
    var i;
    if(mode==='edit'){time-=dt;if(time<=0){time=0;a.over();return}
      if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(880,.05,'square')}}
    while(keyQ.length)key(keyQ.shift(),a);
    var fresh=inp.down&&!prevDown,rel=!inp.down&&prevDown;
    if(fresh&&inp.x!=null){kbOn=false;var d0=downAt||{x:inp.x,y:inp.y};downAt=null;pdown(d0.x,d0.y,a)}
    if(inp.down&&inp.x!=null)pmove(inp.x,inp.y);
    if(rel&&inp.x!=null)pup(inp.x,inp.y,a);else if(rel)press=null;
    hover=-1;
    if(!kbOn&&inp.x!=null&&mode!=='show'){var h=hit(inp.x,inp.y);if(h&&(h.k==='q'||(h.k==='s'&&h.i>=0)))hover=h.i}
    else if(kbOn){if(cur.z==='q'){var qs=queueSlots();if(qs[cur.i])hover=qs[cur.i].i}else if(cur.z==='s')hover=occAll()[cur.r*P.C+cur.c]}
    modeT+=dt;
    if(mode==='show'){
      for(i=0;i<walkers.length;i++){var w=walkers[i],t=Math.max(0,Math.min(1,(modeT-.8)/1.3)),x=w.x0+(w.x1-w.x0)*t;w.x=x;
        var occ=occAll();for(var c=0;c<P.C;c++){var s=((seat[w.i]/P.C)|0)*P.C+c,j=occ[s];if(j<0||j===w.i||P.guests[j].t.late)continue;
          var sx=seatXY(s).x;if(!w.passed[j]&&Math.abs(sx-x)<6&&t<1){w.passed[j]=1;bump[j]=1;a.beep(700,.04,'triangle');a.pop(sx,w.y-46,a.lang==='ko'?'실례~':'Sorry~','#fff')}}
        if(t>=1&&!w.done){w.done=true;hop[w.i]=1;a.beep(440,.08,'triangle')}}
      for(i=0;i<P.guests.length;i++)if(!reveal[i]&&modeT>=revealAt[i]){reveal[i]=true;var p=seatXY(seat[i]);
        if(res[i].length){a.beep(170,.14,'sawtooth');bump[i]=1;a.burst(p.x,p.y-30,'#ff6b6b',5)}
        else{a.beep(620+i*35,.08,'triangle');a.burst(p.x,p.y-34,'#ffd1e0',4)}}
      var last=0;for(i in revealAt)last=Math.max(last,revealAt[i]);
      if(modeT>last+.75)finishShow(a)}
    else if(mode==='win'){if(modeT>3)load(lvN+1)}
    else if(mode==='fail'){if(modeT>3.2)mode='edit'}
    for(i=0;i<hop.length;i++){hop[i]=Math.max(0,hop[i]-dt*3);bump[i]=Math.max(0,bump[i]-dt*2.5);hintGlow[i]=Math.max(0,hintGlow[i]-dt);
      blink[i]-=dt;if(blink[i]<-.13)blink[i]=1.5+Math.random()*3.5}
    usher.blinkT-=dt;if(usher.blinkT<-.14)usher.blinkT=2+Math.random()*3;usher.moodT-=dt;if(usher.moodT<=0)usher.mood=0;
    if(noteT>0)noteT-=dt;if(lastGain>0)lastGain=Math.max(0,lastGain-dt*8);
    prevDown=inp.down}

  /* ---------- 그리기 도구 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function F(n){return n+'px Jua, system-ui, sans-serif'}
  function heart(g,x,y,s){g.beginPath();g.moveTo(x,y+s*.9);g.bezierCurveTo(x-s*1.4,y-s*.1,x-s*.6,y-s*1.1,x,y-s*.35);g.bezierCurveTo(x+s*.6,y-s*1.1,x+s*1.4,y-s*.1,x,y+s*.9);g.closePath()}
  function star(g,x,y,r){g.beginPath();for(var i=0;i<10;i++){var a=i*Math.PI/5-Math.PI/2,q=i%2?r*.48:r;if(i)g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);else g.moveTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}g.closePath()}
  /* 아이콘(배지 안쪽). s = 반지름 */
  function icon(g,k,x,y,s,col,bg){g.save();g.translate(x,y);var u=s/7;g.lineCap='round';g.lineJoin='round';
    if(k==='pop'){g.fillStyle='#fff4c9';g.beginPath();g.arc(-2.6*u,-3*u,2.4*u,0,7);g.arc(0,-4.2*u,2.6*u,0,7);g.arc(2.6*u,-3*u,2.4*u,0,7);g.fill();
      g.fillStyle='#e63b3b';g.beginPath();g.moveTo(-4.4*u,-2*u);g.lineTo(4.4*u,-2*u);g.lineTo(3.2*u,5.2*u);g.lineTo(-3.2*u,5.2*u);g.closePath();g.fill();
      g.fillStyle='#fff';g.fillRect(-1*u,-2*u,2*u,7.2*u)}
    else if(k==='quiet'){g.fillStyle='#ffd84d';g.beginPath();g.arc(-.6*u,.6*u,4.6*u,0,7);g.fill();g.fillStyle=bg||'#fff';g.beginPath();g.arc(1.4*u,-.8*u,3.8*u,0,7);g.fill();
      g.strokeStyle='#6c7bd6';g.lineWidth=1.3*u;g.beginPath();g.moveTo(2*u,-5.6*u);g.lineTo(4.6*u,-5.6*u);g.lineTo(2*u,-2.8*u);g.lineTo(4.6*u,-2.8*u);g.stroke()}
    else if(k==='aisle'){g.fillStyle='#38b26a';rr(g,-4.2*u,-5.4*u,8.4*u,10.8*u,1.4*u);g.fill();g.fillStyle='#fff';g.beginPath();g.moveTo(-2.4*u,-3.8*u);g.lineTo(2.4*u,-3.8*u);g.lineTo(2.4*u,5.4*u);g.lineTo(-2.4*u,4.2*u);g.closePath();g.fill();
      g.fillStyle='#38b26a';g.beginPath();g.arc(1.2*u,.8*u,.8*u,0,7);g.fill()}
    else if(k==='center'){g.fillStyle='#e8453c';g.beginPath();g.arc(0,0,5.4*u,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(0,0,3.6*u,0,7);g.fill();g.fillStyle='#e8453c';g.beginPath();g.arc(0,0,1.8*u,0,7);g.fill()}
    else if(k==='late'){g.fillStyle='#fff';g.strokeStyle='#4a5bc4';g.lineWidth=1.4*u;g.beginPath();g.arc(0,.4*u,4.8*u,0,7);g.fill();g.stroke();
      g.beginPath();g.moveTo(0,.4*u);g.lineTo(0,-2.6*u);g.moveTo(0,.4*u);g.lineTo(2.4*u,1.6*u);g.stroke();
      g.fillStyle='#4a5bc4';g.fillRect(-1.4*u,-6.6*u,2.8*u,1.4*u)}
    else if(k==='heart'||k==='hearts'){g.fillStyle=col||'#ff5d8f';heart(g,0,.2*u,4.6*u);g.fill();g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.arc(-1.8*u,-1.6*u,1*u,0,7);g.fill()}
    else if(k==='family'){g.fillStyle=col||'#ff5d8f';star(g,0,.4*u,5.6*u);g.fill()}
    else if(k==='glasses'){g.strokeStyle='#333';g.lineWidth=1.3*u;g.beginPath();g.arc(-2.6*u,0,2.3*u,0,7);g.stroke();g.beginPath();g.arc(2.6*u,0,2.3*u,0,7);g.stroke();
      g.beginPath();g.moveTo(-.4*u,-.4*u);g.lineTo(.4*u,-.4*u);g.stroke()}
    else if(k==='eye'){g.fillStyle='#fff';g.strokeStyle='#333';g.lineWidth=1.1*u;g.beginPath();g.ellipse(0,0,5*u,3*u,0,0,7);g.fill();g.stroke();
      g.fillStyle='#333';g.beginPath();g.arc(0,0,1.6*u,0,7);g.fill();g.strokeStyle='#e8453c';g.lineWidth=1.5*u;g.beginPath();g.moveTo(-5*u,4*u);g.lineTo(5*u,-4*u);g.stroke()}
    else if(k==='tall'){g.fillStyle='#e0a32b';g.beginPath();g.moveTo(0,-5.6*u);g.lineTo(4*u,-1.4*u);g.lineTo(1.4*u,-1.4*u);g.lineTo(1.4*u,5*u);g.lineTo(-1.4*u,5*u);g.lineTo(-1.4*u,-1.4*u);g.lineTo(-4*u,-1.4*u);g.closePath();g.fill()}
    else if(k==='short'){g.fillStyle='#7d8bd8';g.beginPath();g.moveTo(0,5.6*u);g.lineTo(4*u,1.4*u);g.lineTo(1.4*u,1.4*u);g.lineTo(1.4*u,-5*u);g.lineTo(-1.4*u,-5*u);g.lineTo(-1.4*u,1.4*u);g.lineTo(-4*u,1.4*u);g.closePath();g.fill()}
    else if(k==='lock'){g.strokeStyle='#8a6a2a';g.lineWidth=1.4*u;g.beginPath();g.arc(0,-1.6*u,2.4*u,3.14,0);g.stroke();g.fillStyle='#e0b24a';rr(g,-3.4*u,-1.6*u,6.8*u,5.6*u,1*u);g.fill()}
    g.restore()}
  function badge(g,k,x,y,s,col){g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.arc(x+.8,y+1.4,s,0,7);g.fill();
    g.fillStyle='#fffaf0';g.beginPath();g.arc(x,y,s,0,7);g.fill();g.strokeStyle='rgba(90,50,40,.5)';g.lineWidth=1;g.stroke();icon(g,k,x,y,s*.86,col,'#fffaf0')}
  /* {아이콘} 토큰이 섞인 글줄 */
  function rich(g,str,x,y,size,color,align,maxW){
    var parts=str.split(/(\{\w+\})/).filter(function(p){return p!==''}),words=[];
    parts.forEach(function(p){if(p[0]==='{')words.push(p);else p.split(/( )/).forEach(function(w){if(w!=='')words.push(w)})});
    g.font=F(size);function wd(w){return w[0]==='{'?size*1.25:g.measureText(w).width}
    var lines=[[]],lw=[0];words.forEach(function(w){var ww=wd(w);if(maxW&&lw[lw.length-1]+ww>maxW&&lines[lines.length-1].length&&w!==' '){lines.push([]);lw.push(0)}
      if(w===' '&&!lines[lines.length-1].length)return;lines[lines.length-1].push(w);lw[lw.length-1]+=ww});
    lines.forEach(function(L,li){var cx=align==='center'?x-lw[li]/2:x,cy=y+li*(size+4);
      L.forEach(function(w){if(w[0]==='{'){icon(g,w.slice(1,-1),cx+size*.62,cy-size*.34,size*.56,null,'#3a1626');cx+=size*1.25}
        else{g.fillStyle=color;g.textAlign='left';g.fillText(w,cx,cy);cx+=g.measureText(w).width}})});
    return lines.length}

  /* ---------- 손님 그리기 ---------- */
  function drawGuest(g,i,x,y,expr,o){
    var G=P.guests[i],col=SPC[G.sp],sc=(G.kid?.78:1)*(o&&o.sc||1),tall=G.h===2,shortG=G.h===0&&!G.kid,t=tG;
    var hp=hop[i],bp=bump[i];
    g.save();g.translate(x+Math.sin(bp*18)*bp*2.5,y-Math.sin(hp*Math.PI)*7);g.scale(sc*(1+hp*.08),sc*(1-hp*.06));
    if(o&&o.alpha!=null)g.globalAlpha=o.alpha;
    var sh=SHIRT[G.shirt];
    /* 몸 */
    g.fillStyle=sh;g.beginPath();g.ellipse(0,-7,shortG?11:13,shortG?9:11,0,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.ellipse(-4,-11,5,3,-.4,0,7);g.fill();
    var hr=shortG?10:G.sp==='giraffe'?10:12,hy=tall?-46:shortG?-19:-25;
    if(G.sp==='giraffe'){g.fillStyle=col[0];g.fillRect(-4.5,hy,9,-hy-12);g.fillStyle=col[1];
      [[-2,hy+10,2.2],[2,hy+19,2],[-1.5,hy+27,1.8]].forEach(function(p){g.beginPath();g.arc(p[0],p[1],p[2],0,7);g.fill()})}
    /* 귀 */
    g.fillStyle=col[0];g.strokeStyle=col[1];g.lineWidth=1.2;
    if(G.sp==='cat'||G.sp==='fox'){[-1,1].forEach(function(s){g.fillStyle=col[0];g.beginPath();g.moveTo(s*hr*.85,hy-hr*.25);g.lineTo(s*hr*.7,hy-hr*1.25);g.lineTo(s*hr*.15,hy-hr*.8);g.closePath();g.fill();
      g.fillStyle=G.sp==='fox'?'#5a2e16':col[2];g.beginPath();g.moveTo(s*hr*.68,hy-hr*.55);g.lineTo(s*hr*.66,hy-hr*1.05);g.lineTo(s*hr*.35,hy-hr*.78);g.closePath();g.fill()})}
    else if(G.sp==='bunny'){[-1,1].forEach(function(s){var w=Math.sin(t*2+i)*.06*s;g.save();g.translate(s*hr*.42,hy-hr*.7);g.rotate(s*.18+w);
      g.fillStyle=col[0];g.beginPath();g.ellipse(0,-hr*.75,hr*.28,hr*.85,0,0,7);g.fill();g.fillStyle=col[2];g.beginPath();g.ellipse(0,-hr*.72,hr*.13,hr*.6,0,0,7);g.fill();g.restore()})}
    else if(G.sp==='bear'||G.sp==='mouse'){var er=G.sp==='mouse'?hr*.55:hr*.36;[-1,1].forEach(function(s){g.fillStyle=col[0];g.beginPath();g.arc(s*hr*.75,hy-hr*.72,er,0,7);g.fill();
      g.fillStyle=G.sp==='mouse'?col[2]:col[2];g.beginPath();g.arc(s*hr*.75,hy-hr*.72,er*.55,0,7);g.fill()})}
    else if(G.sp==='pig'){[-1,1].forEach(function(s){g.fillStyle=col[1];g.beginPath();g.moveTo(s*hr*.85,hy-hr*.4);g.lineTo(s*hr*.8,hy-hr*1.1);g.lineTo(s*hr*.25,hy-hr*.85);g.closePath();g.fill()})}
    else if(G.sp==='giraffe'){[-1,1].forEach(function(s){g.strokeStyle=col[1];g.lineWidth=2.2;g.beginPath();g.moveTo(s*hr*.35,hy-hr*.8);g.lineTo(s*hr*.45,hy-hr*1.45);g.stroke();
      g.fillStyle='#8a5a1c';g.beginPath();g.arc(s*hr*.45,hy-hr*1.5,2.2,0,7);g.fill();g.fillStyle=col[0];g.beginPath();g.ellipse(s*hr*1.05,hy-hr*.35,hr*.38,hr*.18,s*.4,0,7);g.fill()})}
    else if(G.sp==='chick'){g.strokeStyle=col[1];g.lineWidth=1.8;g.beginPath();g.moveTo(0,hy-hr);g.quadraticCurveTo(-3,hy-hr-6,1,hy-hr-7);g.stroke()}
    /* 머리 */
    var hg=g.createRadialGradient(-hr*.35,hy-hr*.4,hr*.2,0,hy,hr*1.1);hg.addColorStop(0,'#fff');hg.addColorStop(.25,col[0]);hg.addColorStop(1,col[1]);
    g.fillStyle=hg;g.beginPath();g.arc(0,hy,hr,0,7);g.fill();
    if(G.sp==='fox'){g.fillStyle=col[2];g.beginPath();g.moveTo(-hr*.9,hy+hr*.1);g.quadraticCurveTo(0,hy+hr*1.25,hr*.9,hy+hr*.1);g.quadraticCurveTo(0,hy+hr*.55,-hr*.9,hy+hr*.1);g.fill()}
    if(G.sp==='bear'||G.sp==='giraffe'){g.fillStyle=col[2];g.beginPath();g.ellipse(0,hy+hr*.42,hr*.45,hr*.32,0,0,7);g.fill()}
    if(G.sp==='pig'){g.fillStyle=col[2];g.beginPath();g.ellipse(0,hy+hr*.35,hr*.36,hr*.26,0,0,7);g.fill();g.fillStyle=col[1];g.beginPath();g.arc(-hr*.12,hy+hr*.35,1.2,0,7);g.arc(hr*.12,hy+hr*.35,1.2,0,7);g.fill()}
    /* 얼굴 */
    var ex=hr*.38,ey=hy-hr*.08,mY=hy+hr*.48,ink='#3a2320',bl=blink[i]<0;
    g.fillStyle='rgba(255,110,130,.4)';g.beginPath();g.arc(-hr*.62,hy+hr*.28,hr*.2,0,7);g.arc(hr*.62,hy+hr*.28,hr*.2,0,7);g.fill();
    g.strokeStyle=ink;g.fillStyle=ink;g.lineWidth=1.5;g.lineCap='round';
    if(expr==='happy'){g.beginPath();g.arc(-ex,ey+1,2.3,3.4,6.0);g.stroke();g.beginPath();g.arc(ex,ey+1,2.3,3.4,6.0);g.stroke();
      g.fillStyle='#c2413b';g.beginPath();g.arc(0,mY-1.5,3,0,3.14);g.fill()}
    else if(expr==='grumpy'){g.beginPath();g.arc(-ex,ey+.5,1.6,0,7);g.arc(ex,ey+.5,1.6,0,7);g.fill();
      g.beginPath();g.moveTo(-ex-3,ey-4);g.lineTo(-ex+2.4,ey-2.4);g.moveTo(ex+3,ey-4);g.lineTo(ex-2.4,ey-2.4);g.stroke();
      g.beginPath();g.arc(0,mY+2.4,2.8,3.5,5.9);g.stroke()}
    else if(expr==='wow'){g.fillStyle='#fff';g.beginPath();g.arc(-ex,ey,2.8,0,7);g.arc(ex,ey,2.8,0,7);g.fill();g.fillStyle=ink;g.beginPath();g.arc(-ex,ey,1.5,0,7);g.arc(ex,ey,1.5,0,7);g.fill();
      g.beginPath();g.ellipse(0,mY,1.8,2.4,0,0,7);g.fill()}
    else if(expr==='sleep'||bl){g.beginPath();g.moveTo(-ex-2,ey);g.lineTo(-ex+2,ey);g.moveTo(ex-2,ey);g.lineTo(ex+2,ey);g.stroke();
      g.beginPath();g.arc(0,mY-1,1.8,.2,2.94);g.stroke()}
    else{g.beginPath();g.arc(-ex,ey,1.8,0,7);g.arc(ex,ey,1.8,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(-ex+.6,ey-.7,.6,0,7);g.arc(ex+.6,ey-.7,.6,0,7);g.fill();
      g.beginPath();g.arc(0,mY-1.2,2,.25,2.9);g.stroke()}
    if(G.sp==='chick'){g.fillStyle=col[2];g.beginPath();g.moveTo(-2.4,mY-3);g.lineTo(2.4,mY-3);g.lineTo(0,mY);g.closePath();g.fill()}
    if(G.t.glasses){g.strokeStyle='#2b2b3a';g.lineWidth=1.4;g.beginPath();g.arc(-ex,ey,3.6,0,7);g.stroke();g.beginPath();g.arc(ex,ey,3.6,0,7);g.stroke();
      g.beginPath();g.moveTo(-ex+3.6,ey);g.lineTo(ex-3.6,ey);g.stroke()}
    g.restore()}
  /* 손님 옆 배지들 */
  function guestBadges(g,i,x,y){var G=P.guests[i],k=0,list=[];
    if(G.pair>=0)list.push([G.pk==='family'?'family':'heart',PAIRC[(G.pid-1+PAIRC.length)%PAIRC.length]]);
    ['pop','quiet','aisle','center','late'].forEach(function(t){if(G.t[t])list.push([t])});
    list.forEach(function(b,n){badge(g,b[0],x+(n%2?-16:16),y-4-Math.floor(n/2)*14,6.5,b[1])});
    if(G.fixed>=0)badge(g,'lock',x-16,y-4,5.5)}

  /* ---------- 좌석 ---------- */
  function drawSeat(g,s,back){var p=seatXY(s),w=p.L.sw-8,x=p.x-w/2,y=p.y;
    if(back){
      g.fillStyle='rgba(0,0,0,.25)';rr(g,x+2,y-28,w,34,8);g.fill();
      var gr=g.createLinearGradient(0,y-30,0,y+4);gr.addColorStop(0,'#c8384a');gr.addColorStop(1,'#7e1d2c');g.fillStyle=gr;rr(g,x,y-30,w,34,8);g.fill();
      g.strokeStyle='rgba(255,180,170,.35)';g.lineWidth=1.2;g.beginPath();g.moveTo(x+6,y-26);g.lineTo(x+w-6,y-26);g.stroke();
      if(P.blocked[s]){g.save();g.beginPath();rr(g,x,y-30,w,46,8);g.clip();g.fillStyle='rgba(30,20,30,.45)';g.fillRect(x,y-30,w,46);
        g.strokeStyle='#ffcc33';g.lineWidth=5;g.beginPath();g.moveTo(x,y-26);g.lineTo(x+w,y+12);g.moveTo(x+w,y-26);g.lineTo(x,y+12);g.stroke();
        g.strokeStyle='#2a2a2a';g.lineWidth=5;g.setLineDash([4,5]);g.beginPath();g.moveTo(x,y-26);g.lineTo(x+w,y+12);g.moveTo(x+w,y-26);g.lineTo(x,y+12);g.stroke();g.setLineDash([]);g.restore()}}
    else{if(P.blocked[s])return;
      var cg=g.createLinearGradient(0,y,0,y+12);cg.addColorStop(0,'#e0566a');cg.addColorStop(1,'#8f2333');g.fillStyle=cg;rr(g,x-1,y-1,w+2,12,5);g.fill();
      g.fillStyle='#5a1420';rr(g,x-4,y-10,5,22,2.5);g.fill();rr(g,x+w-1,y-10,5,22,2.5);g.fill();
      g.fillStyle='rgba(255,220,200,.25)';g.fillRect(x+4,y+1,w-8,2)}}

  /* ---------- 너굴 안내원 ---------- */
  function drawUsher(g,x,y){var m=usher.mood,t=tG,jump=m===1?Math.abs(Math.sin(t*9))*5:0;
    g.save();g.translate(x,y-jump);
    g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(0,30+jump,18,4,0,0,7);g.fill();
    g.fillStyle='#b5121b';rr(g,-13,4,26,26,8);g.fill();g.fillStyle='#ffd34d';g.beginPath();g.arc(0,11,1.6,0,7);g.arc(0,18,1.6,0,7);g.fill();
    /* 손전등 */
    var ang=m===2?.5:-.6+Math.sin(t*1.5)*.15;g.save();g.translate(12,14);g.rotate(ang);
    g.fillStyle='rgba(255,240,170,.13)';g.beginPath();g.moveTo(10,0);g.lineTo(80,-24);g.lineTo(80,24);g.closePath();g.fill();
    g.fillStyle='#555';rr(g,0,-3,12,6,2);g.fill();g.fillStyle='#ffe98a';g.fillRect(10,-3,3,6);g.restore();
    g.fillStyle='#8d8d99';g.beginPath();g.arc(0,-6,15,0,7);g.fill();
    [-1,1].forEach(function(s){g.fillStyle='#8d8d99';g.beginPath();g.arc(s*11,-18,5,0,7);g.fill();g.fillStyle='#3d3d48';g.beginPath();g.arc(s*11,-18,2.6,0,7);g.fill()});
    g.fillStyle='#3d3d48';g.beginPath();g.ellipse(0,-7,13,5.5,0,0,7);g.fill();
    g.fillStyle='#efeff3';g.beginPath();g.ellipse(0,0,8,5.5,0,0,7);g.fill();
    g.fillStyle='#b5121b';rr(g,-11,-24,22,7,2);g.fill();g.fillStyle='#7d0c12';g.fillRect(-14,-18,28,3);g.fillStyle='#ffd34d';g.beginPath();g.arc(0,-21,1.8,0,7);g.fill();
    var bl=usher.blinkT<0;g.fillStyle='#fff';g.strokeStyle='#fff';g.lineWidth=1.6;
    if(m===1){g.beginPath();g.arc(-5,-6,2.4,3.4,6);g.stroke();g.beginPath();g.arc(5,-6,2.4,3.4,6);g.stroke()}
    else if(bl){g.beginPath();g.moveTo(-7,-7);g.lineTo(-3,-7);g.moveTo(3,-7);g.lineTo(7,-7);g.stroke()}
    else{g.beginPath();g.arc(-5,-7,2.2,0,7);g.arc(5,-7,2.2,0,7);g.fill();g.fillStyle='#222';g.beginPath();g.arc(-5+usher.look,-7,1.2,0,7);g.arc(5+usher.look,-7,1.2,0,7);g.fill()}
    g.fillStyle='#222';g.beginPath();g.arc(0,-2.5,1.8,0,7);g.fill();g.strokeStyle='#222';g.lineWidth=1.3;g.beginPath();
    if(m===2)g.arc(0,3.5,2.5,3.6,5.8);else g.arc(0,.5,2.6,.3,2.8);g.stroke();
    if(m===2){g.fillStyle='#8fd3ff';g.beginPath();g.moveTo(13,-14);g.quadraticCurveTo(17,-8,13,-6);g.quadraticCurveTo(9,-8,13,-14);g.fill()}
    g.restore()}

  /* ---------- 메인 그리기 ---------- */
  function draw(g,a,dt){
    dt=dt||0;tG+=dt;var t=tG,ko=a.lang==='ko',i,s,L=lay(),occ=occAll(),dim=0;
    if(mode==='show')dim=Math.min(1,modeT/.6);else if(mode==='win'||mode==='fail')dim=Math.max(0,1-modeT/.5)*.6+.4*(mode==='fail'?Math.max(0,1-modeT/2.6):Math.max(0,1-modeT/2));
    /* 배경 */
    var bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#3a1630');bg.addColorStop(.45,'#5a1d2e');bg.addColorStop(1,'#2a0f1c');g.fillStyle=bg;g.fillRect(-20,-20,W+40,H+40);
    g.fillStyle='rgba(255,200,150,.04)';for(i=0;i<9;i++){g.fillRect(i*44+((t*3)%44),60,18,GBOT-60)}
    /* 커튼 (흔들림) */
    [-1,1].forEach(function(sd){for(var k=0;k<4;k++){var sw=Math.sin(t*.9+k*.9)*3,x=sd<0?k*5+sw:W-k*5-sw;
      var cg=g.createLinearGradient(x-8,0,x+8,0);cg.addColorStop(0,'#5d0d1d');cg.addColorStop(.5,'#b3263a');cg.addColorStop(1,'#5d0d1d');g.fillStyle=cg;
      g.beginPath();g.moveTo(x-7,30);g.quadraticCurveTo(x+sw*1.4,320,x-6+sw,H);g.lineTo(x+7+sw,H);g.quadraticCurveTo(x+sw*1.4+10,320,x+7,30);g.closePath();g.fill()}});
    /* 상단 전광판 */
    g.fillStyle='#24101c';g.fillRect(0,30,W,30);g.fillStyle='#ffcc4d';
    for(i=0;i<24;i++){var on=Math.sin(t*4-i*.8)>-.2;g.globalAlpha=on?1:.3;g.beginPath();g.arc(8+i*14.8,33,1.8,0,7);g.fill();g.beginPath();g.arc(8+i*14.8,57,1.8,0,7);g.fill()}g.globalAlpha=1;
    g.font=F(16);g.textAlign='left';g.fillStyle='#ffe9b0';g.fillText((ko?'상영관 ':'Screen ')+(lvN+1),14,51);
    var low=time<10;g.textAlign='right';g.font=F(low?18+Math.sin(t*12)*1.5:17);g.fillStyle=lastGain>0?'#7dffa0':low?'#ff6b6b':'#ffe9b0';
    g.fillText(Math.ceil(time)+(ko?'초':'s'),W-14,51);
    /* 시계 아이콘 */
    var tx=W-14-g.measureText(Math.ceil(time)+(ko?'초':'s')).width-12;icon(g,'late',tx,45,7);
    g.textAlign='center';g.font=F(13);g.fillStyle='rgba(255,233,176,.75)';
    g.fillText(lvN<HAND.length?(ko?'오늘의 상영 ':'Showing ')+(lvN+1)+'/10':(ko?'특별 상영':'Bonus show'),W/2,50);
    /* 로비: 줄 서는 곳 */
    var ly0=62,ly1=GBOT-P.R*L.rh-6;
    g.fillStyle='rgba(120,30,50,.35)';rr(g,22,ly0+2,W-44,Math.max(30,ly1-ly0-6),12);g.fill();
    g.strokeStyle='#d6a640';g.lineWidth=3;g.beginPath();
    for(i=0;i<5;i++){var px=36+i*72;g.moveTo(px,ly1-12);g.quadraticCurveTo(px+36,ly1-2,px+72,ly1-12)}g.strokeStyle='#c22b40';g.stroke();
    for(i=0;i<6;i++){var qx=36+i*72;g.fillStyle='#d6a640';g.fillRect(qx-2,ly1-26,4,16);g.beginPath();g.arc(qx,ly1-27,3.5,0,7);g.fill()}
    /* 통로 카펫 */
    [L.x0-AW,L.x0+L.gw].forEach(function(ax){var cg=g.createLinearGradient(ax,0,ax+AW,0);cg.addColorStop(0,'#3a1022');cg.addColorStop(.5,'#561a30');cg.addColorStop(1,'#3a1022');
      g.fillStyle=cg;g.fillRect(ax+2,GBOT-P.R*L.rh,AW-4,P.R*L.rh+4);
      for(var r=0;r<P.R;r++){var fy=GBOT-r*L.rh-6;g.fillStyle='rgba(255,210,120,'+(.45+.35*Math.sin(t*2+r+ax))+')';g.beginPath();g.arc(ax+AW/2,fy,2,0,7);g.fill()}});
    /* 좌석과 손님 (뒷줄부터) */
    var walking={};walkers.forEach(function(w){if(mode==='show'&&!w.done)walking[w.i]=w});
    for(var r=P.R-1;r>=0;r--){
      for(var c=0;c<P.C;c++)drawSeat(g,r*P.C+c,true);
      for(c=0;c<P.C;c++){s=r*P.C+c;var j=occ[s];if(j<0||(drag&&drag.i===j)||walking[j])continue;var p=seatXY(s),ex='idle';
        if((mode==='show'&&reveal[j])||mode==='win'||mode==='fail')ex=res&&res[j].length?'grumpy':'happy';
        else if(mode==='show')ex='wow';else if(sel===j)ex='wow';
        if(hintGlow[j]>0){g.fillStyle='rgba(255,230,120,'+Math.min(.5,hintGlow[j]*.4)+')';g.beginPath();g.arc(p.x,p.y-20,26,0,7);g.fill()}
        if(sel===j){g.fillStyle='rgba(255,240,170,.28)';g.beginPath();g.arc(p.x,p.y-18,25+Math.sin(t*6)*2,0,7);g.fill()}
        drawGuest(g,j,p.x,p.y,ex)}
      for(c=0;c<P.C;c++)drawSeat(g,r*P.C+c,false);
      for(c=0;c<P.C;c++){s=r*P.C+c;j=occ[s];if(j<0||(drag&&drag.i===j)||walking[j])continue;p=seatXY(s);guestBadges(g,j,p.x,p.y+2);
        if(mode==='edit'&&marks&&marks[j]&&marks[j].length){g.fillStyle='#ff4d4d';g.beginPath();g.arc(p.x,p.y-L.rh+14,6,0,7);g.fill();g.fillStyle='#fff';g.font=F(11);g.textAlign='center';g.fillText('!',p.x,p.y-L.rh+18)}}}
    /* 스크린 */
    var sy=GBOT+6,glow=.35+dim*.65;
    var sg=g.createLinearGradient(0,sy,0,sy+16);sg.addColorStop(0,'rgba(220,240,255,'+glow+')');sg.addColorStop(1,'rgba(120,170,255,'+(glow*.5)+')');
    g.fillStyle='#1b0d16';rr(g,L.x0-AW+2,sy-2,L.gw+AW*2-4,20,5);g.fill();g.fillStyle=sg;rr(g,L.x0-AW+5,sy+1,L.gw+AW*2-10,14,4);g.fill();
    if(dim>0){g.save();g.beginPath();rr(g,L.x0-AW+5,sy+1,L.gw+AW*2-10,14,4);g.clip();
      for(i=0;i<5;i++){var fx=((t*40+i*70)%(L.gw+AW*2))+L.x0-AW;g.fillStyle=['#ff9ab0','#ffe07a','#9fe6a0','#9ad0ff','#d8b0ff'][i];g.globalAlpha=dim*.8;
        g.beginPath();g.ellipse(fx,sy+8+Math.sin(t*3+i)*3,7,4,0,0,7);g.fill();g.beginPath();g.moveTo(fx-6,sy+8);g.lineTo(fx-11,sy+4);g.lineTo(fx-11,sy+12);g.fill()}
      g.restore();g.globalAlpha=1}
    g.font=F(10);g.textAlign='center';g.fillStyle=dim>.3?'rgba(40,60,90,.8)':'rgba(255,255,255,.55)';g.fillText(ko?'스 크 린':'S C R E E N',W/2,sy+12);
    /* 줄 선 손님 */
    var qs=queueSlots();qs.forEach(function(q){if(drag&&drag.i===q.i)return;var b=sel===q.i?Math.sin(t*8)*2-3:0;
      g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(q.x,q.y+3,15,4,0,0,7);g.fill();
      if(sel===q.i){g.fillStyle='rgba(255,240,170,.3)';g.beginPath();g.arc(q.x,q.y-18,25,0,7);g.fill()}
      drawGuest(g,q.i,q.x,q.y+b,sel===q.i?'wow':'idle');guestBadges(g,q.i,q.x,q.y+2+b)});
    if(!qs.length&&mode==='edit'){g.font=F(15);g.textAlign='center';g.fillStyle='rgba(255,233,176,'+(.6+.3*Math.sin(t*4))+')';
      g.fillText(ko?'모두 앉았어요! 상영 시작을 눌러요':'Everyone is seated! Press Start',W/2,(ly0+ly1)/2+6)}
    /* 조명 어둡게 + 스크린 빛 */
    if(dim>0){g.fillStyle='rgba(12,4,18,'+(dim*.62)+')';g.fillRect(-20,-20,W+40,GBOT+4);
      g.save();g.globalCompositeOperation='lighter';var lg=g.createLinearGradient(0,GBOT,0,GBOT-P.R*L.rh-40);lg.addColorStop(0,'rgba(120,160,255,'+(dim*.28)+')');lg.addColorStop(1,'rgba(120,160,255,0)');
      g.fillStyle=lg;g.beginPath();g.moveTo(L.x0-AW,GBOT+6);g.lineTo(L.x0+L.gw+AW,GBOT+6);g.lineTo(L.x0+L.gw+AW+30,GBOT-P.R*L.rh-40);g.lineTo(L.x0-AW-30,GBOT-P.R*L.rh-40);g.closePath();g.fill();g.restore()}
    /* 지각 손님: 손전등 불빛을 받으며 통로에서 자리로 */
    for(var wk in walking){var w=walking[wk];g.save();g.globalCompositeOperation='lighter';var fg=g.createRadialGradient(w.x,w.y-22,4,w.x,w.y-22,34);
      fg.addColorStop(0,'rgba(255,240,170,.38)');fg.addColorStop(1,'rgba(255,240,170,0)');g.fillStyle=fg;g.beginPath();g.arc(w.x,w.y-22,34,0,7);g.fill();g.restore();
      drawGuest(g,w.i,w.x,w.y+Math.abs(Math.sin(t*14))*-3,'wow');badge(g,'late',w.x+16,w.y-2,6.5)}
    /* 먼지 (빛줄기 속) */
    for(i=0;i<motes.length;i++){var m=motes[i],my=((m.y-t*m.v)%(GBOT-60)+(GBOT-60))%(GBOT-60)+60,mx=m.x+Math.sin(t*.6+m.p)*10;
      g.fillStyle='rgba(255,235,200,'+((.12+dim*.35)*(.6+.4*Math.sin(t*1.7+m.p)))+')';g.beginPath();g.arc(mx,my,m.r,0,7);g.fill()}
    /* 반응 말풍선 */
    if(mode==='show'||mode==='fail'||mode==='win'){for(i=0;i<P.guests.length;i++){if(mode==='show'&&!reveal[i])continue;if(walking[i])continue;var pp=seatXY(seat[i]),G=P.guests[i],hy=G.h===2?-62:G.h===0?-40:-46;
      if(G.kid)hy=-34;var by=pp.y+hy,bx=pp.x;
      if(res[i].length){g.fillStyle='#fff';g.strokeStyle='#e8453c';g.lineWidth=2;rr(g,bx-11,by-12,22,18,6);g.fill();g.stroke();
        g.fillStyle='#fff';g.beginPath();g.moveTo(bx-3,by+6);g.lineTo(bx+3,by+6);g.lineTo(bx,by+11);g.fill();icon(g,WICON[res[i][0]],bx,by-3,7,null,'#fff')}
      else{g.fillStyle='#ff5d8f';heart(g,bx,by-3+Math.sin(t*5+i)*1.5,5);g.fill()}}}
    /* 아래 안내판 */
    var py=468;g.fillStyle='rgba(20,8,16,.55)';rr(g,12,py,W-24,74,12);g.fill();g.strokeStyle='rgba(255,200,120,.25)';g.lineWidth=1.5;g.stroke();
    var showI=drag?drag.i:sel>=0?sel:hover>=0?hover:infoI;
    if(noteT>0&&noteMsg){var NM={broken:['고장 난 좌석이에요','That seat is broken'],fixed:['그 손님은 옮길 수 없어요','That guest is already seated'],
        left:['아직 '+left()+'명이 줄 서 있어요','Still '+left()+' guests waiting'],perfect:['완벽해요! 상영 시작을 눌러요','Looks perfect! Press Start']}[noteMsg];
      g.font=F(15);g.textAlign='center';g.fillStyle='#ffd27a';g.fillText(NM[ko?0:1],W/2,py+44)}
    else if(showI>=0)drawInfo(g,showI,py,ko);
    else if(mode==='fail'||(mode==='edit'&&marks)){var bad=[];if(marks)marks.forEach(function(mk,k){if(mk&&mk.length)bad.push(k)});
      if(bad.length){g.font=F(15);g.textAlign='center';g.fillStyle='#ff9a8a';g.fillText(ko?bad.length+'명이 불만이에요! 손님을 눌러 이유 확인':bad.length+' unhappy! Tap a guest to see why',W/2,py+24);
        var k0=bad[0];rich(g,NAMES[P.guests[k0].name][ko?0:1]+': {'+WICON[marks[k0][0]]+'} '+WHY[marks[k0][0]][ko?0:1],W/2,py+50,14,'#fff','center',W-40)}
      else{g.font=F(15);g.textAlign='center';g.fillStyle='#ffe9b0';g.fillText(ko?'다시 배치해 보세요':'Rearrange and try again',W/2,py+40)}}
    else if(mode==='show'){g.font=F(16);g.textAlign='center';g.fillStyle='#bcd4ff';g.fillText(walkers.length&&modeT<2.2?(ko?'지각 손님 입장 중…':'Late guest coming in…'):(ko?'상영 중… 쉿!':'Now showing… shh!'),W/2,py+42)}
    else if(mode==='win'){g.font=F(16);g.textAlign='center';g.fillStyle='#ffe27a';g.fillText(ko?'모두 행복해요!':'Everyone is happy!',W/2,py+42)}
    else if(P.tip){var lines=rich(g,P.tip[ko?'ko':'en'],W/2,py+22,14,'#ffe9b0','center',W-44);
      if(lvN===0)rich(g,ko?'{tall}큰 키 {short}작은 키 {pop}팝콘 {quiet}잠귀 {heart}커플 {aisle}통로 {center}가운데 {late}지각':'{tall}tall {short}short {pop}popcorn {quiet}sleeper {heart}pair {aisle}aisle {center}middle {late}late',W/2,py+26+lines*18,11,'rgba(255,233,176,.8)','center',W-30)}
    else{g.font=F(14);g.textAlign='center';g.fillStyle='rgba(255,233,176,.85)';g.fillText(ko?'손님을 눌러 조건을 확인하세요':'Tap a guest to read their wishes',W/2,py+42)}
    /* 버튼 */
    var ready=allSeated()&&mode==='edit',pul=ready?1+Math.sin(t*6)*.04:1;
    g.save();g.translate(227,573);g.scale(pul,pul);g.fillStyle='rgba(0,0,0,.35)';rr(g,-77,-19,156,44,14);g.fill();
    var bgc=g.createLinearGradient(0,-22,0,22);bgc.addColorStop(0,ready?'#ffb340':'#7a5a5a');bgc.addColorStop(1,ready?'#e8692a':'#5a4040');g.fillStyle=bgc;rr(g,-78,-22,156,44,14);g.fill();
    g.fillStyle='rgba(255,255,255,.25)';rr(g,-72,-19,144,10,6);g.fill();
    g.fillStyle='#fff';g.fillRect(-58,-8,18,14);g.beginPath();g.moveTo(-40,-1);g.lineTo(-32,-7);g.lineTo(-32,5);g.closePath();g.fill();
    g.font=F(18);g.textAlign='center';g.fillStyle=ready?'#fff':'rgba(255,255,255,.6)';g.fillText(ko?'상영 시작':'Start film',10,6);g.restore();
    g.fillStyle='rgba(0,0,0,.35)';rr(g,67,555,72,44,14);g.fill();g.fillStyle='#4a6fd1';rr(g,66,552,72,44,14);g.fill();g.fillStyle='rgba(255,255,255,.2)';rr(g,70,555,64,9,5);g.fill();
    g.fillStyle='#ffe27a';g.beginPath();g.arc(84,570,6,0,7);g.fill();g.fillStyle='#ccc';g.fillRect(81,576,6,4);
    g.font=F(14);g.textAlign='center';g.fillStyle='#fff';g.fillText(ko?'힌트':'Hint',111,578);
    if(hints){g.font=F(10);g.fillStyle='#ffe27a';g.fillText('x'+hints,128,592)}
    if(kbOn&&mode==='edit'){var cx,cy,cw,ch;
      if(cur.z==='q'){var cq=qs[cur.i];if(cq){cx=cq.x-24;cy=cq.y-48;cw=48;ch=56}}
      else if(cur.z==='s'){var cp=seatXY(cur.r*P.C+cur.c);cx=cp.x-L.sw/2+1;cy=cp.top+1;cw=L.sw-2;ch=L.rh-2}
      else{cx=cur.i?147:63;cy=549;cw=cur.i?162:78;ch=50}
      if(cx!=null){g.strokeStyle='#7df9ff';g.lineWidth=2.5;g.setLineDash([6,4]);g.lineDashOffset=-t*20;rr(g,cx,cy,cw,ch,8);g.stroke();g.setLineDash([])}
      g.font=F(10);g.textAlign='left';g.fillStyle='rgba(255,233,176,.7)';g.fillText(ko?'방향키 이동 · 스페이스 선택/앉히기 · X 빼기 · H 힌트 · Enter 상영':'Arrows · Space pick/seat · X remove · H hint · Enter start',8,628)}
    /* 너굴 */
    usher.look=sel>=0||drag?1.2:Math.sin(t*.7)*.8;drawUsher(g,32,572);
    /* 끌고 있는 손님 */
    if(drag){g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(drag.x,drag.y+20,16,5,0,0,7);g.fill();drawGuest(g,drag.i,drag.x,drag.y+16,'wow',{sc:1.12});guestBadges(g,drag.i,drag.x,drag.y+18)}
    /* 성공 배너 */
    if(mode==='win'){var k=Math.min(1,modeT*3),bw=230;g.save();g.translate(W/2,262);g.scale(k,k);
      g.fillStyle='rgba(30,10,20,.85)';rr(g,-bw/2,-48,bw,96,18);g.fill();g.strokeStyle='#ffcc4d';g.lineWidth=3;g.stroke();
      g.font=F(22);g.textAlign='center';g.fillStyle='#ffe27a';g.fillText(ko?'상영 대성공!':'Smash hit!',0,-14);
      for(i=0;i<3;i++){var on2=i<winStars&&modeT>.35+i*.22;g.fillStyle=on2?'#ffd23f':'rgba(255,255,255,.18)';star(g,-40+i*40,22,on2?15:13);g.fill();
        if(on2){g.strokeStyle='#c98a12';g.lineWidth=1.5;g.stroke()}}
      g.restore()}
  }
  function drawInfo(g,i,py,ko){var G=P.guests[i],L=[];
    var nm=NAMES[G.name][ko?0:1]+' · '+(G.kid?(ko?'아기 ':'baby '):'')+SPN[G.sp][ko?0:1];
    g.font=F(15);g.textAlign='left';g.fillStyle='#fff';g.fillText(nm,26,py+21);
    if(G.fixed>=0)L.push(['lock',TXT.fixed]);
    if(G.h===2)L.push(['tall',TXT.tall]);else if(G.h===0)L.push(['short',TXT.short]);
    if(G.pair>=0)L.push([G.pk==='family'?'family':'heart',G.pk==='couple'?TXT.couple:G.kid?TXT.kid:TXT.parent,PAIRC[(G.pid-1+PAIRC.length)%PAIRC.length]]);
    ['pop','quiet','aisle','center','glasses','late'].forEach(function(k){if(G.t[k])L.push([k,TXT[k]])});
    if(!L.length)L.push(['eye',TXT.normal]);
    var why=(mode==='fail'||mode==='win'||(mode==='edit'&&marks))&&(mode==='edit'?marks:res)?(mode==='edit'?marks:res)[i]:null;
    if(why&&why.length){g.textAlign='right';g.font=F(13);g.fillStyle='#ff9a8a';g.fillText(WHY[why[0]][ko?0:1],W-24,py+21)}
    var max=L.length>3?3:L.length,fs=L.length>2?12:13;
    for(var k=0;k<max;k++){var y=py+40+k*(L.length>2?15:17);if(L.length===1)y=py+44;
      g.fillStyle='rgba(255,250,240,.95)';g.beginPath();g.arc(32,y-4,6.5,0,7);g.fill();icon(g,L[k][0],32,y-4,5.6,L[k][2],'#fffaf0');
      g.font=F(fs);g.textAlign='left';g.fillStyle='#ffe9b0';g.fillText(L[k][1][ko?0:1],44,y)}}

  SG.run({id:'theater-usher',title:{ko:'극장 안내원',en:'Theater Usher'},
    how:{ko:'까다로운 동물 손님들을 자리에 앉히고 상영 시작! 모두가 웃으면 성공이에요.',en:'Seat the fussy animal guests, then start the film. Clear it when every face is smiling!'},
    init:init,update:update,draw:draw});
})();
