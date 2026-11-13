/* Orblo sample. A static, scripted walk through the real product flow with sample data.
   No network requests, no storage beyond the theme choice, nothing is sent anywhere. */
(function () {
  'use strict';
  const D = window.OB;
  const PHRASES = (window.OB_PHRASES || []).map(function (p) {
    try { return Object.assign({}, p, { rx: new RegExp(p.re, 'i') }); } catch (e) { return null; }
  }).filter(Boolean);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fast = /[?&]fast\b/.test(location.search);
  const wait = function (ms) { return new Promise(function (r) { setTimeout(r, fast ? 20 : reduced ? Math.min(ms, 150) : ms); }); };

  // ---------- state ----------
  function fresh() {
    return {
      onboarded: false,
      look: 'idle', lookStep: 0, found: [], decisions: {}, open: { harbour: true },
      people: 'none', wf: 0, email: 'none',
      lead: 'none', enriched: 0, logStep: 0,
      tab: 'email', drafts: JSON.parse(JSON.stringify(D.DRAFTS)), copied: false, sent: false,
      practice: { mood: '', answer: '', noticed: null },
      nextConfirmed: false, dealStarted: false,
      deals: D.DEALS.map(function (d) { return Object.assign({}, d); }), won: false,
      openSteps: { enrich: false, brief: true, draft: true },
      orbAsked: []
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
  function today() { return S.sent ? D.REPLY_DAY : D.SAMPLE_DAY; }
  function ago(date) {
    const n = Math.round((Date.parse(today() + 'T12:00:00Z') - Date.parse(date + 'T12:00:00Z')) / 86400000);
    if (n <= 0) return 'today';
    if (n === 1) return 'yesterday';
    return n + ' days ago';
  }
  function niceDate(date) { return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); }
  function longDate(date) { return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }); }
  function money(n) { return '$' + n.toLocaleString('en-US'); }
  function badge(tone, text, dot) { return '<span class="badge badge-' + tone + '">' + (dot === false ? '' : '<span class="badge-dot"></span>') + esc(text) + '</span>'; }
  function fitBadge(fit) {
    const m = { strong: ['good', 'Strong fit'], possible: ['possible', 'Possible fit'], weak: ['skip', 'Weak fit'] }[fit] || ['skip', 'Weak fit'];
    return badge(m[0], m[1]);
  }
  function cite(n) { return ' <a class="cite" href="#src-' + n + '" data-cite="' + n + '" aria-label="Source ' + n + '">[' + n + ']</a>'; }
  function src(url) { return '<span class="src">' + icon('page', 14) + esc(url) + '</span>'; }
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
    page: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4.5 7l7.5 6 7.5-6"/>',
    reply: '<path d="M10 8L5 12.5 10 17"/><path d="M5.5 12.5H14a5 5 0 0 1 5 5v1"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    dot: '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>'
  };
  function icon(name, size) {
    return '<svg class="icon" viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICON[name] + '</svg>';
  }
  function rings(mode) {
    return '<svg class="rings rings-' + (mode || 'static') + '" width="22" height="16" viewBox="0 0 22 16" aria-hidden="true" focusable="false"><circle class="ring-a" cx="7.5" cy="8" r="5.6" fill="none" stroke-width="1.8"/><circle class="ring-b" cx="14.5" cy="8" r="5.6" fill="none" stroke-width="1.8"/></svg>';
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, fast ? 800 : 4200);
  }

  // ---------- the guided path: four parts of Orblo, seven steps ----------
  const STEPS = [
    { part: 'Onboarding', route: 'welcome', title: 'Tell Orb about your business', hint: 'Orb reads your site, marks the choices it found there, and asks four short questions. Then it builds your first good fits.', done: function () { return S.onboarded; } },
    { part: 'Discover', route: 'discover', title: 'Find companies worth writing to', hint: 'Press Look now. Each company shows up with dated, linked reasons and answers to your own questions. Keep Harbour Street Cafe.', done: function () { return S.decisions.harbour === 'keep'; } },
    { part: 'Enrichment', route: 'accounts/harbour', title: 'Find the right person', hint: 'Press Find the right person, then Get work email for Maria. Each step of the lookup shows what ran and what it cost.', done: function () { return S.email === 'found'; } },
    { part: 'Enrichment', route: 'leads/maria', title: 'Research and brief', hint: 'Enrich saves a few public pages. The brief is written only from them, and every line links back. What it could not find, it says.', done: function () { return ['briefed', 'drafting', 'drafted'].indexOf(S.lead) >= 0; } },
    { part: 'Outreach', route: 'leads/maria', title: 'Write it, check it, send it yourself', hint: 'Write the draft. Open From their side and Practice a reply. Try adding a meeting ask to see the checks catch it. Then copy it and mark it sent.', done: function () { return S.sent; } },
    { part: 'Customers (CRM)', route: 'today', title: 'The reply lands on the record', hint: 'Maria wrote back. Orblo reads her reply and suggests a next step. Confirm it, then start a deal.', done: function () { return S.dealStarted; } },
    { part: 'Customers (CRM)', route: 'pipeline', title: 'Close it', hint: 'Move Harbour Street Cafe to Won. A win teaches Discover which questions to ask first.', done: function () { return S.won; } }
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
    const tag = '<span class="ribbon-tag">Sample</span><ol class="ribbon-dots" aria-label="Sample steps">' + dots + '</ol>';
    if (i >= STEPS.length) {
      return '<div class="ribbon-in">' + tag + '<p class="ribbon-text"><b>That is the whole loop.</b> Onboard, find, enrich, write, send it yourself, and track it to won. Click around, or start over.</p>' +
        '<button class="btn sm" type="button" data-act="reset">Start over</button></div>';
    }
    const s = STEPS[i];
    const here = route === s.route;
    return '<div class="ribbon-in">' + tag +
      '<p class="ribbon-text"><span class="ribbon-part">' + esc(s.part) + '</span><b>Step ' + (i + 1) + ' of ' + STEPS.length + ': ' + esc(s.title) + '.</b> ' + esc(s.hint) + '</p>' +
      (here ? '' : '<a class="btn primary sm" href="#/' + s.route + '">Go to step ' + (i + 1) + '</a>') +
      (i > 0 ? '<button class="btn quiet sm" type="button" data-act="reset">Start over</button>' : '') + '</div>';
  }

  // ---------- shell ----------
  const NAV = [
    { r: 'today', label: 'Today', icon: 'today' },
    { r: 'discover', label: 'Discover', icon: 'discover' },
    { r: 'leads', label: 'Leads', icon: 'leads' },
    { r: 'pipeline', label: 'Pipeline', icon: 'pipeline' },
    { r: 'week', label: 'This week', icon: 'week' },
    { r: 'settings', label: 'Settings', icon: 'settings', desk: true }
  ];
  function nav(route) {
    const base = route.split('/')[0];
    const map = { accounts: 'discover' };
    const on = map[base] || base;
    return NAV.map(function (n) {
      const hit = on === n.r;
      return '<a class="tab' + (hit ? ' on' : '') + (n.desk ? ' tab-desk' : '') + '" href="#/' + n.r + '"' + (hit ? ' aria-current="page"' : '') + '>' + icon(n.icon) + '<span>' + n.label + '</span></a>';
    }).join('');
  }
  function status() {
    if (S.look === 'running') return '<span class="pill busy">' + rings('drift') + 'Looking</span>';
    if (S.people === 'searching' || S.email === 'looking') return '<span class="pill busy">' + rings('spin') + 'Looking up</span>';
    if (['enriching', 'briefing', 'drafting'].indexOf(S.lead) >= 0) return '<span class="pill busy">' + rings('spin') + 'Working</span>';
    return '<span class="pill"><span class="pill-dot"></span>Idle</span>';
  }
  function head(title, sub, extra) {
    return '<header class="page-head"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p class="sub">' + esc(sub) + '</p>' : '') + '</div>' + (extra || '') + '</header>';
  }
  function coach(text, guide) {
    return '<aside class="coach"><p><span class="coach-tag">Coach</span>' + esc(text) + '</p>' + (guide ? '<a href="#/guides/' + guide.slug + '">' + esc(guide.title) + '</a>' : '') + '</aside>';
  }
  function guide(slug) { return D.GUIDES.filter(function (g) { return g.slug === slug; })[0]; }

  // ---------- Today ----------
  function viewToday() {
    const greet = head('Good morning, ' + D.ME.first, longDate(today()));
    if (!S.onboarded) {
      return greet + '<section class="card hero-card"><h2 class="h2">Start here</h2><p class="muted">A few short questions, and Orblo finds your first companies, with the reasons attached.</p><div class="card-actions"><a class="btn primary" href="#/welcome">Get your first companies</a></div></section>';
    }
    let top = '';
    if (S.sent && !S.dealStarted) {
      const r = D.REPLY;
      top = '<section class="card hero-card reveal" aria-labelledby="reply-h"><div class="card-top"><h2 class="h2" id="reply-h">1 reply</h2>' + badge('good', 'Read: ' + r.read) + '</div>' +
        '<div class="reply"><p class="reply-from">' + icon('reply', 16) + '<span><b>' + esc(r.from) + '</b>, ' + esc(r.company) + '</span><span class="faint sm">A day after you sent it</span></p><blockquote>' + esc(r.body) + '</blockquote></div>' +
        '<p class="muted sm"><b>Orblo\'s read:</b> ' + esc(r.note) + '</p>' +
        '<div class="next-step"><p class="label">Next step</p><p class="next-text">' + esc(r.next) + ', by ' + niceDate(r.nextDue) + '</p>' +
        '<p class="faint sm">' + (S.nextConfirmed ? 'Confirmed by you. It is on Maria\'s record.' : 'Suggested from her reply. You can change it.') + '</p>' +
        (S.nextConfirmed ? '' : '<div class="row-actions"><button class="btn sm" type="button" data-act="confirm-next">Confirm next step</button><button class="btn quiet sm" type="button" data-act="change-next">Change it</button></div>') + '</div>' +
        '<div class="card-actions"><button class="btn primary" type="button" data-act="deal">Start a deal</button><a class="btn" href="#/accounts/harbour">Open the record</a></div></section>' +
        coach('A reply of any kind is good news: they read it. Answer what they asked before you ask anything of your own, and keep it as short as theirs.', guide('first-line'));
    } else if (S.dealStarted) {
      top = '<section class="card hero-card"><h2 class="h2">You are caught up</h2><p class="muted">Harbour Street Cafe is on your pipeline. The first week check is on the 26th.</p><div class="card-actions"><a class="btn primary" href="#/pipeline">Open pipeline</a></div></section>';
    }
    const kept = S.decisions.harbour === 'keep';
    const few = '<section class="card"><div class="card-top"><h2 class="h3">A few worth writing to today</h2><span class="faint sm">3, not 300</span></div><ul class="few">' + D.TODAY_FEW.map(function (f) {
      const href = f.id === 'harbour' && kept ? '#/accounts/harbour' : '#/discover';
      return '<li><a href="' + href + '"><span class="few-name">' + esc(f.name) + '</span><span class="few-why">' + esc(f.why) + ' <span class="faint">' + ago(f.when) + '</span></span></a>' + fitBadge(f.fit) + '</li>';
    }).join('') + '</ul><p class="faint sm">Each one has a dated reason from the last 60 days. Companies without one are left out, with why.</p></section>';
    const tasks = '<h2 class="section-title">Also today</h2><div class="cgrid">' + D.TASKS.map(function (x) {
      return '<section class="card task"><div class="card-top"><h3 class="h3">' + esc(x.t) + '</h3>' + badge('neutral', x.b, false) + '</div><p class="muted sm">' + esc(x.d) + '</p></section>';
    }).join('') + '</div>';
    return greet + top + few + tasks + '<p class="note"><a href="#/guides">Short guides for each step</a></p>';
  }

  // ---------- Discover ----------
  function signalLine(s, n) {
    return '<li><span class="kind">' + esc(s.kind) + '</span><span class="sig-text">' + esc(s.text) + (n ? ' <span class="cite">[' + n + ']</span>' : '') + '</span><span class="age">' + ago(s.date) + '</span></li>';
  }
  function candidateCard(c, i) {
    const d = S.decisions[c.id];
    const open = !!S.open[c.id];
    let actions;
    if (d === 'keep') {
      actions = '<div class="cand-actions">' + badge('good', 'Kept') +
        (c.id === 'harbour' ? '<a class="btn primary" href="#/accounts/harbour">Open Harbour Street Cafe</a>' : '<span class="note">Saved. Find the right person from its page.</span>') + '</div>';
    } else if (d === 'skip') {
      actions = '<div class="cand-actions">' + badge('skip', 'Skipped') + '<span class="note">Orblo will look for fewer like this.</span><button class="link" type="button" data-act="undo" data-id="' + c.id + '">Undo</button></div>';
    } else {
      actions = '<div class="cand-actions"><button class="btn ' + (c.id === 'harbour' ? 'primary' : '') + '" type="button" data-act="keep" data-id="' + c.id + '">Keep</button>' +
        '<button class="btn quiet" type="button" data-act="skip" data-id="' + c.id + '">Skip</button>' +
        '<button class="btn quiet more" type="button" data-act="more" data-id="' + c.id + '" aria-expanded="' + open + '">' + (open ? 'Show less' : 'Why now, and every source') + ' ' + icon('chevron', 16) + '</button></div>';
    }
    const qs = '<ul class="answers" aria-label="Your questions">' + D.QUESTIONS.map(function (q, n) {
      const yes = c.answers[n];
      return '<li class="' + (yes ? 'yes' : 'no') + '"><span class="answer-mark">' + (yes ? 'Yes' : 'Not seen') + '</span>' + esc(q.q) + '</li>';
    }).join('') + '</ul>';
    const more = open && d !== 'skip' ? '<div class="cand-more">' +
      '<div class="why-now"><p class="label">Why now</p><p>' + esc(c.whyNow) + '</p><p class="faint sm">Built only from the dated reasons below.</p></div>' +
      '<div><p class="label">Your questions</p>' + qs + '</div>' +
      '<div class="wide"><p class="label">Every reason, with its source</p><ol class="sig-full">' + c.signals.map(function (s, n) {
        return '<li><p><span class="kind">' + esc(s.kind) + '</span> ' + esc(s.text) + ' <span class="cite">[' + (n + 1) + ']</span></p><blockquote>"' + esc(s.quote) + '"</blockquote><p class="faint sm">' + src(s.src) + ' · ' + niceDate(s.date) + ', ' + ago(s.date) + '</p></li>';
      }).join('') + '</ol></div></div>' : '';
    return '<article class="card cand reveal" style="--i:' + i + '"><div class="cand-head"><span class="mono-mark fit-' + c.fit + '" aria-hidden="true">' + esc(c.name.charAt(0)) + '</span>' +
      '<div class="cand-title"><h3>' + esc(c.name) + '</h3><p class="muted sm">' + esc(c.summary) + ' <span class="faint">' + esc(c.place) + '</span></p></div>' + fitBadge(c.fit) + '</div>' +
      '<ul class="reasons">' + c.signals.map(function (s, n) { return signalLine(s, n + 1); }).join('') + '</ul>' + more + actions + '</article>';
  }
  function viewDiscover() {
    const byId = {};
    D.FOUND.forEach(function (f) { byId[f.id] = f; });
    const found = S.found.map(function (id) { return byId[id]; });
    const kept = found.filter(function (f) { return !f.left; });
    const left = found.filter(function (f) { return f.left; });
    const questions = '<section class="card ask"><div class="card-top"><h2 class="h3">Your questions</h2><span class="faint sm">Asked of every company</span></div>' +
      '<ol class="qlist">' + D.QUESTIONS.map(function (q) { return '<li><span>' + esc(q.q) + '</span><span class="faint sm">' + esc(q.from) + '</span></li>'; }).join('') + '</ol>' +
      '<p class="note">Who to look for: ' + (S.onboarded ? 'independent cafes, bakeries and restaurants near Vancouver, from your onboarding.' : 'the sample answers. <a href="#/welcome">Do the onboarding first</a> to see where they come from.') + '</p>' +
      (S.look === 'idle' ? '<div class="card-actions"><button class="btn primary" type="button" data-act="look">Look now</button><button class="btn quiet" type="button" data-act="add-q">Add a question</button><span class="note">Takes about a minute in the real app. Faster here.</span></div>' : '') + '</section>';
    let progress = '';
    if (S.look !== 'idle') {
      const steps = D.LOOK_STEPS.map(function (s, i) {
        const st = i < S.lookStep ? 'done' : (i === S.lookStep && S.look === 'running') ? 'now' : '';
        return '<li class="' + st + '">' + (st === 'done' ? icon('check', 16) : st === 'now' ? rings('spin') : '<span class="dot"></span>') + '<span>' + esc(s) + '</span></li>';
      }).join('');
      const so = found.map(function (f) {
        return '<li class="reveal">' + (f.left ? badge('skip', 'Left out') : fitBadge(f.fit)) + '<span class="fs-name">' + esc(f.name) + '</span>' + (f.left ? '<span class="faint sm">' + esc(f.left) + '</span>' : '') + '</li>';
      }).join('');
      progress = '<div class="split"><section class="card"><div class="card-top"><h2 class="h3">' + (S.look === 'running' ? 'Looking now' : 'Done looking') + '</h2>' + (S.look === 'running' ? rings('drift') : '') + '</div><ul class="read-list">' + steps + '</ul></section>' +
        '<section class="card" aria-live="polite"><div class="card-top"><h2 class="h3">Found so far</h2><span class="faint sm">' + found.length + ' checked</span></div>' + (so ? '<ul class="found-list">' + so + '</ul>' : '<p class="muted">Nothing yet. Each company shows up here as soon as it is found.</p>') + '</section></div>';
    }
    const results = kept.length ? '<h2 class="section-title">' + kept.length + ' worth your time today</h2><div class="cand-grid">' + kept.map(candidateCard).join('') + '</div>' +
      (S.look === 'done' ? '<p class="note">Left out ' + left.length + ', each with a reason above. Orblo shows only what it can cite. Good reasons to write, not a promise they will buy.</p>' : '') : '';
    return head('Discover', 'A few companies worth writing to, and the dated reason for each.') + questions + progress + results;
  }

  // ---------- Company page: enrichment and the record ----------
  function waterfall() {
    const rows = D.WATERFALL.slice(0, S.wf).map(function (w, i) {
      const res = w.results.map(function (r) {
        return '<li class="q-' + r.quality + '"><span class="wf-label">' + esc(r.label) + '</span><span class="wf-value">' + esc(r.value) + '</span><span class="wf-detail">' + esc(r.detail) + '</span></li>';
      }).join('');
      return '<li class="wf-step reveal ' + w.status + '" style="--i:' + i + '"><span class="wf-dot">' + (w.status === 'found' ? icon('check', 12) : '') + '</span>' +
        '<div class="wf-body"><p class="wf-head"><b>' + esc(w.step) + '</b><span class="wf-src">' + esc(w.source) + '</span>' + (w.credits ? '<span class="faint sm">' + w.credits + (w.credits === 1 ? ' credit' : ' credits') + '</span>' : '') + '</p>' +
        '<p class="muted sm">' + esc(w.note) + '</p>' + (res ? '<ul class="wf-results">' + res + '</ul>' : '') + '</div></li>';
    }).join('');
    const running = S.email === 'looking' && S.wf < D.WATERFALL.length;
    const pill = S.email === 'found' ? badge('good', 'Lookup finished') : running ? '<span class="pill busy">' + rings('spin') + 'Looking up</span>' : '';
    return '<div class="waterfall"><div class="card-top"><h3 class="h3">How Orblo found it</h3>' + pill + '</div><ol class="wf">' + rows +
      (running ? '<li class="wf-step now"><span class="wf-dot">' + rings('spin') + '</span><div class="wf-body"><p class="muted sm">' + esc(D.WATERFALL[S.wf].step) + '</p></div></li>' : '') + '</ol>' +
      (S.email === 'found' ? '<p class="faint sm">' + D.ENRICH_SUMMARY.credits + ' credits, as FullEnrich reported them. ' + D.ENRICH_SUMMARY.left + ' lookups left today. Work email only: no personal email, no personal phone.</p>' : '') + '</div>';
  }
  function peopleCard() {
    let body;
    if (S.people === 'none') {
      body = '<p class="muted">Orblo asks for the most senior people first, then ranks them by who you said buys from you. Owners decide at cafes this size.</p>' +
        '<div class="card-actions"><button class="btn primary" type="button" data-act="people">Find the right person</button><span class="note">Uses FullEnrich, a licensed data provider. About 0.25 credits a person.</span></div>';
    } else if (S.people === 'searching') {
      body = '<p class="busy-line">' + rings('spin') + 'Asking for the most senior people first</p>';
    } else {
      body = '<ol class="people">' + D.PEOPLE.map(function (p, i) {
        const main = p.id === 'maria';
        let act = '';
        if (main) {
          if (S.email === 'none') act = '<button class="btn primary sm" type="button" data-act="email">Get work email</button>';
          else if (S.email === 'looking') act = '<span class="pill busy">' + rings('spin') + 'Looking</span>';
          else act = '<span class="person-email">' + icon('mail', 16) + 'maria@harbourstreetcafe.example ' + badge('good', 'Deliverable') + '</span>';
        } else act = '<button class="btn sm" type="button" data-act="email-other">Get work email</button>';
        return '<li class="person' + (main ? ' main' : '') + '"><span class="rank">' + (i + 1) + '</span><div class="person-who"><b>' + esc(p.name) + '</b><span class="muted sm">' + esc(p.role) + '</span><span class="faint sm">' + esc(p.why) + '</span></div><div class="person-act">' + act + '</div></li>';
      }).join('') + '</ol>' + (S.email !== 'none' ? waterfall() : '') +
        (S.email === 'found' ? '<div class="card-actions">' + (S.lead === 'none' ? '<button class="btn primary" type="button" data-act="add-lead">Add Maria as a lead</button><span class="note">Next: research her and write the note.</span>' : '<a class="btn primary" href="#/leads/maria">Open Maria Lopez</a>') + '</div>' : '');
    }
    return '<section class="card" id="people"><div class="card-top"><h2 class="h3">Find the right person</h2>' + (S.people === 'found' ? '<span class="faint sm">Most senior first</span>' : '') + '</div>' + body + '</section>';
  }
  function recordRows() {
    const rows = [];
    rows.push({ k: 'Contact', v: S.email === 'found' ? 'Maria Lopez, owner' : 'Not found yet', from: S.email === 'found' ? 'From Find the right person, FullEnrich' : 'Find the right person fills this in' });
    rows.push({ k: 'You wrote', v: S.sent ? niceDate(D.SAMPLE_DAY) + ': Main Street opening' : 'Not yet', from: S.sent ? 'Sent by you from your own email' : 'Orblo moves this forward when you send' });
    rows.push({ k: 'Last heard', v: S.sent ? '"' + D.REPLY.body.split('. ')[1] + '."' : 'Nothing yet', from: S.sent ? 'From her reply, ' + niceDate(D.REPLY_DAY) : 'Silence is never counted as a reply' });
    rows.push({ k: 'Next step', v: S.sent ? D.REPLY.next : 'None yet', from: S.sent ? (S.nextConfirmed ? 'Confirmed by you' : 'Suggested from her reply. You can change it') : 'Read from replies when they come' });
    rows.push({ k: 'Deal', v: S.dealStarted ? money(D.NEW_DEAL.amount) + ' a year, ' + (S.won ? 'Won' : 'First talk') : 'No deal yet', from: S.dealStarted ? 'You set this' : 'Start one when they want to talk about buying' });
    return '<dl class="record">' + rows.map(function (r) { return '<div><dt>' + esc(r.k) + '</dt><dd><span class="rec-v">' + esc(r.v) + '</span><span class="rec-from">' + esc(r.from) + '</span></dd></div>'; }).join('') + '</dl>';
  }
  function timeline() {
    if (!S.sent) return '<p class="muted sm">No messages yet. Notes you send and replies you get land here on their own. No data entry.</p>';
    return '<ol class="timeline"><li class="me"><p class="tl-head">' + icon('mail', 16) + '<b>You</b><span class="faint sm">' + niceDate(D.SAMPLE_DAY) + ', from your own email</span></p><p class="tl-subj">Main Street opening</p><p class="sm muted">' + esc(S.drafts.email.body.split('\n\n')[1] || '') + '</p></li>' +
      '<li class="them"><p class="tl-head">' + icon('reply', 16) + '<b>Maria Lopez</b><span class="faint sm">' + niceDate(D.REPLY_DAY) + '</span></p><p class="sm">' + esc(D.REPLY.body) + '</p></li></ol>';
  }
  function viewAccount() {
    const c = D.FOUND[0];
    if (S.decisions.harbour !== 'keep') {
      return '<nav class="crumbs"><a href="#/discover">Discover</a><span>/</span><span>' + esc(c.name) + '</span></nav>' + head(c.name, c.place) +
        '<section class="card empty"><h2 class="h3">Not kept yet</h2><p class="muted">In this sample, Harbour Street Cafe comes from Discover. Keep it there and its page opens here.</p><div class="card-actions"><a class="btn primary" href="#/discover">Go to Discover</a></div></section>';
    }
    const statusText = S.won ? 'Customer' : S.dealStarted ? 'Deal open' : S.sent ? 'Talking' : 'New';
    const why = '<section class="card"><div class="card-top"><h2 class="h3">Reason to write</h2>' + fitBadge(c.fit) + '</div><p>' + esc(c.whyNow) + '</p><ul class="reasons">' + c.signals.map(function (s, n) { return signalLine(s, n + 1); }).join('') + '</ul></section>';
    const side = '<aside class="side-col"><section class="card"><div class="card-top"><h2 class="h3">The record</h2>' + badge(S.won ? 'good' : S.sent ? 'possible' : 'neutral', statusText, false) + '</div>' + recordRows() + '</section>' +
      '<section class="card"><h2 class="h3">What was sent and received</h2>' + timeline() + '</section>' +
      '<section class="card"><h2 class="h3">Deals</h2><p class="muted sm">' + (S.dealStarted ? 'On your pipeline: ' + money(D.NEW_DEAL.amount) + ' a year.' : 'When they want to talk about buying, start a deal. It goes on your pipeline.') + '</p>' + (S.dealStarted ? '<a class="btn sm" href="#/pipeline">Open pipeline</a>' : S.sent ? '<button class="btn sm" type="button" data-act="deal">Start a deal</button>' : '') + '</section></aside>';
    return '<nav class="crumbs"><a href="#/discover">Discover</a><span>/</span><span>' + esc(c.name) + '</span></nav>' +
      head(c.name, 'Two sites soon. ' + c.place + '. harbourstreetcafe.example') +
      '<div class="two-col"><div class="main-col">' + why + peopleCard() + '</div>' + side + '</div>';
  }

  // ---------- Lead page: research, brief, outreach ----------
  function sourceList() {
    return '<ol class="source-list">' + D.SOURCES.slice(0, Math.max(S.enriched, 0)).map(function (s) {
      return '<li id="src-' + s.n + '" class="reveal"><span class="src-n">' + s.n + '</span><div><p class="src-title">' + esc(s.title) + '</p><p class="faint sm">' + src(s.url) + ' · ' + niceDate(s.date) + ', ' + ago(s.date) + '</p><p class="sm">' + esc(s.excerpt) + '</p></div></li>';
    }).join('') + '</ol>';
  }
  function researchLog() {
    return '<ul class="read-list log" role="log" aria-live="polite">' + D.RESEARCH_LOG.slice(0, S.logStep).map(function (l, i) {
      const done = i < S.logStep - 1 || S.lead !== 'enriching';
      return '<li class="' + (done ? 'done' : 'now') + '">' + (done ? icon('check', 16) : rings('spin')) + '<span>' + esc(l) + '</span></li>';
    }).join('') + '</ul>';
  }
  const ORDER = ['none', 'added', 'enriching', 'enriched', 'briefing', 'briefed', 'drafting', 'drafted'];
  function stepState(name) {
    const at = ORDER.indexOf(S.lead);
    if (name === 'add') return at >= 1 ? 'done' : 'todo';
    if (name === 'enrich') return at >= 3 ? 'done' : at === 2 ? 'now' : 'todo';
    if (name === 'brief') return at >= 5 ? 'done' : at === 4 ? 'now' : 'todo';
    return at >= 7 ? 'done' : at === 6 ? 'now' : 'todo';
  }

  // The draft checks. Phrases and an I heavy note are advice. A meeting ask, a dash or a placeholder must be fixed
  // before Copy draft works, as in the real app.
  function phraseHits(text) {
    const hits = [];
    PHRASES.forEach(function (p) { const m = p.rx.exec(text); if (m) hits.push({ found: m[0], alt: p.alt, cat: p.cat }); });
    return hits;
  }
  function words(t) { return (t.trim().match(/\S+/g) || []).length; }
  function lint(d, kind) {
    const text = (d.subject ? d.subject + '\n' : '') + d.body;
    const flags = [];
    phraseHits(text).forEach(function (h) { flags.push({ kind: 'phrase', hard: false, text: '"' + h.found + '" is a worn phrase. Try: ' + h.alt + '.' }); });
    if (/[\u2013\u2014]/.test(text)) flags.push({ kind: 'dash', hard: true, text: 'Take out the long dash. Use a full stop or a comma.' });
    if (/\[[^\]]*\]|\{\{/.test(text)) flags.push({ kind: 'placeholder', hard: true, text: 'Fill in the blank in brackets, or take it out.' });
    if (/\b(call|meeting|zoom|demo|calendar|hop on|jump on|catch up|sync)\b/i.test(d.body)) flags.push({ kind: 'meeting', hard: true, text: 'A first note asks one small question, not for a meeting. Leave the call for later.' });
    const n = words(d.body);
    if ((kind === 'email' && n > 120) || (kind === 'dm' && n > 60)) flags.push({ kind: 'length', hard: false, text: n + ' words. Cut it until it fits on one phone screen.' });
    if (d.subject && words(d.subject) > 6) flags.push({ kind: 'subject', hard: false, text: 'Keep the subject to a few words.' });
    const me = (d.body.match(/\b(I|I'm|I've|we|our|my|us)\b/g) || []).length;
    if (me > 8) flags.push({ kind: 'iwe', hard: false, text: 'Most of it is about you. Say more about what you noticed.' });
    const cited = d.body.toLowerCase().indexOf(d.fact.toLowerCase()) >= 0;
    if (!cited) flags.push({ kind: 'template', hard: false, text: 'The fact about them is gone. Put back one thing only true of them.' });
    return { flags: flags, cited: cited };
  }
  const BUYER = [
    { id: 'specific', q: 'Does it mention something only true of them?', kinds: ['template', 'placeholder'], good: 'It quotes a fact from their own pages or news.', fix: 'Add one thing from their own site or news that would not fit anyone else.' },
    { id: 'reason', q: 'Is there a reason to write now?', kinds: ['template'], good: 'It opens with what happened on their side.', fix: 'Open with what changed for them lately, with its date.' },
    { id: 'ask', q: 'Is the ask small and easy to answer?', kinds: ['meeting'], good: 'It asks one small question and no meeting.', fix: 'Ask one question they can answer in a line. Leave the meeting for later.' },
    { id: 'about_them', q: 'Is it about them, not about you?', kinds: ['iwe'], good: 'Most of it is about their business.', fix: 'Say less about what you do and more about what you noticed.' },
    { id: 'short', q: 'Is it short enough to read on a phone?', kinds: ['length', 'subject'], good: 'It fits on one phone screen.', fix: 'Cut it down until it fits on one phone screen.' },
    { id: 'plain', q: 'Does it sound like a person wrote it?', kinds: ['phrase', 'dash'], good: 'No worn out sales phrases.', fix: 'Swap the worn out phrase for how you would say it out loud.' }
  ];
  function checksHtml() {
    const d = S.drafts[S.tab];
    const r = lint(d, S.tab);
    const hard = r.flags.filter(function (f) { return f.hard; });
    const soft = r.flags.filter(function (f) { return !f.hard; });
    const answers = BUYER.map(function (b) { return { b: b, pass: !r.flags.some(function (f) { return b.kinds.indexOf(f.kind) >= 0; }) }; });
    const misses = answers.filter(function (a) { return !a.pass; }).length;
    const flagList = r.flags.length ? '<ul class="flags">' + hard.concat(soft).map(function (f) { return '<li class="' + (f.hard ? 'hard' : 'soft') + '"><span class="flag-tag">' + (f.hard ? 'Fix first' : 'Advice') + '</span>' + esc(f.text) + '</li>'; }).join('') + '</ul>' : '<p class="check ok">' + icon('check', 16) + 'Checks passed.</p>';
    const buyer = '<details class="buyer-check"' + (misses ? ' open' : '') + '><summary>From their side: ' + (misses ? misses + ' ' + (misses === 1 ? 'thing' : 'things') + ' to look at' : 'reads well') + '</summary><ul>' + answers.map(function (a) {
      return '<li class="' + (a.pass ? 'is-pass' : 'is-miss') + '"><span class="buyer-mark">' + (a.pass ? 'Yes' : 'Not yet') + '</span><span><b>' + esc(a.b.q) + '</b> ' + esc(a.pass ? a.b.good : a.b.fix) + '</span></li>';
    }).join('') + '</ul></details>';
    return { html: flagList + buyer, blocked: hard.length > 0, cited: r.cited };
  }
  function practiceHtml() {
    const P = S.practice;
    const mood = D.PRACTICE.filter(function (m) { return m.id === P.mood; })[0];
    const moods = '<div class="chips" role="group" aria-label="What should they say?">' + D.PRACTICE.map(function (m) {
      return '<button type="button" class="chip-btn" data-act="mood" data-mood="' + m.id + '" aria-pressed="' + (m.id === P.mood) + '">' + esc(m.label) + '</button>';
    }).join('') + '</div>';
    let body = '';
    if (mood) {
      body = '<div class="practice-reply"><p class="label">Maria, in practice</p><blockquote>' + esc(mood.reply) + '</blockquote></div>' +
        '<label class="field"><span class="label">Your second note</span><textarea id="practice-answer" rows="4">' + esc(P.answer) + '</textarea></label>' +
        '<div class="row-actions"><button class="btn sm" type="button" data-act="practice-check">Look at my answer</button></div>' +
        (P.noticed ? '<div class="noticed"><p class="label">What Orblo noticed</p><ul>' + P.noticed.map(function (n) { return '<li class="' + (n.ok ? 'is-pass' : 'is-miss') + '"><span class="buyer-mark">' + (n.ok ? 'Good' : 'Try') + '</span>' + esc(n.text) + '</li>'; }).join('') + '</ul></div>' : '');
    }
    return '<details class="practice" id="practice"' + (P.mood ? ' open' : '') + '><summary>Practice a reply</summary><p class="faint sm">Practice only. Orblo plays the person you are writing to. Nothing here is saved, and nothing is sent to anyone.</p><p class="label">What should they say?</p>' + moods + body + '</details>';
  }
  function lookAtAnswer() {
    const P = S.practice;
    const mood = D.PRACTICE.filter(function (m) { return m.id === P.mood; })[0];
    const a = P.answer.trim();
    const out = [];
    if (!a) return [{ ok: false, text: 'Write a short answer first. A line or two is plenty.' }];
    const theirs = words(mood.reply);
    const mine = words(a);
    const answered = {
      interested: /\b(mon|tue|wed|thu|fri|sat|sun|week|\d{1,2}(st|nd|rd|th)?|check|visit|come by)\b/i,
      question: /\b(small|size|team|one machine|two|how it works|we would|it takes|hour)\b/i,
      price: /(\$\s?\d|\bfree\b|\bcost|\bprice|\bdollars?\b)/i,
      not_now: /\b(thanks|understood|of course|no problem|good luck)\b/i
    }[mood.id];
    out.push(answered.test(a) ? { ok: true, text: 'You answered what they asked before asking anything of your own.' } : { ok: false, text: mood.id === 'price' ? 'They asked about price. Give a number or a range first.' : mood.id === 'not_now' ? 'Thank them and leave the door open. No new ask.' : 'Answer their question first, in their words.' });
    out.push(mine <= theirs * 2 + 15 ? { ok: true, text: 'About as short as theirs.' } : { ok: false, text: 'Theirs was ' + theirs + ' words and yours is ' + mine + '. Cut it closer to theirs.' });
    const q = (a.match(/\?/g) || []).length;
    out.push(mood.id === 'not_now' ? (q === 0 ? { ok: true, text: 'No new question. Good for a not now.' } : { ok: false, text: 'They said not now. Leave the question out this time.' }) : (q <= 1 ? { ok: true, text: 'At most one question.' } : { ok: false, text: 'Ask one question, not ' + q + '.' }));
    const hits = phraseHits(a);
    out.push(hits.length ? { ok: false, text: '"' + hits[0].found + '" is a worn phrase. Try: ' + hits[0].alt + '.' } : { ok: true, text: 'Sounds like a person.' });
    return out;
  }
  function draftPanel() {
    const d = S.drafts[S.tab];
    const tabs = Object.keys(S.drafts).map(function (k) {
      return '<button type="button" class="seg' + (k === S.tab ? ' on' : '') + '" data-act="tab" data-tab="' + k + '" aria-pressed="' + (k === S.tab) + '">' + esc(S.drafts[k].label) + '</button>';
    }).join('');
    const c = checksHtml();
    let actions;
    if (S.sent) actions = badge('good', 'Sent by you') + '<a class="btn primary" href="#/today">Go to Today</a>';
    else if (S.copied) actions = '<button class="btn" type="button" data-act="copy">' + icon('copy', 16) + 'Copy again</button><button class="btn primary" type="button" data-act="sent">I sent it</button>';
    else actions = '<button class="btn" type="button" data-act="redraft">Write again</button><button class="btn" type="button" data-act="try-line">Try a meeting ask</button><button class="btn primary" type="button" data-act="copy" id="copy-btn"' + (c.blocked ? ' disabled aria-describedby="blocked-why"' : '') + '>' + icon('copy', 16) + 'Copy draft</button>';
    return '<div class="draft">' + coach('The note opens with what happened on their side, says why it matters to them, and ends with one small question. It is short so it gets read. You send it yourself, from your own email.', guide('first-line')) +
      '<div class="draft-card"><div class="draft-top"><h3 class="h3">Copy it, then send it yourself</h3><div class="segs" role="group" aria-label="Channel">' + tabs + '</div></div>' +
      '<p class="faint sm draft-meta"><span>Version 1, written from the brief</span><span id="wc">' + words(d.body) + ' words</span></p>' +
      (S.tab === 'email' ? '<label class="subject"><span class="label">Subject</span><input id="subj" value="' + esc(d.subject) + '" autocomplete="off"></label>' : '') +
      '<label class="sr" for="body">Draft</label><textarea id="body" rows="' + (S.tab === 'email' ? 13 : 5) + '">' + esc(d.body) + '</textarea>' +
      '<p class="sm opens" id="opens">' + (c.cited ? 'Opens with a cited fact' + cite(1) + ': "' + esc(D.SOURCES[0].excerpt.split('. ')[0]) + '."' : 'No cited fact left in this version.') + '</p>' +
      '<div id="checks">' + c.html + '</div>' + practiceHtml() +
      '<p class="sm blocked-why" id="blocked-why"' + (c.blocked && !S.copied && !S.sent ? '' : ' hidden') + '>Copy draft waits until the checks marked Fix first are fixed.</p>' +
      '<div class="card-actions draft-actions">' + actions + '</div>' +
      '<p class="note">You are the sender. Orblo never sends on its own, never in bulk, and never on a schedule. In the real app you can also send from your own Gmail or Outlook, after you check who it goes to and press Send.</p></div></div>';
  }
  function step(name, label, summary, body, opened) {
    const st = stepState(name);
    const mark = st === 'done' ? '<span class="step-mark done">' + icon('check', 14) + '</span>' : st === 'now' ? '<span class="step-mark now">' + rings('spin') + '</span>' : '<span class="step-mark"></span>';
    const toggle = st === 'done' && body ? '<button class="link" type="button" data-act="toggle" data-step="' + name + '" aria-expanded="' + !!opened + '">' + (opened ? 'Hide' : 'Open') + '</button>' : '';
    return '<section class="card step ' + st + '"><div class="step-head">' + mark + '<div class="step-title"><h2 class="h3">' + label + '</h2><p class="faint sm">' + summary + '</p></div>' + toggle + '</div>' + (opened && body ? '<div class="step-body">' + body + '</div>' : '') + '</section>';
  }
  function briefBody() {
    const b = D.BRIEF;
    const list = function (items) { return '<ul class="bl">' + items.map(function (x) { return '<li>' + esc(x.text) + (x.cite ? cite(x.cite) : '') + (x.kind ? ' ' + badge('neutral', x.kind, false) : '') + '</li>'; }).join('') + '</ul>'; };
    return '<div class="brief"><div class="brief-fit">' + fitBadge(b.fit.rating) + '<span class="muted sm">Three kinds of dated reason, all from public pages.</span></div>' +
      '<div class="bgrid"><div><h4>Why it fits</h4>' + list(b.fit.reasons) + '</div><div><h4>Why now</h4>' + list(b.whyNow) + '</div>' +
      '<div><h4>Who they are</h4>' + list(b.who) + '</div><div><h4>What might stop them</h4>' + list(b.objections) + '</div></div>' +
      '<div class="gaps"><h4>Still missing</h4><ul>' + b.gaps.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul><p class="faint sm">Orblo does not guess these. They make good questions if she writes back.</p></div>' +
      '<div class="approach"><h4>Approach</h4><p><b>' + esc(b.approach.channel) + '</b>, ' + esc(b.approach.timing.toLowerCase()) + '. ' + esc(b.approach.note) + '</p></div>' +
      '<h4>Sources</h4>' + sourceList() + '</div>';
  }
  function viewLead() {
    if (S.lead === 'none') {
      return '<nav class="crumbs"><a href="#/leads">Leads</a><span>/</span><span>Maria Lopez</span></nav>' + head('Maria Lopez', 'Owner at Harbour Street Cafe') +
        '<section class="card empty"><h2 class="h3">Not added yet</h2><p class="muted">In this sample, Maria comes from Find the right person on Harbour Street Cafe\'s page.</p><div class="card-actions"><a class="btn primary" href="#/accounts/harbour">Go to Harbour Street Cafe</a></div></section>';
    }
    const at = stepState;
    const bar = '<ol class="stepper">' + [['add', 'Add'], ['enrich', 'Enrich'], ['brief', 'Brief'], ['draft', 'Draft']].map(function (p) {
      return '<li class="' + at(p[0]) + '"><span class="sm-mark">' + (at(p[0]) === 'done' ? icon('check', 12) : '') + '</span>' + p[1] + '</li>';
    }).join('') + '</ol>';
    let primary = '';
    if (S.lead === 'added') primary = '<button class="btn primary" type="button" data-act="enrich">Enrich</button><span class="note">Reads a few public pages about Maria and Harbour Street. Never a page behind a sign in.</span>';
    if (S.lead === 'enriched') primary = '<button class="btn primary" type="button" data-act="brief">Write the brief</button><span class="note">' + D.SOURCES.length + ' public pages saved. The brief uses only these.</span>';
    if (S.lead === 'briefed') primary = '<button class="btn primary" type="button" data-act="draft">Write the draft</button><span class="note">An email and a DM, from the brief.</span>';
    const enrichSum = S.enriched ? S.enriched + ' public ' + (S.enriched === 1 ? 'page' : 'pages') + ' saved, each with its date' : 'Reads public pages: their site, the city record, job posts, news';
    const briefSum = at('brief') === 'done' ? 'Version 1. Strong fit, every line cited or marked inferred' : at('brief') === 'now' ? 'Writing, only from the saved pages' : 'Fit, why now, who they are, what might stop them, what is missing';
    const draftSum = at('draft') === 'done' ? (S.sent ? 'Sent by you' : S.copied ? 'Copied. Send it from your own email' : 'An email and a DM, checked from her side') : at('draft') === 'now' ? 'Writing from the brief' : 'An email and a DM';
    const main = bar + (primary ? '<div class="card primary-row">' + primary + '</div>' : '') +
      step('enrich', 'Enrich', enrichSum, (S.logStep ? researchLog() : '') + (S.enriched ? sourceList() : ''), at('enrich') === 'now' || S.openSteps.enrich) +
      step('brief', 'Brief', briefSum, at('brief') === 'done' ? briefBody() : at('brief') === 'now' ? '<p class="busy-line">' + rings('spin') + 'Writing only from the 5 saved pages</p>' : '', at('brief') === 'now' || S.openSteps.brief) +
      step('draft', 'Draft', draftSum, at('draft') === 'done' ? draftPanel() : at('draft') === 'now' ? '<p class="busy-line">' + rings('spin') + 'Writing an email and a DM from the brief</p>' : '', at('draft') === 'now' || S.openSteps.draft);
    const side = '<aside class="side-col"><section class="card"><div class="card-top"><h2 class="h3">Maria Lopez</h2>' + badge(S.sent ? 'good' : 'possible', S.sent ? 'Replied' : S.copied ? 'Copied' : 'New', false) + '</div>' +
      '<dl class="facts"><dt>Role</dt><dd>Owner<span class="rec-from">From FullEnrich, most senior first</span></dd><dt>Work email</dt><dd>maria@harbourstreetcafe.example ' + badge('good', 'Deliverable', false) + '<span class="rec-from">From FullEnrich</span></dd>' +
      '<dt>Company phone</dt><dd>604 555 0143<span class="rec-from">From their contact page</span></dd><dt>Company</dt><dd><a href="#/accounts/harbour">Harbour Street Cafe</a></dd><dt>How they came in</dt><dd>Kept from Discover</dd></dl></section>' +
      '<section class="card"><h2 class="h3">Ask Orb</h2><p class="muted sm">Questions about this lead, answered from what Orblo saved.</p><button class="btn sm" type="button" data-act="orb">Ask Orb</button></section></aside>';
    return '<nav class="crumbs"><a href="#/leads">Leads</a><span>/</span><span>Maria Lopez</span></nav>' + head('Maria Lopez', 'Owner at Harbour Street Cafe') +
      '<div class="two-col"><div class="main-col">' + main + '</div>' + side + '</div>';
  }

  function viewLeads() {
    const rows = [];
    if (S.lead !== 'none') rows.push({ name: 'Maria Lopez', role: 'Owner', company: 'Harbour Street Cafe', status: S.dealStarted ? 'Deal open' : S.sent ? 'Replied' : S.lead === 'drafted' ? 'Draft ready' : S.lead === 'briefed' ? 'Brief ready' : 'New', fit: 'strong', when: D.SAMPLE_DAY, link: true });
    D.LEADS.forEach(function (l) { rows.push(l); });
    return head('Leads', 'Everyone you are working, newest first.') +
      '<section class="card table-card"><table class="table"><thead><tr><th scope="col">Person</th><th scope="col">Company</th><th scope="col">Fit</th><th scope="col">Status</th><th scope="col">Added</th></tr></thead><tbody>' + rows.map(function (r) {
        const name = r.link ? '<a href="#/leads/maria">' + esc(r.name) + '</a>' : esc(r.name);
        return '<tr><td><b>' + name + '</b><span class="faint sm block">' + esc(r.role) + '</span></td><td>' + esc(r.company) + '</td><td>' + fitBadge(r.fit) + '</td><td>' + esc(r.status) + '</td><td class="faint">' + ago(r.when) + '</td></tr>';
      }).join('') + '</tbody></table></section>' +
      (S.lead === 'none' ? '<p class="note">Maria Lopez joins this list from <a href="#/accounts/harbour">Harbour Street Cafe</a>, once Orblo finds her.</p>' : '') +
      '<p class="note">Your list is yours. Export it as a file any time, or connect HubSpot.</p>';
  }

  function viewPipeline() {
    const open = S.deals.filter(function (d) { return D.STAGES.filter(function (s) { return s.id === d.stage; })[0].kind === 'open'; });
    const total = open.reduce(function (a, d) { return a + d.amount; }, 0);
    const cols = D.STAGES.map(function (st) {
      const ds = S.deals.filter(function (d) { return d.stage === st.id; });
      const sum = ds.reduce(function (a, d) { return a + d.amount; }, 0);
      return '<section class="col col-' + st.kind + '" aria-label="' + esc(st.name) + '"><div class="col-head"><h2 class="h3">' + esc(st.name) + '</h2><span class="faint sm">' + ds.length + (sum ? ' · ' + money(sum) : '') + '</span></div>' + ds.map(function (d) {
        const opts = D.STAGES.map(function (o) { return '<option value="' + o.id + '"' + (o.id === d.stage ? ' selected' : '') + '>' + esc(o.name) + '</option>'; }).join('');
        return '<article class="deal' + (d.id === 'd-harbour' ? ' hl' : '') + '"><h3>' + esc(d.name) + '</h3><p class="muted sm">' + esc(d.contact) + '</p>' +
          '<p class="deal-meta"><b>' + money(d.amount) + '</b><span class="faint">a year</span><span class="faint">· ' + (d.days === 0 ? 'today' : d.days + 'd here') + '</span></p>' +
          (d.next ? '<p class="next sm">Next: ' + esc(d.next) + '</p>' : '') + (d.lost ? '<p class="faint sm">Lost: ' + esc(d.lost) + '</p>' : '') +
          '<label class="move"><span class="sr">Move ' + esc(d.name) + ' to</span><select data-act="move" data-id="' + d.id + '">' + opts + '</select></label></article>';
      }).join('') + (ds.length ? '' : '<p class="faint sm col-empty">Nothing here</p>') + '</section>';
    }).join('');
    const learn = S.won ? '<section class="card learn reveal">' + rings('meet') + '<div><h2 class="h3">Won. Discover learned from it.</h2><p class="muted">' + esc(D.WIN_LEARN) + '</p><a class="link-a" href="#/week">See which questions win</a></div></section>' : '';
    return head('Pipeline', 'Every deal you are working, from first talk to won.') + learn +
      '<p class="note">Open: <b>' + money(total) + '</b> a year across ' + open.length + ' deals. Cards move with a Move to menu, so it works with a keyboard and on a phone.</p><div class="board">' + cols + '</div>';
  }

  function viewWeek() {
    const w = D.WEEK;
    const max = Math.max.apply(null, w.questions.map(function (q) { return q.sent; }));
    const bars = w.questions.slice().sort(function (a, b) { return b.replies / b.sent - a.replies / a.sent; }).map(function (q, i) {
      return '<li><span class="bar-label">' + esc(q.q) + '</span><span class="bar-track" aria-hidden="true"><span class="bar sent" style="width:' + (q.sent / max * 100) + '%"></span><span class="bar got' + (i === 0 ? ' top' : '') + '" style="width:' + (q.replies / max * 100) + '%"></span></span><span class="bar-num">' + q.replies + ' of ' + q.sent + '</span></li>';
    }).join('');
    return head('This week', 'What you did, what came back, and what worked.') +
      '<div class="week-top"><section class="card lead-num"><p class="label">' + esc(w.lead.k) + '</p><p class="big">' + w.lead.v + '</p><p class="muted sm">' + esc(w.lead.change) + '</p></section>' +
      w.tiles.map(function (t) { return '<section class="card tile"><p class="label">' + esc(t.k) + '</p><p class="tile-v">' + esc(t.v) + '</p><p class="faint sm">' + esc(t.d) + '</p></section>'; }).join('') + '</div>' +
      '<section class="card"><div class="card-top"><h2 class="h3">Which of your questions win</h2><span class="faint sm">Replies from notes sent, this month</span></div><ul class="bars">' + bars + '</ul>' +
      '<p class="legend-row"><span class="key sent"></span>Notes sent<span class="key got"></span>Replies</p>' +
      '<p class="note">Small numbers. Orblo says so until a question has at least 5 notes behind it, and never counts silence as a reply.</p></section>';
  }

  function viewGuides(slug) {
    if (slug) {
      const g = guide(slug);
      if (!g) return viewGuides();
      return '<nav class="crumbs"><a href="#/guides">Guides</a><span>/</span><span>' + esc(g.title) + '</span></nav>' + head(g.title, g.lede) +
        '<section class="card read"><ol class="guide-steps">' + g.steps.map(function (s) { return '<li><h2 class="h3">' + esc(s[0]) + '</h2><p>' + esc(s[1]) + '</p></li>'; }).join('') + '</ol><p class="keep"><b>Keep in mind:</b> ' + esc(g.keep) + '</p></section>';
    }
    return head('Guides', 'Five short guides for people who have never sold. About a minute each.') +
      '<div class="cgrid">' + D.GUIDES.map(function (g) { return '<a class="card guide-card" href="#/guides/' + g.slug + '"><h2 class="h3">' + esc(g.title) + '</h2><p class="muted sm">' + esc(g.lede) + '</p></a>'; }).join('') +
      '<section class="card guide-card dim"><h2 class="h3">Handling "not now" and "how much?"</h2><p class="muted sm">In the real app.</p></section><section class="card guide-card dim"><h2 class="h3">When to let it go</h2><p class="muted sm">In the real app.</p></section></div>';
  }

  function viewSettings() {
    const rows = S.onboarded ? D.ONBOARD.learned.map(function (r) {
      return '<div class="lf-row"><p class="label">' + esc(r.k) + '</p><p class="lf-v">' + esc(r.v) + '</p><p class="lf-why">' + esc(r.from) + '</p></div>';
    }).join('') : '<p class="muted">Nothing yet. <a href="#/welcome">Do the onboarding</a> to fill this in.</p>';
    return '<nav class="subnav" aria-label="Settings"><a class="on" href="#/settings" aria-current="page">About you</a><span>Your materials</span><span>Email</span><span>Stages</span><span>Team</span><span>Billing</span><span>Security</span></nav>' +
      head('About you', 'What Orb learned during onboarding. Every line says where it came from, and you can change any of them.') +
      '<section class="card">' + rows + '</section>' +
      '<p class="note">Only what you told Orblo, or what your own site says. Nothing is filled in for you.</p>';
  }

  // ---------- Ask Orb ----------
  function orbHtml() {
    const asked = S.orbAsked.map(function (i) {
      const o = D.ORB[i];
      return '<div class="orb-q"><p class="you">' + esc(o.q) + '</p><div class="orb-a"><p>' + esc(o.a) + '</p>' + (o.cites.length ? '<ul class="orb-cites">' + o.cites.map(function (c) { return '<li>' + src(c) + '</li>'; }).join('') + '</ul>' : '<p class="faint sm">Nothing to cite: this is what is missing.</p>') + '</div></div>';
    }).join('');
    const left = D.ORB.map(function (o, i) { return S.orbAsked.indexOf(i) >= 0 ? '' : '<button type="button" class="chip-btn" data-act="orb-ask" data-i="' + i + '">' + esc(o.q) + '</button>'; }).join('');
    return '<div class="drawer-in"><div class="drawer-head"><h2 class="h3" id="orb-title">' + rings('static') + 'Ask Orb</h2><button type="button" class="icon-btn" data-act="orb-close" aria-label="Close Ask Orb">' + icon('close', 18) + '</button></div>' +
      '<div class="drawer-body">' + (asked || '<p class="muted sm">Orb answers from what Orblo saved, and says when something is missing. It never sends anything.</p>') + '</div>' +
      '<div class="drawer-foot">' + (left ? '<p class="label">Try asking</p><div class="chips">' + left + '</div>' : '<p class="faint sm">That is every sample question. The real Orb takes any question.</p>') + '</div></div>';
  }
  function openOrb() { const el = $('#orb'); el.innerHTML = orbHtml(); el.hidden = false; requestAnimationFrame(function () { el.classList.add('open'); const b = el.querySelector('[data-act="orb-ask"]') || el.querySelector('[data-act="orb-close"]'); if (b) b.focus(); }); }
  function closeOrb() { const el = $('#orb'); el.classList.remove('open'); setTimeout(function () { el.hidden = true; }, fast ? 0 : 200); }

  // ---------- render ----------
  const VIEWS = { today: viewToday, discover: viewDiscover, leads: viewLeads, 'leads/maria': viewLead, 'accounts/harbour': viewAccount, pipeline: viewPipeline, week: viewWeek, guides: function () { return viewGuides(); }, settings: viewSettings };
  function route() {
    const r = (location.hash || '').replace(/^#\/?/, '') || (S.onboarded ? 'today' : 'welcome');
    if (r === 'welcome') return r;
    if (/^guides\/[a-z-]+$/.test(r)) return r;
    return VIEWS[r] ? r : 'today';
  }
  let lastRoute = '';
  function render() {
    const r = route();
    const changed = r !== lastRoute;
    lastRoute = r;
    const stage = $('#stage'); const app = $('#app');
    if (r === 'welcome') {
      if (stage.hidden) { stage.hidden = false; app.hidden = true; document.body.classList.add('on-stage'); window.OrbitStage.open(); }
      document.title = 'Welcome to Orblo · Orblo sample';
      return;
    }
    if (!stage.hidden) { stage.hidden = true; app.hidden = false; document.body.classList.remove('on-stage'); window.OrbitStage.close(); }
    const active = document.activeElement;
    const keep = active && (active.id === 'body' || active.id === 'subj' || active.id === 'practice-answer') ? { id: active.id, s: active.selectionStart, e: active.selectionEnd } : null;
    $('#nav').innerHTML = nav(r);
    $('#status').innerHTML = status();
    $('#ribbon').innerHTML = ribbon(r);
    const html = r.indexOf('guides/') === 0 ? viewGuides(r.split('/')[1]) : VIEWS[r]();
    $('#view').innerHTML = html;
    document.title = ($('#view h1') ? $('#view h1').textContent + ' · ' : '') + 'Orblo sample';
    if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch (e) { /* ignore */ } } }
    if (changed) { window.scrollTo(0, 0); if (!keep) $('#view').focus({ preventScroll: true }); }
    paintTheme();
  }

  // ---------- actions ----------
  async function runLook() {
    if (S.look !== 'idle') return;
    S.look = 'running'; S.lookStep = 0; S.found = []; render();
    const order = D.FOUND.map(function (f) { return f.id; });
    for (let i = 0; i < D.LOOK_STEPS.length; i++) {
      await wait(900);
      S.lookStep = i + 1;
      if (i >= 1 && order.length) S.found.push(order.shift());
      if (i >= 3 && order.length) S.found.push(order.shift());
      render();
    }
    while (order.length) S.found.push(order.shift());
    S.look = 'done'; render();
    toast('Done looking. 3 worth your time, 3 left out with a reason.');
  }
  async function findPeople() {
    S.people = 'searching'; render();
    await wait(1600);
    S.people = 'found'; render();
  }
  async function findEmail() {
    S.email = 'looking'; S.wf = 0; render();
    for (let i = 0; i < D.WATERFALL.length; i++) { await wait(1000); S.wf = i + 1; render(); }
    S.email = 'found'; render();
    toast('Work email found: deliverable. 1.75 credits.');
  }
  async function enrich() {
    S.lead = 'enriching'; S.openSteps.enrich = true; S.logStep = 0; S.enriched = 0; render();
    for (let i = 0; i < D.RESEARCH_LOG.length; i++) { await wait(700); S.logStep = i + 1; if (i === D.RESEARCH_LOG.length - 1) S.enriched = D.SOURCES.length; render(); }
    S.lead = 'enriched'; render();
  }
  async function brief() { S.lead = 'briefing'; S.openSteps.enrich = false; render(); await wait(1800); S.lead = 'briefed'; render(); }
  async function draft() { S.lead = 'drafting'; S.openSteps.brief = false; render(); await wait(1600); S.lead = 'drafted'; render(); }
  function copyDraft() {
    const d = S.drafts[S.tab];
    const text = (d.subject ? 'Subject: ' + d.subject + '\n\n' : '') + d.body;
    const done = function () { S.copied = true; render(); toast('Copied. Paste it into your own email and send it from there.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
  }
  function moveDeal(id, stage) {
    const d = S.deals.filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    d.stage = stage; d.days = 0;
    if (id === 'd-harbour' && stage === 'won') { S.won = true; toast('Won. Discover will look for more cafes like Harbour Street.'); }
    render();
  }
  function startDeal() {
    if (S.dealStarted) return;
    S.dealStarted = true; S.nextConfirmed = true;
    S.deals.unshift(Object.assign({}, D.NEW_DEAL));
    location.hash = '#/pipeline';
    toast('Deal started from Maria\'s reply. It is on your pipeline.');
  }
  function onboarded() {
    S.onboarded = true;
    location.hash = '#/today';
    toast('Your first good fits are saved. Next: Discover.');
  }

  // Jump to the start of a step, for deep links and screenshots: ?step=3
  function jump(n) {
    S = fresh();
    if (n > 1) S.onboarded = true;
    if (n > 2) { S.look = 'done'; S.lookStep = D.LOOK_STEPS.length; S.found = D.FOUND.map(function (f) { return f.id; }); S.decisions.harbour = 'keep'; S.open = {}; }
    if (n > 3) { S.people = 'found'; S.email = 'found'; S.wf = D.WATERFALL.length; S.lead = 'added'; }
    if (n > 4) { S.lead = 'briefed'; S.logStep = D.RESEARCH_LOG.length; S.enriched = D.SOURCES.length; }
    if (n > 5) { S.lead = 'drafted'; S.copied = true; S.sent = true; }
    if (n > 6) { S.dealStarted = true; S.nextConfirmed = true; S.deals.unshift(Object.assign({}, D.NEW_DEAL)); }
    if (n > 7) { S.won = true; S.deals[0].stage = 'won'; }
  }

  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-act]');
    if (!t) {
      const c = e.target.closest('[data-cite]');
      if (c) { S.openSteps.brief = true; }
      return;
    }
    const act = t.getAttribute('data-act');
    const id = t.getAttribute('data-id');
    switch (act) {
      case 'skip-content': e.preventDefault(); $('#view').focus(); break;
      case 'look': runLook(); break;
      case 'add-q': toast('In the real app you can write your own questions. Orblo asks them of every company.'); break;
      case 'keep': S.decisions[id] = 'keep'; S.open[id] = false; render(); if (id === 'harbour') toast('Kept. Next: find the right person at Harbour Street Cafe.'); break;
      case 'skip': S.decisions[id] = 'skip'; render(); break;
      case 'undo': delete S.decisions[id]; render(); break;
      case 'more': S.open[id] = !S.open[id]; render(); break;
      case 'people': findPeople(); break;
      case 'email': findEmail(); break;
      case 'email-other': toast('In the sample, only Maria is looked up. Each lookup costs credits, so Orblo asks before it runs one.'); break;
      case 'add-lead': S.lead = 'added'; location.hash = '#/leads/maria'; break;
      case 'enrich': enrich(); break;
      case 'brief': brief(); break;
      case 'draft': draft(); break;
      case 'toggle': S.openSteps[t.getAttribute('data-step')] = !S.openSteps[t.getAttribute('data-step')]; render(); break;
      case 'tab': S.tab = t.getAttribute('data-tab'); render(); break;
      case 'redraft': S.drafts[S.tab] = JSON.parse(JSON.stringify(D.DRAFTS[S.tab])); S.copied = false; render(); toast('Written again from the brief.'); break;
      case 'try-line': {
        const d = S.drafts[S.tab];
        if (d.body.indexOf(D.TRY_LINE) < 0) d.body = d.body.replace('first week be useful?', 'first week be useful? ' + D.TRY_LINE);
        S.copied = false; render(); toast('Added a meeting ask. See what the checks say.'); break;
      }
      case 'copy': copyDraft(); break;
      case 'sent': S.sent = true; S.lead = 'drafted'; render(); toast('Marked as sent by you. The next morning, Maria replies.'); break;
      case 'mood': S.practice = { mood: t.getAttribute('data-mood'), answer: '', noticed: null }; render(); break;
      case 'practice-check': S.practice.noticed = lookAtAnswer(); render(); break;
      case 'confirm-next': S.nextConfirmed = true; render(); toast('Next step saved on Maria\'s record, due Nov 14.'); break;
      case 'change-next': toast('In the real app you can edit the step and its day. The sample keeps the suggestion.'); break;
      case 'deal': startDeal(); break;
      case 'orb': openOrb(); break;
      case 'orb-close': closeOrb(); break;
      case 'orb-ask': S.orbAsked.push(Number(t.getAttribute('data-i'))); $('#orb').innerHTML = orbHtml(); break;
      case 'theme': setTheme(t.getAttribute('data-theme')); break;
      case 'reset': S = fresh(); window.OrbitStage.restart(); location.hash = '#/welcome'; render(); break;
    }
  });
  document.addEventListener('change', function (e) {
    const t = e.target;
    if (t.matches('select[data-act="move"]')) moveDeal(t.getAttribute('data-id'), t.value);
  });
  document.addEventListener('input', function (e) {
    const t = e.target;
    if (t.id === 'body' || t.id === 'subj') {
      const d = S.drafts[S.tab];
      if (t.id === 'body') d.body = t.value; else d.subject = t.value;
      S.copied = false;
      const c = checksHtml();
      $('#checks').innerHTML = c.html;
      $('#wc').textContent = words(d.body) + ' words';
      $('#opens').innerHTML = c.cited ? 'Opens with a cited fact' + cite(1) + ': "' + esc(D.SOURCES[0].excerpt.split('. ')[0]) + '."' : 'No cited fact left in this version.';
      const btn = $('#copy-btn');
      if (btn) { btn.disabled = c.blocked; }
      const why = $('#blocked-why'); if (why) why.hidden = !c.blocked;
    }
    if (t.id === 'practice-answer') S.practice.answer = t.value;
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#orb').hidden) closeOrb(); });

  // ---------- theme ----------
  function effective() {
    const set = document.documentElement.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function setTheme(name) {
    if (name !== 'light' && name !== 'dark') name = effective() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', name);
    try { localStorage.setItem('ob-theme', name); } catch (e) { /* ignore */ }
    paintTheme(); window.OrbitStage.recolour();
  }
  function paintTheme() {
    const now = effective();
    document.querySelectorAll('.theme-switch [data-theme]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-theme') === now)); });
  }
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { paintTheme(); window.OrbitStage.recolour(); });

  // ---------- start ----------
  window.OrbitStage.mount($('#stage'), function (kind) { if (kind === 'trial') toast('Checkout is not part of the sample. Opening Today.'); onboarded(); });
  const stepParam = Number(new URLSearchParams(location.search).get('step'));
  if (stepParam >= 1 && stepParam <= 8) {
    jump(stepParam);
    const target = stepParam <= STEPS.length ? STEPS[stepParam - 1].route : 'pipeline';
    if (!location.hash) location.hash = '#/' + target;
  }
  window.addEventListener('hashchange', render);
  render();
})();
