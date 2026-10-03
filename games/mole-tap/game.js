/* 두더지 톡톡 — 45초 동안 두더지를 톡 치고, 토끼는 건드리지 않는다 */
(function(){
  var HX=[70,180,290],HY=[318,424,530],MAXT=45,CAP=75;
  var holes,time,el,spawn,combo,cur,kbd,mal,amb=0,clouds,flies,ended,flash;
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function ease(p){var c=1.70158,q=p-1;return 1+(c+1)*q*q*q+c*q*q}
  function mult(){return Math.min(5,1+Math.floor(combo/4))}
  function whack(i,a){
    var h=holes[i],x=HX[i%3],y=HY[(i/3)|0],ko=a.lang==='ko';
    mal={i:i,t:0};cur=i;
    if(h.kind&&h.st!=='hit'&&h.p>.3){
      h.st='hit';h.ht=0;
      if(h.kind==='bunny'){time-=3;combo=0;flash=.35;a.sfx('hit');a.shake(9);a.burst(x,y-34,'#ffb3c7',12);
        a.pop(x,y-70,ko?'-3초':'-3s','#ff6b7d')}
      else{combo++;var m=mult(),g=h.kind==='gold',pts=(g?30:10)*m;a.add(pts);
        if(g){time=Math.min(MAXT,time+5);a.sfx('win');a.burst(x,y-34,'#ffe14d',22);a.burst(x,y-34,'#fff',8);
          a.pop(x,y-88,ko?'+5초':'+5s','#7dffb0');a.shake(5)}
        else{a.sfx('coin');a.burst(x,y-34,'#ffd98a',10);a.shake(3)}
        a.pop(x,y-66,'+'+pts,g?'#ffe14d':'#fff');
        if(combo%4===0&&m>1&&combo<=16){a.beep(520+m*90,.12,'triangle');a.pop(a.W/2,118,(ko?'콤보 ':'Combo ')+'x'+m+'!','#ffef7a')}}
    }else{if(combo>2)a.pop(x,y-40,ko?'헛손질':'Miss','#e8e8e8');combo=0;a.sfx('tap');a.burst(x,y-6,'#b98a5a',5)}
  }
  SG.run({
    id:'mole-tap',
    title:{ko:'두더지 톡톡',en:'Mole Tap'},
    how:{ko:'두더지를 톡! 토끼는 건드리면 안 돼요',en:'Bonk the moles. Never tap the bunny!'},
    init:function(a){
      holes=[];for(var i=0;i<9;i++)holes.push({kind:null,p:0,st:'',stay:0,ht:0});
      time=MAXT;el=0;spawn=.3;combo=0;cur=4;kbd=false;mal=null;ended=false;flash=0;
      clouds=[];for(i=0;i<4;i++)clouds.push({x:Math.random()*a.W,y:84+Math.random()*90,s:.6+Math.random()*.6,v:5+Math.random()*10});
      flies=[];for(i=0;i<3;i++)flies.push({x:Math.random()*a.W,y:200+Math.random()*60,ph:Math.random()*6,v:(i%2?-1:1)*(18+Math.random()*14),c:['#ff8fb8','#8fc7ff','#ffd35c'][i]});
    },
    update:function(dt,inp,a){
      el+=dt;time-=dt;time=Math.min(time,CAP-el);flash=Math.max(0,flash-dt);
      var k=Math.min(1,el/40);a.tempo(1+k*.6);
      if(inp.down)kbd=false;
      if(inp.swipe&&inp.x==null){kbd=true;var c=cur%3,r=(cur/3)|0;
        if(inp.swipe==='left')c=(c+2)%3;else if(inp.swipe==='right')c=(c+1)%3;
        else if(inp.swipe==='up')r=(r+2)%3;else r=(r+1)%3;cur=r*3+c;a.beep(880,.03)}
      else if(inp.tap){
        if(inp.x!=null&&(inp.down||!kbd)){var hit=-1;
          for(var i=0;i<9;i++){var dx=inp.x-HX[i%3],dy=inp.y-HY[(i/3)|0];if(Math.abs(dx)<54&&dy>-80&&dy<30)hit=i}
          if(hit>=0)whack(hit,a)}
        else{kbd=true;whack(cur,a)}}
      if(mal){mal.t+=dt;if(mal.t>.28)mal=null}
      spawn-=dt;var act=0;holes.forEach(function(h){if(h.kind)act++});
      if(spawn<=0){spawn=.8-k*.45+Math.random()*.15;
        if(act<Math.min(4,2+Math.floor(el/12))){var e=[];holes.forEach(function(h,i){if(!h.kind)e.push(i)});
          var h=holes[e[(Math.random()*e.length)|0]],r=Math.random();
          h.kind=el>4&&r<.07?'gold':r<.07+.14+k*.12?'bunny':'mole';h.p=0;h.st='up';h.ht=0;
          h.stay=(h.kind==='gold'?.75:1)*(1.5-k*.75);a.beep(h.kind==='gold'?1320:h.kind==='bunny'?620:420,.04,'sine')}}
      holes.forEach(function(h){if(!h.kind)return;
        if(h.st==='up'){h.p=Math.min(1,h.p+dt*5);if(h.p>=1){h.stay-=dt;if(h.stay<=0)h.st='down'}}
        else if(h.st==='hit'){h.ht+=dt;if(h.ht>.4)h.st='down'}
        else{h.p-=dt*(h.ht?3.2:5);if(h.p<=0){h.p=0;h.kind=null}}});
      if(time<=0){time=0;ended=true;a.over()}
      else if(time<5&&Math.floor(time+dt)!==Math.floor(time))a.beep(700,.06,'square');
    },
    draw:function(g,a,dt){
      amb+=dt||.016;var W=a.W,H=a.H,ko=a.lang==='ko',i,x,F=' Jua, system-ui, sans-serif';
      var s=g.createLinearGradient(0,0,0,270);s.addColorStop(0,'#6ec6ff');s.addColorStop(1,'#e3f7ff');
      g.fillStyle=s;g.fillRect(-20,-20,W+40,300);
      g.fillStyle='rgba(255,240,160,.3)';g.beginPath();g.arc(300,130,46+Math.sin(amb*2)*3,0,7);g.fill();
      g.fillStyle='#fff3a6';g.beginPath();g.arc(300,130,30,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.9)';clouds.forEach(function(c){c.x+=c.v*(dt||0);if(c.x>W+70)c.x=-70;
        g.beginPath();g.ellipse(c.x,c.y,38*c.s,14*c.s,0,0,7);g.ellipse(c.x-16*c.s,c.y-8*c.s,18*c.s,13*c.s,0,0,7);g.ellipse(c.x+14*c.s,c.y-10*c.s,22*c.s,16*c.s,0,0,7);g.fill()});
      g.fillStyle='#a8dd8c';g.beginPath();g.moveTo(-20,236);g.quadraticCurveTo(80,170,190,226);g.quadraticCurveTo(290,180,380,230);g.lineTo(380,290);g.lineTo(-20,290);g.fill();
      /* 울타리 */
      for(x=8;x<W;x+=30){g.fillStyle='#fff8ea';rr(g,x,214,14,44,5);g.fill();g.fillStyle='rgba(180,140,90,.25)';g.fillRect(x+10,220,4,38)}
      g.fillStyle='#f3e6cf';g.fillRect(-20,230,W+40,6);g.fillRect(-20,246,W+40,5);
      var gr=g.createLinearGradient(0,250,0,H);gr.addColorStop(0,'#8ed66c');gr.addColorStop(1,'#4fa647');
      g.fillStyle=gr;g.fillRect(-20,254,W+40,H);
      g.fillStyle='rgba(255,255,255,.07)';for(i=0;i<4;i++)g.fillRect(-20,270+i*100,W+40,50);
      /* 흔들리는 풀 + 꽃 */
      g.lineCap='round';
      for(i=0;i<16;i++){x=(i*83+17)%W;var y=262+((i*131)%350),sw=Math.sin(amb*2+i)*4;
        g.strokeStyle='#3f9440';g.lineWidth=2.5;g.beginPath();
        g.moveTo(x-4,y);g.quadraticCurveTo(x-5,y-8,x-7+sw,y-13);g.moveTo(x,y);g.quadraticCurveTo(x,y-10,x+sw,y-17);g.moveTo(x+4,y);g.quadraticCurveTo(x+5,y-8,x+8+sw,y-12);g.stroke();
        if(i%4===0){g.fillStyle=i%8?'#fff':'#ffd1e3';for(var p=0;p<5;p++){g.beginPath();g.arc(x+14+Math.cos(p*1.257)*4,y-4+Math.sin(p*1.257)*4,2.6,0,7);g.fill()}
          g.fillStyle='#ffc93c';g.beginPath();g.arc(x+14,y-4,2.2,0,7);g.fill()}}
      /* 구멍과 캐릭터 */
      for(i=0;i<9;i++){var hx=HX[i%3],hy=HY[(i/3)|0],h=holes[i];
        g.fillStyle='#8a5a34';g.beginPath();g.ellipse(hx,hy+2,50,19,0,0,7);g.fill();
        var hg=g.createLinearGradient(0,hy-14,0,hy+14);hg.addColorStop(0,'#1e120b');hg.addColorStop(1,'#4a2d1a');
        g.fillStyle=hg;g.beginPath();g.ellipse(hx,hy,40,13,0,0,7);g.fill();
        if(h.kind){g.save();g.beginPath();g.rect(hx-50,hy-130,100,130);g.ellipse(hx,hy,40,13,0,0,3.15);g.clip();
          critter(g,hx,hy+16-ease(Math.max(0,h.p))*70,h,i);g.restore()}
        g.fillStyle='#a8713f';g.beginPath();g.ellipse(hx,hy+2,50,19,0,.12,3.02);g.ellipse(hx,hy,40,13,0,3.14,0,true);g.fill();
        g.fillStyle='rgba(255,220,170,.25)';g.beginPath();g.ellipse(hx-14,hy+15,16,3,0,0,7);g.fill();
        if(kbd&&i===cur){var pu=1+Math.sin(amb*8)*.05;g.strokeStyle='#fff';g.lineWidth=4;g.setLineDash([12,8]);g.lineDashOffset=-amb*30;
          g.beginPath();g.ellipse(hx,hy-18,56*pu,50*pu,0,0,7);g.stroke();g.setLineDash([]);
          g.fillStyle='#fff';g.beginPath();g.moveTo(hx-8,hy+42);g.lineTo(hx+8,hy+42);g.lineTo(hx,hy+32);g.fill()}}
      /* 뿅망치 */
      if(mal){var mx=HX[mal.i%3],my=HY[(mal.i/3)|0],q=Math.min(1,mal.t/.09),ang=-1.1+q*1.1;
        g.save();g.translate(mx+46,my-22);g.rotate(ang);g.globalAlpha=1-Math.max(0,(mal.t-.18)/.1);
        g.fillStyle='#c98b4f';rr(g,-5,-58,10,60,4);g.fill();
        var mg=g.createLinearGradient(-50,-80,-50,-44);mg.addColorStop(0,'#ff8a8a');mg.addColorStop(1,'#e2485c');g.fillStyle=mg;rr(g,-50,-82,64,36,12);g.fill();
        g.fillStyle='#ffe07a';g.fillRect(-36,-82,7,36);g.fillRect(-6,-82,7,36);
        g.fillStyle='rgba(255,255,255,.45)';rr(g,-44,-78,50,7,3);g.fill();g.restore();g.globalAlpha=1}
      /* 나비 */
      flies.forEach(function(f){f.x+=f.v*(dt||0);if(f.x>W+20)f.x=-20;if(f.x<-20)f.x=W+20;
        var fy=f.y+Math.sin(amb*2.2+f.ph)*16,wg=Math.abs(Math.sin(amb*13+f.ph));
        g.fillStyle=f.c;g.beginPath();g.ellipse(f.x-4*wg,fy-2,6*wg+1,7,-.4,0,7);g.ellipse(f.x+4*wg,fy-2,6*wg+1,7,.4,0,7);g.fill();
        g.fillStyle='#4a3a30';g.fillRect(f.x-1,fy-5,2,9)});
      /* 타이머 바 */
      var fr=Math.max(0,time/MAXT),low=time<8;
      g.fillStyle='rgba(30,50,70,.35)';rr(g,22,52,W-44,18,9);g.fill();
      if(fr>0){var tg=g.createLinearGradient(0,54,0,68);tg.addColorStop(0,low?'#ff9a8a':'#b4f58c');tg.addColorStop(1,low?'#e8455a':'#4fc24a');
        g.fillStyle=tg;rr(g,24,54,Math.max(14,(W-48)*fr),14,7);g.fill();
        g.fillStyle='rgba(255,255,255,.45)';rr(g,28,56,Math.max(6,(W-48)*fr-8),3,2);g.fill()}
      g.textAlign='center';g.font='800 13px'+F;g.fillStyle='rgba(0,0,0,.35)';
      var ts=Math.ceil(time)+(ko?'초':'s');g.fillText(ts,W/2+1,66);g.fillStyle='#fff';g.fillText(ts,W/2,65);
      if(combo>1){var m=mult(),cs=(ko?'콤보 ':'Combo ')+combo+(m>1?'  x'+m:'');
        g.font='800 '+(18+Math.min(6,m))+'px'+F;g.fillStyle='rgba(0,0,0,.3)';g.fillText(cs,W/2+1,98);g.fillStyle=m>1?'#ffef7a':'#fff';g.fillText(cs,W/2,96)}
      if(flash>0){g.fillStyle='rgba(255,80,100,'+flash*.5+')';g.fillRect(-20,-20,W+40,H+40)}
    }
  });
  function critter(g,x,y,h,idx){
    var hit=h.st==='hit'||h.ht>0,k=h.kind,sq=hit?Math.max(0,1-h.ht*3)*.2:0,wob=hit?Math.sin(h.ht*30)*3:Math.sin(amb*5+idx)*1.2,j;
    g.save();g.translate(x+wob,y);g.scale(1+sq,1-sq);
    if(k==='bunny'){
      g.fillStyle='#fff';g.strokeStyle='#e9dccf';g.lineWidth=2;
      for(j=-1;j<=1;j+=2){g.save();g.translate(j*13,6);g.rotate(j*(.14+(hit?.5:Math.sin(amb*3+idx)*.06)));
        g.fillStyle='#fffaf3';g.beginPath();g.ellipse(0,-22,9,26,0,0,7);g.fill();g.stroke();
        g.fillStyle='#ffb9cb';g.beginPath();g.ellipse(0,-20,4,17,0,0,7);g.fill();g.restore()}
      var bg=g.createRadialGradient(-8,14,4,0,30,44);bg.addColorStop(0,'#fff');bg.addColorStop(1,'#efe2d3');g.fillStyle=bg;
      rr(g,-30,0,60,110,29);g.fill();
      g.fillStyle='rgba(255,150,170,.55)';g.beginPath();g.ellipse(-18,36,7,4.5,0,0,7);g.ellipse(18,36,7,4.5,0,0,7);g.fill();
      g.fillStyle='#ff8fa6';g.beginPath();g.ellipse(0,32,4,3,0,0,7);g.fill();
      g.strokeStyle='#8a5a4a';g.lineWidth=2;g.beginPath();
      if(hit){g.arc(0,44,5,3.5,5.9);g.stroke();
        g.fillStyle='#7ccfff';g.beginPath();g.ellipse(-17,32+h.ht*14,3,4.5,0,0,7);g.fill();
        g.strokeStyle='#3b2a26';g.lineWidth=2.5;g.beginPath();g.moveTo(-17,22);g.lineTo(-8,25);g.moveTo(17,22);g.lineTo(8,25);g.stroke()}
      else{g.arc(-4,35,4,.2,2.6);g.arc(4,35,4,.5,2.9);g.stroke();eyes(g,idx,24,'#3b2a26')}
    }else{
      var gold=k==='gold';
      if(gold){g.shadowColor='#fff2a0';g.shadowBlur=18}
      var mg=g.createRadialGradient(-10,14,4,0,30,46);
      if(gold){mg.addColorStop(0,'#fff6b0');mg.addColorStop(.6,'#ffd23f');mg.addColorStop(1,'#e59a17')}
      else{mg.addColorStop(0,'#b98562');mg.addColorStop(1,'#7d5236')}
      g.fillStyle=mg;rr(g,-31,0,62,110,30);g.fill();g.shadowBlur=0;
      g.fillStyle=gold?'#fff8d2':'#e9c9a6';g.beginPath();g.ellipse(0,37,17,13,0,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.ellipse(-13,10,10,5,-.5,0,7);g.fill();
      g.fillStyle='#ff8fa6';g.beginPath();g.ellipse(0,30,7,5,0,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.arc(-2,28.5,1.6,0,7);g.fill();
      g.strokeStyle='rgba(60,35,20,.45)';g.lineWidth=1.2;g.beginPath();g.moveTo(-14,34);g.lineTo(-27,31);g.moveTo(-14,38);g.lineTo(-27,40);g.moveTo(14,34);g.lineTo(27,31);g.moveTo(14,38);g.lineTo(27,40);g.stroke();
      g.fillStyle=gold?'#ffe47a':'#f3b9a6';g.beginPath();g.ellipse(-22,60,8,6,0,0,7);g.ellipse(22,60,8,6,0,0,7);g.fill();
      if(hit){g.strokeStyle='#3b2a26';g.lineWidth=2.5;g.beginPath();
        for(j=-1;j<=1;j+=2){g.moveTo(j*12-4,14);g.lineTo(j*12+4,22);g.moveTo(j*12+4,14);g.lineTo(j*12-4,22)}g.stroke();
        g.fillStyle='#6b3028';g.beginPath();g.ellipse(0,43,4,5,0,0,7);g.fill();
        for(j=0;j<3;j++){var an=h.ht*9+j*2.09;star(g,Math.cos(an)*24,-8+Math.sin(an)*6,5,gold?'#fff':'#ffe14d')}}
      else{eyes(g,idx,18,'#2b1c16');g.fillStyle='#fff';g.fillRect(-4,40,3.6,5);g.fillRect(.4,40,3.6,5);
        g.strokeStyle='#5b3626';g.lineWidth=1.6;g.beginPath();g.arc(0,38,6,.3,2.84);g.stroke()}
      if(gold&&!hit)for(j=0;j<3;j++){var a2=amb*3+j*2.09;star(g,Math.cos(a2)*36,26+Math.sin(a2*1.3)*22,3+Math.sin(amb*8+j)*1.5,'#fff')}
    }
    g.restore();
  }
  function eyes(g,idx,y,c){
    if((amb+idx*.77)%2.9<.12){g.fillStyle=c;g.fillRect(-16,y,8,2);g.fillRect(8,y,8,2);return}
    g.fillStyle=c;g.beginPath();g.arc(-12,y,4.2,0,7);g.arc(12,y,4.2,0,7);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(-10.6,y-1.6,1.5,0,7);g.arc(13.4,y-1.6,1.5,0,7);g.fill()}
  function star(g,x,y,r,c){g.fillStyle=c;g.beginPath();for(var i=0;i<10;i++){var a=i*.628-1.57,q=i%2?r*.45:r;g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}g.fill()}
})();
