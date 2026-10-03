/* 지붕 위의 고양이 — 밤 도시 지붕을 달리며 점프. 모서리 착지로 콤보 배율을 키운다 */
(function(){
  var cat,roofs,stars,sky,t,v,scroll,combo,dead,nid,lastId,hintT,comboPulse;
  var GY=1500,CX=92,EDGE=40;
  function hash(i){var x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function addRoof(a,x,w,y,plain){
    var r={id:nid++,x:x,w:w,y:y,obs:[],seed:Math.floor(Math.random()*1000)};
    if(!plain&&w>=300&&Math.random()<Math.min(.85,.45+t*.012)){
      var n=(w>=430&&Math.random()<.5)?2:1;
      for(var i=0;i<n;i++){var ant=Math.random()<.45;
        r.obs.push({dx:130+(w-230)*(n===1?Math.random():(i*.6+Math.random()*.25)),w:ant?10:24,h:ant?46:30,ant:ant})}}
    roofs.push(r);
    /* 별: 지붕 위 아치 또는 앞쪽 틈 위 */
    if(stars.length<14){
      if(Math.random()<.7){var sx=x-36,sy=y-74;stars.push({x:sx,y:sy,ph:Math.random()*6})}
      if(w>=240&&!r.obs.length&&Math.random()<.8){var m=2+Math.floor(Math.random()*2),bx=x+w*.35;
        for(var j=0;j<m;j++)stars.push({x:bx+j*34,y:y-58-Math.sin((j+.5)/m*3.14)*34,ph:j})}
      else if(r.obs.length){var o=r.obs[0];stars.push({x:x+o.dx+o.w/2,y:y-o.h-46,ph:1})}}
    return r}
  function fill(a){
    var L=roofs[roofs.length-1];
    while(L.x+L.w<a.W+420&&roofs.length<9){
      var gap=56+Math.random()*(v*.46-56),ny=L.y+(Math.random()*104-48);
      ny=Math.max(380,Math.min(505,ny));if(ny<L.y-46)ny=L.y-46;
      var w=170+Math.random()*250;if(t<12)w+=70;
      L=addRoof(a,L.x+L.w+gap,w,ny,nid<2)}}
  function die(a,fell){dead=true;cat.dizzy=1;a.burst(cat.x,cat.y-18,'#ffb25e',22);a.burst(cat.x,cat.y-18,'#ffffff',10);a.shake(10);a.over()}
  SG.run({
    id:'roof-runner',
    title:{ko:'지붕 위의 고양이',en:'Roof Runner'},
    how:{ko:'탭해서 점프! 공중에서 한 번 더. 지붕 모서리에 딱 착지하면 콤보 배율 UP',en:'Tap to jump, tap again in mid-air. Land right on a rooftop edge to grow your combo.'},
    init:function(a){
      t=0;v=175;scroll=0;combo=0;dead=false;nid=0;lastId=0;hintT=0;comboPulse=0;roofs=[];stars=[];
      cat={x:CX,y:440,vy:0,ground:true,coy:0,jumps:0,sq:0,blink:0,roof:null,dizzy:0,air:0};
      var r=addRoof(a,-40,760,440,true);cat.roof=r;stars.length=0;
      stars.push({x:330,y:372,ph:0},{x:366,y:356,ph:1},{x:402,y:372,ph:2});
      fill(a);
      if(!sky){sky=[];for(var i=0;i<46;i++)sky.push({x:Math.random()*a.W,y:Math.random()*330,r:.6+Math.random()*1.3,p:Math.random()*6})}},
    update:function(dt,inp,a){
      t+=dt;v=Math.min(400,175+t*4.6);a.tempo(1+t*.009);
      var dx=v*dt,i,r,o;scroll+=dx;hintT+=dt;comboPulse=Math.max(0,comboPulse-dt*3);
      for(i=0;i<roofs.length;i++)roofs[i].x-=dx;
      for(i=0;i<stars.length;i++)stars[i].x-=dx;
      if(roofs[0].x+roofs[0].w<-60)roofs.shift();
      fill(a);
      cat.sq=Math.max(0,cat.sq-dt*5);cat.blink-=dt;if(cat.blink<-.12)cat.blink=1.5+Math.random()*2.5;
      /* 점프 */
      if(inp.tap){
        if(cat.ground||cat.coy>0){cat.vy=-530;cat.ground=false;cat.coy=0;cat.jumps=1;a.sfx('jump');a.burst(cat.x-6,cat.y,'#cfd8ff',5)}
        else if(cat.jumps<2){cat.vy=-470;cat.jumps=2;a.sfx('jump');a.beep(880,.06);a.burst(cat.x,cat.y,'#9fe8ff',9)}}
      if(cat.ground){r=cat.roof;cat.y=r.y;if(cat.x>r.x+r.w+8){cat.ground=false;cat.coy=.09;cat.jumps=0}}
      if(!cat.ground){
        if(cat.coy>0){cat.coy-=dt;if(cat.coy<=0&&cat.jumps<1)cat.jumps=1}
        var py=cat.y;cat.vy+=GY*dt;cat.y+=cat.vy*dt;cat.air+=dt;
        for(i=0;i<roofs.length;i++){r=roofs[i];
          if(cat.x<r.x-8||cat.x>r.x+r.w+8)continue;
          if(cat.vy>=0&&py<=r.y+3&&cat.y>=r.y){
            cat.y=r.y;cat.vy=0;cat.ground=true;cat.roof=r;cat.jumps=0;cat.sq=1;cat.air=0;
            a.burst(cat.x,cat.y,'rgba(220,225,255,.8)',4);
            if(r.id!==lastId){lastId=r.id;
              if(cat.x-r.x<=EDGE){combo=Math.min(9,combo+1);comboPulse=1;var pts=2+combo*2;a.add(pts);a.sfx('coin');a.beep(520+combo*70,.1,'triangle');
                a.burst(cat.x,cat.y,'#7dffc8',14);a.pop(cat.x+20,cat.y-52,(a.lang==='ko'?'완벽! x':'Perfect! x')+(combo+1),'#7dffc8')}
              else{if(combo>0){a.pop(cat.x+10,cat.y-52,a.lang==='ko'?'콤보 끊김':'Combo lost','#ff9aa8');a.beep(220,.12,'sawtooth')}
                combo=0;a.add(1);a.sfx('tap');a.pop(cat.x+10,cat.y-34,'+1','#ffffff')}}
            break}
          if(cat.y>r.y+12&&cat.x+9>r.x&&cat.x<r.x+r.w){cat.x=Math.min(cat.x,r.x-6);die(a);return}}
        if(cat.y>a.H+50){die(a);return}}
      /* 장애물 */
      for(i=0;i<roofs.length;i++){r=roofs[i];for(var j=0;j<r.obs.length;j++){o=r.obs[j];var ox=r.x+o.dx;
        if(cat.x+10>ox+2&&cat.x-10<ox+o.w-2&&cat.y>r.y-o.h+4){die(a);return}
        if(!o.passed&&ox+o.w<cat.x-10){o.passed=true;a.add(1+combo);a.beep(700,.05);a.pop(cat.x,cat.y-44,'+'+(1+combo),'#ffe9a8')}}}
      /* 별 */
      for(i=stars.length-1;i>=0;i--){var s=stars[i];
        if(s.x<-30){stars.splice(i,1);continue}
        if(Math.abs(s.x-cat.x)<24&&Math.abs(s.y-(cat.y-18))<28){var p=3*(combo+1);a.add(p);a.sfx('coin');a.burst(s.x,s.y,'#ffe66b',12);
          a.pop(s.x,s.y-16,'+'+p,'#fff36b');stars.splice(i,1)}}
    },
    draw:function(g,a){
      var W=a.W,H=a.H,i,j,k,x,h,r,gr=g.createLinearGradient(0,0,0,H);
      gr.addColorStop(0,'#0d1038');gr.addColorStop(.5,'#2b2463');gr.addColorStop(.8,'#6a3d86');gr.addColorStop(1,'#c7627a');
      g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
      for(i=0;i<sky.length;i++){var s=sky[i];g.globalAlpha=.45+.5*Math.sin(t*2+s.p);g.fillStyle='#fff';g.beginPath();g.arc(s.x,s.y,s.r,0,7);g.fill()}
      g.globalAlpha=1;
      /* 달 */
      var mg=g.createRadialGradient(270,120,10,270,120,90);mg.addColorStop(0,'rgba(255,244,200,.45)');mg.addColorStop(1,'rgba(255,244,200,0)');
      g.fillStyle=mg;g.beginPath();g.arc(270,120,90,0,7);g.fill();
      g.fillStyle='#fff3c4';g.beginPath();g.arc(270,120,36,0,7);g.fill();
      g.fillStyle='rgba(230,200,140,.5)';g.beginPath();g.arc(258,110,7,0,7);g.arc(282,130,5,0,7);g.arc(276,104,3.5,0,7);g.fill();
      /* 먼 스카이라인 (패럴랙스 1) */
      var off=scroll*.12,bw=44,first=Math.floor(off/bw);
      g.fillStyle='#332b78';
      for(k=-1;k<11;k++){i=first+k;x=i*bw-off;h=90+hash(i)*150;g.fillRect(x,H-140-h,bw+1,h+160);
        if(hash(i+.5)>.6){g.fillRect(x+bw/2-2,H-140-h-22,4,22)}}
      /* 중간 스카이라인 (패럴랙스 2) + 창문 */
      off=scroll*.34;bw=66;first=Math.floor(off/bw);
      for(k=-1;k<8;k++){i=first+k;x=i*bw-off;h=70+hash(i*3.3)*170;var top=H-70-h;
        g.fillStyle='#3a2c74';g.fillRect(x+3,top,bw-6,h+90);g.fillStyle='rgba(255,255,255,.06)';g.fillRect(x+3,top,5,h+90);
        for(var wy=0;wy<6;wy++)for(var wx=0;wx<3;wx++){var hv=hash(i*17+wy*5+wx*1.7);if(hv>.55){g.fillStyle=hv>.85?'rgba(140,220,255,.55)':'rgba(255,214,120,.55)';
          g.fillRect(x+13+wx*16,top+14+wy*24,8,11)}}}
      /* 안개 */
      gr=g.createLinearGradient(0,H-200,0,H);gr.addColorStop(0,'rgba(255,140,160,0)');gr.addColorStop(1,'rgba(255,150,150,.28)');g.fillStyle=gr;g.fillRect(-20,H-200,W+40,220);
      /* 지붕 */
      for(i=0;i<roofs.length;i++){r=roofs[i];if(r.x>W+30||r.x+r.w<-30)continue;
        gr=g.createLinearGradient(0,r.y,0,H);gr.addColorStop(0,'#4b4f8f');gr.addColorStop(1,'#1c1b42');g.fillStyle=gr;g.fillRect(r.x,r.y+8,r.w,H-r.y+30);
        g.fillStyle='rgba(255,255,255,.07)';g.fillRect(r.x,r.y+8,6,H-r.y+30);g.fillStyle='rgba(0,0,0,.22)';g.fillRect(r.x+r.w-8,r.y+8,8,H-r.y+30);
        for(var c=0;c*38+26<r.w-14;c++)for(var q=0;q<5;q++){var hw=hash(r.seed+c*7.3+q*13.1);
          g.fillStyle=hw>.5?'rgba(255,220,130,.85)':'rgba(20,20,60,.55)';g.fillRect(r.x+16+c*38,r.y+30+q*34,16,20);
          if(hw>.5){g.fillStyle='rgba(255,255,255,.35)';g.fillRect(r.x+16+c*38,r.y+30+q*34,16,4)}}
        /* 처마 */
        gr=g.createLinearGradient(0,r.y,0,r.y+12);gr.addColorStop(0,'#9aa2e8');gr.addColorStop(1,'#5a5fa8');g.fillStyle=gr;
        g.fillRect(r.x-5,r.y,r.w+10,12);g.fillStyle='rgba(255,255,255,.45)';g.fillRect(r.x-5,r.y,r.w+10,2);
        g.fillStyle='rgba(0,0,0,.25)';g.fillRect(r.x,r.y+12,r.w,5);
        /* 완벽 착지 구역 */
        if(r.id>0){g.fillStyle='rgba(125,255,200,'+(.55+.3*Math.sin(t*6+r.id))+')';g.fillRect(r.x-5,r.y,EDGE+5,4);
          g.fillStyle='rgba(125,255,200,.12)';g.fillRect(r.x-5,r.y-10,EDGE+5,10)}
        for(j=0;j<r.obs.length;j++){var o=r.obs[j],ox=r.x+o.dx;
          g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(ox+o.w/2+5,r.y+2,o.w*.8,4,0,0,7);g.fill();
          if(o.ant){g.strokeStyle='#c9d0ff';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(ox+5,r.y);g.lineTo(ox+5,r.y-o.h+4);
            g.moveTo(ox-5,r.y-o.h+18);g.lineTo(ox+15,r.y-o.h+18);g.moveTo(ox-2,r.y-o.h+28);g.lineTo(ox+12,r.y-o.h+28);g.stroke();
            g.fillStyle='#ff5a6e';g.shadowColor='#ff5a6e';g.shadowBlur=8+6*Math.sin(t*8);g.beginPath();g.arc(ox+5,r.y-o.h+3,4,0,7);g.fill();g.shadowBlur=0}
          else{gr=g.createLinearGradient(ox,0,ox+o.w,0);gr.addColorStop(0,'#e0785c');gr.addColorStop(1,'#9c4238');g.fillStyle=gr;g.fillRect(ox,r.y-o.h+6,o.w,o.h-6);
            g.fillStyle='rgba(0,0,0,.18)';for(var b=0;b<3;b++)g.fillRect(ox,r.y-o.h+12+b*8,o.w,1.5);
            g.fillStyle='#f2a184';g.fillRect(ox-3,r.y-o.h,o.w+6,7);g.fillStyle='rgba(255,255,255,.4)';g.fillRect(ox-3,r.y-o.h,o.w+6,2);
            g.fillStyle='rgba(230,230,255,.22)';for(b=0;b<3;b++){var sm=(t*.6+b*.33)%1;g.beginPath();g.arc(ox+o.w/2+sm*14,r.y-o.h-6-sm*34,4+sm*7,0,7);g.fill()}}}}
      /* 별 */
      for(i=0;i<stars.length;i++){var st=stars[i],yy=st.y+Math.sin(t*4+st.ph)*4;
        g.save();g.translate(st.x,yy);g.rotate(Math.sin(t*2+st.ph)*.25);g.shadowColor='#ffe66b';g.shadowBlur=14;
        gr=g.createRadialGradient(-2,-3,1,0,0,13);gr.addColorStop(0,'#fffbd0');gr.addColorStop(1,'#ffc93c');g.fillStyle=gr;g.beginPath();
        for(k=0;k<10;k++){var ang=k*.6283-1.5708,rad=k%2?5.5:12;g.lineTo(Math.cos(ang)*rad,Math.sin(ang)*rad)}g.closePath();g.fill();g.restore()}
      /* 고양이 */
      var gnd=cat.ground,run=t*(10+v*.02),sx=1+cat.sq*.22,sy=1-cat.sq*.2;
      if(!gnd&&!dead){var st2=Math.max(-.16,Math.min(.16,-cat.vy/2600));sy=1+Math.abs(st2);sx=1-Math.abs(st2)*.6}
      if(cat.roof&&cat.y<=cat.roof.y+2&&cat.x<cat.roof.x+cat.roof.w+8){var sh=Math.max(.3,1-(cat.roof.y-cat.y)/140);
        g.fillStyle='rgba(0,0,0,'+(.3*sh)+')';g.beginPath();g.ellipse(cat.x,cat.roof.y+2,20*sh,5*sh,0,0,7);g.fill()}
      g.save();g.translate(cat.x,cat.y);g.scale(sx,sy);
      g.rotate(dead?.5:gnd?0:Math.max(-.35,Math.min(.4,cat.vy/1500)));
      var bob=gnd?Math.sin(run*2)*1.5:0;g.translate(0,bob);
      /* 꼬리 */
      g.strokeStyle='#f09a4a';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(-16,-16);g.quadraticCurveTo(-34,-18+Math.sin(t*9)*5,-30,-36+Math.sin(t*7)*4);g.stroke();
      /* 다리 */
      g.strokeStyle='#e08a3c';g.lineWidth=5;
      for(k=0;k<4;k++){var lx=k<2?-11+k*5:8+(k-2)*5,sw=gnd?Math.sin(run+k*1.6)*7:(k<2?-7:7);
        g.beginPath();g.moveTo(lx,-9);g.lineTo(lx+sw,gnd?-1-Math.max(0,Math.cos(run+k*1.6))*3:-3);g.stroke()}
      /* 몸 */
      gr=g.createRadialGradient(-4,-22,3,0,-16,22);gr.addColorStop(0,'#ffc98a');gr.addColorStop(1,'#f09a4a');g.fillStyle=gr;
      g.beginPath();g.ellipse(-2,-16,18,11,0,0,7);g.fill();
      g.fillStyle='rgba(200,110,40,.5)';g.fillRect(-9,-26,3,7);g.fillRect(-2,-27,3,7);
      g.fillStyle='#fff3e0';g.beginPath();g.ellipse(2,-10,9,4,0,0,7);g.fill();
      /* 머리 */
      g.fillStyle=gr;g.beginPath();g.moveTo(4,-34);g.lineTo(7,-47);g.lineTo(15,-37);g.fill();g.beginPath();g.moveTo(16,-37);g.lineTo(25,-46);g.lineTo(25,-32);g.fill();
      g.fillStyle='#ffb0b8';g.beginPath();g.moveTo(8,-37);g.lineTo(8.5,-43);g.lineTo(12,-38);g.fill();
      g.fillStyle=gr;g.beginPath();g.arc(15,-27,12.5,0,7);g.fill();
      g.fillStyle='#fff3e0';g.beginPath();g.ellipse(19,-22,7,5,0,0,7);g.fill();
      if(dead){g.strokeStyle='#3a2318';g.lineWidth=2;g.beginPath();g.moveTo(9,-32);g.lineTo(15,-26);g.moveTo(15,-32);g.lineTo(9,-26);g.moveTo(19,-32);g.lineTo(25,-26);g.moveTo(25,-32);g.lineTo(19,-26);g.stroke()}
      else if(cat.blink<0){g.strokeStyle='#3a2318';g.lineWidth=2;g.beginPath();g.moveTo(9,-29);g.lineTo(15,-29);g.moveTo(19,-29);g.lineTo(25,-29);g.stroke()}
      else{var ey=gnd?0:(cat.vy<0?-1.2:1.2),er=gnd?3.6:4.4;g.fillStyle='#fff';g.beginPath();g.arc(12,-29,er,0,7);g.arc(22,-29,er,0,7);g.fill();
        g.fillStyle='#2a1a12';g.beginPath();g.arc(13.2,-29+ey,2.1,0,7);g.arc(23.2,-29+ey,2.1,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(13.8,-30+ey,.8,0,7);g.arc(23.8,-30+ey,.8,0,7);g.fill()}
      g.fillStyle='#ff8a9a';g.beginPath();g.arc(20,-23.5,1.7,0,7);g.fill();
      g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1;g.beginPath();g.moveTo(24,-22);g.lineTo(33,-24);g.moveTo(24,-20.5);g.lineTo(33,-19);g.stroke();
      if(!gnd&&!dead&&cat.vy<0){g.fillStyle='#7a2a30';g.beginPath();g.arc(20,-19.5,2,0,7);g.fill()}
      g.restore();
      /* 콤보 표시 */
      g.textAlign='center';
      if(combo>0){var cs=1+comboPulse*.35;g.save();g.translate(W/2,92);g.scale(cs,cs);
        g.font='800 30px Jua,system-ui,sans-serif';g.fillStyle='rgba(0,0,0,.4)';g.fillText('x'+(combo+1),2,3);g.fillStyle='#7dffc8';g.fillText('x'+(combo+1),0,0);
        g.font='800 13px Jua,system-ui,sans-serif';g.fillStyle='#d8fff0';g.fillText(a.lang==='ko'?'완벽 착지 콤보':'PERFECT COMBO',0,18);g.restore()}
      if(hintT<6&&!dead){g.globalAlpha=Math.min(1,(6-hintT)*1.2);g.font='800 18px Jua,system-ui,sans-serif';
        var m1=a.lang==='ko'?'탭 = 점프 · 공중에서 한 번 더!':'Tap = jump · tap again in mid-air!',m2=a.lang==='ko'?'초록 모서리에 착지하면 콤보':'Land on the green edge for combos';
        g.fillStyle='rgba(0,0,0,.45)';g.fillText(m1,W/2+1,222);g.fillStyle='#fff';g.fillText(m1,W/2,220);
        g.font='800 14px Jua,system-ui,sans-serif';g.fillStyle='#7dffc8';g.fillText(m2,W/2,244);g.globalAlpha=1}
    }
  });
})();
