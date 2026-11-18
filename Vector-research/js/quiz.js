/* Trắc nghiệm cuối mỗi mục: mỗi lần một câu, có giải thích ngay, có điểm tổng và nút làm lại. */
(function () {
  'use strict';
  var DATA = window.QUIZ_DATA || {};
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function build(id, spec) {
    var total = spec.qs.length;
    var root = el('section', 'quiz');
    root.setAttribute('aria-labelledby', 'quiz-' + id + '-title');
    root.dataset.quiz = id;

    var head = el('div', 'quiz-head');
    var title = el('h4', 'quiz-title', 'Kiểm tra nhanh');
    title.id = 'quiz-' + id + '-title';
    var tag = el('span', 'quiz-tag ' + (spec.level === 'main' ? 'is-main' : 'is-minor'),
      (spec.level === 'main' ? 'Mục quan trọng' : 'Mục phụ') + ' · ' + total + ' câu');
    head.appendChild(title); head.appendChild(tag);
    var body = el('div', 'quiz-body');
    root.appendChild(head); root.appendChild(body);

    var state;

    function start() {
      state = { i: 0, score: 0, order: spec.qs.map(function (q) {
        return shuffle(q[1].map(function (t, k) { return { t: t, ok: k === 0 }; }));
      }) };
      renderQuestion(false);
    }

    function renderQuestion(focus) {
      body.textContent = '';
      var q = spec.qs[state.i];
      var prog = el('div', 'quiz-progress');
      prog.appendChild(el('span', null, 'Câu ' + (state.i + 1) + '/' + total));
      var track = el('span', 'quiz-track');
      var fill = el('span', 'quiz-fill');
      fill.style.width = (state.i / total * 100) + '%';
      track.appendChild(fill); prog.appendChild(track);
      body.appendChild(prog);

      var qt = el('p', 'quiz-q', q[0]);
      qt.id = 'quiz-' + id + '-q';
      qt.tabIndex = -1;
      body.appendChild(qt);

      var list = el('div', 'quiz-options');
      list.setAttribute('role', 'group');
      list.setAttribute('aria-labelledby', qt.id);
      var fb = el('div', 'quiz-feedback');
      fb.setAttribute('aria-live', 'polite');
      var next = el('button', 'btn quiz-next');
      next.type = 'button';
      next.hidden = true;
      next.textContent = state.i === total - 1 ? 'Xem kết quả' : 'Câu tiếp theo';

      var btns = state.order[state.i].map(function (o, k) {
        var b = el('button', 'quiz-opt');
        b.type = 'button';
        b.appendChild(el('span', 'quiz-letter', LETTERS[k]));
        b.appendChild(el('span', 'quiz-text', o.t));
        var mark = el('span', 'quiz-mark');
        mark.setAttribute('aria-hidden', 'true');
        b.appendChild(mark);
        b.addEventListener('click', function () { answer(k); });
        list.appendChild(b);
        return b;
      });

      function answer(k) {
        var picked = state.order[state.i][k];
        if (picked.ok) state.score++;
        btns.forEach(function (b, n) {
          var o = state.order[state.i][n];
          b.disabled = true;
          var mark = b.querySelector('.quiz-mark');
          if (o.ok) { b.classList.add('is-correct'); mark.textContent = '✓ Đáp án đúng'; mark.dataset.s = '✓'; }
          else if (n === k) { b.classList.add('is-wrong'); mark.textContent = '✗ Bạn chọn'; mark.dataset.s = '✗'; }
        });
        fb.textContent = '';
        fb.className = 'quiz-feedback ' + (picked.ok ? 'is-correct' : 'is-wrong');
        fb.appendChild(el('strong', null, picked.ok ? 'Chính xác. ' : 'Chưa đúng. '));
        fb.appendChild(document.createTextNode(q[2]));
        next.hidden = false;
        next.focus();
      }

      next.addEventListener('click', function () {
        state.i++;
        if (state.i < total) renderQuestion(true); else renderResult();
      });

      body.appendChild(list); body.appendChild(fb); body.appendChild(next);
      if (focus) qt.focus({ preventScroll: true });
    }

    function renderResult() {
      body.textContent = '';
      var pct = state.score / total;
      var box = el('div', 'quiz-result');
      var big = el('p', 'quiz-score');
      big.appendChild(el('strong', null, state.score + '/' + total));
      big.appendChild(document.createTextNode(' câu đúng'));
      var msg = pct === 1 ? 'Tuyệt vời, bạn nắm chắc mục này.'
        : pct >= 0.6 ? 'Khá tốt. Đọc lại phần giải thích ở những câu sai để chắc hơn.'
        : 'Nên đọc lại mục này rồi làm lại, kiến thức sẽ vào dễ hơn.';
      var p = el('p', 'quiz-msg', msg);
      p.tabIndex = -1;
      var again = el('button', 'btn quiz-again', 'Làm lại');
      again.type = 'button';
      again.addEventListener('click', start);
      box.appendChild(big); box.appendChild(p); box.appendChild(again);
      body.appendChild(box);
      p.focus({ preventScroll: true });
    }

    start();
    return root;
  }

  function mount() {
    var ids = Object.keys(DATA);
    ids.forEach(function (id) {
      var h = document.getElementById(id);
      if (!h) return;
      var node = h.nextElementSibling;
      while (node) {
        if (/^H[23]$/.test(node.tagName) && DATA[node.id]) break;
        node = node.nextElementSibling;
      }
      var quiz = build(id, DATA[id]);
      if (node) h.parentNode.insertBefore(quiz, node); else h.parentNode.appendChild(quiz);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
