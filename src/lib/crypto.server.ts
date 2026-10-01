import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { log } from "#/lib/log.server";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
	const key = process.env.ENCRYPTION_KEY;
	if (!key) throw new Error("ENCRYPTION_KEY env var is not set");
	const buf = Buffer.from(key, "hex");
	if (buf.length !== 32)
		throw new Error("ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)");
	return buf;
}

/**
 * Encrypts plaintext with AES-256-GCM under the 32-byte `ENCRYPTION_KEY`.
 * @returns The encrypted value as `iv:tag:ciphertext`, each segment hex-encoded.
 */
export function encrypt(plaintext: string): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, getKey(), iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a value produced by {@link encrypt}, verifying the GCM auth tag.
 * @throws If the format is malformed or the auth tag fails verification.
 */
export function decrypt(ciphertext: string): string {
	const [ivHex, tagHex, dataHex] = ciphertext.split(":");
	if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid ciphertext format");
	const iv = Buffer.from(ivHex, "hex");
	const tag = Buffer.from(tagHex, "hex");
	const data = Buffer.from(dataHex, "hex");
	const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
	decipher.setAuthTag(tag);
	return decipher.update(data, undefined, "utf8") + decipher.final("utf8");
}

/**
 * An endpoint's decrypted API key, or undefined when none is stored.
 * @throws A readable error when the stored key cannot be decrypted, usually after
 * `ENCRYPTION_KEY` changed.
 */
export function endpointApiKey(endpoint: { apiKeyEncrypted: string | null }): string | undefined {
	if (!endpoint.apiKeyEncrypted) return undefined;
	try {
		return decrypt(endpoint.apiKeyEncrypted);
	} catch (error) {
		log.error(
			{ err: error },
			"Failed to decrypt a stored endpoint API key (was ENCRYPTION_KEY rotated?)",
		);
		throw new Error(
			"This endpoint's stored API key can't be decrypted. Re-enter the key in Settings.",
			{ cause: error },
		);
	}
}
