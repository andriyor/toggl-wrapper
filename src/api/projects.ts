import { headers } from "./base.ts";
import type { Project } from "./types.ts";

export const fetchProjects = async (
  workspaceId: number,
): Promise<Project[]> => {
  const res = await fetch(`/toggl/api/v9/workspaces/${workspaceId}/projects`, {
    headers,
    method: "GET",
  });
  return await res.json();
};
