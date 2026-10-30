const assert=require('node:assert/strict');
const {chromium}=require(process.env.PMG_PLAYWRIGHT_MODULE||'playwright');
const {fixture,midi,end,melody,event}=require('../synth-demo/midi-import.test.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PMG_BROWSER_EXECUTABLE||'/usr/bin/chromium'});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.argv[2]||'http://127.0.0.1:8766/synth-demo/');await page.waitForSelector('.app-ready');
 await page.click('#nav-library');await page.click('#library-new');
 await page.fill('#seq-title','Keep this draft');await page.locator('#seq-title').blur();
 await page.click('#song-dialog [data-dismiss]');await page.waitForFunction(()=>!history.state?.pmgPanel);
 const before=await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument()));
 await page.click('#nav-library');await page.click('#library-midi');
 const upload=buffer=>page.locator('#midi-file').setInputFiles({name:'Original fixture.mid',mimeType:'audio/midi',buffer});
 await upload(fixture);await page.waitForSelector('#midi-preview:visible');assert.equal(await page.locator('#midi-tracks input:checked').count(),1);
 assert.equal(await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument())),before);
 await page.goBack();await page.waitForFunction(()=>!document.querySelector('#midi-dialog').open);assert.equal(await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument())),before);
 await page.click('#library-midi');await upload(Buffer.from('broken'));await page.waitForFunction(()=>document.querySelector('#midi-error').textContent.length>0);assert.equal(await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument())),before);
 await upload(midi([[0,255,81,3,7,161,32,1,255,81,3,9,39,192,...end]]));await page.waitForFunction(()=>document.querySelector('#midi-error').textContent.includes('途中でテンポ'));assert.equal(await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument())),before);
 await upload(fixture);await page.waitForSelector('#midi-preview:visible');await page.locator('#midi-tracks input:checked').uncheck();await page.click('#midi-confirm');assert.match(await page.locator('#midi-error').textContent(),/トラック/);
 await page.locator('#midi-tracks input:not(:disabled)').check();await page.fill('#midi-title','Imported original');
 await page.evaluate(()=>{window.originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError')}});await page.click('#midi-confirm');await page.waitForFunction(()=>document.querySelector('#midi-error').textContent.includes('保存できません'));assert.equal(await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument())),before);
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSet});await page.click('#midi-confirm');
 await page.waitForFunction(()=>AppShell.route==='piano-roll');const doc=await page.evaluate(()=>scoreEditor.currentDocument());assert.equal(doc.title,'Imported original');assert.equal(doc.notes.length,3);assert.equal(doc.source,null);assert.equal(doc.notes[0].velocity,100/127);
 await page.reload();await page.waitForSelector('.app-ready');const songs=await page.evaluate(()=>JSON.parse(localStorage.getItem('pmg.songs.v1')).songs);assert(songs.some(s=>s.title==='Keep this draft'));assert(songs.some(s=>s.title==='Imported original'&&s.notes.length===3));
 await page.click('#nav-library');await page.click('#library-midi');await upload(fixture);await page.waitForSelector('#midi-preview:visible');await page.setViewportSize({width:844,height:390});
 assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));await page.locator('#midi-confirm').scrollIntoViewIfNeeded();assert(await page.locator('#midi-confirm').isVisible());
 // Closing an outstanding read must isolate both its success and failure from a new preview.
 await page.setViewportSize({width:390,height:844});await page.keyboard.press('Escape');await page.waitForFunction(()=>!history.state?.pmgPanel);await page.click('#library-midi');
 await page.evaluate(()=>{window.originalArrayBuffer=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){return new Promise((resolve,reject)=>{window.rejectOldRead=reject})}});
 await upload(fixture);await page.waitForFunction(()=>!!window.rejectOldRead);await page.keyboard.press('Escape');await page.waitForFunction(()=>!history.state?.pmgPanel);await page.click('#library-midi');
 await page.evaluate(()=>{File.prototype.arrayBuffer=window.originalArrayBuffer});await upload(fixture);await page.waitForSelector('#midi-preview:visible');await page.evaluate(()=>window.rejectOldRead(Error('old read failed')));assert.equal(await page.locator('#midi-error').textContent(),'');
 const payload='<img src=x onerror=globalThis.importXss=1>',named=midi([[...event(0,255,3,Buffer.byteLength(payload),...Buffer.from(payload)),...melody]]);
 await upload(named);await page.waitForSelector('#midi-preview:visible');assert((await page.locator('#midi-tracks').textContent()).includes(payload));assert.equal(await page.locator('#midi-tracks img').count(),0);await page.fill('#midi-title',payload);await page.click('#midi-confirm');await page.waitForFunction(()=>AppShell.route==='piano-roll');await page.click('#nav-library');assert((await page.locator('#library-list').textContent()).includes(payload));assert.equal(await page.locator('#library-list img').count(),0);
 // Range filtering is previewed, selected-track-only, and never overwrites on errors.
 await page.click('#library-midi');
 const track=(pitch,ticks=128)=>[...event(0,144,pitch,100),...event(ticks,128,pitch,0),...end];
 const preserved=await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument()));
 await upload(midi([track(20,0),track(109)]));await page.waitForSelector('#midi-preview:visible');
 assert.match(await page.locator('#midi-range').textContent(),/0音を取り込み.*2音を除外/);
 await page.click('#midi-confirm');assert.match(await page.locator('#midi-error').textContent(),/全2音/);assert.equal(await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument())),preserved);
 await upload(midi([track(20),track(60,0)]));await page.waitForSelector('#midi-preview:visible');await page.click('#midi-confirm');assert.match(await page.locator('#midi-error').textContent(),/音域内.*1\/128拍未満.*トラック2.*先頭から0拍.*長さ0拍.*0.0078125/);assert.equal(await page.evaluate(()=>JSON.stringify(scoreEditor.currentDocument())),preserved);
 await upload(midi([track(20,0),track(21,1),track(108),track(109)]));await page.waitForSelector('#midi-preview:visible');
 assert.match(await page.locator('#midi-range').textContent(),/2音を取り込み.*2音を除外.*トラック1.*G♯0（20）.*トラック4.*C♯8（109）/);
 await page.locator('#midi-tracks input[value="3"]').uncheck();assert.match(await page.locator('#midi-range').textContent(),/2音を取り込み.*1音を除外/);
 await page.click('#midi-confirm');await page.waitForFunction(()=>AppShell.route==='piano-roll');assert.match(await page.locator('#midi-result').textContent(),/2音を保存しました.*1音を除外/);
 assert.deepEqual(await page.evaluate(()=>scoreEditor.currentDocument().notes.map(n=>[n.pitch,n.beat,n.duration])),[[21,0,1/128],[108,0,1]]);
 assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));
 await page.evaluate(()=>AppShell.openPanel('song-dialog'));const json={format:'pmg-song',version:1,song:{title:payload,bpm:120,meter:[4,4],notes:[],source:{title:payload,credit:payload,url:'javascript:globalThis.importXss=1',licenseUrl:payload}}};await page.locator('#seq-file').setInputFiles({name:'source.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(json))});await page.evaluate(()=>AppShell.openPanel('help-dialog'));assert((await page.locator('#seq-origin').textContent()).includes(payload));assert.equal(await page.locator('#seq-origin img,#seq-origin a').count(),0);assert.equal(await page.evaluate(()=>window.importXss),undefined);
 assert.deepEqual(errors,[]);console.log('PASS MIDI browser: preview, cancel/Back, malformed/tempo errors preserve draft, track selection, save/reload, landscape, no page errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
