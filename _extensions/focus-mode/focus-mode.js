document.addEventListener("DOMContentLoaded", function () {

  /* ── Create DOM elements ── */
  var button = document.createElement("button");
  button.id = "book-focus-toggle";
  button.setAttribute("aria-label", "Focus Mode");
  button.setAttribute("type", "button");

  var icon = document.createElement("span");
  icon.id = "book-focus-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "⛶";

  var label = document.createElement("span");
  label.id = "book-focus-label";
  label.textContent = "Focus Mode";

  button.appendChild(icon);
  button.appendChild(label);
  document.body.appendChild(button);

  var progressBar = document.createElement("div");
  progressBar.id = "book-pres-progress";
  document.body.appendChild(progressBar);

  var indicator = document.createElement("div");
  indicator.id = "book-pres-indicator";
  indicator.setAttribute("aria-live", "polite");

  var counter = document.createElement("span");
  counter.id = "book-pres-counter";
  indicator.appendChild(counter);
  document.body.appendChild(indicator);

  /* ── Desktop-only guard ── */
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    button.style.display = "none";
    return;
  }

  /* ── Sidebar detection (Quarto Book and Quarto Website with sidebar) ── */
  var hasSidebar = document.querySelector("#quarto-sidebar") !== null;
  if (!hasSidebar) {
    button.style.display = "none";
    return;
  }

  var isBookFormat = !!document.head.querySelector('link[rel="next"], link[rel="prev"]');
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

  /* ── Block 'f' on both keydown and keyup at window capture ── */
  /* Quarto's search shortcut listens on keyup; blocking only keydown is not  */
  /* enough — the keyup still fires and opens search. Both events are         */
  /* intercepted here at window capture (above document in the event path).   */
  function onFocusKey(e) {
    var tag = document.activeElement ? document.activeElement.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
        (document.activeElement && document.activeElement.isContentEditable)) return;
    if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type === "keydown") setFocusMode(true);
    }
  }
  window.addEventListener("keydown", onFocusKey, true);
  window.addEventListener("keyup",   onFocusKey, true);

  /* ── Presentation Mode ── */
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

  function normalizePath(path) {
    if (!path) return "/";
    path = String(path).trim().toLowerCase();
    if (path === "") return "/";
    if (path !== "/") path = path.replace(/\/+$/, "");
    return path || "/";
  }

  function bookPageKey(path) {
    path = normalizePath(path);
    return path
      .replace(/\/index\.html$/, "")
      .replace(/\/index\.qmd$/, "")
      .replace(/\/index$/, "") || "/";
  }

  var currentPath = bookPageKey(window.location.pathname || "/");

  function hasPreludeIn(root) {
    if (!root) return false;
    for (var i = 0; i < root.children.length; i++) {
      if (!root.children[i].matches('section[class*="level"]')) return true;
    }
    return false;
  }

  function countSectionsIn(root) {
    var count = 0;
    (function walk(el) {
      if (!el) return;
      for (var i = 0; i < el.children.length; i++) {
        var child = el.children[i];
        if (child.matches('section[class*="level"]')) {
          count++;
          walk(child);
        }
      }
    })(root);
    return count;
  }

  function countPassagesInDocument(doc) {
    var root = doc ? doc.getElementById("quarto-document-content") : null;
    if (!root) return 0;
    return countSectionsIn(root) + (hasPreludeIn(root) ? 1 : 0);
  }

  function bookPageUrlFromHref(href) {
    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return null;
      url.hash = "";
      return url;
    } catch (e) {
      return null;
    }
  }

  function bookPageFromDocument(doc, url, count) {
    return {
      key: bookPageKey(url.pathname || "/"),
      url: url.href,
      count: typeof count === "number" ? count : countPassagesInDocument(doc),
      doc: doc
    };
  }

  function linkedBookPageUrl(doc, baseUrl, rel) {
    var link = doc.querySelector('link[rel~="' + rel + '"]');
    if (!link) return null;
    return bookPageUrlFromHref(new URL(link.getAttribute("href") || "", baseUrl).href);
  }

  function fetchBookPage(url) {
    var parser = new DOMParser();
    return fetch(url.href, { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("Unable to load " + url.href);
        return response.text();
      })
      .then(function (html) {
        var doc = parser.parseFromString(html, "text/html");
        return bookPageFromDocument(doc, url);
      });
  }

  var bookProgress = {
    ready: false,
    failed: false,
    pages: [],
    currentPageIndex: -1,
    currentPageStart: 0,
    totalPassages: 0
  };
  var progressStorageKey = "quarto-book-presentation-progress";

  function setProgressWidth(percent, animate) {
    if (!progressBar) return;

    percent = Math.max(0, Math.min(percent, 100));
    if (animate === false) {
      var previousTransition = progressBar.style.transition;
      progressBar.style.transition = "none";
      progressBar.style.width = percent + "%";
      progressBar.offsetHeight;
      progressBar.style.transition = previousTransition;
    } else {
      progressBar.style.width = percent + "%";
    }
  }

  function saveProgressWidth(percent) {
    try { localStorage.setItem(progressStorageKey, String(percent)); } catch (e) {}
  }

  function restoreProgressWidth() {
    try {
      if (localStorage.getItem("quarto-book-presentation-mode") !== "1") return;
      var savedProgress = parseFloat(localStorage.getItem(progressStorageKey) || "");
      if (!isNaN(savedProgress)) setProgressWidth(savedProgress, false);
    } catch (e) {}
  }

  restoreProgressWidth();

  function finishBookProgressSetup() {
    bookProgress.totalPassages = 0;
    bookProgress.currentPageStart = 0;
    bookProgress.currentPageIndex = -1;

    for (var i = 0; i < bookProgress.pages.length; i++) {
      if (bookProgress.pages[i].key === currentPath) {
        bookProgress.currentPageIndex = i;
        bookProgress.currentPageStart = bookProgress.totalPassages;
      }
      bookProgress.totalPassages += bookProgress.pages[i].count;
    }

    bookProgress.ready = !bookProgress.failed &&
      bookProgress.totalPassages > 0 &&
      bookProgress.currentPageIndex >= 0;
  }

  /* ── Sidebar page list (quarto-website navigation) ── */
  function buildSidebarPages() {
    var seen = {};
    var pages = [];
    // .sidebar-item-section items are collapsible group headers, not pages — exclude them
    var links = document.querySelectorAll("#quarto-sidebar .sidebar-item:not(.sidebar-item-section) a[href]");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#") continue;
      try {
        var url = new URL(a.href);
        if (url.origin !== window.location.origin) continue;
        url.hash = "";
        var key = bookPageKey(url.pathname);
        if (!seen[key]) {
          seen[key] = true;
          pages.push({ key: key, url: url.href, count: 1, doc: null });
        }
      } catch (ex) {}
    }
    return pages;
  }

  function navigateSidebarPage(direction) {
    var pages = buildSidebarPages();
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].key === currentPath) {
        var target = pages[i + direction];
        if (target) window.location.href = target.url;
        return;
      }
    }
  }

  function setupBookProgress() {
    var currentUrl = bookPageUrlFromHref(window.location.href);
    if (!currentUrl) return;

    var seen = {};
    var currentPage = bookPageFromDocument(document, currentUrl, total);
    var before = [];
    var after = [];
    seen[currentPage.key] = true;

    function collectPrevious(fromPage) {
      var prevUrl = linkedBookPageUrl(fromPage.doc, fromPage.url, "prev");
      if (!prevUrl) return Promise.resolve();

      var key = bookPageKey(prevUrl.pathname || "/");
      if (seen[key]) return Promise.resolve();
      seen[key] = true;

      return fetchBookPage(prevUrl).then(function (page) {
        before.unshift(page);
        return collectPrevious(page);
      });
    }

    function collectNext(fromPage) {
      var nextUrl = linkedBookPageUrl(fromPage.doc, fromPage.url, "next");
      if (!nextUrl) return Promise.resolve();

      var key = bookPageKey(nextUrl.pathname || "/");
      if (seen[key]) return Promise.resolve();
      seen[key] = true;

      return fetchBookPage(nextUrl).then(function (page) {
        after.push(page);
        return collectNext(page);
      });
    }

    var isBookFormat = !!document.head.querySelector('link[rel="next"], link[rel="prev"]');

    Promise.all([collectPrevious(currentPage), collectNext(currentPage)]).then(function () {
      var allPages = before.concat([currentPage], after);

      // Website fallback: no link[rel] navigation — build page list from sidebar
      if (!isBookFormat && allPages.length === 1) {
        var sidebarPages = buildSidebarPages();
        if (sidebarPages.length > 1) {
          for (var i = 0; i < sidebarPages.length; i++) {
            if (sidebarPages[i].key === currentPage.key) {
              sidebarPages[i].count = total;
              break;
            }
          }
          allPages = sidebarPages;
        }
      }

      bookProgress.pages = allPages;
      finishBookProgressSetup();
      updateProgress(currentIdx < 0 ? 1 : currentIdx + 1 + (hasPrelude ? 1 : 0));
    }).catch(function () {
      bookProgress.failed = true;
      updateProgress(currentIdx < 0 ? 1 : currentIdx + 1 + (hasPrelude ? 1 : 0));
    });
  }

  setupBookProgress();

  // One progress step per presentation passage across the whole book.
  // position: 1 = prelude (or first slide when no prelude), up to total.
  function updateProgress(position) {
    if (!progressBar || total === 0) return;

    position = Math.max(1, Math.min(position, total));

    if (bookProgress.ready) {
      var globalIndex = bookProgress.currentPageStart + position - 1;
      var denominator = Math.max(bookProgress.totalPassages - 1, 1);
      var percent = bookProgress.totalPassages === 1 ? 100 : (globalIndex / denominator) * 100;
      setProgressWidth(percent, true);
      saveProgressWidth(percent);
      return;
    }

    if (bookProgress.failed) {
      var localDenominator = Math.max(total - 1, 1);
      var localPercent = total === 1 ? 100 : ((position - 1) / localDenominator) * 100;
      setProgressWidth(localPercent, true);
    }
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
      e.preventDefault();
      navigateSidebarPage(1);
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      navigateSidebarPage(-1);
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
