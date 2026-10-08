/* The home header's entrance for the other pages (css/hero-in.css): the words of .hero-title and .work-sub wrapped in span.w, each numbered by the
   line it falls on (--i), so the lines rise one after another while the blocks blur in whole; the subtitle counts as the line after the heading's
   last. Measured again once the fonts are in and on resize. Reduced motion shows everything in place. */
(function () {
  var hero = document.querySelector('.work-hero'); if (!hero) return;
  var h1 = hero.querySelector('.hero-title'), sub = hero.querySelector('.work-sub'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function wrap(node) { Array.prototype.slice.call(node.childNodes).forEach(function (n) {
    if (n.nodeType === 3) { var frag = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach(function (t) { if (!t) return; if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span'); w.className = 'w'; w.textContent = t; frag.appendChild(w); });
      n.parentNode.replaceChild(frag, n); }
    else if (n.nodeType === 1) { if (n.tagName === 'IMG') n.classList.add('w'); else wrap(n); } }); }
  function lines() { if (!h1) return;
    var lh = parseFloat(getComputedStyle(h1).lineHeight); if (!(lh > 3)) lh = parseFloat(getComputedStyle(h1).fontSize) * (lh || 1.2);
    var tol = lh * 0.4, top = null, li = -1;
    Array.prototype.forEach.call(h1.querySelectorAll('.w'), function (w) { var t = w.getBoundingClientRect().top; if (top === null || Math.abs(t - top) > tol) { li++; top = t; } w.style.setProperty('--i', li); });
    if (sub) Array.prototype.forEach.call(sub.querySelectorAll('.w'), function (w) { w.style.setProperty('--i', li + 1); }); }
  function phrases(node) { Array.prototype.slice.call(node.childNodes).forEach(function (n) {   // the subtitle is a flex row: each text run or element is one piece
    if (n.nodeType === 3) { if (!n.nodeValue.trim()) { n.parentNode.removeChild(n); return; } var w = document.createElement('span'); w.className = 'w'; w.textContent = n.nodeValue.trim(); n.parentNode.replaceChild(w, n); }
    else if (n.nodeType === 1 && !n.classList.contains('w')) { var p = document.createElement('span'); p.className = 'w'; n.parentNode.insertBefore(p, n); p.appendChild(n); } }); }
  if (h1) wrap(h1); if (sub) phrases(sub);
  lines(); hero.classList.add('ripple');
  if (reduce) { hero.classList.add('still'); return; }
  void hero.offsetWidth; hero.classList.add('go');
  if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(lines);
  addEventListener('resize', lines);
})();
