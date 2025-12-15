export const headers = {
  Authorization:
    "Basic " + btoa(`${import.meta.env.VITE_TOGGL_TOKEN}:api_token`),
  "Content-Type": "application/json",
};
