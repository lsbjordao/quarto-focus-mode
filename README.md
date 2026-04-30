# Quarto Book Focus Mode

A small Quarto extension that adds a floating **Focus Mode** button to Quarto Book HTML outputs.

The button hides the left sidebar and page table of contents, recenters the main content, and can be toggled back to show the TOC/sidebar again.

## Installation

From a Quarto project:

```bash
quarto add lsbjordao/quarto-book-focus-mode
```

For local testing:

```bash
quarto add ../quarto-book-focus-mode
```

## Usage

Add the filter to your `_quarto.yml`:

```yaml
filters:
  - book-focus-mode
```

Or under HTML format:

```yaml
format:
  html:
    filters:
      - book-focus-mode
```

Then render:

```bash
quarto render
```

## Custom content width

You can override the focused content width with CSS:

```css
:root {
  --book-focus-content-width: 960px;
}
```

## Notes

This extension is intended for Quarto Book HTML output. It hides itself on pages without the standard Quarto book sidebar.
