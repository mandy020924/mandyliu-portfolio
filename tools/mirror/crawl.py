import re, os, sys, urllib.request, urllib.parse, hashlib, html
from collections import deque

BASE = "https://mandyliu.webflow.io"
OUT = "mandyliu-portfolio"
os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120 Safari/537.36"}

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(), r.headers.get("Content-Type","")

import json
MANIFEST = os.path.join(OUT, ".manifest.json")
asset_map = {}
if os.path.exists(MANIFEST):
    asset_map = {k:v for k,v in json.load(open(MANIFEST)).items() if os.path.exists(os.path.join(OUT,v))}
failed = []

def ext_for(url, ctype):
    path = urllib.parse.urlparse(url).path
    ext = os.path.splitext(path)[1].lower()
    if ext: return ext
    m = {"text/css":".css","application/javascript":".js","text/javascript":".js","image/png":".png","image/jpeg":".jpg","image/gif":".gif","image/svg+xml":".svg","image/webp":".webp","font/woff2":".woff2","font/woff":".woff","application/pdf":".pdf","video/mp4":".mp4"}
    for k,v in m.items():
        if k in ctype: return v
    return ""

def local_name(url, ctype):
    p = urllib.parse.urlparse(url)
    name = urllib.parse.unquote(os.path.basename(p.path)) or "file"
    name = re.sub(r'[^A-Za-z0-9._-]+', '_', name)
    ext = ext_for(url, ctype)
    if not name.lower().endswith(ext): name += ext
    h = hashlib.md5(url.encode()).hexdigest()[:6]
    root, e = os.path.splitext(name)
    return f"{root}-{h}{e}"

def folder_for(ext):
    if ext == ".css": return "css"
    if ext == ".js": return "js"
    if ext in (".woff",".woff2",".ttf",".otf",".eot"): return "fonts"
    if ext in (".pdf",".mp4",".webm",".mov"): return "files"
    return "images"

def abs_url(u, page_url):
    u = html.unescape(u.strip()).strip().strip('"\'').strip()
    if not u or u.startswith(("data:","mailto:","tel:","javascript:","#")): return None
    return urllib.parse.urljoin(page_url, u)

def download_asset(url, page_url=BASE+"/"):
    url = abs_url(url, page_url)
    if not url: return None
    url_nofrag = url.split("#")[0]
    if url_nofrag in asset_map: return asset_map[url_nofrag]
    if "googletagmanager" in url_nofrag or "google-analytics" in url_nofrag:
        return None
    try:
        data, ctype = fetch(url_nofrag)
    except Exception as e:
        failed.append((url_nofrag, str(e))); return None
    ext = ext_for(url_nofrag, ctype)
    name = local_name(url_nofrag, ctype)
    folder = folder_for(ext)
    rel = f"{folder}/{name}"
    dest = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if ext == ".css":
        text = data.decode("utf-8","replace")
        text = rewrite_css(text, url_nofrag, depth=1)
        data = text.encode("utf-8")
    with open(dest,"wb") as f: f.write(data)
    asset_map[url_nofrag] = rel
    print("asset", rel, file=sys.stderr)
    return rel

def rewrite_css(text, css_url, depth):
    prefix = "../"*depth
    def rep(m):
        q, u = m.group(1), m.group(2)
        rel = download_asset(u, css_url)
        return f"url({q}{prefix}{rel}{q})" if rel else m.group(0)
    text = re.sub(r'url\((["\']?)([^)"\']+)\1\)', rep, text)
    def rep_imp(m):
        rel = download_asset(m.group(2), css_url)
        return f'@import "{prefix}{rel}"' if rel else m.group(0)
    text = re.sub(r'@import\s+(["\'])([^"\']+)\1', rep_imp, text)
    return text


def google_fonts_local(families):
    key = "css/google-fonts.css"
    if key in asset_map.values(): return key
    fam = "|".join(f.replace(" ", "+") for f in families)
    url = "https://fonts.googleapis.com/css?family=" + fam + "&display=swap"
    data, _ = fetch(url)
    text = rewrite_css(data.decode(), url, depth=1)
    with open(os.path.join(OUT, key), "w") as f: f.write(text)
    asset_map[url] = key
    print("asset", key, file=sys.stderr)
    return key

# --- crawl pages ---
pages = {}   # path -> html
queue = deque(["/"])
seen = set(["/"])

def page_to_file(path):
    path = path.strip("/")
    return "index.html" if not path else path + "/index.html"

