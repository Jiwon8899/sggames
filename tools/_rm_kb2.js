const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const pg=await b.newPage({viewport:{width:1280,height:900}});
  await pg.goto(`http://localhost:${port}/games/rain-maker/?lang=en`);
  await pg.keyboard.press('Enter');await pg.waitForTimeout(300);
  const st=()=>pg.evaluate(()=>{const s=__rainMaker.sim();return {day:__rainMaker.day(),h:s.harvests,sel:__rainMaker.sel(),c:s.clouds.map(c=>({id:c.id,x:c.x,m:c.m,rain:c.rain})),p:s.plots.map(p=>p.M)}});
  async function moveTo(tx){for(let i=0;i<40;i++){const s=await st();const big=s.c.find(c=>c.id===s.sel);if(!big)return;const dx=tx-big.x;if(Math.abs(dx)<10)return;
    const k=dx<0?'ArrowLeft':'ArrowRight';await pg.keyboard.down(k);await pg.waitForTimeout(Math.min(250,Math.abs(dx)*2));await pg.keyboard.up(k);await pg.waitForTimeout(150)}}
  // day 1 keyboard: selected cloud is the only one
  await moveTo(205);
  for(let i=0;i<40;i++){const s=await st();if(s.day>0)break;if(s.p[0]>.75)await moveTo(320);await pg.waitForTimeout(400)}
  console.log('after day1 kb: day',(await st()).day);
  await pg.waitForTimeout(1800);
  // day 2: Tab to the right cloud, shift+left to dash-merge
  let s=await st();console.log('d2 clouds',JSON.stringify(s.c.map(c=>[c.x|0,c.m.toFixed(2)])));
  await pg.keyboard.press('Tab');
  await pg.keyboard.down('Shift');await pg.keyboard.press('ArrowLeft');await pg.keyboard.up('Shift');await pg.waitForTimeout(900);
  s=await st();console.log('after dash',JSON.stringify(s.c.map(c=>[c.x|0,c.m.toFixed(2),c.rain])));
  // select the merged cloud (biggest) via Tab until selected? just move biggest; selection follows merged cloud
  await moveTo(205);
  for(let i=0;i<50;i++){s=await st();if(i%3==0)console.log(JSON.stringify(s));if(s.day>1)break;if(s.p[0]>.75)await moveTo(320);await pg.waitForTimeout(400)}
  s=await st();console.log(JSON.stringify(s));console.log('after day2 kb: day',(await st()).day,'score',await pg.evaluate(()=>__sg.state().score));
  await b.close();srv.close()})();
