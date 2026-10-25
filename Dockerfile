FROM node:24-alpine

WORKDIR /app

# pnpm is pinned via the "packageManager" field in package.json; corepack
# resolves and uses that exact version.
RUN corepack enable

# Install dependencies first so this layer is cached unless the manifest or
# lockfile change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# `vite preview` serves the built bundle (the dev server idles at ~800 MB).
# Started with node directly: a pnpm wrapper process would add ~60 MB.
# It reads TOGGL_TOKEN from the environment at startup, and the proxy from
# server.proxy forwards /toggl -> https://api.track.toggl.com.
EXPOSE 5173
CMD ["node", "node_modules/vite/bin/vite.js", "preview", "--host", "0.0.0.0", "--port", "5173"]