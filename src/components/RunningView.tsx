import { ActionIcon } from "@mantine/core";
import { IconPlayerPause } from "@tabler/icons-react";

import { formatSeconds } from "../utils/format.ts";
import type { Timer } from "../hooks/useTimer.ts";
import type { ButtonStyle } from "./FullscreenTimer.tsx";

type Props = {
  timer: Timer;
  subTextColor: string;
  buttonStyle: ButtonStyle;
};

// Fullscreen body while a timer runs: description, clock, stop, tags.
export const RunningView = ({ timer, subTextColor, buttonStyle }: Props) => {
  const description = timer.currentTimeEntry?.description;
  return (
    <>
      {description && (
        <div
          className="text-lg sm:text-2xl break-words max-w-full"
          style={{ color: subTextColor }}
        >
          {description}
        </div>
      )}
      <div
        className="font-mono tabular-nums leading-none"
        // 8 monospace chars ≈ 4.8em, so 18vw keeps it within the viewport.
        style={{ fontSize: "clamp(3rem, 18vw, 12rem)" }}
      >
        {formatSeconds(timer.seconds)}
      </div>
      <ActionIcon
        onClick={timer.stop}
        variant="filled"
        style={buttonStyle}
        size="xl"
        aria-label="Stop"
      >
        <IconPlayerPause style={{ width: "70%", height: "70%" }} stroke={1.5} />
      </ActionIcon>
      {timer.currentTagNames.length > 0 && (
        <div
          className="text-lg sm:text-2xl break-words max-w-full"
          style={{ color: subTextColor }}
        >
          {timer.currentTagNames.map((name) => (
            <div key={name}>{name}</div>
          ))}
        </div>
      )}
    </>
  );
};
