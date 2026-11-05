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

  const D = { w: 2400, h: 2287, lines: [
    [1957,278,1955,268,1950,257,1929,223,1912,191,1906,173,1902,156,1902,135,1904,117,1913,85,1919,73,1927,61,1935,56,1942,56],
    [1977,378,1975,330,1977,284,1975,266,1970,254,1964,245,1931,202,1925,191,1917,170,1913,148,1913,133,1915,119,1919,104,1926,90,1932,79,1939,70,1948,65,1955,66],
    [1995,510,1990,457,1987,392,1989,335,1995,288,1994,269,1990,259,1980,243,1930,183,1923,168,1920,150,1921,123,1923,113,1929,98,1933,91,1945,77,1953,71,1959,70],
    [1969,213,1947,183,1941,171,1936,157,1936,136,1937,125,1941,109,1950,89,1955,83,1963,76,1969,74,1977,73],
    [1739,376,1724,322,1719,294,1718,261,1709,217,1700,131,1699,102],
    [1950,112,1952,106,1959,99,1972,91,1980,91,1986,93,1995,99,2001,104],
    [1717,210,1715,176,1715,126],
    [1969,191,1954,164,1952,158,1952,149,1948,138,1948,134],
    [1739,450,1740,428,1737,404,1731,389,1712,352,1696,280,1692,234,1692,161,1690,147,1687,141],
    [1954,440,1954,406,1952,362,1944,297,1932,254,1899,172,1896,158,1895,148],
    [1743,277,1732,237,1723,189,1720,166,1720,158,1722,155],
    [1737,394,1722,354,1719,340,1715,313,1709,253,1702,203],
    [2030,853,2032,715,2035,670,2041,615,2040,586,2044,512,2044,434,2043,372,2041,339,2035,309,2032,301,2028,298],
    [2039,719,2045,627,2051,551,2052,473,2048,343,2044,312,2041,305,2038,301],
    [1817,468,1816,457,1811,436,1786,373,1770,319],
    [1858,823,1860,737,1859,679,1854,639,1842,563,1835,490,1824,435,1791,327],
    [2029,520,2029,447,2023,390,2022,346],
    [1875,628,1874,609,1869,575,1869,556,1868,549,1850,493,1839,468,1831,432,1820,403,1812,370],
    [1974,453,1969,417,1968,389,1969,375],
    [1818,815,1811,637,1800,460,1798,448,1796,438,1776,392],
    [1982,835,1983,806,1994,633,1999,594,1999,513,1994,449,1994,420],
    [1789,594,1789,567,1786,519,1778,454,1771,422],
    [1708,512,1706,492,1706,465,1702,429],
    [1895,812,1894,772,1894,722,1896,693,1903,633,1912,582,1932,536,1932,530,1925,519,1925,511,1936,469,1938,447,1942,434],
    [1696,702,1696,657,1700,619,1699,559,1695,505,1687,446],
    [1885,811,1887,732,1892,645,1888,536,1885,521,1879,505,1873,494,1862,479,1856,467],
    [1965,823,1967,761,1975,680,1977,628,1980,594,1978,538,1970,469],
    [2012,646,2015,618,2016,542,2012,469],
    [1891,737,1894,667,1900,605,1898,574,1898,507,1896,498,1892,490,1885,481,1875,473],
    [1834,702,1831,618,1825,559,1822,491],
    [1702,812,1710,757,1718,679,1718,625,1721,575,1720,542,1718,512],
    [1937,573,1938,560,1941,545,1942,533],
    [1808,809,1807,775,1803,699,1801,628,1798,604,1796,537],
    [1932,895,1936,848,1941,681,1944,639,1951,608,1951,575],
    [1873,822,1876,682,1875,661,1867,606,1867,594],
    [2002,1062,1994,1026,1991,996,1998,904,2004,842,2005,767,2010,678],
    [1939,875,1941,864,1944,838,1951,724,1956,681],
    [1734,810,1746,766,1749,748,1751,731,1751,692],
    [1726,737,1732,693],
    [1842,828,1845,785,1845,752,1842,696],
    [2018,834,2019,817,2018,731,2022,697],
    [1695,745,1701,712],
    [1761,861,1761,827,1766,757,1766,732],
    [1720,811,1731,739],
    [1735,1393,1715,1281,1704,1199,1700,1156,1688,979,1685,888,1685,847,1689,819,1703,740],
    [1735,1035,1731,969,1722,896,1722,875,1723,839,1728,804],
    [1778,843,1780,836,1778,814,1781,811,1792,807],
    [1790,972,1789,937,1782,893,1781,877,1783,863,1787,846,1791,834,1798,822,1803,818,1810,818,1817,821,1835,832,1843,835,1849,836,1860,833,1890,818,1897,816,1907,815],
    [1747,979,1744,936,1743,885,1745,854,1751,820],
    [1736,1269,1727,1211,1715,1076,1708,918,1705,878,1709,828],
    [1811,972,1814,895,1811,856,1812,847,1815,841,1818,839,1823,837,1845,842,1860,842,1901,833,1908,832],
    [1781,968,1782,955,1780,944,1772,909,1769,895,1769,872,1770,851],
    [1965,1045,1958,933,1961,900,1968,852],
    [1818,955,1826,874,1829,860,1832,858,1836,857,1855,861,1868,861,1872,858,1873,847,1877,845,1882,846,1895,855,1901,857],
    [1898,1010,1897,986,1898,944,1906,870],
    [1988,1234,1967,1194,1948,1152,1935,1117,1927,1082,1922,1039,1918,951,1918,923,1921,888,1925,872],
    [1824,927,1831,886,1835,876,1839,870,1846,868,1865,869,1890,880],
    [1974,1176,1956,1131,1940,1085,1935,1060,1932,1029,1932,989,1935,945,1947,887],
    [1806,1081,1806,1047,1803,999,1802,932,1800,890],
    [1842,1002,1841,970,1841,952,1847,884,1850,881,1856,881,1891,892],
    [1865,1214,1842,1107,1829,1052,1828,989,1829,951,1836,897],
    [1889,1231,1869,1145,1864,1118,1858,1047,1856,992,1859,957,1864,910,1866,899,1869,896,1874,896,1890,901],
    [1873,1036,1872,930,1873,913,1875,908,1878,906,1889,908],
    [2126,1082,2100,1014,2043,913],
    [2116,1071,2093,1037,2075,1006,2051,960,2039,930],
    [2066,1048,2048,1014,2036,979,2028,962],
    [2025,1205,2007,1166,1980,1124,1970,1101,1964,1081,1956,1041,1951,988],
    [2049,1059,2038,1042,2032,1023,2026,1014],
    [1946,1238,1925,1176,1913,1135,1903,1092,1898,1058],
    [1889,1117,1884,1080,1882,1064],
    [2133,1231,2102,1190,2057,1136,2019,1076],
    [1862,1344,1848,1296,1836,1245,1816,1082],
    [2117,1150,2103,1140,2094,1129,2075,1112],
    [1888,1379,1872,1305,1860,1260,1852,1217,1838,1166,1830,1133],
    [1960,1366,1913,1229,1898,1178,1891,1151],
    [2212,1308,2183,1244,2171,1222,2162,1208,2145,1187,2133,1176,2125,1171,2103,1161],
    [1955,1484,1949,1456,1940,1424,1903,1320,1894,1293,1864,1173],
    [2159,1290,2110,1234,2068,1173],
    [1706,1284,1694,1225,1688,1183],
    [2061,1420,2045,1387,2011,1311,1950,1188],
    [2170,1224,2154,1203,2142,1191],
    [2169,1466,2153,1416,2143,1392,2139,1385,2127,1369,2105,1320,2087,1295,2053,1255,2039,1232],
    [2027,1269,2015,1246],
    [2182,1364,2167,1329,2157,1309,2135,1286,2124,1266],
    [2160,1718,2136,1572,2126,1524,2108,1447,2095,1405,2082,1374,2060,1337,2047,1304,2031,1276],
    [1738,1711,1722,1602,1721,1515,1719,1450,1715,1410,1700,1290],
    [2207,1495,2196,1454,2189,1435,2171,1401,2140,1335,2131,1319,2118,1300],
    [2082,1718,2070,1691,2065,1674,2059,1629,2051,1595,2044,1577,2032,1540,2017,1481,1997,1432,1959,1306],
    [2233,1403,2219,1393,2188,1359,2162,1314],
    [2224,1429,2209,1408,2196,1384],
    [2247,1463,2243,1454,2230,1433,2228,1426],
    [2110,1565,2100,1537,2082,1475,2065,1433],
    [2255,1552,2247,1528,2236,1509,2229,1485,2217,1460,2213,1446],
    [1983,1727,1965,1634,1956,1577,1940,1504,1940,1496,1943,1492,1949,1490,1962,1489],
    [1986,1603,1982,1589,1975,1554,1969,1506,1969,1498,1971,1494,1974,1491,1981,1489],
    [1978,1650,1968,1597,1954,1506,1954,1498,1957,1494,1965,1490,1973,1489],
    [2235,1617,2215,1536,2201,1490],
    [2208,1616,2197,1554,2183,1509],
    [2018,1600,2009,1572,1997,1510],
    [2086,1600,2070,1548,2062,1529],
    [1933,1727,1922,1684,1919,1661,1919,1593,1921,1542],
    [2277,1608,2272,1581,2266,1563],
    [2189,1660,2181,1610,2172,1564],
    [2116,1720,2106,1679,2100,1622,2091,1578],
    [2183,1715,2164,1601],
    [2259,1689,2247,1641,2245,1622],
    [2045,1711,2037,1673,2028,1638],
    [2243,1711,2234,1652,2233,1641],
    [2218,1711,2207,1644],
    [2016,1726,2000,1652],
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
