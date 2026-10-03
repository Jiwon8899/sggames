/* 한붓 굴리기 (One Stroke) — 선 하나를 그리면 잉크가 굳고, 잠꾸러기 몽이가 굴러 별까지 간다.
   물리(원 vs 두꺼운 선분)는 DOM 없이도 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,R=13,LR=3,G=1000,VMAX=900,MR=7,MW=26,STAR=17,TOP=72;

  /* ---------- 레벨 데이터 ----------
     plats:[ax,ay,bx,by,r]  mush:[x,y,각도(+면 오른쪽으로 튕김),세기]  fans:[x,y,w,h,fx,fy]  nod:[x,y,w,h] */
  var LEVELS=[
    {ink:430,ball:[58,150],star:[296,484],plats:[[30,178,96,194,5]],hint:[[90,262],[284,500]],
      tip:{ko:'선 하나로 별까지!',en:'One line to the star!'}},
    {ink:190,ball:[50,170],star:[316,262],plats:[[24,196,120,222,5],[236,268,340,290,5],[346,236,346,292,5]],
      tip:{ko:'끊긴 길을 이어 주세요',en:'Bridge the gap'}},
    {ink:150,ball:[44,100],star:[318,454],plats:[[24,118,78,134,5],[244,478,348,478,5],[350,330,350,478,5]],
      tip:{ko:'잉크가 모자라요… 휘어 보세요',en:'Short on ink… try a curve'}},
    {ink:260,ball:[50,270],star:[258,203],plats:[[24,296,90,312,5]],mush:[[290,548,-.3,800]],
      tip:{ko:'버섯은 통통!',en:'Mushrooms bounce!'}},
    {ink:220,ball:[50,130],star:[322,555],plats:[[24,156,90,172,5],[250,562,340,582,5],[346,500,346,584,5]],nod:[[150,TOP,70,H-TOP]],
      tip:{ko:'빗금에는 잉크가 안 묻어요',en:'Ink won\'t stick on hatching'}},
    {ink:240,ball:[50,330],star:[268,140],plats:[[24,356,90,372,5],[312,200,312,520,5]],fans:[[226,240,80,360,0,-2300]],
      tip:{ko:'바람을 타요!',en:'Ride the wind!'}},
    {ink:140,ball:[50,110],star:[285,560],plats:[[24,136,200,236,5],[226,516,270,584,5],[344,516,300,584,5]],
      tip:{ko:'선은 벽도 돼요',en:'A line can be a wall'}},
    {ink:330,ball:[50,120],star:[52,520],plats:[[24,146,96,160,5],[20,290,190,318,5]],
      tip:{ko:'방향을 돌려요',en:'Turn it around'}},
    {ink:170,ball:[40,120],star:[312,440],plats:[[20,146,66,156,5]],fans:[[20,330,160,90,1500,0]],nod:[[184,TOP,176,H-TOP]],
      tip:{ko:'바람 속 활주로',en:'A runway in the wind'}},
    {ink:200,ball:[50,250],star:[292,112],ty:606,plats:[[24,276,90,292,5],[196,122,196,330,5],[196,122,318,86,5],[318,86,318,300,5]],mush:[[318,548,-.3,800]],
      fans:[[201,90,112,240,0,-2300]],nod:[[150,TOP,40,H-TOP]],
      tip:{ko:'전부 다 써 봐요!',en:'Use everything!'}}
  ];

  function closest(ax,ay,bx,by,px,py){var dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l>0?((px-ax)*dx+(py-ay)*dy)/l:0;
    t=t<0?0:t>1?1:t;return [ax+dx*t,ay+dy*t]}
  function mushSeg(m){var c=Math.cos(m[2])*MW,s=Math.sin(m[2])*MW;return [m[0]-c,m[1]-s,m[0]+c,m[1]+s]}

  function getLevel(n){
    var b=LEVELS[n%LEVELS.length],c=Math.floor(n/LEVELS.length),mir=c%2===1;
    function fx(x){return mir?W-x:x}
    var L={n:n,base:n%LEVELS.length,cyc:c,ink:Math.round(b.ink*Math.max(.8,1-.07*c)),
      ball:[fx(b.ball[0]),b.ball[1]],star:[fx(b.star[0]),b.star[1]],
      plats:(b.plats||[]).map(function(p){return [fx(p[0]),p[1],fx(p[2]),p[3],p[4]]}),
      mush:(b.mush||[]).map(function(m){return [fx(m[0]),m[1],mir?-m[2]:m[2],m[3]||720]}),
      fans:(b.fans||[]).map(function(f){return [mir?W-f[0]-f[2]:f[0],f[1],f[2],f[3],mir?-f[4]:f[4],f[5]]}),
      nod:(b.nod||[]).map(function(z){return [mir?W-z[0]-z[2]:z[0],z[1],z[2],z[3]]}),
      hint:c===0&&b.hint?b.hint:null,tip:c===0?b.tip:null,ty:b.ty||92};
    /* 공을 가장 가까운 발판 위에 정확히 앉힌다 */
    var best=1e9,bp=null,br=0;L.plats.forEach(function(p){var q=closest(p[0],p[1],p[2],p[3],L.ball[0],L.ball[1]),
      d=Math.hypot(q[0]-L.ball[0],q[1]-L.ball[1]);if(d<best){best=d;bp=q;br=p[4]}});
    if(bp&&best>0){var k=(R+br+.01)/best;L.ball=[bp[0]+(L.ball[0]-bp[0])*k,bp[1]+(L.ball[1]-bp[1])*k]}
    return L}

  /* ---------- 선 긋기 ---------- */
  function newStroke(){return {pieces:[],cur:null,used:0,full:false,px:null,py:null}}
  function blocked(L,x,y){var i,p,q;
    for(i=0;i<L.nod.length;i++){p=L.nod[i];if(x>p[0]&&x<p[0]+p[2]&&y>p[1]&&y<p[1]+p[3])return true}
    if(Math.hypot(x-L.ball[0],y-L.ball[1])<R+LR+2)return true;
    for(i=0;i<L.plats.length;i++){p=L.plats[i];q=closest(p[0],p[1],p[2],p[3],x,y);if(Math.hypot(x-q[0],y-q[1])<p[4]+LR)return true}
    for(i=0;i<L.mush.length;i++){p=mushSeg(L.mush[i]);q=closest(p[0],p[1],p[2],p[3],x,y);if(Math.hypot(x-q[0],y-q[1])<MR+LR+2)return true}
    return false}
  function inkPoint(st,L,x,y){
    if(st.full)return;
    if(blocked(L,x,y)){st.cur=null;return}
    if(!st.cur){st.cur=[[x,y]];st.pieces.push(st.cur);return}
    var p=st.cur[st.cur.length-1],d=Math.hypot(x-p[0],y-p[1]);if(d<6)return;
    if(st.used+d>=L.ink){var f=(L.ink-st.used)/d;x=p[0]+(x-p[0])*f;y=p[1]+(y-p[1])*f;d*=f;st.full=true;if(d<.5){st.used=L.ink;return}}
    st.cur.push([x,y]);st.used+=d}
  function strokeTo(st,L,x,y){
    x=x<4?4:x>W-4?W-4:x;y=y<TOP?TOP:y>H-8?H-8:y;
    if(st.px==null)inkPoint(st,L,x,y);
    else{var d=Math.hypot(x-st.px,y-st.py),n=Math.ceil(d/3),i;for(i=1;i<=n;i++)inkPoint(st,L,st.px+(x-st.px)*i/n,st.py+(y-st.py)*i/n)}
    st.px=x;st.py=y}

  /* ---------- 물리 ---------- */
  function makeSim(L,pieces){
    var segs=[];
    L.plats.forEach(function(p){segs.push({ax:p[0],ay:p[1],bx:p[2],by:p[3],r:p[4],k:0})});
    L.mush.forEach(function(m,i){var q=mushSeg(m);
      segs.push({ax:q[0],ay:q[1],bx:q[2],by:q[3],r:MR,k:1,i:i,ux:Math.sin(m[2]),uy:-Math.cos(m[2]),pow:m[3]})});
    (pieces||[]).forEach(function(p){for(var j=0;j<p.length-1;j++)segs.push({ax:p[j][0],ay:p[j][1],bx:p[j+1][0],by:p[j+1][1],r:LR,k:2})});
    return {L:L,segs:segs,x:L.ball[0],y:L.ball[1],vx:0,vy:0,ang:0,av:0,t:0,still:0,acc:0,st:'run',why:'',ev:[],inFan:false}}
  function tick(s){
    var h=1/960,L=s.L,k,i,sg,q,dx,dy,d,lim,nx,ny,vn,vt,e,out,f,sp,touch=false;s.inFan=false;
    for(k=0;k<8&&s.st==='run';k++){
      for(i=0;i<L.fans.length;i++){f=L.fans[i];
        if(s.x>f[0]&&s.x<f[0]+f[2]&&s.y>f[1]&&s.y<f[1]+f[3]){s.vx+=f[4]*h;s.vy+=f[5]*h;s.inFan=true}}
      s.vy+=G*h;sp=Math.hypot(s.vx,s.vy);if(sp>VMAX){s.vx*=VMAX/sp;s.vy*=VMAX/sp}
      s.x+=s.vx*h;s.y+=s.vy*h;
      for(i=0;i<s.segs.length;i++){sg=s.segs[i];
        q=closest(sg.ax,sg.ay,sg.bx,sg.by,s.x,s.y);dx=s.x-q[0];dy=s.y-q[1];d=Math.hypot(dx,dy);lim=R+sg.r;
        if(d>=lim)continue;
        if(d>1e-6){nx=dx/d;ny=dy/d}else{nx=0;ny=-1}
        s.x+=nx*(lim-d);s.y+=ny*(lim-d);vn=s.vx*nx+s.vy*ny;touch=true;
        if(vn<0){
          if(sg.k===1&&nx*sg.ux+ny*sg.uy>.3){out=Math.max(-vn*.9,sg.pow);s.vx+=nx*(out-vn);s.vy+=ny*(out-vn);
            s.ev.push({t:'m',i:sg.i,nx:nx,ny:ny,v:out})}
          else{e=-vn>70?.2:0;if(-vn>130)s.ev.push({t:'h',nx:nx,ny:ny,v:-vn});
            s.vx-=(1+e)*vn*nx;s.vy-=(1+e)*vn*ny;
            vt=-s.vx*ny+s.vy*nx;f=Math.min(Math.abs(vt),.04*-vn*(1+e));f=(vt>0?-f:f);s.vx+=-ny*f;s.vy+=nx*f}
          vt=-s.vx*ny+s.vy*nx;s.av=vt/R}
        s.vx*=1-.25*h;s.vy*=1-.25*h}
      dx=s.x-L.star[0];dy=s.y-L.star[1];if(dx*dx+dy*dy<(R+STAR)*(R+STAR)){s.st='win';break}}
    s.ang+=s.av/120;if(!touch)s.av*=.995;
    s.t+=1/120;
    if(s.st!=='run')return;
    if(Math.hypot(s.vx,s.vy)<12)s.still+=1/120;else s.still=0;
    if(s.y>H+30||s.x<-30||s.x>W+30){s.st='fail';s.why='fall'}
    else if(s.still>=2){s.st='fail';s.why='stuck'}
    else if(s.t>=6){s.st='fail';s.why='time'}}
  function advance(s,dt){s.acc+=dt;var n=0;while(s.acc>=1/120&&s.st==='run'&&n<8){tick(s);s.acc-=1/120;n++}if(n>=8)s.acc=0}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={LEVELS:LEVELS,getLevel:getLevel,newStroke:newStroke,strokeTo:strokeTo,makeSim:makeSim,tick:tick,advance:advance,W:W,H:H,R:R};
  if(typeof SG==='undefined')return;

  /* ---------- 게임 ---------- */
  var lvN,L,st,sim,mode,modeT,time,tries,streak,tG=0,drawing,prevDown,cur,kbOn,inkTick,squash,sqN,mushT,initAt=0,
      cheer,wake,lastGain,clouds,motes,paper=null,warned;
  var keys={l:false,r:false,u:false,d:false,sp:false,spAt:0};
  if(!window.__oneStrokeKeys){window.__oneStrokeKeys=true;
    var kf=function(e,v){var c=e.code;
      if(c==='ArrowLeft'||c==='KeyA')keys.l=v;else if(c==='ArrowRight'||c==='KeyD')keys.r=v;
      else if(c==='ArrowUp'||c==='KeyW')keys.u=v;else if(c==='ArrowDown'||c==='KeyS')keys.d=v;
      else if(c==='Space'){if(v&&!e.repeat){keys.sp=true;keys.spAt=performance.now()}else if(!v)keys.sp=false}}
    window.addEventListener('keydown',function(e){kf(e,true)});
    window.addEventListener('keyup',function(e){kf(e,false)});
    window.addEventListener('blur',function(){keys.l=keys.r=keys.u=keys.d=keys.sp=false})}

  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function load(n){lvN=n;L=getLevel(n);st=newStroke();sim=null;mode='draw';modeT=0;tries=0;drawing=null;cheer=0;wake=0;squash=0;mushT=[];
    cur.x=Math.max(20,Math.min(W-20,L.ball[0]+(L.ball[0]<W/2?44:-44)));cur.y=L.ball[1]+70}

  function init(a){
    time=45;streak=0;prevDown=true;kbOn=false;inkTick=0;lastGain=0;warned=0;cur={x:120,y:240};initAt=performance.now();
    clouds=[];for(var i=0;i<4;i++)clouds.push({x:hash(i+1)*W,y:96+hash(i+9)*300,s:.6+hash(i+5)*.7,v:5+hash(i+3)*9});
    motes=[];for(i=0;i<16;i++)motes.push({x:hash(i+20)*W,y:hash(i+40)*H,p:hash(i+60)*6.28,v:6+hash(i+80)*10});
    load(0);a.tempo(1)}

  function finish(a){drawing=null;tries++;sim=makeSim(L,st.pieces);mode='sim';modeT=0;wake=.5;a.sfx('jump')}
  function fail(a){mode='wipe';modeT=0;streak=0;a.beep(196,.16,'sine');a.beep(147,.22,'sine')}

  function update(dt,inp,a){
    var ko=a.lang==='ko',fresh=inp.down&&!prevDown,penK=keys.sp&&keys.spAt>initAt+30,i;
    if(mode!=='clear'){time-=dt;
      if(time<=0){time=0;a.over();return}
      if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(880,.05,'square')}}
    if(keys.l||keys.r||keys.u||keys.d||penK)kbOn=true;if(inp.down)kbOn=false;
    if(mode==='draw'){
      var sp=170*dt;if(keys.l)cur.x-=sp;if(keys.r)cur.x+=sp;if(keys.u)cur.y-=sp;if(keys.d)cur.y+=sp;
      cur.x=Math.max(6,Math.min(W-6,cur.x));cur.y=Math.max(TOP,Math.min(H-10,cur.y));
      var u0=st.used;
      if(!drawing){
        if(fresh&&inp.x!=null){drawing='p';st=newStroke();strokeTo(st,L,inp.x,inp.y)}
        else if(penK&&!keys.used){drawing='k';keys.used=true;st=newStroke();strokeTo(st,L,cur.x,cur.y)}}
      else if(drawing==='p'){if(inp.down&&inp.x!=null)strokeTo(st,L,inp.x,inp.y);else finish(a)}
      else if(drawing==='k'){if(penK)strokeTo(st,L,cur.x,cur.y);else finish(a)}
      if(st.used>u0){inkTick+=st.used-u0;if(inkTick>16){inkTick=0;a.beep(700+Math.random()*700,.018,'sawtooth')}
        if(st.full)a.beep(240,.12,'square')}
    }else if(mode==='sim'){
      modeT+=dt;wake=Math.max(0,wake-dt);advance(sim,dt);
      for(i=0;i<sim.ev.length;i++){var e=sim.ev[i];
        if(e.t==='m'){mushT[e.i]=1;squash=1;sqN=[e.nx,e.ny];a.sfx('jump');a.burst(sim.x,sim.y+R,'#ffe9e2',8)}
        else{squash=Math.min(1,e.v/500);sqN=[e.nx,e.ny];a.beep(110+e.v*.12,.07,'triangle');if(e.v>420)a.shake(4)}}
      sim.ev.length=0;
      if(sim.st==='win'){
        var left=1-st.used/L.ink,ink=Math.round(15*left),first=tries===1?5:0,mult=1+.5*Math.min(streak,4),
            pts=Math.round((10+ink+first)*mult);
        if(first)streak++;a.add(pts);time=Math.min(60,time+12);lastGain=1;
        mode='clear';modeT=0;cheer=1;a.sfx('win');a.beep(1568,.25,'sine');a.beep(2093,.4,'sine');
        ['#ffd23f','#ff7a8a','#6fc3ff','#8be28b','#c79bff'].forEach(function(c){a.burst(L.star[0],L.star[1],c,9)});
        a.pop(L.star[0],L.star[1]-30,'+'+pts,'#ff8a3d');
        if(first&&streak>1)a.pop(L.star[0],L.star[1]-54,(ko?'한 번에! x':'First try! x')+mult.toFixed(1),'#7a5cff');
        else if(first)a.pop(L.star[0],L.star[1]-54,ko?'한 번에!':'First try!','#7a5cff');
        a.tempo(1+Math.min(.5,(lvN+1)*.03))}
      else if(sim.st==='fail')fail(a);
      else if(modeT>.35&&(fresh||(penK&&!keys.used))){keys.used=true;fail(a)}
    }else if(mode==='clear'){modeT+=dt;if(modeT>1.05)load(lvN+1)}
    else if(mode==='wipe'){modeT+=dt;if(modeT>.4){st=newStroke();sim=null;mode='draw';modeT=0}}
    if(!keys.sp)keys.used=false;
    prevDown=inp.down}

  /* ---------- 그리기 ---------- */
  var INK='#34406e';
  function cray(g,pts,col,w,seed,alpha){
    if(pts.length<2)return;var i,p;
    g.lineCap='round';g.lineJoin='round';g.strokeStyle=col;
    g.globalAlpha=alpha*.85;g.lineWidth=w;g.beginPath();
    for(i=0;i<pts.length;i++){p=pts[i];if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])}g.stroke();
    g.globalAlpha=alpha*.55;
    for(i=0;i<pts.length-1;i++){var a0=pts[i],b0=pts[i+1],h1=hash(seed+i*3.1),h2=hash(seed+i*7.7);
      g.lineWidth=w*(.35+h1*.75);g.beginPath();g.moveTo(a0[0]+(h1-.5)*2.4,a0[1]+(h2-.5)*2.4);
      g.lineTo(b0[0]+(h2-.5)*2.4,b0[1]+(h1-.5)*2.4);g.stroke()}
    g.globalAlpha=1}
  function scribble(g,x,y,w,h,col,seed){ /* 크레용 칠 */
    g.strokeStyle=col;g.lineWidth=2.2;g.lineCap='round';g.globalAlpha=.5;g.beginPath();
    for(var i=0;i*5<w+h;i++){var o=i*5+hash(seed+i)*3;g.moveTo(x+Math.min(o,w),y+Math.max(0,o-w));g.lineTo(x+Math.max(0,o-h),y+Math.min(o,h))}
    g.stroke();g.globalAlpha=1}
  function makePaper(){paper=document.createElement('canvas');paper.width=W;paper.height=H;var p=paper.getContext('2d'),i;
    for(i=0;i<2600;i++){p.fillStyle=hash(i)>.5?'rgba(255,255,255,.22)':'rgba(120,90,50,.07)';
      p.fillRect(hash(i+.3)*W,hash(i+.7)*H,1+hash(i+.1)*2,1+hash(i+.5)*1.4)}
    p.strokeStyle='rgba(140,110,70,.05)';p.lineWidth=1;for(i=0;i<70;i++){var x=hash(i+900)*W,y=hash(i+950)*H;p.beginPath();p.moveTo(x,y);p.lineTo(x+10+hash(i)*24,y+(hash(i+2)-.5)*6);p.stroke()}}

  function drawStar(g,x,y,r,rot){g.beginPath();for(var i=0;i<10;i++){var a=rot+i*Math.PI/5-Math.PI/2,q=i%2?r*.5:r;
      if(i)g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);else g.moveTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}g.closePath()}

  function drawMong(g,x,y,ang,state,sq,n,alpha){
    /* state: 0 잠, 1 놀람, 2 굴러감, 3 환호 */
    g.save();g.globalAlpha=alpha;g.translate(x,y);
    if(sq>0&&n){var na=Math.atan2(n[1],n[0]);g.rotate(na);g.scale(1-.28*sq,1+.2*sq);g.rotate(-na)}
    if(state===3)g.translate(0,-Math.abs(Math.sin(tG*12))*6);
    g.rotate(ang);
    g.fillStyle='#ffab73';g.beginPath();g.arc(0,0,R,0,7);g.fill();
    g.fillStyle='rgba(255,236,200,.75)';g.beginPath();g.ellipse(-3,4,7,5.5,0,0,7);g.fill();
    g.strokeStyle='#b8623a';g.lineWidth=2;g.beginPath();g.arc(0,0,R-.6,0,7);g.stroke();
    /* 새싹 꼬투리 */
    g.strokeStyle='#5aa857';g.lineWidth=2;g.lineCap='round';g.beginPath();g.moveTo(0,-R);g.quadraticCurveTo(1,-R-5,4,-R-6);g.stroke();
    g.fillStyle='#7ccf6e';g.beginPath();g.ellipse(6,-R-6,4,2.4,-.5,0,7);g.fill();
    g.fillStyle='rgba(255,110,120,.45)';g.beginPath();g.arc(-7,3,2.6,0,7);g.arc(7,3,2.6,0,7);g.fill();
    g.strokeStyle='#4a2a1c';g.fillStyle='#4a2a1c';g.lineWidth=1.7;
    if(state===0){g.beginPath();g.arc(-4.5,-1,2.6,.2,2.94);g.stroke();g.beginPath();g.arc(4.5,-1,2.6,.2,2.94);g.stroke();
      g.beginPath();g.arc(0,5,1.3,0,7);g.fill()}
    else if(state===1){g.fillStyle='#fff';g.beginPath();g.arc(-4.5,-2,3.6,0,7);g.arc(4.5,-2,3.6,0,7);g.fill();g.stroke();
      g.fillStyle='#4a2a1c';g.beginPath();g.arc(-4.5,-2,1.3,0,7);g.arc(4.5,-2,1.3,0,7);g.fill();
      g.beginPath();g.ellipse(0,6,2.2,3,0,0,7);g.fill()}
    else if(state===2){g.beginPath();g.arc(-4.5,-2,2,0,7);g.arc(4.5,-2,2,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(-5,-2.7,.7,0,7);g.arc(4,-2.7,.7,0,7);g.fill();
      g.beginPath();g.arc(0,4,2.6,.1,3.04);g.stroke()}
    else{g.beginPath();g.arc(-4.5,-1,2.6,3.34,6.08);g.stroke();g.beginPath();g.arc(4.5,-1,2.6,3.34,6.08);g.stroke();
      g.fillStyle='#c2413b';g.beginPath();g.arc(0,3.5,3.4,0,3.14);g.fill()}
    g.restore()}

  function draw(g,a,dt){
    tG+=dt||0;var ko=a.lang==='ko',i,p,t=tG;
    if(!paper)makePaper();
    for(i=0;i<clouds.length;i++){p=clouds[i];p.x+=p.v*(dt||0);if(p.x>W+70)p.x=-70}
    if(lastGain>0)lastGain-=(dt||0)*1.2;squash=Math.max(0,squash-(dt||0)*5);
    /* 종이 */
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#fdf3da');gr.addColorStop(.6,'#fbeccb');gr.addColorStop(1,'#f3dcae');
    g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
    /* 해 낙서 */
    g.save();g.translate(312,112);g.rotate(t*.15);g.strokeStyle='rgba(255,176,66,.55)';g.lineWidth=3;g.lineCap='round';
    for(i=0;i<9;i++){g.rotate(6.283/9);g.beginPath();g.moveTo(23,0);g.lineTo(31+(i%2)*4,0);g.stroke()}
    g.fillStyle='rgba(255,196,84,.5)';g.beginPath();g.arc(0,0,17,0,7);g.fill();g.restore();
    /* 구름 */
    for(i=0;i<clouds.length;i++){p=clouds[i];g.fillStyle='rgba(255,255,255,.75)';g.strokeStyle='rgba(120,160,210,.5)';g.lineWidth=2;
      g.beginPath();g.ellipse(p.x,p.y,34*p.s,12*p.s,0,0,7);g.ellipse(p.x-14*p.s,p.y-8*p.s,16*p.s,12*p.s,0,0,7);
      g.ellipse(p.x+13*p.s,p.y-9*p.s,19*p.s,14*p.s,0,0,7);g.fill();
      g.beginPath();g.arc(p.x-14*p.s,p.y-8*p.s,13*p.s,3.3,5.6);g.stroke();g.beginPath();g.arc(p.x+13*p.s,p.y-9*p.s,15*p.s,3.6,6.1);g.stroke()}
    /* 먼지 */
    for(i=0;i<motes.length;i++){p=motes[i];var my=((p.y-t*p.v)%H+H)%H,mx=p.x+Math.sin(t*.7+p.p)*14;
      g.fillStyle='rgba(255,255,255,'+(.35+.25*Math.sin(t*1.3+p.p))+')';g.beginPath();g.arc(mx,my,1.6,0,7);g.fill()}
    /* 풀 */
    g.lineCap='round';
    for(i=0;i<46;i++){var gx=i*8+hash(i+200)*5,gh=10+hash(i+300)*16,sw=Math.sin(t*1.4+i*.6)*4;
      g.strokeStyle=i%3?'rgba(110,180,96,.8)':'rgba(84,150,84,.8)';g.lineWidth=2.4;g.beginPath();g.moveTo(gx,H+2);
      g.quadraticCurveTo(gx+sw*.3,H-gh*.6,gx+sw,H-gh);g.stroke()}
    if(!L)return;
    /* 금지 구역 */
    for(i=0;i<L.nod.length;i++){p=L.nod[i];g.save();g.beginPath();g.rect(p[0],p[1],p[2],p[3]);g.clip();
      g.fillStyle='rgba(235,96,96,.09)';g.fillRect(p[0],p[1],p[2],p[3]);
      g.strokeStyle='rgba(226,90,90,.34)';g.lineWidth=2;g.beginPath();
      for(var o=-p[3];o<p[2];o+=13){g.moveTo(p[0]+o+hash(o)*2,p[1]);g.lineTo(p[0]+o+p[3],p[1]+p[3])}g.stroke();g.restore();
      g.strokeStyle='rgba(214,74,74,.6)';g.lineWidth=2;g.setLineDash([7,6]);g.strokeRect(p[0]+1,p[1]+1,p[2]-2,p[3]-2);g.setLineDash([]);
      var ix=p[0]+p[2]/2,iy=Math.min(p[1]+p[3]-30,Math.max(p[1]+30,TOP+34));
      g.fillStyle='rgba(253,243,218,.9)';g.beginPath();g.arc(ix,iy,13,0,7);g.fill();
      g.strokeStyle='#d64a4a';g.lineWidth=2.5;g.beginPath();g.arc(ix,iy,12,0,7);g.moveTo(ix-8,iy+8);g.lineTo(ix+8,iy-8);g.stroke();
      g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(ix-5,iy-5);g.lineTo(ix+5,iy+5);g.stroke()}
    /* 선풍기 */
    for(i=0;i<L.fans.length;i++){p=L.fans[i];var ver=p[5]!==0,dir=ver?(p[5]<0?-1:1):(p[4]<0?-1:1),j;
      g.fillStyle='rgba(120,200,220,.13)';g.fillRect(p[0],p[1],p[2],p[3]);
      g.strokeStyle='rgba(70,160,190,.6)';g.lineWidth=2.2;g.lineCap='round';
      for(j=0;j<9;j++){var ph=(hash(j+i*17)+t*(.9+hash(j+5)*.5))%1,al=Math.sin(ph*3.14),wx,wy;
        g.globalAlpha=al*.9;g.beginPath();
        if(ver){wx=p[0]+8+hash(j+31)*(p[2]-16);wy=dir<0?p[1]+p[3]-ph*p[3]:p[1]+ph*p[3];
          g.moveTo(wx,wy);g.quadraticCurveTo(wx+4,wy-dir*-9,wx,wy+dir*18)}
        else{wy=p[1]+8+hash(j+31)*(p[3]-16);wx=dir>0?p[0]+ph*p[2]:p[0]+p[2]-ph*p[2];
          g.moveTo(wx,wy);g.quadraticCurveTo(wx-dir*9,wy+4,wx-dir*18,wy)}
        g.stroke()}
      g.globalAlpha=1;
      var fxc=ver?p[0]+p[2]/2:(dir>0?p[0]-2:p[0]+p[2]+2),fyc=ver?(dir<0?p[1]+p[3]+2:p[1]-2):p[1]+p[3]/2,fl=(ver?p[2]:p[3])/2-4;
      g.save();g.translate(fxc,fyc);if(!ver)g.rotate(Math.PI/2);
      g.fillStyle='#5fb3c9';g.strokeStyle='#2f7f95';g.lineWidth=2;g.beginPath();g.rect(-fl,-6,fl*2,12);g.fill();g.stroke();
      g.fillStyle='#e9fbff';var bw=Math.cos(t*22)*fl*.8;g.beginPath();g.ellipse(0,0,Math.abs(bw)+3,3.5,0,0,7);g.fill();
      g.fillStyle='#2f7f95';g.beginPath();g.arc(0,0,3,0,7);g.fill();g.restore()}
    /* 발판 */
    for(i=0;i<L.plats.length;i++){p=L.plats[i];g.lineCap='round';
      g.strokeStyle='#8a5a34';g.lineWidth=p[4]*2+2;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(p[2],p[3]);g.stroke();
      g.strokeStyle='#c98d55';g.lineWidth=p[4]*2-1.5;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(p[2],p[3]);g.stroke();
      g.strokeStyle='rgba(255,226,170,.6)';g.lineWidth=1.6;g.setLineDash([9,7]);g.beginPath();g.moveTo(p[0],p[1]-1.5);g.lineTo(p[2],p[3]-1.5);g.stroke();g.setLineDash([])}
    /* 버섯 */
    for(i=0;i<L.mush.length;i++){p=L.mush[i];var mt=mushT[i]||0;if(mt>0)mushT[i]=mt-(dt||0)*4;mt=Math.max(0,mt);
      g.save();g.translate(p[0],p[1]);g.rotate(p[2]);g.scale(1+.18*mt*Math.sin(mt*9),1-.3*mt*Math.sin(mt*9));
      g.fillStyle='#f6e7cf';g.strokeStyle='#b89b76';g.lineWidth=2;g.beginPath();g.moveTo(-8,4);g.quadraticCurveTo(-11,30,-9,34);g.lineTo(9,34);g.quadraticCurveTo(11,30,8,4);g.closePath();g.fill();g.stroke();
      g.fillStyle='#ef5b5b';g.strokeStyle='#a83232';g.beginPath();g.moveTo(-MW-MR,MR-1);g.quadraticCurveTo(-MW-4,-MR-12,0,-MR-13);
      g.quadraticCurveTo(MW+4,-MR-12,MW+MR,MR-1);g.closePath();g.fill();g.stroke();
      g.fillStyle='#fff6ea';g.beginPath();g.arc(-13,-5,4,0,7);g.arc(3,-11,4.6,0,7);g.arc(16,-3,3.2,0,7);g.fill();g.restore()}
    /* 힌트 점선 */
    if(L.hint&&mode==='draw'&&!drawing&&tries===0){var hp=L.hint,ph2=(t*.6)%1;
      g.strokeStyle='rgba(52,64,110,.4)';g.lineWidth=4;g.lineCap='round';g.setLineDash([2,11]);g.lineDashOffset=-t*18;
      g.beginPath();g.moveTo(hp[0][0],hp[0][1]);g.lineTo(hp[1][0],hp[1][1]);g.stroke();g.setLineDash([]);g.lineDashOffset=0;
      drawPencil(g,hp[0][0]+(hp[1][0]-hp[0][0])*ph2,hp[0][1]+(hp[1][1]-hp[0][1])*ph2,.7)}
    /* 별 */
    var sx=L.star[0],sy=L.star[1],pulse=1+Math.sin(t*4)*.07;
    if(mode!=='clear'){g.fillStyle='rgba(255,214,80,.28)';g.beginPath();g.arc(sx,sy,24*pulse,0,7);g.fill();
      g.fillStyle='#ffd23f';g.strokeStyle='#c98a12';g.lineWidth=2;g.lineJoin='round';drawStar(g,sx,sy,STAR*pulse+1,Math.sin(t*1.5)*.18);g.fill();g.stroke();
      g.fillStyle='#7a4a12';g.beginPath();g.arc(sx-4,sy,1.4,0,7);g.arc(sx+4,sy,1.4,0,7);g.fill();
      g.strokeStyle='#7a4a12';g.lineWidth=1.3;g.beginPath();g.arc(sx,sy+2.5,2.4,.2,2.94);g.stroke()}
    else{var cr=modeT*90;g.strokeStyle='rgba(255,200,60,'+Math.max(0,1-modeT*1.3)+')';g.lineWidth=4;g.beginPath();g.arc(sx,sy,cr,0,7);g.stroke()}
    /* 그은 선 */
    var la=mode==='wipe'?Math.max(0,1-modeT/.3):1,wet=mode==='draw';
    for(i=0;i<st.pieces.length;i++)cray(g,st.pieces[i],wet?'#4b5fb0':INK,LR*2+(wet?1.5:.5),i*50+lvN,la);
    /* 몽이 */
    if(sim&&mode!=='draw'){var fs=mode==='clear'?3:(wake>0?1:2);
      if(mode==='wipe'){drawMong(g,sim.x,sim.y,sim.ang,1,0,null,Math.max(0,1-modeT/.25));
        drawMong(g,L.ball[0],L.ball[1],0,0,0,null,Math.min(1,modeT/.4))}
      else{if(wake>0&&mode==='sim'){g.fillStyle='#e0533f';g.font='18px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('!',sim.x+17,sim.y-14)}
        drawMong(g,sim.x,sim.y,mode==='clear'?0:sim.ang,fs,squash,sqN,1)}}
    else{drawMong(g,L.ball[0],L.ball[1]+Math.sin(t*2)*.6,0,0,0,null,1);
      g.fillStyle='rgba(90,110,170,.75)';g.font='11px Jua, system-ui, sans-serif';g.textAlign='left';
      for(i=0;i<3;i++){var zp=(t*.5+i/3)%1;g.globalAlpha=(1-zp)*.9;g.font=(9+zp*7)+'px Jua, system-ui, sans-serif';g.fillText('z',L.ball[0]+12+zp*14,L.ball[1]-12-zp*26)}g.globalAlpha=1}
    /* 실패 지우개 */
    if(mode==='wipe'){var wp=modeT/.4;g.save();g.translate(-80+wp*(W+160),H/2);g.rotate(.25);
      g.fillStyle='rgba(253,243,218,.55)';g.fillRect(-46,-H,92,H*2);g.restore()}
    /* 종이 결 */
    g.drawImage(paper,0,0);
    /* 키보드 커서 */
    if(kbOn&&mode==='draw')drawPencil(g,cur.x,cur.y,1,drawing==='k');
    else if(drawing==='p'&&st.px!=null)drawPencil(g,st.px,st.py,1,true);
    /* 상단 띠 + UI */
    g.fillStyle='#5d6fb3';g.fillRect(-20,-20,W+40,56);g.fillStyle='#4a5a99';
    g.beginPath();for(i=0;i<=W+20;i+=20){g.moveTo(i-10,36);g.arc(i,36,10,3.14,0,true)}g.fill();
    g.fillStyle='#5d6fb3';g.fillRect(-20,30,W+40,6);
    /* 잉크 미터(연필 모양) */
    var ix0=14,iy0=52,iw=150,left2=Math.max(0,1-st.used/L.ink);
    g.fillStyle='rgba(255,255,255,.75)';g.strokeStyle='#34406e';g.lineWidth=2;
    g.beginPath();g.moveTo(ix0,iy0);g.lineTo(ix0+iw,iy0);g.lineTo(ix0+iw+12,iy0+7);g.lineTo(ix0+iw,iy0+14);g.lineTo(ix0,iy0+14);g.closePath();g.fill();
    g.save();g.clip();g.fillStyle=left2<.2?'#e0533f':'#4b5fb0';g.fillRect(ix0,iy0,(iw+12)*left2,14);
    g.fillStyle='rgba(255,255,255,.25)';g.fillRect(ix0,iy0+2,(iw+12)*left2,3);g.restore();g.stroke();
    g.fillStyle='#ff9aa8';g.fillRect(ix0-6,iy0+1,6,12);g.strokeRect(ix0-6,iy0+1,6,12);
    g.font='12px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='#34406e';
    g.fillText((ko?'잉크 ':'Ink ')+Math.round(left2*100)+'%',ix0+iw+18,iy0+12);
    /* 시간 */
    var tw=Math.ceil(time),low=time<10;g.textAlign='right';g.font=(low?22+Math.sin(t*12)*2:20)+'px Jua, system-ui, sans-serif';
    g.fillStyle=lastGain>0?'#3aa655':(low?'#e0533f':'#34406e');g.fillText('⏱ '+tw,W-12,iy0+14);
    if(lastGain>0){g.font='13px Jua, system-ui, sans-serif';g.globalAlpha=Math.min(1,lastGain*2);g.fillText('+12',W-14,iy0+30);g.globalAlpha=1}
    g.textAlign='center';g.font='14px Jua, system-ui, sans-serif';g.fillStyle='#fff';
    g.fillText((ko?'스테이지 ':'Stage ')+(lvN+1)+(streak>0?'  ·  x'+(1+.5*Math.min(streak,4)).toFixed(1):''),W/2,24);
    /* 레벨 안내 */
    if(L.tip&&(mode==='draw')&&tries<2){var tx=L.tip[ko?'ko':'en'];g.font='19px Jua, system-ui, sans-serif';
      var wd=g.measureText(tx).width+24,ty=L.base===0?330:L.ty;g.globalAlpha=drawing?.35:1;
      g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.rect(W/2-wd/2,ty-21,wd,30);g.fill();
      g.strokeStyle='rgba(52,64,110,.5)';g.lineWidth=1.5;g.setLineDash([5,4]);g.strokeRect(W/2-wd/2,ty-21,wd,30);g.setLineDash([]);
      g.fillStyle='#34406e';g.fillText(tx,W/2,ty);g.globalAlpha=1}
    if(kbOn&&mode==='draw'&&!drawing){g.font='12px Jua, system-ui, sans-serif';g.fillStyle='rgba(52,64,110,.75)';g.textAlign='center';
      g.fillText(ko?'방향키로 이동 · 스페이스를 누른 채 긋기':'Arrows move · hold Space to draw',W/2,H-16)}
  }
  function drawPencil(g,x,y,al,down){g.save();g.globalAlpha=al;g.translate(x,y);g.rotate(-.7);if(!down)g.translate(0,-4);
    g.fillStyle='#f3d9a4';g.beginPath();g.moveTo(0,0);g.lineTo(-4,-9);g.lineTo(4,-9);g.fill();
    g.fillStyle=INK;g.beginPath();g.moveTo(0,0);g.lineTo(-1.6,-3.6);g.lineTo(1.6,-3.6);g.fill();
    g.fillStyle='#ffc53d';g.fillRect(-4,-31,8,22);g.strokeStyle='#a87512';g.lineWidth=1.2;g.strokeRect(-4,-31,8,22);
    g.fillStyle='#ff9aa8';g.fillRect(-4,-37,8,6);g.strokeRect(-4,-37,8,6);g.restore()}

  SG.run({id:'one-stroke',title:{ko:'한붓 굴리기',en:'One Stroke'},
    how:{ko:'선을 딱 하나 그으면 잠꾸러기 몽이가 굴러가요. 별까지 보내 주세요!',en:'Draw just one line. Sleepy Mong rolls when you let go — get it to the star!'},
    init:init,update:update,draw:draw});
})();
