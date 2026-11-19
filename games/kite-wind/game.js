/* 바람 연날리기 (Kite Wind) — 조작은 연줄 하나. 누르면 감고(양력), 떼면 풀린다(바람 따라 흘러감).
   하늘에는 높이마다 다른 바람층이 있고, 연은 받음각에 따라 양력·항력을 받는 몸체, 연줄은 길이 제약이다.
   시뮬레이션은 DOM 없이 고정 스텝으로 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,GY=574,HAND=34,KIDV=40,LMIN=56,LMAX=452,REEL=25,PAY=30,PAYF=80,G=150,
      STEP=1/120,KQ=.02,CLA=1.6,CD0=.2,CDA=1.3,AH=.42,AR=.13,ARATE=6,TSPIN=2400,ALT_TOP=500,LEAD=110,TB=30,KO=70,PAY0=18,SLACK=30,BOTN=24,BOTSUB=36,DV=0;

  /* ---------- 스테이지 ----------
     좌표는 스테이지 시작 기준. 아이는 x=0에서 len까지 오른쪽으로 걷고, 바람은 대개 맞바람(음수=왼쪽으로 부는 바람)이라 연은 아이 뒤에서 난다.
     len: 걷는 거리, layers:[[아래,위,바람,돌풍세기]], rings:[[x,높이]], q: 필요한 고리 수,
     seeds/stars:[[x,높이]], trees:[[x,수관 중심 높이,반지름]], birds:[[x,높이,속도,출발시각]], wires:[[x1,x2,높이]] */
  var STAGES=[
    {len:540,layers:[[0,999,-110,0]],rings:[[150,150],[240,190],[320,215],[410,185]],q:3,stars:[[360,240]],
      hint:{ko:'꾹 누르면 감고, 떼면 풀어요',en:'Hold to reel in, release to let out'}},
    {len:540,layers:[[0,150,-68,0],[150,999,-135,0]],rings:[[140,170],[230,230],[320,260],[410,240]],q:3,seeds:[[270,280],[380,200]],
      hint:{ko:'아래 바람은 약해요 — 톡톡 당겨 위층으로!',en:'Weak wind below — tug it up into the strong layer!'}},
    {len:560,layers:[[0,160,-70,0],[160,999,-130,0]],trees:[[260,130,42]],rings:[[140,200],[250,235],[350,230],[440,200]],q:3,stars:[[300,280]],
      hint:{ko:'나무보다 높이 날아요',en:'Fly higher than the tree'}},
    {len:560,layers:[[0,150,-70,0],[150,260,-170,.3],[260,999,-120,0]],rings:[[130,130],[230,290],[330,310],[430,280]],q:3,seeds:[[290,200]],
      hint:{ko:'돌풍 띠에선 감지 말고 풀어요!',en:'In the gust band, let out — don\'t reel!'}},
    {len:560,layers:[[0,160,-70,0],[160,999,-130,0]],birds:[[560,235,-60,1.5],[600,300,-55,5]],rings:[[130,220],[220,270],[320,250],[420,230]],q:3,
      stars:[[370,320]],hint:{ko:'새와 부딪히면 빙글빙글!',en:'Bump a bird and you\'ll tumble!'}},
    {len:580,layers:[[0,170,-70,0],[170,999,-130,0]],trees:[[190,130,42],[380,150,46]],rings:[[160,200],[270,240],[340,260],[460,230]],q:3,
      seeds:[[230,290],[420,280]],hint:{ko:'씨앗은 바람 따라 흔들려요',en:'Seeds sway in the wind'}},
    {len:580,layers:[[0,999,-115,0]],wires:[[220,380,215]],rings:[[150,230],[270,140],[340,135],[470,250]],q:3,stars:[[300,110]],
      hint:{ko:'전깃줄 밑에선 연을 낮게!',en:'Keep low under the power line!'}},
    {len:580,layers:[[0,130,60,0],[130,999,-130,0]],trees:[[300,120,40]],rings:[[140,220],[250,260],[360,280],[460,240]],q:3,seeds:[[320,240]],
      hint:{ko:'아래 바람은 거꾸로 불어요 — 내려가지 마요',en:'The low wind blows backwards — stay up!'}},
    {len:600,layers:[[0,140,-70,0],[140,240,-165,.3],[240,999,-120,0]],birds:[[640,320,-60,3]],wires:[[390,500,250]],
      rings:[[150,190],[260,260],[430,170],[530,270]],q:3,stars:[[330,330]],hint:{ko:'바람층을 골라 타요',en:'Pick the right layer'}},
    {len:620,layers:[[0,150,-70,0],[150,270,-150,.3],[270,999,70,0]],trees:[[170,130,42]],birds:[[700,230,-70,4]],wires:[[410,520,245]],
      rings:[[150,190],[250,230],[340,245],[455,175],[545,230]],q:4,seeds:[[300,200]],stars:[[480,140]],hint:{ko:'전부 다 써 봐요!',en:'Use everything!'}}
  ];

  /* ---------- 결정적 난수 ---------- */
  function rng(seed){var s=seed>>>0||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}

  /* 절차 생성 스테이지(11번째부터). 빔 탐색 풀이기가 통과시킨 것만 채택한다. */
  function genStage(n,trySeed){
    var r=rng(n*7919+(trySeed||0)*104729+13),i,ri=function(a,b){return a+Math.floor(r()*(b-a+1))};
    var hard=Math.min(1,(n-10)/12),len=560+ri(0,60),b1=ri(130,165),layers,kind=r();
    var low=(n>13&&r()<.2)?[0,b1-15,ri(45,60),0]:[0,b1,-ri(62,74),0];
    var top=-ri(115,135),gust=null,topCap=470;
    if(kind<.45){layers=[low,[low[1],999,top,0]]}
    else{var b2=low[1]+ri(95,120);gust=[low[1],b2,-ri(160,172),.25+r()*.1];layers=[low,gust,[b2,999,top,0]]}
    if(n>15&&r()<.3){var tc=ri(330,370);layers[layers.length-1][1]=tc;layers.push([tc,999,ri(50,70),0]);topCap=tc-20}
    var st={len:len,layers:layers,rings:[],q:3,trees:[],birds:[],wires:[],seeds:[],stars:[],gen:n};
    var nR=r()<.3+hard*.4?5:4,x=ri(150,175),prev=ri(170,230),minA=low[2]>0?low[1]+45:120,wireAt=n>11&&r()<.35+hard*.3?ri(1,nR-2):-1;
    for(i=0;i<nR;i++){var alt;
      if(i===wireAt)alt=ri(130,155);
      else{alt=prev+ri(-80,80);alt=Math.max(minA,Math.min(topCap-30,Math.min(330,alt)))}
      if(i===wireAt){st.wires.push([x-ri(110,130),x+ri(60,80),alt+ri(75,90)])}
      st.rings.push([x,alt]);prev=alt;x+=ri(92,118)}
    st.q=nR===5?4:3;
    /* 나무: 고리 사이 낮은 자리, 고리보다 충분히 아래 */
    if(r()<.55+hard*.3){var k=ri(0,nR-2),tx=(st.rings[k][0]+st.rings[k+1][0])/2,lim=Math.min(st.rings[k][1],st.rings[k+1][1])-50,cr=ri(38,46),cy=Math.min(150,lim-cr);
      var clash=st.wires.some(function(w){return tx>w[0]-70&&tx<w[1]+70});if(cy>cr+50&&!clash)st.trees.push([tx,cy,cr])}
    if(n>11&&r()<.4+hard*.4){var br=st.rings[ri(1,nR-1)];st.birds.push([len+ri(60,160),br[1]+ri(-40,40),-ri(55,75),r()*5])}
    st.seeds.push([st.rings[1][0]+ri(30,50),Math.max(minA,st.rings[1][1]+ri(-40,40))]);
    st.stars.push([st.rings[nR-2][0]+ri(30,50),Math.max(minA,Math.min(topCap-20,st.rings[nR-2][1]+ri(-50,50)))]);
    st.hint=null;return st}

  /* 생성 스테이지 검증: 두 가지 시작 높이에서 모두 풀려야 채택 */
  function validStage(st){return solveStage(st,null,175,{beam:32}).ok&&solveStage(st,null,235,{beam:32}).ok}
  function getStage(n){if(n<STAGES.length)return STAGES[n];
    for(var k=0;k<30;k++){var s=genStage(n,k);if(validStage(s)){s.tries=k;return s}}
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
    S.vx+=fx*dt;S.vy+=(fy-G)*dt-S.vy*DV*dt;
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
  /* ---------- 빔 탐색 풀이기: 0.25초마다 감기/풀기 두 갈래로 펼쳐 상위 상태만 남긴다(풀이 존재 증명용) ----------
     조금씩 나눠 돌릴 수 있게(게임 중 다음 스테이지 검증) 작업 객체로 만든다. */
  function solverInit(st,carry,startAlt,opt){opt=opt||{};var root=newSim(st,carry,startAlt);root.plan=[];root.pen=0;
    return {BW:opt.beam||24,DEC:opt.dec||30,lim:(opt.maxT||30)/STEP,n:0,beam:[root],steps:0,res:null}}
  function solverRun(J,budget){
    var used=0;
    while(!J.res&&used<budget){
      if(J.n>=J.lim||!J.beam.length){J.res={ok:false,steps:J.steps,best:J.beam[0]&&J.beam[0].nGot,plan:J.beam[0]?J.beam[0].plan:[0]};break}
      var next=[],beam=J.beam,DEC=J.DEC;
      for(var b=0;b<beam.length&&!J.res;b++)for(var a=0;a<2;a++){var C=cloneSim(beam[b]);C.plan=beam[b].plan.concat(a);C.pen=beam[b].pen;
        for(var j=0;j<DEC&&!C.res;j++){step(C,!!a,false);J.steps++;used++;
          for(var e=0;e<C.ev.length;e++){var ev=C.ev[e];if(ev.t==='snag')C.pen+=ev.k==='ground'?2500:3000;else if(ev.t==='spin')C.pen+=1500}C.ev.length=0}
        if(C.res==='clear'){J.res={ok:true,plan:C.plan,S:C,steps:J.steps};break}
        if(C.res==='fail')continue;
        var tg=botTarget(C);C.score=C.nGot*10000-C.pen-Math.abs(C.ky-tg)*4-Math.max(0,C.T-TSPIN*.7)*.5-(C.snag>0?500:0);next.push(C)}
      if(J.res)break;
      J.n+=DEC;next.sort(function(x,y){return y.score-x.score});
      /* 비슷한 상태(높이·줄 길이·고리 수·상승/하강)는 하나만 남겨 다양성 유지 */
      var seen={},nb=[];for(var i=0;i<next.length&&nb.length<J.BW;i++){var c=next[i],key=(c.ky/16|0)+','+(c.L/40|0)+','+c.nGot+','+(c.vy>0?1:0);if(seen[key])continue;seen[key]=1;nb.push(c)}
      J.beam=nb}
    return J.res}
  function solveFrom(S,opt){opt=opt||{};var root=cloneSim(S);root.plan=[];root.pen=0;
    var J={BW:opt.beam||20,DEC:opt.dec||30,lim:(opt.maxT||5)/STEP,n:0,beam:[root],steps:0,res:null};while(!solverRun(J,1e9));return J.res}
  function solveStage(st,carry,startAlt,opt){var J=solverInit(st,carry,startAlt,opt);while(!solverRun(J,1e9));return J.res}

  /* 생성 + 검증 작업(조금씩 실행) */
  function genJob(n){return {n:n,k:0,st:null,phase:0,J:null,done:null}}
  function genJobRun(G,budget){
    var used=0;
    while(!G.done&&used<budget){
      if(G.k>=30){G.done=STAGES[1+(G.n%(STAGES.length-1))];break}
      if(!G.J){G.st=genStage(G.n,G.k);G.J=solverInit(G.st,null,G.phase?235:175,{beam:32})}
      var s0=G.J.steps,r=solverRun(G.J,budget-used);used+=G.J.steps-s0+1;
      if(r){if(!r.ok){G.k++;G.phase=0;G.J=null}else if(G.phase===0){G.phase=1;G.J=null}else{G.st.tries=G.k;G.done=G.st}}}
    return G.done}

  /* ---------- 한 판(헤드리스 규칙): 전체 카운트다운, 스테이지 이어 날기 ---------- */
  var T0=50,TADD=13,TCAP=70;
  function newRun(){var st=getStage(0);return {n:0,st:st,S:newSim(st),time:T0,off:0,clears:0,fails:0,over:false,ev:[],next:null,t:0}}
  function runTick(R,reel,fast){
    if(R.over)return;R.t+=STEP;
    R.time-=STEP;if(R.time<=0){R.time=0;R.over=true;R.ev.push({t:'over'});return}
    step(R.S,reel,fast);
    for(var i=0;i<R.S.ev.length;i++)R.ev.push(R.S.ev[i]);R.S.ev.length=0;
    if(R.S.res){var c=carryOf(R.S),len=R.st.len;
      if(R.S.res==='clear'){R.clears++;R.time=Math.min(TCAP,R.time+TADD);R.n++;
        R.st=R.next&&R.next.n===R.n?R.next.st:getStage(R.n);R.next=null}
      else R.fails++;
      R.off+=len;R.S=newSim(R.st,c);R.ev.push({t:'stage',n:R.n,retry:!!(R.fails&&R.S&&0)})}}

  /* 한 스테이지를 봇으로 끝까지. policy가 null이면 봇, 함수면 그 정책. */
  function botRun(st,policy,carry,maxT,startAlt){
    var S=newSim(st,carry,startAlt),mem={n:0},n=0,lim=(maxT||40)/STEP,stats={spins:0,snags:0,ground:0};
    while(!S.res&&n<lim){var inp=policy?policy(S,n):botInput(S,mem);step(S,inp.reel,inp.fast);n++;
      for(var i=0;i<S.ev.length;i++){var e=S.ev[i];if(e.t==='spin')stats.spins++;if(e.t==='snag'){stats.snags++;if(e.k==='ground')stats.ground++}}
      S.ev.length=0}
    return {clear:S.res==='clear',got:S.nGot,q:st.q,time:S.t,S:S,stats:stats}}

  var API={solveFrom:solveFrom,solveStage:solveStage,solverInit:solverInit,solverRun:solverRun,genJob:genJob,genJobRun:genJobRun,newRun:newRun,runTick:runTick,T0:T0,TADD:TADD,TCAP:TCAP,validStage:validStage,planCost:planCost,PLANS:PLANS,cloneSim:cloneSim,botTarget:botTarget,STAGES:STAGES,getStage:getStage,genStage:genStage,newSim:newSim,step:step,carryOf:carryOf,botRun:botRun,botInput:botInput,
    wind:wind,stringPts:stringPts,STEP:STEP,G:G,TSPIN:TSPIN,KIDV:KIDV,LMAX:LMAX,LMIN:LMIN};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  if(typeof SG==='undefined')return;

  /* ====================================================================== 게임 화면 */
  var R,cam=0,acc=0,tG=0,kb={reel:false,fast:false},prevReel=false,gen=null,tail=[],streaks=[],clouds=[],hintT=0,
      cheer=0,happy=0,ratchet=0,warnT=0,lastSec=0,flagPop=0,bandFade=1,prevLayers=null,stageT=0,birdsGone=[],retryT=0,mult=1,lastMult=1;
  if(!window.__kiteWindKeys){window.__kiteWindKeys=true;
    var kf=function(e,v){var c=e.code;
      if(c==='Space'||c==='ArrowUp'||c==='KeyW')kb.reel=v;else if(c==='ArrowDown'||c==='KeyS')kb.fast=v;else return};
    window.addEventListener('keydown',function(e){kf(e,true)});window.addEventListener('keyup',function(e){kf(e,false)});
    window.addEventListener('blur',function(){kb.reel=kb.fast=false})}
  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  function SX(wx){return wx-cam}
  function SY(alt){return GY-alt}

  function init(a){
    R=newRun();cam=R.S.kid-250;acc=0;tG=0;prevReel=false;gen=null;cheer=0;happy=0;ratchet=0;warnT=0;lastSec=0;flagPop=0;
    stageT=0;retryT=0;hintT=0;mult=1;lastMult=1;bandFade=1;prevLayers=null;
    tail=[];var kx=R.S.kx,ky=R.S.ky;for(var i=0;i<12;i++)tail.push({x:kx,y:ky-20-i*6,px:kx,py:ky-20-i*6});
    if(!streaks.length)for(i=0;i<70;i++)streaks.push({x:hash(i+3)*W,y:20+hash(i+7)*500,l:hash(i+11),v:.5+hash(i+13)*.5});
    clouds=[];for(i=0;i<7;i++)clouds.push({x:hash(i+21)*520-80,alt:110+hash(i+31)*380,s:.6+hash(i+41)*.7});
    window.__kite={get R(){return R},API:API};a.tempo(1)}

  function kiteFX(){return R.off+R.S.kx}
  function onEvent(e,a){
    var ko=a.lang==='ko',S=R.S,x=SX(R.off+(e.x!=null?e.x:S.kx)),y=SY(e.y!=null?e.y:S.ky),pts;
    if(e.t==='ring'){mult=1+Math.min(3,Math.floor(e.glide/2.5));pts=10*mult;a.add(pts);a.sfx('coin');a.beep(660+S.nGot*120,.12,'triangle');
      a.burst(x,y,'#ffd23f',14);a.burst(x,y,'#fff6c8',6);a.pop(x,y-26,'+'+pts,'#fff2a8');cheer=.8;happy=1.1;
      if(mult>1)a.pop(x,y-50,(ko?'완벽 활공 ×':'Perfect glide ×')+mult,'#bdf3ff')}
    else if(e.t==='seed'){mult=1+Math.min(3,Math.floor(e.glide/2.5));pts=5*mult;a.add(pts);a.beep(1320,.07,'sine');a.beep(1760,.09,'sine');
      a.burst(x,y,'#ffffff',10);a.pop(x,y-20,'+'+pts,'#ffffff');happy=.8}
    else if(e.t==='star'){mult=1+Math.min(3,Math.floor(e.glide/2.5));pts=15*mult;a.add(pts);a.sfx('jump');a.beep(1568,.12,'triangle');
      a.burst(x,y,'#ffe066',16);a.pop(x,y-24,'+'+pts,'#ffe066');happy=1;cheer=.6}
    else if(e.t==='snag'){a.sfx('hit');a.shake(e.k==='ground'?4:6);mult=1;
      a.burst(x,y,e.k==='tree'?'#7cc56b':e.k==='wire'?'#555c66':'#b98a5a',12);
      a.pop(x,y-24,e.k==='tree'?(ko?'나무에 걸렸어!':'Snagged in a tree!'):e.k==='wire'?(ko?'전깃줄에 엉켰어!':'Tangled on the wire!'):(ko?'털썩!':'Thud!'),'#ffd0c0')}
    else if(e.t==='spin'){a.beep(760,.08,'square');a.beep(560,.1,'square');a.beep(380,.16,'triangle');a.shake(3);mult=1;
      a.pop(x,y-26,e.k==='bird'?(ko?'새랑 쿵! 빙글~':'Bird bump! Spin~'):(ko?'너무 팽팽해! 빙글~':'Too taut! Spin~'),'#ffb3c7');a.burst(x,y,'#ffb3c7',8)}
    else if(e.t==='bird'){a.beep(1900,.05,'square');a.beep(2300,.06,'square');a.burst(x,y,'#ffffff',10)}
    else if(e.t==='free'){a.beep(520,.06,'triangle');a.beep(780,.08,'triangle')}
    else if(e.t==='clear'){a.sfx('win');var bonus=30+10*Math.max(0,S.nGot-R.st.q);a.add(bonus);cheer=1.4;happy=1.4;
      var fx=SX(R.off+R.st.len);a.burst(fx,SY(70),'#ff7aa8',14);a.burst(fx,SY(70),'#7ad7ff',14);a.burst(fx,SY(70),'#ffd23f',14);
      a.pop(fx,SY(110),(ko?'통과! +':'Clear! +')+bonus,'#fff2a8');a.pop(fx,SY(140),'+'+TADD+(ko?'초':'s'),'#c8ffd2');
      a.tempo(1+Math.min(.45,R.n*.035))}
    else if(e.t==='fail'){a.beep(247,.18,'triangle');a.beep(185,.3,'triangle');retryT=2.2;
      a.pop(SX(R.off+S.kid),SY(110),ko?'고리가 모자라요 — 다시!':'Not enough rings — again!','#ffd0c0')}
    else if(e.t==='stage'){stageT=0;hintT=0;prevLayers=null;bandFade=0}}

  function update(dt,inp,a){
    tG+=dt;stageT+=dt;hintT+=dt;
    var reel=!!(inp.down||kb.reel),fast=!!kb.fast&&!reel;
    acc+=Math.min(dt,.05);
    while(acc>=STEP){acc-=STEP;runTick(R,reel,fast);
      for(var i=0;i<R.ev.length;i++){var e=R.ev[i];if(e.t==='over'){R.ev.length=0;a.over();return}onEvent(e,a)}R.ev.length=0}
    var S=R.S;
    /* 다음 생성 스테이지는 미리 조금씩 검증해 둔다 */
    if(R.n+1>=STAGES.length&&(!R.next||R.next.n!==R.n+1)){if(!gen||gen.n!==R.n+1)gen=genJob(R.n+1);
      var d=genJobRun(gen,2500);if(d){R.next={n:gen.n,st:d};gen=null}}
    if(reel&&S.snag<=0){ratchet-=dt;if(ratchet<=0){ratchet=.13;a.beep(2100+Math.random()*300,.012,'square')}}else ratchet=0;
    if(S.T>TSPIN*.78&&S.spin<=0){warnT-=dt;if(warnT<=0){warnT=.22;a.beep(1250,.04,'sawtooth')}}
    var sec=Math.ceil(R.time);if(R.time<10&&sec!==lastSec){lastSec=sec;a.beep(880,.05,'square')}
    cheer=Math.max(0,cheer-dt);happy=Math.max(0,happy-dt);retryT=Math.max(0,retryT-dt);bandFade=Math.min(1,bandFade+dt*2);
    prevReel=reel}

  /* ---------------------------------------------------------------- 그리기 */
  function skyCols(){var k=(Math.sin(tG*.05)+1)/2;return [mix('#5ab4ff','#7b9cff',k),mix('#a9dcff','#c6c4ff',k),mix('#fff1d6','#ffe0e8',k)]}
  function mix(c1,c2,k){var a=parseInt(c1.slice(1),16),b=parseInt(c2.slice(1),16);
    var r=Math.round(((a>>16)&255)*(1-k)+((b>>16)&255)*k),g=Math.round(((a>>8)&255)*(1-k)+((b>>8)&255)*k),bb=Math.round((a&255)*(1-k)+(b&255)*k);
    return 'rgb('+r+','+g+','+bb+')'}
  function hillPath(g,par,base,amp,f,seed,col,col2){
    var off=cam*par,x;g.beginPath();g.moveTo(-10,H);
    for(x=-10;x<=W+10;x+=8){var wx=x+off,y=base+Math.sin(wx*f+seed)*amp+Math.sin(wx*f*2.3+seed*2)*amp*.4;g.lineTo(x,y)}
    g.lineTo(W+10,H);g.closePath();var gr=g.createLinearGradient(0,base-amp,0,H);gr.addColorStop(0,col);gr.addColorStop(1,col2);g.fillStyle=gr;g.fill()}
  function cloud(g,x,y,s,al){g.globalAlpha=al;g.fillStyle='rgba(255,255,255,.92)';g.beginPath();
    g.ellipse(x,y,30*s,11*s,0,0,7);g.ellipse(x-13*s,y-7*s,14*s,11*s,0,0,7);g.ellipse(x+12*s,y-9*s,17*s,13*s,0,0,7);g.fill();
    g.fillStyle='rgba(150,180,230,.25)';g.beginPath();g.ellipse(x+2*s,y+5*s,28*s,5*s,0,0,7);g.fill();g.globalAlpha=1}
  function windCol(w){return w>0?'255,150,140':Math.abs(w)>=145?'255,214,120':Math.abs(w)>=100?'255,255,255':'200,230,255'}

  function drawBands(g){
    var ls=R.st.layers,i,S=R.S,t=R.S.t;
    for(i=0;i<ls.length;i++){var L=ls[i],lo=L[0],hi=Math.min(L[1],560),y1=SY(hi),y2=SY(lo),w=L[2],col=windCol(w),gst=L[3];
      g.fillStyle='rgba('+col+','+(gst?.10:Math.abs(w)>=100?.05:.03)*bandFade+')';g.fillRect(0,y1,W,y2-y1);
      if(i>0){g.strokeStyle='rgba(255,255,255,'+.35*bandFade+')';g.lineWidth=1;g.setLineDash([6,8]);g.beginPath();g.moveTo(0,y2);g.lineTo(W,y2);g.stroke();g.setLineDash([])}
      /* 가장자리 화살표: 바람이 오는 쪽에 방향과 세기 */
      var mid=Math.max(60,Math.min(y2-14,(y1+y2)/2)),n=Math.abs(w)>=145?3:Math.abs(w)>=100?2:1,dir=w<0?-1:1,ex=dir<0?W-14:14,j;
      if(mid>y2-6||mid<44)continue;
      g.globalAlpha=bandFade;g.strokeStyle='rgba('+col+',.9)';g.lineWidth=3;g.lineCap='round';g.lineJoin='round';
      for(j=0;j<n;j++){var ax=ex+(dir<0?-j*9:j*9)+Math.sin(tG*4+j)*1.5;g.beginPath();g.moveTo(ax-dir*-5,mid-7);g.lineTo(ax+dir*3,mid);g.lineTo(ax-dir*-5,mid+7);g.stroke()}
      if(gst){g.font='12px Jua, system-ui, sans-serif';g.fillStyle='rgba(255,214,120,.95)';g.textAlign=dir<0?'right':'left';
        g.fillText(SG.lang==='ko'?'돌풍':'gust',dir<0?W-8:8,mid-12)}
      if(w>0){g.font='12px Jua, system-ui, sans-serif';g.fillStyle='rgba(255,170,160,.95)';g.textAlign='left';g.fillText(SG.lang==='ko'?'뒷바람':'tailwind',8,mid-12)}
      g.globalAlpha=1}}
  function drawStreaks(g,dt){
    var i,p,st=R.st;g.lineCap='round';
    for(i=0;i<streaks.length;i++){p=streaks[i];var alt=GY-p.y,w=wind(st,alt,R.S.t);
      p.x+=(w*(.85+p.v*.3)*dt)-((cam-(p.cam==null?cam:p.cam)));p.cam=cam;p.l+=dt*(.45+p.v*.3);
      if(p.l>1||p.x<-40||p.x>W+40){p.l=0;p.x=w<0?W*.15+hash(i+tG)*W*1.0:hash(i+tG)*W*.85;p.y=34+hash(i*3.1+tG)*(GY-60)}
      var al=Math.sin(p.l*Math.PI)*(Math.abs(w)>=145?.55:Math.abs(w)>=100?.42:.28),len=Math.abs(w)*.16*(.7+p.v*.6),dir=w<0?-1:1,
          gust=false;for(var k=0;k<st.layers.length;k++)if(st.layers[k][3]&&alt>st.layers[k][0]&&alt<st.layers[k][1])gust=true;
      g.strokeStyle='rgba('+windCol(w)+','+al+')';g.lineWidth=gust?2.2:1.6;g.beginPath();g.moveTo(p.x,p.y);
      if(gust)g.quadraticCurveTo(p.x-dir*len*.5,p.y+Math.sin(tG*9+i)*4,p.x-dir*len,p.y);else g.lineTo(p.x-dir*len,p.y);g.stroke()}}

  function drawTree(g,tr,shake){
    var x=SX(R.off+tr[0]),cy=SY(tr[1]),r=tr[2],sx=shake?Math.sin(tG*40)*2:0;if(x<-r-20||x>W+r+20)return;
    g.fillStyle='rgba(40,70,40,.25)';g.beginPath();g.ellipse(x+6,GY+3,r*.7,5,0,0,7);g.fill();
    g.fillStyle='#7a5638';g.beginPath();g.moveTo(x-6,GY+2);g.lineTo(x-4,cy+r*.4);g.lineTo(x+4,cy+r*.4);g.lineTo(x+7,GY+2);g.fill();
    g.strokeStyle='#6a4a30';g.lineWidth=3;g.beginPath();g.moveTo(x,cy+r*.6);g.lineTo(x-12,cy+r*.2);g.moveTo(x+1,cy+r*.7);g.lineTo(x+13,cy+r*.3);g.stroke();
    var blobs=[[0,0,1],[-.55,.25,.62],[.55,.22,.66],[-.25,-.45,.6],[.3,-.42,.58]],i;
    for(i=0;i<blobs.length;i++){var b=blobs[i];g.fillStyle=i===0?'#4f9a4a':'#5daa52';g.beginPath();g.arc(x+b[0]*r+sx,cy+b[1]*r,b[2]*r*.75,0,7);g.fill()}
    g.fillStyle='rgba(255,255,220,.22)';g.beginPath();g.arc(x-r*.25+sx,cy-r*.35,r*.35,0,7);g.fill();
    g.fillStyle='rgba(20,60,30,.22)';g.beginPath();g.ellipse(x+sx,cy+r*.45,r*.85,r*.3,0,0,7);g.fill();
    g.fillStyle='#ff8b8b';for(i=0;i<4;i++){g.beginPath();g.arc(x+(hash(tr[0]+i)-.5)*r*1.2+sx,cy+(hash(tr[0]+i+9)-.5)*r,2.4,0,7);g.fill()}}
  function drawWire(g,w,hot){
    var x1=SX(R.off+w[0]),x2=SX(R.off+w[1]);if(x2<-30||x1>W+30)return;var top=SY(w[2]+8),i,p=wirePts(w);
    [x1,x2].forEach(function(x){g.fillStyle='rgba(30,40,30,.25)';g.beginPath();g.ellipse(x+4,GY+3,8,3,0,0,7);g.fill();
      var gr=g.createLinearGradient(x-4,0,x+4,0);gr.addColorStop(0,'#8a6644');gr.addColorStop(1,'#5e432c');g.fillStyle=gr;g.fillRect(x-3.5,top,7,GY-top+2);
      g.fillStyle='#5e432c';g.fillRect(x-14,top+6,28,4);g.fillStyle='#d9e6f2';g.beginPath();g.arc(x-11,top+5,2.6,0,7);g.arc(x+11,top+5,2.6,0,7);g.fill()});
    g.strokeStyle=hot?'#ff6b5a':'#2d3440';g.lineWidth=2;g.beginPath();
    for(i=0;i<p.length;i++){var px=SX(R.off+p[i][0]),py=SY(p[i][1]);if(i)g.lineTo(px,py);else g.moveTo(px,py)}g.stroke();
    g.strokeStyle='rgba(45,52,64,.55)';g.lineWidth=1.4;g.beginPath();
    for(i=0;i<p.length;i++){px=SX(R.off+p[i][0]);py=SY(p[i][1]-10);if(i)g.lineTo(px,py);else g.moveTo(px,py)}g.stroke()}
  function ringHalf(g,x,y,front,al,glow){
    g.save();g.globalAlpha=al;g.lineWidth=5;g.strokeStyle=front?'#ffcf3a':'#c9961c';g.beginPath();
    g.ellipse(x,y,8,22,0,front?-Math.PI/2:Math.PI/2,front?Math.PI/2:Math.PI*1.5);g.stroke();
    if(front){g.lineWidth=1.6;g.strokeStyle='rgba(255,255,230,.9)';g.beginPath();g.ellipse(x+1,y,6,19,0,-1.2,.2);g.stroke()}
    if(glow&&front){g.globalAlpha=al*(.35+.25*Math.sin(tG*6));g.strokeStyle='#fff3a0';g.lineWidth=9;g.beginPath();g.ellipse(x,y,9,24,0,0,7);g.stroke()}
    g.restore()}
  function drawStar(g,x,y,r,rot){g.beginPath();for(var i=0;i<10;i++){var a=rot+i*Math.PI/5-Math.PI/2,q=i%2?r*.45:r;
      if(i)g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);else g.moveTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}g.closePath()}
  function drawSeed(g,x,y,ph){g.save();g.translate(x,y);g.rotate(Math.sin(tG*2+ph)*.3);g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=1;
    g.beginPath();g.moveTo(0,0);g.lineTo(0,10);g.stroke();for(var i=0;i<9;i++){var a=-Math.PI+i*Math.PI/8;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*8,Math.sin(a)*8-1);g.stroke()}
    g.fillStyle='#b48a5a';g.beginPath();g.ellipse(0,11,1.6,2.6,0,0,7);g.fill();g.restore()}
  function drawBird(g,b,S){var p=birdPos(S,b);if(!p)return;var x=SX(R.off+p[0]),y=SY(p[1]);
    if(b.hit){b.fly=(b.fly||0)+1/60;x+=b.fly*60;y-=b.fly*90}
    if(x<-30||x>W+30||y<-30)return;var fl=Math.sin(tG*14+b.x)*.9,dir=b.v<0?-1:1;
    g.save();g.translate(x,y);g.scale(dir<0?1:-1,1);if(b.hit)g.rotate(Math.sin(tG*10)*.6);
    g.fillStyle='rgba(30,40,60,.18)';g.beginPath();g.ellipse(2,14,9,2.5,0,0,7);g.fill();
    g.fillStyle='#5b6ee1';g.beginPath();g.ellipse(0,0,10,7,0,0,7);g.fill();g.fillStyle='#e8ecff';g.beginPath();g.ellipse(1,3,6,3.5,0,0,7);g.fill();
    g.fillStyle='#4656c4';g.beginPath();g.moveTo(-2,-1);g.quadraticCurveTo(4,-14*fl-2,10,-6*fl);g.lineTo(3,1);g.fill();
    g.fillStyle='#ffb347';g.beginPath();g.moveTo(-9,-1);g.lineTo(-15,1);g.lineTo(-9,3);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(-5,-2,2.6,0,7);g.fill();g.fillStyle='#222';g.beginPath();
    if(b.hit){g.arc(-5,-2,1.6,0,7);g.fill();g.strokeStyle='#222';g.lineWidth=1;g.beginPath();g.arc(-5,-2,2.4,0,5);g.stroke()}else{g.arc(-5.6,-2,1.2,0,7);g.fill()}
    g.restore()}

  function updTail(dt){
    if(!dt)return;var S=R.S,a=kiteAng(),bx=R.off+S.kx-Math.cos(a)*17,by=S.ky-Math.sin(a)*17,i,p,wv=wind(R.st,S.ky,S.t);
    var sub=2,h=Math.min(dt,.04)/sub;
    for(var s=0;s<sub;s++){
      for(i=0;i<tail.length;i++){p=tail[i];var vx=(p.x-p.px)*.96,vy=(p.y-p.py)*.96;p.px=p.x;p.py=p.y;
        p.x+=vx+(wv*.9-vx/h*.0)*h*h*6+Math.sin(tG*11+i*.8)*.35*(i/12);p.y+=vy-90*h*h+Math.cos(tG*9+i)*.25*(i/12)}
      tail[0].x=bx;tail[0].y=by;
      for(var it=0;it<3;it++){for(i=1;i<tail.length;i++){var A=tail[i-1],B=tail[i],dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy)||1,f=(d-7)/d;
        if(i===1){B.x-=dx*f;B.y-=dy*f}else{A.x+=dx*f*.5;A.y+=dy*f*.5;B.x-=dx*f*.5;B.y-=dy*f*.5}}tail[0].x=bx;tail[0].y=by}}}
  /* 연의 '위쪽' 방향(라디안, 위=+y): 바람 쪽으로 기울고, 당기면 더 서며, 흔들림·빙글이 더해진다 */
  function kiteAng(){var S=R.S,side=S.side||-1,dev=angDiff(S.th,S.thN);
    return Math.PI/2+side*(.42-(S.aoa-AR)*.9)+dev}
  function drawKite(g){
    var S=R.S,x=SX(R.off+S.kx),y=SY(S.ky),a=kiteAng();
    /* 꼬리 */
    g.lineCap='round';g.lineJoin='round';g.strokeStyle='#ff5d8f';g.lineWidth=2.4;g.beginPath();
    for(var i=0;i<tail.length;i++){var tx=SX(tail[i].x),ty=SY(tail[i].y);if(i)g.lineTo(tx,ty);else g.moveTo(tx,ty)}g.stroke();
    for(i=2;i<tail.length;i+=3){tx=SX(tail[i].x);ty=SY(tail[i].y);g.fillStyle=i%2?'#ffd166':'#6ad1c8';
      g.beginPath();g.moveTo(tx,ty);g.lineTo(tx-6,ty-4);g.lineTo(tx-6,ty+4);g.closePath();g.moveTo(tx,ty);g.lineTo(tx+6,ty-4);g.lineTo(tx+6,ty+4);g.closePath();g.fill()}
    g.save();g.translate(x,y);g.rotate(-(a-Math.PI/2));
    /* 그림자 */
    g.fillStyle='rgba(20,30,60,.16)';g.beginPath();g.moveTo(3,-15);g.lineTo(15,0);g.lineTo(3,21);g.lineTo(-9,0);g.fill();
    var T=[0,-18],Rt=[13,-3],B=[0,20],Lt=[-13,-3],C=[0,-1];
    function tri(p1,p2,col){g.fillStyle=col;g.beginPath();g.moveTo(C[0],C[1]);g.lineTo(p1[0],p1[1]);g.lineTo(p2[0],p2[1]);g.closePath();g.fill()}
    tri(T,Lt,'#ff8fb1');tri(T,Rt,'#ffd166');tri(B,Lt,'#5fcfc4');tri(B,Rt,'#ff9f5a');
    g.strokeStyle='#7a3b52';g.lineWidth=1.6;g.beginPath();g.moveTo(T[0],T[1]);g.lineTo(Rt[0],Rt[1]);g.lineTo(B[0],B[1]);g.lineTo(Lt[0],Lt[1]);g.closePath();g.stroke();
    g.strokeStyle='rgba(122,59,82,.55)';g.lineWidth=1;g.beginPath();g.moveTo(T[0],T[1]);g.lineTo(B[0],B[1]);g.moveTo(Lt[0],Lt[1]);g.lineTo(Rt[0],Rt[1]);g.stroke();
    /* 고양이 얼굴 */
    g.fillStyle='#fff7ee';g.beginPath();g.ellipse(0,-4,8.5,7,0,0,7);g.fill();
    g.beginPath();g.moveTo(-8,-7);g.lineTo(-7,-15);g.lineTo(-2,-10);g.closePath();g.moveTo(8,-7);g.lineTo(7,-15);g.lineTo(2,-10);g.closePath();g.fill();
    g.fillStyle='#ffb3c7';g.beginPath();g.moveTo(-6.5,-9);g.lineTo(-6,-13);g.lineTo(-3.5,-10.5);g.closePath();g.moveTo(6.5,-9);g.lineTo(6,-13);g.lineTo(3.5,-10.5);g.closePath();g.fill();
    var blink=(tG%3.2)<.12,ey=-5;g.strokeStyle='#3a2a2a';g.fillStyle='#3a2a2a';g.lineWidth=1.4;
    if(S.spin>0){for(var k=-1;k<=1;k+=2){g.beginPath();for(var q=0;q<12;q++){var ang=q*.9+tG*12,rr=q*.22;g.lineTo(k*3.4+Math.cos(ang)*rr,ey+Math.sin(ang)*rr)}g.stroke()}}
    else if(S.snag>0){g.beginPath();g.moveTo(-5,ey-2);g.lineTo(-2,ey);g.lineTo(-5,ey+2);g.moveTo(5,ey-2);g.lineTo(2,ey);g.lineTo(5,ey+2);g.stroke()}
    else if(happy>0){g.beginPath();g.arc(-3.4,ey+1,2,Math.PI*1.1,Math.PI*1.9);g.stroke();g.beginPath();g.arc(3.4,ey+1,2,Math.PI*1.1,Math.PI*1.9);g.stroke()}
    else if(blink){g.beginPath();g.moveTo(-5,ey);g.lineTo(-2,ey);g.moveTo(2,ey);g.lineTo(5,ey);g.stroke()}
    else if(S.T>TSPIN*.7){g.beginPath();g.moveTo(-5,ey-1);g.lineTo(-2,ey+.5);g.moveTo(5,ey-1);g.lineTo(2,ey+.5);g.stroke()}
    else{g.beginPath();g.arc(-3.4,ey,1.5,0,7);g.arc(3.4,ey,1.5,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(-3,ey-.6,.5,0,7);g.arc(3.8,ey-.6,.5,0,7);g.fill()}
    g.fillStyle='#ff7a9a';g.beginPath();g.moveTo(-1.2,-2.4);g.lineTo(1.2,-2.4);g.lineTo(0,-1.2);g.fill();
    g.strokeStyle='#3a2a2a';g.lineWidth=1;g.beginPath();g.arc(-1.1,-1,1.1,0,Math.PI);g.arc(1.1,-1,1.1,0,Math.PI);g.stroke();
    g.strokeStyle='rgba(58,42,42,.6)';g.beginPath();g.moveTo(-4,-1.5);g.lineTo(-10,-2.5);g.moveTo(-4,-.5);g.lineTo(-10,.5);g.moveTo(4,-1.5);g.lineTo(10,-2.5);g.moveTo(4,-.5);g.lineTo(10,.5);g.stroke();
    g.fillStyle='rgba(255,130,150,.45)';g.beginPath();g.arc(-5.6,-1,1.6,0,7);g.arc(5.6,-1,1.6,0,7);g.fill();
    g.restore();
    if(S.T>TSPIN*.78&&S.spin<=0&&(tG*6%1)<.6){g.font='18px Jua, system-ui, sans-serif';g.fillStyle='#ff6b5a';g.textAlign='center';g.fillText('!',x+18,y-16)}}
  function drawString(g){
    var S=R.S,pts=stringPts(S,16),k=Math.min(1,S.T/TSPIN),i;
    var r=Math.round(255),gg=Math.round(255-k*95),b=Math.round(255-k*215),col='rgb('+r+','+gg+','+b+')';
    if(k>.78&&(tG*8%1)<.5)col='#ff7a5a';
    var hx=SX(R.off+S.kid)+handDX(),hy=SY(HAND)+handDY();
    g.strokeStyle='rgba(30,40,70,.18)';g.lineWidth=2.6;g.beginPath();
    for(i=0;i<pts.length;i++){var px=i?SX(R.off+pts[i][0]):hx,py=i?SY(pts[i][1]):hy;if(i)g.lineTo(px+1,py+2);else g.moveTo(px+1,py+2)}g.stroke();
    g.strokeStyle=col;g.lineWidth=1.4+k*.8;g.beginPath();
    for(i=0;i<pts.length;i++){px=i?SX(R.off+pts[i][0]):hx;py=i?SY(pts[i][1]):hy;if(i)g.lineTo(px,py);else g.moveTo(px,py)}g.stroke()}
  function handDX(){var S=R.S;return S.reel?-3:2}
  function handDY(){var S=R.S;return cheer>0?-10:S.reel?2:-2}
  function drawKid(g){
    var S=R.S,x=SX(R.off+S.kid),y=GY,walking=S.snag<=0,ph=S.kid*.18,bob=walking?Math.abs(Math.sin(ph))*2:0,lean=S.snag>0?-.15:S.reel?-.08:0;
    g.fillStyle='rgba(30,50,30,.28)';g.beginPath();g.ellipse(x,y+2,13,3.5,0,0,7);g.fill();
    g.save();g.translate(x,y-bob);g.rotate(lean);
    /* 다리 */
    g.strokeStyle='#3d5a99';g.lineWidth=5;g.lineCap='round';var l1=walking?Math.sin(ph)*6:0;
    g.beginPath();g.moveTo(-3,-14);g.lineTo(-3+l1,-2);g.moveTo(3,-14);g.lineTo(3-l1,-2);g.stroke();
    g.fillStyle='#e85d5d';g.beginPath();g.ellipse(-3+l1+1.5,-1,4,2.4,0,0,7);g.ellipse(3-l1+1.5,-1,4,2.4,0,0,7);g.fill();
    /* 몸 */
    var gr=g.createLinearGradient(-9,-34,9,-12);gr.addColorStop(0,'#ffcf4a');gr.addColorStop(1,'#f0a92c');g.fillStyle=gr;
    g.beginPath();g.moveTo(-9,-14);g.quadraticCurveTo(-10,-30,0,-32);g.quadraticCurveTo(10,-30,9,-14);g.closePath();g.fill();
    g.fillStyle='rgba(160,90,20,.25)';g.fillRect(-9,-17,18,3);
    /* 뒤쪽 팔(얼레 쥔 손) */
    var hx=handDX()+5,hy=-(HAND-0)+handDY()+bob;
    g.strokeStyle='#f0a92c';g.lineWidth=4;g.beginPath();g.moveTo(5,-27);g.lineTo(hx,hy);g.stroke();
    g.fillStyle='#ffd9b8';g.beginPath();g.arc(hx,hy,2.6,0,7);g.fill();
    /* 얼레 */
    g.save();g.translate(hx-1,hy+4);g.rotate(S.reel?tG*14:0);g.fillStyle='#b5651d';g.fillRect(-4,-1.2,8,2.4);g.fillRect(-1.2,-4,2.4,8);g.restore();
    /* 다른 팔 */
    var ca=cheer>0?-1:S.reel?.2:.5;g.strokeStyle='#f0a92c';g.beginPath();g.moveTo(-5,-27);g.lineTo(-5-Math.cos(ca)*9,-27+Math.sin(ca)*9-(cheer>0?6:0));g.stroke();
    /* 머리 + 고양이 귀 모자 */
    g.fillStyle='#ffd9b8';g.beginPath();g.arc(0,-40,9,0,7);g.fill();
    g.fillStyle='#ff8a3d';g.beginPath();g.arc(0,-42,9.5,Math.PI,0);g.fill();
    g.beginPath();g.moveTo(-8,-45);g.lineTo(-7,-55);g.lineTo(-2,-49);g.closePath();g.moveTo(8,-45);g.lineTo(7,-55);g.lineTo(2,-49);g.closePath();g.fill();
    g.fillStyle='#ffc39a';g.beginPath();g.moveTo(-6.5,-47);g.lineTo(-6,-52);g.lineTo(-3.5,-49);g.closePath();g.moveTo(6.5,-47);g.lineTo(6,-52);g.lineTo(3.5,-49);g.closePath();g.fill();
    g.fillStyle='#e8732a';g.fillRect(-9.5,-43,19,2.4);
    var bl=(tG%3.7)<.13;g.fillStyle='#3a2a2a';g.strokeStyle='#3a2a2a';g.lineWidth=1.3;
    if(cheer>0){g.beginPath();g.arc(2,-39,1.8,Math.PI*1.1,Math.PI*1.9);g.stroke();g.beginPath();g.arc(7,-39,1.8,Math.PI*1.1,Math.PI*1.9);g.stroke()}
    else if(bl){g.beginPath();g.moveTo(.5,-39);g.lineTo(3.5,-39);g.moveTo(5.5,-39);g.lineTo(8.5,-39);g.stroke()}
    else{g.beginPath();g.arc(2.2,-39,1.4,0,7);g.arc(7,-39,1.4,0,7);g.fill()}
    g.fillStyle='rgba(255,120,120,.45)';g.beginPath();g.arc(0,-35.5,1.8,0,7);g.arc(8.2,-35.5,1.6,0,7);g.fill();
    g.strokeStyle='#3a2a2a';g.beginPath();if(cheer>0||happy>0){g.fillStyle='#c2413b';g.arc(5,-35,2.3,0,Math.PI);g.fill()}else if(S.snag>0){g.arc(5,-33,2,Math.PI*1.15,Math.PI*1.85);g.stroke()}else{g.arc(5,-35.5,1.6,.2,2.9);g.stroke()}
    g.restore();
    if(S.snag>0&&S.snagKind!=='ground'){g.font='13px Jua, system-ui, sans-serif';g.fillStyle='#fff';g.textAlign='center';g.fillText(S.snag.toFixed(1),x,y-66)}}
  function drawFlag(g){var x=SX(R.off+R.st.len);if(x<-20||x>W+30)return;
    g.fillStyle='rgba(30,50,30,.25)';g.beginPath();g.ellipse(x+3,GY+2,7,2.5,0,0,7);g.fill();
    g.fillStyle='#f4f0e6';g.fillRect(x-1.5,GY-72,3,74);var wv=Math.sin(tG*6)*3;
    g.fillStyle=R.S.nGot>=R.st.q?'#57c96b':'#ff7a8a';g.beginPath();g.moveTo(x+1.5,GY-72);g.quadraticCurveTo(x+14,GY-68+wv,x+26,GY-64);g.quadraticCurveTo(x+14,GY-60-wv,x+1.5,GY-56);g.fill();
    g.fillStyle='#fff';g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(R.S.nGot+'/'+R.st.q,x+12,GY-61)}

  function draw(g,a,dt){
    dt=dt||0;if(!R)return;var S=R.S,ko=a.lang==='ko',i,sc=skyCols();
    /* 카메라: 아이는 화면 오른쪽, 연이 보이도록 */
    var kw=R.off+S.kid,tgt=kw-250,kx=R.off+S.kx;if(kx-tgt<46)tgt=kx-46;tgt=Math.max(kw-322,Math.min(kw-120,tgt));
    cam+=(tgt-cam)*Math.min(1,dt*3);if(Math.abs(cam-tgt)>400)cam=tgt;
    updTail(dt);
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,sc[0]);gr.addColorStop(.55,sc[1]);gr.addColorStop(1,sc[2]);g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);
    /* 해 */
    var sg=g.createRadialGradient(70,120,4,70,120,80);sg.addColorStop(0,'rgba(255,250,220,.95)');sg.addColorStop(.25,'rgba(255,240,180,.6)');sg.addColorStop(1,'rgba(255,240,180,0)');
    g.fillStyle=sg;g.fillRect(0,30,170,180);
    hillPath(g,.12,452,22,.006,1.3,'#a9c9e6','#c9dcea');
    /* 구름: 자기 층의 바람 속도로 흐른다 */
    for(i=0;i<clouds.length;i++){var c=clouds[i],w=wind(R.st,c.alt,S.t);c.x+=w*.9*dt;var cx=((c.x-cam*.9)%520+520)%520-80;cloud(g,cx,SY(c.alt),c.s,.85)}
    hillPath(g,.3,500,26,.009,4.1,'#8fcf8a','#79b974');
    for(i=0;i<9;i++){var tx=((i*97-cam*.3)%880+880)%880-60;g.fillStyle='rgba(60,120,70,.55)';g.beginPath();g.arc(tx,486+Math.sin((tx+cam*.3)*.009+4.1)*20,9,0,7);g.fill()}
    drawBands(g);drawStreaks(g,dt);
    /* 앞 언덕(아이가 걷는 길) */
    var hg=g.createLinearGradient(0,GY-30,0,H);hg.addColorStop(0,'#7fd06a');hg.addColorStop(.3,'#5fb653');hg.addColorStop(1,'#3f8f45');g.fillStyle=hg;
    g.beginPath();g.moveTo(-10,H);for(var x=-10;x<=W+10;x+=8){var wx=x+cam;g.lineTo(x,GY-4+Math.sin(wx*.02)*2.5)}g.lineTo(W+10,H);g.closePath();g.fill();
    g.fillStyle='rgba(255,255,255,.18)';for(x=-10;x<=W;x+=24){var ox=((x-cam)%24+24)%24;g.fillRect(x+ox,GY+14,10,2)}
    var lw=wind(R.st,20,S.t);g.strokeStyle='rgba(60,140,60,.85)';g.lineWidth=2;g.lineCap='round';
    for(i=0;i<44;i++){var bx=((i*9.3-cam)%410+410)%410-25,bh=7+hash(i+5)*8,sw=(lw/90)*5+Math.sin(tG*3+i)*1.6;
      g.beginPath();g.moveTo(bx,GY);g.quadraticCurveTo(bx+sw*.3,GY-bh*.6,bx+sw,GY-bh);g.stroke()}
    var st=R.st;
    for(i=0;i<(st.trees||[]).length;i++)drawTree(g,st.trees[i],S.snag>0&&S.snagKind==='tree');
    for(i=0;i<(st.wires||[]).length;i++)drawWire(g,st.wires[i],S.snag>0&&S.snagKind==='wire');
    drawFlag(g);
    var nextRing=-1;for(i=0;i<st.rings.length;i++)if(!S.got[i]){nextRing=i;break}
    for(i=0;i<st.rings.length;i++)if(!S.got[i])ringHalf(g,SX(R.off+st.rings[i][0]),SY(st.rings[i][1]),false,1,false);
    for(i=0;i<S.stars.length;i++){var sr=S.stars[i];if(sr.got)continue;var sx=SX(R.off+sr.x),sy=SY(sr.y);
      g.fillStyle='rgba(255,230,120,.35)';g.beginPath();g.arc(sx,sy,13,0,7);g.fill();g.fillStyle='#ffd23f';drawStar(g,sx,sy,9,tG);g.fill();g.strokeStyle='#d99a00';g.lineWidth=1.2;g.stroke()}
    for(i=0;i<S.seeds.length;i++){var sd=S.seeds[i];if(!sd.got)drawSeed(g,SX(R.off+sd.x),SY(sd.y),sd.ph)}
    for(i=0;i<S.birds.length;i++)drawBird(g,S.birds[i],S);
    drawString(g);drawKite(g);
    for(i=0;i<st.rings.length;i++)if(!S.got[i])ringHalf(g,SX(R.off+st.rings[i][0]),SY(st.rings[i][1]),true,1,i===nextRing);
    drawKid(g);
    /* ---- HUD ---- */
    var tf=Math.max(0,R.time)/TCAP;g.fillStyle='rgba(20,40,80,.25)';g.fillRect(12,34,W-24,6);
    g.fillStyle=R.time<10?(tG*4%1<.5?'#ff6b5a':'#ffb3a8'):'#ffffff';g.fillRect(12,34,(W-24)*tf,6);
    g.font='15px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='#fff';g.strokeStyle='rgba(30,50,90,.45)';g.lineWidth=3;
    var lab=(ko?(R.n+1)+'단계':'Stage '+(R.n+1))+'  '+Math.ceil(R.time)+(ko?'초':'s');g.strokeText(lab,12,58);g.fillText(lab,12,58);
    /* 고리 칸 */
    for(i=0;i<st.rings.length;i++){var rx=W-16-(st.rings.length-1-i)*16,ry=53;g.lineWidth=2.5;g.strokeStyle=i<st.q?'#ffcf3a':'rgba(255,207,58,.55)';
      g.beginPath();g.ellipse(rx,ry,4,7,0,0,7);g.stroke();if(i<S.nGot){g.fillStyle='#ffcf3a';g.fill()}}
    g.textAlign='right';g.font='12px Jua, system-ui, sans-serif';g.fillStyle='#fff';
    var need=Math.max(0,st.q-S.nGot);g.strokeText(need?(ko?'고리 '+need+'개 더':need+' more ring'+(need>1?'s':'')):(ko?'충분해요!':'Enough!'),W-12-st.rings.length*16,58);
    g.fillText(need?(ko?'고리 '+need+'개 더':need+' more ring'+(need>1?'s':'')):(ko?'충분해요!':'Enough!'),W-12-st.rings.length*16,58);
    /* 활공 */
    var gm=1+Math.min(3,Math.floor(S.glide/2.5));if(S.glide>1){g.textAlign='left';g.font='12px Jua, system-ui, sans-serif';
      var gt=(ko?'활공 ×':'Glide ×')+gm;g.strokeText(gt,12,76);g.fillStyle=gm>1?'#bdf3ff':'rgba(255,255,255,.8)';g.fillText(gt,12,76);
      g.fillStyle='rgba(255,255,255,.3)';g.fillRect(64,70,40,4);g.fillStyle='#bdf3ff';g.fillRect(64,70,40*Math.min(1,(S.glide%2.5)/2.5)*(gm<4?1:0)+(gm>=4?40:0),4)}
    /* 힌트 */
    if(st.hint&&(R.n===0?hintT<14:hintT<6)){var ht=st.hint[ko?'ko':'en'];g.font='16px Jua, system-ui, sans-serif';g.textAlign='center';
      var wd=g.measureText(ht).width+26,hy=104,al=Math.min(1,(R.n===0?14:6)-hintT);g.globalAlpha=Math.max(0,al);
      g.fillStyle='rgba(255,255,255,.85)';g.beginPath();if(g.roundRect)g.roundRect(W/2-wd/2,hy-20,wd,30,15);else g.rect(W/2-wd/2,hy-20,wd,30);g.fill();
      g.fillStyle='#2f4d7a';g.fillText(ht,W/2,hy);g.globalAlpha=1}
  }

  SG.run({id:'kite-wind',title:{ko:'바람결 연날리기',en:'Kite Wind'},
    how:{ko:'꾹 누르면(스페이스·↑) 연줄을 감아 연이 솟고, 떼면 풀려서 바람 따라 흘러가요. ↓는 빨리 풀기. 바람층을 읽고 고리를 통과하세요!',
         en:'Hold (Space/↑) to reel in and the kite lifts; release and it drifts with the wind. ↓ lets out faster. Read the wind layers and fly through the rings!'},
    init:init,update:update,draw:draw});
})();
