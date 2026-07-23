FROM node:24.14.0-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @lt/server prisma:generate
RUN pnpm exec tsc -b apps/server

FROM node:24.14.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
COPY --from=build /workspace /workspace
USER node
EXPOSE 3000
CMD ["node", "apps/server/dist/server.js"]
