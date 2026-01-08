/** biome-ignore-all lint/suspicious/noExplicitAny: Appwrite does not have type definitions? */

export default async ({ req, res, log, error }: any) => {
	// The `req` object contains the request data
	if (req.method === "GET") {
		// Send a response with the res object helpers
		// `res.text()` dispatches a string back to the client
		return res.text("Hello, World!");
	}

	throw new Error("Invalid request");
};
