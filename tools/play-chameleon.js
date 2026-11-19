const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');const OUT=process.argv[2]||'/tmp';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const pg=await b.newPage({viewport:{width:420,height:900}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await pg.goto(`http://localhost:${port}/games/chameleon/?lang=${process.argv[3]||'ko'}`);
  await pg.click('#sg-btn');await pg.waitForTimeout(200);
  const SK=+(process.argv[4]||0);if(SK)await pg.evaluate(k=>{const st=__cham.st(),C=__cham.core;st.n=k;st.stage=C.getStage(k);st.t=0;st.wi=0;st.s=0;st.prev=null;st.time=70;st.bugs=st.stage.bugs.map(b=>({x:b.x,h:b.h,alive:true}))},SK);
  const box=await pg.locator('canvas').boundingBox();const P=(x,y)=>[box.x+x/360*box.width,box.y+y/640*box.height];
  const SWX=i=>34+i*56;let held=false,heldMode=null,shot=0,shotOpen=false,t0=Date.now(),log=[];
  const stage=await pg.locator('#stage');
  while(Date.now()-t0<75000){
    const info=await pg.evaluate(()=>{const C=__cham.core,st=__cham.st();const c=C.bot(st,.05);const ph=C.phaseOf(st);const L=C.under(st);
      return {sp:st.spots,s:st.s|0,fr:st.frozen,sk:''+st.skin.c+st.skin.p,un:''+L.c+L.p,wash:st.wash,c,ph:ph.ph,n:st.n,mm:C.mismatch(st),p:L.p,hearts:st.hearts,over:st.over,t:st.t,score:st.score,time:st.time}});
    if(info.sp!==globalThis.lastSp){if(globalThis.lastSp!=null)log.push('SPOT '+JSON.stringify(info));globalThis.lastSp=info.sp}
    if(info.over||!(await pg.evaluate(()=>__sg.state().playing)))break;
    if(info.n>=(SK?SK+1:3))break;
    const useMouse=info.n!==1;
    for(const a of info.c.actions){
      if(useMouse){if(held){await pg.mouse.up();held=false}
        if(a.a==='c'){const [x,y]=P(SWX(a.v),600);await pg.mouse.click(x,y)}
        else if(a.a==='p'){const [x,y]=P(200,300);await pg.mouse.move(x,y);await pg.mouse.down();await pg.mouse.move(x,y+(a.v>0?-60:60),{steps:3});await pg.mouse.up()}
        else if(a.a==='t'){const [x,y]=P(250,330);await pg.mouse.click(x,y)}}
      else{if(a.a==='c')await pg.keyboard.press('Digit'+(a.v+1));else if(a.a==='p')await pg.keyboard.press(a.v>0?'ArrowUp':'ArrowDown');else if(a.a==='t')await pg.keyboard.press('KeyF')}
      await pg.waitForTimeout(40);log.push(`n${info.n} t${info.t.toFixed(2)} ${useMouse?'mouse':'key'} ${a.a}${a.v==null?'':a.v}`)}
    const want=info.c.freeze;
    if(want&&!held){if(useMouse){const [x,y]=P(60,300);await pg.mouse.move(x,y);await pg.mouse.down()}else await pg.keyboard.down('Space');held=true;heldMode=useMouse}
    else if(!want&&held){if(heldMode)await pg.mouse.up();else await pg.keyboard.up('Space');held=false}
    if(info.ph==='open'&&!shotOpen&&info.n===1&&info.p>0&&!info.mm&&info.t>0){await pg.waitForTimeout(250);
      await stage.screenshot({path:path.join(OUT,'open-n1.png')});shotOpen=true}
    if(info.ph==='open'&&info.n===0&&shot===0&&!info.mm){await stage.screenshot({path:path.join(OUT,'open-n0.png')});shot=1}
    if(info.ph==='open'&&info.n===2&&shot===1&&info.t>3){await stage.screenshot({path:path.join(OUT,'open-n2.png')});shot=2}
    if(SK&&(info.ph==='open'||info.ph==='warn')&&Math.random()<.04)await stage.screenshot({path:path.join(OUT,'s'+SK+'-'+info.ph+'-'+(info.t|0)+'.png')});
    await pg.waitForTimeout(15);
  }
  const evs=await pg.evaluate(()=>window.__chamLog||[]);console.log(evs.join(' | '));const fin=await pg.evaluate(()=>{const st=__cham.st();return {n:st.n,hearts:st.hearts,score:st.score,time:st.time,perfects:st.perfects}});
  console.log(log.join('\n'));console.log('FINAL',JSON.stringify(fin),'errors',errs);
  await stage.screenshot({path:path.join(OUT,'end.png')});
  await b.close();srv.close()})();
