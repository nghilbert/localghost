FROM searxng/searxng:2026.6.20-fd42d4fda

# Baked in instead of bind-mounted: avoids a host/container uid mismatch that
# otherwise logs an ownership warning on every start.
COPY --chown=searxng:searxng settings.yml /etc/searxng/settings.yml

# SearXNG requires this at startup even though nothing here is user-facing.
ENV SEARXNG_BASE_URL=http://localhost:8080/

HEALTHCHECK --interval=10s --timeout=5s --retries=6 --start-period=20s \
	CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/healthz')"
