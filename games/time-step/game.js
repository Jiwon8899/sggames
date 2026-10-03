/* 멈춘 시간 배달부 (Time-Step Courier) — 내가 움직일 때만 시간이 흐른다.
   시뮬레이션(step)은 DOM 없이 게임 시간 1/60초 고정 스텝으로 돌아간다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,C=24,OX=12,OY=52,COLS=14,ROWS=21,PW=COLS*C,PH=ROWS*C,VMAX=120,DT=1/60,CR=9,HR=7.5,TAU=Math.PI*2;
  var BX=40,BY=598,BR=25;

  /* ---------- 손으로 만든 방 10개 (칸 단위 좌표, 한 칸 24px) ---------- */
  var HAND=[
    {s:[7.5,19.5],m:[7.5,1.5],w:[[0,5,5,11],[10,5,4,11]],t0:0,par:3.5,
      hz:[{k:'yarn',a:[5.6,10.5],b:[9.4,10.5],p:6,ph:.25}],
      hint:{ko:'가만히 있으면 시간도 멈춰요',en:'Stand still and time stops'}},
    {s:[7.5,19.5],m:[10.5,1.5],w:[[0,9,2,1],[12,9,2,1]],t0:1.1,par:4.4,
      hz:[{k:'dart',a:[-1,14.5],b:[15,14.5],p:4,n:4,ph:.02},{k:'dart',a:[15,12.5],b:[-1,12.5],p:4,n:4,ph:.1},{k:'dart',a:[-1,6.5],b:[15,6.5],p:3,n:3,ph:.3}],
      hint:{ko:'멈춰서 점선을 읽어요',en:'Stop and read the dotted paths'}},
    {s:[7.5,19.5],m:[7.5,1.5],w:[[0,9,6.5,1],[8.5,9,5.5,1]],t0:0,par:3.8,
      hz:[{k:'pend',o:[7.5,5.5],len:4,amp:.9,p:3,ph:0},{k:'pend',o:[7.5,12],len:4,amp:1,p:4,ph:.3}],
      hint:{ko:'천천히 움직이면 느리게 흘러요',en:'Move slowly for slow motion'}},
    {s:[7.5,19.5],m:[7.5,1.5],w:[[3,8,2,2],[9,12,2,2]],wait:5,t0:1.1,par:5.7,
      hz:[{k:'eye',z:[0,5,14,11],p:4,on:.5,ph:0,at:[11.5,3.6]}],
      hint:{ko:'모래시계(Space)를 꾹! 시간만 흘러요',en:'Hold the hourglass (Space): time runs'}},
    {s:[7.5,19.5],m:[7.5,1.5],w:[[0,10,6.5,1],[8.5,10,5.5,1]],t0:0,par:3.7,
      hz:[{k:'yarn',a:[7.5,10.5],b:[2.5,12.6],p:4,ph:0,anti:1},{k:'yarn',a:[1,6.5],b:[13,6.5],p:4,ph:.1}],
      hint:{ko:'보라색은 반대! 멈추면 움직여요',en:'Purple is backwards: it moves while you stand'}},
    {s:[7.5,19.5],m:[7.5,1.5],w:[[2.5,8,9,5],[0,4.5,6,1],[9,4.5,5,1]],t0:0,par:6,
      hz:[{k:'vac',pts:[[1.25,6.75],[12.75,6.75],[12.75,14.25],[1.25,14.25]],p:6,ph:0},
          {k:'vac',pts:[[1.25,6.75],[12.75,6.75],[12.75,14.25],[1.25,14.25]],p:6,ph:.5},
          {k:'pot',at:[6.8,5],p:3,ph:0},{k:'pot',at:[8.2,5],p:3,ph:.5}],
      hint:{ko:'청소 로봇을 뒤따라가요',en:'Follow behind the vacuum bot'}},
    {s:[2.5,19.5],m:[7.5,1.5],w:[[0,9,2,1],[3.5,9,7,1],[12,9,2,1]],t0:0,par:6,
      hz:[{k:'chase',rail:[1,13,10.75],sp:3,x0:7.5},{k:'yarn',a:[1,5.5],b:[13,5.5],p:4,ph:.2}],
      hint:{ko:'로봇을 한쪽으로 유인해요',en:'Lure the bot to one side'}},
    {s:[2.5,19.5],m:[11.5,1.5],w:[[4,13,10,1],[0,6,10,1]],pond:[[0,7,14,6]],wait:6,t0:2.2,par:9.8,
      hz:[{k:'raft',a:[2,10],b:[12,10],p:8,ph:0,w:3,h:6},{k:'dart',a:[15,8.5],b:[-1,8.5],p:4,n:2,ph:.1},{k:'dart',a:[-1,11.5],b:[15,11.5],p:4,n:2,ph:.4}],
      hint:{ko:'뗏목 위에서 모래시계로 기다려요',en:'Ride the raft: wait with the hourglass'}},
    {s:[7.5,19.5],m:[7.5,1.5],w:[[0,9,6.5,1],[8.5,9,5.5,1]],t0:0,par:3.8,
      hz:[{k:'door',at:[7.5,9.5],len:2,p:4,open:.45,ph:.5,anti:1},{k:'yarn',a:[1,11.2],b:[13,11.2],p:3,ph:.2,anti:1},
          {k:'dart',a:[-1,13.5],b:[15,13.5],p:3,n:3,ph:0},{k:'dart',a:[15,15.5],b:[-1,15.5],p:3,n:3,ph:.2},
          {k:'pend',o:[7.5,3],len:3.5,amp:1.2,p:3,ph:.1}],
      hint:{ko:'이제 전부 다!',en:'Everything at once!'}},
    {s:[7.5,19.5],m:[11.5,1.5],w:[[0,15,2,1],[3.5,15,7,1],[12,15,2,1],[0,12,9,1],[2.5,7,11.5,1]],pond:[[0,8,14,4]],wait:6,t0:2,par:12.8,
      hz:[{k:'chase',rail:[1,13,16.75],sp:3,x0:7.5},{k:'raft',a:[2,10],b:[12,10],p:8,ph:.5,w:3,h:4},
          {k:'yarn',a:[1.25,7.5],b:[6,4.5],p:4,ph:0,anti:1,r:14},{k:'dart',a:[-1,3.5],b:[15,3.5],p:3,n:3,ph:0}],
      hint:{ko:'마지막 수련!',en:'Final trial!'}}
  ];
  /* 생성 방: [seed, par(초)] — 봇으로 검증해 통과한 것만 굽는다 */
  var GEN=[[2,6.7],[101,4.7],[201,6.1],[301,5.3],[401,5.5],[501,9.4],[601,6.9],[701,5.4],[801,5],[901,7.6],[1001,7],[1101,5.6],[1202,4.9],[1301,8.6],[1401,7],[1501,6.3],[1602,5.3],[1701,6.5],[1801,5.5],[1901,5.7],[2001,8.2],[2101,7.9],[2201,6.5],[2301,6.5],[2401,7.2],[2502,5.2],[2601,7.1],[2701,7.3],[2801,5.5],[2901,6.8],[3001,7.2],[3101,4.9],[3201,5.9],[3301,8.1],[3401,4.5],[3501,4.9],[3601,6.3],[3701,5.7],[3801,7.5],[3901,5],[4001,6.3],[4102,6.2],[4201,5.3],[4301,5.8],[4401,5.5],[4502,7.7],[4601,6.8],[4703,7.5],[4801,4.6],[4901,5.4],[5001,6],[5101,7],[5201,5.7],[5301,6.1],[5401,4.7],[5501,3.6],[5601,6.7],[5702,7.9],[5801,7.2],[5901,4.5],[6001,9.5],[6102,8.1],[6201,6.2],[6301,6.3],[6403,8.1],[6501,6.6],[6601,7.6],[6701,4],[6801,8.3],[6901,5.3],[7002,6],[7101,5.1],[7201,6.7],[7301,5.4],[7401,5.6],[7501,6.6],[7601,5.1],[7702,6.7],[7801,5.2],[7902,6.1],[8001,5.4],[8102,7.6],[8201,4.6],[8301,6.8],[8401,5.8],[8501,4.5],[8601,7],[8701,6.2],[8801,7.9],[8901,7.3],[9002,4.8],[9101,9.4],[9202,4.5],[9301,5.4],[9401,8.5],[9501,9.2],[9601,4.4],[9701,9.3],[9801,5],[9901,8.7]];

  function rng(seed){var s=(seed>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function genSpec(seed,diff){
    var r=rng(seed*7919+13),hz=[],w=[],kinds=[],i,k,usedAnti=false;
    function pick(a){return a[Math.floor(r()*a.length)]}
    function gapWall(y,gx,gw){if(gx>0)w.push([0,y,gx,1]);if(gx+gw<COLS)w.push([gx+gw,y,COLS-gx-gw,1])}
    function band(k,y0){var n,j,y,p,gx,dir,pts;
      if(k===0){n=diff>.35&&r()<.6?3:2;for(j=0;j<n;j++){y=n===2?y0+1.25+j*2.5:y0+1+j*1.5;dir=r()<.5;p=pick(diff>.5?[3,3,4]:[3,4,6]);
          hz.push({k:'dart',a:[dir?-1:15,y],b:[dir?15:-1,y],p:p,n:p===3?2:p===4?3:4,ph:r()})}}
      else if(k===1){gx=2+Math.floor(r()*9);gapWall(y0+2,gx,2);hz.push({k:'pend',o:[gx+1,y0-1.5],len:4,amp:.9+r()*.3,p:pick([2,3,4]),ph:r()})}
      else if(k===2){n=r()<.4+diff*.4?2:1;for(j=0;j<n;j++){dir=r()<.5;hz.push({k:'yarn',a:[dir?.6:13.4,y0+1.5+j*2],b:[dir?13.4:.6,y0+1.5+j*2],p:pick(diff>.5?[4,4,6]:[4,6]),ph:r()})}}
      else if(k===3){w.push([3,y0+2,8,1]);pts=[[1.25,y0+1],[12.75,y0+1],[12.75,y0+4],[1.25,y0+4]];if(r()<.5)pts.reverse();p=r();
        hz.push({k:'vac',pts:pts,p:6,ph:p},{k:'vac',pts:pts,p:6,ph:p+.5})}
      else if(k===4){gx=1+Math.floor(r()*11);gapWall(y0+2,gx,2);hz.push({k:'door',at:[gx+1,y0+2.5],len:2,p:pick([4,6]),open:.4,ph:r()})}
      else if(k===5){y=y0+2;w.push([0,y,1.5,1],[3,y,3.25,1],[7.75,y,3.25,1],[12.5,y,1.5,1]);p=pick([2,3,4]);
        [2.25,7,11.75].forEach(function(x){hz.push({k:'pot',at:[x,y+.5],p:p,ph:r()})})}
      else if(k===6){hz.push({k:'eye',z:[0,y0,14,5],p:4,on:.68,ph:r(),at:[r()<.5?1:13,y0+1]})}
      else{usedAnti=true;gx=2+Math.floor(r()*9);gapWall(y0+2,gx,2);hz.push({k:'yarn',a:[gx+1,y0+2.5],b:[gx+1+(gx<6?4:-4),y0+3.8],p:4,ph:0,anti:1})}}
    var sx=1.5+Math.floor(r()*12),mx=1.5+Math.floor(r()*12);
    for(i=0;i<3;i++){do{k=Math.floor(r()*8)}while(kinds.indexOf(k)>=0||(k===7&&usedAnti));kinds.push(k);band(k,13-5*i)}
    return {s:[sx,19.5],m:[mx,1.5],w:w,hz:hz,wait:4,t0:0,gen:true}}
  function diffOf(i){return Math.min(1,i/60)}

  /* ---------- 방 만들기: 칸 좌표 → 픽셀 ---------- */
  function X(c){return OX+c*C}
  function Y(c){return OY+c*C}
  function build(sp){
    var R={sx:X(sp.s[0]),sy:Y(sp.s[1]),mx:X(sp.m[0]),my:Y(sp.m[1]),walls:[],ponds:[],hz:[],rafts:[],eyes:[],nCh:0,hasAnti:false,
      wait:Math.round((sp.wait||4)*60),t0:sp.t0||0,par:sp.par||8,hint:sp.hint||null,ch0:[]};
    (sp.w||[]).forEach(function(w){R.walls.push([X(w[0]),Y(w[1]),w[2]*C,w[3]*C])});
    (sp.pond||[]).forEach(function(w){R.ponds.push([X(w[0]),Y(w[1]),w[2]*C,w[3]*C])});
    sp.hz.forEach(function(q){var h,i,n,j,d;
      if(q.anti)R.hasAnti=true;
      if(q.k==='dart'){n=q.n||1;for(i=0;i<n;i++)R.hz.push({k:'dart',anti:!!q.anti,p:q.p,ph:(q.ph||0)+i/n,r:5,ax:X(q.a[0]),ay:Y(q.a[1]),bx:X(q.b[0]),by:Y(q.b[1])});return}
      h={k:q.k,anti:!!q.anti,p:q.p||1,ph:q.ph||0};
      if(q.k==='yarn'){h.r=q.r||12;h.ax=X(q.a[0]);h.ay=Y(q.a[1]);h.bx=X(q.b[0]);h.by=Y(q.b[1])}
      else if(q.k==='raft'){h.ax=X(q.a[0]);h.ay=Y(q.a[1]);h.bx=X(q.b[0]);h.by=Y(q.b[1]);h.w=q.w*C;h.h=q.h*C;R.rafts.push(h)}
      else if(q.k==='pend'){h.r=13;h.ox=X(q.o[0]);h.oy=Y(q.o[1]);h.len=q.len*C;h.amp=q.amp;h.ang0=q.ang0==null?Math.PI/2:q.ang0}
      else if(q.k==='vac'){h.r=14;h.pts=q.pts.map(function(p){return [X(p[0]),Y(p[1])]});h.seg=[];h.tot=0;n=h.pts.length;
        for(j=0;j<n;j++){d=Math.hypot(h.pts[(j+1)%n][0]-h.pts[j][0],h.pts[(j+1)%n][1]-h.pts[j][1]);h.seg.push(d);h.tot+=d}}
      else if(q.k==='pot'){h.r=16;h.x=X(q.at[0]);h.y=Y(q.at[1])}
      else if(q.k==='door'){h.x=X(q.at[0]);h.y=Y(q.at[1]);h.len=q.len*C;h.open=q.open}
      else if(q.k==='eye'){h.zx=X(q.z[0]);h.zy=Y(q.z[1]);h.zw=q.z[2]*C;h.zh=q.z[3]*C;h.on=q.on;h.x=X(q.at[0]);h.y=Y(q.at[1]);R.eyes.push(h)}
      else if(q.k==='chase'){h.r=14;h.x1=X(q.rail[0]);h.x2=X(q.rail[1]);h.y=Y(q.rail[2]);h.sp=q.sp*C;h.ci=R.nCh++;R.ch0.push(X(q.x0))}
      R.hz.push(h)});
    return R}

  /* ---------- 시뮬레이션 ---------- */
  function frac(v){return v-Math.floor(v)}
  function hpos(h,t){var c=frac(t/h.p+h.ph),u,a,i,d,n,p,q,f;
    if(h.k==='yarn'||h.k==='raft'){u=c<.5?c*2:2-c*2;return [h.ax+(h.bx-h.ax)*u,h.ay+(h.by-h.ay)*u]}
    if(h.k==='dart')return [h.ax+(h.bx-h.ax)*c,h.ay+(h.by-h.ay)*c];
    if(h.k==='pend'){a=h.ang0+h.amp*Math.sin(c*TAU);return [h.ox+Math.cos(a)*h.len,h.oy+Math.sin(a)*h.len]}
    if(h.k==='vac'){d=c*h.tot;n=h.pts.length;for(i=0;i<n;i++){if(d<=h.seg[i]){p=h.pts[i];q=h.pts[(i+1)%n];f=d/h.seg[i];return [p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f]}d-=h.seg[i]}return h.pts[0].slice()}
    return [h.x,h.y]}
  function doorOpen(h,t){var c=frac(t/h.p+h.ph),tr=.1;return c<h.open-tr?1:c<h.open?(h.open-c)/tr:c<1-tr?0:(c-(1-tr))/tr}
  function eyeOn(h,t){return frac(t/h.p+h.ph)<h.on}
  function potC(h,t){return frac(t/h.p+h.ph)}
  function newState(R){return {x:R.sx,y:R.sy,T:0,A:0,wm:R.wait,rx:R.ch0.slice(),st:'',why:'',fx:1}}
  function circRect(x,y,r,rx,ry,rw,rh){var cx=x<rx?rx:x>rx+rw?rx+rw:x,cy=y<ry?ry:y>ry+rh?ry+rh:y;cx-=x;cy-=y;return cx*cx+cy*cy<r*r}
  function onRaft(R,x,y,t){var i,h,p;for(i=0;i<R.rafts.length;i++){h=R.rafts[i];p=hpos(h,t);if(Math.abs(x-p[0])<=h.w/2+2&&Math.abs(y-p[1])<=h.h/2+2)return h}return null}
  function hit(S,R,pad){
    var Ts=R.t0+S.T*DT,As=S.A*DT,i,h,t,p,rr=HR+(pad||0),d,o,half;
    for(i=0;i<R.hz.length;i++){h=R.hz[i];t=h.anti?As:Ts;
      switch(h.k){
        case 'yarn':case 'dart':case 'pend':case 'vac':p=hpos(h,t);d=h.r+rr;if((p[0]-S.x)*(p[0]-S.x)+(p[1]-S.y)*(p[1]-S.y)<d*d)return h.k;break;
        case 'pot':if(potC(h,t)>=.72){d=h.r+rr;if((h.x-S.x)*(h.x-S.x)+(h.y-S.y)*(h.y-S.y)<d*d)return 'pot'}break;
        case 'door':o=doorOpen(h,t);half=h.len/2*(1-o);if(half>.5&&(circRect(S.x,S.y,rr,h.x-h.len/2,h.y-5,half,10)||circRect(S.x,S.y,rr,h.x+h.len/2-half,h.y-5,half,10)))return 'door';break;
        case 'chase':d=h.r+rr;if((S.rx[h.ci]-S.x)*(S.rx[h.ci]-S.x)+(h.y-S.y)*(h.y-S.y)<d*d)return 'chase';break}}
    for(i=0;i<R.ponds.length;i++){p=R.ponds[i];if(S.x>p[0]&&S.x<p[0]+p[2]&&S.y>p[1]&&S.y<p[1]+p[3]&&!onRaft(R,S.x,S.y,Ts))return 'pond'}
    return ''}
  function collide(R,P){var it,i,w,cx,cy,dx,dy,d2,d,l,r,u,b,m;
    for(it=0;it<2;it++)for(i=0;i<R.walls.length;i++){w=R.walls[i];
      cx=P.x<w[0]?w[0]:P.x>w[0]+w[2]?w[0]+w[2]:P.x;cy=P.y<w[1]?w[1]:P.y>w[1]+w[3]?w[1]+w[3]:P.y;dx=P.x-cx;dy=P.y-cy;d2=dx*dx+dy*dy;
      if(d2<CR*CR){if(d2>1e-6){d=Math.sqrt(d2);P.x=cx+dx/d*CR;P.y=cy+dy/d*CR}
        else{l=P.x-w[0];r=w[0]+w[2]-P.x;u=P.y-w[1];b=w[1]+w[3]-P.y;m=Math.min(l,r,u,b);
          if(m===l)P.x=w[0]-CR;else if(m===r)P.x=w[0]+w[2]+CR;else if(m===u)P.y=w[1]-CR;else P.y=w[1]+w[3]+CR}}}
    if(P.x<OX+CR)P.x=OX+CR;if(P.x>OX+PW-CR)P.x=OX+PW-CR;if(P.y<OY+CR)P.y=OY+CR;if(P.y>OY+PH-CR)P.y=OY+PH-CR}
  /* mode 0: 가만히(보라색 시계만 흐름) · 1: 이동(dx,dy 단위벡터) · 2: 모래시계. 시간이 흘렀으면 1을 돌려준다 */
  var TMP={x:0,y:0};
  function step(S,R,mode,dx,dy,pad){
    var t0,h,p0,p1,i,d,m,tx,v=VMAX*DT;
    if(S.st)return 0;
    if(mode===0){if(!R.hasAnti)return 0;S.A++}
    else{
      if(mode===2){if(S.wm<=0)return 0;S.wm--}
      else{TMP.x=S.x+dx*v;TMP.y=S.y+dy*v;collide(R,TMP);if(Math.hypot(TMP.x-S.x,TMP.y-S.y)<v*.3)return 0}
      t0=R.t0+S.T*DT;h=R.rafts.length?onRaft(R,S.x,S.y,t0):null;
      if(h){p0=hpos(h,t0);p1=hpos(h,t0+DT);S.x+=p1[0]-p0[0];S.y+=p1[1]-p0[1]}
      if(mode===1){S.x+=dx*v;S.y+=dy*v;if(dx>.3)S.fx=1;else if(dx<-.3)S.fx=-1}
      collide(R,S);S.T++;
      for(i=0;i<R.hz.length;i++){h=R.hz[i];if(h.k!=='chase')continue;tx=S.x<h.x1?h.x1:S.x>h.x2?h.x2:S.x;d=tx-S.rx[h.ci];m=h.sp*DT;S.rx[h.ci]+=Math.abs(d)<m?d:d>0?m:-m}
      if(mode===1)for(i=0;i<R.eyes.length;i++){h=R.eyes[i];
        if(S.x>h.zx&&S.x<h.zx+h.zw&&S.y>h.zy&&S.y<h.zy+h.zh&&eyeOn(h,h.anti?S.A*DT:R.t0+S.T*DT)){S.st='bonk';S.why='eye';return 1}}}
    var why=hit(S,R,pad);if(why){S.st='bonk';S.why=why;return 1}
    if((S.x-R.mx)*(S.x-R.mx)+(S.y-R.my)*(S.y-R.my)<17*17)S.st='win';
    return 1}

  if(typeof window==='undefined'){module.exports={HAND:HAND,GEN:GEN,genSpec:genSpec,diffOf:diffOf,build:build,newState:newState,step:step,hit:hit,hpos:hpos,
    K:{W:W,H:H,C:C,OX:OX,OY:OY,PW:PW,PH:PH,VMAX:VMAX,DT:DT,CR:CR}};return}

  /* ================= 브라우저 ================= */
  function getRoom(n){var i,R;
    if(n<HAND.length)return build(HAND[n]);
    i=(n-HAND.length)%(GEN.length||100);
    R=build(genSpec(GEN.length?GEN[i][0]:i+1,diffOf(i)));if(GEN.length)R.par=GEN[i][1];return R}

  var K={l:0,r:0,u:0,d:0,sh:0,sp:0};
  if(!window.__timeStepKeys){window.__timeStepKeys=true;
    var kd=function(e,v){var c=e.code;
      if(c==='ArrowLeft'||c==='KeyA')K.l=v;else if(c==='ArrowRight'||c==='KeyD')K.r=v;else if(c==='ArrowUp'||c==='KeyW')K.u=v;
      else if(c==='ArrowDown'||c==='KeyS')K.d=v;else if(c==='ShiftLeft'||c==='ShiftRight')K.sh=v;else if(c==='Space')K.sp=v};
    window.addEventListener('keydown',function(e){kd(e,1)});
    window.addEventListener('keyup',function(e){kd(e,0)});
    window.addEventListener('blur',function(){K.l=K.r=K.u=K.d=K.sh=K.sp=0})}

  var G=null,R=null,S=null;
  function resetRoom(){S=newState(R);G.acc=0;G.accA=0;G.hist=[[S.x,S.y]];G.scarf=[];for(var i=0;i<7;i++)G.scarf.push([S.x,S.y+i*2]);G.flow=0;G.dir=[0,0]}
  function loadRoom(n){G.n=n;R=getRoom(n);R.cv=null;G.restarts=0;resetRoom();G.ph='enter';G.pt=0}
  function init(a){
    G={n:0,clock:50,rt:0,gt:0,warm:0,ph:'enter',pt:0,acc:0,accA:0,restarts:0,hist:[],scarf:[],joy:null,btn:false,tk:0,tkN:0,blink:2,flow:0,dir:[0,0],
       warn:0,why:'',lang:a.lang,rs:null,motes:[]};
    var r=rng(77),i;for(i=0;i<30;i++)G.motes.push([r()*PW,r()*PH,r()*TAU,.4+r()*.8]);
    loadRoom(0)}

  function bonk(a){
    var ko=a.lang==='ko',t=S.why==='eye'?(ko?'들켰다!':'Spotted!'):S.why==='pond'?(ko?'풍덩!':'Splash!'):(ko?'쿵!':'Bonk!');
    a.sfx('hit');a.shake(7);a.burst(S.x,S.y,S.why==='pond'?'#8fd3ea':'#ffd86b',12);a.pop(S.x,S.y-18,t+' -2s','#ff8a70');
    G.clock=Math.max(0,G.clock-2);G.restarts++;G.ph='rewind';G.pt=0;G.why=S.why;G.rs={x:S.x,y:S.y,T:S.T,A:S.A,rx:S.rx.slice(),fx:S.fx}}
  function win(a){
    var ko=a.lang==='ko',t=S.T*DT,pts=10,rb=G.restarts===0?5:G.restarts===1?2:0,sb=t<=R.par*1.15?5:t<=R.par*1.7?2:0;
    a.add(pts+rb+sb);a.sfx('win');a.burst(R.mx,R.my,'#ffd86b',16);a.burst(R.mx,R.my,'#ff8a70',8);
    a.pop(R.mx,R.my-26,'+'+(pts+rb+sb),'#fff2a8');
    if(sb===5)a.pop(R.mx,R.my-48,ko?'매끈!':'Smooth!','#9be7c4');else if(rb===5)a.pop(R.mx,R.my-48,ko?'한 번에!':'First try!','#9be7c4');
    G.clock=Math.min(70,G.clock+12);G.ph='bow';G.pt=0}

  function update(dt,inp,a){
    var blk=false,kx,ky,s=0,dx=0,dy=0,wait=!!K.sp,l,vx,vy,d,n,r,moved=false,i,p,q;
    G.rt+=dt;G.blink-=dt;if(G.blink<-.12)G.blink=1.5+Math.random()*3;if(G.warn>0)G.warn-=dt;
    G.clock-=dt;if(G.clock<=0){G.clock=0;a.over();return}
    a.tempo(G.clock<12?1.35:1);
    if(inp.tap&&inp.down&&inp.x!=null){if(Math.hypot(inp.x-BX,inp.y-BY)<BR+8){G.btn=true;G.joy=null}else{G.joy=[inp.x,inp.y];G.btn=false}}
    if(!inp.down){G.joy=null;G.btn=false}
    if(G.btn)wait=true;
    if(G.ph==='rewind'){G.pt+=dt;if(G.pt>=.4){resetRoom();G.ph='play'}}
    else if(G.ph==='bow'){G.pt+=dt;if(G.pt>=.85)loadRoom(G.n+1)}
    else{
      if(G.ph==='enter'){G.pt+=dt;if(G.pt>=.3)G.ph='play'}
      kx=K.r-K.l;ky=K.d-K.u;
      if(kx||ky){l=Math.hypot(kx,ky);dx=kx/l;dy=ky/l;s=K.sh?.5:1}
      else if(G.joy&&inp.x!=null){vx=inp.x-G.joy[0];vy=inp.y-G.joy[1];d=Math.hypot(vx,vy);if(d>6){dx=vx/d;dy=vy/d;s=Math.max(.1,Math.min(1,(d-6)/40))}}
      G.wait=wait;
      if(wait){s=2;if(S.wm<=0){s=0;if(G.warn<=0){G.warn=.5;a.beep(160,.12,'sawtooth')}}}
      G.dir=[wait?0:dx,wait?0:dy];
      if(s>0){G.acc+=s*dt;n=0;
        while(G.acc>=DT&&n<8&&!S.st){r=step(S,R,wait?2:1,dx,dy,0);if(!r){G.acc=0;blk=true;break}G.acc-=DT;n++;moved=true;
          G.gt+=DT;G.tkN++;if(G.tkN>=15){G.tkN=0;G.tk^=1;a.beep(G.tk?1250:940,.03,'sine')}
          if(S.T%2===0&&G.hist.length<900)G.hist.push([S.x,S.y]);
          p=G.scarf;p[0][0]=S.x-S.fx*4;p[0][1]=S.y-1;
          for(i=1;i<p.length;i++){q=p[i-1];vx=p[i][0]-q[0];vy=p[i][1]-q[1]+.25;d=Math.hypot(vx,vy)||1;if(d>3.2){p[i][0]=q[0]+vx/d*3.2;p[i][1]=q[1]+vy/d*3.2}
            p[i][1]+=Math.sin(G.gt*14+i)*.25}}
        if(n>=8)G.acc=0}
      if(s>0&&!blk&&!S.st)moved=true;
      if(!moved&&!S.st){G.acc=0;if(R.hasAnti){G.accA+=dt;n=0;while(G.accA>=DT&&n<8&&!S.st){G.accA-=DT;step(S,R,0,0,0,0);n++}}}
      G.flow=moved?Math.min(1,s):0;
      if(S.st==='bonk')bonk(a);else if(S.st==='win')win(a)}
    G.warm+=((G.ph==='bow'?1:G.flow)-G.warm)*Math.min(1,dt*9)}

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function floorCache(){
    var c=document.createElement('canvas');c.width=PW;c.height=PH;var g=c.getContext('2d'),i,j,x,y,w,k,gr;
    g.fillStyle='#d9c68e';g.fillRect(0,0,PW,PH);
    for(j=0;j<ROWS;j+=2)for(i=-2;i<COLS;i+=4){x=i*C+((j/2)%2?48:0);y=j*C;
      g.fillStyle=((i+j)/2)%2?'#dccb96':'#d3bf85';g.fillRect(x,y,96,48);
      g.strokeStyle='rgba(120,105,60,.13)';g.lineWidth=1;g.beginPath();for(k=4;k<48;k+=4){g.moveTo(x,y+k+.5);g.lineTo(x+96,y+k+.5)}g.stroke();
      g.strokeStyle='#56663a';g.lineWidth=2.5;g.strokeRect(x+.5,y+.5,96,48)}
    R.ponds.forEach(function(p){x=p[0]-OX;y=p[1]-OY;
      g.fillStyle='#8d7a5a';g.fillRect(x,y-3,p[2],p[3]+6);
      gr=g.createLinearGradient(0,y,0,y+p[3]);gr.addColorStop(0,'#3b8aa0');gr.addColorStop(1,'#2a6480');g.fillStyle=gr;g.fillRect(x,y,p[2],p[3]);
      g.fillStyle='rgba(0,20,40,.25)';g.fillRect(x,y,p[2],5)});
    R.walls.forEach(function(q){g.fillStyle='rgba(50,30,10,.3)';rr(g,q[0]-OX+3,q[1]-OY+5,q[2],q[3],3);g.fill()});
    R.walls.forEach(function(q){x=q[0]-OX;y=q[1]-OY;w=q[2];var h=q[3];
      g.fillStyle='#5b3a23';rr(g,x,y,w,h,3);g.fill();
      gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#fbf3df');gr.addColorStop(1,'#eadcbd');g.fillStyle=gr;g.fillRect(x+3,y+3,w-6,h-6);
      g.strokeStyle='rgba(140,105,60,.55)';g.lineWidth=1;g.beginPath();
      for(k=12;k<w-4;k+=12){g.moveTo(x+k+.5,y+3);g.lineTo(x+k+.5,y+h-3)}
      for(k=12;k<h-4;k+=12){g.moveTo(x+3,y+k+.5);g.lineTo(x+w-3,y+k+.5)}g.stroke();
      g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x+3,y+3,w-6,2)});
    return c}

  function garden(g){
    var gr=g.createLinearGradient(0,0,0,H),t=G.rt,i,x,sw;
    gr.addColorStop(0,'#1c2140');gr.addColorStop(.55,'#27365a');gr.addColorStop(1,'#1f4a4c');g.fillStyle=gr;g.fillRect(0,0,W,H);
    /* 달과 물안개 */
    gr=g.createRadialGradient(258,592,2,258,592,46);gr.addColorStop(0,'rgba(255,244,200,.55)');gr.addColorStop(1,'rgba(255,244,200,0)');g.fillStyle=gr;g.fillRect(200,556,120,84);
    g.fillStyle='#fff3c4';g.beginPath();g.arc(258,592,11,0,TAU);g.fill();
    g.fillStyle='rgba(27,33,64,.9)';
    for(i=0;i<3;i++){x=((t*(6+i*4)+i*150)%(W+200))-100;g.fillStyle='rgba(190,215,235,'+(.07+.03*i)+')';g.beginPath();g.ellipse(x,574+i*20,90-i*14,7,0,0,TAU);g.fill()}
    /* 먼 언덕 */
    g.fillStyle='#1a3a40';g.beginPath();g.moveTo(0,640);for(x=0;x<=W;x+=20)g.lineTo(x,612+Math.sin(x*.02+1+t*.03)*9+Math.sin(x*.05)*4);g.lineTo(W,640);g.fill();
    /* 흔들리는 대나무 */
    for(i=0;i<9;i++){x=92+i*30+(i%2)*7;sw=Math.sin(t*.9+i*1.3)*5;
      g.strokeStyle=i%2?'#2f6d58':'#245546';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(x,642);g.quadraticCurveTo(x+sw*.3,606,x+sw,574+(i%3)*8);g.stroke();
      g.fillStyle=i%2?'#3c8a6c':'#2f6d58';g.beginPath();g.ellipse(x+sw+5,580+(i%3)*8,8,2.6,-.5+sw*.03,0,TAU);g.fill();
      g.beginPath();g.ellipse(x+sw*.7-6,596+(i%3)*6,7,2.3,.6+sw*.03,0,TAU);g.fill()}
    /* 반딧불 */
    for(i=0;i<7;i++){x=70+((i*53+t*(5+i))%250);var y=570+Math.sin(t*.7+i*2)*10+(i%3)*18,al=.35+.35*Math.sin(t*2.2+i*1.7);
      g.fillStyle='rgba(215,255,150,'+Math.max(0,al)+')';g.beginPath();g.arc(x,y,1.8,0,TAU);g.fill()}
    /* 처마 위쪽 띠 */
    g.fillStyle='#3a2617';g.fillRect(0,30,W,22)}

  function drawCat(g,x,y,fx,o){
    var bob=o.walk?Math.sin(o.walk*18)*1.2:0,hy=y-6+bob*.5+(o.bow||0)*5,i,ex,ey;
    g.fillStyle='rgba(30,20,10,.28)';g.beginPath();g.ellipse(x,y+9,10,4,0,0,TAU);g.fill();
    /* 목도리 */
    if(o.scarf){g.strokeStyle='#e2483d';g.lineWidth=4;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(x-fx*4,y-1);
      for(i=1;i<o.scarf.length;i++)g.lineTo(o.scarf[i][0]+(x-o.sx),o.scarf[i][1]+(y-o.sy));g.stroke();
      g.strokeStyle='#ff7a66';g.lineWidth=1.2;g.stroke()}
    /* 발 */
    g.fillStyle='#fff3e2';g.beginPath();g.ellipse(x-4,y+8+(o.walk?Math.sin(o.walk*18)*1.5:0),3,2,0,0,TAU);g.ellipse(x+4,y+8-(o.walk?Math.sin(o.walk*18)*1.5:0),3,2,0,0,TAU);g.fill();
    /* 몸 */
    g.fillStyle='#2a3252';g.beginPath();g.ellipse(x,y+3,7.5,6.5,0,0,TAU);g.fill();
    if(o.letter){g.save();g.translate(x-fx*7,y+2);g.rotate(-fx*.35);g.fillStyle='#fffaf0';g.fillRect(-5,-4,10,8);g.strokeStyle='#c9b79a';g.lineWidth=.8;g.strokeRect(-5,-4,10,8);
      g.beginPath();g.moveTo(-5,-4);g.lineTo(0,0);g.lineTo(5,-4);g.stroke();g.fillStyle='#e2483d';g.beginPath();g.arc(0,0,1.6,0,TAU);g.fill();g.restore()}
    /* 머리 */
    g.fillStyle='#2a3252';g.beginPath();g.moveTo(x-9,hy-3);g.lineTo(x-7.5,hy-13);g.lineTo(x-2,hy-8);g.fill();
    g.beginPath();g.moveTo(x+9,hy-3);g.lineTo(x+7.5,hy-13);g.lineTo(x+2,hy-8);g.fill();
    g.fillStyle='#ff9d9d';g.beginPath();g.moveTo(x-7,hy-6);g.lineTo(x-6.8,hy-10.5);g.lineTo(x-4,hy-8);g.fill();g.beginPath();g.moveTo(x+7,hy-6);g.lineTo(x+6.8,hy-10.5);g.lineTo(x+4,hy-8);g.fill();
    g.fillStyle='#2a3252';g.beginPath();g.arc(x,hy,9.5,0,TAU);g.fill();
    g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.arc(x-3,hy-4,4,0,TAU);g.fill();
    g.fillStyle='#fff3e2';g.beginPath();g.ellipse(x+fx*1.2,hy+.8,7,4.6,0,0,TAU);g.fill();
    ex=x+fx*1.2;ey=hy+.5;g.strokeStyle='#22202a';g.fillStyle='#22202a';g.lineWidth=1.3;g.lineCap='round';
    if(o.dizzy){[-3,3].forEach(function(d){g.beginPath();g.moveTo(ex+d-1.4,ey-1.4);g.lineTo(ex+d+1.4,ey+1.4);g.moveTo(ex+d+1.4,ey-1.4);g.lineTo(ex+d-1.4,ey+1.4);g.stroke()})}
    else if(o.bow||o.blink){g.beginPath();g.arc(ex-3,ey+(o.bow?1:0),1.6,o.bow?Math.PI:0,o.bow?TAU:Math.PI);g.stroke();g.beginPath();g.arc(ex+3,ey+(o.bow?1:0),1.6,o.bow?Math.PI:0,o.bow?TAU:Math.PI);g.stroke()}
    else{g.beginPath();g.ellipse(ex-3,ey,1.5,2.2,0,0,TAU);g.ellipse(ex+3,ey,1.5,2.2,0,0,TAU);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(ex-3.4,ey-.8,.6,0,TAU);g.arc(ex+2.6,ey-.8,.6,0,TAU);g.fill()}
    g.fillStyle='#ff8f8f';g.beginPath();g.arc(ex,ey+2.4,.9,0,TAU);g.fill()}

  function drawMailbox(g,x,y,up){
    var pu=.5+.5*Math.sin(G.rt*3);
    g.strokeStyle='rgba(255,220,120,'+(.25+.3*pu)+')';g.lineWidth=2;g.beginPath();g.arc(x,y,17+pu*3,0,TAU);g.stroke();
    g.fillStyle='rgba(30,20,10,.28)';g.beginPath();g.ellipse(x+2,y+12,12,4,0,0,TAU);g.fill();
    g.fillStyle='#6b4a2d';g.fillRect(x-2,y+2,4,10);
    g.fillStyle='#d8453c';rr(g,x-11,y-12,22,17,5);g.fill();
    g.fillStyle='#f06a5a';rr(g,x-11,y-12,22,6,5);g.fill();
    g.fillStyle='#4a1d1a';g.fillRect(x-7,y-4,14,2.5);
    g.fillStyle='#fffaf0';g.fillRect(x-4,y+0.5,8,3);
    g.save();g.translate(x+11,y-2);g.rotate(up?-1.5:0);g.fillStyle='#ffd86b';g.fillRect(0,-1.5,9,3);g.fillRect(6,-4,3,6);g.restore()}

  function dots(g,h,t,base){
    var k,p,n=h.k==='dart'?9:12,st=h.k==='dart'?.08:.11,a;
    for(k=1;k<=n;k++){p=hpos(h,t+k*st);a=base*(1-k/(n+2));
      g.globalAlpha=a*.45;g.fillStyle='#3a2617';g.beginPath();g.arc(p[0]+.8,p[1]+1.2,k%2?2.8:2,0,TAU);g.fill();
      g.globalAlpha=a;g.fillStyle=h.anti?'#d9bcff':'#fffdf2';g.beginPath();g.arc(p[0],p[1],k%2?2.8:2,0,TAU);g.fill()}
    g.globalAlpha=1}

  function drawHaz(g,h,t,frozen){
    var p,c,a,i,o,half,dx,dy,l,col,x,y,sc;
    if(h.k==='yarn'){p=hpos(h,t);x=p[0];y=p[1];col=h.anti?['#9a6be0','#c9a2ff','#6d3fb8']:['#f08aa6','#ffc2d2','#c65a7c'];
      g.fillStyle='rgba(30,20,10,.26)';g.beginPath();g.ellipse(x+2,y+h.r-1,h.r,5,0,0,TAU);g.fill();
      if(h.anti){g.fillStyle='rgba(170,110,255,.22)';g.beginPath();g.arc(x,y,h.r+5+Math.sin(G.rt*5)*1.5,0,TAU);g.fill()}
      g.fillStyle=col[0];g.beginPath();g.arc(x,y,h.r,0,TAU);g.fill();
      a=Math.hypot(x-h.ax,y-h.ay)/h.r;g.save();g.beginPath();g.arc(x,y,h.r,0,TAU);g.clip();g.translate(x,y);g.rotate(a);
      g.strokeStyle=col[2];g.lineWidth=1.3;for(i=-2;i<=2;i++){g.beginPath();g.ellipse(0,0,h.r,Math.abs(i)*3.4+1.5,i*.5,0,TAU);g.stroke()}
      g.restore();g.fillStyle=col[1];g.beginPath();g.arc(x-h.r*.35,y-h.r*.4,h.r*.28,0,TAU);g.fill();
      g.strokeStyle=col[0];g.lineWidth=1.6;g.beginPath();g.moveTo(x+h.r*.7,y+h.r*.6);g.quadraticCurveTo(x+h.r+6,y+h.r+2,x+h.r+3,y+h.r+7);g.stroke()}
    else if(h.k==='dart'){p=hpos(h,t);x=p[0];y=p[1];dx=h.bx-h.ax;dy=h.by-h.ay;l=Math.hypot(dx,dy);dx/=l;dy/=l;
      g.lineCap='round';for(i=0;i<3;i++){g.strokeStyle='rgba(255,255,255,'+(.34-i*.1)+')';g.lineWidth=2-i*.5;g.beginPath();
        g.moveTo(x-dx*(10+i*9)-dy*(i-1)*3,y-dy*(10+i*9)+dx*(i-1)*3);g.lineTo(x-dx*(20+i*11)-dy*(i-1)*3,y-dy*(20+i*11)+dx*(i-1)*3);g.stroke()}
      g.fillStyle='rgba(30,20,10,.22)';g.beginPath();g.ellipse(x-dx*3,y+8,9,2.5,0,0,TAU);g.fill();
      g.save();g.translate(x,y);g.rotate(Math.atan2(dy,dx));g.scale(1.35,1.35);
      g.fillStyle=h.anti?'#9a6be0':'#3f9bd8';g.fillRect(-11,-1.8,13,3.6);
      g.fillStyle='#ffd86b';g.beginPath();g.moveTo(-13,-5);g.lineTo(-8,0);g.lineTo(-13,5);g.lineTo(-10,0);g.fill();
      g.fillStyle='#e2483d';g.beginPath();g.moveTo(2,-5);g.quadraticCurveTo(8,-4,7,0);g.quadraticCurveTo(8,4,2,5);g.closePath();g.fill();
      g.restore()}
    else if(h.k==='pend'){p=hpos(h,t);x=p[0];y=p[1];
      g.fillStyle='rgba(30,20,10,.24)';g.beginPath();g.ellipse(x+3,y+14,13,5,0,0,TAU);g.fill();
      g.strokeStyle='rgba(60,40,25,.55)';g.lineWidth=1.6;g.beginPath();g.moveTo(h.ox,h.oy);g.lineTo(x,y);g.stroke();
      g.fillStyle='#4a2f1c';g.beginPath();g.arc(h.ox,h.oy,3.5,0,TAU);g.fill();
      o=g.createRadialGradient(x,y,2,x,y,30);o.addColorStop(0,h.anti?'rgba(190,140,255,.5)':'rgba(255,200,110,.5)');o.addColorStop(1,'rgba(255,200,110,0)');g.fillStyle=o;g.beginPath();g.arc(x,y,30,0,TAU);g.fill();
      g.fillStyle=h.anti?'#a77be6':'#f3a14a';g.beginPath();g.ellipse(x,y,h.r,h.r*.92,0,0,TAU);g.fill();
      g.strokeStyle=h.anti?'#6d3fb8':'#c96f2a';g.lineWidth=1;for(i=-2;i<=2;i++){g.beginPath();g.ellipse(x,y,Math.abs(i)*4.5+1.5,h.r*.92,0,0,TAU);g.stroke()}
      g.fillStyle='#3a2617';g.fillRect(x-6,y-h.r-1,12,3);g.fillRect(x-6,y+h.r-3,12,3)}
    else if(h.k==='vac'||h.k==='chase'){
      if(h.k==='vac'){p=hpos(h,t);x=p[0];y=p[1];c=hpos(h,t+.05);a=Math.atan2(c[1]-y,c[0]-x)}else{x=S&&h.ci<S.rx.length?(G.ph==='rewind'&&G.rs?G.rs.rx[h.ci]+(R.ch0[h.ci]-G.rs.rx[h.ci])*Math.min(1,G.pt/.4):S.rx[h.ci]):h.x1;y=h.y;a=Math.atan2(S.y-y,S.x-x)}
      g.fillStyle='rgba(30,20,10,.28)';g.beginPath();g.ellipse(x+2,y+5,h.r+1,h.r*.8,0,0,TAU);g.fill();
      g.fillStyle=h.k==='chase'?'#59606e':'#8a93a3';g.beginPath();g.arc(x,y,h.r,0,TAU);g.fill();
      g.fillStyle=h.k==='chase'?'#7c8494':'#b9c1cf';g.beginPath();g.arc(x,y-1.5,h.r-3,0,TAU);g.fill();
      g.strokeStyle='#3d4350';g.lineWidth=2;g.beginPath();g.arc(x,y,h.r-1,a-1,a+1);g.stroke();
      g.fillStyle=h.k==='chase'?'#ff6b5a':'#7df0c0';g.beginPath();g.arc(x+Math.cos(a)*6,y+Math.sin(a)*6-1.5,2.6,0,TAU);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(x-Math.sin(a)*4+Math.cos(a)*2,y+Math.cos(a)*4+Math.sin(a)*2-1.5,1.4,0,TAU);g.arc(x+Math.sin(a)*4+Math.cos(a)*2,y-Math.cos(a)*4+Math.sin(a)*2-1.5,1.4,0,TAU);g.fill()}
    else if(h.k==='pot'){c=potC(h,t);x=h.x;y=h.y;
      if(c<.72){sc=c/.72;g.fillStyle='rgba(30,20,10,'+(.1+.22*sc)+')';g.beginPath();g.ellipse(x,y,h.r*(.3+.7*sc),h.r*(.3+.7*sc)*.8,0,0,TAU);g.fill();
        g.strokeStyle='rgba(226,72,61,'+(.25+.5*sc)+')';g.lineWidth=1.5;g.setLineDash([4,4]);g.beginPath();g.arc(x,y,h.r+1,0,TAU);g.stroke();g.setLineDash([]);
        if(sc>.55){l=(sc-.55)/.45;o=y-(1-l)*70;g.globalAlpha=.35+.65*l;sc=1.5-.5*l;
          g.fillStyle='#c8683f';g.beginPath();g.moveTo(x-9*sc,o-6*sc);g.lineTo(x+9*sc,o-6*sc);g.lineTo(x+6*sc,o+8*sc);g.lineTo(x-6*sc,o+8*sc);g.fill();
          g.fillStyle='#4fa36a';g.beginPath();g.ellipse(x-4*sc,o-10*sc,5*sc,2.5*sc,-.6,0,TAU);g.ellipse(x+4*sc,o-10*sc,5*sc,2.5*sc,.6,0,TAU);g.fill();g.globalAlpha=1}}
      else{l=(c-.72)/.28;g.globalAlpha=l>.8?(1-l)/.2:1;
        g.fillStyle='rgba(30,20,10,.25)';g.beginPath();g.ellipse(x,y+3,h.r,h.r*.7,0,0,TAU);g.fill();
        g.fillStyle='#7a5a3c';g.beginPath();g.ellipse(x,y,h.r-2,h.r*.72,0,0,TAU);g.fill();
        g.fillStyle='#c8683f';for(i=0;i<5;i++){a=i*1.26+.3;g.beginPath();g.moveTo(x+Math.cos(a)*5,y+Math.sin(a)*4);g.lineTo(x+Math.cos(a-.4)*h.r,y+Math.sin(a-.4)*h.r*.8);g.lineTo(x+Math.cos(a+.4)*h.r,y+Math.sin(a+.4)*h.r*.8);g.fill()}
        g.fillStyle='#4fa36a';g.beginPath();g.ellipse(x-3,y-3,6,3,-.5,0,TAU);g.ellipse(x+4,y-2,6,3,.5,0,TAU);g.fill();
        g.fillStyle='#ff9fbf';g.beginPath();g.arc(x,y-5,3,0,TAU);g.fill();g.globalAlpha=1}}
    else if(h.k==='door'){o=doorOpen(h,t);half=h.len/2*(1-o);
      [[h.x-h.len/2,half],[h.x+h.len/2-half,half]].forEach(function(q,i){if(q[1]<.5)return;
        g.fillStyle='rgba(50,30,10,.3)';g.fillRect(q[0]+2,h.y-5+5,q[1],10);
        g.fillStyle=h.anti?'#6d3fb8':'#5b3a23';g.fillRect(q[0],h.y-6,q[1],12);
        g.fillStyle=h.anti?'#e3d2ff':'#fbf3df';if(q[1]>4)g.fillRect(q[0]+2,h.y-4,q[1]-4,8);
        g.fillStyle=h.anti?'#b48cff':'#e2483d';g.fillRect(i?q[0]:q[0]+q[1]-2,h.y-6,2,12)})}
    else if(h.k==='raft'){p=hpos(h,t);x=p[0]-h.w/2;y=p[1]-h.h/2;
      g.fillStyle='rgba(0,20,40,.3)';g.fillRect(x+3,y+5,h.w,h.h);
      for(i=0;i<h.w/12;i++){g.fillStyle=i%2?'#b98a55':'#a87a48';g.fillRect(x+i*12,y,12,h.h)}
      g.fillStyle='#6b4a2d';g.fillRect(x-1,y+8,h.w+2,4);g.fillRect(x-1,y+h.h-12,h.w+2,4);
      g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.strokeRect(x+.5,y+.5,h.w-1,h.h-1)}
    else if(h.k==='eye'){o=eyeOn(h,t);c=frac(t/h.p+h.ph);
      if(o){g.fillStyle='rgba(235,80,60,.16)';g.fillRect(h.zx,h.zy,h.zw,h.zh);
        g.save();g.beginPath();g.rect(h.zx,h.zy,h.zw,h.zh);g.clip();g.strokeStyle='rgba(235,80,60,.22)';g.lineWidth=6;g.beginPath();
        for(i=-h.zh;i<h.zw;i+=28){g.moveTo(h.zx+i,h.zy);g.lineTo(h.zx+i+h.zh,h.zy+h.zh)}g.stroke();g.restore()}
      else{g.fillStyle='rgba(70,170,120,.09)';g.fillRect(h.zx,h.zy,h.zw,h.zh)}
      g.strokeStyle=o?'rgba(235,80,60,.8)':'rgba(60,140,95,.6)';g.lineWidth=2;g.setLineDash([8,6]);g.strokeRect(h.zx+1,h.zy+1,h.zw-2,h.zh-2);g.setLineDash([]);
      x=h.x;y=h.y;g.fillStyle='rgba(30,20,10,.28)';g.beginPath();g.ellipse(x+2,y+13,13,4,0,0,TAU);g.fill();
      g.fillStyle='#d8453c';g.beginPath();g.ellipse(x,y,13,14,0,0,TAU);g.fill();
      g.fillStyle='#fff3e2';g.beginPath();g.ellipse(x,y-2,9,7.5,0,0,TAU);g.fill();
      if(o){g.fillStyle='#22202a';g.beginPath();g.arc(x-3.5,y-2,2.6,0,TAU);g.arc(x+3.5,y-2,2.6,0,TAU);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x-4.2,y-3,.9,0,TAU);g.arc(x+2.8,y-3,.9,0,TAU);g.fill()}
      else{g.strokeStyle='#22202a';g.lineWidth=1.5;g.beginPath();g.arc(x-3.5,y-2.5,2.4,.2,Math.PI-.2);g.stroke();g.beginPath();g.arc(x+3.5,y-2.5,2.4,.2,Math.PI-.2);g.stroke()}
      g.fillStyle='#ffd86b';g.fillRect(x-5,y+6,10,2.5);
      /* 다음 전환까지 남은 시간 고리 */
      l=o?1-c/h.on:1-(c-h.on)/(1-h.on);g.strokeStyle='rgba(60,40,25,.25)';g.lineWidth=3;g.beginPath();g.arc(x,y,18,0,TAU);g.stroke();
      g.strokeStyle=o?'#e2483d':'#4fa36a';g.beginPath();g.arc(x,y,18,-Math.PI/2,-Math.PI/2+TAU*l);g.stroke()}}

  function draw(g,a){
    if(!G)return;
    var ko=a.lang==='ko',i,h,t,tv,av,cx,cy,fz=1-G.warm,base,p,gr,f,x,y,m,rw=0,k,fs,s;
    garden(g);
    if(!R.cv)R.cv=floorCache();
    /* 시계 값(되감기 중에는 0으로 돌아간다) */
    tv=R.t0+S.T*DT+(G.flow>0?G.acc:0);av=S.A*DT+G.accA;cx=S.x+G.dir[0]*VMAX*G.acc*(G.flow>0?1:0);cy=S.y+G.dir[1]*VMAX*G.acc*(G.flow>0?1:0);
    if(G.ph==='rewind'&&G.rs){rw=Math.min(1,G.pt/.4);f=1-(1-rw)*(1-rw);tv=R.t0+G.rs.T*DT*(1-f);av=G.rs.A*DT*(1-f);
      k=Math.floor((G.hist.length-1)*(1-f));cx=G.hist[k][0];cy=G.hist[k][1];if(rw<.15){cx=G.rs.x;cy=G.rs.y}}
    /* 방 */
    g.fillStyle='rgba(0,0,0,.35)';rr(g,OX-3,OY+1,PW+8,PH+8,6);g.fill();
    g.save();g.beginPath();g.rect(OX,OY,PW,PH);g.clip();
    g.drawImage(R.cv,OX,OY);
    for(i=0;i<R.ponds.length;i++){p=R.ponds[i];g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=1.2;
      for(k=0;k<6;k++){x=p[0]+((k*61+G.gt*14)%p[2]);y=p[1]+14+((k*37)%(p[3]-24));g.beginPath();g.moveTo(x-8,y);g.quadraticCurveTo(x,y-3,x+8,y);g.stroke()}}
    /* 등불 빛 웅덩이 */
    g.globalCompositeOperation='lighter';
    [[OX+70,OY+96],[OX+268,OY+392]].forEach(function(q,j){var al=.07+.13*G.warm+.015*Math.sin(G.gt*6+j*2);
      gr=g.createRadialGradient(q[0],q[1],8,q[0],q[1],170);gr.addColorStop(0,'rgba(255,178,84,'+al+')');gr.addColorStop(1,'rgba(255,178,84,0)');g.fillStyle=gr;g.fillRect(q[0]-170,q[1]-170,340,340)});
    g.globalCompositeOperation='source-over';
    /* 바닥에 붙는 것: 뗏목, 눈, 레일 */
    for(i=0;i<R.hz.length;i++){h=R.hz[i];t=h.anti?av:tv;if(h.k==='raft'||h.k==='eye')drawHaz(g,h,t);
      if(h.k==='chase'){g.strokeStyle='rgba(60,40,25,.35)';g.lineWidth=2;g.setLineDash([3,5]);g.beginPath();g.moveTo(h.x1,h.y);g.lineTo(h.x2,h.y);g.stroke();g.setLineDash([])}}
    /* 예측 점선 */
    base=(.4+.6*fz)*(rw?0:1);
    for(i=0;i<R.hz.length;i++){h=R.hz[i];t=h.anti?av:tv;
      if(h.k==='yarn'||h.k==='dart'||h.k==='pend'||h.k==='vac')dots(g,h,t,base);
      else if(h.k==='chase'){x=S.rx[h.ci];y=Math.max(h.x1,Math.min(h.x2,cx));if(Math.abs(y-x)>4){g.fillStyle='#ff9d8a';for(k=1;k<=8;k++){m=x+(y-x)*k/8;g.globalAlpha=base*(1-k/10);g.beginPath();g.arc(m,h.y,1.8,0,TAU);g.fill()}g.globalAlpha=1}}}
    drawMailbox(g,R.mx,R.my,G.ph==='bow'&&G.pt>.35);
    for(i=0;i<R.hz.length;i++){h=R.hz[i];t=h.anti?av:tv;if(h.k!=='raft'&&h.k!=='eye'&&h.k!=='pend')drawHaz(g,h,t)}
    /* 고양이 */
    if(G.ph==='rewind'){for(k=1;k<=3;k++){i=Math.min(G.hist.length-1,Math.floor((G.hist.length-1)*(1-f))+k*4);g.globalAlpha=.25-k*.06;g.fillStyle='#9fd0ff';g.beginPath();g.arc(G.hist[i][0],G.hist[i][1]-3,10,0,TAU);g.fill()}g.globalAlpha=1}
    drawCat(g,cx,cy,S.fx,{walk:G.flow>0&&!G.wait?G.gt:0,scarf:G.ph==='rewind'?null:G.scarf,sx:S.x,sy:S.y,letter:G.ph!=='rewind'&&!(G.ph==='bow'&&G.pt>.12),
      dizzy:G.ph==='rewind',blink:G.blink<0,bow:G.ph==='bow'?Math.min(1,G.pt/.25)*(G.pt>.6?Math.max(0,1-(G.pt-.6)/.2):1):0});
    if(G.ph==='rewind'&&rw<.5){for(k=0;k<3;k++){f=G.rt*9+k*2.1;g.fillStyle='#ffd86b';g.beginPath();g.arc(cx+Math.cos(f)*11,cy-17+Math.sin(f)*3,1.8,0,TAU);g.fill()}
      g.save();g.translate(G.rs.x+10,G.rs.y+6);g.rotate(.4);g.fillStyle='#fffaf0';g.fillRect(-5,-4,10,8);g.fillStyle='#e2483d';g.beginPath();g.arc(0,0,1.6,0,TAU);g.fill();g.restore()}
    if(G.ph==='bow'&&G.pt>.12&&G.pt<.4){f=(G.pt-.12)/.28;x=S.x+(R.mx-S.x)*f;y=S.y+(R.my-S.y)*f-Math.sin(f*Math.PI)*16;g.fillStyle='#fffaf0';g.fillRect(x-5,y-4,10,8);g.fillStyle='#e2483d';g.beginPath();g.arc(x,y,1.6,0,TAU);g.fill()}
    /* 위에 떠 있는 것: 등롱 진자 */
    for(i=0;i<R.hz.length;i++){h=R.hz[i];if(h.k==='pend')drawHaz(g,h,h.anti?av:tv)}
    /* 먼지 */
    for(i=0;i<G.motes.length;i++){m=G.motes[i];x=OX+((m[0]+G.gt*6*m[3]+Math.sin(G.gt*.8+m[2])*8)%PW+PW)%PW;y=OY+((m[1]-G.gt*3*m[3]+Math.cos(G.gt*.6+m[2])*6)%PH+PH)%PH;
      g.fillStyle='rgba(255,246,214,'+(.25+.3*fz)+')';g.beginPath();g.arc(x,y,m[3]*1.3,0,TAU);g.fill()}
    /* 멈춘 시간: 차가운 빛 + 비네트 / 흐르는 시간: 따뜻한 빛 */
    g.fillStyle='rgba(92,112,156,'+(.25*fz)+')';g.fillRect(OX,OY,PW,PH);
    g.fillStyle='rgba(255,170,80,'+(.07*G.warm)+')';g.fillRect(OX,OY,PW,PH);
    gr=g.createRadialGradient(OX+PW/2,OY+PH/2,150,OX+PW/2,OY+PH/2,360);gr.addColorStop(0,'rgba(18,22,48,0)');gr.addColorStop(1,'rgba(18,22,48,'+(.14+.36*fz)+')');g.fillStyle=gr;g.fillRect(OX,OY,PW,PH);
    if(rw){g.fillStyle='rgba(150,200,255,'+(.22*(1-rw))+')';g.fillRect(OX,OY,PW,PH);g.fillStyle='rgba(255,255,255,.12)';for(k=0;k<12;k++)g.fillRect(OX,OY+((k*47+G.rt*900)%PH),PW,2);
      g.fillStyle='rgba(255,255,255,.85)';g.beginPath();x=OX+PW/2;y=OY+PH/2;g.moveTo(x-4,y-14);g.lineTo(x-24,y);g.lineTo(x-4,y+14);g.moveTo(x+20,y-14);g.lineTo(x,y);g.lineTo(x+20,y+14);g.fill()}
    if(G.ph==='enter'){g.fillStyle='rgba(255,246,224,'+(1-G.pt/.3)+')';g.fillRect(OX,OY,PW,PH)}
    g.restore();
    g.strokeStyle='#4a2f1c';g.lineWidth=4;rr(g,OX-2,OY-2,PW+4,PH+4,5);g.stroke();
    g.strokeStyle='rgba(255,220,170,.25)';g.lineWidth=1;rr(g,OX-3.5,OY-3.5,PW+7,PH+7,6);g.stroke();
    /* 남은 시간 막대 */
    f=Math.max(0,G.clock/70);g.fillStyle='rgba(0,0,0,.4)';rr(g,OX,35,PW,9,4.5);g.fill();
    g.fillStyle=G.clock<10?(Math.sin(G.rt*12)>0?'#ff6b5a':'#ffb09c'):G.clock<22?'#ffc35a':'#8fe0b4';if(f>0.02){rr(g,OX+1,36,(PW-2)*f,7,3.5);g.fill()}
    g.font='12px Jua, system-ui, sans-serif';g.textAlign='right';g.fillStyle='#fff';g.fillText(Math.ceil(G.clock)+(ko?'초':'s'),OX+PW-4,44);
    /* 아래 UI: 모래시계 버튼, 방 번호, 힌트 */
    f=S.wm/R.wait;s=G.wait&&S.wm>0?.93:1;x=BX+(G.warn>0?Math.sin(G.rt*60)*2:0);
    g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(x+1,BY+3,BR*s,0,TAU);g.fill();
    g.fillStyle=G.wait&&S.wm>0?'#ffe2a6':'#fbf3df';g.beginPath();g.arc(x,BY,BR*s,0,TAU);g.fill();
    g.strokeStyle='rgba(90,58,35,.3)';g.lineWidth=4;g.beginPath();g.arc(x,BY,BR*s-3,0,TAU);g.stroke();
    g.strokeStyle=f>.3?'#e89b2f':'#e2483d';g.lineCap='butt';if(f>0){g.beginPath();g.arc(x,BY,BR*s-3,-Math.PI/2,-Math.PI/2+TAU*f);g.stroke()}
    g.fillStyle='#5b3a23';g.fillRect(x-9,BY-13,18,3);g.fillRect(x-9,BY+10,18,3);
    g.strokeStyle='#5b3a23';g.lineWidth=1.6;g.beginPath();g.moveTo(x-7,BY-10);g.lineTo(x+7,BY-10);g.lineTo(x+1,BY);g.lineTo(x+7,BY+10);g.lineTo(x-7,BY+10);g.lineTo(x-1,BY);g.closePath();g.stroke();
    g.fillStyle='#e89b2f';g.beginPath();g.moveTo(x-5*f,BY-8*f-1);g.lineTo(x+5*f,BY-8*f-1);g.lineTo(x,BY-1);g.fill();
    g.beginPath();g.moveTo(x-6*(1-f)-.5,BY+9.5);g.lineTo(x+6*(1-f)+.5,BY+9.5);g.lineTo(x,BY+9.5-8*(1-f));g.fill();
    g.textAlign='left';g.font='17px Jua, system-ui, sans-serif';
    s=(ko?'방 ':'Room ')+(G.n+1);g.fillStyle='rgba(0,0,0,.45)';g.fillText(s,77,584);g.fillStyle='#fff3c4';g.fillText(s,76,583);
    k=g.measureText(s).width;g.font='12px Jua, system-ui, sans-serif';g.fillStyle=G.warm>.3?'#ffd08a':'#a9c4ee';
    g.fillText(G.warm>.3?(ko?'▶ 시간이 흘러요':'▶ time flows'):(ko?'❚❚ 시간 정지':'❚❚ frozen'),76+k+10,582);
    if(R.hint){s=R.hint[a.lang];fs=15;g.font=fs+'px Jua, system-ui, sans-serif';while(g.measureText(s).width>226&&fs>10){fs--;g.font=fs+'px Jua, system-ui, sans-serif'}
      k=g.measureText(s).width;g.fillStyle='rgba(20,22,44,.62)';rr(g,72,594,k+14,24,8);g.fill();g.fillStyle='#fffaf0';g.fillText(s,79,611)}
    /* 가상 조이스틱 */
    if(G.joy&&a&&G.ph!=='bow'){g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=2;g.beginPath();g.arc(G.joy[0],G.joy[1],46,0,TAU);g.stroke();
      p=window.__sg&&window.__sg.inp;if(p&&p.x!=null){x=p.x-G.joy[0];y=p.y-G.joy[1];m=Math.hypot(x,y)||1;f=Math.min(46,m);
        g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.arc(G.joy[0]+x/m*f,G.joy[1]+y/m*f,13,0,TAU);g.fill()}}
  }

  SG.run({id:'time-step',title:{ko:'멈춘 시간 배달부',en:'Time-Step Courier'},
    how:{ko:'내가 움직일 때만 시간이 흘러요. 멈춰서 길을 읽고 편지를 우체통까지 배달하세요!',en:'Time only moves when you move. Freeze, read the paths, and deliver the letter to the mailbox!'},
    init:init,update:update,draw:draw});
})();
