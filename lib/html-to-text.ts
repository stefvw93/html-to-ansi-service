import { DOMAIN } from "../shared";
import { ANSI, osc8, style } from "./ansi";

/** Default print width for rulers and line wrapping */
const DEFAULT_PRINT_WIDTH = 80;

/** Options for HTML to text conversion */
export interface ConvertOptions {
	/** Maximum line width. Set to 0 or undefined to disable wrapping. */
	maxLineWidth?: number;
	/** Base URL for resolving relative links. */
	baseUrl?: string;
}

const DEFAULT_OPTIONS: ConvertOptions = {
	maxLineWidth: 0,
	baseUrl: undefined,
};

/** Resolve a URL against a base URL */
function resolveUrl(href: string, baseUrl?: string): string {
	if (!baseUrl || !href) return href;
	// Already absolute
	if (
		href.startsWith("http://") ||
		href.startsWith("https://") ||
		href.startsWith("mailto:")
	) {
		return href;
	}
	try {
		return new URL(href, baseUrl).href;
	} catch {
		return href;
	}
}

/** Common HTML entities */
const HTML_ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&apos;": "'",
	"&nbsp;": " ",
	"&copy;": "\u00A9",
	"&reg;": "\u00AE",
	"&trade;": "\u2122",
	"&mdash;": "\u2014",
	"&ndash;": "\u2013",
	"&hellip;": "\u2026",
	"&lsquo;": "\u2018",
	"&rsquo;": "\u2019",
	"&ldquo;": "\u201C",
	"&rdquo;": "\u201D",
};

/** Decode HTML entities in text */
function decodeHtmlEntities(text: string): string {
	// Decode named entities
	let result = text;
	for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
		result = result.replaceAll(entity, char);
	}
	// Decode numeric entities (&#123; or &#x7B;)
	result = result.replace(/&#(\d+);/g, (_, num) =>
		String.fromCharCode(parseInt(num, 10)),
	);
	result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
		String.fromCharCode(parseInt(hex, 16)),
	);
	return result;
}

// Void elements (self-closing, no end tag)
const VOID_ELEMENTS = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

const REMOVE_SELECTORS = [
	"script",
	"style",
	"link",
	"meta",
	"noscript",
	"svg",
	"head",
	"template",
	"img",
	"aside",
	"*[data-text-hidden='true']",
	"*[aria-hidden='true']",
].join(",");

// Element styles using standard ANSI colors (inherits from terminal theme)
const ELEMENT_STYLES: Record<string, string[]> = {
	h1: [ANSI.bold, ANSI.yellow],
	h2: [ANSI.bold, ANSI.yellow],
	h3: [ANSI.bold, ANSI.yellow],
	h4: [ANSI.bold, ANSI.yellow],
	h5: [ANSI.bold, ANSI.yellow],
	h6: [ANSI.bold, ANSI.yellow],
	strong: [ANSI.bold],
	b: [ANSI.bold],
	em: [ANSI.italic],
	i: [ANSI.italic],
	u: [ANSI.underline],
	s: [ANSI.strikethrough],
	del: [ANSI.strikethrough],
	strike: [ANSI.strikethrough],
	code: [ANSI.brightBlack],
	kbd: [ANSI.cyan],
	mark: [ANSI.bold, ANSI.cyan],
	a: [ANSI.blue],
	blockquote: [ANSI.dim, ANSI.italic],
	pre: [ANSI.brightBlack],
	time: [ANSI.dim],
	address: [ANSI.dim],
};

// Block elements get empty line separation (2 = double newline)
// List items and similar just get single newlines
const BLOCK_ELEMENTS = new Set([
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"p",
	"section",
	"article",
	"header",
	"footer",
	"main",
	"nav",
	"blockquote",
	"pre",
	"figure",
	"hr",
]);

interface FormatFrame {
	tag: string;
	styles: string[];
}

interface ListContext {
	type: "ul" | "ol";
	counter: number;
	depth: number;
}

interface ConversionState {
	output: string[];
	formatStack: FormatFrame[];
	pendingNewlines: number;
	lastCharWasSpace: boolean;
	inPreformatted: boolean;
	listStack: ListContext[];
	linkHref: string | null;
	skipDepth: number; // Tracks how many skip elements we're nested in
	documentTitle: string; // Captured from <title> element
	inTitle: boolean; // Whether we're inside a <title> element
}

