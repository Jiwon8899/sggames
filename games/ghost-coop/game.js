/* 고스트 협동 — 과거의 나와 함께 푸는 되감기 퍼즐 */
(function(){
  /* ================= 시뮬레이션 (DOM 없이도 돌아간다) ================= */
  var Sim=(function(){
    var T=40,COLS=9,ROWS=12,OY=96,R=12,SPD=150,DT=1/60;
    /* # 벽 · 바닥 C 시작 F 생선 | a-d 발판 → A-D 문 | W-Z 레이저(a-d를 밟으면 켜짐) | p,q 토글 → P,Q 문 */
    var LEVELS=[
      {par:1,max:2,hint:{ko:'생선까지 걸어가요',en:'Walk to the fish'},map:[
        '#########','#.......#','#...F...#','#.......#','#.##.##.#','#.......#','#.......#','#.##.##.#','#.......#','#...C...#','#.......#','#########']},
      {par:2,max:4,hint:{ko:'발판에 서서 되감기! 과거의 내가 문을 열어줘요',en:'Stand on the plate, rewind: your past self holds the door'},map:[
        '#########','#...F...#','#.......#','#.......#','####A####','#.......#','#.......#','#.a.....#','#.......#','#...C...#','#.......#','#########']},
      {par:3,max:4,hint:{ko:'과거의 나, 그 전의 나… 차례로 도와줘요',en:'Past you, and the you before that, both help'},map:[
        '#########','#...F...#','#.......#','####B####','#.......#','#.....b.#','#.......#','####A####','#.......#','#.a...C.#','#.......#','#########']},
      {par:3,max:4,hint:{ko:'한 마리가 발판 두 개를 차례로 밟으면 더 빨라요',en:'One ghost can press both plates, one after another'},map:[
        '#########','#...F...#','#.......#','####B####','#.......#','#.......#','####A####','#.......#','#.a...b.#','#.......#','#...C...#','#########']},
      {par:3,max:4,hint:{ko:'문 두 개가 붙어 있어요. 동시에 열어야 해요',en:'Two doors back to back: hold both at once'},map:[
        '#########','#...F...#','#.......#','####B####','####A####','#.......#','#.......#','#a.....b#','#.......#','#...C...#','#.......#','#########']},
      {par:2,max:4,hint:{ko:'발판을 밟으면 레이저도 켜져요. 밟았다가 내려와요',en:'The plate also arms the laser: step on, then step off'},map:[
        '#########','#...F...#','#.......#','####W####','#.......#','#.......#','####A####','#.......#','#.a.....#','#.......#','#...C...#','#########']},
      {par:2,max:4,hint:{ko:'초록 스위치는 밟을 때마다 바뀌어요',en:'The green switch flips every time it is stepped on'},map:[
        '#########','#...F...#','#.......#','####P####','####A####','#.......#','#.....a.#','#.......#','###p#####','#.......#','#...C...#','#########']},
      {par:3,max:4,hint:{ko:'빨간 발판 위에 있으면 청소기가 잠들어요',en:'The vacuum sleeps while someone is on the red plate'},
        haz:[{c1:1,r1:4,c2:6,r2:4,ch:'a',spd:120}],map:[
        '#########','#..F....#','#.......#','#B#######','#......b#','#######.#','#.......#','#.a.....#','#.......#','#...C...#','#.......#','#########']}
    ];
    function cx(c){return c*T+T/2} function cy(r){return OY+r*T+T/2}
    function parse(L){if(L.p)return L.p;var p={wall:[],doors:[],pads:[],doorAt:{},start:null,fish:null};
      for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){var ch=L.map[r].charAt(c),i=r*COLS+c,k;
        if(ch==='#')p.wall[i]=1;else if(ch==='C')p.start={x:cx(c),y:cy(r)};else if(ch==='F')p.fish={x:cx(c),y:cy(r)};
        else if('abcd'.indexOf(ch)>=0)p.pads.push({c:c,r:r,x:cx(c),y:cy(r),ch:ch,tog:false});
        else if('pq'.indexOf(ch)>=0)p.pads.push({c:c,r:r,x:cx(c),y:cy(r),ch:ch,tog:true});
        else if('ABCDPQ'.indexOf(ch)>=0){p.doorAt[i]=p.doors.length;p.doors.push({c:c,r:r,ch:ch.toLowerCase(),inv:false})}
        else if((k='WXYZ'.indexOf(ch))>=0){p.doorAt[i]=p.doors.length;p.doors.push({c:c,r:r,ch:'abcd'.charAt(k),inv:true})}}
      p.haz=(L.haz||[]).map(function(h){var x1=cx(h.c1),y1=cy(h.r1),x2=cx(h.c2),y2=cy(h.r2);
        return{x1:x1,y1:y1,x2:x2,y2:y2,len:Math.hypot(x2-x1,y2-y1),ch:h.ch,spd:h.spd}});
      L.p=p;return p}
    function newState(li,loopSec){var L=LEVELS[li],p=parse(L);
      var S={li:li,L:L,p:p,loopTicks:Math.round(loopSec*60),ghosts:[],cat:{x:0,y:0}};resetLoop(S);return S}
    function resetLoop(S){S.tick=0;S.cat.x=S.p.start.x;S.cat.y=S.p.start.y;S.rec={x:[S.cat.x],y:[S.cat.y]};S.won=false;
      S.tog={};S.act={};S.padOn=S.p.pads.map(function(){return false});S.dopen=S.p.doors.map(function(d){return d.inv});
      S.haz=S.p.haz.map(function(h){return{x:h.x1,y:h.y1,ph:0,off:false}})}
    function gpos(g,t){var i=Math.min(t,g.x.length-1);return{x:g.x[i],y:g.y[i]}}
    function solid(S,c,r){if(c<0||r<0||c>=COLS||r>=ROWS)return true;var i=r*COLS+c;if(S.p.wall[i])return true;
      var d=S.p.doorAt[i];return d!==undefined&&!S.dopen[d]}
    function collide(S,p){var c0=Math.floor(p.x/T),r0=Math.floor((p.y-OY)/T);
      for(var it=0;it<2;it++)for(var r=r0-1;r<=r0+1;r++)for(var c=c0-1;c<=c0+1;c++){if(!solid(S,c,r))continue;
        var x0=c*T,y0=OY+r*T,nx=Math.max(x0,Math.min(x0+T,p.x)),ny=Math.max(y0,Math.min(y0+T,p.y)),dx=p.x-nx,dy=p.y-ny;
        if(dx===0&&dy===0){var l=p.x-x0,rr=x0+T-p.x,u=p.y-y0,d=y0+T-p.y,m=Math.min(l,rr,u,d);
          if(m===d)p.y=y0+T+R;else if(m===u)p.y=y0-R;else if(m===l)p.x=x0-R;else p.x=x0+T+R}
        else{var q=dx*dx+dy*dy;if(q<R*R){q=Math.sqrt(q);p.x=nx+dx/q*R;p.y=ny+dy/q*R}}}}
    function on(pad,x,y){return Math.abs(x-pad.x)<16&&Math.abs(y-pad.y)<16}
    function channels(S,ev){var pads=S.p.pads,act={},i,j;
      for(i=0;i<pads.length;i++){var pd=pads[i],o=on(pd,S.cat.x,S.cat.y);
        for(j=0;j<S.ghosts.length&&!o;j++){var gp=gpos(S.ghosts[j],S.tick);o=on(pd,gp.x,gp.y)}
        if(o!==S.padOn[i]){if(pd.tog&&o)S.tog[pd.ch]=!S.tog[pd.ch];S.padOn[i]=o;if(ev)ev.push({t:'pad',i:i,on:o})}
        if(pd.tog)act[pd.ch]=!!S.tog[pd.ch];else if(o)act[pd.ch]=true}
      S.act=act;
      for(i=0;i<S.p.doors.length;i++){var d=S.p.doors[i],op=(!!act[d.ch])!==d.inv;
        if(op!==S.dopen[i]){S.dopen[i]=op;if(ev)ev.push({t:'door',i:i,open:op})}}}
    /* 한 틱 전진. dx,dy는 길이 1 이하의 입력 벡터 */
    function step(S,dx,dy){var ev=[],m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}
      S.tick++;
      S.cat.x+=dx*SPD*DT;collide(S,S.cat);S.cat.y+=dy*SPD*DT;collide(S,S.cat);
      channels(S,ev);collide(S,S.cat);
      S.rec.x.push(S.cat.x);S.rec.y.push(S.cat.y);
      for(var i=0;i<S.haz.length;i++){var h=S.haz[i],d=S.p.haz[i];h.off=!!S.act[d.ch];
        if(!h.off){h.ph+=d.spd*DT;var u=h.ph%(2*d.len),k=(u<d.len?u:2*d.len-u)/d.len;h.x=d.x1+(d.x2-d.x1)*k;h.y=d.y1+(d.y2-d.y1)*k;
          if(Math.hypot(h.x-S.cat.x,h.y-S.cat.y)<22){ev.push({t:'zap'});return ev}}}
      if(Math.hypot(S.cat.x-S.p.fish.x,S.cat.y-S.p.fish.y)<18){S.won=true;ev.push({t:'win'});return ev}
      if(S.tick>=S.loopTicks)ev.push({t:'end'});
      return ev}
    /* 지금 기록을 유령으로 남기고 루프를 처음으로. 루프를 다 쓰면 'out' */
    function rewind(S,discard){var out=false;
      if(!discard){S.ghosts.push(S.rec);if(S.ghosts.length>=S.L.max){S.ghosts=[];out=true}}
      resetLoop(S);channels(S,null);return out}
    return{T:T,COLS:COLS,ROWS:ROWS,OY:OY,R:R,LEVELS:LEVELS,newState:newState,step:step,rewind:rewind,gpos:gpos,cx:cx,cy:cy}
  })();
  if(typeof module!=='undefined'&&module.exports){module.exports=Sim;return}

  /* ================= 게임 ================= */
  var T=Sim.T,OY=Sim.OY,FONT='Jua, system-ui, sans-serif';
  var GC=['#6fe3ff','#ff8ad8','#ffe066','#9dff8a'];
  var CC={a:'#ff6b5e',b:'#4db8ff',c:'#ffd24d',d:'#b98cff',p:'#5fe08a',q:'#ff9de0'};
  var BTN={x:10,y:588,w:150,h:44},TMAX=80;
  var S,cleared,gtime,acc,mode,mt,time,wantRew,joy,prevDown,started,face,sq,moving,motes,doorO,padD,rew,clr,used,flash,tickT,dead,msg;
  var K={};
  if(!window.__ghostCoopKeys){window.__ghostCoopKeys=true;
    window.addEventListener('keydown',function(e){K[e.code]=true;if(e.code==='Space'&&!e.repeat)wantRew=true});
    window.addEventListener('keyup',function(e){K[e.code]=false});
    window.addEventListener('blur',function(){K={}})}
  function loopSec(){return Math.max(5,8-Math.floor(cleared/8))}
  function load(){S=Sim.newState(cleared%8,loopSec());doorO=S.p.doors.map(function(d){return d.inv?1:0});padD=S.p.pads.map(function(){return 0});
    started=false;acc=0;mode='play';face={x:0,y:1};sq=0;moving=false}
  function tx(a,ko,en){return a.lang==='ko'?ko:en}
  function beginRewind(a,kind){/* kind: 'loop' | 'zap' */
    var paths=S.ghosts.map(function(g,i){return{g:g,col:GC[i%4],num:i+1}});
    paths.push({g:S.rec,col:null,num:0});
    rew={paths:paths,from:S.tick,kind:kind};mode='rew';mt=0;tickT=0;
    var out=Sim.rewind(S,kind==='zap');
    if(out){gtime-=5;msg={s:tx(a,'루프를 다 썼어요! -5초','Out of loops! -5s'),t:1.6};a.sfx('hit');a.shake(8);flash=.5}
    started=false;acc=0}
  function win(a){var n=S.ghosts.length+1,L=S.L,pts=10,under=L.par-n;
    if(under>=0)pts+=5+under*10;pts+=Math.floor(Math.max(0,gtime)/10);
    a.add(pts);a.sfx('win');a.shake(5);
    a.burst(S.p.fish.x,S.p.fish.y,'#8fd3ff',22);a.burst(S.p.fish.x,S.p.fish.y,'#fff36b',16);
    a.pop(S.p.fish.x,S.p.fish.y-26,'+'+pts,'#fff36b');
    var cyc=Math.floor(cleared/8),add=Math.max(8,12+4*L.par-4*cyc);gtime=Math.min(TMAX,gtime+add);
    clr={t:0,n:n,under:under,add:add};mode='clear';mt=0}

  SG.run({
    id:'ghost-coop',
    title:{ko:'고스트 협동',en:'Ghost Co-op'},
    how:{ko:'발판에 서서 되감으면 과거의 내가 문을 열어줘요. 생선까지 가세요!',en:'Stand on a plate and rewind: your past self holds the door. Reach the fish!'},
    init:function(a){cleared=0;gtime=45;time=0;wantRew=false;joy=null;prevDown=false;K={};flash=0;dead=false;msg=null;rew=null;clr=null;
      motes=[];for(var i=0;i<16;i++)motes.push({x:Math.random()*a.W,y:OY+Math.random()*480,v:4+Math.random()*9,p:Math.random()*6,r:.8+Math.random()*1.6});
      load()},
    update:function(dt,inp,a){
      time+=dt;if(msg){msg.t-=dt;if(msg.t<=0)msg=null}flash=Math.max(0,flash-dt);sq=Math.max(0,sq-dt*5);
      /* 입력 */
      var dn=inp.down&&inp.x!=null,ix=0,iy=0;
      if(dn&&!prevDown){if(inp.x>=BTN.x&&inp.x<=BTN.x+BTN.w&&inp.y>=BTN.y-6&&inp.y<=BTN.y+BTN.h+6){wantRew=true;joy=null}else joy={x:inp.x,y:inp.y}}
      if(!dn)joy=null;prevDown=dn;
      if(joy){var jx=inp.x-joy.x,jy=inp.y-joy.y,jl=Math.hypot(jx,jy);if(jl>6){var s=Math.min(1,jl/26);ix=jx/jl*s;iy=jy/jl*s}}
      if(K.ArrowLeft||K.KeyA||inp.left)ix-=1;if(K.ArrowRight||K.KeyD||inp.right)ix+=1;
      if(K.ArrowUp||K.KeyW)iy-=1;if(K.ArrowDown||K.KeyS||inp.dn)iy+=1;
      var il=Math.hypot(ix,iy);if(il>1){ix/=il;iy/=il;il=1}
      if(mode==='clear'){mt+=dt;clr.t=mt;wantRew=false;
        if(mt>1.7){cleared++;load();if(cleared%8===0)msg={s:tx(a,'한 바퀴 완주! 루프가 짧아져요','Lap done! Loops get shorter'),t:2}}
        anim(dt);return}
      gtime-=dt;a.tempo(gtime<10?1.35:1);
      if(gtime<=0){gtime=0;dead=true;a.over();return}
      if(mode==='rew'){mt+=dt;tickT-=dt;wantRew=false;
        if(tickT<=0){tickT=.035;a.beep(260+1300*Math.min(1,mt/.5),.05,'sawtooth')}
        if(mt>=.5){mode='play';rew=null;a.beep(1500,.05,'square')}
        anim(dt);return}
      /* 플레이 */
      if(il>.05){if(!moving){sq=1;moving=true}face.x=ix/il;face.y=iy/il;started=true}else moving=false;
      if(wantRew){wantRew=false;if(started||S.ghosts.length){a.sfx('tap');beginRewind(a,'loop');anim(dt);return}}
      if(started){acc+=dt;var guard=0;
        while(acc>=1/60&&guard++<4){acc-=1/60;var ev=Sim.step(S,ix,iy),stop=false;
          for(var i=0;i<ev.length;i++){var e=ev[i];
            if(e.t==='pad'){a.beep(e.on?1250:800,.03,'square');if(e.on){var pd=S.p.pads[e.i];a.burst(pd.x,pd.y,CC[pd.ch],5)}}
            else if(e.t==='door'){if(e.open){a.beep(520,.07,'triangle');a.beep(784,.12,'triangle')}else a.beep(210,.12,'sawtooth')}
            else if(e.t==='zap'){a.sfx('hit');a.shake(9);a.burst(S.cat.x,S.cat.y,'#ff5a5a',16);msg={s:tx(a,'청소기에 걸렸어요!','Caught by the vacuum!'),t:1.3};beginRewind(a,'zap');stop=true}
            else if(e.t==='win'){win(a);stop=true}
            else if(e.t==='end'){a.sfx('jump');beginRewind(a,'loop');stop=true}}
          if(stop)break}
        if(mode==='play'){var left=(S.loopTicks-S.tick)/60;if(left<2.05){tickT-=dt;if(tickT<=0){tickT=.5;a.beep(990,.04,'square')}}else tickT=0}}
      anim(dt)
    },
    draw:function(g,a){
      var W=a.W,H=a.H,i,r,c,p=S.p,ko=a.lang==='ko';
      /* 배경 */
      var bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1b1d36');bg.addColorStop(1,'#12132a');g.fillStyle=bg;g.fillRect(-20,-20,W+40,H+40);
      /* 바닥 */
      for(r=0;r<12;r++)for(c=0;c<9;c++){if(p.wall[r*9+c])continue;var x=c*T,y=OY+r*T;
        g.fillStyle=(r+c)%2?'#e9c79a':'#f3d6ad';g.fillRect(x,y,T,T);
        g.fillStyle='rgba(120,70,30,.10)';g.fillRect(x,y+T-2,T,2);g.fillRect(x+T-2,y,2,T);
        g.fillStyle='rgba(255,255,255,.16)';g.fillRect(x,y,T,2)}
      var fl=g.createLinearGradient(0,OY,0,OY+480);fl.addColorStop(0,'rgba(255,240,200,.18)');fl.addColorStop(1,'rgba(90,50,110,.22)');g.fillStyle=fl;g.fillRect(0,OY,W,480);
      /* 발판과 문을 잇는 전선 */
      g.lineWidth=3;g.setLineDash([2,7]);g.lineCap='round';
      for(i=0;i<p.pads.length;i++)for(var w=0;w<p.doors.length;w++){if(p.doors[w].ch!==p.pads[i].ch)continue;
        var wx=Sim.cx(p.doors[w].c),wy=Sim.cy(p.doors[w].r);g.globalAlpha=S.act[p.pads[i].ch]?.75:.3;g.strokeStyle=CC[p.pads[i].ch];g.lineDashOffset=-time*14;
        g.beginPath();g.moveTo(p.pads[i].x,p.pads[i].y);g.lineTo(p.pads[i].x,wy+(p.pads[i].y>wy?26:-26));g.lineTo(wx,wy+(p.pads[i].y>wy?26:-26));g.stroke()}
      g.setLineDash([]);g.lineDashOffset=0;g.globalAlpha=1;
      /* 발판 */
      for(i=0;i<p.pads.length;i++){var pd=p.pads[i],d=padD[i],col=CC[pd.ch],lit=pd.tog?!!S.act[pd.ch]:d>.5;
        g.fillStyle='rgba(0,0,0,.22)';rr(g,pd.x-16,pd.y-14,32,32,8);g.fill();
        g.fillStyle=shade(col,-.35);rr(g,pd.x-16,pd.y-16,32,32,8);g.fill();
        var off=3-3*d;g.fillStyle=col;rr(g,pd.x-14,pd.y-14-off,28,28,7);g.fill();
        g.fillStyle='rgba(255,255,255,'+(lit?.75:.3)+')';
        if(pd.tog){g.beginPath();g.arc(pd.x,pd.y-off,7,0,7);g.fill();g.fillStyle=lit?'#1c7a3c':'#35553f';g.fillRect(pd.x-1.5,pd.y-off-9,3,9)}
        else{g.beginPath();g.moveTo(pd.x,pd.y-8-off);g.lineTo(pd.x+7,pd.y+5-off);g.lineTo(pd.x-7,pd.y+5-off);g.fill()}
        if(lit){g.globalAlpha=.35+.15*Math.sin(time*9);g.strokeStyle=col;g.lineWidth=3;rr(g,pd.x-19,pd.y-19,38,38,10);g.stroke();g.globalAlpha=1}}
      /* 생선 */
      var fx=p.fish.x,fy=p.fish.y+Math.sin(time*3)*3;
      g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(fx,p.fish.y+14,13,4,0,0,7);g.fill();
      if(!(mode==='clear'&&mt>.15)){g.save();g.translate(fx,fy);g.rotate(Math.sin(time*2)*.15);g.shadowColor='#bfe8ff';g.shadowBlur=14+6*Math.sin(time*4);
        g.fillStyle='#3d8fd6';g.beginPath();g.moveTo(-9,0);g.lineTo(-19,-8);g.lineTo(-19,8);g.fill();
        var fg=g.createLinearGradient(0,-8,0,8);fg.addColorStop(0,'#8fd0ff');fg.addColorStop(1,'#3d8fd6');g.fillStyle=fg;g.beginPath();g.ellipse(0,0,13,8,0,0,7);g.fill();g.shadowBlur=0;
        g.fillStyle='#fff';g.beginPath();g.arc(6,-2,2.6,0,7);g.fill();g.fillStyle='#123';g.beginPath();g.arc(6.6,-2,1.2,0,7);g.fill();g.restore()}
      /* 벽 */
      for(r=0;r<12;r++)for(c=0;c<9;c++){if(!p.wall[r*9+c])continue;x=c*T;y=OY+r*T;
        if(r<11&&!p.wall[(r+1)*9+c]){var sh=g.createLinearGradient(0,y+T,0,y+T+14);sh.addColorStop(0,'rgba(40,20,60,.38)');sh.addColorStop(1,'rgba(40,20,60,0)');g.fillStyle=sh;g.fillRect(x,y+T,T,14)}
        g.fillStyle='#2c3160';g.fillRect(x,y,T,T);g.fillStyle='#4a52a0';g.fillRect(x,y,T,T-9);
        g.fillStyle='rgba(255,255,255,.10)';g.fillRect(x+3,y+3,T-6,3);g.fillStyle='rgba(0,0,0,.12)';g.fillRect(x+T-1,y,1,T)}
      /* 문 · 레이저 */
      for(i=0;i<p.doors.length;i++){var dr=p.doors[i],o=doorO[i];x=dr.c*T;y=OY+dr.r*T;col=CC[dr.ch];
        var horiz=!!(p.wall[dr.r*9+dr.c-1]||p.wall[dr.r*9+dr.c+1]);
        if(dr.inv){var al=1-o;g.fillStyle='#22264a';if(horiz){g.fillRect(x,y+10,5,20);g.fillRect(x+T-5,y+10,5,20)}else{g.fillRect(x+10,y,20,5);g.fillRect(x+10,y+T-5,20,5)}
          if(al>.02){g.save();g.globalAlpha=al;g.shadowColor=col;g.shadowBlur=12;g.strokeStyle=col;g.lineWidth=3;
            for(var k=0;k<3;k++){var q=12+k*8+Math.sin(time*20+k)*1;g.beginPath();if(horiz){g.moveTo(x+4,y+q);g.lineTo(x+T-4,y+q)}else{g.moveTo(x+q,y+4);g.lineTo(x+q,y+T-4)}g.stroke()}
            g.strokeStyle='#fff';g.lineWidth=1;g.globalAlpha=al*.8;for(k=0;k<3;k++){q=12+k*8;g.beginPath();if(horiz){g.moveTo(x+4,y+q);g.lineTo(x+T-4,y+q)}else{g.moveTo(x+q,y+4);g.lineTo(x+q,y+T-4)}g.stroke()}
            g.restore()}}
        else{var hw=(T/2)*(1-o*.86);g.fillStyle='rgba(40,20,60,.25)';if(horiz)g.fillRect(x,y+T-6,T,10);
          for(var sd=0;sd<2;sd++){g.fillStyle=shade(col,-.3);
            if(horiz){var px=sd?x+T-hw:x;g.fillRect(px,y+6,hw,T-10);g.fillStyle=col;g.fillRect(px,y+6,hw,T-18);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(px,y+8,hw,3)}
            else{var py=sd?y+T-hw:y;g.fillRect(x+6,py,T-12,hw);g.fillStyle=col;g.fillRect(x+8,py,T-16,hw)}}
          if(o<.5){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x+T/2-1,y+6,2,T-10);g.fillStyle='#fff';g.beginPath();g.arc(x+T/2,y+T/2-2,4,0,7);g.fill();g.fillStyle=shade(col,-.4);g.beginPath();g.arc(x+T/2,y+T/2-2,2,0,7);g.fill()}}}
      /* 청소기 */
      for(i=0;i<S.haz.length;i++){var h=S.haz[i],hd=p.haz[i];
        g.strokeStyle='rgba(255,90,90,.25)';g.lineWidth=2;g.setLineDash([4,6]);g.beginPath();g.moveTo(hd.x1,hd.y1);g.lineTo(hd.x2,hd.y2);g.stroke();g.setLineDash([]);
        g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(h.x,h.y+4,15,13,0,0,7);g.fill();
        var hg=g.createRadialGradient(h.x-4,h.y-5,2,h.x,h.y,15);hg.addColorStop(0,'#7c8399');hg.addColorStop(1,'#3a3f55');g.fillStyle=hg;g.beginPath();g.arc(h.x,h.y,14,0,7);g.fill();
        g.strokeStyle='#22263a';g.lineWidth=2;g.beginPath();g.arc(h.x,h.y,9,0,7);g.stroke();
        if(h.off){g.fillStyle='#5b6178';g.beginPath();g.arc(h.x,h.y,4,0,7);g.fill();g.fillStyle='#cfd6ff';g.font='12px '+FONT;g.textAlign='center';g.fillText('z',h.x+12,h.y-12-Math.sin(time*3)*2);g.fillText('z',h.x+19,h.y-20-Math.sin(time*3+1)*2)}
        else{g.shadowColor='#ff4444';g.shadowBlur=10;g.fillStyle=Math.sin(time*14)>0?'#ff5a5a':'#ffb0a0';g.beginPath();g.arc(h.x,h.y,4,0,7);g.fill();g.shadowBlur=0;
          g.strokeStyle='rgba(255,80,80,.5)';g.lineWidth=2;g.beginPath();g.arc(h.x,h.y,17+Math.sin(time*10)*2,0,7);g.stroke()}}
      /* 고양이들 */
      var hop=0;
      if(mode==='rew'&&rew){var e=Math.min(1,mt/.5),tk=Math.round(rew.from*(1-e*e*(3-2*e)));
        rew.paths.forEach(function(pt){var g0=pt.g,n=Math.min(rew.from,g0.x.length-1);
          trail(g,g0,Math.min(tk,n),n,pt.col||'#ffb060',.6);var ps=Sim.gpos(g0,tk),pv=Sim.gpos(g0,Math.min(tk+4,n));
          cat(g,ps.x,ps.y,{col:pt.col,alpha:pt.col?.6:(rew.kind==='zap'?.5:1),fx:ps.x-pv.x,fy:ps.y-pv.y,num:pt.num})})}
      else{var cel=mode==='clear';
        S.ghosts.forEach(function(g0,gi){var n=g0.x.length-1,tk=Math.min(S.tick,n),col=GC[gi%4];
          trail(g,g0,0,n,col,cel?.5:.13);if(!cel)trail(g,g0,Math.max(0,tk-40),tk,col,.75);
          var ps=Sim.gpos(g0,S.tick),pv=Sim.gpos(g0,Math.max(0,S.tick-4));
          cat(g,ps.x,ps.y,{col:col,alpha:cel?.8:.58,fx:ps.x-pv.x,fy:ps.y-pv.y,num:gi+1,hop:cel?Math.abs(Math.sin(mt*9+gi))*9:0,happy:cel,ph:gi*1.7})});
        if(cel)trail(g,S.rec,0,S.rec.x.length-1,'#ffb060',.5);
        if(!dead){hop=cel?Math.abs(Math.sin(mt*10))*12:0;
          /* 루프 타이머 링 */
          if(!cel){var fr=1-S.tick/S.loopTicks,rc=fr<.25?'#ff5a5a':'#ffffff';g.lineCap='round';
            g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=5;g.beginPath();g.arc(S.cat.x,S.cat.y,21,0,7);g.stroke();
            g.strokeStyle=rc;g.lineWidth=started?3.5:3.5+Math.sin(time*6);g.beginPath();g.arc(S.cat.x,S.cat.y,21,-1.5708,-1.5708+6.2832*fr);g.stroke()}
          cat(g,S.cat.x,S.cat.y,{fx:face.x,fy:face.y,sq:sq,hop:hop,happy:cel,ph:0,run:moving})}}
      /* 먼지 · 조명 */
      g.fillStyle='#fff';motes.forEach(function(m){g.globalAlpha=.18+.14*Math.sin(time*1.3+m.p);g.beginPath();g.arc(m.x+Math.sin(time*.7+m.p)*8,m.y,m.r,0,7);g.fill()});g.globalAlpha=1;
      var lamp=g.createRadialGradient(W/2,OY+200,60,W/2,OY+240,360);lamp.addColorStop(0,'rgba(255,220,150,'+(.10+.02*Math.sin(time*7)+.015*Math.sin(time*23))+')');lamp.addColorStop(1,'rgba(20,10,50,.38)');
      g.fillStyle=lamp;g.fillRect(0,OY,W,480);
      /* 되감기 연출 */
      if(mode==='rew'){var ra=Math.sin(Math.min(1,mt/.5)*Math.PI);g.fillStyle='rgba(110,200,255,'+(.22*ra)+')';g.fillRect(0,OY,W,480);
        g.fillStyle='rgba(255,255,255,'+(.16*ra)+')';for(i=0;i<9;i++){var ly=OY+((i*61+time*900)%480);g.fillRect(0,ly,W,2+(i%3))}
        g.globalAlpha=ra;g.fillStyle='#fff';g.font='44px '+FONT;g.textAlign='center';g.fillText('◀◀',W/2-(mt*40),OY+250);g.globalAlpha=1}
      if(flash>0){g.fillStyle='rgba(255,80,80,'+flash*.5+')';g.fillRect(0,OY,W,480)}
      /* 조이스틱 */
      if(joy&&a&&mode!=='clear'){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=3;g.beginPath();g.arc(joy.x,joy.y,30,0,7);g.stroke();
        g.fillStyle='rgba(255,255,255,.12)';g.fill();var kx=face.x,ky=face.y;g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.arc(joy.x+(moving?kx*22:0),joy.y+(moving?ky*22:0),12,0,7);g.fill()}
      /* 상단: 전체 시간 · 방 번호 · 힌트 */
      g.textAlign='left';g.font='15px '+FONT;g.fillStyle='#cfd3ff';g.fillText((ko?'방 ':'Room ')+(cleared+1),12,56);
      var bx=74,bw=W-74-52,fr2=Math.max(0,gtime/TMAX),low=gtime<10;
      g.fillStyle='rgba(255,255,255,.12)';rr(g,bx,44,bw,13,6);g.fill();
      if(fr2>0){g.fillStyle=low?(Math.sin(time*12)>0?'#ff5a5a':'#ff9a8a'):'#ffd24d';rr(g,bx,44,Math.max(13,bw*fr2),13,6);g.fill()}
      g.textAlign='right';g.fillStyle=low?'#ff8a7a':'#fff';g.font='16px '+FONT;g.fillText(Math.ceil(gtime)+(ko?'초':'s'),W-10,57);
      var line=msg?msg.s:(cleared<8?S.L.hint[a.lang]:(ko?'루프 '+loopSec()+'초':loopSec()+'s loops'));
      g.textAlign='center';var fs=15;g.font=fs+'px '+FONT;while(g.measureText(line).width>W-20&&fs>10){fs--;g.font=fs+'px '+FONT}
      g.fillStyle=msg?'#ffb0a0':'#ffe9b8';g.fillText(line,W/2,84);
      /* 하단: 되감기 버튼 · 루프 표시 */
      var last=S.ghosts.length+1>=S.L.max,pr=mode==='rew';
      g.fillStyle='rgba(0,0,0,.3)';rr(g,BTN.x,BTN.y+3,BTN.w,BTN.h,14);g.fill();
      g.fillStyle=pr?'#9fe0ff':(last?'#ff9a6b':'#6fc8ff');rr(g,BTN.x,BTN.y+(pr?3:0),BTN.w,BTN.h,14);g.fill();
      g.fillStyle='rgba(255,255,255,.3)';rr(g,BTN.x+4,BTN.y+(pr?6:3),BTN.w-8,10,6);g.fill();
      g.fillStyle='#14304a';g.font='18px '+FONT;g.textAlign='center';g.fillText('◀◀ '+(last?(ko?'처음부터':'Restart'):(ko?'되감기':'Rewind')),BTN.x+BTN.w/2,BTN.y+(pr?31:28));
      for(i=0;i<S.L.max;i++){var qx=186+i*30,qy=610,n=S.ghosts.length;
        g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.arc(qx,qy,11,0,7);g.fill();
        if(i<n){g.fillStyle=GC[i%4];g.globalAlpha=.8;g.beginPath();g.arc(qx,qy,9,0,7);g.fill();g.globalAlpha=1}
        else if(i===n){g.fillStyle='#ff9d4a';g.beginPath();g.arc(qx,qy,8+Math.sin(time*6),0,7);g.fill()}
        g.fillStyle=i<=n?'#222':'rgba(255,255,255,.4)';g.font='12px '+FONT;g.fillText(i+1,qx,qy+4)}
      /* 클리어 배너 */
      if(mode==='clear'&&clr){var s=Math.min(1,mt/.25),sc=1+.3*(1-s);g.save();g.translate(W/2,OY+226);g.scale(sc,sc);g.globalAlpha=s;
        g.fillStyle='rgba(20,16,50,.72)';rr(g,-140,-44,280,88,18);g.fill();
        g.fillStyle='#fff36b';g.font='28px '+FONT;g.textAlign='center';g.fillText(ko?'다 같이 해냈다냥!':'We did it, together!',0,-8);
        g.fillStyle='#fff';g.font='15px '+FONT;
        g.fillText((ko?'고양이 '+clr.n+'마리':clr.n+(clr.n>1?' cats':' cat'))+(clr.under>=0?(ko?' · 파 달성':' · par'):'')+' · +'+clr.add+(ko?'초':'s'),0,20);g.restore()}
    }
  });

  function anim(dt){var i;for(i=0;i<doorO.length;i++){var t=S.dopen[i]?1:0;doorO[i]+=(t-doorO[i])*Math.min(1,dt*16)}
    for(i=0;i<padD.length;i++){var u=S.padOn[i]?1:0;padD[i]+=(u-padD[i])*Math.min(1,dt*24)}
    for(i=0;i<motes.length;i++){var m=motes[i];m.y-=m.v*dt;if(m.y<OY)m.y=OY+480}}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function shade(hex,k){var n=parseInt(hex.slice(1),16),r=n>>16,gg=(n>>8)&255,b=n&255,f=function(v){return Math.max(0,Math.min(255,Math.round(k<0?v*(1+k):v+(255-v)*k)))};
    return'rgb('+f(r)+','+f(gg)+','+f(b)+')'}
  function trail(g,p,i0,i1,col,al){if(i1-i0<2)return;g.save();g.globalAlpha=al;g.strokeStyle=col;g.lineWidth=4;g.lineCap='round';g.lineJoin='round';
    g.beginPath();g.moveTo(p.x[i0],p.y[i0]);for(var i=i0+2;i<=i1;i+=2)g.lineTo(p.x[i],p.y[i]);g.lineTo(p.x[i1],p.y[i1]);g.stroke();g.restore()}
  function cat(g,x,y,o){var ghost=!!o.col,body=o.col||'#f6a04e',dark=shade(body,-.28),lite=shade(body,.45);
    var fl=Math.hypot(o.fx||0,o.fy||0),fx=fl>.01?o.fx/fl:0,fy=fl>.01?o.fy/fl:(fl>.01?0:.6),sq=o.sq||0,hop=o.hop||0,ph=o.ph||0;
    g.save();g.globalAlpha=o.alpha==null?1:o.alpha;
    g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(x,y+11,12-hop*.2,4,0,0,7);g.fill();
    g.translate(x,y-hop+(o.run?Math.sin(time*18)*1.2:0));g.scale(1+sq*.22,1-sq*.2);
    if(ghost){g.shadowColor=body;g.shadowBlur=10}
    var side=fx>.2?-1:1;g.strokeStyle=dark;g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(side*9,7);g.quadraticCurveTo(side*20,6+Math.sin(time*6+ph)*5,side*17,-7);g.stroke();
    g.fillStyle=dark;g.beginPath();g.moveTo(-12,-5);g.lineTo(-10,-18);g.lineTo(-2,-11);g.fill();g.beginPath();g.moveTo(12,-5);g.lineTo(10,-18);g.lineTo(2,-11);g.fill();
    var bg=g.createRadialGradient(-4,-5,2,0,0,14);bg.addColorStop(0,lite);bg.addColorStop(1,body);g.fillStyle=bg;g.beginPath();g.ellipse(0,0,13,12,0,0,7);g.fill();g.shadowBlur=0;
    g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(fx*3,5+fy*1.5,6,4,0,0,7);g.fill();
    var ex=fx*3.5,ey=-2+fy*3,bl=((time*.9+ph*.37)%3.1)<.12;
    g.fillStyle='#2a1c2c';g.strokeStyle='#2a1c2c';g.lineWidth=1.8;
    if(o.happy){g.beginPath();g.arc(-5,-1,2.6,3.3,6.1);g.stroke();g.beginPath();g.arc(5,-1,2.6,3.3,6.1);g.stroke()}
    else if(bl){g.beginPath();g.moveTo(-7+ex,ey);g.lineTo(-3+ex,ey);g.moveTo(3+ex,ey);g.lineTo(7+ex,ey);g.stroke()}
    else{g.beginPath();g.ellipse(-5+ex,ey,2.2,2.9,0,0,7);g.ellipse(5+ex,ey,2.2,2.9,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(-5.6+ex,ey-1,.9,0,7);g.arc(4.4+ex,ey-1,.9,0,7);g.fill()}
    g.fillStyle='#ff8fa0';g.beginPath();g.arc(ex*.8,ey+4.2,1.5,0,7);g.fill();
    g.restore();
    if(o.num){g.save();g.globalAlpha=.95;g.fillStyle='rgba(20,16,50,.7)';g.beginPath();g.arc(x,y-25-hop,8,0,7);g.fill();g.fillStyle=body;g.font='12px '+FONT;g.textAlign='center';g.fillText(o.num,x,y-21-hop);g.restore()}}
})();
