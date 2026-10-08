/* A scroll story (the .story sections of a case study): the copy pinned at the left while the pieces on the right go past, one to a slot, each slot
   a stop the page snaps to. As the next stop's top reaches the window's top the copy before dissolves (fades, blurs and lifts away) and the next
   resolves in its place, over the middle 40% of the scroll between the two stops. A scroll that comes to rest between two stops is carried on to the
   stop ahead in the direction it was going (the nearer one if it had none), so a dissolve always completes and one story hands over to the next; a
   wheel, touch or key during the carry hands control straight back. A piece taller than the window may be read to its foot first. Phones show copy
   and piece in turn instead; reduced motion keeps the swap but drops the blur. */
(function () {
  var stories = Array.prototype.slice.call(document.querySelectorAll('.story')); if (!stories.length) return;
  document.documentElement.classList.add('has-story');
  var narrow = matchMedia('(max-width: 900px)'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, ticking = false;
  var S = stories.map(function (el) { return { copies: Array.prototype.slice.call(el.querySelectorAll('.story-text .copy')), slots: Array.prototype.slice.call(el.querySelectorAll('.slot')) }; });
  var stops = [].concat.apply([], S.map(function (s) { return s.slots; }));   // every stop on the page, in order
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function clear(el) { el.style.opacity = ''; el.style.filter = ''; el.style.transform = ''; el.style.pointerEvents = ''; }
  function set(el, a, blur, dy) { el.style.opacity = a.toFixed(3); el.style.filter = reduce || blur < 0.05 ? '' : 'blur(' + blur.toFixed(1) + 'px)';
    el.style.transform = reduce || Math.abs(dy) < 0.05 ? '' : 'translate3d(0,' + dy.toFixed(1) + 'px,0)'; el.style.pointerEvents = a > 0.5 ? '' : 'none'; }
  // where a story stands: 0 with its first stop at the window's top, 1 with its second there, and so on; fractions in between
  function progress(slots) { var tops = slots.map(function (s) { return s.getBoundingClientRect().top; });
    if (tops[0] >= 0) return 0; for (var i = 0; i < tops.length - 1; i++) { if (tops[i + 1] > 0) return i + (-tops[i]) / (tops[i + 1] - tops[i]); } return tops.length - 1; }
  function update() { ticking = false;
    S.forEach(function (s) {
      if (narrow.matches || s.copies.length < 2) { s.copies.forEach(clear); return; }
      var p = progress(s.slots);
      s.copies.forEach(function (c, k) {
        var out = ease((p - k - 0.3) / 0.4), inn = k === 0 ? 1 : ease((p - (k - 1) - 0.3) / 0.4);   // out: gone once the next stop is 70% of the way here; inn: here once this stop is 70% of the way
        set(c, Math.min(1 - out, inn), 12 * Math.max(out, 1 - inn), -16 * out + 16 * (1 - inn)); }); }); }
  var lastY = scrollY, dir = 0, settle = 0, auto = false, autoTimer = 0;
  function go(top) { auto = true; clearTimeout(autoTimer); autoTimer = setTimeout(function () { auto = false; }, 1400); window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' }); }
  function carry() { if (narrow.matches || auto || stops.length < 2) return;
    var tops = stops.map(function (s) { return s.getBoundingClientRect().top; });
    for (var i = 0; i < tops.length - 1; i++) { var a = tops[i], b = tops[i + 1]; if (!(a < 0 && b > 0)) continue;   // the window's top is between these two stops
      var t = -a / (b - a); if (-a < 48 || b < 48) return;                                                              // as good as at one of them (a rail jump lands within a few px)
      if (dir >= 0 && t < 0.5 && stops[i].getBoundingClientRect().bottom > innerHeight + 8) return;                    // still reading a piece taller than the window
      go(tops[dir > 0 ? i + 1 : dir < 0 ? i : (t < 0.5 ? i : i + 1)] + scrollY); return; } }
  addEventListener('scroll', function () { var y = scrollY; dir = y > lastY ? 1 : y < lastY ? -1 : dir; lastY = y;
    if (!ticking) { ticking = true; requestAnimationFrame(update); } if (auto) return; clearTimeout(settle); settle = setTimeout(carry, 140); }, { passive: true });
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, function () { auto = false; }, { passive: true }); });
  addEventListener('resize', update); update(); setTimeout(carry, 300);
})();
