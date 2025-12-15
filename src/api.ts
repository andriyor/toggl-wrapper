import { format, subDays } from "date-fns";

const headers = {
  Authorization:
    "Basic " + btoa(`${import.meta.env.VITE_TOGGL_TOKEN}:api_token`),
  "Content-Type": "application/json",
};

export const fetchTags = async () => {
  const res = await fetch("/toggl/api/v9/me/tags", {
    headers,
  });
  return await res.json();
};

export const fetchMe = async () => {
  const res = await fetch("/toggl/api/v9/me", {
    headers,
  });
  return await res.json();
};

export const createTimeEntry = async (obj: {
  workspaceId: string;
  tagIds: string[];
}) => {
  const res = await fetch(
    `/toggl/api/v9/workspaces/${obj.workspaceId}/time_entries`,
    {
      method: "POST",
      body: JSON.stringify({
        duration: -1,
        wid: obj.workspaceId,
        created_with: "wrapper",
        start: new Date().toISOString(),
        tag_ids: obj.tagIds,
      }),
      headers,
    },
  );
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
