#!/usr/bin/env node
/* 게임 검증: node tools/check.js <slug>
   모바일 화면으로 열어 콘솔 에러, 시작, 입력, 게임오버, 재시작을 확인하고 shots/<slug>.png 를 남긴다. */
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),slug=process.argv[2];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port,fail=[];
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  for(const lang of ['ko','en']){
    const pg=await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    pg.on('console',m=>{if(m.type()==='error')fail.push(lang+' console: '+m.text())});
    pg.on('pageerror',e=>fail.push(lang+' pageerror: '+e.message));
    const res=await pg.goto(`http://localhost:${port}/games/${slug}/?lang=${lang}`);
    if(!res.ok())fail.push('http '+res.status());
    if(await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))fail.push(lang+' 가로 스크롤 발생');
    await pg.click('#sg-btn');await pg.waitForTimeout(300);
    if(!(await pg.evaluate(()=>__sg.state().playing)))fail.push(lang+' 시작 안 됨');
    const box=await pg.locator('canvas').boundingBox();
    for(let i=0;i<8;i++){await pg.mouse.move(box.x+box.width*(i%2?.8:.2),box.y+box.height*.8);await pg.mouse.down();await pg.waitForTimeout(250);await pg.mouse.up()}
    if(lang==='ko'){fs.mkdirSync(path.join(ROOT,'shots'),{recursive:true});await pg.screenshot({path:path.join(ROOT,'shots',slug+'.png')})}
    let over=false;for(let i=0;i<120&&!over;i++){await pg.waitForTimeout(500);over=!(await pg.evaluate(()=>__sg.state().playing))}
    if(!over)fail.push(lang+' 60초 방치해도 게임오버 없음(난이도 확인)');
    else{await pg.click('#sg-btn');await pg.waitForTimeout(200);if(!(await pg.evaluate(()=>__sg.state().playing)))fail.push(lang+' 재시작 안 됨')}
    console.log(lang,'score',await pg.evaluate(()=>__sg.state().score));await pg.close();
  }
  await b.close();srv.close();
  if(fail.length){console.log('FAIL\n'+fail.join('\n'));process.exit(1)}console.log('PASS')
})();
