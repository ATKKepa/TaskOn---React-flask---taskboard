import { useEffect, useRef, useState } from "react";
import {
  Popover,
  Text,
  Box,
  UnstyledButton,
  useMantineTheme,
  useComputedColorScheme,
  rem,
  type PopoverProps,
} from "@mantine/core";

const isTruncated = (el: HTMLElement) => el.scrollWidth > el.clientWidth;

export type TaskTitlePopoverProps = Omit<PopoverProps, "children"> & {
  title: string;
  done?: boolean;
  requireTruncate?: boolean;
  smartTitleAttr?: boolean;
  debug?: boolean;
};

export default function TaskTitlePopover({
  title,
  done = false,
  requireTruncate = true,
  smartTitleAttr = true,
  debug = false,
  withinPortal = true,
  position = "bottom-start",
  offset = 8,
  withArrow = true,
  shadow = "md",
  zIndex = 1000,
  ...popoverProps
}: TaskTitlePopoverProps) {
  const theme = useMantineTheme();
  const scheme = useComputedColorScheme("light");
  const [opened, setOpened] = useState(false);
  const [canOpen, setCanOpen] = useState(!requireTruncate);
  const textRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const measureNow = () => {
      const ok = textRef.current ? isTruncated(textRef.current) : false;
      setCanOpen(requireTruncate ? ok : true);
      if (debug)
        console.log(
          "[TaskTitlePopover] truncated:",
          ok,
          "requireTruncate:",
          requireTruncate
        );
    };

    const scheduleMeasure = () => {
      requestAnimationFrame(() => {
        setTimeout(measureNow, 0);
      });
    };

    scheduleMeasure();

    const ro = new ResizeObserver(scheduleMeasure);
    if (textRef.current) ro.observe(textRef.current);

    window.addEventListener("resize", scheduleMeasure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [title, requireTruncate, debug]);

  const tryToggle = () => {
    if (!requireTruncate || canOpen) setOpened((v) => !v);
  };

  return (
    <Popover
      {...popoverProps}
      withinPortal={withinPortal}
      opened={opened}
      onChange={setOpened}
      position={position}
      offset={offset}
      shadow={shadow}
      zIndex={zIndex}
      arrowSize={8}
      arrowRadius={6}
      radius="md"
      trapFocus={false}
      returnFocus
      transitionProps={{ transition: "pop", duration: 120 }}
    >
      <Popover.Target>
        <UnstyledButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            tryToggle();
          }}
          aria-haspopup="dialog"
          aria-expanded={opened}
          aria-label={title}
          style={{
            flex: 1,
            minWidth: 0,
            cursor: !requireTruncate || canOpen ? "pointer" : "default",
            outline: "none",
            borderRadius: rem(6),
            display: "block",
            width: "100%",
            color: "black",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              tryToggle();
            }
          }}
        >
          <Box
            ref={textRef}
            style={{
              minWidth: 0,
              width: "100%",
              display: "block", 
              overflow: "hidden", 
            }}
            title={
              smartTitleAttr && (requireTruncate ? !canOpen : true)
                ? title
                : undefined
            }
          >
            <Text
              size="sm"
              fw={done ? 400 : 600}
              td={done ? "line-through" : "none"}
              c={done ? "dimmed" : scheme === "dark" ? "dark.9" : "dark.7"}
              truncate="end" 
              style={{ display: "block", width: "100%" }} 
            >
              {title}
            </Text>
          </Box>
        </UnstyledButton>
      </Popover.Target>

      <Popover.Dropdown
        p="xs"
        style={{
          background: scheme === "dark" ? theme.colors.dark[7] : theme.white,
          color:
            scheme === "dark" ? theme.colors.gray[0] : theme.colors.dark[7],
          border: `1px solid ${
            scheme === "dark" ? theme.colors.dark[4] : "rgba(0,0,0,0.08)"
          }`,
          boxShadow:
            scheme === "dark"
              ? "0 10px 24px rgba(0,0,0,0.45)"
              : "0 10px 24px rgba(0,0,0,0.18)",
          maxWidth: "min(560px, calc(100vw - 24px))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Text
          size="sm"
          lh={1.5}
          c={scheme === "dark" ? "gray.0" : "dark.7"}
          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          {title}
        </Text>
      </Popover.Dropdown>
    </Popover>
  );
}
