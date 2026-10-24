# toggl-wrapper

## Docker

The container runs the Vite dev server, which reads your Toggl API token from
`TOGGL_TOKEN` at startup and proxies `/toggl` to the Toggl API (avoiding
CORS). The app is served on port `5173`.

With docker compose (reads `TOGGL_TOKEN` from your shell or a `.env` file):

```sh
TOGGL_TOKEN=your_token docker compose up --build
```

Or with plain Docker:

```sh
docker build -t toggl-wrapper .
docker run --rm -p 5173:5173 -e TOGGL_TOKEN=your_token toggl-wrapper
```

Then open http://localhost:5173.

### Access from other devices

The dev server listens on `0.0.0.0`, so devices on the same network can open
`http://<your-ip>:5173` (macOS: `ipconfig getifaddr en0`). Allow incoming
connections for `node`/Docker in the firewall if it doesn't load.

> The token stays on the server (the proxy adds it), but anyone who can open the
> app can act on your Toggl account through it. Only share on a trusted network.

## Features

- start / stop timer
- timer description
- project selector (all projects, pinned first; fullscreen picker shows pinned only)
- selector for grouped tags (`group:tag`), selection saved on the server (`GET /api/selected-tags`)
- show currently running timer, synced every minute
- full-screen timer mode
  - background in the project colour
  - ↑ / ↓ to pick a project, Enter to start / stop
  - works on phones (touch start / stop buttons)

## Technical decisions

- **Token stays server-side.** The Vite dev server proxies `/toggl` to the
  Toggl API and adds the `Authorization` header from `TOGGL_TOKEN`, so the
  token never reaches the browser and CORS is avoided. Downside: the app only
  runs on the dev server (no production build).
- **Toggl API v9, `/me/*` endpoints.** Projects come from `/me/projects` and
  tags from `/me/tags`, which return everything the user can access across
  workspaces (the per-workspace `/workspaces/{id}/projects` list is
  incomplete). New entries are created in the selected project's own
  workspace.
- **React Query as the client state layer.** Responses are persisted to
  `localStorage` (6 h stale, 24 h cache) so the UI renders instantly on
  reload; only the running entry is refetched every minute, including in the
  background.
- **Selected tags stored on the server.** A small Vite plugin
  (`server/selected-tags.ts`) serves `GET/PUT /api/selected-tags` and writes
  to `data/selected-tags.json`, so the selection is shared across devices and
  readable by other tools.
- **UI stack.** React 19 + Mantine for components, Tailwind for layout,
  hand-written API types covering only the fields the app reads.

## TODO

- [ ] icons for projects
- [ ] show time entries list
- [ ] edit tags in entries

## Tech Debt

- [x] better typings
- [x] separate components
- [x] throw on failed API requests
- [x] keep the API token out of the client bundle
- [ ] show start / stop errors in the UI (currently only logged to the console)
- [ ] production build: the app only runs on the Vite dev server, whose proxy
      adds the token
