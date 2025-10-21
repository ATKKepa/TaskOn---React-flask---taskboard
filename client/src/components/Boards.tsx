import { useEffect, useRef } from "react";
import {
  ScrollArea,
  Group,
  Paper,
  Stack,
  Divider,
  Text,
  Checkbox,
  ActionIcon,
  Button,
  useMantineTheme,
  alpha,
  useMantineColorScheme,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import type { List, Todo } from "../types";
import TaskTitlePopover from "./TaskTitlePopover";
import { useReducedMotion } from "@mantine/hooks";

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
};

type TodoCheckboxProps = {
  id: string;
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  description?: string;
  error?: string;
  onChange: () => void;
};

export default function TodoCheckbox({
  id,
  checked,
  indeterminate,
  description,
  error,
  onChange,
}: TodoCheckboxProps) {
  const { colorScheme } = useMantineColorScheme();
  const prefersReducedMotion = useReducedMotion();

  return (
    <Checkbox
      id={id}
      checked={checked}
      indeterminate={indeterminate}
      onChange={onChange}
      description={description}
      error={error}
      size="sm"
      radius="md"
      color="teal"
      aria-checked={checked}
      aria-invalid={!!error || undefined}
      styles={(theme, state) => {
        const ring = theme.colors.teal?.[3] ?? theme.primaryColor;
        const checkedBg = theme.colors.teal?.[6];
        const borderIdle = theme.colors.gray?.[5];
        const bgIdle =
          colorScheme === "dark" ? theme.colors.dark?.[6] : theme.white;

        return {
          root: {
            paddingTop: 6,
            paddingBottom: 6,
            alignItems: "flex-start",
          },
          input: {
            width: 18,
            height: 18,
            marginTop: 2,
            borderColor: state.checked ? checkedBg : borderIdle,
            backgroundColor: state.checked ? checkedBg : bgIdle,
            transition: prefersReducedMotion
              ? "none"
              : "box-shadow 120ms, background-color 120ms, border-color 120ms",
            "&:focusVisible": {
              outline: "2px solid transparent",
              boxShadow: `0 0 0 3px ${ring}`,
            },
          },
          icon: {
            color: theme.white,
          },
          label: {
            fontSize: theme.fontSizes.sm,
            lineHeight: 1.35,
            userSelect: "none",
            paddingLeft: 8,
          },
          description: {
            marginTop: 2,
            fontSize: theme.fontSizes.xs,
            color:
              colorScheme === "dark"
                ? theme.colors.gray[4]
                : theme.colors.gray[7],
          },
          error: {
            marginTop: 4,
          },
        };
      }}
    />
  );
}

