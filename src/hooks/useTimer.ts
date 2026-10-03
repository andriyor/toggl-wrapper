import { useEffect, useState } from "preact/compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalStorage } from "@mantine/hooks";

import { fetchMe } from "../api/me.ts";
import { fetchProjects } from "../api/projects.ts";
import { fetchTags } from "../api/tags.ts";
import {
  createTimeEntry,
  fetchCurrentTimeEntry,
  stopTimeEntry,
} from "../api/time-entries.ts";

// Owns the running time entry, the inputs for the next one, and start/stop.
export const useTimer = () => {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState<number>();
  // Tag group name -> selected tag id.
  const [tagState, setTagState] = useLocalStorage<Record<string, number>>({
    key: "tagsState",
    defaultValue: {},
  });
  const { data: currentTimeEntry } = useQuery({
    queryKey: ["currentTimeEntry"],
    queryFn: fetchCurrentTimeEntry,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

  const isRunning = Boolean(currentTimeEntry);

  // Reflect a running entry (possibly started elsewhere) in the inputs.
  useEffect(() => {
    if (!currentTimeEntry) return;
    setSelectedProject(currentTimeEntry.project_id ?? undefined);
    setDescription(currentTimeEntry.description ?? "");
  }, [currentTimeEntry?.id]);

  // Tags are "group:value"; map the entry's tag_ids back to group -> id.
  useEffect(() => {
    if (!currentTimeEntry || !tags) return;
    const next: Record<string, number> = {};
    for (const id of currentTimeEntry.tag_ids ?? []) {
      const tag = tags.find((t) => t.id === id);
      if (tag?.name.includes(":")) next[tag.name.split(":")[0]] = tag.id;
    }
    setTagState(next);
  }, [currentTimeEntry?.id, tags]);
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
    queryFn: () => fetchProjects(me!.default_workspace_id),
    enabled: Boolean(me?.default_workspace_id),
  });
  // Keep the selected project listed even when it isn't pinned (e.g. a timer
  // started elsewhere), otherwise the Select renders blank.
  const pinnedProjects = projects?.filter(
    (project) => project.pinned || project.id === selectedProject,
  );
  const currentProject = projects?.find(
    (project) => project.id === currentTimeEntry?.project_id,
  );

  const start = () => {
    if (!me || !selectedProject) return;
    createTimeEntry({
      description: description,
      projectId: selectedProject,
      workspaceId: me.default_workspace_id,
      tagIds: Object.values(tagState),
    }).then((res) => {
      queryClient.setQueryData(["currentTimeEntry"], res);
    });
  };

  const stop = () => {
    if (!currentTimeEntry) return;
    stopTimeEntry({
      // The entry's own workspace — it may have been started elsewhere.
      workspaceId: currentTimeEntry.workspace_id,
      timeEntryId: currentTimeEntry.id,
    }).then(() => {
      queryClient.setQueryData(["currentTimeEntry"], null);
    });
  };

  return {
    description,
    setDescription,
    selectedProject,
    setSelectedProject,
    tagState,
    setTagState,
    currentTimeEntry,
    currentProject,
    pinnedProjects,
    isRunning,
    seconds,
    start,
    stop,
  };
};
