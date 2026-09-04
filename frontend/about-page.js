/* About page: threads explorer, illustrative journey trail, verify spotlight,
   fee calculator, background depth field, scroll reveal. Plain JS, no
   framework — rebuilt from the Claude Design export to match this site's
   actual architecture (see about-journey-notes.md for the journey component
   list). Self-initializing and safe to load on every page: every function
   bails out immediately if the About view's DOM isn't present, and PSAboutInit
   is idempotent, so it can be called again after client-side navigation. */
(function () {
  "use strict";

  var THREADS = [
    { n: '01', label: 'Outreach', sub: 'Getting in front of someone',
      old: { h: 'A DM into an inbox that never replies', p: 'You find someone whose audience fits, you write the message, you wait. There is no price, no availability, no way to know whether they take sponsorships at all. Most of the effort goes into finding out whether there was ever an offer.', bullets: ['No stated price, so every conversation starts from zero', 'No way to tell an open slot from a closed one', 'The whole thing lives in one person’s unread inbox'], fact: 'There was nothing published to respond to.' },
      neu: { h: 'A public listing, priced and readable', p: 'A platform owner publishes what they actually offer: the format, the audience, the price. A business reads it and either funds it or doesn’t. The negotiation starts once both sides can see the facts.', bullets: ['Terms are written and accepted by both sides before funding', 'Ownership of the platform is verified before it can transact', 'Nothing is agreed verbally after the deal is funded'], fact: 'Ownership is verified up front, as a condition of transacting.' },
      revealLead: 'Every listing carries the same structural information, so two listings can be compared without a call.',
      revealHead: 'Before a listing can take a funded deal',
      revealRows: [{ k: 'Platform ownership', v: 'Verified' }, { k: 'Terms', v: 'Written, accepted by both' }, { k: 'Price', v: 'Stated up front' }, { k: 'Listing fee', v: 'None' }] },
    { n: '02', label: 'Trust', sub: 'Knowing who you’re dealing with',
      old: { h: 'You take their word for the audience', p: 'A screenshot of a dashboard, a number in a media kit, a confident reply. There is no way to check whether the person selling the audience is the person who owns it, and you usually find out the answer after paying.', bullets: ['Self-reported figures with no named source screen', 'No check that the seller controls the channel', 'Disputes resolved by whoever pushes hardest'], fact: 'Nothing in that process happens before the money.' },
      neu: { h: 'Ownership verified before anything transacts', p: 'A platform owner proves control of the channel before their listing can take a funded deal. That check happens before the first transaction. And every figure that later decides a payment has to name the screen it was read from.', bullets: ['Verification happens before the first transaction', 'Deciding figures are tied to a named, dated screen', 'Completed deals stay attached to the same verified profile'], fact: 'We verify ownership. We do not verify performance claims a platform makes about itself between deals.' },
      revealLead: 'Verification is deliberately narrow. It is better to be exact about a small guarantee than vague about a large one.',
      revealHead: 'Scope of verification',
      revealRows: [{ k: 'Platform ownership', v: 'Checked before transacting' }, { k: 'Submitted evidence', v: 'Checked by a person' }, { k: 'Self-reported reach', v: 'Not verified' }, { k: 'Commercial outcome', v: 'Not guaranteed' }] },
    { n: '03', label: 'Payment', sub: 'Who holds the money, and when',
      old: { h: 'Somebody has to go first, and lose', p: 'Either the business pays upfront and hopes the post goes live, or the creator delivers and chases an invoice for sixty days. The risk doesn’t disappear in either version. It gets assigned to whoever has less leverage.', bullets: ['Pay first and hope, or work first and chase', 'No neutral party holding anything', 'A dispute is two people and no record'], fact: 'The default arrangement always advantages the larger side.' },
      neu: { h: 'Funds held in escrow from the moment it’s funded', p: 'The buyer funds the deal and the money leaves their account immediately, but it doesn’t reach the seller. It’s held. It is released only once a human reviewer has checked submitted evidence against the terms both sides agreed.', bullets: ['Money is committed before work starts, so nobody works on a promise', 'Money is unavailable to the seller until evidence is checked', 'Only two outcomes: released to the seller, or returned to the buyer'], fact: 'Nobody pays on a promise, and nobody works on one either.' },
      revealLead: 'Escrow answers the question of who goes first. The money does.',
      revealHead: 'States funds can be in',
      revealRows: [{ k: 'Held', v: 'Funded · unavailable to both' }, { k: 'Released', v: 'Evidence matched terms' }, { k: 'Returned', v: 'Terms not met' }, { k: 'Any other state', v: 'None' }] },
    { n: '04', label: 'Proof', sub: 'What counts as delivered',
      old: { h: '"It went well", plus a screenshot in a DM', p: 'Delivery is confirmed by the person who was paid to deliver it. Whatever was actually agreed lives in a scroll-back somewhere, and whether it happened is a matter of two memories that rarely match.', bullets: ['Delivery confirmed by the party with the incentive', 'Agreed scope stored in a chat log, if anywhere', 'A number with no screen behind it counts as proof'], fact: 'Nothing in that chain is checkable by an outsider.' },
      neu: { h: 'Evidence, read by a person, against the terms', p: 'The seller submits proof: a live link, a dated screenshot of a named analytics screen, figures tied to the specific term they prove. A reviewer reads it against what was agreed and answers one question, whether the two match.', bullets: ['Every deciding figure names the screen it came from', 'A human reads the evidence, not an automated match', 'If it looks incomplete, the seller gets 24 hours to complete it'], fact: 'The 24-hour window exists because a missing upload is usually an oversight.' },
      revealLead: 'The grace window surprises people. It exists because an admin error and bad faith look identical for the first day.',
      revealHead: 'When evidence looks incomplete',
      revealRows: [{ k: 'First response', v: '24-hour grace window' }, { k: 'What happens then', v: 'Seller completes the evidence' }, { k: 'If still unmet', v: 'Funds return to buyer' }, { k: 'Instant penalty', v: 'No' }] },
    { n: '05', label: 'Cost', sub: 'What it takes off the top',
      old: { h: 'A retainer before anyone agreed anything', p: 'An agency fee, a platform subscription, a listing charge. Money leaving before a single deal exists. You pay for access to the possibility of work, which means the middle takes its cut whether or not anything gets delivered.', bullets: ['Paid monthly regardless of deals done', 'The intermediary earns whether or not work lands', 'Real rates hidden behind a rate card nobody charges'], fact: 'The incentive is to keep you subscribed.' },
      neu: { h: '5% and 10%, per completed deal. Nothing else.', p: 'A 5% buyer protection fee and a 10% seller fee, charged on deals that complete. No subscription. No listing fee. Nobody pays to sit on the marketplace waiting for something to happen.', bullets: ['No subscription, so sitting on the platform costs nothing', 'No listing fee, so publishing costs nothing', 'Fees apply per completed deal, so the incentive is delivery'], fact: 'We only get paid when a deal completes and the evidence checks out.' },
      revealLead: 'Both sides can see the full fee sheet before funding. There is no fourth line.',
      revealHead: 'The entire fee sheet',
      revealRows: [{ k: 'Subscription', v: 'None' }, { k: 'Listing fee', v: 'None' }, { k: 'Buyer protection fee', v: '5%' }, { k: 'Seller fee', v: '10%' }] }
  ];

  var BEATS = [
    { title: 'Profile created', cap: 'the starting point, nothing to prove yet', ml: 0, rule: 24, size: 24 },
    { title: 'First listing live', cap: 'what you offer, priced and public', ml: 44, rule: 44, size: 30 },
    { title: 'First deal funded', cap: 'terms agreed, payment held', ml: 104, rule: 66, size: 37 },
    { title: 'Delivery verified', cap: 'evidence checked against the terms', ml: 168, rule: 92, size: 45 },
    { title: 'Repeat partner', cap: 'someone comes back on purpose', ml: 246, rule: 120, size: 54 },
    { title: 'Known in category', cap: 'the record speaks before you do', ml: 340, rule: 150, size: 65, italic: true }
  ];

  // 17 real images extracted from the design export, named in /img/about/bg-01..17.webp.
  // Depth (1=furthest back/smallest, 3=closest/biggest) preserved from the original layout.
  var BG_TILES = [
    { src: '/img/about/bg-01.webp', d: 3 }, { src: '/img/about/bg-02.webp', d: 2 },
    { src: '/img/about/bg-03.webp', d: 3 }, { src: '/img/about/bg-04.webp', d: 1 },
    { src: '/img/about/bg-05.webp', d: 3 }, { src: '/img/about/bg-06.webp', d: 2 },
    { src: '/img/about/bg-07.webp', d: 3 }, { src: '/img/about/bg-08.webp', d: 2 },
    { src: '/img/about/bg-09.webp', d: 2 }, { src: '/img/about/bg-10.webp', d: 3 },
    { src: '/img/about/bg-11.webp', d: 1 }, { src: '/img/about/bg-12.webp', d: 3 },
    { src: '/img/about/bg-13.webp', d: 1 }, { src: '/img/about/bg-14.webp', d: 3 },
    { src: '/img/about/bg-15.webp', d: 2 }, { src: '/img/about/bg-16.webp', d: 3 },
    { src: '/img/about/bg-17.webp', d: 1 }
  ];
  var DEPTH = {
    1: { blur: '2.6px', op: .5, scale: .9, shift: -.05, shadow: '0 4px 14px rgba(20,39,63,.06)', w: 11.5 },
    2: { blur: '1.2px', op: .72, scale: .96, shift: -.14, shadow: '0 12px 30px rgba(20,39,63,.09)', w: 17.5 },
    3: { blur: '0.4px', op: .7, scale: 1, shift: -.28, shadow: '0 26px 56px rgba(20,39,63,.12)', w: 25.5 }
  };
  // 17 tiles packed 5/4/4/4 across 4 shelves, depths mixed per row so nothing of
  // the same size stacks in a column.
  var SHELVES = [[3, 1, 2, 3, 1], [3, 2, 3, 2], [3, 1, 3, 1], [2, 3, 1, 3]];
  var VJ = [.42, .66, .3, .58, .7, .34, .62, .46, .74, .38, .54, .26, .68, .5, .36, .72, .44];

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function gbp(n) { return Math.round(n).toLocaleString('en-GB'); }

  var STATE = { i: 0, side: 'new', deal: 750, locked: 0, tick: 0 };

  // ---------------------------------------------------------------------
  // Background depth field
  // ---------------------------------------------------------------------
  function buildBgField() {
    var field = qs('#ajBgField');
    if (!field || field.getAttribute('data-built') === '1') return;
    field.setAttribute('data-built', '1');
    var frac = 0, cx = 0, shelfH = 100 / SHELVES.length;
    var tiles = [];
    var ti = 0;
    SHELVES.forEach(function (row, ri) {
      var used = 0;
      row.forEach(function (d) { used += DEPTH[d].w; });
      var gap = (100 - used) / (row.length + 1);
      var x = gap;
      row.forEach(function (d) {
        var wpct = DEPTH[d].w;
        var h = wpct * 0.75 * 1.7;
        var slack = Math.max(0, shelfH - h);
        var k = tiles.length;
        tiles.push({ d: d, x: x, t: ri * shelfH + slack * VJ[k % VJ.length] });
        x += wpct + gap;
        ti++;
      });
    });
    tiles.forEach(function (t, k) {
      var tile = BG_TILES[k];
      if (!tile) return;
      var d = DEPTH[t.d];
      var wrap = document.createElement('div');
      wrap.setAttribute('data-bg-layer', String(t.d));
      wrap.style.position = 'absolute';
      wrap.style.left = t.x.toFixed(2) + '%';
      wrap.style.top = t.t.toFixed(2) + '%';
      wrap.style.width = DEPTH[t.d].w.toFixed(2) + '%';
      wrap.style.aspectRatio = '4/3';
      wrap.style.borderRadius = (6 + t.d * 3) + 'px';
      wrap.style.overflow = 'hidden';
      wrap.style.background = '#fff';
      wrap.style.border = '1px solid rgba(20,39,63,.09)';
      wrap.style.boxShadow = d.shadow;
      wrap.style.zIndex = String(t.d);
      wrap.style.opacity = String(d.op);
      wrap.style.filter = 'blur(' + d.blur + ')';
      wrap.style.willChange = 'transform';
      wrap.style.transform = 'translate3d(0,0,0) scale(' + d.scale + ')';
      var img = document.createElement('img');
      img.src = tile.src;
      img.alt = '';
      img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
      wrap.appendChild(img);
      field.appendChild(wrap);
    });
  }

  function updateBgParallax() {
    var field = qs('#ajBgField');
    if (!field) return;
    var header = qs('#about-hero');
    if (!header) return;
    var r = header.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    var hy = (r.top + r.height / 2) - vh / 2;
    qsa('[data-bg-layer]', field).forEach(function (el) {
      var d = DEPTH[+el.getAttribute('data-bg-layer')];
      var scale = d.scale;
      el.style.transform = 'translate3d(0,' + (hy * d.shift).toFixed(1) + 'px,0) scale(' + scale + ')';
    });
  }

  // ---------------------------------------------------------------------
  // Thread explorer (Pick a thread, pull it)
  // ---------------------------------------------------------------------
  function renderThreads() {
    var root = qs('#ps-threads');
    if (!root) return;
    var i = STATE.i, isNew = STATE.side === 'new';
    var t = THREADS[i];
    var side = isNew ? t.neu : t.old;

    qs('#ajThreadN', root).textContent = t.n;
    qs('#ajThreadLabel', root).textContent = t.label;
    qs('#ajThreadNSmall', root).textContent = String(i + 1);
    qs('#ajProgBar', root).style.width = ((i + 1) / 5 * 100) + '%';

    var oldBtn = qs('#ajOldBtn', root), newBtn = qs('#ajNewBtn', root);
    [oldBtn, newBtn].forEach(function (b) {
      b.style.cssText = 'border:0;padding:8px 15px;border-radius:99px;font-size:13px;font-weight:700;transition:all .18s cubic-bezier(.22,1,.36,1)';
    });
    oldBtn.style.background = isNew ? 'transparent' : '#fff';
    oldBtn.style.color = isNew ? '#5f6e85' : '#14273f';
    oldBtn.style.boxShadow = isNew ? 'none' : '0 1px 2px rgba(15,23,42,.1)';
    newBtn.style.background = isNew ? '#4f46e5' : 'transparent';
    newBtn.style.color = isNew ? '#fff' : '#5f6e85';
    newBtn.style.boxShadow = isNew ? '0 2px 8px rgba(67,56,202,.28)' : 'none';

    var nav = qs('#ajNav', root);
    nav.innerHTML = '';
    THREADS.forEach(function (th, k) {
      var active = k === i, done = k < i;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = 'display:flex;align-items:center;gap:12px;text-align:left;padding:14px;min-height:56px;border-radius:12px;width:100%;transition:all .18s cubic-bezier(.22,1,.36,1);border:1px solid ' + (active ? '#c7d2fe' : 'transparent') + ';background:' + (active ? '#eef2ff' : 'transparent');
      btn.innerHTML = '<span style="display:grid;place-items:center;width:26px;height:26px;flex:none;border-radius:8px;font-size:11.5px;font-weight:800;background:' + (active ? '#4f46e5' : done ? '#c7d2fe' : '#f2f4f7') + ';color:' + (active ? '#fff' : done ? '#4338ca' : '#8291a6') + '">' + th.n + '</span>' +
        '<span style="display:block;min-width:0">' +
        '<span style="display:block;font-size:14.5px;font-weight:700;color:' + (active ? '#14273f' : done ? '#3a4658' : '#5f6e85') + '">' + th.label + '</span>' +
        '<span style="display:block;font-size:12px;font-weight:600;margin-top:2px;color:' + (active ? '#4338ca' : '#5f6e85') + '">' + th.sub + '</span></span>';
      btn.addEventListener('click', function () { STATE.i = k; STATE.tick++; renderThreads(); });
      nav.appendChild(btn);
    });

    qs('#ajSideKicker', root).textContent = isNew ? 'On PromoSlot' : 'The old way';
    qs('#ajSideKicker', root).style.color = isNew ? '#4338ca' : '#8291a6';
    var h3 = qs('#ajSideH', root);
    h3.textContent = side.h;
    h3.style.color = isNew ? '#14273f' : '#5f6e85';
    qs('#ajSideP', root).textContent = side.p;

    var bullets = qs('#ajSideBullets', root);
    bullets.innerHTML = '';
    side.bullets.forEach(function (b) {
      var li = document.createElement('li');
      li.style.cssText = 'position:relative;padding-left:24px;font-size:14.5px;line-height:1.6;color:#3a4658';
      li.innerHTML = '<span style="position:absolute;left:0;font-weight:700;color:' + (isNew ? '#4338ca' : '#8291a6') + '">' + (isNew ? '✓' : '–') + '</span>' + b;
      bullets.appendChild(li);
    });

    var fact = qs('#ajSideFact', root);
    fact.textContent = side.fact;
    fact.style.background = isNew ? '#eef2ff' : '#f2f4f7';
    fact.style.border = '1px solid ' + (isNew ? '#c7d2fe' : '#d9dfe8');
    fact.style.color = isNew ? '#4338ca' : '#5f6e85';

    qs('#ajRevealLead', root).textContent = t.revealLead;
    qs('#ajRevealHead', root).textContent = t.revealHead;
    var rows = qs('#ajRevealRows', root);
    rows.innerHTML = '';
    t.revealRows.forEach(function (r) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;gap:18px;padding:12px 15px;border-top:1px solid #e9edf2;font-size:14px;line-height:1.55;color:#3a4658';
      row.innerHTML = '<span style="color:#5f6e85">' + r.k + '</span><b style="font-weight:700;text-align:right;color:#14273f">' + r.v + '</b>';
      rows.appendChild(row);
    });

    qs('#ajNextBtn', root).textContent = (i === 4 ? 'Back to the start' : 'Next thread') + ' →';
  }

  function bindThreads() {
    var root = qs('#ps-threads');
    if (!root || root.getAttribute('data-bound') === '1') return;
    root.setAttribute('data-bound', '1');
    qs('#ajOldBtn', root).addEventListener('click', function () { STATE.side = 'old'; STATE.tick++; renderThreads(); });
    qs('#ajNewBtn', root).addEventListener('click', function () { STATE.side = 'new'; STATE.tick++; renderThreads(); });
    qs('#ajPrevBtn', root).addEventListener('click', function () { STATE.i = (STATE.i + 4) % 5; renderThreads(); });
    qs('#ajNextBtn', root).addEventListener('click', function () { STATE.i = (STATE.i + 1) % 5; renderThreads(); });
    var goBtn = qs('#ajGoThreads');
    if (goBtn) goBtn.addEventListener('click', function () {
      var el = qs('#ps-threads');
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 20, behavior: 'smooth' });
    });
    renderThreads();
  }

  // ---------------------------------------------------------------------
  // Beats (reputation section) — same on-screen-fraction reveal already used
  // for the hero's kinetic beat titles elsewhere on this page.
  // ---------------------------------------------------------------------
  function buildBeats() {
    var root = qs('#ajBeats');
    if (!root || root.getAttribute('data-built') === '1') return;
    root.setAttribute('data-built', '1');
    BEATS.forEach(function (b, k) {
      var wrap = document.createElement('div');
      wrap.setAttribute('data-beat', String(k));
      wrap.style.marginLeft = 'clamp(0px,' + (b.ml / 18).toFixed(2) + 'vw,' + b.ml + 'px)';
      var rule = document.createElement('span');
      rule.style.cssText = 'display:block;width:' + b.rule + 'px;height:1px;background:' + (k === 5 ? '#4f46e5' : '#a5b4fc') + ';opacity:.7;transition:opacity .6s ease';
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:14px';
      var h3 = document.createElement('h3');
      h3.textContent = b.title;
      h3.style.cssText = 'font-family:Newsreader,serif;font-weight:' + (b.italic ? 400 : 500) + ';font-style:' + (b.italic ? 'italic' : 'normal') + ';font-size:clamp(' + Math.round(b.size * 0.72) + 'px,' + (b.size / 13).toFixed(2) + 'vw,' + b.size + 'px);line-height:1.08;letter-spacing:-.026em;margin:0;transition:color .6s ease;color:#5f6e85';
      row.appendChild(rule); row.appendChild(h3);
      var cap = document.createElement('p');
      cap.textContent = b.cap;
      cap.style.cssText = 'margin:9px 0 0 ' + (b.rule + 14) + 'px;max-width:34ch;font-size:13.5px;line-height:1.6;color:#5f6e85;transition:opacity .6s ease;opacity:.8';
      wrap.appendChild(row); wrap.appendChild(cap);
      wrap.__rule = rule; wrap.__h3 = h3; wrap.__cap = cap;
      root.appendChild(wrap);
    });
  }

  function updateBeats() {
    var vh = window.innerHeight || 800;
    qsa('[data-beat]').forEach(function (node) {
      var r = node.getBoundingClientRect();
      var mid = r.top + r.height / 2;
      var on = mid > vh * 0.18 && mid < vh * 0.82;
      if (node.__on === on) return;
      node.__on = on;
      if (node.__rule) node.__rule.style.opacity = on ? '1' : '.7';
      if (node.__h3) node.__h3.style.color = on ? '#14273f' : '#5f6e85';
      if (node.__cap) node.__cap.style.opacity = on ? '1' : '.8';
    });
  }

  // ---------------------------------------------------------------------
  // Illustrative journey trail (constellation path + scroll-drawn line)
  // ---------------------------------------------------------------------
  function trailPath(P) {
    if (P.length < 2) return '';
    var d = 'M' + P[0].x.toFixed(1) + ',' + P[0].y.toFixed(1);
    var T = 0.92;
    for (var i = 0; i < P.length - 1; i++) {
      var p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
      var c1x = p1.x + (p2.x - p0.x) / 6 * T, c1y = p1.y + (p2.y - p0.y) / 6 * T;
      var c2x = p2.x - (p3.x - p1.x) / 6 * T, c2y = p2.y - (p3.y - p1.y) / 6 * T;
      d += 'C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1);
    }
    return d;
  }
  var trails = new Map();
  var reduceMotion = false;

  function trailLayout(host) {
    var box = host.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    var mob = host.getAttribute('data-trail') === 'mob';
    var items = qsa(mob ? '.aj-mrow' : '.aj-cnode', host);
    if (items.length < 2) return null;
    var P = items.map(function (el) {
      var r = el.getBoundingClientRect();
      if (mob) return { x: r.left - box.left - 17.5, y: r.top - box.top + 9.5 };
      var dot = qs('.aj-dot', el);
      var dr = dot ? dot.getBoundingClientRect() : r;
      return { x: dr.left - box.left + dr.width / 2, y: dr.top - box.top + dr.height / 2 };
    });
    var svg = qs('[data-trail-svg]', host);
    var ghost = qs('[data-trail-ghost]', host);
    var live = qs('[data-trail-live]', host);
    if (!svg || !live) return null;
    svg.setAttribute('viewBox', '0 0 ' + Math.round(box.width) + ' ' + Math.round(box.height));
    var d = trailPath(P);
    if (ghost) ghost.setAttribute('d', d);
    live.setAttribute('d', d);
    var total = live.getTotalLength() || 1;
    live.style.strokeDasharray = String(total);
    var frac = P.map(function (_, k) {
      if (k === 0) return 0;
      if (k === P.length - 1) return 1;
      var tmp = trailPath(P.slice(0, k + 1));
      ghost.setAttribute('d', tmp);
      var l = ghost.getTotalLength() || 0;
      ghost.setAttribute('d', d);
      return Math.min(1, l / total);
    });
    return { host: host, items: items, live: live, total: total, frac: frac,
      key: Math.round(box.width) + 'x' + Math.round(box.height) + ':' + items.length,
      halo: qs('[data-trail-halo]', host), comet: qs('[data-trail-comet]', host) };
  }

  function updateTrail() {
    var hosts = qsa('[data-trail]');
    if (!hosts.length) return;
    var vh = window.innerHeight || 800;
    hosts.forEach(function (host) {
      if (!host.offsetParent && host.offsetHeight === 0) return;
      var box = host.getBoundingClientRect();
      var key = Math.round(box.width) + 'x' + Math.round(box.height) + ':' + host.children.length;
      var L = trails.get(host);
      if (!L || L.key !== key) {
        L = trailLayout(host);
        if (!L) return;
        L.key = key;
        trails.set(host, L);
      }
      var p = (vh * 0.78 - box.top) / Math.max(box.height * 0.82, 1);
      p = reduceMotion ? 1 : Math.max(0, Math.min(1, p));
      L.live.style.strokeDashoffset = (L.total * (1 - p)).toFixed(1);
      L.items.forEach(function (el, k) {
        var f = L.frac[k] || 0;
        var st = p >= f + 0.05 ? 'cn-done' : (p >= f - 0.03 ? 'cn-arriving' : 'cn-locked');
        if (el.__cn !== st) {
          el.classList.remove('cn-locked', 'cn-arriving', 'cn-done');
          el.classList.add(st);
          el.__cn = st;
        }
      });
      if (L.comet) {
        var show = !reduceMotion && p > 0.004 && p < 0.996;
        var pt = show ? L.live.getPointAtLength(L.total * p) : null;
        [L.comet, L.halo].forEach(function (c, idx) {
          if (!c) return;
          c.setAttribute('opacity', show ? (idx ? 0.18 : 0.95) : 0);
          if (pt) { c.setAttribute('cx', pt.x.toFixed(1)); c.setAttribute('cy', pt.y.toFixed(1)); }
        });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Verify / don't-promise: cursor spotlight + scroll-locked checklist
  // ---------------------------------------------------------------------
  var YES = [
    'Platform ownership, verified before a listing can transact at all',
    'The terms both sides accepted, in writing, before funding',
    'That funds are held from the moment the deal is funded',
    'Submitted evidence, read by a human against those exact terms',
    'Which screen every deciding figure was read from'
  ];
  var NO = [
    'That a promotion will perform commercially',
    'Audience figures a platform reports about itself between deals',
    'That a listing will find a buyer, or a campaign a partner',
    'That joining early leads to success. It only makes you easier to find',
    'Taste. Whether a partner suits your brand is still your call'
  ];

  function buildVerifyLists() {
    var root = qs('[data-verify-root]');
    if (!root || root.getAttribute('data-built') === '1') return;
    root.setAttribute('data-built', '1');
    var yesList = qs('#ajYesList', root);
    YES.forEach(function (text) {
      var li = document.createElement('li');
      li.setAttribute('data-vitem', 'yes');
      li.setAttribute('data-locked', '0');
      li.style.cssText = 'position:relative;display:flex;gap:13px;align-items:flex-start;padding:2px 0;transition:opacity .5s cubic-bezier(.22,1,.36,1),transform .5s cubic-bezier(.22,1,.36,1);opacity:.34;transform:translateY(7px)';
      li.innerHTML = '<span data-glow="" style="position:absolute;inset:-7px;border-radius:13px;opacity:0;pointer-events:none;transition:opacity .3s ease;background:radial-gradient(closest-side,rgba(79,70,229,.14),rgba(79,70,229,0))"></span>' +
        '<span data-mark style="flex:none;width:22px;height:22px;border-radius:7px;display:grid;place-items:center;margin-top:1px;transition:all .45s cubic-bezier(.22,1,.36,1);background:#eef2ff;color:#c7d2fe">' +
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path data-check d="M4 12.6 L9.4 18 L20 6.6" style="stroke-dasharray:30;stroke-dashoffset:30;transition:stroke-dashoffset .5s cubic-bezier(.65,0,.35,1) .06s"></path></svg></span>' +
        '<span data-sharp="" style="display:block;min-width:0;transition:filter .3s ease,color .3s ease"><span data-text style="font-size:14.5px;line-height:1.58;transition:color .4s ease;color:#8b98aa">' + text + '</span></span>';
      yesList.appendChild(li);
    });
    var noList = qs('#ajNoList', root);
    NO.forEach(function (text) {
      var li = document.createElement('li');
      li.setAttribute('data-vitem', 'no');
      li.style.cssText = 'position:relative;display:flex;gap:13px;align-items:flex-start;padding:2px 0';
      li.innerHTML = '<span data-glow="" style="position:absolute;inset:-7px;border-radius:13px;opacity:0;pointer-events:none;transition:opacity .3s ease;background:radial-gradient(closest-side,rgba(120,134,156,.1),rgba(120,134,156,0))"></span>' +
        '<span style="flex:none;width:22px;height:22px;border-radius:7px;border:1px dashed #cbd4e0;display:grid;place-items:center;color:#9aa7b8;font-size:13px;line-height:1;margin-top:1px">–</span>' +
        '<span data-sharp="" style="display:block;min-width:0;font-size:14.5px;line-height:1.58;color:#7c899b;filter:saturate(.55)">' + text + '</span>';
      noList.appendChild(li);
    });
  }

  function updateVerifyLock() {
    var root = qs('[data-verify-root]');
    if (!root) return;
    var vh = window.innerHeight || 800;
    var vr = root.getBoundingClientRect();
    var span = vr.height + vh * 0.55;
    var vp = Math.max(0, Math.min(1, (vh * 0.92 - vr.top) / span));
    var locked = Math.max(0, Math.min(5, Math.round(vp * 6.2)));
    if (locked === STATE.locked) return;
    STATE.locked = locked;
    var label = qs('#ajLockLabel');
    if (label) label.textContent = locked + ' / 5 confirmed';
    qsa('[data-vitem="yes"]', root).forEach(function (li, k) {
      var on = k < locked;
      li.setAttribute('data-locked', on ? '1' : '0');
      li.style.opacity = on ? '1' : '.34';
      li.style.transform = 'translateY(' + (on ? 0 : 7) + 'px)';
      var mark = qs('[data-mark]', li);
      if (mark) {
        mark.style.background = on ? '#4f46e5' : '#eef2ff';
        mark.style.color = on ? '#fff' : '#c7d2fe';
        mark.style.boxShadow = on ? '0 4px 12px rgba(79,70,229,.28)' : 'none';
        mark.style.transform = 'scale(' + (on ? 1 : .82) + ')';
      }
      var check = qs('[data-check]', li);
      if (check) check.style.strokeDashoffset = on ? '0' : '30';
      var text = qs('[data-text]', li);
      if (text) text.style.color = on ? '#3a4658' : '#8b98aa';
    });
  }

  function bindSpotlight() {
    var root = qs('[data-verify-root]');
    if (!root || root.getAttribute('data-spot-bound') === '1') return;
    root.setAttribute('data-spot-bound', '1');
    var spot = qs('[data-spot]', root);
    function paint(mx, my) {
      var rr = root.getBoundingClientRect();
      if (spot) { spot.style.transform = 'translate3d(' + (mx - rr.left) + 'px,' + (my - rr.top) + 'px,0)'; spot.style.opacity = '1'; }
      qsa('[data-vitem]', root).forEach(function (li) {
        var r = li.getBoundingClientRect();
        var cx = Math.max(r.left, Math.min(mx, r.right));
        var cy = Math.max(r.top, Math.min(my, r.bottom));
        var dist = Math.hypot(mx - cx, my - cy);
        var near = Math.max(0, 1 - dist / 190);
        var glow = qs('[data-glow]', li);
        var sharp = qs('[data-sharp]', li);
        var cold = li.getAttribute('data-vitem') === 'no';
        var locked = li.getAttribute('data-locked') === '1';
        if (cold) {
          if (glow) glow.style.opacity = (near * 0.34).toFixed(3);
          if (sharp) { sharp.style.filter = 'saturate(' + (0.5 + near * 0.06).toFixed(2) + ') blur(' + (0.25 - near * 0.1).toFixed(2) + 'px)'; sharp.style.color = '#7c899b'; }
        } else {
          var k = locked ? near : near * 0.25;
          if (glow) glow.style.opacity = k.toFixed(3);
          if (sharp) {
            sharp.style.filter = 'none';
            sharp.style.color = locked && k > 0.35 ? '#14273f' : '';
            sharp.style.textShadow = locked ? '0 0 ' + (18 * k).toFixed(1) + 'px rgba(79,70,229,' + (0.3 * k).toFixed(2) + ')' : 'none';
          }
        }
      });
    }
    var raf = 0;
    root.addEventListener('mousemove', function (e) {
      if (raf) return;
      raf = setTimeout(function () { raf = 0; paint(e.clientX, e.clientY); }, 16);
    });
    root.addEventListener('mouseleave', function () {
      if (spot) spot.style.opacity = '0';
      qsa('[data-vitem]', root).forEach(function (li) {
        var g = qs('[data-glow]', li); if (g) g.style.opacity = '0';
        var s = qs('[data-sharp]', li); if (s) { s.style.textShadow = 'none'; s.style.color = ''; if (li.getAttribute('data-vitem') === 'no') s.style.filter = 'saturate(.55)'; }
      });
    });
  }

  // ---------------------------------------------------------------------
  // Fee calculator
  // ---------------------------------------------------------------------
  function renderFee() {
    var deal = STATE.deal;
    var buyerFee = deal * 0.05, sellerFee = deal * 0.10;
    var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
    set('ajFeeDeal', gbp(deal));
    set('ajFeeBuyerPays', gbp(deal + buyerFee));
    set('ajFeeBuyerFee', gbp(buyerFee));
    set('ajFeeSellerFee', gbp(sellerFee));
    set('ajFeeSellerGets', gbp(deal - sellerFee));
    var slider = qs('#ajFeeSlider');
    if (slider && +slider.value !== deal) slider.value = String(deal);
    var presetsWrap = qs('#ajFeePresets');
    if (presetsWrap) {
      presetsWrap.innerHTML = '';
      [250, 750, 1500, 3000].forEach(function (v) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '£' + gbp(v);
        var active = v === deal;
        btn.style.cssText = 'border-radius:99px;padding:7px 14px;font-size:12.5px;font-weight:700;transition:all .18s cubic-bezier(.22,1,.36,1);border:1px solid ' + (active ? '#4f46e5' : '#d9dfe8') + ';background:' + (active ? '#eef2ff' : '#fff') + ';color:' + (active ? '#4338ca' : '#5f6e85');
        btn.addEventListener('click', function () { STATE.deal = v; renderFee(); });
        presetsWrap.appendChild(btn);
      });
    }
  }

  function bindFee() {
    var slider = qs('#ajFeeSlider');
    if (!slider || slider.getAttribute('data-bound') === '1') return;
    slider.setAttribute('data-bound', '1');
    slider.addEventListener('input', function () { STATE.deal = +slider.value; renderFee(); });
    renderFee();
  }

  // ---------------------------------------------------------------------
  // Generic scroll reveal (fade + rise), matches the pattern used elsewhere
  // on this site. Applies to every direct child of every section/footer on
  // the About view that hasn't already been tagged.
  // ---------------------------------------------------------------------
  var rvSeen = new WeakSet();
  var rvObs = null;
  function setupReveals() {
    if (!('IntersectionObserver' in window)) return;
    if (rvObs) return;
    rvObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('rv-in');
        rvObs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    scanReveals();
    var n = 0;
    var timer = setInterval(function () {
      scanReveals();
      if (++n > 24) clearInterval(timer);
    }, 200);
  }
  function scanReveals() {
    var root = qs('#view-about');
    if (!root) return;
    qsa('section, footer', root).forEach(function (sec) {
      if (sec.parentElement && sec.parentElement.closest('section, footer')) return;
      var box = qs(':scope > div', sec);
      var list = box ? Array.prototype.slice.call(box.children).filter(function (n) { return n.nodeType === 1; }) : [];
      if (list.length < 2) list = box ? [box] : [sec];
      list.forEach(function (el, i) {
        if (rvSeen.has(el)) return;
        rvSeen.add(el);
        if (reduceMotion) return;
        el.setAttribute('data-rv', '1');
        el.style.transitionDelay = Math.min(i, 4) * 90 + 'ms';
        rvObs.observe(el);
      });
    });
  }

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------
  var booted = false;
  function tick() {
    if (!qs('#view-about')) return;
    updateBgParallax();
    updateTrail();
    updateBeats();
    updateVerifyLock();
    bindSpotlight();
  }
  var pollTimer = null;
  window.PSAboutInit = function () {
    var root = qs('#view-about');
    if (!root) return;
    reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    buildBgField();
    bindThreads();
    buildBeats();
    buildVerifyLists();
    bindFee();
    setupReveals();
    tick();
    if (!booted) {
      booted = true;
      window.addEventListener('scroll', tick, { passive: true, capture: true });
      window.addEventListener('resize', tick, { passive: true });
      if (!pollTimer) pollTimer = setInterval(tick, 300);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (qs('#view-about')) window.PSAboutInit();
  });
})();
