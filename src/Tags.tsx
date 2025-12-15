import { useMemo, useState } from "preact/compat";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@mantine/core";
import { useInterval, useLocalStorage } from "@mantine/hooks";

import {
  createTimeEntry,
  fetchMe,
  fetchProjects,
  fetchTags,
  fetchTimeEntries,
  stopTimeEntry,
} from "./api.ts";

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
  const [currentTimeEntry, setCurrentTimeEntry] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const interval = useInterval(() => setSeconds((s) => s + 1), 1000);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });
  const { data: projects } = useQuery({
    queryKey: ["myProjects"],
    queryFn: () => fetchProjects(me.default_workspace_id),
    enabled: Boolean(me?.default_workspace_id),
  });
  const pinnedProjects = projects.filter((project: any) => project.pinned);
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
      <div className="flex">
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
        <div className="mr-4">{seconds}</div>
        <div>
          {interval.active ? (
            <button onClick={handleStop}>stop</button>
          ) : (
            <button onClick={handleStart}>start</button>
          )}
        </div>
      </div>

      {Object.entries(grouped).map(([key, value]) => {
        return (
          <Select
            label={key}
            placeholder="Pick value"
            value={String(tagState[key])}
            onChange={(e, option) => {
              console.log("e", e);
              setTagState({ ...tagState, [key]: Number(e) });
            }}
            data={value?.map((tag: any) => {
              return { label: tag.name, value: String(tag.id) };
            })}
          />
        );
      })}
    </div>
  );
};
