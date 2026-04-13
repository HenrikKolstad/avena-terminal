// Avena Intelligence Chrome Extension — Content Script
// Detects property listings and overlays Avena intelligence

(function() {
  'use strict';

  const AVENA_API = 'https://avenaterminal.com/api/v1/extension/analyze';

  // Platform-specific selectors for extracting property data
  const PLATFORMS = {
    'kyero.com': {
      priceSelector: '.price, [class*="price"]',
      locationSelector: '.location, [class*="location"], h1',
      typeSelector: '[class*="type"], .property-type',
      listingSelector: '.listing-card, .property-card, article',
    },
    'idealista.com': {
      priceSelector: '.item-price, .price-row',
      locationSelector: '.item-detail-char .item-location, .main-info__title-main',
      typeSelector: '.item-detail-char .item-typology',
      listingSelector: 'article.item, .item-multimedia-container',
    },
    'rightmove.co.uk': {
      priceSelector: '.propertyCard-priceValue, .price',
      locationSelector: '.propertyCard-address, address',
      typeSelector: '.propertyCard-details .property-information',
      listingSelector: '.propertyCard, .l-searchResult',
    },
    'aplaceinthesun.com': {
      priceSelector: '.price, [class*="price"]',
      locationSelector: '.location, [class*="location"]',
      typeSelector: '[class*="type"]',
      listingSelector: '.property-card, .listing',
    },
    'fotocasa.es': {
      priceSelector: '.re-CardPrice, [class*="price"]',
      locationSelector: '.re-CardTitle, [class*="location"]',
      typeSelector: '[class*="typology"]',
      listingSelector: '.re-SearchResult, article',
    },
  };

  function detectPlatform() {
    const host = window.location.hostname.replace('www.', '');
    return PLATFORMS[host] || null;
  }

  function extractText(el, selector) {
    const found = el.querySelector(selector);
    return found ? found.textContent.trim() : null;
  }

  function extractPrice(text) {
    if (!text) return null;
    const match = text.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(match);
    return isNaN(num) ? null : num;
  }

  function createBadge(data) {
    const badge = document.createElement('div');
    badge.className = 'avena-intelligence-badge';

    const scoreColor = data.deal_score >= 75 ? '#10b981' : data.deal_score >= 60 ? '#fbbf24' : data.deal_score >= 45 ? '#f97316' : '#f87171';
    const scoreBar = data.deal_score ? Math.round(data.deal_score / 100 * 5) : 0;
    const barFill = '\u2588'.repeat(scoreBar) + '\u2592'.repeat(5 - scoreBar);

    badge.innerHTML = `
      <div style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:10px 12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:11px;color:#c9d1d9;min-width:220px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:99999;position:relative;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;border-bottom:1px solid #1c2333;padding-bottom:6px;">
          <span style="color:#10b981;font-weight:bold;font-size:10px;letter-spacing:1px;">⬡ AVENA INTELLIGENCE</span>
          ${data.match_type === 'ESTIMATE' ? '<span style="background:#fbbf2420;color:#fbbf24;font-size:8px;padding:1px 4px;border-radius:3px;">EST</span>' : ''}
        </div>
        ${data.deal_score !== null ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:#8b949e;">Deal Score</span>
          <span style="color:${scoreColor};font-weight:bold;">${data.deal_score}/100 <span style="font-size:9px;letter-spacing:-1px;">${barFill}</span></span>
        </div>` : ''}
        ${data.yield_estimate ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:#8b949e;">Est. Yield</span>
          <span style="color:#c9d1d9;">${data.yield_estimate}%</span>
        </div>` : ''}
        ${data.developer_rating ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:#8b949e;">Developer</span>
          <span style="color:#10b981;">${data.developer_rating} ✓</span>
        </div>` : ''}
        ${data.market_regime ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:#8b949e;">Regime</span>
          <span style="color:#34d399;">${data.market_regime} ↑</span>
        </div>` : ''}
        ${data.vs_market ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:#8b949e;">vs Market</span>
          <span style="color:#10b981;">${data.vs_market}</span>
        </div>` : ''}
        ${data.match_type === 'OUT_OF_MARKET' ? `
        <div style="color:#8b949e;font-size:10px;">${data.message}</div>
        <div style="color:#fbbf24;font-size:9px;margin-top:4px;">${data.coverage}</div>` : ''}
        <div style="border-top:1px solid #1c2333;margin-top:6px;padding-top:6px;">
          <a href="${data.full_analysis_url || 'https://avenaterminal.com'}" target="_blank" style="color:#10b981;text-decoration:none;font-size:10px;">
            View full analysis → avenaterminal.com
          </a>
        </div>
      </div>
    `;

    return badge;
  }

  async function analyzeAndInject(listing, platform) {
    if (listing.querySelector('.avena-intelligence-badge')) return;

    const priceText = extractText(listing, platform.priceSelector);
    const locationText = extractText(listing, platform.locationSelector);
    const typeText = extractText(listing, platform.typeSelector);

    const price = extractPrice(priceText);

    try {
      const res = await fetch(AVENA_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price,
          location: locationText,
          type: typeText,
          source_url: window.location.href,
        }),
      });

      const data = await res.json();
      const badge = createBadge(data);

      listing.style.position = listing.style.position || 'relative';
      badge.style.position = 'absolute';
      badge.style.top = '8px';
      badge.style.right = '8px';
      badge.style.zIndex = '99999';
      listing.appendChild(badge);
    } catch (err) {
      console.log('Avena Intelligence: analysis failed for listing');
    }
  }

  function scanPage() {
    const platform = detectPlatform();
    if (!platform) return;

    const listings = document.querySelectorAll(platform.listingSelector);
    listings.forEach(listing => analyzeAndInject(listing, platform));
  }

  // Initial scan
  setTimeout(scanPage, 2000);

  // Watch for dynamic content (infinite scroll, AJAX loads)
  const observer = new MutationObserver(() => {
    setTimeout(scanPage, 500);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  console.log('Avena Intelligence extension loaded — avenaterminal.com');
})();
