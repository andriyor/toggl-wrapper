import { useEffect, useRef } from "preact/compat";
import { ActionIcon, Modal } from "@mantine/core";
import { IconPlayerPause } from "@tabler/icons-react";

import { formatSeconds } from "../utils/format.ts";

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
  pinnedProjects?: any[];
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
      padding={0}
      styles={{
        content: { backgroundColor: displayColor ?? undefined },
        body: { height: "100vh" },
      }}
    >
      <div
        className="flex flex-col items-center justify-center h-screen gap-8"
        style={{ color: textColor }}
      >
        <div className="text-4xl" style={{ color: subTextColor }}>
          {displayName}
        </div>
        {isRunning && description && (
          <div className="text-2xl" style={{ color: subTextColor }}>
            {description}
          </div>
        )}

        {isRunning ? (
          <>
            <div
              className="font-mono tabular-nums leading-none"
              style={{ fontSize: "12rem" }}
            >
              {formatSeconds(seconds)}
            </div>
            <ActionIcon
              onClick={onStop}
              variant="filled"
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
            <div className="flex flex-col items-center gap-3 max-h-[40vh] overflow-y-auto px-2">
              {pinnedProjects.map((project) => {
                const active = project.id === selectedProjectId;
                return (
                  <button
                    key={project.id}
                    ref={active ? activeButtonRef : undefined}
                    type="button"
                    onClick={() => onSelectProject(project.id)}
                    className="text-3xl px-6 py-2 rounded transition-opacity"
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
            <div className="text-lg" style={{ color: subTextColor }}>
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
