"use strict";

// Page wiring. Bump BUILD together with the ?v= on every script tag in
// index.html, so a cached script and a fresh page can never disagree.
var BUILD = "v35";

var lang = "de";   // German is the default; the switcher is right at the top for everyone else
var loaded = null;   // { name, text } of a file that passed the approval check

document.getElementById("pageBuild").textContent = BUILD;

function t(key) {
  var d = window.I18N[lang];
  return (d && d[key]) || "";
}

function applyLang() {
  document.documentElement.lang = lang;
  var nodes = document.querySelectorAll("[data-t]");
  for (var i = 0; i < nodes.length; i++) {
    var key = nodes[i].getAttribute("data-t");
    var val = t(key);
    // Anything carrying a tag or an entity goes in as markup; the rest is plain text. Testing
    // for the tag alone left an entity to show up raw in the page.
    if (/[<&]/.test(val)) nodes[i].innerHTML = val;   // scan-ok: our own translation table, the only markup is <b>, <a> and <br>
    else nodes[i].textContent = val;
  }
  // The href is only the fallback for opening in a new tab, but it follows the
  // language as well, so a long press never lands on the other language.
  document.getElementById("readmeLink").href = docFile("README");
  document.getElementById("changelogLink").href = docFile("CHANGELOG");
  document.getElementById("privacyLink").href = docFile("PRIVACY");
  document.getElementById("licenseLink").href = docFile("LICENSE");
  document.getElementById("trademarksLink").href = docFile("TRADEMARKS");
  document.getElementById("docX").setAttribute("aria-label", t("docClose"));
  document.getElementById("eeX").setAttribute("aria-label", t("docClose"));
  renderEeCheck();
  labelTheme();
  renderVariantOptions();
  renderClampOptions();
  renderFeatures();
  // After the build list, because the points the dialog shows depend on the picked build.
  renderDlgPoints();

  var btns = document.querySelectorAll(".langs button");
  for (var j = 0; j < btns.length; j++) {
    btns[j].setAttribute("aria-pressed", String(btns[j].dataset.lang === lang));
  }
  document.getElementById("out").textContent = "";
  if (loaded) showVerdict(window.identify(loaded.text), loaded.name);
}

var langButtons = document.querySelectorAll(".langs button");
for (var b = 0; b < langButtons.length; b++) {
  langButtons[b].addEventListener("click", function () {
    lang = this.dataset.lang;
    // Someone arriving at .../#disclaimer meant the terms, an address written in the documents.
if (location.hash.replace("#", "").toLowerCase().indexOf("disclaimer") === 0) openDisclaimer();

applyLang();
  });
}

// The builds, in the order they are offered. Everything about a build that the
// page shows is looked up from here, so another one is one row.
var BUILDS = [
  { key: "standard",    title: "varStdTitle",   when: "varStdWhen",   extra: "featStdExtra",   stamp: "FW_BUILD" },
  { key: "kickstart",   title: "varKickTitle",  when: "varKickWhen",  extra: "featKickExtra",  stamp: "FW_BUILD_KICK" },
  { key: "eepromerase", title: "varEraseTitle", when: "varEraseWhen", extra: "featEraseExtra", stamp: "FW_BUILD_ERASE", tag: "ee" }
];

// The clamp and the blinker belong to the lock: the clamp bytes sit in core's own
// cave and the blinker rows are placed next to the wheel rows. A build that does
// not carry core takes neither and the group list in the patcher decides that,
// so the page cannot drift away from what the file actually gets.
function carriesLock(key) {
  var v = window.OTA.VARIANTS[key];
  return !!v && v.groups.indexOf("CORE") >= 0;
}

// What ends the file name. A build that writes the version byte is named after the
// version it will report; a build that leaves that byte alone gets its own short tag,
// because a number there would name nothing the rider can read off the scooter.
function fileTag(variant) {
  for (var i = 0; i < BUILDS.length; i++) {
    if (BUILDS[i].key === variant.key && BUILDS[i].tag) return BUILDS[i].tag;
  }
  return "V" + variant.stamp;
}

// The two locked clamps. Both lists hold the same values, so the only thing that
// can be picked is a number the firmware is known to accept.
function renderClampOptions() {
  ["clampStock", "clampRelock"].forEach(function (id) {
    var sel = document.getElementById(id);
    var keep = sel.value;
    sel.textContent = "";
    window.OTA.CLAMP_VALUES.forEach(function (v) {
      var o = el("option", null, String(v));
      o.value = String(v);
      sel.appendChild(o);
    });
    sel.value = keep || String(window.OTA.CLAMP_DEFAULT);
  });
}

// Option labels carry the version number, so the list itself says which build is which.
// Only a build that writes the version byte has one; the others say so rather than
// showing a number the scooter never reports.
function renderVariantOptions() {
  var sel = document.getElementById("variant");
  var keep = sel.value;
  sel.textContent = "";
  for (var i = 0; i < BUILDS.length; i++) {
    var b = BUILDS[i];
    var badge = carriesLock(b.key) ? "V" + window.OTA[b.stamp] : t("varNoVersion");
    var o = el("option", null, t(b.title) + "  ·  " + badge);
    o.value = b.key;
    sel.appendChild(o);
  }
  sel.value = keep || BUILDS[0].key;
}

// All three lines at once, the chosen one marked, so the reason to switch is readable
// without opening the list.
function renderGuide() {
  var host = document.getElementById("varGuide");
  if (!host) return;
  host.textContent = "";
  var now = selectedVariant();
  for (var i = 0; i < BUILDS.length; i++) {
    var li = el("li");
    if (BUILDS[i].key === now) li.className = "on";
    li.innerHTML = t(BUILDS[i].when);   // scan-ok: our own translation table, the only markup is <b>
    host.appendChild(li);
  }
}

function currentBuild() {
  for (var i = 0; i < BUILDS.length; i++) if (BUILDS[i].key === selectedVariant()) return BUILDS[i];
  return BUILDS[0];
}

// The feature list follows the selected build. The common points describe the lock,
// so only a build that carries it gets them; the rest is built from its own list alone.
function renderFeatures() {
  var host = document.getElementById("featureList");
  if (!host) return;
  var d = window.I18N[lang] || {};
  var b = currentBuild();
  var common = carriesLock(b.key) ? (d.featCommon || []) : [];
  var items = common.slice().concat(d[b.extra] || []);
  host.textContent = "";
  for (var i = 0; i < items.length; i++) host.appendChild(el("li", null, items[i]));
  renderGuide();
  syncOptionState();
}

