#!/bin/bash

npm install

printf "REACT_APP_BACKEND=$BACKEND\nREACT_APP_DEBUG_VERSION=$CF_PAGES_BRANCH@$(echo $CF_PAGES_COMMIT_SHA | head -c7) $(date -u +%F\ %H:%M:%S)" > applications/client/.env.local

printf "NEXT_PUBLIC_BASE_PATH=/conceptual-model-editor\nNEXT_PUBLIC_APP_BACKEND=$BACKEND" > applications/conceptual-model-editor/.env.local

npx turbo run build --filter=client --filter=conceptual-model-editor

rm -rf .dist
mkdir .dist

cp -r applications/client/build/* .dist

mkdir .dist/conceptual-model-editor
cp -r applications/conceptual-model-editor/out/* .dist/conceptual-model-editor
