import { ActionIcon, Select, TextInput } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import {
  IconMaximize,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";

import { useTimer } from "../hooks/useTimer.ts";
import { formatSeconds } from "../utils/format.ts";
import { FullscreenTimer } from "./FullscreenTimer.tsx";
import { TagGroups } from "./TagGroups.tsx";

export const Tracker = () => {
  const timer = useTimer();
  const [fullscreen, setFullscreen] = useLocalStorage({
    key: "fullscreen",
    defaultValue: false,
    // Read synchronously so a reload opens straight into fullscreen.
    getInitialValueInEffect: false,
  });

  return (
    <div>
      <div className="flex mb-4">
        <div className="mr-2">
          <TextInput
            value={timer.description}
            onChange={(event) =>
              timer.setDescription(event.currentTarget.value)
            }
            placeholder="What are you working on?"
          />
        </div>
        <div className="mr-4">
          <Select
            searchable
            placeholder="Pick project"
            value={String(timer.selectedProject)}
            onChange={(projectId) => {
              timer.setSelectedProject(Number(projectId));
            }}
            data={timer.pinnedProjects?.map((project) => ({
              label: project.name,
              value: String(project.id),
            }))}
          />
        </div>
        <div className="mr-4">{formatSeconds(timer.seconds)}</div>
        <div>
          {timer.isRunning ? (
            <ActionIcon onClick={timer.stop} variant="filled" aria-label="Stop">
              <IconPlayerPause
                style={{ width: "70%", height: "70%" }}
                stroke={1.5}
              />
            </ActionIcon>
          ) : (
            <ActionIcon
              onClick={timer.start}
              variant="filled"
              disabled={!timer.selectedProject}
              aria-label="Start"
            >
              <IconPlayerPlay
                style={{ width: "70%", height: "70%" }}
                stroke={1.5}
              />
            </ActionIcon>
          )}
        </div>
        <div className="ml-2">
          <ActionIcon
            onClick={() => setFullscreen(true)}
            variant="default"
            disabled={!timer.isRunning && !timer.pinnedProjects?.length}
            aria-label="Fullscreen timer"
          >
            <IconMaximize
              style={{ width: "70%", height: "70%" }}
              stroke={1.5}
            />
          </ActionIcon>
        </div>
      </div>

      {timer.isRunning && (
        <div className="flex mb-4">
          <div className="mr-2">currently running project:</div>
          <div>{timer.currentProject?.name ?? "—"}</div>
        </div>
      )}

      <FullscreenTimer
        opened={fullscreen}
        onClose={() => setFullscreen(false)}
        projectName={timer.currentProject?.name}
        projectColor={timer.currentProject?.color}
        description={timer.currentTimeEntry?.description ?? undefined}
        seconds={timer.seconds}
        isRunning={timer.isRunning}
        onStop={timer.stop}
        onStart={timer.start}
        pinnedProjects={timer.pinnedProjects}
        selectedProjectId={timer.selectedProject}
        onSelectProject={timer.setSelectedProject}
      />

      <TagGroups value={timer.tagState} onChange={timer.setTagState} />
    </div>
  );
};
