import { AppShell, Group, Stack, SimpleGrid, Box } from "@mantine/core";
import { Global } from "@emotion/react";
import bgImage from "./assets/background.jpg";
import { notifications } from "@mantine/notifications";
import { useEffect, useState, useMemo, useRef } from "react";
import { api } from "./api";
import type { Todo, List } from "./types";
import { SummaryCard } from "./components/SummaryCard";
import { AddNewCard } from "./components/AddNewCard";
import FileGallery from "./components/FileGallery";
import { Boards } from "./components/Boards";
import NotepadBoard from "./components/NotepadBoard";
import { arrayMove } from "@dnd-kit/sortable";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type CollisionDetection,
  MeasuringStrategy,
  pointerWithin,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { listContainerId, parseListId } from "./helpers/dnd";

function App() {
  const [lists, setLists] = useState<List[]>([]);
  const [listTodos, setListTodos] = useState<Record<number, Todo[]>>({});
  const [perListDraft, setPerListDraft] = useState<Record<number, string>>({});
  const [scrollKey, setScrollKey] = useState(0);

  const [notepadTodos, setNotepadTodos] = useState<Todo[]>([]);
  const [noteDraft, setNoteDraft] = useState("");


  const lastColMoveTs = useRef(0);
  const COL_MOVE_THROTTLE = 140;
  const lastRowMoveTs = useRef(0);
  const ROW_MOVE_THROTTLE = 90;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    return hits.length ? hits : closestCenter(args);
  };

  const [isDndActive, setIsDndActive] = useState(false);

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

  const onDragOver = (e: DragOverEvent) => {
    const a = String(e.active?.id ?? "");
    const o = String(e.over?.id ?? "");
    if (!a || !o || a === o) return;

    if (a.startsWith("col-") && o.startsWith("col-")) {
      const from = lists.findIndex((x) => `col-${x.id}` === a);
      const to = lists.findIndex((x) => `col-${x.id}` === o);
      if (from === -1 || to === -1 || from === to) return;

      const now = performance.now();
      if (now - lastColMoveTs.current < COL_MOVE_THROTTLE) return;
      lastColMoveTs.current = now;

      setLists((prev) => arrayMove(prev, from, to));
      return;
    }

    const fromContainerId =
      (e.active.data.current as any)?.sortable?.containerId ||
      Object.entries(containers).find(([, ids]) => ids.includes(a))?.[0];

    const toContainerId =
      (e.over?.data.current as any)?.sortable?.containerId || o;

    if (!fromContainerId || !toContainerId) return;

    const fromList = parseListId(fromContainerId);
    const toList = parseListId(toContainerId);

    if (
      fromContainerId === toContainerId &&
      a.startsWith("todo-") &&
      o.startsWith("todo-")
    ) {
      const listId = toList;
      if (typeof listId !== "number") return;

      const list = listTodos[listId] ?? [];
      const fromIndex = list.findIndex((t) => `todo-${t.id}` === a);
      const toIndex = list.findIndex((t) => `todo-${t.id}` === o);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

      const now = performance.now();
      if (now - lastRowMoveTs.current < ROW_MOVE_THROTTLE) return;
      lastRowMoveTs.current = now;

      setListTodos((prev) => ({
        ...prev,
        [listId]: arrayMove(prev[listId] ?? [], fromIndex, toIndex),
      }));
      return;
    }

    if (fromContainerId !== toContainerId && a.startsWith("todo-")) {
      if (typeof fromList === "number" && typeof toList === "number") {
        setListTodos((prev) => {
          const fromArr = [...(prev[fromList] ?? [])];
          const toArr = [...(prev[toList] ?? [])];
          const idx = fromArr.findIndex((t) => `todo-${t.id}` === a);
          if (idx === -1) return prev;
          const [item] = fromArr.splice(idx, 1);

          let insertAt = 0;
          if (o.startsWith("todo-")) {
            const j = toArr.findIndex((t) => `todo-${t.id}` === o);
            insertAt = j >= 0 ? j : 0;
          }
          toArr.splice(insertAt, 0, item);

          return { ...prev, [fromList]: fromArr, [toList]: toArr };
        });
        return;
      }

      if (fromList === "notepad" && typeof toList === "number") {
        setNotepadTodos((prevNP) => {
          const idx = prevNP.findIndex((t) => `todo-${t.id}` === a);
          if (idx === -1) return prevNP;
          const item = prevNP[idx];

          setListTodos((prev) => {
            const toArr = [...(prev[toList] ?? [])];
            let insertAt = 0;
            if (o.startsWith("todo-")) {
              const j = toArr.findIndex((t) => `todo-${t.id}` === o);
              insertAt = j >= 0 ? j : 0;
            }
            toArr.splice(insertAt, 0, item);
            return { ...prev, [toList]: toArr };
          });

          const copy = [...prevNP];
          copy.splice(idx, 1);
          return copy;
        });
        return;
      }
    }
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setIsDndActive(false);

    const activeId = String(e.active?.id ?? "");
    const overId = String(e.over?.id ?? "");
    if (!activeId || !overId) return;

    if (activeId.startsWith("col-") && overId.startsWith("col-")) {
      try {
        await Promise.all(
          lists.map((l, idx) => api.lists.update(l.id, { position: idx }))
        );
      } catch {
        const fresh = await api.lists.all();
        setLists(fresh);
      }
      return;
    }

    const fromContainerId =
      (e.active.data.current as any)?.sortable?.containerId ||
      Object.entries(containers).find(([, ids]) => ids.includes(activeId))?.[0];
    const toContainerId =
      (e.over?.data.current as any)?.sortable?.containerId || overId;

    if (!fromContainerId || !toContainerId) return;

    const fromList = parseListId(fromContainerId);
    const toList = parseListId(toContainerId);

    if (
      fromContainerId === toContainerId &&
      activeId.startsWith("todo-") &&
      overId.startsWith("todo-")
    ) {
      const listId = toList;
      if (typeof listId !== "number") return;
      const list = listTodos[listId] ?? [];
      const fromIndex = list.findIndex((t) => `todo-${t.id}` === activeId);
      const toIndex = list.findIndex((t) => `todo-${t.id}` === overId);
      if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
        setListTodos((prev) => ({
          ...prev,
          [listId]: arrayMove(prev[listId] ?? [], fromIndex, toIndex),
        }));
      }
      return;
    }

    if (fromContainerId !== toContainerId && activeId.startsWith("todo-")) {
      const todoId = Number(activeId.replace("todo-", ""));

      if (typeof fromList === "number" && typeof toList === "number") {
        const todo = (listTodos[fromList] ?? []).find((t) => t.id === todoId);
        if (todo) await onMoveToList(todo, fromList, toList);
        return;
      }

      if (fromList === "notepad" && typeof toList === "number") {
  const todo = notepadTodos.find((t) => t.id === todoId);
  if (!todo) return;

  setNotepadTodos((prev) => prev.filter((x) => x.id !== todoId));
  setListTodos((prev) => {
    const toArr = [...(prev[toList] ?? [])];
    return { ...prev, [toList]: [todo, ...toArr] };
  });

  try {
    const updated = await api.notepad.moveToList(todo.id, toList); // PATCH { list_id }
    setListTodos((prev) => {
      const toArr = [...(prev[toList] ?? [])];
      const idx = toArr.findIndex((t) => t.id === todoId);
      if (idx >= 0) toArr[idx] = updated;
      return { ...prev, [toList]: toArr };
    });
  } catch (e: any) {
    notifications.show({ color: "red", title: "Move failed", message: e.message });
    // Revert
    setNotepadTodos((prev) => [todo, ...prev]);
    setListTodos((prev) => {
      const toArr = (prev[toList] ?? []).filter((t) => t.id !== todoId);
      return { ...prev, [toList]: toArr };
    });
  }
  return;
}
    }
  };

  const addToNotepad = async () => {
  const text = noteDraft.trim();
  if (!text) return;
  try {
    const created = await api.notepad.create(text);
    setNotepadTodos((arr) => [created, ...arr]);
    setNoteDraft("");
  } catch (e: any) {
    notifications.show({ color: "red", title: "Error", message: e.message });
  }
};

