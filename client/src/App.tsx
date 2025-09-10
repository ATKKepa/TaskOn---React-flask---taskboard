import { TextInput, Button, Group, Stack, Paper, Text, Checkbox, ActionIcon, SegmentedControl } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from './api'
import type { Todo } from './types'



function App() {
  const [count, setCount] = useState(0)
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');

  type Filter = 'all' | 'active' | 'done';
  const [filter, setFilter] = useState<Filter>('all');

  const visibleTodos = todos.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !Boolean(t.done);
    return Boolean(t.done); // 'done'
  });

  async function loadTodos() {
    try {
      const data = await api.list();
      setTodos(data);
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e.message });
    }
  }

  useEffect(() => {loadTodos(); }, []);

  async function addTodo() {
    const t = newTitle.trim();
    if (!t) return;
    try {
      const created = await api.create(t);
      setTodos((xs) => [created, ...xs]);
      setNewTitle('');
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e.message });
    }
  }

  async function toggleDone(todo: Todo) {
    try {
      const updated = await api.update(todo.id, { done: !Boolean(todo.done) });
      setTodos(xs => xs.map(x =>(x.id === todo.id ? updated : x)));
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e.message });
    }
  }

  async function removeTodo(todo: Todo) {
    try {
      await api.remove(todo.id);
      setTodos(xs => xs.filter(x => x.id !== todo.id));
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e.message });
    }
  }

  async function editTitle(todo: Todo, nextTitle: string) {
    const t = nextTitle.trim();
    if (!t || t === todo.title) return;
    try {
      const updated = await api.update(todo.id, { title: t });
      setTodos(xs => xs.map(x => (x.id === todo.id ? updated : x)));
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e.message });
    }
  }

return (
  <Stack gap="md" mb="lg">
    <Group align="end" wrap="nowrap">
      <TextInput
        style={{ flex: 1 }}
        label="New Task"
        placeholder="Task title"
        value={newTitle}
        onChange={(e) => setNewTitle(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') addTodo();
        }}
      />
      <Button onClick={addTodo} disabled={!newTitle.trim()}>
        Add
      </Button>
    </Group>

    <Group mb="sm">
      <SegmentedControl
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        data={[
          { label: 'All', value: 'all' },
          { label: 'Active', value: 'active' },
          { label: 'Done', value: 'done' },
        ]}
      />
    </Group>

      {visibleTodos.length === 0 ? (
    <Text c="dimmed">No tasks for this filter.</Text>
  ) : (
    <Stack>
      {visibleTodos.map((t) => (
        <Paper key={t.id} withBorder p="sm" radius="md">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group align="center" gap="sm" wrap="nowrap">
              <Checkbox
                size="sm"
                checked={Boolean(t.done)}
                onChange={() => toggleDone(t)}
                aria-label="Toggle done"
                icon={() => null}
                styles={{
                  body: { display: 'inline-flex', alignItems: 'center' },
                  input: {
                    backgroundColor: 'transparent',
                    '&:checked': { backgroundColor: 'transparent' },
                  },
                }}
              />
              <InlineEditable
                value={t.title}
                done={Boolean(t.done)}
                onSave={(v) => editTitle(t, v)}
              />
            </Group>

            <ActionIcon
              color="red"
              variant="light"
              onClick={() => removeTodo(t)}
              aria-label="Delete task"
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Group>
        </Paper>
      ))}
    </Stack>
  )}
  </Stack>
);

}

function InlineEditable({
  value,
  onSave,
  done,
}: {
  value: string;
  onSave: (v: string) => void;
  done?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => setVal(value), [value]);

  if (!editing) {
    return (
      <span
        style={{
          cursor: 'text',
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.6 : 1,
        }}
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {value}
      </span>
    );
  }

return (
    <TextInput
      value={val}
      onChange={(e) => setVal(e.currentTarget.value)}
      autoFocus
      onKeyDown={(e) => {
        if (e.key === 'Enter') { onSave(val); setEditing(false); }
        if (e.key === 'Escape') { setVal(value); setEditing(false); }
      }}
      onBlur={() => { onSave(val); setEditing(false); }}
      styles={{ input: { height: 28, paddingTop: 2, paddingBottom: 2, minWidth: 200 } }}
    />
  );
}

export default App
