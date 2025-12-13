import "./app.css";
import { QueryClient } from "@tanstack/react-query";
import { Tags } from "./Tags.tsx";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createTheme, MantineProvider } from "@mantine/core";

const asyncStoragePersister = createAsyncStoragePersister({
  storage: window.localStorage,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 6, // 6 hours
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const theme = createTheme({});

export function App() {
  return (
    <MantineProvider theme={theme}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <Tags />
      </PersistQueryClientProvider>
    </MantineProvider>
  );
}
