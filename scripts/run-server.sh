#!/bin/sh
# Linux Devlab lifecycle; the host service supervises the foreground process.
set -eu
umask 077
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
PID_DIR="$APP_DIR/.runtime"
PID_FILE="$PID_DIR/server.pid"
export PATH="/home/coder/.local/node/bin:$PATH"
export NEXT_TELEMETRY_DISABLED=1
read_pid() {
  pid=''; started=''; boot=''
  [ ! -f "$PID_FILE" ] || read -r pid started boot < "$PID_FILE"
  case "$pid" in ''|*[!0-9]*) return 1 ;; esac
  [ "$pid" -gt 1 ] || return 1
  case "$started" in ''|*[!0-9]*) return 1 ;; esac
  [ -n "$boot" ]
}
start_stamp() { awk '{sub(/^.*\) /, ""); print $20}' "/proc/$1/stat" 2>/dev/null; }
same_identity() {
  [ "$boot" = "$(cat /proc/sys/kernel/random/boot_id)" ] && [ "$started" = "$(start_stamp "$pid")" ]
}
owned_process() {
  same_identity && kill -0 "$pid" 2>/dev/null && [ "$(readlink "/proc/$pid/cwd" 2>/dev/null)" = "$APP_DIR" ]
}
case "${1:-start}" in
  start)
    mkdir -p "$PID_DIR"
    chmod 700 "$PID_DIR"
    if read_pid && owned_process; then
      echo 'Stride is already running.' >&2
      exit 1
    fi
    cd "$APP_DIR"
    if [ -f "$PID_DIR/next-dist" ]; then
      read -r STRIDE_NEXT_DIST_DIR < "$PID_DIR/next-dist"
      case "$STRIDE_NEXT_DIST_DIR" in .next|.next-a|.next-b) export STRIDE_NEXT_DIST_DIR ;; *) echo 'Invalid release directory.' >&2; exit 1 ;; esac
    fi
    printf '%s %s %s\n' "$$" "$(start_stamp "$$")" "$(cat /proc/sys/kernel/random/boot_id)" > "$PID_FILE"
    exec "${STRIDE_NODE:-node}" "${STRIDE_SERVER_ENTRY:-$APP_DIR/node_modules/next/dist/bin/next}" start --hostname 0.0.0.0 --port "${PORT:-3000}"
    ;;
  stop)
    [ -f "$PID_FILE" ] || exit 0
    read_pid || { mv -f "$PID_FILE" "$PID_DIR/server.pid.invalid"; echo 'Quarantined an invalid runtime PID without signalling a process.'; exit 0; }
    if ! kill -0 "$pid" 2>/dev/null; then rm -f "$PID_FILE"; exit 0; fi
    if ! same_identity; then rm -f "$PID_FILE"; exit 0; fi
    owned_process || { echo 'Refusing to stop a process outside this application.' >&2; exit 1; }
    kill -TERM "$pid"
    attempts=0
    while owned_process && [ "$attempts" -lt 10 ]; do
      sleep 1
      attempts=$((attempts + 1))
    done
    if owned_process; then kill -KILL "$pid"; fi
    rm -f "$PID_FILE"
    ;;
  *) echo 'Usage: run-server.sh start|stop' >&2; exit 2 ;;
esac
