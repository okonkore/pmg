// Presentation only: every tile represents an actual requested MIDI note.
(function(root){
 const names=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
 const labels={waiting:'待機',running:'生成中',done:'完了',cached:'再利用',failed:'失敗',cancelled:'中止'};
 const symbols={waiting:'·',running:'◌',done:'✓',cached:'↺',failed:'!',cancelled:'−'};
 class PreparationView{
  constructor(host){this.host=host;this.token=0;this.cells=new Map();host.classList.add('preparation-grid');host.setAttribute('role','list');host.setAttribute('aria-label','対象音の準備状況');}
  start(notes){this.token++;this.cells.clear();this.host.replaceChildren();for(const midi of [...new Set(notes)].sort((a,b)=>a-b)){const cell=document.createElement('span');cell.setAttribute('role','listitem');cell.dataset.midi=midi;this.cells.set(midi,cell);this.host.append(cell);this.set(midi,'waiting')}return this.token;}
  set(midi,state,token=this.token){if(token!==this.token||!labels[state])return;const cell=this.cells.get(midi);if(!cell)return;cell.dataset.state=state;cell.textContent=symbols[state];const name=names[midi%12]+(Math.floor(midi/12)-1);cell.setAttribute('aria-label',name+'：'+labels[state]);cell.title=cell.getAttribute('aria-label');}
  finish(state){for(const [midi,cell] of this.cells)if(cell.dataset.state==='running'||(state!=='failed'&&cell.dataset.state==='waiting'))this.set(midi,state);this.token++;}
 }
 root.PreparationView=PreparationView;
})(globalThis);
