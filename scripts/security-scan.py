#!/usr/bin/env python3
"""Dependency-free security + structure scanner for the tr-fw static web app.

Scans .js / .html / .css for XSS/injection sinks, inline event handlers, inline
styles, inline scripts, external resources, a missing Content-Security-Policy and
obvious secrets. Exits 1 on any finding (blocks the commit / fails CI). No third-
party dependencies - runs on plain Python 3.

Used by the pre-commit git hook (.githooks/pre-commit) and the CI workflow
(.github/workflows/ci.yml). The shipped app stays pure vanilla JS with zero
runtime dependencies; this is a dev/CI tool only.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCLUDE_DIRS = {".git", "node_modules", ".github", "scripts"}
CODE_EXT = {".js", ".html", ".htm", ".css"}
ALL_TEXT = CODE_EXT | {".md", ".svg", ".json", ".txt"}

# (compiled regex, message, set-of-extensions-it-applies-to)
RULES = [
    # --- JavaScript injection / DOM-XSS sinks ---
    (r"\beval\s*\(",                       "eval() - code-injection sink",                 {".js", ".html"}),
    (r"\bnew\s+Function\s*\(",             "new Function() - code-injection sink",         {".js", ".html"}),
    (r"\.innerHTML\b",                     "innerHTML - DOM-XSS sink (use textContent)",   {".js", ".html"}),
    (r"\.outerHTML\s*=",                   "outerHTML assignment - DOM-XSS sink",          {".js", ".html"}),
    (r"\binsertAdjacentHTML\s*\(",         "insertAdjacentHTML - DOM-XSS sink",            {".js", ".html"}),
    (r"document\.write(ln)?\s*\(",         "document.write - XSS sink",                    {".js", ".html"}),
    (r"\b(setTimeout|setInterval)\s*\(\s*['\"`]", "timer with a string arg - implicit eval", {".js", ".html"}),
    (r"\.setAttribute\s*\(\s*['\"]on",     "setAttribute of an on* event handler",         {".js", ".html"}),
    (r"javascript:",                       "javascript: URI",                              {".js", ".html", ".css"}),
    # --- HTML structure / security ---
    (r"[\s\"']on[a-z]+\s*=",               "inline event handler (use addEventListener)",  {".html", ".htm"}),
    (r"\sstyle\s*=",                       "inline style attribute (use styles.css)",      {".html", ".htm"}),
    (r"<script(?![^>]*\ssrc=)[^>]*>\s*\S", "inline <script> (use an external .js)",        {".html", ".htm"}),
    (r"\bsrc\s*=\s*['\"](https?:)?//",     "external resource in src= (self-host it)",     {".html", ".htm"}),
    (r"<link\b[^>]*\bhref\s*=\s*['\"](https?:)?//", "external stylesheet/link resource (self-host it)", {".html", ".htm"}),
    # --- CSS ---
    (r"expression\s*\(",                   "CSS expression() - legacy IE XSS",             {".css", ".html"}),
    (r"^\s*@import",                       "CSS @import (inline the styles)",              {".css"}),
    (r"url\(\s*['\"]?\s*(https?:|//)",     "external url() in CSS",                        {".css", ".html"}),
    # --- secrets (all text files) ---
    (r"AKIA[0-9A-Z]{16}",                  "possible AWS access key",                      ALL_TEXT),
    (r"gh[pousr]_[A-Za-z0-9]{30,}",        "possible GitHub token",                        ALL_TEXT),
    (r"-----BEGIN[ A-Z]*PRIVATE KEY-----", "private key material",                         ALL_TEXT),
    (r"eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.", "possible JWT",                       ALL_TEXT),
]
COMPILED = [(re.compile(rx, re.IGNORECASE), msg, exts) for rx, msg, exts in RULES]

# target=_blank without rel=noopener (reverse tabnabbing) - checked per-line, tag-aware.
ALLOW = re.compile(r"scan-ok:\s*\S")
BLANK = re.compile(r"target\s*=\s*['\"]_blank['\"]", re.IGNORECASE)
NOOPENER = re.compile(r"rel\s*=\s*['\"][^'\"]*noopener", re.IGNORECASE)


def scan_file(path, findings):
    ext = os.path.splitext(path)[1].lower()
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except Exception as e:
        findings.append((path, 0, "could not read: %s" % e))
        return
    text = "".join(lines)

    for i, line in enumerate(lines, 1):
        # A sink that is meant to be there carries its reason on the same line as
        # "scan-ok: <why>". Without a reason the marker does not count, so the
        # exception cannot be waved through silently.
        allowed = ALLOW.search(line)
        for rx, msg, exts in COMPILED:
            if ext in exts and rx.search(line) and not allowed:
                findings.append((path, i, msg))
        if ext in {".html", ".htm"} and BLANK.search(line) and not NOOPENER.search(line):
            findings.append((path, i, "target=_blank without rel=noopener"))

    # Every HTML page must ship a Content-Security-Policy meta tag.
    if ext in {".html", ".htm"} and "content-security-policy" not in text.lower():
        findings.append((path, 0, "missing Content-Security-Policy meta tag"))


def main():
    findings = []
    scanned = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            if ext in ALL_TEXT:
                scan_file(os.path.join(dirpath, name), findings)
                scanned += 1

    if findings:
        print("SECURITY SCAN: %d finding(s)\n" % len(findings))
        for path, line, msg in findings:
            rel = os.path.relpath(path, ROOT).replace("\\", "/")
            loc = "%s:%d" % (rel, line) if line else rel
            print("  [FAIL] %-40s %s" % (loc, msg))
        print("\nCommit blocked. Fix the findings above (or justify + adjust scripts/security-scan.py).")
        return 1

    print("SECURITY SCAN: OK - %d files, no findings." % scanned)
    return 0


if __name__ == "__main__":
    sys.exit(main())
