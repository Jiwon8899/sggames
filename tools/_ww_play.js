const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),OUT=process.argv[2];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const pg=await b.newPage({viewport:{width:420,height:900}});const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await pg.goto(`http://localhost:${port}/games/web-weaver/?lang=${process.argv[3]||'ko'}`);
  await pg.click('#sg-btn');await pg.waitForTimeout(400);
  const box=await pg.locator('#stage canvas').boundingBox(),sx=box.width/360,sy=box.height/640;
  const P=(x,y)=>[box.x+x*sx,box.y+y*sy];
  const st=()=>pg.evaluate(()=>__ww.get());
  async function dragA(i,j){const s=await st();const [ax,ay]=P(...s.anchors[i]),[bx,by]=P(...s.anchors[j]);
    await pg.mouse.move(ax,ay);await pg.mouse.down();for(let k=1;k<=12;k++){await pg.mouse.move(ax+(bx-ax)*k/12,ay+(by-ay)*k/12);await pg.waitForTimeout(16)}await pg.mouse.up();await pg.waitForTimeout(250)}
  async function tapCatch(kind){const s=await st();const it=s.stuck.find(i=>!kind||i.k===kind);if(!it)return false;const [x,y]=P(it.x,it.y+4);await pg.mouse.click(x,y);return true}
  async function waitScene(n,ms,collectF){const t0=Date.now();while(Date.now()-t0<ms){const s=await st();if(s.sn>=n)return true;if(collectF)await tapCatch('f');await pg.waitForTimeout(300)}return false}
  const shot=async(name)=>pg.locator('#stage').screenshot({path:path.join(OUT,name)});
  const plans=[[[0,1]],[[0,1],[1,2],[0,2]],[[0,1],[1,2]],[[2,0],[2,1],[0,1],[0,3],[1,4],[3,4]]];
  await pg.waitForTimeout(600);await shot('s1-start.png');
  await dragA(0,1);await pg.waitForTimeout(2500);await shot('s1-web.png');
  console.log('scene1 cleared',await waitScene(1,20000),JSON.stringify(await st()));
  await pg.waitForTimeout(2300);
  for(const [i,j] of plans[1])await dragA(i,j);
  await pg.waitForTimeout(3500);await shot('s2-web.png');
  await tapCatch();await pg.waitForTimeout(500);await shot('s2-collect.png');
  console.log('scene2 cleared',await waitScene(2,25000),JSON.stringify(await st()));
  await pg.waitForTimeout(2300);
  for(const [i,j] of plans[2])await dragA(i,j);
  await pg.waitForTimeout(4200);await shot('s3-web.png');
  console.log('scene3 cleared',await waitScene(3,30000),JSON.stringify(await st()));
  await pg.waitForTimeout(2300);
  for(const [i,j] of plans[3])await dragA(i,j);
  let best=0;
  for(let k=0;k<40;k++){await pg.waitForTimeout(250);const s=await st();if(s.sn!==3)break;const nf=s.stuck.filter(i=>i.k==='f').length,nd=s.stuck.filter(i=>i.k==='d').length;
    if(nf>=1&&nd>=2&&s.mode==='play'&&s.count<s.quota&&nf+nd>best){best=nf+nd;await shot('s4-web.png');console.log('s4 shot',nf,nd)}}
  console.log('scene4 cleared',await waitScene(4,30000,true),JSON.stringify(await st()));
  console.log('errors',errs);await b.close();srv.close()})();
