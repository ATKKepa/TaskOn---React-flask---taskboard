import {
  Paper,
  Text,
  Group,
  TextInput,
  Button,
  Stack,
  ActionIcon,
  Divider,
  Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import type { Todo, List } from "../types";
import { TodoItem } from "./TodoItem";

export function ListColumn({
  list,
  todos,
  newTitle,
  onNewTitleChange,
  onAdd,
  onEdit,
  onDelete,
  onDeleteList,
}: {
  list: List;
  todos: Todo[];
  newTitle: string;
  onNewTitleChange: (v: string) => void;
  onAdd: () => void;
  onEdit: (t: Todo, title: string) => void;
  onDelete: (t: Todo) => void;
  onDeleteList: () => void;
}) {
  const [opened, { open, close }] = useDisclosure(false);

  function handleAdd() {
    if (!newTitle.trim()) return;
    onAdd();
    close();
  }

  return (
    <Paper
      withBorder
      p="md"
      radius="xl"
      style={{
        width: 320,
        background: list.color || "#fffbe6",
      }}
    >
      {/* Otsikko + roskis */}
      <Group justify="space-between" align="center" mb="xs">
        <Text fw={700} ta="center" style={{ flex: 1 }}>
          {list.name.toUpperCase()}
        </Text>
        <ActionIcon
          color="red"
          variant="light"
          onClick={onDeleteList}
          aria-label="Delete list"
          title="Delete list"
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>

      <Divider mb="sm" />

      {/* Kortit */}
      <Stack gap="xs">
        {todos.map((t, i) => (
          <div key={t.id}>
            {i > 0 && <Divider my={6} />}
            <TodoItem
              todo={t}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          </div>
        ))}
      </Stack>

      <Group justify="center" mt="xl">
        <Button
          onClick={open}
          radius="xl"
          size="md"
          variant="light"
          style={{ width: 180 }}
        >
          Add task
        </Button>
      </Group>

      <Modal
        opened={opened}
        onClose={close}
        title={`Add task to ${list.name}`}
        centered
        radius="md"
      >
        <Group align="end" wrap="nowrap">
          <TextInput
            style={{ flex: 1 }}
            placeholder="Task title"
            value={newTitle}
            onChange={(e) => onNewTitleChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") close();
            }}
            autoFocus
          />
          <Button onClick={handleAdd} disabled={!newTitle.trim()}>
            Add
          </Button>
        </Group>
      </Modal>
    </Paper>
  );
}
