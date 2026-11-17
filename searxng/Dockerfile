FROM searxng/searxng:2026.11.14-a7128d5d1

# Copied rather than mounted, which avoids an ownership warning on every start.
COPY --chown=searxng:searxng settings.yml /etc/searxng/settings.yml

# Required at startup.
ENV SEARXNG_BASE_URL=http://localhost:8080/

HEALTHCHECK --interval=10s --timeout=5s --retries=6 --start-period=20s \
	CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/healthz')"
