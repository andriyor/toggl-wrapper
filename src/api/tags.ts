import { request } from "./base.ts";
import type { Tag } from "./types.ts";

export const fetchTags = () => request<Tag[]>("/me/tags");

// The tag selection lives on the dev server (vite.config.ts), shared by all
// devices.
const selectedTags = async (init?: RequestInit): Promise<Tag[]> => {
  const res = await fetch("/api/selected-tags", init);
  if (!res.ok) throw new Error(`selected-tags ${res.status}`);
  return res.json();
};

export const fetchSelectedTags = () => selectedTags();

export const saveSelectedTags = (tags: Tag[]) =>
  selectedTags({
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tags),
  });
