# Native fullscreen Toggl timer (Qt / PySide6)

A standalone desktop port of the web app's fullscreen mode. Same behavior, no
browser:

- **Idle** — pick a pinned project with **↑ / ↓** (wrap-around), **Enter** to
  start. The background reflects the selected project's color.
- **Running** — shows the project, description and a large elapsed-time clock.
  **Enter** (or the **Stop** button) stops the timer.
- **Esc** / **q** exits.

Unlike the browser version there's no `/toggl` proxy: a desktop app can call the
Toggl API directly, so requests go straight to `https://api.track.toggl.com`
with HTTP Basic auth (`token:api_token`).

## Setup

```sh
cd native
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Token

The app resolves the token in this order:

1. `TOGGL_API_TOKEN` environment variable
2. `VITE_TOGGL_TOKEN` environment variable
3. `VITE_TOGGL_TOKEN=...` from the repo-root `../.env` (so it reuses the web
   app's token automatically)

## Run

```sh
# from the native/ folder, with the venv active
python toggl_timer.py

# or pass the token explicitly
TOGGL_API_TOKEN=your_token python toggl_timer.py
```