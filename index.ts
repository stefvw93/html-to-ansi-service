import { Config, Effect } from "effect";
import { type ConvertOptions, convertHtmlToText } from "./lib/html-to-text";

const TARGET = Effect.runSync(Config.string("TARGET"));
const PORT = Effect.runSync(
	Config.number("PORT").pipe(Effect.orElseSucceed(() => 3000)),
);

const DEFAULT_OPTIONS: ConvertOptions = {
	maxLineWidth: 80,
	baseUrl: TARGET,
};

const server = Bun.serve({
	port: PORT,
	async fetch(request) {
		const requestUrl = new URL(request.url);
		const targetUrl = new URL(TARGET);
		targetUrl.pathname = requestUrl.pathname;

		console.log(`Fetching ${targetUrl}`);

		const html = await fetch(targetUrl).then((res) => res.text());
		const text = convertHtmlToText(html, DEFAULT_OPTIONS);

		return new Response(text, {
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	},
});

console.log(`Listening on ${server.url}`);
