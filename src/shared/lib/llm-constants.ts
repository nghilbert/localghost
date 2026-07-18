/**
 * LLM defaults shared by the server generation path and the client-side history
 * trim. Kept in a non-`.server` module so both bundles read the same numbers:
 * the trim budget only lands on the right message when it uses the same context
 * window and output budget the server actually sends.
 */

/**
 * Ollama's own default is 4096, which silently truncates long chats (the system
 * prompt shifts out first). A per-endpoint `num_ctx` overrides this.
 */
export const DEFAULT_OLLAMA_NUM_CTX = 8192;

/** Default output-token budget (`num_predict` / `max_tokens`) when the endpoint sets none. */
export const DEFAULT_MAX_TOKENS = 4096;
