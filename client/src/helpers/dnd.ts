export const listContainerId = (listId: number | string) => `list-${listId}`;

export const parseListId = (containerId?: string | null) => {
  if (!containerId) return null;
  if (containerId === "notepad") return "notepad";
  const m = containerId.match(/^list-(\d+)$/);
  return m ? Number(m[1]) : null;
};
