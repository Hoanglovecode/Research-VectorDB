/* Điều hướng: thanh tiến độ cuộn, tô sáng mục đang xem, nút mục lục trên màn hình hẹp. */
(function () {
  'use strict';

  var root = document.documentElement;
  var bar = document.querySelector('.progress span');
  var nav = document.getElementById('site-nav');
  var toggle = document.getElementById('nav-toggle');
  var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]')) : [];

  /* ---- Thanh tiến độ ---- */
  var ticking = false;

  function update() {
    ticking = false;
    var max = root.scrollHeight - window.innerHeight;
    var progress = max > 0 ? Math.min(1, Math.max(0, window.pageYOffset / max)) : 0;
    if (bar) bar.style.transform = 'scaleX(' + progress + ')';
    spy();
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  /* ---- Tô sáng mục đang xem: mục cuối cùng đã cuộn qua 30% chiều cao màn hình ---- */
  var targets = links.map(function (a) { return { a: a, el: document.getElementById(a.hash.slice(1)) }; })
    .filter(function (t) { return t.el; });

  function setActive(id) {
    links.forEach(function (a) {
      if (a.hash.slice(1) === id) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); }
    });
    Array.prototype.forEach.call(nav.querySelectorAll('.nav-chapter'), function (li) {
      var ch = li.firstElementChild, sub = li.querySelector('.nav-sub [aria-current="true"]');
      var self = ch.hash.slice(1) === id;
      ch.classList.toggle('is-parent', !!sub || self);
      if (sub) ch.removeAttribute('aria-current');
    });
    var cur = nav && nav.querySelector('a[aria-current="true"]');
    if (cur && window.matchMedia('(min-width: 960px)').matches) {
      var box = nav.closest('.sidebar');
      var r = cur.getBoundingClientRect(), br = box.getBoundingClientRect();
      if (r.top < br.top + 60 || r.bottom > br.bottom - 20) cur.scrollIntoView({ block: 'center' });
    }
  }

  var lastId = null;
  function spy() {
    var line = window.innerHeight * 0.3, id = 'top';
    targets.forEach(function (t) { if (t.el.getBoundingClientRect().top <= line) id = t.el.id; });
    if (window.pageYOffset >= root.scrollHeight - window.innerHeight - 2 && targets.length) {
      id = targets[targets.length - 1].el.id;
    }
    if (id !== lastId) { lastId = id; setActive(id); }
  }

  /* ---- Nút mục lục (màn hình hẹp) ---- */
  function setOpen(open) {
    root.classList.toggle('nav-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    links.forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    var wide = window.matchMedia('(min-width: 960px)');
    var onWide = function (e) { if (e.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
