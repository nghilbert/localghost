import type { listEndpoints } from "./endpoint.functions";

/** A saved endpoint as the client sees it, with `hasApiKey` in place of the key. */
export type ClientEndpoint = Awaited<ReturnType<typeof listEndpoints>>[number];
