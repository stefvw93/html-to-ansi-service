import { expect, test } from "bun:test";
import { ANSI, osc8 } from "./ansi";
import { convertHtmlToText } from "./html-to-text";

test("extracts plain text", () => {
	const html = "<p>Hello world</p>";
	const result = convertHtmlToText(html);
	expect(result).toBe("Hello world");
});

test("collapses whitespace", () => {
	const html = "<p>Hello    world\n\n  test</p>";
	const result = convertHtmlToText(html);
	expect(result).toBe("Hello world test");
});

test("applies bold formatting", () => {
	const html = "<p>Hello <strong>bold</strong> world</p>";
	const result = convertHtmlToText(html);
	expect(result).toContain(ANSI.bold);
	expect(result).toContain("bold");
	expect(result).toContain(ANSI.reset);
});

test("applies italic formatting", () => {
	const html = "<p>Hello <em>italic</em> world</p>";
	const result = convertHtmlToText(html);
	expect(result).toContain(ANSI.italic);
	expect(result).toContain("italic");
});

test("handles nested formatting", () => {
	const html = "<p><strong><em>bold italic</em></strong></p>";
	const result = convertHtmlToText(html);
	expect(result).toContain(ANSI.bold);
	expect(result).toContain(ANSI.italic);
	expect(result).toContain("bold italic");
});

test("creates OSC 8 hyperlinks", () => {
	const html = '<p><a href="https://example.com">link text</a></p>';
	const result = convertHtmlToText(html);
	expect(result).toContain(osc8.open("https://example.com"));
	expect(result).toContain("link text");
	expect(result).toContain(osc8.close());
});

test("handles headings with newlines", () => {
	const html = "<h1>Title</h1><p>Paragraph</p>";
	const result = convertHtmlToText(html);
	expect(result).toContain("Title");
	expect(result).toContain("Paragraph");
	expect(result).toContain("\n");
});

test("handles unordered lists", () => {
	const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
	const result = convertHtmlToText(html);
	expect(result).toContain("• Item 1");
	expect(result).toContain("• Item 2");
});

test("handles ordered lists", () => {
	const html = "<ol><li>First</li><li>Second</li></ol>";
	const result = convertHtmlToText(html);
	expect(result).toContain("1. First");
	expect(result).toContain("2. Second");
});

test("handles nested lists", () => {
	const html = "<ul><li>Outer<ul><li>Inner</li></ul></li></ul>";
	const result = convertHtmlToText(html);
	expect(result).toContain("• Outer");
	expect(result).toContain("  • Inner");
});

test("removes script and style", () => {
	const html = "<script>alert('x')</script><style>body{}</style><p>Content</p>";
	const result = convertHtmlToText(html);
	expect(result).toBe("Content");
	expect(result).not.toContain("alert");
	expect(result).not.toContain("body");
});

test("handles horizontal rules", () => {
	const html = "<p>Before</p><hr><p>After</p>";
	const result = convertHtmlToText(html);
	expect(result).toContain("Before");
	expect(result).toContain("─");
	expect(result).toContain("After");
});

test("preserves preformatted whitespace", () => {
	const html = "<pre>line1\n  indented</pre>";
	const result = convertHtmlToText(html);
	expect(result).toContain("line1\n  indented");
});

test("shows image alt text", () => {
	const html = '<img src="test.jpg" alt="An image">';
	const result = convertHtmlToText(html);
	expect(result).toContain("[An image]");
});

test("handles br tags", () => {
	const html = "<p>Line 1<br>Line 2</p>";
	const result = convertHtmlToText(html);
	expect(result).toContain("Line 1\nLine 2");
});

