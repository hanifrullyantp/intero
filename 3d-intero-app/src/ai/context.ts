export interface ContextChip {
  id: string;
  label: string;
}

export function contextChips(items: { id: string; name: string }[], selectedIds: string[]): ContextChip[] {
  const labels = new Map(items.map((item) => [item.id, item.name]));
  return selectedIds.filter((id) => labels.has(id)).map((id) => ({ id, label: labels.get(id) || id }));
}
