// Production entry: serves the built TanStack Start handler plus static assets.
// `public/` is served in addition to `dist/client` because gallery uploads are
// written there at runtime (persisted via the compose `uploads` volume).
import { serve } from "srvx";
import { serveStatic } from "srvx/static";
import handler from "./dist/server/server.js";

serve({
	port: Number(process.env.PORT ?? 3000),
	middleware: [serveStatic({ dir: "./dist/client" }), serveStatic({ dir: "./public" })],
	fetch: handler.fetch,
});