// The clamp and the blinker steps are taken off the page for a build that carries
// no lock: they decide nothing there and a greyed-out step still reads as a choice.
// The controls stay disabled as well, so a hidden step cannot be submitted either.
// The blinker tick is cleared with them: left on it would be patched into a file
// that is meant to leave the flash otherwise stock.
function syncOptionState() {
  var on = carriesLock(selectedVariant());
  var blinker = document.getElementById("blinker");
  if (!on) blinker.checked = false;
  blinker.disabled = !on;
  document.getElementById("clampStock").disabled = !on;
  document.getElementById("clampRelock").disabled = !on;
  document.getElementById("stepClamp").hidden = !on;
  document.getElementById("stepBlinker").hidden = !on;
  document.getElementById("lockNote").hidden = !on;
}

function selectedVariant() {
  return document.getElementById("variant").value || "standard";
}

var buildBtn = document.getElementById("build");
buildBtn.disabled = true;
document.getElementById("patchable").hidden = true;

function el(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function showError(msg) {
  var out = document.getElementById("out");
  out.textContent = "";
  var box = el("div", "report bad");
  box.appendChild(el("h3", null, t("badTitle")));
  box.appendChild(el("pre", "err", msg));
  out.appendChild(box);
}

function showResult(res) {
  var out = document.getElementById("out");
  out.textContent = "";
  var box = el("div", "report");
  box.appendChild(el("h3", null, t("okTitle")));

  var dl = el("dl", "facts");
  var facts = [[t("fSource"), loaded.name],
   [t("fBase"), "R" + res.base.version]];
  // Only a build that writes the version byte can name what the scooter will report
  // afterwards. The other one leaves that field untouched, so no number belongs here.
  var writesVersion = res.groups.indexOf("CORE") >= 0;
  facts.push([t("fVersion"), writesVersion ? "V" + res.variant.stamp : t("fVersionKept")]);
  // The clamp line is left out for a build that receives no clamp byte, rather than
  // naming two numbers that are nowhere in the file.
  if (writesVersion) {
    facts.push([t("fClamp"), res.clampStock + " / " + res.clampRelock]);
  }
  facts.push([t("fBytes"), res.appBytes.toLocaleString(lang)],
   [t("fCrc"), res.crc.toString(16).toUpperCase().padStart(4, "0")],
   [t("fGroups"), res.groups.join(", ").toLowerCase()]);
  facts.forEach(function (row) {
    dl.appendChild(el("dt", null, row[0]));
    dl.appendChild(el("dd", null, row[1]));
  });
  box.appendChild(dl);

  // The base version belongs in the file name: the same build number exists for
  // both. Flashing the one for the other version bricks the scooter.
  var name = "AWIVCU_APP_R" + res.base.version.replace(/\./g, "_") + "_" + fileTag(res.variant) + ".hex";
  var a = el("a", "get", t("download") + "  (" + name + ")");
  a.href = URL.createObjectURL(new Blob([res.text], { type: "text/plain" }));
  a.download = name;
  box.appendChild(a);

  out.appendChild(box);
}

// One verdict box for the uploaded file, so the rider sees which check failed
// rather than a blanket refusal.
function showVerdict(id, name) {
  var box = el("div", "verdict" + (id.ok ? "" : " bad"));
  var key = id.ok ? "okStock" : "bad" + id.reason.charAt(0).toUpperCase() + id.reason.slice(1);
  box.appendChild(el("b", null, t(key).replace("{v}", id.version || "")));
  if (id.reason !== "unreadable") {
    box.appendChild(el("span", "detail", name + "   v" + id.version + "   " + id.bytes
      + " B   CRC " + id.crc.toString(16).toUpperCase().padStart(4, "0")));
  }
  var host = document.getElementById("check");
  host.textContent = "";
  host.appendChild(box);
}

function accept(name, text) {
  var id = window.identify(text);
  showVerdict(id, name);
  document.getElementById("out").textContent = "";
  loaded = id.ok ? { name: name, text: text } : null;
  document.getElementById("patchable").hidden = !id.ok;
  buildBtn.disabled = !id.ok;
}

function readFile(f) {
  if (!f) return;
  var r = new FileReader();
  r.onload = function () { accept(f.name, String(r.result)); };
  r.onerror = function () { showError("could not read " + f.name); };
  r.readAsText(f);
}

var drop = document.getElementById("drop");
var fileInput = document.getElementById("file");
drop.addEventListener("click", function () { fileInput.click(); });
drop.addEventListener("keydown", function (e) {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener("change", function () { readFile(fileInput.files[0]); });
["dragenter", "dragover"].forEach(function (ev) {
  drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
});
["dragleave", "drop"].forEach(function (ev) {
  drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
});
drop.addEventListener("drop", function (e) {
  if (e.dataTransfer && e.dataTransfer.files.length) readFile(e.dataTransfer.files[0]);
});

function doBuild() {
  try {
    var res = window.build(loaded.text, selectedVariant(), {
      // Asked of the build, not only of the tick: the patcher places the blinker rows
      // relative to the wheel rows, so a build without them would still receive it.
      blinker: carriesLock(selectedVariant()) && document.getElementById("blinker").checked,
      clampStock: Number(document.getElementById("clampStock").value),
      clampRelock: Number(document.getElementById("clampRelock").value)
    });
    showResult(res);
  } catch (e) {
    showError(e && e.message ? e.message : String(e));
  }
}

// The warning is shown on the build press, not buried in the footer, because it
// is the moment the rider decides.
var dlg = document.getElementById("warn");
// The build button stays dead until the rider says they read the disclaimer.
var dlgConsent = document.getElementById("dlgConsent");
function syncBuildConsent() {
  document.getElementById("dlgYes").disabled = !dlgConsent.checked;
}

// The eraser rides exactly like the series firmware, so it reads its own points:
// the unlock list would tell the rider things that are not true for that build.
function disclaimerPoints() {
  var d = window.I18N[lang] || {};
  return (selectedVariant() === "eepromerase" ? d.dlgPointsErase : d.dlgPoints) || [];
}

// Rebuilt on every build press as well as on a language switch, because the
// picked build can change without the language changing.
function renderDlgPoints() {
  var list = document.getElementById("dlgList");
  list.textContent = "";
  var pts = disclaimerPoints();
  for (var p = 0; p < pts.length; p++) {
    var li = document.createElement("li");
    li.innerHTML = pts[p];   // scan-ok: disclaimer points from our own translation table
    list.appendChild(li);
  }
}

buildBtn.addEventListener("click", function () {
  renderDlgPoints();
  // Asked fresh every time: the tick from the previous dialog never carries over.
  dlgConsent.checked = false;
  syncBuildConsent();
  if (typeof dlg.showModal === "function") { dlg.showModal(); dlg.scrollTop = 0; }
  else doBuild();
});
document.getElementById("dlgNo").addEventListener("click", function () { dlg.close(); });
dlgConsent.addEventListener("change", syncBuildConsent);
document.getElementById("dlgYes").addEventListener("click", function () {
  if (!dlgConsent.checked) return;
  dlg.close();
  doBuild();
});

// ---------------------------------------------------------------------------
// Document viewer
// ---------------------------------------------------------------------------

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Our own documents, so a link between them opens in the viewer instead of
// handing the reader a raw markdown file.
var DOC_TITLES = {
  "CHANGELOG.de.md": "changelog", "CHANGELOG.en.md": "changelog",
  "PRIVACY.de.md": "privacy", "PRIVACY.en.md": "privacy",
  "LICENSE.md": "license", "LICENSE.de.md": "license",
  "TRADEMARKS.md": "trademarks", "TRADEMARKS.de.md": "trademarks",
  "README.md": "readme"
};

// Only the markdown the shipped documents actually use: headings, lists, fenced
// code, quotes, rules, bold, inline code and links. No tables, no nesting.
// GitHub's heading slugs, so an anchor written inside a document keeps working here.
function slug(s) {
  // One space becomes one dash, runs are NOT collapsed: a code host drops the punctuation
  // first, so "Disclaimer & Trademarks" ends up with two dashes and an anchor written for
  // that host has to find the same id here.
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9 _-]/g, "")
    .replace(/ /g, "-");
}

function mdToHtml(src) {
  function inline(s) {
    return escHtml(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Triple before double: the greedy ** rule alone eats only two of the three
      // asterisks on each side of ***text***, leaving one stray literal behind.
      .replace(/\*\*\*([^*]+)\*\*\*/g, "<b><i>$1</i></b>")
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (all, text, href) {
        if (DOC_TITLES[href]) {
          return '<a href="' + href + '" data-docfile="' + href
               + '" data-doc-title="' + DOC_TITLES[href] + '">' + text + "</a>";
        }
        // An anchor belongs to the document being read, so it scrolls instead of
        // opening a tab on an address that answers to nothing.
        if (href.charAt(0) === "#") {
          return '<a href="' + href + '" data-anchor="' + href.slice(1) + '">' + text + "</a>";
        }
        // A link into a heading of one of our other documents: open that document
        // in the viewer, then land on the same heading an in-page anchor would.
        var hashAt = href.indexOf("#");
        if (hashAt > 0 && DOC_TITLES[href.slice(0, hashAt)]) {
          var base = href.slice(0, hashAt);
          return '<a href="' + href + '" data-docfile="' + base
               + '" data-doc-title="' + DOC_TITLES[base]
               + '" data-doc-anchor="' + href.slice(hashAt + 1) + '">' + text + "</a>";
        }
        return '<a href="' + href + '" target="_blank" rel="noopener">' + text + "</a>";
      });
  }

  var lines = String(src).replace(/\r\n?/g, "\n").split("\n");
  var out = [], para = [], list = null, inFence = false;

  function flushPara() {
    if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; }
  }
  function closeList() { if (list) { out.push("</" + list + ">"); list = null; } }
  function openList(kind) {
    flushPara();
    if (list !== kind) { closeList(); out.push("<" + kind + ">"); list = kind; }
  }
  function block() { flushPara(); closeList(); }
  function cells(l) {
    return l.replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); });
  }

  for (var i = 0; i < lines.length; i++) {
    var l = lines[i], m;

    if (inFence) {
      if (l.indexOf("```") === 0) { out.push("</code></pre>"); inFence = false; }
      else out.push(escHtml(l));
      continue;
    }
    if (l.indexOf("```") === 0) { block(); out.push("<pre><code>"); inFence = true; continue; }
    if (/^\s*$/.test(l)) { block(); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { block(); out.push("<hr>"); continue; }
    // A header row followed by a divider row starts a table. The box around it scrolls,
    // so a wide table never pushes the page sideways on a phone.
    if (l.trim().indexOf("|") === 0
        && /^\|[\s:|-]+\|?\s*$/.test((lines[i + 1] || "").trim())) {
      block();
      out.push('<div class="doc-table"><table><thead><tr>'
        + cells(l.trim()).map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("")
        + "</tr></thead><tbody>");
      i++;
      while (i + 1 < lines.length && lines[i + 1].trim().indexOf("|") === 0) {
        out.push("<tr>"
          + cells(lines[++i].trim()).map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("")
          + "</tr>");
      }
      out.push("</tbody></table></div>");
      continue;
    }
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) {
      block();
      out.push("<h" + m[1].length + ' id="' + slug(m[2]) + '">' + inline(m[2])
               + "</h" + m[1].length + ">");
      continue;
    }
    if ((m = l.match(/^>\s?(.*)$/))) {
      block();
      out.push("<blockquote>" + inline(m[1]) + "</blockquote>");
      continue;
    }
    if ((m = l.match(/^[-*]\s+(.*)$/))) { openList("ul"); out.push("<li>" + inline(m[1]) + "</li>"); continue; }
    if ((m = l.match(/^\d+\.\s+(.*)$/))) { openList("ol"); out.push("<li>" + inline(m[1]) + "</li>"); continue; }
    para.push(l.trim());
  }
  if (inFence) out.push("</code></pre>");
  block();
  return out.join("\n");
}

