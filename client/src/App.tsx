import { AppShell, Group, Stack, SimpleGrid, Box } from "@mantine/core";
import { Global } from "@emotion/react";
import bgImage from "./assets/background.jpg";
import { notifications } from "@mantine/notifications";
import { useEffect, useState, useMemo } from "react";
import { api } from "./api";
import type { Todo, List } from "./types";
import { SummaryCard } from "./components/SummaryCard";
import { AddNewCard } from "./components/AddNewCard";
import FileGallery from "./components/FileGallery";
import { Boards } from "./components/Boards";
import NotepadBoard from "./components/NotepadBoard";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { listContainerId, parseListId } from "./helpers/dnd";

function App() {
  const [lists, setLists] = useState<List[]>([]);
  const [listTodos, setListTodos] = useState<Record<number, Todo[]>>({});
  const [perListDraft, setPerListDraft] = useState<Record<number, string>>({});
  const [scrollKey, setScrollKey] = useState(0);

  // Notepad
  const [notepadTodos, setNotepadTodos] = useState<Todo[]>([]);
  const [noteDraft, setNoteDraft] = useState("");

  // DnD
  const sensors = useSensors(
    // pienenkin liikkeen jälkeen aktivoituu, mutta Boardsissa on kahva, joten vaakaskrolli säilyy
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const [isDndActive, setIsDndActive] = useState(false);

  // Kartta: missä containerissa on mitäkin id:itä (todo-<id>)
  const containers = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const l of lists) {
      map[listContainerId(l.id)] = (listTodos[l.id] ?? []).map(
        (t) => `todo-${t.id}`
      );
    }
    map["notepad"] = notepadTodos.map((t) => `todo-${t.id}`);
    return map;
  }, [lists, listTodos, notepadTodos]);

  const onDragStart = (_e: DragStartEvent) => setIsDndActive(true);
  const onDragCancel = () => setIsDndActive(false);
  const onDragEnd = async (e: DragEndEvent) => {
    setIsDndActive(false);

    const activeId = e.active?.id as string | undefined; // "todo-123"
    const overId = e.over?.id as string | undefined;
    if (!activeId || !overId) return;

    const fromContainerId =
      (e.active.data.current as any)?.sortable?.containerId ||
      Object.entries(containers).find(([, ids]) => ids.includes(activeId))?.[0];

    const toContainerId =
      (e.over?.data.current as any)?.sortable?.containerId || overId;

    if (!fromContainerId || !toContainerId || fromContainerId === toContainerId)
      return;

    const fromList = parseListId(fromContainerId); // numero | 'notepad' | null
    const toList = parseListId(toContainerId);
    if (fromList == null || toList == null) return;

    const todoId = Number(String(activeId).replace("todo-", ""));
    const sourceTodos =
      fromList === "notepad"
        ? notepadTodos
        : (listTodos[fromList as number] ?? []);
    const todo = sourceTodos.find((t) => t.id === todoId);
    if (!todo) return;

    // Notepad → Board
    if (fromList === "notepad" && typeof toList === "number") {
      await onCreateInList(toList, todo.title);
      setNotepadTodos((arr) => arr.filter((x) => x.id !== todo.id));
      return;
    }

    // Board → Board
    if (typeof fromList === "number" && typeof toList === "number") {
      await onMoveToList(todo, fromList, toList);
      return;
    }
  };

  // Notepad-operaatiot
  const addToNotepad = () => {
    const text = noteDraft.trim();
    if (!text) return;
    const t: Todo = {
      id: Date.now(),
      title: text,
      done: false,
      created_at: new Date().toISOString(),
    };
    setNotepadTodos((arr) => [t, ...arr]);
    setNoteDraft("");
  };
  const toggleInNotepad = (todo: Todo) => {
    setNotepadTodos((arr) =>
      arr.map((x) => (x.id === todo.id ? { ...x, done: !x.done } : x))
    );
  };
  const deleteInNotepad = (todo: Todo) => {
    setNotepadTodos((arr) => arr.filter((x) => x.id !== todo.id));
  };

  // Datahaku
  async function loadListsAndTodos() {
    try {
      const ls = await api.lists.all();
      setLists(ls);
      const entries = await Promise.all(
        ls.map(async (l) => [l.id, await api.todosByList.all(l.id)] as const)
      );
      setListTodos(Object.fromEntries(entries));
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  }
  useEffect(() => {
    loadListsAndTodos();
  }, []);

  // Listat & todo-operaatiot
  async function addListWith(name: string, color: string) {
    try {
      const created = await api.lists.create(name, color);
      await api.lists.update(created.id, { position: lists.length });
      setLists((xs) => [...xs, { ...created, position: lists.length }]);
      setListTodos((m) => ({ ...m, [created.id]: [] }));
      setScrollKey((k) => k + 1);
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  }
  async function addTodoToList(listId: number) {
    const title = (perListDraft[listId] || "").trim();
    if (!title) return;
    try {
      const created = await api.todosByList.create(listId, title);
      setListTodos((m) => ({
        ...m,
        [listId]: [created, ...(m[listId] || [])],
      }));
      setPerListDraft((s) => ({ ...s, [listId]: "" }));
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  }
  async function toggleDoneInList(listId: number, todo: Todo) {
    try {
      const updated = await api.update(todo.id, { done: !Boolean(todo.done) });
      setListTodos((m) => ({
        ...m,
        [listId]: (m[listId] || []).map((x) =>
          x.id === todo.id ? updated : x
        ),
      }));
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  }
  async function removeInList(listId: number, todo: Todo) {
    try {
      await api.remove(todo.id);
      setListTodos((m) => ({
        ...m,
        [listId]: (m[listId] || []).filter((x) => x.id !== todo.id),
      }));
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  }
  async function editTitleInList(listId: number, todo: Todo, next: string) {
    const t = next.trim();
    if (!t || t === todo.title) return;
    try {
      const updated = await api.update(todo.id, { title: t });
      setListTodos((m) => ({
        ...m,
        [listId]: (m[listId] || []).map((x) =>
          x.id === todo.id ? updated : x
        ),
      }));
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  }
  async function deleteList(id: number) {
    try {
      await api.lists.remove(id);
      setLists((xs) => xs.filter((l) => l.id !== id));
      setListTodos((m) => {
        const { [id]: _removed, ...rest } = m;
        return rest;
      });
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  }

  // DnD-siirrot
  async function onMoveToList(
    todo: Todo,
    fromListId: number,
    toListId: number
  ) {
    const updated = await api.update(todo.id, { list_id: toListId });
    setListTodos((m) => {
      const from = (m[fromListId] ?? []).filter((x) => x.id !== todo.id);
      const to = [updated, ...(m[toListId] ?? [])];
      return { ...m, [fromListId]: from, [toListId]: to };
    });
  }
  async function onCreateInList(listId: number, title: string) {
    const created = await api.todosByList.create(listId, title);
    setListTodos((m) => ({ ...m, [listId]: [created, ...(m[listId] ?? [])] }));
    return created;
  }

  const allTodos = Object.values(listTodos).flat();
  const total = allTodos.length;
  const doneCount = allTodos.filter((t) => Boolean(t.done)).length;
  const activeCount = total - doneCount;

  return (
    <>
      <Global
        styles={{
          html: { height: "100%" },
          body: {
            margin: 0,
            minHeight: "100%",
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.85), rgba(68, 68, 68, 0.85)),
              url(${bgImage})
            `,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          },
          "#root": { minHeight: "100%", background: "transparent" },
        }}
      />

      <AppShell
        header={{ height: 56 }}
        padding="md"
        styles={{ main: { padding: "24px" } }}
      >
        <AppShell.Main>
          <Stack gap="xl">
            <DndContext
              sensors={sensors}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragCancel={onDragCancel}
            >
              <Group
                align="flex-start"
                gap="xl"
                wrap="nowrap"
                style={{ display: "flex", flexWrap: "nowrap", width: "100%" }}
              >
                {/* Vasen sivupaneeli */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    width: 280,
                    flex: "0 0 280px",
                  }}
                >
                  <SummaryCard
                    total={total}
                    active={activeCount}
                    done={doneCount}
                  />
                  <AddNewCard onAddList={addListWith} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <Boards
                    lists={lists}
                    listTodos={listTodos}
                    perListDraft={perListDraft}
                    onPerListDraftChange={(id, v) =>
                      setPerListDraft((s) => ({ ...s, [id]: v }))
                    }
                    onAddTodoToList={addTodoToList}
                    onToggleInList={toggleDoneInList}
                    onEditInList={editTitleInList}
                    onDeleteInList={removeInList}
                    onDeleteList={deleteList}
                    scrollToEndKey={scrollKey}
                    dndEnabled
                    containerIdForList={(id) => listContainerId(id)}
                    dragScrollDisabled={isDndActive}
                  />
                </div>
              </Group>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" mt="md">
                <Box w={{ md: "100%" }}>
                  <FileGallery />
                </Box>
                <Box w={{ md: "100%" }}>
                  <NotepadBoard
                    title="Notepad"
                    todos={notepadTodos}
                    draft={noteDraft}
                    onDraftChange={setNoteDraft}
                    onAdd={addToNotepad}
                    onToggle={toggleInNotepad}
                    onDelete={deleteInNotepad}
                    listId="notepad"
                  />
                </Box>
              </SimpleGrid>
            </DndContext>
          </Stack>
        </AppShell.Main>
      </AppShell>
    </>
  );
}

export default App;
