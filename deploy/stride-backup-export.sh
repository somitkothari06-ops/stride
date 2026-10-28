#!/bin/sh
set -eu
: "${STRIDE_CONTAINER:?Missing container identity}"
dest=/home/nebius/.stride-backups-encrypted
install -d -m 700 -o nebius -g nebius "$dest"
docker cp "$STRIDE_CONTAINER":/home/coder/stride/.backups/full/. "$dest/"
chown -R nebius:nebius "$dest"
chmod 700 "$dest"
find "$dest" -type f -name '*.enc' -exec chmod 600 {} +
