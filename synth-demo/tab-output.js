import './tab-model.js';
const $=id=>document.getElementById(id),number=v=>{for(const d of [1,2,3,4,6,8,12,16,24,32,48,64,96]){const n=Math.round(v*d);if(Math.abs(v*d-n)<1e-8){const whole=Math.floor(n/d),part=n%d;return part?(whole?whole+'＋':'')+part+'/'+d:String(whole)}}const rounded=Number(v.toFixed(6));return (rounded===v?'':'≈')+rounded},pitch=n=>['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][n%12]+(Math.floor(n/12)-1);
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
export function renderTab(host,doc){
 const tab=PMGTab.plan(doc);host.replaceChildren();host.append(node('h1',doc.title),node('p',`自動運指案 · ${doc.meter.join('/')} · ♩ = ${number(doc.bpm)} BPM · 0〜19フレット`),node('p','調弦（6→1弦）：'+tab.tuning.map(pitch).join(' / ')));
 host.append(node('p','拍 / 〔長さ〕：四分音符＝1、0始まり。横間隔は均等。→ は保持。'));
 const help=node('details');help.className='tab-help';help.append(node('summary','読み方・自動運指の制限'),node('p','数値は分数・約表示（元データは変更しません）。小節を越える長い音も元の長さを保持します。符尾・タイ・声部分離・指番号は未記譜。弦競合を避ける自動候補ですが、指の使い方・バレー・奏法を考慮した演奏可能性は保証しません。'));host.append(help);
 if(tab.requiredTuning)host.append(node('p','曲の必要調弦をTABに採用しています。音源の調弦は変更しません。'));
 if(tab.unassigned.length||tab.stretches.length){const warning=node('p',`要確認：割当不可 ${tab.unassigned.length}音 / 広い押弦位置 ${tab.stretches.length}音。割当不可の音も各小節に記載します。`);warning.className='tab-warning';host.append(warning)}
 const printHelp=node('p',help.lastChild.textContent);printHelp.className='tab-print-help';host.append(printHelp);
 const body=node('div');host.append(body);
 for(const bar of tab.bars){
  for(let offset=0;offset<bar.times.length;offset+=8){const times=bar.times.slice(offset,offset+8),section=node('section');section.className='tab-measure';section.tabIndex=0;section.setAttribute('aria-label',`${bar.number}小節のTAB。横にスクロールできます`);section.append(node('h2',`${bar.number}小節${offset?'（続き）':''} · ${number(bar.start)}〜${number(bar.end)}拍`));
   const table=node('table'),head=node('tr');head.append(node('th','弦 / 拍'));for(const time of times)head.append(node('th',number(time-bar.start)));table.append(head);
   for(let string=1;string<=6;string++){const row=node('tr');row.append(node('th',`${string} ${pitch(tab.tuning[6-string])}`));for(const time of times){const n=bar.notes.find(n=>n.string===string&&n.beat<=time+1e-9&&n.beat+n.duration>time+1e-9);const cell=node('td',n?(Math.abs(n.beat-time)<1e-9?`${n.fret}${n.stretch?' !':''}〔${number(n.duration)}〕`:`→ ${n.fret}`):'─');row.append(cell)}table.append(row)}section.append(table);
   if(!offset){for(const n of bar.notes.filter(n=>!n.string&&n.beat>=bar.start)){const p=node('p',`未割当：${pitch(n.pitch)} · ${number(n.beat-bar.start)}拍〔${number(n.duration)}〕 — ${n.reason}`);p.className='tab-warning';section.append(p)}if(bar.rests.length)section.append(node('p','全声部の休符：'+bar.rests.map(([a,b])=>`${number(a-bar.start)}〜${number(b-bar.start)}拍`).join(' / ')))}body.append(section);
  }
 }
 if(doc.source){const source=node('section');source.className='tab-source';source.append(node('h2','出典・ライセンス'));for(const [key,value]of Object.entries(doc.source))if(typeof value==='string')source.append(node('p',`${key}: ${value}`));source.append(node('p','改変：音符データから自動で弦・フレット案を作成。元の音符開始・長さ・音高は変更していません。'));host.append(source)}
 return tab;
}