function createState(): ConversionState {
	return {
		output: [],
		formatStack: [],
		pendingNewlines: 0,
		lastCharWasSpace: true,
		inPreformatted: false,
		listStack: [],
		linkHref: null,
		skipDepth: 0,
		documentTitle: "",
		inTitle: false,
	};
}

function emitNewlines(state: ConversionState): void {
	if (state.pendingNewlines > 0) {
		// Cap at 2 newlines max (one empty line) to keep spacing balanced
		const newlines = Math.min(state.pendingNewlines, 2);
		state.output.push("\n".repeat(newlines));
		state.pendingNewlines = 0;
		state.lastCharWasSpace = true;
	}
}

function emitText(text: string, state: ConversionState): void {
	if (state.skipDepth > 0 || !text) return;

	// Decode HTML entities
	let content = decodeHtmlEntities(text);

	// Collapse whitespace unless in preformatted
	if (!state.inPreformatted) {
		content = content.replace(/\s+/g, " ");
		// Skip if only whitespace and we just had a space
		if (content === " " && state.lastCharWasSpace) return;
		// Trim leading space if we just had one
		if (state.lastCharWasSpace && content.startsWith(" ")) {
			content = content.slice(1);
		}
		if (!content) return;
	}

	// Emit pending newlines before content
	emitNewlines(state);

	// Apply current formatting
	const currentStyles = state.formatStack.flatMap((f) => f.styles);
	if (currentStyles.length > 0) {
		state.output.push(style(...currentStyles) + content + ANSI.reset);
	} else {
		state.output.push(content);
	}

	state.lastCharWasSpace = content.endsWith(" ") || content.endsWith("\n");
}

function pushFormat(
	tag: string,
	styles: string[],
	state: ConversionState,
): void {
	state.formatStack.push({ tag, styles });
}

function popFormat(tag: string, state: ConversionState): void {
	// Pop all frames up to and including the matching tag
	const idx = state.formatStack.findLastIndex((f) => f.tag === tag);
	if (idx >= 0) {
		state.formatStack.splice(idx, 1);
	}
}

// Regex patterns for ANSI escape sequences (using string escapes to satisfy linter)
const ESC = "\x1b";
const BEL = "\x07";
const ANSI_PATTERN = new RegExp(
	`${ESC}\\][^${BEL}]*${BEL}|${ESC}\\[[0-9;]*m`,
	"g",
);
const OSC8_LINE_PATTERN = new RegExp(
	`\\n+(${ESC}\\]8;;[^${BEL}]*${BEL})\\n`,
	"g",
);

/** Calculate visible length of a string (excluding ANSI escape codes) */
function visibleLength(str: string): number {
	// Remove ANSI escape sequences and OSC 8 hyperlinks
	return str.replace(ANSI_PATTERN, "").length;
}

/** Wrap text to a maximum line width, preserving ANSI codes */
function wrapLines(text: string, maxWidth: number): string {
	if (maxWidth <= 0) return text;

	const lines = text.split("\n");
	const result: string[] = [];

	for (const line of lines) {
		if (visibleLength(line) <= maxWidth) {
			result.push(line);
			continue;
		}

		// Need to wrap this line
		let currentLine = "";
		let currentVisibleLen = 0;
		let activeAnsi = ""; // Track active ANSI codes to restore after wrap

		// Tokenize: split into ANSI codes and regular text
		const tokens = line.split(
			new RegExp(`(${ESC}\\][^${BEL}]*${BEL}|${ESC}\\[[0-9;]*m)`),
		);

		for (const token of tokens) {
			if (!token) continue;

			// Check if it's an ANSI escape sequence
			if (token.startsWith("\x1b")) {
				currentLine += token;
				// Track formatting codes (not OSC 8)
				if (token.startsWith("\x1b[")) {
					if (token === ANSI.reset) {
						activeAnsi = "";
					} else {
						activeAnsi += token;
					}
				}
				continue;
			}

			// Regular text - split into words
			const words = token.split(/( +)/);

			for (const word of words) {
				if (!word) continue;

				const wordLen = word.length;

				// If adding this word would exceed max width
				if (currentVisibleLen + wordLen > maxWidth && currentVisibleLen > 0) {
					// End current line (reset formatting if active)
					if (activeAnsi) {
						currentLine += ANSI.reset;
					}
					result.push(currentLine.trimEnd());

					// Start new line (restore formatting), skip leading spaces
					const trimmedWord = word.trimStart();
					if (trimmedWord) {
						currentLine = activeAnsi + trimmedWord;
						currentVisibleLen = trimmedWord.length;
					} else {
						currentLine = activeAnsi;
						currentVisibleLen = 0;
					}
				} else {
					currentLine += word;
					currentVisibleLen += wordLen;
				}
			}
		}

		// Don't forget the last line
		if (currentLine) {
			result.push(currentLine);
		}
	}

	return result.join("\n");
}

