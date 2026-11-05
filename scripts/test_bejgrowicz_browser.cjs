const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,launchOptions}=require('./playwright_runtime.cjs');
(async()=>{
 const root=path.resolve('synth-demo'),server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.json')?'application/json':name.endsWith('.wasm')?'application/wasm':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch(launchOptions({headless:true,args:['--autoplay-policy=no-user-gesture-required','--mute-audio']}));
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('.app-ready');
  await page.selectOption('#song','air1068_bejgrowicz');
  await page.evaluate(()=>{document.getElementById('preset').value='organ';selectPreset();});
  const result=await page.evaluate(async()=>{
   const document=scoreEditor.currentDocument(),calls=[],originalPlay=play;
   play=(...args)=>{calls.push(args.slice(1));return originalPlay(...args)};
   const samples=[];
   try{for(const fromBeat of [0,96,284]){
    calls.length=0;await startSong({fromBeat});await new Promise(r=>setTimeout(r,600));
    const wave=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(wave);
    samples.push({fromBeat,pitches:calls.map(a=>a[0]),strings:calls.map(a=>a[3]),peak:wave.reduce((a,v)=>Math.max(a,Math.abs(v)),0)});stop();
   }}finally{play=originalPlay;}
   return {title:document.title,notes:document.notes.length,endBeat:document.endBeat,source:document.source,samples,oldEditionPresent:!!songs.air1068};
  });
  assert.equal(result.notes,903);assert.equal(result.endBeat,288);assert(result.oldEditionPresent);assert.match(result.source.credit,/Seweryn Bejgrowicz/);assert.equal(result.source.license,'CC BY-SA 3.0');
  assert(result.samples[0].pitches.includes(64));assert(result.samples[1].pitches.includes(59));assert.deepEqual(result.samples[2].pitches.sort((a,b)=>a-b),[48,52,55,60]);
  for(const s of result.samples){assert(s.peak>1e-6&&Number.isFinite(s.peak));assert(s.strings.every(n=>Number.isInteger(n)&&n>=1&&n<=6));}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({scope:'Chromium catalog/editor and actual organ audio at start, repeat section and ending; not full Physical Guitar bank rendering or human listening',...result},null,2));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
