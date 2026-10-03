/* 오이 피하는 고양이 — 떨어지는 오이를 피하고 생선을 먹는다 */
(function(){
  var cat,items,t,spawn;
  SG.run({
    id:'cucumber-cat',
    title:{ko:'오이 피하는 고양이',en:'Cucumber Cat'},
    how:{ko:'좌우로 움직여 오이를 피하고 생선을 먹어요',en:'Move left and right. Dodge cucumbers, eat fish.'},
    init:function(a){cat={x:a.W/2,y:a.H-70,r:26,face:1};items=[];t=0;spawn=0},
    update:function(dt,inp,a){
      t+=dt;var sp=330;
      if(inp.x!=null){var d=inp.x-cat.x;if(Math.abs(d)>3){cat.face=d>0?1:-1;cat.x+=Math.sign(d)*Math.min(Math.abs(d),sp*1.6*dt)}}
      if(inp.left){cat.x-=sp*dt;cat.face=-1}
      if(inp.right){cat.x+=sp*dt;cat.face=1}
      cat.x=Math.max(cat.r,Math.min(a.W-cat.r,cat.x));
      spawn-=dt;
      if(spawn<=0){spawn=Math.max(.22,.75-t*.012);
        items.push({x:20+Math.random()*(a.W-40),y:-30,v:170+t*5+Math.random()*90,fish:Math.random()<.22,rot:Math.random()*6})}
      for(var i=items.length-1;i>=0;i--){var o=items[i];o.y+=o.v*dt;o.rot+=dt*2;
        var hit=Math.hypot(o.x-cat.x,o.y-cat.y)<cat.r+(o.fish?16:13);
        if(hit){if(o.fish){a.add(5);a.beep(880,.08);items.splice(i,1)}else{a.over();return}}
        else if(o.y>a.H+40){items.splice(i,1);if(!o.fish)a.add(1)}}
    },
    draw:function(g,a){
      var W=a.W,H=a.H,gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#ffd9a8');gr.addColorStop(1,'#ffb37a');
      g.fillStyle=gr;g.fillRect(0,0,W,H);g.fillStyle='#c9825a';g.fillRect(0,H-40,W,40);
      items.forEach(function(o){g.save();g.translate(o.x,o.y);g.rotate(o.rot);
        if(o.fish){g.fillStyle='#5aa9e6';g.beginPath();g.ellipse(0,0,16,9,0,0,7);g.fill();
          g.beginPath();g.moveTo(-14,0);g.lineTo(-25,-9);g.lineTo(-25,9);g.fill();
          g.fillStyle='#fff';g.beginPath();g.arc(8,-2,2.5,0,7);g.fill()}
        else{g.fillStyle='#3f9b45';g.beginPath();g.ellipse(0,0,9,26,0,0,7);g.fill();
          g.fillStyle='#7cc96f';for(var j=-2;j<=2;j++){g.beginPath();g.arc(j%2?3:-3,j*9,1.8,0,7);g.fill()}}
        g.restore()});
      g.save();g.translate(cat.x,cat.y);g.scale(cat.face,1);
      g.strokeStyle='#f2a65a';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(-20,14);g.quadraticCurveTo(-42,6,-36,-14);g.stroke();
      g.fillStyle='#f2a65a';g.beginPath();g.arc(0,0,26,0,7);g.fill();
      g.beginPath();g.moveTo(-22,-12);g.lineTo(-16,-36);g.lineTo(-4,-22);g.fill();
      g.beginPath();g.moveTo(22,-12);g.lineTo(16,-36);g.lineTo(4,-22);g.fill();
      g.fillStyle='#2b2320';g.beginPath();g.arc(-8,-3,3.5,0,7);g.arc(10,-3,3.5,0,7);g.fill();
      g.fillStyle='#e8735a';g.beginPath();g.arc(1,5,2.5,0,7);g.fill();g.restore();
    }
  });
})();
