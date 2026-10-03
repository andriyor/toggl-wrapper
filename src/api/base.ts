const headers = {
  Authorization:
    "Basic " + btoa(`${import.meta.env.VITE_TOGGL_TOKEN}:api_token`),
  "Content-Type": "application/json",
};

// Throws on non-2xx so React Query sees a real error instead of an error body
// typed as T.
export const request = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const res = await fetch(`/toggl/api/v9${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`Toggl ${res.status}: ${await res.text()}`);
  return res.json();
};
