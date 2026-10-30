const assert=require('node:assert/strict'),{chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{
 const browser=await chromium.launch(launchOptions({headless:true}));
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.argv[2]||'http://127.0.0.1:8782/sound-lab/depth/');
 assert.equal(await page.evaluate(()=>localStorage.length),0);
 for(const depth of [85,105,125]){
  await page.click('[data-depth="'+depth+'"]');
  await page.waitForFunction(()=>!document.querySelector('audio').paused&&Number.isFinite(document.querySelector('audio').duration));
  assert.equal(await page.locator('audio').evaluate(e=>e.duration),1.5);
  await page.click('#stop');assert(await page.locator('audio').evaluate(e=>e.paused));
 }
 await page.evaluate(()=>{document.querySelector('[data-depth="85"]').click();document.querySelector('[data-depth="105"]').click();document.querySelector('[data-depth="125"]').click()});
 await page.waitForFunction(()=>document.querySelector('[data-depth="125"]').getAttribute('aria-pressed')==='true');
 assert((await page.locator('audio').getAttribute('src')).includes('125'));
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
 assert(await page.locator('audio').evaluate(e=>e.paused&&!e.getAttribute('src')));
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden});
 assert(await page.locator('audio').evaluate(e=>e.paused));
 await page.route('**/depth-85mm.wav',r=>r.abort());
 await page.click('[data-depth="85"]');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('再生できません'));
 await page.unroute('**/depth-85mm.wav');await page.click('[data-depth="85"]');
 await page.waitForFunction(()=>!document.querySelector('audio').paused&&Number.isFinite(document.querySelector('audio').duration));
 await page.waitForFunction(()=>document.querySelector('#status').textContent==='再生が終わりました。');
 assert.equal(await page.evaluate(()=>localStorage.length),0);assert.deepEqual(errors,[]);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:process.env.PMG_DEPTH_SCREENSHOT||'/tmp/pmg-depth-release-mobile.png',fullPage:true});
 console.log('PASS three clips, duration, stop/retry/rapid switch/pagehide, natural end, mobile width, no storage writes');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
