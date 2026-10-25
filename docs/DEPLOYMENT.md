# Current Devlab runtime

This is the team's private development deployment, not the public judge URL. It uses the existing code-server container without modifying code-server on port 8080. Stride listens on container port 3000; the local preview reaches it through the existing SSH tunnel.

## Supervision

The Devlab host runs `stride.service` from `deploy/stride.service`. The host-only file `/etc/stride/devlab.env` sets the existing container ID, as shown in `deploy/devlab.env.example`. No API keys belong in that file. Keys stay in the container's ignored, mode-600 `/home/coder/stride/.env.local`.

The unit runs Next as `coder`, in `/home/coder/stride`, using `scripts/run-server.sh`. The lifecycle file `.runtime/server.pid` is private and ignored by Git. It records the PID, Linux start time and boot ID. Stop checks identity and working directory before signalling the process; malformed records are quarantined and stale identities are discarded without signalling another process. Before starting, the unit stops a verified leftover app process, covering a lost Docker-exec connection. Restart attempts are bounded at five per minute; repeated configuration errors or an unknown port conflict need investigation, not arbitrary process killing.

From the Devlab host:

```sh
sudo systemctl status stride.service --no-pager
sudo systemctl restart stride.service
sudo journalctl -u stride.service -n 40 --no-pager
```

Use this unit for restarts. Do not also launch `npm start` in the background: that creates an unmanaged second process and a port conflict. The container has its own `always` restart policy. Host/container recreation, long pauses, changed container IDs and a public production deployment still need explicit verification; only process recovery was drilled here.

## Before updating

1. Take a new private, consistent snapshot using [RECOVERY.md](RECOVERY.md). Never overwrite an existing snapshot.
2. Sync tracked source only; preserve `.env.local`, `.data`, `.backups` and `.runtime`.
3. Install pinned dependencies if the lockfile changed. Run `npm run check` and `npm run build` as coder with Node 22.
4. Restart `stride.service`. Check `/api/health`, then the relevant workflow.
5. Commit and push the tested milestone. Check GitHub CI.

`GET /api/health` returns only `{"status":"ok"}` (200) or `{"status":"unavailable"}` (503), with no caching, cookies, user data or API calls. It checks that the workspace table can be read, not provider billing, model accuracy or full database integrity.

## Recovery drill

Run deliberately from a developer machine with the existing SSH identity and working preview tunnel:

```sh
node scripts/recovery-smoke.mjs --allow-restart --host USER@DEVLAB_HOST --identity /absolute/private/key/path --container EXISTING_CONTAINER_ID
```

This interrupts the app twice: once by killing its Node server and once by killing the host supervisor's Docker-exec client. It creates a private synthetic session, waits for a different server PID and healthy storage, checks that the saved note survived both restarts, then removes its synthetic marker. It never runs automatically in CI and makes no model calls. The observed Devlab drill passed both cases.

If health remains unavailable, inspect the unit journal, container ID, disk space and permissions. Do not repeatedly restart a corrupt database. Keep the original database and snapshot private. To roll back supervision, stop/disable the unit before starting the prior foreground app command; never run both. To roll back source, use a known tested Git revision, rebuild and restart against the unchanged data directory. This change adds no storage migration.

## Live search check

After setting `TAVILY_API_KEY` privately and restarting:

```sh
node scripts/search-smoke.mjs --allow-live
```

Run inside the application container, or set `STRIDE_BASE_URL` to the app URL. It performs one public search and may use one model call, with a fresh synthetic session. It checks returned URLs, retrieval timestamps, persistence and that the empty test history never gains invented evidence. If model comparison fails or reaches its allowance, retrieved sources remain available and are labelled as not model-assessed. Real postings still need eligibility, freshness and relevance checks.
