# website-as-text

A terminal-friendly web page viewer that converts HTML to styled plain text with ANSI colors and clickable hyperlinks. Built with Bun's `HTMLRewriter` - no external HTML parsing dependencies.

## Features

- **ANSI styling** - Headings, bold, italic, underline, strikethrough, and code blocks rendered with terminal formatting
- **Clickable links** - OSC 8 hyperlinks work in modern terminals (iTerm2, Kitty, Windows Terminal, etc.)
- **Smart text extraction** - Respects `data-text-hidden` and `aria-hidden` attributes to skip non-essential content
- **Line wrapping** - Configurable line width with ANSI-aware word wrapping
- **Lists** - Proper bullet points and numbered lists with nesting support
- **Zero dependencies** - Uses only Bun's built-in `HTMLRewriter` and `Bun.color()` APIs

## Installation

```bash
bun install
```

## Usage

Start the server:

```bash
bun --hot index.ts
```

Then fetch any page via curl or a terminal browser:

```bash
curl http://localhost:3000
```

The server fetches the configured `TARGET` URL, converts it to styled terminal text, and returns it.

## Configuration

Edit `index.ts` to change:

- `TARGET` - The URL to fetch and convert
- `maxLineWidth` - Maximum characters per line (0 to disable wrapping)
- `baseUrl` - Base URL for resolving relative links

## How It Works

The converter uses a stack-based approach with Bun's `HTMLRewriter`:

1. **Format stack** - Tracks active styles (bold, italic, colors) as elements are entered/exited
2. **Skip depth** - Tracks hidden containers to skip their content entirely
3. **Pending newlines** - Defers newlines to properly separate block elements
4. **Post-processing** - Collapses excess whitespace and cleans up empty bullet lines

### Supported Elements

| Element | Rendering |
|---------|-----------|
| `h1`-`h6` | Bold + yellow |
| `strong`, `b` | Bold |
| `em`, `i` | Italic |
| `u` | Underline |
| `s`, `del` | Strikethrough |
| `code`, `pre` | Gray text |
| `a` | Blue + OSC 8 clickable link |
| `blockquote` | Dim + italic |
| `ul`, `ol`, `li` | Bullet/numbered lists |
| `hr` | Horizontal line |
| `img[alt]` | Shows alt text in brackets |

## Project Structure

```
.
├── index.ts              # Server entry point
├── lib/
│   ├── ansi.ts           # ANSI escape codes and OSC 8 helpers
│   └── html-to-text.ts   # HTML to text conversion using HTMLRewriter
└── package.json
```

## License

MIT
