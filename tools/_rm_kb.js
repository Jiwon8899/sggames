const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const pg=await b.newPage({viewport:{width:390,height:844}});
  await pg.goto(`http://localhost:${port}/games/rain-maker/?lang=en`);
  await pg.keyboard.press('Enter');await pg.waitForTimeout(400);
  const st=()=>pg.evaluate(()=>JSON.stringify(__rainMaker.sim().clouds.map(c=>[c.id,c.x|0,+c.m.toFixed(2)])));
  console.log(await st());
  await pg.keyboard.down('ArrowLeft');await pg.waitForTimeout(800);await pg.keyboard.up('ArrowLeft');console.log('left',await st());
  await pg.keyboard.press('Space');await pg.waitForTimeout(200);console.log('space',await st());
  await pg.keyboard.press('Tab');await pg.waitForTimeout(1200);
  await pg.keyboard.down('Shift');await pg.keyboard.press('ArrowRight');await pg.keyboard.up('Shift');await pg.waitForTimeout(800);console.log('dash',await st());
  await pg.waitForTimeout(500);await pg.locator('#stage').screenshot({path:process.argv[2]});
  await b.close();srv.close()})();
