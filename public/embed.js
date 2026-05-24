/*!
 * Avena Terminal Embed v1.0
 *
 * Drop into any institutional intranet, Slack canvas, Notion page, or
 * partner site to render a live snapshot of an Avena widget. No build
 * step required — just a script tag and a data attribute.
 *
 *   <div data-avena-widget="anomalies" data-country="ES" data-limit="5"></div>
 *   <script src="https://avenaterminal.com/embed.js" async></script>
 *
 * Widgets supported (data-avena-widget):
 *   anomalies          z-score anomaly feed
 *   indices            AVENA-CC / VAL / SCR / DPT latest levels
 *   briefings          recent Sovereign Briefings
 *   validation         Avena cohort vs official series deltas
 *   eu-hpi             EU HPI YoY snapshot
 *
 * License: CC BY 4.0. Attribution: "Avena Terminal — avenaterminal.com".
 */

(function () {
  if (typeof window === 'undefined') return;
  if (window.__avenaEmbedLoaded) return;
  window.__avenaEmbedLoaded = true;

  var BASE = 'https://avenaterminal.com';

  var STYLES = ''
    + '.avena-embed{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;'
    + 'border:1px solid rgba(150,120,60,.35);background:rgba(40,32,18,.04);'
    + 'border-radius:4px;padding:14px 16px;color:#1a1a1a;line-height:1.5;'
    + 'font-size:12px;max-width:520px;margin:8px 0;}'
    + '.avena-embed-h{font-size:9px;letter-spacing:.22em;text-transform:uppercase;'
    + 'color:#b8860b;margin-bottom:8px;display:flex;justify-content:space-between;}'
    + '.avena-embed-h a{color:inherit;text-decoration:none;opacity:.8;}'
    + '.avena-embed-h a:hover{opacity:1;}'
    + '.avena-embed ul{list-style:none;margin:0;padding:0;}'
    + '.avena-embed li{display:flex;justify-content:space-between;'
    + 'gap:12px;padding:3px 0;border-top:1px solid rgba(0,0,0,.06);}'
    + '.avena-embed li:first-child{border-top:0;}'
    + '.avena-embed .a-tag{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#666;}'
    + '.avena-embed .a-val{font-variant-numeric:tabular-nums;color:#1a1a1a;}'
    + '.avena-embed .a-up{color:#2a7a3b;}.avena-embed .a-down{color:#a31212;}'
    + '.avena-embed-foot{margin-top:10px;font-size:9px;letter-spacing:.22em;'
    + 'text-transform:uppercase;color:#888;display:flex;justify-content:space-between;}'
    + '.avena-embed-foot a{color:#b8860b;text-decoration:none;}'
    + '.avena-embed-empty{color:#888;font-style:italic;font-size:11px;padding:8px 0;}';

  function injectStyles() {
    if (document.getElementById('avena-embed-styles')) return;
    var s = document.createElement('style');
    s.id = 'avena-embed-styles';
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function shell(host, title, link) {
    host.innerHTML = '';
    host.classList.add('avena-embed');
    var head = el('div', 'avena-embed-h');
    head.appendChild(el('span', '', 'Avena · ' + title));
    var openLink = document.createElement('a');
    openLink.href = link;
    openLink.target = '_blank';
    openLink.rel = 'noopener';
    openLink.textContent = 'Open →';
    head.appendChild(openLink);
    host.appendChild(head);
    var body = el('div', 'avena-embed-body');
    host.appendChild(body);
    var foot = el('div', 'avena-embed-foot');
    foot.innerHTML = '<span>Live · CC BY 4.0</span><a href="' + BASE + '/terminal">avenaterminal.com</a>';
    host.appendChild(foot);
    return body;
  }

  function loadAnomalies(host, host_attrs) {
    var body = shell(host, 'Macro anomalies', BASE + '/alerts/macro');
    var limit = parseInt(host_attrs.limit || '5', 10);
    fetch(BASE + '/api/v1/stats?source=eurostat&indicator=RCH_A&limit=' + limit)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.rows || data.rows.length === 0) {
          body.appendChild(el('div', 'avena-embed-empty', 'No active anomalies'));
          return;
        }
        var ul = el('ul');
        data.rows.forEach(function (r) {
          var li = el('li');
          li.appendChild(el('span', 'a-tag', (r.country_code || '') + ' · ' + (r.period || '')));
          var v = el('span', 'a-val', (r.value >= 0 ? '+' : '') + Number(r.value).toFixed(1) + '%');
          v.classList.add(r.value >= 0 ? 'a-up' : 'a-down');
          li.appendChild(v);
          ul.appendChild(li);
        });
        body.appendChild(ul);
      })
      .catch(function () { body.appendChild(el('div', 'avena-embed-empty', 'Could not load — check connectivity')); });
  }

  function loadValidation(host) {
    var body = shell(host, 'Cross-validation', BASE + '/eu-official');
    fetch(BASE + '/api/v1/validation?limit=5')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.rows || data.rows.length === 0) {
          body.appendChild(el('div', 'avena-embed-empty', 'Calibration phase'));
          return;
        }
        var ul = el('ul');
        data.rows.forEach(function (r) {
          var li = el('li');
          li.appendChild(el('span', 'a-tag', r.country_code + ' · ' + r.region + ' · ' + r.period));
          var d = r.delta_bps;
          var v = el('span', 'a-val', (d >= 0 ? '+' : '') + d + ' bps');
          if (d > 0) v.classList.add('a-up'); else if (d < 0) v.classList.add('a-down');
          li.appendChild(v);
          ul.appendChild(li);
        });
        body.appendChild(ul);
      })
      .catch(function () { body.appendChild(el('div', 'avena-embed-empty', 'Could not load')); });
  }

  function loadBriefings(host) {
    var body = shell(host, 'Sovereign Briefings', BASE + '/sovereign-briefing');
    fetch(BASE + '/api/v1/sovereign-export')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var items = (data && data.briefings) || data || [];
        if (!items.length) { body.appendChild(el('div', 'avena-embed-empty', 'No briefings yet')); return; }
        var ul = el('ul');
        items.slice(0, 5).forEach(function (b) {
          var li = el('li');
          li.appendChild(el('span', 'a-tag', 'Vol. ' + b.volume));
          var link = document.createElement('a');
          link.href = BASE + '/sovereign-briefing/' + b.slug;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = b.title;
          link.className = 'a-val';
          link.style.textDecoration = 'none';
          li.appendChild(link);
          ul.appendChild(li);
        });
        body.appendChild(ul);
      })
      .catch(function () { body.appendChild(el('div', 'avena-embed-empty', 'Could not load')); });
  }

  function loadEuHpi(host) {
    var body = shell(host, 'EU HPI · YoY', BASE + '/eu-official');
    fetch(BASE + '/api/v1/stats?source=eurostat&indicator=RCH_A&limit=8')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.rows || !data.rows.length) { body.appendChild(el('div', 'avena-embed-empty', 'No HPI data yet')); return; }
        var ul = el('ul');
        data.rows.forEach(function (r) {
          var li = el('li');
          li.appendChild(el('span', 'a-tag', r.country_code + ' · ' + r.period));
          var v = el('span', 'a-val', (r.value >= 0 ? '+' : '') + Number(r.value).toFixed(1) + '%');
          v.classList.add(r.value >= 0 ? 'a-up' : 'a-down');
          li.appendChild(v);
          ul.appendChild(li);
        });
        body.appendChild(ul);
      })
      .catch(function () { body.appendChild(el('div', 'avena-embed-empty', 'Could not load')); });
  }

  function mount() {
    injectStyles();
    var nodes = document.querySelectorAll('[data-avena-widget]');
    nodes.forEach(function (host) {
      if (host.__avenaMounted) return;
      host.__avenaMounted = true;
      var widget = host.getAttribute('data-avena-widget');
      var attrs = {
        country: host.getAttribute('data-country'),
        limit:   host.getAttribute('data-limit'),
      };
      switch (widget) {
        case 'anomalies':  loadAnomalies(host, attrs); break;
        case 'validation': loadValidation(host); break;
        case 'briefings':  loadBriefings(host); break;
        case 'eu-hpi':     loadEuHpi(host); break;
        case 'indices':    loadEuHpi(host); break; // alias for now
        default: host.textContent = '[Avena Embed] unknown widget: ' + widget;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // Re-scan when host page mutates (single-page apps)
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function () { mount(); }).observe(document.body, { childList: true, subtree: true });
  }
})();
