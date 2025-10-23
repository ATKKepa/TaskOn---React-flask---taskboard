import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import type { FileRejection } from "@mantine/dropzone";
import {
  IconDownload,
  IconTrash,
  IconUpload,
  IconFileTypePdf,
  IconFileTypePng,
  IconFileTypeDocx,
  IconFileTypeXls,
  IconFileText,
} from "@tabler/icons-react";

export type FileRow = {
  id: number;
  name: string;
  mime: string;
  size: number;
  checksum: string;
  created_at: string;
};

const humanSize = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

function iconForMime(mime: string) {
  if (mime === "application/pdf") return <IconFileTypePdf />;
  if (mime === "image/png") return <IconFileTypePng />;
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return <IconFileTypeDocx />;
  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
    return <IconFileTypeXls />;
  return <IconFileText />;
}

async function listFiles(): Promise<FileRow[]> {
  const r = await fetch("/api/files");
  if (!r.ok) throw new Error("Failed to list files");
  return r.json();
}

async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/files", { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function deleteFile(id: number) {
  const r = await fetch(`/api/files/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Delete failed");
}

function downloadById(id: number, name: string) {
  const a = document.createElement("a");
  a.href = `/api/files/${id}`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function FileGallery({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [localPreviews, setLocalPreviews] = useState<
    { name: string; url: string; mime: string; size: number }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setFiles(await listFiles());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onDrop = async (accepted: File[]) => {
    if (!accepted.length) return;

    const previews = accepted
      .filter((f) => f.type === "image/png")
      .map((f) => ({
        name: f.name,
        url: URL.createObjectURL(f),
        mime: f.type,
        size: f.size,
      }));
    setLocalPreviews((prev) => [...previews, ...prev].slice(0, 12));

    setUploading(true);
    try {
      for (const f of accepted) {
        await uploadFile(f);
      }
      await refresh();
    } finally {
      setUploading(false);
      setTimeout(
        () => previews.forEach((p) => URL.revokeObjectURL(p.url)),
        1500
      );
    }
  };

  const onReject = (rejected: FileRejection[]) => {
    console.warn("Rejected files", rejected);
  };

  const onClickUpload = () => fileInputRef.current?.click();
  const onPickFiles = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const list = ev.target.files;
    if (!list || list.length === 0) return;
    onDrop(Array.from(list));
    ev.currentTarget.value = "";
  };

  const allFiles = useMemo(() => files, [files]);

  return (
    <Stack gap="md">
      <Card radius="lg" withBorder>
        <Stack gap="sm">
          <Dropzone
            onDrop={onDrop}
            onReject={onReject}
            accept={{
              [MIME_TYPES.pdf]: [".pdf"],
              [MIME_TYPES.jpeg]: [".jpg", ".jpeg"],
              [MIME_TYPES.pptx]: [".pptx"],
              [MIME_TYPES.png]: [".png"],
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                [".docx"],
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                [".xlsx"],
              "text/plain": [".txt"],
              "application/zip": [".zip"],

            }}
            maxSize={50 * 1024 * 1024}
            multiple
          >
            <Group justify="space-between" p="md" wrap="wrap">
              <Stack gap={2}>
                <Text fw={600}>Upload files</Text>
                <Text c="dimmed" size="sm">
                  Drag and drop (PDF, PNG, DOCX, XLSX, PPTX, TXT, ZIP) or use the upload
                  button.
                </Text>
              </Stack>
              <Group gap="xs">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  accept=".pdf,.png,.docx,.xlsx,.txt"
                  onChange={onPickFiles}
                />
                <Button
                  leftSection={<IconUpload size={16} />}
                  onClick={onClickUpload}
                  variant="light"
                >
                  Upload
                </Button>
              </Group>
            </Group>
          </Dropzone>
        </Stack>
      </Card>

      {(uploading || loading) && (
        <Group gap="xs">
          <Loader size="sm" />
          <Text size="sm">
            {uploading ? "Lähetetään…" : "Ladataan listaa…"}
          </Text>
        </Group>
      )}

      {localPreviews.length > 0 && (
        <Stack>
          <Text size="sm" c="dimmed">
            Tuoreet esikatselut
          </Text>
          <SimpleGrid
            cols={{ base: 2, sm: 3, md: 4, lg: compact ? 4 : 6 }}
            spacing="md"
          >
            {localPreviews.map((p) => (
              <Card key={p.url} radius="md" withBorder padding="xs">
                <Image
                  src={p.url}
                  alt={p.name}
                  h={120}
                  fit="cover"
                  radius="sm"
                />
                <Stack gap={2} mt={6}>
                  <Text size="sm" lineClamp={1}>
                    {p.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {humanSize(p.size)}
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      )}

      <Stack>
        <Group justify="space-between">
          <Text fw={600}>Files</Text>
          <Badge variant="light">{files.length}</Badge>
        </Group>

        <SimpleGrid
          cols={{ base: 1, sm: 2, md: 3, lg: compact ? 4 : 5 }}
          spacing="md"
        >
          {allFiles.map((f) => (
            <Card
              key={f.id}
              radius="lg"
              withBorder
              padding="md"
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Stack gap={8} style={{ flex: 1, minHeight: 0 }}>
                {" "}
                {f.mime === "image/png" ? (
                  <Image
                    src={`/api/files/${f.id}?inline=1`}
                    alt={f.name}
                    h={140}
                    fit="cover"
                    radius="sm"
                  />
                ) : (
                  <Group align="center" gap={8}>
                    {iconForMime(f.mime)}
                  </Group>
                )}
                <Stack gap={2}>
                  <Text fw={600} lineClamp={2}>
                    {f.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {humanSize(f.size)} •{" "}
                    {new Date(f.created_at).toLocaleString()}
                  </Text>
                </Stack>
                <Group justify="space-between" style={{ marginTop: "auto" }}>
                  <Group gap={6}>
                    <Tooltip label="Download">
                      <ActionIcon
                        variant="light"
                        onClick={() => downloadById(f.id, f.name)}
                      >
                        <IconDownload size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  <Tooltip label="Delete">
                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={async () => {
                        await deleteFile(f.id);
                        await refresh();
                      }}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Stack>
  );
}
