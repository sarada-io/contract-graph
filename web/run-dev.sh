#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEV_PORT=${1:-${PORT:-4173}}

exec "$SCRIPT_DIR/urun" serve --port "$DEV_PORT"
