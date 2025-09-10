import { Group, ScrollArea } from '@mantine/core';
import { useEffect, useRef } from 'react';
import type { List, Todo } from '../types';
import { ListColumn } from './ListColumn';

type BoardsProps = {
  lists: List[];
  listTodos: Record<number, Todo[]>;
  perListDraft: Record<number, string>;
  onPerListDraftChange: (id: number, v: string) => void;
  onAddTodoToList: (id: number) => void;
  onToggleInList: (id: number, t: Todo) => void;
  onEditInList: (id: number, t: Todo, title: string) => void;
  onDeleteInList: (id: number, t: Todo) => void;
  onDeleteList: (id: number) => void;
  scrollToEndKey?: number; // <-- UUSI
};

export function Boards({
  lists,
  listTodos,
  perListDraft,
  onPerListDraftChange,
  onAddTodoToList,
  onToggleInList,
  onEditInList,
  onDeleteInList,
  onDeleteList,
  scrollToEndKey, // <-- UUSI
}: BoardsProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (viewportRef.current) {
      const el = viewportRef.current;
      el.scrollLeft = el.scrollWidth; // rullaa oikeaan laitaan
    }
  }, [scrollToEndKey]);

  return (
    <ScrollArea type="auto" scrollbarSize={10} offsetScrollbars viewportRef={viewportRef}>
      <Group
        align="flex-start"
        wrap="nowrap"
        gap="lg"
        mt="lg"
        style={{ paddingBottom: 8, minHeight: 360 }}
      >
        {lists
          .slice()                               // ei mutatoida
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id) // varmistus
          .map((l) => (
            <ListColumn
              key={l.id}
              list={l}
              todos={listTodos[l.id] || []}
              newTitle={perListDraft[l.id] || ''}
              onNewTitleChange={(v) => onPerListDraftChange(l.id, v)}
              onAdd={() => onAddTodoToList(l.id)}
              onToggle={(t) => onToggleInList(l.id, t)}
              onEdit={(t, title) => onEditInList(l.id, t, title)}
              onDelete={(t) => onDeleteInList(l.id, t)}
              onDeleteList={() => {
                const n = (listTodos[l.id] || []).length;
                if (confirm(n ? `Delete list "${l.name}" and its ${n} card(s)?` : `Delete list "${l.name}"?`)) {
                  onDeleteList(l.id);
                }
              }}
            />
          ))}
      </Group>
    </ScrollArea>
  );
}
