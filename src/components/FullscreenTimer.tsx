import { useEffect } from "react";
import { Modal } from "@mantine/core";
import { useIdle } from "@mantine/hooks";

import { formatSeconds } from "../utils/format.ts";
import type { Timer } from "../hooks/useTimer.ts";
import { ProjectPicker } from "./ProjectPicker.tsx";
import { RunningView } from "./RunningView.tsx";

export type ButtonStyle = { color: string; backgroundColor: string };

type Props = {
  opened: boolean;
  onClose: () => void;
  timer: Timer;
};

const isDarkColor = (hex?: string) => {
  if (!hex) return false;
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6;
};

export const FullscreenTimer = ({ opened, onClose, timer }: Props) => {
  const {
    isRunning,
    currentProject,
    pinnedProjects = [],
    selectedProject,
    setSelectedProject,
    start,
    stop,
  } = timer;
  const selectedIndex = pinnedProjects.findIndex(
    (project) => project.id === selectedProject,
  );
  const selectedPinned = pinnedProjects[selectedIndex];

  // While idle, the background reflects the highlighted pinned project so the
  // selection is obvious even before starting.
  const displayColor = isRunning
    ? currentProject?.color
    : selectedPinned?.color;
  const displayName = isRunning
    ? (currentProject?.name ?? "No project")
    : (selectedPinned?.name ?? "Pick a project");

  // After a while untouched, a running timer drops to a black, dim "always-on"
  // look: OLED pixels that are black are off, so it saves battery and the
  // coloured background can't burn in. Any tap/key/mouse move wakes it.
  const idle = useIdle(30_000);
  const dimmed = opened && isRunning && idle;
  // Nudge the clock a few px each minute so the digits don't burn in either.
  const minute = Math.floor(timer.seconds / 60);
  const shift = `${((minute * 7) % 17) - 8}px, ${((minute * 11) % 17) - 8}px`;
  const chromeColor = dimmed ? "#000" : displayColor;

  const onDark = isDarkColor(displayColor);
  const subTextColor = onDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)";
  // Shared by close / start / stop so they read as one set on any project colour.
  const buttonStyle = {
    color: onDark ? "#fff" : "#111",
    backgroundColor: onDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.5)",
  };

  // Tint the browser chrome (tab strip / mobile address bar) and the page
  // background, which shows behind the phone's bottom gesture bar.
  useEffect(() => {
    if (!opened || !chromeColor) return;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    const html = document.documentElement;
    const previous = { meta: meta?.content, bg: html.style.backgroundColor };
    if (meta) meta.content = chromeColor;
    html.style.backgroundColor = chromeColor;
    return () => {
      if (meta && previous.meta) meta.content = previous.meta;
      html.style.backgroundColor = previous.bg;
    };
  }, [opened, chromeColor]);

  // Default the highlight to the first pinned project when opening idle with no
  // current selection, so Enter has something to start.
  useEffect(() => {
    if (!opened || isRunning) return;
    if (selectedIndex === -1 && pinnedProjects.length > 0) {
      setSelectedProject(pinnedProjects[0].id);
    }
  }, [opened, isRunning, selectedIndex, pinnedProjects, setSelectedProject]);

  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // While dimmed, a key press only wakes the screen (useIdle handles that).
      if (dimmed) return;
      if (event.key === "Enter") {
        event.preventDefault();
        if (isRunning) stop();
        else if (selectedPinned) start();
        return;
      }

      // Arrow navigation only matters while idle (running has nothing to pick).
      const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
      if (isRunning || !step || pinnedProjects.length === 0) return;
      event.preventDefault();
      const n = pinnedProjects.length;
      const from = selectedIndex === -1 ? (step > 0 ? -1 : 0) : selectedIndex;
      setSelectedProject(pinnedProjects[(from + step + n) % n].id);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    opened,
    dimmed,
    isRunning,
    selectedIndex,
    selectedPinned,
    pinnedProjects,
    start,
    stop,
    setSelectedProject,
  ]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      withCloseButton
      closeButtonProps={{ size: "xl", iconSize: 32, "aria-label": "Close" }}
      padding={0}
      styles={{
        content: { backgroundColor: displayColor ?? undefined },
        // Header defaults to the theme body colour; let the project colour show.
        // Safe-area insets keep content clear of the notch / home indicator
        // now that viewport-fit=cover lets the page draw underneath them.
        header: {
          backgroundColor: "transparent",
          paddingTop: "max(var(--mb-padding), env(safe-area-inset-top))",
        },
        close: buttonStyle,
        // Fill what's left under the 60px header so the page doesn't scroll.
        body: {
          height: "calc(100dvh - 60px)",
          paddingBottom: "env(safe-area-inset-bottom)",
        },
      }}
    >
      {dimmed && (
        // Covers the whole modal (close/stop included) so the waking tap
        // can't hit a button underneath.
        <div
          className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-4 px-4 text-center"
          style={{ backgroundColor: "#000", color: "rgba(255,255,255,0.35)" }}
        >
          <div style={{ transform: `translate(${shift})` }}>
            <div className="text-xl sm:text-3xl break-words max-w-full">
              {displayName}
            </div>
            <div
              className="font-mono tabular-nums leading-none mt-4"
              style={{ fontSize: "clamp(3rem, 18vw, 12rem)" }}
            >
              {formatSeconds(timer.seconds)}
            </div>
          </div>
        </div>
      )}
      <div
        className="flex flex-col items-center justify-center h-full gap-6 sm:gap-8 px-4 text-center"
        style={{ color: "#111" }}
      >
        <div
          className="text-2xl sm:text-4xl break-words max-w-full"
          style={{ color: subTextColor }}
        >
          {displayName}
        </div>

        {isRunning ? (
          <RunningView
            timer={timer}
            subTextColor={subTextColor}
            buttonStyle={buttonStyle}
          />
        ) : pinnedProjects.length > 0 ? (
          <ProjectPicker
            opened={opened}
            projects={pinnedProjects}
            selectedId={selectedProject}
            onSelect={setSelectedProject}
            onStart={start}
            canStart={Boolean(selectedPinned)}
            subTextColor={subTextColor}
            buttonStyle={buttonStyle}
          />
        ) : (
          <div className="text-2xl" style={{ color: subTextColor }}>
            No pinned projects
          </div>
        )}
      </div>
    </Modal>
  );
};
