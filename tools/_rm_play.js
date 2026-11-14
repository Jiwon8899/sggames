const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),OUT=process.argv[2];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await pg.goto(`http://localhost:${port}/games/rain-maker/?lang=${process.argv[3]||'ko'}`);
  await pg.click('#sg-btn');await pg.waitForTimeout(400);
  const box=await pg.locator('#stage canvas').boundingBox(),k=box.width/360;
  const P=(x,y)=>[box.x+x*k,box.y+y*k];
  const st=()=>pg.evaluate(()=>{const s=__rainMaker.sim();return {day:__rainMaker.day(),T:__rainMaker.time(),h:s.harvests,q:s.quota,
    clouds:s.clouds.map(c=>({id:c.id,x:c.x,y:c.y,m:c.m,rain:c.rain})),plots:s.plots.map(p=>({x:p.x,M:p.M,p:p.p,fl:p.flooded,k:p.kind}))}});
  async function drag(x0,y0,x1,y1,steps=18,hold=300){const a=P(x0,y0),c=P(x1,y1);await pg.mouse.move(a[0],a[1]);await pg.mouse.down();
    for(let i=1;i<=steps;i++){await pg.mouse.move(a[0]+(c[0]-a[0])*i/steps,a[1]+(c[1]-a[1])*i/steps);await pg.waitForTimeout(16)}
    await pg.waitForTimeout(hold);await pg.mouse.up()}
  const shot=async n=>pg.locator('#stage').screenshot({path:path.join(OUT,n+'.png')});
  // Day 1: drag the rain cloud over the field
  let s=await st();console.log('d1',JSON.stringify(s.clouds));
  await drag(s.clouds[0].x,s.clouds[0].y,205,150,20,700);
  await pg.waitForTimeout(1500);await shot('d1-rain');
  for(let i=0;i<30;i++){s=await st();if(s.day>0)break;
    // move away if soggy
    const c=s.clouds[0];if(c&&s.plots[0].M>.75&&Math.abs(c.x-205)<30)await drag(c.x,c.y,320,150);
    await pg.waitForTimeout(500)}
  s=await st();console.log('after d1',s.day,s.T.toFixed(1));
  await pg.waitForTimeout(1800);s=await st();console.log('d2',JSON.stringify(s.clouds));
  // Day 2: merge two small clouds, then water
  const [a1,a2]=s.clouds;await drag(a2.x,a2.y,a1.x,a1.y,24,500);await pg.waitForTimeout(400);
  s=await st();console.log('merged',JSON.stringify(s.clouds));
  const m=s.clouds.sort((p,q)=>q.m-p.m)[0];await drag(m.x,m.y,205,160,22,800);
  await pg.waitForTimeout(1800);await shot('d2-merged-rain');
  for(let i=0;i<40;i++){s=await st();if(s.day>1)break;const c=s.clouds.sort((p,q)=>q.m-p.m)[0];
    if(c&&s.plots[0].M>.75&&Math.abs(c.x-205)<30)await drag(c.x,c.y,320,150);
    else if(c&&c.rain&&s.plots[0].M<.4&&Math.abs(c.x-205)>20)await drag(c.x,c.y,205,150);
    await pg.waitForTimeout(500)}
  s=await st();console.log('after d2 day',s.day,'T',s.T.toFixed(1),'score',await pg.evaluate(()=>__sg.state().score));
  await pg.waitForTimeout(1800);
  // Day 3: drag big cloud over plot, screenshot, split by swipe down through it
  s=await st();const big=s.clouds[0];await drag(big.x,big.y,150,150,20,600);await pg.waitForTimeout(1200);await shot('d3-big');
  s=await st();const bc=s.clouds[0];
  {const a=P(bc.x,bc.y-60),c=P(bc.x,bc.y+70);await pg.mouse.move(a[0],a[1]);await pg.mouse.down();for(let i=1;i<=6;i++){await pg.mouse.move(a[0],a[1]+(c[1]-a[1])*i/6);await pg.waitForTimeout(16)}await pg.mouse.up()}
  await pg.waitForTimeout(300);s=await st();console.log('after split',JSON.stringify(s.clouds.map(c=>[c.x|0,+c.m.toFixed(2)])));
  await shot('d3-split');
  // keyboard: Tab select, arrows, shift dash
  await pg.keyboard.press('Tab');await pg.keyboard.down('ArrowRight');await pg.waitForTimeout(600);await pg.keyboard.up('ArrowRight');
  await pg.keyboard.down('Shift');await pg.keyboard.press('ArrowLeft');await pg.keyboard.up('Shift');await pg.waitForTimeout(700);
  s=await st();console.log('after kb',JSON.stringify(s.clouds.map(c=>[c.x|0,+c.m.toFixed(2)])));await shot('d3-kb');
  await pg.keyboard.press('Space');await pg.waitForTimeout(300);s=await st();console.log('after kb split',JSON.stringify(s.clouds.map(c=>[c.x|0,+c.m.toFixed(2)])));
  console.log('errors',errs);await b.close();srv.close()})();
