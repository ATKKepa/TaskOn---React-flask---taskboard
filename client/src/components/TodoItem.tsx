import { Checkbox, Group, ActionIcon, Paper } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { Todo } from '../types';
import { InlineEditable } from './InLineEditable';

export function TodoItem({
  todo,
  onToggle,
  onDelete,
  onEdit,
}: {
  todo: Todo;
  onToggle: (t: Todo) => void;
  onDelete: (t: Todo) => void;
  onEdit: (t: Todo, title: string) => void;
}) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group align="center" gap="sm" wrap="nowrap">
          <Checkbox
            size="sm"
            checked={Boolean(todo.done)}
            onChange={() => onToggle(todo)}
            aria-label="Toggle done"
            icon={() => null}
            styles={{
              body: { display: 'inline-flex', alignItems: 'center' },
              input: { backgroundColor: 'transparent', '&:checked': { backgroundColor: 'transparent' } },
            }}
          />
          <InlineEditable
            value={todo.title}
            done={Boolean(todo.done)}
            onSave={(v) => onEdit(todo, v)}
          />
        </Group>

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
