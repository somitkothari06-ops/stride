#!/bin/sh
# Build away from the running release. Restart the supervised service after success.
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)"
umask 077
mkdir -p .runtime
mkdir .runtime/build.lock 2>/dev/null || { echo 'Another release is building.' >&2; exit 1; }
trap 'rmdir .runtime/build.lock' EXIT
active=.next
if [ -f .runtime/next-dist ]; then read -r active < .runtime/next-dist; fi
case "$active" in .next|.next-b) target=.next-a ;; .next-a) target=.next-b ;; *) exit 1 ;; esac
STRIDE_NEXT_DIST_DIR="$target" npm run build
# Keep older chunk URLs available to tabs opened before this release.
if [ -d "$active/static" ]; then cp -rn "$active/static/." "$target/static/"; fi
printf '%s\n' "$active" > .runtime/previous-dist
printf '%s\n' "$target" > .runtime/next-dist.tmp
mv .runtime/next-dist.tmp .runtime/next-dist
echo "Release built in $target. Restart stride.service to activate."
