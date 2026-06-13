import { describe, expect, it } from "vitest";
import {
	buildOllamaUrlFromHost,
	HOSTNAME_OR_IP_REGEX,
	OllamaUrlSchema,
} from "#/features/cookbook/lib/remote-host";

describe("HOSTNAME_OR_IP_REGEX", () => {
	it.each([
		"localhost",
		"192.168.1.50",
		"ollama.lan",
		"my-server",
		"a.b-c.example.com",
	])("accepts %s", (host) => {
		expect(HOSTNAME_OR_IP_REGEX.test(host)).toBe(true);
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
		expect(HOSTNAME_OR_IP_REGEX.test(host)).toBe(false);
	});
});

describe("buildOllamaUrlFromHost", () => {
	it("assembles a plain http base url", () => {
		expect(buildOllamaUrlFromHost("192.168.1.50", 11434)).toBe("http://192.168.1.50:11434");
	});
});

describe("OllamaUrlSchema", () => {
	it.each([
		"http://localhost:11434",
		"https://ollama.example.com",
		"https://host/ollama",
	])("accepts %s", (url) => {
		expect(OllamaUrlSchema.safeParse({ url }).success).toBe(true);
	});

	it.each(["not-a-url", "ftp://host", "localhost:11434", ""])("rejects %j", (url) => {
		expect(OllamaUrlSchema.safeParse({ url }).success).toBe(false);
	});

	it("strips the trailing slash so paths can be appended", () => {
		expect(OllamaUrlSchema.parse({ url: "http://localhost:11434/" }).url).toBe(
			"http://localhost:11434",
		);
	});
});
