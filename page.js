"use strict";

// Page wiring. Bump BUILD together with the ?v= on every script tag in
// index.html, so a cached script and a fresh page can never disagree.
var BUILD = "v9";

var lang = "de";   // German is the default; the switcher is right at the top for everyone else
var loaded = null;   // { name, text } of a file that passed the approval check

document.getElementById("pageBuild").textContent = BUILD;
document.getElementById("tagStd").textContent = "V" + window.OTA.FW_BUILD;
document.getElementById("tagKick").textContent = "V" + window.OTA.FW_BUILD_KICK;

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
    // Only the few strings that carry emphasis are written as markup.
    if (val.indexOf("<b>") >= 0 || val.indexOf("<a ") >= 0) nodes[i].innerHTML = val;   // scan-ok: our own translation table, the only markup is <b> and <a>
    else nodes[i].textContent = val;
  }
  // The disclaimer points and the changelog link follow the language too.
  var list = document.getElementById("dlgList");
  list.textContent = "";
  var pts = (window.I18N[lang] || {}).dlgPoints || [];
  for (var p = 0; p < pts.length; p++) {
    var li = document.createElement("li");
    li.innerHTML = pts[p];   // scan-ok: disclaimer points from our own translation table
    list.appendChild(li);
  }
  // The href is only the fallback for opening in a new tab, but it follows the
  // language as well, so a long press never lands on the other language.
  document.getElementById("changelogLink").href = docFile("CHANGELOG");
  document.getElementById("privacyLink").href = docFile("PRIVACY");
  document.getElementById("licenseLink").href = docFile("LICENSE");
  document.getElementById("trademarksLink").href = docFile("TRADEMARKS");
  document.getElementById("docX").setAttribute("aria-label", t("docClose"));
  renderFeatures();

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
    applyLang();
  });
}

// The feature list follows the selected build. Common points are held once and
// the extra ones appended, so the two lists cannot drift apart.
function renderFeatures() {
  var host = document.getElementById("featureList");
  if (!host) return;
  var d = window.I18N[lang] || {};
  var items = (d.featCommon || []).slice();
  if (selectedVariant() === "kickstart") items = items.concat(d.featKickExtra || []);
  host.textContent = "";
  for (var i = 0; i < items.length; i++) host.appendChild(el("li", null, items[i]));
}

function selectedVariant() {
  return document.querySelector('input[name="variant"]:checked').value;
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
  [[t("fSource"), loaded.name],
   [t("fVersion"), "V" + res.variant.stamp],
   [t("fBytes"), res.appBytes.toLocaleString(lang)],
   [t("fCrc"), res.crc.toString(16).toUpperCase().padStart(4, "0")],
   [t("fGroups"), res.groups.join(", ").toLowerCase()]].forEach(function (row) {
    dl.appendChild(el("dt", null, row[0]));
    dl.appendChild(el("dd", null, row[1]));
  });
  box.appendChild(dl);

  var name = "AWIVCU_APP_R5_4_19_V" + res.variant.stamp + ".hex";
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
  box.appendChild(el("b", null, t(key)));
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
      blinker: document.getElementById("blinker").checked
    });
    showResult(res);
  } catch (e) {
    showError(e && e.message ? e.message : String(e));
  }
}

