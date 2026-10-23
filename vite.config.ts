import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

import { selectedTagsApi } from "./server/selected-tags.ts";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Empty prefix loads non-VITE_ vars too; the token stays server-side and is
  // added by the proxy, never shipped to the browser.
  const { TOGGL_TOKEN } = loadEnv(mode, process.cwd(), "");
  if (command === "serve" && !TOGGL_TOKEN) {
    throw new Error("TOGGL_TOKEN is not set");
  }

  return {
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/toggl": {
          target: "https://api.track.toggl.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/toggl/, ""),
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(`${TOGGL_TOKEN}:api_token`).toString("base64"),
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      // Self-signed HTTPS: browsers only expose APIs like the screen wake lock
      // on secure origins, and plain http://<lan-ip> isn't one.
      basicSsl(),
      selectedTagsApi(),
    ],
  };
});
