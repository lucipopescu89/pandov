/*
 * PANDOV — gold motes in the crevices of the burnt trunk, in the homepage's
 * MAKING photograph (making-sculpture.jpg, 2400 x 1769).
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

  const D = { w: 2400, h: 1769, lines: [
    [1954,277,1952,267,1947,257,1926,223,1909,191,1903,174,1900,156,1900,136,1902,118,1911,87,1917,74,1925,63,1932,58,1939,58],
    [1974,376,1971,328,1974,283,1971,265,1967,254,1961,245,1928,202,1922,192,1914,170,1911,148,1910,134,1912,120,1917,105,1923,91,1929,81,1937,72,1945,67,1952,68],
    [1991,506,1986,454,1984,390,1986,333,1991,287,1990,269,1986,258,1977,242,1928,183,1921,168,1918,150,1918,124,1920,114,1926,99,1930,93,1942,78,1950,73,1956,72],
    [1966,213,1944,183,1938,172,1934,157,1933,137,1934,126,1938,110,1948,90,1952,84,1960,78,1966,75,1974,75],
    [1739,374,1724,320,1719,293,1718,260,1709,217,1701,132,1699,103],
    [1947,113,1950,107,1956,100,1969,93,1976,93,1983,95,1992,100,1997,105],
    [1717,210,1715,176,1715,127],
    [1966,191,1951,165,1949,158,1949,149,1946,139,1945,135],
    [1739,447,1740,425,1736,402,1731,386,1712,350,1696,279,1692,233,1692,162,1691,148,1687,142],
    [1951,437,1951,403,1949,360,1941,295,1929,254,1897,173,1894,158,1893,148],
    [1742,276,1732,237,1722,189,1720,167,1720,159,1722,156],
    [1737,392,1722,352,1719,338,1715,312,1709,253,1702,203],
    [2026,844,2028,709,2031,664,2037,610,2036,581,2040,508,2040,431,2039,370,2037,337,2031,308,2028,300,2024,297],
    [2035,713,2041,622,2047,547,2048,470,2044,341,2040,311,2037,304,2034,300],
    [1816,465,1815,454,1810,433,1785,371,1769,318],
    [1856,815,1858,730,1857,673,1853,633,1841,559,1833,486,1823,432,1790,326],
    [2025,516,2025,444,2019,388,2018,345],
    [1873,622,1872,603,1867,570,1867,551,1866,545,1848,490,1837,465,1830,429,1819,400,1811,367],
    [1971,449,1965,414,1965,387,1966,373],
    [1816,808,1810,632,1799,457,1797,444,1795,435,1775,390],
    [1979,828,1991,628,1996,589,1996,510,1991,446,1990,418],
    [1788,589,1788,563,1785,515,1777,450,1770,419],
    [1708,508,1706,489,1707,462,1702,427],
    [1893,804,1892,765,1892,715,1894,687,1901,628,1909,577,1929,531,1929,526,1922,515,1922,507,1933,465,1936,444,1939,431],
    [1696,695,1696,652,1700,614,1699,555,1695,501,1688,443],
    [1883,804,1885,726,1889,639,1886,532,1883,517,1877,501,1871,491,1860,475,1854,463],
    [1961,816,1964,754,1972,674,1974,623,1977,589,1975,534,1967,465],
    [2009,640,2011,613,2012,538,2008,465],
    [1889,730,1892,661,1897,600,1896,570,1896,504,1894,494,1890,486,1883,478,1873,470],
    [1832,695,1830,613,1824,554,1820,487],
    [1702,804,1710,751,1718,673,1718,620,1721,570,1720,538,1718,508],
    [1934,569,1935,556,1939,541,1939,529],
    [1807,801,1806,767,1801,692,1800,623,1797,599,1795,533],
    [1929,887,1933,840,1938,675,1942,633,1948,603,1948,571],
    [1871,814,1874,676,1873,655,1865,601,1865,589],
    [1999,1051,1990,1016,1988,986,1994,895,2001,834,2001,760,2006,672],
    [1936,866,1938,855,1941,830,1948,717,1953,675],
    [1734,802,1745,759,1749,739,1750,725,1750,686],
    [1726,730,1732,687],
    [1841,820,1843,777,1843,745,1840,690],
    [2014,826,2016,810,2015,725,2018,691],
    [1695,738,1702,706],
    [1760,853,1761,819,1766,750,1766,725],
    [1720,804,1731,732],
    [1734,1378,1715,1268,1704,1187,1700,1144,1688,969,1686,879,1686,839,1689,811,1703,734],
    [1735,1024,1730,959,1722,888,1722,867,1723,831,1728,797],
    [1777,835,1780,828,1777,806,1780,803,1791,799],
    [1789,963,1788,927,1781,884,1780,868,1782,855,1786,838,1790,826,1796,814,1801,810,1809,810,1816,813,1833,824,1841,827,1848,828,1858,825,1888,810,1895,808,1905,808],
    [1747,969,1744,926,1742,877,1744,846,1750,813],
    [1736,1256,1727,1198,1715,1065,1708,909,1705,869,1709,820],
    [1810,963,1812,886,1810,848,1811,839,1814,833,1817,831,1822,829,1843,834,1858,834,1898,825,1905,824],
    [1780,958,1781,945,1780,935,1771,900,1769,886,1768,863,1769,843],
    [1961,1034,1955,924,1958,892,1965,844],
    [1817,945,1825,865,1828,852,1831,850,1834,849,1853,853,1867,853,1870,850,1871,839,1875,837,1880,838,1893,847,1899,849],
    [1895,1000,1894,976,1896,934,1904,861],
    [1985,1221,1964,1182,1945,1140,1932,1105,1924,1071,1919,1028,1915,942,1915,914,1919,879,1922,863],
    [1823,918,1830,878,1833,867,1838,862,1844,859,1863,860,1888,872],
    [1971,1164,1953,1119,1938,1074,1932,1049,1929,1019,1929,979,1933,936,1944,878],
    [1805,1070,1805,1036,1801,989,1801,923,1799,882],
    [1841,992,1839,961,1839,943,1846,876,1849,872,1855,872,1889,883],
    [1863,1202,1840,1095,1827,1041,1827,979,1828,941,1834,888],
    [1887,1218,1867,1134,1862,1106,1856,1036,1854,982,1857,948,1862,901,1864,891,1867,888,1872,887,1888,892],
    [1871,1025,1870,921,1871,904,1873,900,1876,897,1887,899],
    [2121,1071,2095,1003,2039,905],
    [2111,1060,2088,1027,2070,996,2047,950,2035,921],
    [2062,1038,2044,1004,2032,969,2024,952],
    [2021,1192,2003,1154,1977,1112,1967,1090,1961,1070,1953,1031,1948,978],
    [2045,1048,2034,1031,2028,1013,2022,1003],
    [1944,1225,1922,1164,1910,1123,1901,1081,1895,1048],
    [1887,1105,1881,1069,1880,1053],
    [2128,1218,2097,1177,2053,1124,2015,1065],
    [1860,1330,1846,1282,1835,1232,1815,1071],
    [2112,1138,2098,1128,2089,1117,2071,1100],
    [1886,1364,1871,1291,1859,1247,1850,1204,1836,1154,1829,1121],
    [1957,1351,1911,1217,1895,1166,1889,1139],
    [2206,1294,2177,1231,2166,1209,2157,1196,2140,1175,2128,1164,2120,1158,2099,1149],
    [1952,1468,1946,1440,1937,1408,1901,1306,1892,1279,1862,1161],
    [2154,1276,2106,1222,2063,1161],
    [1706,1270,1694,1212,1689,1171],
    [2055,1404,2045,1377,1995,1279,1947,1175],
    [2164,1211,2148,1191,2136,1178],
    [2164,1450,2138,1377,2134,1370,2122,1355,2110,1323,2103,1310,2091,1292,2053,1248,2035,1219],
    [2176,1349,2162,1315,2152,1295,2130,1272,2119,1253],
    [2155,1699,2131,1555,2121,1507,2103,1432,2090,1390,2078,1359,2056,1323,2043,1290,2027,1263],
    [1738,1693,1722,1585,1721,1499,1718,1434,1715,1395,1700,1277],
    [2201,1479,2190,1439,2183,1420,2166,1386,2135,1321,2126,1305,2113,1286],
    [2078,1700,2066,1672,2060,1656,2054,1611,2047,1577,2040,1560,2028,1523,2014,1465,1994,1417,1956,1292],
    [2227,1388,2213,1378,2182,1345,2156,1300],
    [2218,1414,2203,1393,2190,1369],
    [2241,1448,2236,1438,2223,1418,2222,1411],
    [2105,1548,2095,1520,2078,1459,2060,1418],
    [2249,1535,2241,1512,2230,1493,2223,1469,2211,1444,2207,1430],
    [1980,1708,1962,1616,1953,1560,1937,1487,1937,1480,1940,1476,1946,1473,1959,1473],
    [1983,1585,1979,1572,1972,1537,1966,1490,1966,1482,1968,1478,1971,1475,1977,1473],
    [1975,1632,1965,1579,1951,1490,1951,1482,1954,1477,1962,1474,1970,1473],
    [2229,1600,2209,1520,2195,1474],
    [2202,1599,2191,1537,2177,1493],
    [2014,1582,2005,1555,1994,1494],
    [2081,1583,2066,1531,2058,1512],
    [1930,1708,1920,1665,1917,1643,1916,1575,1919,1525],
    [2270,1591,2265,1564,2259,1546],
    [2183,1642,2175,1592,2166,1547],
    [2111,1701,2101,1660,2095,1604,2087,1561],
    [2177,1696,2159,1584],
    [2252,1670,2241,1623,2238,1604],
    [2041,1692,2033,1655,2024,1620],
    [2237,1693,2227,1634,2227,1623],
    [2212,1693,2201,1626],
    [2012,1707,1996,1634],
  ] };

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
      const base = regular ? 1 : T.base;
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
