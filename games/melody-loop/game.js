/* 멜로디 루프 (Melody Loop) — 노래새의 짧은 노래를 전깃줄 위 음표새로 다시 짓는 귀+눈 퍼즐.
   멜로디 생성 / 윤곽 / 피드백 로직은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,ROWS=5;
  var FREQ=[1046.5,1174.66,1318.51,1567.98,1760];           /* C6 펜타토닉 */
  var COL=['#ff6f6f','#ffa94d','#ffe066','#69e0a0','#6cc6ff'],COLD=['#c23d4a','#c9712a','#c9a52a','#2f9e6b','#2f7fc2'];

  /* ---------- 순수 로직 ---------- */
  function cfg(n){
    var len=[4,4,5,5,6,6,7,7][n]||8;
    return {n:n,len:len,rest:n>=5,contour:!(n>=8&&n%2===0),yellow:!(n>=9&&n%2===1),
      step:Math.max(.2,.28-.008*n),prefill:n===0?3:0};
  }
  function valid(m){
    var N=m.length,i,notes=[],seen={},d=0,steps=0,iv=0;
    if(m[0]!==0&&m[0]!==3)return false;
    if(m[N-1]!==0&&m[N-1]!==3)return false;
    for(i=0;i<N;i++){if(m[i]<-1||m[i]>4)return false;if(m[i]>=0){notes.push(m[i]);if(!seen[m[i]]){seen[m[i]]=1;d++}}}
    if(N-notes.length>1)return false;
    if(d<3)return false;
    for(i=1;i<notes.length;i++){var a=Math.abs(notes[i]-notes[i-1]);iv++;if(a<=1)steps++;
      if(i>=2&&notes[i]===notes[i-1]&&notes[i]===notes[i-2])return false}
    return steps*2>=iv;
  }
  function gen(c,rnd){
    for(var tries=0;tries<5000;tries++){
      var m=[rnd()<.6?0:3],i;
      for(i=1;i<c.len;i++){var p=m[i-1],r=rnd(),dlt;
        if(r<.14)dlt=0;else if(r<.74)dlt=rnd()<.5?1:-1;else dlt=(rnd()<.5?1:-1)*(2+Math.floor(rnd()*2));
        var v=p+dlt;if(v<0||v>4)v=p-dlt;if(v<0)v=0;if(v>4)v=4;m.push(v)}
      if(c.rest&&rnd()<.55)m[1+Math.floor(rnd()*(c.len-2))]=-1;
      if(valid(m))return m;
    }
    return [0,1,2,3,2,1,0,3].slice(0,c.len-1).concat([3]);
  }
  /* 윤곽: 칸마다 'o'(첫 음) 'u' 'd' 's' 'r'(쉼표). 쉼표는 건너뛰고 직전 음과 비교한다 */
  function contour(m){var out=[],prev=null;for(var i=0;i<m.length;i++){
      if(m[i]<0)out.push('r');else{out.push(prev==null?'o':m[i]>prev?'u':m[i]<prev?'d':'s');prev=m[i]}}return out}
  /* 피드백: 2 초록(정확), 1 노랑(음은 맞지만 자리가 다름, 마스터마인드식 중복 처리), 0 없음 */
  function feedback(t,g,yellow){var N=t.length,fb=[],cnt=[0,0,0,0,0],i;
    for(i=0;i<N;i++){if(g[i]===t[i])fb.push(2);else{fb.push(0);if(t[i]>=0)cnt[t[i]]++}}
    if(yellow!==false)for(i=0;i<N;i++)if(fb[i]===0&&g[i]>=0&&cnt[g[i]]>0){fb[i]=1;cnt[g[i]]--}
    return fb}
  function solved(fb){for(var i=0;i<fb.length;i++)if(fb[i]!==2)return false;return true}
  function points(len,attempts,streak){return 10*(len-3)+Math.max(0,6-attempts)*4+streak*3}

  if(typeof module!=='undefined'&&module.exports)module.exports={cfg:cfg,gen:gen,valid:valid,contour:contour,feedback:feedback,solved:solved,points:points};
  if(typeof window==='undefined'||!window.SG)return;

  /* ---------- 화면 배치 ---------- */
  var PX0=16,PX1=344,GX=44,GW=272,RY0=212,RDY=54,LAMP=463,BTN={x:100,y:498,w:160,h:50};
  var S,T=0,keys={space:false,listen:false,nav:false,kbtap:false};
  if(!window.__melodyLoopKeys){window.__melodyLoopKeys=keys;
    window.addEventListener('keydown',function(e){var k=window.__melodyLoopKeys;
      if(e.code==='Space'){k.kbtap=true;if(!e.repeat)k.space=true}
      else if(e.code==='KeyL'){if(!e.repeat)k.listen=true}
      else if(/^Arrow|^Key[WASD]$/.test(e.code)){k.nav=true;k.kbtap=true}});
  }else keys=window.__melodyLoopKeys;

  window.__melodyLoopDbg=function(){return S};
  function rowY(r){return RY0+(4-r)*RDY}
  function wireY(r,x){var u=(x-PX0)/(PX1-PX0),v=S?S.vib[r]:0;
    return rowY(r)-7+28*u*(1-u)+v*3.2*Math.sin(u*Math.PI*5)*Math.sin(T*70)}
  function colX(c){return GX+(c+.5)*GW/S.c.len}

  function tone(a,r,d){a.beep(FREQ[r],d,'triangle');a.beep(FREQ[r]*2,d*.7,'sine')}

  function newLevel(a,n){
    var c=cfg(n),t=gen(c,Math.random),g=[],i;
    for(i=0;i<c.len;i++)g.push(-1);
    if(c.prefill){var hole=1+Math.floor(Math.random()*(c.len-1));for(i=0;i<c.len;i++)if(i!==hole)g[i]=t[i]}
    S.c=c;S.target=t;S.ct=contour(t);S.grid=g;S.fb=[];
    var f0=c.prefill?feedback(t,g,true):null;
    for(i=0;i<c.len;i++)S.fb.push(f0&&g[i]>=0?f0[i]:-1);
    S.lastKey=g.join(',');S.attempts=0;S.phase='target';S.step=-1;S.acc=-.45;S.mode='play';S.wt=0;
    S.sing=[];S.hop=[];for(i=0;i<c.len;i++){S.sing.push(0);S.hop.push(0)}
    S.fly=null;S.bstep=-1;S.cur={c:Math.min(S.cur?S.cur.c:0,c.len-1),r:S.cur?S.cur.r:2};S.intro=1;
  }
  function init(a){
    a.tempo(1);
    S={time:55,level:0,streak:0,vib:[0,0,0,0,0],notes:[],queue:[],bsing:0,happy:0,flock:[],kb:false,cur:null,flash:0,listenP:0};
    keys.space=keys.listen=keys.nav=keys.kbtap=false;
    newLevel(a,0);
  }
  function addNote(x,y,c){S.notes.push({x:x,y:y,t:0,c:c,vx:(Math.random()-.5)*26})}

  function trigger(a,col){
    var d=S.c.step*1.5;S.bstep=col;
    if(S.phase==='target'){var v=S.target[col];if(v>=0){tone(a,v,d);S.bsing=.24;addNote(84,84,'#fff')}}
    else{var w=S.grid[col];if(w>=0){tone(a,w,d);S.vib[w]=1;S.sing[col]=.24;S.hop[col]=.24;addNote(colX(col)+8,wireY(w,colX(col))-26,COL[w])}}
  }
  function evaluate(a){
    var key=S.grid.join(',');if(key===S.lastKey)return;
    S.lastKey=key;S.attempts++;S.fb=feedback(S.target,S.grid,S.c.yellow);
    if(solved(S.fb)){win(a);return}
    var gr=0,i;for(i=0;i<S.fb.length;i++)if(S.fb[i]===2)gr++;
    S.flash=.5;a.sfx(gr?'tap':'hit');
    for(i=0;i<S.fb.length;i++)if(S.fb[i]>0)a.burst(colX(i),LAMP,S.fb[i]===2?'#7dffa6':'#ffe066',4);
  }
  function win(a){
    var N=S.c.len,i;S.mode='win';S.wt=0;
    S.streak=S.attempts<=3?S.streak+1:0;
    var pts=points(N,S.attempts,S.streak);a.add(pts);a.sfx('win');
    a.pop(W/2,150,'+'+pts,'#fff3a0');if(S.streak>1)a.pop(W/2,176,(a.lang==='ko'?'연속 ':'Streak ')+S.streak,'#ffb3d1');
    S.time=Math.min(70,S.time+15);S.happy=2;
    S.fly=[];for(i=0;i<N;i++){S.fly.push({d:.55+i*.07,x:0,y:0,on:S.grid[i]>=0});
      if(S.grid[i]>=0){a.burst(colX(i),rowY(S.grid[i])-14,COL[S.grid[i]],7);
        S.queue.push({t:i*.11,r:S.grid[i],o:1});S.queue.push({t:i*.11,r:(S.grid[i]+3)%5,o:.5})}}
    for(i=0;i<9;i++)S.flock.push({x:-20-Math.random()*120,y:300+Math.random()*130,v:150+Math.random()*70,p:Math.random()*6,s:.5+Math.random()*.4});
  }
  function toggle(a,c,r){
    S.grid[c]=S.grid[c]===r?-1:r;S.fb[c]=-1;S.intro=0;
    tone(a,r,.16);S.vib[r]=1;S.hop[c]=.2;
    if(S.grid[c]>=0){S.sing[c]=.2;a.burst(colX(c),wireY(r,colX(c))-12,COL[r],5)}
  }
  function listen(a){if(S.mode!=='play')return;S.phase='target';S.step=-1;S.acc=-.12;S.listenP=.2;a.sfx('tap')}

  function update(dt,inp,a){
    T+=dt;var i,N=S.c.len;
    for(i=0;i<5;i++)S.vib[i]*=Math.pow(.01,dt);
    for(i=0;i<N;i++){S.sing[i]=Math.max(0,S.sing[i]-dt);S.hop[i]=Math.max(0,S.hop[i]-dt)}
    S.bsing=Math.max(0,S.bsing-dt);S.happy=Math.max(0,S.happy-dt);S.flash=Math.max(0,S.flash-dt);S.listenP=Math.max(0,S.listenP-dt);
    for(i=S.notes.length-1;i>=0;i--){var o=S.notes[i];o.t+=dt;o.x+=o.vx*dt;o.y-=38*dt;if(o.t>.9)S.notes.splice(i,1)}
    for(i=S.queue.length-1;i>=0;i--){var q=S.queue[i];q.t-=dt;if(q.t<=0){a.beep(FREQ[q.r]*q.o,.3,'triangle');if(q.o===1)a.beep(FREQ[q.r]*2,.2,'sine');S.bsing=.2;S.queue.splice(i,1)}}
    for(i=S.flock.length-1;i>=0;i--){var f=S.flock[i];f.x+=f.v*dt;f.y-=f.v*.32*dt;f.p+=dt*16;if(f.x>W+40)S.flock.splice(i,1)}

    var ptap=inp.tap&&!keys.kbtap&&inp.x!=null;
    if(keys.nav)S.kb=true;if(ptap)S.kb=false;

    if(S.mode==='win'){
      S.wt+=dt;
      for(i=0;i<N;i++){var b=S.fly[i];if(S.wt>b.d){var k=S.wt-b.d;b.x+=(120+k*260)*dt;b.y-=(90+k*200)*dt}}
      if(S.wt>1.9){S.level++;newLevel(a,S.level)}
      keys.space=keys.listen=keys.nav=keys.kbtap=false;return;
    }
    S.time-=dt;if(S.time<=0){S.time=0;a.over();keys.space=keys.listen=keys.nav=keys.kbtap=false;return}

    /* 입력 */
    if(S.kb&&inp.swipe){var c=S.cur;
      if(inp.swipe==='left')c.c=(c.c+N-1)%N;else if(inp.swipe==='right')c.c=(c.c+1)%N;
      else if(inp.swipe==='up')c.r=Math.min(4,c.r+1);else c.r=Math.max(0,c.r-1);
      a.beep(FREQ[c.r]/2,.04,'sine')}
    if(keys.space){S.kb=true;toggle(a,S.cur.c,S.cur.r)}
    if(keys.listen)listen(a);
    if(ptap){
      if(inp.x>=BTN.x&&inp.x<=BTN.x+BTN.w&&inp.y>=BTN.y-4&&inp.y<=BTN.y+BTN.h+4)listen(a);
      else if(inp.x<110&&inp.y>40&&inp.y<140)listen(a);
      else if(inp.x>=GX&&inp.x<GX+GW&&inp.y>RY0-34&&inp.y<rowY(0)+30){
        var cc=Math.floor((inp.x-GX)/(GW/N)),best=0,bd=1e9;
        for(i=0;i<5;i++){var d=Math.abs(inp.y-wireY(i,colX(cc))+8);if(d<bd){bd=d;best=i}}
        S.cur.c=cc;S.cur.r=best;toggle(a,cc,best)}
    }
    keys.space=keys.listen=keys.nav=keys.kbtap=false;

    /* 스텝 시계 */
    S.acc+=dt;
    while(S.acc>=0&&(S.step<0||S.acc>=S.c.step)){
      if(S.step>=0)S.acc-=S.c.step;
      S.step++;
      if(S.step>=N){S.step=0;
        if(S.phase==='target')S.phase='mine';
        else{evaluate(a);if(S.mode!=='play')return}}
      trigger(a,S.step);
    }
  }

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function noteIcon(g,x,y,s,c){g.fillStyle=c;g.strokeStyle=c;g.lineWidth=1.6*s;g.beginPath();g.ellipse(x,y,4*s,3*s,-.4,0,7);g.fill();
    g.beginPath();g.moveTo(x+3.4*s,y-.5*s);g.lineTo(x+3.4*s,y-11*s);g.lineTo(x+8*s,y-8*s);g.stroke()}
  function cloud(g,x,y,s,al){g.globalAlpha=al;g.beginPath();g.arc(x,y,16*s,0,7);g.arc(x+18*s,y-8*s,20*s,0,7);g.arc(x+40*s,y,17*s,0,7);g.arc(x+20*s,y+5*s,18*s,0,7);g.fill();g.globalAlpha=1}
  /* 새: open 0..1 부리, wing>=0 이면 날갯짓 위상 */
  function bird(g,x,y,r,c,cd,open,blink,wing,happy){
    g.save();g.translate(x,y);
    g.fillStyle=cd;g.beginPath();g.moveTo(-r*.7,-r*.1);g.lineTo(-r*1.75,-r*.55);g.lineTo(-r*1.6,r*.25);g.closePath();g.fill();
    var gr=g.createRadialGradient(-r*.3,-r*.4,r*.1,0,0,r*1.1);gr.addColorStop(0,'#fff');gr.addColorStop(.25,c);gr.addColorStop(1,cd);
    g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(r*.15,r*.42,r*.55,r*.42,0,0,7);g.fill();
    g.fillStyle=cd;
    if(wing>=0){var wy=Math.sin(wing)*r*1.3;g.beginPath();g.moveTo(-r*.5,-r*.1);g.lineTo(r*.4,-r*.1);g.lineTo(-r*.5,-r*.2-wy);g.closePath();g.fill()}
    else{g.beginPath();g.ellipse(-r*.3,r*.1,r*.5,r*.33,.5,0,7);g.fill()}
    g.fillStyle='#ff9d2e';var op=open*r*.36;
    g.beginPath();g.moveTo(r*.78,-r*.2-op);g.lineTo(r*1.5,-r*.1-op*1.5);g.lineTo(r*.9,r*.06);g.closePath();g.fill();
    g.fillStyle='#e0761a';g.beginPath();g.moveTo(r*.8,r*.02);g.lineTo(r*1.4,r*.06+op*1.5);g.lineTo(r*.78,r*.22+op);g.closePath();g.fill();
    if(blink||happy){g.strokeStyle='#2a2140';g.lineWidth=Math.max(1.4,r*.13);g.lineCap='round';g.beginPath();
      if(happy)g.arc(r*.38,-r*.22,r*.2,Math.PI,0);else{g.moveTo(r*.2,-r*.28);g.lineTo(r*.58,-r*.28)}g.stroke()}
    else{g.fillStyle='#fff';g.beginPath();g.arc(r*.38,-r*.3,r*.27,0,7);g.fill();
      g.fillStyle='#2a2140';g.beginPath();g.arc(r*.45,-r*.3,r*.15,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(r*.5,-r*.36,r*.05,0,7);g.fill()}
    g.restore()}
  function arrow(g,x,y,k,s,c){g.strokeStyle=c;g.fillStyle=c;g.lineWidth=2.6;g.lineCap='round';g.lineJoin='round';
    if(k==='o'){g.beginPath();g.arc(x,y,4.5,0,7);g.fill();return}
    if(k==='r'){g.beginPath();g.moveTo(x-5,y);g.lineTo(x+5,y);g.stroke();g.globalAlpha*=.6;g.beginPath();g.arc(x,y-6,1.6,0,7);g.arc(x,y+6,1.6,0,7);g.fill();return}
    if(k==='?'){g.font='18px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('?',x,y+6);return}
    var dy=k==='u'?-1:k==='d'?1:0,x0=x-s,y0=y-dy*s*.8,x1=x+s,y1=y+dy*s*.8,an=Math.atan2(y1-y0,x1-x0);
    g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();
    g.beginPath();g.moveTo(x1+Math.cos(an)*3,y1+Math.sin(an)*3);g.lineTo(x1-Math.cos(an-.6)*7,y1-Math.sin(an-.6)*7);g.lineTo(x1-Math.cos(an+.6)*7,y1-Math.sin(an+.6)*7);g.closePath();g.fill()}

  function draw(g,a){
    var i,r,x,y,N=S.c.len,cw=GW/N,ko=a.lang==='ko',prog=1-Math.max(0,Math.min(1,S.time/70));
    /* 하늘 */
    var sky=g.createLinearGradient(0,0,0,500);sky.addColorStop(0,'#27245a');sky.addColorStop(.42,'#7a3f86');sky.addColorStop(.72,'#e8697a');sky.addColorStop(1,'#ffc078');
    g.fillStyle=sky;g.fillRect(0,0,W,H);
    for(i=0;i<16;i++){g.globalAlpha=(.25+.25*Math.sin(T*1.5+i*2.1))*(1-i/22);g.fillStyle='#fff';g.fillRect((i*83+17)%W,34+(i*47)%150,1.6,1.6)}g.globalAlpha=1;
    /* 해 */
    var sx=258,sy=392+prog*80,sg=g.createRadialGradient(sx,sy,6,sx,sy,120);sg.addColorStop(0,'rgba(255,236,170,.75)');sg.addColorStop(1,'rgba(255,200,120,0)');
    g.fillStyle=sg;g.fillRect(sx-120,sy-120,240,240);
    g.fillStyle='#ffe9a6';g.beginPath();g.arc(sx,sy,34,0,7);g.fill();g.fillStyle='#fff6d6';g.beginPath();g.arc(sx-6,sy-8,22,0,7);g.fill();
    /* 구름 2겹 */
    g.fillStyle='#ffb7c3';for(i=0;i<3;i++)cloud(g,((i*170+T*5)%(W+140))-100,150+i*62,1.1,.2);
    g.fillStyle='#ffe3d1';for(i=0;i<3;i++)cloud(g,((i*190+60+T*11)%(W+120))-90,188+i*74,.7,.26);
    /* 날아가는 무리 */
    for(i=0;i<S.flock.length;i++){var f=S.flock[i];bird(g,f.x,f.y,9*f.s+3,'#4a3466','#2c1f47',0,false,f.p,false)}
    /* 언덕 */
    g.fillStyle='#4a2a5e';g.beginPath();g.moveTo(0,490);for(x=0;x<=W;x+=20)g.lineTo(x,478+Math.sin(x*.021+1)*9+Math.sin(x*.05)*4);g.lineTo(W,H);g.lineTo(0,H);g.fill();
    var gg=g.createLinearGradient(0,486,0,H);gg.addColorStop(0,'#33204d');gg.addColorStop(1,'#1b1433');g.fillStyle=gg;
    g.beginPath();g.moveTo(0,H);g.lineTo(0,496);for(x=0;x<=W;x+=20)g.lineTo(x,492+Math.sin(x*.03+T*.0+4)*6);g.lineTo(W,H);g.fill();

    /* 재생 칸 강조 */
    var mine=S.phase==='mine'&&S.mode==='play',fr=S.step<0?0:Math.max(0,Math.min(1,S.acc/S.c.step));
    if(S.mode==='play'&&S.step>=0){
      x=GX+S.step*cw;var pg=g.createLinearGradient(0,RY0-40,0,rowY(0)+26);
      pg.addColorStop(0,'rgba(255,255,255,0)');pg.addColorStop(.5,mine?'rgba(255,255,255,.2)':'rgba(255,255,255,.07)');pg.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=pg;rr(g,x+2,RY0-40,cw-4,rowY(0)-RY0+66,10);g.fill();
      g.strokeStyle=mine?'rgba(255,255,255,.75)':'rgba(255,255,255,.3)';g.lineWidth=2;g.beginPath();var hx=x+fr*cw;g.moveTo(hx,RY0-38);g.lineTo(hx,rowY(0)+24);g.stroke()}
    /* 전봇대 */
    for(i=0;i<2;i++){x=i?PX1:PX0;g.fillStyle='rgba(20,12,36,.35)';g.fillRect(x-1,RY0-34,9,300);
      var pgd=g.createLinearGradient(x-4,0,x+4,0);pgd.addColorStop(0,'#6b4a3a');pgd.addColorStop(1,'#3a2630');g.fillStyle=pgd;g.fillRect(x-4,RY0-36,8,304);
      for(r=0;r<5;r++){g.fillStyle='#3a2630';g.fillRect(x-9,rowY(r)-9,18,4);g.fillStyle=COL[r];g.beginPath();g.arc(x,rowY(r)-8,3.4,0,7);g.fill()}}
    /* 전깃줄 */
    for(r=0;r<5;r++){
      g.strokeStyle='rgba(20,12,36,.3)';g.lineWidth=4.5;g.beginPath();for(x=PX0;x<=PX1;x+=8)g.lineTo(x,wireY(r,x)+2);g.stroke();
      g.strokeStyle=COL[r];g.globalAlpha=.55+.45*Math.min(1,S.vib[r]*2);g.lineWidth=2.6;g.beginPath();for(x=PX0;x<=PX1;x+=8)g.lineTo(x,wireY(r,x));g.stroke();g.globalAlpha=1;
      for(i=0;i<N;i++)if(S.grid[i]!==r){x=colX(i);g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.arc(x,wireY(r,x),3.2,0,7);g.fill()}}
    /* 피드백 램프 */
    for(i=0;i<N;i++){x=colX(i);var fb=S.fb[i],pulse=S.flash>0?1+S.flash*.5:1;
      g.fillStyle='rgba(20,12,36,.45)';g.beginPath();g.arc(x,LAMP+1,11,0,7);g.fill();
      if(fb===2){g.fillStyle='#4be38a';g.shadowColor='#4be38a';g.shadowBlur=12;g.beginPath();g.arc(x,LAMP,9*pulse,0,7);g.fill();g.shadowBlur=0;
        g.strokeStyle='#0d4a2a';g.lineWidth=2.4;g.lineCap='round';g.beginPath();g.moveTo(x-4,LAMP);g.lineTo(x-1,LAMP+3.5);g.lineTo(x+4.5,LAMP-3.5);g.stroke()}
      else if(fb===1){g.fillStyle='#ffd43b';g.shadowColor='#ffd43b';g.shadowBlur=12;g.beginPath();g.arc(x,LAMP,9*pulse,0,7);g.fill();g.shadowBlur=0;
        g.strokeStyle='#6b4a00';g.lineWidth=2;g.lineCap='round';g.beginPath();g.moveTo(x-5,LAMP);g.lineTo(x+5,LAMP);g.moveTo(x-2.5,LAMP-2.5);g.lineTo(x-5,LAMP);g.lineTo(x-2.5,LAMP+2.5);g.moveTo(x+2.5,LAMP-2.5);g.lineTo(x+5,LAMP);g.lineTo(x+2.5,LAMP+2.5);g.stroke()}
      else if(fb===0){g.fillStyle='#6a5a80';g.beginPath();g.arc(x,LAMP,6,0,7);g.fill()}
      else{g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1.5;g.beginPath();g.arc(x,LAMP,6,0,7);g.stroke()}}
    /* 키보드 커서 */
    if(S.kb&&S.mode==='play'){x=colX(S.cur.c);y=wireY(S.cur.r,x)-8;g.strokeStyle='#fff';g.lineWidth=2;g.setLineDash([5,4]);g.lineDashOffset=-T*14;
      rr(g,x-Math.min(cw/2-2,19),y-19,Math.min(cw-4,38),38,9);g.stroke();g.setLineDash([])}
    /* 음표새 */
    var br=N>=8?11:N>=7?12:13;
    for(i=0;i<N;i++){r=S.grid[i];if(r<0)continue;if(S.fly&&!S.fly[i].on)continue;
      x=colX(i);y=wireY(r,x)-br+1;var flying=S.mode==='win'&&S.fly&&S.wt>S.fly[i].d;
      if(flying){x+=S.fly[i].x;y+=S.fly[i].y}else y-=Math.sin(Math.min(1,S.hop[i]/.24)*Math.PI)*8;
      var fb2=S.fb[i];
      if(!flying&&fb2>0){g.strokeStyle=fb2===2?'#4be38a':'#ffd43b';g.lineWidth=3;g.shadowColor=g.strokeStyle;g.shadowBlur=10;g.beginPath();g.arc(x,y,br+4,0,7);g.stroke();g.shadowBlur=0}
      if(!flying){g.strokeStyle='#ff9d2e';g.lineWidth=1.6;g.beginPath();g.moveTo(x-3,y+br-2);g.lineTo(x-3,y+br+2);g.moveTo(x+3,y+br-2);g.lineTo(x+3,y+br+2);g.stroke()}
      g.globalAlpha=mine||S.mode==='win'?1:.72;
      bird(g,x,y,br,COL[r],COLD[r],S.sing[i]>0?1:0,((T*.9+i*.37)%3.1)<.12,flying?T*22+i:-1,S.mode==='win');g.globalAlpha=1}
    /* 떠오르는 음표 */
    for(i=0;i<S.notes.length;i++){var o=S.notes[i];g.globalAlpha=1-o.t/.9;noteIcon(g,o.x,o.y,1,o.c);g.globalAlpha=1}

    /* 노래새 + 가지 */
    g.strokeStyle='#3a2630';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(-4,128);g.quadraticCurveTo(50,126,104,112);g.stroke();
    g.lineWidth=3;g.beginPath();g.moveTo(84,117);g.lineTo(100,100);g.stroke();
    g.fillStyle='#5fbf7a';g.beginPath();g.ellipse(103,97,8,4,-.8,0,7);g.fill();g.beginPath();g.ellipse(20,119,9,4,.3,0,7);g.fill();
    var gone=S.mode==='win'&&S.wt>.5,bx=50,by=101-(S.bsing>0?5*Math.sin(S.bsing/.24*Math.PI):0);
    if(gone){bx+=(S.wt-.5)*190;by-=(S.wt-.5)*130}
    else{g.strokeStyle='#ff9d2e';g.lineWidth=2;g.beginPath();g.moveTo(45,118);g.lineTo(45,124);g.moveTo(55,118);g.lineTo(55,124);g.stroke()}
    g.fillStyle='#ff7fa8';g.beginPath();g.moveTo(bx-4,by-19);g.lineTo(bx-10,by-33);g.lineTo(bx+2,by-24);g.lineTo(bx+4,by-36);g.lineTo(bx+9,by-18);g.closePath();g.fill();
    bird(g,bx,by,20,'#fff0f5','#f08db0',S.bsing>0?1:0,(T%3.7)<.13,gone?T*22:-1,S.happy>0);
    /* 말풍선 */
    var BX=110,BY=56,BW=238,BH=64;
    g.fillStyle='rgba(20,12,36,.25)';rr(g,BX+2,BY+4,BW,BH,16);g.fill();
    g.fillStyle='rgba(255,252,245,.95)';rr(g,BX,BY,BW,BH,16);g.fill();
    g.beginPath();g.moveTo(BX+2,BY+34);g.lineTo(BX-14,BY+42);g.lineTo(BX+2,BY+48);g.fill();
    var sw=(BW-20)/N,tp=S.phase==='target'&&S.mode==='play';
    for(i=0;i<N;i++){x=BX+10+(i+.5)*sw;var on=tp&&S.bstep===i;
      if(on){g.fillStyle='#ffd9e6';rr(g,x-sw/2+1,BY+6,sw-2,BH-12,9);g.fill()}
      g.globalAlpha=1;arrow(g,x,BY+BH/2,S.c.contour?S.ct[i]:'?',Math.min(9,sw*.3),on?'#d6336c':'#4a3466');g.globalAlpha=1}
    /* 안내 문구 */
    g.textAlign='center';g.font='16px Jua, system-ui, sans-serif';
    var msg=S.level===0?(ko?'새의 노래를 따라 놓아요':'Rebuild the bird\'s song'):
      !S.c.contour?(ko?'귀로 맞혀요! 윤곽 힌트 없음':'By ear! No contour clue'):!S.c.yellow?(ko?'노랑 힌트 없음':'No yellow hints'):
      (ko?S.level+1+'번째 노래 · '+N+'박':'Song '+(S.level+1)+' · '+N+' beats');
    g.fillStyle='rgba(20,12,36,.5)';g.fillText(msg,W/2+1,152);g.fillStyle='#fff';g.fillText(msg,W/2,151);

    /* 시간 막대 */
    g.fillStyle='rgba(20,12,36,.45)';rr(g,20,34,320,9,4.5);g.fill();
    var tw=316*Math.max(0,S.time)/70;if(tw>2){g.fillStyle=S.time<10?(Math.sin(T*10)>0?'#ff6f6f':'#ffb3b3'):'#ffd97a';rr(g,22,36,tw,5,2.5);g.fill()}

    /* 듣기 버튼 */
    var bp=S.listenP>0?2:0,act=tp;
    g.fillStyle='rgba(10,6,24,.5)';rr(g,BTN.x,BTN.y+5,BTN.w,BTN.h,18);g.fill();
    var bg=g.createLinearGradient(0,BTN.y,0,BTN.y+BTN.h);bg.addColorStop(0,act?'#ffe38a':'#ff9fc0');bg.addColorStop(1,act?'#ffb84d':'#e8608f');
    g.fillStyle=bg;rr(g,BTN.x,BTN.y+bp,BTN.w,BTN.h,18);g.fill();
    g.fillStyle='rgba(255,255,255,.3)';rr(g,BTN.x+6,BTN.y+bp+4,BTN.w-12,14,9);g.fill();
    noteIcon(g,BTN.x+24,BTN.y+bp+33,1.3,'#3a1f47');
    g.fillStyle='#3a1f47';g.font='18px Jua, system-ui, sans-serif';g.textAlign='center';
    g.fillText(act?(ko?'새가 노래 중…':'Bird singing…'):(ko?'새 노래 듣기':'Hear the bird'),BTN.x+BTN.w/2+16,BTN.y+bp+32);
    g.font='13px Jua, system-ui, sans-serif';g.fillStyle='rgba(255,255,255,.75)';
    g.fillText((ko?'시도 ':'Tries ')+S.attempts,52,BTN.y+30);
    if(S.streak>1)g.fillText((ko?'연속 ':'Streak ')+S.streak,W-52,BTN.y+30);
    g.fillStyle='rgba(255,255,255,.6)';
    g.fillText(ko?'초록 = 정답 · 노랑 = 음은 맞고 자리가 달라요':'Green = right · Yellow = right note, wrong beat',W/2,580);
    g.fillText(ko?'방향키 이동 · 스페이스 놓기 · L 듣기':'Arrows move · Space place · L listen',W/2-10,602);
  }

  SG.run({id:'melody-loop',title:{ko:'멜로디 루프',en:'Melody Loop'},
    how:{ko:'전깃줄을 눌러 음표새를 앉혀, 노래새의 노래를 똑같이 만들어요. 화살표는 가락의 모양, 초록·노랑 불은 힌트!',
         en:'Tap the wires to seat note birds and rebuild the songbird\'s tune. Arrows show its shape; green and yellow lamps are your clues!'},
    init:init,update:update,draw:draw});
})();
