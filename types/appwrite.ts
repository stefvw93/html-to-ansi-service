/** biome-ignore-all lint/suspicious/noExplicitAny: Not provided by Appwrite */
export type AppwriteContext = {
	req: any;
	res: any;
	log: (msg: any) => void;
	error: (msg: any) => void;
};
