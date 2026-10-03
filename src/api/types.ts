// Hand-written Toggl Track API v9 response shapes — only the fields this app
// reads. See https://engineering.toggl.com/docs/track/ for the full models.

export type Me = {
  id: number;
  email: string;
  fullname: string;
  default_workspace_id: number;
};

export type Project = {
  id: number;
  workspace_id: number;
  name: string;
  color: string;
  active: boolean;
  pinned: boolean;
};

export type Tag = {
  id: number;
  workspace_id: number;
  name: string;
};

export type TimeEntry = {
  id: number;
  workspace_id: number;
  project_id: number | null;
  description: string | null;
  /** ISO 8601 */
  start: string;
  /** ISO 8601, null while running */
  stop: string | null;
  /** Seconds; negative while running */
  duration: number;
  tag_ids: number[] | null;
};
