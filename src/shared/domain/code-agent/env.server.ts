/**
 * Shell plumbing the harness needs, plus `SSH_AUTH_SOCK` so `git push`/`fetch` over
 * SSH keeps working. Everything else in the app's env is dropped.
 */
const AGENT_ENV_KEEP = [
	"PATH",
	"HOME",
	"USER",
	"LOGNAME",
	"SHELL",
	"TERM",
	"TMPDIR",
	"LANG",
	"LC_ALL",
	"TZ",
	"SSH_AUTH_SOCK",
] as const;

/**
 * Keys to strip from the inherited environment, by inversion: a var survives only if it
 * is shell plumbing or one of `injected`. Pass everything the run supplies, not just
 * secrets: the provider applies this list after merging, so a host var sharing a name
 * would otherwise delete the value we just set.
 */
export function scrubbedEnvKeys({ injected }: { injected: Record<string, string> }): string[] {
	const keep = new Set<string>([...AGENT_ENV_KEEP, ...Object.keys(injected)]);
	return Object.keys(process.env).filter((key) => !keep.has(key));
}
