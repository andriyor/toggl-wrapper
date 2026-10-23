import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";

const FILE = "data/selected-tags.json";
const MAX_BODY = 100_000;

const load = (): unknown[] => {
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    return []; // No file yet (first run).
  }
};

const save = (tags: unknown[]) => {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(tags, null, 2));
};

// Null when the body is too large.
const readBody = async (req: IncomingMessage) => {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY) return null;
  }
  return body;
};

// GET /api/selected-tags returns the tags picked in the UI; the frontend PUTs
// them on every change. Saved to a file so it survives restarts.
export const selectedTagsApi = (): Plugin => ({
  name: "selected-tags-api",
  apply: "serve",
  configureServer(server) {
    let selected = load();

    server.middlewares.use("/api/selected-tags", async (req, res) => {
      res.setHeader("Content-Type", "application/json");
      const send = () => res.end(JSON.stringify(selected));

      if (req.method === "GET") return void send();
      if (req.method !== "PUT") return void res.writeHead(405).end();

      const body = await readBody(req);
      if (body === null) return void res.writeHead(413).end();
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        return void res.writeHead(400).end();
      }
      if (!Array.isArray(parsed)) return void res.writeHead(400).end();

      selected = parsed;
      save(selected);
      send();
    });
  },
});
