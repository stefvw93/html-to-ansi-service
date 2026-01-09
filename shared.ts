import { Config, Effect } from "effect";

export const TARGET = Effect.runSync(Config.string("TARGET"));
export const SUBDOMAIN = Effect.runSync(
	Config.string("SUBDOMAIN").pipe(Effect.orElseSucceed(() => "text")),
);
export const PORT = Effect.runSync(
	Config.number("PORT").pipe(Effect.orElseSucceed(() => 3000)),
);
export const LIVE = Effect.runSync(
	Config.boolean("LIVE").pipe(Effect.orElseSucceed(() => false)),
);

console.log({ TARGET, SUBDOMAIN, PORT, LIVE });
