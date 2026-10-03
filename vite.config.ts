import { defineConfig, loadEnv } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

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
    plugins: [preact(), tailwindcss()],
  };
});
