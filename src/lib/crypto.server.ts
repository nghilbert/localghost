import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

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

export function encrypt(plaintext: string): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, getKey(), iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	// Format: iv(hex):tag(hex):ciphertext(hex)
	return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
	const [ivHex, tagHex, dataHex] = ciphertext.split(":");
	if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid ciphertext format");
	const iv = Buffer.from(ivHex, "hex");
	const tag = Buffer.from(tagHex, "hex");
	const data = Buffer.from(dataHex, "hex");
	const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
	decipher.setAuthTag(tag);
	return decipher.update(data) + decipher.final("utf8");
}
