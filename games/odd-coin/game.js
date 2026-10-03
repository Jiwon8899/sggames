/* 수상한 저울 (The Odd Coin) — 양팔저울로 가짜를 찾는 추리 게임.
   가짜는 미리 정해지지 않는다: 저울을 잴 때마다 "가장 버티기 좋은" 결과를 내놓는 적대적 상대(adversary)라서
   후보가 하나로 좁혀지기 전에는 절대 맞힐 수 없다. 논리(L)는 DOM 없이 돌아간다(node 검증용 module.exports). */
(function(){
  'use strict';

  /* ================= 논리 (headless) ================= */
  var L=(function(){
    function sgn(v){return v>0?1:v<0?-1:0}
    function pc(v){var c=0;while(v){v&=v-1;c++}return c}
    function p3(k){return Math.pow(3,k)}
    /* 가설 = {f:[가짜 인덱스들], s:+1 무거움 / -1 가벼움, id} */
    function initHyps(sp){var h=[],i,j,n=sp.n;
      if(sp.kind==='2'){for(i=0;i<n;i++)for(j=i+1;j<n;j++)h.push({f:[i,j],s:1,id:h.length})}
      else for(i=0;i<n;i++){if(sp.kind!=='L')h.push({f:[i],s:1,id:h.length});if(sp.kind!=='H')h.push({f:[i],s:-1,id:h.length})}
      return h}
    /* +1 왼쪽이 무겁다, 0 균형, -1 오른쪽이 무겁다 */
    function outc(h,lm,rm){var c=0,i,b;for(i=0;i<h.f.length;i++){b=1<<h.f[i];if(lm&b)c++;else if(rm&b)c--}return sgn(c)*h.s}
    function key(h){return h.f.join(',')}
    function cands(hyps){var s={},n=0,i,k;for(i=0;i<hyps.length;i++){k=key(hyps[i]);if(!s[k]){s[k]=1;n++}}return n}
    function flags(hyps,N){var fl=new Uint8Array(N),i,j,h;
      for(i=0;i<hyps.length;i++){h=hyps[i];for(j=0;j<h.f.length;j++)fl[h.f[j]]|=h.s>0?1:2}return fl}
    function counts(hyps,N){var fl=flags(hyps,N),c=[0,0,0,0],i;
      for(i=0;i<N;i++)c[fl[i]===3?0:fl[i]===1?1:fl[i]===2?2:3]++;return c}

    /* --- 가짜 1개: (양쪽 가능, 무거움만, 가벼움만, 결백) 개수 상태로 최소 횟수 탐색 --- */
    var memo={};
    function canC(hl,h,l,g,k,M){var n=hl+h+l;if(n<=1)return true;if(k<=0||n>p3(k))return false;
      var ky=hl+','+h+','+l+','+g+','+k+','+M,r=memo[ky];if(r!==undefined)return r;
      return memo[ky]=findC(hl,h,l,g,k,M)!==null}
    function findC(hl,h,l,g,k,M){var a1,a2,a3,b1,b2,b3,sa,sb,d,a4,b4,cap=M||99,T=hl+h+l+g,cur=2*hl+h+l;
      function ok(o){var c=2*o[0]+o[1]+o[2];if(c===0)return true;if(c===cur)return false;
        return canC(o[0],o[1],o[2],T-o[0]-o[1]-o[2],k-1,M)}
      for(a1=0;a1<=hl;a1++)for(a2=0;a2<=h;a2++)for(a3=0;a3<=l;a3++){sa=a1+a2+a3;if(sa>cap)continue;
        for(b1=0;b1<=hl-a1;b1++)for(b2=0;b2<=h-a2;b2++)for(b3=0;b3<=l-a3;b3++){sb=b1+b2+b3;if(sb>cap)continue;
          d=sa-sb;a4=d<0?-d:0;b4=d>0?d:0;if(a4+b4>g||sa+a4===0)continue;
          if(ok([hl-a1-b1,h-a2-b2,l-a3-b3])&&ok([0,a1+a2,b1+b3])&&ok([0,b1+b2,a1+a3]))return [a1,a2,a3,a4,b1,b2,b3,b4]}}
      return null}
    /* --- 가짜 2개(작은 N): 가설 비트마스크 전수 탐색 --- */
    var gm={};
    function gen(N,M){var ky=N+'|'+(M||0);if(gm[ky])return gm[ky];
      var pairs=[],i,j,ws=[],full=1<<N,lm,rm,c;
      for(i=0;i<N;i++)for(j=i+1;j<N;j++)pairs.push((1<<i)|(1<<j));
      for(lm=1;lm<full;lm++)for(rm=lm+1;rm<full;rm++){if(lm&rm)continue;c=pc(lm);if(c!==pc(rm)||(M&&c>M))continue;
        var m=[0,0,0];for(i=0;i<pairs.length;i++)m[sgn(pc(pairs[i]&lm)-pc(pairs[i]&rm))+1]|=1<<i;ws.push({l:lm,r:rm,m:m})}
      return gm[ky]={ws:ws,memo:{}}}
    function canG(G,mask,k){var n=pc(mask);if(n<=1)return true;if(k<=0||n>p3(k))return false;
      var ky=mask*8+k,r=G.memo[ky];if(r!==undefined)return r;return G.memo[ky]=findG(G,mask,k)!==null}
    function findG(G,mask,k){for(var i=0;i<G.ws.length;i++){var w=G.ws[i],a=mask&w.m[0],b=mask&w.m[1],c=mask&w.m[2];
        if(a===mask||b===mask||c===mask)continue;if(canG(G,a,k-1)&&canG(G,b,k-1)&&canG(G,c,k-1))return w}return null}
    function hmask(hyps){var m=0,i;for(i=0;i<hyps.length;i++)m|=1<<hyps[i].id;return m}

    /* 이 가설 집합에서 확신까지 필요한 최소 저울질 횟수 */
    function need(st,hyps){var k,M=st.sp.cap||0;
      if(st.sp.kind==='2'){var G=gen(st.sp.n,M),m=hmask(hyps);for(k=0;k<9;k++)if(canG(G,m,k))return k;return 99}
      var c=counts(hyps,st.N);for(k=0;k<9;k++)if(canC(c[0],c[1],c[2],c[3],k,M))return k;return 99}
    function newRound(sp){var st={sp:sp,N:sp.n+(sp.ref?1:0),nf:sp.kind==='2'?2:1,hist:[]};
      st.all=initHyps(sp);st.hyps=st.all.slice();st.K=need(st,st.hyps);return st}
    /* 적대적 저울: 남은 가설을 세 결과로 나누고, 플레이어에게 가장 불리한(더 많은 저울질이 필요한 → 더 큰) 쪽을 택한다 */
    function weigh(st,lm,rm,rnd){var parts=[[],[],[]],i,o,best=-1,bo=[];
      for(i=0;i<st.hyps.length;i++)parts[outc(st.hyps[i],lm,rm)+1].push(st.hyps[i]);
      for(o=0;o<3;o++){if(!parts[o].length)continue;var sc=need(st,parts[o])*1000+parts[o].length;
        if(sc>best){best=sc;bo=[o]}else if(sc===best)bo.push(o)}
      o=bo[Math.floor((rnd||Math.random)()*bo.length)];st.hyps=parts[o];st.hist.push({l:lm,r:rm,o:o-1});return o-1}
    /* 지목: 후보가 정확히 하나로 좁혀졌고 그걸 골랐을 때만 정답 */
    function accuse(st,items,rnd){var k=items.slice().sort(function(a,b){return a-b}).join(','),r=rnd||Math.random,
        ok=cands(st.hyps)===1&&key(st.hyps[0])===k,pool=st.hyps.filter(function(h){return ok?true:key(h)!==k});
      return {ok:ok,real:pool[Math.floor(r()*pool.length)]}}
    var FIXED=[{n:3,kind:'H'},{n:9,kind:'H'},{n:8,kind:'H'},{n:4,kind:'U'},{n:12,kind:'U',boss:1},{n:27,kind:'H'}];
    function spec(i,rnd){if(i<FIXED.length)return FIXED[i];rnd=rnd||Math.random;
      function ri(n){return Math.floor(rnd()*n)}
      for(var t=0;t<40;t++){var v=ri(6),sp=v===0?{n:5+ri(16),kind:rnd()<.5?'H':'L'}:v===1?{n:5+ri(8),kind:'U'}:
          v===2?{n:4+ri(10),kind:'U',ref:1}:v===3?{n:4+ri(3),kind:'2'}:v===4?{n:6+ri(7),kind:'H',cap:2+ri(2)}:{n:9+ri(10),kind:'L'};
        var K=newRound(sp).K;if(K>=2&&K<=4)return sp}
      return {n:9,kind:'H'}}
    return {initHyps:initHyps,outc:outc,cands:cands,flags:flags,counts:counts,canC:canC,findC:findC,gen:gen,canG:canG,findG:findG,
      hmask:hmask,need:need,newRound:newRound,weigh:weigh,accuse:accuse,spec:spec,FIXED:FIXED,key:key}
  })();
  if(typeof module!=='undefined'&&module.exports){module.exports=L;return}

  /* ================= 게임 ================= */
  var W=360,H=640,PX=180,PY=128,ARM=100,CH=88,TILT=.2,COUNTER=300;
  var BN={x:10,y:532,w:84,h:46},BW={x:102,y:528,w:156,h:54},BA={x:266,y:532,w:84,h:46};
  var G=null,A=null,pd=false,T0=0,pressQ=null;
  var TX={
    ko:{weigh:'재기!',acc:'지목',notes:'메모',on:'켬',off:'끔',
      H:'가짜 1개는 더 무거워요',Lt:'가짜 1개는 더 가벼워요',U:'가짜 1개 · 무겁거나 가벼워요',two:'가짜 2개 · 둘 다 무거워요',
      ref:' · ★은 진짜',cap:function(m){return ' · 접시당 '+m+'개까지'},
      h0:'양쪽 접시에 하나씩 올리고 재기!',hDef:'촛불이 다 꺼지기 전에 하나로 좁히세요',hAcc:'가짜를 콕 찍으세요!',hAcc2:'가짜 두 개를 찍으세요!',
      hEq:'양쪽 개수를 똑같이 맞추세요',hDup:'그건 이미 재 봤어요',hFull:'접시가 꽉 찼어요',hNo:'촛불이 없어요 — 지목하세요',
      hSure:'확실해질 때까지는 맞힐 수 없어요',hRef:'★은 진짜예요',hWrong:'땡! 가짜는 이쪽이었어요',
      lh:'왼쪽이 무거워요',rh:'오른쪽이 무거워요',eq:'균형!',ok:'정답!',boss:'전설의 12개 문제 해결!',hv:'무거운 가짜',lt:'가벼운 가짜',fk:'가짜'},
    en:{weigh:'Weigh!',acc:'Accuse',notes:'Notes',on:'ON',off:'OFF',
      H:'One fake — it is heavier',Lt:'One fake — it is lighter',U:'One fake — heavier OR lighter',two:'Two fakes — both heavier',
      ref:' · ★ is real',cap:function(m){return ' · max '+m+' per pan'},
      h0:'Put one on each pan, then Weigh!',hDef:'Narrow it to one before the candles go out',hAcc:'Tap the fake!',hAcc2:'Tap both fakes!',
      hEq:'Both pans need the same count',hDup:'You already tried that',hFull:'That pan is full',hNo:'No candles left — accuse',
      hSure:'You can only be right once you\'re certain',hRef:'★ is genuine',hWrong:'Nope! It was this one',
      lh:'Left is heavier',rh:'Right is heavier',eq:'Balanced!',ok:'Correct!',boss:'The legendary 12 solved!',hv:'heavy fake',lt:'light fake',fk:'fake'}};
  function tx(){return TX[A&&A.lang==='ko'?'ko':'en']}

  function cols(N){return N<=5?N:N<=10?5:N<=18?6:9}
  function tableSlot(i,N){var c=cols(N),rows=Math.ceil(N/c),sx=Math.min(50,324/c),row=Math.floor(i/c),n=row===rows-1?N-c*(rows-1):c,
      sy=rows>=3?46:52,y0=388-(rows-1)*sy/2-6;
    return [180+((i%c)-(n-1)/2)*sx,y0+row*sy]}
  function panPos(s){var a=G.beam.a,d=s===1?-1:1,ex=PX+Math.cos(a)*ARM*d,ey=PY+Math.sin(a)*ARM*d,p=G.sw[s-1].a;
    return [ex+Math.sin(p)*CH,ey+Math.cos(p)*CH,ex,ey]}
  function panSlot(s,k,n){var r=G.r,per=r<12?5:4,row=Math.floor(k/per),cnt=Math.min(per,n-row*per),p=panPos(s);
    return [p[0]+((k%per)-(cnt-1)/2)*(2*r+2),p[1]-r+5-row*(2*r+13)]}

  function setMsg(s,t){G.msg=s;G.msgT=t||2.2}
  function mood(m,t){G.rac=m;G.racT=t||1.6}
  function startRound(keepSpec){
    var sp=keepSpec?G.st.sp:L.spec(G.round),st=L.newRound(sp),i;
    G.st=st;G.used=0;G.pans=[[],[]];G.sel=-1;G.picks=[];G.acc=false;G.phase='intro';G.pt=.45;G.res=null;G.reveal=null;
    G.r=cols(st.N)>=9?11:13;G.theme=G.round%3;G.notesUsed=G.notes;
    G.beam={a:0,w:0,t:0,lock:true};G.sw=[{a:0,w:0},{a:0,w:0}];G.cur=0;
    G.items=[];for(i=0;i<st.N;i++){var s=tableSlot(i,st.N);G.items.push({i:i,loc:0,x:s[0]+(Math.random()-.5)*40,y:-20-Math.random()*60,ph:Math.random()*9})}
  }
  function init(a){A=a;T0=0;pressQ=null;pd=false;
    G={round:0,time:55,streak:0,notes:true,kb:false,msg:'',msgT:0,rac:'smug',racT:0,fx:[],drag:null,
       dust:[],t:0};
    for(var i=0;i<22;i++)G.dust.push({x:Math.random()*W,y:40+Math.random()*250,s:.4+Math.random()*1.2,p:Math.random()*7});
    startRound(false);window.__odd=G}

  function maskOf(arr){var m=0;for(var i=0;i<arr.length;i++)m|=1<<arr[i];return m}
  function relock(){if(!G.beam.lock){G.beam.lock=true;G.beam.t=0;G.res=null}}
  function place(i,loc){var it=G.items[i];if(!it||G.phase!=='play'||it.loc===loc)return false;
    var cap=G.st.sp.cap||10;
    if(loc>0&&G.pans[loc-1].length>=cap){setMsg(tx().hFull);A.beep(200,.08,'square');return false}
    if(it.loc>0){var p=G.pans[it.loc-1];p.splice(p.indexOf(i),1);G.sw[it.loc-1].w+=.8}
    it.loc=loc;if(loc>0){G.pans[loc-1].push(i);G.sw[loc-1].w+=(Math.random()-.5)*2.4}
    A.beep(1300+Math.random()*500,.05,'triangle');A.beep(2100+Math.random()*400,.04,'sine');relock();return true}
  function doWeigh(){if(G.phase!=='play')return;var t=tx(),a=G.pans[0],b=G.pans[1];
    if(G.used>=G.st.K){setMsg(t.hNo);A.beep(200,.08,'square');G.acc=true;return}
    if(!a.length||a.length!==b.length){setMsg(t.hEq);A.beep(200,.08,'square');mood('smug');return}
    var lm=maskOf(a),rm=maskOf(b),h=G.st.hist,i;
    for(i=0;i<h.length;i++)if((h[i].l===lm&&h[i].r===rm)||(h[i].l===rm&&h[i].r===lm)){setMsg(t.hDup);A.beep(200,.08,'square');return}
    var o=L.weigh(G.st,lm,rm);G.used++;G.sel=-1;
    var cx=candleX(G.st.K-G.used,G.st.K);for(i=0;i<7;i++)G.fx.push({x:cx,y:COUNTER-28,vx:(Math.random()-.5)*14,vy:-22-Math.random()*20,t:0,l:.9+Math.random()*.5,r:2+Math.random()*3});
    A.beep(140,.14,'sine');A.beep(95,.2,'sawtooth');
    G.beam.lock=false;G.beam.t=-o*TILT;G.beam.w+=(Math.random()-.5)*.5-o*.6;G.sw[0].w+=1.2;G.sw[1].w-=1.2;
    G.phase='weighing';G.pt=1.25;G.res={o:o,snd:0}}
  function pick(i){if(G.phase!=='play')return;var t=tx(),st=G.st;
    if(st.sp.ref&&i===st.N-1){setMsg(t.hRef);return}
    var k=G.picks.indexOf(i);if(k>=0){G.picks.splice(k,1);A.sfx('tap');return}
    G.picks.push(i);A.sfx('tap');if(G.picks.length<st.nf)return;
    var r=L.accuse(st,G.picks);G.reveal={ok:r.ok,real:r.real,picks:G.picks.slice()};G.phase='reveal';G.acc=false;relockSoft();
    var j,it;
    if(r.ok){var tier=Math.min(G.round+1,10),pts=10*tier+5*(st.K-G.used)+(G.notesUsed?0:10)+2*G.streak;G.streak++;
      A.add(pts);A.sfx('win');mood('wow',2);G.pt=st.sp.boss?2.4:1.4;
      for(j=0;j<G.picks.length;j++){it=G.items[G.picks[j]];A.burst(it.x,it.y,'#ffd75e',18);A.pop(it.x,it.y-24,'+'+Math.round(pts/G.picks.length),'#ffe89a')}
      A.pop(180,170,st.sp.boss?t.boss:t.ok,'#9dffb0');if(!G.notesUsed)A.pop(180,196,'NO-NOTES +10','#8fd8ff')}
    else{G.streak=0;G.time-=8;A.sfx('hit');A.shake(9);mood('smug',2.2);G.pt=1.7;
      setMsg(L.cands(st.hyps)>1?t.hSure:t.hWrong,3.4);
      for(j=0;j<G.picks.length;j++){it=G.items[G.picks[j]];A.burst(it.x,it.y,'#ff6b6b',10)}A.pop(180,170,'-8s','#ff8a8a')}}
  function relockSoft(){G.beam.t=0}
  function toggleNotes(){G.notes=!G.notes;if(G.notes)G.notesUsed=true;A.sfx('tap')}
  function inR(b,x,y){return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h}
  function zone(x,y){if(y>120&&y<COUNTER)return x<180?1:2;if(y>=COUNTER&&y<470)return 0;return -1}
  function hitItem(x,y){var b=-1,bd=1e9,i;for(i=0;i<G.items.length;i++){var it=G.items[i],d=Math.hypot(it.x-x,it.y-y);if(d<G.r+9&&d<bd){bd=d;b=i}}return b}

  if(!window.__oddCoinKeys){window.__oddCoinKeys=true;
    /* 누른 순간의 좌표를 정확히 잡는다(셸의 inp.x는 프레임 사이에 이미 움직였을 수 있다) */
    window.addEventListener('pointerdown',function(e){var c=e.target;if(!c||c.tagName!=='CANVAS')return;var r=c.getBoundingClientRect();
      pressQ=[(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H]},true);
    window.addEventListener('keydown',function(e){
      if(!G||!A||!window.__sg||!window.__sg.state().playing||e.repeat)return;
      var c=e.code,N=G.st.N,cl=cols(N),n=G.cur;
      if(c==='ArrowLeft')n--;else if(c==='ArrowRight')n++;else if(c==='ArrowUp')n-=cl;else if(c==='ArrowDown')n+=cl;
      else if(c==='Digit1'||c==='Numpad1'){G.kb=true;place(G.cur,1);return}
      else if(c==='Digit2'||c==='Numpad2'){G.kb=true;place(G.cur,2);return}
      else if(c==='Digit3'||c==='Numpad3'){G.kb=true;place(G.cur,0);return}
      else if(c==='Space'){doWeigh();return}
      else if(c==='KeyA'){G.kb=true;pick(G.cur);return}
      else if(c==='KeyN'){toggleNotes();return}
      else return;
      G.kb=true;if(n>=0&&n<N){G.cur=n;A.beep(700,.03,'sine')}})}

  function update(dt,inp,a){A=a;G.t+=dt;var t=tx(),i,it;
    if(G.msgT>0)G.msgT-=dt;if(G.racT>0)G.racT-=dt;
    /* 단계 진행 */
    if(G.phase==='intro'){G.pt-=dt;if(G.pt<=0)G.phase='play'}
    else if(G.phase==='weighing'){G.pt-=dt;var r=G.res,e=1.25-G.pt;
      while(r.snd<4&&e>r.snd*.11){var f=r.o===0?440:r.o>0?560-r.snd*70:330+r.snd*70;a.beep(f,.1,'triangle');r.snd++}
      if(G.pt<=0){G.phase='play';r.shown=true;a.beep(r.o===0?660:520,.12,'sine');
        mood(L.cands(G.st.hyps)===1?'wow':'smug',1.6);
        if(G.used>=G.st.K){G.acc=true;setMsg(G.st.nf>1?t.hAcc2:t.hAcc,3)}}}
    else if(G.phase==='reveal'){G.pt-=dt;
      if(G.reveal.ok&&G.st.sp.boss&&Math.random()<dt*9)a.burst(40+Math.random()*280,90+Math.random()*200,['#ffd75e','#ff8ab0','#8fd8ff','#9dffb0'][Math.floor(Math.random()*4)],8);
      if(G.pt<=0){if(G.reveal.ok){G.round++;G.time=Math.min(70,G.time+16);startRound(false)}else startRound(true)}}
    else{G.time-=dt;a.tempo(G.time<15?1.35:1);if(G.time<=0){G.time=0;a.over();return}}
    if(G.phase==='weighing'||G.phase==='reveal'||G.phase==='intro'){}

    /* 포인터 */
    var pq=pressQ;pressQ=null;var press=!!pq,rel=!inp.down&&(pd||press);pd=inp.down;
    if(inp.x!=null&&(press||inp.down))G.kb=false;
    if(G.phase==='play'){
      if(press){var x=pq[0],y=pq[1];
        if(inR(BW,x,y))doWeigh();
        else if(inR(BA,x,y)){G.acc=!G.acc;G.picks=[];G.sel=-1;a.sfx('tap');if(G.acc)setMsg(G.st.nf>1?t.hAcc2:t.hAcc,2.5)}
        else if(inR(BN,x,y))toggleNotes();
        else{var h=hitItem(x,y);
          if(h>=0){G.cur=h;if(G.acc)pick(h);else G.drag={i:h,sx:x,sy:y,mv:false}}
          else if(G.sel>=0){var z=zone(x,y);if(z>=0){place(G.sel,z);G.sel=-1}}}}
      if(G.drag&&inp.down&&inp.x!=null){var d=G.drag;if(Math.hypot(inp.x-d.sx,inp.y-d.sy)>9)d.mv=true;
        if(d.mv){it=G.items[d.i];it.x=inp.x;it.y=inp.y-8}}
      if(rel&&G.drag){var dg=G.drag;G.drag=null;it=G.items[dg.i];
        if(dg.mv){var z2=zone(inp.x,inp.y);if(z2>=0)place(dg.i,z2);G.sel=-1}
        else if(it.loc>0){place(dg.i,0);G.sel=-1}
        else{G.sel=G.sel===dg.i?-1:dg.i;a.sfx('tap')}}
    }else if(rel)G.drag=null;

    /* 저울 물리 */
    var b=G.beam;
    if(b.lock){b.w+=(-(b.a)*60-b.w*11)*dt}else{b.w+=(-(b.a-b.t)*38-b.w*3.1)*dt}
    b.a+=b.w*dt;
    for(i=0;i<2;i++){var s=G.sw[i];s.w+=(-s.a*46-s.w*2.6-b.w*(i?1:-1)*3)*dt;s.a+=s.w*dt;if(s.a>.35)s.a=.35;if(s.a<-.35)s.a=-.35}
    /* 아이템 이동 */
    var N=G.st.N,k=Math.min(1,dt*14);
    for(i=0;i<N;i++){it=G.items[i];if(G.drag&&G.drag.i===i&&G.drag.mv)continue;var p;
      if(it.loc===0)p=tableSlot(i,N);else{var arr=G.pans[it.loc-1];p=panSlot(it.loc,arr.indexOf(i),arr.length)}
      it.x+=(p[0]-it.x)*k;it.y+=(p[1]-it.y)*k}
    for(i=G.fx.length-1;i>=0;i--){var f2=G.fx[i];f2.t+=dt;if(f2.t>f2.l){G.fx.splice(i,1);continue}f2.x+=f2.vx*dt;f2.y+=f2.vy*dt;f2.r+=dt*5}
  }

  /* ================= 그리기 ================= */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function font(g,s){g.font=s+'px Jua, system-ui, sans-serif'}
  function tri(g,x,y,s,up){g.beginPath();if(up){g.moveTo(x,y-s);g.lineTo(x+s,y+s*.8);g.lineTo(x-s,y+s*.8)}else{g.moveTo(x,y+s);g.lineTo(x+s,y-s*.8);g.lineTo(x-s,y-s*.8)}g.closePath();g.fill()}
  function tick(g,x,y,s){g.beginPath();g.moveTo(x-s,y);g.lineTo(x-s*.25,y+s*.7);g.lineTo(x+s,y-s*.8);g.stroke()}
  function brass(g,x0,y0,x1,y1){var gr=g.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'#f6dc8c');gr.addColorStop(.45,'#c9973a');gr.addColorStop(1,'#7d5416');return gr}
  function candleX(i,K){return PX+(i-(K-1)/2)*17}

  function drawBg(g,t){var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#241a2e');gr.addColorStop(.5,'#3d2630');gr.addColorStop(1,'#2a1a1c');
    g.fillStyle=gr;g.fillRect(0,0,W,H);
    g.fillStyle='rgba(255,220,160,.035)';for(var i=0;i<9;i++)g.fillRect(10+i*40,30,18,270);
    /* 등불 빛 */
    var fl=.9+Math.sin(t*7)*.03+Math.sin(t*13.3)*.02;
    gr=g.createRadialGradient(180,60,10,180,150,250);gr.addColorStop(0,'rgba(255,200,110,'+(.34*fl)+')');gr.addColorStop(1,'rgba(255,170,80,0)');
    g.fillStyle=gr;g.fillRect(0,30,W,330);
    /* 선반 */
    for(var s=0;s<2;s++){var x0=s?236:0;g.fillStyle='#5b3622';g.fillRect(x0,104,124,7);g.fillStyle='#3a2116';g.fillRect(x0,111,124,3);
      g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x0,114,124,5)}
    /* 병과 책 */
    g.fillStyle='#6fa08c';rr(g,104,84,14,20,4);g.fill();g.fillStyle='#caa26a';g.fillRect(107,80,8,5);
    g.fillStyle='rgba(255,255,255,.25)';g.fillRect(107,88,3,10);
    g.fillStyle='#8a4a5e';g.fillRect(240,82,8,22);g.fillStyle='#4f6d94';g.fillRect(249,78,9,26);g.fillStyle='#c79a4a';g.fillRect(259,86,7,18);
    g.fillStyle='#b8894a';rr(g,336,86,16,18,5);g.fill();g.fillStyle='rgba(255,255,255,.2)';g.fillRect(339,89,3,9);
    /* 시계와 추 */
    var pa=Math.sin(t*3.1)*.42;g.strokeStyle='#caa24a';g.lineWidth=2;g.beginPath();g.moveTo(34,84);g.lineTo(34+Math.sin(pa)*26,84+Math.cos(pa)*26);g.stroke();
    g.fillStyle='#e9c35a';g.beginPath();g.arc(34+Math.sin(pa)*26,84+Math.cos(pa)*26,5,0,7);g.fill();
    g.fillStyle='#6b4226';rr(g,16,50,36,40,8);g.fill();g.fillStyle='#f3e6c8';g.beginPath();g.arc(34,69,13,0,7);g.fill();
    g.strokeStyle='#3a2616';g.lineWidth=1.6;g.beginPath();g.moveTo(34,69);g.lineTo(34+Math.cos(t*.5)*9,69+Math.sin(t*.5)*9);g.moveTo(34,69);g.lineTo(34+Math.cos(t*.04-1)*6,69+Math.sin(t*.04-1)*6);g.stroke();
    /* 잠자는 부엉이 */
    var br=Math.sin(t*1.6)*1.2;g.save();g.translate(78,104);
    g.fillStyle='#8a6a52';g.beginPath();g.ellipse(0,-13-br*.4,12+br*.5,14+br*.5,0,0,7);g.fill();
    g.fillStyle='#b99676';g.beginPath();g.ellipse(0,-9-br*.4,7,8,0,0,7);g.fill();
    g.fillStyle='#8a6a52';g.beginPath();g.moveTo(-10,-24);g.lineTo(-7,-31);g.lineTo(-3,-25);g.moveTo(10,-24);g.lineTo(7,-31);g.lineTo(3,-25);g.fill();
    g.strokeStyle='#2c1c14';g.lineWidth=1.5;g.beginPath();g.arc(-4.5,-18,2.6,.15,3);g.stroke();g.beginPath();g.arc(4.5,-18,2.6,.15,3);g.stroke();
    g.fillStyle='#e8a33a';g.beginPath();g.moveTo(-1.6,-15);g.lineTo(1.6,-15);g.lineTo(0,-12);g.fill();
    font(g,9);g.fillStyle='rgba(255,255,255,'+(.3+.3*Math.sin(t*1.6))+')';g.textAlign='left';g.fillText('z',12,-28-((t*6)%8));g.restore();
    /* 먼지 */
    for(i=0;i<G.dust.length;i++){var d=G.dust[i],dx=(d.x+Math.sin(t*.3+d.p)*14+t*4*d.s)%W,dy=40+((d.y+t*5*d.s)%260);
      g.fillStyle='rgba(255,225,170,'+(.12+.16*Math.abs(Math.sin(t*.8+d.p)))+')';g.beginPath();g.arc(dx,dy,d.s,0,7);g.fill()}
  }
  function drawRaccoon(g,t){var m=G.racT>0?G.rac:(G.acc?'smug':'idle'),x=306,y=84,bob=Math.sin(t*2)*1.2;g.save();g.translate(x,y+bob);
    g.fillStyle='#6d6772';g.beginPath();g.ellipse(0,40,24,26,0,0,7);g.fill();
    g.fillStyle='#8b3d3d';g.beginPath();g.moveTo(-14,24);g.lineTo(0,34);g.lineTo(14,24);g.lineTo(18,62);g.lineTo(-18,62);g.fill();
    g.fillStyle='#77717c';g.beginPath();g.moveTo(-19,-12);g.lineTo(-16,-27);g.lineTo(-6,-18);g.fill();g.beginPath();g.moveTo(19,-12);g.lineTo(16,-27);g.lineTo(6,-18);g.fill();
    g.fillStyle='#f1c9c9';g.beginPath();g.moveTo(-16,-14);g.lineTo(-15,-22);g.lineTo(-10,-17);g.fill();g.beginPath();g.moveTo(16,-14);g.lineTo(15,-22);g.lineTo(10,-17);g.fill();
    var gr=g.createRadialGradient(-6,-8,3,0,0,24);gr.addColorStop(0,'#a9a3ad');gr.addColorStop(1,'#77717c');g.fillStyle=gr;g.beginPath();g.ellipse(0,0,23,20,0,0,7);g.fill();
    g.fillStyle='#f4eee6';g.beginPath();g.ellipse(0,8,13,10,0,0,7);g.fill();
    g.fillStyle='#2d2933';g.beginPath();g.ellipse(-9,-2,9,6.5,-.25,0,7);g.fill();g.beginPath();g.ellipse(9,-2,9,6.5,.25,0,7);g.fill();
    var bl=(t%3.4)<.12;
    for(var s=-1;s<=1;s+=2){var ex=s*8.5,ey=-2;
      if(m==='wow'){g.fillStyle='#fff';g.beginPath();g.arc(ex,ey,4.4,0,7);g.fill();g.fillStyle='#1b1820';g.beginPath();g.arc(ex,ey,2.2,0,7);g.fill();
        g.fillStyle='#ffe98a';g.beginPath();g.arc(ex+1.4,ey-1.4,1.1,0,7);g.fill()}
      else if(bl){g.strokeStyle='#fff';g.lineWidth=1.6;g.beginPath();g.moveTo(ex-3,ey);g.lineTo(ex+3,ey);g.stroke()}
      else{g.fillStyle='#fff';g.beginPath();g.arc(ex,ey,3.5,0,7);g.fill();g.fillStyle='#1b1820';g.beginPath();g.arc(ex-1.2,ey+.4,1.8,0,7);g.fill();
        if(m==='smug'){g.fillStyle='#2d2933';g.fillRect(ex-4.5,ey-4.5,9,3.6)}}}
    g.fillStyle='#2d2933';g.beginPath();g.ellipse(0,5,3,2.2,0,0,7);g.fill();
    g.strokeStyle='#2d2933';g.lineWidth=1.5;g.beginPath();
    if(m==='wow'){g.ellipse(0,12,2.6,3.2,0,0,7)}else if(m==='smug'){g.moveTo(-4,11);g.quadraticCurveTo(2,14,6,9)}else{g.moveTo(-4,10.5);g.quadraticCurveTo(0,13.5,4,10.5)}
    g.stroke();g.restore()}

  function drawScale(g,t){var b=G.beam,i,s;
    /* 접시 그림자 */
    for(s=1;s<=2;s++){var p=panPos(s);g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(p[0],COUNTER+6,50,7,0,0,7);g.fill()}
    /* 기둥 */
    g.fillStyle=brass(g,PX-6,0,PX+6,0);g.fillRect(PX-4,PY,8,COUNTER-PY-6);
    g.beginPath();g.moveTo(PX-26,COUNTER+2);g.quadraticCurveTo(PX,COUNTER-22,PX+26,COUNTER+2);g.closePath();g.fill();
    g.fillStyle='rgba(60,35,5,.5)';g.fillRect(PX-30,COUNTER,60,4);
    /* 눈금판 */
    g.strokeStyle='rgba(246,220,140,.7)';g.lineWidth=2;g.beginPath();g.arc(PX,PY,34,Math.PI/2-.5,Math.PI/2+.5);g.stroke();
    g.fillStyle='rgba(246,220,140,.9)';g.fillRect(PX-1,PY+30,2,8);
    /* 대 */
    g.save();g.translate(PX,PY);g.rotate(b.a);
    g.fillStyle=brass(g,0,-5,0,5);rr(g,-ARM-6,-4,ARM*2+12,8,4);g.fill();
    g.fillStyle='rgba(255,255,255,.35)';g.fillRect(-ARM,-3,ARM*2,1.5);
    g.fillStyle='#c0392b';g.beginPath();g.moveTo(-2.5,0);g.lineTo(2.5,0);g.lineTo(0,36);g.closePath();g.fill();
    g.fillStyle=brass(g,-8,-8,8,8);g.beginPath();g.arc(0,0,8,0,7);g.fill();
    g.beginPath();g.arc(-ARM,0,5,0,7);g.arc(ARM,0,5,0,7);g.fill();g.restore();
    g.fillStyle=brass(g,PX-5,PY-22,PX+5,PY-8);g.beginPath();g.arc(PX,PY-13,5,0,7);g.fill();
    if(b.lock){g.fillStyle='#3a2616';rr(g,PX-7,PY-5,14,10,3);g.fill();g.strokeStyle='#f6dc8c';g.lineWidth=1.6;g.beginPath();g.arc(PX,PY-5,3.6,Math.PI,0);g.stroke()}
    /* 사슬과 접시 */
    for(s=1;s<=2;s++){var q=panPos(s);g.strokeStyle='#d9b45a';g.lineWidth=1.4;g.setLineDash([3,2.5]);
      g.beginPath();g.moveTo(q[2],q[3]);g.lineTo(q[0]-54,q[1]);g.moveTo(q[2],q[3]);g.lineTo(q[0]+54,q[1]);g.stroke();g.setLineDash([])}
  }
  function drawPanBowl(g,s){var q=panPos(s),gr=g.createLinearGradient(0,q[1],0,q[1]+16);gr.addColorStop(0,'#e9c766');gr.addColorStop(1,'#8a5d18');
    g.fillStyle=gr;g.beginPath();g.moveTo(q[0]-58,q[1]);g.quadraticCurveTo(q[0],q[1]+28,q[0]+58,q[1]);g.closePath();g.fill();
    g.strokeStyle='#f8e3a0';g.lineWidth=2;g.beginPath();g.moveTo(q[0]-58,q[1]);g.lineTo(q[0]+58,q[1]);g.stroke();
    var cap=G.st.sp.cap;if(cap){font(g,10);g.textAlign='center';g.fillStyle='#3a2616';g.fillText(G.pans[s-1].length+'/'+cap,q[0],q[1]+12)}}

  function drawItem(g,it,t){var r=G.r,st=G.st,i=it.i,x=it.x,y=it.y,fl=G.fl[i],isRef=st.sp.ref&&i===st.N-1,
      onPan=it.loc>0,rv=G.phase==='reveal'?G.reveal:null,caught=rv&&rv.real.f.indexOf(i)>=0,
      clear=G.notes&&fl===0,dragging=G.drag&&G.drag.i===i&&G.drag.mv,nerv=(onPan||dragging||(G.acc&&!clear))&&!caught;
    if(nerv&&!dragging)x+=Math.sin(t*38+it.ph)*.7;
    if(G.acc&&!clear&&G.phase==='play')y+=Math.sin(t*9+it.ph)*1.5;
    g.save();g.translate(x,y);if(dragging)g.scale(1.18,1.18);
    g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(0,r*(dragging?1.5:.95),r*.8,r*.24,0,0,7);g.fill();
    if(clear&&!caught)g.globalAlpha=.62;
    if(caught){g.fillStyle=rv.ok?'rgba(255,220,90,.55)':'rgba(255,80,80,.5)';g.beginPath();g.arc(0,0,r+6+Math.sin(t*14)*2,0,7);g.fill()}
    var th=G.theme,gr;
    if(isRef){gr=g.createRadialGradient(-r*.3,-r*.4,1,0,0,r);gr.addColorStop(0,'#fff');gr.addColorStop(1,'#9aa3b5');g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,7);g.fill();g.strokeStyle='#5d6678';g.lineWidth=1.5;g.stroke()}
    else if(th===1){gr=g.createRadialGradient(-r*.3,-r*.4,1,0,0,r);gr.addColorStop(0,'#fff0a8');gr.addColorStop(1,'#d8951c');g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,7);g.fill();
      g.strokeStyle='#93610c';g.lineWidth=1.6;g.stroke();g.strokeStyle='rgba(147,97,12,.45)';g.lineWidth=1;g.beginPath();g.arc(0,0,r-3,0,7);g.stroke()}
    else if(th===0){gr=g.createLinearGradient(0,-r,0,r);gr.addColorStop(0,'#efc487');gr.addColorStop(1,'#a8672a');g.fillStyle=gr;g.beginPath();g.ellipse(0,r*.1,r*.84,r*.9,0,0,7);g.fill();
      g.fillStyle='#64391a';g.beginPath();g.ellipse(0,-r*.3,r*.95,r*.68,0,Math.PI,0);g.closePath();g.fill();g.fillRect(-1.5,-r*1.18,3,r*.3);
      g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1;g.beginPath();g.arc(0,-r*.3,r*.6,3.5,5.9);g.stroke()}
    else{gr=g.createLinearGradient(-r,-r,r,r);gr.addColorStop(0,'#b9f6ff');gr.addColorStop(1,'#3d8fd6');g.fillStyle=gr;g.beginPath();
      for(var k=0;k<6;k++){var an=k*Math.PI/3-Math.PI/2;g.lineTo(Math.cos(an)*r,Math.sin(an)*r)}g.closePath();g.fill();g.strokeStyle='#2a6aa8';g.lineWidth=1.4;g.stroke();
      g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1;g.beginPath();g.moveTo(-r*.86,-r*.5);g.lineTo(0,-r*.3);g.lineTo(r*.86,-r*.5);g.moveTo(0,-r*.3);g.lineTo(0,-r);g.stroke()}
    /* 얼굴 */
    var ex=r*.34,ey=th===0&&!isRef?r*.12:-r*.06,my=ey+r*.42,bl=((t+it.ph)%3.1)<.11,dk='#2a1c12';
    if(caught&&!rv.ok){g.strokeStyle=dk;g.lineWidth=1.5;g.beginPath();g.moveTo(-ex-2,ey-2);g.lineTo(-ex+2,ey);g.moveTo(ex+2,ey-2);g.lineTo(ex-2,ey);g.stroke();
      g.beginPath();g.moveTo(-r*.25,my);g.quadraticCurveTo(0,my+r*.3,r*.25,my);g.stroke()}
    else if(nerv||caught){for(var s=-1;s<=1;s+=2){g.fillStyle='#fff';g.beginPath();g.arc(s*ex,ey,r*.22,0,7);g.fill();g.fillStyle=dk;g.beginPath();g.arc(s*ex+Math.sin(t*20+it.ph)*.6,ey,r*.1,0,7);g.fill()}
      g.strokeStyle=dk;g.lineWidth=1.3;g.beginPath();g.moveTo(-r*.25,my);g.lineTo(-r*.08,my-1.5);g.lineTo(r*.08,my+1);g.lineTo(r*.25,my-.5);g.stroke();
      g.fillStyle='#9fe1ff';g.beginPath();g.arc(r*.72,-r*.5+((t*10+it.ph*3)%5),1.8,0,7);g.fill()}
    else if(clear){g.strokeStyle=dk;g.lineWidth=1.4;g.beginPath();g.arc(-ex,ey+1,r*.14,Math.PI,0);g.stroke();g.beginPath();g.arc(ex,ey+1,r*.14,Math.PI,0);g.stroke();
      g.beginPath();g.arc(0,my-2,r*.2,.2,2.94);g.stroke()}
    else{g.fillStyle=dk;if(bl){g.fillRect(-ex-2,ey,4,1.2);g.fillRect(ex-2,ey,4,1.2)}else{g.beginPath();g.arc(-ex,ey,r*.12,0,7);g.arc(ex,ey,r*.12,0,7);g.fill()}
      g.strokeStyle=dk;g.lineWidth=1.2;g.beginPath();g.arc(0,my-2,r*.14,.3,2.84);g.stroke()}
    g.globalAlpha=1;
    if(isRef){g.fillStyle='#ffd23e';font(g,13);g.textAlign='center';g.fillText('★',r*.8,-r*.55)}
    /* 선택 / 지목 / 커서 */
    if(G.sel===i){g.strokeStyle='#fff7c2';g.lineWidth=2.5;g.beginPath();g.arc(0,0,r+4+Math.sin(t*8),0,7);g.stroke()}
    if(G.picks.indexOf(i)>=0&&G.phase==='play'){g.strokeStyle='#ff5a5a';g.lineWidth=3;g.beginPath();g.arc(0,0,r+4,0,7);g.stroke()}
    if(G.kb&&G.cur===i){g.strokeStyle='#8fe3ff';g.lineWidth=2;g.setLineDash([4,3]);g.beginPath();g.arc(0,0,r+7,t*2,t*2+6.283);g.stroke();g.setLineDash([])}
    /* 번호와 메모 */
    var ly=r+9,sh=G.notes&&!isRef,nw=sh?(fl===3?19:11):0;font(g,r<12?9:10);g.textAlign='center';
    var lx=-nw/2;g.fillStyle='rgba(20,12,8,.6)';rr(g,lx-8-(sh?0:0),ly-7,16+nw,12,5);g.fill();
    g.fillStyle='#f5e7c8';g.fillText(isRef?'★':String(i+1),lx,ly+3);
    if(sh){var mx=lx+12;
      if(fl===0){g.strokeStyle='#8fe6a0';g.lineWidth=1.6;tick(g,mx,ly-1,3.4)}
      else{if(fl&1){g.fillStyle='#ff9a5c';tri(g,mx,ly-1,3.6,true);mx+=8}if(fl&2){g.fillStyle='#74cdff';tri(g,mx,ly-1,3.6,false)}}}
    if(caught){font(g,11);g.fillStyle=rv.ok?'#fff2b0':'#ffd0d0';g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=3;
      var lab=st.sp.kind==='U'?(rv.real.s>0?tx().hv:tx().lt):tx().fk;g.strokeText(lab,0,-r-6);g.fillText(lab,0,-r-6)}
    g.restore()}

  function drawCandles(g,t){var K=G.st.K,i;for(i=0;i<K;i++){var x=candleX(i,K),y=COUNTER+2,lit=i<K-G.used;
      g.fillStyle='#f3ead6';rr(g,x-4,y-22,8,22,2);g.fill();g.fillStyle='rgba(0,0,0,.15)';g.fillRect(x+1,y-22,3,22);
      g.strokeStyle='#3a2616';g.lineWidth=1;g.beginPath();g.moveTo(x,y-22);g.lineTo(x,y-26);g.stroke();
      if(lit){var f=Math.sin(t*11+i*2)*1.2,gr=g.createRadialGradient(x,y-30,1,x,y-30,22);gr.addColorStop(0,'rgba(255,200,90,.5)');gr.addColorStop(1,'rgba(255,200,90,0)');
        g.fillStyle=gr;g.beginPath();g.arc(x,y-30,22,0,7);g.fill();
        g.fillStyle='#ffb02e';g.beginPath();g.ellipse(x+f*.4,y-31,3.4,7+f,0,0,7);g.fill();g.fillStyle='#fff3b8';g.beginPath();g.ellipse(x+f*.3,y-29,1.6,3.6,0,0,7);g.fill()}}
    for(i=0;i<G.fx.length;i++){var s=G.fx[i];g.fillStyle='rgba(210,210,220,'+(.45*(1-s.t/s.l))+')';g.beginPath();g.arc(s.x,s.y,s.r,0,7);g.fill()}}

  function drawHist(g){var K=G.st.K,cw=Math.min(112,336/K),x0=180-cw*K/2,y=474,i,j;
    for(i=0;i<K;i++){var x=x0+i*cw,h=G.st.hist[i];
      g.fillStyle=h?'#f1e2bd':'rgba(241,226,189,.14)';rr(g,x+2,y,cw-4,46,7);g.fill();
      if(!h){g.strokeStyle='rgba(241,226,189,.35)';g.lineWidth=1;g.setLineDash([4,4]);rr(g,x+2,y,cw-4,46,7);g.stroke();g.setLineDash([]);
        font(g,13);g.textAlign='center';g.fillStyle='rgba(241,226,189,.4)';g.fillText(String(i+1),x+cw/2,y+28);continue}
      var cx=x+cw/2;
      for(var s=0;s<2;s++){var m=s?h.r:h.l,ids=[];for(j=0;j<G.st.N;j++)if(m&(1<<j))ids.push(j);
        var pc=ids.length<=4?2:3,rows=Math.ceil(ids.length/pc),bx=cx+(s?1:-1)*(cw/4+3);
        for(j=0;j<ids.length;j++){var dx=bx+((j%pc)-(Math.min(pc,ids.length)-1)/2)*11,dy=y+23+(Math.floor(j/pc)-(rows-1)/2)*11;
          g.fillStyle=(s?h.o<0:h.o>0)?'#d9792e':h.o===0?'#7f9a86':'#5f86b8';g.beginPath();g.arc(dx,dy,5.2,0,7);g.fill();
          font(g,7);g.textAlign='center';g.fillStyle='#fff';g.fillText(G.st.sp.ref&&ids[j]===G.st.N-1?'★':String(ids[j]+1),dx,dy+2.6)}}
      g.strokeStyle='#5b3622';g.lineWidth=2;g.beginPath();g.moveTo(cx-7,y+21+h.o*4);g.lineTo(cx+7,y+21-h.o*4);g.stroke();
      g.fillStyle='#5b3622';g.beginPath();g.moveTo(cx,y+22);g.lineTo(cx-4,y+31);g.lineTo(cx+4,y+31);g.fill()}}

  function btn(g,b,label,c0,c1,active,dis){var gr=g.createLinearGradient(0,b.y,0,b.y+b.h);gr.addColorStop(0,c0);gr.addColorStop(1,c1);
    g.fillStyle='rgba(0,0,0,.35)';rr(g,b.x,b.y+4,b.w,b.h,12);g.fill();g.globalAlpha=dis?.45:1;g.fillStyle=gr;rr(g,b.x,b.y,b.w,b.h,12);g.fill();
    g.fillStyle='rgba(255,255,255,.22)';rr(g,b.x+4,b.y+3,b.w-8,b.h*.38,8);g.fill();
    if(active){g.strokeStyle='#fff';g.lineWidth=3;rr(g,b.x,b.y,b.w,b.h,12);g.stroke()}
    font(g,b.w>100?24:15);g.textAlign='center';g.fillStyle='rgba(0,0,0,.35)';g.fillText(label,b.x+b.w/2+1,b.y+b.h/2+(b.w>100?9:6)+1);
    g.fillStyle='#fff8e6';g.fillText(label,b.x+b.w/2,b.y+b.h/2+(b.w>100?9:6));g.globalAlpha=1}

  function draw(g,a,dt){A=a;if(!G)return;T0+=dt||0;var t=T0,T=tx(),st=G.st,i;
    G.fl=L.flags(st.hyps,st.N);
    drawBg(g,t);drawRaccoon(g,t);
    /* 카운터 */
    var gr=g.createLinearGradient(0,COUNTER,0,H);gr.addColorStop(0,'#8a5630');gr.addColorStop(.08,'#6e4126');gr.addColorStop(1,'#3d2416');
    g.fillStyle=gr;g.fillRect(0,COUNTER,W,H-COUNTER);g.fillStyle='rgba(255,220,160,.25)';g.fillRect(0,COUNTER,W,2);
    g.fillStyle='#24493f';rr(g,8,318,344,150,16);g.fill();g.strokeStyle='rgba(255,230,170,.25)';g.lineWidth=1.5;rr(g,12,322,336,142,13);g.stroke();
    var lg=g.createRadialGradient(180,330,10,180,380,200);lg.addColorStop(0,'rgba(255,210,130,.16)');lg.addColorStop(1,'rgba(255,210,130,0)');g.fillStyle=lg;rr(g,8,318,344,150,16);g.fill();
    drawScale(g,t);drawPanBowl(g,1);drawPanBowl(g,2);drawCandles(g,t);
    /* 드롭 안내 */
    if((G.sel>=0||(G.drag&&G.drag.mv))&&G.phase==='play'){for(var s=1;s<=2;s++){var q=panPos(s);g.strokeStyle='rgba(255,247,194,'+(.5+.3*Math.sin(t*6))+')';g.lineWidth=2;g.setLineDash([6,5]);
        rr(g,q[0]-62,q[1]-74,124,96,14);g.stroke();g.setLineDash([])}}
    var dragIt=null;for(i=0;i<st.N;i++){var it=G.items[i];if(G.drag&&G.drag.i===i&&G.drag.mv){dragIt=it;continue}drawItem(g,it,t)}
    if(dragIt)drawItem(g,dragIt,t);
    drawHist(g);
    /* 상단: 시간과 라운드 */
    var fr=Math.max(0,G.time/70);g.fillStyle='rgba(0,0,0,.4)';rr(g,12,34,336,7,3.5);g.fill();
    g.fillStyle=G.time<12?'#ff6b5a':'#ffc94a';rr(g,12,34,Math.max(7,336*fr),7,3.5);g.fill();
    var sp=st.sp,lab='R'+(G.round+1)+' · '+(sp.kind==='H'?T.H:sp.kind==='L'?T.Lt:sp.kind==='U'?T.U:T.two)+(sp.ref?T.ref:'')+(sp.cap?T.cap(sp.cap):'');
    font(g,lab.length>30?12:14);g.textAlign='center';g.fillStyle='rgba(0,0,0,.5)';g.fillText(lab,181,59);g.fillStyle=sp.boss?'#ffd75e':'#f6ead0';g.fillText(lab,180,58);
    font(g,12);g.textAlign='left';g.fillStyle='#f6ead0';g.fillText(Math.ceil(G.time)+'s',14,56);
    if(G.res&&G.res.shown&&G.phase==='play'){var rt=G.res.o>0?T.lh:G.res.o<0?T.rh:T.eq;font(g,14);var rw=g.measureText(rt).width+22;
      g.fillStyle='rgba(20,12,8,.78)';rr(g,180-rw/2,70,rw,24,12);g.fill();g.textAlign='center';g.fillStyle=G.res.o===0?'#bfe9ff':'#ffd98a';g.fillText(rt,180,87)}
    /* 버튼 */
    var canW=G.phase==='play'&&G.used<st.K&&G.pans[0].length>0&&G.pans[0].length===G.pans[1].length;
    btn(g,BN,T.notes+' '+(G.notes?T.on:T.off),G.notes?'#5aa98c':'#6b6470',G.notes?'#2f6d58':'#463f4a',false,false);
    btn(g,BW,T.weigh,'#f0c552','#b07a1c',false,!canW);
    btn(g,BA,T.acc,'#e86a5c','#a5352f',G.acc,false);
    /* 한 줄 안내 */
    var hint=G.msgT>0?G.msg:G.acc?(st.nf>1?T.hAcc2:T.hAcc):(G.round===0&&G.used===0?T.h0:T.hDef);
    font(g,hint.length>26?12:14);g.textAlign='center';g.fillStyle='rgba(0,0,0,.5)';g.fillText(hint,161,609);g.fillStyle=G.msgT>0?'#ffe08a':'#e9dcc0';g.fillText(hint,160,608);
    if(G.acc&&G.phase==='play'){g.fillStyle='rgba(232,106,92,'+(.1+.06*Math.sin(t*6))+')';rr(g,8,318,344,150,16);g.fill()}
  }

  window.SG.run({id:'odd-coin',
    title:{ko:'수상한 저울',en:'The Odd Coin'},
    how:{ko:'보물을 양쪽 접시에 올리고 "재기!" — 촛불 수만큼만 잴 수 있어요. 가짜가 하나로 좁혀지면 "지목"으로 콕! 확실해질 때까지는 맞힐 수 없어요.',
         en:'Drag treasures onto both pans and Weigh — one candle per weighing. When only one suspect is left, Accuse it. You can only be right once you\'re certain.'},
    init:init,update:update,draw:draw});
})();
