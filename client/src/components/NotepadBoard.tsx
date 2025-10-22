import { useRef } from "react";
import {
  Paper,
  Stack,
  Divider,
  Text,
  Group,
  ActionIcon,
  Button,
  useMantineTheme,
  useComputedColorScheme,
  alpha,
} from "@mantine/core";
import { IconTrash, IconGripVertical } from "@tabler/icons-react";
import TaskTitlePopover from "./TaskTitlePopover";
import type { Todo } from "../types";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import RowSortable from "./dnd/RowSortable";

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
  dndEnabled?: boolean;
};

function DropZone({
  id,
  children,
}: {
  id: string | number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 12,
        outline: isOver ? "2px dashed rgba(0,0,0,0.15)" : "none",
        outlineOffset: 4,
        borderRadius: 8,
      }}
    >
      {children}
    </div>
  );
}

export default function NotepadBoard({
  title = "Notepad",
  todos,
  draft,
  onDraftChange,
  onAdd,
  onDelete,
  listId = "notepad",
  getItemId = (t) => `todo-${t.id}`,
  dndEnabled = true,
}: Props) {
  const theme = useMantineTheme();
  const scheme = useComputedColorScheme("light");
  const inputRef = useRef<HTMLInputElement>(null);
  const dark = scheme === "dark";

  const containerId = String(listId);
  const items = todos.map((t) => String(getItemId(t)));

  const ListBody = (
    <Stack gap={6} style={{ flex: 1, overflowY: "auto", paddingTop: 8 }}>
      {todos.map((t) =>
        dndEnabled ? (
          <RowSortable key={String(getItemId(t))} id={String(getItemId(t))}>
            {({ setHandleProps, style, setNodeRef }) => (
              <Group
                ref={setNodeRef}
                align="center"
                wrap="nowrap"
                style={{
                  ...style,
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
                  color: dark ? theme.colors.gray[1] : "black",
                }}
              >
                <ActionIcon
                  variant="subtle"
                  aria-label="Drag to move"
                  {...setHandleProps({ style: { cursor: "grab" } })}
                  style={{ marginRight: 4, flexShrink: 0 }}
                >
                  <IconGripVertical size={16} />
                </ActionIcon>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    margin: "0 8px",
                    paddingRight: 28,
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
            )}
          </RowSortable>
        ) : (
          <Group
            key={t.id}
            align="center"
            wrap="nowrap"
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
              color: dark ? theme.colors.gray[1] : "black",
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                margin: "0 8px",
                paddingRight: 28,
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
        )
      )}
    </Stack>
  );

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
      data-drop-id={containerId}
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

      {dndEnabled ? (
        <SortableContext
          id={containerId}
          items={items}
          strategy={verticalListSortingStrategy}
        >
          <DropZone id={containerId}>{ListBody}</DropZone>
        </SortableContext>
      ) : (
        ListBody
      )}

      <div
        style={{
          marginTop: "auto",
          padding: "10px 12px",
        }}
      >
        <Group justify="center" align="center" gap={10}>
          <input
            ref={inputRef as any}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Type an idea/task and press Add"
            style={{
              width: "min(520px, 100%)",
              borderRadius: 999,
              padding: "12px 16px",
              border: `1px solid ${alpha(theme.black, 0.08)}`,
              background: dark ? alpha(theme.colors.dark[5], 0.9) : "white",
              color: dark ? theme.colors.gray[1] : "black",
              outline: "none",
              fontSize: "0.95rem",
            }}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
          />
          <Button radius="xl" size="sm" onClick={onAdd} color="green">
            Add
          </Button>
        </Group>
      </div>
    </Paper>
  );
}
