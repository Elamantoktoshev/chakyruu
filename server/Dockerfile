# Chakyruu.kg production image: the API plus the built site (one web service).
# Build context is the repository root (npm workspaces):
#   docker build -f server/Dockerfile -t chakyruu .

ARG NODE_VERSION=22

# ---- base: Debian slim; Prisma engines need OpenSSL ----
FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---- build: all dependencies, compile shared + server + client ----
FROM base AS build
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY shared shared
COPY server server
COPY client client
RUN npx prisma generate --schema server/prisma/schema.prisma \
  && npm run build -w shared \
  && npm run build -w server \
  && npm run build -w client

# ---- runtime: production dependencies of the server only ----
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=8080
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
# ffmpeg-static downloads its binary here (mp3 compression).
RUN npm ci --omit=dev --workspace server --workspace shared \
  && npm cache clean --force
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/dist-seed server/dist-seed
COPY --from=build /app/server/prisma server/prisma
COPY --from=build /app/client/dist client/dist
# Server render of the public pages (/ky/…, /ru/…): React is bundled in, no client dependencies needed.
COPY --from=build /app/client/dist-ssr client/dist-ssr
RUN npx prisma generate --schema server/prisma/schema.prisma

WORKDIR /app/server
USER node
EXPOSE 8080
# Migrations are not run here: the PRE_DEPLOY job in .do/app.yaml runs them once per deploy.
CMD ["node", "dist/index.js"]
