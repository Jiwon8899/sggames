/* 냠냠 스네이크 — 간식을 먹고 길어지는 뱀. 배고픔 게이지가 바닥나면 끝! */
(function(){
  var COLS=12,ROWS=18,C=28,BX=12,BY=112,BW=COLS*C,BH=ROWS*C;
  var DV={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]},OPP={left:'right',right:'left',up:'down',down:'up'};
  var F=function(px){return '800 '+px+'px Jua, system-ui, sans-serif'};
  var s,dir,q,p,grow,tailPrev,hunger,apple,donut,chili,donutT,chiliT,boost,combo,comboT,bulges,t,vt=0,ready,dead,starved,
      warnT,ox,oy,dragged,leaves,sparks,gulp,tile=null;

  function cx(c){return BX+c.x*C+C/2}
  function cy(c){return BY+c.y*C+C/2}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function mix(a,b,k){return 'rgb('+Math.round(a[0]+(b[0]-a[0])*k)+','+Math.round(a[1]+(b[1]-a[1])*k)+','+Math.round(a[2]+(b[2]-a[2])*k)+')'}
  function taken(x,y){for(var i=0;i<s.length;i++)if(s[i].x===x&&s[i].y===y)return true;
    return !!((apple&&apple.x===x&&apple.y===y)||(donut&&donut.x===x&&donut.y===y)||(chili&&chili.x===x&&chili.y===y))}
  function freeCell(){for(var i=0;i<200;i++){var x=Math.floor(Math.random()*COLS),y=Math.floor(Math.random()*ROWS);
      if(!taken(x,y)&&Math.abs(x-s[0].x)+Math.abs(y-s[0].y)>2)return {x:x,y:y,born:t,ph:Math.random()*6}}
    for(var yy=0;yy<ROWS;yy++)for(var xx=0;xx<COLS;xx++)if(!taken(xx,yy))return {x:xx,y:yy,born:t,ph:0};
    return null}
  function turn(d){var last=q.length?q[q.length-1]:dir;if(q.length<2&&d!==last&&d!==OPP[last])q.push(d)}
  function speed(){return Math.min(9,4+(s.length-4)*.14)*(boost>0?1.35:1)}
  function headPos(){var a=s[1],b=s[0];return {x:cx(a)+(cx(b)-cx(a))*p,y:cy(a)+(cy(b)-cy(a))*p}}
  function die(a,why){dead=true;starved=why==='hunger';var h=headPos();
    a.burst(h.x,h.y,'#8be36f',22);a.burst(h.x,h.y,'#fff',10);a.shake(12);
    a.pop(h.x,h.y-22,starved?(a.lang==='ko'?'배고파…':'So hungry…'):(a.lang==='ko'?'쿵!':'Bonk!'),'#ffd0d0');a.over()}
  function eat(a,kind,o){var base=kind==='apple'?1:kind==='donut'?3:2,h=headPos();
    combo=comboT>0?combo+1:1;comboT=3.2;
    if(kind==='chili')boost=4;
    var pts=(base+Math.min(combo-1,4))*(boost>0?2:1);
    a.add(pts);grow+=1;bulges.push({f:0});gulp=.25;
    hunger=Math.min(1,hunger+(kind==='apple'?.4:kind==='donut'?.6:.35));
    var px=cx(o),py=cy(o);
    if(kind==='apple'){a.sfx('coin');a.burst(px,py,'#ff5d5d',10)}
    else if(kind==='donut'){a.sfx('win');a.burst(px,py,'#ff9ecf',14);a.burst(px,py,'#ffe08a',8)}
    else{a.sfx('jump');a.beep(880,.12);a.burst(px,py,'#ff7a2e',18);a.shake(5);
      a.pop(BX+BW/2,BY+40,a.lang==='ko'?'매운맛! 점수 2배':'Spicy! Double points','#ffb347')}
    a.pop(px,py-14,'+'+pts,boost>0?'#ffb347':'#fff36b');
    if(combo>=2){a.pop(h.x,h.y-34,(a.lang==='ko'?'콤보 x':'Combo x')+combo,'#9ff0ff');a.beep(520+combo*70,.08)}}

  SG.run({
    id:'snack-snake',
    title:{ko:'냠냠 스네이크',en:'Snack Snake'},
    how:{ko:'밀어서(또는 방향키) 방향을 바꿔 간식을 먹어요. 배고픔 게이지가 비면 끝!',en:'Swipe or use arrow keys to turn. Eat snacks before the hunger bar runs out!'},
    init:function(a){
      s=[{x:5,y:3},{x:5,y:2},{x:5,y:1},{x:5,y:0}];tailPrev={x:5,y:0};dir='down';q=[];p=0;grow=0;hunger=1;
      apple=null;donut=null;chili=null;donutT=4;chiliT=9;boost=0;combo=0;comboT=0;bulges=[];t=0;ready=.9;dead=false;starved=false;
      warnT=0;ox=oy=0;dragged=false;gulp=0;apple={x:5,y:9,born:0,ph:0};
      if(!leaves){leaves=[];for(var i=0;i<7;i++)leaves.push({x:Math.random()*a.W,y:Math.random()*a.H,v:14+Math.random()*18,w:Math.random()*6,r:Math.random()*6,c:i%2?'#ffd86b':'#b9f08a'});
        sparks=[];for(var j=0;j<9;j++)sparks.push({x:BX+Math.random()*BW,y:BY+Math.random()*BH,ph:Math.random()*6})}
    },
    update:function(dt,inp,a){
      t+=dt;
      /* 입력: 누른 채 끌면 즉시 반응, 키보드는 inp.swipe */
      if(inp.tap&&inp.x!=null){ox=inp.x;oy=inp.y;dragged=false}
      if(inp.down&&inp.x!=null){var dx=inp.x-ox,dy=inp.y-oy;
        if(Math.max(Math.abs(dx),Math.abs(dy))>22){turn(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));ox=inp.x;oy=inp.y;dragged=true}}
      if(inp.swipe&&(inp.x==null||!dragged))turn(inp.swipe);
      if(ready>0){ready-=dt;return}
      /* 배고픔 */
      hunger-=dt*(1+Math.min(1,t/100)*.6)/12;
      if(hunger<=0){hunger=0;die(a,'hunger');return}
      if(hunger<.25){warnT-=dt;if(warnT<=0){warnT=.5;a.beep(240,.07)}}
      if(boost>0){boost-=dt;if(Math.random()<dt*14){var hp=headPos();a.burst(hp.x,hp.y,Math.random()<.5?'#ffb347':'#ff5a2e',1)}}
      if(comboT>0){comboT-=dt;if(comboT<=0)combo=0}
      gulp=Math.max(0,gulp-dt);
      a.tempo(1+(Math.min(9,4+(s.length-4)*.14)-4)/5*.45+(boost>0?.15:0));
      /* 특별 간식 */
      if(!donut){donutT-=dt;if(donutT<=0){donut=freeCell();if(donut)donut.life=5.5;donutT=5+Math.random()*4}}
      else{donut.life-=dt;if(donut.life<=0){a.burst(cx(donut),cy(donut),'#ffd3ea',5);donut=null}}
      if(!chili){chiliT-=dt;if(chiliT<=0){chili=freeCell();if(chili)chili.life=6;chiliT=10+Math.random()*6}}
      else{chili.life-=dt;if(chili.life<=0){a.burst(cx(chili),cy(chili),'#ffb199',5);chili=null}}
      /* 이동 */
      p+=speed()*dt;
      while(p>=1){p-=1;if(q.length)dir=q.shift();
        var v=DV[dir],nx=s[0].x+v[0],ny=s[0].y+v[1];
        if(nx<0||ny<0||nx>=COLS||ny>=ROWS){p=1;die(a,'wall');return}
        for(var i=0;i<s.length-(grow>0?0:1);i++)if(s[i].x===nx&&s[i].y===ny){p=1;die(a,'self');return}
        s.unshift({x:nx,y:ny});
        if(grow>0){grow--;tailPrev={x:s[s.length-1].x,y:s[s.length-1].y}}else tailPrev=s.pop()}
      for(var b=bulges.length-1;b>=0;b--){bulges[b].f+=dt*13;if(bulges[b].f>s.length)bulges.splice(b,1)}
      if(p>=.45){var h=s[0];
        if(apple&&apple.x===h.x&&apple.y===h.y){var o=apple;apple=null;eat(a,'apple',o);apple=freeCell()}
        else if(donut&&donut.x===h.x&&donut.y===h.y){var o2=donut;donut=null;eat(a,'donut',o2)}
        else if(chili&&chili.x===h.x&&chili.y===h.y){var o3=chili;chili=null;eat(a,'chili',o3)}}
    },
    draw:function(g,a,dt){
      vt+=dt||0;var W=a.W,H=a.H,ko=a.lang==='ko',i;
      /* 배경 */
      var bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1f6f5c');bg.addColorStop(.5,'#18574d');bg.addColorStop(1,'#123f3d');
      g.fillStyle=bg;g.fillRect(-20,-20,W+40,H+40);
      g.fillStyle='rgba(255,255,255,.05)';for(i=0;i<6;i++){g.beginPath();g.arc((i*83+vt*6)%(W+80)-40,30+((i*57)%70),26+i*4,0,7);g.fill()}
      /* 보드 테두리 */
      g.fillStyle='rgba(0,0,0,.28)';rr(g,BX-8,BY-4,BW+16,BH+18,16);g.fill();
      var fr=g.createLinearGradient(0,BY-10,0,BY+BH+10);fr.addColorStop(0,'#e0a868');fr.addColorStop(1,'#a8693a');
      g.fillStyle=fr;rr(g,BX-9,BY-9,BW+18,BH+18,15);g.fill();
      g.strokeStyle='rgba(255,236,190,.55)';g.lineWidth=2;rr(g,BX-7,BY-7,BW+14,BH+14,13);g.stroke();
      g.fillStyle='#8a5229';for(i=0;i<4;i++){g.beginPath();g.arc(i%2?BX+BW+4.5:BX-4.5,i<2?BY-4.5:BY+BH+4.5,2,0,7);g.fill()}
      /* 타일(한 번만 그려 캐시) */
      if(!tile){tile=document.createElement('canvas');tile.width=BW;tile.height=BH;var tg=tile.getContext('2d');
        for(var y=0;y<ROWS;y++)for(var x=0;x<COLS;x++){tg.fillStyle=(x+y)%2?'#a6de6a':'#b7e97b';tg.fillRect(x*C,y*C,C,C);
          tg.fillStyle='rgba(255,255,255,.13)';tg.fillRect(x*C,y*C,C,2);tg.fillStyle='rgba(40,110,40,.10)';tg.fillRect(x*C,y*C+C-2,C,2);
          if((x*7+y*13)%11===0){tg.fillStyle='rgba(60,140,50,.35)';tg.fillRect(x*C+8,y*C+16,2,5);tg.fillRect(x*C+12,y*C+14,2,7);tg.fillRect(x*C+16,y*C+17,2,4)}}
        var og=tg.createLinearGradient(0,0,0,BH);og.addColorStop(0,'rgba(255,255,200,.22)');og.addColorStop(1,'rgba(20,110,90,.28)');tg.fillStyle=og;tg.fillRect(0,0,BW,BH)}
      g.drawImage(tile,BX,BY);
      g.save();g.beginPath();g.rect(BX,BY,BW,BH);g.clip();
      /* 반짝이 */
      sparks.forEach(function(k){var al=Math.max(0,Math.sin(vt*1.6+k.ph));if(al<.05)return;g.globalAlpha=al*.7;g.fillStyle='#fffbe0';
        var r=2+al*3;g.beginPath();g.moveTo(k.x,k.y-r);g.quadraticCurveTo(k.x,k.y,k.x+r,k.y);g.quadraticCurveTo(k.x,k.y,k.x,k.y+r);g.quadraticCurveTo(k.x,k.y,k.x-r,k.y);g.quadraticCurveTo(k.x,k.y,k.x,k.y-r);g.fill()});
      g.globalAlpha=1;
      /* 간식 */
      function shadow(o,k){g.fillStyle='rgba(20,70,30,.25)';g.beginPath();g.ellipse(cx(o),cy(o)+11,9*k,3.2*k,0,0,7);g.fill()}
      function inScale(o){return Math.min(1,(t-o.born)*5+.01)}
      if(apple){var ab=Math.sin(vt*4+apple.ph)*2.2,as=inScale(apple);shadow(apple,1-ab*.06);
        g.save();g.translate(cx(apple),cy(apple)+ab-1);g.scale(as,as);
        var ag=g.createRadialGradient(-3,-4,1,0,0,11);ag.addColorStop(0,'#ff9a8a');ag.addColorStop(.5,'#f0433f');ag.addColorStop(1,'#c2262e');
        g.fillStyle=ag;g.beginPath();g.arc(-3.5,1,7.5,0,7);g.arc(3.5,1,7.5,0,7);g.fill();
        g.strokeStyle='#6b3d1c';g.lineWidth=2;g.lineCap='round';g.beginPath();g.moveTo(0,-5);g.quadraticCurveTo(1,-9,3,-11);g.stroke();
        g.fillStyle='#4fb84a';g.beginPath();g.ellipse(6,-9,4.5,2.2,-.5,0,7);g.fill();
        g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(-5,-2,2,3.2,.5,0,7);g.fill();g.restore()}
      if(donut&&(donut.life>1.5||Math.floor(vt*10)%2)){var db=Math.sin(vt*5+donut.ph)*2.5,ds=inScale(donut);shadow(donut,1.1-db*.06);
        g.save();g.translate(cx(donut),cy(donut)+db-1);g.scale(ds,ds);g.rotate(Math.sin(vt*2)*.25);
        g.shadowColor='#fff2a8';g.shadowBlur=10;g.strokeStyle='#d99a55';g.lineWidth=8;g.beginPath();g.arc(0,0,7.5,0,7);g.stroke();g.shadowBlur=0;
        g.strokeStyle='#ff8cc6';g.lineWidth=5.5;g.beginPath();g.arc(0,-.8,7.5,0,7);g.stroke();
        var sc=['#fff','#7fe0ff','#ffe45c','#9dff8a'];for(i=0;i<8;i++){var an=i*.785+.3;g.fillStyle=sc[i%4];g.fillRect(Math.cos(an)*7.5-1,Math.sin(an)*7.5-1.6,2.4,1.6)}
        g.restore();
        g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=2;g.beginPath();g.arc(cx(donut),cy(donut),13,-1.57,-1.57+6.283*donut.life/5.5);g.stroke()}
      if(chili&&(chili.life>1.5||Math.floor(vt*10)%2)){var cb=Math.sin(vt*6+chili.ph)*2.5,cs=inScale(chili);shadow(chili,1-cb*.06);
        g.save();g.translate(cx(chili),cy(chili)+cb-1);g.scale(cs,cs);g.rotate(-.5+Math.sin(vt*3)*.12);
        g.shadowColor='#ff9d2e';g.shadowBlur=12+Math.sin(vt*8)*4;
        var cg=g.createLinearGradient(-10,0,10,0);cg.addColorStop(0,'#ff7b3a');cg.addColorStop(1,'#d81f2a');g.fillStyle=cg;
        g.beginPath();g.moveTo(8,-5);g.quadraticCurveTo(12,2,4,7);g.quadraticCurveTo(-4,11,-12,6);g.quadraticCurveTo(-3,5,1,-1);g.quadraticCurveTo(3,-6,8,-5);g.fill();g.shadowBlur=0;
        g.fillStyle='#3fa844';g.beginPath();g.ellipse(7.5,-6,4,2.6,.6,0,7);g.fill();
        g.strokeStyle='#3fa844';g.lineWidth=2;g.lineCap='round';g.beginPath();g.moveTo(8,-7);g.lineTo(11,-11);g.stroke();
        g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.ellipse(5,0,1.3,3,.7,0,7);g.fill();g.restore()}
      /* 뱀 */
      var n=s.length,pts=[],a1=s[1],a0=s[0];
      pts.push({x:cx(a1)+(cx(a0)-cx(a1))*p,y:cy(a1)+(cy(a0)-cy(a1))*p});
      for(i=1;i<n-1;i++)pts.push({x:cx(s[i]),y:cy(s[i])});
      var tl=s[n-1];pts.push({x:cx(tailPrev)+(cx(tl)-cx(tailPrev))*p,y:cy(tailPrev)+(cy(tl)-cy(tailPrev))*p});
      var m=pts.length,hot=boost>0,cA=hot?[255,170,60]:[126,226,92],cB=hot?[226,74,48]:[38,150,112];
      function wd(k){var r=m-1-k;return r<3?11+r*3:20}
      g.lineCap='round';g.lineJoin='round';
      g.fillStyle='rgba(20,70,30,.22)';for(i=m-1;i>=0;i-=1){g.beginPath();g.ellipse(pts[i].x+1,pts[i].y+6,wd(i)/2,wd(i)/2.6,0,0,7);g.fill()}
      g.strokeStyle=hot?'#8f2a1a':'#1c6b4c';
      for(i=m-1;i>0;i--){g.lineWidth=wd(i)+4;g.beginPath();g.moveTo(pts[i].x,pts[i].y);g.lineTo(pts[i-1].x,pts[i-1].y);g.stroke()}
      bulges.forEach(function(b){var k=Math.min(m-1,Math.floor(b.f)),k2=Math.min(m-1,k+1),fr2=b.f-Math.floor(b.f);b.x=pts[k].x+(pts[k2].x-pts[k].x)*fr2;b.y=pts[k].y+(pts[k2].y-pts[k].y)*fr2;b.k=k;
        g.fillStyle=hot?'#8f2a1a':'#1c6b4c';g.beginPath();g.arc(b.x,b.y,wd(k)/2+5.5,0,7);g.fill()});
      for(i=m-1;i>0;i--){g.strokeStyle=mix(cA,cB,i/Math.max(6,m));g.lineWidth=wd(i);g.beginPath();g.moveTo(pts[i].x,pts[i].y);g.lineTo(pts[i-1].x,pts[i-1].y);g.stroke()}
      bulges.forEach(function(b){g.fillStyle=mix(cA,cB,b.k/Math.max(6,m));g.beginPath();g.arc(b.x,b.y,wd(b.k)/2+3.5,0,7);g.fill();
        g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.arc(b.x-3,b.y-4,3,0,7);g.fill()});
      for(i=2;i<m-1;i+=2){g.fillStyle=hot?'rgba(255,240,150,.5)':'rgba(220,255,170,.5)';g.beginPath();g.arc(pts[i].x,pts[i].y,wd(i)*.2,0,7);g.fill()}
      g.strokeStyle='rgba(255,255,255,.2)';g.lineWidth=5;g.beginPath();g.moveTo(pts[0].x-2,pts[0].y-3);for(i=1;i<m;i++)g.lineTo(pts[i].x-2,pts[i].y-3);g.stroke();
      /* 머리 */
      var hx=pts[0].x,hy=pts[0].y,ang=Math.atan2(a0.y-a1.y,a0.x-a1.x),hs=1+gulp*.9;
      g.save();g.translate(hx,hy);g.rotate(ang);g.scale(hs,hs);
      if(!dead&&(vt%2.1)<.32){var tk=Math.sin((vt%2.1)/.32*3.1416);g.strokeStyle='#ff4f7a';g.lineWidth=2.4;
        g.beginPath();g.moveTo(11,0);g.lineTo(13+9*tk,0);g.moveTo(13+9*tk,0);g.lineTo(17+10*tk,-3);g.moveTo(13+9*tk,0);g.lineTo(17+10*tk,3);g.stroke()}
      g.fillStyle=hot?'#8f2a1a':'#1c6b4c';g.beginPath();g.ellipse(1,0,16,15,0,0,7);g.fill();
      var hg=g.createRadialGradient(-2,-4,2,0,0,15);hg.addColorStop(0,hot?'#ffd27a':'#b6f58c');hg.addColorStop(1,hot?'#f08a3c':'#5fcf5a');
      g.fillStyle=hg;g.beginPath();g.ellipse(1,0,14,13,0,0,7);g.fill();
      g.fillStyle='rgba(255,130,150,.55)';g.beginPath();g.arc(1,-10.5,2.6,0,7);g.arc(1,10.5,2.6,0,7);g.fill();
      g.fillStyle='#1c5a3c';g.beginPath();g.arc(12,-2.5,1,0,7);g.arc(12,2.5,1,0,7);g.fill();
      if(dead){g.strokeStyle='#2b2320';g.lineWidth=2.2;[-6,6].forEach(function(e){g.beginPath();g.moveTo(2,e-3);g.lineTo(8,e+3);g.moveTo(8,e-3);g.lineTo(2,e+3);g.stroke()})}
      else if((vt%3.4)<.13){g.strokeStyle='#2b2320';g.lineWidth=2.2;g.beginPath();g.moveTo(5,-9);g.lineTo(5,-3);g.moveTo(5,3);g.lineTo(5,9);g.stroke()}
      else{g.fillStyle='#fff';g.beginPath();g.arc(4.5,-6,4.8,0,7);g.arc(4.5,6,4.8,0,7);g.fill();
        g.fillStyle='#2b2320';g.beginPath();g.arc(6.5,-6,2.5,0,7);g.arc(6.5,6,2.5,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(7.3,-7,.9,0,7);g.arc(7.3,5,.9,0,7);g.fill()}
      g.restore();
      /* 떠다니는 잎 */
      leaves.forEach(function(l){l.y+=l.v*(dt||0);l.x+=Math.sin(vt*.8+l.w)*12*(dt||0);l.r+=(dt||0)*.9;if(l.y>H+10){l.y=BY-10;l.x=BX+Math.random()*BW}
        g.save();g.translate(l.x,l.y);g.rotate(l.r);g.globalAlpha=.55;g.fillStyle=l.c;g.beginPath();g.ellipse(0,0,6,2.8,0,0,7);g.fill();
        g.strokeStyle='rgba(60,110,40,.5)';g.lineWidth=.8;g.beginPath();g.moveTo(-6,0);g.lineTo(6,0);g.stroke();g.restore()});
      /* 배고픔 경고 */
      if(hunger<.25&&!dead){var vg=g.createRadialGradient(BX+BW/2,BY+BH/2,BW*.45,BX+BW/2,BY+BH/2,BH*.62);
        vg.addColorStop(0,'rgba(255,40,40,0)');vg.addColorStop(1,'rgba(255,40,40,'+(.22+.14*Math.sin(vt*10))+')');g.fillStyle=vg;g.fillRect(BX,BY,BW,BH)}
      if(ready>0&&t>0){g.globalAlpha=Math.min(1,ready*3);g.textAlign='center';g.font=F(22);
        var rs=ko?'밀어서 방향 전환!':'Swipe to turn!';g.fillStyle='rgba(0,0,0,.35)';g.fillText(rs,BX+BW/2+1,BY+BH*.62+2);g.fillStyle='#fff';g.fillText(rs,BX+BW/2,BY+BH*.62);g.globalAlpha=1}
      g.restore();
      /* HUD: 배고픔 게이지 */
      var hy0=52,low=hunger<.25,pulse=low?1+Math.sin(vt*12)*.06:1;
      g.textAlign='left';g.textBaseline='middle';g.font=F(14);g.fillStyle=low?'#ffb0a0':'#eafff0';g.fillText(ko?'배고픔':'Hunger',14,hy0+9);
      var bx=74,bw=W-bx-14;
      g.fillStyle='rgba(0,0,0,.35)';rr(g,bx-2,hy0-2,bw+4,22,11);g.fill();
      g.fillStyle='#0f3a34';rr(g,bx,hy0,bw,18,9);g.fill();
      var fw=Math.max(0,(bw-4)*hunger);
      if(fw>3){var hgr=g.createLinearGradient(0,hy0,0,hy0+18),col=hunger>.5?['#c8ff8a','#58c94a']:hunger>.25?['#ffe98a','#f0a52e']:['#ff9a8a','#e03a3a'];
        hgr.addColorStop(0,col[0]);hgr.addColorStop(1,col[1]);g.fillStyle=hgr;
        g.save();g.translate(bx+2,hy0+9);g.scale(1,pulse);rr(g,0,-7,Math.max(fw,14),14,7);g.fill();
        g.fillStyle='rgba(255,255,255,.35)';rr(g,4,-5,Math.max(fw-8,4),4,2);g.fill();g.restore()}
      g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1;for(i=1;i<4;i++){g.beginPath();g.moveTo(bx+bw*i/4,hy0+3);g.lineTo(bx+bw*i/4,hy0+15);g.stroke()}
      /* HUD: 콤보 / 매운맛 */
      g.font=F(15);var ry=90;
      if(combo>=2&&comboT>0){g.fillStyle='#9ff0ff';g.fillText((ko?'콤보 x':'Combo x')+combo,14,ry);
        g.fillStyle='rgba(0,0,0,.3)';rr(g,96,ry-4,70,7,3.5);g.fill();g.fillStyle='#9ff0ff';rr(g,96,ry-4,Math.max(7,70*comboT/3.2),7,3.5);g.fill()}
      else{g.fillStyle='rgba(234,255,240,.55)';g.font=F(13);g.fillText((ko?'길이 ':'Length ')+(s.length-1),14,ry)}
      if(boost>0){g.textAlign='right';g.font=F(15);g.fillStyle='#ffb347';g.fillText(ko?'매운맛 2배!':'Spicy x2!',W-92,ry);
        g.fillStyle='rgba(0,0,0,.3)';rr(g,W-84,ry-4,70,7,3.5);g.fill();g.fillStyle='#ff7a2e';rr(g,W-84,ry-4,Math.max(7,70*boost/4),7,3.5);g.fill()}
      g.textBaseline='alphabetic';g.textAlign='center';
    }
  });
})();
