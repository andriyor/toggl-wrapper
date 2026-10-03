import { useMemo } from "preact/compat";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@mantine/core";

import { fetchTags } from "../api/tags.ts";
import type { Tag } from "../api/types.ts";

type Props = {
  // Tag group name -> selected tag id.
  value: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
};

// One Select per tag group; tags are named "group:value".
export const TagGroups = ({ value, onChange }: Props) => {
  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

  const grouped = useMemo(() => {
    const acc: Record<string, Tag[]> = {};
    for (const tag of tags ?? []) {
      if (!tag.name.includes(":")) continue;
      const key = tag.name.split(":")[0];
      acc[key] = [tag, ...(acc[key] ?? [])];
    }
    return acc;
  }, [tags]);

  return (
    <>
      {Object.entries(grouped).map(([key, groupTags]) => (
        <div key={key} className="mb-4">
          <Select
            placeholder={key}
            value={String(value[key])}
            onChange={(e) => {
              onChange({ ...value, [key]: Number(e) });
            }}
            data={groupTags.map((tag) => ({
              label: tag.name,
              value: String(tag.id),
            }))}
          />
        </div>
      ))}
    </>
  );
};
