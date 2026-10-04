/* 개미 냄새길 (Ant Trail) — 개미는 직접 못 움직인다. 손가락으로 냄새 길을 그리면 개미 떼가 알아서 따라간다.
   시뮬레이션(페로몬 격자 + 개미)은 DOM 없이 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,CS=4,GW=90,GH=160,X0=14,X1=346,Y0=70,Y1=626;
  var NANT=52,SPD=64,SD=10,SO=[0,-.75,.75],LEASH=56,BR=7,COST=.2,DOT=2,REFILL=6,LIFE=8,
      ISPD=48,TANG=3.2,UNITS={crumb:1,sugar:4,berry:8},FR={crumb:11,sugar:12,berry:15};

  function RNG(seed){var s=(seed>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function norm(a){while(a>Math.PI)a-=6.283185307;while(a<-Math.PI)a+=6.283185307;return a}

  /* ---------- 레벨 ----------
     foods:[종류,x,y,(부스러기 수)]  slow:[x,y,r,'puddle'|'jam']  obst:[x,y,r]  spiders:[x,y,r]
     rival:[x,y,영역 반지름,마릿수]  sweep:[x,y,w,h,주기,위상] */
  var NEST=[180,574];
  var LEVELS=[
    {foods:[['crumb',180,365,8]],quota:5,tip:{ko:'냄새 길을 그려 주세요',en:'Draw a scent trail'}},
    {foods:[['crumb',180,300,9]],quota:6,slow:[[180,440,58,'puddle']],tip:{ko:'물웅덩이는 돌아서 가요',en:'Go around the puddle'}},
    {foods:[['sugar',105,330],['crumb',270,360,6]],quota:7,obst:[[200,440,30]],slow:[[136,458,28,'jam']],tip:{ko:'각설탕은 4마리가 함께!',en:'A sugar cube needs 4 ants'}},
    {foods:[['crumb',150,270,10]],quota:7,spiders:[[170,420,48]],obst:[[58,400,34]],tip:{ko:'거미줄을 피해서 그려요',en:'Keep the trail off the web'}},
    {foods:[['crumb',200,230,10]],quota:8,rival:[215,400,80,16],tip:{ko:'빨간 개미도 냄새를 따라와요',en:'Red ants follow your scent too'}},
    {foods:[['sugar',105,375],['sugar',262,335]],quota:8,slow:[[132,478,36,'jam'],[232,452,36,'jam']],wind:true,
      tip:{ko:'바람 부는 날엔 냄새가 빨리 날아가요',en:'Wind blows the scent away faster'}},
    {foods:[['crumb',120,250,12]],quota:8,slow:[[300,300,34,'puddle']],sweep:[14,380,176,70,7,4],
      tip:{ko:'빗자루가 지나가는 자리 조심!',en:'Watch where the broom sweeps'}},
    {foods:[['berry',180,260]],quota:8,spiders:[[165,430,46]],slow:[[262,400,36,'jam']],obst:[[66,330,30]],
      tip:{ko:'딸기는 8마리가 필요해요',en:'The strawberry needs 8 ants'}},
    {foods:[['crumb',120,210,12],['sugar',290,280]],quota:10,rival:[100,370,70,12],slow:[[265,440,48,'puddle']],
      tip:{ko:'좁은 틈으로 길을 내요',en:'Thread the gap'}},
    {foods:[['berry',180,200],['crumb',70,300,8]],quota:12,rival:[300,310,66,12],spiders:[[150,400,46]],sweep:[215,440,131,60,10,2],
      tip:{ko:'소풍 대작전!',en:'The great picnic heist!'}}
  ];
  function inflate(L){
    return {nest:L.nest||NEST,quota:L.quota,wind:!!L.wind,tip:L.tip||null,n:L.n||0,
      foods:L.foods.map(function(f){return {t:f[0],x:f[1],y:f[2],n:f[0]==='crumb'?f[3]:1}}),
      slow:(L.slow||[]).map(function(z){return {x:z[0],y:z[1],r:z[2],k:z[3]}}),
      obst:(L.obst||[]).map(function(z){return {x:z[0],y:z[1],r:z[2]}}),
      spiders:(L.spiders||[]).map(function(z){return {x:z[0],y:z[1],r:z[2]}}),
      rival:L.rival?{x:L.rival[0],y:L.rival[1],r:L.rival[2],n:L.rival[3]}:null,
      sweep:L.sweep?{x:L.sweep[0],y:L.sweep[1],w:L.sweep[2],h:L.sweep[3],per:L.sweep[4],off:L.sweep[5]}:null}}
  /* 위험 지대를 피해 둥지에서 먹이까지 갈 수 있는지(12px 격자 BFS) */
  function blockedAt(L,x,y,m){var i,z;
    for(i=0;i<L.slow.length;i++){z=L.slow[i];if(Math.hypot(x-z.x,y-z.y)<z.r+m)return true}
    for(i=0;i<L.obst.length;i++){z=L.obst[i];if(Math.hypot(x-z.x,y-z.y)<z.r+m)return true}
    for(i=0;i<L.spiders.length;i++){z=L.spiders[i];if(Math.hypot(x-z.x,y-z.y)<z.r+m)return true}
    z=L.rival;if(z&&Math.hypot(x-z.x,y-z.y)<z.r+m)return true;
    z=L.sweep;if(z&&x>z.x-m&&x<z.x+z.w+m&&y>z.y-m&&y<z.y+z.h+m)return true;
    return false}
  function reachable(L){var gw=30,gh=54,seen=new Uint8Array(gw*gh),q=[],h=0,c,x,y,k,nx,ny,i,
      D=[[1,0],[-1,0],[0,1],[0,-1]];
    function cell(px,py){return Math.floor(py/12)*gw+Math.floor(px/12)}
    c=cell(L.nest[0],L.nest[1]);seen[c]=1;q.push(c);
    while(h<q.length){c=q[h++];x=c%gw;y=(c-x)/gw;
      for(k=0;k<4;k++){nx=x+D[k][0];ny=y+D[k][1];if(nx<2||nx>=gw-2||ny<6||ny>=gh-1)continue;
        i=ny*gw+nx;if(seen[i]||blockedAt(L,nx*12+6,ny*12+6,12))continue;seen[i]=1;q.push(i)}}
    for(i=0;i<L.foods.length;i++)if(!seen[cell(L.foods[i].x,L.foods[i].y)])return false;
    return true}
  function gen(n){
    var r=RNG(n*7919+101),L,i,j,t,f,z,ok,x,y,rad,kind,tries,nh,attempt;
    for(attempt=0;attempt<12;attempt++){
      L={foods:[],slow:[],spiders:[],obst:[],quota:0,wind:r()<.3,n:n};
      t=r();L.foods.push([t<.22?'berry':t<.6?'sugar':'crumb',50+r()*260,150+r()*190,10]);
      if(r()<.65){for(i=0;i<20;i++){x=50+r()*260;y=160+r()*190;
        if(Math.hypot(x-L.foods[0][1],y-L.foods[0][2])>110){L.foods.push(['crumb',x,y,9]);break}}}
      L.foods.forEach(function(q){q[1]=Math.round(q[1]);q[2]=Math.round(q[2]);L.quota+=q[0]==='crumb'?5:UNITS[q[0]]});
      nh=Math.max(0,2+Math.min(2,Math.floor((n-10)/4))-attempt/4|0);
      for(i=0;i<nh;i++)for(tries=0;tries<24;tries++){
        f=L.foods[Math.floor(r()*L.foods.length)];t=.3+r()*.4;
        x=NEST[0]+(f[1]-NEST[0])*t+(r()-.5)*40;y=NEST[1]+(f[2]-NEST[1])*t+(r()-.5)*40;
        t=r();kind=t<.3?'puddle':t<.55?'jam':t<.8?'spider':'rival';if(kind==='rival'&&L.rival)kind='puddle';
        rad=kind==='rival'?66+r()*10:36+r()*16;ok=x>X0+20&&x<X1-20&&Math.hypot(x-NEST[0],y-NEST[1])>rad+78;
        for(j=0;ok&&j<L.foods.length;j++)if(Math.hypot(x-L.foods[j][1],y-L.foods[j][2])<rad+36)ok=false;
        z=L.slow.concat(L.spiders);if(L.rival)z.push(L.rival);
        for(j=0;ok&&j<z.length;j++)if(Math.hypot(x-z[j][0],y-z[j][1])<rad+z[j][2]+34)ok=false;
        if(!ok)continue;x=Math.round(x);y=Math.round(y);rad=Math.round(rad);
        if(kind==='rival')L.rival=[x,y,rad,12];else if(kind==='spider')L.spiders.push([x,y,rad]);else L.slow.push([x,y,rad,kind]);
        break}
      if(attempt<6&&r()<.3)L.sweep=[r()<.5?14:186,440+Math.round(r()*30),160,56,9+Math.round(r()*3),2];
      L=inflate(L);if(reachable(L))return L}
    return inflate({foods:[['crumb',180,300,10]],quota:5,n:n})}
  function getLevel(n){if(n<LEVELS.length){var L=inflate(LEVELS[n]);L.n=n;return L}return gen(n)}

  /* ---------- 시뮬레이션 ---------- */
  function ci(x,y){var cx=x/CS|0,cy=y/CS|0;return cx<0||cy<0||cx>=GW||cy>=GH?-1:cy*GW+cx}
  function phAt(S,x,y){var i=ci(x,y);return i<0?0:S.ph[i]}
  function stamp(S,x,y){var cx=x/CS|0,cy=y/CS|0,i,j,d,v,k;
    for(j=cy-2;j<=cy+2;j++)for(i=cx-2;i<=cx+2;i++){if(i<0||j<0||i>=GW||j>=GH)continue;
      d=Math.hypot((i+.5)*CS-x,(j+.5)*CS-y);if(d>BR+1)continue;v=1-.45*(d/BR)*(d/BR);k=j*GW+i;if(S.ph[k]<v)S.ph[k]=v}}
  /* 냄새 칠하기: 쓴 만큼 향수 게이지가 줄고, 다 떨어지면 거기서 끊긴다 */
  function paint(S,x0,y0,x1,y1){
    if(S.meter<=.01)return false;
    var d=Math.hypot(x1-x0,y1-y0),cost=d>0?d*COST:DOT,f=1,n,i;
    if(cost>S.meter){f=S.meter/cost;cost=S.meter}
    S.meter-=cost;S.used+=cost;n=Math.max(1,Math.ceil(d*f/3));
    for(i=0;i<=n;i++)stamp(S,x0+(x1-x0)*f*i/n,y0+(y1-y0)*f*i/n);
    return true}
  function erase(S,x,y,r){var c0=Math.max(0,(x-r)/CS|0),c1=Math.min(GW-1,(x+r)/CS|0),r0=Math.max(0,(y-r)/CS|0),r1=Math.min(GH-1,(y+r)/CS|0),i,j,n=0;
    for(j=r0;j<=r1;j++)for(i=c0;i<=c1;i++)if(Math.hypot((i+.5)*CS-x,(j+.5)*CS-y)<=r&&S.ph[j*GW+i]>0){S.ph[j*GW+i]=0;n++}
    return n}
  function makeSim(L,seed){
    var S={L:L,ph:new Float32Array(GW*GH),dm:new Float32Array(GW*GH),ants:[],foods:[],del:0,stolen:0,tang:0,lost:0,t:0,meter:100,used:0,
        rng:RNG(seed||1),ev:[],acc:0,chk:0,warn:0,bx:-1,swN:0},i,j,k,z,a;
    for(j=0;j<GH;j++)for(i=0;i<GW;i++){k=1;
      for(z=0;z<L.slow.length;z++)if(L.slow[z].k==='puddle'&&Math.hypot((i+.5)*CS-L.slow[z].x,(j+.5)*CS-L.slow[z].y)<L.slow[z].r)k=4;
      S.dm[j*GW+i]=k}
    S.foods=L.foods.map(function(f){return {t:f.t,x:f.x,y:f.y,n:f.n,n0:f.n,need:UNITS[f.t],units:UNITS[f.t],r:FR[f.t],att:0,seq:0,a:0,
      moving:false,gone:false,tang:0,imm:0,big:f.t!=='crumb'}});
    function ant(hx,hy,leash,red,i){a=S.rng()*6.283;
      return {x:hx+Math.cos(a)*6,y:hy+Math.sin(a)*6,a:a,st:0,prev:0,conf:9,tang:0,imm:0,item:-1,wait:0,slot:0,lp:S.rng()*6,
        red:red,born:i*.05,hx:hx,hy:hy,leash:leash,sp:SPD*(.9+S.rng()*.2)}}
    for(i=0;i<NANT;i++)S.ants.push(ant(L.nest[0],L.nest[1],LEASH,false,i));
    if(L.rival)for(i=0;i<L.rival.n;i++)S.ants.push(ant(L.rival.x,L.rival.y,L.rival.r-34,true,i));
    return S}
  function sense(S,x,y,a,sd){var b=.06,off=null,i,v;
    for(i=0;i<3;i++){v=phAt(S,x+Math.cos(a+SO[i])*sd,y+Math.sin(a+SO[i])*sd)*(i?1:1.15);if(v>b){b=v;off=SO[i]}}
    return off}
  function turnTo(o,tx,ty,rate,dt){var d=norm(Math.atan2(ty-o.y,tx-o.x)-o.a),m=rate*dt;o.a+=d>m?m:d<-m?-m:d}
  function move(S,o,sp,rad,dt){var L=S.L,i,z,dx,dy,d,k=1,ta,rel;
    for(i=0;i<L.slow.length;i++){z=L.slow[i];if(Math.hypot(o.x-z.x,o.y-z.y)<z.r)k=Math.min(k,z.k==='jam'?.2:.38)}
    o.x+=Math.cos(o.a)*sp*k*dt;o.y+=Math.sin(o.a)*sp*k*dt;
    for(i=0;i<L.obst.length;i++){z=L.obst[i];dx=o.x-z.x;dy=o.y-z.y;d=Math.hypot(dx,dy);
      if(d<z.r+rad&&d>.001){o.x=z.x+dx/d*(z.r+rad);o.y=z.y+dy/d*(z.r+rad);ta=Math.atan2(dy,dx);rel=norm(o.a-ta);
        if(Math.abs(rel)>1.5708)o.a=ta+(rel>0?1.5708:-1.5708)}}
    if(o.x<X0+rad){o.x=X0+rad;o.a=Math.PI-o.a}else if(o.x>X1-rad){o.x=X1-rad;o.a=Math.PI-o.a}
    if(o.y<Y0+rad){o.y=Y0+rad;o.a=-o.a}else if(o.y>Y1-rad){o.y=Y1-rad;o.a=-o.a}
    return k}
  function refresh(S,x,y,amt,rr){var cx=x/CS|0,cy=y/CS|0,i,j,k;
    for(j=cy-rr;j<=cy+rr;j++)for(i=cx-rr;i<=cx+rr;i++){if(i<0||j<0||i>=GW||j>=GH)continue;k=j*GW+i;
      if(S.ph[k]>.05){S.ph[k]+=amt;if(S.ph[k]>1)S.ph[k]=1}}}
  function inWeb(S,x,y){var sp=S.L.spiders,i;for(i=0;i<sp.length;i++)if(Math.hypot(x-sp[i].x,y-sp[i].y)<sp[i].r)return i;return -1}

  /* 냄새를 따라가는 중이 아니면 개미는 거미줄을 알아서 비켜 간다(거미줄에 걸리는 건 길을 잘못 그렸을 때뿐) */
  function shun(S,o,m){var sp=S.L.spiders,i,dx,dy,d,ta,rel;
    for(i=0;i<sp.length;i++){dx=o.x-sp[i].x;dy=o.y-sp[i].y;d=Math.hypot(dx,dy);
      if(d<sp[i].r+m&&d>.001){o.x=sp[i].x+dx/d*(sp[i].r+m);o.y=sp[i].y+dy/d*(sp[i].r+m);ta=Math.atan2(dy,dx);rel=norm(o.a-ta);
        if(Math.abs(rel)>1.5708)o.a=ta+(rel>0?1.5708:-1.5708)}}}
  function stepAnt(S,o,dt){
    var L=S.L,f,i,d,off,best,bd,w;
    if(S.t<o.born)return;
    if(o.imm>0)o.imm-=dt;
    if(o.st===3){o.tang-=dt;o.lp+=dt*14;if(o.tang<=0){o.st=o.prev;o.imm=2.6}return}
    if(o.st===2){f=S.foods[o.item];
      if(f.gone){o.st=0;o.item=-1;o.conf=0;o.a=Math.atan2(o.y-o.hy,o.x-o.hx);return}
      o.x=f.x+Math.cos(o.slot)*(f.r+1);o.y=f.y+Math.sin(o.slot)*(f.r+1);o.a=o.slot+Math.PI;
      if(f.moving)o.lp+=dt*20;else{o.wait+=dt;if(o.wait>9){f.att--;o.st=0;o.item=-1;o.conf=0;o.a=o.slot;o.imm=0}}
      return}
    if(!o.red&&o.imm<=0){w=inWeb(S,o.x,o.y);
      if(w>=0){o.prev=o.st;o.st=3;o.tang=TANG;S.tang++;S.ev.push({t:'tang',x:o.x,y:o.y,w:w});return}}
    off=sense(S,o.x,o.y,o.a,SD);
    if(off==null&&!o.red&&o.imm<=0)shun(S,o,7);
    if(o.st===1){
      if(o.red)turnTo(o,o.hx,o.hy,8,dt);
      else if(off!=null){o.a+=off*10*dt+(S.rng()-.5)*.12;refresh(S,o.x,o.y,dt*1.1,1)}
      else turnTo(o,o.hx,o.hy,7,dt);
      o.lp+=dt*18*move(S,o,o.sp*.92,2,dt);
      if(Math.hypot(o.x-o.hx,o.y-o.hy)<13){o.st=0;o.a+=Math.PI;o.conf=0;
        if(o.red){S.stolen++;S.ev.push({t:'steal',x:o.hx,y:o.hy})}else{S.del++;S.ev.push({t:'del',x:o.hx,y:o.hy,u:1})}}
      return}
    best=-1;bd=1e9;
    for(i=0;i<S.foods.length;i++){f=S.foods[i];if(f.gone)continue;
      if(f.big?(o.red||f.att>=f.need+2):f.n<=0)continue;
      d=Math.hypot(f.x-o.x,f.y-o.y)-f.r;if(d<26&&d<bd){bd=d;best=i}}
    if(best>=0){f=S.foods[best];
      if(bd<4){
        if(f.big){o.st=2;o.item=best;o.wait=0;o.slot=(f.seq++)*2.4;f.att++;f.a=o.a+Math.PI;
          S.ev.push({t:'att',x:f.x,y:f.y,n:f.att,need:f.need});if(f.att>=f.need&&!f.moving){f.moving=true;S.ev.push({t:'lift',x:f.x,y:f.y})}}
        else{f.n--;o.st=1;o.a+=Math.PI;S.ev.push({t:'pick',x:f.x,y:f.y})}
        return}
      turnTo(o,f.x,f.y,10,dt);o.conf=0}
    else if(off!=null){o.conf=0;o.a+=off*10*dt+(S.rng()-.5)*.12}
    else{o.conf+=dt;o.a+=(S.rng()-.5)*.55;
      if(o.conf>1.3&&Math.hypot(o.x-o.hx,o.y-o.hy)>o.leash)turnTo(o,o.hx,o.hy,5,dt)}
    o.lp+=dt*18*move(S,o,o.sp,2,dt)}

  function stepItem(S,f,dt){var L=S.L,off,w;
    if(f.gone||!f.moving)return;
    if(f.imm>0)f.imm-=dt;
    if(f.tang>0){f.tang-=dt;if(f.tang<=0)f.imm=5;return}
    if(f.imm<=0){w=inWeb(S,f.x,f.y);if(w>=0){f.tang=TANG;S.tang++;S.ev.push({t:'tang',x:f.x,y:f.y,w:w});return}}
    off=sense(S,f.x,f.y,f.a,13);
    if(off!=null){f.a+=off*6*dt;refresh(S,f.x,f.y,dt*1.4,2)}else{turnTo(f,L.nest[0],L.nest[1],4,dt);if(f.imm<=0)shun(S,f,9)}
    move(S,f,ISPD,f.r*.6,dt);
    if(Math.hypot(f.x-L.nest[0],f.y-L.nest[1])<18){f.gone=true;f.moving=false;S.del+=f.units;S.ev.push({t:'big',x:L.nest[0],y:L.nest[1],u:f.units,k:f.t})}}

  function tick(S){
    var dt=1/60,L=S.L,i,j,ph=S.ph,dm=S.dm,rate=dt/LIFE*(L.wind?1.35:1),z,p,o,avail;
    S.t+=dt;S.meter=Math.min(100,S.meter+REFILL*dt);
    for(i=0;i<ph.length;i++)if(ph[i]>0){ph[i]-=rate*dm[i];if(ph[i]<0)ph[i]=0}
    for(i=0;i<S.ants.length;i++)stepAnt(S,S.ants[i],dt);
    for(i=0;i<S.foods.length;i++)stepItem(S,S.foods[i],dt);
    /* 빗자루: 예고(warn) 뒤에 구역을 쓸고 지나가며 냄새를 지우고 개미를 흩뜨린다 */
    z=L.sweep;S.warn=0;S.bx=-1;
    if(z){p=(S.t+z.off)%z.per;
      if(p>z.per-2.4)S.warn=(p-(z.per-2.4))/2.4;
      else if(p<.7&&S.t+z.off>=z.per){
        if(S.swN!==Math.floor((S.t+z.off)/z.per)){S.swN=Math.floor((S.t+z.off)/z.per);S.ev.push({t:'sweep',x:z.x,y:z.y+z.h/2})}
        S.bx=z.x+z.w*p/.7;
        for(j=Math.max(0,z.y/CS|0);j<=Math.min(GH-1,(z.y+z.h)/CS|0);j++)for(i=Math.max(0,z.x/CS|0);i<=Math.min(GW-1,S.bx/CS|0);i++)ph[j*GW+i]=0;
        for(i=0;i<S.ants.length;i++){o=S.ants[i];
          if(o.st<2&&o.y>z.y&&o.y<z.y+z.h&&o.x>=z.x&&o.x<S.bx&&o.x>S.bx-12&&S.t>=o.born){o.a=S.rng()*6.283;o.conf=0;o.x=Math.min(X1-4,S.bx+4);o.y+=(S.rng()-.5)*16;
            if(o.st===1&&!o.red){o.st=0;S.lost++;S.ev.push({t:'drop',x:o.x,y:o.y})}}}}}
    /* 빨간 개미가 다 가져가 목표를 못 채우게 되면 부스러기를 보충한다 */
    S.chk+=dt;
    if(S.chk>3){S.chk=0;avail=S.del;
      for(i=0;i<S.foods.length;i++){o=S.foods[i];if(!o.gone)avail+=o.big?o.units:o.n}
      for(i=0;i<S.ants.length;i++)if(!S.ants[i].red&&(S.ants[i].st===1||(S.ants[i].st===3&&S.ants[i].prev===1)))avail++;
      if(avail<L.quota){for(i=0;i<S.foods.length;i++)if(!S.foods[i].big){S.foods[i].n+=L.quota-avail+2;S.ev.push({t:'refill',x:S.foods[i].x,y:S.foods[i].y});break}}}}
  function step(S,dt){S.acc+=dt;var n=0;while(S.acc>=1/60&&n<4){tick(S);S.acc-=1/60;n++}if(n>=4)S.acc=0}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={LEVELS:LEVELS,getLevel:getLevel,makeSim:makeSim,tick:tick,step:step,paint:paint,erase:erase,phAt:phAt,
      blockedAt:blockedAt,reachable:reachable,W:W,H:H,CS:CS,GW:GW,GH:GH,COST:COST,X0:X0,X1:X1,Y0:Y0,Y1:Y1};
  if(typeof SG==='undefined')return;

  /* ---------- 게임 ---------- */
  var lvN,L,S,mode,modeT,time,tG=0,prevDown,lp,cur,kbOn,kbPrev,lastTapT,lastTap,painted,cheer,sad,combo,comboT,dry,
      bg=null,phC=null,phG=null,phI=null,motes=[],leaves=[],webGlow=[],pile=[],eraseFx=[],warned,bonusTxt,flash=0;
  var keys={l:false,r:false,u:false,d:false,sp:false,sh:false};
  if(!window.__antTrailKeys){window.__antTrailKeys=true;
    var kf=function(e,v){var c=e.code;
      if(c==='ArrowLeft'||c==='KeyA')keys.l=v;else if(c==='ArrowRight'||c==='KeyD')keys.r=v;
      else if(c==='ArrowUp'||c==='KeyW')keys.u=v;else if(c==='ArrowDown'||c==='KeyS')keys.d=v;
      else if(c==='Space')keys.sp=v;else if(c==='ShiftLeft'||c==='ShiftRight')keys.sh=v};
    window.addEventListener('keydown',function(e){kf(e,true)});
    window.addEventListener('keyup',function(e){kf(e,false)});
    window.addEventListener('blur',function(){keys.l=keys.r=keys.u=keys.d=keys.sp=keys.sh=false})}
  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}

  /* ----- 배경(레벨마다 한 번 그려 둔다) ----- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function buildBg(){
    if(!bg){bg=document.createElement('canvas');bg.width=W;bg.height=H}
    var g=bg.getContext('2d'),i,z,gr;
    gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#5fae5a');gr.addColorStop(1,'#3f8f4c');g.fillStyle=gr;g.fillRect(0,0,W,H);
    for(i=0;i<260;i++){g.fillStyle=hash(i)>.5?'rgba(255,255,200,.10)':'rgba(20,70,30,.14)';g.fillRect(hash(i+300)*W,hash(i+600)*H,2,5)}
    g.fillStyle='rgba(20,50,20,.25)';rr(g,10,64,W-16,H-70,14);g.fill();
    g.save();rr(g,8,60,W-16,H-68,14);g.clip();
    gr=g.createLinearGradient(0,60,W,H);gr.addColorStop(0,'#fffaf0');gr.addColorStop(1,'#f7efdc');g.fillStyle=gr;g.fillRect(0,0,W,H);
    g.fillStyle='rgba(70,150,190,.28)';
    for(i=-1;i<11;i++)g.fillRect(8+i*36+18,60,18,H);
    for(i=0;i<17;i++)g.fillRect(8,60+i*36+18,W,18);
    g.strokeStyle='rgba(120,80,50,.045)';g.lineWidth=1;g.beginPath();
    for(i=0;i<W;i+=3){g.moveTo(i+.5,60);g.lineTo(i+.5,H)}
    for(i=60;i<H;i+=3){g.moveTo(0,i+.5);g.lineTo(W,i+.5)}g.stroke();
    for(i=0;i<5;i++){g.strokeStyle='rgba(150,110,70,.07)';g.lineWidth=14;g.beginPath();
      g.moveTo(-20,120+i*120+hash(i+3)*50);g.quadraticCurveTo(180,90+i*120+hash(i+8)*90,380,130+i*120+hash(i+5)*50);g.stroke()}
    g.restore();
    g.strokeStyle='rgba(50,120,160,.55)';g.lineWidth=1.5;g.setLineDash([5,4]);rr(g,13,65,W-26,H-78,10);g.stroke();g.setLineDash([]);
    if(!L)return;
    L.slow.forEach(function(z){
      if(z.k==='puddle'){gr=g.createRadialGradient(z.x-z.r*.3,z.y-z.r*.3,2,z.x,z.y,z.r);
        gr.addColorStop(0,'rgba(190,235,255,.95)');gr.addColorStop(.7,'rgba(110,190,240,.85)');gr.addColorStop(1,'rgba(70,150,220,.75)');
        g.fillStyle='rgba(60,90,120,.18)';blob(g,z.x+2,z.y+3,z.r,z.x);g.fill();g.fillStyle=gr;blob(g,z.x,z.y,z.r,z.x);g.fill();g.strokeStyle='rgba(40,110,175,.7)';g.lineWidth=1.5;g.stroke();
        g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(z.x-z.r*.35,z.y-z.r*.4,z.r*.22,z.r*.09,-.5,0,7);g.fill()}
      else{g.fillStyle='rgba(120,70,0,.22)';blob(g,z.x+1,z.y+3,z.r,z.y);g.fill();
        gr=g.createRadialGradient(z.x,z.y,2,z.x,z.y,z.r);gr.addColorStop(0,'#ffc531');gr.addColorStop(.75,'#f5a70f');gr.addColorStop(1,'#d9860a');
        g.fillStyle=gr;blob(g,z.x,z.y,z.r,z.y);g.fill();g.strokeStyle='rgba(170,95,0,.7)';g.lineWidth=1.5;g.stroke();
        for(i=0;i<5;i++){var da=hash(z.x+i)*6.283,dd=z.r*(1.02+hash(z.y+i)*.22);g.fillStyle='#f5a70f';g.beginPath();g.arc(z.x+Math.cos(da)*dd,z.y+Math.sin(da)*dd,2.5+hash(i+z.r)*3,0,7);g.fill()}
        g.strokeStyle='rgba(255,240,180,.75)';g.lineWidth=2.5;g.lineCap='round';g.beginPath();g.arc(z.x,z.y,z.r*.62,3.5,4.7);g.stroke();
        g.beginPath();g.arc(z.x,z.y,z.r*.3,3.6,4.4);g.stroke()}});
    L.obst.forEach(function(z){
      g.fillStyle='rgba(60,40,20,.25)';g.beginPath();g.arc(z.x+3,z.y+5,z.r,0,7);g.fill();
      gr=g.createRadialGradient(z.x-z.r*.3,z.y-z.r*.4,2,z.x,z.y,z.r);gr.addColorStop(0,'#ffffff');gr.addColorStop(.8,'#eef3f8');gr.addColorStop(1,'#c9d6e2');
      g.fillStyle=gr;g.beginPath();g.arc(z.x,z.y,z.r,0,7);g.fill();
      g.strokeStyle='#7fb6dc';g.lineWidth=2;g.beginPath();g.arc(z.x,z.y,z.r-3,0,7);g.stroke();
      g.strokeStyle='rgba(120,150,180,.5)';g.lineWidth=1;g.beginPath();g.arc(z.x,z.y,z.r*.62,0,7);g.stroke();
      g.save();g.translate(z.x,z.y);g.rotate(-.6);g.strokeStyle='#aab4bf';g.lineCap='round';g.lineWidth=3;
      g.beginPath();g.moveTo(-z.r*.5,0);g.lineTo(z.r*.25,0);g.stroke();g.lineWidth=1.6;
      for(i=-1;i<=1;i++){g.beginPath();g.moveTo(z.r*.25,i*3);g.lineTo(z.r*.55,i*3);g.stroke()}
      g.beginPath();g.moveTo(z.r*.25,-3);g.lineTo(z.r*.25,3);g.stroke();g.restore()})}
  function blob(g,x,y,r,seed){g.beginPath();for(var i=0;i<=24;i++){var a=i/24*6.283,k=r*(.93+.07*Math.sin(a*3+seed)+.04*Math.sin(a*5+seed*2));
      if(i)g.lineTo(x+Math.cos(a)*k,y+Math.sin(a)*k);else g.moveTo(x+Math.cos(a)*k,y+Math.sin(a)*k)}g.closePath()}

  function load(n){lvN=n;L=getLevel(n);S=makeSim(L,(Math.random()*1e9)|0);mode='play';modeT=0;lp=null;painted=false;pile=[];webGlow=[];motes=[];
    eraseFx=[];combo=0;comboT=0;cur={x:L.nest[0],y:L.nest[1]-46};kbPrev=null;buildBg()}
  function init(a){
    time=50;prevDown=true;kbOn=false;lastTapT=-9;lastTap=null;cheer=0;sad=0;dry=0;warned=0;bonusTxt=null;flash=0;
    leaves=[];for(var i=0;i<7;i++)leaves.push({x:hash(i+1)*W,y:80+hash(i+11)*520,r:46+hash(i+21)*50,p:hash(i+31)*6.28,v:.25+hash(i+41)*.3});
    if(!phC){phC=document.createElement('canvas');phC.width=GW;phC.height=GH;phG=phC.getContext('2d');phI=phG.createImageData(GW,GH)}
    load(0);a.tempo(1)}

  function clampP(p){p.x=Math.max(X0,Math.min(X1,p.x));p.y=Math.max(Y0,Math.min(Y1,p.y))}
  function doErase(a,x,y,r,big){var n=erase(S,x,y,r);if(big){eraseFx.push({x:x,y:y,r:r,t:0});a.beep(n?420:300,.08,'triangle')}}
  function doPaint(a,x0,y0,x1,y1){
    if(paint(S,x0,y0,x1,y1)){painted=true;return}
    dry-=1;if(dry<=0){dry=14;flash=.4;a.beep(150,.06,'square')}}

  function update(dt,inp,a){
    var ko=a.lang==='ko',i,e,p,ptr=inp.down&&inp.x!=null,fresh,mv,sp;
    tG+=dt;if(cheer>0)cheer-=dt;if(sad>0)sad-=dt;if(flash>0)flash-=dt;if(comboT>0)comboT-=dt;else combo=0;
    if(mode==='clear'){modeT+=dt;if(modeT>1.5)load(lvN+1);prevDown=inp.down;return}
    time-=dt;if(time<=0){time=0;a.over();return}
    if(time<10&&Math.ceil(time)!==warned){warned=Math.ceil(time);a.beep(880,.05,'square')}
    a.tempo(time<12?1.3:1);
    /* 포인터: 끌면 칠하기, Shift+끌기 또는 두 번 탭이면 지우기 */
    if(ptr){kbOn=false;p={x:inp.x,y:inp.y};clampP(p);fresh=!prevDown;
      if(fresh){
        if(keys.sh)doErase(a,p.x,p.y,16,false);
        else if(tG-lastTapT<.36&&lastTap&&Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<30){doErase(a,p.x,p.y,48,true);lastTapT=-9}
        else{doPaint(a,p.x,p.y,p.x,p.y);lastTapT=tG;lastTap=p}
        lp=p}
      else if(lp&&Math.hypot(p.x-lp.x,p.y-lp.y)>=2){
        if(keys.sh)doErase(a,p.x,p.y,16,false);else doPaint(a,lp.x,lp.y,p.x,p.y);
        if(Math.hypot(p.x-lastTap.x,p.y-lastTap.y)>30)lastTapT=-9;
        lp=p}}
    else lp=null;
    prevDown=inp.down;
    /* 키보드 붓 */
    mv=keys.l||keys.r||keys.u||keys.d;
    if(mv||keys.sp||keys.sh){if(!ptr)kbOn=true}
    if(kbOn){sp=200*dt;if(keys.l)cur.x-=sp;if(keys.r)cur.x+=sp;if(keys.u)cur.y-=sp;if(keys.d)cur.y+=sp;clampP(cur);
      if(keys.sh){erase(S,cur.x,cur.y,16);kbPrev=null}
      else if(keys.sp){if(!kbPrev)doPaint(a,cur.x,cur.y,cur.x,cur.y);else if(Math.hypot(cur.x-kbPrev.x,cur.y-kbPrev.y)>=2)doPaint(a,kbPrev.x,kbPrev.y,cur.x,cur.y);
        if(!kbPrev||Math.hypot(cur.x-kbPrev.x,cur.y-kbPrev.y)>=2)kbPrev={x:cur.x,y:cur.y}}
      else kbPrev=null}
    step(S,dt);
    for(i=0;i<S.ev.length;i++){e=S.ev[i];
      if(e.t==='del'){combo++;comboT=1.2;a.add(10);a.beep(520+Math.min(12,combo)*45,.07,'triangle');a.burst(e.x,e.y-8,'#ffd257',4);cheer=.5;
        if(combo%3===0)a.pop(e.x,e.y-34,'+'+(combo*10),'#fff3a0');pile.push(0)}
      else if(e.t==='big'){a.add(e.k==='berry'?150:60);a.sfx('coin');a.burst(e.x,e.y-8,e.k==='berry'?'#ff5a6e':'#ffffff',18);
        a.pop(e.x,e.y-40,e.k==='berry'?'+150':'+60','#fff3a0');cheer=1;a.shake(4);for(var q=0;q<e.u;q++)pile.push(e.k==='berry'?2:1)}
      else if(e.t==='lift'){a.sfx('jump');a.pop(e.x,e.y-24,ko?'영차!':'Heave!','#ffffff')}
      else if(e.t==='att'){a.beep(700+e.n*40,.04,'sine')}
      else if(e.t==='tang'){a.beep(170,.14,'sawtooth');a.pop(e.x,e.y-10,'!','#ff5a5a');a.burst(e.x,e.y,'#e8e8ff',5);webGlow[e.w]=1;sad=.8}
      else if(e.t==='steal'){a.beep(240,.1,'square');time=Math.max(1,time-2);a.pop(e.x,e.y-22,ko?'뺏겼다! -2초':'Stolen! -2s','#ff6a5a');a.burst(e.x,e.y,'#ff6a5a',6);sad=.8}
      else if(e.t==='drop'){a.burst(e.x,e.y,'#f3c56a',4);sad=.6}
      else if(e.t==='sweep'){a.beep(110,.3,'sawtooth');a.shake(6)}
      else if(e.t==='refill'){a.pop(e.x,e.y-20,ko?'부스러기 추가!':'More crumbs!','#fff3a0');a.burst(e.x,e.y,'#f0c070',8)}}
    S.ev.length=0;
    if(S.del>=L.quota){
      var sb=Math.round(S.meter/4),clean=S.tang===0&&S.stolen===0&&S.lost===0,tot=30+sb+(clean?30:0);
      a.add(tot);a.sfx('win');a.burst(L.nest[0],L.nest[1]-20,'#ffd257',26);a.burst(L.nest[0],L.nest[1]-20,'#ff8fd0',14);
      bonusTxt=[(ko?'소풍 성공! +30':'Feast! +30'),(ko?'남은 향기 +':'Scent left +')+sb];
      if(clean)bonusTxt.push(ko?'한 마리도 안 놓침 +30':'No ant lost +30');
      time=Math.min(70,time+14);mode='clear';modeT=0;cheer=1.5;lp=null}}

  /* ----- 그리기 ----- */
  function drawAnt(g,o,red){
    var s=red?1.05:1,i,sw,tang=o.st===3;
    g.save();g.translate(o.x,o.y);g.rotate(o.a+(tang?Math.sin(o.lp*2)*.5:Math.sin(o.lp)*.08));g.scale(s,s);
    g.strokeStyle=red?'#7a1410':'#2a1a12';g.lineWidth=.9;g.beginPath();
    for(i=-1;i<=1;i++){sw=Math.sin(o.lp+i*2.1)*1.6;
      g.moveTo(i*1.6,0);g.lineTo(i*2.2+sw,-4.2);g.moveTo(i*1.6,0);g.lineTo(i*2.2-sw,4.2)}
    g.moveTo(4,-.6);g.lineTo(6.6,-2.6+Math.sin(o.lp*.7)*.6);g.moveTo(4,.6);g.lineTo(6.6,2.6-Math.sin(o.lp*.7)*.6);g.stroke();
    g.fillStyle=red?'#d8362a':'#3a2418';
    g.beginPath();g.ellipse(-3.6,0,3,2.2,0,0,7);g.fill();g.beginPath();g.arc(0,0,1.6,0,7);g.fill();g.beginPath();g.arc(3,0,1.9,0,7);g.fill();
    g.fillStyle=red?'rgba(255,190,170,.7)':'rgba(255,255,255,.28)';g.beginPath();g.ellipse(-4.2,-.8,1.4,.7,0,0,7);g.fill();
    g.restore();
    if(tang){g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=.8;g.beginPath();g.arc(o.x,o.y,5,0,7);g.moveTo(o.x-5,o.y-3);g.lineTo(o.x+5,o.y+3);g.moveTo(o.x-5,o.y+3);g.lineTo(o.x+5,o.y-3);g.stroke()}
    if(o.st===1||(tang&&o.prev===1)){var cx=o.x+Math.cos(o.a)*3,cy=o.y+Math.sin(o.a)*3-4-Math.abs(Math.sin(o.lp))*.8;
      g.fillStyle='rgba(60,40,10,.25)';g.beginPath();g.arc(cx+1,cy+4.5,2.6,0,7);g.fill();
      g.fillStyle='#f3c56a';g.beginPath();g.arc(cx,cy,3,0,7);g.fill();g.fillStyle='#fff0c0';g.beginPath();g.arc(cx-.9,cy-.9,1.2,0,7);g.fill()}}
  function drawFood(g,f,a){var i,x=f.x,y=f.y,b;
    if(f.gone)return;
    if(f.t==='crumb'){
      g.fillStyle='rgba(80,50,20,.2)';g.beginPath();g.ellipse(x+1,y+3,13,9,0,0,7);g.fill();
      for(i=0;i<f.n;i++){var an=hash(i*3.1+x)*6.283,rd=Math.sqrt(hash(i*7.7+y))*9;
        g.fillStyle=i%3?'#f3c56a':'#e2a84a';g.beginPath();g.arc(x+Math.cos(an)*rd,y+Math.sin(an)*rd*.8,2.6+hash(i)*1.2,0,7);g.fill();
        g.fillStyle='rgba(255,245,200,.7)';g.beginPath();g.arc(x+Math.cos(an)*rd-.8,y+Math.sin(an)*rd*.8-.8,1,0,7);g.fill()}
      if(f.n<=0){g.strokeStyle='rgba(150,110,60,.5)';g.setLineDash([2,3]);g.lineWidth=1;g.beginPath();g.arc(x,y,10,0,7);g.stroke();g.setLineDash([])}
      return}
    b=f.moving&&f.tang<=0?Math.sin(tG*14)*1:0;y+=b;
    g.fillStyle='rgba(60,40,20,.25)';g.beginPath();g.ellipse(x+2,f.y+f.r*.7,f.r*1.05,f.r*.5,0,0,7);g.fill();
    if(f.t==='sugar'){var s=f.r*.95;
      g.fillStyle='#dfe7f2';g.beginPath();g.moveTo(x-s,y-s*.3);g.lineTo(x,y+s*.25);g.lineTo(x,y+s*1.1);g.lineTo(x-s,y+s*.5);g.closePath();g.fill();
      g.fillStyle='#c6d2e3';g.beginPath();g.moveTo(x+s,y-s*.3);g.lineTo(x,y+s*.25);g.lineTo(x,y+s*1.1);g.lineTo(x+s,y+s*.5);g.closePath();g.fill();
      g.fillStyle='#ffffff';g.beginPath();g.moveTo(x,y-s*.85);g.lineTo(x+s,y-s*.3);g.lineTo(x,y+s*.25);g.lineTo(x-s,y-s*.3);g.closePath();g.fill();
      g.fillStyle='rgba(255,255,255,'+(.5+.5*Math.sin(tG*5+x))+')';g.fillRect(x-3,y-s*.45,2,2);g.fillRect(x+4,y-s*.2,1.5,1.5)}
    else{var gr=g.createRadialGradient(x-4,y-5,2,x,y,f.r+3);gr.addColorStop(0,'#ff8a8a');gr.addColorStop(.6,'#e8283c');gr.addColorStop(1,'#b3122a');
      g.fillStyle=gr;g.beginPath();g.moveTo(x,y+f.r+3);g.bezierCurveTo(x-f.r*1.5,y,x-f.r*1.1,y-f.r*1.1,x,y-f.r*.8);
      g.bezierCurveTo(x+f.r*1.1,y-f.r*1.1,x+f.r*1.5,y,x,y+f.r+3);g.fill();
      g.fillStyle='#ffe38a';for(i=0;i<9;i++)g.fillRect(x+(hash(i+2)-.5)*f.r*1.5,y-f.r*.5+hash(i+9)*f.r*1.2,1.4,2);
      g.fillStyle='#3fa34d';for(i=-2;i<=2;i++){g.beginPath();g.ellipse(x+i*4,y-f.r*.85,4.5,2.2,i*.5,0,7);g.fill()}}
    /* 필요한 개미 수 표시 */
    if(!f.moving){var n=f.need,w=n*7+8;g.fillStyle='rgba(40,25,15,.78)';rr(g,x-w/2,f.y-f.r-22,w,13,6.5);g.fill();
      for(i=0;i<n;i++){g.fillStyle=i<f.att?'#ffd257':'rgba(255,255,255,.28)';g.beginPath();g.arc(x-w/2+7.5+i*7,f.y-f.r-15.5,2.4,0,7);g.fill()}}
    if(f.tang>0){g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1;g.beginPath();g.arc(x,y,f.r+4,0,7);g.stroke()}}
  function drawQueen(g,a){
    var nx=L.nest[0],ny=L.nest[1],i,gr,bob=cheer>0?-Math.abs(Math.sin(tG*14))*7:Math.sin(tG*2)*1,hy=ny-10+bob,
        blink=(tG%3.4)<.12,worry=time<10&&mode==='play'||sad>0;
    g.fillStyle='rgba(60,35,15,.25)';g.beginPath();g.ellipse(nx+2,ny+9,34,13,0,0,7);g.fill();
    gr=g.createRadialGradient(nx-8,ny-6,3,nx,ny+2,34);gr.addColorStop(0,'#c99a66');gr.addColorStop(1,'#8a5c34');
    g.fillStyle=gr;g.beginPath();g.ellipse(nx,ny+4,32,17,0,0,7);g.fill();
    for(i=0;i<9;i++){g.fillStyle='rgba(90,55,25,.35)';g.beginPath();g.arc(nx+(hash(i+70)-.5)*52,ny+4+(hash(i+80)-.5)*22,1.5,0,7);g.fill()}
    g.fillStyle='#2e1a0e';g.beginPath();g.ellipse(nx,ny+2,13,8,0,0,7);g.fill();
    /* 여왕개미 */
    g.strokeStyle='#3a2418';g.lineWidth=1.6;g.lineCap='round';g.beginPath();
    g.moveTo(nx-4,hy-8);g.quadraticCurveTo(nx-9,hy-17,nx-12+Math.sin(tG*3)*1.5,hy-18);
    g.moveTo(nx+4,hy-8);g.quadraticCurveTo(nx+9,hy-17,nx+12+Math.sin(tG*3+1)*1.5,hy-18);g.stroke();
    if(cheer>0){g.beginPath();g.moveTo(nx-8,hy+2);g.lineTo(nx-15,hy-7);g.moveTo(nx+8,hy+2);g.lineTo(nx+15,hy-7);g.stroke()}
    gr=g.createRadialGradient(nx-3,hy-4,1,nx,hy,11);gr.addColorStop(0,'#8a5a3a');gr.addColorStop(1,'#4a2c1a');
    g.fillStyle=gr;g.beginPath();g.arc(nx,hy,10,0,7);g.fill();
    g.fillStyle='#ffcf3f';g.beginPath();g.moveTo(nx-6,hy-8);g.lineTo(nx-6,hy-14);g.lineTo(nx-3,hy-11);g.lineTo(nx,hy-15);g.lineTo(nx+3,hy-11);g.lineTo(nx+6,hy-14);g.lineTo(nx+6,hy-8);g.closePath();g.fill();
    g.fillStyle='#ff6a8a';g.beginPath();g.arc(nx,hy-10.5,1.2,0,7);g.fill();
    if(blink){g.strokeStyle='#1a0e08';g.lineWidth=1.4;g.beginPath();g.moveTo(nx-6,hy-1);g.lineTo(nx-2,hy-1);g.moveTo(nx+2,hy-1);g.lineTo(nx+6,hy-1);g.stroke()}
    else{g.fillStyle='#fff';g.beginPath();g.arc(nx-4,hy-1,3,0,7);g.arc(nx+4,hy-1,3,0,7);g.fill();
      var ex=0,ey=0;if(cur&&kbOn){ex=cur.x-nx;ey=cur.y-hy}else if(lp){ex=lp.x-nx;ey=lp.y-hy}else{ey=-1}
      var el=Math.hypot(ex,ey)||1;ex=ex/el*1.2;ey=ey/el*1.2;
      g.fillStyle='#1a0e08';g.beginPath();g.arc(nx-4+ex,hy-1+ey,1.5,0,7);g.arc(nx+4+ex,hy-1+ey,1.5,0,7);g.fill()}
    g.fillStyle='rgba(255,130,150,.55)';g.beginPath();g.arc(nx-7.5,hy+3,1.8,0,7);g.arc(nx+7.5,hy+3,1.8,0,7);g.fill();
    g.strokeStyle='#1a0e08';g.lineWidth=1.3;g.beginPath();
    if(cheer>0){g.fillStyle='#7a1e2a';g.arc(nx,hy+4,3,0,Math.PI);g.fill()}
    else if(worry){g.arc(nx,hy+7,2.6,Math.PI*1.15,Math.PI*1.85);g.stroke()}
    else{g.arc(nx,hy+3.5,2.6,.2,Math.PI-.2);g.stroke()}
    /* 쌓인 먹이 + 카운터 */
    for(i=0;i<pile.length&&i<24;i++){var px=nx+34+(i%4)*5-(Math.floor(i/4)%2)*2.5,py=ny+13-Math.floor(i/4)*4;
      g.fillStyle=pile[i]===2?'#e8283c':pile[i]===1?'#ffffff':'#f3c56a';g.beginPath();g.arc(px,py,2.7,0,7);g.fill();
      g.strokeStyle='rgba(90,60,20,.35)';g.lineWidth=.6;g.stroke()}
}
  function drawCount(g){var nx=L.nest[0],ny=L.nest[1];
    var done=S.del>=L.quota,txt=Math.min(S.del,L.quota)+'/'+L.quota;
    g.fillStyle=done?'#3fa34d':'rgba(40,25,15,.82)';rr(g,nx-84,ny-8,44,22,11);g.fill();g.strokeStyle='#ffd257';g.lineWidth=1.5;g.stroke();
    g.fillStyle='#fff';g.font='14px Jua, system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,nx-62,ny+4);g.textBaseline='alphabetic'}
  function drawRival(g){var z=L.rival;if(!z)return;
    g.strokeStyle='rgba(216,54,42,'+(.35+.12*Math.sin(tG*3))+')';g.lineWidth=1.5;g.setLineDash([5,5]);g.lineDashOffset=-tG*8;
    g.beginPath();g.arc(z.x,z.y,z.r,0,7);g.stroke();g.setLineDash([]);g.lineDashOffset=0;
    g.fillStyle='rgba(216,54,42,.07)';g.beginPath();g.arc(z.x,z.y,z.r,0,7);g.fill();
    g.fillStyle='rgba(60,20,10,.25)';g.beginPath();g.ellipse(z.x+2,z.y+7,22,9,0,0,7);g.fill();
    var gr=g.createRadialGradient(z.x-5,z.y-4,2,z.x,z.y,22);gr.addColorStop(0,'#d98a6a');gr.addColorStop(1,'#9a4030');
    g.fillStyle=gr;g.beginPath();g.ellipse(z.x,z.y+2,21,12,0,0,7);g.fill();
    g.fillStyle='#3a1208';g.beginPath();g.ellipse(z.x,z.y+1,8,5,0,0,7);g.fill();
    g.fillStyle='#ffe9a0';g.beginPath();g.arc(z.x-3,z.y,1.5,0,7);g.arc(z.x+3,z.y,1.5,0,7);g.fill();
    for(var i=0;i<Math.min(S.stolen,10);i++){g.fillStyle='#f3c56a';g.beginPath();g.arc(z.x+16+(i%3)*4,z.y+8-Math.floor(i/3)*4,2.2,0,7);g.fill()}}
  function drawWeb(g,z,k){var i,j,gl=webGlow[k]||0,near=0,o;
    for(i=0;i<S.ants.length;i++){o=S.ants[i];if(!o.red&&Math.hypot(o.x-z.x,o.y-z.y)<z.r+26){near=1;break}}
    gl=Math.max(gl,near*(.5+.3*Math.sin(tG*8)));if(webGlow[k]>0)webGlow[k]-=.02;
    g.fillStyle='rgba(255,90,120,'+(gl*.16)+')';g.beginPath();g.arc(z.x,z.y,z.r,0,7);g.fill();
    g.fillStyle='rgba(235,235,250,.35)';g.beginPath();g.arc(z.x,z.y,z.r,0,7);g.fill();
    g.strokeStyle='rgba('+(gl>.1?'230,60,100':'95,95,140')+','+(.7+gl*.3)+')';g.lineWidth=1;g.beginPath();
    for(i=0;i<8;i++){g.moveTo(z.x,z.y);g.lineTo(z.x+Math.cos(i*.785+.2)*z.r,z.y+Math.sin(i*.785+.2)*z.r)}
    for(j=1;j<=4;j++)for(i=0;i<8;i++){var r=z.r*j/4,a0=i*.785+.2,a1=a0+.785;
      g.moveTo(z.x+Math.cos(a0)*r,z.y+Math.sin(a0)*r);g.quadraticCurveTo(z.x+Math.cos(a0+.39)*r*.82,z.y+Math.sin(a0+.39)*r*.82,z.x+Math.cos(a1)*r,z.y+Math.sin(a1)*r)}
    g.stroke();
    
    /* 거미 */
    var sy=z.y+Math.sin(tG*2+k)*1.5;g.strokeStyle='#3b2a55';g.lineWidth=1.6;g.beginPath();
    for(i=0;i<4;i++){var la=-.9+i*.6+Math.sin(tG*3+i)*.08;
      g.moveTo(z.x,sy);g.quadraticCurveTo(z.x+Math.cos(la)*10,sy+Math.sin(la)*10-4,z.x+Math.cos(la)*15,sy+Math.sin(la)*15);
      g.moveTo(z.x,sy);g.quadraticCurveTo(z.x-Math.cos(la)*10,sy+Math.sin(la)*10-4,z.x-Math.cos(la)*15,sy+Math.sin(la)*15)}
    g.stroke();
    g.fillStyle='#4b3670';g.beginPath();g.arc(z.x,sy,7.5,0,7);g.fill();g.fillStyle='#6a51a0';g.beginPath();g.arc(z.x-2,sy-2.5,3,0,7);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(z.x-2.8,sy+1,2.2,0,7);g.arc(z.x+2.8,sy+1,2.2,0,7);g.fill();
    g.fillStyle='#1a1028';g.beginPath();g.arc(z.x-2.8,sy+1.4,1,0,7);g.arc(z.x+2.8,sy+1.4,1,0,7);g.fill()}
  function drawSweep(g){var z=L.sweep,i;if(!z)return;
    g.strokeStyle='rgba(120,90,60,.35)';g.lineWidth=1.2;g.setLineDash([3,5]);rr(g,z.x,z.y,z.w,z.h,6);g.stroke();g.setLineDash([]);
    for(i=0;i<6;i++){g.strokeStyle='rgba(120,90,60,.16)';g.beginPath();g.moveTo(z.x+8,z.y+8+i*(z.h-16)/5);g.lineTo(z.x+z.w-8,z.y+8+i*(z.h-16)/5);g.stroke()}
    if(S.warn>0){var fl=.5+.5*Math.sin(tG*(8+S.warn*14));
      g.fillStyle='rgba(30,20,40,'+(.12+.2*S.warn*fl)+')';rr(g,z.x,z.y,z.w,z.h,6);g.fill();
      g.fillStyle='rgba(255,210,60,'+(.6+.4*fl)+')';g.font='22px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('!',z.x+z.w/2,z.y+z.h/2+8);
      g.fillStyle='rgba(255,210,60,.9)';g.fillRect(z.x,z.y+z.h-3,z.w*S.warn,3)}
    if(S.bx>=0){var bx=S.bx;g.fillStyle='rgba(30,20,10,.25)';g.fillRect(bx-14,z.y+4,22,z.h);
      g.fillStyle='#d9a441';g.fillRect(bx-9,z.y-2,12,z.h+4);g.strokeStyle='#a87424';g.lineWidth=1;
      for(i=0;i<z.h;i+=4){g.beginPath();g.moveTo(bx-9,z.y+i);g.lineTo(bx-17,z.y+i+2);g.stroke()}
      g.fillStyle='#8a5a2a';g.fillRect(bx+3,z.y+z.h/2-3,60,6);
      g.fillStyle='rgba(255,255,255,.5)';for(i=0;i<5;i++){g.beginPath();g.arc(bx-20-hash(i+tG|0)*14,z.y+hash(i*3+1)*z.h,2+hash(i)*2,0,7);g.fill()}}}

  function draw(g,a){
    var ko=a.lang==='ko',i,o,d,v,k,z;
    if(!bg)buildBg();
    g.drawImage(bg,0,0);
    if(!S)return;
    /* 물결 */
    for(i=0;i<L.slow.length;i++){z=L.slow[i];if(z.k!=='puddle')continue;k=(tG*.4+i*.3)%1;
      g.strokeStyle='rgba(255,255,255,'+(.5*(1-k))+')';g.lineWidth=1.2;g.beginPath();g.ellipse(z.x+z.r*.15,z.y+z.r*.1,z.r*.7*k,z.r*.5*k,0,0,7);g.stroke()}
    drawSweep(g);
    drawRival(g);
    /* 페로몬 리본 */
    d=phI.data;var ph=S.ph,any=false;
    for(i=0;i<ph.length;i++){v=ph[i];k=i*4;
      if(v>0){any=true;d[k]=175+80*v;d[k+1]=30+170*v*v;d[k+2]=235+20*v;d[k+3]=Math.min(255,v*460)}else d[k+3]=0}
    phG.putImageData(phI,0,0);
    if(any){g.imageSmoothingEnabled=true;g.globalAlpha=.95;g.drawImage(phC,0,0,W,H);
      g.globalCompositeOperation='lighter';g.globalAlpha=.35+.08*Math.sin(tG*5);g.drawImage(phC,0,0,W,H);g.globalCompositeOperation='source-over';g.globalAlpha=1}
    for(i=0;i<5&&motes.length<46;i++){k=Math.floor(Math.random()*ph.length);
      if(ph[k]>.15)motes.push({x:(k%GW+.5)*CS,y:(Math.floor(k/GW)+.5)*CS,t:0,s:ph[k],p:Math.random()*6})}
    for(i=motes.length-1;i>=0;i--){o=motes[i];o.t+=.016;if(o.t>1.1){motes.splice(i,1);continue}
      o.y-=.35;o.x+=Math.sin(o.p+o.t*5)*.3+(L.wind?1.1:0);
      g.fillStyle='rgba(255,220,255,'+(o.s*(1-o.t/1.1)*.9)+')';g.beginPath();g.arc(o.x,o.y,1.2+o.s,0,7);g.fill()}
    /* 1단계 힌트: 둥지에서 먹이까지 점선 */
    if(lvN===0&&!painted&&mode==='play'){var f0=S.foods[0],hx,hy;k=(tG*.5)%1;
      g.strokeStyle='rgba(150,80,255,.55)';g.lineWidth=3;g.setLineDash([3,7]);g.lineCap='round';g.beginPath();g.moveTo(L.nest[0],L.nest[1]-22);g.lineTo(f0.x,f0.y+12);g.stroke();g.setLineDash([]);
      hx=L.nest[0]+(f0.x-L.nest[0])*k;hy=L.nest[1]-22+(f0.y+12-L.nest[1]+22)*k;
      g.fillStyle='rgba(255,255,255,.95)';g.strokeStyle='#7a4ad0';g.lineWidth=2;g.beginPath();g.arc(hx,hy,8,0,7);g.fill();g.stroke();
      g.fillStyle='#7a4ad0';g.beginPath();g.arc(hx,hy,3,0,7);g.fill()}
    for(i=0;i<L.spiders.length;i++)drawWeb(g,L.spiders[i],i);
    for(i=0;i<S.foods.length;i++)drawFood(g,S.foods[i],a);
    drawQueen(g,a);
    for(i=0;i<S.ants.length;i++){o=S.ants[i];if(S.t>=o.born)drawAnt(g,o,o.red)}
    drawCount(g);
    for(i=eraseFx.length-1;i>=0;i--){o=eraseFx[i];o.t+=.016;if(o.t>.4){eraseFx.splice(i,1);continue}
      g.strokeStyle='rgba(255,255,255,'+(1-o.t/.4)+')';g.lineWidth=3;g.beginPath();g.arc(o.x,o.y,o.r*(.4+o.t*1.5),0,7);g.stroke()}
    /* 나뭇잎 그림자(움직이는 층 1) */
    g.fillStyle='rgba(30,90,60,.07)';
    for(i=0;i<leaves.length;i++){o=leaves[i];var lx=o.x+Math.sin(tG*o.v+o.p)*22,ly=o.y+Math.cos(tG*o.v*.8+o.p)*14,j2;
      for(j2=0;j2<3;j2++){g.save();g.translate(lx+j2*o.r*.45,ly+j2*o.r*.2);g.rotate(o.p+j2*1.3+Math.sin(tG*o.v+j2)*.25);
        g.beginPath();g.moveTo(-o.r*.7,0);g.quadraticCurveTo(0,-o.r*.42,o.r*.7,0);g.quadraticCurveTo(0,o.r*.42,-o.r*.7,0);g.fill();g.restore()}}
    if(L.wind){g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1.5;g.lineCap='round';
      for(i=0;i<5;i++){var wx=((tG*120+i*97)%460)-50,wy=110+i*104+Math.sin(tG+i)*10;g.beginPath();g.moveTo(wx,wy);g.quadraticCurveTo(wx+18,wy-5,wx+36,wy);g.stroke()}}
    /* 풀잎(움직이는 층 2) */
    for(i=0;i<34;i++){var side=i%2,gy=62+i*17+hash(i)*8,sw=Math.sin(tG*1.6+i*.9)*3,bx=side?W:0,dir=side?-1:1,len=9+hash(i+50)*7;
      g.fillStyle=i%3?'#4a9a50':'#6cbb5e';g.beginPath();g.moveTo(bx,gy-4);g.quadraticCurveTo(bx+dir*len*.5,gy-2+sw*.5,bx+dir*len,gy+sw);g.quadraticCurveTo(bx+dir*len*.5,gy+3+sw*.5,bx,gy+4);g.fill()}
    /* HUD */
    g.fillStyle='rgba(30,60,35,.55)';rr(g,8,33,W-16,24,12);g.fill();
    g.font='14px Jua, system-ui, sans-serif';g.textAlign='left';g.fillStyle='#fff';g.fillText((ko?'소풍 ':'Picnic ')+(lvN+1),18,50);
    var tx=92,tw=118,tr=Math.max(0,time/70);
    g.fillStyle='rgba(0,0,0,.3)';rr(g,tx,40,tw,10,5);g.fill();
    if(tr>0){g.fillStyle=time<10?(Math.sin(tG*12)>0?'#ff6a5a':'#ffb0a0'):'#ffd257';rr(g,tx,40,Math.max(10,tw*tr),10,5);g.fill()}
    g.fillStyle='#fff';g.font='12px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(Math.ceil(time)+'',tx+tw+14,50);
    var mx=250,mw=92,mr=S.meter/100;
    g.fillStyle='#c98bff';g.beginPath();g.moveTo(mx-9,38);g.quadraticCurveTo(mx-15,47,mx-9,51);g.quadraticCurveTo(mx-3,47,mx-9,38);g.fill();
    g.fillStyle=flash>0?'rgba(255,60,60,.7)':'rgba(0,0,0,.3)';rr(g,mx,40,mw,10,5);g.fill();
    if(mr>.02){var mg=g.createLinearGradient(mx,0,mx+mw,0);mg.addColorStop(0,'#9a5cff');mg.addColorStop(1,'#ff9df0');g.fillStyle=mg;rr(g,mx,40,Math.max(10,mw*mr),10,5);g.fill()}
    /* 안내 문구 */
    if(L.tip&&mode==='play'&&S.t<(lvN===0&&!painted?999:5)){var tip=L.tip[a.lang],al=lvN===0&&!painted?1:Math.min(1,(5-S.t)*2);
      g.globalAlpha=al;g.font='17px Jua, system-ui, sans-serif';g.textAlign='center';var w=g.measureText(tip).width+26;
      g.fillStyle='rgba(40,25,15,.78)';rr(g,W/2-w/2,76,w,28,14);g.fill();g.fillStyle='#fff';g.fillText(tip,W/2,96);g.globalAlpha=1}
    if(mode==='clear'&&bonusTxt){g.textAlign='center';
      for(i=0;i<bonusTxt.length;i++){k=Math.min(1,Math.max(0,(modeT-i*.18)*5));if(k<=0)continue;g.globalAlpha=k;
        g.font=(i?17:26)+'px Jua, system-ui, sans-serif';var w2=g.measureText(bonusTxt[i]).width+28,yy=250+i*36-(1-k)*-10;
        g.fillStyle=i?'rgba(40,25,15,.8)':'rgba(120,60,220,.9)';rr(g,W/2-w2/2,yy-(i?20:27),w2,i?28:38,14);g.fill();
        g.fillStyle=i?'#ffe9a0':'#fff';g.fillText(bonusTxt[i],W/2,yy)}g.globalAlpha=1}
    /* 키보드 붓 커서 */
    if(kbOn&&mode==='play'){g.strokeStyle=keys.sh?'#ff6a5a':keys.sp?'#b06aff':'rgba(60,30,90,.8)';g.lineWidth=2;g.beginPath();g.arc(cur.x,cur.y,keys.sh?16:9,0,7);g.stroke();
      g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(cur.x,cur.y,2.5,0,7);g.fill()}
  }

  SG.run({id:'ant-trail',title:{ko:'개미 냄새길',en:'Ant Trail'},
    how:{ko:'개미는 직접 못 움직여요. 손가락으로 냄새 길을 그리면 개미들이 따라가서 먹이를 날라 옵니다. 두 번 탭하면 길이 지워져요. (키보드: 방향키로 붓 이동, 스페이스로 칠하기, Shift로 지우기)',
         en:'You can\'t steer the ants. Drag to paint a scent trail and the colony follows it to haul food home. Double-tap wipes a trail. (Keyboard: arrows move the brush, hold Space to paint, Shift to erase)'},
    init:init,update:update,draw:draw});
})();
