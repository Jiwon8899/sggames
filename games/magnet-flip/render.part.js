  /* ================= 화면 · 진행 ================= */
  var W=360,H=640,Z=1.2,FSY=508,CXW=64,NC='#ff5b4d',SC='#3f8cff',ND='#a82a26',SD='#1f4fa8',FONT='px Jua, system-ui, sans-serif';
  function pc(p){return p>0?NC:SC}function pd(p){return p>0?ND:SD}function pl(p){return p>0?'N':'S'}
  var cache={},st=null;
  function specOf(i){if(i<HAND.length)return HAND[i];return genSpec(SEEDS[(i-HAND.length)%SEEDS.length][0])}
  function parOf(i){return i<HAND.length?HPAR[i]:SEEDS[(i-HAND.length)%SEEDS.length][1]}
  function lev(i){if(i<0)return null;if(!cache[i])cache[i]=build(specOf(i));return cache[i]}
  function hash(n){n=(n^61)^(n>>>16);n=n+(n<<3);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);n=n^(n>>>15);return (n>>>0)/4294967296}
  function reset(){var L=lev(0);st={i:0,ox:0,L:L,s:init(L),ps:null,acc:0,T:45,pend:false,mode:0,rw:0,rx:0,ry:0,got:0,t:0,cam:-CXW,
    rot:0,land:0,blink:0,bt:2,legs:0,flipT:9,gateT:9,clearT:9,clearMsg:'',lastTick:0,sparks:[],wasGr:1,over:false}}
  function tx(x){return (x-st.cam)*Z}function ty(y){return FSY+(y-FY)*Z}

  function doFlip(a){st.pend=true}
  function spark(x,y,c,n,v){for(var i=0;i<n;i++){var an=Math.random()*6.283,sp=(v||120)*(.4+Math.random());st.sparks.push({x:x,y:y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,t:0,l:.25+Math.random()*.3,c:c})}}
  var WHY={ko:['','아이쿠!','따끔!','끼었다…','찰싹! 붙었어','쿵!'],en:['','Whoops!','Ouch!','Stuck…','Clamped!','Bonk!']};
  function update(dt,inp,a){
    if(!st||st.over)return;st.t+=dt;
    if(inp.tap&&st.mode===0)st.pend=true;
    st.T-=dt;
    if(st.T<=5&&Math.ceil(st.T)!==st.lastTick&&st.T>0){st.lastTick=Math.ceil(st.T);a.beep(880,.05,'square')}
    if(st.T<=0){st.T=0;st.over=true;a.over();return}
    st.flipT+=dt;st.gateT+=dt;st.clearT+=dt;st.land=Math.max(0,st.land-dt*5);
    st.bt-=dt;if(st.bt<0){st.blink=.14;st.bt=1.6+Math.random()*2.6}st.blink=Math.max(0,st.blink-dt);
    var s=st.s,L=st.L,i;
    if(st.mode===1){st.rw+=dt;if(st.rw>=.6){st.mode=0;st.s=init(L);st.acc=0;st.pend=false;st.gateT=0;st.wasGr=1}}
    else{st.acc+=dt;var n=0;
      while(st.acc>=DT&&n<8){st.acc-=DT;n++;var f=st.pend;st.pend=false;
        if(f){st.flipT=0;var np=-s.pole;a.beep(np>0?784:523,.07,'square');a.beep(np>0?2350:1570,.025,'triangle');
          spark(st.ox+s.x,s.y,pc(np),10,150);spark(st.ox+s.x,s.y,'#fff6c8',5,90)}
        step(L,s,f);
        var nb=s.bolts&~st.got;if(nb){st.got|=nb;for(i=0;i<L.bolts.length;i++)if(nb>>i&1){a.add(1);a.sfx('coin');a.burst(tx(st.ox+L.bolts[i].x),ty(L.bolts[i].y),'#ffd75e',7)}}
        if(s.gr&&!st.wasGr){st.land=1;a.beep(s.gr===2?980:150,.04,s.gr===2?'square':'sine')}st.wasGr=s.gr;
        if(s.status===1){clear(a);s=st.s;L=st.L}
        else if(s.status===2){a.sfx('hit');a.shake(9);a.burst(tx(st.ox+s.x),Math.min(H-40,ty(s.y)),pc(s.pole),14);
          a.pop(Math.max(60,tx(st.ox+s.x)),Math.min(H-110,ty(s.y))-24,WHY[a.lang][s.why],'#fff');
          st.mode=1;st.rw=0;st.rx=s.x;st.ry=Math.min(s.y,WB);break}}
      if(n>=8)st.acc=0}
    if(s.gr)st.legs+=dt*13;
    var tr=s.gr===2?Math.PI:s.gr===1?0:st.rot>Math.PI/2?Math.PI:0;st.rot+=(tr-st.rot)*Math.min(1,dt*14);
    for(i=st.sparks.length-1;i>=0;i--){var p=st.sparks[i];p.t+=dt;if(p.t>p.l){st.sparks.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt}
    var cx=st.ox+(st.mode===1?st.rx+(0-st.rx)*ease(st.rw/.6):s.x)-CXW;st.cam+=(cx-st.cam)*Math.min(1,dt*10)}
  function ease(u){u=u<0?0:u>1?1:u;return u*u*(3-2*u)}
  function clear(a){var s=st.s,L=st.L,par=parOf(st.i),ex=s.flips-par,bonus=ex<=0?5:ex===1?3:ex===2?1:0;
    a.add(10+bonus);a.sfx('win');st.clearT=0;
    st.clearMsg=(a.lang==='ko'?(bonus===5?'완벽한 뒤집기! +':bonus?'알뜰 보너스 +':'통과! +'):(bonus===5?'Perfect flips! +':bonus?'Thrifty bonus +':'Cleared! +'))+(10+bonus);
    var gain=st.i<10?12:Math.max(6,12-Math.floor((st.i-9)/3));st.T=Math.min(70,st.T+gain);
    a.burst(tx(st.ox+s.x),ty(s.y)-10,'#ffe27a',16);
    st.ps={L:L,s:s,ox:st.ox,got:st.got};st.ox+=L.len;st.i++;a.tempo(1+Math.min(.5,st.i*.035));
    var NL=lev(st.i),ns=init(NL);ns.x=s.x-L.len;ns.y=s.y;ns.vx=s.vx;ns.vy=s.vy;ns.gr=s.gr;
    if(s.pole<0){a.beep(784,.07,'square');spark(st.ox+ns.x,ns.y,NC,12,150);st.flipT=0}
    st.L=NL;st.s=ns;st.got=0;st.gateT=0;delete cache[st.i-3]}

  /* ---------- 배경 ---------- */
  function sky(g,t){var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#2a1a4c');gr.addColorStop(.3,'#6b3470');gr.addColorStop(.58,'#e06b5c');gr.addColorStop(.8,'#ffb765');gr.addColorStop(1,'#ffd98a');
    g.fillStyle=gr;g.fillRect(0,0,W,H);
    var sx=248,sy=404+Math.sin(t*.2)*3;for(var i=3;i>=0;i--){g.globalAlpha=i?0.08:1;g.fillStyle=i?'#fff2c0':'#ffe9a8';g.beginPath();g.arc(sx,sy,44+i*22,0,6.3);g.fill()}g.globalAlpha=1;
    g.fillStyle='rgba(255,220,170,.16)';for(i=0;i<4;i++){var cx=((i*131+t*(4+i*1.5))%(W+160))-80,cy=96+i*52;g.beginPath();g.ellipse(cx,cy,56+i*8,7+i,0,0,6.3);g.ellipse(cx+34,cy+6,40,6,0,0,6.3);g.fill()}}
  function layer(g,par,cw,fn){var off=st.cam*Z*par,k0=Math.floor(off/cw)-1,k1=Math.floor((off+W)/cw)+1;for(var k=k0;k<=k1;k++)fn(k*cw-off,k)}
  function farLayer(g,t){g.fillStyle='#7d3f73';layer(g,.1,190,function(x,k){var h=hash(k*7+1),h2=hash(k*7+2),b=470;
      g.beginPath();g.moveTo(x-20,b+40);g.quadraticCurveTo(x+40,b-30-h*50,x+95,b-12-h2*30);g.quadraticCurveTo(x+150,b-40-h2*40,x+215,b+40);g.fill();
      if(h>.45){var cx=x+60+h2*60,top=250+h*70;g.fillRect(cx-3,top,6,b-top+30);g.fillRect(cx-46,top,120,5);g.fillRect(cx-46,top,5,14);
        g.beginPath();g.moveTo(cx,top-24);g.lineTo(cx+74,top+2);g.lineTo(cx-46,top+2);g.fill();
        var sw=Math.sin(t*.7+k)*5;g.strokeStyle='#7d3f73';g.lineWidth=1.5;g.beginPath();g.moveTo(cx+62,top+4);g.lineTo(cx+62+sw,top+58);g.stroke();g.fillRect(cx+55+sw,top+58,14,10)}})}
  function midLayer(g,t){layer(g,.32,260,function(x,k){var h=hash(k*13+5),h2=hash(k*13+6),b=505;g.fillStyle='#4a2452';
      g.beginPath();g.moveTo(x-10,b+30);g.lineTo(x+18,b-34-h*30);g.lineTo(x+52,b-52-h*36);g.lineTo(x+88,b-30-h2*30);g.lineTo(x+120,b-46-h2*20);g.lineTo(x+160,b+30);g.fill();
      for(var j=0;j<3;j++){var rx=x+150+j*26+h*20,rh=18+hash(k*31+j)*16;g.fillRect(rx,b-rh*(1+j%2)+6,34,rh*(1+j%2)+30)}
      /* 컨베이어 벨트 */
      var by=438-h*30,bx=x+20;g.fillRect(bx,by,150,7);g.fillRect(bx+12,by,5,90);g.fillRect(bx+130,by,5,90);
      g.fillStyle='#6d3a66';for(j=0;j<3;j++){var u=((t*.09+j/3+h)%1),px=bx+u*138;g.fillRect(px,by-11,12,11)}
      g.fillStyle='#2d1436';for(j=0;j<8;j++){var w=((t*14+j*19)%150);g.fillRect(bx+w,by+2,6,2)}})}
  var DUST=[];for(var di=0;di<26;di++)DUST.push([hash(di*3+1)*W,hash(di*3+2)*H,.4+hash(di*3+3)]);
  function dust(g,t){for(var i=0;i<DUST.length;i++){var d=DUST[i],x=((d[0]-st.cam*Z*.5*d[2]+t*6*d[2])%W+W)%W,y=(d[1]+Math.sin(t*.6+i)*14-t*5*d[2]%H+H*4)%H;
      g.globalAlpha=.18+.22*Math.abs(Math.sin(t*1.3+i*2));g.fillStyle=i%5?'#ffe6b8':'#ffb14a';g.beginPath();g.arc(x,y,i%5?1.3:1.9,0,6.3);g.fill()}g.globalAlpha=1}

  /* ---------- 월드 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function drawMag(g,m,ox,t,glow){var x=tx(ox+magX(m,t)),y=ty(m.y),w=m.w*Z,h=m.h*Z,on=magOn(m,t),c=pc(m.p),fy=y,fh=h,i;
    if(x>W+40||x+w<-40)return;
    if(m.k==='tram'){fh=18*Z;fy=y+h-fh;g.fillStyle='rgba(36,20,46,.9)';g.fillRect(x+w*.5-20,y,40,h-fh);g.fillStyle='#57345f';g.fillRect(x+w*.5-20,y,5,h-fh);
      g.fillStyle='#1d0f26';g.fillRect(-10,ty(-58),W+20,4);g.fillStyle='#cfc6d8';for(i=-1;i<=1;i+=2){g.beginPath();g.arc(x+w*.5+i*14,ty(-58)+2,6,0,6.3);g.fill()}
      g.fillStyle='#3a2244';rr(g,x-3,fy-10,w+6,12,4);g.fill()}
    var hum=on?(.16+glow*.5)*(1+.25*Math.sin(t*(14+glow*20))):0;
    if(hum>0){g.fillStyle=c;g.globalAlpha=Math.min(.5,hum*.5);rr(g,x-5,fy-5,w+10,fh+10,9);g.fill();g.globalAlpha=Math.min(.3,hum*.3);rr(g,x-11,fy-11,w+22,fh+22,14);g.fill();g.globalAlpha=1}
    g.fillStyle=on?c:'#6d6475';rr(g,x,fy,w,fh,5);g.fill();
    g.fillStyle=on?pd(m.p):'#4d4656';g.fillRect(x+2,fy+fh*.62,w-4,fh*.38-2);
    g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x+4,fy+2,w-8,2.5);
    g.fillStyle='#e9e4ee';g.fillRect(x,fy+2,5,fh-4);g.fillRect(x+w-5,fy+2,5,fh-4);
    if(m.pu){g.fillStyle='#ffc94a';for(i=14;i<w-12;i+=12)if((i/12|0)%4!==1)g.fillRect(x+i,fy,3,fh);}
    var n=Math.max(1,Math.round(w/62));g.font='800 14'+FONT;g.textAlign='center';g.textBaseline='middle';
    for(i=0;i<n;i++){var lx=x+w*(i+.5)/n;g.fillStyle='rgba(0,0,0,.35)';g.fillText(pl(m.p),lx+1,fy+fh/2+2);g.fillStyle='#fff';g.fillText(pl(m.p),lx,fy+fh/2+1)}
    if(m.pu){var u=(t/m.pu.per+m.pu.ph);u=(u-Math.floor(u))*m.pu.per;var cx=x+w/2,cy=m.k==='pad'?fy+fh+15:fy-15;
      g.fillStyle='#2a1736';g.beginPath();g.arc(cx,cy,10,0,6.3);g.fill();g.strokeStyle=on?'#ffe066':'#8a7f95';g.lineWidth=3.5;g.beginPath();
      if(on)g.arc(cx,cy,6,-1.57,-1.57+6.283*(1-u/m.pu.on));else g.arc(cx,cy,6,-1.57,-1.57+6.283*((u-m.pu.on)/(m.pu.per-m.pu.on)));g.stroke()}
    g.textBaseline='alphabetic'}
  function drawSolid(g,m,ox){var x=tx(ox+m.x),y=ty(m.y),w=m.w*Z,h=m.h*Z,i;if(x>W||x+w<0)return;
    if(m.gd){g.fillStyle='rgba(40,22,52,.78)';g.fillRect(x,y,w,h);g.strokeStyle='rgba(120,78,128,.55)';g.lineWidth=2;g.beginPath();
      for(i=0;i<w;i+=46){var a=Math.min(46,w-i);g.moveTo(x+i,y+h-6);g.lineTo(x+i+a,y+h-52);g.moveTo(x+i+a,y+h-6);g.lineTo(x+i,y+h-52);g.moveTo(x+i,y);g.lineTo(x+i,y+h)}g.stroke();
      g.fillStyle='#2a1736';g.fillRect(x,y+h-7,w,7);g.fillStyle='#7c5484';g.fillRect(x,y+h-56,w,3);
      g.fillStyle='#ffc94a';for(i=4;i<w-6;i+=16){g.beginPath();g.moveTo(x+i,y+h);g.lineTo(x+i+6,y+h);g.lineTo(x+i+10,y+h-5);g.lineTo(x+i+4,y+h-5);g.fill()}return}
    if(m.y<FY-20){g.fillStyle='#33203f';g.fillRect(x,y,w,h);g.fillStyle='#ffc94a';g.fillRect(x,y+h-9,w,9);g.fillStyle='#33203f';for(i=0;i<w;i+=10){g.beginPath();g.moveTo(x+i,y+h);g.lineTo(x+i+5,y+h);g.lineTo(x+i+9,y+h-9);g.lineTo(x+i+4,y+h-9);g.fill()}return}
    var gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#5b3040');gr.addColorStop(1,'#2c1528');g.fillStyle=gr;g.fillRect(x-.5,y,w+1,h+4);
    if(m.y===FY){g.fillStyle='#c98a5a';g.fillRect(x-.5,y,w+1,4);g.fillStyle='#8a5440';g.fillRect(x-.5,y+4,w+1,3);
      g.fillStyle='rgba(0,0,0,.22)';var o=(ox+m.x)%40;for(i=-o*Z;i<w;i+=40*Z){if(i>4&&i<w-6){g.beginPath();g.arc(x+i,y+14,2,0,6.3);g.fill()}}}}
  function drawPit(g,p,ox){var x=tx(ox+p.x),w=p.w*Z,y=ty(FY);if(x>W||x+w<0)return;var gr=g.createLinearGradient(0,y,0,H);gr.addColorStop(0,'rgba(60,24,58,.0)');gr.addColorStop(.5,'rgba(38,14,40,.75)');gr.addColorStop(1,'#1a0a20');
    g.fillStyle=gr;g.fillRect(x,y,w,H-y);if(p.sh)return;g.fillStyle='#e9dfd2';var n=Math.max(2,Math.round(w/14)),sw=w/n;
    for(var i=0;i<n;i++){g.beginPath();g.moveTo(x+i*sw,H);g.lineTo(x+i*sw+sw/2,H-58);g.lineTo(x+(i+1)*sw,H);g.fill()}
    g.fillStyle='#ffc94a';g.fillRect(x-8,y,8,4);g.fillRect(x+w,y,8,4)}
  function drawSpikes(g,m,ox){var x=tx(ox+m.x),w=m.w*Z,y=ty(m.y+m.h),h=m.h*Z+3;if(x>W||x+w<0)return;var n=Math.max(1,Math.round(w/9)),sw=w/n;
    for(var i=0;i<n;i++){g.fillStyle='#f3ece0';g.beginPath();g.moveTo(x+i*sw,y);g.lineTo(x+i*sw+sw/2,y-h);g.lineTo(x+(i+1)*sw,y);g.fill();
      g.fillStyle='#b9a9a0';g.beginPath();g.moveTo(x+i*sw+sw/2,y-h);g.lineTo(x+(i+1)*sw,y);g.lineTo(x+i*sw+sw*.55,y);g.fill()}}
  function drawBolt(g,x,y,t,i){var s=Math.cos(t*3+i*1.3),by=y+Math.sin(t*2.4+i)*2.5;g.save();g.translate(x,by);g.scale(.35+.65*Math.abs(s),1);
    g.fillStyle='#b8860b';g.beginPath();for(var k=0;k<6;k++){var a=k*1.047+.52;g.lineTo(Math.cos(a)*8.5,Math.sin(a)*8.5+1)}g.fill();
    g.fillStyle='#ffd75e';g.beginPath();for(k=0;k<6;k++){a=k*1.047+.52;g.lineTo(Math.cos(a)*8,Math.sin(a)*8-.5)}g.fill();
    g.fillStyle='#8a6408';g.beginPath();g.arc(0,-.5,3.2,0,6.3);g.fill();g.restore();
    g.fillStyle='rgba(255,255,255,.8)';g.fillRect(x+4,by-7,2,2)}
  function drawCrate(g,x,y,p){var r=CR*Z;g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x-r+2,y-r+3,2*r,2*r);g.fillStyle='#b9b2c2';rr(g,x-r,y-r,2*r,2*r,3);g.fill();
    g.fillStyle='#8e879a';g.fillRect(x-r,y+r-7,2*r,7);g.fillStyle=pc(p);g.fillRect(x-r,y-6,2*r,13);g.fillStyle='#fff';g.font='800 13'+FONT;g.textAlign='center';g.fillText(pl(p),x,y+5);
    g.fillStyle='#5f5869';[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){g.beginPath();g.arc(x+q[0]*(r-4),y+q[1]*(r-4),1.5,0,6.3);g.fill()})}
  function drawDrone(g,x,y,p,t,look){g.save();g.translate(x,y+Math.sin(t*5)*1.5);
    g.strokeStyle='#2a1736';g.lineWidth=2;g.beginPath();g.moveTo(0,-9);g.lineTo(0,-15);g.stroke();g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(0,-15,12*Math.abs(Math.sin(t*30)),2,0,0,6.3);g.fill();
    g.fillStyle='#3a2a48';g.beginPath();g.ellipse(0,0,13,10,0,0,6.3);g.fill();g.fillStyle=pc(p);g.beginPath();g.ellipse(0,5,13,5,0,0,3.15);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(0,-2,5.2,0,6.3);g.fill();g.fillStyle='#1b1024';g.beginPath();g.arc(look*2,-2,2.4,0,6.3);g.fill();
    g.strokeStyle='#1b1024';g.lineWidth=2;g.beginPath();g.moveTo(-6,-8);g.lineTo(5,-6.5);g.stroke();
    g.fillStyle='#fff';g.font='800 8'+FONT;g.textAlign='center';g.fillText(pl(p),0,9.5);g.restore()}
  function drawGate(g,ox,num,t,flash){var x=tx(ox),y=ty(FY);if(x>W+40||x<-40)return;g.fillStyle='#2a1736';g.fillRect(x-17,y-52,5,52);g.fillRect(x+12,y-52,5,52);
    g.fillStyle='#3d2550';rr(g,x-22,y-66,44,18,5);g.fill();g.fillStyle=NC;g.beginPath();g.arc(x-10,y-57,6,0,6.3);g.fill();
    g.fillStyle='#fff';g.font='800 9'+FONT;g.textAlign='center';g.fillText('N',x-10,y-54);g.font='800 12'+FONT;g.fillStyle='#ffe9b0';g.fillText(num,x+8,y-53);
    if(flash<.5){g.strokeStyle=NC;g.globalAlpha=1-flash*2;g.lineWidth=3;g.beginPath();g.ellipse(x,y-24,10+flash*40,26+flash*30,0,0,6.3);g.stroke();g.globalAlpha=1}}
  function drawLevel(g,L,ox,s,t,got,acts){var i,m;
    for(i=0;i<L.pits.length;i++)drawPit(g,L.pits[i],ox);
    for(i=0;i<L.solids.length;i++)if(L.solids[i].gd)drawSolid(g,L.solids[i],ox);
    for(i=0;i<L.solids.length;i++)if(!L.solids[i].gd&&!L.solids[i].tail)drawSolid(g,L.solids[i],ox);
    for(i=0;i<L.spikes.length;i++)drawSpikes(g,L.spikes[i],ox);
    for(i=0;i<L.mags.length;i++){var gl=0;if(acts)for(m=0;m<acts.length;m++)if(acts[m].i===i)gl=acts[m].f;drawMag(g,L.mags[i],ox,t,gl)}
    for(i=0;i<L.bolts.length;i++){if(got>>i&1)continue;m=L.bolts[i];var bx=tx(ox+m.x);if(bx>-20&&bx<W+20)drawBolt(g,bx,ty(m.y),st.t,i)}
    var cr=s?s.cr:L.crates;for(i=0;i<cr.length;i++)drawCrate(g,tx(ox+cr[i].x),ty(cr[i].y),cr[i].p);
    var dr=s?s.dr:L.drone;if(dr)drawDrone(g,tx(ox+dr.x),ty(dr.y),s?-s.pole:-1,st.t,s&&s.x<dr.x?-1:1)}

  /* ---------- 자기장 선 · 예상 궤적 ---------- */
  function fieldLines(g,acts,sx,sy,ox,t){for(var q=0;q<acts.length;q++){var a=acts[q];if(a.f<.02)continue;var bx=tx(ox+a.px),by=ty(a.py),dx=bx-sx,dy=by-sy,d=Math.sqrt(dx*dx+dy*dy);
      if(d<3)continue;var ux=dx/d,uy=dy/d,nx=-uy,ny=ux,al=Math.min(.95,.4+a.f*1.2),k;g.lineCap='round';
      if(!a.rep){g.strokeStyle='rgba(200,255,244,'+al+')';g.lineWidth=1.8;g.setLineDash([7,6]);g.lineDashOffset=-t*70;
        for(k=-1;k<=1;k++){g.beginPath();g.moveTo(sx+nx*k*9,sy+ny*k*9);g.quadraticCurveTo((sx+bx)/2+nx*k*(10+d*.12),(sy+by)/2+ny*k*(10+d*.12),bx+nx*k*3,by+ny*k*3);g.stroke()}
        g.setLineDash([])}
      else{var ang=Math.atan2(-dy,-dx);g.lineWidth=2.2;
        for(k=0;k<3;k++){var u=(t*1.6+k/3)%1,r=6+Math.max(0,d-14)*u;g.strokeStyle='rgba(255,214,130,'+(al*(1-u*.75))+')';g.beginPath();g.arc(bx,by,r,ang-.55+u*.3,ang+.55-u*.3);g.stroke();
          g.strokeStyle='rgba(255,214,130,'+(al*.6*u)+')';g.beginPath();g.arc(sx,sy,15+4*Math.sin(u*3.14),ang+3.14-.7,ang+3.14+.7);g.stroke()}}}}
  function predict(g,L,s,ox,flip){var c=clone(s),col=pc(flip?-s.pole:s.pole),k=0;
    for(var n=0;n<108;n++){step(L,c,flip&&n===0);if(c.status===2){var x=tx(ox+c.x),y=Math.min(H-50,ty(c.y));g.globalAlpha=flip?.45:.8;g.strokeStyle=col;g.lineWidth=2;g.beginPath();g.moveTo(x-4,y-4);g.lineTo(x+4,y+4);g.moveTo(x+4,y-4);g.lineTo(x-4,y+4);g.stroke();break}
      if(c.status)break;if(n%9===8){k++;g.globalAlpha=(flip?.5:.85)*(1-n/125);g.fillStyle=flip?col:'#fff';g.beginPath();g.arc(tx(ox+c.x),ty(c.y),flip?2.6:2.1,0,6.3);g.fill();
        if(flip){g.globalAlpha*=.9;g.strokeStyle='#fff';g.lineWidth=.8;g.stroke()}}}
    g.globalAlpha=1}

  /* ---------- 주인공: 말굽자석 로봇 "자비" ---------- */
  function hero(g,x,y,pole,rot,vy,gr,dead,t){var k=gr?0:Math.min(.32,Math.abs(vy)/1100),ld=st.land*.28,c=pc(pole),d=pd(pole),i;
    g.save();g.translate(x,y);
    if(dead){g.rotate(t*18)}else g.rotate(rot);
    g.scale(Z*(1-k*.55+ld*.7),Z*(1+k-ld));
    /* 다리 */
    g.strokeStyle='#2a1736';g.lineWidth=2.4;g.lineCap='round';
    for(i=-1;i<=1;i+=2){var ph=st.legs+(i>0?3.14:0),fx=i*4.5+(gr?Math.sin(ph)*3.5:i*1.5),fyy=11.5-(gr?Math.max(0,Math.cos(ph))*2.5:-1.5);
      g.beginPath();g.moveTo(i*4,6);g.lineTo(fx,fyy);g.stroke();g.beginPath();g.moveTo(fx-1.5,fyy);g.lineTo(fx+3,fyy);g.stroke()}
    /* 말굽 몸통 */
    g.fillStyle='#2a1736';g.beginPath();g.moveTo(-12.5,-14.5);g.lineTo(-12.5,1);g.arc(0,1,12.5,3.1416,0,true);g.lineTo(12.5,-14.5);g.lineTo(4.5,-14.5);g.lineTo(4.5,-6);g.lineTo(-4.5,-6);g.lineTo(-4.5,-14.5);g.fill();
    g.fillStyle=c;g.beginPath();g.moveTo(-11,-9);g.lineTo(-11,1);g.arc(0,1,11,3.1416,0,true);g.lineTo(11,-9);g.lineTo(6,-9);g.lineTo(6,-5);g.lineTo(-6,-5);g.lineTo(-6,-9);g.fill();
    g.fillStyle=d;g.beginPath();g.arc(0,1,11,.35,2.8);g.fill();
    g.fillStyle='#eeeaf2';g.fillRect(-11,-13,5,4.5);g.fillRect(6,-13,5,4.5);
    g.fillStyle='rgba(255,255,255,.4)';g.fillRect(-10,-8,1.8,8);
    /* 얼굴판 */
    g.fillStyle='#fff3dc';g.beginPath();g.ellipse(0,1.5,8.2,7.2,0,0,6.3);g.fill();
    var bl=st.blink>0?.15:1,lx=gr===2?-1:1;
    if(dead){g.strokeStyle='#2a1736';g.lineWidth=1.5;for(i=-1;i<=1;i+=2){g.beginPath();g.moveTo(i*3.6-2,-1.5);g.lineTo(i*3.6+2,2.5);g.moveTo(i*3.6+2,-1.5);g.lineTo(i*3.6-2,2.5);g.stroke()}}
    else{for(i=-1;i<=1;i+=2){g.fillStyle='#fff';g.beginPath();g.ellipse(i*3.7,.3,3.3,3.5*bl,0,0,6.3);g.fill();g.strokeStyle='#2a1736';g.lineWidth=.8;g.stroke();
        g.fillStyle='#2a1736';g.beginPath();g.ellipse(i*3.7+lx*1.1,.6+(gr?0:Math.max(-1,Math.min(1,vy/400))),1.7,1.9*bl,0,0,6.3);g.fill();
        if(pole<0&&bl===1){g.fillStyle=c;g.fillRect(i*3.7-3.6,-3.6,7.2,2.6)}}
      g.strokeStyle='#2a1736';g.lineWidth=1.3;g.beginPath();
      if(!gr&&Math.abs(vy)>260){g.fillStyle='#2a1736';g.ellipse(0,6,1.6,2,0,0,6.3);g.fill()}
      else if(pole>0){g.arc(0,4.6,2.6,.25,2.9);g.stroke()}else{g.moveTo(-2,6);g.lineTo(2.4,5.2);g.stroke()}}
    g.fillStyle='#fff';g.font='800 8'+FONT;g.textAlign='center';g.fillText(pl(pole),0,-6.2);
    g.restore();
    if(st.flipT<.3){g.strokeStyle=c;g.globalAlpha=1-st.flipT/.3;g.lineWidth=3;g.beginPath();g.arc(x,y,14+st.flipT*90,0,6.3);g.stroke();g.globalAlpha=1}}

  function draw(g,a){if(!st)reset();var t=st.t,s=st.s,L=st.L,i;
    sky(g,t);farLayer(g,t);midLayer(g,t);dust(g,t);
    var acts=[];if(st.mode===0)field(L,s.t,s.x,s.y,R,s.pole,1,acts);
    if(st.ps)drawLevel(g,st.ps.L,st.ps.ox,st.ps.s,st.ps.s.t,st.ps.got|st.ps.s.bolts,null);
    var NL=lev(st.i+1);drawLevel(g,NL,st.ox+L.len,null,0,0,null);
    drawLevel(g,L,st.ox,s,s.t,st.got|s.bolts,acts);
    drawGate(g,st.ox,st.i+1,t,st.gateT);drawGate(g,st.ox+L.len,st.i+2,t,9);
    var hx,hy,dead=st.mode===1;
    if(dead){var u=ease(st.rw/.6);hx=tx(st.ox+st.rx*(1-u));hy=ty(st.ry+(FY-R-st.ry)*u)-Math.sin(u*3.14)*40}else{hx=tx(st.ox+s.x);hy=ty(s.y)}
    if(!dead&&!st.over){predict(g,L,s,st.ox,true);predict(g,L,s,st.ox,false);fieldLines(g,acts,hx,hy,st.ox,t)}
    if(!dead&&s.gr===1){g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(hx,hy+R*Z+1,11,3,0,0,6.3);g.fill()}
    hero(g,hx,hy,s.pole,st.rot,s.vy,s.gr,dead,t);
    for(i=0;i<st.sparks.length;i++){var p=st.sparks[i];g.globalAlpha=1-p.t/p.l;g.fillStyle=p.c;g.fillRect(tx(p.x)-1.5,ty(p.y)-1.5,3,3)}g.globalAlpha=1;
    /* 첫 구역: 지금 탭! 표시 */
    if(st.i===0&&!dead&&s.pole>0&&s.x>296&&s.x<392){g.font='800 17'+FONT;g.textAlign='center';var pu=1+.12*Math.sin(t*14);g.save();g.translate(hx,hy-42);g.scale(pu,pu);
      g.fillStyle='rgba(42,23,54,.75)';rr(g,-34,-16,68,23,10);g.fill();g.fillStyle='#ffe27a';g.fillText(a.lang==='ko'?'지금 탭!':'Tap now!',0,2);g.restore()}
    /* UI */
    var bw=196,bx=(W-bw)/2,by=40,fr=Math.min(1,st.T/70),low=st.T<10;g.fillStyle='rgba(30,14,40,.55)';rr(g,bx-3,by-3,bw+6,14,7);g.fill();
    g.fillStyle=low?(Math.sin(t*12)>0?'#ff6a5c':'#ffb0a6'):'#ffd75e';rr(g,bx,by,Math.max(8,bw*fr),8,4);g.fill();
    g.font='800 13'+FONT;g.fillStyle='#fff';g.textAlign='left';g.fillText(Math.ceil(st.T)+(a.lang==='ko'?'초':'s'),bx+bw+9,by+9);
    g.textAlign='right';g.fillText((a.lang==='ko'?'구역 ':'Zone ')+(st.i+1),bx-9,by+9);
    g.textAlign='center';g.font='800 12'+FONT;g.fillStyle='rgba(255,240,215,.92)';
    g.fillText((a.lang==='ko'?'뒤집기 ':'Flips ')+s.flips+' / '+(a.lang==='ko'?'목표 ':'par ')+parOf(st.i),W/2,by+27);
    if(st.i<HINTS.length){var hs=HINTS[st.i][a.lang];g.font='800 17'+FONT;var tw=g.measureText(hs).width;g.fillStyle='rgba(30,14,40,.5)';rr(g,W/2-tw/2-14,84,tw+28,30,15);g.fill();g.fillStyle='#fff6e0';g.fillText(hs,W/2,105)}
    if(st.clearT<1.3){g.globalAlpha=Math.min(1,(1.3-st.clearT)*3);g.font='800 22'+FONT;g.fillStyle='rgba(0,0,0,.35)';g.fillText(st.clearMsg,W/2+1,152-st.clearT*14+2);g.fillStyle='#ffe27a';g.fillText(st.clearMsg,W/2,152-st.clearT*14);g.globalAlpha=1}}

  if(typeof window!=='undefined')window.__mf=function(){return st?{i:st.i,x:st.s.x,y:st.s.y,t:st.s.t,pole:st.s.pole,gr:st.s.gr,mode:st.mode,T:st.T}:null};
  if(typeof module!=='undefined'&&module.exports)module.exports=CORE;
  if(typeof SG!=='undefined')SG.run({id:'magnet-flip',
    title:{ko:'자석 뒤집기',en:'Magnet Flip'},
    how:{ko:'나는 자석 로봇! 탭(스페이스)하면 N극·S극이 뒤집혀요. 같은 극은 밀고 다른 극은 끌어당겨요.',en:'You are a magnet robot! Tap (Space) to flip between N and S. Like poles push, opposite poles pull.'},
    init:function(a){reset()},update:update,draw:draw});
