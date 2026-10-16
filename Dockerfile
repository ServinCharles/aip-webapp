# aip-webapp: React frontend served by non-root nginx, proxying /api to aip-api
# Static build output is the same on any CPU, so build natively even when targeting linux/amd64
FROM --platform=$BUILDPLATFORM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# stable-alpine follows nginx stable releases, and apk upgrade pulls in Alpine security
# fixes published since the base image was built, so the image scan starts clean.
FROM nginxinc/nginx-unprivileged:stable-alpine
USER root
RUN apk upgrade --no-cache
COPY --chmod=755 nginx/16-chat-resolver.envsh /docker-entrypoint.d/16-chat-resolver.envsh
USER 101
# Defaults for docker compose; Kubernetes overrides them with full cluster DNS names
ENV API_UPSTREAM=http://aip-api:8080 \
    CHAT_UPSTREAM=http://aip-chat-api:8080
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
