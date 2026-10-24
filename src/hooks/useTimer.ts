import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProjects } from "../api/projects.ts";
import { fetchSelectedTags, fetchTags, saveSelectedTags } from "../api/tags.ts";
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

  const { data: selectedTags } = useQuery({
    queryKey: ["selectedTags"],
    queryFn: fetchSelectedTags,
  });

  // Tag group name -> selected tag id. Tags are named "group:value".
  const tagState: Record<string, number> = Object.fromEntries(
    (selectedTags ?? []).map((tag) => [tag.name.split(":")[0], tag.id]),
  );

  const setTagState = (next: Record<string, number>) => {
    const ids = Object.values(next);
    const selected = (tags ?? []).filter((tag) => ids.includes(tag.id));
    queryClient.setQueryData(["selectedTags"], selected);
    saveSelectedTags(selected).catch(console.error);
  };

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

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });
  // Keep the selected project listed even when it isn't pinned (e.g. a timer
  // started elsewhere), otherwise the Select renders blank.
  const pinnedProjects = projects?.filter(
    (project) => project.pinned || project.id === selectedProject,
  );
  // Pinned first, then the rest — stable sort keeps Toggl's order within each.
  const allProjects =
    projects &&
    [...projects].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const currentProject = projects?.find(
    (project) => project.id === currentTimeEntry?.project_id,
  );
  const currentTagNames = (tags ?? [])
    .filter((tag) => currentTimeEntry?.tag_ids?.includes(tag.id))
    .map((tag) => tag.name);

  const start = () => {
    const project = projects?.find((p) => p.id === selectedProject);
    if (!project) return;
    createTimeEntry({
      description: description,
      projectId: project.id,
      // /me/projects spans workspaces; the entry must live in the project's.
      workspaceId: project.workspace_id,
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
    currentTagNames,
    pinnedProjects,
    allProjects,
    isRunning,
    seconds,
    start,
    stop,
  };
};

export type Timer = ReturnType<typeof useTimer>;
