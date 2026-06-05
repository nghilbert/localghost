const CACHE = "odysseus-v1";

const STATIC_EXTENSIONS = [".js", ".css", ".woff2", ".woff", ".png", ".ico", ".svg"];

function isStatic(url) {
	return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

function isApi(url) {
	return url.pathname.startsWith("/api/");
}

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/", "/manifest.json"])));
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	const url = new URL(event.request.url);

	// API + SSE routes: network only, no caching
	if (isApi(url)) return;

	// Static assets: cache-first
	if (isStatic(url)) {
		event.respondWith(
			caches.match(event.request).then(
				(cached) =>
					cached ??
					fetch(event.request).then((res) => {
						const clone = res.clone();
						caches.open(CACHE).then((c) => c.put(event.request, clone));
						return res;
					}),
			),
		);
		return;
	}

	// HTML navigation: network-first with offline shell fallback
	event.respondWith(
		fetch(event.request)
			.then((res) => {
				const clone = res.clone();
				caches.open(CACHE).then((c) => c.put(event.request, clone));
				return res;
			})
			.catch(() => caches.match(event.request).then((cached) => cached ?? caches.match("/"))),
	);
});
