import { request } from "./base.ts";
import type { Tag } from "./types.ts";

export const fetchTags = () => request<Tag[]>("/me/tags");
