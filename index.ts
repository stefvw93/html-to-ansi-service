import { Hono } from "hono";
import { convertHtmlToTextFromUrl as convert } from "./lib";

export default new Hono().get("*", (context) =>
	convert(context.req.url).then(context.text),
);
