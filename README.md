# YANC 1-on-1 Connect — user-flow demo

Nine standalone wireframe exports, connected into one navigable product walkthrough.

**Live demo:** https://goldenduckwithsilverspoon.github.io/Yanc/ — *available once GitHub Pages
is switched on for this repository; see [Deploying](#deploying). The site is committed at
`docs/`, so enabling Pages is the only step left.*

YANC 1-on-1 Connect is institutional-grade advisory infrastructure: founders book verified
mentors and angel investors, session money sits in escrow until the meeting is proven, and
every release is written to an immutable ledger. This repo turns the design exports for that
product into a demo you can actually click through — state you create on one screen shows up
on the next.

---

## The journey

| Step | Screen | What happens | What carries forward |
|------|--------|--------------|----------------------|
| — | `index.html` | Journey map and entry point | — |
| 1 | `gateway.html` | Pick one of five security personas and sign in | persona, credit wallet |
| 2 | `founder.html` | Founder workspace: escrow, NDAs, vault, matched advisors | reads persona, shows bookings |
| 3 | `console.html` | Mentor directory, format and price selection, confirm a slot | writes a booking, spends credits |
| 4 | `mentor.html` | Advisor sees the request, runs the session, releases escrow against the founder's 4-digit venue code | escrow release |
| 5 | `governance.html` | Root clearance: approve advisors, grant credits, resolve the open dispute | audit ledger entries |

Reference screens, reachable from the map and the screen menu:

- `architecture.html` — the ecosystem and multi-persona flowchart, redrawn as a live page
- `journey.html` — interactive booking-flow spec (entry → category → matching → escrow terminal)
- `wireframe-lofi.html` / `wireframe-hifi.html` / `wireframe-architecture.html` — the three
  fidelity levels the console was designed against

## Personas

The six personas from the ecosystem flowchart, and where each one lands:

| Persona | Onboarding gate | Destination |
|---------|-----------------|-------------|
| YANC Member | whitelist verification → OTP | founder workspace (credits) |
| Non-Member Founder | application review | booking console (direct INR checkout) |
| Verified Mentor | credential vetting | advisor board |
| Tiered Investor | tier verification | advisor board |
| Ops Admin | staff provisioning | console → ops governance queue |
| Finance Admin | staff provisioning | console → finance escrow controls |

Super Admin (root custody clearance) sits above these on `governance.html`.

Ledger rules every screen is priced against: **1 credit = ₹100**; members pay 1 credit for a
45-minute online call and 2 for a 60-minute offline session; non-members pay ₹500 / ₹1,500
directly into escrow; mentors have a **48-hour response SLA**; escrow release is **dual-key**
(founder's venue code plus advisor confirmation).

---

## How it is put together

The nine exports in `src/screens/` are **never edited by hand**. A build step injects one
shared shell into each of them:

```
src/screens/*.html      the untouched wireframe exports
src/shell/flow.js       session state, navigation wiring, per-screen behaviour
src/shell/flow.css      demo chrome — all selectors namespaced .yanc-*
src/shell/index.html    the journey map (authored)
src/shell/architecture.html  the ecosystem flowchart (authored)
src/reference/          original export screenshots + the source flowchart
scripts/build.py        injects the shell, emits docs/
scripts/vendor-tailwind.mjs  compiles each page's Tailwind config (drops the CDN)
scripts/vendor-fonts.mjs     self-hosts the fonts and subsets the icon font
scripts/bundle-single.mjs    bundles docs/ into one self-contained HTML file
scripts/smoke.mjs       Playwright walk-through of the whole journey
scripts/smoke-single.mjs     the same walk-through against the single-file bundle
```

The shell is namespaced so it never collides with a screen's own styling — the exports ship
four different Tailwind colour systems between them.

### What the shell fixes

The exports arrived as unlinked pages whose controls ended in `alert()`:

- **Dead navigation.** Every `href="#"` nav item — Gateway, Founder Deck, Advisory Board,
  Governance, Audit Ledger, Role Gateway, Mentee Dashboard — now resolves to the screen it
  names. Controls genuinely out of scope say so instead of silently doing nothing.
- **A dead-end sign-in.** The gateway's submit handler ended in an alert. It now stores the
  persona and routes to that role's console.
- **An empty tab.** Both the HubSpot console and the role-architecture console shipped a
  "Pitch Decks & Vault" tab with no matching `#view-vault`, so selecting it blanked the
  workspace. The shell builds the missing view, styled to match.
- **Blocking dialogs.** `alert()` is replaced by toasts that name the next step and link to the
  screen where it happens.
- **No shared state.** Persona, credits, bookings, escrow release and dispute outcome live in
  `sessionStorage`, so booking a mentor in step 3 shows up on the founder workspace and on the
  mentor's inbound queue.
- **A booking that silently failed.** The advisory-objective field is `required` and shipped
  empty, so the first click on "Confirm booking" did nothing visible. It is now seeded with a
  plausible brief — still editable, still required — and the objective travels with the booking
  to the mentor's queue.
- **Third-party fragility.** The exports loaded Tailwind from a CDN that compiles in the browser,
  pulled three stylesheets from Google Fonts, and pointed every headshot at ephemeral Google CDN
  URLs. Tailwind and the fonts are now compiled and self-hosted (a deferred script does not run
  until pending stylesheets resolve, so a slow Google Fonts left the whole shell unbooted), and
  any headshot that fails to load falls back to a generated initials avatar.

---

## Running it

```bash
npm install
npm run build     # emits docs/
npm run serve     # http://localhost:8000
```

`npm run build` runs three steps:

1. `scripts/build.py` injects the shell into each export and copies the authored pages.
2. `scripts/vendor-tailwind.mjs` compiles each page's own Tailwind config to a static
   stylesheet, replacing the Play CDN.
3. `scripts/vendor-fonts.mjs` self-hosts the text faces and subsets Material Symbols to the
   66 icons the demo actually uses.

The built site is committed at `docs/` so GitHub Pages can serve it straight from the branch
with no build step on the hosting side; CI rebuilds it on every push so it cannot drift.

Open <http://localhost:8000>.

### Single-file build

```bash
npm run bundle    # -> docs-single/yanc-connect-demo.html
```

For hosts that take one file rather than a directory. Every stylesheet, script, font and image
is inlined, and each screen renders into a same-origin `srcdoc` iframe — iframes rather than one
merged document because the exports ship four incompatible Tailwind colour systems that would
otherwise fight. Sharing the parent's origin is what keeps `sessionStorage` carrying the demo
state between screens exactly as it does on the static site. The current screen is reflected in
the URL hash, so views are linkable and the back button steps through the walkthrough.

### Tests

```bash
npm test          # the static site
npm run test:single   # the single-file bundle
```

The smoke test serves `docs/`, walks the full journey in Chromium, and fails on any console
error, page error, failed same-origin request, dead navigation target, missing carried state,
or horizontal overflow at mobile width. Screenshots land in `.smoke-shots/`.

### Deploying

Pages has to be switched on once by a repository admin — the Actions token is not permitted to
create the Pages site itself. Either option works, and the built site is already committed:

- **Settings → Pages → Source: Deploy from a branch**, then pick this branch and the `/docs`
  folder. Nothing else to run; the link goes live in a minute or two.
- **Settings → Pages → Source: GitHub Actions.** `.github/workflows/deploy.yml` then rebuilds
  and publishes `docs/` on every push, and fails the run if the committed build is stale.

Until Pages is enabled the workflow still builds and verifies the site; it just skips the deploy
step and leaves a note saying why.

---

## Design references

`src/design/` holds the two design systems the screens were generated against:

- **Venture Human Interface** — achromatic executive direction (obsidian, hairline borders,
  Plus Jakarta Sans); used for the journey map.
- **Revenue Canvas** — the corporate SaaS direction (coral `#ff5c35`, deep navy, slate
  neutrals); used for the booking console.

`src/reference/` holds the original export screenshots and the source ecosystem flowchart the
architecture page was drawn from.

---

Prototype only. No real capital, custody, or personal data — all names, figures, ledgers and
escrow states are fabricated for the walkthrough.
