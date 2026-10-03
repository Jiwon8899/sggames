/* 컬러 에코 — 젤리 합창단이 부른 순서를 그대로 따라 부른다 */
(function(){
  var F='Jua,system-ui,sans-serif';
  var C=[{x:180,y:238,c:'#ff6fa5',d:'#d43d7a',l:'#ffc4dc',f:523.25,k:'up'},
         {x:86,y:352,c:'#4fd0ff',d:'#1f94cf',l:'#c8f1ff',f:659.25,k:'left'},
         {x:274,y:352,c:'#ffd84a',d:'#e09a12',l:'#fff3b8',f:783.99,k:'right'},
         {x:180,y:466,c:'#7be07a',d:'#36a84a',l:'#d3f8c6',f:1046.5,k:'down'}];
  var R=50,seq,round,lives,idx,phase,pt,step,timer,tmax,used,st,notes,msg,msgT,remix;
  function L(a,ko,en){return a.lang==='ko'?ko:en}
  function isRemix(r){return r%4===0}
  function gap(){return remix?.24:Math.max(.34,.62-round*.025)}
  function sing(a,i,dur){st[i].lit=1;st[i].sq=1;a.beep(C[i].f,dur||.25,'triangle');a.beep(C[i].f*2,.12,'sine')}
  function startPlay(a,delay){phase='play';step=-1;pt=delay;idx=0;remix=isRemix(round);
    a.tempo(Math.min(1.6,1+round*.05+(remix?.15:0)))}
  SG.run({
    id:'color-echo',
    title:{ko:'컬러 에코',en:'Color Echo'},
    how:{ko:'젤리 합창단이 부른 순서대로 눌러요 (방향키 가능)',en:'Repeat the jelly choir\'s song. Tap them or use arrow keys.'},
    init:function(a){seq=[Math.floor(Math.random()*4)];round=1;lives=2;idx=0;used=0;timer=tmax=4;msg='';msgT=0;
      st=[];for(var i=0;i<4;i++)st.push({lit:0,sq:0,ph:Math.random()*6,bl:1+Math.random()*3});
      notes=[];for(var j=0;j<9;j++)notes.push({x:Math.random()*360,y:Math.random()*640,v:14+Math.random()*22,s:.6+Math.random()*.7,p:Math.random()*6,c:j%4});
      startPlay(a,.7)},
    update:function(dt,inp,a){
      var i;for(i=0;i<4;i++){st[i].lit=Math.max(0,st[i].lit-dt*(phase==='play'?1/(gap()*.8):3.2));st[i].sq=Math.max(0,st[i].sq-dt*4)}
      msgT=Math.max(0,msgT-dt);
      if(phase==='play'){pt-=dt;
        if(pt<=0){step++;
          if(step>=seq.length){phase='input';idx=0;used=0;tmax=Math.max(2.6,4-round*.06);timer=tmax;a.sfx('tap')}
          else{sing(a,seq[step],Math.min(.25,gap()*.8));pt=gap()}}
        return}
      if(phase==='wait'){pt-=dt;if(pt<=0)startPlay(a,.25);return}
      if(phase!=='input')return;
      timer-=dt;used+=dt;
      var hit=-1;
      if(inp.x==null){if(inp.swipe)for(i=0;i<4;i++)if(C[i].k===inp.swipe)hit=i}
      else if(inp.tap){var bd=R+16;for(i=0;i<4;i++){var d=Math.hypot(inp.x-C[i].x,inp.y-C[i].y);if(d<bd){bd=d;hit=i}}}
      if(hit>=0&&hit===seq[idx]){
        sing(a,hit);a.add(1);a.burst(C[hit].x,C[hit].y-10,C[hit].l,8);idx++;timer=tmax;
        if(idx>=seq.length){
          var bonus=0,fast=used<seq.length*.75+.3;
          if(fast)bonus+=Math.ceil(round/2)+1;
          if(remix)bonus+=5;
          if(bonus)a.add(bonus);
          a.sfx(remix?'win':'coin');
          for(i=0;i<4;i++){a.burst(C[i].x,C[i].y,C[i].c,remix?12:6);st[i].sq=1}
          a.pop(180,150,remix?L(a,'리믹스 클리어! +','Remix clear! +')+bonus:fast?L(a,'스피드 보너스 +','Speed bonus +')+bonus:L(a,'좋아요!','Nice!'),remix?'#ff9bd0':'#fff36b');
          round++;seq.push(Math.floor(Math.random()*4));phase='wait';pt=.85;
          msg=isRemix(round)?L(a,'리믹스 라운드!','REMIX ROUND!'):'';msgT=msg?1.3:0}
      }else if(hit>=0||timer<=0){
        lives--;a.shake(10);a.burst(C[hit>=0?hit:seq[idx]].x,C[hit>=0?hit:seq[idx]].y,'#ff5566',16);
        if(hit>=0)st[hit].sq=1;
        a.pop(180,150,hit>=0?L(a,'삑! 틀렸어요','Oops! Wrong note'):L(a,'시간 초과!','Too slow!'),'#ff8a8a');
        if(lives<=0){phase='dead';a.over();return}
        a.sfx('hit');phase='wait';pt=1}
    },
    draw:function(g,a){
      var W=a.W,H=a.H,T=performance.now()/1000,i,gr;
      if(!st)return;
      /* 무대 배경 */
      gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#1b1147');gr.addColorStop(.55,'#4a2380');gr.addColorStop(1,'#8a3a8f');
      g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
      /* 스포트라이트 */
      var rm=phase&&remix&&phase!=='dead';
      for(i=0;i<3;i++){var ang=Math.sin(T*(rm?1.5:.55)+i*2.1)*.42,ox=60+i*120;
        g.save();g.translate(ox,-10);g.rotate(ang);gr=g.createLinearGradient(0,0,0,560);
        var col=['255,140,200','130,220,255','255,230,130'][i];
        gr.addColorStop(0,'rgba('+col+',.30)');gr.addColorStop(1,'rgba('+col+',0)');g.fillStyle=gr;
        g.beginPath();g.moveTo(-8,0);g.lineTo(8,0);g.lineTo(95,560);g.lineTo(-95,560);g.fill();g.restore()}
      /* 떠다니는 음표 */
      notes.forEach(function(n){var y=((n.y-T*n.v)%700+700)%700-30,x=n.x+Math.sin(T*.8+n.p)*14;
        g.save();g.translate(x,y);g.scale(n.s,n.s);g.rotate(Math.sin(T+n.p)*.25);g.globalAlpha=.28;g.fillStyle=C[n.c].l;
        g.beginPath();g.ellipse(0,0,7,5,-.4,0,7);g.fill();g.fillRect(5,-22,2.5,22);
        g.beginPath();g.moveTo(7,-22);g.quadraticCurveTo(18,-18,14,-8);g.quadraticCurveTo(14,-15,7,-16);g.fill();g.restore()});
      g.globalAlpha=1;
      /* 커튼 */
      for(var s=-1;s<=1;s+=2){g.save();g.translate(s<0?0:W,0);g.scale(s<0?1:-1,1);
        gr=g.createLinearGradient(0,0,46,0);gr.addColorStop(0,'#7d1238');gr.addColorStop(.5,'#c22a5c');gr.addColorStop(1,'#8f1740');g.fillStyle=gr;
        g.beginPath();g.moveTo(-20,-20);g.lineTo(46,-20);g.quadraticCurveTo(40,300,22+Math.sin(T*.9)*3,H-70);g.lineTo(-20,H-60);g.fill();
        g.fillStyle='rgba(0,0,0,.18)';g.fillRect(12,0,4,H-90);g.fillRect(28,0,3,H-120);g.restore()}
      /* 전구 줄 */
      g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=1.5;g.beginPath();g.moveTo(0,52);g.quadraticCurveTo(W/2,84,W,52);g.stroke();
      for(i=0;i<11;i++){var u=(i+.5)/11,bx=u*W,by=52+64*u*(1-u),tw=.55+.45*Math.sin(T*(rm?9:3.5)+i*1.7);
        g.fillStyle=C[i%4].c;g.globalAlpha=.35+.65*tw;g.shadowColor=C[i%4].c;g.shadowBlur=10*tw;g.beginPath();g.arc(bx,by+4,4,0,7);g.fill()}
      g.globalAlpha=1;g.shadowBlur=0;
      /* 무대 바닥 */
      gr=g.createLinearGradient(0,H-110,0,H);gr.addColorStop(0,'#5b2a55');gr.addColorStop(1,'#2a1233');g.fillStyle=gr;
      g.beginPath();g.ellipse(W/2,H-20,W*.75,95,0,Math.PI,0);g.lineTo(W+20,H+20);g.lineTo(-20,H+20);g.fill();
      g.fillStyle='rgba(255,220,240,.10)';g.beginPath();g.ellipse(W/2,H-62,150,26,0,0,7);g.fill();
      /* 젤리들 */
      var listen=phase==='input';
      for(i=0;i<4;i++){var c=C[i],o=st[i],lit=o.lit,bob=Math.sin(T*2.6+o.ph)*4,sq=o.sq,
          sx=1+sq*.16+Math.sin(T*2.6+o.ph+1.5)*.025,sy=1-sq*.14-Math.sin(T*2.6+o.ph+1.5)*.025+lit*.08;
        g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(c.x,c.y+R+10,R*.8-bob,9,0,0,7);g.fill();
        g.save();g.translate(c.x,c.y+R+bob*.5);g.scale(sx,sy);g.translate(0,-R);
        if(lit>.02){g.globalAlpha=lit*.55;gr=g.createRadialGradient(0,0,R*.6,0,0,R*1.75);gr.addColorStop(0,c.l);gr.addColorStop(1,'rgba(255,255,255,0)');
          g.fillStyle=gr;g.beginPath();g.arc(0,0,R*1.75,0,7);g.fill();g.globalAlpha=1}
        /* 더듬이/장식: 캐릭터마다 다르게 */
        g.strokeStyle=c.d;g.lineWidth=4;g.lineCap='round';g.fillStyle=c.l;
        if(i===0){g.beginPath();g.moveTo(0,-R+6);g.quadraticCurveTo(6,-R-14,Math.sin(T*3)*5,-R-20);g.stroke();g.beginPath();g.arc(Math.sin(T*3)*5,-R-22,6,0,7);g.fill()}
        else if(i===1){g.fillStyle=c.d;g.beginPath();g.moveTo(-30,-R+18);g.lineTo(-22,-R-10);g.lineTo(-10,-R+8);g.fill();g.beginPath();g.moveTo(30,-R+18);g.lineTo(22,-R-10);g.lineTo(10,-R+8);g.fill()}
        else if(i===2){for(var q=-1;q<=1;q++){g.beginPath();g.moveTo(q*14,-R+6);g.lineTo(q*18,-R-12+Math.abs(q)*5);g.stroke()}}
        else{g.fillStyle=c.d;g.beginPath();g.ellipse(-8,-R-4,10,5,-.6,0,7);g.ellipse(9,-R-5,10,5,.6,0,7);g.fill()}
        /* 몸통 */
        gr=g.createRadialGradient(-14,-18,6,0,0,R*1.15);gr.addColorStop(0,lit>.3?'#fff':c.l);gr.addColorStop(.45,c.c);gr.addColorStop(1,c.d);
        g.fillStyle=gr;if(lit>.05){g.shadowColor=c.l;g.shadowBlur=26*lit}
        g.beginPath();g.moveTo(-R,R*.55);g.bezierCurveTo(-R*1.08,-R*.7,-R*.55,-R,0,-R);g.bezierCurveTo(R*.55,-R,R*1.08,-R*.7,R,R*.55);
        for(var w=0;w<4;w++){var x1=R-w*R*.5,wob=Math.sin(T*4+w+o.ph)*2;g.quadraticCurveTo(x1-R*.25,R*.95+wob,x1-R*.5,R*.55)}
        g.fill();g.shadowBlur=0;
        g.fillStyle='rgba(255,255,255,.45)';g.beginPath();g.ellipse(-20,-26,9,15,.6,0,7);g.fill();
        g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.arc(-30,-4,4,0,7);g.fill();
        /* 볼터치 */
        g.fillStyle='rgba(255,120,150,.4)';g.beginPath();g.ellipse(-27,8,7,4.5,0,0,7);g.ellipse(27,8,7,4.5,0,0,7);g.fill();
        /* 눈 */
        var blink=((T+o.bl)%(2.6+o.bl*.4))<.12,happy=lit>.25;
        g.strokeStyle='#2a1a3a';g.fillStyle='#2a1a3a';g.lineWidth=3;
        if(happy){g.beginPath();g.arc(-15,-2,6,Math.PI*1.1,Math.PI*1.9);g.stroke();g.beginPath();g.arc(15,-2,6,Math.PI*1.1,Math.PI*1.9);g.stroke()}
        else if(blink){g.beginPath();g.moveTo(-21,-4);g.lineTo(-9,-4);g.moveTo(9,-4);g.lineTo(21,-4);g.stroke()}
        else{g.beginPath();g.arc(-15,-4,6.5,0,7);g.arc(15,-4,6.5,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(-13,-6.5,2.4,0,7);g.arc(17,-6.5,2.4,0,7);g.fill()}
        /* 입 */
        if(lit>.12){g.fillStyle='#5a1630';g.beginPath();g.ellipse(0,15,7+lit*4,5+lit*9,0,0,7);g.fill();
          g.fillStyle='#ff7d9c';g.beginPath();g.ellipse(0,20+lit*5,5,3,0,0,7);g.fill()}
        else{g.strokeStyle='#2a1a3a';g.lineWidth=2.5;g.beginPath();g.arc(0,10,6,.15*Math.PI,.85*Math.PI);g.stroke()}
        g.restore();
        /* 방향 힌트 */
        g.save();g.translate(c.x,c.y+R+26);g.rotate([0,-Math.PI/2,Math.PI/2,Math.PI][i]);g.globalAlpha=listen?.9:.35;
        g.fillStyle=c.l;g.beginPath();g.moveTo(0,-7);g.lineTo(7,5);g.lineTo(-7,5);g.fill();g.restore();
        if(lit>.5){g.globalAlpha=(lit-.5)*2;g.fillStyle='#fff';g.font='800 22px '+F;g.textAlign='center';g.fillText('♪',c.x+R*.9,c.y-R*.7-(1-lit)*30);g.globalAlpha=1}
      }
      /* HUD: 라운드, 목숨 */
      g.textBaseline='middle';g.font='800 17px '+F;g.textAlign='left';
      g.fillStyle='rgba(20,8,40,.55)';rr(g,56,84,104,28,14);g.fill();rr(g,W-56-70,84,70,28,14);g.fill();
      g.fillStyle=rm?'#ff9bd0':'#fff';g.fillText((rm?L(a,'리믹스 ','Remix '):L(a,'라운드 ','Round '))+round,68,99);
      for(i=0;i<2;i++){g.fillStyle=i<lives?'#ff6f91':'rgba(255,255,255,.22)';heart(g,W-56-70+22+i*26,98,9)}
      /* 상태 배너 */
      var txt,bc;
      if(msgT>0){txt=msg;bc='#ff5fb0'}
      else if(phase==='input'){txt=L(a,'네 차례! 따라 불러요','Your turn! Repeat it');bc='#3ccf7a'}
      else if(phase==='dead'){txt=L(a,'공연 끝!','Show\'s over!');bc='#8a6fb0'}
      else{txt=L(a,'잘 들어봐요…','Watch & listen…');bc='#ffb23e'}
      var pu=1+Math.sin(T*6)*.03;g.save();g.translate(W/2,140);g.scale(pu,pu);
      g.fillStyle='rgba(0,0,0,.25)';rr(g,-112,-17,224,38,19);g.fill();g.fillStyle=bc;rr(g,-112,-20,224,38,19);g.fill();
      g.fillStyle='#fff';g.textAlign='center';g.font='800 19px '+F;g.fillText(txt,0,0);g.restore();
      /* 입력 타이머 */
      if(phase==='input'){var k=Math.max(0,timer/tmax);g.fillStyle='rgba(20,8,40,.55)';rr(g,70,168,220,12,6);g.fill();
        g.fillStyle=k<.3?'#ff5566':k<.6?'#ffd84a':'#7be07a';if(k>.03){rr(g,72,170,216*k,8,4);g.fill()}}
      /* 진행 점 */
      if(seq){var n=seq.length,dw=Math.min(16,260/n),x0=W/2-dw*(n-1)/2,done=phase==='input'?idx:phase==='play'?step+1:0;
        for(i=0;i<n;i++){g.fillStyle=i<done?(phase==='input'?C[seq[i]].c:'#fff'):'rgba(255,255,255,.25)';g.beginPath();g.arc(x0+i*dw,H-34,Math.min(5,dw*.36),0,7);g.fill()}}
      g.textBaseline='alphabetic';
    }
  });
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function heart(g,x,y,s){g.beginPath();g.moveTo(x,y+s*.8);g.bezierCurveTo(x-s*1.5,y-s*.2,x-s*.7,y-s*1.2,x,y-s*.35);g.bezierCurveTo(x+s*.7,y-s*1.2,x+s*1.5,y-s*.2,x,y+s*.8);g.fill()}
})();
