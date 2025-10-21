import { useRef } from "react";
import {
  Paper,
  Stack,
  Divider,
  Text,
  Group,
  Checkbox,
  ActionIcon,
  Button,
  useMantineTheme,
  useComputedColorScheme,
  alpha,
} from "@mantine/core";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import TaskTitlePopover from "./TaskTitlePopover";
import type { Todo } from "../types";

type Props = {
  title?: string;
  todos: Todo[];
  draft: string;
  onDraftChange: (v: string) => void;
  onAdd: () => void;
  onToggle: (t: Todo) => void;
  onDelete: (t: Todo) => void;

  listId?: string | number; 
  getItemId?: (t: Todo) => string | number;
};

export default function NotepadBoard({
  title = "Notepad",
  todos,
  draft,
  onDraftChange,
  onAdd,
  onToggle,
  onDelete,
  listId = "notepad",
  getItemId = (t) => `todo-${t.id}`,
}: Props) {
  const theme = useMantineTheme();
  const scheme = useComputedColorScheme("light");
  const inputRef = useRef<HTMLInputElement>(null);
  const dark = scheme === "dark";

  return (
    <Paper
      radius="lg"
      p="lg"
      shadow="md"
      withBorder
      style={{
        width: "100%",
        background: dark
          ? alpha(theme.colors.dark[6], 0.7)
          : "var(--mantine-color-gray-0)",
        border: dark
          ? `1px solid ${alpha(theme.colors.dark[4], 0.9)}`
          : `1px solid ${theme.colors.gray[3]}`,
        display: "flex",
        flexDirection: "column",
        minHeight: 480,
      }}
      data-drop-id={listId}
      aria-label={`${title} board`}
    >
      <Divider
        label={
          <Text
            fw={800}
            tt="uppercase"
            size="sm"
            c={dark ? "gray.2" : "dark.9"}
            ta="center"
            lts={0.4}
          >
            {title}
          </Text>
        }
      />

      <Stack gap={6} style={{ flex: 1, overflowY: "auto", paddingTop: 8 }}>
        {todos.map((t) => (
          <Group
            key={t.id}
            align="center"
            wrap="nowrap"
            data-draggable-id={getItemId(t)}
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              margin: "5px 5px",
              borderRadius: 12,
              background: dark
                ? alpha(theme.colors.dark[1], 0.55)
                : "rgba(255,255,255,0.8)",
              border: dark
                ? `1px solid ${alpha(theme.colors.dark[3], 0.9)}`
                : `1px solid var(--mantine-color-gray-3)`,
              transition: "background 120ms ease, box-shadow 120ms ease",
              overflow: "hidden",
              minWidth: 0,
              color: "white",
            }}
          >
            <Checkbox
              size="xs"
              radius="xl"
              checked={!!t.done}
              onChange={() => onToggle(t)}
              aria-label="toggle done"
              styles={{
                input: { width: 16, height: 16 },
                icon: { width: 0, height: 0 },
              }}
            />

            <div
              style={{
                flex: 1,
                minWidth: 0,
                margin: "0 8px",
                overflow: "hidden",
              }}
            >
              <TaskTitlePopover title={t.title} done={!!t.done} />
            </div>

            <ActionIcon
              onClick={() => onDelete(t)}
              radius="xl"
              size="sm"
              variant="subtle"
              aria-label="delete task"
              color="red"
              style={{ flexShrink: 0 }}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        ))}
      </Stack>

      <div style={{ marginTop: 10 }}>
        <Group justify="center" align="center" gap={10} mt={8}>
          <input
            ref={inputRef as any}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Kirjoita idea/tehtävä ja paina Enter…"
            style={{
              flex: 1,
              maxWidth: 520,
              borderRadius: 999,
              padding: "12px 16px",
              border: `1px solid ${alpha(theme.black, 0.08)}`,
              background: dark ? alpha(theme.colors.dark[5], 0.9) : "white",
              color: dark ? theme.colors.gray[1] : "black",
              outline: "none",
              fontSize: "0.95rem",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAdd();
            }}
          />

          <Button
            radius="xl"
            size="sm"
            leftSection={<IconPlus size={16} />}
            onClick={onAdd}
            color="green"
          >
            Add
          </Button>
        </Group>
      </div>
    </Paper>
  );
}
