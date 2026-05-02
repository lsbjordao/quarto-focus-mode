# Quarto Book Focus Mode

A lightweight Quarto extension that adds a floating **Focus Mode** toggle button to Quarto Book HTML outputs, plus a keyboard-driven **Presentation Mode** for navigating one section at a time.

Compatible with **Quarto ≥ 1.4**.

## Installation

From within a Quarto project:

```bash
quarto add lsbjordao/quarto-book-focus-mode
```

## Usage

Enable the extension by adding the filter to your `_quarto.yml`:

```yaml
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

- **Focus mode** → hides sidebar and margin TOC, recenters content for distraction-free reading
- **TOC mode** → restores navigation panels

The selected mode is preserved while browsing the book.

### Keyboard shortcuts

| Key | Action                          |
|-----|---------------------------------|
| `f` | Enter Focus Mode                |
| `t` | Return to TOC (exit Focus Mode) |
| `d` | Switch to Dark Mode             |
| `l` | Switch to Light Mode            |
| `ArrowRight` | Go to next chapter page   |
| `ArrowLeft`  | Go to previous chapter page |

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

## Custom content width

You can adjust the reading width in focus mode by defining:

```css
:root {
  --book-focus-content-width: 960px;
}
```

Add this rule to your project stylesheet.

## Features

- Floating toggle button with hover animation
- Keyboard shortcuts for Focus Mode (`f` / `t`), color scheme (`d` / `l`), and Presentation Mode (`p`)
- Chapter page navigation via keyboard (`ArrowRight` / `ArrowLeft`)
- Sidebar + margin TOC hide/show
- Presentation Mode with per-section slide navigation (`PageDown` / `PageUp`)
- Slide position indicator
- Reading-optimized layout width
- Local state persistence (per browser session)
- Automatically activates only for Quarto Book layout

## Compatibility

This extension is designed specifically for **Quarto Book HTML output**.

The button automatically hides itself on pages that do not use the Quarto Book sidebar structure.
