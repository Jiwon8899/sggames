const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');const OUT=process.argv[2]||'/tmp';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const pg=await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await pg.goto(`http://localhost:${port}/games/parcel-sort/?lang=${process.argv[3]||'ko'}`);
  await pg.click('#sg-btn');await pg.waitForTimeout(400);
  const box=await pg.locator('canvas').boundingBox();
  const P=(x,y)=>[box.x+x/360*box.width,box.y+y/640*box.height];
  async function tap(x,y){const [px,py]=P(x,y);await pg.mouse.move(px,py);await pg.mouse.down();await pg.waitForTimeout(70);await pg.mouse.up();await pg.waitForTimeout(120)}
  const cell=(r,c)=>tap(42+c*46+23,150+r*46+23),slot=i=>tap(6+i*51+24,566+30),run=()=>tap(308,577),small=()=>tap(287,616);
  const shot=async n=>{await pg.locator('#stage').screenshot({path:path.join(OUT,n+'.png')})};
  await shot('a0-edit');
  await cell(4,2);await shot('a1-placed');await run();await pg.waitForTimeout(900);await shot('a2-run');
  await pg.waitForTimeout(3500);console.log('after L1',await pg.evaluate(()=>__sg.state()));
  await cell(4,1);await shot('b0-placed');await run();
  for(let i=0;i<6;i++){await pg.waitForTimeout(600);await shot('b-run'+i)}
  await pg.waitForTimeout(2500);console.log('after L2',await pg.evaluate(()=>__sg.state()));
  await slot(1);await cell(5,3);await cell(5,2);await cell(5,1);await shot('c0-placed');await run();
  for(let i=0;i<8;i++){await pg.waitForTimeout(500);await shot('c-run'+i)}
  await pg.waitForTimeout(3000);console.log('after L3',await pg.evaluate(()=>__sg.state()));
  await shot('d0-L4');
  // L4: deliberately naive: red switch -> fail
  await slot(1);await cell(3,2);await run();await pg.waitForTimeout(3000);await shot('d1-jam');await pg.waitForTimeout(2500);await shot('d2-after');
  console.log('errors',errs);await b.close();srv.close();
})();
