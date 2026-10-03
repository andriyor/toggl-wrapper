import { request } from "./base.ts";
import type { Project } from "./types.ts";

export const fetchProjects = (workspaceId: number) =>
  request<Project[]>(`/workspaces/${workspaceId}/projects`);
