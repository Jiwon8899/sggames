/* 오이 피하는 고양이 — 떨어지는 오이를 피하고 생선을 먹는다 */
(function(){
  var cat,items,t,spawn,clouds,combo,dead;
  SG.run({
    id:'cucumber-cat',
    title:{ko:'오이 피하는 고양이',en:'Cucumber Cat'},
    how:{ko:'좌우로 움직여 오이를 피하고 생선을 먹어요',en:'Move left and right. Dodge cucumbers, eat fish.'},
    init:function(a){cat={x:a.W/2,y:a.H-74,r:26,face:1,vx:0,sq:0,blink:0};items=[];t=0;spawn=.6;combo=0;dead=false;
      clouds=[];for(var i=0;i<5;i++)clouds.push({x:Math.random()*a.W,y:40+Math.random()*260,s:.6+Math.random()*.8,v:6+Math.random()*12})},
    update:function(dt,inp,a){
      t+=dt;var sp=340,ox=cat.x;a.tempo(1+t*.006);
      if(inp.x!=null){var d=inp.x-cat.x;if(Math.abs(d)>3)cat.x+=Math.sign(d)*Math.min(Math.abs(d),sp*1.6*dt)}
      if(inp.left)cat.x-=sp*dt;if(inp.right)cat.x+=sp*dt;
      cat.x=Math.max(cat.r,Math.min(a.W-cat.r,cat.x));cat.vx=(cat.x-ox)/dt;
      if(Math.abs(cat.vx)>20)cat.face=cat.vx>0?1:-1;cat.sq=Math.max(0,cat.sq-dt*4);
      clouds.forEach(function(c){c.x+=c.v*dt;if(c.x>a.W+80)c.x=-80});
      spawn-=dt;
      if(spawn<=0){spawn=Math.max(.2,.75-t*.012);
        items.push({x:20+Math.random()*(a.W-40),y:-30,v:170+t*5+Math.random()*90,fish:Math.random()<.22,rot:Math.random()*6,near:false})}
      for(var i=items.length-1;i>=0;i--){var o=items[i];o.y+=o.v*dt;o.rot+=dt*(o.fish?1:2.4);
        var dist=Math.hypot(o.x-cat.x,o.y-cat.y);
        if(dist<cat.r+(o.fish?16:12)){
          if(o.fish){combo++;var pts=5*Math.min(combo,5);a.add(pts);a.sfx('coin');a.burst(o.x,o.y,'#8fd3ff',12);
            a.pop(o.x,o.y-20,'+'+pts,'#fff36b');cat.sq=1;items.splice(i,1)}
          else{dead=true;a.burst(cat.x,cat.y,'#7cc96f',26);a.burst(cat.x,cat.y,'#f2a65a',14);a.over();return}}
        else if(!o.fish&&!o.near&&dist<cat.r+34&&o.y>cat.y-10){o.near=true;a.add(2);a.pop(cat.x,cat.y-44,a.lang==='ko'?'아슬아슬!':'Close!','#ffd0d0')}
        else if(o.y>a.H-40){if(!o.fish){a.add(1);a.burst(o.x,a.H-42,'#5bb04f',5)}else combo=0;items.splice(i,1)}}
    },
    draw:function(g,a){
      var W=a.W,H=a.H,k=Math.min(1,t/70),gr=g.createLinearGradient(0,0,0,H);
      gr.addColorStop(0,k<.5?'#8fd6ff':'#ff9f6b');gr.addColorStop(.6,k<.5?'#d8f3ff':'#ffd9a8');gr.addColorStop(1,'#fff0c9');
      g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
      g.fillStyle='rgba(255,236,150,.9)';g.beginPath();g.arc(W-60,90+k*160,34,0,7);g.fill();
      g.fillStyle='rgba(255,236,150,.25)';g.beginPath();g.arc(W-60,90+k*160,52,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.85)';clouds.forEach(function(c){g.beginPath();g.ellipse(c.x,c.y,38*c.s,14*c.s,0,0,7);
        g.ellipse(c.x-16*c.s,c.y-8*c.s,18*c.s,13*c.s,0,0,7);g.ellipse(c.x+14*c.s,c.y-10*c.s,22*c.s,16*c.s,0,0,7);g.fill()});
      g.fillStyle='#9ad17a';g.beginPath();g.moveTo(-20,H-60);for(var x=-20;x<=W+20;x+=40)g.quadraticCurveTo(x+20,H-96-((x*7)%23),x+40,H-60);g.lineTo(W+20,H);g.lineTo(-20,H);g.fill();
      g.fillStyle='#6fb85a';g.fillRect(-20,H-46,W+40,70);g.fillStyle='#5aa34a';g.fillRect(-20,H-46,W+40,6);
      items.forEach(function(o){
        g.fillStyle='rgba(0,0,0,'+(.05+.12*Math.max(0,o.y/H))+')';g.beginPath();g.ellipse(o.x,H-44,12,4,0,0,7);g.fill();
        g.save();g.translate(o.x,o.y);g.rotate(o.rot);
        if(o.fish){g.shadowColor='#bfe8ff';g.shadowBlur=14;g.fillStyle='#4f9fe0';g.beginPath();g.moveTo(-13,0);g.lineTo(-26,-10);g.lineTo(-26,10);g.fill();
          var fg=g.createLinearGradient(0,-10,0,10);fg.addColorStop(0,'#7cc4ff');fg.addColorStop(1,'#3d8fd6');g.fillStyle=fg;
          g.beginPath();g.ellipse(0,0,17,10,0,0,7);g.fill();g.shadowBlur=0;
          g.fillStyle='#fff';g.beginPath();g.arc(8,-3,3.2,0,7);g.fill();g.fillStyle='#123';g.beginPath();g.arc(9,-3,1.5,0,7);g.fill()}
        else{var cg=g.createLinearGradient(-9,0,9,0);cg.addColorStop(0,'#2f7d36');cg.addColorStop(.5,'#59b757');cg.addColorStop(1,'#2f7d36');
          g.fillStyle=cg;g.beginPath();g.ellipse(0,0,9,27,0,0,7);g.fill();
          g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(-3,-6,2,14,0,0,7);g.fill();
          g.fillStyle='#bfe8a8';for(var j=-2;j<=2;j++){g.beginPath();g.arc(j%2?3:-2,j*9,1.6,0,7);g.fill()}}
        g.restore()});
      if(dead)return;
      var run=Math.min(1,Math.abs(cat.vx)/300),bob=Math.sin(t*14)*3*run,sx=1+cat.sq*.18,sy=1-cat.sq*.14;
      g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(cat.x,H-44,26,6,0,0,7);g.fill();
      g.save();g.translate(cat.x,cat.y+bob+10);g.scale(cat.face*sx,sy);g.rotate(run*.12);g.translate(0,-10);
      g.strokeStyle='#e8924a';g.lineWidth=8;g.lineCap='round';g.beginPath();g.moveTo(-20,14);g.quadraticCurveTo(-46,8+Math.sin(t*6)*6,-38,-16);g.stroke();
      var bg=g.createRadialGradient(-6,-8,4,0,0,28);bg.addColorStop(0,'#ffc27d');bg.addColorStop(1,'#f09a4a');g.fillStyle=bg;
      g.beginPath();g.moveTo(-23,-10);g.lineTo(-17,-37);g.lineTo(-3,-22);g.fill();g.beginPath();g.moveTo(23,-10);g.lineTo(17,-37);g.lineTo(3,-22);g.fill();
      g.beginPath();g.arc(0,0,26,0,7);g.fill();
      g.fillStyle='#ffb3a8';g.beginPath();g.moveTo(-18,-16);g.lineTo(-15,-29);g.lineTo(-8,-21);g.fill();g.beginPath();g.moveTo(18,-16);g.lineTo(15,-29);g.lineTo(8,-21);g.fill();
      g.fillStyle='#fff3e2';g.beginPath();g.ellipse(2,9,13,10,0,0,7);g.fill();
      var bl=(t%3.2)<.12;g.fillStyle='#2b2320';
      if(bl){g.fillRect(-11,-4,7,2);g.fillRect(7,-4,7,2)}else{g.beginPath();g.arc(-8,-3,4,0,7);g.arc(10,-3,4,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(-7,-4.5,1.4,0,7);g.arc(11,-4.5,1.4,0,7);g.fill()}
      g.fillStyle='#e8735a';g.beginPath();g.moveTo(-1.5,3);g.lineTo(4.5,3);g.lineTo(1.5,6.5);g.fill();
      g.strokeStyle='rgba(60,40,30,.5)';g.lineWidth=1;g.beginPath();g.moveTo(8,6);g.lineTo(22,4);g.moveTo(8,9);g.lineTo(22,11);g.moveTo(-6,6);g.lineTo(-20,4);g.moveTo(-6,9);g.lineTo(-20,11);g.stroke();
      g.restore();
    }
  });
})();
