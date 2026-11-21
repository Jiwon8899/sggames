/* 모래성 지키기 (Sandcastle Tide) — 밀려오는 파도에서 꽃게 왕의 모래성을 지킨다.
   물은 72x128 격자 위의 가상 파이프(virtual pipes) 얕은 물 모델로 흐르고, 젖은 모래는 무너지고 깎인다.
   시뮬레이션은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,GW=72,GH=128,CS=5,N=GW*GH,SEA=18,SHORE=22,SL=0.03,L0=-0.25,
      HZ=180,DT=1/HZ,PC=0.12,DAMP=0.992,WEEDD=0.86,
      SMAX=1.5,DMAX=1.1,BR=1.7,TW=0.22,TD=0.9,KS=0.015,KD=0.55,UIY=118,FIRM=0.3;


  /* ---------- 손으로 만든 해변 10개 ---------- */
  var T=function(ko,en){return {ko:ko,en:en}};
  var LEVELS=[
    {waves:[2.2],sand:80,refill:0,castles:[[36,88]],feat:[[14,84,13,1.3,14],[58,84,13,1.3,14]],tip:T('모래로 벽을 쌓아 성을 지켜요','Pile sand walls to protect the castle')},
    {waves:[2.64],sand:24,refill:0,castles:[[40,90]],drains:[[18,84,3]],feat:[[0,64,34,64,4,1.7],[46,64,71,64,4,1.7]],
      tip:T('삽으로 도랑을 파서 물을 웅덩이로 보내요','Dig a trench to drain water into the pool')},
    {waves:[2.7],sand:230,refill:0,castles:[[36,90]],tip:T('물은 틈을 찾아요. 옆과 뒤까지 막아요','Water finds gaps. Close the sides too')},
    {waves:[2.8],sand:70,refill:0,castles:[[36,90]],rocks:[[26,82,32,82,1.8],[40,82,46,82,1.8],[24,86,24,96,1.8],[48,86,48,96,1.8],[28,100,44,100,1.8]],
      tip:T('모래가 적어요. 바위 사이 틈만 메워요','Low on sand. Fill the gaps between rocks')},
    {waves:[2.4,2.7,2.95],sand:230,refill:110,castles:[[36,90]],
      tip:T('파도가 벽을 깎아요. 사이사이 고쳐요','Waves wear walls. Repair between waves')},
    {waves:[2.3],sand:40,refill:0,castles:[[30,92]],weed:[[10,72,11],[34,72,11],[58,72,11]],stream:{x:71,y:100,rate:0.8},drains:[[58,80,3]],feat:[[71,100,33,93,3,-0.6]],
      tip:T('미역은 파도를 늦춰요. 개울물은 도랑으로!','Seaweed slows waves. Ditch the stream!')},
    {waves:[2.6,2.8],sand:240,refill:120,castles:[[36,90]],gulls:4.5,
      tip:T('갈매기가 벽을 콕콕! 쪼인 곳을 메워요','Gulls peck your walls! Patch the notches')},
    {waves:[2.22,2.38],sand:12,refill:6,castles:[[36,90]],drains:[[18,90,3],[54,90,3]],
      tip:T('성 둘레를 파서 웅덩이와 이어요','Dig a ring around the castle into a pool')},
    {waves:[2.6,2.8],sand:400,refill:160,castles:[[20,90],[52,90]],rocks:[[36,80,2.5]],
      tip:T('성이 두 개! 둘 다 지켜요','Two castles! Protect both')},
    {waves:[2.6,2.9,3.1],sand:260,refill:120,castles:[[36,94]],night:true,gulls:6,weed:[[14,68,7],[58,68,7]],rocks:[[24,86,2],[48,86,2]],drains:[[64,98,3]],
      tip:T('밤바다! 달이 뜨면 파도가 커져요','Night tide! The moon makes big waves')}
  ];

  /* ---------- 결정적 난수 ---------- */
  function rng(seed){var s=(seed*2654435761)>>>0||1;return function(){s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}

  /* ---------- 해변 만들기 ----------
     def: {waves:[진폭..], lead, period, sand, refill, castles:[[x,y]], feat:[...], rocks:[[x,y,r]|[x1,y1,x2,y2,r]],
           weed:[[x,y,r]], drains:[[x,y,r]], stream:{x,y,rate}, gulls:초, night:bool, tip:{ko,en}} — 좌표는 칸 단위 */
  function baseH(x,y){return y>=SEA?(y-SHORE)*SL:-0.12-(SEA-y)*0.08}
  function segD(px,py,ax,ay,bx,by){var dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?((px-ax)*dx+(py-ay)*dy)/l:0;t=t<0?0:t>1?1:t;
    var qx=ax+dx*t-px,qy=ay+dy*t-py;return Math.sqrt(qx*qx+qy*qy)}
  function makeBeach(def){
    var B={def:def,base:new Float32Array(N),b:new Float32Array(N),d:new Float32Array(N),
      fl:new Float32Array(N),fr:new Float32Array(N),ft:new Float32Array(N),fb:new Float32Array(N),
      wet:new Float32Array(N),foam:new Float32Array(N),rock:new Uint8Array(N),weed:new Uint8Array(N),drain:new Uint8Array(N),cid:new Int8Array(N),
      castles:[],t:0,steps:0,acc:0,sand:def.sand,res:null,wave:-1,waveDone:-1,gull:null,gullT:def.gulls||0,rnd:rng(def.seed||7),
      lost:0,drained:0,events:[]};
    var x,y,i,f,k;
    B.cid.fill(-1);
    for(y=0;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;var h=baseH(x,y);
      if(y>=SEA)for(k=0;k<(def.feat||[]).length;k++){f=def.feat[k];var dd;
        if(f.length>=6)dd=segD(x,y,f[0],f[1],f[2],f[3])/f[4],h+=f[5]*Math.exp(-dd*dd*2);   /* [x1,y1,x2,y2,폭,높이] 능선/골 */
        else{var ex=(x-f[0])/f[2],ey=(y-f[1])/(f[4]||f[2]);h+=f[3]*Math.exp(-(ex*ex+ey*ey)*2)}} /* [x,y,r,높이,ry] 언덕/웅덩이 */
      B.base[i]=h}
    (def.drains||[]).forEach(function(p){for(y=0;y<GH;y++)for(x=0;x<GW;x++){var r=Math.hypot(x-p[0],y-p[1]);i=y*GW+x;
      if(r<=p[2]+3)B.base[i]=Math.min(B.base[i],B.base[i]-0.5*Math.max(0,1-(r-p[2])/3));if(r<=p[2])B.drain[i]=1}});
    (def.rocks||[]).forEach(function(p){for(y=0;y<GH;y++)for(x=0;x<GW;x++){
      var r=p.length>3?segD(x,y,p[0],p[1],p[2],p[3]):Math.hypot(x-p[0],y-p[1]);if(r<=p[p.length-1])B.rock[y*GW+x]=1}});
    (def.weed||[]).forEach(function(p){for(y=0;y<GH;y++)for(x=0;x<GW;x++)if(Math.hypot(x-p[0],(y-p[1])*1.2)<=p[2])B.weed[y*GW+x]=1});
    (def.castles||[]).forEach(function(p,ci){var c={x:p[0],y:p[1],hp:100,cells:[],hit:0};
      for(y=p[1]-2;y<=p[1]+3;y++)for(x=p[0]-3;x<=p[0]+3;x++){i=y*GW+x;B.cid[i]=ci;c.cells.push(i)}B.castles.push(c)});
    for(i=0;i<N;i++){B.b[i]=B.rock[i]?B.base[i]+6:B.base[i];if(i<SEA*GW)B.d[i]=Math.max(0,L0-B.b[i])}
    B.lead=def.lead||6;B.period=def.period||7;B.end=B.lead+(def.waves.length-1)*B.period+WLEN+2.5;
    return B}

  /* ---------- 파도 ---------- */
  var WR=1.0,WH=0.7,WF=2.3,WLEN=WR+WH+WF;
  function shape(u){if(u<0||u>WLEN)return 0;if(u<WR){u/=WR;return u*u*(3-2*u)}if(u<WR+WH)return 1;u=1-(u-WR-WH)/WF;return u*u*(3-2*u)}
  function seaLevel(B,x){var w=B.def.waves,k,s=0;for(k=0;k<w.length;k++){var u=B.t-(B.lead+k*B.period);if(u>-0.1&&u<WLEN+.1)s+=w[k]*shape(u)*(1+0.1*Math.sin(x*0.19+k*2.1+u*1.3))}return L0+s}

  /* ---------- 물 한 스텝 (가상 파이프) ---------- */
  function step(B){
    var b=B.b,d=B.d,fl=B.fl,fr=B.fr,ft=B.ft,fb=B.fb,rock=B.rock,weed=B.weed,x,y,i,h,dm,s,v;
    /* 바다 경계: 맨 위 SEA줄은 해수면으로 고정 */
    if(!B.def.noSea)for(x=0;x<GW;x++){var L=seaLevel(B,x);for(y=0;y<SEA;y++){i=y*GW+x;d[i]=Math.max(0,L-b[i])}}
    if(B.def.stream){var st=B.def.stream,sx=st.x,sy=st.y,ramp=Math.max(0,Math.min(1,(B.t-1)/3));for(y=sy-1;y<=sy+1;y++){i=y*GW+sx;d[i]+=st.rate*ramp*DT}}
    for(y=0;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;
      if(rock[i]){fl[i]=fr[i]=ft[i]=fb[i]=0;continue}
      h=b[i]+d[i];dm=weed[i]?WEEDD:DAMP;
      if(d[i]<=0){fl[i]=fr[i]=ft[i]=fb[i]=0;continue}
      v=x>0&&!rock[i-1]?fl[i]*dm+PC*(h-b[i-1]-d[i-1]):0;fl[i]=v>0?v:0;
      v=x<GW-1&&!rock[i+1]?fr[i]*dm+PC*(h-b[i+1]-d[i+1]):0;fr[i]=v>0?v:0;
      v=y>0&&!rock[i-GW]?ft[i]*dm+PC*(h-b[i-GW]-d[i-GW]):0;ft[i]=v>0?v:0;
      v=y<GH-1&&!rock[i+GW]?fb[i]*dm+PC*(h-b[i+GW]-d[i+GW]):0;fb[i]=v>0?v:0;
      s=fl[i]+fr[i]+ft[i]+fb[i];
      if(s>d[i]){s=d[i]/s;fl[i]*=s;fr[i]*=s;ft[i]*=s;fb[i]*=s}}
    for(y=0;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;if(rock[i])continue;
      v=-(fl[i]+fr[i]+ft[i]+fb[i]);
      if(x>0)v+=fr[i-1];if(x<GW-1)v+=fl[i+1];if(y>0)v+=fb[i-GW];if(y<GH-1)v+=ft[i+GW];
      v+=d[i];d[i]=v>0?v:0}
    /* 배수구(웅덩이): 물을 빨아들인다 */
    var dr=B.drain;for(i=SEA*GW;i<N;i++)if(dr[i]&&d[i]>0){B.drained+=d[i];d[i]=0}
    B.steps++;if(B.steps%2===0)erode(B);
    /* 성 피해 */
    for(var c=0;c<B.castles.length;c++){var C=B.castles[c],dmg=0;for(var j=0;j<C.cells.length;j++){i=C.cells[j];if(d[i]>0.03)dmg+=d[i]-0.03}
      if(dmg>0){C.hp-=dmg*KD;C.hit=0.25}}
  }
  /* 젖은 모래 무너짐 + 흐름에 깎임 (2스텝마다) */
  function erode(B){
    var b=B.b,d=B.d,base=B.base,rock=B.rock,cid=B.cid,dr=B.drain,x,y,i,j,df,m,T,wt,s;
    for(y=SEA;y<GH;y++)for(x=0;x<GW;x++){i=y*GW+x;if(rock[i]||dr[i])continue;
      wt=d[i]>0.02;
      if(wt){B.wet[i]=1;s=b[i]-base[i];
        if(s>0){var o=B.fl[i]+B.fr[i]+B.ft[i]+B.fb[i],v=o/(d[i]+0.08);m=KS*(v>2?2:v)*2;if(m>s)m=s;b[i]-=m}}
      else B.wet[i]*=0.994;
      /* 오른쪽, 아래 이웃과 짝지어 경사 완화 */
      if(x<GW-1){j=i+1;if(!rock[j]&&!dr[j]){T=(wt||d[j]>0.02)?TW:TD;df=b[i]-b[j];
        if(df>T){m=Math.min((df-T)*0.2,b[i]-base[i]+FIRM);if(m>0){b[i]-=m;b[j]+=m}}else if(df<-T){m=Math.min((-df-T)*0.2,b[j]-base[j]+FIRM);if(m>0){b[i]+=m;b[j]-=m}}}}
      if(y<GH-1){j=i+GW;if(!rock[j]&&!dr[j]){T=(wt||d[j]>0.02)?TW:TD;df=b[i]-b[j];
        if(df>T){m=Math.min((df-T)*0.2,b[i]-base[i]+FIRM);if(m>0){b[i]-=m;b[j]+=m}}else if(df<-T){m=Math.min((-df-T)*0.2,b[j]-base[j]+FIRM);if(m>0){b[i]+=m;b[j]-=m}}}}}
  }

  /* ---------- 모래 붓 ---------- */
  function canEdit(B,i,y){return y>=SEA+2&&y<UIY&&!B.rock[i]&&!B.drain[i]&&B.cid[i]<0}
  /* 칸 좌표(cx,cy)에 amt만큼 쌓거나(+) 판다(-). 실제 쓴 모래를 돌려준다 */
  function brush(B,cx,cy,amt,dig){
    var x0=Math.max(0,Math.floor(cx-BR)),x1=Math.min(GW-1,Math.ceil(cx+BR)),y0=Math.max(0,Math.floor(cy-BR)),y1=Math.min(GH-1,Math.ceil(cy+BR)),x,y,i,used=0;
    for(y=y0;y<=y1;y++)for(x=x0;x<=x1;x++){i=y*GW+x;if(!canEdit(B,i,y))continue;
      var r2=((x-cx)*(x-cx)+(y-cy)*(y-cy))/(BR*BR);if(r2>=1)continue;var w=(1-r2)*amt,s=B.b[i]-B.base[i];
      if(!dig){if(B.sand<=0)break;w=Math.min(w,SMAX-s,B.sand);if(w<=0)continue;B.b[i]+=w;B.sand-=w;used+=w}
      else{w=Math.min(w,s+DMAX);if(w<=0)continue;B.b[i]-=w;B.sand+=w*0.5;used+=w}}
    if(B.sand>B.def.sand)B.sand=B.def.sand;
    return used}
  /* 선분을 따라 붓질 (amt: 칸당 양) */
  function stroke(B,ax,ay,bx,by,amt,dig){var l=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.ceil(l/0.5)),u=0;
    for(var k=0;k<=n;k++)u+=brush(B,ax+(bx-ax)*k/n,ay+(by-ay)*k/n,amt*0.5,dig);return u}

  /* ---------- 해변 진행 (헤드리스) ---------- */
  function advance(B,dt){
    if(B.res)return;B.acc+=dt;var n=0;
    while(B.acc>=DT&&n<12&&!B.res){B.acc-=DT;n++;B.t+=DT;step(B);tickBeach(B)}
    if(n>=12)B.acc=0}
  function tickBeach(B){
    var def=B.def,k=Math.floor((B.t-B.lead)/B.period+1e-9);
    if(k>=0&&k<def.waves.length&&k>B.wave){B.wave=k;B.events.push({t:'wave',k:k})}
    /* 파도가 지나가면 모래 보충 */
    var kd=Math.floor((B.t-B.lead-WLEN)/B.period);if(kd>B.waveDone&&kd<def.waves.length&&kd>=0){B.waveDone=kd;
      B.sand=Math.min(def.sand,B.sand+(def.refill||0));B.events.push({t:'calm',k:kd})}
    /* 갈매기: 벽 꼭대기를 콕콕 */
    if(def.gulls){B.gullT-=DT;
      if(!B.gull&&B.gullT<=0){B.gullT=def.gulls;var best=-1,bi=-1,tries;
        for(tries=0;tries<400;tries++){var i=SEA*GW+Math.floor(B.rnd()*(UIY-SEA)*GW),s=B.b[i]-B.base[i];if(!B.rock[i]&&s>best){best=s;bi=i}}
        if(best>0.4){B.gull={i:bi,t:0,x:bi%GW,y:Math.floor(bi/GW)};B.events.push({t:'gull'})}}
      if(B.gull){var G=B.gull;G.t+=DT;if(G.t>1.0&&G.t<2.2&&B.steps%6===0)brushRaw(B,G.x,G.y,-0.03);if(G.t>3.2){B.gull=null;B.events.push({t:'gullgone'})}}}
    for(var c=0;c<B.castles.length;c++)if(B.castles[c].hp<=0){B.castles[c].hp=0;B.res='lose';return}
    if(B.t>=B.end)B.res='win'}
  function brushRaw(B,cx,cy,amt){for(var y=cy-1;y<=cy+1;y++)for(var x=cx-1;x<=cx+1;x++){var i=y*GW+x;if(x<0||x>=GW||!canEdit(B,i,y))continue;
    var s=B.b[i]-B.base[i],w=(x===cx&&y===cy?1:.5)*amt;if(s+w<0)w=Math.max(-s,w>0?w:-s);B.b[i]+=w}}

  /* 해자 판정: 성을 둘러싼 파인 고리가 배수구/바다/가장자리로 이어져 있는가 */
  function moatOK(B,c){
    var C=B.castles[c],R=11,x0=C.x-R,x1=C.x+R,y0=C.y-R+1,y1=C.y+R,seen=new Uint8Array(N),q=[],dug=function(i){return B.b[i]-B.base[i]<-0.35},esc=false,ring=[];
    C.cells.forEach(function(i){seen[i]=1;q.push(i)});
    while(q.length){var i=q.pop(),x=i%GW,y=(i/GW)|0;if(x<=x0||x>=x1||y<=y0||y>=y1||x<=0||x>=GW-1){esc=true;break}
      [i-1,i+1,i-GW,i+GW].forEach(function(j){if(seen[j])return;if(B.rock[j]){seen[j]=1;return}if(dug(j)){ring.push(j);return}seen[j]=1;q.push(j)})}
    if(esc||!ring.length)return false;
    var s2=new Uint8Array(N);q=ring.slice();q.forEach(function(i){s2[i]=1});
    while(q.length){i=q.pop();x=i%GW;y=(i/GW)|0;if(B.drain[i]||y<SEA+3||x===0||x===GW-1)return true;
      [i-1,i+1,i-GW,i+GW].forEach(function(j){if(!s2[j]&&(dug(j)||B.drain[j])){s2[j]=1;q.push(j)}})}
    return false}


  /* ---------- 생성 해변 (n>=10) ---------- */
  function genBeach(n){
    var R=rng(n*7919+13),r=function(a,b){return a+R()*(b-a)},ri=function(a,b){return Math.floor(r(a,b+1))},
        lv=Math.min(1,(n-10)/30),def={seed:n,feat:[],rocks:[],weed:[],drains:[],castles:[],gen:true};
    var two=n%7===5,cy=ri(86,94),cx=two?0:ri(24,48);
    if(two){def.castles.push([ri(17,24),cy],[ri(48,55),cy])}else def.castles.push([cx,cy]);
    var nf=ri(1,3),k;
    for(k=0;k<nf;k++){var side=R()<.5?-1:1,fx=side<0?ri(4,18):ri(54,68);def.feat.push([fx,ri(70,96),ri(8,13),r(0.7,1.4),ri(9,15)])}
    if(R()<.5)def.feat.push([ri(10,62),ri(40,64),ri(6,10),r(-0.35,0.35)]);
    var nr=R()<.6?ri(1,3):0;for(k=0;k<nr;k++){var rx=ri(8,64),ry=ri(56,100);
      if(def.castles.some(function(c){return Math.abs(c[0]-rx)<9&&Math.abs(c[1]-ry)<8}))continue;def.rocks.push([rx,ry,r(1.6,2.6)])}
    if(R()<.45)def.weed.push([ri(10,62),ri(48,72),ri(5,8)]);
    if(R()<.6){var dx=R()<.5?ri(5,12):ri(60,67);def.drains.push([dx,ri(78,98),3])}
    var nw=ri(1,2)+(lv>.4?1:0),base=0;
    def.castles.forEach(function(c){base=Math.max(base,(c[1]-SHORE)*SL)});
    def.waves=[];for(k=0;k<nw;k++)def.waves.push(+(base-L0+r(0.05,0.35)+k*0.18+lv*0.25).toFixed(2));
    if(n%5===3)def.gulls=r(5,7);
    if(n%6===4)def.night=true;
    def.sand=0;def.refill=0;def.lead=6;
    return def}
  /* 생성 해변 목록: [시드, 모래, 파도 뒤 보충, 파도 보정]. 검증 봇(헤드리스)이 통과시킨 해변만 들어 있고,
     모래량은 봇이 찾은 계획 비용에 여유를 둔 값이다. */
  var GENS=[[10,194,70,0,'ring7'],[11,194,90,0.3,'ring7'],[12,382,185,0.45,'ring7'],[13,194,80,0,'ring7'],[14,194,60,0,'ring7'],[15,194,75,0.15,'ring7'],[16,194,76,0,'ring7'],[17,194,83,0,'ring7'],[18,194,91,0.15,'ring7'],[19,382,131,0,'ring7'],[20,194,75,0,'ring7'],[21,194,74,0.15,'ring7'],[22,194,93,0,'ring7'],[23,194,83,0,'ring7'],[24,194,120,0.15,'ring7'],[25,194,96,0,'ring7'],[26,382,234,0,'ring7'],[27,194,72,0,'ring7'],[28,194,93,0,'ring7'],[29,194,73,0,'ring7'],[30,194,67,0,'ring7'],[31,194,144,0,'ring7'],[32,194,114,0,'ring7'],[33,382,160,0,'ring7'],[34,194,77,0,'ring7'],[35,194,98,0,'ring7'],[36,194,132,0.15,'ring7'],[37,194,111,0,'ring7'],[38,244,117,0,'ring9'],[39,194,88,0,'ring7'],[41,194,105,0,'ring7'],[42,194,85,0,'ring7'],[43,194,124,-0.1,'ring7'],[44,194,88,0,'ring7'],[45,194,104,0,'ring7'],[46,194,104,0,'ring7'],[47,381,223,-0.2,'ring7'],[48,230,110,0,'ring9'],[49,194,111,0,'ring7'],[50,194,102,0,'ring7'],[51,194,135,0,'ring7'],[52,194,99,0,'ring7'],[53,194,82,0,'ring7'],[54,382,204,0,'ring7'],[55,194,119,0.15,'ring7'],[56,194,100,0,'ring7'],[57,194,90,0,'ring7'],[58,194,69,0,'ring7'],[59,194,118,0,'ring7'],[60,194,128,0,'ring7'],[61,369,149,0,'ring7'],[62,194,113,0,'ring7'],[63,194,104,0,'ring7'],[64,194,146,-0.2,'ring7'],[65,194,128,0,'ring7'],[66,194,114,-0.1,'ring7'],[67,194,131,0,'ring7'],[68,478,212,-0.1,'ring8'],[69,194,104,0,'ring7'],[70,194,122,0,'ring7']];
  function getDef(n){if(n<LEVELS.length){var d=LEVELS[n];d.seed=d.seed||n+1;return d}
    if(!GENS.length)return LEVELS[n%LEVELS.length];
    var e=GENS[(n-LEVELS.length)%GENS.length],g=genBeach(e[0]);g.sand=e[1];g.refill=e[2];
    g.waves=g.waves.map(function(w){return +(w+e[3]).toFixed(2)});return g}
  function waterVol(B){var s=0;for(var i=SEA*GW;i<N;i++)s+=B.d[i];return s}

  var CORE={GW:GW,GH:GH,CS:CS,N:N,SEA:SEA,UIY:UIY,HZ:HZ,DT:DT,SMAX:SMAX,makeBeach:makeBeach,step:step,erode:erode,brush:brush,stroke:stroke,
    advance:advance,LEVELS:LEVELS,genBeach:genBeach,getDef:getDef,GENS:GENS,tickBeach:tickBeach,seaLevel:seaLevel,moatOK:moatOK,waterVol:waterVol,rng:rng,WLEN:WLEN};
  if(typeof module!=='undefined'&&module.exports)module.exports=CORE;
  if(typeof SG==='undefined')return;

  /* ---------- 게임 ---------- */
  var B,lvN,time,mode,modeT,tool,cur,kbOn,drawing,prevDown,px0,py0,tG=0,lastGain,warned,moatGot,moatT,tex=null,tctx,img,
      clouds,spark,specks,scrapeT,emptyT,hitT,initAt=0,crabT,clearPts,fallMsg,beachesDone;
  var keys={l:false,r:false,u:false,d:false,sp:false,sh:false,tab:false};
  if(!window.__sandcastleKeys){window.__sandcastleKeys=true;
    var kf=function(e,v){var c=e.code;
      if(c==='ArrowLeft'||c==='KeyA')keys.l=v;else if(c==='ArrowRight'||c==='KeyD')keys.r=v;
      else if(c==='ArrowUp'||c==='KeyW')keys.u=v;else if(c==='ArrowDown'||c==='KeyS')keys.d=v;
      else if(c==='Space')keys.sp=v;else if(c==='ShiftLeft'||c==='ShiftRight')keys.sh=v;
      else if(c==='Tab'){var pl=window.__sg&&window.__sg.state().playing;if(pl){e.preventDefault();if(v&&!e.repeat)keys.tab=true}}};
    window.addEventListener('keydown',function(e){kf(e,true)});
    window.addEventListener('keyup',function(e){kf(e,false)});
    window.addEventListener('blur',function(){keys.l=keys.r=keys.u=keys.d=keys.sp=keys.sh=false})}
  var BTN={build:{x:8,y:592,w:54,h:42},dig:{x:66,y:592,w:54,h:42}};
  function inBtn(b,x,y){return x>=b.x-4&&x<=b.x+b.w+4&&y>=b.y-6&&y<=b.y+b.h+6}
  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}

  function loadBeach(n){lvN=n;B=makeBeach(getDef(n));mode='play';modeT=0;moatGot=false;moatT=0;drawing=null;crabT=0;specks=[];
    var c=B.castles[0];cur={x:c.x*CS+2.5,y:(c.y-9)*CS};B.sand=B.def.sand}
  function init(a){time=50;tool='build';keys.tab=false;kbOn=false;prevDown=true;lastGain=0;warned=0;scrapeT=0;emptyT=0;hitT=0;beachesDone=0;
    initAt=performance.now();spark=[];
    clouds=[];for(var i=0;i<3;i++)clouds.push({x:hash(i+1)*W,y:150+hash(i+7)*380,s:.8+hash(i+3)*.7,v:4+hash(i+5)*5});
    loadBeach(0);a.tempo(1);
    /* 도구 버튼은 pointerdown에서 바로 처리해 아주 빠른 탭도 놓치지 않는다 */
    var cv=document.querySelector('#stage canvas');
    if(cv&&!cv.__scBtn){cv.__scBtn=true;cv.addEventListener('pointerdown',function(e){var r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;
      if(mode==='play'&&window.__sg&&window.__sg.state().playing){if(inBtn(BTN.build,x,y))tool='build';else if(inBtn(BTN.dig,x,y))tool='dig'}})}}

  function paint(a,x0,y0,x1,y1,dt,dig){
    var cx0=x0/CS-.5,cy0=y0/CS-.5,cx1=x1/CS-.5,cy1=y1/CS-.5,s0=B.sand;
    var u=stroke(B,cx0,cy0,cx1,cy1,0.32,dig)+brush(B,cx1,cy1,2.4*dt,dig);
    if(u>0.01){scrapeT-=dt;if(scrapeT<=0){scrapeT=.08;a.beep(dig?140+Math.random()*60:340+Math.random()*160,.03,dig?'sawtooth':'triangle')}
      if(Math.random()<.5)specks.push({x:x1+(Math.random()-.5)*10,y:y1+(Math.random()-.5)*10,vx:(Math.random()-.5)*60,vy:-30-Math.random()*50,t:0,dig:dig})}
    if(!dig&&s0<=0.01&&u<=0.01){emptyT-=dt;if(emptyT<=0){emptyT=1.1;a.pop(Math.max(150,Math.min(210,x1)),y1-18,a.lang==='ko'?'모래가 없어요! 삽으로 파면 생겨요':'Out of sand! Dig to get some','#fff');a.beep(200,.12,'square')}}}

  function flow(dt){B.acc+=dt;var n=0;while(B.acc>=DT&&n<6){B.acc-=DT;n++;B.t+=DT;step(B)}if(n>=6)B.acc=0}

  var PERF={u:0,d:0,n:0,umax:0,dmax:0};
  function update(dt,inp,a){var p0=performance.now();update2(dt,inp,a);var du=performance.now()-p0;PERF.u+=du;PERF.n++;if(du>PERF.umax)PERF.umax=du}
  function update2(dt,inp,a){
    var ko=a.lang==='ko',fresh=inp.down&&!prevDown,i,c;
    if(mode!=='clear'){time-=dt;
      if(time<=0){time=0;a.over();return}
      if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(880,.05,'square')}}
    var kbAct=keys.l||keys.r||keys.u||keys.d||keys.sp;if(kbAct&&performance.now()>initAt+60)kbOn=true;if(inp.down)kbOn=false;
    if(keys.tab){keys.tab=false;tool=tool==='build'?'dig':'build';a.sfx('tap')}
    if(lastGain>0)lastGain-=dt;
    if(mode==='play'){
      /* 아주 짧은 클릭(한 프레임 안에 눌렀다 뗌)도 놓치지 않도록 tap도 본다 */
      var press=(fresh||(inp.tap&&!keys.sp))&&inp.x!=null;
      if(press){
        if(inBtn(BTN.build,inp.x,inp.y)){tool='build';drawing='ui';a.sfx('tap')}
        else if(inBtn(BTN.dig,inp.x,inp.y)){tool='dig';drawing='ui';a.sfx('tap')}
        else{drawing=inp.down?'p':null;px0=inp.x;py0=inp.y;paint(a,px0,py0,px0,py0,dt,tool==='dig')}}
      else if(drawing==='p'&&inp.down&&inp.x!=null){paint(a,px0,py0,inp.x,inp.y,dt,tool==='dig');px0=inp.x;py0=inp.y}
      if(!inp.down)drawing=null;
      if(kbOn){var sp=130*dt,ox=cur.x,oy=cur.y;if(keys.l)cur.x-=sp;if(keys.r)cur.x+=sp;if(keys.u)cur.y-=sp;if(keys.d)cur.y+=sp;
        cur.x=Math.max(6,Math.min(W-6,cur.x));cur.y=Math.max((SEA+2)*CS,Math.min(UIY*CS-4,cur.y));
        if(keys.sp&&performance.now()>initAt+300)paint(a,ox,oy,cur.x,cur.y,dt,keys.sh||tool==='dig')}
      advance(B,dt);
      for(i=0;i<B.events.length;i++){var e=B.events[i];
        if(e.t==='wave'){a.beep(110,.5,'sine');a.beep(165,.4,'sine');a.shake(2+B.def.waves[e.k])}
        else if(e.t==='calm'){var pts=10;a.add(pts);a.sfx('coin');c=B.castles[0];a.pop(c.x*CS+2.5,c.y*CS-34,'+'+pts+(ko?' 버텼다!':' Held!'),'#fff7a8')}
        else if(e.t==='gull'){a.beep(1400,.08,'square');a.beep(1100,.1,'square')}}
      B.events.length=0;
      for(c=0;c<B.castles.length;c++){var C=B.castles[c];if(C.hit>0){C.hit-=dt;hitT-=dt;
        if(hitT<=0){hitT=.22;a.beep(160+C.hp,.06,'sawtooth');a.burst(C.x*CS+2.5+(Math.random()-.5)*30,C.y*CS+8,'#e9cf95',3)}}}
      if(!moatGot){moatT-=dt;if(moatT<=0){moatT=.4;for(c=0;c<B.castles.length;c++)if(moatOK(B,c)){moatGot=true;a.add(30);a.sfx('coin');a.beep(1568,.2,'sine');
        var M=B.castles[c];a.pop(M.x*CS+2.5,M.y*CS-46,ko?'해자 완성! +30':'Moat! +30','#9ff3ff');a.burst(M.x*CS+2.5,M.y*CS,'#9ff3ff',14);break}}}
      if(B.res==='win'){mode='clear';modeT=0;beachesDone++;
        var hp=1e9;B.castles.forEach(function(q){hp=Math.min(hp,q.hp)});
        clearPts=40+Math.round(hp/2)+Math.round(20*B.sand/Math.max(1,B.def.sand));a.add(clearPts);
        time=Math.min(70,time+14);lastGain=1.4;a.sfx('win');a.tempo(1+Math.min(.5,beachesDone*.05));
        B.castles.forEach(function(q){['#ffd23f','#ff7a8a','#6fc3ff','#ffffff'].forEach(function(col){a.burst(q.x*CS+2.5,q.y*CS-10,col,8)})})}
      else if(B.res==='lose'){mode='fall';modeT=0;time-=8;a.sfx('hit');a.shake(10);
        B.castles.forEach(function(q){if(q.hp<=0)a.burst(q.x*CS+2.5,q.y*CS,'#e9cf95',22)});
        if(time<=0){time=0;a.over();return}}
    }else{modeT+=dt;flow(dt);
      if(mode==='clear'&&modeT>1.9)loadBeach(lvN+1);
      else if(mode==='fall'&&modeT>1.7)loadBeach(lvN)}
    for(i=specks.length-1;i>=0;i--){var p=specks[i];p.t+=dt;p.vy+=300*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.t>.45)specks.splice(i,1)}
    prevDown=inp.down}

  /* ---------- 그리기 ---------- */
  var SIN=new Float32Array(256);for(var si=0;si<256;si++)SIN[si]=Math.sin(si/256*6.2832);
  function sn(v){return SIN[(v|0)&255]}

  /* 쌓은 벽과 판 도랑은 3배 해상도로 따로 그려 윤곽을 또렷하게 한다 */
  var SUB=3,OW=GW*SUB,OH=GH*SUB,otex=null,octx,oimg,ACT=new Uint8Array(N);
  function bil(arr,gx,gy){var x0=gx|0,y0=gy|0,fx=gx-x0,fy=gy-y0,i=y0*GW+x0,x1=x0<GW-1?1:0,y1=y0<GH-1?GW:0;
    return (arr[i]*(1-fx)+arr[i+x1]*fx)*(1-fy)+(arr[i+y1]*(1-fx)+arr[i+y1+x1]*fx)*fy}
  var SB=new Float32Array(N),WA=new Float32Array(N);
  function paintOver(){
    var b=B.b,base=B.base,d=B.d,px=oimg.data,x,y,i,night=!!B.def.night,any=false;
    px.fill(0);
    for(i=0;i<N;i++){var v=b[i]-base[i];if(B.rock[i])v=0;SB[i]=v;WA[i]=d[i]>0.004?0.25+0.6*(1-Math.exp(-d[i]*1.4)):0;ACT[i]=(v>0.25||v<-0.36)?1:0}
    for(y=SEA;y<UIY;y++)for(x=0;x<GW;x++){i=y*GW+x;
      if(!(ACT[i]||(x>0&&ACT[i-1])||(x<GW-1&&ACT[i+1])||ACT[i-GW]||ACT[i+GW]))continue;any=true;
      for(var sy=0;sy<SUB;sy++)for(var sx=0;sx<SUB;sx++){
        var gx=x+(sx+.5)/SUB-.5,gy=y+(sy+.5)/SUB-.5;if(gx<0)gx=0;if(gy<0)gy=0;
        var S=bil(SB,gx,gy),r,g,bl,al;
        if(S>0.3){var e=.34,dx=bil(SB,gx+e,gy)-bil(SB,gx-e,gy),dy=bil(SB,gx,gy+e)-bil(SB,gx,gy-e);
          var lt=(dx+dy)*1.1;lt=lt>.28?.28:lt<-.42?-.42:lt;var top=Math.min(1,(S-.3)/1.0);
          r=226+18*top;g=192+16*top;bl=130+14*top;
          if(S<0.42){r=170;g=128;bl=78;lt*=.3}
          var wt=bil(B.wet,gx,gy)*.75;r+=(170-r)*wt;g+=(132-g)*wt;bl+=(84-bl)*wt;
          r*=1+lt;g*=1+lt;bl*=1+lt;al=255*(1-bil(WA,gx,gy)*.9)}
        else if(S<-0.4){var e2=.34,dx2=bil(SB,gx+e2,gy)-bil(SB,gx-e2,gy),dy2=bil(SB,gx,gy+e2)-bil(SB,gx,gy-e2);
          var lt2=(dx2+dy2)*1.1;lt2=lt2>.3?.3:lt2<-.35?-.35:lt2;var dep=Math.min(1,(-S-.4)/.7);
          r=196-40*dep;g=162-44*dep;bl=110-40*dep;
          if(S>-0.5){r=150;g=112;bl=66;lt2*=.3}
          r*=1+lt2;g*=1+lt2;bl*=1+lt2;al=255*(1-bil(WA,gx,gy)*.92)}
        else continue;
        if(night){r=r*.42;g=g*.5;bl=bl*.78+12}
        var o=((y*SUB+sy)*OW+x*SUB+sx)*4;px[o]=r;px[o+1]=g;px[o+2]=bl;px[o+3]=al}}
    octx.putImageData(oimg,0,0);return any}
  var RN=new Float32Array(N);for(var ri0=0;ri0<N;ri0++)RN[ri0]=hash(ri0*1.37)*256;
  var FRONT=new Int32Array(1200),nFront=0;
  function paintTex(t){nFront=0;
    var b=B.b,d=B.d,base=B.base,wet=B.wet,rock=B.rock,px=img.data,night=!!B.def.night,x,y,i,o,
        ti=t*60|0;
    for(y=0;y<GH;y++){var ym=y>0?-GW:0,yp=y<GH-1?GW:0,ybase=baseH(0,y);
      for(x=0;x<GW;x++){i=y*GW+x;o=i*4;
        var xm=x>0?-1:0,xp=x<GW-1?1:0,bb=b[i],dd=d[i],r,g,bl;
        var gx=b[i+xp]-b[i+xm],gy=b[i+yp]-b[i+ym];if(rock[i+xp]||rock[i+xm])gx=0;if(rock[i+yp]||rock[i+ym])gy=0;
        var s=rock[i]?0:bb-base[i],dune=base[i]-ybase;
        var lt=(gx+gy-0.06)*0.5;lt=lt>0.2?0.2:lt<-0.34?-0.34:lt;
        /* 그림자: 왼쪽 위가 높으면 */
        var sh=0;if(x>1&&y>1&&!rock[i]){var hb=b[i-GW-1]-bb;if(!rock[i-GW-1]&&hb>0.18)sh=Math.min(.28,(hb-.18)*.35)}
        r=238;g=216;bl=164;
        if(dune>0){var k=Math.min(1,dune*.5);r+=8*k;g+=8*k;bl+=10*k}
        if(s>0.04){k=Math.min(1,s/1.0);r-=2*k;g-=14*k;bl-=34*k}
        else if(s<-0.04){k=Math.min(1,-s/0.9);r-=40*k;g-=46*k;bl-=50*k}
        var w=wet[i]*0.8;r+=(178-r)*w;g+=(144-g)*w;bl+=(96-bl)*w;
        var f=1+lt-sh;r*=f;g*=f;bl*=f;
        if(dd>0.004||y<SEA){
          var dk=y<SEA?0.55+dd*.25:dd/3.2;dk=dk>1?1:dk;var al=y<SEA?.92:0.25+0.6*(1-Math.exp(-dd*1.4));
          var wr=104+(22-104)*dk,wg=212+(98-212)*dk,wb=214+(168-214)*dk;
          var cs=(sn(x*23+sn(y*29+ti)*30+ti*2)+sn(y*19+sn(x*17-ti)*30-ti*1.5))*(4.5-2*dk);wr+=cs;wg+=cs;wb+=cs*.6;
          /* 수면 기울기로 반짝임 */
          var hx=(b[i+xp]+d[i+xp])-(b[i+xm]+d[i+xm]),hy=(b[i+yp]+d[i+yp])-(b[i+ym]+d[i+ym]);
          var gl=(hx+hy)*38;gl=gl>30?30:gl<-30?-30:gl;wr+=gl;wg+=gl;wb+=gl;
          r=r+(wr-r)*al;g=g+(wg-g)*al;bl=bl+(wb-bl)*al;
          /* 거품: 물 가장자리, 빠른 물 */
          var fo=0;
          if(y>=SEA-1&&dd<0.35){var dry=(x>0&&d[i-1]<0.004&&!rock[i-1])||(x<GW-1&&d[i+1]<0.004&&!rock[i+1])||(y<GH-1&&d[i+GW]<0.004&&!rock[i+GW])||(d[i-GW]<0.004&&!rock[i-GW]);
            if(dry){fo=.6+.25*sn(RN[i]*3+ti*4);if(y>=SEA&&nFront<1200)FRONT[nFront++]=i}}
          var ov=B.fl[i]+B.fr[i]+B.ft[i]+B.fb[i],v=ov/(dd+0.06);if(v>0.3){var fv=(v-0.3)*1.3;fv=fv>.75?.75:fv;fv*=.6+.4*sn(RN[i]+ti*6);if(fv>fo)fo=fv}
          if(fo>0){r+=(255-r)*fo;g+=(255-g)*fo;bl+=(255-bl)*fo}}
        if(y<SEA){var top=(SEA-y)/SEA;r*=1-top*.35;g*=1-top*.25;bl*=1-top*.12}
        if(night){r=r*.42;g=g*.5;bl=bl*.78+12}
        px[o]=r;px[o+1]=g;px[o+2]=bl;px[o+3]=255}}
    tctx.putImageData(img,0,0)}

  function drawRock(g,p,night){var cap=p.length>3,rr=p[p.length-1]*CS+2;
    g.save();g.lineCap='round';
    var path=function(off){g.beginPath();if(cap){g.lineWidth=rr*2;g.moveTo(p[0]*CS+2.5+off,p[1]*CS+2.5+off);g.lineTo(p[2]*CS+2.5+off,p[3]*CS+2.5+off)}else{g.arc(p[0]*CS+2.5+off,p[1]*CS+2.5+off,rr,0,7)}};
    g.fillStyle=g.strokeStyle='rgba(60,40,20,.25)';path(3);cap?g.stroke():g.fill();
    g.fillStyle=g.strokeStyle=night?'#4c5466':'#8b8f99';path(0);cap?g.stroke():g.fill();
    g.fillStyle=g.strokeStyle=night?'#636c80':'#aab0ba';g.save();g.translate(-1.5,-2);g.scale(1,1);
    if(cap){g.lineWidth=rr*1.3;g.beginPath();g.moveTo(p[0]*CS+2.5,p[1]*CS+2.5);g.lineTo(p[2]*CS+2.5,p[3]*CS+2.5);g.stroke()}
    else{g.beginPath();g.arc(p[0]*CS+2.5,p[1]*CS+2.5,rr*.7,0,7);g.fill()}g.restore();
    g.fillStyle='rgba(255,255,255,.45)';var hx=cap?(p[0]+p[2])/2:p[0],hy=cap?(p[1]+p[3])/2:p[1];
    g.beginPath();g.ellipse(hx*CS-rr*.3,hy*CS-rr*.3,rr*.28,rr*.16,-.5,0,7);g.fill();g.restore()}

  function drawCastle(g,C,ci,t){
    var x=C.x*CS+2.5,y=C.y*CS+2.5,h=Math.max(0,C.hp/100),fall=mode==='fall'&&C.hp<=0?Math.min(1,modeT/1.2):0,night=!!B.def.night;
    var sy=(0.45+0.55*h)*(1-fall*.85),sand=night?'#a99a7c':'#e9c98a',dark=night?'#7d6f58':'#c9a160',lite=night?'#c2b394':'#f6dfa8';
    g.save();g.translate(x,y+12);
    g.fillStyle='rgba(70,45,20,.28)';g.beginPath();g.ellipse(3,2,24,7,0,0,7);g.fill();
    if(C.hit>0)g.translate((Math.random()-.5)*2,0);
    g.scale(1,sy);
    function block(bx,by,bw,bh){g.fillStyle=sand;g.fillRect(bx,by,bw,bh);g.fillStyle=dark;g.fillRect(bx+bw-3,by,3,bh);g.fillStyle=lite;g.fillRect(bx,by,2,bh)}
    /* 뒤쪽 탑 */
    block(-17,-30,9,30);block(8,-30,9,30);
    g.fillStyle=lite;for(var k=0;k<3;k++){g.fillRect(-17+k*3.4,-34,2.2,4);g.fillRect(8+k*3.4,-34,2.2,4)}
    /* 가운데 성채 */
    block(-9,-22,18,22);
    g.fillStyle=lite;for(k=0;k<4;k++)g.fillRect(-9+k*5,-26,3,4);
    /* 앞 성벽 */
    block(-21,-12,42,12);g.fillStyle=lite;for(k=0;k<7;k++)g.fillRect(-21+k*6.2,-15,3.4,3);
    /* 문 */
    g.fillStyle=night?'#3a2d22':'#6b4a2c';g.beginPath();g.moveTo(-5,0);g.lineTo(-5,-6);g.arc(0,-6,5,3.14,0);g.lineTo(5,0);g.fill();
    /* 창문 & 조개 장식 */
    g.fillStyle=night?'#ffd770':'#6b4a2c';g.fillRect(-14,-24,3,4);g.fillRect(11.5,-24,3,4);
    g.fillStyle='#ffb3c1';g.beginPath();g.arc(-13,-6,2.2,3.14,0);g.fill();g.beginPath();g.arc(13,-6,2.2,3.14,0);g.fill();
    /* 모래 알갱이 */
    g.fillStyle='rgba(150,110,60,.35)';for(k=0;k<14;k++)g.fillRect(-20+hash(k+ci*30)*40,-30+hash(k+7+ci*30)*30,1.2,1.2);
    /* 금 */
    if(h<.7){g.strokeStyle='rgba(110,70,30,.6)';g.lineWidth=1;g.beginPath();g.moveTo(-14,-12);g.lineTo(-11,-6);g.lineTo(-13,-1);
      if(h<.4){g.moveTo(10,-20);g.lineTo(13,-14);g.lineTo(11,-9)}g.stroke()}
    /* 깃발 */
    g.strokeStyle='#7a5a3a';g.lineWidth=1.3;g.beginPath();g.moveTo(0,-26);g.lineTo(0,-40);g.stroke();
    g.fillStyle=ci?'#4fb3ff':'#ff5a6a';g.beginPath();g.moveTo(0,-40);
    g.quadraticCurveTo(5,-40+Math.sin(t*6+ci)*1.5,10,-37+Math.sin(t*6+1+ci)*1.5);g.lineTo(0,-34);g.fill();
    if(C.hit>0){g.fillStyle='rgba(120,190,220,.35)';g.fillRect(-21,-4,42,4)}
    g.restore();
    /* 꽃게 왕 */
    var st='idle';
    if(mode==='clear')st='happy';else if(fall>0)st='sad';else if(C.hit>0||nearWater(C))st='worry';
    var cy=y+12-(12+12*sy)*1;if(fall>0)cy=y+4+fall*10;
    drawCrab(g,x,cy,st,t,ci,night);
    /* 체력 */
    if(C.hp<100&&mode==='play'){var bw=34;g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x-bw/2-1,y-44,bw+2,6);
      g.fillStyle=h>.5?'#7ee07a':h>.25?'#ffc94a':'#ff5b5b';g.fillRect(x-bw/2,y-43,bw*h,4)}}
  function nearWater(C){for(var k=0;k<C.cells.length;k+=3){var i=C.cells[k];if(i-3*GW>=0&&B.d[i-3*GW]>0.02)return true}return false}

  function drawCrab(g,x,y,st,t,ci,night){
    g.save();g.translate(x,y);var bob=st==='happy'?-Math.abs(Math.sin(t*10))*5:st==='worry'?Math.sin(t*30)*.8:Math.sin(t*2.2)*.6;g.translate(0,bob);
    var body=night?'#c8564a':'#ff6b4f',dk=night?'#8a3a33':'#c8432c';
    /* 다리 */
    g.strokeStyle=dk;g.lineWidth=1.6;g.lineCap='round';
    for(var k=0;k<3;k++){var ly=1+k*2.2,lw=Math.sin(t*8+k)*(st==='worry'?1.5:.5);
      g.beginPath();g.moveTo(-6,ly);g.lineTo(-10,ly+2+lw);g.moveTo(6,ly);g.lineTo(10,ly+2-lw);g.stroke()}
    /* 집게 */
    var up=st==='worry'?-6+Math.sin(t*18)*2:st==='happy'?-7:st==='sad'?3:-1+Math.sin(t*2)*1;
    g.fillStyle=body;g.strokeStyle=dk;g.lineWidth=1.1;
    [-1,1].forEach(function(s){g.beginPath();g.moveTo(s*6,0);g.lineTo(s*10,up+3);g.stroke();
      g.beginPath();g.ellipse(s*11,up,3.4,2.8,s*.5,0,7);g.fill();g.stroke();
      g.fillStyle=dk;g.beginPath();g.moveTo(s*11,up);g.lineTo(s*14,up-2.5);g.lineTo(s*13,up+.5);g.fill();g.fillStyle=body});
    /* 몸통 */
    g.beginPath();g.ellipse(0,1,7.5,5.2,0,0,7);g.fill();g.stroke();
    g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(-2.5,-.8,3,1.4,-.3,0,7);g.fill();
    /* 눈자루 */
    g.strokeStyle=dk;g.lineWidth=1.3;g.beginPath();g.moveTo(-2.5,-3);g.lineTo(-3,-7);g.moveTo(2.5,-3);g.lineTo(3,-7);g.stroke();
    var blink=(t+ci*1.3)%3.4<.13;
    g.fillStyle='#fff';g.strokeStyle='#3a1a14';g.lineWidth=.8;
    var er=st==='worry'?2.6:2.1;
    [-3,3].forEach(function(ex){g.beginPath();g.arc(ex,-8,er,0,7);g.fill();g.stroke()});
    g.fillStyle='#2a1410';g.strokeStyle='#2a1410';g.lineWidth=1;
    if(st==='happy'){[-3,3].forEach(function(ex){g.beginPath();g.arc(ex,-7.4,1.4,3.4,6.0);g.stroke()})}
    else if(blink){[-3,3].forEach(function(ex){g.beginPath();g.moveTo(ex-1.6,-8);g.lineTo(ex+1.6,-8);g.stroke()})}
    else{var lx=st==='worry'?0:Math.sin(t*.7)*.6,ly2=st==='sad'?.8:st==='worry'?-.8:0;
      [-3,3].forEach(function(ex){g.beginPath();g.arc(ex+lx,-8+ly2,st==='worry'?.9:1.1,0,7);g.fill()})}
    /* 입 */
    g.strokeStyle='#5a1e14';g.lineWidth=1;g.beginPath();
    if(st==='happy'||st==='idle')g.arc(0,1.5,1.8,.2,2.9);else if(st==='sad')g.arc(0,4,1.8,3.5,5.9);else g.ellipse(0,2.6,1.1,1.6,0,0,7);g.stroke();
    /* 왕관 */
    g.fillStyle='#ffd23f';g.strokeStyle='#b8860b';g.lineWidth=.8;g.beginPath();
    var cw=ci?3.5:4.5;g.moveTo(-cw,-3.2);g.lineTo(-cw,-6.4);g.lineTo(-cw/2,-4.6);g.lineTo(0,-7.4);g.lineTo(cw/2,-4.6);g.lineTo(cw,-6.4);g.lineTo(cw,-3.2);g.closePath();g.fill();g.stroke();
    if(st==='worry'){g.fillStyle='#8fd8ff';g.beginPath();g.moveTo(9,-9);g.quadraticCurveTo(11,-5,9,-4.5);g.quadraticCurveTo(7,-5,9,-9);g.fill()}
    if(st==='sad'){g.fillStyle='#8fd8ff';g.beginPath();g.arc(-3,-4.5+((t*3)%1)*4,.9,0,7);g.fill()}
    g.restore()}

  function drawGull(g,G,t){
    var x=G.x*CS+2.5,y=G.y*CS+2.5,u=G.t,fx=x,fy=y,fly=0;
    if(u<1){fly=1-u;fx=x-(1-u)*140;fy=y-(1-u)*120}else if(u>2.4){fly=(u-2.4)/.8;fx=x+fly*150;fy=y-fly*130}
    g.save();g.fillStyle='rgba(40,30,20,.2)';g.beginPath();g.ellipse(x+(fx-x)*.3+3,y+4,7,2.5,0,0,7);g.fill();
    g.translate(fx,fy);var peck=fly===0?Math.max(0,Math.sin(t*14))*3:0;
    g.fillStyle='#fff';g.strokeStyle='#8a94a3';g.lineWidth=1;
    g.beginPath();g.ellipse(0,0,7,4.5,0,0,7);g.fill();g.stroke();
    var wf=fly>0?Math.sin(t*20)*6:0;g.fillStyle='#b9c2cf';g.beginPath();g.moveTo(-3,-1);g.quadraticCurveTo(-9,-6-wf,-14,-2-wf);g.quadraticCurveTo(-7,1,-3,1);g.fill();
    g.beginPath();g.moveTo(3,-1);g.quadraticCurveTo(9,-6-wf,14,-2-wf);g.quadraticCurveTo(7,1,3,1);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(5,-3+peck,3.4,0,7);g.fill();g.stroke();
    g.fillStyle='#ffb02e';g.beginPath();g.moveTo(8,-3+peck);g.lineTo(12,-1.5+peck);g.lineTo(8,-1.5+peck);g.fill();
    g.fillStyle='#222';g.beginPath();g.arc(6,-4+peck,.9,0,7);g.fill();g.restore()}

  var grain=null;
  function makeGrain(){grain=document.createElement('canvas');grain.width=W;grain.height=H;var p=grain.getContext('2d'),i;
    for(i=0;i<3200;i++){var y=SEA*CS+hash(i+.7)*(H-SEA*CS);p.fillStyle=hash(i)>.5?'rgba(255,255,255,.16)':'rgba(110,80,40,.09)';p.fillRect(hash(i+.3)*W,y,1+hash(i+.1)*1.5,1+hash(i+.5)*1.2)}
    for(i=0;i<16;i++){var x=hash(i+500)*W,yy=SEA*CS+40+hash(i+600)*(H-SEA*CS-110);p.fillStyle=['rgba(255,190,200,.55)','rgba(255,255,245,.6)','rgba(200,170,130,.5)'][i%3];
      p.beginPath();if(i%3===0){p.arc(x,yy,2.6,3.14,0);p.fill()}else{p.ellipse(x,yy,1.8,1.3,hash(i)*3,0,7);p.fill()}}}
  function nextWave(){var w=B.def.waves;for(var k=0;k<w.length;k++){var ts=B.lead+k*B.period;if(ts>B.t-0.2)return {k:k,ts:ts,a:w[k]}}return null}

  function draw(g,a,dt){var p0=performance.now();draw2(g,a,dt);var dd=performance.now()-p0;PERF.d+=dd;if(dd>PERF.dmax)PERF.dmax=dd}
  function draw2(g,a,dt){
    tG+=dt||0;var t=tG,ko=a.lang==='ko',i,p;if(!B)return;
    if(!tex){tex=document.createElement('canvas');tex.width=GW;tex.height=GH;tctx=tex.getContext('2d');img=tctx.createImageData(GW,GH)}
    var night=!!B.def.night;
    paintTex(t);
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(tex,0,0,GW,GH,-2.5,-2.5,W+5,H+5);
    if(!otex){otex=document.createElement('canvas');otex.width=OW;otex.height=OH;octx=otex.getContext('2d');oimg=octx.createImageData(OW,OH)}
    if(paintOver())g.drawImage(otex,0,0,OW,OH,0,0,W,H);
    if(!grain)makeGrain();g.drawImage(grain,0,0);
    /* 바다 쪽 일렁이는 물결 (배경 레이어) */
    g.save();g.globalAlpha=.22;g.strokeStyle='#e8fbff';g.lineWidth=1.4;
    for(i=0;i<6;i++){var wy=8+((i*15+t*6)%(SEA*CS-14));g.beginPath();for(var xx=0;xx<=W;xx+=12){var yy=wy+Math.sin(xx*.05+t*1.3+i*2)*2.2;xx?g.lineTo(xx,yy):g.moveTo(xx,yy)}g.stroke()}
    g.restore();
    if(night){/* 달과 별 */
      g.fillStyle='rgba(255,255,255,.8)';for(i=0;i<14;i++){var tw=.4+.6*Math.abs(Math.sin(t*1.5+i));g.globalAlpha=tw*.7;g.fillRect(hash(i+3)*W,30+hash(i+9)*50,1.5,1.5)}
      g.globalAlpha=1;var mg=g.createRadialGradient(256,52,4,256,52,40);mg.addColorStop(0,'rgba(255,250,220,.55)');mg.addColorStop(1,'rgba(255,250,220,0)');
      g.fillStyle=mg;g.fillRect(206,10,100,90);g.fillStyle="#fff6d0";g.beginPath();g.arc(256,52,13,0,7);g.fill();
      g.fillStyle='rgba(200,190,150,.5)';g.beginPath();g.arc(252,49,2.5,0,7);g.arc(260,56,1.8,0,7);g.fill();
      g.globalAlpha=.22;g.fillStyle='#fff6d0';for(i=0;i<8;i++){var ry=74+i*9;g.fillRect(256-14+Math.sin(t*2+i)*5+i,ry,28-i*2,2)}g.globalAlpha=1}
    /* 물 가장자리 거품 (계단을 부드럽게) */
    g.fillStyle=night?'rgba(200,215,240,.5)':'rgba(255,255,255,.62)';g.beginPath();
    for(i=0;i<nFront;i++){var fi=FRONT[i],fx=(fi%GW)*CS+2.5+sn(fi*13+t*90)*1.5,fy=((fi/GW)|0)*CS+2.5+sn(fi*7+t*70)*1.2,fr2=2.6+1.1*sn(fi*31+t*160);
      g.moveTo(fx+fr2,fy);g.arc(fx,fy,fr2,0,6.283)}g.fill();
    /* 배수 웅덩이 */
    (B.def.drains||[]).forEach(function(p,k){var x=p[0]*CS+2.5,y=p[1]*CS+2.5,r=p[2]*CS+3;
      g.fillStyle=night?'#0d2340':'#1d5f8f';g.beginPath();g.ellipse(x,y,r+2,r*.85+2,0,0,7);g.fill();
      g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1.5;for(var j=0;j<3;j++){var ph=(t*.8+j/3)%1;g.globalAlpha=1-ph;g.beginPath();g.ellipse(x,y,r*ph,r*.8*ph,0,0,7);g.stroke()}
      g.globalAlpha=.6;g.beginPath();g.arc(x,y,r*.45,t*3,t*3+2.4);g.stroke();g.globalAlpha=1;
      g.strokeStyle='rgba(120,90,50,.45)';g.lineWidth=2;g.beginPath();g.ellipse(x,y,r+2,r*.85+2,0,0,7);g.stroke()});
    /* 개울 샘 */
    if(B.def.stream){var st=B.def.stream,sx=st.x*CS+2.5,sy=st.y*CS+2.5;g.fillStyle='#7d828d';
      g.beginPath();g.arc(sx+4,sy-9,6,0,7);g.arc(sx+5,sy+9,6,0,7);g.fill();g.fillStyle='#9fdcf0';g.beginPath();g.ellipse(sx+1,sy,4,5,0,0,7);g.fill();
      g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1.2;for(i=0;i<3;i++){var u=(t*1.5+i/3)%1;g.globalAlpha=1-u;g.beginPath();g.arc(sx-u*10,sy,2+u*4,1.6,4.7);g.stroke()}g.globalAlpha=1}
    /* 미역 */
    (B.def.weed||[]).forEach(function(p,k){var n=Math.round(p[2]*p[2]*.5);g.lineCap='round';
      for(var j=0;j<n;j++){var ang=hash(j+k*50)*6.28,rr=Math.sqrt(hash(j*3+k))*p[2],x=(p[0]+Math.cos(ang)*rr)*CS,y=(p[1]+Math.sin(ang)*rr/1.2)*CS;
        var ix=Math.round(x/CS),iy=Math.round(y/CS),wd=B.d[Math.max(0,Math.min(N-1,iy*GW+ix))]>0.02,sw=Math.sin(t*(wd?3:1.2)+j)*(wd?3:1.2);
        g.strokeStyle=j%3?(night?'#2c6a4a':'#3f9a5c'):(night?'#3d7d3a':'#6cbf4a');g.lineWidth=2.2;g.beginPath();g.moveTo(x,y+4);g.quadraticCurveTo(x+sw,y-1,x+sw*1.6,y-6);g.stroke()}});
    /* 바위 */
    (B.def.rocks||[]).forEach(function(p){drawRock(g,p,night)});
    /* 반짝이 */
    if(spark.length<26){var ci=SEA*GW+Math.floor(Math.random()*(UIY-SEA)*GW);if(B.d[ci]>0.12)spark.push({x:(ci%GW)*CS+2.5,y:Math.floor(ci/GW)*CS+2.5,t:0})}
    if(Math.random()<.5)spark.push({x:Math.random()*W,y:32+Math.random()*(SEA*CS-36),t:0});
    g.fillStyle='#fff';for(i=spark.length-1;i>=0;i--){p=spark[i];p.t+=dt||0;if(p.t>.7){spark.splice(i,1);continue}
      var sz=Math.sin(p.t/.7*3.14)*2.6;g.globalAlpha=.85;g.beginPath();g.moveTo(p.x-sz,p.y);g.lineTo(p.x,p.y-sz*.35);g.lineTo(p.x+sz,p.y);g.lineTo(p.x,p.y+sz*.35);g.fill();
      g.beginPath();g.moveTo(p.x,p.y-sz);g.lineTo(p.x+sz*.35,p.y);g.lineTo(p.x,p.y+sz);g.lineTo(p.x-sz*.35,p.y);g.fill()}g.globalAlpha=1;
    /* 성 */
    B.castles.forEach(function(C,k){drawCastle(g,C,k,t)});
    if(B.gull)drawGull(g,B.gull,t);
    /* 모래 튀김 */
    for(i=0;i<specks.length;i++){p=specks[i];g.globalAlpha=1-p.t/.45;g.fillStyle=p.dig?'#b08a55':'#f3dca6';g.fillRect(p.x,p.y,2.4,2.4)}g.globalAlpha=1;
    /* 구름 그림자 (천천히 흐르는 레이어) */
    for(i=0;i<clouds.length;i++){p=clouds[i];p.x+=p.v*(dt||0);if(p.x>W+90)p.x=-90;
      g.fillStyle=night?'rgba(0,0,20,.08)':'rgba(90,70,40,.07)';g.beginPath();g.ellipse(p.x,p.y,60*p.s,22*p.s,0,0,7);g.ellipse(p.x+30*p.s,p.y-8*p.s,34*p.s,18*p.s,0,0,7);g.fill()}
    /* 다음 파도 예고선 */
    var nw=nextWave();
    if(nw&&mode==='play'){var lead=nw.ts-B.t,show=lead<4.5;
      if(show&&lead>0){var u2=1-lead/4.5,ly=30+u2*(SEA*CS-32),th=2+(nw.a-2)*3.2;
        var wv=function(xx,o){return ly+o+Math.sin(xx*.045+t*2)*2+Math.sin(xx*.13+t)*1.2};
        g.fillStyle='rgba(10,50,100,'+(.18+.22*u2)+')';g.beginPath();for(xx=0;xx<=W;xx+=8)xx?g.lineTo(xx,wv(xx,0)):g.moveTo(xx,wv(xx,0));
        for(xx=W;xx>=0;xx-=8)g.lineTo(xx,wv(xx,th*2.2+5));g.closePath();g.fill();
        g.strokeStyle='rgba(255,255,255,'+(.5+.45*u2)+')';g.lineWidth=th;g.lineCap='round';g.beginPath();
        for(xx=0;xx<=W;xx+=8)xx?g.lineTo(xx,wv(xx,0)):g.moveTo(xx,wv(xx,0));g.stroke();
        g.fillStyle='rgba(255,255,255,.8)';for(xx=6;xx<W;xx+=23){var fy2=wv(xx,-th*.6)-Math.abs(Math.sin(t*3+xx))*2;g.beginPath();g.arc(xx,fy2,1.2+th*.25,0,7);g.fill()}}
      var big=nw.a>=2.9?2:nw.a>=2.5?1:0,lab=ko?['작은 파도','파도','큰 파도!'][big]:['Small wave','Wave','Big wave!'][big];
      g.font='14px Jua, system-ui, sans-serif';g.textAlign='left';
      var txt='🌊 '+lab+' '+Math.max(0,Math.ceil(lead))+(ko?'초':'s'),tw3=g.measureText(txt).width+14;
      g.fillStyle=big===2?'rgba(190,40,40,.55)':'rgba(0,40,80,.4)';g.beginPath();g.roundRect?g.roundRect(6,42,tw3,21,10):g.rect(6,42,tw3,21);g.fill();
      g.fillStyle=big===2?'#ffe08a':'#fff';g.fillText(txt,13,57)}
    /* 키보드 커서 / 붓 표시 */
    var bx=null,by;if(kbOn&&mode==='play'){bx=cur.x;by=cur.y}else if(drawing==='p'&&px0!=null){bx=px0;by=py0}
    if(bx!=null){var dg=(kbOn&&keys.sh)||tool==='dig';g.strokeStyle=dg?'rgba(90,60,30,.85)':'rgba(255,255,255,.9)';g.lineWidth=2;g.setLineDash([4,3]);
      g.beginPath();g.arc(bx,by,BR*CS+2,0,7);g.stroke();g.setLineDash([]);if(kbOn){g.fillStyle=g.strokeStyle;g.beginPath();g.arc(bx,by,2,0,7);g.fill()}}
    /* 위쪽 정보 */
    g.font='15px Jua, system-ui, sans-serif';g.textAlign='right';
    var tw2=Math.ceil(time),low=time<10;g.font=(low?19+Math.sin(t*12)*2:17)+'px Jua, system-ui, sans-serif';
    g.fillStyle='rgba(0,40,70,.35)';g.fillText('⏱ '+tw2,W-11,58);g.fillStyle=lastGain>0?'#9effa0':(low?'#ff8a7a':'#fff');g.fillText('⏱ '+tw2,W-12,57);
    if(lastGain>0){g.font='14px Jua, system-ui, sans-serif';g.globalAlpha=Math.min(1,lastGain);g.fillText('+14',W-12,74);g.globalAlpha=1}
    g.textAlign='center';g.font='15px Jua, system-ui, sans-serif';g.fillStyle='#fff';
    g.fillText((ko?'해변 ':'Beach ')+(lvN+1),W/2,50);
    var nwv=B.def.waves.length;for(i=0;i<nwv;i++){var done=i<=B.waveDone,cx=W/2+(i-(nwv-1)/2)*14;
      g.fillStyle=done?'#7ee07a':i===B.wave?'#ffe08a':'rgba(255,255,255,.55)';g.beginPath();g.arc(cx,61,4,0,7);g.fill()}
    /* 힌트 */
    if(B.def.tip&&mode==='play'&&B.waveDone<0){var tx=B.def.tip[ko?'ko':'en'];g.font='16px Jua, system-ui, sans-serif';
      var wd2=g.measureText(tx).width+22,ty=SEA*CS+26;if(wd2>344){g.font=Math.floor(16*322/(wd2-22))+'px Jua, system-ui, sans-serif';wd2=g.measureText(tx).width+22}g.globalAlpha=drawing==='p'?.4:.95;
      g.fillStyle='rgba(255,250,235,.88)';g.beginPath();g.roundRect?g.roundRect(W/2-wd2/2,ty-18,wd2,27,13):g.rect(W/2-wd2/2,ty-18,wd2,27);g.fill();
      g.fillStyle='#6b4a2c';g.fillText(tx,W/2,ty+1);g.globalAlpha=1}
    if(kbOn&&mode==='play'&&!keys.sp){g.font='12px Jua, system-ui, sans-serif';g.textAlign='center';var kt=ko?'방향키 이동 · 스페이스 쌓기 · Shift+스페이스 파기 · Tab 도구':'Arrows move · Space build · Shift+Space dig · Tab tool';
      g.fillStyle='rgba(80,50,20,.55)';g.fillText(kt,W/2+1,UIY*CS-7);g.fillStyle='#fff';g.fillText(kt,W/2,UIY*CS-8)}
    /* 아래 도구 막대 */
    g.fillStyle='rgba(90,62,34,.55)';g.beginPath();g.roundRect?g.roundRect(2,586,310,52,12):g.rect(2,586,310,52);g.fill();
    ['build','dig'].forEach(function(k){var bt=BTN[k],on=tool===k;g.fillStyle=on?'#fff3d6':'rgba(255,243,214,.35)';
      g.beginPath();g.roundRect?g.roundRect(bt.x,bt.y,bt.w,bt.h,10):g.rect(bt.x,bt.y,bt.w,bt.h);g.fill();
      if(on){g.strokeStyle='#ff9a3d';g.lineWidth=2.5;g.stroke()}
      var ix=bt.x+bt.w/2,iy=bt.y+bt.h/2-3;
      if(k==='build'){g.fillStyle='#ff8a3d';g.beginPath();g.moveTo(ix-10,iy-7);g.lineTo(ix+10,iy-7);g.lineTo(ix+7,iy+9);g.lineTo(ix-7,iy+9);g.closePath();g.fill();
        g.fillStyle='#f3d9a0';g.beginPath();g.ellipse(ix,iy-7,10,3,0,0,7);g.fill();g.strokeStyle='#7a4a1c';g.lineWidth=1.5;g.beginPath();g.arc(ix,iy-7,11,3.4,6.0);g.stroke()}
      else{g.save();g.translate(ix,iy);g.rotate(.6);g.fillStyle='#8a5a30';g.fillRect(-1.5,-12,3,14);g.fillStyle='#4fb3ff';g.beginPath();g.moveTo(-6,2);g.lineTo(6,2);g.lineTo(5,9);g.quadraticCurveTo(0,14,-5,9);g.closePath();g.fill();g.restore()}
      g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle=on?'#6b4a2c':'rgba(255,255,255,.8)';
      g.fillText(k==='build'?(ko?'쌓기':'Build'):(ko?'파기':'Dig'),ix,bt.y+bt.h-3)});
    var fr=Math.max(0,Math.min(1,B.sand/Math.max(1,B.def.sand))),bx0=130,bw0=170;
    g.font='12px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='#fff';g.fillText(ko?'모래 양동이':'Sand bucket',bx0,602);
    g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.roundRect?g.roundRect(bx0,608,bw0,16,8):g.rect(bx0,608,bw0,16);g.fill();
    if(fr>0){var sg=g.createLinearGradient(0,608,0,624);sg.addColorStop(0,'#fbe3a8');sg.addColorStop(1,'#d9a85a');g.fillStyle=sg;
      g.beginPath();g.roundRect?g.roundRect(bx0,608,Math.max(10,bw0*fr),16,8):g.rect(bx0,608,bw0*fr,16);g.fill()}
    if(B.def.refill){g.fillStyle='rgba(255,255,255,.75)';g.textAlign='right';g.fillText((ko?'파도 뒤 +':'+')+Math.round(100*B.def.refill/B.def.sand)+'%'+(ko?'':' after waves'),bx0+bw0,602)}
    if(night){g.fillStyle='rgba(10,20,60,.18)';g.fillRect(0,0,W,586)}
    /* 결과 배너 */
    if(mode==='clear'||mode==='fall'){var cl=mode==='clear',al2=Math.min(1,modeT*3);g.globalAlpha=al2;
      g.fillStyle=cl?'rgba(255,250,230,.92)':'rgba(60,40,30,.82)';g.beginPath();g.roundRect?g.roundRect(40,250,280,76,18):g.rect(40,250,280,76);g.fill();
      g.textAlign='center';g.font='28px Jua, system-ui, sans-serif';g.fillStyle=cl?'#ff7a3d':'#ffd9c2';
      g.fillText(cl?(ko?'성을 지켰다!':'Castle saved!'):(ko?'성이 무너졌어요':'The castle fell'),W/2,286);
      g.font='16px Jua, system-ui, sans-serif';g.fillStyle=cl?'#6b4a2c':'#fff';
      g.fillText(cl?('+'+clearPts+(ko?'점 · 시간 +14초':' pts · +14s')):(ko?'다시 쌓아요 · 시간 −8초':'Rebuild · −8s'),W/2,311);g.globalAlpha=1}
  }

  window.__sandcastle={beach:function(){return B},load:function(n){loadBeach(n);time=70},state:function(){return {lvN:lvN,mode:mode,time:time,tool:tool}},perf:function(r){var o={update:PERF.u/Math.max(1,PERF.n),draw:PERF.d/Math.max(1,PERF.n),umax:PERF.umax,dmax:PERF.dmax,n:PERF.n};if(r){PERF.u=PERF.d=PERF.n=PERF.umax=PERF.dmax=0}return o}};
  SG.run({id:'sandcastle',title:{ko:'모래성 지키기',en:'Sandcastle Tide'},
    how:{ko:'끌어서 모래벽을 쌓고, 삽으로 도랑을 파서 밀려오는 파도로부터 꽃게 왕의 모래성을 지켜요!',
         en:'Drag to pile sand walls and dig trenches to keep the rising tide off the crab king\'s castle!'},
    init:init,update:update,draw:draw});
})();
