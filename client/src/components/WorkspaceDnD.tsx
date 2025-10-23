import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
  MeasuringStrategy,
  closestCenter,
  pointerWithin,
  DragOverlay,
  rectIntersection,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { listContainerId, parseListId } from "../helpers/dnd";
import type { List, Todo } from "../types";
import { useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { api } from "../api";

type Props = {
  lists: List[];
  listTodos: Record<number, Todo[]>;
  perListDraft: Record<number, string>;
  onPerListDraftChange: (listId: number, v: string) => void;
  onAddTodoToList: (listId: number) => void;
  onToggleInList: (listId: number, todo: Todo) => void;
  onEditInList: (listId: number, todo: Todo, next: string) => void;
  onDeleteInList: (listId: number, todo: Todo) => void;
  onDeleteList: (listId: number) => void;
  onReorderWithinList: (listId: number, fromIndex: number, toIndex: number) => void;
  scrollToEndKey: number;

  onCreateInList: (listId: number, title: string) => Promise<Todo>;
  onMoveToList: (
    todo: Todo,
    fromListId: number,
    toListId: number
  ) => Promise<void>;

  onApplyListTodos: (listId: number, next: Todo[]) => void;
  onReorderLists: (nextLists: List[]) => void;

  notepadTodos: Todo[];
  setNotepadTodos: React.Dispatch<React.SetStateAction<Todo[]>>;

  children?: React.ReactNode;
};

export default function WorkspaceDnDWithBoards(props: Props) {
  const {
    lists,
    listTodos,
    notepadTodos,
    setNotepadTodos,
    onCreateInList,
    onApplyListTodos,
    onReorderLists,
    onReorderWithinList
  } = props;

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  const collisionDetection: CollisionDetection = (args) => {
    const activeId = String(args.active.id);
    if (activeId.startsWith("col-")) {
      const hits = rectIntersection(args);
      return hits.length ? hits : closestCenter(args);
    }

    const hits = pointerWithin(args);
    return hits.length ? hits : closestCenter(args);
  };

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active?.id ?? ""));
  };

