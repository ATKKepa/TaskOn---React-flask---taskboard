export function listContainerId(listId: number) {
  return `list-${listId}`;
}

export function parseListId(id: string): number | "notepad" | null {
  if (!id) return null;
  if (id === "notepad") return "notepad";
  if (id.startsWith("list-")) {
    const n = Number(id.slice(5));
    return Number.isFinite(n) ? n : null;
  }
  return null; 
}
