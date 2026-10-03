import { headers } from "./base.ts";
import type { Me } from "./types.ts";

export const fetchMe = async (): Promise<Me> => {
  const res = await fetch("/toggl/api/v9/me", {
    headers,
  });
  return await res.json();
};
