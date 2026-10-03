/* 꾹꾹 종이접기 (Paper Fold) — 격자 종이를 접어 같은 도장끼리 포개 하나로 만든다.
   접기 논리(fold/solve/gen)는 DOM 없이 돌아가도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';

  /* ================= 논리 (headless) =================
     상태: {w,h,c:[{n:겹 수, top:윗면이 뒷면인가, bot:아랫면이 뒷면인가, s:[도장 색, 아래→위]}]}
     접기: {ax:'v'|'h', c:접는 선(1..L-1), side:0(왼/위쪽이 움직임)|1(오른/아래쪽이 움직임)}
     움직이는 쪽은 남는 쪽보다 클 수 없다 → 종이는 항상 직사각형. */
  function mk(w,h,stamps){var c=[],i;for(i=0;i<w*h;i++)c.push({n:1,top:0,bot:1,s:[]});
    stamps.forEach(function(p){c[p[1]*w+p[0]].s=[p[2]]});return {w:w,h:h,c:c}}
  function valid(st,f){var L=f.ax==='v'?st.w:st.h,m=f.side?L-f.c:f.c;return f.c>=1&&f.c<=L-1&&m<=L-m}
  function moves(st){var out=[],ax,L,c,s,f;['v','h'].forEach(function(ax){L=ax==='v'?st.w:st.h;
    for(c=1;c<L;c++)for(s=0;s<2;s++){f={ax:ax,c:c,side:s};if(valid(st,f))out.push(f)}});return out}
  function fold(st,f){
    var V=f.ax==='v',L=V?st.w:st.h,O=V?st.h:st.w,c=f.c,m=f.side?L-c:c,stay=L-m,nw=V?stay:st.w,nh=V?st.h:stay,
        cells=new Array(nw*nh),merges=[],a,o,na,ma,src,mv,s,nx,ny;
    function get(a,o){return V?st.c[o*st.w+a]:st.c[a*st.w+o]}
    for(o=0;o<O;o++)for(a=0;a<L;a++){
      if(f.side?a>=c:a<c)continue;
      src=get(a,o);na=f.side?a:a-c;ma=2*c-1-a;nx=V?na:o;ny=V?o:na;
      if(ma>=0&&ma<L){mv=get(ma,o);s=src.s.concat(mv.s.slice().reverse());
        if(src.s.length&&mv.s.length&&src.s[src.s.length-1]===mv.s[mv.s.length-1]){s.splice(src.s.length,1);merges.push({x:nx,y:ny,c:src.s[src.s.length-1]})}
        cells[ny*nw+nx]={n:src.n+mv.n,top:mv.bot,bot:src.bot,s:s}}
      else cells[ny*nw+nx]=src}
    return {st:{w:nw,h:nh,c:cells},merges:merges}}
  function counts(st){var k={},i,j,s;for(i=0;i<st.c.length;i++){s=st.c[i].s;for(j=0;j<s.length;j++)k[s[j]]=(k[s[j]]||0)+1}return k}
  function solved(st){var k=counts(st),i;for(i in k)if(k[i]!==1)return false;return true}
  function key(st){var p=[],i;for(i=0;i<st.c.length;i++)p.push(st.c[i].s.join(''));return st.w+'x'+st.h+':'+p.join('|')}
  /* 너비 우선 탐색: maxD 이내 최소 접기 수와 경로. 없으면 null */
  function solve(st,maxD){
    if(solved(st))return {d:0,path:[]};
    var seen={},cur=[{st:st,path:[]}],d,i,j,mv,r,k,next;seen[key(st)]=1;
    for(d=1;d<=maxD;d++){next=[];
      for(i=0;i<cur.length;i++){mv=moves(cur[i].st);
        for(j=0;j<mv.length;j++){r=fold(cur[i].st,mv[j]).st;k=key(r);if(seen[k])continue;seen[k]=1;
          var p=cur[i].path.concat([mv[j]]);if(solved(r))return {d:d,path:p};next.push({st:r,path:p})}}
      cur=next;if(!cur.length)break}
    return null}
  function rng(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=Math.imul(s^(s>>>15),1|s);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}}
  /* 거꾸로 만들기: 빈 종이를 k번 접어 각 칸이 어디에 포개지는지 추적한 뒤,
     같은 자리에 포개지는 칸들에 같은 도장을 나눠 찍는다. 마지막에 BFS로 실제 최소 수(par)를 확정한다. */
  function genOnce(r,w,h,nc,k){
    var t=mk(w,h,[]),i,mv,f,used={},stamps=[],c,tries,cell,ids,cnt,a,b;
    for(i=0;i<w*h;i++)t.c[i].s=[100+i];
    for(i=0;i<k;i++){mv=moves(t);if(!mv.length)break;f=mv[Math.floor(r()*mv.length)];
      /* 추적용: 숫자가 모두 달라 병합이 일어나지 않는다 */
      t=fold(t,f).st}
    for(c=1;c<=nc;c++){
      for(tries=0;tries<30;tries++){cell=t.c[Math.floor(r()*t.c.length)];
        ids=cell.s.filter(function(v){return !used[v]});if(ids.length<2)continue;
        cnt=ids.length>=3&&r()<.35?3:2;
        for(a=ids.length-1;a>0;a--){b=Math.floor(r()*(a+1));var tmp=ids[a];ids[a]=ids[b];ids[b]=tmp}
        ids.slice(0,cnt).forEach(function(v){used[v]=1;stamps.push([(v-100)%w,Math.floor((v-100)/w),c])});break}
      if(tries===30)return null}
    return stamps}
  function gen(r,w,h,nc,k,minPar){
    var n,stamps,st,res;
    for(n=0;n<400;n++){stamps=genOnce(r,w,h,nc,k);if(!stamps)continue;
      st=mk(w,h,stamps);res=solve(st,k);
      if(res&&res.d>=minPar)return {w:w,h:h,stamps:stamps,par:res.d}}
    /* 안전망: 반으로 두 번 접는 확실한 퍼즐 */
    return {w:4,h:4,stamps:[[0,0,1],[3,3,1]],par:2}}
  var SIZES=[[5,5],[6,5],[5,6],[6,6]];
  function genLevel(n,r){ /* n: 12부터 */
    var i=n-12,sz=i<3?[5,5]:SIZES[Math.floor(r()*SIZES.length)],nc=i<2?2:i<6?3:(r()<.5?3:4),k=i<4?3:4;
    var L=gen(r,sz[0],sz[1],nc,k,i<4?2:3);L.allow=L.par+1;return L}

  /* 손으로 고른 12판. par는 BFS 최소값(검증 스크립트가 확인), allow=par+1 */
  var LEVELS=[
    {w:4,h:4,par:1,stamps:[[0,1,1],[3,1,1]],tip:{ko:'끌어서 반으로 접어 하트를 포개요',en:'Drag to fold in half — stack the hearts'}},
    {w:4,h:4,par:2,stamps:[[0,0,1],[3,3,1]],tip:{ko:'두 번 접어야 만나요',en:'This one takes two folds'}},
    {w:4,h:4,par:2,stamps:[[0,0,1],[3,0,1],[1,1,2],[1,2,2]],tip:{ko:'색마다 하나로!',en:'One of each colour!'}},
    {w:4,h:4,par:2,stamps:[[0,2,1],[1,2,1],[3,0,2],[3,3,2]],tip:{ko:'꼭 반으로만 접을 필요는 없어요',en:'You don\'t have to fold in half'}},
    {w:4,h:4,par:2,stamps:[[0,0,1],[3,0,1],[0,3,1]],tip:{ko:'셋도 하나로',en:'Three into one'}},
    {w:4,h:4,par:2,stamps:[[0,1,1],[3,1,1],[1,0,2],[1,3,2]],tip:{ko:'거울처럼 생각해요',en:'Think in mirrors'}},
    {w:4,h:4,par:3,stamps:[[2,0,1],[2,3,1],[0,1,2],[2,1,2],[3,1,2]],tip:{ko:'이제 세 번! 다른 도장끼리는 안 붙어요',en:'Three folds — different stamps don\'t merge'}},
    {w:4,h:4,par:3,stamps:[[1,2,1],[3,2,1],[2,1,2],[2,2,2],[1,1,3],[3,1,3]],tip:{ko:'세 가지 색',en:'Three colours'}},
    {w:5,h:5,par:2,stamps:[[0,4,1],[1,4,1],[4,3,2],[3,3,2]],tip:{ko:'홀수 칸은 반으로 못 접어요',en:'Odd paper can\'t fold in half'}},
    {w:5,h:5,par:3,stamps:[[0,3,1],[1,2,1],[4,2,1],[4,3,2],[1,3,2]],tip:{ko:'미리보기를 믿어요',en:'Trust the preview'}},
    {w:5,h:5,par:3,stamps:[[2,1,1],[2,4,1],[3,4,2],[4,4,2],[0,2,3],[1,3,3]],tip:{ko:'남는 접기는 보너스!',en:'Spare folds are bonus points!'}},
    {w:6,h:6,par:3,stamps:[[1,2,1],[1,3,1],[0,4,2],[0,0,2],[0,2,2],[5,5,3],[5,1,3]],tip:{ko:'이제부터는 끝없이!',en:'Endless from here!'}}
  ];
  LEVELS.forEach(function(L){L.allow=L.par+1});

  if(typeof window==='undefined'){module.exports={mk:mk,fold:fold,moves:moves,valid:valid,solve:solve,solved:solved,gen:gen,genOnce:genOnce,genLevel:genLevel,rng:rng,LEVELS:LEVELS};return}

  /* ================= 화면 ================= */
  var W=360,H=640,CX=180,CY=326,T0=48,TCAP=75;
  var COL=[null,['#ee5a66','#b8303f'],['#4a8ee6','#2659a8'],['#f5bb35','#b97f0c'],['#58b874','#2c7d47']];
  var S={},tt=0,dust=[],keyq=[];
  if(!window.__paperFoldKeys){window.__paperFoldKeys=true;
    window.addEventListener('keydown',function(e){
      if(/^Arrow|^Space$|^KeyZ$|^Backspace$|^Escape$|^Key[WASD]$/.test(e.code)){if(e.repeat)return;keyq.push(e.code);if(e.code==='Backspace')e.preventDefault()}})}
  for(var di=0;di<26;di++)dust.push({x:Math.random()*W,y:Math.random()*H,r:.6+Math.random()*1.6,s:6+Math.random()*14,p:Math.random()*6.28});

  function csFor(w,h){var m=Math.max(w,h);return m<=4?62:m===5?52:44}
  function target(st){return {x:CX-st.w*S.cs/2,y:CY-st.h*S.cs/2}}
  function shift(f){var d=f.side?0:f.c*S.cs;return f.ax==='v'?{x:d,y:0}:{x:0,y:d}}
  function loadLevel(n,a){
    var L=n<LEVELS.length?LEVELS[n]:genLevel(n,S.rnd);
    S.lvl=n;S.L=L;S.st=mk(L.w,L.h,L.stamps);S.hist=[];S.left=L.allow;S.cs=csFor(L.w,L.h);
    S.anim=null;S.drag=null;S.prev=null;S.kb=null;S.press=[];S.undone=false;S.stuck=0;
    var t=target(S.st);S.org={x:t.x+(n===0?0:W+40),y:t.y}}
  function init(a){
    S={rnd:rng((Date.now()^(Math.random()*1e9))>>>0),time:T0,cele:0,streak:0,snd:[],flap:0,blink:2,blinkT:0,mood:0,tilt:0,dead:false};
    keyq.length=0;loadLevel(0,a);a.tempo(1)}

  function crease(a){var i;for(i=0;i<6;i++)S.snd.push({t:i*.022+Math.random()*.01,f:1800+Math.random()*4200,d:.018,ty:i%2?'square':'sawtooth'});
    S.snd.push({t:.16,f:240,d:.05,ty:'triangle'})}
  function doFold(f,a){
    if(S.anim||S.cele>0)return;
    if(S.left<=0){a.sfx('hit');a.shake(5);S.stuck=1.4;a.pop(CX,CY-20,a.lang==='ko'?'되돌리기!':'Undo first!','#ffe08a');return}
    var r=fold(S.st,f);S.hist.push({st:S.st,f:f});S.anim={pre:S.st,post:r.st,f:f,t:0,rev:false,merges:r.merges};
    S.left--;S.press=[];S.prev=null;S.kb=null;crease(a)}
  function undo(a){
    if(S.anim||S.cele>0)return;
    if(!S.hist.length){a.beep(200,.06,'square');return}
    var h=S.hist.pop(),sh=shift(h.f);S.org.x-=sh.x;S.org.y-=sh.y;
    S.anim={pre:h.st,post:S.st,f:h.f,t:0,rev:true,merges:[]};S.st=h.st;S.left++;S.undone=true;S.press=[];S.prev=null;S.kb=null;S.stuck=0;crease(a)}
  function endAnim(a){
    var an=S.anim;S.anim=null;
    if(an.rev){S.st=an.pre;return}
    var sh=shift(an.f);S.st=an.post;S.org.x+=sh.x;S.org.y+=sh.y;
    an.merges.forEach(function(m){var x=S.org.x+(m.x+.5)*S.cs,y=S.org.y+(m.y+.5)*S.cs;
      S.press.push({x:m.x,y:m.y,t:0});a.burst(x,y,COL[m.c][0],12);a.pop(x,y-18,a.lang==='ko'?'꾹!':'Press!','#fff')});
    if(an.merges.length){a.sfx('coin');a.shake(3);S.mood=.8}else a.beep(150,.07,'triangle');
    if(solved(S.st)){
      var unused=S.left,pts=10+unused*5;S.streak=S.undone?0:S.streak+1;pts+=Math.min(10,Math.max(0,S.streak-1)*2);
      a.add(pts);S.time=Math.min(TCAP,S.time+14);S.cele=1.25;S.flap=1.25;a.sfx('win');
      a.pop(CX,CY-70,(a.lang==='ko'?'완성! +':'Solved! +')+pts,'#fff3b0');
      if(S.streak>1)a.pop(CX,CY-44,(a.lang==='ko'?'연속 ':'Streak ')+S.streak,'#ffd0d8');
      a.burst(CX,CY,'#fff3b0',26);a.burst(CX,CY,'#ff9fb0',14)}
    else if(S.left<=0){a.sfx('hit');a.shake(6);S.stuck=1.6;S.mood=-1;
      a.pop(CX,CY-20,a.lang==='ko'?'되돌려 보세요':'Out of folds — undo','#ffe08a')}}

  /* 방향(dir)으로 접을 수 있는 접는 선 목록: 큰 날개(반 접기)부터 */
  function creases(dir){var V=dir==='left'||dir==='right',L=V?S.st.w:S.st.h,side=(dir==='left'||dir==='up')?1:0,out=[],c;
    if(side===0)for(c=Math.floor(L/2);c>=1;c--)out.push({ax:V?'v':'h',c:c,side:0});
    else for(c=Math.ceil(L/2);c<=L-1;c++)out.push({ax:V?'v':'h',c:c,side:1});
    return out}
  var BTN={x:14,y:586,w:108,h:40};

  function update(dt,inp,a){
    var i,k,s;
    for(i=S.snd.length-1;i>=0;i--){s=S.snd[i];s.t-=dt;if(s.t<=0){a.beep(s.f,s.d,s.ty);S.snd.splice(i,1)}}
    if(S.cele>0){S.cele-=dt;keyq.length=0;if(S.cele<=0){loadLevel(S.lvl+1,a);a.sfx('jump')}return}
    S.time-=dt;a.tempo(S.time<12?1.3:1);
    if(S.time<=0){S.time=0;S.dead=true;S.prev=null;S.drag=null;a.over();return}
    if(S.stuck>0)S.stuck-=dt;
    if(S.anim){S.anim.t+=dt/.52;if(S.anim.t>=1)endAnim(a)}
    /* 키보드 */
    while(keyq.length){k=keyq.shift();
      var dir=k==='ArrowLeft'||k==='KeyA'?'left':k==='ArrowRight'||k==='KeyD'?'right':k==='ArrowUp'||k==='KeyW'?'up':k==='ArrowDown'||k==='KeyS'?'down':null;
      if(dir&&!S.anim){var list=creases(dir);
        if(!list.length){a.beep(200,.05,'square');continue}
        if(S.kb&&S.kb.dir===dir)S.kb.i=(S.kb.i+1)%list.length;else S.kb={dir:dir,i:0};
        S.prev=list[S.kb.i];S.drag=null;a.beep(700+S.kb.i*120,.04,'triangle')}
      else if(k==='Space'){if(S.kb&&S.prev)doFold(S.prev,a)}
      else if(k==='KeyZ'||k==='Backspace')undo(a);
      else if(k==='Escape'){S.kb=null;S.prev=null}}
    /* 터치/마우스 */
    if(inp.tap&&inp.down&&inp.x!=null){
      if(inp.x>BTN.x&&inp.x<BTN.x+BTN.w&&inp.y>BTN.y-6&&inp.y<BTN.y+BTN.h+8)undo(a);
      else if(!S.anim){var x0=S.org.x,y0=S.org.y,x1=x0+S.st.w*S.cs,y1=y0+S.st.h*S.cs,M=30;
        if(inp.x>x0-M&&inp.x<x1+M&&inp.y>y0-M&&inp.y<y1+M){
          S.drag={x:Math.max(x0,Math.min(x1,inp.x)),y:Math.max(y0,Math.min(y1,inp.y))};S.kb=null;S.prev=null}}}
    if(S.drag){
      if(inp.x!=null&&!S.anim){var dx=inp.x-S.drag.x,dy=inp.y-S.drag.y,V=Math.abs(dx)>=Math.abs(dy),d=V?dx:dy;
        if(Math.abs(d)<14)S.prev=null;
        else{var L=V?S.st.w:S.st.h,side=d>0?0:1,mid=V?(S.drag.x+inp.x)/2-S.org.x:(S.drag.y+inp.y)/2-S.org.y,c=Math.round(mid/S.cs);
          if(L<2)S.prev=null;
          else{c=side===0?Math.max(1,Math.min(Math.floor(L/2),c)):Math.max(Math.ceil(L/2),Math.min(L-1,c));
            if(!S.prev||S.prev.c!==c||S.prev.side!==side||S.prev.ax!==(V?'v':'h'))a.beep(900,.02,'triangle');
            S.prev={ax:V?'v':'h',c:c,side:side}}}}
      if(!inp.down){if(S.prev)doFold(S.prev,a);S.drag=null;S.prev=null}}
    for(i=0;i<S.press.length;i++)S.press[i].t+=dt;
    var t=target(S.st),e=1-Math.exp(-9*dt);S.org.x+=(t.x-S.org.x)*e;S.org.y+=(t.y-S.org.y)*e;
    if(S.flap>0)S.flap-=dt;
    S.mood+=(0-S.mood)*Math.min(1,dt*1.2)}

  /* ---------- 그리기 도우미 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function shape(g,c,r){
    g.beginPath();
    if(c===1){g.moveTo(0,r*.82);g.bezierCurveTo(-r*1.5,-r*.15,-r*.62,-r*1.12,0,-r*.38);g.bezierCurveTo(r*.62,-r*1.12,r*1.5,-r*.15,0,r*.82)}
    else if(c===2){for(var i=0;i<10;i++){var q=-Math.PI/2+i*Math.PI/5,l=i%2?r*.52:r*1.02;g.lineTo(Math.cos(q)*l,Math.sin(q)*l+r*.04)}}
    else if(c===3){var al=.9,d=r*.55,b=Math.atan2(r*Math.sin(al),r*Math.cos(al)-d),r2=Math.hypot(r*Math.cos(al)-d,r*Math.sin(al));
      g.arc(0,0,r,al,6.2832-al,false);g.arc(d,0,r2,-b,b,true)}
    else{g.arc(0,-r*.4,r*.5,0,7);g.moveTo(-r*.42+r*.5,r*.3);g.arc(-r*.42,r*.3,r*.5,0,7);g.moveTo(r*.42+r*.5,r*.3);g.arc(r*.42,r*.3,r*.5,0,7)}
    g.closePath()}
  function stamp(g,c,x,y,r,wink,alpha){
    g.save();g.translate(x,y);g.globalAlpha*=alpha==null?1:alpha;
    g.lineJoin='round';shape(g,c,r);g.fillStyle=COL[c][0];g.fill();g.lineWidth=Math.max(1.5,r*.14);g.strokeStyle=COL[c][1];g.stroke();
    g.save();shape(g,c,r);g.clip();g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.ellipse(-r*.3,-r*.5,r*.6,r*.3,-.5,0,7);g.fill();g.restore();
    var fx=c===3?-r*.5:0,fy=c===1?-r*.05:c===4?r*.05:r*.05,e=c===3?r*.2:r*.27,er=Math.max(1.1,r*.09);
    g.fillStyle='#3a2318';g.strokeStyle='#3a2318';g.lineWidth=Math.max(1,r*.08);g.lineCap='round';
    g.beginPath();g.arc(fx-e,fy,er,0,7);g.fill();
    if(wink){g.beginPath();g.arc(fx+e,fy+er*.4,er*1.3,3.4,6.0);g.stroke()}else{g.beginPath();g.arc(fx+e,fy,er,0,7);g.fill()}
    g.beginPath();g.arc(fx,fy+r*.14,r*.15,.25,2.9);g.stroke();
    if(wink){g.fillStyle='rgba(255,120,140,.55)';g.beginPath();g.arc(fx-e*1.5,fy+r*.2,er*1.2,0,7);g.arc(fx+e*1.5,fy+r*.2,er*1.2,0,7);g.fill()}
    g.restore()}
  /* 종이 한 칸의 면: 앞면은 크림색 결, 뒷면은 민트 물방울 무늬 */
  function face(g,x,y,cs,back,sx,sy){
    if(back){g.fillStyle='#8fd0c2';g.fillRect(x,y,cs,cs);g.fillStyle='rgba(255,255,255,.55)';
      var n=3,i,j,st=cs/n;for(i=0;i<n;i++)for(j=0;j<n;j++){g.beginPath();g.arc(x+(i+.5)*st,y+(j+.5)*st,cs*.045,0,7);g.fill()}
      g.strokeStyle='rgba(40,110,100,.35)'}
    else{g.fillStyle='#fbf2dd';g.fillRect(x,y,cs,cs);
      var h=((sx*73+sy*151)%17)/17;g.strokeStyle='rgba(190,160,110,.22)';g.lineWidth=1;
      g.beginPath();g.moveTo(x+cs*(.15+h*.4),y+cs*(.2+h*.5));g.lineTo(x+cs*(.3+h*.4),y+cs*(.22+h*.5));
      g.moveTo(x+cs*(.7-h*.3),y+cs*(.75-h*.4));g.lineTo(x+cs*(.82-h*.3),y+cs*(.72-h*.4));g.stroke();
      g.strokeStyle='rgba(170,135,80,.38)'}
    g.lineWidth=1;g.strokeRect(x+.5,y+.5,cs-1,cs-1)}
  function lift(n){return Math.min(n-1,7)*1.7}
  function sheet(g,st,ox,oy,cs,skip){
    var x,y,c,px,py,l,i,pr;
    for(y=0;y<st.h;y++)for(x=0;x<st.w;x++){if(skip&&skip(x,y))continue;
      c=st.c[y*st.w+x];l=lift(c.n);px=ox+x*cs;py=oy+y*cs;
      if(l>0){g.fillStyle='#cdb88f';g.fillRect(px,py+cs-l-.5,cs,l+.5);g.strokeStyle='rgba(110,80,40,.5)';g.lineWidth=1;
        g.beginPath();for(i=1;i<=Math.min(c.n-1,7);i++){g.moveTo(px,py+cs-l+i*1.7-.5);g.lineTo(px+cs,py+cs-l+i*1.7-.5)}g.stroke()}
      face(g,px,py-l,cs,c.top,x,y);
      if(c.s.length){pr=null;for(i=0;i<S.press.length;i++)if(S.press[i].x===x&&S.press[i].y===y&&st===S.st)pr=S.press[i];
        var sc=1,wk=false;if(pr){wk=pr.t<1.1;sc=pr.t<.5?1+.45*Math.sin(pr.t/.5*Math.PI)*(1-pr.t):1}
        if(S.cele>0&&st===S.st){wk=true;sc=1+.12*Math.sin(tt*14)}
        if(c.top){g.fillStyle='rgba(255,250,235,.6)';g.beginPath();g.arc(px+cs/2,py-l+cs/2,cs*.4,0,7);g.fill()}
        stamp(g,c.s[c.s.length-1],px+cs/2,py-l+cs/2,cs*.29*sc,wk);
        for(i=0;i<c.s.length-1;i++){g.fillStyle=COL[c.s[i]][0];g.strokeStyle='#fff';g.lineWidth=1.5;
          g.beginPath();g.arc(px+9+i*10,py-l+cs-9,4,0,7);g.fill();g.stroke()}}}}
  function ease(t){return t-Math.sin(t*6.2832)/6.2832*.55}
  function isMov(f,a){return f.side?a>=f.c:a<f.c}
  function flap(g,an,p){
    var f=an.f,pre=an.pre,cs=S.cs,V=f.ax==='v',L=V?pre.w:pre.h,O=V?pre.h:pre.w,m=f.side?L-f.c:f.c,u=f.side?1:-1,
        th=p*Math.PI,co=Math.cos(th),si=Math.sin(th),cp=(V?S.org.x:S.org.y)+f.c*cs,p0=V?S.org.y:S.org.x,pC=p0+O*cs/2,a,o,k,dm,pos,ps,pc,cell,back,sc;
    /* 날개 그림자 */
    var far=cp+u*m*cs*co,lo=Math.min(cp,far)+5*si,ex=Math.abs(far-cp)+6*si;
    g.fillStyle='rgba(40,20,5,'+(.12+.22*si)+')';
    if(V)g.fillRect(lo,p0+7*si,ex,O*cs);else g.fillRect(p0+7*si,lo,O*cs,ex);
    for(o=0;o<O;o++)for(a=0;a<L;a++){if(!isMov(f,a))continue;
      cell=V?pre.c[o*pre.w+a]:pre.c[a*pre.w+o];k=f.side?a-f.c:f.c-1-a;dm=(k+.5)*cs;pos=cp+u*dm*co;
      ps=1+.2*si*(dm/(m*cs));pc=pC+(p0+(o+.5)*cs-pC)*ps;sc=Math.max(.03,Math.abs(co));
      g.save();if(V){g.translate(pos,pc-8*si);g.scale(sc,ps)}else{g.translate(pc,pos-8*si*(co<0?1:.4));g.scale(ps,sc)}
      back=co>=0?cell.top:cell.bot;face(g,-cs/2,-cs/2,cs,back,a,o);
      var sId=cell.s.length?(co>=0?cell.s[cell.s.length-1]:cell.s[0]):0;
      if(sId){if(back){g.fillStyle='rgba(255,250,235,.6)';g.beginPath();g.arc(0,0,cs*.4,0,7);g.fill()}stamp(g,sId,0,0,cs*.29,false)}
      g.fillStyle=co>=0?'rgba(60,30,0,'+(.3*si)+')':'rgba(255,255,255,'+(.22*si)+')';g.fillRect(-cs/2,-cs/2,cs,cs);
      g.restore()}}
  function preview(g,f){
    var st=S.st,cs=S.cs,V=f.ax==='v',L=V?st.w:st.h,O=V?st.h:st.w,m=f.side?L-f.c:f.c,ox=S.org.x,oy=S.org.y,a,o,ma,mv,sv,x,y,
        cp=(V?ox:oy)+f.c*cs,pulse=.5+.5*Math.sin(tt*9);
    /* 움직이는 쪽을 살짝 어둡게 */
    var a0=f.side?f.c:0;g.fillStyle='rgba(80,50,20,.16)';
    if(V)g.fillRect(ox+a0*cs,oy,m*cs,O*cs);else g.fillRect(ox,oy+a0*cs,O*cs,m*cs);
    /* 내려앉을 자리 */
    var l0=f.side?f.c-m:f.c;g.fillStyle='rgba(120,215,198,.5)';
    if(V)g.fillRect(ox+l0*cs,oy,m*cs,O*cs);else g.fillRect(ox,oy+l0*cs,O*cs,m*cs);
    g.setLineDash([6,5]);g.lineDashOffset=-tt*20;g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=2;
    if(V)g.strokeRect(ox+l0*cs+1,oy+1,m*cs-2,O*cs-2);else g.strokeRect(ox+1,oy+l0*cs+1,O*cs-2,m*cs-2);g.setLineDash([]);
    for(o=0;o<O;o++)for(a=0;a<L;a++){if(!isMov(f,a))continue;ma=2*f.c-1-a;
      mv=V?st.c[o*st.w+a]:st.c[a*st.w+o];sv=V?st.c[o*st.w+ma]:st.c[ma*st.w+o];if(!mv.s.length)continue;
      x=(V?ox+ma*cs:ox+o*cs)+cs/2;y=(V?oy+o*cs:oy+ma*cs)+cs/2;
      var top=mv.s[mv.s.length-1],hit=sv.s.length&&sv.s[sv.s.length-1]===top;
      if(hit){g.strokeStyle='rgba(255,236,140,'+(.6+.4*pulse)+')';g.lineWidth=4;g.beginPath();g.arc(x,y,cs*.4+pulse*3,0,7);g.stroke()}
      stamp(g,top,x+(hit?0:cs*.12),y-(hit?0:cs*.12),cs*.26,false,hit?.8:.7)}
    /* 접는 선 */
    g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=6;g.lineCap='round';g.beginPath();
    if(V){g.moveTo(cp,oy-10);g.lineTo(cp,oy+O*cs+10)}else{g.moveTo(ox-10,cp);g.lineTo(ox+O*cs+10,cp)}g.stroke();
    g.strokeStyle='#ff7a3c';g.lineWidth=3;g.setLineDash([9,6]);g.stroke();g.setLineDash([]);
    /* 방향 화살표 */
    var dir=f.side?-1:1,mx=V?cp:ox+O*cs/2,my=V?oy-22:cp,r=13;
    if(!V)mx=ox-22;
    g.save();g.translate(mx,my);if(!V)g.rotate(Math.PI/2);g.strokeStyle='#fff';g.lineWidth=5;g.beginPath();g.arc(0,6,r,Math.PI,0,false);g.stroke();
    g.strokeStyle='#ff7a3c';g.lineWidth=2.5;g.beginPath();g.arc(0,6,r,Math.PI,0,false);g.stroke();
    g.fillStyle='#ff7a3c';g.strokeStyle='#fff';g.lineWidth=1.5;g.beginPath();g.moveTo(dir*r-6,4);g.lineTo(dir*r+6,4);g.lineTo(dir*r,13);g.closePath();g.fill();g.stroke();g.restore()}

  function desk(g,dt){
    var gr=g.createLinearGradient(0,0,W,H);gr.addColorStop(0,'#c98f57');gr.addColorStop(.55,'#b0733f');gr.addColorStop(1,'#8a552c');
    g.fillStyle=gr;g.fillRect(0,0,W,H);
    var i,y;g.strokeStyle='rgba(70,35,10,.28)';g.lineWidth=2;
    for(i=0;i<6;i++){y=60+i*112;g.beginPath();g.moveTo(0,y);g.lineTo(W,y+6);g.stroke()}
    g.lineWidth=1;g.strokeStyle='rgba(255,220,170,.10)';
    for(i=0;i<22;i++){y=(i*31+7)%H;var x=(i*97)%W;g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+40,y+4,x+80,y-5,x+130,y+2);g.stroke()}
    g.strokeStyle='rgba(60,30,10,.16)';
    for(i=0;i<14;i++){y=(i*47+23)%H;x=(i*61+40)%W;g.beginPath();g.ellipse(x,y,16+i%5*5,4+i%3*2,.05,0,7);g.stroke()}
    /* 책상 소품: 천천히 흔들리는 시차 층 */
    var px=Math.sin(tt*.35)*3,py=Math.cos(tt*.28)*2;
    g.save();g.translate(px,py);
    /* 종이 조각 */
    [[30,150,.5,'#f4a7b5'],[332,206,-.4,'#ffe08a'],[318,150,.9,'#a9dcd2'],[24,470,-.7,'#c9b6f0'],[60,548,.3,'#fbf2dd']].forEach(function(s,i){
      g.save();g.translate(s[0],s[1]);g.rotate(s[2]+Math.sin(tt*.5+i)*.04);g.fillStyle='rgba(40,20,5,.2)';g.fillRect(-9,-6,22,16);
      g.fillStyle=s[3];g.beginPath();g.moveTo(-12,-8);g.lineTo(10,-10);g.lineTo(12,6);g.lineTo(-8,9);g.closePath();g.fill();g.restore()});
    g.restore();
    g.save();g.translate(-px*1.6,-py*1.6);
    /* 마스킹 테이프 */
    g.save();g.translate(4,246);g.fillStyle='rgba(40,20,5,.25)';g.beginPath();g.ellipse(4,6,27,27,0,0,7);g.fill();
    g.fillStyle='#f08a9b';g.beginPath();g.arc(0,0,26,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.setLineDash([4,6]);g.beginPath();g.arc(0,0,20,0,7);g.stroke();g.setLineDash([]);
    g.fillStyle='#8a552c';g.beginPath();g.arc(0,0,13,0,7);g.fill();g.fillStyle='#e9d9b8';g.beginPath();g.arc(0,0,13,0,7);g.arc(0,0,10,0,7,true);g.fill();g.restore();
    /* 가위 */
    g.save();g.translate(350,470);g.rotate(-.5+Math.sin(tt*.4)*.015);
    g.fillStyle='rgba(40,20,5,.22)';g.fillRect(-4,-58,10,62);
    g.fillStyle='#d9dee3';g.beginPath();g.moveTo(-5,0);g.lineTo(-1,-62);g.lineTo(3,0);g.closePath();g.fill();
    g.fillStyle='#b9c1c9';g.beginPath();g.moveTo(-2,0);g.lineTo(8,-58);g.lineTo(6,0);g.closePath();g.fill();
    g.strokeStyle='#4aa7a0';g.lineWidth=5;g.beginPath();g.ellipse(-9,16,8,12,.3,0,7);g.stroke();g.beginPath();g.ellipse(10,16,8,12,-.3,0,7);g.stroke();
    g.fillStyle='#6d747b';g.beginPath();g.arc(1,-2,2.5,0,7);g.fill();g.restore();
    g.restore();
    /* 빛줄기 + 먼지 */
    var sw=Math.sin(tt*.22)*26;g.save();g.globalCompositeOperation='lighter';
    var lg=g.createLinearGradient(60+sw,0,300+sw,0);lg.addColorStop(0,'rgba(255,230,170,0)');lg.addColorStop(.5,'rgba(255,230,170,.17)');lg.addColorStop(1,'rgba(255,230,170,0)');
    g.fillStyle=lg;g.beginPath();g.moveTo(120+sw,0);g.lineTo(300+sw,0);g.lineTo(230+sw*.4,H);g.lineTo(-40+sw*.4,H);g.closePath();g.fill();
    for(i=0;i<dust.length;i++){var d=dust[i];d.y-=d.s*dt*.5;d.x+=Math.sin(tt*.6+d.p)*dt*8;if(d.y<-4){d.y=H+4;d.x=Math.random()*W}
      g.fillStyle='rgba(255,240,200,'+(.18+.22*Math.sin(tt*1.3+d.p)*Math.sin(tt*1.3+d.p))+')';g.beginPath();g.arc(d.x,d.y,d.r,0,7);g.fill()}
    g.restore()}

  /* 종이학 마스코트 '두리' */
  function crane(g,x,y,dt){
    S.blinkT=(S.blinkT||0)-dt;if(S.blinkT<=0){S.blinkT=S.blink>0?.13:2+Math.random()*3;S.blink=S.blink>0?0:1}
    var fl=S.flap>0?Math.sin(tt*26)*.75:Math.sin(tt*1.6)*.06,goal=S.prev?.22:S.mood<-.3?-.25:0;
    S.tilt+=(goal-S.tilt)*Math.min(1,dt*8);
    var hop=S.flap>0?-Math.abs(Math.sin(tt*13))*10:0;
    g.save();g.translate(x,y+hop);
    g.fillStyle='rgba(40,20,5,.25)';g.beginPath();g.ellipse(0,26-hop,34,6,0,0,7);g.fill();
    function poly(c,p){g.fillStyle=c;g.beginPath();g.moveTo(p[0],p[1]);for(var i=2;i<p.length;i+=2)g.lineTo(p[i],p[i+1]);g.closePath();g.fill();g.strokeStyle='rgba(120,90,60,.45)';g.lineWidth=1;g.stroke()}
    poly('#f4c9d0',[18,6,46,-22,26,14]);               /* 꼬리 */
    g.save();g.translate(4,2);g.rotate(-fl-.15);poly('#f6dfe2',[-6,2,10,-44,22,4]);g.restore(); /* 뒷날개 */
    poly('#fff8ec',[-26,4,28,4,6,26,-10,22]);          /* 몸 */
    poly('#f1e6d2',[-26,4,6,26,-10,22]);
    g.save();g.translate(-2,4);g.rotate(fl+.1);poly('#ffffff',[-10,0,-2,-48,16,2]);poly('#f4c9d0',[-2,-48,16,2,6,-14]);g.restore(); /* 앞날개 */
    g.save();g.translate(-22,4);g.rotate(S.tilt);
    poly('#fff8ec',[0,0,-12,-38,-2,-30,8,-2]);         /* 목 */
    g.translate(-10,-36);
    poly('#ffffff',[-9,-8,9,-9,11,5,-7,8]);            /* 머리 */
    poly('#f5a13c',[-9,-5,-24,1,-8,5]);                /* 부리 */
    g.fillStyle='#3a2318';g.strokeStyle='#3a2318';g.lineWidth=1.6;g.lineCap='round';
    if(S.flap>0){g.beginPath();g.arc(1,0,3,3.5,5.9);g.stroke()}
    else if(S.blink>0){g.beginPath();g.moveTo(-2,-1);g.lineTo(4,-1);g.stroke()}
    else{g.beginPath();g.arc(1,-1,2.4,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(1.8,-1.8,.8,0,7);g.fill()}
    g.fillStyle='rgba(255,130,150,.55)';g.beginPath();g.arc(5,4,2.4,0,7);g.fill();
    g.restore();g.restore()}

  function txt(g,s,x,y,size,col,al){g.font=size+'px Jua, system-ui, sans-serif';g.textAlign=al||'center';g.textBaseline='middle';
    g.lineJoin='round';g.lineWidth=4;g.strokeStyle='rgba(60,30,10,.75)';g.strokeText(s,x,y);g.fillStyle=col||'#fff';g.fillText(s,x,y)}

  function draw(g,a,dt){
    dt=dt||.016;tt+=dt;var ko=a.lang==='ko',i;
    desk(g,dt);
    /* 상단 정보 */
    txt(g,(ko?'':'Lv ')+(S.lvl+1)+(ko?'판':''),16,52,20,'#fff3d6','left');
    var n=S.L.allow,fw=18,x0=CX-(n*fw+(n-1)*6)/2;
    for(i=0;i<n;i++){var on=i<S.left,fx=x0+i*(fw+6),fy=43;g.save();g.translate(fx,fy);
      if(S.stuck>0&&!S.left)g.translate(Math.sin(tt*40+i)*1.5,0);
      g.fillStyle='rgba(40,20,5,.3)';g.fillRect(2,3,fw,fw);g.fillStyle=on?'#fbf2dd':'rgba(90,55,25,.55)';g.fillRect(0,0,fw,fw);
      if(on){g.fillStyle='#8fd0c2';g.beginPath();g.moveTo(fw,0);g.lineTo(fw,fw*.6);g.lineTo(fw*.4,0);g.closePath();g.fill()}g.restore()}
    txt(g,ko?'남은 접기':'folds left',CX,72,12,'#ffe6bd');
    var tl=Math.max(0,S.time),lowT=tl<10;txt(g,Math.ceil(tl)+(ko?'초':'s'),W-16,52,20,lowT&&Math.sin(tt*12)>0?'#ff8a7a':'#fff3d6','right');
    g.fillStyle='rgba(60,30,10,.45)';rr(g,16,84,W-32,8,4);g.fill();
    g.fillStyle=lowT?'#ff7a66':'#ffd166';rr(g,16,84,Math.max(8,(W-32)*Math.min(1,tl/TCAP)),8,4);g.fill();
    var tip=S.L.tip;
    if(tip)txt(g,tip[a.lang],CX,114,17,'#fff');
    else if(S.lvl>=LEVELS.length)txt(g,(ko?'최소 ':'Par ')+S.L.par+(ko?'번':''),CX,114,15,'#ffe6bd');

    /* 종이 */
    var st=S.anim?S.anim.pre:S.st,ox=S.org.x,oy=S.org.y,cs=S.cs,an=S.anim,f=an&&an.f;
    g.save();
    if(S.cele>0){var k=1+.05*Math.sin(Math.min(1,(1.25-S.cele)*3)*Math.PI);g.translate(CX,CY);g.scale(k,k);g.rotate(Math.sin(tt*10)*.015);g.translate(-CX,-CY)}
    var sx=ox,sy=oy,sw=st.w*cs,sh=st.h*cs;
    if(an){var V=f.ax==='v',m=f.side?(V?st.w:st.h)-f.c:f.c;if(V){sw-=m*cs;if(!f.side)sx+=m*cs}else{sh-=m*cs;if(!f.side)sy+=m*cs}}
    g.fillStyle='rgba(40,20,5,.3)';g.shadowColor='rgba(40,20,5,.45)';g.shadowBlur=14;g.fillRect(sx+4,sy+8,sw,sh);g.shadowBlur=0;g.shadowColor='transparent';
    sheet(g,st,ox,oy,cs,an?function(x,y){return isMov(f,f.ax==='v'?x:y)}:null);
    if(an)flap(g,an,an.rev?1-ease(an.t):ease(an.t));
    else if(S.prev&&!S.dead&&S.cele<=0&&valid(S.st,S.prev))preview(g,S.prev);
    g.restore();
    /* 첫 판 손가락 안내 */
    if(S.lvl===0&&!S.hist.length&&!S.anim&&!S.prev&&S.cele<=0&&!S.dead){var q=(tt*.6)%1,hx=ox+8+ease(Math.min(1,q*1.3))*(st.w*cs-16),hy=oy+st.h*cs*.72;
      g.globalAlpha=q>.85?(1-q)/.15:1;g.fillStyle='rgba(255,255,255,.9)';g.strokeStyle='rgba(60,30,10,.7)';g.lineWidth=2;
      g.beginPath();g.arc(hx,hy,11,0,7);g.fill();g.stroke();g.fillStyle='#ff7a3c';g.beginPath();g.arc(hx,hy,5,0,7);g.fill();g.globalAlpha=1}
    /* 되돌리기 버튼 */
    var can=S.hist.length>0,pu=S.stuck>0?.5+.5*Math.sin(tt*14):0;
    g.fillStyle='rgba(40,20,5,.3)';rr(g,BTN.x+2,BTN.y+4,BTN.w,BTN.h,12);g.fill();
    g.fillStyle=can?(pu>.5?'#ffd166':'#fbf2dd'):'rgba(251,242,221,.45)';rr(g,BTN.x,BTN.y,BTN.w,BTN.h,12);g.fill();
    g.strokeStyle='rgba(120,80,40,.6)';g.lineWidth=2;g.stroke();
    g.strokeStyle=can?'#7a4a22':'rgba(122,74,34,.5)';g.lineWidth=3;g.lineCap='round';g.beginPath();g.arc(BTN.x+24,BTN.y+22,8,3.6,1.2);g.stroke();
    g.fillStyle=g.strokeStyle;g.beginPath();g.moveTo(BTN.x+11,BTN.y+12);g.lineTo(BTN.x+22,BTN.y+14);g.lineTo(BTN.x+14,BTN.y+23);g.closePath();g.fill();
    g.font='16px Jua, system-ui, sans-serif';g.textAlign='left';g.textBaseline='middle';g.fillText(ko?'되돌리기':'Undo',BTN.x+40,BTN.y+21);
    crane(g,236,588,dt);
    if(S.kb&&S.prev&&!S.anim)txt(g,ko?'같은 방향키: 선 바꾸기 · 스페이스: 접기':'Same arrow: next crease · Space: fold',CX,498,13,'#fff3d6')}

  SG.run({id:'paper-fold',
    title:{ko:'꾹꾹 종이접기',en:'Paper Fold'},
    how:{ko:'종이를 끌어 접어서 같은 도장끼리 포개세요. 색마다 하나만 남기면 성공! (방향키로 고르고 스페이스로 접기, Z로 되돌리기)',
         en:'Drag to fold the paper so matching stamps land on each other. Leave one of each colour! (Arrows pick, Space folds, Z undoes)'},
    init:init,update:update,draw:draw});
})();
