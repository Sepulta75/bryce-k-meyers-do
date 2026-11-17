# Multi-stage build: compile the Vite bundle, then serve it from nginx.
# Render runs this automatically (service type: web, env: docker).

# ---- build ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first so code changes don't bust the layer cache.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src
COPY img ./img
COPY robots.txt ./

# Every connector ships disabled; nothing secret is baked into this image.
ARG VITE_SITE_BASE=/
ARG VITE_TELEGRAM_ENABLED=false
ARG VITE_TELEGRAM_MODE=proxy
ARG VITE_TELEGRAM_PROXY_URL=
ARG VITE_CONTACT_FALLBACK=phone
ENV VITE_SITE_BASE=$VITE_SITE_BASE \
    VITE_TELEGRAM_ENABLED=$VITE_TELEGRAM_ENABLED \
    VITE_TELEGRAM_MODE=$VITE_TELEGRAM_MODE \
    VITE_TELEGRAM_PROXY_URL=$VITE_TELEGRAM_PROXY_URL \
    VITE_CONTACT_FALLBACK=$VITE_CONTACT_FALLBACK

RUN npm run build

# ---- serve ----------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 10000
CMD ["nginx", "-g", "daemon off;"]
