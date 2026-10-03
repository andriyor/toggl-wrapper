import { useEffect, useRef } from "preact/compat";
import { ActionIcon, Modal } from "@mantine/core";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";

import { formatSeconds } from "../utils/format.ts";
import type { Project } from "../api/types.ts";

type Props = {
  opened: boolean;
  onClose: () => void;
  projectName?: string;
  projectColor?: string;
  description?: string;
  seconds: number;
  isRunning: boolean;
  onStop: () => void;
  onStart: () => void;
  pinnedProjects?: Project[];
  selectedProjectId?: number;
  onSelectProject: (id: number) => void;
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

export const FullscreenTimer = ({
  opened,
  onClose,
  projectName,
  projectColor,
  description,
  seconds,
  isRunning,
  onStop,
  onStart,
  pinnedProjects = [],
  selectedProjectId,
  onSelectProject,
}: Props) => {
  const selectedIndex = pinnedProjects.findIndex(
    (project) => project.id === selectedProjectId,
  );
  const selectedPinned = pinnedProjects[selectedIndex];
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  // While idle, the background reflects the highlighted pinned project so the
  // selection is obvious even before starting.
  const displayColor = isRunning ? projectColor : selectedPinned?.color;
  const displayName = isRunning
    ? (projectName ?? "No project")
    : (selectedPinned?.name ?? "Pick a project");

  const onDark = isDarkColor(displayColor);
  const textColor = "#111";
  const subTextColor = onDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)";
  // Shared by close / start / stop so they read as one set on any project colour.
  const buttonStyle = {
    color: onDark ? "#fff" : "#111",
    backgroundColor: onDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.5)",
  };

  // Tint the browser chrome (tab strip / mobile address bar) and the page
  // background, which shows behind the phone's bottom gesture bar.
  useEffect(() => {
    if (!opened || !displayColor) return;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    const html = document.documentElement;
    const previous = { meta: meta?.content, bg: html.style.backgroundColor };
    if (meta) meta.content = displayColor;
    html.style.backgroundColor = displayColor;
    return () => {
      if (meta && previous.meta) meta.content = previous.meta;
      html.style.backgroundColor = previous.bg;
    };
  }, [opened, displayColor]);

  // Keep the highlighted project visible when arrowing through a long,
  // scrollable list.
  useEffect(() => {
    if (!opened || isRunning) return;
    activeButtonRef.current?.scrollIntoView({ block: "nearest" });
  }, [opened, isRunning, selectedProjectId]);

  // Default the highlight to the first pinned project when opening idle with no
  // current selection, so Enter has something to start.
  useEffect(() => {
    if (!opened || isRunning) return;
    if (selectedIndex === -1 && pinnedProjects.length > 0) {
      onSelectProject(pinnedProjects[0].id);
    }
  }, [opened, isRunning, selectedIndex, pinnedProjects, onSelectProject]);

  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (isRunning) {
          onStop();
        } else if (selectedPinned) {
          onStart();
        }
        return;
      }

      // Arrow navigation only matters while idle (running has nothing to pick).
      if (isRunning || pinnedProjects.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const base = selectedIndex === -1 ? -1 : selectedIndex;
        const next = (base + 1 + pinnedProjects.length) % pinnedProjects.length;
        onSelectProject(pinnedProjects[next].id);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const base = selectedIndex === -1 ? 0 : selectedIndex;
        const next = (base - 1 + pinnedProjects.length) % pinnedProjects.length;
        onSelectProject(pinnedProjects[next].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    opened,
    isRunning,
    selectedIndex,
    selectedPinned,
    pinnedProjects,
    onStart,
    onStop,
    onSelectProject,
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
      <div
        className="flex flex-col items-center justify-center h-full gap-6 sm:gap-8 px-4 text-center"
        style={{ color: textColor }}
      >
        <div
          className="text-2xl sm:text-4xl break-words max-w-full"
          style={{ color: subTextColor }}
        >
          {displayName}
        </div>
        {isRunning && description && (
          <div
            className="text-lg sm:text-2xl break-words max-w-full"
            style={{ color: subTextColor }}
          >
            {description}
          </div>
        )}

        {isRunning ? (
          <>
            <div
              className="font-mono tabular-nums leading-none"
              // 8 monospace chars ≈ 4.8em, so 18vw keeps it within the viewport.
              style={{ fontSize: "clamp(3rem, 18vw, 12rem)" }}
            >
              {formatSeconds(seconds)}
            </div>
            <ActionIcon
              onClick={onStop}
              variant="filled"
              style={buttonStyle}
              size="xl"
              aria-label="Stop"
            >
              <IconPlayerPause
                style={{ width: "70%", height: "70%" }}
                stroke={1.5}
              />
            </ActionIcon>
          </>
        ) : pinnedProjects.length > 0 ? (
          <>
            <div className="flex flex-col items-center gap-3 max-h-[40dvh] max-w-full overflow-y-auto px-2 [scrollbar-width:none]">
              {pinnedProjects.map((project) => {
                const active = project.id === selectedProjectId;
                return (
                  <button
                    key={project.id}
                    ref={active ? activeButtonRef : undefined}
                    type="button"
                    onClick={() => onSelectProject(project.id)}
                    className="text-xl sm:text-3xl px-4 sm:px-6 py-2 rounded transition-opacity max-w-full break-words"
                    style={{
                      color: textColor,
                      opacity: active ? 1 : 0.5,
                      fontWeight: active ? 700 : 400,
                      border: active
                        ? `2px solid ${textColor}`
                        : "2px solid transparent",
                    }}
                  >
                    {project.name}
                  </button>
                );
              })}
            </div>
            {/* Touch devices have no Enter key, so offer a start button too. */}
            <ActionIcon
              onClick={onStart}
              variant="filled"
              style={buttonStyle}
              size="xl"
              disabled={!selectedPinned}
              aria-label="Start"
            >
              <IconPlayerPlay
                style={{ width: "70%", height: "70%" }}
                stroke={1.5}
              />
            </ActionIcon>
            <div
              className="hidden sm:block text-lg"
              style={{ color: subTextColor }}
            >
              ↑ / ↓ to pick · Enter to start
            </div>
          </>
        ) : (
          <div className="text-2xl" style={{ color: subTextColor }}>
            No pinned projects
          </div>
        )}
      </div>
    </Modal>
  );
};
