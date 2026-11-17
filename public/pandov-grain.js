/*
 * PANDOV — gold motes in the crevices of the burnt trunk, in the homepage's
 * MAKING photograph (making-trunk.webp, the trunk cut out of its white
 * ground, 2400 x 1729 since 2026-11-17; making-sculpture.jpg, 2400 x 2287,
 * from 2026-11-05).
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
 * lower ends, faster than the others. Since 2026-11-17 a click anywhere on
 * the Making section does (the photograph's nearest `[data-grain-click]`, the
 * section, which also raises the sun's storm; the photograph is now only the
 * trunk, cut out). Up to two such waves at a time: a
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

  const D = { w: 2400, h: 1729, lines: [
    [1629,279,1623,261,1599,223,1584,193,1578,176,1575,159,1575,138,1576,124,1580,107,1586,87,1592,75,1601,64,1607,60,1614,60],
    [1648,378,1646,330,1649,285,1646,267,1642,256,1636,248,1606,208,1598,195,1592,182,1589,171,1585,146,1585,136,1587,121,1592,106,1598,92,1605,80,1613,73,1619,69,1626,70],
    [1666,509,1661,447,1658,392,1660,335,1666,289,1665,271,1661,261,1650,243,1610,195,1600,182,1595,170,1593,153,1593,126,1595,117,1601,102,1605,95,1617,81,1624,76,1631,74],
    [1640,215,1621,189,1612,174,1608,159,1608,139,1613,113,1616,103,1622,92,1627,86,1634,80,1640,78,1648,77],
    [1414,376,1399,324,1394,296,1393,265,1384,217,1375,135,1374,105],
    [1621,115,1625,109,1629,104,1637,98,1645,95,1653,96,1660,98,1666,102,1672,107],
    [1392,212,1389,179,1390,130],
    [1641,193,1632,180,1625,166,1624,160,1624,152,1620,137],
    [1413,450,1415,442,1415,428,1411,404,1404,387,1386,351,1371,281,1367,236,1367,164,1365,150,1362,144],
    [1626,440,1625,384,1621,333,1616,299,1609,271,1604,256,1573,180,1569,165,1568,151],
    [1416,279,1407,242,1397,192,1394,167,1395,160,1397,157],
    [1411,394,1396,353,1392,334,1385,265,1376,206],
    [1701,847,1703,695,1712,606,1711,575,1715,494,1715,415,1713,358,1710,333,1705,308,1702,302,1699,299],
    [1709,716,1722,549,1723,473,1721,402,1718,344,1714,314,1712,306,1708,301],
    [1491,467,1490,456,1485,435,1461,378,1444,321],
    [1531,818,1533,733,1532,676,1527,636,1516,565,1508,489,1503,457,1495,426,1465,328],
    [1699,519,1700,455,1694,390,1694,348],
    [1548,625,1546,604,1542,574,1542,556,1540,543,1524,497,1512,468,1504,432,1494,405,1485,370],
    [1646,452,1640,418,1640,376],
    [1492,810,1485,641,1473,454,1468,433,1450,392],
    [1653,831,1665,638,1671,592,1670,512,1665,420],
    [1462,592,1462,560,1461,528,1456,484,1451,450,1444,422],
    [1383,510,1381,496,1381,462,1377,429],
    [1568,807,1566,768,1567,718,1573,652,1579,604,1584,580,1604,533,1603,528,1597,519,1596,511,1607,472,1611,446,1614,434],
    [1370,698,1371,655,1375,622,1374,560,1370,504,1362,446],
    [1558,807,1560,728,1564,642,1560,535,1558,519,1552,504,1546,493,1536,480,1529,466],
    [1636,818,1639,757,1646,682,1648,623,1651,597,1650,541,1642,468],
    [1684,643,1686,589,1687,540,1683,468],
    [1563,733,1572,603,1570,565,1570,504,1568,496,1562,486,1557,480,1547,472],
    [1507,698,1504,611,1499,563,1494,490],
    [1377,807,1385,753,1392,676,1393,622,1396,574,1395,540,1392,510],
    [1609,571,1610,558,1613,546,1614,532],
    [1482,804,1481,770,1476,695,1475,630,1472,603,1470,536],
    [1604,890,1608,838,1613,678,1616,636,1621,613,1623,600,1622,573],
    [1545,817,1548,734,1549,679,1547,658,1540,609,1539,592],
    [1673,1055,1665,1019,1663,1002,1663,982,1669,898,1675,842,1677,750,1681,675],
    [1611,868,1616,833,1624,703,1627,678],
    [1409,804,1420,761,1424,738,1425,689],
    [1401,732,1406,690],
    [1515,823,1517,798,1518,757,1515,693],
    [1689,829,1690,796,1689,737,1692,694],
    [1370,741,1377,707],
    [1434,856,1440,753,1440,728],
    [1395,807,1406,735],
    [1409,1382,1390,1271,1375,1156,1363,972,1361,893,1360,842,1364,814,1378,737],
    [1410,1028,1405,962,1397,890,1396,870,1398,833,1403,799],
    [1453,837,1454,829,1452,809,1455,806,1466,801],
    [1463,966,1464,953,1463,931,1456,887,1455,871,1456,858,1460,843,1466,826,1471,817,1476,813,1483,813,1491,816,1509,828,1515,830,1522,831,1531,829,1559,814,1569,811,1580,811],
    [1422,972,1418,923,1417,880,1419,848,1425,816],
    [1411,1259,1401,1192,1395,1136,1389,1053,1383,920,1380,874,1384,824],
    [1485,966,1487,886,1485,851,1486,841,1489,836,1493,833,1499,833,1518,837,1530,837,1580,827],
    [1455,961,1456,948,1454,938,1446,907,1443,890,1443,866,1444,846],
    [1636,1037,1629,927,1632,897,1640,847],
    [1491,948,1500,864,1502,855,1505,853,1510,852,1526,856,1542,856,1545,852,1546,843,1550,840,1555,841,1567,850,1574,852],
    [1570,1003,1569,974,1571,930,1578,864],
    [1660,1224,1648,1203,1620,1145,1607,1107,1599,1073,1594,1027,1590,946,1590,917,1594,880,1597,866],
    [1498,920,1504,881,1507,871,1512,865,1519,862,1538,863,1562,874],
    [1646,1167,1632,1134,1613,1080,1607,1053,1604,1022,1603,982,1607,939,1618,881],
    [1480,1074,1479,1040,1476,992,1475,907,1474,884],
    [1516,995,1514,964,1514,946,1521,878,1524,875,1528,875,1563,886],
    [1537,1205,1514,1094,1506,1061,1502,1042,1501,982,1502,945,1509,891],
    [1562,1221,1543,1142,1537,1110,1531,1044,1529,985,1531,954,1539,895,1541,891,1546,890,1563,895],
    [1545,1029,1546,908,1548,902,1550,900,1554,900,1562,902],
    [1796,1074,1771,1009,1714,907],
    [1786,1063,1763,1030,1746,1001,1722,953,1710,924],
    [1737,1041,1718,1004,1705,966,1699,955],
    [1696,1196,1676,1154,1651,1115,1643,1096,1634,1064,1629,1040,1623,981],
    [1721,1051,1709,1035,1702,1016,1698,1008,1695,1005],
    [1618,1228,1597,1167,1585,1126,1574,1076,1570,1050],
    [1562,1108,1556,1072,1555,1056],
    [1803,1221,1728,1127,1689,1068],
    [1535,1333,1519,1279,1509,1234,1489,1074],
    [1785,1140,1774,1133,1763,1120,1744,1102],
    [1561,1368,1545,1293,1533,1251,1525,1209,1503,1124],
    [1632,1355,1585,1219,1573,1178,1563,1142],
    [1881,1297,1852,1235,1842,1215,1832,1200,1811,1175,1803,1167,1793,1161,1773,1152],
    [1627,1471,1612,1413,1599,1372,1575,1308,1567,1282,1537,1164],
    [1828,1280,1779,1224,1738,1165],
    [1380,1273,1368,1212,1363,1174],
    [1731,1408,1714,1371,1680,1296,1621,1179],
    [1841,1217,1825,1197,1811,1181],
    [1838,1454,1821,1403,1813,1381,1809,1374,1797,1358,1775,1310,1757,1284,1722,1243,1708,1221],
    [1698,1259,1685,1236],
    [1851,1353,1828,1301,1821,1292,1804,1274,1794,1256],
    [1829,1702,1805,1557,1796,1511,1779,1437,1767,1401,1752,1363,1731,1327,1718,1295,1702,1266],
    [1412,1696,1396,1584,1396,1502,1393,1437,1387,1371,1375,1280],
    [1876,1483,1866,1445,1858,1423,1842,1394,1810,1324,1796,1301,1787,1289],
    [1752,1703,1739,1672,1735,1659,1729,1615,1722,1580,1703,1526,1688,1468,1668,1420,1630,1296],
    [1901,1392,1883,1377,1871,1362,1856,1348,1831,1303],
    [1892,1417,1873,1389,1866,1372],
    [1916,1451,1898,1422,1895,1414],
    [1780,1551,1769,1520,1752,1462,1736,1423],
    [1923,1538,1914,1512,1905,1498,1898,1473,1880,1433],
    [1655,1711,1637,1621,1628,1561,1612,1491,1612,1484,1615,1479,1620,1477,1634,1476],
    [1904,1603,1884,1523,1876,1499,1870,1476],
    [1649,1636,1648,1626,1639,1579,1625,1492,1626,1485,1630,1480,1639,1477,1645,1477],
    [1657,1589,1647,1541,1640,1493,1641,1485,1642,1481,1648,1477,1652,1477],
    [1689,1586,1680,1558,1668,1497],
    [1876,1602,1872,1573,1866,1541,1852,1497],
    [1755,1586,1740,1533,1734,1517],
    [1604,1711,1594,1669,1591,1641,1591,1573,1594,1528],
    [1945,1594,1939,1567,1935,1551],
    [1858,1645,1847,1579,1841,1552],
    [1786,1705,1776,1662,1770,1608,1761,1565],
    [1852,1699,1833,1587],
    [1927,1674,1915,1626,1913,1607],
    [1715,1695,1699,1623],
    [1911,1696,1903,1647,1901,1626],
    [1887,1696,1876,1630],
    [1687,1711,1671,1638],
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
  // what takes the click and the pointer: the section, when it says so
  let hit = null;
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
    hit = box.closest('[data-grain-click]') || box;
    hit.addEventListener('pointermove', onMove, { passive: true });
    hit.addEventListener('pointerleave', onLeave, { passive: true });
    hit.addEventListener('click', onClick);
    hit.style.cursor = 'pointer';
    io && io.disconnect(); ro && ro.disconnect();
    io = new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { rootMargin: '100px' });
    io.observe(box);
    ro = new ResizeObserver(size); ro.observe(box);
    size();
  };

  function unhook() {
    if (!hit) return;
    hit.removeEventListener('pointermove', onMove); hit.removeEventListener('pointerleave', onLeave);
    hit.removeEventListener('click', onClick); hit.style.cursor = '';
    hit = null;
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
