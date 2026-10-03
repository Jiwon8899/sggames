/* 메아리 미로 — 캄캄한 동굴에서 소리(메아리)로만 벽을 보고 열매를 찾는다.
   메아리는 잠든 '귀쟁이'를 깨우고, 귀쟁이는 소리가 난 자리로 달려온다. */
(function(){
  var FONT='Jua, system-ui, sans-serif';
  var COL=['120,230,255','255,190,110','205,130,255'];
  var K={l:false,r:false,u:false,d:false},echoReq=false,keyTap=false;
  if(!window.__echoMazeKeys){window.__echoMazeKeys=true;
    var kk=function(e,v){var c=e.code;
      if(c==='ArrowLeft'||c==='KeyA')K.l=v;else if(c==='ArrowRight'||c==='KeyD')K.r=v;
      else if(c==='ArrowUp'||c==='KeyW'){K.u=v;if(v)keyTap=true}else if(c==='ArrowDown'||c==='KeyS')K.d=v;
      else if(c==='Space'){if(v){keyTap=true;if(!e.repeat)echoReq=true}}};
    window.addEventListener('keydown',function(e){kk(e,true)});
    window.addEventListener('keyup',function(e){kk(e,false)});
    window.addEventListener('blur',function(){K.l=K.r=K.u=K.d=false});
  }
  var W=360,H=640,TOP=60,AREA=470;
  var t,time,level,echoes,cd,dead,why,clearT,pingT,hbT,danger,totalEchoes;
  var cols,rows,cs,ox,oy,hw,vw,walls,segs,rings,sparks,lis,bat,exit,distE;
  var touch,tsx,tsy,held,drag,jx,jy,twitch,btn={x:W-46,y:H-76,r:27},msg,msgT;

  function cx(c){return ox+(c+.5)*cs}
  function cy(r){return oy+(r+.5)*cs}
  function cellOf(x,y){return [Math.max(0,Math.min(rows-1,Math.floor((y-oy)/cs))),Math.max(0,Math.min(cols-1,Math.floor((x-ox)/cs)))]}
  function blocked(r,c,r2,c2){
    if(r2<0||c2<0||r2>=rows||c2>=cols)return true;
    if(r2===r-1)return hw[r][c];if(r2===r+1)return hw[r+1][c];
    if(c2===c-1)return vw[r][c];if(c2===c+1)return vw[r][c+1];return false}
  var D4=[[-1,0],[1,0],[0,-1],[0,1]];
  function bfs(sr,sc){var d=[],i,q=[[sr,sc]],h=0;for(i=0;i<rows;i++){d.push([]);for(var j=0;j<cols;j++)d[i].push(-1)}
    d[sr][sc]=0;while(h<q.length){var p=q[h++];for(i=0;i<4;i++){var r=p[0]+D4[i][0],c=p[1]+D4[i][1];
      if(!blocked(p[0],p[1],r,c)&&d[r][c]<0){d[r][c]=d[p[0]][p[1]]+1;q.push([r,c])}}}return d}
  /* (r,c)에서 dist 맵을 따라 목적지까지 내려가는 다음 칸 */
  function step(d,r,c){for(var i=0;i<4;i++){var r2=r+D4[i][0],c2=c+D4[i][1];
    if(!blocked(r,c,r2,c2)&&d[r2][c2]===d[r][c]-1)return [r2,c2]}return null}

  function gen(){
    var n=level;cols=Math.min(8,5+Math.floor((n+1)/2));rows=Math.min(11,7+Math.floor(n/2)+(n>0?1:0));
    cs=Math.floor(Math.min(336/cols,AREA/rows));ox=(W-cols*cs)/2;oy=TOP+(AREA-rows*cs)/2;
    var r,c,i;hw=[];vw=[];for(r=0;r<=rows;r++){hw.push([]);for(c=0;c<cols;c++)hw[r].push(true)}
    for(r=0;r<rows;r++){vw.push([]);for(c=0;c<=cols;c++)vw[r].push(true)}
    var seen={},st=[[rows-1,Math.floor(cols/2)]];seen[st[0]]=1;
    while(st.length){var p=st[st.length-1],o=[];
      for(i=0;i<4;i++){r=p[0]+D4[i][0];c=p[1]+D4[i][1];if(r>=0&&c>=0&&r<rows&&c<cols&&!seen[[r,c]])o.push(i)}
      if(!o.length){st.pop();continue}
      i=o[Math.floor(Math.random()*o.length)];r=p[0]+D4[i][0];c=p[1]+D4[i][1];
      if(i===0)hw[p[0]][p[1]]=false;else if(i===1)hw[p[0]+1][p[1]]=false;else if(i===2)vw[p[0]][p[1]]=false;else vw[p[0]][p[1]+1]=false;
      seen[[r,c]]=1;st.push([r,c])}
    var k=Math.round(cols*rows*.13);
    while(k-->0){if(Math.random()<.5)hw[1+Math.floor(Math.random()*(rows-1))][Math.floor(Math.random()*cols)]=false;
      else vw[Math.floor(Math.random()*rows)][1+Math.floor(Math.random()*(cols-1))]=false}
    walls=[];segs=[];
    function addW(x1,y1,x2,y2){var mx=(x1+x2)/2,my=(y1+y2)/2,
      a={x1:x1,y1:y1,x2:mx,y2:my,mx:(x1+mx)/2,my:(y1+my)/2,t:0,i:0,c:0},b={x1:mx,y1:my,x2:x2,y2:y2,mx:(x2+mx)/2,my:(y2+my)/2,t:0,i:0,c:0};
      segs.push(a,b);walls.push({x1:x1,y1:y1,x2:x2,y2:y2,a:a,b:b})}
    for(r=0;r<=rows;r++)for(c=0;c<cols;c++)if(hw[r][c])addW(ox+c*cs,oy+r*cs,ox+(c+1)*cs,oy+r*cs);
    for(r=0;r<rows;r++)for(c=0;c<=cols;c++)if(vw[r][c])addW(ox+c*cs,oy+r*cs,ox+c*cs,oy+(r+1)*cs);
    var sr=rows-1,sc=Math.floor(cols/2),ds=bfs(sr,sc),best=null,bv=-1;
    for(r=0;r<rows;r++)for(c=0;c<cols;c++){var v=n===0?100-Math.abs(ds[r][c]-11):ds[r][c];if(v>bv){bv=v;best=[r,c]}}
    exit={r:best[0],c:best[1],x:cx(best[1]),y:cy(best[0])};distE=bfs(exit.r,exit.c);
    bat.x=cx(sc);bat.y=cy(sr);bat.r=cs*.2;bat.vx=bat.vy=0;
    lis=[];var want=n===0?0:Math.min(4,1+Math.floor(n/2)),tries=0;
    while(lis.length<want&&tries++<200){r=Math.floor(Math.random()*rows);c=Math.floor(Math.random()*cols);
      if(ds[r][c]<4||(r===exit.r&&c===exit.c))continue;var ok=true;
      for(i=0;i<lis.length;i++)if(Math.abs(lis[i].r0-r)+Math.abs(lis[i].c0-c)<3)ok=false;
      if(ok)lis.push({x:cx(c),y:cy(r),r0:r,c0:c,st:0,tm:0,pend:null,path:null,seen:0,step:0,ph:Math.random()*6})}
    rings=[];sparks=[];echoes=0;cd=.25;pingT=.6;clearT=0;danger=0;
  }
  function crossings(x0,y0,x1,y1){var d=Math.hypot(x1-x0,y1-y0),n=Math.max(1,Math.ceil(d/(cs/5))),p=cellOf(x0,y0),cnt=0;
    for(var i=1;i<=n;i++){var f=i/n*.9,q=cellOf(x0+(x1-x0)*f,y0+(y1-y0)*f);
      if(q[0]!==p[0]||q[1]!==p[1]){
        if(q[0]!==p[0]&&q[1]!==p[1]){var a=blocked(p[0],p[1],q[0],p[1])||blocked(q[0],p[1],q[0],q[1]),
          b=blocked(p[0],p[1],p[0],q[1])||blocked(p[0],q[1],q[0],q[1]);if(a&&b)cnt++}
        else if(blocked(p[0],p[1],q[0],q[1]))cnt++;p=q}}
    return cnt}
  function emit(x,y,type,range,power){var list=[];
    for(var i=0;i<segs.length;i++){var s=segs[i],d=Math.hypot(s.mx-x,s.my-y);if(d>range)continue;
      var inten=power*Math.pow(1-d/range,.7)*Math.pow(.45,crossings(x,y,s.mx,s.my));if(inten>.05)list.push({s:s,d:d,i:inten})}
    list.sort(function(p,q){return p.d-q.d});
    rings.push({x:x,y:y,r:0,max:range,sp:cs*5.5,list:list,idx:0,type:type,power:power})}
  function light(s,i,c,dur){var cur=s.i*(s.t/1.5);if(i>=cur){s.i=i;s.t=dur||1.5;s.c=c}}
  function echo(a){
    if(cd>0||dead||clearT>0)return;cd=.9;echoes++;totalEchoes++;twitch=1;
    emit(bat.x,bat.y,0,cs*3.5,1);a.beep(988,.22,'sine');a.beep(1480,.12,'sine');
    for(var i=0;i<lis.length;i++){var l=lis[i],d=Math.hypot(l.x-bat.x,l.y-bat.y);
      if(d<cs*4.3)l.pend={x:bat.x,y:bat.y,t:d/(cs*5.5)+.05}}
  }
  function collide(p,rad,lit){
    for(var i=0;i<walls.length;i++){var w=walls[i],dx=w.x2-w.x1,dy=w.y2-w.y1,
      f=((p.x-w.x1)*dx+(p.y-w.y1)*dy)/(dx*dx+dy*dy);f=f<0?0:f>1?1:f;
      var qx=w.x1+dx*f,qy=w.y1+dy*f,ex=p.x-qx,ey=p.y-qy,d=Math.hypot(ex,ey),m=rad+1.5;
      if(d<m&&d>1e-4){p.x=qx+ex/d*m;p.y=qy+ey/d*m;if(lit){light(f<.5?w.a:w.b,.45,0,.7)}}}}
  function route(l,tx,ty){var tc=cellOf(tx,ty),d=bfs(tc[0],tc[1]),c=cellOf(l.x,l.y),path=[],g=0;
    while(d[c[0]][c[1]]>0&&g++<200){path.push({x:cx(c[1]),y:cy(c[0])});c=step(d,c[0],c[1]);if(!c)break}
    if(path.length)path.shift();path.push({x:tx,y:ty});l.path=path}

  SG.run({
    id:'echo-maze',
    title:{ko:'메아리 미로',en:'Echo Maze'},
    how:{ko:'캄캄한 동굴! 탭하면 소리로 벽이 보여요. 끌어서 날아가 열매를 찾으세요. 소리는 귀쟁이를 깨워요.',
         en:'Pitch dark! Tap to see walls with sound, drag to fly to the fruit. But sound wakes the Listeners.'},
    init:function(a){W=a.W;H=a.H;t=0;time=40;level=0;dead=false;why=0;totalEchoes=0;hbT=0;twitch=0;touch=null;jx=jy=0;msg='';msgT=0;
      echoReq=false;keyTap=false;bat={x:0,y:0,r:12,vx:0,vy:0,fx:0,fy:-1};gen();a.tempo(1)},
    update:function(dt,inp,a){
      t+=dt;cd=Math.max(0,cd-dt);twitch=Math.max(0,twitch-dt*3);msgT=Math.max(0,msgT-dt);
      var i,j,l,s,want=echoReq;echoReq=false;var kt=keyTap;keyTap=false;
      for(i=0;i<segs.length;i++)if(segs[i].t>0)segs[i].t-=dt;
      for(i=sparks.length-1;i>=0;i--){sparks[i].t-=dt;if(sparks[i].t<=0)sparks.splice(i,1)}
      for(i=rings.length-1;i>=0;i--){var rg=rings[i],pr=rg.r;rg.r+=rg.sp*dt;
        while(rg.idx<rg.list.length&&rg.list[rg.idx].d<=rg.r){var e=rg.list[rg.idx++];light(e.s,e.i,rg.type);
          if(e.i>.3&&sparks.length<70&&Math.random()<.6)sparks.push({x:e.s.mx,y:e.s.my,t:.45,c:rg.type})}
        for(j=0;j<lis.length;j++){var dd=Math.hypot(lis[j].x-rg.x,lis[j].y-rg.y);if(dd>pr&&dd<=rg.r&&rg.type!==2)lis[j].seen=1.6}
        if(rg.r>=rg.max)rings.splice(i,1)}
      if(clearT>0){clearT-=dt;touch=null;if(clearT<=0){level++;gen();msg='';msgT=0}return}
      time-=dt;a.tempo(time<10?1.35:1+Math.min(.2,level*.04));
      if(time<=0){time=0;dead=true;why=1;a.pop(bat.x,bat.y-24,a.lang==='ko'?'시간 끝!':"Time's up!",'#ffd27a');a.burst(exit.x,exit.y,'#ffb36b',10);a.over();return}
      /* 입력 */
      var mx=0,my=0;
      if(inp.tap&&inp.down&&inp.x!=null){
        if(Math.hypot(inp.x-btn.x,inp.y-btn.y)<btn.r+10){touch='btn';want=true}
        else{touch='joy';tsx=inp.x;tsy=inp.y;held=0;drag=false}}
      else if(inp.tap&&!inp.down&&!kt&&inp.x!=null&&!touch)want=true;
      if(touch==='joy'){
        if(inp.down){held+=dt;jx=inp.x-tsx;jy=inp.y-tsy;var jl=Math.hypot(jx,jy);if(jl>12)drag=true;
          if(drag&&jl>6){var m=Math.min(1,jl/34);mx=jx/jl*m;my=jy/jl*m}}
        else{if(!drag&&held<.4)want=true;touch=null;jx=jy=0}}
      else if(touch==='btn'&&!inp.down)touch=null;
      var kx=(K.r?1:0)-(K.l?1:0),ky=(K.d?1:0)-(K.u?1:0);
      if(kx||ky){var kl=Math.hypot(kx,ky);mx=kx/kl;my=ky/kl}
      if(want)echo(a);
      /* 이동: 부드러운 가속 + 벽 미끄러짐 */
      var sp=cs*3.2,acc=Math.min(1,dt*14);bat.vx+=(mx*sp-bat.vx)*acc;bat.vy+=(my*sp-bat.vy)*acc;
      for(i=0;i<3;i++){bat.x+=bat.vx*dt/3;bat.y+=bat.vy*dt/3;collide(bat,bat.r,Math.hypot(bat.vx,bat.vy)>sp*.5)}
      if(Math.hypot(mx,my)>.2){bat.fx+=(mx-bat.fx)*Math.min(1,dt*10);bat.fy+=(my-bat.fy)*Math.min(1,dt*10)}
      /* 열매의 핑 */
      pingT-=dt;if(pingT<=0){pingT=2.3;emit(exit.x,exit.y,1,cs*2.3,.6);
        if(Math.hypot(exit.x-bat.x,exit.y-bat.y)<cs*4)a.beep(1568,.1,'sine')}
      /* 귀쟁이 */
      var near=1e9;
      for(i=0;i<lis.length;i++){l=lis[i];l.seen=Math.max(0,l.seen-dt);
        if(l.pend){l.pend.t-=dt;if(l.pend.t<=0){if(l.st===0||l.st===3){l.st=1;l.tm=.5;a.beep(233,.18,'triangle');emit(l.x,l.y,2,cs*1.7,.7)}
          l.tx=l.pend.x;l.ty=l.pend.y;if(l.st===2)route(l,l.tx,l.ty);l.pend=null}}
        if(l.st===1){l.tm-=dt;if(l.tm<=0){l.st=2;route(l,l.tx,l.ty);l.step=0}}
        else if(l.st===2){var mv=cs*2.7*dt;l.step-=dt;
          if(l.step<=0){l.step=.3;emit(l.x,l.y,2,cs*1.25,.55)}
          while(mv>0&&l.path.length){var p=l.path[0],d=Math.hypot(p.x-l.x,p.y-l.y);
            if(d<=mv){l.x=p.x;l.y=p.y;mv-=d;l.path.shift()}else{l.x+=(p.x-l.x)/d*mv;l.y+=(p.y-l.y)/d*mv;mv=0}}
          if(!l.path.length){l.st=3;l.tm=1.2}}
        else if(l.st===3){l.tm-=dt;if(l.tm<=0){l.st=0}}
        var dl=Math.hypot(l.x-bat.x,l.y-bat.y);
        if(l.st>=2){near=Math.min(near,dl);
          if(dl<cs*.29){dead=true;why=2;a.pop(bat.x,bat.y-24,a.lang==='ko'?'깜짝이야!':'Eek!','#e3b3ff');
            a.burst(bat.x,bat.y,'#cf9bff',18);a.burst(exit.x,exit.y,'#ffb36b',8);a.over();return}}}
      danger+=((near<cs*3.5?1-near/(cs*3.5):0)-danger)*Math.min(1,dt*6);
      if(near<cs*3.5){hbT-=dt;if(hbT<=0){a.beep(72,.1,'sine');hbT=.22+.5*near/(cs*3.5)}}else hbT=0;
      /* 열매 도착 */
      if(Math.hypot(exit.x-bat.x,exit.y-bat.y)<bat.r+cs*.2){
        var quiet=Math.max(0,8-echoes)*5,tb=Math.floor(time/2),pts=50+quiet+tb;a.add(pts);a.sfx('win');
        a.burst(exit.x,exit.y,'#ffcf7a',22);a.burst(exit.x,exit.y,'#ff8f6b',10);
        a.pop(exit.x,exit.y-22,'+'+pts,'#fff36b');
        if(quiet>0){msg=(a.lang==='ko'?'조용 보너스 +':'Quiet bonus +')+quiet;msgT=1.5}
        time=Math.min(40,time+9);clearT=.95;
        for(i=0;i<segs.length;i++){s=segs[i];s.i=.9;s.t=1.5;s.c=1}}
    },
    draw:function(g,a){
      var i,s,l,al;g.fillStyle='#06050e';g.fillRect(-20,-20,W+40,H+40);
      var bg=g.createRadialGradient(bat.x,bat.y,10,bat.x,bat.y,cs*2.2);bg.addColorStop(0,'rgba(60,70,130,.22)');bg.addColorStop(1,'rgba(60,70,130,0)');
      g.fillStyle=bg;g.fillRect(0,0,W,H);
      if(danger>.02){var dg=g.createRadialGradient(W/2,H/2,150,W/2,H/2,400);dg.addColorStop(0,'rgba(190,60,160,0)');
        dg.addColorStop(1,'rgba(190,60,160,'+(danger*(.3+.15*Math.sin(t*12)))+')');g.fillStyle=dg;g.fillRect(0,0,W,H)}
      /* 열매 */
      var pu=.5+.5*Math.sin(t*3),fr=cs*.17;
      var eg=g.createRadialGradient(exit.x,exit.y,2,exit.x,exit.y,cs*.95);eg.addColorStop(0,'rgba(255,170,90,'+(.3+.15*pu)+')');eg.addColorStop(1,'rgba(255,170,90,0)');
      g.fillStyle=eg;g.beginPath();g.arc(exit.x,exit.y,cs*.95,0,7);g.fill();
      if(!dead){g.save();g.translate(exit.x,exit.y+Math.sin(t*2.4)*2);
        var fg=g.createRadialGradient(-fr*.3,-fr*.3,1,0,0,fr*1.1);fg.addColorStop(0,'#ffe9a8');fg.addColorStop(1,'#ff8a4c');g.fillStyle=fg;
        g.beginPath();g.arc(-fr*.28,0,fr*.85,0,7);g.arc(fr*.28,0,fr*.85,0,7);g.fill();
        g.fillStyle='#9be07a';g.beginPath();g.ellipse(fr*.45,-fr*.95,fr*.55,fr*.25,-.6,0,7);g.fill();
        g.strokeStyle='#7a5a3a';g.lineWidth=1.5;g.beginPath();g.moveTo(0,-fr*.6);g.lineTo(fr*.1,-fr*1.15);g.stroke();g.restore()}
      /* 벽: 소리가 닿은 조각만 빛난다 */
      g.lineCap='round';
      for(var pass=0;pass<2;pass++)for(i=0;i<segs.length;i++){s=segs[i];
        al=s.t>0?s.i*Math.pow(s.t/1.5,1.15):0;var c=s.c,dn=Math.hypot(s.mx-bat.x,s.my-bat.y),nr=dn<cs*.8?(1-dn/(cs*.8))*.4:0;
        if(nr>al){al=nr;c=0}if(al<.02)continue;
        if(pass===0){g.strokeStyle='rgba('+COL[c]+','+(al*.22)+')';g.lineWidth=9}
        else{g.strokeStyle='rgba('+COL[c]+','+Math.min(1,al*1.15)+')';g.lineWidth=2.6}
        g.beginPath();g.moveTo(s.x1,s.y1);g.lineTo(s.x2,s.y2);g.stroke()}
      /* 소리 고리 */
      for(i=0;i<rings.length;i++){var rg=rings[i],f=1-rg.r/rg.max;if(rg.r<1)continue;
        g.strokeStyle='rgba('+COL[rg.type]+','+(f*.16*rg.power)+')';g.lineWidth=10;g.beginPath();g.arc(rg.x,rg.y,rg.r,0,7);g.stroke();
        g.strokeStyle='rgba('+COL[rg.type]+','+(f*.75*rg.power)+')';g.lineWidth=1.8;g.beginPath();g.arc(rg.x,rg.y,rg.r,0,7);g.stroke();
        if(rg.type===0&&rg.r>cs*.7){g.strokeStyle='rgba('+COL[0]+','+(f*.25)+')';g.lineWidth=1;g.beginPath();g.arc(rg.x,rg.y,rg.r-cs*.5,0,7);g.stroke()}}
      for(i=0;i<sparks.length;i++){s=sparks[i];var k=s.t/.45,z=2+4*(1-k);g.strokeStyle='rgba('+COL[s.c]+','+k+')';g.lineWidth=1.2;
        g.beginPath();g.moveTo(s.x-z,s.y);g.lineTo(s.x+z,s.y);g.moveTo(s.x,s.y-z);g.lineTo(s.x,s.y+z);g.stroke()}
      /* 귀쟁이 */
      for(i=0;i<lis.length;i++){l=lis[i];var d=Math.hypot(l.x-bat.x,l.y-bat.y),vis=l.st>0?1:Math.max(Math.min(1,l.seen),d<cs*1.4?1-d/(cs*1.4)+.25:0);
        vis=Math.min(1,vis);if(vis<.03)continue;var R=cs*.2,aw=l.st>0;
        g.save();g.translate(l.x,l.y+(aw?Math.sin(t*22)*1.2:Math.sin(t*2+l.ph)*1));g.globalAlpha=vis;
        if(aw){var hg=g.createRadialGradient(0,0,2,0,0,R*2.6);hg.addColorStop(0,'rgba(205,130,255,.35)');hg.addColorStop(1,'rgba(205,130,255,0)');
          g.fillStyle=hg;g.beginPath();g.arc(0,0,R*2.6,0,7);g.fill()}
        g.fillStyle=aw?'#3a2458':'#21183a';var ea=aw?1.25:.75;
        g.beginPath();g.ellipse(-R*.75,-R*.8,R*.4,R*ea,-.45,0,7);g.ellipse(R*.75,-R*.8,R*.4,R*ea,.45,0,7);g.fill();
        g.beginPath();g.arc(0,0,R,0,7);g.fill();
        if(aw){g.fillStyle='#ffe07a';g.shadowColor='#ffd060';g.shadowBlur=8;var ex=l.st===3?Math.sin(t*9)*R*.18:0;
          g.beginPath();g.arc(-R*.38+ex,-R*.05,R*.27,0,7);g.arc(R*.38+ex,-R*.05,R*.27,0,7);g.fill();g.shadowBlur=0;
          g.fillStyle='#2a1030';g.beginPath();g.arc(-R*.38+ex,-R*.05,R*.11,0,7);g.arc(R*.38+ex,-R*.05,R*.11,0,7);g.fill();
          if(l.st===1||l.st===3){g.fillStyle='#ffe07a';g.font='800 '+Math.round(R*1.3)+'px '+FONT;g.textAlign='center';g.fillText(l.st===1?'!':'?',0,-R*2)}}
        else{g.strokeStyle='#c9a8ff';g.lineWidth=1.6;g.beginPath();g.arc(-R*.38,-R*.05,R*.22,.15,2.99);g.stroke();
          g.beginPath();g.arc(R*.38,-R*.05,R*.22,.15,2.99);g.stroke();
          g.fillStyle='#c9a8ff';g.font='700 '+Math.round(R*.9)+'px '+FONT;g.textAlign='left';g.fillText('z',R*.9,-R*1.1-((t*8+l.ph*3)%8))}
        g.restore()}
      /* 박쥐 */
      var sc=bat.r/13,spd=Math.hypot(bat.vx,bat.vy)/(cs*3.2),fl=Math.sin(t*(9+spd*9)),bl=((t+.7)%3.4)<.12;
      g.save();g.translate(bat.x,bat.y+Math.sin(t*5)*1.2+(dead?4:0));g.scale(sc,sc);g.rotate(bat.fx*.22*spd);
      var hl=g.createRadialGradient(0,0,4,0,0,30);hl.addColorStop(0,'rgba(150,200,255,.28)');hl.addColorStop(1,'rgba(150,200,255,0)');
      g.fillStyle=hl;g.beginPath();g.arc(0,0,30,0,7);g.fill();
      g.fillStyle='#5a4a9c';
      for(var sd=-1;sd<=1;sd+=2){var wy=dead?8:-6+fl*9;g.beginPath();g.moveTo(sd*8,-2);g.quadraticCurveTo(sd*18,wy-8,sd*27,wy);
        g.quadraticCurveTo(sd*22,wy+5,sd*20,wy+8);g.quadraticCurveTo(sd*16,wy+3,sd*13,wy+9);g.quadraticCurveTo(sd*11,6,sd*7,7);g.fill()}
      var tw=twitch*5;g.fillStyle='#7765c4';
      g.beginPath();g.moveTo(-10,-7);g.lineTo(-9-tw*.4,-21-tw);g.lineTo(-2,-11);g.fill();g.beginPath();g.moveTo(10,-7);g.lineTo(9+tw*.4,-21-tw);g.lineTo(2,-11);g.fill();
      g.fillStyle='#ffb3c8';g.beginPath();g.moveTo(-8.5,-9);g.lineTo(-8-tw*.3,-17-tw*.7);g.lineTo(-4.5,-11);g.fill();g.beginPath();g.moveTo(8.5,-9);g.lineTo(8+tw*.3,-17-tw*.7);g.lineTo(4.5,-11);g.fill();
      var bd=g.createRadialGradient(-3,-4,2,0,0,13);bd.addColorStop(0,'#9c8be6');bd.addColorStop(1,'#6a58b8');g.fillStyle=bd;g.beginPath();g.arc(0,0,12,0,7);g.fill();
      g.fillStyle='#cfc4ff';g.beginPath();g.ellipse(0,5,6.5,5,0,0,7);g.fill();
      var lx=bat.fx*1.6,ly=bat.fy*1.4;
      if(dead){g.strokeStyle='#fff';g.lineWidth=1.8;[-5,5].forEach(function(x){g.beginPath();g.moveTo(x-2.5,-4.5);g.lineTo(x+2.5,.5);g.moveTo(x+2.5,-4.5);g.lineTo(x-2.5,.5);g.stroke()})}
      else if(bl){g.fillStyle='#1c1433';g.fillRect(-7.5,-2.5,5,1.6);g.fillRect(2.5,-2.5,5,1.6)}
      else{g.fillStyle='#fff';g.beginPath();g.arc(-5,-2,3.6,0,7);g.arc(5,-2,3.6,0,7);g.fill();
        g.fillStyle='#1c1433';g.beginPath();g.arc(-5+lx,-2+ly,1.9,0,7);g.arc(5+lx,-2+ly,1.9,0,7);g.fill()}
      g.fillStyle='#fff';g.beginPath();g.moveTo(-2,3.5);g.lineTo(-.8,6);g.lineTo(.2,3.5);g.fill();
      if(twitch>.2){g.strokeStyle='rgba(120,230,255,'+twitch+')';g.lineWidth=1.5;g.beginPath();g.arc(0,4,4+(1-twitch)*6,.3,2.84);g.stroke()}
      g.restore();
      /* UI: 시간 막대 */
      var tf=Math.max(0,time/40),low=time<10;g.fillStyle='rgba(255,255,255,.08)';g.fillRect(46,46,W-62,6);
      g.fillStyle=low?(Math.sin(t*10)>0?'#ff7a9a':'#ffb0c0'):'#78e6ff';g.fillRect(46,46,(W-62)*tf,6);
      g.font='800 17px '+FONT;g.textAlign='left';g.fillStyle=low?'#ff9ab0':'#cfefff';g.fillText(Math.ceil(time)+'',14,54);
      /* 조이스틱 */
      if(touch==='joy'&&drag&&!dead){var jl=Math.hypot(jx,jy),jm=Math.min(34,jl);g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=2;
        g.beginPath();g.arc(tsx,tsy,34,0,7);g.stroke();g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.arc(tsx+jx/jl*jm,tsy+jy/jl*jm,13,0,7);g.fill()}
      /* 메아리 버튼 */
      var rdy=cd<=0;g.fillStyle=rdy?'rgba(120,230,255,.16)':'rgba(255,255,255,.05)';g.beginPath();g.arc(btn.x,btn.y,btn.r,0,7);g.fill();
      g.strokeStyle='rgba(120,230,255,'+(rdy?.9:.25)+')';g.lineWidth=2.5;g.beginPath();g.arc(btn.x,btn.y,btn.r,-1.57,-1.57+6.283*(1-cd/.9));g.stroke();
      g.strokeStyle='rgba(200,245,255,'+(rdy?.95:.35)+')';g.lineWidth=2;
      for(i=1;i<=3;i++){g.beginPath();g.arc(btn.x-9,btn.y,i*6.5,-.8,.8);g.stroke()}
      g.fillStyle=g.strokeStyle;g.beginPath();g.arc(btn.x-9,btn.y,2.5,0,7);g.fill();
      /* 안내 글 */
      g.textAlign='left';var ko=a.lang==='ko',by=H-70;
      if(level===0&&clearT<=0){g.font='400 17px '+FONT;g.fillStyle='rgba(210,240,255,'+(.7+.3*Math.sin(t*3))+')';
        g.fillText(ko?'탭해서 소리로 길을 찾아요':'Tap to see with sound',16,by-8);
        g.font='400 13px '+FONT;g.fillStyle='rgba(190,200,230,.6)';g.fillText(ko?'끌어서 이동 · 주황빛 열매까지!':'Drag to fly · reach the glowing fruit!',16,by+12)}
      else{g.font='400 17px '+FONT;g.fillStyle='rgba(210,240,255,.85)';
        g.fillText((ko?'미로 ':'Maze ')+(level+1)+'   '+(ko?'메아리 ':'Echoes ')+echoes,16,by-8);
        g.font='400 13px '+FONT;g.fillStyle=msgT>0?'rgba(255,230,140,'+Math.min(1,msgT*2)+')':'rgba(190,200,230,.55)';
        g.fillText(msgT>0&&msg?msg:(ko?'쉿! 귀쟁이는 소리 난 자리로 달려와요':'Shh! Listeners rush to where you called'),16,by+12)}
    }
  });
  /* 자동 검증용: 다음에 가야 할 방향과 상태 */
  window.__echoDbg=function(){var c=cellOf(bat.x,bat.y),n=step(distE,c[0],c[1]);
    return{x:bat.x,y:bat.y,tx:n?cx(n[1]):exit.x,ty:n?cy(n[0]):exit.y,dist:distE[c[0]][c[1]],level:level,time:time,echoes:echoes,dead:dead,lis:lis.length}};
})();
