import { convertHtmlToTextFromUrl } from "../../lib";

export default {
	fetch: async (request: Request) =>
		new Response(await convertHtmlToTextFromUrl(request.url), {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
			},
		}),
};
