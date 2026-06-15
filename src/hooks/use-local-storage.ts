import { useEffect, useState } from "react";

/**
 * State backed by `localStorage`, JSON-serialized under `key`. Reads lazily on
 * mount (falling back to `initial` when absent, on the server, or on parse
 * failure) and persists on every change.
 *
 * @param key - The `localStorage` key to read and write.
 * @param initial - The value used when nothing is stored yet.
 * @returns A `[value, setValue]` tuple mirroring `useState`.
 */
export function useLocalStorage<T>(key: string, initial: T) {
	const [value, setValue] = useState<T>(() => {
		if (typeof window === "undefined") return initial;
		const stored = window.localStorage.getItem(key);
		if (stored === null) return initial;
		try {
			return JSON.parse(stored) as T;
		} catch {
			return initial;
		}
	});

	useEffect(() => {
		window.localStorage.setItem(key, JSON.stringify(value));
	}, [key, value]);

	return [value, setValue] as const;
}
