# A tiny, always-up static page for NPM to show as a custom error page
# (502/503/504) when the main app container is down. See docs/DEPLOYMENT.md.
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:80/ || exit 1
