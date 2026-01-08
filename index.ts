import { Hono } from "hono";
import { convertHtmlToTextFromUrl } from "./lib";

const app = new Hono();

app.get("*", async (context) =>
	convertHtmlToTextFromUrl(context.req.url).then(context.text),
);

export default app;
