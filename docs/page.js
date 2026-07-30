"use strict";

// Page wiring. Bump BUILD together with the ?v= on every script tag in
// index.html, so a cached script and a fresh page can never disagree.
var BUILD = "v2";

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
    if (val.indexOf("<b>") >= 0 || val.indexOf("<a ") >= 0) nodes[i].innerHTML = val;
    else nodes[i].textContent = val;
  }
  // The disclaimer points and the changelog link follow the language too.
  var list = document.getElementById("dlgList");
  list.innerHTML = "";
  var pts = (window.I18N[lang] || {}).dlgPoints || [];
  for (var p = 0; p < pts.length; p++) {
    var li = document.createElement("li");
    li.innerHTML = pts[p];
    list.appendChild(li);
  }
  var blob = "https://github.com/Laufbursche42/tr-fw/blob/main/docs/";
  document.getElementById("changelogLink").href = blob + "CHANGELOG." + lang + ".md";
  document.getElementById("privacyLink").href = blob + "PRIVACY." + lang + ".md";
  renderFeatures();

  var btns = document.querySelectorAll(".langs button");
  for (var j = 0; j < btns.length; j++) {
    btns[j].setAttribute("aria-pressed", String(btns[j].dataset.lang === lang));
  }
  document.getElementById("out").innerHTML = "";
  if (loaded) showVerdict(window.identify(loaded.text), loaded.name);
}

var langButtons = document.querySelectorAll(".langs button");
for (var b = 0; b < langButtons.length; b++) {
  langButtons[b].addEventListener("click", function () {
    lang = this.dataset.lang;
    var variantInputs = document.querySelectorAll('input[name="variant"]');
for (var v = 0; v < variantInputs.length; v++) {
  variantInputs[v].addEventListener("change", renderFeatures);
}

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
  host.innerHTML = "";
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
  out.innerHTML = "";
  var box = el("div", "report bad");
  box.appendChild(el("h3", null, t("badTitle")));
  box.appendChild(el("pre", "err", msg));
  out.appendChild(box);
}

function showResult(res) {
  var out = document.getElementById("out");
  out.innerHTML = "";
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
  host.innerHTML = "";
  host.appendChild(box);
}

function accept(name, text) {
  var id = window.identify(text);
  showVerdict(id, name);
  document.getElementById("out").innerHTML = "";
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
    li.innerHTML = t("dlgUnverified");
    list.insertBefore(li, list.firstChild);
  }
  if (typeof dlg.showModal === "function") dlg.showModal();
  else doBuild();
});
document.getElementById("dlgNo").addEventListener("click", function () { dlg.close(); });
document.getElementById("dlgYes").addEventListener("click", function () {
  dlg.close();
  doBuild();
});

var variantInputs = document.querySelectorAll('input[name="variant"]');
for (var v = 0; v < variantInputs.length; v++) {
  variantInputs[v].addEventListener("change", renderFeatures);
}

applyLang();
