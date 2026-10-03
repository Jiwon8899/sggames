/* 바람이 되어 (Wind Seed) — 플레이어는 바람이다. 화면을 쓸면 바람결이 생기고, 민들레 씨앗 '포포'가 그 바람을 탄다.
   시뮬레이션(바람장 + 씨앗 물리 + 위험 요소)은 DOM 없이 돌도록 분리했다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,GX=12,GY=21,CW=30,CH=32,GAP=440,DAY0=40,DAYMAX=45;
  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function rng(s){return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}

  /* ================= 시뮬레이션 ================= */
  function newSim(seedN){
    var S={t:0,r:rng(seedN||20261003),fx:new Float32Array(GX*GY),fy:new Float32Array(GX*GY),fBase:-380-CH,camY:-380,
      seed:{x:180,y:0,vx:0,vy:-46,state:'fly',wet:0,inv:.6,stuck:0,tear:0,web:null,frog:null,pt:0,patch:null},
      fluff:3,stam:1,tired:false,rest:9,day:DAY0,planted:0,strokes:0,score:0,over:false,why:'',happy:0,
      patches:[],webs:[],thorns:[],frogs:[],clouds:[],drops:[],pollen:[],gen:0,genY:0,ev:[],puffCd:0};
    gen(S);return S}

  function gen(S){
    var r=S.r,k,j;
    while(S.genY>S.camY-800){
      var i=S.gen++,py=-300-i*GAP,prevY=i?py+GAP:0,prevX=i?S.patches[S.patches.length-1].x:180;
      var px=i===0?250:(i%2?62+r()*70:228+r()*70),side=px<180?0:1;
      S.patches.push({x:px,y:py,w:Math.max(62,98-i*4),done:false,i:i,bloom:0,hue:Math.floor(r()*5)});
      for(k=1;k<=5;k++){var f=k/6;S.pollen.push({x:clamp(prevX+(px-prevX)*f+(r()-.5)*90,26,W-26),y:prevY+(py-prevY)*f+(r()-.5)*50,vx:0,vy:0,ph:r()*6})}
      var top=py+90,bot=prevY-100,span=bot-top;
      if(i>=1){var nw=i>=6?2:1;for(k=0;k<nw;k++){var wf=.25+.2*r()+k*.35;
        S.webs.push({x:clamp(prevX+(px-prevX)*wf+(r()-.5)*90,56,W-56),y:bot-span*wf,r:30,dead:0})}}
      if(i>=2){var n=4+Math.min(3,Math.floor(i/4)),ty=bot-span*(.6+.2*r()),nodes=[];
        for(j=0;j<n;j++)nodes.push({x:side?W-12-j*21:12+j*21,y:ty-Math.sin(j*.55)*16});
        S.thorns.push({nodes:nodes,side:side,y:ty});
        if(i>=5){var ty2=bot-span*(.12+.2*r()),n2=3+Math.min(3,Math.floor(i/5)),nd2=[];
          for(j=0;j<n2;j++)nd2.push({x:side?12+j*21:W-12-j*21,y:ty2-Math.sin(j*.55)*16});
          S.thorns.push({nodes:nd2,side:1-side,y:ty2})}}
      if(i>=3&&i%2===1)S.clouds.push({x:clamp(180+(px-180)*.3+(r()-.5)*80,70,W-70),y:py+46,t:r()});
      if(i>=4&&i%2===0)S.frogs.push({side:1-side,x:side?30:W-30,y:bot-span*(.42+.16*r()),st:'idle',t:0,cd:0,tx:0,ty:0,tipx:0,tipy:0});
      S.genY=py}
  }

  function shiftField(S){
    while(S.fBase>S.camY-CH*.5){
      for(var r=GY-1;r>0;r--)for(var c=0;c<GX;c++){S.fx[r*GX+c]=S.fx[(r-1)*GX+c];S.fy[r*GX+c]=S.fy[(r-1)*GX+c]}
      for(var c2=0;c2<GX;c2++){S.fx[c2]=0;S.fy[c2]=0}
      S.fBase-=CH}}
  var _w=[0,0];
  function sample(S,x,wy){
    var gx=clamp(x/CW-.5,0,GX-1.001),gy=clamp((wy-S.fBase)/CH-.5,0,GY-1.001),c=gx|0,r=gy|0,u=gx-c,v=gy-r,i=r*GX+c;
    _w[0]=(S.fx[i]*(1-u)+S.fx[i+1]*u)*(1-v)+(S.fx[i+GX]*(1-u)+S.fx[i+GX+1]*u)*v;
    _w[1]=(S.fy[i]*(1-u)+S.fy[i+1]*u)*(1-v)+(S.fy[i+GX]*(1-u)+S.fy[i+GX+1]*u)*v;return _w}
  function addWind(S,x,wy,vx,vy,rad,amt){
    var c0=Math.max(0,Math.floor((x-rad)/CW)),c1=Math.min(GX-1,Math.floor((x+rad)/CW)),
        r0=Math.max(0,Math.floor((wy-rad-S.fBase)/CH)),r1=Math.min(GY-1,Math.floor((wy+rad-S.fBase)/CH));
    for(var r=r0;r<=r1;r++)for(var c=c0;c<=c1;c++){
      var d=Math.hypot((c+.5)*CW-x,(r+.5)*CH+S.fBase-wy);if(d>=rad)continue;
      var k=Math.min(1,(1-d/rad)*amt*1.6),i=r*GX+c;S.fx[i]+=(vx-S.fx[i])*k;S.fy[i]+=(vy-S.fy[i])*k}}
  /* 화면 좌표의 붓질 한 토막. 속도가 빠를수록 센 바람. 움직임이 없으면 바람도 없다. */
  function stroke(S,x0,y0,x1,y1,dt){
    var dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy);
    if(len<1.5||S.tired||S.over)return 0;
    var sp=Math.min(1000,len/Math.max(dt,.004)),mag=Math.min(440,90+sp*.36),n=Math.max(1,Math.ceil(len/12));
    for(var i=1;i<=n;i++){var f=i/n;addWind(S,x0+dx*f,y0+dy*f+S.camY,dx/len*mag,dy/len*mag,48,.9)}
    S.stam-=len/820;S.rest=0;if(S.stam<=0){S.stam=0;S.tired=true}
    return mag}
  function blow(S,dx,dy,dt){ /* 키보드: 씨앗 자리에서 그 방향으로 */
    if(S.tired||S.over)return false;var l=Math.hypot(dx,dy)||1,s=S.seed;dx/=l;dy/=l;
    addWind(S,s.x-dx*14,s.y-10-dy*14,dx*300,dy*300,54,Math.min(1,dt*9));
    S.stam-=dt*.5;S.rest=0;if(S.stam<=0){S.stam=0;S.tired=true}return true}
  function puff(S){
    if(S.tired||S.over||S.puffCd>0||S.stam<.2)return false;var s=S.seed;
    addWind(S,s.x,s.y-6,0,-470,76,1);S.stam-=.26;S.rest=0;S.puffCd=.35;S.strokes++;return true}

  function gust(S){var s=S.seed,w=sample(S,s.x,s.y-8);return Math.hypot(w[0],w[1])}
  function end(S,why){if(!S.over){S.over=true;S.why=why;S.ev.push(['over',S.seed.x,S.seed.y,why])}}
  function freeSeed(S,inv){var s=S.seed,w=sample(S,s.x,s.y-8);s.state='fly';s.vx=w[0]*.5;s.vy=w[1]*.5;s.inv=inv;s.web=null;s.frog=null;s.stuck=0;s.tear=0}

  function step(S,dt){
    if(S.over)return;
    var s=S.seed,i,j,w,d,p;S.t+=dt;
    /* 바람장: 감쇠 + 약한 확산 */
    var dec=Math.exp(-dt*1.15),dif=Math.min(.5,dt*2.2),fx=S.fx,fy=S.fy;
    for(i=0;i<GX*GY;i++){var c=i%GX,ax=fx[i],ay=fy[i],n=1;
      if(c>0){ax+=fx[i-1];ay+=fy[i-1];n++}if(c<GX-1){ax+=fx[i+1];ay+=fy[i+1];n++}
      if(i>=GX){ax+=fx[i-GX];ay+=fy[i-GX];n++}if(i<GX*GY-GX){ax+=fx[i+GX];ay+=fy[i+GX];n++}
      fx[i]=(fx[i]+(ax/n-fx[i])*dif)*dec;fy[i]=(fy[i]+(ay/n-fy[i])*dif)*dec}
    /* 기력 · 햇빛 */
    S.rest+=dt;S.puffCd-=dt;if(S.rest>.18)S.stam=Math.min(1,S.stam+dt*.75);if(S.tired&&S.stam>.3)S.tired=false;
    S.day-=dt;if(S.day<=0){S.day=0;end(S,'night');return}
    if(S.happy>0)S.happy-=dt;if(s.inv>0)s.inv-=dt;if(s.wet>0)s.wet-=dt;
    /* 카메라 */
    S.camY-=(12+Math.min(22,S.planted*1.2))*dt;
    if(s.state==='fly'&&s.y-S.camY<230)S.camY+=(s.y-230-S.camY)*Math.min(1,dt*4);
    shiftField(S);gen(S);

    if(s.state==='fly'){
      w=sample(S,s.x,s.y-8);var wet=s.wet>0,k=wet?1.0:1.5,g=wet?78:24;
      s.vx+=(w[0]-s.vx)*k*dt;s.vy+=((w[1]-s.vy)*k+g)*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;
      if(s.x<16){s.x=16;s.vx=Math.abs(s.vx)*.3}if(s.x>W-16){s.x=W-16;s.vx=-Math.abs(s.vx)*.3}
      if(s.y-S.camY>H+26){end(S,'fell');return}
      for(i=0;i<S.patches.length;i++){p=S.patches[i];
        if(!p.done&&Math.abs(s.x-p.x)<p.w/2+5&&s.y>p.y-12&&s.y<p.y+18){
          p.done=true;S.planted++;s.state='plant';s.pt=0;s.patch=p;s.vx=s.vy=0;s.wet=0;
          var gb=S.strokes<=2?15:S.strokes<=4?8:S.strokes<=6?4:0;S.score+=10+gb;S.day=Math.min(DAYMAX,S.day+Math.max(5,12-S.planted*.5));S.happy=2;
          S.ev.push(['plant',p.x,p.y,gb,p]);break}}
      if(s.state==='fly')for(i=0;i<S.webs.length;i++){var wb=S.webs[i];
        if(!wb.dead&&s.inv<=0&&Math.hypot(s.x-wb.x,s.y-10-wb.y)<wb.r-3){s.state='web';s.web=wb;s.stuck=0;s.tear=0;S.ev.push(['stuck',s.x,s.y]);break}}
      if(s.state==='fly'&&s.inv<=0)for(i=0;i<S.thorns.length&&s.inv<=0;i++){var ns=S.thorns[i].nodes;
        for(j=0;j<ns.length;j++){var dA=Math.hypot(s.x-ns[j].x,s.y-ns[j].y),dB=Math.hypot(s.x-ns[j].x,s.y-22-ns[j].y);
          if(dA<17||dB<20){S.fluff--;s.inv=1.5;d=Math.max(1,dA);s.vx=(s.x-ns[j].x)/d*130;s.vy=(s.y-ns[j].y)/d*130;
            S.ev.push(['pop',s.x,s.y-20]);if(S.fluff<=0){end(S,'thorn');return}break}}}
    }else if(s.state==='plant'){
      s.pt+=dt;p=s.patch;s.x+=(p.x-s.x)*Math.min(1,dt*8);s.y+=(p.y+4-s.y)*Math.min(1,dt*8);
      if(s.pt>=.95){s.state='fly';s.x=p.x;s.y=p.y-40;s.vx=0;s.vy=-78;s.inv=1;S.strokes=0;S.ev.push(['lift',s.x,s.y])}
    }else if(s.state==='web'){
      var wb2=s.web,m=gust(S);w=_w;
      s.x+=(wb2.x+w[0]*.03-s.x)*Math.min(1,dt*6);s.y+=(wb2.y+10+w[1]*.03-s.y)*Math.min(1,dt*6);
      s.stuck+=dt;if(m>140)s.tear+=dt*m/200;
      if(s.tear>=.5){wb2.dead=.001;S.score+=3;S.ev.push(['tear',wb2.x,wb2.y]);freeSeed(S,.6)}
      else if(s.stuck>=2){end(S,'web');return}
    }else if(s.state==='tongue'){
      var fr=s.frog,mx=fr.x+(fr.side?-10:10),my=fr.y-8,m2=gust(S);d=Math.hypot(mx-s.x,my-(s.y-10))||1;
      s.x+=(mx-s.x)/d*70*dt;s.y+=(my-(s.y-10))/d*70*dt;fr.tipx=s.x;fr.tipy=s.y-10;
      if(m2>140)s.tear+=dt*m2/200;
      if(s.tear>=.45){fr.st='back';fr.t=0;fr.cd=2.6;S.score+=3;S.ev.push(['free',s.x,s.y]);freeSeed(S,1)}
      else if(d<12){end(S,'frog');return}
    }
    /* 거미줄 조각 사라짐 */
    for(i=0;i<S.webs.length;i++)if(S.webs[i].dead)S.webs[i].dead+=dt;
    /* 개구리 */
    for(i=0;i<S.frogs.length;i++){var f=S.frogs[i],fmx=f.x+(f.side?-10:10),fmy=f.y-8;f.t+=dt;if(f.cd>0)f.cd-=dt;
      if(f.st==='idle'){if(s.state==='fly'&&s.inv<=0&&f.cd<=0&&Math.hypot(s.x-fmx,s.y-10-fmy)<150){f.st='aim';f.t=0;f.lock=false;S.ev.push(['aim',f.x,f.y])}}
      else if(f.st==='aim'){if(!f.lock&&f.t>=.45){f.lock=true;f.tx=s.x+s.vx*.2;f.ty=s.y-10+s.vy*.2}
        if(f.t>=.72){f.st='shoot';f.t=0;S.ev.push(['shoot',f.x,f.y])}}
      else if(f.st==='shoot'){var q=Math.min(1,f.t/.18);f.tipx=fmx+(f.tx-fmx)*q;f.tipy=fmy+(f.ty-fmy)*q;
        if(s.state==='fly'&&s.inv<=0&&Math.hypot(f.tipx-s.x,f.tipy-(s.y-10))<15){s.state='tongue';s.frog=f;s.tear=0;f.st='pull';S.ev.push(['caught',s.x,s.y])}
        else if(q>=1){f.st='back';f.t=0;f.cd=1.7}}
      else if(f.st==='back'){var q2=Math.min(1,f.t/.25);f.tipx+=(fmx-f.tipx)*q2;f.tipy+=(fmy-f.tipy)*q2;if(q2>=1)f.st='idle'}}
    /* 비구름 · 빗방울 */
    for(i=0;i<S.clouds.length;i++){var cl=S.clouds[i];if(cl.y>S.camY-30&&cl.y<S.camY+H){cl.t+=dt;
      if(cl.t>.55){cl.t=0;S.drops.push({x:cl.x+(S.r()-.5)*80,y:cl.y+14,vx:0,vy:60,y0:cl.y})}}}
    for(i=S.drops.length-1;i>=0;i--){var dr=S.drops[i];w=sample(S,dr.x,dr.y);
      dr.vx+=(w[0]*1.1-dr.vx)*3*dt;dr.vy+=(190+w[1]*.6-dr.vy)*3*dt;dr.x+=dr.vx*dt;dr.y+=dr.vy*dt;
      if(s.state==='fly'&&s.inv<=0&&Math.hypot(dr.x-s.x,dr.y-(s.y-20))<14){s.wet=2.6;s.vy+=45;S.ev.push(['wet',dr.x,dr.y]);S.drops.splice(i,1)}
      else if(dr.y>S.camY+H+20||dr.y>dr.y0+430||dr.x<-10||dr.x>W+10)S.drops.splice(i,1)}
    /* 꽃가루 */
    for(i=S.pollen.length-1;i>=0;i--){p=S.pollen[i];w=sample(S,p.x,p.y);p.ph+=dt*2;
      p.vx+=(w[0]*.8+Math.cos(p.ph)*6-p.vx)*2*dt;p.vy+=(w[1]*.8+Math.sin(p.ph*1.3)*6-p.vy)*2*dt;
      p.x=clamp(p.x+p.vx*dt,14,W-14);p.y+=p.vy*dt;
      if(s.state!=='plant'&&(Math.hypot(p.x-s.x,p.y-s.y)<17||Math.hypot(p.x-s.x,p.y-(s.y-22))<19)){S.score+=2;S.ev.push(['pollen',p.x,p.y]);S.pollen.splice(i,1)}
      else if(p.y>S.camY+H+30)S.pollen.splice(i,1)}
    /* 화면 아래로 지나간 것 정리 */
    var lim=S.camY+H+260;
    while(S.patches.length>1&&S.patches[0].y>lim&&S.patches[0]!==s.patch)S.patches.shift();
    while(S.webs.length&&S.webs[0].y>lim&&S.webs[0]!==s.web)S.webs.shift();
    while(S.thorns.length&&S.thorns[0].y>lim)S.thorns.shift();
    while(S.clouds.length&&S.clouds[0].y>lim+200)S.clouds.shift();
    while(S.frogs.length&&S.frogs[0].y>lim&&S.frogs[0]!==s.frog&&S.frogs[0].st==='idle')S.frogs.shift();
  }
  function target(S){for(var i=0;i<S.patches.length;i++){var p=S.patches[i];if(!p.done&&p.y<S.camY+H-10&&p.y<S.seed.y+60)return p}return null}

  if(typeof module!=='undefined'&&module.exports){
    module.exports={newSim:newSim,step:step,stroke:stroke,blow:blow,puff:puff,sample:sample,target:target,W:W,H:H};return}

  /* ================= 화면 ================= */
  var S=null,ko=true,T=0,ribs=[],wp=[],petals=[],bend={},chimes=[],prevCam=0,pd=false,px=0,py=0,curRib=null,counted=false,
      blink=0,blinkT=2,lag=[0,0],kbRibT=0,flow=[],tiles=null,noteK=0,fade=0;
  var keys={},q=[];
  if(!window.__windSeedKeys){window.__windSeedKeys=true;
    window.addEventListener('keydown',function(e){keys[e.code]=true;if(!e.repeat)q.push(e.code)});
    window.addEventListener('keyup',function(e){keys[e.code]=false});
    window.addEventListener('blur',function(){keys={}})}
  var PET=[['#ff8fa3','#ffd166'],['#ffb347','#fff3b0'],['#c9a0ff','#ffe066'],['#7fd8ff','#fff6c2'],['#ff7b6b','#ffe9a8']];

  function makeTile(seedN,far){
    var c=document.createElement('canvas');c.width=W;c.height=H;var g=c.getContext('2d'),r=rng(seedN),i,k;
    function blob(x,y,rad,col){for(k=-1;k<=1;k++){var gr=g.createRadialGradient(x,y+k*H,rad*.1,x,y+k*H,rad);gr.addColorStop(0,col[0]);gr.addColorStop(.7,col[1]);gr.addColorStop(1,col[2]);
      g.fillStyle=gr;g.beginPath();g.arc(x,y+k*H,rad,0,7);g.fill()}}
    if(far){for(i=0;i<26;i++){var e=r()<.5,x=e?r()*120-20:W-r()*120+20;if(r()<.25)x=r()*W;
        blob(x,r()*H,34+r()*62,r()<.5?['rgba(74,150,120,.34)','rgba(74,150,120,.2)','rgba(74,150,120,0)']:['rgba(120,184,132,.3)','rgba(120,184,132,.17)','rgba(120,184,132,0)'])}
      for(i=0;i<9;i++)blob(r()*W,r()*H,12+r()*20,['rgba(255,244,200,.35)','rgba(255,244,200,.14)','rgba(255,244,200,0)'])}
    else{for(i=0;i<7;i++){var sx=r()<.5?r()*70:W-r()*70,sy=r()*H,dir=sx<180?1:-1,len=70+r()*90;
        for(k=-1;k<=1;k++){g.strokeStyle='rgba(38,104,84,.5)';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(sx-dir*40,sy+k*H+30);g.quadraticCurveTo(sx,sy+k*H+10,sx+dir*len,sy+k*H-len*.5);g.stroke();
          for(var j=1;j<5;j++){var f=j/5,lx=sx-dir*40+(len+40)*dir*f,ly=sy+k*H+30-(30+len*.5)*f*f-6;
            g.fillStyle=j%2?'rgba(52,128,98,.5)':'rgba(88,160,108,.46)';g.save();g.translate(lx,ly);g.rotate(dir*(-.5+(j%2)*1.4));g.beginPath();g.ellipse(0,-11,6,13,0,0,7);g.fill();g.restore()}}}
      for(i=0;i<12;i++)blob(r()<.5?r()*46:W-r()*46,r()*H,18+r()*26,['rgba(40,110,88,.5)','rgba(40,110,88,.3)','rgba(40,110,88,0)'])}
    return c}

  function init(a){
    ko=a.lang==='ko';S=newSim(((Date.now()/1000)|0)%100000+7);ribs=[];curRib=null;pd=false;counted=false;chimes=[];bend={};q.length=0;lag=[0,0];prevCam=S.camY;fade=0;
    if(!tiles)tiles=[makeTile(11,true),makeTile(29,false)];
    wp=[];for(var i=0;i<300;i++)wp.push({x:Math.random()*W,y:Math.random()*H,px:0,py:0,l:Math.random()*3,n:1});
    petals=[];for(i=0;i<16;i++)petals.push({x:Math.random()*W,y:Math.random()*H,vx:0,vy:0,a:Math.random()*6,c:PET[i%5][0],leaf:i%3===0,s:.7+Math.random()*.6})}

  function ribPoint(rb,x,wy){var n=rb.pts.length;if(n){var l=rb.pts[n-1];if(Math.hypot(x-l.x,wy-l.y)<6)return}rb.pts.push({x:x,y:wy,t:0})}

  function update(dt,inp,a){
    T+=dt;if(S.over)return;
    /* --- 터치/마우스: 끌어서 바람 긋기 --- */
    if(inp.down&&inp.x!=null){
      if(!pd){pd=true;px=inp.x;py=inp.y;curRib=null;counted=false}
      else{var mv=Math.hypot(inp.x-px,inp.y-py);
        if(mv>=1.5){var mag=stroke(S,px,py,inp.x,inp.y,dt);
          if(mag){if(!curRib){curRib={pts:[],dry:false};ribs.push(curRib);ribPoint(curRib,px,py+S.camY);a.beep(620+Math.random()*240,.07,'sine')}
            ribPoint(curRib,inp.x,inp.y+S.camY);if(!counted){counted=true;S.strokes++}}
          else if(S.tired&&curRib)curRib=null;
          px=inp.x;py=inp.y}}
    }else{pd=false;curRib=null}
    /* --- 키보드 --- */
    var c;while((c=q.shift())){
      if(c==='Space'){if(puff(S)){a.beep(520,.09,'sine');a.beep(780,.12,'sine');var rb={pts:[]};for(var i=0;i<6;i++)rb.pts.push({x:S.seed.x+Math.sin(i*1.3)*7,y:S.seed.y+34-i*13,t:0});ribs.push(rb)}}
      else if(/^(Arrow|Key[WASD]$)/.test(c))S.strokes++}
    var kx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0),ky=(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0);
    if(kx||ky){if(blow(S,kx,ky,dt)){kbRibT-=dt;if(kbRibT<=0){kbRibT=.11;var l=Math.hypot(kx,ky),ux=kx/l,uy=ky/l,o=(Math.random()-.5)*26,rb2={pts:[]};
        for(var j=0;j<5;j++)rb2.pts.push({x:S.seed.x-ux*(44-j*15)-uy*o,y:S.seed.y-10-uy*(44-j*15)+ux*o,t:0});ribs.push(rb2)}}}

    var sc=S.score;step(S,dt);if(S.score>sc)a.add(S.score-sc);
    /* --- 이벤트 → 소리와 연출 --- */
    for(var e=0;e<S.ev.length;e++){var ev=S.ev[e],x=ev[1],y=ev[2]-S.camY;
      switch(ev[0]){
        case 'pollen':a.beep(1175*[1,1.125,1.25,1.5,1.6667][noteK++%5],.14,'sine');a.burst(x,y,'#ffe27a',6);a.pop(x,y-8,'+2','#fff3a8');break;
        case 'plant':[523,659,784,1047,1319].forEach(function(f,i){chimes.push([T+i*.085,f])});
          a.burst(x,y-10,PET[ev[4].hue][0],16);a.burst(x,y-10,'#fff',8);a.pop(x,y-46,'+'+(10),'#fff');
          if(ev[3])a.pop(x,y-70,(ko?'살랑 보너스 +':'Gentle +')+ev[3],'#ffe27a');a.tempo(1+S.planted*.04);break;
        case 'lift':a.beep(880,.1,'sine');a.burst(x,y,'#fff',8);break;
        case 'stuck':a.beep(196,.18,'triangle');a.pop(x,y-36,ko?'세게 불어!':'Blow hard!','#fff');break;
        case 'tear':a.sfx('jump');a.burst(x,y,'#fff',16);a.pop(x,y-20,'+3','#fff');break;
        case 'pop':a.sfx('hit');a.shake(8);a.burst(x,y,'#fff',18);break;
        case 'wet':a.beep(330,.12,'sine');a.beep(247,.16,'sine');a.burst(x,y,'#8fd3ff',10);a.pop(x,y-20,ko?'젖었어!':'Soaked!','#bfe6ff');break;
        case 'aim':a.beep(147,.12,'square');break;
        case 'shoot':a.beep(392,.06,'square');break;
        case 'caught':a.beep(131,.2,'sawtooth');a.shake(5);a.pop(x,y-36,ko?'세게 불어!':'Blow hard!','#fff');break;
        case 'free':a.sfx('jump');a.burst(x,y,'#ffb3c7',12);a.pop(x,y-20,'+3','#fff');break;
        case 'over':a.burst(x,clamp(y,20,H-20),'#fff',20);a.over();break}}
    S.ev.length=0;
    for(var k=chimes.length-1;k>=0;k--)if(T>=chimes[k][0]){a.beep(chimes[k][1],.22,'sine');chimes.splice(k,1)}
  }

  /* ---------- 그리기 도우미 ---------- */
  function hash(n){n=Math.sin(n*127.1+311.7)*43758.5453;return n-Math.floor(n)}
  function bladeAt(g,key,bx,by,dx,dy,L,col,wid,dt,head){
    var b=bend[key];if(!b)b=bend[key]={x:0,y:0};
    var tx=bx+dx*L,ty=by+dy*L,w=sample(S,tx,ty+S.camY),sw=Math.sin(T*1.7+key*1.3)*2.2,
        gx=clamp(w[0]*.085,-L*.9,L*.9)+sw,gy=clamp(w[1]*.06,-L*.5,L*.6);
    b.x+=(gx-b.x)*Math.min(1,dt*7);b.y+=(gy-b.y)*Math.min(1,dt*7);
    var ex=tx+b.x,ey=ty+b.y+Math.abs(b.x)*.25;
    g.strokeStyle=col;g.lineWidth=wid;g.beginPath();g.moveTo(bx,by);g.quadraticCurveTo(bx+dx*L*.55+b.x*.15,by+dy*L*.55+b.y*.15,ex,ey);g.stroke();
    if(head){g.fillStyle=head[0];for(var i=0;i<5;i++){var an=i*1.257+b.x*.03;g.beginPath();g.arc(ex+Math.cos(an)*3.6,ey+Math.sin(an)*3.6,2.7,0,7);g.fill()}
      g.fillStyle=head[1];g.beginPath();g.arc(ex,ey,2.3,0,7);g.fill()}
    return b}

  function drawWalls(g,dt){
    var k0=Math.floor(S.camY/24)-2,k1=Math.floor((S.camY+H)/24)+2,k,sd;
    for(k=k0;k<=k1;k++)for(sd=0;sd<2;sd++){var h=hash(k*2+sd),y=k*24-S.camY+h*10,x=sd?W+5:-5;
      g.fillStyle=h<.5?'#2f7f62':'#3c9470';g.beginPath();g.arc(x,y,17+h*9,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.1)';g.beginPath();g.arc(x+(sd?-5:5),y-6,7+h*4,0,7);g.fill()}
    g.lineCap='round';
    for(k=k0;k<=k1;k++)for(sd=0;sd<2;sd++){var key=k*2+sd,h1=hash(key+.37),h2=hash(key+.91);if(h1<.18)continue;
      var by=k*24-S.camY+h2*12,bx=sd?W-4:4,ang=-.25-h2*.75,dx=Math.cos(ang)*(sd?-1:1),dy=Math.sin(ang),L=20+h1*30;
      bladeAt(g,key,bx,by,dx,dy,L,h2<.5?'#5fb37d':'#84c98a',2.6,dt,h1>.82?PET[(key%5+5)%5]:null)}
    if(Object.keys(bend).length>900)bend={}}

  function drawPatch(g,p,dt,isT){
    var x=p.x,y=p.y-S.camY,w=p.w,i;if(y<-90||y>H+90)return;
    g.fillStyle='rgba(20,60,50,.16)';g.beginPath();g.ellipse(x+5,y+40,w*.42,9,0,0,7);g.fill();
    var gr=g.createLinearGradient(0,y,0,y+38);gr.addColorStop(0,'#9a7a5f');gr.addColorStop(1,'#5e5a66');
    g.fillStyle=gr;g.beginPath();g.moveTo(x-w/2,y+3);g.quadraticCurveTo(x-w*.36,y+30,x-4,y+38);g.quadraticCurveTo(x+w*.3,y+34,x+w/2,y+3);g.fill();
    g.strokeStyle='rgba(120,90,70,.7)';g.lineWidth=1.6;for(i=0;i<3;i++){var rx=x-w*.2+i*w*.2;g.beginPath();g.moveTo(rx,y+30);g.quadraticCurveTo(rx+3,y+40,rx-2+Math.sin(T+i)*2,y+48+i*3);g.stroke()}
    if(!p.done&&isT){g.fillStyle='rgba(255,236,170,'+(.22+.12*Math.sin(T*4))+')';g.beginPath();g.ellipse(x,y-2,w*.62,16,0,0,7);g.fill()}
    g.fillStyle='#6b4630';g.beginPath();g.ellipse(x,y+3,w/2,8.5,0,0,7);g.fill();
    g.fillStyle='#8a5d3e';g.beginPath();g.ellipse(x,y+.5,w/2-3,5.5,0,0,7);g.fill();
    g.fillStyle='rgba(255,230,190,.5)';for(i=0;i<5;i++){g.beginPath();g.arc(x-w*.32+i*w*.16,y+1+(i%2)*2,1.3,0,7);g.fill()}
    g.lineCap='round';
    for(i=0;i<7;i++){var sd=i%2?1:-1,o=(w/2-3-(i>>1)*5)*sd,hh=hash(p.i*13+i);
      bladeAt(g,100000+p.i*10+i,x+o,y+4,sd*.25,-.97,10+hh*10,i%3?'#63b97f':'#8fd08f',2.4,dt,null)}
    if(p.done){p.bloom=Math.min(1.6,p.bloom+dt);var b=p.bloom,st=clamp(b/.45,0,1),pe=clamp((b-.35)/.5,0,1);pe=pe<1?pe*(2.2-1.2*pe):1;
      var bb=bladeAt(g,200000+p.i,x,y+1,0,-1,34*st,'#4fa56a',3,dt,null),fx=x+bb.x,fy=y+1-34*st+bb.y+Math.abs(bb.x)*.25,c=PET[p.hue];
      if(st>.5){g.fillStyle='#5fb37d';g.save();g.translate(x+bb.x*.3,y-14*st);g.rotate(-.9);g.beginPath();g.ellipse(7,0,8*st,3.4,0,0,7);g.fill();g.rotate(1.8+Math.PI);g.beginPath();g.ellipse(7,0,8*st,3.4,0,0,7);g.fill();g.restore()}
      if(pe>0){g.save();g.translate(fx,fy);g.rotate(bb.x*.03+Math.sin(T*1.5+p.i)*.06);
        for(i=0;i<7;i++){g.rotate(Math.PI*2/7);g.fillStyle=c[0];g.beginPath();g.ellipse(0,-9*pe,5.2*pe,8.5*pe,0,0,7);g.fill();
          g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.ellipse(-1,-10*pe,2*pe,5*pe,0,0,7);g.fill()}
        g.fillStyle=c[1];g.beginPath();g.arc(0,0,5.6*pe,0,7);g.fill();
        g.fillStyle='#5a3d2b';g.beginPath();g.arc(-2,-.6,.9,0,7);g.arc(2,-.6,.9,0,7);g.fill();
        g.strokeStyle='#5a3d2b';g.lineWidth=1;g.beginPath();g.arc(0,.8,1.8,.2,2.94);g.stroke();g.restore()}}
    else if(isT){var by=y-30+Math.sin(T*5)*4;g.fillStyle='#fff7d6';g.strokeStyle='rgba(60,90,70,.5)';g.lineWidth=1.5;
      g.beginPath();g.moveTo(x-8,by-8);g.lineTo(x+8,by-8);g.lineTo(x,by+3);g.closePath();g.fill();g.stroke()}}

  function drawWeb(g,wb){
    var x=wb.x,y=wb.y-S.camY,r=wb.r,i,j;if(y<-60||y>H+60)return;
    var al=wb.dead?clamp(1-wb.dead/.5,0,1):1,sp=wb.dead?wb.dead*90:0;if(al<=0)return;
    var stuck=S.seed.web===wb&&S.seed.state==='web',jx=stuck?Math.sin(T*40)*1.5*(.4+S.seed.tear):0;
    g.save();g.globalAlpha=al;g.translate(x+jx,y);
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1;g.beginPath();g.moveTo(-r,0);g.lineTo(-x-jx,-40);g.moveTo(r,0);g.lineTo(W-x,-30);g.moveTo(0,r);g.lineTo(-x*.6,H*.2);g.stroke();
    g.fillStyle='rgba(255,255,255,.1)';g.beginPath();g.arc(0,0,r,0,7);g.fill();
    g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1.3;
    for(i=0;i<8;i++){var an=i*Math.PI/4+.2,ox=Math.cos(an)*sp,oy=Math.sin(an)*sp;g.beginPath();g.moveTo(ox,oy);g.lineTo(Math.cos(an)*r+ox,Math.sin(an)*r+oy);g.stroke()}
    for(j=1;j<=3;j++){g.beginPath();for(i=0;i<=8;i++){var a2=i*Math.PI/4+.2,rr=r*j/3.2+sp;if(i)g.quadraticCurveTo(Math.cos(a2-Math.PI/8)*rr*.84,Math.sin(a2-Math.PI/8)*rr*.84,Math.cos(a2)*rr,Math.sin(a2)*rr);else g.moveTo(Math.cos(a2)*rr,Math.sin(a2)*rr)}g.stroke()}
    /* 거미 */
    var q2=stuck?clamp(S.seed.stuck/2,0,1):0,sx=-r*.72*(1-q2),sy=-r*.72*(1-q2)+(wb.dead?wb.dead*200:0);
    g.strokeStyle='#3b2e4a';g.lineWidth=1.4;for(i=0;i<4;i++){var lg=Math.sin(T*(stuck?22:3)+i)*2;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx-9-lg,sy-5+i*3.4);g.moveTo(sx,sy);g.lineTo(sx+9+lg,sy-5+i*3.4);g.stroke()}
    g.fillStyle='#4a3a5e';g.beginPath();g.arc(sx,sy,6.5,0,7);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(sx-2.4,sy-1,2,0,7);g.arc(sx+2.4,sy-1,2,0,7);g.fill();
    g.fillStyle='#1d1626';g.beginPath();g.arc(sx-2.2,sy-.6,1,0,7);g.arc(sx+2.6,sy-.6,1,0,7);g.fill();
    if(stuck){g.strokeStyle='#ff6b6b';g.lineWidth=3;g.beginPath();g.arc(0,0,r+6,-1.57,-1.57+6.283*(1-S.seed.stuck/2));g.stroke()}
    g.restore()}

  function drawThorn(g,t){
    var ns=t.nodes,i,y0=t.y-S.camY;if(y0<-80||y0>H+80)return;
    g.lineCap='round';g.lineJoin='round';
    g.strokeStyle='rgba(30,40,50,.18)';g.lineWidth=13;g.beginPath();g.moveTo(t.side?W+4:-4,y0+8);for(i=0;i<ns.length;i++)g.lineTo(ns[i].x+3,ns[i].y-S.camY+7);g.stroke();
    g.strokeStyle='#6a3f55';g.lineWidth=11;g.beginPath();g.moveTo(t.side?W+4:-4,y0);for(i=0;i<ns.length;i++)g.lineTo(ns[i].x,ns[i].y-S.camY);g.stroke();
    g.strokeStyle='#8a5870';g.lineWidth=4;g.beginPath();g.moveTo(t.side?W+4:-4,y0-2);for(i=0;i<ns.length;i++)g.lineTo(ns[i].x,ns[i].y-S.camY-2.5);g.stroke();
    for(i=0;i<ns.length;i++){var x=ns[i].x,y=ns[i].y-S.camY;
      for(var k=0;k<3;k++){var an=-1.57+(k-1)*1.5+(i%2?.5:-.3)+(k===1?0:3.14*(i%2));
        var cx=Math.cos(an),cy=Math.sin(an);g.fillStyle='#4d2a3c';g.beginPath();g.moveTo(x+cx*15,y+cy*15);g.lineTo(x-cy*4+cx*4,y+cx*4+cy*4);g.lineTo(x+cy*4+cx*4,y-cx*4+cy*4);g.fill();
        g.fillStyle='#ff6b7d';g.beginPath();g.arc(x+cx*14,y+cy*14,1.6,0,7);g.fill()}}
    var e=ns[ns.length-1];g.fillStyle='#b23a5e';g.beginPath();g.arc(e.x,e.y-S.camY,7,0,7);g.fill();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(e.x-2,e.y-S.camY-2,2.4,0,7);g.fill()}

  function drawFrog(g,f){
    var x=f.x,y=f.y-S.camY,d=f.side?-1:1,s=S.seed;if(y<-80||y>H+80)return;
    g.fillStyle='rgba(20,60,50,.18)';g.beginPath();g.ellipse(x+d*2,y+16,34,7,0,0,7);g.fill();
    g.fillStyle='#3f9a63';g.beginPath();g.ellipse(x-d*4,y+9,36,8,0,0,7);g.fill();g.fillStyle='#57b477';g.beginPath();g.ellipse(x-d*4,y+7,33,6,0,0,7);g.fill();
    if(f.st==='shoot'||f.st==='pull'||f.st==='back'){var mx=x+d*10,my=y-8;g.strokeStyle='#ff7fa0';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(mx,my);g.lineTo(f.tipx,f.tipy-S.camY);g.stroke();
      g.fillStyle='#ff9db8';g.beginPath();g.arc(f.tipx,f.tipy-S.camY,6,0,7);g.fill()}
    var sq=f.st==='aim'?1+Math.sin(f.t*30)*.04:1+Math.sin(T*2+f.y)*.03;
    g.save();g.translate(x,y);g.scale(d,1);
    g.fillStyle='#58b44f';g.beginPath();g.ellipse(-2,-4,17*sq,13/sq,0,0,7);g.fill();
    g.fillStyle='#d8f2a8';g.beginPath();g.ellipse(1,0,11,7,0,0,7);g.fill();
    g.fillStyle='#4aa043';g.beginPath();g.ellipse(-12,6,8,4,0,0,7);g.ellipse(7,7,7,3.5,0,0,7);g.fill();
    var open=f.st==='aim'?clamp(f.t/.4,0,1):(f.st==='idle'?0:1);
    g.fillStyle='#7a2f45';g.beginPath();g.ellipse(9,-7,6,1+5*open,0,0,7);g.fill();
    if(!open){g.strokeStyle='#2f6f2b';g.lineWidth=1.6;g.beginPath();g.arc(6,-9,7,.3,1.6);g.stroke()}
    var ax=(s.x-x)*d,ay=s.y-10-f.y,al=Math.hypot(ax,ay)||1;
    for(var i=0;i<2;i++){var ex=-7+i*10,ey=-16;g.fillStyle='#58b44f';g.beginPath();g.arc(ex,ey,6.6,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(ex,ey,4.8,0,7);g.fill();
      g.fillStyle=f.st==='aim'?'#c2264b':'#1f2a1c';g.beginPath();g.arc(ex+ax/al*2.2,ey+ay/al*2.2,2.3,0,7);g.fill()}
    g.restore();
    if(f.st==='aim'){g.fillStyle='#fff';g.font='20px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('!',x+d*4,y-30)}}

  function drawSeed(g,dt,a){
    var s=S.seed,x=s.x,y=s.y-S.camY,i;
    lag[0]+=(clamp(s.vx*.1,-13,13)-lag[0])*Math.min(1,dt*6);lag[1]+=(clamp(s.vy*.07,-8,9)-lag[1])*Math.min(1,dt*6);
    var hide=s.state==='plant'?clamp(s.pt/.5,0,1):0;if(hide>=1){return}
    g.save();g.translate(x,y);g.scale(1.3,1.3);g.translate(-x,-y);
    if(s.inv>0&&s.state==='fly'&&S.happy<=0&&Math.sin(T*40)>.3)g.globalAlpha=.45;
    var sc=1-hide*.6,hx=x-lag[0],hy=y-27*sc-lag[1],wet=s.wet>0;
    /* 걱정/기쁨 판단 */
    var worry=s.state==='web'||s.state==='tongue'||wet||y>H-120,j;
    if(!worry){for(i=0;i<S.webs.length&&!worry;i++)if(!S.webs[i].dead&&Math.hypot(S.webs[i].x-s.x,S.webs[i].y-s.y)<82)worry=true;
      for(i=0;i<S.thorns.length&&!worry;i++){var ns=S.thorns[i].nodes;for(j=0;j<ns.length;j++)if(Math.hypot(ns[j].x-s.x,ns[j].y-s.y)<70)worry=true}
      for(i=0;i<S.frogs.length&&!worry;i++)if(S.frogs[i].st!=='idle')worry=true;
      for(i=0;i<S.drops.length&&!worry;i++)if(Math.hypot(S.drops[i].x-s.x,S.drops[i].y-s.y+20)<60)worry=true}
    var glad=s.state==='plant'||S.happy>0;
    /* 솜털 낙하산 */
    g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.arc(hx-lag[0]*.5,hy-9,22*sc,0,7);g.fill();
    g.strokeStyle='#f5ecd2';g.lineWidth=1.6;g.beginPath();g.moveTo(x,y-9*sc);g.quadraticCurveTo(x-lag[0]*.3,y-18*sc,hx,hy);g.stroke();
    var n=[0,6,10,15][S.fluff],L=(wet?13:19)*sc;g.lineCap='round';
    for(i=0;i<n;i++){var an=-Math.PI/2+(n>1?(i/(n-1)-.5):0)*(wet?1.5:2.9)+Math.sin(T*3+i*1.7)*.07,
        ex=hx+Math.cos(an)*L-lag[0]*.85,ey=hy+Math.sin(an)*L-lag[1]*.85+(wet?5:0);
      g.strokeStyle=wet?'rgba(214,236,255,.95)':'rgba(255,255,255,.95)';g.lineWidth=1.1;g.beginPath();g.moveTo(hx,hy);g.quadraticCurveTo(hx+Math.cos(an)*L*.6,hy+Math.sin(an)*L*.6,ex,ey);g.stroke();
      g.fillStyle=wet?'#cfe9ff':'#fff';g.beginPath();g.arc(ex,ey,2.1,0,7);g.fill()}
    if(wet){g.fillStyle='#7cc6ff';g.beginPath();g.arc(hx+8,hy+4+((T*30)%8),2,0,7);g.arc(hx-7,hy+2+((T*30+4)%8),1.6,0,7);g.fill()}
    /* 몸통 */
    g.save();g.translate(x,y);g.rotate(clamp(s.vx*.004,-.4,.4));g.scale(sc,sc);
    g.fillStyle='rgba(30,50,40,.18)';g.beginPath();g.ellipse(2,3,9,12,0,0,7);g.fill();
    var gr=g.createLinearGradient(-8,-10,8,10);gr.addColorStop(0,'#c98d52');gr.addColorStop(1,'#8b5a30');
    g.fillStyle=gr;g.beginPath();g.moveTo(0,-12);g.bezierCurveTo(10,-10,10,7,0,13);g.bezierCurveTo(-10,7,-10,-10,0,-12);g.fill();
    g.fillStyle='rgba(255,236,200,.35)';g.beginPath();g.ellipse(-3,-4,2.6,5,.3,0,7);g.fill();
    blinkT-=dt;if(blinkT<0){blink=.13;blinkT=1.6+Math.random()*2.6}if(blink>0)blink-=dt;
    var lx=clamp(s.vx*.012,-1.2,1.2),ly=clamp(s.vy*.012,-1,1.2);
    if(glad){g.strokeStyle='#3b2416';g.lineWidth=1.5;g.beginPath();g.arc(-3.6,-1.5,2.3,3.5,5.9);g.stroke();g.beginPath();g.arc(3.6,-1.5,2.3,3.5,5.9);g.stroke();
      g.fillStyle='#7a2f2f';g.beginPath();g.arc(0,3.2,2.8,0,3.14);g.fill();g.fillStyle='rgba(255,140,150,.6)';g.beginPath();g.arc(-6,2,1.7,0,7);g.arc(6,2,1.7,0,7);g.fill()}
    else{if(blink>0){g.strokeStyle='#3b2416';g.lineWidth=1.4;g.beginPath();g.moveTo(-6,-2);g.lineTo(-1.6,-2);g.moveTo(1.6,-2);g.lineTo(6,-2);g.stroke()}
      else{g.fillStyle='#fff';g.beginPath();g.arc(-3.7,-2,worry?3.4:3,0,7);g.arc(3.7,-2,worry?3.4:3,0,7);g.fill();
        g.fillStyle='#2b1a10';g.beginPath();g.arc(-3.7+lx,-2+ly,worry?1.2:1.7,0,7);g.arc(3.7+lx,-2+ly,worry?1.2:1.7,0,7);g.fill()}
      g.strokeStyle='#3b2416';g.lineWidth=1.3;
      if(worry){g.beginPath();g.moveTo(-6.5,-7.5);g.lineTo(-2,-6);g.moveTo(6.5,-7.5);g.lineTo(2,-6);g.stroke();g.fillStyle='#5a2a22';g.beginPath();g.ellipse(0,4.6,1.7,2.2,0,0,7);g.fill()}
      else{g.beginPath();g.arc(0,3,2.2,.3,2.84);g.stroke()}}
    g.restore();g.globalAlpha=1;
    if(s.state==='tongue'){g.strokeStyle='#ff6b6b';g.lineWidth=3;g.beginPath();g.arc(x,y-10,30,-1.57,-1.57+6.283*(1-clamp(s.tear/.45,0,1)));g.stroke()}
    g.restore()}

  function txt(g,s,x,y,size,col){g.font=size+'px Jua, system-ui, sans-serif';g.textAlign='center';g.lineWidth=4;g.strokeStyle='rgba(28,70,60,.55)';g.lineJoin='round';g.strokeText(s,x,y);g.fillStyle=col||'#fff';g.fillText(s,x,y)}

  function draw(g,a,dt){
    dt=dt||.016;if(!S)return;if(S.over)T+=dt;
    var i,j,cam=S.camY,camDy=prevCam-cam;prevCam=cam;
    var night=clamp(1-S.day/14,0,1);
    /* 하늘 */
    var sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#f6f1c8');sky.addColorStop(.35,'#b9e2cc');sky.addColorStop(1,'#62b3a4');
    g.fillStyle=sky;g.fillRect(-20,-20,W+40,H+40);
    /* 햇살 */
    g.save();g.translate(40,-30);for(i=0;i<5;i++){g.rotate(.17+Math.sin(T*.25+i)*.02);var rg=g.createLinearGradient(0,0,0,700);rg.addColorStop(0,'rgba(255,250,210,.34)');rg.addColorStop(1,'rgba(255,250,210,0)');
      g.fillStyle=rg;g.beginPath();g.moveTo(0,0);g.lineTo(-30-i*6,760);g.lineTo(34+i*8,760);g.fill()}g.restore();
    /* 시차 레이어 2장 */
    var o1=((-cam*.28)%H+H)%H,o2=((-cam*.6)%H+H)%H;
    if(tiles){g.drawImage(tiles[0],Math.sin(T*.3)*4,o1-H);g.drawImage(tiles[0],Math.sin(T*.3)*4,o1);
      g.drawImage(tiles[1],Math.sin(T*.45+1)*3,o2-H);g.drawImage(tiles[1],Math.sin(T*.45+1)*3,o2)}
    drawWalls(g,dt);
    /* 구름 */
    for(i=0;i<S.clouds.length;i++){var cl=S.clouds[i],cy=cl.y-cam,cx=cl.x+Math.sin(T*.6+cl.y)*4;if(cy<-60||cy>H+60)continue;
      g.fillStyle='rgba(60,80,110,.16)';g.beginPath();g.ellipse(cx+4,cy+12,46,10,0,0,7);g.fill();
      g.fillStyle='#8fa3bd';g.beginPath();g.arc(cx-26,cy+2,15,0,7);g.arc(cx-6,cy-7,20,0,7);g.arc(cx+18,cy-2,17,0,7);g.arc(cx+34,cy+5,11,0,7);g.fill();
      g.fillStyle='#b9c8dc';g.beginPath();g.arc(cx-10,cy-11,13,0,7);g.arc(cx+14,cy-7,10,0,7);g.fill();
      g.strokeStyle='#4d5f7a';g.lineWidth=1.6;g.beginPath();g.arc(cx-8,cy+1,3,.2,2.94);g.stroke();g.beginPath();g.arc(cx+10,cy+1,3,.2,2.94);g.stroke()}
    var tg=target(S);
    for(i=0;i<S.patches.length;i++)drawPatch(g,S.patches[i],dt,S.patches[i]===tg);
    for(i=0;i<S.webs.length;i++)drawWeb(g,S.webs[i]);
    for(i=0;i<S.thorns.length;i++)drawThorn(g,S.thorns[i]);
    for(i=0;i<S.frogs.length;i++)drawFrog(g,S.frogs[i]);
    /* 꽃가루 */
    for(i=0;i<S.pollen.length;i++){var p=S.pollen[i],py2=p.y-cam;if(py2<-20||py2>H+20)continue;var pu=1+Math.sin(p.ph*2)*.15;
      g.fillStyle='rgba(255,236,130,.3)';g.beginPath();g.arc(p.x,py2,10*pu,0,7);g.fill();
      g.fillStyle='#ffd84a';g.beginPath();g.arc(p.x,py2,4.6,0,7);g.fill();g.fillStyle='#fff8d0';g.beginPath();g.arc(p.x-1.4,py2-1.4,1.7,0,7);g.fill()}
    /* 빗방울 */
    for(i=0;i<S.drops.length;i++){var d=S.drops[i],dy2=d.y-cam,an=Math.atan2(d.vy,d.vx)-1.57;g.save();g.translate(d.x,dy2);g.rotate(an);
      g.fillStyle='#5db4f0';g.beginPath();g.moveTo(0,-11);g.quadraticCurveTo(6,2,0,5);g.quadraticCurveTo(-6,2,0,-11);g.fill();g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.arc(-1.5,1,1.3,0,7);g.fill();g.restore()}
    /* 떠다니는 꽃잎·잎 (바람에 밀린다) */
    var live=!S.over;
    for(i=0;i<petals.length;i++){var pt=petals[i],w=sample(S,pt.x,pt.y+cam);
      if(live){pt.vx+=(w[0]*.9+Math.sin(T+i)*8-pt.vx)*2.2*dt;pt.vy+=(w[1]*.9+14-pt.vy)*2.2*dt;pt.x+=pt.vx*dt;pt.y+=pt.vy*dt+camDy;pt.a+=(1+Math.abs(pt.vx)*.03)*dt*2;
        if(pt.y>H+12){pt.y=-10;pt.x=Math.random()*W}if(pt.y<-14)pt.y=H+10;if(pt.x<-12)pt.x=W+10;if(pt.x>W+12)pt.x=-10}
      g.save();g.translate(pt.x,pt.y);g.rotate(pt.a);g.globalAlpha=.85;g.fillStyle=pt.leaf?'#7cc47a':pt.c;g.beginPath();g.ellipse(0,0,5.5*pt.s,(pt.leaf?2.4:3.4)*pt.s*(.5+.5*Math.abs(Math.cos(pt.a*.7))),0,0,7);g.fill();g.restore()}
    g.globalAlpha=1;
    /* 바람 리본 */
    g.lineCap='round';
    for(i=ribs.length-1;i>=0;i--){var rb=ribs[i],pts=rb.pts,alive=false;
      for(j=0;j<pts.length;j++){var q1=pts[j];if(live){q1.t+=dt;var ww=sample(S,q1.x,q1.y);q1.x+=ww[0]*dt*.35;q1.y+=ww[1]*dt*.35}if(q1.t<1.5)alive=true}
      if(!alive&&rb!==curRib){ribs.splice(i,1);continue}
      for(var pass=0;pass<2;pass++)for(j=1;j<pts.length;j++){var A=pts[j-1],B=pts[j],k=1-B.t/1.5;if(k<=0)continue;
        var nx=-(B.y-A.y),ny=B.x-A.x,nl=Math.hypot(nx,ny)||1,wv=Math.sin(j*.9-T*9)*3.5*(1-k*.5),wv0=Math.sin((j-1)*.9-T*9)*3.5*(1-k*.5),tp=Math.min(1,j/4)*Math.min(1,(pts.length-j)/3+.4);
        g.strokeStyle=pass?'rgba(255,255,255,'+(.75*k)+')':'rgba(225,250,255,'+(.36*k)+')';g.lineWidth=(pass?6:26)*k*tp+.5;
        g.beginPath();g.moveTo(A.x+nx/nl*wv0,A.y-cam+ny/nl*wv0);g.lineTo(B.x+nx/nl*wv,B.y-cam+ny/nl*wv);g.stroke()}}
    /* 바람 입자: 바람장을 따라 흐른다 */
    for(i=0;i<wp.length;i++){var P=wp[i],w2=sample(S,P.x,P.y+cam);P.px=P.x;P.py=P.y;
      if(live){P.x+=(w2[0]+Math.sin(T*.7+i)*7)*dt;P.y+=(w2[1]-5+Math.cos(T*.5+i*2)*5)*dt+camDy;P.l-=dt}
      var sp=Math.hypot(w2[0],w2[1]);
      if(P.l<=0||P.x<-6||P.x>W+6||P.y<-6||P.y>H+6){P.x=Math.random()*W;P.y=Math.random()*H;P.l=1.5+Math.random()*2.5;P.px=P.x;P.py=P.y;continue}
      if(sp>22){var al=Math.min(.9,.15+sp/260),tx=P.x-w2[0]*.075,ty=P.y-w2[1]*.075;g.strokeStyle='rgba(255,255,255,'+al+')';g.lineWidth=1.2+Math.min(1.8,sp/200);g.beginPath();g.moveTo(tx,ty);g.lineTo(P.x,P.y);g.stroke()}
      else{g.fillStyle='rgba(255,252,224,'+(.22+.2*Math.sin(P.l*3+i))+')';g.beginPath();g.arc(P.x,P.y,1.2+(i%3)*.4,0,7);g.fill()}}
    drawSeed(g,dt,a);
    /* 해질녘 */
    if(night>0){g.fillStyle='rgba(255,140,80,'+(night*.16)+')';g.fillRect(-20,-20,W+40,H+40);g.fillStyle='rgba(44,36,96,'+(night*night*.42)+')';g.fillRect(-20,-20,W+40,H+40)}
    /* 다음 흙 방향 */
    if(tg&&tg.y-cam<52){var ax=clamp(tg.x,24,W-24),ay=78+Math.sin(T*5)*3;g.fillStyle='#fff7d6';g.strokeStyle='rgba(60,90,70,.55)';g.lineWidth=1.5;g.beginPath();g.moveTo(ax,ay-10);g.lineTo(ax+9,ay+2);g.lineTo(ax-9,ay+2);g.closePath();g.fill();g.stroke();
      g.fillStyle='#8a5d3e';g.beginPath();g.ellipse(ax,ay+9,9,3.5,0,0,7);g.fill()}
    /* HUD: 솜털 · 햇빛 · 바람 기력 */
    for(i=0;i<3;i++){var fx=20+i*22,fy=48,on=i<S.fluff;g.globalAlpha=on?1:.28;g.strokeStyle='#fff';g.lineWidth=1.2;
      for(j=0;j<7;j++){var a3=j*.898;g.beginPath();g.moveTo(fx,fy);g.lineTo(fx+Math.cos(a3)*7.5,fy+Math.sin(a3)*7.5);g.stroke()}
      g.fillStyle=on?'#fff':'#cfe';g.beginPath();g.arc(fx,fy,2.6,0,7);g.fill()}
    g.globalAlpha=1;
    var bx=118,bw=150,by=44,fr=clamp(S.day/DAYMAX,0,1),low=S.day<8;
    g.fillStyle='rgba(30,70,60,.3)';rr(g,bx,by,bw,8,4);g.fill();
    g.fillStyle=low&&Math.sin(T*10)>0?'#ff8d6b':'#ffd766';rr(g,bx,by,Math.max(8,bw*fr),8,4);g.fill();
    g.fillStyle='#ffc93c';g.beginPath();g.arc(bx-11,by+4,6,0,7);g.fill();g.strokeStyle='#ffc93c';g.lineWidth=1.6;
    for(j=0;j<8;j++){var a4=j*.785+T*.5;g.beginPath();g.moveTo(bx-11+Math.cos(a4)*8,by+4+Math.sin(a4)*8);g.lineTo(bx-11+Math.cos(a4)*10.5,by+4+Math.sin(a4)*10.5);g.stroke()}
    var sx=34,sy=H-22,sw=112;g.fillStyle='rgba(30,70,60,.32)';rr(g,sx,sy,sw,9,4.5);g.fill();
    g.fillStyle=S.tired?(Math.sin(T*14)>0?'#ff8d8d':'#ffc2c2'):'#dff8ff';rr(g,sx,sy,Math.max(9,sw*S.stam),9,4.5);g.fill();
    g.strokeStyle='#fff';g.lineWidth=2;g.lineCap='round';g.beginPath();g.moveTo(10,sy+2);g.quadraticCurveTo(22,sy-3,26,sy+2);g.moveTo(12,sy+8);g.quadraticCurveTo(20,sy+4,28,sy+8);g.stroke();
    /* 첫 판 안내 */
    if(S.planted===0&&!S.over){var hx=180,hy=H-66;
      txt(g,ko?'화면을 쓸어 바람을 일으켜요 — 흙까지 살랑!':'Swipe to make wind — blow the seed to the soil!',hx,hy,15,'#fff');
      if(S.strokes===0){var ph=(T*.8)%1,s0=S.seed,gx0=s0.x-30+ph*50,gy0=s0.y-cam+70-ph*90;g.globalAlpha=ph<.15?ph/.15:ph>.8?(1-ph)/.2:1;
        g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=6;g.beginPath();g.moveTo(s0.x-30,s0.y-cam+70);g.lineTo(gx0,gy0);g.stroke();
        g.fillStyle='#fff';g.beginPath();g.arc(gx0,gy0,9,0,7);g.fill();g.strokeStyle='rgba(60,90,70,.6)';g.lineWidth=2;g.stroke();g.globalAlpha=1}}
    if(S.over){fade=Math.min(1,fade+dt*2);var m={fell:ko?'바람이 멎어 떨어졌어요':'The wind died down…',night:ko?'해가 졌어요':'The sun has set',web:ko?'거미줄에 걸렸어요':'Caught in the web',frog:ko?'개구리가 꿀꺽!':'Gulp! The frog got it',thorn:ko?'솜털이 다 빠졌어요':'All the fluff is gone'}[S.why]||'';
      g.globalAlpha=fade;txt(g,m,180,96,18,'#fff');txt(g,(ko?'심은 꽃 ':'Flowers planted: ')+S.planted,180,120,15,'#fff3a8');g.globalAlpha=1}
  }
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

  SG.run({id:'wind-seed',title:{ko:'바람이 되어',en:'Be the Wind'},
    how:{ko:'당신은 바람! 화면을 쓸어 민들레 씨앗 포포를 흙까지 살랑살랑 밀어 주세요.',en:'You are the wind! Swipe to paint gusts and nudge Popo the dandelion seed up to soft soil.'},
    init:init,update:update,draw:draw});
  window.__windSeed=function(){return S};
})();
