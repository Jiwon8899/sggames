/* 반딧불 말걸기 (Firefly Sync) — 반딧불마다 고유한 깜빡임 박자가 있다. 유리병 친구 '반짝병'이
   같은 박자로 깜빡여 말을 걸면 그 종의 반딧불이 동기화되어 따라오고, 같은 색 꽃으로 데려가면 모인다.
   리듬 판정·월드 시뮬레이션은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,TOP=50,BOT=544,R=95,SPEED=165,LONG=300,SHORTV=150,END_GAP=800,QUIET=420;

  /* ---------- 종(種)과 깜빡임 패턴 (ms, d=0 짧게 / d>0 길게) ---------- */
  var SP={
    A:{c:'#ffd45e',rgb:[255,212,94], ko:'호박불',en:'Amber', pat:[{on:0,d:0},{on:450,d:0}]},
    B:{c:'#9dff7a',rgb:[157,255,122],ko:'풀빛',en:'Meadow', pat:[{on:0,d:900}]},
    C:{c:'#72e8ff',rgb:[114,232,255],ko:'물빛',en:'Brook', pat:[{on:0,d:0},{on:260,d:0},{on:520,d:0}]},
    D:{c:'#ff8fcf',rgb:[255,143,207],ko:'복숭아불',en:'Peach', pat:[{on:0,d:600},{on:900,d:0}]},
    E:{c:'#c3a6ff',rgb:[195,166,255],ko:'보랏불',en:'Violet', pat:[{on:0,d:0},{on:450,d:700}]},
    F:{c:'#ffa05a',rgb:[255,160,90], ko:'노을불',en:'Ember', pat:[{on:0,d:0},{on:700,d:0},{on:950,d:0}]}
  };
  var MIMIC_SHIFT=230; /* 흉내쟁이 벌레는 마지막 깜빡임이 230ms 늦다 */
  function mimicPat(s){var p=SP[s].pat.map(function(f){return {on:f.on,d:f.d}});p[p.length-1].on+=MIMIC_SHIFT;return p}
  function patSpan(p){var e=0;for(var i=0;i<p.length;i++)e=Math.max(e,p[i].on+Math.max(p[i].d,SHORTV));return e}
  function period(p){return patSpan(p)+1300}
  function lightAt(p,t){var v=0;for(var i=0;i<p.length;i++){var d=Math.max(p[i].d,SHORTV),x=t-p[i].on,a=0;
      if(x>=-40&&x<d+140)a=x<0?(x+40)/40:x<d?1:1-(x-d)/140;if(a>v)v=a}return v}
  function tolFor(n){return n<3?150:Math.max(90,150-(n-2)*8)}

  /* 리듬 판정: 각 깜빡임의 시작 시각을 기준점(첫 깜빡임, a:1 이면 다시 기준)에 대해 비교한다.
     ph=[{t:시작ms(첫 깜빡임=0), d:지속ms}] */
  function flashOk(pat,ph,tol,i,st){var pf=pat[i],f=ph[i];
    if(!f)return false;
    var isL=f.d>=LONG;if(isL!==(pf.d>0))return false;
    if(pf.d>0&&(f.d<Math.max(LONG,pf.d-2*tol)||f.d>pf.d+3*tol))return false;
    var exp=pf.on-st.bp,got=f.t-st.b,lim=(pf.a&&i>0)?tol*2.5:tol;
    if(Math.abs(got-exp)>lim)return false;
    if(pf.a||i===0){st.b=f.t;st.bp=pf.on}
    return true}
  function matchPat(pat,ph,tol){if(ph.length!==pat.length)return false;var st={b:0,bp:0};
    for(var i=0;i<pat.length;i++)if(!flashOk(pat,ph,tol,i,st))return false;return true}
  function prefixOk(pat,ph,tol){if(ph.length>=pat.length)return false;var st={b:0,bp:0};
    for(var i=0;i<ph.length;i++){if(ph[i].open){ /* 아직 누르는 중: 시작 시각만 본다 */
        var pf=pat[i],exp=pf.on-st.bp,got=ph[i].t-st.b;return Math.abs(got-exp)<=((pf.a&&i>0)?tol*2.5:tol)}
      if(!flashOk(pat,ph,tol,i,st))return false}
    return true}
  function flashMarks(pat,ph,tol){var st={b:0,bp:0},out=[];
    for(var i=0;i<ph.length;i++){if(i>=pat.length){out.push(false);continue}
      var s2={b:st.b,bp:st.bp};var ok=ph[i].open?true:flashOk(pat,ph,tol,i,s2);out.push(ok);
      if(ok){st=s2}else if(pat[i].a||i===0){st.b=ph[i].t;st.bp=pat[i].on}}
    return out}
  function chorusPat(order){var out=[],off=0;order.forEach(function(s,k){var p=SP[s].pat;
      p.forEach(function(f,i){out.push({on:off+f.on,d:f.d,sp:s,a:i===0&&k>0?1:0})});off+=patSpan(p)+450});return out}

  /* ---------- 손으로 만든 10개의 밤 ---------- */
  var NIGHTS=[
    {jar:[175,420],groups:[{sp:'A',n:6,x:205,y:345}],flowers:[{sp:'A',x:290,y:170,need:4}],
      hint:{ko:'같은 박자로 깜빡여 반딧불을 모아요',en:'Blink the same rhythm to gather fireflies'}},
    {jar:[110,440],groups:[{sp:'B',n:6,x:235,y:320}],flowers:[{sp:'B',x:75,y:175,need:4}],
      hint:{ko:'길게 누르면 길게 빛나요',en:'Hold for a long glow'}},
    {jar:[180,480],groups:[{sp:'C',n:6,x:80,y:170,spd:42,path:[[80,170],[280,170],[280,330],[80,330]]}],flowers:[{sp:'C',x:300,y:470,need:5}],
      hint:{ko:'움직이면서도 신호를 보낼 수 있어요',en:'You can signal while moving'}},
    {jar:[180,500],groups:[{sp:'A',n:6,x:90,y:250},{sp:'B',n:6,x:270,y:380}],flowers:[{sp:'A',x:290,y:150,need:4},{sp:'B',x:70,y:450,need:4}],
      hint:{ko:'한 번에 한 무리씩, 같은 색 꽃으로',en:'One swarm at a time, to its own flower'}},
    {jar:[100,470],groups:[{sp:'A',n:7,x:250,y:250}],beetles:[{sp:'A'}],flowers:[{sp:'A',x:85,y:150,need:5}],
      hint:{ko:'박자가 살짝 어긋난 빛은 흉내쟁이 벌레!',en:'Slightly off the beat? A mimic beetle!'}},
    {jar:[180,330],groups:[{sp:'D',n:6,x:90,y:180},{sp:'E',n:6,x:275,y:250}],flowers:[{sp:'D',x:285,y:470,need:4},{sp:'E',x:75,y:430,need:4}],wind:1,
      hint:{ko:'바람이 불면 길게 빛내 무리를 붙잡아요',en:'In a gust, hold a glow to keep your swarm'}},
    {jar:[180,480],groups:[{sp:'C',n:6,x:250,y:170,spd:30,path:[[250,170],[300,250],[200,250]]},{sp:'F',n:6,x:90,y:310}],
      flowers:[{sp:'C',x:75,y:470,need:4},{sp:'F',x:290,y:440,need:4}],dawn:1,
      hint:{ko:'새벽이 밝아와요. 아래 리듬 띠를 보세요',en:'Dawn is coming. Read the rhythm strip'}},
    {jar:[180,330],groups:[{sp:'A',n:5,x:80,y:160},{sp:'D',n:5,x:290,y:170},{sp:'F',n:5,x:180,y:470}],beetles:[{sp:'F'}],
      flowers:[{sp:'A',x:300,y:480,need:3},{sp:'D',x:60,y:480,need:3},{sp:'F',x:180,y:130,need:3}],
      hint:{ko:'세 무리, 세 꽃. 벌레를 조심해요',en:'Three swarms, three flowers. Mind the beetle'}},
    {jar:[180,320],groups:[{sp:'B',n:5,x:70,y:450},{sp:'E',n:5,x:290,y:440},{sp:'C',n:5,x:180,y:140}],beetles:[{sp:'C'}],
      flowers:[{sp:'B',x:300,y:180,need:3},{sp:'E',x:60,y:190,need:3},{sp:'C',x:180,y:490,need:3}],wind:1,dawn:1,
      hint:{ko:'바람, 새벽, 흉내쟁이까지 한꺼번에!',en:'Wind, dawn and a mimic, all at once!'}},
    {jar:[180,330],groups:[{sp:'A',n:6,x:75,y:170},{sp:'B',n:6,x:285,y:190}],moon:{x:180,y:470,need:{A:4,B:4},order:['A','B']},
      hint:{ko:'두 무리를 모아 달꽃 앞에서 합창!',en:'Gather both swarms, then sing at the moonflower!'}}
  ];

  function rng(seed){var s=(seed>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function d2(ax,ay,bx,by){var x=ax-bx,y=ay-by;return Math.sqrt(x*x+y*y)}

  function genNight(n){
    var r=rng(n*7919+101),chorus=n%5===4,k=chorus?2:(r()<.45?2:3),pool=['A','B','C','D','E','F'],sps=[];
    while(sps.length<k){var s=pool.splice(Math.floor(r()*pool.length),1)[0];sps.push(s)}
    var jar=[180,320],pts=[[jar[0],jar[1]]],tries=0;
    function spot(minD,away,awayD){for(var t=0;t<400;t++){var x=50+r()*260,y=120+r()*380,ok=true;
        for(var i=0;i<pts.length;i++)if(d2(x,y,pts[i][0],pts[i][1])<minD){ok=false;break}
        if(ok&&away&&d2(x,y,away[0],away[1])<awayD)ok=false;
        if(ok&&x>290&&y>480)ok=false;
        if(ok){pts.push([x,y]);return [x,y]}}return null}
    var def=null;
    for(tries=0;tries<50&&!def;tries++){
      pts=[[jar[0],jar[1]]];var groups=[],flowers=[],ok=true,need=k===3?3:4;
      for(var i=0;i<k&&ok;i++){var gp=spot(115);if(!gp){ok=false;break}groups.push({sp:sps[i],n:need+2,x:gp[0],y:gp[1]})}
      var moon=null;
      if(ok&&chorus){var mp=spot(150);if(!mp)ok=false;else{var nd={};sps.forEach(function(s){nd[s]=4});moon={x:mp[0],y:mp[1],need:nd,order:sps.slice()}}}
      else for(var j=0;j<k&&ok;j++){var fp=spot(105,[groups[j].x,groups[j].y],150);if(!fp){ok=false;break}flowers.push({sp:sps[j],x:fp[0],y:fp[1],need:need})}
      if(!ok)continue;
      def={jar:jar,groups:groups,flowers:flowers,moon:moon,wind:r()<.4?1:0,dawn:r()<.4?1:0,beetles:[]};
      var mims=sps.filter(function(s){return SP[s].pat.length>1});
      if(mims.length&&r()<.5)def.beetles.push({sp:mims[Math.floor(r()*mims.length)]});
      if(r()<.35){var G=groups[Math.floor(r()*groups.length)],ox=Math.max(70,Math.min(290,G.x)),oy=Math.max(130,Math.min(480,G.y));
        G.x=ox;G.y=oy;G.spd=32;G.path=[[ox,oy],[Math.max(50,Math.min(310,ox+(r()<.5?-70:70))),oy],[ox,Math.max(110,Math.min(500,oy+(r()<.5?-60:60)))]]}
      if(chorus)def.hint={ko:'무리를 모두 모아 달꽃 앞에서 합창!',en:'Gather every swarm, then sing at the moonflower!'};
    }
    return def}

  function getNight(n){var b=n<NIGHTS.length?NIGHTS[n]:genNight(n);
    return {n:n,tol:tolFor(n),jar:b.jar,groups:b.groups,flowers:b.flowers||[],moon:b.moon||null,beetles:b.beetles||[],
      wind:!!b.wind,dawn:!!b.dawn,hint:b.hint||null}}

  /* ---------- 월드 ---------- */
  function makeWorld(N,seed){
    var r=rng(seed||7),w={N:N,r:r,t:0,tol:N.tol,ev:[],phrase:null,last:null,cleared:false,
      jar:{x:N.jar[0],y:N.jar[1],vx:0,vy:0,flash:false,clock:1e9},groups:[],flies:[],beetles:[],flowers:[],moon:null,
      gust:{next:3.5+r()*2,t:-1,dir:1,f:0,dur:2.6},near:null};
    N.groups.forEach(function(G,gi){var per=period(SP[G.sp].pat);
      w.groups.push({sp:G.sp,x:G.x,y:G.y,path:G.path||null,pi:0,spd:G.spd||0,clock:r()*per,per:per,wr:34});
      for(var i=0;i<G.n;i++)w.flies.push({sp:G.sp,g:gi,x:G.x+(r()-.5)*56,y:G.y+(r()-.5)*44,vx:0,vy:0,st:0,conf:0,
        jit:(r()-.5)*70,ph:r()*6.28,sw:.5+r()*.6,slot:r()*6.28,rad:24+r()*24,grip:1,lit:0,tx:0,ty:0,tr:[]})});
    N.flowers.forEach(function(F){w.flowers.push({sp:F.sp,x:F.x,y:F.y,need:F.need,got:0})});
    if(N.moon){var m=N.moon;w.moon={x:m.x,y:m.y,need:m.need,order:m.order,got:0,pat:chorusPat(m.order),sung:false}}
    N.beetles.forEach(function(B){var gi=0;w.groups.forEach(function(g,i){if(g.sp===B.sp)gi=i});var p=mimicPat(B.sp);
      var g=w.groups[gi];w.beetles.push({sp:B.sp,gi:gi,pat:p,per:period(p),clock:r()*1000,x:g.x+70,y:g.y+40,vx:0,vy:0,st:0,t:0,ph:r()*6,full:0})});
    updNear(w);
    return w}

  function followers(w,sp){var n=0;for(var i=0;i<w.flies.length;i++){var f=w.flies[i];if(f.st===1&&(!sp||f.sp===sp))n++}return n}
  function carrySp(w){for(var i=0;i<w.flies.length;i++)if(w.flies[i].st===1)return w.flies[i].sp;return null}
  function chorusReady(w){var m=w.moon;if(!m||m.sung)return false;for(var s in m.need)if(followers(w,s)<m.need[s])return false;return true}

  function candidates(w){var J=w.jar,out=[],seen={};
    for(var i=0;i<w.flies.length;i++){var f=w.flies[i];
      if(f.st===0&&f.conf<=0&&!seen[f.sp]&&d2(f.x,f.y,J.x,J.y)<R){seen[f.sp]=1;out.push({k:'sp',sp:f.sp,pat:SP[f.sp].pat})}}
    w.beetles.forEach(function(b){if(b.st<2&&d2(b.x,b.y,J.x,J.y)<R)out.push({k:'beetle',b:b,sp:b.sp,pat:b.pat})});
    if(w.moon&&d2(w.moon.x,w.moon.y,J.x,J.y)<74&&chorusReady(w))out.push({k:'chorus',pat:w.moon.pat});
    return out}

  function updNear(w){var J=w.jar,best=null,bd=1e9;
    if(w.moon&&chorusReady(w)){w.near={k:'chorus',pat:w.moon.pat,d:d2(w.moon.x,w.moon.y,J.x,J.y),inR:d2(w.moon.x,w.moon.y,J.x,J.y)<74};return}
    if(!w.moon){var cs=carrySp(w);if(cs){w.near={k:'carry',sp:cs,pat:SP[cs].pat};return}}
    for(var i=0;i<w.flies.length;i++){var f=w.flies[i];if(f.st!==0)continue;var d=d2(f.x,f.y,J.x,J.y);if(d<bd){bd=d;best=f}}
    if(!best){w.near=null;return}
    w.near={k:'sp',sp:best.sp,pat:SP[best.sp].pat,d:bd,inR:bd<R,g:w.groups[best.g]}}

  function evaluate(w,final){var ph=w.phrase.fl,c=candidates(w),M=[],P=0,tol=w.tol;
    for(var i=0;i<c.length;i++){if(matchPat(c[i].pat,ph,tol))M.push(c[i]);else if(prefixOk(c[i].pat,ph,tol))P++}
    if(!final&&P>0)return;
    if(!final&&M.length&&(w.t-w.phrase.rel)*1000<QUIET)return; /* 맞았어도 잠깐 조용해야 대답한다(마구 누르기 방지) */
    if(!final&&!M.length&&c.length===0){ /* 범위 안에 아무도 없음: 끝날 때까지 기다렸다가 판정 */
      var any=false;for(var s in SP)if(prefixOk(SP[s].pat,ph,tol))any=true;if(any)return}
    M.sort(function(a,b){return (a.k==='beetle'?1:0)-(b.k==='beetle'?1:0)});
    commit(w,M[0]||null,c,ph)}

  function commit(w,m,c,ph){var J=w.jar,tol=w.tol;
    var tgt=w.near&&w.near.pat?w.near:null;
    w.last={fl:ph,t:w.t,ok:!!m,pat:m?m.pat:(tgt?tgt.pat:null),sp:m?m.sp:(tgt?tgt.sp:null),k:m?m.k:(c.length?'miss':'none'),chorus:m&&m.k==='chorus'};
    w.phrase=null;
    if(!m){
      if(!c.length){if(tgt&&tgt.k==='sp'&&matchPat(tgt.pat,ph,tol))w.ev.push({e:'far',x:J.x,y:J.y});else w.ev.push({e:'none',x:J.x,y:J.y});return}
      var n=0;for(var i=0;i<w.flies.length;i++){var f=w.flies[i];
        if(f.st===0&&d2(f.x,f.y,J.x,J.y)<R){var a=Math.atan2(f.y-J.y,f.x-J.x)+(w.r()-.5);f.conf=2;f.vx=Math.cos(a)*170;f.vy=Math.sin(a)*170;n++}}
      /* 엉뚱한 박자는 데리고 있던 무리도 절반쯤 헷갈리게 한다 */
      var fol=w.flies.filter(function(z){return z.st===1}),lose=Math.ceil(fol.length/2);
      for(var q=0;q<lose;q++){var z=fol[q];z.st=0;z.conf=1.6;var a2=w.r()*6.28;z.vx=Math.cos(a2)*150;z.vy=Math.sin(a2)*150}
      w.ev.push({e:'miss',x:J.x,y:J.y,n:n+lose,lost:lose});return}
    if(m.k==='sp'){var got=0,old=0;
      for(var j=0;j<w.flies.length;j++){var g=w.flies[j];
        if(!w.moon&&g.st===1&&g.sp!==m.sp){g.st=0;g.conf=1.1;var aa=w.r()*6.28;g.vx=Math.cos(aa)*140;g.vy=Math.sin(aa)*140;old++}}
      for(var k=0;k<w.flies.length;k++){var h=w.flies[k];
        if(h.st===0&&h.sp===m.sp&&h.conf<=0&&d2(h.x,h.y,J.x,J.y)<R){h.st=1;h.grip=.7+w.r()*.9;got++}}
      J.clock=0;w.ev.push({e:'capture',sp:m.sp,n:got,x:J.x,y:J.y});if(old)w.ev.push({e:'jealous',x:J.x,y:J.y,n:old})}
    else if(m.k==='beetle'){m.b.st=1;m.b.t=6;w.ev.push({e:'lure',x:m.b.x,y:m.b.y})}
    else if(m.k==='chorus'){w.moon.sung=true;var cnt=0;
      for(var q=0;q<w.flies.length;q++){var z=w.flies[q];if(z.st===1){z.st=2;z.tx=w.moon.x+(w.r()-.5)*30;z.ty=w.moon.y-10+(w.r()-.5)*20;z.tgt=-1;cnt++}}
      w.ev.push({e:'chorus',x:w.moon.x,y:w.moon.y,n:cnt})}}

  /* ctl: {flash:bool, mx,my: -1..1, dx,dy: 끌기로 직접 옮긴 거리} */
  function step(w,dt,ctl){
    var J=w.jar,N=w.N,ms=dt*1000,i,f;
    w.t+=dt;J.clock+=ms;
    /* 바람 */
    var G=w.gust,gx=0;
    if(N.wind){G.next-=dt;if(G.t<0&&G.next<=0){G.t=0;G.dir=w.r()<.5?-1:1;w.ev.push({e:'gust',dir:G.dir})}
      if(G.t>=0){G.t+=dt;G.f=Math.sin(Math.PI*Math.min(1,G.t/G.dur));if(G.t>=G.dur){G.t=-1;G.f=0;G.next=5+w.r()*3;
          for(i=0;i<w.flies.length;i++)w.flies[i].grip=Math.max(w.flies[i].grip,.7+w.r()*.9)}}
      gx=G.dir*150*G.f}
    /* 반짝병 이동 */
    var mx=ctl.mx||0,my=ctl.my||0,ml=Math.sqrt(mx*mx+my*my);if(ml>1){mx/=ml;my/=ml}
    var k=Math.min(1,dt*12);J.vx+=(mx*SPEED-J.vx)*k;J.vy+=(my*SPEED-J.vy)*k;
    J.x+=J.vx*dt+(ctl.dx||0)+gx*.12*dt;J.y+=J.vy*dt+(ctl.dy||0);
    J.x=Math.max(18,Math.min(W-18,J.x));J.y=Math.max(TOP+14,Math.min(BOT-12,J.y));
    /* 깜빡임 입력과 문장(phrase) */
    if(ctl.flash&&!J.flash){J.flash=true;if(!w.phrase)w.phrase={T0:w.t,fl:[],rel:w.t};
      w.phrase.q=0;w.phrase.fl.push({t:Math.round((w.t-w.phrase.T0)*1000),d:0,open:true});w.ev.push({e:'press',x:J.x,y:J.y})}
    else if(!ctl.flash&&J.flash){J.flash=false;if(w.phrase){var lf=w.phrase.fl[w.phrase.fl.length-1];
        lf.d=Math.round((w.t-w.phrase.T0)*1000)-lf.t;lf.open=false;w.phrase.rel=w.t;w.ev.push({e:'release',long:lf.d>=LONG});evaluate(w,false)}}
    if(J.flash&&w.phrase){var of=w.phrase.fl[w.phrase.fl.length-1];of.d=Math.round((w.t-w.phrase.T0)*1000)-of.t}
    if(w.phrase&&!J.flash){var qg=(w.t-w.phrase.rel)*1000;if(qg>END_GAP)evaluate(w,true);else if(qg>=QUIET&&!w.phrase.q){w.phrase.q=1;evaluate(w,false)}}
    /* 무리 */
    w.groups.forEach(function(g){g.clock=(g.clock+ms)%g.per;
      if(g.path){var p=g.path[g.pi],dx=p[0]-g.x,dy=p[1]-g.y,l=Math.sqrt(dx*dx+dy*dy);
        if(l<2)g.pi=(g.pi+1)%g.path.length;else{var s=Math.min(l,g.spd*dt);g.x+=dx/l*s;g.y+=dy/l*s}}});
    var gripping=J.flash;
    for(i=0;i<w.flies.length;i++){f=w.flies[i];var pat=SP[f.sp].pat;
      if(f.st===0){var g=w.groups[f.g];f.ph+=dt*f.sw;
        var tx=g.x+Math.cos(f.ph)*g.wr*Math.cos(f.ph*.37+f.jit),ty=g.y+Math.sin(f.ph*1.3)*g.wr*.7;
        if(f.conf>0){f.conf-=dt;var dm=Math.pow(.25,dt);f.vx*=dm;f.vy*=dm;f.lit=.25+.25*Math.sin(w.t*40+f.jit)}
        else{var kk=Math.min(1,dt*2.4);f.vx+=((tx-f.x)*2-f.vx)*kk;f.vy+=((ty-f.y)*2-f.vy)*kk;
          var sl=Math.sqrt(f.vx*f.vx+f.vy*f.vy);if(sl>90){f.vx*=90/sl;f.vy*=90/sl}
          f.lit=lightAt(pat,((g.clock+f.jit)%g.per+g.per)%g.per)}
        f.x+=(f.vx+gx*.6)*dt;f.y+=f.vy*dt}
      else if(f.st===1){
        var an=f.slot+w.t*(f.rad<36?1.5:-1.1),tx1=J.x+Math.cos(an)*f.rad,ty1=J.y-4+Math.sin(an)*f.rad*.8,
            sk=J.flash?80:34,sd=2*Math.sqrt(sk);
        f.vx+=((tx1-f.x)*sk-f.vx*sd)*dt;f.vy+=((ty1-f.y)*sk-f.vy*sd)*dt;
        var sl2=Math.sqrt(f.vx*f.vx+f.vy*f.vy);if(sl2>340){f.vx*=340/sl2;f.vy*=340/sl2}
        f.x+=(f.vx+gx*.35)*dt;f.y+=f.vy*dt;
        f.lit=J.flash?1:Math.max(.3,lightAt(pat,J.clock%period(pat)));
        if(G.f>.25&&!gripping){f.grip-=dt*.55*G.f;
          if(f.grip<=0){f.st=0;f.conf=1.6;f.vx=G.dir*200;f.vy=(w.r()-.5)*80;w.ev.push({e:'blown',x:f.x,y:f.y,sp:f.sp})}}
        else if(gripping)f.grip=Math.min(1.6,f.grip+dt*.8);
        if(f.st===1&&d2(f.x,f.y,J.x,J.y)>240){f.st=0;f.conf=1}}
      else if(f.st===2){var dx2=f.tx-f.x,dy2=f.ty-f.y,l2=Math.sqrt(dx2*dx2+dy2*dy2),sp2=260*dt;f.lit=1;
        if(l2<=sp2){f.x=f.tx;f.y=f.ty;f.st=3;
          if(f.tgt>=0){var fl=w.flowers[f.tgt];fl.got++;w.ev.push({e:'deliver',x:fl.x,y:fl.y,sp:f.sp,fi:f.tgt})}
          else{w.moon.got++;w.ev.push({e:'deliver',x:w.moon.x,y:w.moon.y,sp:f.sp,fi:-1})}}
        else{f.x+=dx2/l2*sp2;f.y+=dy2/l2*sp2}}
      if(f.st<2){f.x=Math.max(8,Math.min(W-8,f.x));f.y=Math.max(TOP-6,Math.min(BOT+4,f.y))}}
    /* 꽃으로 배달 */
    w.flowers.forEach(function(F,fi){if(d2(F.x,F.y,J.x,J.y)<52)
      for(var q=0;q<w.flies.length;q++){var z=w.flies[q];if(z.st===1&&z.sp===F.sp){z.st=2;z.tgt=fi;
        var aa=w.r()*6.28;z.tx=F.x+Math.cos(aa)*7;z.ty=F.y-6+Math.sin(aa)*5}}});
    /* 흉내쟁이 벌레 */
    w.beetles.forEach(function(b){b.clock=(b.clock+ms)%b.per;b.t-=dt;var g=w.groups[b.gi],tx,ty,sp,dj=d2(b.x,b.y,J.x,J.y);
      if(b.st===0){b.ph+=dt*.45;tx=g.x+Math.cos(b.ph)*78;ty=g.y+Math.sin(b.ph*.8)*58;sp=38}
      else if(b.st===1){tx=J.x;ty=J.y;sp=115;if(b.t<=0)b.st=0}
      else if(b.st===2){tx=b.x<W/2?-60:W+60;ty=b.y-40;sp=150;if(b.t<=0){b.st=3}}
      else{tx=g.x+60;ty=g.y+40;sp=70;if(d2(b.x,b.y,tx,ty)<20){b.st=0;b.full=0}}
      var dx=tx-b.x,dy=ty-b.y,l=Math.sqrt(dx*dx+dy*dy)||1,v=Math.min(l/dt,sp);
      b.vx+=(dx/l*v-b.vx)*Math.min(1,dt*3);b.vy+=(dy/l*v-b.vy)*Math.min(1,dt*3);
      b.x+=(b.vx+gx*.3)*dt;b.y+=b.vy*dt;
      if(b.st<2&&b.t<4.8&&dj<22){var n=0;
        for(var q=0;q<w.flies.length;q++){var z=w.flies[q];if(z.st===1){z.st=0;z.conf=2.2;var aa=Math.atan2(z.y-J.y,z.x-J.x);z.vx=Math.cos(aa)*190;z.vy=Math.sin(aa)*190;n++}}
        if(n){b.st=2;b.t=2.6;b.full=1;w.ev.push({e:'steal',x:J.x,y:J.y,n:n})}
        else if(b.st===1){b.st=0;b.t=6.5;w.ev.push({e:'bump',x:b.x,y:b.y})}}
      b.lit=b.st===2?.6+.4*Math.sin(w.t*20):lightAt(b.pat,b.clock)});
    /* 클리어 */
    if(!w.cleared){
      if(w.moon){if(w.moon.sung){var flying=0;for(i=0;i<w.flies.length;i++)if(w.flies[i].st===2)flying++;if(!flying){w.cleared=true;w.ev.push({e:'clear'})}}}
      else{var all=true;w.flowers.forEach(function(F){if(F.got<F.need)all=false});if(all){w.cleared=true;w.ev.push({e:'clear'})}}}
    updNear(w)}

  var API={SP:SP,NIGHTS:NIGHTS,getNight:getNight,genNight:genNight,makeWorld:makeWorld,step:step,matchPat:matchPat,prefixOk:prefixOk,
    mimicPat:mimicPat,chorusPat:chorusPat,patSpan:patSpan,period:period,tolFor:tolFor,candidates:candidates,followers:followers,
    carrySp:carrySp,chorusReady:chorusReady,R:R,LONG:LONG,END_GAP:END_GAP,W:W,H:H,TOP:TOP,BOT:BOT,MIMIC_SHIFT:MIMIC_SHIFT};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  if(typeof SG==='undefined')return;

  /* ====================== 화면 / 입력 ====================== */
  var ko,w=null,night=0,time=50,mode='play',mt=0,score0=0,tG=0,
      mood=0,moodT=0,blinkT=2,blink=0,lookX=0,lookY=0,rings=[],bloomFx=[],hintT=0,kbUsed=false,lastPress=0,
      ptrs={},dragAcc={x:0,y:0},keys={},spaceNeedRelease=false,stars=[],tufts=[],blades=[],mist=[],trees=[],deco=[],glowC={},sky=null;

  function rgba(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'}
  function glowSprite(rgb){var key=rgb.join(',');if(glowC[key])return glowC[key];
    var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,rgba([255,255,240],1));gr.addColorStop(.12,rgba(rgb,.95));gr.addColorStop(.38,rgba(rgb,.32));gr.addColorStop(1,rgba(rgb,0));
    x.fillStyle=gr;x.fillRect(0,0,64,64);glowC[key]=c;return c}
  function softSprite(rgb){var key='s'+rgb.join(',');if(glowC[key])return glowC[key];
    var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,rgba(rgb,.55));gr.addColorStop(.5,rgba(rgb,.16));gr.addColorStop(1,rgba(rgb,0));
    x.fillStyle=gr;x.fillRect(0,0,64,64);glowC[key]=c;return c}

  function setupScene(){if(stars.length)return;var r=rng(4242),i;
    for(i=0;i<90;i++)stars.push({x:r()*W,y:r()*230,s:.5+r()*1.4,p:r()*6.28,f:.6+r()*2});
    for(i=0;i<70;i++)tufts.push({x:r()*W,y:225+r()*320,h:5+r()*9,p:r()*6.28});
    tufts.sort(function(a,b){return a.y-b.y});
    for(i=0;i<46;i++)blades.push({x:i*8+r()*6-4,h:16+r()*34,p:r()*6.28,c:r()});
    for(i=0;i<9;i++)mist.push({x:r()*W,y:i<5?200+r()*40:330+r()*170,w:120+r()*120,v:(i<5?6:-9)*(.6+r()*.7),a:i<5?.07:.05});
    for(i=0;i<7;i++)trees.push({x:-10+i*62+r()*30,s:.7+r()*.6,p:r()*6});
    trees.push({x:330,s:1.5,p:2},{x:22,s:1.25,p:4});
    for(i=0;i<6;i++)deco.push({k:0,x:20+r()*320,y:250+r()*270,s:9+r()*10});
    var pc=['#ffe9a8','#c9f7c0','#bfe9ff','#ffc9e6','#ddd0ff'];for(i=0;i<40;i++)deco.push({k:1,x:r()*W,y:236+r()*300,c:pc[i%5]});
    deco.sort(function(a,b){return a.y-b.y})}

  function installInput(){
    if(window.__ffInput)return;window.__ffInput=1;
    var cv=document.querySelector('#stage canvas');
    function lp(e){var r=cv.getBoundingClientRect();return [(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H]}
    cv.addEventListener('pointerdown',function(e){var p=lp(e);ptrs[e.pointerId]={side:p[0]<W/2?'move':'flash',x0:p[0],y0:p[1],lx:p[0],ly:p[1],drag:p[0]<W/2};kbUsed=false});
    cv.addEventListener('pointermove',function(e){var P=ptrs[e.pointerId];if(!P)return;var p=lp(e);
      if(!P.drag&&d2(p[0],p[1],P.x0,P.y0)>12)P.drag=true;
      if(P.drag){dragAcc.x+=(p[0]-P.lx)*1.15;dragAcc.y+=(p[1]-P.ly)*1.15}P.lx=p[0];P.ly=p[1]});
    function up(e){delete ptrs[e.pointerId]}
    window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
    window.addEventListener('keydown',function(e){var c=e.code;
      if(c==='Space'||c.indexOf('Arrow')===0||c==='KeyW'||c==='KeyA'||c==='KeyS'||c==='KeyD'){keys[c]=true;kbUsed=true;if(c==='Space'&&e.repeat)return}});
    window.addEventListener('keyup',function(e){keys[e.code]=false;if(e.code==='Space')spaceNeedRelease=false});
    window.addEventListener('blur',function(){keys={};ptrs={}})}

  function load(n){night=n;w=makeWorld(getNight(n),n*131+Math.floor(Math.random()*1e6));mode='play';mt=0;hintT=0;rings=[];bloomFx=[];
    w.flies.forEach(function(f){f.tr=[]})}

  function init(a){ko=a.lang==='ko';setupScene();installInput();time=50;score0=0;load(0);mood=0;moodT=0;
    spaceNeedRelease=!!keys.Space;ptrs={};dragAcc.x=dragAcc.y=0;a.tempo(1)}

  function readCtl(){var mx=0,my=0;
    if(keys.ArrowLeft||keys.KeyA)mx-=1;if(keys.ArrowRight||keys.KeyD)mx+=1;if(keys.ArrowUp||keys.KeyW)my-=1;if(keys.ArrowDown||keys.KeyS)my+=1;
    var fl=!!keys.Space&&!spaceNeedRelease;for(var id in ptrs)if(ptrs[id].side==='flash')fl=true;
    var c={flash:fl,mx:mx,my:my,dx:dragAcc.x,dy:dragAcc.y};dragAcc.x=dragAcc.y=0;return c}

  function setMood(m,t){mood=m;moodT=t}

  function update(dt,inp,a){tG+=dt;
    var ctl=readCtl();
    if(mode==='play'){time-=dt;hintT+=dt}
    if(mode==='clear'){mt+=dt;ctl={flash:false,mx:0,my:0,dx:0,dy:0};if(mt>1.9){load(night+1);a.tempo(1+Math.min(.5,night*.035))}}
    step(w,dt,ctl);
    var J=w.jar;
    for(var i=0;i<w.ev.length;i++){var e=w.ev[i];
      if(e.e==='press'){rings.push({x:e.x,y:e.y,t:0,c:[255,226,150],r:R});a.beep(740,.05,'sine')}
      else if(e.e==='release'){if(e.long)a.beep(520,.06,'sine')}
      else if(e.e==='capture'){var c=SP[e.sp];setMood(1,1.2);a.sfx('coin');a.beep(1175,.18,'triangle');
        a.burst(e.x,e.y,c.c,12);a.pop(e.x,e.y-36,(ko?'싱크! ':'Synced! ')+'×'+e.n,c.c);rings.push({x:e.x,y:e.y,t:0,c:c.rgb,r:R*1.3})}
      else if(e.e==='miss'){setMood(2,.9);a.beep(220,.16,'triangle');a.beep(185,.2,'triangle');a.shake(3);
        a.burst(e.x,e.y,'#8fa3c8',6);a.pop(e.x,e.y-36,e.n?(ko?'박자가 달라요':'Off rhythm'):'?','#c9d6ff')}
      else if(e.e==='far'){setMood(2,.6);a.beep(330,.1,'sine');a.pop(e.x,e.y-36,ko?'더 가까이!':'Get closer!','#ffe7a8')}
      else if(e.e==='jealous'){a.beep(300,.12,'square');a.pop(e.x,e.y-58,ko?'먼저 무리가 떠났어요':'Your old swarm left','#ffb0b0')}
      else if(e.e==='deliver'){var c2=SP[e.sp];score0++;a.add(10);a.beep(880+Math.min(12,score0%13)*60,.09,'triangle');
        a.burst(e.x,e.y-8,c2.c,6);bloomFx.push({x:e.x,y:e.y-8,t:0,c:c2.rgb})}
      else if(e.e==='steal'){setMood(2,1.4);a.sfx('hit');a.shake(7);a.burst(e.x,e.y,'#9b6bff',14);
        a.pop(e.x,e.y-40,ko?'흉내쟁이가 빛을 훔쳤어요!':'The mimic stole your glow!','#e2c6ff')}
      else if(e.e==='lure'){a.beep(250,.2,'sawtooth');a.pop(e.x,e.y-24,ko?'흉내쟁이다!':'A mimic!','#e2c6ff')}
      else if(e.e==='bump'){a.beep(200,.15,'triangle');a.burst(e.x,e.y,'#9b6bff',8);a.pop(e.x,e.y-24,ko?'속았지롱~':'Fooled ya~','#e2c6ff')}
      else if(e.e==='blown'){a.beep(400,.08,'sine');a.burst(e.x,e.y,SP[e.sp].c,4)}
      else if(e.e==='gust'){a.beep(140,.4,'sine');a.pop(W/2,110,ko?'바람이 불어요!':'Gust!','#d8ecff')}
      else if(e.e==='chorus'){a.sfx('win');a.burst(e.x,e.y,'#ffffff',18);setMood(1,2);rings.push({x:e.x,y:e.y,t:0,c:[255,255,230],r:200})}
      else if(e.e==='clear'){mode='clear';mt=0;var bonus=30+5*Math.min(night,20);a.add(bonus);time=Math.min(70,time+14);
        a.sfx('win');setMood(1,2.2);a.pop(W/2,250,(ko?'밤 '+(night+1)+' 완료! +':'Night '+(night+1)+' clear! +')+bonus,'#fff3b0');
        ['#ffd45e','#9dff7a','#72e8ff','#ff8fcf','#c3a6ff'].forEach(function(cc){a.burst(J.x,J.y,cc,8)})}}
    w.ev.length=0;
    /* 꼬리 */
    for(var j=0;j<w.flies.length;j++){var f=w.flies[j];if(f.st===3){f.tr.length=0;continue}
      f.tr.push(f.x,f.y);if(f.tr.length>16)f.tr.splice(0,2)}
    for(var r=rings.length-1;r>=0;r--){rings[r].t+=dt;if(rings[r].t>.8)rings.splice(r,1)}
    for(var b=bloomFx.length-1;b>=0;b--){bloomFx[b].t+=dt;if(bloomFx[b].t>1)bloomFx.splice(b,1)}
    if(moodT>0){moodT-=dt;if(moodT<=0)mood=0}
    blinkT-=dt;if(blinkT<0){blink=.14;blinkT=2.2+Math.random()*2.6}if(blink>0)blink-=dt;
    var tx=0,ty=0,nn=w.near;
    if(nn&&nn.g){tx=nn.g.x-J.x;ty=nn.g.y-J.y}
    else if(nn&&nn.k==='carry'){w.flowers.forEach(function(F){if(F.sp===nn.sp){tx=F.x-J.x;ty=F.y-J.y}})}
    else if(w.moon){tx=w.moon.x-J.x;ty=w.moon.y-J.y}
    var tl=Math.sqrt(tx*tx+ty*ty)||1;lookX+=(tx/tl*1.8-lookX)*Math.min(1,dt*6);lookY+=(ty/tl*1.6-lookY)*Math.min(1,dt*6);
    if(time<=0&&mode==='play'){time=0;a.over()}}

  /* ---------- 그리기 ---------- */
  function lerp(a,b,t){return a+(b-a)*t}
  function lc(c1,c2,t){return 'rgb('+Math.round(lerp(c1[0],c2[0],t))+','+Math.round(lerp(c1[1],c2[1],t))+','+Math.round(lerp(c1[2],c2[2],t))+')'}
  function dawnAmt(){return w&&w.N.dawn?Math.min(1,w.t/38)*.85:0}

  function drawBack(g,dn){
    var sg=g.createLinearGradient(0,0,0,250);
    sg.addColorStop(0,lc([6,14,42],[46,78,140],dn));sg.addColorStop(.6,lc([16,36,86],[126,132,184],dn));sg.addColorStop(1,lc([34,62,118],[246,178,140],dn));
    g.fillStyle=sg;g.fillRect(0,0,W,252);
    /* 별 */
    var sa=1-dn*1.05;if(sa>0){g.fillStyle='#fff';for(var i=0;i<stars.length;i++){var s=stars[i];
        g.globalAlpha=sa*(.35+.65*Math.abs(Math.sin(tG*s.f+s.p)));g.fillRect(s.x,s.y,s.s,s.s)}g.globalAlpha=1}
    /* 달 */
    var mx=278-tG*.6%40,my=86+dn*30;g.save();g.globalCompositeOperation='lighter';
    g.globalAlpha=.5*(1-dn*.6);g.drawImage(softSprite([200,215,255]),mx-70,my-70,140,140);g.restore();
    g.fillStyle=lc([244,240,214],[255,246,230],dn);g.beginPath();g.arc(mx,my,19,0,7);g.fill();
    g.fillStyle='rgba(180,180,160,.35)';g.beginPath();g.arc(mx-6,my-4,4,0,7);g.arc(mx+5,my+6,3,0,7);g.arc(mx+7,my-7,2,0,7);g.fill();
    /* 먼 언덕 + 나무 */
    var hc=lc([12,26,54],[70,74,110],dn);g.fillStyle=hc;g.beginPath();g.moveTo(0,252);
    for(var x=0;x<=W;x+=12)g.lineTo(x,206+Math.sin(x*.018+1)*10+Math.sin(x*.05)*4);g.lineTo(W,252);g.fill();
    trees.forEach(function(t){var bx=t.x,by=208+Math.sin(bx*.018+1)*10+Math.sin(bx*.05)*4,sw=Math.sin(tG*.9+t.p)*.05+(w?w.gust.f*w.gust.dir*.08:0);
      g.save();g.translate(bx,by);g.scale(t.s,t.s);g.fillStyle=lc([8,18,38],[54,58,92],dn);g.fillRect(-2,-16,4,18);
      g.rotate(sw);g.beginPath();g.ellipse(0,-26,13,15,0,0,7);g.ellipse(-8,-19,9,8,0,0,7);g.ellipse(8,-19,9,8,0,0,7);g.fill();g.restore()});
    /* 안개 1 */
    drawMist(g,0,5,dn);
    /* 들판 */
    var gg=g.createLinearGradient(0,215,0,H);gg.addColorStop(0,lc([14,40,58],[62,92,96],dn));gg.addColorStop(1,lc([5,16,26],[30,48,52],dn));
    g.fillStyle=gg;g.beginPath();g.moveTo(0,H);g.lineTo(0,232);
    for(var x2=0;x2<=W;x2+=15)g.lineTo(x2,226+Math.sin(x2*.025+3)*7);g.lineTo(W,H);g.fill();
    /* 달빛 반사 + 작은 들꽃 + 덤불 */
    g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.10*(1-dn*.5);g.drawImage(softSprite([150,190,255]),20,200,320,170);g.restore();
    for(var b2=0;b2<deco.length;b2++){var o=deco[b2];
      if(o.k===0){g.fillStyle=lc([20,50,62],[64,96,90],dn);g.beginPath();g.ellipse(o.x,o.y,o.s*1.6,o.s,0,Math.PI,0);g.ellipse(o.x-o.s,o.y,o.s,o.s*.75,0,Math.PI,0);g.ellipse(o.x+o.s*1.1,o.y,o.s*.9,o.s*.7,0,Math.PI,0);g.fill()}
      else{g.fillStyle=o.c;g.globalAlpha=.35+.25*Math.sin(tG*1.3+o.x);g.beginPath();g.arc(o.x,o.y,1.6,0,7);g.fill();g.globalAlpha=1}}
    /* 풀 덤불 */
    g.strokeStyle=lc([28,72,74],[70,110,90],dn);g.lineWidth=1.4;g.lineCap='round';g.beginPath();
    var wind=w?w.gust.f*w.gust.dir:0;
    for(var k=0;k<tufts.length;k++){var u=tufts[k],sw2=Math.sin(tG*1.4+u.p)*.18+wind*.5;
      for(var q=-1;q<=1;q++){g.moveTo(u.x+q*2.5,u.y);g.quadraticCurveTo(u.x+q*3.5,u.y-u.h*.6,u.x+q*4+Math.sin(sw2)*u.h,u.y-u.h*(q?0.8:1))}}
    g.stroke()}
  function drawMist(g,a0,a1,dn){g.save();g.globalCompositeOperation='lighter';
    for(var i=a0;i<a1;i++){var m=mist[i],x=((m.x+tG*m.v)%(W+m.w*2)+W+m.w*2)%(W+m.w*2)-m.w;
      g.globalAlpha=m.a*(1+dn);g.drawImage(softSprite([170,200,235]),x-m.w,m.y-26,m.w*2,52)}
    g.restore()}
  function drawFront(g,dn){var wind=w?w.gust.f*w.gust.dir:0;g.fillStyle=lc([3,10,18],[20,36,40],dn);
    for(var i=0;i<blades.length;i++){var b=blades[i],sw=Math.sin(tG*1.6+b.p)*4+wind*10,bx=b.x,by=BOT+14;
      g.beginPath();g.moveTo(bx-3,by);g.quadraticCurveTo(bx-1+sw*.4,by-b.h*.6,bx+sw,by-b.h);g.quadraticCurveTo(bx+1+sw*.4,by-b.h*.5,bx+3,by);g.fill()}
    g.fillRect(0,BOT+12,W,H-BOT-12)}

  function patGlyph(g,pat,x,y,sc,col,al){ /* 꽃 아래 작은 리듬 표시 */
    var span=patSpan(pat),x0=x-span*sc/2;g.fillStyle=col;g.globalAlpha=al;
    for(var i=0;i<pat.length;i++){var px=x0+pat[i].on*sc;
      if(pat[i].d>0){rr(g,px-2,y-2,pat[i].d*sc+4,4,2);g.fill()}else{g.beginPath();g.arc(px,y,2.2,0,7);g.fill()}}
    g.globalAlpha=1}
  function rr(g,x,y,w2,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w2,y,x+w2,y+h,r);g.arcTo(x+w2,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w2,y,r);g.closePath()}

  function drawFlower(g,F,dn){var c=SP[F.sp],bl=Math.min(1,F.got/F.need),x=F.x,y=F.y,pu=.5+.5*Math.sin(tG*2+x);
    g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y+24,16,4,0,0,7);g.fill();
    g.strokeStyle='#1f5a45';g.lineWidth=2.5;g.beginPath();g.moveTo(x,y+24);g.quadraticCurveTo(x-4,y+12,x,y+2);g.stroke();
    g.fillStyle='#24684e';g.beginPath();g.ellipse(x-7,y+15,6,2.6,-.5,0,7);g.ellipse(x+7,y+18,6,2.6,.5,0,7);g.fill();
    g.save();g.globalCompositeOperation='lighter';g.globalAlpha=(.25+.55*bl+.15*pu)*(1-dn*.4);
    var gs=26+bl*34;g.drawImage(glowSprite(c.rgb),x-gs,y-gs,gs*2,gs*2);g.restore();
    var op=.4+.6*bl;g.save();g.translate(x,y);
    for(var i=0;i<6;i++){g.save();g.rotate(i*Math.PI/3+tG*.15);g.fillStyle=rgba(c.rgb,.55+.4*bl);
      g.beginPath();g.ellipse(0,-6-4*op,4+2*op,7+4*op,0,0,7);g.fill();g.restore()}
    g.fillStyle=bl>=1?'#fffbe6':rgba(c.rgb,1);g.beginPath();g.arc(0,0,4.5,0,7);g.fill();g.restore();
    for(var k=0;k<F.need;k++){var a=Math.PI*.75+k/(Math.max(1,F.need-1))*Math.PI*-.5+Math.PI,px=x+Math.cos(a)*25,py=y+31;
      px=x+(k-(F.need-1)/2)*8;g.fillStyle=k<F.got?c.c:'rgba(255,255,255,.18)';g.beginPath();g.arc(px,py+4,2.6,0,7);g.fill()}
    patGlyph(g,c.pat,x,y+44,.028,c.c,.75)}
  function drawMoon(g,M){var x=M.x,y=M.y,pu=.5+.5*Math.sin(tG*2),ready=chorusReady(w),bl=M.sung?1:0;
    g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y+30,24,5,0,0,7);g.fill();
    g.strokeStyle='#2a6a58';g.lineWidth=3;g.beginPath();g.moveTo(x,y+30);g.quadraticCurveTo(x+5,y+15,x,y+4);g.stroke();
    g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.35+.3*pu+(ready?.3:0)+bl*.4;var gs=50+bl*40;
    g.drawImage(glowSprite([230,235,255]),x-gs,y-gs,gs*2,gs*2);g.restore();
    g.save();g.translate(x,y);var order=M.order;
    for(var i=0;i<10;i++){var s=order[i%order.length];g.save();g.rotate(i*Math.PI/5-tG*.1);g.fillStyle=i%2?'rgba(240,244,255,.85)':rgba(SP[s].rgb,.8);
      g.beginPath();g.ellipse(0,-12,5.5,12,0,0,7);g.fill();g.restore()}
    g.fillStyle='#fffbe6';g.beginPath();g.arc(0,0,6,0,7);g.fill();g.restore();
    var oy=y+42;order.forEach(function(s,k){var cnt=followers(w,s),need=M.need[s],ox=x+(k-(order.length-1)/2)*44;
      g.font='12px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle=SP[s].c;
      g.fillText((M.sung?need:Math.min(cnt,need))+'/'+need,ox,oy+4)})}

  function drawFly(g,x,y,rgb,lit,al,tr){
    if(tr&&tr.length>3){g.fillStyle=rgba(rgb,1);for(var i=0;i<tr.length-2;i+=2){g.globalAlpha=al*(.05+.25*i/tr.length);g.fillRect(tr[i]-1,tr[i+1]-1,2,2)}}
    var s=8+lit*26;g.globalAlpha=al*(.38+.62*lit);g.drawImage(glowSprite(rgb),x-s,y-s,s*2,s*2);g.globalAlpha=1}

  function drawBeetle(g,b,dn){var lit=b.lit,al=1-dn*.5,c=SP[b.sp];
    g.save();g.translate(b.x,b.y);g.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);g.scale(1.3,1.3);
    g.fillStyle='rgba(40,20,60,.9)';g.beginPath();g.ellipse(0,0,6,8,0,0,7);g.fill();
    g.strokeStyle='rgba(120,90,160,.7)';g.lineWidth=1;g.beginPath();g.moveTo(0,-8);g.lineTo(0,8);g.stroke();
    g.beginPath();g.moveTo(-3,-8);g.lineTo(-6,-13);g.moveTo(3,-8);g.lineTo(6,-13);g.stroke();
    g.fillStyle='#ffe';g.beginPath();g.arc(-2.4,-6,1.2,0,7);g.arc(2.4,-6,1.2,0,7);g.fill();g.restore();
    g.save();g.globalCompositeOperation='lighter';drawFly(g,b.x,b.y+5,b.full?[200,150,255]:c.rgb,lit,al,null);g.restore()}

  function drawJar(g){var J=w.jar,x=J.x,y=J.y+Math.sin(tG*2.6)*2.2,fl=J.flash,cnt=followers(w);
    g.fillStyle='rgba(0,0,0,.32)';g.beginPath();g.ellipse(x,J.y+34,15,4,0,0,7);g.fill();
    g.save();g.globalCompositeOperation='lighter';
    if(fl){g.globalAlpha=.9;g.drawImage(softSprite([255,226,150]),x-R,y-R,R*2,R*2);g.globalAlpha=1;g.drawImage(glowSprite([255,224,140]),x-46,y-46,92,92)}
    else{g.globalAlpha=.55;g.drawImage(glowSprite([255,200,120]),x-24,y-24,48,48)}
    g.restore();
    /* 범위 */
    g.strokeStyle=fl?'rgba(255,232,170,.45)':'rgba(255,232,170,.13)';g.lineWidth=1.2;g.setLineDash([3,6]);g.lineDashOffset=-tG*8;
    g.beginPath();g.arc(J.x,J.y,R,0,7);g.stroke();g.setLineDash([]);
    g.save();g.translate(x,y);var sq=mood===1?1+.06*Math.sin(tG*18):1;g.scale(sq,2-sq);
    /* 유리병 몸 */
    var bg=g.createLinearGradient(-15,0,15,0);bg.addColorStop(0,'rgba(170,215,255,.35)');bg.addColorStop(.5,'rgba(120,170,220,.16)');bg.addColorStop(1,'rgba(90,140,200,.32)');
    g.fillStyle=bg;rr(g,-15,-13,30,31,11);g.fill();
    var inner=g.createRadialGradient(0,5,1,0,5,15);inner.addColorStop(0,fl?'#fffbe0':'#ffd890');inner.addColorStop(1,fl?'rgba(255,220,120,.4)':'rgba(255,170,80,0)');
    g.fillStyle=inner;g.globalAlpha=fl?1:.75;rr(g,-13,-9,26,25,9);g.fill();g.globalAlpha=1;
    g.strokeStyle='rgba(225,242,255,.75)';g.lineWidth=1.6;rr(g,-15,-13,30,31,11);g.stroke();
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=2;g.beginPath();g.arc(-6,0,9,Math.PI*1.05,Math.PI*1.45);g.stroke();
    /* 목과 뚜껑 */
    g.fillStyle='rgba(190,225,255,.4)';g.fillRect(-9,-17,18,5);
    g.fillStyle='#a0663a';rr(g,-11,-24,22,8,3);g.fill();g.fillStyle='#c9884f';g.fillRect(-10,-23,20,2.5);
    g.strokeStyle='#4f9a52';g.lineWidth=1.8;g.beginPath();g.moveTo(2,-24);g.quadraticCurveTo(3,-29,7,-31);g.stroke();
    g.fillStyle='#78c86c';g.beginPath();g.ellipse(9,-31,4,2.2,-.4,0,7);g.fill();
    /* 얼굴 */
    var ex=lookX,ey=lookY;g.fillStyle='rgba(255,120,140,.45)';g.beginPath();g.arc(-9,5,2.6,0,7);g.arc(9,5,2.6,0,7);g.fill();
    g.strokeStyle='#4a2a1c';g.fillStyle='#3a2216';g.lineWidth=1.6;g.lineCap='round';
    if(mood===1){g.beginPath();g.arc(-5.5,0,3,Math.PI*1.1,Math.PI*1.9);g.stroke();g.beginPath();g.arc(5.5,0,3,Math.PI*1.1,Math.PI*1.9);g.stroke();
      g.beginPath();g.arc(0,5,3.4,.1,Math.PI-.1);g.fill()}
    else{if(blink>0){g.beginPath();g.moveTo(-8,-1);g.lineTo(-3,-1);g.moveTo(3,-1);g.lineTo(8,-1);g.stroke()}
      else{g.fillStyle='#fff';g.beginPath();g.ellipse(-5.5,-1,3.4,mood===2?4.4:3.9,0,0,7);g.ellipse(5.5,-1,3.4,mood===2?4.4:3.9,0,0,7);g.fill();
        g.fillStyle='#2a1810';g.beginPath();g.arc(-5.5+ex,-1+ey,mood===2?1.5:2.1,0,7);g.arc(5.5+ex,-1+ey,mood===2?1.5:2.1,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(-4.8+ex,-2+ey,.7,0,7);g.arc(6.2+ex,-2+ey,.7,0,7);g.fill()}
      g.fillStyle='#3a2216';
      if(mood===2){g.beginPath();g.ellipse(0,7,2,2.6,0,0,7);g.fill()}
      else if(fl){g.beginPath();g.ellipse(0,6.5,2.8,2.2,0,0,7);g.fill()}
      else{g.beginPath();g.arc(0,4.5,2.4,.25,Math.PI-.25);g.stroke()}}
    g.restore();
    if(cnt&&!fl){g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle='rgba(255,245,210,.8)';g.fillText('×'+cnt,x+20,y-18)}}

  function drawStrip(g){var x0=8,y0=554,ww=298,hh=68,n=w.near;
    g.fillStyle='rgba(6,12,30,.72)';rr(g,x0,y0,ww,hh,12);g.fill();g.strokeStyle='rgba(180,200,255,.18)';g.lineWidth=1;rr(g,x0,y0,ww,hh,12);g.stroke();
    g.textAlign='left';
    if(!n){g.font='14px Jua, system-ui, sans-serif';g.fillStyle='#dfe8ff';g.fillText(ko?'다 모았어요!':'All gathered!',x0+14,y0+38);return}
    var pat=n.pat,tol=w.tol,span=patSpan(pat)+tol+60,tx0=x0+90,tw=ww-102,sc=tw/Math.max(span,1100),y1=y0+24,y2=y0+50;
    /* 라벨 */
    if(n.k==='carry'){var c=SP[n.sp];g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.4+.6*lightAt(pat,w.jar.clock%period(pat));
      g.drawImage(glowSprite(c.rgb),x0+4,y0+10,24,24);g.restore();
      g.font='12px Jua, system-ui, sans-serif';g.fillStyle=c.c;g.fillText(ko?'싱크 중':'Synced',x0+28,y0+27);
      g.font='10px Jua, system-ui, sans-serif';g.fillStyle='rgba(255,240,200,.85)';g.fillText(ko?'같은 색 꽃으로!':'To its flower!',x0+12,y0+50)}
    else if(n.k==='chorus'){g.font='13px Jua, system-ui, sans-serif';g.fillStyle='#fff6d0';g.fillText(ko?'합창':'Chorus',x0+12,y0+30);
      g.font='10px Jua, system-ui, sans-serif';g.fillStyle='rgba(220,230,255,.7)';g.fillText(n.inR?(ko?'지금 불러요!':'Sing now!'):(ko?'달꽃 가까이':'Go to moonflower'),x0+12,y0+48)}
    else{var cc=SP[n.sp];g.save();g.globalCompositeOperation='lighter';var gl=n.g?lightAt(pat,n.g.clock):0;g.globalAlpha=.4+.6*gl;
      g.drawImage(glowSprite(cc.rgb),x0+4,y0+10,24,24);g.restore();
      g.font='12px Jua, system-ui, sans-serif';g.fillStyle=cc.c;g.fillText(ko?cc.ko:cc.en,x0+28,y0+27);
      g.font='10px Jua, system-ui, sans-serif';g.fillStyle=n.inR?'rgba(200,255,210,.85)':'rgba(255,220,180,.8)';
      g.fillText(n.inR?(ko?'들려요!':'In range'):(ko?'더 가까이':'Too far'),x0+12,y0+50)}
    /* 줄 */
    g.strokeStyle='rgba(200,215,255,.15)';g.beginPath();g.moveTo(tx0-4,y1);g.lineTo(tx0+tw,y1);g.moveTo(tx0-4,y2);g.lineTo(tx0+tw,y2);g.stroke();
    /* 기준 박자: 허용 범위 + 점/선 */
    var ghost=n.k==='sp'&&n.g?n.g.clock:n.k==='carry'?w.jar.clock%period(pat):-1;
    for(var i=0;i<pat.length;i++){var p=pat[i],col=SP[p.sp||n.sp].rgb,px=tx0+p.on*sc;
      g.fillStyle=rgba(col,.13);rr(g,px-tol*sc,y1-9,tol*2*sc,18,5);g.fill();
      var on=ghost>=p.on&&ghost<p.on+Math.max(p.d,SHORTV)+60;g.fillStyle=rgba(col,on?1:.75);
      if(on){g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.8;g.drawImage(glowSprite(col),px-14,y1-14,28,28);g.restore()}
      if(p.d>0){rr(g,px-4,y1-4,p.d*sc+8,8,4);g.fill()}else{g.beginPath();g.arc(px,y1,4.5,0,7);g.fill()}}
    if(ghost>=0&&ghost<span&&!w.phrase){g.strokeStyle='rgba(255,255,255,.25)';g.beginPath();g.moveTo(tx0+ghost*sc,y1-10);g.lineTo(tx0+ghost*sc,y1+10);g.stroke()}
    /* 내 깜빡임 */
    var ph=w.phrase?w.phrase.fl:(w.last&&w.t-w.last.t<1.3?w.last.fl:null),T=w.phrase?(w.t-w.phrase.T0)*1000:-1;
    if(ph){var marks=flashMarks(pat,ph,tol),done=!w.phrase,okAll=done&&w.last&&w.last.ok;
      for(var j=0;j<ph.length;j++){var f=ph[j],fx=tx0+f.t*sc;if(fx>tx0+tw+6)continue;
        var colr=f.open?'#fff4cf':(done?(okAll?'#a6ffbf':(marks[j]?'#fff4cf':'#ff8a9a')):(marks[j]?'#fff4cf':'#ff8a9a'));g.fillStyle=colr;
        if(f.d>=LONG||f.open&&f.d>120){rr(g,fx-4,y2-4,Math.min(f.d*sc,tx0+tw-fx)+8,8,4);g.fill()}else{g.beginPath();g.arc(fx,y2,4.5,0,7);g.fill()}}
      if(done){g.font='11px Jua, system-ui, sans-serif';g.textAlign='right';g.fillStyle=okAll?'#a6ffbf':'#ff9aa8';
        g.fillText(okAll?(ko?'딱 맞아요!':'Match!'):(ko?'달라요':'Off'),x0+ww-8,y0+hh-6)}}
    else{g.font='10px Jua, system-ui, sans-serif';g.fillStyle='rgba(220,230,255,.45)';g.fillText(ko?'나의 깜빡임':'your blinks',tx0,y2+3)}
    if(T>=0){var cx=tx0+Math.min(T,span)*sc;g.strokeStyle='#ffe28a';g.lineWidth=2;g.beginPath();g.moveTo(cx,y1-11);g.lineTo(cx,y2+9);g.stroke();g.lineWidth=1}}

  function draw(g,a){if(!w)return;var dn=dawnAmt(),i,f;
    drawBack(g,dn);
    w.flowers.forEach(function(F){drawFlower(g,F,dn)});
    if(w.moon)drawMoon(g,w.moon);
    drawMist(g,5,9,dn);
    /* 무리가 함께 깜빡일 때 들판이 밝아진다 */
    g.save();g.globalCompositeOperation='lighter';
    var J=w.jar,sum=0,cnt=0,sr=[0,0,0];for(i=0;i<w.flies.length;i++){f=w.flies[i];if(f.st===1){sum+=f.lit;cnt++;var cr=SP[f.sp].rgb;sr[0]+=cr[0];sr[1]+=cr[1];sr[2]+=cr[2]}}
    if(cnt){var lv=sum/cnt,rad=80+cnt*18,mc=[Math.round(sr[0]/cnt),Math.round(sr[1]/cnt),Math.round(sr[2]/cnt)];g.globalAlpha=Math.min(1,.2+lv*.8)*(1-dn*.4);
      g.drawImage(softSprite(mc),J.x-rad,J.y-rad*.7+20,rad*2,rad*1.4);g.globalAlpha*=.8;g.drawImage(softSprite(mc),J.x-rad*.5,J.y-rad*.35+24,rad,rad*.7)}
    if(mode==='clear'){g.globalAlpha=Math.min(1,mt)*.5;g.drawImage(softSprite([255,240,190]),-80,140,W+160,500)}
    bloomFx.forEach(function(b){g.globalAlpha=1-b.t;var s=20+b.t*60;g.drawImage(glowSprite(b.c),b.x-s,b.y-s,s*2,s*2)});
    g.restore();
    rings.forEach(function(r){g.strokeStyle=rgba(r.c,(1-r.t/.8)*.6);g.lineWidth=2;g.beginPath();g.arc(r.x,r.y,8+r.t/.8*r.r,0,7);g.stroke()});
    w.beetles.forEach(function(b){drawBeetle(g,b,dn)});
    g.save();g.globalCompositeOperation='lighter';var fa=1-dn*.55;
    for(i=0;i<w.flies.length;i++){f=w.flies[i];if(f.st===3)continue;drawFly(g,f.x,f.y,SP[f.sp].rgb,f.lit,fa*(f.conf>0?.7:1),f.tr)}
    g.restore();
    drawJar(g);
    drawFront(g,dn);
    drawStrip(g);
    /* 상단: 시간 막대, 밤 번호, 힌트 */
    var tf=Math.max(0,time)/70;g.fillStyle='rgba(0,0,0,.35)';rr(g,10,33,W-20,6,3);g.fill();
    g.fillStyle=time<10?'#ff8a8a':'#ffe9a0';rr(g,10,33,(W-20)*tf,6,3);g.fill();
    g.font='13px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='rgba(235,240,255,.85)';
    g.fillText((ko?'밤 ':'Night ')+(night+1)+(w.N.wind?(ko?' · 바람':' · wind'):'')+(w.N.dawn?(ko?' · 새벽':' · dawn'):''),12,54);
    g.textAlign='right';g.fillText(Math.ceil(Math.max(0,time))+(ko?'초':'s'),W-12,54);
    var hint=w.N.hint;if(hint&&mode==='play'&&(night===0||hintT<6)){var tx=hint[ko?'ko':'en'];g.font='15px Jua, system-ui, sans-serif';
      var tw=g.measureText(tx).width+24,al=night===0?1:Math.min(1,(6-hintT)*1.5);g.globalAlpha=al;g.fillStyle='rgba(8,16,40,.72)';rr(g,W/2-tw/2,64,tw,26,13);g.fill();
      g.fillStyle='#fff3c8';g.textAlign='center';g.fillText(tx,W/2,82);g.globalAlpha=1}
    if(kbUsed&&night<2&&mode==='play'){g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle='rgba(220,230,255,.6)';
      g.fillText(ko?'방향키 이동 · 스페이스 짧게/길게':'Arrows move · Space tap/hold',W/2,104)}
    else if(night===0&&mode==='play'&&!kbUsed){g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle='rgba(220,230,255,.6)';
      g.fillText(ko?'오른쪽 톡/꾹 = 깜빡 · 왼쪽 끌기 = 이동':'Right side tap/hold = blink · drag left = move',W/2,104)}}

  window.__ff={load:function(n){load(n)},world:function(){return w},night:function(){return night},time:function(){return time},mode:function(){return mode}};

  SG.run({id:'firefly-sync',title:{ko:'반딧불 말걸기',en:'Firefly Sync'},
    how:{ko:'반딧불은 종마다 깜빡이는 박자가 달라요. 오른쪽을 톡(짧게)·꾹(길게) 눌러 같은 박자로 깜빡이면 무리가 따라와요. 왼쪽을 끌어 움직여 같은 색 꽃으로 데려가세요. (PC: 방향키 이동, 스페이스 깜빡임)',
         en:'Each firefly species blinks its own rhythm. Tap (short) or hold (long) the right side to blink the same rhythm and the swarm follows you. Drag the left side to move and lead them to the matching flower. (PC: arrows move, Space blinks)'},
    init:init,update:update,draw:draw});
})();
