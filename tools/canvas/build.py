#!/usr/bin/env python3
"""Build the Work page from tools/canvas/index.template.html.

    python3 tools/canvas/build.py                      -> index.html (the site: real files, links live, Motion panel only with ?tune)
    python3 tools/canvas/build.py --artifact OUT.html  -> also the prototype page: everything inlined, links dead, panel always on

Both come from the same template, so the site and the prototype cannot drift apart. Edit the template, never index.html.
"""
import re, base64, os, sys, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEMPLATE = os.path.join(ROOT, 'tools', 'canvas', 'index.template.html')
os.chdir(ROOT)

def b64(path): return base64.b64encode(open(path, 'rb').read()).decode()
def data_uri(path):
    mime = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm'}[os.path.splitext(path)[1].lower()]
    return 'data:%s;base64,%s' % (mime, b64(path))

t = open(TEMPLATE, encoding='utf-8').read()
assert '__SIM__' in t and '__TITLE__' in t and '__FOOTER_ART__' in t
# the footer's ASCII drawing lives in its own file: 50 rows of exactly 248 characters, checked against the Figma text node by checksum
art = open(os.path.join(ROOT, 'tools', 'canvas', 'footer-art.txt'), encoding='utf-8').read().rstrip('\n')
assert all(len(l) == 248 for l in art.split('\n')) and len(art.split('\n')) == 50
# An irregular edge instead of a flat top line: rows of scattered dots are added above the drawing. They start under a wavy skyline and get denser
# toward the drawing, so the white space grades into the picture. A few dots in the drawing's own top rows are also dropped so the join does not show.
# The source file stays exactly as verified against Figma; this is generated here, with a fixed seed so every build gives the same sky.
import random
SKY_ROWS = 12
def smooth(width, scale, seed):
    r = random.Random(seed); pts = [r.random() for _ in range(width // scale + 3)]; out = []
    for x in range(width):
        f = x / scale; i = int(f); u = f - i; u = u * u * (3 - 2 * u); out.append(pts[i] * (1 - u) + pts[i + 1] * u)
    return out
rows = art.split('\n'); COLS = len(rows[0]); rng = random.Random(20260918)
wave = [0.62 * a_ + 0.38 * b_ for a_, b_ in zip(smooth(COLS, 17, 11), smooth(COLS, 5, 12))]        # 0..1, broad hills with small bumps
sky = []
for i in range(SKY_ROWS):
    line = []
    for x in range(COLS):
        h = 2.5 + (SKY_ROWS - 2.5) * wave[x]                                                          # how many rows of sky this column has
        tpos = (i - (SKY_ROWS - h)) / h                                                               # 0 at the skyline, 1 where it meets the drawing
        p = 0.0 if tpos < 0 else 0.05 + 0.70 * (tpos ** 1.5)
        line.append('.' if rng.random() < p else ' ')
    sky.append(''.join(line))
thin = smooth(COLS, 9, 13)
for ri, base in enumerate([0.34, 0.24, 0.15, 0.08, 0.04]):                                            # the drawing's own first rows lose a few dots
    rows[ri] = ''.join(' ' if (c == '.' and rng.random() < base * (0.4 + 1.2 * thin[x])) else c for x, c in enumerate(rows[ri]))
art = '\n'.join(sky + rows)
assert all(len(l) == COLS for l in art.split('\n'))

# three tones, so the picture reads lighter: the background dots are wrapped as the lightest tone, ':' and '-' as a middle tone, the rest is the ink.
# The markup is only colour: selecting and copying the drawing still gives the plain rows.
def tone(ch): return 'd' if ch == '.' else 'm' if ch in ':-' else ''
def shade(row):
    out, run, cls = [], '', None
    for ch in row + '\0':
        c = tone(ch) if ch != '\0' else None
        if c != cls:
            if run: out.append(('<span class="%s">%s</span>' % (cls, run)) if cls else run)
            run, cls = '', c
        if ch != '\0': run += ch.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return ''.join(out)
t = t.replace('__FOOTER_ART__', '\n'.join(shade(r) for r in art.split('\n')))

# ---------- the site ----------
site = t.replace('__SIM__', 'false').replace('__TITLE__', 'Mandy Liu — Work')
site = re.sub(r'<!-- SOURCE of the Work page\..*?-->', '<!-- GENERATED from tools/canvas/index.template.html: edit that file, not this one, then run python3 tools/canvas/build.py -->', site, count=1, flags=re.S)
open('index.html', 'w', encoding='utf-8').write(site)
print('index.html written')

# ---------- the same footer on the other pages ----------
# The template is the footer's source. Each page below carries <!-- site-foot:start --> ... <!-- site-foot:end --> markers; what is between
# them is replaced with the template's footer (drawing included), its root-relative paths rewritten for the page's depth.
FOOT_PAGES = ['work/google-internship/index.html', 'work/adobe-internship/index.html', 'work/tiktok-internship/index.html', 'visual/index.html', 'about/index.html']
foot = re.search(r'<footer class="site-foot">\n.*?</footer>\n<p class="foot-row">.*?</p>', t, re.S).group(0)
for page in FOOT_PAGES:
    depth = page.count('/'); prefix = '../' * depth
    markup = foot.replace('href="about/', 'href="' + prefix + 'about/').replace('src="images/', 'src="' + prefix + 'images/')
    s = open(page, encoding='utf-8').read()
    s2, k = re.subn(r'<!-- site-foot:start -->.*?<!-- site-foot:end -->', lambda m: '<!-- site-foot:start -->\n' + markup + '\n<!-- site-foot:end -->', s, flags=re.S)
    if k: open(page, 'w', encoding='utf-8').write(s2); print('footer placed in', page)
    else: print('no site-foot markers in', page)
subprocess.run([sys.executable, os.path.join('tools', 'bust.py')], check=False)   # stamp css/js links so browsers pick up changes

# ---------- the prototype (artifact) ----------
if '--artifact' in sys.argv:
    out = sys.argv[sys.argv.index('--artifact') + 1]
    a = t.replace('__SIM__', 'true').replace('__TITLE__', 'Work Grid Canvas Pan')

    # stylesheets inline; only the three font faces the page uses
    fonts_css = open('css/pp-fonts.css', encoding='utf-8').read(); keep = []
    for block in re.findall(r'@font-face\s*\{[^}]*\}', fonts_css):
        if re.search(r'PPNeueMontreal-Medium|PPNeueMontreal-Book|PPEditorialOld-Italic-', block):
            m = re.search(r'url\(["\']?\.\./fonts/([^"\')]+)["\']?\)', block)
            keep.append(re.sub(r'src:[^;]*;', 'src: url("data:font/otf;base64,' + b64('fonts/' + m.group(1)) + '") format("opentype");', block))
    assert len(keep) == 3
    css = {'pp-fonts.css': '\n'.join(keep)}
    for name in ['site-fx.css', 'work.css', 'site-foot.css', 'gnav.css']: css[name] = open('css/' + name, encoding='utf-8').read()
    def link_rep(m):
        return '<style>\n' + css[m.group(1)] + '\n</style>'
    a, n = re.subn(r'<link href="css/([^"?]+)(?:\?v=\d+)?" rel="stylesheet" type="text/css"/>', link_rep, a); assert n == 5, n
    a = re.sub(r'<link href="images/[^"]+" rel="(?:shortcut icon|apple-touch-icon)"[^>]*/>\n', '', a)
    a, n = re.subn(r'<script src="js/site-fx.js(?:\?v=\d+)?"></script>', lambda m: '<script>\n' + open('js/site-fx.js', encoding='utf-8').read() + '\n</script>', a); assert n == 1
    a, n = re.subn(r'<script src="js/site-foot.js(?:\?v=\d+)?"></script>', lambda m: '<script>\n' + open('js/site-foot.js', encoding='utf-8').read() + '\n</script>', a); assert n == 1

    # images inline; covers as the lighter 960px JPEGs
    small = os.path.join('tools', 'canvas', 'covers-960'); os.makedirs(small, exist_ok=True)
    def cover(src):
        dst = os.path.join(small, os.path.basename(src).replace('.png', '.jpg'))
        if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
            subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '70', '-Z', '1000', src, '--out', dst], check=True, capture_output=True)
        return dst
    def img_rep(m):
        src = m.group(2).split('?')[0]
        path = cover(src) if src.startswith('images/covers/') else src
        lite = os.path.join('tools', 'canvas', os.path.basename(src).replace('.mp4', '-lite.mp4'))            # a lighter clip keeps the prototype small enough to publish
        if src.endswith('.mp4') and os.path.exists(lite): path = lite
        return '%s"%s"' % (m.group(1), data_uri(path))
    a = re.sub(r'(src=)"((?:images|files)/[^"]+)"', img_rep, a)
    a = re.sub(r' loading="lazy"', '', a)
    a = re.sub(r'href="(?!#)[^"]*"', 'href="#"', a)                                  # simulation: links go nowhere
    open(out, 'w', encoding='utf-8').write(a)
    print('artifact written:', out, round(os.path.getsize(out) / 1024), 'KB; leftover local refs', len(re.findall(r'(?:src|href)="(?:images|css|js|files)/', a)))
