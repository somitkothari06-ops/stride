# Back up and recover Stride

Use this before a deployment or database change, or when workspace storage needs recovery. Requires Node 22.13+ and filesystem access as the app user. The live data directory must be persistent; on the current Devlab it is `/home/coder/stride/.data`. Keep the working directory or `STRIDE_DATA_DIR` explicit when starting the server.

## Create a consistent snapshot

From the application directory:

```sh
mkdir -m 700 -p .backups
node scripts/database.mjs backup .data/stride.sqlite .backups/before-deploy.sqlite
node scripts/database.mjs verify .backups/before-deploy.sqlite
```

Choose a new filename for each snapshot. Existing files are never overwritten. A successful command prints only the operation, integrity result and session count. It does not print workspace content or cookie identifiers.

The tool uses SQLite `VACUUM INTO` to capture committed WAL data, checks database integrity and readable workspace JSON, flushes the private snapshot, then publishes it. It does not copy the live `.sqlite` file by itself: that can omit committed WAL records. Verification checks structural readability, not educational correctness or compatibility with a future application schema. See [SQLite's snapshot guarantees](https://www.sqlite.org/lang_vacuum.html).

Snapshots contain student content and session hashes. Keep them private and outside Git. The app's `.env.local` is separate and is never included. Copy an encrypted snapshot off the Devlab volume for protection against loss of the whole volume; a backup on the same disk does not provide that protection. Off-volume copies and automatic scheduling are not configured yet.

## Restore without replacing live data

```sh
node scripts/database.mjs restore .backups/before-deploy.sqlite .data-recovered
node scripts/database.mjs verify .data-recovered/stride.sqlite
```

The destination directory must not exist. Restore never writes over the current database and removes its own unfinished directory on failure. Stop the application before switching it to the restored directory, then start it with `STRIDE_DATA_DIR` set to the absolute path of `.data-recovered`. Keep the previous database and its WAL/SHM files together for rollback. Never replace a running SQLite database or combine an old snapshot with another database's WAL files.

Check `/api/providers` and reopen a known workspace using its existing browser cookie. A snapshot does not restore a lost cookie or provide cross-device account recovery. Confirm expected work and recent observations. If the recovery is wrong, stop the app and restart against the original data directory. Recovered data reflects the snapshot time; later changes are absent. Deleted content may remain in older backups, so delete obsolete backups according to the team's eventual retention policy.

## Failure handling

A failed operation leaves an existing destination untouched. Check disk space, permissions, source validity and a new output path. Do not keep retrying by deleting the only known-good snapshot. If integrity fails, retain the original files privately and investigate before attempting a data repair. No automatic repair or destructive migration is provided.

Automated tests cover committed WAL capture, a snapshot independent of later writes, restore into a new directory, private file permissions, refusal to overwrite, and rejection of missing/corrupt/incomplete databases. A synthetic restore drill and a live snapshot verification are separate evidence; neither establishes disaster recovery from loss of the entire Devlab.
