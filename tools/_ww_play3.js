const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),OUT=process.argv[2];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const pg=await b.newPage({viewport:{width:420,height:900}});const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(`http://localhost:${port}/games/web-weaver/?lang=en`);
  await pg.keyboard.press('Enter');await pg.waitForTimeout(500);
  const box=await pg.locator('#stage canvas').boundingBox(),sx=box.width/360,sy=box.height/640;
  const P=(x,y)=>[box.x+x*sx,box.y+y*sy];const st=()=>pg.evaluate(()=>__ww.get());
  const shot=async(name)=>pg.locator('#stage').screenshot({path:path.join(OUT,name)});
  async function curTo(i){for(let k=0;k<8;k++){const s=await st();const [tx,ty]=s.anchors[i],[cx,cy]=s.cur;if(Math.hypot(tx-cx,ty-cy)<1)return true;
      const dx=tx-cx,dy=ty-cy;await pg.keyboard.press(Math.abs(dx)>Math.abs(dy)?(dx>0?'ArrowRight':'ArrowLeft'):(dy>0?'ArrowDown':'ArrowUp'));await pg.waitForTimeout(60)}return false}
  async function kbSpin(i,j){await curTo(i);await pg.keyboard.press('Space');await pg.waitForTimeout(60);const ok=await curTo(j);await pg.keyboard.press('Space');await pg.waitForTimeout(150);return ok}
  async function dragA(i,j){const s=await st();const [ax,ay]=P(...s.anchors[i]),[bx,by]=P(...s.anchors[j]);
    await pg.mouse.move(ax,ay);await pg.mouse.down();for(let k=1;k<=10;k++){await pg.mouse.move(ax+(bx-ax)*k/10,ay+(by-ay)*k/10);await pg.waitForTimeout(16)}await pg.mouse.up();await pg.waitForTimeout(200)}
  const shots={};
  async function playScene(n,useKb){const s0=await st();
    for(const [i,j] of s0.plan){if(useKb)console.log(' kb spin',i,j,await kbSpin(i,j));else await dragA(i,j)}
    const t0=Date.now();
    while(Date.now()-t0<40000){const s=await st();if(s.sn>n||s.mode==='clear')break;
      const nf=s.stuck.filter(i=>i.k==='f').length,nd=s.stuck.filter(i=>i.k==='d').length;
      if(n===6&&nd>=5&&!shots.rain){shots.rain=1;await shot('rain.png')}
      if(n===7&&nf>=2&&!shots.night){shots.night=1;await shot('night.png')}
      if(s.bird&&!shots.bird){shots.bird=1;await shot('bird.png')}
      if(Math.abs(s.gust)>500&&!shots.wind){shots.wind=1;await shot('wind.png')}
      if(useKb){if(s.stuck.length)await pg.keyboard.press('KeyC')}
      else{const it=s.stuck.find(i=>i.k==='f');if(it){const [x,y]=P(it.x,it.y+4);await pg.mouse.click(x,y)}
        else if(nd>=4){const d=s.stuck.find(i=>i.k==='d');const [x,y]=P(d.x,d.y+4);await pg.mouse.click(x,y)}}
      await pg.waitForTimeout(350)}
    const s=await st();console.log('scene',n+1,'mode',s.mode,'sn',s.sn,'count',s.count,'/',s.quota,'time',s.time.toFixed(1));
    await pg.waitForTimeout(2400)}
  for(let n=0;n<3;n++)await playScene(n,n<2);
  { const s0=await st();for(const [i,j] of s0.plan)await dragA(i,j);let t0=Date.now(),birdShots=0;
    while(Date.now()-t0<30000){const s=await st();if(s.mode!=='play')break;if(s.bird&&birdShots<3){await pg.waitForTimeout(birdShots?250:300);await shot('bird'+birdShots+'.png');birdShots++}await pg.waitForTimeout(100)}
    console.log('scene4 bird shots',birdShots);await pg.waitForTimeout(2500)}
  { await dragA(0,1);let t0=Date.now(),ws=0,tore=false;
    while(Date.now()-t0<14000){const s=await st();if(Math.abs(s.gust)>300&&ws<2){await shot('wind'+ws+'.png');ws++}if(s.strands===0&&ws)tore=true;await pg.waitForTimeout(150)}
    console.log('scene5 long strand in gust torn:',tore)}
  const s=await st();console.log('final sn',s.sn,'playing',await pg.evaluate(()=>__sg.state()));await shot('gen.png');
  console.log('errors',errs);await b.close();srv.close()})();