const toggleInNotepad = async (todo: Todo) => {
  try {
    const updated = await api.notepad.toggle(todo.id, !Boolean(todo.done));
    setNotepadTodos((arr) => arr.map((x) => (x.id === todo.id ? updated : x)));
  } catch (e: any) {
    notifications.show({ color: "red", title: "Error", message: e.message });
  }
};

const deleteInNotepad = async (todo: Todo) => {
  try {
    await api.notepad.remove(todo.id);
    setNotepadTodos((arr) => arr.filter((x) => x.id !== todo.id));
  } catch (e: any) {
    notifications.show({ color: "red", title: "Error", message: e.message });
  }
};


  async function loadListsAndTodos() {
  try {
    const ls = await api.lists.all();
    const np = await api.notepad.all();             
    setLists(ls);

    const entries = await Promise.all(
      ls.map(async (l) => [l.id, await api.todosByList.all(l.id)] as const)
    );
    setListTodos(Object.fromEntries(entries));
    setNotepadTodos(np);                            
  } catch (e: any) {
    notifications.show({ color: "red", title: "Error", message: e.message });
  }
}

  useEffect(() => {
    loadListsAndTodos();
  }, []);

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
      position: "relative",
      overflow: "hidden",
      "&::before": {
        content: '""',
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 0, 0, 0.85), rgba(88, 88, 88, 0.91)),
          url(${bgImage})
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        filter: "blur(8px)",
        zIndex: -1,
      },
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
              collisionDetection={collisionDetection}
              measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
              modifiers={
                activeId?.startsWith("col-")
                  ? [restrictToHorizontalAxis]
                  : undefined
              }
              onDragStart={(e: DragStartEvent) => {
                setActiveId(String(e.active.id));
                setIsDndActive(true);
              }}
              onDragOver={onDragOver}
              onDragEnd={(e: DragEndEvent) => {
                setActiveId(null);
                setIsDndActive(false);
                onDragEnd(e);
              }}
              onDragCancel={() => {
                setActiveId(null);
                setIsDndActive(false);
              }}
            >
              <Group
                align="flex-start"
                gap="xl"
                wrap="nowrap"
                style={{ display: "flex", flexWrap: "nowrap", width: "100%" }}
              >
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
                    isDndActive={isDndActive}
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
