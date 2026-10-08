/* The older case studies (Hedra, Mood.orb, Ipsos Facto, BreakFree) open with a note at the foot of the window, in the case studies' white glass
   (the nav pill's shape): a beat after the page is up it lifts in with the pills' small spring, stays five seconds, and fades. */
(function () {
  var css = '.old-note{position:fixed;left:50%;bottom:28px;z-index:1002;height:28px;padding:6px 15px;box-sizing:border-box;border-radius:22px;'
    + 'background:rgba(255,255,255,.62);-webkit-backdrop-filter:blur(10px) saturate(1.15);backdrop-filter:blur(10px) saturate(1.15);'
    + 'box-shadow:inset 0 0 0 1px rgba(255,255,255,.5),0 6px 18px -8px rgba(0,0,0,.18);'
    + 'font-family:"SF Pro Display",-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif;font-weight:500;font-size:12px;line-height:16px;color:#545454;white-space:nowrap;pointer-events:none;'
    + 'opacity:0;transform:translate(-50%,8px) scale(.98);transition:opacity .35s ease,transform .5s cubic-bezier(.22,.61,.36,1)}'
    + '.old-note.is-on{opacity:1;transform:translate(-50%,0) scale(1);transition:opacity .25s ease,transform .55s cubic-bezier(.34,1.25,.64,1)}'
    + '.old-note b{font-weight:600;color:#000}'
    + '@media (prefers-reduced-motion:reduce){.old-note,.old-note.is-on{transition:opacity .2s ease;transform:translate(-50%,0)}}';
  function go() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var n = document.createElement('div'); n.className = 'old-note'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite');
    n.innerHTML = '<b>Old case study</b>&nbsp;· new stylization coming soon'; document.body.appendChild(n);
    setTimeout(function () { n.classList.add('is-on'); }, 700);                    // a beat after the page is up
    setTimeout(function () { n.classList.remove('is-on'); }, 700 + 5000);          // five seconds
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 700 + 5000 + 800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
