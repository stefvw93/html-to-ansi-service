// ANSI escape code constants for text formatting
// Colors use standard 16-color codes to inherit from terminal theme (e.g. Gruvbox)

export const ANSI = {
  // Formatting
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  strikethrough: "\x1b[9m",

  // Standard colors (theme-aware - inherits from terminal config)
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Bright colors (theme-aware)
  brightBlack: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",
} as const;

// Get ANSI color code using Bun's native color API
export function color(name: string): string {
  return Bun.color(name, "ansi") ?? "";
}

// OSC 8 hyperlink helpers
export const osc8 = {
  open: (url: string) => `\x1b]8;;${url}\x07`,
  close: () => `\x1b]8;;\x07`,
};

// Combine multiple ANSI codes
export function style(...codes: string[]): string {
  return codes.join("");
}
