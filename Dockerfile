# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app

RUN npm install -g pnpm@12.11.2
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ARG VITE_API_MODE=real
ARG VITE_COLLAB_ENABLED=true
ENV VITE_API_MODE=$VITE_API_MODE \
    VITE_COLLAB_ENABLED=$VITE_COLLAB_ENABLED
RUN pnpm build

FROM nginxinc/nginx-unprivileged:1.29-alpine

ENV API_UPSTREAM=http://writer-backend:8087 \
    COLLAB_UPSTREAM=http://writer-backend:8087 \
    NGINX_ENVSUBST_FILTER='API_UPSTREAM|COLLAB_UPSTREAM'

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
