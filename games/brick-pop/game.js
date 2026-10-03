/* 젤리 팡팡 — 내려오는 젤리 벽돌 벽을 공으로 터뜨리는 벽돌깨기 레이스 */
(function(){
  var W=360,H=640,COLS=6,CW=58,CH=28,BW=52,BH=24,MX=9,LINE=560,PY=586,PH=14,R=7;
  var PAL=[['#ffa6c9','#ff5c93'],['#ffd27a','#ff9a3d'],['#a5f0b4','#3fc47a'],['#a4d8ff','#4f9fe8'],['#d9bcff','#9a6cf0'],['#fff6a0','#f2c230']];
  var DCOL={w:'#5fd0ff',m:'#7be08a',f:'#ff7a3d'};
  var t=0,bgT=0,bricks=[],ghosts=[],balls=[],drops=[],pad={x:180,w:72,vx:0,sq:0},lives=3,combo=0,spawnY=0,rowN=0,wide=0,fire=0,dead=false,wait=1,hurt=0,bub=[],spr=[];
  function L(a,ko,en){return a.lang==='ko'?ko:en}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function addRow(y,easy){var n=0,row=[];rowN++;
    for(var c=0;c<COLS;c++)if(Math.random()<(easy?.9:.8)){n++;row.push(c)}
    if(n<3)row=[0,2,3,5];
    var hard=easy?0:Math.min(.22,Math.max(0,(t-18)*.008));
    row.forEach(function(c){bricks.push({x:MX+c*CW,y:y,hp:Math.random()<hard?2:1,col:rowN%PAL.length,sq:0,ph:Math.random()*6.28,bl:1+Math.random()*4})})}
  function newBall(){balls.push({x:pad.x,y:PY-R-1,vx:0,vy:0,stuck:true,tr:[]});wait=1}
  function speed(){return 285+Math.min(t,80)*2.1}
  function launch(){balls.forEach(function(b){if(b.stuck){b.stuck=false;var an=(Math.random()<.5?-1:1)*(.25+Math.random()*.45),s=speed();b.vx=Math.sin(an)*s;b.vy=-Math.cos(an)*s}})}
  function hitBrick(i,a){var b=bricks[i],cx=b.x+BW/2,cy=b.y+BH/2;b.hp--;if(fire>0)b.hp=0;
    if(b.hp>0){b.sq=1;a.beep(300,.05);a.burst(cx,cy,'#ffffff',5);return}
    combo++;var mult=Math.min(6,1+Math.floor(combo/4)),pts=10*mult;a.add(pts);a.sfx('tap');a.beep(520+Math.min(combo,16)*40,.07,'triangle');
    a.burst(cx,cy,PAL[b.col][0],9);a.pop(cx,cy,'+'+pts,'#ffffff');
    if(combo%4===0&&mult>1){a.pop(W/2,300,L(a,'콤보 x','Combo x')+mult+'!','#fff36b');a.shake(4);a.sfx('coin')}
    ghosts.push({x:cx,y:cy,col:b.col,t:0});
    if(drops.length<3&&Math.random()<.16){var r=Math.random();drops.push({x:cx,y:cy,k:r<.36?'w':r<.72?'m':'f',rot:0})}
    bricks.splice(i,1)}
  function pickup(d,a){a.sfx('coin');a.burst(d.x,PY,DCOL[d.k],14);
    if(d.k==='w'){wide=10;a.pop(pad.x,PY-22,L(a,'길쭉!','Wide!'),DCOL.w)}
    else if(d.k==='f'){fire=6;a.pop(pad.x,PY-22,L(a,'불꽃 공!','Fireball!'),'#ffb347')}
    else{launch();var src=balls[0];
      for(var k=0;balls.length<3&&src;k++){var an=(k?-1:1)*.45,c=Math.cos(an),s=Math.sin(an);
        balls.push({x:src.x,y:src.y,vx:src.vx*c-src.vy*s,vy:src.vx*s+src.vy*c,stuck:false,tr:[]})}
      a.pop(pad.x,PY-22,L(a,'공 세 개!','Multi-ball!'),DCOL.m)}}
  function stepBall(b,dt,a){var sp=speed(),m=Math.hypot(b.vx,b.vy)||1;b.vx*=sp/m;b.vy*=sp/m;
    if(Math.abs(b.vy)<sp*.28){b.vy=(b.vy<0?-1:1)*sp*.28;b.vx=(b.vx<0?-1:1)*sp*.96}
    var n=Math.max(1,Math.ceil(sp*dt/4)),h=dt/n;
    for(var s=0;s<n;s++){b.x+=b.vx*h;b.y+=b.vy*h;
      if(b.x<R){b.x=R;b.vx=Math.abs(b.vx)}else if(b.x>W-R){b.x=W-R;b.vx=-Math.abs(b.vx)}
      if(b.y<R){b.y=R;b.vy=Math.abs(b.vy)}
      if(b.vy>0&&b.y+R>=PY&&b.y<PY+PH&&Math.abs(b.x-pad.x)<pad.w/2+R){
        var rel=Math.max(-1,Math.min(1,(b.x-pad.x)/(pad.w/2)));if(Math.abs(rel)<.1)rel+=(Math.random()<.5?-1:1)*.14;
        rel=Math.max(-1,Math.min(1,rel+pad.vx*.0006));
        var an=rel*1.05;b.vx=Math.sin(an)*sp;b.vy=-Math.cos(an)*sp;b.y=PY-R;combo=0;pad.sq=1;a.beep(240,.05,'sine')}
      for(var i=bricks.length-1;i>=0;i--){var k=bricks[i],dx=b.x-(k.x+BW/2),dy=b.y-(k.y+BH/2),ox=BW/2+R-Math.abs(dx),oy=BH/2+R-Math.abs(dy);
        if(ox<=0||oy<=0)continue;
        var nx=Math.max(k.x,Math.min(k.x+BW,b.x)),ny=Math.max(k.y,Math.min(k.y+BH,b.y));
        if(Math.hypot(b.x-nx,b.y-ny)>R)continue;
        if(fire<=0){if(ox<oy){var sx=dx<0?-1:1;b.vx=Math.abs(b.vx)*sx;b.x+=ox*sx}else{var sy=dy<0?-1:1;b.vy=Math.abs(b.vy)*sy;b.y+=oy*sy}}
        hitBrick(i,a);break}
      if(b.y-R>H)return false}
    return true}
  SG.run({
    id:'brick-pop',
    title:{ko:'젤리 팡팡',en:'Jelly Pop Rush'},
    how:{ko:'젤리 벽이 내려와요! 받침대를 좌우로 움직여 공으로 터뜨리세요',en:'The jelly wall is sinking! Slide the paddle and pop it with the ball.'},
    init:function(a){t=0;bricks=[];ghosts=[];balls=[];drops=[];pad={x:W/2,w:72,vx:0,sq:0};lives=3;combo=0;rowN=0;wide=0;fire=0;dead=false;hurt=0;
      for(var y=140;y>=-CH;y-=CH){addRow(y,true);spawnY=y}
      newBall();
      if(!bub.length){for(var i=0;i<9;i++)bub.push({x:Math.random()*W,y:Math.random()*(H+120),r:14+Math.random()*30,v:8+Math.random()*14,ph:Math.random()*6});
        for(var j=0;j<26;j++)spr.push({x:Math.random()*W,y:Math.random()*H,v:18+Math.random()*26,rot:Math.random()*3,c:PAL[j%6][0]})}},
    update:function(dt,inp,a){
      t+=dt;a.tempo(1+t*.009);
      var dy=(5+t*.22)*dt,low=0;spawnY+=dy;
      for(var i=0;i<bricks.length;i++){var k=bricks[i];k.y+=dy;k.sq=Math.max(0,k.sq-dt*5);k.bl-=dt;if(k.bl<-.12)k.bl=1.5+Math.random()*4;if(k.y+BH>low)low=k.y+BH}
      while(spawnY>-CH){spawnY-=CH;addRow(spawnY,false)}
      if(low>=LINE){dead=true;a.burst(pad.x,PY,'#ff5c93',24);a.burst(pad.x,PY,'#fff6a0',14);a.pop(W/2,LINE-30,L(a,'젤리가 내려왔다!','The jelly landed!'),'#ffd0d0');a.over();return}
      var ox=pad.x,tw=wide>0?116:72;pad.w+=(tw-pad.w)*Math.min(1,dt*10);pad.sq=Math.max(0,pad.sq-dt*6);
      if(inp.x!=null){var d=inp.x-pad.x;pad.x+=Math.sign(d)*Math.min(Math.abs(d),900*dt)}
      if(inp.left)pad.x-=430*dt;if(inp.right)pad.x+=430*dt;
      pad.x=Math.max(pad.w/2,Math.min(W-pad.w/2,pad.x));pad.vx=(pad.x-ox)/dt;
      wide=Math.max(0,wide-dt);fire=Math.max(0,fire-dt);hurt=Math.max(0,hurt-dt);
      var stuck=false;balls.forEach(function(b){if(b.stuck){stuck=true;b.x=pad.x;b.y=PY-R-1}});
      if(stuck){wait-=dt;if(wait<=0||inp.tap){launch();a.sfx('jump')}}
      for(var j=balls.length-1;j>=0;j--){var b=balls[j];if(b.stuck)continue;
        b.tr.push(b.x,b.y);if(b.tr.length>18)b.tr.splice(0,2);
        if(!stepBall(b,dt,a))balls.splice(j,1)}
      for(var q=drops.length-1;q>=0;q--){var o=drops[q];o.y+=135*dt;o.rot+=dt*3;
        if(o.y+11>=PY&&o.y-11<=PY+PH&&Math.abs(o.x-pad.x)<pad.w/2+12){pickup(o,a);drops.splice(q,1)}
        else if(o.y>H+20)drops.splice(q,1)}
      for(var z=ghosts.length-1;z>=0;z--){ghosts[z].t+=dt;if(ghosts[z].t>.22)ghosts.splice(z,1)}
      if(!balls.length){lives--;combo=0;fire=0;hurt=.5;a.sfx('hit');a.shake(9);a.burst(pad.x,PY,'#ff6b8e',18);
        a.pop(pad.x,PY-30,lives>0?L(a,'앗! 하트 -1','Oops! -1 heart'):L(a,'하트가 없어요','Out of hearts'),'#ffd0d0');
        if(lives<=0){dead=true;a.over();return}
        newBall()}
    },
    draw:function(g,a,dt){
      bgT+=dt||0;var i,gr=g.createLinearGradient(0,0,0,H);
      gr.addColorStop(0,'#5b3a9e');gr.addColorStop(.55,'#b24e9c');gr.addColorStop(1,'#ff9d8a');
      g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
      for(i=0;i<bub.length;i++){var u=bub[i],uy=H+60-((u.y+bgT*u.v)%(H+120)),ux=u.x+Math.sin(bgT*.6+u.ph)*12;
        g.fillStyle='rgba(255,255,255,.08)';g.beginPath();g.arc(ux,uy,u.r,0,7);g.fill();
        g.fillStyle='rgba(255,255,255,.14)';g.beginPath();g.arc(ux-u.r*.35,uy-u.r*.35,u.r*.22,0,7);g.fill()}
      g.globalAlpha=.5;for(i=0;i<spr.length;i++){var s=spr[i],sy=(s.y+bgT*s.v)%(H+20)-10;
        g.save();g.translate(s.x,sy);g.rotate(s.rot+bgT*.8);g.fillStyle=s.c;rr(g,-5,-1.5,10,3,1.5);g.fill();g.restore()}
      g.globalAlpha=1;
      for(var w=0;w<2;w++){g.fillStyle=w?'rgba(255,240,245,.22)':'rgba(255,214,232,.16)';g.beginPath();g.moveTo(-20,H+20);
        for(var x=-20;x<=W+20;x+=10)g.lineTo(x,H-34+w*14+Math.sin(x*.035+bgT*(w?1.3:-.9)+w*2)*7);g.lineTo(W+20,H+20);g.fill()}
      var low=0;for(i=0;i<bricks.length;i++)if(bricks[i].y+BH>low)low=bricks[i].y+BH;
      var dz=Math.max(0,Math.min(1,(low-(LINE-170))/170)),pl=.5+.5*Math.sin(bgT*(5+dz*9));
      if(dz>0){var dg=g.createLinearGradient(0,LINE-90,0,LINE);dg.addColorStop(0,'rgba(255,60,90,0)');dg.addColorStop(1,'rgba(255,60,90,'+(dz*(.18+.2*pl))+')');g.fillStyle=dg;g.fillRect(0,LINE-90,W,90)}
      g.strokeStyle='rgba(255,255,255,'+(.3+dz*.5*pl)+')';g.lineWidth=2;g.setLineDash([8,8]);g.lineDashOffset=-bgT*14;g.beginPath();g.moveTo(0,LINE);g.lineTo(W,LINE);g.stroke();g.setLineDash([]);
      var tb=balls[0]||{x:pad.x,y:PY};
      for(i=0;i<bricks.length;i++){var k=bricks[i];if(k.y<-BH)continue;var cx=k.x+BW/2,cy=k.y+BH/2,near=k.y+BH>LINE-110,c=PAL[k.col];
        g.save();g.translate(cx,cy);
        g.fillStyle='rgba(40,10,60,.25)';rr(g,-BW/2+2,-BH/2+4,BW,BH,8);g.fill();
        g.rotate(Math.sin(bgT*(near?9:2.6)+k.ph)*(near?.07:.035));
        g.scale(1+k.sq*.16+Math.sin(bgT*3+k.ph)*.02,1-k.sq*.28-Math.sin(bgT*3+k.ph)*.03);
        var bg=g.createLinearGradient(0,-BH/2,0,BH/2);bg.addColorStop(0,c[0]);bg.addColorStop(1,c[1]);g.fillStyle=bg;rr(g,-BW/2,-BH/2,BW,BH,8);g.fill();
        if(k.hp>1){g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=2.5;g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(BW/2-7,BH/2-6,1.8,0,7);g.arc(-BW/2+7,BH/2-6,1.8,0,7);g.fill()}
        if(near){g.fillStyle='rgba(255,50,80,'+(.25*pl)+')';rr(g,-BW/2,-BH/2,BW,BH,8);g.fill()}
        g.fillStyle='rgba(255,255,255,.5)';rr(g,-BW/2+5,-BH/2+2.5,BW-10,5,2.5);g.fill();
        var ex=Math.max(-1.6,Math.min(1.6,(tb.x-cx)*.02)),ey=Math.max(-1.2,Math.min(1.2,(tb.y-cy)*.02));
        if(k.bl<0||k.sq>.3){g.strokeStyle='#3a2340';g.lineWidth=1.8;g.lineCap='round';g.beginPath();g.moveTo(-12,1);g.lineTo(-6,1);g.moveTo(6,1);g.lineTo(12,1);g.stroke()}
        else{g.fillStyle='#fff';g.beginPath();g.arc(-9,1,near?4.6:4,0,7);g.arc(9,1,near?4.6:4,0,7);g.fill();
          g.fillStyle='#3a2340';g.beginPath();g.arc(-9+ex,1+ey,2,0,7);g.arc(9+ex,1+ey,2,0,7);g.fill()}
        g.strokeStyle='#3a2340';g.lineWidth=1.5;g.lineCap='round';g.beginPath();
        if(near){g.arc(0,5,3.2,0,3.14);g.closePath();g.fillStyle='#7a2848';g.fill()}else g.arc(0,4,2.6,.3,2.84);g.stroke();
        g.restore()}
      for(i=0;i<ghosts.length;i++){var q=ghosts[i],p=q.t/.22;g.save();g.translate(q.x,q.y);g.scale(1+p*.7,1-p*.7);g.globalAlpha=1-p;
        g.fillStyle=PAL[q.col][0];rr(g,-BW/2,-BH/2,BW,BH,8);g.fill();g.restore()}
      g.globalAlpha=1;
      for(i=0;i<drops.length;i++){var o=drops[i];g.save();g.translate(o.x,o.y);g.rotate(Math.sin(o.rot)*.3);
        g.shadowColor=DCOL[o.k];g.shadowBlur=12;g.fillStyle=DCOL[o.k];
        g.beginPath();g.moveTo(-10,0);g.lineTo(-18,-7);g.lineTo(-18,7);g.fill();g.beginPath();g.moveTo(10,0);g.lineTo(18,-7);g.lineTo(18,7);g.fill();
        g.beginPath();g.arc(0,0,11,0,7);g.fill();g.shadowBlur=0;
        g.fillStyle='rgba(255,255,255,.45)';g.beginPath();g.ellipse(-3,-5,5,2.5,-.5,0,7);g.fill();g.fillStyle='#fff';
        if(o.k==='w'){rr(g,-7,-2,14,4,2);g.fill()}
        else if(o.k==='m'){g.beginPath();g.arc(-4,2,2.6,0,7);g.arc(4,2,2.6,0,7);g.arc(0,-4,2.6,0,7);g.fill()}
        else{g.beginPath();g.moveTo(0,-7);g.quadraticCurveTo(7,0,3,6);g.quadraticCurveTo(0,8,-3,6);g.quadraticCurveTo(-7,0,0,-7);g.fill()}
        g.restore()}
      if(!dead){var pw=pad.w,ps=pad.sq;
        g.fillStyle='rgba(40,10,60,.28)';g.beginPath();g.ellipse(pad.x,PY+PH+5,pw/2,4,0,0,7);g.fill();
        g.save();g.translate(pad.x,PY+PH);g.scale(1+ps*.08,1-ps*.22);g.translate(0,-PH);
        var pg=g.createLinearGradient(0,0,0,PH);pg.addColorStop(0,wide>0?'#9be4ff':'#fff3fa');pg.addColorStop(1,wide>0?'#3fa9e6':'#ff8fc0');
        g.fillStyle=pg;rr(g,-pw/2,0,pw,PH,7);g.fill();
        g.fillStyle='rgba(255,255,255,.65)';rr(g,-pw/2+6,2,pw-12,3.5,1.7);g.fill();
        g.fillStyle='#3a2340';g.beginPath();g.arc(-7,8,1.8,0,7);g.arc(7,8,1.8,0,7);g.fill();
        g.restore()}
      for(i=0;i<balls.length;i++){var b=balls[i],f=fire>0;
        for(var j=0;j<b.tr.length;j+=2){var al=(j+2)/b.tr.length;g.fillStyle=f?'rgba(255,150,50,'+al*.45+')':'rgba(255,255,255,'+al*.3+')';
          g.beginPath();g.arc(b.tr[j],b.tr[j+1],R*(.35+al*.6),0,7);g.fill()}
        g.fillStyle='rgba(40,10,60,.22)';g.beginPath();g.arc(b.x+2,b.y+4,R,0,7);g.fill();
        g.save();g.shadowColor=f?'#ff8a2a':'#fff';g.shadowBlur=f?18:8;
        var rg=g.createRadialGradient(b.x-2,b.y-3,1,b.x,b.y,R);rg.addColorStop(0,'#fff');rg.addColorStop(1,f?'#ff6a1f':'#ffd1e6');
        g.fillStyle=rg;g.beginPath();g.arc(b.x,b.y,R,0,7);g.fill();g.restore()}
      if(hurt>0){g.fillStyle='rgba(255,60,90,'+hurt*.5+')';g.fillRect(-20,-20,W+40,H+40)}
      for(i=0;i<3;i++){var hx=20+i*24,hy=621,on=i<lives;g.save();g.translate(hx,hy);if(on){var hb=1+Math.sin(bgT*4+i)*.06;g.scale(hb,hb)}
        g.fillStyle=on?'#ff4f7b':'rgba(60,20,70,.4)';g.beginPath();g.moveTo(0,7);g.bezierCurveTo(-12,-2,-7,-10,0,-4);g.bezierCurveTo(7,-10,12,-2,0,7);g.fill();
        if(on){g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.arc(-3.5,-3.5,1.6,0,7);g.fill()}g.restore()}
      var mult=Math.min(6,1+Math.floor(combo/4));g.textAlign='right';g.font='800 17px Jua,system-ui,sans-serif';
      var txt=L(a,'콤보 ','Combo ')+combo+(mult>1?'  x'+mult:'');
      g.fillStyle='rgba(40,10,60,.4)';g.fillText(txt,W-51,628);g.fillStyle=mult>1?'#fff36b':'#fff';g.fillText(txt,W-52,626);
      var bx=96;[[wide,10,DCOL.w],[fire,6,DCOL.f]].forEach(function(e){if(e[0]>0){g.fillStyle='rgba(40,10,60,.35)';rr(g,bx,617,46,7,3.5);g.fill();
        g.fillStyle=e[2];rr(g,bx,617,Math.max(7,46*e[0]/e[1]),7,3.5);g.fill();bx+=52}});
      g.textAlign='center';
    }
  });
})();
