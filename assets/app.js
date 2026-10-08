/* Kindred interactive demo. Static, no network calls, scripted example data only. */
(function () {
  'use strict';
  const K = window.KD;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ---------- icons ----------
  const I = {
    check: (c = '#fff', s = 11, w = 3.2) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    info: (c = '#6B5F57', s = 13) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>`,
    lock: (s = 13) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#B8735A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    clock: `<svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    arrow: (c = '#fff') => `<svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    edit: `<svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
    copy: `<svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`,
    spark: `<svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/></svg>`,
    x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    link: `<svg class="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B5F57" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>`,
    file: `<svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9C5E47" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>`
  };

  // ---------- state ----------
  const S = {
    voice: { open: 'direct', formal: 'casual', length: 'short' },
    tab: { maya: 'comment', lena: 'email' },
    edits: {},                // lead:tab -> innerHTML after manual edits
    enrich: 'idle',           // idle | running | done
    lenaDone: false,
    acctFilter: 'all',
    vpending: null, vtab: 'dm',
    company: { ...K.COMPANY_START }, imported: false,
    raf: 0, timers: []
  };
  const ctxScore = () => K.COMPANY_FIELDS.reduce((n, f) => n + ((S.company[f.k] || '').trim() ? f.w : 0), 0);
  const firstLine = (k) => ((S.company[k] || '').trim().split('\n')[0] || '').trim();
  const hasProof = () => !!firstLine('proof');
  const hasObj = () => !!firstLine('objections');
  const later = (fn, ms) => { const t = setTimeout(fn, ms); S.timers.push(t); return t; };
  const clearTimers = () => { S.timers.forEach(clearTimeout); S.timers = []; cancelAnimationFrame(S.raf); };

  // ---------- toast ----------
  let toastT;
  function toast(msg, kind = 'ok') {
    const t = $('#toast');
    t.innerHTML = `<span class="tk ${kind === 'info' ? 'info' : ''}">${kind === 'info' ? I.info('#fff', 12) : I.check('#fff', 11)}</span><span>${msg}</span>`;
    t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), kind === 'info' ? 3600 : 2800);
  }

  // ---------- router ----------
  function parse() {
    const h = location.hash.replace(/^#\/?/, '') || 'leads';
    const [a, b] = h.split('/');
    return { a, b };
  }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  function render() {
    const { a, b } = parse();
    if (S.enrich === 'running' && a !== 'enrich') S.enrich = 'idle';
    clearTimers(); closeModal(true);
    const navKey = { leads: 'leads', enrich: 'leads', brief: 'briefs', account: 'account', briefs: 'briefs', voice: 'voice', company: 'company' }[a] || 'leads';
    $$('#nav a').forEach((x) => x.classList.toggle('on', x.dataset.nav === navKey));
    const v = $('#view');
    let html;
    if (a === 'enrich') html = viewEnrich();
    else if (a === 'brief') html = viewBrief(K.LEADS[b] ? b : 'maya');
    else if (a === 'account') html = viewAccount();
    else if (a === 'briefs') html = viewBriefs();
    else if (a === 'voice') html = viewVoice();
    else if (a === 'company') html = viewCompany();
    else html = viewLeads();
    v.innerHTML = html;
    v.scrollTop = 0; window.scrollTo(0, 0);
    document.title = 'Kindred: ' + ({ enrich: 'Enrich from post', brief: 'Prospect brief', account: 'Tidewell account', briefs: 'Briefs', voice: 'Your voice', company: 'Your company' }[a] || 'Leads') + ' (demo)';
    if (a === 'brief') fillDraft(K.LEADS[b] ? b : 'maya');
  }

  // ---------- LEADS ----------
  function viewLeads() {
    const L = K.LEADS.lena;
    const lenaStatus = S.lenaDone ? `<span class="tag ok">Brief ready</span>` : `<span class="fresh"><i></i>New, 2 min ago</span>`;
    return `<section class="screen s-leads"><div class="wrap">
      <div class="head">
        <div><h1>Leads</h1><div class="sub">Inbound leads and public posts worth a reply. Fast research, human send.</div></div>
        <div class="badges"><span class="badge"><span class="dot"></span>Speed to lead this week: 4 min median</span></div>
      </div>
      <div class="grid">
        <div class="col">
          <section class="card inbox">
            <div class="ih"><h2>Inbox</h2><span class="dim" style="font-size:13px">Thursday, 9:41 AM PT</span></div>
            <div class="lthead"><span>Lead</span><span>Source</span><span>What they need</span><span>Status</span><span></span></div>
            <div class="lrow sel" data-act="research">
              <div class="who"><div class="av">LM</div><div><b>${L.name}</b><span>Founder, Brightloom</span></div></div>
              <div><span class="tag rec">Inbound form</span></div>
              <div class="need">Onboarding is a pile of docs and Slack threads</div>
              <div>${lenaStatus}</div>
              <div><span class="btn sm primary">${S.lenaDone ? 'Open brief' : 'Research lead'}</span></div>
            </div>
            <div class="lrow" data-act="history" data-who="Jonah">
              <div class="who"><div class="av">JR</div><div><b>Jonah Reyes</b><span>Cofounder, Fieldnote</span></div></div>
              <div><span class="tag src">From post</span></div>
              <div class="need">Asked about async standups on LinkedIn</div>
              <div><span style="color:var(--olive-dk);font-weight:500">Sent by you, yesterday</span></div>
              <div><span class="btn sm">View brief</span></div>
            </div>
            <div class="lrow" data-act="history" data-who="Priya">
              <div class="who"><div class="av">PL</div><div><b>Priya Lal</b><span>Founder, Copperline</span></div></div>
              <div><span class="tag rec">Inbound form</span></div>
              <div class="need">Wants a lighter way to run client kickoffs</div>
              <div><span class="dim">Draft, 3 days ago</span></div>
              <div><span class="btn sm">View brief</span></div>
            </div>
          </section>

          <section class="card lead">
            <div>
              <div class="lh"><div><h2>${L.name}, ${L.role} at ${L.company}</h2><div class="sub">Demo request from your website form, 9:39 AM PT</div></div>${lenaStatus}</div>
              <div class="fld"><label>Name</label><div class="input">${L.name}</div></div>
              <div class="two">
                <div class="fld"><label>Work email</label><div class="input">${L.email}</div></div>
                <div class="fld"><label>Phone</label><div class="input">${L.phone}</div></div>
              </div>
              <div class="fld"><label>Company size</label><div class="input">${L.size}</div></div>
              <div class="fld" style="margin-bottom:0"><label>What do you need help with?</label><div class="input area">${esc(L.need)}</div></div>
            </div>
            <div class="noticed">
              <div class="label">Kindred noticed</div>
              <div class="nrow">${I.check('#5F6749', 12, 2.6)}<div>Work email matches brightloom.example<small>Not a personal address</small></div></div>
              <div class="nrow">${I.check('#5F6749', 12, 2.6)}<div>Area code 503 points to Portland<small>Same time zone as you (PT)</small></div></div>
              <div class="nrow">${I.info('#6B5F57', 13)}<div>Current tools not mentioned<small>Worth asking, not guessing</small></div></div>
              <div class="go"><button class="btn primary full" data-act="research">${S.lenaDone ? 'Open brief' : 'Research lead'}</button>
              <div class="hint">Public sources only. Nothing is sent.</div></div>
            </div>
          </section>
        </div>

        <div class="col">
          <section class="card postcta">
            <div class="label">New from post</div>
            <h2>Saw a founder ask for help in public?</h2>
            <p>Paste the post. Kindred finds who wrote it, confirms the company with two sources, and suggests the most respectful way to reply.</p>
            <button class="btn primary" data-act="newpost">${I.spark}New from post</button>
          </section>
          <section class="card how">
            <div class="label">How a brief gets made</div>
            <ol class="chainmini">
              <li><span class="n">1</span><div><b>Intake</b> <span>opens one shared lead file</span></div></li>
              <li class="ext"><span class="n">2</span><div><b>Enrich</b> <span>the only agent that reaches outside data</span></div></li>
              <li><span class="n">3</span><div><b>Why now</b> <span>their reason, in their own words</span></div></li>
              <li><span class="n">4</span><div><b>Persona</b> <span>tone and channel from behaviour</span></div></li>
              <li><span class="n">5</span><div><b>Drafter</b> <span>comment, DM, email, call opener</span></div></li>
              <li><span class="n">6</span><div><b>Brief</b> <span>one screen for you to review</span></div></li>
            </ol>
            <div class="rules"><div class="label" style="width:100%;margin-bottom:2px">Care rules</div><span>Never sends</span><span>Never invents</span><span>Asks when unsure</span><span>Pushes back</span><span>Never pushy</span><span>Behaviour, not demographics</span></div>
          </section>
        </div>
      </div>
    </div></section>`;
  }

  // ---------- chain (shared by enrich + inbound modal) ----------
  const fmtS = (s) => Math.floor(s) + 's';
  // scripted durations: always rendered from data, never from wall-clock time
  const fmtDur = (s) => (s >= 60 ? Math.floor(s / 60) + 'm ' + (s % 60) + 's' : s + 's');
  function chainSteps(cfg) {
    return `<ol class="steps">${cfg.steps.map((s, i) => `
      <li class="stp" data-step="${i}">
        <span class="si">${i + 1}</span>
        <div><div class="st">${s.n}${s.ext ? '<span class="tag out">Outside data</span>' : ''}</div><div class="sd">${s.d}</div><div class="s3"></div></div>
        <span class="sl"></span>
      </li>`).join('')}</ol>`;
  }
  function runChain(cfg, root, opts) {
    const t0 = performance.now();
    const rows = $$('.stp', root);
    const st = rows.map(() => 'wait');
    let finished = false;
    function frame(now) {
      if (finished) return;
      const el = now - t0;
      const last = el >= cfg.realMs;
      // never show the scripted total before the run is over, and always show exactly it at the end
      const sec = last ? cfg.total : Math.min(cfg.total - 1, (el / cfg.realMs) * cfg.total);
      opts.onTick && opts.onTick(sec);
      cfg.steps.forEach((s, i) => {
        const row = rows[i];
        const state = sec >= s.b ? 'done' : sec >= s.a ? 'run' : 'wait';
        if (state !== st[i]) {
          st[i] = state; row.className = 'stp ' + state;
          if (state === 'done') {
            row.querySelector('.si').innerHTML = I.check('#fff', 12, 3);
            row.querySelector('.s3').textContent = s.r;
            row.querySelector('.sl').textContent = (s.b - s.a) + 's';
            opts.onStepDone && opts.onStepDone(i, s);
          }
        }
        if (state === 'run') {
          const k = Math.min(s.sub.length - 1, Math.floor(((sec - s.a) / (s.b - s.a)) * s.sub.length));
          const txt = s.sub[k] + '…';
          const s3 = row.querySelector('.s3'); if (s3.textContent !== txt) s3.textContent = txt;
          row.querySelector('.sl').textContent = fmtS(sec - s.a);
        }
      });
      if (!last) { S.raf = requestAnimationFrame(frame); return; }
      finished = true;
      opts.onDone && opts.onDone(cfg.total);
    }
    S.raf = requestAnimationFrame(frame);
  }

  // ---------- ENRICH ----------
  const POST = 'Just hired our 15th person and realized onboarding lives entirely in my head. What simple system worked for you at this size?';
  function enrichHead() {
    const st = S.enrich;
    const flow = `<div class="flow"><span class="f ${st === 'idle' ? 'on' : 'done'}">Post</span><span>&rarr;</span><span class="f ${st === 'idle' ? '' : 'on'}">Enrich</span><span>&rarr;</span><span class="f">Brief</span></div>`;
    const badge = st === 'done' ? `<span class="badge" id="ebadge" style="font-size:13.5px;font-weight:600;padding:6px 12px"><span class="dot"></span>Enriched in ${fmtDur(K.CHAIN.maya.total)}</span>`
      : st === 'running' ? `<span class="badge work" id="ebadge"><span class="dot"></span><span id="etimer">Working · 0s</span></span>`
        : `<span class="badge plain" id="ebadge">Not run yet</span>`;
    return `<div class="head"><div><h1>Enrich from post</h1><div class="sub">A public post becomes a matched prospect, ready for a brief.</div></div>
      <div style="display:flex;align-items:center;gap:14px">${flow}${badge}</div></div>`;
  }
  function guardCard() {
    return `<section class="card guard"><div class="label">Guardrails</div>
      <div class="g">${I.info()}Public sources and licensed data only. No scraping behind logins.</div>
      <div class="g">${I.info()}Personal contact info is never used without consent.</div>
      <div class="g">${I.info()}Anonymous posters are never unmasked: reply in the thread instead.</div>
      <div class="g">${I.info()}Based on public activity only. Kindred does not guess age or personal traits.</div></section>`;
  }
  function postCard() {
    const st = S.enrich;
    const btn = st === 'done' ? `<span class="btn done">${I.check('#5F6749', 13, 2.6)}Enrich from post</span><span>Ran at 9:38 AM PT</span>`
      : st === 'running' ? `<button class="btn primary lg" disabled>Enriching…</button><span>Public sources only</span>`
        : `<button class="btn primary lg" data-act="enrich" id="enrichBtn">${I.spark}Enrich</button><span>Public sources only. Nothing is sent.</span>`;
    return `<section class="card post">
      <div class="label">Source post</div>
      <div class="paste">${I.link}<span>linkedin.com/posts/maya-okafor</span><em>Pasted</em></div>
      <div class="ph"><div class="av">MO</div><div><b>Maya Okafor</b><span>LinkedIn · 2 days ago</span></div></div>
      <p class="txt">${POST}</p>
      <div class="meta"><span>126 reactions</span><span>41 comments</span></div>
      <div class="ran">${btn}</div></section>`;
  }
  function viewEnrich() {
    const cfg = K.CHAIN.maya;
    if (S.enrich === 'done') return enrichDone();
    return `<section class="screen s-enrich"><div class="wrap">${enrichHead()}
      <div class="grid">
        <div class="col">${postCard()}${guardCard()}</div>
        <section class="card chain" id="chain">
          <div class="cl">
            <div class="ch1"><div><h2>Agent chain</h2></div><span class="tag src">6 focused agents</span></div>
            <div class="cs">Each agent does one job and passes the same lead file to the next.</div>
            ${chainSteps(cfg)}
          </div>
          <div class="cr">
            <div class="label">Shared lead file</div>
            <div class="file">
              <div class="fh" style="margin-top:8px"><span class="fname">${I.file}lead-maya-okafor.json</span><span class="dim" style="font-size:13px" id="fcount">0 fields</span></div>
              <div id="frows"><div class="fempty">Empty until you click Enrich.</div></div>
            </div>
            <div class="boundary">${I.lock(12)}<span>Strict boundaries: only Enrich reaches outside data. Every other agent works from this file alone, so each claim traces back to a source.</span></div>
          </div>
        </section>
      </div></div></section>`;
  }
  function startEnrich() {
    if (S.enrich !== 'idle') return;
    S.enrich = 'running';
    const head = $('.s-enrich .head'); head.outerHTML = enrichHead();
    $('.s-enrich .post').outerHTML = postCard();
    const cfg = K.CHAIN.maya;
    const frows = $('#frows'); frows.innerHTML = ''; let count = 0;
    runChain(cfg, $('#chain'), {
      onTick: (s) => { const t = $('#etimer'); if (t) t.textContent = 'Working · ' + fmtS(s); },
      onStepDone: (i, s) => {
        (s.file || []).forEach(([k, v, w]) => {
          const d = document.createElement('div'); d.className = 'frow';
          d.innerHTML = `<span class="k">${k}</span><span class="v">${esc(v)}<span class="w">${w ? esc(w) + ' · ' : ''}written by ${s.n}</span></span>`;
          frows.appendChild(d); count++;
        });
        $('#fcount').textContent = count + ' fields';
      },
      onDone: () => {
        const b = $('#ebadge');
        b.className = 'badge'; b.style.cssText = 'font-size:13.5px;font-weight:600;padding:6px 12px';
        b.innerHTML = `<span class="dot"></span>Enriched in ${fmtDur(cfg.total)}`;
        later(() => { S.enrich = 'done'; const v = $('#view'); v.innerHTML = enrichDone(true); }, 1300);
      }
    });
  }
  function enrichDone(animate) {
    const ck = `<span class="ck">${I.check()}</span>`;
    const pills = K.CHAIN.maya.steps.map((s) => `<span class="${s.ext ? 'ext' : ''}">${I.check(s.ext ? '#9C5E47' : '#5F6749', 10, 3)}${s.n}</span>`).join('');
    return `<section class="screen s-enrich ${animate ? 'still' : ''}"><div class="wrap">${enrichHead()}
      <div class="grid ${animate ? 'reveal' : ''}">
        <div class="col">${postCard()}${guardCard()}
          <section class="card ranchain">
            <div class="top3"><div class="label">Agent chain</div><button class="link" data-act="replay" style="font-size:13px">Replay</button></div>
            <div class="pills">${pills}</div>
            <div style="font-size:13px;color:var(--muted)">6 of 6 agents done in ${fmtDur(K.CHAIN.maya.total)}. One shared lead file.</div>
          </section>
        </div>
        <div class="col">
          <section class="card step">
            <div class="sh">${ck}<h3>From the post</h3><span class="r tag src">From post</span></div>
            <div class="kv"><span class="k">Name</span><span class="v">Maya Okafor</span><span></span></div>
            <div class="kv"><span class="k">Handle</span><span class="v">in/maya-okafor-example</span><span></span></div>
            <div class="kv"><span class="k">Headline</span><span class="v">Founder at Tidewell. Scheduling for outdoor guides.</span><span></span></div>
            <div class="kv"><span class="k">Link in bio</span><span class="v">tidewell.example</span><span></span></div>
          </section>
          <section class="card step">
            <div class="sh">${ck}<h3>Company match: Tidewell</h3><span class="r tag ok">Confirmed</span></div>
            <div class="kv"><span class="k">Source 1</span><span class="v">Company site, team page<small>Lists Maya Okafor, Founder</small></span><span class="tag ok">Agrees</span></div>
            <div class="kv"><span class="k">Source 2</span><span class="v">Product Hunt launch<small>Maker: Maya Okafor, Tidewell</small></span><span class="tag ok">Agrees</span></div>
            <div class="rule">Rule: a match is Confirmed only when two independent sources agree. Otherwise it shows as "Possible match, check".</div>
          </section>
          <section class="card step">
            <div class="sh">${ck}<h3>Cross-platform presence</h3></div>
            <div class="kv"><span class="k">LinkedIn</span><span class="v">2 to 3 posts a week<small>Source post account</small></span><span class="tag ok">Active</span></div>
            <div class="kv"><span class="k">X</span><span class="v">Rare, last post 5 months ago<small>Linked from her personal site, confirmed</small></span><span class="tag src">Rare</span></div>
            <div class="kv"><span class="k">Reddit</span><span class="v">No account found</span><span class="tag no">None</span></div>
          </section>
        </div>
        <div class="col">
          <section class="card step">
            <div class="sh">${ck}<h3>Contact route, most respectful first</h3></div>
            <div class="kv"><span class="k"><span class="num">1</span>Reply</span><span class="v">Comment on her post</span><span class="tag rec">Recommended</span></div>
            <div class="kv"><span class="k"><span class="num">2</span>DM</span><span class="v">LinkedIn message, after the reply</span><span></span></div>
            <div class="kv"><span class="k"><span class="num">3</span>Email</span><span class="v">maya@tidewell.example<small>Work address, checked with an email finder</small></span><span class="tag ok">Verified</span></div>
            <div class="kv"><span class="k"><span class="num off">·</span>Phone</span><span class="v" style="color:var(--muted)">Not public</span><span class="tag no">Not used</span></div>
          </section>
          <section class="card step">
            <div class="sh">${ck}<h3>Context added</h3></div>
            <div class="kv"><span class="k">Podcast</span><span class="v">Plans to hire about 10 this year<small>Founder interview, 3 weeks ago</small></span><span class="tag src">Public</span></div>
            <div class="kv"><span class="k">Changelog</span><span class="v">Shipped team accounts<small>Last week</small></span><span class="tag src">Public</span></div>
            <div class="kv"><span class="k">Careers</span><span class="v">3 open roles, all posted this month</span><span class="tag src">Public</span></div>
            <div class="kv"><span class="k">Funding</span><span class="v" style="color:var(--muted)">Not found, worth asking</span><span class="tag no">Unknown</span></div>
          </section>
          <section class="card readyc">
            <div class="label">Ready for a brief</div>
            <h3>Maya Okafor, Founder at Tidewell</h3>
            <p>Company confirmed by 2 sources. 1 active channel, 1 work email found. 1 gap flagged.</p>
            <div class="row">
              <button class="btn primary lg" data-act="buildbrief">Build brief${I.arrow()}</button>
              <span class="never-line">${I.lock()}Kindred will never send without you.</span>
            </div>
          </section>
        </div>
      </div></div></section>`;
  }

  // ---------- BRIEF ----------
  function viewBrief(id) {
    const L = K.LEADS[id];
    const inb = L.mode === 'inbound';
    const tabs = K.DRAFTS[id].tabs.map(([k, n]) => `<button data-act="tab" data-tab="${k}" class="${S.tab[id] === k ? 'on' : ''}">${n}</button>`).join('');
    const reach = L.reach;
    const who = id === 'maya' ? L.who.p.replace('Tidewell makes', '<a class="link" href="#/account/tidewell" style="font-weight:500">Tidewell</a> makes') : L.who.p;
    return `<section class="screen s-brief" data-lead="${id}">
      <aside>
        <div class="seg"><button data-act="mode" data-to="lena" class="${inb ? 'on' : ''}">Inbound</button><button data-act="mode" data-to="maya" class="${inb ? '' : 'on'}">Outbound</button></div>
        <div class="modehint">${inb ? 'They reached out first. Kindred reads the form, checks public sources, and suggests a fast, human reply.' : 'They have not reached out yet. Kindred researches their public presence and suggests how to start.'}</div>
        <div class="field"><label>Name</label><div class="input">${L.name}</div></div>
        <div class="field"><label>Company or work email</label><div class="input">${L.email}</div></div>
        <div class="two">
          <div class="field"><label>Phone</label><div class="input">${L.phone}</div></div>
          <div class="field"><label>Company size</label><div class="input">${L.size}</div></div>
        </div>
        <div class="field"><label>${inb ? 'What they asked for' : 'Your notes'}</label><div class="input area">${esc(inb ? L.need : L.notes)}</div></div>
        <button class="btn primary full" data-act="rerun">${inb ? 'Research lead' : 'Research prospect'}</button>
        <div class="hint">Public sources only. Nothing is sent.</div>
        <div class="recent">
          <div class="label" style="margin-bottom:5px">Recent briefs</div>
          <div class="item"><b>Jonah Reyes, Fieldnote</b><span style="color:var(--olive-dk)">Sent</span></div>
          <div class="item"><b>Priya Lal, Copperline</b><span>Draft</span></div>
        </div>
      </aside>
      <div class="content">
        <div class="head">
          <div><h1>${L.name}, ${L.role} at ${L.company}</h1>
            <div class="sub">${L.headSub} <span style="color:var(--faint)">&nbsp;·&nbsp; Sources: ${L.sources}</span></div></div>
          <div class="badges"><span class="badge plain">${L.badges[0]}</span><span class="badge ready">${I.clock}Brief ready in ${fmtDur(L.readySec)}</span></div>
        </div>
        <div class="grid">
          ${fitCard(id)}
          <div class="card"><div class="label"><i></i>Who they are</div><div class="big">${L.who.big}</div><p>${who}</p><span class="missing">${L.who.gap}</span></div>
          <div class="card"><div class="label"><i></i>Why now</div><p class="quote">${L.why.q}</p><div class="src">${L.why.src}</div></div>
          <div class="card"><div class="label"><i></i>Best time to call</div><div class="time"><span class="t">${L.time.t}</span><span class="z">${L.time.z}</span></div><p style="margin-top:5px">${L.time.p}</p></div>
          <div class="card"><div class="label"><i></i>Talking point</div><div class="big">${L.talk.big}</div>${hasProof() ? `<div class="proof"><span class="tag ok">Proof</span>${esc(firstLine('proof'))}</div>` : `<p>${L.talk.p}</p>`}</div>
          <div class="card"><div class="label"><i></i>Discovery question</div><p class="big" style="font-weight:500">${L.disc}</p></div>
          <div class="card watch"><div class="label"><i></i>Watch for</div><div class="big">${L.watch.big}</div>${hasObj() ? `<p><b class="ans">Your answer:</b> ${K.FIT[id].answer}</p>` : `<p>${L.watch.p}</p>`}</div>
          <div class="right">
            <div class="card reach">
              <div class="top2"><div class="label"><i></i>Best way to reach them</div><span class="src" style="margin:0">${reach.note}</span></div>
              ${reach.ch.map(([n, f, l, c]) => `<div class="chl"><span class="n">${n}</span><span class="f">${f}</span><span class="lvl ${c}">${l}</span></div>`).join('')}
              <div class="meta2"><div><div class="k">Tone</div><div class="v">${reach.tone}</div></div><div><div class="k">Topics</div><div class="v">${reach.topics}</div></div></div>
              <div class="seq"><ol>${reach.seq.map(([a, b]) => `<li>${a} <span>${b}</span></li>`).join('')}</ol><div class="why">${reach.why}</div></div>
              <div class="honest">${I.info()}Based on public activity only. Kindred does not guess age or personal traits.</div>
            </div>
            <div class="card draft">
              <div class="dh"><div class="tabs" role="tablist">${tabs}</div>
                <button class="voicechip" data-act="voice" title="Change how drafts sound">${voiceChip()}</button></div>
              <div class="dbody"><div class="ctx"><span id="dctx"></span><span id="dwc"></span></div>
                <div class="editable" id="draft" contenteditable="true" spellcheck="false" aria-label="Draft message, editable"></div></div>
              <div class="pcheck" id="pcheck" aria-live="polite"></div>
              <div class="actions">
                <button class="btn" data-act="edit">${I.edit}Edit</button>
                <button class="btn primary" data-act="copy">${I.copy}Copy to send yourself</button>
                <button class="btn" data-act="openpost" id="openpost">Open post</button>
              </div>
              <div class="never">${I.lock()}Kindred will never send without you. You review, edit, and send.</div>
            </div>
          </div>
        </div>
      </div></section>`;
  }
  function fitCard(id) {
    const F = K.FIT[id]; const sc = ctxScore();
    return `<div class="card fit ${F.level}">
      <div class="fith"><div class="label"><i></i>Why it fits</div><span class="fitlvl ${F.level}">${F.label}</span>
        <a class="ctxchip" href="#/company" title="What Kindred knows about what you sell">Product context ${sc}%</a></div>
      <div class="fitwhy">${F.why}</div>
      <div class="fitrow">
        <div class="fc"><div class="k">In her words</div><p class="quote">${F.words}</p></div>
        <div class="fa">${I.arrow('#B9A99B')}</div>
        <div class="fc"><div class="k">${F.useLabel}</div><p>${F.use}</p></div>
        <div class="fa">${I.arrow('#B9A99B')}</div>
        <div class="fc ${F.level === 'possible' ? 'ask' : ''}"><div class="k">${F.nowLabel}</div><p>${F.now}</p></div>
      </div></div>`;
  }
  const voiceChip = () => `<span><b>Your voice</b>, ${{ direct: 'direct', warm: 'warm', question: 'curious' }[S.voice.open]}</span>${I.edit.replace('width="13" height="13"', 'width="11" height="11"')}`;

  function draftHTML(d, prev) {
    const prevSet = prev ? new Set(sentences(prev)) : null;
    const mk = (txt) => {
      if (!prevSet) return esc(txt);
      return splitSent(txt).map((s) => {
        if (!s.trim() || prevSet.has(s.trim())) return esc(s);
        const m = s.match(/^([\s\S]*?)(\s*)$/);
        return `<mark>${esc(m[1])}</mark>${m[2]}`;
      }).join('');
    };
    let h = '';
    if (d.subject) h += `<div class="subj">Subject: <b>${mk(d.subject)}</b></div>`;
    h += d.paras.map((p) => `<p>${mk(p)}</p>`).join('');
    return h;
  }
  const splitSent = (t) => t.match(/[^.?!:\n]+[.?!:]*["”]?\s*|\n/g) || [t];
  function sentences(d) {
    const all = [];
    if (d.subject) all.push(...splitSent(d.subject));
    d.paras.forEach((p) => all.push(...splitSent(p)));
    return all.map((s) => s.trim()).filter(Boolean);
  }
  function fillDraft(id, prevVoice) {
    const el = $('#draft'); if (!el) return;
    const tab = S.tab[id];
    const d = K.compose(id, tab, S.voice, { proof: hasProof() });
    const key = id + ':' + tab;
    if (S.edits[key] && !prevVoice) el.innerHTML = S.edits[key];
    else el.innerHTML = draftHTML(d, prevVoice ? K.compose(id, tab, prevVoice, { proof: hasProof() }) : null);
    $('#dctx').textContent = d.ctx;
    updateWc();
    const op = $('#openpost'); if (op) op.style.display = tab === 'comment' ? '' : 'none';
    if (prevVoice) later(() => $$('#draft mark').forEach((m) => m.classList.add('fade')), 2200);
  }
  function updateWc() {
    const el = $('#draft'); if (!el) return;
    const n = (el.innerText.replace(/^Subject:.*$/m, '').match(/\S+/g) || []).length;
    $('#dwc').textContent = n + ' words';
    phraseCheck(el.innerText);
  }
  // Phrase check: scans the draft against research/avoid-phrases.json (inlined as assets/phrases.js).
  // Advisory only. It never blocks copying and never edits your text.
  const PHRASES = (window.KD_PHRASES || []).map((x) => { try { return { ...x, rx: new RegExp(x.re, 'i') }; } catch (_) { return null; } }).filter(Boolean);
  function phraseCheck(text) {
    const box = $('#pcheck'); if (!box) return;
    const t = text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    const hits = []; const seen = new Set();
    PHRASES.forEach((x) => { const m = t.match(x.rx); if (m && !seen.has(x.p)) { seen.add(x.p); hits.push({ word: m[0].trim() || x.p, alt: x.alt }); } });
    if (!hits.length) { box.className = 'pcheck'; box.innerHTML = `<span class="pk">${I.check('#5F6749', 10, 3)}</span><span>Phrase check: clean, no overused phrases</span>`; return; }
    box.className = 'pcheck flag';
    const show = hits.slice(0, 2).map((h) => `<span class="pw"><span class="ph">${esc(h.word)}</span><span class="pa">Try: ${esc(h.alt)}</span></span>`).join('');
    box.innerHTML = `<span class="pl">Phrase check</span>${show}${hits.length > 2 ? `<span class="pa">and ${hits.length - 2} more</span>` : ''}`;
  }

  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) { ok = false; } ta.remove(); return ok;
    }
  }

  // ---------- SETUP: YOUR COMPANY ----------
  const setupFlow = (on) => `<div class="flow"><span class="dim" style="margin-right:2px">Setup</span><a class="f ${on === 'company' ? 'on' : 'done'}" href="#/company">1 Your company</a><span>&rarr;</span><a class="f ${on === 'voice' ? 'on' : ''}" href="#/voice">2 Your voice</a></div>`;
  function fieldHTML(f) {
    const v = S.company[f.k] || '';
    const ctl = f.short
      ? `<input class="cin" data-field="${f.k}" value="${esc(v)}" placeholder="${esc(f.ph || '')}" spellcheck="false">`
      : `<textarea class="cin" data-field="${f.k}" rows="3" placeholder="${esc(f.ph || '')}" spellcheck="false">${esc(v)}</textarea>`;
    return `<div class="cf ${v.trim() ? '' : 'empty'}" data-cf="${f.k}"><label>${f.l}<span>+${f.w}%</span></label>${ctl}</div>`;
  }
  function meterHint(sc) {
    const miss = K.COMPANY_FIELDS.filter((f) => !(S.company[f.k] || '').trim());
    if (!miss.length) return 'Full context. Briefs can cite proof and answer objections in your words.';
    return 'Add ' + miss.slice(0, 2).map((f) => f.l.toLowerCase().replace(' and your answers', '')).join(' and ') + ' to sharpen fit.';
  }
  function previewRows() {
    const F = K.FIT.maya;
    const row = (ok, k, v, empty) => `<div class="pvr ${ok ? '' : 'off'}"><span class="pvi">${ok ? I.check('#fff', 10, 3) : ''}</span><div><b>${k}</b><span>${ok ? v : empty}</span></div></div>`;
    return row(true, 'Fit and reason', `${F.label}: ${F.why}`, '') +
      row(hasProof(), 'Proof in the talking point', esc(firstLine('proof')), 'Add proof points so Kindred can cite a real result.') +
      row(hasObj(), 'Your answer in Watch for', F.answer, 'Add objections so Kindred can prepare your answer.');
  }
  function viewCompany() {
    const sc = ctxScore();
    const F = K.COMPANY_FIELDS;
    const pair = (i, j) => fieldHTML(F[i]) + fieldHTML(F[j]);
    return `<section class="screen s-company"><div class="wrap">
      <div class="head"><div><h1>Your company</h1><div class="sub">Tell Kindred what you sell and who it's for, so every brief can say how it fits that person. The more it knows, the more relevant it gets.</div></div>${setupFlow('company')}</div>
      <div class="cgrid">
        <section class="card cform">
          <div class="cfh"><h2>What you sell</h2><span class="dim" style="font-size:13px">Only used to write your briefs. Never shared.</span></div>
          <div class="cfields">${pair(0, 1)}${pair(2, 3)}${pair(4, 5)}${pair(6, 7)}${pair(8, 9)}</div>
          <div class="cnote">${I.info()}Kindred only claims what's written here or found in public sources. If a fact is missing, the brief says "not found, worth asking".</div>
        </section>
        <div class="col">
          <section class="card meter">
            <div class="mtop"><div class="label">Product context</div><span class="mnum" id="mnum">${sc}%</span></div>
            <div class="bar"><i id="mbar" style="width:${sc}%"></i></div>
            <p class="mhint" id="mhint">${meterHint(sc)}</p>
          </section>
          <section class="card imp">
            <div class="label">Import from your website or a doc</div>
            <p>Kindred reads your public pages or a doc you upload. You review every field before it's used.</p>
            <div class="ibtns">${S.imported ? `<span class="btn done">${I.check('#5F6749', 13, 2.6)}Imported from firstweek.example</span>` : `<button class="btn primary" data-act="import" data-src="firstweek.example">${I.spark}Import from firstweek.example</button><button class="btn" data-act="import" data-src="sales-notes.pdf">Upload a doc</button>`}</div>
          </section>
          <section class="card pvc">
            <div class="label">How this sharpens Maya's brief</div>
            <div id="pvrows">${previewRows()}</div>
            <a class="link" href="#/brief/maya" style="font-size:13.5px;margin-top:auto;padding-top:10px">Open Maya's brief &rarr;</a>
          </section>
        </div>
      </div></div></section>`;
  }
  let meterVal = null;
  function updateMeter() {
    const sc = ctxScore(); const n = $('#mnum'); if (!n) return;
    const from = meterVal == null ? parseInt(n.textContent, 10) : meterVal; meterVal = sc;
    $('#mbar').style.width = sc + '%'; $('#mhint').textContent = meterHint(sc);
    const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 700); n.textContent = Math.round(from + (sc - from) * (1 - Math.pow(1 - k, 3))) + '%'; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    $('#pvrows').innerHTML = previewRows();
    $$('.cf').forEach((c) => c.classList.toggle('empty', !(S.company[c.dataset.cf] || '').trim()));
  }
  function runImport(src) {
    const btns = $('.imp .ibtns');
    btns.innerHTML = `<span class="btn done"><span class="spin"></span>Reading ${src}…</span>`;
    later(() => {
      const filled = [];
      Object.entries(K.COMPANY_IMPORT).forEach(([k, v]) => {
        if (!(S.company[k] || '').trim()) {
          S.company[k] = v; filled.push(k);
          const el = $(`[data-field="${k}"]`); if (el) { el.value = v; el.closest('.cf').classList.add('flash'); }
        }
      });
      S.imported = true; meterVal = null;
      btns.innerHTML = `<span class="btn done">${I.check('#5F6749', 13, 2.6)}Imported from ${src}</span>`;
      updateMeter();
      toast(filled.length ? `Added proof points and objections from ${src}. Review them before you rely on them.` : 'Nothing new to import. Your fields are already filled.');
    }, 1500);
  }

  // ---------- VOICE (modal + page share the same parts) ----------
  function qHTML(v) {
    return K.VOICE_Q.map((q) => `<section class="card q"><div class="qh"><span class="qn">${q.n}</span><h3>${q.h}</h3><span class="qs">${q.s}</span></div>
      <div class="opts ${q.opts.length === 2 ? 'two' : ''}">${q.opts.map((o) => `<button class="opt ${v[q.k] === o.v ? 'on' : ''}" data-act="vset" data-k="${q.k}" data-v="${o.v}" aria-pressed="${v[q.k] === o.v}"><b>${o.b}</b><span>${o.d}</span></button>`).join('')}</div></section>`).join('');
  }
  function previewCard(lead, tab, v, prev, title) {
    const tabs = K.DRAFTS[lead].tabs.map(([k, n]) => `<button data-act="vtab" data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('');
    const d = K.compose(lead, tab, v, { proof: hasProof() });
    return `<section class="card vprev" id="vprev">
      <div class="dh"><div class="tabs">${tabs}</div>${title ? `<span class="dim" style="font-size:13px;white-space:nowrap">${title}</span>` : ''}</div>
      <div class="pv"><div class="ctx" style="margin-bottom:8px">${d.ctx}</div>${draftHTML(d, prev ? K.compose(lead, tab, prev, { proof: hasProof() }) : null)}</div>
      <div class="vf">${I.lock()}Preview only. You still copy and send every message yourself.</div></section>`;
  }
  function viewVoice() {
    if (!S.vpending) S.vpending = { ...S.voice };
    return `<section class="screen s-voice"><div class="wrap">
      <div class="head"><div><h1>Your voice</h1><div class="sub">Three short questions at onboarding. Kindred drafts in your words and is designed to learn from the edits you make before you send.</div></div>
      ${setupFlow('voice')}</div>
      <div class="vgrid">
        <div class="vq" id="vq">${qHTML(S.vpending)}
          <section class="card vlearn"><div class="label">After onboarding</div>Kindred notices what you change before you send, like cutting a sign-off or softening an ask, and suggests updating your voice. It never changes it silently.</section>
          <div class="vactions"><button class="btn ghost" data-act="vreset">Reset</button><button class="btn primary lg" data-act="vsave">Save voice</button></div>
        </div>
        <div style="display:flex;flex-direction:column;min-height:0" id="vprevwrap">${previewCard('maya', S.vtab, S.vpending, null, 'Preview: Maya Okafor')}</div>
      </div></div></section>`;
  }
  let VM = null; // modal state {lead, tab, pending}
  function openVoiceModal(lead) {
    VM = { lead, tab: S.tab[lead], pending: { ...S.voice } };
    const m = $('#modal');
    m.innerHTML = `<div class="modal vmodal" role="dialog" aria-modal="true" aria-labelledby="vmh">
      <div class="mh"><div><h2 id="vmh">Your voice</h2><p>Three short questions. Pick what sounds like you and watch the draft change.</p></div><button class="x" data-act="mclose" aria-label="Close">${I.x}</button></div>
      <div class="mb"><div class="vq" id="vq">${qHTML(VM.pending)}</div><div style="display:flex;flex-direction:column;gap:8px"><div class="label">Live preview, ${K.LEADS[lead].name}</div><div style="display:flex;flex-direction:column;flex:1" id="vprevwrap">${previewCard(lead, VM.tab, VM.pending, null, '')}</div></div></div>
      <div class="mf"><span class="never-line">${I.lock()}Drafts only. Kindred never sends.</span><div style="display:flex;gap:8px"><button class="btn" data-act="mclose">Cancel</button><button class="btn primary" data-act="msave">Save voice</button></div></div>
    </div>`;
    m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
  }
  function closeModal(silent) {
    const m = $('#modal'); if (!m) return;
    m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); m.innerHTML = ''; VM = null; RM = false;
  }
  function setVoice(k, val) {
    const ctx = VM ? VM : null;
    const target = ctx ? ctx.pending : S.vpending;
    const prev = { ...target };
    if (target[k] === val) return;
    target[k] = val;
    const root = ctx ? $('#modal') : $('#view');
    $$('.opt', root).forEach((o) => { if (o.dataset.k === k) { const on = o.dataset.v === val; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on); } });
    const lead = ctx ? ctx.lead : 'maya', tab = ctx ? ctx.tab : S.vtab;
    $('#vprevwrap', root).innerHTML = previewCard(lead, tab, target, prev, ctx ? '' : 'Preview: Maya Okafor');
  }

  // ---------- inbound research modal ----------
  let RM = false;
  function researchLena() {
    if (S.lenaDone) { go('#/brief/lena'); return; }
    const cfg = K.CHAIN.lena; RM = true;
    const m = $('#modal');
    m.innerHTML = `<div class="modal rmodal" role="dialog" aria-modal="true">
      <div class="rh"><h2>Researching Lena Marsh</h2><span class="badge work" id="rbadge"><span class="dot"></span><span id="rtimer">Working · 0s</span></span></div>
      <div class="cs">Inbound from your website form. Same six agents, one shared lead file.</div>
      <div id="rchain">${chainSteps(cfg)}</div></div>`;
    m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
    runChain(cfg, $('#rchain'), {
      onTick: (s) => { const t = $('#rtimer'); if (t) t.textContent = 'Working · ' + fmtS(s); },
      onDone: () => {
        const b = $('#rbadge'); if (!b) return;
        b.className = 'badge'; b.innerHTML = `<span class="dot"></span>Brief ready in ${fmtDur(cfg.total)}`;
        S.lenaDone = true;
        later(() => { if (RM) go('#/brief/lena'); }, 1000);
      }
    });
  }

  // ---------- ACCOUNT ----------
  const PEOPLE = [
    { id: 'maya', init: 'MO', n: 'Maya Okafor', r: 'Founder and CEO', pres: ['LinkedIn, 2 to 3 posts a week', 'Podcast guest, 3 weeks ago'], tone: 'Practical, warm, short sentences. Asks for advice openly.', app: ['Comment on her post, then DM', 'Weekdays, 8 to 10 AM PT'], tag: 'new', primary: true },
    { id: 'ana', init: 'AR', n: 'Ana Ruiz', r: 'Operations Lead, first ops hire', pres: ['LinkedIn, about monthly', 'Last post 3 weeks ago'], tone: 'Organised and curious. Writes in checklists, asks questions.', app: ['Email after Maya replies', 'Tue to Thu, 7 to 9 AM PT'], tag: 'new' },
    { id: 'theo', init: 'TL', n: 'Theo Lindqvist', r: 'Cofounder and CTO', pres: ['X weekly, writes the changelog', 'Last post 4 days ago'], tone: 'Dry and technical. Prefers specifics over big claims.', app: ['Hold for now', 'You emailed him 4 months ago, no reply'], tag: 'crm' },
    { id: 'jun', init: 'JP', n: 'Jun Park', r: 'Founding Designer', pres: null, tone: null, app: null, tag: 'new' }
  ];
  function peopleRows() {
    const f = S.acctFilter;
    return PEOPLE.filter((p) => f === 'all' || (f === 'crm' ? p.tag === 'crm' : p.tag === 'new')).map((p) => `
      <div class="prow ${p.primary ? 'sel' : ''}" data-act="person" data-id="${p.id}">
        <div class="who"><div class="av">${p.init}</div><div><b>${p.n}</b><span>${p.r}</span></div></div>
        ${p.pres ? `<div><span class="strong">${p.pres[0]}</span><br><span class="dim">${p.pres[1]}</span></div>` : '<div><span class="dim">No recent public activity found</span></div>'}
        ${p.tone ? `<div>${p.tone}</div>` : '<div class="dim">Not enough public activity to read. Worth asking Maya.</div>'}
        ${p.app ? `<div><span class="strong">${p.app[0]}</span><br><span class="dim">${p.app[1]}</span></div>` : '<div><span class="dim">No recommendation yet</span></div>'}
        <div class="stat"><span class="tag ${p.tag}">${p.tag === 'crm' ? 'In CRM' : 'New'}</span><span class="btn sm ${p.primary ? 'primary' : ''}">Open brief</span></div>
      </div>`).join('');
  }
  function viewAccount() {
    const t = (k, n, c) => `<button data-act="afilter" data-f="${k}" class="${S.acctFilter === k ? 'on' : ''}">${n}<b>${c}</b></button>`;
    return `<section class="screen s-acct"><div class="main">
      <div class="col">
        <section class="card acct">
          <div>
            <h1>Tidewell <span>tidewell.example</span></h1>
            <p class="desc">Scheduling and booking software for independent outdoor guides. Founder-led, ships weekly, hiring now.</p>
            <div class="chips"><span class="chip">15 people</span><span class="chip">B2B software</span><span class="chip">Austin, Central Time</span><span class="chip miss">Stage: not found, worth asking</span><span class="chip miss">Funding: not found</span></div>
          </div>
          <div>
            <div class="label" style="margin-bottom:4px"><i></i>Why now</div>
            <div class="sig"><span class="srcpill">LinkedIn</span><p>Maya: "Onboarding lives entirely in my head." <em>2 days ago</em></p></div>
            <div class="sig"><span class="srcpill">Podcast</span><p>Maya on a founder podcast: plans to hire about 10 people this year. <em>3 weeks ago</em></p></div>
            <div class="sig"><span class="srcpill">Changelog</span><p>Shipped team accounts for guide companies, a move upmarket. <em>Last week</em></p></div>
          </div>
        </section>
        <section class="card people">
          <div class="ph"><h2>People at Tidewell</h2><div class="tabs">${t('all', 'All people', 4)}${t('crm', 'In CRM', 1)}${t('new', 'New', 3)}</div></div>
          <div class="thead"><span>Person</span><span>Public presence</span><span>Tone and style</span><span>Best approach (PT)</span><span>Status</span></div>
          <div class="prows" id="prows">${peopleRows()}</div>
        </section>
      </div>
      <aside class="card play">
        <h2>Account playbook</h2>
        <div class="s">How to approach a 15-person, founder-led team</div>
        <div class="blk"><div class="label"><i></i>Tonality for this account</div>
          <p class="tone">Talk like a peer, not a vendor. Plain, short sentences, no jargon. Lead with one useful idea. At this size, founders tend to weigh their own time over features.</p></div>
        <div class="blk"><div class="label"><i></i>Objections at this stage</div>
          <div class="obj"><b>"We're too small for a new tool."</b><span>Start with the next hire only and judge it on time saved.</span></div>
          <div class="obj"><b>"I'll just build it in a doc."</b><span>Fair. Offer the checklist template either way.</span></div>
          <div class="obj"><b>"No budget until we raise."</b><span>Ask what timing works for them. Don't push.</span></div></div>
        <div class="blk"><div class="label"><i></i>Suggested approach</div>
          <ol class="plan">
            <li>Maya: comment on her onboarding post <span>today, 8 to 10 AM PT</span></li>
            <li>Maya: short DM that builds on the comment <span>2 days later</span></li>
            <li>Ana: email with the ops angle <span>once Maya replies</span></li>
            <li class="hold">Theo: hold. Already contacted 4 months ago, check your notes first</li>
          </ol>
          <p style="font-size:13px;color:var(--muted);margin-top:8px">Why this order: Maya is the buyer and the most active in public. Ana will run onboarding day to day.</p></div>
        <div class="foot">
          <div>${I.info()}Based on public activity only. Kindred does not guess age or personal traits.</div>
          <div>${I.lock()}Kindred will never send without you.</div>
        </div>
      </aside></div></section>`;
  }

  // ---------- BRIEFS LIST ----------
  function viewBriefs() {
    const row = (act, init, n, c, mode, st, when) => `<div class="brow" data-act="${act}"><div class="who"><div class="av">${init}</div><div><b>${n}</b><span>${c}</span></div></div><div><span class="tag ${mode === 'Inbound' ? 'rec' : 'src'}">${mode}</span></div><div>${st}</div><div class="dim">${when}</div><div><span class="btn sm">Open</span></div></div>`;
    return `<section class="screen s-list"><div class="wrap">
      <div class="head"><div><h1>Briefs</h1><div class="sub">Every brief Kindred has built for you. You send from your own accounts.</div></div></div>
      <section class="card blist">
        <div class="bth label"><span>Person</span><span>Type</span><span>Status</span><span>Built</span><span></span></div>
        ${row('open-maya', 'MO', 'Maya Okafor', 'Founder, Tidewell', 'Outbound', '<span class="strong">Draft ready: comment first</span>', 'Today, 9:41 AM PT')}
        ${row('open-lena', 'LM', 'Lena Marsh', 'Founder, Brightloom', 'Inbound', `<span class="strong">${S.lenaDone ? 'Draft ready: email reply' : 'New lead, reply within the hour'}</span>`, 'Today, 9:40 AM PT')}
        ${row('history', 'JR', 'Jonah Reyes', 'Cofounder, Fieldnote', 'Outbound', '<span style="color:var(--olive-dk);font-weight:500">Sent by you</span>', 'Yesterday')}
        ${row('history', 'PL', 'Priya Lal', 'Founder, Copperline', 'Inbound', '<span class="dim">Draft</span>', 'Monday')}
      </section></div></section>`;
  }

  // ---------- events ----------
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) { if (e.target.id === 'modal' && VM) closeModal(); return; }
    const act = t.dataset.act;
    const lead = $('.s-brief') ? $('.s-brief').dataset.lead : null;
    switch (act) {
      case 'newpost': S.enrich = S.enrich === 'running' ? 'idle' : S.enrich; go('#/enrich'); break;
      case 'research': researchLena(); break;
      case 'history': toast(`${t.dataset.who === 'Jonah' ? "Jonah's" : "Priya's"} brief is example history in this demo. Try Lena or Maya.`, 'info'); break;
      case 'enrich': startEnrich(); break;
      case 'replay': S.enrich = 'idle'; $('#view').innerHTML = viewEnrich(); later(startEnrich, 500); break;
      case 'buildbrief': S.tab.maya = 'comment'; go('#/brief/maya'); break;
      case 'mode': go('#/brief/' + t.dataset.to); break;
      case 'rerun': toast('Already researched at 9:41 AM PT. Nothing new since, so Kindred kept this brief.', 'info'); break;
      case 'tab': {
        S.tab[lead] = t.dataset.tab;
        $$('.draft .tabs button').forEach((b) => b.classList.toggle('on', b === t));
        fillDraft(lead); break;
      }
      case 'edit': { const d = $('#draft'); d.focus(); const r = document.createRange(); r.selectNodeContents(d); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); break; }
      case 'copy': {
        const d = $('#draft'); const text = d.innerText.trim();
        await copyText(text);
        const where = { comment: 'Paste it under her post and send it yourself.', dm: 'Paste it into LinkedIn and send it yourself.', email: 'Paste it into your email and send it yourself.', call: 'Keep it open when you call.' }[S.tab[lead]];
        toast('Copied to your clipboard. ' + where); break;
      }
      case 'openpost': toast("In the live app this opens Maya's post in a new tab. Kindred never posts for you.", 'info'); break;
      case 'voice': openVoiceModal(lead); break;
      case 'mclose': closeModal(); break;
      case 'msave': {
        const prev = { ...S.voice }; const L = VM.lead;
        const changed = JSON.stringify(prev) !== JSON.stringify(VM.pending);
        S.voice = { ...VM.pending }; S.vpending = null; closeModal();
        if (changed) { S.edits = {}; const chip = $('.voicechip'); if (chip) chip.innerHTML = voiceChip(); fillDraft(L, prev); toast('Voice saved. Drafts now follow your answers.'); }
        break;
      }
      case 'vset': setVoice(t.dataset.k, t.dataset.v); break;
      case 'vtab': {
        if (VM) { VM.tab = t.dataset.tab; $('#vprevwrap', $('#modal')).innerHTML = previewCard(VM.lead, VM.tab, VM.pending, null, ''); }
        else { S.vtab = t.dataset.tab; $('#vprevwrap').innerHTML = previewCard('maya', S.vtab, S.vpending, null, 'Preview: Maya Okafor'); }
        break;
      }
      case 'vsave': { const changed = JSON.stringify(S.voice) !== JSON.stringify(S.vpending); S.voice = { ...S.vpending }; if (changed) S.edits = {}; toast('Voice saved. Drafts now follow your answers.'); break; }
      case 'vreset': { S.vpending = { open: 'direct', formal: 'casual', length: 'short' }; render(); break; }
      case 'afilter': S.acctFilter = t.dataset.f; $$('.people .tabs button').forEach((b) => b.classList.toggle('on', b === t)); $('#prows').innerHTML = peopleRows(); break;
      case 'person': {
        const id = t.dataset.id;
        if (id === 'maya') go('#/brief/maya');
        else if (id === 'theo') toast('Holding Theo: you emailed him 4 months ago with no reply. Check your notes before you contact him again.', 'info');
        else if (id === 'ana') toast('Ana is next, once Maya replies. Kindred will build her brief with the ops angle then.', 'info');
        else toast("Not enough public activity to brief Jun. Worth asking Maya instead of guessing.", 'info');
        break;
      }
      case 'open-maya': go('#/brief/maya'); break;
      case 'open-lena': researchLena(); break;
      case 'import': runImport(t.dataset.src); break;
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.dataset && e.target.dataset.field) { S.company[e.target.dataset.field] = e.target.value; meterVal = null; updateMeter(); return; }
    if (e.target.id === 'draft') { const lead = $('.s-brief').dataset.lead; S.edits[lead + ':' + S.tab[lead]] = e.target.innerHTML; updateWc(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && VM) closeModal(); });
  window.addEventListener('hashchange', render);
  render();
})();
