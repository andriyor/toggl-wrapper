import { headers } from "./base.ts";

export const fetchProjects = async (workspaceId: number) => {
  const res = await fetch(`/toggl/api/v9/workspaces/${workspaceId}/projects`, {
    headers,
    method: "GET",
  });
  return await res.json();
};
