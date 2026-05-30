# toggl-wrapper

[![NO AI](https://raw.githubusercontent.com/nuxy/no-ai-badge/master/badge.svg)](https://github.com/nuxy/no-ai-badge)

## Docker

The container runs the Vite dev server, which reads your Toggl API token from
`VITE_TOGGL_TOKEN` at startup and proxies `/toggl` to the Toggl API (avoiding
CORS). The app is served on port `5173`.

With docker compose (reads `VITE_TOGGL_TOKEN` from your shell or a `.env` file):

```sh
VITE_TOGGL_TOKEN=your_token docker compose up --build
```

Or with plain Docker:

```sh
docker build -t toggl-wrapper .
docker run --rm -p 5173:5173 -e VITE_TOGGL_TOKEN=your_token toggl-wrapper
```

Then open http://localhost:5173.

## Features

- [ ] selector for grouped tags
- [ ] icons for projects

## TODO

- [x] save tags state
- [x] stop timer
- [x] project selector
- [x] timer title
- [ ] icons for projects
- [ ] show currently running timer
- [ ] show time entries list
- [ ] edit tags in entries

## Tech Debt

- [ ] better typings
- [ ] separate components
