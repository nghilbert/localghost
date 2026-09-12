import { beforeEach, describe, expect, it, vi } from "vitest";

const { getProps } = vi.hoisted(() => ({ getProps: vi.fn() }));
vi.mock("#/shared/lib/llamacpp/client.server", () => ({ getProps }));

const { codeAgentModelBlocker, codeAgentModelWarning, hasRigidMessageOrderTemplate } = await import(
	"./compatibility.server"
);

const llamacpp = { url: "http://localhost:8080", provider: "llamacpp" } as const;
const anthropic = { url: "https://api.anthropic.com", provider: "anthropic" } as const;

function hardware(freeRamGb: number) {
	return { totalRamGb: 16, freeRamGb, cpuModel: "Test CPU", cpuCount: 4, gpus: null };
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("hasRigidMessageOrderTemplate", () => {
	it("catches the Qwen3.5 family's assertion", () => {
		const template =
			"{%- if messages[0].role == 'system' %}{%- else %}" +
			"{{- raise_exception('System message must be at the beginning of the conversation') }}" +
			"{%- endif %}";

		expect(hasRigidMessageOrderTemplate(template)).toBe(true);
	});

	it("leaves a template that merely branches on a leading system message alone", () => {
		const template =
			"{% if messages[0].role == 'system' %}{{ messages[0].content }}{% endif %}" +
			"{% for message in messages %}{{ message.content }}{% endfor %}";

		expect(hasRigidMessageOrderTemplate(template)).toBe(false);
	});

	it("ignores an unrelated exception", () => {
		expect(hasRigidMessageOrderTemplate("{{ raise_exception('No user query found') }}")).toBe(
			false,
		);
	});
});

describe("codeAgentModelBlocker", () => {
	it("never probes a provider that does not serve /props", async () => {
		const blocker = await codeAgentModelBlocker({
			endpoint: { url: "https://api.anthropic.com", provider: "anthropic" },
			model: "claude-sonnet-5",
		});

		expect(blocker).toBeNull();
		expect(getProps).not.toHaveBeenCalled();
	});

	it("allows the model when the probe fails, so an unreachable server never blocks", async () => {
		getProps.mockRejectedValue(new Error("connect ECONNREFUSED"));

		await expect(codeAgentModelBlocker({ endpoint: llamacpp, model: "qwen" })).resolves.toBeNull();
	});

	it("blocks a template that pins the system message to the front", async () => {
		getProps.mockResolvedValue({
			chat_template: "{{- raise_exception('System message must be at the beginning') }}",
		});

		await expect(codeAgentModelBlocker({ endpoint: llamacpp, model: "qwen" })).resolves.toContain(
			"system message",
		);
	});

	it("blocks a model whose template cannot call tools", async () => {
		getProps.mockResolvedValue({
			chat_template: "{% for m in messages %}{{ m.content }}{% endfor %}",
			chat_template_caps: { supports_tools: false, supports_tool_calls: true },
		});

		await expect(codeAgentModelBlocker({ endpoint: llamacpp, model: "qwen" })).resolves.toContain(
			"call tools",
		);
	});

	// Older builds omit `chat_template_caps` entirely; that is not evidence of a missing cap.
	it("allows a usable template reporting no capabilities at all", async () => {
		getProps.mockResolvedValue({
			chat_template: "{% for m in messages %}{{ m.content }}{% endfor %}",
		});

		await expect(codeAgentModelBlocker({ endpoint: llamacpp, model: "qwen" })).resolves.toBeNull();
	});

	it("passes the endpoint key through to the probe", async () => {
		getProps.mockResolvedValue({});

		await codeAgentModelBlocker({
			endpoint: { ...llamacpp, apiKey: "sk-local" },
			model: "qwen/qwen3.5:7b",
		});

		expect(getProps).toHaveBeenCalledWith({
			url: "http://localhost:8080",
			model: "qwen/qwen3.5:7b",
			apiKey: "sk-local",
		});
	});
});

describe("codeAgentModelWarning", () => {
	it("never probes a provider that does not serve /props", async () => {
		const warnings = await codeAgentModelWarning({
			endpoint: anthropic,
			model: "claude-sonnet-5",
			hardware: hardware(8),
		});

		expect(warnings).toEqual([]);
		expect(getProps).not.toHaveBeenCalled();
	});

	it("warns on a crowded context window reported by the probe", async () => {
		getProps.mockResolvedValue({ default_generation_settings: { n_ctx: 32_768 } });

		const warnings = await codeAgentModelWarning({
			endpoint: llamacpp,
			model: "qwen",
			hardware: hardware(8),
		});

		expect(warnings).toEqual(["32K context, ~24K spent on the harness, ~8K left for your task."]);
	});

	it("says nothing about context when the probe fails, matching the blocker's leniency", async () => {
		getProps.mockRejectedValue(new Error("connect ECONNREFUSED"));

		const warnings = await codeAgentModelWarning({
			endpoint: llamacpp,
			model: "qwen",
			hardware: hardware(8),
		});

		expect(warnings).toEqual([]);
	});

	it("warns on thin free memory regardless of provider", async () => {
		const warnings = await codeAgentModelWarning({
			endpoint: anthropic,
			model: "claude-sonnet-5",
			hardware: hardware(1.2),
		});

		expect(warnings).toEqual([
			"Only 1.2 GB free. A slow or crashed run is likely competing with everything else running on this machine.",
		]);
	});

	it("combines both warnings when both conditions hold", async () => {
		getProps.mockResolvedValue({ default_generation_settings: { n_ctx: 32_768 } });

		const warnings = await codeAgentModelWarning({
			endpoint: llamacpp,
			model: "qwen",
			hardware: hardware(1.2),
		});

		expect(warnings).toHaveLength(2);
	});
});
