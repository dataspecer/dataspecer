FROM oven/bun:1.3.5-alpine AS base

FROM base AS builder
WORKDIR /usr/src/app
RUN mkdir -p /usr/src/final/ /usr/src/final/dist/

# We need to install openssl for prisma to link paths correctly
# Then we need to install it again later to have it in the final image
RUN apk add --no-cache openssl

COPY applications/ applications/
COPY services/ services/
COPY packages/ packages/
COPY .npmrc package-lock.json package.json turbo.json ./docker/ws/docker-configure.sh ./docker/ws/docker-copy.sh ./

RUN sed -i "/packageManager/ c \"packageManager\": \"bun@`bun --version`\"," package.json
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

# Build frontend and backend dependencies
RUN bunx turbo run build --concurrency 100% --filter=data-specification-editor --filter=conceptual-model-editor --filter=manager --filter=api-specification --filter=backend^...

# Move frontend
RUN sh ./docker-copy.sh
RUN mv /usr/src/app/.dist /usr/src/final/html-template

# Build backend
RUN cd services/backend \
  && sed -i "s|../database/database.db|/usr/src/app/database/database.db|" prisma/schema.prisma \
  && bunx prisma generate \
  && cp main.config.sample.js main.config.js \
  && bunx tsc --noEmit \
  && bun build --target=bun --outdir=dist --sourcemap=linked --external ./main.config.js src/main.ts

# Move backend
RUN mv /usr/src/app/services/backend/dist/* /usr/src/final/dist/
RUN mv /usr/src/app/services/backend/prisma/* /usr/src/final/dist/
RUN mkdir -p /usr/src/final/node_modules/ &&  mv /usr/src/app/node_modules/.prisma /usr/src/final/node_modules/.prisma
COPY services/backend/main.config.sample.js /usr/src/final/main.config.js

COPY --chmod=777 ./docker/ws/docker-entrypoint.sh ./docker/ws/docker-healthcheck.sh /usr/src/final/

# Swap final and app directories
RUN mv /usr/src/app /usr/src/build && mv /usr/src/final /usr/src/app

RUN mkdir -p /usr/src/app/database
RUN bunx prisma@6 migrate deploy --schema /usr/src/app/dist/schema.prisma

# Final image for production
FROM base AS final
WORKDIR /usr/src/app

COPY services/backend/git-workflows ./git-workflows

RUN apk update && apk add --no-cache git
RUN apk update && apk add --no-cache openssh

# Create the .ssh directory and make it accessible to user (Dataspecer process).
# Otherwise we get access permissions error, when we try to create it from the Dataspecer.
# To simulate the permissions run the docker run command with --user option, for example:
# docker run -p 3100:80 --user nobody ds-dckr
RUN mkdir -p /.ssh && \
    chmod a+rwx /.ssh

# Makes directory accessible for the user
# Instals prisma for migrations and cleans install cache
RUN apk add --no-cache openssl && \
  rm -rf /var/lib/apt/lists/* && \
  rm -rf /var/cache/apk/* && \
  chmod a+rwx /usr/src/app && \
  bun install --no-cache prisma@6 && \
  rm -rf ~/.bun ~/.cache

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
COPY --from=builder --chmod=777 /usr/src/app /usr/src/app

USER 1000:1000
VOLUME /usr/src/app/database
EXPOSE 80
HEALTHCHECK CMD ./docker-healthcheck.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