// The documents are fetched from this site, so a reader is never handed off to a
// code host to read a privacy policy or a licence.
var docDlg = document.getElementById("doc");
var docCache = {};

// CHANGELOG and PRIVACY exist per language. LICENSE and TRADEMARKS keep the plain
// name for English, because LICENSE.md is the file GitHub reads and the binding
// wording of the licence.
function docFile(name) {
  if (name === "CHANGELOG" || name === "PRIVACY") return name + "." + lang + ".md";
  if (name === "README") return "README.md";   // only exists in English
  return lang === "de" ? name + ".de.md" : name + ".md";
}

function openDoc(name, titleKey) {
  openDocFile(docFile(name), titleKey);
}

// Shared with the click delegate below, so an anchor lands the same way whether
// it points into the document already open or into one just fetched for it.
function scrollDocTo(anchor) {
  var body = document.getElementById("docBody");
  var target = body ? body.querySelector("#" + CSS.escape(anchor)) : null;
  if (target) body.scrollTop = target.offsetTop - body.offsetTop;
}

function openDocFile(file, titleKey, anchor) {
  var body = document.getElementById("docBody");
  // A document in the other language is labelled as such, so nobody wonders why
  // the licence suddenly reads English.
  var isGerman = file.indexOf(".de.") >= 0;
  var title = t(titleKey) || file;
  if (isGerman !== (lang === "de")) title += " " + t(isGerman ? "docGerman" : "docEnglish");
  document.getElementById("docTitle").textContent = title;
  if (typeof docDlg.showModal === "function") docDlg.showModal();

  if (docCache[file]) {
    body.innerHTML = docCache[file];   // scan-ok: markdown of our own documents, rendered by mdToHtml which escapes first
    body.scrollTop = 0;
    if (anchor) scrollDocTo(anchor);
    return;
  }
  body.innerHTML = "<p>" + escHtml(t("docLoading")) + "</p>";   // scan-ok: escaped
  // Same marker the script tags carry: without it a document stays in the browser cache
  // across builds and a reader keeps seeing the text from the first time they opened it.
  fetch(file + "?v=" + BUILD).then(function (r) {
    if (!r.ok) throw new Error(r.status + " " + r.statusText);
    return r.text();
  }).then(function (txt) {
    docCache[file] = mdToHtml(txt);
    body.innerHTML = docCache[file];   // scan-ok: markdown of our own documents, rendered by mdToHtml which escapes first
    body.scrollTop = 0;
    if (anchor) scrollDocTo(anchor);
  })["catch"](function (e) {
    body.innerHTML = "<p>" + escHtml(t("docFail")) + "</p><pre class=\"err\">" + file + ": "   // scan-ok: escaped
                   + escHtml(e && e.message ? e.message : String(e)) + "</pre>";
  });
}

