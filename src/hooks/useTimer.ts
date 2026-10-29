import { useCallback, useEffect, useState } from "react";
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

  const setTagState = useCallback(
    (next: Record<string, number>) => {
      const ids = new Set(Object.values(next));
      const selected = (tags ?? []).filter((tag) => ids.has(tag.id));
      queryClient.setQueryData(["selectedTags"], selected);
      saveSelectedTags(selected).catch(console.error);
    },
    [tags, queryClient],
  );

  const isRunning = Boolean(currentTimeEntry);

  // Plain values so the effects re-run only when the entry's data actually
  // changes (including edits made elsewhere), not on every refetch.
  const entryId = currentTimeEntry?.id;
  const entryProjectId = currentTimeEntry?.project_id;
  const entryDescription = currentTimeEntry?.description;
  const entryTagIds = currentTimeEntry?.tag_ids;

  // Reflect a running entry (possibly started elsewhere) in the inputs.
  useEffect(() => {
    if (entryId === undefined) return;
    setSelectedProject(entryProjectId ?? undefined);
    setDescription(entryDescription ?? "");
  }, [entryId, entryProjectId, entryDescription]);

  // Tags are "group:value"; map the entry's tag_ids back to group -> id.
  useEffect(() => {
    if (entryId === undefined || !tags) return;
    const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
    const next: Record<string, number> = {};
    for (const id of entryTagIds ?? []) {
      const tag = tagsById.get(id);
      if (tag?.name.includes(":")) next[tag.name.split(":")[0]] = tag.id;
    }
    setTagState(next);
  }, [entryId, entryTagIds, tags, setTagState]);
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
  const entryTagIdSet = new Set(entryTagIds);
  const currentTagNames = (tags ?? [])
    .filter((tag) => entryTagIdSet.has(tag.id))
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
