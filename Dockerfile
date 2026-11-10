# ---------- build stage ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build \
 && npm prune --omit=dev \
 && npm cache clean --force

# ---------- runtime stage ----------
FROM node:22-alpine
WORKDIR /app

# tini: forwards SIGTERM to node so `docker stop` shuts down cleanly, and reaps zombies
RUN apk add --no-cache tini

ENV NODE_ENV=production \
    PORT=5000 \
    # t3.small has 2 GiB total; cap the V8 heap so the container can't starve the host
    NODE_OPTIONS=--max-old-space-size=768

COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 5000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
