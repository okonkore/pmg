"""Regenerate metadata only from the reviewed source audit; never rewrite note events."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'scripts/score-sources/catalog-audit/legacy-metadata.json').read_text())
data={r['key']:{'source':r['source'],**({'endBeat':r['endBeat']} if 'endBeat'in r else {})} for r in rows}
(ROOT/'synth-demo/catalog-quality.js').write_text('// Reviewed edition metadata; score-data rights remain per source. No note transformations.\nconst catalogQuality = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n')
