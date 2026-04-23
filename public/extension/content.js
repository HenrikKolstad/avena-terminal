// Avena Terminal — Browser Extension content script
// Overlays the Avena Score on property listings across idealista, kyero,
// rightmove, fotocasa, aplaceinthesun, spainhouses, thinkspain.
//
// v1.1.0 — luxe brand + row badges + floating card + listing-page detection

(function () {
  'use strict';

  const API = 'https://avenaterminal.com/api/v1/extension/analyze';
  const BASE = 'https://avenaterminal.com';

  // Scraper per hostname
  const PLATFORMS = {
    'kyero.com': {
      price: '.price, [class*="price"], h2.price',
      location: '.location, [class*="location"], h1',
      type: '[class*="type"], .property-type',
      listing: '.listing-card, .property-card, article',
    },
    'idealista.com': {
      price: '.item-price, .price-row, .price',
      location: '.item-detail-char .item-location, .main-info__title-main',
      type: '.item-detail-char .item-typology',
      listing: 'article.item, .item-multimedia-container',
    },
    'rightmove.co.uk': {
      price: '.propertyCard-priceValue, .price',
      location: '.propertyCard-address, address',
      type: '.propertyCard-details .property-information',
      listing: '.propertyCard, .l-searchResult',
    },
    'aplaceinthesun.com': {
      price: '.price, [class*="price"]',
      location: '.location, h1, [class*="location"]',
      type: '.property-type',
      listing: '.property-card, article',
    },
    'fotocasa.es': {
      price: '.re-DetailHeader-price, .re-CardPrice',
      location: '.re-DetailHeader-propertyTitle, .re-CardTitle',
      type: '.re-DetailHeader-propertyType',
      listing: '.re-CardPackAdvance, article',
    },
    'spainhouses.net': {
      price: '.price, [class*="price"]',
      location: '.location, h1',
      type: '.type',
      listing: '.property, article',
    },
    'thinkspain.com': {
      price: '.price, [class*="price"]',
      location: '.location, h1',
      type: '.type',
      listing: '.listing, article',
    },
  };

  function getHost() {
    const h = window.location.hostname.replace(/^www\./, '');
    return Object.keys(PLATFORMS).find((k) => h.endsWith(k));
  }

  function parsePrice(s) {
    if (!s) return null;
    const digits = s.replace(/[^\d]/g, '');
    const n = parseInt(digits, 10);
    return isFinite(n) && n > 10000 ? n : null;
  }

  function scoreToneColor(score) {
    if (score >= 80) return '#F5A623'; // gold
    if (score >= 65) return '#F5B555'; // amber
    if (score >= 50) return '#C9C0B6'; // muted
    return '#E07A1F';                  // accent
  }

  function extractListingData() {
    const host = getHost();
    if (!host) return null;
    const sel = PLATFORMS[host];
    const price = parsePrice(document.querySelector(sel.price)?.textContent || '');
    const location = (document.querySelector(sel.location)?.textContent || '').trim().slice(0, 120);
    const type = (document.querySelector(sel.type)?.textContent || '').trim().slice(0, 40);
    if (!price && !location) return null;
    return { price, location, type, source_url: window.location.href };
  }

  async function queryAvena(payload) {
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  function renderFloatingCard(data, listing) {
    // Remove any existing
    const existing = document.querySelector('.avena-badge-root');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.className = 'avena-badge-root';
    const score = Math.round(data?.score ?? 0);
    const toneColor = scoreToneColor(score);

    const discount = data?.discount_vs_market ?? null;
    const townMedian = data?.town_median_m2 ?? null;
    const marketVerdict = data?.verdict ?? '';

    const metrics = [
      ['Your price',   listing.price ? `€${listing.price.toLocaleString()}` : '—', false],
      ['Town median',  townMedian ? `€${townMedian.toLocaleString()}/m²` : '—', false],
      ['Discount',     discount != null ? `${discount > 0 ? '−' : '+'}${Math.abs(discount)}%` : '—', discount != null && discount > 0],
      ['Verdict',      marketVerdict || '—', false],
    ];

    root.innerHTML = `
      <div class="avena-card">
        <div class="avena-header">
          <div class="avena-mono">A</div>
          <div class="avena-title">Avena Score</div>
          <button class="avena-close" aria-label="Close">×</button>
        </div>
        <div class="avena-score-row">
          <div class="avena-score" style="color:${toneColor}">${score || '—'}</div>
          <div class="avena-score-meta">
            <div class="label">out of 100</div>
            <div class="value">${listing.location || 'Property detected'}</div>
          </div>
        </div>
        <div class="avena-metrics">
          ${metrics.map(([k, v, accent]) => `
            <div class="avena-metric ${accent ? 'accent' : ''}">
              <div class="k">${k}</div>
              <div class="v">${v}</div>
            </div>
          `).join('')}
        </div>
        <a class="avena-cta" href="${BASE}" target="_blank" rel="noopener">Open Avena Terminal →</a>
        <div class="avena-sub">CC BY 4.0 · avenaterminal.com</div>
      </div>
    `;

    root.querySelector('.avena-close').addEventListener('click', () => root.remove());
    document.body.appendChild(root);
  }

  function injectRowBadges() {
    const host = getHost();
    if (!host) return;
    const sel = PLATFORMS[host];
    const nodes = document.querySelectorAll(sel.listing);
    nodes.forEach((node) => {
      if (node.dataset.avenaInjected) return;
      node.dataset.avenaInjected = '1';
      const priceEl = node.querySelector(sel.price);
      if (!priceEl) return;
      const price = parsePrice(priceEl.textContent || '');
      if (!price) return;
      const badge = document.createElement('span');
      badge.className = 'avena-row-badge avena-badge-root';
      badge.innerHTML = `<span class="a">A</span>SCORE`;
      badge.title = 'Click for Avena Score';
      badge.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const locEl = node.querySelector(sel.location);
        const location = (locEl?.textContent || '').trim();
        const data = await queryAvena({ price, location, source_url: window.location.href });
        renderFloatingCard(data || { score: null }, { price, location });
      });
      priceEl.appendChild(badge);
    });
  }

  async function main() {
    const host = getHost();
    if (!host) return;

    // Detection: is this a detail page or a list?
    const listing = extractListingData();
    if (listing && listing.price) {
      // Detail page — auto-show card after a short delay
      setTimeout(async () => {
        const data = await queryAvena(listing);
        renderFloatingCard(data || { score: null }, listing);
      }, 800);
    }

    // Inject row badges on list pages
    injectRowBadges();

    // Watch for SPA-style navigation and re-inject
    const observer = new MutationObserver(() => injectRowBadges());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
