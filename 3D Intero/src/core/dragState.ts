/**
 * Payload of the component currently being dragged from the library.
 * Kept outside React state on purpose: dragover fires many times per second and a store
 * update on dragstart re-renders the library, which can detach the drag source.
 */
let payload: string | null = null;

export function setDrag(id: string | null) {
  payload = id;
}

export function getDrag(): string | null {
  return payload;
}
