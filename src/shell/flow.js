/* ------------------------------------------------------------------
   YANC 1-on-1 Connect — demo flow shell
   Injected into every screen at build time (see scripts/build.py).
   Turns nine standalone Stitch wireframes into one navigable product
   demo: shared session state, real navigation between screens, a
   step-through chrome bar, and toasts in place of dead-end alerts.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var STORE_KEY = 'yanc.demo.v1';

  /* ---------- screen registry ------------------------------------- */

  // The linear happy path a reviewer walks through.
  var JOURNEY = [
    { id: 'index',      file: 'index.html',      step: 'Flow map',   title: 'Journey map' },
    { id: 'gateway',    file: 'gateway.html',    step: 'Step 1',     title: 'Role gateway' },
    { id: 'founder',    file: 'founder.html',    step: 'Step 2',     title: 'Founder workspace' },
    { id: 'console',    file: 'console.html',    step: 'Step 3',     title: 'Advisory console & booking' },
    { id: 'mentor',     file: 'mentor.html',     step: 'Step 4',     title: 'Mentor board & escrow release' },
    { id: 'governance', file: 'governance.html', step: 'Step 5',     title: 'Governance & dispute' }
  ];

  // Reference screens — reachable from the map and the screen menu,
  // but not part of the linear walk-through.
  var REFERENCE = [
    { id: 'architecture',           file: 'architecture.html',           step: 'Spec', title: 'Ecosystem flowchart' },
    { id: 'journey',                file: 'journey.html',                step: 'Spec', title: 'Booking journey diagram' },
    { id: 'wireframe-lofi',         file: 'wireframe-lofi.html',         step: 'Spec', title: 'Low-fi blueprint' },
    { id: 'wireframe-hifi',         file: 'wireframe-hifi.html',         step: 'Spec', title: 'Hi-fi minimalist' },
    { id: 'wireframe-architecture', file: 'wireframe-architecture.html', step: 'Spec', title: 'Role architecture console' }
  ];

  var ALL = JOURNEY.concat(REFERENCE);

  function screenById(id) {
    for (var i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i];
    return null;
  }

  /* ---------- persona registry ------------------------------------
     Mirrors the six personas in the YANC Connect ecosystem flowchart
     (docs/reference/source-ecosystem-flowchart.jpg). The shipped gateway
     wireframe exposes five tabs; Ops Admin and Finance Admin are reached
     through the Super Admin console and architecture.html deep links. */

  var PERSONAS = {
    founder: {
      name: 'Arjun Mehta', label: 'Non-Member Founder', short: 'Founder',
      onboarding: 'Application review',
      dest: 'console.html?role=nonmember&tab=mentors',
      note: 'No credit wallet — 100% escrow checkout in INR.'
    },
    member: {
      name: 'Priya Nair', label: 'YANC Member — YC W26', short: 'Member',
      onboarding: 'Member whitelist verification + OTP',
      dest: 'founder.html',
      note: 'Spends cohort credits (1 credit = ₹100).'
    },
    investor: {
      name: 'Aarav Singhania', label: 'Tiered Investor — Singhania Ventures', short: 'Investor',
      onboarding: 'Tier verification',
      dest: 'mentor.html?persona=investor',
      note: 'Reviews decks and takes 3-point teardown memos.'
    },
    mentor: {
      name: 'Vikramaditya Roy', label: 'Verified Mentor — Ex-CTO @ FinFlow', short: 'Mentor',
      onboarding: 'Mentor verification',
      dest: 'mentor.html',
      note: 'Runs scheduled calls under a 48h SLA and releases escrow.'
    },
    ops: {
      name: 'Ops Desk', label: 'Ops Admin', short: 'Ops Admin',
      onboarding: 'Staff provisioning',
      dest: 'console.html?role=ops&tab=governance',
      note: 'Confirms slots and works the session pipeline queue.'
    },
    finance: {
      name: 'Finance Desk', label: 'Finance Admin', short: 'Finance Admin',
      onboarding: 'Staff provisioning',
      dest: 'console.html?role=fin&tab=governance',
      note: 'Escrow release audit and provider wallet payouts.'
    },
    admin: {
      name: 'Devansh Malhotra', label: 'Super Admin — governance & custody', short: 'Super Admin',
      onboarding: 'Root clearance + HSM key',
      dest: 'governance.html',
      note: 'Multi-sig custody, credit minting and dispute remediation.'
    }
  };

  /* ---------- session state --------------------------------------- */

  var defaults = {
    persona: null,
    credits: 4,
    bookings: [],
    escrowReleased: false,
    disputeResolution: null,
    log: []
  };

  function read() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaults));
      var parsed = JSON.parse(raw);
      for (var k in defaults) if (!(k in parsed)) parsed[k] = defaults[k];
      return parsed;
    } catch (e) {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  function write(next) {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch (e) { /* private mode */ }
    state = next;
    paintChrome();
    return next;
  }

  var state = read();

  function logEvent(text) {
    var s = read();
    s.log.push({ at: new Date().toISOString(), text: text });
    if (s.log.length > 40) s.log = s.log.slice(-40);
    write(s);
  }

  /* ---------- toast ----------------------------------------------- */

  var toastHost = null;

  function toast(message, opts) {
    opts = opts || {};
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'yanc-toast-host';
      document.body.appendChild(toastHost);
    }
    var el = document.createElement('div');
    el.className = 'yanc-toast yanc-toast--' + (opts.tone || 'default');
    var head = document.createElement('div');
    head.className = 'yanc-toast__title';
    head.textContent = opts.title || 'YANC Connect';
    var body = document.createElement('div');
    body.className = 'yanc-toast__body';
    body.textContent = message;
    el.appendChild(head);
    el.appendChild(body);

    if (opts.action && opts.href) {
      var a = document.createElement('a');
      a.className = 'yanc-toast__action';
      a.href = opts.href;
      a.textContent = opts.action;
      el.appendChild(a);
    }

    var close = document.createElement('button');
    close.className = 'yanc-toast__close';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    close.onclick = function () { dismiss(); };
    el.appendChild(close);

    toastHost.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });

    var timer = setTimeout(dismiss, opts.sticky ? 12000 : 5200);
    function dismiss() {
      clearTimeout(timer);
      el.classList.remove('is-in');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    }
    return el;
  }

  // Every screen shipped with alert()-based dead ends. Route them through
  // the toast so the demo never blocks on a modal dialog.
  window.alert = function (msg) {
    toast(String(msg), { title: 'Simulated', tone: 'info', sticky: true });
  };

  /* ---------- navigation helpers ---------------------------------- */

  function go(href) { window.location.href = href; }

  function currentId() {
    return document.body.getAttribute('data-yanc-screen') || 'index';
  }

  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  }

  /* ---------- chrome bar ------------------------------------------ */

  var chrome = null;

  function buildChrome() {
    var id = currentId();
    var here = screenById(id);
    var idx = -1;
    for (var i = 0; i < JOURNEY.length; i++) if (JOURNEY[i].id === id) idx = i;

    chrome = document.createElement('div');
    chrome.className = 'yanc-chrome';
    chrome.setAttribute('data-yanc-ui', 'chrome');

    var prev = idx > 0 ? JOURNEY[idx - 1] : null;
    var next = idx > -1 && idx < JOURNEY.length - 1 ? JOURNEY[idx + 1] : null;

    var html = '';
    html += '<a class="yanc-chrome__brand" href="index.html" title="Journey map">';
    html += '<span class="yanc-chrome__mark">Y</span><span class="yanc-chrome__brandtext">Connect demo</span></a>';

    html += '<div class="yanc-chrome__where">';
    html += '<span class="yanc-chrome__step">' + (here ? here.step : 'Screen') + '</span>';
    html += '<span class="yanc-chrome__title">' + (here ? here.title : document.title) + '</span>';
    html += '</div>';

    html += '<div class="yanc-chrome__spacer"></div>';

    html += '<button class="yanc-chrome__persona" data-yanc-act="persona" type="button">';
    html += '<span class="yanc-chrome__dot"></span><span data-yanc-personatext>No session</span></button>';

    html += '<div class="yanc-chrome__nav">';
    html += prev
      ? '<a class="yanc-chrome__btn" href="' + prev.file + '">← ' + prev.title + '</a>'
      : '<span class="yanc-chrome__btn is-disabled">← Back</span>';
    html += next
      ? '<a class="yanc-chrome__btn yanc-chrome__btn--primary" href="' + next.file + '">' + next.title + ' →</a>'
      : '<a class="yanc-chrome__btn" href="index.html">Journey map</a>';
    html += '</div>';

    html += '<button class="yanc-chrome__btn yanc-chrome__btn--ghost" data-yanc-act="menu" type="button">Screens ▾</button>';
    html += '<button class="yanc-chrome__btn yanc-chrome__btn--ghost" data-yanc-act="reset" type="button" title="Clear demo session">Reset</button>';

    chrome.innerHTML = html;

    var menu = document.createElement('div');
    menu.className = 'yanc-menu';
    menu.hidden = true;
    var mh = '<div class="yanc-menu__group">Journey</div>';
    JOURNEY.forEach(function (s) {
      mh += '<a class="yanc-menu__item' + (s.id === id ? ' is-current' : '') + '" href="' + s.file + '">' +
            '<span>' + s.title + '</span><em>' + s.step + '</em></a>';
    });
    mh += '<div class="yanc-menu__group">Reference &amp; specs</div>';
    REFERENCE.forEach(function (s) {
      mh += '<a class="yanc-menu__item' + (s.id === id ? ' is-current' : '') + '" href="' + s.file + '">' +
            '<span>' + s.title + '</span><em>' + s.step + '</em></a>';
    });
    menu.innerHTML = mh;
    chrome.appendChild(menu);

    document.body.appendChild(chrome);
    document.body.classList.add('yanc-has-chrome');

    chrome.addEventListener('click', function (ev) {
      var act = ev.target.closest && ev.target.closest('[data-yanc-act]');
      if (!act) return;
      var name = act.getAttribute('data-yanc-act');
      if (name === 'menu') { menu.hidden = !menu.hidden; }
      if (name === 'reset') {
        try { sessionStorage.removeItem(STORE_KEY); } catch (e) {}
        window.location.href = 'index.html';
      }
      if (name === 'persona') { window.location.href = 'gateway.html'; }
    });

    document.addEventListener('click', function (ev) {
      if (!menu.hidden && !chrome.contains(ev.target)) menu.hidden = true;
    });

    paintChrome();
  }

  function paintChrome() {
    if (!chrome) return;
    var slot = chrome.querySelector('[data-yanc-personatext]');
    if (!slot) return;
    var p = state.persona && PERSONAS[state.persona];
    slot.textContent = p ? p.name + ' · ' + p.short : 'No session — sign in';
    chrome.classList.toggle('is-authed', !!p);
  }

  /* ---------- generic link rewiring -------------------------------- */

  // The wireframes ship every nav item as href="#". Map them onto the
  // screens they clearly refer to so the chrome of each page works.
  var LINK_MAP = [
    [/^gateway$/,                        'gateway.html'],
    [/^role gateway$/,                   'gateway.html'],
    [/^role switcher$/,                  'gateway.html'],
    [/^founder deck$/,                   'founder.html#vault'],
    [/^mentee dashboard$/,               'founder.html'],
    [/^advisory board$/,                 'mentor.html'],
    [/^advisor board$/,                  'mentor.html'],
    [/^governance$/,                     'governance.html'],
    [/^governance room$/,                'governance.html'],
    [/^audit ledger$/,                   'governance.html#audit-ledger'],
    [/^launch full audit ledger$/,       'governance.html#audit-ledger'],
    [/^view all 48 active advisors$/,    'console.html?tab=mentors'],
    [/^browse public advisor directory$/,'console.html?tab=mentors'],
    [/^see all$/,                        'console.html?tab=mentors'],
    [/^book advisory$/,                  'console.html?tab=mentors'],
    [/^\+? ?book advisory consultation$/,'console.html?tab=mentors'],
    [/^safe harbor protocol$/,           'governance.html#safe-harbor'],
    [/^system settings$/,                'governance.html#system-settings'],
    [/^dispute resolution$/,             'governance.html#dispute'],
    [/^vault settings$/,                 'founder.html#vault']
  ];

  function normalise(el) {
    // Strip Material Symbols ligature text so "badge Role Gateway" reads
    // as "role gateway".
    var clone = el.cloneNode(true);
    clone.querySelectorAll('.material-symbols-outlined, svg').forEach(function (n) { n.remove(); });
    return (clone.textContent || '')
      .replace(/[→↗›>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function rewireLinks() {
    var links = document.querySelectorAll('a[href="#"], a[href^="#"]');
    Array.prototype.forEach.call(links, function (a) {
      if (a.closest('[data-yanc-ui]')) return;              // our own chrome
      if (a.getAttribute('data-yanc-keep') !== null) return; // opted out
      var href = a.getAttribute('href');
      // Leave real in-page anchors that resolve to an element alone.
      if (href.length > 1) {
        try { if (document.querySelector(href)) return; } catch (e) {}
      }
      var text = normalise(a);
      for (var i = 0; i < LINK_MAP.length; i++) {
        if (LINK_MAP[i][0].test(text)) {
          a.setAttribute('href', LINK_MAP[i][1]);
          a.classList.add('yanc-wired');
          return;
        }
      }
      // Unmapped stub link: keep it inert but make that obvious.
      a.classList.add('yanc-stub');
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        toast('"' + (a.textContent || 'This control').trim() + '" is out of scope for this wireframe demo.', {
          title: 'Not in this prototype', tone: 'info'
        });
      });
    });

    // Buttons that read like navigation get the same treatment.
    Array.prototype.forEach.call(document.querySelectorAll('button'), function (b) {
      if (b.closest('[data-yanc-ui]')) return;
      if (b.getAttribute('onclick')) return;
      if (b.type === 'submit') return;
      var text = normalise(b);
      for (var i = 0; i < LINK_MAP.length; i++) {
        if (LINK_MAP[i][0].test(text)) {
          var target = LINK_MAP[i][1];
          b.classList.add('yanc-wired');
          b.addEventListener('click', function (ev) { ev.preventDefault(); go(target); });
          return;
        }
      }
    });
  }

  /* ---------- per-screen wiring ------------------------------------ */

  var screens = {};

  screens.gateway = function () {
    // Preselect from ?persona= so the map can deep-link a role.
    var wanted = param('persona');
    if (wanted && PERSONAS[wanted] && typeof window.setRole === 'function') {
      try { window.setRole(wanted); } catch (e) {}
    }

    var form = document.querySelector('form');
    if (!form) return;

    // Replace the shipped handler (which ended in an alert) with a real
    // sign-in that stores the persona and routes to that role's console.
    var clone = form.cloneNode(true);
    form.parentNode.replaceChild(clone, form);
    clone.removeAttribute('onsubmit');

    clone.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var role = detectRole();
      var persona = PERSONAS[role] || PERSONAS.member;
      var btnText = document.getElementById('btn-text');
      var btn = document.getElementById('submit-btn');
      var original = btnText ? btnText.textContent : '';

      if (btnText) btnText.textContent = 'Validating Safe Harbor token…';
      if (btn) btn.disabled = true;

      var s = read();
      s.persona = role;
      s.credits = role === 'founder' ? 0 : 4;
      write(s);
      logEvent('Signed in as ' + persona.name + ' (' + persona.label + ')');

      setTimeout(function () {
        if (btnText) btnText.textContent = original;
        if (btn) btn.disabled = false;
        go(persona.dest);
      }, 650);
    });

    // Re-bind the persona quick-fill buttons that the clone dropped.
    Array.prototype.forEach.call(clone.querySelectorAll('[onclick^="fillCredentials"]'), function (b) {
      var m = /fillCredentials\(([^)]*)\)/.exec(b.getAttribute('onclick'));
      if (!m) return;
      var args = m[1].split(',').map(function (a) { return a.trim().replace(/^['"]|['"]$/g, ''); });
      b.removeAttribute('onclick');
      b.addEventListener('click', function () {
        if (typeof window.fillCredentials === 'function') {
          window.fillCredentials(args[0], args[1], args[2], args[3]);
        }
      });
    });

    function detectRole() {
      var ids = ['founder', 'member', 'investor', 'mentor', 'admin'];
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById('role-' + ids[i]);
        if (el && el.classList.contains('bg-surface-container-lowest')) return ids[i];
      }
      return 'member';
    }
  };

  screens.founder = function () {
    var s = read();
    if (!s.persona) { s.persona = 'member'; write(s); }

    // Surface anything booked in the console on the dashboard.
    if (s.bookings.length) renderBookings(s.bookings);

    // "Request" buttons on recommended advisors take you to the console
    // pre-filtered to that mentor.
    Array.prototype.forEach.call(document.querySelectorAll('button'), function (b) {
      if (normalise(b) !== 'request') return;
      var card = b.closest('div');
      var name = '';
      while (card && !name) {
        var h = card.querySelector('p.font-semibold, p.font-bold, h4, h3');
        if (h) name = h.textContent.trim();
        card = card.parentElement;
      }
      b.addEventListener('click', function (ev) {
        ev.preventDefault();
        go('console.html?tab=mentors&mentor=' + encodeURIComponent(name));
      });
    });

    // Join / Manage Session -> the mentor side of the same session.
    Array.prototype.forEach.call(document.querySelectorAll('button'), function (b) {
      var t = normalise(b);
      if (t === 'join / manage session' || t === 'zoom link ready') {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          toast('Session room opening. The mentor sees the same booking on the Advisor Board.', {
            title: 'Session', tone: 'ok', action: 'Open Advisor Board →', href: 'mentor.html', sticky: true
          });
        });
      }
      if (t === 'instant escrow lock') {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          toast('Escrow locked. Funds release only against the founder’s 4-digit venue code.', {
            title: 'Escrow', tone: 'ok', action: 'See mentor ledger →', href: 'mentor.html'
          });
        });
      }
    });

    function renderBookings(bookings) {
      var anchor = document.querySelector('h2, h3');
      var host = document.createElement('section');
      host.className = 'yanc-injected';
      var rows = bookings.map(function (bk) {
        return '<li class="yanc-injected__row">' +
               '<div><strong>' + esc(bk.mentor) + '</strong><span>' + esc(bk.format) + ' · ' + esc(bk.cost) + '</span></div>' +
               '<a href="mentor.html">Mentor view →</a></li>';
      }).join('');
      host.innerHTML =
        '<div class="yanc-injected__head"><span class="yanc-injected__tag">Booked in this session</span>' +
        '<span class="yanc-injected__sub">Carried over from the Advisory Console</span></div>' +
        '<ul class="yanc-injected__list">' + rows + '</ul>';
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(host, anchor);
      else document.body.appendChild(host);
    }
  };

  screens.console = function () {
    var s = read();

    // Deep links: ?role=…&tab=…&mentor=…
    var role = param('role');
    if (!role && s.persona) {
      role = { member: 'member', founder: 'nonmember', mentor: 'mentor',
               investor: 'mentor', ops: 'ops', finance: 'fin', admin: 'tech' }[s.persona] || null;
    }
    if (role && typeof window.switchRole === 'function') {
      try { window.switchRole(role); } catch (e) {}
    }
    var tab = param('tab');
    if (tab && typeof window.switchTab === 'function') {
      try { window.switchTab(tab); } catch (e) {}
    }

    var wantedMentor = param('mentor');
    if (wantedMentor) {
      toast('Filtered the directory for ' + wantedMentor + '.', { title: 'Directory', tone: 'info' });
    }

    // The advisory objective is a required field the export ships empty, so
    // "Confirm booking" silently fails validation on the first click. Seed it
    // with a plausible brief when the modal opens — still editable, still
    // required if the reviewer clears it.
    var OBJECTIVE = 'Pressure-test our seed metrics and GTM motion ahead of the ' +
                    'partner meeting: pricing, activation curve, and the first ' +
                    'two enterprise reference accounts.';
    var openModal = window.openMentorBookingModal;
    if (typeof openModal === 'function') {
      window.openMentorBookingModal = function () {
        openModal.apply(this, arguments);
        var objective = document.querySelector('#mentor-booking-form textarea');
        if (objective && !objective.value.trim()) objective.value = OBJECTIVE;
      };
    }

    // The shipped booking form ended in an alert and left the demo state
    // untouched. Record the booking, spend credits, and hand off.
    var bookingForm = document.getElementById('mentor-booking-form');
    if (bookingForm) {
      bookingForm.removeAttribute('onsubmit');
      bookingForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var nameEl = document.getElementById('modal-mentor-name');
        var mentor = nameEl ? nameEl.textContent.replace(/^Book Slot:\s*/, '').trim() : 'Advisor';
        var summaryEl = document.getElementById('checkout-amount-summary');
        var cost = summaryEl ? summaryEl.textContent.trim() : '1 Credit';
        var fmt = /offline|2 credits|1,500/i.test(cost) ? 'Offline · 60 min' : 'Online · 45 min';
        var objectiveEl = document.querySelector('#mentor-booking-form textarea');
        var objective = objectiveEl ? objectiveEl.value.trim() : '';

        var st = read();
        st.bookings.push({ mentor: mentor, format: fmt, cost: cost, objective: objective, at: Date.now() });
        if (/credit/i.test(cost)) st.credits = Math.max(0, st.credits - (/2 credits/i.test(cost) ? 2 : 1));
        write(st);
        logEvent('Booked ' + mentor + ' (' + fmt + ', ' + cost + ')');

        if (typeof window.closeMentorModal === 'function') window.closeMentorModal();
        if (typeof window.switchTab === 'function') window.switchTab('bookings');

        toast(mentor + ' booked — ' + fmt + ', ' + cost + '. Escrow is now held against the session.', {
          title: 'Booking confirmed', tone: 'ok', sticky: true,
          action: 'Mentor accepts it →', href: 'mentor.html'
        });
        paintCredits();
      });
    }

    var pitchForm = document.getElementById('investor-pitch-form') ||
                    document.querySelector('#investor-modal form');
    if (pitchForm) {
      pitchForm.removeAttribute('onsubmit');
      pitchForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (typeof window.closeInvestorModal === 'function') window.closeInvestorModal();
        logEvent('Submitted pitch dossier to investor queue');
        toast('Dossier queued for partner review. The 48-hour SLA clock starts now.', {
          title: 'Pitch submitted', tone: 'ok',
          action: 'See governance queue →', href: 'governance.html'
        });
      });
    }

    fixVaultTab();
    paintCredits();

    function paintCredits() {
      var st = read();
      var badge = document.getElementById('credit-badge');
      if (!badge) return;
      var strong = badge.querySelector('strong');
      if (strong && /credit/i.test(badge.textContent)) {
        strong.textContent = st.credits + ' Active';
      }
    }
  };

  // Both the HubSpot console and the architecture console ship a
  // "Pitch Decks & Vault" tab with no matching view, so selecting it
  // blanks the workspace. Build the missing view from state.
  function fixVaultTab() {
    var nav = document.getElementById('tab-nav-vault');
    if (!nav || document.getElementById('view-vault')) return;
    var sibling = document.getElementById('view-mentors');
    if (!sibling || !sibling.parentNode) return;

    var view = document.createElement('div');
    view.id = 'view-vault';
    view.className = 'hidden yanc-vault';
    view.innerHTML =
      '<div class="yanc-vault__card">' +
        '<div class="yanc-vault__head">' +
          '<div><h2>Pitch Decks &amp; Document Vault</h2>' +
          '<p>AES-256 at rest. Every open is watermarked per viewer and written to the audit ledger.</p></div>' +
          '<span class="yanc-vault__chip">AES-256</span>' +
        '</div>' +
        '<table class="yanc-vault__table"><thead><tr>' +
          '<th>Document</th><th>Size</th><th>Access</th><th>Last viewed</th><th></th>' +
        '</tr></thead><tbody>' +
          row('NexaFlow_Seed_Deck_v3.2.pdf', '24.8 MB', 'Safe Harbor watermarked', 'Aarav Singhania · 2h ago', 'Signed NDA') +
          row('Cap Table Model — Seed_v1.xls', '1.2 MB', 'Restricted — partner only', 'No access granted', 'Restricted') +
          row('YANC Safe Harbor Master Agreement', '318 KB', 'Countersigned', 'Priya Nair · 11:42 IST', 'Active') +
          row('SOC2 Readiness Memo — draft', '862 KB', 'Advisor review', 'Vikramaditya Roy · 1d ago', 'In review') +
        '</tbody></table>' +
        '<div class="yanc-vault__foot"><span>Granular NDA verification enabled for all advisors.</span>' +
        '<a href="governance.html#audit-ledger">Open audit ledger →</a></div>' +
      '</div>';

    sibling.parentNode.appendChild(view);

    function row(name, size, access, seen, badge) {
      return '<tr><td><strong>' + esc(name) + '</strong></td><td>' + esc(size) + '</td><td>' + esc(access) +
             '</td><td>' + esc(seen) + '</td><td><span class="yanc-vault__badge">' + esc(badge) + '</span></td></tr>';
    }
  }

  screens.mentor = function () {
    var s = read();

    // Show the booking the founder just made on the mentor's queue.
    if (s.bookings.length) {
      var list = s.bookings.map(function (b) {
        return '<li class="yanc-injected__row"><div><strong>' + esc(b.mentor) +
               '</strong><span>Requested by ' + esc(personaName()) + ' · ' + esc(b.format) + ' · ' + esc(b.cost) +
               '</span>' + (b.objective ? '<span class="yanc-injected__quote">“' + esc(b.objective) + '”</span>' : '') +
               '</div><span class="yanc-injected__pill">Awaiting accept</span></li>';
      }).join('');
      var host = document.createElement('section');
      host.className = 'yanc-injected';
      host.innerHTML = '<div class="yanc-injected__head"><span class="yanc-injected__tag">Inbound this session</span>' +
                       '<span class="yanc-injected__sub">Booked from the Advisory Console</span></div>' +
                       '<ul class="yanc-injected__list">' + list + '</ul>';
      var main = document.querySelector('main') || document.body;
      main.insertBefore(host, main.firstChild);
    }

    // The escrow release control: wire it to demo state and hand off to
    // governance if it is disputed.
    var releaseBtn = document.getElementById('releaseBtn');
    var codeInput = document.getElementById('escrowCode');
    if (releaseBtn) {
      releaseBtn.addEventListener('click', function () {
        var code = codeInput ? String(codeInput.value || '').trim() : '';
        if (code.length !== 4) {
          toast('Enter the founder’s 4-digit venue code to release escrow. Try 8491.', {
            title: 'Escrow held', tone: 'warn'
          });
          return;
        }
        var st = read();
        st.escrowReleased = true;
        write(st);
        logEvent('Escrow released against code ' + code);
        toast('₹1,500 disbursed to the advisor payout balance. Ledger entry written.', {
          title: 'Escrow released', tone: 'ok', sticky: true,
          action: 'See it in governance →', href: 'governance.html#audit-ledger'
        });
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll('button'), function (b) {
      var t = normalise(b);
      if (t === 'start zoom session') {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          toast('Encrypted room opened. Session telemetry streams to the governance console.', {
            title: 'Live session', tone: 'ok'
          });
        });
      }
      if (t === 'review pitch deck (audited access)') {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          go('console.html?tab=vault');
        });
      }
      if (t === 'request sweep to hdfc bank (..4019)') {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          toast('Payout sweep queued. Finance admin settles it from the governance console.', {
            title: 'Payout', tone: 'info', action: 'Governance →', href: 'governance.html'
          });
        });
      }
    });

    function personaName() {
      var st = read();
      var p = st.persona && PERSONAS[st.persona];
      return p ? p.name : 'Priya Nair';
    }
  };

  screens.governance = function () {
    var s = read();

    // Reflect the escrow release the mentor performed.
    if (s.escrowReleased) {
      var badge = document.createElement('div');
      badge.className = 'yanc-injected yanc-injected--tight';
      badge.innerHTML = '<div class="yanc-injected__head"><span class="yanc-injected__tag">This session</span>' +
                        '<span class="yanc-injected__sub">Escrow released by the advisor against the founder’s venue code — vault state ESCROW_HOLD_CLEAR.</span></div>';
      var main = document.querySelector('main') || document.body;
      main.insertBefore(badge, main.firstChild);
    }

    // Dispute remediation buttons: record the decision instead of doing nothing.
    var remediation = {
      '50% partial refund': 'Split ₹2,500 to the founder, ₹2,500 to the advisor.',
      'full refund': 'Full ₹5,000 returned to the founder’s credit wallet.',
      'release to advisor': 'Full ₹5,000 disbursed to the advisor.',
      'force release escrow': 'Escrow #YC-9042 force-released under root clearance.',
      'refund founder': 'Escrow #YC-9042 refunded to the founder.'
    };

    Array.prototype.forEach.call(document.querySelectorAll('button'), function (b) {
      var t = normalise(b);
      if (remediation[t]) {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          var st = read();
          st.disputeResolution = t;
          write(st);
          logEvent('Dispute #DISP-108 resolved: ' + t);
          appendAudit(b.textContent.trim(), remediation[t]);
          toast(remediation[t] + ' Both parties notified; the ledger entry is immutable.', {
            title: 'Dispute #DISP-108 resolved', tone: 'ok', sticky: true
          });
        });
      }
      if (t === 'approve') {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          logEvent('Approved advisor application');
          appendAudit('Advisor approved', 'Dr. Kavita Raman published to the advisor directory.');
          toast('Dr. Kavita Raman approved and published to the directory.', {
            title: 'Advisor approved', tone: 'ok', action: 'See the directory →', href: 'console.html?tab=mentors'
          });
        });
      }
      if (t === 'reject') {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          appendAudit('Advisor rejected', 'Application returned with a vetting note.');
          toast('Application rejected and returned with a vetting note.', { title: 'Advisor rejected', tone: 'warn' });
        });
      }
      if (t === 'grant credits') {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          var amount = 50;
          var input = document.querySelector('input[type="number"], input[value="50"]');
          if (input && input.value) amount = parseInt(input.value, 10) || 50;
          var st = read();
          st.credits += amount;
          write(st);
          appendAudit('Credits granted', amount + ' CR injected into the member wallet.');
          toast(amount + ' credits injected. The founder wallet now reads ' + st.credits + ' credits.', {
            title: 'Credits granted', tone: 'ok', action: 'Founder workspace →', href: 'founder.html'
          });
        });
      }
      if (t === 'publish to directory') {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          appendAudit('Advisor published', 'Nikhil Verma is now bookable in the directory.');
          toast('Nikhil Verma published — now bookable in the Advisory Console.', {
            title: 'Published', tone: 'ok', action: 'Open directory →', href: 'console.html?tab=mentors'
          });
        });
      }
      if (t === 'export escrow ledger (.csv)') {
        b.addEventListener('click', function (ev) {
          ev.preventDefault();
          toast('CSV export is stubbed in this prototype — no ledger data leaves the demo.', {
            title: 'Export', tone: 'info'
          });
        });
      }
    });

    function appendAudit(title, detail) {
      // Prepend to the live audit log so an action leaves a visible trace.
      var heading = Array.prototype.slice.call(document.querySelectorAll('h2, h3'))
        .filter(function (h) { return /audit log/i.test(h.textContent); })[0];
      if (!heading) return;
      var card = heading.closest('div');
      while (card && !card.querySelector('div > div')) card = card.parentElement;
      var stream = heading.parentElement && heading.parentElement.parentElement;
      var list = stream && stream.querySelector('div:last-child');
      if (!list) return;
      var entry = document.createElement('div');
      entry.className = 'yanc-audit';
      var now = new Date();
      var hh = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') +
               ':' + String(now.getSeconds()).padStart(2, '0');
      entry.innerHTML = '<span class="yanc-audit__tag">now</span>' +
                        '<span class="yanc-audit__title">' + esc(title) + '</span>' +
                        '<span class="yanc-audit__detail">' + esc(detail) + '</span>' +
                        '<span class="yanc-audit__time">' + hh + ' IST</span>';
      list.insertBefore(entry, list.firstChild);
    }
  };

  /* ---------- avatar fallback --------------------------------------
     The exports point their headshots at ephemeral Google CDN URLs. Those
     expire, and plenty of corporate networks block that host outright, so
     a viewer would see broken image icons all over the demo. Swap any image
     that fails to load for a generated initials avatar built from the name
     already present in its alt text. */

  var STOPWORDS = /^(Headshot|Avatar|Profile|Portrait|Executive|User|Close|Candid|Studio|Corporate|Professional|Sophisticated|Distinguished|Verified|Meeting|Session)$/;

  function nameFromImage(img) {
    var sources = [img.getAttribute('alt') || '', img.getAttribute('data-alt') || ''];
    for (var i = 0; i < sources.length; i++) {
      var re = /\b(?:Dr\.\s+)?([A-Z][a-z]{1,14})\s+([A-Z][a-z]{1,14})\b/g;
      var m;
      while ((m = re.exec(sources[i]))) {
        if (!STOPWORDS.test(m[1]) && !STOPWORDS.test(m[2])) return m[1] + ' ' + m[2];
      }
    }
    return '';
  }

  function initialsAvatar(name) {
    var parts = (name || 'YANC Connect').split(/\s+/);
    var initials = ((parts[0] || '')[0] || 'Y') + ((parts[1] || '')[0] || '');
    var seed = 0;
    for (var i = 0; i < name.length; i++) seed = (seed * 31 + name.charCodeAt(i)) % 360;
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">' +
      '<rect width="96" height="96" fill="hsl(' + seed + ' 22% 92%)"/>' +
      '<text x="48" y="60" text-anchor="middle" font-family="Plus Jakarta Sans,system-ui,sans-serif" ' +
      'font-size="34" font-weight="700" fill="hsl(' + seed + ' 30% 34%)">' +
      initials.toUpperCase() + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function guardAvatars() {
    Array.prototype.forEach.call(document.images, function (img) {
      if (img.getAttribute('data-yanc-fallback') !== null) return;
      if (/^data:/.test(img.currentSrc || img.src || '')) return;

      function swap() {
        if (img.getAttribute('data-yanc-fallback') !== null) return;
        img.setAttribute('data-yanc-fallback', '');
        img.src = initialsAvatar(nameFromImage(img));
      }

      // complete && naturalWidth === 0 means it already failed before we bound.
      if (img.complete && img.naturalWidth === 0) swap();
      else img.addEventListener('error', swap);
    });
  }

  /* ---------- shared helpers --------------------------------------- */

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- boot -------------------------------------------------- */

  function boot() {
    buildChrome();
    rewireLinks();
    guardAvatars();
    fixVaultTab();
    var fn = screens[currentId()];
    if (typeof fn === 'function') {
      try { fn(); } catch (e) { console.error('[yanc] screen wiring failed', e); }
    }
  }

  // Screens define their handlers in a trailing inline <script>, so wait
  // for the parser to finish before wrapping them.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.YANC = {
    read: read, write: write, toast: toast, personas: PERSONAS,
    journey: JOURNEY, reference: REFERENCE, go: go
  };
})();
