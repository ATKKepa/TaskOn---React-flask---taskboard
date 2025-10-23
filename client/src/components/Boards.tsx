import { useEffect, useRef, useState } from "react";
import {
  ScrollArea,
  Group,
  Paper,
  Stack,
  Divider,
  Text,
  ActionIcon,
  Button,
  useMantineTheme,
  alpha,
} from "@mantine/core";
import { IconTrash, IconGripVertical, IconPencil } from "@tabler/icons-react";
import type { List, Todo } from "../types";
import TaskTitlePopover from "./TaskTitlePopover";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import RowSortable from "./dnd/RowSortable";
import { useDroppable } from "@dnd-kit/core";
import ColSortable from "./dnd/ColSortable";
import TaskTitleInlineEdit from "./TaskTitleInLineEdit";

type Props = {
  lists: List[];
  listTodos: Record<number, Todo[]>;
  perListDraft: Record<number, string>;
  onPerListDraftChange: (listId: number, v: string) => void;
  onAddTodoToList: (listId: number) => void;
  onEditInList: (listId: number, todo: Todo, next: string) => void;
  onDeleteInList: (listId: number, todo: Todo) => void;
  onDeleteList: (listId: number) => void;
  scrollToEndKey: number;
  dragScrollDisabled?: boolean;
  dndEnabled?: boolean;
  containerIdForList?: (listId: number) => string;
  isDndActive?: boolean;
};

function DropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 12,
        outline: "none",
        outlineOffset: 0,
        borderRadius: 6,
      }}
    >
      {children}
    </div>
  );
}