// E2E test with realistic HTML document
test("e2e: converts full HTML document", () => {
	const html = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Page</title>
  <link rel="stylesheet" href="styles.css">
  <style>
    body { font-family: sans-serif; }
    .hidden { display: none; }
  </style>
  <script>
    console.log('This should not appear');
  </script>
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>

  <main>
    <h1>Welcome to My Site</h1>
    <p>This is a <strong>bold</strong> and <em>italic</em> paragraph.</p>

    <h2>Features</h2>
    <ul>
      <li>Fast performance</li>
      <li>Easy to use</li>
      <li>Nested lists:
        <ul>
          <li>Sub-item 1</li>
          <li>Sub-item 2</li>
        </ul>
      </li>
    </ul>

    <h3>Code Example</h3>
    <pre><code>function hello() {
  return "world";
}</code></pre>

    <p>Visit <a href="https://example.com">our website</a> for more info.</p>

    <blockquote>
      This is a famous quote.
    </blockquote>

    <hr>

    <p>Image: <img src="photo.jpg" alt="A beautiful sunset"></p>

    <div aria-hidden="true">This should be hidden</div>
    <noscript>JavaScript is disabled</noscript>
    <svg><circle cx="50" cy="50" r="40"/></svg>
  </main>

  <footer>
    <p>&copy; 2024 Test Site</p>
  </footer>
</body>
</html>`;

	const result = convertHtmlToText(html);

	// Should contain main content
	expect(result).toContain("Welcome to My Site");
	expect(result).toContain("bold");
	expect(result).toContain("italic");
	expect(result).toContain("Features");
	expect(result).toContain("• Fast performance");
	expect(result).toContain("  • Sub-item 1");
	expect(result).toContain("Code Example");
	expect(result).toContain("function hello()");
	expect(result).toContain("This is a famous quote");
	expect(result).toContain("[A beautiful sunset]");
	expect(result).toContain("Test Site");

	// Should contain links
	expect(result).toContain(osc8.open("https://example.com"));
	expect(result).toContain("our website");

	// Should NOT contain hidden/removed content
	expect(result).not.toContain("This should not appear");
	expect(result).not.toContain("font-family");
	expect(result).not.toContain("This should be hidden");
	expect(result).not.toContain("JavaScript is disabled");
	expect(result).not.toContain("circle");
	expect(result).not.toContain("<");
	expect(result).not.toContain(">");

	// Should have ANSI formatting
	expect(result).toContain(ANSI.bold);
	expect(result).toContain(ANSI.italic);
});

// Line wrapping tests
test("wraps long lines at word boundaries", () => {
	const html = "<p>This is a very long line that should be wrapped at word boundaries when maxLineWidth is set.</p>";
	const result = convertHtmlToText(html, { maxLineWidth: 40 });
	const lines = result.split("\n");
	// Each line should be <= 40 visible characters
	for (const line of lines) {
		const visibleLen = line.replace(/\x1b\][^\x07]*\x07|\x1b\[[0-9;]*m/g, "").length;
		expect(visibleLen).toBeLessThanOrEqual(40);
	}
	expect(lines.length).toBeGreaterThan(1);
});

test("preserves short lines without wrapping", () => {
	const html = "<p>Short line</p>";
	const result = convertHtmlToText(html, { maxLineWidth: 80 });
	expect(result).toBe("Short line");
});

test("wrapping preserves ANSI formatting", () => {
	const html = "<p><strong>This is bold text that goes on for a very long time and should wrap</strong></p>";
	const result = convertHtmlToText(html, { maxLineWidth: 30 });
	const lines = result.split("\n");
	// Each line should have bold formatting
	for (const line of lines) {
		expect(line).toContain(ANSI.bold);
	}
});

test("no wrapping when maxLineWidth is 0", () => {
	const html = "<p>This is a long line that would normally be wrapped but maxLineWidth is zero so it stays on one line.</p>";
	const result = convertHtmlToText(html, { maxLineWidth: 0 });
	expect(result.split("\n").length).toBe(1);
});

test("no wrapping when maxLineWidth is not set", () => {
	const html = "<p>This is a long line that would normally be wrapped but maxLineWidth is not set so it stays on one line.</p>";
	const result = convertHtmlToText(html);
	expect(result.split("\n").length).toBe(1);
});

// HTML entity tests
test("decodes common HTML entities", () => {
	const html = "<p>&copy; 2024 &mdash; Test &amp; Demo</p>";
	const result = convertHtmlToText(html);
	expect(result).toContain("\u00A9");
	expect(result).toContain("\u2014");
	expect(result).toContain("&");
	expect(result).not.toContain("&copy;");
	expect(result).not.toContain("&mdash;");
});

test("decodes numeric HTML entities", () => {
	const html = "<p>&#39;quoted&#39; and &#x27;hex&#x27;</p>";
	const result = convertHtmlToText(html);
	expect(result).toBe("'quoted' and 'hex'");
});

// baseUrl tests
test("resolves relative URLs with baseUrl", () => {
	const html = '<p><a href="/about">About</a></p>';
	const result = convertHtmlToText(html, { baseUrl: "https://example.com" });
	expect(result).toContain(osc8.open("https://example.com/about"));
});

test("preserves absolute URLs with baseUrl", () => {
	const html = '<p><a href="https://other.com/page">Link</a></p>';
	const result = convertHtmlToText(html, { baseUrl: "https://example.com" });
	expect(result).toContain(osc8.open("https://other.com/page"));
});

test("handles mailto URLs with baseUrl", () => {
	const html = '<p><a href="mailto:test@example.com">Email</a></p>';
	const result = convertHtmlToText(html, { baseUrl: "https://example.com" });
	expect(result).toContain(osc8.open("mailto:test@example.com"));
});

// List item newline tests
test("list items are on separate lines", () => {
	const html = "<ul><li>One</li><li>Two</li><li>Three</li></ul>";
	const result = convertHtmlToText(html);
	const lines = result.split("\n").filter(l => l.trim());
	expect(lines.length).toBe(3);
	expect(lines[0]).toContain("One");
	expect(lines[1]).toContain("Two");
	expect(lines[2]).toContain("Three");
});

// Empty link fallback tests
test("empty links show URL path as fallback", () => {
	const html = '<a href="https://example.com/about"><svg></svg></a>';
	const result = convertHtmlToText(html);
	expect(result).toContain("/about");
	expect(result).toContain(osc8.open("https://example.com/about"));
});

test("empty root link shows hostname as fallback", () => {
	const html = '<a href="https://example.com/"><img src="logo.png"></a>';
	const result = convertHtmlToText(html);
	expect(result).toContain("example.com");
});
