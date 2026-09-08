#!/usr/bin/env python3
"""Build the YANC 1-on-1 Connect user-flow demo.

Takes the nine standalone Stitch wireframe exports in ``src/screens`` and
stitches them into one navigable static site in ``docs``:

* injects the shared shell (``src/shell/flow.css`` / ``flow.js``) into every
  screen so they get the demo chrome, session state and real navigation;
* tags each ``<body>`` with ``data-yanc-screen`` so the shell knows which
  page-specific wiring to run;
* copies the authored pages and reference screenshots.

The screen exports themselves are never edited by hand — rerunning this
script reproduces ``docs`` from scratch.
"""

from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
SCREENS = SRC / "screens"
SHELL = SRC / "shell"
# Built site. Committed at docs/ so GitHub Pages can serve it straight from
# the branch, with no build step required on the hosting side.
DIST = ROOT / "docs"

# screen file -> body data-yanc-screen id
PAGES = {
    "gateway.html": "gateway",
    "founder.html": "founder",
    "console.html": "console",
    "mentor.html": "mentor",
    "governance.html": "governance",
    "journey.html": "journey",
    "wireframe-lofi.html": "wireframe-lofi",
    "wireframe-hifi.html": "wireframe-hifi",
    "wireframe-architecture.html": "wireframe-architecture",
}

HEAD_INJECT = (
    '<link rel="stylesheet" href="assets/flow.css"/>\n'
    '<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"/>\n'
    '<meta name="robots" content="noindex"/>\n'
)

BODY_INJECT = '<script src="assets/flow.js" defer></script>\n'

FAVICON = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
    '<rect width="32" height="32" rx="8" fill="#0b1220"/>'
    '<text x="16" y="22" font-family="system-ui,sans-serif" font-size="18" '
    'font-weight="800" fill="#ffffff" text-anchor="middle">Y</text></svg>'
)


def inject(html: str, screen_id: str) -> str:
    """Add the shell assets and screen id to one exported wireframe."""
    if "</head>" not in html:
        raise ValueError(f"{screen_id}: no </head> to inject into")

    html = html.replace("</head>", HEAD_INJECT + "</head>", 1)

    # Tag the body element with the screen id the shell dispatches on.
    match = re.search(r"<body\b([^>]*)>", html)
    if not match:
        raise ValueError(f"{screen_id}: no <body> tag found")
    attrs = match.group(1)
    html = (
        html[: match.start()]
        + f'<body{attrs} data-yanc-screen="{screen_id}">'
        + html[match.end() :]
    )

    # The shell must load after the screen's own trailing inline script so it
    # can wrap the handlers those scripts define.
    if "</body>" not in html:
        raise ValueError(f"{screen_id}: no </body> to inject into")
    return html.replace("</body>", BODY_INJECT + "</body>", 1)


def main() -> int:
    if not SCREENS.is_dir():
        print(f"error: {SCREENS} not found", file=sys.stderr)
        return 1

    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "assets").mkdir(parents=True)

    built = []
    for filename, screen_id in PAGES.items():
        source = SCREENS / filename
        if not source.is_file():
            print(f"error: missing screen {source}", file=sys.stderr)
            return 1
        (DIST / filename).write_text(
            inject(source.read_text(encoding="utf-8"), screen_id), encoding="utf-8"
        )
        built.append(filename)

    # Authored pages (not Stitch exports): the journey map and the
    # ecosystem flowchart redrawn from the supplied reference model.
    for authored in ("index.html", "architecture.html"):
        shutil.copy(SHELL / authored, DIST / authored)
        built.append(authored)

    shutil.copy(SHELL / "flow.css", DIST / "assets" / "flow.css")
    shutil.copy(SHELL / "flow.js", DIST / "assets" / "flow.js")
    (DIST / "assets" / "favicon.svg").write_text(FAVICON, encoding="utf-8")

    # Reference screenshots of the original exports, shown on the map.
    reference = SRC / "reference"
    if reference.is_dir():
        shutil.copytree(reference, DIST / "reference")

    # GitHub Pages must not run the output through Jekyll.
    (DIST / ".nojekyll").write_text("", encoding="utf-8")

    print(f"built {len(built)} pages into {DIST.relative_to(ROOT)}/")
    for name in sorted(built):
        print(f"  {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