// Delegated, because the changelog link in the notes is re-created on every
// language switch.
document.addEventListener("click", function (e) {
  if (!e.target.closest) return;
  var jump = e.target.closest("[data-anchor]");
  if (jump) {
    e.preventDefault();
    scrollDocTo(jump.getAttribute("data-anchor"));
    return;
  }
  var a = e.target.closest("[data-doc], [data-docfile]");
  if (!a) return;
  e.preventDefault();
  var titleKey = a.getAttribute("data-doc-title") || a.getAttribute("data-t");
  var file = a.getAttribute("data-docfile");
  if (file) openDocFile(file, titleKey, a.getAttribute("data-doc-anchor"));
  else openDoc(a.getAttribute("data-doc"), titleKey);
});
document.getElementById("docX").addEventListener("click", function () { docDlg.close(); });
document.getElementById("docClose").addEventListener("click", function () { docDlg.close(); });

// The footer shows the same warning to read, in the document viewer: no confirm
// button at all, so reading the terms can never start a build.
function openDisclaimer() {
  var body = document.getElementById("docBody");
  document.getElementById("docTitle").textContent = t("disclaimer");
  var html = "<p>" + t("dlgLede") + "</p><ul>";
  var pts = disclaimerPoints();
  for (var i = 0; i < pts.length; i++) html += "<li>" + pts[i] + "</li>";
  body.innerHTML = html + "</ul>";   // scan-ok: escaped lede, list items from our own translation table
  body.scrollTop = 0;
  if (typeof docDlg.showModal === "function") docDlg.showModal();
}
document.getElementById("disclaimerLink").addEventListener("click", function (e) {
  e.preventDefault();
  openDisclaimer();
});

document.getElementById("variant").addEventListener("change", renderFeatures);

// ---------------------------------------------------------------------------
// EEPROM check
// ---------------------------------------------------------------------------
// Reads the settings the scooter streams by itself and shows them beside the
// factory table. Independent of the build steps: a rider takes one reading
// before the flash and one after, wherever that flash happened.

var eeDlg = document.getElementById("ee");
var eeBtn = document.getElementById("eeBtn");
var eeSnap = null;                    // the last frame the scooter sent, also what the copy button writes
// One entry per gear, keyed by the reported gear number. The echo only ever carries the
// active gear, so the picture is built up as the rider switches; an entry stays once it
// is there. Gears 1 to 3 stand there empty from the start, any other reported gear adds
// its own entry, and its own column, as it arrives.
var eeGears = eeSeedGears();
// name, frameNum, swVer and fwBuild each arrive on their own schedule, not with
// every 55 71, so this fills in field by field and keeps what it already has.
var eeIdentity = {};
var eeOpenHelp = null;                // key of the one open explanation, null while all are closed
var eeSig = "";                       // what the window last drew, so a stream of equal frames redraws nothing
// Unsupported until proven otherwise, so a browser without Web Bluetooth is told
// so even if ble.js never loaded at all.
var eeState = (window.TrFwBLE && window.TrFwBLE.supported) ? "idle" : "unsupported";

// The factory value of a per-gear row is not one number but a ladder: the table
// holds one entry per gear, read at the gear the scooter is reporting. Both level
// rows carry the gear number in each of their two nibbles.
var EE_ASSIST_LADDER = [0, 20, 40, 60, 80, 100];
var EE_LEVEL_LADDER = [0, 1, 2, 3, 4, 5];

// The values that belong to one gear alone, one column each. gear1 and ladder are the
// factory values for a single gear, so each of them is read against the gear of its own
// row. eabsLevel is one shared value for the gear, not a front/rear pair: the start
// level is the only thing that genuinely differs between front and rear.
var EE_GEAR_ROWS = [
  { key: "eeFront",       field: "fCurrent",         fmt: "num", gear1: 15, note: "eeCurrentNote" },
  { key: "eeRear",        field: "rCurrent",         fmt: "num", gear1: 15, note: "eeCurrentNote" },
  { key: "eeEabsLevel",   field: "eabsLevel",        fmt: "num", ladder: EE_LEVEL_LADDER, note: "eeEabsLevelNote" },
  { key: "eeFrontStart",  field: "fStartLevel",      fmt: "num", ladder: EE_LEVEL_LADDER, note: "eeStartLevelNote" },
  { key: "eeRearStart",   field: "rStartLevel",      fmt: "num", ladder: EE_LEVEL_LADDER, note: "eeStartLevelNote" },
  { key: "eeGearSpeed",   field: "assistSpeedLimit", fmt: "num", ladder: EE_ASSIST_LADDER, note: "eeGearSpeedNote" }
];

