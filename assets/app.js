/* Kindred demo. A static, scripted walk through the real product flow with sample data.
   No network requests, no storage beyond the theme choice, nothing is sent anywhere. */
(function () {
  'use strict';
  const D = window.KD;
  const PHRASES = (window.KD_PHRASES || []).map(function (p) {
    try { return Object.assign({}, p, { rx: new RegExp(p.re, 'gi') }); } catch (e) { return null; }
  }).filter(Boolean);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pace = function (ms) { return reduced ? Math.min(ms, 120) : ms; };
  const fast = /[?&]fast\b/.test(location.search);
  const wait = function (ms) { return new Promise(function (r) { setTimeout(r, fast ? 30 : pace(ms)); }); };

  // ---------- state ----------
  function fresh() {
    return {
      site: D.ME.site,
      setup: 'none',          // none | reading | done
      readPages: 0,
      filled: 0,
      look: 'idle',           // idle | running | done
      lookStep: 0,
      found: [],              // ids in the order found
      decisions: {},          // id -> keep | skip
      open: {},               // id -> show more open
      lead: 'none',           // none | added | enriching | enriched | briefing | briefed | drafting | drafted
      enriched: 0,
      tab: 'email',
      drafts: JSON.parse(JSON.stringify(D.DRAFTS)),
      copied: false,
      sent: false,
      reply: false,
      dealStarted: false,
      deals: D.DEALS.map(function (d) { return Object.assign({}, d); }),
      won: false,
      openSteps: { enrich: false, brief: true, draft: true }
    };
  }
  let S = fresh();

  // ---------- helpers ----------
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  const DAY = Date.parse(D.SAMPLE_DAY + 'T12:00:00Z');
  function ago(date) {
    const n = Math.round((DAY - Date.parse(date + 'T12:00:00Z')) / 86400000);
    if (n <= 0) return 'today';
    if (n === 1) return 'yesterday';
    return n + ' days ago';
  }
  function niceDate(date) {
    return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  function money(n) { return '$' + n.toLocaleString('en-US'); }
  function initial(s) { return esc(String(s).charAt(0)); }
  function fitBadge(fit) {
    const map = { strong: ['good', 'Strong fit'], possible: ['possible', 'Possible fit'], weak: ['skip', 'Weak fit'] };
    const m = map[fit] || map.weak;
    return '<span class="badge badge-' + m[0] + '"><span class="badge-dot"></span>' + m[1] + '</span>';
  }
  function cite(n) { return ' <a class="cite" href="#src-' + n + '" data-cite="' + n + '" aria-label="Source ' + n + '">[' + n + ']</a>'; }
  const ICON = {
    today: '<path d="M4 9.5h16M8 3v3M16 3v3"/><rect x="4" y="5" width="16" height="15" rx="3"/><circle cx="12" cy="14.5" r="1.6" fill="currentColor" stroke="none"/>',
    discover: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    leads: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.6-3.3 3-5.2 6-5.2s5.4 1.9 6 5.2"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 6M17.6 14.6c1.8.6 3 2.3 3.4 4.9"/>',
    pipeline: '<rect x="3.5" y="4.5" width="4.5" height="15" rx="1.5"/><rect x="9.75" y="4.5" width="4.5" height="10" rx="1.5"/><rect x="16" y="4.5" width="4.5" height="6" rx="1.5"/>',
    week: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
    check: '<path d="M5 12.5l4.2 4L19 7"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    page: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>'
  };
  function icon(name, size) {
    return '<svg class="icon" viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICON[name] + '</svg>';
  }
  function rings(mode) {
    return '<svg class="rings rings-' + (mode || 'static') + '" width="22" height="16" viewBox="0 0 22 16" aria-hidden="true" focusable="false"><circle class="ring-a" cx="7.5" cy="8" r="5.6" fill="none" stroke-width="1.8"/><circle class="ring-b" cx="14.5" cy="8" r="5.6" fill="none" stroke-width="1.8" opacity="0.55"/></svg>';
  }

  // ---------- toast ----------
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, fast ? 800 : 4200);
  }

  // ---------- the guided path ----------
  const STEPS = [
    { route: 'welcome', title: 'Set up from your website', hint: 'Press Read my site. Kindred reads it once and fills in who to look for.', done: function () { return S.setup === 'done'; } },
    { route: 'discover', title: 'Discover companies', hint: 'Press Look now. Each company shows up as it is found, with a dated reason and its source. Keep Northwind Supply Co.', done: function () { return S.decisions.northwind === 'keep'; } },
    { route: 'leads/ada', title: 'Research the lead', hint: 'Enrich, then write the brief. Every line links to the public page it came from.', done: function () { return ['briefed', 'drafting', 'drafted'].indexOf(S.lead) >= 0; } },
    { route: 'leads/ada', title: 'Draft in your voice', hint: 'Write the draft and try editing it. The phrase check flags pushy words as you type. Copy it, then mark it sent.', done: function () { return S.sent; } },
    { route: 'today', title: 'Handle the reply', hint: 'Ada wrote back. Start a deal from her reply.', done: function () { return S.dealStarted; } },
    { route: 'pipeline', title: 'Close it', hint: 'Move Northwind to Won. Wins teach Discover what to look for next.', done: function () { return S.won; } }
  ];
  function currentStep() {
    for (let i = 0; i < STEPS.length; i++) if (!STEPS[i].done()) return i;
    return STEPS.length;
  }
  function ribbon(route) {
    const i = currentStep();
    const dots = STEPS.map(function (s, n) {
      const cls = n < i ? 'done' : n === i ? 'on' : '';
      return '<li class="' + cls + '"><span class="sr">' + esc(s.title) + (n < i ? ', done' : n === i ? ', current' : '') + '</span></li>';
    }).join('');
    if (i >= STEPS.length) {
      return '<div class="ribbon-in"><span class="ribbon-tag">Sample</span><ol class="ribbon-dots" aria-label="Demo steps">' + dots + '</ol>' +
        '<p class="ribbon-text"><b>That is the whole loop.</b> Find, research, write, send it yourself, close. Click around, or start over.</p>' +
        '<button class="btn ghost sm" type="button" data-act="reset">Start over</button></div>';
    }
    const s = STEPS[i];
    const here = route === s.route;
    return '<div class="ribbon-in"><span class="ribbon-tag">Sample</span><ol class="ribbon-dots" aria-label="Demo steps">' + dots + '</ol>' +
      '<p class="ribbon-text"><b>Step ' + (i + 1) + ' of ' + STEPS.length + ': ' + esc(s.title) + '.</b> ' + esc(s.hint) + '</p>' +
      (here ? '' : '<a class="btn primary sm" href="#/' + s.route + '">Go to step ' + (i + 1) + '</a>') +
      (i > 0 ? '<button class="btn ghost sm" type="button" data-act="reset">Start over</button>' : '') + '</div>';
  }

  // ---------- shell ----------
  const NAV = [
    { r: 'today', label: 'Today', icon: 'today' },
    { r: 'discover', label: 'Discover', icon: 'discover' },
    { r: 'leads', label: 'Leads', icon: 'leads' },
    { r: 'pipeline', label: 'Pipeline', icon: 'pipeline' },
    { r: 'week', label: 'This week', icon: 'week' },
    { r: 'settings', label: 'Settings', icon: 'settings' }
  ];
  function nav(route) {
    const base = route.split('/')[0];
    return NAV.map(function (n) {
      const on = base === n.r || (n.r === 'settings' && base === 'welcome');
      return '<a class="tab' + (on ? ' on' : '') + (n.r === 'settings' ? ' tab-desk' : '') + '" href="#/' + n.r + '"' + (on ? ' aria-current="page"' : '') + '>' + icon(n.icon) + '<span>' + n.label + '</span></a>';
    }).join('');
  }
  function status() {
    if (S.look === 'running') return '<span class="pill busy">' + rings('drift') + 'Looking</span>';
    if (S.setup === 'reading') return '<span class="pill busy">' + rings('spin') + 'Reading your site</span>';
    if (S.lead === 'enriching' || S.lead === 'briefing' || S.lead === 'drafting') return '<span class="pill busy">' + rings('spin') + 'Working</span>';
    return '<span class="pill"><span class="pill-dot"></span>Idle</span>';
  }

  // ---------- screens ----------
  function head(title, sub, extra) {
    return '<header class="page-head"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p class="sub">' + esc(sub) + '</p>' : '') + '</div>' + (extra || '') + '</header>';
  }

  function viewWelcome() {
    const steps = '<ol class="setup-steps"><li class="on"><span>1</span>What you sell</li><li class="' + (S.setup === 'done' ? 'on' : '') + '"><span>2</span>Who to find</li><li class="' + (S.decisions.northwind ? 'on' : '') + '"><span>3</span>Your first companies</li></ol>';
    let body = '';
    if (S.setup === 'none') {
      body = '<section class="card"><h2 class="h2">What’s your website?</h2>' +
        '<p class="muted">Kindred reads it once and fills in who you sell to and your company profile. Nothing you wrote is replaced, and you can change every line after.</p>' +
        '<form class="site-form" data-form="site"><label class="field"><span class="label">Your website</span>' +
        '<input id="site" name="site" value="' + esc(S.site) + '" autocomplete="off" spellcheck="false"></label>' +
        '<button class="btn primary" type="submit">Read my site</button></form>' +
        '<p class="note">Or answer five short questions instead. <span class="faint">(Not in this sample.)</span></p></section>';
    } else {
      const pages = D.SITE_PAGES.map(function (p, i) {
        const st = i < S.readPages ? 'done' : (i === S.readPages && S.setup === 'reading') ? 'now' : '';
        return '<li class="' + st + '">' + (st === 'done' ? icon('check', 16) : st === 'now' ? rings('spin') : '<span class="dot"></span>') + '<span>' + esc(p.label) + '</span><span class="faint">' + esc(p.url) + '</span></li>';
      }).join('');
      const rows = D.LOOKING_FOR.slice(0, S.filled).map(function (r) {
        return '<div class="lf-row reveal"><p class="label">' + esc(r.k) + '</p><p class="lf-v">' + esc(r.v) + '</p><p class="lf-why">Why: ' + esc(r.why) + ' <span class="src">' + esc(r.src) + '</span></p></div>';
      }).join('');
      body = '<section class="card"><div class="card-top"><h2 class="h2">Reading ' + esc(S.site) + '</h2>' + (S.setup === 'done' ? '<span class="badge badge-good"><span class="badge-dot"></span>Read once</span>' : '') + '</div><ul class="read-list">' + pages + '</ul></section>' +
        (S.filled ? '<section class="card"><h2 class="h2">Who you’re looking for</h2>' + rows +
          (S.setup === 'done' ? '<div class="card-actions"><a class="btn primary" href="#/discover">Find my first companies</a><span class="note">Every line came from your site. Change any of them in Settings.</span></div>' : '') + '</section>' : '');
    }
    return head('Welcome to Kindred', 'Three short steps to your first companies, each with the reasons attached.') + steps +
      '<blockquote class="lede">The people most likely to buy from you look a lot like the people who already did. Naming them clearly lets Kindred skip everyone else.</blockquote>' + body;
  }

  function candidateCard(c, i) {
    const d = S.decisions[c.id];
    const open = !!S.open[c.id];
    const first = c.signals[0];
    let actions;
    if (d === 'keep') {
      actions = '<div class="cand-actions"><span class="badge badge-good"><span class="badge-dot"></span>Kept</span>' +
        (c.id === 'northwind' ? '<a class="btn primary" href="#/leads/ada">Open Ada Brennan</a>' : '<span class="note">Saved to Leads with ' + esc(c.person) + '.</span>') + '</div>';
    } else if (d === 'skip') {
      actions = '<div class="cand-actions"><span class="badge badge-skip"><span class="badge-dot"></span>Skipped</span><span class="note">Kindred will look for fewer like this.</span><button class="link" type="button" data-act="undo" data-id="' + c.id + '">Undo</button></div>';
    } else {
      actions = '<div class="cand-actions"><button class="btn soft" type="button" data-act="keep" data-id="' + c.id + '">Keep</button>' +
        '<button class="btn quiet" type="button" data-act="skip" data-id="' + c.id + '">Skip</button>' +
        '<button class="btn quiet more" type="button" data-act="more" data-id="' + c.id + '" aria-expanded="' + open + '">Show ' + (open ? 'less' : 'more') + ' ' + icon('chevron', 16) + '</button></div>';
    }
    const more = open && !d ? '<div class="cand-more">' +
      '<div class="kv"><p class="label">Who to write to</p><p><b>' + esc(c.person) + '</b>, ' + esc(c.role) + '</p><p class="muted sm">' + esc(c.personWhy) + '</p></div>' +
      '<div class="kv"><p class="label">How</p><p><b>' + esc(c.channel) + '</b></p><p class="muted sm">' + esc(c.channelWhy) + '</p></div>' +
      '<div class="kv wide"><p class="label">Every reason, with its source</p><ol class="sig-list">' + c.signals.map(function (s, n) {
        return '<li><p>' + esc(s.text) + ' <span class="cite">[' + (n + 1) + ']</span></p><blockquote>“' + esc(s.quote) + '”</blockquote><p class="faint sm">' + esc(s.src) + ' · ' + niceDate(s.date) + ', ' + ago(s.date) + '</p></li>';
      }).join('') + '</ol></div></div>' : '';
    return '<article class="card cand reveal" style="--i:' + i + '"><div class="cand-head"><span class="mono-mark fit-' + c.fit + '">' + initial(c.name) + '</span>' +
      '<div class="cand-title"><h3>' + esc(c.name) + '</h3><p class="muted">' + esc(c.summary) + ' <span class="faint">' + esc(c.place) + '</span></p></div>' + fitBadge(c.fit) + '</div>' +
      '<ul class="reasons"><li>' + esc(first.text) + ' <span class="cite">[1]</span> <span class="age">' + ago(first.date) + '</span></li></ul>' + more + actions + '</article>';
  }

  function viewDiscover() {
    const byId = {};
    D.FOUND.forEach(function (f) { byId[f.id] = f; });
    const found = S.found.map(function (id) { return byId[id]; });
    const kept = found.filter(function (f) { return !f.left; });
    const left = found.filter(function (f) { return f.left; });
    const ask = '<section class="card ask"><p class="label">Ask</p><p class="ask-text">' + esc(D.ASK) + '</p>' +
      '<p class="note">From your website read. ' + (S.setup === 'done' ? '' : '<a href="#/welcome">Set up from your website first</a>, or look with this sample ask.') + '</p>' +
      (S.look === 'idle' ? '<div class="card-actions"><button class="btn primary" type="button" data-act="look">Look now</button><span class="note">Takes about a minute in the real app. Faster here.</span></div>' : '') + '</section>';
    let progress = '';
    if (S.look !== 'idle') {
      const steps = D.LOOK_STEPS.map(function (s, i) {
        const st = i < S.lookStep ? 'done' : (i === S.lookStep && S.look === 'running') ? 'now' : '';
        return '<li class="' + st + '">' + (st === 'done' ? icon('check', 16) : st === 'now' ? rings('spin') : '<span class="dot"></span>') + '<span>' + esc(s) + '</span></li>';
      }).join('');
      const so = found.map(function (f) {
        return '<li class="reveal">' + (f.left ? '<span class="badge badge-skip">Left out</span>' : fitBadge(f.fit)) + '<span class="fs-name">' + esc(f.name) + '</span>' + (f.left ? '<span class="faint sm">' + esc(f.left) + '</span>' : '') + '</li>';
      }).join('');
      progress = '<div class="disc-split"><section class="card"><div class="card-top"><h2 class="h3">' + (S.look === 'running' ? 'Looking now' : 'Done looking') + '</h2>' + (S.look === 'running' ? rings('drift') : '') + '</div><ul class="read-list">' + steps + '</ul></section>' +
        '<section class="card" aria-live="polite"><div class="card-top"><h2 class="h3">Found so far</h2><span class="faint sm">' + found.length + ' checked</span></div>' + (so ? '<ul class="found-list">' + so + '</ul>' : '<p class="muted">Nothing yet. Each company shows up here as soon as it is found.</p>') + '</section></div>';
    }
    const results = kept.length ? '<h2 class="section-title">' + kept.length + ' new ' + (kept.length === 1 ? 'account' : 'accounts') + ' for you</h2>' + kept.map(candidateCard).join('') +
      (S.look === 'done' ? '<p class="note">Left out ' + left.length + ', each with a reason above. Kindred shows only what it can cite. Good reasons to write, not a promise they will buy.</p>' : '') : '';
    return head('Discover', 'New accounts for you today, and why each one fits.') + ask + progress + results;
  }

  function sourceList() {
    return '<ol class="source-list">' + D.SOURCES.slice(0, Math.max(S.enriched, 0)).map(function (s) {
      return '<li id="src-' + s.n + '" class="reveal"><span class="src-n">' + s.n + '</span><div><p class="src-title">' + icon('page', 16) + esc(s.title) + '</p><p class="faint sm">' + esc(s.url) + ' · ' + niceDate(s.date) + ', ' + ago(s.date) + '</p><p class="sm">' + esc(s.excerpt) + '</p></div></li>';
    }).join('') + '</ol>';
  }

  function stepState(name) {
    const order = ['none', 'added', 'enriching', 'enriched', 'briefing', 'briefed', 'drafting', 'drafted'];
    const at = order.indexOf(S.lead);
    if (name === 'add') return at >= 1 ? 'done' : 'todo';
    if (name === 'enrich') return at >= 3 ? 'done' : at === 2 ? 'now' : 'todo';
    if (name === 'brief') return at >= 5 ? 'done' : at === 4 ? 'now' : 'todo';
    return at >= 7 ? 'done' : at === 6 ? 'now' : 'todo';
  }

  function phraseCheck(text) {
    const hits = [];
    PHRASES.forEach(function (p) {
      p.rx.lastIndex = 0;
      const m = p.rx.exec(text);
      if (m) hits.push({ found: m[0], alt: p.alt, cat: p.cat });
    });
    return hits;
  }
  function phraseHtml(text) {
    const hits = phraseCheck(text);
    if (!hits.length) return '<p class="check ok">' + icon('check', 16) + 'Phrase check: clean. It advises only and does not block Copy draft.</p>';
    return '<div class="check warn"><p><b>Phrase check: ' + hits.length + ' to look at.</b> It advises only and does not block Copy draft.</p><ul>' + hits.slice(0, 4).map(function (h) {
      return '<li><mark>' + esc(h.found) + '</mark> ' + esc(h.cat.toLowerCase()) + '. Try: ' + esc(h.alt) + '</li>';
    }).join('') + '</ul></div>';
  }
  function words(t) { return (t.trim().match(/\S+/g) || []).length; }

  function draftPanel() {
    const d = S.drafts[S.tab];
    const tabs = Object.keys(S.drafts).map(function (k) {
      return '<button type="button" class="seg' + (k === S.tab ? ' on' : '') + '" data-act="tab" data-tab="' + k + '" aria-pressed="' + (k === S.tab) + '">' + esc(S.drafts[k].label) + '</button>';
    }).join('');
    return '<div class="draft"><div class="draft-top"><h3 class="h3">Copy it, then send it yourself</h3><div class="segs" role="group" aria-label="Channel">' + tabs + '</div></div>' +
      '<p class="faint sm draft-meta"><span>Version 1, in your voice: direct, balanced, short</span><span id="wc">' + words(d.body) + ' words</span></p>' +
      (d.subject ? '<label class="subject"><span class="label">Subject</span><input id="subj" value="' + esc(d.subject) + '"></label>' : '') +
      '<textarea id="body" rows="' + (S.tab === 'email' ? 10 : 5) + '" aria-label="Draft">' + esc(d.body) + '</textarea>' +
      '<p class="sm opens">Opens with a cited fact' + cite(d.opens) + ': “' + esc(D.SOURCES[0].excerpt.split('. ')[1] || D.SOURCES[0].excerpt) + '”</p>' +
      '<div id="pcheck">' + phraseHtml(d.body) + '</div>' +
      '<div class="card-actions">' +
      (S.sent ? '<span class="badge badge-good"><span class="badge-dot"></span>Sent by you</span><a class="btn primary" href="#/today">Go to Today</a>'
        : S.copied ? '<button class="btn" type="button" data-act="copy">' + icon('copy', 16) + 'Copy again</button><button class="btn primary" type="button" data-act="sent">I sent it</button>'
          : '<button class="btn" type="button" data-act="redraft">Write again</button><button class="btn primary" type="button" data-act="copy">' + icon('copy', 16) + 'Copy draft</button>') +
      '</div><p class="note">You are the sender. Kindred never sends on its own. In the real app you can also send from your own Gmail or Outlook.</p></div>';
  }

  function step(name, label, summary, body, opened) {
    const st = stepState(name);
    const mark = st === 'done' ? '<span class="step-mark done">' + icon('check', 14) + '</span>' : st === 'now' ? '<span class="step-mark now">' + rings('spin') + '</span>' : '<span class="step-mark"></span>';
    const toggle = st === 'done' && body ? '<button class="link" type="button" data-act="toggle" data-step="' + name + '" aria-expanded="' + !!opened + '">' + (opened ? 'Hide' : 'Open') + '</button>' : '';
    return '<section class="card step ' + st + '"><div class="step-head">' + mark + '<div class="step-title"><h2 class="h3">' + label + '</h2><p class="faint sm">' + summary + '</p></div>' + toggle + '</div>' + (opened && body ? '<div class="step-body">' + body + '</div>' : '') + '</section>';
  }

  function briefBody() {
    const b = D.BRIEF;
    const list = function (items) { return '<ul class="bl">' + items.map(function (x) { return '<li>' + esc(x.text) + (x.cite ? cite(x.cite) : '') + (x.kind ? ' <span class="badge badge-neutral">' + esc(x.kind) + '</span>' : '') + '</li>'; }).join('') + '</ul>'; };
    return '<div class="brief"><div class="brief-fit">' + fitBadge(b.fit.rating) + '<span class="muted sm">Two dated reasons from public pages.</span></div>' +
      '<div class="bgrid"><div><h4>Why it fits</h4>' + list(b.fit.reasons) + '</div><div><h4>Why now</h4>' + list(b.whyNow) + '</div>' +
      '<div><h4>Who they are</h4>' + list(b.who) + '</div><div><h4>What might stop them</h4>' + list(b.objections) + '</div></div>' +
      '<div class="gaps"><h4>Kindred could not find</h4><ul>' + b.gaps.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul><p class="faint sm">Ask, do not guess. These are good questions for a first call.</p></div>' +
      '<div class="approach"><h4>Approach</h4><p><b>' + esc(b.approach.channel) + '</b>, ' + esc(b.approach.timing.toLowerCase()) + '. ' + esc(b.approach.note) + '</p></div>' +
      '<h4>Sources</h4>' + sourceList() + '</div>';
  }

  function viewLead() {
    const L = D.LEAD;
    if (S.lead === 'none') {
      return '<nav class="crumbs"><a href="#/leads">Leads</a><span>/</span><span>' + esc(L.name) + '</span></nav>' + head(L.name, L.role + ' at ' + L.company) +
        '<section class="card empty"><h2 class="h3">Not kept yet</h2><p class="muted">In this sample, Ada comes from Discover. Keep Northwind Supply Co there and she lands here.</p><div class="card-actions"><a class="btn primary" href="#/discover">Go to Discover</a></div></section>';
    }
    const at = stepState;
    const bar = '<ol class="stepper">' + [['add', 'Add'], ['enrich', 'Enrich'], ['brief', 'Brief'], ['draft', 'Draft']].map(function (p) {
      return '<li class="' + at(p[0]) + '"><span class="sm-mark">' + (at(p[0]) === 'done' ? icon('check', 12) : '') + '</span>' + p[1] + '</li>';
    }).join('') + '</ol>';
    let primary = '';
    if (S.lead === 'added') primary = '<button class="btn primary" type="button" data-act="enrich">Enrich</button><span class="note">Reads a few public pages about Ada and Northwind.</span>';
    if (S.lead === 'enriched') primary = '<button class="btn primary" type="button" data-act="brief">Write the brief</button><span class="note">' + D.SOURCES.length + ' public pages saved.</span>';
    if (S.lead === 'briefed') primary = '<button class="btn primary" type="button" data-act="draft">Write a draft</button><span class="note">In your voice, from the brief.</span>';

    const enrichSum = S.enriched ? S.enriched + ' public ' + (S.enriched === 1 ? 'page' : 'pages') + ' saved' : 'Reads public pages: company site, careers, news';
    const briefSum = at('brief') === 'done' ? 'Version 1. Strong fit, every line cited' : at('brief') === 'now' ? 'Writing, only from the saved pages' : 'Fit, why now, who they are, what might stop them';
    const draftSum = at('draft') === 'done' ? (S.sent ? 'Sent by you' : S.copied ? 'Copied. Send it from your own email' : 'Email, LinkedIn DM, and a call opener') : at('draft') === 'now' ? 'Writing in your voice' : 'Email, DM, or a call opener';

    const main = bar + (primary ? '<div class="card primary-row">' + primary + '</div>' : '') +
      step('enrich', 'Enrich', enrichSum, S.enriched ? sourceList() : '', at('enrich') === 'now' || S.openSteps.enrich) +
      step('brief', 'Brief', briefSum, at('brief') === 'done' ? briefBody() : '', S.openSteps.brief) +
      step('draft', 'Draft', draftSum, at('draft') === 'done' ? draftPanel() : '', S.openSteps.draft);

    const side = '<aside class="lead-side"><section class="card"><div class="card-top"><h2 class="h3">' + esc(L.type) + '</h2><span class="badge badge-' + (S.sent ? 'good' : 'possible') + '">' + (S.reply ? 'Replied' : S.sent ? 'Sent' : 'New') + '</span></div>' +
      '<dl class="facts"><dt>Email</dt><dd>' + esc(L.email) + ' <span class="badge badge-good sm-badge">Likely</span></dd><dt>Company</dt><dd>' + esc(L.company) + '</dd><dt>Site</dt><dd>' + esc(L.domain) + '</dd><dt>How they came in</dt><dd>Kept from Discover</dd></dl></section>' +
      '<section class="card"><h2 class="h3">Deals</h2><p class="muted sm">' + (S.dealStarted ? 'Northwind is on your pipeline.' : 'When they want to talk about buying, start a deal. It goes on your pipeline.') + '</p>' + (S.dealStarted ? '<a class="btn sm" href="#/pipeline">Open pipeline</a>' : '') + '</section></aside>';

    return '<nav class="crumbs"><a href="#/leads">Leads</a><span>/</span><span>' + esc(L.name) + '</span></nav>' + head(L.name, L.role + ' at ' + L.company) +
      '<div class="lead-grid"><div class="lead-main">' + main + '</div>' + side + '</div>';
  }

  function viewLeads() {
    const rows = [];
    if (S.lead !== 'none') rows.push({ id: 'ada', name: D.LEAD.name, role: D.LEAD.role, company: D.LEAD.company, status: S.reply ? 'Replied' : S.sent ? 'Sent' : S.lead === 'drafted' ? 'Draft ready' : S.lead === 'briefed' ? 'Brief ready' : 'New', fit: 'strong', when: D.SAMPLE_DAY, link: true });
    D.LEADS.forEach(function (l) { rows.push(l); });
    return head('Leads', 'Everyone you are working, newest first.') +
      '<section class="card table-card"><table class="table"><thead><tr><th>Person</th><th>Company</th><th>Fit</th><th>Status</th><th>Added</th></tr></thead><tbody>' + rows.map(function (r) {
        const name = r.link ? '<a href="#/leads/ada">' + esc(r.name) + '</a>' : esc(r.name);
        return '<tr><td><b>' + name + '</b><span class="faint sm block">' + esc(r.role) + '</span></td><td>' + esc(r.company) + '</td><td>' + fitBadge(r.fit) + '</td><td>' + esc(r.status) + '</td><td class="faint">' + ago(r.when) + '</td></tr>';
      }).join('') + '</tbody></table></section>' +
      (S.lead === 'none' ? '<p class="note">Ada Brennan joins this list when you keep Northwind in <a href="#/discover">Discover</a>.</p>' : '');
  }

  function viewToday() {
    const greet = '<header class="page-head"><div><h1>Good morning, ' + esc(D.ME.first) + '</h1><p class="sub">' + (S.sent ? 'Sunday, November 1' : 'Friday, October 30') + '</p></div></header>';
    let top;
    if (S.sent && !S.dealStarted) {
      const r = D.REPLY;
      top = '<section class="card hero-card reveal" aria-label="1 reply"><div class="card-top"><h2 class="h2">1 reply</h2><span class="badge badge-good"><span class="badge-dot"></span>' + esc(r.read) + '</span></div>' +
        '<div class="reply"><p class="reply-from"><b>' + esc(r.from) + '</b>, ' + esc(r.company) + ' <span class="faint sm">2 days after you sent it</span></p><blockquote>' + esc(r.body) + '</blockquote></div>' +
        '<p class="muted sm">Kindred’s read: ' + esc(r.note) + '</p><div class="card-actions"><button class="btn primary" type="button" data-act="deal">Start a deal</button><a class="btn" href="#/leads/ada">Open lead</a></div></section>';
    } else if (S.dealStarted) {
      top = '<section class="card hero-card"><h2 class="h2">You are all caught up</h2><p class="muted">Northwind is on your pipeline. The call with Ada is Thursday at 10.</p><div class="card-actions"><a class="btn primary" href="#/pipeline">Open pipeline</a></div></section>';
    } else {
      top = '<section class="card hero-card"><h2 class="h2">Your next step</h2><p class="muted">' + (S.setup === 'done' ? 'Find today’s companies. Each one comes with the reasons attached.' : 'Tell Kindred what you sell. One read of your website is enough.') + '</p><div class="card-actions"><a class="btn primary" href="#/' + (S.setup === 'done' ? 'discover' : 'welcome') + '">' + (S.setup === 'done' ? 'Look for companies' : 'Set up from your website') + '</a></div></section>';
    }
    const tasks = [
      { t: 'Follow up with Ivy Okafor', d: 'Sent 6 days ago, no reply. A short nudge with the studio timetable.', b: 'Due today' },
      { t: 'Send Lee Fontaine the two clinic sample', d: 'Promised on Tuesday’s call.', b: 'Due today' },
      { t: 'Harbor Street Bakery proposal', d: 'Bea said she would decide by Friday.', b: 'Friday' }
    ];
    return greet + top + '<h2 class="section-title">Also today</h2><div class="cgrid">' + tasks.map(function (x) {
      return '<section class="card task"><div class="card-top"><h3 class="h3">' + esc(x.t) + '</h3><span class="badge badge-neutral">' + esc(x.b) + '</span></div><p class="muted sm">' + esc(x.d) + '</p></section>';
    }).join('') + '</div>';
  }

  function viewPipeline() {
    const open = S.deals.filter(function (d) { return D.STAGES.find(function (s) { return s.id === d.stage; }).kind === 'open'; });
    const total = open.reduce(function (a, d) { return a + d.amount; }, 0);
    const cols = D.STAGES.map(function (st) {
      const ds = S.deals.filter(function (d) { return d.stage === st.id; });
      const sum = ds.reduce(function (a, d) { return a + d.amount; }, 0);
      return '<section class="col col-' + st.kind + '"><div class="col-head"><h2 class="h3">' + esc(st.name) + '</h2><span class="faint sm">' + ds.length + (sum ? ' · ' + money(sum) : '') + '</span></div>' + ds.map(function (d) {
        const opts = D.STAGES.map(function (o) { return '<option value="' + o.id + '"' + (o.id === d.stage ? ' selected' : '') + '>' + esc(o.name) + '</option>'; }).join('');
        return '<article class="deal' + (d.id === 'd-north' ? ' hl' : '') + '"><h3>' + esc(d.name) + '</h3><p class="muted sm">' + esc(d.contact) + '</p>' +
          '<p class="deal-meta"><b>' + money(d.amount) + '</b><span class="faint">a year</span><span class="faint">· ' + (d.days === 0 ? 'today' : d.days + 'd here') + '</span></p>' +
          (d.next ? '<p class="next sm">Next: ' + esc(d.next) + '</p>' : '') + (d.lost ? '<p class="faint sm">Lost: ' + esc(d.lost) + '</p>' : '') +
          '<label class="move"><span class="sr">Move ' + esc(d.name) + ' to</span><select data-act="move" data-id="' + d.id + '">' + opts + '</select></label></article>';
      }).join('') + (ds.length ? '' : '<p class="faint sm col-empty">Nothing here</p>') + '</section>';
    }).join('');
    const learn = S.won ? '<section class="card learn reveal">' + rings('meet') + '<div><h2 class="h3">Won. Discover learned from it.</h2><p class="muted">' + esc(D.WIN_LEARN) + '</p></div></section>' : '';
    return head('Pipeline', 'Every deal your team is working, from first talk to won.') + learn +
      '<p class="note">Open: <b>' + money(total) + '</b> a year across ' + open.length + ' deals. Cards move with a Move to menu, so it works with a keyboard and on a phone.</p><div class="board">' + cols + '</div>';
  }

  function viewWeek() {
    const w = D.WEEK;
    return head('This week', 'What you did, what came back, and what worked.') +
      '<div class="tiles">' + w.tiles.map(function (t) { return '<section class="card tile"><p class="label">' + esc(t.k) + '</p><p class="tile-v">' + t.v + '</p><p class="faint sm">' + esc(t.d) + '</p></section>'; }).join('') + '</div>' +
      '<section class="card"><h2 class="h3">What worked</h2><ul class="worked">' + w.worked.map(function (x) { return '<li><span class="badge badge-' + x.tone + '"><span class="badge-dot"></span>' + (x.tone === 'good' ? 'Worked' : 'Watch') + '</span>' + esc(x.text) + '</li>'; }).join('') + '</ul>' +
      '<p class="note">Counts come from what you saved. Kindred never counts silence as a reply.</p></section>';
  }

  function viewSettings() {
    const rows = S.setup === 'done' ? D.LOOKING_FOR.map(function (r) {
      return '<div class="lf-row"><p class="label">' + esc(r.k) + '</p><p class="lf-v">' + esc(r.v) + '</p><p class="lf-why">Why: ' + esc(r.why) + '</p></div>';
    }).join('') : '<p class="muted">Not set up yet. <a href="#/welcome">Read your website</a> to fill this in.</p>';
    return '<nav class="subnav"><a class="on" href="#/settings">Who to look for</a><span>About you</span><span>Your materials</span><span>Email</span><span>Stages</span><span>Team</span><span>Billing</span></nav>' +
      head('Who you’re looking for', 'Enter your website and Kindred finds who needs what you sell. You can change every line.') +
      '<section class="card">' + rows + '</section>' +
      (S.setup === 'done' ? '<p class="note">From your site, Kindred also filled in ' + D.ALSO_FILLED.join(', ') + ' under About you. Nothing you wrote was replaced.</p>' : '');
  }

  const VIEWS = { welcome: viewWelcome, today: viewToday, discover: viewDiscover, leads: viewLeads, 'leads/ada': viewLead, pipeline: viewPipeline, week: viewWeek, settings: viewSettings };

  // ---------- render ----------
  function route() {
    const r = (location.hash || '').replace(/^#\/?/, '') || 'welcome';
    return VIEWS[r] ? r : 'welcome';
  }
  let lastRoute = '';
  function render() {
    const r = route();
    const changed = r !== lastRoute;
    // Keep the caret in the draft while typing elsewhere re-renders the page.
    const active = document.activeElement;
    const keep = active && (active.id === 'body' || active.id === 'subj') ? { id: active.id, s: active.selectionStart, e: active.selectionEnd } : null;
    $('#nav').innerHTML = nav(r);
    $('#status').innerHTML = status();
    $('#ribbon').innerHTML = ribbon(r);
    $('#view').innerHTML = VIEWS[r]();
    document.title = ({ welcome: 'Welcome', today: 'Today', discover: 'Discover', leads: 'Leads', 'leads/ada': 'Ada Brennan', pipeline: 'Pipeline', week: 'This week', settings: 'Settings' })[r] + ' · Kindred sample';
    if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch (e) { /* ignore */ } } }
    if (changed) {
      lastRoute = r;
      window.scrollTo(0, 0);
      if (!keep) $('#view').focus({ preventScroll: true });
    }
  }

  // ---------- scripted runs ----------
  async function readSite() {
    if (S.setup !== 'none') return;
    const input = $('#site');
    S.site = (input && input.value.trim()) || D.ME.site;
    S.setup = 'reading'; S.readPages = 0; S.filled = 0; render();
    for (let i = 0; i < D.SITE_PAGES.length; i++) { await wait(650); S.readPages = i + 1; render(); }
    for (let i = 0; i < D.LOOKING_FOR.length; i++) { await wait(380); S.filled = i + 1; render(); }
    S.setup = 'done'; render();
    toast('From your site, Kindred also filled in ' + D.ALSO_FILLED.join(', ') + ' under Settings, About you.');
  }
  async function look() {
    if (S.look !== 'idle') return;
    S.look = 'running'; S.lookStep = 0; S.found = []; render();
    const order = D.FOUND.map(function (f) { return f.id; });
    let f = 0;
    for (let i = 0; i < D.LOOK_STEPS.length; i++) {
      await wait(700);
      S.lookStep = i + 1;
      if (i >= 1 && f < order.length) { S.found.push(order[f++]); }
      if (i >= 2 && f < order.length) { S.found.push(order[f++]); }
      render();
    }
    while (f < order.length) { await wait(400); S.found.push(order[f++]); render(); }
    S.look = 'done'; render();
  }
  async function enrich() {
    S.lead = 'enriching'; S.enriched = 0; render();
    for (let i = 0; i < D.SOURCES.length; i++) { await wait(700); S.enriched = i + 1; render(); }
    S.lead = 'enriched'; S.openSteps.enrich = false; render();
  }
  async function brief() { S.lead = 'briefing'; render(); await wait(1500); S.lead = 'briefed'; S.openSteps.brief = true; render(); }
  async function draft() { S.lead = 'drafting'; S.openSteps.brief = false; render(); await wait(1300); S.lead = 'drafted'; S.openSteps.draft = true; render(); }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); });
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.remove();
  }

  // ---------- events ----------
  document.addEventListener('submit', function (e) {
    if (e.target.matches('[data-form="site"]')) { e.preventDefault(); readSite(); }
  });
  document.addEventListener('click', function (e) {
    const c = e.target.closest('[data-cite]');
    if (c) {
      e.preventDefault();
      const el = document.getElementById('src-' + c.getAttribute('data-cite'));
      if (el) { el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
      else toast('Source ' + c.getAttribute('data-cite') + ' is listed under Sources in the brief.');
      return;
    }
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'SELECT') return;
    const act = b.getAttribute('data-act');
    const id = b.getAttribute('data-id');
    if (act === 'look') look();
    else if (act === 'keep') {
      S.decisions[id] = 'keep';
      if (id === 'northwind' && S.lead === 'none') S.lead = 'added';
      const f = D.FOUND.find(function (x) { return x.id === id; });
      render(); toast('Kept. ' + f.name + ' is in Leads with ' + f.person + '.');
    } else if (act === 'skip') { S.decisions[id] = 'skip'; render(); }
    else if (act === 'undo') { delete S.decisions[id]; render(); }
    else if (act === 'more') { S.open[id] = !S.open[id]; render(); }
    else if (act === 'enrich') enrich();
    else if (act === 'brief') brief();
    else if (act === 'draft' || act === 'redraft') { if (act === 'redraft') { S.drafts = JSON.parse(JSON.stringify(D.DRAFTS)); toast('Wrote it again from the same brief.'); render(); } else draft(); }
    else if (act === 'toggle') { const k = b.getAttribute('data-step'); S.openSteps[k] = !S.openSteps[k]; render(); }
    else if (act === 'tab') { S.tab = b.getAttribute('data-tab'); render(); }
    else if (act === 'copy') {
      const d = S.drafts[S.tab];
      copyText((d.subject ? 'Subject: ' + d.subject + '\n\n' : '') + d.body).then(function () {
        S.copied = true; render(); toast('Copied. Paste it into your own email and send it yourself.');
      });
    } else if (act === 'sent') { S.sent = true; S.reply = true; render(); toast('Marked as sent. Two days later, Ada wrote back. See Today.'); }
    else if (act === 'deal') {
      if (!S.dealStarted) { S.deals.unshift(Object.assign({}, D.NEW_DEAL)); S.dealStarted = true; }
      location.hash = '#/pipeline'; toast('Deal started in First talk, linked to Ada’s lead.');
    } else if (act === 'reset') { S = fresh(); location.hash = '#/welcome'; render(); }
    else if (act === 'theme') cycleTheme();
  });
  document.addEventListener('change', function (e) {
    const s = e.target.closest('select[data-act="move"]');
    if (!s) return;
    const d = S.deals.find(function (x) { return x.id === s.getAttribute('data-id'); });
    d.stage = s.value; d.days = 0;
    const st = D.STAGES.find(function (x) { return x.id === s.value; });
    if (d.id === 'd-north' && st.kind === 'won') { S.won = true; d.next = ''; }
    render();
    toast('Moved ' + d.name + ' to ' + st.name + '.');
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'body' || e.target.id === 'subj') {
      const d = S.drafts[S.tab];
      if (e.target.id === 'body') d.body = e.target.value; else d.subject = e.target.value;
      // Update the check in place, so typing never loses focus.
      const pc = $('#pcheck'); if (pc) pc.innerHTML = phraseHtml(d.body);
      const wc = $('#wc'); if (wc) wc.textContent = words(d.body) + ' words';
    }
  });
  window.addEventListener('hashchange', render);

  // ---------- theme ----------
  const THEMES = ['auto', 'light', 'dark'];
  function getTheme() { try { return localStorage.getItem('kd-theme') || 'auto'; } catch (e) { return 'auto'; } }
  function applyTheme(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    const b = $('#theme');
    if (b) { b.innerHTML = icon(t === 'dark' ? 'moon' : 'sun', 18) + '<span>' + (t === 'auto' ? 'Theme: device' : t === 'dark' ? 'Theme: dark' : 'Theme: light') + '</span>'; }
  }
  function cycleTheme() {
    const t = THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length];
    try { localStorage.setItem('kd-theme', t); } catch (e) { /* private window */ }
    applyTheme(t);
  }
  const q = new URLSearchParams(location.search).get('theme');
  applyTheme(THEMES.indexOf(q) >= 0 ? q : getTheme());

  render();
})();
