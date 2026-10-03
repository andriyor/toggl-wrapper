import { format, subDays } from "date-fns";
import { request } from "./base.ts";
import type { TimeEntry } from "./types.ts";

export const createTimeEntry = (timeEntry: {
  workspaceId: number;
  projectId: number;
  description?: string;
  tagIds: number[];
}) =>
  request<TimeEntry>(`/workspaces/${timeEntry.workspaceId}/time_entries`, {
    method: "POST",
    body: JSON.stringify({
      duration: -1,
      wid: timeEntry.workspaceId,
      description: timeEntry.description,
      created_with: "wrapper",
      start: new Date().toISOString(),
      tag_ids: timeEntry.tagIds,
      project_id: timeEntry.projectId,
    }),
  });

// Running entry, or null when nothing is running.
export const fetchCurrentTimeEntry = () =>
  request<TimeEntry | null>("/me/time_entries/current");

export const fetchTimeEntries = () => {
  const currentDay = new Date();
  const startDay = subDays(currentDay, 1);
  const searchParams = new URLSearchParams({
    start_date: format(startDay, "yyyy-MM-dd"),
    end_date: format(currentDay, "yyyy-MM-dd"),
  });
  return request<TimeEntry[]>(`/me/time_entries?${searchParams}`);
};

export const stopTimeEntry = ({
  timeEntryId,
  workspaceId,
}: {
  timeEntryId: number;
  workspaceId: number;
}) =>
  request<TimeEntry>(
    `/workspaces/${workspaceId}/time_entries/${timeEntryId}/stop`,
    { method: "PATCH" },
  );
