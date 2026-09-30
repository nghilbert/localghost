/** The URL of worker `poolId`'s copy of the test database: the test database name plus `_<poolId>`. */
export function workerDatabaseUrl({
	testUrl,
	poolId,
}: {
	testUrl: string;
	poolId: number;
}): string {
	const url = new URL(testUrl);
	url.pathname = `${url.pathname}_${poolId}`;
	return url.href;
}
