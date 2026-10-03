import { request } from "./base.ts";
import type { Me } from "./types.ts";

export const fetchMe = () => request<Me>("/me");
