/* 말랑 디저트 탑 (Jelly Tower) — 말랑말랑한 소프트바디 디저트를 숟가락에서 떨어뜨려 목표 높이까지 쌓는다.
   물리(점 질량 + 모양 맞춤 + 압력 + 변 제약 + 몸체 간 충돌)는 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,HZ=240,DT=1/HZ,DT2=DT*DT,G=900,Y0=540,TABLE_Y=590,PW=184,PT=10,PCX=180,SPAWN_Y=128,ITER=3,SK=1.6,GAP=48,SLOWK=12,ANGD=.15,DRAG=900/(480*480);

  /* ---------- 디저트 종류: 말랑함(shape), 무게(mass), 마찰(fric) ---------- */
  var TYPES={
    pud:{face:4,rest:.1,kd:.08,kc:.12,ko:'푸딩',en:'Pudding',pts:[[-28,22],[28,22],[25,-22],[-25,-22]],n:24,ch:2,cf:8,
      shape:.05,aff:.98,edge:.08,press:.9,damp:.9995,fric:.6,mass:1,col:['#fff0a8','#f7c64e','#c98a1c'],pitch:330},
    jel:{face:2,rest:.6,kd:.012,kc:.03,ko:'젤리',en:'Jello',pts:[[-23,23],[23,23],[23,-23],[-23,-23]],n:24,ch:2,cf:9,
      shape:.06,aff:.95,edge:.15,press:1,damp:.9998,fric:.06,mass:.9,col:['#ff9fb4','#f2506e','#a8183c'],pitch:520,glassy:1},
    moc:{face:4,rest:0,kd:.1,kc:.2,ko:'모찌',en:'Mochi',pts:[[-28,16],[28,16],[26,2],[17,-12],[0,-16],[-17,-12],[-26,2]],n:22,ch:2,cf:7,
      shape:.035,aff:.99,edge:.06,press:.9,damp:.9995,fric:1,mass:.8,col:['#ffffff','#ffd9e4','#d98aa6'],pitch:250,sticky:1},
    pan:{face:7,rest:.2,kd:.06,kc:.1,ko:'판나코타',en:'Panna cotta',pts:[[-24,27],[24,27],[19,-18],[13,-26],[-13,-26],[-19,-18]],n:24,ch:2,cf:7,
      shape:.05,aff:.95,edge:.1,press:.95,damp:.9995,fric:.45,mass:1,col:['#ffffff','#f6efe2','#c9b48e'],pitch:400},
    gum:{face:3,rest:.3,kd:.04,kc:.1,ko:'곰젤리',en:'Gummy bear',pts:[[-14,18],[14,18],[15,-8],[10,-17],[-10,-17],[-15,-8]],n:16,ch:2,cf:6,
      shape:.12,aff:.85,edge:.3,press:1,damp:.9995,fric:.9,mass:.45,col:['#ffd27a','#ff9a2e','#c45f00'],pitch:640,glassy:1},
    cak:{face:5,rest:.1,kd:.08,kc:.15,ko:'케이크',en:'Cake',pts:[[-33,20],[33,20],[33,-20],[-33,-20]],n:26,ch:2,cf:4,
      shape:.2,aff:.5,edge:.8,press:1,damp:.9995,fric:.55,mass:2.4,col:['#fff4dc','#f2d39a','#b98a4e'],pitch:180}
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
      var ka=b.ct?ANGD:0;
      for(i=0;i<n;i++){var qx2=b.x[i]-mx,qy2=b.y[i]-my,rvx=mvx-om*qy2,rvy=mvy+om*qx2;
        b.px[i]+=((b.x[i]-b.px[i])-rvx)*kd+dvx-om*qy2*ka;b.py[i]+=((b.y[i]-b.py[i])-rvy)*kd+dvy+om*qx2*ka}
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
    {q:'pud pud pud pud',t:100,hint:{ko:'흔들흔들 쌓아 올려요',en:'Stack the wobbly treats'}},
    {q:'pud pud jel jel pud',t:150,hint:{ko:'젤리는 미끄러워요 · 맨 위에!',en:'Jello is slippery · keep it on top!'}},
    {q:'pud moc jel moc pud jel',t:140,hint:{ko:'쫀득 모찌로 붙여 줘요',en:'Sticky mochi holds things together'}},
    {q:'pud cak pud cak pan pud',t:190,hint:{ko:'무거운 케이크는 아래로 · ↻로 순서 바꾸기',en:'Heavy cake goes low · ↻ swaps the order'}},
    {q:'jel pud jel pan jel pud',t:180,chill:3,hint:{ko:'흔들리면 톡! 얼려서 굳혀요',en:'Tap a wobbly treat to chill it stiff'}},
    {q:'cak pud moc pud pan jel',t:145,mods:{tilt:.03},hint:{ko:'웨이터가 접시를 들고 가요!',en:'A waiter is carrying the plate!'}},
    {q:'gum gum pan gum moc gum pud gum',t:150,glue:2,hint:{ko:'젤라틴 풀로 둘을 붙여요',en:'Gelatin glue bonds two treats'}},
    {q:'cak moc pan pud moc jel gum',t:165,mods:{wind:70},chill:1,hint:{ko:'선풍기 바람 조심!',en:'Watch out for the fan breeze!'}},
    {q:'cak pud moc gum pan jel pud',t:160,mods:{spin:10},glue:1,hint:{ko:'돌림판이 빙글빙글',en:'The turntable keeps turning'}},
    {q:'cak cak moc pud pan moc jel gum jel',t:200,mods:{tilt:.025,wind:60},chill:2,glue:1,hint:{ko:'디저트 총출동!',en:'Everything at once!'}}
  ];

  function rng(s){s=(s*2654435761+1013904223)>>>0;return function(){s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
  /* 10단계 이후: 시드로 만든 레벨. 무거운/단단한 조각 비율을 지키고 목표 높이는 조각 높이 합의 일정 비율 */
  function genLevel(n){var r=rng(n*7919+17),k=n-10,cnt=6+Math.min(2,Math.floor(k/20))+(r()<.4?1:0),q=[],i;
    var bag=['cak','pud','pud','moc','moc','pan','gum','jel','pan','cak'];
    q.push(r()<.6?'cak':'pud');
    for(i=1;i<cnt;i++)q.push(bag[Math.floor(r()*bag.length)]);
    var hs=0;q.forEach(function(t){hs+=TYPES[t].h});
    var mods={},mk=Math.floor(r()*5);
    if(mk===1)mods.tilt=.015+r()*.012;else if(mk===2)mods.wind=45+r()*25;else if(mk===3)mods.spin=6+r()*3;
    else if(mk===4&&k>15){mods.tilt=.015;mods.wind=40}
    var frac=.44+Math.min(.06,k*.0015)-(mk?.03:0);
    return {q:q.join(' '),t:Math.min(230,Math.round(hs*frac/5)*5),mods:mods,chill:r()<.5?1:0,glue:r()<.4?1:0,gen:1}}
  /* 봇(헤드리스 시뮬레이션 탐색)으로 깰 수 있음을 확인한 생성 시드 60개. 11단계부터 차례로 쓰고, 다 쓰면 처음부터 다시 */
  var GEN=[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,30,31,32,33,34,36,37,38,39,40,41,42,43,44,45,46,47,48,49,51,52,53,54,55,56,57,58,59,60,61,62,63,65,66,67,68,69,70,71,72,73];
  function getLevel(n){var L=n<LEVELS.length?LEVELS[n]:genLevel(GEN[(n-LEVELS.length)%GEN.length]),o={n:n,q:L.q.split(' '),t:L.t,mods:L.mods||{},chill:L.chill||0,glue:L.glue||0,hint:L.hint||null,gen:!!L.gen};return o}

  var CORE={W:W,H:H,DT:DT,Y0:Y0,TABLE_Y:TABLE_Y,PW:PW,PCX:PCX,SPAWN_Y:SPAWN_Y,TYPES:TYPES,KEYS:KEYS,LEVELS:LEVELS,
    newWorld:newWorld,addBody:addBody,spawnY:spawnY,drop:drop,step:step,clone:clone,towerTop:towerTop,allStill:allStill,bodyArea:bodyArea,getLevel:getLevel,genLevel:genLevel,GEN:GEN,inPoly:inPoly};
  if(typeof module!=='undefined'&&module.exports)module.exports=CORE;
  if(typeof SG==='undefined')return;
  /* =================== 게임 =================== */
  var START=50,GAIN=14,CAP=70,AUTO=5,FAILCOST=8,HOLD=3,SW_A=7,SW_W=2.4,DRIFT_A=112,DRIFT_W=.83;
  var lvN,L,w,queue,lives,time,mode,modeT,hold,below,acc,spoonX,ctl,idleT,driftPh,heldT,cool,ptr,kb,chillN,glueN,glazeNext,
      stillT,streak,tG=0,ghosts,lastGain,hintT,drops,shownHint,heldY,tickN,cherryJoy,noLoss,bgc=null,clouds,motes,steam,flash;
  var keyQ={drop:0,swap:0,chill:0,glue:0};
  if(!window.__jtKeys){window.__jtKeys=1;
    window.addEventListener('keydown',function(e){if(e.repeat)return;var c=e.code;
      if(c==='Space'||c==='ArrowUp'||c==='KeyW'||c==='Enter')keyQ.drop=1;else if(c==='ArrowDown'||c==='KeyS'||c==='KeyX')keyQ.swap=1;
      else if(c==='KeyC')keyQ.chill=1;else if(c==='KeyG'||c==='KeyZ')keyQ.glue=1;else return;kb=true})}

  function init(a){lvN=0;time=START;streak=0;tG=0;lastGain=0;flash=0;
    clouds=[];for(var i=0;i<4;i++)clouds.push({x:20+i*40,y:96+(i%2)*30+i*6,s:.6+((i*37)%10)/20,v:4+i*1.5});
    motes=[];for(var j=0;j<14;j++)motes.push({x:(j*53)%W,y:(j*97)%H,v:6+(j%4)*3,p:j});
    steam=[];load(0);keyQ.drop=keyQ.swap=keyQ.chill=keyQ.glue=0}
  function load(n){lvN=n;L=getLevel(n);w=newWorld(L.mods);queue=L.q.slice();lives=3;mode='play';modeT=0;hold=0;below=0;acc=0;
    spoonX=PCX;ctl=false;idleT=0;driftPh=0;heldT=0;cool=.6;ptr=null;chillN=L.chill;glueN=L.glue;glazeNext=false;stillT=0;
    ghosts=[];hintT=0;drops=0;heldY=SPAWN_Y-60;tickN=0;cherryJoy=0;noLoss=true}
  function swingOff(){return SW_A*Math.sin(tG*SW_W)}
  function heldPos(){return [spoonX+swingOff(),heldY]}

  function release(a){if(!queue.length||cool>0)return;var type=queue.shift(),p=heldPos(),vx=SW_A*SW_W*Math.cos(tG*SW_W);
    var b=addBody(w,type,p[0],p[1],vx,40,glazeNext);b.blink=0;glazeNext=false;
    drops++;heldT=0;cool=.55;ctl=false;idleT=0;driftPh=Math.asin(Math.max(-1,Math.min(1,(spoonX-PCX)/DRIFT_A)))/DRIFT_W;
    a.beep(TYPES[type].pitch*1.6,.05,'triangle')}
  function bodyAt(x,y){for(var k=w.bodies.length-1;k>=0;k--){var b=w.bodies[k];if(b.st===1&&b.landed&&inPoly(b,x,y))return b}return null}
  function chill(a,b){if(!b||chillN<=0)return;chillN--;b.chill=3;a.beep(1320,.09,'sine');a.beep(1760,.14,'sine');a.burst(b.cx,b.cy,'#bfe8ff',10);
    a.pop(b.cx,b.y0-8,a.lang==='ko'?'꽁꽁!':'Chilled!','#5fb6e8')}
  function wobbliest(){var best=null,bv=-1;for(var k=0;k<w.bodies.length;k++){var b=w.bodies[k];if(b.st!==1||!b.landed||b.chill>0)continue;
      var v=b.wob+Math.abs(b.vcx)*.5+(Y0-b.cy)*.02;if(v>bv){bv=v;best=b}}return best}
  function swap(a){if(queue.length<2||cool>0)return;var t=queue[0];queue[0]=queue[1];queue[1]=t;heldT=Math.max(0,heldT-.6);a.sfx('tap');
    a.pop(326,124,'↻','#ff8fab')}
  function glaze(a){if(glueN<=0||glazeNext||!queue.length)return;glueN--;glazeNext=true;a.beep(392,.08,'sine');a.beep(587,.12,'sine');
    var p=heldPos();a.burst(p[0],p[1],'#ffd36b',8)}
  function lose(a,why){mode='fail';modeT=0;time-=FAILCOST;streak=0;a.sfx('hit');a.shake(8);flash=1;
    a.pop(W/2,250,'-'+FAILCOST+(a.lang==='ko'?'초':'s'),'#ff5d73');
    if(time<=0){time=0;a.over()}}
  function win(a){var h=towerTop(w),bonus=Math.max(0,Math.min(15,Math.round((h-L.t)/6))),lb=lives*3;
    if(noLoss)streak++;var sk=Math.min(streak,5)*2,pts=10+bonus+lb+sk;a.add(pts);
    time=Math.min(CAP,time+GAIN);lastGain=1;mode='clear';modeT=0;cherryJoy=1;
    a.sfx('win');a.beep(1568,.25,'sine');setTimeout(function(){a.beep(2093,.35,'sine')},140);
    var cx=CHX,cy=Y0-L.t;['#ff6f91','#ffd36b','#8fd3ff','#9be59b','#c8a2ff'].forEach(function(c){a.burst(cx,cy,c,9)});
    a.pop(W/2,Y0-L.t-34,'+'+pts,'#ff6f91');
    a.tempo(1+Math.min(.45,lvN*.04))}

  var CHX=300; /* 체리(목표선 끝) x */
  function update(dt,inp,a){
    var ko=a.lang==='ko',i;
    tG+=dt;if(lastGain>0)lastGain-=dt;if(flash>0)flash-=dt*2;if(cherryJoy>0)cherryJoy-=dt*.6;
    if(mode==='clear'){modeT+=dt;stepWorld(a,dt);if(modeT>1.7)load(lvN+1);return}
    if(mode==='fail'){modeT+=dt;stepWorld(a,dt);if(modeT>1.5)load(lvN);return}
    time-=dt;if(time<=0){time=0;a.over();return}
    if(time<10&&Math.ceil(time)!==tickN){tickN=Math.ceil(time);a.beep(1000,.04,'square')}
    hintT+=dt;
    /* ---- 입력 ---- */
    var holding=hold>0;
    if(inp.tap&&inp.down&&inp.x!=null){var x=inp.x,y=inp.y;kb=false;
      if(Math.hypot(x-326,y-98)<28&&queue.length>1)swap(a);
      else if(glueN>0&&Math.hypot(x-86,y-616)<24)glaze(a);
      else if(chillN>0&&Math.hypot(x-36,y-616)<24)chill(a,wobbliest());
      else{var hit=chillN>0?bodyAt(x,y):null;ptr={x:x,x0:x,y0:y,t0:tG,cb:hit,mv:!hit}}}
    if(ptr){if(inp.down&&inp.x!=null){ptr.x=inp.x;if(!ptr.mv&&Math.hypot(inp.x-ptr.x0,inp.y-ptr.y0)>12)ptr.mv=true;if(ptr.mv){ctl=true;idleT=0}}
      else{var pc=ptr;ptr=null;if(!pc.mv&&pc.cb&&tG-pc.t0<.45)chill(a,pc.cb);else if(!holding)release(a)}}
    if(inp.left||inp.right){spoonX+=(inp.right?1:-1)*190*dt;ctl=true;idleT=0;kb=true}
    if(keyQ.drop){keyQ.drop=0;if(!holding)release(a)}
    if(keyQ.swap){keyQ.swap=0;swap(a)}
    if(keyQ.chill){keyQ.chill=0;chill(a,wobbliest())}
    if(keyQ.glue){keyQ.glue=0;glaze(a)}
    /* ---- 숟가락 ---- */
    idleT+=dt;
    if(ptr&&ptr.mv)spoonX+=(ptr.x-spoonX)*Math.min(1,dt*16);
    else if(idleT>1.2&&!holding){ /* 손을 놓고 있으면 숟가락이 좌우 끝으로 졸졸 걸어간다(방치하면 접시 밖으로 떨어짐) */
      var side=(drops+lvN)%2?1:-1,tx=PCX+side*DRIFT_A+Math.sin(tG*1.3)*8;spoonX+=(tx-spoonX)*Math.min(1,dt*Math.min(1.2,(idleT-1.2)*.8))}
    spoonX=Math.max(40,Math.min(W-40,spoonX));
    if(cool>0)cool-=dt;
    if(queue.length){var ty=spawnY(w,queue[0]);heldY+=(ty-heldY)*Math.min(1,dt*(cool>0?3:5))}
    if(queue.length&&cool<=0&&!holding){heldT+=dt;if(heldT>=AUTO)release(a)}
    /* ---- 물리 ---- */
    stepWorld(a,dt);
    if(mode!=='play')return;
    if(lives<=0){lose(a,'lives');return}
    /* ---- 버티기 ---- */
    var h=towerTop(w);
    if(h>=L.t){below=0;var p0=hold;hold+=dt;
      if(Math.floor(p0)!==Math.floor(hold)&&hold<HOLD){a.beep(660+Math.floor(hold)*220,.09,'triangle')}
      if(p0===0){a.beep(880,.06,'sine')}
      if(hold>=HOLD){win(a);return}}
    else if(hold>0){below+=dt;if(below>.25){hold=0;below=0;a.beep(220,.12,'sawtooth')}}
    /* ---- 조각이 떨어졌는데 목표 미달 ---- */
    if(!queue.length&&hold===0){if(allStill(w))stillT+=dt;else stillT=Math.max(0,stillT-dt*.5);
      if(stillT>1.4){a.pop(W/2,220,ko?'디저트가 모자라요':'Out of treats','#ff8fab');lose(a,'empty')}}
  }
  function stepWorld(a,dt){acc+=dt;var n=0,k;
    while(acc>=DT&&n<14){step(w);n++;acc-=DT;
      for(k=0;k<w.ev.length;k++){var e=w.ev[k],b=e.b,T=b.T;
        if(e.t==='land'){var v=Math.min(1,e.v/400);a.beep(T.pitch*(.9+Math.random()*.15),.08+.05*v,'sine');
          setTimeout(function(p){return function(){a.beep(p,.07,'triangle')}}(T.pitch*(T.glassy?2.2:1.5)),55);
          b.hit=.35;a.burst(b.cx,b.y1,T.col[1],4+Math.round(v*5));if(v>.6)a.shake(2+v*3)}
        else if(e.t==='bump'){a.beep(T.pitch*(1.2+Math.random()*.2),.05,'sine')}
        else if(e.t==='glue'){a.beep(523,.1,'sine');a.beep(784,.14,'sine');a.burst(e.x,e.y,'#ffd36b',12);a.pop(e.x,e.y-10,a.lang==='ko'?'착!':'Stuck!','#e8a317')}
        else if(e.t==='fall'){if(mode==='play'){lives--;noLoss=false;a.sfx('hit');a.shake(6);a.burst(b.cx,Math.min(b.cy,TABLE_Y-6),T.col[1],14);
            a.pop(b.cx<40?50:b.cx>W-40?W-50:b.cx,TABLE_Y-40,'-♥','#ff5d73')}
          ghosts.push({b:b,t:0})}}}
    if(n===14)acc=0;
    for(k=ghosts.length-1;k>=0;k--){ghosts[k].t+=dt;if(ghosts[k].t>.9)ghosts.splice(k,1)}}

  /* =================== 그리기 =================== */
  function rr(g,x,y,w2,h2,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w2,y,x+w2,y+h2,r);g.arcTo(x+w2,y+h2,x,y+h2,r);g.arcTo(x,y+h2,x,y,r);g.arcTo(x,y,x+w2,y,r);g.closePath()}
  function smooth(g,xs,ys,n){var i,mx=(xs[n-1]+xs[0])/2,my=(ys[n-1]+ys[0])/2;g.beginPath();g.moveTo(mx,my);
    for(i=0;i<n;i++){var j=i+1===n?0:i+1;g.quadraticCurveTo(xs[i],ys[i],(xs[i]+xs[j])/2,(ys[i]+ys[j])/2)}g.closePath()}
  function heart(g,x,y,s,col){g.fillStyle=col;g.beginPath();g.moveTo(x,y+s*.35);g.bezierCurveTo(x,y,x-s*.5,y-s*.1,x-s*.5,y+s*.3);
    g.bezierCurveTo(x-s*.5,y+s*.6,x-s*.1,y+s*.75,x,y+s);g.bezierCurveTo(x+s*.1,y+s*.75,x+s*.5,y+s*.6,x+s*.5,y+s*.3);
    g.bezierCurveTo(x+s*.5,y-s*.1,x,y,x,y+s*.35);g.fill()}

  function makeBg(){bgc=document.createElement('canvas');bgc.width=W;bgc.height=H;var g=bgc.getContext('2d'),i;
    var gr=g.createLinearGradient(0,0,0,TABLE_Y);gr.addColorStop(0,'#ffe9ef');gr.addColorStop(1,'#ffd6e0');g.fillStyle=gr;g.fillRect(0,0,W,TABLE_Y);
    for(i=0;i<W;i+=28){g.fillStyle='rgba(255,255,255,.45)';g.fillRect(i,0,13,TABLE_Y);g.fillStyle='rgba(255,170,190,.18)';g.fillRect(i+13,0,2,TABLE_Y)}
    /* 아래 판벽 */
    var wg=g.createLinearGradient(0,440,0,TABLE_Y);wg.addColorStop(0,'#bfe8d8');wg.addColorStop(1,'#a3d9c5');g.fillStyle=wg;g.fillRect(0,446,W,TABLE_Y-446);
    g.fillStyle='#fff7f2';g.fillRect(0,438,W,9);g.fillStyle='rgba(0,0,0,.06)';g.fillRect(0,447,W,3);
    for(i=10;i<W;i+=58){g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=2;rr(g,i,462,46,112,6);g.stroke()}
    /* 창문 틀 */
    g.fillStyle='rgba(120,60,80,.12)';rr(g,20,66,128,150,10);g.fill();
    g.fillStyle='#fffaf6';rr(g,16,60,128,150,10);g.fill();
    /* 진열장 */
    g.fillStyle='rgba(120,60,80,.12)';rr(g,232,214,120,96,8);g.fill();
    g.fillStyle='#e8a8b8';rr(g,228,208,120,96,8);g.fill();g.fillStyle='#fdf2f5';rr(g,234,214,108,78,6);g.fill();
    g.fillStyle='rgba(255,255,255,.7)';g.fillRect(234,252,108,3);
    function mini(x,y,c1,c2){g.fillStyle=c1;rr(g,x-12,y-14,24,14,4);g.fill();g.fillStyle=c2;rr(g,x-12,y-16,24,5,3);g.fill();g.fillStyle='#ff4d6d';g.beginPath();g.arc(x,y-18,3,0,7);g.fill()}
    mini(252,249,'#f6d7a7','#fff');mini(288,249,'#ffb3c6','#fff');mini(322,249,'#c9a27e','#fff3e0');
    mini(260,287,'#fff0a8','#c98a1c');mini(300,287,'#9be5c7','#fff');
    g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.moveTo(240,216);g.lineTo(262,216);g.lineTo(242,290);g.lineTo(236,290);g.fill();
    /* 간판 */
    g.fillStyle='#ff8fab';rr(g,232,170,112,28,14);g.fill();g.fillStyle='#fff';g.font='15px Jua, system-ui, sans-serif';g.textAlign='center';
    g.fillText(SG.lang==='ko'?'말랑 카페':'JELLY CAFÉ',288,189);
    g.strokeStyle='#d98aa6';g.lineWidth=1.5;g.beginPath();g.moveTo(250,170);g.lineTo(262,150);g.lineTo(314,150);g.lineTo(326,170);g.stroke();
    /* 카운터 */
    var cg=g.createLinearGradient(0,TABLE_Y,0,H);cg.addColorStop(0,'#f3c79a');cg.addColorStop(.18,'#e2a873');cg.addColorStop(.2,'#fff0f3');cg.addColorStop(1,'#ffd9e2');
    g.fillStyle=cg;g.fillRect(0,TABLE_Y,W,H-TABLE_Y);
    for(i=0;i<W;i+=22){g.fillStyle='rgba(255,143,171,.35)';g.fillRect(i,TABLE_Y+10,11,H-TABLE_Y)}
    g.fillStyle='rgba(255,255,255,.5)';g.fillRect(0,TABLE_Y,W,2);g.fillStyle='rgba(120,60,30,.25)';g.fillRect(0,TABLE_Y+9,W,2)}

  function drawBg(g,t,dt){
    if(!bgc)makeBg();g.drawImage(bgc,0,0);var i,p;
    /* 창밖 하늘 + 구름 */
    g.save();rr(g,24,68,112,134,6);g.clip();var sg=g.createLinearGradient(0,68,0,202);sg.addColorStop(0,'#8fd3ff');sg.addColorStop(1,'#d9f3ff');g.fillStyle=sg;g.fillRect(24,68,112,134);
    g.fillStyle='rgba(255,236,150,.9)';g.beginPath();g.arc(110,96,13,0,7);g.fill();
    for(i=0;i<clouds.length;i++){p=clouds[i];p.x+=p.v*dt;if(p.x>170)p.x=-30;g.fillStyle='rgba(255,255,255,.95)';g.beginPath();
      g.ellipse(p.x,p.y,22*p.s,9*p.s,0,0,7);g.ellipse(p.x-9*p.s,p.y-6*p.s,11*p.s,9*p.s,0,0,7);g.ellipse(p.x+8*p.s,p.y-7*p.s,13*p.s,10*p.s,0,0,7);g.fill()}
    g.restore();
    g.fillStyle='#fffaf6';g.fillRect(77,68,6,134);g.fillRect(24,132,112,6);
    /* 커튼 */
    g.fillStyle='#ffb3c6';g.beginPath();g.moveTo(12,56);g.quadraticCurveTo(34+Math.sin(t*.8)*3,130,22,214);g.lineTo(12,214);g.fill();
    g.beginPath();g.moveTo(148,56);g.quadraticCurveTo(126+Math.sin(t*.8+1)*3,130,138,214);g.lineTo(148,214);g.fill();
    g.fillStyle='#ff8fab';g.fillRect(8,52,144,8);
    /* 먼지/빛 */
    for(i=0;i<motes.length;i++){p=motes[i];var my=((p.y-t*p.v)%440+440)%440,mx=p.x+Math.sin(t*.6+p.p)*10;
      g.fillStyle='rgba(255,255,255,'+(.3+.25*Math.sin(t+p.p))+')';g.beginPath();g.arc(mx,my,1.8,0,7);g.fill()}
    /* 커피잔 + 김 */
    var cx=300,cy=TABLE_Y;g.fillStyle='rgba(0,0,0,.12)';g.beginPath();g.ellipse(cx,cy+1,26,4,0,0,7);g.fill();
    g.fillStyle='#fff';g.beginPath();g.ellipse(cx,cy-2,24,5,0,0,7);g.fill();
    g.fillStyle='#fffaf6';rr(g,cx-15,cy-30,30,27,9);g.fill();g.strokeStyle='#ffb3c6';g.lineWidth=3;g.beginPath();g.arc(cx+16,cy-17,7,-1.4,1.4);g.stroke();
    g.fillStyle='#ff8fab';g.fillRect(cx-15,cy-21,30,4);g.fillStyle='#8a5a3c';g.beginPath();g.ellipse(cx,cy-29,13,3,0,0,7);g.fill();
    if(Math.random()<dt*4)steam.push({x:cx-6+Math.random()*12,y:cy-34,t:0,s:Math.random()*6});
    g.lineCap='round';
    for(i=steam.length-1;i>=0;i--){p=steam[i];p.t+=dt;if(p.t>2.4){steam.splice(i,1);continue}
      var sy=p.y-p.t*26,sx=p.x+Math.sin(p.t*2.4+p.s)*5;g.strokeStyle='rgba(255,255,255,'+(.55*(1-p.t/2.4))+')';g.lineWidth=4+p.t*3;
      g.beginPath();g.moveTo(sx,sy);g.quadraticCurveTo(sx+4,sy-6,sx,sy-12);g.stroke()}}

  function drawStand(g,t){
    var m=w.m,ox=w.ox,ang=w.ang;
    g.fillStyle='rgba(90,40,60,.16)';g.beginPath();g.ellipse(PCX,TABLE_Y+2,62,7,0,0,7);g.fill();
    if(m.tilt){ /* 웨이터의 팔: 화면 왼쪽에서 뻗어 와 접시 밑을 받친다 */
      var hx=PCX+ox,hy=Y0+PT+12;g.save();g.lineCap='round';
      g.strokeStyle='#4b4470';g.lineWidth=22;g.beginPath();g.moveTo(-20,hy+52);g.quadraticCurveTo(hx-90,hy+44,hx-34,hy+8);g.stroke();
      g.strokeStyle='#6a6194';g.lineWidth=6;g.beginPath();g.moveTo(-20,hy+46);g.quadraticCurveTo(hx-92,hy+38,hx-38,hy+3);g.stroke();
      g.strokeStyle='#fff';g.lineWidth=24;g.beginPath();g.moveTo(hx-40,hy+12);g.lineTo(hx-30,hy+4);g.stroke();
      g.translate(hx,hy);g.rotate(ang);g.fillStyle='#fffafc';g.beginPath();g.ellipse(-6,-3,34,9,0,0,7);g.fill();
      g.strokeStyle='rgba(150,130,170,.5)';g.lineWidth=1.5;g.stroke();
      g.fillStyle='#fffafc';for(var f=0;f<4;f++){g.beginPath();g.ellipse(14+f*5,-9,3.5,6,.2,0,7);g.fill();g.stroke()}
      g.restore()}
    else{var sg=g.createLinearGradient(PCX-14,0,PCX+14,0);sg.addColorStop(0,'#f6e7ff');sg.addColorStop(.5,'#fff');sg.addColorStop(1,'#d9c6ea');
      g.fillStyle=sg;g.beginPath();g.moveTo(PCX-8+ox,Y0+PT);g.lineTo(PCX+8+ox,Y0+PT);g.lineTo(PCX+16,TABLE_Y-6);g.lineTo(PCX-16,TABLE_Y-6);g.fill();
      g.beginPath();g.ellipse(PCX,TABLE_Y-4,44,7,0,0,7);g.fill();g.strokeStyle='rgba(150,120,180,.4)';g.lineWidth=1.5;g.stroke()}
    g.save();g.translate(PCX+ox,Y0);g.rotate(ang);
    g.fillStyle='rgba(90,40,60,.15)';g.beginPath();g.ellipse(0,PT+3,PW/2-4,5,0,0,7);g.fill();
    var pg=g.createLinearGradient(0,-2,0,PT+2);pg.addColorStop(0,'#ffffff');pg.addColorStop(1,'#e3dcef');g.fillStyle=pg;
    rr(g,-PW/2-3,-3,PW+6,PT+4,6);g.fill();
    g.strokeStyle='#8fb8ff';g.lineWidth=2;g.beginPath();g.moveTo(-PW/2+4,PT-3);g.lineTo(PW/2-4,PT-3);g.stroke();
    if(m.spin){g.fillStyle='#ff8fab';for(var i=-5;i<=5;i++){var px=((i*18-ox*3)%198+297)%198-99;g.beginPath();g.arc(px,PT-3,2.2,0,7);g.fill()}}
    g.fillStyle='rgba(255,255,255,.9)';g.fillRect(-PW/2+6,-2,PW-12,2);
    g.restore()}

  /* 디저트 한 개(점 배열 + 몸체 축 변환) */
  function drawDessert(g,type,xs,ys,n,cx,cy,th,sx,sy,o){
    var T=TYPES[type],c=T.col,al=o.alpha==null?1:o.alpha,y0=1e9,y1=-1e9,i;
    for(i=0;i<n;i++){if(ys[i]<y0)y0=ys[i];if(ys[i]>y1)y1=ys[i]}
    g.save();g.globalAlpha=al;
    /* 곰젤리 귀(몸 뒤) */
    if(type==='gum'){g.save();g.translate(cx,cy);g.rotate(th);g.scale(sx,sy);g.fillStyle=c[1];
      g.beginPath();g.arc(-9,T.top+2,6.5,0,7);g.arc(9,T.top+2,6.5,0,7);g.fill();g.fillStyle=c[0];g.beginPath();g.arc(-9,T.top+2,3,0,7);g.arc(9,T.top+2,3,0,7);g.fill();g.restore()}
    smooth(g,xs,ys,n);
    var gr=g.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,c[0]);gr.addColorStop(.55,c[1]);gr.addColorStop(1,c[2]);
    g.fillStyle=gr;if(T.glassy)g.globalAlpha=al*.9;g.fill();g.globalAlpha=al;
    g.save();g.clip();
    g.translate(cx,cy);g.rotate(th);g.scale(sx,sy);
    var top=T.top,bot=T.bot,hw=T.hw;
    if(type==='pud'){var cg=g.createLinearGradient(0,top,0,top+16);cg.addColorStop(0,'#7a3d12');cg.addColorStop(1,'#b5651d');g.fillStyle=cg;
      g.beginPath();g.moveTo(-hw-4,top-4);g.lineTo(hw+4,top-4);g.lineTo(hw+4,top+9);
      for(i=6;i>=-6;i--){var dx=i/6*hw,dr=(i%2?4:9)+Math.sin(i*1.7)*2;g.quadraticCurveTo(dx+hw/12,top+11+dr,dx,top+9)}g.closePath();g.fill()}
    else if(type==='pan'){g.fillStyle='#d6234a';g.beginPath();g.moveTo(-hw-4,top-4);g.lineTo(hw+4,top-4);g.lineTo(hw+4,top+6);
      for(i=5;i>=-5;i--){var ex=i/5*hw;g.quadraticCurveTo(ex+hw/10,top+8+(i%2?10:4),ex,top+6)}g.closePath();g.fill();
      g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(-6,top+3,6,2,0,0,7);g.fill()}
    else if(type==='cak'){g.fillStyle='#fff8ee';g.fillRect(-hw-4,-6,hw*2+8,5);g.fillRect(-hw-4,8,hw*2+8,4);
      g.fillStyle='#ff9fb4';g.fillRect(-hw-4,-1,hw*2+8,3);
      g.fillStyle='#fffdf8';g.fillRect(-hw-4,top-4,hw*2+8,10);
      for(i=0;i<9;i++){g.fillStyle=['#ff6f91','#8fd3ff','#ffd36b','#9be59b'][i%4];g.save();g.translate(-hw+6+i*7.4,top+3+(i%3));g.rotate(i);g.fillRect(-2,-.8,4,1.6);g.restore()}}
    else if(type==='moc'){g.fillStyle='rgba(255,255,255,.75)';for(i=0;i<12;i++){g.beginPath();g.arc(Math.sin(i*2.3)*hw*.8,top+6+((i*7)%20),1,0,7);g.fill()}}
    else if(type==='jel'){g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;rr(g,-hw+6,top+6,hw*2-12,(bot-top)-12,7);g.stroke();
      g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.arc(hw-12,bot-12,2.5,0,7);g.arc(hw-18,bot-8,1.5,0,7);g.fill()}
    else if(type==='gum'){g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.ellipse(0,6,8,8,0,0,7);g.fill()}
    /* 하이라이트(변형과 함께 움직임) */
    g.fillStyle='rgba(255,255,255,'+(T.glassy?.55:.45)+')';g.beginPath();g.ellipse(-hw*.45,top+(bot-top)*.32,hw*.18,(bot-top)*.12,-.5,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.arc(-hw*.62,top+(bot-top)*.2,2,0,7);g.fill();
    g.restore();
    smooth(g,xs,ys,n);g.strokeStyle=o.chill?'#6ec6ff':c[2];g.lineWidth=o.chill?3:2;g.globalAlpha=al*.85;g.stroke();g.globalAlpha=al;
    if(o.glaze){g.strokeStyle='rgba(255,200,60,'+(.6+.3*Math.sin(tG*8))+')';g.lineWidth=3;g.setLineDash([4,5]);smooth(g,xs,ys,n);g.stroke();g.setLineDash([])}
    /* 위 장식(몸 밖으로 나오는 것) */
    g.save();g.translate(cx,cy);g.rotate(th);g.scale(sx,sy);
    if(type==='cak'){g.fillStyle='#fffdf8';for(i=-2;i<=2;i++){g.beginPath();g.arc(i*11,top-1,5.5,Math.PI,0);g.fill()}
      g.fillStyle='#ff3b5c';g.beginPath();g.arc(0,top-8,5,0,7);g.fill();g.fillStyle='#4caf50';g.fillRect(-1,top-15,2,5);
      g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.arc(-1.5,top-9.5,1.5,0,7);g.fill()}
    else if(type==='pan'){g.fillStyle='#57b85a';g.beginPath();g.ellipse(4,top-2,5,2.4,-.5,0,7);g.ellipse(-3,top-2,5,2.4,.5,0,7);g.fill()}
    else if(type==='moc'){g.fillStyle='rgba(255,140,170,.5)';g.beginPath();g.arc(0,top+3,4,0,7);g.fill()}
    if(o.chill){g.fillStyle='rgba(190,232,255,.35)';g.beginPath();g.ellipse(0,0,hw,(bot-top)/2,0,0,7);g.fill()}
    /* 얼굴 */
    var fy=T.face||2,es=type==='gum'?5:type==='cak'?8:8.5,mood=o.mood,ink='#4a2a22';
    g.fillStyle='rgba(255,110,130,.45)';g.beginPath();g.ellipse(-es-5,fy+5,4,2.5,0,0,7);g.ellipse(es+5,fy+5,4,2.5,0,0,7);g.fill();
    g.strokeStyle=ink;g.fillStyle=ink;g.lineWidth=1.8;g.lineCap='round';
    if(mood==='dizzy'){for(var s=-1;s<=1;s+=2){g.beginPath();for(var k=0;k<14;k++){var aa=k*.9+tG*9*s,rad=k*.22;g.lineTo(s*es+Math.cos(aa)*rad,fy+Math.sin(aa)*rad)}g.stroke()}
      g.beginPath();g.ellipse(0,fy+8,2.6,3.2,0,0,7);g.fill()}
    else if(mood==='worried'){g.beginPath();g.moveTo(-es-3,fy-1);g.lineTo(-es+2,fy+1.5);g.lineTo(-es-3,fy+4);g.stroke();
      g.beginPath();g.moveTo(es+3,fy-1);g.lineTo(es-2,fy+1.5);g.lineTo(es+3,fy+4);g.stroke();
      g.beginPath();g.moveTo(-4,fy+9);g.quadraticCurveTo(-2,fy+7,0,fy+9);g.quadraticCurveTo(2,fy+11,4,fy+9);g.stroke();
      g.fillStyle='rgba(120,200,255,.85)';g.beginPath();g.moveTo(hw*.6,fy-8);g.quadraticCurveTo(hw*.6+4,fy-2,hw*.6,fy-1);g.quadraticCurveTo(hw*.6-4,fy-2,hw*.6,fy-8);g.fill()}
    else if(mood==='scared'){g.fillStyle='#fff';g.beginPath();g.arc(-es,fy,3.6,0,7);g.arc(es,fy,3.6,0,7);g.fill();g.stroke();
      g.fillStyle=ink;g.beginPath();g.arc(-es,fy,1.5,0,7);g.arc(es,fy,1.5,0,7);g.fill();g.beginPath();g.ellipse(0,fy+8,2.4,3,0,0,7);g.fill()}
    else if(mood==='happy'||mood==='chill'){g.beginPath();g.arc(-es,fy+1.5,2.8,3.4,6.0);g.stroke();g.beginPath();g.arc(es,fy+1.5,2.8,3.4,6.0);g.stroke();
      g.fillStyle='#c2413b';g.beginPath();g.arc(0,fy+6,3.4,0,3.14);g.fill()}
    else{var bl=o.blink;if(bl){g.beginPath();g.moveTo(-es-2.5,fy);g.lineTo(-es+2.5,fy);g.moveTo(es-2.5,fy);g.lineTo(es+2.5,fy);g.stroke()}
      else{g.beginPath();g.ellipse(-es,fy,2.1,2.7,0,0,7);g.ellipse(es,fy,2.1,2.7,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(-es-.7,fy-1,.8,0,7);g.arc(es-.7,fy-1,.8,0,7);g.fill()}
      g.beginPath();g.arc(0,fy+5,2.6,.25,2.9);g.stroke()}
    g.restore();g.restore()}

  function moodOf(b){if(b.chill>0)return 'chill';if(!b.landed||(b.vcy>260))return 'scared';if(b.wob>34||Math.abs(b.th)>.35)return 'dizzy';
    if((b.sy||1)<.93||b.hit>0)return 'worried';if(mode==='clear'||(hold>0&&b.landed))return 'happy';
    b.calm=(b.slow>=1)?(b.calm||0)+.016:0;return b.calm>1.2&&((b.calm+b.id)%7)<4.5?'happy':'calm'}
  function blinkOf(b){b.blink=(b.blink||0)+.016;var p=(b.blink+b.id*1.37)%3.4;return p<.12}

  function draw(g,a,dt){
    dt=dt||0;var ko=a.lang==='ko',t=tG,i,k,b;
    drawBg(g,t,dt);
    if(!w)return;
    /* 바람 */
    if(w.m.wind){var ws=w.wind;g.save();g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=2;g.lineCap='round';
      for(i=0;i<9;i++){var ph=((t*(.5+ws/300)+i*.37)%1),yy=180+((i*71)%320),xx=-30+ph*(W+60);g.globalAlpha=Math.sin(ph*3.14)*.8;
        g.beginPath();g.moveTo(xx,yy);g.quadraticCurveTo(xx+14,yy-4,xx+30,yy);g.stroke()}g.restore();
      g.save();g.translate(30,TABLE_Y-30);g.fillStyle='#8fd3ff';g.fillRect(-4,10,8,20);g.beginPath();g.ellipse(0,30,16,4,0,0,7);g.fill();
      g.fillStyle='#e8f7ff';g.beginPath();g.arc(0,0,17,0,7);g.fill();g.strokeStyle='#5fb6e8';g.lineWidth=2;g.stroke();
      g.fillStyle='#5fb6e8';for(i=0;i<3;i++){var ba=t*14+i*2.09;g.beginPath();g.ellipse(Math.cos(ba)*7,Math.sin(ba)*7,7,3,ba,0,7);g.fill()}g.restore()}
    drawStand(g,t);
    /* 목표선 + 체리 */
    var ty=Y0-L.t,hp=Math.min(1,hold/HOLD);
    g.save();g.strokeStyle=hold>0?'#ff4d6d':'rgba(214,60,100,.75)';g.lineWidth=hold>0?3:2;g.setLineDash([8,7]);g.lineDashOffset=-t*20;
    g.beginPath();g.moveTo(52,ty);g.lineTo(CHX-14,ty);g.stroke();g.restore();
    var jy=cherryJoy>0?-Math.abs(Math.sin(t*12))*8:Math.sin(t*2.2)*1.5;
    g.save();g.translate(CHX,ty+jy);
    if(hold>0){g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=5;g.beginPath();g.arc(0,0,17,0,7);g.stroke();
      g.strokeStyle='#ff4d6d';g.beginPath();g.arc(0,0,17,-Math.PI/2,-Math.PI/2+hp*6.283);g.stroke()}
    g.strokeStyle='#3f8f3f';g.lineWidth=2;g.beginPath();g.moveTo(1,-9);g.quadraticCurveTo(4,-18,10,-21);g.stroke();
    g.fillStyle='#5fbf5f';g.beginPath();g.ellipse(13,-20,5,2.5,.4,0,7);g.fill();
    var cg2=g.createRadialGradient(-3,-4,1,0,0,11);cg2.addColorStop(0,'#ff8a9e');cg2.addColorStop(1,'#d81b3c');g.fillStyle=cg2;g.beginPath();g.arc(0,0,10,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(-4,-4,2.5,1.6,-.6,0,7);g.fill();
    g.strokeStyle='#5a0f1e';g.fillStyle='#5a0f1e';g.lineWidth=1.4;
    if(cherryJoy>0||hold>0){g.beginPath();g.arc(-3.5,0,1.8,3.4,6);g.stroke();g.beginPath();g.arc(3.5,0,1.8,3.4,6);g.stroke()}
    else if((t%4)<.12){g.beginPath();g.moveTo(-5,0);g.lineTo(-2,0);g.moveTo(2,0);g.lineTo(5,0);g.stroke()}
    else{g.beginPath();g.arc(-3.5,-.5,1.3,0,7);g.arc(3.5,-.5,1.3,0,7);g.fill()}
    g.beginPath();g.arc(0,3,2,.2,2.9);g.stroke();g.restore();
    g.font='12px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='rgba(180,40,80,.85)';g.fillText(ko?'목표':'Goal',54,ty-6);
    if(hold>0){g.font='22px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle='#ff4d6d';
      g.fillText(Math.max(1,Math.ceil(HOLD-hold))+'',CHX,ty-26)}
    /* 그림자 */
    for(k=0;k<w.bodies.length;k++){b=w.bodies[k];if(b.st!==1)continue;var d=Math.max(0,Math.min(1,1-(Y0-b.y1)/220));
      if(b.y1<Y0-4&&b.x1>PCX-PW/2&&b.x0<PCX+PW/2){g.fillStyle='rgba(90,40,60,'+(.12*d)+')';g.beginPath();g.ellipse(b.cx,Y0-3,(b.x1-b.x0)/2*(.6+d*.4),3,0,0,7);g.fill()}}
    /* 디저트 */
    for(k=0;k<w.bodies.length;k++){b=w.bodies[k];if(b.st!==1)continue;
      drawDessert(g,b.type,b.x,b.y,b.n,b.cx,b.cy,b.th||0,b.sx||1,b.sy||1,{mood:moodOf(b),blink:blinkOf(b),chill:b.chill>0,glaze:b.glaze})}
    for(k=0;k<ghosts.length;k++){var gh=ghosts[k];b=gh.b;
      drawDessert(g,b.type,b.x,b.y,b.n,b.cx,b.cy,b.th||0,b.sx||1,b.sy||1,{mood:'dizzy',alpha:Math.max(0,1-gh.t/.9)})}
    /* 숟가락 + 매달린 디저트 */
    var hasHeld=queue.length&&mode==='play',hp2=heldPos(),hx=hp2[0],hyy=hp2[1],sa=swingOff()/60;
    var appear=cool>0?1-cool/.55:1;
    if(hasHeld){var type=queue[0],T=TYPES[type],n=T.n,xs=[],ys=[],jig=Math.sin(t*9)*.03*(1+(heldT>3.5?2:0)),sxh=1+jig,syh=1/sxh,
        dy=(1-appear)*-40,co=Math.cos(sa),si=Math.sin(sa);
      for(i=0;i<n;i++){var qx=T.rx[i]*sxh,qy=T.ry[i]*syh;xs.push(hx+co*qx-si*qy);ys.push(hyy+dy+si*qx+co*qy)}
      /* 떨어질 자리 안내선 */
      g.save();g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;g.setLineDash([3,6]);g.beginPath();g.moveTo(hx,hyy+T.bot+6);g.lineTo(hx,Y0-towerTop(w,1e9)-4);g.stroke();g.restore();
      drawDessert(g,type,xs,ys,n,hx,hyy+dy,sa,sxh,syh,{mood:heldT>3.5?'scared':'calm',blink:(t%3.1)<.12,glaze:glazeNext,alpha:Math.min(1,appear*1.5)});
      drawSpoon(g,hx,hyy+dy+T.top-3,sa)}
    else drawSpoon(g,spoonX+swingOff(),Math.max(SPAWN_Y-30,heldY-30)-(mode==='play'?0:20),sa);
    /* 자동 낙하 경고 */
    if(hasHeld&&heldT>AUTO-2&&cool<=0&&hold===0){var r2=(AUTO-heldT)/2;g.strokeStyle='rgba(255,77,109,.85)';g.lineWidth=3;g.beginPath();g.arc(hx,hyy,TYPES[queue[0]].hw+12,-Math.PI/2,-Math.PI/2+r2*6.283);g.stroke()}
    drawUI(g,a,t)}

  function drawSpoon(g,x,y,sa){g.save();g.translate(x,y);g.rotate(sa);
    var len=y-26;g.fillStyle='rgba(60,40,70,.12)';rr(g,-1,-len,8,len-8,3);g.fill();
    var hg=g.createLinearGradient(-4,0,4,0);hg.addColorStop(0,'#c9cfe0');hg.addColorStop(.5,'#ffffff');hg.addColorStop(1,'#a9b0c6');
    g.fillStyle=hg;rr(g,-3.5,-len,7,len-10,3);g.fill();
    g.fillStyle='#ff8fab';rr(g,-5,-len,10,22,4);g.fill();
    var bg=g.createRadialGradient(-4,-6,1,0,-2,16);bg.addColorStop(0,'#ffffff');bg.addColorStop(1,'#aab2c8');g.fillStyle=bg;
    g.beginPath();g.ellipse(0,-4,15,8,0,0,7);g.fill();g.strokeStyle='rgba(110,118,150,.6)';g.lineWidth=1.2;g.stroke();
    g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.ellipse(-6,-7,4,1.6,-.3,0,7);g.fill();g.restore()}

  function drawUI(g,a,t){var ko=a.lang==='ko',i;
    g.fillStyle='rgba(214,80,120,.82)';g.fillRect(0,0,W,32);g.fillStyle='rgba(255,255,255,.25)';g.fillRect(0,30,W,2);
    /* 시간 */
    var low=time<10,tw=Math.ceil(time);g.fillStyle='rgba(255,255,255,.85)';rr(g,8,38,78,26,13);g.fill();
    g.fillStyle=lastGain>0?'#2f9e5b':low?'#e0334f':'#8a3b58';g.font=(low?19+Math.sin(t*12):18)+'px Jua, system-ui, sans-serif';g.textAlign='center';
    g.fillText('⏱ '+tw,47,57);
    if(lastGain>0){g.globalAlpha=Math.min(1,lastGain*2);g.font='13px Jua, system-ui, sans-serif';g.fillText('+'+GAIN,47,78);g.globalAlpha=1}
    /* 단계 */
    g.font='16px Jua, system-ui, sans-serif';g.fillStyle='#8a3b58';g.fillText((ko?'단계 ':'Level ')+(lvN+1),W/2,56);
    /* 목숨 */
    for(i=0;i<3;i++)heart(g,W-118+i*20,44,15,i<lives?'#ff4d6d':'rgba(140,60,80,.25)');
    /* 다음 조각 */
    if(queue.length>1&&mode==='play'){var bx=326,by=98;g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(bx,by,24,0,7);g.fill();
      g.strokeStyle='#ff8fab';g.lineWidth=2;g.stroke();var T=TYPES[queue[1]],s=.42,xs=[],ys=[];
      for(i=0;i<T.n;i++){xs.push(bx+T.rx[i]*s);ys.push(by+2+T.ry[i]*s)}
      drawDessert(g,queue[1],xs,ys,T.n,bx,by+2,0,s,s,{mood:'calm',blink:false});
      g.fillStyle='#ff6f91';g.font='13px Jua, system-ui, sans-serif';g.fillText('↻',bx+18,by-14);
      g.fillStyle='#8a3b58';g.font='11px Jua, system-ui, sans-serif';g.fillText((ko?'다음':'Next')+(queue.length>2?' +'+(queue.length-2):''),bx,by+36)}
    else if(queue.length===1&&mode==='play'){g.fillStyle='#8a3b58';g.font='12px Jua, system-ui, sans-serif';g.fillText(ko?'마지막!':'Last one!',326,100)}
    /* 파워업 버튼 */
    function btn(x,y,n,kind){g.fillStyle=n>0?'#ffffff':'rgba(255,255,255,.4)';g.beginPath();g.arc(x,y,18,0,7);g.fill();
      g.strokeStyle=kind==='chill'?'#6ec6ff':'#f2b632';g.lineWidth=2.5;g.stroke();g.save();g.translate(x,y);g.globalAlpha=n>0?1:.35;
      if(kind==='chill'){g.strokeStyle='#4aa8e8';g.lineWidth=2;for(var k=0;k<3;k++){g.rotate(Math.PI/3);g.beginPath();g.moveTo(-9,0);g.lineTo(9,0);g.moveTo(-6,-3);g.lineTo(-4,0);g.lineTo(-6,3);g.moveTo(6,-3);g.lineTo(4,0);g.lineTo(6,3);g.stroke()}}
      else{g.fillStyle='#ffc93c';g.beginPath();g.moveTo(0,-10);g.quadraticCurveTo(9,2,0,9);g.quadraticCurveTo(-9,2,0,-10);g.fill();g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.arc(-2.5,1,2,0,7);g.fill()}
      g.restore();g.fillStyle='#ff4d6d';g.beginPath();g.arc(x+13,y-12,8,0,7);g.fill();g.fillStyle='#fff';g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(n,x+13,y-8)}
    if(L.chill)btn(36,616,chillN,'chill');if(L.glue)btn(86,616,glueN,'glue');
    /* 힌트 */
    if(L.hint&&hintT<7&&drops<3&&mode==='play'){var tx=L.hint[ko?'ko':'en'];g.font='17px Jua, system-ui, sans-serif';var wd=g.measureText(tx).width+26;
      g.globalAlpha=Math.min(1,(7-hintT)*1.5);g.fillStyle='rgba(255,255,255,.92)';rr(g,W/2-wd/2,204,wd,30,15);g.fill();g.strokeStyle='#ff8fab';g.lineWidth=2;g.stroke();
      g.fillStyle='#b23a64';g.textAlign='center';g.fillText(tx,W/2,225);g.globalAlpha=1}
    if(lvN===0&&drops===0&&mode==='play'){var hx=spoonX+Math.sin(t*2)*40;g.globalAlpha=.75;g.fillStyle='#fff';g.font='13px Jua, system-ui, sans-serif';g.textAlign='center';
      g.fillText(kb?(ko?'← → 움직이고 스페이스로 놓기':'← → to move · Space to drop'):(ko?'끌어서 움직이고 손을 떼면 퐁!':'Drag to aim · let go to drop'),W/2,250);g.globalAlpha=1}
    if(kb&&mode==='play'&&lvN<4){g.font='11px Jua, system-ui, sans-serif';g.fillStyle='rgba(138,59,88,.8)';g.textAlign='center';
      g.fillText(ko?'←→ 이동 · 스페이스 놓기 · ↓ 순서 바꾸기 · C 얼리기 · G 풀':'←→ move · Space drop · ↓ swap · C chill · G glue',W/2-10,TABLE_Y+30)}
    /* 배너 */
    if(mode==='clear'||mode==='fail'){var p=Math.min(1,modeT*3),txt=mode==='clear'?(ko?'탑 완성!':'Tower holds!'):(lives<=0?(ko?'와르르…':'Toppled…'):(ko?'아쉬워요…':'So close…'));
      g.save();g.translate(W/2,300);g.scale(.6+.4*p+(mode==='clear'?Math.sin(modeT*10)*.03:0),.6+.4*p);g.globalAlpha=p;
      g.fillStyle=mode==='clear'?'rgba(255,111,145,.95)':'rgba(110,90,120,.9)';rr(g,-110,-30,220,58,29);g.fill();
      g.fillStyle='#fff';g.font='28px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(txt,0,9);g.restore();g.globalAlpha=1}
    if(flash>0){g.fillStyle='rgba(255,80,110,'+flash*.18+')';g.fillRect(0,0,W,H)}}

  window.__jt={state:function(){return {lv:lvN,mode:mode,lives:lives,time:time,queue:queue.slice(),hold:hold,h:towerTop(w),spoon:spoonX,bodies:w.bodies.filter(function(b){return b.st===1}).map(function(b){return [b.type,Math.round(b.cx),Math.round(b.cy)]})}}};
  SG.run({id:'jelly-tower',title:{ko:'말랑 디저트 탑',en:'Jelly Tower'},
    how:{ko:'숟가락을 움직여 말랑한 디저트를 떨어뜨리고, 체리 높이까지 쌓아 3초 버티세요!',en:'Aim the spoon, drop the squishy desserts and stack them up to the cherry. Hold for 3 seconds!'},
    init:init,update:update,draw:draw});
})();
