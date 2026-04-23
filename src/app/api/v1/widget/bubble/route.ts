import { NextRequest } from 'next/server';

/**
 * Avena Bubble Widget — embeddable JS
 *
 * Usage:
 *   <div data-avena-bubble="munich"></div>
 *   <script src="https://avenaterminal.com/api/v1/widget/bubble.js?city=munich" async></script>
 *
 * Or set `data-avena-bubble` on any element; script scans DOM on load.
 * Uses Shadow DOM so host-site CSS cannot bleed into the widget.
 *
 * Data source: /api/v1/bubble-scanner (same Avena canonical source).
 * Public, CORS-open. Cached 1h.
 */

export const revalidate = 3600;

const JS = `(function () {
  'use strict';
  var BASE = 'https://avenaterminal.com';
  var API = BASE + '/api/v1/bubble-scanner';

  function scoreColor(s) {
    if (s < 40) return '#3fb950';
    if (s <= 60) return '#d29922';
    if (s <= 75) return '#db6d28';
    return '#f85149';
  }
  function statusInfo(status) {
    switch (status) {
      case 'healthy':     return { t: 'Healthy',     c: '#238636' };
      case 'warming':     return { t: 'Warming',     c: '#9e6a03' };
      case 'overheating': return { t: 'Overheating', c: '#bd561d' };
      case 'bubble':      return { t: 'Bubble',      c: '#da3633' };
      default:            return { t: status || '-', c: '#656d76' };
    }
  }

  function render(city, host, theme) {
    var isDark = theme !== 'light';
    var bg = isDark ? '#0d1117' : '#ffffff';
    var text = isDark ? '#c9d1d9' : '#1f2328';
    var muted = isDark ? '#8b949e' : '#656d76';
    var border = isDark ? '#30363d' : '#d0d7de';
    var link = isDark ? '#58a6ff' : '#0969da';
    var sc = scoreColor(city.bubbleScore);
    var si = statusInfo(city.status);
    var isUp = city.yoyChange >= 0;

    var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    shadow.innerHTML =
      '<style>' +
        '.av-card{box-sizing:border-box;width:320px;height:200px;padding:16px 20px;border-radius:12px;' +
        'border:1px solid ' + border + ';background:' + bg + ';color:' + text + ';' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;font-size:13px;' +
        'display:flex;flex-direction:column;justify-content:space-between;}' +
        '.av-row{display:flex;justify-content:space-between;align-items:center;}' +
        '.av-flag{font-size:18px;margin-right:8px;}' +
        '.av-name{font-weight:600;font-size:15px;}' +
        '.av-badge{background:' + si.c + ';color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;}' +
        '.av-score{font-size:38px;font-weight:700;color:' + sc + ';line-height:1;}' +
        '.av-label{font-size:11px;color:' + muted + ';margin-top:2px;}' +
        '.av-price{font-weight:600;}' +
        '.av-unit{color:' + muted + ';margin-left:4px;font-size:11px;}' +
        '.av-yoy{font-weight:600;color:' + (isUp ? '#3fb950' : '#f85149') + ';}' +
        '.av-foot{text-align:center;font-size:10px;color:' + muted + ';}' +
        '.av-foot a{color:' + link + ';text-decoration:none;}' +
      '</style>' +
      '<div class="av-card">' +
        '<div class="av-row">' +
          '<div><span class="av-flag">' + (city.flag || '') + '</span><span class="av-name">' + city.name + '</span></div>' +
          '<span class="av-badge">' + si.t + '</span>' +
        '</div>' +
        '<div class="av-row">' +
          '<div style="text-align:center;">' +
            '<div class="av-score">' + city.bubbleScore + '</div>' +
            '<div class="av-label">Bubble Score</div>' +
          '</div>' +
          '<div style="text-align:right;">' +
            '<div style="margin-bottom:6px;"><span class="av-price">' + city.pricePerM2.toLocaleString() + '</span><span class="av-unit">EUR/m2</span></div>' +
            '<div><span class="av-yoy">' + (isUp ? '\\u25B2 +' : '\\u25BC ') + city.yoyChange.toFixed(1) + '%</span><span class="av-unit">YoY</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="av-foot">Powered by <a href="' + BASE + '/bubble-scanner/' + city.slug + '" target="_blank" rel="noopener">Avena Terminal</a></div>' +
      '</div>';
  }

  function renderError(host, msg) {
    var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    shadow.innerHTML = '<div style="width:320px;height:200px;padding:16px;border:1px solid #30363d;border-radius:12px;background:#0d1117;color:#8b949e;font-family:sans-serif;font-size:12px;display:flex;align-items:center;justify-content:center;">Avena: ' + msg + '</div>';
  }

  function mount(host) {
    if (host.dataset.avenaMounted === '1') return;
    host.dataset.avenaMounted = '1';
    var slug = (host.getAttribute('data-avena-bubble') || '').toLowerCase().trim();
    var theme = host.getAttribute('data-theme') || 'dark';
    if (!slug) { renderError(host, 'missing data-avena-bubble'); return; }
    fetch(API + '?city=' + encodeURIComponent(slug))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var c = data && data.cities && data.cities[0];
        if (!c) { renderError(host, 'city "' + slug + '" not found'); return; }
        render(c, host, theme);
      })
      .catch(function () { renderError(host, 'failed to load'); });
  }

  function init() {
    var hosts = document.querySelectorAll('[data-avena-bubble]');
    for (var i = 0; i < hosts.length; i++) mount(hosts[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.AvenaBubble = { mount: mount, refresh: init };
})();`;

export async function GET(_req: NextRequest) {
  return new Response(JS, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  });
}
