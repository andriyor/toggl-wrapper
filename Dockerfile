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

# Vite dev server. It reads VITE_TOGGL_TOKEN from the environment at startup,
# and its built-in proxy forwards /toggl -> https://api.track.toggl.com.
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5173"]