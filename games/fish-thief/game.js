/* 생선 도둑은 누구냥 — 고양이들의 증언과 "이번 판의 규칙"만으로 생선 도둑을 추리한다.
   모든 사건은 절차 생성되며, 규칙을 만족하는 범인이 정확히 하나일 때만 출제된다. */
(function(){
  'use strict';

  /* ================= 논리 (헤드리스로도 실행 가능) ================= */
  var NAMES=[{ko:'망고',en:'Mango'},{ko:'두부',en:'Tofu'},{ko:'모카',en:'Mocha'},{ko:'후추',en:'Pepper'},
             {ko:'자두',en:'Plum'},{ko:'보리',en:'Bori'},{ko:'나비',en:'Nabi'},{ko:'체다',en:'Cheddar'}];
  var ACCS=['hat','bell','glasses','scarf'];
  var RULES={
    TL:{ko:'범인만 거짓말을 한다',en:'Only the thief lies'},
    T1:{ko:'딱 한 마리만 진실을 말한다',en:'Exactly one cat tells the truth'},
    L1:{ko:'딱 한 마리만 거짓말을 한다',en:'Exactly one cat lies'},
    L2:{ko:'딱 두 마리만 거짓말을 한다',en:'Exactly two cats lie'},
    TT:{ko:'범인만 진실을 말한다',en:'Only the thief tells the truth'}
  };
  var TIERS=[null,
    {n:3,rules:['TL'],w:{SELF:2,ACCUSE:3,CLEAR:3,ATTR:3},meta:0,ll:0},
    {n:4,rules:['TL','T1'],w:{SELF:2,ACCUSE:2,CLEAR:3,ATTR:3,NATTR:2,NEXT:3,END:2},meta:0,ll:0},
    {n:5,rules:['T1','L1','TL'],w:{SELF:2,ACCUSE:2,CLEAR:2,ATTR:3,NATTR:2,NEXT:2,NNEXT:2,END:2,LEFT:3,RIGHT:3},meta:0,ll:0},
    {n:5,rules:['L1','T1','L2','TT'],w:{SELF:2,ACCUSE:2,CLEAR:2,ATTR:3,NATTR:2,NEXT:2,NNEXT:2,END:2,LEFT:3,RIGHT:3},meta:.3,ll:0},
    {n:6,rules:['L1','L2','T1','TT'],w:{SELF:2,ACCUSE:2,CLEAR:2,ATTR:3,NATTR:2,NEXT:2,NNEXT:2,END:2,LEFT:3,RIGHT:3},meta:.3,ll:.3},
    {n:6,rules:['L2','L1','T1','TT'],w:{SELF:1,ACCUSE:1,CLEAR:2,ATTR:3,NATTR:2,NEXT:2,NNEXT:2,END:2,LEFT:3,RIGHT:3},meta:.4,ll:.4}
  ];
  function tierOf(caseNo){return Math.min(6,Math.ceil(caseNo/2))}
  function hasBatchim(w){var c=w.charCodeAt(w.length-1);return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28!==0}
  function josa(w,withB,noB){return w+(hasBatchim(w)?withB:noB)}
  var A_KO={hat:['모자를 썼어','모자를 안 썼어'],bell:['방울을 달았어','방울을 안 달았어'],
            glasses:['안경을 썼어','안경을 안 썼어'],scarf:['목도리를 둘렀어','목도리를 안 둘렀어']};
  var A_EN={hat:['wears a hat','has no hat'],bell:['wears a bell','has no bell'],
            glasses:['wears glasses','has no glasses'],scarf:['wears a scarf','has no scarf']};
  function text(s,cats,lang){
    var n=s.x!=null?cats[s.x].name[lang]:'';
    if(lang==='ko')switch(s.k){
      case 'SELF':return '난 안 훔쳤어.';
      case 'ACCUSE':return josa(n,'이','가')+' 훔쳤어.';
      case 'CLEAR':return josa(n,'은','는')+' 범인이 아니야.';
      case 'ATTR':return '범인은 '+A_KO[s.a][0]+'.';
      case 'NATTR':return '범인은 '+A_KO[s.a][1]+'.';
      case 'NEXT':return '범인은 내 바로 옆자리야.';
      case 'NNEXT':return '범인은 내 바로 옆자리가 아니야.';
      case 'LEFT':return '범인은 내 왼쪽(←)에 있어.';
      case 'RIGHT':return '범인은 내 오른쪽(→)에 있어.';
      case 'END':return '범인은 줄 맨 끝자리에 앉아 있어.';
      case 'LIAR':return josa(n,'은','는')+' 거짓말을 하고 있어.';
      case 'HONEST':return n+' 말은 사실이야.';
      case 'LEFTLIE':return '내 왼쪽(←) 고양이 중 딱 한 마리만 거짓말을 해.';
    }else switch(s.k){
      case 'SELF':return "It wasn't me.";
      case 'ACCUSE':return n+' did it.';
      case 'CLEAR':return n+" didn't do it.";
      case 'ATTR':return 'The thief '+A_EN[s.a][0]+'.';
      case 'NATTR':return 'The thief '+A_EN[s.a][1]+'.';
      case 'NEXT':return 'The thief sits right next to me.';
      case 'NNEXT':return "The thief isn't right next to me.";
      case 'LEFT':return 'The thief is on my left\u00a0(←).';
      case 'RIGHT':return 'The thief is on my right\u00a0(→).';
      case 'END':return 'The thief sits at one end of the row.';
      case 'LIAR':return n+' is lying.';
      case 'HONEST':return n+' is telling the truth.';
      case 'LEFTLIE':return 'Exactly one cat on my left (←) is lying.';
    }
    return '';
  }
  function isBase(k){return k!=='LIAR'&&k!=='HONEST'&&k!=='LEFTLIE'}
  function baseTruth(s,i,t,pz){
    switch(s.k){
      case 'SELF':return t!==i;
      case 'ACCUSE':return t===s.x;
      case 'CLEAR':return t!==s.x;
      case 'ATTR':return !!pz.cats[t].acc[s.a];
      case 'NATTR':return !pz.cats[t].acc[s.a];
      case 'NEXT':return Math.abs(t-i)===1;
      case 'NNEXT':return Math.abs(t-i)!==1;
      case 'LEFT':return t<i;
      case 'RIGHT':return t>i;
      case 'END':return t===0||t===pz.n-1;
    }
    return false;
  }
  /* 범인이 t라고 가정했을 때 각 증언의 참/거짓. 메타 증언은 (1) 일반 증언 (2) 지목형 (3) 왼쪽 세기 순서로 평가해 순환이 없다. */
  function evalAll(pz,t){
    var T=[],i,s,j,c;
    for(i=0;i<pz.n;i++){s=pz.st[i];if(isBase(s.k))T[i]=baseTruth(s,i,t,pz)}
    for(i=0;i<pz.n;i++){s=pz.st[i];if(s.k==='LIAR')T[i]=!T[s.x];else if(s.k==='HONEST')T[i]=T[s.x]}
    for(i=0;i<pz.n;i++){s=pz.st[i];if(s.k==='LEFTLIE'){c=0;for(j=0;j<i;j++)if(!T[j])c++;T[i]=c===1}}
    return T;
  }
  function ruleOk(rule,T,t){
    var lies=0,i;for(i=0;i<T.length;i++)if(!T[i])lies++;
    switch(rule){
      case 'TL':return lies===1&&!T[t];
      case 'T1':return lies===T.length-1;
      case 'L1':return lies===1;
      case 'L2':return lies===2;
      case 'TT':return lies===T.length-1&&T[t];
    }
    return false;
  }
  function solve(pz){var r=[],t;for(t=0;t<pz.n;t++)if(ruleOk(pz.rule,evalAll(pz,t),t))r.push(t);return r}
  function pickW(w,rnd){var k,sum=0;for(k in w)sum+=w[k];var r=rnd()*sum;for(k in w){r-=w[k];if(r<0)return k}return 'SELF'}
  function ri(n,rnd){return Math.floor(rnd()*n)}
  function shuffle(a,rnd){for(var i=a.length-1;i>0;i--){var j=ri(i+1,rnd),t=a[i];a[i]=a[j];a[j]=t}return a}
  function makeCats(n,rnd){
    var nm=shuffle(NAMES.slice(),rnd),lk=shuffle([0,1,2,3,4,5,6],rnd),cats=[],i,k;
    for(i=0;i<n;i++){var acc={},na=0,ord=shuffle(ACCS.slice(),rnd);for(k=0;k<ord.length;k++){acc[ord[k]]=na<2&&rnd()<.36;if(acc[ord[k]])na++}cats.push({name:nm[i],look:lk[i],acc:acc})}
    return cats;
  }
  function tryGen(tier,rnd){
    var C=TIERS[tier],n=C.n,pz={n:n,tier:tier,rule:C.rules[ri(C.rules.length,rnd)],cats:makeCats(n,rnd),st:[]},i,s,seen={},selfN=0,k,key;
    var meta=[],nMeta=0;
    for(i=0;i<n;i++){meta[i]=null;if(C.ll&&i>=2&&rnd()<C.ll&&nMeta<2){meta[i]='LEFTLIE';nMeta++}else if(C.meta&&rnd()<C.meta&&nMeta<2){meta[i]='REF';nMeta++}}
    var baseIdx=[];for(i=0;i<n;i++)if(meta[i]!=='REF'&&meta[i]!=='LEFTLIE')baseIdx.push(i);
    if(baseIdx.length<3)return null;
    for(i=0;i<n;i++){
      if(meta[i]==='LEFTLIE'){pz.st[i]={k:'LEFTLIE'};continue}
      if(meta[i]==='REF'){var bx=baseIdx[ri(baseIdx.length,rnd)];pz.st[i]={k:rnd()<.6?'LIAR':'HONEST',x:bx};key=pz.st[i].k+bx;if(seen['R'+bx])return null;seen['R'+bx]=1;continue}
      k=pickW(C.w,rnd);s={k:k};
      if(k==='ACCUSE'||k==='CLEAR'){s.x=ri(n-1,rnd);if(s.x>=i)s.x++}
      if(k==='ATTR'||k==='NATTR')s.a=ACCS[ri(4,rnd)];
      if(k==='SELF'){if(++selfN>2)return null}
      else if(k==='NEXT'||k==='NNEXT'||k==='LEFT'||k==='RIGHT'){}
      else{key=(k==='NATTR'?'ATTR':k==='CLEAR'?'ACCUSE':k)+(s.x!=null?s.x:'')+(s.a||'');if(seen[key])return null;seen[key]=1}
      /* 누가 범인이든 참/거짓이 같은 증언(예: 맨 왼쪽 고양이의 "내 왼쪽")은 어색하므로 버린다 */
      var tv=0;for(var t=0;t<n;t++)if(baseTruth(s,i,t,pz))tv++;
      if(tv===0||tv===n)return null;
      pz.st[i]=s;
    }
    var sol=solve(pz);if(sol.length!==1)return null;
    pz.thief=sol[0];return pz;
  }
  function fallback(tier,rnd){
    var n=TIERS[tier].n,k=ri(n,rnd),pz={n:n,tier:tier,rule:'TL',cats:makeCats(n,rnd),st:[],thief:k,fb:true};
    for(var i=0;i<n;i++)pz.st[i]=i===k?{k:'SELF'}:{k:'ACCUSE',x:k};
    return pz;
  }
  function gen(tier,rnd){
    rnd=rnd||Math.random;
    for(var i=0;i<4000;i++){var p=tryGen(tier,rnd);if(p)return p}
    return fallback(tier,rnd);
  }
  var LOGIC={gen:gen,solve:solve,evalAll:evalAll,ruleOk:ruleOk,text:text,RULES:RULES,tierOf:tierOf,josa:josa,NAMES:NAMES};
  if(typeof module!=='undefined'&&module.exports){module.exports=LOGIC}
  if(typeof window==='undefined'||!window.SG)return;

  /* ================= 게임 ================= */
  var W=360,H=640,CAP=55,START=50,GAIN=15,MISS=8,HINT=5;
  var ROW0=96,ROWAREA=264,BENCH=510,PLATE={x:180,y:386};
  var LOOKS=[
    {base:'#f2a65a',dark:'#c9772e',pat:'tabby',line:'#5a3516'},
    {base:'#f6f2ea',dark:'#d5cdbf',pat:'solid',line:'#6b6257'},
    {base:'#4b4b58',dark:'#2f2f3a',pat:'tux',line:'#e9e6f2'},
    {base:'#b9b4b0',dark:'#7f7a76',pat:'tabby',line:'#45413e'},
    {base:'#f1e3c8',dark:'#6b4a3a',pat:'siam',line:'#4a3226'},
    {base:'#fbf6ee',dark:'#e08a3c',pat:'calico',line:'#5b4a3c'},
    {base:'#a06c48',dark:'#6e452b',pat:'spots',line:'#3b2415'}
  ];
  var GREY={base:'#aaa6a8',dark:'#8a8688',pat:'solid',line:'#6d696b'};
  var TX={
    ko:{cas:'사건',rule:'규칙',hint:'힌트 -'+HINT+'초',h0:'증언을 읽고 생선 도둑 고양이를 탭하세요',h1:'한 번 더 탭하면 범인으로 지목!',hk:'← → 고르기 · Space 지목 · ↑↓ 메모',
        no:'난 아니다냥!',yes:'켁! 들켰다냥!',quiet:'조용한 수사',first:'단번에!'},
    en:{cas:'CASE',rule:'RULE',hint:'Hint -'+HINT+'s',h0:'Read the statements, then tap the fish thief',h1:'Tap again to accuse this cat!',hk:'← → choose · Space accuse · ↑↓ notes',
        no:'Not me, meow!',yes:'Hack! Busted!',quiet:'Quiet streak',first:'First try!'}
  };
  var S={},L='ko';
  if(!window.__ftK){window.__ftK={space:false,tap:false,hint:false};
    window.addEventListener('keydown',function(e){if(e.repeat)return;var K=window.__ftK;
      if(e.code==='Space'){K.space=true;K.tap=true}
      else if(e.code==='ArrowUp'||e.code==='KeyW')K.tap=true;
      else if(e.code==='KeyH')K.hint=true})}

  function rowH(){return Math.min(60,ROWAREA/S.pz.n)}
  function gap(){return Math.min(104,340/S.pz.n)}
  function catX(i){return W/2+(i-(S.pz.n-1)/2)*gap()}
  function catS(){return Math.min(1.3,gap()/50)}
  function catY(){return BENCH-40*catS()}
  function alive(){var r=[];for(var i=0;i<S.pz.n;i++)if(!S.out[i])r.push(i);return r}
  function catAt(x,y){if(y<398||y>556)return -1;var g=gap();for(var i=0;i<S.pz.n;i++)if(Math.abs(x-catX(i))<=g/2)return i;return -1}
  function rowAt(x,y){var h=rowH(),i=Math.floor((y-ROW0)/h);return(y>=ROW0&&i>=0&&i<S.pz.n&&x>6&&x<354)?i:-1}
  function newCase(){
    S.caseNo++;S.pz=gen(tierOf(S.caseNo));S.out=[];S.stamp=[];S.sel=null;S.lay=null;S.caseT=0;S.wrongs=0;
    S.phase='play';S.pt=0;S.intro=0;S.say=null;S.peek=-1;S.peekT=0;
    S.blink=[];for(var i=0;i<S.pz.n;i++){S.out[i]=false;S.stamp[i]=0;S.blink[i]=1+Math.random()*3}
  }
  function init(a){
    L=a.lang==='ko'?'ko':'en';
    S={caseNo:0,time:START,t:0,streak:0,lx:null,ly:null,motes:[],key:false,solved:0};
    for(var i=0;i<26;i++)S.motes.push({x:Math.random()*W,y:Math.random()*H,r:.6+Math.random()*1.8,v:4+Math.random()*10,p:Math.random()*6});
    window.__ftK.space=window.__ftK.tap=window.__ftK.hint=false;
    newCase();
  }
  function accuse(i,a){
    if(S.out[i]||S.phase!=='play')return;
    var x=catX(i),y=catY()-30;
    if(i===S.pz.thief){
      var first=S.wrongs===0;S.streak=first?S.streak+1:0;S.solved++;
      var pts=10*S.pz.tier+(first?10:0)+Math.max(0,10-Math.floor(S.caseT/3))+(S.streak>=2?5*Math.min(S.streak,5):0);
      a.add(pts);S.time=Math.min(CAP,S.time+GAIN);
      S.phase='caught';S.pt=0;S.sel=i;S.say={i:i,s:TX[L].yes,t:0,ok:true};
      a.sfx('win');a.burst(x,y,'#ffd35a',18);a.burst(x,y,'#7fd6ff',10);a.pop(x,y-46,'+'+pts,'#ffe27a');
      if(S.streak>=2)a.pop(W/2,574,TX[L].quiet+' x'+S.streak,'#9ff0c0');
    }else{
      S.out[i]=true;S.wrongs++;S.streak=0;S.time-=MISS;S.say={i:i,s:TX[L].no,t:0,ok:false};
      a.sfx('hit');a.shake(8);a.burst(x,y,'#ff6b6b',10);a.pop(x,y-46,'-'+MISS+(L==='ko'?'초':'s'),'#ff8a8a');
      if(S.key){var al=alive();S.sel=al.length?al[0]:null;for(var k=0;k<al.length;k++)if(al[k]>i){S.sel=al[k];break}}else S.sel=null;
    }
  }
  function hint(a){
    if(S.phase!=='play')return;
    var c=alive().filter(function(i){return i!==S.pz.thief});
    if(c.length<2||S.time<=HINT+1){a.beep(160,.12,'square');return}
    var i=c[Math.floor(Math.random()*c.length)];S.out[i]=true;S.time-=HINT;if(S.sel===i)S.sel=null;
    a.sfx('tap');a.beep(520,.12,'triangle');a.burst(catX(i),catY()-20,'#cfd3e6',8);a.pop(catX(i),catY()-70,'-'+HINT+(L==='ko'?'초':'s'),'#ffd18a');
  }
  function move(d){
    var al=alive();if(!al.length)return;
    if(S.sel==null){S.sel=d>0?al[0]:al[al.length-1];return}
    var k=al.indexOf(S.sel);if(k<0){S.sel=al[0];return}
    S.sel=al[(k+d+al.length)%al.length];
  }
  function update(dt,inp,a){
    S.t+=dt;S.intro+=dt;
    var K=window.__ftK,space=K.space,keyTap=K.tap,hk=K.hint,i;K.space=K.tap=K.hint=false;
    for(i=0;i<S.pz.n;i++){S.blink[i]-=dt;if(S.blink[i]<-.12)S.blink[i]=1.5+Math.random()*3.5}
    if(S.say){S.say.t+=dt;if(S.say.t>1.3&&S.phase==='play')S.say=null}
    if(S.peekT>0)S.peekT-=dt;
    if(S.phase==='caught'){S.pt+=dt;if(S.pt>1.25)newCase();return}
    S.time-=dt;S.caseT+=dt;
    if(S.time<=0){S.time=0;a.over();return}
    a.tempo(S.time<10?1.45:1);
    if(inp.x==null&&inp.swipe){S.key=true;
      if(inp.swipe==='left'){move(-1);a.beep(440,.04,'triangle')}
      else if(inp.swipe==='right'){move(1);a.beep(440,.04,'triangle')}
      else if(S.sel!=null){S.stamp[S.sel]=(S.stamp[S.sel]+(inp.swipe==='up'?1:2))%3;a.beep(S.stamp[S.sel]===1?700:S.stamp[S.sel]===2?300:500,.05,'square')}
    }
    if(space){S.key=true;if(S.sel==null||S.out[S.sel]){move(1);a.beep(440,.04,'triangle')}else accuse(S.sel,a)}
    else if(hk)hint(a);
    else if(inp.tap&&!keyTap&&inp.x!=null){S.key=false;
      var x=inp.x,y=inp.y,r=rowAt(x,y),c=catAt(x,y);
      if(x>=8&&x<=128&&y>=582&&y<=626)hint(a);
      else if(r>=0){S.stamp[r]=(S.stamp[r]+1)%3;S.peek=r;S.peekT=.9;a.beep(S.stamp[r]===1?700:S.stamp[r]===2?300:500,.05,'square')}
      else if(c>=0&&!S.out[c]){if(S.sel===c)accuse(c,a);else{S.sel=c;a.sfx('tap')}}
    }else if(inp.x!=null&&!inp.down&&(inp.x!==S.lx||inp.y!==S.ly)){
      var hc=catAt(inp.x,inp.y);if(hc>=0&&!S.out[hc]){S.sel=hc;S.key=false}
    }
    S.lx=inp.x;S.ly=inp.y;
  }

  /* ================= 그리기 ================= */
  function F(px,b){return(b?'800 ':'')+px+'px Jua, system-ui, sans-serif'}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function el(g,x,y,rx,ry){g.beginPath();g.ellipse(x,y,rx,ry,0,0,6.2832)}
  function fish(g,x,y,s,rot,outline){
    g.save();g.translate(x,y);g.rotate(rot);g.scale(s,s);
    g.beginPath();g.ellipse(-2,0,13,6.5,0,0,6.2832);g.moveTo(9,0);g.lineTo(19,-7);g.lineTo(16,0);g.lineTo(19,7);g.closePath();
    if(outline){g.setLineDash([3,3]);g.lineWidth=1.6;g.strokeStyle=outline;g.stroke();g.setLineDash([])}
    else{g.fillStyle='#6fc3ea';g.fill();g.fillStyle='#bfe9fb';el(g,-3,2,8,3);g.fill();g.fillStyle='#17324a';el(g,-9,-1.5,1.6,1.6);g.fill();
      g.strokeStyle='#3d8fb8';g.lineWidth=1.2;g.beginPath();g.arc(-5,0,5,-1,1);g.stroke()}
    g.restore();
  }
  function drawCat(g,c,x,y,s,o){
    var K=o.out?GREY:LOOKS[c.look],pat=LOOKS[c.look].pat,t=S.t+c.look*1.7,al=o.out?.75:1;
    g.save();g.translate(x,y);g.scale(s,s);g.globalAlpha=al;
    var hop=o.caught?-Math.abs(Math.sin(o.ct*14))*5*Math.max(0,1-o.ct):0;
    if(!o.head){
      g.fillStyle='rgba(0,0,0,.28)';el(g,0,40,24,5);g.fill();
      g.translate(0,hop);
      var wag=Math.sin(t*2.2)*4;
      g.strokeStyle=pat==='siam'||pat==='tabby'||pat==='spots'?K.dark:K.base;g.lineWidth=6.5;g.lineCap='round';
      g.beginPath();g.moveTo(15,34);g.quadraticCurveTo(34,32,30+wag*.4,12+wag);g.stroke();
      g.fillStyle=K.base;el(g,0,21,19,20);g.fill();
      if(!o.out&&pat==='tabby'){g.strokeStyle=K.dark;g.lineWidth=2.4;for(var b=0;b<3;b++){g.beginPath();g.moveTo(-18+b*1.5,14+b*7);g.lineTo(-10,16+b*7);g.stroke();g.beginPath();g.moveTo(18-b*1.5,14+b*7);g.lineTo(10,16+b*7);g.stroke()}}
      if(!o.out&&pat==='calico'){g.fillStyle=K.dark;el(g,-11,24,7,8);g.fill();g.fillStyle='#4a4038';el(g,12,16,6,6);g.fill()}
      if(!o.out&&pat==='spots'){g.fillStyle=K.dark;el(g,-10,18,3.5,3);g.fill();el(g,9,26,4,3);g.fill();el(g,-4,32,3,2.5);g.fill()}
      g.fillStyle=pat==='tux'&&!o.out?'#f4f1f7':'rgba(255,255,255,.3)';el(g,0,25,9.5,13);g.fill();
      g.fillStyle='rgba(0,0,0,.1)';el(g,0,38,17,4);g.fill();
      g.fillStyle=pat==='tux'&&!o.out?'#f4f1f7':K.base;el(g,-8,39,6.5,4);g.fill();el(g,8,39,6.5,4);g.fill();
      if(pat==='siam'&&!o.out){g.fillStyle=K.dark;el(g,-8,39,6.5,4);g.fill();el(g,8,39,6.5,4);g.fill()}
    }
    var tilt=o.sel&&!o.caught?Math.sin(S.t*3)*.06:0;
    g.translate(0,-10+(o.head?0:Math.sin(t*1.6)*.8));g.rotate(tilt);
    var earC=pat==='siam'&&!o.out?K.dark:K.base;
    for(var e=-1;e<=1;e+=2){
      g.fillStyle=(pat==='calico'&&!o.out)?(e<0?K.dark:'#4a4038'):earC;
      g.beginPath();g.moveTo(e*19,-4);g.lineTo(e*15,-27);g.lineTo(e*3,-14);g.closePath();g.fill();
      g.fillStyle=o.out?'#c9c0c3':'#f7b4b4';g.beginPath();g.moveTo(e*15.5,-9);g.lineTo(e*14,-21);g.lineTo(e*8,-14);g.closePath();g.fill();
    }
    g.fillStyle=K.base;el(g,0,0,20,17);g.fill();
    if(!o.out){
      if(pat==='tabby'){g.strokeStyle=K.dark;g.lineWidth=2.4;g.lineCap='round';for(var q=-1;q<=1;q++){g.beginPath();g.moveTo(q*5,-16);g.lineTo(q*4,-9);g.stroke()}
        g.beginPath();g.moveTo(-19,2);g.lineTo(-13,3);g.stroke();g.beginPath();g.moveTo(19,2);g.lineTo(13,3);g.stroke()}
      if(pat==='siam'){g.fillStyle=K.dark;g.globalAlpha=al*.85;el(g,0,4,11,10);g.fill();g.globalAlpha=al}
      if(pat==='calico'){g.fillStyle=K.dark;g.beginPath();g.ellipse(-10,-8,9,8,0,0,6.2832);g.fill();g.fillStyle='#4a4038';g.beginPath();g.ellipse(12,-10,6,5,0,0,6.2832);g.fill()}
      if(pat==='spots'){g.fillStyle=K.dark;el(g,-12,-9,4,3);g.fill();el(g,11,-11,3.5,3);g.fill();el(g,2,-14,2.5,2);g.fill()}
      if(pat==='tux'){g.fillStyle='#f4f1f7';el(g,0,8,9,7.5);g.fill();g.beginPath();g.moveTo(-3,-2);g.lineTo(0,-15);g.lineTo(3,-2);g.closePath();g.fill()}
    }
    g.fillStyle='rgba(255,255,255,.16)';el(g,-7,-9,8,4);g.fill();
    /* 눈 */
    var blink=o.blink<0&&!o.caught,px=0,py=.6,pr=2.9;
    if(o.caught){pr=1.5;px=Math.sin(S.t*40)*.6;py=0}else if(o.sel){px=Math.sin(S.t*5.5)*2.4;py=.4}else{px=Math.sin(t*.7)*.8}
    for(e=-1;e<=1;e+=2){
      if(blink){g.strokeStyle=K.line;g.lineWidth=1.8;g.lineCap='round';g.beginPath();g.moveTo(e*8-4,0);g.quadraticCurveTo(e*8,2.5,e*8+4,0);g.stroke();continue}
      g.fillStyle='#fffdf6';el(g,e*8,-1,o.caught?6:5.2,o.caught?6.6:5.6);g.fill();
      g.fillStyle=o.out?'#6d696b':'#20242e';el(g,e*8+px,-1+py,pr,pr+.4);g.fill();
      g.fillStyle='#fff';el(g,e*8+px-1,-2+py,.9,.9);g.fill();
      if(o.sel&&!o.caught){g.fillStyle=pat==='siam'&&!o.out?K.dark:K.base;g.beginPath();g.ellipse(e*8,-5.2,6,3.2,e*.25,0,6.2832);g.fill()}
    }
    /* 코와 입 */
    g.fillStyle=o.out?'#b7a3a8':'#f08a96';g.beginPath();g.moveTo(-2.4,5);g.lineTo(2.4,5);g.lineTo(0,7.6);g.closePath();g.fill();
    g.strokeStyle=pat==='siam'&&!o.out?'#f1e3c8':K.line;g.lineWidth=1.3;g.lineCap='round';
    if(o.caught){g.fillStyle='#7a2e3a';el(g,0,11,3.6,3.4);g.fill()}
    else{g.beginPath();g.moveTo(0,7.6);g.quadraticCurveTo(-1,11,-4.5,10);g.moveTo(0,7.6);g.quadraticCurveTo(1,11,4.5,10);g.stroke()}
    g.globalAlpha=al*.7;g.lineWidth=.9;
    for(e=-1;e<=1;e+=2){g.beginPath();g.moveTo(e*12,6);g.lineTo(e*25,4);g.moveTo(e*12,8.5);g.lineTo(e*24,10.5);g.stroke()}
    g.globalAlpha=al;
    /* 소품 */
    if(c.acc.glasses){g.strokeStyle=o.out?'#55525a':'#1f2430';g.lineWidth=1.8;g.fillStyle='rgba(180,225,255,.22)';
      for(e=-1;e<=1;e+=2){el(g,e*8,-1,7.4,7.4);g.fill();g.stroke()}g.beginPath();g.moveTo(-1,-2);g.lineTo(1,-2);g.moveTo(-15.2,-2);g.lineTo(-19.5,-4);g.moveTo(15.2,-2);g.lineTo(19.5,-4);g.stroke()}
    if(c.acc.hat){g.fillStyle=o.out?'#6c6a78':'#34467e';rr(g,-9,-30,18,14,4);g.fill();el(g,0,-16.5,14.5,3.8);g.fill();
      g.fillStyle=o.out?'#9c9aa4':'#f0c14b';g.fillRect(-9,-21.5,18,3.2);g.fillStyle='rgba(255,255,255,.18)';rr(g,-7,-29,5,8,2);g.fill()}
    g.rotate(-tilt);
    if(!o.head){
      if(c.acc.scarf){g.strokeStyle=o.out?'#7c8a8a':'#2fa39a';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(-13,14);g.quadraticCurveTo(0,22,13,14);g.stroke();
        g.fillStyle=o.out?'#7c8a8a':'#2fa39a';rr(g,6,16,8,17,3);g.fill();g.fillStyle=o.out?'#a5b0b0':'#d9f5ef';g.fillRect(6,25,8,2.4);g.fillRect(6,29.5,8,2.4)}
      if(c.acc.bell){if(!c.acc.scarf){g.strokeStyle=o.out?'#8a7a7a':'#d2453d';g.lineWidth=3.2;g.lineCap='round';g.beginPath();g.moveTo(-12,14);g.quadraticCurveTo(0,21,12,14);g.stroke()}
        var bx=c.acc.scarf?-5:0;g.fillStyle=o.out?'#b3ad9a':'#ffd23e';el(g,bx,21.5,5,5);g.fill();g.strokeStyle=o.out?'#7d7868':'#a8791a';g.lineWidth=1.2;g.stroke();
        g.beginPath();g.moveTo(bx-3.4,22);g.lineTo(bx+3.4,22);g.stroke();g.fillStyle=o.out?'#7d7868':'#a8791a';el(g,bx,24.2,1.1,1.1);g.fill();
        g.fillStyle='rgba(255,255,255,.7)';el(g,bx-1.8,19.6,1.2,1);g.fill()}
      if(o.caught){g.fillStyle='#8fd8ff';for(e=-1;e<=1;e+=2){var d=(o.ct*1.6+(e>0?.4:0))%1;g.globalAlpha=1-d;
        g.beginPath();g.moveTo(e*24,-18+d*16);g.quadraticCurveTo(e*24+4,-10+d*16,e*24,-8+d*16);g.quadraticCurveTo(e*24-4,-10+d*16,e*24,-18+d*16);g.fill()}g.globalAlpha=al}
      if(o.out){g.strokeStyle='rgba(214,60,60,.85)';g.lineWidth=3.5;g.lineCap='round';g.beginPath();g.moveTo(-8,16);g.lineTo(8,34);g.moveTo(8,16);g.lineTo(-8,34);g.stroke()}
    }
    g.restore();
  }
  function wrap(g,str,maxW){var w=str.split(' '),lines=[],cur='';for(var i=0;i<w.length;i++){var t=cur?cur+' '+w[i]:w[i];if(!cur||g.measureText(t).width<=maxW)cur=t;else{lines.push(cur);cur=w[i]}}lines.push(cur);return lines}
  function layout(g){
    S.lay=[];var maxL=2,i;
    for(i=0;i<S.pz.n;i++){
      var c=S.pz.cats[i],str=c.name[L]+': '+text(S.pz.st[i],S.pz.cats,L),fs,lines;
      for(fs=rowH()>=52?17:15;fs>=13;fs--){g.font=F(fs);lines=wrap(g,str,254);if(lines.length<=maxL)break}
      S.lay[i]={fs:Math.max(13,fs),lines:lines,nw:0};g.font=F(S.lay[i].fs);S.lay[i].nw=g.measureText(c.name[L]+':').width;
    }
  }
  function drawBg(g){
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#2b3352');gr.addColorStop(.55,'#4a3f63');gr.addColorStop(1,'#33283d');
    g.fillStyle=gr;g.fillRect(0,0,W,H);
    /* 벽지 무늬 */
    g.fillStyle='rgba(255,255,255,.035)';for(var y=100;y<400;y+=34)for(var x=(y/34%2)*22;x<W;x+=44){g.beginPath();g.arc(x+6,y,3,0,7);g.fill()}
    /* 흔들리는 전등 불빛 */
    var sw=Math.sin(S.t*.8)*.09;g.save();g.translate(W/2,352);g.rotate(sw);
    var lg=g.createLinearGradient(0,0,0,230);lg.addColorStop(0,'rgba(255,224,150,.34)');lg.addColorStop(1,'rgba(255,224,150,0)');
    g.fillStyle=lg;g.beginPath();g.moveTo(-14,6);g.lineTo(-170,230);g.lineTo(170,230);g.lineTo(14,6);g.closePath();g.fill();g.restore();
    /* 뒤쪽 조리대 */
    g.fillStyle='#5b4660';g.fillRect(0,398,W,112);
    g.fillStyle='rgba(0,0,0,.14)';for(var k=0;k<6;k++)g.fillRect(k*64+10,412,2,90);
    g.fillStyle='#c79a66';g.fillRect(0,392,W,9);g.fillStyle='#a67a4b';g.fillRect(0,400,W,3);
    /* 찻잔과 김 */
    g.fillStyle='#f3ede2';rr(g,36,378,20,14,4);g.fill();g.strokeStyle='#f3ede2';g.lineWidth=2.5;g.beginPath();g.arc(58,385,4.5,-1.4,1.4);g.stroke();
    g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=2;g.lineCap='round';
    for(k=0;k<2;k++){var ph=(S.t*.5+k*.5)%1;g.globalAlpha=1-ph;g.beginPath();g.moveTo(42+k*8,375-ph*14);g.quadraticCurveTo(46+k*8+Math.sin(S.t*2+k)*3,369-ph*14,42+k*8,363-ph*14);g.stroke()}
    g.globalAlpha=1;
    /* 증거 표지 */
    g.fillStyle='#ffd23e';g.beginPath();g.moveTo(292,392);g.lineTo(300,374);g.lineTo(308,392);g.closePath();g.fill();
    g.fillStyle='#3a2f1c';g.font=F(11,1);g.textAlign='center';g.fillText('1',300,389);
    /* 빈 접시와 분필 윤곽 */
    g.fillStyle='rgba(0,0,0,.25)';el(g,PLATE.x,PLATE.y+8,40,5);g.fill();
    g.fillStyle='#eef1f6';el(g,PLATE.x,PLATE.y+3,40,9);g.fill();g.fillStyle='#d5dbe6';el(g,PLATE.x,PLATE.y+3,29,6);g.fill();
    if(S.phase==='caught'&&S.pt>.75)fish(g,PLATE.x,PLATE.y,1.25,0);
    else fish(g,PLATE.x,PLATE.y,1.25,0,'#6f7d96');
    /* 긴 의자와 바닥 */
    g.fillStyle='#2a2030';g.fillRect(0,BENCH+14,W,H-BENCH-14);
    var fg=g.createLinearGradient(0,BENCH+14,0,H);fg.addColorStop(0,'rgba(255,220,160,.16)');fg.addColorStop(1,'rgba(255,220,160,0)');g.fillStyle=fg;g.fillRect(0,BENCH+14,W,H-BENCH-14);
    g.fillStyle='#b98352';rr(g,4,BENCH-2,W-8,14,5);g.fill();g.fillStyle='#8f6239';g.fillRect(8,BENCH+9,W-16,4);
    g.fillStyle='rgba(255,255,255,.18)';g.fillRect(10,BENCH,W-20,2);
    /* 떠다니는 먼지 */
    for(k=0;k<S.motes.length;k++){var m=S.motes[k],my=((m.y-S.t*m.v)%H+H)%H,mx=m.x+Math.sin(S.t*.6+m.p)*10;
      g.globalAlpha=.18+.14*Math.sin(S.t+m.p);g.fillStyle='#ffe9b8';g.beginPath();g.arc(mx,my,m.r,0,7);g.fill()}
    g.globalAlpha=1;
  }
  function drawTape(g){
    /* 출입 금지 띠: 살짝 흔들린다 */
    var sag=7+Math.sin(S.t*1.3)*2,y0=366;g.save();
    g.beginPath();g.moveTo(-4,y0-4);g.quadraticCurveTo(W/2,y0+sag-4,W+4,y0-4);g.lineTo(W+4,y0+5);g.quadraticCurveTo(W/2,y0+sag+5,-4,y0+5);g.closePath();
    g.fillStyle='#f4c531';g.fill();g.clip();g.fillStyle='#2b2633';
    for(var x=-20;x<W+20;x+=22){g.beginPath();g.moveTo(x,y0-8);g.lineTo(x+9,y0-8);g.lineTo(x-3,y0+18);g.lineTo(x-12,y0+18);g.closePath();g.fill()}
    g.restore();
  }
  function drawRows(g){
    if(!S.lay)layout(g);
    var h=rowH(),n=S.pz.n,T=S.phase==='caught'?evalAll(S.pz,S.pz.thief):null;
    for(var i=0;i<n;i++){
      var c=S.pz.cats[i],y=ROW0+i*h,bh=h-5,mid=y+bh/2,ly=S.lay[i],slide=Math.max(0,1-(S.intro-i*.05)/.22);
      g.save();g.translate(slide*slide*-60,0);g.globalAlpha=1-slide;
      var hot=S.sel===i||(S.peekT>0&&S.peek===i);
      /* 말풍선 */
      g.fillStyle='rgba(0,0,0,.22)';rr(g,50,y+3,302,bh,11);g.fill();
      g.fillStyle=hot?'#fff6d6':'#fbf7ee';rr(g,50,y,302,bh,11);g.fill();
      g.beginPath();g.moveTo(52,mid-6);g.lineTo(42,mid+1);g.lineTo(52,mid+6);g.closePath();g.fill();
      if(hot){g.strokeStyle='#f0a92c';g.lineWidth=2.5;rr(g,50,y,302,bh,11);g.stroke()}
      /* 작은 얼굴 */
      var hs=Math.min(.74,bh/52);
      g.fillStyle=hot?'rgba(255,214,110,.5)':'rgba(255,255,255,.12)';el(g,23,mid,19,Math.min(19,bh/2));g.fill();
      drawCat(g,c,23,mid+13*hs,hs,{head:true,out:S.out[i],sel:S.sel===i,blink:S.blink[i],caught:false});
      /* 글 */
      g.font=F(ly.fs);g.textAlign='left';g.textBaseline='middle';
      var lh=ly.fs+4,ty=mid-(ly.lines.length-1)*lh/2+1;
      for(var k=0;k<ly.lines.length;k++){g.fillStyle='#352c3d';g.fillText(ly.lines[k],62,ty+k*lh);
        if(k===0){g.fillStyle='#b4541f';g.fillText(c.name[L]+':',62,ty)}}
      g.textBaseline='alphabetic';
      /* 메모 도장 */
      var st=T?(T[i]?1:2):S.stamp[i],sx=334,sr=Math.min(13,bh/2-4);
      if(st===0){g.setLineDash([3,3]);g.strokeStyle='rgba(90,70,100,.4)';g.lineWidth=1.5;g.beginPath();g.arc(sx,mid,sr,0,7);g.stroke();g.setLineDash([])}
      else{g.save();g.translate(sx,mid);g.rotate(-.18);var pop=T?Math.min(1,S.pt*6):1;g.scale(.6+.4*pop,.6+.4*pop);
        g.lineCap='round';g.lineWidth=3.6;
        if(st===1){g.strokeStyle='#2fa866';g.beginPath();g.arc(0,0,sr-2,0,7);g.stroke()}
        else{g.strokeStyle='#e0473f';g.beginPath();g.moveTo(-sr+3,-sr+3);g.lineTo(sr-3,sr-3);g.moveTo(sr-3,-sr+3);g.lineTo(-sr+3,sr-3);g.stroke()}
        g.restore()}
      g.restore();
    }
  }
  function drawHeader(g){
    g.fillStyle='rgba(20,18,34,.72)';rr(g,6,32,348,56,12);g.fill();
    g.fillStyle='#ffd35a';rr(g,6,32,5,56,2);g.fill();
    g.textAlign='left';g.font=F(13,1);g.fillStyle='#b9c2e6';
    var stars='';for(var i=0;i<S.pz.tier;i++)stars+='★';
    g.fillText(TX[L].cas+' '+S.caseNo+'  '+stars,18,49);
    g.textAlign='right';g.fillStyle=S.time<10?'#ff8a7a':'#e8ecff';g.font=F(15,1);
    g.fillText(Math.ceil(S.time)+(L==='ko'?'초':'s'),346,50);
    g.textAlign='center';g.font=F(18,1);g.fillStyle='#fff3c9';
    var rt=TX[L].rule+': '+RULES[S.pz.rule][L];if(g.measureText(rt).width>330)g.font=F(16,1);
    g.fillText(rt,W/2,72);
    var p=Math.max(0,S.time/CAP);g.fillStyle='rgba(255,255,255,.14)';rr(g,16,79,328,5,2.5);g.fill();
    g.fillStyle=S.time<10?'#ff6b5e':'#7fe0a6';rr(g,16,79,Math.max(5,328*p),5,2.5);g.fill();
  }
  function drawLineup(g){
    var n=S.pz.n,s=catS(),y=catY(),i,x;
    for(i=0;i<n;i++){
      x=catX(i);var isSel=S.sel===i&&S.phase==='play',caught=S.phase==='caught'&&i===S.pz.thief;
      if(isSel||(S.peekT>0&&S.peek===i)){g.fillStyle=isSel?'rgba(255,214,110,.3)':'rgba(255,255,255,.16)';rr(g,x-gap()/2+3,BENCH-86*s,gap()-6,86*s+2,12);g.fill()}
      drawCat(g,S.pz.cats[i],x,y,s,{out:S.out[i],sel:isSel,blink:S.blink[i],caught:caught,ct:S.pt});
      /* 이름표 */
      var nm=S.pz.cats[i].name[L];g.font=F(n>=6?13:14,1);var nw=Math.max(40,g.measureText(nm).width+12);
      g.fillStyle=isSel?'#ffd35a':S.out[i]?'#77707f':'#f4ecdc';rr(g,x-nw/2,BENCH+18,nw,21,7);g.fill();
      g.fillStyle=S.out[i]?'#3b3542':'#3a2c22';g.textAlign='center';g.fillText(nm,x,BENCH+34);
    }
    /* 돋보기 */
    if(S.sel!=null&&S.phase==='play'&&!S.out[S.sel]){
      x=catX(S.sel)+15*s;var my=y-34*s+Math.sin(S.t*4)*2.5;
      g.save();g.translate(x,my);g.rotate(.5);g.strokeStyle='#5b3b22';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(0,10);g.lineTo(0,24);g.stroke();
      g.fillStyle='rgba(190,235,255,.35)';g.beginPath();g.arc(0,0,10.5,0,7);g.fill();g.strokeStyle='#ffe08a';g.lineWidth=3.2;g.stroke();
      g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1.6;g.beginPath();g.arc(0,0,6.5,3.5,4.6);g.stroke();g.restore();
    }
    /* 잡힌 범인이 뱉는 생선 */
    if(S.phase==='caught'){var u=Math.min(1,S.pt/.75),tx=catX(S.pz.thief),ty=y-2*s;
      if(u<1)fish(g,tx+(PLATE.x-tx)*u,ty+(PLATE.y-ty)*u-Math.sin(u*3.1416)*70,1.25,u*9);}
    /* 한마디 말풍선 */
    if(S.say){var sx=Math.max(64,Math.min(W-64,catX(S.say.i))),sy=y-52*s-14,a2=Math.min(1,S.say.t*8)*(S.phase==='play'?Math.min(1,(1.3-S.say.t)*5):1);
      g.globalAlpha=Math.max(0,a2);g.font=F(14,1);var bw=g.measureText(S.say.s).width+18;
      g.fillStyle=S.say.ok?'#fff1b8':'#ffe1e1';rr(g,sx-bw/2,sy-15,bw,24,9);g.fill();
      g.beginPath();g.moveTo(catX(S.say.i)-5,sy+8);g.lineTo(catX(S.say.i),sy+16);g.lineTo(catX(S.say.i)+5,sy+8);g.closePath();g.fill();
      g.fillStyle='#4a2a2a';g.textAlign='center';g.fillText(S.say.s,sx,sy+2);g.globalAlpha=1}
  }
  function drawFoot(g){
    var can=S.phase==='play'&&alive().length>=3&&S.time>HINT+1;
    g.fillStyle='rgba(0,0,0,.3)';rr(g,8,585,120,41,12);g.fill();
    g.fillStyle=can?'#3f6fb8':'#4c4a58';rr(g,8,582,120,41,12);g.fill();
    g.fillStyle=can?'#ffe27a':'#8e8b99';g.beginPath();g.arc(28,600,7,0,7);g.fill();g.fillRect(25,606,6,5);
    g.fillStyle=can?'#fff':'#a9a6b3';g.font=F(14,1);g.textAlign='left';g.fillText(TX[L].hint,42,608);
    g.textAlign='center';
    if(S.streak>=1){g.font=F(14,1);g.fillStyle='#9ff0c0';g.fillText(TX[L].quiet+' x'+S.streak,220,608)}
    /* 한 줄 안내 */
    var msg=null;
    if(S.caseNo<=2&&S.phase==='play')msg=S.key?TX[L].hk:(S.sel!=null?TX[L].h1:TX[L].h0);
    else if(S.sel!=null&&S.phase==='play'&&!S.key&&S.caseNo<=4)msg=TX[L].h1;
    if(msg){g.font=F(14);var mw=g.measureText(msg).width+20;g.fillStyle='rgba(20,18,34,.7)';rr(g,W/2-mw/2,553,mw,24,10);g.fill();
      g.fillStyle='#ffe9a8';g.fillText(msg,W/2,570)}
  }
  function draw(g,a){
    if(!S.pz)return;
    drawBg(g);drawTape(g);drawLineup(g);drawRows(g);drawHeader(g);drawFoot(g);
    g.textAlign='left';
  }
  SG.run({id:'fish-thief',
    title:{ko:'생선 도둑은 누구냥',en:'Who Stole the Fish?'},
    how:{ko:'맨 위 규칙과 고양이들의 증언으로 범인을 추리하세요. 고양이를 두 번 탭하면 지목! (PC: ← → 고르고 Space)',
         en:'Use the rule on top and the cats\' statements to deduce the thief. Tap a cat twice to accuse. (PC: ← → then Space)'},
    init:init,update:update,draw:draw});
})();
