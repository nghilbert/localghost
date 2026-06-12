import { describe, expect, it } from "vitest";
import { buildDockerRunArgs, dockerImageFor } from "#/lib/ollama-install.server";

describe("buildDockerRunArgs", () => {
	it("builds the nvidia variant with --gpus=all", () => {
		expect(buildDockerRunArgs("nvidia")).toEqual([
			"run",
			"-d",
			"--gpus=all",
			"-v",
			"ollama:/root/.ollama",
			"-p",
			"11434:11434",
			"--name",
			"ollama",
			"--restart",
			"unless-stopped",
			"ollama/ollama",
		]);
	});

	it("builds the amd variant with device mounts and the rocm image", () => {
		expect(buildDockerRunArgs("amd")).toEqual([
			"run",
			"-d",
			"--device",
			"/dev/kfd",
			"--device",
			"/dev/dri",
			"-v",
			"ollama:/root/.ollama",
			"-p",
			"11434:11434",
			"--name",
			"ollama",
			"--restart",
			"unless-stopped",
			"ollama/ollama:rocm",
		]);
	});

	it("builds the cpu variant without device flags", () => {
		expect(buildDockerRunArgs("cpu")).toEqual([
			"run",
			"-d",
			"-v",
			"ollama:/root/.ollama",
			"-p",
			"11434:11434",
			"--name",
			"ollama",
			"--restart",
			"unless-stopped",
			"ollama/ollama",
		]);
	});
});

describe("dockerImageFor", () => {
	it("selects the rocm image only for amd", () => {
		expect(dockerImageFor("amd")).toBe("ollama/ollama:rocm");
		expect(dockerImageFor("nvidia")).toBe("ollama/ollama");
		expect(dockerImageFor("cpu")).toBe("ollama/ollama");
	});
});
