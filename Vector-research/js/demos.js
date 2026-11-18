/* Các demo tương tác được thêm ở các bước sau.
   Mỗi demo đăng ký bằng Demos.register('tên', hàm_khởi_tạo); trang sẽ gọi tất cả khi tải xong. */
(function () {
  'use strict';

  var registry = {};

  window.Demos = {
    register: function (name, init) {
      registry[name] = init;
    },
    initAll: function () {
      Object.keys(registry).forEach(function (name) {
        try {
          registry[name]();
        } catch (error) {
          console.error('Demo "' + name + '" bị lỗi:', error);
        }
      });
    }
  };

  /* ==========================================================================
     Demo 1: độ tương đồng giữa hai vector 2D (Phần 1)
     ========================================================================== */
  window.Demos.register('similarity', function () {
    var root = document.getElementById('demo-similarity');
    if (!root) return;

    var NS = 'http://www.w3.org/2000/svg';
    var SIZE = 420;        // viewBox vuông 420 x 420
    var C = SIZE / 2;      // gốc tọa độ nằm giữa
    var S = 24;            // 1 đơn vị = 24 đơn vị viewBox
    var LIM = 8;           // tọa độ nằm trong [-8, 8]

    var svg = root.querySelector('svg');
    var pick = function (selector) { return root.querySelector(selector); };

    var el = {
      grid: pick('.plot-grid'),
      lineA: pick('.vec-a'),
      lineB: pick('.vec-b'),
      dist: pick('.dist-line'),
      arc: pick('.angle-arc'),
      angleText: pick('.angle-text'),
      handleA: pick('.handle-a'),
      handleB: pick('.handle-b')
    };
    var inputs = {
      ax: pick('[name="ax"]'), ay: pick('[name="ay"]'),
      bx: pick('[name="bx"]'), by: pick('[name="by"]')
    };
    var out = {};
    ['dot', 'cos', 'angle', 'dist'].forEach(function (key) {
      out[key] = pick('[data-out="' + key + '"]');
    });
    var calc = {};
    ['len', 'dot', 'cos', 'dist'].forEach(function (key) {
      calc[key] = pick('[data-calc="' + key + '"]');
    });

    var state = { A: { x: 3, y: 4 }, B: { x: 4, y: 3 } };

    /* ---- Hàm hỗ trợ ---- */
    function X(x) { return C + x * S; }
    function Y(y) { return C - y * S; }
    function clamp(v) { return Math.max(-LIM, Math.min(LIM, v)); }
    function snap(v) { return Math.round(v * 10) / 10; }

    function round(n, digits) {
      var f = Math.pow(10, digits);
      var r = Math.round(n * f) / f;
      return r === 0 ? 0 : r; // tránh -0
    }
    function num(n, digits) {
      return String(round(n, digits === undefined ? 2 : digits)).replace('-', '−');
    }
    function par(n) {
      var s = num(n);
      return n < 0 && s !== '0' ? '(' + s + ')' : s;
    }
    function make(name, attrs) {
      var node = document.createElementNS(NS, name);
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
      return node;
    }

    /* ---- Vẽ lưới và trục ---- */
    (function buildGrid() {
      var i;
      for (i = -LIM; i <= LIM; i++) {
        if (i === 0) continue;
        el.grid.appendChild(make('line', { x1: X(i), y1: Y(-LIM), x2: X(i), y2: Y(LIM) }));
        el.grid.appendChild(make('line', { x1: X(-LIM), y1: Y(i), x2: X(LIM), y2: Y(i) }));
      }
      el.grid.appendChild(make('line', { 'class': 'plot-axis', x1: X(-LIM), y1: C, x2: X(LIM), y2: C }));
      el.grid.appendChild(make('line', { 'class': 'plot-axis', x1: C, y1: Y(-LIM), x2: C, y2: Y(LIM) }));

      for (i = -LIM; i <= LIM; i += 2) {
        if (i === 0) continue;
        var tx = make('text', { 'class': 'tick-label', x: X(i), y: C + 15, 'text-anchor': 'middle' });
        tx.textContent = String(i).replace('-', '−');
        el.grid.appendChild(tx);
        var ty = make('text', { 'class': 'tick-label', x: C - 6, y: Y(i) + 4, 'text-anchor': 'end' });
        ty.textContent = String(i).replace('-', '−');
        el.grid.appendChild(ty);
      }
    })();

    /* ---- Cập nhật giao diện theo state ---- */
    function render() {
      var a = state.A, b = state.B;

      el.lineA.setAttribute('x2', X(a.x));
      el.lineA.setAttribute('y2', Y(a.y));
      el.lineB.setAttribute('x2', X(b.x));
      el.lineB.setAttribute('y2', Y(b.y));
      el.dist.setAttribute('x1', X(a.x));
      el.dist.setAttribute('y1', Y(a.y));
      el.dist.setAttribute('x2', X(b.x));
      el.dist.setAttribute('y2', Y(b.y));

      el.handleA.setAttribute('transform', 'translate(' + X(a.x) + ' ' + Y(a.y) + ')');
      el.handleB.setAttribute('transform', 'translate(' + X(b.x) + ' ' + Y(b.y) + ')');
      el.handleA.setAttribute('aria-label', 'Đầu mút vector A tại (' + num(a.x) + ', ' + num(a.y) + '). Kéo hoặc dùng phím mũi tên để di chuyển.');
      el.handleB.setAttribute('aria-label', 'Đầu mút vector B tại (' + num(b.x) + ', ' + num(b.y) + '). Kéo hoặc dùng phím mũi tên để di chuyển.');

      var la = Math.hypot(a.x, a.y);
      var lb = Math.hypot(b.x, b.y);
      var dot = a.x * b.x + a.y * b.y;
      var dist = Math.hypot(a.x - b.x, a.y - b.y);
      var valid = la > 1e-9 && lb > 1e-9;
      var cos = valid ? Math.max(-1, Math.min(1, dot / (la * lb))) : null;
      var angle = valid ? Math.acos(cos) * 180 / Math.PI : null;

      out.dot.textContent = num(dot);
      out.dist.textContent = num(dist);
      out.cos.textContent = valid ? num(cos, 3) : 'không xác định';
      out.angle.textContent = valid ? num(angle, 1) + '°' : 'không xác định';

      calc.len.textContent = '‖A‖ = ' + num(la) + ',  ‖B‖ = ' + num(lb);
      calc.dot.textContent = 'A · B = ' + par(a.x) + '×' + par(b.x) + ' + ' + par(a.y) + '×' + par(b.y) + ' = ' + num(dot);
      calc.cos.textContent = valid
        ? 'cos θ = ' + num(dot) + ' / (' + num(la) + ' × ' + num(lb) + ') = ' + num(cos, 3)
        : 'cos θ không xác định khi một vector bằng 0';
      calc.dist.textContent = 'd = √((' + num(a.x) + ' − ' + par(b.x) + ')² + (' + num(a.y) + ' − ' + par(b.y) + ')²) = ' + num(dist);

      renderAngle(a, b, valid);

      [['ax', a.x], ['ay', a.y], ['bx', b.x], ['by', b.y]].forEach(function (pair) {
        var input = inputs[pair[0]];
        if (document.activeElement !== input) input.value = round(pair[1], 2);
      });
    }

    function renderAngle(a, b, valid) {
      var r = 30;
      var ta = Math.atan2(a.y, a.x);
      var tb = Math.atan2(b.y, b.x);
      var diff = tb - ta;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;

      if (!valid || Math.abs(diff) < 0.02) {
        el.arc.setAttribute('d', '');
        el.angleText.textContent = '';
        return;
      }
      var sx = C + r * Math.cos(ta), sy = C - r * Math.sin(ta);
      var ex = C + r * Math.cos(tb), ey = C - r * Math.sin(tb);
      // Trục y của SVG hướng xuống nên chiều quay bị đảo: góc dương (ngược chiều kim đồng hồ) ứng với sweep = 0.
      var sweep = diff > 0 ? 0 : 1;
      el.arc.setAttribute('d', 'M ' + sx + ' ' + sy + ' A ' + r + ' ' + r + ' 0 0 ' + sweep + ' ' + ex + ' ' + ey);

      // Góc nhỏ: đặt nhãn xa gốc hơn để bớt đè lên hai nét vector
      var labelR = Math.abs(diff) < 0.6 ? r + 34 : r + 18;
      var mid = ta + diff / 2;
      el.angleText.setAttribute('x', C + labelR * Math.cos(mid));
      el.angleText.setAttribute('y', C - labelR * Math.sin(mid) + 4);
      el.angleText.textContent = num(Math.abs(diff) * 180 / Math.PI, 1) + '°';
    }

    /* ---- Kéo thả và bàn phím ---- */
    function toUnits(event) {
      var box = svg.getBoundingClientRect();
      var px = (event.clientX - box.left) * (SIZE / box.width);
      var py = (event.clientY - box.top) * (SIZE / box.height);
      return { x: (px - C) / S, y: (C - py) / S };
    }

    function bindHandle(handle, key) {
      var dragging = false;

      handle.addEventListener('pointerdown', function (event) {
        dragging = true;
        handle.setPointerCapture(event.pointerId);
        handle.focus();
        event.preventDefault();
      });
      handle.addEventListener('pointermove', function (event) {
        if (!dragging) return;
        var p = toUnits(event);
        state[key] = { x: snap(clamp(p.x)), y: snap(clamp(p.y)) };
        render();
      });
      // Chặn trang cuộn khi đang kéo chấm bằng ngón tay
      handle.addEventListener('touchmove', function (event) { event.preventDefault(); }, { passive: false });
      function stop() { dragging = false; }
      handle.addEventListener('pointerup', stop);
      handle.addEventListener('pointercancel', stop);

      handle.addEventListener('keydown', function (event) {
        var step = event.shiftKey ? 0.5 : 0.1;
        var dx = 0, dy = 0;
        switch (event.key) {
          case 'ArrowLeft': dx = -step; break;
          case 'ArrowRight': dx = step; break;
          case 'ArrowUp': dy = step; break;
          case 'ArrowDown': dy = -step; break;
          default: return;
        }
        event.preventDefault();
        state[key] = { x: snap(clamp(state[key].x + dx)), y: snap(clamp(state[key].y + dy)) };
        render();
      });
    }
    bindHandle(el.handleA, 'A');
    bindHandle(el.handleB, 'B');

    /* ---- Ô nhập số ---- */
    function readInputs() {
      var values = {
        ax: parseFloat(inputs.ax.value), ay: parseFloat(inputs.ay.value),
        bx: parseFloat(inputs.bx.value), by: parseFloat(inputs.by.value)
      };
      if (isFinite(values.ax)) state.A.x = clamp(values.ax);
      if (isFinite(values.ay)) state.A.y = clamp(values.ay);
      if (isFinite(values.bx)) state.B.x = clamp(values.bx);
      if (isFinite(values.by)) state.B.y = clamp(values.by);
      render();
    }
    Object.keys(inputs).forEach(function (key) {
      inputs[key].addEventListener('input', readInputs);
      inputs[key].addEventListener('change', render); // đồng bộ lại ô nhập khi rời khỏi ô
    });

    /* ---- Nút ví dụ có sẵn và chuẩn hóa ---- */
    Array.prototype.forEach.call(root.querySelectorAll('[data-preset]'), function (button) {
      button.addEventListener('click', function () {
        var v = button.getAttribute('data-preset').split(',').map(parseFloat);
        state = { A: { x: v[0], y: v[1] }, B: { x: v[2], y: v[3] } };
        render();
      });
    });

    pick('[data-action="normalize"]').addEventListener('click', function () {
      ['A', 'B'].forEach(function (key) {
        var len = Math.hypot(state[key].x, state[key].y);
        if (len > 1e-9) state[key] = { x: state[key].x / len, y: state[key].y / len };
      });
      render();
    });

    render();
  });

  /* ==========================================================================
     Demo 2: IVF và nprobe (Phần 2)
     Dữ liệu 2D được sinh bằng bộ số giả ngẫu nhiên cố định chỉ dùng phép toán số học
     (không dùng Math.log, sin, cos), nên trình duyệt nào cũng ra cùng một tập điểm.
     ========================================================================== */
  window.Demos.register('ivf', function () {
    var root = document.getElementById('demo-ivf');
    if (!root) return;

    var NS = 'http://www.w3.org/2000/svg';
    var VB = 480, PAD = 16, SPAN = VB - 2 * PAD;
    var NLIST = 8, K = 5;
    var START = { x: 0.45, y: 0.55, nprobe: 1 }; // nprobe = 1 bỏ sót 2 điểm, nprobe = 2 tìm đủ

    var svg = root.querySelector('svg');
    var pick = function (selector) { return root.querySelector(selector); };
    var layer = {
      cells: pick('.ivf-cells'), links: pick('.ivf-links'), cents: pick('.ivf-centroids'),
      points: pick('.ivf-points'), rings: pick('.ivf-rings'), labels: pick('.ivf-labels')
    };
    var handle = pick('.ivf-query');
    var slider = pick('#ivf-nprobe');
    var sliderOut = pick('#ivf-nprobe-out');
    var out = {
      cells: pick('[data-ivf="cells"]'), scanned: pick('[data-ivf="scanned"]'),
      ops: pick('[data-ivf="ops"]'), recall: pick('[data-ivf="recall"]')
    };
    var summary = pick('[data-ivf="summary"]');
    var live = pick('[data-ivf="live"]');

    /* ---- Bộ sinh số và dữ liệu ---- */
    function mulberry32(seed) {
      var a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    var rand = mulberry32(20261110);

    function gauss(sd) { // gần Gauss: tổng 6 số đều, độ lệch chuẩn của tổng là sqrt(1/2)
      var s = 0;
      for (var i = 0; i < 6; i++) s += rand();
      return (s - 3) * sd * Math.SQRT2;
    }
    function bound(v) { return Math.max(0.03, Math.min(0.97, v)); }
    function d2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }

    var blobs = [[0.18, 0.22], [0.45, 0.15], [0.80, 0.24], [0.22, 0.62], [0.55, 0.52], [0.82, 0.74], [0.42, 0.88]];
    var points = [];
    blobs.forEach(function (b) {
      for (var i = 0; i < 15; i++) points.push({ x: bound(b[0] + gauss(0.06)), y: bound(b[1] + gauss(0.06)) });
    });
    for (var u = 0; u < 15; u++) points.push({ x: 0.04 + rand() * 0.92, y: 0.04 + rand() * 0.92 });
    var N = points.length;

    /* ---- k-means (khởi tạo kiểu k-means++) ---- */
    function kmeans(pts, k) {
      var cs = [], i, j;
      var first = pts[Math.floor(rand() * pts.length)];
      cs.push({ x: first.x, y: first.y });
      while (cs.length < k) {
        var dist = pts.map(function (p) {
          var best = Infinity;
          cs.forEach(function (c) { best = Math.min(best, d2(p, c)); });
          return best;
        });
        var total = dist.reduce(function (s, v) { return s + v; }, 0);
        var r = rand() * total, acc = 0, chosen = pts.length - 1;
        for (i = 0; i < dist.length; i++) {
          acc += dist[i];
          if (acc >= r) { chosen = i; break; }
        }
        cs.push({ x: pts[chosen].x, y: pts[chosen].y });
      }

      var assign = new Array(pts.length);
      function assignAll() {
        for (i = 0; i < pts.length; i++) {
          var best = 0, bd = Infinity;
          for (j = 0; j < k; j++) {
            var dd = d2(pts[i], cs[j]);
            if (dd < bd) { bd = dd; best = j; }
          }
          assign[i] = best;
        }
      }
      for (var iter = 0; iter < 30; iter++) {
        assignAll();
        var sx = [], sy = [], n = [];
        for (j = 0; j < k; j++) { sx[j] = 0; sy[j] = 0; n[j] = 0; }
        for (i = 0; i < pts.length; i++) { sx[assign[i]] += pts[i].x; sy[assign[i]] += pts[i].y; n[assign[i]]++; }
        for (j = 0; j < k; j++) if (n[j] > 0) { cs[j].x = sx[j] / n[j]; cs[j].y = sy[j] / n[j]; }
      }
      assignAll();
      return { centroids: cs, assign: assign };
    }

    var km = kmeans(points, NLIST);
    var centroids = km.centroids;
    var assign = km.assign;
    var lists = centroids.map(function () { return []; });
    assign.forEach(function (cell, idx) { lists[cell].push(idx); });

    /* ---- Vùng của mỗi cụm (ô Voronoi): cắt hình vuông theo đường trung trực ---- */
    function clipHalf(poly, nx, ny, c) { // giữ phần nx*x + ny*y <= c
      var res = [];
      for (var i = 0; i < poly.length; i++) {
        var p = poly[i], q = poly[(i + 1) % poly.length];
        var dp = nx * p[0] + ny * p[1] - c, dq = nx * q[0] + ny * q[1] - c;
        if (dp <= 0) res.push(p);
        if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
          var t = dp / (dp - dq);
          res.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
        }
      }
      return res;
    }
    function cellPolygon(i) {
      var poly = [[0, 0], [1, 0], [1, 1], [0, 1]];
      for (var j = 0; j < NLIST; j++) {
        if (j === i) continue;
        var nx = centroids[j].x - centroids[i].x, ny = centroids[j].y - centroids[i].y;
        var c = (centroids[j].x * centroids[j].x + centroids[j].y * centroids[j].y
               - centroids[i].x * centroids[i].x - centroids[i].y * centroids[i].y) / 2;
        poly = clipHalf(poly, nx, ny, c);
        if (!poly.length) break;
      }
      return poly;
    }

    /* ---- Tìm kiếm: IVF so với exact ---- */
    function byDistance(a, b) { return a.d - b.d || a.i - b.i; }

    function search(qp, nprobe) {
      var order = centroids.map(function (c, i) { return { i: i, d: d2(c, qp) }; }).sort(byDistance);
      var probed = order.slice(0, nprobe).map(function (o) { return o.i; });
      var probedSet = {};
      probed.forEach(function (c) { probedSet[c] = true; });

      var scanned = [];
      probed.forEach(function (c) { lists[c].forEach(function (idx) { scanned.push(idx); }); });

      var approx = scanned.map(function (i) { return { i: i, d: d2(points[i], qp) }; })
        .sort(byDistance).slice(0, K).map(function (o) { return o.i; });
      var exact = points.map(function (p, i) { return { i: i, d: d2(p, qp) }; })
        .sort(byDistance).slice(0, K).map(function (o) { return o.i; });

      var approxSet = {}, exactSet = {}, hits = 0;
      approx.forEach(function (i) { approxSet[i] = true; });
      exact.forEach(function (i) { exactSet[i] = true; if (approxSet[i]) hits++; });

      return {
        probed: probed, probedSet: probedSet, scannedCount: scanned.length,
        approx: approx, approxSet: approxSet, exact: exact, exactSet: exactSet,
        hits: hits, ops: NLIST + scanned.length
      };
    }

    /* ---- Vẽ phần tĩnh ---- */
    function PX(v) { return PAD + v * SPAN; }
    function make(name, attrs) {
      var node = document.createElementNS(NS, name);
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
      return node;
    }

    var cellEls = [], linkEls = [], centEls = [], labelEls = [], dotEls = [], ringEls = [];

    centroids.forEach(function (c, i) {
      var poly = cellPolygon(i).map(function (p) { return PX(p[0]) + ',' + PX(p[1]); }).join(' ');
      var cell = make('polygon', { 'class': 'ivf-cell', points: poly });
      layer.cells.appendChild(cell);
      cellEls.push(cell);

      var link = make('line', { 'class': 'ivf-link', visibility: 'hidden', x1: 0, y1: 0, x2: 0, y2: 0 });
      layer.links.appendChild(link);
      linkEls.push(link);

      var cent = make('g', { 'class': 'ivf-cent', transform: 'translate(' + PX(c.x) + ' ' + PX(c.y) + ')' });
      cent.appendChild(make('line', { x1: -6, y1: 0, x2: 6, y2: 0 }));
      cent.appendChild(make('line', { x1: 0, y1: -6, x2: 0, y2: 6 }));
      layer.cents.appendChild(cent);
      centEls.push(cent);

      var label = make('text', { 'class': 'ivf-cent-label', x: PX(c.x) + 8, y: PX(c.y) - 7 });
      label.textContent = String(i + 1);
      layer.labels.appendChild(label);
      labelEls.push(label);
    });

    points.forEach(function (p) {
      var dot = make('circle', { 'class': 'ivf-dot', cx: PX(p.x), cy: PX(p.y), r: 3.6 });
      layer.points.appendChild(dot);
      dotEls.push(dot);
      var ring = make('circle', { 'class': 'ivf-ring', cx: PX(p.x), cy: PX(p.y), r: 10 });
      layer.rings.appendChild(ring);
      ringEls.push(ring);
    });

    /* ---- Trạng thái và cập nhật giao diện ---- */
    var state = { x: START.x, y: START.y, nprobe: START.nprobe };

    function pct(v) { return (Math.round(v * 100) / 100).toFixed(2); }

    function render() {
      var res = search(state, state.nprobe);

      cellEls.forEach(function (el, i) { el.setAttribute('class', 'ivf-cell' + (res.probedSet[i] ? ' is-probed' : '')); });
      centEls.forEach(function (el, i) { el.setAttribute('class', 'ivf-cent' + (res.probedSet[i] ? ' is-probed' : '')); });
      labelEls.forEach(function (el, i) { el.setAttribute('class', 'ivf-cent-label' + (res.probedSet[i] ? ' is-probed' : '')); });

      linkEls.forEach(function (el, idx) {
        if (idx < res.probed.length) {
          var c = centroids[res.probed[idx]];
          el.setAttribute('x1', PX(state.x)); el.setAttribute('y1', PX(state.y));
          el.setAttribute('x2', PX(c.x)); el.setAttribute('y2', PX(c.y));
          el.setAttribute('visibility', 'visible');
        } else {
          el.setAttribute('visibility', 'hidden');
        }
      });

      points.forEach(function (p, i) {
        var scanned = !!res.probedSet[assign[i]];
        var returned = !!res.approxSet[i];
        var truth = !!res.exactSet[i];
        dotEls[i].setAttribute('class', 'ivf-dot' + (scanned ? ' is-scanned' : '') + (returned ? ' is-result' : ''));
        dotEls[i].setAttribute('r', returned ? 5.2 : 3.6);
        ringEls[i].setAttribute('class', 'ivf-ring' + (truth ? (returned ? ' is-hit' : ' is-miss') : ''));
      });

      handle.setAttribute('transform', 'translate(' + PX(state.x) + ' ' + PX(state.y) + ')');

      sliderOut.textContent = String(state.nprobe);
      out.cells.textContent = state.nprobe + ' / ' + NLIST;
      out.scanned.textContent = res.scannedCount + ' / ' + N;
      out.ops.textContent = NLIST + ' + ' + res.scannedCount + ' = ' + res.ops;
      out.recall.textContent = res.hits + '/' + K + ' = ' + pct(res.hits / K);

      var missed = K - res.hits;
      var text = 'Với nprobe = ' + state.nprobe + ', IVF so Q với ' + NLIST + ' centroid rồi quét ' + res.scannedCount +
        ' trong ' + N + ' điểm (exact search phải so ' + N + ' điểm). IVF tìm đúng ' + res.hits + ' trong ' + K +
        ' láng giềng gần nhất thật. ';
      text += missed > 0
        ? missed + ' điểm bị bỏ sót vì nằm ở cụm không được quét (vòng nét đứt).'
        : 'Không bỏ sót điểm nào.';
      if (state.nprobe === NLIST) {
        text += ' Quét cả ' + NLIST + ' cụm nên kết quả trùng exact search, nhưng còn tốn thêm bước so với centroid.';
      }
      summary.textContent = text;

      handle.setAttribute('aria-label', 'Điểm truy vấn Q. Kéo, bấm vào vùng vẽ hoặc dùng phím mũi tên để di chuyển. ' +
        'Hiện tại IVF tìm đúng ' + res.hits + ' trong ' + K + ' láng giềng thật.');
    }

    var timer = null;
    function announce() {
      clearTimeout(timer);
      timer = setTimeout(function () { live.textContent = summary.textContent; }, 400);
    }

    function setQuery(x, y) {
      state.x = Math.max(0, Math.min(1, x));
      state.y = Math.max(0, Math.min(1, y));
      render();
    }
    function toData(event) {
      var box = svg.getBoundingClientRect();
      var px = (event.clientX - box.left) * (VB / box.width);
      var py = (event.clientY - box.top) * (VB / box.height);
      return { x: (px - PAD) / SPAN, y: (py - PAD) / SPAN };
    }

    /* ---- Tương tác ---- */
    svg.addEventListener('click', function (event) {
      if (handle.contains(event.target)) return;
      var p = toData(event);
      setQuery(p.x, p.y);
      announce();
    });

    var dragging = false;
    handle.addEventListener('pointerdown', function (event) {
      dragging = true;
      handle.setPointerCapture(event.pointerId);
      handle.focus({ preventScroll: true });
      event.preventDefault();
    });
    handle.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      var p = toData(event);
      setQuery(p.x, p.y);
    });
    function stopDrag() {
      if (dragging) { dragging = false; announce(); }
    }
    handle.addEventListener('pointerup', stopDrag);
    handle.addEventListener('pointercancel', stopDrag);
    // Chặn trang cuộn khi đang kéo Q bằng ngón tay
    handle.addEventListener('touchmove', function (event) { event.preventDefault(); }, { passive: false });

    handle.addEventListener('keydown', function (event) {
      var step = event.shiftKey ? 0.1 : 0.02;
      var dx = 0, dy = 0;
      switch (event.key) {
        case 'ArrowLeft': dx = -step; break;
        case 'ArrowRight': dx = step; break;
        case 'ArrowUp': dy = -step; break;
        case 'ArrowDown': dy = step; break;
        default: return;
      }
      event.preventDefault();
      setQuery(state.x + dx, state.y + dy);
      announce();
    });

    slider.addEventListener('input', function () {
      state.nprobe = parseInt(slider.value, 10);
      render();
      announce();
    });

    pick('[data-action="reset"]').addEventListener('click', function () {
      state.x = START.x; state.y = START.y; state.nprobe = START.nprobe;
      slider.value = String(START.nprobe);
      render();
      announce();
    });

    slider.value = String(state.nprobe);
    render();

    // Móc dùng cho kiểm thử tự động
    root._ivf = {
      points: points, centroids: centroids, assign: assign, lists: lists, K: K, NLIST: NLIST,
      search: search, state: state, setQuery: setQuery
    };
  });

  /* ==========================================================================
     Demo 3: chunk size và chunk overlap (Phần 4)
     ========================================================================== */
  window.Demos.register('chunking', function () {
    var root = document.getElementById('demo-chunking');
    if (!root) return;

    var SAMPLE = 'Vector database là hệ thống lưu trữ và tìm kiếm các vector nhiều chiều. ' +
      'Mỗi đoạn văn bản được chuyển thành một vector bằng mô hình embedding. ' +
      'Khi người dùng đặt câu hỏi, câu hỏi cũng được chuyển thành vector, và hệ thống tìm những đoạn có vector gần nhất. ' +
      'Trước khi lưu, tài liệu dài phải được cắt thành các chunk nhỏ hơn. ' +
      'Nếu chunk quá nhỏ, ngữ cảnh bị mất và câu trả lời thiếu ý. ' +
      'Nếu chunk quá lớn, vector bị pha loãng và prompt tốn nhiều token. ' +
      'Vì vậy cần chọn kích thước chunk và độ chồng lấp phù hợp với dữ liệu của bạn.';
    var START = { size: 160, overlap: 30 };

    var pick = function (s) { return root.querySelector(s); };
    var ta = pick('#ck-text');
    var sizeIn = pick('#ck-size'), sizeOut = pick('#ck-size-out');
    var ovIn = pick('#ck-overlap'), ovOut = pick('#ck-overlap-out');
    var out = {
      count: pick('[data-ck="count"]'), chars: pick('[data-ck="chars"]'),
      total: pick('[data-ck="total"]'), mid: pick('[data-ck="mid"]')
    };
    var textBox = pick('[data-ck="text"]');
    var list = pick('[data-ck="list"]');
    var live = pick('[data-ck="live"]');

    /* Cắt theo ký tự: bước nhảy = size - overlap, chunk cuối chạm hết văn bản. */
    function chunkify(text, size, overlap) {
      var chunks = [];
      if (!text.length) return chunks;
      var step = size - overlap;
      for (var s = 0; ; s += step) {
        var e = Math.min(s + size, text.length);
        chunks.push({ start: s, end: e });
        if (e >= text.length) break;
      }
      return chunks;
    }

    function endsSentence(text, end) {
      var head = text.slice(0, end).replace(/\s+$/, '');
      return /[.!?…]$/.test(head);
    }

    function el(tag, cls, txt) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (txt !== undefined) n.textContent = txt;
      return n;
    }

    function syncOverlapLimit() {
      var size = parseInt(sizeIn.value, 10);
      var max = Math.floor(size / 2 / 5) * 5;
      ovIn.max = String(max);
      if (parseInt(ovIn.value, 10) > max) ovIn.value = String(max);
    }

    function render() {
      syncOverlapLimit();
      var size = parseInt(sizeIn.value, 10);
      var overlap = parseInt(ovIn.value, 10);
      sizeOut.textContent = String(size);
      ovOut.textContent = String(overlap);

      var text = ta.value;
      var chunks = chunkify(text, size, overlap);
      var n = chunks.length;

      textBox.textContent = '';
      list.textContent = '';

      if (!n) {
        textBox.appendChild(el('span', 'ck-empty', 'Nhập văn bản để xem cách cắt.'));
        out.count.textContent = '0';
        out.chars.textContent = '0';
        out.total.textContent = '0';
        out.mid.textContent = '0';
        live.textContent = '';
        return;
      }

      /* Văn bản tô màu: chia theo mọi điểm đầu và cuối của chunk */
      var cutSet = {};
      cutSet[0] = true; cutSet[text.length] = true;
      chunks.forEach(function (c) { cutSet[c.start] = true; cutSet[c.end] = true; });
      var cuts = Object.keys(cutSet).map(Number).sort(function (a, b) { return a - b; });

      var frag = document.createDocumentFragment();
      for (var i = 0; i < cuts.length - 1; i++) {
        var a = cuts[i], b = cuts[i + 1];
        chunks.forEach(function (c, idx) {
          if (c.start === a) {
            var mark = el('span', 'ck-mark', String(idx + 1));
            mark.setAttribute('aria-hidden', 'true');
            frag.appendChild(mark);
          }
        });
        var owners = [];
        chunks.forEach(function (c, idx) { if (c.start <= a && c.end >= b) owners.push(idx); });
        var cls = owners.length > 1 ? 'ck-seg is-overlap' : 'ck-seg c' + (owners[0] % 4);
        frag.appendChild(el('span', cls, text.slice(a, b)));
      }
      textBox.appendChild(frag);

      /* Danh sách chunk */
      var total = 0, mid = 0;
      chunks.forEach(function (c, idx) {
        var piece = text.slice(c.start, c.end);
        total += piece.length;
        if (idx < n - 1 && !endsSentence(text, c.end)) mid++;

        var card = el('li', 'ck-card c' + (idx % 4));
        card.appendChild(el('p', 'ck-card-head', 'Chunk ' + (idx + 1) + ' · ' + piece.length + ' ký tự'));
        var body = el('p', 'ck-card-body');
        var ovLen = idx > 0 ? Math.min(overlap, piece.length) : 0;
        if (ovLen > 0) {
          body.appendChild(el('span', 'ck-ov', piece.slice(0, ovLen)));
          body.appendChild(document.createTextNode(piece.slice(ovLen)));
        } else {
          body.textContent = piece;
        }
        card.appendChild(body);
        list.appendChild(card);
      });

      var extra = Math.round((total / text.length - 1) * 100);
      out.count.textContent = String(n);
      out.chars.textContent = String(text.length);
      out.total.textContent = total + ' (+' + extra + '%)';
      out.mid.textContent = n > 1 ? mid + ' / ' + (n - 1) + ' lần cắt' : 'không cắt';

      live.textContent = '';
      clearTimeout(render._t);
      render._t = setTimeout(function () {
        live.textContent = 'Có ' + n + ' chunk. Tổng ký tự sau khi cắt là ' + total + ', tăng ' + extra +
          ' phần trăm so với bản gốc. ' + (n > 1 ? mid + ' trên ' + (n - 1) + ' lần cắt rơi vào giữa câu.' : '');
      }, 400);
    }

    ta.value = SAMPLE;
    sizeIn.value = String(START.size);
    ovIn.value = String(START.overlap);
    [ta, sizeIn, ovIn].forEach(function (c) { c.addEventListener('input', render); });
    pick('[data-action="ck-reset"]').addEventListener('click', function () {
      ta.value = SAMPLE;
      sizeIn.value = String(START.size);
      ovIn.value = String(START.overlap);
      render();
    });

    render();
    root._ck = { chunkify: chunkify };
  });

  /* ==========================================================================
     Demo 4: Reciprocal Rank Fusion (Phần 5)
     ========================================================================== */
  window.Demos.register('rrf', function () {
    var root = document.getElementById('demo-rrf');
    if (!root) return;

    var DOCS = ['A', 'B', 'C', 'D', 'E', 'F'];
    var SLOTS = 5;
    var PRESETS = {
      example: { l1: ['A', 'B', 'C', 'D', ''], l2: ['C', 'A', 'E', 'B', ''], k: 60 },
      same: { l1: ['A', 'B', 'C', 'D', 'E'], l2: ['A', 'B', 'C', 'D', 'E'], k: 60 },
      disjoint: { l1: ['A', 'B', 'C', '', ''], l2: ['D', 'E', 'F', '', ''], k: 60 },
      smallk: { l1: ['A', 'B', 'C', 'D', ''], l2: ['C', 'A', 'E', 'B', ''], k: 1 }
    };

    var pick = function (s) { return root.querySelector(s); };
    var fieldsets = [pick('[data-rrf="list1"]'), pick('[data-rrf="list2"]')];
    var kIn = pick('#rrf-k'), kOut = pick('#rrf-k-out');
    var rows = pick('[data-rrf="rows"]');
    var warn = pick('[data-rrf="warn"]');
    var live = pick('[data-rrf="live"]');
    var selects = [[], []];

    function el(tag, cls, txt) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (txt !== undefined) n.textContent = txt;
      return n;
    }

    fieldsets.forEach(function (fs, li) {
      for (var r = 0; r < SLOTS; r++) {
        var label = el('label');
        label.appendChild(document.createTextNode('Hạng ' + (r + 1)));
        var sel = el('select');
        sel.setAttribute('aria-label', 'Danh sách ' + (li + 1) + ', hạng ' + (r + 1));
        var none = el('option', '', '—');
        none.value = '';
        sel.appendChild(none);
        DOCS.forEach(function (d) {
          var o = el('option', '', d);
          o.value = d;
          sel.appendChild(o);
        });
        sel.addEventListener('change', render);
        label.appendChild(sel);
        fs.appendChild(label);
        selects[li].push(sel);
      }
    });

    /* Hợp nhất: mỗi tài liệu nhận 1/(k + hạng) từ mỗi danh sách chứa nó. */
    function fuse(lists, k) {
      var map = {};
      var dupes = [];
      lists.forEach(function (list, li) {
        list.forEach(function (doc, idx) {
          if (!doc) return;
          if (!map[doc]) map[doc] = { doc: doc, ranks: [null, null], score: 0 };
          if (map[doc].ranks[li] !== null) { dupes.push({ doc: doc, list: li + 1 }); return; }
          map[doc].ranks[li] = idx + 1;
          map[doc].score += 1 / (k + idx + 1);
        });
      });
      var out = Object.keys(map).map(function (d) { return map[d]; });
      out.sort(function (a, b) {
        if (Math.abs(b.score - a.score) > 1e-12) return b.score - a.score;
        var ba = Math.min(a.ranks[0] || 1e9, a.ranks[1] || 1e9);
        var bb = Math.min(b.ranks[0] || 1e9, b.ranks[1] || 1e9);
        return ba - bb || (a.doc < b.doc ? -1 : 1);
      });
      return { items: out, dupes: dupes };
    }

    function readLists() {
      return selects.map(function (arr) { return arr.map(function (s) { return s.value; }); });
    }

    function render() {
      var k = parseInt(kIn.value, 10);
      kOut.textContent = String(k);
      var res = fuse(readLists(), k);

      warn.textContent = '';
      if (res.dupes.length) {
        var msg = res.dupes.map(function (d) { return 'tài liệu ' + d.doc + ' lặp trong danh sách ' + d.list; }).join('; ');
        warn.appendChild(el('p', 'rrf-warn', 'Có ' + msg + ': chỉ tính hạng tốt nhất (đứng trước).'));
      }

      rows.textContent = '';
      if (!res.items.length) {
        var tr0 = el('tr');
        var td0 = el('td', '', 'Chọn tài liệu cho các hạng để xem kết quả.');
        td0.colSpan = 6;
        tr0.appendChild(td0);
        rows.appendChild(tr0);
        live.textContent = '';
        return;
      }

      var place = 0, prevScore = null, shown = 0;
      res.items.forEach(function (it) {
        shown++;
        if (prevScore === null || Math.abs(prevScore - it.score) > 1e-12) place = shown;
        prevScore = it.score;

        var parts = [];
        it.ranks.forEach(function (r) { if (r !== null) parts.push('1/' + (k + r)); });
        var tr = el('tr');
        tr.appendChild(el('th', '', String(place)));
        tr.children[0].setAttribute('scope', 'row');
        tr.appendChild(el('td', '', it.doc));
        tr.appendChild(el('td', 'num', it.ranks[0] === null ? 'không có' : String(it.ranks[0])));
        tr.appendChild(el('td', 'num', it.ranks[1] === null ? 'không có' : String(it.ranks[1])));
        tr.appendChild(el('td', 'num', it.score.toFixed(6)));
        tr.appendChild(el('td', 'calc-cell', parts.join(' + ')));
        rows.appendChild(tr);
      });

      var tops = res.items.slice(0, 3).map(function (it) { return it.doc + ' (' + it.score.toFixed(4) + ')'; }).join(', ');
      live.textContent = '';
      clearTimeout(render._t);
      render._t = setTimeout(function () { live.textContent = 'Xếp hạng chung với k bằng ' + k + ': ' + tops + '.'; }, 400);
    }

    function applyPreset(name) {
      var p = PRESETS[name];
      [p.l1, p.l2].forEach(function (list, li) {
        list.forEach(function (v, i) { selects[li][i].value = v; });
      });
      kIn.value = String(p.k);
      render();
    }

    kIn.addEventListener('input', render);
    Array.prototype.forEach.call(root.querySelectorAll('[data-rrf-preset]'), function (b) {
      b.addEventListener('click', function () { applyPreset(b.getAttribute('data-rrf-preset')); });
    });

    applyPreset('example');
    root._rrf = { fuse: fuse };
  });

  document.addEventListener('DOMContentLoaded', function () {
    window.Demos.initAll();
  });
})();
