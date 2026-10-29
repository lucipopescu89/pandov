/*
 * PANDOV — atmosphere effects (2026-10-28, the author's asking).
 *
 * Tried live in the browser first, one change at a time, and kept as the author
 * approved them. Loaded once from app/layout.tsx with next/script; it lives
 * outside React on purpose, so that taking it out is one line: delete the
 * <Script src="/pandov-fx.js"> in the layout and the site is exactly as before.
 *
 * What it does:
 *   - every full load: a short fade up from black, the logo and menu rising in,
 *     a faint gold hairline under a menu word on hover (the words themselves
 *     do not widen or glow: the author took that out), and a 1px gold
 *     scroll-progress line at the top of the screen;
 *   - everywhere: elements come in softly as they scroll into view (2px blur,
 *     6px rise, 1.1s), except the text column of the pendant pages (.pp-info),
 *     which the author wanted instant;
 *   - homepage: gold dust in the dark band round the logo and menu from the
 *     first frame; behind the doors, dust seen only through the opening between
 *     them, from "We Open The Doors Of Perception" on; the O's of that line are
 *     small planets that bend a passing mote's path and sling it on at constant
 *     speed; Presence breathes the dust outward, reborn just inside the first
 *     ellipse; both lines dim to half a second after they are lit;
 *   - Second Wind, Silence: the section's own dotted animation is hidden and the
 *     same dust drifts there, with the pendant's head as the planet, drawn
 *     behind the piece (masked by its silhouette).
 *
 * It reads the page, it does not change the site's components. That is why
 * some of it measures what is on screen: the doors' opening is read from the
 * doors' canvas pixels, the O's from the text's glyph boxes. A tidier version
 * would take those from hero-animation.tsx itself (it knows the frame it is
 * on); that is the next step if these effects stay.
 */
