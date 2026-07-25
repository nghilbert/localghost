/**
 * LLM defaults shared by the server generation path and the client-side history
 * trim. Kept in a non-`.server` module so both bundles read the same numbers:
 * the trim budget only lands on the right message when it uses the same context
 * window and output budget the server actually sends.
 */

/** Default output-token budget (`max_tokens`) when the endpoint sets none. */
export const DEFAULT_MAX_TOKENS = 4096;
