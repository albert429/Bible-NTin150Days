"""Import the user's chronological plan and public-domain eBible USFM archive."""
import json,re,zipfile,sys
from pathlib import Path
root=Path(__file__).resolve().parent.parent
names=['متى','مرقس','لوقا','يوحنا','أعمال الرسل','رومية','كورنثوس الأولى','كورنثوس الثانية','غلاطية','أفسس','فيلبي','كولوسي','تسالونيكي الأولى','تسالونيكي الثانية','تيموثاوس الأولى','تيموثاوس الثانية','تيطس','فليمون','العبرانيين','يعقوب','بطرس الأولى','بطرس الثانية','يوحنا الأولى','يوحنا الثانية','يوحنا الثالثة','يهوذا','رؤيا يوحنا']
codes='MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split()
books={}; z=zipfile.ZipFile(sys.argv[1] if len(sys.argv)>1 else '/tmp/arb-vd.zip')
for name,code in zip(names,codes):
 text=z.read(next(n for n in z.namelist() if re.search('-'+code+r'arb-vd.usfm$',n))).decode('utf-8-sig')
 chapters={}; chapter=None; heading=''; pending=False
 for line in text.splitlines():
  if line.startswith('\\c '): chapter=int(line.split()[1]); chapters[chapter]={}
  elif line.startswith('\\s1 '): heading=line[4:].strip(); pending=True
  elif line.startswith('\\v '):
   m=re.match(r'\\v (\d+)\s+(.*)',line); assert m,line
   verse=int(m[1]); value=m[2].strip()
   value=re.sub(r'\\f .*?\\f\*|\\x .*?\\x\*','',value)
   value=re.sub(r'\\[a-z0-9]+\*?\s?','',value).strip()
   assert '\\' not in value,value
   chapters[chapter][verse]={'number':verse,'text':value,**({'heading':heading} if pending else {})}; pending=False
 books[name]={'code':code,'chapters':chapters}
rows=json.loads((root/'data/source-plan.json').read_text()); plan=[]
for row in rows:
 if not row[0][0].isdigit(): continue
 day=int(row[0][0]); passages=[]
 for raw in row[1]:
  ref=raw.replace('\u200e','').translate(str.maketrans('٠١٢٣٤٥٦٧٨٩','0123456789'))
  m=re.match(r'(.+?)\s+(\d+)(?:-(\d+))?(?::(\d+))?$',ref); assert m,ref
  name,a,b,c=m.groups(); chapter=int(c or a); verses=books[name]['chapters'][chapter]
  if c: start=int(b or a); end=int(a)
  else: assert not b,ref; start=1; end=max(verses)
  assert 1<=start<=end<=max(verses),ref
  chosen=[verses[v] for v in range(start,end+1)]
  passages.append({'book':name,'chapter':chapter,'start':start,'end':end,'verses':chosen})
 plan.append({'day':day,'passages':passages,'verseCount':sum(len(p['verses']) for p in passages)})
assert [p['day'] for p in plan]==list(range(1,151))
expected={(n,c,v) for n,b in books.items() for c,vs in b['chapters'].items() for v in vs}
actual=[(p['book'],p['chapter'],v['number']) for d in plan for p in d['passages'] for v in p['verses']]
missing=expected-set(actual); assert not missing,missing
(root/'data/plan.json').write_text(json.dumps(plan,ensure_ascii=False,separators=(',',':')))
print(f'Validated {len(plan)} days, {sum(len(d["passages"]) for d in plan)} passages, {len(actual)} verse occurrences, {len(expected)} unique verses. Repeated verses: {len(actual)-len(set(actual))}.')
