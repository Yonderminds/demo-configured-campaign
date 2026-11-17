/**
 * pdp.js: UI behaviour for the landing (clone of the merchant's Shopify product page).
 *
 * UI only. The SDK owns every cart write, price and quantity (bundle selector, quantity stepper,
 * add-to-cart, cart item list, cart summary); nothing here reads or computes a price.
 *
 * 1. Gallery: thumbnails, arrows and dots scroll the image slider; the active slide is tracked.
 * 2. Zoom modal: an image click opens the theme's product media modal at that image.
 * 3. Side cart: opens after the SDK reports an item added (cart:item-added), closes on the
 *    overlay, the close buttons and Escape. "Buy it now" goes to checkout, so it skips the drawer.
 * 4. Sticky add-to-cart bar: slides in once the main Add to cart button scrolls out of view; its
 *    style dropdown clicks the matching style pill (the SDK bundle card). The SDK's selection
 *    (data-selected-bundle) is mirrored onto the theme's pill radios and the dropdown.
 * 5. Recent-purchase popup, scroll-to-top button and the "Cart reserved" timer (merchant copy).
 */
(function () {
  'use strict';

  var SECTION = 'template--20345470386260__main';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* 1. Gallery ----------------------------------------------------------------------------- */
  function initGallery() {
    var slider = document.getElementById('Slider-Gallery-' + SECTION);
    if (!slider) return;
    var slides = $all('.product__media-item', slider);
    var thumbList = document.getElementById('Slider-Thumbnails-' + SECTION);
    var thumbs = thumbList ? $all('.thumbnail-list__item', thumbList) : [];
    var viewer = document.getElementById('GalleryViewer-' + SECTION);
    var dots = viewer ? $all('.slider-counter__link', viewer) : [];
    var current = 0;

    function setActive(index) {
      if (index < 0 || index >= slides.length) return;
      current = index;
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === index); });
      thumbs.forEach(function (t, i) {
        var b = $('button', t);
        if (!b) return;
        if (i === index) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      dots.forEach(function (d, i) {
        d.classList.toggle('slider-counter__link--active', i === index);
        if (i === index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
      if (thumbList && thumbs[index]) {
        var t = thumbs[index];
        var left = t.offsetLeft - (thumbList.clientWidth - t.clientWidth) / 2;
        thumbList.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
      }
      updateArrows();
    }

    function goTo(index) {
      if (index < 0 || index >= slides.length) return;
      slider.scrollTo({ left: slides[index].offsetLeft - slides[0].offsetLeft, behavior: 'smooth' });
      setActive(index);
    }

    var viewerPrev = viewer && $('.slider-button--prev', viewer);
    var viewerNext = viewer && $('.slider-button--next', viewer);
    function updateArrows() {
      if (viewerPrev) viewerPrev.disabled = current === 0;
      if (viewerNext) viewerNext.disabled = current === slides.length - 1;
    }

    thumbs.forEach(function (t, i) {
      var b = $('button', t);
      if (b) b.addEventListener('click', function () { goTo(i); });
    });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { goTo(i); }); });
    if (viewerPrev) viewerPrev.addEventListener('click', function () { goTo(current - 1); });
    if (viewerNext) viewerNext.addEventListener('click', function () { goTo(current + 1); });

    var thumbSlider = document.getElementById('GalleryThumbnails-' + SECTION);
    if (thumbSlider && thumbList) {
      var tPrev = $('.slider-button--prev', thumbSlider);
      var tNext = $('.slider-button--next', thumbSlider);
      var step = function () { return thumbs[0] ? thumbs[0].clientWidth * 3 : thumbList.clientWidth; };
      var updateThumbArrows = function () {
        if (tPrev) tPrev.disabled = thumbList.scrollLeft <= 2;
        if (tNext) tNext.disabled = thumbList.scrollLeft + thumbList.clientWidth >= thumbList.scrollWidth - 2;
      };
      if (tPrev) tPrev.addEventListener('click', function () { thumbList.scrollBy({ left: -step(), behavior: 'smooth' }); });
      if (tNext) tNext.addEventListener('click', function () { thumbList.scrollBy({ left: step(), behavior: 'smooth' }); });
      thumbList.addEventListener('scroll', updateThumbArrows, { passive: true });
      updateThumbArrows();
    }

    var scrollTimer;
    slider.addEventListener('scroll', function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var x = slider.scrollLeft;
        var best = 0, bestDist = Infinity;
        slides.forEach(function (s, i) {
          var d = Math.abs(s.offsetLeft - slides[0].offsetLeft - x);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        if (best !== current) setActive(best);
      }, 80);
    }, { passive: true });

    setActive(0);
  }

  /* 2. Zoom modal ---------------------------------------------------------------------------- */
  function initModal() {
    var modal = document.getElementById('ProductModal-' + SECTION);
    if (!modal) return;
    var content = $('.product-media-modal__content', modal);
    function open(mediaId) {
      modal.setAttribute('open', '');
      document.body.classList.add('pdp-modal-open');
      var img = mediaId && $('[data-media-id="' + mediaId + '"]', modal);
      if (img && content) {
        if (img.loading === 'lazy') img.loading = 'eager';
        content.scrollTop = img.offsetTop - 20;
      }
      var close = $('.product-media-modal__toggle', modal);
      if (close) close.focus();
    }
    function close() {
      modal.removeAttribute('open');
      document.body.classList.remove('pdp-modal-open');
    }
    $all('.product__media-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () { open(btn.getAttribute('data-media-id')); });
    });
    $all('.product-media-modal__toggle', modal).forEach(function (b) { b.addEventListener('click', close); });
    modal.addEventListener('click', function (e) { if (e.target === modal || e.target.classList.contains('product-media-modal__dialog')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.hasAttribute('open')) close(); });
  }

  /* 3. Side cart ----------------------------------------------------------------------------- */
  var drawer;
  var drawerWanted = false;
  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pdp-drawer-open');
    startCartTimer();
    var inner = $('.drawer__inner', drawer);
    if (inner) inner.focus({ preventScroll: true });
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pdp-drawer-open');
  }
  function initDrawer() {
    drawer = $('[data-pdp-cart-drawer]');
    if (!drawer) return;
    $all('[data-pdp-cart-close]', drawer).forEach(function (el) { el.addEventListener('click', closeDrawer); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
    // Mark which control started the add: only the Add to cart buttons open the drawer.
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-next-action="add-to-cart"]');
      if (btn) drawerWanted = btn.hasAttribute('data-pdp-open-cart');
    }, true);
    // window.nextReady: "push a function and it runs with the SDK as its argument"
    // (https://cart-sdk.nextcommerce.com/v0.4.43/reference/window-globals/); next.on() subscribes to
    // an SDK event (reference/javascript-api/).
    window.nextReady = window.nextReady || [];
    window.nextReady.push(function (sdk) {
      var api = sdk || window.next;
      if (!api || typeof api.on !== 'function') return;
      api.on('cart:item-added', function () {
        if (drawerWanted) { drawerWanted = false; openDrawer(); }
      });
    });
  }

  var timerStarted = false;
  function startCartTimer() {
    var el = $('[data-pdp-cart-timer]');
    if (!el || timerStarted) return;
    timerStarted = true;
    var left = parseInt(el.getAttribute('data-duration'), 10) || 299;
    var tick = function () {
      var m = Math.floor(left / 60), s = left % 60;
      el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      if (left > 0) { left -= 1; setTimeout(tick, 1000); }
    };
    tick();
  }

  /* 4. Sticky add-to-cart bar ---------------------------------------------------------------- */
  function initSticky() {
    var sticky = $('sticky-atc');
    var mainBtn = document.getElementById('ProductSubmitButton-' + SECTION);
    if (!sticky || !mainBtn) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var e = entries[0];
        var past = !e.isIntersecting && e.boundingClientRect.top < 0;
        sticky.classList.toggle('pdp-sticky-visible', past);
      }).observe(mainBtn);
    }
    var select = $('[data-pdp-sticky-style]', sticky);
    if (select) {
      select.addEventListener('change', function () { clickStyleCard(select.value); });
    }
  }

  /* Style pills: the pill labels are the SDK bundle cards. The SDK handles the click (and stops the
     label's default, so the theme radio does not toggle by itself); mirror the SDK's selection
     (data-selected-bundle on the selector) onto the theme radio, which drives the pill styling and
     the "🎁Style - <name>" label, and onto the sticky bar's dropdown. A keyboard change on a radio
     clicks its card so the SDK sees it. */
  function clickStyleCard(styleId) {
    var card = $('[data-next-bundle-card][data-next-bundle-id="style-' + styleId + '"]');
    if (card) card.click();
  }
  function initStyleSync() {
    var selector = $('[data-next-bundle-selector][data-next-selector-id="style"]');
    if (!selector) return;
    var select = $('[data-pdp-sticky-style]');
    var sync = function () {
      var id = (selector.getAttribute('data-selected-bundle') || '').replace('style-', '');
      if (!id) return;
      var radio = $('input[data-pdp-style="' + id + '"]');
      if (radio && !radio.checked) radio.checked = true;
      if (select && select.value !== id) select.value = id;
    };
    new MutationObserver(sync).observe(selector, { attributes: true, attributeFilter: ['data-selected-bundle'] });
    $all('input[data-pdp-style]').forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) clickStyleCard(r.getAttribute('data-pdp-style')); });
    });
    sync();
  }

  /* 5. Popup, scroll-to-top ------------------------------------------------------------------ */
  function initPopup() {
    var pop = document.getElementById('aivs-social-proof-prod');
    if (!pop) return;
    var dismissed = false;
    try { dismissed = sessionStorage.getItem('pdp-proof-closed') === '1'; } catch (e) {}
    pop.classList.remove('is-visible');
    pop.setAttribute('aria-hidden', 'true');
    if (!dismissed) {
      setTimeout(function () { pop.classList.add('is-visible'); pop.setAttribute('aria-hidden', 'false'); }, 2500);
    }
    var close = $('[data-aivs-close]', pop);
    if (close) close.addEventListener('click', function (e) {
      e.stopPropagation();
      pop.classList.remove('is-visible');
      pop.setAttribute('aria-hidden', 'true');
      try { sessionStorage.setItem('pdp-proof-closed', '1'); } catch (err) {}
    });
    var card = $('[data-aivs-card]', pop);
    if (card) card.addEventListener('click', function () {
      var info = document.getElementById('ProductInfo-' + SECTION);
      if (info) info.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function initScrollTop() {
    var btn = $('.scroll-to-top-btn');
    if (!btn) return;
    var update = function () { btn.style.display = window.scrollY > 600 ? '' : 'none'; };
    window.addEventListener('scroll', update, { passive: true });
    btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    update();
  }

  function init() {
    initGallery();
    initModal();
    initDrawer();
    initSticky();
    initStyleSync();
    initPopup();
    initScrollTop();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
