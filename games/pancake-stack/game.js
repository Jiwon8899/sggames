/* 팬케이크 탑 — 좌우로 미끄러지는 팬케이크를 타이밍 맞춰 떨어뜨려 쌓는다 */
(function(){
  var PH=20,Y0=548,F=' Jua, system-ui, sans-serif';
  var layers,top,n,cam,streak,t,autoN,debris,dead,deadT,cur,clouds,stars,happy,nextTop,best;
  function mix(c1,c2,k){return 'rgb('+Math.round(c1[0]+(c2[0]-c1[0])*k)+','+Math.round(c1[1]+(c2[1]-c1[1])*k)+','+Math.round(c1[2]+(c2[2]-c1[2])*k)+')'}
  function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function spawn(a){var w=top.w,side=n%2?1:-1,type=null;
    if(n>2&&--nextTop<=0){type=Math.random()<.5?'butter':'berry';nextTop=4+Math.floor(Math.random()*3)}
    cur={w:w,x:side<0?w/2+6:a.W-w/2-6,dir:-side,t:0,st:'slide',y:Y0-(n+1)*PH-100,type:type,rot:0,vy:0,auto:false}}
  function land(a){
    var ko=a.lang==='ko',dx=cur.x-top.x,adx=Math.abs(dx),sy=cur.y+cam,perfect=!cur.auto&&adx<=5,pts,x,w;
    if(perfect){x=top.x;w=Math.min(150,cur.w+12);streak++;pts=5+Math.min(streak,8)*2;
      a.beep(523*Math.pow(2,Math.min(streak,14)/12),.2,'triangle');a.burst(x,sy+PH/2,'#fff36b',14);a.burst(x,sy+PH/2,'#ffffff',6);
      a.pop(x,sy-14,(ko?'완벽! ':'Perfect! ')+(streak>1?'x'+streak+' ':'')+'+'+pts,'#fff36b');happy=.8;a.shake(3)}
    else{var l=Math.max(cur.x-cur.w/2,top.x-top.w/2),r=Math.min(cur.x+cur.w/2,top.x+top.w/2);
      if(cur.auto){if(dx>=0)r-=32;else l+=32}
      w=r-l;x=(l+r)/2;
      if(w<10){dead=true;deadT=.75;cur.st='miss';cur.dir=dx>=0?1:-1;cur.vy=120;a.sfx('hit');a.shake(6);
        a.pop(cur.x,sy-14,cur.auto?(ko?'졸았다!':'Too slow!'):(ko?'앗!':'Oops!'),'#ffd0d0');return}
      var cw=cur.w-w;if(cw>2&&debris.length<8)debris.push({x:dx>=0?r+cw/2:l-cw/2,y:cur.y,w:cw,vx:(dx>=0?1:-1)*(40+Math.random()*40),vy:-60,rot:0,vr:(dx>=0?1:-1)*(2+Math.random()*3)});
      streak=0;pts=2;a.sfx('tap');a.burst(dx>=0?r:l,sy+PH/2,'#e8b25a',7);a.shake(1.5);
      a.pop(x,sy-14,cur.auto?(ko?'졸았다! +2':'Too slow! +2'):'+2',cur.auto?'#ffd0d0':'#ffffff')}
    if(cur.type){pts+=10;a.sfx('coin');a.burst(x,sy-4,cur.type==='butter'?'#ffe066':'#ff5a6e',12);
      a.pop(x,sy-38,(cur.type==='butter'?(ko?'버터 ':'Butter '):(ko?'딸기 ':'Berry '))+'+10','#ffb3c7');happy=Math.max(happy,.6)}
    layers.push({i:n,x:x,w:w,type:cur.type,sq:1,gold:perfect});if(layers.length>36)layers.shift();
    n++;top={x:x,w:w};a.add(pts);a.tempo(1+n*.02);autoN=cur.auto?autoN+1:0;spawn(a)}
  function pancake(g,cx,y,w,type,face,mood,look){
    var x=cx-w/2,bg=g.createLinearGradient(0,y,0,y+PH);bg.addColorStop(0,'#ffe2a0');bg.addColorStop(1,'#e3a44e');
    g.fillStyle=bg;rr(g,x,y,w,PH,9);g.fill();
    var cg=g.createLinearGradient(0,y,0,y+8);cg.addColorStop(0,'#d9954a');cg.addColorStop(1,'#b9712c');
    g.fillStyle=cg;rr(g,x,y,w,8,8);g.fill();
    g.fillStyle='rgba(255,255,255,.4)';rr(g,x+5,y+1.5,Math.max(0,w-10)*.6,2,1);g.fill();
    g.fillStyle='rgba(120,60,10,.18)';rr(g,x+2,y+PH-4,Math.max(0,w-4),4,3);g.fill();
    if(type&&w>18){
      if(type==='butter'){g.fillStyle='#c8791c';rr(g,cx-Math.min(w/2-2,22),y-1,Math.min(w-4,44),5,3);g.fill();
        g.beginPath();g.ellipse(cx-Math.min(w/2-5,18),y+6,3,6,0,0,7);g.ellipse(cx+Math.min(w/2-6,14),y+4,2.5,4.5,0,0,7);g.fill();
        var bg2=g.createLinearGradient(0,y-9,0,y);bg2.addColorStop(0,'#fff6a8');bg2.addColorStop(1,'#ffd23e');g.fillStyle=bg2;rr(g,cx-8,y-9,16,9,2);g.fill();
        g.fillStyle='rgba(255,255,255,.7)';g.fillRect(cx-6,y-8,7,2)}
      else{g.fillStyle='#fffaf0';g.beginPath();g.ellipse(cx,y,13,5,0,0,7);g.ellipse(cx-7,y-2,6,5,0,0,7);g.ellipse(cx+7,y-2,6,5,0,0,7);g.fill();
        var sg=g.createRadialGradient(cx-2,y-12,1,cx,y-9,9);sg.addColorStop(0,'#ff8a96');sg.addColorStop(1,'#e22b47');g.fillStyle=sg;
        g.beginPath();g.moveTo(cx-8,y-12);g.quadraticCurveTo(cx-9,y-2,cx,y);g.quadraticCurveTo(cx+9,y-2,cx+8,y-12);g.quadraticCurveTo(cx,y-18,cx-8,y-12);g.fill();
        g.fillStyle='#4fae4a';g.beginPath();g.ellipse(cx-3,y-15,4,2,-.4,0,7);g.ellipse(cx+3,y-15,4,2,.4,0,7);g.fill();
        g.fillStyle='#ffe9a8';g.beginPath();g.arc(cx-3,y-8,.9,0,7);g.arc(cx+3,y-9,.9,0,7);g.arc(cx,y-4,.9,0,7);g.fill()}}
    if(face&&w>34){var ey=y+13,lx=(look||0)*1.5;g.fillStyle='rgba(255,120,120,.45)';g.beginPath();g.ellipse(cx-13,ey+2,3.5,2,0,0,7);g.ellipse(cx+13,ey+2,3.5,2,0,0,7);g.fill();
      g.fillStyle='#4a2a12';
      if(mood==='happy'){g.strokeStyle='#4a2a12';g.lineWidth=1.6;g.lineCap='round';g.beginPath();g.arc(cx-7,ey+1,2.4,3.4,6);g.stroke();g.beginPath();g.arc(cx+7,ey+1,2.4,3.4,6);g.stroke();
        g.beginPath();g.arc(cx,ey+1,2.2,.2,2.9);g.stroke()}
      else{var er=mood==='scared'?2.8:2.1;g.beginPath();g.arc(cx-7+lx,ey,er,0,7);g.arc(cx+7+lx,ey,er,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(cx-7.6+lx,ey-.8,.8,0,7);g.arc(cx+6.4+lx,ey-.8,.8,0,7);g.fill();
        g.fillStyle='#4a2a12';if(mood==='scared'){g.beginPath();g.ellipse(cx,ey+3,1.8,2.2,0,0,7);g.fill()}
        else{g.strokeStyle='#4a2a12';g.lineWidth=1.3;g.lineCap='round';g.beginPath();g.arc(cx,ey+1,1.8,.3,2.8);g.stroke()}}}}
  SG.run({
    id:'pancake-stack',
    title:{ko:'팬케이크 탑',en:'Pancake Stack'},
    how:{ko:'탭 또는 스페이스로 팬케이크를 떨어뜨려요. 딱 맞추면 완벽 보너스!',en:'Tap or press Space to drop the pancake. Line it up for a Perfect bonus!'},
    init:function(a){layers=[];top={x:a.W/2,w:130};n=0;cam=0;streak=0;t=0;autoN=0;debris=[];dead=false;deadT=0;happy=0;nextTop=3;
      clouds=[];for(var i=0;i<6;i++)clouds.push({x:Math.random()*a.W,y:i*120+Math.random()*60,s:.6+Math.random()*.7,v:8+Math.random()*14});
      stars=[];for(var j=0;j<34;j++)stars.push({x:Math.random()*a.W,y:Math.random()*700,r:.7+Math.random()*1.5,p:Math.random()*6});
      spawn(a)},
    update:function(dt,inp,a){
      t+=dt;cam+=(Math.max(0,n*PH-140)-cam)*Math.min(1,dt*6);happy=Math.max(0,happy-dt);
      clouds.forEach(function(c){c.x+=c.v*dt;if(c.x>a.W+90)c.x=-90});
      layers.forEach(function(l){l.sq=Math.max(0,l.sq-dt*5)});
      for(var i=debris.length-1;i>=0;i--){var d=debris[i];d.vy+=1300*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.rot+=d.vr*dt;if(d.y+cam>a.H+60)debris.splice(i,1)}
      if(dead){cur.vy+=1500*dt;cur.y+=cur.vy*dt;cur.x+=cur.dir*70*dt;cur.rot+=cur.dir*4*dt;deadT-=dt;if(deadT<=0)a.over();return}
      if(cur.st==='slide'){cur.t+=dt;var sp=Math.min(360,130+n*7),lo=cur.w/2+6,hi=a.W-cur.w/2-6;
        cur.x+=cur.dir*sp*dt;if(cur.x<lo){cur.x=lo;cur.dir=1}else if(cur.x>hi){cur.x=hi;cur.dir=-1}
        if(inp.tap&&cur.t>.1){cur.st='fall';cur.auto=false;a.sfx('jump')}
        else if(cur.t>(autoN>0?4:6)){cur.st='fall';cur.auto=true}}
      else{cur.y+=1100*dt;var ly=Y0-(n+1)*PH;if(cur.y>=ly){cur.y=ly;land(a)}}
    },
    draw:function(g,a){
      var W=a.W,H=a.H,ko=a.lang==='ko',k=Math.min(1,n/45),gr=g.createLinearGradient(0,0,0,H);
      gr.addColorStop(0,mix([120,205,255],[24,26,84],k));gr.addColorStop(.65,mix([214,242,255],[96,74,170],k));gr.addColorStop(1,mix([255,238,200],[226,140,170],k));
      g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
      if(k>.15){g.fillStyle='#fff';stars.forEach(function(s){var y=((s.y+cam*.1)%700)-30;g.globalAlpha=(k-.15)*(.5+.5*Math.sin(t*2+s.p));g.beginPath();g.arc(s.x,y,s.r,0,7);g.fill()});g.globalAlpha=1}
      var sy=96+cam*.12;g.fillStyle='rgba(255,240,170,.25)';g.beginPath();g.arc(62,sy,50,0,7);g.fill();
      g.fillStyle=mix([255,236,150],[245,245,255],k);g.beginPath();g.arc(62,sy,32,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,'+(.85-.35*k)+')';clouds.forEach(function(c){var y=((c.y+cam*.25)%720)-60;g.beginPath();g.ellipse(c.x,y,38*c.s,14*c.s,0,0,7);
        g.ellipse(c.x-16*c.s,y-8*c.s,18*c.s,13*c.s,0,0,7);g.ellipse(c.x+14*c.s,y-10*c.s,22*c.s,16*c.s,0,0,7);g.fill()});
      var hy=H-170+cam*.5;if(hy<H+80){g.fillStyle='#a9dc8c';g.beginPath();g.moveTo(-20,hy+60);for(var x=-20;x<=W+20;x+=90)g.quadraticCurveTo(x+45,hy-30-((x*13)%37),x+90,hy+60);g.lineTo(W+20,H+300);g.lineTo(-20,H+300);g.fill();
        g.fillStyle='#86c873';g.beginPath();g.moveTo(-20,hy+90);for(var x2=-50;x2<=W+20;x2+=120)g.quadraticCurveTo(x2+60,hy+20-((x2*7)%29),x2+120,hy+90);g.lineTo(W+20,H+300);g.lineTo(-20,H+300);g.fill()}
      var ty=Y0+16+cam;if(ty<H+60){
        var tg=g.createLinearGradient(0,ty,0,ty+90);tg.addColorStop(0,'#fff8ee');tg.addColorStop(1,'#f3dcc2');g.fillStyle=tg;g.fillRect(-20,ty,W+40,200);
        for(var c=0;c<10;c++)for(var r2=0;r2<4;r2++)if((c+r2)%2===0){g.fillStyle='rgba(235,96,96,.75)';g.fillRect(c*40-20,ty+r2*26,40,26)}
        g.fillStyle='rgba(0,0,0,.12)';g.fillRect(-20,ty,W+40,5);
        g.fillStyle='rgba(0,0,0,.15)';g.beginPath();g.ellipse(W/2,ty+6,104,10,0,0,7);g.fill();
        var pg=g.createLinearGradient(0,ty-18,0,ty+6);pg.addColorStop(0,'#ffffff');pg.addColorStop(1,'#cfe0f2');g.fillStyle=pg;
        g.beginPath();g.ellipse(W/2,ty-6,100,12,0,0,7);g.fill();g.fillStyle='#e6f0fb';g.beginPath();g.ellipse(W/2,ty-9,84,7,0,0,7);g.fill()}
      /* 목표 구역 안내 */
      var topY=Y0-n*PH+cam;if(!dead){var zg=g.createLinearGradient(0,topY-130,0,topY);zg.addColorStop(0,'rgba(255,255,255,0)');zg.addColorStop(1,'rgba(255,255,255,.22)');
        g.fillStyle=zg;g.fillRect(top.x-top.w/2,topY-130,top.w,130)}
      g.fillStyle='rgba(90,40,0,.16)';if(layers.length){var b0=layers[0];if(b0.i===0){g.beginPath();g.ellipse(b0.x,Y0+cam,b0.w/2+4,5,0,0,7);g.fill()}}
      var look=Math.max(-1,Math.min(1,(cur.x-top.x)/80));
      for(var i=0;i<layers.length;i++){var l=layers[i],y=Y0-(l.i+1)*PH+cam;if(y>H+30)continue;
        var last=i===layers.length-1;g.save();g.translate(l.x,y+PH);g.scale(1+l.sq*.12,1-l.sq*.25);g.translate(-l.x,-(y+PH));
        pancake(g,l.x,y,l.w,l.type,last,dead?'scared':happy>0?'happy':'idle',look);
        if(l.gold&&l.sq>0){g.fillStyle='rgba(255,246,150,'+l.sq*.7+')';rr(g,l.x-l.w/2,y,l.w,PH,9);g.fill()}
        g.restore()}
      debris.forEach(function(d){g.save();g.translate(d.x,d.y+cam+PH/2);g.rotate(d.rot);pancake(g,0,-PH/2,d.w,null,false);g.restore()});
      var cy=cur.y+cam;
      if(cur.st==='slide'){g.fillStyle='rgba(60,30,0,.13)';g.beginPath();g.ellipse(cur.x,topY+2,cur.w/2*.8,3.5,0,0,7);g.fill()}
      g.save();g.translate(cur.x,cy+PH/2);g.rotate(cur.rot);if(cur.type){g.shadowColor='#fff3a0';g.shadowBlur=14}
      pancake(g,0,-PH/2,cur.w,cur.type,true,cur.st==='slide'?'idle':'scared',-look);g.restore();
      var lim=autoN>0?4:6,rem=lim-cur.t;
      if(cur.st==='slide'&&rem<3){g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=4;g.beginPath();g.arc(cur.x,cy-22,9,0,7);g.stroke();
        g.strokeStyle='#ff7a59';g.lineCap='round';g.beginPath();g.arc(cur.x,cy-22,9,-1.57,-1.57+6.283*Math.max(0,rem/3));g.stroke()}
      /* 요리사 고양이 */
      var mood=dead?'sad':happy>0?'happy':(cur.st==='slide'&&rem<3)?'sleepy':'idle',hop=happy>0?Math.abs(Math.sin(happy*14))*9:0,
          cx=50,ccy=H-40-hop+Math.sin(t*2.4)*1.5;
      g.fillStyle='rgba(0,0,0,.14)';g.beginPath();g.ellipse(cx,H-6,34,6,0,0,7);g.fill();
      g.save();g.translate(cx,ccy);g.rotate(mood==='sleepy'?.12:mood==='happy'?-.06:0);
      g.strokeStyle='#b9c4d0';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(-34,26);g.lineTo(-40,-4);g.stroke();
      g.fillStyle='#dfe7ef';rr(g,-49,-22,18,20,5);g.fill();
      var bg=g.createRadialGradient(-8,-10,4,0,0,32);bg.addColorStop(0,'#fff7ec');bg.addColorStop(1,'#f1d9bd');g.fillStyle=bg;
      g.beginPath();g.moveTo(-27,-10);g.lineTo(-22,-36);g.lineTo(-6,-24);g.fill();g.beginPath();g.moveTo(27,-10);g.lineTo(22,-36);g.lineTo(6,-24);g.fill();
      g.beginPath();g.arc(0,0,30,0,7);g.fill();
      g.fillStyle='#ffb3a8';g.beginPath();g.moveTo(-22,-17);g.lineTo(-20,-29);g.lineTo(-12,-23);g.fill();g.beginPath();g.moveTo(22,-17);g.lineTo(20,-29);g.lineTo(12,-23);g.fill();
      g.fillStyle='#c98a54';g.beginPath();g.ellipse(13,-14,9,7,.5,0,7);g.fill();
      var hg=g.createLinearGradient(0,-62,0,-24);hg.addColorStop(0,'#ffffff');hg.addColorStop(1,'#dfe6f0');g.fillStyle=hg;
      g.beginPath();g.arc(-11,-44,11,0,7);g.arc(0,-50,13,0,7);g.arc(11,-44,11,0,7);g.fill();rr(g,-15,-40,30,14,3);g.fill();
      g.fillStyle='rgba(120,140,170,.35)';g.fillRect(-15,-30,30,3);
      g.fillStyle='rgba(255,130,130,.45)';g.beginPath();g.ellipse(-17,7,5,3,0,0,7);g.ellipse(17,7,5,3,0,0,7);g.fill();
      var px=Math.max(-2.5,Math.min(2.5,(cur.x-cx)/50)),py=Math.max(-2.5,Math.min(1,(cy-ccy)/120));g.fillStyle='#2b2320';g.strokeStyle='#2b2320';g.lineWidth=2;
      if(mood==='happy'){g.beginPath();g.arc(-10,0,4.5,3.4,6);g.stroke();g.beginPath();g.arc(10,0,4.5,3.4,6);g.stroke()}
      else if(mood==='sleepy'||(t%3.4)<.12){g.beginPath();g.moveTo(-14,-1);g.lineTo(-6,-1);g.moveTo(6,-1);g.lineTo(14,-1);g.stroke()}
      else{var er=mood==='sad'?6:4.6;g.fillStyle='#fff';g.beginPath();g.arc(-10,-2,er+1.2,0,7);g.arc(10,-2,er+1.2,0,7);g.fill();
        g.fillStyle='#2b2320';g.beginPath();g.arc(-10+px,-2+py,mood==='sad'?3:er-.8,0,7);g.arc(10+px,-2+py,mood==='sad'?3:er-.8,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(-11+px,-3.5+py,1.3,0,7);g.arc(9+px,-3.5+py,1.3,0,7);g.fill()}
      g.fillStyle='#e8735a';g.beginPath();g.moveTo(-3,6);g.lineTo(3,6);g.lineTo(0,9.5);g.fill();
      g.strokeStyle='#5a3a2a';g.lineWidth=1.5;
      if(mood==='sad'){g.fillStyle='#5a2a2a';g.beginPath();g.ellipse(0,15,3.5,4.5,0,0,7);g.fill()}
      else if(mood==='happy'){g.fillStyle='#e8735a';g.beginPath();g.arc(0,11,5,0,3.14);g.fill()}
      else{g.beginPath();g.arc(-3,10,3,.2,2.9);g.stroke();g.beginPath();g.arc(3,10,3,.2,2.9);g.stroke()}
      g.strokeStyle='rgba(60,40,30,.45)';g.lineWidth=1;g.beginPath();g.moveTo(16,8);g.lineTo(30,5);g.moveTo(16,11);g.lineTo(30,13);g.moveTo(-16,8);g.lineTo(-30,5);g.moveTo(-16,11);g.lineTo(-30,13);g.stroke();
      g.restore();
      g.textAlign='center';
      if(mood==='sleepy'){g.font='800 15px'+F;g.fillStyle='rgba(255,255,255,.9)';g.fillText('z',cx+26,ccy-44-Math.sin(t*3)*3);g.font='800 11px'+F;g.fillText('z',cx+36,ccy-56-Math.cos(t*3)*3)}
      g.font='800 17px'+F;var s=ko?n+'층':n+(n===1?' layer':' layers');
      g.fillStyle='rgba(60,30,10,.35)';g.fillText(s,W/2+1,75);g.fillStyle='#fff';g.fillText(s,W/2,73);
      if(streak>1){g.font='800 14px'+F;var s2=(ko?'완벽 연속 x':'Perfect streak x')+streak;g.fillStyle='rgba(60,30,10,.35)';g.fillText(s2,W/2+1,95);g.fillStyle='#fff36b';g.fillText(s2,W/2,94)}
    }
  });
})();
