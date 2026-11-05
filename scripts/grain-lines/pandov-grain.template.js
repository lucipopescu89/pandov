/*
 * PANDOV — gold motes in the crevices of the burnt trunk, in the homepage's
 * MAKING photograph (making-sculpture.jpg, 2400 x 2287 since 2026-11-05).
 *
 * The crevices are the author's own lines, drawn in Figma over the
 * photograph (2026-10-31). D.lines holds them in the photograph's pixels,
 * each from its lower end to its upper end, so the motes always rise.
 * Written by scripts/grain-lines/from-figma.py from the Figma export and
 * scripts/grain-lines/pandov-grain.template.js: edit the template, not this.
 *
 * The motes go in trains, all at one base speed, a fixed gap apart, rising
 * along their crevice. They come up out of the crevice at its lower end and
 * sink back into it at its upper end, so they read as inside the wood.
 * Every train has 10 to 20 motes, at random, whatever the crevice's length.
 * The head of the train is the brightest; behind it each mote is a little
 * more transparent, down to almost nothing at the tail.
 * The longest crevices can carry two trains at a time, one behind the other.
 *
 * Under the pointer a train runs nine times as fast, easing up to speed and
 * back down again when the pointer leaves it.
 *
 * A click on the photograph sends a train up every crevice at once, from the
 * lower ends, faster than the others. Up to two such waves at a time: a
 * third click fades the oldest wave out and sends a new one. (The photograph
 * is no longer a link to /making: components/making-section.tsx.)
 * While a wave runs, the trains already rising speed up to the wave's speed
 * too, easing up to it, and ease back down to the base speed once the last
 * wave has gone (2026-11-02, the author's asking).
 *
 * Drawing: the motes of a frame are sorted into a few steps of opacity and
 * each step is drawn as one shape (thousands of separate draws per frame were
 * what made several waves stutter); their soft gold glow is a CSS
 * drop-shadow on the whole canvas, done by the graphics card in one pass.
 *
 * Remove: window.__pfxGrain.remove()
 */
