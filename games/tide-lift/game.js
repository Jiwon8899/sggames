/* 밀물 썰물 (Tide Lift) — 조작은 바다의 높이 하나뿐. 종이배는 물에 뜨면 해류를 타고 오른쪽으로 흘러간다.
   시뮬레이션(지형·배·통나무·수문·소용돌이)은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,WT=250,WB=540,BASE=604,D=6,M=30,HW=16,LT=14,SPD=64,RATE=240,WL0=470,LEAD=56;
  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function rng(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}

  /* ---------- 만(cove) 조립 ----------
     ops: ['reef',top,w] ['arch',y,w] ['tunnel',ceilY,floorY,w] ['log',tetherY,restY] ['gate',sillY]
          ['whirl',len,wy] ['jelly',y] ['nest',y] ['shell'] ['flat',len]
     y는 화면 좌표(작을수록 높다). 배는 수면 y=wl 에 떠 있고, 선체는 D만큼 잠기고 돛대는 M만큼 솟는다. */
  function build(ops,seed,tip){
    var r=rng(seed*7919+13),x=96,fl=[[-80,300],[-6,318],[14,BASE+4]],last=null,
        c={floor:fl,arch:[],logs:[],gates:[],whirls:[],jel:[],nests:[],shells:[],buoys:[],tip:tip||null,seed:seed};
    function flat(len){var e=x+len,nx=fl[fl.length-1][0]+22+r()*20;while(nx<e-12){fl.push([nx,BASE+(r()*16-6)]);nx+=22+r()*20}x=e}
    function lead(n){flat(n||LEAD);c.buoys.push(x-34)}
    function mound(top,w){fl.push([x,BASE]);fl.push([x+12,(BASE+top)/2+r()*14]);fl.push([x+26,top]);
      var p=x+26,e=p+w,q;for(q=p+14+r()*10;q<e-8;q+=14+r()*12)fl.push([q,top+r()*5]);
      fl.push([e,top]);fl.push([e+14,(BASE+top)/2+r()*14]);fl.push([e+26,BASE]);x=e+26;return p}
    ops.forEach(function(o){var k=o[0],p;
      if(k==='flat')flat(o[1]);
      else if(k==='reef'){lead();p=mound(o[1],o[2]);last=[p+o[2]/2,o[1]-22]}
      else if(k==='arch'){lead();c.arch.push({x1:x,x2:x+o[2],y:o[1]});last=[x+o[2]/2,o[1]+28];x+=o[2]}
      else if(k==='tunnel'){lead();p=mound(o[2],o[3]);c.arch.push({x1:p,x2:p+o[3],y:o[1]});last=[p+o[3]/2,(o[1]+M+o[2]-D)/2-8]}
      else if(k==='log'){lead();c.logs.push({x:x+30,w:44,ty:o[1],ry:o[2]});last=[x+30,o[1]-26];x+=60}
      else if(k==='gate'){lead();p=mound(o[1],96);c.gates.push({x:p+34,w:8,S:o[1]+8,yo:o[1]-92,yc:o[1]});last=[p+70,o[1]-22]}
      else if(k==='whirl'){lead();c.whirls.push({x1:x,x2:x+o[1],wy:o[2]});last=[x+o[1]/2,o[2]+4];x+=o[1]}
      else if(k==='jelly'){lead(50);c.jel.push({x:x+16,y:o[1]});last=[x+16,o[1]-28];x+=32}
      else if(k==='nest')c.nests.push({x:x+22,y:o[1]});
      else if(k==='shell'&&last)c.shells.push({x:last[0],y:last[1]})});
    flat(90);c.dock=x;fl.push([x+44,BASE]);fl.push([x+62,372]);fl.push([x+84,332]);fl.push([x+150,326]);fl.push([x+300,322]);c.w=x+180;
    return c}

  var HAND=[
    [['flat',70],['reef',410,56],['shell'],['flat',50]],
    [['reef',390,50],['arch',420,90],['shell'],['reef',430,44],['arch',400,70]],
    [['log',380,470],['shell'],['reef',400,40],['arch',440,80],['log',400,480],['reef',360,46]],
    [['reef',420,36],['gate',430],['arch',430,80],['shell'],['gate',400],['shell']],
    [['nest',296],['reef',340,56],['shell'],['arch',420,90],['shell'],['reef',332,44],['arch',450,60]],
    [['reef',400,40],['whirl',120,450],['shell'],['arch',430,70],['reef',380,40],['whirl',96,430]],
    [['jelly',430],['shell'],['tunnel',370,432,80],['shell'],['jelly',400],['arch',440,70],['reef',350,44]],
    [['nest',318],['log',420,480],['gate',410],['shell'],['whirl',104,440],['tunnel',380,442,70],['shell'],['reef',356,40]],
    [['reef',380,40],['arch',400,60],['shell'],['jelly',410],['whirl',100,460],['log',390,460],['shell'],['gate',420]],
    [['nest',300],['tunnel',350,412,60],['shell'],['whirl',100,450],['log',400,470],['jelly',390],['shell'],['arch',460,70],['gate',400],['reef',336,44],['shell']]
  ];
  var TIPS=[
    {ko:'물 높이를 올리고 내려요',en:'Raise and lower the tide'},
    {ko:'낮은 아치 밑에선 물을 내려요',en:'Lower the tide to duck under arches'},
    {ko:'통나무는 위로 넘거나 밑으로 지나가요',en:'Sail over the log, or under it'},
    {ko:'물이 높으면 수문이 닫혀요 — 낮췄다 올려요',en:'High water shuts the gate — dip, then rise'},
    {ko:'둥지가 잠기면 새가 화내요',en:"Don't flood the bird's nest"},
    {ko:'깊은 물엔 소용돌이가 깨어나요',en:'Deep water wakes the whirlpool'},
    {ko:'해파리는 높이 떠서 넘어가요',en:'Float high over the jellyfish'},
    {ko:'숨 쉬듯 밀물과 썰물을',en:'Breathe the tide in and out'},
    {ko:'미리 보고, 미리 움직여요',en:'Look ahead, move early'},
    {ko:'마지막 손수 만든 만!',en:'The last handmade cove!'}
  ];

  function genOps(n,k){
    var r=rng(n*7349+k*911+5),m=4+Math.min(2,Math.floor((n-10)/5)),types=['reef','arch','tunnel','log','gate','whirl','jelly','arch','reef'],
        top=340+Math.floor(r()*70),list,i,j,t,o,ops=[],minHi=WB,cy,ty;
    function ri(a,b){return a+Math.floor(r()*(b-a+1))}
    list=[['reef',top,ri(36,62)],['arch',Math.max(top-16,384)+ri(0,56),ri(50,96)]];
    while(list.length<m){t=types[ri(0,types.length-1)];
      if(t==='reef')o=['reef',ri(300,430),ri(30,62)];
      else if(t==='arch')o=['arch',ri(380,490),ri(50,96)];
      else if(t==='tunnel'){cy=ri(330,420);o=['tunnel',cy,cy+ri(60,72),ri(50,78)]}
      else if(t==='log'){ty=ri(350,410);o=['log',ty,Math.min(496,ty+ri(70,96))]}
      else if(t==='gate')o=['gate',ri(380,450)];
      else if(t==='whirl')o=['whirl',ri(80,118),ri(400,470)];
      else o=['jelly',ri(370,450)];
      list.push(o)}
    for(i=list.length-1;i>0;i--){j=ri(0,i);t=list[i];list[i]=list[j];list[j]=t}
    list.forEach(function(o){var h=o[0]==='reef'?o[1]-D:o[0]==='tunnel'?o[2]-D:o[0]==='gate'?o[1]-D:o[0]==='jelly'?o[1]-17:WB;if(h<minHi)minHi=h});
    j=ri(0,list.length-1);
    list.forEach(function(o,i){
      if(i===j&&minHi-30>=WT+14&&r()<.7)ops.push(['nest',minHi-28-ri(0,12)]);
      ops.push(o);if(r()<.5)ops.push(['shell'])});
    return ops}

  /* ---------- 지형 조회 ---------- */
  function floorY(c,x){var p=c.floor,lo=0,hi=p.length-1,m,a,b;
    if(x<=p[0][0])return p[0][1];if(x>=p[hi][0])return p[hi][1];
    while(hi-lo>1){m=(lo+hi)>>1;if(p[m][0]<=x)lo=m;else hi=m}
    a=p[lo];b=p[hi];return a[1]+(b[1]-a[1])*(x-a[0])/((b[0]-a[0])||1)}
  function floorTop(c,x1,x2){var m=Math.min(floorY(c,x1),floorY(c,x2)),p=c.floor,i;
    for(i=0;i<p.length;i++){if(p[i][0]>=x2)break;if(p[i][0]>x1&&p[i][1]<m)m=p[i][1]}return m}
  function ceilAt(s,x1,x2){var c=s.c,m=-1e9,i,a;
    for(i=0;i<c.arch.length;i++){a=c.arch[i];if(x2>a.x1&&x1<a.x2&&a.y>m)m=a.y}
    for(i=0;i<c.gates.length;i++){a=c.gates[i];if(x2>a.x&&x1<a.x+a.w&&s.gy[i]>m)m=s.gy[i]}
    return m}
  function logY(l,wl){return clamp(wl,l.ty,l.ry)}
  function blockAt(s,nx,wl){var c=s.c,i,l,ly,j;
    if(floorTop(c,nx-HW,nx+HW)-D<wl)return 'floor';
    if(ceilAt(s,nx-HW,nx+HW)+M>wl)return 'ceil';
    for(i=0;i<c.logs.length;i++){l=c.logs[i];if(Math.abs(nx-l.x)<HW+l.w/2){ly=logY(l,wl);if(!(ly-LT/2>=wl+D||ly+LT/2<=wl-M))return 'log'}}
    for(i=0;i<c.jel.length;i++){j=c.jel[i];if(Math.abs(nx-j.x)<HW+9&&wl>j.y-16)return 'jelly'}
    return null}

  /* ---------- 시뮬레이션 ---------- */
  function newSim(c){return {c:c,x:50,y:WL0,wl:WL0,vw:0,t:0,afloat:true,
    gy:c.gates.map(function(g){return WL0<g.S?g.yc:g.yo}),gt:c.gates.map(function(g){return WL0<g.S}),
    ws:c.whirls.map(function(){return 0}),still:0,got:c.shells.map(function(){return false}),
    ncd:c.nests.map(function(){return 0}),jcd:0,done:false,ev:[],blk:null,onLog:false,pin:false,vx:0,bot:{g:-1}}}
  function step(s,dt,tgt){
    var c=s.c,i,g,l,w,n,dv,wl,x=s.x,sup,cl,y,v,nx,b,x0=s.x,ny,tg,ov,ly,top,cp,f;
    if(s.done)return;
    tgt=clamp(tgt,WT,WB);dv=clamp((tgt-s.wl)*10,-RATE,RATE);s.wl+=dv*dt;s.vw=dv;if(Math.abs(tgt-s.wl)<.05)s.wl=tgt;
    wl=s.wl;s.t+=dt;
    for(i=0;i<c.gates.length;i++){g=c.gates[i];tg=wl<g.S;if(tg!==s.gt[i]){s.gt[i]=tg;s.ev.push({k:tg?'gc':'go',i:i})}
      ny=s.gy[i]+clamp((tg?g.yc:g.yo)-s.gy[i],-150*dt,34*dt);ov=x+HW>g.x&&x-HW<g.x+g.w;
      if(ov)ny=Math.min(ny,Math.max(s.gy[i],s.y-M));s.gy[i]=ny}
    for(i=0;i<c.whirls.length;i++){w=c.whirls[i];s.ws[i]=clamp(s.ws[i]+(wl<=w.wy?2.5:-4)*dt,0,1)}
    sup=floorTop(c,x-HW,x+HW)-D;s.onLog=false;
    for(i=0;i<c.logs.length;i++){l=c.logs[i];if(Math.abs(x-l.x)<HW+l.w/2){top=logY(l,wl)-LT/2;if(s.y+D<=top+3&&top-D<sup){sup=top-D;s.onLog=true}}}
    cl=ceilAt(s,x-HW,x+HW);y=Math.min(wl,sup);s.pin=false;if(cl+M>y&&cl+M<=sup){y=cl+M;s.pin=true}
    s.y=y;s.afloat=Math.abs(y-wl)<.01;s.blk=null;
    if(s.afloat){v=SPD;
      for(i=0;i<c.whirls.length;i++){w=c.whirls[i];if(x>w.x1-HW&&x<w.x2+HW){f=Math.min(1,(x-(w.x1-HW))/24);v-=s.ws[i]*110*f}}
      nx=Math.max(30,x+v*dt);b=blockAt(s,nx,wl);if(!b)s.x=nx;else{s.blk=b;
        if(b==='jelly'&&s.jcd<=0){s.jcd=3;s.ev.push({k:'sting'});if(!blockAt(s,x-10,wl))s.x=x-10}}}
    s.jcd-=dt;s.vx=(s.x-x0)/dt;
    if(Math.abs(s.x-x0)<4*dt)s.still+=dt;else s.still=0;
    if(s.still>=4){cp=50;for(i=0;i<c.buoys.length;i++)if(c.buoys[i]<=s.x-1&&c.buoys[i]>cp)cp=c.buoys[i];
      s.ev.push({k:'wash',from:s.x});s.x=cp;s.still=0}
    for(i=0;i<c.nests.length;i++){n=c.nests[i];s.ncd[i]-=dt;if(wl<n.y&&Math.abs(n.x-s.x)<230&&s.ncd[i]<=0){s.ncd[i]=3.5;s.ev.push({k:'scold',i:i})}}
    for(i=0;i<c.shells.length;i++){n=c.shells[i];if(!s.got[i]&&Math.abs(s.x-n.x)<14&&Math.abs(s.y-8-n.y)<15){s.got[i]=true;s.ev.push({k:'shell',i:i})}}
    if(s.x>=c.dock){s.done=true;s.ev.push({k:'dock'})}}

  /* ---------- 봇: 앞을 조금 내다보는 조종기 ---------- */
  function botTgt(s){var c=s.c,x=s.x,b=s.bot,i,g,la,k,lo,hi,x1,x2,a,l,hO,lU,okO,okU,dO,dU,n,ok=false,las=[48,30,12,0];
    for(i=0;i<c.gates.length;i++){g=c.gates[i];
      if(x-HW<g.x+g.w&&g.x-(x+HW)<70&&x+HW<=g.x){
        if(b.g!==i){if(s.gy[i]<=g.yo+.5)b.g=i;else return Math.min(WB,g.S+10)}
        else if(s.blk==='ceil'&&s.gy[i]>s.wl-M){b.g=-1;return Math.min(WB,g.S+10)}}}
    for(k=0;k<las.length&&!ok;k++){la=las[k];lo=WT;hi=WB;x1=x-HW;x2=x+HW+la;
      hi=Math.min(hi,floorTop(c,x1,x2)-D-2);
      for(i=0;i<c.arch.length;i++){a=c.arch[i];if(x2>a.x1&&x1<a.x2)lo=Math.max(lo,a.y+M+2)}
      for(i=0;i<c.whirls.length;i++){a=c.whirls[i];if(x2>a.x1&&x1<a.x2)lo=Math.max(lo,a.wy+3)}
      for(i=0;i<c.jel.length;i++){a=c.jel[i];if(x2>a.x-9&&x1<a.x+9)hi=Math.min(hi,a.y-18)}
      ok=lo<=hi;
      for(i=0;i<c.logs.length&&ok;i++){l=c.logs[i];if(x2>l.x-l.w/2&&x1<l.x+l.w/2){
        hO=Math.min(hi,l.ty-LT/2-D-2);lU=Math.max(lo,l.ry+LT/2+M+2);okO=lo<=hO;okU=lU<=hi;
        dO=Math.abs(clamp(s.wl,lo,hO)-s.wl);dU=Math.abs(clamp(s.wl,lU,hi)-s.wl);
        if(okO&&(!okU||dO<=dU))hi=hO;else if(okU)lo=lU;else ok=false}}}
    if(!ok)return s.wl;
    for(i=0;i<c.nests.length;i++){n=c.nests[i];if(Math.abs(n.x-x)<236&&Math.max(lo,n.y+5)<=hi)lo=Math.max(lo,n.y+5)}
    i=Math.min(6,(hi-lo)/2);return clamp(s.wl,lo+i,hi-i)}
  function runBot(c,maxT){var s=newSim(c),pen=0,i;
    while(!s.done&&s.t<maxT){step(s,1/60,botTgt(s));for(i=0;i<s.ev.length;i++){if(s.ev[i].k==='scold')pen+=3;else if(s.ev[i].k==='sting')pen+=2}s.ev.length=0}
    return {ok:s.done,t:s.t+pen,pen:pen}}
  /* 어떤 고정 수위로도 통과할 수 없는가(정적 검사) */
  function needsMoves(c){var lo=WT,hi=WB;if(c.gates.length)return true;
    c.arch.forEach(function(a){lo=Math.max(lo,a.y+M)});hi=floorTop(c,30,c.dock)-D;
    c.jel.forEach(function(j){hi=Math.min(hi,j.y-16)});return lo>hi}
  var cache={};
  function getCove(n){var k,c,r;if(cache[n])return cache[n];
    if(n<HAND.length)c=build(HAND[n],n+1,TIPS[n]);
    else{var best=null,bt=1e9,q;for(k=0;k<80;k++){q=build(genOps(n,k),n*31+k,null);r=runBot(q,30);
      if(r.ok&&r.pen===0&&needsMoves(q)){if(r.t<bt){bt=r.t;best=q}if(r.t<=14.5)break}}
      c=best||build(HAND[3+n%7],n+1,null)}
    cache[n]=c;return c}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={getCove:getCove,newSim:newSim,step:step,botTgt:botTgt,runBot:runBot,HAND:HAND,WT:WT,WB:WB,WL0:WL0,SPD:SPD,floorY:floorY,blockAt:blockAt};
  if(typeof SG==='undefined')return;

  /* =================== 게임 =================== */
  var n,c,s,time,tgt,mode,modeT,tG=0,cam=0,dispX=50,acc=0,wetY=WL0,dragY0=null,tgt0=0,coveT,scolded,shellN,
      moved,swT=0,plinkT=0,bumpT=0,blkT=0,ouch=0,washT=0,wipe=0,lowT=0,lastA=null,
      deco=null,bub=[],rings=[],plank=[],clouds=[],scoldA=[],bell=0,gain=null,LANG='ko';

  function decorate(c){
    var r=rng(c.seed*131+7),d={weeds:[],crabs:[],vents:[],floorP:null,archP:[],dots:[]},x,i,p=c.floor,a,k,P;
    for(x=20;x<c.w+40;x+=16+r()*26){var fy=floorY(c,x);if(fy<340)continue;
      d.weeds.push({x:x,y:fy,len:18+r()*34,ph:r()*6.28,c:r()<.5?'#2fb68a':r()<.6?'#3fa0a8':'#7ccf6a',w:2.4+r()*1.6})}
    for(i=0;i<Math.max(2,Math.round(c.w/330));i++){x=90+r()*(c.dock-120);d.crabs.push({x:x,x0:x-46,x1:x+46,dir:r()<.5?-1:1,ph:r()*6})}
    for(x=60+r()*80;x<c.w;x+=110+r()*120)d.vents.push({x:x,t:r()*2});
    for(i=1;i<p.length-1;i++)if(r()<.6)d.dots.push({x:p[i][0]+r()*8-4,y:p[i][1]+3+r()*4,r:2+r()*3,c:r()<.4?'#ff8f7a':r()<.6?'#ffd27a':'#8fe0b0'});
    if(typeof Path2D!=='undefined'){P=new Path2D();P.moveTo(p[0][0],H+20);for(i=0;i<p.length;i++)P.lineTo(p[i][0],p[i][1]);P.lineTo(p[p.length-1][0],H+20);P.closePath();d.floorP=P;
      c.arch.forEach(function(a,ai){P=new Path2D();P.moveTo(a.x1,a.y);P.lineTo(a.x2,a.y);P.lineTo(a.x2+8,a.y-18);P.lineTo(a.x2+3,a.y-40);
        for(k=a.x2-6;k>a.x1+4;k-=16)P.lineTo(k,a.y-46-hash(k+ai)*12);P.lineTo(a.x1-3,a.y-40);P.lineTo(a.x1-8,a.y-18);P.closePath();d.archP.push(P)})}
    return d}

  function load(k){n=k;c=getCove(k);s=newSim(c);deco=decorate(c);tgt=WL0;cam=0;dispX=50;acc=0;wetY=WL0;coveT=0;scolded=false;shellN=0;
    bub=[];rings=[];scoldA=c.nests.map(function(){return 0});mode='play';modeT=0;blkT=0;ouch=0;washT=0;dragY0=null}
  function init(a){LANG=a.lang;time=50;moved=false;lowT=0;load(0);wipe=0;
    if(!clouds.length){var i;for(i=0;i<7;i++)clouds.push({x:hash(i)*520-80,y:50+hash(i+9)*120,s:.6+hash(i+3)*.9,v:4+hash(i+5)*7,l:i%2});
      for(i=0;i<46;i++)plank.push({x:hash(i*3)*W,y:hash(i*7)*400,ph:hash(i)*6.28,r:.7+hash(i+40)*1.1})}}

  function surf(xw){var A=1+Math.min(1.6,Math.abs(s.vw)/110);
    return s.wl+A*(2.4*Math.sin(xw*.034+tG*1.7)+1.5*Math.sin(xw*.081-tG*2.4)+.8*Math.sin(xw*.17+tG*3.3))}

  function update(dt,inp,a){
    var i,e,sc,x,y;
    if(inp.down&&inp.y!=null){if(inp.tap||dragY0==null){dragY0=inp.y;tgt0=tgt}tgt=clamp(tgt0+(inp.y-dragY0)*1.15,WT,WB)}else dragY0=null;
    if(inp.up)tgt=clamp(tgt-200*dt,WT,WB);if(inp.dn)tgt=clamp(tgt+200*dt,WT,WB);
    if(Math.abs(tgt-WL0)>12)moved=true;
    if(mode==='play'){
      acc+=dt;while(acc>=1/60){step(s,1/60,tgt);acc-=1/60}
      time-=dt;coveT+=dt;
      for(i=0;i<s.ev.length;i++){e=s.ev[i];x=dispX-cam;y=s.y;
        if(e.k==='shell'){shellN++;sc=c.shells[e.i];a.sfx('coin');a.burst(sc.x-cam,sc.y,'#ffe27a',12);a.pop(sc.x-cam,sc.y-12,'+3','#ffe27a');a.add(3)}
        else if(e.k==='scold'){scolded=true;time-=3;scoldA[e.i]=1.6;ouch=.9;a.sfx('hit');a.shake(5);sc=c.nests[e.i];
          a.burst(sc.x-cam,sc.y-10,'#ffb24a',10);a.pop(clamp(sc.x-cam,40,W-40),sc.y-34,LANG==='ko'?'-3초':'-3s','#ff7a6a')}
        else if(e.k==='sting'){time-=2;ouch=.8;a.beep(160,.18,'sawtooth');a.shake(4);a.burst(x+14,y+4,'#ff9ae0',10);a.pop(x,y-44,LANG==='ko'?'따끔! -2초':'Zap! -2s','#ff9ae0')}
        else if(e.k==='wash'){washT=.7;a.beep(240,.25,'sine');a.beep(330,.3,'triangle');a.pop(x,y-46,LANG==='ko'?'파도가 밀었어요':'Washed back','#dff')}
        else if(e.k==='gc'){a.beep(196,.08,'square')}
        else if(e.k==='go'){a.beep(392,.08,'triangle')}
        else if(e.k==='dock'){mode='dock';modeT=0;bell=0;
          var tb=Math.max(0,Math.round((c.dock/SPD*1.5-coveT)/2)),tot=10+tb+(scolded?0:5);gain={t:tb,n:!scolded,tot:tot+shellN*3};
          a.add(tot);time=Math.min(70,time+14);a.sfx('win');a.burst(x,y-20,'#fff3a0',22);a.burst(c.dock+120-cam,200,'#ffe27a',16);
          a.pop(x,y-52,'+'+tot,'#fff3a0')}}
      s.ev.length=0;
      if(s.blk||!s.afloat){blkT+=dt;if(blkT>.05&&bumpT<=0&&s.blk&&blkT<.1){a.beep(130,.07,'sine');bumpT=.6}}else blkT=0;
      bumpT-=dt;
      if(Math.abs(s.vw)>24){swT-=dt;if(swT<=0){swT=.12;a.beep(170+(WB-s.wl)/(WB-WT)*300,.13,'sine')}}
      if(time<10){lowT-=dt;if(lowT<=0){lowT=1;a.beep(880,.05,'square')}a.tempo(1.35)}else a.tempo(1);
      if(time<=0){time=0;a.over()}
    }else if(mode==='dock'){modeT+=dt;
      if(bell===0){a.beep(1319,.7,'sine');a.beep(2637,.4,'sine');bell=1}
      if(bell===1&&modeT>.5){a.beep(1319,.9,'sine');a.beep(1976,.5,'triangle');bell=2}
      if(modeT>1.9){load(n+1);wipe=1;a.sfx('jump')}}
    lastA=a}

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function sky(g){var gr=g.createLinearGradient(0,0,0,260),i,cl,x;
    gr.addColorStop(0,'#3fa9e0');gr.addColorStop(.55,'#9be0ee');gr.addColorStop(1,'#fff0cc');g.fillStyle=gr;g.fillRect(0,0,W,262);
    gr=g.createRadialGradient(272,96,4,272,96,110);gr.addColorStop(0,'rgba(255,250,210,.95)');gr.addColorStop(.18,'rgba(255,240,170,.55)');gr.addColorStop(1,'rgba(255,240,170,0)');
    g.fillStyle=gr;g.fillRect(150,0,210,220);g.fillStyle='#fffbe0';g.beginPath();g.arc(272,96,17,0,7);g.fill();
    for(i=0;i<clouds.length;i++){cl=clouds[i];x=((cl.x+tG*cl.v-cam*(cl.l?.06:.03))%520+520)%520-90;
      g.fillStyle=cl.l?'rgba(255,255,255,.9)':'rgba(255,255,255,.6)';g.beginPath();
      g.ellipse(x,cl.y,30*cl.s,11*cl.s,0,0,6.3);g.moveTo(x+40*cl.s,cl.y-7*cl.s);g.ellipse(x+20*cl.s,cl.y-7*cl.s,20*cl.s,12*cl.s,0,0,6.3);g.moveTo(x-2*cl.s,cl.y-4*cl.s);g.ellipse(x-18*cl.s,cl.y-4*cl.s,16*cl.s,9*cl.s,0,0,6.3);g.fill()}
    /* 먼 바다와 섬 */
    gr=g.createLinearGradient(0,204,0,262);gr.addColorStop(0,'#58c3d8');gr.addColorStop(1,'#2f9fc0');g.fillStyle=gr;g.fillRect(0,204,W,60);
    for(i=0;i<5;i++){x=((i*170+40-cam*.05)%680+680)%680-160;g.fillStyle='rgba(120,180,205,.75)';g.beginPath();g.moveTo(x,205);
      g.quadraticCurveTo(x+30,170-hash(i)*22,x+70,186);g.quadraticCurveTo(x+100,176-hash(i+2)*16,x+140,205);g.fill()}
    for(i=0;i<4;i++){x=((i*230+120-cam*.12)%690+690)%690-180;g.fillStyle='#5b9bb4';g.beginPath();g.moveTo(x,212);
      g.quadraticCurveTo(x+26,160-hash(i+7)*30,x+62,188);g.quadraticCurveTo(x+84,172,x+118,212);g.fill();
      g.fillStyle='rgba(255,255,255,.5)';g.fillRect(x-4,211,126,1.5)}
    for(i=0;i<16;i++){var tw=Math.sin(tG*2.2+i*1.9);if(tw<.2)continue;x=(i*53+tG*6)%W;
      g.fillStyle='rgba(255,255,240,'+(tw*.8)+')';g.fillRect(x,214+(i*7)%34,5+tw*7,1.4)}}
  function backWall(g){var x,gr=g.createLinearGradient(0,236,0,H),i;gr.addColorStop(0,'#9a95c8');gr.addColorStop(.3,'#6f6ba6');gr.addColorStop(.65,'#4c4a80');gr.addColorStop(1,'#2c2b52');
    g.fillStyle=gr;g.beginPath();g.moveTo(0,H);
    for(x=0;x<=W;x+=12){var xw=x+cam;g.lineTo(x,240+9*Math.sin(xw*.011)+6*Math.sin(xw*.037+2))}g.lineTo(W,H);g.fill();
    g.strokeStyle='rgba(255,236,210,.55)';g.lineWidth=2.5;g.beginPath();for(x=0;x<=W;x+=12){xw=x+cam;g.lineTo(x,241+9*Math.sin(xw*.011)+6*Math.sin(xw*.037+2))}g.stroke();
    for(i=0;i<7;i++){x=((i*97+30-cam*.6)%560+560)%560-60;var vl=26+hash(i+21)*46,sw=Math.sin(tG*1.1+i)*4;g.strokeStyle='rgba(110,200,130,.55)';g.lineWidth=2;g.beginPath();g.moveTo(x,244);g.quadraticCurveTo(x+sw*.4,244+vl*.5,x+sw,244+vl);g.stroke();
      g.fillStyle='rgba(150,225,150,.7)';g.beginPath();g.ellipse(x+sw*.5,244+vl*.55,3.2,1.8,.6,0,7);g.ellipse(x+sw,244+vl,3.2,1.8,-.5,0,7);g.fill()}
    g.strokeStyle='rgba(20,18,50,.16)';g.lineWidth=2;
    for(i=0;i<6;i++){g.beginPath();for(x=0;x<=W;x+=24){xw=x+cam;var yy=296+i*52+8*Math.sin(xw*.013+i*1.7)+4*Math.sin(xw*.05+i);x?g.lineTo(x,yy):g.moveTo(x,yy)}g.stroke()}
    g.fillStyle='rgba(120,200,120,.5)';for(x=-(cam%22);x<W;x+=22){xw=x+cam;if(hash(Math.round(xw/22))<.5)g.fillRect(x,239+9*Math.sin(xw*.011)+6*Math.sin(xw*.037+2),10,3)}
    if(wetY<s.wl-1){g.fillStyle='rgba(16,14,44,.22)';g.fillRect(0,Math.max(wetY,250),W,s.wl-Math.max(wetY,250))}}

  function weed(g,w){var d=w.y-s.wl,f=clamp(1-d/w.len,0,1),nseg=5,sl=w.len/nseg,x=w.x,y=w.y,i,a;
    g.strokeStyle=w.c;g.lineCap='round';g.lineJoin='round';g.lineWidth=w.w;g.beginPath();g.moveTo(x,y+2);
    for(i=0;i<nseg;i++){a=-Math.PI/2+(Math.sin(tG*1.6+w.ph+i*.6)*.26*(1-f)+.14)*(i+1)/nseg*1.6+f*1.5*Math.min(1,(i+1)/nseg*1.7);
      x+=Math.cos(a)*sl;y+=Math.sin(a)*sl;if(y>w.y+1&&f>=1)y=w.y+1;g.lineTo(x,y)}g.stroke()}
  function crab(g,cr,dt){var fy=floorY(c,cr.x),wet=fy>s.wl+6,nx,i;
    if(wet){nx=cr.x+cr.dir*16*dt;if(nx<cr.x0||nx>cr.x1||floorY(c,nx)<=s.wl+6||Math.abs(floorY(c,nx+cr.dir*6)-floorY(c,nx))>7)cr.dir=-cr.dir;else cr.x=nx}
    var x=cr.x,y=floorY(c,x)-5,wg=wet?Math.sin(tG*12+cr.ph):0;
    g.strokeStyle='#c8452f';g.lineWidth=1.6;g.lineCap='round';
    if(wet)for(i=-1;i<=1;i+=2){g.beginPath();g.moveTo(x+i*5,y+1);g.lineTo(x+i*10,y+5+wg*i);g.moveTo(x+i*4,y+2);g.lineTo(x+i*8,y+6-wg*i);g.stroke();
      g.fillStyle='#ef6a4c';g.beginPath();g.arc(x+i*10,y-4+wg,3,0,7);g.fill()}
    g.fillStyle='#ef6a4c';g.beginPath();g.ellipse(x,y,8,5.2,0,0,7);g.fill();g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(x-2,y-2,4,1.8,0,0,7);g.fill();
    if(wet){g.strokeStyle='#ef6a4c';g.beginPath();g.moveTo(x-3,y-4);g.lineTo(x-3,y-8);g.moveTo(x+3,y-4);g.lineTo(x+3,y-8);g.stroke();
      g.fillStyle='#fff';g.beginPath();g.arc(x-3,y-9,2.2,0,7);g.arc(x+3,y-9,2.2,0,7);g.fill();g.fillStyle='#222';g.beginPath();g.arc(x-3+cr.dir*.7,y-9,1,0,7);g.arc(x+3+cr.dir*.7,y-9,1,0,7);g.fill()}
    else{g.strokeStyle='#8a2a1c';g.lineWidth=1.2;g.beginPath();g.moveTo(x-5,y-1);g.lineTo(x-2,y-1);g.moveTo(x+2,y-1);g.lineTo(x+5,y-1);g.stroke()}}
  function jelly(g,j,i){var y=Math.max(j.y,s.wl+16)+Math.sin(tG*1.8+i)*2.5,x=j.x,p=1+Math.sin(tG*3+i)*.08,k,gr;
    gr=g.createRadialGradient(x,y,2,x,y,24);gr.addColorStop(0,'rgba(255,170,235,.45)');gr.addColorStop(1,'rgba(255,170,235,0)');g.fillStyle=gr;g.fillRect(x-24,y-24,48,48);
    g.strokeStyle='rgba(255,190,240,.8)';g.lineWidth=1.4;g.lineCap='round';
    for(k=-2;k<=2;k++){g.beginPath();g.moveTo(x+k*3.4,y);g.quadraticCurveTo(x+k*3.4+Math.sin(tG*2.6+k+i)*4,y+9,x+k*3.4+Math.sin(tG*2.1+k)*3,y+17+(k%2?0:4));g.stroke()}
    g.fillStyle='rgba(255,150,225,.92)';g.beginPath();g.ellipse(x,y,10*p,9/p,0,Math.PI,0);g.lineTo(x+10*p,y+1);g.quadraticCurveTo(x,y+4,x-10*p,y+1);g.fill();
    g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(x-3,y-5,3.6,2,-.5,0,7);g.fill();
    g.fillStyle='#5a2a66';g.beginPath();g.arc(x-3,y-2,1.1,0,7);g.arc(x+3,y-2,1.1,0,7);g.fill()}
  function star(g,x,y,r,rot){var i,a;g.beginPath();for(i=0;i<10;i++){a=rot+i*Math.PI/5;var q=i%2?r*.5:r;g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}g.closePath()}
  function lighthouse(g){var x=c.dock+122,y=326,i,gr;
    g.fillStyle='#e9eef5';g.beginPath();g.moveTo(x-17,y);g.lineTo(x-11,y-120);g.lineTo(x+11,y-120);g.lineTo(x+17,y);g.fill();
    g.fillStyle='#ff6b5e';for(i=0;i<3;i++){var y1=y-12-i*40,y2=y1-20;g.beginPath();g.moveTo(x-17+(y-y1)*.05,y1);g.lineTo(x-17+(y-y2)*.05,y2);g.lineTo(x+17-(y-y2)*.05,y2);g.lineTo(x+17-(y-y1)*.05,y1);g.fill()}
    g.fillStyle='rgba(40,40,80,.16)';g.beginPath();g.moveTo(x+4,y);g.lineTo(x+3,y-120);g.lineTo(x+11,y-120);g.lineTo(x+17,y);g.fill();
    g.fillStyle='#3d4466';g.fillRect(x-15,y-126,30,6);g.fillStyle='#ffe98a';g.fillRect(x-9,y-142,18,16);g.fillStyle='#3d4466';g.beginPath();g.moveTo(x-13,y-142);g.lineTo(x,y-156);g.lineTo(x+13,y-142);g.fill();
    g.fillStyle='#4a3a55';rr(g,x-5,y-22,10,22,4);g.fill();
    var a=tG*1.4,on=mode==='dock'?1:.55;g.save();g.globalCompositeOperation='lighter';
    for(i=0;i<2;i++){var ca=Math.cos(a+i*Math.PI),w=Math.abs(ca);gr=g.createLinearGradient(x,0,x+ca*150,0);gr.addColorStop(0,'rgba(255,240,160,'+(.5*on*w)+')');gr.addColorStop(1,'rgba(255,240,160,0)');
      g.fillStyle=gr;g.beginPath();g.moveTo(x,y-134);g.lineTo(x+ca*150,y-134-34);g.lineTo(x+ca*150,y-134+34);g.fill()}
    gr=g.createRadialGradient(x,y-134,1,x,y-134,26);gr.addColorStop(0,'rgba(255,245,180,.8)');gr.addColorStop(1,'rgba(255,245,180,0)');g.fillStyle=gr;g.fillRect(x-26,y-160,52,52);g.restore()}
  function boat(g,bx,by,tilt,mood,jump){
    var bl=(tG%3.4)<.13||mood==='ouch',fl=Math.sin(tG*6)*3;
    g.save();g.translate(bx,by);g.rotate(tilt);
    g.strokeStyle='#8a5a3a';g.lineWidth=2.2;g.lineCap='round';g.beginPath();g.moveTo(7,-2);g.lineTo(7,-M+1);g.stroke();
    g.fillStyle='#ff5d5d';g.beginPath();g.moveTo(7,-M+1);g.lineTo(18+fl*.4,-M+5+fl*.3);g.lineTo(7,-M+10);g.fill();
    g.fillStyle='#fff';g.beginPath();g.moveTo(-12,-3);g.lineTo(-3,-23);g.lineTo(5,-3);g.fill();g.fillStyle='#dbe6f2';g.beginPath();g.moveTo(-3,-23);g.lineTo(5,-3);g.lineTo(-3,-3);g.fill();
    /* 꼬마 선원 모리 */
    g.save();g.translate(-3,-11-jump);
    if(mood==='cheer'){g.strokeStyle='#ffe2b8';g.lineWidth=3;g.beginPath();g.moveTo(-6,0);g.lineTo(-11,-8);g.moveTo(6,0);g.lineTo(11,-8);g.stroke()}
    g.fillStyle='#ffe9c9';g.beginPath();g.arc(0,0,7.6,0,7);g.fill();
    g.fillStyle='rgba(255,140,140,.55)';g.beginPath();g.arc(-4.4,2.4,1.8,0,7);g.arc(5.6,2.4,1.8,0,7);g.fill();
    g.fillStyle='#2f6fd0';g.beginPath();g.arc(0,-2.5,7.8,Math.PI*1.08,Math.PI*1.92);g.fill();g.fillStyle='#fff';g.fillRect(-7.6,-4.6,15.2,2.2);
    g.fillStyle='#ff5d5d';g.beginPath();g.arc(0,-10.4,1.8,0,7);g.fill();
    var lx=1,ly=0;if(mood==='nervous'){lx=.6;ly=-1.5}
    if(mood==='cheer'){g.strokeStyle='#33264d';g.lineWidth=1.5;g.beginPath();g.arc(-1.4,.2,1.8,Math.PI,0);g.moveTo(5.4,.2);g.arc(3.6,.2,1.8,0,Math.PI,true);g.stroke();
      g.fillStyle='#c0445a';g.beginPath();g.arc(1.2,3.4,2.2,0,Math.PI);g.fill()}
    else if(bl){g.strokeStyle='#33264d';g.lineWidth=1.4;g.beginPath();g.moveTo(-3,0);g.lineTo(0,0);g.moveTo(2.4,0);g.lineTo(5.4,0);g.stroke();
      if(mood==='ouch'){g.beginPath();g.arc(1.2,4.4,1.8,Math.PI,0);g.stroke()}}
    else{g.fillStyle='#fff';g.beginPath();g.arc(-1.4,-.2,2.5,0,7);g.arc(4,-.2,2.5,0,7);g.fill();
      g.fillStyle='#33264d';g.beginPath();g.arc(-1.4+lx,-.2+ly,1.3,0,7);g.arc(4+lx,-.2+ly,1.3,0,7);g.fill();
      g.strokeStyle='#33264d';g.lineWidth=1.2;g.beginPath();
      if(mood==='nervous'){g.moveTo(0,4.2);g.lineTo(1,3.6);g.lineTo(2,4.2);g.lineTo(3,3.6);g.stroke();
        g.fillStyle='#9fe3ff';g.beginPath();g.ellipse(-7.6,-1+((tG*8)%4),1.3,2,0,0,7);g.fill()}
      else if(mood==='grump'){g.arc(1.4,5,1.8,Math.PI*1.15,Math.PI*1.85);g.stroke()}
      else{g.arc(1.4,2.6,1.9,.15*Math.PI,.85*Math.PI);g.stroke()}}
    g.restore();
    g.fillStyle='#ffffff';g.beginPath();g.moveTo(-21,-9);g.lineTo(-9,-3);g.lineTo(9,-3);g.lineTo(21,-9);g.lineTo(11,D);g.lineTo(-11,D);g.closePath();g.fill();
    g.fillStyle='#d5e2f0';g.beginPath();g.moveTo(9,-3);g.lineTo(21,-9);g.lineTo(11,D);g.lineTo(2,D);g.closePath();g.fill();
    g.strokeStyle='#aebcd0';g.lineWidth=1;g.beginPath();g.moveTo(-21,-9);g.lineTo(-9,-3);g.lineTo(9,-3);g.lineTo(21,-9);g.lineTo(11,D);g.lineTo(-11,D);g.closePath();g.moveTo(-9,-3);g.lineTo(-11,D);g.stroke();
    g.restore()}

  function draw(g,a,dt){
    dt=dt||0;tG+=dt;var i,x,y,o,gr,wl=s.wl,cx,bx,by;
    /* 주변 애니메이션 갱신 */
    if(washT>0){washT-=dt;dispX+=(s.x-dispX)*Math.min(1,dt*7)}else dispX+=(s.x-dispX)*Math.min(1,dt*22);
    cx=clamp(dispX-118,0,c.w-W);cam+=(cx-cam)*Math.min(1,dt*6);if(Math.abs(cx-cam)>500)cam=cx;
    if(wl<wetY)wetY=wl;else wetY=Math.min(wl,wetY+7*dt);
    if(ouch>0)ouch-=dt;if(wipe>0)wipe-=dt*1.6;
    for(i=0;i<scoldA.length;i++)if(scoldA[i]>0)scoldA[i]-=dt;
    deco.vents.forEach(function(v){v.t-=dt;if(v.t<=0){v.t=.5+Math.random()*1.6;var fy=floorY(c,v.x);if(fy>s.wl+12&&bub.length<40)bub.push({x:v.x+Math.random()*8-4,y:fy-2,r:1.5+Math.random()*2.4,ph:Math.random()*6})}});
    for(i=bub.length-1;i>=0;i--){o=bub[i];o.y-=(40+o.r*8)*dt;o.x+=Math.sin(tG*4+o.ph)*10*dt;
      if(o.y<=surf(o.x)+1){rings.push({x:o.x,t:0});bub.splice(i,1);
        if(plinkT<=0&&o.x>cam&&o.x<cam+W&&lastA&&mode==='play'&&time>0&&time<70){plinkT=.9+Math.random();lastA.beep(1200+Math.random()*700,.04,'sine')}}}
    plinkT-=dt;

    sky(g);backWall(g);
    g.save();g.translate(-Math.round(cam*2)/2,0);
    var X0=cam-40,X1=cam+W+40;
    /* 배경 구조물 */
    g.fillStyle='#3b3966';
    c.arch.forEach(function(ar){if(ar.x2<X0||ar.x1>X1)return;g.fillRect(ar.x1-9,ar.y-30,13,floorY(c,ar.x1)-ar.y+40);g.fillRect(ar.x2-4,ar.y-30,13,floorY(c,ar.x2)-ar.y+40)});
    c.nests.forEach(function(nn){if(nn.x<X0-20||nn.x>X1+20)return;g.fillStyle='#55528a';g.beginPath();g.moveTo(nn.x-13,H);g.lineTo(nn.x-7,nn.y+6);g.lineTo(nn.x+7,nn.y+6);g.lineTo(nn.x+13,H);g.fill();
      g.fillStyle='rgba(255,255,255,.08)';g.fillRect(nn.x-6,nn.y+6,4,H)});
    c.gates.forEach(function(gt){if(gt.x<X0-40||gt.x>X1+40)return;g.fillStyle='#5b4636';g.fillRect(gt.x-5,gt.yo-26,4,gt.yc-gt.yo+30);g.fillRect(gt.x+gt.w+1,gt.yo-26,4,gt.yc-gt.yo+30);g.fillRect(gt.x-9,gt.yo-30,gt.w+18,6)});
    c.logs.forEach(function(l){if(l.x<X0-40||l.x>X1+40)return;var fy=floorY(c,l.x);g.fillStyle='#5b4636';g.fillRect(l.x-l.w/2-1,l.ry+LT/2,3,fy-l.ry);g.fillRect(l.x+l.w/2-2,l.ry+LT/2,3,fy-l.ry);
      g.fillRect(l.x-l.w/2-4,l.ry+LT/2,9,3);g.fillRect(l.x+l.w/2-5,l.ry+LT/2,9,3);
      g.strokeStyle='rgba(30,30,50,.6)';g.lineWidth=1.5;g.setLineDash([3,3]);g.beginPath();g.moveTo(l.x,logY(l,wl));g.lineTo(l.x+Math.sin(tG+l.x)*2,fy);g.stroke();g.setLineDash([])});
    if(c.dock+200>X0&&c.dock<X1)lighthouse(g);
    /* 바위 */
    if(deco.floorP){gr=g.createLinearGradient(0,300,0,H);gr.addColorStop(0,'#e2bd94');gr.addColorStop(.55,'#b98674');gr.addColorStop(1,'#7c5563');
      g.fillStyle=gr;g.fill(deco.floorP);
      c.arch.forEach(function(ar,ai){if(ar.x2<X0||ar.x1>X1)return;gr=g.createLinearGradient(0,ar.y-56,0,ar.y);gr.addColorStop(0,'#e2bd94');gr.addColorStop(1,'#96687a');g.fillStyle=gr;g.fill(deco.archP[ai]);
        g.strokeStyle='rgba(255,236,200,.7)';g.lineWidth=2;g.beginPath();var k,f=1;for(k=ar.x2-6;k>ar.x1+4;k-=16){f?g.moveTo(k,ar.y-46-hash(k+ai)*12):g.lineTo(k,ar.y-46-hash(k+ai)*12);f=0}g.stroke();
        g.fillStyle='#7ccf6a';for(k=ar.x2-6;k>ar.x1+4;k-=16)g.fillRect(k-4,ar.y-49-hash(k+ai)*12,8,3);
        g.fillStyle='rgba(40,20,60,.28)';g.fillRect(ar.x1,ar.y-5,ar.x2-ar.x1,5)});
      g.strokeStyle='rgba(255,240,205,.75)';g.lineWidth=2.5;g.lineJoin='round';g.beginPath();var p=c.floor;for(i=0;i<p.length;i++){if(p[i][0]<X0-60||p[i][0]>X1+60)continue;g.lineTo(p[i][0],p[i][1]+1)}g.stroke();
      deco.dots.forEach(function(d){if(d.x<X0||d.x>X1)return;g.fillStyle=d.c;g.beginPath();g.arc(d.x,d.y,d.r,0,7);g.fill()});
      /* 젖은 자국 */
      if(wetY<wl-1){g.save();g.clip(deco.floorP);g.fillStyle='rgba(40,20,60,.3)';g.fillRect(X0,wetY,W+80,wl-wetY);g.restore();
        c.arch.forEach(function(ar,ai){if(ar.x2<X0||ar.x1>X1||ar.y<wetY)return;g.save();g.clip(deco.archP[ai]);g.fillStyle='rgba(40,20,60,.3)';g.fillRect(ar.x1-10,wetY,ar.x2-ar.x1+20,wl-wetY);g.restore()})}}
    deco.weeds.forEach(function(w){if(w.x>X0&&w.x<X1)weed(g,w)});
    deco.crabs.forEach(function(cr){if(cr.x>X0&&cr.x<X1)crab(g,cr,dt)});
    /* 둥지와 새 */
    c.nests.forEach(function(nn,ni){if(nn.x<X0-20||nn.x>X1+20)return;var sc=scoldA[ni]>0,fy=sc?-16-Math.abs(Math.sin(tG*14))*6:0,x=nn.x,y=nn.y;
      g.fillStyle='#8a6238';g.beginPath();g.ellipse(x,y+3,13,5,0,0,7);g.fill();g.strokeStyle='#c59a5c';g.lineWidth=1.3;g.beginPath();g.moveTo(x-12,y+1);g.lineTo(x+10,y+5);g.moveTo(x-9,y+5);g.lineTo(x+12,y+1);g.stroke();
      g.fillStyle=sc?'#ff8a4a':'#ffc94a';g.beginPath();g.arc(x,y-5+fy,7,0,7);g.fill();
      if(sc){g.beginPath();g.ellipse(x-9,y-7+fy,6,3,Math.sin(tG*30)*.8,0,7);g.ellipse(x+9,y-7+fy,6,3,-Math.sin(tG*30)*.8,0,7);g.fill()}
      g.fillStyle='#ff7a3a';g.beginPath();g.moveTo(x-7,y-5+fy);g.lineTo(x-12,y-3.5+fy);g.lineTo(x-7,y-2.5+fy);g.fill();
      g.fillStyle='#33264d';g.beginPath();g.arc(x-3,y-7+fy,1.3,0,7);g.fill();
      if(sc){g.strokeStyle='#33264d';g.lineWidth=1.4;g.beginPath();g.moveTo(x-6,y-10.5+fy);g.lineTo(x-1,y-8.6+fy);g.stroke();
        g.fillStyle='#ff5d5d';g.font='16px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('!!',x+2,y-30+fy)}
      /* 수위 경고선 */
      g.strokeStyle='rgba(255,120,90,'+(.35+.25*Math.sin(tG*4))+')';g.lineWidth=1.5;g.setLineDash([4,5]);g.beginPath();g.moveTo(x-34,y);g.lineTo(x+34,y);g.stroke();g.setLineDash([])});
    /* 통나무·수문·부표·부두 */
    c.logs.forEach(function(l){if(l.x<X0-40||l.x>X1+40)return;var ly=logY(l,wl),fl=ly===wl?surf(l.x)-wl:0;g.save();g.translate(l.x,ly+fl);g.rotate(fl*.03);
      g.fillStyle='#a8703f';rr(g,-l.w/2,-LT/2,l.w,LT,6);g.fill();g.fillStyle='#c98e56';rr(g,-l.w/2+2,-LT/2+1.5,l.w-4,4,2);g.fill();
      g.fillStyle='#e3b684';g.beginPath();g.ellipse(l.w/2-3,0,3,LT/2-1,0,0,7);g.fill();g.strokeStyle='#a8703f';g.lineWidth=1;g.beginPath();g.ellipse(l.w/2-3,0,1.4,3,0,0,7);g.stroke();
      g.strokeStyle='rgba(80,45,20,.5)';g.beginPath();g.moveTo(-12,1);g.lineTo(-2,1);g.moveTo(2,3.5);g.lineTo(10,3.5);g.stroke();g.restore()});
    c.gates.forEach(function(gt,gi){if(gt.x<X0-50||gt.x>X1+50)return;var gy=s.gy[gi],cl=s.gt[gi],sx=gt.x-24,k;
      g.fillStyle='#9a6a3e';g.fillRect(gt.x,gy-112,gt.w,112);g.fillStyle='#c08a55';g.fillRect(gt.x+1,gy-112,2.5,112);
      g.fillStyle='rgba(60,35,20,.4)';for(k=gy-100;k<gy-4;k+=22)g.fillRect(gt.x,k,gt.w,1.5);g.fillStyle='#59607a';g.fillRect(gt.x-1,gy-5,gt.w+2,5);
      /* 부표 센서 */
      g.fillStyle='#5b4636';g.fillRect(sx-1,gt.S-34,2.5,floorY(c,sx)-gt.S+34);
      g.fillStyle=cl?'#ff5d5d':'#58e08a';g.beginPath();g.arc(sx,gt.S-38,4.5,0,7);g.fill();
      if(cl){gr=g.createRadialGradient(sx,gt.S-38,1,sx,gt.S-38,13);gr.addColorStop(0,'rgba(255,90,90,.6)');gr.addColorStop(1,'rgba(255,90,90,0)');g.fillStyle=gr;g.fillRect(sx-13,gt.S-51,26,26)}
      g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.5;g.setLineDash([3,4]);g.beginPath();g.moveTo(sx-10,gt.S);g.lineTo(gt.x+gt.w+4,gt.S);g.stroke();g.setLineDash([]);
      var cy=clamp(wl,gt.S-8,gt.S+40);g.fillStyle='#d9a25e';rr(g,sx-7,cy-7,14,12,2);g.fill();g.strokeStyle='#8a5a3a';g.lineWidth=1.2;g.strokeRect(sx-6,cy-6,12,10);g.beginPath();g.moveTo(sx-6,cy-6);g.lineTo(sx+6,cy+4);g.stroke()});
    c.buoys.forEach(function(b){if(b<X0||b>X1)return;var yy=surf(b),on=s.x>=b,tl=Math.sin(tG*2+b)*.12;
      g.strokeStyle='rgba(30,30,50,.35)';g.lineWidth=1;g.beginPath();g.moveTo(b,yy);g.lineTo(b,floorY(c,b));g.stroke();
      g.save();g.translate(b,yy);g.rotate(tl);g.fillStyle=on?'#58e08a':'#ff7a5e';g.beginPath();g.moveTo(-6,3);g.lineTo(-4,-9);g.lineTo(4,-9);g.lineTo(6,3);g.fill();
      g.fillStyle='#fff';g.fillRect(-5,-4,10,3);g.fillStyle=on?'#eaffef':'#ffe9a0';g.beginPath();g.arc(0,-11,2.4,0,7);g.fill();g.restore()});
    if(c.dock+70>X0&&c.dock<X1){y=surf(c.dock+36);g.fillStyle='#5b4636';g.fillRect(c.dock+24,y-16,3,floorY(c,c.dock+24)-y+16);
      g.fillStyle='#c08a55';rr(g,c.dock+18,y-6,40,8,2);g.fill();g.fillStyle='#9a6a3e';for(i=0;i<4;i++)g.fillRect(c.dock+27+i*9,y-6,1.2,8)}
    c.jel.forEach(function(j,ji){if(j.x>X0&&j.x<X1)jelly(g,j,ji)});
    /* 별 조개 */
    c.shells.forEach(function(sh,si){if(s.got[si]||sh.x<X0||sh.x>X1)return;var yy=sh.y+Math.sin(tG*2.4+si)*2.5;
      gr=g.createRadialGradient(sh.x,yy,1,sh.x,yy,16);gr.addColorStop(0,'rgba(255,240,150,.55)');gr.addColorStop(1,'rgba(255,240,150,0)');g.fillStyle=gr;g.fillRect(sh.x-16,yy-16,32,32);
      g.fillStyle='#ffd84a';star(g,sh.x,yy,8,tG*.8+si);g.fill();g.fillStyle='#fff6c0';star(g,sh.x,yy,4,tG*.8+si);g.fill();
      g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1;g.beginPath();g.arc(sh.x,yy,11,0,7);g.stroke()});
    /* 배 */
    bx=dispX;var afl=s.afloat&&washT<=0,sy=surf(bx);by=s.afloat?sy:s.y;
    var tilt=s.afloat?Math.atan((surf(bx+8)-surf(bx-8))/16)*.9:(s.onLog||s.pin?0:clamp(Math.atan((floorY(c,bx+12)-floorY(c,bx-12))/24),-.5,.5));
    var mood='happy',cl2=ceilAt(s,s.x-HW,s.x+HW+46);
    if(mode==='dock')mood='cheer';else if(ouch>0)mood='ouch';else if(cl2>s.y-M-24)mood='nervous';else if(blkT>.5)mood='grump';
    if(afl&&s.vx>20){g.fillStyle='rgba(255,255,255,.5)';for(i=0;i<3;i++){o=((tG*1.6+i*.33)%1);g.beginPath();g.arc(bx-20-o*16,surf(bx-20-o*16)+1,2.2*(1-o),0,7);g.fill()}}
    g.fillStyle='rgba(20,30,60,.14)';g.beginPath();g.ellipse(bx,by+D+1,18,3,0,0,7);g.fill();
    boat(g,bx,by,tilt,mood,mode==='dock'?Math.abs(Math.sin(modeT*9))*5:0);
    if(washT>0){g.strokeStyle='rgba(255,255,255,'+washT+')';g.lineWidth=3;g.beginPath();g.arc(bx+16,by-2,14,-1.9,.6);g.stroke()}
    /* 물 */
    gr=g.createLinearGradient(0,wl-6,0,H);gr.addColorStop(0,'rgba(92,214,220,.46)');gr.addColorStop(.35,'rgba(40,150,200,.56)');gr.addColorStop(1,'rgba(18,56,128,.8)');
    g.fillStyle=gr;g.beginPath();g.moveTo(cam-4,H);for(x=cam-4;x<=cam+W+6;x+=6)g.lineTo(x,surf(x));g.lineTo(cam+W+6,H);g.fill();
    g.save();g.globalCompositeOperation='lighter';
    for(i=0;i<5;i++){x=cam+((i*83+tG*5-cam*.3)%440+440)%440-40+Math.sin(tG*.5+i)*8;var sw=14+hash(i)*16,al=.07+.04*Math.sin(tG*.9+i*2);
      gr=g.createLinearGradient(0,wl,0,H);gr.addColorStop(0,'rgba(210,255,240,'+al+')');gr.addColorStop(1,'rgba(210,255,240,0)');g.fillStyle=gr;
      g.beginPath();g.moveTo(x,wl);g.lineTo(x+sw,wl);g.lineTo(x+sw-60,H);g.lineTo(x-90,H);g.fill()}
    if(deco.floorP){g.save();g.clip(deco.floorP);for(x=Math.floor(cam/11)*11;x<cam+W+11;x+=11){var fy=floorY(c,x);if(fy<wl+3)continue;
        var ci=(.5+.5*Math.sin(x*.07+tG*1.9))*(.5+.5*Math.sin(x*.031-tG*1.3)+.3*Math.sin(x*.19+tG*2.7));if(ci<.12)continue;
        g.fillStyle='rgba(190,255,235,'+Math.min(.3,ci*.3)+')';g.beginPath();g.ellipse(x,fy+5,9,4+ci*5,0,0,7);g.fill()}g.restore()}
    g.restore();
    for(i=0;i<plank.length;i++){o=plank[i];x=cam+((o.x+tG*9-cam*.35)%W+W)%W;y=wl+14+((o.y+Math.sin(tG*.7+o.ph)*14)%Math.max(30,H-wl-20));
      g.fillStyle='rgba(225,255,245,'+(.25+.2*Math.sin(tG*2+o.ph))+')';g.beginPath();g.arc(x,y,o.r,0,7);g.fill()}
    g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1;g.fillStyle='rgba(255,255,255,.18)';
    bub.forEach(function(b){g.beginPath();g.arc(b.x,b.y,b.r,0,7);g.fill();g.stroke()});
    for(i=rings.length-1;i>=0;i--){o=rings[i];o.t+=dt;if(o.t>.5){rings.splice(i,1);continue}g.strokeStyle='rgba(255,255,255,'+(1-o.t*2)+')';g.beginPath();g.ellipse(o.x,surf(o.x),2+o.t*16,1+o.t*4,0,0,7);g.stroke()}
    /* 소용돌이 */
    c.whirls.forEach(function(w,wi){if(w.x2<X0||w.x1>X1)return;var st=s.ws[wi],xm=(w.x1+w.x2)/2,hw=(w.x2-w.x1)/2,k;
      g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=1.5;g.setLineDash([2,6]);g.beginPath();g.moveTo(w.x1,w.wy);g.lineTo(w.x2,w.wy);g.stroke();g.setLineDash([]);
      g.strokeStyle='rgba(255,255,255,.55)';g.beginPath();for(k=0;k<26;k++){var aa=k*.5+tG*(st>0?5:1);g.lineTo(w.x1+10+Math.cos(aa)*k*.28,w.wy-9+Math.sin(aa)*k*.28)}g.stroke();
      if(st>0.02){var ys=surf(xm);gr=g.createLinearGradient(0,ys,0,ys+70*st);gr.addColorStop(0,'rgba(10,40,110,'+(.5*st)+')');gr.addColorStop(1,'rgba(10,40,110,0)');
        g.fillStyle=gr;g.beginPath();g.moveTo(xm-hw,ys);g.quadraticCurveTo(xm,ys+10,xm-3,ys+70*st);g.lineTo(xm+3,ys+70*st);g.quadraticCurveTo(xm,ys+10,xm+hw,ys);g.fill();
        for(k=0;k<5;k++){var ph=(tG*1.5+k/5)%1,rx=hw*(1-ph)*.95,yy=ys+3+ph*46*st;g.strokeStyle='rgba(255,255,255,'+(st*.8*(1-ph))+')';g.lineWidth=1.6;
          g.beginPath();g.ellipse(xm,yy,rx,2+rx*.12,0,tG*6+k,tG*6+k+4.2);g.stroke()}
        g.fillStyle='rgba(255,255,255,'+(st*.8)+')';g.font='15px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('‹ ‹ ‹',xm-((tG*30)%14),ys-12)}});
    /* 수면선 */
    g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=2;g.beginPath();for(x=cam-4;x<=cam+W+6;x+=6)g.lineTo(x,surf(x));g.stroke();
    g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=1.5;g.beginPath();for(x=cam-4;x<=cam+W+6;x+=6)g.lineTo(x,surf(x+30)+5);g.stroke();
    for(i=0;i<9;i++){x=cam+((i*47+tG*14-cam*.2)%W+W)%W;var tw=Math.sin(tG*3+i*2.1);if(tw>.3){g.fillStyle='rgba(255,255,235,'+tw*.9+')';g.fillRect(x,surf(x)-1.5,4+tw*5,2)}}
    g.restore();

    /* ---- HUD ---- */
    g.fillStyle='rgba(20,30,70,.35)';rr(g,12,36,W-24,8,4);g.fill();var tf=clamp(time/70,0,1);
    if(tf>0){g.fillStyle=time<10?(Math.sin(tG*10)>0?'#ff6b5e':'#ffb0a0'):'#fff3a0';rr(g,12,36,Math.max(8,(W-24)*tf),8,4);g.fill()}
    g.font='15px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='rgba(20,30,70,.75)';g.fillText((LANG==='ko'?'만 ':'Cove ')+(n+1),15,63.5);g.fillStyle='#fff';g.fillText((LANG==='ko'?'만 ':'Cove ')+(n+1),14,62);
    g.textAlign='right';g.fillStyle='rgba(20,30,70,.5)';g.fillText(Math.ceil(time)+(LANG==='ko'?'초':'s'),W-13,63);g.fillStyle=time<10?'#ffd0c8':'#fff';g.fillText(Math.ceil(time)+(LANG==='ko'?'초':'s'),W-14,62);
    /* 조수 게이지 */
    g.fillStyle='rgba(255,255,255,.22)';rr(g,5,WT,5,WB-WT,2.5);g.fill();g.fillStyle='rgba(120,230,235,.8)';rr(g,5,wl,5,WB-wl+2,2.5);g.fill();
    g.fillStyle='#fff';g.beginPath();g.moveTo(12,tgt);g.lineTo(20,tgt-5);g.lineTo(20,tgt+5);g.fill();
    if(Math.abs(tgt-wl)>4){g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=1;g.setLineDash([3,6]);g.beginPath();g.moveTo(22,tgt);g.lineTo(W,tgt);g.stroke();g.setLineDash([])}
    /* 힌트 */
    if(c.tip&&mode==='play'&&(n===0||coveT<7)){var al2=n===0?1:clamp(7-coveT,0,1),tx=c.tip[LANG];g.globalAlpha=al2;g.font='17px Jua, system-ui, sans-serif';g.textAlign='center';
      var tw2=g.measureText(tx).width+26;g.fillStyle='rgba(20,36,90,.5)';rr(g,W/2-tw2/2,76,tw2,30,15);g.fill();g.fillStyle='#fff';g.fillText(tx,W/2,97);g.globalAlpha=1}
    if(n===0&&!moved&&mode==='play'){var hy=Math.sin(tG*2.4)*26;g.fillStyle='rgba(255,255,255,.9)';g.strokeStyle='rgba(20,36,90,.45)';g.lineWidth=2;
      x=W-58;y=180;g.beginPath();g.moveTo(x,y-44);g.lineTo(x-9,y-32);g.lineTo(x+9,y-32);g.closePath();g.fill();g.stroke();g.beginPath();g.moveTo(x,y+44);g.lineTo(x-9,y+32);g.lineTo(x+9,y+32);g.closePath();g.fill();g.stroke();
      g.beginPath();g.arc(x,y+hy,9,0,7);g.fill();g.stroke()}
    if(mode==='dock'&&gain){g.font='20px Jua, system-ui, sans-serif';g.textAlign='center';var ln=[(LANG==='ko'?'등대 도착! ':'Docked! ')+'+'+gain.tot];
      if(gain.t>0)ln.push((LANG==='ko'?'빠른 항해 +':'Swift +')+gain.t);if(gain.n)ln.push((LANG==='ko'?'새가 편안했어요 +5':'Happy bird +5'));
      g.fillStyle='rgba(20,36,90,.5)';rr(g,W/2-110,118,220,20+ln.length*24,16);g.fill();
      ln.forEach(function(t,i){g.font=(i?16:21)+'px Jua, system-ui, sans-serif';g.fillStyle=i?'#dff7ff':'#fff3a0';g.fillText(t,W/2,146+i*24)})}
    if(wipe>0){g.fillStyle='rgba(235,252,255,'+clamp(wipe,0,1)+')';g.fillRect(0,0,W,H)}
  }

  window.__tideLift=function(){return {tgt:tgt,want:botTgt(s),n:n,x:s.x,wl:s.wl,time:time,dock:c.dock,blk:s.blk,mode:mode,gy:s.gy,y:s.y}};
  SG.run({id:'tide-lift',title:{ko:'밀물 썰물',en:'Tide Lift'},
    how:{ko:'위아래로 끌어(또는 ↑↓) 바다 높이를 바꿔요. 종이배는 물에 뜨면 스스로 흘러가요. 등대까지!',
         en:'Drag up/down (or ↑↓) to move the sea level. The paper boat drifts whenever it floats. Reach the lighthouse!'},
    init:init,update:update,draw:draw});
})();
