# Development workflow

## The existing Nebius machine

Work lives in `/home/coder/stride` inside the already-running code-server container. Node 22.23.4 was installed from the official Node.js distribution into `/home/coder/.local/node`, with the downloaded archive checked against its published SHA-256. The project uses the persistent code-server workspace volume.

SSH to the machine using your own authorized key and the Devlab's current public address. Do not commit either a private key or an account password. Dynamic addresses and container IDs can change; discover them rather than assuming an old value.

On the VM:

```sh
sudo docker ps
sudo docker exec -it --user coder <code-server-container-id> bash
```

Inside the workspace container:

```sh
export PATH=/home/coder/.local/node/bin:$PATH
cd /home/coder/stride
npm ci
npm run check
npm run build
npm run start -- --port 3000
```

The application server is separate from code-server's editor on port 8080. Do not remove editor authentication or replace Nebius-managed proxy containers. To view the app safely during development, forward a local port through SSH to the workspace container's reachable address and port 3000. The exact forwarding command depends on its current Docker network IP. An SSH tunnel is a development preview, not a public judge URL.

The first server process was launched in the container with its output at `/home/coder/.cache/stride-server.log`. A container/VM restart stops that process. Configure explicit supervision before public deployment; do not assume a development process starts itself after reboot.

## Git and two builders

One repository is the source of truth. The main integrator owns app/server integration and schema changes. The second builder can implement bounded AI/search improvements or independently test student cases in a separate branch. Agree shared schemas in `lib/types.ts` before editing overlapping modules.

Before pushing:

1. Run type checking, tests and production build.
2. Exercise the relevant running workflow and error case.
3. Inspect `git diff` and `git status`; keep `.env.local`, `.data`, logs and private artifacts excluded.
4. Commit a small coherent change with honest status notes.
5. Pull/review the other branch, merge and repeat the relevant checks.

The local Mac checkout can mirror authored source and push through its already-authorized GitHub CLI. Builds and the application run on the Devlab. Do not copy the Mac's GitHub token into the remote environment.

## Keys

Copy `.env.example` to `.env.local` on the development machine. Set the file mode to 600 and enter keys privately. Do not display its contents in commands, screenshots or chat. Restart the server, verify the model catalog, and run a bounded live request before treating configuration as working.

The application exposes configuration presence only. It never returns keys in API responses or exported workspaces.

## Important first-version limitations

Workspace data is a transactional JSON document per hashed session ID. This makes the first slice easy to run without creating additional managed services, but it is not the final normalized schema from the product specification. Move to versioned relational tables/managed accounts as the product needs them. The current implementation is a single Node process; do not scale replicas against separate local database files.

The planner deliberately selects urgent confirmed work before asking an optional model to improve the wording. Do not remove deterministic time/deadline/source constraints merely to make model output seem more autonomous.
