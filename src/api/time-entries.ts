import { format, subDays } from "date-fns";
import { headers } from "./base";

export const createTimeEntry = async (timeEntry: {
  workspaceId: string;
  projectId: number;
  tagIds: string[];
}) => {
  const res = await fetch(
    `/toggl/api/v9/workspaces/${timeEntry.workspaceId}/time_entries`,
    {
      method: "POST",
      body: JSON.stringify({
        duration: -1,
        wid: timeEntry.workspaceId,
        created_with: "wrapper",
        start: new Date().toISOString(),
        tag_ids: timeEntry.tagIds,
        project_id: timeEntry.projectId,
      }),
      headers,
    },
  );
  return await res.json();
};

export const fetchTimeEntries = async () => {
  const currentDay = new Date();
  const startDay = subDays(currentDay, 1);
  const paramsObj = {
    start_date: format(startDay, "yyyy-MM-dd"),
    end_date: format(currentDay, "yyyy-MM-dd"),
  };
  const searchParams = new URLSearchParams(paramsObj);
  const res = await fetch(`/toggl/api/v9/me/time_entries?${searchParams}`, {
    headers,
    method: "GET",
  });
  return await res.json();
};

export const stopTimeEntry = async ({
  timeEntryId,
  workspaceId,
}: {
  timeEntryId: number;
  workspaceId: number;
}) => {
  const res = await fetch(
    `/toggl/api/v9/workspaces/${workspaceId}/time_entries/${timeEntryId}/stop`,
    {
      method: "PATCH",
      headers,
    },
  );
  return await res.json();
};
