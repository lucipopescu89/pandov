/*
 * PANDOV — gold motes in the crevices of the burnt trunk, in the homepage's
 * MAKING photograph (2026-10-30, the author's asking; a trial).
 *
 * The motes run only inside the dark grooves of the wood, never on its lit
 * ridges. The grooves' centre lines were traced from the photograph itself
 * (making-sculpture.jpg, 2400 x 1858) and checked point by point: dark,
 * darker than the ridges either side, in an unlit part of the wood, with the
 * grain, and well away from the outline, the vase and the grass. Each line
 * runs from its lower end to its upper end, a point every `step` px.
 *
 * The motes go in trains, all at one speed, a fixed gap apart, rising along
 * their crevice. They come up out of the crevice at its lower end and sink
 * back into it at its upper end, so they read as inside the wood.
 *
 * The bigger the crevice, the more motes: each line carries a size (0..1)
 * from its length and the depth of its groove. The small ones carry trains
 * of 3 or 4, the larger ones up to 7. The six long crevices the author marked
 * on 2026-10-30 (traced end to end as the darkest groove between the ends
 * the author showed) carry 8 to 12, and up to two trains at a time, one
 * behind the other; every other crevice carries one train at a time.
 *
 * Remove: window.__pfxGrain.remove()
 */
(() => {
  if (window.__pfxGrain) window.__pfxGrain.remove();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const D = __PATHS__;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // each crevice: its points and the distance along it at each point (image px)
  const LINES = D.lines.map(({ p, size, major }) => {
    const xs = [], ys = [], d = [0];
    for (let i = 0; i < p.length; i += 2) { xs.push(p[i]); ys.push(p[i + 1]); }
    for (let i = 1; i < xs.length; i++) d.push(d[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
    return { xs, ys, d, L: d[d.length - 1], size, major, cap: major ? 2 : 1, on: [] };
  });
  // the point at distance t along a line
  const pointAt = (ln, t) => {
    const d = ln.d; let lo = 0, hi = d.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (d[m] <= t) lo = m; else hi = m; }
    const u = (t - d[lo]) / ((d[hi] - d[lo]) || 1);
    return [ln.xs[lo] + (ln.xs[hi] - ln.xs[lo]) * u, ln.ys[lo] + (ln.ys[hi] - ln.ys[lo]) * u];
  };

  // speed: screen px per second, the same for every train; gap: screen px
  // between motes; ends: screen px over which a mote rises out of / sinks
  // back into the crevice at either end.
  const CFG = { trains: 16, speed: 11, gap: 7, ends: 14 };
  // motes in a train, by the crevice's size
  const howMany = ln => ln.major
    ? 8 + Math.floor(Math.random() * 5)                                  // 8..12
    : Math.max(3, Math.min(7, 3 + Math.round(ln.size * 4.5) - (Math.random() < .5 ? 1 : 0)));

  let box = null, W = 0, H = 0, s = 1, raf, visible = false, io, ro, last = 0, frame = 0;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas');
  cv.className = 'pfx-grain';
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
  const ctx = cv.getContext('2d');

  const size = () => {
    if (!box) return;
    const r = box.getBoundingClientRect();
    if (!r.width) return;
    W = r.width; H = r.height; s = W / D.w;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  // Find the photograph and lay the canvas over it. Checked twice a second:
  // the page can be left and come back to (the site moves between pages
  // without reloading), and then the photograph is a new element.
  const attach = () => {
    const im = document.querySelector('img[alt^="A white vase"]');
    const b = im && im.parentElement;
    if (!b) { box = null; visible = false; return; }
    if (b === box && cv.parentElement === b) return;
    box = b; box.appendChild(cv);
    io && io.disconnect(); ro && ro.disconnect();
    io = new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { rootMargin: '100px' });
    io.observe(box);
    ro = new ResizeObserver(size); ro.observe(box);
    size();
  };

  // a crevice with room for another train; the longer ones, and the
  // author's six most of all, more often
  const weight = l => l.L * (l.major ? 2 : 1);
  const pick = () => {
    const free = LINES.filter(l => l.on.length < l.cap);
    let sum = 0; for (const l of free) sum += weight(l);
    let r = Math.random() * sum;
    for (const l of free) { r -= weight(l); if (r <= 0) return l; }
    return free[free.length - 1];
  };

  const trains = [];
  const spawn = (T, first) => {
    if (T.ln) T.ln.on = T.ln.on.filter(o => o !== T);
    T.ln = pick();
    T.n = howMany(T.ln);
    T.r = rnd(.5, 1);
    T.a = rnd(.45, .75);
    T.ph = rnd(0, 6.28);
    // the head starts somewhere in the crevice's lower part (anywhere, on the
    // first frame); the motes behind it come up out of the crevice's end
    T.t = first ? rnd(0, T.ln.L) : rnd(0, T.ln.L * .4);
    // a second train in the same crevice starts well behind the first one's
    // tail (it may start below the crevice's end, and come up out of it)
    for (const o of T.ln.on) T.t = Math.min(T.t, o.t - (o.n - 1) * CFG.gap / s - 4 * CFG.gap / s);
    T.ln.on.push(T);
    T.fade = first ? 1 : 0;
  };

  const tick = now => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(64, now - (last || now)); last = now;
    if (frame++ % 30 === 0) attach();
    if (!box || !visible) return;
    ctx.clearRect(0, 0, W, H);
    ctx.shadowColor = 'rgba(240,212,155,.6)'; ctx.shadowBlur = 2.5;
    const step = CFG.speed * dt / 1000 / s;      // image px this frame
    const gap = CFG.gap / s, ends = CFG.ends / s;
    for (const T of trains) {
      T.t += step;
      T.fade = Math.min(1, T.fade + dt / 1200);
      const L = T.ln.L;
      if (T.t - (T.n - 1) * gap > L) { spawn(T, false); continue; }
      const tw = .85 + .15 * Math.sin(now / 1400 + T.ph);
      for (let i = 0; i < T.n; i++) {
        const t = T.t - i * gap;
        if (t <= 0 || t >= L) continue;
        // rise out of / sink back into the crevice at its two ends
        const e = Math.min(1, t / ends, (L - t) / ends);
        const al = T.a * tw * T.fade * e * e;
        if (al < .01) continue;
        const [x, y] = pointAt(T.ln, t);
        ctx.beginPath();
        ctx.arc(x * s, y * s, T.r * (.6 + .4 * e), 0, 6.283);
        ctx.fillStyle = 'rgba(240,214,160,' + al.toFixed(3) + ')';
        ctx.fill();
      }
    }
  };

  for (let i = 0; i < Math.min(CFG.trains, LINES.length - 2); i++) { const T = {}; spawn(T, true); trains.push(T); }
  raf = requestAnimationFrame(tick);

  window.__pfxGrain = {
    cfg: CFG,
    remove() { cancelAnimationFrame(raf); io && io.disconnect(); ro && ro.disconnect(); cv.remove(); delete window.__pfxGrain; },
  };
})();
