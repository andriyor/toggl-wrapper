import { request } from "./base.ts";
import type { Project } from "./types.ts";

// All projects the user can access, across workspaces.
export const fetchProjects = () => request<Project[]>("/me/projects");
