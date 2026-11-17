# Multi-stage build: compile the Vite bundle, then serve it from nginx with a
# small Node relay that holds the Telegram bot token server-side.

# ---- build ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first so code changes don't bust the layer cache.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
COPY img ./img

# The Telegram connector is enabled here, but in *proxy* mode: the browser only
# learns "/api/contact". The bot token lives in the runtime environment.
ARG VITE_SITE_BASE=/
ARG VITE_TELEGRAM_ENABLED=true
ARG VITE_TELEGRAM_MODE=proxy
ARG VITE_TELEGRAM_PROXY_URL=/api/contact
ARG VITE_CONTACT_FALLBACK=phone
ENV VITE_SITE_BASE=$VITE_SITE_BASE \
    VITE_TELEGRAM_ENABLED=$VITE_TELEGRAM_ENABLED \
    VITE_TELEGRAM_MODE=$VITE_TELEGRAM_MODE \
    VITE_TELEGRAM_PROXY_URL=$VITE_TELEGRAM_PROXY_URL \
    VITE_CONTACT_FALLBACK=$VITE_CONTACT_FALLBACK

RUN npm run build

# ---- serve ----------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Node runs the contact relay on loopback; nginx proxies /api/ to it.
RUN apk add --no-cache nodejs

WORKDIR /app
COPY server ./server
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Runtime secrets — set these in the Render dashboard, never in the image:
#   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
ENV RELAY_PORT=8787

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1/api/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
