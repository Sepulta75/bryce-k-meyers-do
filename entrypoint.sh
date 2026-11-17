#!/bin/sh
# Starts the contact relay on loopback, then nginx in the foreground.
set -e

node /app/server/contact-relay.mjs &
RELAY_PID=$!

# If the relay dies, shout about it but keep serving the static site.
trap 'kill -TERM "$RELAY_PID" 2>/dev/null || true' TERM INT

nginx -g 'daemon off;'