// One explanation for the whole gear table: what it says is true of every row in it,
// so it hangs on the heading rather than on one of the five.
var EE_GEAR_NOTE = "eeGearNote";

// The rows that hold one value for the whole scooter, in the order the window and the
// copied text both use. factory is the value the genuine factory table holds; a row
// without one keeps a dash rather than a guessed number.
var EE_GLOBAL_ROWS = [
  { key: "eeCruise",     field: "cruise",         fmt: "cruise", factory: 0, note: "eeCruiseNote" },
  { key: "eeEabs",       field: "eabsOn",         fmt: "bool", factory: false, note: "eeEabsNote" },
  { key: "eeKick",       field: "zeroStart",      fmt: "bool", factory: false, note: "eeKickNote" },
  { key: "eeRearMotor",  field: "rearMotorFree",  fmt: "bool", factory: true, note: "eeRearMotorNote" },
  { key: "eeDoubleMotor", field: "doubleMotor",   fmt: "bool", factory: true, note: "eeDoubleMotorNote" },
  { key: "eeSmart",      field: "smartMode",      fmt: "bool", factory: false, note: "eeSmartNote" },
  { key: "eeAtMode",     field: "atMode",         fmt: "bool", factory: false, note: "eeAtModeNote" },
  { key: "eeMiles",      field: "unitMiles",      fmt: "bool", factory: false, note: "eeMilesNote" },
  { key: "eeEco",        field: "ecoMode",        fmt: "bool", note: "eeEcoNote" },
  { key: "eeSpeed",      field: "speedLimit",     fmt: "num", factory: 100, note: "eeSpeedNote" },
  { key: "eeTemp",       field: "sysProTemp",     fmt: "num", factory: 120, note: "eeTempNote" },
  { key: "eeVoltCode",   field: "voltCode",       fmt: "num", factory: 48, note: "eeVoltCodeNote" },
  { key: "eePackVolt",   field: "packVolt",       fmt: "num", factory: 60, note: "eePackVoltNote", warn: "eeVoltCodeWarn" },
  { key: "eeWheel",      field: "wheelInches",    fmt: "inch", factory: 10, dim: true, note: "eeWheelNote" },
  { key: "eePoles",      field: "motorPolePairs", fmt: "num", dim: true, note: "eePolesNote" }
];

// Not EEPROM settings, the scooter's own identity and which firmware it is running,
// shown above the settings because they answer "did my flash take" directly. name and
// frameNum both name the same scooter two different ways, shown side by side so a
// mismatch (a renamed BLE name, say) is visible instead of hidden behind a fallback.
var EE_IDENTITY_ROWS = [
  { key: "eeFin",             field: "name",     note: "eeFinNote" },
  { key: "eeFrameNum",        field: "frameNum", note: "eeFrameNumNote" },
  { key: "eeSwVer",           field: "swVer",   fmt: "swver",   note: "eeSwVerNote" },
  { key: "eeFwBuild",         field: "fwBuild", fmt: "fwbuild", note: "eeFwBuildNote" },
  { key: "eeIdByte03",        field: "idByte03", fmt: "num", note: "eeIdByte03Note" },
  { key: "eeIdByte06",        field: "idByte06", fmt: "num", note: "eeIdByte06Note" },
  { key: "eeIdByte07",        field: "idByte07", fmt: "num", note: "eeIdByte07Note" },
  { key: "eeIdByte0B",        field: "idByte0B", fmt: "num", note: "eeIdByte0BNote" },
  { key: "eeIdBlock2F",       field: "idBlock2F", fmt: "hex8", note: "eeIdBlock2FNote" },
  { key: "eeOdometer",        field: "odometer",        fmt: "num", note: "eeOdometerNote" },
  { key: "eeBattCapacity",    field: "battCapacity",    fmt: "ah",  note: "eeBattNote" },
  { key: "eeBattChargeCount", field: "battChargeCount", fmt: "num", note: "eeBattNote" },
  { key: "eeBattCellCount",   field: "battCellCount",   fmt: "num", note: "eeBattNote" },
  { key: "eeBattSoc",         field: "battSoc",         fmt: "num", note: "eeBattSocNote" },
  { key: "eeBattSoh",         field: "battSoh",         fmt: "num", note: "eeBattSocNote" }
];

// The fields a gear column is made of, taken from the rows themselves so a row added
// above is remembered without a second list to keep in step.
var EE_GEAR_FIELDS = (function () {
  var out = [];
  for (var i = 0; i < EE_GEAR_ROWS.length; i++) out.push(EE_GEAR_ROWS[i].field);
  return out;
})();

var EE_CRUISE = ["eeCruiseOff", "eeCruiseAuto", "eeCruiseManual"];

// Every state the link can be in gets its own sentence, so a rider is never left
// with a blank line or with one failure message standing in for three causes.
var EE_STATUS_KEY = {
  unsupported: "eeStUnsupported",
  idle: "eeStIdle",
  connecting: "eeStConnecting",
  connected: "eeStConnected",
  error: "eeStError",
  cancelled: "eeStCancelled",
  denied: "eeStDenied",
  disconnected: "eeStDisconnected"
};
var EE_STATUS_TONE = {
  connected: "ok", connecting: "wait", error: "bad",
  denied: "bad", unsupported: "bad", cancelled: "warn", disconnected: "warn"
};

function eeCruiseText(v) {
  var key = EE_CRUISE[v];
  return t(key || "eeCruiseUnknown") + " (" + v + ")";
}

