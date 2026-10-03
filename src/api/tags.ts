import { headers } from "./base.ts";
import type { Tag } from "./types.ts";

export const fetchTags = async (): Promise<Tag[]> => {
  const res = await fetch("/toggl/api/v9/me/tags", {
    headers,
  });
  return await res.json();
};
