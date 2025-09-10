import {
  Paper,
  Button,
  Stack,
  Title,
  useMantineTheme,
  useComputedColorScheme,
  Modal,
  TextInput,
  ColorInput,
} from '@mantine/core';
import { useState } from 'react';

export function AddNewCard({
  onAddList,
  width = 260,
}: {
  onAddList: (name: string, color: string) => void;
  width?: number;
}) {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme('light');
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#fffbe6');

  const bg = colorScheme === 'dark' ? theme.colors.dark[1] : theme.colors.gray[2];

  function handleCreate() {
    const n = name.trim();
    if (!n) return;
    onAddList(n, color);
    setName('');
    setColor('#fffbe6');
    setOpened(false);
  }

  return (
    <>
      <Paper
        withBorder
        shadow="md"
        radius="xl"
        p={0}
        style={{
          width,
          background: bg,
          borderColor: colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3],
          borderRadius: 20,
        }}
      >
        <Stack align="center" justify="center" h={140} style={{ padding: 16 }}>
          <Title order={4} m={0}>Add new card</Title>
          <Button radius="xl" size="md" onClick={() => setOpened(true)}>
            Add
          </Button>
        </Stack>
      </Paper>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Create list" centered>
        <Stack>
          <TextInput
            label="List name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            autoFocus
          />
          <ColorInput
            label="Color"
            format="hex"
            disallowInput
            value={color}
            onChange={setColor}
            withPicker
            swatches={['#ff8a87','#e6e6e6','#fff98a','#c0ebff','#d3f261','#ffd666','#ffd6e7']}
            swatchesPerRow={7}
          />
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
