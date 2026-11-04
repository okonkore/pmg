const assert=require('node:assert/strict'),{chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{const browser=await chromium.launch(launchOptions({headless:true,args:['--mute-audio']}));try{for(const query of ['','?ui=v2']){
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.argv[2]||'http://127.0.0.1:8803/')+query);await page.waitForSelector('.app-ready');
 assert.equal(await page.locator('#song option[value="air1068"]').count(),1);
 await page.evaluate(()=>{document.getElementById('song').value='air1068';document.getElementById('song').dispatchEvent(new Event('change'))});
 const doc=await page.evaluate(()=>scoreEditor.currentDocument());assert.equal(doc.notes.length,418);assert.equal(doc.bpm,56);assert.equal(doc.endBeat,144);assert(doc.notes.every(n=>n.stringNumber));assert.equal(doc.source.license,'CC BY-SA 3.0');
 await page.evaluate(()=>AppShell.openPanel('tab-dialog'));const text=await page.locator('#tab-text').inputValue();assert(text.includes('指定弦'));assert(text.includes('CC BY-SA 3.0'));assert(text.includes('Air'));assert(!text.includes('未割当:'));
 await page.keyboard.press('Escape');assert.deepEqual(await page.evaluate(()=>scoreEditor.currentDocument()),doc);assert.deepEqual(errors,[]);await page.close();console.log('PASS Air browser '+(query||'default')+': catalog selection, 418 assigned notes, timing, licensed metadata and TAB without mutation.');
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
