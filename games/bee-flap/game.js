/* 꿀벌 붕붕 — 탭으로 날갯짓해 해바라기 줄기 사이를 지나고, 꿀을 모아 황금 대시로 줄기를 부순다 */
(function(){
  var bee,obs,drops,clouds,t,sc,hover,meter,dash,dead,streak,GY;
  var GRAV=1100,FLAP=-340,BX=96,R=12,SPACE=210,HW=20,NEED=5,DASH=4;
  function diff(){return Math.min(1,t/70)}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function spawn(x){var d=diff(),gap=190-65*d,prev=obs.length?obs[obs.length-1].gy:GY*.48,
      gy=clamp(prev+(Math.random()*2-1)*(60+50*d),70+gap/2,GY-50-gap/2);
    obs.push({x:x,gy:gy,gap:gap,passed:false,broken:false,rot:Math.random()*6});
    if(Math.random()<.65)drops.push({x:x,y:gy+(Math.random()<.5?-1:1)*(gap/2-26),ph:Math.random()*6});
    if(Math.random()<.6)drops.push({x:x+SPACE/2,y:clamp(gy+(Math.random()<.5?-1:1)*(50+Math.random()*50),60,GY-50),ph:Math.random()*6})}
  function hillY(x,off,base,amp,wl){return base-amp*(Math.sin((x+off)/wl)+.5*Math.sin((x+off)/(wl*.37)+1))}
  function hill(g,W,H,off,base,amp,wl,col){g.fillStyle=col;g.beginPath();g.moveTo(-20,H);
    for(var x=-20;x<=W+20;x+=10)g.lineTo(x,hillY(x,off,base,amp,wl));g.lineTo(W+20,H);g.fill()}
  function sunflower(g,x,y,r,rot){g.save();g.translate(x,y);g.rotate(rot);
    for(var k=0;k<2;k++){g.fillStyle=k?'#ffd42e':'#f5a900';for(var i=0;i<12;i++){g.save();g.rotate(i*Math.PI/6+k*.26);
      g.beginPath();g.ellipse(0,-r*.72,r*.2,r*(k?.36:.42),0,0,7);g.fill();g.restore()}}
    var c=g.createRadialGradient(-r*.15,-r*.15,1,0,0,r*.55);c.addColorStop(0,'#a8682a');c.addColorStop(1,'#5e3511');
    g.fillStyle=c;g.beginPath();g.arc(0,0,r*.52,0,7);g.fill();
    g.fillStyle='rgba(255,220,150,.45)';for(var j=0;j<7;j++){g.beginPath();g.arc(Math.cos(j*2.4)*r*.27,Math.sin(j*2.4)*r*.27,1.4,0,7);g.fill()}
    g.restore()}
  function stalk(g,x,y0,y1,dir){var sg=g.createLinearGradient(x-10,0,x+10,0);
    sg.addColorStop(0,'#2f8a3a');sg.addColorStop(.45,'#7ed467');sg.addColorStop(1,'#256e30');
    g.fillStyle='rgba(0,40,10,.13)';g.fillRect(x-4,Math.min(y0,y1),20,Math.abs(y1-y0));
    g.fillStyle=sg;g.fillRect(x-9,Math.min(y0,y1),18,Math.abs(y1-y0));
    var n=0;for(var y=y1+dir*52;dir>0?y<y0-10:y>y0;y+=dir*46){var s=n++%2?1:-1;g.save();g.translate(x+s*8,y);g.rotate(s*(.5*dir));
      g.fillStyle='#3f9c45';g.beginPath();g.ellipse(s*10,0,13,6,0,0,7);g.fill();
      g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=1;g.beginPath();g.moveTo(s*1,0);g.lineTo(s*19,0);g.stroke();g.restore()}}
  function drawDrop(g,x,y,s){g.save();g.translate(x,y);g.scale(s,s);g.shadowColor='#fff3a0';g.shadowBlur=12;
    var d=g.createRadialGradient(-2,1,1,0,2,10);d.addColorStop(0,'#fff2a6');d.addColorStop(.5,'#ffc233');d.addColorStop(1,'#f08a00');
    g.fillStyle=d;g.beginPath();g.moveTo(0,-11);g.bezierCurveTo(9,-1,8,9,0,9);g.bezierCurveTo(-8,9,-9,-1,0,-11);g.fill();g.shadowBlur=0;
    g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.ellipse(-2.5,1,1.6,3,.3,0,7);g.fill();g.restore()}
  SG.run({
    id:'bee-flap',
    title:{ko:'꿀벌 붕붕',en:'Bee Flap'},
    how:{ko:'탭해서 날갯짓! 꿀을 5개 모으면 황금 대시로 줄기를 부숴요',en:'Tap to flap! Collect 5 nectar drops for a golden dash that smashes stalks.'},
    init:function(a){GY=a.H-56;bee={y:270,vy:0,sq:0};obs=[];drops=[];t=0;sc=0;hover=1.3;meter=0;dash=0;dead=false;streak=0;
      clouds=[];for(var i=0;i<5;i++)clouds.push({x:Math.random()*a.W,y:70+Math.random()*200,s:.6+Math.random()*.7});
      spawn(430);spawn(430+SPACE)},
    update:function(dt,inp,a){
      t+=dt;var d=diff(),sp=(130+100*d)*(dash>0?1.7:1);sc+=sp*dt;a.tempo(1+d*.45+(dash>0?.15:0));
      clouds.forEach(function(c){c.x-=sp*.1*c.s*dt;if(c.x<-80)c.x=a.W+80});
      bee.sq=Math.max(0,bee.sq-dt*5);
      if(inp.tap){hover=0;bee.vy=FLAP;bee.sq=1;a.sfx('jump');a.burst(BX-10,bee.y+8,'rgba(255,255,255,.8)',3)}
      if(hover>0){hover-=dt;bee.y=270+Math.sin(t*5)*6;bee.vy=0}
      else{bee.vy+=GRAV*dt;bee.y+=bee.vy*dt}
      if(bee.y<R+4){bee.y=R+4;if(bee.vy<0)bee.vy=0}
      if(dash>0){dash-=dt;if(Math.random()<dt*30)a.burst(BX-12,bee.y,'#ffe066',1);
        if(dash<=0){dash=0;meter=0;a.beep(330,.2,'triangle');a.pop(BX,bee.y-30,a.lang==='ko'?'대시 끝!':'Dash over!','#fff')}}
      if(bee.y>GY-R){
        if(dash>0){bee.y=GY-R;bee.vy=-300;bee.sq=1;a.burst(BX,GY,'#8fd67a',6)}
        else{bee.y=GY-R;dead=true;a.burst(BX,bee.y,'#ffd42e',22);a.burst(BX,bee.y,'#6b4a1e',10);a.over();return}}
      for(var i=obs.length-1;i>=0;i--){var o=obs[i];o.x-=sp*dt;
        if(o.x<-60){obs.splice(i,1);continue}
        if(o.broken)continue;
        var inX=Math.abs(o.x-BX)<HW+R-2,out=bee.y-R+2<o.gy-o.gap/2||bee.y+R-2>o.gy+o.gap/2;
        if(inX&&out){
          if(dash>0){o.broken=true;o.passed=true;a.add(5);a.sfx('coin');a.beep(160,.12,'sawtooth');a.shake(7);
            a.burst(o.x,bee.y,'#ffd42e',16);a.burst(o.x,bee.y,'#4fae4f',12);a.pop(o.x,bee.y-26,(a.lang==='ko'?'와장창 ':'SMASH ')+'+5','#fff36b')}
          else{dead=true;a.burst(BX,bee.y,'#ffd42e',24);a.burst(BX,bee.y,'#3a2a12',12);a.over();return}}
        if(!o.passed&&o.x+HW<BX-R){o.passed=true;streak++;var p=1+(streak%5===0?2:0);a.add(p);a.beep(660+Math.min(streak,12)*40,.08,'triangle');
          a.pop(BX+6,bee.y-28,'+'+p,p>1?'#ffe066':'#fff');if(p>1)a.burst(BX,bee.y,'#ffffff',8)}}
      var last=obs[obs.length-1];if(last.x<a.W+70-SPACE)spawn(last.x+SPACE);
      for(var j=drops.length-1;j>=0;j--){var n=drops[j];n.x-=sp*dt;
        if(n.x<-30){drops.splice(j,1);continue}
        if(Math.hypot(n.x-BX,n.y-bee.y)<R+13){drops.splice(j,1);a.add(2);a.sfx('coin');a.burst(n.x,n.y,'#ffc233',10);
          if(dash>0)a.pop(n.x,n.y-18,'+2','#fff36b');
          else{meter++;a.pop(n.x,n.y-18,'+2','#fff36b');
            if(meter>=NEED){dash=DASH;a.sfx('win');a.shake(6);a.burst(BX,bee.y,'#fff3a0',26);
              a.pop(a.W/2,a.H*.36,a.lang==='ko'?'황금 대시!':'GOLDEN DASH!','#ffe066')}}}}
    },
    draw:function(g,a){
      var W=a.W,H=a.H,now=performance.now()/1000,d=diff(),gr=g.createLinearGradient(0,0,0,H);
      gr.addColorStop(0,dash>0?'#ffb84d':'#6ec6ff');gr.addColorStop(.55,dash>0?'#ffe3a1':'#c9efff');gr.addColorStop(1,'#fff6d6');
      g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
      g.fillStyle='rgba(255,240,170,.3)';g.beginPath();g.arc(W-66,120,54,0,7);g.fill();
      g.fillStyle='#fff1a8';g.beginPath();g.arc(W-66,120,34,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.88)';clouds.forEach(function(c){g.beginPath();g.ellipse(c.x,c.y,38*c.s,14*c.s,0,0,7);
        g.ellipse(c.x-16*c.s,c.y-8*c.s,18*c.s,13*c.s,0,0,7);g.ellipse(c.x+14*c.s,c.y-10*c.s,22*c.s,16*c.s,0,0,7);g.fill()});
      hill(g,W,H,sc*.18,GY-96,26,70,'#b9e3a0');
      hill(g,W,H,sc*.4+200,GY-42,20,52,'#8fd07a');
      var off=sc*.4+200,cols=['#ff8fb1','#ffffff','#c9a0ff','#ffd42e'];
      for(var fx=-(off%44)-44;fx<W+44;fx+=44){var idx=Math.round((fx+off)/44),fy=hillY(fx,off,GY-42,20,52)+8+(idx*7%13);
        g.strokeStyle='#5aa850';g.lineWidth=2;g.beginPath();g.moveTo(fx,fy+9);g.lineTo(fx,fy);g.stroke();
        g.fillStyle=cols[((idx%4)+4)%4];g.beginPath();g.arc(fx,fy,4,0,7);g.fill();g.fillStyle='#f29a1f';g.beginPath();g.arc(fx,fy,1.6,0,7);g.fill()}
      /* 장애물 */
      obs.forEach(function(o){if(o.broken)return;var top=o.gy-o.gap/2,bot=o.gy+o.gap/2,sw=Math.sin(now*2+o.rot)*.12;
        stalk(g,o.x,-30,top-22,-1);sunflower(g,o.x,top-22,25,Math.PI+sw);
        stalk(g,o.x,GY+6,bot+22,1);sunflower(g,o.x,bot+22,25,sw)});
      drops.forEach(function(n){drawDrop(g,n.x,n.y+Math.sin(now*4+n.ph)*4,1+Math.sin(now*6+n.ph)*.06)});
      /* 땅 */
      var gg=g.createLinearGradient(0,GY,0,H);gg.addColorStop(0,'#6cc25a');gg.addColorStop(1,'#3f9140');
      g.fillStyle=gg;g.fillRect(-20,GY,W+40,H-GY+30);g.fillStyle='#4fa548';g.fillRect(-20,GY,W+40,5);
      g.fillStyle='#8fe07a';for(var x=-(sc%24)-24;x<W+24;x+=24){g.beginPath();g.moveTo(x,GY+1);g.lineTo(x+5,GY-9);g.lineTo(x+10,GY+1);g.fill()}
      for(var x2=-(sc%60)-60;x2<W+60;x2+=60){var i2=Math.round((x2+sc)/60);g.fillStyle=cols[((i2%4)+4)%4];
        for(var p=0;p<5;p++){g.beginPath();g.arc(x2+Math.cos(p*1.257)*4,GY+26+(i2%2)*12+Math.sin(p*1.257)*4,3,0,7);g.fill()}
        g.fillStyle='#f29a1f';g.beginPath();g.arc(x2,GY+26+(i2%2)*12,2.2,0,7);g.fill()}
      /* 벌 */
      var by=bee.y,gold=dash>0;
      g.fillStyle='rgba(0,0,0,'+(.08+.14*clamp(by/GY,0,1))+')';g.beginPath();g.ellipse(BX,GY+3,8+10*clamp(by/GY,0,1),4,0,0,7);g.fill();
      if(gold)for(var k=1;k<=4;k++){g.globalAlpha=.22-k*.045;g.fillStyle='#ffe066';g.beginPath();g.ellipse(BX-k*15,by+bee.vy*.012*k*-1,17,13,0,0,7);g.fill()}
      g.globalAlpha=1;
      g.save();g.translate(BX,by);g.rotate(dead?1.2:clamp(bee.vy/700,-.45,.9));g.scale(1+bee.sq*.2,1-bee.sq*.18);
      if(gold){g.shadowColor='#fff3a0';g.shadowBlur=22}
      g.fillStyle='#3a2a12';g.beginPath();g.moveTo(-15,-2);g.lineTo(-23,1);g.lineTo(-15,4);g.fill();
      var wa=dead?.3:Math.sin(now*46)*.7;g.fillStyle='rgba(255,255,255,.8)';g.strokeStyle='rgba(120,170,210,.7)';g.lineWidth=1;
      [[-5,-.5],[4,.15]].forEach(function(w){g.save();g.translate(w[0],-10);g.rotate(w[1]+wa*.6);g.beginPath();g.ellipse(0,-10,7,12,0,0,7);g.fill();g.stroke();g.restore()});
      var bg=g.createRadialGradient(-4,-6,2,0,0,19);bg.addColorStop(0,gold?'#fffbd0':'#ffe873');bg.addColorStop(1,gold?'#ffc21a':'#f7b500');
      g.fillStyle=bg;g.beginPath();g.ellipse(0,0,17,14,0,0,7);g.fill();g.shadowBlur=0;
      g.save();g.beginPath();g.ellipse(0,0,17,14,0,0,7);g.clip();g.fillStyle=gold?'#b8741a':'#3a2a12';g.fillRect(-11,-15,5,30);g.fillRect(-2,-15,5,30);
      g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.ellipse(-2,-8,11,4,0,0,7);g.fill();g.restore();
      g.strokeStyle='#3a2a12';g.lineWidth=1.6;g.lineCap='round';g.beginPath();g.moveTo(9,-11);g.quadraticCurveTo(12,-20,17,-19);g.moveTo(5,-12);g.quadraticCurveTo(6,-22,11,-22);g.stroke();
      g.fillStyle='#3a2a12';g.beginPath();g.arc(17,-19,2,0,7);g.arc(11,-22,2,0,7);g.fill();
      if(dead){g.strokeStyle='#3a2a12';g.lineWidth=2;g.beginPath();g.moveTo(7,-6);g.lineTo(13,0);g.moveTo(13,-6);g.lineTo(7,0);g.stroke();
        g.beginPath();g.arc(10,8,3,3.4,6);g.stroke()}
      else{g.fillStyle='#fff';g.beginPath();g.arc(10,-3,5,0,7);g.fill();g.fillStyle='#2b2320';
        if((now%3)<.12)g.fillRect(6,-4,8,2);else{g.beginPath();g.arc(11.5,-2.5+clamp(bee.vy/400,-1.5,1.5),2.6,0,7);g.fill();
          g.fillStyle='#fff';g.beginPath();g.arc(12.3,-3.6,1,0,7);g.fill()}
        g.fillStyle='rgba(255,120,120,.6)';g.beginPath();g.ellipse(6,5,3.5,2.2,0,0,7);g.fill();
        g.strokeStyle='#3a2a12';g.lineWidth=1.4;g.beginPath();if(gold||bee.vy<0)g.arc(12,4,3,.2,2.6);else g.arc(12,7,2.5,3.6,5.8);g.stroke()}
      g.restore();
      /* 꿀 미터 */
      var mx=92,my=64,mw=190,mh=16,fill=gold?dash/DASH:meter/NEED;
      g.fillStyle='rgba(60,35,5,.35)';g.beginPath();g.roundRect(mx-2,my,mw+4,mh+4,10);g.fill();
      g.fillStyle='rgba(255,255,255,.75)';g.beginPath();g.roundRect(mx,my,mw,mh,8);g.fill();
      if(fill>0){var mg=g.createLinearGradient(0,my,0,my+mh);mg.addColorStop(0,'#ffe680');mg.addColorStop(1,gold&&(now*8|0)%2?'#ff7a00':'#f5a300');
        g.fillStyle=mg;g.beginPath();g.roundRect(mx,my,Math.max(mh,mw*fill),mh,8);g.fill();
        g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.roundRect(mx+4,my+3,Math.max(4,mw*fill-8),4,2);g.fill()}
      g.strokeStyle='rgba(120,70,10,.35)';g.lineWidth=1;for(var s=1;s<NEED;s++){g.beginPath();g.moveTo(mx+mw*s/NEED,my+2);g.lineTo(mx+mw*s/NEED,my+mh-2);g.stroke()}
      g.fillStyle='#8a5a1c';g.beginPath();g.roundRect(mx-34,my-9,26,7,3);g.fill();
      var jg=g.createLinearGradient(mx-34,0,mx-8,0);jg.addColorStop(0,'#ffd866');jg.addColorStop(1,'#f09a00');g.fillStyle=jg;
      g.beginPath();g.roundRect(mx-33,my-3,24,24,7);g.fill();g.fillStyle='rgba(255,255,255,.55)';g.fillRect(mx-29,my+2,4,13);
      g.font='800 13px Jua,system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
      var lab=gold?(a.lang==='ko'?'황금 대시!':'GOLDEN DASH!'):(a.lang==='ko'?'꿀 ':'Honey ')+meter+'/'+NEED;
      g.fillStyle='rgba(255,255,255,.8)';g.fillText(lab,mx+mw/2+1,my+mh/2+2);g.fillStyle='#6b3f08';g.fillText(lab,mx+mw/2,my+mh/2+1);
      if(hover>0&&!dead){g.font='800 22px Jua,system-ui,sans-serif';g.globalAlpha=.6+.4*Math.sin(now*6);
        var h=a.lang==='ko'?'탭해서 날아요!':'Tap to flap!';g.fillStyle='rgba(0,0,0,.3)';g.fillText(h,W/2+1,362);g.fillStyle='#fff';g.fillText(h,W/2,360);g.globalAlpha=1}
      g.textBaseline='alphabetic';
    }
  });
})();
