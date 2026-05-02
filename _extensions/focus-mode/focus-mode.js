document.addEventListener("DOMContentLoaded", function () {

  /* ── Focus Mode ── */
  var button = document.getElementById("book-focus-toggle");
  var icon   = document.getElementById("book-focus-icon");
  var label  = document.getElementById("book-focus-label");

  var hasBookSidebar = document.querySelector("#quarto-sidebar") !== null;
  if (!hasBookSidebar) {
    if (button) button.style.display = "none";
    return;
  }

  var storageKey = "quarto-book-focus-mode";

  function setFocusMode(enabled) {
    document.body.classList.toggle("book-focus-mode", enabled);
    if (enabled) {
      icon.textContent  = "☰";
      label.textContent = "TOC";
      button.setAttribute("aria-label", "Show TOC");
    } else {
      icon.textContent  = "⛶";
      label.textContent = "Focus Mode";
      button.setAttribute("aria-label", "Focus Mode");
    }
    try { window.localStorage.setItem(storageKey, enabled ? "1" : "0"); } catch (e) {}
  }

  var saved = "0";
  try { saved = window.localStorage.getItem(storageKey) || "0"; } catch (e) {}
  setFocusMode(saved === "1");

  button.addEventListener("click", function () {
    setFocusMode(!document.body.classList.contains("book-focus-mode"));
  });

  /* ── Presentation Mode ── */
  var counter     = document.getElementById("book-pres-counter");
  var contentRoot = document.getElementById("quarto-document-content");
  if (!contentRoot) return;

  // Collect all sections in document (DFS) order
  var slides = [];
  (function collect(el) {
    for (var i = 0; i < el.children.length; i++) {
      var child = el.children[i];
      if (child.matches('section[class*="level"]')) {
        slides.push(child);
        collect(child);
      }
    }
  })(contentRoot);

  // Detect prelude: any non-section direct child (e.g. title header, intro paragraphs)
  var hasPrelude = false;
  for (var i = 0; i < contentRoot.children.length; i++) {
    if (!contentRoot.children[i].matches('section[class*="level"]')) {
      hasPrelude = true;
      break;
    }
  }

  var currentIdx = -1;
  var presActive  = false;

  /* ── Color scheme tracking ── */
  var schemeToggle = document.querySelector(".quarto-color-scheme-toggle");
  var colorIsDark  = false;
  if (schemeToggle) {
    if (schemeToggle.getAttribute("aria-pressed") === "true") {
      colorIsDark = true;
    } else {
      try {
        var stored = localStorage.getItem("quarto-color-scheme");
        colorIsDark = !!stored && stored !== "default";
      } catch (e) {}
    }
    schemeToggle.addEventListener("click", function () { colorIsDark = !colorIsDark; });
  }

  var total = slides.length + (hasPrelude ? 1 : 0);
  var progressBar = document.getElementById("book-pres-progress");

  // Compute this chapter's position within the full book via the sidebar links
  // while ignoring index/opening pages in progress calculations.
  var chapterProgressIdx = -1, totalProgressChapters = 0;

  function normalizePath(path) {
    if (!path) return "/";
    path = String(path).trim().toLowerCase();
    if (path === "") return "/";
    if (path !== "/") path = path.replace(/\/+$/, "");
    return path || "/";
  }

  function pathFromHref(href) {
    try {
      return normalizePath(new URL(href, window.location.href).pathname || "/");
    } catch (e) {
      return normalizePath((href || "").split("#")[0].split("?")[0]);
    }
  }

  function isIndexPath(path) {
    path = normalizePath(path);
    return path === "/" ||
      path === "/index" ||
      path === "/index.html" ||
      path === "/index.qmd" ||
      path.endsWith("/index") ||
      path.endsWith("/index.html") ||
      path.endsWith("/index.qmd");
  }

  var currentPath = normalizePath(window.location.pathname || "/");
  var currentIsIndex = isIndexPath(currentPath);

  (function () {
    var links  = document.querySelectorAll("#quarto-sidebar a[href]");
    var active = document.querySelector("#quarto-sidebar a.active, #quarto-sidebar a[aria-current]");
    if (links.length > 0) {
      var progressLinks = [];
      for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute("href") || "";
        var linkPath = pathFromHref(href);
        if (isIndexPath(linkPath)) {
          continue;
        }
        progressLinks.push(links[i]);
      }

      totalProgressChapters = progressLinks.length;

      if (active) {
        for (var k = 0; k < progressLinks.length; k++) {
          if (progressLinks[k] === active) { chapterProgressIdx = k; break; }
        }
      }

      if (chapterProgressIdx < 0) {
        for (var m = 0; m < progressLinks.length; m++) {
          var pHref = progressLinks[m].getAttribute("href") || "";
          if (pathFromHref(pHref) === currentPath) {
            chapterProgressIdx = m;
            break;
          }
        }
      }

      if (currentIsIndex) {
        chapterProgressIdx = -1;
      }
    }
  })();

  function updateProgress(position) {
    if (!progressBar || total === 0) return;
    if (currentIsIndex || chapterProgressIdx < 0 || totalProgressChapters === 0) {
      progressBar.style.width = "0%";
      return;
    }
    var effectiveTotal = Math.max(1, totalProgressChapters);
    var globalPct = (chapterProgressIdx / effectiveTotal) + (position / total / effectiveTotal);
    progressBar.style.width = (globalPct * 100) + "%";
  }

  function clearPresClasses() {
    document.body.classList.remove('pres-prelude');
    for (var i = 0; i < slides.length; i++) {
      slides[i].classList.remove('pres-current', 'pres-ancestor');
    }
  }

  function showPrelude() {
    clearPresClasses();
    currentIdx = -1;
    document.body.classList.add('pres-prelude');
    counter.textContent = "1 / " + total;
    updateProgress(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showSlide(idx) {
    clearPresClasses();

    currentIdx = idx;
    var section = slides[idx];
    section.classList.add('pres-current');

    // Walk up the DOM marking ancestor sections so nested slides are reachable
    var parent = section.parentElement;
    while (parent && parent !== contentRoot) {
      if (parent.matches('section[class*="level"]')) {
        parent.classList.add('pres-ancestor');
      }
      parent = parent.parentElement;
    }

    var offset = hasPrelude ? 1 : 0;
    var position = idx + 1 + offset;
    counter.textContent = position + " / " + total;
    updateProgress(position);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  var presStorageKey = "quarto-book-presentation-mode";

  function setPresentationMode(enabled) {
    if (enabled && total === 0) return;
    presActive = enabled;
    document.body.classList.toggle("book-presentation-mode", enabled);
    if (enabled) {
      if (hasPrelude) { showPrelude(); } else { showSlide(0); }
    } else {
      clearPresClasses();
    }
    try { localStorage.setItem(presStorageKey, enabled ? "1" : "0"); } catch (e) {}
  }

  try {
    if (localStorage.getItem(presStorageKey) === "1") setPresentationMode(true);
  } catch (e) {}

  function findSlideForElement(el) {
    if (!el) return -1;
    for (var si = 0; si < slides.length; si++) {
      if (slides[si] === el) return si;
    }
    for (var si = slides.length - 1; si >= 0; si--) {
      if (slides[si].contains(el)) return si;
    }
    return -1;
  }

  function jumpToHash() {
    if (!presActive || !window.location.hash) return;
    var idx = findSlideForElement(document.getElementById(window.location.hash.slice(1)));
    if (idx >= 0) showSlide(idx);
  }

  // On page load with hash (cross-page navigation)
  jumpToHash();

  // On anchor click — handles "#id", "page.html#id", and repeated clicks on same hash
  document.addEventListener("click", function (e) {
    if (!presActive) return;
    var anchor = e.target.closest("a[href]");
    if (!anchor) return;
    var href = anchor.getAttribute("href") || "";
    var hashIdx = href.indexOf("#");
    if (hashIdx < 0) return;

    // Skip links pointing to a different page
    var pagePart = href.slice(0, hashIdx);
    if (pagePart) {
      try {
        var linkUrl = new URL(href, window.location.href);
        if (linkUrl.pathname !== window.location.pathname) return;
      } catch (ex) { return; }
    }

    var targetId = href.slice(hashIdx + 1);
    if (!targetId) return;
    var idx = findSlideForElement(document.getElementById(targetId));
    if (idx >= 0) {
      e.preventDefault();
      history.pushState(null, "", "#" + targetId);
      showSlide(idx);
    }
  });

  // Fallback for programmatic hash changes
  window.addEventListener("hashchange", jumpToHash);

  document.addEventListener("keydown", function (e) {
    var tag = document.activeElement ? document.activeElement.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
        (document.activeElement && document.activeElement.isContentEditable)) return;

    if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      setFocusMode(true);
      return;
    }

    if (e.key === "t" || e.key === "T") {
      e.preventDefault();
      setFocusMode(false);
      return;
    }

    if (e.key === "d" || e.key === "D" || e.key === "l" || e.key === "L") {
      e.preventDefault();
      if (!schemeToggle) return;
      var wantDark = (e.key === "d" || e.key === "D");
      if (wantDark !== colorIsDark) schemeToggle.click();
      return;
    }

    if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      setPresentationMode(!presActive);
      return;
    }

    if (e.key === "ArrowRight") {
      var nextPageButton = document.querySelector(".nav-page-next a");
      if (nextPageButton) {
        e.preventDefault();
        nextPageButton.click();
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      var prevPageButton = document.querySelector(".nav-page-previous a");
      if (prevPageButton) {
        e.preventDefault();
        prevPageButton.click();
      }
      return;
    }

    if (!presActive || total === 0) return;

    if (e.key === "PageDown") {
      e.preventDefault();
      if (currentIdx === -1 && slides.length > 0) { showSlide(0); }
      else if (currentIdx < slides.length - 1) { showSlide(currentIdx + 1); }
    } else if (e.key === "PageUp") {
      e.preventDefault();
      if (currentIdx > 0) { showSlide(currentIdx - 1); }
      else if (currentIdx === 0 && hasPrelude) { showPrelude(); }
    }
  });

});
