# Mandy Liu portfolio (local mirror)

Offline copy of https://mandyliu.webflow.io/ with every asset downloaded and
all references rewritten to relative paths.

## Run it

Open `index.html` directly, or serve the folder (recommended, so videos and
relative links behave like they do on the live site):

    python3 -m http.server 8000

then visit http://localhost:8000/

## Layout

    index.html                 Home
    about/  visual/  breakfree/  ipsos-facto/
    work/hedraworld/  work/mood-orb/  work/tiktok-internship/
    css/       Webflow stylesheet + self-hosted Google Fonts css
    js/        jQuery + Webflow runtime (interactions, sliders, bg video)
    fonts/     Custom fonts (PP Neue Montreal, PP Editorial Old, Helvetica Neue,
               Apfel Grotezk, DM Serif, …) and Google Fonts woff2 files
    images/    All images incl. responsive srcset variants and CSS backgrounds
    files/     Resume PDFs and background-video mp4/webm files

## Notes

- `/work/flow` is password-protected on Webflow (HTTP 401) so it could not be
  mirrored. Links to it point at the live URL instead.
- Google Analytics and the "Made in Webflow" badge were removed.

## Navigation, scrims, and hero animation

- The top nav is the original Webflow navbar (logo left, links right) restyled to be
  minimal: 13px PP Neue Montreal links, no pills or backgrounds. Tabs are Projects,
  Visual Exploration, LinkedIn icon, Resume, About. Text switches between dark and
  light automatically based on the page background (`data-nav-theme` on <html>).
- Progressive blur scrims sit at the top and bottom edge of the viewport (8 stacked
  backdrop-blur bands, blur doubling per band, modeled on angelinacao.com).
  Height is `--scrim-h` in css/site-fx.css (100px desktop, 90px mobile).
- The hero heading ("Mandy is a Product designer…") animates in word by word from a
  blur on load. Timing lives in the `hwIn` keyframes in css/site-fx.css.

All of this is in `css/site-fx.css` and `js/site-fx.js`; nothing else in the Webflow
export was changed.

## 2026 remodel (from Figma "Web-portfolio-2026")

