// skeleton: mounts, opens, emits nothing (gate must be red against this)
export function mountTerminal(root) {
  const box = document.createElement('div');
  root.append(box);
  return { open() {}, close() {}, isOpen: () => false };
}
