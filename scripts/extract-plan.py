"""Extract the reading table, preserving original paragraph and passage order."""
import json, sys, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
source=Path(sys.argv[1]); ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile(source) as archive:
    root=ET.fromstring(archive.read('word/document.xml'))
rows=[[[ ''.join(t.text or '' for t in p.findall('.//w:t',ns)) for p in cell.findall('.//w:p',ns)] for cell in row.findall('w:tc',ns)] for row in root.findall('.//w:tr',ns)]
(Path(__file__).resolve().parent.parent/'data/source-plan.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print('Extracted',len(rows)-1,'daily entries')
