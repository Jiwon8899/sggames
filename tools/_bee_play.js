const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),C=require('../games/bee-dance/game.js');
const SH='/tmp/claude-0/-home-claude/ec119f13-e376-5819-bb6a-b3f278d40fed/scratchpad/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(`http://localhost:${port}/games/bee-dance/?lang=ko`);await pg.click('#sg-btn');
  const box=await pg.locator('canvas').boundingBox(),k=box.width/360,X=x=>box.x+x*k,Y=y=>box.y+y*k;
  const st=()=>pg.evaluate(()=>__beeDance());
  async function waitDance(){for(let i=0;i<200;i++){const q=await st();if(q.phase==='dance')return q;await pg.waitForTimeout(50)}}
  async function dragDance(n,shot,bad){const q=await waitDance();const L=C.makeLevel(n),i=C.bestPatch(L),p=L.patches[i];
    const th=bad?0:C.n180(p.b-(q.sun+0.5*(L.sunW))),len=p.d;  // +0.5s of sun motion during the drag
    const sx=180,sy=505,ex=sx+Math.sin(th*Math.PI/180)*len,ey=sy-Math.cos(th*Math.PI/180)*len;
    await pg.mouse.move(X(sx),Y(sy));await pg.mouse.down();
    for(let s=1;s<=10;s++){await pg.mouse.move(X(sx+(ex-sx)*s/10),Y(sy+(ey-sy)*s/10));await pg.waitForTimeout(35)}
    if(shot){await pg.waitForTimeout(120);await pg.locator('#stage').screenshot({path:shot})}
    await pg.mouse.up()}
  async function solve(n,shot){for(let k=0;k<4;k++){await dragDance(n,k===0?shot:null);await pg.waitForTimeout(200);
      for(let i=0;i<200;i++){const q=await st();if(q.n!==n||q.phase==='dance')break;await pg.waitForTimeout(50)}
      if((await st()).n!==n)return true}return false}
  await waitDance();await pg.locator('#stage').screenshot({path:SH+'l1-start.png'});
  console.log('L1',await solve(0,SH+'l1-mid.png'),await pg.evaluate(()=>__sg.state().score));
  await dragDance(1,null,true);await pg.waitForTimeout(1500);await waitDance();await pg.locator('#stage').screenshot({path:SH+'l2-miss.png'});
  console.log('L2',await solve(1,SH+'l2-mid.png'),await pg.evaluate(()=>__sg.state().score));
  console.log('L3',await solve(2,SH+'l3-mid.png'),await pg.evaluate(()=>__sg.state().score));
  console.log('before L4',await st());await waitDance();console.log('L4 dance',await st());await pg.waitForTimeout(400);await pg.locator('#stage').screenshot({path:SH+'l4-start.png'});
  console.log('L4',await solve(3,SH+'l4-mid.png'),await pg.evaluate(()=>__sg.state().score));
  console.log('state',await st(),'playing',await pg.evaluate(()=>__sg.state().playing),'errors',errs);
  // keyboard run
  const p2=await b.newPage({viewport:{width:390,height:844}});await p2.goto(`http://localhost:${port}/games/bee-dance/?lang=en`);
  await p2.keyboard.press('Enter');await p2.waitForTimeout(1900);await p2.mouse.move(0,0);
  await p2.keyboard.press('ArrowLeft');await p2.keyboard.press('ArrowRight');await p2.locator('#stage').screenshot({path:SH+'kb-l1.png'});
  await p2.keyboard.press('Space');await p2.waitForTimeout(4400);console.log('kb after L1',await p2.evaluate(()=>__sg.state().score));
  for(let i=0;i<100;i++){if((await p2.evaluate(()=>__beeDance().phase))==='dance')break;await p2.waitForTimeout(50)}
  for(let i=0;i<12;i++)await p2.keyboard.press('ArrowRight');await p2.keyboard.press('ArrowUp');
  await p2.locator('#stage').screenshot({path:SH+'kb-l2.png'});await p2.keyboard.press('Space');await p2.waitForTimeout(250);await p2.locator('#stage').screenshot({path:SH+'kb-dance.png'});await p2.waitForTimeout(3000);
  console.log('kb after L2',await p2.evaluate(()=>__sg.state().score));
  await b.close();srv.close()})();
