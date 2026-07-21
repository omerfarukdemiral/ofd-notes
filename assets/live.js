// Canlı sayfa katmanı. Sadece tarayıcıda çalışır — PNG export file://
// üzerinden yapıldığı için orada devre dışı kalır (export'a dokunmaz).
//
// Masaüstü: kart tam boyutuna kadar (max 1200px) orantılı sığdırılır.
// Mobil (≤720px): kart İÇERİĞİ akışkan hale getirilir (reflow) — kart
//   tam genişlik + otomatik yükseklik olur, font boyut aralığı okunur bir
//   banda sıkıştırılır (hiyerarşi korunur), iki kolonlu karşılaştırmalar
//   alt alta iner, sabit konumlu alt şeritler akışa girer, geniş SVG
//   şemalar yatay kaydırılabilir bir çerçeveye alınır.
(function () {
  if (location.protocol === 'file:') return;

  var MOBILE = 720;
  var touched = [];   // inline style'ı önbelleğe alınan elemanlar
  var svgWraps = [];  // oluşturduğumuz svg kaydırma sarmalayıcıları

  function isMobile() { return document.documentElement.clientWidth <= MOBILE; }

  function cache(el) {
    if (el.__o === undefined) { el.__o = el.getAttribute('style') || ''; }
    if (touched.indexOf(el) === -1) touched.push(el);
  }

  function restoreAll() {
    for (var i = 0; i < touched.length; i++) {
      var el = touched[i];
      if (el.__o) el.setAttribute('style', el.__o); else el.removeAttribute('style');
    }
    touched = [];
    for (var j = 0; j < svgWraps.length; j++) {
      var sc = svgWraps[j], svg = sc.firstChild;
      if (svg && sc.parentNode) { sc.parentNode.insertBefore(svg, sc); sc.parentNode.removeChild(sc); }
    }
    svgWraps = [];
  }

  // Geniş font aralığını (15px–180px) okunur bir banda sıkıştırır.
  function fontMap(fs) {
    var m = fs * 0.42 + 6;
    return m < 12.5 ? 12.5 : (m > 40 ? 40 : m);
  }

  function ensureWrap(card) {
    if (card.parentElement && card.parentElement.classList.contains('scaler')) {
      return card.parentElement;
    }
    var wrap = document.createElement('div');
    wrap.className = 'scaler';
    card.parentNode.insertBefore(wrap, card);
    wrap.appendChild(card);
    return wrap;
  }

  function toMobile(card) {
    var wrap = ensureWrap(card);
    cache(wrap);
    wrap.style.width = '100%';
    wrap.style.height = 'auto';
    wrap.style.margin = '0 auto 22px';

    cache(card);
    card.style.transform = 'none';
    card.style.width = '100%';
    card.style.height = 'auto';
    card.style.minHeight = '0';
    card.style.maxWidth = '100%';
    card.style.padding = '30px 20px';
    card.style.overflow = 'visible';
    card.style.margin = '0';

    var all = card.querySelectorAll('*');

    // pass 1 — orijinal computed değerlerden font + yapı kararları
    var fonts = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.closest('svg')) continue;
      var cs = getComputedStyle(el);
      if (cs.display === 'flex' && cs.flexDirection.indexOf('row') === 0) {
        var kids = el.children, grow = 0;
        for (var k = 0; k < kids.length; k++) {
          if (parseFloat(getComputedStyle(kids[k]).flexGrow) > 0) grow++;
        }
        if (grow >= 2) { cache(el); el.style.flexDirection = 'column'; el.style.gap = '16px'; }
      }
      fonts.push([el, fontMap(parseFloat(cs.fontSize))]);
    }

    // üst şeridi dikey diz (başlık üstte, künye altta) — künye sıkışmasın
    var tops = card.querySelectorAll('.topbar');
    for (var t = 0; t < tops.length; t++) {
      cache(tops[t]);
      tops[t].style.flexDirection = 'column';
      tops[t].style.alignItems = 'flex-start';
      tops[t].style.gap = '6px';
      var hd = tops[t].querySelector('.handle');
      if (hd) { cache(hd); hd.style.textAlign = 'left'; }
    }

    // sabit konumlu alt şeritleri akışa al
    var bars = card.querySelectorAll('.botbar');
    for (var b = 0; b < bars.length; b++) {
      cache(bars[b]);
      bars[b].style.position = 'static';
      bars[b].style.left = 'auto'; bars[b].style.right = 'auto'; bars[b].style.bottom = 'auto';
      bars[b].style.marginTop = '18px';
      bars[b].style.flexWrap = 'wrap'; bars[b].style.gap = '6px';
    }

    // kod bloklarını yatay kaydırılabilir yap — satırlar sarılmasın, tek
    // satırda kalıp masaüstündeki gibi okunsun (hizalama korunur)
    var codes = card.querySelectorAll('[style*="--code"]');
    for (var cx = 0; cx < codes.length; cx++) {
      var box = codes[cx];
      cache(box);
      box.style.overflowX = 'auto';
      box.style.webkitOverflowScrolling = 'touch';
      box.style.padding = '18px 16px';
      var inner = box.querySelector('.mono') || box.firstElementChild;
      if (inner) {
        cache(inner);
        inner.style.whiteSpace = 'nowrap';
        inner.style.display = 'inline-block';
        inner.style.minWidth = 'max-content';
      }
    }

    // geniş SVG şemaları yatay kaydırılabilir çerçeveye al
    var svgs = card.querySelectorAll('svg');
    for (var s = 0; s < svgs.length; s++) {
      var svg = svgs[s];
      if (svg.parentNode && svg.parentNode.className === 'svgscroll') continue;
      var sc = document.createElement('div');
      sc.className = 'svgscroll';
      svg.parentNode.insertBefore(sc, svg);
      sc.appendChild(svg);
      cache(svg);
      svg.style.width = '660px';
      svg.style.maxWidth = 'none';
      svgWraps.push(sc);
    }

    // pass 2 — font boyutlarını uygula
    for (var f = 0; f < fonts.length; f++) {
      cache(fonts[f][0]);
      fonts[f][0].style.fontSize = fonts[f][1] + 'px';
    }
  }

  function toDesktop(card) {
    var wrap = ensureWrap(card);
    var w = +card.dataset.w, h = +card.dataset.h;
    var max = Math.min(document.documentElement.clientWidth - 32, 1200);
    var sca = Math.min(1, max / w);

    card.style.transform = 'scale(' + sca + ')';
    card.style.transformOrigin = 'top left';
    card.style.margin = '0';

    wrap.style.width = (w * sca) + 'px';
    wrap.style.height = (h * sca) + 'px';
    wrap.style.margin = '0 auto 28px';
  }

  function layout() {
    var cards = document.querySelectorAll('.canvas');
    var mobile = isMobile();
    restoreAll();
    for (var i = 0; i < cards.length; i++) {
      if (mobile) toMobile(cards[i]);
      else toDesktop(cards[i]);
    }
  }

  // native boyutları henüz hiçbir değişiklik yapılmadan yakala
  function init() {
    var cards = document.querySelectorAll('.canvas');
    for (var i = 0; i < cards.length; i++) {
      if (!cards[i].dataset.w) {
        cards[i].dataset.w = cards[i].offsetWidth;
        cards[i].dataset.h = cards[i].offsetHeight;
      }
    }
    layout();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
})();