(() => {
  if (window.__pandovFXLoaded) return;
  window.__pandovFXLoaded = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const E = 'cubic-bezier(.2,.7,.2,1)';

  // ======================= GLOBAL + HOMEPAGE =======================
  function installHome() {
    const cfg = { react: .09, G: 110, soft: 38, range: 150, boost: 1.7, side: .32 };
    const css = `
@keyframes pfx-veil{0%{opacity:1}100%{opacity:0;visibility:hidden}}
@keyframes pfx-rise-h{0%{opacity:0;translate:0 14px}100%{opacity:1;translate:0 0}}
.pfx-veil{position:fixed;inset:0;background:#0d0d0d;z-index:99998;pointer-events:none;animation:pfx-veil 1.8s cubic-bezier(.6,0,.2,1) .2s forwards}
header img,header nav a{opacity:0;animation:pfx-rise-h 1.6s ${E} forwards}
header a img:first-child{animation-delay:.5s}
header a img:nth-child(2){animation-delay:.85s}
header nav a:nth-child(1){animation-delay:1.2s}
header nav a:nth-child(2){animation-delay:1.35s}
header nav a:nth-child(3){animation-delay:1.5s}
header nav a{position:relative}
header nav a::after{content:'';position:absolute;left:50%;bottom:-7px;width:0;height:1px;background:linear-gradient(90deg,transparent,rgba(214,178,110,.45),transparent);transform:scaleY(.6);transition:width .9s ${E},left .9s ${E}}
header nav a:hover::after{width:70%;left:15%}
.pfx-r{opacity:0;filter:blur(2px);translate:0 6px;transition:opacity 1.1s ${E},filter 1.1s ${E},translate 1.1s ${E}}
text.pfx-r{translate:none}
.pfx-r.pfx-in{opacity:1;filter:blur(0);translate:0 0}
.pp-info .pfx-r{opacity:1!important;filter:none!important;translate:none!important;transition:none!important}
.pfx-dust{position:fixed;inset:0;pointer-events:none;z-index:9996}
.pfx-rule{position:fixed;left:0;top:0;height:1px;width:100%;transform-origin:0 50%;scale:0 1;z-index:9999;background:linear-gradient(90deg,transparent,#d6b26e 60%,#f3dfae);opacity:.7;pointer-events:none}
`;
    const style = document.createElement('style'); style.id = 'pfx-style'; style.textContent = reduce ? '' : css; document.head.appendChild(style);
    const nodes = []; const add = (cls, tag = 'div') => { const e = document.createElement(tag); e.className = cls; document.body.appendChild(e); nodes.push(e); return e; };
    if (!reduce) add('pfx-veil');
    const rule = add('pfx-rule'); const dust = add('pfx-dust', 'canvas');
    const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; rule.style.scale = (h > 0 ? scrollY / h : 0) + ' 1'; };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();

    const ctx = dust.getContext('2d'); let W, H; const dpr = Math.min(devicePixelRatio, 2);
    const size = () => { W = innerWidth; H = innerHeight; dust.width = W * dpr; dust.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);

    const N = 110, motes = [];
    let alpha = 0, power = 0, raf, frameN = 0, seeded = false, latched = false, txtPeak = false, txtPeakY = 0;
    const ROWS = 14; let gap = null;
    const look = m => { m.r = rnd(.3, 1.1); m.a = rnd(.22, .6); m.d = rnd(0, 6.28); m.born = 0; m.cool = [0, 0, 0, 0, 0, 0, 0, 0]; m.inside = [0, 0, 0, 0, 0, 0, 0, 0]; m.flung = 0; };
    const spawnScatter = (m, R) => { m.x = rnd(R.left, R.right); m.y = rnd(Math.max(R.top, 0), Math.min(R.bottom, H)); m.vx = rnd(-.08, .08); m.vy = rnd(-.08, .02); look(m); };
    let ring = { cx: 0, cy: 0, rx: 100, ry: 140 };
    // reborn just inside the first ellipse (78–92% of it), heading outward
    const spawnRing = m => { const ang = rnd(0, 6.28), k = rnd(.78, .92); m.x = ring.cx + Math.cos(ang) * ring.rx * k; m.y = ring.cy + Math.sin(ang) * ring.ry * k; const sp = rnd(.05, .18); m.vx = Math.cos(ang) * sp * ring.rx / ring.ry; m.vy = Math.sin(ang) * sp; look(m); };
    const heroOf = img => { let e = img; while (e && e !== document.body) { if (getComputedStyle(e).position === 'sticky') return e; e = e.parentElement; } return null; };

    // The opening between the doors, as the hero itself draws it (2026-10-29).
    // hero-animation.tsx clips text 1 to the opening on every frame, from its
    // measured GAP table, with an inline `clip-path: inset(0 Rpx 0 Lpx)` on the
    // layer that spans the canvas. Reading that clip gives the exact opening in
    // every browser. Reading the canvas pixels (below, kept as the fallback)
    // depended on the ground decoding as exactly #202020: in Chrome and Edge on
    // Windows it did not always, the opening came out empty and the dust behind
    // the doors was clipped away while the header's dust still showed.
    let clipLayer = null;
    const clipGap = (sticky, cv, cr) => {
      if (!clipLayer || !clipLayer.isConnected || !sticky.contains(clipLayer)) {
        clipLayer = null;
        for (const e of sticky.querySelectorAll('div')) { if (/inset\(/.test(e.style.clipPath || e.style.webkitClipPath || '')) { clipLayer = e; break; } }
        if (!clipLayer) return null;
      }
      const lr = clipLayer.getBoundingClientRect(); if (!lr.width || !cr.width) return null;
      // the browser shortens it (`inset(0px 360px)` when both sides match), so
      // read it as CSS does: one to four lengths, top right bottom left
      const m = (clipLayer.style.clipPath || clipLayer.style.webkitClipPath || '').match(/inset\(([^)]*)\)/);
      if (!m) return null;
      const v = m[1].split(/\s+round\s+/)[0].trim().split(/\s+/);
      if (!v.length || v.length > 4) return null;
      const px = t => { const n = parseFloat(t); if (!isFinite(n)) return NaN; return /%$/.test(t) ? n / 100 * lr.width : n; };
      const R = px(v[1] ?? v[0]), L = px(v[3] ?? v[1] ?? v[0]);
      if (!isFinite(R) || !isFinite(L)) return null;
      const k = cv.width / cr.width, off = lr.left - cr.left;
      const le = Math.max(0, (off + L) * k), rs = Math.min(cv.width, (off + lr.width - R) * k);
      const row = [le, Math.max(le, rs)];
      return Array.from({ length: ROWS }, () => row.slice());
    };

    // Fallback: the opening read off the doors' canvas row by row:
    // the right door begins where the wood turns bright; the left door ends at
    // the last pixel that is not the ground (#202020) before it.
    const VOID = 32;
    const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const readGap = cv => {
      let c2; try { c2 = cv.getContext('2d'); } catch (e) { return null; }
      if (!c2) return null;
      const w = cv.width, h = cv.height, res = [];
      for (let i = 0; i < ROWS; i++) {
        const y = Math.floor((i + .5) / ROWS * h); let d; try { d = c2.getImageData(0, y, w, 1).data; } catch (e) { return null; }
        const v = x => d[x * 4];
        let rs = w;
        for (let x = 0; x < w - 24; x += 2) { let s = 0; for (let k = 0; k < 24; k += 3) s += v(x + k); if (s / 8 > 44) { rs = x; break; } }
        let le = 0;
        for (let x = Math.min(rs - 4, w - 1); x >= 1; x--) { if (Math.abs(v(x) - VOID) > 4 && Math.abs(v(x - 1) - VOID) > 2) { le = x + 1; break; } }
        res.push([le, rs]);
      }
      // keep the opening coherent: the left door's shadowed parts look like the ground
      const mL = med(res.map(r => r[0])), mR = med(res.map(r => r[1]));
      return res.map(([l, r]) => [Math.max(l, mL - 50), Math.min(r, mR + 50)]);
    };

    // The O's of "We Open The Doors Of Perception", as planets.
    let wells = [];
    const findWells = txt => {
      const out = []; const walker = document.createTreeWalker(txt, NodeFilter.SHOW_TEXT); let n;
      while ((n = walker.nextNode())) {
        for (let i = 0; i < n.data.length; i++) {
          if (/o/i.test(n.data[i])) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); const b = r.getBoundingClientRect(); if (b.width > 0) out.push({ x: b.left + b.width / 2, y: b.top + b.height / 2 }); }
        }
      }
      return out.slice(0, 8);
    };

    // The dark band with the logo and menu: its own calm dust from the first frame.
    const TN = 45, topDust = []; let topAlpha = 0, topSeeded = false;
    const topZone = sticky => { const hd = document.querySelector('header'); if (!hd) return null; return { a: hd.getBoundingClientRect().top + scrollY, b: sticky.getBoundingClientRect().top + scrollY }; };
    const spawnTop = (m, z) => { m.x = rnd(0, W); m.py = rnd(z.a, z.b); m.vx = rnd(-.08, .08); m.vy = rnd(-.06, .02); m.r = rnd(.3, 1.1); m.a = rnd(.22, .6); m.d = rnd(0, 6.28); m.born = 0; };

    let txtEl = null;
    const tick = t => {
      raf = requestAnimationFrame(tick); frameN++;
      ctx.clearRect(0, 0, W, H);
      const img = location.pathname === '/' ? document.querySelector('.presence-img') : null;
      const sticky = img && heroOf(img);
      if (!sticky) { alpha = 0; seeded = false; gap = null; latched = false; txtPeak = false; topSeeded = false; topAlpha = 0; txtEl = null; return; }
      ctx.shadowColor = 'rgba(240,212,155,.6)'; ctx.shadowBlur = 3;

      // --- top band ---
      const z = topZone(sticky);
      if (z && z.b > z.a) {
        if (!topSeeded) { topDust.length = 0; for (let i = 0; i < TN; i++) { const m = {}; spawnTop(m, z); m.born = rnd(0, 1); topDust.push(m); } topSeeded = true; }
        topAlpha += (1 - topAlpha) * .02;
        const y0 = z.a - scrollY, y1 = Math.min(z.b - scrollY, H);
        if (y1 > 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(0, Math.max(0, y0), W, y1 - Math.max(0, y0));
          for (const im of document.querySelectorAll('header img')) { const r = im.getBoundingClientRect(); ctx.moveTo(r.left - 4, r.top - 4); ctx.lineTo(r.left - 4, r.bottom + 4); ctx.lineTo(r.right + 4, r.bottom + 4); ctx.lineTo(r.right + 4, r.top - 4); ctx.closePath(); }
          ctx.clip('nonzero');
          for (const m of topDust) {
            m.vx += Math.sin(t / 3200 + m.d) * .0025; m.vy += Math.cos(t / 4100 + m.d * 1.7) * .0015 - .0012;
            m.vx *= .988; m.vy *= .988; const sp = Math.hypot(m.vx, m.vy); if (sp > .22) { m.vx *= .22 / sp; m.vy *= .22 / sp; }
            m.x += m.vx; m.py += m.vy; m.born = Math.min(1, m.born + .008);
            if (m.x < -6) m.x = W + 4; if (m.x > W + 6) m.x = -4;
            if (m.py < z.a - 6 || m.py > z.b + 6) spawnTop(m, z);
            const tw = m.a * (.65 + .35 * Math.sin(t / 1100 + m.d * 3)) * m.born * topAlpha; if (tw < .01) continue;
            ctx.beginPath(); ctx.arc(m.x, m.py - scrollY, m.r, 0, 7); ctx.fillStyle = 'rgba(240,214,160,' + tw + ')'; ctx.fill();
          }
          ctx.restore();
        }
      }

      // --- the door scene ---
      const cv = sticky.querySelector('canvas'); if (!cv) return;
      const cr = cv.getBoundingClientRect();
      const cg = clipGap(sticky, cv, cr);
      if (cg) gap = cg;
      else if (frameN % 2 === 0) { const g = readGap(cv); if (g) { if (!gap) gap = g.map(p => p.slice()); else gap = gap.map((p, i) => [p[0] + (g[i][0] - p[0]) * .4, p[1] + (g[i][1] - p[1]) * .4]); } }
      const openFrac = gap ? gap.reduce((s, g) => s + Math.max(0, g[1] - g[0]), 0) / (ROWS * cv.width) : 0;
      if (!txtEl || !txtEl.isConnected) txtEl = [...sticky.querySelectorAll('span')].find(s => /Doors Of Perception/i.test(s.textContent)) || null;
      let txtOp = 0; if (txtEl) { let e = txtEl; txtOp = 1; while (e && e !== sticky) { txtOp *= parseFloat(getComputedStyle(e).opacity); e = e.parentElement; } }
      if (txtEl && txtOp > .02 && frameN % 6 === 0) wells = findWells(txtEl);
      const op = parseFloat(getComputedStyle(img).opacity);
      if (txtOp > .02 || op > .02) latched = true;
      else if (openFrac < .9) latched = false;
      // once the line is fully lit, scrolling on starts the outward breath early
      if (txtOp > .97 && !txtPeak) { txtPeak = true; txtPeakY = scrollY; }
      if (!latched) txtPeak = false;
      let pre = 0;
      if (txtPeak) pre = Math.max(1 - txtOp, Math.min(1, Math.max(0, (scrollY - txtPeakY) / 40)));
      const target = Math.max(pre, Math.min(1, Math.max(0, op / .35)));
      alpha += ((latched ? 1 : 0) - alpha) * (latched ? .025 : .08);
      power += (target - power) * (target > power ? cfg.react : .03);
      if (alpha < .005) { seeded = false; return; }
      const R = sticky.getBoundingClientRect();
      if (!seeded) { motes.length = 0; for (let i = 0; i < N; i++) { const m = {}; spawnScatter(m, R); m.born = rnd(0, 1); motes.push(m); } seeded = true; }
      const svg = img.parentElement.children[0].querySelector('svg'), el = svg && svg.querySelector('ellipse');
      if (svg && el) { const sr = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; ring = { cx: sr.left + sr.width / 2, cy: sr.top + sr.height / 2, rx: el.rx.baseVal.value / vb.width * sr.width, ry: el.ry.baseVal.value / vb.height * sr.height }; }
      ctx.save();
      ctx.beginPath();
      if (gap && op < .98) {
        const sx = cr.width / cv.width, sy = cr.height / cv.height;
        const L = gap.map((g, i) => [cr.left + g[0] * sx, cr.top + (i + .5) / ROWS * cv.height * sy]), Rr = gap.map((g, i) => [cr.left + g[1] * sx, cr.top + (i + .5) / ROWS * cv.height * sy]);
        L[0][1] = cr.top; Rr[0][1] = cr.top; L[ROWS - 1][1] = cr.bottom; Rr[ROWS - 1][1] = cr.bottom;
        ctx.moveTo(L[0][0], L[0][1]); L.forEach(p => ctx.lineTo(p[0], p[1])); for (let i = ROWS - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]); ctx.closePath();
      } else ctx.rect(R.left, R.top, R.width, R.height);
      ctx.clip();
      const maxD = Math.hypot(ring.rx, ring.ry) * 2.6;
      const grav = txtOp * (1 - power * .6);
      for (const m of motes) {
        const dx = m.x - ring.cx, dy = m.y - ring.cy, d = Math.hypot(dx, dy) || 1;
        if (!m.flung) { m.vx += Math.sin(t / 3200 + m.d) * .0025 * (1 - power * .7); m.vy += Math.cos(t / 4100 + m.d * 1.7) * .0015 - .0012 * (1 - power); }
        const push = power * (.004 + .010 / (1 + d / 220)); m.vx += dx / d * push; m.vy += dy / d * push;
        let inField = 0, near = 0;
        // planets: a soft, wide pull that bends the path, entered from the side;
        // past the closest point the mote is slung on and keeps that speed.
        if (grav > .01 && !m.flung) wells.forEach((w, i) => {
          if (m.flung) return;
          if (m.cool[i] > 0) { m.cool[i]--; return; }
          const ox = m.x - w.x, oy = m.y - w.y, gd = Math.hypot(ox, oy) || 1;
          if (gd > cfg.range) { m.inside[i] = 0; return; }
          if (!m.inside[i]) {
            m.inside[i] = 1;
            let sp = Math.hypot(m.vx, m.vy); const ux = sp > .02 ? m.vx / sp : -ox / gd, uy = sp > .02 ? m.vy / sp : -oy / gd;
            const sgn = (ox * uy - oy * ux) >= 0 ? 1 : -1; const tx = -oy / gd * sgn, ty = ox / gd * sgn;
            sp = Math.max(sp, rnd(.45, .7)); m.vx = ux * sp + tx * cfg.side * sp * 1.6; m.vy = uy * sp + ty * cfg.side * sp * 1.6;
          }
          inField = 1;
          const a = cfg.G * grav / (gd * gd + cfg.soft * cfg.soft); m.vx -= ox / gd * a; m.vy -= oy / gd * a;
          near = Math.max(near, Math.exp(-gd / 60));
          const vr = (m.vx * ox + m.vy * oy) / gd;
          if (vr > 0 && gd < cfg.range * .6) {
            const sp = Math.hypot(m.vx, m.vy) || 1, S = Math.max(1.1, sp * cfg.boost) * rnd(.9, 1.15);
            m.vx = m.vx / sp * S; m.vy = m.vy / sp * S; m.inside[i] = 0; m.cool[i] = 300; m.flung = 1;
          }
        });
        if (!m.flung) { if (inField) { m.vx *= .998; m.vy *= .998; } else { m.vx *= .988; m.vy *= .988; } }
        const sp = Math.hypot(m.vx, m.vy), cap = (m.flung || inField) ? 3 : (.22 + power * .45); if (sp > cap) { m.vx *= cap / sp; m.vy *= cap / sp; }
        m.x += m.vx; m.y += m.vy;
        m.born = Math.min(1, m.born + .008);
        const out = m.x < R.left - 10 || m.x > R.right + 10 || m.y < R.top - 10 || m.y > R.bottom + 10 || (power > .3 && d > maxD);
        if (out) { if (power > .3) spawnRing(m); else spawnScatter(m, R); }
        const edge = power > .3 ? Math.max(0, 1 - Math.pow(d / maxD, 2)) : 1;
        const glow = 1 + near * .6 + (m.flung ? .4 : 0);
        const tw = m.a * (.65 + .35 * Math.sin(t / 1100 + m.d * 3)) * m.born * edge * alpha * glow;
        if (tw < .01) continue;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fillStyle = 'rgba(240,214,160,' + Math.min(1, tw) + ')'; ctx.fill();
      }
      ctx.restore();
    };
    if (!reduce) raf = requestAnimationFrame(tick);

    // --- soft entrance as things scroll into view ---
    let queue = [], qt;
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); queue.push(e.target); } });
      queue.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      if (!qt) qt = setInterval(() => {
        const el = queue.shift(); if (!el) { clearInterval(qt); qt = null; return; }
        el.classList.add('pfx-in');
        setTimeout(() => { el.classList.remove('pfx-r', 'pfx-in'); el.dataset.pfxDone = 1; }, 1200);
      }, 160);
    }, { rootMargin: '0px 0px -10% 0px' });
    // leave alone anything the site already animates (inline opacity/transform, pinned scenes)
    const animatedBySite = el => { let e = el.parentElement; while (e && e.tagName !== 'MAIN' && e !== document.body) { const s = e.getAttribute('style') || ''; if (/opacity|transform/.test(s) || getComputedStyle(e).position === 'sticky') return true; e = e.parentElement; } return /opacity|transform/.test(el.getAttribute('style') || ''); };
    const scan = () => {
      const root = document.querySelector('main') || document.body;
      [...root.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,span,img,video,svg text,button')].filter(el => {
        if (el.closest('header,footer,.pp-info') || el.classList.contains('pfx-r') || el.dataset.pfxDone || el.classList.contains('presence-img')) return false;
        if (animatedBySite(el)) return false;
        if (/^(SPAN|P|H\d)$/.test(el.tagName)) { if (el.parentElement.closest('p,h1,h2,h3,h4,h5,h6,li')) return false; if (!el.textContent.trim()) return false; if (el.tagName === 'SPAN' && el.querySelector('p,div')) return false; }
        if (el.tagName === 'IMG' && el.getBoundingClientRect().width < 8) return false;
        return true;
      }).forEach(el => { el.classList.add('pfx-r'); io.observe(el); });
    };
    if (!reduce) scan();
    const mo = new MutationObserver(() => { clearTimeout(mo.t); mo.t = setTimeout(scan, 250); });
    if (!reduce) mo.observe(document.body, { childList: true, subtree: true });

    // a short dip to black when moving between Mind, Body, Space and the homepage
    let path = location.pathname;
    const pt = setInterval(() => {
      if (location.pathname === path) return;
      const a = path.split('/')[1], b = location.pathname.split('/')[1]; path = location.pathname;
      if (a !== b && !reduce) { const v = add('pfx-veil'); v.style.animation = 'pfx-veil 1.2s cubic-bezier(.6,0,.2,1) forwards'; setTimeout(() => v.remove(), 1500); }
    }, 150);

    window.__pandovFX = {
      remove() { cancelAnimationFrame(raf); clearInterval(pt); clearInterval(qt); io.disconnect(); mo.disconnect(); removeEventListener('scroll', onScroll); removeEventListener('resize', size); nodes.forEach(n => n.remove()); style.remove(); document.querySelectorAll('.pfx-r,.pfx-in').forEach(e => e.classList.remove('pfx-r', 'pfx-in')); },
      dbg: () => ({ alpha: +alpha.toFixed(2), topAlpha: +topAlpha.toFixed(2), power: +power.toFixed(2) }),
    };
  }

  // ======================= HOMEPAGE: the two lines dim to half =======================
  function installDim() {
    const st = document.createElement('style');
    // a filter, not opacity: the hero drives the lines' own opacity
    st.textContent = '.pfx-dimable{transition:filter 1.2s cubic-bezier(.4,0,.2,1)}.pfx-dim{filter:opacity(.5)}';
    document.head.appendChild(st);
    const norm = s => s.replace(/\s+/g, '').toLowerCase();
    const KEYS = ['doorsofperception', 'giveformtopresence'];
    const cache = {};
    const find = k => {
      if (cache[k] && cache[k].isConnected) return cache[k];
      const el = [...document.querySelectorAll('main span, main div, main p')].filter(e => norm(e.textContent).includes(k) && ![...e.children].some(c => norm(c.textContent).includes(k)))[0];
      cache[k] = el || null; return cache[k];
    };
    const state = new Map();
    const effOp = el => { let e = el, v = 1; while (e && e !== document.body) { v *= parseFloat(getComputedStyle(e).opacity); e = e.parentElement; } return v; };
    const iv = setInterval(() => {
      if (location.pathname !== '/') return;
      KEYS.forEach(k => {
        const el = find(k); if (!el) return;
        el.classList.add('pfx-dimable');
        let s = state.get(el); if (!s) { s = { timer: null, shown: false }; state.set(el, s); }
        const own = effOp(el);
        if (own > .9 && !s.shown) { s.shown = true; s.timer = setTimeout(() => el.classList.add('pfx-dim'), 1000); }
        if (own < .05 && s.shown) { s.shown = false; clearTimeout(s.timer); el.classList.remove('pfx-dimable', 'pfx-dim'); void el.offsetWidth; el.classList.add('pfx-dimable'); }
      });
    }, 150);
    window.__pfxDim = { remove() { clearInterval(iv); st.remove(); document.querySelectorAll('.pfx-dim,.pfx-dimable').forEach(e => e.classList.remove('pfx-dim', 'pfx-dimable')); } };
  }

  // ======================= SECOND WIND: Silence =======================
  function installSilence() {
    const cfg = { G: 190, soft: 50, range: 230, boost: 1.7, side: .32, N: 90 };
    const cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9995'; document.body.appendChild(cv);
    const ctx = cv.getContext('2d'); let W, H; const dpr = Math.min(devicePixelRatio, 2);
    const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    const hideStyle = document.createElement('style'); hideStyle.textContent = '.pfx-silence-off{visibility:hidden!important}'; document.head.appendChild(hideStyle);
    // the pendant's silhouette, so the dust passes behind the piece
    let mask = null;
    const buildMask = src => {
      const im = new Image(); im.src = src;
      im.decode().then(() => {
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const id = x.getImageData(0, 0, c.width, c.height), d = id.data;
        for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = l > 44 ? 255 : 0; }
        x.putImageData(id, 0, 0);
        const c2 = document.createElement('canvas'); c2.width = c.width; c2.height = c.height; const x2 = c2.getContext('2d');
        x2.filter = 'blur(3px)'; x2.drawImage(c, 0, 0); x2.filter = 'none'; x2.drawImage(c, 0, 0); mask = c2;
      }).catch(() => {});
    };
    let sec = null, rectEl = null, canvasEl = null, src = null;
    const find = () => {
      sec = null; const bp = document.querySelector('.bp-canvas'); if (!bp) return;
      for (const s of bp.children) { if ([...s.querySelectorAll('text')].some(t => /^\s*Silence\s*$/i.test(t.textContent))) { sec = s; break; } }
      if (!sec) return;
      canvasEl = sec.querySelector('canvas'); rectEl = sec.querySelector('rect.bp-pendant');
      const im = sec.querySelector('image'); const s2 = im && (im.getAttribute('href') || im.getAttribute('xlink:href'));
      if (s2 && s2 !== src) { src = s2; buildMask(src); }
      if (canvasEl) canvasEl.classList.add('pfx-silence-off');
    };
    const HEAD = { fx: .492, fy: .161 }; // the head's ring, measured on silence-pendant.avif
    const motes = []; let alpha = 0, seeded = false, raf, frame = 0;
    const look = m => { m.r = rnd(.3, 1.1); m.a = rnd(.22, .6); m.d = rnd(0, 6.28); m.born = 0; m.inside = 0; m.flung = 0; };
    const spawn = (m, Z) => { m.x = rnd(Z.l, Z.r); m.py = rnd(Z.t, Z.b); m.vx = rnd(-.08, .08); m.vy = rnd(-.08, .02); look(m); };
    const tick = t => {
      raf = requestAnimationFrame(tick); frame++; ctx.clearRect(0, 0, W, H);
      if (frame % 30 === 1 || !sec || !sec.isConnected) find();
      if (!sec || !rectEl) { alpha = 0; seeded = false; return; }
      const sr = sec.getBoundingClientRect();
      const Z = { l: Math.max(0, sr.left), r: Math.min(W, sr.right), t: sr.top + scrollY, b: sr.bottom + scrollY };
      const vis = sr.bottom > 0 && sr.top < H;
      alpha += ((vis ? 1 : 0) - alpha) * .03;
      if (!vis && alpha < .01) { seeded = false; return; }
      if (!seeded) { motes.length = 0; for (let i = 0; i < cfg.N; i++) { const m = {}; spawn(m, Z); m.born = rnd(0, 1); motes.push(m); } seeded = true; }
      const pb = rectEl.getBoundingClientRect();
      const hx = pb.left + pb.width * HEAD.fx, hy = pb.top + pb.height * HEAD.fy + scrollY;
      ctx.shadowColor = 'rgba(240,212,155,.6)'; ctx.shadowBlur = 3;
      for (const m of motes) {
        if (!m.flung) { m.vx += Math.sin(t / 3200 + m.d) * .0025; m.vy += Math.cos(t / 4100 + m.d * 1.7) * .0015 - .0012; }
        let inField = 0; m.near = 0;
        if (!m.flung) {
          const ox = m.x - hx, oy = m.py - hy, gd = Math.hypot(ox, oy) || 1;
          if (gd > cfg.range) m.inside = 0;
          else {
            if (!m.inside) {
              m.inside = 1; let sp = Math.hypot(m.vx, m.vy); const ux = sp > .02 ? m.vx / sp : -ox / gd, uy = sp > .02 ? m.vy / sp : -oy / gd;
              const sg = (ox * uy - oy * ux) >= 0 ? 1 : -1; const tx = -oy / gd * sg, ty = ox / gd * sg;
              sp = Math.max(sp, rnd(.45, .7)); m.vx = ux * sp + tx * cfg.side * sp * 1.6; m.vy = uy * sp + ty * cfg.side * sp * 1.6;
            }
            inField = 1; const a = cfg.G / (gd * gd + cfg.soft * cfg.soft); m.vx -= ox / gd * a; m.vy -= oy / gd * a; m.near = Math.exp(-gd / 80);
            const vr = (m.vx * ox + m.vy * oy) / gd;
            if (vr > 0 && gd < cfg.range * .6) { const sp = Math.hypot(m.vx, m.vy) || 1, S = Math.max(1.1, sp * cfg.boost) * rnd(.9, 1.15); m.vx = m.vx / sp * S; m.vy = m.vy / sp * S; m.inside = 0; m.flung = 1; }
          }
        }
        if (!m.flung) { if (inField) { m.vx *= .998; m.vy *= .998; } else { m.vx *= .988; m.vy *= .988; } }
        const sp = Math.hypot(m.vx, m.vy), cap = (m.flung || inField) ? 3 : .22; if (sp > cap) { m.vx *= cap / sp; m.vy *= cap / sp; }
        m.x += m.vx; m.py += m.vy; m.born = Math.min(1, m.born + .008);
        if (m.x < Z.l - 10 || m.x > Z.r + 10 || m.py < Z.t - 10 || m.py > Z.b + 10) spawn(m, Z);
        const y = m.py - scrollY; if (y < -5 || y > H + 5) continue;
        const tw = m.a * (.65 + .35 * Math.sin(t / 1100 + m.d * 3)) * m.born * alpha * (1 + m.near * .6 + (m.flung ? .4 : 0)); if (tw < .01) continue;
        ctx.beginPath(); ctx.arc(m.x, y, m.r, 0, 7); ctx.fillStyle = 'rgba(240,214,160,' + Math.min(1, tw) + ')'; ctx.fill();
      }
      // keep the dust inside the section and behind the pendant
      ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(0, 0, W, Math.max(0, sr.top)); ctx.fillRect(0, sr.bottom, W, Math.max(0, H - sr.bottom));
      if (mask) ctx.drawImage(mask, pb.left, pb.top, pb.width, pb.height); else ctx.fillRect(pb.left, pb.top, pb.width, pb.height);
      ctx.globalCompositeOperation = 'source-over';
    };
    if (!reduce) raf = requestAnimationFrame(tick);
    window.__pfxSilence = { remove() { cancelAnimationFrame(raf); removeEventListener('resize', size); cv.remove(); hideStyle.remove(); document.querySelectorAll('.pfx-silence-off').forEach(e => e.classList.remove('pfx-silence-off')); } };
  }

  const start = () => { installHome(); installDim(); installSilence(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
