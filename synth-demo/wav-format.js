// PCM16 stereo, bounded before allocating. No normalization or resampling.
const WavFormat=(()=>{
 const MAX_BYTES=64*1024*1024,TAIL_SECONDS=12;
 function plan(seconds,rate){
  if(!Number.isFinite(seconds)||seconds<=0||!Number.isInteger(rate)||rate<8000||rate>192000)throw Error('音声の長さ・サンプルレートが正しくありません');
  const frames=Math.ceil(seconds*rate),bytes=44+frames*4;
  if(bytes>MAX_BYTES)throw Error(`WAVは64 MiB以内で書き出せます。この音声設定では余韻込み約${Math.floor((MAX_BYTES-44)/(rate*4))}秒までです。曲を短くして再試行してください。`);
  return {frames,bytes,rate,seconds:frames/rate};
 }
 function header(frames,rate){
  if(!Number.isSafeInteger(frames)||frames<=0||!Number.isInteger(rate)||rate<8000||rate>192000||44+frames*4>MAX_BYTES)throw Error('WAVのサイズが正しくありません');
  const p={bytes:44+frames*4},buffer=new ArrayBuffer(44),d=new DataView(buffer);
  function text(at,s){for(let i=0;i<s.length;i++)d.setUint8(at+i,s.charCodeAt(i))}
  text(0,'RIFF');d.setUint32(4,p.bytes-8,true);text(8,'WAVE');text(12,'fmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,2,true);d.setUint32(24,rate,true);d.setUint32(28,rate*4,true);d.setUint16(32,4,true);d.setUint16(34,16,true);text(36,'data');d.setUint32(40,frames*4,true);return buffer;
 }
 function filename(title){return (String(title||'PMG').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,100)||'PMG')+'.wav'}
 return {MAX_BYTES,TAIL_SECONDS,plan,header,filename};
})();
if(typeof module!=='undefined')module.exports=WavFormat;
