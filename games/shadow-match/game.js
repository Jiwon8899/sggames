/* 그림자 극장 — 복셀 물체를 90도씩 돌려 종이 스크린의 그림자를 목표 실루엣과 맞춘다 */
(function(){
  'use strict';
  /* ---------- 실루엣 (5x5, 모든 행이 비어 있지 않아야 한다) ---------- */
  var SIL={
    heart:{ko:'하트',en:'Heart',g:['.#.#.','#####','#####','.###.','..#..']},
    stair:{ko:'계단',en:'Stairs',g:['#....','##...','###..','####.','#####']},
    tree:{ko:'나무',en:'Tree',g:['..#..','.###.','.###.','#####','..#..']},
    key:{ko:'열쇠',en:'Key',g:['.###.','.#.#.','.###.','..#..','..##.']},
    cat:{ko:'고양이',en:'Cat',g:['#...#','##.##','#####','#.#.#','#####']},
    boat:{ko:'돛단배',en:'Boat',g:['..#..','..##.','..###','#####','.###.']},
    duck:{ko:'오리',en:'Duck',g:['..##.','..###','#.##.','####.','.###.']},
    mush:{ko:'버섯',en:'Mushroom',g:['.###.','#####','#####','..#..','.###.']},
    house:{ko:'집',en:'House',g:['..#..','.###.','#####','##.##','##.##']},
    arrow:{ko:'화살표',en:'Arrow',g:['..#..','...#.','#####','...#.','..#..']},
    S:{ko:'S',en:'S',g:['.####','#....','.###.','....#','####.']},
    G:{ko:'G',en:'G',g:['.###.','#....','#.###','#...#','.###.']},
    ghost:{ko:'유령',en:'Ghost',g:['.###.','#.#.#','#####','#####','#.#.#']},
    crown:{ko:'왕관',en:'Crown',g:['#.#.#','#.#.#','#####','#####','.###.']},
    rocket:{ko:'로켓',en:'Rocket',g:['..#..','.###.','.#.#.','.###.','#.#.#']},
    umb:{ko:'우산',en:'Umbrella',g:['.###.','#####','..#..','#.#..','.#...']},
    skull:{ko:'해골',en:'Skull',g:['.###.','#.#.#','#####','.###.','.#.#.']},
    note:{ko:'음표',en:'Note',g:['.####','.#..#','.#..#','##.##','##.##']},
    dia:{ko:'보석',en:'Gem',g:['..#..','.###.','#####','.###.','..#..']}
  };
  var HAND=[['heart','stair'],['tree','key'],['cat','boat'],['duck','mush'],['house','arrow'],['S','G'],
            ['ghost','heart'],['key','crown'],['rocket','umb'],['skull','cat'],['note','duck'],['boat','tree']];
  var COLS=[[228,108,86],[224,172,72],[124,176,124],[104,154,206],[176,116,178],[232,150,110]];

  /* ---------- 회전 논리 (정수 3x3 행렬, 24개 방향) ---------- */
  var ID=[1,0,0,0,1,0,0,0,1];
  var MOVE={right:[0,0,-1,0,1,0,1,0,0],left:[0,0,1,0,1,0,-1,0,0],up:[1,0,0,0,0,-1,0,1,0],down:[1,0,0,0,0,1,0,-1,0]};
  var DIRS=['left','right','up','down'];
  function mul(A,B){var C=[],i,j;for(i=0;i<3;i++)for(j=0;j<3;j++)C[i*3+j]=A[i*3]*B[j]+A[i*3+1]*B[3+j]+A[i*3+2]*B[6+j];return C}
  var ALL=(function(){var seen={},q=[ID],out=[];seen[ID.join()]=1;
    while(q.length){var R=q.shift();out.push(R);DIRS.forEach(function(d){var N=mul(MOVE[d],R),k=N.join();if(!seen[k]){seen[k]=1;q.push(N)}})}return out})();
  /* 그림자 = 25비트 마스크. kind 0: 뒤 스크린(x,y), kind 1: 옆 스크린(-z,y) */
  function mask(vox,R,kind){var m=0;for(var i=0;i<vox.length;i++){var v=vox[i],x=R[0]*v[0]+R[1]*v[1]+R[2]*v[2],y=R[3]*v[0]+R[4]*v[1]+R[5]*v[2],z=R[6]*v[0]+R[7]*v[1]+R[8]*v[2];
      m|=1<<((y+2)*5+((kind?-z:x)+2))}return m}
  function build(a,b,ga,gb,col){var vox=[],r,ca,cb;ga=ga||SIL[a].g;gb=gb||SIL[b].g;
    for(r=0;r<5;r++)for(ca=0;ca<5;ca++)if(ga[r][ca]==='#')for(cb=0;cb<5;cb++)if(gb[r][cb]==='#')vox.push([ca-2,2-r,2-cb]);
    return {vox:vox,a:a,b:b,col:col||COLS[0],faces:null}}
  function blob(rnd){var g=[],s=Math.floor(rnd()*3),e=s+1+Math.floor(rnd()*3);
    for(var r=0;r<5;r++){e=Math.min(4,e);s=Math.min(s,e);var row='';for(var c=0;c<5;c++)row+=(c>=s&&c<=e)?'#':'.';g.push(row);
      var ns=Math.max(0,Math.min(e,s+Math.floor(rnd()*3)-1)),ne=Math.max(ns,Math.min(4,e+Math.floor(rnd()*3)-1));if(ne<s)ne=s;s=ns;e=ne}
    return g}
  function objectFor(level,rnd){var col=COLS[level%COLS.length];
    if(level<HAND.length)return build(HAND[level][0],HAND[level][1],null,null,col);
    var ks=Object.keys(SIL),a=ks[Math.floor(rnd()*ks.length)],b;do{b=ks[Math.floor(rnd()*ks.length)]}while(b===a);
    if(rnd()<.45)return build(a,'mys',null,blob(rnd),col);
    return build(a,b,null,null,col)}
  /* 목표: 물체의 실제 방향 T에서 만든 그림자(항상 풀 수 있음). par = 일치하는 방향들까지의 BFS 최단 거리 */
  function makePuzzle(obj,two,want,rnd,fixT){
    var best=null,ks=[0,1,2,3],i;for(i=3;i>0;i--){var j=Math.floor(rnd()*(i+1)),t=ks[i];ks[i]=ks[j];ks[j]=t}
    if(fixT!=null)ks=[fixT];
    ks.forEach(function(k){
      var T=ID,n;for(n=0;n<k;n++)T=mul(MOVE.right,T);
      var tf=mask(obj.vox,T,0),ts=mask(obj.vox,T,1),dist={},q=[];
      ALL.forEach(function(R){if(mask(obj.vox,R,0)===tf&&(!two||mask(obj.vox,R,1)===ts)){dist[R.join()]=0;q.push(R)}});
      while(q.length){var R=q.shift(),d=dist[R.join()];DIRS.forEach(function(m){var N=mul(MOVE[m],R),key=N.join();if(dist[key]==null){dist[key]=d+1;q.push(N)}})}
      var mx=0;ALL.forEach(function(R){mx=Math.max(mx,dist[R.join()])});
      var par=Math.min(want,mx);if(par<1)return;
      if(best&&best.par>=par)return;
      var c=ALL.filter(function(R){return dist[R.join()]===par});
      best={T:T,k:k,tf:tf,ts:ts,dist:dist,par:par,start:c[Math.floor(rnd()*c.length)],two:two,
            nameF:k%2?obj.b:obj.a,nameS:k%2?obj.a:obj.b}});
    return best}
  function wantPar(level){return level===0?1:level<7?2:3}
  function isTwo(level){return level>=4}

  /* ---------- 상태 ---------- */
  var obj,pz,R,anim,queued,phase,solveT,ent,level,time,moves,streak,stuck,T,btnHold,confetti,chimes,motes,catJoy,blink,lastTick,flash,btnFl,play;
  var BTN=[{d:'left',x:34,y:455},{d:'right',x:326,y:455},{d:'up',x:180,y:362},{d:'down',x:180,y:548}];
  var OC={x:180,y:455,s:19};
  function setup(){obj=objectFor(level,Math.random);prepFaces(obj);
    pz=makePuzzle(obj,isTwo(level),wantPar(level),Math.random,level===0?0:null);
    if(!pz){obj=build('heart','stair',null,null,obj.col);prepFaces(obj);pz=makePuzzle(obj,isTwo(level),wantPar(level),Math.random,null)}
    pz.segF=segs(pz.tf);pz.segS=segs(pz.ts);R=pz.start;anim=null;queued=null;phase='play';ent=0;moves=0;stuck=0}
  function prepFaces(o){var set={},f=[],N=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    o.vox.forEach(function(v){set[v.join()]=1});
    o.vox.forEach(function(v){N.forEach(function(n){if(set[[v[0]+n[0],v[1]+n[1],v[2]+n[2]].join()])return;
      var ax=n[0]?0:n[1]?1:2,b=(ax+1)%3,c=(ax+2)%3,pts=[],sg=[[-1,-1],[1,-1],[1,1],[-1,1]];
      for(var i=0;i<4;i++){var p=[v[0],v[1],v[2]];p[ax]+=n[ax]*.5;p[b]+=sg[i][0]*.5;p[c]+=sg[i][1]*.5;pts.push(p)}
      f.push({p:pts,n:n,c:[v[0]+n[0]*.5,v[1]+n[1]*.5,v[2]+n[2]*.5]})})});o.faces=f}
  function segs(m){var out=[];function on(u,v){return u>=0&&u<5&&v>=0&&v<5&&(m>>(v*5+u)&1)}
    for(var v=0;v<5;v++)for(var u=0;u<5;u++)if(on(u,v)){
      if(!on(u-1,v))out.push([u,v,u,v+1]);if(!on(u+1,v))out.push([u+1,v,u+1,v+1]);
      if(!on(u,v-1))out.push([u,v,u+1,v]);if(!on(u,v+1))out.push([u,v+1,u+1,v+1])}return out}
  function matched(){return mask(obj.vox,R,0)===pz.tf&&(!pz.two||mask(obj.vox,R,1)===pz.ts)}
  function rotM(ax,a){var c=Math.cos(a),s=Math.sin(a);return ax==='y'?[c,0,-s,0,1,0,s,0,c]:[1,0,0,0,c,-s,0,s,c]}
  var AX={right:['y',1],left:['y',-1],up:['x',1],down:['x',-1]};
  function ease(t){return t*t*(3-2*t)}
  function worldM(){if(!anim)return R;var d=AX[anim.d];return mul(rotM(d[0],d[1]*ease(Math.min(1,anim.t))*Math.PI/2),R)}
  function L(a,ko,en){return a.lang==='ko'?ko:en}

  function startMove(d,a){anim={d:d,t:0};a.beep(d==='left'||d==='right'?250:290,.12,'sine');a.beep(520,.05,'sine')}
  function solve(a){phase='solved';solveT=1.05;flash=1;catJoy=1.4;
    var perfect=moves<=pz.par;streak=perfect?streak+1:0;
    var pts=10+(perfect?10:moves<=pz.par+2?5:0)+Math.min(streak,5)*2;a.add(pts);
    time=Math.min(60,time+Math.max(3,8-.35*level));
    [523,659,784,1047,1319].forEach(function(f,i){chimes.push({t:i*.075,f:f})});
    var nm=SIL[pz.nameF]?SIL[pz.nameF][a.lang]:L(a,'수수께끼','Mystery');
    a.pop(180,388,(perfect?L(a,'완벽! ','Perfect! '):'')+nm+' +'+pts,'#fff2b0');
    a.burst(180,200,'#ffd76a',14);
    var cc=['#e8546b','#f2c14e','#6fc3b2','#7fa8e8','#f7f0dc','#f08a4b'];
    for(var i=0;i<46;i++)confetti.push({x:40+Math.random()*280,y:60+Math.random()*40,vx:(Math.random()-.5)*120,vy:-40-Math.random()*160,
      r:Math.random()*6,vr:(Math.random()-.5)*14,c:cc[i%cc.length],l:1.4+Math.random()*.9,t:0,w:4+Math.random()*5})}

  /* ---------- 그리기 도우미 ---------- */
  var paperCache={};
  function paper(w,h){var k=w+'x'+h;if(paperCache[k])return paperCache[k];
    var c=document.createElement('canvas');c.width=w;c.height=h;var g=c.getContext('2d');
    var gr=g.createRadialGradient(w/2,h*.62,10,w/2,h*.55,Math.max(w,h)*.8);
    gr.addColorStop(0,'#fff6d8');gr.addColorStop(.55,'#f3dfae');gr.addColorStop(1,'#c9a366');g.fillStyle=gr;g.fillRect(0,0,w,h);
    for(var i=0;i<Math.floor(w*h/260);i++){var x=Math.random()*w,y=Math.random()*h,a=Math.random()*6.28,l=4+Math.random()*14;
      g.strokeStyle=Math.random()<.5?'rgba(255,255,255,.22)':'rgba(120,80,30,.10)';g.lineWidth=.6+Math.random()*.6;
      g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(a)*l*.5+2,y+Math.sin(a)*l*.5,x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
    paperCache[k]=c;return c}
  function papers(){return pz.two?[{x:26,y:74,w:148,h:250,cell:20,kind:0},{x:186,y:74,w:148,h:250,cell:20,kind:1}]
                          :[{x:26,y:74,w:308,h:250,cell:33,kind:0}]}
  function hull(p){p.sort(function(a,b){return a[0]-b[0]||a[1]-b[1]});var h=[],i,n;
    function cr(o,a,b){return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])}
    for(i=0;i<p.length;i++){while(h.length>=2&&cr(h[h.length-2],h[h.length-1],p[i])<=0)h.pop();h.push(p[i])}
    n=h.length+1;for(i=p.length-2;i>=0;i--){while(h.length>=n&&cr(h[h.length-2],h[h.length-1],p[i])<=0)h.pop();h.push(p[i])}
    h.pop();return h}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  var FONT='Jua, system-ui, sans-serif';

  function drawShadow(g,p,M,al){var cx=p.x+p.w/2,cy=p.y+p.h/2,s=p.cell,i;
    g.save();g.beginPath();g.rect(p.x,p.y,p.w,p.h);g.clip();
    /* 목표 영역 옅은 색 */
    var tm=p.kind?pz.ts:pz.tf,sg=p.kind?pz.segS:pz.segF,done=phase==='solved';
    g.fillStyle=done?'rgba(255,205,90,.30)':'rgba(196,70,50,.10)';
    for(i=0;i<25;i++)if(tm>>i&1)g.fillRect(cx+((i%5)-2.5)*s,cy-(Math.floor(i/5)-1.5)*s,s,s);
    /* 그림자 */
    g.beginPath();
    if(anim){obj.vox.forEach(function(v){var pts=[],a,b,c;
        for(a=-.5;a<1;a++)for(b=-.5;b<1;b++)for(c=-.5;c<1;c++){var x=v[0]+a,y=v[1]+b,z=v[2]+c;
          var X=M[0]*x+M[1]*y+M[2]*z,Y=M[3]*x+M[4]*y+M[5]*z,Z=M[6]*x+M[7]*y+M[8]*z;pts.push([cx+(p.kind?-Z:X)*s,cy-Y*s])}
        var h=hull(pts);g.moveTo(h[0][0],h[0][1]);for(var k=1;k<h.length;k++)g.lineTo(h[k][0],h[k][1]);g.closePath()})}
    else{var m=mask(obj.vox,R,p.kind);for(i=0;i<25;i++)if(m>>i&1)g.rect(cx+((i%5)-2.5)*s,cy-(Math.floor(i/5)-1.5)*s,s,s)}
    g.globalAlpha=al;g.shadowColor='rgba(45,26,18,.9)';g.shadowBlur=9;g.fillStyle=done?'rgba(58,34,20,.86)':'rgba(45,26,18,.80)';g.fill();
    g.shadowBlur=0;g.globalAlpha=1;
    /* 힌트: 8초 이상 막히면 어긋난 칸 표시 */
    if(!anim&&!done&&stuck>8){var cur=mask(obj.vox,R,p.kind),pu=.35+.3*Math.sin(T*5);
      for(i=0;i<25;i++){var a=cur>>i&1,b=tm>>i&1;if(a===b)continue;
        g.fillStyle=a?'rgba(235,70,60,'+pu+')':'rgba(255,200,60,'+pu+')';
        rr(g,cx+((i%5)-2.5)*s+3,cy-(Math.floor(i/5)-1.5)*s+3,s-6,s-6,4);g.fill()}}
    /* 목표 점선 윤곽 */
    function path(){g.beginPath();sg.forEach(function(e){g.moveTo(cx+(e[0]-2.5)*s,cy-(e[1]-2.5)*s);g.lineTo(cx+(e[2]-2.5)*s,cy-(e[3]-2.5)*s)})}
    g.lineCap='round';path();g.strokeStyle='rgba(255,248,225,.75)';g.lineWidth=5;g.stroke();
    if(done){g.strokeStyle='#ffc94a';g.lineWidth=3.5;g.shadowColor='#ffd76a';g.shadowBlur=14*flash+4;g.stroke();g.shadowBlur=0}
    else{g.setLineDash([7,6]);g.lineDashOffset=-T*8;g.strokeStyle='#c8402c';g.lineWidth=2.5;g.stroke();g.setLineDash([])}
    g.restore()}

  var CAM=mul(rotM('x',-.46),rotM('y',.56));
  function drawObject(g,M,sc,bob,two,fl){var F=mul(CAM,M),fs=obj.faces,list=[],i,j,s=OC.s*sc,cx=OC.x,cy=OC.y+bob,col=obj.col;
    for(i=0;i<fs.length;i++){var f=fs[i],n=f.n,nz=F[6]*n[0]+F[7]*n[1]+F[8]*n[2];if(nz>=-.02)continue;
      var c=f.c,z=F[6]*c[0]+F[7]*c[1]+F[8]*c[2];list.push({f:f,z:z})}
    list.sort(function(a,b){return b.z-a.z});
    g.lineJoin='round';g.lineWidth=1;
    for(i=0;i<list.length;i++){var f2=list[i].f,n2=f2.n;
      var wx=M[0]*n2[0]+M[1]*n2[1]+M[2]*n2[2],wy=M[3]*n2[0]+M[4]*n2[1]+M[5]*n2[2],wz=M[6]*n2[0]+M[7]*n2[1]+M[8]*n2[2];
      var fr=Math.max(0,-wz),tp=Math.max(0,wy),lf=Math.max(0,-wx);
      var I=.36+.56*fr*fl+.20*tp+(two?.40:.12)*lf;
      var r=col[0]*I+34*fr*fl+(two?-18*lf:0),gg=col[1]*I+22*fr*fl+(two?26*lf:0),b=col[2]*I+(two?52*lf:0);
      g.fillStyle='rgb('+Math.min(255,r|0)+','+Math.min(255,gg|0)+','+Math.min(255,b|0)+')';
      g.beginPath();for(j=0;j<4;j++){var p=f2.p[j],X=F[0]*p[0]+F[1]*p[1]+F[2]*p[2],Y=F[3]*p[0]+F[4]*p[1]+F[5]*p[2],Z=F[6]*p[0]+F[7]*p[1]+F[8]*p[2],k=1/(1+Z*.035);
        if(j)g.lineTo(cx+X*s*k,cy-Y*s*k);else g.moveTo(cx+X*s*k,cy-Y*s*k)}
      g.closePath();g.fill();g.strokeStyle='rgba(50,24,14,.38)';g.stroke()}}

  function drawCat(g,a){var x=46,y=612,joy=catJoy>0,worry=time<10&&phase==='play',hop=joy?Math.abs(Math.sin(T*14))*7:0;y-=hop;
    /* 조종 막대를 든 앞발 */
    g.strokeStyle='#8a5a34';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(80,600-hop);g.lineTo(OC.x-30,OC.y+70);g.stroke();
    g.fillStyle='#4a4152';g.beginPath();g.moveTo(x-24,y-18);g.lineTo(x-20,y-46);g.lineTo(x-2,y-26);g.fill();
    g.beginPath();g.moveTo(x+24,y-18);g.lineTo(x+20,y-46);g.lineTo(x+2,y-26);g.fill();
    g.fillStyle='#f3a6b0';g.beginPath();g.moveTo(x-19,y-24);g.lineTo(x-18,y-38);g.lineTo(x-9,y-28);g.fill();
    g.beginPath();g.moveTo(x+19,y-24);g.lineTo(x+18,y-38);g.lineTo(x+9,y-28);g.fill();
    g.fillStyle='#4a4152';g.beginPath();g.ellipse(x,y,31,27,0,0,7);g.fill();
    g.fillStyle='#f6ead2';g.beginPath();g.ellipse(x,y+10,13,9,0,0,7);g.fill();
    g.fillStyle='#e58a96';g.beginPath();g.moveTo(x-3,y+4);g.lineTo(x+3,y+4);g.lineTo(x,y+8);g.fill();
    var dx=OC.x-x,dy=OC.y-y,d=Math.hypot(dx,dy),ex=dx/d*2.6,ey=dy/d*2.6;
    [-12,12].forEach(function(o){
      if(joy){g.strokeStyle='#ffe9a8';g.lineWidth=2.5;g.beginPath();g.arc(x+o,y-4,5,Math.PI*1.1,Math.PI*1.9);g.stroke()}
      else if(blink<.12){g.strokeStyle='#ffe9a8';g.lineWidth=2;g.beginPath();g.moveTo(x+o-5,y-5);g.lineTo(x+o+5,y-5);g.stroke()}
      else{g.fillStyle='#ffe9a8';g.beginPath();g.ellipse(x+o,y-5,6,worry?7.5:6.5,0,0,7);g.fill();
        g.fillStyle='#2a2030';g.beginPath();g.ellipse(x+o+ex,y-5+ey,2.4,worry?2.4:4,0,0,7);g.fill()}});
    g.strokeStyle='rgba(246,234,210,.7)';g.lineWidth=1;g.beginPath();g.moveTo(x-14,y+9);g.lineTo(x-34,y+6);g.moveTo(x-14,y+12);g.lineTo(x-33,y+15);
    g.moveTo(x+14,y+9);g.lineTo(x+34,y+6);g.moveTo(x+14,y+12);g.lineTo(x+33,y+15);g.stroke();
    if(worry){g.fillStyle='#9fd8ff';g.beginPath();g.ellipse(x+26,y-18+((T*30)%10),2.5,4,0,0,7);g.fill()}
    g.fillStyle='#4a4152';g.beginPath();g.ellipse(78,603-hop,9,7,-.4,0,7);g.fill()}

  function drawLamp(g,x,y,c1,c2,fl,rot){g.save();g.translate(x,y);g.rotate(rot);
    var gr=g.createRadialGradient(0,-8,2,0,-8,54);gr.addColorStop(0,c1);gr.addColorStop(1,c2);
    g.globalAlpha=.55*fl;g.fillStyle=gr;g.beginPath();g.arc(0,-8,54,0,7);g.fill();g.globalAlpha=1;
    g.fillStyle='#2c2420';g.beginPath();g.moveTo(-13,14);g.lineTo(13,14);g.lineTo(9,2);g.lineTo(-9,2);g.fill();
    g.fillStyle='#5a4638';rr(g,-11,-2,22,5,2);g.fill();
    g.fillStyle=c1;g.beginPath();g.arc(0,-9,8,0,7);g.fill();g.fillStyle='#fff';g.globalAlpha=.8;g.beginPath();g.arc(-2,-11,3,0,7);g.fill();g.restore()}

  function draw(g,a){var W=a.W,H=a.H,i,fl=.93+.07*Math.sin(T*13)*Math.sin(T*7.3);
    var bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#2a1712');bg.addColorStop(.6,'#3a2118');bg.addColorStop(1,'#1c100c');
    g.fillStyle=bg;g.fillRect(-20,-20,W+40,H+40);
    /* 무대 바닥 */
    g.fillStyle='#5b3a24';g.fillRect(-20,566,W+40,100);g.fillStyle='#74492c';g.fillRect(-20,566,W+40,5);
    g.strokeStyle='rgba(30,15,8,.35)';g.lineWidth=1;for(i=0;i<8;i++){g.beginPath();g.moveTo(i*52-10,571);g.lineTo(i*60-40,H+20);g.stroke()}
    /* 나무 틀 + 종이 */
    var wg=g.createLinearGradient(0,60,0,340);wg.addColorStop(0,'#9a6238');wg.addColorStop(1,'#6e4224');
    g.fillStyle='rgba(0,0,0,.35)';rr(g,12,66,336,278,8);g.fill();
    g.fillStyle=wg;rr(g,14,62,332,274,8);g.fill();
    g.strokeStyle='rgba(255,220,170,.18)';g.lineWidth=1;for(i=0;i<5;i++){g.beginPath();g.moveTo(18,68+i*2.4);g.lineTo(342,68+i*2.4+((i*7)%3));g.stroke()}
    var ps=papers();
    ps.forEach(function(p){g.drawImage(paper(p.w,p.h),p.x,p.y);
      g.fillStyle='rgba(255,236,170,'+(.10*fl)+')';g.fillRect(p.x,p.y,p.w,p.h);
      if(p.kind){g.fillStyle='rgba(90,200,210,.10)';g.fillRect(p.x,p.y,p.w,p.h)}});
    var M=worldM(),sc=1,al=1;
    if(phase==='solved'&&solveT<.3){sc=Math.max(0,solveT/.3);al=sc}
    else if(ent<1){var e=ent-1;sc=1+2.2*e*e*e+1.2*e*e;al=Math.min(1,ent*1.6)}
    ps.forEach(function(p){drawShadow(g,p,M,al);
      g.strokeStyle='rgba(60,30,12,.55)';g.lineWidth=2;g.strokeRect(p.x,p.y,p.w,p.h)});
    if(pz.two){[[100,'#ffcf6a'],[260,'#6fe0e0']].forEach(function(c){g.fillStyle='#3a2416';g.beginPath();g.arc(c[0],68,7,0,7);g.fill();
        g.fillStyle=c[1];g.beginPath();g.arc(c[0],68,4.5,0,7);g.fill()})}
    /* 커튼 */
    var cg=g.createLinearGradient(0,0,0,60);cg.addColorStop(0,'#7e1626');cg.addColorStop(1,'#b3243a');
    g.fillStyle=cg;g.beginPath();g.moveTo(-20,-20);g.lineTo(W+20,-20);g.lineTo(W+20,40);
    for(i=6;i>=0;i--){g.quadraticCurveTo(i*60+30-30+30,66,i*60-30+30,40)}g.lineTo(-20,40);g.fill();
    g.strokeStyle='#f2c14e';g.lineWidth=2;g.beginPath();g.moveTo(W+20,40);for(i=6;i>=0;i--)g.quadraticCurveTo(i*60+30,66,i*60,40);g.stroke();
    [0,W-13].forEach(function(x){var sg2=g.createLinearGradient(x,0,x+13,0);sg2.addColorStop(0,'#7e1626');sg2.addColorStop(.5,'#c22c44');sg2.addColorStop(1,'#7e1626');
      g.fillStyle=sg2;g.fillRect(x,30,13,330);g.fillStyle='#f2c14e';g.fillRect(x-1,300,15,5)});
    /* 빛 원뿔 + 먼지 */
    var lg=g.createLinearGradient(0,590,0,330);lg.addColorStop(0,'rgba(255,214,130,'+(.26*fl)+')');lg.addColorStop(1,'rgba(255,214,130,.03)');
    g.fillStyle=lg;g.beginPath();g.moveTo(172,592);g.lineTo(188,592);g.lineTo(336,336);g.lineTo(24,336);g.fill();
    if(pz.two){var tg=g.createLinearGradient(30,0,330,0);tg.addColorStop(0,'rgba(110,224,224,'+(.24*fl)+')');tg.addColorStop(1,'rgba(110,224,224,0)');
      g.fillStyle=tg;g.beginPath();g.moveTo(34,396);g.lineTo(34,404);g.lineTo(300,540);g.lineTo(300,372);g.fill()}
    for(i=0;i<motes.length;i++){var m=motes[i],py=590-((m.y+T*m.v)%250),half=(590-py)/250*150+8,px=180+m.x*half+Math.sin(T*m.w+i)*6;
      g.fillStyle='rgba(255,236,180,'+(.25+.3*Math.sin(T*2+i))+')';g.beginPath();g.arc(px,py,m.r,0,7);g.fill()}
    /* 마스코트(막대) → 물체 */
    drawCat(g,a);
    if(flash>0){var fg=g.createRadialGradient(OC.x,OC.y,10,OC.x,OC.y,120);fg.addColorStop(0,'rgba(255,226,130,'+(.55*flash)+')');fg.addColorStop(1,'rgba(255,226,130,0)');
      g.fillStyle=fg;g.beginPath();g.arc(OC.x,OC.y,120,0,7);g.fill()}
    g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(OC.x,560,58*sc,9*sc,0,0,7);g.fill();
    var bob=Math.sin(T*1.7)*4-(phase==='solved'?(1.05-solveT)*26:0);
    if(sc>.02)drawObject(g,M,sc,bob,pz.two,fl);
    drawLamp(g,180,612,'#ffe2a0','rgba(255,190,90,0)',fl,0);
    if(pz.two)drawLamp(g,22,400,'#9ff0ee','rgba(90,210,215,0)',fl,Math.PI/2);
    /* 버튼 */
    BTN.forEach(function(b,k){var f=btnFl[k];g.fillStyle=f>0?'rgba(255,214,120,.55)':'rgba(255,240,210,.14)';g.beginPath();g.arc(b.x,b.y,21,0,7);g.fill();
      g.strokeStyle='rgba(255,236,190,.55)';g.lineWidth=1.5;g.stroke();
      g.save();g.translate(b.x,b.y);g.rotate({right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[b.d]);
      g.fillStyle='rgba(255,244,220,.9)';g.beginPath();g.moveTo(9,0);g.lineTo(-5,-8);g.lineTo(-5,8);g.fill();g.restore()});
    /* 타이머 */
    var tw=200,tx=80,tr=Math.max(0,time)/60,low=time<10;
    g.fillStyle='rgba(20,8,6,.55)';rr(g,tx-2,46,tw+4,10,5);g.fill();
    g.fillStyle=low?(Math.sin(T*10)>0?'#ff6b5a':'#ffb09a'):'#ffcf6a';if(tr>0){rr(g,tx,48,Math.max(6,tw*tr),6,3);g.fill()}
    g.font='15px '+FONT;g.textAlign='left';g.textBaseline='middle';g.fillStyle=low?'#ffb0a0':'#fff6dc';g.fillText(Math.ceil(Math.max(0,time))+'s',tx+tw+8,52);
    /* 정보 */
    g.textAlign='right';g.font='14px '+FONT;g.fillStyle='rgba(255,236,200,.85)';
    g.fillText(L(a,(level+1)+'막',' Act '+(level+1)),346,572);
    g.fillStyle=moves>pz.par?'rgba(255,190,160,.85)':'rgba(190,240,190,.9)';
    g.fillText(L(a,'이동 '+moves+' / 목표 '+pz.par,'Moves '+moves+' / Par '+pz.par),300,592+16);
    if(streak>1){g.fillStyle='#ffd76a';g.fillText(L(a,'연속 완벽 x'+streak,'Perfect streak x'+streak),346,552)}
    var hint=level===0?L(a,'돌려서 그림자를 맞춰요','Rotate to match the shadow'):level===4?L(a,'두 그림자를 동시에 맞춰요!','Match both shadows at once!'):null;
    if(hint&&phase==='play'&&play){g.font='16px '+FONT;g.textAlign='center';var w2=g.measureText(hint).width+24;
      g.fillStyle='rgba(50,24,14,.82)';rr(g,180-w2/2,296,w2,26,13);g.fill();g.fillStyle='#fff2cf';g.fillText(hint,180,310)}
    g.textBaseline='alphabetic';
    /* 종이 꽃가루 */
    for(i=0;i<confetti.length;i++){var c=confetti[i];g.save();g.translate(c.x,c.y);g.rotate(c.r);g.globalAlpha=Math.min(1,(c.l-c.t)*2);
      g.fillStyle=c.c;g.fillRect(-c.w/2,-c.w/3*Math.cos(c.t*9+i),c.w,c.w*.66*Math.cos(c.t*9+i));g.restore()}
    g.globalAlpha=1}

  var game={
    id:'shadow-match',
    title:{ko:'그림자 극장',en:'Shadow Theatre'},
    how:{ko:'밀거나 방향키로 물체를 돌려 그림자를 점선에 맞춰요',en:'Swipe or use arrow keys to rotate the object until its shadow fits the outline'},
    init:function(a){level=0;time=40;streak=0;T=0;btnHold=false;confetti=[];chimes=[];catJoy=0;blink=3;lastTick=99;flash=0;btnFl=[0,0,0,0];play=false;
      motes=[];for(var i=0;i<22;i++)motes.push({x:Math.random()*2-1,y:Math.random()*250,v:6+Math.random()*12,w:.5+Math.random(),r:.7+Math.random()*1.3});
      setup();ent=1},
    update:function(dt,inp,a){var i,mv=null;play=true;
      if(inp.tap&&inp.down&&inp.x!=null){for(i=0;i<4;i++)if(Math.hypot(inp.x-BTN[i].x,inp.y-BTN[i].y)<26){mv=BTN[i].d;btnHold=true;btnFl[i]=.18}}
      if(inp.swipe&&!(btnHold&&inp.x!=null))mv=inp.swipe;
      if(!inp.down)btnHold=false;
      if(phase==='play'){
        if(mv){if(anim)queued=mv;else startMove(mv,a)}
        if(anim){anim.t+=dt/.2;if(anim.t>=1){R=mul(MOVE[anim.d],R);anim=null;moves++;stuck=Math.min(stuck,stuck>8?5:stuck);
            if(matched()){queued=null;solve(a)}else if(queued){startMove(queued,a);queued=null}}}
        if(phase==='play'){time-=dt;stuck+=dt;
          if(time<10&&Math.ceil(time)<lastTick&&time>0){a.beep(880,.04,'square')}
          lastTick=Math.ceil(time);a.tempo(time<12?1.35:1+Math.min(.2,level*.02));
          if(time<=0){time=0;a.over();return}}
      }else{solveT-=dt;if(solveT<=0){level++;setup()}}
      for(i=chimes.length-1;i>=0;i--){chimes[i].t-=dt;if(chimes[i].t<=0){a.beep(chimes[i].f,.22,'triangle');chimes.splice(i,1)}}
    },
    draw:function(g,a,dt){dt=dt||.016;T+=dt;if(ent<1)ent=Math.min(1,ent+dt/.38);
      flash=Math.max(0,flash-dt*1.3);catJoy=Math.max(0,catJoy-dt);blink-=dt;if(blink<0)blink=2+Math.random()*3;
      for(var i=0;i<4;i++)btnFl[i]=Math.max(0,btnFl[i]-dt);
      for(i=confetti.length-1;i>=0;i--){var c=confetti[i];c.t+=dt;if(c.t>c.l){confetti.splice(i,1);continue}
        c.vy+=260*dt;c.vx*=.985;c.x+=c.vx*dt+Math.sin(c.t*6+i)*.6;c.y+=Math.min(c.vy,150)*dt;c.r+=c.vr*dt}
      draw(g,a)},
    _logic:{SIL:SIL,HAND:HAND,ALL:ALL,MOVE:MOVE,DIRS:DIRS,mul:mul,mask:mask,build:build,objectFor:objectFor,makePuzzle:makePuzzle,wantPar:wantPar,isTwo:isTwo}
  };
  /* 스크린샷/검증용 훅: ?smdbg=1 일 때만 */
  if(typeof location!=='undefined'&&/[?&]smdbg=1/.test(location.search))window.__sm={
    next:function(){var d=pz.dist[R.join()],r=null;DIRS.forEach(function(m){if(pz.dist[mul(MOVE[m],R).join()]<d)r=m});return r},
    goto:function(n){level=n;setup()},state:function(){return{level:level,par:pz.par,moves:moves,phase:phase,time:time,two:pz.two}}};
  SG.run(game);
})();
