FROM node:24.14.0-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @lt/admin build

FROM nginxinc/nginx-unprivileged:1.29.1-alpine
COPY ops/nginx/static.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/admin/dist /usr/share/nginx/html
EXPOSE 8080
