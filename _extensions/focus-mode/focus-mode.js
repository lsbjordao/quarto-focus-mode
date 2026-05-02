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

  /* ── Focus Mode ── */
  var hasBookSidebar = document.querySelector("#quarto-sidebar") !== null;
  if (!hasBookSidebar) {
    button.style.display = "none";
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

  var globalTotalSteps = slides.length;
  var globalOffsetSteps = 0;
  var globalProgressReady = false;

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
    path = String(path || "").trim().toLowerCase();
    if (path === "/" || path.endsWith("/")) return true;
    path = normalizePath(path);
    return path === "/index" ||
      path === "/index.html" ||
      path === "/index.qmd" ||
      path.endsWith("/index") ||
      path.endsWith("/index.html") ||
      path.endsWith("/index.qmd");
  }

  var currentPath = normalizePath(window.location.pathname || "/");

  function getLocalProgressPosition() {
    if (slides.length <= 0) return 0;
    if (hasPrelude && currentIdx === -1) return 0;
    if (currentIdx < 0) return 0;
    return currentIdx + 1;
  }

  // Prelude is 0%; each section/subsection advances by one equal step globally.
  function updateProgress(position) {
    if (!progressBar) return;

    var localSteps = slides.length;
    if (localSteps <= 0) {
      progressBar.style.width = "0%";
      return;
    }

    var localPos = Math.max(0, Math.min(position, localSteps));
    var absolutePos = localPos;
    var totalSteps = localSteps;

    if (globalProgressReady && globalTotalSteps > 0) {
      absolutePos = Math.max(0, Math.min(globalOffsetSteps + localPos, globalTotalSteps));
      totalSteps = globalTotalSteps;
    }

    progressBar.style.width = ((absolutePos / totalSteps) * 100) + "%";
  }

  function refreshProgressFromState() {
    updateProgress(getLocalProgressPosition());
  }

  (function computeGlobalProgressSteps() {
    if (!window.fetch || !window.DOMParser) return;

    var links = document.querySelectorAll("#quarto-sidebar a[href]");
    if (!links || links.length === 0) return;

    var pagePaths = [];
    var seen = {};
    for (var i = 0; i < links.length; i++) {
      var path = pathFromHref(links[i].getAttribute("href") || "");
      if (!path || isIndexPath(path)) continue;
      if (seen[path]) continue;
      seen[path] = true;
      pagePaths.push(path);
    }
    if (pagePaths.length === 0) return;

    var currentPageIdx = -1;
    for (var j = 0; j < pagePaths.length; j++) {
      if (pagePaths[j] === currentPath) {
        currentPageIdx = j;
        break;
      }
    }
    if (currentPageIdx < 0) return;

    Promise.all(pagePaths.map(function (path) {
      if (path === currentPath) {
        return Promise.resolve({ path: path, count: slides.length });
      }

      var url = new URL(path, window.location.href).toString();
      return fetch(url, { credentials: "same-origin" })
        .then(function (response) {
          if (!response.ok) throw new Error("fetch_failed");
          return response.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, "text/html");
          var root = doc.getElementById("quarto-document-content");
          var count = root ? root.querySelectorAll('section[class*="level"]').length : 0;
          return { path: path, count: count };
        })
        .catch(function () {
          return { path: path, count: 0 };
        });
    }))
      .then(function (results) {
        var countsByPath = {};
        for (var r = 0; r < results.length; r++) {
          countsByPath[results[r].path] = Math.max(0, results[r].count || 0);
        }

        var totalSteps = 0;
        var offsetSteps = 0;
        for (var p = 0; p < pagePaths.length; p++) {
          var count = countsByPath[pagePaths[p]] || 0;
          if (p < currentPageIdx) offsetSteps += count;
          totalSteps += count;
        }

        if (totalSteps <= 0) return;

        globalTotalSteps = totalSteps;
        globalOffsetSteps = offsetSteps;
        globalProgressReady = true;
        refreshProgressFromState();
      })
      .catch(function () {});
  })();

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
    counter.textContent = "0 / " + slides.length;
    updateProgress(0);
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

    var position = idx + 1;
    counter.textContent = position + " / " + (hasPrelude ? slides.length : total);
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
