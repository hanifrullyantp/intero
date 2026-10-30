let preview = false;

export function beginDocPreview() { preview = true; }
export function endDocPreview() { preview = false; }
export function isDocPreview() { return preview; }
