/** biome-ignore-all lint/suspicious/noExplicitAny: Appwrite does not have type definitions? */
import { convertHtmlToTextFromUrl } from "../../lib";

export default async ({ req, res, log, error }: any) => {
	const text = await convertHtmlToTextFromUrl(req.url);

	// The `req` object contains the request data
	if (req.method === "GET") {
		// Send a response with the res object helpers
		// `res.text()` dispatches a string back to the client
		return res.text(text);
	}

	throw new Error("Invalid request");
};
