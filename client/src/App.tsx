import {
  TextInput,
  Button,
  Group,
  Stack,
  Paper,
  Text,
  Checkbox,
  ActionIcon,
  SegmentedControl,
  AppShell,
  Skeleton,
  Container,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { api } from "./api";
import type { Todo } from "./types";

type Filter = "all" | "active" | "done";

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const total = todos.length;
  const doneCount = todos.filter((t) => Boolean(t.done)).length;
  const activeCount = total - doneCount;

  const [filter, setFilter] = useState<Filter>(() => {
    const saved = localStorage.getItem("filter");
    return saved === "all" || saved === "active" || saved === "done"
      ? (saved as Filter)
      : "all";
  });

  // sync
  useEffect(() => {
    localStorage.setItem("filter", filter);
  }, [filter]);

  const visibleTodos = todos.filter((t) => {
    if (filter === "all") return true;
    if (filter === "active") return !Boolean(t.done);
    return Boolean(t.done); // 'done'
  });

  async function loadTodos() {
    setLoading(true);
    try {
      const data = await api.list();
      setTodos(data);
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTodos();
  }, []);

  async function addTodo() {
    const t = newTitle.trim();
    if (!t) return;
    try {
      const created = await api.create(t);
      setTodos((xs) => [created, ...xs]);
      setNewTitle("");
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  }

  async function toggleDone(todo: Todo) {
    try {
      const updated = await api.update(todo.id, { done: !Boolean(todo.done) });
      setTodos((xs) => xs.map((x) => (x.id === todo.id ? updated : x)));
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  }

  async function removeTodo(todo: Todo) {
    try {
      await api.remove(todo.id);
      setTodos((xs) => xs.filter((x) => x.id !== todo.id));
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  }

  async function editTitle(todo: Todo, nextTitle: string) {
    const t = nextTitle.trim();
    if (!t || t === todo.title) return;
    try {
      const updated = await api.update(todo.id, { title: t });
      setTodos((xs) => xs.map((x) => (x.id === todo.id ? updated : x)));
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  }

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text fw={600}>To-Do</Text>
          <Group gap="lg">
            <Text size="sm">All: {total}</Text>
            <Text size="sm">Active: {activeCount}</Text>
            <Text size="sm">Done: {doneCount}</Text>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="sm">
          <Group align="end" wrap="nowrap">
            <TextInput
              style={{ flex: 1 }}
              label="New Task"
              placeholder="Task title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTodo();
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
                { label: "All", value: "all" },
                { label: "Active", value: "active" },
                { label: "Done", value: "done" },
              ]}
            />
          </Group>

          {loading ? (
            <Stack>
              {[...Array(3)].map((_, i) => (
                <Paper key={i} withBorder p="sm" radius="md">
                  <Skeleton height={20} />
                </Paper>
              ))}
            </Stack>
          ) : visibleTodos.length === 0 ? (
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
                          body: {
                            display: "inline-flex",
                            alignItems: "center",
                          },
                          input: {
                            backgroundColor: "transparent",
                            "&:checked": { backgroundColor: "transparent" },
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
        </Container>
      </AppShell.Main>
    </AppShell>
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
          cursor: "text",
          textDecoration: done ? "line-through" : "none",
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
        if (e.key === "Enter") {
          onSave(val);
          setEditing(false);
        }
        if (e.key === "Escape") {
          setVal(value);
          setEditing(false);
        }
      }}
      onBlur={() => {
        onSave(val);
        setEditing(false);
      }}
      styles={{
        input: { height: 28, paddingTop: 2, paddingBottom: 2, minWidth: 200 },
      }}
    />
  );
}

export default App;
