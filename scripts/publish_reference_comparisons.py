"""Copy the listening excerpts authorized for public hosting on 2026-10-21.
Original recordings and analysis stay under ignored reference-recordings/.
"""
from pathlib import Path
import shutil
repo=Path(__file__).resolve().parent.parent
source=repo/'reference-recordings/tuning-2026-10-20/reference-comparison'
out=repo/'synth-demo/reference-comparison'
out.mkdir(exist_ok=True)
for name in ['wound-comparison','treble-comparison','third-comparison','first-comparison']:
    src=source/name;dest=out/name
    (dest/'audio').mkdir(parents=True,exist_ok=True)
    page=(src/'index.html').read_text(encoding='utf-8')
    page=page.replace('この比較はこのPC内のみで配信しています。','比較用の参考録音と合成音を公開しています。')
    if name=='treble-comparison':page=page.replace('<main>','<main><p><a href="../first-comparison/">採用した1弦を聴く（開放E・F♯・A）</a> · <a href="../third-comparison/">採用した3弦Gの音を聴く（録音・調整前・調整後）</a></p>',1)
    (dest/'index.html').write_text(page,encoding='utf-8')
    (dest/'manifest.json').write_text((src/'manifest.json').read_text(encoding='utf-8'),encoding='utf-8')
    if name in ['wound-comparison','third-comparison']:
        files=[f'split-{band}-{kind}{suffix}.wav' for band in ['full','low','mid','high'] for kind in ['reference','before','after'] for suffix in ['','-matched']]
    elif name=='first-comparison':
        import json
        config=json.loads((src/'manifest.json').read_text(encoding='utf-8'))
        files=[f'{note["midi"]}-split-{band}-{kind}{suffix}.wav' for note in config['notes'] for band in ['full','low','mid','high'] for kind in ['reference','before','after'] for suffix in ['','-matched']]
    else:
        import json
        config=json.loads((src/'manifest.json').read_text(encoding='utf-8'))
        files=[f'{note["midi"]}-{split}-{band}-{kind}{suffix}.wav' for note in config['notes'] for split in config['splits'] for band in ['full','low','mid','high'] for kind in (['reference','synth'] if note['reference'] else ['synth']) for suffix in ['','-matched']]
    for file in files:shutil.copyfile(src/'audio'/file,dest/'audio'/file)
    print(name,len(files),'excerpts')
page=(source/'index.html').read_text(encoding='utf-8').replace('参考録音を含むページは、このPC内だけで配信しています。','比較用の参考録音と合成音を公開しています。iPhoneでも再生できます。')
page=page.replace('<h1>ギター音色の比較</h1>','<h1>ギター音色の比較</h1><a href="first-comparison/">1弦：採用した開放E・F♯・A</a><a href="treble-comparison/?note=59">2弦B：1弦・3弦から作った音を確認する</a><a href="third-comparison/">3弦G：調整前・調整後・参考録音</a>')
page=page.replace('</html>','<a href="../">ギター演奏画面へ</a></html>')
(out/'index.html').write_text(page,encoding='utf-8')
