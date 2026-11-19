/* 싹둑 눈송이 (Snowflake Cut) — 접힌 종이를 오려서 펼치면 목표 무늬가 되도록 자르는 대칭 퍼즐.
   접기 논리(fold LUT, 래스터 자르기, IoU, 레벨 생성)는 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,N=200,CELL=2/N,D2R=Math.PI/180;

  /* ---------- 모드: 2겹(반 접기), 4겹(두 번), 6방향 눈송이(30도 쐐기, 12겹) ----------
     fold(x,y): 펼친 종이 위 한 점이 접힌 쐐기의 어디에 놓이는지(진짜 종이 접기와 같은 거울 매핑). */
  var MODES={
    2:{id:2,unit:176,ox:92,oy:345,phi:0,polar:false,step:1/15,ar:[0,16],br:[-16,16],rotStep:45,sizes:[.11,.17,.25],
       bx:[0,1],by:[-1,1],steps:[{a:90}],fold:function(x,y){return [Math.abs(x),y]}},
    4:{id:4,unit:250,ox:56,oy:522,phi:0,polar:false,step:.05,ar:[0,21],br:[0,21],rotStep:45,sizes:[.08,.12,.18],
       bx:[0,1],by:[0,1],steps:[{a:90},{a:0}],fold:function(x,y){return [Math.abs(x),Math.abs(y)]}},
    6:{id:6,unit:360,ox:180,oy:528,phi:75,polar:true,step:.05,astep:2.5,ar:[0,21],br:[0,12],rotStep:15,sizes:[.07,.12,.2],
       bx:[0,1],by:[0,.5],steps:[{a:30},{a:60},{a:120,last:1},{a:0}],
       fold:function(x,y){var r=Math.sqrt(x*x+y*y),t=Math.atan2(y,x)/D2R;t=((t%60)+60)%60;if(t>30)t=60-t;t*=D2R;return [r*Math.cos(t),r*Math.sin(t)]}}
  };
  var POLY={tri:[[1,0],[-.5,.866],[-.5,-.866]],notch:[[1,0],[0,.42],[-1,0],[0,-.42]],slit:[[1.15,.17],[-1.15,.17],[-1.15,-.17],[1.15,-.17]]};
  var TYPES=['circle','tri','notch','slit'];
  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function setup(m){
    m.gw=Math.round((m.bx[1]-m.bx[0])/CELL);m.gh=Math.round((m.by[1]-m.by[0])/CELL);m.rots=Math.round(360/m.rotStep);
    m.lut=new Int32Array(N*N);
    for(var J=0;J<N;J++)for(var I=0;I<N;I++){var x=-1+(I+.5)*CELL,y=-1+(J+.5)*CELL,k=J*N+I;
      if(m.id===6&&x*x+y*y>1){m.lut[k]=-1;continue}
      var f=m.fold(x,y),i=clamp(Math.floor((f[0]-m.bx[0])/CELL),0,m.gw-1),j=clamp(Math.floor((f[1]-m.by[0])/CELL),0,m.gh-1);
      m.lut[k]=j*m.gw+i}
    m.wt=new Uint16Array(m.gw*m.gh);for(var q=0;q<N*N;q++)if(m.lut[q]>=0)m.wt[m.lut[q]]++;
    /* 최종 조각(펼친 뒤 12/4/2개의 쐐기 복사본)의 2x2 행렬 */
    var all=[[1,0,0,1]],last=all;
    m.steps.forEach(function(s){var src=s.last?last:all,R=refl(s.a),nw=src.map(function(M){return mul(R,M)});all=all.concat(nw);last=nw});
    m.pieces=all}
  function mul(A,B){return [A[0]*B[0]+A[1]*B[2],A[0]*B[1]+A[1]*B[3],A[2]*B[0]+A[3]*B[2],A[2]*B[1]+A[3]*B[3]]}
  function refl(a){var c=Math.cos(2*a*D2R),s=Math.sin(2*a*D2R);return [c,s,s,-c]}
  function flapM(a,s){var c=Math.cos(a*D2R),n=Math.sin(a*D2R);/* R(a) diag(1,s) R(-a) */
    return [c*c+s*n*n,c*n-s*c*n,n*c-s*n*c,n*n+s*c*c]}
  [2,4,6].forEach(function(k){setup(MODES[k])});

  /* ---------- 자르기 ---------- 컷 = {t, s(크기), a,b(스냅 좌표), r(회전 칸)} 또는 {t:'loop', pts:[[x,y]..]} (월드 좌표) */
  function cutPos(m,c){if(m.polar){var r=c.a*m.step,t=c.b*m.astep*D2R;return [r*Math.cos(t),r*Math.sin(t)]}return [c.a*m.step,c.b*m.step]}
  function cutAng(m,c){return (90-m.phi+(c.r||0)*m.rotStep)*D2R}
  function geom(m,c){
    if(c.t==='loop')return {pts:c.pts};
    var p=cutPos(m,c),rho=m.sizes[c.s];
    if(c.t==='circle')return {cx:p[0],cy:p[1],r:rho};
    var an=cutAng(m,c),co=Math.cos(an),si=Math.sin(an);
    return {pts:POLY[c.t].map(function(q){return [p[0]+rho*(q[0]*co-q[1]*si),p[1]+rho*(q[0]*si+q[1]*co)]})}}
  function inGeom(G,x,y){
    if(!G.pts){var dx=x-G.cx,dy=y-G.cy;return dx*dx+dy*dy<=G.r*G.r}
    var p=G.pts,ins=false;
    for(var i=0,j=p.length-1;i<p.length;j=i++){var xi=p[i][0],yi=p[i][1],xj=p[j][0],yj=p[j][1];
      if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)ins=!ins}
    return ins}
  function bbox(G){if(!G.pts)return [G.cx-G.r,G.cy-G.r,G.cx+G.r,G.cy+G.r];
    var b=[1e9,1e9,-1e9,-1e9];G.pts.forEach(function(q){b[0]=Math.min(b[0],q[0]);b[1]=Math.min(b[1],q[1]);b[2]=Math.max(b[2],q[0]);b[3]=Math.max(b[3],q[1])});return b}
  function applyCut(m,w,c){var G=geom(m,c),bb=bbox(G),n=0,
      i0=Math.max(0,Math.floor((bb[0]-m.bx[0])/CELL)),i1=Math.min(m.gw-1,Math.floor((bb[2]-m.bx[0])/CELL)),
      j0=Math.max(0,Math.floor((bb[1]-m.by[0])/CELL)),j1=Math.min(m.gh-1,Math.floor((bb[3]-m.by[0])/CELL));
    for(var j=j0;j<=j1;j++)for(var i=i0;i<=i1;i++){var k=j*m.gw+i;
      if(w[k]&&inGeom(G,m.bx[0]+(i+.5)*CELL,m.by[0]+(j+.5)*CELL)){w[k]=0;n++}}
    return n}
  function wedgeMask(m,cuts){var w=new Uint8Array(m.gw*m.gh);w.fill(1);for(var i=0;i<cuts.length;i++)applyCut(m,w,cuts[i]);return w}
  /* 펼친 종이: 0 종이, 1 구멍, 2 종이 밖 */
  function unfold(m,w){var h=new Uint8Array(N*N),l;for(var k=0;k<N*N;k++){l=m.lut[k];h[k]=l<0?2:(w[l]?0:1)}return h}
  function unfoldCuts(m,cuts){return unfold(m,wedgeMask(m,cuts))}
  function iou(a,b){var I=0,U=0;for(var k=0;k<a.length;k++){if(a[k]===2)continue;var x=a[k]===1,y=b[k]===1;if(x||y){U++;if(x&&y)I++}}return U?I/U:1}
  function holeFrac(h){var c=0,t=0;for(var k=0;k<h.length;k++){if(h[k]===2)continue;t++;if(h[k]===1)c++}return c/t}
  function connected(h){/* 남은 종이가 한 조각인지(떨어져 나가는 조각이 없는지) */
    var seen=new Uint8Array(N*N),best=0,tot=0,st=[];
    for(var s=0;s<N*N;s++){if(h[s]!==0)continue;tot++;if(seen[s])continue;var sz=0;st.push(s);seen[s]=1;
      while(st.length){var k=st.pop(),x=k%N,y=(k-x)/N;sz++;
        if(x>0&&!seen[k-1]&&h[k-1]===0){seen[k-1]=1;st.push(k-1)}if(x<N-1&&!seen[k+1]&&h[k+1]===0){seen[k+1]=1;st.push(k+1)}
        if(y>0&&!seen[k-N]&&h[k-N]===0){seen[k-N]=1;st.push(k-N)}if(y<N-1&&!seen[k+N]&&h[k+N]===0){seen[k+N]=1;st.push(k+N)}}
      if(sz>best)best=sz}
    return tot>0&&best>=tot*.985}

  /* ---------- 손으로 만든 12단계 (전부 같은 시스템의 컷 순서) ---------- */
  function C(t,s,a,b,r){return {t:t,s:s,a:a,b:b,r:r||0}}
  var HAND=[
    {m:2,cuts:[C('circle',1,0,0)],hint:{ko:'접힌 종이를 오려서 펼쳐 봐요',en:'Cut the folded paper, then unfold'}},
    {m:2,cuts:[C('circle',0,0,7),C('circle',0,8,-5)],tip:{ko:'접힌 선에 닿으면 하나, 떨어지면 둘',en:'On the fold: one hole. Off it: two'}},
    {m:4,cuts:[C('circle',2,0,0),C('tri',1,11,11,3)],tip:{ko:'두 번 접으면 네 겹!',en:'Folded twice: four layers!'}},
    {m:6,cuts:[C('circle',1,0,0),C('notch',1,12,0,23)],tip:{ko:'세 번 접은 종이 — 눈송이!',en:'Folded three times: a snowflake!'}},
    {m:6,cuts:[C('tri',2,19,12,13),C('circle',1,0,0),C('circle',0,11,0)],tip:{ko:'가장자리를 자르면 뾰족한 별',en:'Cut the rim to make points'}},
    {m:4,cuts:[C('tri',1,10,0,2),C('circle',0,12,1),C('tri',1,0,10,4),C('circle',0,1,12)],tip:{ko:'반쪽 하트를 접힌 선에!',en:'Half a heart on the fold!'}},
    {m:2,cuts:[C('tri',2,0,14,4),C('circle',0,6,4),C('tri',0,0,-1,4),C('slit',0,10,-4,2)],tip:{ko:'고양이 얼굴을 반만 오려요',en:'Cut half a cat face'}},
    {m:6,cuts:[C('circle',1,0,0),C('circle',0,11,6),C('notch',0,19,0,23)],tip:{ko:'안쪽을 자르면 구멍이 12개!',en:'Cut inside: twelve holes!'}},
    {m:6,cuts:[C('circle',0,0,0),C('circle',1,7,12),C('notch',2,15,0,23)]},
    {m:4,cuts:[C('slit',1,10,10,7),C('circle',1,0,0),C('tri',0,20,0,2),C('tri',0,0,20,4)]},
    {m:6,cuts:[C('circle',0,0,0),C('notch',1,8,0,23),C('tri',1,20,12,13),C('circle',0,14,6)]},
    {m:6,cuts:[C('notch',2,12,0,23),C('slit',0,17,0,5),C('circle',1,7,12),C('tri',0,20,12,13),C('circle',0,0,0)]}
  ];

  function rng(seed){var s=(seed>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function key(c){return c.t+c.s}
  function trayFor(cuts,extra){var seen={},t=[];cuts.forEach(function(c){if(c.t!=='loop'&&!seen[key(c)]){seen[key(c)]=1;t.push({t:c.t,s:c.s})}});
    if(extra&&!seen[key(extra)])t.push(extra);
    t.sort(function(a,b){return TYPES.indexOf(a.t)-TYPES.indexOf(b.t)||a.s-b.s});return t}
  /* 모든 컷이 결과에 꼭 필요한지(하나라도 빼면 통과 못 하는지) + 종이가 한 조각인지 */
  /* 쐐기 칸마다 펼친 종이에서 몇 칸이 겹치는지(wt)로 가중하면 전체 IoU와 정확히 같다 → 생성기에서 빠르게 쓴다 */
  function iouW(m,a,b){var I=0,U=0,wt=m.wt;for(var k=0;k<a.length;k++){var x=!a[k],y=!b[k];if(x||y){U+=wt[k];if(x&&y)I+=wt[k]}}return U?I/U:1}
  function validTarget(m,cuts,thr){
    var n=m.gw*m.gh,one=cuts.map(function(c){var w=new Uint8Array(n);w.fill(1);applyCut(m,w,c);return w}),all=new Uint8Array(n),k,i,tot=0,hole=0;
    for(k=0;k<n;k++){var v=1;for(i=0;i<one.length;i++)v&=one[i][k];all[k]=v;tot+=m.wt[k];if(!v)hole+=m.wt[k]}
    var f=hole/tot;if(f<.05||f>.5)return null;
    var o=new Uint8Array(n);
    for(i=0;i<cuts.length;i++){for(k=0;k<n;k++){var u=1;for(var j=0;j<one.length;j++)if(j!==i)u&=one[j][k];o[k]=u}
      if(iouW(m,o,all)>=thr-.03)return null}
    var h=unfold(m,all);return connected(h)?h:null}
  function randCut(m,R){
    var t=TYPES[Math.floor(R()*4)],s=Math.floor(R()*3),a,b,r=0,u=R();
    if(m.polar){a=Math.floor(R()*21);b=Math.floor(R()*13);
      if(u<.45)b=R()<.5?0:12;else if(u<.65){a=19+Math.floor(R()*2)}
      if(a<3&&R()<.7)a=0;
      if(t!=='circle'){var radial=(b===0||b===6||b===12)&&R()<.7;
        if(radial){var dir=b*2.5+(R()<.5?0:(t==='tri'?180:90));if(t==='tri'&&a>=19)dir=b*2.5+180;r=((Math.round((dir-15)/15)%24)+24)%24}
        else r=Math.floor(R()*m.rots)}}
    else{var lo=m.br[0],hi=m.br[1];a=Math.floor(R()*16);b=lo+Math.floor(R()*(Math.min(hi,lo+32)-lo+1));if(m.id===4)b=Math.floor(R()*20);else b=Math.floor(R()*31)-15;
      if(u<.45){if(m.id===4&&R()<.5)b=0;else a=0}else if(u<.6){if(R()<.5)a=m.id===4?20:15;else b=m.id===4?20:(R()<.5?15:-15)}
      if(t!=='circle')r=Math.floor(R()*m.rots)}
    return {t:t,s:s,a:a,b:b,r:r}}
  function genLevel(n,seed){
    var R=rng(seed*7919+n*104729+13),d=n-HAND.length,u=R(),mid=u<.58?6:u<.82?4:2,m=MODES[mid],
        thr=levelThr(n),want=Math.min(5,2+Math.floor(d/3)+(R()<.3?1:0));
    for(var tries=0;tries<400;tries++){
      var k=tries>250?Math.max(2,want-1):want,cuts=[];for(var i=0;i<k;i++)cuts.push(randCut(m,R));
      if(validTarget(m,cuts,thr)){var extra=d>=4?{t:TYPES[Math.floor(R()*4)],s:Math.floor(R()*3)}:null;
        return {m:mid,cuts:cuts,tray:trayFor(cuts,extra),gen:true}}}
    return {m:6,cuts:[C('circle',1,0,0),C('notch',1,12,0,23)],tray:trayFor([C('circle',1,0,0),C('notch',1,12,0,23)]),gen:true}}
  function levelThr(n){return n<8?.85:.9}
  function getLevel(n,seed){
    var b=n<HAND.length?HAND[n]:genLevel(n,seed),m=MODES[b.m];
    return {n:n,mode:m,cuts:b.cuts,tray:(b.tray||trayFor(b.cuts)).map(function(t){return {t:t.t,s:t.s,r:0}}),
      scissors:b.cuts.length+1,thr:levelThr(n),hint:b.hint||null,tip:b.tip||null,target:unfoldCuts(m,b.cuts)}}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={MODES:MODES,N:N,CELL:CELL,HAND:HAND,geom:geom,inGeom:inGeom,wedgeMask:wedgeMask,unfold:unfold,unfoldCuts:unfoldCuts,
      iou:iou,holeFrac:holeFrac,connected:connected,getLevel:getLevel,genLevel:genLevel,levelThr:levelThr,validTarget:validTarget,cutPos:cutPos,mul:mul,refl:refl};
  if(typeof SG==='undefined')return;

  /* ================= 게임 ================= */
  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  var ko=true,lvN,L,cuts,wmask,cur,score,mode,modeT,time,streak,firstTry,tool,drag,loop,kc,kbOn,prevDown,lastX=0,lastY=0,
      tex=null,ttex=null,zoom=false,conf=[],snow=[],tG=0,peng,warned,initAt=0,flash,penalty,runSeed,result,diffCv=null,lastIoU=0,gain=0,shakeSc=0;
  var keyQ=[];
  if(!window.__snowCutKeys){window.__snowCutKeys=true;
    window.addEventListener('keydown',function(e){var c=e.code;
      if(/^(Arrow(Left|Right|Up|Down)|Digit[1-6]|Numpad[1-6]|Key[QEUZRXT]|Space|Enter)$/.test(c)){keyQ.push(c);if(keyQ.length>20)keyQ.shift()}})}

  /* ---------- 소리: 종이 바스락/가위 싹둑(필터 노이즈). 공용 음소거 버튼을 따른다 ---------- */
  var AC=null,NB=null;
  function muted(){var b=document.getElementById('sg-mute');return b&&b.textContent==='🔇'}
  function noise(dur,freq,q,vol,delay){if(muted())return;try{
    if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
    if(!NB){NB=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);var d=NB.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1}
    var s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain(),t=AC.currentTime+(delay||0);
    s.buffer=NB;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+Math.min(.03,dur*.3));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(AC.destination);s.start(t,Math.random()*.6);s.stop(t+dur+.05)}catch(e){}}
  function sndSnip(){noise(.05,5600,1.6,.3);noise(.07,4000,1.6,.25,.08)}
  function sndRustle(){noise(.34,1500,.5,.22);noise(.24,3400,.7,.12,.06)}

  /* ---------- 레이아웃 ---------- */
  var TRAY_Y=538,TRAY_H=48,BTN_Y=594,BTN_H=40,WORK_Y0=150,WORK_Y1=534;
  var CARD=[254,38,98,104],BTN={undo:[10,BTN_Y,68,BTN_H],rot:[84,BTN_Y,68,BTN_H],unf:[158,BTN_Y,148,BTN_H]};
  function inR(r,x,y){return x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3]}
  function slotR(i){return [10+i*54,TRAY_Y,50,TRAY_H]}
  function cutView(m){return {ox:m.ox,oy:m.oy,u:m.unit,phi:m.phi}}
  var CENTER={ox:180,oy:338,u:150};
  function toScreen(v,x,y){var c=Math.cos(v.phi*D2R),s=Math.sin(v.phi*D2R),xr=c*x-s*y,yr=s*x+c*y;return [v.ox+v.u*xr,v.oy-v.u*yr]}
  function toWorld(v,sx,sy){var dx=(sx-v.ox)/v.u,dy=-(sy-v.oy)/v.u,c=Math.cos(v.phi*D2R),s=Math.sin(v.phi*D2R);return [c*dx+s*dy,-s*dx+c*dy]}
  function snapAt(m,sx,sy){var w=toWorld(cutView(m),sx,sy);
    if(m.polar){var r=Math.hypot(w[0],w[1]),t=Math.atan2(w[1],w[0])/D2R;if(r>1.22||t<-25||t>55)return null;
      return {a:clamp(Math.round(r/m.step),m.ar[0],m.ar[1]),b:clamp(Math.round(t/m.astep),m.br[0],m.br[1])}}
    if(w[0]<-.2||w[0]>1.2||w[1]<m.by[0]-.2||w[1]>m.by[1]+.2)return null;
    return {a:clamp(Math.round(w[0]/m.step),m.ar[0],m.ar[1]),b:clamp(Math.round(w[1]/m.step),m.br[0],m.br[1])}}

  /* ---------- 종이 텍스처(벡터로 그린 쐐기, 구멍은 destination-out) ---------- */
  function domainPath(x,m,e){
    if(m.polar){x.moveTo(-e*2*Math.cos(15*D2R),-e*2*Math.sin(15*D2R));x.arc(0,0,1,-e,30*D2R+e);x.closePath()}
    else x.rect(m.bx[0]-e,m.by[0]-e,m.bx[1]-m.bx[0]+2*e,m.by[1]-m.by[0]+2*e)}
  function geomPath(x,G){x.beginPath();if(!G.pts){x.arc(G.cx,G.cy,G.r,0,7);return}
    G.pts.forEach(function(q,i){if(i)x.lineTo(q[0],q[1]);else x.moveTo(q[0],q[1])});x.closePath()}
  function makeTex(m,cl,col){
    var S=m.unit,mg=4,w=Math.ceil((m.bx[1]-m.bx[0])*S)+2*mg,h=Math.ceil((m.by[1]-m.by[0])*S)+2*mg;
    var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');
    x.save();x.translate(mg-m.bx[0]*S,mg+m.by[1]*S);x.scale(S,-S);
    x.save();x.beginPath();if(m.polar){x.arc(0,0,1,0,7)}else x.rect(-1,-1,2,2);x.clip();
    x.beginPath();domainPath(x,m,.006);x.fillStyle=col||'#fffdf8';x.fill();
    x.clip();x.lineCap='round';
    for(var fi=0;fi<90;fi++){var fx=m.bx[0]+hash(fi+1)*(m.bx[1]-m.bx[0]),fy=m.by[0]+hash(fi+7)*(m.by[1]-m.by[0]);
      x.strokeStyle=fi%2?'rgba(170,160,140,.10)':'rgba(255,255,255,.6)';x.lineWidth=.004;x.beginPath();x.moveTo(fx,fy);x.lineTo(fx+.03*(hash(fi+3)-.5),fy+.03*(hash(fi+5)-.5));x.stroke()}
    var fl=m.id===6?[[0,0,1,0],[0,0,Math.cos(30*D2R),Math.sin(30*D2R)]]:m.id===4?[[0,0,1,0],[0,0,0,1]]:[[0,-1,0,1]];
    fl.forEach(function(f){[.05,.03,.014].forEach(function(lw){x.strokeStyle='rgba(120,140,180,.05)';x.lineWidth=lw;x.beginPath();x.moveTo(f[0],f[1]);x.lineTo(f[2],f[3]);x.stroke()})});
    x.restore();
    x.globalCompositeOperation='destination-out';
    cl.forEach(function(ct){geomPath(x,geom(m,ct));x.fill('evenodd')});
    x.restore();
    var sh=document.createElement('canvas');sh.width=w;sh.height=h;var y=sh.getContext('2d');
    y.drawImage(c,0,0);y.globalCompositeOperation='source-in';y.fillStyle='#a9b6cf';y.fillRect(0,0,w,h);
    var lt=document.createElement('canvas');lt.width=w;lt.height=h;var z=lt.getContext('2d');
    z.drawImage(c,0,0);z.globalCompositeOperation='source-atop';z.fillStyle='rgba(150,150,185,.28)';z.fillRect(0,0,w,h);
    return {c:c,sh:sh,lt:lt,mg:mg,S:S,m:m}}
  function pieceXf(g,T,v,M){/* 텍스처 픽셀 → 화면. A = u·F·R(phi)·M */
    var m=T.m,c=Math.cos(v.phi*D2R),s=Math.sin(v.phi*D2R),FR=[c,-s,-s,-c],A=mul(FR,M);A=[A[0]*v.u,A[1]*v.u,A[2]*v.u,A[3]*v.u];
    var X0=m.bx[0]-T.mg/T.S,Y0=m.by[1]+T.mg/T.S;
    g.transform(A[0]/T.S,A[2]/T.S,-A[1]/T.S,-A[3]/T.S,v.ox+A[0]*X0+A[1]*Y0,v.oy+A[2]*X0+A[3]*Y0)}
  function drawPiece(g,T,v,M,img,alpha){g.save();g.globalAlpha=alpha==null?1:alpha;pieceXf(g,T,v,M);g.drawImage(img||T.c,0,0);g.restore()}
  function drawFull(g,T,v){T.m.pieces.forEach(function(M){drawPiece(g,T,v,M)})}

  /* ---------- 레벨 ---------- */
  function load(n){lvN=n;L=getLevel(n,runSeed);cuts=[];wmask=wedgeMask(L.mode,cuts);cur=unfold(L.mode,wmask);lastIoU=0;
    tex=makeTex(L.mode,cuts);ttex=makeTex(L.mode,L.cuts);tool=L.tray.length?1:0;drag=null;zoom=false;loop=null;mode='intro';modeT=0;firstTry=true;
    var m=L.mode;kc=m.polar?{a:12,b:6}:{a:8,b:m.id===4?8:0};result=null}
  function refresh(){wmask=wedgeMask(L.mode,cuts);cur=unfold(L.mode,wmask);tex=makeTex(L.mode,cuts);lastIoU=iou(cur,L.target)}
  function init(a){ko=a.lang==='ko';score=0;time=55;streak=0;kbOn=false;prevDown=true;warned=0;flash=0;penalty=0;gain=0;shakeSc=0;
    runSeed=Math.floor(Math.random()*1e9);initAt=performance.now();keyQ.length=0;conf=[];
    peng={blink:2,act:'idle',t:0};
    if(!snow.length)for(var i=0;i<54;i++)snow.push({x:hash(i)*W,y:hash(i+50)*H,l:i%3,p:hash(i+90)*6.3});
    load(0);a.tempo(1)}
  function scissorsLeft(){return L.scissors-cuts.length}
  function addCut(a,c,sx,sy){
    if(scissorsLeft()<=0){shakeSc=1;a.beep(220,.12,'square');return false}
    var before=wmask.slice?wmask:null;cuts.push(c);refresh();sndSnip();peng.act='snip';peng.t=0;
    for(var i=0;i<12;i++)conf.push({x:sx+(Math.random()-.5)*30,y:sy+(Math.random()-.5)*30,vx:(Math.random()-.5)*60,vy:-30-Math.random()*50,
      r:Math.random()*6.3,vr:(Math.random()-.5)*8,w:3+Math.random()*4,h:2+Math.random()*3,c:Math.random()<.8?'#fffdf8':'#cfe3ff',l:1.4+Math.random()})
    if(scissorsLeft()===0)a.beep(990,.08,'triangle');
    return true}
  function undo(a){if(!cuts.length){a.beep(200,.06,'square');return}cuts.pop();refresh();noise(.12,2400,.8,.12);a.beep(520,.05,'sine')}
  function startUnfold(a){if(drag||loop){drag=null;loop=null}mode='unfold';modeT=0;sndRustle();a.sfx('jump')}
  function unfoldDur(){return .45+L.mode.steps.length*.5+.6}

  /* ---------- 입력/업데이트 ---------- */
  function update(dt,inp,a){
    var i,m=L.mode,fresh=inp.down&&!prevDown,released=!inp.down&&prevDown;
    if(inp.x!=null){lastX=inp.x;lastY=inp.y}
    if(inp.down)kbOn=false;
    tG+=0;peng.t+=dt;flash=Math.max(0,flash-dt);gain=Math.max(0,gain-dt);shakeSc=Math.max(0,shakeSc-dt*3);
    var paused=mode==='unfold'||mode==='pass'||mode==='intro';
    if(!paused){time-=dt;if(time<10&&Math.ceil(time)!==warned&&time>0){warned=Math.ceil(time);a.beep(880,.05,'square')}
      if(time<=0){time=0;a.over();return}}
    modeT+=dt;
    var keys=keyQ.splice(0);if(performance.now()-initAt<150)keys=[];
    if(keys.length)kbOn=true;
    if(mode==='intro'){if(modeT>.45){mode='cut';modeT=0}}
    else if(mode==='cut'){
      if(zoom){if(fresh||keys.length){zoom=false;a.sfx('tap')}prevDown=inp.down;return}
      /* 키보드 */
      keys.forEach(function(c){
        var mv=null;
        if(c==='ArrowUp')mv=m.polar?[1,0]:[0,1];else if(c==='ArrowDown')mv=m.polar?[-1,0]:[0,-1];
        else if(c==='ArrowLeft')mv=m.polar?[0,1]:[-1,0];else if(c==='ArrowRight')mv=m.polar?[0,-1]:[1,0];
        if(mv){kc.a=clamp(kc.a+mv[0],m.ar[0],m.ar[1]);kc.b=clamp(kc.b+mv[1],m.br[0],m.br[1]);
          if(loop&&loop.kb){var p=cutPos(m,kc);loop.pts.push(p)}return}
        var dg=/(\d)$/.exec(c);
        if(dg&&/Digit|Numpad/.test(c)){var n=+dg[1]-1;if(n<=L.tray.length){tool=n;loop=null;a.sfx('tap')}return}
        if(c==='KeyQ'||c==='KeyE'||c==='KeyR'){if(tool>0){var tt=L.tray[tool-1];tt.r=(tt.r+(c==='KeyQ'?-1:1)+m.rots)%m.rots;a.beep(700,.04,'sine')}return}
        if(c==='KeyU'){startUnfold(a);return}
        if(c==='KeyT'){zoom=true;return}
        if(c==='KeyZ'||c==='KeyX'){loop=null;undo(a);return}
        if(c==='Space'||c==='Enter'){
          var sp=toScreen(cutView(m),cutPos(m,kc)[0],cutPos(m,kc)[1]);
          if(tool>0){var t2=L.tray[tool-1];addCut(a,{t:t2.t,s:t2.s,a:kc.a,b:kc.b,r:t2.r},sp[0],sp[1])}
          else if(!loop){loop={kb:true,pts:[cutPos(m,kc)]};a.beep(600,.04,'sine')}
          else{var lp=loop.pts;loop=null;if(lp.length>=3)addCut(a,{t:'loop',pts:lp},sp[0],sp[1])}}});
      if(mode!=='cut')return;
      /* 포인터 */
      if(fresh&&inp.x!=null){var x=inp.x,y=inp.y;
        for(i=0;i<=L.tray.length;i++)if(inR(slotR(i),x,y)){if(tool===i&&i>0){var t3=L.tray[i-1];t3.r=(t3.r+1)%m.rots}tool=i;loop=null;a.sfx('tap');break}
        if(i>L.tray.length){
          if(inR(BTN.undo,x,y))undo(a);
          else if(inR(BTN.rot,x,y)){if(tool>0){var t4=L.tray[tool-1];t4.r=(t4.r+1)%m.rots;a.beep(700,.04,'sine')}else a.beep(220,.06,'square')}
          else if(inR(BTN.unf,x,y))startUnfold(a);
          else if(inR(CARD,x,y)){zoom=!zoom;a.sfx('tap')}
          else if(y>WORK_Y0&&y<WORK_Y1){if(tool>0)drag={sn:snapAt(m,x,y)};else loop={pts:[[x,y]],len:0}}}}
      else if(inp.down&&inp.x!=null){
        if(drag)drag.sn=snapAt(m,inp.x,inp.y);
        if(loop&&!loop.kb){var lq=loop.pts[loop.pts.length-1],dd=Math.hypot(inp.x-lq[0],inp.y-lq[1]);
          if(dd>4){loop.pts.push([inp.x,inp.y]);loop.len+=dd;if(Math.random()<.25)noise(.03,6000,2,.05)}}}
      if(released&&mode==='cut'){
        if(drag){var sn=drag.sn;drag=null;if(sn){var t5=L.tray[tool-1],wp=cutPos(m,sn),s2=toScreen(cutView(m),wp[0],wp[1]);addCut(a,{t:t5.t,s:t5.s,a:sn.a,b:sn.b,r:t5.r},s2[0],s2[1])}}
        else if(loop&&!loop.kb){var pts=loop.pts,len=loop.len,ar=0;loop=null;
          for(i=0;i<pts.length;i++){var p1=pts[i],p2=pts[(i+1)%pts.length];ar+=p1[0]*p2[1]-p2[0]*p1[1]}
          if(len>40&&Math.abs(ar)/2>120){var v=cutView(m),cx=0,cy=0;pts.forEach(function(p){cx+=p[0];cy+=p[1]});
            addCut(a,{t:'loop',pts:pts.map(function(p){return toWorld(v,p[0],p[1])})},cx/pts.length,cy/pts.length)}}}
    }
    else if(mode==='unfold'){
      var st=m.steps,k=Math.floor((modeT-.45)/.5);
      if(modeT>.45&&k<st.length&&k!==peng.lastStep){peng.lastStep=k;sndRustle();a.beep(330+k*90,.08,'triangle')}
      if(modeT>=unfoldDur()){peng.lastStep=-1;finishUnfold(a)}}
    else if(mode==='pass'){if(modeT>2.1||(modeT>.7&&(fresh||keys.length)))load(lvN+1)}
    else if(mode==='fail'){if(modeT>.5&&(fresh||keys.length)){time=Math.max(0,time-3);penalty=1;a.pop(80,96,ko?'-3초':'-3s','#ff8a8a');mode='cut';modeT=0;a.beep(400,.06,'sine')}}
    prevDown=inp.down}

  function finishUnfold(a){
    var sc=iou(cur,L.target);result={iou:sc};modeT=0;
    if(sc>=L.thr){
      var left=scissorsLeft(),bonus=Math.round((sc-L.thr)*100),pts=10+bonus+3*left+(firstTry?2*streak:0);
      if(firstTry)streak++;else streak=0;
      a.add(pts);time=Math.min(70,time+14);gain=1.2;mode='pass';peng.act='clap';peng.t=0;
      a.sfx('win');a.beep(1568,.25,'sine');
      ['#ffffff','#bfe1ff','#ffd27a','#ff9db3'].forEach(function(c){a.burst(CENTER.ox,CENTER.oy,c,10)});
      a.pop(CENTER.ox,CENTER.oy-60,'+'+pts,'#fff2a8');result.pts=pts}
    else{firstTry=false;streak=0;mode='fail';peng.act='worry';peng.t=0;a.sfx('hit');a.shake(5);
      a.pop(CENTER.ox,CENTER.oy-40,Math.round(sc*100)+'%','#ff9a9a');buildDiff()}}
  function buildDiff(){
    if(!diffCv){diffCv=document.createElement('canvas');diffCv.width=N;diffCv.height=N}
    var x=diffCv.getContext('2d'),im=x.createImageData(N,N),d=im.data;
    for(var J=0;J<N;J++)for(var I=0;I<N;I++){var k=J*N+I,o=((N-1-J)*N+I)*4,p=cur[k],t=L.target[k],c;
      if(p===2)c=[0,0,0,0];else if(p===1&&t===1)c=[255,255,255,255];else if(p===1)c=[240,70,80,255];else if(t===1)c=[60,140,255,255];else c=[120,134,170,150];
      d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=c[3]}
    x.putImageData(im,0,0)}

  /* ================= 그리기 ================= */
  var F=function(s){return s+'px Jua, system-ui, sans-serif'};
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function flake(g,x,y,r,rot){g.save();g.translate(x,y);g.rotate(rot);g.beginPath();
    for(var i=0;i<6;i++){g.moveTo(0,0);g.lineTo(r,0);g.moveTo(r*.55,0);g.lineTo(r*.75,r*.2);g.moveTo(r*.55,0);g.lineTo(r*.75,-r*.2);g.rotate(Math.PI/3)}g.stroke();g.restore()}
  function drawWindow(g,x0,y0,w,h,t,dt,big){
    var gr=g.createLinearGradient(0,y0,0,y0+h);gr.addColorStop(0,'#1b2650');gr.addColorStop(.7,'#3f5592');gr.addColorStop(1,'#7d8fc4');
    g.fillStyle=gr;g.fillRect(x0,y0,w,h);
    g.save();g.beginPath();g.rect(x0,y0,w,h);g.clip();
    /* 먼 숲 */
    g.fillStyle='rgba(30,44,90,.75)';g.beginPath();g.moveTo(x0,y0+h);
    for(var i=0;i<=24;i++){var tx=x0+i*w/24,th=h*(.18+.12*hash(i+7));g.lineTo(tx,y0+h-th*(i%2?.6:1))}g.lineTo(x0+w,y0+h);g.fill();
    g.fillStyle='rgba(235,242,255,.9)';g.fillRect(x0,y0+h-6,w,6);
    /* 눈 3겹 */
    for(i=0;i<snow.length;i++){var p=snow[i],sp=[14,26,44][p.l],sz=[1.2,2,3.2][p.l];
      var yy=((p.y+t*sp)%H+H)%H,xx=((p.x+Math.sin(t*.6+p.p)*12*(p.l+1)+t*6)%W+W)%W;
      var fx=x0+xx/W*w,fy=y0+yy/H*h;g.fillStyle='rgba(255,255,255,'+(.45+p.l*.2)+')';g.beginPath();g.arc(fx,fy,sz*(big?1.4:1),0,7);g.fill()}
    /* 성에 */
    [[x0,y0],[x0+w,y0],[x0,y0+h],[x0+w,y0+h]].forEach(function(c,j){var rg=g.createRadialGradient(c[0],c[1],0,c[0],c[1],h*.55);
      rg.addColorStop(0,'rgba(235,245,255,.75)');rg.addColorStop(1,'rgba(235,245,255,0)');g.fillStyle=rg;g.fillRect(x0,y0,w,h)});
    g.restore();
    g.strokeStyle='#7a4f33';g.lineWidth=7;g.strokeRect(x0,y0,w,h);
    g.strokeStyle='#9b6a46';g.lineWidth=2;g.strokeRect(x0-3,y0-3,w+6,h+6)}
  function drawTable(g,t){
    var gr=g.createLinearGradient(0,150,0,H);gr.addColorStop(0,'#c28a58');gr.addColorStop(1,'#93603a');g.fillStyle=gr;g.fillRect(-20,148,W+40,H);
    g.strokeStyle='rgba(90,50,25,.25)';g.lineWidth=1.5;
    for(var i=0;i<5;i++){var y=190+i*92;g.beginPath();g.moveTo(-10,y);g.lineTo(W+10,y+4);g.stroke()}
    g.strokeStyle='rgba(255,220,170,.12)';g.lineWidth=1;
    for(i=0;i<22;i++){var yy=160+hash(i+3)*470,xx=hash(i+8)*W;g.beginPath();g.moveTo(xx,yy);g.bezierCurveTo(xx+30,yy-3,xx+60,yy+4,xx+100,yy);g.stroke()}
    g.fillStyle='rgba(40,20,10,.35)';g.fillRect(-20,148,W+40,5);
    /* 종이 조각 */
    var cols=['#ff8fa3','#8ecbff','#ffd36b','#9fe0a8','#c9a7ff'];
    for(i=0;i<7;i++){var sx=i<4?8+hash(i+20)*28:322+hash(i+30)*28,sy=250+hash(i+40)*240;
      g.save();g.translate(sx,sy);g.rotate(hash(i+50)*6);g.fillStyle='rgba(0,0,0,.15)';g.fillRect(-7,-4,15,10);
      g.fillStyle=cols[i%5];g.beginPath();g.moveTo(-8,-6);g.lineTo(9,-4);g.lineTo(5,6);g.lineTo(-6,4);g.closePath();g.fill();g.restore()}
    /* 머그 */
    var mx=330,my=200;g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(mx+3,my+22,20,6,0,0,7);g.fill();
    g.fillStyle='#d65b5b';rr(g,mx-15,my-12,30,32,6);g.fill();g.strokeStyle='#d65b5b';g.lineWidth=5;g.beginPath();g.arc(mx+16,my+3,7,-1.3,1.3);g.stroke();
    g.fillStyle='#fff';g.fillRect(mx-15,my-2,30,4);g.fillRect(mx-15,my+6,30,2);
    g.fillStyle='#5a2e1c';g.beginPath();g.ellipse(mx,my-12,15,4,0,0,7);g.fill();
    g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2.4;g.lineCap='round';
    for(i=0;i<2;i++){g.beginPath();for(var s=0;s<=14;s++){var py=my-16-s*3.2,px=mx-4+i*8+Math.sin(t*2+s*.5+i*2)*3.5;if(s)g.lineTo(px,py);else g.moveTo(px,py)}g.stroke()}
  }
  function drawLamp(g,t){var fl=.92+.04*Math.sin(t*3.1)+.03*Math.sin(t*7.3);
    var rg=g.createRadialGradient(30,170,10,30,170,330);rg.addColorStop(0,'rgba(255,214,140,'+(.34*fl)+')');rg.addColorStop(1,'rgba(255,214,140,0)');
    g.fillStyle=rg;g.fillRect(0,140,W,H-140)}

  function drawPeng(g,x,y,t){
    var act=peng.act,at=peng.t,bob=Math.sin(t*2)*1.2,arm=0;
    if(act==='snip'&&at>.35)peng.act='idle';
    if(act==='clap'){bob=-Math.abs(Math.sin(at*9))*5}
    g.save();g.translate(x,y+bob);
    g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(0,26-bob,22,5,0,0,7);g.fill();
    /* 발 */
    g.fillStyle='#ff9f3a';g.beginPath();g.ellipse(-8,24,7,3.5,0,0,7);g.ellipse(8,24,7,3.5,0,0,7);g.fill();
    /* 몸 */
    var bg=g.createLinearGradient(-20,-30,20,26);bg.addColorStop(0,'#3b4a72');bg.addColorStop(1,'#1d2640');
    g.fillStyle=bg;g.beginPath();g.ellipse(0,0,20,25,0,0,7);g.fill();
    g.fillStyle='#fbf7ef';g.beginPath();g.ellipse(0,6,13,17,0,0,7);g.fill();
    g.fillStyle='#fff';g.beginPath();g.ellipse(-6,-8,6.5,7,0,0,7);g.ellipse(6,-8,6.5,7,0,0,7);g.fill();
    /* 목도리 */
    g.fillStyle='#e05a5a';rr(g,-17,-3,34,7,3);g.fill();g.fillRect(8,0,6,14);g.fillStyle='#f6d36b';g.fillRect(-12,-3,3,7);g.fillRect(-2,-3,3,7);g.fillRect(8,-3,3,7);
    /* 날개 */
    var la,ra;
    if(act==='clap'){var c=Math.abs(Math.sin(at*9));la=-1.1+c*.6;ra=1.1-c*.6}
    else if(act==='worry'){la=-.2;ra=.2}
    else if(act==='snip'){la=.35;ra=-.9+Math.sin(at*30)*.3}
    else{la=.35+Math.sin(t*1.7)*.05;ra=-.35}
    g.fillStyle='#26314f';
    g.save();g.translate(-17,-2);g.rotate(la);g.beginPath();g.ellipse(0,9,5,12,0,0,7);g.fill();g.restore();
    g.save();g.translate(17,-2);g.rotate(ra);g.beginPath();g.ellipse(0,9,5,12,0,0,7);g.fill();
    /* 작은 가위 */
    g.translate(0,20);g.rotate(-.5);var op=act==='snip'?Math.abs(Math.sin(at*30))*.5:.15;
    g.strokeStyle='#e8eef6';g.lineWidth=2;g.beginPath();g.moveTo(0,0);g.lineTo(Math.sin(op)*10,10);g.moveTo(0,0);g.lineTo(-Math.sin(op)*10,10);g.stroke();
    g.strokeStyle='#ff6f8f';g.lineWidth=2;g.beginPath();g.arc(-3,-4,3,0,7);g.stroke();g.beginPath();g.arc(3,-4,3,0,7);g.stroke();g.restore();
    /* 눈 */
    peng.blink-=1/60;var bl=peng.blink<0;if(peng.blink<-.12)peng.blink=2+Math.random()*3;
    g.fillStyle='#1b1b2a';g.strokeStyle='#1b1b2a';g.lineWidth=1.8;g.lineCap='round';
    if(act==='clap'){g.beginPath();g.arc(-6,-8,3,3.4,6.0);g.stroke();g.beginPath();g.arc(6,-8,3,3.4,6.0);g.stroke()}
    else if(act==='worry'){g.beginPath();g.moveTo(-9,-10);g.lineTo(-4,-8);g.lineTo(-9,-6);g.stroke();g.beginPath();g.moveTo(9,-10);g.lineTo(4,-8);g.lineTo(9,-6);g.stroke();
      g.fillStyle='#8fd0ff';g.beginPath();g.moveTo(16,-18);g.quadraticCurveTo(20,-11,16,-9);g.quadraticCurveTo(12,-11,16,-18);g.fill()}
    else if(bl){g.beginPath();g.moveTo(-9,-8);g.lineTo(-3,-8);g.moveTo(3,-8);g.lineTo(9,-8);g.stroke()}
    else{var lk=drag||loop?1.2:0;g.beginPath();g.arc(-5.5+lk,-8+lk,2.6,0,7);g.arc(6.5+lk,-8+lk,2.6,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(-4.6+lk,-9+lk,.9,0,7);g.arc(7.4+lk,-9+lk,.9,0,7);g.fill()}
    g.fillStyle='rgba(255,130,150,.5)';g.beginPath();g.arc(-11,-3,2.6,0,7);g.arc(11,-3,2.6,0,7);g.fill();
    g.fillStyle='#ffa63d';g.beginPath();g.moveTo(-4,-4);g.lineTo(4,-4);g.lineTo(0,act==='worry'?0:1);g.closePath();g.fill();
    if(act==='clap'){g.fillStyle='#ffe36b';for(var i=0;i<3;i++){var aa=-1.6+(i-1)*.8,dd=30+Math.sin(at*8+i)*3;g.font=F(12);g.textAlign='center';g.fillText('✦',Math.cos(aa)*dd,Math.sin(aa)*dd)}}
    g.restore()}

  function stampOutline(g,m,c,v,dash){var G=geom(m,c);g.beginPath();
    if(!G.pts){var p=toScreen(v,G.cx,G.cy);g.arc(p[0],p[1],G.r*v.u,0,7)}
    else G.pts.forEach(function(q,i){var p=toScreen(v,q[0],q[1]);if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])});
    g.closePath()}
  function trayIcon(g,t,s,r,x,y,m){var sz=[7,10,14][s],a=(90+(r||0)*m.rotStep)*D2R;/* 화면에서 보이는 방향 */
    g.save();g.translate(x,y);g.rotate(-a);g.beginPath();
    if(t==='circle')g.arc(0,0,sz,0,7);
    else POLY[t].forEach(function(q,i){if(i)g.lineTo(q[0]*sz*1.15,-q[1]*sz*1.15);else g.moveTo(q[0]*sz*1.15,-q[1]*sz*1.15)});
    g.closePath();g.restore()}

  function drawCards(g,t){
    /* 목표 카드 */
    var cx=303,cy=88,s=46;
    g.save();g.translate(cx,cy);g.rotate(.04);
    g.fillStyle='rgba(0,0,0,.3)';rr(g,-s-2,-s+3,2*s+4,2*s+8,8);g.fill();
    g.fillStyle='#24355f';rr(g,-s,-s,2*s,2*s+4,8);g.fill();g.strokeStyle='#f5e7c8';g.lineWidth=2.5;rr(g,-s,-s,2*s,2*s+4,8);g.stroke();
    g.restore();
    var v={ox:cx,oy:cy+4,u:38,phi:L.mode.id===6?90:0};drawFull(g,ttex,v);
    g.fillStyle='#e05a5a';g.beginPath();g.arc(cx,cy-s+2,4,0,7);g.fill();
    g.fillStyle='#fff';g.font=F(12);g.textAlign='center';g.fillStyle='#24355f';
    rr(g,cx-30,cy+s-4,60,16,8);g.fillStyle='#f5e7c8';g.fill();g.fillStyle='#24355f';g.fillText(ko?'목표 🔍':'Target 🔍',cx,cy+s+8);
    /* 미리보기 */
    var px=210,py=92,ps=34;
    g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.arc(px+2,py+3,ps+3,0,7);g.fill();
    g.fillStyle='#31477c';g.beginPath();g.arc(px,py,ps+2,0,7);g.fill();
    drawFull(g,tex,{ox:px,oy:py,u:L.mode.id===6?ps:ps*.92,phi:L.mode.id===6?90:0});
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1.5;g.beginPath();g.arc(px,py,ps+2,0,7);g.stroke();
    var pct=Math.round(lastIoU*100),ok=lastIoU>=L.thr;
    g.font=F(14);g.textAlign='center';rr(g,px-26,py+ps-2,52,18,9);g.fillStyle=ok?'#4fc36b':'#f5e7c8';g.fill();
    g.fillStyle=ok?'#fff':'#24355f';g.fillText((ko?'일치 ':'')+pct+'%',px,py+ps+12);
    g.font=F(11);g.fillStyle='rgba(255,255,255,.85)';g.fillText(ko?'펼치면':'Preview',px,py-ps-4)}

  function drawHUD(g,t){
    g.textAlign='left';g.font=F(14);g.fillStyle='#fff';g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=4;
    g.fillText((ko?'단계 ':'Level ')+(lvN+1)+'  ·  '+(ko?'기준 ':'need ')+Math.round(L.thr*100)+'%',16,54);
    var low=time<10;g.font=F(low?28+Math.sin(t*12)*2:26);g.fillStyle=gain>0?'#8dffa6':low?'#ff8a8a':'#fff';
    g.fillText('⏱ '+Math.ceil(time),16,88);
    if(gain>0){g.font=F(14);g.globalAlpha=Math.min(1,gain);g.fillText('+14',96,86);g.globalAlpha=1}
    g.shadowBlur=0;
    /* 가위 아이콘 */
    var left=scissorsLeft(),sx=16+(shakeSc>0?Math.sin(t*60)*3*shakeSc:0);
    for(var i=0;i<L.scissors;i++){var x=sx+i*24,y=114,on=i<left;g.save();g.translate(x+9,y);g.globalAlpha=on?1:.3;
      g.strokeStyle=on?'#ffe6a8':'#c9d3ea';g.lineWidth=2;g.lineCap='round';g.beginPath();g.moveTo(-4,4);g.lineTo(6,-7);g.moveTo(4,4);g.lineTo(-6,-7);g.stroke();
      g.strokeStyle=on?'#ff7d9b':'#c9d3ea';g.beginPath();g.arc(-5,7,3,0,7);g.stroke();g.beginPath();g.arc(5,7,3,0,7);g.stroke();g.restore()}
    g.globalAlpha=1}

  function drawWedge(g,v,t){var m=L.mode,o=[[3.2,4.4],[2.1,2.9],[1.05,1.45]];
    g.save();g.shadowColor='rgba(40,20,10,.35)';g.shadowBlur=14;g.shadowOffsetY=6;drawPiece(g,tex,{ox:v.ox+4,oy:v.oy+5,u:v.u,phi:v.phi},[1,0,0,1],tex.sh);g.restore();
    o.forEach(function(d,i){drawPiece(g,tex,{ox:v.ox+d[0],oy:v.oy+d[1],u:v.u,phi:v.phi},[1,0,0,1],tex.sh,.55+i*.15)});
    drawPiece(g,tex,v,[1,0,0,1]);
    /* 접힌 선 표시 */
    g.save();g.strokeStyle='rgba(90,140,220,.75)';g.lineWidth=2;g.setLineDash([6,5]);g.lineDashOffset=-t*8;g.beginPath();
    var segs=m.id===6?[[[0,0],[1,0]],[[0,0],[Math.cos(30*D2R),Math.sin(30*D2R)]]]:m.id===4?[[[0,0],[1,0]],[[0,0],[0,1]]]:[[[0,-1],[0,1]]];
    segs.forEach(function(sg){var a=toScreen(v,sg[0][0],sg[0][1]),b=toScreen(v,sg[1][0],sg[1][1]);g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1])});g.stroke();g.restore();
    var lab=m.id===6?toScreen(v,.12,-.03):m.id===4?toScreen(v,.5,-.06):toScreen(v,-.1,.94);
    g.font=F(11);g.fillStyle='rgba(60,90,160,.9)';g.textAlign='center';
    if(m.id!==6){g.fillText(ko?'접힌 선':'fold',lab[0],lab[1]+4)}
  }

  function draw(g,a,dt){
    dt=dt||0;tG+=dt;var t=tG,i,m=L.mode;ko=a.lang==='ko';
    /* 배경 */
    g.fillStyle='#2a1c14';g.fillRect(-20,-20,W+40,H+40);
    drawWindow(g,6,30,348,116,t,dt,false);
    drawTable(g,t);
    var cv=cutView(m);
    var showWin=0,inRes=mode==='pass'||mode==='fail',uf=mode==='unfold';
    if(uf)showWin=Math.max(0,Math.min(1,(modeT-(unfoldDur()-.6))/.5));else if(inRes)showWin=1;
    drawLamp(g,t);
    /* 창문에 대어 보기 */
    if(showWin>0){g.save();g.globalAlpha=showWin;g.fillStyle='rgba(20,12,8,.55)';g.fillRect(0,148,W,H-148);
      var wx=18,wy=164+(1-showWin)*20,ww=324,wh=350;drawWindow(g,wx,wy,ww,wh,t,dt,true);
      var rg=g.createRadialGradient(180,338,30,180,338,200);rg.addColorStop(0,'rgba(255,250,228,1)');rg.addColorStop(.6,'rgba(255,238,190,.85)');rg.addColorStop(1,'rgba(255,230,180,0)');
      g.fillStyle=rg;g.fillRect(wx,wy,ww,wh);g.restore()}
    /* 종이 */
    if(mode==='cut'||mode==='intro'){
      var iv=cv;if(mode==='intro'){var e=1-Math.pow(1-Math.min(1,modeT/.45),3);iv={ox:cv.ox,oy:cv.oy+(1-e)*60,u:cv.u,phi:cv.phi};g.globalAlpha=e}
      drawWedge(g,iv,t);g.globalAlpha=1;
      /* 고스트 */
      var gc=null;
      if(drag&&drag.sn&&tool>0){var tt=L.tray[tool-1];gc={t:tt.t,s:tt.s,a:drag.sn.a,b:drag.sn.b,r:tt.r}}
      else if(kbOn&&tool>0&&!loop){var t2=L.tray[tool-1];gc={t:t2.t,s:t2.s,a:kc.a,b:kc.b,r:t2.r}}
      if(gc){stampOutline(g,m,gc,cv);g.fillStyle='rgba(255,120,150,.25)';g.fill();g.strokeStyle='#e0476e';g.lineWidth=2;g.setLineDash([5,4]);g.lineDashOffset=-t*20;g.stroke();g.setLineDash([]);
        var cp=toScreen(cv,cutPos(m,gc)[0],cutPos(m,gc)[1]);g.fillStyle='#e0476e';g.beginPath();g.arc(cp[0],cp[1],2.5,0,7);g.fill()}
      if(kbOn&&(tool===0||loop)){var kp=cutPos(m,kc),ks=toScreen(cv,kp[0],kp[1]);g.strokeStyle='#e0476e';g.lineWidth=2;g.beginPath();g.arc(ks[0],ks[1],6,0,7);g.moveTo(ks[0]-10,ks[1]);g.lineTo(ks[0]+10,ks[1]);g.moveTo(ks[0],ks[1]-10);g.lineTo(ks[0],ks[1]+10);g.stroke()}
      if(loop&&loop.pts.length>1){g.save();g.strokeStyle='#e0476e';g.lineWidth=2.5;g.setLineDash([7,5]);g.lineDashOffset=-t*30;g.beginPath();
        loop.pts.forEach(function(p,j){var q=loop.kb?toScreen(cv,p[0],p[1]):p;if(j)g.lineTo(q[0],q[1]);else g.moveTo(q[0],q[1])});
        if(!loop.kb)g.closePath();g.stroke();g.restore()}
    }
    else if(uf||inRes){
      var T0=.45,vv;
      if(uf&&modeT<T0){var e2=modeT/T0;e2=e2*e2*(3-2*e2);vv={ox:cv.ox+(CENTER.ox-cv.ox)*e2,oy:cv.oy+(CENTER.oy-cv.oy)*e2,u:cv.u+(CENTER.u-cv.u)*e2,phi:cv.phi+((m.id===6?90:0)-cv.phi)*e2}}
      else vv={ox:CENTER.ox,oy:CENTER.oy,u:CENTER.u,phi:m.id===6?90:0};
      if(mode==='fail'&&modeT>.25){var fa=Math.min(1,(modeT-.25)/.3);
        drawFull(g,tex,vv);g.globalAlpha=fa;g.fillStyle='#16203d';var box=m.id===6?[30,188,300,300]:[30,188,300,300];
        rr(g,box[0]-4,box[1]-4,box[2]+8,box[3]+8,14);g.fill();g.drawImage(diffCv,box[0],box[1],box[2],box[3]);g.globalAlpha=1}
      else{
        var pieces=[[1,0,0,1]],moving=[],st=m.steps,k=uf?Math.floor((modeT-T0)/.5):99,pr=uf?((modeT-T0)/.5)-k:1,last=pieces;
        for(i=0;i<st.length;i++){var src=st[i].last?last:pieces,R=refl(st[i].a);
          if(i<k){var nw=src.map(function(M){return mul(R,M)});pieces=pieces.concat(nw);last=nw}
          else if(i===k&&uf&&modeT>=T0){var ep=pr<.5?2*pr*pr:1-2*(1-pr)*(1-pr),s=Math.cos(Math.PI*ep),A=flapM(st[i].a,s);moving=src.map(function(M){return {M:mul(A,M),s:s}});break}
          else break}
        var lit=showWin>0;
        g.save();g.shadowColor='rgba(40,20,10,'+(.4*(1-showWin))+')';g.shadowBlur=12;g.shadowOffsetY=5*(1-showWin);
        pieces.forEach(function(M){drawPiece(g,tex,vv,M)});g.restore();
        if(lit)pieces.forEach(function(M){drawPiece(g,tex,vv,M,tex.lt,showWin)});
        moving.forEach(function(o){var lift=1-Math.abs(o.s);
          g.save();g.globalAlpha=.35*lift;drawPiece(g,tex,{ox:vv.ox+10*lift,oy:vv.oy+14*lift,u:vv.u,phi:vv.phi},o.M,tex.sh);g.restore();
          drawPiece(g,tex,vv,o.M);if(o.s>0||lift>.2){drawPiece(g,tex,vv,o.M,tex.sh,.25+.5*lift*(o.s>0?1:.6))}});
      }
    }
    /* 종이 부스러기 */
    for(i=conf.length-1;i>=0;i--){var c=conf[i];c.l-=dt;if(c.l<=0||c.y>H+10){conf.splice(i,1);continue}
      c.vy=Math.min(70,c.vy+90*dt);c.vx*=Math.pow(.3,dt);c.x+=(c.vx+Math.sin(t*3+c.r)*18)*dt;c.y+=c.vy*dt;c.r+=c.vr*dt;
      g.save();g.translate(c.x,c.y);g.rotate(c.r);g.globalAlpha=Math.min(1,c.l*1.5);g.fillStyle=c.c;g.fillRect(-c.w/2,-c.h/2,c.w,c.h*Math.abs(Math.cos(t*4+c.r)));g.restore()}
    g.globalAlpha=1;
    /* 펭귄 */
    drawPeng(g,inRes||showWin>0?46:34,inRes||showWin>0?496:498,t);
    /* 상단 UI */
    drawHUD(g,t);drawCards(g,t);
    /* 힌트 */
    var tip=L.hint||L.tip;
    if(tip&&(mode==='cut'||mode==='intro')){var tx=tip[ko?'ko':'en'];g.font=F(15);var wd=g.measureText(tx).width+22,al=cuts.length?.35:1;
      g.globalAlpha=al*(mode==='intro'?Math.min(1,modeT/.45):1);g.fillStyle='rgba(255,252,240,.93)';rr(g,W/2-wd/2,153,wd,24,12);g.fill();
      g.fillStyle='#4a3326';g.textAlign='center';g.fillText(tx,W/2,170);g.globalAlpha=1}
    /* 결과 문구 */
    if(inRes&&result){g.textAlign='center';var pct=Math.round(result.iou*100);
      if(mode==='pass'){g.font=F(30);g.fillStyle='#fff';g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=8;g.fillText((ko?'일치 ':'Match ')+pct+'%',180,186+Math.sin(modeT*6)*2);
        g.font=F(16);g.fillText(ko?'멋진 눈송이!':'Beautiful!',180,508);g.shadowBlur=0}
      else{g.font=F(22);g.fillStyle='#ffd0d0';g.shadowColor='rgba(0,0,0,.6)';g.shadowBlur=6;
        g.fillText(pct+'%  ·  '+(ko?'기준 ':'need ')+Math.round(L.thr*100)+'%',180,180);g.shadowBlur=0;
        var lg=[['#ffffff',ko?'맞음':'match'],['#f04650',ko?'더 자름':'extra'],['#3c8cff',ko?'덜 자름':'missing']];
        g.font=F(13);for(i=0;i<3;i++){var lx=92+i*86;g.fillStyle=lg[i][0];rr(g,lx,500,14,14,3);g.fill();g.fillStyle='#fff';g.textAlign='left';g.fillText(lg[i][1],lx+19,512)}
        g.textAlign='center';g.font=F(15);g.fillStyle='#fff';g.globalAlpha=.6+.4*Math.sin(t*5);
        g.fillText(ko?'탭해서 고치기 (되돌리기 가능 · -3초)':'Tap to fix it (undo allowed · -3s)',180,530);g.globalAlpha=1}}
    if(zoom&&mode==='cut'){g.fillStyle='rgba(16,22,44,.86)';rr(g,22,156,316,370,18);g.fill();
      drawFull(g,ttex,{ox:180,oy:334,u:140,phi:m.id===6?90:0});g.font=F(15);g.fillStyle='#f5e7c8';g.textAlign='center';
      g.fillText(ko?'목표 무늬 — 탭하면 닫혀요':'Target — tap to close',180,520)}
    /* 하단 트레이와 버튼 */
    var act=mode==='cut';g.globalAlpha=act?1:.45;
    g.fillStyle='rgba(60,32,18,.55)';rr(g,4,TRAY_Y-6,352,TRAY_H+12,12);g.fill();
    for(i=0;i<=L.tray.length;i++){var r=slotR(i),sel=tool===i;
      g.fillStyle=sel?'#fff4dc':'rgba(255,244,220,.75)';rr(g,r[0],r[1],r[2],r[3],10);g.fill();
      if(sel){g.strokeStyle='#e0476e';g.lineWidth=3;rr(g,r[0],r[1],r[2],r[3],10);g.stroke()}
      var cx=r[0]+r[2]/2,cy=r[1]+r[3]/2-3;
      if(i===0){g.strokeStyle='#5a3a2a';g.lineWidth=2.2;g.lineCap='round';g.beginPath();g.moveTo(cx-6,cy+5);g.lineTo(cx+8,cy-9);g.moveTo(cx+6,cy+5);g.lineTo(cx-8,cy-9);g.stroke();
        g.strokeStyle='#e0476e';g.beginPath();g.arc(cx-7,cy+8,4,0,7);g.stroke();g.beginPath();g.arc(cx+7,cy+8,4,0,7);g.stroke()}
      else{var it=L.tray[i-1];trayIcon(g,it.t,it.s,it.r,cx,cy,m);g.fillStyle='#4a6fb5';g.fill()}
      g.font=F(10);g.fillStyle='rgba(74,51,38,.7)';g.textAlign='right';g.fillText(String(i+1),r[0]+r[2]-4,r[1]+r[3]-4)}
    g.textAlign='center';
    function btn(rc,label,col,pulse){g.fillStyle='rgba(0,0,0,.3)';rr(g,rc[0],rc[1]+3,rc[2],rc[3],12);g.fill();
      g.fillStyle=col;rr(g,rc[0],rc[1],rc[2],rc[3],12);g.fill();if(pulse){g.strokeStyle='rgba(255,255,255,'+(.5+.5*Math.sin(t*6))+')';g.lineWidth=3;rr(g,rc[0],rc[1],rc[2],rc[3],12);g.stroke()}
      g.fillStyle='#fff';g.font=F(16);g.fillText(label,rc[0]+rc[2]/2,rc[1]+rc[3]/2+6)}
    btn(BTN.undo,ko?'↶ 취소':'↶ Undo','#8a6a58');
    btn(BTN.rot,ko?'⟳ 회전':'⟳ Turn',tool>0?'#6c7fb8':'#8b8f9c');
    btn(BTN.unf,ko?'✦ 펼치기':'✦ Unfold','#e0476e',act&&(scissorsLeft()===0||lastIoU>=L.thr));
    g.globalAlpha=1;
    if(kbOn&&mode==='cut'){g.font=F(11);g.fillStyle='rgba(255,255,255,.8)';g.textAlign='center';
      g.fillText(ko?'방향키 이동 · 숫자 도구 · Q/E 회전 · 스페이스 자르기 · U 펼치기 · Z 취소':'Arrows move · 1-6 tool · Q/E turn · Space cut · U unfold · Z undo',180,530)}
  }

  /* 테스트용 조회 훅(읽기 전용 + 레벨 이동) */
  window.__snowDbg={load:function(n){load(n)},info:function(){var m=L.mode,v=cutView(m);
    return {n:lvN,mode:mode,m:m.id,iou:lastIoU,time:time,cuts:cuts.length,thr:L.thr,
      target:L.cuts.map(function(c){var p=c.t==='loop'?[0,0]:cutPos(m,c),s=toScreen(v,p[0],p[1]);return {t:c.t,s:c.s,r:c.r,a:c.a,b:c.b,sx:s[0],sy:s[1]}}),
      tray:L.tray.map(function(t){return {t:t.t,s:t.s,r:t.r}}),rots:m.rots}}};
  SG.run({id:'snowflake-cut',title:{ko:'싹둑 눈송이',en:'Snowflake Cut'},
    how:{ko:'접힌 종이를 오려서 펼치면 목표 무늬가 되도록! 접힌 선에 닿은 구멍은 펼치면 대칭이 돼요.',en:'Cut the folded paper so it unfolds into the target. Cuts touching a fold become mirrored shapes!'},
    init:init,update:update,draw:draw});
})();
