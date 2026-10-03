#!/usr/bin/env node
/* games.json 하나로 목록·게임 페이지·사이트맵을 만든다.
   node tools/build.js            → 사이트 전체 생성
   node tools/build.js pack slug  → itch.io 업로드용 dist/slug.zip */
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=path.join(__dirname,'..'),SITE='https://sg-minigames.pages.dev';
const games=JSON.parse(fs.readFileSync(path.join(ROOT,'games.json'),'utf8')).sort((a,b)=>b.date.localeCompare(a.date));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const bi=(o,tag='span')=>`<${tag} class="ko">${esc(o.ko)}</${tag}><${tag} class="en">${esc(o.en)}</${tag}>`;
const langJs=`<script>(function(){var q=new URLSearchParams(location.search).get('lang');var l=q||((navigator.language||'en').toLowerCase().indexOf('ko')===0?'ko':'en');document.documentElement.lang=l==='ko'?'ko':'en'})()</script>`;
const page=({title,desc,url,base,body,scripts=''})=>`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<link rel="stylesheet" href="${base}assets/style.css">${langJs}
<!-- ADSENSE: 승인 후 여기에 애드센스 스크립트 한 줄을 넣는다 -->
</head><body>
<header class="site"><a class="logo" href="${base}">🐾 SG Games</a><nav><a href="${base}about.html">About</a><a href="${base}privacy.html">Privacy</a><a href="?lang=ko">한국어</a><a href="?lang=en">EN</a></nav></header>
<main>${body}</main>
<footer class="site">© ${new Date().getFullYear()} SG Games · Seoji Games</footer>${scripts}
</body></html>`;
const w=(f,s)=>{fs.mkdirSync(path.dirname(path.join(ROOT,f)),{recursive:true});fs.writeFileSync(path.join(ROOT,f),s)};

function build(){
  w('index.html',page({title:'SG Games — Free browser mini games / 무료 웹 미니게임',
    desc:'Quick free mini games you can play in your browser, on phone or PC. 설치 없이 바로 하는 무료 미니게임.',url:'/',base:'./',
    body:`<h1>${bi({ko:'설치 없이 바로 하는 미니게임',en:'Quick mini games, no install'})}</h1>
<p>${bi({ko:'폰과 PC 브라우저에서 바로 플레이하세요. 새 게임이 계속 추가됩니다.',en:'Play instantly on your phone or PC. New games are added regularly.'})}</p>
<ul class="grid">${games.map(g=>`<li><a href="games/${g.slug}/"><span class="emoji">${g.emoji}</span>${bi(g.title).replace(/<span class="/g,'<span class="name ')}${bi(g.tagline).replace(/<span class="/g,'<span class="tag ')}</a></li>`).join('')}</ul>
<div class="ad-slot"></div>`}));
  for(const g of games){
    if(!fs.existsSync(path.join(ROOT,'games',g.slug,'game.js')))throw new Error('game.js 없음: '+g.slug);
    w(`games/${g.slug}/index.html`,page({title:`${g.title.en} / ${g.title.ko} — SG Games`,desc:g.desc.en+' '+g.desc.ko,url:`/games/${g.slug}/`,base:'../../',
      body:`<h1>${bi(g.title)}</h1><div class="stage" id="stage"></div><div class="ad-slot"></div>
<h2>${bi({ko:'게임 소개',en:'About this game'})}</h2>${bi(g.desc,'p')}
<h2>${bi({ko:'조작법',en:'How to play'})}</h2>${bi(g.controls,'p')}
<h2>${bi({ko:'팁',en:'Tips'})}</h2>${bi(g.tips,'p')}
<p><a href="../../">${bi({ko:'← 다른 게임 보기',en:'← More games'})}</a></p>`,
      scripts:`<script src="../../assets/sg.js"></script><script src="game.js"></script>`}));
  }
  const urls=['/','/about.html','/privacy.html',...games.map(g=>`/games/${g.slug}/`)];
  w('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  w('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log('built',games.length,'games');
}
function pack(slug){
  const g=games.find(x=>x.slug===slug);if(!g)throw new Error('games.json에 없음: '+slug);
  const d=path.join(ROOT,'dist',slug);fs.rmSync(d,{recursive:true,force:true});fs.mkdirSync(d,{recursive:true});
  const css=fs.readFileSync(path.join(ROOT,'assets/style.css'),'utf8');
  const js=fs.readFileSync(path.join(ROOT,'assets/sg.js'),'utf8')+'\n'+fs.readFileSync(path.join(ROOT,'games',slug,'game.js'),'utf8');
  fs.writeFileSync(path.join(d,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(g.title.en)}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&display=swap"><style>${css.replace(/@import[^;]+;/,"")}body{background:#000}.stage{max-height:100vh;border:0;border-radius:0}</style></head><body><div class="stage" id="stage"></div><script>${js}</script></body></html>`);
  cp.execSync(`cd "${d}" && zip -q -r ../${slug}.zip .`);
  fs.writeFileSync(path.join(ROOT,'dist',slug+'-itch.txt'),`Title: ${g.title.en}\nKind: HTML · Embed 360x640 · Mobile friendly ON\nTags: cat, arcade, casual, mobile, html5\n\n${g.desc.en}\n\nHow to play: ${g.controls.en}\n\n${g.desc.ko}\n조작법: ${g.controls.ko}\n\nMore games: ${SITE}/\n`);
  console.log('packed dist/'+slug+'.zip');
}
process.argv[2]==='pack'?pack(process.argv[3]):build();
