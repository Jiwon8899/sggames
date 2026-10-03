/* 쭈욱 고양이 (Long Cat) — 뒷발은 방석에 붙이고 머리만 끌면 몸이 고무줄처럼 늘어난다.
   몸은 팽팽한 줄이라 기둥에 감긴다. 감는 순서와 방향으로 모든 간식을 몸으로 덮고 베개에 눕는다.
   팽팽한 줄(taut string) 로직과 레벨·솔버는 DOM 없이 돌도록 분리했다(node 검증용 module.exports). */
(function(){
  'use strict';
  var W=360,H=640,TAU=Math.PI*2,PR=17,BW=8.5,TREAT=15,HGAP=2,STEP=3,PILLOW=24,DOGPAD=6,
      FX0=16,FX1=344,FY0=112,FY1=624,NOTCH=4;

  /* ================= 코어: 팽팽한 줄 ================= */
  function hyp(x,y){return Math.sqrt(x*x+y*y)}
  function dSeg(px,py,ax,ay,bx,by){var dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l>0?((px-ax)*dx+(py-ay)*dy)/l:0;
    t=t<0?0:t>1?1:t;return hyp(ax+dx*t-px,ay+dy*t-py)}
  function segX(ax,ay,bx,by,cx,cy,dx,dy){var e=1e-6,
      d1=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax),d2=(bx-ax)*(dy-ay)-(by-ay)*(dx-ax),
      d3=(dx-cx)*(ay-cy)-(dy-cy)*(ax-cx),d4=(dx-cx)*(by-cy)-(dy-cy)*(bx-cx);
    return((d1>e&&d2<-e)||(d1<-e&&d2>e))&&((d3>e&&d4<-e)||(d3<-e&&d4>e))}
  function dPoly(px,py,o){var m=1e9,i,d;for(i=0;i+3<o.length;i+=2){d=dSeg(px,py,o[i],o[i+1],o[i+2],o[i+3]);if(d<m)m=d}return m}

  /* 노드 = 앵커(반지름 0) · 감긴 기둥들(부호 있는 반지름) · 머리(반지름 0). 이웃 노드 사이는 공통 접선. */
  function geom(S,pad){
    var w=S.wraps,n=w.length,P=S.L.pegs,segs=[],len=0,i,A,B;pad=pad||0;
    function nd(i){if(i===0)return[S.ax,S.ay,0];if(i===n+1)return[S.hx,S.hy,0];var p=P[w[i-1].p];return[p.x,p.y,w[i-1].s*(p.r+pad)]}
    A=nd(0);
    for(i=0;i<=n;i++){B=nd(i+1);var dx=B[0]-A[0],dy=B[1]-A[1],d=Math.sqrt(dx*dx+dy*dy)||1e-9,k=B[2]-A[2],
        l=Math.sqrt(Math.max(1e-9,d*d-k*k)),ex=dx/d,ey=dy/d,ux=(l*ex+k*ey)/d,uy=(l*ey-k*ex)/d;
      segs.push({x1:A[0]+A[2]*uy,y1:A[1]-A[2]*ux,x2:B[0]+B[2]*uy,y2:B[1]-B[2]*ux,ux:ux,uy:uy,l:l});len+=l;A=B}
    for(i=0;i<n;i++){var p=P[w[i].p],a0=Math.atan2(segs[i].y2-p.y,segs[i].x2-p.x),a1=Math.atan2(segs[i+1].y1-p.y,segs[i+1].x1-p.x),
        m=w[i].s*(a1-a0);m-=TAU*Math.floor(m/TAU);var th=m+TAU*Math.round((w[i].th-m)/TAU);
      w[i].th=th;w[i].a0=a0;len+=(p.r+pad)*Math.max(0,th)}
    S.segs=segs;S.len=len}
  function poly(S,pad){var o=[],w=S.wraps,sg=S.segs,i,j;pad=pad||0;o.push(sg[0].x1,sg[0].y1);
    for(i=0;i<sg.length;i++){o.push(sg[i].x2,sg[i].y2);
      if(i<w.length){var p=S.L.pegs[w[i].p],th=w[i].th,m=Math.max(1,Math.ceil(th/.22)),r=p.r+pad;
        for(j=1;j<=m;j++){var a=w[i].a0+w[i].s*th*j/m;o.push(p.x+r*Math.cos(a),p.y+r*Math.sin(a))}}}
    return o}
  /* 감기/풀기: 호 각도가 음수가 되면 풀고, 직선 구간이 다른 기둥을 파고들면 그 기둥을 올바른 쪽으로 감는다 */
  function settle(S){
    var w=S.wraps,P=S.L.pegs,it,i,j;
    for(it=0;it<24;it++){
      geom(S);var rm=-1;
      for(i=w.length-1;i>=0;i--)if(w[i].th<-1e-7){rm=i;break}
      if(rm>=0){w.splice(rm,1);continue}
      var bi=-1,bj=-1,bt=2;
      for(i=0;i<S.segs.length&&bi<0;i++){var s=S.segs[i],pa=i>0?w[i-1].p:-1,pb=i<w.length?w[i].p:-1;
        for(j=0;j<P.length;j++){if(j===pa||j===pb)continue;var p=P[j];
          if(dSeg(p.x,p.y,s.x1,s.y1,s.x2,s.y2)<p.r-1e-4){var t=((p.x-s.x1)*s.ux+(p.y-s.y1)*s.uy);if(bi<0||t<bt){bi=i;bj=j;bt=t}}}}
      if(bi>=0){var q=S.segs[bi],c=P[bj];
        w.splice(bi,0,{p:bj,s:(q.ux*(c.y-q.y1)-q.uy*(c.x-q.x1))>0?1:-1,th:0,a0:0});continue}
      break}
    S.poly=poly(S)}
  function violate(S){
    var L=S.L,o=S.poly,sg=S.segs,i,j,k;
    if(S.free)return null;
    if(S.len>S.max)return'len';
    for(i=0;i<S.wraps.length;i++)if(S.wraps[i].th>TAU-.1)return'self';
    for(i=0;i<sg.length;i++)for(j=i+1;j<sg.length;j++)if(segX(sg[i].x1,sg[i].y1,sg[i].x2,sg[i].y2,sg[j].x1,sg[j].y1,sg[j].x2,sg[j].y2))return'self';
    for(k=0;k<L.gates.length;k++){var G=L.gates[k],A=L.pegs[G.a],B=L.pegs[G.b];
      for(i=0;i+3<o.length;i+=2)if(segX(o[i],o[i+1],o[i+2],o[i+3],A.x,A.y,B.x,B.y)&&(o[i+2]-o[i])*G.nx+(o[i+3]-o[i+1])*G.ny<0)return'gate'}
    if(L.cat2){var c=L.cat2;if(dPoly(S.hx,S.hy,c)<12)return'cat';
      for(k=0;k+3<c.length;k+=2)for(i=0;i+3<o.length;i+=2)if(segX(o[i],o[i+1],o[i+2],o[i+3],c[k],c[k+1],c[k+2],c[k+3]))return'cat'}
    return null}
  function hazard(S){var L=S.L,i;
    for(i=0;i<S.wraps.length;i++)if(L.pegs[S.wraps[i].p].k==='cactus')return'cactus';
    for(i=0;i<L.dogs.length;i++)if(dPoly(L.dogs[i].x,L.dogs[i].y,S.poly)<L.dogs[i].r+DOGPAD){S.dog=i;return'dog'}
    return null}
  /* 한 걸음: 규칙을 어기면 원래대로 되돌리고 이유를 돌려준다 */
  function step(S,nx,ny){
    var P=S.L.pegs,sv={hx:S.hx,hy:S.hy,w:S.wraps.map(function(q){return{p:q.p,s:q.s,th:q.th,a0:q.a0}}),segs:S.segs,len:S.len,poly:S.poly},i,k,prick=false;
    nx=nx<FX0?FX0:nx>FX1?FX1:nx;ny=ny<FY0?FY0:ny>FY1?FY1:ny;
    for(k=0;k<2;k++)for(i=0;i<P.length;i++){var dx=nx-P[i].x,dy=ny-P[i].y,d=hyp(dx,dy),m=P[i].r+HGAP;
      if(d<m){if(d<1e-6){dx=0;dy=-1;d=1}nx=P[i].x+dx/d*m;ny=P[i].y+dy/d*m;if(P[i].k==='cactus'&&!S.free)prick=true}}
    S.hx=nx;S.hy=ny;settle(S);
    var v=violate(S);
    if(v){S.hx=sv.hx;S.hy=sv.hy;S.wraps=sv.w;S.segs=sv.segs;S.len=sv.len;S.poly=sv.poly;return{v:v,sv:null}}
    if(!S.free){S.hit=prick?'cactus':hazard(S)}
    return{v:null,sv:sv}}
  function undo(S,sv){S.hx=sv.hx;S.hy=sv.hy;S.wraps=sv.w;S.segs=sv.segs;S.len=sv.len;S.poly=sv.poly;S.hit=null}
  /* 머리를 목표로 조금씩 옮긴다. 막히면 비스듬히 미끄러진다. 막힌 이유(또는 null)를 돌려준다. */
  function moveHead(S,tx,ty){
    var guard=700,blocked=null,ANG=[.7,-.7,1.3,-1.3];
    while(guard-->0&&!S.hit){
      var dx=tx-S.hx,dy=ty-S.hy,d=hyp(dx,dy);if(d<.05)break;
      var st=Math.min(STEP,d),ux=dx/d,uy=dy/d,r=step(S,S.hx+ux*st,S.hy+uy*st);
      if(!r.v){if(S.hit)break;if(hyp(tx-S.hx,ty-S.hy)<d-.02)continue;undo(S,r.sv)}else blocked=r.v;
      var ok=false,a;
      for(a=0;a<4&&!ok;a++){var c=Math.cos(ANG[a]),s=Math.sin(ANG[a]);r=step(S,S.hx+(ux*c-uy*s)*st,S.hy+(ux*s+uy*c)*st);
        if(!r.v){if(S.hit||hyp(tx-S.hx,ty-S.hy)<d-.02)ok=true;else undo(S,r.sv)}}
      if(!ok)break}
    return blocked}
  function restPos(L){var dx=L.px-L.ax,dy=L.py-L.ay,d=hyp(dx,dy)||1;return[L.ax+dx/d*22,L.ay+dy/d*22]}
  function makeSim(L,free){var r=restPos(L),S={L:L,ax:L.ax,ay:L.ay,hx:r[0],hy:r[1],wraps:[],max:free?1e9:L.max,free:!!free,hit:null,dog:-1};settle(S);return S}
  function covered(S){return S.L.treats.map(function(t){return dPoly(t[0],t[1],S.poly)<=TREAT})}
  function atPillow(S){return hyp(S.hx-S.L.px,S.hy-S.L.py)<.6}
  function win(S){return!S.hit&&atPillow(S)&&covered(S).every(function(c){return c})}
  function sig(S){return S.wraps.map(function(q){return q.p+(q.s>0?'+':'-')}).join(' ')}
  function runPath(L,pts,free){var S=makeSim(L,free),i;
    for(i=0;i<pts.length&&!S.hit;i++)moveHead(S,pts[i][0],pts[i][1]);
    if(!S.hit)moveHead(S,L.px,L.py);return S}

  /* ================= 레벨 ================= */
  function setRail(p,t){p.t=t;p.x=p.rail[0]+(p.rail[2]-p.rail[0])*t;p.y=p.rail[1]+(p.rail[3]-p.rail[1])*t}
  function mkLevel(d){
    var L={ax:d.a[0],ay:d.a[1],px:d.p[0],py:d.p[1],pegs:[],treats:[],max:1e9,dogs:[],gates:[],cat2:d.cat2||null,tip:d.tip||null,mv:-1};
    d.pegs.forEach(function(q,i){var p={x:q[0],y:q[1],r:PR,k:q[2]||'post'};if(p.k==='move'){p.rail=q[3];setRail(p,0);L.mv=i}L.pegs.push(p)});
    (d.dogs||[]).forEach(function(q){L.dogs.push({x:q[0],y:q[1],r:q[2]||36})});
    (d.gates||[]).forEach(function(q){var A=L.pegs[q[0]],B=L.pegs[q[1]],ex=B.x-A.x,ey=B.y-A.y,l=hyp(ex,ey),nx=-ey/l,ny=ex/l,sg=nx*q[2]+ny*q[3]<0?-1:1;
      L.gates.push({a:q[0],b:q[1],nx:nx*sg,ny:ny*sg})});
    return L}
  /* via(머리가 지나갈 길)로 의도한 풀이를 실제로 당겨 보고, 그 몸 위에 간식을 놓고 늘어나는 한계를 정한다 */
  function bake(d){
    var L=mkLevel(d),hz={dogs:L.dogs,gates:L.gates,cat2:L.cat2};
    if(L.mv>=0)setRail(L.pegs[L.mv],d.mv);
    var S=runPath(L,d.via||[],true),ts=[];
    (d.tf||[]).forEach(function(q){var s=S.segs[q[0]];if(s)ts.push([Math.round(s.x1+(s.x2-s.x1)*q[1]),Math.round(s.y1+(s.y2-s.y1)*q[1])])});
    (d.treats||[]).forEach(function(q){ts.push([q[0],q[1]])});
    L.treats=ts;L.solLen=S.len;L.solSig=sig(S);L.max=d.max||Math.round(S.len*(1+(d.slack||.08)));
    if(L.mv>=0)setRail(L.pegs[L.mv],0);
    return L}

  var DEFS=[
    {a:[180,190],p:[180,540],pegs:[[70,330],[290,410]],tf:[[0,.5]],slack:.3,
      tip:{ko:'머리를 끌어 베개까지! 몸으로 간식을 덮어요',en:'Drag the head to the pillow — cover the fish!'}},
    {a:[84,190],p:[280,540],pegs:[[116,430]],via:[[82,440]],tf:[[0,.45],[1,.5]],slack:.12,
      tip:{ko:'기둥에 몸을 감아요',en:'Wrap around the post'}},
    {a:[180,180],p:[180,572],pegs:[[130,300],[230,440]],via:[[96,300],[180,370],[264,440]],tf:[[0,.6],[1,.28],[2,.4]],slack:.1,
      tip:{ko:'어느 쪽으로 감을까요?',en:'Which side do you wrap?'}},
    {a:[70,200],p:[280,570],pegs:[[250,290],[110,450]],via:[[250,250],[290,290],[110,410],[70,450]],treats:[[268,272],[92,468]],slack:.05,
      tip:{ko:'몸 길이엔 한계가 있어요. 짧은 길로!',en:'Even a long cat has a limit. Find the short way!'}},
    {a:[180,180],p:[180,580],pegs:[[180,372,'cactus'],[250,400],[96,330]],via:[[286,400]],tf:[[0,.5],[1,.5]],slack:.1,
      tip:{ko:'선인장은 따가워요!',en:'Cacti are prickly!'}},
    {a:[60,200],p:[300,560],pegs:[[100,470],[270,270]],dogs:[[186,372,38]],via:[[66,496]],tf:[[0,.5],[1,.5]],slack:.1,
      tip:{ko:'잠자는 멍멍이를 깨우지 마요',en:"Don't wake the sleeping dog"}},
    {a:[60,180],p:[180,236],pegs:[[120,360,'gate'],[240,360,'gate'],[180,500]],gates:[[0,1,0,-1]],
      via:[[86,360],[146,500],[180,536],[216,500]],tf:[[1,.5],[2,.25]],treats:[[180,522]],slack:.07,
      tip:{ko:'문은 화살표 방향으로만 지나가요',en:'Gates only open the way the arrows point'}},
    {a:[180,190],p:[180,584],pegs:[[70,384,'move',[70,384,290,384]]],mv:.75,via:[[270,384]],tf:[[0,.4],[0,.75],[1,.5]],slack:.08,
      tip:{ko:'파란 기둥은 끌어서 옮겨요 (키보드 Q/E)',en:'Drag the blue post to move it (keys Q/E)'}},
    {a:[90,190],p:[90,570],pegs:[[296,372],[196,250]],cat2:[46,412,146,400,250,386],via:[[330,372]],tf:[[0,.55],[1,.45]],slack:.08,
      tip:{ko:'자는 친구를 넘어가면 안 돼요',en:"Don't cross the sleeping friend"}},
    {a:[60,180],p:[296,560],pegs:[[256,250],[104,400],[150,290,'cactus'],[200,440,'cactus'],[280,420]],
      via:[[256,214],[292,250],[104,364],[68,400],[104,436]],tf:[[0,.55],[1,.5],[2,.4]],slack:.06},
    {a:[300,180],p:[180,246],pegs:[[130,380,'gate'],[230,380,'gate'],[180,520],[296,460]],gates:[[0,1,0,-1]],dogs:[[84,470,34]],
      via:[[334,460],[296,498],[180,556],[146,520]],tf:[[0,.5],[1,.5],[2,.3]],slack:.07},
    {a:[60,190],p:[300,580],pegs:[[60,330,'move',[60,330,300,330]],[110,470],[240,440,'cactus'],[190,250,'cactus']],
      cat2:[46,592,126,586,206,572],dogs:[[300,420,32]],mv:.25,
      via:[[156,330],[76,470],[110,506]],tf:[[0,.55],[1,.5]],treats:[[100,492]],slack:.06}
  ];

  function rng(s){s=s>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var t=Math.imul(s^s>>>15,1|s);t=(t+Math.imul(t^t>>>7,61|t))^t;return((t^t>>>14)>>>0)/4294967296}}
  /* 후보 풀이(기둥·방향의 나열)를 살짝 부풀린 반지름으로 그려 머리가 따라갈 길을 만든다 */
  function candPath(L,seq){
    var T={L:L,ax:L.ax,ay:L.ay,hx:L.px,hy:L.py,wraps:seq.map(function(q){return{p:q[0],s:q[1],th:Math.PI/2,a0:0}})},i,j;
    geom(T,3.5);
    for(i=0;i<T.wraps.length;i++)if(T.wraps[i].th<.03)return null;
    for(i=0;i<T.segs.length;i++){var s=T.segs[i],pa=i>0?seq[i-1][0]:-1,pb=i<seq.length?seq[i][0]:-1;
      for(j=0;j<L.pegs.length;j++)if(j!==pa&&j!==pb&&dSeg(L.pegs[j].x,L.pegs[j].y,s.x1,s.y1,s.x2,s.y2)<PR+1)return null}
    var o=poly(T,3.5),pts=[];for(i=2;i<o.length-2;i+=2)pts.push([o[i],o[i+1]]);
    T.pts=pts;return T}
  /* 솔버: 기둥의 순서와 감는 방향(그리고 움직이는 기둥의 위치)을 전부 뒤져, 실제로 당겨서 성공하는 풀이를 모은다 */
  function solve(L,maxK,ignoreMax){
    var out=[],seen={},ids=[],i,keep=L.max,t0=L.mv>=0?L.pegs[L.mv].t:0,tv=L.mv>=0?[]:[0];
    for(i=0;i<L.pegs.length;i++)if(L.pegs[i].k!=='cactus')ids.push(i);
    if(L.mv>=0)for(i=0;i<=NOTCH;i++)tv.push(i/NOTCH);
    if(ignoreMax)L.max=1e9;
    tv.forEach(function(t){
      if(L.mv>=0)setRail(L.pegs[L.mv],t);
      (function rec(seq){
        var C=seq.length?candPath(L,seq):{pts:[]};
        if(C){var S=runPath(L,C.pts);if(win(S)){var key=t+'|'+sig(S);if(!seen[key]){seen[key]=1;out.push({t:t,sig:sig(S),len:S.len})}}}
        if(seq.length>=maxK)return;
        for(var a=0;a<ids.length;a++){if(seq.length&&seq[seq.length-1][0]===ids[a])continue;
          var used=false;for(var b=0;b<seq.length;b++)if(seq[b][0]===ids[a])used=true;if(used)continue;
          rec(seq.concat([[ids[a],1]]));rec(seq.concat([[ids[a],-1]]))}
      })([])});
    if(L.mv>=0)setRail(L.pegs[L.mv],t0);L.max=keep;
    out.sort(function(a,b){return a.len-b.len});return out}
  /* 절차 생성: 무작위 배치 → 무작위 감기 순서를 실제로 당겨 보고 → 그 몸 위에 간식 배치 → 직선 당기기로는 안 풀리는지 확인 */
  function gen(n){
    for(var att=0;att<600;att++){
      var r=rng(n*1000003+att*7919+5),i,j,ok;
      function rp(){return[Math.round(44+r()*272),Math.round(150+r()*430)]}
      function bad(q){return q[1]<140||(q[0]>286&&q[1]>566)}
      var a=rp(),p=rp();if(bad(a)||bad(p)||hyp(a[0]-p[0],a[1]-p[1])<230)continue;
      var np=3+Math.floor(r()*3)+(n>24?1:0),pegs=[],tries=0;
      while(pegs.length<np&&tries++<200){var q=rp();ok=hyp(q[0]-a[0],q[1]-a[1])>60&&hyp(q[0]-p[0],q[1]-p[1])>60&&!(q[0]>280&&q[1]>560);
        for(j=0;j<pegs.length&&ok;j++)if(hyp(q[0]-pegs[j][0],q[1]-pegs[j][1])<66)ok=false;if(ok)pegs.push(q)}
      if(pegs.length<np)continue;
      var k=n<16?(r()<.45?1:2):(r()<.55?2:3),idx=[],seq=[];
      for(i=0;i<np;i++)idx.push(i);
      for(i=0;i<k;i++){j=Math.floor(r()*idx.length);seq.push([idx.splice(j,1)[0],r()<.5?1:-1])}
      var L=mkLevel({a:a,p:p,pegs:pegs}),C=candPath(L,seq);if(!C)continue;
      ok=true;for(i=0;i<C.wraps.length;i++)if(C.wraps[i].th<.45||C.wraps[i].th>3.6)ok=false;if(!ok)continue;
      var S=runPath(L,C.pts);if(S.hit||!atPillow(S)||S.wraps.length!==k)continue;
      for(i=0;i<k;i++)if(S.wraps[i].p!==seq[i][0]||S.wraps[i].s!==seq[i][1])ok=false;if(!ok||S.len>880)continue;
      var ts=[];
      for(i=0;i<S.segs.length;i++){var s=S.segs[i];if(s.l<56)continue;var f=.3+r()*.4,t=[Math.round(s.x1+(s.x2-s.x1)*f),Math.round(s.y1+(s.y2-s.y1)*f)];
        ok=hyp(t[0]-a[0],t[1]-a[1])>40&&hyp(t[0]-p[0],t[1]-p[1])>46&&!bad(t);
        for(j=0;j<np&&ok;j++)if(hyp(t[0]-pegs[j][0],t[1]-pegs[j][1])<PR+16)ok=false;
        if(ok)ts.push(t)}
      if(ts.length<2)continue;
      var cp=n<14?0:.5;
      for(i=0;i<np;i++){var usedP=false;for(j=0;j<k;j++)if(seq[j][0]===i)usedP=true;
        if(!usedP&&r()<cp&&dPoly(pegs[i][0],pegs[i][1],S.poly)>PR+12)L.pegs[i].k='cactus'}
      if(n>=15&&r()<.55)for(tries=0;tries<30;tries++){var dq=rp();ok=dPoly(dq[0],dq[1],S.poly)>34+DOGPAD+16&&hyp(dq[0]-a[0],dq[1]-a[1])>70&&hyp(dq[0]-p[0],dq[1]-p[1])>70&&dq[1]>170&&!(dq[0]>260&&dq[1]>540);
        for(j=0;j<np&&ok;j++)if(hyp(dq[0]-pegs[j][0],dq[1]-pegs[j][1])<58)ok=false;
        if(ok){L.dogs.push({x:dq[0],y:dq[1],r:34});break}}
      L.treats=ts;L.solLen=S.len;L.solSig=sig(S);L.max=Math.round(S.len*(n<20?1.09:1.06));
      if(!win(runPath(L,C.pts))||win(runPath(L,[])))continue;
      return L}
    return bake(DEFS[n%DEFS.length])}
  function getLevel(i){return i<DEFS.length?bake(DEFS[i]):gen(i+1)}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={DEFS:DEFS,PR:PR,TREAT:TREAT,NOTCH:NOTCH,geom:geom,settle:settle,step:step,moveHead:moveHead,makeSim:makeSim,mkLevel:mkLevel,bake:bake,
      gen:gen,getLevel:getLevel,solve:solve,runPath:runPath,win:win,covered:covered,sig:sig,candPath:candPath,setRail:setRail,atPillow:atPillow};
  if(typeof SG==='undefined')return;

  /* ================= 게임 ================= */
  if(!window.__lcK){var K0=window.__lcK={L:0,R:0,U:0,D:0,sp:0,q:0,e:0},
      MAP={ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R',ArrowUp:'U',KeyW:'U',ArrowDown:'D',KeyS:'D'};
    window.addEventListener('keydown',function(ev){var m=MAP[ev.code];if(m)K0[m]=1;else if(!ev.repeat){if(ev.code==='Space')K0.sp++;else if(ev.code==='KeyQ')K0.q++;else if(ev.code==='KeyE')K0.e++}});
    window.addEventListener('keyup',function(ev){var m=MAP[ev.code];if(m)K0[m]=0});
    window.addEventListener('blur',function(){K0.L=K0.R=K0.U=K0.D=0})}
  var K=window.__lcK,ko=true,tm=0,lv=0,L,S,mode='rest',mt=0,time=50,first=true,streak=0,by='ptr',ox=0,oy=0,tx=0,ty=0,pd=false,
      cov=[],sp0=0,q0=0,e0=0,snap=null,face='open',lickT=0,blinkT=2,bounce=0,blockT=0,blockWhy='',gateT=0,barkT=0,barkI=-1,
      lenBeep=0,purrT=0,tickS=99,swapped=false,kbSeen=false,motes=[],bg=null,sparks=[],moving=0,nomT=0,mag=false;
  var SNAPT=.42;

  function load(i){lv=i;L=getLevel(i);S=makeSim(L);mode='rest';mt=0;first=true;cov=covered(S);snap=null;face='open';mag=false}
  function init(a){ko=a.lang==='ko';load(0);time=50;streak=0;tm=0;pd=false;sp0=K.sp;q0=K.q;e0=K.e;sparks=[];bounce=0;blockT=0;barkT=0;kbSeen=false;swapped=false;
    if(!motes.length)for(var i=0;i<30;i++)motes.push({x:Math.random()*W,y:Math.random()*H,v:6+Math.random()*10,p:Math.random()*6.28,r:.8+Math.random()*1.4})}
  function doSnap(a,why){snap={o:S.poly.slice(),why:why,len:S.len};S=makeSim(L);cov=covered(S);mode='snap';mt=0;mag=false;
    if(why==='free')a.sfx('jump');else{a.sfx('hit');a.shake(7);first=false;streak=0}}
  function release(a){
    if(hyp(S.hx-L.px,S.hy-L.py)<PILLOW+3){moveHead(S,L.px,L.py);
      if(win(S)){var bonus=Math.min(10,Math.round((S.max-S.len)/S.max*60)),pts=10+bonus+(first?5:0)+Math.min(streak,5);
        if(first)streak++;else streak=0;
        a.add(pts);a.sfx('win');a.pop(L.px,L.py-34,'+'+pts,'#fff7c2');time=Math.min(70,time+13);a.pop(92,84,'+13s','#9be28a');
        L.treats.forEach(function(t,i){a.burst(t[0],t[1],i%2?'#ffd35a':'#7fd0ff',8)});a.burst(L.px,L.py,'#ff9ecb',16);
        a.tempo(1+Math.min(.6,lv*.035));mode='win';mt=0;swapped=false;face='happy';return}
      if(atPillow(S)){a.pop(L.px,L.py-34,ko?'간식이 남았어!':'Fish left!','#ffe08a');doSnap(a,'miss');return}}
    doSnap(a,'free')}
  function movePost(t){var p=L.pegs[L.mv];setRail(p,Math.max(0,Math.min(1,t)));S=makeSim(L);cov=covered(S)}

  function update(dt,inp,a){
    tm+=dt;if(bounce>0)bounce=Math.max(0,bounce-dt*3);if(blockT>0)blockT-=dt;if(gateT>0)gateT-=dt;if(barkT>0)barkT-=dt;if(lickT>0)lickT-=dt;if(nomT>0)nomT-=dt;
    blinkT-=dt;if(blinkT<-.12)blinkT=1.6+Math.random()*2.6;
    var kx=K.R-K.L,ky=K.D-K.U,space=K.sp!==sp0,kq=K.q!==q0,ke=K.e!==e0,nq=K.q-q0,ne=K.e-e0;sp0=K.sp;q0=K.q;e0=K.e;
    var press=inp.down&&!pd&&inp.x!=null,rel=!inp.down&&pd;pd=inp.down;
    if(kx||ky||space)kbSeen=true;if(press)kbSeen=false;
    if(mode==='win'){mt+=dt;purrT-=dt;if(purrT<=0){purrT=.07;a.beep(86+18*Math.sin(tm*40),.05,'sawtooth')}
      if(Math.random()<dt*9)sparks.push({x:L.px+(Math.random()-.5)*40,y:L.py-10,t:0,h:1});
      if(mt>1.15){mode='fade';mt=0}return}
    if(mode==='fade'){mt+=dt;if(mt>.28&&!swapped){swapped=true;load(lv+1);mode='fade'}if(mt>.56){mode='rest';mt=0}return}
    time-=dt;if(time<=0){time=0;a.over();return}
    if(time<10&&Math.ceil(time)!==tickS){tickS=Math.ceil(time);a.beep(880,.04,'square')}
    if(mode==='snap'){mt+=dt;if(mt>=SNAPT){mode='rest';mt=0;bounce=1;face='open';a.beep(150,.09,'sine');a.burst(L.ax,L.ay,'#fff3d6',6);snap=null}return}
    if(mode==='post'){var p=L.pegs[L.mv];
      if(inp.down&&inp.x!=null){var rx=p.rail[2]-p.rail[0],ry=p.rail[3]-p.rail[1];movePost(((inp.x-p.rail[0])*rx+(inp.y-p.rail[1])*ry)/(rx*rx+ry*ry))}
      if(rel||!inp.down){movePost(Math.round(p.t*NOTCH)/NOTCH);mode='rest';a.sfx('tap')}return}
    if(mode==='rest'){
      if(L.mv>=0&&(kq||ke)){movePost(Math.round(L.pegs[L.mv].t*NOTCH+ne-nq)/NOTCH);a.sfx('tap')}
      if(press&&L.mv>=0&&hyp(inp.x-L.pegs[L.mv].x,inp.y-L.pegs[L.mv].y)<30){mode='post';return}
      if(press&&hyp(inp.x-S.hx,inp.y-S.hy)<80){mode='hold';by='ptr';ox=S.hx-inp.x;oy=S.hy-inp.y;var om=hyp(ox,oy);if(om>26){ox*=26/om;oy*=26/om}tx=S.hx;ty=S.hy;a.sfx('tap')}
      else if(kx||ky){mode='hold';by='kb';tx=S.hx;ty=S.hy;a.sfx('tap')}
      else return}
    /* hold */
    if(by==='kb'&&press&&hyp(inp.x-S.hx,inp.y-S.hy)<80){by='ptr';ox=0;oy=0}
    if(by==='ptr'){if(inp.x!=null){tx=inp.x+ox;ty=inp.y+oy}if(rel){release(a);return}if(kx||ky){by='kb';tx=S.hx;ty=S.hy}}
    if(by==='kb'){tx+=kx*210*dt;ty+=ky*210*dt;var ddx=tx-S.hx,ddy=ty-S.hy,dd=hyp(ddx,ddy);if(dd>16){tx=S.hx+ddx/dd*16;ty=S.hy+ddy/dd*16}
      tx=Math.max(FX0,Math.min(FX1,tx));ty=Math.max(FY0,Math.min(FY1,ty));if(space){release(a);return}}
    var gx=tx,gy=ty;mag=hyp(tx-L.px,ty-L.py)<PILLOW&&!(by==='kb'&&(kx||ky));if(mag){gx=L.px;gy=L.py}
    var ratio=S.len/S.max,strain=Math.max(0,Math.min(1,(ratio-.9)/.1)),f=1-Math.exp(-dt*24*(1-.7*strain)),
        ex=S.hx+(gx-S.hx)*f,ey=S.hy+(gy-S.hy)*f,l0=S.len,h0x=S.hx,h0y=S.hy;
    if(hyp(gx-S.hx,gy-S.hy)<1.6){ex=gx;ey=gy}
    var b=moveHead(S,ex,ey);
    moving=hyp(S.hx-h0x,S.hy-h0y)>.3?1:Math.max(0,moving-dt*5);
    if(S.hit){var hw=S.hit;
      if(hw==='dog'){barkT=1;barkI=S.dog;var d=L.dogs[S.dog];a.pop(d.x,d.y-30,ko?'멍멍!':'Woof!','#fff');a.burst(d.x,d.y,'#ffd9a0',10);a.beep(300,.12,'square')}
      else{a.pop(S.hx,S.hy-26,ko?'따가워!':'Ouch!','#d6ffb0');a.burst(S.hx,S.hy,'#7ccf5a',12)}
      face='ouch';doSnap(a,hw);return}
    if(b&&hyp(gx-S.hx,gy-S.hy)>5&&blockT<=0){blockT=.3;blockWhy=b;
      if(b==='gate'){gateT=.4;a.beep(200,.08,'square')}else if(b==='len')a.beep(980,.05,'sawtooth');else if(b==='cat')a.beep(260,.07,'triangle');else a.beep(330,.05,'triangle')}
    var c2=covered(S),i;
    for(i=0;i<c2.length;i++)if(c2[i]&&!cov[i]){var t=L.treats[i];sparks.push({x:t[0],y:t[1],t:0});lickT=.55;
      if(nomT<=0){nomT=.25;a.pop(t[0],t[1]-16,ko?'냠!':'Nom!','#fff3a8');a.beep(900+i*120,.07,'triangle')}}
    cov=c2;
    lenBeep+=Math.abs(S.len-l0);if(lenBeep>34){lenBeep=0;a.beep(190+620*ratio,.045,strain>.5?'sawtooth':'sine')}
    var onP=atPillow(S);
    if(onP){purrT-=dt;if(purrT<=0){purrT=.075;a.beep(84+16*Math.sin(tm*38),.05,'sawtooth')}}
    face=onP&&c2.every(function(c){return c})?'happy':strain>.55?'strain':'open';
  }

  /* ---------- 그리기 ---------- */
  function mix(a,b,t){var o='#',i;for(i=1;i<7;i+=2){var x=parseInt(a.substr(i,2),16),y=parseInt(b.substr(i,2),16),v=Math.round(x+(y-x)*t).toString(16);o+=v.length<2?'0'+v:v}return o}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function mkBg(){
    var c=document.createElement('canvas');c.width=W;c.height=H;var g=c.getContext('2d'),i,j;
    var gr=g.createLinearGradient(0,0,W,H);gr.addColorStop(0,'#d9a468');gr.addColorStop(1,'#b97f48');g.fillStyle=gr;g.fillRect(0,0,W,H);
    for(i=0;i<9;i++){g.fillStyle='rgba(90,50,15,'+(.05+((i*37)%5)*.012)+')';g.fillRect(i*40,0,1.5,H);
      for(j=0;j<4;j++){g.fillStyle='rgba(90,50,15,.09)';g.fillRect(i*40,((i*97+j*171)%H),40,1.5)}
      g.fillStyle='rgba(255,230,180,'+(((i*53)%4)*.02)+')';g.fillRect(i*40+2,0,36,H)}
    g.fillStyle='rgba(60,30,5,.22)';rr(g,9,101,W-12,H-104,20);g.fill();
    gr=g.createLinearGradient(0,96,0,H);gr.addColorStop(0,'#f6e7c8');gr.addColorStop(1,'#efd6ac');g.fillStyle=gr;rr(g,6,96,W-12,H-104,20);g.fill();
    g.strokeStyle='#d97f5a';g.lineWidth=5;rr(g,13,103,W-26,H-118,15);g.stroke();
    g.strokeStyle='#5fa7a0';g.lineWidth=2;rr(g,20,110,W-40,H-132,11);g.stroke();
    g.fillStyle='rgba(217,127,90,.16)';
    for(i=0;i<5;i++)for(j=0;j<7;j++){var x=58+i*61,y=150+j*72+(i%2)*36;g.beginPath();g.moveTo(x,y-9);g.lineTo(x+9,y);g.lineTo(x,y+9);g.lineTo(x-9,y);g.closePath();g.fill()}
    g.fillStyle='rgba(120,90,50,.05)';for(i=0;i<900;i++)g.fillRect((i*73.3)%(W-24)+12,100+(i*191.7)%(H-116),2,1);
    g.strokeStyle='#efd6ac';g.lineWidth=2;for(i=0;i<27;i++){g.beginPath();g.moveTo(22+i*12.2,H-8);g.lineTo(22+i*12.2,H-1);g.stroke()}
    return c}
  function light(g){
    var dx=22*Math.sin(tm*.09),dy=12*Math.sin(tm*.06+1),i,j;
    g.save();g.globalCompositeOperation='lighter';
    for(i=0;i<2;i++)for(j=0;j<2;j++){var x=44+dx+i*104+j*34,y=160+dy+j*150;g.fillStyle='rgba(255,236,170,.13)';
      g.beginPath();g.moveTo(x,y);g.lineTo(x+92,y);g.lineTo(x+92+30,y+138);g.lineTo(x+30,y+138);g.closePath();g.fill()}
    g.restore();
    for(i=0;i<5;i++){var a=tm*(.22+i*.05)+i*1.9;g.fillStyle='rgba(84,62,30,.055)';g.beginPath();
      g.ellipse(250+i*22-dx*1.6+Math.sin(a)*12,430+i*34+Math.cos(a*.8)*9,46-i*4,24,i*.5+Math.sin(a)*.2,0,TAU);g.fill()}
    var cx=292-dx*.6,cy=160+dy*.5,sa=Math.floor(tm)*TAU/60-Math.PI/2+Math.max(0,.25-(tm%1))*-.25;
    g.fillStyle='rgba(84,62,30,.09)';g.beginPath();g.ellipse(cx,cy,30,27,.2,0,TAU);g.fill();
    g.strokeStyle='rgba(84,62,30,.14)';g.lineCap='round';g.lineWidth=2;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(sa)*22,cy+Math.sin(sa)*20);g.stroke();
    g.lineWidth=3;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(tm*.01+1)*13,cy+Math.sin(tm*.01+1)*12);g.stroke()}
  function drawMotes(g,dt){for(var i=0;i<motes.length;i++){var m=motes[i];m.y-=m.v*dt*.5;m.x+=Math.sin(tm*.6+m.p)*dt*7;if(m.y<96){m.y=H;m.x=Math.random()*W}
      g.globalAlpha=.16+.3*Math.pow(Math.sin(tm*.9+m.p),2);g.fillStyle='#fff8dc';g.beginPath();g.arc(m.x,m.y,m.r,0,TAU);g.fill()}g.globalAlpha=1}

  function drawPeg(g,p){
    var k=p.k,x=p.x,y=p.y,i;
    if(k==='cactus'){
      g.fillStyle='#c9764a';g.beginPath();g.arc(x,y,12.5,0,TAU);g.fill();g.strokeStyle='#8d4a2a';g.lineWidth=1.5;g.stroke();
      g.strokeStyle='#2f7d3a';g.lineWidth=1.6;for(i=0;i<12;i++){var a=i*TAU/12+.2;g.beginPath();g.moveTo(x+Math.cos(a)*7,y+Math.sin(a)*7);g.lineTo(x+Math.cos(a)*14.5,y+Math.sin(a)*14.5);g.stroke()}
      var gr=g.createRadialGradient(x-3,y-3,1,x,y,10);gr.addColorStop(0,'#8fdc74');gr.addColorStop(1,'#3d9a4a');g.fillStyle=gr;g.beginPath();g.arc(x,y,9.5,0,TAU);g.fill();
      g.strokeStyle='rgba(30,90,40,.6)';g.lineWidth=1;for(i=-1;i<2;i++){g.beginPath();g.ellipse(x,y,Math.abs(i)*5+2.5,9.5,0,0,TAU);g.stroke()}
      g.fillStyle='#ff7fae';for(i=0;i<5;i++){g.beginPath();g.arc(x+3+Math.cos(i*1.257)*2.6,y-4+Math.sin(i*1.257)*2.6,1.9,0,TAU);g.fill()}
      g.fillStyle='#ffe27a';g.beginPath();g.arc(x+3,y-4,1.4,0,TAU);g.fill();return}
    var top=k==='move'?'#8ec8ff':k==='gate'?'#c9a57a':'#ecd29c',ring=k==='move'?'#3f7fc4':k==='gate'?'#8a6238':'#b78f55',base=k==='move'?'#2f5f9a':'#8a5f36';
    g.fillStyle=base;g.beginPath();g.arc(x,y,12,0,TAU);g.fill();
    var g2=g.createRadialGradient(x-3,y-3,1,x,y,10);g2.addColorStop(0,'#fff6dc');g2.addColorStop(.35,top);g2.addColorStop(1,ring);g.fillStyle=g2;g.beginPath();g.arc(x,y,9.5,0,TAU);g.fill();
    g.strokeStyle=ring;g.lineWidth=1.1;for(i=1;i<4;i++){g.beginPath();g.arc(x,y,i*2.7,i,i+4.6);g.stroke()}
    g.strokeStyle='rgba(70,40,10,.55)';g.lineWidth=1.3;g.beginPath();g.arc(x,y,9.5,0,TAU);g.stroke();
    if(k==='move'&&mode==='rest'){var w=2*Math.sin(tm*5),ex=p.rail[2]-p.rail[0],ey=p.rail[3]-p.rail[1],l=hyp(ex,ey);ex/=l;ey/=l;g.fillStyle='#2f5f9a';
      for(i=-1;i<2;i+=2){if((i<0&&p.t<.01)||(i>0&&p.t>.99))continue;var bx=x+ex*i*(20+w),by=y+ey*i*(20+w);g.beginPath();g.moveTo(bx+ex*i*6,by+ey*i*6);g.lineTo(bx-ey*5,by+ex*5);g.lineTo(bx+ey*5,by-ex*5);g.closePath();g.fill()}}}
  function drawFish(g,x,y,i,on){
    var b=Math.sin(tm*2.4+i*1.7)*1.5,c=i%2?'#ff9d5c':'#5fb6f2',d=i%2?'#d9692b':'#2f7fc4';
    g.save();g.translate(x,y+b);g.rotate(-.35+Math.sin(tm*1.7+i)*.08);
    if(!on){g.strokeStyle='rgba(255,255,255,'+(.5+.3*Math.sin(tm*4+i))+')';g.lineWidth=2;g.beginPath();g.arc(0,0,13+Math.sin(tm*4+i),0,TAU);g.stroke()}
    g.fillStyle='rgba(60,30,5,.18)';g.beginPath();g.ellipse(2,4,9,5,0,0,TAU);g.fill();
    g.fillStyle=c;g.strokeStyle=d;g.lineWidth=1.4;g.beginPath();g.moveTo(-6,0);g.lineTo(-13,-6);g.lineTo(-11,0);g.lineTo(-13,6);g.closePath();g.fill();g.stroke();
    g.beginPath();g.ellipse(1,0,9,5.6,0,0,TAU);g.fill();g.stroke();
    g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(1,-2,5.5,2,0,0,TAU);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(5.5,-1,2,0,TAU);g.fill();g.fillStyle='#222';g.beginPath();g.arc(6,-1,1,0,TAU);g.fill();g.restore()}
  function drawPillow(g,x,y,ready){
    var s=1+(ready?.05*Math.sin(tm*7):0);g.save();g.translate(x,y);
    g.fillStyle='rgba(60,30,5,.2)';rr(g,-23,-17,52,44,13);g.fill();g.scale(s,s);
    if(ready){g.strokeStyle='rgba(255,250,190,'+(.6+.35*Math.sin(tm*7))+')';g.lineWidth=4;rr(g,-31,-27,62,54,17);g.stroke()}
    var gr=g.createLinearGradient(0,-22,0,22);gr.addColorStop(0,'#d7a3f2');gr.addColorStop(1,'#a56ad0');g.fillStyle=gr;rr(g,-26,-22,52,44,13);g.fill();
    g.strokeStyle='#7a47a6';g.lineWidth=1.6;g.stroke();
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1.2;g.setLineDash([3,3]);rr(g,-21,-17,42,34,9);g.stroke();g.setLineDash([]);
    g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(-8,-10,12,5,-.3,0,TAU);g.fill();
    g.fillStyle='#ffd35a';for(var i=0;i<4;i++){g.beginPath();g.arc(i%2?26:-26,i<2?-22:22,3.2,0,TAU);g.fill()}
    g.fillStyle='#7a47a6';g.beginPath();g.arc(0,0,2.6,0,TAU);g.fill();g.restore()}
  function drawMat(g,x,y){g.fillStyle='rgba(60,30,5,.18)';g.beginPath();g.ellipse(x+2,y+4,22,19,0,0,TAU);g.fill();
    g.fillStyle='#86c96f';g.beginPath();g.ellipse(x,y,22,19,0,0,TAU);g.fill();g.strokeStyle='#4f9340';g.lineWidth=1.6;g.stroke();
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.2;g.setLineDash([3,3]);g.beginPath();g.ellipse(x,y,17,14,0,0,TAU);g.stroke();g.setLineDash([])}
  function drawDog(g,d,awake){
    var x=d.x,y=d.y,j=awake?Math.sin(tm*40)*1.5:0,br=Math.sin(tm*2)*.6;
    g.fillStyle=awake?'rgba(255,90,70,.16)':'rgba(120,150,255,.12)';g.beginPath();g.arc(x,y,d.r,0,TAU);g.fill();
    g.strokeStyle=awake?'rgba(230,60,50,.8)':'rgba(70,90,170,.5)';g.lineWidth=1.6;g.setLineDash([5,5]);g.lineDashOffset=-tm*8;g.beginPath();g.arc(x,y,d.r,0,TAU);g.stroke();g.setLineDash([]);
    g.save();g.translate(x+j,y);
    g.fillStyle='rgba(60,30,5,.2)';g.beginPath();g.ellipse(2,5,21,15,0,0,TAU);g.fill();
    g.fillStyle='#b9814f';g.strokeStyle='#73451f';g.lineWidth=1.5;g.beginPath();g.ellipse(0,1,20+br,14+br,0,0,TAU);g.fill();g.stroke();
    g.strokeStyle='#73451f';g.lineWidth=4.5;g.lineCap='round';g.beginPath();g.arc(2,2,15,.5,2.2);g.stroke();
    g.fillStyle='#d9a56e';g.strokeStyle='#73451f';g.lineWidth=1.4;g.beginPath();g.ellipse(-7,-3,11,9.5,0,0,TAU);g.fill();g.stroke();
    g.fillStyle='#73451f';g.beginPath();g.ellipse(-16,-6,4.5,7.5,.5,0,TAU);g.fill();g.beginPath();g.ellipse(1,-9,4.5,7,-.7,0,TAU);g.fill();
    g.fillStyle='#3a2414';g.beginPath();g.ellipse(-8,0,2.4,1.8,0,0,TAU);g.fill();
    g.strokeStyle='#3a2414';g.lineWidth=1.4;
    if(awake){g.fillStyle='#fff';g.beginPath();g.arc(-12,-5,2.6,0,TAU);g.arc(-4,-5,2.6,0,TAU);g.fill();g.fillStyle='#222';g.beginPath();g.arc(-12,-5,1.2,0,TAU);g.arc(-4,-5,1.2,0,TAU);g.fill();
      g.fillStyle='#c0392b';g.beginPath();g.ellipse(-8,4.5,3,2.6,0,0,TAU);g.fill()}
    else{g.beginPath();g.arc(-12,-5,2,.2,2.9);g.stroke();g.beginPath();g.arc(-4,-5,2,.2,2.9);g.stroke()}
    g.restore();
    if(!awake){g.fillStyle='rgba(70,90,170,.75)';g.textAlign='center';for(var i=0;i<3;i++){var t=(tm*.5+i/3)%1;g.globalAlpha=1-t;g.font=(9+t*7)+'px Jua, system-ui, sans-serif';g.fillText('z',x+14+t*12,y-10-t*20)}g.globalAlpha=1}}
  function drawGate(g,G){
    var A=L.pegs[G.a],B=L.pegs[G.b],ex=B.x-A.x,ey=B.y-A.y,l=hyp(ex,ey),i,hot=gateT>0;ex/=l;ey/=l;
    g.strokeStyle=hot?'#e8473c':'#3d9c92';g.lineWidth=4;g.lineCap='round';g.setLineDash([2,7]);g.beginPath();g.moveTo(A.x+ex*13,A.y+ey*13);g.lineTo(B.x-ex*13,B.y-ey*13);g.stroke();g.setLineDash([]);
    var n=Math.floor((l-40)/22),ph=(tm*1.4)%1;
    for(i=0;i<=n;i++){var cx=A.x+ex*(20+(l-40)*(n?i/n:.5)),cy=A.y+ey*(20+(l-40)*(n?i/n:.5));
      for(var k=0;k<2;k++){var o=(k+ph)*9-9,al=k===0?ph:1-ph*.6;g.strokeStyle=hot?'rgba(232,71,60,'+al+')':'rgba(47,140,130,'+al+')';g.lineWidth=2.6;g.lineJoin='round';
        g.beginPath();g.moveTo(cx-ex*5+G.nx*(o-4),cy-ey*5+G.ny*(o-4));g.lineTo(cx+G.nx*(o+2),cy+G.ny*(o+2));g.lineTo(cx+ex*5+G.nx*(o-4),cy+ey*5+G.ny*(o-4));g.stroke()}}}

  function head(g,x,y,o){
    var f=o.face,c1=o.c1,c3=o.c3,i,sx;
    g.save();g.translate(x,y);if(f==='strain')g.translate((Math.random()-.5)*2.4,(Math.random()-.5)*2.4);
    if(o.sq)g.scale(1+o.sq*.18,1-o.sq*.18);
    g.lineJoin='round';
    for(sx=-1;sx<2;sx+=2){g.fillStyle=c1;g.strokeStyle=c3;g.lineWidth=1.6;g.beginPath();g.moveTo(sx*14,-5);g.lineTo(sx*14.5,-21);g.lineTo(sx*3,-12);g.closePath();g.fill();g.stroke();
      g.fillStyle='#ffb3c4';g.beginPath();g.moveTo(sx*11.5,-9);g.lineTo(sx*12.5,-17);g.lineTo(sx*6.5,-12.5);g.closePath();g.fill()}
    var gr=g.createRadialGradient(-4,-5,2,0,0,17);gr.addColorStop(0,mix(c1,'#ffffff',.35));gr.addColorStop(1,c1);
    g.fillStyle=gr;g.strokeStyle=c3;g.lineWidth=1.7;g.beginPath();g.ellipse(0,0,16.5,14,0,0,TAU);g.fill();g.stroke();
    g.strokeStyle=o.c2;g.lineWidth=2.2;g.lineCap='round';for(i=-1;i<2;i++){g.beginPath();g.moveTo(i*4,-13);g.lineTo(i*3.4,-8.5+Math.abs(i));g.stroke()}
    g.fillStyle='#fff6e6';g.beginPath();g.ellipse(0,5.5,8.5,6,0,0,TAU);g.fill();
    if(f==='strain'||f==='happy'){g.fillStyle='rgba(255,90,90,'+(f==='strain'?.55:.3)+')';g.beginPath();g.ellipse(-10.5,3.5,3.4,2.2,0,0,TAU);g.ellipse(10.5,3.5,3.4,2.2,0,0,TAU);g.fill()}
    g.strokeStyle='#3a2414';g.lineWidth=1.8;
    for(sx=-1;sx<2;sx+=2){var ex=sx*6.6,ey=-2.5;
      if(f==='sleep'||f==='blink'){g.beginPath();g.moveTo(ex-3.4,ey);g.lineTo(ex+3.4,ey);g.stroke()}
      else if(f==='happy'||o.lick){g.beginPath();g.arc(ex,ey+1.5,3.4,Math.PI*1.1,Math.PI*1.9);g.stroke()}
      else if(f==='strain'){g.beginPath();g.moveTo(ex-sx*3.4,ey-2.8);g.lineTo(ex+sx*2.6,ey);g.lineTo(ex-sx*3.4,ey+2.8);g.stroke()}
      else if(f==='ouch'){g.beginPath();g.moveTo(ex-3,ey-3);g.lineTo(ex+3,ey+3);g.moveTo(ex+3,ey-3);g.lineTo(ex-3,ey+3);g.stroke()}
      else{g.fillStyle='#fff';g.beginPath();g.ellipse(ex,ey,4.7,5.2,0,0,TAU);g.fill();g.lineWidth=1.2;g.stroke();g.lineWidth=1.8;
        g.fillStyle='#2b1c10';g.beginPath();g.ellipse(ex+o.lx*1.9,ey+o.ly*2.1,2.6,3.2,0,0,TAU);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(ex+o.lx*1.9-.9,ey+o.ly*2.1-1.2,1,0,TAU);g.fill()}}
    g.fillStyle='#ff8fa3';g.beginPath();g.moveTo(-2.2,3);g.lineTo(2.2,3);g.lineTo(0,5.4);g.closePath();g.fill();
    g.strokeStyle='#3a2414';g.lineWidth=1.3;
    if(f==='strain'){g.fillStyle='#fff';g.beginPath();g.rect(-5,6.6,10,4);g.fill();g.stroke();g.beginPath();g.moveTo(-1.7,6.6);g.lineTo(-1.7,10.6);g.moveTo(1.7,6.6);g.lineTo(1.7,10.6);g.stroke();
      g.fillStyle='#8fd3ff';for(i=0;i<2;i++){var t=(tm*1.6+i*.5)%1;g.globalAlpha=1-t;g.beginPath();g.ellipse((i?1:-1)*(15+t*5),-10+t*9,1.8,2.8,0,0,TAU);g.fill()}g.globalAlpha=1}
    else if(f==='ouch'){g.fillStyle='#7a2a2a';g.beginPath();g.ellipse(0,8.5,3,3.4,0,0,TAU);g.fill()}
    else{g.beginPath();g.arc(-2.4,5.6,2.4,.1,Math.PI-.4);g.stroke();g.beginPath();g.arc(2.4,5.6,2.4,.4,Math.PI-.1);g.stroke();
      if(o.lick){g.fillStyle='#ff6f91';g.beginPath();g.ellipse(2+Math.sin(tm*26)*2.4,9,2.4,3.2,0,0,TAU);g.fill();g.stroke()}}
    g.strokeStyle='rgba(58,36,20,.55)';g.lineWidth=1;for(sx=-1;sx<2;sx+=2)for(i=0;i<2;i++){g.beginPath();g.moveTo(sx*9,5+i*2.4);g.lineTo(sx*21,3+i*5);g.stroke()}
    g.restore()}
  /* 몸통: 줄(폴리라인)을 따라 굵은 줄무늬 튜브 + 일정 간격의 다리 + 꼬리 */
  function drawCat(g,o,c){
    var n=o.length/2,cum=[0],i,tot;for(i=1;i<n;i++)cum.push(cum[i-1]+hyp(o[i*2]-o[i*2-2],o[i*2+1]-o[i*2-1]));tot=cum[n-1];
    var ci=1;function at(s){if(s<cum[ci-1])ci=1;while(ci<n-1&&cum[ci]<s)ci++;var l=cum[ci]-cum[ci-1]||1,f=Math.max(0,Math.min(1,(s-cum[ci-1])/l)),ax=o[ci*2-2],ay=o[ci*2-1],bx=o[ci*2],by=o[ci*2+1];
      return[ax+(bx-ax)*f,ay+(by-ay)*f,(bx-ax)/l,(by-ay)/l]}
    var st=c.strain||0,c1=mix(c.c1,'#f0503f',st*.6),c2=mix(c.c2,'#b3261c',st*.6),c3=c.c3,bw=BW*(1-.1*Math.min(1,tot/Math.max(300,c.max||600))),a0=at(0),hx=o[n*2-2],hy=o[n*2-1];
    function path(dx,dy){g.beginPath();g.moveTo(o[0]+dx,o[1]+dy);for(var q=1;q<n;q++)g.lineTo(o[q*2]+dx,o[q*2+1]+dy)}
    g.lineCap='round';g.lineJoin='round';
    g.strokeStyle='rgba(60,30,5,.2)';g.lineWidth=bw*2+3;path(3,5);g.stroke();
    g.beginPath();g.arc(hx+3,hy+6,16,0,TAU);g.fillStyle='rgba(60,30,5,.2)';g.fill();
    /* 꼬리 */
    var wag=Math.sin(tm*(c.sleep?1.2:5.5))*(c.sleep?5:10),bx=o[0]-a0[2]*5,by=o[1]-a0[3]*5,
        qx=bx-a0[2]*14,qy=by-a0[3]*14,tx2=bx-a0[2]*25-a0[3]*wag,ty2=by-a0[3]*25+a0[2]*wag;
    g.strokeStyle=c3;g.lineWidth=8;g.beginPath();g.moveTo(bx,by);g.quadraticCurveTo(qx,qy,tx2,ty2);g.stroke();
    g.strokeStyle=c1;g.lineWidth=5.2;g.stroke();g.strokeStyle=c2;g.lineWidth=5.2;g.beginPath();g.moveTo((qx+tx2*3)/4,(qy+ty2*3)/4);g.lineTo(tx2,ty2);g.stroke();
    /* 다리 */
    var legs=[Math.min(4,tot*.2)],m;if(tot>40)legs.push(tot-19);if(tot>130){m=Math.floor((tot-50)/78);for(i=1;i<=m;i++)legs.push(4+(tot-23)*i/(m+1))}
    for(i=0;i<legs.length;i++){var q=at(legs[i]),wg=(c.moving||0)*Math.sin(tm*13+i*2.1)*2.6;
      for(var sd=-1;sd<2;sd+=2){var lx=q[0]-q[3]*sd*(bw+3)+q[2]*wg*sd,ly=q[1]+q[2]*sd*(bw+3)+q[3]*wg*sd;
        g.fillStyle='#fff6e6';g.strokeStyle=c3;g.lineWidth=1.4;g.beginPath();g.ellipse(lx,ly,4.6,4.1,0,0,TAU);g.fill();g.stroke()}}
    /* 튜브 */
    path(0,0);g.strokeStyle=c3;g.lineWidth=bw*2+3;g.stroke();g.strokeStyle=c1;g.lineWidth=bw*2;g.stroke();
    g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=bw*.7;path(-1.5,-2);g.stroke();
    var sp=11+10*Math.min(1,tot/Math.max(300,c.max||600));g.strokeStyle=c2;g.lineWidth=3.4;g.lineCap='round';ci=1;
    for(var s=9;s<tot-15;s+=sp){var z=at(s),hw=bw-2.2;g.beginPath();g.moveTo(z[0]-z[3]*hw,z[1]+z[2]*hw);g.quadraticCurveTo(z[0]+z[2]*3,z[1]+z[3]*3,z[0]+z[3]*hw,z[1]-z[2]*hw);g.stroke()}
    head(g,hx,hy,c)}

  function draw(g,a,dt){
    dt=dt||.016;var i;ko=a.lang==='ko';
    if(!bg)bg=mkBg();g.drawImage(bg,0,0);
    light(g);
    if(!L)return;
    /* 레일 · 문 · 개 */
    if(L.mv>=0){var p=L.pegs[L.mv];g.lineCap='round';g.strokeStyle='rgba(60,40,20,.28)';g.lineWidth=11;g.beginPath();g.moveTo(p.rail[0],p.rail[1]);g.lineTo(p.rail[2],p.rail[3]);g.stroke();
      g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.stroke();g.fillStyle='rgba(47,95,154,.6)';
      for(i=0;i<=NOTCH;i++){g.beginPath();g.arc(p.rail[0]+(p.rail[2]-p.rail[0])*i/NOTCH,p.rail[1]+(p.rail[3]-p.rail[1])*i/NOTCH,2.6,0,TAU);g.fill()}}
    for(i=0;i<L.dogs.length;i++)drawDog(g,L.dogs[i],barkT>0&&barkI===i);
    var all=cov.length>0&&cov.every(function(c){return c});
    drawMat(g,L.ax,L.ay);drawPillow(g,L.px,L.py,all&&mode==='hold');
    for(i=0;i<L.pegs.length;i++){var q=L.pegs[i];g.fillStyle='rgba(60,30,5,.22)';g.beginPath();g.ellipse(q.x+5,q.y+8,12,10,.4,0,TAU);g.fill()}
    for(i=0;i<L.gates.length;i++)drawGate(g,L.gates[i]);
    for(i=0;i<L.treats.length;i++)if(mode!=='win')drawFish(g,L.treats[i][0],L.treats[i][1],i,cov[i]);
    if(L.cat2){var c=L.cat2,o2=[],k;for(k=0;k+3<c.length;k+=2)for(var u=0;u<8;u++){var f=u/8;o2.push(c[k]+(c[k+2]-c[k])*f,c[k+1]+(c[k+3]-c[k+1])*f+Math.sin((k*4+u)*.5)*1.2)}
      o2.push(c[c.length-2],c[c.length-1]);
      drawCat(g,o2,{c1:'#b9c0d2',c2:'#7f879e',c3:'#4a5068',face:'sleep',lx:0,ly:0,sleep:1,max:600});
      g.fillStyle='rgba(74,80,104,.8)';g.textAlign='center';for(i=0;i<3;i++){var t=(tm*.45+i/3)%1;g.globalAlpha=1-t;g.font=(9+t*7)+'px Jua, system-ui, sans-serif';g.fillText('z',c[c.length-2]+16+t*10,c[c.length-1]-16-t*20)}g.globalAlpha=1}
    /* 내 고양이 */
    var o=S.poly,fc=face,sq=0;
    if(mode==='snap'&&snap){var f2=1-Math.pow(mt/SNAPT,2.2),so=snap.o,want=Math.max(20,snap.len*f2),acc=0;o=[so[0],so[1]];
      for(i=2;i<so.length;i+=2){var d=hyp(so[i]-so[i-2],so[i+1]-so[i-1]);if(acc+d>=want){var r=(want-acc)/(d||1);o.push(so[i-2]+(so[i]-so[i-2])*r,so[i-1]+(so[i+1]-so[i-1])*r);break}acc+=d;o.push(so[i],so[i+1])}
      if(o.length<4)o=S.poly;fc=snap.why==='free'?'blink':snap.why==='miss'?'open':'ouch'}
    else if(mode==='rest'){sq=bounce*Math.sin(bounce*9);fc=blinkT<0?'blink':face==='ouch'?'open':face}
    else if(mode==='hold'&&fc==='open'&&blinkT<0)fc='blink';
    var hx=o[o.length-2],hy=o[o.length-1],lx=0,ly=0,bd=1e9;
    for(i=0;i<L.treats.length;i++)if(!cov[i]){var dd=hyp(L.treats[i][0]-hx,L.treats[i][1]-hy);if(dd<bd){bd=dd;lx=(L.treats[i][0]-hx)/dd;ly=(L.treats[i][1]-hy)/dd}}
    if(bd>1e8){var dp=hyp(L.px-hx,L.py-hy);if(dp>2){lx=(L.px-hx)/dp;ly=(L.py-hy)/dp}}
    var ratio=mode==='hold'?S.len/S.max:0,strain=Math.max(0,Math.min(1,(ratio-.9)/.1));
    if(blockT>0&&blockWhy==='self')strain=Math.max(strain,.5);
    drawCat(g,o,{c1:'#f7a650',c2:'#d9772b',c3:'#6e3d1c',face:fc,lx:lx,ly:ly,strain:strain,lick:lickT>0&&fc!=='strain',moving:mode==='hold'?moving:0,max:S.max,sq:sq});
    for(i=0;i<L.pegs.length;i++)drawPeg(g,L.pegs[i]);
    /* 덮인 간식 반짝이 */
    for(i=0;i<L.treats.length;i++)if(cov[i]&&mode!=='win'){var t3=L.treats[i],sc=1+.2*Math.sin(tm*6+i);g.save();g.translate(t3[0],t3[1]);g.rotate(tm*1.5+i);g.fillStyle='#fff6a8';g.strokeStyle='#e0a020';g.lineWidth=1;
      g.beginPath();for(var k2=0;k2<8;k2++){var rd=(k2%2?2.6:6.5)*sc;g.lineTo(Math.cos(k2*TAU/8)*rd,Math.sin(k2*TAU/8)*rd)}g.closePath();g.fill();g.stroke();g.restore()}
    for(i=sparks.length-1;i>=0;i--){var s=sparks[i];s.t+=dt;if(s.t>.7){sparks.splice(i,1);continue}g.globalAlpha=1-s.t/.7;
      if(s.h){g.fillStyle='#ff7fae';g.font='14px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('♥',s.x,s.y-s.t*46)}
      else{g.strokeStyle='#fff6a8';g.lineWidth=2.5;g.beginPath();g.arc(s.x,s.y,8+s.t*34,0,TAU);g.stroke()}}
    g.globalAlpha=1;
    drawMotes(g,dt);
    /* HUD */
    g.fillStyle='rgba(74,44,20,.82)';rr(g,6,34,W-12,56,12);g.fill();
    g.textBaseline='middle';g.textAlign='left';g.font='15px Jua, system-ui, sans-serif';g.fillStyle='#ffe9b8';g.fillText('Lv.'+(lv+1),14,48);
    var tw=124,tf=Math.max(0,time/70),low=time<10;
    g.fillStyle='rgba(255,255,255,.18)';rr(g,62,42,tw,12,6);g.fill();
    g.fillStyle=low?(Math.sin(tm*12)>0?'#ff6b5a':'#ffb0a0'):'#8fdc74';if(tf>.02){rr(g,62,42,Math.max(12,tw*tf),12,6);g.fill()}
    g.fillStyle='#fff';g.font='12px Jua, system-ui, sans-serif';g.fillText(Math.ceil(time)+(ko?'초':'s'),62+tw+6,48.5);
    var mx=228,mw=106,mr=Math.min(1,S.len/S.max),mc=mr>.96?'#ff5a4a':mr>.88?'#ffb347':'#f7c36a';
    if(mode!=='hold')mr=Math.min(mr,.06);
    g.fillStyle='rgba(255,255,255,.18)';rr(g,mx,42,mw,12,6);g.fill();
    g.fillStyle=mc;rr(g,mx,42,Math.max(14,mw*mr),12,6);g.fill();
    var ex2=mx+Math.max(14,mw*mr);g.fillStyle=mc;g.beginPath();g.arc(ex2-2,48,8,0,TAU);g.fill();
    g.beginPath();g.moveTo(ex2-8,44);g.lineTo(ex2-7,37);g.lineTo(ex2-2,41);g.closePath();g.fill();g.beginPath();g.moveTo(ex2+4,44);g.lineTo(ex2+3,37);g.lineTo(ex2-2,41);g.closePath();g.fill();
    g.fillStyle='#3a2414';g.beginPath();g.arc(ex2-4.5,47,1.3,0,TAU);g.arc(ex2+.5,47,1.3,0,TAU);g.fill();
    g.textAlign='center';g.font='13px Jua, system-ui, sans-serif';
    var tip=L.tip?L.tip[ko?'ko':'en']:(ko?'모든 간식을 몸으로 덮고 베개로!':'Cover every fish, then the pillow!');
    if(kbSeen&&mode==='hold')tip=ko?'방향키 이동 · 스페이스로 놓기':'Arrows move · Space to let go';
    g.fillStyle='#fff3d6';g.fillText(tip,W/2,75,W-24);
    g.textBaseline='alphabetic';
    if(blockT>0&&mode==='hold'){var msg=blockWhy==='len'?(ko?'더는 못 늘어나!':"Can't stretch more!"):blockWhy==='gate'?(ko?'반대 방향!':'Wrong way!'):blockWhy==='cat'?(ko?'친구가 자고 있어':'Friend is sleeping'):(ko?'몸이 꼬여요':'Tangled!');
      g.font='13px Jua, system-ui, sans-serif';g.globalAlpha=Math.min(1,blockT*5);g.fillStyle='rgba(74,20,10,.75)';var mwid=g.measureText(msg).width+14,bx2=Math.max(mwid/2+6,Math.min(W-mwid/2-6,hx));
      rr(g,bx2-mwid/2,hy-46,mwid,20,8);g.fill();g.fillStyle='#fff';g.fillText(msg,bx2,hy-32);g.globalAlpha=1}
    if(mode==='rest'&&lv===0&&time>0){var ph=(tm*.6)%1,r0=restPos(L),fx=r0[0]+(L.px-r0[0])*ph,fy=r0[1]+(L.py-r0[1])*ph;g.globalAlpha=.75*Math.sin(ph*Math.PI);
      g.fillStyle='#fff';g.strokeStyle='#6e3d1c';g.lineWidth=1.5;g.beginPath();g.arc(fx+14,fy+12,8,0,TAU);g.fill();g.stroke();rr(g,fx+9,fy+12,10,16,5);g.fill();g.stroke();g.globalAlpha=1}
    if(mode==='fade'){g.fillStyle='rgba(255,244,214,'+(1-Math.abs(mt-.28)/.28)+')';g.fillRect(0,92,W,H-92)}
    if(typeof window!=='undefined')window.__longcat={lv:lv,L:L,S:S,mode:mode,cov:cov,time:time,load:load};
  }

  SG.run({id:'long-cat',title:{ko:'쭈욱 고양이',en:'Long Cat'},
    how:{ko:'머리를 끌면 몸이 쭈욱! 기둥에 감아 모든 간식을 몸으로 덮고 베개에 놓아요.',en:'Drag the head and the body stretches! Wrap posts to cover every fish, then drop the head on the pillow.'},
    init:init,update:update,draw:draw});
})();
