# Quarto Focus Mode

A lightweight Quarto extension that adds a floating **Focus Mode** toggle button to Quarto Book and Quarto Website HTML outputs, plus a keyboard-driven **Presentation Mode** for navigating one section or subsection at a time.

Compatible with **Quarto ≥ 1.4**. **Desktop only** — the extension is automatically disabled on mobile and tablet devices.

![Quarto Focus Mode infographic](./infographic.png)

## Installation

From within a Quarto project:

```bash
quarto add lsbjordao/quarto-focus-mode
```

## Usage

Enable the extension by adding the filter to your `_quarto.yml`.

**Quarto Book** (`project: type: book`):

```yaml
format:
  html:
    filters:
      - focus-mode
```

**Quarto Website** (`project: type: website`) — requires sidebar navigation:

```yaml
website:
  sidebar:
    contents: ...   # sidebar must be defined for the extension to activate

format:
  html:
    filters:
      - focus-mode
```

Then render your project:

```bash
quarto render
```

## Focus Mode

Click the floating button (bottom-left) or use keyboard shortcuts to switch between:

- **Focus mode** → hides sidebar, margin TOC, and navbar, recenters content for distraction-free reading
- **TOC mode** → restores navigation panels

The selected mode is preserved while browsing the project.

### Keyboard shortcuts

| Key          | Action                          |
|--------------|---------------------------------|
| `f`          | Enter Focus Mode                |
| `t`          | Return to TOC (exit Focus Mode) |
| `d`          | Switch to Dark Mode             |
| `l`          | Switch to Light Mode            |
| `ArrowRight` | Go to next page                 |
| `ArrowLeft`  | Go to previous page             |

> Dark/Light mode shortcuts require a dark theme configured in `_quarto.yml` (e.g. `theme: [flatly, darkly]`).

## Presentation Mode

Press `p` to enter Presentation Mode. The page is split into one slide per section (every heading level), and you navigate with:

| Key        | Action                            |
|------------|-----------------------------------|
| `p`        | Toggle Presentation Mode on / off |
| `PageDown` | Next section                      |
| `PageUp`   | Previous section                  |

A small badge (e.g. `▶ 3 / 12`) appears in the bottom-right corner while Presentation Mode is active, showing your position in the section sequence.

Each slide shows the heading and direct content of that section. Nested subsections are hidden and become their own slides as you navigate forward.

The margin TOC highlights the current section as you navigate, so you always know where you are in the page structure.

## Custom content width

You can adjust the reading width in focus mode by defining:

```css
:root {
  --focus-content-width: 960px;
}
```

Add this rule to your project stylesheet.

## Features

- Floating toggle button with hover animation
- Keyboard shortcuts for Focus Mode (`f` / `t`), color scheme (`d` / `l`), and Presentation Mode (`p`)
- Page navigation via keyboard (`ArrowRight` / `ArrowLeft`)
- Sidebar, margin TOC, and navbar hide/show
- Presentation Mode with per-section slide navigation (`PageDown` / `PageUp`)
- Slide position indicator
- Margin TOC highlight synced to current slide
- Global progress bar across all pages and sections
- Reading-optimized layout width
- Local state persistence (per browser session)
- Works with Quarto Book and Quarto Website (with sidebar navigation)

## Why Quarto Book and Website?

This extension targets both **Quarto Book** and **Quarto Website** (with sidebar navigation) for complementary reasons.

**Quarto Book** has citations and bibliography support — essential for academic and technical writing — but no built-in way to collapse or hide the sidebar. This extension adds that missing piece.

**Quarto Website** has its own sidebar collapse mechanism, but lacks the citation and bibliography pipeline that Quarto Book provides. When a website project needs full sidebar navigation with a sequence of content pages, this extension adds the same focus and presentation capabilities.

The original motivation was the preparation of **academic content with a dual purpose**:

1. Publishing a web-accessible book or website with full navigation, cross-references, and bibliography.
2. Delivering the same content as **presentable didactic material** — improving UX by reclaiming screen real estate and allowing each section to fill the viewport, as Focus Mode and Presentation Mode enable.

## Compatibility

This extension works with **Quarto Book** and **Quarto Website** (configured with sidebar navigation) on **desktop devices**.

On mobile and tablet devices (touch screens, coarse pointer), all UI and keyboard shortcuts are automatically disabled. The extension detects the device type via the CSS media feature `(hover: hover) and (pointer: fine)`, which distinguishes mouse-driven desktops from touch-based devices.

The button also automatically hides itself on pages that do not use the Quarto sidebar structure (e.g. Quarto Website with navbar-only navigation).
