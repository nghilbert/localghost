import { faker } from "@faker-js/faker";
import type { ModelMessage } from "@tanstack/ai";
import type {
	CatalogModel,
	GpuInfo,
	HardwareInfo,
	OllamaInstalledModel,
} from "#/features/cookbook/lib/types";

/**
 * Test data factories. Each builder fills semantically-irrelevant fields with
 * faker noise and keeps deterministic defaults for the values that drive logic,
 * then merges caller `overrides` last — so tests stay readable and deterministic
 * while only declaring the fields they actually assert on.
 */

export function makeCatalogModel(overrides: Partial<CatalogModel> = {}): CatalogModel {
	return {
		id: faker.string.uuid(),
		name: faker.commerce.productName(),
		family: faker.word.noun(),
		paramB: 7,
		vramGb: 4,
		ramGb: 8,
		contextK: 128,
		tags: ["chat"],
		description: faker.lorem.sentence(),
		...overrides,
	};
}

export function makeHardware(overrides: Partial<HardwareInfo> = {}): HardwareInfo {
	return {
		totalRamGb: 32,
		freeRamGb: 16,
		cpuModel: faker.commerce.productName(),
		cpuCount: 16,
		gpus: null,
		...overrides,
	};
}

export function makeGpu(overrides: Partial<GpuInfo> = {}): GpuInfo {
	return {
		name: faker.commerce.productName(),
		vendor: "nvidia",
		totalVramMb: 8192,
		freeVramMb: 0,
		...overrides,
	};
}

export function makeInstalledModel(
	overrides: Partial<OllamaInstalledModel> = {},
): OllamaInstalledModel {
	return {
		name: faker.system.fileName(),
		sizeBytes: faker.number.int({ min: 1_000_000, max: 9_000_000_000 }),
		family: faker.word.noun(),
		parameterSize: `${faker.number.int({ min: 1, max: 70 })}B`,
		quantizationLevel: "Q4_0",
		...overrides,
	};
}

export function makeModelMessage(overrides: Partial<ModelMessage> = {}): ModelMessage {
	return {
		role: "user",
		content: faker.lorem.sentence(),
		...overrides,
	};
}
