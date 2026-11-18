/* Mô phỏng từng bước cho HNSW, IVF và PQ.
   Dữ liệu là điểm 2D (hoặc vector 8 chiều) tự đặt cho dễ nhìn; các thuật toán chạy thật trên dữ liệu đó. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function S(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function H(tag, cls, text, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function f1(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }
  function f2(x) { return x.toFixed(2).replace('.', ','); }
  function f3(x) { return x.toFixed(3).replace('.', ','); }
  function setClass(el, list) { el.setAttribute('class', list.filter(Boolean).join(' ')); }

  /* ---- Bộ điều khiển phát/tạm dừng/bước ---- */
  function Player(host, onFrame) {
    var frames = [], i = 0, timer = null, speed = 1;
    var bar = H('div', 'sim-controls', null, host);
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Điều khiển mô phỏng');
    function btn(t, fn) { var b = H('button', 'btn', t, bar); b.type = 'button'; b.addEventListener('click', fn); return b; }
    var bReset = btn('↺ Đặt lại', function () { stop(); i = 0; show(); });
    var bPrev = btn('◀ Lùi', function () { stop(); if (i > 0) { i--; show(); } });
    var bPlay = btn('▶ Phát', function () { if (timer) stop(); else play(); });
    var bNext = btn('Tiếp ▶', function () { stop(); if (i < frames.length - 1) { i++; show(); } });
    bPlay.classList.add('sim-play');
    var sp = H('label', 'sim-speed', 'Tốc độ ', bar);
    var sel = H('select', null, null, sp);
    [['0.5', '0,5×'], ['1', '1×'], ['2', '2×']].forEach(function (o) {
      var op = H('option', null, o[1], sel); op.value = o[0]; if (o[0] === '1') op.selected = true;
    });
    sel.addEventListener('change', function () { speed = parseFloat(sel.value); if (timer) { stop(); play(); } });
    var lbl = H('span', 'sim-step', '', bar);
    lbl.setAttribute('aria-live', 'off');

    function show() {
      onFrame(frames[i], i, frames.length);
      lbl.textContent = 'Bước ' + (i + 1) + '/' + frames.length;
      bPrev.disabled = i === 0;
      bNext.disabled = i === frames.length - 1;
    }
    function tick() { if (i < frames.length - 1) { i++; show(); } if (i >= frames.length - 1) stop(); }
    function play() {
      if (i >= frames.length - 1) { i = 0; show(); }
      timer = setInterval(tick, 1400 / speed);
      bPlay.textContent = '⏸ Tạm dừng';
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } bPlay.textContent = '▶ Phát'; }
    return {
      setFrames: function (f, idx) { stop(); frames = f; i = Math.min(idx || 0, f.length - 1); show(); },
      play: play, stop: stop, goto: function (n) { stop(); i = n; show(); },
      index: function () { return i; }, length: function () { return frames.length; },
      playing: function () { return !!timer; }
    };
  }

  function autoplayOnce(host, player) {
    if (reduce || !('IntersectionObserver' in window)) return;
    var done = false;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !done) { done = true; io.disconnect(); if (player.index() === 0) player.play(); }
      });
    }, { threshold: 0.6 });
    io.observe(host);
  }

  function shell(root, title, intro) {
    root.classList.add('sim');
    root.setAttribute('role', 'group');
    var tid = root.id + '-title';
    root.setAttribute('aria-labelledby', tid);
    var h = H('h4', 'sim-title', title, root); h.id = tid;
    H('p', 'sim-intro', intro, root);
    return root;
  }

  function pointerToView(svg, ev) {
    var r = svg.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * 100, y: (ev.clientY - r.top) / r.height * 100 };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ================= HNSW ================= */
  function initHNSW(root) {
    shell(root, 'Mô phỏng: HNSW đi từ tầng trên xuống tầng dưới',
      'Bấm Phát để xem thuật toán tìm 3 láng giềng gần nhất của điểm truy vấn Q (hình thoi đỏ tím). Kéo Q hoặc dùng phím mũi tên để đổi vị trí, và chỉnh efSearch để xem recall thay đổi.');

    var r = rng(7), pts = [];
    while (pts.length < 30) {
      var p = { x: 8 + r() * 84, y: 8 + r() * 84 };
      if (pts.every(function (q) { return dist(p, q) > 10; })) pts.push(p);
    }
    pts.forEach(function (p, i) { p.id = i; });
    var N = pts.length, K = 3;

    // Chọn điểm cho tầng trên bằng lấy mẫu xa nhất, để tầng trên thưa và trải đều.
    var centre = { x: 50, y: 50 }, start = 0;
    pts.forEach(function (p, i) { if (dist(p, centre) < dist(pts[start], centre)) start = i; });
    var chosen = [start];
    while (chosen.length < 12) {
      var bi = -1, bd = -1;
      pts.forEach(function (p, i) {
        if (chosen.indexOf(i) >= 0) return;
        var m = Math.min.apply(null, chosen.map(function (c) { return dist(p, pts[c]); }));
        if (m > bd) { bd = m; bi = i; }
      });
      chosen.push(bi);
    }
    var layers = [pts.map(function (p) { return p.id; }), chosen.slice(), chosen.slice(0, 3)];
    var adj = layers.map(function (nodes, L) {
      var m = L === 0 ? 3 : 2, a = {};
      nodes.forEach(function (n) { a[n] = {}; });
      nodes.forEach(function (n) {
        nodes.filter(function (o) { return o !== n; })
          .sort(function (x, y) { return dist(pts[n], pts[x]) - dist(pts[n], pts[y]); })
          .slice(0, m).forEach(function (o) { a[n][o] = 1; a[o][n] = 1; });
      });
      return a;
    });
    function nbrs(L, n) { return Object.keys(adj[L][n]).map(Number); }
    function key(a, b) { return a < b ? a + '-' + b : b + '-' + a; }

    var q = { x: 66, y: 36 }, ef = 2;

    function search() {
      var d = pts.map(function (p) { return dist(p, q); });
      var computed = {}, frames = [], path = [], pe = {};
      function cnt() { return Object.keys(computed).length; }
      function F(L, cur, ex, W, note, extra) {
        var f = { layer: L, cur: cur, ex: ex.slice(), W: W.slice(), path: path.slice(), pe: Object.keys(pe),
          comp: Object.keys(computed).map(Number), count: cnt(), note: note };
        if (extra) for (var k in extra) f[k] = extra[k];
        frames.push(f);
      }
      var cur = layers[2][0];
      computed[cur] = 1; path.push(cur);
      F(2, cur, [], [], 'Bắt đầu ở tầng cao nhất, tại điểm vào là nút ' + cur + '. Tầng này rất thưa nên mỗi bước nhảy đi xa. Tính khoảng cách từ nút ' + cur + ' tới Q: ' + f1(d[cur]) + '.');
      for (var L = 2; L >= 1; L--) {
        for (var guard = 0; guard < 30; guard++) {
          var nb = nbrs(L, cur);
          nb.forEach(function (n) { computed[n] = 1; });
          F(L, cur, nb, [], 'Tầng ' + L + ': xét ' + nb.length + ' láng giềng của nút ' + cur + ' (cạnh vàng) và tính khoảng cách tới Q.');
          var best = cur;
          nb.forEach(function (n) { if (d[n] < d[best]) best = n; });
          if (best === cur) {
            F(L, cur, [], [], 'Không láng giềng nào gần Q hơn nút ' + cur + ' (' + f1(d[cur]) + '). Dừng ở tầng ' + L + ' và xuống tầng ' + (L - 1) + ', bắt đầu từ chính nút này.');
            break;
          }
          pe[key(cur, best)] = 1;
          var prev = cur; cur = best; path.push(cur);
          F(L, cur, [], [], 'Nút ' + cur + ' gần Q hơn nút ' + prev + ' (' + f1(d[cur]) + ' so với ' + f1(d[prev]) + '). Đi tới nút ' + cur + '.');
        }
      }
      // Tầng 0: tìm theo danh sách ứng viên cỡ ef
      var visited = {}, C = [cur], W = [cur];
      visited[cur] = 1;
      function worst() { return W.reduce(function (a, b) { return d[b] > d[a] ? b : a; }); }
      F(0, cur, [], W, 'Tầng 0 chứa mọi điểm. Giữ một danh sách tốt nhất gồm tối đa efSearch = ' + ef + ' điểm gần Q, bắt đầu bằng nút ' + cur + '.');
      for (var g = 0; g < 100 && C.length; g++) {
        C.sort(function (a, b) { return d[a] - d[b]; });
        var c = C.shift();
        if (W.length >= ef && d[c] > d[worst()]) {
          F(0, c, [], W, 'Ứng viên gần nhất còn lại (nút ' + c + ', ' + f1(d[c]) + ') đã xa hơn điểm kém nhất trong danh sách (' + f1(d[worst()]) + '). Dừng tìm.');
          break;
        }
        var nb2 = nbrs(0, c).filter(function (n) { return !visited[n]; });
        nb2.forEach(function (n) { visited[n] = 1; computed[n] = 1; });
        nb2.forEach(function (n) {
          if (W.length < ef || d[n] < d[worst()]) {
            C.push(n); W.push(n);
            if (W.length > ef) W.splice(W.indexOf(worst()), 1);
          }
        });
        F(0, c, nb2, W, 'Lấy nút ' + c + ' (ứng viên gần Q nhất), xét ' + nb2.length + ' láng giềng chưa thăm. Danh sách tốt nhất (tối đa ' + ef + ' điểm): ' +
          W.slice().sort(function (a, b) { return d[a] - d[b]; }).join(', ') + '.');
      }
      var res = W.slice().sort(function (a, b) { return d[a] - d[b]; }).slice(0, K);
      var exact = pts.map(function (p) { return p.id; }).sort(function (a, b) { return d[a] - d[b]; }).slice(0, K);
      var hit = res.filter(function (x) { return exact.indexOf(x) >= 0; }).length;
      F(0, -1, [], W, 'Kết quả: ' + res.join(', ') + '. Đáp án thật (vòng nét đứt): ' + exact.join(', ') + '. Tìm đúng ' + hit + '/' + K +
        ' (recall@' + K + ' = ' + f2(hit / K) + ') bằng cách tính khoảng cách tới ' + cnt() + '/' + N + ' điểm, thay vì ' + N + '/' + N + ' như vét cạn.',
        { res: res, exact: exact, hit: hit });
      return frames;
    }

    // Dựng SVG một lần, mỗi bước chỉ đổi lớp CSS để có chuyển động mượt.
    var tabs = H('div', 'sim-tabs', null, root);
    var tabEls = [2, 1, 0].map(function (L) { return H('span', 'sim-tab', 'Tầng ' + L, tabs); });
    var wrap = H('div', 'sim-plot', null, root);
    var svg = S('svg', { viewBox: '0 0 100 100', role: 'img', 'aria-label': 'Đồ thị HNSW ba tầng với điểm truy vấn Q' }, wrap);
    S('rect', { x: 0, y: 0, width: 100, height: 100, class: 'sim-bg' }, svg);
    var edgeEls = {};
    layers.forEach(function (nodes, L) {
      nodes.forEach(function (n) {
        nbrs(L, n).forEach(function (o) {
          if (o < n) return;
          var k = L + ':' + key(n, o);
          edgeEls[k] = S('line', { x1: pts[n].x, y1: pts[n].y, x2: pts[o].x, y2: pts[o].y, class: 'hn2-edge' }, svg);
        });
      });
    });
    var ring = S('circle', { cx: 0, cy: 0, r: 4.2, class: 'sim-ring' }, svg);
    var nodeEls = pts.map(function (p) { return S('circle', { cx: p.x, cy: p.y, r: 1.6, class: 'hn2-node' }, svg); });
    var lblEls = pts.map(function (p) {
      var t = S('text', { x: p.x, y: p.y - 3, 'text-anchor': 'middle', class: 'sim-label' }, svg); t.textContent = p.id; return t;
    });
    var distEls = pts.map(function (p) {
      var t = S('text', { x: p.x, y: p.y + 5.2, 'text-anchor': 'middle', class: 'sim-dist' }, svg); return t;
    });
    var qg = S('g', { class: 'sim-q', tabindex: '0', role: 'slider', 'aria-label': 'Điểm truy vấn Q. Dùng phím mũi tên để di chuyển', 'aria-valuetext': '' }, svg);
    S('path', { d: 'M0,-3.4 L3.4,0 L0,3.4 L-3.4,0 Z' }, qg);
    var qt = S('text', { x: 0, y: -4.6, 'text-anchor': 'middle', class: 'sim-qtext' }, qg); qt.textContent = 'Q';

    var info = H('div', 'sim-stats', null, root);
    var tileLayer = tile(info, 'Tầng hiện tại'), tileCount = tile(info, 'Đã tính khoảng cách'), tileRecall = tile(info, 'Recall@' + K);
    function tile(parent, label) { var t = H('div', 'sim-tile', null, parent); H('span', 'sim-tile-l', label, t); return H('strong', 'sim-tile-v', '—', t); }
    var cap = H('p', 'sim-caption', '', root);

    var ctl = H('div', 'sim-params', null, root);
    var efLab = H('label', null, 'efSearch ', ctl);
    var efIn = H('input', null, null, efLab); efIn.type = 'range'; efIn.min = 1; efIn.max = 8; efIn.step = 1; efIn.value = ef;
    var efOut = H('output', null, String(ef), efLab);
    var player = Player(root, draw);

    var legend = H('div', 'sim-legend', null, root);
    [['lg-cur', 'Nút đang xét'], ['lg-ex', 'Láng giềng đang tính khoảng cách'], ['lg-w', 'Trong danh sách tốt nhất'], ['lg-res', 'Kết quả cuối'], ['lg-exact', 'Đáp án thật (vét cạn)']]
      .forEach(function (l) { var s = H('span', 'sim-lg ' + l[0], l[1], legend); });
    H('p', 'sim-note', 'Số liệu chỉ để minh họa nguyên lý trên 30 điểm tự đặt; trên dữ liệu thật hiệu quả phụ thuộc vào dữ liệu và tham số (M, efConstruction, efSearch).', root);

    function draw(f) {
      var inL = {}; layers[f.layer].forEach(function (n) { inL[n] = 1; });
      var comp = {}; f.comp.forEach(function (n) { comp[n] = 1; });
      var ex = {}; f.ex.forEach(function (n) { ex[n] = 1; });
      var W = {}; f.W.forEach(function (n) { W[n] = 1; });
      var res = {}, exa = {};
      (f.res || []).forEach(function (n) { res[n] = 1; });
      (f.exact || []).forEach(function (n) { exa[n] = 1; });
      pts.forEach(function (p, n) {
        setClass(nodeEls[n], ['hn2-node', inL[n] && 'in', comp[n] && 'comp', W[n] && 'w', ex[n] && 'ex', n === f.cur && 'cur', res[n] && 'res', exa[n] && 'exact']);
        setClass(lblEls[n], ['sim-label', inL[n] && 'show']);
        distEls[n].textContent = ex[n] ? f1(dist(p, q)) : '';
      });
      var pe = {}; f.pe.forEach(function (k) { pe[k] = 1; });
      for (var k in edgeEls) {
        var L = parseInt(k, 10), kk = k.split(':')[1];
        var onCur = false;
        if (f.cur >= 0 && L === f.layer) { f.ex.forEach(function (n) { if (key(f.cur, n) === kk) onCur = true; }); }
        setClass(edgeEls[k], ['hn2-edge', L === f.layer && 'show', pe[kk] && L >= 1 && 'path', onCur && 'ex']);
      }
      if (f.cur >= 0) { ring.style.transform = 'translate(' + pts[f.cur].x + 'px,' + pts[f.cur].y + 'px)'; ring.style.opacity = 1; }
      else ring.style.opacity = 0;
      tabEls.forEach(function (t, i) { setClass(t, ['sim-tab', [2, 1, 0][i] === f.layer && 'on']); });
      tileLayer.textContent = f.layer;
      tileCount.textContent = f.count + '/' + N + ' (vét cạn: ' + N + '/' + N + ')';
      tileRecall.textContent = f.res ? (f.hit + '/' + K + ' = ' + f2(f.hit / K)) : '—';
      cap.textContent = f.note;
    }

    function moveQ() {
      qg.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)';
      qg.setAttribute('aria-valuetext', 'x ' + Math.round(q.x) + ', y ' + Math.round(q.y));
    }
    function rebuild() { moveQ(); player.setFrames(search(), 0); }
    var drag = false;
    function dragTo(ev) {
      var v = pointerToView(svg, ev); q.x = clamp(v.x, 3, 97); q.y = clamp(v.y, 3, 97); rebuild();
    }
    svg.addEventListener('pointerdown', function (ev) { drag = true; svg.setPointerCapture(ev.pointerId); dragTo(ev); ev.preventDefault(); });
    svg.addEventListener('pointermove', function (ev) { if (drag) dragTo(ev); });
    svg.addEventListener('pointerup', function () { drag = false; });
    svg.addEventListener('pointercancel', function () { drag = false; });
    svg.style.touchAction = 'none';
    qg.addEventListener('keydown', function (ev) {
      var s = ev.shiftKey ? 6 : 2, m = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[ev.key];
      if (!m) return;
      ev.preventDefault(); q.x = clamp(q.x + m[0], 3, 97); q.y = clamp(q.y + m[1], 3, 97); rebuild();
    });
    efIn.addEventListener('input', function () { ef = +efIn.value; efOut.textContent = ef; rebuild(); });
    rebuild();
    root._sim = { player: player, pts: pts, layers: layers, adj: adj, setQ: function (x, y) { q.x = x; q.y = y; rebuild(); }, setEf: function (v) { ef = v; efIn.value = v; efOut.textContent = v; rebuild(); }, frames: search };
    autoplayOnce(root, player);
  }

  /* ================= IVF ================= */
  function initIVF(root) {
    shell(root, 'Mô phỏng: IVF chia cụm bằng k-means rồi chỉ quét vài cụm',
      'Phần 1 là giai đoạn dựng chỉ mục (k-means chạy thật trên 72 điểm). Phần 2 là một truy vấn: so với 6 centroid, chọn nprobe cụm gần nhất rồi chỉ quét các điểm trong những cụm đó. Kéo Q để thử.');
    var NP = 72, NL = 6, K = 5;
    var r = rng(11), pts = [];
    var centers = [[20, 25], [50, 17], [80, 28], [22, 72], [52, 80], [82, 68]];
    function gauss() { var u = Math.max(r(), 1e-9), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    centers.forEach(function (c) {
      for (var i = 0; i < NP / NL; i++) pts.push({ x: clamp(c[0] + gauss() * 7.5, 4, 96), y: clamp(c[1] + gauss() * 7.5, 4, 96) });
    });
    pts.forEach(function (p, i) { p.id = i; });

    // k-means (Lloyd) với khởi tạo ngẫu nhiên có hạt giống cố định
    var r2 = rng(32), init = [];
    while (init.length < NL) { var pi = Math.floor(r2() * NP); if (init.indexOf(pi) < 0) init.push(pi); }
    var train = [];
    (function () {
      var cents = init.map(function (i) { return { x: pts[i].x, y: pts[i].y }; });
      train.push({ cents: cents, old: null, assign: null, note: 'Bắt đầu k-means: chọn ngẫu nhiên ' + NL + ' điểm làm centroid ban đầu (ngôi sao). Số cụm nlist = ' + NL + '.' });
      var prev = null;
      for (var it = 1; it <= 10; it++) {
        var assign = pts.map(function (p) {
          var b = 0; cents.forEach(function (c, j) { if (dist(p, c) < dist(p, cents[b])) b = j; }); return b;
        });
        var same = prev && assign.every(function (a, i) { return a === prev[i]; });
        train.push({ cents: cents, old: null, assign: assign, note: 'Vòng ' + it + ' - gán: mỗi điểm về centroid gần nhất (tô màu theo cụm).' + (same ? ' Không điểm nào đổi cụm, k-means đã hội tụ.' : '') });
        if (same) break;
        var nc = cents.map(function (c, j) {
          var m = pts.filter(function (p, i) { return assign[i] === j; });
          if (!m.length) return { x: c.x, y: c.y };
          return { x: m.reduce(function (s, p) { return s + p.x; }, 0) / m.length, y: m.reduce(function (s, p) { return s + p.y; }, 0) / m.length };
        });
        train.push({ cents: nc, old: cents, assign: assign, note: 'Vòng ' + it + ' - cập nhật: mỗi centroid dời về trung bình các điểm trong cụm (vòng nét đứt là vị trí cũ).' });
        cents = nc; prev = assign;
      }
    })();
    var finalT = train[train.length - 1], cents = finalT.cents, assign = finalT.assign;
    var lists = []; for (var j = 0; j < NL; j++) lists.push(pts.filter(function (p, i) { return assign[i] === j; }).map(function (p) { return p.id; }));

    var q = { x: 65, y: 50 }, nprobe = 1;
    function queryFrames() {
      var d = pts.map(function (p) { return dist(p, q); });
      var cd = cents.map(function (c) { return dist(c, q); });
      var order = cents.map(function (c, j) { return j; }).sort(function (a, b) { return cd[a] - cd[b]; });
      var sel = order.slice(0, nprobe);
      var base = { cents: cents, old: null, assign: assign, q: true };
      var fr = [];
      fr.push(Object.assign({}, base, { phase: 'index', cd: null, sel: null, scanned: [], note: 'Chỉ mục đã dựng xong: mỗi cụm có một danh sách các điểm (inverted list) gắn với centroid của nó. Từ đây là giai đoạn truy vấn với điểm Q.' }));
      fr.push(Object.assign({}, base, { phase: 'cd', cd: cd, sel: null, scanned: [], note: 'Bước 1: tính khoảng cách từ Q tới cả ' + NL + ' centroid (chỉ ' + NL + ' phép tính, không phải ' + NP + ').' }));
      fr.push(Object.assign({}, base, { phase: 'sel', cd: cd, sel: sel, scanned: [], note: 'Bước 2: chọn nprobe = ' + nprobe + ' cụm có centroid gần Q nhất (' + sel.map(function (s) { return 'cụm ' + (s + 1); }).join(', ') + '). Các cụm còn lại bị bỏ qua hoàn toàn.' }));
      var scanned = [];
      sel.forEach(function (s) {
        scanned = scanned.concat(lists[s]);
        fr.push(Object.assign({}, base, { phase: 'scan', cd: cd, sel: sel, scanned: scanned.slice(), cur: s, note: 'Bước 3: quét ' + lists[s].length + ' điểm trong cụm ' + (s + 1) + ' và tính khoảng cách tới Q. Đã quét tổng cộng ' + scanned.length + '/' + NP + ' điểm.' }));
      });
      var res = scanned.slice().sort(function (a, b) { return d[a] - d[b]; }).slice(0, K);
      var exact = pts.map(function (p) { return p.id; }).sort(function (a, b) { return d[a] - d[b]; }).slice(0, K);
      var hit = res.filter(function (x) { return exact.indexOf(x) >= 0; }).length;
      fr.push(Object.assign({}, base, { phase: 'done', cd: cd, sel: sel, scanned: scanned, res: res, exact: exact, hit: hit,
        note: 'Kết quả: lấy ' + K + ' điểm gần Q nhất trong số đã quét (chấm đỏ tím). Đáp án thật là vòng nét đứt. Tìm đúng ' + hit + '/' + K + ' (recall@' + K + ' = ' + f2(hit / K) + '), chỉ quét ' + scanned.length + '/' + NP + ' điểm.' +
          (hit < K ? ' Điểm bị sót nằm ở cụm không được quét; tăng nprobe để quét thêm cụm.' : '') }));
      return fr;
    }
    function allFrames() {
      var t = train.map(function (f) { return Object.assign({ phase: 'train', q: false, scanned: [], sel: null, cd: null }, f); });
      return t.concat(queryFrames());
    }

    var phaseTabs = H('div', 'sim-tabs', null, root);
    var pt1 = H('span', 'sim-tab', '1. Dựng chỉ mục (k-means)', phaseTabs), pt2 = H('span', 'sim-tab', '2. Truy vấn', phaseTabs);
    var wrap = H('div', 'sim-plot', null, root);
    var svg = S('svg', { viewBox: '0 0 100 100', role: 'img', 'aria-label': 'Các điểm được chia thành 6 cụm bằng k-means và một điểm truy vấn Q' }, wrap);
    S('rect', { x: 0, y: 0, width: 100, height: 100, class: 'sim-bg' }, svg);
    var lineEls = cents.map(function () { return S('line', { x1: 0, y1: 0, x2: 0, y2: 0, class: 'ivf2-line' }, svg); });
    var ghostEls = cents.map(function () { return S('circle', { r: 2.6, class: 'ivf2-ghost' }, svg); });
    var nodeEls = pts.map(function (p) { return S('circle', { cx: p.x, cy: p.y, r: 1.7, class: 'ivf2-pt' }, svg); });
    var cEls = cents.map(function (c, j) {
      var g = S('g', { class: 'ivf2-cent c' + j }, svg);
      S('path', { d: 'M0,-3.6 L1.1,-1.1 L3.6,-1.1 L1.6,0.7 L2.3,3.4 L0,1.8 L-2.3,3.4 L-1.6,0.7 L-3.6,-1.1 L-1.1,-1.1 Z' }, g);
      var t = S('text', { x: 0, y: -4.6, 'text-anchor': 'middle', class: 'sim-label show' }, g); t.textContent = j + 1;
      return g;
    });
    var cdEls = cents.map(function () { return S('text', { x: 0, y: 0, 'text-anchor': 'middle', class: 'sim-dist' }, svg); });
    var qg = S('g', { class: 'sim-q', tabindex: '0', role: 'slider', 'aria-label': 'Điểm truy vấn Q. Dùng phím mũi tên để di chuyển', 'aria-valuetext': '' }, svg);
    S('path', { d: 'M0,-3.4 L3.4,0 L0,3.4 L-3.4,0 Z' }, qg);
    var qt = S('text', { x: 0, y: -4.6, 'text-anchor': 'middle', class: 'sim-qtext' }, qg); qt.textContent = 'Q';

    var info = H('div', 'sim-stats', null, root);
    function tile(label) { var t = H('div', 'sim-tile', null, info); H('span', 'sim-tile-l', label, t); return H('strong', 'sim-tile-v', '—', t); }
    var tPhase = tile('Giai đoạn'), tScan = tile('Đã quét'), tRecall = tile('Recall@' + K);
    var cap = H('p', 'sim-caption', '', root);
    var ctl = H('div', 'sim-params', null, root);
    var npLab = H('label', null, 'nprobe ', ctl);
    var npIn = H('input', null, null, npLab); npIn.type = 'range'; npIn.min = 1; npIn.max = 4; npIn.step = 1; npIn.value = nprobe;
    var npOut = H('output', null, String(nprobe), npLab);
    var player = Player(root, draw);
    var legend = H('div', 'sim-legend', null, root);
    [['lg-star', 'Centroid (tâm cụm)'], ['lg-scan', 'Điểm đã được quét'], ['lg-res', 'Kết quả cuối'], ['lg-exact', 'Đáp án thật (vét cạn)']]
      .forEach(function (l) { H('span', 'sim-lg ' + l[0], l[1], legend); });
    H('p', 'sim-note', 'Dữ liệu là 72 điểm 2D tự đặt. Hệ thống thật dùng vector nhiều chiều, nlist lớn hơn nhiều và các cải tiến khi huấn luyện; đây chỉ là bản rút gọn của nguyên lý.', root);

    function draw(f) {
      var scanned = {}; f.scanned.forEach(function (n) { scanned[n] = 1; });
      var res = {}, exa = {};
      (f.res || []).forEach(function (n) { res[n] = 1; });
      (f.exact || []).forEach(function (n) { exa[n] = 1; });
      var selSet = {}; (f.sel || []).forEach(function (s) { selSet[s] = 1; });
      var inQuery = f.phase !== 'train';
      nodeEls.forEach(function (e, i) {
        var a = f.assign ? assign0(f, i) : -1;
        var dim = inQuery && f.sel && !selSet[a];
        setClass(e, ['ivf2-pt', a >= 0 && 'c' + a, dim && 'dim', scanned[i] && 'scanned', res[i] && 'res', exa[i] && 'exact']);
      });
      f.cents.forEach(function (c, j) {
        cEls[j].style.transform = 'translate(' + c.x + 'px,' + c.y + 'px)';
        var o = f.old && f.old[j];
        ghostEls[j].setAttribute('cx', o ? o.x : c.x); ghostEls[j].setAttribute('cy', o ? o.y : c.y);
        ghostEls[j].style.opacity = o ? 1 : 0;
        setClass(cEls[j], ['ivf2-cent', 'c' + j, f.sel && !selSet[j] && 'dim', f.sel && selSet[j] && 'sel']);
        var show = f.cd && (f.phase === 'cd' || f.phase === 'sel');
        lineEls[j].setAttribute('x1', q.x); lineEls[j].setAttribute('y1', q.y); lineEls[j].setAttribute('x2', c.x); lineEls[j].setAttribute('y2', c.y);
        setClass(lineEls[j], ['ivf2-line', show && 'show', f.sel && selSet[j] && 'sel']);
        cdEls[j].setAttribute('x', (q.x + c.x) / 2); cdEls[j].setAttribute('y', (q.y + c.y) / 2);
        cdEls[j].textContent = show ? f1(f.cd[j]) : '';
      });
      qg.style.opacity = inQuery ? 1 : 0.25;
      setClass(pt1, ['sim-tab', !inQuery && 'on']); setClass(pt2, ['sim-tab', inQuery && 'on']);
      tPhase.textContent = inQuery ? 'Truy vấn' : 'Dựng chỉ mục';
      tScan.textContent = inQuery ? (f.scanned.length + '/' + NP + ' (vét cạn: ' + NP + '/' + NP + ')') : '—';
      tRecall.textContent = f.res ? (f.hit + '/' + K + ' = ' + f2(f.hit / K)) : '—';
      cap.textContent = f.note;
    }
    function assign0(f, i) { return f.assign[i]; }
    function moveQ() { qg.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)'; qg.setAttribute('aria-valuetext', 'x ' + Math.round(q.x) + ', y ' + Math.round(q.y)); }
    var trainLen = train.length;
    function rebuild(stayAtQuery) { moveQ(); player.setFrames(allFrames(), stayAtQuery ? trainLen : 0); }
    var drag = false;
    function dragTo(ev) { var v = pointerToView(svg, ev); q.x = clamp(v.x, 3, 97); q.y = clamp(v.y, 3, 97); rebuild(true); }
    svg.addEventListener('pointerdown', function (ev) { drag = true; svg.setPointerCapture(ev.pointerId); dragTo(ev); ev.preventDefault(); });
    svg.addEventListener('pointermove', function (ev) { if (drag) dragTo(ev); });
    svg.addEventListener('pointerup', function () { drag = false; });
    svg.addEventListener('pointercancel', function () { drag = false; });
    svg.style.touchAction = 'none';
    qg.addEventListener('keydown', function (ev) {
      var s = ev.shiftKey ? 6 : 2, m = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[ev.key];
      if (!m) return; ev.preventDefault(); q.x = clamp(q.x + m[0], 3, 97); q.y = clamp(q.y + m[1], 3, 97); rebuild(true);
    });
    npIn.addEventListener('input', function () { nprobe = +npIn.value; npOut.textContent = nprobe; rebuild(true); });
    rebuild(false);
    root._sim = { player: player, frames: allFrames, trainLen: trainLen, lists: lists, cents: cents, pts: pts, setQ: function (x, y) { q.x = x; q.y = y; rebuild(true); }, setNprobe: function (v) { nprobe = v; npIn.value = v; npOut.textContent = v; rebuild(true); } };
    autoplayOnce(root, player);
  }

  /* ================= PQ ================= */
  function initPQ(root) {
    shell(root, 'Mô phỏng: PQ nén vector thành mã ngắn rồi tính khoảng cách bằng bảng tra',
      'Phần 1: mã hóa một vector 8 chiều thành 4 con số. Phần 2: tính khoảng cách tới các vector đã nén chỉ bằng cách tra bảng và cộng. Mọi con số bên dưới được tính thật từ dữ liệu mẫu.');
    var D = 8, M = 4, SD = 2, KC = 4, NDB = 6;
    var r = rng(21);
    function rv(n) { var a = []; for (var i = 0; i < n; i++) a.push(Math.round(r() * 100) / 100); return a; }
    var cb = []; // cb[s][c] = [x,y]
    for (var s = 0; s < M; s++) { cb.push([]); for (var c = 0; c < KC; c++) cb[s].push(rv(SD)); }
    var db = []; for (var i = 0; i < NDB; i++) db.push(rv(D));
    var qv = rv(D);
    function sub(v, s) { return v.slice(s * SD, s * SD + SD); }
    function d2(a, b) { var t = 0; for (var i = 0; i < a.length; i++) t += (a[i] - b[i]) * (a[i] - b[i]); return t; }
    var codes = db.map(function (v) { return cb.map(function (book, s) { var b = 0; book.forEach(function (c, k) { if (d2(sub(v, s), c) < d2(sub(v, s), book[b])) b = k; }); return b; }); });
    var T = cb.map(function (book, s) { return book.map(function (c) { return d2(sub(qv, s), c); }); });
    var approx = codes.map(function (cd) { return cd.reduce(function (t, k, s) { return t + T[s][k]; }, 0); });
    var truth = db.map(function (v) { return d2(v, qv); });
    function ranks(a) { var o = a.map(function (x, i) { return i; }).sort(function (x, y) { return a[x] - a[y]; }), rk = []; o.forEach(function (i, p) { rk[i] = p + 1; }); return rk; }
    var rA = ranks(approx), rT = ranks(truth);
    var X = 0; // vector được mã hóa ở phần 1

    var frames = [];
    frames.push({ st: 'A', step: 0, note: 'Vector gốc x có ' + D + ' chiều, mỗi số là float32 (4 byte), nên tốn ' + D * 4 + ' byte. Với hàng triệu vector, riêng bộ nhớ này đã rất lớn.' });
    frames.push({ st: 'A', step: 1, note: 'Cắt x thành m = ' + M + ' đoạn, mỗi đoạn ' + SD + ' chiều. Mỗi đoạn được xử lý độc lập với codebook riêng của nó.' });
    for (var s2 = 0; s2 < M; s2++) {
      (function (s) {
        var best = codes[X][s];
        frames.push({ st: 'A', step: 2 + s, s: s, note: 'Đoạn ' + (s + 1) + ' = (' + f2(sub(db[X], s)[0]) + '; ' + f2(sub(db[X], s)[1]) + '). Trong codebook ' + (s + 1) + ' có ' + KC + ' từ mã (chấm xám); từ mã gần nhất là số ' + best + '. Ta chỉ lưu số ' + best + ' thay cho 2 số thực.' });
      })(s2);
    }
    frames.push({ st: 'A', step: 6, note: 'Mã của x là [' + codes[X].join(', ') + ']. Demo dùng ' + KC + ' từ mã nên mỗi mã chỉ cần 2 bit; thực tế thường dùng 256 từ mã, mỗi mã 1 byte. Khi đó x còn ' + M + ' byte thay vì ' + D * 4 + ' byte, nhỏ hơn ' + (D * 4 / M) + ' lần (chưa tính bộ nhớ của codebook).' });
    frames.push({ st: 'B', step: 7, note: 'Phần 2, truy vấn q: cắt q thành ' + M + ' đoạn, với mỗi đoạn tính bình phương khoảng cách tới ' + KC + ' từ mã. Ta được bảng ' + M + '×' + KC + ' = ' + M * KC + ' số, tính một lần cho cả truy vấn.' });
    for (var i2 = 0; i2 < NDB; i2++) {
      (function (i) {
        frames.push({ st: 'B', step: 8 + i, i: i, note: 'Vector #' + (i + 1) + ' chỉ còn mã [' + codes[i].join(', ') + ']. Khoảng cách² xấp xỉ = ' + codes[i].map(function (k, s) { return f3(T[s][k]); }).join(' + ') + ' = ' + f3(approx[i]) + ' (4 lần tra bảng và 3 phép cộng, không cần đọc vector gốc).' });
      })(i2);
    }
    var orderA = approx.map(function (x, i) { return i; }).sort(function (a, b) { return approx[a] - approx[b]; });
    var orderT = truth.map(function (x, i) { return i; }).sort(function (a, b) { return truth[a] - truth[b]; });
    frames.push({ st: 'B', step: 8 + NDB, i: NDB, note: 'Xếp hạng theo khoảng cách xấp xỉ: ' + orderA.map(function (i) { return '#' + (i + 1); }).join(' < ') + '. Xếp hạng thật: ' + orderT.map(function (i) { return '#' + (i + 1); }).join(' < ') +
      '. ' + (orderA.join() === orderT.join() ? 'Hai thứ tự trùng nhau trên dữ liệu mẫu này.' : 'Hai thứ tự có thể lệch nhau vì PQ làm mất thông tin; đây là lý do recall giảm và người ta thường xếp hạng lại các ứng viên đầu bằng vector gốc.') });

    var tabs = H('div', 'sim-tabs', null, root);
    var tA = H('span', 'sim-tab', '1. Mã hóa (nén)', tabs), tB = H('span', 'sim-tab', '2. Tìm kiếm bằng bảng tra', tabs);

    // Phần A
    var A = H('div', 'pq2-a', null, root);
    H('p', 'pq2-label', 'Vector x (8 chiều)', A);
    var cellsA = H('div', 'pq2-cells', null, A);
    var cellEls = db[X].map(function (v, k) { var c = H('span', 'pq2-cell g' + Math.floor(k / SD), f2(v), cellsA); return c; });
    var panelWrap = H('div', 'sim-plot pq2-panels', null, A);
    var psvg = S('svg', { viewBox: '0 0 340 330', role: 'img', 'aria-label': 'Bốn codebook, mỗi codebook có 4 từ mã 2 chiều' }, panelWrap);
    var panels = [];
    for (var s3 = 0; s3 < M; s3++) {
      (function (s) {
        var ox = (s % 2) * 170, oy = Math.floor(s / 2) * 165;
        var g = S('g', { transform: 'translate(' + (ox + 10) + ',' + (oy + 8) + ')', class: 'pq2-panel' }, psvg);
        S('rect', { x: 0, y: 0, width: 150, height: 130, class: 'pq2-pbg' }, g);
        var t = S('text', { x: 75, y: 148, 'text-anchor': 'middle', class: 'pq2-ptitle' }, g); t.textContent = 'Codebook ' + (s + 1) + ' (đoạn ' + (s + 1) + ')';
        var cs = cb[s].map(function (c, k) {
          var cx = 12 + c[0] * 126, cy = 118 - c[1] * 106;
          S('circle', { cx: cx, cy: cy, r: 5, class: 'pq2-c' }, g);
          var lt = S('text', { x: cx, y: cy - 10, 'text-anchor': 'middle', class: 'pq2-clabel' }, g); lt.textContent = k;
          return { cx: cx, cy: cy };
        });
        var sp = sub(db[X], s), px = 12 + sp[0] * 126, py = 118 - sp[1] * 106, nb = codes[X][s];
        var line = S('line', { x1: px, y1: py, x2: cs[nb].cx, y2: cs[nb].cy, class: 'pq2-link' }, g);
        var hit = S('circle', { cx: cs[nb].cx, cy: cs[nb].cy, r: 8, class: 'pq2-hit' }, g);
        var pt = S('circle', { cx: px, cy: py, r: 5.5, class: 'pq2-p' }, g);
        panels.push({ g: g, line: line, hit: hit, pt: pt });
      })(s3);
    }
    H('p', 'pq2-label', 'Mã của x', A);
    var codeRow = H('div', 'pq2-codes', null, A);
    var codeEls = []; for (var s4 = 0; s4 < M; s4++) codeEls.push(H('span', 'pq2-code g' + s4, '?', codeRow));
    var sizes = H('p', 'pq2-sizes', '', A);

    // Phần B
    var B = H('div', 'pq2-b', null, root);
    H('p', 'pq2-label', 'Truy vấn q (8 chiều): ' + qv.map(f2).join(' · '), B);
    var tw1 = H('div', 'table-wrap', null, B);
    var tbl = H('table', 'pq2-table', null, tw1);
    var capT = H('caption', null, 'Bảng tra: bình phương khoảng cách từ mỗi đoạn của q tới từng từ mã', tbl);
    var thead = H('thead', null, null, tbl), hr = H('tr', null, null, thead);
    H('th', null, 'Đoạn', hr); for (var k2 = 0; k2 < KC; k2++) H('th', null, 'Từ mã ' + k2, hr);
    var tbody = H('tbody', null, null, tbl), tcells = [];
    for (var s5 = 0; s5 < M; s5++) {
      var tr = H('tr', null, null, tbody); H('th', null, 'Đoạn ' + (s5 + 1), tr); tcells.push([]);
      for (var k3 = 0; k3 < KC; k3++) tcells[s5].push(H('td', null, f3(T[s5][k3]), tr));
    }
    var tw2 = H('div', 'table-wrap', null, B);
    var tbl2 = H('table', 'pq2-table pq2-db', null, tw2);
    H('caption', null, 'Các vector đã nén trong database', tbl2);
    var h2 = H('thead', null, null, tbl2), hr2 = H('tr', null, null, h2);
    ['Vector', 'Mã', 'Khoảng cách² xấp xỉ', 'Hạng xấp xỉ', 'Khoảng cách² thật', 'Hạng thật'].forEach(function (t) { H('th', null, t, hr2); });
    var b2 = H('tbody', null, null, tbl2), rowEls = [];
    for (var i3 = 0; i3 < NDB; i3++) {
      var rr = H('tr', null, null, b2);
      H('th', null, '#' + (i3 + 1), rr);
      H('td', 'mono', '[' + codes[i3].join(', ') + ']', rr);
      rowEls.push({ tr: rr, a: H('td', null, '', rr), ra: H('td', null, '', rr), t: H('td', null, '', rr), rt: H('td', null, '', rr) });
    }
    var cap = H('p', 'sim-caption', '', root);
    var player = Player(root, draw);
    var legend = H('div', 'sim-legend', null, root);
    [['lg-pqp', 'Đoạn của vector đang mã hóa'], ['lg-pqc', 'Từ mã trong codebook'], ['lg-pqhit', 'Từ mã gần nhất được chọn']].forEach(function (l) { H('span', 'sim-lg ' + l[0], l[1], legend); });
    H('p', 'sim-note', 'Dữ liệu mẫu 8 chiều tự đặt. Codebook thật được học bằng k-means trên từng đoạn của tập huấn luyện; ở đây chúng được đặt cố định để minh họa. Khoảng cách xấp xỉ có thể lệch so với thật, nhất là khi codebook thô như trong demo.', root);

    function draw(f) {
      var isA = f.st === 'A';
      A.hidden = !isA; B.hidden = isA;
      setClass(tA, ['sim-tab', isA && 'on']); setClass(tB, ['sim-tab', !isA && 'on']);
      cap.textContent = f.note;
      if (isA) {
        cellEls.forEach(function (c, k) { setClass(c, ['pq2-cell', 'g' + Math.floor(k / SD), f.step >= 1 && 'split', f.s != null && Math.floor(k / SD) === f.s && 'on']); });
        panels.forEach(function (p, s) {
          var done = f.step >= 2 + s, cur = f.s === s;
          setClass(p.g, ['pq2-panel', f.step >= 1 && 'active', cur && 'cur', done && 'done']);
        });
        codeEls.forEach(function (c, s) { c.textContent = f.step >= 2 + s ? codes[X][s] : '?'; setClass(c, ['pq2-code', 'g' + s, f.step >= 2 + s && 'set']); });
        sizes.textContent = f.step >= 6 ? 'Trước: ' + D + ' × 4 byte = ' + D * 4 + ' byte. Sau (với 256 từ mã mỗi codebook): ' + M + ' × 1 byte = ' + M + ' byte.' : '';
      } else {
        var hi = {}; if (f.i != null && f.i < NDB) codes[f.i].forEach(function (k, s) { hi[s + ':' + k] = 1; });
        tcells.forEach(function (row, s) { row.forEach(function (c, k) { setClass(c, [hi[s + ':' + k] && 'hi']); }); });
        rowEls.forEach(function (rw, i) {
          var shown = f.i != null && i <= f.i && f.i < NDB || f.i === NDB;
          rw.a.textContent = shown ? f3(approx[i]) : '';
          rw.ra.textContent = f.i === NDB ? rA[i] : '';
          rw.t.textContent = f.i === NDB ? f3(truth[i]) : '';
          rw.rt.textContent = f.i === NDB ? rT[i] : '';
          setClass(rw.tr, [f.i === i && 'hi']);
        });
      }
    }
    player.setFrames(frames, 0);
    root._sim = { player: player, frames: frames, codes: codes, approx: approx, truth: truth, T: T, cb: cb, db: db, qv: qv };
    autoplayOnce(root, player);
  }

  function boot() {
    var m = { 'sim-hnsw': initHNSW, 'sim-ivf': initIVF, 'sim-pq': initPQ };
    Object.keys(m).forEach(function (id) { var e = document.getElementById(id); if (e) m[id](e); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
