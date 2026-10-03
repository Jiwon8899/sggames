/* 나이트 드라이브 — 네온 고속도로 3차선 피하기. 아슬아슬하게 스치면 터보 게이지가 찬다 */
(function(){
  var RX=56,LW=82.67,HZ=92,PY=478,FONT='Jua,system-ui,sans-serif';
  var PAL=[['#ff4fa8','#a81e6c'],['#4fd8ff','#1c6fb0'],['#ffd24f','#c9861a'],['#8cff7a','#2f9a4a'],['#c08bff','#6a35c9'],['#ff8a5c','#b8432a']];
  var p,cars,picks,lines,side,t,sc,rel,gap,spawnD,safe,nextSafe,fuel,gauge,turbo,grace,dead,running=false,
      distAcc,rowN,lastChange,lastFuelRow,react,flash,warn,wasDown,handled,px0,py0,pUp,pL,pR,deadWhy;
  function lx(l){return RX+LW*(l+.5)}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);
    g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath()}
  function mkSide(o,i){o.left=i%2===0;o.kind=Math.random()<.55?'palm':'sign';o.c=['#ff4fa8','#4fd8ff','#ffd24f','#8cff7a'][Math.floor(Math.random()*4)];
    o.g=Math.floor(Math.random()*5);o.ph=Math.random()*6;return o}
  function L(a,ko,en){return a.lang==='ko'?ko:en}

  function spawnRow(a){
    safe=nextSafe;rowN++;
    var d=Math.floor(Math.random()*3)-1;nextSafe=Math.max(0,Math.min(2,safe+d));
    var pBlock=Math.min(.82,.5+t*.006),n=0;
    for(var l=0;l<3;l++){if(l===safe)continue;
      if(Math.random()<pBlock||(n===0&&l===2-(safe===2?1:0)&&Math.random()<.9)){n++;
        var ty=Math.random(),w=ty<.2?42:ty<.45?36:40,h=ty<.2?84:ty<.45?60:70;
        cars.push({lane:l,x:lx(l),y:-70,w:w,h:h,van:ty<.2,col:PAL[Math.floor(Math.random()*PAL.length)],hit:false,vx:0,rot:0,vr:0,passed:false,late:false})}}
    /* 줄 사이 빈 구간에 코인/연료 */
    var py=-70-gap*.5,pl=Math.random()<.6?nextSafe:safe;
    if(rowN-lastFuelRow>=4&&(fuel<.75||rowN-lastFuelRow>=6)){
      if(t-lastChange>6&&pl===p.lane)pl=pl===1?(Math.random()<.5?0:2):1; /* 가만히 있는 차에게는 연료를 주지 않는다 */
      picks.push({kind:'fuel',x:lx(pl),y:py,ph:0});lastFuelRow=rowN}
    else if(Math.random()<.75){var k=1+Math.floor(Math.random()*3);for(var i=0;i<k;i++)picks.push({kind:'coin',x:lx(pl),y:py-(i-(k-1)/2)*30,ph:i})}
  }

  function drawCar(g,c,isP,tt){
    var w=c.w,h=c.h,c1=c.col[0],c2=c.col[1];
    /* 전조등 */
    if(!c.hit){var cl=isP?120:54,hg=g.createLinearGradient(0,-h/2,0,-h/2-cl);
      hg.addColorStop(0,isP?'rgba(255,250,200,.5)':'rgba(255,250,210,.22)');hg.addColorStop(1,'rgba(255,250,200,0)');g.fillStyle=hg;
      g.beginPath();g.moveTo(-w/2+4,-h/2+3);g.lineTo(-w/2-(isP?16:6),-h/2-cl);g.lineTo(w/2+(isP?16:6),-h/2-cl);g.lineTo(w/2-4,-h/2+3);g.fill()}
    /* 바퀴 */
    g.fillStyle='#0b0714';[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){rr(g,s[0]*(w/2-2)-4,s[1]*(h/2-17)-8,8,16,3);g.fill()});
    /* 차체 */
    var bg=g.createLinearGradient(-w/2,0,w/2,0);bg.addColorStop(0,c2);bg.addColorStop(.3,c1);bg.addColorStop(.7,c1);bg.addColorStop(1,c2);
    g.save();if(isP){g.shadowColor=turbo>0?'#ffe14d':'#3ff0ff';g.shadowBlur=turbo>0?26:14}
    g.fillStyle=bg;rr(g,-w/2,-h/2,w,h,c.van?7:11);g.fill();g.restore();
    g.fillStyle='rgba(255,255,255,.22)';rr(g,-w/2+5,-h/2+3,w-10,6,3);g.fill();
    g.fillStyle='rgba(255,255,255,.16)';g.fillRect(-2,-h/2+4,4,h-8);
    if(isP){
      /* 오픈카 실내 + 고양이 운전사 */
      g.fillStyle='rgba(200,240,255,.55)';rr(g,-w/2+5,-h/2+17,w-10,7,3);g.fill();
      g.fillStyle='#1a1030';rr(g,-w/2+5,-h/2+25,w-10,32,7);g.fill();
      g.fillStyle='#3a2a5c';rr(g,-w/2+8,-h/2+41,w-16,13,5);g.fill();
      var hy=-h/2+38+(turbo>0?Math.sin(tt*40)*.8:0);
      g.fillStyle='#f09a4a';g.beginPath();g.moveTo(-10,hy-3);g.lineTo(-9,hy-15);g.lineTo(-2,hy-8);g.fill();
      g.beginPath();g.moveTo(10,hy-3);g.lineTo(9,hy-15);g.lineTo(2,hy-8);g.fill();
      var cg=g.createRadialGradient(-3,hy-3,2,0,hy,11);cg.addColorStop(0,'#ffc27d');cg.addColorStop(1,'#f09a4a');g.fillStyle=cg;
      g.beginPath();g.arc(0,hy,10.5,0,7);g.fill();
      g.fillStyle='#ffb3a8';g.beginPath();g.moveTo(-8,hy-6);g.lineTo(-8,hy-12);g.lineTo(-4,hy-8);g.fill();g.beginPath();g.moveTo(8,hy-6);g.lineTo(8,hy-12);g.lineTo(4,hy-8);g.fill();
      g.fillStyle='#fff3e2';g.beginPath();g.ellipse(0,hy+4,5.5,4,0,0,7);g.fill();
      g.strokeStyle='#2b2320';g.fillStyle='#2b2320';g.lineWidth=1.6;g.lineCap='round';
      if(dead){g.beginPath();[-4.5,4.5].forEach(function(ex){g.moveTo(ex-2,hy-3);g.lineTo(ex+2,hy+1);g.moveTo(ex+2,hy-3);g.lineTo(ex-2,hy+1)});g.stroke()}
      else if(turbo>0){g.beginPath();g.arc(-4.5,hy,2.4,3.14,6.28);g.stroke();g.beginPath();g.arc(4.5,hy,2.4,3.14,6.28);g.stroke()}
      else if(react>0){g.fillStyle='#fff';g.beginPath();g.arc(-4.5,hy-1,3.4,0,7);g.arc(4.5,hy-1,3.4,0,7);g.fill();
        g.fillStyle='#2b2320';g.beginPath();g.arc(-4.5,hy-1,1.4,0,7);g.arc(4.5,hy-1,1.4,0,7);g.fill()}
      else if((tt%2.8)<.12){g.fillRect(-7,hy-1.5,5,1.6);g.fillRect(2,hy-1.5,5,1.6)}
      else{var ex=c.lean*14;g.beginPath();g.arc(-4.5+ex,hy-1,2.2,0,7);g.arc(4.5+ex,hy-1,2.2,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(-3.9+ex,hy-1.8,.8,0,7);g.arc(5.1+ex,hy-1.8,.8,0,7);g.fill()}
      g.fillStyle='#e8735a';g.beginPath();g.moveTo(-1.5,hy+2.5);g.lineTo(1.5,hy+2.5);g.lineTo(0,hy+4.3);g.fill();
      /* 스포일러 */
      g.fillStyle=c2;rr(g,-w/2-2,h/2-9,w+4,6,3);g.fill();
    }else{
      g.fillStyle='rgba(12,8,30,.82)';rr(g,-w/2+5,-h/2+(c.van?9:15),w-10,c.van?11:12,4);g.fill();
      g.fillStyle='rgba(150,220,255,.3)';rr(g,-w/2+7,-h/2+(c.van?10:16),w-14,4,2);g.fill();
      g.fillStyle='rgba(255,255,255,.13)';rr(g,-w/2+5,-h/2+(c.van?24:30),w-10,h-(c.van?36:50),5);g.fill();
      g.fillStyle='rgba(12,8,30,.75)';rr(g,-w/2+6,h/2-17,w-12,8,3);g.fill();
    }
    /* 전조등 알, 미등 */
    g.fillStyle='#fff8c8';g.beginPath();g.arc(-w/2+8,-h/2+4,3,0,7);g.arc(w/2-8,-h/2+4,3,0,7);g.fill();
    g.save();g.shadowColor='#ff2a4a';g.shadowBlur=12;g.fillStyle='#ff3355';rr(g,-w/2+4,h/2-5,10,4,2);g.fill();rr(g,w/2-14,h/2-5,10,4,2);g.fill();g.restore();
  }

  SG.run({
    id:'night-drive',
    title:{ko:'나이트 드라이브',en:'Night Drive'},
    how:{ko:'좌우를 눌러 차선 변경! 아슬아슬하게 스쳐 터보를 채우고 위로 밀어 발동',en:'Tap left or right to change lanes. Near misses fill TURBO — swipe up to fire it!'},
    init:function(a){
      p={lane:1,x:lx(1),w:44,h:78,col:['#ff4fa8','#8a1f7a'],lean:0};
      cars=[];picks=[];lines=[];t=0;sc=0;rel=190;gap=250;spawnD=330;safe=1;nextSafe=1;fuel=1;gauge=0;turbo=0;grace=0;dead=false;deadWhy='';
      distAcc=0;rowN=0;lastChange=0;lastFuelRow=0;react=0;flash=0;warn=0;wasDown=false;handled=true;pUp=pL=pR=false;
      side=[];for(var i=0;i<8;i++)side.push(mkSide({y:-400+i*130},i));
    },
    update:function(dt,inp,a){
      running=true;t+=dt;
      /* ---- 입력: 터치는 직접 추적(끌면 스와이프, 떼면 탭), 키보드는 눌림 순간 ---- */
      var mv=0,boost=false,upE=inp.up&&!pUp,lE=inp.left&&!pL,rE=inp.right&&!pR;
      if(inp.down&&!wasDown){px0=inp.x;py0=inp.y;handled=false}
      if(inp.down&&!handled&&inp.x!=null){var dx=inp.x-px0,dy=inp.y-py0;
        if(Math.max(Math.abs(dx),Math.abs(dy))>24){handled=true;if(Math.abs(dx)>Math.abs(dy))mv=dx>0?1:-1;else if(dy<0)boost=true}}
      if(!inp.down&&wasDown){if(!handled){handled=true;mv=px0<a.W/2?-1:1}}
      else if(!inp.down){
        if(upE)boost=true;
        else if(lE)mv=-1;else if(rE)mv=1;
        else if(inp.swipe&&inp.x==null){if(inp.swipe==='left'&&!inp.left)mv=-1;else if(inp.swipe==='right'&&!inp.right)mv=1}
        else if(inp.tap&&!inp.up&&inp.x!=null)mv=inp.x<a.W/2?-1:1}
      wasDown=inp.down;pUp=inp.up;pL=inp.left;pR=inp.right;

      if(mv){var nl=p.lane+mv;
        if(nl<0||nl>2){a.shake(3);a.beep(160,.05,'square')}
        else{var py=PY;cars.forEach(function(c){if(!c.hit&&c.lane===p.lane&&c.y>py-200&&c.y<py-50)c.late=true});
          p.lane=nl;lastChange=t;a.beep(mv>0?560:480,.05,'triangle')}}
      var tx=lx(p.lane),ox=p.x;p.x+=(tx-p.x)*Math.min(1,dt*17);p.lean+=((tx-p.x)*.0045-p.lean)*Math.min(1,dt*14);

      if(boost){
        if(gauge>=1&&turbo<=0){turbo=3;gauge=0;flash=1;a.sfx('win');a.shake(8);a.burst(p.x,PY+30,'#ffe14d',22);a.burst(p.x,PY+30,'#3ff0ff',14);
          a.pop(p.x,PY-60,L(a,'터보!!','TURBO!!'),'#ffe14d')}
        else if(turbo<=0)a.beep(200,.04,'square')}
      if(turbo>0){turbo-=dt;if(turbo<=0){turbo=0;grace=1.2}}
      if(grace>0)grace-=dt;react=Math.max(0,react-dt);flash=Math.max(0,flash-dt*2.5);

      /* ---- 속도/난이도 ---- */
      var base=Math.min(440,190+t*4.6);rel=base*(turbo>0?1.9:1);gap=Math.max(176,250-t*1.25);
      a.tempo(turbo>0?1.6:1+t*.008);
      var gv=rel*1.5;sc+=gv*dt;
      distAcc+=rel*dt;while(distAcc>110){distAcc-=110;a.add(turbo>0?2:1)}
      side.forEach(function(o,i){o.y+=gv*dt;if(o.y>a.H+70){o.y-=1040;mkSide(o,i)}});
      spawnD-=rel*dt;if(spawnD<=0){spawnD+=gap;spawnRow(a)}

      /* ---- 연료 ---- */
      if(turbo<=0)fuel-=dt/15;
      if(fuel<.25){warn-=dt;if(warn<=0){warn=.7;a.beep(880,.06,'square')}}
      if(fuel<=0){fuel=0;dead=true;deadWhy='fuel';a.pop(p.x,PY-60,L(a,'연료 바닥!','Out of fuel!'),'#ffb14d');a.burst(p.x,PY,'#9aa3c7',16);running=false;a.over();return}

      /* ---- 아이템 ---- */
      for(var j=picks.length-1;j>=0;j--){var k=picks[j];k.y+=rel*dt;
        if(Math.abs(k.x-p.x)<32&&Math.abs(k.y-PY)<44){
          if(k.kind==='coin'){a.add(5);a.sfx('coin');a.burst(k.x,k.y,'#ffe14d',8);a.pop(k.x,k.y-18,'+5','#ffe14d')}
          else{fuel=Math.min(1,fuel+.5);a.add(3);a.sfx('jump');a.burst(k.x,k.y,'#7dff9a',14);a.pop(k.x,k.y-18,L(a,'연료 +','Fuel +'),'#7dff9a')}
          picks.splice(j,1)}
        else if(k.y>a.H+40)picks.splice(j,1)}

      /* ---- 차량 ---- */
      for(var i=cars.length-1;i>=0;i--){var c=cars[i];c.y+=rel*dt;
        if(c.hit){c.x+=c.vx*dt;c.rot+=c.vr*dt;if(c.x<-80||c.x>a.W+80||c.y>a.H+80)cars.splice(i,1);continue}
        var ddx=Math.abs(c.x-p.x),ddy=Math.abs(c.y-PY);
        if(ddx<(c.w+p.w)/2-6&&ddy<(c.h+p.h)/2-6){
          if(turbo>0){c.hit=true;c.vx=(c.x>=p.x?1:-1)*(240+Math.random()*120);if(c.lane===0)c.vx=-Math.abs(c.vx);if(c.lane===2)c.vx=Math.abs(c.vx);
            c.vr=(c.vx>0?1:-1)*(4+Math.random()*4);a.add(20);a.sfx('coin');a.shake(5);
            a.burst(c.x,c.y,'#fff',10);a.burst(c.x,c.y,c.col[0],10);a.pop(c.x,c.y-30,'+20','#fff36b')}
          else if(grace>0){c.hit=true;c.vx=(c.x>=p.x?1:-1)*200;c.vr=5;a.burst(c.x,c.y,'#fff',8);a.beep(300,.06)}
          else{dead=true;deadWhy='crash';a.burst(p.x,PY-20,'#ffe14d',20);a.burst(p.x,PY-20,'#ff4fa8',16);a.burst(p.x,PY-20,'#fff',10);
            a.pop(p.x,PY-70,L(a,'쿵!','Bonk!'),'#ff8fb8');running=false;a.over();return}}
        if(!c.passed&&c.y>PY+(c.h+p.h)/2-8){c.passed=true;
          if(turbo<=0&&ddx<LW+14){react=.5;
            if(c.late){gauge=Math.min(1,gauge+.34);a.add(15);a.sfx('jump');a.burst((c.x+p.x)/2,PY,'#3ff0ff',14);a.shake(3);
              a.pop(p.x,PY-58,L(a,'간발의 차! +15','Super close! +15'),'#3ff0ff')}
            else{gauge=Math.min(1,gauge+.13);a.add(3);a.beep(1100,.05,'triangle');a.burst((c.x+p.x)/2,PY,'#ff9ad4',6);
              a.pop(p.x,PY-58,L(a,'아슬아슬 +3','Near miss +3'),'#ffc0e6')}
            if(gauge>=1){a.sfx('win');a.pop(a.W/2,PY-100,L(a,'터보 준비 완료!','TURBO READY!'),'#ffe14d')}}}
        if(c.y>a.H+90)cars.splice(i,1)}

      /* ---- 속도선 ---- */
      var sl=turbo>0?1:Math.max(0,(base-280)/160);
      if(Math.random()<sl*dt*(turbo>0?70:22))lines.push({x:RX+Math.random()*(a.W-RX*2),y:HZ-20,l:40+Math.random()*80,v:900+Math.random()*500});
      for(var q=lines.length-1;q>=0;q--){lines[q].y+=lines[q].v*dt;if(lines[q].y>a.H+120)lines.splice(q,1)}
    },
    draw:function(g,a,dt){
      var W=a.W,H=a.H,i;dt=dt||0;
      if(!running&&!dead){sc+=150*dt;t+=dt*0}
      var tt=running?t:performance.now()/1000;
      /* ---- 하늘, 태양, 스카이라인 ---- */
      var sk=g.createLinearGradient(0,0,0,HZ);sk.addColorStop(0,'#150632');sk.addColorStop(.6,'#4a1568');sk.addColorStop(1,'#ff4f9a');
      g.fillStyle=sk;g.fillRect(-20,-20,W+40,HZ+20);
      g.fillStyle='rgba(255,255,255,.8)';for(i=0;i<22;i++){var sx=(i*97+13)%W,sy=(i*41+7)%56;g.globalAlpha=.35+.5*Math.abs(Math.sin(tt*1.3+i));g.fillRect(sx,sy,1.6,1.6)}g.globalAlpha=1;
      g.save();g.beginPath();g.rect(0,0,W,HZ);g.clip();
      var sg=g.createLinearGradient(0,HZ-60,0,HZ+10);sg.addColorStop(0,'#ffe86b');sg.addColorStop(1,'#ff3f8f');
      g.shadowColor='#ff5fa8';g.shadowBlur=30;g.fillStyle=sg;g.beginPath();g.arc(W/2,HZ-4,48,0,7);g.fill();g.shadowBlur=0;
      g.fillStyle='#5a1a6e';for(i=0;i<5;i++)g.fillRect(W/2-52,HZ-34+i*8,104,1.5+i*.9);
      var off=(sc*.012)%400;
      for(var pass=0;pass<2;pass++)for(i=0;i<16;i++){var bx=((i*50-off*(pass?1:.5))%800+800)%800-60,bh=(pass?14:24)+((i*37+pass*11)%(pass?26:20)),bw=pass?34:44;
        g.fillStyle=pass?'#160530':'#3a0f58';g.fillRect(bx,HZ-bh,bw,bh+2);
        if(pass){g.fillStyle='rgba(255,225,120,.75)';for(var wy=0;wy<3;wy++)for(var wx=0;wx<4;wx++)if((i*7+wy*3+wx*5)%4<2&&wy*8+6<bh)g.fillRect(bx+5+wx*7,HZ-bh+5+wy*8,3,3)}}
      g.restore();
      /* ---- 갓길 그리드 ---- */
      var gd=g.createLinearGradient(0,HZ,0,H);gd.addColorStop(0,'#2a0b46');gd.addColorStop(.35,'#12062b');gd.addColorStop(1,'#0a0420');
      g.fillStyle=gd;g.fillRect(-20,HZ,W+40,H-HZ+20);
      g.strokeStyle='rgba(255,79,168,.32)';g.lineWidth=1;g.beginPath();
      for(var gy=HZ+(sc%40);gy<H+20;gy+=40){g.moveTo(-20,gy);g.lineTo(RX,gy);g.moveTo(W-RX,gy);g.lineTo(W+20,gy)}
      [14,35,W-35,W-14].forEach(function(x){g.moveTo(x,HZ);g.lineTo(x,H+20)});g.stroke();
      /* ---- 도로 ---- */
      var rg=g.createLinearGradient(RX,0,W-RX,0);rg.addColorStop(0,'#150f2c');rg.addColorStop(.5,'#261d4a');rg.addColorStop(1,'#150f2c');
      g.fillStyle=rg;g.fillRect(RX,HZ,W-RX*2,H-HZ+20);
      /* 가로등 불빛 웅덩이 */
      for(var ly=((sc%220)+220)%220-120;ly<H+80;ly+=220){if(ly<HZ-10)continue;[RX+16,W-RX-16].forEach(function(x,si){var yy=ly+si*110;
        var pg=g.createRadialGradient(x,yy,2,x,yy,62);pg.addColorStop(0,'rgba(255,214,140,.26)');pg.addColorStop(1,'rgba(255,214,140,0)');g.fillStyle=pg;
        g.save();g.beginPath();g.rect(RX,HZ,W-RX*2,H);g.clip();g.beginPath();g.arc(x,yy,62,0,7);g.fill();g.restore()})}
      g.save();g.shadowColor='#3ff0ff';g.shadowBlur=10;g.fillStyle='#9ff6ff';
      for(var l=1;l<3;l++)for(var dy=HZ-64+(sc%64);dy<H+20;dy+=64)if(dy+34>HZ)g.fillRect(RX+LW*l-2,Math.max(HZ,dy),4,Math.min(34,dy+34-HZ));
      g.shadowColor='#ff3fa4';g.shadowBlur=14;g.fillStyle='#ff6fbe';g.fillRect(RX-3,HZ,4,H);g.fillRect(W-RX-1,HZ,4,H);g.restore();
      var hf=g.createLinearGradient(0,HZ,0,HZ+70);hf.addColorStop(0,'rgba(255,79,154,.55)');hf.addColorStop(1,'rgba(255,79,154,0)');g.fillStyle=hf;g.fillRect(-20,HZ,W+40,70);
      /* ---- 아이템 ---- */
      picks.forEach(function(k){g.save();g.translate(k.x,k.y);
        if(k.kind==='coin'){var s=Math.abs(Math.cos(tt*5+k.ph));g.shadowColor='#ffe14d';g.shadowBlur=14;
          var cg=g.createLinearGradient(0,-11,0,11);cg.addColorStop(0,'#fff3a0');cg.addColorStop(1,'#f0a020');g.fillStyle=cg;
          g.beginPath();g.ellipse(0,0,3+8*s,11,0,0,7);g.fill();g.shadowBlur=0;g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(0,0,1+3*s,6,0,0,7);g.fill()}
        else{var b=1+Math.sin(tt*6)*.07;g.scale(b,b);g.shadowColor='#7dff9a';g.shadowBlur=18;
          var fg=g.createLinearGradient(-12,0,12,0);fg.addColorStop(0,'#2fbf62');fg.addColorStop(.5,'#8dffac');fg.addColorStop(1,'#2fbf62');g.fillStyle=fg;
          rr(g,-12,-13,24,29,5);g.fill();g.shadowBlur=0;g.fillStyle='#1f8f48';rr(g,-7,-19,9,7,2);g.fill();g.fillRect(5,-18,6,4);
          g.fillStyle='#0d3d22';g.beginPath();g.moveTo(0,-8);g.bezierCurveTo(8,1,6,10,0,10);g.bezierCurveTo(-6,10,-8,1,0,-8);g.fill();
          g.fillStyle='#fff';g.beginPath();g.arc(-2,4,1.6,0,7);g.fill()}
        g.restore()});
      /* ---- 차량 ---- */
      g.save();g.beginPath();g.rect(-20,HZ,W+40,H);g.clip();
      cars.forEach(function(c){g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(c.x+5,c.y+7,c.w/2+3,c.h/2+2,0,0,7);g.fill();
        g.save();g.translate(c.x,c.y);g.rotate(c.rot);c.lean=0;drawCar(g,c,false,tt);g.restore();
        if(c.hit){g.fillStyle='#fff';for(var s=0;s<3;s++){var an=tt*9+s*2.1;g.fillRect(c.x+Math.cos(an)*30-1.5,c.y+Math.sin(an)*30-1.5,3,3)}}});
      g.restore();
      /* ---- 플레이어 ---- */
      var blink=grace>0&&Math.floor(tt*14)%2===0;
      if(!blink){
        if(running||!dead){ /* 배기 불꽃 */
          var fl=(turbo>0?46:14)+Math.sin(tt*50)*4,eg=g.createLinearGradient(0,PY+36,0,PY+36+fl);
          eg.addColorStop(0,turbo>0?'rgba(255,240,150,.95)':'rgba(120,230,255,.8)');eg.addColorStop(1,'rgba(255,80,160,0)');g.fillStyle=eg;
          [-11,11].forEach(function(ex){g.beginPath();g.moveTo(p.x+ex-5,PY+36);g.lineTo(p.x+ex,PY+36+fl);g.lineTo(p.x+ex+5,PY+36);g.fill()})}
        g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.ellipse(p.x+5,PY+8,p.w/2+4,p.h/2+2,0,0,7);g.fill();
        g.save();g.translate(p.x,PY);g.rotate(p.lean+(dead&&deadWhy==='crash'?.35:0));g.scale(1-Math.abs(p.lean)*.25,1);drawCar(g,p,true,tt);g.restore();
        if(turbo>0){g.save();g.strokeStyle='rgba(255,225,77,'+(.5+.3*Math.sin(tt*30))+')';g.lineWidth=3;g.shadowColor='#ffe14d';g.shadowBlur=16;
          g.beginPath();g.ellipse(p.x,PY,36,54,0,0,7);g.stroke();g.restore()}}
      /* ---- 가로등, 야자수, 네온사인 ---- */
      for(ly=((sc%220)+220)%220-120;ly<H+80;ly+=220){[0,1].forEach(function(si){var yy=ly+si*110,x0=si?W-RX+10:RX-10,x1=si?W-RX-16:RX+16;if(yy<HZ+6)return;
        g.strokeStyle='#5a4a86';g.lineWidth=3;g.beginPath();g.moveTo(x0,yy);g.lineTo(x1,yy);g.stroke();
        g.fillStyle='#3b2f63';g.beginPath();g.arc(x0,yy,4,0,7);g.fill();
        g.save();g.shadowColor='#ffd98c';g.shadowBlur=14;g.fillStyle='#fff1c4';g.beginPath();g.arc(x1,yy,4,0,7);g.fill();g.restore()})}
      side.forEach(function(o){if(o.y<HZ+26)return;var x=o.left?28:W-28;g.save();g.translate(x,o.y);
        if(o.kind==='palm'){g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(6,8,20,8,0,0,7);g.fill();
          g.strokeStyle='#7a4a6e';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(0,22);g.quadraticCurveTo(4,8,0,-6);g.stroke();
          for(var f=0;f<7;f++){var an=-1.57+(f-3)*.62+Math.sin(tt*2+o.ph+f)*.06;g.save();g.translate(0,-8);g.rotate(an);
            g.fillStyle=f%2?'#14806e':'#1fb08c';g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(13,-7,26,2);g.quadraticCurveTo(13,2,0,0);g.fill();g.restore()}
          g.fillStyle='#ff9ad4';g.beginPath();g.arc(0,-8,3,0,7);g.fill()}
        else{g.fillStyle='#3b2f63';g.fillRect(-2,10,4,16);g.shadowColor=o.c;g.shadowBlur=14;g.strokeStyle=o.c;g.lineWidth=2.5;g.fillStyle='rgba(20,8,44,.9)';
          rr(g,-22,-13,44,25,6);g.fill();g.stroke();g.fillStyle=o.c;g.font='800 15px '+FONT;g.textAlign='center';g.textBaseline='middle';
          g.globalAlpha=.75+.25*Math.sin(tt*8+o.ph);g.fillText(['★ ♥','24H','GO!',a.lang==='ko'?'야옹':'MEOW','♪ ♪'][o.g],0,0)}
        g.restore()});
      g.textBaseline='alphabetic';
      /* ---- 속도선, 터보 화면 효과 ---- */
      g.strokeStyle=turbo>0?'rgba(255,240,170,.55)':'rgba(255,255,255,.28)';g.lineWidth=2;g.beginPath();
      lines.forEach(function(s){g.moveTo(s.x,s.y);g.lineTo(s.x,s.y-s.l)});g.stroke();
      if(turbo>0){var vg=g.createRadialGradient(W/2,H/2,160,W/2,H/2,400);vg.addColorStop(0,'rgba(255,225,77,0)');vg.addColorStop(1,'rgba(255,170,60,.35)');g.fillStyle=vg;g.fillRect(-20,-20,W+40,H+40)}
      if(flash>0){g.fillStyle='rgba(255,255,255,'+flash*.5+')';g.fillRect(-20,-20,W+40,H+40)}
      /* ---- 게이지 ---- */
      var by=H-52;g.fillStyle='rgba(8,3,24,.72)';rr(g,8,by-22,W-16,62,14);g.fill();
      function bar(x,w,v,c1,c2,label,blinkOn){g.font='800 13px '+FONT;g.textAlign='left';g.fillStyle=blinkOn?'#fff':c1;g.fillText(label,x,by-5);
        g.fillStyle='rgba(255,255,255,.12)';rr(g,x,by+2,w,16,8);g.fill();
        if(v>.02){var bg=g.createLinearGradient(x,0,x+w,0);bg.addColorStop(0,c2);bg.addColorStop(1,c1);g.save();g.shadowColor=c1;g.shadowBlur=blinkOn?16:8;g.fillStyle=bg;
          rr(g,x,by+2,Math.max(16,w*v),16,8);g.fill();g.restore();g.fillStyle='rgba(255,255,255,.35)';rr(g,x+4,by+4,Math.max(8,w*v-8),4,2);g.fill()}
        g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1.5;rr(g,x,by+2,w,16,8);g.stroke()}
      var low=fuel<.25&&Math.floor(tt*6)%2===0,full=gauge>=1&&turbo<=0,fb=full&&Math.floor(tt*6)%2===0;
      bar(20,134,fuel,low?'#ff5a5a':'#7dff9a',low?'#b01e3a':'#1f9f58','⛽ '+L(a,'연료','FUEL'),low);
      bar(168,134,turbo>0?turbo/3:gauge,'#ffe14d','#ff4fa8','⚡ '+L(a,'터보','TURBO'),fb);
      g.font='700 11px '+FONT;g.textAlign='center';g.fillStyle='rgba(255,255,255,.6)';
      g.fillText(full?L(a,'위로 밀기 · Space 로 터보 발동!','Swipe up or press Space for TURBO!'):L(a,'옆 차를 아슬아슬하게 스치면 터보가 차요','Near misses charge your turbo'),W/2-14,by+33);
      if(full&&!dead){g.save();g.font='800 22px '+FONT;g.shadowColor='#ffe14d';g.shadowBlur=14;g.fillStyle='#ffe14d';g.globalAlpha=.6+.4*Math.sin(tt*10);
        g.fillText('▲ '+L(a,'터보!','TURBO!'),p.x,PY-62-Math.abs(Math.sin(tt*6))*6);g.restore()}
    }
  });
  window.__nd=function(){return{lane:p.lane,py:PY,gauge:gauge,turbo:turbo,fuel:fuel,t:t,cars:cars.filter(function(c){return !c.hit}).map(function(c){return{lane:c.lane,y:c.y}}),picks:picks.map(function(k){return{x:k.x,y:k.y,kind:k.kind}})}};
})();
