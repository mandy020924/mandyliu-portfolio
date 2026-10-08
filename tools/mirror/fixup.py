import re, os, glob, urllib.request, urllib.parse, hashlib, html
OUT="mandyliu-portfolio"
UA={"User-Agent":"Mozilla/5.0"}
cache={}
def get(url):
    if url in cache: return cache[url]
    name=urllib.parse.unquote(os.path.basename(urllib.parse.urlparse(url).path))
    name=re.sub(r'[^A-Za-z0-9._-]+','_',name)
    r,e=os.path.splitext(name); rel=f"images/{r}-{hashlib.md5(url.encode()).hexdigest()[:6]}{e}"
    d=urllib.request.urlopen(urllib.request.Request(url,headers=UA)).read()
    open(os.path.join(OUT,rel),"wb").write(d); cache[url]=rel; print("dl",rel); return rel
for f in glob.glob(OUT+"/**/*.*",recursive=True):
    if not f.endswith((".html",".css")): continue
    depth=f[len(OUT)+1:].count("/"); pre="../"*depth
    s=open(f,encoding="utf-8").read(); o=s
    # quoted url("...") allowing parentheses inside
    s=re.sub(r'url\((&quot;|["\'])(https://cdn\.prod\.website-files\.com/[^"\']+?)\1\)',
             lambda m: f'url({m.group(1)}{pre}{get(m.group(2))}{m.group(1)})', s)
    # og:image / twitter:image
    s=re.sub(r'(<meta content=")(https://cdn\.prod\.website-files\.com/[^"]+)(" (?:property="og:image"|name="twitter:image"))',
             lambda m: f'{m.group(1)}{pre}{get(m.group(2))}{m.group(3)}', s)
    if s!=o: open(f,"w",encoding="utf-8").write(s); print("fixed",f)
