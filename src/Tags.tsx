import { useMemo, useState } from "preact/compat";
import { useQuery } from "@tanstack/react-query";
import { ActionIcon, Select } from "@mantine/core";
import { useInterval, useLocalStorage } from "@mantine/hooks";
import { addSeconds, format, startOfDay } from "date-fns";
import { IconPlayerPlay, IconPlayerPause } from "@tabler/icons-react";

import { fetchMe } from "./api/me.ts";
import { fetchProjects } from "./api/projects.ts";
import {
  createTimeEntry,
  fetchTimeEntries,
  stopTimeEntry,
} from "./api/time-entries.ts";
import { fetchTags } from "./api/tags.ts";

export const formatSeconds = (seconds: number) => {
  const date = addSeconds(startOfDay(new Date()), seconds);
  return format(date, "HH:mm:ss");
};

export const Tags = () => {
  const [selectedProject, setselectedProject] = useState<number>();
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
  console.log("timeEntries", timeEntries);
  const [currentTimeEntry, setCurrentTimeEntry] = useState();
  const [seconds, setSeconds] = useState<number>(0);
  const interval = useInterval(() => setSeconds((s) => s + 1), 1000);

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
  console.log("projects", projects);

  console.log("me", me);

  console.log("data", tags);
  console.log("!isFetched", isFetched);

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

  console.log("grouped", grouped);
  console.log("tagState", tagState);

  const handleStart = () => {
    interval.start();
    createTimeEntry({
      projectId: selectedProject!,
      workspaceId: me.default_workspace_id,
      tagIds: Object.values(tagState),
    }).then((res) => setCurrentTimeEntry(res));
  };

  const handleStop = () => {
    interval.stop();
    setSeconds(0);
    stopTimeEntry({
      workspaceId: me.default_workspace_id,
      timeEntryId: currentTimeEntry.id,
    });
  };

  return (
    <div>
      <div className="flex mb-4">
        <div className="mr-4">
          <Select
            searchable
            placeholder="Pick project"
            value={String(selectedProject)}
            onChange={(projectId) => {
              setselectedProject(Number(projectId));
            }}
            data={pinnedProjects?.map((project: any) => {
              return { label: project.name, value: String(project.id) };
            })}
          />
        </div>
        <div className="mr-4">{formatSeconds(seconds)}</div>
        <div>
          {interval.active ? (
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
      </div>

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
