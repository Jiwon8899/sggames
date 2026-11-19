const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
const OUT=process.env.OUT;
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const pg=await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(`http://localhost:${port}/games/shunting-yard/?lang=${process.env.LANG2||'en'}`);
  await pg.click('#sg-btn');await pg.waitForTimeout(300);
  for(const n of (process.env.LV||'5,8,10,11,12,13,20').split(',').map(Number)){
    await pg.evaluate(n=>__sy.jump(n-1),n);await pg.waitForTimeout(400);
    await pg.locator('#stage').screenshot({path:OUT+'/j'+n+'.png'});
    console.log(n,JSON.stringify(await pg.evaluate(()=>{const s=__sy.state();return {par:s.par,opts:s.opts.length}})));
  }
  console.log('errors',errs);await b.close();srv.close();
})();
