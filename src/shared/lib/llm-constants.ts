/** LLM defaults shared by server generation and client history trimming.
 * This non-server module keeps both bundles on the same token budgets.
 */

/** Default output-token budget (`max_tokens`) when the endpoint sets none. */
export const DEFAULT_MAX_TOKENS = 4096;
