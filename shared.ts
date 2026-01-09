import { Config, Effect } from "effect";

export const TARGET = Effect.runSync(Config.string("TARGET"));
export const DOMAIN = Effect.runSync(
	Config.string("DOMAIN").pipe(Effect.orElseSucceed(() => "stef.codes")),
);
export const HOST = Effect.runSync(
	Config.string("HOST").pipe(Effect.orElseSucceed(() => "localhost")),
);
export const PORT = Effect.runSync(
	Config.number("PORT").pipe(Effect.orElseSucceed(() => 3000)),
);
export const LIVE = Effect.runSync(
	Config.boolean("LIVE").pipe(Effect.orElseSucceed(() => false)),
);

console.log({ TARGET, DOMAIN, HOST, PORT, LIVE });
