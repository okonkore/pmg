// Real Chromium touch input; does not substitute for iPhone Safari verification.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{
 const root=path.resolve('synth-demo'),server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch(launchOptions({headless:true,args:['--autoplay-policy=no-user-gesture-required','--mute-audio']}));
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('.app-ready');
  await page.click('#nav-piano-roll');await page.click('#seq-tempo');assert(await page.locator('#tempo-apply').isDisabled());await page.click('#tempo-close');
  const id=await page.evaluate(()=>scoreEditor.importDocument({title:'Tempo browser',bpm:120,meter:[4,4],notes:[{id:'n',beat:0,pitch:60,duration:12,velocity:1}],tempoChanges:[]}));
  await page.locator('#seq-scroll').evaluate(e=>e.scrollLeft=0);
  const cdp=await page.context().newCDPSession(page),send=(type,touchPoints=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
  const lane=await page.locator('#seq-tempo-lane').boundingBox();const p={x:lane.x+15,y:lane.y+22,id:1};
  await send('touchStart',[p]);await send('touchMove',[{...p,x:p.x+240}]);await send('touchEnd');
  await page.waitForSelector('#seq-tempo-dialog[open]');assert.equal(await page.inputValue('#tempo-start'),'1');assert.equal(await page.inputValue('#tempo-end'),'3');
  await page.fill('#tempo-target','60');await page.click('#tempo-apply');
  let d=await page.evaluate(()=>scoreEditor.currentDocument());assert.equal(d.tempoChanges.length,1);assert.equal(d.tempoChanges[0].endBeat,8);
  await page.click('#seq-undo');assert.equal(await page.locator('.seq-tempo-range').count(),0);await page.click('#seq-redo');assert.equal(await page.locator('.seq-tempo-range').count(),1);
  await page.click('#seq-tempo');await page.fill('#tempo-start','2');await page.fill('#tempo-end','4');await page.click('#tempo-apply');assert.match(await page.locator('#tempo-error').textContent(),/重ね/);
  await page.fill('#tempo-start','3');await page.fill('#tempo-end','4');await page.fill('#tempo-target','180');await page.selectOption('#tempo-after','base');await page.click('#tempo-apply');
  d=await page.evaluate(()=>scoreEditor.currentDocument());assert.equal(d.tempoChanges.length,2);
  await page.reload();await page.waitForSelector('.app-ready');await page.evaluate(id=>{document.getElementById('song').value=id;document.getElementById('song').dispatchEvent(new Event('change'));},id);assert.deepEqual((await page.evaluate(()=>scoreEditor.currentDocument())).tempoChanges,d.tempoChanges);
  await page.click('#nav-piano-roll');await page.click('#seq-tempo');await page.locator('#tempo-list button').last().click();await page.click('#tempo-delete');assert.equal((await page.evaluate(()=>scoreEditor.currentDocument())).tempoChanges.length,1);await page.click('#tempo-close');await page.click('#seq-undo');
  // Continuous scheduler / displayed BPM from a seek within an acceleration.
  const audio=await page.evaluate(async()=>{document.getElementById('preset').value='organ';selectPreset();const calls=[],original=play;play=(...args)=>{calls.push(args);return original(...args)};try{await startSong({fromBeat:10});await new Promise(r=>setTimeout(r,250));const wave=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(wave);return {calls:calls.length,bpm:document.getElementById('seq-current-bpm').textContent,peak:Math.max(...wave.map(Math.abs))}}finally{stop();play=original}});
  assert(audio.calls>0);assert(audio.peak>1e-6);assert(parseFloat(audio.bpm)>120&&parseFloat(audio.bpm)<180);
  // Cancellation and two-touch input on the tempo lane must not commit or open a sheet.
  await page.locator('#seq-scroll').evaluate(e=>e.scrollLeft=0);
  let lr=await page.locator('#seq-tempo-lane').boundingBox(),tp={x:lr.x+15,y:lr.y+22,id:1};
  await send('touchStart',[tp]);await send('touchMove',[{...tp,x:tp.x+100}]);await send('touchCancel');
  assert.equal(await page.locator('#seq-tempo-dialog').evaluate(e=>e.open),false);
  await send('touchStart',[tp]);await send('touchStart',[tp,{...tp,x:tp.x+100,id:2}]);await send('touchEnd');
  assert.equal(await page.locator('#seq-tempo-dialog').evaluate(e=>e.open),false);
  // The original top row still pinches horizontally without creating tempo ranges.
  const ruler=await page.locator('#seq-ruler').boundingBox(),before=Number(await page.inputValue('#seq-zoom'));
  const a={x:ruler.x+40,y:ruler.y+12,id:1},b={x:ruler.x+140,y:ruler.y+12,id:2};
  await send('touchStart',[a]);await send('touchStart',[a,b]);await send('touchMove',[{...a,x:a.x-20},{...b,x:b.x+20}]);await send('touchEnd');
  assert(Number(await page.inputValue('#seq-zoom'))>before);assert.equal((await page.evaluate(()=>scoreEditor.currentDocument())).tempoChanges.length,2);
  await page.screenshot({path:'/tmp/pmg-tempo-mobile.png',fullPage:true});
  // Migration uses existing global data, and keeps it after conversion.
  await page.evaluate(()=>{scoreEditor.importDocument({title:'Old tempo',bpm:120,meter:[4,4],notes:[{id:'old',beat:0,pitch:60,duration:16,velocity:1}]});document.getElementById('song-rit-ending').checked=true;document.getElementById('song-rit-ending').dispatchEvent(new Event('input'))});
  await page.click('#seq-tempo');await page.locator('#tempo-legacy summary').click();await page.click('#tempo-migrate');
  d=await page.evaluate(()=>scoreEditor.currentDocument());assert.equal(d.tempoChanges.length,1);assert.equal(d.tempoChanges[0].curve,'period');assert.equal(d.tempoChanges[0].after,'base');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pmg.playback.v1')).rit.ending),true);
  await page.click('#tempo-constant');assert.deepEqual((await page.evaluate(()=>scoreEditor.currentDocument())).tempoChanges,[]);await page.click('#tempo-close');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('Mobile Chromium: touch range creation, readonly protection, overlap errors, adjacent ramps, undo/redo, reload, delete, actual seek playback/BPM, legacy migration and opt-out passed.',audio);
 }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
