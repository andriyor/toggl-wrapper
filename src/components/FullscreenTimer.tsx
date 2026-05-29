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
}: Props) => {
  const onDark = isDarkColor(projectColor);
  const textColor = onDark ? "#fff" : "#111";
  const subTextColor = onDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)";
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      withCloseButton
      padding={0}
      styles={{
        content: { backgroundColor: projectColor ?? undefined },
        body: { height: "100vh" },
      }}
    >
      <div
        className="flex flex-col items-center justify-center h-screen gap-8"
        style={{ color: textColor }}
      >
        <div className="text-4xl" style={{ color: subTextColor }}>
          {projectName ?? "No project"}
        </div>
        {description && (
          <div className="text-2xl" style={{ color: subTextColor }}>
            {description}
          </div>
        )}
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
          disabled={!isRunning}
        >
          <IconPlayerPause
            style={{ width: "70%", height: "70%" }}
            stroke={1.5}
          />
        </ActionIcon>
      </div>
    </Modal>
  );
};
