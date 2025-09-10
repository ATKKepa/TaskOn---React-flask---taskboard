import {
  Paper,
  Stack,
  Title,
  Text,
  useMantineTheme,
  useComputedColorScheme,
  Box,
} from '@mantine/core';

export function SummaryCard({
  total,
  active,
  done,
  width = 260,
  leftPad = 40,
}: {
  total: number;
  active: number;
  done: number;
  width?: number;
  leftPad?: number;
}) {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme('light');

  const bg = colorScheme === 'dark' ? theme.colors.dark[1] : theme.colors.gray[2];

  return (
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
      <Box
        style={{
          paddingLeft: leftPad,
          paddingRight: 16,
          paddingTop: 16,
          paddingBottom: 16,
        }}
      >
        <Stack gap={6} align="flex-start">
          <Title order={3} m={0}>To-Do</Title>
          <Text size="sm" m={0}>ALL: {total}</Text>
          <Text size="sm" m={0}>ACTIVE: {active}</Text>
          <Text size="sm" m={0}>DONE: {done}</Text>
        </Stack>
      </Box>
    </Paper>
  );
}
