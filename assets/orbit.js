/* Orblo sample: the onboarding stage. A port of the orbital map in docs/design/onboarding-orbit (Orblo repo).
   Orb reads the site, asks four short questions, and gathers the first good fits. Everything it "finds" is sample data.
   The map is decoration: hidden from screen readers, takes no clicks, and holds one still frame with reduced motion. */
window.OrbitStage = (function () {
  'use strict';
  const D = window.OB;
  const STEPS = ['YOUR SITE', 'WHAT YOU SELL', 'WHO BUYS', 'GOOD FITS', 'YOUR PLAN'];
  const CLUSTERS = [
    { id: 'site', label: 'your site/', tint: 'teal' },
    { id: 'sell', label: 'what you sell/', tint: 'ocean' },
    { id: 'buys', label: 'who buys/', tint: 'slate' },
    { id: 'fits', label: 'good fits/', tint: 'teal' }
  ];
  const fast = /[?&]fast\b/.test(location.search);
  const M = { orbitSeconds: 90, orbTravelMs: 1800, trailMs: 900, breathMs: 4000, swellMs: 900, ringLightMs: 1400, typeMs: fast ? 4 : 28, lineGapMs: fast ? 40 : 420, growMs: 900, gatherMs: 2600, stillFactor: 0.08 };
  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let rnd = 7; const rand = () => ((rnd = (rnd * 1664525 + 1013904223) >>> 0) / 4294967296);
  const TAU = Math.PI * 2; const PER_CLUSTER = 110;
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function ringPoint(ring, angle, centre, scale) {
    scale = scale == null ? 1 : scale;
    const x = Math.cos(angle) * ring.r * scale; const z = Math.sin(angle) * ring.r * scale;
    const y1 = -z * Math.sin(ring.tiltX); const z1 = z * Math.cos(ring.tiltX);
    return { x: centre.x + x * Math.cos(ring.tiltZ) - y1 * Math.sin(ring.tiltZ), y: centre.y + x * Math.sin(ring.tiltZ) + y1 * Math.cos(ring.tiltZ), z: centre.z + z1 };
  }
  const ORIGIN = { x: 0, y: 0, z: 0 };
  const bigRings = [{ r: 0.62, tiltX: 0.9, tiltZ: 0.14, glow: 0 }, { r: 0.95, tiltX: -0.72, tiltZ: -0.2, glow: 0 }];
  const HUB_PERIOD = 220; const lerp3 = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });
  const nodes = []; const hubs = {};
  CLUSTERS.forEach((cluster, at) => {
    const hub = { cluster: cluster.id, hub: true, ring: bigRings[at % 2], phase: 0.5 + (at / CLUSTERS.length) * TAU, period: HUB_PERIOD, size: 3.6 + at * 0.25, born: -1, from: ORIGIN, lit: 0, swell: -1, at: ORIGIN,
      own: { r: 0.25 + rand() * 0.05, tiltX: 0.95 + (rand() - 0.5) * 0.5, tiltZ: (rand() - 0.5) * 0.9, glow: 0, light: -1 } };
    hubs[cluster.id] = hub; nodes.push(hub);
    for (let n = 0; n < PER_CLUSTER; n += 1) {
      const sat = n < 6;
      nodes.push({ cluster: cluster.id, hub: false, order: n, phase: sat ? (n / 6) * TAU + rand() * 0.5 : rand() * TAU, period: sat ? 16 + rand() * 11 : 40 + rand() * 70, reach: sat ? 0.88 + rand() * 0.26 : 1,
        spec: sat ? null : { r: 0.05 + Math.pow(rand(), 0.8) * 0.4, tiltX: rand() * Math.PI, tiltZ: (rand() - 0.5) * Math.PI, glow: 0 },
        size: sat ? 1.6 + rand() * 1.1 : 0.5 + Math.pow(rand(), 2.2) * 1.5, tinted: sat || rand() < 0.3, born: -1, lit: 0, at: ORIGIN });
    }
  });
  const sky = []; for (let n = 0; n < 40; n += 1) sky.push({ x: (rand() - 0.5) * 3.4, y: (rand() - 0.5) * 2.2, z: (rand() - 0.5) * 3.4, size: 0.35 + rand() * 0.4, alpha: 0.1 + rand() * 0.18 });
  const centre = { cluster: 'centre', at: ORIGIN };
  const alias = (id) => (id === 'where' ? 'buys' : id);

  let root, canvas, ctx, logEl, pipe, stepEl, onDone = function () {};
  const state = { step: 0, still: matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]still\b/.test(location.search), angle: 0.6, t: 0, last: performance.now(), gather: null, colours: {}, light: false, shift: { x: 0, y: 0 }, restY: 0.42, running: false, open: false };
  const orb = { from: ORIGIN, ctrl: ORIGIN, to: 'centre', start: 0, dur: 1, at: ORIGIN, trail: [] };

  function readColours() {
    const style = getComputedStyle(root);
    const rgb = (name) => { const hex = style.getPropertyValue('--st-' + name).trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)); };
    ['ocean', 'teal', 'slate', 'orb'].forEach((name) => { state.colours[name] = rgb(name); });
    state.colours.white = rgb('ink');
    state.colours.muted = style.getPropertyValue('--st-muted').trim(); state.colours.ink = style.getPropertyValue('--st-ink').trim();
    state.light = style.getPropertyValue('--st-mode').trim() === 'light';
  }
  function fit() {
    if (!canvas) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function grow(id, share) {
    share = share == null ? 1 : share;
    const now = performance.now(); const hub = hubs[alias(id)];
    if (hub.born < 0) { hub.born = now; hub.from = Object.assign({}, orb.at); }
    const start = Math.max(now, hub.born + M.growMs * 0.55);
    nodes.filter((node) => !node.hub && node.cluster === hub.cluster && node.order < Math.max(6, Math.round(PER_CLUSTER * share))).forEach((node) => { if (node.born < 0) node.born = start + (node.order < 6 ? node.order * 90 : 300 + node.order * 10); });
  }
  function dock(id) { if (id === 'centre') return ORIGIN; const hub = hubs[alias(id)]; const out = Math.hypot(hub.at.x, hub.at.z) || 1; return { x: hub.at.x + (hub.at.x / out) * 0.1, y: hub.at.y - 0.1, z: hub.at.z + (hub.at.z / out) * 0.1 }; }
  function sendOrb(id) {
    const from = orb.at; const to = dock(id);
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, z: (from.z + to.z) / 2 }; const out = Math.hypot(mid.x, mid.z) || 1;
    orb.from = from; orb.ctrl = { x: mid.x + (mid.x / out) * 0.34, y: mid.y - 0.3, z: mid.z + (mid.z / out) * 0.34 }; orb.to = id; orb.start = performance.now(); orb.dur = state.still ? 1 : M.orbTravelMs;
  }
  function pulse(id) { const hub = hubs[alias(id)]; hub.swell = performance.now(); hub.own.light = performance.now(); }

  const CAMERA = 2.5; const PITCH = 0.3;
  function project(point, w, h, mobile) {
    const cos = Math.cos(state.angle); const sin = Math.sin(state.angle);
    const x = point.x * cos - point.z * sin; const z0 = point.x * sin + point.z * cos;
    const y = point.y * Math.cos(PITCH) - z0 * Math.sin(PITCH); const z = point.y * Math.sin(PITCH) + z0 * Math.cos(PITCH);
    const scale = mobile ? Math.min(w * 0.3, h * 0.17) : Math.min(w * 0.185, h * 0.31); const depth = CAMERA / (CAMERA + z);
    return { x: (mobile ? w * 0.5 : w * 0.715) + x * scale * depth + state.shift.x, y: (mobile ? h * 0.27 : h * 0.52) + y * scale * depth + state.shift.y, depth: depth, z: z };
  }
  const rgba = (rgb, a) => 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + Math.max(0, Math.min(1, a)) + ')';
  const mix = (rgb, to, k) => rgb.map((v, i) => Math.round(v + (to[i] - v) * k));
  function star(p, radius, rgb, alpha, glow) {
    glow = glow == null ? 1 : glow;
    if (alpha <= 0.01 || radius <= 0.05) return;
    if (radius > 0.9) {
      const halo = ctx.createRadialGradient(p.x, p.y, radius * 0.6, p.x, p.y, radius * 3);
      halo.addColorStop(0, rgba(rgb, 0.34 * alpha * glow)); halo.addColorStop(1, rgba(rgb, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p.x, p.y, radius * 3, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = rgba(state.light ? rgb : mix(rgb, [255, 255, 255], 0.55), alpha); ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, TAU); ctx.fill();
  }
  function ring(spec, centreAt, w, h, mobile, base, show, scale, lightAt) {
    scale = scale == null ? 1 : scale; lightAt = lightAt == null ? -1 : lightAt;
    if (show <= 0.02) return;
    const steps = 72; let last = project(ringPoint(spec, 0, centreAt, scale), w, h, mobile);
    for (let i = 1; i <= steps; i += 1) {
      const angle = (i / steps) * TAU; const next = project(ringPoint(spec, angle, centreAt, scale), w, h, mobile);
      const front = Math.max(0, Math.min(1, (next.depth - 0.72) / 0.5));
      let near = 0; if (lightAt >= 0) { const away = Math.abs(((angle - lightAt + Math.PI * 3) % TAU) - Math.PI); near = Math.max(0, 1 - away / 0.7); }
      ctx.strokeStyle = rgba(state.colours.slate, (base * (0.25 + 0.75 * front) + spec.glow * 0.22 * (0.4 + 0.6 * front)) * show);
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(next.x, next.y); ctx.stroke();
      if (near > 0) { ctx.strokeStyle = rgba(state.colours.ocean, 0.7 * near * show); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(next.x, next.y); ctx.stroke(); }
      last = next;
    }
  }

  function draw(now) {
    if (!state.open || document.hidden) { state.running = false; return; }
    const dt = Math.min(0.05, (now - state.last) / 1000); state.last = now;
    const w = innerWidth; const h = innerHeight; const mobile = w <= 720; const pace = (state.still ? M.stillFactor : 1) * (mobile ? 0.7 : 1);
    state.angle += (TAU / M.orbitSeconds) * dt * pace; state.t += dt * pace;
    const gather = state.gather === null ? 0 : easeInOut(Math.min(1, (now - state.gather) / (state.still ? 1 : M.gatherMs)));
    const grown = (node) => (node.born < 0 || now < node.born ? 0 : ease((now - node.born) / (state.still ? 1 : M.growMs)));
    nodes.forEach((hub) => { if (hub.hub) { hub.show = grown(hub); hub.at = lerp3(hub.from, ringPoint(hub.ring, hub.phase + (state.t / hub.period) * TAU, ORIGIN), hub.show); } });
    const fits = hubs.fits;
    const goalY = state.step >= 5 ? 0.2 : 0.3; state.restY += (goalY - state.restY) * (state.still ? 1 : Math.min(1, dt * 2.5)); const others = mobile ? 1 - gather : 1;
    state.shift = { x: 0, y: 0 }; if (mobile && gather > 0) { const raw = project(fits.at, w, h, mobile); state.shift = { x: (w * 0.5 - raw.x) * gather, y: (h * state.restY - raw.y) * gather }; }
    nodes.forEach((node) => {
      if (node.hub) return;
      const hub = hubs[node.cluster]; node.show = grown(node); const path = node.spec || hub.own;
      const pull = node.cluster === 'fits' ? 0 : gather; const angle = node.phase + (state.t / node.period) * TAU + pull * pull * 9;
      const own = ringPoint(path, angle, hub.at, node.reach * node.show * (1 - 0.45 * pull));
      const toward = ringPoint(node.spec || fits.own, angle, fits.at, node.reach * (mobile ? 1.5 : 0.62));
      node.at = { x: own.x + (toward.x - own.x) * pull, y: own.y + (toward.y - own.y) * pull, z: own.z + (toward.z - own.z) * pull };
    });
    const travel = Math.min(1, (now - orb.start) / orb.dur); const k = easeInOut(travel); const to = dock(orb.to); const u = 1 - k;
    orb.at = { x: u * u * orb.from.x + 2 * u * k * orb.ctrl.x + k * k * to.x, y: u * u * orb.from.y + 2 * u * k * orb.ctrl.y + k * k * to.y, z: u * u * orb.from.z + 2 * u * k * orb.ctrl.z + k * k * to.z };
    const breath = state.still ? 0 : Math.sin((now / M.breathMs) * TAU);
    const o = project(orb.at, w, h, mobile);
    if (!state.still && travel < 1) orb.trail.push({ x: orb.at.x, y: orb.at.y, z: orb.at.z, born: now });
    orb.trail = orb.trail.filter((dot) => now - dot.born < M.trailMs);

    ctx.clearRect(0, 0, w, h);
    sky.forEach((dot) => { const p = project(dot, w, h, mobile); ctx.fillStyle = rgba(state.colours.white, dot.alpha * Math.min(1, p.depth)); ctx.beginPath(); ctx.arc(p.x, p.y, dot.size, 0, TAU); ctx.fill(); });
    bigRings.forEach((spec) => { spec.glow = Math.max(0, spec.glow - dt * 0.6); if (travel < 1) spec.glow = Math.min(1, spec.glow + dt * 1.6); ring(spec, ORIGIN, w, h, mobile, state.light ? 0.16 : 0.1, others); });
    nodes.forEach((hub) => {
      if (!hub.hub) return;
      const p = project(hub.at, w, h, mobile); const closeness = Math.max(0, 1 - Math.hypot(p.x - o.x, p.y - o.y) / 150);
      hub.own.glow = Math.max(hub.own.glow - dt * 0.5, closeness);
      const since = hub.own.light < 0 ? -1 : (now - hub.own.light) / M.ringLightMs;
      ring(hub.own, hub.at, w, h, mobile, (state.light ? 0.2 : 0.13) * (mobile ? 0.7 : 1), hub.show * (hub.cluster === 'fits' ? 1 : (1 - 0.8 * gather) * others), 1, since >= 0 && since < 1 ? ease(since) * TAU + hub.phase : -1);
    });
    orb.trail.forEach((dot) => { const p = project(dot, w, h, mobile); const age = (now - dot.born) / M.trailMs; ctx.fillStyle = rgba(state.colours.orb, 0.5 * Math.pow(1 - age, 2)); ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 * (1 - age * 0.6) * p.depth, 0, TAU); ctx.fill(); });

    const shown = nodes.filter((node) => node.show > 0.02 && (node.hub || !mobile || node.order < 6 || node.order % 2 === 0)).map((node) => ({ node: node, p: project(node.at, w, h, mobile) })).sort((a, b) => b.p.z - a.p.z);
    shown.forEach(({ node, p }) => {
      const cluster = CLUSTERS.find((item) => item.id === node.cluster);
      const tint = (node.hub || node.tinted) ? state.colours[cluster.tint] : state.colours.white;
      const nearOrb = Math.max(0, 1 - Math.hypot(p.x - o.x, p.y - o.y) / 130);
      node.lit = Math.max(node.lit - dt * 0.15, nearOrb);
      const swell = node.hub && node.swell >= 0 && now - node.swell < M.swellMs ? Math.sin(((now - node.swell) / M.swellMs) * Math.PI) * 0.5 : 0;
      const arrive = node.hub && node.show > 0 && node.show < 1 ? Math.sin(node.show * Math.PI) * 0.6 : 0;
      const fade = node.cluster === 'fits' ? 1 : node.hub ? (1 - 0.5 * gather) * others : mobile && node.order % 4 !== 0 ? 1 - gather : 1;
      const isFit = node.cluster === 'fits'; const depthLight = Math.max(0.12, Math.min(1, 0.1 + (p.depth - 0.68) * 1.5));
      const radius = node.size * Math.min(2.4, p.depth * p.depth) * node.show * (1 + swell + arrive + (node.hub && isFit ? gather * (mobile ? 0.6 : 1.3) : 0)) * (mobile ? (node.hub ? 1.25 : 1.1) : 1);
      if (node.hub) node.radius = radius;
      star(p, radius, mix(tint, state.colours.orb, node.lit * 0.6), Math.min(1, (depthLight + node.lit * 0.4 + (isFit ? gather * (mobile ? 0.15 : 0.5) : 0)) * fade), 1 + node.lit + (node.hub ? 0.6 + arrive * 2 : 0) + (isFit ? gather * (mobile ? (node.hub ? 0.8 : 0) : node.hub ? 2.4 : 1) : 0));
    });
    ctx.font = '500 ' + (mobile ? 11 : 12) + 'px InterO, Inter, system-ui, sans-serif'; ctx.textBaseline = 'middle';
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const boxes = [{ x: o.x - 20, y: o.y - 20, w: 74, h: 40 }];
    const places = CLUSTERS.map((cluster) => ({ cluster: cluster, hub: hubs[cluster.id], p: project(hubs[cluster.id].at, w, h, mobile) })).filter((item) => item.hub.show > 0.5);
    places.forEach(({ p }) => boxes.push({ x: p.x - 9, y: p.y - 9, w: 18, h: 18 }));
    places.forEach(({ cluster, hub, p }) => {
      const tw = ctx.measureText(cluster.label).width; const gap = (hub.radius || 4) + 10 + (hub.cluster === 'fits' ? gather * 62 : 0);
      const spots = [{ x: p.x + gap, y: p.y }, { x: p.x - gap - tw, y: p.y }, { x: p.x - tw / 2, y: p.y + gap + 8 }, { x: p.x - tw / 2, y: p.y - gap - 8 }, { x: p.x + gap, y: p.y + 22 }, { x: p.x - gap - tw, y: p.y - 22 }];
      const pick = spots.map((spot) => ({ x: spot.x - 4, y: spot.y - 9, w: tw + 8, h: 18 })).find((box) => box.x > 4 && box.x + box.w < w - 4 && !boxes.some((other) => hit(box, other)));
      if (!pick) return;
      boxes.push(pick); ctx.globalAlpha = Math.min(1, (hub.show - 0.5) * 2) * (hub.cluster === 'fits' ? 1 : (1 - 0.4 * gather) * others); ctx.fillStyle = hub.cluster === 'fits' && gather > 0.5 ? state.colours.ink : state.colours.muted; ctx.fillText(cluster.label, pick.x + 4, pick.y + 9);
    });
    ctx.globalAlpha = 1;
    const core = (mobile ? 3.6 : 4.4) * o.depth;
    const halo = ctx.createRadialGradient(o.x, o.y, core * 0.5, o.x, o.y, core * 5.5);
    halo.addColorStop(0, rgba(state.colours.orb, 0.55 + breath * 0.1)); halo.addColorStop(1, rgba(state.colours.orb, 0));
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(o.x, o.y, core * 5.5, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(state.light ? state.colours.orb : mix(state.colours.orb, [255, 255, 255], 0.7), 1); ctx.beginPath(); ctx.arc(o.x, o.y, core, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(state.colours.orb, 0.75); ctx.beginPath(); ctx.arc(o.x, o.y, core * (2.7 + breath * 0.18), 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = rgba(state.colours.orb, 0.28); ctx.beginPath(); ctx.arc(o.x, o.y, core * (3.9 + breath * 0.3), 0, TAU); ctx.stroke();
    ctx.font = '600 11px InterO, Inter, system-ui, sans-serif'; ctx.fillStyle = state.colours.ink; ctx.fillText('Orb', o.x + core * 4.6, o.y); ctx.textBaseline = 'alphabetic';
    requestAnimationFrame(draw);
  }
  function loop() { if (state.running || !state.open) return; state.running = true; state.last = performance.now(); requestAnimationFrame(draw); }

  // The log: each line types itself out. Only steps the real product performs.
  let queue = Promise.resolve(); let run = 0;
  function say(lines) {
    const mine = run;
    lines.forEach((text) => {
      queue = queue.then(() => new Promise((done) => {
        if (mine !== run) return done();
        const p = document.createElement('p'); if (text.charAt(0) === '>') p.className = 'cmd'; logEl.appendChild(p);
        while (logEl.children.length > 7) logEl.removeChild(logEl.firstChild);
        if (state.still || fast) { p.textContent = text; return setTimeout(done, fast ? 10 : 60); }
        let at = 0; const tick = () => { if (mine !== run) return done(); p.textContent = text.slice(0, (at += 1)); if (at < text.length) setTimeout(tick, M.typeMs); else setTimeout(done, M.lineGapMs); }; tick();
      }));
    });
  }
  function paintPipe(at) { pipe.innerHTML = STEPS.map((name, i) => '<li class="' + (i < at ? 'done' : i === at ? 'now' : '') + '">' + name + '<span class="sr">' + (i < at ? ', done' : i === at ? ', now' : '') + '</span></li>').join(''); }

  const answers = { sell: new Set(), buys: new Set(), use: new Set(), goal: '', plan: 'Pro, $99 a month' };
  const chip = (group, label, hint) => {
    const on = answers[group] instanceof Set ? answers[group].has(label) : answers[group] === label;
    return '<button type="button" class="chip" data-group="' + group + '" data-label="' + esc(label) + '" aria-pressed="' + on + '"><b>' + esc(label) + '</b>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</button>';
  };
  const fitBadge = (fit) => fit === 'strong' ? '<em class="good">Strong fit</em>' : '<em class="possible">Possible fit</em>';
  const SCREENS = [
    () => '<p class="eyebrow">Step 1 of 5</p><h1>Do you have a website? Orb can read it first, so you type less.</h1><p class="why">Orb reads your own words first, so it never guesses.</p>' +
      '<label for="st-site">Your website</label><input id="st-site" type="url" inputmode="url" autocomplete="url" value="' + esc(D.ME.site) + '" spellcheck="false">' +
      '<div class="actions"><button type="button" class="go" data-next="read">Read my site</button><button type="button" class="quiet" data-next="skip">I do not have one yet</button></div>' +
      '<p class="note">In the sample, Orb reads a made up site. Nothing is sent to anyone.</p>',
    () => '<p class="eyebrow">Step 2 of 5</p><h1>What do you sell?</h1><p class="why">This is the first thing a good match needs. Pick what is true. Choices marked From your site came from your own pages.</p>' +
      '<div class="chips">' + D.ONBOARD.sell.map((c) => chip('sell', c.label, c.site ? 'From your site' : '')).join('') + '</div>' +
      '<div class="actions"><button type="button" class="go" data-next="go">Next</button><button type="button" class="quiet" data-next="back">Back</button></div>',
    () => '<p class="eyebrow">Step 3 of 5</p><h1>Who buys it?</h1><p class="why">Orb looks for businesses like these, near where you work.</p>' +
      '<div class="chips">' + D.ONBOARD.buys.map((c) => chip('buys', c.label, c.site ? 'From your site' : '')).join('') + '</div>' +
      '<div class="actions"><button type="button" class="go" data-next="go">Next</button><button type="button" class="quiet" data-next="back">Back</button></div>',
    () => '<p class="eyebrow">Step 4 of 5</p><h1>How do you want to use orblo, and what would make it a win?</h1><p class="why">So Orb puts the right thing first each morning.</p>' +
      '<div class="chips">' + D.ONBOARD.use.map((c) => chip('use', c)).join('') + '</div>' +
      '<p class="label">In the next 90 days</p><div class="chips">' + D.ONBOARD.goal.map((c) => chip('goal', c)).join('') + '</div>' +
      '<div class="actions"><button type="button" class="go" data-next="go">Find good fits</button><button type="button" class="quiet" data-next="back">Back</button></div>',
    () => '<p class="eyebrow">Building your first results</p><h1>Orb is finding where your circle and theirs overlap.</h1><p class="why">Your first companies, each with the reason it fits. The email and the DM wait until you send them.</p>',
    () => '<p class="eyebrow">Ready</p><h1>Your first good fits.</h1><p class="note">Sample. Every name here is made up.</p>' +
      '<div class="fits">' + D.FOUND.filter((f) => f.fit).map((f) => '<div class="fit"><b>' + esc(f.name) + '</b><span>' + esc(f.signals[0].text) + '. Seen in ' + (f.signals[0].kind === 'Their site' ? 'their own news' : f.signals[0].kind === 'City licence' ? 'a city licence' : f.signals[0].kind === 'Job post' ? 'a job post' : 'local news') + '.</span>' + fitBadge(f.fit) + '</div>').join('') + '</div>' +
      '<p class="label">Start a 7 day free trial</p><div class="chips">' + chip('plan', 'Solo, $49 a month') + chip('plan', 'Pro, $99 a month', 'Most popular') + chip('plan', 'Team, $199 a month') + '</div>' +
      '<div class="actions"><button type="button" class="go" data-next="trial">Start my 7 day free trial</button><button type="button" class="quiet" data-next="look">Look around first</button></div>' +
      '<p class="note">Card required in the real app. Nothing goes out until you send it yourself.</p>'
  ];
  let timer = 0;
  function show(at) {
    state.step = at; stepEl.classList.add('leaving'); clearTimeout(timer);
    setTimeout(() => {
      stepEl.innerHTML = SCREENS[at](); stepEl.classList.remove('leaving');
      const h = stepEl.querySelector('h1'); h.tabIndex = -1; h.focus({ preventScroll: true });
    }, state.still || fast ? 0 : 280);
    paintPipe(Math.min(at, 3) + (at >= 5 ? 1 : 0));
    if (at === 0) { sendOrb('centre'); say(['> waiting for your website']); }
    if (at === 1) { grow('sell', 0.4); sendOrb('sell'); say(['> working out what you sell', 'marked: 3 choices from your site']); }
    if (at === 2) { grow('buys', 0.4); grow('where', 0.4); sendOrb('buys'); say(['> narrowing who buys', 'marked: 3 choices from your site']); }
    if (at === 3) { sendOrb('where'); say(['> noting how you want to work']); }
    if (at === 4) {
      CLUSTERS.forEach((c) => grow(c.id)); sendOrb('fits'); state.gather = performance.now();
      say(D.ONBOARD.buildLog);
      timer = setTimeout(() => show(5), state.still || fast ? 900 : 8000);
    }
    if (at === 5) { sendOrb('fits'); say(['> ready. you send, never Orb']); }
  }
  // Choices marked From your site start picked, the way the real welcome marks them.
  function preselect() {
    D.ONBOARD.sell.forEach((c) => { if (c.site) answers.sell.add(c.label); });
    D.ONBOARD.buys.forEach((c) => { if (c.site) answers.buys.add(c.label); });
    answers.use.add('Find new customers'); answers.goal = 'My first customers';
  }
  function onClick(event) {
    const pick = event.target.closest('.chip'); const next = event.target.closest('[data-next]');
    if (pick) {
      const group = pick.getAttribute('data-group'); const label = pick.getAttribute('data-label');
      if (answers[group] instanceof Set) { if (answers[group].has(label)) answers[group].delete(label); else answers[group].add(label); pick.setAttribute('aria-pressed', String(answers[group].has(label))); }
      else { answers[group] = label; stepEl.querySelectorAll('[data-group="' + group + '"]').forEach((item) => item.setAttribute('aria-pressed', String(item === pick))); }
      const target = { sell: 'sell', buys: label.indexOf('Near') === 0 ? 'where' : 'buys', use: 'where', goal: 'fits' }[group];
      if (target && pick.getAttribute('aria-pressed') === 'true') { grow(target, Math.min(1, 0.4 + 0.2 * ((answers[group].size) || 1))); if (!state.still) pulse(target); }
    }
    if (!next) return;
    const kind = next.getAttribute('data-next');
    if (kind === 'back') return show(state.step - 1);
    if (kind === 'read') {
      next.disabled = true; grow('site'); sendOrb('site'); say(D.ONBOARD.readLog); preselect();
      timer = setTimeout(() => show(1), state.still || fast ? 600 : 5000); return;
    }
    if (kind === 'skip') { say(['> no website. asking instead']); return show(1); }
    if (kind === 'trial' || kind === 'look') {
      say([kind === 'trial' ? '> checkout is not part of the sample' : '> opening Today. fits saved']);
      return setTimeout(() => onDone(kind), fast ? 50 : 700);
    }
    show(state.step + 1);
  }

  function mount(el, done) {
    root = el; onDone = done || onDone;
    root.innerHTML = '<canvas aria-hidden="true"></canvas>' +
      '<header class="st-brand st-veil"><b>orbl<i>o</i></b><span>Your business, taking shape</span>' +
      '<div class="st-legend" aria-hidden="true"><span><i class="l-ocean"></i>What you sell</span><span><i class="l-teal"></i>Your site and good fits</span><span><i class="l-slate"></i>Who buys</span></div></header>' +
      '<div class="st-bar" role="group" aria-label="Sample controls"><span class="st-tag">Sample</span><span class="st-step">Step 1 of 7: Onboarding</span><button type="button" class="st-theme" data-act="theme">Light or dark</button><a class="st-skip" href="#/today">Skip for now</a></div>' +
      '<aside class="st-log st-veil" aria-live="polite"><h2>Orb, working</h2><div class="st-lines"></div></aside>' +
      '<p class="st-thesis st-veil">orb should learn your business, not guess it.</p>' +
      '<ol class="st-pipe st-veil" aria-label="Progress"></ol>' +
      '<main class="st-panel st-veil" id="stage-main"><div class="st-step-body"></div></main>';
    canvas = root.querySelector('canvas'); ctx = canvas.getContext('2d');
    logEl = root.querySelector('.st-lines'); pipe = root.querySelector('.st-pipe'); stepEl = root.querySelector('.st-step-body');
    stepEl.addEventListener('click', onClick);
    addEventListener('resize', fit);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });
  }
  function open() {
    state.open = true; fit(); readColours();
    if (!logEl.children.length) show(0);
    loop();
  }
  function close() { state.open = false; clearTimeout(timer); }
  function restart() {
    run += 1; queue = Promise.resolve(); clearTimeout(timer); logEl.innerHTML = '';
    nodes.forEach((node) => { node.born = -1; node.lit = 0; }); orb.at = ORIGIN; orb.trail = []; state.gather = null;
    answers.sell.clear(); answers.buys.clear(); answers.use.clear(); answers.goal = '';
    if (state.open) show(0);
  }
  return { mount: mount, open: open, close: close, restart: restart, recolour: function () { if (root) readColours(); } };
})();
