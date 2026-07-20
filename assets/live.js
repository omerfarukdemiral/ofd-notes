// Kartları viewport'a sığdırır. Sadece canlı sayfada çalışır —
// PNG export'u file:// üzerinden yapıldığı için orada devre dışı kalır.
(function () {
  if (location.protocol === 'file:') return;

  function fit() {
    var max = Math.min(document.documentElement.clientWidth - 32, 1200);
    var cards = document.querySelectorAll('.canvas');

    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];

      if (!c.dataset.w) {
        c.dataset.w = c.offsetWidth;
        c.dataset.h = c.offsetHeight;
      }
      var w = +c.dataset.w, h = +c.dataset.h;
      var s = Math.min(1, max / w);

      var wrap = c.parentElement && c.parentElement.classList.contains('scaler')
        ? c.parentElement
        : null;

      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'scaler';
        c.parentNode.insertBefore(wrap, c);
        wrap.appendChild(c);
      }

      c.style.transform = 'scale(' + s + ')';
      c.style.transformOrigin = 'top left';
      c.style.margin = '0';

      wrap.style.width = (w * s) + 'px';
      wrap.style.height = (h * s) + 'px';
      wrap.style.margin = '0 auto 28px';
    }
  }

  if (document.readyState === 'complete') fit();
  else window.addEventListener('load', fit);
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