const onDragEnd = async (e: DragEndEvent) => {
  const activeId = String(e.active?.id ?? "");
  const overId   = String(e.over?.id ?? "");
  if (!activeId || !overId) return;

  // ---------- 1) Sarakkeiden (listojen) reorder ----------
  if (activeId.startsWith("col-") && overId.startsWith("col-")) {
    const from = lists.findIndex((x) => `col-${x.id}` === activeId);
    const to   = lists.findIndex((x) => `col-${x.id}` === overId);
    if (from === -1 || to === -1 || from === to) return;

    const nextLists = arrayMove(lists, from, to);
    onReorderLists(nextLists); // optimistinen UI

    try {
      await Promise.all(
        nextLists.map((l, idx) => api.lists.update(l.id, { position: idx }))
      );
    } catch {
      /* ignore – seuraava refetch korjaa tarvittaessa */
    }
    return;
  }

  // ---------- 2) Selvitä lähde- ja kohdekontit ----------
  const activeContainerId =
    (e.active.data.current as any)?.sortable?.containerId ??
    Object.entries(containers).find(([, ids]) => ids.includes(activeId))?.[0] ??
    (notepadTodos.some((t) => `todo-${t.id}` === activeId) ? "notepad" : null);

  const overContainerId =
    (e.over?.data.current as any)?.sortable?.containerId ?? overId;

  if (!activeContainerId || !overContainerId) return;

  // ---------- 3) Saman listan sisäinen reorder ----------
 if (
  activeContainerId === overContainerId &&
  activeId.startsWith("todo-") &&
  overId.startsWith("todo-")
) {
  const listId = parseListId(activeContainerId);
  if (typeof listId !== "number") return;

  const arr = listTodos[listId] ?? [];
  const fromIndex = arr.findIndex((t) => `todo-${t.id}` === activeId);
  const toIndex   = arr.findIndex((t) => `todo-${t.id}` === overId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

  onReorderWithinList(listId, fromIndex, toIndex);  // ⬅️ kutsu omaa handleria
  return;
}

  // ---------- 4) Siirto listasta toiseen (tai notepad -> listalle) ----------
  if (activeId.startsWith("todo-") && activeContainerId !== overContainerId) {
    const fromList = parseListId(activeContainerId);
    const toList   = parseListId(overContainerId);
    if (fromList == null || toList == null) return;

    const todoId = Number(activeId.replace("todo-", ""));
    const sourceTodos =
      fromList === "notepad" ? notepadTodos : (listTodos[fromList as number] ?? []);
    const moved = sourceTodos.find((t) => t.id === todoId);
    if (!moved) return;

    // mihin kohtaan kohdelistalla tiputetaan
    let insertAt = 0;
    if (overId.startsWith("todo-") && typeof toList === "number") {
      const overIdx = (listTodos[toList] ?? []).findIndex(
        (t) => `todo-${t.id}` === overId
      );
      insertAt = overIdx >= 0 ? overIdx : 0;
    }

    // ---- 4a) lista -> lista ----
    if (typeof fromList === "number" && typeof toList === "number") {
      const fromArrPrev = listTodos[fromList] ?? [];
      const toArrPrev   = listTodos[toList] ?? [];

      const fromIdx = fromArrPrev.findIndex((t) => t.id === moved.id);
      if (fromIdx < 0) return;

      const fromArr = [...fromArrPrev];
      fromArr.splice(fromIdx, 1);

      const toArr = toArrPrev.filter((t) => t.id !== moved.id);
      toArr.splice(insertAt, 0, moved);

      // optimistinen UI
      onApplyListTodos(fromList, fromArr);
      onApplyListTodos(toList,   toArr);

      try {
        // päivitä list_id
        const updated = await api.update(moved.id, { list_id: toList });

        // korvaa kohdelistassa serverin versio
        const synced = toArr.map((t) => (t.id === updated.id ? updated : t));
        onApplyListTodos(toList, synced);

        // persistoi järjestykset
        await Promise.all([
          api.todosByList.reorder(toList,   synced.map((t) => t.id)),
          api.todosByList.reorder(fromList, fromArr.map((t) => t.id)),
        ]);
      } catch {
        // revert halutessa (voi myös refetchailla)
        // const freshFrom = await api.todosByList.all(fromList);
        // const freshTo   = await api.todosByList.all(toList);
        // onApplyListTodos(fromList, freshFrom);
        // onApplyListTodos(toList,   freshTo);
      }
      return;
    }

    // ---- 4b) notepad -> lista ----
    if (fromList === "notepad" && typeof toList === "number") {
      // poista notepadista optimistisesti
      setNotepadTodos((arr) => arr.filter((x) => x.id !== moved.id));
      try {
        const created = typeof onCreateInList === "function"
          ? await onCreateInList(toList, moved.title)
          : await api.todosByList.create(toList, moved.title);

        const toArrPrev = listTodos[toList] ?? [];
        const toArr = toArrPrev.filter((t) => t.id !== created.id);
        toArr.splice(insertAt, 0, created);
        onApplyListTodos(toList, toArr);

        await api.todosByList.reorder(toList, toArr.map((t) => t.id));
      } catch {
        // palaute notepadiin jos epäonnistuu
        setNotepadTodos((arr) => [moved, ...arr]);
      }
      return;
    }
  }
};


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging } }}
      modifiers={
        activeId?.startsWith("col-") ? [restrictToHorizontalAxis] : undefined
      }
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {props.children}

      <DragOverlay dropAnimation={{ duration: 150 }}>
        {activeId?.startsWith("todo-") ? (
          <div
            style={{
              width: 298,
              height: 46,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(0, 0, 0, 0.63)",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              willChange: "transform",
            }}
          ></div>
        ) : activeId?.startsWith("col-") ? (
          <div
            style={{
              width: 280,
              height: 60,
              borderRadius: 12,
              background: "transparent",
              willChange: "transform",
            }}
          ></div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
