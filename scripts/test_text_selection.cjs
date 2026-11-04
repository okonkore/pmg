// Chromium touch emulation; does not substitute for physical iPhone Safari.
const assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{
 const browser=await chromium.launch(launchOptions({headless:true,args:['--mute-audio']}));
 try{for(const query of ['','?ui=v2']){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto((process.argv[2]||'http://127.0.0.1:8803/')+query);await page.waitForSelector('.app-ready');
  // Use the real dynamically-created preparation dialog, without starting DSP.
  await page.evaluate(()=>document.getElementById('configured-progress').showModal());
  const heading=page.locator('#configured-progress-title');
  assert.equal(await heading.evaluate(e=>getComputedStyle(e).userSelect),'none');
  await heading.dblclick();assert.equal(await page.evaluate(()=>getSelection().toString()),'');
  const box=await heading.boundingBox(),cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+10,y:box.y+10,id:1}]});await page.waitForTimeout(700);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.evaluate(()=>getSelection().toString()),'');
  await page.evaluate(()=>document.getElementById('configured-progress').close());
  const fields=await page.locator('input,textarea').evaluateAll(es=>es.map(e=>({id:e.id,selection:getComputedStyle(e).userSelect})));assert(fields.length>5);assert(fields.every(f=>f.selection==='text'),JSON.stringify(fields.filter(f=>f.selection!=='text')));
  // Native text editing, readonly copy and nested editable text retain selection.
  await page.evaluate(()=>{const d=document.createElement('dialog');d.id='selection-fixture';d.innerHTML='<p id="display-fixture">Display words</p><input id="edit-fixture" value="editable words"><textarea id="copy-fixture" readonly>copyable words</textarea><div contenteditable="true"><span id="nested-fixture">editable nested words</span><span contenteditable="false" id="locked-fixture">locked</span></div>';document.body.append(d);d.showModal()});
  await page.locator('#display-fixture').dblclick();assert.equal(await page.evaluate(()=>getSelection().toString()),'');
  await page.locator('#edit-fixture').selectText();await page.keyboard.type('replacement');assert.equal(await page.locator('#edit-fixture').inputValue(),'replacement');
  await page.locator('#copy-fixture').selectText();assert.equal(await page.locator('#copy-fixture').evaluate(e=>e.selectionEnd-e.selectionStart),14);
  assert.equal(await page.locator('#nested-fixture').evaluate(e=>getComputedStyle(e).userSelect),'text');assert.equal(await page.locator('#locked-fixture').evaluate(e=>getComputedStyle(e).userSelect),'none');
  assert.deepEqual(errors,[]);await page.close();console.log('PASS selection, long press, editable fields, readonly copy: '+(query||'default'));
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