def prefix_for(path):
    depth = len([p for p in path.strip("/").split("/") if p])
    return "../"*depth

while queue:
    path = queue.popleft()
    url = BASE + path
    try:
        data, ctype = fetch(url)
    except Exception as e:
        failed.append((url, str(e))); continue
    doc = data.decode("utf-8","replace")
    pages[path] = doc
    print("page", path, file=sys.stderr)
    for m in re.finditer(r'href="(/[^"#?]*)', doc):
        p = m.group(1).rstrip("/") or "/"
        if p not in seen and not os.path.splitext(p)[1]:
            seen.add(p); queue.append(p)

# --- rewrite pages ---
for path, doc in pages.items():
    page_url = BASE + path
    pre = prefix_for(path)

    def attr_rep(m):
        attr, u = m.group(1), m.group(2)
        a = abs_url(u, page_url)
        if not a: return m.group(0)
        if a.startswith(BASE):
            p = urllib.parse.urlparse(a)
            if not os.path.splitext(p.path)[1]:
                target = p.path.rstrip("/") or "/"
                local = page_to_file(target)
                frag = ("#"+p.fragment) if p.fragment else ""
                return f'{attr}="{pre}{local}{frag}"'
        if "google" in a and ("gtag" in a or "tagmanager" in a):
            return f'{attr}=""'
        if attr == "href" and "website-files.com" not in a and not os.path.splitext(urllib.parse.urlparse(a).path)[1]:
            return m.group(0)   # external link, leave alone
        rels = []
        for part in u.split(","):
            rel = download_asset(part, page_url)
            rels.append(f"{pre}{rel}" if rel else part)
        return f'{attr}="{",".join(rels)}"'

    doc = re.sub(r'\b(href|src|poster|data-src|data-poster|data-poster-url|data-video-src|data-video-urls)="([^"]+)"', attr_rep, doc)

    def srcset_rep(m):
        parts = []
        for item in m.group(2).split(","):
            item = item.strip()
            if not item: continue
            bits = item.split()
            rel = download_asset(bits[0], page_url)
            bits[0] = f"{pre}{rel}" if rel else bits[0]
            parts.append(" ".join(bits))
        return f'{m.group(1)}="{", ".join(parts)}"'
    doc = re.sub(r'\b(srcset|data-srcset)="([^"]+)"', srcset_rep, doc)

    # inline style url() and <style> blocks
    def style_rep(m):
        return rewrite_css_inline(m.group(0))
    def rewrite_css_inline(s):
        def rep(m):
            q, u = m.group(1), m.group(2)
            rel = download_asset(u, page_url)
            return f"url({q}{pre}{rel}{q})" if rel else m.group(0)
        return re.sub(r'url\((["\']?)([^)"\']+)\1\)', rep, s)
    doc = re.sub(r'<style[^>]*>.*?</style>', style_rep, doc, flags=re.S)
    doc = re.sub(r'style="[^"]*url\([^"]*"', style_rep, doc)

    # remove google analytics inline script
    doc = re.sub(r'<script[^>]*>\s*window\.dataLayer.*?</script>', '', doc, flags=re.S)
    doc = re.sub(r'<script[^>]*src=""[^>]*></script>', '', doc)
    doc = re.sub(r'<link href="https://[^"]+" rel="preconnect"[^>]*/?>', '', doc)
    # replace webfont.js + WebFont.load with local Google Fonts css
    m = re.search(r'WebFont\.load\(\{\s*google:\s*\{\s*families:\s*(\[[^\]]*\])', doc)
    if m:
        fams = json.loads(m.group(1))
        rel = google_fonts_local(fams)
        doc = re.sub(r'<script src="[^"]*webfont[^"]*"[^>]*></script>', '', doc)
        doc = re.sub(r'<script[^>]*>\s*WebFont\.load\(.*?\);?\s*</script>', '', doc, flags=re.S)
        doc = doc.replace('</head>', f'<link href="{pre}{rel}" rel="stylesheet" type="text/css"/>\n</head>', 1)

    dest = os.path.join(OUT, page_to_file(path))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest,"w",encoding="utf-8") as f: f.write(doc)

json.dump(asset_map, open(MANIFEST,"w"), indent=1)
print("\nPAGES:", len(pages))
print("ASSETS:", len(asset_map))
if failed:
    print("FAILED:")
    for u,e in failed: print(" ", u, e)