// The warning is shown on the build press, not buried in the footer, because it
// is the moment the rider decides.
var dlg = document.getElementById("warn");
buildBtn.addEventListener("click", function () {
  // Anything we know to be unverified belongs in front of the rider at the
  // moment of the decision, not only in the changelog.
  var list = document.getElementById("dlgList");
  var old = document.getElementById("dlgUnverified");
  if (old) old.remove();
  if (selectedVariant() === "kickstart") {
    var li = document.createElement("li");
    li.id = "dlgUnverified";
    li.className = "unverified";
    li.innerHTML = t("dlgUnverified");   // scan-ok: our own translation table
    list.insertBefore(li, list.firstChild);
  }
  if (typeof dlg.showModal === "function") { dlg.showModal(); dlg.scrollTop = 0; }
  else doBuild();
});
document.getElementById("dlgNo").addEventListener("click", function () { dlg.close(); });
document.getElementById("dlgYes").addEventListener("click", function () {
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
  "TRADEMARKS.md": "trademarks", "TRADEMARKS.de.md": "trademarks"
};

// Only the markdown the shipped documents actually use: headings, lists, fenced
// code, quotes, rules, bold, inline code and links. No tables, no nesting.
function mdToHtml(src) {
  function inline(s) {
    return escHtml(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (all, text, href) {
        if (DOC_TITLES[href]) {
          return '<a href="' + href + '" data-docfile="' + href
               + '" data-doc-title="' + DOC_TITLES[href] + '">' + text + "</a>";
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
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) {
      block();
      out.push("<h" + m[1].length + ">" + inline(m[2]) + "</h" + m[1].length + ">");
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
  return lang === "de" ? name + ".de.md" : name + ".md";
}

function openDoc(name, titleKey) {
  openDocFile(docFile(name), titleKey);
}

function openDocFile(file, titleKey) {
  var body = document.getElementById("docBody");
  // A document in the other language is labelled as such, so nobody wonders why
  // the licence suddenly reads English.
  var isGerman = file.indexOf(".de.") >= 0;
  var title = t(titleKey) || file;
  if (isGerman !== (lang === "de")) title += " " + t(isGerman ? "docGerman" : "docEnglish");
  document.getElementById("docTitle").textContent = title;
  if (typeof docDlg.showModal === "function") docDlg.showModal();

  if (docCache[file]) { body.innerHTML = docCache[file]; body.scrollTop = 0; return; }   // scan-ok: markdown of our own documents, rendered by mdToHtml which escapes first
  body.innerHTML = "<p>" + escHtml(t("docLoading")) + "</p>";   // scan-ok: escaped
  fetch(file).then(function (r) {
    if (!r.ok) throw new Error(r.status + " " + r.statusText);
    return r.text();
  }).then(function (txt) {
    docCache[file] = mdToHtml(txt);
    body.innerHTML = docCache[file];   // scan-ok: markdown of our own documents, rendered by mdToHtml which escapes first
    body.scrollTop = 0;
  })["catch"](function (e) {
    body.innerHTML = "<p>" + escHtml(t("docFail")) + "</p><pre class=\"err\">" + file + ": "   // scan-ok: escaped
                   + escHtml(e && e.message ? e.message : String(e)) + "</pre>";
  });
}

// Delegated, because the changelog link in the notes is re-created on every
// language switch.
document.addEventListener("click", function (e) {
  if (!e.target.closest) return;
  var a = e.target.closest("[data-doc], [data-docfile]");
  if (!a) return;
  e.preventDefault();
  var titleKey = a.getAttribute("data-doc-title") || a.getAttribute("data-t");
  var file = a.getAttribute("data-docfile");
  if (file) openDocFile(file, titleKey);
  else openDoc(a.getAttribute("data-doc"), titleKey);
});
document.getElementById("docX").addEventListener("click", function () { docDlg.close(); });
document.getElementById("docClose").addEventListener("click", function () { docDlg.close(); });

// The footer shows the same warning to read, in the document viewer: no confirm
// button at all, so reading the terms can never start a build.
function openDisclaimer() {
  var body = document.getElementById("docBody");
  document.getElementById("docTitle").textContent = t("dlgTitle");
  var html = "<p>" + t("dlgLede") + "</p><ul>";
  if (selectedVariant() === "kickstart") html += '<li class="unverified">' + t("dlgUnverified") + "</li>";
  var pts = (window.I18N[lang] || {}).dlgPoints || [];
  for (var i = 0; i < pts.length; i++) html += "<li>" + pts[i] + "</li>";
  body.innerHTML = html + "</ul>";   // scan-ok: escaped lede, list items from our own translation table
  body.scrollTop = 0;
  if (typeof docDlg.showModal === "function") docDlg.showModal();
}
document.getElementById("disclaimerLink").addEventListener("click", function (e) {
  e.preventDefault();
  openDisclaimer();
});

var variantInputs = document.querySelectorAll('input[name="variant"]');
for (var v = 0; v < variantInputs.length; v++) {
  variantInputs[v].addEventListener("change", renderFeatures);
}

applyLang();
