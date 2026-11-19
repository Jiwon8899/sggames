/* 꼬마 입환역 (Shunting Yard) — 작은 기관차로 화차를 밀고 끌어, 출발판 순서대로 열차를 짜는 입환 퍼즐.
   선로 = 칸 그래프, 측선 = 용량이 정해진 칸 줄, 기관차+연결 화차 = 칸을 따라 움직이는 한 줄.
   논리(parse/drives/solved/solve/genLevel)는 DOM 없이 돌아간다(node 검증용 module.exports). */
(function(){
  'use strict';
  /* ---------- 선로 모델 ----------
     격자 글자: '-' 수평 칸, '/' '\' 대각 칸, 'T' 전차대, 'X' 건널목 칸, 'L' 기관차, 숫자 화차, 소문자 이름 붙은 선로.
     모든 칸은 차량 1대를 담는다. 갈림(이웃 3개) 칸과 전차대 칸에는 멈출 수 없다(분기 지장 금지).
     출구 E = e행 0열 막다른 칸. 출발 열차 = E에 기관차, 그 뒤로 order 순서, 바로 다음 칸은 비어 있음. */
  var CW=32,RH=30,X0=20;
  var LEVELS=[
    {g:['--L-----1'],order:'1',
      tip:{ko:'기관차를 눌러 화차를 옮겨요',en:'Drive the loco to move wagons'}},
    {g:['L12--------'],order:'1',
      tip:{ko:'연결고리를 누르면 화차를 떼어 둘 수 있어요',en:'Tap a coupling to leave a wagon behind'}},
    {g:['.....1---',
        '..../....',
        'L--------2'],e:2,order:'12',
      tip:{ko:'갈림 레버를 눌러 길을 바꿔요',en:'Tap a lever to switch the points'}},
    {g:['......--.',
        '...../...',
        'L3----12-',
        '......\\..',
        '.......--'],e:2,order:'123',
      tip:{ko:'선로 끝 숫자만큼만 들어가요',en:'A siding holds only as many as its number'}},
    {g:['.....--....',
        '..../..\\...',
        '-----12L---'],e:2,order:'12',
      tip:{ko:'둘레길로 기관차를 앞으로 보내요',en:'Run around the loop to get in front'}},
    {g:['.....12-..',
        '..../.....',
        'L--------T'],e:2,order:'12',rev:true,
      tip:{ko:'기관차가 거꾸로! 전차대에서 돌려요',en:'Loco is backwards! Turn it on the turntable'}},
    {g:['......---..',
        '...../.....',
        'L-X--312---'],e:2,order:'123',bus:2,
      tip:{ko:'버스가 지날 때 건널목을 비워요',en:'Keep the crossing clear when the bus comes'}},
    {g:['......---.',
        '...../....',
        'L-----13-2'],e:2,order:'213',types:{'3':'t'},
      tip:{ko:'탱크차는 기관차 바로 뒤에 못 와요',en:'A tanker may not ride right behind the loco'}},
    {g:['......---.',
        '...../....',
        'L---45-1--'],e:2,order:'145',types:{'4':'r','5':'p'},
      tip:{ko:'냉동차는 전원차와 늘 붙어 다녀요',en:'The fridge wagon never leaves its power van'}},
    {g:['......a3-.',
        '...../....',
        'L-----12..',
        '......\\...',
        '.......--.'],e:2,order:'21',drop:{a:'3'},
      tip:{ko:'3번은 A 선로에 두고 떠나요',en:'Leave wagon 3 on siding A'}},
    {g:['......321.',
        '...../....',
        'L-----54--',
        '......\\...',
        '.......--.'],e:2,order:'135',
      tip:{ko:'세 갈래 선로, 머리를 써요',en:'Three sidings — plan ahead'}},
    {g:['......---...',
        '...../...\\..',
        '--X---132L--'],e:2,order:'123',types:{'3':'t'},bus:3,
      tip:{ko:'모든 규칙을 한 번에!',en:'Every rule at once!'}}
  ];
  var VTYPE={n:'n',t:'tank',r:'reefer',p:'power'};

  function isH(ch){return ch==='-'||ch==='E'||ch==='X'||ch==='L'||(ch>='0'&&ch<='9')||(ch>='a'&&ch<='z')}
  function parse(def){
    var cells={},slots=[],i,c,r,rows=def.g,er=def.e||0;
    for(r=0;r<rows.length;r++)for(c=0;c<rows[r].length;c++){var ch=rows[r][c];
      if(ch==='.'||ch===' ')continue;
      var s={i:slots.length,c:c,r:r,ch:ch,x:X0+c*CW,y:r*RH,nb:[],h:isH(ch),d:ch==='/'||ch==='\\',tt:ch==='T',x2:ch==='X',jn:null};
      cells[c+','+r]=s;slots.push(s)}
    function ports(s){if(s.ch==='/')return[[-1,1],[1,-1]];if(s.ch==='\\')return[[-1,-1],[1,1]];return[[-1,0],[1,0]]}
    function has(s,d){var p=ports(s);for(var k=0;k<p.length;k++)if(p[k][0]===d[0]&&p[k][1]===d[1])return true;return false}
    function acc(s,d){return (s.h||s.tt)&&d[0]!==0&&d[1]!==0}
    slots.forEach(function(s){for(var dx=-1;dx<=1;dx++)for(var dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;
      var t=cells[(s.c+dx)+','+(s.r+dy)];if(!t)continue;var d=[dx,dy],m=[-dx,-dy];
      if((has(s,d)||acc(s,d))&&(has(t,m)||acc(t,m))&&(has(s,d)||has(t,m)))s.nb.push(t.i)}});
    slots.forEach(function(s){
      if(s.nb.length>3&&!s.tt)throw new Error('too many neighbours at '+s.c+','+s.r);
      if(s.nb.length===3&&!s.tt){var sg=s.nb.map(function(n){return Math.sign(slots[n].c-s.c)}),k;
        for(k=0;k<3;k++)if(sg[k]!==sg[(k+1)%3]&&sg[k]!==sg[(k+2)%3])break;
        if(k===3)throw new Error('bad junction '+s.c+','+s.r);
        var br=s.nb.filter(function(n,q){return q!==k});
        /* a = 곧은 쪽(같은 행), b = 갈라지는 쪽 */
        br.sort(function(p,q){return Math.abs(slots[p].r-s.r)-Math.abs(slots[q].r-s.r)});
        s.jn={t:s.nb[k],a:br[0],b:br[1]}}});
    var E=cells['0,'+er];if(!E||E.nb.length!==1)throw new Error('exit must be a dead end at 0,'+er);
    /* 출구 선로 = E부터 첫 갈림 직전까지 */
    var ex=[E.i],prev=-1,cur=E.i;
    while(true){var nx=slots[cur].nb.filter(function(n){return n!==prev});if(nx.length!==1)break;var n2=nx[0];
      if(slots[n2].jn||slots[n2].tt)break;ex.push(n2);prev=cur;cur=n2;if(slots[cur].nb.length<2)break}
    /* 출구 쪽 이웃(얼굴 방향 계산) */
    var dist=slots.map(function(){return 1e9}),q=[E.i];dist[E.i]=0;
    while(q.length){var a=q.shift();slots[a].nb.forEach(function(b){if(dist[b]>dist[a]+1){dist[b]=dist[a]+1;q.push(b)}})}
    slots.forEach(function(s){s.dist=dist[s.i];s.root=-1;s.nb.forEach(function(b){if(dist[b]<s.dist&&(s.root<0||dist[b]<dist[s.root]))s.root=b})});
    /* 차량 */
    var veh=[{id:'L',type:'loco'}],occ=slots.map(function(){return 0});
    slots.forEach(function(s){if(s.ch==='L'){occ[s.i]=1}});
    slots.forEach(function(s){if(s.ch>='1'&&s.ch<='9'){veh.push({id:s.ch,type:VTYPE[(def.types||{})[s.ch]||'n']});occ[s.i]=veh.length}});
    if(def.start==='L'){/* 기관차를 E에 */}
    if(occ.indexOf(1)<0)occ[E.i]=1;
    var vid={};veh.forEach(function(v,k){vid[v.id]=k});
    var order=def.order.split('').map(function(ch){return vid[ch]});
    /* 이름 붙은 선로(갈림 칸을 넘지 않는 연결 구간) */
    function segOf(i0){var seen={},st=[i0],out=[];seen[i0]=1;while(st.length){var a=st.pop();out.push(a);
      slots[a].nb.forEach(function(b){if(!seen[b]&&!slots[b].jn&&!slots[b].tt){seen[b]=1;st.push(b)}})}return out}
    var drops=[];if(def.drop)Object.keys(def.drop).forEach(function(letter){
      var s0=slots.filter(function(s){return s.ch===letter})[0];if(!s0)throw new Error('no siding '+letter);
      var set=segOf(s0.i);def.drop[letter].split('').forEach(function(ch){drops.push({v:vid[ch],set:set,name:letter})})});
    /* 막다른 선로 용량 */
    var ends=[];slots.forEach(function(s){if(s.nb.length===1&&s.i!==E.i&&!s.jn&&!s.tt){var sg=segOf(s.i);ends.push({s:s.i,cap:sg.length,seg:sg})}});
    var reefer=[];veh.forEach(function(v,k){if(v.type==='reefer'||v.type==='power')reefer.push(k)});
    var X=-1;slots.forEach(function(s){if(s.x2)X=s.i});
    var pts={};slots.forEach(function(s){if(s.jn)pts[s.i]=(def.sw||[]).indexOf(s.c+','+s.r)>=0?s.jn.b:s.jn.a});
    var tt=-1;slots.forEach(function(s){if(s.tt)tt=s.nb[0]});
    var rows2=0;slots.forEach(function(s){rows2=Math.max(rows2,s.r)});
    return {def:def,slots:slots,E:E.i,ex:ex,veh:veh,occ0:occ,order:order,drops:drops,ends:ends,reefer:reefer,
      X:X,bus:def.bus||0,rev0:def.rev?1:0,pts0:pts,tt0:tt,rows:rows2+1,segOf:segOf}}

  /* 칸의 실제 연결(갈림 칸은 현재 분기 방향만) */
  function links(L,s,pts){var S=L.slots[s];if(S.jn)return [S.jn.t,pts[s]];return S.nb}
  function linked(L,a,b,pts){return links(L,a,pts).indexOf(b)>=0&&links(L,b,pts).indexOf(a)>=0}
  /* 기관차와 맞닿은 차량 줄: 기관차 칸 연결 lk[0] 쪽, lk[1] 쪽 */
  function sides(L,occ,pts){var s=occ.indexOf(1),lk=links(L,s,pts),out=[[],[]];
    for(var d=0;d<2;d++){if(lk[d]==null)continue;var prev=s,cur=lk[d];
      while(cur!=null&&occ[cur]&&linked(L,prev,cur,pts)){out[d].push(cur);
        var nx=links(L,cur,pts).filter(function(n){return n!==prev});prev=cur;cur=nx.length===1?nx[0]:null}}
    return {s:s,nb:lk,sd:out}}

  /* 한 번의 운전 후보들. ui가 있으면 현재 분기/전차대/연결 상태를 따르고, 없으면 모든 선택을 펼친다(BFS용).
     반환: {opts:[{d,j,chain,path,end,fin,pts,rev,type}], why:[d0이유,d1이유]} */
  function drives(L,st,ui){
    var occ=st.occ,S=sides(L,occ,st.pts),opts=[],why=[null,null],term=[null,null],slots=L.slots;
    for(var d=0;d<2;d++){
      if(S.nb[d]==null){why[d]=term[d]='buffer';continue}
      var lead=S.sd[d],trail=S.sd[1-d],js=[];
      if(ui)js=[ui.trail(trail,S.s)];else for(var j=0;j<=trail.length;j++)js.push(j);
      js.forEach(function(j){
        var chain=trail.slice(0,j).reverse().concat([S.s],lead),gv=chain.map(function(s){return occ[s]-1}),k;
        /* 규칙: 탱크차는 기관차 바로 뒤 금지, 냉동차는 전원차와 함께 */
        var li=gv.indexOf(0);
        if((gv[li-1]!=null&&L.veh[gv[li-1]].type==='tank')||(gv[li+1]!=null&&L.veh[gv[li+1]].type==='tank')){why[d]=term[d]=why[d]||'tank';return}
        if(L.reefer.length){var inn=0;for(k=0;k<L.reefer.length;k++)if(gv.indexOf(L.reefer[k])>=0)inn++;
          if(inn&&inn<L.reefer.length){why[d]=term[d]=why[d]||'reefer';return}}
        var mine={};chain.forEach(function(s){mine[s]=1});
        var seen={},found=0,lastWhy=null;
        function rec(ch,prev,path,rev,depth){
          var h=ch[ch.length-1],hs=slots[h],cands;
          if(depth>200)return;
          if(path.length===0&&ch.length===1)cands=[S.nb[d]];
          else if(hs.jn){var J=hs.jn;
            if(prev===J.t)cands=(ui||mine[h])?[(ui||st).pts[h]]:[J.a,J.b];else cands=[J.t]}
          else if(hs.tt){cands=ui?[ui.tt]:hs.nb.slice()}
          else cands=hs.nb.filter(function(n){return n!==prev});
          if(!cands.length&&path.length)add(ch,path,rev,'buffer',null);
          if(!cands.length)lastWhy=lastWhy||'buffer';
          cands.forEach(function(n){
            var ns=slots[n],bl=null;
            if(occ[n]&&!mine[n])bl='wagon';
            else if(ch.indexOf(n)>=0)bl='self';
            else if(ns.tt&&ch.length>1)bl='tt';
            else if(ns.jn&&h!==ns.jn.t&&ui&&ui.pts[n]!==h)bl='points';
            if(bl){lastWhy=bl;if(path.length)add(ch,path,rev,bl,n);return}
            var sk=h+'>'+n+'|'+prev;if(seen[sk])return;seen[sk]=1;
            var nc=ch.slice(1);nc.push(n);var np=path.concat([n]),nr=rev^(hs.tt?1:0),vac=ch[0];
            if(slots[vac].jn||slots[vac].tt)add(nc,np,nr,'clear',null);
            rec(nc,h,np,nr,depth+1)})}
        function add(ch,path,rev,type,nxt){
          var q,np=null;
          for(q=0;q<ch.length;q++){var cs=slots[ch[q]];if(cs.tt)return;
            if(cs.jn){if(type==='clear')return;
              /* 멈춘 갈림의 방향 = 궤적에서 이웃한 갈래 */
              var F=chain.concat(path);if(nxt!=null)F.push(nxt);var p=F.lastIndexOf(ch[q]),J=cs.jn,set=null;
              [F[p-1],F[p+1]].forEach(function(x){if(x===J.a||x===J.b)set=x});
              if(set==null)set=st.pts[ch[q]];np=np||Object.assign({},st.pts);np[ch[q]]=set}}
          var fin=occ.slice();chain.forEach(function(s){fin[s]=0});ch.forEach(function(s,q2){fin[s]=gv[q2]+1});
          if(L.bus&&L.X>=0&&(st.n+1)%L.bus===0&&fin[L.X]){lastWhy='bus';return}
          opts.push({d:d,j:j,chain:chain,gv:gv,path:path,end:ch,fin:fin,pts:np||st.pts,rev:rev,type:type,nxt:nxt});found++}
        rec(chain,chain.length>1?chain[chain.length-2]:(S.nb[1-d]==null?-1:S.nb[1-d]),[],st.rev,0);
        term[d]=lastWhy||'buffer';if(!found)why[d]=why[d]||lastWhy||'buffer'})}
    return {opts:opts,why:why,term:term,S:S}}

  function solved(L,occ,rev){
    if(rev)return false;var ex=L.ex,n=L.order.length;
    if(occ[ex[0]]!==1)return false;
    for(var i=0;i<n;i++)if(ex[i+1]==null||occ[ex[i+1]]!==L.order[i]+1)return false;
    var nxt=ex[n+1];if(nxt==null){var a=ex[n],pp=n?ex[n-1]:-1;nxt=L.slots[a].nb.filter(function(b){return b!==pp})[0]}
    if(nxt!=null&&occ[nxt])return false;
    for(var k=0;k<L.drops.length;k++){var dd=L.drops[k],ok=false;for(var q=0;q<dd.set.length;q++)if(occ[dd.set[q]]===dd.v+1)ok=true;if(!ok)return false}
    return true}

  function keyOf(L,st){var k=st.occ.join(',')+'|'+st.rev+'|'+(L.bus?st.n%L.bus:0);
    for(var i=0;i<st.occ.length;i++)if(st.occ[i]&&L.slots[i].jn)k+='|'+i+':'+st.pts[i];return k}
  /* BFS 최소 운전 횟수 */
  function solve(L,st0,limit){
    var start={occ:st0.occ,rev:st0.rev,n:st0.n||0,pts:st0.pts},seen={},q=[start],dep=[0],head=0;seen[keyOf(L,start)]=1;
    if(solved(L,start.occ,start.rev))return {par:0,nodes:1};
    while(head<q.length){var st=q[head],dd=dep[head];head++;
      if(head>(limit||400000))return {par:-1,nodes:head,cut:true};
      var r=drives(L,st,null).opts;
      for(var i=0;i<r.length;i++){var o=r[i],ns={occ:o.fin,rev:o.rev,n:st.n+1,pts:o.pts},k=keyOf(L,ns);
        if(seen[k])continue;seen[k]=1;
        if(solved(L,ns.occ,ns.rev))return {par:dd+1,nodes:head};
        q.push(ns);dep.push(dd+1)}}
    return {par:-1,nodes:head}}

  /* ---------- 자동 생성: 완성 상태에서 무작위로 흐트러뜨린 뒤 BFS로 최소 횟수를 잰다 ---------- */
  function rng(seed){var x=seed>>>0||1;return function(){x^=x<<13;x>>>=0;x^=x>>>17;x^=x<<5;x>>>=0;return x/4294967296}}
  function blank(w,h){var g=[];for(var r=0;r<h;r++)g.push(new Array(w+1).join('.').split(''));return g}
  function layout(R){
    var ex=3+(R()<.55?1:0),g=blank(11,5),c,kind=R(),loop=kind<.25,three=!loop&&kind<.6;
    for(c=0;c<ex;c++)g[2][c]='-';
    if(loop){var lb=1+Math.floor(R()*2),la=lb+2,j2=ex+la+1;
      for(c=ex;c<=j2;c++)g[2][c]='-';g[1][ex+1]='/';for(c=ex+2;c<ex+2+lb;c++)g[0][c]='-';g[1][ex+2+lb]='\\';
      var stub=1+Math.floor(R()*Math.max(1,Math.min(3,10-j2)));for(c=j2+1;c<=Math.min(10,j2+stub);c++)g[2][c]='-'}
    else{var capT=2+Math.floor(R()*3),capM=2+Math.floor(R()*4);
      g[2][ex]='-';g[1][ex+1]='/';for(c=ex+2;c<ex+1+capT&&c<=10;c++)g[0][c]='-';
      var m0=ex+1;if(three){g[2][ex+1]='-';g[3][ex+2]='\\';var capB=2+Math.floor(R()*3);for(c=ex+3;c<ex+2+capB&&c<=10;c++)g[4][c]='-';m0=ex+2}
      for(c=m0;c<m0+capM&&c<=10;c++)g[2][c]='-'}
    var top=0,bot=4;while(g[top].join('').replace(/\./g,'')==='')top++;while(g[bot].join('').replace(/\./g,'')==='')bot--;
    return {rows:g.slice(top,bot+1).map(function(r){return r.join('').replace(/\.+$/,'')}),e:2-top,ex:ex}}
  function genLevel(idx,seed){
    for(var att=0;att<60;att++){
      var R=rng((seed*7919+idx*104729+att*31337)>>>0),lay=layout(R),k=2+Math.floor(R()*Math.min(2,lay.ex-2)),
          nw=Math.min(6,k+Math.floor(R()*3)),def={g:lay.rows.slice(),e:lay.e,order:'',gen:true};
      /* 완성 상태: E에 기관차, 뒤로 주문 순서, 나머지는 막다른 선로 끝부터 */
      var L0=parse({g:def.g,e:def.e,order:''}),ids=[],i;for(i=1;i<=nw;i++)ids.push(String(i));
      for(i=ids.length-1;i>0;i--){var q=Math.floor(R()*(i+1)),t=ids[i];ids[i]=ids[q];ids[q]=t}
      var order=ids.slice(0,k),rest=ids.slice(k),types={};
      if(idx>=14&&R()<.35){var tk=order[1+Math.floor(R()*(k-1))];types[tk]='t'}
      var place={};place[L0.ex[0]]='L';order.forEach(function(id,q2){place[L0.ex[q2+1]]=id});
      var free=[];L0.ends.forEach(function(e){var seg=e.seg.slice();seg.sort(function(p,q2){return L0.slots[p].dist-L0.slots[q2].dist}).reverse();free.push(seg)});
      var ok=true;rest.forEach(function(id){var sg=free.filter(function(f){return f.length>1});if(!sg.length){ok=false;return}
        var f=sg[Math.floor(R()*sg.length)];place[f.shift()]=id});
      if(!ok)continue;
      var rows=def.g.map(function(r){return r.split('')});
      Object.keys(place).forEach(function(si){var s=L0.slots[si];rows[s.r][s.c]=place[si]});
      def.g=rows.map(function(r){return r.join('')});def.order=order.join('');def.types=types;
      var L=parse(def),st={occ:L.occ0.slice(),rev:0,n:0,pts:Object.assign({},L.pts0)},steps=6+Math.floor(R()*8)+Math.min(6,idx-12>>1);
      for(i=0;i<steps;i++){var o=drives(L,st,null).opts;if(!o.length)break;var pick=o[Math.floor(R()*o.length)];
        st={occ:pick.fin,rev:pick.rev,n:st.n+1,pts:pick.pts}}
      if(solved(L,st.occ,st.rev))continue;
      /* 흐트러뜨린 배치를 새 격자로 */
      var rows2=lay.rows.map(function(r){return r.split('')});
      L.slots.forEach(function(s){var v=st.occ[s.i];if(v)rows2[s.r][s.c]=L.veh[v-1].id});
      var d2={g:rows2.map(function(r){return r.join('')}),e:def.e,order:def.order,types:types,gen:true,sw:[]};
      L.slots.forEach(function(s){if(s.jn&&st.pts[s.i]===s.jn.b)d2.sw.push(s.c+','+s.r)});
      var L2=parse(d2),res=solve(L2,{occ:L2.occ0,rev:0,n:0,pts:L2.pts0},30000),need=Math.min(9,3+(idx-12>>1));
      if(res.par>=need||(att>40&&res.par>=3)){d2.par=res.par;return d2}}
    return null}

  if(typeof module!=='undefined'&&module.exports)
    module.exports={LEVELS:LEVELS,parse:parse,drives:drives,solved:solved,solve:solve,sides:sides,links:links,genLevel:genLevel,keyOf:keyOf};
  if(typeof SG==='undefined')return;

  /* ---------- 게임 ---------- */
  var W=360,H=640,YA=196,YB=548;
  var WCOL={'1':'#e8574e','2':'#3f8de0','3':'#f2b42e','4':'#4fb35a','5':'#9a68d6','6':'#f0843a','7':'#2fb5a8','8':'#e86aa8','9':'#8a7a5a'};
  var MSG={
    buffer:{ko:'막다른 선로예요',en:'Buffer stop!'},points:{ko:'갈림이 반대로 놓였어요',en:'Points set the other way'},
    wagon:{ko:'화차가 막고 있어요',en:'A wagon is in the way'},self:{ko:'자리가 모자라요',en:'Not enough room'},
    tt:{ko:'전차대엔 기관차만 올라가요',en:'Turntable fits the loco only'},
    tank:{ko:'탱크차는 기관차 바로 뒤 금지!',en:'No tanker right behind the loco!'},
    reefer:{ko:'냉동차는 전원차와 함께!',en:'Fridge must stay with its power van!'},
    bus:{ko:'버스가 와요! 건널목을 비워요',en:'Bus coming — clear the crossing!'},
    foul:{ko:'자리가 모자라요',en:'Not enough room'},
    occ:{ko:'차량이 올라가 있어 못 바꿔요',en:'Something is standing on it'}};
  var lvN,L,st,hist,par,mode,anim,time,streak,tG=0,sel,opts,res,kSel,kbOn,pSel,cutI,tipT,lastGain,steam,bus,catMood,catT,
      blinkT,face,faceT,clouds,mat=null,deco,taps=[],checks,prevChecks,bumpA,departT,yardDone,initAt=0,toast,hover;
  var keys={};
  if(!window.__syKeys){window.__syKeys=true;
    window.addEventListener('keydown',function(e){var c=e.code;
      if(c==='Tab'||c==='Space'||c==='KeyC'||c==='KeyP'||c==='KeyO'||c==='KeyZ'||c==='KeyR'){
        if(window.__sg&&window.__sg.state().playing){e.preventDefault();if(!e.repeat)keys[c]=true}}});
    window.addEventListener('pointerdown',function(e){var cv=document.querySelector('#stage canvas');if(!cv||e.target!==cv)return;
      var r=cv.getBoundingClientRect();taps.push({x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H})});
    window.addEventListener('pointermove',function(e){var cv=document.querySelector('#stage canvas');if(!cv||e.pointerType!=='mouse')return;
      var r=cv.getBoundingClientRect();hover={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}})}

  function hash(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
  var runSeed=1;
  function defFor(n){if(n<LEVELS.length)return LEVELS[n];var d=genLevel(n,runSeed);
    if(!d)d=LEVELS[n%LEVELS.length];return d}
  function load(n){lvN=n;var d=defFor(n);L=parse(d);
    var span=(L.rows-1)*RH,oy=Math.round(YA+(YB-YA-span)/2+6);
    var mc=1;L.slots.forEach(function(s){mc=Math.max(mc,s.c)});var cw=Math.min(31,312/mc);
    L.slots.forEach(function(s){s.px=Math.round(32+s.c*cw);s.py=oy+s.y});L.oy=oy;
    par=d.par!=null?d.par:solve(L,{occ:L.occ0,rev:L.rev0,n:0,pts:L.pts0}).par;
    restart();tipT=0;makeDeco();yardDone=false}
  function restart(){st={occ:L.occ0.slice(),rev:L.rev0,n:0,pts:Object.assign({},L.pts0),tt:L.tt0,cpl:{}};hist=[];mode="play";anim=null;sel=true;
    kSel=-1;cutI=-1;pSel=-1;refresh()}
  function ckey(a,b){return a<b?a+'-'+b:b+'-'+a}
  function trailCount(trail){var j=0,pv=0;for(var i=0;i<trail.length;i++){var v=st.occ[trail[i]]-1;if(st.cpl[ckey(pv,v)]===false)break;j++;pv=v}return j}
  function refresh(){res=drives(L,st,{pts:st.pts,tt:st.tt,trail:trailCount});opts=res.opts;
    opts.forEach(function(o){o.head=o.end[o.end.length-1]});
    opts.sort(function(p,q){return p.d-q.d||p.path.length-q.path.length});
    if(kSel>=opts.length)kSel=opts.length?0:-1;
    checks=countChecks()}
  function countChecks(){var ex=L.ex,n=0;if(st.occ[ex[0]]!==1)return 0;
    for(var i=0;i<L.order.length;i++){if(ex[i+1]!=null&&st.occ[ex[i+1]]===L.order[i]+1)n++;else break}return n}

  function init(a){time=55;streak=0;lastGain=0;steam=[];bus=null;catMood=0;catT=0;blinkT=2;face=0;faceT=0;kbOn=false;toast=null;
    taps.length=0;keys={};initAt=performance.now();runSeed=1+Math.floor(Math.random()*1e6);
    clouds=[];for(var i=0;i<4;i++)clouds.push({x:hash(i+1)*W,y:150+hash(i+9)*420,s:.7+hash(i+5)*.8,v:6+hash(i+3)*8});
    load(0);prevChecks=checks;a.tempo(1)}

  /* ---------- 위치/각도 ---------- */
  function P(s){var S=L.slots[s];return {x:S.px,y:S.py}}
  function restAng(s){var lk=links(L,s,st.pts),a=P(s);
    if(lk.length>=2){var p=P(lk[0]),q=P(lk[1]);return Math.atan2(q.y-p.y,q.x-p.x)}
    var b=P(lk[0]);return Math.atan2(a.y-b.y,a.x-b.x)}
  function restFace(s){var lk=links(L,s,st.pts),a=P(s),best=-1;
    lk.forEach(function(n){if(best<0||L.slots[n].dist<L.slots[best].dist)best=n});
    var v;if(s===L.E||best<0||L.slots[best].dist>=L.slots[s].dist){var b=P(lk[0]);v={x:a.x-b.x,y:a.y-b.y}}
    else{var c=P(best);v={x:c.x-a.x,y:c.y-a.y}}
    var m=Math.hypot(v.x,v.y)||1;return {x:v.x/m*(st.rev?-1:1),y:v.y/m*(st.rev?-1:1)}}
  function interp(F,i){if(i<=0)return {x:F[0].x,y:F[0].y};
    var k=Math.floor(i);if(k>=F.length-1)return {x:F[F.length-1].x,y:F[F.length-1].y};var f=i-k;
    return {x:F[k].x+(F[k+1].x-F[k].x)*f,y:F[k].y+(F[k+1].y-F[k].y)*f}}
  function angAt(F,i){var a=interp(F,Math.max(0,i-.35)),b=interp(F,Math.min(F.length-1,i+.35));return Math.atan2(b.y-a.y,b.x-a.x)}
  function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}

  /* ---------- 조작 ---------- */
  function drive(o,a){
    hist.push(JSON.stringify({occ:st.occ,rev:st.rev,n:st.n,pts:st.pts,tt:st.tt,cpl:st.cpl}));
    var F=o.chain.concat(o.path).map(P),tti=-1;
    if(o.chain.length===1)for(var i=1;i<F.length-1;i++)if(L.slots[(o.chain.concat(o.path))[i]].tt)tti=i;
    var li=o.gv.indexOf(0),fv=restFace(o.chain[li]),q=interp(F,li),r2=interp(F,li+.5),dv={x:r2.x-q.x,y:r2.y-q.y},
        fwd=fv.x*dv.x+fv.y*dv.y>=0;
    var k=o.path.length+(tti>=0?1:0);
    anim={o:o,F:F,t:0,dur:.25+k*.16,k:k,tti:tti,fwd:fwd,li:li,puff:0,chuff:0};mode='anim';sel=true;
    a.beep(330,.05,'triangle')}
  function finishDrive(a){var o=anim.o;
    st.occ=o.fin;st.rev=o.rev;st.pts=o.pts;st.n++;
    if(o.type==='wagon'&&o.nxt!=null){var hv=o.gv[o.gv.length-1],ov=st.occ[o.nxt]-1;delete st.cpl[ckey(hv,ov)];
      var p=P(o.nxt);clack(a,p.x,p.y);bumpA={v:ov,t:0}}
    anim=null;mode='play';
    if(L.bus&&st.n%L.bus===0)startBus(a);
    refresh();
    if(checks>prevChecks){catMood=1;catT=1;a.beep(880+checks*120,.08,'triangle')}prevChecks=checks;
    if(solved(L,st.occ,st.rev))win(a)}
  function clack(a,x,y){a.beep(240,.04,'square');setTimeout(function(){a.beep(150,.05,'square')},45);a.burst(x,y,'#ffe7a8',6);face=2;faceT=.6}
  function startBus(a){var X=P(L.X);bus={t:0,x:X.x};a.beep(660,.12,'triangle');setTimeout(function(){a.beep(550,.16,'triangle')},140)}
  function refuse(d,why,a){var S=res.S,g=[S.s],dir={x:0,y:0};
    if(d!=null&&S.nb[d]!=null){var lead=S.sd[d],trail=S.sd[1-d];g=trail.slice(0,trailCount(trail)).concat([S.s],lead);
      var hd=lead.length?lead[lead.length-1]:S.s,pv=lead.length>1?lead[lead.length-2]:(lead.length?S.s:null),nx;
      if(!lead.length)nx=S.nb[d];else nx=links(L,hd,st.pts).filter(function(n){return n!==pv})[0];
      var h=P(hd),tg;if(nx!=null)tg=P(nx);else{var b=P(pv);tg={x:h.x*2-b.x,y:h.y*2-b.y}}
      var m=Math.hypot(tg.x-h.x,tg.y-h.y)||1;dir={x:(tg.x-h.x)/m,y:(tg.y-h.y)/m}}
    bumpA={g:g,dir:dir,t:0};
    var lp=P(S.s),msg=(MSG[why]||MSG.buffer)[a.lang];a.sfx('hit');a.shake(3);a.pop(lp.x,lp.y-24,msg,'#ffffff');
    face=1;faceT=.8;catMood=-1;catT=1;toast={s:msg,t:1.6}}
  function toggleJ(s,a){var S=L.slots[s];
    if(S.jn){if(st.occ[s]){refuseSoft(a,s);return}st.pts[s]=st.pts[s]===S.jn.a?S.jn.b:S.jn.a}
    else if(S.tt){var i=S.nb.indexOf(st.tt);st.tt=S.nb[(i+1)%S.nb.length]}
    a.beep(520,.04,'square');setTimeout(function(){a.beep(780,.04,'square')},40);refresh()}
  function refuseSoft(a,s){var p=P(s);a.beep(160,.12,'sawtooth');a.pop(p.x,p.y-20,MSG.occ[a.lang],'#ffffff')}
  function toggleCpl(pa,a){var k=ckey(pa.a,pa.b);if(st.cpl[k]===false)delete st.cpl[k];else st.cpl[k]=false;
    a.beep(st.cpl[k]===false?420:300,.05,'square');a.burst(pa.x,pa.y,st.cpl[k]===false?'#ff8a7a':'#bdf0a0',5);refresh()}
  function couplings(){var out=[];
    L.slots.forEach(function(s){if(!st.occ[s.i])return;links(L,s.i,st.pts).forEach(function(n){if(n>s.i&&st.occ[n]&&linked(L,s.i,n,st.pts)){
      var a=P(s.i),b=P(n);out.push({a:st.occ[s.i]-1,b:st.occ[n]-1,x:(a.x+b.x)/2,y:(a.y+b.y)/2,sa:s.i,sb:n})}})});return out}
  function undo(a){if(!hist.length||mode!=='play'){a.beep(200,.05,'sine');return}var h=JSON.parse(hist.pop());
    st.occ=h.occ;st.rev=h.rev;st.n=h.n;st.pts=h.pts;st.tt=h.tt;st.cpl=h.cpl;refresh();prevChecks=checks;a.beep(500,.05,'triangle');a.beep(380,.07,'triangle')}
  function junctions(){var out=[];L.slots.forEach(function(s){if(s.jn||(s.tt&&s.nb.length>1))out.push(s.i)});return out}
  function leverPos(s){var S=L.slots[s],p=P(s);if(S.tt)return p;var b=L.slots[S.jn.b];var up=b.r<S.r;return {x:p.x+(L.slots[S.jn.t].c<S.c?-6:6),y:p.y+(up?17:-17)}}
  function nearestJ(){var js=junctions();if(!js.length)return -1;var s0=st.occ.indexOf(1),dist={},q=[s0];dist[s0]=0;
    while(q.length){var u=q.shift();L.slots[u].nb.forEach(function(v){if(dist[v]==null){dist[v]=dist[u]+1;q.push(v)}})}
    js.sort(function(p,q2){return (dist[p]||99)-(dist[q2]||99)});return js[0]}

  function win(a){var ko=a.lang==='ko',mv=st.n,pb=mv<=par?10:(mv<=par+2?4:0);
    if(mv<=par)streak++;else streak=0;var sb=Math.min(streak,5)*2,pts=10+pb+sb;a.add(pts);
    time=Math.min(70,time+14);lastGain=1;mode='depart';departT=0;yardDone=true;
    var ex=L.ex,n=L.order.length,F=[];for(var i=n;i>=0;i--)F.push(P(ex[i]));
    for(i=1;i<=n+6;i++)F.push({x:P(ex[0]).x-i*CW,y:P(ex[0]).y});
    var gv=[];for(i=n;i>=0;i--)gv.push(st.occ[ex[i]]-1);
    anim={dep:true,F:F,gv:gv,li:n,t:0,fwd:true,k:n+6,puff:0,chuff:0};
    var e=P(ex[0]);a.sfx('win');a.beep(784,.28,'sine');setTimeout(function(){a.beep(988,.4,'sine')},280);
    ['#ffd23f','#ff7a8a','#6fc3ff','#8be28b'].forEach(function(c){a.burst(e.x+40,e.y,c,8)});
    a.pop(e.x+70,e.y-34,'+'+pts,'#fff27a');
    if(mv<=par)a.pop(e.x+80,e.y-60,ko?'기준 달성!':'Par!','#bff7a0');
    catMood=2;catT=2;face=2;faceT=2;a.tempo(1+Math.min(.4,lvN*.03))}

  function update(dt,inp,a){
    tG+=dt;var ko=a.lang==='ko',i;
    if(lastGain>0)lastGain-=dt;if(catT>0)catT-=dt;else catMood=0;if(faceT>0)faceT-=dt;else face=0;
    if(toast){toast.t-=dt;if(toast.t<=0)toast=null}
    blinkT-=dt;if(blinkT<-.14)blinkT=2+Math.random()*2.5;
    tipT+=dt;
    if(mode!=='depart'){time-=dt;if(time<=0){time=0;a.over();return}}
    if(bumpA){bumpA.t+=dt;if(bumpA.t>.35)bumpA=null}
    if(bus){bus.t+=dt;if(bus.t>2)bus=null}
    /* 증기 */
    for(i=steam.length-1;i>=0;i--){var sp=steam[i];sp.t+=dt;sp.y-=dt*22;sp.x+=dt*sp.vx;if(sp.t>1.1)steam.splice(i,1)}
    if(mode==='anim'||mode==='depart'){anim.t+=dt;var A=anim,fin=A.dep?1.9:A.dur,tt=Math.min(1,A.t/fin);
      A.u=A.dep?(A.k*tt*tt):(A.k*ease(tt));A.puff-=dt;
      if(A.puff<=0){A.puff=A.dep?.09:.14;var lp=locoPose();if(lp)steam.push({x:lp.cx,y:lp.cy,t:0,vx:(Math.random()-.5)*10})}
      A.chuff-=dt;if(A.chuff<=0){A.chuff=A.dep?.12:.18;a.beep(70+Math.random()*30,.05,'sawtooth')}
      if(A.t>=fin){if(A.dep){load(lvN+1);prevChecks=checks;mode='play'}else finishDrive(a)}}
    /* 키보드 */
    var any=false;for(var kk in keys)if(keys[kk])any=true;if(any)kbOn=true;
    if(mode==='play'){
      if(keys.Tab){if(opts.length){kSel=(kSel+1)%opts.length;a.beep(700,.03,'square')}else a.beep(200,.06,'sine')}
      if(keys.Space){if(kSel<0&&opts.length)kSel=0;if(kSel>=0&&opts[kSel])drive(opts[kSel],a);else refuse(res.why[0]?0:1,res.why[0]||res.why[1]||'buffer',a)}
      if(keys.KeyC){var S=res.S,blk=S.sd[0].slice().reverse().concat([S.s],S.sd[1]),lk=[];
        for(i=0;i<blk.length-1;i++)lk.push(ckey(st.occ[blk[i]]-1,st.occ[blk[i+1]]-1));
        if(lk.length){var cur=-1;for(i=0;i<lk.length;i++)if(st.cpl[lk[i]]===false){cur=i;break}
          lk.forEach(function(k){delete st.cpl[k]});var nx=cur+1;if(nx<lk.length)st.cpl[lk[nx]]=false;
          a.beep(nx<lk.length?420:300,.05,'square');refresh()}else a.beep(200,.06,'sine')}
      if(keys.KeyO){var js=junctions();if(js.length){var ci=js.indexOf(pSel);pSel=js[(ci+1)%js.length];a.beep(640,.03,'square')}}
      if(keys.KeyP){if(pSel<0)pSel=nearestJ();if(pSel>=0)toggleJ(pSel,a)}
      if(keys.KeyZ)undo(a);
      if(keys.KeyR){restart();prevChecks=checks;a.beep(300,.08,'triangle')}
    }
    keys={};
    /* 터치/마우스 */
    while(taps.length){var tp=taps.shift();kbOn=false;if(mode!=='play')continue;handleTap(tp.x,tp.y,a)}
  }
  function d2(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function handleTap(x,y,a){var p={x:x,y:y},i,best=-1,bd=1e9;
    if(y>H-60&&x<120){if(x<60)undo(a);else{restart();prevChecks=checks;a.beep(300,.08,'triangle')}return}
    if(sel)for(i=0;i<opts.length;i++){var dd=d2(p,P(opts[i].head));if(dd<bd){bd=dd;best=i}}
    if(best>=0&&bd<19){drive(opts[best],a);return}
    var cs=couplings();for(i=0;i<cs.length;i++)if(d2(p,cs[i])<12){toggleCpl(cs[i],a);return}
    var js=junctions();for(i=0;i<js.length;i++)if(d2(p,leverPos(js[i]))<16||d2(p,P(js[i]))<17){pSel=js[i];toggleJ(js[i],a);return}
    var ls=st.occ.indexOf(1);if(d2(p,P(ls))<15){sel=!sel;a.beep(sel?760:420,.05,'triangle');face=sel?2:0;faceT=.5;return}
    if(sel&&best>=0&&bd<42){drive(opts[best],a);return}
    var near=-1,nd=1e9;L.slots.forEach(function(s){var dd=d2(p,P(s.i));if(dd<nd){nd=dd;near=s.i}});
    if(nd<24){var S=res.S,bdir=null,bdd=1e9;for(var d=0;d<2;d++){if(S.nb[d]==null)continue;var hd=S.sd[d].length?S.sd[d][S.sd[d].length-1]:S.nb[d];
        var q=d2(p,P(hd));if(q<bdd){bdd=q;bdir=d}}
      if(bdir==null)bdir=0;refuse(bdir,res.term[bdir]||res.why[bdir]||'buffer',a)}}

  /* ---------- 그리기 ---------- */
  function locoPose(){var A=anim;if(!A)return null;var li=A.li,u=A.u||0,i=li+u,spin=0;
    if(A.tti>=0){if(i>=A.tti&&i<A.tti+1){spin=i-A.tti;i=A.tti}else if(i>=A.tti+1)i-=1}
    var p=interp(A.F,i),an=angAt(A.F,i)+spin*Math.PI,f=A.fwd?1:-1;
    var cx=p.x+Math.cos(an)*f*3,cy=p.y+Math.sin(an)*f*3-6;return {x:p.x,y:p.y,an:an,cx:cx,cy:cy,spin:spin}}
  function makeMat(){mat=document.createElement('canvas');mat.width=W;mat.height=H;var g=mat.getContext('2d'),i;
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#86c46a');gr.addColorStop(.5,'#74b65a');gr.addColorStop(1,'#5f9f4b');
    g.fillStyle=gr;g.fillRect(0,0,W,H);
    for(i=0;i<900;i++){g.fillStyle=hash(i)>.5?'rgba(255,255,220,.07)':'rgba(30,70,20,.08)';
      g.fillRect(hash(i+.3)*W,hash(i+.7)*H,1+hash(i+.1)*2,1+hash(i+.5)*2)}
    for(i=0;i<60;i++){var x=hash(i+500)*W,y=hash(i+700)*H;g.strokeStyle='rgba(50,110,40,.25)';g.lineWidth=1.2;
      for(var k=0;k<4;k++){g.beginPath();g.moveTo(x+k*2,y);g.lineTo(x+k*2+(hash(i+k)-.5)*4,y-4-hash(i*3+k)*4);g.stroke()}}
    /* 나무 테두리 */
    g.lineWidth=10;g.strokeStyle='#9b6b3f';g.strokeRect(5,5,W-10,H-10);g.lineWidth=2;g.strokeStyle='#6f4826';g.strokeRect(10,10,W-20,H-20);
    g.strokeStyle='rgba(255,220,170,.35)';g.strokeRect(1,1,W-2,H-2)}
  function makeDeco(){deco=[];var R=rng(lvN*7717+13),tries=0;
    function free(x,y,r){if(x<22||x>W-22||y<YA-14||y>YB+40)return false;if(L.X>=0&&Math.abs(x-P(L.X).x)<r+16)return false;if(x<130&&y>H-70)return false;if(x>W-60&&y>H-60)return false;
      for(var i=0;i<L.slots.length;i++){var s=L.slots[i];if(Math.hypot(s.px-x,s.py-y)<r+18)return false}
      for(i=0;i<deco.length;i++)if(Math.hypot(deco[i].x-x,deco[i].y-y)<r+deco[i].r)return false;return true}
    /* 역사(출구 선로 옆) */
    var e=P(L.ex[Math.min(1,L.ex.length-1)]);
    [[e.x+30,e.y-48],[e.x+30,e.y+50],[e.x+80,e.y-50],[e.x+80,e.y+52]].some(function(c){if(free(c[0],c[1],26)){deco.push({k:'st',x:c[0],y:c[1],r:28});return true}});
    while(deco.length<2&&tries<200){tries++;var x=30+R()*300,y=YA+R()*(YB-YA);if(free(x,y,30))deco.push({k:'pond',x:x,y:y,r:30})}
    for(tries=0;tries<400&&deco.length<26;tries++){var x2=24+R()*312,y2=YA-10+R()*(YB-YA+40),k=R();
      if(k<.45&&free(x2,y2,11))deco.push({k:'tree',x:x2,y:y2,r:11,s:.8+R()*.5,p:R()*6});
      else if(k<.7&&free(x2,y2,6))deco.push({k:'flw',x:x2,y:y2,r:6,c:['#ff8fb1','#ffe066','#ffffff','#c99bff'][Math.floor(R()*4)],p:R()*6});
      else if(k<.85&&free(x2,y2,7))deco.push({k:'man',x:x2,y:y2,r:7,c:['#e86a5a','#4a90d9','#f2c14e','#6cc070'][Math.floor(R()*4)],p:R()*6})}
    deco.sort(function(p,q){return p.y-q.y})}

  function drawBg(g,dt){if(!mat)makeMat();g.drawImage(mat,0,0);var i;
    for(i=0;i<clouds.length;i++){var c=clouds[i];c.x+=c.v*dt;if(c.x>W+90)c.x=-90;
      g.fillStyle='rgba(20,60,30,.09)';g.beginPath();g.ellipse(c.x,c.y,60*c.s,24*c.s,0,0,7);g.ellipse(c.x+30*c.s,c.y-8*c.s,34*c.s,20*c.s,0,0,7);g.fill()}}
  function drawDeco(g,t){deco.forEach(function(d){
    if(d.k==='pond'){g.fillStyle='rgba(0,0,0,.12)';g.beginPath();g.ellipse(d.x+3,d.y+4,d.r+4,d.r*.62+3,0,0,7);g.fill();
      g.fillStyle='#c9b48a';g.beginPath();g.ellipse(d.x,d.y,d.r+3,d.r*.62+3,0,0,7);g.fill();
      var gr=g.createRadialGradient(d.x-6,d.y-5,2,d.x,d.y,d.r);gr.addColorStop(0,'#9fdcf0');gr.addColorStop(1,'#4a9ec4');
      g.fillStyle=gr;g.beginPath();g.ellipse(d.x,d.y,d.r,d.r*.62,0,0,7);g.fill();
      for(var k=0;k<2;k++){var ph=(t*.35+k*.5)%1;g.strokeStyle='rgba(255,255,255,'+(.5*(1-ph))+')';g.lineWidth=1.2;
        g.beginPath();g.ellipse(d.x+(k?8:-6),d.y+(k?2:-2),4+ph*12,(4+ph*12)*.6,0,0,7);g.stroke()}
      g.fillStyle='#7cc56a';g.beginPath();g.ellipse(d.x+d.r*.5,d.y+3,5,3,0,0,7);g.fill();
      /* 오리 */
      var dx=d.x+Math.sin(t*.4+d.y)*d.r*.4,dy=d.y+Math.cos(t*.3)*3;g.fillStyle='#fff6d8';g.beginPath();g.ellipse(dx,dy,4,3,0,0,7);g.fill();
      g.beginPath();g.arc(dx+3,dy-2,2,0,7);g.fill();g.fillStyle='#f29a3a';g.fillRect(dx+4.5,dy-2.4,2,1.2)}
    else if(d.k==='tree'){var sw=Math.sin(t*1.3+d.p)*1.6,s=d.s;g.fillStyle='rgba(0,0,0,.16)';g.beginPath();g.ellipse(d.x+4,d.y+5,10*s,6*s,0,0,7);g.fill();
      g.fillStyle='#7a5230';g.fillRect(d.x-1.5,d.y-2,3,6);
      g.fillStyle='#3f8f45';g.beginPath();g.arc(d.x+sw,d.y-6*s,9*s,0,7);g.fill();g.fillStyle='#57aa52';g.beginPath();g.arc(d.x+sw-2,d.y-8*s,6.5*s,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.arc(d.x+sw-4,d.y-10*s,3*s,0,7);g.fill()}
    else if(d.k==='flw'){var b=Math.sin(t*2+d.p);g.fillStyle=d.c;for(var q=0;q<3;q++){g.beginPath();g.arc(d.x+q*4-4+b*.6,d.y+(q%2)*3,1.8,0,7);g.fill()}}
    else if(d.k==='man'){var bo=Math.abs(Math.sin(t*3+d.p))*1.5;g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(d.x+2,d.y+4,4,2,0,0,7);g.fill();
      g.fillStyle=d.c;g.beginPath();g.ellipse(d.x,d.y-bo,3.2,4,0,0,7);g.fill();g.fillStyle='#f6d2b0';g.beginPath();g.arc(d.x,d.y-5-bo,2.4,0,7);g.fill()}
    else if(d.k==='st'){var x=d.x,y=d.y;g.fillStyle='rgba(0,0,0,.2)';g.fillRect(x-24,y-12,52,32);
      g.fillStyle='#e9dcc0';g.fillRect(x-26,y-8,50,22);g.fillStyle='#cfbf9c';g.fillRect(x-26,y+10,50,4);
      g.fillStyle='#c4573f';g.beginPath();g.moveTo(x-30,y-6);g.lineTo(x-20,y-20);g.lineTo(x+18,y-20);g.lineTo(x+28,y-6);g.closePath();g.fill();
      g.fillStyle='#a8432f';g.fillRect(x-30,y-7,58,3);
      g.fillStyle='#6fb6d8';g.fillRect(x-19,y-2,8,8);g.fillRect(x+9,y-2,8,8);g.fillStyle='#7a4a2a';g.fillRect(x-4,y-2,7,12);
      g.fillStyle='#fff';g.font='8px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText('STATION',x-1,y-11)}})}

  function edgeList(){var out=[];L.slots.forEach(function(s){s.nb.forEach(function(n){if(n>s.i)out.push([s.i,n])})});return out}
  function drawTrack(g,t){var E=edgeList(),i;
    function inactive(a,b){var A=L.slots[a],B=L.slots[b];if(A.jn&&(b===A.jn.a||b===A.jn.b)&&st.pts[a]!==b)return 1;
      if(B.jn&&(a===B.jn.a||a===B.jn.b)&&st.pts[b]!==a)return 2;return 0}
    /* 도로(건널목) */
    if(L.X>=0){var X=P(L.X);g.fillStyle='rgba(0,0,0,.12)';g.fillRect(X.x-9,YA-30,22,YB-YA+70);
      g.fillStyle='#8d8f93';g.fillRect(X.x-11,YA-30,22,YB-YA+70);g.strokeStyle='rgba(255,255,255,.7)';g.setLineDash([8,8]);g.lineWidth=1.5;
      g.beginPath();g.moveTo(X.x,YA-30);g.lineTo(X.x,YB+40);g.stroke();g.setLineDash([])}
    /* 자갈 */
    g.lineCap='round';
    E.forEach(function(e){var a=P(e[0]),b=P(e[1]);g.strokeStyle='rgba(0,0,0,.14)';g.lineWidth=17;g.beginPath();g.moveTo(a.x+2,a.y+3);g.lineTo(b.x+2,b.y+3);g.stroke()});
    E.forEach(function(e){var a=P(e[0]),b=P(e[1]);g.strokeStyle='#b9ab93';g.lineWidth=15;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke()});
    L.slots.forEach(function(s){if(s.nb.length===1){var a=P(s.i),b=P(s.nb[0]),dx=a.x-b.x,dy=a.y-b.y,m=Math.hypot(dx,dy);
      var ext=s.i===L.E?40:12;g.strokeStyle='#b9ab93';g.lineWidth=15;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(a.x+dx/m*ext,a.y+dy/m*ext);g.stroke()}});
    /* 침목 + 레일 */
    function rails(ax,ay,bx,by,alpha,cut){var dx=bx-ax,dy=by-ay,m=Math.hypot(dx,dy),ux=dx/m,uy=dy/m,nx=-uy,ny=ux,s0=cut?m*.42:0;
      g.strokeStyle='rgba(110,72,40,'+alpha+')';g.lineWidth=3;
      for(var q=s0+3;q<m;q+=7.5){var cx=ax+ux*q,cy=ay+uy*q;g.beginPath();g.moveTo(cx-nx*7,cy-ny*7);g.lineTo(cx+nx*7,cy+ny*7);g.stroke()}
      g.strokeStyle='rgba(120,124,132,'+alpha+')';g.lineWidth=2;
      for(var sd=-1;sd<=1;sd+=2){g.beginPath();g.moveTo(ax+ux*s0+nx*4*sd,ay+uy*s0+ny*4*sd);g.lineTo(bx+nx*4*sd,by+ny*4*sd);g.stroke()}
      g.strokeStyle='rgba(235,240,245,'+alpha*.7+')';g.lineWidth=.8;
      for(sd=-1;sd<=1;sd+=2){g.beginPath();g.moveTo(ax+ux*s0+nx*4*sd,ay+uy*s0+ny*4*sd-.6);g.lineTo(bx+nx*4*sd,by+ny*4*sd-.6);g.stroke()}}
    E.forEach(function(e){var ia=inactive(e[0],e[1]);if(!ia)return;var a=P(e[0]),b=P(e[1]);if(ia===1)rails(b.x,b.y,a.x,a.y,.55,true);else rails(a.x,a.y,b.x,b.y,.55,true)});
    E.forEach(function(e){if(inactive(e[0],e[1]))return;var a=P(e[0]),b=P(e[1]);rails(a.x,a.y,b.x,b.y,1,false)});
    L.slots.forEach(function(s){if(s.nb.length===1){var a=P(s.i),b=P(s.nb[0]),dx=a.x-b.x,dy=a.y-b.y,m=Math.hypot(dx,dy);
      if(s.i===L.E){rails(a.x,a.y,a.x+dx/m*40,a.y+dy/m*40,1,false);return}
      rails(a.x,a.y,a.x+dx/m*9,a.y+dy/m*9,1,false);
      /* 차막이 */
      var bx=a.x+dx/m*13,by=a.y+dy/m*13,an=Math.atan2(dy,dx);g.save();g.translate(bx,by);g.rotate(an);
      g.fillStyle='rgba(0,0,0,.2)';g.fillRect(-1,-7,7,16);g.fillStyle='#7a4f2c';g.fillRect(-3,-8,6,16);
      g.fillStyle='#e04b3c';g.fillRect(-4,-6,3,12);g.fillStyle='#fff';g.fillRect(-4,-1.5,3,3);g.restore()}});
    /* 건널목 판자 */
    if(L.X>=0){var X2=P(L.X);g.fillStyle='rgba(90,90,96,.9)';g.fillRect(X2.x-11,X2.y-8,22,16);
      g.fillStyle='#e8e2d0';for(i=-1;i<=1;i+=2){g.fillRect(X2.x-11,X2.y+i*5-1,22,2)}}
    /* 출구 터널 */
    var e0=P(L.E);g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(e0.x-14,e0.y+3,10,20,0,0,7);g.fill();
    g.fillStyle='#8a8f86';g.beginPath();g.moveTo(e0.x-30,e0.y-22);g.lineTo(e0.x-14,e0.y-22);g.quadraticCurveTo(e0.x-6,e0.y,e0.x-14,e0.y+22);g.lineTo(e0.x-30,e0.y+22);g.closePath();g.fill();
    g.fillStyle='#2c2f33';g.beginPath();g.ellipse(e0.x-16,e0.y,6,13,0,0,7);g.fill();
    g.fillStyle='#6a7066';for(i=0;i<4;i++)g.fillRect(e0.x-28,e0.y-20+i*11,10,1.5);
    /* 신호기 */
    var sx=e0.x+6,sy=e0.y-20,ok=yardDone;g.fillStyle='#444';g.fillRect(sx-1,sy,2,10);g.fillStyle='#222';g.beginPath();g.arc(sx,sy,4.5,0,7);g.fill();
    g.fillStyle=ok?'#5dff7a':'#ff4a3a';g.beginPath();g.arc(sx,sy,3,0,7);g.fill();
    g.fillStyle=ok?'rgba(93,255,122,.3)':'rgba(255,74,58,.25)';g.beginPath();g.arc(sx,sy,6+Math.sin(t*4),0,7);g.fill()}

  function drawSidingInfo(g){var ko=true;
    L.ends.forEach(function(e){var s=L.slots[e.s],a=P(e.s),b=P(s.nb[0]),dx=a.x-b.x,dy=a.y-b.y,m=Math.hypot(dx,dy);
      var x=a.x+dx/m*26,y=a.y+dy/m*26;if(x>W-14){x=a.x;y=a.y-17}
      g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.arc(x+1,y+2,8,0,7);g.fill();
      g.fillStyle='#fffaf0';g.strokeStyle='#6f4826';g.lineWidth=1.5;g.beginPath();g.arc(x,y,8,0,7);g.fill();g.stroke();
      g.fillStyle='#6f4826';g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(e.cap,x,y+4)});
    /* 두고 갈 선로 */
    var seen={};L.drops.forEach(function(dd){if(seen[dd.name])return;seen[dd.name]=1;
      dd.set.forEach(function(si){var p=P(si);g.fillStyle='rgba(255,240,120,.28)';g.beginPath();g.arc(p.x,p.y,14,0,7);g.fill()});
      var p0=P(dd.set[0]);var lab=dd.name.toUpperCase();g.fillStyle='#ffe066';g.strokeStyle='#8a6a10';g.lineWidth=1.5;
      g.beginPath();g.arc(p0.x,p0.y-20,8,0,7);g.fill();g.stroke();g.fillStyle='#5a4300';g.font='11px Jua, system-ui, sans-serif';g.textAlign='center';g.fillText(lab,p0.x,p0.y-16)})}

  function drawLevers(g,t){junctions().forEach(function(s){var S=L.slots[s],p=P(s);
    if(S.tt)return;
    var lp=leverPos(s),toB=st.pts[s]===S.jn.b,occ=!!st.occ[s],sel2=kbOn&&pSel===s;
    if(sel2){g.strokeStyle='rgba(255,255,255,'+(.6+.3*Math.sin(t*6))+')';g.lineWidth=2;g.beginPath();g.arc(lp.x,lp.y,11,0,7);g.stroke()}
    g.fillStyle='rgba(0,0,0,.2)';g.fillRect(lp.x-6,lp.y-3,14,9);g.fillStyle='#5b5f66';g.fillRect(lp.x-7,lp.y-4,14,8);
    var tilt=toB?.7:-.7;if(L.slots[S.jn.t].c>S.c)tilt=-tilt;
    g.save();g.translate(lp.x,lp.y);g.rotate(tilt);g.strokeStyle='#2e2e2e';g.lineWidth=2.4;g.beginPath();g.moveTo(0,0);g.lineTo(0,-11);g.stroke();
    g.fillStyle=toB?'#ffcf3d':'#ffffff';g.beginPath();g.arc(0,-11,3.2,0,7);g.fill();g.restore();
    /* 경로 화살표 */
    var to=P(st.pts[s]),dx=to.x-p.x,dy=to.y-p.y,m=Math.hypot(dx,dy);g.save();g.globalAlpha=occ?.3:.9;g.translate(p.x+dx/m*12,p.y+dy/m*12);g.rotate(Math.atan2(dy,dx));
    g.fillStyle='#ffe066';g.beginPath();g.moveTo(5,0);g.lineTo(-3,-4);g.lineTo(-3,4);g.closePath();g.fill();g.restore()})}

  function drawTT(g,t){L.slots.forEach(function(s){if(!s.tt)return;var p=P(s.i);
    g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.arc(p.x+2,p.y+3,21,0,7);g.fill();
    g.fillStyle='#7b6a55';g.beginPath();g.arc(p.x,p.y,21,0,7);g.fill();g.fillStyle='#5d4f3f';g.beginPath();g.arc(p.x,p.y,18,0,7);g.fill();
    var an=restAng(s.nb[0]);var lp=anim&&!anim.dep?locoPose():null;if(lp&&Math.hypot(lp.x-p.x,lp.y-p.y)<4)an=lp.an;
    g.save();g.translate(p.x,p.y);g.rotate(an);g.fillStyle='#a08a6c';g.fillRect(-19,-6,38,12);
    g.strokeStyle='#7f848b';g.lineWidth=2;g.beginPath();g.moveTo(-19,-4);g.lineTo(19,-4);g.moveTo(-19,4);g.lineTo(19,4);g.stroke();g.restore();
    g.fillStyle='#c9b07a';g.beginPath();g.arc(p.x,p.y,2.5,0,7);g.fill()})}

  function drawMarkers(g,t,a){if(!sel||mode!=='play')return;
    var hi=-1;if(kbOn)hi=kSel;else if(hover){var bd=19;opts.forEach(function(o,i){var dd=d2(hover,P(o.head));if(dd<bd){bd=dd;hi=i}})}
    if(hi>=0&&opts[hi]){var o=opts[hi];g.save();g.globalAlpha=.45;g.strokeStyle='#fff7a0';g.lineWidth=3;g.setLineDash([3,6]);g.lineDashOffset=-t*20;
      var F=o.chain.concat(o.path).map(P);g.beginPath();g.moveTo(F[o.chain.length-1].x,F[o.chain.length-1].y);for(var i=o.chain.length;i<F.length;i++)g.lineTo(F[i].x,F[i].y);g.stroke();g.setLineDash([]);
      o.end.forEach(function(s){var p=P(s);g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(p.x,p.y,9,0,7);g.fill()});g.restore()}
    opts.forEach(function(o,i){var p=P(o.head),pu=1+Math.sin(t*5+i)*.12,big=i===hi;
      var gr=g.createRadialGradient(p.x,p.y,2,p.x,p.y,18*pu);gr.addColorStop(0,'rgba(255,250,170,.9)');gr.addColorStop(1,'rgba(255,240,120,0)');
      g.fillStyle=gr;g.beginPath();g.arc(p.x,p.y,18*pu,0,7);g.fill();
      g.strokeStyle=big?'#ffffff':'#fff2a0';g.lineWidth=big?3:2;g.beginPath();g.arc(p.x,p.y,(big?10:8)*pu,0,7);g.stroke();
      g.fillStyle=o.type==='wagon'?'#ffb020':'#ffffff';g.beginPath();g.arc(p.x,p.y,2.6,0,7);g.fill()})}

  function wagonBody(g,v,x,y,an,alpha){var V=L.veh[v],col=WCOL[V.id]||'#888';g.save();g.globalAlpha=alpha==null?1:alpha;
    g.fillStyle='rgba(0,0,0,.2)';g.save();g.translate(x+3,y+5);g.rotate(an);g.fillRect(-14,-8,28,16);g.restore();
    g.save();g.translate(x,y+3);g.rotate(an);g.fillStyle='#2b2b30';g.fillRect(-12,-8,5,16);g.fillRect(7,-8,5,16);g.restore();
    g.translate(x,y);g.rotate(an);
    var top=col,side=shade(col,-.3);
    if(V.type==='tank'){top='#cfd5dc';side='#8d969f'}else if(V.type==='reefer'){top='#f4f9ff';side='#a9c3dc'}else if(V.type==='power'){top='#ffd23f';side='#b8901a'}
    g.fillStyle=side;rr(g,-13,-7,26,15,4);g.fill();
    g.fillStyle=top;rr(g,-13,-8.5,26,13.5,4);g.fill();
    if(V.type==='tank'){g.fillStyle='rgba(255,255,255,.55)';rr(g,-11,-7,22,4,2);g.fill();g.fillStyle=col;g.fillRect(-2,-8.5,4,13.5);
      g.fillStyle='#5a6068';g.beginPath();g.arc(0,-2,2.2,0,7);g.fill()}
    else if(V.type==='reefer'){g.fillStyle=col;g.fillRect(-13,-3,26,2.5)}
    else if(V.type==='power'){g.fillStyle='#2b2b30';for(var k=-10;k<12;k+=6)g.fillRect(k,-8.5,2.5,13.5)}
    else{g.fillStyle='rgba(255,255,255,.22)';g.fillRect(-11,-7,22,3);g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1;g.beginPath();g.moveTo(-4,-8);g.lineTo(-4,5);g.moveTo(4,-8);g.lineTo(4,5);g.stroke()}
    g.restore();
    /* 번호/표식은 똑바로 */
    g.save();g.globalAlpha=alpha==null?1:alpha;
    if(V.type==='tank'){g.fillStyle='#ff8a1a';g.save();g.translate(x+8,y-9);g.rotate(Math.PI/4);g.fillRect(-3,-3,6,6);g.restore()}
    if(V.type==='reefer'){g.strokeStyle='#4aa3e0';g.lineWidth=1.2;g.save();g.translate(x+8,y-9);for(var q=0;q<3;q++){g.rotate(Math.PI/3);g.beginPath();g.moveTo(-3.5,0);g.lineTo(3.5,0);g.stroke()}g.restore()}
    if(V.type==='power'){g.fillStyle='#ff5a3a';g.beginPath();g.moveTo(x+9,y-14);g.lineTo(x+5,y-8);g.lineTo(x+8,y-8);g.lineTo(x+6,y-3);g.lineTo(x+11,y-10);g.lineTo(x+8,y-10);g.closePath();g.fill()}
    g.font='13px Jua, system-ui, sans-serif';g.textAlign='center';g.lineWidth=3;g.strokeStyle='rgba(40,30,30,.75)';g.strokeText(V.id,x,y+2);
    g.fillStyle=V.type==='n'?'#fff':(V.type==='power'?'#fff':col);g.fillText(V.id,x,y+2);g.restore()}
  function shade(hex,k){var n=parseInt(hex.slice(1),16),r=n>>16,gg=n>>8&255,b=n&255;
    function f(c){return Math.max(0,Math.min(255,Math.round(k<0?c*(1+k):c+(255-c)*k)))}return 'rgb('+f(r)+','+f(gg)+','+f(b)+')'}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

  function locoBody(g,x,y,an,fv,t,selected){
    g.fillStyle='rgba(0,0,0,.22)';g.save();g.translate(x+3,y+5);g.rotate(an);g.fillRect(-15,-9,30,18);g.restore();
    if(selected&&mode==='play'){g.strokeStyle='rgba(255,255,200,'+(.5+.3*Math.sin(t*5))+')';g.lineWidth=2.5;g.beginPath();g.arc(x,y,20,0,7);g.stroke()}
    var f=(Math.cos(an)*fv.x+Math.sin(an)*fv.y)>=0?1:-1;
    g.save();g.translate(x,y+3);g.rotate(an);g.fillStyle='#1e2a24';g.fillRect(-13,-9,6,18);g.fillRect(6,-9,6,18);g.restore();
    g.save();g.translate(x,y);g.rotate(an);g.scale(f,1);
    g.fillStyle='#1d6b45';rr(g,-14,-8,28,16,4);g.fill();
    g.fillStyle='#2f9e64';rr(g,-14,-9.5,28,14.5,4);g.fill();
    g.fillStyle='#24774d';rr(g,-14,-9.5,11,14.5,3);g.fill();
    g.fillStyle='#e8c35a';g.fillRect(-3,-9.5,1.6,14.5);g.fillRect(4,-9.5,1.4,14.5);
    g.fillStyle='#ffd86b';rr(g,-12,-7,6,10,2);g.fill();
    g.fillStyle='#262626';g.beginPath();g.arc(8,-2.5,3.6,0,7);g.fill();g.fillStyle='#555';g.beginPath();g.arc(8,-2.5,2,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.25)';g.fillRect(-2,-8,14,2.5);
    g.restore();
    /* 얼굴: 앞쪽, 똑바로 */
    var fx=x+fv.x*12,fy=y+fv.y*12-2;
    g.fillStyle='#d9dde2';g.beginPath();g.arc(fx,fy,8,0,7);g.fill();g.strokeStyle='#8c949c';g.lineWidth=1.4;g.stroke();
    g.fillStyle='rgba(255,120,130,.5)';g.beginPath();g.arc(fx-5,fy+2.5,1.8,0,7);g.arc(fx+5,fy+2.5,1.8,0,7);g.fill();
    g.fillStyle='#2a2a2a';g.strokeStyle='#2a2a2a';g.lineWidth=1.4;
    if(face===1){g.fillStyle='#fff';g.beginPath();g.arc(fx-3,fy-1.5,2.6,0,7);g.arc(fx+3,fy-1.5,2.6,0,7);g.fill();
      g.fillStyle='#2a2a2a';g.beginPath();g.arc(fx-3,fy-1.5,1.1,0,7);g.arc(fx+3,fy-1.5,1.1,0,7);g.fill();g.beginPath();g.ellipse(fx,fy+4,1.6,2.2,0,0,7);g.fill()}
    else if(face===2){g.beginPath();g.arc(fx-3,fy-.5,1.8,3.4,6.0);g.stroke();g.beginPath();g.arc(fx+3,fy-.5,1.8,3.4,6.0);g.stroke();
      g.fillStyle='#c2413b';g.beginPath();g.arc(fx,fy+2.5,2.6,0,3.14);g.fill()}
    else{if(blinkT<0){g.beginPath();g.moveTo(fx-4.5,fy-1.5);g.lineTo(fx-1.5,fy-1.5);g.moveTo(fx+1.5,fy-1.5);g.lineTo(fx+4.5,fy-1.5);g.stroke()}
      else{g.beginPath();g.arc(fx-3,fy-1.5,1.5,0,7);g.arc(fx+3,fy-1.5,1.5,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(fx-3.4,fy-2,.5,0,7);g.arc(fx+2.6,fy-2,.5,0,7);g.fill()}
      g.beginPath();g.arc(fx,fy+2,2.2,.2,2.94);g.stroke()}}

  function drawVehicles(g,t){
    var moving={},A=anim,i;
    if(A){if(A.dep)A.gv.forEach(function(v){moving[v]=1});else A.o.gv.forEach(function(v){moving[v]=1})}
    var items=[];
    L.slots.forEach(function(s){var v=st.occ[s.i];if(!v||moving[v-1])return;var p=P(s.i),off={x:0,y:0};
      if(bumpA&&bumpA.g&&bumpA.g.indexOf(s.i)>=0){var k=Math.sin(Math.PI*Math.min(1,bumpA.t/.3))*6;off={x:bumpA.dir.x*k,y:bumpA.dir.y*k}}
      if(bumpA&&bumpA.v===v-1){off.y-=Math.sin(Math.PI*Math.min(1,bumpA.t/.3))*3}
      items.push({v:v-1,x:p.x+off.x,y:p.y+off.y,an:restAng(s.i),loco:v===1,fv:v===1?restFace(s.i):null})});
    if(A){var gv=A.dep?A.gv:A.o.gv;var lp=locoPose();
      gv.forEach(function(v,q){if(v===0){var f=A.fwd?1:-1;items.push({v:0,x:lp.x,y:lp.y,an:lp.an,loco:true,fv:{x:Math.cos(lp.an)*f,y:Math.sin(lp.an)*f}});return}
        var idx=q+(A.u||0);if(A.tti>=0&&idx>A.tti)idx=Math.max(A.tti,idx-1);
        var p=interp(A.F,idx);items.push({v:v,x:p.x,y:p.y,an:angAt(A.F,idx)})})}
    items.sort(function(p,q){return p.y-q.y});
    /* 연결고리 */
    if(mode==='play')couplings().forEach(function(c){var off=st.cpl[ckey(c.a,c.b)]===false,inB=res&&(res.S.sd[0].concat(res.S.sd[1],[res.S.s]).indexOf(c.sa)>=0);
      g.fillStyle=off?'#ff6b5a':'#3a3a3a';if(off){g.beginPath();g.arc(c.x-3,c.y,2.2,0,7);g.arc(c.x+3,c.y,2.2,0,7);g.fill()}
      else{g.fillRect(c.x-4,c.y-1.5,8,3)}
      if(inB&&sel){g.strokeStyle=off?'rgba(255,107,90,.9)':'rgba(255,255,255,.75)';g.lineWidth=1.5;g.beginPath();g.arc(c.x,c.y,6.5,0,7);g.stroke()}});
    items.forEach(function(it){if(it.loco)locoBody(g,it.x,it.y,it.an,it.fv,t,sel);else wagonBody(g,it.v,it.x,it.y,it.an)});
    if(mode==='play')couplings().forEach(function(c){var off=st.cpl[ckey(c.a,c.b)]===false;if(off){g.fillStyle='#ff6b5a';g.beginPath();g.arc(c.x,c.y-12,2,0,7);g.fill()}});
    if(kbOn&&mode==='play'){var S=res.S,blk=S.sd[0].slice().reverse().concat([S.s],S.sd[1]);if(blk.length>1){g.fillStyle='rgba(255,255,255,.8)';g.font='10px Jua, system-ui, sans-serif';g.textAlign='center';
      var p0=P(S.s);g.fillText('C',p0.x,p0.y+22)}}}

  function drawSteam(g){steam.forEach(function(s){var k=s.t/1.1;g.strokeStyle='rgba(255,255,255,'+(.75*(1-k))+')';g.lineWidth=2.2*(1-k)+.6;
    g.beginPath();g.ellipse(s.x,s.y,3+k*10,(3+k*10)*.7,0,0,7);g.stroke()})}
  function drawBus(g,t){if(L.X<0||!L.bus)return;var X=P(L.X);
    if(bus){var k=bus.t/2,y=YA-40+k*(YB-YA+90);g.save();g.translate(X.x,y);
      g.fillStyle='rgba(0,0,0,.2)';g.fillRect(-7,-14,18,32);g.fillStyle='#ffb21f';rr(g,-9,-16,18,32,4);g.fill();
      g.fillStyle='#bfe6ff';g.fillRect(-7,6,14,6);for(var i=0;i<3;i++)g.fillRect(-7,-12+i*6,14,4);g.restore()}
    var left=L.bus-(st.n%L.bus),warn=left===1;
    var bx=X.x+16,by=YB+14;g.fillStyle=warn?'#ff5a3a':'#ffb21f';rr(g,bx-2,by-9,40,18,6);g.fill();
    g.fillStyle='#fff';g.fillRect(bx+2,by-5,12,8);g.fillStyle='#bfe6ff';g.fillRect(bx+3,by-4,4,3);g.fillRect(bx+8,by-4,4,3);
    g.fillStyle='#fff';g.font='12px Jua, system-ui, sans-serif';g.textAlign='left';g.fillText(left,bx+19,by+4);
    if(warn){g.fillStyle='rgba(255,60,40,'+(.5+.5*Math.sin(t*10))+')';g.beginPath();g.arc(X.x-14,X.y-14,3.5,0,7);g.arc(X.x+14,X.y+14,3.5,0,7);g.fill()}}

  function drawCat(g,x,y,t){var mood=catMood,bob=mood===2?Math.abs(Math.sin(t*10))*4:Math.sin(t*2)*1;y-=bob;
    g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(x+2,y+40,22,6,0,0,7);g.fill();
    g.fillStyle='#2f4f86';rr(g,-0+x-16,y+10,32,28,10);g.fill();g.fillStyle='#ffd23f';g.beginPath();g.arc(x,y+20,2,0,7);g.arc(x,y+28,2,0,7);g.fill();
    g.fillStyle='#f3a64a';g.beginPath();g.moveTo(x-17,y-6);g.lineTo(x-14,y-26);g.lineTo(x-4,y-14);g.closePath();g.moveTo(x+17,y-6);g.lineTo(x+14,y-26);g.lineTo(x+4,y-14);g.closePath();g.fill();
    g.fillStyle='#ffc8c8';g.beginPath();g.moveTo(x-14,y-10);g.lineTo(x-13,y-21);g.lineTo(x-7,y-14);g.closePath();g.moveTo(x+14,y-10);g.lineTo(x+13,y-21);g.lineTo(x+7,y-14);g.closePath();g.fill();
    g.fillStyle='#f6b45c';g.beginPath();g.ellipse(x,y-2,19,16,0,0,7);g.fill();
    g.fillStyle='#e0913a';g.fillRect(x-2,y-17,4,6);g.fillRect(x-9,y-16,3,5);g.fillRect(x+6,y-16,3,5);
    /* 모자 */
    g.fillStyle='#2f4f86';rr(g,x-14,y-24,28,9,3);g.fill();g.fillStyle='#22396a';g.fillRect(x-16,y-16,32,3);g.fillStyle='#ffd23f';g.beginPath();g.arc(x,y-20,2.4,0,7);g.fill();
    g.fillStyle='#fff3e0';g.beginPath();g.ellipse(x,y+5,9,6,0,0,7);g.fill();
    g.strokeStyle='#3a2a20';g.fillStyle='#3a2a20';g.lineWidth=1.6;
    if(mood===-1){g.fillStyle='#fff';g.beginPath();g.arc(x-7,y-3,4,0,7);g.arc(x+7,y-3,4,0,7);g.fill();g.fillStyle='#3a2a20';g.beginPath();g.arc(x-7,y-3,1.6,0,7);g.arc(x+7,y-3,1.6,0,7);g.fill();
      g.beginPath();g.ellipse(x,y+6,2,2.6,0,0,7);g.fill()}
    else if(mood>0){g.beginPath();g.arc(x-7,y-2,3,3.4,6.0);g.stroke();g.beginPath();g.arc(x+7,y-2,3,3.4,6.0);g.stroke();
      g.fillStyle='#d9534f';g.beginPath();g.arc(x,y+5,3.4,0,3.14);g.fill()}
    else{if(blinkT<0&&blinkT>-.14){g.beginPath();g.moveTo(x-10,y-3);g.lineTo(x-4,y-3);g.moveTo(x+4,y-3);g.lineTo(x+10,y-3);g.stroke()}
      else{g.beginPath();g.ellipse(x-7,y-3,2.2,3,0,0,7);g.ellipse(x+7,y-3,2.2,3,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x-7.6,y-4,.8,0,7);g.arc(x+6.4,y-4,.8,0,7);g.fill()}
      g.beginPath();g.moveTo(x-3,y+4);g.quadraticCurveTo(x,y+7,x,y+4);g.quadraticCurveTo(x,y+7,x+3,y+4);g.stroke()}
    g.fillStyle='#ff9aa8';g.beginPath();g.moveTo(x-1.6,y+1);g.lineTo(x+1.6,y+1);g.lineTo(x,y+2.8);g.fill();
    g.strokeStyle='rgba(60,40,30,.5)';g.lineWidth=.8;g.beginPath();g.moveTo(x-10,y+3);g.lineTo(x-19,y+1);g.moveTo(x-10,y+5);g.lineTo(x-19,y+6);g.moveTo(x+10,y+3);g.lineTo(x+19,y+1);g.moveTo(x+10,y+5);g.lineTo(x+19,y+6);g.stroke();
    /* 팔(보드를 잡음) */
    var wave=mood===2?Math.sin(t*14)*.5:0;g.save();g.translate(x+13,y+16);g.rotate(-.9+wave);g.fillStyle='#2f4f86';rr(g,0,-4,18,8,4);g.fill();g.fillStyle='#f6b45c';g.beginPath();g.arc(18,0,4.5,0,7);g.fill();g.restore()}

  function drawBoard(g,a,t){var ko=a.lang==='ko',x0=78,y0=36,w=W-x0-10,h=104;
    g.fillStyle='rgba(0,0,0,.22)';rr(g,x0+3,y0+4,w,h,10);g.fill();
    g.fillStyle='#3b2a1e';rr(g,x0,y0,w,h,10);g.fill();g.fillStyle='#1f2a33';rr(g,x0+5,y0+5,w-10,h-10,7);g.fill();
    g.fillStyle='#ffcf5a';g.font='12px Jua, system-ui, sans-serif';g.textAlign='left';
    g.fillText((ko?'출발 열차 · 야드 ':'DEPARTURE · Yard ')+(lvN+1)+(lvN>=LEVELS.length?(ko?' (자동)':' (auto)'):''),x0+13,y0+21);
    /* 시간 */
    var tw=Math.ceil(time),low=time<10;g.textAlign='right';g.font=(low?17+Math.sin(t*12)*1.5:16)+'px Jua, system-ui, sans-serif';
    g.fillStyle=lastGain>0?'#8be28b':(low?'#ff6a5a':'#ffffff');g.fillText('⏱ '+tw,x0+w-12,y0+22);
    if(lastGain>0){g.font='11px Jua, system-ui, sans-serif';g.globalAlpha=Math.min(1,lastGain*2);g.fillText('+14',x0+w-12,y0+36);g.globalAlpha=1}
    /* 열차 칩 */
    var n=L.order.length,cw=30,sx=x0+16,cy=y0+50;
    miniLoco(g,sx+10,cy,st.rev);
    for(var i=0;i<n;i++){var v=L.order[i],V=L.veh[v],cx=sx+34+i*cw,col=WCOL[V.id];
      g.fillStyle='#555';g.fillRect(cx-16,cy-1,4,2);
      var top=V.type==='tank'?'#cfd5dc':V.type==='reefer'?'#f4f9ff':V.type==='power'?'#ffd23f':col;
      g.fillStyle=shade(V.type==='n'?col:'#999999',-.3);rr(g,cx-12,cy-8,24,17,3);g.fill();g.fillStyle=top;rr(g,cx-12,cy-10,24,16,3);g.fill();
      g.font='12px Jua, system-ui, sans-serif';g.textAlign='center';g.fillStyle=V.type==='n'||V.type==='power'?'#fff':col;
      g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=2.5;g.strokeText(V.id,cx,cy+2);g.fillText(V.id,cx,cy+2);
      if(i<checks){g.strokeStyle='#5dff7a';g.lineWidth=3;g.beginPath();g.moveTo(cx-5,cy-16);g.lineTo(cx-1,cy-12);g.lineTo(cx+6,cy-20);g.stroke()}}
    /* 줄 2: 운전/기준, 규칙 */
    g.textAlign='left';g.font='12px Jua, system-ui, sans-serif';g.fillStyle='#cfe3f0';
    g.fillText((ko?'운전 ':'Moves ')+st.n+(ko?' · 기준 ':' · Par ')+par+(streak>0?(ko?' · 연속 ':' · Streak ')+streak:''),x0+13,y0+88);
    var notes=[];
    L.drops.forEach(function(dd){notes.push({t:L.veh[dd.v].id+'→'+dd.name.toUpperCase(),c:'#ffe066'})});
    if(st.rev)notes.push({t:ko?'기관차 거꾸로':'loco reversed',c:'#ff9a7a'});
    g.textAlign='right';var nx=x0+w-12;notes.forEach(function(no){g.fillStyle=no.c;g.fillText(no.t,nx,y0+88);nx-=g.measureText(no.t).width+10})}
  function miniLoco(g,x,y,rev){g.fillStyle='#1d6b45';rr(g,x-12,y-8,24,17,4);g.fill();g.fillStyle='#2f9e64';rr(g,x-12,y-10,24,16,4);g.fill();
    var fx=rev?x+11:x-11;g.fillStyle='#d9dde2';g.beginPath();g.arc(fx,y-2,6,0,7);g.fill();g.fillStyle='#2a2a2a';g.beginPath();g.arc(fx-2,y-3,1,0,7);g.arc(fx+2,y-3,1,0,7);g.fill()}

  function drawUI(g,a,t){var ko=a.lang==='ko';
    /* 버튼 */
    [[34,'undo'],[86,'restart']].forEach(function(b){var x=b[0],y=H-34;g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.arc(x+2,y+3,19,0,7);g.fill();
      g.fillStyle='#fff6e2';g.beginPath();g.arc(x,y,19,0,7);g.fill();g.strokeStyle='#8a5a34';g.lineWidth=2.5;g.stroke();
      g.strokeStyle='#5a3a20';g.lineWidth=2.6;g.lineCap='round';g.beginPath();
      if(b[1]==='undo'){g.arc(x+1,y+1,7.5,Math.PI*1.1,Math.PI*2.3);g.stroke();g.beginPath();g.moveTo(x-9,y-6);g.lineTo(x-6,y+1);g.lineTo(x-1,y-4);g.stroke()}
      else{g.arc(x,y,7.5,-.3,Math.PI*1.6);g.stroke();g.beginPath();g.moveTo(x+8,y-9);g.lineTo(x+8,y-2);g.lineTo(x+1,y-3);g.stroke()}
      g.font='9px Jua, system-ui, sans-serif';g.fillStyle='#fff';g.textAlign='center';g.fillText(b[1]==='undo'?'Z':'R',x+14,y+18)});
    /* 안내 */
    var tip=L.def.tip,y=156;
    if(tip&&(lvN===0||tipT<7)){var tx=tip[a.lang];g.font='15px Jua, system-ui, sans-serif';var w=g.measureText(tx).width+26;
      g.globalAlpha=lvN===0?1:Math.min(1,(7-tipT)*1.5);
      g.fillStyle='rgba(255,250,235,.92)';rr(g,W/2-w/2,y-16,w,26,13);g.fill();g.strokeStyle='#8a5a34';g.lineWidth=1.5;g.stroke();
      g.fillStyle='#4a3020';g.textAlign='center';g.fillText(tx,W/2,y+2);g.globalAlpha=1}
    if(toast&&!(tip&&(lvN===0||tipT<7))){g.font='14px Jua, system-ui, sans-serif';var w2=g.measureText(toast.s).width+24;g.globalAlpha=Math.min(1,toast.t*2);
      g.fillStyle='rgba(60,30,30,.85)';rr(g,W/2-w2/2,y-15,w2,24,12);g.fill();g.fillStyle='#fff';g.textAlign='center';g.fillText(toast.s,W/2,y+2);g.globalAlpha=1}
    if(kbOn&&mode==='play'){g.font='11px Jua, system-ui, sans-serif';g.fillStyle='rgba(255,255,255,.9)';g.textAlign='center';
      g.fillText(ko?'Tab 고르기 · Space 출발 · C 연결 · P 레버(O 다음)':'Tab pick · Space go · C couple · P points (O next)',W/2+30,H-14)}}

  function draw(g,a,dt){dt=dt||0;var t=tG;
    drawBg(g,dt);
    if(!L)return;
    drawDeco(g,t);
    drawTrack(g,t);
    drawSidingInfo(g);
    drawTT(g,t);
    drawLevers(g,t);
    drawMarkers(g,t,a);
    drawVehicles(g,t);
    drawBus(g,t);
    drawSteam(g);
    /* 상단 */
    var gr=g.createLinearGradient(0,30,0,150);gr.addColorStop(0,'rgba(40,60,40,.35)');gr.addColorStop(1,'rgba(40,60,40,0)');g.fillStyle=gr;g.fillRect(0,30,W,120);
    drawBoard(g,a,t);
    drawCat(g,42,96,t);
    drawUI(g,a,t)}

  window.__sy={state:function(){return {lvN:lvN,mode:mode,n:st&&st.n,par:par,time:time,checks:checks,
      opts:(opts||[]).map(function(o){var p=P(o.head);return {x:p.x,y:p.y,d:o.d,steps:o.path.length,type:o.type,fin:o.fin.join(',')}}),
      cpl:couplings().map(function(c){return {x:c.x,y:c.y,a:c.a,b:c.b,off:st.cpl[ckey(c.a,c.b)]===false}}),
      js:junctions().map(function(s){var p=leverPos(s);return {s:s,x:p.x,y:p.y,set:st.pts[s]}}),
      loco:P(st.occ.indexOf(1)),occ:st.occ.join(','),key:keyOf(L,st)}},
    /* 자동 검증용: 다음 최적 조작(실제 화면 좌표) */
    plan:function(){var cur=solve(L,{occ:st.occ,rev:st.rev,n:st.n,pts:st.pts}).par;if(cur<=0)return null;
      function good(){for(var i=0;i<opts.length;i++){var o=opts[i];if(solved(L,o.fin,o.rev)&&cur===1)return o;
        var r=solve(L,{occ:o.fin,rev:o.rev,n:st.n+1,pts:o.pts});if(r.par===cur-1)return o}return null}
      var o=good();if(o){var p=P(o.head);return {kind:'opt',x:p.x,y:p.y}}
      var cs=couplings(),js=junctions(),i,k;
      for(i=0;i<cs.length;i++){k=ckey(cs[i].a,cs[i].b);var old=st.cpl[k];if(old===false)delete st.cpl[k];else st.cpl[k]=false;refresh();var ok=good();
        if(old===false)st.cpl[k]=false;else delete st.cpl[k];refresh();if(ok)return {kind:'cpl',x:cs[i].x,y:cs[i].y}}
      for(i=0;i<js.length;i++){var S=L.slots[js[i]];if(st.occ[js[i]])continue;var o2=st.pts[js[i]],o3=st.tt;
        if(S.jn)st.pts[js[i]]=o2===S.jn.a?S.jn.b:S.jn.a;else{var q=S.nb.indexOf(st.tt);st.tt=S.nb[(q+1)%S.nb.length]}refresh();var ok2=good();
        st.pts[js[i]]=o2;st.tt=o3;refresh();if(ok2){var lp=leverPos(js[i]);return {kind:'j',x:lp.x,y:lp.y}}}
      /* 레버 두 개를 함께 바꿔야 하는 경우 */
      for(i=0;i<js.length;i++)for(var j2=i+1;j2<js.length;j2++){var A1=L.slots[js[i]],A2=L.slots[js[j2]];if(!A1.jn||!A2.jn||st.occ[js[i]]||st.occ[js[j2]])continue;
        var p1=st.pts[js[i]],p2=st.pts[js[j2]];st.pts[js[i]]=p1===A1.jn.a?A1.jn.b:A1.jn.a;st.pts[js[j2]]=p2===A2.jn.a?A2.jn.b:A2.jn.a;refresh();var ok4=good();
        st.pts[js[i]]=p1;st.pts[js[j2]]=p2;refresh();if(ok4){var lq=leverPos(js[i]);return {kind:'j',x:lq.x,y:lq.y}}}
      /* 연결 두 군데를 함께 바꿔야 하는 경우 */
      for(i=0;i<cs.length;i++)for(var j=0;j<js.length;j++){k=ckey(cs[i].a,cs[i].b);var ol=st.cpl[k];if(ol===false)delete st.cpl[k];else st.cpl[k]=false;
        var S2=L.slots[js[j]],op=st.pts[js[j]];if(S2.jn&&!st.occ[js[j]])st.pts[js[j]]=op===S2.jn.a?S2.jn.b:S2.jn.a;refresh();var ok3=good();
        st.pts[js[j]]=op;if(ol===false)st.cpl[k]=false;else delete st.cpl[k];refresh();if(ok3)return {kind:'cpl',x:cs[i].x,y:cs[i].y}}
      return {kind:'none',cur:cur}},
    jump:function(n){load(n);prevChecks=checks},
    solveNow:function(){return solve(L,{occ:st.occ,rev:st.rev,n:st.n,pts:st.pts})},L:function(){return L},st:function(){return st}};

  SG.run({id:'shunting-yard',title:{ko:'꼬마 입환역',en:'Shunting Yard'},
    how:{ko:'기관차로 화차를 밀고 끌어 출발판 순서대로 열차를 짜요. 빛나는 곳을 누르면 달려가요!',en:'Push and pull wagons with the little loco to build the train on the departure board. Tap a glowing marker to drive!'},
    init:init,update:update,draw:draw});
})();
