import { useMemo } from "preact/compat";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";

console.log("import.meta.env.VITE_TOGGL_TOKEN", import.meta.env);

const headers = {
  Authorization:
    "Basic " + btoa(`${import.meta.env.VITE_TOGGL_TOKEN}:api_token`),
  "Content-Type": "application/json",
};

const fetchTags = async () => {
  const res = await fetch("/toggl/api/v9/me/tags", {
    headers,
  });
  return await res.json();
};

const fetchMe = async () => {
  const res = await fetch("/toggl/api/v9/me", {
    headers,
  });
  return await res.json();
};

const createTimeEntry = async (obj: {
  workspaceId: string;
  tagIds: string[];
}) => {
  return fetch(`/toggl/api/v9/workspaces/${obj.workspaceId}/time_entries`, {
    method: "POST",
    body: JSON.stringify({
      duration: -1,
      wid: obj.workspaceId,
      created_with: "wrapper",
      start: new Date().toISOString(),
      tag_ids: obj.tagIds,
    }),
    headers,
  });
};

export const Tags = () => {
  const [tagState, setTagState] = useLocalStorage({
    key: "tagsState",
    defaultValue: "",
  });
  const { data, isFetched } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTags,
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  console.log("me", me);

  console.log("data", data);
  console.log("!isFetched", isFetched);

  const grouped = useMemo(() => {
    if (isFetched) {
      const withColon = data.filter((tag: any) => tag.name.includes(":"));
      console.log("filtered", withColon);
      const grouped = withColon.reduce((acc: any, tag: any) => {
        const key = tag.name.split(":")[0];
        if (acc[key]) {
          acc[key] = [tag, ...acc[key]];
        } else {
          acc[key] = [tag];
        }
        return acc;
      }, {});
      return grouped;
    }
    return {};
  }, [data, isFetched]);

  console.log("grouped", grouped);
  console.log("tagState", tagState);

  const handleStart = () => {
    createTimeEntry({
      workspaceId: me.default_workspace_id,
      tagIds: Object.values(tagState),
    });
  };

  return (
    <div>
      {Object.entries(grouped).map(([key, value]) => {
        console.log("value", tagState[key]);
        return (
          <Select
            label={key}
            placeholder="Pick value"
            value={String(tagState[key])}
            onChange={(e, option) => {
              console.log("e", e);
              setTagState({ ...tagState, [key]: Number(e) });
            }}
            data={value?.map((tag: any) => {
              return { label: tag.name, value: String(tag.id) };
            })}
          />
        );
      })}
      <button onClick={handleStart}>start</button>
    </div>
  );
};
