/* 별자리 맞추기 — 깊이가 다른 빛 조각들을, 딱 한 시점에서만 그림이 되도록 돌려 맞춘다 */
(function(){
  'use strict';
  var PI=Math.PI,KP=2.2,MT=3.4,LIM=35;

  /* ================= 논리 (노드에서도 실행 가능) ================= */
  function starPts(cx,cy,R,r,n){var o=['p'];for(var i=0;i<n*2;i++){var a=-PI/2+i*PI/n,q=i%2?r:R;o.push(cx+Math.cos(a)*q,cy+Math.sin(a)*q)}return o}
  /* 도형: e 타원, p 다각형, l 둥근 선, a 활꼴. '-' 접두사는 구멍. 순서대로 더하고 뺀다. */
  var RAW=[
    {id:'heart',ko:'하트',en:'Heart',hue:345,fx:'beat',s:[['e',-33,-25,37,37],['e',33,-25,37,37],['p',-66,-8,0,-20,66,-8,0,80]]},
    {id:'cat',ko:'고양이',en:'Cat',hue:35,eyes:[[-15,-34],[15,-34]],s:[['e',0,42,44,46],['e',0,-32,40,33],['p',-38,-42,-34,-90,-6,-60],['p',38,-42,34,-90,6,-60],['l',36,76,76,66,13],['l',76,66,84,30,13]]},
    {id:'star',ko:'별',en:'Star',hue:50,eyes:[[-14,0],[14,0]],fx:'spark',s:[starPts(0,6,90,40,5)]},
    {id:'fish',ko:'물고기',en:'Fish',hue:190,eyes:[[-48,-8]],fx:'bob',s:[['e',-12,0,62,36],['p',38,0,92,-44,76,0,92,44],['p',-30,-30,5,-64,22,-26],['p',-15,32,2,58,14,30]]},
    {id:'key',ko:'열쇠',en:'Key',hue:45,fx:'spark',s:[['e',0,-52,34,34],['-e',0,-52,15,15],['p',-8,-22,8,-22,8,88,-8,88],['p',8,46,38,46,38,61,8,61],['p',8,70,30,70,30,86,8,86]]},
    {id:'house',ko:'집',en:'House',hue:20,fx:'smoke',fp:[39,-66],s:[['p',30,-64,48,-64,48,-20,30,-20],['p',-78,4,0,-68,78,4],['p',-54,0,54,0,54,80,-54,80],['-p',-13,38,13,38,13,80,-13,80],['-e',0,-26,11,11]]},
    {id:'tree',ko:'나무',en:'Tree',hue:140,fx:'spark',s:[['p',0,-92,-40,-36,40,-36],['p',0,-62,-56,10,56,10],['p',0,-26,-72,56,72,56],['p',-12,54,12,54,12,88,-12,88]]},
    {id:'whale',ko:'고래',en:'Whale',hue:205,eyes:[[-50,8]],fx:'spout',fp:[-26,-30],s:[['e',-16,14,66,40],['p',28,-8,74,-26,90,-12,44,44],['e',84,-42,11,24,0.55],['e',98,-12,11,22,1.9]]},
    {id:'mushroom',ko:'버섯',en:'Mushroom',hue:5,eyes:[[-10,30],[10,30]],s:[['a',0,-6,82,64,PI,2*PI],['-e',-38,-32,12,10],['-e',16,-46,14,11],['-e',50,-22,9,8],['p',-22,-10,22,-10,28,72,-28,72],['e',0,72,28,12]]},
    {id:'ghost',ko:'유령',en:'Ghost',hue:265,fx:'bob',s:[['a',0,-18,58,64,PI,2*PI],['p',-58,-19,58,-19,58,74,-58,74],['-p',-45,76,-29,48,-13,76],['-p',13,76,29,48,45,76],['-e',-20,-20,10,14],['-e',20,-20,10,14]]},
    {id:'bird',ko:'새',en:'Bird',hue:15,eyes:[[42,-34]],fx:'bob',s:[['e',-5,12,48,33,-0.35],['e',36,-30,24,24],['p',56,-40,88,-28,56,-18],['p',-36,16,-96,34,-88,54,-28,40],['l',2,42,2,74,5],['l',-14,42,-14,74,5],['l',-4,74,12,74,5],['l',-20,74,-6,74,5]]},
    {id:'teapot',ko:'주전자',en:'Teapot',hue:170,eyes:[[-16,20],[16,20]],fx:'smoke',fp:[92,-34],s:[['e',-60,18,28,32],['-e',-66,18,13,19],['p',44,20,82,-28,98,-22,62,46],['e',0,22,56,44],['e',0,-20,32,11],['e',0,-36,9,9],['p',-34,58,34,58,38,70,-38,70]]},
    {id:'rabbit',ko:'토끼',en:'Rabbit',hue:320,eyes:[[-11,-12],[11,-12]],s:[['e',0,46,36,38],['e',0,-10,31,27],['e',-15,-60,10,35,-0.15],['e',15,-60,10,35,0.15],['e',-22,82,17,8],['e',22,82,17,8]]},
    {id:'umbrella',ko:'우산',en:'Umbrella',hue:285,fx:'sway',s:[['a',0,-5,86,72,PI,2*PI],['-e',-57,-5,29,13],['-e',0,-5,29,13],['-e',57,-5,29,13],['l',0,-72,0,66,6],['l',0,66,-6,80,6],['l',-6,80,-18,80,6],['l',-18,80,-23,68,6],['l',0,-76,0,-90,5]]},
    {id:'boat',ko:'돛단배',en:'Sailboat',hue:25,fx:'sway',s:[['p',-74,36,74,36,52,68,-52,68],['l',0,36,0,-84,5],['p',6,-80,6,26,66,26],['p',-6,-52,-6,26,-48,26]]},
    {id:'moon',ko:'초승달',en:'Moon',hue:55,fx:'spark',s:[['e',-12,0,76,76],['-e',26,-14,64,64],starPts(44,-18,20,8,5)]},
    {id:'rocket',ko:'로켓',en:'Rocket',hue:0,fx:'bob',s:[['p',-14,52,14,52,0,94],['e',0,-12,30,70],['p',-24,20,-60,74,-22,60],['p',24,20,60,74,22,60],['-e',0,-28,12,12]]},
    {id:'crown',ko:'왕관',en:'Crown',hue:48,fx:'spark',s:[['p',-72,56,-72,-26,-36,16,0,-46,36,16,72,-26,72,56],['e',-72,-34,10,10],['e',0,-55,10,10],['e',72,-34,10,10],['-e',0,36,9,9],['-e',-38,36,7,7],['-e',38,36,7,7]]},
    {id:'snail',ko:'달팽이',en:'Snail',hue:95,eyes:[[-63,16]],s:[['l',-56,54,64,54,24],['l',-52,48,-62,10,19],['l',-66,6,-82,-26,5],['l',-58,4,-52,-30,5],['e',-82,-28,5,5],['e',-52,-32,5,5],['e',16,-2,47,47]]},
    {id:'apple',ko:'사과',en:'Apple',hue:355,eyes:[[-16,12],[16,12]],s:[['e',-22,16,46,54],['e',22,16,46,54],['l',0,-34,10,-72,7],['e',34,-62,22,10,-0.5]]}
  ];
  function norm(s){var t=s[0],h=t[0]==='-';if(h)t=t[1];
    if(t==='e')return{t:'e',h:h,cx:s[1],cy:s[2],rx:s[3],ry:s[4],r:s[5]||0};
    if(t==='l')return{t:'l',h:h,x1:s[1],y1:s[2],x2:s[3],y2:s[4],w:s[5]};
    if(t==='a'){var pts=[],n=28;for(var i=0;i<=n;i++){var a=s[5]+(s[6]-s[5])*i/n;pts.push(s[1]+Math.cos(a)*s[3],s[2]+Math.sin(a)*s[4])}return{t:'p',h:h,pts:pts}}
    return{t:'p',h:h,pts:s.slice(1)}}
  var PICS=RAW.map(function(p){return{id:p.id,ko:p.ko,en:p.en,hue:p.hue,eyes:p.eyes||[],fx:p.fx||'',fp:p.fp||[0,-40],s:p.s.map(norm)}});
  function inShape(s,x,y){
    if(s.t==='e'){var dx=x-s.cx,dy=y-s.cy;if(s.r){var c=Math.cos(-s.r),n=Math.sin(-s.r),u=dx*c-dy*n;dy=dx*n+dy*c;dx=u}return dx*dx/(s.rx*s.rx)+dy*dy/(s.ry*s.ry)<=1}
    if(s.t==='l'){var vx=s.x2-s.x1,vy=s.y2-s.y1,l=vx*vx+vy*vy,t=l?((x-s.x1)*vx+(y-s.y1)*vy)/l:0;t=t<0?0:t>1?1:t;
      var ex=x-s.x1-vx*t,ey=y-s.y1-vy*t;return ex*ex+ey*ey<=s.w*s.w/4}
    var p=s.pts,ins=false;for(var i=0,j=p.length-2;i<p.length;j=i,i+=2){
      if((p[i+1]>y)!==(p[j+1]>y)&&x<(p[j]-p[i])*(y-p[i+1])/(p[j+1]-p[i+1])+p[i])ins=!ins}return ins}
  function inside(pic,x,y){var on=false;for(var i=0;i<pic.s.length;i++)if(inShape(pic.s[i],x,y))on=!pic.s[i].h;return on}
  function seedsFor(pic,n,rnd){var out=[],dmin=44,tries=0;
    while(out.length<n){var x=(rnd()*2-1)*100,y=(rnd()*2-1)*100,ok=inside(pic,x,y)&&inside(pic,x+3,y)&&inside(pic,x-3,y)&&inside(pic,x,y+3)&&inside(pic,x,y-3);
      for(var i=0;ok&&i<out.length;i++){var dx=out[i].x-x,dy=out[i].y-y;if(dx*dx+dy*dy<dmin*dmin)ok=false}
      if(ok){out.push({x:x,y:y});tries=0}else if(++tries>300){dmin*=.88;tries=0}}
    return out}
  function cellOf(seeds,i){var poly=[[-140,-140],[140,-140],[140,140],[-140,140]],a=seeds[i];
    for(var j=0;j<seeds.length&&poly.length;j++){if(j===i)continue;
      var b=seeds[j],mx=(a.x+b.x)/2,my=(a.y+b.y)/2,nx=b.x-a.x,ny=b.y-a.y,out=[];
      for(var k=0;k<poly.length;k++){var p=poly[k],q=poly[(k+1)%poly.length],dp=(p[0]-mx)*nx+(p[1]-my)*ny,dq=(q[0]-mx)*nx+(q[1]-my)*ny;
        if(dp<=0)out.push(p);if((dp<0&&dq>0)||(dp>0&&dq<0)){var t=dp/(dp-dq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])])}}
      poly=out}
    return poly}
  function mst(seeds){var n=seeds.length,inT=[0],edges=[],used={0:1};
    while(inT.length<n){var bd=1e9,ba=0,bb=0;inT.forEach(function(a){for(var b=0;b<n;b++)if(!used[b]){var d=Math.hypot(seeds[a].x-seeds[b].x,seeds[a].y-seeds[b].y);if(d<bd){bd=d;ba=a;bb=b}}});
      used[bb]=1;inT.push(bb);edges.push([ba,bb])}return edges}
  function shuffle(a,rnd){for(var i=a.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
  var TABLE=['','','','','d','h','l','t','r','dh','td','ld','rh','th','rd','tl'];
  function modsFor(n,rnd){var c=TABLE[n];
    if(c==null){var opts=['d','h','l','t','r'];shuffle(opts,rnd);c=opts.slice(0,n<24?2:3).join('');if(c.indexOf('t')>=0&&c.indexOf('r')>=0)c=c.replace('r','d')}
    return{decoy:c.indexOf('d')>=0,hidden:c.indexOf('h')>=0,dbl:c.indexOf('l')>=0,two:c.indexOf('t')>=0,drift:c.indexOf('r')>=0}}
  function fragsFor(pic,n,mods,rnd){var seeds=seedsFor(pic,n,rnd),zs=[],i,half=Math.ceil(n/2);
    for(i=0;i<n;i++)zs.push((i%2?-1:1)*(.3+.7*((i>>1)+rnd()*.9)/half));shuffle(zs,rnd);
    var fr=seeds.map(function(s,k){return{x:s.x,y:s.y,z:zs[k],cell:cellOf(seeds,k),spin:(rnd()<.5?-1:1)*(.35+.65*rnd()),sg:rnd()<.5?-1:1,
      grp:mods.dbl?(k%2)+1:0,hid:mods.hidden&&k%5<2}});
    return{frags:fr,edges:mst(seeds)}}
  function pickSecret(rnd,avoid,dmin,dmax,R){for(var k=0;k<4000;k++){var y=(rnd()*2-1)*R,p=(rnd()*2-1)*R,ok=true;
      for(var i=0;i<avoid.length;i++){var d=Math.hypot(y-avoid[i].y,p-avoid[i].p);if(d<dmin[i]||d>dmax)ok=false}if(ok)return{y:y,p:p}}
    return{y:-avoid[0].y*.8||20,p:-avoid[0].p*.8||-15}}
  function newRun(start){return{n:start||0,queue:PICS.map(function(_,i){return i})}}
  function nextPuzzle(run,view,rnd){var n=run.n++,mods=modsFor(n,rnd),cnt=mods.two?2:1,pics=[],avoid=[{y:view.y,p:view.p}],dm=[n===0?14:17];
    var nf=mods.two?8+Math.min(2,n>>3):8+Math.min(6,n>>1);
    for(var k=0;k<cnt;k++){
      if(!run.queue.length){run.queue=shuffle(PICS.map(function(_,i){return i}),rnd)}
      var idx=run.queue.shift(),pic=PICS[idx],R=mods.drift?21:30,sec=pickSecret(rnd,avoid,dm,n===0?24:90,R),f=fragsFor(pic,nf,mods,rnd);
      avoid.push(sec);dm.push(24);
      pics.push({idx:idx,pic:pic,sec:sec,frags:f.frags,edges:f.edges,found:false,
        drift:mods.drift?{r:6+Math.min(3,(n-8)*.1),w:(rnd()<.5?-1:1)*(.26+Math.min(.2,(n-8)*.008)),ph:rnd()*6.28}:null})}
    var decoys=[];
    if(mods.decoy){var di;do{di=Math.floor(rnd()*PICS.length)}while(pics.some(function(q){return q.idx===di}));
      var df=fragsFor(PICS[di],8,{},rnd).frags;shuffle(df,rnd);df=df.slice(0,4+Math.min(2,n>>3));
      df.forEach(function(f){var a=rnd()*6.28,r=58+rnd()*62;f.hx=Math.cos(a)*r;f.hy=Math.sin(a)*r*.9;f.r0=rnd()*6.28;f.dp=rnd()*6.28;decoys.push(f)});
      decoys.pic=PICS[di]}
    return{n:n,mods:mods,pics:pics,decoys:decoys,t:0,hold:0,need:mods.drift?1:.4,mt:mods.drift?MT*1.7:MT,m:99,best:null}}
  function secretAt(pp,t){var d=pp.drift;return d?{y:pp.sec.y+d.r*Math.cos(d.w*t+d.ph),p:pp.sec.p+d.r*Math.sin(d.w*t+d.ph)}:pp.sec}
  /* 시점 차이 → 조각의 화면 위치 변화. 비밀 각도에서는 전부 0 */
  function pose(f,sec,view,o){var dy=view.y-sec.y,dp=view.p-sec.p,d;
    if(f.grp===1){o.ox=KP*f.z*dy;o.oy=KP*f.z*dy*.6*f.sg;d=Math.abs(dy)}
    else if(f.grp===2){o.ox=KP*f.z*dp*.6*f.sg;o.oy=KP*f.z*dp;d=Math.abs(dp)}
    else{o.ox=KP*f.z*dy;o.oy=KP*f.z*dp;d=Math.hypot(dy,dp)}
    o.rot=f.spin*d*.02;o.sc=1+.2*f.z*(1-Math.exp(-d/14));o.d=d;return o}
  var _o={};
  function metric(pp,view,t){var sec=secretAt(pp,t),s=[0,0,0],c=[0,0,0];
    for(var i=0;i<pp.frags.length;i++){var f=pp.frags[i];pose(f,sec,view,_o);s[f.grp]+=Math.hypot(_o.ox,_o.oy);c[f.grp]++}
    return c[0]?s[0]/c[0]:Math.max(s[1]/c[1],s[2]/c[2])}
  function warmth(m){return Math.exp(-m/26)}
  /* 자석 끌림 + 정렬 유지 시간. 풀린 그림(pp)을 돌려준다 */
  function advance(pz,view,dt,held){pz.t+=dt;var best=null,bm=1e9;
    pz.pics.forEach(function(pp){if(pp.found)return;var m=metric(pp,view,pz.t);pp.m=m;if(m<bm){bm=m;best=pp}});
    pz.m=bm;pz.best=best;if(!best)return null;
    if(!pz.mods.drift&&bm<pz.mt*2.4){var s=secretAt(best,pz.t),k=1-Math.exp(-(held?2.5:7)*dt);view.y+=(s.y-view.y)*k;view.p+=(s.p-view.p)*k}
    if(bm<pz.mt)pz.hold+=dt;else pz.hold=Math.max(0,pz.hold-dt*3);
    if(pz.hold>=pz.need){pz.hold=0;return best}return null}
  function choices(idx,rnd){var c=[idx];while(c.length<3){var k=Math.floor(rnd()*PICS.length);if(c.indexOf(k)<0)c.push(k)}return shuffle(c,rnd)}
  var LOGIC={PICS:PICS,KP:KP,MT:MT,LIM:LIM,inside:inside,newRun:newRun,nextPuzzle:nextPuzzle,secretAt:secretAt,pose:pose,metric:metric,warmth:warmth,advance:advance,choices:choices,modsFor:modsFor};
  if(typeof module!=='undefined'&&module.exports){module.exports=LOGIC;return}

  /* ================= 게임 ================= */
  var QS=new URLSearchParams(location.search),GAL=QS.get('gal'),DBG=QS.get('dbg'),LV=+QS.get('lv')||0;
  var CX=180,CY=248,SENS=.2,F=function(n){return n+'px Jua, system-ui, sans-serif'};
  var KEY=window.__starAlignKeys;
  if(!KEY){KEY=window.__starAlignKeys={l:0,r:0,u:0,d:0,sh:0,dig:0};
    var kmap={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'u',KeyW:'u',ArrowDown:'d',KeyS:'d',ShiftLeft:'sh',ShiftRight:'sh'};
    window.addEventListener('keydown',function(e){var k=kmap[e.code];if(k)KEY[k]=1;
      var m=/^(Digit|Numpad)([123])$/.exec(e.code);if(m&&!e.repeat)KEY.dig=+m[2]});
    window.addEventListener('keyup',function(e){var k=kmap[e.code];if(k)KEY[k]=0});
    window.addEventListener('blur',function(){KEY.l=KEY.r=KEY.u=KEY.d=KEY.sh=0})}

  var run,pz,view,vel,time,phase,phT,cur,opts,picked,streak,pzT,T,dragging,lx,ly,ent,humT,chimes,joy,blink,banner,fxp,solvedN,lang='ko',lastW=0,moving=0;
  function L(ko,en){return lang==='ko'?ko:en}

  /* ---------- 스프라이트 ---------- */
  function mk(w,h){var c=document.createElement('canvas');c.width=Math.max(2,Math.ceil(w));c.height=Math.max(2,Math.ceil(h));return c}
  function drawSil(g,pic){g.fillStyle='#fff';g.strokeStyle='#fff';g.lineCap='round';
    pic.s.forEach(function(s){g.globalCompositeOperation=s.h?'destination-out':'source-over';g.beginPath();
      if(s.t==='e'){g.ellipse(s.cx,s.cy,s.rx,s.ry,s.r,0,7);g.fill()}
      else if(s.t==='l'){g.lineWidth=s.w;g.moveTo(s.x1,s.y1);g.lineTo(s.x2,s.y2);g.stroke()}
      else{g.moveTo(s.pts[0],s.pts[1]);for(var i=2;i<s.pts.length;i+=2)g.lineTo(s.pts[i],s.pts[i+1]);g.closePath();g.fill()}});
    g.globalCompositeOperation='source-over'}
  function lantern(mask,c1,c2,glow,ribs){var w=mask.width,h=mask.height,c=mk(w,h),g=c.getContext('2d');
    g.drawImage(mask,0,0);g.globalCompositeOperation='source-in';
    var gr=g.createLinearGradient(0,0,w*.3,h);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.globalCompositeOperation='source-atop';
    if(ribs){g.strokeStyle='rgba(255,255,255,.13)';g.lineWidth=1;for(var i=-h;i<w;i+=9){g.beginPath();g.moveTo(i,0);g.lineTo(i+h*.5,h);g.stroke()}}
    var rg=g.createRadialGradient(w*.4,h*.35,2,w*.5,h*.5,Math.max(w,h)*.6);rg.addColorStop(0,'rgba(255,255,255,.34)');rg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=rg;g.fillRect(0,0,w,h);
    var rim=mk(w,h),r=rim.getContext('2d');r.drawImage(mask,0,0);r.globalCompositeOperation='destination-out';r.drawImage(mask,1.8,1.8);
    g.globalAlpha=.85;g.drawImage(rim,0,0);
    var dk=mk(w,h),d=dk.getContext('2d');d.drawImage(mask,0,0);d.globalCompositeOperation='destination-out';d.drawImage(mask,-1.8,-1.8);
    d.globalCompositeOperation='source-in';d.fillStyle='#1a1040';d.fillRect(0,0,w,h);g.globalAlpha=.4;g.drawImage(dk,0,0);g.globalAlpha=1;
    var f=mk(w,h),fg=f.getContext('2d');fg.shadowColor=glow;fg.shadowBlur=11;fg.drawImage(c,0,0);return f}
  function fragSprite(pic,f){if(f.spr)return;var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    f.cell.forEach(function(p){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1])});
    x0=Math.max(-112,x0)-13;y0=Math.max(-112,y0)-13;x1=Math.min(112,x1)+13;y1=Math.min(112,y1)+13;
    var m=mk(x1-x0,y1-y0),g=m.getContext('2d');g.translate(-x0,-y0);drawSil(g,pic);
    g.globalCompositeOperation='destination-in';g.beginPath();f.cell.forEach(function(p,i){if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])});g.closePath();g.fill();
    f.spr={x0:x0,y0:y0,cool:lantern(m,'#cfd9ff','#7a78d8','rgba(140,160,255,.75)',true),warm:lantern(m,'#fff3c2','#ff9a5c','rgba(255,190,110,.9)',true)}}
  var wholeCache={};
  function whole(idx){if(wholeCache[idx])return wholeCache[idx];var pic=PICS[idx],m=mk(260,260),g=m.getContext('2d');g.translate(130,130);drawSil(g,pic);
    var h=pic.hue;return wholeCache[idx]=lantern(m,'hsl('+h+',95%,86%)','hsl('+(h+22)+',85%,62%)','hsla('+h+',100%,75%,.9)',false)}
  function prep(){pz.pics.forEach(function(pp){pp.frags.forEach(function(f){fragSprite(pp.pic,f)});whole(pp.idx)});
    pz.decoys.forEach(function(f){fragSprite(pz.decoys.pic,f)})}

  /* ---------- 배경 ---------- */
  var bg=null,neb=[],stars=[],dust=[];
  function mkBg(){bg=mk(360,640);var g=bg.getContext('2d'),gr=g.createLinearGradient(0,0,0,640);
    gr.addColorStop(0,'#070a24');gr.addColorStop(.45,'#161447');gr.addColorStop(.8,'#3a2166');gr.addColorStop(1,'#5b2f6e');g.fillStyle=gr;g.fillRect(0,0,360,640);
    [['rgba(90,120,255,.30)',170],['rgba(230,90,190,.22)',150],['rgba(70,210,220,.16)',130]].forEach(function(n,i){var s=n[1],c=mk(s*2,s*2),q=c.getContext('2d'),
      r=q.createRadialGradient(s,s,0,s,s,s);r.addColorStop(0,n[0]);r.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=r;q.fillRect(0,0,s*2,s*2);
      neb.push({c:c,s:s,x:[70,290,160][i],y:[150,330,470][i],ph:i*2.1})});
    for(var l=0;l<3;l++)for(var i=0;i<[46,26,13][l];i++)stars.push({x:Math.random()*420-30,y:Math.random()*600-20,l:l,r:[.7,1.1,1.7][l]*(.7+Math.random()*.6),ph:Math.random()*6.28});
    for(var j=0;j<22;j++)dust.push({x:Math.random()*360,y:Math.random()*560,v:4+Math.random()*9,ph:Math.random()*6.28,r:.8+Math.random()*1.4})}
  function drawBg(g,tt){if(!bg)mkBg();g.drawImage(bg,0,0);
    neb.forEach(function(n,i){g.globalAlpha=.8+.2*Math.sin(tt*.3+n.ph);
      g.drawImage(n.c,n.x-n.s+Math.sin(tt*.07+n.ph)*26-view.y*(.25+i*.12),n.y-n.s+Math.cos(tt*.05+n.ph)*18-view.p*(.25+i*.12))});
    stars.forEach(function(s){var k=[.35,.8,1.5][s.l];g.globalAlpha=.45+.5*Math.abs(Math.sin(tt*(.6+s.l*.3)+s.ph));g.fillStyle=s.l===2?'#fff6d8':'#dfe6ff';
      var x=s.x-view.y*k,y=s.y-view.p*k;g.beginPath();g.arc(x,y,s.r,0,7);g.fill();
      if(s.l===2){g.globalAlpha*=.5;g.fillRect(x-s.r*2.6,y-.4,s.r*5.2,.8);g.fillRect(x-.4,y-s.r*2.6,.8,s.r*5.2)}});
    g.fillStyle='#ffe9c4';dust.forEach(function(d){var y=(d.y-tt*d.v)%560;if(y<0)y+=560;g.globalAlpha=.16+.12*Math.sin(tt+d.ph);
      g.beginPath();g.arc(d.x+Math.sin(tt*.5+d.ph)*14-view.y*.5,y+40,d.r,0,7);g.fill()});g.globalAlpha=1}

  /* ---------- 마스코트: 천문학자 고양이 ---------- */
  function drawGround(g,tt,w){
    g.fillStyle='#0b0d2b';g.beginPath();g.ellipse(180,668,290,84,0,0,7);g.fill();
    g.strokeStyle='rgba(150,140,255,.35)';g.lineWidth=1.5;g.beginPath();g.ellipse(180,668,290,84,0,PI*1.1,PI*1.9);g.stroke();
    /* 천문대 돔 */
    g.fillStyle='#1b1c4a';g.fillRect(232,596,44,26);g.beginPath();g.arc(254,596,22,PI,0);g.fill();
    g.fillStyle='#0b0d2b';g.fillRect(250,575,8,22);g.fillStyle='rgba(255,220,140,'+(.5+.3*Math.sin(tt*2))+')';g.fillRect(240,604,7,8);g.fillRect(261,604,7,8);
    /* 온도 별 */
    for(var i=0;i<5;i++){var on=w*5.2>i+.5,x=128+i*17,y=614-Math.sin(i/4*PI)*5;g.globalAlpha=on?1:.25;g.fillStyle=on?'#ffd76a':'#8d8fd0';
      g.beginPath();for(var k=0;k<10;k++){var a=-PI/2+k*PI/5,r=k%2?2.4:on?6+Math.sin(tt*6+i)*.8:5;g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}g.fill()}
    g.globalAlpha=1;
    var jy=joy>0?-Math.abs(Math.sin(joy*7))*20*Math.min(1,joy):0,x0=62,y0=592+jy;
    g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x0+6,612,30,5,0,0,7);g.fill();
    /* 꼬리 */
    g.strokeStyle='#e9d6b4';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(x0-14,y0+12);g.quadraticCurveTo(x0-34,y0+10,x0-30+Math.sin(tt*(2+w*5))*5,y0-8);g.stroke();
    /* 몸 */
    var bgr=g.createLinearGradient(x0-16,y0-16,x0+16,y0+20);bgr.addColorStop(0,'#fff7e6');bgr.addColorStop(1,'#d9c3a0');
    g.fillStyle=bgr;g.beginPath();g.ellipse(x0,y0,16,20,0,0,7);g.fill();
    g.fillStyle='#6f7be0';g.beginPath();g.ellipse(x0,y0-15,13,4.5,0,0,7);g.fill();g.fillRect(x0-12,y0-14,6,13);
    /* 머리 */
    var hx=x0+3,hy=y0-29;g.fillStyle=bgr;g.beginPath();g.moveTo(hx-13,hy-6);g.lineTo(hx-11,hy-21);g.lineTo(hx-2,hy-12);g.fill();
    g.beginPath();g.moveTo(hx+13,hy-6);g.lineTo(hx+11,hy-21);g.lineTo(hx+2,hy-12);g.fill();
    g.beginPath();g.ellipse(hx,hy,15,13,0,0,7);g.fill();
    g.fillStyle='#2a2350';var open=blink<.12?.15:1;
    if(joy>0){g.strokeStyle='#2a2350';g.lineWidth=2;[-6,6].forEach(function(d){g.beginPath();g.arc(hx+d,hy,3.4,PI*1.1,PI*1.9);g.stroke()})}
    else [-6,6].forEach(function(d){g.beginPath();g.ellipse(hx+d+view.y*.03,hy-1+view.p*.02,2.6+w*.8,(3.2+w)*open,0,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(hx+d+view.y*.03+.8,hy-2.2,.9,0,7);g.fill();g.fillStyle='#2a2350'});
    g.fillStyle='#f29aa8';g.beginPath();g.ellipse(hx,hy+4,1.8,1.2,0,0,7);g.fill();
    /* 망원경 */
    var tx=x0+34,ty=594,ang=-.95+view.y*.014+view.p*.006;
    g.strokeStyle='#8a7bd0';g.lineWidth=2.5;g.beginPath();g.moveTo(tx,ty-16);g.lineTo(tx-9,ty+16);g.moveTo(tx,ty-16);g.lineTo(tx+9,ty+16);g.moveTo(tx,ty-16);g.lineTo(tx,ty+14);g.stroke();
    g.save();g.translate(tx,ty-18);g.rotate(ang);var tg=g.createLinearGradient(0,-6,0,6);tg.addColorStop(0,'#ffe9a8');tg.addColorStop(1,'#b87a3a');
    g.fillStyle=tg;g.fillRect(-16,-4,26,8);g.fillRect(8,-6,24,12);g.fillStyle='#5a3d7a';g.fillRect(-19,-3,4,6);
    g.fillStyle='rgba(255,220,130,'+(.25+.75*w)+')';g.shadowColor='#ffd76a';g.shadowBlur=14*w;g.beginPath();g.ellipse(33,0,3,6.5,0,0,7);g.fill();g.restore()}

  /* ---------- 흐름 ---------- */
  function setup(a){pz=LOGIC.nextPuzzle(run,view,Math.random);prep();phase='play';pzT=0;ent=0;cur=null;vel.y=vel.p=0;fxp=[];
    var m=pz.mods,b=[];if(m.two)b.push(L('그림이 두 개 숨어 있어요','Two pictures hide here'));if(m.decoy)b.push(L('가짜 조각 주의!','Beware decoy shards!'));
    if(m.hidden)b.push(L('가까워져야 보이는 조각','Some shards show only when close'));if(m.dbl)b.push(L('이중 잠금: 가로·세로 따로','Double lock: yaw and pitch apart'));
    if(m.drift)b.push(L('하늘이 돌아요 — 1초간 따라가기','Drifting sky — track it for 1s'));banner={s:b,t:b.length?2.6:0}}
  function found(pp,a){phase='resolve';phT=0;cur=pp;pp.found=true;var s=LOGIC.secretAt(pp,pz.t);pp.sec={y:s.y,p:s.p};pp.drift=null;vel.y=vel.p=0;
    streak++;solvedN++;var sp=Math.max(0,10-Math.floor(pzT/1.5)),pts=10+sp+Math.min(streak-1,5)*2;a.add(pts);time=Math.min(70,time+13);pzT=0;
    [523,659,784,1047,1319].forEach(function(f,i){chimes.push({t:i*.08,f:f})});a.sfx('coin');a.shake(4);joy=1.5;
    a.burst(CX,CY,'hsl('+pp.pic.hue+',100%,78%)',22);a.burst(CX,CY,'#fff6c8',12);a.pop(CX,CY-120,'+'+pts,'#fff2b0');a.tempo(1+Math.min(.5,solvedN*.03))}
  function choose(i,a){picked=i;phase='after';phT=0;
    if(i>=0&&opts[i]===cur.idx){a.add(5);a.sfx('coin');a.pop(65+i*115,440,'+5',  '#b8ffcf');a.burst(65+i*115,474,'#b8ffcf',10)}
    else{a.beep(170,.2,'sawtooth');streak=0;a.pop(CX,440,L('아쉬워요!','Not quite!'),'#ffb0b0')}}

  SG.run({id:'star-align',title:{ko:'별자리 맞추기',en:'Star Align'},
    how:{ko:'흩어진 빛 조각은 딱 한 방향에서만 그림이 됩니다. 화면을 끌어(또는 방향키) 시점을 돌려 맞추고, 무슨 그림인지 고르세요.',
         en:'The scattered shards form a picture from exactly one angle. Drag (or use arrow keys) to turn the view, then name what you found.'},
    init:function(a){lang=a.lang;run=LOGIC.newRun(LV);view={y:0,p:0};vel={y:0,p:0};time=50;streak=0;solvedN=0;T=0;dragging=false;humT=0;chimes=[];joy=0;blink=2;
      KEY.dig=0;setup(a);if(DBG)window.__sa={pz:function(){return pz},view:function(){return view},phase:function(){return phase},opts:function(){return opts},time:function(){return time}}},
    update:function(dt,inp,a){T+=dt;if(GAL!=null)return;
      for(var i=chimes.length-1;i>=0;i--){chimes[i].t-=dt;if(chimes[i].t<=0){a.beep(chimes[i].f,.22,'triangle');chimes.splice(i,1)}}
      joy=Math.max(0,joy-dt);blink-=dt;if(blink<0)blink=2+Math.random()*3;ent=Math.min(1,ent+dt*2.2);if(banner.t>0)banner.t-=dt;
      if(phase==='play'){time-=dt;pzT+=dt;if(time<=0){time=0;a.over();return}
        var py=view.y,pp0=view.p,held=false;
        if(inp.down&&inp.x!=null){if(!dragging||inp.tap){dragging=true;lx=inp.x;ly=inp.y}
          var dx=(inp.x-lx)*SENS,dy=(inp.y-ly)*SENS;lx=inp.x;ly=inp.y;view.y+=dx;view.p+=dy;held=true;
          if(dt>0){vel.y+=(dx/dt-vel.y)*.4;vel.p+=(dy/dt-vel.p)*.4}}
        else{dragging=false;view.y+=vel.y*dt;view.p+=vel.p*dt;var dc=Math.exp(-4.5*dt);vel.y*=dc;vel.p*=dc}
        var kx=KEY.r-KEY.l,ky=KEY.d-KEY.u;if(kx||ky){var sp=KEY.sh?8:36;view.y+=kx*sp*dt;view.p+=ky*sp*dt;vel.y=vel.p=0;held=true}
        if(Math.abs(view.y)>LIM){view.y=LIM*Math.sign(view.y);vel.y=0}if(Math.abs(view.p)>LIM){view.p=LIM*Math.sign(view.p);vel.p=0}
        var got=LOGIC.advance(pz,view,dt,held),w=LOGIC.warmth(pz.m);lastW=w;
        var spd=dt>0?Math.hypot(view.y-py,view.p-pp0)/dt:0;moving+=((spd>1.5?1:0)-moving)*Math.min(1,dt*8);
        humT-=dt;if(moving>.3&&humT<=0){humT=.4-.3*w;a.beep(196*Math.pow(2,w*2.2),.09,'sine')}
        if(got)found(got,a)}
      else if(phase==='resolve'){phT+=dt;var s=cur.sec,k=1-Math.exp(-12*dt);view.y+=(s.y-view.y)*k;view.p+=(s.p-view.p)*k;lastW=1;
        if(phT>1.25){phase='name';phT=0;opts=LOGIC.choices(cur.idx,Math.random);picked=-2;KEY.dig=0}}
      else if(phase==='name'){phT+=dt;
        if(KEY.dig){choose(KEY.dig-1,a)}
        else if(inp.tap&&inp.down&&inp.x!=null&&inp.y>448&&inp.y<502){var bi=Math.floor((inp.x-8)/115);if(bi>=0&&bi<3)choose(bi,a)}
        else if(phT>4.5)choose(-1,a);KEY.dig=0}
      else if(phase==='after'){phT+=dt;if(phT>.8){
        if(pz.pics.some(function(q){return !q.found})){phase='play';cur.badge=true;cur=null;pz.hold=0;dragging=false}else setup(a)}}
      /* 풀린 그림 효과 입자 */
      if(cur&&phase!=='play'){var fx=cur.pic.fx,fp=cur.pic.fp;
        if(fx==='spout'&&Math.random()<dt*26)fxp.push({x:CX+fp[0],y:CY+fp[1],vx:(Math.random()-.5)*46,vy:-90-Math.random()*50,g:150,l:.9,t:0,c:'#bfeaff',r:2.4});
        if(fx==='smoke'&&Math.random()<dt*7)fxp.push({x:CX+fp[0],y:CY+fp[1],vx:(Math.random()-.5)*10,vy:-26,g:0,l:1.5,t:0,c:'#ffffff',r:5,grow:5});
        if(fx==='spark'&&Math.random()<dt*9){var q=cur.frags[Math.floor(Math.random()*cur.frags.length)];fxp.push({x:CX+q.x+(Math.random()-.5)*30,y:CY+q.y+(Math.random()-.5)*30,vx:0,vy:-8,g:0,l:.6,t:0,c:'#fffbe0',r:2.6,star:1})}}
      for(var j=fxp.length-1;j>=0;j--){var p=fxp[j];p.t+=dt;if(p.t>p.l){fxp.splice(j,1);continue}p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.grow)p.r+=p.grow*dt}},
    draw:function(g,a){var tt=performance.now()/1000;drawBg(g,tt);
      if(GAL!=null){for(var i=0;i<6;i++){var ix=+GAL*6+i;if(!PICS[ix])break;var x=95+(i%2)*170,y=150+Math.floor(i/2)*180;
          g.save();g.translate(x,y);g.scale(.62,.62);g.drawImage(whole(ix),-130,-130);drawEyes(g,PICS[ix],1,0);g.restore();
          g.fillStyle='#fff';g.font=F(14);g.textAlign='center';g.fillText(PICS[ix].en+' '+PICS[ix].ko,x,y+84)}return}
      var w=phase==='play'?lastW:1;drawGround(g,tt,phase==='play'?lastW:1);
      /* 도움 윤곽 (처음 두 문제) */
      if(pz.n<2&&phase==='play'){g.globalAlpha=.09+.03*Math.sin(tt*2);g.drawImage(whole(pz.pics[0].idx),CX-130,CY-130);g.globalAlpha=1}
      var list=[],o;
      pz.pics.forEach(function(pp){if(pp.badge)return;var sec=LOGIC.secretAt(pp,pz.t),pw=pp.found?1:LOGIC.warmth(pp.m==null?99:pp.m),dim=cur&&cur!==pp?Math.max(.12,1-phT*3):1;
        pp.frags.forEach(function(f){o=LOGIC.pose(f,sec,view,{});var al=(.62+.38*(f.z+1)/2)*dim;
          if(f.hid&&!pp.found)al*=Math.max(0,Math.min(1,1.5-o.d/8));
          f._x=CX+f.x+o.ox;f._y=CY+f.y+o.oy;list.push({f:f,o:o,a:al,w:pw,z:f.z})});
        /* 실 */
        g.strokeStyle='rgba(190,205,255,'+(.10+.25*pw)*dim+')';g.lineWidth=1;g.beginPath();
        pp.edges.forEach(function(e){var A=pp.frags[e[0]],B=pp.frags[e[1]];g.moveTo(A._x,A._y);g.lineTo(B._x,B._y)});g.stroke()});
      var dfade=phase==='play'?1:Math.max(0,1-phT*2.5);
      if(dfade>0)pz.decoys.forEach(function(f){var s=1+.2*f.z;
        list.push({f:f,o:{ox:f.hx-f.x+KP*f.z*view.y*.9+Math.sin(tt*.6+f.dp)*4,oy:f.hy-f.y+KP*f.z*view.p*.9+Math.cos(tt*.5+f.dp)*4,rot:f.r0+f.spin*(view.y+view.p)*.02,sc:s},a:(.62+.38*(f.z+1)/2)*dfade,w:w*.85,z:f.z})});
      list.sort(function(p,q){return p.z-q.z});
      var es=.55+.45*ent*(2-ent);
      list.forEach(function(it){var f=it.f,sp=f.spr;if(it.a<=.01)return;g.save();g.translate(CX+(f.x+it.o.ox)*es,CY+(f.y+it.o.oy)*es);g.rotate(it.o.rot);g.scale(it.o.sc*es,it.o.sc*es);
        g.globalAlpha=it.a*ent;g.drawImage(sp.cool,sp.x0-f.x,sp.y0-f.y);g.globalAlpha=it.a*ent*Math.min(1,it.w*1.15);g.drawImage(sp.warm,sp.x0-f.x,sp.y0-f.y);g.restore()});
      g.globalAlpha=1;
      /* 정렬 유지 링 */
      if(phase==='play'&&pz.hold>0){g.strokeStyle='rgba(255,230,150,.9)';g.lineWidth=4;g.lineCap='round';g.beginPath();g.arc(CX,CY,122,-PI/2,-PI/2+6.283*Math.min(1,pz.hold/pz.need));g.stroke()}
      /* 완성된 그림 */
      if(cur&&phase!=='play'){var pic=cur.pic,t=phase==='resolve'?phT:9,al=Math.min(1,t/.35),sc=1,rot=0,by=0;
        if(phase==='resolve')sc=1+.12*Math.max(0,1-t/.3);
        if(pic.fx==='beat')sc*=1+.05*Math.max(0,Math.sin(tt*7));if(pic.fx==='bob')by=Math.sin(tt*3)*5;if(pic.fx==='sway')rot=Math.sin(tt*2)*.06;
        if(t<.3){g.globalAlpha=(1-t/.3)*.5;g.fillStyle='#fff';g.beginPath();g.arc(CX,CY,60+t*500,0,7);g.fill()}
        g.save();g.translate(CX,CY+by);g.rotate(rot);g.scale(sc,sc);g.globalAlpha=al;g.drawImage(whole(cur.idx),-130,-130);
        /* 별자리 선 */
        var pr=Math.min(1,t/1.0)*cur.edges.length;g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1.3;
        cur.edges.forEach(function(e,i){var k=Math.max(0,Math.min(1,pr-i));if(!k)return;var A=cur.frags[e[0]],B=cur.frags[e[1]];
          g.beginPath();g.moveTo(A.x,A.y);g.lineTo(A.x+(B.x-A.x)*k,A.y+(B.y-A.y)*k);g.stroke()});
        cur.frags.forEach(function(f,i){g.fillStyle='#fff';g.globalAlpha=al*(.7+.3*Math.sin(tt*5+i));g.beginPath();g.arc(f.x,f.y,2.6,0,7);g.fill()});
        g.globalAlpha=al;drawEyes(g,pic,al,blink<.12?1:0);g.restore();g.globalAlpha=1}
      fxp.forEach(function(p){g.globalAlpha=(1-p.t/p.l)*(p.grow?.35:.9);g.fillStyle=p.c;g.beginPath();
        if(p.star){g.moveTo(p.x,p.y-p.r*2.4);g.lineTo(p.x+p.r*.6,p.y-p.r*.6);g.lineTo(p.x+p.r*2.4,p.y);g.lineTo(p.x+p.r*.6,p.y+p.r*.6);g.lineTo(p.x,p.y+p.r*2.4);g.lineTo(p.x-p.r*.6,p.y+p.r*.6);g.lineTo(p.x-p.r*2.4,p.y);g.lineTo(p.x-p.r*.6,p.y-p.r*.6)}
        else g.arc(p.x,p.y,p.r,0,7);g.fill()});g.globalAlpha=1;
      /* 찾은 그림 배지 */
      var bn=0;pz.pics.forEach(function(pp){if(!pp.badge)return;g.save();g.translate(38+bn*58,92);g.scale(.2,.2);g.drawImage(whole(pp.idx),-130,-130);g.restore();bn++});
      /* UI */
      var tr=Math.max(0,time/70);g.fillStyle='rgba(255,255,255,.14)';rr(g,12,36,336,7,3.5);g.fill();
      g.fillStyle=time<10?(Math.sin(tt*10)>0?'#ff6b6b':'#ffb0a0'):'#ffd76a';rr(g,12,36,Math.max(7,336*tr),7,3.5);g.fill();
      g.font=F(14);g.textAlign='left';g.fillStyle='rgba(255,255,255,.85)';g.fillText('★ '+(pz.n+1),14,62);
      g.textAlign='right';g.fillText(Math.ceil(time)+L('초','s'),346,62);
      if(pz.mods.two){var fc=pz.pics.filter(function(q){return q.found}).length;g.textAlign='center';g.fillStyle='#bfd0ff';g.fillText(L('그림 ','Pictures ')+fc+'/2',CX,62)}
      g.textAlign='center';
      if(banner.t>0&&phase==='play'){g.globalAlpha=Math.min(1,banner.t*2);g.font=F(15);banner.s.forEach(function(s,i){var tw=g.measureText(s).width+22;
          g.fillStyle='rgba(20,16,60,.72)';rr(g,CX-tw/2,396+i*26,tw,22,11);g.fill();g.fillStyle='#ffe9a8';g.fillText(s,CX,412+i*26)});g.globalAlpha=1}
      else if(pz.n===0&&phase==='play'){g.font=F(15);g.fillStyle='rgba(255,255,255,'+(.75+.2*Math.sin(tt*3))+')';
        g.fillText(L('끌어서 시점을 돌려 조각을 그림으로 맞춰요','Drag to turn the view — find the picture'),CX,416)}
      if(phase==='name'||phase==='after'){g.font=F(15);g.fillStyle='#fff';g.fillText(L('무슨 그림일까요?','What is it?'),CX,438-(phase==='after'?0:0));
        for(var b=0;b<3;b++){var bx=10+b*115,ok=opts[b]===cur.idx,col='rgba(40,34,96,.86)';
          if(phase==='after'){if(ok)col='rgba(60,170,110,.92)';else if(b===picked)col='rgba(190,70,80,.92)'}
          g.fillStyle='rgba(0,0,0,.3)';rr(g,bx,455,110,44,12);g.fill();g.fillStyle=col;rr(g,bx,452,110,44,12);g.fill();
          g.strokeStyle='rgba(200,190,255,.6)';g.lineWidth=1.5;rr(g,bx,452,110,44,12);g.stroke();
          g.fillStyle='#ffd76a';g.font=F(12);g.textAlign='left';g.fillText(b+1,bx+8,468);g.textAlign='center';g.fillStyle='#fff';g.font=F(17);g.fillText(PICS[opts[b]][lang],bx+57,481)}
        if(phase==='name'){g.fillStyle='rgba(255,255,255,.5)';rr(g,120,506,120*Math.max(0,1-phT/4.5),4,2);g.fill()}}}
  });
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function drawEyes(g,pic,al,shut){pic.eyes.forEach(function(e){g.fillStyle='#2a2350';
      if(shut){g.fillRect(e[0]-5,e[1]-1,10,2.2)}else{g.beginPath();g.ellipse(e[0],e[1],4.6,5.6,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(e[0]+1.5,e[1]-2,1.7,0,7);g.fill()}});
    if(pic.eyes.length===2){var a=pic.eyes[0],b=pic.eyes[1],mx=(a[0]+b[0])/2,my=a[1]+7;g.strokeStyle='#2a2350';g.lineWidth=1.6;g.beginPath();g.arc(mx,my,3.4,.15*PI,.85*PI);g.stroke();
      g.fillStyle='rgba(255,120,140,.45)';g.beginPath();g.ellipse(a[0]-6,a[1]+7,4.5,2.6,0,0,7);g.ellipse(b[0]+6,b[1]+7,4.5,2.6,0,0,7);g.fill()}}
})();
