#!/bin/sh

URL="http://localhost/health"

response=$(wget -q -O - $URL)
wget_exit_code=$?

# Check if wget command succeeded
if [ $wget_exit_code -ne 0 ]; then
  echo "http server is unreachable"
  exit 1
fi

if [ "$response" = "ok" ]; then
  echo "ok"
  exit 0
else
  echo "server error: $response"
  exit 1
fi