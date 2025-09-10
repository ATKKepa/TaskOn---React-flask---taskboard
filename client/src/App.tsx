import { AppShell, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { api } from './api';
import type { Todo, List } from './types';
import { Boards } from './components/Boards';
import { SummaryCard } from './components/SummaryCard';
import { AddNewCard } from './components/AddNewCard';

function App() {
  // --- Boards ---
  const [lists, setLists] = useState<List[]>([]);
  const [listTodos, setListTodos] = useState<Record<number, Todo[]>>({});
  const [perListDraft, setPerListDraft] = useState<Record<number, string>>({});
  const [scrollKey, setScrollKey] = useState(0);

  // Lataa listat + kunkin listan todo:t
  async function loadListsAndTodos() {
    try {
      const ls = await api.lists.all();
      setLists(ls);
      const entries = await Promise.all(
        ls.map(async (l) => [l.id, await api.todosByList.all(l.id)] as const)
      );
      setListTodos(Object.fromEntries(entries));
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e.message });
    }
  }
  useEffect(() => { loadListsAndTodos(); }, []);

  // Listan luonti (AddNewCard kutsuu tätä)
  // App.tsx
async function addListWith(name: string, color: string) {
  try {
    const created = await api.lists.create(name, color);

    // Aseta position = nykyinen määrä (eli viimeiseksi)
    await api.lists.update(created.id, { position: lists.length });

    // Pidä UI:n järjestys samana (lisää perään)
    setLists((xs) => [...xs, { ...created, position: lists.length }]);
    setListTodos((m) => ({ ...m, [created.id]: [] }));
    
    // (valinnainen) triggaa scrollaus oikealle, ks. kohta 2:
    setScrollKey((k) => k + 1);
  } catch (e: any) {
    notifications.show({ color: 'red', title: 'Error', message: e.message });
  }
}

  // Kortti/tehtävä handlerit (listan sisällä)
  async function addTodoToList(listId: number) {
    const title = (perListDraft[listId] || '').trim();
    if (!title) return;
    try {
      const created = await api.todosByList.create(listId, title);
      setListTodos((m) => ({ ...m, [listId]: [created, ...(m[listId] || [])] }));
      setPerListDraft((s) => ({ ...s, [listId]: '' }));
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e.message });
    }
  }

  async function toggleDoneInList(listId: number, todo: Todo) {
    try {
      const updated = await api.update(todo.id, { done: !Boolean(todo.done) });
      setListTodos((m) => ({
        ...m,
        [listId]: (m[listId] || []).map((x) => (x.id === todo.id ? updated : x)),
      }));
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e.message });
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
      notifications.show({ color: 'red', title: 'Error', message: e.message });
    }
  }

  async function editTitleInList(listId: number, todo: Todo, next: string) {
    const t = next.trim();
    if (!t || t === todo.title) return;
    try {
      const updated = await api.update(todo.id, { title: t });
      setListTodos((m) => ({
        ...m,
        [listId]: (m[listId] || []).map((x) => (x.id === todo.id ? updated : x)),
      }));
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e.message });
    }
  }

  // Poista lista (ja kaikki sen todo:t)
  async function deleteList(id: number) {
    try {
      await api.lists.remove(id);
      setLists((xs) => xs.filter((l) => l.id !== id));
      setListTodos((m) => { const { [id]: _removed, ...rest } = m; return rest; });
    } catch (e: any) {
      notifications.show({ color: 'red', title: 'Error', message: e.message });
    }
  }

  // Laskurit vasemman kortin statseille
  const allTodos = Object.values(listTodos).flat();
  const total = allTodos.length;
  const doneCount = allTodos.filter((t) => Boolean(t.done)).length;
  const activeCount = total - doneCount;

  return (
    <AppShell header={{ height: 56 }} padding="md">
      {/* Jos sulla on header, jätä se tähän */}
      <AppShell.Main>
        <Group align="flex-start" gap="xl" wrap="nowrap">
          {/* Vasemman laidan kortit */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SummaryCard total={total} active={activeCount} done={doneCount} />
            <AddNewCard onAddList={addListWith} />
          </div>

          {/* Oikea: scrollattavat listat Trello-tyyliin */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Boards
              lists={lists}
              listTodos={listTodos}
              perListDraft={perListDraft}
              onPerListDraftChange={(id, v) => setPerListDraft((s) => ({ ...s, [id]: v }))}
              onAddTodoToList={addTodoToList}
              onToggleInList={toggleDoneInList}
              onEditInList={editTitleInList}
              onDeleteInList={removeInList}
              onDeleteList={deleteList}
              scrollToEndKey={scrollKey}
            />
          </div>
        </Group>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
