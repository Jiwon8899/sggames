/* 빛 따라 덩굴 (Grow Light) — 플레이어는 빛이고, 움직이는 건 덩굴이다.
   성장 시뮬레이션(코어)은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,TOP=44,FLOOR=610,X0=6,X1=354,POTY=598,STARTY=578,SPEED=64,RAD=24,STEP=4,LEAF=44,BLOOM=18,BASK=8,
      TRW=34,TRY=48,TRH=30,LOOK=34,PI=Math.PI,hyp=Math.hypot;
  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function wrap(a){while(a>PI)a-=2*PI;while(a<-PI)a+=2*PI;return a}
  function rng(seed){var s=(seed>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}

  /* ---------- 방 데이터 ----------
     sh:[x,y,w,h] 선반  buds:[x,y]  drops:[x,y]  fix:[x,y] 고정 전등(선반 그림자=어둠)  snail:{side,t}  bat:[x,y]
     web:[x,y,w,h] 반딧불이가 못 들어가는 거미줄  mir:{x,y,sx,sy} 거울을 비추면 sx,sy에 빛점  route: 검증 봇 경로 */
  var ROOMS=[
    {tr:180,buds:[[180,330]],route:[[180,330],[180,64]],
      tip:{ko:'빛을 움직이면 덩굴이 따라와요',en:'Move the light and the vine follows'}},
    {tr:262,sh:[[96,300,258,16]],buds:[[50,296]],route:[[60,400],[50,296],[70,220],[262,64]],
      tip:{ko:'선반을 돌아서 가요',en:'Curve around the shelf'}},
    {tr:70,sh:[[130,350,100,16]],buds:[[70,430],[292,300]],route:[[70,430],[84,330],[292,300],[280,190],[70,64]],
      tip:{ko:'줄기는 다시 못 넘어요. 길을 미리 그려요',en:'The stem can\'t be crossed — plan the route'}},
    {tr:120,fix:[[56,70]],sh:[[200,250,110,14]],buds:[[300,350],[120,300]],route:[[300,350],[240,304],[120,300],[120,64]],
      tip:{ko:'그림자 속에선 빛을 바짝 대 주세요',en:'In shadow, keep the light close'}},
    {tr:290,sh:[[6,330,200,16]],buds:[[280,420],[70,240]],snail:{side:-1,t:2},route:[[280,420],[262,300],[70,240],[60,190],[120,150],[290,64]],
      tip:{ko:'달팽이에게 빛을 비추면 쏙!',en:'Shine on the snail to shoo it'}},
    {tr:280,sh:[[6,420,230,16],[124,250,230,16]],buds:[[300,420],[60,260]],drops:[[280,510],[100,340]],
      route:[[280,510],[300,420],[270,340],[100,340],[60,260],[90,180],[280,64]],
      tip:{ko:'물방울을 마시면 쑥쑥!',en:'Water drops speed you up'}},
    {tr:180,sh:[[100,300,160,16]],bat:[180,326],buds:[[180,384],[180,240]],route:[[180,384],[230,372],[290,330],[290,260],[180,240],[180,64]],
      tip:{ko:'쉿! 박쥐를 비추면 깨요',en:'Shh! Light wakes the bat'}},
    {tr:70,fix:[[320,66]],sh:[[150,380,204,16],[6,230,190,16]],buds:[[60,330],[300,300]],snail:{side:1,t:3},drops:[[100,470]],
      route:[[100,470],[60,330],[110,300],[300,300],[300,200],[240,150],[70,64]],
      tip:{ko:'어둠과 달팽이, 둘 다 조심',en:'Darkness and a snail'}},
    {tr:100,sh:[[190,186,164,14],[190,400,164,14]],web:[190,200,164,200],mir:{x:40,y:300,sx:334,sy:300},buds:[[300,300]],
      route:[[150,360],[300,300,{lamp:[40,300]}],[140,246,{lamp:[140,240]}],[100,64]],
      tip:{ko:'거미줄엔 못 들어가요. 거울을 비춰요',en:'Can\'t enter the web — light the mirror'}},
    {tr:120,fix:[[320,66]],sh:[[120,430,234,16],[6,280,190,16]],bat:[60,306],snail:{side:1,t:4},drops:[[60,500]],
      buds:[[60,380],[300,340],[300,200]],route:[[60,500],[60,380],[130,350],[300,340],[300,200],[250,130],[120,64]],
      tip:{ko:'온실의 밤, 전부 다!',en:'Everything at once!'}}
  ];

  /* ---------- 기하 ---------- */
  function segRect(ax,ay,bx,by,r){
    var dx=bx-ax,dy=by-ay,t0=0,t1=1,p=[-dx,dx,-dy,dy],q=[ax-r[0],r[0]+r[2]-ax,ay-r[1],r[1]+r[3]-ay],i,t;
    for(i=0;i<4;i++){if(p[i]===0){if(q[i]<0)return false}
      else{t=q[i]/p[i];if(p[i]<0){if(t>t1)return false;if(t>t0)t0=t}else{if(t<t0)return false;if(t<t1)t1=t}}}
    return true}
  function los(R,ax,ay,bx,by){for(var i=0;i<R.sh.length;i++)if(segRect(ax,ay,bx,by,R.sh[i]))return false;return true}
  /* 광원 (lx,ly)에서 본 사각형의 실제 그림자 사변형 */
  function shadowQuad(lx,ly,r,far){
    if(lx>=r[0]&&lx<=r[0]+r[2]&&ly>=r[1]&&ly<=r[1]+r[3])return null;
    var c=[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0]+r[2],r[1]+r[3]],[r[0],r[1]+r[3]]],best=-2,bi=0,bj=1,i,j;
    for(i=0;i<4;i++)for(j=i+1;j<4;j++){var ax=c[i][0]-lx,ay=c[i][1]-ly,bx=c[j][0]-lx,by=c[j][1]-ly,
      cs=(ax*bx+ay*by)/(hyp(ax,ay)*hyp(bx,by));if(-cs>best){best=-cs;bi=i;bj=j}}
    var a=c[bi],b=c[bj],ka=far/hyp(a[0]-lx,a[1]-ly),kb=far/hyp(b[0]-lx,b[1]-ly);
    return [a,b,[b[0]+(b[0]-lx)*kb,b[1]+(b[1]-ly)*kb],[a[0]+(a[0]-lx)*ka,a[1]+(a[1]-ly)*ka]]}
  function inPoly(p,x,y){var s=0,i,n=p.length;for(i=0;i<n;i++){var a=p[i],b=p[(i+1)%n],c=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
      if(c!==0){if(s===0)s=c>0?1:-1;else if((c>0?1:-1)!==s)return false}}return true}
  function inDark(R,x,y){for(var i=0;i<R.dk.length;i++)if(inPoly(R.dk[i],x,y))return true;return false}

  function prep(b,n){
    var R={n:n,pot:b.pot||180,tr:b.tr,sh:b.sh||[],buds:b.buds||[],drops:b.drops||[],fix:b.fix||[],snail:b.snail||null,bat:b.bat||null,
      web:b.web||null,mir:b.mir||null,route:b.route,tip:b.tip||null,sap:1e9,dk:[]};
    R.fix.forEach(function(f){R.sh.forEach(function(s){var q=shadowQuad(f[0],f[1],s,900);if(q)R.dk.push(q)})});
    return R}

  /* ---------- 시뮬레이션 ---------- */
  function resetVine(S){var R=S.R;S.nodes=[[R.pot,STARTY]];S.x=R.pot;S.y=STARTY;S.a=-PI/2;S.len=0;S.used=0;S.leaves=[];S.nextLeaf=LEAF*.6;
    S.buds=R.buds.map(function(b,i){return {x:b[0],y:b[1],on:false,t:0,k:(i+R.n)%4}});
    S.drops=R.drops.map(function(d){return {x:d[0],y:d[1],on:true}});
    S.boost=0;S.stun=0;S.warned=false;S.dead=null;S.blooms=0;
    if(S.sn){S.sn.st='wait';S.sn.t=R.snail.t;S.sn.x=R.snail.side<0?X0+12:X1-12;S.sn.p=0}}
  function newSim(R,seed){
    var S={R:R,t:0,wilt:0,wilts:0,restarts:0,done:false,ev:[],rnd:rng(seed||7),flashCd:0,lx:R.pot,ly:POTY,held:false,lit:0,dark:false,spot:false,
      sn:R.snail?{st:'wait',t:0,x:0,p:0,hide:0,was:'crawl',mt:0}:null,
      bt:R.bat?{st:'sleep',x:R.bat[0],y:R.bat[1],t:0,cool:0}:null};
    resetVine(S);return S}
  function snPos(S){var s=S.sn,R=S.R;if(s.st==='eat'){var i=Math.min(S.nodes.length-1,Math.floor(s.p/STEP));return [S.nodes[i][0]+R.snail.side*5,S.nodes[i][1]]}
    return [s.x,FLOOR-7]}
  function crash(S){
    var i,lf=null;S.wilts++;S.wilt=1;S.ev.push(['wilt',S.x,S.y]);
    for(i=S.leaves.length-1;i>=0;i--)if(S.len-S.leaves[i].l>=12){lf=S.leaves[i];S.leaves.length=i+1;break}
    if(!lf){S.leaves.length=0;lf={i:0,l:0,side:1}}
    S.dead={pts:S.nodes.slice(lf.i).concat([[S.x,S.y]]),t:S.t};
    S.nodes.length=lf.i+1;S.x=S.nodes[lf.i][0];S.y=S.nodes[lf.i][1];S.len=lf.l;S.nextLeaf=lf.l+LEAF;S.side=lf.side;S.warned=false;
    S.tan=lf.i>0?Math.atan2(S.y-S.nodes[lf.i-1][1],S.x-S.nodes[lf.i-1][0]):-PI/2}
  function resprout(S,sx,sy,on){
    var d=S.side*.7;
    if(on&&los(S.R,S.x,S.y,sx,sy)){d=clamp(wrap(Math.atan2(sy-S.y,sx-S.x)-S.tan),-1.9,1.9);if(Math.abs(d)<.6)d=d<0?-.6:.6}
    if(S.nodes.length<2)d=clamp(d,-.9,.9);
    S.a=S.tan+d;S.ev.push(['sprout',S.x,S.y])}
  function step(S,dt,c){
    var R=S.R,i,lx,ly,fl=false,w=R.web;S.ev.length=0;if(S.done)return;S.t+=dt;
    lx=clamp(c.x,X0+6,X1-6);ly=clamp(c.y,TOP+4,FLOOR+8);
    if(w&&lx>w[0]&&lx<w[0]+w[2]&&ly>w[1]&&ly<w[1]+w[3]){
      var dl=lx-w[0],dr=w[0]+w[2]-lx,du=ly-w[1],dd=w[1]+w[3]-ly,m=Math.min(dl,du,dd,w[0]+w[2]>=X1-1?1e9:dr);
      if(m===dl)lx=w[0];else if(m===du)ly=w[1];else if(m===dd)ly=w[1]+w[3];else lx=w[0]+w[2]}
    S.lx=lx;S.ly=ly;S.held=!!c.held;
    S.flashCd=Math.max(0,S.flashCd-dt);if(c.flash&&S.flashCd<=0){fl=true;S.flashCd=1.2;S.ev.push(['flash',lx,ly])}
    var on=S.held,sx=lx,sy=ly;S.spot=false;
    if(R.mir&&on&&hyp(lx-R.mir.x,ly-R.mir.y)<36){S.spot=true;sx=R.mir.sx;sy=R.mir.sy}
    /* 달팽이 */
    var sn=S.sn;if(sn){var sp=snPos(S),sd=hyp(lx-sp[0],ly-sp[1]);
      if(sn.st!=='hide'&&sn.st!=='wait'&&((on&&sd<48)||(fl&&sd<130))){sn.was=sn.st==='eat'?'eat':'crawl';
        if(sn.st==='eat')sn.x=R.pot+R.snail.side*18;sn.st='hide';sn.hide=5;sn.p=0;S.ev.push(['scare',sp[0],sp[1]])}
      else if(sn.st==='wait'){sn.t-=dt;if(sn.t<=0)sn.st='crawl'}
      else if(sn.st==='crawl'){var gx=R.pot+R.snail.side*18;sn.x+=(gx>sn.x?1:-1)*16*dt;if(Math.abs(gx-sn.x)<2){sn.st='eat';sn.p=0}}
      else if(sn.st==='eat'){sn.p=Math.min(Math.max(0,S.len-12),sn.p+6*dt);S.used+=5*dt;sn.mt-=dt;if(sn.mt<=0){sn.mt=.45;S.ev.push(['munch',sp[0],sp[1]])}}
      else if(sn.st==='hide'){sn.hide-=dt;if(sn.hide<=0)sn.st=sn.was}}
    /* 박쥐 */
    var bt=S.bt;if(bt){var bd=hyp(lx-bt.x,ly-bt.y),hx=R.bat[0],hy=R.bat[1],tx,ty,tl;
      if(bt.st==='sleep'){bt.cool-=dt;if(on&&bt.cool<=0&&bd<44){bt.st='fly';bt.t=5;S.ev.push(['bat',bt.x,bt.y])}}
      else if(bt.st==='fly'){bt.t-=dt;tx=S.x-bt.x;ty=S.y-bt.y;tl=hyp(tx,ty)||1;var wv=Math.sin(S.t*9)*45;
        bt.x+=(tx/tl*90-ty/tl*wv)*dt;bt.y+=(ty/tl*90+tx/tl*wv)*dt;
        if(tl<12&&S.wilt<=0){S.a+=(S.rnd()<.5?-1:1)*1.2;S.stun=.45;bt.st='back';S.ev.push(['knock',S.x,S.y])}
        else if((fl&&bd<130)||bt.t<=0){bt.st='back';if(fl)S.ev.push(['scare',bt.x,bt.y])}}
      else{tx=hx-bt.x;ty=hy-bt.y;tl=hyp(tx,ty);if(tl<4){bt.x=hx;bt.y=hy;bt.st='sleep';bt.cool=2.5}else{bt.x+=tx/tl*130*dt;bt.y+=ty/tl*130*dt}}}
    if(S.used>=R.sap){sapOut(S);return}
    if(S.wilt>0){S.wilt-=dt;S.lit=0;if(S.wilt<=0)resprout(S,sx,sy,on);return}
    /* 빛 */
    var dx=sx-S.x,dy=sy-S.y,d=hyp(dx,dy),dark=inDark(R,S.x,S.y),L=0;
    if(on&&los(R,S.x,S.y,sx,sy)){L=dark?clamp((135-d)/40,0,1):clamp(1-(d-120)/240,.3,1);if(S.spot&&!dark)L=Math.max(L,.7)}
    var f=Math.max(L,dark?0:.07);S.lit=L;S.dark=dark;
    if(S.stun>0){S.stun-=dt;f=0}
    if(L>0&&d<BASK)f=0;
    if(S.boost>0){S.boost-=dt;f*=1.75}
    var dist=SPEED*f*dt,st,nd,b;
    while(dist>0){st=Math.min(2,dist);dist-=st;
      if(L>0&&d>1)S.a+=clamp(wrap(Math.atan2(dy,dx)-S.a),-st/RAD,st/RAD);
      S.x+=Math.cos(S.a)*st;S.y+=Math.sin(S.a)*st;S.len+=st;S.used+=st;
      nd=S.nodes[S.nodes.length-1];if(hyp(S.x-nd[0],S.y-nd[1])>=STEP)S.nodes.push([S.x,S.y]);
      if(S.len>=S.nextLeaf){S.leaves.push({i:S.nodes.length-1,l:S.len,side:S.leaves.length%2?-1:1,t:S.t});S.nextLeaf+=LEAF}
      dx=sx-S.x;dy=sy-S.y;d=hyp(dx,dy);
      for(i=0;i<S.buds.length;i++){b=S.buds[i];if(!b.on&&hyp(S.x-b.x,S.y-b.y)<BLOOM){b.on=true;b.t=S.t;S.ev.push(['bloom',b.x,b.y,S.blooms++,b.k])}}
      for(i=0;i<S.drops.length;i++){b=S.drops[i];if(b.on&&hyp(S.x-b.x,S.y-b.y)<16){b.on=false;S.boost=3.2;S.ev.push(['drop',b.x,b.y])}}
      if(Math.abs(S.x-R.tr)<=TRW&&S.y<=TRY+TRH+2){
        if(S.blooms>=S.buds.length){S.done=true;S.ev.push(['done',S.x,S.y]);return}
        if(!S.warned){S.warned=true;S.ev.push(['need',S.x,S.y])}}
      if(hit(S)){crash(S);return}
      if(S.used>=R.sap){sapOut(S);return}
      if(d<BASK)break}
  }
  function hit(S){var R=S.R,x=S.x,y=S.y,i,r,n;
    if(x<X0+3||x>X1-3||y<TOP+4||y>FLOOR-2)return true;
    for(i=0;i<R.sh.length;i++){r=R.sh[i];if(x>r[0]-4&&x<r[0]+r[2]+4&&y>r[1]-4&&y<r[1]+r[3]+4)return true}
    for(i=S.nodes.length-15;i>=0;i--){n=S.nodes[i];if((x-n[0])*(x-n[0])+(y-n[1])*(y-n[1])<25)return true}
    return false}
  function sapOut(S){S.ev.push(['sapout',S.x,S.y]);S.dead={pts:S.nodes.concat([[S.x,S.y]]),t:S.t};resetVine(S);S.dead2=true;S.restarts++;S.wilts++;S.wilt=1.2;S.tan=-PI/2;S.side=0}

  /* ---------- 검증 봇: 경로를 따라 빛을 조금 앞서 끌어 준다 ---------- */
  function mkBot(R){var P=[[R.pot,STARTY]].concat(R.route.map(function(p){return [p[0],p[1]]})),cum=[0],i,g=[];
    for(i=1;i<P.length;i++)cum.push(cum[i-1]+hyp(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));
    R.buds.forEach(function(b,bi){for(var k=1;k<P.length;k++)if(hyp(P[k][0]-b[0],P[k][1]-b[1])<8){g.push({s:cum[k],b:bi});break}});
    return {P:P,cum:cum,g:g,s:0,rs:0,tot:cum[cum.length-1]}}
  function botSeg(B,s){for(var k=0;k<B.P.length-2;k++)if(s<=B.cum[k+1])return k;return B.P.length-2}
  function botAt(B,s){var k=botSeg(B,s),l=B.cum[k+1]-B.cum[k],u=l>0?clamp((s-B.cum[k])/l,0,1):0;
    return [B.P[k][0]+(B.P[k+1][0]-B.P[k][0])*u,B.P[k][1]+(B.P[k+1][1]-B.P[k][1])*u]}
  function botCtl(B,S){var lim=B.tot,i,pt,ov;
    if(S.restarts!==B.rs){B.rs=S.restarts;B.s=0}
    for(i=0;i<B.g.length;i++)if(!S.buds[B.g[i].b].on&&B.g[i].s<lim)lim=B.g[i].s;
    if(B.s>lim)B.s=lim;
    for(i=0;i<400;i++){pt=botAt(B,B.s);if(B.s<lim&&hyp(S.x-pt[0],S.y-pt[1])<LOOK)B.s=Math.min(lim,B.s+2);else break}
    ov=S.R.route[botSeg(B,B.s)][2];
    return ov&&ov.lamp?{x:ov.lamp[0],y:ov.lamp[1],held:true}:{x:pt[0],y:pt[1],held:true}}
  function runBot(R,seed,maxT){var S=newSim(R,seed),B=mkBot(R),n=Math.ceil((maxT||60)*30),i;
    for(i=0;i<n&&!S.done;i++)step(S,1/30,botCtl(B,S));
    return {ok:S.done,used:S.used,wilts:S.wilts,restarts:S.restarts,t:S.t}}
  function runNaive(R,maxT){var S=newSim(R,3),n=Math.ceil((maxT||70)*30),i;
    for(i=0;i<n&&!S.done;i++)step(S,1/30,{x:R.tr,y:TRY+16,held:true});return S.done}
  function calibrate(R,k){R.sap=1e9;var r=runBot(R,11,60);if(!r.ok||r.wilts)return false;
    R.sap=Math.ceil((r.used*k+25)/5)*5;R.par=r.t;return true}

  /* ---------- 방 생성 ---------- */
  var GW=36,GH=64;
  function astar(blk,sx,sy,tx,ty){
    var N=GW*GH,s=clamp(sy/10|0,0,GH-1)*GW+clamp(sx/10|0,0,GW-1),t=clamp(ty/10|0,0,GH-1)*GW+clamp(tx/10|0,0,GW-1),
        dist=[],prev=[],open=[s],i,j,bi,c,cx,cy,nx,ny,n,nd,ti=t%GW,tj=t/GW|0,done=[];
    for(i=0;i<N;i++){dist.push(1e9);prev.push(-1)}dist[s]=0;
    function h(c){var a=Math.abs(c%GW-ti),b=Math.abs((c/GW|0)-tj);return 10*Math.max(a,b)+4*Math.min(a,b)}
    while(open.length){bi=0;for(i=1;i<open.length;i++)if(dist[open[i]]+h(open[i])<dist[open[bi]]+h(open[bi]))bi=i;
      c=open[bi];open[bi]=open[open.length-1];open.pop();if(done[c])continue;done[c]=1;if(c===t)break;cx=c%GW;cy=c/GW|0;
      for(i=-1;i<=1;i++)for(j=-1;j<=1;j++){if(!i&&!j)continue;nx=cx+i;ny=cy+j;if(nx<0||ny<0||nx>=GW||ny>=GH)continue;n=ny*GW+nx;
        if(blk[n]&&n!==t)continue;if(i&&j&&(blk[cy*GW+nx]||blk[ny*GW+cx]))continue;
        nd=dist[c]+(i&&j?14:10);if(nd<dist[n]){dist[n]=nd;prev[n]=c;open.push(n)}}}
    if(prev[t]<0&&t!==s)return null;
    var path=[];for(c=t;c>=0;c=prev[c])path.push(c);path.reverse();return path}
  function build(n,seed){
    var r=rng(seed),lv=Math.min(1,(n-10)/30),bands=[470,360,250,150],i,j,k,sh=[],buds=[],drops=[],x,y,w,ok,t,
        ns=2+(r()<.4+.4*lv?1:0),side=r()<.5?0:1;
    for(i=bands.length-1;i>0;i--){j=Math.floor(r()*(i+1));t=bands[i];bands[i]=bands[j];bands[j]=t}
    bands=bands.slice(0,ns).sort(function(a,b){return b-a});
    for(i=0;i<ns;i++){t=r();y=bands[i]+Math.floor(r()*20-10);
      if(t<.82){w=120+Math.floor(r()*110);sh.push(side?[X1-w,y,w,14]:[X0,y,w,14]);side=1-side}
      else{w=90+Math.floor(r()*70);sh.push([80+Math.floor(r()*(200-w)),y,w,14])}}
    function free(x,y,m){if(x<X0+m||x>X1-m||y<TOP+m||y>FLOOR-m)return false;
      for(var i=0;i<sh.length;i++){var s=sh[i];if(x>s[0]-m&&x<s[0]+s[2]+m&&y>s[1]-m&&y<s[1]+s[3]+m)return false}return true}
    var nb=2+(r()<.3+.4*lv?1:0);
    for(k=0;k<80&&buds.length<nb;k++){x=34+Math.floor(r()*292);y=120+Math.floor(r()*390);ok=free(x,y,28)&&hyp(x-180,y-STARTY)>90;
      for(i=0;i<buds.length;i++)if(hyp(x-buds[i][0],y-buds[i][1])<80||Math.abs(y-buds[i][1])<34)ok=false;if(ok)buds.push([x,y])}
    if(buds.length<2)return null;
    for(k=0,t=Math.floor(r()*3);k<30&&drops.length<t;k++){x=34+Math.floor(r()*292);y=130+Math.floor(r()*380);ok=free(x,y,22);
      for(i=0;i<buds.length;i++)if(hyp(x-buds[i][0],y-buds[i][1])<40)ok=false;if(ok)drops.push([x,y])}
    var b={tr:50+Math.floor(r()*260),sh:sh,buds:buds,drops:drops};
    if(r()<.3+.3*lv)b.fix=[[r()<.5?44:316,68]];
    if(r()<.3+.3*lv)b.snail={side:r()<.5?-1:1,t:3+r()*3};
    if(r()<.25+.3*lv){t=sh[Math.floor(r()*sh.length)];b.bat=[t[0]+t[2]/2,t[1]+t[3]+12]}
    /* 경로: 아래 꽃봉오리부터 격자 탐색, 지나온 길은 막는다 */
    var blk=[],used=[],pend=[],cx=180,cy=STARTY,route=[],order=buds.slice().sort(function(a,c){return c[1]-a[1]}),leg,p,q;
    for(j=0;j<GH;j++)for(i=0;i<GW;i++)blk.push(free(i*10+5,j*10+5,16)?0:1);
    function mark(c){var mx=c%GW,my=c/GW|0,a,e;for(a=-2;a<=2;a++)for(e=-2;e<=2;e++){var ux=mx+a,uy=my+e;if(ux>=0&&uy>=0&&ux<GW&&uy<GH)blk[uy*GW+ux]=1}}
    order.push([b.tr,66]);
    for(k=0;k<order.length;k++){leg=astar(blk,cx,cy,order[k][0],order[k][1]);if(!leg)return null;
      pend.forEach(mark);pend=leg.slice(-3);for(i=0;i<leg.length-3;i++)mark(leg[i]);
      for(i=1;i<leg.length-1;i++){p=leg[i-1];q=leg[i+1];if((leg[i]-p)!==(q-leg[i]))route.push([leg[i]%GW*10+5,(leg[i]/GW|0)*10+5])}
      route.push([order[k][0],order[k][1]]);cx=order[k][0];cy=order[k][1]}
    b.route=route;return b}
  var cache={},fallbacks=0;
  function getRoom(n){
    if(cache[n])return cache[n];var R=null,i,b;
    if(n<ROOMS.length){R=prep(ROOMS[n],n);calibrate(R,1.25)}
    else{for(i=0;i<60&&!R;i++){b=build(n,n*7919+i*104729+13);if(!b)continue;R=prep(b,n);
        if(!calibrate(R,Math.max(1.13,1.22-(n-10)*.004))||runNaive(R,40))R=null}
      if(!R){fallbacks++;R=prep(ROOMS[1+n%9],n);calibrate(R,1.15)}}
    cache[n]=R;return R}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={ROOMS:ROOMS,getRoom:getRoom,newSim:newSim,step:step,runBot:runBot,runNaive:runNaive,mkBot:mkBot,botCtl:botCtl,
      fallbacks:function(){return fallbacks},shadowQuad:shadowQuad,inDark:inDark};
  if(typeof SG==='undefined')return;

  /* ================= 화면 ================= */
  var K=window.__growKeys;
  if(!K){K=window.__growKeys={};
    window.addEventListener('keydown',function(e){K[e.code]=true;if(e.code==='Space'&&!e.repeat)K._flash=true});
    window.addEventListener('keyup',function(e){K[e.code]=false})}
  var S,R,G,lamp,petals=[],motes=[],T=0,ko=true,bgA=null,bgB=null,LM=null,TM=null,lm,tm;
  var FCOL=[['#ff7fa8','#ffe27a'],['#ffd84d','#ff8c42'],['#b99bff','#fff3b0'],['#ff9d6c','#fff6d8']];
  var SCALE=[523,587,659,784,880,1047,1175,1319,1568];

  function loadRoom(n){R=getRoom(n);S=newSim(R,n*31+5);G.n=n;G.rt=0;G.fin=0}
  function init(a){ko=a.lang==='ko';G={n:0,time:50,rt:0,fin:0,fade:0,kb:false,pd:false,pt:0,px:0,py:0,flash:0,blink:0,nextBlink:2,ring:0};
    loadRoom(0);lamp={x:R.pot+38,y:POTY-36,tx:R.pot+38,ty:POTY-36,glow:0};petals=[];K._flash=false;
    if(!motes.length){var r=rng(99);for(var i=0;i<46;i++)motes.push({x:r()*W,y:TOP+r()*(FLOOR-TOP),p:r()*6.28,s:.5+r()})}}

  function update(dt,inp,a){
    var i,e,fl=false,hold=false,ox=lamp.x,oy=lamp.y;T+=dt;G.rt+=dt;
    if(G.fade>0)G.fade=Math.max(0,G.fade-dt);
    if(G.fin>0){G.fin-=dt;if(G.fin<=0){loadRoom(G.n+1);G.fade=.4}tickFx(dt);return}
    G.time-=dt;if(G.time<=0){G.time=0;a.over();return}
    a.tempo(G.time<12?1.35:1);
    var kx=(K.ArrowRight||K.KeyD?1:0)-(K.ArrowLeft||K.KeyA?1:0),ky=(K.ArrowDown||K.KeyS?1:0)-(K.ArrowUp||K.KeyW?1:0);
    if(inp.down&&inp.x!=null){if(!G.pd){G.pt=0;G.px=inp.x;G.py=inp.y}G.pd=true;G.pt+=dt;G.kb=false;hold=true;lamp.tx=inp.x;lamp.ty=inp.y-26}
    else{if(G.pd){G.pd=false;if(G.pt<.2&&inp.x!=null&&hyp(inp.x-G.px,inp.y-G.py)<10)fl=true}
      if(kx||ky){if(!G.kb){G.kb=true;lamp.tx=lamp.x;lamp.ty=lamp.y}}
      if(G.kb){hold=true;lamp.tx=clamp(lamp.tx+kx*240*dt,X0+6,X1-6);lamp.ty=clamp(lamp.ty+ky*240*dt,TOP+4,FLOOR)}
      else{lamp.tx=R.pot+38;lamp.ty=POTY-36}}
    if(K._flash){K._flash=false;if(G.kb||hold)fl=true;else{G.kb=true;lamp.tx=lamp.x;lamp.ty=lamp.y;hold=true;fl=true}}
    var k=1-Math.exp(-(hold?16:5)*dt);lamp.x+=(lamp.tx-lamp.x)*k;lamp.y+=(lamp.ty-lamp.y)*k;
    step(S,dt,{x:lamp.x,y:lamp.y,held:hold,flash:fl});
    if(hold){lamp.x=S.lx;lamp.y=S.ly}
    lamp.glow+=(clamp(hyp(lamp.x-ox,lamp.y-oy)/Math.max(dt,.001)/260,0,1)-lamp.glow)*Math.min(1,dt*6);
    for(i=0;i<S.ev.length;i++){e=S.ev[i];fx(e,a)}
    tickFx(dt)}
  function tickFx(dt){var i,p;G.flash=Math.max(0,G.flash-dt);G.ring=Math.max(0,G.ring-dt);
    G.nextBlink-=dt;if(G.nextBlink<=0){G.blink=.14;G.nextBlink=1.8+Math.random()*2.6}G.blink=Math.max(0,G.blink-dt);
    for(i=petals.length-1;i>=0;i--){p=petals[i];p.t+=dt;if(p.t>p.l){petals.splice(i,1);continue}
      p.vy+=90*dt;p.vx*=1-1.5*dt;p.x+=p.vx*dt+Math.sin(p.t*6+p.r)*14*dt;p.y+=p.vy*dt;p.r+=p.vr*dt}}
  function petalBurst(x,y,c,n){for(var i=0;i<n;i++){var a=Math.random()*6.28,v=50+Math.random()*120;
    petals.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-50,r:a,vr:(Math.random()-.5)*10,c:c,t:0,l:.9+Math.random()*.7})}}
  function fx(e,a){var k=e[0],x=e[1],y=e[2],f,c;
    if(k==='bloom'){f=SCALE[e[3]%SCALE.length];a.beep(f,.45,'sine');a.beep(f*2,.3,'triangle');a.beep(f*1.5,.2,'sine');c=FCOL[e[4]];
      a.burst(x,y,c[1],10);petalBurst(x,y,c[0],14);a.pop(x,y-22,ko?'활짝!':'Bloom!',c[0])}
    else if(k==='wilt'){a.sfx('hit');a.shake(7);a.burst(x,y,'#a8854a',9);a.pop(x,y-14,ko?'시들…':'Wilt…','#e0b070')}
    else if(k==='sprout'){a.beep(740,.1,'triangle');a.burst(x,y,'#8fe37a',6)}
    else if(k==='drop'){a.sfx('coin');a.burst(x,y,'#8fd8ff',12);a.pop(x,y-16,ko?'쑥쑥!':'Zoom!','#bfeaff')}
    else if(k==='need'){a.beep(220,.18,'square');a.pop(x,y+34,ko?'꽃 먼저!':'Buds first!','#ffd0e0')}
    else if(k==='sapout'){a.sfx('hit');a.shake(9);a.pop(W/2,300,ko?'수액이 바닥났어요!':'Out of sap!','#ffcf6a')}
    else if(k==='flash'){G.flash=.35;G.ring=.4;a.beep(1320,.08,'square');a.beep(1760,.12,'triangle')}
    else if(k==='scare'){a.sfx('jump');a.burst(x,y,'#ffe9a8',8);a.pop(x,y-16,ko?'쏙!':'Eep!','#fff0b8')}
    else if(k==='bat'){a.beep(300,.2,'sawtooth');a.pop(x,y+26,ko?'끼익!':'Screech!','#d8b8ff')}
    else if(k==='knock'){a.sfx('hit');a.shake(6);a.burst(x,y,'#c9a8ff',8)}
    else if(k==='munch'){a.beep(170,.05,'square')}
    else if(k==='done'){var left=Math.max(0,R.sap-S.used),bonus=Math.floor(left/25),pts=10+3*S.buds.length+bonus+(S.wilts?0:5);
      a.add(pts);G.time=Math.min(70,G.time+14);G.fin=1.25;a.sfx('win');a.burst(x,y,'#fff2a8',22);petalBurst(R.tr,TRY+14,'#ffd0e6',18);
      a.pop(R.tr,TRY+70,'+'+pts,'#fff2a8');if(!S.wilts)a.pop(R.tr,TRY+94,ko?'한 번도 안 시듦 +5':'No wilt +5','#b8ffb0')}}

  /* ---------- 그리기 도구 ---------- */
  function circ(g,x,y,r){g.beginPath();g.arc(x,y,r,0,6.2832);g.fill()}
  function ell(g,x,y,rx,ry,rot){g.beginPath();g.ellipse(x,y,rx,ry,rot||0,0,6.2832);g.fill()}
  function rad(g,x,y,r,stops){var gr=g.createRadialGradient(x,y,0,x,y,r);for(var i=0;i<stops.length;i++)gr.addColorStop(stops[i][0],stops[i][1]);
    g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,6.2832);g.fill()}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function poly(g,p){g.beginPath();g.moveTo(p[0][0],p[0][1]);for(var i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.closePath();g.fill()}
  function back(e){return 1+2.7*Math.pow(e-1,3)+1.7*Math.pow(e-1,2)}
  function mk(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}

  function buildBg(){
    var g,i,r=rng(5),gr;
    bgA=mk(W,H);g=bgA.getContext('2d');gr=g.createLinearGradient(0,0,0,H);
    gr.addColorStop(0,'#5a6fd0');gr.addColorStop(.5,'#86a6dc');gr.addColorStop(1,'#a4d2c4');g.fillStyle=gr;g.fillRect(0,0,W,H);
    for(i=0;i<60;i++){g.fillStyle='rgba(255,255,255,'+(.3+r()*.6)+')';circ(g,r()*W,30+r()*330,.6+r()*1.1)}
    rad(g,286,100,70,[[0,'rgba(255,252,220,.75)'],[1,'rgba(255,252,220,0)']]);
    g.fillStyle='#fffbe2';circ(g,286,100,22);g.fillStyle='rgba(210,214,190,.6)';circ(g,279,94,5);circ(g,293,107,3.4);circ(g,290,90,2.2);
    g.fillStyle='#6c86c6';g.beginPath();g.moveTo(0,470);for(i=0;i<=W;i+=20)g.lineTo(i,450+Math.sin(i*.021)*26+Math.sin(i*.07)*8);g.lineTo(W,H);g.lineTo(0,H);g.fill();
    g.fillStyle='#5d7ab8';for(i=0;i<9;i++){var tx=r()*W,ty=500+r()*40,ts=22+r()*26;circ(g,tx,ty,ts);circ(g,tx+ts*.7,ty+8,ts*.7);g.fillRect(tx-3,ty,6,90)}
    bgB=mk(W,H);g=bgB.getContext('2d');
    /* 유리 온실 뼈대 */
    function bar(x1,y1,x2,y2,w){g.strokeStyle='rgba(52,72,128,.8)';g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
      g.strokeStyle='rgba(215,232,255,.4)';g.lineWidth=1;g.beginPath();g.moveTo(x1-w/2+.5,y1);g.lineTo(x2-w/2+.5,y2);g.stroke()}
    for(i=0;i<8;i++){g.fillStyle='rgba(255,255,255,.055)';var px=-60+i*62;g.beginPath();g.moveTo(px,640);g.lineTo(px+150,130);g.lineTo(px+172,130);g.lineTo(px+22,640);g.fill()}
    for(i=0;i<=5;i++){bar(i*72,132,i*72,FLOOR,4);bar(180,22,i*72,132,3)}
    g.lineCap='round';bar(0,132,W,132,5);bar(0,300,W,300,3);bar(0,468,W,468,3);
    /* 안쪽 실루엣: 화분, 물뿌리개, 삽과 갈퀴 */
    g.fillStyle='#4f7f8e';
    for(i=0;i<5;i++){var bx=[30,96,250,318,150][i],bs=[30,22,26,34,18][i];circ(g,bx,FLOOR-bs*.6,bs);circ(g,bx+bs*.8,FLOOR-bs*.3,bs*.7);circ(g,bx-bs*.7,FLOOR-bs*.2,bs*.6)}
    g.fillStyle='#456f80';g.fillRect(326,470,4,140);g.fillRect(340,486,4,124);
    g.beginPath();g.moveTo(318,470);g.lineTo(338,470);g.lineTo(336,452);g.lineTo(320,452);g.fill();
    for(i=0;i<4;i++)g.fillRect(334+i*5,470,2,18);g.fillRect(332,484,20,4);
    g.beginPath();g.moveTo(22,FLOOR);g.lineTo(26,578);g.lineTo(58,578);g.lineTo(62,FLOOR);g.fill();g.lineWidth=5;g.strokeStyle='#456f80';
    g.beginPath();g.moveTo(58,584);g.lineTo(84,566);g.stroke();g.beginPath();g.arc(24,592,12,1.6,4.7);g.stroke();
    /* 바닥 */
    gr=g.createLinearGradient(0,FLOOR,0,H);gr.addColorStop(0,'#a57c58');gr.addColorStop(1,'#6e4f3a');g.fillStyle=gr;g.fillRect(0,FLOOR,W,H-FLOOR);
    g.fillStyle='rgba(255,236,200,.35)';g.fillRect(0,FLOOR,W,2);g.strokeStyle='rgba(60,36,22,.4)';g.lineWidth=1;
    for(i=0;i<8;i++){g.beginPath();g.moveTo(i*52+10,FLOOR+2);g.lineTo(i*52-6,H);g.stroke()}
    LM=mk(W/2,H/2);lm=LM.getContext('2d');TM=mk(W/2,H/2);tm=TM.getContext('2d')}

  function castLight(x,y,r,stops,shadow){
    tm.setTransform(1,0,0,1,0,0);tm.globalCompositeOperation='source-over';tm.clearRect(0,0,W/2,H/2);tm.setTransform(.5,0,0,.5,0,0);
    rad(tm,x,y,r,stops);
    if(shadow){tm.fillStyle='#000';for(var i=0;i<R.sh.length;i++){var q=shadowQuad(x,y,R.sh[i],800);if(q)poly(tm,q)}}
    lm.setTransform(1,0,0,1,0,0);lm.drawImage(TM,0,0);lm.setTransform(.5,0,0,.5,0,0)}
  function buildLight(){
    var i,b,gl=lamp.glow,on=S.held;
    lm.setTransform(1,0,0,1,0,0);lm.globalCompositeOperation='source-over';lm.fillStyle='#3b4882';lm.fillRect(0,0,W/2,H/2);lm.setTransform(.5,0,0,.5,0,0);
    lm.fillStyle='rgba(6,8,28,.62)';for(i=0;i<R.dk.length;i++)poly(lm,R.dk[i]);
    lm.globalCompositeOperation='lighter';
    rad(lm,286,100,210,[[0,'rgba(150,170,215,.6)'],[1,'rgba(150,170,215,0)']]);
    lm.fillStyle='rgba(120,150,210,.10)';poly(lm,[[230,132],[300,132],[150,FLOOR],[40,FLOOR]]);poly(lm,[[86,132],[130,132],[-10,520],[-70,520]]);
    for(i=0;i<R.fix.length;i++)castLight(R.fix[i][0],R.fix[i][1],430,[[0,'rgba(190,205,225,.7)'],[.5,'rgba(150,170,200,.34)'],[1,'rgba(150,170,200,0)']],true);
    if(on&&!S.spot)castLight(lamp.x,lamp.y,235+gl*40,[[0,'rgba(255,240,190,1)'],[.25,'rgba(255,212,130,.85)'],[.6,'rgba(255,176,90,.4)'],[1,'rgba(255,160,80,0)']],true);
    else rad(lm,lamp.x,lamp.y,on?80:54,[[0,'rgba(255,225,150,.75)'],[1,'rgba(255,200,110,0)']]);
    if(S.spot)castLight(R.mir.sx,R.mir.sy,170,[[0,'rgba(255,244,200,1)'],[.4,'rgba(255,214,130,.6)'],[1,'rgba(255,170,80,0)']],true);
    if(G.flash>0)rad(lm,lamp.x,lamp.y,260,[[0,'rgba(255,255,235,'+(G.flash/.35)+')'],[1,'rgba(255,255,235,0)']]);
    for(i=0;i<S.buds.length;i++){b=S.buds[i];rad(lm,b.x,b.y,b.on?46:28,[[0,b.on?'rgba(255,225,190,.6)':'rgba(190,255,190,.42)'],[1,'rgba(0,0,0,0)']])}
    for(i=0;i<S.drops.length;i++)if(S.drops[i].on)rad(lm,S.drops[i].x,S.drops[i].y,24,[[0,'rgba(150,215,255,.5)'],[1,'rgba(0,0,0,0)']]);
    rad(lm,R.tr,TRY+14,58,[[0,'rgba(255,236,190,'+(S.blooms>=S.buds.length?.6+.2*Math.sin(T*6):.3)+')'],[1,'rgba(0,0,0,0)']]);
    rad(lm,S.x,S.y,30,[[0,'rgba(180,255,170,.4)'],[1,'rgba(0,0,0,0)']]);
    if(S.sn){b=snPos(S);rad(lm,b[0],b[1],30,[[0,'rgba(255,220,170,.5)'],[1,'rgba(0,0,0,0)']])}
    if(R.mir)rad(lm,R.mir.x,R.mir.y,34,[[0,'rgba(200,235,255,.5)'],[1,'rgba(0,0,0,0)']]);
    lm.globalCompositeOperation='source-over'}

  /* ---------- 장면 요소 ---------- */
  function drawShelf(g,s){var x=s[0],y=s[1],w=s[2],h=s[3],i;
    g.fillStyle='rgba(20,24,50,.3)';g.fillRect(x+3,y+h,w-2,5);
    var gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#e0b07a');gr.addColorStop(.25,'#c48f58');gr.addColorStop(1,'#8f6038');g.fillStyle=gr;rr(g,x,y,w,h,3);g.fill();
    g.fillStyle='rgba(255,240,210,.55)';g.fillRect(x+3,y+1,w-6,2);g.strokeStyle='rgba(80,48,24,.45)';g.lineWidth=1;
    for(i=x+34;i<x+w-10;i+=46){g.beginPath();g.moveTo(i,y+3);g.lineTo(i,y+h-1);g.stroke()}
    g.strokeStyle='#6b4628';g.lineWidth=1.5;rr(g,x,y,w,h,3);g.stroke();
    g.fillStyle='#6b4628';[x+12,x+w-12].forEach(function(bx){if(bx>X0+8&&bx<X1-8){g.beginPath();g.moveTo(bx-3,y+h);g.lineTo(bx+3,y+h);g.lineTo(bx,y+h+9);g.fill()}})}
  function drawTrellis(g){var x=R.tr-TRW,y=TRY,w=TRW*2,h=TRH,i,ok=S.blooms>=S.buds.length;
    g.save();rr(g,x,y,w,h,5);g.fillStyle='rgba(120,84,48,.35)';g.fill();g.clip();g.strokeStyle='#e3c088';g.lineWidth=2.4;
    for(i=-3;i<8;i++){g.beginPath();g.moveTo(x+i*12,y);g.lineTo(x+i*12+h,y+h);g.stroke();g.beginPath();g.moveTo(x+i*12+h,y);g.lineTo(x+i*12,y+h);g.stroke()}
    g.restore();g.strokeStyle='#f0d4a0';g.lineWidth=3.5;rr(g,x,y,w,h,5);g.stroke();g.strokeStyle='#8a5c30';g.lineWidth=1;rr(g,x-2,y-2,w+4,h+4,6);g.stroke();
    if(S.done)for(i=0;i<5;i++)drawFlower(g,x+10+i*12,y+8+(i%2)*13,(i+R.n)%4,clamp((1.25-G.fin)*3-i*.25,0,1),.55,i)}
  function drawFlower(g,x,y,k,e,sc,seed){
    var c=FCOL[k],s=back(clamp(e,0,1))*sc,n=[8,5,6,7][k],i;if(s<=0)return;
    g.save();g.translate(x,y);g.rotate(Math.sin(T*1.4+seed)*.14);g.scale(s,s);
    for(i=0;i<n;i++){g.save();g.rotate(i*6.2832/n);g.fillStyle=c[0];g.strokeStyle='rgba(120,40,70,.35)';g.lineWidth=.8;g.beginPath();
      if(k===2){g.moveTo(0,-3);g.lineTo(5,-10);g.lineTo(0,-19);g.lineTo(-5,-10)}else g.ellipse(0,-11,k===1?6.4:4.3,8,0,0,6.2832);
      g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.35)';ell(g,-1,-13,1.4,4);g.restore()}
    g.fillStyle=c[1];circ(g,0,0,5.4);g.fillStyle='rgba(160,90,20,.5)';circ(g,1.2,1.2,2);g.fillStyle='rgba(255,255,255,.7)';circ(g,-1.6,-1.6,1.5);g.restore()}
  function drawBud(g,b,i){
    if(b.on){drawFlower(g,b.x,b.y,b.k,(S.t-b.t)/.55,1.15,i);return}
    var p=1+Math.sin(T*3+i)*.06;g.save();g.translate(b.x,b.y);g.rotate(Math.sin(T*1.6+i)*.1);g.scale(p,p);
    g.strokeStyle='#2f7a3c';g.lineWidth=2.4;g.beginPath();g.moveTo(0,15);g.quadraticCurveTo(3,9,0,4);g.stroke();
    g.fillStyle=FCOL[b.k][0];g.beginPath();g.moveTo(0,-11);g.quadraticCurveTo(8,-2,0,7);g.quadraticCurveTo(-8,-2,0,-11);g.fill();
    g.fillStyle='#4fb35c';g.strokeStyle='#236b34';g.lineWidth=1.2;g.beginPath();g.moveTo(-7,-3);g.quadraticCurveTo(-7,8,0,8);g.quadraticCurveTo(7,8,7,-3);g.quadraticCurveTo(3,3,0,-3);g.quadraticCurveTo(-3,3,-7,-3);g.fill();g.stroke();
    g.fillStyle='rgba(255,255,255,.5)';ell(g,-2,-5,1.2,2.6,.3);g.restore()}
  function drawLeaf(g,x,y,ang,s,col){g.save();g.translate(x,y);g.rotate(ang);g.scale(s,s);
    g.fillStyle=col||'#5ccb66';g.strokeStyle='#1f6a31';g.lineWidth=1.1;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(7,-8,19,0);g.quadraticCurveTo(7,8,0,0);g.fill();g.stroke();
    g.strokeStyle='rgba(215,255,190,.75)';g.lineWidth=.9;g.beginPath();g.moveTo(2,0);g.lineTo(15,0);g.stroke();g.restore()}
  function drawVine(g){
    var N=S.nodes,pts=N.concat([[S.x,S.y]]),m=pts.length,i,k,e,base=2.6+Math.min(3.6,S.len/170),d=S.dead;
    if(d){var al=1-(S.t-d.t)/1.1;if(al>0){g.globalAlpha=al;g.strokeStyle='#8a6a3c';g.lineWidth=3;g.lineCap='round';g.lineJoin='round';g.beginPath();
        for(i=0;i<d.pts.length;i++){var dr=(1-al)*18*i/d.pts.length;if(i)g.lineTo(d.pts[i][0],d.pts[i][1]+dr);else g.moveTo(d.pts[i][0],d.pts[i][1])}g.stroke();g.globalAlpha=1}else S.dead=null}
    function wd(i){return 2+base*Math.pow(1-i/m,.7)}
    function pass(col,add,mul,o){g.strokeStyle=col;for(k=0;k<m-1;k+=5){e=Math.min(m-1,k+5);g.lineWidth=wd(k)*mul+add;g.beginPath();g.moveTo(pts[k][0]+o,pts[k][1]+o);
        for(i=k+1;i<=e;i++)g.lineTo(pts[i][0]+o,pts[i][1]+o);g.stroke()}}
    g.lineCap='round';g.lineJoin='round';
    if(m>1){pass('#17502a',2.8,1,0);pass('#46b658',0,1,0);pass('#a4ea80',0,.28,-.9)}
    for(k=0;k<S.leaves.length;k++){var lf=S.leaves[k],p=N[lf.i],q=N[Math.max(0,lf.i-1)],ta=Math.atan2(p[1]-q[1],p[0]-q[0]),age=S.t-lf.t,
        s=back(clamp(age/.55,0,1))*(.85+Math.min(.45,(S.len-lf.l)/400)),sw=Math.sin(T*2.2+k*1.7)*.09;
      drawLeaf(g,p[0],p[1],ta+lf.side*1.05+sw,s);
      if(k%2===0){var te=clamp(age/1.1,0,1),j,sa=ta-lf.side*1.2,cx=p[0],cy=p[1];g.strokeStyle='#86da74';g.lineWidth=1.3;g.beginPath();g.moveTo(cx,cy);
        for(j=1;j<=22*te;j++){sa-=lf.side*(.08+j*.022);cx+=Math.cos(sa)*1.7;cy+=Math.sin(sa)*1.7;g.lineTo(cx,cy)}g.stroke()}
      else if(age>.2){drawLeaf(g,p[0],p[1],ta-lf.side*1.2-sw,s*.62,'#74d873')}}
    /* 자라는 끝 */
    g.save();g.translate(S.x,S.y);var wl=S.wilt>0;g.rotate(wl?PI/2:S.a);
    drawLeaf(g,0,0,-.55+Math.sin(T*7)*.06,wl?.4:.5,wl?'#a89050':'#9bea78');drawLeaf(g,0,0,.55-Math.sin(T*7)*.06,wl?.4:.5,wl?'#a89050':'#9bea78');
    g.fillStyle=wl?'#b09858':'#c8f79a';circ(g,1,0,3.2);g.restore()}
  function drawPot(g){var x=R.pot,y=POTY;g.fillStyle='rgba(10,14,40,.35)';ell(g,x,FLOOR+19,30,5);
    var gr=g.createLinearGradient(x-24,0,x+24,0);gr.addColorStop(0,'#e58a55');gr.addColorStop(.5,'#cf6d3d');gr.addColorStop(1,'#96472a');g.fillStyle=gr;
    g.beginPath();g.moveTo(x-22,y-12);g.lineTo(x+22,y-12);g.lineTo(x+16,y+30);g.lineTo(x-16,y+30);g.fill();
    g.fillStyle='#e99a66';rr(g,x-26,y-20,52,11,3);g.fill();g.strokeStyle='#7c3b22';g.lineWidth=1.4;rr(g,x-26,y-20,52,11,3);g.stroke();
    g.fillStyle='#4b3020';ell(g,x,y-19,21,3.4);g.fillStyle='rgba(255,230,200,.4)';g.fillRect(x-17,y-8,4,26)}
  function drawDrop(g,d,i){var y=d.y+Math.sin(T*3+i*2)*2.5;g.fillStyle='#6ec6ff';g.strokeStyle='#2a7cc0';g.lineWidth=1.2;g.beginPath();
    g.moveTo(d.x,y-11);g.bezierCurveTo(d.x+11,y+1,d.x+7,y+9,d.x,y+9);g.bezierCurveTo(d.x-7,y+9,d.x-11,y+1,d.x,y-11);g.fill();g.stroke();
    g.fillStyle='rgba(255,255,255,.85)';ell(g,d.x-2.6,y+1,1.6,3.2,.4)}
  function drawWeb(g){var w=R.web,cx=w[0]+w[2]/2,cy=w[1]+w[3]/2,i,j,rx=w[2]/2,ry=w[3]/2;g.save();g.beginPath();g.rect(w[0],w[1],w[2],w[3]);g.clip();
    g.fillStyle='rgba(225,235,255,.10)';g.fillRect(w[0],w[1],w[2],w[3]);g.strokeStyle='rgba(240,246,255,.6)';g.lineWidth=1;
    for(i=0;i<14;i++){var a=i*6.2832/14+.2;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*240,cy+Math.sin(a)*240);g.stroke()}
    for(j=1;j<8;j++){g.beginPath();for(i=0;i<=14;i++){a=i*6.2832/14+.2;var k=j/5.2*(i%2?.93:1),x=cx+Math.cos(a)*rx*k,y=cy+Math.sin(a)*ry*k;if(i)g.lineTo(x,y);else g.moveTo(x,y)}g.stroke()}
    g.restore();g.strokeStyle='rgba(240,246,255,.5)';g.setLineDash([4,5]);g.lineWidth=1.5;g.strokeRect(w[0],w[1],w[2],w[3]);g.setLineDash([])}
  function drawMirror(g){var m=R.mir;g.strokeStyle='#8a6a40';g.lineWidth=4;g.beginPath();g.moveTo(m.x-14,m.y+22);g.lineTo(m.x-8,m.y);g.stroke();
    g.fillStyle='#d9b060';ell(g,m.x,m.y,13,20,.12);var gr=g.createLinearGradient(m.x-10,m.y-16,m.x+10,m.y+16);gr.addColorStop(0,'#f2fbff');gr.addColorStop(.5,'#a8d8f0');gr.addColorStop(1,'#e2f6ff');
    g.fillStyle=gr;ell(g,m.x,m.y,9.5,16.5,.12);g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=2;g.beginPath();g.moveTo(m.x-4,m.y-8);g.lineTo(m.x+2,m.y-12);g.stroke()}
  function drawSnail(g){var s=S.sn,p=snPos(S),d=R.snail.side,hid=s.st==='hide',cl=s.st==='eat';if(s.st==='wait')return;
    g.save();g.translate(p[0],p[1]);if(cl)g.rotate(-d*PI/2);g.scale(-d,1);
    if(!hid){g.fillStyle='#f3d9a0';g.strokeStyle='#9a7440';g.lineWidth=1.2;g.beginPath();g.moveTo(-12,6);g.quadraticCurveTo(2,8,13,5);g.quadraticCurveTo(17,-2,12,-6);g.quadraticCurveTo(8,0,-10,2);g.closePath();g.fill();g.stroke();
      g.beginPath();g.moveTo(12,-5);g.lineTo(14,-13+Math.sin(T*5)*1.2);g.moveTo(15,-4);g.lineTo(19,-11+Math.cos(T*5)*1.2);g.stroke();
      g.fillStyle='#fff';circ(g,14,-14,2.5);circ(g,19,-12,2.5);g.fillStyle='#222';circ(g,14.6,-14,1.1);circ(g,19.6,-12,1.1)}
    g.rotate(hid?Math.sin(T*18)*.12*Math.min(1,s.hide):0);
    g.fillStyle='#e58b5e';g.strokeStyle='#8a4526';g.lineWidth=1.5;circ(g,-2,-3,9.5);g.beginPath();g.arc(-2,-3,9.5,0,6.2832);g.stroke();
    g.beginPath();for(var i=0;i<26;i++){var a=i*.5,r=9-i*.33;g.lineTo(-2+Math.cos(a)*r,-3+Math.sin(a)*r)}g.stroke();
    g.fillStyle='rgba(255,255,255,.45)';ell(g,-5,-7,2.6,1.6,-.6);g.restore()}
  function drawBat(g){var b=S.bt,sl=b.st==='sleep',f=Math.sin(T*22);g.save();g.translate(b.x,b.y);
    if(sl){g.fillStyle='#2a2140';g.fillRect(-1.2,-12,2.4,8);ell(g,0,4,7.5,11);g.fillStyle='#3a2f58';ell(g,-5,4,4.5,10,.15);ell(g,5,4,4.5,10,-.15);
      g.fillStyle='#2a2140';g.beginPath();g.moveTo(-6,13);g.lineTo(-8,20);g.lineTo(-2,15);g.moveTo(6,13);g.lineTo(8,20);g.lineTo(2,15);g.fill();
      g.strokeStyle='#c9b8f0';g.lineWidth=1.2;g.beginPath();g.arc(-3,10,1.8,PI,2*PI);g.stroke();g.beginPath();g.arc(3,10,1.8,PI,2*PI);g.stroke();
      g.fillStyle='rgba(220,210,255,.8)';g.font='10px Jua, system-ui, sans-serif';g.fillText('z',10+Math.sin(T*2)*2,26-((T*8)%10))}
    else{g.fillStyle='#35294f';[-1,1].forEach(function(s){g.beginPath();g.moveTo(0,-2);g.lineTo(s*22,-10-f*9);g.lineTo(s*17,-1-f*4);g.lineTo(s*12,3-f*3);g.lineTo(s*6,2);g.closePath();g.fill()});
      g.fillStyle='#2a2140';ell(g,0,0,6.5,8);g.beginPath();g.moveTo(-5,-5);g.lineTo(-6,-13);g.lineTo(-1,-7);g.moveTo(5,-5);g.lineTo(6,-13);g.lineTo(1,-7);g.fill();
      g.fillStyle='#ffe66a';circ(g,-2.6,-2,1.9);circ(g,2.6,-2,1.9);g.fillStyle='#fff';g.fillRect(-1.6,2,1.2,2);g.fillRect(.6,2,1.2,2)}
    g.restore()}
  function drawFix(g,f){g.strokeStyle='#3b4a78';g.lineWidth=2;g.beginPath();g.moveTo(f[0],TOP-14);g.lineTo(f[0],f[1]-12);g.stroke();
    g.fillStyle='#5a6fa0';g.beginPath();g.moveTo(f[0]-14,f[1]-2);g.quadraticCurveTo(f[0],f[1]-24,f[0]+14,f[1]-2);g.fill();g.fillStyle='#eaf4ff';circ(g,f[0],f[1]+1,5)}
  function drawFly(g){
    var x=lamp.x,y=lamp.y+Math.sin(T*5)*2,on=S.held,gl=lamp.glow,fl=Math.abs(Math.sin(T*40)),dx=S.x-x,dy=S.y-y,d=hyp(dx,dy)||1,ex=dx/d*1.7,ey=dy/d*1.7;
    g.globalCompositeOperation='lighter';rad(g,x,y+8,(on?44:26)+gl*26,[[0,'rgba(255,226,130,'+(on?.5+.3*gl:.22)+')'],[1,'rgba(255,200,90,0)']]);g.globalCompositeOperation='source-over';
    g.fillStyle='rgba(225,242,255,.6)';if(on){ell(g,x-9,y-8,8,3+fl*6,-.6);ell(g,x+9,y-8,8,3+fl*6,.6)}else{ell(g,x-7,y-2,8,3.4,-1);ell(g,x+7,y-2,8,3.4,1)}
    g.fillStyle=on?'#fff6b8':'#e8cf7a';g.strokeStyle='#d99a2a';g.lineWidth=1.3;g.beginPath();g.ellipse(x,y+9,7.5,9,0,0,6.2832);g.fill();g.stroke();
    g.strokeStyle='rgba(217,154,42,.6)';g.beginPath();g.moveTo(x-6,y+10);g.lineTo(x+6,y+10);g.moveTo(x-4.5,y+14);g.lineTo(x+4.5,y+14);g.stroke();
    g.strokeStyle='#4b3f66';g.lineWidth=1.4;g.beginPath();g.moveTo(x-4,y-8);g.quadraticCurveTo(x-8,y-15,x-11,y-14);g.moveTo(x+4,y-8);g.quadraticCurveTo(x+8,y-15,x+11,y-14);g.stroke();
    g.fillStyle='#ffe58a';circ(g,x-11,y-14,1.8);circ(g,x+11,y-14,1.8);
    g.fillStyle='#4b3f66';circ(g,x,y,10);g.fillStyle='rgba(255,255,255,.14)';ell(g,x-3,y-5,5,3,-.4);
    g.fillStyle='#ff9db0';ell(g,x-7,y+3,2.3,1.5);ell(g,x+7,y+3,2.3,1.5);
    if(!on||G.blink>0){g.strokeStyle='#fff';g.lineWidth=1.5;g.beginPath();g.arc(x-4,y-1,2.6,.2,PI-.2);g.stroke();g.beginPath();g.arc(x+4,y-1,2.6,.2,PI-.2);g.stroke()}
    else{g.fillStyle='#fff';circ(g,x-4,y-1,3.7);circ(g,x+4,y-1,3.7);g.fillStyle='#1d1830';circ(g,x-4+ex,y-1+ey,1.9);circ(g,x+4+ex,y-1+ey,1.9);
      g.fillStyle='#fff';circ(g,x-4.6+ex,y-1.8+ey,.7);circ(g,x+3.4+ex,y-1.8+ey,.7)}
    g.strokeStyle='#fff';g.lineWidth=1.2;g.beginPath();if(S.wilt>0)g.arc(x,y+6.5,2,PI,2*PI);else g.arc(x,y+4,2.2,.15,PI-.15);g.stroke();
    if(!on){g.fillStyle='rgba(255,240,190,.9)';g.font='11px Jua, system-ui, sans-serif';g.textAlign='left';g.fillText('z',x+12,y-12-((T*7)%9));g.textAlign='center'}}

  function draw(g,a){
    var i,p,b;if(!bgA)buildBg();
    g.drawImage(bgA,0,0);
    for(i=0;i<4;i++){var cx=((T*(5+i*2)+i*120)%(W+160))-80,cy=70+i*46;g.fillStyle='rgba(235,242,255,.2)';ell(g,cx,cy,46,11);ell(g,cx+28,cy+6,34,9);ell(g,cx-26,cy+5,28,8)}
    g.drawImage(bgB,0,0);
    /* 흔들리는 걸이 화분 */
    for(i=0;i<3;i++){var hx=[24,338,224][i],hl=[86,112,70][i],sw=Math.sin(T*.9+i*2)*.07;g.save();g.translate(hx,22);g.rotate(sw);g.globalAlpha=.7;
      g.strokeStyle='#44618c';g.lineWidth=1.2;g.beginPath();g.moveTo(0,0);g.lineTo(-8,hl);g.moveTo(0,0);g.lineTo(8,hl);g.stroke();
      g.fillStyle='#4a6a94';g.beginPath();g.moveTo(-11,hl);g.lineTo(11,hl);g.lineTo(7,hl+14);g.lineTo(-7,hl+14);g.fill();
      g.fillStyle='#4f8a8c';circ(g,-5,hl-3,7);circ(g,5,hl-4,8);circ(g,0,hl-9,6);g.strokeStyle='#4f8a8c';g.lineWidth=2;
      g.beginPath();g.moveTo(9,hl);g.quadraticCurveTo(16,hl+14,12+Math.sin(T+i)*3,hl+30);g.moveTo(-9,hl);g.quadraticCurveTo(-15,hl+10,-12,hl+22);g.stroke();g.restore()}
    for(i=0;i<R.fix.length;i++)drawFix(g,R.fix[i]);
    if(R.web)drawWeb(g);
    for(i=0;i<R.sh.length;i++)drawShelf(g,R.sh[i]);
    if(R.mir)drawMirror(g);
    drawTrellis(g);drawPot(g);
    for(i=0;i<S.drops.length;i++)if(S.drops[i].on)drawDrop(g,S.drops[i],i);
    drawVine(g);
    for(i=0;i<S.buds.length;i++)drawBud(g,S.buds[i],i);
    if(S.sn)drawSnail(g);
    /* 조명: 어두운 푸른빛 위에 빛을 더하고, 장면에 곱한다 */
    buildLight();g.globalCompositeOperation='multiply';g.drawImage(LM,0,0,W,H);g.globalCompositeOperation='lighter';
    if(S.held){var cnt=0;for(i=0;i<motes.length;i++){p=motes[i];var mx=(p.x+Math.sin(T*.5*p.s+p.p)*16+W)%W,my=TOP+((p.y-TOP+T*5*p.s)%(FLOOR-TOP)),
        sx=S.spot?R.mir.sx:lamp.x,sy=S.spot?R.mir.sy:lamp.y,md=hyp(mx-sx,my-sy);
      if(md<150&&los(R,mx,my,sx,sy)){g.fillStyle='rgba(255,236,170,'+((1-md/150)*(.45+.4*Math.sin(T*3+p.p)))+')';circ(g,mx,my,1+p.s*.9);cnt++}}}
    if(S.spot){b=R.mir;g.strokeStyle='rgba(255,236,160,.35)';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(lamp.x,lamp.y);g.lineTo(b.x,b.y);g.lineTo(b.sx,b.sy);g.stroke();
      g.strokeStyle='rgba(255,250,220,.6)';g.lineWidth=2;g.stroke();rad(g,b.sx,b.sy,26,[[0,'rgba(255,246,200,.9)'],[1,'rgba(255,220,120,0)']])}
    if(S.boost>0)rad(g,S.x,S.y,18,[[0,'rgba(140,215,255,.55)'],[1,'rgba(140,215,255,0)']]);
    if(S.lit>0&&S.wilt<=0)rad(g,S.x,S.y,11,[[0,'rgba(235,255,170,'+(.35+.25*Math.sin(T*9))+')'],[1,'rgba(235,255,170,0)']]);
    for(i=0;i<R.fix.length;i++)rad(g,R.fix[i][0],R.fix[i][1]+1,20,[[0,'rgba(225,238,255,.8)'],[1,'rgba(225,238,255,0)']]);
    if(G.ring>0){g.strokeStyle='rgba(255,250,210,'+(G.ring/.4)+')';g.lineWidth=4;g.beginPath();g.arc(lamp.x,lamp.y,130*(1-G.ring/.4),0,6.2832);g.stroke()}
    g.globalCompositeOperation='source-over';
    if(S.bt)drawBat(g);
    for(i=0;i<petals.length;i++){p=petals[i];g.save();g.translate(p.x,p.y);g.rotate(p.r);g.globalAlpha=Math.min(1,(p.l-p.t)*2.5);g.fillStyle=p.c;ell(g,0,0,5,2.6);g.restore()}
    g.globalAlpha=1;drawFly(g);
    /* HUD */
    var tw=200,tx=W/2-tw/2,fr=clamp(G.time/70,0,1),low=G.time<12;
    g.fillStyle='rgba(8,12,36,.6)';rr(g,tx-2,33,tw+4,9,4.5);g.fill();
    g.fillStyle=low?(Math.sin(T*12)>0?'#ff6b6b':'#ffb0a0'):'#ffe27a';rr(g,tx,35,Math.max(5,tw*fr),5,2.5);g.fill();
    g.font='13px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='rgba(8,12,36,.55)';g.fillText((ko?'방 ':'Room ')+(G.n+1),13,45);g.fillStyle='#eaf2ff';g.fillText((ko?'방 ':'Room ')+(G.n+1),12,44);
    g.textAlign='right';g.fillStyle='#eaf2ff';g.fillText(Math.ceil(G.time)+(ko?'초':'s'),W-12,44);
    var sf=clamp(1-S.used/R.sap,0,1),sx0=44,sw0=110;
    g.fillStyle='rgba(8,12,36,.6)';rr(g,10,618,sx0+sw0+4,16,8);g.fill();g.textAlign='left';g.font='11px Jua, system-ui, sans-serif';g.fillStyle='#c9f5b0';g.fillText(ko?'수액':'Sap',17,630);
    g.fillStyle='rgba(255,255,255,.15)';rr(g,sx0,622,sw0,8,4);g.fill();g.fillStyle=sf<.25?'#ffb04a':'#7fe07a';if(sf>.02){rr(g,sx0,622,sw0*sf,8,4);g.fill()}
    g.fillStyle='rgba(255,255,255,.5)';g.fillRect(sx0+4,623.5,Math.max(0,sw0*sf-8),1.5);
    g.textAlign='center';
    if(R.tip&&G.n<10&&(G.n===0?S.len<230:G.rt<4.5)){var tt=R.tip[ko?'ko':'en'];g.font='15px Jua, system-ui, sans-serif';var wdt=g.measureText(tt).width+22,al=G.n===0?1:clamp((4.5-G.rt)*2,0,1);
      g.globalAlpha=al;g.fillStyle='rgba(8,12,36,.62)';rr(g,W/2-wdt/2,96,wdt,26,13);g.fill();g.fillStyle='#fff3c4';g.fillText(tt,W/2,114);g.globalAlpha=1}
    if(G.kb){g.font='10px Jua, system-ui, sans-serif';g.fillStyle='rgba(234,242,255,.75)';g.fillText(ko?'방향키 이동 · 스페이스 번쩍':'Arrows move · Space flashes',W/2+60,630)}
    if(G.fin>0&&G.fin<.3){g.fillStyle='rgba(6,8,24,'+(1-G.fin/.3)+')';g.fillRect(0,0,W,H)}
    if(G.fade>0){g.fillStyle='rgba(6,8,24,'+(G.fade/.4)+')';g.fillRect(0,0,W,H)}
  }

  SG.run({id:'grow-light',title:{ko:'빛 따라 덩굴',en:'Grow Light'},
    how:{ko:'당신은 빛! 반딧불이를 끌면 덩굴이 따라 자라요. 꽃을 모두 피우고 맨 위 덩굴 시렁까지 이끌어 주세요.',
      en:'You are the light! Drag the firefly and the vine grows after it. Bloom every bud, then lead it to the trellis on top.'},
    init:init,update:update,draw:draw});
})();
