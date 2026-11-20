/* 말랑 디저트 탑 (Jelly Tower) — 말랑말랑한 소프트바디 디저트를 숟가락에서 떨어뜨려 목표 높이까지 쌓는다.
   물리(점 질량 + 모양 맞춤 + 압력 + 변 제약 + 몸체 간 충돌)는 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,HZ=240,DT=1/HZ,DT2=DT*DT,G=900,Y0=540,TABLE_Y=590,PW=184,PT=10,PCX=180,SPAWN_Y=128,ITER=3,SK=1.6,GAP=48,SLOWK=2.5,DRAG=900/(480*480);

  /* ---------- 디저트 종류: 말랑함(shape), 무게(mass), 마찰(fric) ---------- */
  var TYPES={
    pud:{rest:.1,kd:.08,kc:.25,ko:'푸딩',en:'Pudding',pts:[[-28,22],[28,22],[25,-22],[-25,-22]],n:24,ch:2,cf:8,
      shape:0.12,aff:0.75,edge:.25,press:.9,damp:.9995,fric:.6,mass:1,col:['#fff0a8','#f7c64e','#c98a1c'],pitch:330},
    jel:{rest:.6,kd:.012,kc:.04,ko:'젤리',en:'Jello',pts:[[-23,23],[23,23],[23,-23],[-23,-23]],n:24,ch:2,cf:9,
      shape:0.14,aff:0.7,edge:.35,press:1,damp:.9998,fric:.06,mass:.9,col:['#ff9fb4','#f2506e','#a8183c'],pitch:520,glassy:1},
    moc:{rest:0,kd:.1,kc:.35,ko:'모찌',en:'Mochi',pts:[[-28,16],[28,16],[26,2],[17,-12],[0,-16],[-17,-12],[-26,2]],n:22,ch:2,cf:7,
      shape:0.09,aff:0.8,edge:.2,press:.9,damp:.9995,fric:1,mass:.8,col:['#ffffff','#ffd9e4','#d98aa6'],pitch:250,sticky:1},
    pan:{rest:.2,kd:.06,kc:.2,ko:'판나코타',en:'Panna cotta',pts:[[-24,27],[24,27],[19,-18],[13,-26],[-13,-26],[-19,-18]],n:24,ch:2,cf:7,
      shape:0.12,aff:0.7,edge:.3,press:.95,damp:.9995,fric:.45,mass:1,col:['#ffffff','#f6efe2','#c9b48e'],pitch:400},
    gum:{rest:.3,kd:.04,kc:.15,ko:'곰젤리',en:'Gummy bear',pts:[[-14,18],[14,18],[15,-8],[10,-17],[-10,-17],[-15,-8]],n:16,ch:2,cf:6,
      shape:0.25,aff:0.5,edge:.5,press:1,damp:.9995,fric:.9,mass:.45,col:['#ffd27a','#ff9a2e','#c45f00'],pitch:640,glassy:1},
    cak:{rest:.1,kd:.08,kc:.25,ko:'케이크',en:'Cake',pts:[[-33,20],[33,20],[33,-20],[-33,-20]],n:26,ch:2,cf:4,
      shape:0.35,aff:0.3,edge:.8,press:1,damp:.9995,fric:.55,mass:2.4,col:['#fff4dc','#f2d39a','#b98a4e'],pitch:180}
  };
  var KEYS=['pud','jel','moc','pan','gum','cak'];

  /* 꼭짓점 → 차이킨 곡선 → 둘레 균등 재표본 */
  function outline(c,n,ch,r){var p=[],i,k,m=c.length;
    for(i=0;i<m;i++){var P=c[i],A=c[(i+m-1)%m],B=c[(i+1)%m],la=Math.hypot(A[0]-P[0],A[1]-P[1]),lb=Math.hypot(B[0]-P[0],B[1]-P[1]),
        ra=Math.min(r,la/2.2),rb=Math.min(r,lb/2.2),a0=[P[0]+(A[0]-P[0])/la*ra,P[1]+(A[1]-P[1])/la*ra],b0=[P[0]+(B[0]-P[0])/lb*rb,P[1]+(B[1]-P[1])/lb*rb];
      for(k=0;k<=6;k++){var t=k/6,u=1-t;p.push([u*u*a0[0]+2*u*t*P[0]+t*t*b0[0],u*u*a0[1]+2*u*t*P[1]+t*t*b0[1]])}}
    var L=[0],tot=0;for(i=0;i<p.length;i++){var a2=p[i],b2=p[(i+1)%p.length];tot+=Math.hypot(b2[0]-a2[0],b2[1]-a2[1]);L.push(tot)}
    var out=[],j=0;for(i=0;i<n;i++){var s=tot*i/n;while(L[j+1]<s)j++;var t=(s-L[j])/(L[j+1]-L[j]),A=p[j],B=p[(j+1)%p.length];
      out.push([A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t])}return out}
  function area(xs,ys,n){var s=0;for(var i=0,j=n-1;i<n;j=i++)s+=xs[j]*ys[i]-xs[i]*ys[j];return s*.5}
  KEYS.forEach(function(k){var T=TYPES[k],o=outline(T.pts,T.n,T.ch,T.cf),n=T.n,i,cx=0,cy=0;
    T.rx=new Float64Array(n);T.ry=new Float64Array(n);
    for(i=0;i<n;i++){cx+=o[i][0]/n;cy+=o[i][1]/n}
    var top=1e9,bot=-1e9,lft=1e9,rgt=-1e9;
    for(i=0;i<n;i++){T.rx[i]=o[i][0]-cx;T.ry[i]=o[i][1]-cy;top=Math.min(top,T.ry[i]);bot=Math.max(bot,T.ry[i]);lft=Math.min(lft,T.rx[i]);rgt=Math.max(rgt,T.rx[i])}
    T.top=top;T.bot=bot;T.hw=(rgt-lft)/2;T.h=bot-top;
    T.A0=area(T.rx,T.ry,n);T.L0=new Float64Array(n);
    for(i=0;i<n;i++){var j=(i+1)%n;T.L0[i]=Math.hypot(T.rx[j]-T.rx[i],T.ry[j]-T.ry[i])}
    var a=0,b=0,d=0;for(i=0;i<n;i++){a+=T.rx[i]*T.rx[i];b+=T.rx[i]*T.ry[i];d+=T.ry[i]*T.ry[i]}
    var det=a*d-b*b;T.Qi=[d/det,-b/det,-b/det,a/det];T.ixx=1/a;T.iyy=1/d; /* (Σ q qᵀ)⁻¹ — 표정용 아핀 맞춤 */
    T.pm=T.mass/n});

  /* ---------- 월드 ---------- */
  function makeBody(type,cx,cy,vx,vy){var T=TYPES[type],n=T.n,b={type:type,T:T,n:n,x:new Float64Array(n),y:new Float64Array(n),
      px:new Float64Array(n),py:new Float64Array(n),st:1,landed:0,chill:0,glaze:0,cx:cx,cy:cy,vcx:vx||0,vcy:vy||0,wob:0,
      dn:new Float64Array(n),x0:0,y0:0,x1:0,y1:0,hit:0,age:0,fallT:0,blink:Math.random()*3,id:0};
    for(var i=0;i<n;i++){b.x[i]=cx+T.rx[i];b.y[i]=cy+T.ry[i];b.px[i]=b.x[i]-(vx||0)*DT;b.py[i]=b.y[i]-(vy||0)*DT}
    return b}
  function newWorld(mods){return {bodies:[],bonds:[],t:0,m:mods||{},pox:0,pang:0,ox:0,ang:0,wind:0,ev:[],steps:0}}
  function plateState(w,t){var m=w.m;if(m.fix!=null)return [0,m.fix];return [m.spin?m.spin*Math.sin(t*1.25):0,m.tilt?m.tilt*(.72*Math.sin(t*.85)+.28*Math.sin(t*2.1+1)):0]}
  function windAt(w,t){var m=w.m;return m.wind?m.wind*(.55+.45*Math.sin(t*.7))*(Math.sin(t*.23)>-.3?1:-.6):0}
  function addBody(w,type,x,y,vx,vy,glaze){var b=makeBody(type,x,y,vx,vy);b.glaze=glaze?1:0;b.id=w.bodies.length;w.bodies.push(b);return b}
  function clone(w){var c={bodies:[],bonds:w.bonds.map(function(q){return q.slice()}),t:w.t,m:w.m,pox:w.pox,pang:w.pang,ox:w.ox,ang:w.ang,wind:w.wind,ev:[],steps:w.steps};
    w.bodies.forEach(function(b){var d={};for(var k in b)d[k]=b[k];d.x=b.x.slice();d.dn=b.dn.slice();d.y=b.y.slice();d.px=b.px.slice();d.py=b.py.slice();c.bodies.push(d)});return c}

  function solveBody(b){
    var T=b.T,n=b.n,x=b.x,y=b.y,i,j,cx=0,cy=0,ch=b.chill>0,ks=ch?.6:Math.min(.6,T.shape*(1+(SLOWK-1)*(b.slow||0))),ke=ch?.9:T.edge;
    /* 변 길이 */
    var ex=b.ex||(b.ex=new Float64Array(n)),ey=b.ey||(b.ey=new Float64Array(n));ex.fill(0);ey.fill(0);
    for(i=0;i<n;i++){j=i+1===n?0:i+1;var dx=x[j]-x[i],dy=y[j]-y[i],d=Math.sqrt(dx*dx+dy*dy)||1e-6,f=(d-T.L0[i])/d*.5*ke;
      ex[i]+=dx*f;ey[i]+=dy*f;ex[j]-=dx*f;ey[j]-=dy*f}
    for(i=0;i<n;i++){x[i]+=ex[i];y[i]+=ey[i]}
    /* 압력(면적 유지) */
    var A=area(x,y,n),C=A-T.A0,gs=0,gx=b.gx||(b.gx=new Float64Array(n)),gy=b.gy||(b.gy=new Float64Array(n));
    for(i=0;i<n;i++){var ip=i===0?n-1:i-1,inx=i+1===n?0:i+1;gx[i]=.5*(y[inx]-y[ip]);gy[i]=.5*(x[ip]-x[inx]);gs+=gx[i]*gx[i]+gy[i]*gy[i]}
    if(gs>1e-9){var lam=-C/gs*T.press;for(i=0;i<n;i++){x[i]+=gx[i]*lam;y[i]+=gy[i]*lam}}
    /* 모양 맞춤 */
    for(i=0;i<n;i++){cx+=x[i];cy+=y[i]}cx/=n;cy/=n;
    var sa=0,sb=0;for(i=0;i<n;i++){var rx=x[i]-cx,ry=y[i]-cy;sa+=T.rx[i]*ry-T.ry[i]*rx;sb+=T.rx[i]*rx+T.ry[i]*ry}
    var th=Math.atan2(sa,sb),co=Math.cos(th),si=Math.sin(th);
    /* 모양 맞춤 + 몸체 축 방향 늘이기/납작해지기만 허용(전단 없음) → 눌리면 납작, 출렁이면 늘었다 줄었다 */
    var sxu=0,syu=0;
    for(i=0;i<n;i++){var ux=x[i]-cx,uy=y[i]-cy,lx=co*ux+si*uy,ly=-si*ux+co*uy;sxu+=lx*T.rx[i];syu+=ly*T.ry[i]}
    var sx=sxu*T.ixx,sy=syu*T.iyy,be=ch?0:T.aff;
    if(sx>.05&&sy>.05){var nr=1/Math.sqrt(sx*sy);sx*=nr;sy*=nr;if(sy<.62){sy=.62;sx=1/.62}else if(sy>1.6){sy=1.6;sx=1/1.6}}else{sx=sy=1}
    sx=1+(sx-1)*be;sy=1+(sy-1)*be;b.sx=sx;b.sy=sy;
    for(i=0;i<n;i++){var qx=T.rx[i]*sx,qy=T.ry[i]*sy,gxx=cx+co*qx-si*qy,gyy=cy+si*qx+co*qy;x[i]+=(gxx-x[i])*ks;y[i]+=(gyy-y[i])*ks}
    b.th=th}

  function inPoly(b,px,py){var x=b.x,y=b.y,n=b.n,c=false;
    for(var i=0,j=n-1;i<n;j=i++){if((y[i]>py)!==(y[j]>py)&&px<(x[j]-x[i])*(py-y[i])/(y[j]-y[i])+x[i])c=!c}return c}
  function mixFric(A,B){var f=Math.sqrt(A.T.fric*B.T.fric);if(A.T.sticky||B.T.sticky)f=Math.max(f,.95);return f}

  /* A의 점이 B 안으로 들어오면 가장 가까운 B의 변으로 밀어낸다(질량 가중, 위치만). rec이면 접촉을 기록해 속도 단계에서 마찰 처리 */
  function collidePair(w,A,B,rec){
    var n=A.n,m=B.n,wa=1/A.T.pm,wb=1/B.T.pm,bx=B.x,by=B.y,i,j,hit=0,mu=mixFric(A,B);
    for(i=0;i<n;i++){var px=A.x[i],py=A.y[i];
      if(px<B.x0-SK||px>B.x1+SK||py<B.y0-SK||py>B.y1+SK)continue;
      var ins=inPoly(B,px,py),best=1e18,bj=0,bt=0,qx=0,qy=0;
      for(j=0;j<m;j++){var k=j+1===m?0:j+1,ex=bx[k]-bx[j],ey=by[k]-by[j],l=ex*ex+ey*ey,t=l>0?((px-bx[j])*ex+(py-by[j])*ey)/l:0;
        t=t<0?0:t>1?1:t;var cx=bx[j]+ex*t,cy=by[j]+ey*t,d=(px-cx)*(px-cx)+(py-cy)*(py-cy);if(d<best){best=d;bj=j;bt=t;qx=cx;qy=cy}}
      if(!ins&&best>=SK*SK)continue;
      /* 표면 두께 SK: 바깥에 가까이 있는 점도 접촉으로 쳐서 평평한 면끼리 넓게 받친다 */
      var k2=bj+1===m?0:bj+1,dl=Math.sqrt(best)||1e-6,nx=(qx-px)/dl,ny=(qy-py)/dl;
      if(!ins){nx=-nx;ny=-ny}
      if(dl<1e-5){var eX=bx[k2]-bx[bj],eY=by[k2]-by[bj],eL=Math.sqrt(eX*eX+eY*eY)||1;nx=eY/eL;ny=-eX/eL}
      var dep=ins?dl+SK:SK-dl,dx=nx*dep,dy=ny*dep,
          s0=1-bt,s1=bt,lam=1/(wa+wb*(s0*s0+s1*s1));dl=dep;
      A.x[i]+=dx*wa*lam;A.y[i]+=dy*wa*lam;A.dn[i]+=dl;
      bx[bj]-=dx*wb*s0*lam;by[bj]-=dy*wb*s0*lam;bx[k2]-=dx*wb*s1*lam;by[k2]-=dy*wb*s1*lam;
      /* 위치 기반 쿨롱 마찰: 이번 스텝의 상대 접선 이동을 (누른 깊이 × μ)까지 없앤다 */
      var rx=(A.x[i]-A.px[i])-((bx[bj]-B.px[bj])*s0+(bx[k2]-B.px[k2])*s1),ry=(A.y[i]-A.py[i])-((by[bj]-B.py[bj])*s0+(by[k2]-B.py[k2])*s1),
          rn=rx*nx+ry*ny,tx=rx-rn*nx,ty=ry-rn*ny,tl=Math.sqrt(tx*tx+ty*ty);
      if(tl>1e-9){var f=tl<mu*1.3*dep?1:Math.min(1,mu*dep/tl),cx2=tx*f,cy2=ty*f;
        A.x[i]-=cx2*wa*lam;A.y[i]-=cy2*wa*lam;bx[bj]+=cx2*wb*s0*lam;by[bj]+=cy2*wb*s0*lam;bx[k2]+=cx2*wb*s1*lam;by[k2]+=cy2*wb*s1*lam}
      if(rec)w.cts.push(A,i,B,bj,k2,bt,nx,ny,lam);
      hit++}
    if(hit&&rec){A.ct=B.ct=1;var v=Math.hypot(A.vcx-B.vcx,A.vcy-B.vcy);
      if(!A.landed){A.landed=1;w.ev.push({t:'land',b:A,v:v})}else if(v>140&&A.hit<=0)w.ev.push({t:'bump',b:A,v:v});
      if(v>90)A.hit=.25;
      if(A.glaze&&!B.glaze)glue(w,A,B);else if(B.glaze&&!A.glaze)glue(w,B,A)}
    return hit}
  /* 접시: 움직이는 직사각형(국소 좌표에서 판정) */
  function collidePlate(w,b,rec){
    var co=Math.cos(w.ang),si=Math.sin(w.ang),hw=PW/2,mu=Math.min(1,b.T.fric*1.1);
    for(var i=0;i<b.n;i++){var rx=b.x[i]-PCX-w.ox,ry=b.y[i]-Y0,lx=co*rx+si*ry,ly=-si*rx+co*ry;
      if(lx>-hw&&lx<hw&&ly>-2&&ly<PT){
        var pt=ly+2,pl=lx+hw,pr=hw-lx,pb=PT-ly,mn=Math.min(pt,pl,pr,pb),nlx=0,nly=0;
        if(mn===pt){ly=-2;nly=-1}else if(mn===pl){lx=-hw;nlx=-1}else if(mn===pr){lx=hw;nlx=1}else{ly=PT;nly=1}
        var nxx=PCX+w.ox+co*lx-si*ly,nyy=Y0+si*lx+co*ly,dep=Math.hypot(nxx-b.x[i],nyy-b.y[i]);b.x[i]=nxx;b.y[i]=nyy;
        var cop=Math.cos(w.pang),sip=Math.sin(w.pang),ox=PCX+w.pox+cop*lx-sip*ly,oy=Y0+sip*lx+cop*ly,nx=co*nlx-si*nly,ny=si*nlx+co*nly,
            rx=(b.x[i]-b.px[i])-(nxx-ox),ry=(b.y[i]-b.py[i])-(nyy-oy),rn=rx*nx+ry*ny,tx=rx-rn*nx,ty=ry-rn*ny,tl=Math.sqrt(tx*tx+ty*ty);
        if(tl>1e-9){var f=tl<mu*1.3*dep?1:Math.min(1,mu*dep/tl);b.x[i]-=tx*f;b.y[i]-=ty*f}
        if(rec){
          w.cts.push(b,i,null,nxx-ox,nyy-oy,0,nx,ny,1);b.ct=1;
          if(!b.landed){b.landed=1;w.ev.push({t:'land',b:b,v:Math.hypot(b.vcx,b.vcy)})}}}
      if(b.y[i]>TABLE_Y){b.y[i]=TABLE_Y;b.x[i]-=(b.x[i]-b.px[i])*.5;if(rec){w.cts.push(b,i,null,0,0,0,0,-1,1);if(b.st===1){b.st=2;w.ev.push({t:'fall',b:b})}}}}}
  /* 속도 단계: 접촉점의 상대 속도에서 접선은 마찰만큼, 위치 보정이 만든 튕김(분리 속도)은 대부분 없앤다 */
  function contactVel(w){var c=w.cts,q,pass;
    for(pass=0;pass<3;pass++){var last=pass===2;
    for(q=0;q<c.length;q+=9){var A=c[q],i=c[q+1],B=c[q+2],nx=c[q+6],ny=c[q+7],vax=A.x[i]-A.px[i],vay=A.y[i]-A.py[i],rx,ry,e;
      if(B){var bj=c[q+3],k2=c[q+4],t=c[q+5],s0=1-t,s1=t,wa=1/A.T.pm,wb=1/B.T.pm,lam=c[q+8];
        rx=vax-((B.x[bj]-B.px[bj])*s0+(B.x[k2]-B.px[k2])*s1);ry=vay-((B.y[bj]-B.py[bj])*s0+(B.y[k2]-B.py[k2])*s1);e=A.T.rest*B.T.rest}
      else{rx=vax-c[q+3];ry=vay-c[q+4];e=A.T.rest}
      /* 다가오는 법선 속도는 없애고(여러 번 반복해 동시 충돌을 고르게), 마지막엔 위치 보정이 만든 튕김을 말랑한 만큼 줄인다 */
      var rn=rx*nx+ry*ny,jn;
      if(rn<0)jn=rn;else if(last)jn=rn*(1-e);else continue;
      var jx=jn*nx,jy=jn*ny;
      if(B){var fa=wa*lam,fb=wb*lam;A.px[i]+=jx*fa;A.py[i]+=jy*fa;B.px[bj]-=jx*fb*s0;B.py[bj]-=jy*fb*s0;B.px[k2]-=jx*fb*s1;B.py[k2]-=jy*fb*s1}
      else{A.px[i]+=jx;A.py[i]+=jy}}}
    for(q=0;q<c.length;q+=9)c[q].dn[c[q+1]]=0;
    c.length=0}
  function glue(w,A,B){var pairs=[],i,j;
    for(i=0;i<A.n;i++)for(j=0;j<B.n;j++){var d=Math.hypot(A.x[i]-B.x[j],A.y[i]-B.y[j]);if(d<9)pairs.push([d,i,j])}
    if(pairs.length<2)return;pairs.sort(function(p,q){return p[0]-q[0]});
    var used={},c=0;for(i=0;i<pairs.length&&c<5;i++){var p=pairs[i];if(used['a'+p[1]]||used['b'+p[2]])continue;used['a'+p[1]]=used['b'+p[2]]=1;
      w.bonds.push([A.id,p[1],B.id,p[2],Math.max(1,p[0])]);c++}
    A.glaze=0;w.ev.push({t:'glue',b:A,x:(A.cx+B.cx)/2,y:(A.cy+B.cy)/2})}

  function step(w){
    var bs=w.bodies,nb=bs.length,i,k,b;
    w.t+=DT;w.steps++;w.ev.length=0;
    var ps=plateState(w,w.t),pox=w.ox,pang=w.ang;w.pox=pox;w.pang=pang;w.ox=ps[0];w.ang=ps[1];w.wind=windAt(w,w.t);
    for(k=0;k<nb;k++){b=bs[k];if(b.st!==1)continue;b.age+=DT;if(b.chill>0)b.chill-=DT;if(b.hit>0)b.hit-=DT;
      var dmp=b.T.damp;
      /* 내부 감쇠: 강체 운동(평행이동+회전)과의 차이만 줄여서 출렁임을 가라앉힌다 */
      var slow=b.ct&&Math.abs(b.vcx)+Math.abs(b.vcy)<30;b.slow=slow?Math.min(1,(b.slow||0)+DT*3):0;var kd=b.chill>0?.25:(b.ct?(slow?Math.max(.3,b.T.kc):b.T.kc):b.T.kd),mx=0,my=0,mvx=0,mvy=0,L=0,I=0,n=b.n;
      for(i=0;i<n;i++){mx+=b.x[i];my+=b.y[i];mvx+=b.x[i]-b.px[i];mvy+=b.y[i]-b.py[i]}mx/=n;my/=n;mvx/=n;mvy/=n;
      for(i=0;i<n;i++){var qx=b.x[i]-mx,qy=b.y[i]-my;L+=qx*(b.y[i]-b.py[i]-mvy)-qy*(b.x[i]-b.px[i]-mvx);I+=qx*qx+qy*qy}
      var om=I>0?L/I:0;
      /* 공기 저항(제곱): 낙하 속도만 눈에 띄게 줄인다 */
      var sp=Math.sqrt(mvx*mvx+mvy*mvy)/DT,dr=sp*DRAG*DT;if(dr>.5)dr=.5;var dvx=mvx*dr,dvy=mvy*dr;mvx-=dvx;mvy-=dvy;
      /* 닿아 있는 동안 위로 튀어 오르는 속도는 말랑한 만큼 삼킨다(푸딩은 '퉁', 젤리는 '통') */
      if(b.ct&&mvy<0){var ab=mvy*(1-b.T.rest)*.3;dvy+=ab;mvy-=ab}
      for(i=0;i<n;i++){var qx2=b.x[i]-mx,qy2=b.y[i]-my,rvx=mvx-om*qy2,rvy=mvy+om*qx2;
        b.px[i]+=((b.x[i]-b.px[i])-rvx)*kd+dvx;b.py[i]+=((b.y[i]-b.py[i])-rvy)*kd+dvy}
      b.ct=0;
      for(i=0;i<b.n;i++){var vx=(b.x[i]-b.px[i])*dmp,vy=(b.y[i]-b.py[i])*dmp,ax=0;
        if(w.wind){var ex=(Y0-b.y[i])/260;ax=w.wind*(ex>0?ex:0)}
        b.px[i]=b.x[i];b.py[i]=b.y[i];b.x[i]+=vx+ax*DT2;b.y[i]+=vy+G*DT2}}
    if(!w.cts)w.cts=[];
    for(var it=0;it<ITER;it++){var rec=it===ITER-1;
      for(k=0;k<nb;k++)if(bs[k].st===1)solveBody(bs[k]);
      for(i=0;i<w.bonds.length;i++){var q=w.bonds[i],A=bs[q[0]],B=bs[q[2]];if(A.st!==1||B.st!==1)continue;
        var dx=B.x[q[3]]-A.x[q[1]],dy=B.y[q[3]]-A.y[q[1]],d=Math.sqrt(dx*dx+dy*dy)||1e-6;
        if(d>q[4]+26){w.bonds.splice(i,1);i--;continue}
        var wa=1/A.T.pm,wb=1/B.T.pm,f=(d-q[4])/d/(wa+wb)*.6;
        A.x[q[1]]+=dx*f*wa;A.y[q[1]]+=dy*f*wa;B.x[q[3]]-=dx*f*wb;B.y[q[3]]-=dy*f*wb}
      /* 경계 상자 */
      for(k=0;k<nb;k++){b=bs[k];if(b.st!==1)continue;var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
        for(i=0;i<b.n;i++){if(b.x[i]<x0)x0=b.x[i];if(b.x[i]>x1)x1=b.x[i];if(b.y[i]<y0)y0=b.y[i];if(b.y[i]>y1)y1=b.y[i]}
        b.x0=x0;b.y0=y0;b.x1=x1;b.y1=y1}
      /* 몸체끼리 */
      for(k=0;k<nb;k++){var P=bs[k];if(P.st!==1)continue;
        for(var l=k+1;l<nb;l++){var Q=bs[l];if(Q.st!==1)continue;
          if(P.x1+SK<Q.x0||Q.x1+SK<P.x0||P.y1+SK<Q.y0||Q.y1+SK<P.y0)continue;
          if((w.steps+it)&1){collidePair(w,P,Q,rec);collidePair(w,Q,P,rec)}else{collidePair(w,Q,P,rec);collidePair(w,P,Q,rec)}}}
      for(k=0;k<nb;k++)if(bs[k].st===1)collidePlate(w,bs[k],rec)}
    contactVel(w);
    for(k=0;k<nb;k++){b=bs[k];if(b.st===1&&(b.cx<-60||b.cx>W+60)){b.st=2;w.ev.push({t:'fall',b:b})}}
    /* 무게중심 속도, 흔들림 */
    for(k=0;k<nb;k++){b=bs[k];if(b.st!==1)continue;var cx=0,cy=0;for(i=0;i<b.n;i++){cx+=b.x[i];cy+=b.y[i]}cx/=b.n;cy/=b.n;
      var vcx=(cx-b.cx)/DT,vcy=(cy-b.cy)/DT;b.cx=cx;b.cy=cy;b.vcx+=(vcx-b.vcx)*.1;b.vcy+=(vcy-b.vcy)*.1;
      var wb2=0;for(i=0;i<b.n;i++){var ux=(b.x[i]-b.px[i])/DT-vcx,uy=(b.y[i]-b.py[i])/DT-vcy;wb2+=Math.abs(ux)+Math.abs(uy)}
      b.wob+=(wb2/b.n-b.wob)*.05}
  }
  /* 탑 높이: 착지해서 거의 멈춘 디저트들의 가장 높은 점 */
  function towerTop(w,vmax){var top=Y0,bs=w.bodies;vmax=vmax||55;
    for(var k=0;k<bs.length;k++){var b=bs[k];if(b.st!==1||!b.landed||b.age<.3)continue;
      if(Math.abs(b.vcx)+Math.abs(b.vcy)>vmax)continue;if(b.y0<top)top=b.y0}
    return Y0-top}
  /* 숟가락 높이: 지금 탑 꼭대기보다 조금 위(낙하 높이를 일정하게) */
  function spawnY(w,type){var T=TYPES[type],top=Y0-towerTop(w,1e9);return Math.max(SPAWN_Y,Math.min(430,top-GAP-T.bot))}
  function drop(w,type,x,vx,glaze){return addBody(w,type,x,spawnY(w,type),vx||0,0,glaze)}
  function allStill(w){for(var k=0;k<w.bodies.length;k++){var b=w.bodies[k];if(b.st===1&&(Math.abs(b.vcx)+Math.abs(b.vcy)>25||!b.landed))return false}return true}
  function bodyArea(b){return area(b.x,b.y,b.n)}

  /* ---------- 레벨 ---------- */
  var LEVELS=[
    {q:'pud pud pud pud',t:96,hint:{ko:'흔들흔들 쌓아 올려요',en:'Stack the wobbly treats'}},
    {q:'pud pud jel jel pud',t:130,hint:{ko:'젤리는 미끄러워요 · 맨 위에!',en:'Jello is slippery · keep it on top!'}},
    {q:'jel moc jel moc pud jel',t:150,hint:{ko:'쫀득 모찌로 붙여 줘요',en:'Sticky mochi holds things together'}},
    {q:'pud cak pud cak pan pud',t:165,hint:{ko:'무거운 케이크는 아래로 · ↻로 순서 바꾸기',en:'Heavy cake goes low · ↻ swaps the order'}},
    {q:'jel jel pan jel moc jel jel',t:185,chill:3,hint:{ko:'흔들리면 톡! 얼려서 굳혀요',en:'Tap a wobbly treat to chill it stiff'}},
    {q:'cak pud moc pan pud jel',t:160,mods:{tilt:.07},hint:{ko:'웨이터가 접시를 들고 가요!',en:'A waiter is carrying the plate!'}},
    {q:'gum gum pan gum moc gum jel gum',t:175,glue:2,hint:{ko:'젤라틴 풀로 둘을 붙여요',en:'Gelatin glue bonds two treats'}},
    {q:'cak moc pan pud moc jel gum',t:190,mods:{wind:240},chill:1,hint:{ko:'선풍기 바람 조심!',en:'Watch out for the fan breeze!'}},
    {q:'cak pud moc gum pan jel pud',t:180,mods:{spin:18},glue:1,hint:{ko:'돌림판이 빙글빙글',en:'The turntable keeps turning'}},
    {q:'cak cak moc pud pan moc jel gum jel',t:235,mods:{tilt:.05,wind:160},chill:2,glue:1,hint:{ko:'디저트 총출동!',en:'Everything at once!'}}
  ];
  function rng(s){s=(s*2654435761+1013904223)>>>0;return function(){s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
  /* 10단계 이후: 시드로 만든 레벨. 무거운/단단한 조각 비율을 지키고 목표 높이는 조각 높이 합의 일정 비율 */
  function genLevel(n){var r=rng(n*7919+17),k=n-10,cnt=6+Math.min(3,Math.floor(k/12))+(r()<.4?1:0),q=[],i;
    var bag=['cak','pud','pud','moc','moc','pan','gum','jel','jel','pan'];
    q.push(r()<.6?'cak':'pud');
    for(i=1;i<cnt;i++)q.push(bag[Math.floor(r()*bag.length)]);
    var hs=0;q.forEach(function(t){hs+=TYPES[t].h});
    var mods={},mk=Math.floor(r()*5);
    if(mk===1)mods.tilt=.04+r()*.025;else if(mk===2)mods.wind=120+r()*110;else if(mk===3)mods.spin=10+r()*10;
    else if(mk===4&&k>15){mods.tilt=.035;mods.wind=110}
    var frac=.5+Math.min(.1,k*.004)-(mk?.04:0);
    return {q:q.join(' '),t:Math.min(270,Math.round(hs*frac/5)*5),mods:mods,chill:r()<.5?1:0,glue:r()<.4?1:0,gen:1}}
  function getLevel(n){var L=n<LEVELS.length?LEVELS[n]:genLevel(n),o={n:n,q:L.q.split(' '),t:L.t,mods:L.mods||{},chill:L.chill||0,glue:L.glue||0,hint:L.hint||null,gen:!!L.gen};return o}

  var CORE={W:W,H:H,DT:DT,Y0:Y0,TABLE_Y:TABLE_Y,PW:PW,PCX:PCX,SPAWN_Y:SPAWN_Y,TYPES:TYPES,KEYS:KEYS,LEVELS:LEVELS,
    newWorld:newWorld,addBody:addBody,spawnY:spawnY,drop:drop,step:step,clone:clone,towerTop:towerTop,allStill:allStill,bodyArea:bodyArea,getLevel:getLevel,genLevel:genLevel,inPoly:inPoly};
  if(typeof module!=='undefined'&&module.exports)module.exports=CORE;
  if(typeof SG==='undefined')return;
  /*@@GAME@@*/
})();