export function convertHtmlToText(
	html: string,
	options: ConvertOptions = {},
): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const state = createState();

	const rewriter = new HTMLRewriter()
		// Capture document title (before head is skipped)
		.on("title", {
			element: (el) => {
				state.inTitle = true;
				el.onEndTag(() => {
					state.inTitle = false;
				});
			},
			text: (text) => {
				state.documentTitle += text.text;
			},
		})

		// Handle headings
		.on("h1,h2,h3,h4,h5,h6", {
			element: (el) => {
				// Skip hidden headings
				if (
					el.getAttribute("data-text-hidden") === "true" ||
					el.getAttribute("aria-hidden") === "true"
				)
					return;

				const tag = el.tagName.toLowerCase();
				state.pendingNewlines = Math.max(state.pendingNewlines, 2);

				const styles = ELEMENT_STYLES[tag] || [ANSI.bold];
				pushFormat(tag, styles, state);

				el.onEndTag(() => {
					popFormat(tag, state);
					state.pendingNewlines = Math.max(state.pendingNewlines, 2);
				});
			},
		})

		// Handle inline formatting
		.on("strong,b", {
			element: (el) => {
				pushFormat("strong", [ANSI.bold], state);
				el.onEndTag(() => popFormat("strong", state));
			},
		})
		.on("em,i", {
			element: (el) => {
				pushFormat("em", [ANSI.italic], state);
				el.onEndTag(() => popFormat("em", state));
			},
		})
		.on("u", {
			element: (el) => {
				pushFormat("u", [ANSI.underline], state);
				el.onEndTag(() => popFormat("u", state));
			},
		})
		.on("s,del,strike", {
			element: (el) => {
				pushFormat("s", [ANSI.strikethrough], state);
				el.onEndTag(() => popFormat("s", state));
			},
		})
		.on("code", {
			element: (el) => {
				pushFormat("code", ELEMENT_STYLES.code || [], state);
				el.onEndTag(() => popFormat("code", state));
			},
		})
		.on("kbd", {
			element: (el) => {
				pushFormat("kbd", ELEMENT_STYLES.kbd || [], state);
				el.onEndTag(() => popFormat("kbd", state));
			},
		})
		.on("mark", {
			element: (el) => {
				pushFormat("mark", ELEMENT_STYLES.mark || [], state);
				el.onEndTag(() => popFormat("mark", state));
			},
		})

		// Handle time and address as inline muted elements
		.on("time", {
			element: (el) => {
				pushFormat("time", ELEMENT_STYLES.time || [], state);
				el.onEndTag(() => popFormat("time", state));
			},
		})
		.on("address", {
			element: (el) => {
				pushFormat("address", ELEMENT_STYLES.address || [], state);
				el.onEndTag(() => popFormat("address", state));
			},
		})

		// Handle links with OSC 8
		.on("a[href]", {
			element: (el) => {
				// Skip links inside hidden containers or with hidden attribute
				if (state.skipDepth > 0) return;
				if (
					el.getAttribute("data-text-hidden") === "true" ||
					el.getAttribute("aria-hidden") === "true"
				)
					return;

				const href = el.getAttribute("href");
				if (href) {
					const resolvedHref = resolveUrl(href, opts.baseUrl);
					const showCurlSource = el.getAttribute("data-text-source") === "true";

					// Emit pending newlines before opening the hyperlink
					emitNewlines(state);
					state.output.push(osc8.open(resolvedHref));
					pushFormat("a", ELEMENT_STYLES.a || [], state);

					// Track output length to detect empty links
					const outputLenBefore = state.output.length;

					el.onEndTag(() => {
						// If no text was emitted, use URL path as fallback
						if (state.output.length === outputLenBefore) {
							try {
								const url = new URL(resolvedHref);
								const path = decodeURIComponent(url.pathname);
								const fallback = path === "/" ? url.hostname : path;
								// Apply link styling to fallback text
								const linkStyles = ELEMENT_STYLES.a || [];
								state.output.push(style(...linkStyles) + fallback + ANSI.reset);
							} catch {
								const linkStyles = ELEMENT_STYLES.a || [];
								state.output.push(style(...linkStyles) + href + ANSI.reset);
							}
						}
						popFormat("a", state);
						state.output.push(osc8.close());

						// Append curl command if data-text-source="true"
						if (showCurlSource) {
							try {
								const url = new URL(resolvedHref);
								const curlUrl = `${DOMAIN || url.hostname}${url.pathname}`;
								state.output.push(
									`${ANSI.dim} - $ ${ANSI.reset}${ANSI.green}curl ${ANSI.cyan}${curlUrl}${ANSI.reset}`,
								);
							} catch {
								state.output.push(
									`${ANSI.dim} - $ ${ANSI.reset}${ANSI.green}curl ${ANSI.cyan}${href}${ANSI.reset}`,
								);
							}
						}
					});
				}
			},
		})

		// Handle block elements - they get empty line separation
		.on("p,div,section,article,header,footer,main,nav,figure", {
			element: (el) => {
				const tag = el.tagName.toLowerCase();
				const newlines = BLOCK_ELEMENTS.has(tag) ? 2 : 1;
				state.pendingNewlines = Math.max(state.pendingNewlines, newlines);

				el.onEndTag(() => {
					state.pendingNewlines = Math.max(state.pendingNewlines, newlines);
				});
			},
		})

		// Handle custom elements (contain hyphen) as block elements
		.on("*", {
			element: (el) => {
				const tag = el.tagName.toLowerCase();
				if (tag.includes("-")) {
					state.pendingNewlines = Math.max(state.pendingNewlines, 2);
					el.onEndTag(() => {
						state.pendingNewlines = Math.max(state.pendingNewlines, 2);
					});
				}
			},
		})

		// Handle blockquote
		.on("blockquote", {
			element: (el) => {
				state.pendingNewlines = Math.max(state.pendingNewlines, 1);
				pushFormat("blockquote", ELEMENT_STYLES.blockquote || [], state);

				el.onEndTag(() => {
					popFormat("blockquote", state);
					state.pendingNewlines = Math.max(state.pendingNewlines, 1);
				});
			},
		})

		// Handle preformatted text
		.on("pre", {
			element: (el) => {
				state.pendingNewlines = Math.max(state.pendingNewlines, 1);
				state.inPreformatted = true;
				pushFormat("pre", ELEMENT_STYLES.pre || [], state);

				el.onEndTag(() => {
					popFormat("pre", state);
					state.inPreformatted = false;
					state.pendingNewlines = Math.max(state.pendingNewlines, 1);
				});
			},
		})

		// Handle lists
		.on("ul", {
			element: (el) => {
				// Skip hidden lists
				if (
					el.getAttribute("data-text-hidden") === "true" ||
					el.getAttribute("aria-hidden") === "true"
				)
					return;

				state.pendingNewlines = Math.max(state.pendingNewlines, 1);
				state.listStack.push({
					type: "ul",
					counter: 0,
					depth: state.listStack.length,
				});

				el.onEndTag(() => {
					state.listStack.pop();
					state.pendingNewlines = Math.max(state.pendingNewlines, 1);
				});
			},
		})
		.on("ol", {
			element: (el) => {
				// Skip hidden lists
				if (
					el.getAttribute("data-text-hidden") === "true" ||
					el.getAttribute("aria-hidden") === "true"
				)
					return;

				state.pendingNewlines = Math.max(state.pendingNewlines, 1);
				const start = parseInt(el.getAttribute("start") || "1", 10);
				state.listStack.push({
					type: "ol",
					counter: start - 1,
					depth: state.listStack.length,
				});

				el.onEndTag(() => {
					state.listStack.pop();
					state.pendingNewlines = Math.max(state.pendingNewlines, 1);
				});
			},
		})
		.on("li", {
			element: (el) => {
				// Skip list items inside hidden containers or with hidden attribute
				if (state.skipDepth > 0) return;
				if (
					el.getAttribute("data-text-hidden") === "true" ||
					el.getAttribute("aria-hidden") === "true"
				)
					return;

				// Force a newline before each list item
				state.pendingNewlines = Math.max(state.pendingNewlines, 1);
				emitNewlines(state);

				const list = state.listStack[state.listStack.length - 1];
				if (list) {
					list.counter++;
					const bullet = list.type === "ul" ? "• " : `${list.counter}. `;
					state.output.push(bullet);
					state.lastCharWasSpace = false;
				}

				// Add newline after list item content
				el.onEndTag(() => {
					state.pendingNewlines = Math.max(state.pendingNewlines, 1);
				});
			},
		})

		// Handle line breaks
		.on("br", {
			element: () => {
				state.pendingNewlines = Math.max(state.pendingNewlines, 1);
			},
		})

		// Handle horizontal rules
		.on("hr", {
			element: () => {
				emitNewlines(state);
				state.pendingNewlines = 1;
				const width =
					opts.maxLineWidth && opts.maxLineWidth > 0
						? opts.maxLineWidth
						: DEFAULT_PRINT_WIDTH;
				state.output.push("─".repeat(width));
				state.pendingNewlines = 1;
			},
		})

		// Handle images - show alt text
		// .on("img[alt]", {
		// 	element: (el) => {
		// 		const alt = el.getAttribute("alt");
		// 		if (alt?.trim()) {
		// 			emitText(`[${alt}]`, state);
		// 		}
		// 	},
		// })

		// Skip content inside non-visual elements (must be last to override other handlers' onEndTag)
		.on(REMOVE_SELECTORS, {
			element: (el) => {
				const tag = el.tagName.toLowerCase();
				// Void elements have no content, just remove them
				if (VOID_ELEMENTS.has(tag)) {
					el.remove();
					return;
				}
				// For elements with content, track skip depth
				state.skipDepth++;
				el.onEndTag(() => {
					state.skipDepth--;
				});
				el.remove();
			},
		})

		// Handle all text content
		.on("*", {
			text: (text) => {
				emitText(text.text, state);
			},
		});

	rewriter.transform(html);

	let result = state.output.join("").trim();

	// Pre-wrap cleanup:
	// 1. Remove empty bullet lines (bullets with no content)
	result = result.replace(/^[•\d]+\.?\s*$/gm, "");
	// 2. Join OSC 8 sequences on their own line with the next line
	result = result.replace(OSC8_LINE_PATTERN, "\n$1");

	// Apply line wrapping if configured
	if (opts.maxLineWidth && opts.maxLineWidth > 0) {
		result = wrapLines(result, opts.maxLineWidth);
	}

	// Post-wrap cleanup:
	// 3. Strip trailing whitespace from each line
	result = result.replace(/[ \t]+$/gm, "");
	// 4. Collapse multiple newlines to max 2 (one empty line)
	result = result.replace(/\n{2,}/g, "\n\n");

	// Prepend document title with ruler if we have a title
	const title = state.documentTitle.trim();
	if (title) {
		const rulerWidth =
			opts.maxLineWidth && opts.maxLineWidth > 0
				? opts.maxLineWidth
				: DEFAULT_PRINT_WIDTH;
		const ruler = "─".repeat(rulerWidth);
		let titleLine = title;
		if (opts.baseUrl) {
			try {
				const host = new URL(opts.baseUrl).hostname;
				titleLine = `${title} - ${host}`;
			} catch {
				// Invalid URL, just use title
			}
		}
		result = `${ruler}\n${style(ANSI.bold)}${titleLine}${ANSI.reset}\n${ruler}\n\n${result}`;
	}

	// Ensure output ends with a single newline for clean terminal output
	return `${result}\n`;
}
