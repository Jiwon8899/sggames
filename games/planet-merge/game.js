/* 행성 합치기 — 우주 유리병에 천체를 떨어뜨려 같은 것끼리 합친다. 1초 안에 이어지는 합체는 연쇄 배수가 붙는다. */
(function(){
  var L=35,R=325,B0=612,B=612,BT=612,DY=205,UY=80,G=1500,H_STEP=1/240;
  var TIERS=[
    {r:15,a:'#d9c7b3',b:'#6f5f55',f:'rock'},
    {r:21,a:'#f6f4ea',b:'#8a8fa8',f:'crater'},
    {r:28,a:'#c4f7ff',b:'#3d8fd1',f:'ice'},
    {r:36,a:'#ffbe94',b:'#c2472f',f:'cap'},
    {r:45,a:'#93e4ff',b:'#2664c9',f:'land'},
    {r:55,a:'#ffe9a8',b:'#d18a2c',f:'ring'},
    {r:66,a:'#dfbcff',b:'#6a3fc4',f:'stripe'},
    {r:78,a:'#ffb3da',b:'#c43f8c',f:'ring2'},
    {r:92,a:'#fffbd0',b:'#ffa41c',f:'star'}];
  var PTS=[0,2,5,10,18,30,48,75,120];
  var bodies,cur,next,dropX,cool,idleT,streak,chain,chainT,chainShow,time,wasDown,warn,dead,fill,aim,stars,nebs,comet,uid;

  function rndTier(){var x=Math.random();return x<.3?0:x<.56?1:x<.76?2:x<.9?3:4}
  function mk(x,y,tier){return{id:uid++,x:x,y:y,vx:0,vy:0,tier:tier,R:TIERS[tier].r,r:TIERS[tier].r,grow:1,landed:false,dt:0,sq:0,
    happy:0,blink:1+Math.random()*4,dead:false,seed:Math.random()*100}}

  function merge(p,q,a,out){
    p.dead=q.dead=true;var x=(p.x+q.x)/2,y=(p.y+q.y)/2,nt=p.tier+1;
    if(chainT>0)chain++;else chain=1;chainT=1;chainShow=1;
    a.sfx('coin');a.beep(330*Math.pow(2,Math.min(chain-1,14)*2/12),.16);
    if(p.tier===TIERS.length-1){var bonus=300*chain;a.add(bonus);a.burst(x,y,'#fff7b0',40);a.burst(x,y,'#ff9de0',30);
      a.pop(x,y-20,(a.lang==='ko'?'초신성! +':'Supernova! +')+bonus,'#fff36b');a.shake(12);a.sfx('win');return}
    var pts=PTS[nt]*chain,n=mk(x,y,nt);n.vx=(p.vx+q.vx)/2;n.vy=(p.vy+q.vy)/2;n.landed=true;n.grow=0;n.r=n.R*.7;n.happy=.9;n.sq=.6;
    out.push(n);a.add(pts);a.burst(x,y,TIERS[nt].a,10+nt*2);a.burst(x,y,'#ffffff',5);
    a.pop(x,y-n.R-6,'+'+pts+(chain>1?' x'+chain:''),chain>1?'#fff36b':'#ffffff');a.shake(3+nt*.7+Math.min(chain,6)*.6);
  }

  function step(h,a){
    var i,j,it,p,q,n=bodies.length,born=[];
    for(i=0;i<n;i++){p=bodies[i];p.vy+=G*h;p.vx*=.9985;p.vy*=.9995;p.x+=p.vx*h;p.y+=p.vy*h;
      if(p.grow<1){p.grow=Math.min(1,p.grow+h*7);p.r=p.R*(.7+.3*p.grow)}}
    for(it=0;it<3;it++){
      for(i=0;i<n;i++){p=bodies[i];if(p.dead)continue;
        for(j=i+1;j<n;j++){q=bodies[j];if(q.dead)continue;
          var dx=q.x-p.x,dy=q.y-p.y,rr=p.r+q.r;if(dx>rr||dx<-rr||dy>rr||dy<-rr)continue;
          var d2=dx*dx+dy*dy;if(d2>=rr*rr)continue;
          if(p.tier===q.tier){merge(p,q,a,born);break}
          var d=Math.sqrt(d2);if(d<.01){d=.01;dx=.01;dy=0}
          var nx=dx/d,ny=dy/d,ov=rr-d,mp=p.r*p.r,mq=q.r*q.r,wp=mq/(mp+mq),wq=1-wp;
          p.x-=nx*ov*wp;p.y-=ny*ov*wp;q.x+=nx*ov*wq;q.y+=ny*ov*wq;
          var rvx=q.vx-p.vx,rvy=q.vy-p.vy,vn=rvx*nx+rvy*ny;
          if(vn<0){var e=vn<-160?.12:0,jn=-(1+e)*vn;p.vx-=nx*jn*wp;p.vy-=ny*jn*wp;q.vx+=nx*jn*wq;q.vy+=ny*jn*wq;
            if(vn<-140){var s=Math.min(1,-vn/600);if(s>p.sq)p.sq=s;if(s>q.sq)q.sq=s}
            var tx=-ny,ty=nx,vt=rvx*tx+rvy*ty,f=vt*.04;p.vx+=tx*f*wp;p.vy+=ty*f*wp;q.vx-=tx*f*wq;q.vy-=ty*f*wq}
          if(p.landed||q.landed)p.landed=q.landed=true;
        }}
      for(i=0;i<n;i++){p=bodies[i];if(p.dead)continue;
        if(p.x<L+p.r){p.x=L+p.r;if(p.vx<0)p.vx*=-.2}
        if(p.x>R-p.r){p.x=R-p.r;if(p.vx>0)p.vx*=-.2}
        if(p.y>B-p.r){p.y=B-p.r;if(p.vy>0){if(p.vy>160)p.sq=Math.max(p.sq,Math.min(1,p.vy/700));p.vy=p.vy>160?-p.vy*.15:0}p.vx*=.985;p.landed=true}}
    }
    if(born.length||n&&bodies.some(function(b){return b.dead})){bodies=bodies.filter(function(b){return!b.dead});
      for(i=0;i<born.length;i++)bodies.push(born[i])}
  }

  function drop(a,auto){
    var r=TIERS[cur].r,x=Math.max(L+r,Math.min(R-r,dropX))+(Math.random()-.5),b=mk(x,UY+16+r,cur);
    b.vy=60;bodies.push(b);cur=-1;cool=.45;idleT=0;if(auto){streak++;BT=Math.max(DY+40,BT-5);if(streak<4)a.pop(a.W/2,B-14,a.lang==='ko'?'바닥 상승!':'Floor rising!','#ffb0e6')}else streak=0;a.sfx(auto?'tap':'jump');
  }

  /* ---------- 그리기 ---------- */
  function face(g,r,mood,blink){
    var ex=r*.33,ey=-r*.06,es=Math.max(1.8,r*.12),lw=Math.max(1.2,r*.07);
    g.fillStyle='rgba(255,120,150,.4)';g.beginPath();g.ellipse(-ex*1.55,ey+r*.2,es*1.3,es*.8,0,0,7);g.ellipse(ex*1.55,ey+r*.2,es*1.3,es*.8,0,0,7);g.fill();
    g.strokeStyle='#2b2140';g.fillStyle='#2b2140';g.lineWidth=lw;g.lineCap='round';g.lineJoin='round';
    if(mood===1){[-1,1].forEach(function(s){g.beginPath();g.moveTo(s*(ex+es),ey-es);g.lineTo(s*(ex-es*.6),ey);g.lineTo(s*(ex+es),ey+es);g.stroke()});
      g.beginPath();g.ellipse(0,ey+r*.3,es*.7,es*.9,0,0,7);g.fill()}
    else if(mood===2){[-1,1].forEach(function(s){g.fillStyle='#fff';g.beginPath();g.arc(s*ex,ey,es*1.5,0,7);g.fill();
        g.fillStyle='#2b2140';g.beginPath();g.arc(s*ex,ey+es*.2,es*.6,0,7);g.fill()});
      g.beginPath();g.moveTo(-es*1.6,ey+r*.34);g.quadraticCurveTo(-es*.8,ey+r*.24,0,ey+r*.34);g.quadraticCurveTo(es*.8,ey+r*.44,es*1.6,ey+r*.34);g.stroke();
      g.fillStyle='#9fe3ff';g.beginPath();g.moveTo(r*.62,-r*.5);g.quadraticCurveTo(r*.78,-r*.25,r*.62,-r*.22);g.quadraticCurveTo(r*.46,-r*.25,r*.62,-r*.5);g.fill()}
    else if(mood===3){[-1,1].forEach(function(s){g.beginPath();g.arc(s*ex,ey+es*.5,es,Math.PI*1.1,Math.PI*1.9);g.stroke()});
      g.beginPath();g.arc(0,ey+r*.2,es*1.3,0,Math.PI);g.closePath();g.fill();
      g.fillStyle='#ff7d9c';g.beginPath();g.arc(0,ey+r*.2+es*.8,es*.6,0,7);g.fill()}
    else{if(blink){g.beginPath();g.moveTo(-ex-es,ey);g.lineTo(-ex+es,ey);g.moveTo(ex-es,ey);g.lineTo(ex+es,ey);g.stroke()}
      else{g.beginPath();g.arc(-ex,ey,es,0,7);g.arc(ex,ey,es,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(-ex-es*.3,ey-es*.35,es*.38,0,7);g.arc(ex-es*.3,ey-es*.35,es*.38,0,7);g.fill()}
      g.beginPath();g.arc(0,ey+r*.16,es*1.2,Math.PI*.15,Math.PI*.85);g.stroke()}
  }
  function ringPart(g,r,front,c1,c2){
    g.save();g.rotate(-.32);g.lineCap='round';
    var s=front?0:Math.PI,e=front?Math.PI:Math.PI*2;
    g.strokeStyle=c1;g.lineWidth=r*.16;g.beginPath();g.ellipse(0,0,r*1.36,r*.36,0,s,e);g.stroke();
    g.strokeStyle=c2;g.lineWidth=r*.05;g.beginPath();g.ellipse(0,0,r*1.36,r*.36,0,s,e);g.stroke();
    g.restore();
  }
  function drawBody(g,x,y,tier,r,o,T){
    var d=TIERS[tier],f=d.f,sq=o.sq||0,sd=o.seed||0,i;
    g.save();g.translate(x,y+r*sq*.1);g.rotate(o.tilt||0);g.scale(1+sq*.13,1-sq*.13);
    if(f==='star'){var gl=g.createRadialGradient(0,0,r*.7,0,0,r*1.45);gl.addColorStop(0,'rgba(255,214,90,.55)');gl.addColorStop(1,'rgba(255,170,40,0)');
      g.fillStyle=gl;g.beginPath();g.arc(0,0,r*1.45,0,7);g.fill();
      g.fillStyle='rgba(255,226,120,.8)';g.beginPath();for(i=0;i<24;i++){var an=i/24*6.283+T*.3,rr=i%2?r*1.02:r*(1.16+.04*Math.sin(T*3+i));
        g.lineTo(Math.cos(an)*rr,Math.sin(an)*rr)}g.closePath();g.fill()}
    else if(tier>=5){var gg=g.createRadialGradient(0,0,r*.8,0,0,r*1.25);gg.addColorStop(0,'rgba(255,255,255,.22)');gg.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=gg;g.beginPath();g.arc(0,0,r*1.25,0,7);g.fill()}
    if(f==='ring')ringPart(g,r,false,'rgba(255,214,150,.9)','rgba(170,110,40,.8)');
    if(f==='ring2')ringPart(g,r,false,'rgba(170,240,255,.9)','rgba(90,120,220,.8)');
    var gr=g.createRadialGradient(-r*.35,-r*.4,r*.1,0,0,r*1.05);gr.addColorStop(0,d.a);gr.addColorStop(1,d.b);
    g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,7);g.fill();
    g.save();g.beginPath();g.arc(0,0,r,0,7);g.clip();
    if(f==='rock'||f==='crater'){g.fillStyle='rgba(60,50,70,.22)';[[.5,-.45,.2],[-.55,.5,.24],[.45,.6,.15],[-.6,-.55,.13]].forEach(function(c){
        g.beginPath();g.arc(c[0]*r,c[1]*r,c[2]*r,0,7);g.fill()});
      g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=1;g.beginPath();g.arc(.5*r,-.45*r,.2*r,.5,2.6);g.stroke()}
    else if(f==='ice'){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=r*.09;g.lineCap='round';
      g.beginPath();g.moveTo(-r,-r*.55);g.quadraticCurveTo(0,-r*.8,r,-r*.5);g.moveTo(-r,r*.62);g.quadraticCurveTo(0,r*.82,r,r*.55);g.stroke()}
    else if(f==='cap'){g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.ellipse(0,-r*.98,r*.6,r*.26,0,0,7);g.fill();
      g.fillStyle='rgba(120,30,20,.25)';g.beginPath();g.ellipse(-r*.5,r*.6,r*.34,r*.14,.3,0,7);g.ellipse(r*.55,r*.5,r*.22,r*.1,-.4,0,7);g.fill()}
    else if(f==='land'){g.fillStyle='rgba(110,220,130,.9)';g.beginPath();g.ellipse(-r*.62,-r*.5,r*.36,r*.24,.5,0,7);g.ellipse(r*.66,r*.5,r*.34,r*.3,-.5,0,7);
      g.ellipse(-r*.4,r*.78,r*.4,r*.18,0,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(r*.45,-r*.66,r*.3,r*.09,0,0,7);g.ellipse(-r*.1,r*.52,r*.26,r*.07,0,0,7);g.fill()}
    else if(f==='ring'||f==='stripe'||f==='ring2'){g.fillStyle=f==='stripe'?'rgba(255,255,255,.2)':'rgba(255,255,255,.22)';
      [-.62,.5,.8].forEach(function(k,n){g.beginPath();g.ellipse(0,k*r,r*1.1,r*(n?.07:.1),0,0,7);g.fill()});
      if(f==='stripe'){g.fillStyle='rgba(60,20,120,.3)';g.beginPath();g.ellipse(r*.55,r*.56,r*.2,r*.11,0,0,7);g.fill()}}
    else if(f==='star'){g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(-r*.2,-r*.25,r*.6,0,7);g.fill();
      g.fillStyle='rgba(255,120,20,.25)';g.beginPath();g.arc(r*.6,r*.6,r*.16,0,7);g.arc(-r*.66,r*.5,r*.1,0,7);g.fill()}
    var sh=g.createRadialGradient(-r*.3,-r*.35,r*.5,0,0,r*1.08);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,f==='star'?'rgba(255,120,0,.3)':'rgba(10,5,40,.42)');
    g.fillStyle=sh;g.fillRect(-r,-r,r*2,r*2);g.restore();
    g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.ellipse(-r*.42,-r*.52,r*.2,r*.11,-.7,0,7);g.fill();
    if(f==='ring')ringPart(g,r,true,'rgba(255,224,160,.95)','rgba(170,110,40,.8)');
    if(f==='ring2')ringPart(g,r,true,'rgba(190,245,255,.95)','rgba(90,120,220,.8)');
    if(o.red>0){g.fillStyle='rgba(255,60,60,'+(.35*o.red*(.6+.4*Math.sin(T*18)))+')';g.beginPath();g.arc(0,0,r,0,7);g.fill()}
    face(g,r,o.mood||0,o.blink);
    g.restore();
  }
  function ufo(g,x,y,T){
    g.save();g.translate(x,y+Math.sin(T*4)*1.5);
    g.fillStyle='rgba(160,240,255,.75)';g.beginPath();g.arc(0,-4,10,Math.PI,0);g.fill();
    g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(-4,-9,3,1.6,-.5,0,7);g.fill();
    var gr=g.createLinearGradient(0,-6,0,7);gr.addColorStop(0,'#e9edff');gr.addColorStop(1,'#7c86c9');
    g.fillStyle=gr;g.beginPath();g.ellipse(0,0,24,7.5,0,0,7);g.fill();
    for(var i=-2;i<=2;i++){g.fillStyle=(Math.floor(T*5)+i)%2?'#fff36b':'#ff8fc7';g.beginPath();g.arc(i*8.5,1.5,1.8,0,7);g.fill()}
    g.restore();
  }
  function jarPath(g,l,t,r,b,c){g.beginPath();g.moveTo(l,t);g.lineTo(l,b-c);g.quadraticCurveTo(l,b,l+c,b);g.lineTo(r-c,b);g.quadraticCurveTo(r,b,r,b-c);g.lineTo(r,t)}

  SG.run({
    id:'planet-merge',
    title:{ko:'행성 합치기',en:'Planet Merge'},
    how:{ko:'같은 천체끼리 닿으면 합쳐져요. 끌어서 조준하고 떼면 떨어집니다. 위험선을 넘기지 마세요!',
         en:'Matching bodies merge. Drag to aim, release to drop. Keep them under the danger line!'},
    init:function(a){uid=1;B=BT=B0;bodies=[];cur=rndTier();next=rndTier();dropX=a.W/2;cool=0;idleT=0;streak=0;chain=0;chainT=0;chainShow=0;time=0;
      wasDown=false;aim=null;warn=0;dead=null;fill=0;
      if(!stars){stars=[];for(var i=0;i<70;i++)stars.push({x:Math.random()*a.W,y:Math.random()*a.H,s:Math.random(),l:i%3?0:1,p:Math.random()*6.28});
        nebs=[{x:70,y:180,r:190,c:'120,70,220',v:5},{x:300,y:430,r:220,c:'40,150,220',v:-4},{x:160,y:610,r:170,c:'230,80,170',v:3}];
        comet={x:-80,y:60,w:3}}},
    update:function(dt,inp,a){
      time+=dt;
      /* 조준 */
      if(inp.x!=null)dropX+=(inp.x-dropX)*Math.min(1,dt*22);
      if(inp.left)dropX-=250*dt;if(inp.right)dropX+=250*dt;
      var cr=cur>=0?TIERS[cur].r:TIERS[next].r;dropX=Math.max(L+cr,Math.min(R-cr,dropX));
      /* 떨어뜨리기: 손을 떼거나, 스페이스, 또는 방치 시 자동 */
      var rel=wasDown&&!inp.down,key=inp.tap&&!inp.down;wasDown=inp.down;
      if(inp.down&&inp.x!=null)aim=inp.x;else if(rel&&aim!=null){dropX=Math.max(L+cr,Math.min(R-cr,aim));aim=null}
      else if(key&&inp.x!=null&&!inp.left&&!inp.right)dropX=Math.max(L+cr,Math.min(R-cr,inp.x));
      if(cur<0){cool-=dt;if(cool<=0){cur=next;next=rndTier();idleT=0}}
      else if(time>.25){idleT+=dt;var lim=Math.max(.2,3*Math.pow(.55,streak));
        if(rel||key)drop(a,false);else if(idleT>=lim)drop(a,true)}
      /* 물리 */
      if(B>BT)B=Math.max(BT,B-40*dt);
      var st=Math.max(1,Math.min(12,Math.round(dt/H_STEP)));for(var s=0;s<st;s++)step(dt/st,a);
      if(chainT>0){chainT-=dt;if(chainT<=0)chain=0}
      chainShow=Math.max(0,chainShow-dt*.9);
      /* 상태, 위험선 */
      var top=B,w=0,i,b;
      for(i=0;i<bodies.length;i++){b=bodies[i];b.sq=Math.max(0,b.sq-dt*3.5);b.happy=Math.max(0,b.happy-dt);
        b.blink-=dt;if(b.blink<-.13)b.blink=1.5+Math.random()*4;
        if(b.landed){if(b.y-b.r<top)top=b.y-b.r;
          if(b.y-b.r<DY){b.dt+=dt;if(b.dt>w)w=b.dt;if(b.dt>=2&&!dead)dead=b}else b.dt=Math.max(0,b.dt-dt*3)}}
      warn=Math.min(1,w/2);fill=Math.max(0,Math.min(1,(B0-top)/(B0-DY)));a.tempo(1+fill*.6);
      if(dead){a.burst(dead.x,dead.y,'#ff6b6b',26);a.burst(dead.x,dead.y,TIERS[dead.tier].a,18);
        a.pop(dead.x,dead.y-dead.r-8,a.lang==='ko'?'넘쳤다!':'Overflow!','#ffb0b0');a.over()}
    },
    draw:function(g,a){
      var W=a.W,H=a.H,T=Date.now()/1000%100000,i,b,ko=a.lang==='ko';
      var bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0b0a2a');bg.addColorStop(.55,'#231451');bg.addColorStop(1,'#4a1d63');
      g.fillStyle=bg;g.fillRect(-20,-20,W+40,H+40);
      nebs.forEach(function(n,k){var x=((n.x+T*n.v)%(W+300)+W+300)%(W+300)-150,y=n.y+Math.sin(T*.2+k)*18,
        gr=g.createRadialGradient(x,y,0,x,y,n.r);gr.addColorStop(0,'rgba('+n.c+',.3)');gr.addColorStop(1,'rgba('+n.c+',0)');
        g.fillStyle=gr;g.fillRect(x-n.r,y-n.r,n.r*2,n.r*2)});
      for(i=0;i<stars.length;i++){var s=stars[i],v=s.l?9:3,sx=((s.x-T*v)%W+W)%W,tw=.45+.55*Math.sin(T*(1.5+s.s*2.5)+s.p),sz=s.l?1.1+s.s*1.3:.6+s.s*.7;
        g.globalAlpha=(s.l?.5:.3)+.5*tw*tw;g.fillStyle=s.s>.8?'#ffe9a8':'#fff';
        if(s.l&&s.s>.6){g.beginPath();g.moveTo(sx,s.y-sz*2.4);g.lineTo(sx+sz*.6,s.y-sz*.6);g.lineTo(sx+sz*2.4,s.y);g.lineTo(sx+sz*.6,s.y+sz*.6);
          g.lineTo(sx,s.y+sz*2.4);g.lineTo(sx-sz*.6,s.y+sz*.6);g.lineTo(sx-sz*2.4,s.y);g.lineTo(sx-sz*.6,s.y-sz*.6);g.fill()}
        else{g.beginPath();g.arc(sx,s.y,sz,0,7);g.fill()}}
      g.globalAlpha=1;
      var ct=T%9,cx=-60+ct*150,cy=40+ct*70+Math.floor(T/9)%3*90;
      if(ct<4){var cg=g.createLinearGradient(cx,cy,cx-70,cy-33);cg.addColorStop(0,'rgba(200,240,255,.9)');cg.addColorStop(1,'rgba(200,240,255,0)');
        g.strokeStyle=cg;g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(cx,cy);g.lineTo(cx-70,cy-33);g.stroke();
        g.fillStyle='#fff';g.beginPath();g.arc(cx,cy,2.6,0,7);g.fill()}
      /* 유리병 */
      var jl=L-5,jr=R+5,jb=B0+5,jt=DY-22;
      jarPath(g,jl,jt,jr,jb,22);var jg=g.createLinearGradient(0,jt,0,jb);jg.addColorStop(0,'rgba(150,190,255,.05)');jg.addColorStop(1,'rgba(150,190,255,.17)');
      g.fillStyle=jg;g.fill();
      g.fillStyle='rgba(255,255,255,.06)';g.fillRect(jl+12,jt+14,10,jb-jt-60);
      if(B<B0-.5){g.save();jarPath(g,jl,jt,jr,jb,22);g.clip();var fg=g.createLinearGradient(0,B,0,jb);fg.addColorStop(0,'rgba(255,120,220,.75)');fg.addColorStop(1,'rgba(90,40,170,.75)');
        g.fillStyle=fg;g.beginPath();g.moveTo(jl,jb);g.lineTo(jl,B);for(var wx=jl;wx<=jr;wx+=10)g.lineTo(wx,B+Math.sin(wx*.08+T*3)*1.5);g.lineTo(jr,jb);g.fill();
        g.fillStyle='rgba(255,255,255,.5)';for(var k2=0;k2<8;k2++){var px=jl+((k2*47+T*12)%(jr-jl)),py=B+6+(k2*13)%Math.max(1,jb-B-6);g.beginPath();g.arc(px,py,1.2,0,7);g.fill()}g.restore()}
      /* 위험선 */
      var da=.45+.55*warn*(.5+.5*Math.sin(T*16));
      g.strokeStyle='rgba(255,'+Math.round(120-70*warn)+','+Math.round(140-80*warn)+','+da+')';g.lineWidth=2+warn*2;g.setLineDash([9,7]);g.lineDashOffset=-T*14;
      g.beginPath();g.moveTo(L,DY);g.lineTo(R,DY);g.stroke();g.setLineDash([]);
      g.font='700 11px Jua,system-ui,sans-serif';g.textAlign='right';g.fillStyle='rgba(255,150,170,'+(.6+.4*warn)+')';
      g.fillText(ko?'위험선':'DANGER',R-4,DY-5);
      /* 조준선, 들고 있는 천체 */
      if(cur>=0){var hr=TIERS[cur].r,hx=Math.max(L+hr,Math.min(R-hr,dropX)),hy=UY+16+hr;
        g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=2;g.setLineDash([3,9]);g.lineDashOffset=-T*30;
        g.beginPath();g.moveTo(hx,hy+hr+4);g.lineTo(hx,B);g.stroke();g.setLineDash([]);
        var bm=g.createLinearGradient(0,UY,0,hy+hr);bm.addColorStop(0,'rgba(170,240,255,.4)');bm.addColorStop(1,'rgba(170,240,255,0)');
        g.fillStyle=bm;g.beginPath();g.moveTo(hx-9,UY+4);g.lineTo(hx+9,UY+4);g.lineTo(hx+hr+6,hy+hr);g.lineTo(hx-hr-6,hy+hr);g.fill();
        drawBody(g,hx,hy+Math.sin(T*4)*1.5,cur,hr,{mood:0,blink:T%3.2<.13,seed:1},T);
        var lim=Math.max(.2,3*Math.pow(.55,streak)),k=Math.min(1,idleT/lim);
        if(k>.02){g.strokeStyle='rgba(255,243,107,.85)';g.lineWidth=3;g.lineCap='round';g.beginPath();g.arc(hx,hy,hr+6,-1.5708,-1.5708+6.283*k);g.stroke()}}
      ufo(g,cur>=0?Math.max(L+TIERS[cur].r,Math.min(R-TIERS[cur].r,dropX)):dropX,UY,T);
      /* 천체들 */
      for(i=0;i<bodies.length;i++){b=bodies[i];var dang=b.landed&&b.y-b.r<DY+26,
        mood=b.sq>.3?1:dang||warn>.3&&b.y-b.r<DY+70?2:b.happy>0?3:0;
        drawBody(g,b.x,b.y,b.tier,b.r,{sq:b.sq,tilt:Math.max(-.35,Math.min(.35,b.vx*.004)),mood:mood,blink:b.blink<0,seed:b.seed,red:b.dt>.15?Math.min(1,b.dt/2):0},T)}
      /* 유리병 테두리 */
      jarPath(g,jl,jt,jr,jb,22);g.strokeStyle='rgba(190,220,255,.75)';g.lineWidth=4;g.lineJoin='round';g.lineCap='round';g.stroke();
      jarPath(g,jl,jt,jr,jb,22);g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1.2;g.stroke();
      g.fillStyle='rgba(190,220,255,.85)';g.beginPath();g.arc(jl,jt,4,0,7);g.arc(jr,jt,4,0,7);g.fill();
      /* 다음 천체 */
      g.fillStyle='rgba(20,14,60,.6)';g.strokeStyle='rgba(190,220,255,.45)';g.lineWidth=1.5;
      g.beginPath();g.arc(36,150,25,0,7);g.fill();g.stroke();
      g.font='700 12px Jua,system-ui,sans-serif';g.textAlign='center';g.fillStyle='#cfe0ff';g.fillText(ko?'다음':'NEXT',36,118);
      drawBody(g,36,150,next,Math.min(17,TIERS[next].r),{mood:0,blink:(T+1)%4<.13,seed:2},T);
      /* 연쇄 */
      if(chain>=2&&chainShow>0){var al=Math.min(1,chainShow*2.2),sc=1+Math.max(0,chainShow-.75)*1.6;
        g.save();g.translate(W/2+10,150);g.scale(sc,sc);g.globalAlpha=al;g.textAlign='center';
        g.font='800 '+(24+Math.min(chain,8)*2)+'px Jua,system-ui,sans-serif';var tx=ko?'연쇄 x'+chain:'CHAIN x'+chain;
        g.lineWidth=5;g.strokeStyle='rgba(60,20,110,.9)';g.lineJoin='round';g.strokeText(tx,0,0);
        g.fillStyle=chain>=5?'#ff9de0':chain>=3?'#ffb86b':'#fff36b';g.fillText(tx,0,0);
        g.globalAlpha=al*.9;g.fillStyle='rgba(255,255,255,.25)';g.fillRect(-40,9,80,4);g.fillStyle='#fff36b';g.fillRect(-40,9,80*Math.max(0,chainT),4);
        g.restore();g.globalAlpha=1}
      if(warn>.05){var vg=g.createLinearGradient(0,0,0,DY+60);vg.addColorStop(0,'rgba(255,40,70,'+(.3*warn)+')');vg.addColorStop(1,'rgba(255,40,70,0)');
        g.fillStyle=vg;g.fillRect(-20,-20,W+40,DY+80)}
    }
  });
})();
