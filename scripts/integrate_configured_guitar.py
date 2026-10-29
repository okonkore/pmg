"""Apply only the additive app hooks, preserving unrelated worktree changes.
Writes an isolated HEAD-based patch for selective staging of index.html.
"""
from pathlib import Path
import subprocess,difflib
ROOT=Path(__file__).resolve().parents[1];p=ROOT/'synth-demo/index.html'
def update(text):
 if 'configured-guitar-app.js' in text:return text
 text=text.replace('<title>Little Red Synth</title>','<title>Little Red Synth</title>\n<link rel="stylesheet" href="configured-guitar.css?v=1">',1)
 return text.replace('</body>', '<script type="module" src="configured-guitar-app.js?v=1"></script>\n</body>',1)
before=p.read_text(encoding='utf8');Path('/tmp/pmg-before-configured-index.html').write_text(before,encoding='utf8');p.write_text(update(before),encoding='utf8')
head=subprocess.check_output(['git','show','HEAD:synth-demo/index.html'],cwd=ROOT,text=True);patch=''.join(difflib.unified_diff(head.splitlines(True),update(head).splitlines(True),fromfile='a/synth-demo/index.html',tofile='b/synth-demo/index.html'));Path('/tmp/pmg-configured-index.patch').write_text(patch,encoding='utf8');print('App hooks added; unrelated edits preserved')
