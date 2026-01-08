import { TARGET } from "../shared";
import { type ConvertOptions, convertHtmlToText } from "./html-to-text";

const DEFAULT_OPTIONS: ConvertOptions = {
	maxLineWidth: 80,
	baseUrl: TARGET,
};

export async function convertHtmlToTextFromUrl(url: string | URL) {
	const requestUrl = new URL(url);
	const targetUrl = new URL(TARGET);
	targetUrl.pathname = requestUrl.pathname;

	console.log(`Fetching ${targetUrl}`);

	const html = await fetch(targetUrl).then((res) => res.text());
	const text = convertHtmlToText(html, DEFAULT_OPTIONS);
	return text;
}