export function Boards(props: Props) {
  const {
    lists,
    listTodos,
    perListDraft,
    onPerListDraftChange,
    onAddTodoToList,
    onDeleteInList,
    onDeleteList,
    dragScrollDisabled = false,
    dndEnabled = true,
    containerIdForList = (id) => `list-${id}`,
    isDndActive = false,
  } = props;
  const theme = useMantineTheme();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState<{
    listId: number;
    todoId: number;
    value: string;
  } | null>(null);

  const isDownRef = useRef(false);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const pointerCapturedIdRef = useRef<number | null>(null);
  const captureElRef = useRef<Element | null>(null);

  const endDragGlobal = () => {
    isDownRef.current = false;
    draggingRef.current = false;
    if (viewportRef.current) {
      viewportRef.current.style.cursor = "grab";
    }
    if (captureElRef.current && pointerCapturedIdRef.current !== null) {
      (captureElRef.current as any).releasePointerCapture?.(
        pointerCapturedIdRef.current
      );
    }
    captureElRef.current = null;
    pointerCapturedIdRef.current = null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (dragScrollDisabled) return;
    if (e.button !== 0) return;
    if (!viewportRef.current) return;
    isDownRef.current = true;
    draggingRef.current = false;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = viewportRef.current.scrollLeft;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointerCapturedIdRef.current = e.pointerId;
    captureElRef.current = e.target as Element;
    viewportRef.current.style.cursor = "grabbing";
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragScrollDisabled) return;
    if (!viewportRef.current || !isDownRef.current) return;
    if ((e.buttons & 1) === 0) {
      endDragGlobal();
      return;
    }
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 3) draggingRef.current = true;
    viewportRef.current.scrollLeft = startScrollLeftRef.current - dx;
  };
  const endDrag = (_e?: React.PointerEvent) => {
    if (dragScrollDisabled) return;
    endDragGlobal();
  };
  const suppressClickIfDragging = (e: React.MouseEvent) => {
    if (dragScrollDisabled) return;
    if (draggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = false;
    }
  };

  useEffect(() => {
    const onUp = () => endDragGlobal();
    const onCancel = () => endDragGlobal();
    const onBlur = () => endDragGlobal();
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (dragScrollDisabled) {
      endDragGlobal();
    }
  }, [dragScrollDisabled]);

  return (
    <ScrollArea
      scrollbars="x"
      type="auto"
      styles={{
        scrollbar: { display: "none" },
        viewport: {
          padding: "0 8px 12px 8px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          cursor: dragScrollDisabled ? "auto" : "unset",
        },
      }}
      viewportRef={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={(e) => {
        if (isDownRef.current) endDrag(e as any);
      }}
      onClickCapture={suppressClickIfDragging}
    >
      <SortableContext
        id="columns"
        items={lists.map((l) => `col-${l.id}`)}
        strategy={horizontalListSortingStrategy}
      >
        <Group
          gap={24}
          align="flex-start"
          wrap="nowrap"
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            width: "100%",
            columnGap: 24,
          }}
        >
          {lists.map((l) => {
            const items = (listTodos[l.id] ?? []).map((t) => `todo-${t.id}`);
            const containerId = containerIdForList(l.id);

            const ListBody = (
              <Stack
                gap={6}
                style={{
                  flex: 1,
                  overflowY: isDndActive ? "hidden" : "auto",
                  paddingTop: 8,
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {(listTodos[l.id] ?? []).map((t) =>
                  dndEnabled ? (
                    <RowSortable key={t.id} id={`todo-${t.id}`}>
                      {({ setHandleProps, style, setNodeRef }) => (
                        <Group
                          ref={setNodeRef}
                          align="center"
                          gap={6}
                          wrap="nowrap"
                          style={{
                            ...style,
                            display: "flex",
                            justifyContent: "flex-start",
                            alignItems: "center",
                            padding: "8px 10px",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.6)",
                            border: "1px solid var(--mantine-color-gray-3)",
                          }}
                        >
                          <ActionIcon
                            variant="subtle"
                            aria-label="Drag to move"
                            {...setHandleProps({ style: { cursor: "grab" } })}
                            style={{
                              marginRight: 2,
                              flexShrink: 0,
                              cursor: "grab",
                              ["--ai-bg" as any]: "transparent",
                              ["--ai-bd" as any]: "transparent",
                              ["--ai-hover" as any]: "rgba(48, 48, 48, 0.25)",
                              ["--ai-color" as any]: "#ff0000ff",
                            }}
                          >
                            <IconGripVertical size={16} />
                          </ActionIcon>

                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              margin: "0 6px",
                              overflow: "hidden",
                            }}
                            onDoubleClick={() =>
                              setEditing({
                                listId: l.id,
                                todoId: t.id,
                                value: t.title,
                              })
                            }
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            {editing &&
                            editing.listId === l.id &&
                            editing.todoId === t.id ? (
                              <TaskTitleInlineEdit
                                initialValue={editing.value}
                                onSave={(next) => {
                                  setEditing(null);
                                  props.onEditInList(l.id, t, next);
                                }}
                                onCancel={() => setEditing(null)}
                              />
                            ) : (
                              <TaskTitlePopover
                                title={t.title}
                                done={!!t.done}
                                requireTruncate={false}
                              />
                            )}
                          </div>

                          <ActionIcon
                            variant="subtle"
                            aria-label="Edit task"
                            onClick={() =>
                              setEditing({
                                listId: l.id,
                                todoId: t.id,
                                value: t.title,
                              })
                            }
                            style={{
                              marginRight: 4,
                              flexShrink: 0,
                              color: "black",
                              ["--ai-hover" as any]: "rgba(48, 48, 48, 0.25)",
                            }}
                          >
                            <IconPencil size={14} />
                          </ActionIcon>

                          <ActionIcon
                            variant="subtle"
                            aria-label="Delete task"
                            onClick={() => onDeleteInList(l.id, t)}
                            style={{
                              marginLeft: 2,
                              flexShrink: 0,
                              ["--ai-bg" as any]: "#b92727ff",
                              ["--ai-bd" as any]: "transparent",
                              ["--ai-hover" as any]: "rgba(48, 48, 48, 0.25)",
                              ["--ai-color" as any]: "#ffffffff",
                            }}
                            onMouseEnter={(e) =>
                              ((
                                e.currentTarget as HTMLButtonElement
                              ).style.color = theme.colors.red[6])
                            }
                            onMouseLeave={(e) =>
                              ((
                                e.currentTarget as HTMLButtonElement
                              ).style.color = theme.colors.gray[0])
                            }
                          >
                            <IconTrash size={14} stroke={1.8} />
                          </ActionIcon>
                        </Group>
                      )}
                    </RowSortable>
                  ) : null
                )}
              </Stack>
            );

            return (
              <ColSortable key={l.id} id={`col-${l.id}`}>
                {({ setNodeRef, setHandleProps, style }) => (
                  <Paper
                    ref={setNodeRef}
                    radius="xl"
                    p="lg"
                    shadow="md"
                    style={{
                      ...style,
                      width: 340,
                      minWidth: 340,
                      flex: "0 0 auto",
                      background: l.color ?? "var(--mantine-color-gray-0)",
                      border: "1px solid var(--mantine-color-gray-3)",
                      borderRadius: 20,
                      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: 220,
                      color: "black",
                    }}
                  >
                    <Divider
                      label={
                        <Text
                          {...setHandleProps({
                            style: { cursor: "grab", userSelect: "none" },
                          })}
                          fw={700}
                          tt="uppercase"
                          size="sm"
                          c="dark.9"
                          ta="center"
                        >
                          {l.name}
                        </Text>
                      }
                    />

                    {dndEnabled ? (
                      <SortableContext
                        id={containerId}
                        items={items}
                        strategy={verticalListSortingStrategy}
                      >
                        <DropZone id={containerId}>
                          {ListBody}
                          {(listTodos[l.id] ?? []).length === 0 && (
                            <Text c="dimmed" size="xs" pl={8} py={4}>
                              Add tasks, or drag them here from other lists.
                            </Text>
                          )}
                        </DropZone>
                      </SortableContext>
                    ) : (
                      ListBody
                    )}

                    <div style={{ marginTop: "10px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: 10,
                          marginTop: 8,
                        }}
                      >
                        <input
                          value={perListDraft[l.id] ?? ""}
                          onChange={(e) =>
                            onPerListDraftChange(l.id, e.target.value)
                          }
                          placeholder="Add a new task…"
                          style={{
                            flex: 1,
                            maxWidth: 220,
                            borderRadius: 999,
                            padding: "12px 16px",
                            border: `1px solid ${alpha(theme.black, 0.08)}`,
                            background: alpha("#fff", 0.9),
                            color: "black",
                            outline: "none",
                            fontSize: "0.95rem",
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") onAddTodoToList(l.id);
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.boxShadow = `0 0 0 4px ${alpha(
                              theme.colors.blue[6],
                              0.15
                            )}`;
                            e.currentTarget.style.borderColor =
                              theme.colors.blue[6];
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.boxShadow = "";
                            e.currentTarget.style.borderColor = alpha(
                              theme.black,
                              0.08
                            );
                          }}
                        />

                        <Button
                          radius="xl"
                          size="sm"
                          variant="filled"
                          styles={{
                            root: {
                              borderRadius: 10,
                              fontWeight: 790,
                              letterSpacing: 0.2,
                              background: "rgba(231, 231, 231, 0.48)",
                              color: theme.black,
                              border: `2px solid ${alpha(theme.black, 0.3)}`,
                              boxShadow: `0 2px 8px ${alpha(
                                theme.black,
                                0.08
                              )}`,
                            },
                          }}
                          onClick={() => onAddTodoToList(l.id)}
                        >
                          Add
                        </Button>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginTop: 12,
                        }}
                      >
                        <Button
                          radius="xl"
                          size="xs"
                          variant="subtle"
                          styles={{
                            root: {
                              borderRadius: 999,
                              paddingInline: 14,
                              fontWeight: 800,
                              color: theme.colors.dark[6],
                              background: "rgba(230, 230, 230, 0.42)",
                              marginBottom: 10,
                              borderColor: alpha(theme.colors.red[9], 0.5),
                              borderWidth: 2,
                            },
                          }}
                          onClick={() => onDeleteList(l.id)}
                        >
                          Delete list
                        </Button>
                      </div>
                    </div>
                  </Paper>
                )}
              </ColSortable>
            );
          })}
        </Group>
      </SortableContext>
    </ScrollArea>
  );
}
