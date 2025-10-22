import { useEffect, useRef, useState } from "react";
import { useMantineTheme, alpha } from "@mantine/core";

type Props = {
  initialValue: string;
  onSave: (next: string) => void;
  onCancel: () => void;
};

export default function TaskTitleInlineEdit({ initialValue, onSave, onCancel }: Props) {
  const theme = useMantineTheme();
  const [val, setVal] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const el = ref.current;
    if (el) {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, []);

  const commit = () => {
    const next = val.trim();
    if (!next || next === initialValue) onCancel();
    else onSave(next);
  };

  return (
    <input
      ref={ref}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onCancel();
      }}
      onBlur={commit}
      style={{
        width: "100%",
        minWidth: 0,
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: "0.9rem",
        lineHeight: 1.3,
        border: `1px solid ${alpha(theme.black, 0.15)}`,
        color: "black",
        background: "rgba(255, 255, 255, 0.95)",
        outline: "none",
      }}
    />
  );
}
