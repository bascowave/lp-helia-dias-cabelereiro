FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321 TZ=Europe/Lisbon UPLOADS_DIR=/data/uploads
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY migrations ./migrations
COPY scripts ./scripts
COPY seed ./seed
COPY src/lib/server ./src/lib/server
VOLUME /data/uploads
EXPOSE 4321
CMD ["node", "scripts/start.ts"]
