const assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{const browser=await chromium.launch(launchOptions({headless:true}));try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto(process.argv[2]||'http://127.0.0.1:8797/');await page.waitForSelector('.app-ready');
 await page.evaluate(()=>scoreEditor.importDocument({title:'フレット表示',bpm:120,meter:[4,4],notes:[{id:'open',pitch:50,stringNumber:4},{id:'ten',pitch:55,stringNumber:5},{id:'high',pitch:59,stringNumber:6},{id:'free',pitch:53}].map(n=>({...n,beat:0,duration:2,velocity:.8}))}));
 await page.click('#nav-piano-roll');
 const label=id=>page.locator(`[data-note="${id}"]`);
 assert.equal(await label('open').textContent(),'F0');assert.equal(await label('ten').textContent(),'F10');assert.equal(await label('high').textContent(),'F19');assert.equal(await label('free').textContent(),'—');
 assert.match(await label('open').getAttribute('aria-label'),/D3.*4弦、0フレット/);assert.match(await label('ten').getAttribute('title'),/10フレット/);
 const color=await label('ten').evaluate(e=>getComputedStyle(e).backgroundColor);await label('ten').click();assert.equal(await label('ten').evaluate(e=>getComputedStyle(e).backgroundColor),color);
 await page.keyboard.press('ArrowUp');assert.equal(await label('ten').textContent(),'F11');await page.click('#seq-undo');assert.equal(await label('ten').textContent(),'F10');
 await label('high').click();await page.keyboard.press('ArrowUp');assert.equal(await label('high').textContent(),'F19','invalid fret edit rejected');
 await page.evaluate(()=>AppShell.openPanel('note-dialog'));assert.equal(await page.locator('#seq-pitch').inputValue(),'B3');await page.locator('#note-dialog [data-dismiss]').click();
 await page.selectOption('#seq-layer','unassigned');assert.equal(await label('free').textContent(),'—');await page.selectOption('#seq-layer','4');assert.equal(await label('open').textContent(),'F0');await page.selectOption('#seq-layer','all');
 await page.evaluate(()=>{document.getElementById('preset').value='harpsichord';document.getElementById('preset').onchange()});assert.equal(await label('ten').textContent(),'F10');assert.match(await label('ten').getAttribute('title'),/ギター運指/);
 await page.evaluate(()=>{document.getElementById('preset').value='guitar520r';document.getElementById('preset').onchange()});assert.equal(await label('ten').textContent(),'F10');
 // Short bars retain the fret prefix; tiny bars omit text without inventing values.
 await label('ten').click();await page.evaluate(()=>AppShell.openPanel('note-dialog'));
 await page.locator('#seq-duration').fill('0.75');await page.locator('#seq-duration').dispatchEvent('change');assert.equal(await label('ten').textContent(),'F10');
 await page.locator('#seq-duration').fill('0.125');await page.locator('#seq-duration').dispatchEvent('change');assert.equal(await label('ten').textContent(),'');assert.match(await label('ten').getAttribute('title'),/10フレット/);
 await page.locator('#seq-duration').fill('2');await page.locator('#seq-duration').dispatchEvent('change');await page.locator('#note-dialog [data-dismiss]').click();
 await page.screenshot({path:'/tmp/pmg-fret-labels-mobile.png'});await page.setViewportSize({width:1280,height:800});assert.equal(await label('free').textContent(),'—');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 console.log('PASS: open0/decimal10/19/unassigned dash, pitch accessibility/inspector, selection color, transpose/undo/invalid-fret rejection, layers, instrument switch, mobile/desktop');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
