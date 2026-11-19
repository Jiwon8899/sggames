const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),OUT=process.argv[2]||'/tmp';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':mime[path.extname(p)]||'text/plain'});r.end(b)})});
(async()=>{
  await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
  let b;try{b=await chromium.launch()}catch(e){b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})}
  const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await pg.goto(`http://localhost:${port}/games/kite-wind/?lang=${process.argv[3]||'ko'}`);
  await pg.click('#sg-btn');await pg.waitForTimeout(200);
  let held=false,shots=0,t0=Date.now(),log=[];const shotAt=[4,9,15,22,30];
  while(Date.now()-t0<75000){
    const st=await pg.evaluate(()=>{const R=__kite.R,S=R.S;if(!__sg.state().playing)return {over:true,n:R.n};
      const r=__kite.API.solveFrom(S,{beam:18,maxT:4.5});return {n:R.n,alt:S.ky|0,got:S.nGot,q:R.st.q,time:R.time,act:r.plan[0]||0,T:S.T/150,spin:S.spin>0,snag:S.snag>0?S.snagKind:''}});
    if(st.over){log.push('over at stage '+(st.n+1));break}
    if(st.act&&!held){await pg.keyboard.down('Space');held=true}else if(!st.act&&held){await pg.keyboard.up('Space');held=false}
    const el=(Date.now()-t0)/1000;
    if(shots<shotAt.length&&el>shotAt[shots]){await pg.locator('#stage').screenshot({path:path.join(OUT,'kw-'+shots+'.png')});log.push(`shot${shots} t${el.toFixed(1)} stage${st.n+1} alt${st.alt} got${st.got}/${st.q} T${st.T.toFixed(1)} held${held}`);shots++}
    if(st.n>=2){log.push('reached stage 3 at '+el.toFixed(1)+'s, time left '+st.time.toFixed(1));break}
    await pg.waitForTimeout(60)}
  if(held)await pg.keyboard.up('Space');
  console.log(log.join('\n'));console.log('score',await pg.evaluate(()=>__sg.state().score),'errors',errs.length?errs:'none');
  await b.close();srv.close()})();
