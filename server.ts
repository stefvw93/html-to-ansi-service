import { convertHtmlToTextFromUrl as convert } from "./lib";
import { HOST, LIVE, PORT } from "./shared";
import type { AppwriteContext } from "./types/appwrite";

if (LIVE) {
	const server = Bun.serve({
		hostname: HOST,
		port: PORT,
		fetch: async (request) =>
			new Response(await convert(request.url), {
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			}),
	});

	console.log(`Listening on ${server.url}`);
}

export default async function (context: AppwriteContext) {
	return convert(context.req.url).then((text) => context.res.text(text));
}