export function Boards(props: Props) {
  const {
    lists,
    listTodos,
    perListDraft,
    onPerListDraftChange,
    onAddTodoToList,
    onToggleInList,
    onDeleteInList,
    onDeleteList,
    scrollToEndKey,
  } = props;

  const theme = useMantineTheme();

  const endRef = useRef<HTMLDivElement>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);

  const isDownRef = useRef(false);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!viewportRef.current) return;
    isDownRef.current = true;
    draggingRef.current = false;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = viewportRef.current.scrollLeft;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    viewportRef.current.style.cursor = "grabbing";
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!viewportRef.current || !isDownRef.current) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 3) draggingRef.current = true;
    viewportRef.current.scrollLeft = startScrollLeftRef.current - dx;
  };

  const endDrag = (e?: React.PointerEvent) => {
    if (!viewportRef.current) return;
    isDownRef.current = false;
    viewportRef.current.style.cursor = "grab";
    if (e) (e.target as Element).releasePointerCapture?.((e as any).pointerId);
  };

  const suppressClickIfDragging = (e: React.MouseEvent) => {
    if (draggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = false;
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "end",
      block: "nearest",
    });
  }, [scrollToEndKey, lists.length]);

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
        {lists.map((l) => (
          <Paper
            key={l.id}
            radius="xl"
            p="lg"
            shadow="md"
            style={{
              width: 340,
              minWidth: 340,
              flex: "0 0 auto",
              background: l.color ?? "var(--mantine-color-gray-0)",
              border: "1px solid var(--mantine-color-gray-3)",
              borderRadius: 20,
              transition: "transform 180ms ease, box-shadow 180ms ease",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 1)",
              display: "flex",
              flexDirection: "column",
              minHeight: 220,
              color: "black",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)";
            }}
          >
            <Divider
              label={
                <Text fw={700} tt="uppercase" size="sm" c="dark.9" ta="center">
                  {l.name}
                </Text>
              }
            />

            <Stack
              gap={6}
              style={{
                flex: 1,
                overflowY: "auto",
                paddingTop: 8,
              }}
            >
              {(listTodos[l.id] ?? []).map((t) => (
                <Group
                  key={t.id}
                  align="center"
                  wrap="nowrap"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px 8px 10px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.6)",
                    border: "1px solid var(--mantine-color-gray-3)",
                    transition: "background 120ms ease",
                    position: "relative",
                    overflow: "hidden",
                    minWidth: 0,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.85)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,0.6)")
                  }
                >
                  <TodoCheckbox
                    id={`todo-${t.id}`}
                    label={t.title}
                    checked={!!t.done}
                    indeterminate={false}
                    onChange={() => onToggleInList(l.id, t)}
                  />
                  <div style={{ flex: 1, minWidth: 0, margin: "0 8px" }}>
                    <TaskTitlePopover
                      title={t.title}
                      done={!!t.done}
                      requireTruncate={false}
                      debug
                    />
                  </div>

                  <ActionIcon
                    onClick={() => onDeleteInList(l.id, t)}
                    radius="xl"
                    size="sm"
                    variant="light"
                    color="white"
                    styles={{
                      root: {
                        borderRadius: 999,
                        background: alpha("#96969663", 0.8),
                        border: `1px solid ${alpha(theme.black, 0.06)}`,
                        transition:
                          "transform 120ms ease, background 120ms ease, box-shadow 120ms ease",
                      },
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        alpha("#f8313163", 1);
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.boxShadow = `0 2px 10px ${alpha(
                        theme.black,
                        0.1
                      )}`;
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        alpha("#96969663", 0.8);
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "";
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        "translateY(0)";
                    }}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>

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
                  onChange={(e) => onPerListDraftChange(l.id, e.target.value)}
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
                    transition:
                      "box-shadow 150ms ease, border-color 150ms ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 4px ${alpha(
                      theme.colors.blue[6],
                      0.15
                    )}`;
                    e.currentTarget.style.borderColor = theme.colors.blue[6];
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
                      background: alpha(l.color ?? theme.colors.gray[7], 0.9),
                      color: theme.black,
                      border: `2px solid ${alpha(theme.black, 0.3)}`,
                      boxShadow: `0 2px 8px ${alpha(theme.black, 0.08)}`,
                      transition:
                        "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
                    },
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      alpha(l.color ?? theme.colors.gray[2], 1);
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.boxShadow = `0 6px 16px ${alpha(
                      theme.black,
                      0.12
                    )}`;
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      alpha(l.color ?? theme.colors.gray[2], 0.9);
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.boxShadow = `0 2px 8px ${alpha(theme.black, 0.08)}`;
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(0)";
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
                      background: "transparent",
                      transition: "background 120ms ease, transform 120ms ease",
                      marginBottom: 10,
                      borderColor: alpha(theme.colors.red[9], 0.5),
                      borderWidth: 2,
                    },
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      alpha(theme.colors.red[6], 0.1);
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(0)";
                  }}
                  onClick={() => onDeleteList(l.id)}
                >
                  Delete list
                </Button>
              </div>
            </div>
          </Paper>
        ))}

        <div ref={endRef} style={{ width: 1, height: 1, flex: "0 0 auto" }} />
      </Group>
    </ScrollArea>
  );
}
