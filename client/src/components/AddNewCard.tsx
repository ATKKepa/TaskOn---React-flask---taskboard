import {
  Paper,
  Button,
  Stack,
  Title,
  useMantineTheme,
  useComputedColorScheme,
  TextInput,
  alpha,
  Group,
} from "@mantine/core";
import { useState } from "react";

import { IconCheck } from "@tabler/icons-react";

export function AddNewCard({
  onAddList,
  width = 260,
}: {
  onAddList: (name: string, color: string) => void;
  width?: number;
}) {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light");
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#fffbe6");

  const SWATCHES = [
    // Korostukset – hillityt mutta elävät
    "#FF6B6B", // lämmin punainen
    "#FFD166", // pehmeä keltainen
    "#06D6A0", // mintunvihreä korostus
    "#118AB2", // kirkas mutta ei huutava sininen
    "#C77DFF", // laventeli / violetti korostus

    // Pehmeät luonnolliset
    "#F0EAD6", // vaalea beige
    "#E9D8A6", // hiekankeltainen
    "#C9ADA7", // ruusuharmaa
    "#BEE1E6", // siniharmaa
    "#A3B18A", // luonnonvihreä

    // Tummat / harmaat neutraalit
    "#2F3E46", // sinivihreään taittava tumma
    "#3D405B", // sinertävänharmaa
    "#4B4B4B", // neutraali tumma harmaa
    "#5C5C5C", // keskisävyinen harmaa
    "#6D6875", // pehmeä violettiin taittava harmaa
    "#7D7461", // lämmin ruskeanharmaa

    // Vaaleammat neutraalit ja pohjasävyt
    "#DADADA", // vaalea harmaa
    "#E5E5E5", // hyvin vaalea neutraali
    "#EDF2F4", // sinertävä vaalea harmaa
    "#F8F9FA", // lähes valkoinen, raikas
  ];

  const bg = colorScheme === "dark" ? "#858274ff" : "#f7f6f3";

  function handleCreate() {
    const n = name.trim();
    if (!n) return;
    onAddList(n, color);
    setName("");
    setColor("#fffbe6");
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
          borderColor:
            colorScheme === "dark"
              ? theme.colors.dark[4]
              : theme.colors.gray[3],
          borderRadius: 20,
        }}
      >
        <Stack align="center" justify="center" h={140} style={{ padding: 16 }}>
          <Title order={4} m={0} c="dark.9">
            Add new card
          </Title>

          <Button
            radius="xl"
            size="sm"
            variant="filled"
            styles={{
              root: {
                borderRadius: 10,
                fontWeight: 790,
                letterSpacing: 0.2,
                background: alpha(color ?? theme.colors.gray[2], 0.9),
                color: theme.black,
                border: `2px solid ${alpha(theme.black, 0.3)}`,
                boxShadow: `0 2px 8px ${alpha(theme.black, 0.08)}`,
                transition:
                  "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
              },
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = alpha(
                color ?? theme.colors.gray[2],
                1
              );
              (
                e.currentTarget as HTMLButtonElement
              ).style.boxShadow = `0 6px 16px ${alpha(theme.black, 0.12)}`;
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = alpha(
                color ?? theme.colors.gray[2],
                0.9
              );
              (
                e.currentTarget as HTMLButtonElement
              ).style.boxShadow = `0 2px 8px ${alpha(theme.black, 0.08)}`;
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(0)";
            }}
            onClick={() => setOpened((v) => !v)}
          >
            {opened ? "Close" : "Add"}
          </Button>
        </Stack>

        {opened && (
          <Paper
            shadow="sm"
            radius="lg"
            p="md"
            style={{
              borderRadius: 16,
              margin: 15,
            }}
          >
            <Stack gap="sm">
              <TextInput
                label="List name"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                autoFocus
              />

              <Stack gap={6}>
                <Title order={6} c="dimmed" fw={500} size="xs">
                  Choose color
                </Title>

                <div role="radiogroup" aria-label="Choose color">
                  <Group gap={10} wrap="wrap">
                    {SWATCHES.map((c) => {
                      const selected = color === c;
                      return (
                        <button
                          key={c}
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setColor(c)}
                          title={c}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 9999,
                            background: c,
                            border: "1px solid rgba(0,0,0,0.18)",
                            boxShadow: selected
                              ? `0 0 0 0px #fff, 0 0 0 4px ${theme.colors.blue[6]}`
                              : "none",
                            padding: 0,
                            cursor: "pointer",
                          }}
                        >
                          {selected ? (
                            <IconCheck size={14} color="white" />
                          ) : null}
                        </button>
                      );
                    })}
                  </Group>
                </div>
              </Stack>

              <Stack gap="xs">
                <Button
                  radius="xl"
                  size="sm"
                  variant="filled"
                  styles={{
                    root: {
                      borderRadius: 10,
                      fontWeight: 790,
                      letterSpacing: 0.2,
                      background: alpha(color ?? theme.colors.gray[2], 0.9),
                      color: theme.black,
                      border: `2px solid ${alpha(theme.black, 0.3)}`,
                      boxShadow: `0 2px 8px ${alpha(theme.black, 0.08)}`,
                      transition:
                        "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
                    },
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      alpha(color ?? theme.colors.gray[2], 1);
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
                      alpha(color ?? theme.colors.gray[2], 0.9);
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.boxShadow = `0 2px 8px ${alpha(theme.black, 0.08)}`;
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(0)";
                  }}
                  onClick={handleCreate}
                  disabled={!name.trim()}
                >
                  Create
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}
      </Paper>
    </>
  );
}
