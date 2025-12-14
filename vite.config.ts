import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/toggl": {
        target: "https://api.track.toggl.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/toggl/, ""),
      },
    },
  },
  plugins: [preact(), tailwindcss()],
});
