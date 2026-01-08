# Project: website-as-text

HTML to terminal text converter using Bun's HTMLRewriter.

## Stack

- **Runtime**: Bun (not Node.js)
- **HTML parsing**: `HTMLRewriter` (Bun built-in, no external libraries)
- **Colors**: `Bun.color()` for terminal-aware ANSI colors

## Key Files

- `index.ts` - Server entry point, configures TARGET URL and options
- `lib/ansi.ts` - ANSI escape codes, OSC 8 hyperlink helpers
- `lib/html-to-text.ts` - Core conversion logic using HTMLRewriter

## Architecture

The converter uses a **stack-based streaming approach**:

1. `formatStack` - Tracks active ANSI styles as elements open/close
2. `skipDepth` - Counter for nested hidden elements (don't emit their text)
3. `pendingNewlines` - Deferred newlines for block element spacing
4. `listStack` - Tracks nested list context for bullets/numbering

## Commands

```bash
bun --hot index.ts    # Start server with hot reload
curl localhost:3000   # Fetch converted text
```

## Hidden Content Attributes

The converter respects these attributes to skip non-essential content:

- `data-text-hidden="true"` - Custom attribute for text-only hiding
- `aria-hidden="true"` - Standard accessibility hiding

Important: Check attribute **values**, not just presence. `data-text-hidden="false"` should NOT hide content.

## Styling Reference

| Element | ANSI Style |
|---------|------------|
| Headings | Bold + yellow (`Bun.color("yellow")`) |
| Links | Blue + OSC 8 hyperlink |
| Code/pre | Gray |
| Bold/strong | `\x1b[1m` |
| Italic/em | `\x1b[3m` |
| Underline | `\x1b[4m` |
| Strikethrough | `\x1b[9m` |
