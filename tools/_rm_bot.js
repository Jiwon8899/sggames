const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),OUT=process.argv[2],DAY=+process.argv[3],WAIT=+process.argv[4]||8000,LANG=process.argv[5]||'ko';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(`http://localhost:${port}/games/rain-maker/?lang=${LANG}`);
  await pg.click('#sg-btn');await pg.waitForTimeout(200);
  let src=fs.readFileSync('/tmp/claude-0/-home-claude/ec119f13-e376-5819-bb6a-b3f278d40fed/scratchpad/rain-maker/bot.js','utf8');
  src=src.replace("const R=require('/home/claude/sggames/games/rain-maker/game.js');","const R=window.__rainMaker.api;").replace(/module\.exports[\s\S]*$/,'');
  await pg.evaluate(`(function(){${src};window.__botPol=botPolicy();})()`);
  await pg.evaluate(d=>{if(d>=0)__rainMaker.load(d);let last=performance.now();(function f(t){const dt=Math.min(.05,(t-last)/1000);last=t;const s=__rainMaker.sim();if(s)__botPol(s,dt);requestAnimationFrame(f)})(last)},DAY);
  await pg.waitForTimeout(WAIT);await pg.locator('#stage').screenshot({path:OUT});
  console.log('day',await pg.evaluate(()=>__rainMaker.day()),'errs',errs);await b.close();srv.close()})();
