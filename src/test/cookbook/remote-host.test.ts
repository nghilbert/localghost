import { describe, expect, it } from "vitest";
import { buildOllamaUrlFromHost, RemoteHostSchema } from "#/features/cookbook/lib/remote-host";

describe("RemoteHostSchema", () => {
	it.each([
		"localhost",
		"192.168.1.50",
		"ollama.lan",
		"my-server",
		"a.b-c.example.com",
	])("accepts %s", (host) => {
		expect(RemoteHostSchema.safeParse({ host }).success).toBe(true);
	});

	it.each([
		"http://localhost",
		"localhost/path",
		"user@host",
		"host:11434",
		"host name",
		"",
		"-leading-dash",
		"trailing-dash-",
	])("rejects %j", (host) => {
		expect(RemoteHostSchema.safeParse({ host }).success).toBe(false);
	});

	it("defaults the port to 11434 and bounds it", () => {
		expect(RemoteHostSchema.parse({ host: "localhost" }).port).toBe(11434);
		expect(RemoteHostSchema.safeParse({ host: "localhost", port: 0 }).success).toBe(false);
		expect(RemoteHostSchema.safeParse({ host: "localhost", port: 70000 }).success).toBe(false);
		expect(RemoteHostSchema.safeParse({ host: "localhost", port: 8080 }).success).toBe(true);
	});

	it("trims surrounding whitespace from the host", () => {
		expect(RemoteHostSchema.parse({ host: "  ollama.lan  " }).host).toBe("ollama.lan");
	});
});

describe("buildOllamaUrlFromHost", () => {
	it("assembles a plain http base url", () => {
		expect(buildOllamaUrlFromHost("192.168.1.50", 11434)).toBe("http://192.168.1.50:11434");
	});
});
