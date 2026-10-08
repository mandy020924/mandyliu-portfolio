/* The site footer: fits the ASCII drawing to the window, floats it as the page ends, and parts it under the pointer. Markup comes from
   tools/canvas/build.py, styles from css/site-foot.css. Any page with <footer class="site-foot"> gets it; the page's bottom blur is switched off. */
(function () {
  var foot = document.querySelector('.site-foot'), art = document.getElementById('footArt'), wrap = document.getElementById('footWrap'); if (!foot || !art || !wrap) return; document.documentElement.classList.add('has-site-foot');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, DESIGN_W = 1728, ticking = false;
  // Edge to edge at any width: the drawing is laid out once at its design size, then scaled like a picture. Sideways it is scaled so its 248 columns
  // span the window exactly, whatever monospace font is standing in for Inconsolata; downwards so its rows fill the footer's height exactly.
  function fit() {
    var W = wrap.clientWidth, H = foot.clientHeight, natural = art.offsetWidth, naturalH = art.offsetHeight; if (!W || !natural || !naturalH) return;
    art.style.setProperty('--foot-kx', (W / natural).toFixed(5)); art.style.setProperty('--foot-ky', (H / naturalH).toFixed(5));   // both measured: Safari rounds the 12.563px rows to 12px, so the design ratio would leave a strip at the bottom
  }
  // Parallax: while the footer scrolls into view the drawing starts a fifth of its height lower and rises more slowly than the page, arriving as the
  // page reaches its end. It floats: the scroll sets a target and the drawing glides toward it, closing the gap with a 220ms time constant (about
  // half a second to settle, whatever the frame rate), so it keeps drifting for a moment after the scroll stops. The closing line drifts with it at
  // a third of the distance.
  var line = document.querySelector('.foot-line'), cur = 0, tgt = 0, gliding = false, first = true, last = 0;
  function target() {
    var r = foot.getBoundingClientRect(), vh = innerHeight, h = r.height || 1, p = Math.max(0, Math.min(1, (vh - r.top) / (h * 0.7)));   // 0 = just entering, 1 = in place, reached with the footer 70% in view
    p = 1 - (1 - p) * (1 - p);                                                                                                        // eases out: quick to arrive, gentle at the end
    return (1 - p) * h * 0.2;
  }
  function glide(ts) {
    ts = ts || performance.now(); var dt = Math.min(200, Math.max(1, ts - last)); last = ts;
    var d = tgt - cur; if (Math.abs(d) < 0.15) { cur = tgt; gliding = false; } else { cur += d * (1 - Math.exp(-dt / 220)); gliding = true; requestAnimationFrame(glide); }
    wrap.style.setProperty('--foot-y', cur.toFixed(1) + 'px'); if (line) line.style.setProperty('--line-y', (cur * 0.33).toFixed(1) + 'px');
    if (live.size) kickCloud();                                              // the drawing moved under a still pointer
  }
  function move() {
    ticking = false; if (reduce) return;
    tgt = target(); if (first) { first = false; cur = tgt; }               // the first frame lands where it should, no glide in from zero
    if (!gliding) { last = performance.now() - 16; glide(); }
  }

  /* ---------- the cloud: symbols scatter out of the pointer's way ----------
     Every symbol the pointer reaches fades away on its own clock and fades back as the pointer passes, drifting a few pixels while it goes. The reach
     is not a circle: it wanders around its rim, stretches along the movement and frays at the edge, so it reads as a cloud parting. The real text is
     untouched (still selectable); a canvas over it paints white over each affected cell and redraws that symbol faded and nudged. Mouse only. */
  var CFG = { reach: 60, soft: 0.6, settle: 340, wobble: 0.4, grain: 0.9, drift: 1, breath: 0.4, falloff: 3.5 };   // Mandy's values from tools/canvas/ascii-lab.html (Drift 4 px = 1)
  var rows = art.textContent.split('\n'), ROWS = rows.length, COLS = rows[0].length, NC = ROWS * COLS;
  var chars = new Array(NC), seed = new Float32Array(NC), seed2 = new Float32Array(NC);
  for (var r0 = 0; r0 < ROWS; r0++) for (var c0 = 0; c0 < COLS; c0++) { var ii = r0 * COLS + c0; chars[ii] = rows[r0].charAt(c0); seed[ii] = Math.random(); seed2[ii] = Math.random(); }
  var cloud = document.createElement('canvas'); cloud.className = 'foot-cloud'; cloud.setAttribute('aria-hidden', 'true'); wrap.appendChild(cloud);
  var cx2 = cloud.getContext('2d'), open = new Float32Array(NC), live = new Set(), PH = [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];
  var mx = -1e9, my = -1e9, inside = false, raf = 0, lastT = 0, vx = 0, vy = 0, pmx = 0, pmy = 0, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var nextFrame = /[?&]timer\b/.test(location.search) ? function (cb) { return setTimeout(function () { cb(performance.now()); }, 16); } : function (cb) { return requestAnimationFrame(cb); };   // ?timer: keeps it running in a hidden tab, for testing
  function kickCloud() { if (!raf) raf = nextFrame(drawCloud); }
  function reachAt(x, y, T) {   // how strongly the pointer reaches a point on screen: a drifting blob, stretched along the movement
    var R = CFG.reach, sp = Math.min(1, Math.hypot(vx, vy) / 900), len = Math.hypot(vx, vy) || 1, ux = sp ? vx / len : 1, uy = sp ? vy / len : 0, stretch = 1 + 1.8 * sp * CFG.wobble;
    var dx = x - mx, dy = y - my, along = dx * ux + dy * uy, across = -dx * uy + dy * ux; dx = along / stretch; dy = across;
    var th = Math.atan2(dy, dx), wob = 1 + CFG.wobble * (0.55 * Math.sin(3 * th + T * 0.9 + PH[0]) + 0.3 * Math.sin(5 * th - T * 1.4 + PH[1]) + 0.15 * Math.sin(8 * th + T * 2.3 + PH[2]));
    return Math.hypot(dx, dy) / wob;
  }
  function drawCloud(now) {
    raf = 0; var dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000)); lastT = now; var T = now / 1000;
    var rect = art.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), kx = rect.width / art.offsetWidth, ky = rect.height / art.offsetHeight;
    var cw = rect.width / COLS, chh = rect.height / ROWS, lx = mx - rect.left, ly = my - rect.top;                   // pointer in the drawing's screen space
    vx += ((mx - pmx) / Math.max(0.008, dt) - vx) * 0.25; vy += ((my - pmy) / Math.max(0.008, dt) - vy) * 0.25; pmx = mx; pmy = my;
    var R = CFG.reach, inner = R * (1 - CFG.soft), decay = Math.exp(-dt * 1000 / CFG.settle);
    if (inside) { var Rm = R * (1 + CFG.wobble) * 2.8, r0 = Math.max(0, Math.floor((ly - Rm) / chh)), r1 = Math.min(ROWS - 1, Math.ceil((ly + Rm) / chh)), c0 = Math.max(0, Math.floor((lx - Rm) / cw)), c1 = Math.min(COLS - 1, Math.ceil((lx + Rm) / cw));
      for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) { var i = r * COLS + c; if (chars[i] === ' ') continue;
        var d = reachAt(rect.left + (c + 0.5) * cw, rect.top + (r + 0.5) * chh, T) + (seed[i] - 0.5) * R * 0.6 * CFG.grain; if (d >= R) continue;
        var u = Math.min(1, Math.max(0, (d - inner) / Math.max(1, R - inner))), target = Math.pow(1 - u * u * (3 - 2 * u), CFG.falloff);   // steep: strong at the centre, faint at the rim
        if (target > open[i]) { open[i] += (target - open[i]) * 0.45; live.add(i); } } }
    var dpr = Math.min(2, window.devicePixelRatio || 1), Wc = Math.round(rect.width * dpr), Hc = Math.round(rect.height * dpr);
    if (cloud.width !== Wc || cloud.height !== Hc) { cloud.width = Wc; cloud.height = Hc; cloud.style.width = rect.width + 'px'; cloud.style.height = rect.height + 'px'; }
    cloud.style.transform = 'translate(' + (rect.left - wr.left).toFixed(1) + 'px,' + (rect.top - wr.top).toFixed(1) + 'px)';
    var cs = getComputedStyle(art), fcs = getComputedStyle(foot), fsz = parseFloat(cs.fontSize), adv = art.offsetWidth / COLS, rowH = art.offsetHeight / ROWS;
    var tones = { ink: cs.color, mid: fcs.getPropertyValue('--art-mid').trim() || cs.color, dot: fcs.getPropertyValue('--art-dot').trim() || cs.color };
    cx2.setTransform(1, 0, 0, 1, 0, 0); cx2.clearRect(0, 0, Wc, Hc); cx2.setTransform(kx * dpr, 0, 0, ky * dpr, 0, 0);       // draw in the drawing's own design units
    cx2.font = cs.fontWeight + ' ' + fsz + 'px ' + cs.fontFamily; cx2.textBaseline = 'alphabetic'; cx2.textAlign = 'center';
    var tm = cx2.measureText('M'), A = tm.fontBoundingBoxAscent || fsz * 0.8, D = tm.fontBoundingBoxDescent || fsz * 0.2, base = (A - D) / 2;
    live.forEach(function (i) { var o = open[i] * decay; open[i] = o; if (o < 0.01) { open[i] = 0; live.delete(i); return; }
      var r = (i / COLS) | 0, c = i - r * COLS, ch = chars[i];
      cx2.globalAlpha = 1; cx2.fillStyle = '#fff'; cx2.fillRect(c * adv - 0.3, r * rowH - 0.3, adv + 0.6, rowH + 0.6);               // cover the real symbol
      var gate = seed[i] + 0.16 * Math.sin(now / 420 + seed[i] * 40) + 0.08 * Math.sin(now / 150 + seed2[i] * 40);                   // its own slowly wandering threshold
      var a = Math.max(0, Math.min(1, (gate - o) / CFG.breath + 0.5)); if (a <= 0.01) return;                                           // fades over a band, not a switch
      var gone = 1 - a, sx = rect.left + (c + 0.5) * cw, sy = rect.top + (r + 0.5) * chh, dx0 = sx - mx, dy0 = sy - my, dd = Math.hypot(dx0, dy0) || 1;
      var drift = 4 * CFG.drift * gone, away = 3 * CFG.drift * o;
      var ox = (drift * Math.sin(now / 700 + seed[i] * 60) + away * dx0 / dd) / kx, oy = (drift * Math.cos(now / 560 + seed2[i] * 60) + away * dy0 / dd) / ky;
      cx2.globalAlpha = a * (1 - 0.15 * o); cx2.fillStyle = ch === '.' ? tones.dot : (ch === ':' || ch === '-') ? tones.mid : tones.ink;
      cx2.fillText(ch, (c + 0.5) * adv + ox, (r + 0.5) * rowH + base + oy); });
    cx2.globalAlpha = 1;
    if (live.size || inside) kickCloud();
  }
  if (fine) {
    foot.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; mx = e.clientX; my = e.clientY; if (!inside) { inside = true; pmx = mx; pmy = my; } kickCloud(); }, { passive: true });
    foot.addEventListener('pointerleave', function () { inside = false; kickCloud(); });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(move); } }
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', function () { fit(); move(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(); move(); });
  fit(); move();
})();
