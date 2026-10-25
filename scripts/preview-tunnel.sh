#!/bin/sh
# Usage: sh scripts/preview-tunnel.sh USER@HOST KEY_PATH [CONTAINER_IP]
set -u
if [ "$#" -lt 2 ]; then
  echo 'Usage: preview-tunnel.sh USER@HOST KEY_PATH [CONTAINER_IP]' >&2
  exit 2
fi
target=$1
key=$2
container_ip=${3:-172.18.0.7}
case "$target" in -*) exit 2 ;; esac
trap 'exit 0' INT TERM
while :; do
  ssh -N -i "$key" -o BatchMode=yes -o ConnectTimeout=15 \
    -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 \
    -o ServerAliveCountMax=2 -o TCPKeepAlive=yes \
    -L "127.0.0.1:3100:$container_ip:3000" "$target"
  echo 'Preview connection closed; reconnecting in 2 seconds.' >&2
  sleep 2
done
