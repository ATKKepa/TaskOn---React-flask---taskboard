import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Group, Checkbox, ActionIcon } from "@mantine/core";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";
import TaskTitlePopover from "../TaskTitlePopover";
import type { Todo } from "../../types";

type Props = {
  todo: Todo;
  onToggle?: (t: Todo) => void;
  onDelete?: (t: Todo) => void;
};

export default function SortableItem({ todo, onToggle, onDelete }: Props) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `todo-${todo.id}` });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Group
      ref={setNodeRef}
      style={{
        ...style,
        padding: "1px 1px",
        margin: "5px 5px",
        borderRadius: 10,
        border: "1px solid var(--mantine-color-gray-3)",
        background: "rgba(255,255,255,0.8)",
        overflow: "hidden",
        minWidth: 0,
      }}
      wrap="nowrap"
      align="center"
    >
      <ActionIcon
        variant="subtle"
        aria-label="Drag"
        {...attributes}
        {...listeners}
        style={{ cursor: "grab" }}
      >
        <IconGripVertical size={16} />
      </ActionIcon>

      <Checkbox
        size="xs"
        checked={!!todo.done}
        onChange={() => onToggle?.(todo)}
        aria-label="toggle done"
      />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          margin: "0 8px",
          paddingRight: 28,
          overflow: "hidden",
        }}
      >
        <TaskTitlePopover title={todo.title} done={!!todo.done} />
      </div>

      <ActionIcon
        color="red"
        variant="light"
        aria-label="delete task"
        onClick={() => onDelete?.(todo)}
        style={{ flexShrink: 0 }}
      >
        <IconTrash size={14} />
      </ActionIcon>
    </Group>
  );
}
