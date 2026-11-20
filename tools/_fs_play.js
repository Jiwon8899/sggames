const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),OUT=process.argv[2];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
(async()=>{await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const lang=process.argv[3]||'ko';
  const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await pg.goto(`http://localhost:${port}/games/fair-slice/?lang=${lang}`);await pg.click('#sg-btn');await pg.waitForTimeout(600);
  const cv=pg.locator('canvas'),box=await cv.boundingBox(),k=box.width/360,st=pg.locator('#stage');
  const P=(x,y)=>[box.x+x*k,box.y+y*k];
  async function dragLine(c,shot){const FX=180,FY=310;const dx=c[2]-c[0],dy=c[3]-c[1],l=Math.hypot(dx,dy),ux=dx/l,uy=dy/l;
    const t=(FX-c[0])*ux+(FY-c[1])*uy,px=c[0]+ux*t,py=c[1]+uy*t,a=P(px-ux*150,py-uy*150),e=P(px+ux*150,py+uy*150);
    await pg.mouse.move(a[0],a[1]);await pg.mouse.down();
    for(let i=1;i<=20;i++){await pg.mouse.move(a[0]+(e[0]-a[0])*i/20,a[1]+(e[1]-a[1])*i/20);await pg.waitForTimeout(16);
      if(shot&&i===14){await pg.waitForTimeout(80);await st.screenshot({path:OUT+'/'+shot})}}
    await pg.mouse.up();await pg.waitForTimeout(500)}
  async function serve(){const s=P(176,597);await pg.mouse.click(s[0],s[1]);await pg.waitForTimeout(700)}
  for(let lv=0;lv<3;lv++){const sol=await pg.evaluate(()=>__fs.sol());
    for(let j=0;j<sol.length;j++)await dragLine(sol[j],j===sol.length-1?`drag${lv+1}.png`:null);
    await serve();await st.screenshot({path:OUT+`/judge${lv+1}.png`});await pg.waitForTimeout(1800);
    console.log('after level',lv+1,JSON.stringify(await pg.evaluate(()=>__fs.state())),'score',await pg.evaluate(()=>__sg.state().score))}
  // other levels for visuals: solve with sol and screenshot mid-drag
  for(const lv of (process.argv[4]||'3,5,8,9,11,12').split(',').map(Number)){await pg.evaluate(i=>__fs.go(i),lv);await pg.waitForTimeout(600);
    const sol=await pg.evaluate(()=>__fs.sol());for(let j=0;j<sol.length;j++)await dragLine(sol[j],j===sol.length-1?`drag${lv+1}.png`:null);
    await st.screenshot({path:OUT+`/cut${lv+1}.png`});await serve();await pg.waitForTimeout(300);await st.screenshot({path:OUT+`/judge${lv+1}.png`});await pg.waitForTimeout(1800);
    console.log('level',lv+1,JSON.stringify(await pg.evaluate(()=>__fs.state())))}
  // failure case: bad cut at a level
  await pg.evaluate(()=>__fs.go(4));await pg.waitForTimeout(600);await dragLine([0,310,360,310]);await serve();await pg.waitForTimeout(400);await st.screenshot({path:OUT+'/fail.png'});
  await pg.waitForTimeout(2000);console.log('fail state',JSON.stringify(await pg.evaluate(()=>__fs.state())));
  // keyboard
  await pg.evaluate(()=>__fs.go(0));await pg.waitForTimeout(500);await pg.keyboard.press('KeyQ');await pg.keyboard.down('ArrowUp');await pg.waitForTimeout(300);await pg.keyboard.up('ArrowUp');
  await pg.waitForTimeout(200);await st.screenshot({path:OUT+'/kb.png'});
  await pg.keyboard.press('Space');await pg.waitForTimeout(600);await pg.keyboard.press('KeyS');await pg.waitForTimeout(2600);
  console.log('kb state',JSON.stringify(await pg.evaluate(()=>__fs.state())));
  console.log('errors',errs);await b.close();srv.close()})();
