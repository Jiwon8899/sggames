/* 번개 암산 OX — 칠판의 식이 맞으면 O, 틀리면 X. 부엉이 선생님의 스피드 수업 */
(function(){
  /*GEN*/
  function ri(r,lo,hi){return lo+Math.floor(r()*(hi-lo+1))}
  function makeQ(tier,solved,r){
    var a,b,c,val,expr,f;
    if(tier===0){a=ri(r,2,9+Math.min(solved,10));b=ri(r,2,9);val=a+b;expr=a+' + '+b}
    else if(tier===1){a=ri(r,6,19);b=ri(r,1,a-1);val=a-b;expr=a+' − '+b}
    else if(tier===2){a=ri(r,2,9);b=ri(r,2,9);val=a*b;expr=a+' × '+b}
    else{f=ri(r,0,3);
      if(f===0){a=ri(r,2,9);b=ri(r,2,6);c=ri(r,1,9);val=a*b+c;expr=a+' × '+b+' + '+c}
      else if(f===1){a=ri(r,2,9);b=ri(r,2,6);c=ri(r,1,Math.min(9,a*b-1));val=a*b-c;expr=a+' × '+b+' − '+c}
      else if(f===2){a=ri(r,5,19);b=ri(r,2,9);c=ri(r,1,Math.min(9,a+b-1));val=a+b-c;expr=a+' + '+b+' − '+c}
      else{a=ri(r,3,15);b=ri(r,2,9);c=ri(r,2,9);val=a+b+c;expr=a+' + '+b+' + '+c}}
    var shown=val;
    if(r()<.5){var cand=[val+1,val-1,val+2,val-2,val+10,val-10];
      if(val>=10&&val<100&&val%10!==0)cand.push((val%10)*10+Math.floor(val/10));
      cand=cand.filter(function(x){return x>=0&&x!==val});
      shown=cand[Math.floor(r()*cand.length)]}
    return{expr:expr,val:val,shown:shown,truth:shown===val,text:expr+' = '+shown}
  }
  /*END*/
  if(typeof module!=='undefined'&&typeof SG==='undefined'){module.exports=makeQ;return}

  var F='Jua,system-ui,sans-serif',BY=500;
  var WALL=[['#fff0d2','#ffd3a0'],['#e2f4ff','#b4daf4'],['#ecf8d8','#c2e4a2'],['#efe3ff','#cbb4f0']];
  var CLS={ko:['1교시 · 덧셈','2교시 · 뺄셈','3교시 · 곱셈','4교시 · 혼합 계산'],
           en:['Class 1 · Addition','Class 2 · Subtraction','Class 3 · Times','Class 4 · Mixed']};
  var q,phase,fbT,fbOk,elapsed,limit,hearts,streak,solved,qn,tier,gold,fromBtn,banner,mood,moodT,heartPulse;
  var vt=0,press=[0,0],motes=[],clouds=[],i;
  for(i=0;i<14;i++)motes.push({u:Math.random(),v:Math.random(),s:.03+Math.random()*.05,p:Math.random()*6,r:1+Math.random()*1.6});
  for(i=0;i<3;i++)clouds.push({x:i*45,y:66+i*14,s:.5+Math.random()*.3,v:5+i*3});
  function tierOf(n){return n<6?0:n<12?1:n<20?2:3}
  function next(){qn++;tier=tierOf(solved);gold=qn%10===0;q=makeQ(tier,solved,Math.random);
    elapsed=0;limit=Math.max(1.5,3.5-streak*.08)+(tier===3?.7:0);phase='ask'}
  function lose(a,timeout){hearts--;streak=0;fbOk=false;heartPulse=1;mood=timeout?'sleep':'shock';moodT=.7;
    a.sfx('hit');a.shake(8);a.burst(180,255,'#ff6b6b',14);
    a.pop(180,215,timeout?(a.lang==='ko'?'시간 초과!':'Time up!'):(a.lang==='ko'?'땡!':'Oops!'),'#ffb0b0');
    if(hearts<=0){phase='dead';a.over()}else{phase='fb';fbT=.7}}
  function answer(a,sayTrue){
    if(phase!=='ask')return;press[sayTrue?1:0]=1;
    if(sayTrue!==q.truth){lose(a,false);return}
    streak++;solved++;fbOk=true;mood='happy';moodT=.5;
    var mult=Math.min(5,1+Math.floor((streak-1)/3)),pts=10*mult*(gold?3:1);
    a.add(pts);a.sfx('coin');a.burst(180,255,gold?'#ffd84a':'#8ff0a0',gold?26:12);
    a.pop(180,215,'+'+pts+(mult>1?' (x'+mult+')':''),gold?'#ffe066':'#fff');
    if(gold){a.sfx('win');if(elapsed<=1&&hearts<3){hearts++;heartPulse=1;a.pop(180,120,a.lang==='ko'?'하트 회복!':'Heart back!','#ff8fa3');a.burst(180,84,'#ff8fa3',16)}}
    var nt=tierOf(solved);if(nt>tier){banner={t:0,s:CLS[a.lang][nt]};a.sfx('win');a.burst(180,180,'#fff36b',20)}
    a.tempo(1+solved*.02);phase='fb';fbT=.35}

  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function heart(g,x,y,s,on){g.save();g.translate(x,y);g.scale(s,s);g.beginPath();g.moveTo(0,6);g.bezierCurveTo(-14,-4,-7,-14,0,-6);g.bezierCurveTo(7,-14,14,-4,0,6);
    g.fillStyle=on?'#ff5d73':'rgba(90,60,40,.22)';g.fill();if(on){g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.arc(-4,-6,1.8,0,7);g.fill()}g.restore()}
  function owl(g,x,y,m,low){
    var bounce=m==='happy'?-Math.abs(Math.sin(vt*16))*9:Math.sin(vt*2.2)*1.5,jit=m==='shock'?Math.sin(vt*70)*2.5:0,
        sleepy=m==='sleep'||(m==='idle'&&low),tilt=sleepy?Math.sin(vt*1.5)*.08+.1:0;
    g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(x,y+44,34,7,0,0,7);g.fill();
    g.save();g.translate(x+jit,y+bounce);g.rotate(tilt);if(m==='shock')g.scale(1.08,1.04);
    var wa=m==='happy'?-1.1:m==='shock'?-.6:.15;
    g.fillStyle='#7a4f2c';[-1,1].forEach(function(d){g.save();g.translate(d*30,0);g.rotate(d*wa);g.beginPath();g.ellipse(d*6,14,11,24,d*.25,0,7);g.fill();g.restore()});
    var bg=g.createRadialGradient(-10,-16,6,0,0,46);bg.addColorStop(0,'#c08a55');bg.addColorStop(1,'#8a5a33');g.fillStyle=bg;
    g.beginPath();g.moveTo(-28,-22);g.lineTo(-25,-48);g.lineTo(-8,-34);g.fill();g.beginPath();g.moveTo(28,-22);g.lineTo(25,-48);g.lineTo(8,-34);g.fill();
    g.beginPath();g.ellipse(0,4,36,40,0,0,7);g.fill();
    g.fillStyle='#f6dfb8';g.beginPath();g.ellipse(0,20,22,21,0,0,7);g.fill();
    g.strokeStyle='#d9b98a';g.lineWidth=2;g.lineCap='round';for(var r=0;r<3;r++)for(var c=-1;c<=1;c++){g.beginPath();g.arc(c*10+(r%2?5:0),14+r*8,3.5,.2,2.9);g.stroke()}
    g.fillStyle='#ef9b2d';g.beginPath();g.ellipse(-11,43,8,4,0,0,7);g.ellipse(11,43,8,4,0,0,7);g.fill();
    [-1,1].forEach(function(d){var ex=d*14,ey=-10;
      g.fillStyle='#fff';g.beginPath();g.arc(ex,ey,13,0,7);g.fill();g.strokeStyle='#5d3b20';g.lineWidth=2;g.stroke();
      if(m==='happy'){g.strokeStyle='#33241a';g.lineWidth=3.2;g.beginPath();g.arc(ex,ey+3,6.5,3.5,5.95);g.stroke()}
      else{var pr=m==='shock'?2.6:6;g.fillStyle='#33241a';g.beginPath();g.arc(ex,ey+(sleepy?3:0),pr,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(ex+1.6,ey-1.8+(sleepy?3:0),pr*.3,0,7);g.fill();
        if(sleepy){g.fillStyle='#a8713f';g.beginPath();g.arc(ex,ey,13.6,3.14,6.29);g.lineTo(ex+13.6,ey+2);g.lineTo(ex-13.6,ey+2);g.fill()}
        else if((vt%3.4)<.11){g.fillStyle='#a8713f';g.beginPath();g.arc(ex,ey,13.6,0,7);g.fill()}}});
    g.fillStyle='#f2a12e';g.beginPath();
    if(m==='shock'){g.ellipse(0,3,5,7,0,0,7)}else{g.moveTo(-5,-2);g.lineTo(5,-2);g.lineTo(0,8)}g.fill();
    g.fillStyle='#2c3350';g.beginPath();g.moveTo(-30,-40);g.lineTo(0,-52);g.lineTo(30,-40);g.lineTo(0,-29);g.fill();
    g.fillRect(-13,-38,26,9);g.strokeStyle='#ffd84a';g.lineWidth=2;g.beginPath();g.moveTo(0,-41);g.lineTo(24+Math.sin(vt*3)*2,-34);g.lineTo(25+Math.sin(vt*3)*3,-22);g.stroke();
    g.fillStyle='#ffd84a';g.beginPath();g.arc(25+Math.sin(vt*3)*3,-21,3,0,7);g.fill();
    g.restore();
    if(sleepy){g.fillStyle='rgba(60,70,120,.75)';for(var z=0;z<3;z++){var zz=(vt*.7+z*.33)%1;g.globalAlpha=1-zz;g.font='800 '+(11+zz*10)+'px '+F;g.fillText('z',x+40+zz*18,y-40-zz*34)}g.globalAlpha=1}
    if(m==='shock'){g.fillStyle='#8fd3ff';g.beginPath();g.ellipse(x+40,y-34,4,7,.3,0,7);g.fill()}
  }

  SG.run({
    id:'quick-math',
    title:{ko:'번개 암산 OX',en:'Quick Math O/X'},
    how:{ko:'식이 맞으면 O, 틀리면 X! 시간 안에 골라요',en:'Equation right? Hit O. Wrong? Hit X. Beat the timer!'},
    init:function(a){hearts=3;streak=0;solved=0;qn=0;fromBtn=false;banner=null;mood='idle';moodT=0;heartPulse=0;fbOk=true;fbT=0;press=[0,0];a.tempo(1);next()},
    update:function(dt,inp,a){
      if(inp.tap&&inp.down&&inp.x!=null&&inp.y>=BY){fromBtn=true;answer(a,inp.x>=a.W/2)}
      if(inp.swipe==='left'||inp.swipe==='right'){if(!fromBtn)answer(a,inp.swipe==='right')}
      if(!inp.down)fromBtn=false;
      if(moodT>0){moodT-=dt;if(moodT<=0)mood='idle'}
      if(banner){banner.t+=dt;if(banner.t>1.6)banner=null}
      if(phase==='ask'){var was=elapsed;elapsed+=dt;
        if(limit-elapsed<1&&Math.floor(was*4)!==Math.floor(elapsed*4))a.beep(880,.03);
        if(elapsed>=limit)lose(a,true)}
      else if(phase==='fb'){fbT-=dt;if(fbT<=0)next()}
    },
    draw:function(g,a,dt){
      dt=dt||.016;vt+=dt;press[0]=Math.max(0,press[0]-dt*5);press[1]=Math.max(0,press[1]-dt*5);heartPulse=Math.max(0,(heartPulse||0)-dt*2.5);
      var W=a.W,H=a.H,ko=a.lang==='ko',wc=WALL[tier||0],gr=g.createLinearGradient(0,0,0,470),i;
      gr.addColorStop(0,wc[0]);gr.addColorStop(1,wc[1]);g.fillStyle=gr;g.fillRect(-20,-20,W+40,500);
      g.fillStyle='rgba(255,255,255,.18)';for(i=0;i<8;i++)g.fillRect(i*52-10,-20,2,490);
      /* 바닥 */
      var fg=g.createLinearGradient(0,462,0,H);fg.addColorStop(0,'#b98250');fg.addColorStop(1,'#8a5a33');g.fillStyle=fg;g.fillRect(-20,462,W+40,H);
      g.fillStyle='#7a4f2c';g.fillRect(-20,462,W+40,7);g.strokeStyle='rgba(60,35,15,.18)';g.lineWidth=2;
      for(i=0;i<6;i++){g.beginPath();g.moveTo(180+(i-2.5)*50,469);g.lineTo(180+(i-2.5)*110,H+20);g.stroke()}
      /* 창문 + 구름 */
      g.fillStyle='#8a5a33';rr(g,14,46,112,96,8);g.fill();
      var sk=g.createLinearGradient(0,52,0,136);sk.addColorStop(0,'#7cc8ff');sk.addColorStop(1,'#d6f1ff');g.fillStyle=sk;g.fillRect(20,52,100,84);
      g.save();g.beginPath();g.rect(20,52,100,84);g.clip();
      g.fillStyle='#ffe98a';g.beginPath();g.arc(100,70,11,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.95)';clouds.forEach(function(c){c.x+=c.v*dt;if(c.x>150)c.x=-40;
        g.beginPath();g.ellipse(c.x,c.y,26*c.s,10*c.s,0,0,7);g.ellipse(c.x-10*c.s,c.y-6*c.s,13*c.s,9*c.s,0,0,7);g.ellipse(c.x+9*c.s,c.y-8*c.s,15*c.s,11*c.s,0,0,7);g.fill()});
      g.fillStyle='#7fc46a';g.beginPath();g.ellipse(50,142,50,14,0,0,7);g.ellipse(110,144,36,12,0,0,7);g.fill();
      g.restore();g.fillStyle='#8a5a33';g.fillRect(68,52,4,84);g.fillRect(20,92,100,4);g.fillStyle='#a8713f';g.fillRect(10,138,120,7);
      /* 시계 + 진자 */
      var ang=Math.sin(vt*3.2)*.45,cx=304,cy=84;
      g.strokeStyle='#6b4526';g.lineWidth=3;g.beginPath();g.moveTo(cx,cy+24);g.lineTo(cx+Math.sin(ang)*38,cy+24+Math.cos(ang)*38);g.stroke();
      g.fillStyle='#f2b63c';g.beginPath();g.arc(cx+Math.sin(ang)*38,cy+24+Math.cos(ang)*38,8,0,7);g.fill();
      g.fillStyle='#8a5a33';g.beginPath();g.arc(cx,cy,30,0,7);g.fill();g.fillStyle='#fffaf0';g.beginPath();g.arc(cx,cy,24,0,7);g.fill();
      g.fillStyle='#6b4526';for(i=0;i<12;i++){g.beginPath();g.arc(cx+Math.sin(i*.5236)*19,cy-Math.cos(i*.5236)*19,i%3?1:2,0,7);g.fill()}
      g.strokeStyle='#33241a';g.lineCap='round';g.lineWidth=3;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.sin(vt*.1)*11,cy-Math.cos(vt*.1)*11);g.stroke();
      g.lineWidth=2;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.sin(vt*1.2)*17,cy-Math.cos(vt*1.2)*17);g.stroke();
      g.fillStyle='#e8553d';g.beginPath();g.arc(cx,cy,3,0,7);g.fill();
      /* 하트 */
      for(i=0;i<3;i++)heart(g,180+(i-1)*34,86,1.5+(i===Math.max(0,(hearts||0)-0)||i===(hearts||0)-1?heartPulse*.5:0),i<(hearts||0));
      /* 칠판 */
      var isGold=gold&&phase!=='dead',bx=16,by=160,bw=328,bh=190;
      if(isGold){g.shadowColor='#ffd84a';g.shadowBlur=18+Math.sin(vt*8)*8}
      g.fillStyle=isGold?'#e0a92a':'#9a6a3c';rr(g,bx-6,by-6,bw+12,bh+12,12);g.fill();g.shadowBlur=0;
      var bgd=g.createLinearGradient(0,by,0,by+bh);bgd.addColorStop(0,'#2f6b52');bgd.addColorStop(1,'#1f4d3b');g.fillStyle=bgd;rr(g,bx,by,bw,bh,6);g.fill();
      g.fillStyle='rgba(255,255,255,.05)';g.beginPath();g.ellipse(110,230,90,30,-.3,0,7);g.ellipse(250,300,70,22,.2,0,7);g.fill();
      g.fillStyle='#a8713f';g.fillRect(bx-10,by+bh+6,bw+20,8);g.fillStyle='#fff';g.fillRect(60,by+bh+2,22,5);g.fillStyle='#ffd0d0';g.fillRect(90,by+bh+2,16,5);
      g.fillStyle='#5b6c8c';rr(g,270,by+bh-3,36,10,3);g.fill();
      g.textAlign='center';g.textBaseline='middle';
      g.font='800 15px '+F;g.fillStyle=isGold?'#ffe066':'rgba(255,255,255,.75)';
      g.fillText(isGold?(ko?'★ 보너스 문제 ×3 · 1초 안에 하트 회복 ★':'★ BONUS ×3 · under 1s = +heart ★'):CLS[a.lang][tier||0],W/2,by+22);
      g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=1.5;g.setLineDash([5,5]);g.beginPath();g.moveTo(bx+30,by+38);g.lineTo(bx+bw-30,by+38);g.stroke();g.setLineDash([]);
      if(q){var fs=46;g.font='800 '+fs+'px '+F;var tw=g.measureText(q.text).width;if(tw>bw-36){fs=Math.floor(fs*(bw-36)/tw);g.font='800 '+fs+'px '+F;tw=g.measureText(q.text).width}
        var wr=phase==='ask'?Math.min(1,elapsed/.22):1,x0=W/2-tw/2;
        g.save();g.beginPath();g.rect(x0-6,by+44,(tw+12)*wr,96);g.clip();
        g.fillStyle='rgba(255,255,255,.22)';g.fillText(q.text,W/2+1.5,by+98);
        g.fillStyle=isGold?'#ffe680':'#fbfbf2';g.fillText(q.text,W/2,by+96);g.restore();
        if(wr<1){g.fillStyle='#fff';g.fillRect(x0+(tw+12)*wr-4,by+86,7,20);g.fillStyle='rgba(255,255,255,.5)';for(i=0;i<4;i++)g.fillRect(x0+tw*wr-i*7,by+112+((i*37+qn*13)%14),2,2)}
        if(phase==='fb'||phase==='dead'){var st=fbOk?1:Math.min(1,(.7-(phase==='dead'?0:fbT))/.15+.4);
          if(!fbOk){g.font='800 20px '+F;g.fillStyle='#ffe066';g.fillText((ko?'정답은 ':'It is ')+q.expr+' = '+q.val,W/2,by+142)}
          g.save();g.translate(W-58,by+60);g.rotate(-.2);g.globalAlpha=.9;g.lineWidth=7;g.lineCap='round';
          var okMark=fbOk;g.strokeStyle=okMark?'#7dffa0':'#ff7b7b';g.beginPath();
          if(okMark)g.arc(0,0,17,0,7);else{g.moveTo(-14,-14);g.lineTo(14,14);g.moveTo(14,-14);g.lineTo(-14,14)}g.stroke();g.restore();g.globalAlpha=1}
        /* 시간 막대 */
        var fr=phase==='ask'?Math.max(0,1-elapsed/limit):phase==='dead'?0:1,tx=bx+20,tW=bw-40,ty=by+bh-24;
        g.fillStyle='rgba(0,0,0,.3)';rr(g,tx,ty,tW,12,6);g.fill();
        if(fr>.01){g.fillStyle=fr>.5?'#7de08a':fr>.25?'#ffd84a':'#ff6b6b';rr(g,tx,ty,Math.max(12,tW*fr),12,6);g.fill();
          g.fillStyle='rgba(255,255,255,.35)';rr(g,tx+2,ty+2,Math.max(8,tW*fr-4),4,2);g.fill()}
        if(isGold&&limit){var gx=tx+tW*(1-1/limit);g.fillStyle='#fff';g.fillRect(gx-1,ty-4,2,20)}}
      /* 햇살 + 먼지 */
      g.fillStyle='rgba(255,246,200,.13)';g.beginPath();g.moveTo(20,52);g.lineTo(120,52);g.lineTo(330,470);g.lineTo(130,470);g.fill();
      motes.forEach(function(m){m.v+=m.s*dt;if(m.v>1)m.v-=1;var yy=60+m.v*400,xl=20+(yy-52)*.263,xw=100+(yy-52)*.24;
        g.globalAlpha=.35+.35*Math.sin(vt*2+m.p);g.fillStyle='#fffbe0';g.beginPath();g.arc(xl+((m.u+Math.sin(vt*.6+m.p)*.06+1)%1)*xw,yy,m.r,0,7);g.fill()});g.globalAlpha=1;
      /* 부엉이 + 상태 */
      var low=phase==='ask'&&(1-elapsed/limit)<.35;
      owl(g,W/2,412,phase==='dead'?'sleep':mood,low);
      g.textAlign='center';g.font='800 14px '+F;g.fillStyle='rgba(70,45,25,.7)';g.fillText(ko?'연속 정답':'STREAK',62,392);g.fillText(ko?'문제':'QUESTION',298,392);
      var mult=Math.min(5,1+Math.floor(Math.max(0,(streak||0)-1)/3));
      g.font='800 30px '+F;g.fillStyle=streak>=4?'#e8553d':'#5d3b20';g.fillText(''+(streak||0),62,420);g.fillStyle='#5d3b20';g.fillText(''+(qn||1),298,420);
      g.font='800 13px '+F;g.fillStyle='#b0563a';g.fillText((ko?'점수 ×':'score ×')+mult,62,444);
      var left=10-((qn||1)%10);g.fillStyle='#b88a1e';g.fillText(isGold?(ko?'보너스!':'BONUS!'):(ko?'보너스까지 '+left:left+' to bonus'),298,444);
      /* 버튼 */
      [0,1].forEach(function(k){var x=k?186:12,w=162,y=BY,h=118,p=press[k],d=9*(1-p),c=k?['#57c96b','#2f9446','#dfffe4']:['#ff6b6b','#c93f44','#ffe1e1'];
        g.fillStyle='rgba(0,0,0,.22)';rr(g,x,y+14,w,h,22);g.fill();
        g.fillStyle=c[1];rr(g,x,y+9,w,h,22);g.fill();
        var bgk=g.createLinearGradient(0,y,0,y+h);bgk.addColorStop(0,c[0]);bgk.addColorStop(1,c[1]);g.fillStyle=bgk;rr(g,x,y+9-d,w,h,22);g.fill();
        g.fillStyle='rgba(255,255,255,.22)';rr(g,x+8,y+15-d,w-16,26,14);g.fill();
        g.save();g.translate(x+w/2,y+h/2+2-d);g.scale(1+p*.12,1+p*.12);g.strokeStyle='#fff';g.lineWidth=13;g.lineCap='round';g.beginPath();
        if(k)g.arc(0,-6,27,0,7);else{g.moveTo(-23,-29);g.lineTo(23,17);g.moveTo(23,-29);g.lineTo(-23,17)}g.stroke();g.restore();
        g.font='800 15px '+F;g.fillStyle=c[2];g.fillText(k?(ko?'맞다  →':'TRUE  →'):(ko?'←  틀리다':'←  FALSE'),x+w/2,y+h-11-d)});
      /* 수업 변경 배너 */
      if(banner){var bt=banner.t,sc=bt<.2?bt/.2:1,al=bt>1.2?Math.max(0,1-(bt-1.2)/.4):1;g.save();g.globalAlpha=al;g.translate(W/2,380);g.scale(sc,sc);
        g.fillStyle='#2c3350';rr(g,-150,-26,300,52,26);g.fill();g.strokeStyle='#ffd84a';g.lineWidth=3;g.stroke();
        g.font='800 22px '+F;g.fillStyle='#ffe066';g.fillText(banner.s+'!',0,1);g.restore()}
      g.textBaseline='alphabetic';
    }
  });
})();
