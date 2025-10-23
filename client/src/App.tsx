import { AppShell, Group, Stack, SimpleGrid, Box } from "@mantine/core";
import { Global } from "@emotion/react";
import bgImage from "./assets/background.jpg";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { api } from "./api";
import { arrayMove } from "@dnd-kit/sortable";
import type { Todo, List } from "./types";
import { SummaryCard } from "./components/SummaryCard";
import { AddNewCard } from "./components/AddNewCard";
import FileGallery from "./components/FileGallery";
import { Boards } from "./components/Boards";
import NotepadBoard from "./components/NotepadBoard";
import { listContainerId } from "./helpers/dnd";
import WorkspaceDnDWithBoards from "./components/WorkspaceDnD";

function App() {
  const [lists, setLists] = useState<List[]>([]);
  const [listTodos, setListTodos] = useState<Record<number, Todo[]>>({});
  const [perListDraft, setPerListDraft] = useState<Record<number, string>>({});
  const [scrollKey, setScrollKey] = useState(0);

  const [notepadTodos, setNotepadTodos] = useState<Todo[]>([]);
  const [noteDraft, setNoteDraft] = useState("");

  // tilastot
  const allTodos = Object.values(listTodos).flat();
  const total = allTodos.length;

  async function loadListsAndTodos() {
    try {
      const ls = await api.lists.all();
      const np = (await api.notepad.all?.().catch?.(() => [])) || [];
      setLists(ls);
      const entries = await Promise.all(
        ls.map(async (l) => [l.id, await api.todosByList.all(l.id)] as const)
      );
      setListTodos(Object.fromEntries(entries));
      setNotepadTodos(np as Todo[]);
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  }

  useEffect(() => {
    loadListsAndTodos();
  }, []);

  // ----- Lists CRUD -----
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

  const onReorderWithinList = async (
    listId: number,
    fromIndex: number,
    toIndex: number
  ) => {
    const prev = listTodos[listId] ?? [];
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const updated = arrayMove(prev, fromIndex, toIndex);

    setListTodos((s) => ({ ...s, [listId]: updated }));

    try {
      await api.todosByList.reorder(
        listId,
        updated.map((t) => t.id)
      );
    } catch (e: any) {
      notifications.show({
        color: "red",
        title: "Reorder failed",
        message: e.message,
      });
      // Palauta palvelimen totuuteen
      const fresh = await api.todosByList.all(listId);
      setListTodos((s) => ({ ...s, [listId]: fresh }));
    }
  };

  // ----- DnD: Notepad -----
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
  const deleteInNotepad = async (todo: Todo) => {
    try {
      await api.notepad.remove(todo.id);
      setNotepadTodos((arr) => arr.filter((x) => x.id !== todo.id));
    } catch (e: any) {
      notifications.show({ color: "red", title: "Error", message: e.message });
    }
  };

  // ----- DnD: siirto lista -> lista (opt UI + PATCH + reorder) -----
  async function onMoveToList(
    todo: Todo,
    fromListId: number,
    toListId: number
  ) {
    const fromArrPrev = listTodos[fromListId] ?? [];
    const idx = fromArrPrev.findIndex((t) => t.id === todo.id);
    if (idx === -1) return;

    const fromArr = [...fromArrPrev];
    fromArr.splice(idx, 1);

    const toArrPrev = listTodos[toListId] ?? [];
    const toArr = toArrPrev.filter((t) => t.id !== todo.id);
    toArr.splice(0, 0, todo); // alkuun (voit laskea insertAt, jos haluat pudotuskohtaan)

    // UI heti
    setListTodos((prev) => ({
      ...prev,
      [fromListId]: fromArr,
      [toListId]: toArr,
    }));

    try {
      // Persist: siirrä listalle
      const updated = await api.update(todo.id, { list_id: toListId });

      // Syncaa kohdelista serverin versiolla
      setListTodos((prev) => {
        const arr = [...(prev[toListId] ?? [])];
        const i = arr.findIndex((t) => t.id === todo.id);
        if (i >= 0) arr[i] = updated;
        return { ...prev, [toListId]: arr };
      });

      // Persist: järjestykset molemmille
      await Promise.all([
        api.todosByList.reorder(
          toListId,
          toArr.map((t) => t.id)
        ),
        api.todosByList.reorder(
          fromListId,
          fromArr.map((t) => t.id)
        ),
      ]);
    } catch (e: any) {
      notifications.show({
        color: "red",
        title: "Move failed",
        message: e.message,
      });
      // Revert
      setListTodos((prev) => {
        const revertFrom = [...(prev[fromListId] ?? [])];
        const revertTo = [...(prev[toListId] ?? [])].filter(
          (t) => t.id !== todo.id
        );
        revertFrom.splice(idx, 0, todo);
        return { ...prev, [fromListId]: revertFrom, [toListId]: revertTo };
      });
    }
  }

  // Notepad -> lista
  async function onCreateInList(listId: number, title: string) {
    const created = await api.todosByList.create(listId, title);
    setListTodos((prev) => ({
      ...prev,
      [listId]: [created, ...(prev[listId] ?? [])],
    }));
    const order = (listTodos[listId] ?? []).map((t) => t.id);
    await api.todosByList.reorder(listId, [created.id, ...order]);
    return created;
  }

  // UI helperit DnD-komponentille
  const onApplyListTodos = (listId: number, next: Todo[]) => {
    setListTodos((prev) => ({ ...prev, [listId]: next }));
  };
  const onReorderLists = (nextLists: List[]) => setLists(nextLists);

  return (
    <>
      <Global
        styles={{
          html: { height: "100%" },
          body: {
            margin: 0,
            minHeight: "100%",
            position: "relative",
            overflowY: "scroll",
            overflowX: "hidden",
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
            <WorkspaceDnDWithBoards
              lists={lists}
              listTodos={listTodos}
              perListDraft={perListDraft}
              onPerListDraftChange={(id, v) =>
                setPerListDraft((s) => ({ ...s, [id]: v }))
              }
              onAddTodoToList={addTodoToList}
              onEditInList={editTitleInList}
              onDeleteInList={removeInList}
              onDeleteList={deleteList}
              scrollToEndKey={scrollKey}
              onCreateInList={onCreateInList}
              onMoveToList={onMoveToList}
              onApplyListTodos={onApplyListTodos}
              onReorderLists={onReorderLists}
              notepadTodos={notepadTodos}
              setNotepadTodos={setNotepadTodos}
              onReorderWithinList={onReorderWithinList}
              
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
                  <SummaryCard total={total} />
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
                    onEditInList={editTitleInList}
                    onDeleteInList={removeInList}
                    onDeleteList={deleteList}
                    scrollToEndKey={scrollKey}
                    dndEnabled
                    containerIdForList={(id) => listContainerId(id)}
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
                    onDelete={deleteInNotepad}
                    listId="notepad"
                  />
                </Box>
              </SimpleGrid>
            </WorkspaceDnDWithBoards>
          </Stack>
        </AppShell.Main>
      </AppShell>
    </>
  );
}

export default App;
