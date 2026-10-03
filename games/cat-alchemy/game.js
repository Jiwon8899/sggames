/* 냥금술사의 실험실 (Cat Alchemy) — 재료 두 개를 합쳐 새 물건을 발견하는 조합 게임.
   조합표와 탐색 로직은 DOM 없이도 돌도록 분리되어 있다(node 검증용 module.exports). */
(function(){
  'use strict';
  /* ---------- 아이템: id, 한국어, 영어, 태그 ---------- */
  var IT=[
    ['water','물','Water','wet'],['fire','불','Fire','glow hot'],['earth','흙','Earth',''],['air','공기','Air',''],
    ['steam','수증기','Steam','hot wet'],['mud','진흙','Mud','wet'],['lava','용암','Lava','glow hot'],['rain','비','Rain','wet sky'],
    ['dust','먼지','Dust',''],['smoke','연기','Smoke','hot'],['sea','바다','Sea','wet'],['wind','바람','Wind','loud'],
    ['mountain','산','Mountain','hard'],['sun','태양','Sun','glow hot sky'],['cloud','구름','Cloud','soft sky'],
    ['stone','돌','Stone','hard'],['sand','모래','Sand',''],['glass','유리','Glass','hard'],['plant','새싹','Sprout','alive'],
    ['ash','재','Ash',''],['tree','나무','Tree','alive'],['wood','통나무','Log','hard'],['metal','쇠','Metal','hard'],
    ['clay','찰흙','Clay','soft'],['bowl','밥그릇','Food Bowl','hard'],['bottle','유리병','Bottle','hard'],
    ['lightning','번개','Lightning','glow loud hot sky'],['ice','얼음','Ice','cold hard'],['snow','눈','Snow','cold soft'],
    ['snowman','눈사람','Snowman','cold'],['sky','하늘','Sky','sky'],['moon','달','Moon','glow sky'],['star','별','Star','glow sky'],
    ['rainbow','무지개','Rainbow','glow sky'],['life','생명','Life','alive'],['fish','물고기','Fish','alive yummy wet'],
    ['bird','새','Bird','alive sky loud'],['mouse','생쥐','Mouse','alive'],['cat','고양이','Cat','alive cat soft'],
    ['flower','꽃','Flower','alive'],['bee','꿀벌','Bee','alive loud'],['honey','꿀','Honey','yummy'],
    ['catnip','캣닢','Catnip','yummy'],['catfood','고양이 캔','Cat Food','yummy'],['sheep','양','Sheep','alive soft'],
    ['wool','양털','Wool','soft'],['yarn','털실','Yarn','soft'],['scarf','목도리','Scarf','soft'],['bell','방울','Bell','loud hard'],
    ['music','음악','Music','loud'],['electricity','전기','Electricity','glow'],['bulb','전구','Light Bulb','glow'],
    ['robot','로봇','Robot','hard loud'],['robotcat','로봇 고양이','Robot Cat','cat hard glow'],
    ['hourglass','모래시계','Hourglass','hard'],['potion','마법 물약','Potion','wet glow'],['charcoal','숯','Charcoal','hot'],
    ['diamond','다이아몬드','Diamond','glow hard'],['gold','황금','Gold','glow hard'],['crown','왕관','Crown','glow hard'],
    ['catking','고양이 임금님','Cat King','cat alive'],['volcano','화산','Volcano','hot loud'],
    ['honeyice','꿀빙수','Honey Ice','cold yummy'],['boat','돛단배','Sailboat','wet'],
    ['piratecat','해적 고양이','Pirate Cat','cat alive'],['paper','종이','Paper',''],['book','책','Book',''],
    ['wizardcat','마법사 고양이','Wizard Cat','cat alive'],['box','상자','Box',''],['boxcat','상자 속 고양이','Cat in a Box','cat alive soft'],
    ['fireworks','불꽃놀이','Fireworks','glow loud sky'],['rocket','로켓','Rocket','sky loud hot'],
    ['spacecat','우주 고양이','Space Cat','cat alive sky'],['firefly','반딧불이','Firefly','glow alive'],
    ['phoenix','불사조','Phoenix','glow hot alive sky']
  ];
  var BASICS=['water','fire','earth','air'];
  /* ---------- 조합표: a+b=결과 ---------- */
  var RECIPES=('water+fire=steam earth+water=mud fire+earth=lava air+water=rain earth+air=dust fire+air=smoke '+
    'water+water=sea air+air=wind earth+earth=mountain fire+fire=sun '+
    'steam+air=cloud smoke+water=cloud lava+water=stone lava+air=stone stone+air=sand stone+wind=sand sand+fire=glass '+
    'rain+earth=plant mud+sun=plant dust+rain=mud plant+fire=ash plant+plant=tree tree+stone=wood tree+metal=wood '+
    'stone+fire=metal mud+sand=clay clay+fire=bowl glass+air=bottle cloud+cloud=lightning cloud+fire=lightning '+
    'water+wind=ice rain+ice=snow cloud+ice=snow snow+snow=snowman cloud+air=sky sky+stone=moon sky+dust=star '+
    'rain+sun=rainbow glass+sun=rainbow lightning+sea=life lightning+mud=life life+water=fish life+sea=fish '+
    'life+air=bird life+sky=bird life+earth=mouse life+fish=cat mouse+moon=cat plant+sun=flower plant+rainbow=flower '+
    'flower+life=bee bee+flower=honey plant+cat=catnip fish+metal=catfood fish+bowl=catfood life+cloud=sheep '+
    'sheep+metal=wool sheep+wind=wool wool+wood=yarn wool+wool=yarn yarn+snow=scarf yarn+ice=scarf metal+air=bell '+
    'bell+wind=music wood+wind=music bird+bell=music lightning+metal=electricity electricity+glass=bulb '+
    'electricity+bottle=bulb metal+life=robot robot+cat=robotcat cat+electricity=robotcat sand+glass=hourglass '+
    'bottle+flower=potion bottle+plant=potion wood+fire=charcoal tree+fire=charcoal charcoal+mountain=diamond '+
    'metal+sun=gold gold+diamond=crown cat+crown=catking mountain+lava=volcano mountain+fire=volcano '+
    'honey+ice=honeyice honey+snow=honeyice wood+sea=boat boat+cat=piratecat wood+water=paper paper+paper=book '+
    'cat+book=wizardcat cat+potion=wizardcat paper+wood=box cat+box=boxcat charcoal+sky=fireworks '+
    'charcoal+lightning=fireworks fireworks+metal=rocket rocket+cat=spacecat cat+star=spacecat bee+star=firefly '+
    'bee+bulb=firefly bird+fire=phoenix bird+ash=phoenix').split(' ').map(function(s){var m=s.split('='),p=m[0].split('+');return [p[0],p[1],m[1]]});
  var REQ={glow:['반짝반짝 빛나는 거!','Something that glows!'],cold:['차가운 게 좋아!','Something cold!'],
    alive:['살아 움직이는 거!','Something alive!'],yummy:['맛있는 거 줘!','Something yummy!'],soft:['폭신폭신한 거!','Something soft!'],
    sky:['하늘에 있는 거!','Something from the sky!'],cat:['고양이 친구!','A cat friend!'],hard:['단단한 거!','Something hard!'],
    loud:['소리 나는 거!','Something noisy!'],wet:['축축한 거!','Something wet!'],hot:['뜨거운 거!','Something hot!']};

  var ITEM={},ORDER=[];IT.forEach(function(r,i){ITEM[r[0]]={id:r[0],ko:r[1],en:r[2],tags:r[3]?r[3].split(' '):[],n:i};ORDER.push(r[0])});
  function key(a,b){return a<b?a+'+'+b:b+'+'+a}
  var MAP={};RECIPES.forEach(function(r){MAP[key(r[0],r[1])]=r[2]});
  function combine(a,b){return MAP[key(a,b)]||null}
  function depths(){var d={},ch=true;BASICS.forEach(function(b){d[b]=0});
    while(ch){ch=false;RECIPES.forEach(function(r){if(d[r[0]]==null||d[r[1]]==null)return;var v=Math.max(d[r[0]],d[r[1]])+1;
      if(d[r[2]]==null||v<d[r[2]]){d[r[2]]=v;ch=true}})}return d}
  var DEPTH=depths();
  /* 가진 것들로 한 번에 만들 수 있는 새 결과 목록 */
  function reachable(have){var out=[];RECIPES.forEach(function(r){if(have[r[0]]&&have[r[1]]&&!have[r[2]]&&out.indexOf(r[2])<0)out.push(r[2])});return out}
  /* 새 세션 시작 재료: 기본 4개 + 아직 못 찾은 조합에 가까운 발견물 최대 6개 */
  function pickStart(book,rnd){rnd=rnd||Math.random;var have={},cand=[];BASICS.forEach(function(b){have[b]=1});
    ORDER.forEach(function(id){if(book[id]&&!have[id]){var s=0;RECIPES.forEach(function(r){if(book[r[2]])return;
        if(r[0]===id||r[1]===id){var o=r[0]===id?r[1]:r[0];s+=(book[o]||have[o])?3:1}});cand.push({id:id,s:s+rnd()*.5+DEPTH[id]*.05})}});
    cand.sort(function(x,y){return y.s-x.s});return BASICS.concat(cand.slice(0,6).map(function(c){return c.id}))}
  function points(id,combo){return Math.round(DEPTH[id]*10*Math.min(3,1+.2*(combo-1)))}
  function pickReq(have,rnd){rnd=rnd||Math.random;var tags=[];reachable(have).forEach(function(id){ITEM[id].tags.forEach(function(t){tags.push(t)})});
    if(!tags.length)ORDER.forEach(function(id){if(!have[id])ITEM[id].tags.forEach(function(t){tags.push(t)})});
    return tags.length?tags[Math.floor(rnd()*tags.length)]:null}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={IT:IT,ITEM:ITEM,ORDER:ORDER,BASICS:BASICS,RECIPES:RECIPES,REQ:REQ,combine:combine,depths:depths,reachable:reachable,pickStart:pickStart,points:points,pickReq:pickReq};
  if(typeof window==='undefined'||!window.SG)return;

  /* =================== 여기부터 화면 =================== */
  var W=360,H=640,TOTAL=ORDER.length,F='px Jua, system-ui, sans-serif',LI=SG.lang==='ko'?'ko':'en';
  var SKEY='sg-cat-alchemy-book',S=null,spaceQ=false;
  if(!window.__catAlchemyKey){window.__catAlchemyKey=1;
    window.addEventListener('keydown',function(e){if(e.code==='Space'&&!e.repeat)spaceQ=true})}
  function loadBook(){var b={};try{JSON.parse(localStorage.getItem(SKEY)||'[]').forEach(function(id){if(ITEM[id])b[id]=1})}catch(e){}
    BASICS.forEach(function(x){b[x]=1});return b}
  function saveBook(b){try{localStorage.setItem(SKEY,JSON.stringify(ORDER.filter(function(id){return b[id]})))}catch(e){}}
  function count(o){var n=0;for(var k in o)if(o[k])n++;return n}
  function nm(id){return ITEM[id][LI]}

  /* ---------- 아이콘 (단위 좌표 -1..1) ---------- */
  var K=null;
  function C(x,y,r,c){K.fillStyle=c;K.beginPath();K.arc(x,y,r,0,7);K.fill()}
  function E(x,y,rx,ry,c,rot){K.fillStyle=c;K.beginPath();K.ellipse(x,y,rx,ry,rot||0,0,7);K.fill()}
  function P(c,p){K.fillStyle=c;K.beginPath();for(var i=0;i<p.length;i+=2)K.lineTo(p[i],p[i+1]);K.closePath();K.fill()}
  function L(c,w,p){K.strokeStyle=c;K.lineWidth=w;K.lineCap='round';K.lineJoin='round';K.beginPath();for(var i=0;i<p.length;i+=2)K.lineTo(p[i],p[i+1]);K.stroke()}
  function Q(c,w,p){K.strokeStyle=c;K.lineWidth=w;K.lineCap='round';K.beginPath();K.moveTo(p[0],p[1]);for(var i=2;i<p.length;i+=4)K.quadraticCurveTo(p[i],p[i+1],p[i+2],p[i+3]);K.stroke()}
  function R(x,y,w,h,r,c){K.fillStyle=c;K.beginPath();K.moveTo(x+r,y);K.arcTo(x+w,y,x+w,y+h,r);K.arcTo(x+w,y+h,x,y+h,r);K.arcTo(x,y+h,x,y,r);K.arcTo(x,y,x+w,y,r);K.closePath();K.fill()}
  function A(x,y,r,a0,a1,c,w){K.strokeStyle=c;K.lineWidth=w;K.lineCap='round';K.beginPath();K.arc(x,y,r,a0,a1);K.stroke()}
  function D(x,y,rx,ry,c,down){K.fillStyle=c;K.beginPath();K.ellipse(x,y,rx,ry,0,down?0:Math.PI,down?Math.PI:Math.PI*2);K.closePath();K.fill()}
  function drop(x,y,s,c){K.fillStyle=c;K.beginPath();K.moveTo(x,y-s);K.bezierCurveTo(x+s*.95,y-s*.05,x+s*.75,y+s*.85,x,y+s*.85);
    K.bezierCurveTo(x-s*.75,y+s*.85,x-s*.95,y-s*.05,x,y-s);K.fill()}
  function flame(x,y,s){drop(x,y,s,'#ff7a2e');drop(x,y+s*.28,s*.6,'#ffc93c');drop(x,y+s*.48,s*.3,'#fff3b0')}
  function cloud(x,y,s,c){C(x-s*.5,y+s*.12,s*.36,c);C(x+s*.5,y+s*.12,s*.36,c);C(x-s*.05,y-s*.14,s*.48,c);R(x-s*.5,y+s*.1,s,s*.38,s*.1,c)}
  function star(x,y,r,c){var p=[];for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,q=i%2?r*.45:r;p.push(x+Math.cos(a)*q,y+Math.sin(a)*q)}P(c,p)}
  function heart(x,y,s,c){K.fillStyle=c;K.beginPath();K.moveTo(x,y+s*.8);K.bezierCurveTo(x-s*1.3,y-s*.1,x-s*.6,y-s*1,x,y-s*.35);
    K.bezierCurveTo(x+s*.6,y-s*1,x+s*1.3,y-s*.1,x,y+s*.8);K.fill()}
  function tri(x,y,w,h,c){P(c,[x-w,y,x,y-h,x+w,y])}
  function catHead(c,o){o=o||{};var y=o.y||0,s=o.s||1;K.save();K.translate(0,y);K.scale(s,s);
    P(c,[-.78,-.05,-.66,-.86,-.16,-.46]);P(c,[.78,-.05,.66,-.86,.16,-.46]);
    P(o.ear||'#ffb3c1',[-.64,-.3,-.6,-.66,-.36,-.46]);P(o.ear||'#ffb3c1',[.64,-.3,.6,-.66,.36,-.46]);
    E(0,.12,.8,.66,c);
    if(o.stripe){L(o.stripe,.07,[-.14,-.46,-.14,-.3]);L(o.stripe,.07,[0,-.5,0,-.3]);L(o.stripe,.07,[.14,-.46,.14,-.3])}
    var ec=o.eye||'#3a2a33';
    if(!o.noL)E(-.32,.08,.11,.14,ec);if(!o.noR)E(.32,.08,.11,.14,ec);
    if(!o.noL)C(-.29,.03,.04,'#fff');if(!o.noR)C(.35,.03,.04,'#fff');
    P('#ff8fa3',[-.08,.26,.08,.26,0,.35]);Q('#3a2a33',.045,[-.14,.46,-.02,.5,0,.36,.02,.5,.14,.46]);
    L('rgba(60,40,50,.55)',.03,[-.5,.3,-.92,.24]);L('rgba(60,40,50,.55)',.03,[-.5,.4,-.9,.46]);
    L('rgba(60,40,50,.55)',.03,[.5,.3,.92,.24]);L('rgba(60,40,50,.55)',.03,[.5,.4,.9,.46]);K.restore()}
  var CATC='#f7a94b',CATS='#d9822b';
  var ICON={
    water:function(){drop(0,.05,.85,'#3d9bf5');E(-.25,.2,.12,.22,'rgba(255,255,255,.6)',.4)},
    fire:function(){flame(0,.02,.9)},
    earth:function(){D(0,.5,.9,.75,'#8a5a34');D(0,.5,.9,.75,'#8a5a34',1);D(0,-.02,.72,.3,'#6fbf4a');R(-.9,.38,1.8,.2,.1,'#754a29');C(-.3,.25,.09,'#a9774a');C(.25,.12,.07,'#a9774a');C(.45,.3,.05,'#5e3b20')},
    air:function(){Q('#8fd0ee',.14,[-.8,-.4,-.2,-.75,.2,-.4,.6,-.1,.8,-.45]);Q('#b6e3f7',.14,[-.8,.05,-.3,-.3,.1,.05,.5,.35,.8,0]);Q('#8fd0ee',.14,[-.6,.5,-.2,.2,.2,.5,.5,.7,.7,.45])},
    steam:function(){Q('#c9d6df',.16,[-.5,.75,-.8,.3,-.5,0,-.2,-.35,-.5,-.75]);Q('#e3ebf0',.16,[0,.8,-.3,.35,0,.05,.3,-.3,0,-.8]);Q('#c9d6df',.16,[.5,.75,.2,.3,.5,0,.8,-.35,.5,-.75])},
    mud:function(){E(0,.25,.88,.5,'#6b4423');E(-.1,.12,.6,.32,'#84562e');C(-.35,.05,.13,'#9c6b3c');C(.3,.2,.1,'#9c6b3c');C(.05,-.3,.1,'#84562e');C(.42,-.12,.07,'#84562e');E(-.38,0,.05,.03,'rgba(255,255,255,.5)')},
    lava:function(){E(0,.3,.9,.5,'#5a2a22');E(0,.2,.72,.38,'#e8421d');E(-.1,.15,.45,.22,'#ff9a2e');E(-.15,.12,.2,.1,'#ffe066');C(.5,-.25,.12,'#ff9a2e');C(-.45,-.35,.09,'#e8421d');C(.1,-.55,.07,'#ffc93c')},
    rain:function(){cloud(0,-.35,.95,'#9fb4c8');drop(-.45,.5,.2,'#3d9bf5');drop(0,.65,.2,'#3d9bf5');drop(.45,.5,.2,'#3d9bf5')},
    dust:function(){Q('#cbb89a',.1,[-.7,.3,-.2,-.1,.3,.3,.6,.5,.75,.1]);[[-.5,-.4,.12],[.1,-.5,.09],[.5,-.3,.13],[-.2,-.15,.07],[.3,0,.06],[-.6,.6,.08],[.1,.65,.1],[-.75,0,.06]].forEach(function(d){C(d[0],d[1],d[2],'#b8a280')})},
    smoke:function(){C(-.2,.55,.3,'#8b8f98');C(.2,.25,.36,'#a2a7b0');C(-.15,-.15,.33,'#b9bec6');C(.2,-.55,.26,'#d0d4da')},
    sea:function(){R(-.9,-.1,1.8,.95,.3,'#2f7fd6');Q('#7cc4ff',.15,[-.85,-.15,-.55,-.5,-.3,-.15,-.05,.15,.25,-.15,.55,-.5,.85,-.15]);Q('#bfe4ff',.09,[-.6,.3,-.35,.1,-.1,.3,.15,.5,.4,.3]);P('#ffd166',[.2,-.75,.2,-.3,.6,-.38])},
    wind:function(){Q('#8fd0ee',.13,[-.85,-.3,0,-.3,.35,-.3,.8,-.3,.6,-.7,.35,-.85,.25,-.55]);Q('#b6e3f7',.13,[-.85,.1,.2,.1,.5,.1,.95,.15,.7,.55,.5,.7,.4,.45]);L('#8fd0ee',.13,[-.6,.5,.05,.5])},
    mountain:function(){P('#7d8a99',[-.95,.7,-.3,-.45,.25,.7]);P('#96a3b1',[-.25,.7,.38,-.8,.95,.7]);P('#fff',[.38,-.8,.16,-.3,.3,-.42,.42,-.28,.56,-.4]);P('#fff',[-.3,-.45,-.47,-.13,-.3,-.22,-.18,-.14])},
    sun:function(){for(var i=0;i<8;i++){var a=i*Math.PI/4;L('#ffb72b',.14,[Math.cos(a)*.62,Math.sin(a)*.62,Math.cos(a)*.9,Math.sin(a)*.9])}C(0,0,.5,'#ffd23f');C(-.15,-.15,.15,'#fff0a6')},
    cloud:function(){cloud(0,.05,1.25,'#eef4fa');E(-.15,-.25,.25,.12,'#fff')},
    stone:function(){P('#8d949c',[-.8,.5,-.7,-.2,-.2,-.6,.5,-.5,.85,.1,.6,.6]);P('#a9b0b8',[-.6,-.1,-.2,-.5,.4,-.4,.1,-.1]);L('#6f757c',.05,[.2,.2,.45,.35])},
    sand:function(){D(0,.6,.9,.9,'#e8c98a');D(0,.6,.9,.2,'#d8b572',1);[[-.3,.2],[.2,0],[.4,.4],[-.5,.45],[0,.35],[.05,-.12]].forEach(function(d){C(d[0],d[1],.05,'#c59f58')})},
    glass:function(){R(-.7,-.7,1.4,1.4,.12,'#7fb8d8');R(-.6,-.6,1.2,1.2,.08,'#cdeeff');L('#fff',.1,[-.4,.1,.1,-.4]);L('#fff',.07,[-.1,.3,.3,-.1])},
    plant:function(){Q('#4c9c3a',.12,[0,.8,-.05,.3,0,-.1]);E(-.38,-.2,.42,.22,'#6fcf4f',.5);E(.38,-.4,.42,.22,'#8fe06a',-.5);D(0,.85,.6,.25,'#8a5a34')},
    ash:function(){D(0,.6,.85,.7,'#8c8c90');D(0,.6,.85,.18,'#77777b',1);C(-.2,.2,.07,'#b5b5b9');C(.3,.35,.06,'#b5b5b9');C(.05,-.3,.05,'#ff9a2e');C(-.35,-.5,.04,'#ffc93c');C(.4,-.55,.04,'#b5b5b9')},
    tree:function(){R(-.14,.1,.28,.75,.06,'#8a5a34');C(0,-.25,.55,'#4caf50');C(-.38,.05,.32,'#43a047');C(.38,.05,.32,'#57bb5b');C(-.15,-.4,.14,'#7fd483')},
    wood:function(){R(-.85,-.32,1.5,.64,.3,'#9a6537');L('#7a4c26',.05,[-.5,-.1,.2,-.1]);L('#7a4c26',.05,[-.3,.12,.35,.12]);E(.62,0,.24,.32,'#e2b47c');A(.62,0,.12,0,7,'#b98450',.05)},
    metal:function(){P('#8e9aa6',[-.85,.45,-.6,-.2,.6,-.2,.85,.45]);P('#c4ced8',[-.6,-.2,-.42,-.5,.42,-.5,.6,-.2]);L('#fff',.07,[-.3,-.36,.1,-.36])},
    clay:function(){E(0,.2,.8,.52,'#c46a43');E(-.1,.05,.55,.32,'#d98860');E(-.25,-.03,.14,.07,'#eeb090')},
    bowl:function(){D(0,-.1,.85,.8,'#e06c75',1);R(-.9,-.22,1.8,.2,.1,'#f08a92');C(0,.25,.12,'#fff');C(-.17,.08,.06,'#fff');C(0,.02,.06,'#fff');C(.17,.08,.06,'#fff');E(0,-.3,.6,.14,'#a9774a')},
    bottle:function(){R(-.16,-.85,.32,.4,.05,'#9fd4ea');C(0,.25,.6,'#bfe6f5');C(0,.25,.48,'#e3f6fd');R(-.22,-.92,.44,.14,.05,'#b98450');A(0,.25,.36,2.6,3.9,'#fff',.08)},
    lightning:function(){P('#ffd23f',[.15,-.9,-.5,.1,-.05,.1,-.25,.9,.5,-.15,.05,-.15,.4,-.9]);P('#fff3b0',[.1,-.7,-.25,-.05,.02,-.05])},
    ice:function(){P('#9ad7f5',[-.7,-.3,0,-.7,.7,-.3,.7,.45,0,.85,-.7,.45]);P('#c9ecfb',[-.7,-.3,0,-.7,.7,-.3,0,.1]);L('#fff',.06,[0,.1,0,.85]);L('#fff',.08,[-.4,-.3,-.05,-.5])},
    snow:function(){for(var i=0;i<3;i++){var a=i*Math.PI/3,c=Math.cos(a),s=Math.sin(a);L('#7cc4f0',.11,[-c*.85,-s*.85,c*.85,s*.85]);
      [1,-1].forEach(function(d){var x=c*.55*d,y=s*.55*d;L('#7cc4f0',.08,[x,y,x+Math.cos(a+.8*d)*.25*d,y+Math.sin(a+.8*d)*.25*d]);L('#7cc4f0',.08,[x,y,x+Math.cos(a-.8*d)*.25*d,y+Math.sin(a-.8*d)*.25*d])})}C(0,0,.13,'#fff')},
    snowman:function(){C(0,.4,.5,'#f4f9fd');C(0,-.3,.36,'#fff');R(-.3,-.78,.6,.14,.03,'#3a3a4a');R(-.2,-1,.4,.26,.04,'#3a3a4a');C(-.13,-.35,.05,'#333');C(.13,-.35,.05,'#333');P('#ff8a3d',[0,-.27,0,-.17,.3,-.2]);C(0,.25,.05,'#333');C(0,.45,.05,'#333');R(-.33,-.03,.66,.12,.05,'#e5484d')},
    sky:function(){R(-.8,-.8,1.6,1.6,.3,'#6ab7f5');R(-.8,0,1.6,.8,.3,'#9fd3fa');cloud(-.15,.2,.75,'#fff');cloud(.4,-.4,.4,'#eaf5ff')},
    moon:function(){C(0,0,.78,'#f5e7a3');C(-.25,-.25,.17,'#dccb83');C(.3,.1,.22,'#dccb83');C(-.15,.4,.11,'#dccb83');C(.25,-.45,.08,'#dccb83')},
    star:function(){star(0,.04,.9,'#ffc93c');star(0,.04,.5,'#ffe58a')},
    rainbow:function(){['#ef5350','#ffb74d','#fff176','#66bb6a','#42a5f5','#ab7df6'].forEach(function(c,i){A(0,.45,.85-i*.11,Math.PI,Math.PI*2,c,.12)});cloud(-.72,.5,.38,'#fff');cloud(.72,.5,.38,'#fff')},
    life:function(){heart(0,0,.8,'#ff6b8b');E(-.3,-.25,.15,.1,'#ffc2cf',-.5);star(.62,-.6,.22,'#ffd23f');star(-.7,.5,.14,'#ffd23f')},
    fish:function(){P('#3d8fe0',[.35,0,.9,-.45,.9,.45]);E(-.1,0,.65,.42,'#5aa9f2');P('#3d8fe0',[-.2,-.38,.1,-.7,.25,-.3]);E(-.15,.1,.4,.2,'#a9d6ff');C(-.42,-.08,.1,'#fff');C(-.44,-.08,.05,'#223')},
    bird:function(){E(.05,.15,.6,.5,'#58b6f0');C(-.3,-.3,.36,'#58b6f0');E(.2,.2,.38,.24,'#2f8fd0',-.3);P('#ffb72b',[-.62,-.34,-.95,-.22,-.62,-.14]);C(-.36,-.36,.08,'#fff');C(-.38,-.36,.045,'#223');P('#2f8fd0',[.55,.1,.95,-.1,.9,.35]);L('#ffb72b',.06,[-.05,.63,-.05,.85]);L('#ffb72b',.06,[.2,.63,.2,.85])},
    mouse:function(){Q('#e8a0b0',.07,[.5,.3,.9,.4,.8,0,.75,-.2,.95,-.3]);E(0,.2,.65,.45,'#a8adb5');C(-.5,-.2,.24,'#a8adb5');C(-.5,-.2,.14,'#f3b8c4');C(-.1,-.3,.24,'#a8adb5');C(-.1,-.3,.14,'#f3b8c4');C(-.38,.12,.07,'#223');C(-.66,.25,.07,'#ff8fa3')},
    cat:function(){catHead(CATC,{stripe:CATS})},
    flower:function(){Q('#4c9c3a',.1,[0,.9,.05,.5,0,.1]);E(.25,.6,.24,.11,'#6fcf4f',-.5);for(var i=0;i<5;i++){var a=i*Math.PI*2/5-Math.PI/2;C(Math.cos(a)*.36,-.2+Math.sin(a)*.36,.27,'#ff8fb1')}C(0,-.2,.22,'#ffd23f')},
    bee:function(){E(-.2,-.45,.34,.22,'rgba(200,235,255,.9)',-.5);E(.25,-.45,.34,.22,'rgba(220,245,255,.9)',.5);E(0,.1,.7,.46,'#ffd23f');K.save();K.beginPath();K.ellipse(0,.1,.7,.46,0,0,7);K.clip();R(-.2,-.5,.18,1.2,0,'#3a2a22');R(.18,-.5,.18,1.2,0,'#3a2a22');K.restore();C(-.45,0,.07,'#223');P('#3a2a22',[.68,.02,.95,.1,.68,.2])},
    honey:function(){R(-.55,-.4,1.1,1.2,.25,'#f5a623');R(-.45,-.05,.9,.5,.08,'#fff3d6');R(-.62,-.72,1.24,.34,.1,'#c9772b');P('#f5a623',[-.2,.05,.2,.05,.25,.3,0,.42,-.25,.3]);E(-.35,-.2,.06,.14,'#ffd98a')},
    catnip:function(){Q('#3f8f3a',.09,[0,.9,0,.4,0,-.1]);[[-.4,.25,.6],[.4,.25,-.6],[-.36,-.2,.5],[.36,-.2,-.5]].forEach(function(l){E(l[0],l[1],.36,.2,'#59b860',l[2])});E(0,-.5,.22,.34,'#7ad182');C(0,-.82,.1,'#c79bf2');C(-.13,-.68,.08,'#b07fe6');C(.13,-.68,.08,'#b07fe6')},
    catfood:function(){R(-.7,-.45,1.4,1,.12,'#aeb7c2');E(0,-.45,.7,.2,'#d4dbe3');E(0,-.45,.5,.12,'#b9c2cc');R(-.7,-.12,1.4,.5,0,'#ff8a65');E(-.05,.13,.3,.16,'#fff');P('#fff',[.2,.13,.42,-.02,.42,.28]);C(-.18,.1,.04,'#333')},
    sheep:function(){R(-.35,.4,.14,.42,.05,'#4a4048');R(.2,.4,.14,.42,.05,'#4a4048');cloud(.08,.08,1.15,'#f6f3ee');C(.1,-.3,.3,'#fff');E(-.58,-.05,.26,.3,'#4a4048');C(-.64,-.1,.05,'#fff');E(-.42,-.3,.14,.08,'#4a4048',-.5)},
    wool:function(){C(-.3,.15,.42,'#f3efe8');C(.3,.15,.42,'#f3efe8');C(0,-.25,.45,'#fbf8f3');C(0,.3,.4,'#fbf8f3');A(-.25,.1,.16,0,4.5,'#d5cdc0',.05);A(.28,.15,.16,1,5.5,'#d5cdc0',.05);A(0,-.28,.17,2,6.5,'#d5cdc0',.05)},
    yarn:function(){C(-.08,-.05,.68,'#ef6f9a');K.save();K.beginPath();K.arc(-.08,-.05,.68,0,7);K.clip();Q('#ffa9c4',.08,[-.8,-.3,-.1,-.75,.6,-.3]);Q('#ffa9c4',.08,[-.8,0,-.1,-.45,.6,0]);Q('#ffa9c4',.08,[-.8,.3,-.1,-.15,.6,.3]);Q('#d14f7e',.07,[-.5,-.7,.1,0,-.3,.7]);Q('#d14f7e',.07,[-.1,-.8,.5,0,.1,.7]);K.restore();Q('#ef6f9a',.08,[.3,.5,.6,.9,.9,.6,.95,.45,.8,.4])},
    scarf:function(){Q('#e5484d',.34,[-.65,-.35,0,-.05,.65,-.35]);K.strokeStyle='#e5484d';K.lineCap='butt';K.lineWidth=.34;K.beginPath();K.moveTo(.3,-.2);K.lineTo(.42,.6);K.stroke();
      L('#fff',.07,[-.4,-.42,-.3,-.1]);L('#fff',.07,[-.05,-.35,-.05,-.03]);L('#fff',.07,[.26,.2,.56,.16]);L('#fff',.07,[.3,.42,.58,.38]);[.28,.4,.52].forEach(function(x){L('#b8323a',.05,[x,.62,x,.82])})},
    bell:function(){A(0,-.62,.14,0,7,'#c98a1b',.08);K.fillStyle='#ffc93c';K.beginPath();K.moveTo(-.7,.4);K.quadraticCurveTo(-.5,.2,-.48,-.1);K.quadraticCurveTo(-.45,-.6,0,-.6);K.quadraticCurveTo(.45,-.6,.48,-.1);K.quadraticCurveTo(.5,.2,.7,.4);K.closePath();K.fill();
      R(-.75,.36,1.5,.14,.07,'#e0a422');C(0,.64,.14,'#c98a1b');E(-.22,-.2,.08,.2,'#ffe58a',.2)},
    music:function(){L('#7a4fd0',.11,[-.3,.5,-.3,-.55,.55,-.75,.55,.3]);L('#7a4fd0',.2,[-.3,-.5,.55,-.7]);E(-.48,.52,.26,.19,'#7a4fd0',-.4);E(.37,.32,.26,.19,'#7a4fd0',-.4)},
    electricity:function(){R(-.55,-.6,1.1,1.35,.15,'#3fbf7f');R(-.2,-.82,.4,.24,.06,'#8a949e');R(-.55,-.6,1.1,.3,.15,'#2f9f66');P('#fff59d',[.1,-.25,-.3,.2,-.02,.2,-.14,.62,.3,.08,.02,.08])},
    bulb:function(){C(0,-.2,.58,'#ffe066');C(-.18,-.38,.16,'#fff8c9');P('#ffe066',[-.34,.25,.34,.25,.26,.5,-.26,.5]);R(-.28,.46,.56,.34,.06,'#8a949e');L('#6d757e',.05,[-.28,.6,.28,.6]);L('#e0a422',.05,[-.15,.2,-.1,-.15,.1,-.15,.15,.2])},
    robot:function(){L('#8a949e',.07,[0,-.6,0,-.85]);C(0,-.88,.1,'#ff5252');R(-.7,-.6,1.4,1.2,.2,'#aeb7c2');R(-.55,-.42,1.1,.55,.1,'#2c3e50');C(-.26,-.15,.14,'#4dd0e1');C(.26,-.15,.14,'#4dd0e1');R(-.35,.28,.7,.16,.03,'#5d6873');R(-.9,-.15,.2,.4,.06,'#8a949e');R(.7,-.15,.2,.4,.06,'#8a949e')},
    robotcat:function(){L('#8a949e',.06,[0,-.5,0,-.85]);C(0,-.88,.09,'#ff5252');catHead('#b3bdc8',{ear:'#4dd0e1',eye:'#00bcd4'});C(-.62,.42,.06,'#7b8590');C(.62,.42,.06,'#7b8590')},
    hourglass:function(){R(-.55,-.85,1.1,.16,.05,'#9a6537');R(-.55,.69,1.1,.16,.05,'#9a6537');P('#cdeeff',[-.42,-.69,.42,-.69,.06,0,.42,.69,-.42,.69,-.06,0]);P('#e8c98a',[-.25,-.35,.25,-.35,0,0]);P('#e8c98a',[-.38,.69,.38,.69,0,.3]);L('#e8c98a',.05,[0,0,0,.4])},
    potion:function(){R(-.15,-.85,.3,.5,.04,'#cdeeff');C(0,.25,.62,'#cdeeff');K.save();K.beginPath();K.arc(0,.25,.52,0,7);K.clip();R(-.7,.1,1.4,.8,0,'#a45de8');E(0,.1,.55,.1,'#c58ff5');K.restore();R(-.22,-.95,.44,.16,.05,'#b98450');C(-.15,.4,.07,'#e3c7ff');C(.18,.3,.05,'#e3c7ff');star(.1,-.2,.14,'#ffd23f')},
    charcoal:function(){P('#2e2a2c',[-.8,.5,-.6,-.1,-.1,-.3,.2,.5]);P('#3d383b',[-.1,.6,.1,-.45,.6,-.5,.85,.4,.5,.65]);L('#55504f',.05,[.25,-.25,.5,-.3]);C(.3,.2,.09,'#ff7a2e');C(-.4,.2,.06,'#ff9a2e');C(.55,.4,.05,'#ffc93c')},
    diamond:function(){P('#6fd6f5',[-.8,-.25,-.45,-.65,.45,-.65,.8,-.25,0,.8]);P('#b5ecfb',[-.8,-.25,-.45,-.65,.45,-.65,.8,-.25]);P('#fff',[-.25,-.25,0,-.65,.25,-.25]);P('#49bfe3',[-.25,-.25,.25,-.25,0,.8]);star(.7,-.72,.16,'#fff')},
    gold:function(){P('#e0a422',[-.85,.5,-.6,-.15,.6,-.15,.85,.5]);P('#ffd23f',[-.6,-.15,-.42,-.45,.42,-.45,.6,-.15]);L('#fff3b0',.07,[-.3,-.31,.1,-.31]);star(.62,-.62,.2,'#fff3b0')},
    crown:function(){P('#ffc93c',[-.8,.5,-.85,-.4,-.4,.05,0,-.65,.4,.05,.85,-.4,.8,.5]);R(-.8,.36,1.6,.26,.06,'#e0a422');C(0,.48,.1,'#ef5350');C(-.48,.48,.08,'#42a5f5');C(.48,.48,.08,'#66bb6a');C(-.85,-.42,.1,'#ffe58a');C(0,-.68,.1,'#ffe58a');C(.85,-.42,.1,'#ffe58a')},
    catking:function(){catHead(CATC,{y:.25,s:.82,stripe:CATS});K.save();K.translate(0,-.62);K.scale(.55,.5);ICON.crown();K.restore()},
    volcano:function(){C(-.2,-.75,.18,'#b9bec6');C(.15,-.9,.14,'#d0d4da');P('#6b5148',[-.95,.75,-.3,-.35,.3,-.35,.95,.75]);P('#ff7a2e',[-.3,-.35,.3,-.35,.18,-.05,.05,-.2,-.08,.15,-.2,-.15]);E(0,-.35,.3,.09,'#ffc93c');L('#ff7a2e',.08,[.25,0,.35,.3])},
    honeyice:function(){D(0,.15,.75,.6,'#8ecbf0',1);R(-.82,.08,1.64,.16,.08,'#b5e0f8');C(-.3,-.1,.3,'#fff');C(.3,-.1,.3,'#fff');C(0,-.35,.36,'#fff');K.save();K.beginPath();K.arc(0,-.35,.36,0,7);K.clip();E(0,-.62,.36,.2,'#f5a623');K.restore();L('#f5a623',.09,[-.2,-.48,-.2,-.25]);L('#f5a623',.09,[.18,-.5,.18,-.15]);C(.05,-.75,.1,'#e5484d')},
    boat:function(){L('#7a4c26',.07,[0,.3,0,-.85]);P('#fff',[.07,-.8,.07,.15,.7,.15]);P('#ffb3c1',[-.07,-.6,-.07,.15,-.5,.15]);P('#9a6537',[-.85,.3,.85,.3,.55,.72,-.55,.72]);Q('#5aa9f2',.1,[-.9,.8,-.45,.6,0,.8,.45,1,.9,.8])},
    piratecat:function(){catHead(CATC,{noR:1,y:.12,s:.92});K.save();K.translate(0,.12);K.scale(.92,.92);L('#2b2233',.06,[-.7,-.3,.75,.2]);E(.32,.08,.2,.18,'#2b2233');D(0,-.25,.78,.5,'#e5484d');C(-.3,-.5,.05,'#fff');C(.1,-.6,.05,'#fff');C(.4,-.42,.05,'#fff');P('#e5484d',[.7,-.3,1,-.5,.95,-.1]);K.restore()},
    paper:function(){P('#fbfaf5',[-.6,-.8,.3,-.8,.6,-.5,.6,.8,-.6,.8]);P('#d9d5c5',[.3,-.8,.3,-.5,.6,-.5]);[-.3,-.05,.2,.45].forEach(function(y){L('#b9c4d0',.06,[-.38,y,.38,y])})},
    book:function(){R(-.7,-.75,1.4,1.5,.12,'#6a4fc4');R(-.7,-.75,.28,1.5,.1,'#4f38a0');R(-.34,.52,1,.14,.04,'#f4efe0');star(.15,-.12,.34,'#ffd23f')},
    wizardcat:function(){catHead('#f3ede4',{y:.3,s:.78});P('#6a4fc4',[-.6,-.22,.1,-1,.6,-.22]);E(0,-.22,.75,.14,'#4f38a0');star(.05,-.5,.13,'#ffd23f');C(.1,-.98,.08,'#ffd23f')},
    box:function(){P('#c08a52',[-.7,-.2,.7,-.2,.7,.75,-.7,.75]);P('#d9a66c',[-.7,-.2,-.95,-.55,-.3,-.55,0,-.2]);P('#d9a66c',[.7,-.2,.95,-.55,.3,-.55,0,-.2]);R(-.14,-.2,.28,.4,0,'#e8c99a');L('#a37040',.05,[-.4,.5,-.15,.5])},
    boxcat:function(){catHead(CATC,{y:-.28,s:.7,stripe:CATS});P('#c08a52',[-.75,.05,.75,.05,.75,.85,-.75,.85]);P('#d9a66c',[-.75,.05,-1,.3,-.5,.3]);P('#d9a66c',[.75,.05,1,.3,.5,.3]);E(-.4,.07,.14,.09,CATC);E(.4,.07,.14,.09,CATC);R(-.12,.05,.24,.3,0,'#e8c99a')},
    fireworks:function(){[[0,-.2,.6,'#ff5d8f'],[-.5,.4,.32,'#ffd23f'],[.55,.35,.3,'#4dd0e1']].forEach(function(f){for(var i=0;i<10;i++){var a=i*Math.PI/5;L(f[3],.07,[f[0]+Math.cos(a)*f[2]*.35,f[1]+Math.sin(a)*f[2]*.35,f[0]+Math.cos(a)*f[2],f[1]+Math.sin(a)*f[2]])}C(f[0],f[1],f[2]*.16,'#fff')})},
    rocket:function(){K.save();K.rotate(.6);flame(0,.72,.34);P('#e5484d',[-.3,.3,-.62,.62,-.3,.55]);P('#e5484d',[.3,.3,.62,.62,.3,.55]);K.fillStyle='#eef2f6';K.beginPath();K.moveTo(0,-.95);K.quadraticCurveTo(.42,-.5,.32,.55);K.lineTo(-.32,.55);K.quadraticCurveTo(-.42,-.5,0,-.95);K.fill();P('#e5484d',[0,-.95,.2,-.62,-.2,-.62]);C(0,-.2,.17,'#5aa9f2');A(0,-.2,.17,0,7,'#8a949e',.05);K.restore()},
    spacecat:function(){C(0,0,.9,'#1f2a55');star(-.72,-.5,.1,'#fff');star(.7,.55,.08,'#fff');catHead(CATC,{s:.72,y:.04,stripe:CATS});C(0,0,.78,'rgba(170,220,255,.28)');A(0,0,.78,0,7,'#dfe8f2',.08);A(0,0,.6,3.6,4.6,'rgba(255,255,255,.8)',.07)},
    firefly:function(){C(.25,.3,.6,'rgba(255,240,120,.35)');C(.25,.3,.36,'#fff176');E(-.15,-.4,.34,.18,'rgba(210,240,255,.9)',-.7);E(.3,-.35,.34,.18,'rgba(210,240,255,.9)',.3);E(-.15,-.05,.4,.3,'#4a3b36',.6);C(-.42,-.3,.2,'#3a2a22');C(-.5,-.34,.05,'#fff');L('#3a2a22',.04,[-.5,-.45,-.7,-.7])},
    phoenix:function(){drop(.55,.4,.4,'#ffc93c');drop(.3,.6,.32,'#ff7a2e');E(.05,.1,.55,.45,'#f4511e');C(-.3,-.3,.34,'#ff7043');E(.2,.12,.36,.22,'#ffb300',-.3);P('#ffd23f',[-.6,-.34,-.92,-.22,-.6,-.14]);C(-.36,-.36,.07,'#fff');C(-.37,-.36,.04,'#223');drop(-.25,-.72,.2,'#ffc93c');drop(-.05,-.62,.15,'#ff7a2e')}
  };
  var RIM=['#b98450','#5aa9f2','#59b860','#f5a623','#ef6f9a','#a45de8','#e5484d','#00bcd4','#ffc93c'];
  var CACHE={},CS=112;
  function tokCanvas(id){if(CACHE[id])return CACHE[id];var c=document.createElement('canvas');c.width=c.height=CS;var k=c.getContext('2d'),r=CS/2-4;
    k.translate(CS/2,CS/2);var gr=k.createRadialGradient(-r*.3,-r*.4,r*.1,0,0,r);gr.addColorStop(0,'#fffdf4');gr.addColorStop(1,'#f1e2c3');
    k.fillStyle=RIM[Math.min(DEPTH[id],RIM.length-1)];k.beginPath();k.arc(0,0,r,0,7);k.fill();
    k.fillStyle=gr;k.beginPath();k.arc(0,0,r*.89,0,7);k.fill();
    k.save();k.beginPath();k.arc(0,0,r*.89,0,7);k.clip();k.scale(r*.63,r*.63);K=k;ICON[id]();k.restore();
    k.strokeStyle='rgba(255,255,255,.5)';k.lineWidth=2;k.beginPath();k.arc(0,0,r*.84,3.5,4.9);k.stroke();
    CACHE[id]=c;return c}
  function tok(g,id,x,y,r,o){o=o||{};g.save();if(o.a!=null)g.globalAlpha=o.a;
    if(!o.flat){g.fillStyle='rgba(40,20,10,.3)';g.beginPath();g.ellipse(x,y+r*.86+(o.lift||0),r*.8,r*.24,0,0,7);g.fill()}
    g.drawImage(tokCanvas(id),x-r*1.08,y-r*1.08-(o.lift||0),r*2.16,r*2.16);g.restore()}
  function label(g,s,x,y,size,col){g.font=size+F;g.textAlign='center';g.textBaseline='middle';
    var w=g.measureText(s).width,sc=w>84?84/w:1;g.save();g.translate(x,y);g.scale(sc,1);
    g.lineWidth=3;g.strokeStyle='rgba(50,28,14,.75)';g.lineJoin='round';g.strokeText(s,0,0);g.fillStyle=col||'#fff6e0';g.fillText(s,0,0);g.restore()}

  /* ---------- 배치 ---------- */
  var BR=28,SR=19,REVX=180,REVY=380;
  function benchPos(i){return {x:45+(i%4)*90,y:302+Math.floor(i/4)*84}}
  function shelfPos(i){return {x:52+i*51,y:551}}
  var BOOKB={x:8,y:599,w:122,h:35};
  function pages(){return Math.max(1,Math.ceil(S.shelf.length/6))}
  function tokens(){var t=[],i;for(i=0;i<12;i++)if(S.bench[i]){var p=benchPos(i);t.push({id:S.bench[i],x:p.x,y:p.y,r:BR,z:'bench',i:i})}
    for(i=0;i<6;i++){var id=S.shelf[S.page*6+i];if(id){var q=shelfPos(i);t.push({id:id,x:q.x,y:q.y,r:SR,z:'shelf',i:i})}}return t}
  function findTok(id){var t=tokens();for(var i=0;i<t.length;i++)if(t[i].id===id)return t[i];return null}
  function tokAt(x,y,pad,skip){var t=tokens(),best=null,bd=1e9;for(var i=0;i<t.length;i++){if(t[i].id===skip)continue;
      var d=Math.hypot(x-t[i].x,y-t[i].y);if(d<t[i].r+pad&&d<bd){bd=d;best=t[i]}}return best}
  function place(id){var i;S.have[id]=1;S.used[id]=S.t;
    for(i=0;i<12;i++)if(!S.bench[i]){S.bench[i]=id;return}
    var bi=-1,bu=1e9;for(i=4;i<12;i++){var u=S.used[S.bench[i]]||0;if(u<bu){bu=u;bi=i}}
    S.shelf.push(S.bench[bi]);S.bench[bi]=id;S.page=pages()-1}
  function reveal(id){ /* 선반에 있는 재료가 다른 쪽에 있으면 그 쪽으로 넘긴다 */
    var k=S.shelf.indexOf(id);if(k>=0)S.page=Math.floor(k/6)}

  /* ---------- 진행 ---------- */
  function jingle(a,notes,type){notes.forEach(function(n,i){S.q.push({t:S.t+i*.085,f:n,d:.16,ty:type||'triangle'})})}
  function newReq(){var tag=pickReq(S.have);S.req=tag?{tag:tag,t:0,in:0}:null}
  function startMerge(a,b,ax,ay){var ta=findTok(a),tb=findTok(b);if(!tb)return;if(ax==null){ax=ta?ta.x:tb.x-40;ay=ta?ta.y:tb.y}
    if(a===b&&Math.hypot(ax-tb.x,ay-tb.y)<8){ax=tb.x-44;ay=tb.y-10}
    S.merge={a:a,b:b,ax:ax,ay:ay,bx:tb.x,by:tb.y,t:0};S.sel=null;S.used[a]=S.used[b]=S.t+.001}
  function resolve(a){var m=S.merge,x=(m.ax+m.bx)/2,y=m.by,res=combine(m.a,m.b);S.merge=null;
    if(!res){S.combo=0;S.cat.sneeze=.9;a.beep(150,.18,'sawtooth');S.q.push({t:S.t+.12,f:110,d:.2,ty:'sawtooth'});a.shake(5);
      for(var i=0;i<12;i++)S.sm.push({x:m.bx+(Math.random()-.5)*26,y:m.by+(Math.random()-.5)*20,vx:(Math.random()-.5)*50,vy:-30-Math.random()*50,t:0,l:.7+Math.random()*.5,r:9+Math.random()*9});
      a.pop(m.bx,m.by-34,LI==='ko'?'푸쉬식…':'Fizzle…','#d5d0cc');a.pop(292,150,LI==='ko'?'에취!':'Achoo!','#fff');S.fizz++;return}
    if(S.have[res]){reveal(res);var t=findTok(res);S.bounce[res]=.5;a.sfx('tap');
      a.pop(t?t.x:m.bx,(t?t.y:m.by)-34,LI==='ko'?'이미 있어요':'Already have it','#ffe9a8');return}
    S.combo++;S.found++;var pts=points(res,S.combo),isNew=!S.book[res],hit=S.req&&ITEM[res].tags.indexOf(S.req.tag)>=0;
    if(isNew){S.book[res]=1;saveBook(S.book);pts+=20}
    if(hit){pts+=50;S.req=null;S.reqWait=2.5}
    S.time=Math.min(60,S.time+6);place(res);a.add(pts);S.cat.clap=1.3;
    S.rev={id:res,t:0,isNew:isNew,pts:pts,hit:hit,fx:m.bx,fy:m.by};
    jingle(a,DEPTH[res]>=5?[523,659,784,1047,1319,1568]:[659,784,988,1319]);if(hit)S.q.push({t:S.t+.5,f:1760,d:.25,ty:'sine'});
    a.burst(REVX,REVY,'#ffe58a',16);a.burst(REVX,REVY,RIM[Math.min(DEPTH[res],8)],10)}
  function act(id,a){ /* 탭 또는 스페이스로 토큰을 고른다 */
    if(S.sel!=null){startMerge(S.sel,id)}else{S.sel=id;a.beep(520,.05,'square')}}
  function openBook(a){S.bookOpen=true;S.bookIdle=0;S.bsel=S.bsel||0;S.sel=null;S.drag=null;a.sfx('tap')}

  function init(a){LI=a.lang==='ko'?'ko':'en';spaceQ=false;var book=loadBook(),st=pickStart(book),have={},used={};
    S={t:0,time:45,book:book,have:have,used:used,bench:[],shelf:[],page:0,sel:null,drag:null,merge:null,rev:null,
      combo:0,found:0,fizz:0,q:[],sm:[],bounce:{},req:null,reqWait:5,cat:{clap:0,sneeze:0,blink:2,lx:0,ly:0},
      kb:false,cur:{z:'bench',i:0},bookOpen:false,bsel:0,bookIdle:0,ended:false,start:count(book),hover:null,back:null};
    for(var i=0;i<12;i++)S.bench.push(st[i]||null);st.forEach(function(id){have[id]=1;used[id]=0})}

  function moveCur(dir){var c=S.cur;
    if(c.z==='bench'){var x=c.i%4,y=Math.floor(c.i/4);
      if(dir==='left')x=(x+3)%4;else if(dir==='right')x=(x+1)%4;else if(dir==='up')y=Math.max(0,y-1);
      else if(y<2)y++;else{if(S.shelf.length){c.z='shelf';c.i=Math.min(x+1,Math.min(5,S.shelf.length-S.page*6-1));return}c.z='book';return}
      c.i=y*4+x}
    else if(c.z==='shelf'){var n=Math.min(6,S.shelf.length-S.page*6);
      if(dir==='left'){if(c.i>0)c.i--;else if(S.page>0){S.page--;c.i=5}}
      else if(dir==='right'){if(c.i<n-1)c.i++;else if(S.page<pages()-1){S.page++;c.i=0}}
      else if(dir==='up'){c.z='bench';c.i=8+Math.min(3,Math.max(0,c.i-1))}else c.z='book'}
    else{if(dir==='up'){if(S.shelf.length){c.z='shelf';c.i=0}else{c.z='bench';c.i=8}}}}
  function curTok(){var c=S.cur;if(c.z==='bench')return S.bench[c.i]||null;if(c.z==='shelf')return S.shelf[S.page*6+c.i]||null;return null}

  function update(dt,inp,a){
    S.t+=dt;var sp=spaceQ;spaceQ=false;
    var kbSw=inp.swipe&&inp.x==null?inp.swipe:null,ptr=inp.tap&&!sp&&!kbSw&&inp.x!=null;
    for(var i=S.q.length-1;i>=0;i--)if(S.q[i].t<=S.t){a.beep(S.q[i].f,S.q[i].d,S.q[i].ty);S.q.splice(i,1)}
    for(i=S.sm.length-1;i>=0;i--){var p=S.sm[i];p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=20*dt;if(p.t>p.l)S.sm.splice(i,1)}
    for(var k in S.bounce){S.bounce[k]-=dt;if(S.bounce[k]<=0)delete S.bounce[k]}
    var c=S.cat;c.clap=Math.max(0,c.clap-dt);c.sneeze=Math.max(0,c.sneeze-dt);c.blink-=dt;if(c.blink<-.14)c.blink=2+Math.random()*3;
    if(S.back){S.back.t+=dt;if(S.back.t>.18)S.back=null}
    if(sp||kbSw)S.kb=true;if(ptr)S.kb=false;

    if(S.bookOpen){S.bookIdle+=dt;
      if(kbSw){S.bookIdle=0;var b=S.bsel;if(kbSw==='left')b--;else if(kbSw==='right')b++;else if(kbSw==='up')b-=7;else b+=7;if(b>=0&&b<TOTAL)S.bsel=b}
      if(ptr){S.bookIdle=0;var cx=Math.floor((inp.x-19)/46),cy=Math.floor((inp.y-84)/44),n=cy*7+cx;
        if(cx>=0&&cx<7&&cy>=0&&n<TOTAL&&inp.y>=84)S.bsel=n;else{S.bookOpen=false;a.sfx('tap')}}
      if(sp||S.bookIdle>10){S.bookOpen=false;a.sfx('tap')}
      return}
    if(S.rev){S.rev.t+=dt;if(S.rev.t>1.25||((ptr||sp)&&S.rev.t>.4)){S.bounce[S.rev.id]=.5;S.rev=null;
        if(count(S.have)>=TOTAL){a.sfx('win');a.over();return}}
      return}

    S.time-=dt;a.tempo(S.time<10?1.35:1);
    if(S.time<=0){S.time=0;S.drag=null;a.over();return}
    if(S.req){S.req.t+=dt;S.req.in=Math.min(1,S.req.in+dt*4);if(S.req.t>22)newReq()}
    else{S.reqWait-=dt;if(S.reqWait<=0){newReq();if(S.req)a.beep(880,.08,'sine')}}

    if(S.merge){S.merge.t+=dt;if(S.merge.t>=.24)resolve(a);return}

    if(S.drag){var d=S.drag;
      if(inp.down&&inp.x!=null){if(Math.hypot(inp.x-d.sx,inp.y-d.sy)>10)d.moved=true;
        if(d.moved){var f=Math.min(1,dt*20);d.x+=(inp.x-d.x)*f;d.y+=(inp.y-30-d.y)*f;S.hover=tokAt(d.x,d.y+20,14,d.id);
          if(S.hover&&S.hover.id!==d.hid){d.hid=S.hover.id;a.beep(700,.03,'sine')}if(!S.hover)d.hid=null}}
      else{S.drag=null;
        if(d.moved){if(!S.hover&&inp.x!=null)S.hover=tokAt(inp.x,inp.y,10,d.id);if(S.hover)startMerge(d.id,S.hover.id,d.x,d.y);else S.back={id:d.id,x:d.x,y:d.y,t:0}}
        else act(d.id,a);
        S.hover=null}}
    else if(ptr){var x=inp.x,y=inp.y,h=tokAt(x,y,6);
      if(h)S.drag={id:h.id,x:h.x,y:h.y,sx:x,sy:y,moved:false,r:h.r,hid:null};
      else if(x>=BOOKB.x&&x<=BOOKB.x+BOOKB.w&&y>=BOOKB.y-4)openBook(a);
      else if(y>524&&y<580&&x<28&&S.page>0){S.page--;a.sfx('tap')}
      else if(y>524&&y<580&&x>332&&S.page<pages()-1){S.page++;a.sfx('tap')}
      else S.sel=null}
    if(kbSw){moveCur(kbSw);a.beep(440,.03,'square')}
    if(sp&&!S.drag&&!S.merge){if(S.cur.z==='book')openBook(a);else{var id=curTok();if(id)act(id,a)}}
    /* 고양이 시선 */
    var tx=180,ty=420;if(S.drag&&S.drag.moved){tx=S.drag.x;ty=S.drag.y}else if(S.sel&&findTok(S.sel)){var q=findTok(S.sel);tx=q.x;ty=q.y}else if(inp.x!=null){tx=inp.x;ty=inp.y}
    var dx=tx-292,dy=ty-170,l=Math.hypot(dx,dy)||1;c.lx+=(dx/l-c.lx)*Math.min(1,dt*10);c.ly+=(dy/l-c.ly)*Math.min(1,dt*10)}

  /* ---------- 그리기 ---------- */
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function drawRoom(g,T,fl){
    var gr=g.createLinearGradient(0,0,0,270);gr.addColorStop(0,'#3b2a4d');gr.addColorStop(1,'#6a4660');g.fillStyle=gr;g.fillRect(0,0,W,270);
    g.fillStyle='rgba(255,255,255,.035)';for(var i=0;i<8;i++)g.fillRect(i*48+8,0,2,270);
    /* 창문과 흘러가는 구름 */
    g.save();rr(g,16,46,92,100,46);g.clip();var sk=g.createLinearGradient(0,46,0,146);sk.addColorStop(0,'#27386e');sk.addColorStop(1,'#7a6aa8');g.fillStyle=sk;g.fillRect(16,46,92,100);
    g.fillStyle='#f5e7a3';g.beginPath();g.arc(84,72,11,0,7);g.fill();
    for(i=0;i<5;i++){g.globalAlpha=.4+.6*Math.abs(Math.sin(T*1.3+i*2));g.fillStyle='#fff';g.fillRect(24+i*17%80,56+(i*29)%50,2,2)}g.globalAlpha=1;
    for(i=0;i<3;i++){var cx=((T*(7+i*4)+i*60)%150)-10,cy=78+i*22;g.fillStyle='rgba(235,235,255,'+(.75-i*.15)+')';
      g.beginPath();g.arc(cx,cy,9,0,7);g.arc(cx+11,cy-5,11,0,7);g.arc(cx+23,cy,9,0,7);g.fill();g.fillRect(cx,cy,23,9)}
    g.restore();g.lineWidth=5;g.strokeStyle='#8a5a34';rr(g,16,46,92,100,46);g.stroke();g.lineWidth=3;g.beginPath();g.moveTo(62,46);g.lineTo(62,146);g.moveTo(16,100);g.lineTo(108,100);g.stroke();
    g.fillStyle='#9a6537';g.fillRect(10,144,104,7);
    /* 선반과 보글보글 병 */
    [[122,98],[122,152]].forEach(function(s,r){g.fillStyle='#9a6537';g.fillRect(s[0],s[1],108,6);g.fillStyle='#6f4524';g.fillRect(s[0],s[1]+6,108,3);
      for(var j=0;j<4;j++){var bx=s[0]+15+j*26,col=['#ef6f9a','#59d0c0','#ffc93c','#a45de8','#6fcf4f','#5aa9f2','#ff8a65','#e5484d'][r*4+j],tall=(j+r)%2;
        g.fillStyle='rgba(205,238,255,.55)';if(tall){g.fillRect(bx-4,s[1]-30,8,12);rr(g,bx-9,s[1]-20,18,20,5);g.fill()}else{g.fillRect(bx-3,s[1]-24,6,8);g.beginPath();g.arc(bx,s[1]-10,10,0,7);g.fill()}
        g.fillStyle=col;if(tall){rr(g,bx-7,s[1]-13,14,11,3);g.fill()}else{g.beginPath();g.arc(bx,s[1]-10,8,0,Math.PI);g.fill()}
        g.fillStyle='#b98450';g.fillRect(bx-4,s[1]-(tall?33:27),8,4);
        if((j+r)%2===0)for(var b=0;b<3;b++){var ph=(T*.7+b*.33+j*.21)%1;g.globalAlpha=1-ph;g.fillStyle='#fff';g.beginPath();g.arc(bx+Math.sin(ph*9+b)*3,s[1]-12-ph*26,1.6+b*.5,0,7);g.fill()}g.globalAlpha=1}});
    /* 촛불 빛 */
    var lg=g.createRadialGradient(52,206,4,52,206,170*fl);lg.addColorStop(0,'rgba(255,200,110,.42)');lg.addColorStop(1,'rgba(255,200,110,0)');g.fillStyle=lg;g.fillRect(0,30,W,240)}
  function drawCat(g,T){var c=S.cat,x=292,y=172,sn=c.sneeze>0?Math.sin((.9-c.sneeze)*9)*Math.min(1,c.sneeze*3):0,bob=Math.sin(T*2)*1.5+sn*9;
    g.save();g.translate(x,y+bob);g.rotate(sn*.12);
    g.fillStyle='#5b46b0';g.beginPath();g.ellipse(0,74,44,50,0,0,7);g.fill();g.fillStyle='#ffd23f';g.beginPath();g.arc(0,40,5,0,7);g.fill();
    g.fillStyle='#f3ede4';g.beginPath();g.moveTo(-34,-6);g.lineTo(-30,-34);g.lineTo(-10,-22);g.fill();g.beginPath();g.moveTo(34,-6);g.lineTo(30,-34);g.lineTo(10,-22);g.fill();
    g.fillStyle='#ffb3c1';g.beginPath();g.moveTo(-28,-14);g.lineTo(-27,-27);g.lineTo(-17,-21);g.fill();g.beginPath();g.moveTo(28,-14);g.lineTo(27,-27);g.lineTo(17,-21);g.fill();
    g.fillStyle='#f3ede4';g.beginPath();g.ellipse(0,6,36,30,0,0,7);g.fill();
    g.fillStyle='rgba(255,150,170,.45)';g.beginPath();g.ellipse(-22,16,7,4,0,0,7);g.ellipse(22,16,7,4,0,0,7);g.fill();
    /* 눈 */
    var shut=c.blink<0||c.sneeze>.25,happy=c.clap>0;
    [-13,13].forEach(function(ex){if(shut||happy){g.strokeStyle='#3a2a33';g.lineWidth=2.5;g.lineCap='round';g.beginPath();
        if(happy){g.arc(ex,7,5,Math.PI*1.1,Math.PI*1.9)}else{g.moveTo(ex-5,2);g.lineTo(ex+(ex<0?3:-3),6);g.lineTo(ex-5*(ex<0?1:-1)*-1,10)}g.stroke()}
      else{g.fillStyle='#fff';g.beginPath();g.ellipse(ex,5,7,8,0,0,7);g.fill();g.fillStyle='#3a2a33';g.beginPath();g.arc(ex+c.lx*3,5+c.ly*3.5,4,0,7);g.fill();
        g.fillStyle='#fff';g.beginPath();g.arc(ex+c.lx*3-1.3,3.5+c.ly*3.5,1.3,0,7);g.fill()}});
    g.fillStyle='#ff8fa3';g.beginPath();g.moveTo(-4,14);g.lineTo(4,14);g.lineTo(0,18);g.fill();
    g.strokeStyle='#3a2a33';g.lineWidth=1.8;g.beginPath();if(c.sneeze>.25){g.ellipse(0,24,4,5,0,0,7)}else{g.moveTo(-6,23);g.quadraticCurveTo(-1,26,0,18);g.quadraticCurveTo(1,26,6,23)}g.stroke();
    g.strokeStyle='rgba(60,40,50,.5)';g.lineWidth=1.2;g.beginPath();g.moveTo(-24,16);g.lineTo(-44,13);g.moveTo(-24,20);g.lineTo(-43,23);g.moveTo(24,16);g.lineTo(44,13);g.moveTo(24,20);g.lineTo(43,23);g.stroke();
    /* 마법사 모자 */
    g.fillStyle='#6a4fc4';g.beginPath();g.moveTo(-26,-18);g.quadraticCurveTo(-4,-50,10+Math.sin(T*1.5)*3,-76);g.quadraticCurveTo(14,-40,26,-18);g.fill();
    g.fillStyle='#4f38a0';g.beginPath();g.ellipse(0,-18,38,8,0,0,7);g.fill();g.fillStyle='#ffd23f';g.fillRect(-21,-27,42,4);
    g.fillStyle='#ffe58a';[[-4,-40,2.5],[8,-56,2],[-10,-30,1.6]].forEach(function(s){g.beginPath();g.arc(s[0],s[1],s[2],0,7);g.fill()});
    /* 앞발 */
    var cl=c.clap>0?Math.abs(Math.sin(c.clap*16)):0,py=c.clap>0?46:78,px=c.clap>0?6+cl*14:24;
    g.fillStyle='#f3ede4';g.beginPath();g.ellipse(-px,py,9,7,0,0,7);g.ellipse(px,py,9,7,0,0,7);g.fill();
    g.restore()}
  function drawCandle(g,T,fl){var x=52,base=256,h=6+52*Math.max(0,S.time)/60,top=base-h;
    g.fillStyle='#b98450';g.beginPath();g.ellipse(x,base,20,5,0,0,7);g.fill();
    var cg=g.createLinearGradient(x-9,0,x+9,0);cg.addColorStop(0,'#fff6e0');cg.addColorStop(1,'#e6d2a8');g.fillStyle=cg;rr(g,x-9,top,18,h,4);g.fill();
    g.fillStyle='#fff6e0';g.beginPath();g.ellipse(x-9,top+8,3,6,0,0,7);g.fill();
    g.strokeStyle='#3a2a22';g.lineWidth=1.5;g.beginPath();g.moveTo(x,top);g.lineTo(x,top-5);g.stroke();
    if(S.time>0){var s=(S.time<10?.8:1)*fl*13,fx=x+Math.sin(T*9)*1.2,fy=top-6-s*.8;
      g.fillStyle='#ff7a2e';g.beginPath();g.moveTo(fx,fy-s);g.bezierCurveTo(fx+s*.9,fy,fx+s*.7,fy+s*.85,fx,fy+s*.85);g.bezierCurveTo(fx-s*.7,fy+s*.85,fx-s*.9,fy,fx,fy-s);g.fill();
      g.fillStyle='#ffe58a';g.beginPath();g.ellipse(fx,fy+s*.35,s*.32,s*.45,0,0,7);g.fill()}
    var low=S.time<10;label(g,Math.ceil(S.time)+(LI==='ko'?'초':'s'),x+38,236,low?18:15,low&&Math.sin(T*10)>0?'#ff8a80':'#ffe9a8')}
  function drawBubble(g){if(!S.req)return;var k=S.req.in,s=REQ[S.req.tag][LI==='ko'?0:1];g.save();g.translate(182,208);g.scale(k,k);
    g.font='13'+F;var w=Math.max(96,g.measureText(s).width+20);g.fillStyle='#fff8ea';rr(g,-w/2,-24,w,40,12);g.fill();
    g.beginPath();g.moveTo(w/2-6,-12);g.lineTo(w/2+12,-20);g.lineTo(w/2-6,0);g.fill();
    g.textAlign='center';g.textBaseline='middle';g.fillStyle='#b0563a';g.font='10'+F;g.fillText((LI==='ko'?'★ 주문 +50':'★ Request +50'),0,-14);
    g.fillStyle='#4a2e3a';g.font='13'+F;g.fillText(s,0,3);
    g.fillStyle='#f0d9b0';g.fillRect(-w/2+8,12,(w-16),2);g.fillStyle='#ef6f9a';g.fillRect(-w/2+8,12,(w-16)*Math.max(0,1-S.req.t/22),2);g.restore()}
  function drawBench(g,T){
    var gr=g.createLinearGradient(0,256,0,H);gr.addColorStop(0,'#b07a48');gr.addColorStop(.06,'#8a5a34');gr.addColorStop(1,'#5c3a22');g.fillStyle=gr;g.fillRect(0,256,W,H-256);
    g.fillStyle='#c99560';g.fillRect(0,256,W,5);g.strokeStyle='rgba(60,35,18,.25)';g.lineWidth=1;for(var i=0;i<5;i++){g.beginPath();g.moveTo(0,290+i*62);g.bezierCurveTo(120,284+i*62,240,298+i*62,W,290+i*62);g.stroke()}
    for(i=0;i<12;i++){var p=benchPos(i);g.fillStyle='rgba(50,28,14,.28)';g.beginPath();g.arc(p.x,p.y,BR+3,0,7);g.fill();g.strokeStyle='rgba(255,220,170,.12)';g.lineWidth=1.5;g.beginPath();g.arc(p.x,p.y,BR+3,0,7);g.stroke()}
    /* 서랍 선반 */
    g.fillStyle='rgba(40,22,12,.45)';rr(g,6,524,348,60,14);g.fill();
    if(!S.shelf.length){g.font='12'+F;g.textAlign='center';g.textBaseline='middle';g.fillStyle='rgba(255,233,200,.4)';g.fillText(LI==='ko'?'작업대가 가득 차면 여기 서랍에 정리돼요':'Older finds tidy away into this drawer',180,554)}
    else{g.font='16'+F;g.textAlign='center';g.textBaseline='middle';g.fillStyle=S.page>0?'#ffe9a8':'rgba(255,233,168,.2)';g.fillText('◀',16,552);
      g.fillStyle=S.page<pages()-1?'#ffe9a8':'rgba(255,233,168,.2)';g.fillText('▶',344,552);
      if(pages()>1)for(i=0;i<pages();i++){g.fillStyle=i===S.page?'#ffe9a8':'rgba(255,233,168,.3)';g.beginPath();g.arc(180+(i-(pages()-1)/2)*9,529,2,0,7);g.fill()}}
    /* 도감 버튼 */
    var b=BOOKB;g.fillStyle='#4f38a0';rr(g,b.x,b.y+2,b.w,b.h,10);g.fill();g.fillStyle='#6a4fc4';rr(g,b.x,b.y,b.w,b.h-2,10);g.fill();
    g.fillStyle='#ffd23f';g.fillRect(b.x+10,b.y+8,14,17);g.fillStyle='#fff6e0';g.fillRect(b.x+13,b.y+11,8,2);
    g.font='14'+F;g.textAlign='left';g.textBaseline='middle';g.fillStyle='#fff';g.fillText((LI==='ko'?'도감 ':'Book ')+count(S.book)+'/'+TOTAL,b.x+31,b.y+17);
    if(S.kb&&S.cur.z==='book'){g.strokeStyle='#fff';g.lineWidth=2.5;rr(g,b.x-2,b.y-2,b.w+4,b.h+2,11);g.stroke()}
    /* 안내 */
    var cap=null,col='#ffe9a8';
    if(S.found===0&&!S.sel)cap=LI==='ko'?'끌어다 놓아 합쳐 보세요!':'Drag one onto another!';
    else if(S.sel)cap=nm(S.sel)+(LI==='ko'?' + ?  (또 누르면 자기끼리)':' + ?  (tap again: with itself)');
    else if(S.combo>1){cap=(LI==='ko'?'연속 발견 ':'Combo ')+'x'+S.combo;col='#ffb3c1'}
    else cap=(LI==='ko'?'이번 실험 발견 ':'Found this run: ')+S.found;
    g.font='13'+F;g.textAlign='center';var w=g.measureText(cap).width,sc=w>172?172/w:1;g.save();g.translate(222,617);g.scale(sc,1);g.fillStyle=col;g.fillText(cap,0,0);g.restore()}
  function drawTokens(g,T){var t=tokens(),i;
    for(i=0;i<t.length;i++){var k=t[i],hid=(S.drag&&S.drag.moved&&S.drag.id===k.id)||(S.rev&&S.rev.id===k.id),r=k.r,lift=0;
      if(S.bounce[k.id])r*=1+Math.sin(S.bounce[k.id]*12)*.12*S.bounce[k.id]*2;
      var sel=S.sel===k.id,hov=S.hover&&S.hover.id===k.id;
      if(sel){lift=4+Math.sin(T*6)*1.5}
      if(hov){r*=1.12;g.strokeStyle='rgba(255,240,150,'+(.6+.4*Math.sin(T*14))+')';g.lineWidth=4;g.beginPath();g.arc(k.x,k.y,r+5,0,7);g.stroke()}
      if(sel){g.strokeStyle='#fff3b0';g.lineWidth=3;g.setLineDash([6,5]);g.lineDashOffset=-T*20;g.beginPath();g.arc(k.x,k.y-lift,r+5,0,7);g.stroke();g.setLineDash([])}
      if(!hid||S.rev){if(!(S.rev&&S.rev.id===k.id))tok(g,k.id,k.x,k.y,r,{lift:lift,a:hid?.35:1})}
      else tok(g,k.id,k.x,k.y,r,{a:.35,flat:1});
      if(k.z==='bench')label(g,nm(k.id),k.x,k.y+BR+13,12);else label(g,nm(k.id),k.x,k.y+SR+9,9,'#f1dcb8')}
    if(S.kb&&S.cur.z!=='book'){var p=S.cur.z==='bench'?benchPos(S.cur.i):shelfPos(S.cur.i),cr=(S.cur.z==='bench'?BR:SR)+8+Math.sin(T*7)*1.5;
      g.strokeStyle='#fff';g.lineWidth=2.5;for(i=0;i<4;i++){g.beginPath();g.arc(p.x,p.y,cr,i*Math.PI/2+.25,i*Math.PI/2+Math.PI/2-.25);g.stroke()}}
    /* 첫 판 안내 화살표 */
    if(S.found===0&&!S.drag&&!S.sel&&!S.merge&&!S.kb&&S.bench[0]&&S.bench[1]){var a=benchPos(0),b=benchPos(1),ph=(T*.8)%1,e=ph<.7?ph/.7:1,hx=a.x+(b.x-a.x)*e,hy=a.y+14-Math.sin(e*Math.PI)*16;
      g.globalAlpha=ph<.85?.9:(1-ph)/.15*.9;g.fillStyle='#fff';g.strokeStyle='#4a2e3a';g.lineWidth=1.5;g.beginPath();g.arc(hx,hy,7,0,7);g.fill();g.stroke();rr(g,hx-4,hy,9,14,4);g.fill();g.stroke();g.globalAlpha=1}
    if(S.back){var bt=findTok(S.back.id),f=S.back.t/.18;if(bt)tok(g,S.back.id,S.back.x+(bt.x-S.back.x)*f,S.back.y+(bt.y-S.back.y)*f,bt.r,{flat:1})}
    if(S.merge){var m=S.merge,e2=Math.min(1,m.t/.24);e2=e2*e2;var mx=(m.ax+m.bx)/2,my=(m.ay+m.by)/2,sc=1-e2*.35;
      tok(g,m.b,m.bx+(mx-m.bx)*e2,m.by+(my-m.by)*e2,BR*sc,{flat:1});tok(g,m.a,m.ax+(mx-m.ax)*e2,m.ay+(my-m.ay)*e2,BR*sc,{flat:1});
      g.fillStyle='rgba(255,245,200,'+e2*.8+')';g.beginPath();g.arc(mx,my,BR*1.2*e2,0,7);g.fill()}
    if(S.drag&&S.drag.moved){var d=S.drag;tok(g,d.id,d.x,d.y,BR*1.12,{lift:8});label(g,nm(d.id),d.x,d.y-BR-22,13,'#fff')}
    for(i=0;i<S.sm.length;i++){var s=S.sm[i],q=s.t/s.l;g.fillStyle='rgba(150,150,158,'+(.6*(1-q))+')';g.beginPath();g.arc(s.x,s.y,s.r*(.6+q),0,7);g.fill()}}
  function drawReveal(g,T){var v=S.rev,e=Math.min(1,v.t/.3),s=e<1?1.25*e*(2-e)+.1:1+.03*Math.sin(T*6),al=Math.min(1,v.t*5);
    g.fillStyle='rgba(30,16,36,'+.62*al+')';g.fillRect(0,0,W,H);
    g.save();g.translate(REVX,REVY);g.rotate(T*.7);var col=RIM[Math.min(DEPTH[v.id],8)];
    for(var i=0;i<12;i++){g.rotate(Math.PI/6);g.fillStyle=i%2?'rgba(255,233,150,'+.34*al+')':'rgba(255,255,255,'+.16*al+')';g.beginPath();g.moveTo(0,0);g.lineTo(-22,-190*e);g.lineTo(22,-190*e);g.fill()}
    g.restore();var gl=g.createRadialGradient(REVX,REVY,10,REVX,REVY,110);gl.addColorStop(0,'rgba(255,245,200,.7)');gl.addColorStop(1,'rgba(255,245,200,0)');g.fillStyle=gl;g.fillRect(REVX-110,REVY-110,220,220);
    var x=v.fx+(REVX-v.fx)*e,y=v.fy+(REVY-v.fy)*e;tok(g,v.id,x,y,58*s,{flat:1});
    g.globalAlpha=al;label(g,nm(v.id),REVX,REVY+92,28,'#fff6e0');
    label(g,'+'+v.pts+(v.hit?(LI==='ko'?'  주문 성공!':'  Request!'):''),REVX,REVY+124,16,v.hit?'#ffb3c1':'#ffe58a');
    label(g,LI==='ko'?'양초 +6초':'Candle +6s',REVX,REVY+146,12,'#ffd0a0');
    if(v.isNew){g.save();g.translate(REVX,REVY-88);g.rotate(-.08);g.scale(1+.08*Math.sin(T*9),1+.08*Math.sin(T*9));g.fillStyle='#e5484d';rr(g,-58,-15,116,30,15);g.fill();
      g.font='16'+F;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText(LI==='ko'?'도감 새 발견!':'New in Book!',0,1);g.restore()}
    g.globalAlpha=1;void col}
  function hintFor(id){for(var i=0;i<RECIPES.length;i++){var r=RECIPES[i];if(r[2]!==id)continue;if(S.book[id])return nm(r[0])+' + '+nm(r[1])}
    for(i=0;i<RECIPES.length;i++){r=RECIPES[i];if(r[2]===id&&S.book[r[0]]&&S.book[r[1]])return nm(r[0])+' + ?'}return '? + ?'}
  function drawBook(g,T){g.fillStyle='rgba(24,14,30,.9)';g.fillRect(0,0,W,H);
    g.fillStyle='#f6ead0';rr(g,10,36,340,586,16);g.fill();g.fillStyle='#6a4fc4';rr(g,10,36,340,40,16);g.fill();g.fillRect(10,60,340,16);
    g.font='18'+F;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText((LI==='ko'?'냥금술 도감  ':'Alchemy Book  ')+count(S.book)+' / '+TOTAL,180,57);
    for(var i=0;i<TOTAL;i++){var id=ORDER[i],x=19+(i%7)*46+23,y=84+Math.floor(i/7)*44+22;
      if(S.book[id])tok(g,id,x,y,18,{flat:1});else{g.fillStyle='#cdbb98';g.beginPath();g.arc(x,y,17,0,7);g.fill();g.fillStyle='#b3a07c';g.font='18'+F;g.fillText('?',x,y+1)}
      if(i===S.bsel){g.strokeStyle='#e5484d';g.lineWidth=3;g.beginPath();g.arc(x,y,21+Math.sin(T*6),0,7);g.stroke()}}
    var sid=ORDER[S.bsel],kn=S.book[sid];g.fillStyle='#ead9b4';rr(g,22,572,316,42,10);g.fill();
    g.fillStyle='#4a2e3a';g.font='16'+F;g.textAlign='center';g.fillText(kn?nm(sid):'???',180,585);
    g.font='12'+F;g.fillStyle='#8a5a34';g.fillText(BASICS.indexOf(sid)>=0?(LI==='ko'?'기본 원소':'Basic element'):hintFor(sid),180,603);
    g.font='11'+F;g.fillStyle='rgba(255,255,255,.8)';g.fillText(LI==='ko'?'바깥을 누르면 닫혀요 · 양초는 멈춰 있어요':'Tap outside to close · candle is paused',160,631)}

  function draw(g,a){var T=performance.now()/1000,fl=1+Math.sin(T*13)*.04+Math.sin(T*29)*.03;
    drawRoom(g,T,fl);drawCat(g,T);drawCandle(g,T,fl);drawBubble(g);drawBench(g,T);drawTokens(g,T);
    /* 양초가 줄수록 방이 어두워진다 */
    var dark=S.time<15?(1-S.time/15)*.45:0,vg=g.createRadialGradient(180,300,120,180,330,420);vg.addColorStop(0,'rgba(20,8,20,0)');vg.addColorStop(1,'rgba(20,8,20,'+(.3+dark)+')');g.fillStyle=vg;g.fillRect(0,0,W,H);
    if(S.rev)drawReveal(g,T);if(S.bookOpen)drawBook(g,T)}

  SG.run({id:'cat-alchemy',title:{ko:'냥금술사의 실험실',en:'Cat Alchemy'},
    how:{ko:'재료를 끌어다 다른 재료 위에 놓으면 합쳐져요. 새 발견마다 양초가 6초 늘어나요!',en:'Drag one token onto another to combine. Every new discovery adds 6s to the candle!'},
    init:init,update:update,draw:draw});
  window.__catAlchemy={S:function(){return S},tokens:tokens};
})();
