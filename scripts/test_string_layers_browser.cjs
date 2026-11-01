const assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{const browser=await chromium.launch(launchOptions({headless:true,args:['--mute-audio']}));try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.argv[2]||'http://127.0.0.1:8793/');await page.waitForSelector('.app-ready');
 assert.equal(await page.evaluate(()=>Object.keys(songs).length),55);
 assert(await page.evaluate(()=>Object.entries(songs).every(([key,song])=>SequencerModel.fromSong(key,song).notes.every(n=>!n.stringNumber))));
 const id=await page.evaluate(()=>scoreEditor.importDocument({title:'Generated layers',bpm:120,meter:[4,4],notes:[{id:'d',pitch:50,beat:0,duration:1,velocity:.8,stringNumber:4},{id:'u',pitch:50,beat:2,duration:1,velocity:.8}]}));
 await page.click('#nav-piano-roll');
 await page.selectOption('#seq-layer','4');assert.equal(await page.locator('.seq-note').count(),1);
 await page.locator('.seq-note').click();await page.evaluate(()=>AppShell.openPanel('note-dialog'));await page.selectOption('#seq-duplicate-string','5');await page.click('#seq-duplicate-note');
 assert.equal(await page.locator('#seq-overlap option').count(),2);await page.selectOption('#seq-overlap','d');assert.equal(await page.locator('#seq-string').inputValue(),'4');
 await page.locator('#note-dialog [data-dismiss]').click();assert.equal(await page.locator('.seq-note').count(),3);
 await page.click('#seq-undo');assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes.length),2);await page.click('#seq-redo');
 await page.selectOption('#seq-layer','unassigned');assert.equal(await page.locator('.seq-note').count(),1);await page.click('#seq-auto-strings');assert.equal(await page.locator('.seq-note').count(),0);
 assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes.filter(n=>n.stringAssignment==='auto').length),1);
 await page.click('#seq-undo');assert.equal(await page.locator('.seq-note').count(),1);
 // Add D3 to the fifth string using the same grid coordinates as an existing note.
 await page.selectOption('#seq-layer','all');await page.click('#seq-draw');const box=await page.locator('[data-note="u"]').boundingBox();
 await page.selectOption('#seq-layer','5');await page.mouse.click(box.x+box.width+30,box.y+box.height/2);
 assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes.at(-1).stringNumber),5);
 await page.click('#seq-undo');await page.selectOption('#seq-layer','all');
 // All-view insertion is guitar-only and never assigns pre-existing unspecified notes.
 await page.evaluate(()=>{document.getElementById('preset').value='guitar520r';document.getElementById('preset').onchange()});
 assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes.find(n=>n.id==='u').stringNumber),undefined,'switching instrument does not assign old notes');
 await page.mouse.click(box.x+box.width+30,box.y+box.height/2);
 assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes.at(-1).stringAssignment),'auto');
 assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes.find(n=>n.id==='u').stringNumber),undefined);
 await page.click('#seq-undo');assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes.length),3);
 await page.selectOption('#seq-layer','unassigned');await page.mouse.click(box.x+box.width+30,box.y+box.height/2);
 assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes.at(-1).stringNumber),undefined,'deliberate unassigned layer');
 await page.click('#seq-undo');await page.selectOption('#seq-layer','all');
 await page.evaluate(()=>{document.getElementById('preset').value='harpsichord';document.getElementById('preset').onchange()});
 await page.mouse.click(box.x+box.width+30,box.y+box.height/2);
 assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes.at(-1).stringNumber),undefined,'non-guitar insertion stays unspecified');
 await page.click('#seq-undo');
 // Copy/paste preserves both same-pitch identities and explicit strings.
 await page.locator('#seq-scroll').focus();await page.keyboard.press('Control+a');await page.keyboard.press('Control+c');await page.keyboard.press('Control+v');
 assert.equal(await page.evaluate(()=>scoreEditor.currentDocument().notes.length),6);assert.equal(await page.evaluate(()=>new Set(scoreEditor.currentDocument().notes.map(n=>n.id)).size),6);
 await page.click('#seq-undo');await page.evaluate(()=>scoreEditor.save());await page.reload();await page.waitForSelector('.app-ready');
 await page.evaluate(id=>{document.getElementById('song').value=id;document.getElementById('song').onchange()},id);await page.click('#nav-piano-roll');
 assert.deepEqual(await page.evaluate(()=>scoreEditor.currentDocument().notes.filter(n=>n.beat===0).map(n=>n.stringNumber)),[4,5]);
 await page.click('#nav-instrument');await page.evaluate(()=>{document.getElementById('preset').value='harpsichord';document.getElementById('preset').onchange()});await page.click('#nav-piano-roll');
 assert.equal(await page.locator('.seq-note').count(),3);
 await page.evaluate(()=>{const original=play;window.layerPlayed=[];play=(...args)=>{layerPlayed.push({pitch:args[1],string:args[4]});return original(...args)};return startSong()});
 await page.waitForFunction(()=>layerPlayed.length>=2);await page.evaluate(()=>stop());
 assert.deepEqual(await page.evaluate(()=>layerPlayed.slice(0,2).map(n=>[n.pitch,n.string])),[[50,4],[50,5]]);
 await page.evaluate(()=>{document.getElementById('preset').value='configuredGuitar';document.getElementById('preset').onchange()});
 assert.deepEqual(await page.evaluate(()=>scoreEditor.currentDocument().notes.filter(n=>n.beat===0).map(n=>n.stringNumber)),[4,5]);
 await page.keyboard.press('Escape');
 await page.evaluate(()=>AppShell.openPanel('tab-dialog'));assert.match(await page.locator('#tab-text').inputValue(),/0/);await page.locator('#tab-dialog [data-dismiss]').click();
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:800}]){await page.setViewportSize(viewport);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1));}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/pmg-string-layers.png'});assert.deepEqual(errors,[]);
 console.log('Mobile/landscape/desktop: layers, duplicate/overlap, add, auto, undo/redo, copy, JSON reload, instrument switch, TAB, no page overflow passed');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
