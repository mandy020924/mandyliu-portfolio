#!/usr/bin/env python3
"""Stamp local css/js links with the file's mtime (?v=...) so browsers never reuse a stale copy. Run after editing css/js."""
import re, os, glob
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def stamp(m):
    attr, path = m.group(1), m.group(2)
    base = path.split('?')[0]
    full = os.path.normpath(os.path.join(root, os.path.dirname(html), base))
    if not os.path.exists(full): return m.group(0)
    return f'{attr}="{base}?v={int(os.path.getmtime(full))}"'
n = 0
for html in glob.glob(os.path.join(root, '**', '*.html'), recursive=True):
    s = open(html, encoding='utf-8').read()
    t = re.sub(r'\b(href|src)="((?:\.\./)*(?:css|js)/[^"?]+\.(?:css|js))(?:\?v=\d+)?"', stamp, s)
    if t != s: open(html, 'w', encoding='utf-8').write(t); n += 1
print(f'stamped {n} pages')
