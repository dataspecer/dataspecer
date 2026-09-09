FROM oven/bun:1.4.2-alpine AS base

FROM base AS builder
WORKDIR /usr/src/app
RUN mkdir -p /usr/src/final/ /usr/src/final/dist/

COPY applications/ applications/
COPY services/ services/
COPY packages/ packages/
COPY .npmrc package-lock.json package.json turbo.json ./docker/ws/docker-configure.sh ./docker/ws/docker-copy.sh ./

RUN sed -i "/packageManager/ c \"packageManager\": \"bun@`bun --version`\"," package.json
# Since there is no bun.lock, bun should migrate the package-lock.json to bun.lock and do the clean install
RUN bun install

ARG GIT_COMMIT
ARG GIT_REF
ARG GIT_COMMIT_DATE
ARG GIT_COMMIT_NUMBER

# Configuration of .env
RUN BASE_PATH=/_BASE_PATH_DOCKER_REPLACE__ \
  BACKEND=/_BASE_PATH_DOCKER_REPLACE__/api \
  GIT_COMMIT=$GIT_COMMIT \
  GIT_REF=$GIT_REF \
  GIT_COMMIT_DATE=$GIT_COMMIT_DATE \
  GIT_COMMIT_NUMBER=$GIT_COMMIT_NUMBER \
    sh ./docker-configure.sh

# Build frontend and backend dependencies, do not cache (-> local:) to make build faster
RUN bunx turbo run build --cache=local: --concurrency 100% --filter=./applications/* --filter=!api-specification

# Move frontend
RUN sh ./docker-copy.sh \
  && mv /usr/src/app/.dist /usr/src/final/html-template

# Build backend
RUN cd services/backend \
  && cp main.config.sample.js main.config.js \
  && bunx tsc --noEmit \
  && bun bun-build.mjs

# Move backend
RUN mv /usr/src/app/services/backend/dist/* /usr/src/final/dist/
COPY services/backend/main.config.sample.js /usr/src/final/main.config.js

COPY --chmod=777 ./docker/ws/docker-healthcheck.sh /usr/src/final/

RUN mkdir -p /usr/src/final/database

# Final image for production
FROM base AS final
WORKDIR /usr/src/app

RUN apk add --no-cache tini && \
  chmod a+rwx /usr/src/app

# Redeclare build args and expose them as runtime env so entrypoint can print metadata (prefixed to avoid collisions)
ARG GIT_COMMIT
ARG GIT_REF
ARG GIT_COMMIT_DATE
ARG GIT_COMMIT_NUMBER
ENV DATASPECER_GIT_COMMIT=${GIT_COMMIT} \
  DATASPECER_GIT_REF=${GIT_REF} \
  DATASPECER_GIT_COMMIT_DATE=${GIT_COMMIT_DATE} \
  DATASPECER_GIT_COMMIT_NUMBER=${GIT_COMMIT_NUMBER}

# Copy final files
COPY --from=builder --chmod=777 /usr/src/final /usr/src/app

USER 1000:1000
VOLUME /usr/src/app/database
EXPOSE 80
ENV PORT=80
HEALTHCHECK CMD ./docker-healthcheck.sh
ENTRYPOINT ["/sbin/tini", "--", "bun", "dist/docker-main.js"]
