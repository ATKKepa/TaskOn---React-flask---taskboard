import { TextInput } from '@mantine/core';
import { useEffect, useState } from 'react';

export function InlineEditable({
  value,
  onSave,
  done,
  minWidth = 200,
}: {
  value: string;
  onSave: (v: string) => void;
  done?: boolean;
  minWidth?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  if (!editing) {
    return (
      <span
        style={{
          cursor: 'text',
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.6 : 1,
        }}
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {value}
      </span>
    );
  }

  return (
    <TextInput
      value={val}
      onChange={(e) => setVal(e.currentTarget.value)}
      autoFocus
      onKeyDown={(e) => {
        if (e.key === 'Enter') { onSave(val); setEditing(false); }
        if (e.key === 'Escape') { setVal(value); setEditing(false); }
      }}
      onBlur={() => { onSave(val); setEditing(false); }}
      styles={{ input: { height: 28, paddingTop: 2, paddingBottom: 2, minWidth } }}
    />
  );
}
