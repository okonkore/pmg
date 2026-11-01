const assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
const luminance=c=>c.match(/\d+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
(async()=>{const browser=await chromium.launch(launchOptions({headless:true}));try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto(process.argv[2]||'http://127.0.0.1:8795/');await page.waitForSelector('.app-ready');
 await page.evaluate(()=>scoreEditor.importDocument({title:'弦レイヤーの色',bpm:120,meter:[4,4],notes:Array.from({length:7},(_,i)=>({id:'color'+i,pitch:64-i,beat:0,duration:4,velocity:.3+i*.1,...(i<6?{stringNumber:i+1}:{})}))}));
 await page.click('#nav-piano-roll');
 const colors=await page.locator('.seq-note').evaluateAll(es=>es.map(e=>({id:e.dataset.note,bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color,label:e.getAttribute('aria-label')})));
 assert.equal(new Set(colors.map(n=>n.bg)).size,7);
 for(const n of colors){assert((luminance(n.bg)+.05)/(luminance(n.fg)+.05)>=4.5);assert.match(n.label,/弦/);}
 await page.locator('[data-note="color3"]').click();
 assert.equal(await page.locator('[data-note="color3"]').evaluate(e=>getComputedStyle(e).backgroundColor),colors.find(n=>n.id==='color3').bg,'selection preserves string color');
 assert.match(await page.locator('[data-note="color3"]').evaluate(e=>getComputedStyle(e).boxShadow),/rgb\(255, 255, 255\)/);
 await page.screenshot({path:'/tmp/pmg-layer-colors-mobile.png'});
 for(const layer of ['1','2','3','4','5','6','unassigned']){await page.selectOption('#seq-layer',layer);assert.equal(await page.locator('.seq-note').count(),1);const n=await page.locator('.seq-note').evaluate(e=>({id:e.dataset.note,bg:getComputedStyle(e).backgroundColor}));assert.equal(n.bg,colors.find(c=>c.id===n.id).bg);}
 await page.selectOption('#seq-layer','all');await page.setViewportSize({width:1280,height:800});await page.screenshot({path:'/tmp/pmg-layer-colors-desktop.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 console.log('PASS: seven full-bar colors, text contrast >=4.5:1, string labels, selection preserves color/visible outline, layer consistency, mobile/desktop');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