- `index.html`  new Work page (the site's home): global tab bar (Work / Craft / Time Machine + in / Resume / About),
  header text with inline avatar, and a static grid of grey placeholder cards laid out like the Figma frame.
- `time-machine/index.html`  the previous homepage, moved as-is (paths re-rooted).
- `work/index.html`  redirects up to the root so old `/work/` links still land on the Work page.
- `css/work.css`  styles for the Work page; `css/pp-fonts.css`  self-hosted PP Neue Montreal / PP Editorial Old.
- Craft links to the Visual page (`visual/`); Time Machine holds the previous homepage (`time-machine/`).

## Work page = one template, two builds (tools/canvas/)

`index.html` is GENERATED. The source is `tools/canvas/index.template.html`: header, hero, the nine cards, footer, the
canvas script and the Motion panel, all in one file. The same template builds the prototype artifact, so the site and the
prototype cannot drift apart.

    python3 tools/canvas/build.py                       # writes index.html (and stamps css/js links)
    python3 tools/canvas/build.py --artifact OUT.html   # also writes the prototype page with everything inlined

- Edit text, markup or motion in the template, then run the build. Never edit index.html by hand.
- Motion values live in `DEFAULTS` near the top of the template's script.
- Tuning: open http://localhost:8765/?tune for the Motion panel. Press **Copy values**, paste over `DEFAULTS` in the
  template, run the build. Without `?tune` the page always uses `DEFAULTS`; the panel's own changes stay in your browser.
- Entrance and opening a project (after the "motion ref" recordings): on load every card starts close to you (200%, pushed outward from the
  top centre like a zoomed-in camera, out of focus at 10px blur) and falls back into place and into focus, the nearest cards first, 50ms apart,
  1300ms each. Meanwhile the heading blurs
  in as one block (starts 150ms, 1100ms) and the subtitle after it (starts 550ms, 900ms), all tunable under Orchestration in the Motion panel, which shows a
  timeline of the four elements (grid, header, subtitle, fish tile) with start, duration and blur for each;
  the word-by-word reveal in site-fx.js no longer applies to this page (the h1 has no `fx-words` class);
  a click grows the card into place, blurs the other cards away and shows its details (link comes from the card's `data-href`). Both have
  toggles and sliders in the Motion panel.
- Footer (Figma 4:39518): an ASCII drawing of Michelangelo's Creation of Adam behind three small texts. The drawing is `tools/canvas/footer-art.txt`
  (50 rows x 248 columns, verified against the Figma text node by checksum; the build refuses a file with any other shape). It was set in
  Inconsolata SemiBold; until that font file is added to `fonts/`, a system monospace font stands in. It is real, selectable text laid out at its
  design size and scaled as one piece so its 248 columns always run from the left edge of the window to the right. The drawing rises more slowly
  than the page as the footer scrolls in.
  Layers, back to front: the drawing, the page's bottom blur, the three texts. The texts are pinned to the bottom of the window
  like the nav to the top, with the same inverse ink (white in difference mode: black over the page, white over dark covers); on phones they sit in the flow. The build adds 12 rows of scattered dots above the drawing (fixed
  seed, wavy skyline, denser toward the picture) so the white space grades into it. Around the pointer the symbols scatter like a cloud parting: each fades out on
  its own clock and back as the pointer passes, drifting a few pixels, strongest at the centre and faint at the rim (`CFG` in the footer
  script; the same knobs as the lab). A canvas paints white over each affected cell and redraws it; the text itself is untouched.
- `tools/canvas/ascii-lab.html` (http://localhost:8765/tools/canvas/ascii-lab.html): a standalone lab for the footer's scatter cloud, with sliders for reach,
  soft edge, settling time, shape, drift, breath and centre bias. Not part of the site.
- `tools/canvas/header-lab.html` (http://localhost:8765/tools/canvas/header-lab.html): a standalone lab for a hacker-style heading entrance:
  random symbols fill the lines in, hold, then decode into the real words. Controls for symbol set, order, fill, hold, decode speed, flicker,
  symbol tone and settle. Not used on the site (the site went with a whole-block blur-in instead).
- Debugging scroll jumps: open http://localhost:8765/?debug. A small box lists every sudden page jump: what moved it (script, user, or
  unexplained), from where to where, and what had focus. `?tune&debug` shows both the panel and the box.
- Hover clips: a card can carry a `<video class="cover-video">` after its cover image (Mood.orb has `files/moodorb-hover.mp4`, H.264 1048x948 at ~4.2 Mbps, 3.8 MB).
  It fades in over the still and plays while the card is hovered or held, then pauses and rewinds. Hidden for people with reduced motion.
- Screen carousels: a card can carry `<div class="cover-slides">` with a `.slides-track` of phone screenshots (TikTok has three in
  `images/covers/tiktok/`, the first repeated at the end so the loop is seamless). The phone sits where it does in the Figma cover; while the card
  is hovered or held the screens slide left one by one (600ms slides, 900ms holds, phones spaced 81% of the card apart), each phone shrinking to
  80% as it leaves and growing from 80% as it arrives, and the background crossfading to the next frame's gradient only during a slide (green
  #33B2B3-#B1E2EE, then pink #F62052-#EEB5C2, then blue #00A2C9-#B6E0EB). Each phone is 59% of the card wide at its own proportions, starting 7% down and
  running off the card's bottom edge as in the recording (the screenshots' flat bottom edge stays out of sight). All parts share one 4500ms clock (`tt*` keyframes), declared paused and run only on hover; it rewinds after the pointer leaves.
  Paused at rest, hidden for reduced motion.
- Card positions are on the cards themselves (`--x`, `--y`, `--w` in design px, Figma frame 2147236915).
- The grid runs as a canvas at every width (scaled down to 45% on narrow screens); there is no separate phone layout yet.
