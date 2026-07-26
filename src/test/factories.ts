import { faker } from "@faker-js/faker";
import type { ModelMessage } from "@tanstack/ai";
import type {
	CatalogModel,
	GpuInfo,
	HardwareInfo,
	InstalledModel,
} from "#/shared/domain/model/types";

/**
 * Test data factories. Each builder fills irrelevant fields with faker noise,
 * keeps deterministic defaults for values that drive logic, and merges caller
 * `overrides` last, so tests declare only the fields they assert on.
 */

export function makeCatalogModel(overrides: Partial<CatalogModel> = {}): CatalogModel {
	const name = faker.commerce.productName();
	return {
		id: faker.string.uuid(),
		name,
		displayName: name,
		paramB: 7,
		sizeGb: null,
		contextK: null,
		tags: ["chat"],
		capabilities: ["tools"],
		description: faker.lorem.sentence(),
		pullCount: 1_000_000,
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

export function makeInstalledModel(overrides: Partial<InstalledModel> = {}): InstalledModel {
	return {
		id: `${faker.system.fileName()}:Q4_K_M`,
		sizeBytes: faker.number.int({ min: 1_000_000, max: 9_000_000_000 }),
		quant: "Q4_K_M",
		paramB: faker.number.int({ min: 1, max: 70 }),
		status: "loaded",
		vision: false,
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
