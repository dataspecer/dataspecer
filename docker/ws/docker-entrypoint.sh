#!/bin/sh

set -e

# Colors (ANSI)
C_RESET="\033[0m"
C_TITLE="\033[1;35m"   # bright purple
C_FAINT="\033[2m"      # faint/grey
C_GOOD="\033[0;32m"    # green
C_WARN="\033[0;33m"    # yellow

# Normalize URL once for reuse (strip trailing slashes)
NORMALIZED_URL=$(echo "${BASE_URL:=http://localhost}" | sed 's:/*$::')

prepareDatabase() {
  mkdir -p /usr/src/app/database/stores
  bunx prisma migrate deploy --schema dist/schema.prisma
}

print_banner() {
  COMMIT="${DATASPECER_GIT_COMMIT:-}"
  REF="${DATASPECER_GIT_REF:-}"
  DATE="${DATASPECER_GIT_COMMIT_DATE:-}"
  NUMBER="${DATASPECER_GIT_COMMIT_NUMBER:-}"

  COMMIT_SHORT=""
  if [ -n "$COMMIT" ]; then
    COMMIT_SHORT=$(echo "$COMMIT" | cut -c1-7)
  fi

  DATE_FORMATED=""
  if [ -n "$DATE" ]; then
    DATE_FORMATED=$(date -d "$DATE" +"%Y-%m-%d")
  fi

  INFO=""
  if [ -n "$NUMBER" ] && [ -n "$COMMIT_SHORT" ]; then
    INFO="version number $NUMBER @ $COMMIT_SHORT"
  elif [ -n "$NUMBER" ]; then
    INFO="version number $NUMBER"
  elif [ -n "$COMMIT_SHORT" ]; then
    INFO="$COMMIT_SHORT"
  fi
  if [ -n "$DATE_FORMATED" ]; then
    if [ -n "$INFO" ]; then
      INFO="$INFO • $DATE_FORMATED"
    else
      INFO="$DATE_FORMATED"
    fi
  fi
  if [ -n "$REF" ]; then
    if [ -n "$INFO" ]; then
      INFO="$INFO ($REF)"
    else
      INFO="($REF)"
    fi
  fi

  # Minimal, informative banner (server "started" will be printed by main.js)
  if [ -n "$INFO" ]; then
    printf "${C_TITLE}Dataspecer${C_RESET} ${C_FAINT}%s${C_RESET}\n" "$INFO"
  else
    printf "${C_TITLE}Dataspecer${C_RESET}\n"
  fi

  if [ "$REF" = "refs/heads/stable" ]; then
    printf "${C_GOOD}This is a stable build of Dataspecer, suitable for production.${C_RESET}\n"
  elif [ -n "$REF" ]; then
    printf "${C_WARN}It seems that this is not a stable build. To use stable version of Dataspecer suitable for production, use ghcr.io/dataspecer/ws image.${C_RESET}\n"
  fi
}

print_banner

if [ $# -gt 0 ]; then
  prepareDatabase
  exec node dist/backend-bundle.js "$@"
else
  # Prepare frontend for nginx
  BASE_PATH=$(echo "$NORMALIZED_URL" | awk -F[/] '{for (i=4; i<=NF; i++) printf "/%s", $i; print ""}')
  mkdir -p /usr/src/app/html
  cp -r /usr/src/app/html-template/* /usr/src/app/html
  find /usr/src/app/html/ -type f -exec sed -i "s|/_BASE_PATH_DOCKER_REPLACE__|$BASE_PATH|g" {} \;

  prepareDatabase

  env PORT=80 BASE_NAME=$NORMALIZED_URL STATIC_FILES_PATH=/usr/src/app/html/ DOCKER=1 bun dist/main.js
fi