function eeFormat(fmt, v) {
  if (v === null || v === undefined) return "-";
  if (fmt === "cruise") return eeCruiseText(v);
  if (fmt === "bool") return t(v ? "eeOn" : "eeOff");
  if (fmt === "inch") {
    return v.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      + " " + t("eeInch");
  }
  if (fmt === "swver") return v ? ("R" + v) : "-";
  if (fmt === "fwbuild") return v > 0 ? ("V" + v) : "-";
  if (fmt === "ah") return v + " " + t("eeAh");
  if (fmt === "hex8") return "0x" + (v >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return String(v);
}

function eeSnapValue(row) {
  return eeSnap ? eeSnap[row.field] : null;
}

function eeIdentityValue(row) {
  return eeIdentity[row.field];
}

function eeValueText(row) {
  return eeFormat(row.fmt, eeSnapValue(row));
}

// The factory column of the list below the table. Every row there holds one value
// for the whole scooter; a row the factory table says nothing about keeps the dash.
function eeFactoryText(row) {
  if (row.factory !== undefined) return eeFormat(row.fmt, row.factory);
  return "-";
}

// ---- the gears seen so far ----------------------------------------------------

// Gears 1 to 3 as empty entries, so the table shows the shape to fill in before the
// first frame arrives. They are columns like any other and the first reading of a gear
// overwrites its entry; a gear outside them still adds its own column when reported.
// This tool is eKFV-only (see the page lede), and an eKFV/TDE unit's own firmware
// hard-clamps minGear/maxGear to 2..4, cycling only 2 -> 3 -> 4 -> 2 -- gear 1 is
// never reachable by switching gears on a scooter this tool ever runs against.
function eeSeedGears() {
  return { 2: {}, 3: {}, 4: {} };
}

// True once at least one gear holds a value read off the scooter, so the seeded columns
// alone do not count as a reading.
function eeHasGearData() {
  for (var k in eeGears) {
    if (!Object.prototype.hasOwnProperty.call(eeGears, k)) continue;
    for (var i = 0; i < EE_GEAR_FIELDS.length; i++) {
      if (eeGears[k][EE_GEAR_FIELDS[i]] !== undefined) return true;
    }
  }
  return false;
}

// The gears in riding order, however many of them there are: the number comes
// off the scooter, so nothing here counts on the six the firmware supports.
function eeGearList() {
  var out = [];
  for (var k in eeGears) {
    if (Object.prototype.hasOwnProperty.call(eeGears, k)) out.push(Number(k));
  }
  out.sort(function (a, b) { return a - b; });
  return out;
}

// Every frame carries the gear it belongs to, so the values land in that gear's row
// and the rows of the gears left behind stay as they were read.
function eeRememberGear(snap) {
  var g = snap ? snap.gear : null;
  if (typeof g !== "number" || !isFinite(g) || g < 0) return;
  var keep = eeGears[g] || (eeGears[g] = {});
  for (var i = 0; i < EE_GEAR_FIELDS.length; i++) keep[EE_GEAR_FIELDS[i]] = snap[EE_GEAR_FIELDS[i]];
}

function eeGearValue(row, g) {
  var s = eeGears[g];
  if (!s) return null;
  var one = s[row.field];
  return (one === undefined) ? null : one;
}

// The factory value of a gear cell, read against that cell's own gear, the gear of its
// column, rather than against the one the scooter happens to be in now.
function eeGearFactory(row, g) {
  if (row.ladder) return (g >= 0 && g < row.ladder.length) ? eeFormat(row.fmt, row.ladder[g]) : "-";
  if (row.gear1 !== undefined && g === 1) return eeFormat(row.fmt, row.gear1);
  return "-";
}

// ---- the "?" explanations ------------------------------------------------------

// One explanation open at a time, closed to begin with. Button and panel find each
// other by the row key, so a redraw of the rows leaves an open one open.
function eeHelpId(key) {
  return "eeHelp_" + key;
}

function eeHelpButton(key) {
  var b = el("button", "ee-help", "?");
  b.type = "button";
  b.setAttribute("data-help", key);
  b.setAttribute("aria-controls", eeHelpId(key));
  b.setAttribute("aria-label", t("eeHelpBtn"));
  b.title = t("eeHelpBtn");
  b.addEventListener("click", function () {
    eeOpenHelp = (eeOpenHelp === key) ? null : key;
    eeSyncHelp();
  });
  return b;
}

function eeHelpPanel(key, noteKey) {
  var p = el("p", "ee-note ee-help-text");
  var val = t(noteKey);
  // Same rule as the page-wide [data-t] filler: markup only from our own
  // translation table, so a plain el() text-only default would otherwise
  // print a note's <br> or <a> literally instead of rendering it.
  if (/[<&]/.test(val)) p.innerHTML = val;   // scan-ok: our own translation table, the only markup is <b>, <a> and <br>
  else p.textContent = val;
  p.id = eeHelpId(key);
  p.hidden = true;
  return p;
}

// The single place the open state reaches the page, so a toggle and a redraw cannot
// end up saying different things about which explanation is showing.
function eeSyncHelp() {
  var open = eeOpenHelp ? eeHelpId(eeOpenHelp) : "";
  var btns = document.querySelectorAll("#ee .ee-help");
  for (var i = 0; i < btns.length; i++) {
    btns[i].setAttribute("aria-expanded", String(btns[i].getAttribute("data-help") === eeOpenHelp));
  }
  var panels = document.querySelectorAll("#ee .ee-help-text");
  for (var j = 0; j < panels.length; j++) panels[j].hidden = panels[j].id !== open;
}

// ---- drawing -------------------------------------------------------------------

function eeRowNode(label, value, ref, cls, helpKey) {
  var row = el("div", cls ? "ee-row " + cls : "ee-row");
  var lab = el("span", "ee-label", label);
  if (helpKey) lab.appendChild(eeHelpButton(helpKey));
  row.appendChild(lab);
  row.appendChild(el("span", "ee-val", value));
  row.appendChild(el("span", "ee-ref", ref));
  return row;
}

// A heading for one of the two sections, with its explanation button where the whole
// section shares one.
function renderEeSecHead(hostId, titleKey, helpKey, noteKey) {
  var host = document.getElementById(hostId);
  host.textContent = "";
  var head = el("div", "ee-sec-head");
  head.appendChild(el("h3", "ee-sec-title", t(titleKey)));
  if (helpKey) head.appendChild(eeHelpButton(helpKey));
  host.appendChild(head);
  if (helpKey) host.appendChild(eeHelpPanel(helpKey, noteKey));
}

// One column per gear and one row per value, so the three gears the window opens with
// take four columns and fit the screen of a phone. Each cell carries the live number
// with the factory number of that same gear in brackets behind it; the box around the
// table scrolls, so a scooter that reports further gears never widens the window.
// eKFV units run their gear button through internal values 2/3/4 while the scooter's
// own display, a separate chip with its own firmware, shows 1/2/3 for the same three,
// confirmed against real hardware. The raw internal number stays the column's own
// number, since that is what the factory table and the rest of this tool key against;
// the suffix is only a translation.
function eeGearHeader(n) {
  var label = t("eeGearCol") + " " + n;
  if (n >= 2 && n <= 4) label += " (" + (n - 1) + ")";
  return label;
}

function renderEeGearTable() {
  var host = document.getElementById("eeGearTable");
  host.textContent = "";
  host.appendChild(el("p", "ee-note", t("eeGearDisplayNote")));
  var gears = eeGearList();
  var now = eeSnap ? eeSnap.gear : -1;
  var table = el("table", "ee-table");
  var head = el("thead");
  var top = el("tr");
  var corner = el("th", "ee-tab-corner", "");
  corner.setAttribute("scope", "col");
  top.appendChild(corner);
  for (var c = 0; c < gears.length; c++) {
    var h = el("th", gears[c] === now ? "ee-tab-gear ee-gear-now" : "ee-tab-gear",
      eeGearHeader(gears[c]));
    h.setAttribute("scope", "col");
    if (gears[c] === now) h.title = t("eeGear");
    top.appendChild(h);
  }
  head.appendChild(top);
  table.appendChild(head);

  var body = el("tbody");
  for (var i = 0; i < EE_GEAR_ROWS.length; i++) {
    var r = EE_GEAR_ROWS[i];
    var tr = el("tr");
    var lab = el("th", "ee-tab-field", t(r.key));
    lab.setAttribute("scope", "row");
    if (r.note) lab.appendChild(eeHelpButton(r.key));
    tr.appendChild(lab);
    for (var g = 0; g < gears.length; g++) {
      var cell = el("td", gears[g] === now ? "ee-tab-cell ee-gear-now" : "ee-tab-cell");
      cell.appendChild(el("span", "ee-tab-live", eeFormat(r.fmt, eeGearValue(r, gears[g]))));
      // A gear the factory table says nothing about keeps its cell to the live number
      // alone rather than showing a bracket with a dash in it.
      var ref = eeGearFactory(r, gears[g]);
      if (ref !== "-") cell.appendChild(el("span", "ee-tab-ref", "(" + ref + ")"));
      tr.appendChild(cell);
    }
    body.appendChild(tr);
    if (r.note) {
      var panelRow = el("tr", "ee-tab-panel-row");
      var panelCell = el("td");
      panelCell.setAttribute("colspan", String(gears.length + 1));
      panelCell.appendChild(eeHelpPanel(r.key, r.note));
      panelRow.appendChild(panelCell);
      body.appendChild(panelRow);
    }
  }
  table.appendChild(body);
  host.appendChild(table);
  host.appendChild(el("p", "ee-note", t("eeTabLegend")));
  // Before the first frame the rows stand there as dashes, so it says in words that the
  // numbers arrive with the gear changes.
  if (!eeHasGearData()) host.appendChild(el("p", "ee-note", t("eeNoGear")));
}

// No factory column here: identity has no factory reference to compare against,
// so the row is just a label and the value the scooter is reporting right now.
function renderEeIdentityList() {
  var host = document.getElementById("eeIdentityList");
  host.textContent = "";
  for (var i = 0; i < EE_IDENTITY_ROWS.length; i++) {
    var r = EE_IDENTITY_ROWS[i];
    host.appendChild(eeRowNode(t(r.key), eeFormat(r.fmt, eeIdentityValue(r)), "", "", r.note ? r.key : null));
    if (r.note) host.appendChild(eeHelpPanel(r.key, r.note));
  }
}

function renderEeList() {
  var host = document.getElementById("eeList");
  host.textContent = "";
  host.appendChild(eeRowNode("", t("eeNow"), t("eeFactoryCol"), "ee-head-row"));
  for (var i = 0; i < EE_GLOBAL_ROWS.length; i++) {
    var r = EE_GLOBAL_ROWS[i];
    var cls = r.dim ? "ee-dim" : "";
    host.appendChild(eeRowNode(t(r.key), eeValueText(r), eeFactoryText(r), cls, r.note ? r.key : null));
    if (r.note) host.appendChild(eeHelpPanel(r.key, r.note));
    // Always visible, not behind the "?": the factory table resets this to 60 V/48
    // whatever battery is really fitted, so this is the one row a reset can leave
    // silently wrong rather than merely uninformative.
    if (r.warn) host.appendChild(el("p", "ee-note ee-warn", t(r.warn)));
  }
}

// What is on screen right now, as one string. The scooter streams the same frame
// several times a second and a redraw would take the focus off a "?" button with it,
// so nothing is rebuilt while nothing has changed.
function eeSignature() {
  var parts = [lang, String(eeSnap ? eeSnap.gear : -1)];
  var gears = eeGearList();
  for (var i = 0; i < gears.length; i++) {
    parts.push("g" + gears[i]);
    for (var f = 0; f < EE_GEAR_FIELDS.length; f++) parts.push(String(eeGears[gears[i]][EE_GEAR_FIELDS[f]]));
  }
  for (var j = 0; j < EE_GLOBAL_ROWS.length; j++) parts.push(String(eeSnapValue(EE_GLOBAL_ROWS[j])));
  for (var k = 0; k < EE_IDENTITY_ROWS.length; k++) parts.push(String(eeIdentityValue(EE_IDENTITY_ROWS[k])));
  return parts.join("|");
}

function renderEeSections() {
  var sig = eeSignature();
  if (sig === eeSig) return;
  eeSig = sig;
  renderEeSecHead("eeIdentitySec", "eeIdentityTitle", "identityBlock", "eeIdentityNote");
  renderEeIdentityList();
  renderEeSecHead("eeGearSec", "eeGearTableTitle", "gearBlock", EE_GEAR_NOTE);
  renderEeGearTable();
  renderEeSecHead("eeGlobalSec", "eeGlobalTitle", "globalBlock", "eeUnreadableNote");
  renderEeList();
  eeSyncHelp();
}

function showEeStatus() {
  var line = document.getElementById("eeStatus");
  var tone = EE_STATUS_TONE[eeState];
  line.className = tone ? "ee-status " + tone : "ee-status";
  line.textContent = t(EE_STATUS_KEY[eeState] || "eeStUnknown");
}

// Both halves of the window in one call, so a language switch while it is open
// redraws the rows and the state sentence together. The signature is dropped first:
// the values are the same in both languages, only the words around them change.
function renderEeCheck() {
  eeSig = "";
  renderEeSections();
  showEeStatus();
  document.getElementById("eeNoBt").hidden = !!(window.TrFwBLE && window.TrFwBLE.supported);
}

// The same three sections and the same order as the window, so a pasted reading says
// what the rider was looking at.
function eeClipboardText() {
  var lines = [t("eeCopyTitle"), t("eeCopyTime") + ": " + new Date().toLocaleString(lang), ""];
  var notes = [t("eeIdentityNote"), t(EE_GEAR_NOTE)];
  var gears = eeGearList();
  var i, r, ref;

  lines.push(t("eeIdentityTitle"));
  for (i = 0; i < EE_IDENTITY_ROWS.length; i++) {
    r = EE_IDENTITY_ROWS[i];
    lines.push("  " + t(r.key) + ": " + eeFormat(r.fmt, eeIdentityValue(r)));
    // eeBattNote covers three rows, added once rather than three times over.
    if (r.note && notes.indexOf(t(r.note)) < 0) notes.push(t(r.note));
  }

  lines.push("", t("eeGearTableTitle"));
  if (!eeHasGearData()) lines.push("  " + t("eeNoGear"));
  for (var g = 0; g < gears.length; g++) {
    lines.push("", "  " + eeGearHeader(gears[g]));
    for (i = 0; i < EE_GEAR_ROWS.length; i++) {
      r = EE_GEAR_ROWS[i];
      ref = eeGearFactory(r, gears[g]);
      lines.push("    " + t(r.key) + ": " + eeFormat(r.fmt, eeGearValue(r, gears[g]))
        + (ref === "-" ? "" : "   (" + t("eeFactoryCol") + " " + ref + ")"));
      // eeStartLevelNote covers two rows, added once rather than twice over.
      if (r.note && notes.indexOf(t(r.note)) < 0) notes.push(t(r.note));
    }
  }

  lines.push("", t("eeGlobalTitle"));
  for (i = 0; i < EE_GLOBAL_ROWS.length; i++) {
    r = EE_GLOBAL_ROWS[i];
    ref = eeFactoryText(r);
    lines.push("  " + t(r.key) + ": " + eeValueText(r)
      + (ref === "-" ? "" : "   (" + t("eeFactoryCol") + " " + ref + ")"));
    // eeVoltCodeNote covers two rows, added once rather than twice over.
    if (r.note && notes.indexOf(t(r.note)) < 0) notes.push(t(r.note));
    if (r.warn) lines.push("    !! " + t(r.warn));
  }

  // Every explanation rides along whether or not its "?" is open on screen: a pasted
  // reading is read without the window beside it and the wheel line would otherwise
  // look like evidence.
  for (var n = 0; n < notes.length; n++) lines.push("", notes[n]);
  return lines.join("\n");
}

if (window.TrFwBLE) {
  window.TrFwBLE.onStatus(function (s) {
    eeState = s;
    showEeStatus();
  });
  window.TrFwBLE.onSnapshot(function (snap) {
    eeSnap = snap;
    eeRememberGear(snap);
    renderEeSections();
  });
  window.TrFwBLE.onIdentity(function (part) {
    for (var k in part) if (Object.prototype.hasOwnProperty.call(part, k)) eeIdentity[k] = part[k];
    renderEeSections();
  });
  eeState = window.TrFwBLE.status;
}

eeBtn.disabled = !(window.TrFwBLE && window.TrFwBLE.supported);

eeBtn.addEventListener("click", function () {
  if (!window.TrFwBLE || !window.TrFwBLE.supported) return;
  // Every reading starts empty, the gathered gears and identity with it: a row read
  // off the scooter of an hour ago would read as one of the scooter in front of the
  // rider now.
  eeSnap = null;
  eeGears = eeSeedGears();
  eeIdentity = {};
  eeOpenHelp = null;
  eeState = "connecting";
  document.getElementById("eeCopied").textContent = "";
  renderEeCheck();
  if (typeof eeDlg.showModal === "function") eeDlg.showModal();
  // A dialog keeps its old scroll position across a reopen otherwise, so a rider who
  // scrolled down last time would open straight into the middle of a fresh reading.
  eeDlg.scrollTop = 0;
  var eeBody = eeDlg.querySelector(".doc-body");
  if (eeBody) eeBody.scrollTop = 0;
  window.TrFwBLE.connect();
});

document.getElementById("eeCopy").addEventListener("click", function () {
  var msg = document.getElementById("eeCopied");
  if (!eeSnap) { msg.textContent = t("eeNoData"); return; }
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    msg.textContent = t("eeCopyFail");
    return;
  }
  navigator.clipboard.writeText(eeClipboardText()).then(function () {
    msg.textContent = t("eeCopied");
  })["catch"](function () {
    msg.textContent = t("eeCopyFail");
  });
});

