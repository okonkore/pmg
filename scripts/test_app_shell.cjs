const {chromium,launchOptions}=require('./playwright_runtime.cjs');
const assert=require('node:assert/strict');
const base=process.argv[2]||'http://127.0.0.1:8766/synth-demo/';
(async()=>{const browser=await chromium.launch(launchOptions({headless:true,args:['--mute-audio']}));try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForSelector('.app-ready');
 async function bounds(){const result=await page.evaluate(()=>({width:innerWidth,height:visualViewport.height,docWidth:document.documentElement.scrollWidth,docHeight:document.documentElement.scrollHeight,scroll:scrollY,nav:document.querySelector('.app-nav').getBoundingClientRect().bottom}));assert(result.docWidth<=result.width);assert(result.docHeight<=innerHeightSafe(result));assert.equal(result.scroll,0);assert(result.nav<=result.height+1,JSON.stringify(result));}
 function innerHeightSafe(result){return Math.ceil(result.height)+1}
 async function panel(id){await page.evaluate(id=>AppShell.openPanel(id),id);await page.waitForSelector('#'+id+'[open]');}
 async function close(id){await page.click('#'+id+' [data-dismiss]');await page.waitForFunction(()=>!history.state?.pmgPanel);}
 await bounds();assert.equal(await page.locator('#song optgroup:not(#my-song-group) option').count(),38);
 for(const size of [{width:390,height:844},{width:375,height:667},{width:844,height:390},{width:390,height:430},{width:1280,height:800}]){
  await page.setViewportSize(size);
  for(const route of ['performance','piano-roll','library','instrument']){await page.click('#nav-'+route);await bounds();assert.equal(await page.locator('#nav-'+route).getAttribute('aria-current'),'page');}
 }
 await page.setViewportSize({width:390,height:844});await page.click('#nav-library');
 await page.fill('#library-search','ソル');assert(await page.locator('.library-song').count()>0);await page.fill('#library-search','zzzz-no-song');assert(await page.locator('#library-empty').isVisible());await page.fill('#library-search','');
 await page.locator('.library-song').first().click();assert.equal(await page.evaluate(()=>AppShell.route),'performance');
 await page.click('#nav-piano-roll');await page.click('#seq-menu-toggle');await page.click('#editor-menu-dialog [data-panel="song-dialog"]');await page.click('#seq-copy');await page.waitForFunction(()=>!document.querySelector('.app-dialog[open]'));
 await panel('song-dialog');await page.fill('#seq-title','App shell saved song');await page.locator('#seq-title').blur();const id=await page.inputValue('#song');const saved=await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument()));await close('song-dialog');
 await page.click('#nav-performance');await page.goBack();await page.waitForFunction(()=>AppShell.route==='piano-roll');assert.equal(await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument())),saved);await page.goForward();await page.waitForFunction(()=>AppShell.route==='performance');
 await page.click('#app-menu');await page.goBack();await page.waitForFunction(()=>!document.querySelector('#app-menu-dialog').open);await page.goForward();await page.waitForFunction(()=>document.querySelector('#app-menu-dialog').open);await close('app-menu-dialog');
 for(let i=0;i<3;i++){await page.click('#app-mixer');await page.keyboard.press('Escape');await page.waitForFunction(()=>!history.state?.pmgPanel);assert.equal(await page.evaluate(()=>document.activeElement.id),'app-mixer');}
 await panel('help-dialog');assert(await page.locator('#performance-footer a[href*="creativecommons"]').count()>0);assert((await page.locator('#seq-origin').textContent()).length>0);await close('help-dialog');
 await page.click('#nav-instrument');await page.selectOption('#preset','configuredGuitar');await page.waitForSelector('#configured-setup[open]');await page.click('#cg-manage');await page.click('#string-sets-copy');await page.fill('#string-sets-name','Unsaved strings');
 page.once('dialog',d=>d.dismiss());await page.click('#string-sets-close');assert(await page.locator('#configured-string-sets').evaluate(e=>e.open),'Dirty set dismissal must be vetoable');
 page.once('dialog',d=>d.accept());await page.click('#string-sets-close');await page.click('#configured-cancel');await page.waitForFunction(()=>document.querySelector('#preset').value==='lead');assert.equal(await page.inputValue('#preset'),'lead');assert.equal(await page.locator('#performance-instrument').textContent(),'Warm Lead');
 // Browser Back is also a cancel request; rejecting it must keep the dirty editor open.
 await page.selectOption('#preset','configuredGuitar');await page.waitForSelector('#configured-setup[open]');await page.click('#cg-manage');await page.click('#string-sets-copy');await page.fill('#string-sets-name','Back guard');
 page.once('dialog',d=>d.dismiss());await page.goBack();await page.waitForURL('**#instrument');assert(await page.locator('#configured-string-sets').evaluate(e=>e.open));
 page.once('dialog',d=>d.accept());await page.goBack();await page.waitForFunction(()=>AppShell.route!=='instrument');assert.equal(await page.locator('#configured-string-sets').evaluate(e=>e.open),false);
 await page.click('#nav-piano-roll');await page.reload();await page.waitForSelector('.app-ready');assert.equal(await page.evaluate(()=>AppShell.route),'piano-roll');const store=await page.evaluate(()=>JSON.parse(localStorage.getItem('pmg.songs.v1')));assert(store.songs.some(s=>s.id===id&&s.title==='App shell saved song'));
 await page.selectOption('#song',id);await page.click('#seq-play');await page.waitForFunction(()=>demoEnds>ctx.currentTime);await page.click('#seq-stop');assert.equal(await page.evaluate(()=>demoEnds),0);
 await page.click('#nav-instrument');await page.locator('.key.white').first().scrollIntoViewIfNeeded();const cdp=await page.context().newCDPSession(page),key=await page.locator('.key.white').first().boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:key.x+10,y:key.y+key.height-15}]});await page.waitForFunction(()=>held.size===1&&allVoices.size>0);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>held.size),0);
 assert.deepEqual(errors,[]);console.log('PASS: fixed app frame at five viewport sizes, four routes, search, sheets Back/Forward/Escape/focus, dirty string-set guard, source access, save/reload, actual transport and keyboard voice. Chromium emulation, not iPhone hardware.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
