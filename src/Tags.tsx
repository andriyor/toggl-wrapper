import { useEffect, useMemo, useState } from "preact/compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActionIcon, Select, TextInput } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import {
  IconMaximize,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";

import { fetchMe } from "./api/me.ts";
import { fetchProjects } from "./api/projects.ts";
import {
  createTimeEntry,
  fetchCurrentTimeEntry,
  fetchTimeEntries,
  stopTimeEntry,
} from "./api/time-entries.ts";
import { fetchTags } from "./api/tags.ts";
import { formatSeconds } from "./utils/format.ts";
import { FullscreenTimer } from "./components/FullscreenTimer.tsx";

export const Tags = () => {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState<number>();
  const [tagState, setTagState] = useLocalStorage({
    key: "tagsState",
    defaultValue: "",
  });
  const { data: tags, isFetched } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });
  const { data: timeEntries } = useQuery({
    queryKey: ["timeEntries"],
    queryFn: fetchTimeEntries,
  });
  const { data: currentTimeEntry } = useQuery({
    queryKey: ["currentTimeEntry"],
    queryFn: fetchCurrentTimeEntry,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });
  
  const isRunning = Boolean(currentTimeEntry);
  const [now, setNow] = useState(() => Date.now());
  
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);
  
  const seconds =
    isRunning && currentTimeEntry?.start
      ? Math.max(
          0,
          Math.floor((now - new Date(currentTimeEntry.start).getTime()) / 1000),
        )
      : 0;

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(me.default_workspace_id),
    enabled: Boolean(me?.default_workspace_id),
  });
  const pinnedProjects = projects?.filter((project: any) => project.pinned);
  const currentProject = projects?.find(
    (project: any) => project.id === currentTimeEntry?.project_id,
  );
  const [fullscreen, setFullscreen] = useState(false);

  const grouped = useMemo(() => {
    if (isFetched) {
      const withColon = tags.filter((tag: any) => tag.name.includes(":"));
      const grouped = withColon.reduce((acc: any, tag: any) => {
        const key = tag.name.split(":")[0];
        if (acc[key]) {
          acc[key] = [tag, ...acc[key]];
        } else {
          acc[key] = [tag];
        }
        return acc;
      }, {});
      return grouped;
    }
    return {};
  }, [tags, isFetched]);

  const handleStart = () => {
    createTimeEntry({
      description: description,
      projectId: selectedProject!,
      workspaceId: me.default_workspace_id,
      tagIds: Object.values(tagState),
    }).then((res) => {
      queryClient.setQueryData(["currentTimeEntry"], res);
    });
  };

  const handleStop = () => {
    if (!currentTimeEntry) return;
    stopTimeEntry({
      workspaceId: me.default_workspace_id,
      timeEntryId: currentTimeEntry.id,
    }).then(() => {
      queryClient.setQueryData(["currentTimeEntry"], null);
    });
  };

  return (
    <div>
      <div className="flex mb-4">
        <div className="mr-2">
          <TextInput
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
            placeholder="What are you working on?"
          />
        </div>
        <div className="mr-4">
          <Select
            searchable
            placeholder="Pick project"
            value={String(selectedProject)}
            onChange={(projectId) => {
              setSelectedProject(Number(projectId));
            }}
            data={pinnedProjects?.map((project: any) => {
              return { label: project.name, value: String(project.id) };
            })}
          />
        </div>
        <div className="mr-4">{formatSeconds(seconds)}</div>
        <div>
          {isRunning ? (
            <ActionIcon
              onClick={handleStop}
              variant="filled"
              aria-label="Settings"
            >
              <IconPlayerPause
                style={{ width: "70%", height: "70%" }}
                stroke={1.5}
              />
            </ActionIcon>
          ) : (
            <ActionIcon
              onClick={handleStart}
              variant="filled"
              disabled={!Boolean(selectedProject)}
              aria-label="Settings"
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
            disabled={!isRunning}
            aria-label="Fullscreen timer"
          >
            <IconMaximize
              style={{ width: "70%", height: "70%" }}
              stroke={1.5}
            />
          </ActionIcon>
        </div>
      </div>

      {isRunning && (
        <div className="flex mb-4">
          <div className="mr-2">currently running project:</div>
          <div>{currentProject?.name ?? "—"}</div>
        </div>
      )}

      <FullscreenTimer
        opened={fullscreen}
        onClose={() => setFullscreen(false)}
        projectName={currentProject?.name}
        projectColor={currentProject?.color}
        description={currentTimeEntry?.description}
        seconds={seconds}
        isRunning={isRunning}
        onStop={handleStop}
      />
      

      {Object.entries(grouped).map(([key, value]) => {
        return (
          <div className="mb-4">
            <Select
              // label={key}
              placeholder={key}
              value={String(tagState[key])}
              onChange={(e, option) => {
                console.log("e", e);
                setTagState({ ...tagState, [key]: Number(e) });
              }}
              data={value?.map((tag: any) => {
                return { label: tag.name, value: String(tag.id) };
              })}
              // styles={{ root: {} }}
            />
          </div>
        );
      })}
    </div>
  );
};
