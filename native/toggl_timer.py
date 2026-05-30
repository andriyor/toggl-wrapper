#!/usr/bin/env python3
"""Native fullscreen Toggl timer (Qt / PySide6).

A standalone desktop port of the web app's fullscreen mode:

- Idle: pick a pinned project with Up/Down (wrap-around), Enter to start.
- Running: shows the project, description and elapsed time; Enter (or the
  Stop button) stops the timer.

The window background reflects the selected/current project's color, just like
the web version. Unlike the browser, a desktop app can call the Toggl API
directly (no CORS), so there is no proxy: requests go straight to
https://api.track.toggl.com with HTTP Basic auth (token:api_token).
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from PySide6 import QtCore, QtGui, QtWidgets

API_BASE = "https://api.track.toggl.com/api/v9"
CREATED_WITH = "toggl-wrapper-native"
POLL_INTERVAL_MS = 60_000


# --------------------------------------------------------------------------- #
# Token + API
# --------------------------------------------------------------------------- #
def load_token() -> str:
    """Resolve the Toggl API token.

    Order: TOGGL_API_TOKEN env, VITE_TOGGL_TOKEN env, then VITE_TOGGL_TOKEN
    from the repo-root ../.env so this app can reuse the web app's token.
    """
    token = os.environ.get("TOGGL_API_TOKEN") or os.environ.get("VITE_TOGGL_TOKEN")
    if token:
        return token.strip()

    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("VITE_TOGGL_TOKEN="):
                return line.split("=", 1)[1].strip().strip("\"'")

    raise SystemExit(
        "No Toggl token found. Set TOGGL_API_TOKEN (or VITE_TOGGL_TOKEN), "
        "or add VITE_TOGGL_TOKEN=... to ../.env"
    )


class TogglClient:
    """Thin Toggl API v9 client. All calls are blocking; run off the UI thread."""

    def __init__(self, token: str):
        self.session = requests.Session()
        self.session.auth = (token, "api_token")
        self.session.headers["Content-Type"] = "application/json"

    def _get(self, path: str):
        res = self.session.get(f"{API_BASE}{path}", timeout=30)
        res.raise_for_status()
        return res.json()

    def me(self):
        return self._get("/me")

    def projects(self, workspace_id: int):
        return self._get(f"/workspaces/{workspace_id}/projects")

    def current_entry(self):
        # Returns the running entry, or null/None when nothing is running.
        return self._get("/me/time_entries/current")

    def start(self, workspace_id: int, project_id: int, description: str = ""):
        body = {
            "duration": -1,
            "wid": workspace_id,
            "description": description,
            "created_with": CREATED_WITH,
            "start": datetime.now(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z"),
            "tag_ids": [],
            "project_id": project_id,
        }
        res = self.session.post(
            f"{API_BASE}/workspaces/{workspace_id}/time_entries",
            json=body,
            timeout=30,
        )
        res.raise_for_status()
        return res.json()

    def stop(self, workspace_id: int, entry_id: int):
        res = self.session.patch(
            f"{API_BASE}/workspaces/{workspace_id}/time_entries/{entry_id}/stop",
            timeout=30,
        )
        res.raise_for_status()
        return res.json()


# --------------------------------------------------------------------------- #
# Async helper — run a blocking call in the thread pool, deliver via signals
# --------------------------------------------------------------------------- #
class _WorkerSignals(QtCore.QObject):
    result = QtCore.Signal(object)
    error = QtCore.Signal(str)


class _Worker(QtCore.QRunnable):
    def __init__(self, fn, *args, **kwargs):
        super().__init__()
        self._fn = fn
        self._args = args
        self._kwargs = kwargs
        self.signals = _WorkerSignals()

    @QtCore.Slot()
    def run(self):
        try:
            value = self._fn(*self._args, **self._kwargs)
        except Exception as exc:  # noqa: BLE001 - surfaced to the UI
            self.signals.error.emit(str(exc))
        else:
            self.signals.result.emit(value)


def is_dark(hex_color: str | None) -> bool:
    if not hex_color:
        return False
    h = hex_color.lstrip("#")
    if len(h) != 6:
        return False
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6


def format_seconds(total: int) -> str:
    total = max(0, int(total))
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


# --------------------------------------------------------------------------- #
# Main window
# --------------------------------------------------------------------------- #
class FullscreenTimer(QtWidgets.QWidget):
    def __init__(self, client: TogglClient):
        super().__init__()
        self.client = client
        self.pool = QtCore.QThreadPool.globalInstance()

        self.workspace_id: int | None = None
        self.projects_by_id: dict[int, dict] = {}
        self.pinned: list[dict] = []
        self.selected_index = 0
        self.current: dict | None = None  # running entry, or None
        self.start_dt: datetime | None = None
        self.busy = False  # guards against double start/stop

        self.text_color = "#111111"
        self.subtext_color = "rgba(0,0,0,0.6)"

        self._build_ui()

        self.clock = QtCore.QTimer(self)
        self.clock.setInterval(1000)
        self.clock.timeout.connect(self._tick)

        self.poller = QtCore.QTimer(self)
        self.poller.setInterval(POLL_INTERVAL_MS)
        self.poller.timeout.connect(self.refresh_current)

        self.setWindowTitle("Toggl Timer")
        self._set_background(None)
        self._set_status("Loading…")
        self.bootstrap()

    # -- UI construction ---------------------------------------------------- #
    def _build_ui(self):
        root = QtWidgets.QVBoxLayout(self)
        root.setContentsMargins(48, 48, 48, 48)
        root.setSpacing(24)
        root.addStretch(1)

        self.title_label = QtWidgets.QLabel("")
        self.title_label.setAlignment(QtCore.Qt.AlignCenter)
        f = self.title_label.font()
        f.setPointSize(28)
        self.title_label.setFont(f)
        root.addWidget(self.title_label)

        self.desc_label = QtWidgets.QLabel("")
        self.desc_label.setAlignment(QtCore.Qt.AlignCenter)
        f = self.desc_label.font()
        f.setPointSize(18)
        self.desc_label.setFont(f)
        root.addWidget(self.desc_label)

        self.timer_label = QtWidgets.QLabel("00:00:00")
        self.timer_label.setAlignment(QtCore.Qt.AlignCenter)
        mono = QtGui.QFont("monospace")
        mono.setStyleHint(QtGui.QFont.Monospace)
        mono.setPixelSize(160)
        self.timer_label.setFont(mono)
        root.addWidget(self.timer_label)

        self.list = QtWidgets.QListWidget()
        self.list.setFocusPolicy(QtCore.Qt.NoFocus)  # keys handled by the window
        self.list.setSelectionMode(QtWidgets.QAbstractItemView.NoSelection)
        self.list.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
        self.list.setVerticalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
        self.list.setFrameShape(QtWidgets.QFrame.NoFrame)
        self.list.setMaximumWidth(720)
        self.list.setMaximumHeight(420)
        root.addWidget(self.list, alignment=QtCore.Qt.AlignHCenter)

        self.stop_button = QtWidgets.QPushButton("⏸  Stop")
        self.stop_button.setFocusPolicy(QtCore.Qt.NoFocus)
        self.stop_button.setCursor(QtCore.Qt.PointingHandCursor)
        self.stop_button.clicked.connect(self.stop_timer)
        root.addWidget(self.stop_button, alignment=QtCore.Qt.AlignHCenter)

        self.hint_label = QtWidgets.QLabel("↑ / ↓ to pick · Enter to start · Esc to exit")
        self.hint_label.setAlignment(QtCore.Qt.AlignCenter)
        root.addWidget(self.hint_label)

        root.addStretch(1)

    # -- Theming ------------------------------------------------------------ #
    def _set_background(self, color: str | None):
        dark = is_dark(color)
        self.text_color = "#ffffff" if dark else "#111111"
        self.subtext_color = (
            "rgba(255,255,255,0.75)" if dark else "rgba(0,0,0,0.6)"
        )

        pal = self.palette()
        pal.setColor(QtGui.QPalette.Window, QtGui.QColor(color or "#1a1a1a"))
        self.setPalette(pal)
        self.setAutoFillBackground(True)

        self.title_label.setStyleSheet(f"color: {self.subtext_color};")
        self.desc_label.setStyleSheet(f"color: {self.subtext_color};")
        self.timer_label.setStyleSheet(f"color: {self.text_color};")
        self.hint_label.setStyleSheet(f"color: {self.subtext_color}; font-size: 16px;")
        self.stop_button.setStyleSheet(
            f"""
            QPushButton {{
                color: {self.text_color};
                background: transparent;
                border: 2px solid {self.text_color};
                border-radius: 10px;
                padding: 12px 28px;
                font-size: 20px;
            }}
            QPushButton:hover {{ background: rgba(127,127,127,0.2); }}
            """
        )
        self.list.setStyleSheet(
            f"""
            QListWidget {{ background: transparent; border: none; outline: none; }}
            QListWidget::item {{
                border: 2px solid transparent;
                border-radius: 6px;
                padding: 8px 24px;
            }}
            QListWidget::item:selected {{ background: transparent; }}
            """
        )

    # -- Mode rendering ----------------------------------------------------- #
    def _show_running(self):
        self.current = self.current or {}
        project = self.projects_by_id.get(self.current.get("project_id"))
        self._set_background(project.get("color") if project else None)

        self.title_label.setText(project["name"] if project else "No project")
        self.title_label.show()

        desc = self.current.get("description")
        self.desc_label.setText(desc or "")
        self.desc_label.setVisible(bool(desc))

        self.timer_label.show()
        self.stop_button.show()
        self.list.hide()
        self.hint_label.setText("Enter to stop · Esc to exit")
        self.hint_label.show()

        self._tick()
        self.clock.start()

    def _show_idle(self):
        self.clock.stop()
        self.timer_label.hide()
        self.stop_button.hide()
        self.desc_label.hide()

        if not self.pinned:
            self.list.hide()
            self.title_label.setText("No pinned projects")
            self.title_label.show()
            self.hint_label.setText("Pin a project in Toggl · Esc to exit")
            self.hint_label.show()
            self._set_background(None)
            return

        self.selected_index = max(0, min(self.selected_index, len(self.pinned) - 1))
        self._populate_list()
        self.list.show()
        self.title_label.show()
        self.hint_label.setText("↑ / ↓ to pick · Enter to start · Esc to exit")
        self.hint_label.show()
        self._apply_selection()

    def _populate_list(self):
        self.list.clear()
        for project in self.pinned:
            item = QtWidgets.QListWidgetItem(project.get("name", "Untitled"))
            item.setTextAlignment(QtCore.Qt.AlignCenter)
            f = item.font()
            f.setPointSize(22)
            item.setFont(f)
            self.list.addItem(item)

    def _apply_selection(self):
        """Highlight the selected pinned project and recolor the background."""
        project = self.pinned[self.selected_index]
        self._set_background(project.get("color"))
        self.title_label.setText(project.get("name", "Pick a project"))

        # The active project is bold + full color; the rest are dimmed, mirroring
        # the web version's opacity treatment. (Per-index borders aren't
        # expressible in QSS, so emphasis is via weight + color.)
        active_color = QtGui.QColor(self.text_color)
        dim_color = QtGui.QColor(self.text_color)
        dim_color.setAlpha(110)
        for i in range(self.list.count()):
            item = self.list.item(i)
            active = i == self.selected_index
            f = item.font()
            f.setBold(active)
            item.setFont(f)
            item.setForeground(active_color if active else dim_color)

        item = self.list.item(self.selected_index)
        if item:
            self.list.scrollToItem(item, QtWidgets.QAbstractItemView.EnsureVisible)

    # -- State / data ------------------------------------------------------- #
    def bootstrap(self):
        self._run(self._bootstrap_blocking, on_result=self._on_bootstrap)

    def _bootstrap_blocking(self):
        me = self.client.me()
        wid = me["default_workspace_id"]
        projects = self.client.projects(wid)
        current = self.client.current_entry()
        return {"wid": wid, "projects": projects, "current": current}

    def _on_bootstrap(self, data):
        self.workspace_id = data["wid"]
        projects = data["projects"] or []
        self.projects_by_id = {p["id"]: p for p in projects}
        self.pinned = [p for p in projects if p.get("pinned")]
        self.current = data["current"] or None
        self._render()
        self.poller.start()

    def refresh_current(self):
        if self.busy:
            return
        self._run(self.client.current_entry, on_result=self._on_current)

    def _on_current(self, entry):
        self.current = entry or None
        self._render()

    def _render(self):
        if self.current:
            self.start_dt = self._parse_start(self.current.get("start"))
            self._show_running()
        else:
            self.start_dt = None
            self._show_idle()

    # -- Actions ------------------------------------------------------------ #
    def start_timer(self):
        if self.busy or not self.pinned or self.workspace_id is None:
            return
        project = self.pinned[self.selected_index]
        self.busy = True
        self._set_status_running("Starting…")
        self._run(
            self.client.start,
            self.workspace_id,
            project["id"],
            on_result=self._on_started,
            on_error=self._on_action_error,
        )

    def _on_started(self, entry):
        self.busy = False
        self.current = entry or None
        self._render()

    def stop_timer(self):
        if self.busy or not self.current or self.workspace_id is None:
            return
        self.busy = True
        self.stop_button.setText("Stopping…")
        self._run(
            self.client.stop,
            self.workspace_id,
            self.current["id"],
            on_result=self._on_stopped,
            on_error=self._on_action_error,
        )

    def _on_stopped(self, _entry):
        self.busy = False
        self.stop_button.setText("⏸  Stop")
        self.current = None
        self._render()

    def _on_action_error(self, message):
        self.busy = False
        self.stop_button.setText("⏸  Stop")
        self._on_error(message)

    # -- Timer tick --------------------------------------------------------- #
    def _tick(self):
        if not self.start_dt:
            self.timer_label.setText("00:00:00")
            return
        elapsed = (datetime.now(timezone.utc) - self.start_dt).total_seconds()
        self.timer_label.setText(format_seconds(elapsed))

    @staticmethod
    def _parse_start(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    # -- Helpers ------------------------------------------------------------ #
    def _set_status(self, text):
        self.title_label.setText(text)
        self.title_label.show()
        self.desc_label.hide()
        self.timer_label.hide()
        self.list.hide()
        self.stop_button.hide()
        self.hint_label.hide()

    def _set_status_running(self, text):
        self.title_label.setText(text)

    def _on_error(self, message):
        self._set_status(f"Error: {message}")
        self.hint_label.setText("Esc to exit")
        self.hint_label.show()

    def _run(self, fn, *args, on_result=None, on_error=None):
        worker = _Worker(fn, *args)
        if on_result:
            worker.signals.result.connect(on_result)
        worker.signals.error.connect(on_error or self._on_error)
        self.pool.start(worker)

    # -- Keyboard ----------------------------------------------------------- #
    def keyPressEvent(self, event: QtGui.QKeyEvent):
        key = event.key()
        if key in (QtCore.Qt.Key_Escape, QtCore.Qt.Key_Q):
            self.close()
            return
        if key in (QtCore.Qt.Key_Return, QtCore.Qt.Key_Enter):
            if self.current:
                self.stop_timer()
            else:
                self.start_timer()
            return

        # Arrow navigation only matters while idle with a pinned list.
        if self.current or not self.pinned:
            return super().keyPressEvent(event)

        count = len(self.pinned)
        if key == QtCore.Qt.Key_Down:
            self.selected_index = (self.selected_index + 1) % count
            self._apply_selection()
        elif key == QtCore.Qt.Key_Up:
            self.selected_index = (self.selected_index - 1) % count
            self._apply_selection()
        else:
            super().keyPressEvent(event)


def main():
    token = load_token()
    app = QtWidgets.QApplication(sys.argv)
    window = FullscreenTimer(TogglClient(token))
    window.showFullScreen()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
