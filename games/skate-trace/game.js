/* 얼음 위 그림 (Skate Trace) — 꼬마 펭귄이 관성으로 미끄러지며 얼음 위에 그림을 새긴다.
   직접 위치를 조종하지 않고 '밀기'만 한다: 스와이프 길이만큼 밀고, 속도가 빠를수록 크게 돈다(에지 그립 한계).
   물리·도형·채점은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640;
  /* 연못(둥근 사각형) */
  var PCX=180,PCY=334,PHW=168,PHH=232,PRAD=46,SR=9;
  /* 스케이팅 물리 */
  var GRIP=340,ACC=720,FRIC=.2,DEC=5,BRAKE=560,IMP=1.9,IMPMAX=250,VMAX=270,THRK=300,PUSHT=.9,SPINT=.75,SNOWF=2.4;
  /* 채점 */
  var STEP=4,TOLC=16,TOLC0=7,TOLP=20,TOLP0=9,DOTTOL=18,TRS=3;
  function credit(d,a,b){return d<=a?1:d>=b?0:(b-d)/(b-a)}
  var HB=1/120;

  function rng(seed){var s=(seed>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function hyp(x,y){return Math.sqrt(x*x+y*y)}
  function pondSD(x,y){var qx=Math.abs(x-PCX)-(PHW-PRAD),qy=Math.abs(y-PCY)-(PHH-PRAD);
    return hyp(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-PRAD}

  /* ---------- 도형 ---------- */
  function param(fn,t0,t1,n){var p=[];for(var i=0;i<=n;i++)p.push(fn(t0+(t1-t0)*i/n));return p}
  function quad(a,c,b,n){return param(function(t){var u=1-t;return [u*u*a[0]+2*t*u*c[0]+t*t*b[0],u*u*a[1]+2*t*u*c[1]+t*t*b[1]]},0,1,n||40)}
  function line(a,b){return [a.slice(),b.slice()]}
  function cat(){var out=[];for(var i=0;i<arguments.length;i++){var p=arguments[i];for(var j=0;j<p.length;j++){
      var q=p[j],l=out[out.length-1];if(l&&Math.abs(l[0]-q[0])<.01&&Math.abs(l[1]-q[1])<.01)continue;out.push(q)}}return out}
  function resample(pts,closed){
    var src=pts.slice();if(closed)src.push(pts[0]);
    var out=[src[0].slice()],acc=0,i,need=STEP;
    for(i=1;i<src.length;i++){var a=src[i-1],b=src[i],d=hyp(b[0]-a[0],b[1]-a[1]),u=0;
      while(acc+d*(1-u)>=need){var r=(need-acc)/d;u+=r;acc=0;out.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]);need=STEP}
      acc+=d*(1-u)}
    if(closed){var f=out[0],l=out[out.length-1];if(hyp(f[0]-l[0],f[1]-l[1])<STEP*.6)out.pop()}
    else{var e=src[src.length-1],l2=out[out.length-1];if(hyp(e[0]-l2[0],e[1]-l2[1])>1)out.push(e.slice())}
    return out}
  function turnAt(p,i,k,closed){var n=p.length,a=i-k,b=i+k;
    if(closed){a=(a+n)%n;b=b%n}else{if(a<0||b>=n)return 0}
    var x1=p[i][0]-p[a][0],y1=p[i][1]-p[a][1],x2=p[b][0]-p[i][0],y2=p[b][1]-p[i][1];
    return Math.abs(Math.atan2(x1*y2-y1*x2,x1*x2+y1*y2))}
  function corners(p,closed){var c=0,inC=false;for(var i=0;i<p.length;i++){var t=turnAt(p,i,3,closed)>.9;if(t&&!inC)c++;inC=t}return c}

  var NAMES=[{ko:'한 줄 긋기',en:'First Line'},{ko:'동그라미',en:'Circle'},{ko:'8자',en:'Figure Eight'},{ko:'하트',en:'Heart'},
    {ko:'물고기',en:'Fish'},{ko:'S자',en:'Letter S'},{ko:'소용돌이',en:'Spiral'},{ko:'꽃',en:'Flower'},{ko:'연',en:'Kite'},
    {ko:'별',en:'Star'},{ko:'무한대',en:'Infinity'},{ko:'달팽이',en:'Snail'}];
  var TIPS=[{ko:'밀어서 미끄러지며 그려요',en:'Push and glide to draw'},
    {ko:'빠를수록 크게 돌아요',en:'The faster you go, the wider you turn'},
    {ko:'미리 밀어 두면 곡선이 이어져요',en:'Push early and let the curve carry you'},
    {ko:'뾰족한 곳은 꾹 눌러 브레이크',en:'Hold still to brake at sharp corners',kko:'뾰족한 곳은 Shift로 브레이크',ken:'Shift brakes at sharp corners'},
    {ko:'눈 자리에서 두 번 탭하면 스핀!',en:'Double-tap at the eye to spin!',kko:'눈 자리에서 Space로 스핀!',ken:'Press Space at the eye to spin!'},
    {ko:'눈 더미에 들어가면 느려져요',en:'Snow patches slow you down'},
    {ko:'안쪽으로 갈수록 천천히',en:'Slow down as it tightens'},
    {ko:'얇은 얼음은 두 번 지나면 풍덩!',en:'Thin ice breaks on the second pass!'},
    {ko:'바람이 옆으로 밀어요',en:'The wind drifts you sideways'},
    {ko:'꼭짓점마다 멈췄다 밀기',en:'Stop and push at every point'},
    {ko:'박자 안에 완성하면 두 배!',en:'Finish within the beats for double!'},
    {ko:'배운 걸 모두 써 봐요',en:'Use everything you learned'}];

  function handPath(i){
    var P=Math.PI;
    switch(i){
    case 0:return {p:cat(line([62,452],[184,452]),quad([184,452],[292,452],[298,318],40)),closed:false};
    case 1:return {p:param(function(t){return [180+100*Math.cos(t),334+100*Math.sin(t)]},P/2,P/2-2*P,160),closed:true};
    case 2:return {p:param(function(t){return [180+150*Math.sin(t)*Math.cos(t),334-160*Math.cos(t)]},P/2,P/2+2*P,240),closed:true};
    case 3:return {p:param(function(t){var s=Math.sin(t);return [180+8.4*16*s*s*s,322-8.4*(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))]},P,3*P,260),closed:true,
      flip:true};
    case 4:{var N=[66,330],T2=[302,400],T1=[302,260];
      return {p:cat(quad(N,[170,200],T2,60),line(T2,T1),quad(T1,[170,460],N,60)),closed:true,dots:[[97,312]]}}
    case 5:{var a=param(function(t){return [180+68*Math.cos(t),258+68*Math.sin(t)]},-.45,-1.5*P,60),
        b=param(function(t){return [180+68*Math.cos(t),394+68*Math.sin(t)]},-P/2,2.65,60);
      return {p:cat(a,b),closed:false,snow:[[236,410,30]]}}
    case 6:return {p:param(function(u){var r=128-98*u,t=-P/2+u*3.3*P;return [180+r*Math.cos(t),330+r*Math.sin(t)]},0,1,300),closed:false};
    case 7:return {p:param(function(t){var r=96+26*Math.cos(5*t);return [180+r*Math.cos(t),334+r*Math.sin(t)]},P/2,P/2+2*P,300),closed:true,ice:[[180,212,30]]};
    case 8:return {p:cat(line([180,150],[294,320]),line([294,320],[180,516]),line([180,516],[66,320]),line([66,320],[180,150])),closed:true,wind:[16,0]};
    case 9:{var st=[];for(var k=0;k<5;k++){var an=-P/2+k*4*P/5;st.push([180+132*Math.cos(an),346+132*Math.sin(an)])}
      return {p:cat(line(st[0],st[1]),line(st[1],st[2]),line(st[2],st[3]),line(st[3],st[4]),line(st[4],st[0])),closed:true}}
    case 10:return {p:param(function(t){return [180+134*Math.cos(t),334+190*Math.sin(t)*Math.cos(t)]},0,2*P,260),closed:true,ice:[[46,334,24]],beat:true};
    case 11:{var sp=param(function(u){var r=16+70*u,t=u*3.6*P;return [160+r*Math.cos(t),318+r*Math.sin(t)]},0,1,200),e=sp[sp.length-1];
      return {p:cat(sp,quad(e,[200,402],[282,402],20),quad([282,402],[318,400],[304,350],16),line([304,350],[286,318])),closed:false,
        dots:[[312,368]],snow:[[248,404,26]],wind:[0,-12]}}
    }}

  /* 절차 생성: 매끈한 닫힌 곡선, 글자, 다각형, 나선, 물결 */
  var GLYPH={
    U:{p:[[-1,-1],[-1,.25],'a',[1,.25],[1,-1]],ko:'U자',en:'Letter U'},
    V:{p:[[-1,-1],[0,1],[1,-1]],ko:'V자',en:'Letter V'},
    W:{p:[[-1,-1],[-.5,1],[0,-.3],[.5,1],[1,-1]],ko:'W자',en:'Letter W'},
    Z:{p:[[-1,-1],[1,-1],[-1,1],[1,1]],ko:'Z자',en:'Letter Z'},
    N:{p:[[-1,1],[-1,-1],[1,1],[1,-1]],ko:'N자',en:'Letter N'},
    M:{p:[[-1,1],[-1,-1],[0,.2],[1,-1],[1,1]],ko:'M자',en:'Letter M'},
    L:{p:[[-.8,-1],[-.8,1],[.9,1]],ko:'L자',en:'Letter L'},
    C:{arc:[.75,5.55],ko:'C자',en:'Letter C'},
    D:{p:[[-.8,-1],[-.8,1],'d'],closed:true,ko:'D자',en:'Letter D'}};
  function glyphPath(key,sx,sy){var gdef=GLYPH[key],out=[],i;
    if(gdef.arc)return param(function(t){return [Math.cos(t)*sx,Math.sin(t)*sy]},gdef.arc[0],gdef.arc[1],120);
    for(i=0;i<gdef.p.length;i++){var q=gdef.p[i];
      if(q==='a'){out=out.concat(param(function(t){return [Math.cos(t)*sx,.25*sy+Math.sin(t)*.75*sy]},Math.PI,0,50).slice(1,-1))}
      else if(q==='d'){out=out.concat(param(function(t){return [-.8*sx+Math.cos(t)*1.6*sx*.85,Math.sin(t)*sy]},Math.PI/2,-Math.PI/2,70).slice(1))}
      else{
        var prev=out[out.length-1];if(prev){var tx=q[0]*sx,ty=q[1]*sy,d=hyp(tx-prev[0],ty-prev[1]),m=Math.ceil(d/6);
          for(var j=1;j<=m;j++)out.push([prev[0]+(tx-prev[0])*j/m,prev[1]+(ty-prev[1])*j/m])}
        else out.push([q[0]*sx,q[1]*sy])}}
    return out}
  function xform(p,ang,cx,cy){var c=Math.cos(ang),s=Math.sin(ang);return p.map(function(q){return [cx+q[0]*c-q[1]*s,cy+q[0]*s+q[1]*c]})}
  function fits(p){for(var i=0;i<p.length;i++){if(pondSD(p[i][0],p[i][1])>-26||p[i][1]<118)return false}return true}
  function minRadius(p,closed){var m=1e9;for(var i=0;i<p.length;i++){var t=turnAt(p,i,3,closed);if(t>1e-4&&t<.9){var r=24/(2*Math.sin(t/2));if(r<m)m=r}}return m}

  function genPath(r){
    var P=Math.PI,type=Math.floor(r()*6),p,closed=true,name,tries=0,ang=(r()-.5)*.5;
    for(;;){tries++;
      if(type===0){var a2=r()*.22,a3=r()*.16,a4=r()*.08,f2=r()*6.3,f3=r()*6.3,f4=r()*6.3,R0=92+r()*24,ex=.9+r()*.3,ey=1+r()*.35;
        p=param(function(t){var rr=R0*(1+a2*Math.cos(2*t+f2)+a3*Math.cos(3*t+f3)+a4*Math.cos(4*t+f4));return [Math.cos(t)*rr*ex,Math.sin(t)*rr*ey]},0,2*P,240);
        p.pop();p=xform(p,ang,180,338);name={ko:'얼음 조약돌',en:'Ice Pebble'}}
      else if(type===1){var A=150+r()*40,B=140+r()*45;
        p=param(function(t){return [A*Math.sin(t)*Math.cos(t),B*Math.cos(t)]},0,2*P,240);p.pop();p=xform(p,ang+(r()<.5?0:P/2),180,338);name={ko:'8자 변주',en:'Eight Variation'}}
      else if(type===2){var keys=Object.keys(GLYPH),k=keys[Math.floor(r()*keys.length)],gd=GLYPH[k];
        p=glyphPath(k,96+r()*24,140+r()*30);closed=!!gd.closed;if(closed)p.pop();p=xform(p,ang*.6,180,338);name={ko:gd.ko,en:gd.en}}
      else if(type===3){var nS=3+Math.floor(r()*3),Rr=110+r()*25,rot=r()*6.3,v=[];
        for(var i=0;i<nS;i++){var an=rot+i*2*P/nS;v.push([180+Rr*Math.cos(an),338+Rr*Math.sin(an)])}
        p=[];for(i=0;i<nS;i++)p=cat(p,line(v[i],v[(i+1)%nS]));p.pop();
        name=[{ko:'세모',en:'Triangle'},{ko:'네모',en:'Square'},{ko:'오각형',en:'Pentagon'}][nS-3]}
      else if(type===4){var turns=1.3+r()*.8,r0=125+r()*10,r1=30+r()*14,dir=r()<.5?1:-1,t0=r()*6.3;
        p=param(function(u){var rr=r0+(r1-r0)*u,t=t0+dir*u*turns*2*P;return [180+rr*Math.cos(t),334+rr*Math.sin(t)]},0,1,300);closed=false;
        name={ko:'소용돌이',en:'Swirl'}}
      else{var per=1.2+r()*1.2,amp=55+r()*40,len=250;
        p=param(function(u){return [(u-.5)*len,Math.sin(u*per*2*P)*amp]},0,1,240);p=xform(p,ang+(r()<.5?0:P/2),180,338);closed=false;
        name={ko:'물결',en:'Wave'}}
      if(fits(p)&&minRadius(resample(p,closed),closed)>26)break;
      if(tries>12){type=(type+1)%6;tries=0;ang*=.5}}
    if(!closed&&r()<.5)p=p.slice().reverse();
    return {p:p,closed:closed,name:name}}

  function singlePass(path,closed,x,y,rad){ /* 경로가 원을 한 번만 지나가는지 */
    var n=path.length,ins=[],i,runs=0;for(i=0;i<n;i++)ins.push(hyp(path[i][0]-x,path[i][1]-y)<rad+26);
    for(i=0;i<n;i++){var prev=i>0?ins[i-1]:(closed?ins[n-1]:false);if(ins[i]&&!prev)runs++}
    if(closed&&ins.every(function(v){return v}))return false;
    return runs===1}

  function makeFig(n,seed){
    var d,name,r=rng((seed||1)*7919+n*104729+13),beat=false;
    if(n<12){d=handPath(n);name=NAMES[n];beat=!!d.beat}
    else{d=genPath(r);name=d.name;
      d.snow=[];d.ice=[];d.dots=[];
      var rp=resample(d.p,d.closed),k,tries;
      var ns=Math.floor(r()*3);for(k=0;k<ns;k++){var q=rp[Math.floor(r()*rp.length)];d.snow.push([q[0]+(r()-.5)*30,q[1]+(r()-.5)*30,24+r()*14])}
      var ni=Math.floor(r()*2.6);for(k=0;k<ni;k++)for(tries=0;tries<20;tries++){
        var qi=Math.floor(r()*rp.length),qq=rp[qi],rad=22+r()*10;
        if(qi<10)continue;
        var curvy=false;for(var cj=-15;cj<=15;cj++){var ci=qi+cj;if(d.closed)ci=(ci+rp.length)%rp.length;if(ci>=0&&ci<rp.length&&turnAt(rp,ci,3,d.closed)>.35)curvy=true}
        var nearSnow=d.snow.some(function(z){return hyp(z[0]-qq[0],z[1]-qq[1])<z[2]+rad+6});
        if(!curvy&&!nearSnow&&singlePass(rp,d.closed,qq[0],qq[1],rad)&&hyp(qq[0]-rp[0][0],qq[1]-rp[0][1])>rad+30){d.ice.push([qq[0],qq[1],rad]);break}}
      if(r()<.4){var wa=r()*6.3,wm=8+r()*10;d.wind=[Math.cos(wa)*wm,Math.sin(wa)*wm]}
      if(r()<.28){var di=10+Math.floor(r()*(rp.length-20)),a0=rp[di],a1=rp[Math.min(rp.length-1,di+2)],tx=a1[0]-a0[0],ty=a1[1]-a0[1],tl=hyp(tx,ty)||1,side=r()<.5?1:-1;
        d.dots.push([a0[0]-ty/tl*9*side,a0[1]+tx/tl*9*side])}
      beat=n%4===3}
    var path=resample(d.p,d.closed);if(d.flip)path.reverse();
    var len=path.length*STEP,cn=corners(path,d.closed),dots=d.dots||[];
    var par=Math.round(2.4+len/100+cn*1.1+dots.length*1.3);
    var sx=path[0][0],sy=path[0][1],sd=Math.atan2(path[2][1]-sy,path[2][0]-sx);
    var f={n:n,name:name,path:path,closed:d.closed,dots:dots,ice:(d.ice||[]).map(function(z){return {x:z[0],y:z[1],r:z[2]}}),
      snow:(d.snow||[]).map(function(z){return {x:z[0],y:z[1],r:z[2]}}),wind:d.wind||null,len:len,corners:cn,par:par,
      sx:sx,sy:sy,sd:sd,beat:beat?Math.ceil(par*2*1.1):0,tip:n<12?TIPS[n]:null};
    return f}

  /* ---------- 스케이터 ---------- */
  function newSkate(f){
    return {f:f,x:f.sx,y:f.sy,vx:0,vy:0,hd:f.sd,ix:0,iy:0,it:0,spin:0,spins:[],braking:false,pushing:false,lean:0,
      trail:[[f.sx,f.sy,0]],cov:new Float32Array(f.path.length).fill(99),ncov:0,tl:0,tnear:0,
      ice:f.ice.map(function(){return {n:0,inn:false}}),plop:false,t:0,ev:[],wt:0,
      lx:f.sx,ly:f.sy,acc:0}}
  function control(s,c){
    if(s.plop)return;
    if(c.spin&&s.spin<=0){s.spin=SPINT;s.it=0;s.spins.push([s.x,s.y]);s.ev.push({t:'spin',x:s.x,y:s.y})}
    if(c.push&&s.spin<=0){var px=c.push[0]*IMP,py=c.push[1]*IMP,m=hyp(px,py);if(m>IMPMAX){px*=IMPMAX/m;py*=IMPMAX/m}
      var tx=s.vx+px,ty=s.vy+py,tm=hyp(tx,ty);if(tm>VMAX){tx*=VMAX/tm;ty*=VMAX/tm}
      s.ix=tx;s.iy=ty;s.it=PUSHT;s.ev.push({t:'push',m:m})}}
  function inSnow(f,x,y){for(var i=0;i<f.snow.length;i++){var z=f.snow[i];if(hyp(x-z.x,y-z.y)<z.r)return true}return false}
  function distTarget(f,x,y){var p=f.path,m=1e9;for(var i=0;i<p.length;i++){var dx=p[i][0]-x,dy=p[i][1]-y,d=dx*dx+dy*dy;if(d<m)m=d}return Math.sqrt(m)}
  function addTrail(s,x,y,k){
    var f=s.f,l=s.trail[s.trail.length-1],ax=l[0],ay=l[1],len=hyp(x-ax,y-ay);
    s.trail.push([x,y,k]);
    var mx=(ax+x)/2,my=(ay+y)/2;s.tl+=len;s.tnear+=len*credit(distTarget(f,mx,my),TOLP0,TOLP);
    var p=f.path,dx=x-ax,dy=y-ay,L2=dx*dx+dy*dy,lim=len+TOLC+1;
    for(var i=0;i<p.length;i++){var px=p[i][0],py=p[i][1];if(s.cov[i]<=TOLC0)continue;
      if(Math.abs(px-mx)>lim||Math.abs(py-my)>lim)continue;
      var t=L2>0?((px-ax)*dx+(py-ay)*dy)/L2:0;t=t<0?0:t>1?1:t;
      var d=hyp(px-ax-dx*t,py-ay-dy*t);
      if(d<s.cov[i]){s.ncov+=credit(d,TOLC0,TOLC)-credit(s.cov[i],TOLC0,TOLC);s.cov[i]=d}}}
  function tick(s,c){
    if(s.plop)return;var f=s.f,h=HB;
    s.t+=h;s.braking=false;s.pushing=false;
    if(c&&c.thrust&&s.spin<=0){if(s.it<=0){s.ix=s.vx;s.iy=s.vy}
      s.ix+=c.thrust[0]*THRK*h;s.iy+=c.thrust[1]*THRK*h;var im=hyp(s.ix,s.iy);if(im>VMAX){s.ix*=VMAX/im;s.iy*=VMAX/im}s.it=Math.max(s.it,.3)}
    var sp=hyp(s.vx,s.vy),an=0;
    if(s.spin>0){s.spin-=h;var kk=Math.exp(-14*h);s.vx*=kk;s.vy*=kk;s.it=0}
    else if(c&&c.brake){var d=BRAKE*h;if(sp<=d){s.vx=0;s.vy=0}else{s.vx-=s.vx/sp*d;s.vy-=s.vy/sp*d}s.it=0;s.braking=sp>1}
    else if(s.it>0){s.it-=h;s.pushing=true;
      var dvx=s.ix-s.vx,dvy=s.iy-s.vy;
      if(sp<6){var m=hyp(dvx,dvy),a=ACC*h;if(m<=a){s.vx=s.ix;s.vy=s.iy;s.it=0}else{s.vx+=dvx/m*a;s.vy+=dvy/m*a}}
      else{var ux=s.vx/sp,uy=s.vy/sp,dt_=dvx*ux+dvy*uy,dn=-dvx*uy+dvy*ux,
          at=Math.max(-ACC*h,Math.min(ACC*h,dt_));an=Math.max(-GRIP*h,Math.min(GRIP*h,dn));
        s.vx+=ux*at-uy*an;s.vy+=uy*at+ux*an;if(Math.abs(dt_)<1.5&&Math.abs(dn)<1.5)s.it=0}}
    s.lean+=((an/h)/GRIP-s.lean)*Math.min(1,h*10);
    var fr=FRIC+(inSnow(f,s.x,s.y)?SNOWF:0),k=Math.exp(-fr*h);s.vx*=k;s.vy*=k;s.ix*=k;s.iy*=k;
    sp=hyp(s.vx,s.vy);if(sp>0){var dd=Math.min(sp,DEC*h);s.vx-=s.vx/sp*dd;s.vy-=s.vy/sp*dd}
    if(f.wind){s.wt+=h;var gst=.75+.25*Math.sin(s.wt*1.7);s.vx+=f.wind[0]*gst*h;s.vy+=f.wind[1]*gst*h;if(s.it>0){s.ix+=f.wind[0]*gst*h;s.iy+=f.wind[1]*gst*h}}
    s.x+=s.vx*h;s.y+=s.vy*h;
    var sd=pondSD(s.x,s.y)+SR;
    if(sd>0){var e=.5,gx=pondSD(s.x+.5,s.y)-pondSD(s.x-.5,s.y),gy=pondSD(s.x,s.y+.5)-pondSD(s.x,s.y-.5),gl=hyp(gx,gy)||1;gx/=gl;gy/=gl;
      s.x-=gx*sd;s.y-=gy*sd;var vn=s.vx*gx+s.vy*gy;if(vn>0){s.vx-=(1+e)*vn*gx;s.vy-=(1+e)*vn*gy;s.it=0;if(vn>40)s.ev.push({t:'bump',v:vn,x:s.x,y:s.y})}}
    sp=hyp(s.vx,s.vy);if(sp>8)s.hd=Math.atan2(s.vy,s.vx);
    for(var i=0;i<f.ice.length;i++){var z=f.ice[i],st=s.ice[i],inn=hyp(s.x-z.x,s.y-z.y)<z.r;
      if(inn&&!st.inn){st.n++;s.ev.push({t:st.n>=2?'plop':'crack',i:i});if(st.n>=2){s.plop=true;st.inn=inn;return}}
      st.inn=inn}
    if(hyp(s.x-s.lx,s.y-s.ly)>=TRS){addTrail(s,s.x,s.y,s.braking?1:0);s.lx=s.x;s.ly=s.y}}
  function advance(s,dt,c){s.acc+=dt;var n=0;while(s.acc>=HB&&n<10){tick(s,c);s.acc-=HB;n++;if(s.plop)break}if(n>=10)s.acc=0}
  function stars(cov,prec,miss){var st=0;if(cov>=.7&&prec>=.5)st=1;if(cov>=.82&&prec>=.66)st=2;if(cov>=.92&&prec>=.8)st=3;return Math.max(0,st-miss)}
  function score(s){var f=s.f,cov=s.ncov/f.path.length,prec=s.tl>0?s.tnear/s.tl:0,miss=0;
    f.dots.forEach(function(d){if(!s.spins.some(function(q){return hyp(q[0]-d[0],q[1]-d[1])<=DOTTOL}))miss++});
    return {cov:cov,prec:prec,miss:miss,stars:stars(cov,prec,miss)}}
  /* 미리보기: 밀기 후 궤적 예측 */
  function predict(s,push,secs){
    var c={f:s.f,x:s.x,y:s.y,vx:s.vx,vy:s.vy,hd:s.hd,ix:s.ix,iy:s.iy,it:s.it,spin:0,spins:[],lean:0,trail:[[s.x,s.y,0]],cov:null,
      ice:s.ice.map(function(z){return {n:0,inn:z.inn}}),plop:false,t:0,ev:[],wt:s.wt,lx:1e9,ly:1e9,acc:0},out=[];
    c.f={snow:s.f.snow,wind:s.f.wind,ice:[],path:[]};
    control(c,{push:push});
    for(var i=0;i<secs*120;i++){tick(c,null);if(i%8===0)out.push([c.x,c.y])}
    return out}

  /* ---------- 봇 (검증용): 경로를 따라 밀기를 계획하는 pure pursuit ---------- */
  function makeBot(f){return {i:0,prog:0,lastPush:-1,done:false,spun:[],braking:false}}
  function botControl(b,s){
    var f=s.f,p=f.path,n=p.length,c={},sp=hyp(s.vx,s.vy),j,best=1e9,bi=b.i;
    for(j=0;j<=14;j++){var q=b.i+j;if(!f.closed&&q>=n)break;q%=n;var d=hyp(p[q][0]-s.x,p[q][1]-s.y);if(d<best-.5){best=d;bi=b.i+j}}
    b.prog+=bi-b.i;b.i=bi%n;
    if((f.closed&&b.prog>=n-1)||(!f.closed&&b.i>=n-2)){b.done=true;c.brake=true;return c}
    /* 점(스핀) */
    for(j=0;j<f.dots.length;j++){if(b.spun[j])continue;var dd=hyp(s.x-f.dots[j][0],s.y-f.dots[j][1]);
      if(dd<DOTTOL-3&&s.spin<=0){var dn=hyp(s.x+s.vx*HB*4-f.dots[j][0],s.y+s.vy*HB*4-f.dots[j][1]);if(dn>=dd||dd<6){b.spun[j]=true;c.spin=true;return c}}}
    if(s.spin>0)return c;
    /* 앞으로 허용 속도 */
    var vAllow=180,Bd=BRAKE*.75;
    for(j=1;j<70;j++){var q2=b.i+j;if(!f.closed&&q2>=n-3){var vr0=20,dist0=j*STEP;vAllow=Math.min(vAllow,Math.sqrt(vr0*vr0+2*Bd*dist0));break}q2%=n;
      var t=turnAt(p,q2,3,f.closed),R=t>1e-3?24/(2*Math.sin(t/2)):1e4,vr=t>.9?18:Math.sqrt(GRIP*.72*R);
      for(var di=0;di<f.dots.length;di++)if(!b.spun[di]&&hyp(p[q2][0]-f.dots[di][0],p[q2][1]-f.dots[di][1])<12)vr=Math.min(vr,30);
      var dist=j*STEP,va=Math.sqrt(vr*vr+2*Bd*dist);if(va<vAllow)vAllow=va}
    if(sp>vAllow+12){c.brake=true;return c}
    var la=Math.round(Math.max(3,Math.min(9,(8+sp*.1)/STEP))),ti=b.i+la;if(!f.closed&&ti>=n)ti=n-1;ti%=n;
    var gx=p[ti][0],gy=p[ti][1];
    for(j=0;j<f.dots.length;j++)if(!b.spun[j]&&hyp(gx-f.dots[j][0],gy-f.dots[j][1])<16){gx=f.dots[j][0];gy=f.dots[j][1]}
    var tx=gx-s.x,ty=gy-s.y,tl=hyp(tx,ty)||1,vd=Math.max(25,Math.min(vAllow,b.vmax||150));
    var wx=tx/tl*vd,wy=ty/tl*vd,ix=wx-s.vx,iy=wy-s.vy;
    if(s.t-b.lastPush>=.16&&hyp(ix,iy)>14){b.lastPush=s.t;c.push=[ix/IMP,iy/IMP]}
    return c}
  /* 봇으로 한 도형을 끝까지 그린다 */
  function runBot(f,maxT){var s=newSkate(f),b=makeBot(f),t=0;
    while(t<maxT){var c=botControl(b,s);control(s,c);tick(s,c);t+=HB;if(s.plop)return {plop:true,t:t,sc:score(s)};
      if(b.done&&hyp(s.vx,s.vy)<2)break}
    return {t:t,sc:score(s),s:s}}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={makeFig:makeFig,newSkate:newSkate,control:control,tick:tick,advance:advance,score:score,stars:stars,runBot:runBot,
      makeBot:makeBot,botControl:botControl,predict:predict,addTrail:addTrail,resample:resample,pondSD:pondSD,
      C:{GRIP:GRIP,ACC:ACC,BRAKE:BRAKE,IMP:IMP,IMPMAX:IMPMAX,VMAX:VMAX,HB:HB,TOLC:TOLC,TOLP:TOLP,STEP:STEP,FRIC:FRIC}};
  if(typeof SG==='undefined')return;
  /* ================= 게임 ================= */
  var figN,fig,sk,mode,modeT,time,warned,tG=0,runSeed,res,lastFlash,stillT,usedT,beatT,beatN,shiver,joy,blink,sprayT,crowd,
      trailCv=null,tctx=null,drawn,press,pdown,lastTapT,lastTapX,lastTapY,kbOn,scarf,flakes,iceCv=null,tipT,figIntro,plopAt,flap,initAt=0,lastBump;
  var DONE={x:122,y:582,w:116,h:42};
  var keys={l:false,r:false,u:false,d:false,sh:false,spin:false,done:false},ptr={seqD:0,seqU:0,x0:0,y0:0,x:0,y:0,td:0,tu:0,down:false},hD=0,hU=0;
  if(!window.__skateTraceKeys){window.__skateTraceKeys=true;
    var kf=function(e,v){var c=e.code;
      if(c==='ArrowLeft')keys.l=v;else if(c==='ArrowRight')keys.r=v;else if(c==='ArrowUp')keys.u=v;else if(c==='ArrowDown')keys.d=v;
      else if(c==='ShiftLeft'||c==='ShiftRight')keys.sh=v;
      else if(c==='Space'){if(v&&!e.repeat&&performance.now()-initAt>150)keys.spin=true}
      else if(c==='KeyD'){if(v&&!e.repeat)keys.done=true}
      else return;
      if(v)kbOn=true}
    window.addEventListener('keydown',function(e){kf(e,true)});
    window.addEventListener('keyup',function(e){kf(e,false)});
    window.addEventListener('blur',function(){keys.l=keys.r=keys.u=keys.d=keys.sh=false});
    var cpos=function(e){var cv=document.querySelector('#stage canvas');if(!cv)return [0,0];var r=cv.getBoundingClientRect();return [(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H]};
    window.addEventListener('pointerdown',function(e){if(!e.target||e.target.tagName!=='CANVAS')return;var p=cpos(e);
      ptr.x0=ptr.x=p[0];ptr.y0=ptr.y=p[1];ptr.td=performance.now()/1000;ptr.down=true;ptr.seqD++},true);
    window.addEventListener('pointermove',function(e){if(!ptr.down)return;var p=cpos(e);ptr.x=p[0];ptr.y=p[1]},true);
    var up=function(e){if(!ptr.down)return;var p=cpos(e);if(e.type==='pointerup'){ptr.x=p[0];ptr.y=p[1]}ptr.tu=performance.now()/1000;ptr.down=false;ptr.seqU++};
    window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true)}
  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function L(o,a){return o[a.lang]||o.en}

  function clearTrail(){if(typeof document==='undefined')return;if(!trailCv){trailCv=document.createElement('canvas');trailCv.width=W;trailCv.height=H;tctx=trailCv.getContext('2d')}
    tctx.clearRect(0,0,W,H);drawn=1}
  function startFig(n){figN=n;fig=makeFig(n,runSeed);sk=newSkate(fig);mode='skate';modeT=0;stillT=0;usedT=0;beatT=0;beatN=0;res=null;
    tipT=0;figIntro=1.4;press=null;clearTrail();resetScarf()}
  function retry(){sk=newSkate(fig);mode='skate';modeT=0;stillT=0;press=null;clearTrail();resetScarf()}
  function resetScarf(){scarf=[];for(var i=0;i<7;i++)scarf.push([sk.x-Math.cos(sk.hd)*i*4,sk.y-14-Math.sin(sk.hd)*i*4])}

  function init(a){
    time=55;warned=99;runSeed=(Math.random()*1e9)>>>0;shiver=0;joy=0;blink=2;sprayT=0;crowd=0;lastTapT=-9;kbOn=false;flap=0;lastBump=0;
    keys.spin=false;keys.done=false;initAt=performance.now();pdown=true;hD=ptr.seqD;hU=ptr.seqU;press=null;
    flakes=[];for(var i=0;i<70;i++)flakes.push({x:hash(i+1)*W,y:hash(i+50)*H,s:.6+hash(i+90)*1.8,p:hash(i+130)*6.3});
    a.tempo(1);startFig(0)}

  function finish(a){
    var sc=score(sk);res=sc;mode='result';modeT=0;
    var cx=W/2,cy=300;
    if(sc.stars>=1){
      var parB=Math.max(0,Math.round((fig.par-usedT)*2)),pts=sc.stars*10+Math.round(sc.cov*10)+parB+(fig.dots.length?5:0),
        onBeat=fig.beat&&beatN<=fig.beat;
      if(onBeat)pts*=2;res.pts=pts;res.onBeat=onBeat;
      a.add(pts);time=Math.min(70,time+14);joy=2.2;crowd=2.4;a.sfx('win');
      ['#ffe27a','#ff9ec0','#8fd8ff','#b9f5a8','#ffffff'].forEach(function(c){a.burst(cx,cy,c,10)});
      a.pop(cx,cy-70,'+'+pts,'#ffe27a');if(onBeat)a.pop(cx,cy-96,a.lang==='ko'?'박자 맞춤 x2!':'On the beat x2!','#ff9ec0');
      a.tempo(1+Math.min(.4,(figN+1)*.025))}
    else{a.beep(330,.14,'triangle');a.beep(247,.24,'triangle');a.shake(3);a.pop(cx,cy-70,a.lang==='ko'?'다시!':'Again!','#cfe8ff')}}

  function update(dt,inp,a){
    var ko=a.lang==='ko',i,ctl={},sp;
    if(mode!=='result'){time-=dt;
      if(time<=0){time=0;a.over();return}
      if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(880,.05,'square')}}
    joy=Math.max(0,joy-dt);crowd=Math.max(0,crowd-dt);shiver=Math.max(0,shiver-dt);flap=Math.max(0,flap-dt*3);figIntro=Math.max(0,figIntro-dt);
    tipT+=dt;
    /* ---- 포인터 (원시 이벤트로 시작·끝 위치를 정확히 잡는다) ---- */
    var now=performance.now()/1000;
    if(ptr.seqD!==hD){hD=ptr.seqD;kbOn=false;var x0=ptr.x0,y0=ptr.y0;
      if(x0>DONE.x-6&&x0<DONE.x+DONE.w+6&&y0>DONE.y-6&&y0<DONE.y+DONE.h+6)press={done:true};
      else if(ptr.td-lastTapT<.34&&Math.hypot(x0-lastTapX,y0-lastTapY)<70){press={spin:true};ctl.spin=true;lastTapT=-9}
      else press={x0:x0,y0:y0,t0:ptr.td,moved:false,x:x0,y:y0}}
    if(press&&press.x0!=null){press.x=ptr.x;press.y=ptr.y;if(Math.hypot(ptr.x-press.x0,ptr.y-press.y0)>14)press.moved=true;
      if(ptr.down&&!press.moved&&now-press.t0>.2)ctl.brake=true}
    if(ptr.seqU===hD&&hU!==ptr.seqU){hU=ptr.seqU;
      if(press){if(press.done)ctl.done=true;
        else if(press.x0!=null){if(press.moved)ctl.push=[press.x-press.x0,press.y-press.y0];
          else if(ptr.tu-press.t0<.19){lastTapT=ptr.tu;lastTapX=press.x0;lastTapY=press.y0}}}
      press=null}
    pdown=inp.down;
    /* ---- 키보드 ---- */
    var tx=(keys.r?1:0)-(keys.l?1:0),ty=(keys.d?1:0)-(keys.u?1:0);
    if(tx||ty){var tl=Math.hypot(tx,ty);ctl.thrust=[tx/tl,ty/tl]}
    if(keys.sh)ctl.brake=true;
    if(keys.spin){ctl.spin=true;keys.spin=false}
    if(keys.done){ctl.done=true;keys.done=false}

    if(mode==='skate'){
      modeT+=dt;usedT+=dt;
      if(fig.beat){beatT+=dt;if(beatT>=.5){beatT-=.5;beatN++;if(beatN<=fig.beat)a.beep(beatN%4===1?1046:784,.04,'sine')}}
      control(sk,ctl);var once={brake:ctl.brake,thrust:ctl.thrust};advance(sk,dt,once);
      for(i=0;i<sk.ev.length;i++){var e=sk.ev[i];
        if(e.t==='push'){flap=1;a.beep(300+e.m*2,.08,'triangle');a.beep(520+e.m*2,.06,'sine')}
        else if(e.t==='spin'){a.beep(880,.08,'sine');a.beep(1175,.1,'sine');a.beep(1568,.16,'sine');drawSpin(e.x,e.y);
          var near=fig.dots.some(function(d){return Math.hypot(d[0]-e.x,d[1]-e.y)<=18});
          if(near){a.sfx('coin');a.burst(e.x,e.y-10,'#ffe27a',12);a.pop(e.x,e.y-28,ko?'스핀!':'Spin!','#ffe27a')}
          else a.burst(e.x,e.y-6,'#e6f6ff',6)}
        else if(e.t==='crack'){a.beep(1400,.03,'square');a.beep(700,.05,'square');a.shake(3);var z=fig.ice[e.i];a.pop(z.x,z.y-z.r-6,ko?'쩌적!':'Crack!','#bfe6ff')}
        else if(e.t==='plop'){mode='plop';modeT=0;plopAt=[sk.x,sk.y];a.beep(523,.08,'sine');a.beep(262,.3,'sine');a.beep(131,.4,'triangle');a.shake(6);
          a.burst(sk.x,sk.y,'#7cc0ff',16);a.burst(sk.x,sk.y,'#ffffff',8);a.pop(sk.x,sk.y-30,ko?'풍덩!':'Splash!','#9fd4ff')}
        else if(e.t==='bump'&&tG-lastBump>.2){lastBump=tG;a.beep(140,.08,'triangle');a.burst(e.x,e.y,'#ffffff',6)}}
      sk.ev.length=0;
      if(mode!=='skate')return;
      sp=Math.hypot(sk.vx,sk.vy);
      if(sk.braking&&sp>35){sprayT-=dt;if(sprayT<=0){sprayT=.05;a.burst(sk.x+Math.cos(sk.hd)*6,sk.y+Math.sin(sk.hd)*6,'rgba(235,248,255,.95)',3);a.beep(2400+Math.random()*1600,.02,'sawtooth')}}
      drawTrail();
      if(sp<4&&sk.tl>40&&sk.spin<=0&&!ctl.brake)stillT+=dt;else stillT=0;
      var live=score(sk);
      if(ctl.done){if(sk.tl>30)finish(a);else a.pop(sk.x,sk.y-40,ko?'먼저 그려요':'Skate first','#ffffff')}
      else if(stillT>1.6&&live.cov>=.7)finish(a)}
    else if(mode==='plop'){modeT+=dt;if(modeT>1.3){retry();shiver=2.2}}
    else if(mode==='result'){modeT+=dt;if(modeT>1.7){if(res.stars>=1)startFig(figN+1);else retry()}}
    /* 목도리 */
    var ax=sk.x,ay=sk.y-17,vx=sk.vx,vy=sk.vy,vl=Math.hypot(vx,vy),bx=vl>5?-vx/vl:0,by=vl>5?-vy/vl:.6;
    scarf[0]=[ax,ay];for(i=1;i<scarf.length;i++){var p=scarf[i],q=scarf[i-1],wv=Math.sin(tG*9+i)*.6;
      p[0]+=(q[0]+bx*4+(fig.wind?fig.wind[0]*.05:0)+wv*by-p[0])*Math.min(1,dt*14);p[1]+=(q[1]+by*4+.6+(fig.wind?fig.wind[1]*.05:0)-wv*bx-p[1])*Math.min(1,dt*14)}
    blink-=dt;if(blink<0)blink=2+Math.random()*3}

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function pondPath(g){rr(g,PCX-PHW,PCY-PHH,PHW*2,PHH*2,PRAD)}
  function drawTrail(){if(!tctx)return;var t=sk.trail,g=tctx;
    for(;drawn<t.length;drawn++){var a=t[drawn-1],b=t[drawn],br=b[2]===1;
      g.lineCap='round';
      g.strokeStyle='rgba(70,120,180,.35)';g.lineWidth=br?6:4.6;g.beginPath();g.moveTo(a[0],a[1]+1.2);g.lineTo(b[0],b[1]+1.2);g.stroke();
      g.strokeStyle=br?'rgba(255,255,255,.75)':'rgba(255,255,255,.96)';g.lineWidth=br?3.4:2.4;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();
      if(br){var dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1;
        for(var k=0;k<3;k++){var o=(hash(drawn*3+k)-.5)*12,u=hash(drawn*7+k);g.beginPath();g.moveTo(a[0]+dx*u+nx*o,a[1]+dy*u+ny*o);g.lineTo(a[0]+dx*u+nx*o*1.6+dx*.4,a[1]+dy*u+ny*o*1.6+dy*.4);g.stroke()}}
      if(hash(drawn*1.7)>.72){g.fillStyle=hash(drawn)>.5?'rgba(255,255,255,1)':'rgba(190,240,255,1)';g.fillRect(b[0]+(hash(drawn+3)-.5)*5,b[1]+(hash(drawn+5)-.5)*5,1.4,1.4)}}}
  function drawSpin(x,y){if(!tctx)return;var g=tctx;g.strokeStyle='rgba(70,120,180,.35)';g.lineWidth=4;g.beginPath();g.arc(x,y+1,9,0,7);g.stroke();
    g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=2;g.beginPath();g.arc(x,y,9,0,7);g.stroke();g.beginPath();g.arc(x,y,4.5,0,7);g.stroke()}
  function makeIce(){iceCv=document.createElement('canvas');iceCv.width=W;iceCv.height=H;var g=iceCv.getContext('2d'),i;
    g.save();pondPath(g);g.clip();
    var gr=g.createLinearGradient(0,PCY-PHH,0,PCY+PHH);gr.addColorStop(0,'#a9c9ea');gr.addColorStop(.35,'#c6def3');gr.addColorStop(1,'#93b7df');g.fillStyle=gr;g.fillRect(0,0,W,H);
    var rg=g.createRadialGradient(150,300,20,180,334,260);rg.addColorStop(0,'rgba(255,255,255,.35)');rg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=rg;g.fillRect(0,0,W,H);
    for(i=0;i<900;i++){g.fillStyle=hash(i)>.5?'rgba(255,255,255,.25)':'rgba(60,100,160,.06)';g.fillRect(12+hash(i+.3)*336,100+hash(i+.7)*466,1+hash(i+.1)*2,1)}
    g.lineCap='round';for(i=0;i<14;i++){var x=20+hash(i+300)*320,y=110+hash(i+340)*450,an=hash(i+380)*6.3;g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=.8;g.beginPath();g.moveTo(x,y);
      for(var k=0;k<6;k++){an+=(hash(i*9+k)-.5)*1.4;x+=Math.cos(an)*9;y+=Math.sin(an)*9;g.lineTo(x,y)}g.stroke()}
    for(i=0;i<5;i++){g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=18;g.beginPath();var sx=40+i*70;g.moveTo(sx,110);g.lineTo(sx-60,560);g.stroke()}
    var vg=g.createRadialGradient(180,334,150,180,334,330);vg.addColorStop(0,'rgba(30,60,120,0)');vg.addColorStop(1,'rgba(30,60,120,.32)');g.fillStyle=vg;g.fillRect(0,0,W,H);
    g.restore()}
  function star5(g,x,y,r,rot){g.beginPath();for(var i=0;i<10;i++){var an=rot+i*Math.PI/5-Math.PI/2,q=i%2?r*.45:r;if(i)g.lineTo(x+Math.cos(an)*q,y+Math.sin(an)*q);else g.moveTo(x+Math.cos(an)*q,y+Math.sin(an)*q)}g.closePath()}
  function pine(g,x,y,s,c1,c2){g.fillStyle=c1;for(var k=0;k<3;k++){var w=(16-k*4)*s,yy=y-k*9*s;g.beginPath();g.moveTo(x-w,yy);g.lineTo(x,yy-16*s);g.lineTo(x+w,yy);g.closePath();g.fill()}
    g.fillStyle=c2;for(k=0;k<3;k++){var w2=(16-k*4)*s,y2=y-k*9*s;g.beginPath();g.moveTo(x-w2*.55,y2-6*s);g.lineTo(x,y2-16*s);g.lineTo(x+w2*.55,y2-6*s);g.quadraticCurveTo(x,y2-9*s,x-w2*.55,y2-6*s);g.fill()}}
  var LIGHTC=['#ffd36e','#ff8fa3','#8fe3ff','#b6ff9e','#ffb36e'];
  function lightPos(i){var u=i/17,x=20+u*320,sag=Math.sin(u*Math.PI*3)*.5+.5;return [x,92+sag*9]}

  function drawPenguin(g,x,y,a){
    var s=sk,sp=Math.hypot(s.vx,s.vy),face=Math.cos(s.hd),lk=Math.max(-1,Math.min(1,face*1.4)),lkY=Math.sin(s.hd);
    var shiv=shiver>0?Math.sin(tG*70)*1.3:0,hop=joy>0?Math.abs(Math.sin(tG*10))*5:0,spinP=s.spin>0?(SPINT-s.spin)/SPINT*Math.PI*6:0;
    g.save();g.translate(x,y);
    g.fillStyle='rgba(20,40,90,.25)';g.beginPath();g.ellipse(2,1,12,4.5,0,0,7);g.fill();
    /* 반사 */
    g.globalAlpha=.16;g.fillStyle='#1d2a4a';g.beginPath();g.ellipse(0,9,8,7,0,0,7);g.fill();g.globalAlpha=1;
    g.translate(shiv,-hop);g.rotate(Math.max(-.4,Math.min(.4,s.lean*.35)));
    var sx=s.spin>0?Math.cos(spinP):1;g.scale(Math.abs(sx)<.25?.25*(sx<0?-1:1):sx,1);
    /* 날 */
    g.strokeStyle='#c9d6e6';g.lineWidth=1.6;g.beginPath();g.moveTo(-8,0);g.lineTo(-1,0);g.moveTo(2,0);g.lineTo(9,0);g.stroke();
    g.fillStyle='#ff9d3b';g.beginPath();g.ellipse(-4,-2,3.5,2,0,0,7);g.ellipse(5,-2,3.5,2,0,0,7);g.fill();
    /* 몸 */
    var bg=g.createLinearGradient(-12,-26,12,0);bg.addColorStop(0,'#3a4f7a');bg.addColorStop(1,'#1c2742');
    g.fillStyle=bg;g.beginPath();g.ellipse(0,-13,11.5,13.5,0,0,7);g.fill();
    g.fillStyle='#fffaf0';g.beginPath();g.ellipse(lk*2.2,-10.5,7.6,9.6,0,0,7);g.fill();
    g.fillStyle='rgba(180,200,230,.5)';g.beginPath();g.ellipse(lk*2.2+2,-6,5,4.5,0,0,7);g.fill();
    /* 날개 */
    var fl=flap>0?Math.sin(flap*Math.PI*3)*.9:0;g.fillStyle='#24345a';
    g.save();g.translate(-10,-15);g.rotate(.25+fl+(shiver>0?Math.sin(tG*40)*.2:0));g.beginPath();g.ellipse(0,5,3.4,8,0,0,7);g.fill();g.restore();
    g.save();g.translate(10,-15);g.rotate(-.25-fl-(shiver>0?Math.sin(tG*40)*.2:0));g.beginPath();g.ellipse(0,5,3.4,8,0,0,7);g.fill();g.restore();
    /* 목도리 위치(몸 앞) */
    g.fillStyle='#e8424f';g.beginPath();g.ellipse(0,-19,10,3.6,0,0,7);g.fill();g.fillStyle='#ffd1d5';g.fillRect(-6,-20.5,2,3);g.fillRect(1,-20.5,2,3);
    /* 머리 */
    g.fillStyle=bg;g.beginPath();g.arc(0,-27,9.5,0,7);g.fill();
    g.fillStyle='#fffaf0';g.beginPath();g.ellipse(lk*2.4-3.4,-27,4.2,4.8,0,0,7);g.ellipse(lk*2.4+3.4,-27,4.2,4.8,0,0,7);g.fill();
    var ex=lk*2.4,ey=-27;
    g.fillStyle='#1a1a2a';g.strokeStyle='#1a1a2a';g.lineWidth=1.6;
    if(joy>0){g.beginPath();g.arc(ex-3.4,ey+1,2.4,3.4,6.0);g.stroke();g.beginPath();g.arc(ex+3.4,ey+1,2.4,3.4,6.0);g.stroke()}
    else if(s.spin>0){g.beginPath();g.moveTo(ex-5.5,ey-2);g.lineTo(ex-1.5,ey+2);g.moveTo(ex-1.5,ey-2);g.lineTo(ex-5.5,ey+2);g.moveTo(ex+1.5,ey-2);g.lineTo(ex+5.5,ey+2);g.moveTo(ex+5.5,ey-2);g.lineTo(ex+1.5,ey+2);g.stroke()}
    else if(blink<.12){g.beginPath();g.moveTo(ex-5.5,ey);g.lineTo(ex-1.5,ey);g.moveTo(ex+1.5,ey);g.lineTo(ex+5.5,ey);g.stroke()}
    else{var big=s.braking||shiver>0?3.2:2.6,ox=lk*1.1,oy=lkY*.9;g.beginPath();g.arc(ex-3.4+ox,ey+oy,big,0,7);g.arc(ex+3.4+ox,ey+oy,big,0,7);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(ex-2.6+ox,ey-1+oy,1,0,7);g.arc(ex+4.2+ox,ey-1+oy,1,0,7);g.fill()}
    g.fillStyle='#ffa53b';g.beginPath();g.moveTo(ex-2.6,ey+4);g.lineTo(ex+2.6,ey+4);g.lineTo(ex+lk*3,ey+7.5+(sp>140?1:0));g.closePath();g.fill();
    g.fillStyle='rgba(255,120,140,.5)';g.beginPath();g.arc(ex-6.5,ey+4,1.8,0,7);g.arc(ex+6.5,ey+4,1.8,0,7);g.fill();
    if(shiver>0){g.fillStyle='rgba(140,200,255,.35)';g.beginPath();g.arc(0,-20,16,0,7);g.fill()}
    /* 모자 방울 */
    g.fillStyle='#e8424f';g.beginPath();g.arc(0,-35,6.5,Math.PI,0);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(0,-41.5,2.6,0,7);g.fill();g.fillRect(-7,-36,14,2.4);
    g.restore()}

  function drawScarf(g){if(!scarf)return;g.lineCap='round';g.lineJoin='round';
    g.strokeStyle='#b8303c';g.lineWidth=4.6;g.beginPath();for(var i=0;i<scarf.length;i++){if(i)g.lineTo(scarf[i][0],scarf[i][1]);else g.moveTo(scarf[i][0],scarf[i][1])}g.stroke();
    g.strokeStyle='#e8424f';g.lineWidth=3.2;g.stroke();
    var e=scarf[scarf.length-1];g.fillStyle='#ffd1d5';g.beginPath();g.arc(e[0],e[1],1.6,0,7);g.fill()}

  function drawAnimal(g,x,y,kind,ph){
    var clap=crowd>0,hop=clap?Math.abs(Math.sin(tG*9+ph))*5:Math.sin(tG*2+ph)*.6,cols=[['#ffffff','#f3c7d2'],['#a8764e','#e3c39d'],['#9b8a74','#e8dcc8'],['#f08a3e','#fff1e2'],['#9fb0c2','#e7eef6']][kind];
    g.save();g.translate(x,y-hop);
    g.fillStyle='rgba(40,60,110,.2)';g.beginPath();g.ellipse(0,hop+12,12,3.5,0,0,7);g.fill();
    g.fillStyle=cols[0];
    if(kind===0){g.beginPath();g.ellipse(-4,-18,3,9,-.15,0,7);g.ellipse(4,-18,3,9,.15,0,7);g.fill();g.fillStyle=cols[1];g.beginPath();g.ellipse(-4,-18,1.4,6,-.15,0,7);g.ellipse(4,-18,1.4,6,.15,0,7);g.fill();g.fillStyle=cols[0]}
    else if(kind===1){g.beginPath();g.arc(-7,-12,4,0,7);g.arc(7,-12,4,0,7);g.fill()}
    else if(kind===2){g.beginPath();g.moveTo(-9,-10);g.lineTo(-7,-17);g.lineTo(-3,-12);g.moveTo(9,-10);g.lineTo(7,-17);g.lineTo(3,-12);g.fill()}
    else if(kind===3){g.beginPath();g.moveTo(-9,-8);g.lineTo(-8,-18);g.lineTo(-2,-11);g.moveTo(9,-8);g.lineTo(8,-18);g.lineTo(2,-11);g.fill()}
    g.beginPath();g.ellipse(0,4,10,9,0,0,7);g.fill();g.beginPath();g.arc(0,-6,9,0,7);g.fill();
    g.fillStyle=cols[1];g.beginPath();g.ellipse(0,6,6,5.5,0,0,7);g.fill();if(kind!==0){g.beginPath();g.ellipse(0,-3,4.5,3.4,0,0,7);g.fill()}
    var bl=(Math.sin(tG*.9+ph*3)>.985);g.fillStyle='#222';g.strokeStyle='#222';g.lineWidth=1.4;
    if(clap){g.beginPath();g.arc(-3.5,-7,1.8,3.4,6);g.stroke();g.beginPath();g.arc(3.5,-7,1.8,3.4,6);g.stroke()}
    else if(bl){g.beginPath();g.moveTo(-5,-7);g.lineTo(-2,-7);g.moveTo(2,-7);g.lineTo(5,-7);g.stroke()}
    else{g.beginPath();g.arc(-3.5,-7,kind===2?2.4:1.6,0,7);g.arc(3.5,-7,kind===2?2.4:1.6,0,7);g.fill()}
    g.fillStyle=kind===2?'#f0b13a':'#333';g.beginPath();g.arc(0,-3.6,1.3,0,7);g.fill();
    var pa=clap?Math.abs(Math.sin(tG*16+ph))*5:5;g.fillStyle=cols[0];g.strokeStyle='rgba(0,0,0,.15)';
    g.beginPath();g.ellipse(-pa-1,3,2.8,3.6,0,0,7);g.ellipse(pa+1,3,2.8,3.6,0,0,7);g.fill();g.stroke();
    g.restore()}

  function draw(g,a,dt){
    dt=dt||0;tG+=dt;var ko=a.lang==='ko',i,t=tG,p;
    if(!iceCv)makeIce();if(!trailCv)clearTrail();
    var camx=sk?(sk.x-180):0;
    /* 하늘 */
    var gr=g.createLinearGradient(0,0,0,120);gr.addColorStop(0,'#1b1f4b');gr.addColorStop(.6,'#4a3f7d');gr.addColorStop(1,'#c58aa8');g.fillStyle=gr;g.fillRect(-20,-20,W+40,140);
    for(i=0;i<24;i++){g.fillStyle='rgba(255,255,240,'+(.3+.5*Math.abs(Math.sin(t*.8+i*1.7)))+')';g.fillRect(hash(i+600)*W,hash(i+640)*70,1.4,1.4)}
    g.fillStyle='rgba(255,246,220,.9)';g.beginPath();g.arc(60-camx*.02,52,11,0,7);g.fill();g.fillStyle='rgba(255,246,220,.15)';g.beginPath();g.arc(60-camx*.02,52,20,0,7);g.fill();
    /* 먼 숲 */
    for(i=0;i<16;i++){var px=((i*29+hash(i)*14-camx*.05+t*1.5)%(W+60)+W+60)%(W+60)-30;pine(g,px,98,.75+hash(i+20)*.3,'#3c4a78','rgba(225,232,255,.55)')}
    /* 오두막 */
    var cx=286-camx*.08;g.fillStyle='#5a3a35';g.fillRect(cx-22,70,44,28);g.fillStyle='#e9eefc';g.beginPath();g.moveTo(cx-28,72);g.lineTo(cx,52);g.lineTo(cx+28,72);g.closePath();g.fill();
    var fl=.85+.15*Math.sin(t*7)*Math.sin(t*3.1);g.fillStyle='rgba(255,190,90,'+(.28*fl)+')';g.beginPath();g.arc(cx-6,84,22,0,7);g.fill();
    g.fillStyle='rgb(255,'+Math.round(196*fl)+',96)';g.fillRect(cx-13,78,13,11);g.fillStyle='#5a3a35';g.fillRect(cx-7.5,78,1.5,11);g.fillRect(cx-13,83,13,1.4);
    g.fillStyle='rgba(230,230,240,.35)';for(i=0;i<4;i++){var sm=(t*.5+i*.25)%1;g.beginPath();g.arc(cx+14+Math.sin(sm*6+i)*4,62-sm*30,3+sm*5,0,7);g.fill()}
    g.fillStyle='#4a2f2a';g.fillRect(cx+11,56,6,12);
    /* 가까운 숲 */
    for(i=0;i<9;i++){var nx=((i*47+hash(i+70)*20-camx*.12)%(W+80)+W+80)%(W+80)-40;if(Math.abs(nx-cx)<34)continue;pine(g,nx,104,1+hash(i+80)*.3,'#24305a','rgba(240,246,255,.9)')}
    /* 눈밭 */
    var sg=g.createLinearGradient(0,96,0,H);sg.addColorStop(0,'#eef4ff');sg.addColorStop(1,'#d6e2f6');g.fillStyle=sg;g.fillRect(-20,96,W+40,H);
    /* 연못 */
    g.save();g.fillStyle='rgba(60,90,150,.25)';g.translate(0,3);pondPath(g);g.fill();g.restore();
    g.drawImage(iceCv,0,0);
    g.save();pondPath(g);g.clip();
    for(i=0;i<18;i++){p=lightPos(i);var tw=.5+.5*Math.sin(t*2.3+i*1.9),ry=p[1]+40+Math.sin(t*1.3+i)*3,rgd=g.createRadialGradient(p[0],ry,0,p[0],ry,22);
      rgd.addColorStop(0,LIGHTC[i%5]);rgd.addColorStop(1,'rgba(255,255,255,0)');g.globalAlpha=.16+.14*tw;g.fillStyle=rgd;g.fillRect(p[0]-22,ry-30,44,60)}
    g.globalAlpha=1;
    if(fig){
      /* 눈 더미 */
      fig.snow.forEach(function(z,k){for(var j=0;j<7;j++){var an=j*.9+k,rx=z.x+Math.cos(an)*z.r*.45,ry2=z.y+Math.sin(an)*z.r*.4;
          g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(rx,ry2,z.r*.55,0,7);g.fill()}
        g.fillStyle='rgba(200,215,240,.6)';g.beginPath();g.ellipse(z.x+3,z.y+z.r*.45,z.r*.8,z.r*.25,0,0,7);g.fill();
        g.fillStyle='rgba(255,255,255,.95)';g.beginPath();g.arc(z.x-z.r*.2,z.y-z.r*.15,z.r*.45,0,7);g.fill()});
      /* 얇은 얼음 */
      fig.ice.forEach(function(z,k){var n=sk.ice[k].n,warn=n>=1;
        var ig=g.createRadialGradient(z.x,z.y,2,z.x,z.y,z.r);ig.addColorStop(0,warn?'rgba(40,80,140,.55)':'rgba(60,110,170,.35)');ig.addColorStop(1,'rgba(90,140,200,.08)');
        g.fillStyle=ig;g.beginPath();g.arc(z.x,z.y,z.r,0,7);g.fill();
        g.strokeStyle=warn?'rgba(255,255,255,.95)':'rgba(255,255,255,.6)';g.lineWidth=warn?1.4:1;
        for(var j=0;j<(warn?9:5);j++){var an=j*2.4+k,x0=z.x,y0=z.y;g.beginPath();g.moveTo(x0,y0);for(var m=1;m<5;m++){an+=(hash(j*5+m+k*31)-.5)*.9;x0+=Math.cos(an)*z.r*.24;y0+=Math.sin(an)*z.r*.24;g.lineTo(x0,y0)}g.stroke()}
        g.setLineDash([4,4]);g.strokeStyle=warn?'rgba(255,120,140,'+(.6+.4*Math.sin(t*8))+')':'rgba(255,255,255,.55)';g.lineWidth=1.5;g.beginPath();g.arc(z.x,z.y,z.r,0,7);g.stroke();g.setLineDash([])});
      /* 바람 */
      if(fig.wind){var wl=Math.hypot(fig.wind[0],fig.wind[1]),wx=fig.wind[0]/wl,wy=fig.wind[1]/wl;g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=2;g.lineCap='round';
        for(i=0;i<18;i++){var ph=(hash(i+700)+t*.45)%1,bx=40+hash(i+710)*280,by=130+hash(i+720)*410,ox=wx*(ph-.5)*260,oy=wy*(ph-.5)*260;
          g.globalAlpha=Math.sin(ph*Math.PI)*.85;g.beginPath();g.moveTo(bx+ox,by+oy);g.quadraticCurveTo(bx+ox+wx*10-wy*4,by+oy+wy*10+wx*4,bx+ox+wx*22,by+oy+wy*22);g.stroke()}
        g.globalAlpha=1}
      if(fig.wind){g.save();g.translate(40,124);g.fillStyle='rgba(16,22,58,.45)';g.beginPath();g.arc(0,0,13,0,7);g.fill();g.rotate(Math.atan2(fig.wind[1],fig.wind[0]));
        g.strokeStyle='#fff';g.lineWidth=2.4;g.beginPath();g.moveTo(-7,0);g.lineTo(6,0);g.moveTo(2,-4);g.lineTo(7,0);g.lineTo(2,4);g.stroke();g.restore()}
      /* 목표 도형 */
      var P=fig.path,n=P.length,cov=sk.cov,pulse=.5+.5*Math.sin(t*3);
      g.lineCap='round';g.lineJoin='round';
      g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=12;g.beginPath();for(i=0;i<n;i++){if(i)g.lineTo(P[i][0],P[i][1]);else g.moveTo(P[i][0],P[i][1])}if(fig.closed)g.closePath();g.stroke();
      g.strokeStyle='rgba(40,80,150,.38)';g.lineWidth=2;g.setLineDash([5,6]);g.lineDashOffset=-t*8;g.stroke();g.setLineDash([]);
      g.fillStyle='rgba(255,214,90,.9)';for(i=0;i<n;i++){if(cov[i]<=10){g.beginPath();g.arc(P[i][0],P[i][1],cov[i]<=7?2.3:1.5,0,7);g.fill()}}
      fig.dots.forEach(function(d){var ok=sk.spins.some(function(q){return Math.hypot(q[0]-d[0],q[1]-d[1])<=18});
        g.strokeStyle=ok?'rgba(255,214,90,.95)':'rgba(40,80,150,.6)';g.lineWidth=2;g.beginPath();g.arc(d[0],d[1],7+(ok?0:pulse*2),0,7);g.stroke();
        g.fillStyle=ok?'rgba(255,214,90,.95)':'rgba(40,80,150,.5)';g.beginPath();g.arc(d[0],d[1],2.6,0,7);g.fill()});
      /* 시작·끝 표시 */
      var s0=P[0],s1=P[Math.min(6,n-1)],an0=Math.atan2(s1[1]-s0[1],s1[0]-s0[0]);
      g.save();g.translate(s0[0],s0[1]);g.rotate(an0);g.fillStyle='rgba(80,200,140,.85)';g.beginPath();g.moveTo(26,0);g.lineTo(16,-6);g.lineTo(16,6);g.closePath();g.fill();g.restore();
      if(!fig.closed){var e0=P[n-1];g.fillStyle='rgba(255,120,140,.8)';g.beginPath();g.arc(e0[0],e0[1],5,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=1.5;g.stroke()}
      /* 새긴 자국 */
      g.drawImage(trailCv,0,0);
      /* 첫 판 안내 화살표 */
      if(figN===0&&sk.tl<20&&mode==='skate'){var al=.5+.5*Math.sin(t*5),hx=sk.x+Math.cos(an0)*30,hy=sk.y+Math.sin(an0)*30;
        g.strokeStyle='rgba(255,255,255,'+(.4+.5*al)+')';g.lineWidth=3;g.setLineDash([6,5]);g.beginPath();g.moveTo(sk.x+Math.cos(an0)*14,sk.y+Math.sin(an0)*14);g.lineTo(hx+Math.cos(an0)*30*al,hy);g.stroke();g.setLineDash([]);
        g.fillStyle='rgba(255,255,255,'+(.5+.5*al)+')';g.beginPath();g.arc(hx+30*al,hy-14,6,0,7);g.fill()}
      /* 밀기 미리보기 */
      if(press&&press.x0!=null&&press.moved&&mode==='skate'){var dx=press.x-press.x0,dy=press.y-press.y0,dl=Math.hypot(dx,dy),cap=Math.min(dl,IMPMAX/IMP)/dl;
        var pr=predict(sk,[dx*cap,dy*cap],1.3);g.fillStyle='rgba(255,255,255,.75)';for(i=1;i<pr.length;i++){g.globalAlpha=1-i/pr.length;g.beginPath();g.arc(pr[i][0],pr[i][1],2.2,0,7);g.fill()}g.globalAlpha=1;
        var ex2=sk.x+dx*cap*.7,ey2=sk.y+dy*cap*.7,aa=Math.atan2(dy,dx);g.strokeStyle='rgba(255,140,90,.95)';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(sk.x,sk.y-6);g.lineTo(ex2,ey2-6);g.stroke();
        g.fillStyle='rgba(255,140,90,.95)';g.beginPath();g.moveTo(ex2+Math.cos(aa)*9,ey2-6+Math.sin(aa)*9);g.lineTo(ex2+Math.cos(aa+2.4)*8,ey2-6+Math.sin(aa+2.4)*8);g.lineTo(ex2+Math.cos(aa-2.4)*8,ey2-6+Math.sin(aa-2.4)*8);g.closePath();g.fill()}
      /* 풍덩 */
      if(mode==='plop'){var k2=modeT;g.fillStyle='rgba(20,50,100,.85)';g.beginPath();g.ellipse(plopAt[0],plopAt[1],16,8,0,0,7);g.fill();
        g.strokeStyle='rgba(200,235,255,.8)';g.lineWidth=1.5;for(i=0;i<3;i++){var rr2=10+((k2*30+i*10)%30);g.globalAlpha=1-((k2*30+i*10)%30)/30;g.beginPath();g.ellipse(plopAt[0],plopAt[1],rr2,rr2*.5,0,0,7);g.stroke()}g.globalAlpha=1}
    }
    g.restore();
    /* 연못 테두리 */
    g.save();g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=7;pondPath(g);g.stroke();g.strokeStyle='rgba(120,150,200,.35)';g.lineWidth=1.5;g.stroke();g.restore();
    /* 꼬마전구 */
    g.strokeStyle='#2c2f4a';g.lineWidth=1.2;g.beginPath();for(i=0;i<18;i++){p=lightPos(i);if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])}g.stroke();
    for(i=0;i<18;i++){p=lightPos(i);var tw2=.6+.4*Math.sin(t*2.3+i*1.9);g.globalAlpha=.35*tw2;g.fillStyle=LIGHTC[i%5];g.beginPath();g.arc(p[0],p[1]+3,7,0,7);g.fill();g.globalAlpha=1;g.beginPath();g.arc(p[0],p[1]+3,2.6,0,7);g.fill()}
    /* 펭귄 */
    if(sk&&!(mode==='plop')){drawScarf(g);drawPenguin(g,sk.x,sk.y,a)}
    else if(sk&&mode==='plop'&&modeT<.35){g.save();g.globalAlpha=1-modeT/.35;drawPenguin(g,plopAt[0],plopAt[1]+modeT*30,a);g.restore()}
    /* 관객 */
    var kinds=[[30,604,0],[64,600,1],[98,606,2],[262,604,3],[294,600,4]];kinds.forEach(function(q,k){drawAnimal(g,q[0],q[1],q[2],k*1.3)});
    /* 완성 버튼 */
    var on=sk&&sk.tl>30&&mode==='skate',ready=on&&score(sk).stars>=1,bp=press&&press.done?2:0;
    g.fillStyle='rgba(40,70,130,.25)';rr(g,DONE.x,DONE.y+4,DONE.w,DONE.h,14);g.fill();
    var bgr=g.createLinearGradient(0,DONE.y,0,DONE.y+DONE.h);bgr.addColorStop(0,ready?'#ffd76e':on?'#8fc8ff':'#c4d3ea');bgr.addColorStop(1,ready?'#f0a93a':on?'#4b8fe0':'#a3b4cf');
    g.fillStyle=bgr;rr(g,DONE.x,DONE.y+bp,DONE.w,DONE.h,14);g.fill();g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=2;g.stroke();
    g.fillStyle='#fff';g.font='20px Jua, system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.fillText((ko?'완성!':'Done!')+(kbOn?' (D)':''),DONE.x+DONE.w/2,DONE.y+DONE.h/2+bp+1);
    if(ready){star5(g,DONE.x+14,DONE.y+DONE.h/2+bp,6,t);g.fill()}
    /* 눈송이 */
    for(i=0;i<flakes.length;i++){p=flakes[i];p.y+=dt*(14+p.s*12);p.x+=dt*(Math.sin(t+p.p)*6+(fig&&fig.wind?fig.wind[0]*1.2:0));if(p.y>H+4){p.y=-4;p.x=Math.random()*W}if(p.x>W+4)p.x=-4;if(p.x<-4)p.x=W+4;
      g.fillStyle='rgba(255,255,255,'+(.45+p.s*.25)+')';g.beginPath();g.arc(p.x,p.y,p.s,0,7);g.fill()}
    if(!fig)return;
    /* 상단 정보 */
    var live=score(sk);
    g.fillStyle='rgba(16,22,58,.55)';rr(g,8,34,286,54,12);g.fill();
    g.fillStyle='#fff';g.textAlign='left';g.textBaseline='alphabetic';g.font='16px Jua, system-ui, sans-serif';
    g.fillText((figN+1)+' · '+L(fig.name,a),16,53);
    g.font='12px Jua, system-ui, sans-serif';g.textAlign='right';g.fillStyle='rgba(220,230,255,.85)';
    g.fillText((ko?'목표 ':'Par ')+fig.par+(ko?'초':'s'),286,81);
    for(i=0;i<3;i++){g.fillStyle=live.stars>i?'#ffd65a':'rgba(255,255,255,.25)';star5(g,246+i*17,47,7.5,0);g.fill()}
    function bar(y,v,th,lab,col){g.textAlign='left';g.fillStyle='rgba(220,230,255,.9)';g.font='11px Jua, system-ui, sans-serif';g.fillText(lab,16,y+7);
      g.fillStyle='rgba(255,255,255,.15)';rr(g,62,y,130,8,4);g.fill();g.fillStyle=col;rr(g,62,y,Math.max(8,130*Math.min(1,v)),8,4);g.fill();
      g.fillStyle='rgba(255,255,255,.9)';g.fillRect(62+130*th-1,y-2,2,12);g.fillStyle='#fff';g.fillText(Math.round(v*100)+'%',198,y+7)}
    bar(61,live.cov,.7,ko?'덮기':'Cover','#ffd65a');bar(75,live.prec,.5,ko?'정확':'Neat','#8fe3ff');
    /* 타이머 */
    var tc=time<10?'#ff8a8a':'#ffffff';g.fillStyle='rgba(16,22,58,.55)';g.beginPath();g.arc(324,60,24,0,7);g.fill();
    g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=4;g.beginPath();g.arc(324,60,20,0,7);g.stroke();
    g.strokeStyle=tc;g.beginPath();g.arc(324,60,20,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,time/70));g.stroke();
    g.fillStyle=tc;g.textAlign='center';g.textBaseline='middle';g.font='18px Jua, system-ui, sans-serif';g.fillText(Math.ceil(time),324,61);
    /* 실시간 별 */
    /* 박자 */
    if(fig.beat&&mode!=='result'){var left=Math.max(0,fig.beat-beatN);g.fillStyle='rgba(16,22,58,.55)';rr(g,98,106,164,22,11);g.fill();
      g.fillStyle=left>0?'#ff9ec0':'rgba(255,255,255,.5)';g.font='13px Jua, system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';
      g.fillText((ko?'박자 ':'Beats ')+left+(left>0?(beatT<.12?' ♪':'  '):''),180,117)}
    /* 안내 */
    if(fig.tip&&mode==='skate'&&(tipT<7||figN===0)){var tip=kbOn&&fig.tip.kko?(ko?fig.tip.kko:fig.tip.ken):L(fig.tip,a);
      g.font='15px Jua, system-ui, sans-serif';var tw3=g.measureText(tip).width+24;g.fillStyle='rgba(16,22,58,.5)';rr(g,180-tw3/2,532,tw3,26,13);g.fill();
      g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(tip,180,545.5)}
    if(figIntro>0&&mode==='skate'){var ia=Math.min(1,figIntro*2);g.globalAlpha=ia;g.font='30px Jua, system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';
      g.fillStyle='rgba(30,50,110,.35)';g.fillText(L(fig.name,a),182,152);g.fillStyle='#fff';g.fillText(L(fig.name,a),180,150);g.globalAlpha=1}
    /* 결과 */
    if(mode==='result'&&res){var k3=Math.min(1,modeT*4);g.fillStyle='rgba(16,22,58,'+(.5*k3)+')';rr(g,70,112,220,106,18);g.fill();
      for(i=0;i<3;i++){var appear=Math.max(0,Math.min(1,(modeT-.15-i*.18)*5)),sc2=appear<1?appear*1.3:1,got=res.stars>i;
        g.save();g.translate(140+i*40,142);g.scale(sc2,sc2);g.fillStyle=got?'#ffd65a':'rgba(255,255,255,.2)';star5(g,0,0,16,0);g.fill();if(got){g.strokeStyle='#fff3c2';g.lineWidth=2;g.stroke()}g.restore();
        if(got&&appear>0&&appear<.3&&!res['s'+i]){res['s'+i]=1;a.beep(880+i*220,.12,'triangle')}}
      g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='15px Jua, system-ui, sans-serif';
      g.fillText((ko?'덮기 ':'Cover ')+Math.round(res.cov*100)+'%  ·  '+(ko?'정확 ':'Neat ')+Math.round(res.prec*100)+'%',180,176);
      g.font='17px Jua, system-ui, sans-serif';
      var msg=res.stars>=1?(res.stars===3?(ko?'완벽한 연기!':'Flawless!'):res.stars===2?(ko?'멋져요!':'Lovely!'):(ko?'통과!':'Cleared!')):
        res.miss&&res.cov>=.7?(ko?'눈 자리에서 스핀을!':'Spin on the dot!'):(ko?'70% 이상 덮어야 해요':'Cover at least 70%');
      g.fillStyle=res.stars>=1?'#ffe27a':'#cfe8ff';g.fillText(msg,180,201)}
  }

  SG.run({id:'skate-trace',title:{ko:'얼음 위 그림',en:'Skate Trace'},
    how:{ko:'스와이프로 펭귄을 밀어 미끄러지며 얼음에 그림을 새겨요. 꾹 누르면 브레이크, 두 번 탭하면 스핀!',
         en:'Swipe to push the penguin and carve the figure as it glides. Hold to brake, double-tap to spin!'},
    init:init,update:update,draw:draw});
  window.__skate=function(){return {x:sk.x,y:sk.y,vx:sk.vx,vy:sk.vy,spin:sk.spin,t:sk.t,figN:figN,mode:mode,time:time,tl:sk.tl,trail:sk.trail.length,res:res}};
})();
