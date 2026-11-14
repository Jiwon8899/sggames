/* 비구름 목장 (Rain Maker) — 작은 농장의 날씨가 되어 구름을 몰고, 합치고, 나눠 밭에 딱 알맞게 비를 내린다.
   시뮬레이션(구름·밭·바람·새·호수 안개)은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,GROUND=480,SKY_TOP=88,SKY_BOT=318,PW=54,
      RAIN_M=1.75,STOP_M=1.35,THUNDER_M=5.5,LO=.3,HI=.85,FLOOD=1,GROW=2.3,DAYLEN=42,MAXC=8;

  /* ---------- 날 데이터 ----------
     plots:[x, kind('c' 작물 | 'g' 온실)]  clouds:[x,y,m]  spawn/mist/wind/birds: 주기(초, 0=없음) */
  var DAYS=[
    {plots:[[205]],clouds:[[305,150,1.8]],quota:1,season:0,mist:9,m0:0,
      hint:{ko:'구름을 끌어 밭에 비를 내려요',en:'Drag clouds to water the field'}},
    {plots:[[205]],clouds:[[80,150,1],[310,196,1]],quota:1,season:0,mist:9,m0:.1,
      hint:{ko:'구름 둘을 맞붙이면 비구름이 돼요',en:'Push two clouds together to make rain'}},
    {plots:[[150],[270]],clouds:[[210,130,4]],quota:2,season:0,
      hint:{ko:'비가 넘치면 밭이 잠겨요! 제때 옮겨요',en:'Too much rain floods a field! Move on in time'}},
    {plots:[[120],[205],[290]],clouds:[[40,128,5]],quota:3,season:1,
      hint:{ko:'구름을 아래로 쓸면 둘로 나뉘어요',en:'Swipe down through a cloud to split it'}},
    {plots:[[115],[205,'g'],[295]],clouds:[[50,150,2.5],[300,110,.9],[340,200,.9]],quota:2,season:1,spawn:6,mist:8,
      hint:{ko:'유리 온실엔 비를 피하세요 (햇빛만 좋아해요)',en:'Keep rain off the greenhouse - it loves sun only'}},
    {plots:[[120],[205],[290]],clouds:[[40,150,2],[346,130,2],[205,200,1]],quota:3,season:1,spawn:5,mist:7,wind:7,
      hint:{ko:'바람 줄무늬가 보이면 구름을 꽉 잡아요',en:'See wind streaks? Hold your clouds steady'}},
    {plots:[[120],[205],[290]],clouds:[[40,250,1],[200,160,1]],quota:3,season:2,mist:3.6,
      hint:{ko:'가을엔 구름이 귀해요. 호수 안개를 모아요',en:'Autumn is dry - gather mist from the lake'}},
    {plots:[[120],[205],[290]],clouds:[[40,140,3],[346,170,2],[205,200,1]],quota:3,season:1,spawn:5,mist:6,birds:8,
      hint:{ko:'아주 큰 먹구름의 천둥이 새를 쫓아요',en:'A huge storm cloud\'s thunder shoos birds'}},
    {plots:[[100],[166],[232],[298]],clouds:[[40,140,2],[200,170,1],[300,130,1]],quota:4,season:0,spawn:3,mist:6,wind:9,
      hint:{ko:'봄엔 구름이 넉넉해요. 밭 네 곳을 돌봐요',en:'Spring is cloudy - tend all four fields'}},
    {plots:[[100],[166,'g'],[232],[298]],clouds:[[40,140,2],[346,150,2],[200,200,1]],quota:3,season:1,spawn:4.5,mist:6,wind:8,birds:10,dry:1.15,
      hint:{ko:'온실, 바람, 새… 전부 다 해내요!',en:'Greenhouse, wind, birds - handle it all!'}}
  ];
  var PX={1:[205],2:[150,270],3:[120,205,290],4:[100,166,232,298]};

  function mkRng(seed){var s=(seed*2654435761>>>0)||1;return function(){s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}

  function getDay(n){
    if(n<DAYS.length){var d=DAYS[n];return {n:n,plots:d.plots.map(function(p){return {x:p[0],kind:p[1]||'c'}}),
      clouds:d.clouds.map(function(c){return c.slice()}),quota:d.quota,season:d.season,spawn:d.spawn||0,mist:d.mist||0,
      wind:d.wind||0,birds:d.birds||0,dry:d.dry||1,hint:d.hint,m0:d.m0!=null?d.m0:.16,seed:n*7+1}}
    var r=mkRng(n*977+13),k=n-DAYS.length,season=Math.floor(r()*3),np=r()<.45?3:4,xs=PX[np],gh=r()<.4?Math.floor(r()*np):-1,
        plots=xs.map(function(x,i){return {x:x,kind:i===gh?'g':'c'}}),crops=np-(gh>=0?1:0),
        clouds=[[r()<.5?40:346,120+r()*80,2]];
    for(var i=0;i<1+Math.floor(r()*3);i++)clouds.push([30+r()*300,110+r()*150,1]);
    return {n:n,plots:plots,clouds:clouds,quota:crops+(k>=8?1:0),season:season,
      spawn:[3.4,5,9][season],mist:4+r()*3,wind:r()<.55?6+r()*4:0,birds:r()<.5?8+r()*4:0,
      dry:1+Math.min(.45,k*.015),hint:null,m0:.16,seed:n*7+1}}

  function rainRate(m){return Math.max(.12,.14+.1*(m-RAIN_M))}
  function cloudR(m){return 22*Math.sqrt(Math.max(.3,m))}
  var RW=.56;
  function newCloud(s,x,y,m){var c={id:s.nid++,x:x,y:y,vx:0,vy:0,m:m,rain:m>=RAIN_M,imm:0,tx:null,ty:null,
      ax:0,ay:0,thT:1.2,pulse:0,seed:s.rng()*100,born:0};s.clouds.push(c);return c}

  function newSim(n,rng){
    var cfg=getDay(n),s={n:n,cfg:cfg,rng:rng||mkRng(cfg.seed),t:0,clouds:[],nid:1,harvests:0,floods:0,quota:cfg.quota,
      cleared:false,ev:[],bolts:[],birds:null,birdT:cfg.birds?cfg.birds*.8:0,
      wind:{st:'calm',t:cfg.wind?cfg.wind*.7:0,dir:1,f:0},spawnT:cfg.spawn?cfg.spawn*.6:0,mistT:cfg.mist?cfg.mist*.5:0};
    s.plots=cfg.plots.map(function(p,i){return {i:i,x:p.x,w:PW,kind:p.kind,M:p.kind==='g'?0:cfg.m0,p:0,flooded:false,
      wilt:0,wetT:0,rain:0,shade:false,stage:0,popT:0,veg:i%3}});
    cfg.clouds.forEach(function(c){newCloud(s,c[0],c[1],c[2])});
    return s}

  function noon(s){var ph=Math.min(1,s.t/DAYLEN);return Math.sin(Math.PI*ph)}
  function cloudById(s,id){for(var i=0;i<s.clouds.length;i++)if(s.clouds[i].id===id)return s.clouds[i];return null}

  /* ---------- 조작 (사람과 봇이 같은 함수를 쓴다) ---------- */
  function setTarget(s,id,x,y){var c=cloudById(s,id);if(c){c.tx=x;c.ty=y}}
  function release(s,id){var c=cloudById(s,id);if(c){c.tx=null;c.ty=null}}
  function push(s,id,ax,ay){var c=cloudById(s,id);if(c){c.ax+=ax;c.ay+=ay}}
  function split(s,id){var c=cloudById(s,id);if(!c||c.m<1.2)return null;
    var h=c.m/2,r=cloudR(h),a=newCloud(s,c.x-r*.6,c.y,h),b=newCloud(s,c.x+r*.6,c.y,h);
    a.vx=c.vx-150;b.vx=c.vx+150;a.vy=b.vy=c.vy;a.imm=b.imm=1;a.rain=b.rain=c.rain&&h>=STOP_M||h>=RAIN_M;
    a.pulse=b.pulse=.6;s.clouds.splice(s.clouds.indexOf(c),1);s.ev.push({t:'split',x:c.x,y:c.y,a:a.id,b:b.id,from:id});return [a.id,b.id]}
  function dash(s,id,dx,dy){var c=cloudById(s,id);if(!c)return null;var best=null,bd=1e9;
    s.clouds.forEach(function(o){if(o===c)return;var ox=o.x-c.x,oy=o.y-c.y,d=Math.hypot(ox,oy);
      if(d<1||(ox*dx+oy*dy)/d<.25)return;if(d<bd){bd=d;best=o}});
    if(!best)return null;var ux=(best.x-c.x)/bd,uy=(best.y-c.y)/bd,v=Math.min(520,bd*4+120);c.vx=ux*v;c.vy=uy*v;c.tx=c.ty=null;c.dashId=best.id;c.dashT=1.4;
    s.ev.push({t:'dash',id:id});return best.id}

  /* ---------- 한 틱 ---------- */
  function step(s,dt){
    var cfg=s.cfg,i,j,c,o,p,nn=noon(s);s.t+=dt;
    /* 바람 */
    var wd=s.wind;if(cfg.wind){wd.t-=dt;
      if(wd.st==='calm'&&wd.t<=0){wd.st='warn';wd.t=1.6;wd.dir=s.rng()<.5?-1:1;s.ev.push({t:'windwarn',dir:wd.dir})}
      else if(wd.st==='warn'&&wd.t<=0){wd.st='gust';wd.t=2.6;s.ev.push({t:'gust',dir:wd.dir})}
      else if(wd.st==='gust'&&wd.t<=0){wd.st='calm';wd.t=cfg.wind*(.8+s.rng()*.4)}}
    wd.f+=((wd.st==='gust'?wd.dir:0)-wd.f)*Math.min(1,dt*3);
    /* 구름 생성 */
    if(cfg.spawn){s.spawnT-=dt;if(s.spawnT<=0){s.spawnT=cfg.spawn*(.8+s.rng()*.4);
      if(s.clouds.length<MAXC){var left=s.rng()<.5,nc=newCloud(s,left?18:W-18,SKY_TOP+20+s.rng()*120,1);nc.vx=left?90:-90;nc.born=1;
        s.ev.push({t:'spawn',x:nc.x,y:nc.y})}}}
    if(cfg.mist){s.mistT-=dt;if(s.mistT<=0){s.mistT=cfg.mist*(.85+s.rng()*.3);
      if(s.clouds.length<MAXC){var mc=newCloud(s,34,SKY_BOT+30,1);mc.vy=-70;mc.born=1;mc.mist=1;s.ev.push({t:'mist',x:34,y:SKY_BOT})}}}
    /* 구름 움직임 */
    for(i=0;i<s.clouds.length;i++){c=s.clouds[i];var w=.7+.3*c.m,ax=c.ax,ay=c.ay,r=cloudR(c.m);c.ax=c.ay=0;
      if(c.dashId){var dt2=cloudById(s,c.dashId);c.dashT-=dt;if(!dt2||c.dashT<=0||c.tx!=null)c.dashId=0;
        else{ax+=(dt2.x-c.x)*40/w-c.vx*6/Math.sqrt(w);ay+=(dt2.y-c.y)*40/w-c.vy*6/Math.sqrt(w)}}
      if(c.dashId){}else if(c.tx!=null){ax+=(c.tx-c.x)*34/w-c.vx*9/Math.sqrt(w);ay+=(c.ty-c.y)*34/w-c.vy*9/Math.sqrt(w)}
      else{ax-=c.vx*2.2;ay-=c.vy*(c.mist?.4:2)}
      ax+=wd.f*170/w;
      c.vx+=ax*dt;c.vy+=ay*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;
      var minx=r*.55,maxx=W-r*.55;if(c.x<minx){c.x=minx;if(c.vx<0)c.vx*=-.2}if(c.x>maxx){c.x=maxx;if(c.vx>0)c.vx*=-.2}
      if(c.y<SKY_TOP){c.y=SKY_TOP;if(c.vy<0)c.vy=0}
      if(c.y>SKY_BOT&&!(c.mist&&c.vy<0)){c.y=SKY_BOT;if(c.vy>0)c.vy=0}
      if(c.mist&&c.y<SKY_BOT-60)c.mist=0;
      if(c.imm>0)c.imm-=dt;if(c.pulse>0)c.pulse-=dt*1.6;if(c.born>0)c.born-=dt*1.5;c.thT-=dt}
    /* 합치기 */
    for(i=0;i<s.clouds.length;i++)for(j=i+1;j<s.clouds.length;j++){c=s.clouds[i];o=s.clouds[j];
      if(c.imm>0||o.imm>0)continue;var d=Math.hypot(c.x-o.x,c.y-o.y);
      if(d<(cloudR(c.m)+cloudR(o.m))*.55){var big=c.m>=o.m?c:o,sm=big===c?o:c,M=c.m+o.m;
        big.x=(c.x*c.m+o.x*o.m)/M;big.y=(c.y*c.m+o.y*o.m)/M;big.vx=(c.vx*c.m+o.vx*o.m)/M*.35;big.vy=(c.vy*c.m+o.vy*o.m)/M*.35;big.dashId=0;
        if(big.tx==null&&sm.tx!=null){big.tx=sm.tx;big.ty=sm.ty}
        var was=big.m>=RAIN_M||big.rain;big.m=M;big.rain=big.rain||sm.rain||M>=RAIN_M;big.pulse=1;big.mist=0;
        s.clouds.splice(s.clouds.indexOf(sm),1);
        s.ev.push({t:'merge',x:big.x,y:big.y,id:big.id,gone:sm.id,m:M,newRain:!was&&M>=RAIN_M,thunder:M>=THUNDER_M&&big.m-sm.m<THUNDER_M});
        i=-1;break}}
    /* 비, 증발, 천둥 */
    s.plots.forEach(function(p){p.rain=0;p.shade=false});
    s.bolts.length=0;
    for(i=s.clouds.length-1;i>=0;i--){c=s.clouds[i];var cr=cloudR(c.m);
      if(c.m>=RAIN_M)c.rain=true;else if(c.m<STOP_M)c.rain=false;
      var rw=cr*RW;
      for(j=0;j<s.plots.length;j++){p=s.plots[j];var ov=Math.min(c.x+rw,p.x+p.w/2)-Math.max(c.x-rw,p.x-p.w/2);
        if(ov>p.w*.25)p.shade=true;
        if(c.rain&&ov>0)p.rain+=rainRate(c.m)*Math.min(1,ov/(2*rw))}
      if(c.rain){c.m-=rainRate(c.m)*.4*dt}
      else{c.m-=.008*(.3+nn)*dt;if(c.m<.35){s.clouds.splice(i,1);s.ev.push({t:'fade',x:c.x,y:c.y,id:c.id});continue}}
      if(c.m>=THUNDER_M&&c.thT<=0){c.thT=1.3+s.rng()*.5;var bx=c.x+(s.rng()-.5)*cr*.6;s.bolts.push(bx);
        s.ev.push({t:'bolt',x:bx,y:c.y+cr*.4,id:c.id})}}
    /* 밭 */
    for(j=0;j<s.plots.length;j++){p=s.plots[j];if(p.popT>0)p.popT-=dt;
      if(p.kind==='g'){
        if(p.rain>0){p.wetT+=dt;if(p.wetT>.35&&p.wilt<=0){p.wilt=3;p.p=Math.max(0,p.p-1);s.ev.push({t:'wilt',i:j,x:p.x})}
          if(p.wilt>0)p.wilt=Math.max(p.wilt,1.5)}
        else p.wetT=Math.max(0,p.wetT-dt*.5);
        if(p.wilt>0)p.wilt-=dt;else if(!p.shade)p.p+=dt/(GROW*1.6)}
      else{
        var ev=.04*(.55+.9*nn)*cfg.dry*(p.flooded?1.9:1);
        p.M+=p.rain*dt-ev*dt;if(p.M<0)p.M=0;
        if(!p.flooded&&p.M>=FLOOD){p.flooded=true;p.p=Math.max(0,p.p-1);s.floods++;s.ev.push({t:'flood',i:j,x:p.x})}
        else if(p.flooded&&p.M<.32){p.flooded=false;s.ev.push({t:'dry',i:j,x:p.x})}
        if(!p.flooded){if(p.M>=LO&&p.M<=HI)p.p+=dt/GROW;
          else if(p.M<LO)p.p=Math.max(Math.floor(p.p),p.p-.07*dt)}}
      var st=Math.min(2,Math.floor(p.p));if(st>p.stage){p.stage=st;p.popT=.5;s.ev.push({t:'grow',i:j,x:p.x,stage:st})}
      else if(st<p.stage)p.stage=st;
      if(p.p>=3){var perfect=p.kind==='c'&&p.M>=.45&&p.M<=.72;p.p=0;p.stage=0;p.popT=.5;
        s.ev.push({t:'harvest',i:j,x:p.x,perfect:perfect,veg:p.veg,kind:p.kind});if(p.kind==='c')s.harvests++;p.veg=(p.veg+1)%3;
        if(s.harvests>=s.quota&&!s.cleared){s.cleared=true;s.ev.push({t:'clear'})}}}
    /* 새 떼 */
    var b=s.birds;
    if(cfg.birds&&!b){s.birdT-=dt;if(s.birdT<=0){var bi=-1,bp=-1;
        s.plots.forEach(function(q,k){if(q.kind==='c'&&!q.flooded&&q.p>=.5&&q.p>bp){bp=q.p;bi=k}});
        if(bi>=0){s.birds=b={st:'warn',t:2.2,i:bi,x:s.plots[bi].x,eat:0,life:14};s.ev.push({t:'birdwarn',i:bi,x:b.x})}
        else s.birdT=1}}
    if(b){b.t-=dt;
      if(b.st==='warn'&&b.t<=0){b.st='land';s.ev.push({t:'land',i:b.i,x:b.x})}
      else if(b.st==='land'){b.life-=dt;b.eat+=dt;var bp2=s.plots[b.i];
        if(b.eat>=3.5){b.eat=0;if(bp2.p>0){bp2.p=Math.max(0,Math.floor(bp2.p)-1+Math.min(.99,bp2.p%1));
          s.ev.push({t:'peck',i:b.i,x:b.x})}}
        if(b.life<=0){b.st='leave';b.t=1.5}}
      if(b.st!=='leave')for(i=0;i<s.bolts.length;i++)if(Math.abs(s.bolts[i]-b.x)<46){b.st='leave';b.t=1.5;s.ev.push({t:'scatter',x:b.x,i:b.i});break}
      if(b.st==='leave'&&b.t<=0){s.birds=null;s.birdT=cfg.birds*(.8+s.rng()*.4)}}
  }

  /* 고정 간격으로 진행 */
  function advance(s,dt){s.acc=(s.acc||0)+dt;var n=0;while(s.acc>=1/60&&n<6){step(s,1/60);s.acc-=1/60;n++}if(n>=6)s.acc=0}

  var API={DAYS:DAYS,getDay:getDay,newSim:newSim,step:step,advance:advance,setTarget:setTarget,release:release,push:push,
    split:split,dash:dash,cloudR:cloudR,rainRate:rainRate,RW:RW,mkRng:mkRng,cloudById:cloudById,
    C:{W:W,H:H,GROUND:GROUND,SKY_TOP:SKY_TOP,SKY_BOT:SKY_BOT,RAIN_M:RAIN_M,STOP_M:STOP_M,THUNDER_M:THUNDER_M,LO:LO,HI:HI,FLOOD:FLOOD,PW:PW}};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  if(typeof SG==='undefined')return;
  var C=API.C;
  /* ---------- 게임 ---------- */
  var sim,dayN,T,mode,modeT,tG=0,held=null,gox=0,goy=0,stroke=null,sel=null,kb=false,warned=0,score0=0,
      fx,splash,vegs,flash,bolts,mole,dayFl,banner,wisps,hillOff=0,mill=0,lastDown=false;
  var keys={l:false,r:false,u:false,d:false},kq=[];
  function playing(){return window.__sg&&window.__sg.state().playing}
  if(!window.__rainMakerKeys){window.__rainMakerKeys=true;
    var kf=function(e,v){var c=e.code;
      if(c==='ArrowLeft'||c==='KeyA')keys.l=v;else if(c==='ArrowRight'||c==='KeyD')keys.r=v;
      else if(c==='ArrowUp'||c==='KeyW')keys.u=v;else if(c==='ArrowDown'||c==='KeyS')keys.d=v;
      if(!v||!playing())return;
      if(c==='Tab'||c==='KeyE'||c==='KeyQ'){e.preventDefault();if(!e.repeat)kq.push({t:'cyc',d:(e.shiftKey&&c==='Tab')||c==='KeyQ'?-1:1})}
      else if(c==='Space'&&!e.repeat)kq.push({t:'split'});
      else if(e.shiftKey&&!e.repeat&&/^(Arrow|Key[WASD])/.test(c)){var dx=/Left|KeyA/.test(c)?-1:/Right|KeyD/.test(c)?1:0,
          dy=c.match(/Up|KeyW/)?-1:c.match(/Down|KeyS/)?1:0;if(dx||dy)kq.push({t:'dash',dx:dx,dy:dy})}
      else if(/^(Arrow|Key[WASD])/.test(c))kq.push({t:'move'})};
    window.addEventListener('keydown',function(e){kf(e,true)});
    window.addEventListener('keyup',function(e){kf(e,false)});
    window.addEventListener('blur',function(){keys.l=keys.r=keys.u=keys.d=false})}

  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function lerp(a,b,t){return a+(b-a)*t}
  function hex(h){return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]}
  function mix(a,b,t){var x=hex(a),y=hex(b);return 'rgb('+Math.round(lerp(x[0],y[0],t))+','+Math.round(lerp(x[1],y[1],t))+','+Math.round(lerp(x[2],y[2],t))+')'}
  function mix3(a,b,c,t){return t<.5?mix(a,b,t*2):mix(b,c,(t-.5)*2)}

  function load(n){dayN=n;sim=newSim(n,mkRng(n*31+Math.floor(Math.random()*1e6)));mode='play';modeT=0;held=null;stroke=null;
    sel=null;var big=null;sim.clouds.forEach(function(c){if(!big||c.m>big.m)big=c});sel=big?big.id:null;dayFl=0;banner=null}

  function init(a){T=50;tG=tG||0;kq.length=0;kb=false;warned=0;fx=[];splash=[];vegs=[];flash=0;bolts=[];
    mole={mood:'hope',t:0,blink:2,lx:0,ly:-1,jump:0};
    wisps=[];for(var i=0;i<5;i++)wisps.push({x:hash(i+3)*W,y:70+hash(i+7)*140,s:.5+hash(i+11)*.6,v:4+hash(i+13)*6});
    load(0);a.tempo(1)}

  function setMood(m,t){mole.mood=m;mole.t=t}

  function pickCloud(x,y){var best=null,bd=1e9;sim.clouds.forEach(function(c){var r=cloudR(c.m),d=Math.hypot(c.x-x,c.y-y);
      if(d<r+16&&d-r<bd){bd=d-r;best=c}});return best}

  function handleEvents(a){var ko=a.lang==='ko';
    sim.ev.forEach(function(e){var p;
      if(e.t==='merge'){a.beep(260+Math.min(6,e.m)*40,.12,'sine');a.burst(e.x,e.y,'#ffffff',8);
        if(sel===e.gone)sel=e.id;if(held===e.gone)held=e.id;
        if(e.newRain){a.beep(130,.3,'triangle');a.pop(e.x,e.y-40,ko?'비구름!':'Rain cloud!','#4a7fd0')}
        if(e.thunder){a.pop(e.x,e.y-60,ko?'먹구름 완성!':'Storm cloud!','#6b5bd6');a.beep(80,.4,'sawtooth')}}
      else if(e.t==='split'){a.sfx('jump');a.burst(e.x,e.y,'#e8f2ff',10);if(sel===e.from)sel=e.a;if(held===e.from)held=null}
      else if(e.t==='grow'){a.beep([523,659,784][e.stage]||880,.12,'triangle');a.burst(e.x,GROUND-14,'#8fdc6a',7)}
      else if(e.t==='harvest'){
        if(e.kind==='g'){a.add(20);a.sfx('coin');a.beep(1760,.25,'sine');a.pop(e.x,GROUND-60,(ko?'햇빛 보너스 +20':'Sun bonus +20'),'#e8a400');
          vegs.push({x:e.x,y:GROUND-20,vx:0,vy:-220,t:0,k:3});a.burst(e.x,GROUND-30,'#ffd34d',14)}
        else{var pts=10+(e.perfect?5:0);a.add(pts);a.sfx('coin');a.beep(1568,.22,'sine');a.beep(2093,.3,'sine');
          vegs.push({x:e.x,y:GROUND-14,vx:(Math.random()-.5)*40,vy:-260,t:0,k:e.veg});
          a.burst(e.x,GROUND-20,['#ff9a3c','#ff5a4e','#a46ad8'][e.veg],14);
          a.pop(e.x,GROUND-64,(e.perfect?(ko?'딱 좋아! +':'Perfect! +'):'+')+pts,e.perfect?'#ff7a1a':'#ffffff');setMood('cheer',1.4)}}
      else if(e.t==='flood'){dayFl++;a.sfx('hit');a.shake(5);a.burst(e.x,GROUND-6,'#8a6a4a',14);a.pop(e.x,GROUND-50,ko?'잠겼어요!':'Flooded!','#ff6b5a');setMood('frown',2.2)}
      else if(e.t==='dry'){a.beep(700,.08,'triangle')}
      else if(e.t==='wilt'){a.beep(220,.25,'triangle');a.beep(165,.3,'triangle');a.burst(e.x,GROUND-20,'#b9b08a',10);
        a.pop(e.x,GROUND-60,ko?'온실이 시들어요!':'Greenhouse wilts!','#ff6b5a');setMood('frown',1.6)}
      else if(e.t==='bolt'){bolts.push({x:e.x,y:e.y,t:0,s:Math.random()*99});flash=1;a.beep(70,.35,'sawtooth');a.beep(55,.5,'sine');a.shake(3)}
      else if(e.t==='scatter'){a.sfx('jump');a.pop(e.x,GROUND-80,ko?'훠이!':'Shoo!','#ffe066');a.burst(e.x,GROUND-20,'#4a5d8a',10);a.add(5)}
      else if(e.t==='birdwarn'){a.beep(1800,.05,'square');a.beep(2100,.05,'square')}
      else if(e.t==='land'){a.beep(1500,.06,'square')}
      else if(e.t==='peck'){a.beep(1900,.04,'square');a.pop(e.x,GROUND-50,ko?'냠!':'Peck!','#ff9a8a');a.burst(e.x,GROUND-14,'#8fdc6a',5)}
      else if(e.t==='windwarn'){a.beep(240,.5,'sine')}
      else if(e.t==='mist'){a.beep(900,.1,'sine')}
      else if(e.t==='clear'){
        var bonus=dayFl===0?15:0,dayPts=10+dayN*2;a.add(dayPts+bonus);a.sfx('win');T=Math.min(70,T+14);mode='clear';modeT=0;
        banner={a:ko?(dayN+1)+'일차 수확 완료!':'Day '+(dayN+1)+' harvested!',b:(bonus?(ko?'범람 없음 +15 · ':'No floods +15 · '):'')+'+14s'};
        ['#ffd23f','#ff7a8a','#6fc3ff','#8be28b'].forEach(function(c){a.burst(W/2,250,c,10)});setMood('cheer',2);
        a.tempo(1+Math.min(.5,dayN*.04))}});
    sim.ev.length=0}

  function update(dt,inp,a){
    var i,c;
    if(mode==='play'){T-=dt;if(T<=0){T=0;a.over();return}
      if(T<10&&Math.ceil(T)!==warned){warned=Math.ceil(T);a.beep(880,.05,'square')}}
    else{modeT+=dt;if(modeT>1.6){load(dayN+1)}return}
    /* 포인터 */
    var fresh=inp.down&&!lastDown&&inp.x!=null;lastDown=inp.down;
    if(fresh){kb=false;c=pickCloud(inp.x,inp.y);stroke={t:0,x0:inp.x,y0:inp.y,px:inp.x,py:inp.y,done:false,grab:!!c};
      if(c){held=c.id;gox=c.x-inp.x;goy=c.y-inp.y;sel=c.id;a.beep(520,.04,'sine')}}
    if(stroke&&inp.down&&inp.x!=null){stroke.t+=dt;var vx=(inp.x-stroke.px)/Math.max(dt,1e-3),vy=(inp.y-stroke.py)/Math.max(dt,1e-3);
      if(held!=null){var hc=cloudById(sim,held);
        if(!hc)held=null;
        else{var ddy=inp.y-stroke.y0,ddx=inp.x-stroke.x0;
          if(!stroke.done&&stroke.t<.32&&ddy>44&&Math.abs(ddx)<ddy*.7){stroke.done=true;release(sim,held);split(sim,held);held=null}
          else setTarget(sim,held,inp.x+gox,Math.max(C.SKY_TOP,Math.min(C.SKY_BOT,inp.y+goy)))}}
      else if(!stroke.done&&vy>320&&Math.abs(vx)<vy*1.2){
        for(i=0;i<sim.clouds.length;i++){c=sim.clouds[i];var r=cloudR(c.m);
          var sx=stroke.px,sy=stroke.py,ex=inp.x,ey=inp.y,lx=ex-sx,ly=ey-sy,ll=lx*lx+ly*ly,tt=ll?Math.max(0,Math.min(1,((c.x-sx)*lx+(c.y-sy)*ly)/ll)):0;
          if(Math.hypot(sx+lx*tt-c.x,sy+ly*tt-c.y)<r*.85&&stroke.y0<c.y){stroke.done=true;split(sim,c.id);break}}}
      stroke.px=inp.x;stroke.py=inp.y}
    if(!inp.down&&stroke){if(held!=null)release(sim,held);held=null;stroke=null}
    /* 키보드 */
    while(kq.length){var q=kq.shift();kb=true;
      if(!cloudById(sim,sel)&&sim.clouds.length)sel=sim.clouds[0].id;
      if(q.t==='cyc'&&sim.clouds.length){var ord=sim.clouds.slice().sort(function(p,o){return p.x-o.x}),k=0;
        for(i=0;i<ord.length;i++)if(ord[i].id===sel)k=i;sel=ord[(k+q.d+ord.length)%ord.length].id;a.beep(600,.04,'sine')}
      else if(q.t==='split'&&sel!=null)split(sim,sel);
      else if(q.t==='dash'&&sel!=null){if(dash(sim,sel,q.dx,q.dy))a.beep(420,.08,'triangle')}}
    if(sel!=null&&(keys.l||keys.r||keys.u||keys.d)&&held==null){c=cloudById(sim,sel);
      if(c){var w=.7+.3*c.m,mx=(keys.r?1:0)-(keys.l?1:0),my=(keys.d?1:0)-(keys.u?1:0);push(sim,sel,mx*560/w,my*560/w)}}
    else if(kb&&sel!=null&&held==null){c=cloudById(sim,sel);if(c&&!c.dashId)push(sim,sel,-c.vx*5,-c.vy*5)}
    advance(sim,dt);
    handleEvents(a);
    /* 마스코트 */
    mole.t-=dt;mole.blink-=dt;if(mole.blink<-.13)mole.blink=1.8+Math.random()*2.5;
    var raining=false,happyRain=false;sim.plots.forEach(function(p){if(p.rain>0){raining=true;if(p.kind==='c'&&p.M>=C.LO&&p.M<=C.HI&&!p.flooded)happyRain=true}});
    if(mole.t<=0){mole.mood=happyRain?'dance':T<10?'worry':'hope'}
    var lk=cloudById(sim,held)||cloudById(sim,kb?sel:null);
    if(!lk)sim.clouds.forEach(function(o){if(o.rain&&(!lk||o.m>lk.m))lk=o});
    var tx=lk?Math.max(-1,Math.min(1,(lk.x-58)/160)):0,ty=lk?-1:-.4;mole.lx+=(tx-mole.lx)*Math.min(1,dt*6);mole.ly+=(ty-mole.ly)*Math.min(1,dt*6)}

  /* ---------- 그리기 ---------- */
  var SEAS=[{h1:'#b9e3a8',h2:'#93d38c',h3:'#78c07a',dot:'#ffc4d8'},{h1:'#9fd68e',h2:'#74bf6e',h3:'#5aa95e',dot:'#fff3a0'},
            {h1:'#f0c58a',h2:'#e3a464',h3:'#c9864c',dot:'#ff9a5a'}];
  function puffs(c){if(c.pf)return c.pf;var n=7,pf=[],i;for(i=0;i<n;i++){var a=i/n*Math.PI+Math.PI+.2,s=hash(c.seed+i);
      pf.push([Math.cos(a)*.62,Math.sin(a)*.42-.05,.42+s*.18])}
    pf.push([-.55,.12,.4],[.55,.12,.42],[0,.1,.55]);c.pf=pf;return pf}
  function blob(g,c,r,ox,oy,sc){var pf=puffs(c);g.beginPath();
    for(var i=0;i<pf.length;i++){var p=pf[i],wob=Math.sin(tG*1.3+c.seed+i)*.03;g.moveTo(c.x+ox+p[0]*r*1.15+(p[2]+wob)*r*sc,c.y+oy+p[1]*r);
      g.arc(c.x+ox+p[0]*r*1.15,c.y+oy+p[1]*r,(p[2]+wob)*r*sc,0,7)}g.fill()}
  function drawCloud(g,c,isSel){
    var r=cloudR(c.m),k=Math.max(0,Math.min(1,(c.m-1.35)/3.8)),pul=c.pulse>0?1+.14*Math.sin(c.pulse*12)*c.pulse:1,born=c.born>0?1-c.born:1;
    if(c.mist)born=Math.min(born,.5+.5*Math.max(0,(C.SKY_BOT+30-c.y)/60));
    g.save();g.globalAlpha=Math.max(.2,born);g.translate(c.x,c.y);g.scale(pul*(.6+.4*born),pul*(.6+.4*born));g.translate(-c.x,-c.y);
    var top=c.rain?mix('#dfe5f2','#8d98b8',k):'#ffffff',mid=c.rain?mix('#b9c3db','#626e92',k):'#f3f6fc',bot=c.rain?mix('#8e9abb','#434d6c',k):'#cfd9ee';
    if(isSel){g.fillStyle='rgba(255,236,120,.35)';blob(g,c,r,0,0,1.25)}
    g.fillStyle=bot;blob(g,c,r,0,r*.16,1);
    g.fillStyle=mid;blob(g,c,r,0,0,.96);
    g.fillStyle=top;g.save();g.beginPath();g.rect(c.x-r*2,c.y-r*2,r*4,r*1.8);g.clip();blob(g,c,r,-r*.06,-r*.12,.78);g.restore();
    g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(c.x-r*.35,c.y-r*.42,r*.22,r*.12,-.4,0,7);g.fill();
    /* 얼굴 */
    var ex=r*.26,ey=c.y+r*.08,face=c.rain?'#2f3a5a':'#56618a';g.fillStyle=face;g.strokeStyle=face;g.lineWidth=Math.max(1.6,r*.07);g.lineCap='round';
    var blink=Math.sin(tG*.9+c.seed*3)>.985;
    if(c.m>=C.THUNDER_M){g.beginPath();g.moveTo(c.x-ex-4,ey-6);g.lineTo(c.x-ex+3,ey-3);g.moveTo(c.x+ex+4,ey-6);g.lineTo(c.x+ex-3,ey-3);g.stroke();
      g.beginPath();g.arc(c.x-ex,ey,2.4,0,7);g.arc(c.x+ex,ey,2.4,0,7);g.fill();g.beginPath();g.moveTo(c.x-4,ey+8);g.lineTo(c.x+4,ey+8);g.stroke()}
    else if(c.rain){g.beginPath();g.moveTo(c.x-ex-3,ey-2);g.lineTo(c.x-ex,ey+1);g.lineTo(c.x-ex+3,ey-2);
      g.moveTo(c.x+ex-3,ey-2);g.lineTo(c.x+ex,ey+1);g.lineTo(c.x+ex+3,ey-2);g.stroke();
      g.beginPath();g.ellipse(c.x,ey+7,2.6,2,0,0,7);g.fill()}
    else if(blink){g.beginPath();g.moveTo(c.x-ex-2.5,ey);g.lineTo(c.x-ex+2.5,ey);g.moveTo(c.x+ex-2.5,ey);g.lineTo(c.x+ex+2.5,ey);g.stroke()}
    else{g.beginPath();g.arc(c.x-ex,ey,2,0,7);g.arc(c.x+ex,ey,2,0,7);g.fill();g.beginPath();g.arc(c.x,ey+3.5,2.6,.2,2.94);g.stroke()}
    g.fillStyle='rgba(255,140,160,.35)';g.beginPath();g.arc(c.x-ex-5,ey+5,3,0,7);g.arc(c.x+ex+5,ey+5,3,0,7);g.fill();
    g.restore()}

  function drawRain(g,c,dt){if(!c.rain)return;var r=cloudR(c.m),rw=r*RW,top=c.y+r*.35,len=GROUND-top,rate=rainRate(c.m),n=Math.round(14+rate*110),i;
    var cg=g.createLinearGradient(0,top,0,GROUND);cg.addColorStop(0,'rgba(140,170,220,.28)');cg.addColorStop(1,'rgba(140,170,220,.06)');
    g.fillStyle=cg;g.beginPath();g.moveTo(c.x-rw*1.1,top);g.lineTo(c.x+rw*1.1,top);g.lineTo(c.x+rw,GROUND);g.lineTo(c.x-rw,GROUND);g.fill();
    g.strokeStyle='rgba(95,140,225,.8)';g.lineWidth=1.8;g.lineCap='round';g.beginPath();
    for(i=0;i<n;i++){var h=hash(i*3.7+c.seed),x=c.x-rw+hash(i*1.3+c.seed*2)*rw*2,ph=((tG*(1.6+h*.6)+h)%1),y=top+ph*len;
      g.moveTo(x,y);g.lineTo(x-1.5,Math.min(GROUND,y+12))}g.stroke();
    if(Math.random()<rate*dt*60){splash.push({x:c.x-rw+Math.random()*rw*2,y:GROUND+2+Math.random()*4,t:0})}}

  function drawSky(g,a){
    var ph=Math.min(1,sim?sim.t/42:0),sTop=mix3('#a7b9ea','#6db2ee','#6e74c0',ph),sMid=mix3('#f6c9d6','#a8d6f6','#f2a37e',ph),sBot=mix3('#ffe4c6','#e4f4ff','#ffd48c',ph);
    var gr=g.createLinearGradient(0,0,0,GROUND);gr.addColorStop(0,sTop);gr.addColorStop(.55,sMid);gr.addColorStop(1,sBot);g.fillStyle=gr;g.fillRect(-20,-20,W+40,GROUND+20);
    /* 해 */
    var sx=30+300*ph,sy=360-270*Math.sin(Math.PI*ph);
    var sg=g.createRadialGradient(sx,sy,4,sx,sy,60);sg.addColorStop(0,'rgba(255,248,200,.9)');sg.addColorStop(1,'rgba(255,230,150,0)');g.fillStyle=sg;g.beginPath();g.arc(sx,sy,60,0,7);g.fill();
    g.fillStyle=mix3('#ffb38a','#fff1a8','#ff9a5a',ph);g.beginPath();g.arc(sx,sy,17,0,7);g.fill();
    /* 해 궤적 점선 */
    g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=2;g.setLineDash([3,9]);g.beginPath();
    for(var i=0;i<=24;i++){var q=i/24,x=30+300*q,y=360-270*Math.sin(Math.PI*q);if(i)g.lineTo(x,y);else g.moveTo(x,y)}g.stroke();g.setLineDash([]);
    /* 먼 구름 */
    for(i=0;i<wisps.length;i++){var w=wisps[i];g.fillStyle='rgba(255,255,255,.28)';g.beginPath();
      g.ellipse(w.x,w.y,40*w.s,9*w.s,0,0,7);g.ellipse(w.x+16*w.s,w.y-6*w.s,20*w.s,9*w.s,0,0,7);g.fill()}}

  function hills(g,se){
    var o=Math.sin(tG*.08)*6;
    g.fillStyle=se.h1;g.beginPath();g.moveTo(-10,GROUND);
    for(var x=-10;x<=W+10;x+=10)g.lineTo(x,GROUND-84+Math.sin((x+o)*.018)*22+Math.sin((x+o)*.041)*8);g.lineTo(W+10,GROUND);g.fill();
    /* 풍차 */
    var wx=292+o*.5,wy=GROUND-90+Math.sin((wx+o)*.018)*22;
    g.fillStyle='#f3ead8';g.beginPath();g.moveTo(wx-7,wy+14);g.lineTo(wx-4,wy-22);g.lineTo(wx+4,wy-22);g.lineTo(wx+7,wy+14);g.fill();
    g.fillStyle='#c76a5a';g.beginPath();g.moveTo(wx-6,wy-21);g.lineTo(wx,wy-29);g.lineTo(wx+6,wy-21);g.fill();
    g.save();g.translate(wx,wy-22);g.rotate(mill);g.strokeStyle='#8a6a52';g.lineWidth=1.5;g.fillStyle='rgba(255,252,240,.95)';
    for(var b=0;b<4;b++){g.rotate(Math.PI/2);g.beginPath();g.moveTo(0,0);g.lineTo(0,-18);g.stroke();g.fillRect(1,-18,5,13)}
    g.fillStyle='#8a6a52';g.beginPath();g.arc(0,0,2,0,7);g.fill();g.restore();
    var o2=Math.sin(tG*.12+1)*10;
    g.fillStyle=se.h2;g.beginPath();g.moveTo(-10,GROUND);
    for(x=-10;x<=W+10;x+=10)g.lineTo(x,GROUND-44+Math.sin((x+o2)*.025+2)*16+Math.sin((x+o2)*.06)*5);g.lineTo(W+10,GROUND);g.fill();
    for(var i=0;i<14;i++){var tx=hash(i+40)*W+o2*.6,ty=GROUND-44+Math.sin((tx)*.025+2)*16+8+hash(i+41)*20;
      g.fillStyle=se.h3;g.beginPath();g.arc(tx,ty-6,6+hash(i)*4,0,7);g.fill();g.fillStyle=se.dot;g.beginPath();g.arc(tx-2,ty-9,1.6,0,7);g.arc(tx+3,ty-5,1.4,0,7);g.fill()}}

  function ground(g,se){
    /* 땅 단면 */
    var gr=g.createLinearGradient(0,GROUND,0,H);gr.addColorStop(0,'#a8744a');gr.addColorStop(.25,'#8d5f3c');gr.addColorStop(1,'#5f3f2a');
    g.fillStyle=gr;g.fillRect(-20,GROUND,W+40,H-GROUND+20);
    g.fillStyle='rgba(255,220,180,.07)';for(var i=0;i<40;i++){g.beginPath();g.ellipse(hash(i+70)*W,GROUND+30+hash(i+71)*(H-GROUND-30),2+hash(i+72)*4,1.5+hash(i+73)*2,0,0,7);g.fill()}
    g.strokeStyle='rgba(60,35,20,.18)';g.lineWidth=2;for(i=0;i<3;i++){g.beginPath();g.moveTo(0,GROUND+60+i*50);
      for(var x=0;x<=W;x+=20)g.lineTo(x,GROUND+60+i*50+Math.sin(x*.05+i)*4);g.stroke()}
    /* 풀 띠 */
    g.fillStyle=se.h3;g.fillRect(-20,GROUND-4,W+40,10);
    g.strokeStyle=se.h2;g.lineWidth=2;g.lineCap='round';g.beginPath();
    for(i=0;i<60;i++){var gx=i*6+hash(i+9)*4,sw=Math.sin(tG*1.6+i*.5)*2+(sim?sim.wind.f*4:0);g.moveTo(gx,GROUND+2);g.lineTo(gx+sw,GROUND-5-hash(i)*5)}g.stroke();
    /* 호수 */
    g.save();g.beginPath();g.ellipse(30,GROUND+6,48,13,0,0,7);g.clip();
    var lg=g.createLinearGradient(0,GROUND-8,0,GROUND+18);lg.addColorStop(0,'#7cc6ee');lg.addColorStop(1,'#3f8fc6');g.fillStyle=lg;g.fillRect(-20,GROUND-10,100,30);
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.5;for(i=0;i<5;i++){var lx=((tG*8+i*23)%90)-12,ly=GROUND+1+i*2.6;g.beginPath();g.moveTo(lx,ly);g.lineTo(lx+10+Math.sin(tG*2+i)*3,ly);g.stroke()}
    g.restore();g.strokeStyle='#5a9a5a';g.lineWidth=2;for(i=0;i<4;i++){var rx=62+i*4;g.beginPath();g.moveTo(rx,GROUND+4);g.quadraticCurveTo(rx+2,GROUND-8,rx+Math.sin(tG+i)*2,GROUND-16-i*2);g.stroke()}
    /* 안개 */
    if(sim&&sim.cfg.mist){for(i=0;i<4;i++){var mt=(tG*.35+i/4)%1;g.fillStyle='rgba(255,255,255,'+(.35*(1-mt))+')';g.beginPath();g.arc(26+i*6+Math.sin(tG+i)*5,GROUND-mt*60,6+mt*10,0,7);g.fill()}}}

  var VEG=[{c:'#ff9a3c',f:'#fffaf0',fc:'#ffd166'},{c:'#ff5a4e',f:'#ffe066',fc:'#ff9f1c'},{c:'#a46ad8',f:'#e8c8ff',fc:'#fff3b0'}];
  function drawPlot(g,p,i){
    var x=p.x,base=GROUND,wet=Math.min(1,p.M),frac=p.p-Math.floor(p.p),sway=Math.sin(tG*2+i)*.06+(sim.wind.f*.2)+(p.rain>0?Math.sin(tG*9+i)*.06:0),
        pop=p.popT>0?1+.4*Math.sin((.5-p.popT)*14)*p.popT*2:1;
    /* 흙 두둑 */
    g.fillStyle='rgba(60,35,20,.25)';g.beginPath();g.ellipse(x,base+6,p.w/2+3,7,0,0,7);g.fill();
    g.fillStyle=p.kind==='g'?'#9a6a44':mix('#c08a58','#5b3a22',wet);g.beginPath();g.ellipse(x,base+2,p.w/2,8,0,Math.PI,0);g.lineTo(x+p.w/2,base+4);g.lineTo(x-p.w/2,base+4);g.fill();
    g.strokeStyle='rgba(50,30,15,.3)';g.lineWidth=1.4;g.beginPath();g.moveTo(x-p.w/2+8,base);g.lineTo(x+p.w/2-8,base);g.moveTo(x-p.w/2+14,base-3.5);g.lineTo(x+p.w/2-14,base-3.5);g.stroke();
    if(p.flooded){g.fillStyle='rgba(110,90,70,.9)';g.beginPath();g.ellipse(x,base,p.w/2+2,7,0,0,7);g.fill();
      g.fillStyle='rgba(150,190,220,.55)';g.beginPath();g.ellipse(x-4,base-1,p.w/2-8,4,0,0,7);g.fill();
      g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1;var rp=(tG*1.2)%1;g.beginPath();g.ellipse(x+6,base-1,4+rp*10,1.5+rp*3,0,0,7);g.globalAlpha=1-rp;g.stroke();g.globalAlpha=1}
    else if(p.M>.6&&p.kind==='c'){g.fillStyle='rgba(140,180,220,'+((p.M-.6)*.9)+')';g.beginPath();g.ellipse(x+8,base+1,7+(p.M-.6)*20,2.5,0,0,7);g.fill()}
    /* 작물 */
    g.save();g.translate(x,base-2);g.rotate(sway);g.scale(pop*1.45,pop*1.45);
    var droop=(p.kind==='c'&&(p.M<C.LO||p.flooded))||p.wilt>0;
    if(p.kind==='g')drawSun(g,p,frac,droop);else drawCrop(g,p,frac,droop);
    g.restore();
    if(p.kind==='g')drawDome(g,p);
    /* 수분 계기 */
    if(p.kind==='c'){var mx=x-24,my=base+14,mw=48;
      g.fillStyle='rgba(40,25,15,.45)';rr(g,mx-2,my-2,mw+4,11,5);g.fill();
      g.fillStyle='#e9dcc4';rr(g,mx,my,mw,7,3.5);g.fill();
      g.fillStyle='#bfe8a0';g.fillRect(mx+mw*C.LO,my,mw*(C.HI-C.LO),7);
      g.fillStyle='#ffb3a6';g.fillRect(mx+mw*C.HI,my,mw*(1-C.HI)-2,7);
      var fw=Math.min(1,p.M)*mw;g.fillStyle=p.flooded?(Math.sin(tG*10)>0?'#e2553f':'#8a6a4a'):p.M>C.HI?'#ff8a5a':'#4a9be8';rr(g,mx,my+1.5,Math.max(4,fw),4,2);g.fill();
      /* 단계 점 */
      for(var k=0;k<3;k++){var fill=Math.max(0,Math.min(1,p.p-k));g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.arc(x-12+k*12,my+17,4,0,7);g.fill();
        if(fill>0){g.fillStyle='#ffd23f';g.beginPath();g.moveTo(x-12+k*12,my+17);g.arc(x-12+k*12,my+17,4,-Math.PI/2,-Math.PI/2+fill*6.283);g.fill()}}
      if(p.M<C.LO&&!p.flooded){var by=base-62+Math.sin(tG*4+i)*3;g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(x+16,by,9,0,7);g.fill();
        g.beginPath();g.moveTo(x+11,by+6);g.lineTo(x+8,by+12);g.lineTo(x+16,by+8);g.fill();
        g.fillStyle='#4a9be8';g.beginPath();g.moveTo(x+16,by-6);g.quadraticCurveTo(x+22,by+1,x+16,by+5);g.quadraticCurveTo(x+10,by+1,x+16,by-6);g.fill()}}
    else{var gy=base+14;g.fillStyle='rgba(40,25,15,.45)';rr(g,x-24,gy-2,48,11,5);g.fill();
      for(k=0;k<3;k++){fill=Math.max(0,Math.min(1,p.p-k));g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.arc(x-12+k*12,gy+17,4,0,7);g.fill();
        if(fill>0){g.fillStyle='#ffb000';g.beginPath();g.moveTo(x-12+k*12,gy+17);g.arc(x-12+k*12,gy+17,4,-Math.PI/2,-Math.PI/2+fill*6.283);g.fill()}}
      g.fillStyle='#ffe9a0';g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('☀',x,gy+7)}}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function leaf(g,x,y,len,ang,col){g.save();g.translate(x,y);g.rotate(ang);g.fillStyle=col;g.beginPath();g.ellipse(len/2,0,len/2,len*.22,0,0,7);g.fill();
    g.strokeStyle='rgba(30,80,30,.35)';g.lineWidth=.8;g.beginPath();g.moveTo(1,0);g.lineTo(len*.85,0);g.stroke();g.restore()}
  function drawCrop(g,p,frac,droop){var v=VEG[p.veg],st=p.stage,dr=droop?.5:0,h;
    var lc=droop?'#9fb070':'#6cc35a',lc2=droop?'#8a9a60':'#4fae4a';
    if(st===0){h=6+frac*6;g.strokeStyle=lc2;g.lineWidth=2;g.beginPath();g.moveTo(0,0);g.lineTo(0,-h);g.stroke();
      leaf(g,0,-h,7+frac*4,-2.5+dr,lc);leaf(g,0,-h,7+frac*4,-.6-dr,lc2)}
    else{h=st===1?14+frac*6:20+frac*4;g.strokeStyle=lc2;g.lineWidth=2.4;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(2,-h*.5,0,-h);g.stroke();
      leaf(g,0,-h*.35,11,-2.7+dr,lc);leaf(g,0,-h*.35,11,-.45-dr,lc2);leaf(g,0,-h*.7,9,-2.4+dr,lc2);leaf(g,0,-h*.7,9,-.7-dr,lc);
      if(st===1){g.fillStyle='#8fd36a';g.beginPath();g.ellipse(0,-h-3,3+frac*1.5,4.5+frac*1.5,0,0,7);g.fill();
        g.fillStyle=v.f;g.globalAlpha=frac;g.beginPath();g.arc(0,-h-6,2,0,7);g.fill();g.globalAlpha=1}
      else{var open=.5+frac*.5,pr=5.5*open;g.fillStyle=v.f;
        for(var k=0;k<6;k++){var an=k/6*6.283+tG*.3;g.beginPath();g.ellipse(Math.cos(an)*pr,-h-3+Math.sin(an)*pr*.8,pr*.8,pr*.5,an,0,7);g.fill()}
        g.fillStyle=v.fc;g.beginPath();g.arc(0,-h-3,3.2*open+1,0,7);g.fill();
        /* 열매 미리보기 */
        if(frac>.5){g.fillStyle=v.c;g.globalAlpha=(frac-.5)*2;g.beginPath();g.arc(-6,-h*.45,3,0,7);g.fill();g.globalAlpha=1}}}}
  function drawSun(g,p,frac,droop){var st=p.stage,h=st===0?8+frac*6:st===1?16+frac*6:24+frac*3,lc=droop?'#a8a070':'#5fbf5a';
    g.strokeStyle=lc;g.lineWidth=2.4;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(droop?6:1,-h*.6,droop?8:0,-h);g.stroke();
    leaf(g,0,-h*.4,10,-2.6,lc);leaf(g,0,-h*.4,10,-.5,lc);
    var fx2=droop?8:0,fy=-h-2;if(st>=1){var pr=st===2?6:3.5;g.fillStyle=droop?'#c9b070':'#ffc928';
      for(var k=0;k<10;k++){var an=k/10*6.283;g.beginPath();g.ellipse(fx2+Math.cos(an)*pr,fy+Math.sin(an)*pr,pr*.55,pr*.3,an,0,7);g.fill()}
      g.fillStyle='#8a5a2a';g.beginPath();g.arc(fx2,fy,pr*.6,0,7);g.fill()}}
  function drawDome(g,p){var x=p.x,b=GROUND+2,w=p.w/2+2,h=52;
    g.fillStyle=p.wilt>0?'rgba(200,210,220,.45)':'rgba(200,235,255,.28)';g.beginPath();g.moveTo(x-w,b);g.lineTo(x-w,b-h*.45);g.quadraticCurveTo(x-w,b-h,x,b-h);
    g.quadraticCurveTo(x+w,b-h,x+w,b-h*.45);g.lineTo(x+w,b);g.closePath();g.fill();
    g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=2;g.stroke();
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1.2;g.beginPath();g.moveTo(x,b);g.lineTo(x,b-h);g.moveTo(x-w,b-h*.45);g.lineTo(x+w,b-h*.45);g.stroke();
    g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=2;g.beginPath();g.moveTo(x-w+5,b-h*.5);g.quadraticCurveTo(x-w+5,b-h+6,x-8,b-h+4);g.stroke();
    if(p.shade&&p.wilt<=0){g.fillStyle='rgba(60,70,100,.18)';g.beginPath();g.ellipse(x,b-h*.4,w,h*.6,0,0,7);g.fill()}}

  function drawBirds(g){var b=sim.birds;if(!b)return;var n=4,i;
    for(i=0;i<n;i++){var bx,by,fl;
      if(b.st==='warn'){var an=tG*3+i*1.57;bx=b.x+Math.cos(an)*30;by=110+Math.sin(an)*12+i*3;fl=1}
      else if(b.st==='land'){bx=b.x-16+i*11;by=GROUND-6-Math.abs(Math.sin(tG*6+i*1.3))*5-(i%2)*2;fl=0}
      else{var u=1.5-b.t;bx=b.x-16+i*11+(i-1.5)*u*90;by=GROUND-10-u*u*260;fl=1}
      g.save();g.translate(bx,by);if(b.st==='land'&&Math.sin(tG*5+i)>.6)g.rotate(.5);
      g.fillStyle='#4a5d8a';g.beginPath();g.ellipse(0,0,6,5,0,0,7);g.fill();
      g.fillStyle='#6f84b8';var wy=fl?Math.sin(tG*20+i)*5:1;g.beginPath();g.ellipse(-1,-wy*.4,5,2.4,-wy*.12,0,7);g.fill();
      g.fillStyle='#ffa53a';g.beginPath();g.moveTo(5,-1);g.lineTo(9,0);g.lineTo(5,1.6);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(2.6,-1.8,1.6,0,7);g.fill();g.fillStyle='#222';g.beginPath();g.arc(3,-1.8,.8,0,7);g.fill();g.restore()}
    if(b.st==='warn'){g.fillStyle='#ff5a4e';g.font='18px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('!',b.x,92+Math.sin(tG*8)*2)}
    if(b.st==='land'){g.strokeStyle='rgba(255,90,78,.8)';g.lineWidth=2;g.setLineDash([3,3]);g.beginPath();g.arc(b.x,GROUND-8,32,Math.PI,0);g.stroke();g.setLineDash([])}}

  function drawMole(g,a){var x=58,y=582,m=mole.mood,bob=0,sway=0;
    if(m==='dance'){bob=Math.abs(Math.sin(tG*8))*6;sway=Math.sin(tG*8)*.15}else if(m==='cheer'){bob=Math.abs(Math.sin(tG*10))*9}
    else bob=Math.sin(tG*2)*1.5;
    g.fillStyle='#3a2416';g.beginPath();g.ellipse(x,y+22,34,10,0,0,7);g.fill();
    g.save();g.beginPath();g.rect(x-50,y-80,100,102);g.clip();
    g.translate(x,y-bob);g.rotate(sway);
    g.fillStyle='#7a5238';g.beginPath();g.ellipse(0,8,24,28,0,0,7);g.fill();
    g.fillStyle='#9a6c4c';g.beginPath();g.ellipse(0,14,15,16,0,0,7);g.fill();
    /* 팔 */
    var arm=m==='dance'||m==='cheer'?-1:0;g.fillStyle='#e8a8a0';
    g.beginPath();g.ellipse(-20,10+arm*14,6,5,arm*.6,0,7);g.ellipse(20,10+arm*14+(m==='dance'?Math.sin(tG*8)*4:0),6,5,-arm*.6,0,7);g.fill();
    /* 얼굴 */
    var lx=mole.lx*3,ly=mole.ly*2.4,bl=mole.blink<0;
    g.fillStyle='#fff';g.beginPath();g.arc(-8,-6,5,0,7);g.arc(8,-6,5,0,7);g.fill();
    g.fillStyle='#2a1a10';g.strokeStyle='#2a1a10';g.lineWidth=1.8;g.lineCap='round';
    if(bl||m==='dance'){g.beginPath();g.arc(-8,-5,3,3.4,6.0);g.stroke();g.beginPath();g.arc(8,-5,3,3.4,6.0);g.stroke()}
    else{g.beginPath();g.arc(-8+lx,-6+ly,2.4,0,7);g.arc(8+lx,-6+ly,2.4,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(-7+lx,-7+ly,.8,0,7);g.arc(9+lx,-7+ly,.8,0,7);g.fill()}
    if(m==='frown'||m==='worry'){g.beginPath();g.moveTo(-12,-14);g.lineTo(-5,-12);g.moveTo(12,-14);g.lineTo(5,-12);g.stroke()}
    g.fillStyle='#ff8aa0';g.beginPath();g.ellipse(0,2,4.5,3.5,0,0,7);g.fill();
    g.strokeStyle='#2a1a10';g.lineWidth=1.6;g.beginPath();
    if(m==='frown'){g.arc(0,12,4,3.6,5.8)}else if(m==='cheer'){g.fillStyle='#c2413b';g.arc(0,8,4.5,0,3.14);g.fill()}else g.arc(0,7,3.5,.3,2.84);g.stroke();
    g.fillStyle='rgba(255,120,140,.4)';g.beginPath();g.arc(-15,2,3,0,7);g.arc(15,2,3,0,7);g.fill();
    /* 밀짚모자 */
    g.fillStyle='#e8c46a';g.beginPath();g.ellipse(0,-17,27,6,0,0,7);g.fill();g.fillStyle='#f2d27e';g.beginPath();g.ellipse(0,-23,14,9,0,Math.PI,0);g.fill();
    g.fillRect(-14,-23,28,6);g.fillStyle='#d9534f';g.fillRect(-14,-21,28,3.5);
    g.strokeStyle='rgba(150,110,40,.5)';g.lineWidth=1;g.beginPath();g.moveTo(-22,-16);g.lineTo(22,-16);g.stroke();
    if(m==='dance'){g.fillStyle='#4a9be8';for(var i=0;i<3;i++){var nx=-20+i*18,ny=-38-((tG*40+i*15)%20);g.font='12px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('♪',nx,ny)}}
    g.restore();
    g.fillStyle='#6b4630';g.beginPath();g.ellipse(x,y+22,34,8,0,0,Math.PI);g.fill();
    for(i=0;i<5;i++){g.fillStyle='#8d5f3c';g.beginPath();g.arc(x-28+i*14,y+24+(i%2)*2,5,0,7);g.fill()}}

  function drawUI(g,a){var ko=a.lang==='ko';
    /* 시간 */
    var tf=Math.max(0,Math.min(1,T/70));g.fillStyle='rgba(30,40,70,.38)';rr(g,12,32,W-24,15,7.5);g.fill();
    g.fillStyle=T<10?(Math.sin(tG*12)>0?'#ff5a4e':'#ff9a5a'):'#ffd84d';rr(g,14,34,Math.max(11,(W-28)*tf),11,5.5);g.fill();
    g.fillStyle='#5a4a20';g.font='11px Jua, system-ui, sans-serif';g.textAlign='left';g.fillText('⏱ '+Math.ceil(T)+'s',20,43.5);
    /* 힌트 */
    if(sim.cfg.hint&&mode==='play'){var ht=sim.cfg.hint[a.lang];g.font='15px Jua, system-ui, sans-serif';g.textAlign='center';
      var tw=g.measureText(ht).width+22;if(tw>W-16){g.font='13px Jua, system-ui, sans-serif';tw=g.measureText(ht).width+18}g.fillStyle='rgba(255,255,255,.82)';rr(g,W/2-tw/2,53,tw,24,12);g.fill();g.fillStyle='#4a5478';g.fillText(ht,W/2,70)}
    /* 팻말 */
    var sx=205,sy=584;g.fillStyle='#6b4630';g.fillRect(sx-3,sy+12,6,30);
    g.fillStyle='#c99a62';rr(g,sx-70,sy-20,140,36,8);g.fill();g.strokeStyle='#8a6038';g.lineWidth=2;g.stroke();
    g.fillStyle='#4a2e18';g.font='14px Jua, system-ui, sans-serif';g.textAlign='center';
    var se=[ko?'봄':'Spring',ko?'여름':'Summer',ko?'가을':'Autumn'][sim.cfg.season];
    g.fillText((ko?(dayN+1)+'일차 · ':'Day '+(dayN+1)+' · ')+se,sx,sy-4);
    var q=sim.quota,gap=Math.min(18,110/q);for(var i=0;i<q;i++){var qx=sx-(q-1)*gap/2+i*gap,qy=sy+8,done=i<sim.harvests;
      g.fillStyle=done?'#ff8a3c':'rgba(74,46,24,.3)';g.beginPath();g.moveTo(qx-4,qy-3);g.lineTo(qx+4,qy-3);g.lineTo(qx,qy+6);g.closePath();g.fill();
      g.fillStyle=done?'#5fbf5a':'rgba(74,46,24,.3)';g.beginPath();g.ellipse(qx-2,qy-6,1.5,3,-.4,0,7);g.ellipse(qx+2,qy-6,1.5,3,.4,0,7);g.fill()}
    /* 키보드 도움말 */
    if(kb){g.fillStyle='rgba(255,255,255,.7)';g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';
      g.fillText(ko?'Tab 선택 · 방향키 이동 · Space 나누기 · Shift+방향키 돌진':'Tab select · Arrows move · Space split · Shift+Arrow dash',W/2,H-8)}
    if(banner){var bt=Math.min(1,modeT*4);g.save();g.globalAlpha=bt;g.translate(W/2,240);g.scale(.8+.2*bt,.8+.2*bt);
      g.fillStyle='rgba(255,255,255,.9)';rr(g,-140,-34,280,72,18);g.fill();g.fillStyle='#ff7a1a';g.font='24px Jua, system-ui, sans-serif';g.textAlign='center';
      g.fillText(banner.a,0,-2);g.fillStyle='#4a7fd0';g.font='15px Jua, system-ui, sans-serif';g.fillText(banner.b,0,24);g.restore()}}

  function draw(g,a,dt){
    dt=dt||0;tG+=dt;if(!sim)return;var i,se=SEAS[sim.cfg.season];
    for(i=0;i<wisps.length;i++){var w=wisps[i];w.x+=(w.v+sim.wind.f*40)*dt;if(w.x>W+60)w.x=-60;if(w.x<-60)w.x=W+60}
    mill+=dt*(1.2+Math.abs(sim.wind.f)*8)*(sim.wind.f<0?-1:1);
    drawSky(g,a);hills(g,se);
    /* 바람 줄무늬 */
    var wd=sim.wind;if(wd.st!=='calm'){var str=wd.st==='gust'?1:.5+.5*Math.sin(tG*10);g.strokeStyle='rgba(255,255,255,'+(.55*str)+')';g.lineWidth=2;g.lineCap='round';
      for(i=0;i<9;i++){var ph=(tG*(wd.st==='gust'?1.4:.7)+hash(i+5))%1,yy=95+hash(i+6)*300,xx=wd.dir>0?-40+ph*(W+80):W+40-ph*(W+80);
        g.beginPath();g.moveTo(xx,yy);g.quadraticCurveTo(xx-wd.dir*15,yy-4,xx-wd.dir*40,yy);g.stroke()}
      if(wd.st==='warn'){g.fillStyle='rgba(255,255,255,.9)';g.font='22px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(wd.dir>0?'≫':'≪',W/2,110)}}
    ground(g,se);
    /* 구름 그림자 */
    sim.clouds.forEach(function(c){var r=cloudR(c.m);g.fillStyle='rgba(40,50,80,'+(c.rain?.2:.1)+')';g.beginPath();g.ellipse(c.x,GROUND+1,r*.8,4,0,0,7);g.fill()});
    sim.plots.forEach(function(p,k){drawPlot(g,p,k)});
    drawBirds(g);
    sim.clouds.forEach(function(c){drawRain(g,c,dt)});
    /* 물방울 튀김 */
    g.strokeStyle='rgba(170,205,255,.85)';g.lineWidth=1.3;
    for(i=splash.length-1;i>=0;i--){var s=splash[i];s.t+=dt;if(s.t>.3){splash.splice(i,1);continue}
      var sr=2+s.t*18;g.globalAlpha=1-s.t/.3;g.beginPath();g.arc(s.x,s.y-2,sr,Math.PI*1.1,Math.PI*1.9);g.stroke()}g.globalAlpha=1;
    if(splash.length>140)splash.splice(0,splash.length-140);
    /* 구름 */
    var kbSel=kb?sel:held;sim.clouds.slice().sort(function(p,o){return p.m-o.m}).forEach(function(c){drawCloud(g,c,c.id===kbSel)});
    /* 번개 */
    for(i=bolts.length-1;i>=0;i--){var b=bolts[i];b.t+=dt;if(b.t>.3){bolts.splice(i,1);continue}
      g.strokeStyle='rgba(255,250,180,'+(1-b.t/.3)+')';g.lineWidth=3.5;g.lineJoin='round';g.beginPath();g.moveTo(b.x,b.y);
      var yy2=b.y,xx2=b.x,kk=0;while(yy2<GROUND-4){yy2+=22;xx2=b.x+(hash(b.s+kk++)-.5)*22;g.lineTo(xx2,Math.min(GROUND-4,yy2))}g.stroke();
      g.strokeStyle='rgba(255,255,255,'+(1-b.t/.3)+')';g.lineWidth=1.4;g.stroke()}
    if(flash>0){g.fillStyle='rgba(255,255,230,'+flash*.35+')';g.fillRect(0,0,W,H);flash=Math.max(0,flash-dt*4)}
    /* 수확 채소 */
    for(i=vegs.length-1;i>=0;i--){var v=vegs[i];v.t+=dt;v.vy+=500*dt;v.x+=v.vx*dt;v.y+=v.vy*dt;if(v.t>1.1){vegs.splice(i,1);continue}
      g.save();g.globalAlpha=Math.min(1,(1.1-v.t)*3);g.translate(v.x,v.y);g.rotate(Math.sin(v.t*9)*.3);drawVeg(g,v.k);g.restore()}
    drawMole(g,a);drawUI(g,a)}
  function drawVeg(g,k){
    if(k===0){g.fillStyle='#ff9a3c';g.beginPath();g.moveTo(-7,-6);g.quadraticCurveTo(0,-9,7,-6);g.lineTo(1,16);g.lineTo(-1,16);g.closePath();g.fill();
      g.strokeStyle='rgba(160,70,10,.5)';g.lineWidth=1;g.beginPath();g.moveTo(-4,0);g.lineTo(0,1);g.moveTo(4,5);g.lineTo(0,6);g.stroke();
      leaf(g,0,-7,10,-2,'#5fbf5a');leaf(g,0,-7,10,-1.1,'#4fae4a')}
    else if(k===1){g.fillStyle='#ff5a4e';g.beginPath();g.arc(0,2,9,0,7);g.fill();g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(-3,-1,3,2,-.5,0,7);g.fill();
      g.fillStyle='#4fae4a';for(var i=0;i<5;i++){var an=i/5*6.283;g.beginPath();g.ellipse(Math.cos(an)*3,-6+Math.sin(an)*2,3.4,1.4,an,0,7);g.fill()}}
    else if(k===2){g.fillStyle='#f4ecff';g.beginPath();g.arc(0,4,8,0,7);g.fill();g.fillStyle='#a46ad8';g.beginPath();g.arc(0,2,8.5,Math.PI*1.05,Math.PI*1.95);g.fill();
      g.beginPath();g.ellipse(0,-1,8,3,0,0,7);g.fill();leaf(g,0,-4,10,-2,'#5fbf5a');leaf(g,0,-4,10,-1.1,'#4fae4a')}
    else{g.fillStyle='#ffc928';for(var j=0;j<10;j++){var a2=j/10*6.283;g.beginPath();g.ellipse(Math.cos(a2)*7,Math.sin(a2)*7,4,2.2,a2,0,7);g.fill()}
      g.fillStyle='#8a5a2a';g.beginPath();g.arc(0,0,5,0,7);g.fill()}}

  SG.run({id:'rain-maker',title:{ko:'비구름 목장',en:'Rain Maker'},
    how:{ko:'구름을 끌어 밭 위에 비를 내리세요. 구름끼리 합치면 비구름, 아래로 쓸면 둘로 나뉘어요. 계기를 초록 칸에 맞추면 쑥쑥 자라고, 넘치면 밭이 잠겨요!',
         en:'Drag clouds over the fields to make it rain. Merge clouds into rain clouds, swipe down to split them. Keep each gauge in the green to grow crops, but too much rain floods the field!'},
    init:init,update:update,draw:draw});
  window.__rainMaker={api:API,load:function(n){load(n)},sim:function(){return sim},sel:function(){return sel},day:function(){return dayN},time:function(){return T}};
})();
