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
- project selector (pinned projects)
- selector for grouped tags (`group:tag`), state saved locally
- show currently running timer, synced every minute
- full-screen timer mode
  - background in the project colour
  - ↑ / ↓ to pick a project, Enter to start / stop
  - works on phones (touch start / stop buttons)

## TODO

- [ ] icons for projects
- [ ] show time entries list
- [ ] edit tags in entries

## Tech Debt

- [ ] better typings
- [ ] separate components
