/* 할머니의 찻잔 — 손님이 기억하는 맛 그래프(5축 레이더)에 맞춰 재료를 블렌딩하는 추리 게임.
   재료마다 숨은 맛 벡터가 있고, 대접한 잔의 그래프로 맛 노트가 채워진다. */
(function(){
  'use strict';
  /* ================= 맛 모델 (브라우저/노드 공용) ================= */
  var M=(function(){
    var AXK={ko:['달콤','쌉쌀','꽃향','상큼','따뜻'],en:['Sweet','Bitter','Floral','Fresh','Warm']};
    var AXC=['#f0a33a','#6f9a3e','#e2709a','#2fb79a','#e0603a'];
    /* 맛 벡터: [달콤, 쌉쌀, 꽃향, 상큼, 따뜻] (1스쿱, 보통 우림 기준) */
    var ING=[
      {id:'green',  ko:'녹차',  en:'Green tea',v:[0,2,0,2,0],tea:1,col:'#8cc152',liq:[168,190,78]},
      {id:'black',  ko:'홍차',  en:'Black tea',v:[0,3,0,0,1],tea:1,col:'#7a3a1e',liq:[158,72,32]},
      {id:'jasmine',ko:'자스민',en:'Jasmine',  v:[0,1,3,0,0],tea:1,col:'#d8cf8a',liq:[226,206,128]},
      {id:'mint',   ko:'민트',  en:'Mint',     v:[0,0,0,3,0],tea:0,col:'#4fc98f',liq:[150,214,150]},
      {id:'honey',  ko:'꿀',    en:'Honey',    v:[3,0,1,0,0],tea:0,col:'#f0aa28',liq:[236,170,40]},
      {id:'lemon',  ko:'레몬',  en:'Lemon',    v:[0,1,0,2,0],tea:0,col:'#f2d936',liq:[246,226,90]},
      {id:'ginger', ko:'생강',  en:'Ginger',   v:[0,0,0,1,3],tea:0,col:'#d6a256',liq:[222,172,92]},
      {id:'rose',   ko:'장미',  en:'Rose',     v:[2,0,2,0,0],tea:0,col:'#e66d8c',liq:[232,122,142]},
      {id:'cinnamon',ko:'계피', en:'Cinnamon', v:[1,0,0,0,3],tea:0,col:'#9a4e26',liq:[172,92,50]},
      {id:'milk',   ko:'우유',  en:'Milk',     v:[2,0,0,0,2],tea:0,col:'#f3ece0',liq:[246,236,216]}
    ];
    var N=ING.length,IDX={};ING.forEach(function(g,i){IDX[g.id]=i});
    var STEEP=[0.5,1,1.5],MAXPOT=6,MAXEACH=3,CUPS=4,TOL=0.6,TOL2=1.1;
    function blend(c,s){var v=[0,0,0,0,0];for(var i=0;i<N;i++)if(c[i]){var w=ING[i].v;
        for(var a=0;a<5;a++)v[a]+=c[i]*w[a]*(a===1&&ING[i].tea?STEEP[s]:1)}return v}
    function hasTea(c){for(var i=0;i<N;i++)if(c[i]&&ING[i].tea)return true;return false}
    function within(v,t,tol){for(var a=0;a<5;a++)if(Math.abs(v[a]-t[a])>tol+1e-9)return false;return true}
    function satisfies(c,s,cu){if(cu.allergen>=0&&c[cu.allergen])return false;var v=blend(c,s);
      for(var k=0;k<cu.targets.length;k++)if(!within(v,cu.targets[k],cu.tol))return false;return true}
    var cache={};
    /* 진열대 재료로 만들 수 있는 모든 블렌드(재료별 0~3스쿱, 합 1~6, 차가 있으면 우림 3단계) */
    function enumerate(shelf){var key=shelf.join(',');if(cache[key])return cache[key];
      var out=[],c=[];for(var i=0;i<N;i++)c[i]=0;
      (function rec(j,tot){if(j===shelf.length){if(tot>0){var cc=c.slice();
            if(hasTea(cc))for(var s=0;s<3;s++)out.push({c:cc,s:s});else out.push({c:cc,s:1})}return}
        for(var n=0;n<=MAXEACH&&tot+n<=MAXPOT;n++){c[shelf[j]]=n;rec(j+1,tot+n)}c[shelf[j]]=0})(0,0);
      return cache[key]=out}
    function countMatches(cu){var L=enumerate(cu.shelf),n=0;for(var i=0;i<L.length;i++)if(satisfies(L[i].c,L[i].s,cu))n++;return n}
    function mk(r){var c=[];for(var i=0;i<N;i++)c[i]=0;for(var k in r)c[IDX[k]]=r[k];return c}

    var ANIMALS=[
      {k:'rabbit',ko:'모모',en:'Momo'},{k:'owl',ko:'부엉 할배',en:'Old Hoot'},{k:'hedgehog',ko:'도치',en:'Dochi'},
      {k:'bear',ko:'곰순',en:'Gomsun'},{k:'fox',ko:'여울',en:'Yeoul'},{k:'deer',ko:'노루',en:'Noru'},
      {k:'raccoon',ko:'너굴',en:'Neogul'},{k:'panda',ko:'대숲',en:'Bambu'},{k:'duck',ko:'꽥순',en:'Quacky'},
      {k:'sheep',ko:'몽실',en:'Mongsil'},{k:'frog',ko:'개굴',en:'Gaegul'},{k:'mole',ko:'두더',en:'Dudu'}];
    /* 손으로 만든 12명: 한 명당 새 재료는 1~2개만 */
    var HAND=[
      {an:0,r:{green:2},shelf:['green'],known:['green']},
      {an:1,r:{green:2,honey:1},shelf:['green','honey','mint']},
      {an:2,r:{rose:2,green:1},shelf:['green','honey','rose','mint']},
      {an:3,r:{black:2,honey:1},s:0,shelf:['black','green','honey','mint']},
      {an:4,r:{black:1,milk:2},s:2,shelf:['black','milk','honey','mint']},
      {an:5,r:{ginger:1,cinnamon:1,honey:1},shelf:['ginger','cinnamon','honey','black','milk']},
      {an:6,r:{ginger:2,milk:1},shelf:['ginger','cinnamon','honey','milk','mint'],al:'cinnamon'},
      {an:7,r:{jasmine:2,honey:1},s:2,shelf:['jasmine','green','honey','rose','lemon']},
      {an:8,r:{lemon:1,mint:1,honey:1},shelf:['lemon','mint','green','ginger','honey']},
      {an:9,an2:10,r:{black:1,milk:1,cinnamon:1},shelf:['black','milk','honey','cinnamon','ginger','rose'],
        duo:[[1,-1,0,0,1],[-1,1,0,1,-1]]},
      {an:11,r:{jasmine:1,rose:2,mint:1},s:0,shelf:['green','jasmine','rose','honey','mint','lemon'],al:'honey'},
      {an:7,an2:2,r:{green:1,honey:1,ginger:1,lemon:1},shelf:['green','honey','ginger','lemon','mint','cinnamon','rose'],
        duo:[[1,-1,1,1,-1],[-1,1,-1,-1,1]]}
    ];
    function ids(a){return a.map(function(k){return IDX[k]})}
    function handCustomer(i){var h=HAND[i],c=mk(h.r),s=h.s==null?1:h.s,v=blend(c,s),cu={
        hand:i,shelf:ids(h.shelf),recipe:{c:c,s:s},allergen:h.al?IDX[h.al]:-1,known:h.known?ids(h.known):[],
        an:[h.an].concat(h.an2!=null?[h.an2]:[]),tol:h.duo?TOL2:TOL};
      cu.targets=h.duo?h.duo.map(function(d){return v.map(function(x,a){return x+d[a]})}):[v];return cu}
    /* 절차 생성 손님: 레이더가 4개 이상 레시피와 겹치면 버린다 */
    function genCustomer(rnd,k){
      for(var tries=0;tries<400;tries++){
        var pool=[];for(var i=0;i<N;i++)pool.push(i);
        for(i=N-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),t=pool[i];pool[i]=pool[j];pool[j]=t}
        var sz=Math.min(8,5+Math.floor(k/3)),shelf=pool.slice(0,sz);
        if(!shelf.some(function(x){return ING[x].tea}))continue;
        var nI=2+(rnd()<.55?1:0)+(k>5&&rnd()<.3?1:0),pick=shelf.slice(0,nI),c=[];for(i=0;i<N;i++)c[i]=0;
        var tot=0;pick.forEach(function(x){var n=1+Math.floor(rnd()*3);c[x]=n;tot+=n});
        if(tot>MAXPOT||tot<2)continue;
        var s=hasTea(c)?Math.floor(rnd()*3):1,v=blend(c,s);
        if(Math.max.apply(null,v)>9.5)continue;
        var al=-1;if(k>=2&&rnd()<.3){var rest=shelf.filter(function(x){return !c[x]});if(rest.length)al=rest[Math.floor(rnd()*rest.length)]}
        var duo=k>=3&&rnd()<.22,targets=[v];
        if(duo){var d1=[],d2=[],ok=true;for(var a=0;a<5;a++){var r=rnd();
            if(v[a]>=1&&r<.7){var sg=rnd()<.5?1:-1;d1[a]=sg;d2[a]=-sg}else{d1[a]=0;d2[a]=0}}
          if(d1.every(function(x){return x===0}))continue;
          targets=[v.map(function(x,a){return x+d1[a]}),v.map(function(x,a){return x+d2[a]})]}
        sh(shelf,rnd);
        var an1=Math.floor(rnd()*ANIMALS.length),an2=(an1+1+Math.floor(rnd()*(ANIMALS.length-1)))%ANIMALS.length;
        var cu={hand:-1,shelf:shelf.sort(function(x,y){return x-y}),recipe:{c:c,s:s},allergen:al,known:[],
          an:duo?[an1,an2]:[an1],tol:duo?TOL2:TOL,targets:targets};
        var cnt=countMatches(cu);if(cnt<1||cnt>3)continue;
        cu.ambig=cnt;return cu}
      return handCustomer(1+Math.floor(rnd()*4))}
    function sh(a,rnd){for(var i=a.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}}
    /* 대접한 잔으로 맛 노트 추론: 모르는 재료가 정확히 하나면 그 재료의 맛이 드러난다 */
    function deduce(c,known){var u=-1,n=0;for(var i=0;i<N;i++)if(c[i]&&!known[i]){u=i;n++}return n===1?u:-1}
    function avgTarget(cu){var t=[0,0,0,0,0];cu.targets.forEach(function(x){for(var a=0;a<5;a++)t[a]+=x[a]/cu.targets.length});return t}
    function l1(a,b){var s=0;for(var i=0;i<5;i++)s+=Math.abs(a[i]-b[i]);return s}
    /* 손님의 한마디: 가장 넘친 축과 가장 모자란 축 */
    var TOO={ko:['너무 달아요','너무 써요','꽃향이 너무 진해요','너무 상큼해요','너무 맵고 뜨거워요'],
             en:['too sweet','too bitter','too flowery','too sharp and fresh','too spicy-warm']};
    var MISS={ko:['달콤함','쌉쌀함','꽃향','상큼함','따뜻한 맛'],en:['sweetness','bitterness','something floral','something fresh','something warm']};
    var ADJ={ko:['달콤하','쌉쌀하','꽃향 나','상큼하','따끈하'],en:['sweet','bitter','flowery','fresh','warming']};
    function reaction(v,cu,lang){
      var worst=cu.targets[0],we=-1;cu.targets.forEach(function(t){var e=l1(v,t);if(e>we){we=e;worst=t}});
      var hi=-1,hv=cu.tol,lo=-1,lv=-cu.tol;for(var a=0;a<5;a++){var d=v[a]-worst[a];if(d>hv+1e-9){hv=d;hi=a}if(d<lv-1e-9){lv=d;lo=a}}
      var big=function(x){return Math.abs(x)>=2};
      if(lang==='ko'){var s='음… ';if(hi>=0)s+=(big(hv)?'':'조금 ')+TOO.ko[hi]+'. ';
        if(lo>=0)s+=MISS.ko[lo]+'이 '+(big(lv)?'많이 ':'조금 ')+'모자라요.';return s.trim()}
      var e='Hmm, ';if(hi>=0)e+=(big(hv)?'way ':'a bit ')+TOO.en[hi];
      if(lo>=0)e+=(hi>=0?'… and ':'')+'missing '+MISS.en[lo];return e+'.'}
    function describe(cu,lang){var t=avgTarget(cu),o=[0,1,2,3,4].sort(function(x,y){return t[y]-t[x]});
      if(lang==='ko')return cu.targets.length>1?'우리 둘 다 좋아하는 '+ADJ.ko[o[0]]+'고 '+ADJ.ko[o[1]]+'는 차, 한 주전자요!':
        '할머니가 끓여 주던 '+ADJ.ko[o[0]]+'고 '+ADJ.ko[o[1]]+'는 차가 그리워요.';
      return cu.targets.length>1?'One pot we both love: '+ADJ.en[o[0]]+' and '+ADJ.en[o[1]]+', please!':
        'I miss Grandma\'s '+ADJ.en[o[0]]+', '+ADJ.en[o[1]]+' tea.'}
    return {AXK:AXK,AXC:AXC,ING:ING,N:N,IDX:IDX,STEEP:STEEP,MAXPOT:MAXPOT,MAXEACH:MAXEACH,CUPS:CUPS,TOL:TOL,TOL2:TOL2,
      blend:blend,hasTea:hasTea,within:within,satisfies:satisfies,enumerate:enumerate,countMatches:countMatches,
      HAND:HAND,ANIMALS:ANIMALS,handCustomer:handCustomer,genCustomer:genCustomer,deduce:deduce,avgTarget:avgTarget,l1:l1,
      reaction:reaction,describe:describe,mk:mk}
  })();
  if(typeof module!=='undefined'&&module.exports){module.exports=M;return}

  /* ================= 게임 ================= */
  var ING=M.ING,N=M.N,F=function(s){return s+'px Jua, system-ui, sans-serif'};
  var RC={x:262,y:160,r:60};
  var POT={x:112,y:368};
  var SERVE={x:214,y:350,w:132,h:44},SLIDER={x:226,y:318,w:108};
  var BOOK={x:10,y:316,w:38,h:40};
  function jarRect(i){var c=i%5,r=Math.floor(i/5);return {x:6+c*70,y:440+r*76,w:66,h:72}}
  function chipPos(k,n){return {x:POT.x-(n-1)*13+k*26,y:418}}
  var S;
  var kq=[];
  if(!window.__teaBlendKeys){window.__teaBlendKeys=true;
    window.addEventListener('keydown',function(e){var c=e.code,m={ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D',Space:'add',
        KeyX:'rem',Backspace:'rem',BracketLeft:'s-',BracketRight:'s+',KeyS:'serve',Enter:'serve',KeyJ:'journal',KeyA:'L',KeyD:'R',KeyW:'U'};
      if(m[c]&&S&&S.live){kq.push(m[c]);if(c==='Space'||c==='ArrowUp'||c==='KeyW')S.kbTap=true;if(c!=='Enter'||S.live)e.preventDefault()}})}

  function lerp(a,b,t){return a+(b-a)*t}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function inR(p,r){return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h}
  function counts(){var c=[];for(var i=0;i<N;i++)c[i]=0;S.pot.forEach(function(i){c[i]++});return c}

  function newCustomer(){var cu=S.level<M.HAND.length?M.handCustomer(S.level):M.genCustomer(Math.random,S.level-M.HAND.length);
    cu.known.forEach(function(i){S.journal[i]=true});
    S.cu=cu;S.cups=M.CUPS;S.served=null;S.disp=[0,0,0,0,0];S.alShown=false;S.line=M.describe(cu,S.lang);S.lineT=0;
    var mx=0;cu.targets.forEach(function(t){t.forEach(function(x){mx=Math.max(mx,x)})});S.rmax=Math.max(5,mx*1.18);
    S.pot=[];S.steep=1;S.phase='arrive';S.pt=0;S.mood='neutral';S.sel=cu.shelf[0];S.tries=0;S.lastFail=null}

  function init(a){S={lang:a.lang,live:true,level:0,time:55,score:0,streak:0,journal:[],pot:[],steep:1,phase:'arrive',pt:0,
      t:0,blink:0,blinkT:2,mood:'neutral',showJ:false,flyers:[],leaves:[],motes:[],catEye:0,flash:0,served:null,disp:[0,0,0,0,0],
      morph:1,steam:[],sliderDrag:false,customers:0,shake:0};
    for(var i=0;i<N;i++)S.journal[i]=false;
    for(i=0;i<9;i++)S.leaves.push({x:Math.random()*120,y:Math.random()*100,r:Math.random()*6,v:10+Math.random()*12,s:.7+Math.random()*.5,ph:Math.random()*6});
    for(i=0;i<14;i++)S.motes.push({x:Math.random()*360,y:40+Math.random()*250,v:3+Math.random()*6,ph:Math.random()*6});
    kq.length=0;newCustomer();expose()}

  function expose(){window.__tea={state:function(){return {phase:S.phase,level:S.level,cups:S.cups,pot:S.pot.slice(),steep:S.steep,
      time:S.time,shelf:S.cu.shelf.slice(),journal:S.journal.slice(),served:S.served,targets:S.cu.targets,recipe:S.cu.recipe,showJ:S.showJ}},
    jar:jarRect,serve:SERVE,slider:SLIDER,chip:chipPos,M:M}}

  /* ---------- 행동 ---------- */
  function addScoop(i,a){if(S.phase!=='brew'&&S.phase!=='react')return;
    if(S.cu.shelf.indexOf(i)<0){a.beep(160,.08,'square');return}
    var c=counts();if(S.pot.length>=M.MAXPOT||c[i]>=M.MAXEACH){a.beep(150,.1,'sawtooth');a.pop(POT.x,POT.y-60,S.lang==='ko'?'가득!':'Full!','#ffd9b0');return}
    S.pot.push(i);S.phase='brew';var r=jarRect(i);
    S.flyers.push({x:r.x+r.w/2,y:r.y+8,t:0,i:i});a.beep(420+S.pot.length*70,.07,'triangle')}
  function removeAt(k,a){if(k<0||k>=S.pot.length)return;var i=S.pot.splice(k,1)[0];a.beep(300,.06,'triangle');
    var p=chipPos(k,S.pot.length+1);a.burst(p.x,p.y,ING[i].col,5)}
  function removeSel(a){var k=S.pot.lastIndexOf(S.sel);if(k<0)k=S.pot.length-1;removeAt(k,a)}
  function setSteep(v,a){v=Math.max(0,Math.min(2,v));if(v!==S.steep){S.steep=v;a.beep(500+v*120,.05,'sine')}}
  function serve(a){if((S.phase!=='brew'&&S.phase!=='react')||!S.pot.length){if(!S.pot.length&&S.phase==='brew'){a.beep(150,.1,'square');
        a.pop(POT.x,POT.y-50,S.lang==='ko'?'재료를 넣어요':'Add a scoop','#ffe2c0')}return}
    S.phase='sip';S.pt=0;S.cups--;S.tries++;S.serveC=counts();S.serveS=S.steep;a.sfx('tap');a.beep(700,.12,'sine')}
  function finishSip(a){var c=S.serveC,s=S.serveS,cu=S.cu,v=M.blend(c,s);
    S.served=v;S.morph=0;S.from=S.disp.slice();var firstSip=!S.alShown;S.alShown=true;
    var u=M.deduce(c,S.journal);
    if(u>=0){S.journal[u]=true;var r=jarRect(u);a.pop(r.x+r.w/2,r.y-4,(S.lang==='ko'?'노트 +':'Journal +')+ING[u][S.lang],'#fff3c4');a.beep(1200,.08,'sine')}
    if(cu.allergen>=0&&c[cu.allergen]){S.mood='sneeze';S.line=S.lang==='ko'?'에취! 저는 '+ING[cu.allergen].ko+' 못 먹어요!':'Achoo! I can\'t have '+ING[cu.allergen].en.toLowerCase()+'!';
      a.sfx('hit');a.shake(6);a.burst(POT.x-20,215,'#ffffff',12);fail(a);return}
    if(M.satisfies(c,s,cu)){success(a,v);return}
    S.mood='meh';S.line=M.reaction(v,cu,S.lang);a.beep(240,.18,'triangle');a.burst(RC.x,RC.y,'#c9a36a',6);
    if(firstSip&&cu.allergen>=0)S.line+=(S.lang==='ko'?' (알레르기 표시 확인!)':' (note my allergy!)');
    fail(a)}
  function fail(a){S.streak=0;if(S.cups<=0){S.phase='leave';S.pt=0;S.mood='sad';S.time-=5;a.sfx('hit');
      a.pop(180,150,S.lang==='ko'?'손님이 떠났어요 −5초':'They left… −5s','#ffb0a0');a.shake(5)}
    else{S.phase='react';S.pt=0}}
  function success(a,v){var t=M.avgTarget(S.cu),exact=M.l1(v,t)<.01||(S.cu.targets.length>1&&S.cu.targets.every(function(x){return M.within(v,x,1.01)}));
    var pts=10+S.cups*3+(exact?5:2)+S.streak*2;S.streak++;a.add(pts);S.score+=pts;
    S.time=Math.min(70,S.time+14);S.mood='happy';S.phase='happy';S.pt=0;S.customers++;
    S.line=S.cu.targets.length>1?(S.lang==='ko'?'둘 다 딱 좋아요! 그때 그 맛이에요.':'We both love it! Just like back then.'):
      (S.lang==='ko'?'바로 이 맛이에요! 할머니 생각나요.':'That\'s it! Just like Grandma\'s.');
    a.sfx('win');a.burst(RC.x,RC.y,'#ffd760',22);a.burst(100,210,'#ffb3c6',14);a.pop(RC.x,RC.y-80,'+'+pts,'#ffe27a');
    a.pop(180,120,'+14s','#bff5c8');S.catEye=1.6;a.tempo(1+Math.min(.5,S.customers*.05))}

  /* ---------- 업데이트 ---------- */
  function update(dt,inp,a){S.t+=dt;S.pt+=dt;
    if(S.phase!=='arrive'&&S.phase!=='happy')S.time-=dt;
    if(S.time<=0){S.time=0;S.live=false;a.over();return}
    S.blinkT-=dt;if(S.blinkT<0){S.blink=.14;S.blinkT=2+Math.random()*3}if(S.blink>0)S.blink-=dt;
    if(S.catEye>0)S.catEye-=dt;
    S.morph=Math.min(1,S.morph+dt*2.2);
    if(S.served){var e=1-Math.pow(1-S.morph,3);for(var k=0;k<5;k++)S.disp[k]=lerp(S.from[k],S.served[k],e)}
    for(var i=S.flyers.length-1;i>=0;i--){var f=S.flyers[i];f.t+=dt*2.6;if(f.t>=1){S.flyers.splice(i,1);a.burst(POT.x,POT.y-30,ING[f.i].col,6)}}
    if(S.phase==='arrive'&&S.pt>.8){S.phase='brew';S.pt=0}
    if(S.phase==='sip'&&S.pt>1.25)finishSip(a);
    if(S.phase==='happy'&&S.pt>1.5){S.level++;newCustomer()}
    if(S.phase==='leave'&&S.pt>1.4){S.level++;newCustomer()}
    if(S.phase==='react'&&S.pt>1.2&&S.mood!=='sneeze')S.mood='neutral';
    /* 키보드 */
    while(kq.length){var c=kq.shift();
      if(c==='journal'){S.showJ=!S.showJ;a.beep(S.showJ?660:520,.05,'sine');continue}
      if(c==='L'||c==='R'||c==='U'||c==='D'){moveSel(c);a.beep(380,.03,'square');continue}
      if(c==='add')addScoop(S.sel,a);else if(c==='rem')removeSel(a);else if(c==='s-')setSteep(S.steep-1,a);
      else if(c==='s+')setSteep(S.steep+1,a);else if(c==='serve')serve(a)}
    if(S.kbTap){S.kbTap=false;inp.tap=false}
    inp.tap=inp.tap&&inp.x!=null;
    /* 터치/마우스 */
    if(S.sliderDrag){if(inp.down&&inp.x!=null){setSteep(Math.round((inp.x-SLIDER.x)/(SLIDER.w/2)),a)}else S.sliderDrag=false}
    if(inp.tap){var p={x:inp.x,y:inp.y};
      if(S.showJ){S.showJ=false;a.beep(520,.05,'sine');return}
      if(inR(p,BOOK)){S.showJ=true;a.beep(660,.05,'sine');return}
      for(i=0;i<N;i++)if(inR(p,jarRect(i))){S.sel=i;addScoop(i,a);return}
      for(k=S.pot.length-1;k>=0;k--){var q=chipPos(k,S.pot.length);if(Math.abs(p.x-q.x)<13&&Math.abs(p.y-q.y)<14){removeAt(k,a);return}}
      if(p.x>SLIDER.x-14&&p.x<SLIDER.x+SLIDER.w+14&&Math.abs(p.y-SLIDER.y)<16){S.sliderDrag=true;setSteep(Math.round((p.x-SLIDER.x)/(SLIDER.w/2)),a);return}
      if(inR(p,SERVE)){serve(a);return}
    }}
  function moveSel(c){var sh=S.cu.shelf,cur=S.sel,best=null,bd=1e9;
    var cc=cur%5,cr=Math.floor(cur/5);
    sh.forEach(function(i){if(i===cur)return;var x=i%5,y=Math.floor(i/5),d;
      if(c==='L'){if(!(y===cr&&x<cc)&&!(y!==cr&&true))return;d=(y===cr?cc-x:20+Math.abs(x-cc))+(y===cr?0:0)}
      if(c==='R'){if(!(y===cr&&x>cc)&&!(y!==cr))return;d=y===cr?x-cc:20+Math.abs(x-cc)}
      if(c==='U'){if(y>=cr)return;d=Math.abs(x-cc)}
      if(c==='D'){if(y<=cr)return;d=Math.abs(x-cc)}
      if(d<bd){bd=d;best=i}});
    /* 좌우는 진열 순서로 순환 */
    if(c==='L'||c==='R'){var k=sh.indexOf(cur);k=(k+(c==='R'?1:sh.length-1))%sh.length;best=sh[k]}
    if(best!=null)S.sel=best}

  /* ================= 그리기 ================= */
  function teaColor(c,s){var r=0,g=0,b=0,w=0;for(var i=0;i<N;i++)if(c[i]){var k=c[i]*(ING[i].tea?.7+.5*s:1);
      r+=ING[i].liq[0]*k;g+=ING[i].liq[1]*k;b+=ING[i].liq[2]*k;w+=k}
    if(!w)return null;var d=1-s*.08;return [r/w*d|0,g/w*d|0,b/w*d|0]}
  function draw(g,a){if(!S)return;var t=S.t,L=S.lang;
    drawRoom(g,t);drawCustomer(g,t);drawRadar(g,t,L);drawBubble(g,L);drawCounter(g,t,L);drawNames(g);drawShelf(g,t,L);drawTimer(g,L);
    for(var i=0;i<S.flyers.length;i++){var f=S.flyers[i],r=jarRect(f.i),x0=r.x+r.w/2,y0=r.y,u=f.t,
        x=lerp(x0,POT.x,u),y=lerp(y0,POT.y-36,u)-Math.sin(u*Math.PI)*70;
      g.fillStyle=ING[f.i].col;g.beginPath();g.ellipse(x,y,6,4,u*6,0,7);g.fill();g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.arc(x-2,y-1,1.5,0,7);g.fill()}
    if(S.level===0&&S.phase!=='happy')drawHint(g,t,L);
    if(S.showJ)drawJournal(g,L)}

  function drawRoom(g,t){
    var bg=g.createLinearGradient(0,0,0,300);bg.addColorStop(0,'#4a2a1c');bg.addColorStop(.5,'#6e4229');bg.addColorStop(1,'#875533');
    g.fillStyle=bg;g.fillRect(0,0,360,300);
    g.strokeStyle='rgba(0,0,0,.14)';g.lineWidth=2;for(var x=0;x<360;x+=40){g.beginPath();g.moveTo(x+.5,0);g.lineTo(x+.5,300);g.stroke()}
    g.strokeStyle='rgba(255,220,170,.05)';for(x=2;x<360;x+=40){g.beginPath();g.moveTo(x+.5,0);g.lineTo(x+.5,300);g.stroke()}
    /* 창문 */
    var W={x:14,y:48,w:112,h:90};g.save();rr(g,W.x,W.y,W.w,W.h,8);g.clip();
    var sk=g.createLinearGradient(0,W.y,0,W.y+W.h);sk.addColorStop(0,'#f7b267');sk.addColorStop(.6,'#f79d84');sk.addColorStop(1,'#e58f9a');
    g.fillStyle=sk;g.fillRect(W.x,W.y,W.w,W.h);
    g.fillStyle='rgba(255,240,200,.8)';g.beginPath();g.arc(W.x+80,W.y+40,12,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.35)';for(var k=0;k<3;k++){var cx=W.x+((t*4+k*50)%170)-30;g.beginPath();g.ellipse(cx,W.y+18+k*12,16,4,0,0,7);g.fill()}
    g.fillStyle='#b8606a';g.beginPath();g.moveTo(W.x,W.y+W.h);for(x=0;x<=W.w;x+=8)g.lineTo(W.x+x,W.y+62+Math.sin(x*.07+1)*8);g.lineTo(W.x+W.w,W.y+W.h);g.fill();
    g.fillStyle='#8f4552';g.beginPath();g.moveTo(W.x,W.y+W.h);for(x=0;x<=W.w;x+=8)g.lineTo(W.x+x,W.y+74+Math.sin(x*.11+3)*6);g.lineTo(W.x+W.w,W.y+W.h);g.fill();
    S.leaves.forEach(function(l){var ly=(l.y+t*l.v)%110-10,lx=l.x+Math.sin(t*1.3+l.ph)*8;drawMaple(g,W.x+lx,W.y+ly,4.5*l.s,l.r+t*1.5,l.ph>3?'#e2572e':'#f08a2e')});
    g.restore();
    g.strokeStyle='#3a2014';g.lineWidth=5;rr(g,W.x,W.y,W.w,W.h,8);g.stroke();
    g.lineWidth=3;g.beginPath();g.moveTo(W.x+W.w/2,W.y);g.lineTo(W.x+W.w/2,W.y+W.h);g.moveTo(W.x,W.y+W.h/2);g.lineTo(W.x+W.w,W.y+W.h/2);g.stroke();
    g.fillStyle='#5a3220';g.fillRect(W.x-6,W.y+W.h,W.w+12,9);g.fillStyle='rgba(255,220,170,.2)';g.fillRect(W.x-6,W.y+W.h,W.w+12,2);
    drawCat(g,W.x+30,W.y+W.h,t);
    /* 주전자 */
    g.fillStyle='#5a3220';g.fillRect(140,128,48,6);
    var kx=164,ky=112;g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(kx,ky+16,18,3,0,0,7);g.fill();
    var kg=g.createRadialGradient(kx-5,ky-4,2,kx,ky,18);kg.addColorStop(0,'#d9e1e4');kg.addColorStop(1,'#6f7d84');
    g.fillStyle=kg;g.beginPath();g.ellipse(kx,ky+3,15,13,0,0,7);g.fill();
    g.strokeStyle='#59656b';g.lineWidth=3;g.beginPath();g.moveTo(kx+12,ky);g.quadraticCurveTo(kx+22,ky-2,kx+24,ky-9);g.stroke();
    g.beginPath();g.arc(kx,ky-8,9,Math.PI*1.1,Math.PI*1.9);g.stroke();g.fillStyle='#3a2014';g.beginPath();g.arc(kx,ky-10,2.5,0,7);g.fill();
    for(k=0;k<4;k++){var st=((t*.5+k/4)%1),sx=kx+24+Math.sin(st*6+k)*5*st,sy=ky-10-st*40;
      g.fillStyle='rgba(255,255,255,'+(.28*(1-st))+')';g.beginPath();g.arc(sx,sy,3+st*6,0,7);g.fill()}
    /* 등불 */
    [[196,44],[344,44]].forEach(function(p,i){var sw=Math.sin(t*1.2+i*2)*.08;g.save();g.translate(p[0],30);g.rotate(sw);
      g.strokeStyle='#2b170e';g.lineWidth=1.5;g.beginPath();g.moveTo(0,0);g.lineTo(0,p[1]-30);g.stroke();
      var gl=g.createRadialGradient(0,p[1]-12,2,0,p[1]-12,38);gl.addColorStop(0,'rgba(255,190,90,.38)');gl.addColorStop(1,'rgba(255,190,90,0)');
      g.fillStyle=gl;g.beginPath();g.arc(0,p[1]-12,38,0,7);g.fill();
      var lg=g.createLinearGradient(-11,0,11,0);lg.addColorStop(0,'#c8402a');lg.addColorStop(.5,'#f2804a');lg.addColorStop(1,'#b8361f');
      g.fillStyle=lg;g.beginPath();g.ellipse(0,p[1]-12,11,15,0,0,7);g.fill();
      g.strokeStyle='rgba(90,20,10,.4)';g.lineWidth=1;for(var j=-1;j<=1;j++){g.beginPath();g.ellipse(0,p[1]-12,Math.abs(j)*7+1,15,0,0,7);g.stroke()}
      g.fillStyle='#2b170e';g.fillRect(-6,p[1]-29,12,4);g.fillRect(-6,p[1]+1,12,4);g.restore()});
    S.motes.forEach(function(m){var y=40+((m.y-40-t*m.v)%250+250)%250;g.fillStyle='rgba(255,220,160,'+(.15+.12*Math.sin(t*2+m.ph))+')';
      g.beginPath();g.arc(m.x+Math.sin(t*.6+m.ph)*6,y,1.4,0,7);g.fill()})}
  function drawMaple(g,x,y,s,r,c){g.save();g.translate(x,y);g.rotate(r);g.fillStyle=c;g.beginPath();
    for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,rad=i%2?s*.45:s;if(i===4||i===6)rad*=.8;g.lineTo(Math.cos(a)*rad,Math.sin(a)*rad)}g.closePath();g.fill();
    g.strokeStyle='rgba(90,30,10,.5)';g.lineWidth=.8;g.beginPath();g.moveTo(0,0);g.lineTo(0,s*1.3);g.stroke();g.restore()}
  function drawCat(g,x,y,t){var br=Math.sin(t*1.8)*1.2,awake=S.catEye>0;
    g.fillStyle='#b5455a';g.beginPath();g.ellipse(x+8,y-2,30,6,0,0,7);g.fill();g.fillStyle='#d9667a';g.beginPath();g.ellipse(x+8,y-4,28,4,0,0,7);g.fill();
    g.fillStyle='#e8a35a';g.beginPath();g.ellipse(x+8,y-12-br*.4,20,10+br*.5,0,0,7);g.fill();
    g.strokeStyle='#c27a36';g.lineWidth=2;for(var i=0;i<3;i++){g.beginPath();g.arc(x+4+i*7,y-14,5,Math.PI*1.2,Math.PI*1.7);g.stroke()}
    g.fillStyle='#e8a35a';g.beginPath();g.arc(x-8,y-12,9,0,7);g.fill();
    g.beginPath();g.moveTo(x-15,y-17);g.lineTo(x-14,y-26);g.lineTo(x-8,y-20);g.fill();g.beginPath();g.moveTo(x-5,y-20);g.lineTo(x-1,y-27);g.lineTo(x,y-16);g.fill();
    g.strokeStyle='#e8a35a';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(x+26,y-8);g.quadraticCurveTo(x+34,y-4,x+18,y-3);g.stroke();g.lineCap='butt';
    g.strokeStyle='#4a2a1c';g.lineWidth=1.4;
    if(awake){g.fillStyle='#4a2a1c';g.beginPath();g.arc(x-11,y-13,1.6,0,7);g.arc(x-5,y-13,1.6,0,7);g.fill()}
    else{g.beginPath();g.arc(x-11,y-13,2,.2,Math.PI-.2);g.stroke();g.beginPath();g.arc(x-5,y-13,2,.2,Math.PI-.2);g.stroke();
      g.fillStyle='rgba(255,255,255,'+(.5+.4*Math.sin(t*2))+')';g.font=F(9);g.textAlign='left';g.fillText('z',x-2,y-26-((t*6)%8));g.font=F(7);g.fillText('z',x+4,y-32-((t*6)%8))}
    g.fillStyle='#f29aa8';g.beginPath();g.arc(x-8,y-9,1.3,0,7);g.fill()}

  /* ---------- 손님 ---------- */
  var LOOK={
    rabbit:{fur:'#f4eee8',in:'#f6b8c4',ear:'long',mz:'#fff'},owl:{fur:'#9a6b45',in:'#e8cfa4',ear:'tuft',mz:'#e8cfa4',beak:1},
    hedgehog:{fur:'#e9c99c',in:'#7a5232',ear:'spike',mz:'#f6e2c4'},bear:{fur:'#a06a40',in:'#e2b78c',ear:'round',mz:'#e6c49c'},
    fox:{fur:'#ea8a3c',in:'#fff2e2',ear:'point',mz:'#fff4ea'},deer:{fur:'#c99a66',in:'#f2d5b2',ear:'deer',mz:'#f2dfc4'},
    raccoon:{fur:'#9ea3aa',in:'#555a62',ear:'round',mz:'#eef0f2',mask:1},panda:{fur:'#fbfbf8',in:'#2a2a2e',ear:'round',mz:'#fff',patch:1},
    duck:{fur:'#ffd65a',in:'#ffd65a',ear:'tuftd',mz:'#ffd65a',bill:1},sheep:{fur:'#f2e6d2',in:'#d9c3a6',ear:'wool',mz:'#f6eee2'},
    frog:{fur:'#7cc56a',in:'#5aa04a',ear:'frog',mz:'#c8e8a8'},mole:{fur:'#6a5a58',in:'#f19aa8',ear:'none',mz:'#a8908a',nose:1}};
  function drawCustomer(g,t){var cu=S.cu,n=cu.an.length,ph=S.phase,off=0;
    if(ph==='arrive')off=-(1-Math.min(1,S.pt/.8))*220;
    if(ph==='happy'&&S.pt>.9)off=(S.pt-.9)*420;if(ph==='leave'&&S.pt>.6)off=-(S.pt-.6)*300;
    for(var k=0;k<n;k++){var x=(n>1?46+k*74:100)+off,s=n>1?.78:1,y=222+(n>1?6:0)+Math.sin(t*2+k)*1.5;
      var an=M.ANIMALS[cu.an[k]];drawAnimal(g,an.k,x,y,s,t+k*1.7,k)}
    /* 알레르기 표시 */
    if(S.alShown&&cu.allergen>=0){var ax=n>1?20:150,ay=n>1?164:176;g.fillStyle='rgba(255,250,240,.95)';g.beginPath();g.arc(ax,ay,13,0,7);g.fill();
      g.fillStyle=ING[cu.allergen].col;g.beginPath();g.arc(ax,ay,7,0,7);g.fill();
      g.strokeStyle='#d8352a';g.lineWidth=3;g.beginPath();g.arc(ax,ay,11,0,7);g.stroke();g.beginPath();g.moveTo(ax-8,ay-8);g.lineTo(ax+8,ay+8);g.stroke();
      g.font=F(10);g.fillStyle='#ffd6cc';g.textAlign='center';g.fillText(ING[cu.allergen][S.lang],ax,ay+24)}}
  function drawNames(g){var cu=S.cu,n=cu.an.length;g.font=F(10);g.textAlign='center';
    for(var k=0;k<n;k++){var an=M.ANIMALS[cu.an[k]],x=n>1?62+k*82:100,txt=(k===0?(S.level+1)+'. ':'')+an[S.lang],w=g.measureText(txt).width+12;
      if(n>1)x=46+k*74;g.fillStyle='rgba(40,20,10,.45)';rr(g,x-w/2,298,w,14,7);g.fill();g.fillStyle='#ffe8c8';g.fillText(txt,x,309)}}
  function drawAnimal(g,kind,x,y,s,t,k){var L=LOOK[kind],mood=S.mood,ph=S.phase,R=30*s;
    var sip=ph==='sip'?Math.min(1,S.pt/.35)*(S.pt>1?Math.max(0,1-(S.pt-1)/.25):1):0;
    g.save();g.translate(x,y);
    /* 몸 */
    g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(0,R*2.2,R*1.5,R*.4,0,0,7);g.fill();
    var bg=g.createLinearGradient(0,R*.6,0,R*2.4);bg.addColorStop(0,L.fur);bg.addColorStop(1,shade(L.fur,-.25));
    g.fillStyle=bg;g.beginPath();g.ellipse(0,R*1.75,R*1.25,R*1.1,0,0,7);g.fill();
    g.fillStyle='#f6efe2';g.beginPath();g.moveTo(-R*.7,R*1.1);g.quadraticCurveTo(0,R*1.5,R*.7,R*1.1);g.lineTo(R*.8,R*2.6);g.lineTo(-R*.8,R*2.6);g.fill();
    g.fillStyle=['#c96b4a','#5f8f7a','#7a6bb0'][(k+S.level)%3];g.fillRect(-R*.8,R*1.95,R*1.6,R*.18);
    /* 귀 */
    g.fillStyle=L.fur;var e=L.ear;
    if(e==='long'){[-1,1].forEach(function(d){g.save();g.rotate(d*.18+Math.sin(t*1.5)*.04*d);g.fillStyle=L.fur;g.beginPath();g.ellipse(d*R*.42,-R*1.25,R*.24,R*.7,0,0,7);g.fill();
        g.fillStyle=L.in;g.beginPath();g.ellipse(d*R*.42,-R*1.2,R*.12,R*.5,0,0,7);g.fill();g.restore()})}
    else if(e==='round'){[-1,1].forEach(function(d){g.fillStyle=L.patch?L.in:L.fur;g.beginPath();g.arc(d*R*.72,-R*.72,R*.34,0,7);g.fill();
        g.fillStyle=L.patch?'#444':L.in;g.beginPath();g.arc(d*R*.72,-R*.72,R*.17,0,7);g.fill()})}
    else if(e==='point'||e==='deer'){[-1,1].forEach(function(d){g.fillStyle=L.fur;g.beginPath();g.moveTo(d*R*.3,-R*.8);g.lineTo(d*R*(e==='deer'?1.1:.8),-R*(e==='deer'?.9:1.35));g.lineTo(d*R*.85,-R*.35);g.fill();
        g.fillStyle=L.in;g.beginPath();g.moveTo(d*R*.42,-R*.72);g.lineTo(d*R*(e==='deer'?.95:.75),-R*(e==='deer'?.85:1.15));g.lineTo(d*R*.75,-R*.45);g.fill()});
      if(e==='deer'){g.strokeStyle='#8a5a32';g.lineWidth=3*s;g.lineCap='round';[-1,1].forEach(function(d){g.beginPath();g.moveTo(d*R*.3,-R*.85);g.lineTo(d*R*.5,-R*1.5);g.moveTo(d*R*.42,-R*1.2);g.lineTo(d*R*.75,-R*1.35);g.moveTo(d*R*.48,-R*1.42);g.lineTo(d*R*.3,-R*1.7);g.stroke()});g.lineCap='butt'}}
    else if(e==='tuft'){[-1,1].forEach(function(d){g.fillStyle=shade(L.fur,-.15);g.beginPath();g.moveTo(d*R*.35,-R*.8);g.lineTo(d*R*.85,-R*1.3);g.lineTo(d*R*.8,-R*.5);g.fill()})}
    else if(e==='spike'){g.fillStyle='#5e3c22';g.beginPath();for(var i=0;i<=14;i++){var aa=Math.PI*(.92+i*.0829),rad=i%2?R*1.0:R*1.5;g.lineTo(Math.cos(aa)*rad,Math.sin(aa)*rad*.95+R*.1)}g.fill()}
    else if(e==='wool'){g.fillStyle='#fffaf0';for(i=0;i<9;i++){var aw=Math.PI*(.95+i*.14);g.beginPath();g.arc(Math.cos(aw)*R*.95,Math.sin(aw)*R*.85-R*.05,R*.38,0,7);g.fill()}
      g.fillStyle=L.in;[-1,1].forEach(function(d){g.beginPath();g.ellipse(d*R*1.05,-R*.05,R*.32,R*.15,d*.4,0,7);g.fill()})}
    else if(e==='frog'){[-1,1].forEach(function(d){g.fillStyle=L.fur;g.beginPath();g.arc(d*R*.48,-R*.72,R*.36,0,7);g.fill()})}
    else if(e==='tuftd'){g.strokeStyle=L.fur;g.lineWidth=3*s;g.beginPath();g.moveTo(0,-R*.9);g.quadraticCurveTo(R*.2,-R*1.4,R*.35,-R*1.2);g.moveTo(0,-R*.9);g.quadraticCurveTo(-R*.1,-R*1.35,R*.1,-R*1.45);g.stroke()}
    /* 머리 */
    var hg=g.createRadialGradient(-R*.3,-R*.4,R*.2,0,0,R*1.1);hg.addColorStop(0,shade(L.fur,.12));hg.addColorStop(1,shade(L.fur,-.12));
    g.fillStyle=hg;g.beginPath();g.ellipse(0,0,R*1.02,R*.95,0,0,7);g.fill();
    if(L.mask){g.fillStyle='#3e4248';g.beginPath();g.ellipse(-R*.36,-R*.08,R*.32,R*.2,-.2,0,7);g.ellipse(R*.36,-R*.08,R*.32,R*.2,.2,0,7);g.fill()}
    if(L.patch){g.fillStyle='#2a2a2e';g.beginPath();g.ellipse(-R*.36,-R*.05,R*.22,R*.27,.5,0,7);g.ellipse(R*.36,-R*.05,R*.22,R*.27,-.5,0,7);g.fill()}
    if(kind==='owl'){g.fillStyle=L.in;g.beginPath();g.arc(-R*.36,-R*.08,R*.33,0,7);g.arc(R*.36,-R*.08,R*.33,0,7);g.fill()}
    g.fillStyle=L.mz;g.beginPath();g.ellipse(0,R*.38,R*.45,R*.3,0,0,7);g.fill();
    if(kind==='fox'){g.fillStyle='#fff4ea';g.beginPath();g.ellipse(-R*.55,R*.3,R*.35,R*.3,.3,0,7);g.ellipse(R*.55,R*.3,R*.35,R*.3,-.3,0,7);g.fill()}
    /* 눈 */
    var closed=S.blink>0,eyeY=kind==='frog'?-R*.72:-R*.08,ex=kind==='frog'?R*.48:R*.36,er=R*(kind==='mole'?.06:.12);
    if(kind==='frog'){g.fillStyle='#fff';g.beginPath();g.arc(-ex,eyeY,R*.24,0,7);g.arc(ex,eyeY,R*.24,0,7);g.fill()}
    g.strokeStyle='#2a1a14';g.fillStyle='#2a1a14';g.lineWidth=2.4*s;g.lineCap='round';
    var eyeCol=L.patch||L.mask?'#fff':'#2a1a14';
    [-1,1].forEach(function(d){var cx=d*ex;
      if(sip>.3||mood==='happy'){g.strokeStyle=eyeCol;g.beginPath();if(mood==='happy'&&sip<=.3)g.arc(cx,eyeY+R*.05,R*.12,Math.PI*1.15,Math.PI*1.85);else g.arc(cx,eyeY-R*.03,R*.11,.2,Math.PI-.2);g.stroke()}
      else if(closed||mood==='sneeze'){g.strokeStyle=eyeCol;g.beginPath();g.moveTo(cx-R*.12,eyeY);g.lineTo(cx+R*.12,eyeY+(mood==='sneeze'?-d*R*.05:0));g.stroke()}
      else{g.fillStyle=L.patch||L.mask?'#1a1a1e':'#2a1a14';g.beginPath();g.ellipse(cx,eyeY,er,er*1.25,0,0,7);g.fill();
        if(L.patch||L.mask){g.fillStyle='#2a1a14'}g.fillStyle='#fff';g.beginPath();g.arc(cx-er*.35,eyeY-er*.45,er*.4,0,7);g.fill()}
      if(mood==='sad'||mood==='meh'){g.strokeStyle=L.patch||L.mask?'#fff':'#5a3a2a';g.lineWidth=2*s;g.beginPath();
        var tilt=mood==='sad'?.1:.04;g.moveTo(cx-d*R*.14,eyeY-R*(.32+tilt));g.lineTo(cx+d*R*.14,eyeY-R*.24);g.stroke();g.lineWidth=2.4*s}});
    /* 볼 */
    g.fillStyle='rgba(255,120,130,'+(mood==='happy'?.5:.28)+')';g.beginPath();g.ellipse(-R*.62,R*.22,R*.15,R*.09,0,0,7);g.ellipse(R*.62,R*.22,R*.15,R*.09,0,0,7);g.fill();
    /* 코/입 */
    if(L.beak){g.fillStyle='#e8a030';g.beginPath();g.moveTo(-R*.1,R*.18);g.lineTo(R*.1,R*.18);g.lineTo(0,R*.42);g.fill()}
    else if(L.bill){g.fillStyle='#f08a2a';g.beginPath();g.ellipse(0,R*.36,R*.32,R*.14,0,0,7);g.fill()}
    else{g.fillStyle=L.nose?'#f19aa8':'#4a2a20';g.beginPath();g.ellipse(0,R*.24,R*(L.nose?.14:.09),R*(L.nose?.1:.065),0,0,7);g.fill()}
    g.strokeStyle='#4a2a20';g.lineWidth=2*s;var my=R*.48;g.beginPath();
    if(mood==='sneeze'){g.fillStyle='#7a3030';g.ellipse(0,my,R*.1,R*.12,0,0,7);g.fill()}
    else if(mood==='happy'){g.arc(0,my-R*.1,R*.18,.3,Math.PI-.3);g.stroke()}
    else if(mood==='sad'){g.arc(0,my+R*.12,R*.13,Math.PI+.5,-.5);g.stroke()}
    else if(mood==='meh'){g.moveTo(-R*.12,my);g.quadraticCurveTo(0,my-R*.04,R*.12,my+R*.03);g.stroke()}
    else{g.moveTo(-R*.1,my-R*.03);g.quadraticCurveTo(-R*.05,my+R*.04,0,my-R*.02);g.quadraticCurveTo(R*.05,my+R*.04,R*.1,my-R*.03);g.stroke()}
    if(mood==='sad'){g.fillStyle='rgba(120,190,255,.8)';g.beginPath();g.ellipse(R*.42,R*.15+((t*30)%10),R*.05,R*.08,0,0,7);g.fill()}
    g.lineCap='butt';
    /* 찻잔 */
    if(sip>0){var cy=R*1.4-sip*R*.95,cx2=R*.15;
      g.fillStyle='#fff8ee';g.beginPath();g.moveTo(cx2-R*.38,cy-R*.18);g.lineTo(cx2+R*.38,cy-R*.18);g.quadraticCurveTo(cx2+R*.34,cy+R*.32,cx2,cy+R*.32);g.quadraticCurveTo(cx2-R*.34,cy+R*.32,cx2-R*.38,cy-R*.18);g.fill();
      var tc=teaColor(S.serveC,S.serveS)||[180,140,80];g.fillStyle='rgb('+tc+')';g.beginPath();g.ellipse(cx2,cy-R*.17,R*.36,R*.07,0,0,7);g.fill();
      g.strokeStyle='#fff8ee';g.lineWidth=3*s;g.beginPath();g.arc(cx2+R*.42,cy,R*.12,-1.2,1.2);g.stroke();
      g.strokeStyle='#d98a6a';g.lineWidth=1.5;g.beginPath();g.moveTo(cx2-R*.34,cy-R*.05);g.lineTo(cx2+R*.34,cy-R*.05);g.stroke();
      for(var q=0;q<2;q++){var u=((t*.8+q*.5)%1);g.fillStyle='rgba(255,255,255,'+(.4*(1-u))+')';g.beginPath();g.arc(cx2+Math.sin(u*6+q)*4,cy-R*.3-u*R*.6,2+u*4,0,7);g.fill()}}
    if(mood==='happy'){for(q=0;q<3;q++){var hu=((t*.7+q/3)%1);drawHeart(g,(q-1)*R*.7,-R*1.2-hu*R,4*s*(1-hu*.3),'rgba(255,110,140,'+(1-hu)+')')}}
    g.restore()}
  function drawHeart(g,x,y,s,c){g.fillStyle=c;g.beginPath();g.moveTo(x,y+s);g.bezierCurveTo(x-s*2,y-s*.5,x-s*.8,y-s*2,x,y-s*.6);g.bezierCurveTo(x+s*.8,y-s*2,x+s*2,y-s*.5,x,y+s);g.fill()}
  function shade(hex,f){var n=parseInt(hex.slice(1),16),r=n>>16,g2=n>>8&255,b=n&255;
    if(f>0){r+=(255-r)*f;g2+=(255-g2)*f;b+=(255-b)*f}else{r*=1+f;g2*=1+f;b*=1+f}return 'rgb('+(r|0)+','+(g2|0)+','+(b|0)+')'}

  /* ---------- 레이더 ---------- */
  function radarPts(v,cx,cy,r,max){var p=[];for(var a=0;a<5;a++){var ang=-Math.PI/2+a*Math.PI*2/5,k=Math.min(1.25,Math.max(0,v[a])/max);
      p.push([cx+Math.cos(ang)*r*k,cy+Math.sin(ang)*r*k])}return p}
  function poly(g,p){g.beginPath();p.forEach(function(q,i){i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])});g.closePath()}
  function drawRadar(g,t,L){var cx=RC.x,cy=RC.y,r=RC.r;
    g.save();g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.arc(cx+3,cy+5,r+30,0,7);g.fill();
    var pg=g.createRadialGradient(cx-20,cy-25,10,cx,cy,r+30);pg.addColorStop(0,'#fff9ec');pg.addColorStop(1,'#efdcb8');
    g.fillStyle=pg;g.beginPath();g.arc(cx,cy,r+28,0,7);g.fill();g.strokeStyle='#b8885a';g.lineWidth=2;g.stroke();
    g.strokeStyle='rgba(140,100,60,.25)';g.lineWidth=1;for(var k=1;k<=4;k++){var q=S.rmax*k/4;poly(g,radarPts([q,q,q,q,q],cx,cy,r,S.rmax));g.stroke()}
    for(var a=0;a<5;a++){var ang=-Math.PI/2+a*Math.PI*2/5;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(ang)*r,cy+Math.sin(ang)*r);g.stroke();
      var lx=cx+Math.cos(ang)*(r+16),ly=cy+Math.sin(ang)*(r+15)+4;g.font=F(11);g.textAlign='center';g.fillStyle=M.AXC[a];g.fillText(M.AXK[L][a],lx,ly)}
    /* 대접한 맛 */
    if(S.served){var sp=radarPts(S.disp,cx,cy,r,S.rmax),tc=teaColor(S.serveC,S.serveS)||[120,160,120];
      g.fillStyle='rgba('+tc+',.45)';poly(g,sp);g.fill();g.strokeStyle='rgba('+tc.map(function(x){return x*.6|0})+',.95)';g.lineWidth=2;g.stroke();
      sp.forEach(function(q,i){g.fillStyle=M.AXC[i];g.beginPath();g.arc(q[0],q[1],3,0,7);g.fill()})}
    /* 목표(점선) */
    var cols=['#d99a1a','#d0508a'];S.cu.targets.forEach(function(tg,i){var tp=radarPts(tg,cx,cy,r,S.rmax);
      g.setLineDash([5,4]);g.lineDashOffset=-t*12;g.strokeStyle=cols[i];g.lineWidth=2.6;poly(g,tp);g.stroke();g.setLineDash([]);
      tp.forEach(function(q){g.fillStyle=cols[i];g.beginPath();g.arc(q[0],q[1],2.2,0,7);g.fill()})});
    /* 범례 */
    g.font=F(10);g.textAlign='left';var ly2=cy+r+23;
    g.setLineDash([4,3]);g.strokeStyle=cols[0];g.lineWidth=2;g.beginPath();g.moveTo(cx-56,ly2-3);g.lineTo(cx-44,ly2-3);g.stroke();g.setLineDash([]);if(S.cu.targets.length>1){g.setLineDash([4,3]);g.strokeStyle=cols[1];g.beginPath();g.moveTo(cx-56,ly2+1);g.lineTo(cx-44,ly2+1);g.stroke();g.setLineDash([])}
    g.fillStyle='#6a4a2a';g.fillText(L==='ko'?'기억':'Memory',cx-41,ly2);
    g.fillStyle='rgba(120,160,110,.7)';g.fillRect(cx+4,ly2-8,10,8);g.fillStyle='#6a4a2a';g.fillText(L==='ko'?'대접':'Served',cx+17,ly2);
    if(S.phase==='sip'){g.fillStyle='rgba(255,249,236,.75)';g.beginPath();g.arc(cx,cy,r+6,0,7);g.fill();
      g.fillStyle='#8a5a32';g.font=F(14);g.textAlign='center';g.fillText(L==='ko'?'후루룩…':'sip…',cx,cy+5+Math.sin(t*6)*2)}
    if(S.phase==='happy'){g.globalAlpha=Math.min(1,S.pt*2);g.fillStyle='#e2861a';g.font=F(24);g.textAlign='center';g.fillText(L==='ko'?'완벽!':'Perfect!',cx,cy+8);g.globalAlpha=1}
    g.restore()}

  function wrap(g,text,w){var words=text.split(' '),lines=[],cur='';words.forEach(function(wd){var tt=cur?cur+' '+wd:wd;
      if(g.measureText(tt).width>w&&cur){lines.push(cur);cur=wd}else cur=tt});if(cur)lines.push(cur);return lines}
  function drawBubble(g,L){var x=150,y=252,w=204,h=38;
    g.font=F(12);var lines=wrap(g,S.line,w-16);if(lines.length>2){lines=lines.slice(0,2)}
    g.fillStyle='rgba(0,0,0,.2)';rr(g,x+2,y+3,w,h,12);g.fill();
    g.fillStyle='#fffaf0';rr(g,x,y,w,h,12);g.fill();g.beginPath();g.moveTo(x+4,y+12);g.lineTo(x-12,y+6);g.lineTo(x+6,y+24);g.fill();
    g.fillStyle=S.mood==='happy'?'#b85a10':S.mood==='sneeze'||S.mood==='sad'?'#b03a2a':'#5a3a22';g.textAlign='left';
    lines.forEach(function(l,i){g.fillText(l,x+9,y+(lines.length>1?16:24)+i*15)})}

  /* ---------- 카운터: 찻주전자, 우림, 대접 ---------- */
  function drawCounter(g,t,L){
    var cg=g.createLinearGradient(0,292,0,432);cg.addColorStop(0,'#a8683a');cg.addColorStop(.12,'#8a5230');cg.addColorStop(1,'#5a321c');
    g.fillStyle=cg;g.fillRect(0,292,360,140);g.fillStyle='#c48552';g.fillRect(0,292,360,6);g.fillStyle='rgba(255,230,190,.35)';g.fillRect(0,292,360,1.5);
    g.strokeStyle='rgba(40,20,10,.25)';g.lineWidth=1;for(var y=312;y<432;y+=22){g.beginPath();g.moveTo(0,y);g.bezierCurveTo(120,y+3,240,y-3,360,y);g.stroke()}
    /* 책 */
    var b=BOOK;g.fillStyle='rgba(0,0,0,.25)';g.fillRect(b.x+3,b.y+4,b.w,b.h);g.fillStyle='#3f6a5a';rr(g,b.x,b.y,b.w,b.h,4);g.fill();
    g.fillStyle='#f6ead0';g.fillRect(b.x+b.w-6,b.y+3,4,b.h-6);g.fillStyle='#e8c46a';g.fillRect(b.x+6,b.y+10,b.w-16,4);g.fillRect(b.x+6,b.y+18,b.w-20,3);
    var kn=S.journal.filter(Boolean).length;g.font=F(10);g.textAlign='center';g.fillStyle='#fff3cf';g.fillText(kn+'/'+N,b.x+b.w/2-2,b.y+b.h-6);
    g.fillStyle='rgba(255,236,210,.75)';g.font=F(9);g.fillText(L==='ko'?'노트 J':'Book J',b.x+b.w/2,b.y+b.h+11);
    /* 찻주전자 */
    var c=counts(),tc=teaColor(c,S.steep),px=POT.x,py=POT.y,n=S.pot.length;
    g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(px,py+40,56,8,0,0,7);g.fill();
    g.strokeStyle='rgba(235,245,250,.75)';g.lineWidth=6;g.beginPath();g.moveTo(px+44,py-14);g.bezierCurveTo(px+74,py-10,px+70,py+28,px+42,py+24);g.stroke();
    g.fillStyle='rgba(225,240,248,.55)';g.beginPath();g.moveTo(px-44,py+4);g.quadraticCurveTo(px-66,py-6,px-74,py-30);g.lineTo(px-66,py-32);g.quadraticCurveTo(px-58,py-14,px-42,py-8);g.fill();
    g.save();g.beginPath();g.ellipse(px,py,48,40,0,0,7);g.clip();
    g.fillStyle='rgba(210,232,240,.28)';g.fillRect(px-50,py-42,100,84);
    if(tc){var lvl=py+40-n/M.MAXPOT*66,wv=Math.sin(t*2.4)*2;var lg=g.createLinearGradient(0,lvl,0,py+40);
      lg.addColorStop(0,'rgba('+tc+',.85)');lg.addColorStop(1,'rgba('+tc.map(function(x){return x*.7|0})+',.95)');g.fillStyle=lg;
      g.beginPath();g.moveTo(px-50,py+42);g.lineTo(px-50,lvl+wv);g.quadraticCurveTo(px,lvl-wv*2,px+50,lvl-wv);g.lineTo(px+50,py+42);g.fill();
      S.pot.forEach(function(i,k){var lx=px-30+(k*23)%60,ly=lvl+10+((k*17)%22)+Math.sin(t*1.5+k)*3;g.fillStyle=ING[i].col;g.beginPath();g.ellipse(lx,ly,6,3,k+Math.sin(t+k)*.4,0,7);g.fill()});
      if(n)for(var q=0;q<3;q++){var u=(t*.6+q/3)%1;g.fillStyle='rgba(255,255,255,'+(.35*(1-u))+')';g.beginPath();g.arc(px-20+q*20,lvl+20-u*18,1.6,0,7);g.fill()}}
    g.restore();
    g.strokeStyle='rgba(240,250,255,.85)';g.lineWidth=2.2;g.beginPath();g.ellipse(px,py,48,40,0,0,7);g.stroke();
    g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=4;g.beginPath();g.arc(px,py,38,Math.PI*1.1,Math.PI*1.45);g.stroke();
    g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(px+24,py+14,5,10,-.5,0,7);g.fill();
    g.fillStyle='#c4865a';g.beginPath();g.ellipse(px,py-40,26,7,0,0,7);g.fill();g.fillStyle='#a86a40';g.beginPath();g.arc(px,py-48,6,0,7);g.fill();
    g.fillStyle='rgba(255,230,190,.5)';g.beginPath();g.arc(px-2,py-50,2,0,7);g.fill();
    /* 스쿱 칩 */
    if(!n){g.font=F(11);g.fillStyle='rgba(255,236,210,.6)';g.textAlign='center';g.fillText(L==='ko'?'아래 병을 눌러 넣어요':'Tap jars below to add',px,py+60)}
    S.pot.forEach(function(i,k){var p=chipPos(k,n);g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(p.x+1,p.y+2,11,0,7);g.fill();
      g.fillStyle=ING[i].col;g.beginPath();g.arc(p.x,p.y,11,0,7);g.fill();g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1.5;g.stroke();
      g.fillStyle=lum(ING[i].col)>150?'#4a2a14':'#fff';g.font=F(10);g.textAlign='center';g.fillText(ING[i][L].slice(0,L==='ko'?1:2),p.x,p.y+4)});
    g.fillStyle='rgba(255,236,210,.7)';g.font=F(10);g.textAlign='center';g.fillText(n+'/'+M.MAXPOT,px+62,py+46);
    /* 우림 슬라이더 */
    var sx=SLIDER.x,sy=SLIDER.y,sw=SLIDER.w,anyTea=M.hasTea(c);
    g.font=F(11);g.textAlign='left';g.fillStyle=anyTea?'#ffe6c4':'rgba(255,230,196,.5)';g.fillText(L==='ko'?'우림':'Steep',sx-12,sy-12);
    var lab=L==='ko'?['짧게','보통','진하게']:['Short','Normal','Long'];g.textAlign='right';g.fillText(lab[S.steep]+' [ ]',sx+sw+12,sy-12);
    g.fillStyle='rgba(0,0,0,.35)';rr(g,sx-4,sy-4,sw+8,8,4);g.fill();
    var sg=g.createLinearGradient(sx,0,sx+sw,0);sg.addColorStop(0,'#d8c27a');sg.addColorStop(1,'#6a2a12');g.fillStyle=sg;rr(g,sx-3,sy-3,sw+6,6,3);g.fill();
    for(var k=0;k<3;k++){g.fillStyle='#fff3dc';g.beginPath();g.arc(sx+k*sw/2,sy,2,0,7);g.fill()}
    var kx=sx+S.steep*sw/2;g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(kx+1,sy+2,9,0,7);g.fill();g.fillStyle='#fff3dc';g.beginPath();g.arc(kx,sy,9,0,7);g.fill();
    g.strokeStyle='#8a5a32';g.lineWidth=2;g.stroke();g.strokeStyle='#8a5a32';g.lineWidth=1.5;g.beginPath();g.moveTo(kx-3,sy-4);g.lineTo(kx+3,sy-4);g.lineTo(kx-3,sy+4);g.lineTo(kx+3,sy+4);g.closePath();g.stroke();
    /* 대접 버튼 */
    var sv=SERVE,can=n>0&&(S.phase==='brew'||S.phase==='react'),pulse=can?Math.sin(t*4)*.5+.5:0;
    g.fillStyle='rgba(0,0,0,.3)';rr(g,sv.x+2,sv.y+4,sv.w,sv.h,14);g.fill();
    var bgr=g.createLinearGradient(0,sv.y,0,sv.y+sv.h);bgr.addColorStop(0,can?'#f08a5a':'#9a7a6a');bgr.addColorStop(1,can?'#c8502e':'#7a5a4a');
    g.fillStyle=bgr;rr(g,sv.x,sv.y,sv.w,sv.h,14);g.fill();g.fillStyle='rgba(255,255,255,'+(.18+pulse*.12)+')';rr(g,sv.x+4,sv.y+3,sv.w-8,sv.h*.4,10);g.fill();
    g.fillStyle='#fff';g.font=F(18);g.textAlign='center';g.fillText(L==='ko'?'대접하기':'Serve',sv.x+sv.w/2-6,sv.y+28);g.font=F(10);g.fillStyle='rgba(255,255,255,.7)';g.fillText('S',sv.x+sv.w-14,sv.y+28);
    /* 남은 잔 */
    for(k=0;k<M.CUPS;k++){var cx=sv.x+20+k*31,cy=sv.y+62,full=k<S.cups;g.globalAlpha=full?1:.3;
      g.fillStyle='#fff8ee';g.beginPath();g.moveTo(cx-9,cy-6);g.lineTo(cx+9,cy-6);g.quadraticCurveTo(cx+8,cy+6,cx,cy+6);g.quadraticCurveTo(cx-8,cy+6,cx-9,cy-6);g.fill();
      g.strokeStyle='#fff8ee';g.lineWidth=2;g.beginPath();g.arc(cx+10,cy-1,3,-1.3,1.3);g.stroke();g.fillStyle='#d98a6a';g.fillRect(cx-8,cy-3,16,1.5);g.globalAlpha=1}
    g.font=F(9);g.fillStyle='rgba(255,236,210,.7)';g.textAlign='right';g.fillText(L==='ko'?'남은 잔':'cups',sv.x+sv.w,sv.y+80)}
  function lum(hex){var n=parseInt(hex.slice(1),16);return ((n>>16)*.3+(n>>8&255)*.59+(n&255)*.11)}

  /* ---------- 진열대 ---------- */
  function drawShelf(g,t,L){var sg=g.createLinearGradient(0,432,0,640);sg.addColorStop(0,'#3e2214');sg.addColorStop(1,'#2a160c');g.fillStyle=sg;g.fillRect(0,432,360,208);
    for(var r=0;r<2;r++){var y=440+r*76+70;g.fillStyle='#7a4a2a';g.fillRect(0,y,360,6);g.fillStyle='rgba(255,220,170,.25)';g.fillRect(0,y,360,1.5);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(0,y+6,360,4)}
    var c=counts();for(var i=0;i<N;i++)drawJar(g,i,t,L,c[i])}
  function drawJar(g,i,t,L,cnt){var R=jarRect(i),I=ING[i],av=S.cu.shelf.indexOf(i)>=0,x=R.x+6,y=R.y+12,w=R.w-12,h=R.h-14;
    g.save();if(!av)g.globalAlpha=.28;
    if(av&&S.sel===i&&kbMode()){g.strokeStyle='#ffd27a';g.lineWidth=2.5;rr(g,R.x+1,R.y+1,R.w-2,R.h-2,10);g.stroke()}
    g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x+w/2,y+h+1,w/2,4,0,0,7);g.fill();
    g.fillStyle='rgba(220,236,240,.22)';rr(g,x,y,w,h,9);g.fill();
    var fill=h*.62,fy=y+h-fill;g.save();rr(g,x,y,w,h,9);g.clip();
    var cg=g.createLinearGradient(x,0,x+w,0);cg.addColorStop(0,shade(I.col,-.25));cg.addColorStop(.5,I.col);cg.addColorStop(1,shade(I.col,-.3));
    g.fillStyle=cg;g.fillRect(x,fy,w,fill);
    g.fillStyle=shade(I.col,-.4);for(var k=0;k<7;k++){var tx=x+5+(k*13)%(w-8),ty=fy+6+(k*7)%(fill-8);
      if(I.tea){g.beginPath();g.ellipse(tx,ty,3,1.5,k,0,7);g.fill()}
      else if(I.id==='lemon'||I.id==='ginger'){g.beginPath();g.arc(tx,ty,2.5,0,7);g.fill()}
      else if(I.id==='rose'||I.id==='mint'){g.fillStyle=shade(I.col,.25);g.beginPath();g.ellipse(tx,ty,3,2,k,0,7);g.fill();g.fillStyle=shade(I.col,-.4)}
      else if(I.id==='cinnamon'){g.fillRect(tx-4,ty,8,2)}}
    g.restore();
    g.fillStyle='rgba(255,255,255,.4)';rr(g,x+4,y+5,4,h-12,2);g.fill();g.fillStyle='rgba(255,255,255,.18)';rr(g,x+w-9,y+8,3,h*.4,2);g.fill();
    g.strokeStyle='rgba(240,250,255,.5)';g.lineWidth=1.5;rr(g,x,y,w,h,9);g.stroke();
    var lid=g.createLinearGradient(0,R.y+4,0,R.y+14);lid.addColorStop(0,'#c4865a');lid.addColorStop(1,'#8a5230');g.fillStyle=lid;rr(g,x+3,R.y+4,w-6,10,3);g.fill();
    /* 라벨 */
    var lw=w-6,lx=x+3,ly=y+h*.42;g.fillStyle='#f8eed6';g.save();g.translate(lx+lw/2,ly+8);g.rotate(Math.sin(i*2.1)*.04);
    rr(g,-lw/2,-8,lw,17,3);g.fill();g.strokeStyle='rgba(120,80,40,.4)';g.lineWidth=1;g.stroke();
    g.fillStyle='#4a2a14';g.font=F(L==='ko'?11:9);g.textAlign='center';g.fillText(I[L],0,4.5);g.restore();
    /* 맛 노트 배지 */
    var bx=R.x+R.w-9,by=R.y+12;g.fillStyle=S.journal[i]?'#fff8e8':'#5a3a28';g.beginPath();g.arc(bx,by,10,0,7);g.fill();
    g.strokeStyle=S.journal[i]?'#d99a1a':'#8a6a50';g.lineWidth=1.2;g.stroke();
    if(S.journal[i]){var p=radarPts(I.v,bx,by,9,3.2);g.fillStyle=I.col;poly(g,p);g.fill();g.strokeStyle=shade(I.col,-.4);g.lineWidth=.8;g.stroke()}
    else{g.fillStyle='#e8d0b0';g.font=F(11);g.textAlign='center';g.fillText('?',bx,by+4)}
    if(I.tea){g.fillStyle='#8cc152';g.beginPath();g.ellipse(R.x+9,R.y+12,5,2.6,-.6,0,7);g.fill()}
    /* 넣은 개수 */
    for(k=0;k<cnt;k++){g.fillStyle='#ffd27a';g.beginPath();g.arc(R.x+R.w/2-(cnt-1)*6+k*12,R.y+R.h+1,3.5,0,7);g.fill()}
    g.restore()}
  function kbMode(){return true}

  function drawTimer(g,L){var f=Math.max(0,Math.min(1,S.time/70)),low=S.time<10;
    g.fillStyle='rgba(0,0,0,.35)';rr(g,8,33,306,7,3.5);g.fill();
    g.fillStyle=low?(Math.sin(S.t*12)>0?'#ff6a4a':'#c83a2a'):f>.4?'#9ed36a':'#f0b040';rr(g,8,33,306*f,7,3.5);g.fill();
    g.font=F(11);g.textAlign='right';g.fillStyle=low?'#ffb0a0':'rgba(255,236,210,.85)';g.fillText(Math.ceil(S.time)+(L==='ko'?'초':'s'),352,42);
    if(S.streak>1){g.textAlign='left';g.fillStyle='#ffd27a';g.fillText((L==='ko'?'연속 ':'Streak ')+S.streak,140,56)}}
  function drawHint(g,t,L){var y=598,txt=L==='ko'?'맛 그래프를 맞춰 차를 우려요':'Match the taste chart';
    g.font=F(13);var w=g.measureText(txt).width+22;g.fillStyle='rgba(255,246,226,.95)';rr(g,(306-w)/2+4,y,w,24,12);g.fill();
    g.fillStyle='#7a4a22';g.textAlign='center';g.fillText(txt,(306)/2+4,y+17);
    /* 튜토리얼 손가락 */
    var target=S.pot.length<2?jarRect(0):null,px,py;if(target){px=target.x+target.w/2;py=target.y+target.h/2}else{px=SERVE.x+SERVE.w/2;py=SERVE.y+SERVE.h/2}
    if(S.phase==='brew'||S.phase==='react'){var bob=Math.sin(t*5)*5;g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(px+14,py+14+bob,7,0,7);g.fill();
      g.strokeStyle='rgba(255,210,122,'+(.5+.5*Math.sin(t*5))+')';g.lineWidth=3;g.beginPath();g.arc(px,py,22+bob*.6,0,7);g.stroke()}}

  /* ---------- 맛 노트 ---------- */
  function drawJournal(g,L){g.fillStyle='rgba(30,15,8,.55)';g.fillRect(0,0,360,640);
    var x=14,y=60,w=332,h=420;g.fillStyle='#f6ead0';rr(g,x,y,w,h,14);g.fill();g.strokeStyle='#b8885a';g.lineWidth=3;g.stroke();
    g.fillStyle='#6a3a1a';g.font=F(18);g.textAlign='center';g.fillText(L==='ko'?'맛 노트':'Taste Journal',180,y+28);
    g.font=F(10);g.fillStyle='#8a6a4a';g.fillText(L==='ko'?'한 가지 재료만 우리거나, 모르는 재료가 하나뿐인 잔을 내면 기록돼요':'Logged when a served cup has only one unknown ingredient',180,y+44);
    for(var i=0;i<N;i++){var cx=x+12+(i%2)*162,cy=y+56+Math.floor(i/2)*70,I=ING[i];
      g.fillStyle='rgba(255,255,255,.5)';rr(g,cx,cy,150,62,8);g.fill();
      g.fillStyle=I.col;g.beginPath();g.arc(cx+12,cy+13,6,0,7);g.fill();g.fillStyle='#4a2a14';g.font=F(12);g.textAlign='left';g.fillText(I[L]+(I.tea?(L==='ko'?' (차)':' (tea)'):''),cx+22,cy+17);
      for(var a=0;a<5;a++){var bx=cx+8+a*28,by=cy+56;g.fillStyle=M.AXC[a];g.font=F(9);g.textAlign='center';g.fillText(M.AXK[L][a].slice(0,L==='ko'?2:3),bx+10,by);
        if(S.journal[i]){for(var k=0;k<3;k++){g.fillStyle=k<I.v[a]?M.AXC[a]:'rgba(120,90,60,.15)';g.fillRect(bx+3,by-14-k*9,14,7)}}
        else if(a===2){g.fillStyle='#b89a7a';g.font=F(16);g.fillText('???',cx+75,cy+40)}}}
    g.fillStyle='#8a6a4a';g.font=F(11);g.textAlign='center';g.fillText(L==='ko'?'차는 오래 우릴수록 쌉쌀함이 늘어요 · 눌러서 닫기':'Teas get more bitter the longer they steep · tap to close',180,y+h-10)}

  SG.run({id:'tea-blend',title:{ko:'할머니의 찻잔',en:'Grandma\'s Teacup'},
    how:{ko:'손님이 기억하는 맛 그래프(금색 점선)에 맞게 재료를 넣고 대접하세요. 마신 잔의 그래프로 재료의 맛이 노트에 채워집니다.',
         en:'Blend scoops so the served taste chart matches the gold dashed memory. Each cup you serve reveals how your ingredients taste.'},
    init:init,update:update,draw:draw});
})();
