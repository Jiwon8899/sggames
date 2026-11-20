/* 유령 사진관 (Ghost Camera) — 맨눈엔 안 보이고 뷰파인더 안에서만 보이는 수줍은 유령을 찍는다.
   시뮬레이션·채점 논리는 DOM 없이 돌도록 분리되어 있다(game._logic, node 검증용). */
(function(){
  'use strict';
  var W=360,RY0=40,RY1=468,FLOOR=352,FB=392,FW=132,FH=100,BLUR_PX=12,TMAX=70;
  var SLOTX=[52,130,210,290];
  var BASE={drift:100,shy:140,mirror:150,sleepy:140,twin:100};
  var POSE_PTS=150,THIRDS_MAX=60,TWIN_PTS=120;
  var COLS=['#bff3e4','#ffd0e6','#d9ccff','#ffe2b8','#c8e6ff','#f6ffb8'];
  var THEMES={
    attic:{ko:'다락방',en:'Attic',w1:'#7a5a40',w2:'#563c2a',pat:'plank',f1:'#6a4a32',f2:'#432c1d',trim:'#3a2618',cur:'#a8664a'},
    study:{ko:'서재',en:'Study',w1:'#4f6e5c',w2:'#36503f',pat:'stripe',f1:'#80553a',f2:'#583822',trim:'#2c2016',cur:'#c45a4a'},
    parlor:{ko:'응접실',en:'Parlor',w1:'#8a4a58',w2:'#66323f',pat:'diamond',f1:'#8e5e3a',f2:'#603e24',trim:'#3e211c',cur:'#e0b45a'},
    bedroom:{ko:'침실',en:'Bedroom',w1:'#4c568a',w2:'#333a64',pat:'dots',f1:'#74503a',f2:'#4c3222',trim:'#232640',cur:'#e6a0b4'},
    nursery:{ko:'아이방',en:'Nursery',w1:'#d7a47c',w2:'#b4805a',pat:'dots',f1:'#9a6a44',f2:'#6c482c',trim:'#6a4430',cur:'#7cb8c8'},
    library:{ko:'도서실',en:'Library',w1:'#6a4e74',w2:'#4a3454',pat:'stripe',f1:'#7a5236',f2:'#523420',trim:'#2e1e2c',cur:'#7fb08a'}
  };
  var THK=Object.keys(THEMES);
  var HINTS=[['카메라 안에서만 유령이 보여요','Ghosts only show in the camera'],
    ['포즈할 때 찰칵! 큰 보너스','Shoot during a pose for a big bonus'],
    ['수줍은 유령이에요. 천천히 다가가요','A shy one. Approach slowly'],
    ['거울을 프레임에 담아 보세요','Frame the mirror'],
    ['램프를 눌러 불을 꺼요 (L)','Tap the lamp to dim the lights (L)'],
    ['쌍둥이는 함께 찍어야 보너스','Photograph the twins together']];
  var ROOMS=[
    {th:'attic',wall:[0,'window',0,0],floor:['chest','table',0,0],cat:3,film:6,quota:80,vf:[250,180],
      g:[{t:'drift',x:130,y:282,ax:24,ay:12,fx:.5,fy:.8,P:7,o:0,pose:'wave'}]},
    {th:'attic',wall:['painting',0,'window',0],floor:[0,'chest','table',0],cat:0,film:5,quota:200,vf:[110,330],
      g:[{t:'drift',x:214,y:236,ax:46,ay:26,fx:.5,fy:.8,P:4,o:1.5,pose:'wave'}]},
    {th:'study',wall:['window',0,'painting','clock'],floor:['bookshelf',0,'plant',0],cat:1,film:5,quota:170,vf:[90,380],
      g:[{t:'shy',x:228,y:214,ax:34,ay:18,fx:.6,fy:.9,P:3.6,o:.5,pose:'peek'}]},
    {th:'parlor',wall:[0,'mirror',0,'window'],floor:['plant',0,'table',0],cat:0,film:6,quota:260,vf:[260,360],
      g:[{t:'mirror',slot:1,P:4.2,o:1,pose:'wave'},{t:'drift',x:222,y:274,ax:40,ay:18,fx:.5,fy:.7,P:5,o:0,pose:'spin'}]},
    {th:'bedroom',wall:['window',0,0,'painting'],floor:[0,'lamp','armchair',0],cat:3,film:6,quota:260,vf:[260,380],
      g:[{t:'sleepy',x:160,y:292,ax:6,ay:5,fx:.5,fy:.7,P:5,o:2,pose:'yawn'},{t:'drift',x:266,y:196,ax:30,ay:20,fx:.5,fy:.7,P:5.5,o:3,pose:'wave'}]},
    {th:'nursery',wall:['window',0,'painting',0],floor:['chest',0,0,'plant'],cat:1,film:6,quota:360,vf:[90,380],
      g:[{t:'twins',x:206,y:222,ax:40,ay:20,fx:.4,fy:.6,P:5,o:1,pose:'wave'}]},
    {th:'study',wall:['clock','window',0,'painting'],floor:['table',0,'bookshelf',0],cat:2,film:7,quota:420,vf:[180,400],
      g:[{t:'drift',x:70,y:270,ax:26,ay:20,fx:.6,fy:.8,P:4.5,o:0,pose:'spin'},{t:'shy',x:214,y:190,ax:40,ay:22,fx:.5,fy:.8,P:3.8,o:1.2,pose:'peek'},
         {t:'drift',x:290,y:290,ax:22,ay:26,fx:.7,fy:.6,P:5,o:2.5,pose:'wave'}]},
    {th:'parlor',wall:['window',0,'mirror',0],floor:[0,'armchair',0,'plant'],cat:0,film:7,quota:520,vf:[90,390],
      g:[{t:'mirror',slot:2,P:4,o:2,pose:'wave'},{t:'twins',x:110,y:220,ax:30,ay:24,fx:.45,fy:.6,P:4.6,o:0,pose:'spin'}]},
    {th:'bedroom',wall:['painting','window',0,0],floor:[0,0,'lamp','table'],cat:0,film:7,quota:500,vf:[90,390],
      g:[{t:'sleepy',x:182,y:294,ax:6,ay:5,fx:.5,fy:.6,P:4.6,o:1,pose:'yawn'},{t:'shy',x:120,y:190,ax:36,ay:20,fx:.55,fy:.8,P:3.6,o:2,pose:'peek'},
         {t:'drift',x:290,y:250,ax:24,ay:30,fx:.6,fy:.5,P:5,o:.4,pose:'spin'}]},
    {th:'library',wall:['window','mirror',0,'clock'],floor:['bookshelf',0,'lamp',0],cat:3,film:9,quota:760,vf:[180,400],
      g:[{t:'mirror',slot:1,P:4,o:0,pose:'wave'},{t:'sleepy',x:238,y:294,ax:6,ay:5,fx:.5,fy:.6,P:4.4,o:2,pose:'yawn'},
         {t:'shy',x:250,y:170,ax:30,ay:18,fx:.55,fy:.8,P:3.6,o:1,pose:'peek'},{t:'twins',x:100,y:250,ax:22,ay:22,fx:.45,fy:.6,P:4.8,o:3,pose:'wave'},
         {t:'drift',x:290,y:300,ax:20,ay:22,fx:.6,fy:.5,P:5,o:1.8,pose:'spin'}]}
  ];

  /* ---------- 공통 논리 ---------- */
  function rng(seed){var s=(seed>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function slotOf(arr,name){for(var i=0;i<4;i++)if(arr[i]===name)return i;return -1}
  function mirrorRect(room,slot){var x=SLOTX[slot];return {x:x-23,y:140,w:46,h:68}}
  function lampRect(room){var i=slotOf(room.floor,'lamp');if(i<0)return null;return {x:SLOTX[i]-26,y:232,w:52,h:164}}
  function genRoom(n){
    var R=rng(n*2654435761+977),pick=function(a){return a[Math.floor(R()*a.length)]};
    var th=THK[n%THK.length],units=[],nU=2+Math.floor(R()*3),pool=['drift','shy','mirror','sleepy','twins','drift','shy'];
    var used={};while(units.length<nU){var t=pick(pool);if(t!=='drift'&&t!=='shy'&&used[t])continue;used[t]=1;units.push(t)}
    var wall=[0,0,0,0],floor=[0,0,0,0],ms=-1,ls=-1;
    if(used.mirror){ms=Math.floor(R()*4);wall[ms]='mirror'}
    if(used.sleepy){ls=Math.floor(R()*4);floor[ls]='lamp'}
    for(var i=0;i<4;i++){if(!wall[i])wall[i]=pick(['window','painting','clock',0,'window']);if(!floor[i])floor[i]=pick(['table','bookshelf','plant','chest','armchair',0])}
    if(slotOf(wall,'window')<0){for(i=0;i<4;i++)if(i!==ms){wall[i]='window';break}}
    var g=[],free=[0,1,2,3].sort(function(){return R()-.5}),k=0;
    units.forEach(function(t,j){var P=3.6+R()*2.2,o=R()*5;
      if(t==='mirror'){g.push({t:'mirror',slot:ms,P:P,o:o,pose:'wave'});return}
      if(t==='sleepy'){g.push({t:'sleepy',x:SLOTX[ls]+(ls<2?30:-30),y:292,ax:6,ay:5,fx:.5,fy:.6,P:P,o:o,pose:'yawn'});return}
      var s=free[k++%4],x=SLOTX[s]+(R()-.5)*30,y=165+R()*130,ax=18+R()*36,ay=10+R()*22,fx=.35+R()*.3,fy=.5+R()*.4;
      if(t==='twins'){x=Math.max(84,Math.min(276,x));y=Math.max(170,Math.min(290,y))}
      x=Math.max(30+ax,Math.min(330-ax,x));
      var sp=Math.hypot(ax*fx,ay*fy);if(sp>40){ax*=40/sp;ay*=40/sp}
      g.push({t:t,x:x,y:y,ax:ax,ay:ay,fx:fx,fy:fy,P:P,o:o,pose:pick(t==='shy'?['peek']:['wave','spin','peek'])})});
    var B=0;g.forEach(function(s){B+=s.t==='twins'?200+TWIN_PTS:BASE[s.t]});
    return {th:th,wall:wall,floor:floor,cat:Math.floor(R()*4),film:g.length+3,quota:B+90+20*g.length,vf:[180,400],g:g,gen:true}}
  function roomFor(i){return i<ROOMS.length?ROOMS[i]:genRoom(i)}

  function buildGhosts(room){var out=[];
    room.g.forEach(function(s,k){
      function mk(type,ex){var o={id:out.length,type:type,hx:s.x,hy:s.y,ax:s.ax||0,ay:s.ay||0,fx:s.fx||.5,fy:s.fy||.7,px:k*1.7,py:k*2.3+.5,
          P:s.P||5,D:1.1,o:s.o||0,pose:s.pose||'wave',col:COLS[out.length%COLS.length],r:14,mt:0,sx:0,sy:0,svx:0,svy:0,nerv:0,
          x:s.x,y:s.y,posing:false,pre:false,poseT:0,hidden:false,base:BASE[type],pair:-1,flee:0};
        for(var q in ex)o[q]=ex[q];out.push(o);return o}
      if(s.t==='twins'){mk('twin',{sign:1,r:12,pair:k,col:'#ffd0e6'});mk('twin',{sign:-1,r:12,pair:k,col:'#c8e6ff'})}
      else if(s.t==='mirror'){var m=mirrorRect(room,s.slot);mk('mirror',{hx:m.x+m.w/2,hy:m.y+m.h/2,ax:8,ay:17,fx:.9,fy:.7,r:11,mir:m,col:'#d9ccff'})}
      else mk(s.t,s.t==='sleepy'?{col:'#ffe2b8'}:{})});
    return out}
  function newState(room){return {room:room,t:0,ghosts:buildGhosts(room),vf:{x:room.vf[0],y:room.vf[1]},hist:[],vfSpeed:0,
    lampOn:true,film:room.film,best:{},progress:0,phase:'play',cleared:false,failed:false,cool:0,photos:0,events:[],groupShot:false}}
  function clampVF(st){st.vf.x=Math.max(FW/2+2,Math.min(W-FW/2-2,st.vf.x));st.vf.y=Math.max(RY0+FH/2+2,Math.min(RY1-FH/2-2,st.vf.y))}
  function frame(st){return {x:st.vf.x-FW/2,y:st.vf.y-FH/2,w:FW,h:FH}}
  function isBlurry(hist,t){if(!hist.length)return false;var c=hist[hist.length-1];
    for(var i=0;i<hist.length;i++){var h=hist[i];if(h.t>=t-.2-1e-9&&Math.hypot(h.x-c.x,h.y-c.y)>BLUR_PX)return true}return false}
  function poseInfo(gh,t){var ph=((t+gh.o)%gh.P+gh.P)%gh.P,st=gh.P-gh.D;
    return {posing:ph>=st,pre:ph<st&&ph>=st-.6,poseT:ph>=st?(ph-st)/gh.D:0,until:ph>=st?0:st-ph}}
  function groupSpot(st,gh){var n=st.ghosts.length,two=n>4,row=two?(gh.id<Math.ceil(n/2)?0:1):0,
      cnt=two?(row?n-Math.ceil(n/2):Math.ceil(n/2)):n,idx=two&&row?gh.id-Math.ceil(n/2):gh.id;
    return {x:180+(idx-(cnt-1)/2)*30,y:236+(two?(row?16:-16):0)}}
  function updGhost(gh,st,dt){
    if(st.phase==='group'){var sp=groupSpot(st,gh),k=Math.min(1,dt*5);gh.x+=(sp.x-gh.x)*k;gh.y+=(sp.y-gh.y)*k;
      gh.posing=true;gh.pre=false;gh.hidden=false;gh.poseT=(st.t*.7+gh.id*.13)%1;return}
    var pi=poseInfo(gh,st.t);gh.posing=pi.posing;gh.pre=pi.pre;gh.poseT=pi.poseT;
    gh.hidden=gh.type==='sleepy'&&st.lampOn;
    if(!gh.posing)gh.mt+=dt;
    var bx=gh.hx+gh.ax*Math.sin(gh.fx*gh.mt+gh.px),by=gh.hy+gh.ay*Math.sin(gh.fy*gh.mt+gh.py);
    if(gh.type==='twin'){var an=gh.mt*1.1,sep=17+12*(.5+.5*Math.sin(gh.mt*.6));bx+=Math.cos(an)*sep*gh.sign;by+=Math.sin(an)*sep*gh.sign*.8}
    if(gh.type==='shy'){var f=frame(st),cx=bx+gh.sx,cy=by+gh.sy,m=12;
      var near=cx+gh.r>f.x-m&&cx-gh.r<f.x+f.w+m&&cy+gh.r>f.y-m&&cy-gh.r<f.y+f.h+m;
      if(near&&!gh.posing)gh.nerv+=dt*(st.vfSpeed>90?3.2:.35);else gh.nerv=Math.max(0,gh.nerv-dt*.4);
      if(gh.nerv>=1){var dx=cx-st.vf.x,dy=cy-st.vf.y,d=Math.hypot(dx,dy)||1;gh.svx=dx/d*240;gh.svy=dy/d*170;gh.nerv=0;gh.flee=.8;
        st.events.push({k:'flee',x:cx,y:cy})}
      gh.sx+=gh.svx*dt;gh.sy+=gh.svy*dt;var dm=Math.exp(-2.5*dt),rt=Math.exp(-.35*dt);gh.svx*=dm;gh.svy*=dm;gh.sx*=rt;gh.sy*=rt;gh.flee=Math.max(0,gh.flee-dt)}
    var x=bx+gh.sx,y=by+gh.sy;
    if(gh.type!=='mirror'){var X=Math.max(gh.r+6,Math.min(W-gh.r-6,x)),Y=Math.max(RY0+gh.r+20,Math.min(RY1-gh.r-24,y));gh.sx+=X-x;gh.sy+=Y-y;x=X;y=Y}
    gh.x=x;gh.y=y}
  function stepSim(st,dt){st.t+=dt;st.cool=Math.max(0,st.cool-dt);clampVF(st);
    st.hist.push({t:st.t,x:st.vf.x,y:st.vf.y});while(st.hist.length>2&&st.hist[0].t<st.t-.3)st.hist.shift();
    var o=null;for(var i=0;i<st.hist.length;i++)if(st.hist[i].t>=st.t-.2){o=st.hist[i];break}
    st.vfSpeed=o&&st.t>o.t?Math.hypot(st.vf.x-o.x,st.vf.y-o.y)/(st.t-o.t):0;
    for(i=0;i<st.ghosts.length;i++)updGhost(st.ghosts[i],st,dt)}
  function subjects(st){return st.ghosts.filter(function(g){return !g.hidden}).map(function(g){
    return {id:g.id,x:g.x,y:g.y,r:g.r,base:g.base,posing:g.posing,type:g.type,pair:g.pair}})}
  function thirdsBonus(f,x,y){var d=1e9;[[1,1],[2,1],[1,2],[2,2]].forEach(function(p){d=Math.min(d,Math.hypot(x-(f.x+f.w*p[0]/3),y-(f.y+f.h*p[1]/3)))});
    return Math.round(THIRDS_MAX*Math.max(0,1-d/24))}
  function scorePhoto(f,subs,blurry){var m=blurry?.5:1,out={ghosts:[],twins:[],total:0,blurry:blurry,cut:0},pairs={};
    subs.forEach(function(s){var inside=s.x-s.r>=f.x&&s.x+s.r<=f.x+f.w&&s.y-s.r>=f.y&&s.y+s.r<=f.y+f.h;
      if(!inside){if(s.x+s.r>f.x&&s.x-s.r<f.x+f.w&&s.y+s.r>f.y&&s.y-s.r<f.y+f.h)out.cut++;return}
      var th=thirdsBonus(f,s.x,s.y),po=s.posing?POSE_PTS:0,pts=Math.round((s.base+th+po)*m);
      out.ghosts.push({id:s.id,pts:pts,th:th,po:po,base:s.base,type:s.type});out.total+=pts;
      if(s.pair>=0)pairs[s.pair]=(pairs[s.pair]||0)+1});
    for(var p in pairs)if(pairs[p]>=2){var tw=Math.round(TWIN_PTS*m);out.twins.push({pair:+p,pts:tw});out.total+=tw}
    return out}
  function scoreGroup(f,subs,blurry){var n=0;subs.forEach(function(s){if(s.x-s.r>=f.x&&s.x+s.r<=f.x+f.w&&s.y-s.r>=f.y&&s.y+s.r<=f.y+f.h)n++});
    var all=n===subs.length&&n>0;return {group:true,n:n,all:all,blurry:blurry,total:Math.round(n*60*(all?2:1)*(blurry?.5:1)),ghosts:[],twins:[],cut:0}}
  function takePhoto(st){
    if(st.cool>0)return null;if(st.phase==='group'){if(st.groupShot)return null}else if(st.phase!=='play'||st.film<=0)return null;
    st.cool=.4;var f=frame(st),bl=isBlurry(st.hist,st.t),subs=subjects(st),res;
    if(st.phase==='group'){st.groupShot=true;res=scoreGroup(f,subs,bl);res.delta=res.total;return res}
    st.film--;res=scorePhoto(f,subs,bl);var delta=0;
    res.ghosts.forEach(function(q){var b=st.best[q.id]||0;if(q.pts>b){delta+=q.pts-b;st.best[q.id]=q.pts}});
    res.twins.forEach(function(q){var k='tw'+q.pair,b=st.best[k]||0;if(q.pts>b){delta+=q.pts-b;st.best[k]=q.pts}});
    st.progress+=delta;res.delta=delta;st.photos++;
    if(st.progress>=st.room.quota)st.cleared=true;else if(st.film<=0)st.failed=true;
    return res}

  /* ---------- 표시 상태 ---------- */
  var st,level,time,T,score0,keys,dragging,lastP,lastTapT,lastTapP,kv,photos,dev,pendingCap,flash,banner,failT,catJoy,catEye,
      sparks,spawnT,roomCv,bgCv,spCv,noiseCv,bgKey,earA,blinkT,started,cueSeen,lampFl,bgMotes;
  function L(a,ko,en){return a.lang==='ko'?ko:en}
  var FONT='px Jua, system-ui, sans-serif';
  function setupRoom(){st=newState(roomFor(level));bgKey=null;failT=0;cueSeen={};
    banner={t:1.6,k:'room'}}
  function nextRoom(){level++;setupRoom()}

  if(typeof window!=='undefined'&&!window.__gcKeys){window.__gcKeys={l:0,r:0,u:0,d:0,shoot:0,lamp:0};
    var map={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'u',KeyW:'u',ArrowDown:'d',KeyS:'d'};
    window.addEventListener('keydown',function(e){var k=window.__gcKeys;if(map[e.code]){k[map[e.code]]=1;k.kb=1}
      else if(e.code==='Space'&&!e.repeat)k.shoot=1;else if(e.code==='KeyL'&&!e.repeat)k.lamp=1});
    window.addEventListener('keyup',function(e){var k=window.__gcKeys;if(map[e.code])k[map[e.code]]=0})}

  function shoot(a){var res=takePhoto(st);if(!res)return;
    a.beep(1900,.03,'square');a.beep(520,.07,'triangle');setTimeout(function(){a.beep(300,.05,'square')},70);
    flash=1;pendingCap=res;res.room=level;
    var f=frame(st),cx=f.x+f.w/2,cy=f.y+f.h/2;
    if(res.group){if(res.total>0){a.add(res.total);a.sfx('win');a.burst(cx,cy,'#ffe9a8',22);a.pop(cx,cy-30,L(a,'단체 사진! +','Group photo! +')+res.total,'#ffe9a8');catJoy=2}
      else {a.beep(200,.2,'sine');a.pop(cx,cy,L(a,'아무도 없어요','Nobody there'),'#cfd8e8')}return}
    if(res.delta>0)a.add(res.delta);
    if(res.ghosts.length){var anyPose=res.ghosts.some(function(q){return q.po>0});
      if(res.blurry){a.beep(240,.16,'sawtooth');a.pop(cx,cy-20,L(a,'흔들렸어요 ½','Blurry ½'),'#ffb4a0');a.burst(cx,cy,'#ffb4a0',8)}
      else if(anyPose){a.sfx('win');a.burst(cx,cy,'#fff1a8',20);catJoy=1.6}else{a.sfx('coin');a.burst(cx,cy,'#c8f4ff',12)}
      if(res.delta>0)a.pop(cx,cy+8,'+'+res.delta,'#fff6c8');else a.pop(cx,cy+8,L(a,'더 좋은 사진이 필요해요','Need a better shot'),'#e8dccf')}
    else{a.beep(180,.18,'triangle');a.shake(3);a.pop(cx,cy,res.cut?L(a,'잘렸어요!','Cut off!'):L(a,'텅 빈 사진','Empty photo'),'#e8dccf');a.burst(cx,cy,'#9a8f86',6)}
    if(st.cleared){time=Math.min(TMAX,time+14);st.phase='group';st.gt=3.4;a.sfx('win');banner={t:3.4,k:'clear'};
      a.burst(180,250,'#ffe08a',30);a.shake(4);catJoy=3}
    else if(st.failed){failT=1.6;banner={t:1.6,k:'fail'};time=Math.max(.5,time-4);a.sfx('hit');a.shake(6);a.pop(180,260,'-4s','#ff9d8a')}}

  function hookPtr(){if(typeof document==='undefined'||window.__gcPtr)return;var cv=document.querySelector('#stage canvas');if(!cv)return;window.__gcPtr=[];
    cv.addEventListener('pointerdown',function(e){var r=cv.getBoundingClientRect();window.__gcPtr.push([(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*640])})}
  function update(dt,inp,a){var K=window.__gcKeys||{},i;started=true;hookPtr();
    /* 터치/마우스 */
    var PQ=window.__gcPtr||[];while(PQ.length){var pd=PQ.shift(),px=pd[0],py=pd[1],f=frame(st),lr=lampRect(st.room);
      if(Math.hypot(px-180,py-603)<34)shoot(a);
      else if(lr&&px>lr.x&&px<lr.x+lr.w&&py>lr.y&&py<lr.y+lr.h&&!(px>f.x&&px<f.x+f.w&&py>f.y&&py<f.y+f.h))toggleLamp(a);
      else{var inF=px>f.x&&px<f.x+f.w&&py>f.y&&py<f.y+f.h;
        if(inF&&T-lastTapT<.38&&Math.hypot(px-lastTapP[0],py-lastTapP[1])<34){shoot(a);lastTapT=-9}else if(inF){lastTapT=T;lastTapP=[px,py]}
        dragging=true;lastP=[px,py]}}
    if(dragging&&inp.down&&inp.x!=null){st.vf.x+=inp.x-lastP[0];st.vf.y+=inp.y-lastP[1];lastP=[inp.x,inp.y];kv.x=kv.y=0}
    if(!inp.down)dragging=false;
    /* 키보드: 가속 이동 */
    var kx=(K.r?1:0)-(K.l?1:0),ky=(K.d?1:0)-(K.u?1:0);
    if(kx){kv.x+=kx*1000*dt;if(kv.x*kx<0)kv.x*=Math.exp(-18*dt)}else kv.x*=Math.exp(-16*dt);
    if(ky){kv.y+=ky*1000*dt;if(kv.y*ky<0)kv.y*=Math.exp(-18*dt)}else kv.y*=Math.exp(-16*dt);
    var sp=Math.hypot(kv.x,kv.y);if(sp>270){kv.x*=270/sp;kv.y*=270/sp}
    st.vf.x+=kv.x*dt;st.vf.y+=kv.y*dt;
    if(K.shoot){K.shoot=0;shoot(a)}
    if(K.lamp){K.lamp=0;toggleLamp(a)}
    stepSim(st,dt);
    for(i=0;i<st.events.length;i++){var e=st.events[i];if(e.k==='flee'){a.beep(900,.05,'sine');a.beep(1300,.06,'sine');a.pop(e.x,e.y-20,L(a,'앗, 부끄러워!','Eek! Too close!'),'#ffd0e6')}}
    st.events.length=0;
    /* 포즈 예고음: 뷰파인더 안에 보이는 유령이 곧 포즈할 때 */
    var f2=frame(st);st.ghosts.forEach(function(gh){var vis=!gh.hidden&&gh.x>f2.x&&gh.x<f2.x+f2.w&&gh.y>f2.y&&gh.y<f2.y+f2.h,key=gh.id+':'+Math.floor((st.t+gh.o)/gh.P);
      if(vis&&gh.pre&&!cueSeen[key]){cueSeen[key]=1;a.beep(1320,.06,'sine');a.beep(1760,.08,'sine')}});
    if(st.phase==='group'){st.gt-=dt;if(st.gt<=0)nextRoom();return}
    if(failT>0){failT-=dt;if(failT<=0)setupRoom();return}
    time-=dt;a.tempo(time<10?1.35:1.05);
    if(time<10&&Math.ceil(time)!==Math.ceil(time+dt))a.beep(880,.04,'square');
    if(time<=0){time=0;a.over()}}
  function toggleLamp(a){if(!lampRect(st.room)){a.beep(200,.05,'sine');return}st.lampOn=!st.lampOn;lampFl=.3;
    a.beep(st.lampOn?700:420,.05,'square');a.beep(st.lampOn?1000:300,.06,'triangle');var lr=lampRect(st.room);a.burst(lr.x+26,lr.y+30,st.lampOn?'#ffe2a0':'#8090c0',8)}

  /* ---------- 그리기 도우미 ---------- */
  function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  function hexA(h,a){var n=parseInt(h.slice(1),16);return 'rgba('+(n>>16)+','+(n>>8&255)+','+(n&255)+','+a+')'}
  function mkCv(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
  function act(px,py,kind){var m=0;if(!st)return 0;st.ghosts.forEach(function(gh){if(gh.type==='mirror')return;if(gh.type==='sleepy'&&kind!=='lamp')return;
      m=Math.max(m,1-Math.hypot(gh.x-px,gh.y-py)/(kind==='cat'?170:95))});return Math.max(0,m)}

  function drawBg(c,room){var th=THEMES[room.th],i,j;
    var wg=c.createLinearGradient(0,RY0,0,FLOOR);wg.addColorStop(0,th.w2);wg.addColorStop(.5,th.w1);wg.addColorStop(1,th.w2);c.fillStyle=wg;c.fillRect(0,RY0,W,FLOOR-RY0);
    c.save();c.beginPath();c.rect(0,RY0,W,FLOOR-RY0);c.clip();
    if(th.pat==='stripe'){c.fillStyle='rgba(255,240,210,.07)';for(i=0;i<W;i+=24)c.fillRect(i,RY0,10,FLOOR-RY0);
      c.fillStyle='rgba(255,240,210,.10)';for(i=12;i<W;i+=24)for(j=RY0+10;j<FLOOR;j+=30){c.beginPath();c.arc(i+5,j,2,0,7);c.fill()}}
    else if(th.pat==='dots'){for(j=RY0+12,i=0;j<FLOOR;j+=26,i++)for(var x=(i%2)*16;x<W;x+=32){c.fillStyle='rgba(255,246,220,.12)';c.beginPath();c.arc(x,j,4,0,7);c.fill();
        c.fillStyle='rgba(255,246,220,.07)';c.beginPath();c.arc(x+16,j+13,2,0,7);c.fill()}}
    else if(th.pat==='diamond'){c.strokeStyle='rgba(255,220,170,.12)';c.lineWidth=1.2;for(i=-FLOOR;i<W+FLOOR;i+=28){c.beginPath();c.moveTo(i,RY0);c.lineTo(i+FLOOR,FLOOR+RY0);c.moveTo(i,RY0);c.lineTo(i-FLOOR,FLOOR+RY0);c.stroke()}
      c.fillStyle='rgba(255,226,170,.14)';for(j=RY0;j<FLOOR;j+=28)for(i=((j-RY0)/28%2)*14;i<W;i+=28){c.beginPath();c.moveTo(i,j-4);c.lineTo(i+3,j);c.lineTo(i,j+4);c.lineTo(i-3,j);c.fill()}}
    else{for(i=0;i<W;i+=30){c.fillStyle=i%60?'rgba(0,0,0,.08)':'rgba(255,220,180,.05)';c.fillRect(i,RY0,30,FLOOR-RY0);c.fillStyle='rgba(30,15,5,.35)';c.fillRect(i,RY0,1.5,FLOOR-RY0);
        for(j=RY0+20+(i*7)%40;j<FLOOR;j+=70){c.fillStyle='rgba(30,15,5,.3)';c.beginPath();c.arc(i+6,j,1.3,0,7);c.arc(i+24,j,1.3,0,7);c.fill()}}
      /* 지붕 들보 */
      c.fillStyle='#3c271a';c.beginPath();c.moveTo(0,RY0);c.lineTo(90,RY0);c.lineTo(0,RY0+110);c.fill();c.beginPath();c.moveTo(W,RY0);c.lineTo(W-90,RY0);c.lineTo(W,RY0+110);c.fill();
      c.fillStyle='#5a3c28';c.fillRect(0,RY0+6,W,12);c.fillStyle='rgba(0,0,0,.25)';c.fillRect(0,RY0+18,W,4)}
    c.restore();
    /* 징두리 판자 */
    var tg=c.createLinearGradient(0,FLOOR-34,0,FLOOR);tg.addColorStop(0,th.trim);tg.addColorStop(1,'#1a110b');c.fillStyle=tg;c.fillRect(0,FLOOR-34,W,34);
    c.fillStyle='rgba(255,230,190,.12)';c.fillRect(0,FLOOR-34,W,2);for(i=10;i<W;i+=50){c.strokeStyle='rgba(255,230,190,.08)';c.strokeRect(i,FLOOR-27,38,20)}
    /* 바닥 */
    var fg=c.createLinearGradient(0,FLOOR,0,RY1);fg.addColorStop(0,th.f2);fg.addColorStop(1,th.f1);c.fillStyle=fg;c.fillRect(0,FLOOR,W,RY1-FLOOR);
    c.strokeStyle='rgba(20,10,5,.3)';c.lineWidth=1;for(i=-6;i<=12;i++){c.beginPath();c.moveTo(180+i*22,FLOOR);c.lineTo(180+i*60,RY1);c.stroke()}
    for(j=FLOOR+12,i=0;j<RY1;j+=(j-FLOOR)*.35+10,i++){c.strokeStyle='rgba(255,230,190,.06)';c.beginPath();c.moveTo(0,j);c.lineTo(W,j);c.stroke()}
    /* 러그 */
    c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(180,436,150,26,0,0,7);c.fill();
    c.fillStyle='#8a3a42';c.beginPath();c.ellipse(180,432,146,24,0,0,7);c.fill();c.strokeStyle='#e8c07a';c.lineWidth=2;c.beginPath();c.ellipse(180,432,132,19,0,0,7);c.stroke();
    c.strokeStyle='rgba(232,192,122,.5)';c.lineWidth=1;c.beginPath();c.ellipse(180,432,110,14,0,0,7);c.stroke();
    /* 바닥 그림자 */
    room.floor.forEach(function(p,k){if(p){c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(SLOTX[k],FB+2,p==='lamp'?20:36,6,0,0,7);c.fill()}})}

  function drawWindow(c,x,th,a2){var y0=114,w=64,h=94;
    c.fillStyle='rgba(0,0,0,.3)';c.fillRect(x-w/2+3,y0+4,w,h);
    var sg=c.createLinearGradient(0,y0,0,y0+h);sg.addColorStop(0,'#1c2850');sg.addColorStop(1,'#4c5c8c');c.fillStyle=sg;c.fillRect(x-w/2,y0,w,h);
    c.fillStyle='#f6eec0';c.beginPath();c.arc(x+14,y0+20,8,0,7);c.fill();c.fillStyle='#1c2850';c.beginPath();c.arc(x+18,y0+17,7,0,7);c.fill();
    c.fillStyle='#22304a';c.beginPath();c.moveTo(x-w/2,y0+h);c.lineTo(x-w/2,y0+70);c.lineTo(x-14,y0+62);c.lineTo(x+4,y0+74);c.lineTo(x+w/2,y0+64);c.lineTo(x+w/2,y0+h);c.fill();
    c.strokeStyle='rgba(200,220,255,.45)';c.lineWidth=1;for(var i=0;i<14;i++){var rx=x-w/2+((i*37)%w),ry=y0+((T*210+i*53)%h);c.beginPath();c.moveTo(rx,ry);c.lineTo(rx-2,ry+8);c.stroke()}
    c.strokeStyle='#5a3a24';c.lineWidth=5;c.strokeRect(x-w/2,y0,w,h);c.lineWidth=3;c.beginPath();c.moveTo(x,y0);c.lineTo(x,y0+h);c.moveTo(x-w/2,y0+h/2);c.lineTo(x+w/2,y0+h/2);c.stroke();
    c.fillStyle='#4a3020';c.fillRect(x-w/2-6,y0+h,w+12,6);
    var s=a2*Math.sin(T*7)*8+Math.sin(T*1.1+x)*1.5;
    [-1,1].forEach(function(d){var ex=x+d*(w/2+6);c.fillStyle=th.cur;c.beginPath();c.moveTo(ex,y0-10);c.lineTo(ex-d*20,y0-10);
      c.quadraticCurveTo(ex-d*(12-s*d*.4),y0+50,ex-d*(16+s*d),y0+h+18);c.lineTo(ex+d*2,y0+h+18);c.quadraticCurveTo(ex+d*2+s*.3,y0+50,ex,y0-10);c.fill();
      c.strokeStyle='rgba(0,0,0,.2)';c.lineWidth=1.5;c.beginPath();c.moveTo(ex-d*8,y0-6);c.quadraticCurveTo(ex-d*(6-s*.3),y0+50,ex-d*(8+s*.6),y0+h+16);c.stroke()});
    c.fillStyle='#3a2416';c.fillRect(x-w/2-16,y0-14,w+32,5);c.fillStyle='#d8b060';c.beginPath();c.arc(x-w/2-16,y0-11.5,4,0,7);c.arc(x+w/2+16,y0-11.5,4,0,7);c.fill()}
  function drawPainting(c,x,a2){var tilt=a2*Math.sin(T*10)*.13+.03;c.save();c.translate(x,124);c.rotate(tilt);
    c.strokeStyle='#2a1a10';c.lineWidth=1;c.beginPath();c.moveTo(-14,10);c.lineTo(0,0);c.lineTo(14,10);c.stroke();
    c.fillStyle='rgba(0,0,0,.3)';c.fillRect(-25,12,54,44);c.fillStyle='#c9993e';c.fillRect(-27,8,54,44);c.fillStyle='#8a6422';c.fillRect(-23,12,46,36);
    var pg=c.createLinearGradient(0,14,0,46);pg.addColorStop(0,'#f2b98a');pg.addColorStop(1,'#a65a6a');c.fillStyle=pg;c.fillRect(-21,14,42,32);
    c.fillStyle='#fff3c8';c.beginPath();c.arc(8,24,5,0,7);c.fill();c.fillStyle='#5a7a5a';c.beginPath();c.moveTo(-21,46);c.quadraticCurveTo(-8,30,6,40);c.quadraticCurveTo(14,34,21,38);c.lineTo(21,46);c.fill();
    c.fillStyle='#2e3a2e';c.beginPath();c.ellipse(-8,40,4,3,0,0,7);c.fill();c.beginPath();c.moveTo(-11,38);c.lineTo(-10,35);c.lineTo(-8,38);c.moveTo(-7,38);c.lineTo(-5.5,35);c.lineTo(-4.5,38.5);c.fill();
    c.restore()}
  function drawClock(c,x,a2){var y=112+Math.sin(T*30)*a2*1.5,sp=1+a2*6;c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.arc(x+3,y+3,19,0,7);c.fill();
    c.fillStyle='#6a4228';c.beginPath();c.arc(x,y,19,0,7);c.fill();c.fillStyle='#f6ead0';c.beginPath();c.arc(x,y,15,0,7);c.fill();
    c.fillStyle='#6a4228';for(var i=0;i<12;i++){var an=i/12*6.283;c.fillRect(x+Math.cos(an)*12-1,y+Math.sin(an)*12-1,2,2)}
    c.strokeStyle='#2a1a10';c.lineCap='round';c.lineWidth=2;var m=T*.5*sp,s=Math.floor(T)*6.283/60;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(m-1.57)*10,y+Math.sin(m-1.57)*10);c.moveTo(x,y);c.lineTo(x+Math.cos(m/12-1.57)*7,y+Math.sin(m/12-1.57)*7);c.stroke();
    c.strokeStyle='#c0443a';c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(s*sp-1.57)*13,y+Math.sin(s*sp-1.57)*13);c.stroke();c.lineCap='butt'}
  function drawMirror(c,x,hasG){var m={x:x-23,y:140,w:46,h:68};
    c.fillStyle='rgba(0,0,0,.3)';rr(c,m.x-4,m.y-2,m.w+12,m.h+12,14);c.fill();
    c.fillStyle='#d0a040';rr(c,m.x-6,m.y-6,m.w+12,m.h+12,14);c.fill();c.fillStyle='#a07020';c.beginPath();c.arc(x,m.y-6,8,Math.PI,0);c.fill();
    c.fillStyle='#ffe08a';c.beginPath();c.arc(x,m.y-9,3,0,7);c.fill();
    var gg=c.createLinearGradient(m.x,m.y,m.x+m.w,m.y+m.h);gg.addColorStop(0,'#c8d8e4');gg.addColorStop(.5,'#8aa0b4');gg.addColorStop(1,'#6a8098');c.fillStyle=gg;rr(c,m.x,m.y,m.w,m.h,10);c.fill();
    c.save();rr(c,m.x,m.y,m.w,m.h,10);c.clip();c.fillStyle='rgba(255,255,255,.35)';var sh=(T*30)%140-40;
    c.beginPath();c.moveTo(m.x+sh,m.y);c.lineTo(m.x+sh+10,m.y);c.lineTo(m.x+sh-20,m.y+m.h);c.lineTo(m.x+sh-30,m.y+m.h);c.fill();
    if(hasG){var gl=(T*.6)%1;if(gl<.25){var gx=m.x+10+((T*.6|0)*17)%26,gy=m.y+14+((T*.6|0)*29)%40,k=Math.sin(gl/.25*Math.PI);
        c.fillStyle='rgba(255,255,255,'+(.9*k)+')';c.beginPath();for(var i=0;i<8;i++){var an=i*Math.PI/4,rad=i%2?2:7*k;c.lineTo(gx+Math.cos(an)*rad,gy+Math.sin(an)*rad)}c.fill()}}
    c.restore();return m}
  function drawTable(c,x,a1,a2,th){
    c.fillStyle='#4a2c1a';c.fillRect(x-24,350,5,42);c.fillRect(x+19,350,5,42);
    c.fillStyle='#f0e2c8';c.beginPath();c.moveTo(x-36,332);c.lineTo(x+36,332);c.lineTo(x+38,356);
    for(var i=0;i<6;i++)c.quadraticCurveTo(x+38-i*12.7-6,362,x+38-(i+1)*12.7,356);c.closePath();c.fill();
    c.fillStyle='rgba(0,0,0,.08)';c.fillRect(x-36,340,72,3);
    c.fillStyle='#6a4228';c.beginPath();c.ellipse(x,332,36,7,0,0,7);c.fill();c.fillStyle='#8a5a36';c.beginPath();c.ellipse(x,331,34,6,0,0,7);c.fill();
    /* 찻잔 */
    var dx=a1*Math.sin(T*40)*2.2,dy=-Math.abs(Math.sin(T*23))*a1*2.6,cx=x-10;
    c.fillStyle='#f6f2ea';c.beginPath();c.ellipse(cx,330,11,3,0,0,7);c.fill();
    c.save();c.translate(dx,dy);c.fillStyle='#fffaf0';c.beginPath();c.moveTo(cx-8,318);c.lineTo(cx+8,318);c.quadraticCurveTo(cx+8,329,cx,329);c.quadraticCurveTo(cx-8,329,cx-8,318);c.fill();
    c.strokeStyle='#fffaf0';c.lineWidth=2;c.beginPath();c.arc(cx+9,322,3,-1.4,1.4);c.stroke();c.fillStyle='#d86a7a';c.fillRect(cx-6,321,12,2);
    c.fillStyle='#7a4a2a';c.beginPath();c.ellipse(cx,318,8,2,0,0,7);c.fill();c.restore();
    c.strokeStyle='rgba(255,255,255,'+(.18+a1*.2)+')';c.lineWidth=1.5;c.beginPath();c.moveTo(cx,314);c.quadraticCurveTo(cx-4+Math.sin(T*2)*3,306,cx+1,298);c.stroke();
    /* 초 */
    var bx=x+16;c.fillStyle='#e8d8a0';c.fillRect(bx-6,327,12,3);c.fillStyle='#fff4dc';c.fillRect(bx-3,310,6,18);
    var lean=Math.sin(T*9)*.08+a2*Math.sin(T*31)*.45,hgt=9*(1+.12*Math.sin(T*13)+a2*.5*Math.abs(Math.sin(T*19)));
    var fl=c.createRadialGradient(bx,304,1,bx,304,30+a2*12);fl.addColorStop(0,'rgba(255,200,110,.35)');fl.addColorStop(1,'rgba(255,200,110,0)');c.fillStyle=fl;c.beginPath();c.arc(bx,304,42,0,7);c.fill();
    c.save();c.translate(bx,310);c.rotate(lean);c.fillStyle='#ffb84a';c.beginPath();c.moveTo(0,-hgt);c.quadraticCurveTo(4.5,-2,0,0);c.quadraticCurveTo(-4.5,-2,0,-hgt);c.fill();
    c.fillStyle='#fff3b0';c.beginPath();c.ellipse(0,-3,1.6,3,0,0,7);c.fill();c.restore()}
  function drawLamp(c,x,on,a2){var fl=on?(1-(a2>.2&&Math.sin(T*27)>.3?a2*.6:0)):0;
    if(on){var lg=c.createRadialGradient(x,268,4,x,268,110);lg.addColorStop(0,'rgba(255,220,140,'+(.42*fl)+')');lg.addColorStop(1,'rgba(255,220,140,0)');c.fillStyle=lg;c.beginPath();c.arc(x,268,110,0,7);c.fill()}
    c.fillStyle='#3a2a20';c.beginPath();c.ellipse(x,FB,14,4,0,0,7);c.fill();c.fillStyle='#8a6a40';c.fillRect(x-2,262,4,130);
    c.fillStyle='#c09050';c.fillRect(x-1,262,1.2,130);
    var sh=c.createLinearGradient(x-25,0,x+25,0);sh.addColorStop(0,on?'#d8a050':'#6a5640');sh.addColorStop(.5,on?'#ffe0a0':'#8a7454');sh.addColorStop(1,on?'#d8a050':'#6a5640');
    c.fillStyle=sh;c.beginPath();c.moveTo(x-13,236);c.lineTo(x+13,236);c.lineTo(x+25,266);c.lineTo(x-25,266);c.closePath();c.fill();
    c.strokeStyle='rgba(90,50,20,.5)';c.lineWidth=1.5;c.beginPath();c.moveTo(x-25,266);c.lineTo(x+25,266);c.stroke();
    c.fillStyle='rgba(160,90,40,.5)';for(var i=-20;i<=20;i+=8){c.beginPath();c.arc(x+i,268,1.6,0,7);c.fill()}
    c.strokeStyle='#5a4030';c.lineWidth=1;c.beginPath();c.moveTo(x+10,266);c.lineTo(x+10,282+Math.sin(T*2)*1);c.stroke();c.fillStyle='#e8c070';c.beginPath();c.arc(x+10,284,2,0,7);c.fill()}
  function drawBookshelf(c,x,a2){c.fillStyle='rgba(0,0,0,.3)';c.fillRect(x-26,250,58,142);c.fillStyle='#5a3620';c.fillRect(x-29,246,58,146);c.fillStyle='#3a2214';c.fillRect(x-25,252,50,136);
    var BC=['#c0504a','#4a7ab0','#d8b050','#5a9a6a','#9a5aa0','#e08a5a'];
    for(var s=0;s<3;s++){var y=252+s*45;c.fillStyle='#6a4228';c.fillRect(x-27,y+40,54,5);
      for(var b=0;b<6;b++){var bw=7,bh=30+((b*7+s*3)%9),bx=x-23+b*8,wig=(s===1&&b===3)?a2*Math.sin(T*18)*3-a2*4:0;
        c.fillStyle=BC[(b+s*2)%6];c.fillRect(bx+wig*.3,y+40-bh+wig,bw,bh);c.fillStyle='rgba(255,255,255,.25)';c.fillRect(bx+1+wig*.3,y+44-bh+wig,bw-2,2)}}}
  function drawPlant(c,x,a2){var sw=a2*Math.sin(T*9)*.3+Math.sin(T*1.3+x)*.05;
    for(var i=0;i<6;i++){var an=-2.6+i*.42+sw*(1+i%2);c.save();c.translate(x,366);c.rotate(an+1.57);c.fillStyle=i%2?'#4a8a5a':'#5aa06a';c.beginPath();c.ellipse(0,-22,7,22,0,0,7);c.fill();
      c.strokeStyle='rgba(0,40,10,.3)';c.lineWidth=1;c.beginPath();c.moveTo(0,-2);c.lineTo(0,-40);c.stroke();c.restore()}
    c.fillStyle='#c0603a';c.beginPath();c.moveTo(x-16,362);c.lineTo(x+16,362);c.lineTo(x+12,FB);c.lineTo(x-12,FB);c.fill();c.fillStyle='#d8784a';c.fillRect(x-17,360,34,6)}
  function drawChest(c,x,a2){var lid=-Math.abs(Math.sin(T*14))*a2*5;c.fillStyle='#6a3e22';rr(c,x-30,362,60,30,3);c.fill();
    c.fillStyle='#d0a040';c.fillRect(x-22,362,4,30);c.fillRect(x+18,362,4,30);
    c.save();c.translate(0,lid);c.fillStyle='#7a4a2a';c.beginPath();c.moveTo(x-31,364);c.lineTo(x-31,354);c.quadraticCurveTo(x,342,x+31,354);c.lineTo(x+31,364);c.fill();
    c.fillStyle='#d0a040';c.fillRect(x-4,358,8,9);c.restore();if(lid<-2){c.fillStyle='rgba(255,230,150,.5)';c.fillRect(x-28,363+lid,56,-lid)}}
  function drawArmchair(c,x,a2){var b=-Math.abs(Math.sin(T*12))*a2*3;c.fillStyle='#7a3a4a';rr(c,x-30,318,60,52,14);c.fill();
    c.fillStyle='#8e4a5a';rr(c,x-34,348,68,30,8);c.fill();c.fillStyle='#a05a6a';rr(c,x-24,344+b,48,16,7);c.fill();
    c.fillStyle='#6a2e3c';rr(c,x-38,338,12,40,6);c.fill();rr(c,x+26,338,12,40,6);c.fill();c.fillStyle='#3a2014';c.fillRect(x-30,378,5,14);c.fillRect(x+25,378,5,14);
    c.fillStyle='rgba(255,255,255,.1)';rr(c,x-26,322,52,6,3);c.fill()}
  function drawFire(c,x,a2){c.fillStyle='#8a3a2a';c.fillRect(x-38,296,76,96);c.strokeStyle='rgba(40,10,5,.35)';c.lineWidth=1;
    for(var j=0;j<8;j++)for(var i=0;i<5;i++)c.strokeRect(x-38+i*16+(j%2)*8-8,296+j*12,16,12);
    c.fillStyle='#4a2a1a';c.fillRect(x-44,288,88,10);c.fillStyle='#1a0e08';c.beginPath();c.moveTo(x-24,FB);c.lineTo(x-24,340);c.quadraticCurveTo(x,322,x+24,340);c.lineTo(x+24,FB);c.fill();
    var fl=c.createRadialGradient(x,380,2,x,380,60);fl.addColorStop(0,'rgba(255,170,80,.5)');fl.addColorStop(1,'rgba(255,170,80,0)');c.fillStyle=fl;c.beginPath();c.arc(x,380,60,0,7);c.fill();
    for(i=0;i<3;i++){var hx=x-10+i*10,h=18+Math.sin(T*9+i*2)*5+a2*12;c.fillStyle=i===1?'#ffd060':'#ff8a3a';c.beginPath();c.moveTo(hx-7,FB-4);c.quadraticCurveTo(hx-6,FB-h*.6,hx+Math.sin(T*7+i)*3,FB-4-h);c.quadraticCurveTo(hx+6,FB-h*.6,hx+7,FB-4);c.fill()}
    c.fillStyle='#5a3020';c.fillRect(x-16,FB-6,32,5)}
  function drawCat(c,x,a){var y=432,near=null,nd=1e9;st.ghosts.forEach(function(gh){if(gh.hidden||gh.type==='mirror')return;var d=Math.hypot(gh.x-x,gh.y-y);if(d<nd){nd=d;near=gh}});
    var alert=nd<170?1-nd/170:0,br=1+.05*Math.sin(T*2.2),hx=x-18,hy=422;
    var ta=near&&alert>0?Math.max(-.6,Math.min(.6,Math.atan2(near.y-hy,near.x-hx)+1.57)):0;earA+=(ta-earA)*.12;
    c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(x,y+12,34,7,0,0,7);c.fill();
    c.fillStyle='#c8a0d0';c.beginPath();c.ellipse(x,y+8,34,9,0,0,7);c.fill();c.fillStyle='#d8b8e0';c.beginPath();c.ellipse(x,y+6,30,6,0,0,7);c.fill();
    c.fillStyle='#f0a04a';c.beginPath();c.ellipse(x+4,y,24,12*br,0,0,7);c.fill();
    c.strokeStyle='#f0a04a';c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(x+24,y+2);c.quadraticCurveTo(x+34,y+12+Math.sin(T*1.5)*2,x+12,y+11);c.stroke();c.lineCap='butt';
    c.strokeStyle='#c8782a';c.lineWidth=2;for(var i=0;i<3;i++){c.beginPath();c.arc(x+4+i*7,y-6,6,3.6,4.4);c.stroke()}
    [-1,1].forEach(function(d){c.save();c.translate(hx+d*7,hy-8);c.rotate(earA*.8+d*.25);c.fillStyle='#f0a04a';c.beginPath();c.moveTo(-5,2);c.lineTo(0,-9);c.lineTo(5,2);c.fill();
      c.fillStyle='#f6b8c0';c.beginPath();c.moveTo(-2.5,1);c.lineTo(0,-5);c.lineTo(2.5,1);c.fill();c.restore()});
    c.fillStyle='#f0a04a';c.beginPath();c.arc(hx,hy,12,0,7);c.fill();c.fillStyle='#fff2dc';c.beginPath();c.ellipse(hx,hy+5,7,4.5,0,0,7);c.fill();
    var open=catJoy>0?2:alert>.35?1:0,bl=blinkT<.12;
    [-1,1].forEach(function(d){var ex=hx+d*5,ey=hy-1;
      if(open===2){c.strokeStyle='#3a2414';c.lineWidth=1.6;c.beginPath();c.arc(ex,ey+1,2.6,3.5,5.9);c.stroke()}
      else if(open===1&&!bl){var lx=near?Math.max(-1.2,Math.min(1.2,(near.x-hx)/60)):0,ly=near?Math.max(-1.2,Math.min(1.2,(near.y-hy)/60)):0;
        c.fillStyle='#fffbe8';c.beginPath();c.ellipse(ex,ey,2.8,3.2,0,0,7);c.fill();c.fillStyle='#2a3a2a';c.beginPath();c.ellipse(ex+lx,ey+ly,1.6,2.6,0,0,7);c.fill()}
      else{c.strokeStyle='#3a2414';c.lineWidth=1.4;c.beginPath();c.arc(ex,ey-1,2.6,.4,2.7);c.stroke()}});
    c.fillStyle='#e07a8a';c.beginPath();c.moveTo(hx-1.5,hy+3);c.lineTo(hx+1.5,hy+3);c.lineTo(hx,hy+5);c.fill();
    c.fillStyle='rgba(240,120,140,.35)';c.beginPath();c.arc(hx-8,hy+4,2.6,0,7);c.arc(hx+8,hy+4,2.6,0,7);c.fill();
    if(open===0&&!catJoy){c.fillStyle='rgba(255,255,255,'+(.25+.15*Math.sin(T*2))+')';c.font='10'+FONT;c.fillText('z',hx-14,hy-14-((T*8)%10))}
    if(catJoy>0){c.fillStyle='#ff8aa8';var hy2=hy-22-(2-catJoy)*8;c.globalAlpha=Math.min(1,catJoy);c.beginPath();c.arc(hx-3,hy2,3,0,7);c.arc(hx+3,hy2,3,0,7);c.moveTo(hx-6,hy2+1);c.lineTo(hx,hy2+7);c.lineTo(hx+6,hy2+1);c.fill();c.globalAlpha=1}}

  function drawRoom(c,a){var room=st.room,th=THEMES[room.th],i,mirrorHas={};
    if(bgKey!==room){bgKey=room;var b=bgCv.getContext('2d');b.clearRect(0,0,W,RY1);drawBg(b,room)}
    c.drawImage(bgCv,0,0);
    /* 움직이는 빛: 창문 달빛 + 벽난로 */
    var wi=slotOf(room.wall,'window');if(wi>=0){var wx=SLOTX[wi],sw=Math.sin(T*.4)*10;c.fillStyle='rgba(170,190,255,.07)';c.beginPath();c.moveTo(wx-30,208);c.lineTo(wx+30,208);c.lineTo(wx+70+sw,FB+40);c.lineTo(wx-10+sw,FB+40);c.fill()}
    st.ghosts.forEach(function(gh){if(gh.type==='mirror')mirrorHas[gh.mir.x]=1});
    room.wall.forEach(function(p,k){var x=SLOTX[k];if(p==='window')drawWindow(c,x,th,act(x,170));else if(p==='painting')drawPainting(c,x,act(x,150));
      else if(p==='clock')drawClock(c,x,act(x,112));else if(p==='mirror')drawMirror(c,x,mirrorHas[x-23])});
    room.floor.forEach(function(p,k){var x=SLOTX[k];if(p==='table')drawTable(c,x,act(x-10,318),act(x+16,300),th);else if(p==='lamp')drawLamp(c,x,st.lampOn,act(x,270,'lamp'));
      else if(p==='bookshelf')drawBookshelf(c,x,act(x,300));else if(p==='plant')drawPlant(c,x,act(x,340));else if(p==='chest')drawChest(c,x,act(x,350));
      else if(p==='armchair')drawArmchair(c,x,act(x,330));else if(p==='fire')drawFire(c,x,act(x,350))});
    /* 떠다니는 먼지 (배경 레이어) */
    for(i=0;i<bgMotes.length;i++){var m=bgMotes[i],mx=(m.x+Math.sin(T*m.w+i)*14+T*m.v)%W,my=RY0+((m.y+T*m.v*.4)%(RY1-RY0));
      c.fillStyle='rgba(255,240,200,'+(.12+.1*Math.sin(T+i))+')';c.beginPath();c.arc(mx,my,m.r,0,7);c.fill()}
    /* 단서: 유령 주변 먼지 소용돌이, 숨은 졸린 유령의 Zzz */
    st.ghosts.forEach(function(gh){if(gh.type==='mirror'||st.phase==='group')return;
      if(gh.hidden){c.font='13'+FONT;for(var z=0;z<3;z++){var zt=(T*.5+z/3)%1;c.fillStyle='rgba(230,230,255,'+(.55*(1-zt))+')';c.fillText('z',gh.x+zt*16+z*2,gh.y-zt*30)}return}
      for(var k=0;k<7;k++){var an=T*2.2+k*.9+gh.id,rad=15+7*Math.sin(T*3+k);c.fillStyle='rgba(255,246,220,'+(gh.posing?.6:.42)+')';
        c.beginPath();c.arc(gh.x+Math.cos(an)*rad,gh.y+Math.sin(an)*rad*.7+4,1.6,0,7);c.fill()}});
    drawCat(c,SLOTX[room.cat],a);
    if(!st.lampOn){c.fillStyle='rgba(12,12,44,.55)';c.fillRect(0,RY0,W,RY1-RY0);c.globalCompositeOperation='lighter';
      room.floor.forEach(function(p,k){if(p==='table'){var g2=c.createRadialGradient(SLOTX[k]+16,304,2,SLOTX[k]+16,304,50);g2.addColorStop(0,'rgba(255,180,90,.35)');g2.addColorStop(1,'rgba(255,180,90,0)');c.fillStyle=g2;c.fillRect(SLOTX[k]-40,250,110,110)}});
      if(wi>=0){c.fillStyle='rgba(60,80,160,.18)';c.fillRect(SLOTX[wi]-32,114,64,94)}c.globalCompositeOperation='source-over'}}

  function drawGhost(c,gh,alpha){var x=gh.x,y=gh.y+Math.sin(T*2.4+gh.id)*2,r=gh.r,pose=gh.posing?gh.pose:null,pt=gh.poseT,i;
    if(gh.pre)x+=Math.sin(T*50)*1.3;
    c.save();c.globalAlpha=alpha;
    var gl=c.createRadialGradient(x,y,r*.3,x,y,r*2.5);gl.addColorStop(0,hexA(gh.col,pose?.75:.5));gl.addColorStop(1,hexA(gh.col,0));c.fillStyle=gl;c.beginPath();c.arc(x,y,r*2.5,0,7);c.fill();
    c.translate(x,y);if(gh.type==='mirror')c.scale(-1,1);
    var sx=1;if(pose==='spin'){sx=Math.cos(pt*Math.PI*4);if(Math.abs(sx)<.18)sx=sx<0?-.18:.18}
    if(pose==='yawn')c.scale(1+.08*Math.sin(pt*Math.PI),1-.06*Math.sin(pt*Math.PI));
    c.scale(sx,1);
    /* 팔 */
    var armL=.4,armR=.4;if(pose==='wave')armR=-1.2+Math.sin(pt*28)*.5;if(pose==='peek'&&pt<.55){armL=-2.1;armR=-2.1}
    if(pose==='spin'){armL=-.6;armR=-.6}if(pose==='yawn'){armL=-2.6;armR=-2.6}
    [[-1,armL],[1,armR]].forEach(function(q){c.save();c.translate(q[0]*r*.8,r*.25);c.rotate(q[0]*(q[1]+1.2)*-1+ (q[0]<0?0:0));
      c.fillStyle=gh.col;c.beginPath();c.ellipse(q[0]*3,0,5,3.5,q[0]*q[1]*.8,0,7);c.fill();c.restore()});
    c.beginPath();c.arc(0,0,r,Math.PI,0);c.lineTo(r,r*.9);
    for(i=0;i<4;i++){var x1=r-(i+.5)*(r/2),x2=r-(i+1)*(r/2);c.quadraticCurveTo(x1,r*.9+r*.32+Math.sin(T*6+i+gh.id)*r*.12,x2,r*.9)}c.closePath();
    var bg=c.createRadialGradient(-r*.35,-r*.45,1,0,0,r*1.5);bg.addColorStop(0,'#ffffff');bg.addColorStop(.5,gh.col);bg.addColorStop(1,hexA(gh.col,.85));c.fillStyle=bg;c.fill();
    c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=1;c.stroke();
    /* 얼굴 */
    var bl=((T*.7+gh.id*.37)%3.1)<.1,ey=-r*.08,ex=r*.36,ink='#3a2a4a';
    if(pose==='peek'&&pt<.55){c.fillStyle=gh.col;c.beginPath();c.ellipse(-ex,ey,5,4,0,0,7);c.ellipse(ex,ey,5,4,0,0,7);c.fill()}
    else if(pose==='wave'||pose==='spin'||(pose==='peek')){c.strokeStyle=ink;c.lineWidth=1.8;c.lineCap='round';c.beginPath();c.arc(-ex,ey+1.5,2.6,3.6,5.8);c.stroke();c.beginPath();c.arc(ex,ey+1.5,2.6,3.6,5.8);c.stroke()}
    else if(pose==='yawn'||gh.type==='sleepy'){c.strokeStyle=ink;c.lineWidth=1.5;c.lineCap='round';c.beginPath();c.arc(-ex,ey-1,2.4,.4,2.7);c.stroke();c.beginPath();c.arc(ex,ey-1,2.4,.4,2.7);c.stroke()}
    else if(bl){c.strokeStyle=ink;c.lineWidth=1.6;c.beginPath();c.moveTo(-ex-2.5,ey);c.lineTo(-ex+2.5,ey);c.moveTo(ex-2.5,ey);c.lineTo(ex+2.5,ey);c.stroke()}
    else{c.fillStyle=ink;c.beginPath();c.ellipse(-ex,ey,2.4,3.2,0,0,7);c.ellipse(ex,ey,2.4,3.2,0,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(-ex+.8,ey-1.2,.9,0,7);c.arc(ex+.8,ey-1.2,.9,0,7);c.fill()}
    c.fillStyle='rgba(255,120,150,.55)';c.beginPath();c.ellipse(-r*.58,r*.24,3.2,2,0,0,7);c.ellipse(r*.58,r*.24,3.2,2,0,0,7);c.fill();
    c.strokeStyle=ink;c.fillStyle=ink;c.lineWidth=1.3;
    if(pose==='yawn'){c.beginPath();c.ellipse(0,r*.32,2.6,3.6*Math.sin(pt*Math.PI)+.5,0,0,7);c.fill()}
    else if(pose){c.fillStyle='#c04a6a';c.beginPath();c.arc(0,r*.22,3.2,0,Math.PI);c.fill()}
    else if(gh.type==='mirror'){c.beginPath();c.arc(0,r*.2,2.4,.2,2.9);c.stroke();c.fillStyle='#ff7a9a';c.beginPath();c.ellipse(.8,r*.34,1.6,2.2,0,0,7);c.fill()}
    else if(gh.type==='shy'&&gh.nerv>.4){c.beginPath();c.moveTo(-2.5,r*.28);c.lineTo(-1,r*.22);c.lineTo(.5,r*.28);c.lineTo(2,r*.22);c.stroke()}
    else{c.beginPath();c.arc(-1.4,r*.2,1.4,.1,3);c.arc(1.4,r*.2,1.4,.1,3);c.stroke()}
    c.restore();
    if(gh.pre||pose){c.save();c.globalAlpha=alpha;var k=gh.pre?.6+.4*Math.sin(T*20):1;c.fillStyle='rgba(255,246,170,'+k+')';
      if(gh.pre){c.font='13'+FONT;c.textAlign='center';c.fillText('!',x,y-r-6)}
      else{for(i=0;i<3;i++){var an=T*3+i*2.1,sx2=x+Math.cos(an)*(r+9),sy2=y+Math.sin(an)*(r+7);c.beginPath();for(var j=0;j<8;j++){var aa=j*Math.PI/4,rad=j%2?1:4;c.lineTo(sx2+Math.cos(aa)*rad,sy2+Math.sin(aa)*rad)}c.fill()}}
      c.restore()}
    if(gh.type==='sleepy'&&!pose){c.save();c.globalAlpha=alpha*.8;c.fillStyle='#fff';c.font='10'+FONT;c.fillText('z',x+r,y-r-((T*10)%8));c.restore()}}

  function drawSpirit(g){var f=frame(st),s=spCv.getContext('2d');
    s.globalCompositeOperation='source-over';s.globalAlpha=1;s.drawImage(roomCv,f.x,f.y,FW,FH,0,0,FW,FH);
    s.globalCompositeOperation='multiply';s.fillStyle='#f0d6aa';s.fillRect(0,0,FW,FH);
    s.globalCompositeOperation='screen';s.fillStyle='rgba(30,96,110,.42)';s.fillRect(0,0,FW,FH);
    s.globalCompositeOperation='lighter';var lx=FW*(.85+.15*Math.sin(T*.7)),lk=s.createRadialGradient(lx,0,2,lx,0,70);lk.addColorStop(0,'rgba(255,140,60,.32)');lk.addColorStop(1,'rgba(255,140,60,0)');s.fillStyle=lk;s.fillRect(0,0,FW,FH);
    var lk2=s.createRadialGradient(0,FH,2,0,FH,60);lk2.addColorStop(0,'rgba(120,255,230,.16)');lk2.addColorStop(1,'rgba(120,255,230,0)');s.fillStyle=lk2;s.fillRect(0,0,FW,FH);
    s.globalCompositeOperation='source-over';
    /* 유령 + 반짝이 꼬리 */
    s.save();s.translate(-f.x,-f.y);
    for(var i=0;i<sparks.length;i++){var p=sparks[i],k=1-p.t/p.l;s.fillStyle=hexA(p.c,.8*k);s.beginPath();s.arc(p.x,p.y,1.8*k+.4,0,7);s.fill()}
    st.ghosts.forEach(function(gh){if(gh.hidden)return;
      if(gh.type==='mirror'&&st.phase!=='group'){s.save();rr(s,gh.mir.x,gh.mir.y,gh.mir.w,gh.mir.h,10);s.clip();s.fillStyle='rgba(180,220,255,.25)';s.fillRect(gh.mir.x,gh.mir.y,gh.mir.w,gh.mir.h);drawGhost(s,gh,.92);s.restore()}
      else drawGhost(s,gh,1)});
    s.restore();
    s.globalAlpha=.09;s.drawImage(noiseCv,-((T*997)%60),-((T*631)%60));s.globalAlpha=1;
    var vg=s.createRadialGradient(FW/2,FH/2,FH*.35,FW/2,FH/2,FW*.72);vg.addColorStop(0,'rgba(40,20,10,0)');vg.addColorStop(1,'rgba(40,20,10,.55)');s.fillStyle=vg;s.fillRect(0,0,FW,FH);
    g.drawImage(spCv,f.x,f.y)}
  function capture(g,res){var f=frame(st),pw=108,ph=82,c=mkCv(pw,ph),x=c.getContext('2d');
    if(res.blurry){x.globalAlpha=.34;[-5,0,5].forEach(function(o){x.drawImage(g.canvas,f.x+o,f.y,FW,FH,0,0,pw,ph)});x.globalAlpha=.3;x.drawImage(g.canvas,f.x,f.y+3,FW,FH,0,0,pw,ph)}
    else x.drawImage(g.canvas,f.x,f.y,FW,FH,0,0,pw,ph);
    x.globalAlpha=1;var p={cv:c,res:res,tilt:(Math.random()-.5)*.24,good:res.total>=200};photos.push(p);
    if(dev)dev.t=9;dev={p:p,t:0}}

  function frameLines(a,res){var out=[];
    if(res.group){out.push([L(a,'단체 사진 ','Group ')+res.n+'/'+st.ghosts.length,res.total]);if(res.all)out.push([L(a,'모두 함께 ×2','Everyone ×2'),'']);}
    else{if(!res.ghosts.length)out.push([res.cut?L(a,'잘린 유령','Cut off'):L(a,'아무것도 없음','Nothing'),0]);
      var b=0,th=0,po=0;res.ghosts.forEach(function(q){b+=q.base;th+=q.th;po+=q.po});
      if(res.ghosts.length)out.push([L(a,'유령 ×','Ghosts ×')+res.ghosts.length,b]);
      if(th)out.push([L(a,'삼분할 구도','Thirds'),th]);if(po)out.push([L(a,'포즈!','Pose!'),po]);
      if(res.twins.length)out.push([L(a,'쌍둥이 함께','Twins together'),res.twins.length*TWIN_PTS]);}
    if(res.blurry)out.push([L(a,'흔들림 ½','Blurry ½'),'']);return out}
  function drawPolaroid(g,p,x,y,s,rot,devK){g.save();g.translate(x,y);g.rotate(rot);g.scale(s,s);
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(-58,-48,120,130);g.fillStyle='#fbf6ea';g.fillRect(-60,-50,120,130);
    g.drawImage(p.cv,-54,-44);if(devK<1){g.fillStyle='rgba(250,246,236,'+(1-devK)+')';g.fillRect(-54,-44,108,82)}
    g.strokeStyle='rgba(0,0,0,.15)';g.strokeRect(-54,-44,108,82);
    g.fillStyle=p.res.blurry?'#b0604a':'#4a3a5a';g.font='20'+FONT;g.textAlign='center';g.fillText(p.res.total+(p.res.group?' ★':''),0,66);g.restore()}

  function drawPanel(g,a){var i;
    var pg=g.createLinearGradient(0,RY1,0,640);pg.addColorStop(0,'#3e281a');pg.addColorStop(1,'#1c110b');g.fillStyle=pg;g.fillRect(0,RY1,W,172);
    g.fillStyle='rgba(255,220,170,.15)';g.fillRect(0,RY1,W,2);g.fillStyle='rgba(0,0,0,.4)';g.fillRect(0,RY1+2,W,3);
    for(i=0;i<5;i++){g.strokeStyle='rgba(255,220,170,.04)';g.beginPath();g.moveTo(0,RY1+30+i*30+Math.sin(i)*4);g.bezierCurveTo(120,RY1+20+i*30,240,RY1+40+i*30,W,RY1+28+i*30);g.stroke()}
    /* 앨범 줄 */
    function sag(x){var u=(x-180)/180;return 484+10*(1-u*u)}
    g.strokeStyle='rgba(240,222,190,.55)';g.lineWidth=1.2;g.beginPath();g.moveTo(0,484);g.quadraticCurveTo(180,494,W,484);g.stroke();
    var n=photos.length,first=Math.max(0,n-6),showN=Math.min(n,6);
    for(i=0;i<showN;i++){var p=photos[first+i];if(dev&&dev.p===p&&dev.t<1.8)continue;var x=36+i*58,y=sag(x)+30;
      drawPolaroid(g,p,x,y,.4,p.tilt,1);g.fillStyle='#c89a5a';g.fillRect(x-3,sag(x)-4,6,12)}
    if(!n){g.fillStyle='rgba(255,236,210,.35)';g.font='14'+FONT;g.textAlign='center';g.fillText(L(a,'찍은 사진이 여기에 걸려요','Your snapshots hang here'),180,516)}
    /* 타이머 */
    var tr=Math.max(0,time)/TMAX,low=time<10;g.fillStyle='rgba(0,0,0,.45)';rr(g,18,555,300,8,4);g.fill();
    g.fillStyle=low?(Math.sin(T*10)>0?'#ff6b5a':'#ffb09a'):'#ffd27a';if(tr>0){rr(g,19,556,Math.max(6,298*tr),6,3);g.fill()}
    g.font='14'+FONT;g.textAlign='left';g.fillStyle=low?'#ffb0a0':'#fff2d8';g.fillText(Math.ceil(Math.max(0,time))+'s',324,563);
    /* 필름 */
    var fx=62,fy=604;g.fillStyle='#2a2a30';rr(g,fx-30,fy-16,30,32,5);g.fill();g.fillStyle='#e8a83a';rr(g,fx-27,fy-12,24,24,3);g.fill();g.fillStyle='#2a2a30';g.fillRect(fx-20,fy-19,10,5);
    g.fillStyle='#fff2d8';g.font='18'+FONT;g.textAlign='left';g.fillText('×'+st.film,fx+4,fy+6);
    for(i=0;i<st.room.film;i++){g.fillStyle=i<st.film?'#ffd27a':'rgba(255,255,255,.15)';g.fillRect(fx-30+i*(64/st.room.film),fy+21,64/st.room.film-2,4)}
    /* 셔터 */
    var sp=st.cool>0?.92:1,sx=180,sy=603;g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.arc(sx,sy+3,30,0,7);g.fill();
    var bg=g.createRadialGradient(sx-8,sy-10,3,sx,sy,30);bg.addColorStop(0,'#fff4e4');bg.addColorStop(1,'#c8b8a4');g.fillStyle=bg;g.beginPath();g.arc(sx,sy,29,0,7);g.fill();
    var rg=g.createRadialGradient(sx-6,sy-8,2,sx,sy,22*sp);rg.addColorStop(0,'#ff9a8a');rg.addColorStop(1,'#d0403a');g.fillStyle=rg;g.beginPath();g.arc(sx,sy,21*sp,0,7);g.fill();
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=2;g.beginPath();g.arc(sx,sy,14*sp,3.6,4.8);g.stroke();
    g.fillStyle='#fff';g.beginPath();g.arc(sx,sy,5,0,7);g.fill();
    /* 할당량 */
    var q=st.room.quota,pr=Math.min(1,st.progress/q),qx=222,qy=596,qw=76;
    g.fillStyle='rgba(0,0,0,.45)';rr(g,qx,qy,qw,10,5);g.fill();g.fillStyle=pr>=1?'#9ff0b0':'#8ad8ff';if(pr>0){rr(g,qx+1,qy+1,Math.max(6,(qw-2)*pr),8,4);g.fill()}
    g.fillStyle='#fff2d8';g.font='13'+FONT;g.textAlign='center';g.fillText(st.progress+' / '+q,qx+qw/2,qy-6);
    g.fillStyle='rgba(255,236,210,.6)';g.font='11'+FONT;g.fillText(L(a,'목표 점수','Room goal'),qx+qw/2,qy+24);
    g.textAlign='left';g.fillStyle='rgba(255,236,210,.6)';g.font='11'+FONT;g.fillText(L(a,'필름','Film'),fx-30,fy-22)}

  function drawVF(g,a){var f=frame(st),x0=f.x,y0=f.y,x1=f.x+FW,y1=f.y+FH,L2=16,inside=0,posing=0;
    st.ghosts.forEach(function(gh){if(!gh.hidden&&gh.x-gh.r>=x0&&gh.x+gh.r<=x1&&gh.y-gh.r>=y0&&gh.y+gh.r<=y1){inside++;if(gh.posing)posing++}});
    var col=posing?'#ffe36a':inside?'#9ff0d0':'#ffffff',bl=isBlurry(st.hist,st.t);
    g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=5;g.strokeRect(x0-1,y0-1,FW+2,FH+2);
    g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.strokeRect(x0,y0,FW,FH);
    g.strokeStyle='rgba(255,255,255,.18)';g.beginPath();for(var i=1;i<3;i++){g.moveTo(x0+FW*i/3,y0);g.lineTo(x0+FW*i/3,y1);g.moveTo(x0,y0+FH*i/3);g.lineTo(x1,y0+FH*i/3)}g.stroke();
    g.strokeStyle=col;g.lineWidth=3;g.lineCap='round';g.beginPath();
    [[x0,y0,1,1],[x1,y0,-1,1],[x0,y1,1,-1],[x1,y1,-1,-1]].forEach(function(q){g.moveTo(q[0]+q[2]*L2,q[1]);g.lineTo(q[0],q[1]);g.lineTo(q[0],q[1]+q[3]*L2)});g.stroke();
    var cx=x0+FW/2,cy=y0+FH/2,rs=bl?9+Math.sin(T*30)*2:8;g.lineWidth=1.5;g.strokeStyle=bl?'rgba(255,170,150,.9)':hexA(col==='#ffffff'?'#ffffff':col,.85);
    g.beginPath();g.arc(cx,cy,rs,0,7);g.moveTo(cx-14,cy);g.lineTo(cx-rs-2,cy);g.moveTo(cx+rs+2,cy);g.lineTo(cx+14,cy);g.moveTo(cx,cy-14);g.lineTo(cx,cy-rs-2);g.moveTo(cx,cy+rs+2);g.lineTo(cx,cy+14);g.stroke();g.lineCap='butt';
    g.fillStyle=Math.sin(T*5)>0?'#ff5a4a':'rgba(255,90,74,.3)';g.beginPath();g.arc(x0+10,y0+10,3,0,7);g.fill();
    g.font='10'+FONT;g.textAlign='left';g.fillStyle='rgba(255,255,255,.75)';g.fillText(L(a,'영혼 필름','SPIRIT'),x0+16,y0+14);
    g.textAlign='right';g.fillText(bl?L(a,'흔들림','SHAKY'):posing?L(a,'포즈!','POSE!'):inside?'● '+inside:'',x1-6,y0+14)}

  function draw(g,a,dt){
    if(!roomCv){roomCv=mkCv(W,RY1);bgCv=mkCv(W,RY1);spCv=mkCv(FW,FH);noiseCv=mkCv(FW+64,FH+64);
      var nc=noiseCv.getContext('2d'),id=nc.createImageData(FW+64,FH+64);for(var i=0;i<id.data.length;i+=4){var v=Math.random()*255|0;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=Math.random()<.5?255:0}nc.putImageData(id,0,0)}
    var rc=roomCv.getContext('2d');drawRoom(rc,a);
    g.fillStyle='#1a120c';g.fillRect(-20,-20,W+40,RY0+20);g.drawImage(roomCv,0,0);
    var tg=g.createLinearGradient(0,0,0,RY0);tg.addColorStop(0,'#24160e');tg.addColorStop(1,'#3a2618');g.fillStyle=tg;g.fillRect(-20,-20,W+40,RY0+20);
    drawSpirit(g);
    if(pendingCap){capture(g,pendingCap);pendingCap=null}
    drawVF(g,a);
    if(flash>0){var f=frame(st);g.fillStyle='rgba(255,255,255,'+flash+')';g.fillRect(f.x,f.y,FW,FH);g.fillStyle='rgba(255,255,255,'+(flash*.25)+')';g.fillRect(0,RY0,W,RY1-RY0)}
    /* 힌트 */
    var hint=level<HINTS.length&&started&&st.phase==='play'?HINTS[level]:null;
    if(hint){var s=L(a,hint[0],hint[1]);g.font='15'+FONT;g.textAlign='center';var w=g.measureText(s).width+26;
      g.fillStyle='rgba(30,18,10,.8)';rr(g,180-w/2,48,w,26,13);g.fill();g.fillStyle='#fff0cf';g.fillText(s,180,66)}
    if(level===4&&st.lampOn&&st.phase==='play'){var lr=lampRect(st.room),pu=.5+.5*Math.sin(T*6);g.strokeStyle='rgba(255,236,160,'+pu+')';g.lineWidth=2;g.setLineDash([5,4]);rr(g,lr.x,lr.y,lr.w,lr.h,10);g.stroke();g.setLineDash([])}
    drawPanel(g,a);
    /* 현상 카드 */
    if(dev){var p=dev.p,t=dev.t,n=photos.length,idx=Math.min(n,6)-1,tx=36+idx*58,u=(tx-180)/180,ty=484+10*(1-u*u)+30;
      if(t<1.8){var k=t<.25?t/.25:1,yy=430+(1-k)*120,res=p.res;drawPolaroid(g,p,180,yy,1,p.tilt*.3,Math.min(1,t/.9));
        var ls=frameLines(a,res);g.font='13'+FONT;var bw=150,bx=248,by=yy-46;
        if(t>.3){g.globalAlpha=Math.min(1,(t-.3)/.2);g.fillStyle='rgba(30,18,10,.85)';rr(g,bx-6,by-4,108,ls.length*17+30,8);g.fill();
          ls.forEach(function(l,i){g.textAlign='left';g.fillStyle='#f6e6cc';g.fillText(l[0],bx,by+12+i*17);g.textAlign='right';g.fillStyle='#ffe08a';if(l[1]!=='')g.fillText((l[1]>0?'+':'')+l[1],bx+96,by+12+i*17)});
          g.textAlign='left';g.fillStyle='#9ff0d0';g.fillText(res.group?L(a,'보너스','Bonus'):L(a,'목표에 +','Goal +')+res.delta,bx,by+16+ls.length*17);g.globalAlpha=1}}
      else if(t<2.2){var e=(t-1.8)/.4,ee=e*e;drawPolaroid(g,p,180+(tx-180)*ee,430+(ty-430)*ee,1-.6*ee,p.tilt*(.3+.7*ee),1)}
      else dev=null}
    /* 배너 */
    if(banner&&banner.t>0){var bt=banner.t,s2,s3='';
      if(banner.k==='room'){var thm=THEMES[st.room.th];s2=L(a,'방 '+(level+1)+' · '+thm.ko,'Room '+(level+1)+' · '+thm.en);s3=L(a,'목표 ','Goal ')+st.room.quota+L(a,'점 · 필름 ',' pts · film ')+st.room.film}
      else if(banner.k==='clear'){s2=L(a,'방 완료! 단체 사진 찍어요!','Room clear! Group photo!');s3=L(a,'+14초 · 모두 모였어요','+14s · everyone gathers')}
      else {s2=L(a,'필름이 떨어졌어요','Out of film');s3=L(a,'새 필름으로 다시 · -4초','Fresh roll, try again · -4s')}
      var al=Math.min(1,bt*3,(banner.k==='room'?1.6:3.4)-bt+.3);if(banner.k==='clear')al=Math.min(al,1);
      var yb=banner.k==='clear'?118:200;g.globalAlpha=Math.max(0,Math.min(1,al));g.fillStyle='rgba(30,18,10,.82)';rr(g,40,yb-24,280,52,14);g.fill();
      g.textAlign='center';g.fillStyle=banner.k==='fail'?'#ffb4a0':'#fff0cf';g.font='20'+FONT;g.fillText(s2,180,yb);g.fillStyle='#e8d0a8';g.font='13'+FONT;g.fillText(s3,180,yb+18);g.globalAlpha=1}
    g.textAlign='left'}

  var game={
    id:'ghost-camera',
    title:{ko:'유령 사진관',en:'Ghost Camera'},
    how:{ko:'유령은 카메라 안에서만 보여요. 뷰파인더를 끌어 찾고, 포즈할 때 셔터!',en:'Ghosts only show in the camera. Drag the viewfinder to find them and snap when they pose!'},
    init:function(a){level=0;time=50;T=T||0;dragging=false;lastTapT=-9;lastTapP=[0,0];kv={x:0,y:0};photos=[];dev=null;pendingCap=null;flash=0;
      catJoy=0;earA=0;blinkT=2;started=false;sparks=[];spawnT=0;lampFl=0;
      bgMotes=[];for(var i=0;i<26;i++)bgMotes.push({x:Math.random()*W,y:Math.random()*400,v:4+Math.random()*8,w:.3+Math.random()*.6,r:.6+Math.random()*1.4});
      if(typeof window!=='undefined'&&window.__gcKeys){var k=window.__gcKeys;k.shoot=0;k.lamp=0}
      if(typeof window!=='undefined'&&window.__gcPtr)window.__gcPtr.length=0;
      setupRoom()},
    update:update,
    draw:function(g,a,dt){dt=dt||.016;T+=dt;flash=Math.max(0,flash-dt*4);catJoy=Math.max(0,catJoy-dt);blinkT-=dt;if(blinkT<0)blinkT=2+Math.random()*3;
      if(banner)banner.t-=dt;if(dev)dev.t+=dt;
      spawnT-=dt;if(spawnT<0){spawnT=.05;st.ghosts.forEach(function(gh){if(!gh.hidden)sparks.push({x:gh.x+(Math.random()-.5)*gh.r,y:gh.y+gh.r*.8,t:0,l:.7+Math.random()*.4,c:gh.col})})}
      for(var i=sparks.length-1;i>=0;i--){var p=sparks[i];p.t+=dt;p.y+=dt*8;if(p.t>p.l)sparks.splice(i,1)}
      draw(g,a,dt)},
    _logic:{ROOMS:ROOMS,roomFor:roomFor,genRoom:genRoom,newState:newState,stepSim:stepSim,takePhoto:takePhoto,scorePhoto:scorePhoto,scoreGroup:scoreGroup,
      isBlurry:isBlurry,thirdsBonus:thirdsBonus,poseInfo:poseInfo,frame:frame,subjects:subjects,clampVF:clampVF,lampRect:lampRect,
      C:{FW:FW,FH:FH,RY0:RY0,RY1:RY1,W:W,BLUR_PX:BLUR_PX,POSE_PTS:POSE_PTS,TWIN_PTS:TWIN_PTS,BASE:BASE,TMAX:TMAX}}
  };
  if(typeof location!=='undefined'&&/[?&]gcdbg=1/.test(location.search))window.__gc={
    st:function(){return st},goto:function(n){level=n;setupRoom()},level:function(){return level},
    photos:function(){return photos.length},time:function(){return time},setTime:function(v){time=v}};
  SG.run(game);
})();
