import { headers } from "./base.ts";

export const fetchMe = async () => {
  const res = await fetch("/toggl/api/v9/me", {
    headers,
  });
  return await res.json();
};
