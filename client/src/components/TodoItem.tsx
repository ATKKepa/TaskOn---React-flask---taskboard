import { Group, ActionIcon, Paper } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { Todo } from '../types';

export function TodoItem({
  todo,
  onDelete,
}: {
  todo: Todo;
  onDelete: (t: Todo) => void;
  onEdit: (t: Todo, title: string) => void;
}) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between" align="center" wrap="nowrap">
        <ActionIcon
          color="red"
          variant="light"
          onClick={() => onDelete(todo)}
          aria-label="Delete task"
        >
          <IconTrash size={18} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