(() => {
  if (window.__pfxGrain) window.__pfxGrain.remove();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const D = { w: 2400, h: 2287, lines: __LINES__ };

  const rnd = (a, b) => a + Math.random() * (b - a);

  // each crevice: its points and the distance along it at each point (image px)
  const LINES = D.lines.map(p => {
    const xs = [], ys = [], d = [0];
    for (let i = 0; i < p.length; i += 2) { xs.push(p[i]); ys.push(p[i + 1]); }
    for (let i = 1; i < xs.length; i++) d.push(d[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
    const L = d[d.length - 1];
    return { xs, ys, d, L, cap: L >= 400 ? 2 : 1, on: [] };
  });
  // the point at distance t along a line
  const pointAt = (ln, t) => {
    const d = ln.d; let lo = 0, hi = d.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (d[m] <= t) lo = m; else hi = m; }
    const u = (t - d[lo]) / ((d[hi] - d[lo]) || 1);
    return [ln.xs[lo] + (ln.xs[hi] - ln.xs[lo]) * u, ln.ys[lo] + (ln.ys[hi] - ln.ys[lo]) * u];
  };

  // trains: running at once; speed: screen px per second, the same for every
  // train; gap: screen px
  // between motes; ends: screen px over which a mote rises out of / sinks
  // back into the crevice at either end; motes: per train, min and max;
  // tail: how quickly the motes fade towards the tail (1 = evenly);
  // hover: speed under the pointer (x base), its reach in screen px, and how
  // long the change of speed takes (ms); burst: speed of a click's wave
  // (x base); waves: how many waves can run at once.
  const CFG = {
    trains: 32, speed: 11, gap: 7, ends: 14,
    motes: [10, 20], tail: 1.3,
    hover: 9, reach: 30, ease: 350,
    burst: 4, waves: 2,
  };

  let box = null, W = 0, H = 0, s = 1, raf, visible = false, io, ro, last = 0, frame = 0;
  let px = -1e9, py = -1e9;                       // pointer, in the photograph's screen px
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas');
  cv.className = 'pfx-grain';
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;' +
    'filter:drop-shadow(0 0 2.5px rgba(240,212,155,.6))';
  const ctx = cv.getContext('2d');

  // the motes of a frame, by steps of opacity: x, y, radius for each
  const STEPS = 16, AMAX = .9;
  const bins = Array.from({ length: STEPS }, () => []);

  const size = () => {
    if (!box) return;
    const r = box.getBoundingClientRect();
    if (!r.width) return;
    W = r.width; H = r.height; s = W / D.w;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const onMove = e => { const r = box.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; };
  const onLeave = () => { px = py = -1e9; };
  const onClick = () => wave();
  // Find the photograph and lay the canvas over it. Checked twice a second:
  // the page can be left and come back to (the site moves between pages
  // without reloading), and then the photograph is a new element.
  const attach = () => {
    const im = document.querySelector('img[alt^="A white vase"]');
    const b = im && im.parentElement;
    if (!b) { box = null; visible = false; return; }
    if (b === box && cv.parentElement === b) return;
    unhook();
    box = b; box.appendChild(cv);
    box.addEventListener('pointermove', onMove, { passive: true });
    box.addEventListener('pointerleave', onLeave, { passive: true });
    box.addEventListener('click', onClick);
    box.style.cursor = 'pointer';
    io && io.disconnect(); ro && ro.disconnect();
    io = new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { rootMargin: '100px' });
    io.observe(box);
    ro = new ResizeObserver(size); ro.observe(box);
    size();
  };

  function unhook() {
    if (!box) return;
    box.removeEventListener('pointermove', onMove); box.removeEventListener('pointerleave', onLeave);
    box.removeEventListener('click', onClick); box.style.cursor = '';
  }

  // a crevice with room for another train; the longer ones more often
  const pick = () => {
    const free = LINES.filter(l => l.on.length < l.cap);
    let sum = 0; for (const l of free) sum += l.L;
    let r = Math.random() * sum;
    for (const l of free) { r -= l.L; if (r <= 0) return l; }
    return free[free.length - 1];
  };

  const trains = [];
  const spawn = (T, first) => {
    if (T.ln) T.ln.on = T.ln.on.filter(o => o !== T);
    T.ln = pick();
    T.n = CFG.motes[0] + Math.floor(Math.random() * (CFG.motes[1] - CFG.motes[0] + 1));
    T.r = rnd(.5, 1);
    T.a = rnd(.5, .8);
    T.ph = rnd(0, 6.28);
    T.v = 1;                                      // speed, x base
    // the head starts somewhere in the crevice's lower part (anywhere, on the
    // first frame); the motes behind it come up out of the crevice's end
    T.t = first ? rnd(0, T.ln.L) : rnd(0, T.ln.L * .4);
    // a second train in the same crevice starts well behind the first one's
    // tail (it may start below the crevice's end, and come up out of it)
    for (const o of T.ln.on) T.t = Math.min(T.t, o.t - (o.n - 1) * CFG.gap / s - 4 * CFG.gap / s);
    T.ln.on.push(T);
    T.fade = first ? 1 : 0;
  };

  // a click: one train in every crevice, all coming up from the lower ends
  // together; they run once and are gone
  const waves = [];
  const wave = () => {
    // too many: the oldest still running fades out
    const live = waves.filter(w => !w.dying);
    if (live.length >= CFG.waves) live[0].dying = true;
    waves.push({ dying: false, trains: LINES.map(ln => ({
      ln, n: CFG.motes[0] + Math.floor(Math.random() * (CFG.motes[1] - CFG.motes[0] + 1)),
      r: rnd(.5, 1), a: rnd(.55, .85), ph: rnd(0, 6.28), v: CFG.burst, base: CFG.burst,
      t: rnd(0, 6) / s, fade: 1, done: false,
    })) });
  };

  const tick = now => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(64, now - (last || now)); last = now;
    if (frame++ % 30 === 0) attach();
    if (!box || !visible) return;
    if (!W) size();
    ctx.clearRect(0, 0, W, H);
    const step = CFG.speed * dt / 1000 / s;      // image px this frame, at base speed
    const gap = CFG.gap / s, ends = CFG.ends / s;
    const reach2 = CFG.reach * CFG.reach, k = Math.min(1, dt / CFG.ease);
    // while a wave runs, every train already rising goes at the wave's speed
    const boost = waves.some(w => !w.dying) ? CFG.burst : 1;
    // move and draw one train; for a wave's train, say whether it is done
    const run = (T, regular, dying) => {
      // is the pointer on this train? (any of its motes within reach)
      let near = false;
      if (px > -1e8) for (let i = 0; i < T.n && !near; i += 2) {
        const t = T.t - i * gap;
        if (t <= 0 || t >= T.ln.L) continue;
        const [x, y] = pointAt(T.ln, t);
        const dx = x * s - px, dy = y * s - py;
        near = dx * dx + dy * dy < reach2;
      }
      const base = regular ? boost : T.base;
      T.v += ((near ? Math.max(CFG.hover, base) : base) - T.v) * k;
      T.t += step * T.v;
      // never run into the train ahead in the same crevice
      if (regular) for (const o of T.ln.on) if (o !== T && o.t > T.t) T.t = Math.min(T.t, o.t - (o.n + 2) * gap);
      if (dying) { T.fade -= dt / 600; if (T.fade <= 0) { T.done = true; return; } }
      else T.fade = Math.min(1, T.fade + dt / 1200);
      const L = T.ln.L;
      if (T.t - (T.n - 1) * gap > L) { if (regular) spawn(T, false); else T.done = true; return; }
      const tw = .85 + .15 * Math.sin(now / 1400 + T.ph);
      for (let i = 0; i < T.n; i++) {
        const t = T.t - i * gap;
        if (t <= 0 || t >= L) continue;
        // rise out of / sink back into the crevice at its two ends
        const e = Math.min(1, t / ends, (L - t) / ends);
        // fainter and fainter towards the tail
        const tail = Math.pow(1 - i / T.n, CFG.tail);
        const al = T.a * tw * T.fade * e * e * tail;
        if (al < .01) continue;
        const [x, y] = pointAt(T.ln, t);
        bins[Math.min(STEPS - 1, Math.floor(al / AMAX * STEPS))].push(x * s, y * s, T.r * (.6 + .4 * e));
      }
    };
    for (const T of trains) run(T, true, false);
    for (let w = waves.length - 1; w >= 0; w--) {
      let left = 0;
      for (const T of waves[w].trains) if (!T.done) { run(T, false, waves[w].dying); if (!T.done) left++; }
      if (!left) waves.splice(w, 1);
    }
    // each step of opacity as one shape
    ctx.fillStyle = 'rgb(240,214,160)';
    for (let k = 0; k < STEPS; k++) {
      const b = bins[k];
      if (!b.length) continue;
      ctx.globalAlpha = (k + .5) / STEPS * AMAX;
      ctx.beginPath();
      for (let i = 0; i < b.length; i += 3) { ctx.moveTo(b[i] + b[i + 2], b[i + 1]); ctx.arc(b[i], b[i + 1], b[i + 2], 0, 6.283); }
      ctx.fill();
      b.length = 0;
    }
    ctx.globalAlpha = 1;
  };

  for (let i = 0; i < Math.min(CFG.trains, LINES.length - 2); i++) { const T = {}; spawn(T, true); trains.push(T); }
  raf = requestAnimationFrame(tick);

  window.__pfxGrain = {
    cfg: CFG,
    lines: LINES,
    wave,
    remove() {
      cancelAnimationFrame(raf); io && io.disconnect(); ro && ro.disconnect();
      unhook();
      cv.remove(); delete window.__pfxGrain;
    },
  };
})();
