import { convertHtmlToTextFromUrl } from "./lib";
import { PORT } from "./shared";

const server = Bun.serve({
	port: PORT,
	fetch: async (request) =>
		new Response(await convertHtmlToTextFromUrl(request.url), {
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		}),
});

console.log(`Listening on ${server.url}`);
