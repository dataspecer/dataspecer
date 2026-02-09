#!/bin/bash

set -e # Exit with nonzero exit code if anything fails

MANAGER=""

DATA_SPECIFICATION_EDITOR="/data-specification-editor"

CONCEPTUAL_MODEL_EDITOR="/conceptual-model-editor"

API_SPECIFICATION="/api-specification"

rm -rf .dist

# Copy data-specification-editor application
mkdir -p .dist$DATA_SPECIFICATION_EDITOR
mv applications/data-specification-editor/dist/* .dist$DATA_SPECIFICATION_EDITOR

# Copy conceptual-model-editor application
mkdir -p .dist$CONCEPTUAL_MODEL_EDITOR
mv applications/conceptual-model-editor/dist/* .dist$CONCEPTUAL_MODEL_EDITOR

# Copy manager application
mkdir -p .dist$MANAGER
mv applications/manager/dist/* .dist$MANAGER

# # Copy api-specification application
# mkdir -p .dist$API_SPECIFICATION
# mv applications/api-specification/dist/* .dist$API_SPECIFICATION
