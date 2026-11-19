const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
const OUT=process.env.OUT||'/tmp',UPTO=+(process.env.UPTO||3);
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const pg=await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await pg.goto(`http://localhost:${port}/games/shunting-yard/?lang=${process.env.LANG2||'ko'}`);
  await pg.click('#sg-btn');await pg.waitForTimeout(400);
  const cv=await pg.locator('#stage canvas').boundingBox(),st=pg.locator('#stage');
  const S=()=>pg.evaluate(()=>__sy.state());
  const click=async(x,y)=>{await pg.mouse.click(cv.x+x/360*cv.width,cv.y+y/640*cv.height)};
  const shot=async n=>{await st.screenshot({path:OUT+'/'+n+'.png'})};
  if(process.env.SKIP)await pg.evaluate(n=>{},0);
  await shot('l1-start');
  for(let lv=0;lv<UPTO;lv++){
    let s=await S();if(s.lvN!==lv){console.log('expected lvl',lv,'got',s.lvN);break}
    console.log('level',lv+1,'par',s.par);let drives=0;
    for(let step=0;step<60;step++){
      s=await S();if(s.lvN!==lv)break;
      const r=await pg.evaluate(()=>__sy.plan());
      if(!r||r.kind==='none'){console.log('stuck',JSON.stringify(r));break}
      await click(r.x,r.y);
      if(r.kind==='opt'){drives++;
        if(process.env.MID&&+process.env.MID===lv+1&&drives===+(process.env.MIDN||2)){await pg.waitForTimeout(+(process.env.MIDT||330));await shot('mid-'+(lv+1))}}
      for(let w=0;w<60;w++){await pg.waitForTimeout(60);s=await S();if(s.mode==='play'||s.lvN!==lv)break}
      if(s.mode==='depart'){await pg.waitForTimeout(500);await shot('depart-'+(lv+1));}
    }
    for(let w=0;w<60;w++){s=await S();if(s.lvN!==lv&&s.mode==='play')break;await pg.waitForTimeout(100)}
    console.log(' -> drives',drives,'now level',s.lvN+1,'score',await pg.evaluate(()=>__sg.state().score));
    await shot('l'+(s.lvN+1)+'-start');
  }
  console.log('errors',errs);
  await b.close();srv.close();
})();
