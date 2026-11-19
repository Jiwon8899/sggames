/* 바람 연날리기 (Kite Wind) — 조작은 연줄 하나. 누르면 감고(양력), 떼면 풀린다(바람 따라 흘러감).
   하늘에는 높이마다 다른 바람층이 있고, 연은 받음각에 따라 양력·항력을 받는 몸체, 연줄은 길이 제약이다.
   시뮬레이션은 DOM 없이 고정 스텝으로 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,GY=574,HAND=34,KIDV=40,LMIN=56,LMAX=452,REEL=25,PAY=30,PAYF=80,G=150,
      STEP=1/120,KQ=.02,CLA=1.6,CD0=.2,CDA=1.3,AH=.42,AR=.13,ARATE=6,TSPIN=2400,ALT_TOP=500,LEAD=110,TB=30,KO=70,PAY0=18,SLACK=30,BOTN=24,BOTSUB=36;

  /* ---------- 스테이지 ----------
     좌표는 스테이지 시작 기준. 아이는 x=0에서 len까지 오른쪽으로 걷고, 바람은 대개 맞바람(음수=왼쪽으로 부는 바람)이라 연은 아이 뒤에서 난다.
     len: 걷는 거리, layers:[[아래,위,바람,돌풍세기]], rings:[[x,높이]], q: 필요한 고리 수,
     seeds/stars:[[x,높이]], trees:[[x,수관 중심 높이,반지름]], birds:[[x,높이,속도,출발시각]], wires:[[x1,x2,높이]] */
  var STAGES=[
    {len:540,layers:[[0,999,-110,0]],rings:[[130,150],[220,190],[310,215],[400,185]],q:3,stars:[[360,240]],
      hint:{ko:'꾹 누르면 감고, 떼면 풀어요',en:'Hold to reel in, release to let out'}},
    {len:540,layers:[[0,150,-68,0],[150,999,-135,0]],rings:[[140,170],[230,230],[320,260],[410,240]],q:3,seeds:[[270,280],[380,200]],
      hint:{ko:'아래 바람은 약해요 — 톡톡 당겨 위층으로!',en:'Weak wind below — tug it up into the strong layer!'}},
    {len:560,layers:[[0,160,-70,0],[160,999,-130,0]],trees:[[260,130,42]],rings:[[140,200],[250,235],[350,230],[440,200]],q:3,stars:[[300,280]],
      hint:{ko:'나무보다 높이 날아요',en:'Fly higher than the tree'}},
    {len:560,layers:[[0,150,-70,0],[150,260,-170,.3],[260,999,-120,0]],rings:[[130,130],[230,290],[330,310],[430,280]],q:3,seeds:[[290,200]],
      hint:{ko:'돌풍 띠에선 감지 말고 풀어요!',en:'In the gust band, let out — don\'t reel!'}},
    {len:560,layers:[[0,160,-70,0],[160,999,-130,0]],birds:[[560,235,-60,1.5],[600,300,-55,5]],rings:[[130,220],[220,270],[320,250],[420,230]],q:3,
      stars:[[370,320]],hint:{ko:'새와 부딪히면 빙글빙글!',en:'Bump a bird and you\'ll tumble!'}},
    {len:580,layers:[[0,170,-70,0],[170,999,-130,0]],trees:[[190,130,42],[380,150,46]],rings:[[120,190],[270,240],[340,260],[460,230]],q:3,
      seeds:[[230,290],[420,280]],hint:{ko:'씨앗은 바람 따라 흔들려요',en:'Seeds sway in the wind'}},
    {len:580,layers:[[0,999,-115,0]],wires:[[220,380,215]],rings:[[120,230],[270,140],[340,135],[460,240]],q:3,stars:[[300,110]],
      hint:{ko:'전깃줄 밑에선 연을 낮게!',en:'Keep low under the power line!'}},
    {len:580,layers:[[0,150,60,0],[150,999,-130,0]],trees:[[300,140,44]],rings:[[140,220],[250,260],[360,280],[460,240]],q:3,seeds:[[320,240]],
      hint:{ko:'아래 바람은 거꾸로 불어요 — 내려가지 마요',en:'The low wind blows backwards — stay up!'}},
    {len:600,layers:[[0,140,-70,0],[140,240,-165,.3],[240,999,-120,0]],birds:[[640,320,-60,3]],wires:[[360,480,240]],
      rings:[[150,190],[260,300],[400,150],[510,280]],q:3,stars:[[330,330]],hint:{ko:'바람층을 골라 타요',en:'Pick the right layer'}},
    {len:620,layers:[[0,150,-70,0],[150,270,-150,.3],[270,999,70,0]],trees:[[170,130,42]],birds:[[700,230,-70,4]],wires:[[400,520,230]],
      rings:[[120,190],[260,240],[340,250],[440,160],[530,240]],q:4,seeds:[[300,200]],stars:[[480,140]],hint:{ko:'전부 다 써 봐요!',en:'Use everything!'}}
  ];

  /* ---------- 결정적 난수 ---------- */
  function rng(seed){var s=seed>>>0||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}

  /* 절차 생성 스테이지(11번째부터). 봇이 통과하는 것만 채택한다. */
  function genStage(n,trySeed){
    var r=rng(n*7919+(trySeed||0)*104729+13),i;
    var len=580+Math.floor(r()*80),layers=[],b1=150+Math.floor(r()*50),b2=b1+100+Math.floor(r()*40);
    var lowW=(r()<.25?-1:1)*(62+Math.floor(r()*16)),midKind=r(),highW=(r()<.25?-1:1)*(104+Math.floor(r()*18));
    if(midKind<.4){layers=[[0,b1,lowW,0],[b1,999,highW,0]];b2=null}
    else layers=[[0,b1,lowW,0],[b1,b2,(midKind<.7?-1:1)*(130+Math.floor(r()*24)),.3],[b2,999,highW,0]];
    var st={len:len,layers:layers,rings:[],q:3,trees:[],birds:[],wires:[],seeds:[],stars:[],gen:true};
    var nR=4+(n>16&&r()<.5?1:0),x=LEAD+120+Math.floor(r()*40),wireAt=n>12&&r()<.45?1+Math.floor(r()*(nR-2)):-1;
    for(i=0;i<nR;i++){
      var alt=i===wireAt?120+Math.floor(r()*40):140+Math.floor(r()*(b2?260:220));
      st.rings.push([x,alt]);
      if(i===wireAt)st.wires.push([x-120,x+90,alt+80+Math.floor(r()*20)]);
      x+=110+Math.floor(r()*40)}
    st.q=nR-1;
    if(r()<.7){var tx=st.rings[1][0]+50+Math.floor(r()*60);if(!st.wires.length||tx<st.wires[0][0]-80||tx>st.wires[0][1]+80)st.trees.push([tx,130+Math.floor(r()*40),42+Math.floor(r()*10)])}
    if(n>11&&r()<.6)st.birds.push([len+250+Math.floor(r()*100),220+Math.floor(r()*150),-(60+Math.floor(r()*30)),1+r()*5]);
    st.seeds.push([st.rings[1][0]+40,200+Math.floor(r()*150)]);
    st.stars.push([st.rings[2][0]+50,160+Math.floor(r()*200)]);
    return st}

  function getStage(n){if(n<STAGES.length)return STAGES[n];
    for(var k=0;k<40;k++){var s=genStage(n,k);if(botRun(s,null).clear){s.tries=k;return s}}
    return STAGES[1+(n%(STAGES.length-1))]}

  /* ---------- 바람 ---------- */
  function layerWind(L,t){return L[2]*(1+(L[3]?L[3]*(.7*Math.sin(t*2.6)+.3*Math.sin(t*6.1+1)):0))}
  function wind(st,alt,t){
    var ls=st.layers,i,B=22;
    for(i=0;i<ls.length;i++){var L=ls[i];
      if(alt<L[1]-B||i===ls.length-1)return layerWind(L,t);
      if(alt<L[1]+B&&i+1<ls.length){var f=(alt-(L[1]-B))/(2*B);f=f*f*(3-2*f);return layerWind(L,t)*(1-f)+layerWind(ls[i+1],t)*f}}
    return layerWind(ls[ls.length-1],t)}

  function angDiff(a,b){var d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d}

  /* ---------- 시뮬레이션 ---------- */
  function newSim(st,carry,startAlt){
    var S={st:st,t:0,aoa:AR,thN:0,kid:0,kx:60,ky:150,vx:0,vy:0,th:2.4,w:0,L:150,T:0,Tr:0,over:0,spin:0,spinDir:1,snag:0,snagKind:'',
      crash:false,wob:0,glide:0,side:1,ev:[],got:st.rings.map(function(){return false}),nGot:0,res:null,immune:0,
      seeds:(st.seeds||[]).map(function(p){return {x:p[0],y:p[1],ox:p[0],oy:p[1],got:false,ph:p[0]*.01}}),
      stars:(st.stars||[]).map(function(p){return {x:p[0],y:p[1],got:false}}),
      birds:(st.birds||[]).map(function(b){return {x:b[0],y:b[1],v:b[2],t0:b[3],flee:0,hit:false}}),reel:false,taut:false};
    if(carry){S.kx=carry.kx;S.ky=carry.ky;S.vx=carry.vx;S.vy=carry.vy;S.th=carry.th;S.w=carry.w;S.L=carry.L;S.side=carry.side;S.T=carry.T}
    else{S.side=wind(st,160,0)-KIDV*.6<0?-1:1;var sa=startAlt||170;S.kx=5+S.side*110;S.ky=sa;S.L=Math.hypot(110,sa-HAND);S.vx=KIDV;S.th=S.side<0?.7:2.44}
    return S}
  function carryOf(S){var o=S.st.len;return {kx:S.kx-o,ky:S.ky,vx:S.vx,vy:S.vy,th:S.th,w:S.w,L:S.L,side:S.side,T:S.T}}

  /* 처진 연줄: 손 → 연까지 2차 베지어. 느슨할수록·장력이 약할수록 많이 처진다 */
  function stringPts(S,n){
    var hx=S.kid+5,hy=HAND,dx=S.kx-hx,dy=S.ky-hy,d=Math.hypot(dx,dy)||1,slack=Math.max(0,S.L-d),
        sag=Math.min(95,2+slack*1.35+d*.09*Math.max(0,1-S.T/(2.6*G))),
        cx=hx+dx*.5-S.side*sag*.18,cy=hy+dy*.5-sag,pts=[],i;
    n=n||10;
    for(i=0;i<=n;i++){var t=i/n,a=(1-t)*(1-t),b=2*t*(1-t),c=t*t;pts.push([a*hx+b*cx+c*S.kx,a*hy+b*cy+c*S.ky])}
    return pts}
  function segCircle(ax,ay,bx,by,cx,cy,r){var dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l>0?((cx-ax)*dx+(cy-ay)*dy)/l:0;
    t=t<0?0:t>1?1:t;var px=ax+dx*t-cx,py=ay+dy*t-cy;return px*px+py*py<r*r}
  function segSeg(a,b,c,d){var r1=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),r2=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]),
    r3=(d[0]-c[0])*(a[1]-c[1])-(d[1]-c[1])*(a[0]-c[0]),r4=(d[0]-c[0])*(b[1]-c[1])-(d[1]-c[1])*(b[0]-c[0]);return r1*r2<0&&r3*r4<0}
  function wirePts(w){var pts=[],i;for(i=0;i<=8;i++){var t=i/8;pts.push([w[0]+(w[1]-w[0])*t,w[2]-16*4*t*(1-t)])}return pts}
  function birdPos(S,b){var tt=S.t-b.t0;if(tt<0)return null;return [b.x+b.v*tt+(b.flee?b.flee*0:0),b.y+Math.sin(tt*3)*8+b.flee]}

  function startSnag(S,kind,dur){S.snag=dur;S.snagKind=kind;S.vx=S.vy=0;S.w*=.2;S.glide=0;S.ev.push({t:'snag',k:kind,x:S.kx,y:S.ky})}
  function startSpin(S,dir,why){if(S.spin>0)return;S.spin=1.25;S.spinDir=dir||1;S.w=S.spinDir*11;S.glide=0;S.over=0;S.ev.push({t:'spin',k:why,x:S.kx,y:S.ky})}

  function step(S,reel,fast){
    var st=S.st,dt=STEP,i;S.t+=dt;S.reel=reel;
    if(S.immune>0)S.immune-=dt;
    if(S.snag>0){S.snag-=dt;
      if(S.snag<=0){S.immune=1.1;
        if(S.snagKind==='ground'){S.kx=S.kid+5+S.side*34;S.ky=HAND+78;S.L=Math.hypot(34,78);S.vx=0;S.vy=40;S.th=Math.PI/2+S.side*.5;S.w=0}
        else{S.vy=70;S.ky+=6}
        S.ev.push({t:'free',x:S.kx,y:S.ky})}
      S.T*=.9;return}
    S.kid+=KIDV*dt;
    var hx=S.kid+5,hy=HAND;
    var dx=S.kx-hx,dy=S.ky-hy,dist=Math.hypot(dx,dy)||1;
    /* 받음각: 줄을 당기면 굴레가 팽팽해져 연이 고개를 들고(AH), 놓으면 꼬리가 바람 쪽으로 눕힌다(AR) */
    var aT=reel?AH:AR;S.aoa+=(aT-S.aoa)*Math.min(1,dt*ARATE);
    if(reel)S.L=Math.max(LMIN,S.L-REEL*dt);
    var wv=wind(st,S.ky,S.t),ax=wv-S.vx,ay=-S.vy,sp=Math.hypot(ax,ay)||1e-6;
    /* 돌풍층의 난류는 자세를 흔든다 */
    var turb=0,ls=st.layers;for(i=0;i<ls.length;i++)if(ls[i][3]&&S.ky>ls[i][0]&&S.ky<ls[i][1])turb=ls[i][3];
    /* 양력(겉보기 바람에 수직, 위쪽)·항력(겉보기 바람 방향). 빙글 도는 중엔 연 자세를 따라 양력 방향이 돈다 */
    var a=S.aoa,cl=CLA*Math.sin(2*a),cd=CD0+CDA*a*a,q=KQ*sp*sp,lx=-ay/sp,ly=ax/sp;if(ly<0){lx=-lx;ly=-ly}
    if(S.spin>0){var ph=S.th-S.thN,cs=Math.cos(ph),sn=Math.sin(ph),l2=lx*cs-ly*sn;ly=lx*sn+ly*cs;lx=l2;cl*=.7;cd+=.5}
    var fx=q*(cl*lx+cd*ax/sp),fy=q*(cl*ly+cd*ay/sp);
    S.vx+=fx*dt;S.vy+=(fy-G)*dt;
    var px=S.kx,py=S.ky;S.kx+=S.vx*dt;S.ky+=S.vy*dt;
    dx=S.kx-hx;dy=S.ky-hy;dist=Math.hypot(dx,dy)||1;
    var ux=dx/dist,uy=dy/dist,load=fx*ux+(fy-G)*uy;
    /* 풀 때: 연이 당기는 힘이 브레이크를 넘으면 줄이 풀려 나간다 */
    if(!reel){if(dist>S.L&&load>TB)S.L=Math.min(LMAX,S.L+Math.min(dist-S.L,(fast?PAYF:PAY)*dt));
      if(dist>=S.L-1)S.L=Math.min(LMAX,S.L+PAY0*dt)}
    var corr=0;if(dist>S.L){corr=dist-S.L;S.kx=hx+ux*S.L;S.ky=hy+uy*S.L;dist=S.L}
    S.taut=dist>=S.L-.5;
    S.vx=(S.kx-px)/dt;S.vy=(S.ky-py)/dt;
    S.Tr=S.taut?Math.max(0,load):0;S.T+=(S.Tr-S.T)*Math.min(1,dt/.25);
    /* 보이는 자세: 바람이 오는 쪽으로 코를 두고 받음각만큼 든다(임계 감쇠 + 난류) */
    S.thN=Math.atan2(-ay,-ax)+(ax>0?-1:1)*a;S.side=ax>0?1:-1;
    if(S.spin>0){S.spin-=dt;S.w*=Math.pow(.6,dt);if(S.spin<=0){S.w*=.2}}
    else S.w+=(KO*angDiff(S.thN,S.th)-2*Math.sqrt(KO)*S.w+turb*(Math.sin(S.t*13.7)+Math.sin(S.t*7.3+2))*40*Math.min(1,sp/120))*dt;
    S.th+=S.w*dt;
    S.wob+=(Math.abs(S.w)-S.wob)*Math.min(1,dt/.4);
    /* 과한 장력 → 빙글 */
    if(S.spin<=0){if(S.T>TSPIN)S.over+=dt;else S.over=Math.max(0,S.over-dt*2);if(S.over>.14)startSpin(S,S.side,'tension')}
    if(S.wob<1.1&&S.taut&&S.spin<=0)S.glide+=dt;else if(S.wob>2||S.spin>0)S.glide=0;
    /* 땅 */
    if(S.ky<8){S.ky=8;startSnag(S,'ground',1.5);return}
    if(S.ky>ALT_TOP+30){S.ky=ALT_TOP+30;S.vy=Math.min(S.vy,0)}
    /* 장애물 */
    if(S.immune<=0){
      var pts=null;
      for(i=0;i<(st.trees||[]).length;i++){var tr=st.trees[i];
        if(Math.abs(tr[0]-S.kx)<tr[2]+10&&Math.hypot(S.kx-tr[0],S.ky-tr[1])<tr[2]+7){startSnag(S,'tree',2);return}
        if(S.ky<tr[1]+tr[2]+6&&Math.min(hx,S.kx)<tr[0]+tr[2]&&Math.max(hx,S.kx)>tr[0]-tr[2]){pts=pts||stringPts(S,10);
          for(var j=0;j<pts.length-1;j++)if(segCircle(pts[j][0],pts[j][1],pts[j+1][0],pts[j+1][1],tr[0],tr[1],tr[2]-3)){startSnag(S,'tree',2);return}}}
      for(i=0;i<(st.wires||[]).length;i++){var wr=st.wires[i];
        if(Math.max(hx,S.kx)<wr[0]||Math.min(hx,S.kx)>wr[1])continue;
        var wp=wirePts(wr);pts=pts||stringPts(S,10);
        for(j=0;j<pts.length-1;j++)for(var k=0;k<wp.length-1;k++)if(segSeg(pts[j],pts[j+1],wp[k],wp[k+1])){startSnag(S,'wire',2);return}
        for(k=0;k<wp.length-1;k++)if(segCircle(wp[k][0],wp[k][1],wp[k+1][0],wp[k+1][1],S.kx,S.ky,8)){startSnag(S,'wire',2);return}}}
    for(i=0;i<S.birds.length;i++){var bd=S.birds[i],bp=birdPos(S,bd);if(!bp||bd.hit)continue;
      if(Math.hypot(bp[0]-S.kx,bp[1]-S.ky)<20){bd.hit=true;startSpin(S,bp[0]>S.kx?-1:1,'bird');S.ev.push({t:'bird',x:bp[0],y:bp[1]})}}
    /* 줍기 */
    for(i=0;i<st.rings.length;i++)if(!S.got[i]&&Math.hypot(st.rings[i][0]-S.kx,st.rings[i][1]-S.ky)<23){S.got[i]=true;S.nGot++;
      S.ev.push({t:'ring',x:st.rings[i][0],y:st.rings[i][1],glide:S.glide})}
    for(i=0;i<S.seeds.length;i++){var sd=S.seeds[i];if(sd.got)continue;
      sd.x=sd.ox+Math.sin(S.t*.9+sd.ph)*14+wind(st,sd.y,S.t)*.18*Math.sin(S.t*.35+sd.ph);sd.y=sd.oy+Math.sin(S.t*1.3+sd.ph)*10;
      if(Math.hypot(sd.x-S.kx,sd.y-S.ky)<20){sd.got=true;S.ev.push({t:'seed',x:sd.x,y:sd.y,glide:S.glide})}}
    for(i=0;i<S.stars.length;i++){var sr=S.stars[i];if(!sr.got&&Math.hypot(sr.x-S.kx,sr.y-S.ky)<20){sr.got=true;S.ev.push({t:'star',x:sr.x,y:sr.y,glide:S.glide})}}
    /* 스테이지 끝 */
    if(S.kid>=st.len&&!S.res){S.res=S.nGot>=st.q?'clear':'fail';S.ev.push({t:S.res})}
  }

  /* ---------- 봇: 목표 높이를 정하고, 짧은 앞날을 시뮬레이션해 감기/풀기 중 나은 쪽을 고른다 ---------- */
  function botTarget(S){
    var st=S.st,i,tgt=null,hx=S.kid+5,best=1e9,lo=40,hi=ALT_TOP-20;
    for(i=0;i<st.rings.length;i++){if(S.got[i])continue;var r=st.rings[i],ahead=r[0]-S.kx;
      if(ahead>-16&&ahead<best){best=ahead;tgt=r[1]}}
    if(tgt==null)tgt=230;
    for(i=0;i<(st.trees||[]).length;i++){var tr=st.trees[i],top=tr[1]+tr[2]+34,mn=Math.min(hx,S.kx)-tr[2]-60,mx=Math.max(hx,S.kx)+tr[2]+90;
      if(tr[0]>mn&&tr[0]<mx)lo=Math.max(lo,top)}
    for(i=0;i<(st.wires||[]).length;i++){var wr=st.wires[i],mn2=Math.min(hx,S.kx)-60,mx2=Math.max(hx,S.kx)+110;
      if(wr[1]>mn2&&wr[0]<mx2)hi=Math.min(hi,wr[2]-50)}
    if(lo>hi)tgt=hi;else tgt=Math.max(lo,Math.min(hi,tgt));
    return tgt}
  function cloneSim(S){var C={},k;for(k in S)C[k]=S[k];C.ev=[];C.got=S.got.slice();
    C.seeds=S.seeds.map(function(o){return Object.assign({},o)});C.stars=S.stars.map(function(o){return Object.assign({},o)});
    C.birds=S.birds.map(function(o){return Object.assign({},o)});return C}
  /* 후보 계획: 0.2초 단위 12칸(2.4초). 앞 k칸 감고 풀기 / 앞 k칸 풀고 감기 / 여러 박자의 펌프질 */
  var PLANS=[];(function(){var i,k;for(k=0;k<=10;k+=2){var A=[],B=[];for(i=0;i<10;i++){A.push(i<k?1:0);B.push(i<k?0:1)}PLANS.push(A);if(k>0&&k<10)PLANS.push(B)}
    [[1,1],[1,2],[2,1],[1,3]].forEach(function(p){for(var ph=0;ph<2;ph++){var A=[];for(i=0;i<10;i++){var m=(i+ph*p[0])%(p[0]+p[1]);A.push(m<p[0]?1:0)}PLANS.push(A)}})})();
  function planCost(S,plan){
    var C=cloneSim(S),cost=0,i,j,n=plan.length,sub=BOTSUB;
    for(i=0;i<n;i++){for(j=0;j<sub;j++){step(C,!!plan[i],false);
        for(var e=0;e<C.ev.length;e++){var ev=C.ev[e];
          if(ev.t==='snag')cost+=(ev.k==='ground'?4e6:5e6)*(1-i*.04);else if(ev.t==='spin')cost+=2.5e6*(1-i*.04);else if(ev.t==='ring')cost-=6e5}
        C.ev.length=0;if(C.snag>0||C.spin>1)break}
      if(C.snag>0||C.spin>1)break;
      var tg=botTarget(C),d=C.ky-tg;cost+=d*d*(1.2-i*.07)}
    cost+=C.over*4e5;
    return cost}
  function botInput(S,mem){
    if(mem.n>0&&mem.cur){mem.n--;return mem.cur}
    var best=1e18,bi=0;
    if(S.snag>0){mem.cur={reel:false,fast:false};mem.n=BOTN-1;return mem.cur}
    for(var i=0;i<PLANS.length;i++){var c=planCost(S,PLANS[i]);if(c<best){best=c;bi=i}}
    mem.cur={reel:!!PLANS[bi][0],fast:false};mem.n=BOTN-1;return mem.cur}
  /* 한 스테이지를 봇으로 끝까지. policy가 null이면 봇, 함수면 그 정책. */
  function botRun(st,policy,carry,maxT,startAlt){
    var S=newSim(st,carry,startAlt),mem={n:0},n=0,lim=(maxT||40)/STEP,stats={spins:0,snags:0,ground:0};
    while(!S.res&&n<lim){var inp=policy?policy(S,n):botInput(S,mem);step(S,inp.reel,inp.fast);n++;
      for(var i=0;i<S.ev.length;i++){var e=S.ev[i];if(e.t==='spin')stats.spins++;if(e.t==='snag'){stats.snags++;if(e.k==='ground')stats.ground++}}
      S.ev.length=0}
    return {clear:S.res==='clear',got:S.nGot,q:st.q,time:S.t,S:S,stats:stats}}

  var API={planCost:planCost,PLANS:PLANS,cloneSim:cloneSim,botTarget:botTarget,STAGES:STAGES,getStage:getStage,genStage:genStage,newSim:newSim,step:step,carryOf:carryOf,botRun:botRun,botInput:botInput,
    wind:wind,stringPts:stringPts,STEP:STEP,G:G,TSPIN:TSPIN,KIDV:KIDV,LMAX:LMAX,LMIN:LMIN};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  if(typeof SG==='undefined')return;
})();
