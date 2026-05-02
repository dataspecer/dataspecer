#!/bin/bash

# This is a build script that was originally created for Cloudflare Pages. The purpose was to build all applications and copy the output to a single directory .dist, that could be served by Cloudflare Pages.
# However, its purpose was later extended to be used in Docker containers as well.

# BACKEND - URL to the backend server
# DO_BUILD_BACKEND - Whether the backend should be built
# BASE_PATH - Should not end with a slash (keep empty for root)

set -e # Exit with nonzero exit code if anything fails

# Paths configuration

MANAGER=""
MANAGER_BASE_PATH="$BASE_PATH$MANAGER"
MANAGER_URL="$MANAGER_BASE_PATH"

DATA_SPECIFICATION_EDITOR="/data-specification-editor"
DATA_SPECIFICATION_EDITOR_BASE_PATH="$BASE_PATH$DATA_SPECIFICATION_EDITOR"
DATA_SPECIFICATION_EDITOR_URL="$DATA_SPECIFICATION_EDITOR_BASE_PATH"

CONCEPTUAL_MODEL_EDITOR="/conceptual-model-editor"
CONCEPTUAL_MODEL_EDITOR_BASE_PATH="$BASE_PATH$CONCEPTUAL_MODEL_EDITOR"
CONCEPTUAL_MODEL_EDITOR_URL="$CONCEPTUAL_MODEL_EDITOR_BASE_PATH"

API_SPECIFICATION="/api-specification"
API_SPECIFICATION_BASE_PATH="$BASE_PATH$API_SPECIFICATION"
API_SPECIFICATION_URL="$API_SPECIFICATION_BASE_PATH"

if [ -d .git ]; then
  if [ -z "$GIT_COMMIT" ]; then
    GIT_COMMIT=$(git rev-parse HEAD)
  fi
  if [ -z "$GIT_REF" ]; then
    GIT_REF=$(git rev-parse --abbrev-ref HEAD)
  fi
  if [ -z "$GIT_COMMIT_DATE" ]; then
    GIT_COMMIT_DATE=$(git show -s --format=%ci)
  fi
  if [ -z "$GIT_COMMIT_NUMBER" ]; then
    GIT_COMMIT_NUMBER=$(git rev-list HEAD --count)
    if [ "$GIT_COMMIT_NUMBER" -eq 1 ]; then
      GIT_COMMIT_NUMBER=""
    fi
  fi
fi

npm ci

printf "VITE_BACKEND=$BACKEND\nVITE_DEBUG_VERSION=$CF_PAGES_BRANCH@$(echo $CF_PAGES_COMMIT_SHA | head -c7) $(date -u +%F\ %H:%M:%S)\nVITE_MANAGER_URL=$MANAGER_URL\nVITE_WIKIDATA_ONTOLOGY_BACKEND=$WIKIDATA_ONTOLOGY_BACKEND\nVITE_BASE_PATH=$DATA_SPECIFICATION_EDITOR_BASE_PATH\n" > applications/data-specification-editor/.env.local

printf "VITE_PUBLIC_BASE_PATH=$CONCEPTUAL_MODEL_EDITOR_URL\nVITE_PUBLIC_APP_BACKEND=$BACKEND\nVITE_PUBLIC_APP_BACKEND_PACKAGE_ROOT=http://dataspecer.com/packages/local-root\nVITE_PUBLIC_MANAGER_PATH=$MANAGER_URL/\nVITE_PUBLIC_DSCME_LOGO_LINK=$MANAGER_URL/\n" > applications/conceptual-model-editor/.env.local
printf "VITE_PUBLIC_APP_AUTOSAVE_ENABLED_BY_DEFAULT=0\n" >> applications/conceptual-model-editor/.env.local

printf "VITE_DATA_SPECIFICATION_EDITOR=$DATA_SPECIFICATION_EDITOR_URL\nVITE_BACKEND=$BACKEND\nVITE_CME=$CONCEPTUAL_MODEL_EDITOR_URL\nVITE_API_SPECIFICATION_APPLICATION=$API_SPECIFICATION_URL\nVITE_BASE_PATH=$MANAGER_BASE_PATH\n" > applications/manager/.env.local
printf "VITE_GIT_COMMIT=$GIT_COMMIT\nVITE_GIT_REF=$GIT_REF\nVITE_GIT_COMMIT_DATE=$GIT_COMMIT_DATE\nVITE_GIT_COMMIT_NUMBER=$GIT_COMMIT_NUMBER\n" >> applications/manager/.env.local

printf "VITE_BACKEND=$BACKEND\n" > applications/api-specification/.env.local

if [ $CF_PAGES_BRANCH != "main" ]; then
  printf "VITE_VERSION=$CF_PAGES_BRANCH\n" >> applications/manager/.env.local
fi

if [ -n "$BASE_PATH" ]; then
  sed -i "2i\  \"homepage\": \"$BASE_PATH\"," applications/data-specification-editor/package.json
fi

if [ -n "$DO_BUILD_BACKEND" ]; then
  # Do not cache (-> local:) to make build faster (cache is not preserved between builds, so it would not help anyway)
  npx turbo run build  --cache=local: --concurrency 100% --filter=data-specification-editor --filter=conceptual-model-editor --filter=manager --filter=api-specification --filter=backend^...
  (cd services/backend && npx npm run build-pack)
else
  npx turbo run build  --cache=local: --concurrency 100% --filter=data-specification-editor --filter=conceptual-model-editor --filter=manager --filter=api-specification
fi

rm -rf .dist

# Copy data-specification-editor application
mkdir -p .dist$DATA_SPECIFICATION_EDITOR
cp -r applications/data-specification-editor/dist/* .dist$DATA_SPECIFICATION_EDITOR

# Copy conceptual-model-editor application
mkdir -p .dist$CONCEPTUAL_MODEL_EDITOR
cp -r applications/conceptual-model-editor/dist/* .dist$CONCEPTUAL_MODEL_EDITOR

# Copy manager application
mkdir -p .dist$MANAGER
cp -r applications/manager/dist/* .dist$MANAGER

# Copy api-specification application
mkdir -p .dist$API_SPECIFICATION
cp -r applications/api-specification/dist/* .dist$API_SPECIFICATION

echo "/data-specification-editor/specification /data-specification-editor/ 200
/data-specification-editor/editor /data-specification-editor/ 200" > .dist/_redirects