document.getElementById("eeX").addEventListener("click", function () { eeDlg.close(); });
document.getElementById("eeClose").addEventListener("click", function () { eeDlg.close(); });
// On the close event rather than on the two buttons: Esc and the backdrop close the
// dialog as well; none of those may leave the scooter connected.
eeDlg.addEventListener("close", function () {
  if (window.TrFwBLE) window.TrFwBLE.disconnect();
});

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
// Dark is what the page opens with. The choice is remembered and the icon says what a
// tap will do: a sun while the page is dark, a moon while it is light.

var LS_THEME = "trfw_theme";
var themeBtn = document.getElementById("themeBtn");

function isDark() {
  return document.documentElement.getAttribute("data-theme") !== "light";
}

function labelTheme() {
  var lg = document.getElementById("langs");
  if (lg) lg.setAttribute("aria-label", t("langGroup"));
  themeBtn.setAttribute("aria-label", t(isDark() ? "themeToLight" : "themeToDark"));
  themeBtn.title = themeBtn.getAttribute("aria-label");
}

function applyTheme(dark) {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  themeBtn.textContent = dark ? "☀" : "☾";
  labelTheme();
  // Private browsing can refuse to store, which must not take the switch down with it.
  try { localStorage.setItem(LS_THEME, dark ? "dark" : "light"); } catch (e) {}
}

themeBtn.addEventListener("click", function () { applyTheme(!isDark()); });

var savedTheme = null;
try { savedTheme = localStorage.getItem(LS_THEME); } catch (e) {}
applyTheme(savedTheme !== "light");   // before applyLang, so the first label is in the right language

applyLang();
