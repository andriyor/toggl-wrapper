import { useEffect, useRef } from "preact/compat";
import { ActionIcon } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";

import type { Project } from "../api/types.ts";
import type { ButtonStyle } from "./FullscreenTimer.tsx";

type Props = {
  opened: boolean;
  projects: Project[];
  selectedId?: number;
  onSelect: (id: number) => void;
  onStart: () => void;
  canStart: boolean;
  subTextColor: string;
  buttonStyle: ButtonStyle;
};

// Fullscreen body while idle: pick a pinned project and start it.
export const ProjectPicker = ({
  opened,
  projects,
  selectedId,
  onSelect,
  onStart,
  canStart,
  subTextColor,
  buttonStyle,
}: Props) => {
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  // Keep the highlighted project visible when arrowing through a long,
  // scrollable list.
  useEffect(() => {
    if (!opened) return;
    activeButtonRef.current?.scrollIntoView({ block: "nearest" });
  }, [opened, selectedId]);

  return (
    <>
      <div className="flex flex-col items-center gap-3 max-h-[40dvh] max-w-full overflow-y-auto px-2 [scrollbar-width:none]">
        {projects.map((project) => {
          const active = project.id === selectedId;
          return (
            <button
              key={project.id}
              ref={active ? activeButtonRef : undefined}
              type="button"
              onClick={() => onSelect(project.id)}
              className="text-xl sm:text-3xl px-4 sm:px-6 py-2 rounded transition-opacity max-w-full break-words"
              style={{
                color: "inherit",
                opacity: active ? 1 : 0.5,
                fontWeight: active ? 700 : 400,
                border: `2px solid ${active ? "currentColor" : "transparent"}`,
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
        disabled={!canStart}
        aria-label="Start"
      >
        <IconPlayerPlay style={{ width: "70%", height: "70%" }} stroke={1.5} />
      </ActionIcon>
      <div className="hidden sm:block text-lg" style={{ color: subTextColor }}>
        ↑ / ↓ to pick · Enter to start
      </div>
    </>
  );
};
