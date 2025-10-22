import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { SimpleGrid, Box } from "@mantine/core";
import { Boards } from "./Boards";
import { listContainerId, parseListId } from "../helpers/dnd";
import type { List, Todo } from "../types";
import { useState } from "react";

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
  scrollToEndKey: number;

  onCreateInList: (listId: number, title: string) => Promise<Todo>;
  onMoveToList: (
    todo: Todo,
    fromListId: number,
    toListId: number
  ) => Promise<void>;

  notepadTodos: Todo[];
  setNotepadTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  addNotepad: (title: string) => void;
  toggleNotepad: (t: Todo) => void;
  deleteNotepad: (t: Todo) => void;
};

export default function WorkspaceDnDWithBoards(props: Props) {
  const {
    lists,
    listTodos,
    perListDraft,
    onPerListDraftChange,
    onAddTodoToList,
    onToggleInList,
    onEditInList,
    onDeleteInList,
    onDeleteList,
    scrollToEndKey,
    onCreateInList,
    onMoveToList,
    notepadTodos,
    setNotepadTodos,
  } = props;

  const [isDndActive, setIsDndActive] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const onDragStart = (_e: DragStartEvent) => setIsDndActive(true);
  const onDragCancel = () => setIsDndActive(false);
  const onDragEnd = async (e: DragEndEvent) => {
    setIsDndActive(false);
    const activeId = e.active?.id as string | undefined;
    const overId = e.over?.id as string | undefined;
    if (!activeId || !overId) return;

    const activeContainerId =
      (e.active.data.current as any)?.sortable?.containerId ||
      ((): string | null => {
        const aid = activeId;
        for (const l of lists) {
          const cid = listContainerId(l.id);
          const found = (listTodos[l.id] ?? []).some(
            (t) => `todo-${t.id}` === aid
          );
          if (found) return cid;
        }
        if (notepadTodos.some((t) => `todo-${t.id}` === aid)) return "notepad";
        return null;
      })();

    const overContainerId =
      (e.over?.data.current as any)?.sortable?.containerId || overId;

    if (!activeContainerId || !overContainerId) return;
    if (activeContainerId === overContainerId) return;

    const fromList = parseListId(activeContainerId);
    const toList = parseListId(overContainerId);
    if (fromList == null || toList == null) return;

    const todoId = Number(activeId.replace("todo-", ""));
    const sourceTodos =
      fromList === "notepad"
        ? notepadTodos
        : listTodos[fromList as number] ?? [];
    const todo = sourceTodos.find((t) => t.id === todoId);
    if (!todo) return;

    if (typeof fromList === "number" && typeof toList === "number") {
      await onMoveToList(todo, fromList, toList);
      return;
    }

    if (fromList === "notepad" && typeof toList === "number") {
      await onCreateInList(toList, todo.title);
      setNotepadTodos((arr) => arr.filter((x) => x.id !== todo.id));
      return;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SimpleGrid cols={{ base: 1 }} spacing="xl">
        <Box>
          <Boards
            lists={lists}
            listTodos={listTodos}
            perListDraft={perListDraft}
            onPerListDraftChange={onPerListDraftChange}
            onAddTodoToList={onAddTodoToList}
            onToggleInList={onToggleInList}
            onEditInList={onEditInList}
            onDeleteInList={onDeleteInList}
            onDeleteList={onDeleteList}
            scrollToEndKey={scrollToEndKey}
            dragScrollDisabled={isDndActive}
            dndEnabled
            containerIdForList={(id) => listContainerId(id)}
          />
        </Box>
      </SimpleGrid>
    </DndContext>
  );
}
