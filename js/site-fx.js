(function () {
  /* 1. Nav theme: pick light/dark text from the page background */
  function lum(c) { var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c || ''); if (!m || (m[4] !== undefined && +m[4] === 0)) return null; return (0.2126*m[1] + 0.7152*m[2] + 0.0722*m[3]) / 255; }
  var l = lum(getComputedStyle(document.body).backgroundColor); if (l === null) l = lum(getComputedStyle(document.documentElement).backgroundColor); if (l === null) l = 1;
  document.documentElement.setAttribute('data-nav-theme', l > 0.55 ? 'light' : 'dark');
  requestAnimationFrame(function () { requestAnimationFrame(function () { document.documentElement.classList.add('fx-ready'); }); });

  /* 2. Progressive blur scrims (8 stacked backdrop-blur bands, blur doubling per band) */
  function cssNum(name, fallback) { var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); return isNaN(v) ? fallback : v; }
  function scrim(pos) {
    var el = document.createElement('div'); el.className = 'pb-scrim is-' + pos; el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  }
  function layout(el, pos) {
    var H = cssNum('--scrim-h', 160), bleed = cssNum('--scrim-bleed', 40), maxBlur = cssNum('--scrim-max-blur', 6), N = Math.max(3, Math.round(cssNum('--scrim-layers', 8)));
    while (el.children.length < N) { var s = document.createElement('i'); el.appendChild(s); }
    while (el.children.length > N) el.removeChild(el.lastChild);
    var dir = pos === 'top' ? 'to top' : 'to bottom', step = H / N;
    // Target effective blur per band (linear like Figma's progressive blur, or geometric). Bands overlap their
    // neighbour, and stacked blurs compound as sqrt(a^2 + b^2), so each band's own radius is reduced to hit the target.
    var curve = (getComputedStyle(document.documentElement).getPropertyValue('--scrim-curve') || 'linear').trim();
    var radii = [], prev = 0;
    for (var k = 0; k < N; k++) {
      var target = curve === 'linear' ? maxBlur * (k + 1) / N : maxBlur / Math.pow(2, N - 1 - k);
      var own = curve === 'doubling' ? target : Math.sqrt(Math.max(target * target - prev * prev, (target * 0.5) * (target * 0.5)));   // 'doubling' uses the radii as they are, like the reference
      radii.push(own); prev = own;
    }
    Array.prototype.forEach.call(el.children, function (s, i) {
      var a = i * step, b = (i + 1) * step, c = (i + 2) * step, d = (i + 3) * step;
      if (i === N - 1) { a = (N - 2) * step; b = (N - 1) * step; c = H + bleed + 1; d = H + bleed + 2; }   // strongest band runs off the edge
      var mask = 'linear-gradient(' + dir + ', rgba(0,0,0,0) ' + a + 'px, #000 ' + b + 'px, #000 ' + c + 'px, rgba(0,0,0,0) ' + d + 'px)';
      var blur = 'blur(' + radii[i].toFixed(3) + 'px)';
      s.style.zIndex = i + 1; s.style.webkitBackdropFilter = blur; s.style.backdropFilter = blur; s.style.webkitMaskImage = mask; s.style.maskImage = mask;
    });
  }
  var scrims = [['top', scrim('top')], ['bottom', scrim('bottom')]];
  var relayout = function () { scrims.forEach(function (p) { layout(p[1], p[0]); }); };
  relayout(); window.addEventListener('resize', relayout);

  /* 2b. Inverse ink for the global nav: its text and icons are drawn again in white on their own fixed layer that blends with the page in
        "difference" mode, so they read black over light surfaces and white over dark ones. The real nav keeps the pills, the links and the
        accessible text; css/gnav.css makes its ink transparent while this layer is present. */
  var gnav = document.querySelector('.gnav');
  if (gnav && window.CSS && CSS.supports && CSS.supports('mix-blend-mode', 'difference') && !matchMedia('(forced-colors: active)').matches) {
    var ink = gnav.cloneNode(true); ink.classList.add('gnav-ink'); ink.setAttribute('aria-hidden', 'true'); ink.setAttribute('inert', ''); ink.removeAttribute('aria-label');
    Array.prototype.forEach.call(ink.querySelectorAll('a'), function (a) { a.removeAttribute('href'); a.removeAttribute('target'); a.tabIndex = -1; });
    gnav.parentNode.insertBefore(ink, gnav.nextSibling); document.documentElement.classList.add('has-ink');
  }

  /* 3. Hero heading: split into words and animate them in */
  var heads = document.querySelectorAll('h1.hero-heading, .fx-words');
  Array.prototype.forEach.call(heads, function (h) {
    h.removeAttribute('data-w-id'); h.style.opacity = '';       // take over from the Webflow fade
    var idx = 0, nodes = [], walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: function (n) {
      if (n.nodeType === 1 && n.classList.contains('fx-word')) return NodeFilter.FILTER_ACCEPT;     // whole element is one word
      if ((n.nodeType === 3 ? n.parentElement : n).closest('.fx-word')) return NodeFilter.FILTER_REJECT;
      return (n.nodeType === 3 || n.tagName === 'IMG') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; } });
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      if (n.nodeType === 1) { n.classList.add('hw'); n.style.setProperty('--i', idx++); return; }
      if (!n.nodeValue.trim()) return;
      var frag = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach(function (t) {
        if (!t) return;
        if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
        var w = document.createElement('span'); w.className = 'hw'; w.style.setProperty('--i', idx++); w.textContent = t; frag.appendChild(w);
      });
      n.parentNode.replaceChild(frag, n);
    });
    var started = false;
    var go = function () { if (started) return; started = true; setTimeout(function () { h.classList.add('is-in'); }, 30); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    setTimeout(go, 400);   // fallback so the heading always appears even if the fonts promise stalls
  });
})();

/* Leaving one case study for another from a More projects card: the page blurs and fades (css/case-study.css, html.leaving) for 300ms, then the
   next one loads and resolves out of its own blur. Plain clicks only; modifier clicks and new-tab links keep their meaning. Coming back from the
   cache restores the page as it was. */
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a.more-card') : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    e.preventDefault(); document.documentElement.classList.add('leaving'); setTimeout(function () { location.href = a.href; }, 300);
  });
  addEventListener('pageshow', function () { document.documentElement.classList.remove('leaving'); });
})();
