import { headers } from "./base.ts";

export const fetchTags = async () => {
  const res = await fetch("/toggl/api/v9/me/tags", {
    headers,
  });
  return await res.json();
};
