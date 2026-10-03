/* 빛 섞기 (Prism Mix) — 거울을 돌려 빨강·초록·파랑 빛을 섞고, 수정 친구들이 원하는 색을 "정확히" 비춰 깨운다.
   빛 추적·풀이·생성 로직은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var GW=6,GH=8,N=GW*GH,DX=[1,0,-1,0],DY=[0,1,0,-1];
  /* 방향 0=오른쪽 1=아래 2=왼쪽 3=위.  거울 a='/'  b='\' */
  var REFL=[[3,2,1,0],[1,0,3,2]];
  var LET={R:1,G:2,B:4,Y:3,M:5,C:6,W:7},DCH={'>':0,'v':1,'<':2,'^':3};

  /* ---------- 레벨 데이터 (칸마다 2글자) ----------
     ..빈칸 ##벽 ma/mb 거울 sa/sb 프리즘(분광) R> Gv B< 등 광원 cR..cW 수정 fR/fG/fB 색 문 */
  var LEVELS=[
    {tip:{ko:'거울을 눌러 빛을 돌려요',en:'Tap the mirror to turn the light'},rows:[
      '.. .. .. .. .. ..','.. .. .. .. .. ..','.. .. .. .. .. ..','R> .. .. ma .. ..',
      '.. .. .. .. .. ..','.. .. .. cR .. ..','.. .. .. .. .. ..','.. .. .. .. .. ..']},
    {tip:{ko:'빨강 + 초록 = 노랑',en:'Red + green = yellow'},rows:[
      '.. .. .. .. .. ..','.. .. .. .. .. ..','R> .. .. ma .. ..','.. .. .. .. .. ..',
      '.. .. .. cY .. ma','.. .. .. .. .. ..','.. .. .. .. .. ..','.. .. .. .. .. G^']},
    {tip:{ko:'빛이 넘쳐도 싫어해요. 돌아가요!',en:'Too much light is wrong. Go around!'},rows:[
      '.. .. .. .. .. ..','.. .. .. .. .. ..','R> .. cR .. cY ..','.. .. .. .. .. ..',
      '.. .. .. .. .. ..','G> .. ma .. .. ..','.. .. .. .. .. ..','.. .. mb .. mb ..']},
    {tip:{ko:'파랑을 섞으면 자홍과 청록',en:'Blue makes magenta and cyan'},rows:[
      '.. .. .. .. .. ..','R> .. ma .. .. ..','.. .. .. .. .. ..','.. .. .. .. .. ..',
      'B> .. cM .. cC ..','.. .. .. .. .. ..','.. .. .. .. ma G<','.. .. .. .. .. ..']},
    {tip:{ko:'셋을 다 모으면 하양',en:'All three make white'},rows:[
      'B> .. .. ma .. ..','.. .. .. .. .. ..','.. .. .. .. .. ..','R> .. .. cW cY ma',
      '.. .. .. .. .. ..','.. .. .. cB .. ..','.. .. .. .. .. ..','.. .. .. .. .. G^']},
    {tip:{ko:'빛끼리는 그냥 통과해요',en:'Beams pass through each other'},rows:[
      '.. .. .. .. .. ..','G> .. .. .. cG ma','.. .. .. .. .. ..','.. ## mb .. mb ..',
      '.. .. .. .. .. ..','.. .. .. ## .. ..','R> cR ma .. cY mb','.. .. .. .. .. ..']},
    {tip:{ko:'프리즘은 빛을 둘로 나눠요',en:'A prism splits one beam in two'},rows:[
      '.. .. .. .. .. ..','.. .. .. .. .. cR','.. .. .. .. .. ..','R> .. sa .. .. mb',
      '.. .. .. .. .. ..','.. .. .. .. .. ..','.. .. cR .. .. ..','.. .. .. .. .. ..']},
    {tip:{ko:'색 문은 제 색만 지나가요',en:'A colour gate lets only its colour through'},rows:[
      '.. .. .. .. .. ..','.. .. .. cG .. ..','.. .. .. fG .. ..','R> .. .. ma .. G<',
      '.. .. .. .. .. ..','.. .. .. cM .. ..','B> .. .. mb .. ..','.. .. .. .. .. ..']},
    {rows:["Bv .. .. .. .. ..", "G> .. .. ma sa ..", ".. .. .. .. .. ..", "cR .. cR cY .. R<", "mb .. .. mb ## ..", ".. .. .. .. .. ..", ".. .. ## ## ma ..", "cG .. .. .. .. .."]},
    {rows:[".. .. .. .. mb G<", ".. mb cB .. cC ..", ".. .. .. .. .. ..", ".. .. .. .. .. ..", ".. cB .. .. fG ..", ".. .. .. .. .. ..", "B> sb .. .. cC ..", "R> ma .. .. mb .."]},
    {rows:[".. Rv .. .. .. Bv", ".. cY ma .. .. ..", "G> cY mb .. mb ..", ".. .. .. .. .. ..", ".. .. .. .. .. ..", ".. sa .. .. cR ..", "## .. .. .. ## sa", ".. ma .. cR cR mb"]},
    {rows:["ma sa .. .. cM ..", ".. sb cR .. .. ..", ".. ma .. .. .. ..", "ma .. .. cY .. R<", ".. mb .. .. mb ..", ".. cB .. .. .. ..", ".. .. ## cG .. ..", ".. B^ .. G^ .. .."]}
  ];

  function parse(def){
    var L={cells:[],rot:[],crystals:[],sources:[],start:0,tip:def.tip||null},y,x,t,c;
    for(y=0;y<GH;y++){var tk=def.rows[y].split(' ');
      for(x=0;x<GW;x++){t=tk[x];c={t:0};
        if(t==='##')c={t:'w'};
        else if(t[0]==='m'||t[0]==='s'){c={t:t[0],ri:L.rot.length};if(t[1]==='b')L.start|=1<<L.rot.length;L.rot.push(y*GW+x)}
        else if(t[0]==='c'){c={t:'c',w:LET[t[1]]};L.crystals.push(y*GW+x)}
        else if(t[0]==='f')c={t:'f',c:LET[t[1]]};
        else if(DCH[t[1]]!=null){c={t:'S',c:LET[t[0]],d:DCH[t[1]]};L.sources.push(y*GW+x)}
        L.cells.push(c)}}
    return L}
  function serialize(L,mask){var inv={1:'R',2:'G',4:'B',3:'Y',5:'M',6:'C',7:'W'},rows=[],y,x,c,r;
    for(y=0;y<GH;y++){r=[];for(x=0;x<GW;x++){c=L.cells[y*GW+x];
      r.push(!c.t?'..':c.t==='w'?'##':c.t==='c'?'c'+inv[c.w]:c.t==='f'?'f'+inv[c.c]:c.t==='S'?inv[c.c]+'>v<^'[c.d]:c.t+((mask>>c.ri)&1?'b':'a'))}
      rows.push(r.join(' '))}
    return rows}

  /* ---------- 빛 추적 ---------- */
  function trace(L,mask,wantSegs){
    var light=new Uint8Array(N),seen={},segs=wantSegs?[]:null,stack=[],i,s,c;
    for(i=0;i<L.sources.length;i++){s=L.sources[i];c=L.cells[s];stack.push([s%GW,(s/GW)|0,c.d,c.c,0])}
    while(stack.length){
      var b=stack.pop(),x=b[0],y=b[1],d=b[2],col=b[3],dist=b[4];
      for(;;){
        var nx=x+DX[d],ny=y+DY[d],k,cell;
        if(nx<0||ny<0||nx>=GW||ny>=GH){if(segs)segs.push({x1:x,y1:y,x2:x+DX[d]*.5,y2:y+DY[d]*.5,c:col,d:dist,end:1});break}
        k=ny*GW+nx;cell=L.cells[k];
        if(cell.t==='w'||cell.t==='S'||(cell.t==='f'&&cell.c!==col)){
          var f=cell.t==='f'?.72:.5;if(segs)segs.push({x1:x,y1:y,x2:x+DX[d]*f,y2:y+DY[d]*f,c:col,d:dist,end:2});break}
        var key=k*32+d*8+col;if(seen[key])break;seen[key]=1;
        if(segs)segs.push({x1:x,y1:y,x2:nx,y2:ny,c:col,d:dist});
        light[k]|=col;dist+=1;x=nx;y=ny;
        if(cell.t==='m')d=REFL[(mask>>cell.ri)&1][d];
        else if(cell.t==='s')stack.push([x,y,REFL[(mask>>cell.ri)&1][d],col,dist]);
      }
    }
    return {light:light,segs:segs}}
  function solved(L,light){for(var i=0;i<L.crystals.length;i++){var k=L.crystals[i];if(light[k]!==L.cells[k].w)return false}return true}
  function pc(v){var n=0;while(v){n+=v&1;v>>>=1}return n}
  /* 거울 상태 공간을 너비 우선 탐색: 시작 상태에서 풀린 상태까지의 최소 탭 수(par)와 그 해 */
  function solve(L,from){
    var n=L.rot.length,start=from==null?L.start:from,dist=new Int16Array(1<<n).fill(-1),q=[start],h=0,i,m,v,count=0,par=-1,sol=-1;
    dist[start]=0;
    while(h<q.length){m=q[h++];
      if(solved(L,trace(L,m).light)){count++;if(par<0){par=dist[m];sol=m}}
      for(i=0;i<n;i++){v=m^(1<<i);if(dist[v]<0){dist[v]=dist[m]+1;q.push(v)}}}
    return {par:par,sol:sol,count:count,states:1<<n}}

  /* ---------- 무한 레벨 생성 ---------- */
  function rng(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
  function gen(seed,tier){
    var r=rng(seed*7919+tier*104729+13),att,i,k;
    function ri(n){return (r()*n)|0}
    for(att=0;att<400;att++){
      var L={cells:[],rot:[],crystals:[],sources:[],start:0,tip:null};
      for(i=0;i<N;i++)L.cells.push({t:0});
      var cols=[1,2,4].sort(function(){return r()-.5}),nS=tier<1?2:3;
      for(i=0;i<nS;i++){for(var g=0;g<20;g++){var side=ri(4),x=side===0?ri(GW):side===1?GW-1:side===2?ri(GW):0,y=side===0?0:side===1?ri(GH):side===2?GH-1:ri(GH);
        k=y*GW+x;if(L.cells[k].t)continue;L.cells[k]={t:'S',c:cols[i],d:[1,2,3,0][side]};L.sources.push(k);break}}
      if(L.sources.length<nS)continue;
      var nM=Math.min(8,3+((tier+1)>>1)+ri(2)),nSp=tier>=2?ri(Math.min(3,tier)):0,mask=0;
      if(nSp>2)nSp=2;
      function lit(pred){var tr=trace(L,mask),o=[];for(var j=0;j<N;j++)if(!L.cells[j].t&&pred(tr.light[j],j))o.push(j);return o}
      for(i=0;i<nM;i++){var cand=lit(function(v){return v});if(!cand.length)break;k=cand[ri(cand.length)];
        L.cells[k]={t:i<nSp?'s':'m',ri:L.rot.length};if(r()<.5)mask|=1<<L.rot.length;L.rot.push(k)}
      if(L.rot.length<3)continue;
      if(tier>=3&&r()<.6){var fc=lit(function(v){return v});if(fc.length){k=fc[ri(fc.length)];var lv=trace(L,mask).light[k],bits=[1,2,4].filter(function(b){return lv&b});
        L.cells[k]={t:'f',c:bits[ri(bits.length)]}}}
      var dark=lit(function(v){return !v}),nW=ri(4);
      for(i=0;i<nW&&dark.length;i++){k=dark.splice(ri(dark.length),1)[0];L.cells[k]={t:'w'}}
      var tr=trace(L,mask),pool=lit(function(v){return v}),nC=Math.min(5,2+Math.min(2,tier>>1)+ri(2)),mix=0;
      while(L.crystals.length<nC&&pool.length){var tot=0,ws=pool.map(function(j){var w=pc(tr.light[j])>1?5:1;tot+=w;return w}),pick=r()*tot,idx=0;
        while(pick>ws[idx]){pick-=ws[idx];idx++}k=pool.splice(idx,1)[0];
        L.cells[k]={t:'c',w:tr.light[k]};L.crystals.push(k);if(pc(tr.light[k])>1)mix++}
      if(L.crystals.length<2||(tier>=1&&!mix))continue;
      var flip=0;while(pc(flip)<2)flip=ri(1<<L.rot.length);
      L.start=mask^flip;
      var sv=solve(L),minPar=tier>=4?3:2;
      if(sv.par<minPar||sv.par>6||sv.count*4>sv.states)continue;
      L.par=sv.par;L.sol=sv.sol;return L}
    return parse(LEVELS[2+(seed%6)])}
  function getLevel(n,seed){
    var L;if(n<LEVELS.length)L=parse(LEVELS[n]);else L=gen((seed||1)+n*31,Math.min(8,2+((n-LEVELS.length)>>1)));
    if(L.par==null){var s=solve(L);L.par=s.par;L.sol=s.sol}
    L.n=n;return L}

  if(typeof module!=='undefined'&&module.exports){
    module.exports={LEVELS:LEVELS,parse:parse,serialize:serialize,trace:trace,solved:solved,solve:solve,gen:gen,getLevel:getLevel,pc:pc};return}

  /* =================== 화면 =================== */
  var W=360,H=640,CS=54,GX=18,GY=92,T0=50,TADD=14,TCAP=75;
  var RGB={1:[255,60,50],2:[50,255,80],4:[60,110,255]};
  function mixc(m,dim){var r=0,g=0,b=0;[1,2,4].forEach(function(k){if(m&k){r+=RGB[k][0];g+=RGB[k][1];b+=RGB[k][2]}});
    r=Math.min(255,r);g=Math.min(255,g);b=Math.min(255,b);if(dim!=null){r=r*dim+22*(1-dim);g=g*dim+20*(1-dim);b=b*dim+48*(1-dim)}
    return 'rgb('+(r|0)+','+(g|0)+','+(b|0)+')'}
  function rgba(m,a){var c=mixc(m);return 'rgba('+c.slice(4,-1)+','+a+')'}
  var PITCH={1:523,2:659,4:784,3:587,6:880,5:988,7:1047};
  var TXT={ko:{lv:'스테이지 ',taps:'탭 ',par:'목표 ',perfect:'완벽!',good:'반짝!',streak:'연속 x'},
           en:{lv:'Stage ',taps:'Taps ',par:'Par ',perfect:'Perfect!',good:'Shine!',streak:'Streak x'}};

  var L,mask,tr,taps,lvl,time,streak,phase,winT,seed,fade,cur,kb,runT,ang,cst,spaceHit=false,dust=[],lastGain=0,gainT=9;
  if(!window.__prismKey){window.__prismKey=1;
    window.addEventListener('keydown',function(e){if(e.code==='Space'&&!e.repeat)spaceHit=true})}
  for(var di=0;di<34;di++)dust.push({x:Math.random()*W,y:Math.random()*H,s:.4+Math.random()*1.4,p:Math.random()*6.28,v:4+Math.random()*10});

  function cxy(k){return [GX+(k%GW)*CS+CS/2,GY+((k/GW)|0)*CS+CS/2]}
  function target(i){return (-45+90*(((mask>>i)&1)+ang[i].n*2))*Math.PI/180}
  function load(n){
    L=getLevel(n,seed);mask=L.start;tr=trace(L,mask,true);taps=0;phase='play';winT=0;fade=0;
    ang=L.rot.map(function(){return {n:0,a:0}});ang.forEach(function(o,i){o.a=target(i)});
    cst=L.crystals.map(function(k){return {ok:tr.light[k]===L.cells[k].w,pop:0,bl:Math.random()*3,over:0}});
    cur=L.rot.length?L.rot[0]:0}
  function rotate(i,a){
    var was=(mask>>i)&1;mask^=1<<i;if(was)ang[i].n++;taps++;
    tr=trace(L,mask,true);a.sfx('tap');
    var p=cxy(L.rot[i]);a.burst(p[0],p[1],'#cfe6ff',4);
    var all=true;
    L.crystals.forEach(function(k,j){var w=L.cells[k].w,l=tr.light[k],ok=l===w,s=cst[j],q=cxy(k),ov=(l&~w)!==0;
      if(ok&&!s.ok){s.pop=1;a.beep(PITCH[w],.3,'triangle');a.burst(q[0],q[1],mixc(w),10);a.pop(q[0],q[1]-22,'♪',mixc(w))}
      else if(ov&&!s.over){a.beep(160,.16,'sawtooth');a.pop(q[0],q[1]-22,'!',  '#ff9a9a');s.pop=-1}
      s.ok=ok;s.over=ov;if(!ok)all=false});
    if(all)win(a)}
  function win(a){
    phase='win';winT=0;
    var perfect=taps<=L.par,bonus=perfect?10:taps<=L.par+1?5:taps<=L.par+3?2:0;
    streak=perfect?streak+1:0;var pts=10+bonus+3*Math.min(streak,5),t=TXT[a.lang];
    a.add(pts);a.sfx('win');[523,659,784,1047].forEach(function(f){a.beep(f,.6,'sine')});
    L.crystals.forEach(function(k){var q=cxy(k);a.burst(q[0],q[1],mixc(L.cells[k].w),14)});
    a.pop(W/2,GY+GH*CS/2-10,(perfect?t.perfect:t.good)+' +'+pts,perfect?'#fff3a0':'#ffffff');
    if(streak>1)a.pop(W/2,GY+GH*CS/2+18,t.streak+streak,'#9ff0ff');
    var before=time;time=Math.min(TCAP,time+TADD);lastGain=Math.round(time-before);gainT=0}

  function init(a){seed=(Math.random()*1e6)|0;lvl=0;time=T0;streak=0;runT=0;kb=false;spaceHit=false;gainT=9;a.tempo(1);load(0)}

  function update(dt,inp,a){
    runT+=dt;
    if(phase==='win'){winT+=dt;spaceHit=false;if(winT>1.25){lvl++;load(lvl)}return}
    time-=dt;a.tempo(time<12?1.35:1);
    if(time<=0){time=0;a.over();return}
    if(inp.swipe&&inp.x==null){kb=true;var x=cur%GW,y=(cur/GW)|0;
      if(inp.swipe==='left')x=(x+GW-1)%GW;else if(inp.swipe==='right')x=(x+1)%GW;else if(inp.swipe==='up')y=(y+GH-1)%GH;else y=(y+1)%GH;
      cur=y*GW+x}
    if(spaceHit){spaceHit=false;if(runT>.25){kb=true;var c=L.cells[cur];if(c.ri!=null)rotate(c.ri,a);else a.beep(220,.05,'square')}}
    else if(inp.tap&&inp.x!=null&&!inp.swipe){
      var gx=Math.floor((inp.x-GX)/CS),gy=Math.floor((inp.y-GY)/CS);
      if(gx>=0&&gy>=0&&gx<GW&&gy<GH){kb=false;cur=gy*GW+gx;var c2=L.cells[cur];if(c2.ri!=null)rotate(c2.ri,a)}}
  }

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function bg(g,T){
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#1b1546');gr.addColorStop(.5,'#0e0b2a');gr.addColorStop(1,'#05040f');
    g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
    var i,x,h,s1=Math.sin(T*.23)*7,s2=Math.sin(T*.31+1)*12;
    g.fillStyle='rgba(58,48,130,.35)';
    for(i=0;i<7;i++){x=i*62-20+s1;h=46+((i*37)%50);g.beginPath();g.moveTo(x,0);g.lineTo(x+26,h);g.lineTo(x+50,0);g.fill();
      g.beginPath();g.moveTo(x+18,H);g.lineTo(x+40,H-h*.8);g.lineTo(x+66,H);g.fill()}
    g.fillStyle='rgba(24,18,66,.8)';
    for(i=0;i<5;i++){x=i*92-30+s2;h=30+((i*53)%34);g.beginPath();g.moveTo(x,0);g.lineTo(x+20,h);g.lineTo(x+44,0);g.fill();
      g.beginPath();g.moveTo(x+30,H);g.lineTo(x+56,H-h);g.lineTo(x+78,H);g.fill();
      g.fillStyle='rgba(120,110,220,.10)';g.beginPath();g.moveTo(x+30,H);g.lineTo(x+56,H-h);g.lineTo(x+50,H);g.fill();g.fillStyle='rgba(24,18,66,.8)'}
    for(i=0;i<dust.length;i++){var d=dust[i],yy=((d.y-T*d.v)%H+H)%H,xx=d.x+Math.sin(T*.5+d.p)*10;
      g.globalAlpha=.25+.25*Math.sin(T*1.7+d.p);g.fillStyle='#b9c4ff';g.beginPath();g.arc(xx,yy,d.s,0,7);g.fill()}
    g.globalAlpha=1}
  function tiles(g){
    rr(g,GX-6,GY-6,GW*CS+12,GH*CS+12,14);g.fillStyle='rgba(8,6,26,.55)';g.fill();g.strokeStyle='rgba(140,130,255,.18)';g.lineWidth=1.5;g.stroke();
    for(var k=0;k<N;k++){var p=cxy(k);rr(g,p[0]-CS/2+2,p[1]-CS/2+2,CS-4,CS-4,8);
      g.fillStyle=((k%GW)+((k/GW)|0))%2?'rgba(120,115,220,.055)':'rgba(120,115,220,.03)';g.fill()}}
  function drawWall(g,x,y){
    var gr=g.createLinearGradient(x-22,y-22,x+22,y+22);gr.addColorStop(0,'#4a4470');gr.addColorStop(1,'#1f1a3a');
    g.fillStyle='rgba(0,0,0,.4)';rr(g,x-21,y-18,44,44,9);g.fill();
    g.fillStyle=gr;rr(g,x-23,y-23,46,46,9);g.fill();
    g.fillStyle='rgba(255,255,255,.08)';g.beginPath();g.moveTo(x-17,y-17);g.lineTo(x+6,y-17);g.lineTo(x-17,y+8);g.fill();
    g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=2;g.beginPath();g.moveTo(x-8,y+18);g.lineTo(x+4,y+2);g.lineTo(x+18,y-6);g.stroke()}
  function drawSource(g,x,y,c,T){
    g.save();g.translate(x,y);
    g.globalCompositeOperation='lighter';var gl=g.createRadialGradient(0,0,2,0,0,26);gl.addColorStop(0,rgba(c.c,.55));gl.addColorStop(1,rgba(c.c,0));
    g.fillStyle=gl;g.beginPath();g.arc(0,0,26,0,7);g.fill();g.globalCompositeOperation='source-over';
    g.rotate(c.d*Math.PI/2);
    g.fillStyle='#2a2648';rr(g,-17,-15,30,30,8);g.fill();g.strokeStyle='#6c66a8';g.lineWidth=2;g.stroke();
    g.fillStyle='#565090';g.beginPath();g.moveTo(11,-9);g.lineTo(22,-5);g.lineTo(22,5);g.lineTo(11,9);g.fill();
    g.fillStyle=mixc(c.c);g.beginPath();g.arc(-2,0,8.5+Math.sin(T*5)*.6,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.arc(-4.5,-2.5,2.6,0,7);g.fill();
    g.restore()}
  function drawFilter(g,x,y,c){
    g.fillStyle=rgba(c.c,.22);g.beginPath();g.arc(x,y,15,0,7);g.fill();
    g.strokeStyle='#17142e';g.lineWidth=8;g.beginPath();g.arc(x,y,16,0,7);g.stroke();
    g.strokeStyle=mixc(c.c);g.lineWidth=4.5;g.beginPath();g.arc(x,y,16,0,7);g.stroke();
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1.5;g.beginPath();g.arc(x,y,16,3.6,4.9);g.stroke()}
  function drawBeams(g,T){
    g.save();g.globalCompositeOperation='lighter';g.lineCap='round';g.lineJoin='round';
    var pul=1+Math.sin(T*6)*.08,passes=[[20*pul,.10],[11*pul,.22],[4.6,.95]],c,i,s,p;
    [1,2,4].forEach(function(col){
      g.beginPath();var any=false;
      for(i=0;i<tr.segs.length;i++){s=tr.segs[i];if(s.c!==col)continue;any=true;
        g.moveTo(GX+s.x1*CS+CS/2,GY+s.y1*CS+CS/2);g.lineTo(GX+s.x2*CS+CS/2,GY+s.y2*CS+CS/2)}
      if(!any)return;
      for(p=0;p<3;p++){g.lineWidth=passes[p][0];g.strokeStyle=rgba(col,passes[p][1]);g.stroke()}});
    /* 빛 알갱이가 광원에서부터 흘러간다 */
    for(i=0;i<tr.segs.length;i++){s=tr.segs[i];
      var x1=GX+s.x1*CS+CS/2,y1=GY+s.y1*CS+CS/2,x2=GX+s.x2*CS+CS/2,y2=GY+s.y2*CS+CS/2,len=Math.hypot(x2-x1,y2-y1),sp=27,
          o=(((T*80-s.d*CS)%sp)+sp)%sp;
      g.fillStyle=rgba(s.c,.9);
      for(;o<len;o+=sp){g.beginPath();g.arc(x1+(x2-x1)*o/len,y1+(y2-y1)*o/len,2.6,0,7);g.fill()}
      if(s.end===2){g.fillStyle=rgba(s.c,.5+.3*Math.sin(T*20+i));g.beginPath();g.arc(x2,y2,5+Math.sin(T*17+i)*1.5,0,7);g.fill()}}
    g.restore()}
  function drawRot(g,i,T,hint){
    var k=L.rot[i],p=cxy(k),sp=L.cells[k].t==='s',a=ang[i].a;
    g.save();g.translate(p[0],p[1]);
    g.fillStyle='rgba(10,8,30,.55)';g.beginPath();g.arc(0,2,19,0,7);g.fill();
    g.strokeStyle=sp?'rgba(190,255,250,.5)':'rgba(170,190,255,.42)';g.lineWidth=1.5;g.setLineDash([4,5]);g.beginPath();g.arc(0,0,20,T*.6,T*.6+6.283);g.stroke();g.setLineDash([]);
    if(hint){var h=(T*1.2)%1;g.strokeStyle='rgba(255,255,255,'+(.8*(1-h))+')';g.lineWidth=3;g.beginPath();g.arc(0,0,18+h*16,0,7);g.stroke()}
    g.rotate(a);
    if(sp){
      g.fillStyle='rgba(150,240,255,.20)';g.strokeStyle='rgba(210,255,255,.85)';g.lineWidth=1.5;
      g.beginPath();g.moveTo(-20,0);g.lineTo(0,-11);g.lineTo(20,0);g.lineTo(0,11);g.closePath();g.fill();g.stroke();
      var rg=g.createLinearGradient(-20,0,20,0);rg.addColorStop(0,'#ff7a7a');rg.addColorStop(.5,'#8dff9a');rg.addColorStop(1,'#7aa0ff');
      g.strokeStyle=rg;g.lineWidth=3;g.setLineDash([6,4]);g.beginPath();g.moveTo(-19,0);g.lineTo(19,0);g.stroke();g.setLineDash([]);
    }else{
      g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.moveTo(-22,3);g.lineTo(0,-3);g.lineTo(22,3);g.lineTo(0,9);g.fill();
      var mg=g.createLinearGradient(0,-6,0,6);mg.addColorStop(0,'#ffffff');mg.addColorStop(.45,'#bcd6f5');mg.addColorStop(1,'#5f7fb0');
      g.fillStyle=mg;g.beginPath();g.moveTo(-23,0);g.lineTo(-4,-6);g.lineTo(23,0);g.lineTo(4,6);g.closePath();g.fill();
      g.strokeStyle='#e9f5ff';g.lineWidth=1.2;g.stroke();
      var gl=((T*.7+i*.37)%1)*46-23;g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(gl,0,1.8,0,7);g.fill();
    }
    g.fillStyle='#2b2750';g.beginPath();g.arc(0,0,3.4,0,7);g.fill();g.fillStyle='#c9d4ff';g.beginPath();g.arc(0,0,1.6,0,7);g.fill();
    g.restore()}
  var GEM=[[0,-19],[12,-10],[14,6],[7,17],[-7,17],[-14,6],[-12,-10]];
  function drawCrystal(g,j,T,dt){
    var k=L.crystals[j],p=cxy(k),w=L.cells[k].w,l=tr.light[k],s=cst[j],ok=l===w,over=(l&~w)!==0,i;
    s.pop*=Math.pow(.01,dt);
    var sc=1+Math.abs(s.pop)*.25,hop=ok?Math.abs(Math.sin(T*(phase==='win'?9:3.2)+j))*(phase==='win'?7:2.2):0,
        wob=over?Math.sin(T*26)*1.6:0;
    g.save();g.translate(p[0]+wob,p[1]-2-hop);
    if(l){g.globalCompositeOperation='lighter';var gl=g.createRadialGradient(0,0,4,0,0,30);gl.addColorStop(0,rgba(l,ok?.55:.3));gl.addColorStop(1,rgba(l,0));
      g.fillStyle=gl;g.beginPath();g.arc(0,0,30,0,7);g.fill();g.globalCompositeOperation='source-over'}
    g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(0,19+hop,12,3.5,0,0,7);g.fill();
    g.scale(sc,sc);
    g.beginPath();for(i=0;i<GEM.length;i++)g[i?'lineTo':'moveTo'](GEM[i][0],GEM[i][1]);g.closePath();
    var bgc=g.createLinearGradient(-12,-18,12,18);
    if(l){bgc.addColorStop(0,'#ffffff');bgc.addColorStop(.35,mixc(l));bgc.addColorStop(1,mixc(l,.55))}
    else{bgc.addColorStop(0,mixc(w,.34));bgc.addColorStop(1,mixc(w,.10))}
    g.fillStyle=bgc;g.fill();
    g.lineWidth=3.2;g.strokeStyle='#0c0a22';g.stroke();g.lineWidth=2.2;g.strokeStyle=mixc(w);g.stroke();
    g.fillStyle='rgba(255,255,255,'+(l?.35:.12)+')';g.beginPath();g.moveTo(0,-19);g.lineTo(-12,-10);g.lineTo(-3,-7);g.fill();
    /* 얼굴 */
    var ink=l?'#1a1436':'#cfd0f5';g.strokeStyle=ink;g.fillStyle=ink;g.lineWidth=1.8;g.lineCap='round';
    s.bl-=dt;if(s.bl<-.12)s.bl=1.5+Math.random()*2.5;
    if(over){g.beginPath();g.moveTo(-8,-4);g.lineTo(-3.5,-1);g.lineTo(-8,2);g.moveTo(8,-4);g.lineTo(3.5,-1);g.lineTo(8,2);g.stroke();
      g.beginPath();g.moveTo(-4,9);g.quadraticCurveTo(0,5,4,9);g.stroke()}
    else if(ok){if(s.bl<0){g.beginPath();g.moveTo(-8,-1);g.lineTo(-3,-1);g.moveTo(3,-1);g.lineTo(8,-1);g.stroke()}
      else{g.beginPath();g.arc(-5.5,-1,2.6,0,7);g.arc(5.5,-1,2.6,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(-6.3,-2,1,0,7);g.arc(4.7,-2,1,0,7);g.fill()}
      g.fillStyle=ink;g.beginPath();g.arc(0,6,3.6,0,3.1416);g.fill()}
    else if(l){g.beginPath();g.arc(-5.5,-1,2.3,0,7);g.fill();g.beginPath();g.arc(5.5,-1.5,2.6,.2,2.9);g.stroke();
      g.beginPath();g.moveTo(-2.5,7);g.lineTo(2.5,7);g.stroke()}
    else{g.beginPath();g.arc(-5.5,-2,2.6,.2,2.9);g.stroke();g.beginPath();g.arc(5.5,-2,2.6,.2,2.9);g.stroke();
      g.beginPath();g.arc(0,7,1.5,0,7);g.stroke();
      var z=(T*.6+j*.3)%1;g.globalAlpha=1-z;g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle='#cfd0f5';g.fillText('z',13+z*4,-13-z*9);g.globalAlpha=1}
    g.restore();
    /* 색 점: 원하는 색(고리)과 받은 색(채움), 원치 않는 빛은 x */
    var need=[1,2,4].filter(function(b){return (w|l)&b}),x0=p[0]-(need.length-1)*5.5,yy=p[1]+23.5;
    need.forEach(function(b,q){var x=x0+q*11;g.beginPath();g.arc(x,yy,3.6,0,7);g.fillStyle=(l&b)?mixc(b):'#0c0a22';g.fill();
      g.lineWidth=1.4;g.strokeStyle=(w&b)?mixc(b):'#ffffff';g.stroke();
      if(!(w&b)){g.strokeStyle='#fff';g.lineWidth=1.6;g.beginPath();g.moveTo(x-4.5,yy-4.5);g.lineTo(x+4.5,yy+4.5);g.moveTo(x+4.5,yy-4.5);g.lineTo(x-4.5,yy+4.5);g.stroke()}})}

  function draw(g,a,dt){
    dt=dt||.016;var T=performance.now()/1000,t=TXT[a.lang],i,k,c,p;
    bg(g,T);tiles(g);
    fade=Math.min(1,fade+dt*4);
    g.save();g.globalAlpha=fade;
    for(k=0;k<N;k++){c=L.cells[k];p=cxy(k);if(c.t==='w')drawWall(g,p[0],p[1]);else if(c.t==='f')drawFilter(g,p[0],p[1],c)}
    drawBeams(g,T);
    for(k=0;k<L.sources.length;k++){p=cxy(L.sources[k]);drawSource(g,p[0],p[1],L.cells[L.sources[k]],T)}
    for(i=0;i<L.crystals.length;i++)drawCrystal(g,i,T,dt);
    for(i=0;i<L.rot.length;i++){var tg=target(i);ang[i].a+=(tg-ang[i].a)*(1-Math.pow(1e-7,dt));drawRot(g,i,T,lvl===0&&taps===0&&phase==='play')}
    g.restore();
    if(kb){p=cxy(cur);var pu=2+Math.sin(T*6)*1.5;g.strokeStyle='#fff3a0';g.lineWidth=2.5;rr(g,p[0]-CS/2+pu,p[1]-CS/2+pu,CS-pu*2,CS-pu*2,9);g.stroke()}
    /* 위쪽 정보 */
    g.textBaseline='alphabetic';g.font='20px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='rgba(0,0,0,.4)';g.fillText(t.lv+(lvl+1),GX+1,68);
    g.fillStyle='#e8e6ff';g.fillText(t.lv+(lvl+1),GX,66);
    g.textAlign='right';g.font='16px Jua, system-ui, sans-serif';
    g.fillStyle=taps>L.par?'#ffb0a0':'#bfe9ff';g.fillText(t.taps+taps+'  ·  '+t.par+L.par,W-GX,66);
    /* 힌트 한 줄 */
    if(L.tip){g.textAlign='center';g.font='16px Jua, system-ui, sans-serif';g.fillStyle='rgba(0,0,0,.5)';g.fillText(L.tip[a.lang],W/2+1,558);
      g.fillStyle='#fff3c4';g.fillText(L.tip[a.lang],W/2,557)}
    /* 시간 막대 */
    var bx=GX,by=578,bw=250,bh=14,f=Math.max(0,time/TCAP),low=time<12;
    rr(g,bx,by,bw,bh,7);g.fillStyle='rgba(8,6,26,.7)';g.fill();g.strokeStyle='rgba(160,150,255,.35)';g.lineWidth=1.5;g.stroke();
    if(f>0){var tg2=g.createLinearGradient(bx,0,bx+bw,0);
      if(low){tg2.addColorStop(0,'#ff5a5a');tg2.addColorStop(1,'#ffb36b')}else{tg2.addColorStop(0,'#ff6b6b');tg2.addColorStop(.5,'#7dff9a');tg2.addColorStop(1,'#7aa8ff')}
      g.save();rr(g,bx+2,by+2,Math.max(6,(bw-4)*f),bh-4,5);g.clip();g.fillStyle=tg2;g.globalAlpha=low?.7+.3*Math.sin(T*12):1;g.fillRect(bx,by,bw,bh);g.restore()}
    g.textAlign='left';g.font='18px Jua, system-ui, sans-serif';g.fillStyle=low?'#ff9a8a':'#e8e6ff';g.fillText(Math.ceil(time)+'',bx+bw+8,by+13);
    gainT+=dt;if(gainT<1.2&&lastGain>0){g.globalAlpha=1-gainT/1.2;g.fillStyle='#9dffb0';g.font='16px Jua, system-ui, sans-serif';g.fillText('+'+lastGain,bx+bw+8,by-5-gainT*10);g.globalAlpha=1}
  }

  window.__prism={cur:function(){return cur},state:function(){return {lvl:lvl,mask:mask,sol:L.sol,par:L.par,taps:taps,phase:phase,time:time,
    rot:L.rot.map(function(k){return cxy(k)}),light:L.crystals.map(function(k){return [L.cells[k].w,tr.light[k]]})}}};

  SG.run({id:'prism-mix',title:{ko:'빛 섞기',en:'Prism Mix'},
    how:{ko:'거울을 눌러 빛을 돌리고 섞어서, 수정 친구들을 원하는 색으로 정확히 비추세요. 빛이 넘쳐도 안 돼요!',
         en:'Tap mirrors to bend and mix light so every crystal gets exactly its colour. Too much light is wrong too!'},
    init:init,update:update,draw:draw});
})();
