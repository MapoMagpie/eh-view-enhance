export default function parseKey(event: KeyboardEvent | MouseEvent) {
  const keys = [];
  if (event.ctrlKey) keys.push("Ctrl");
  if (event.shiftKey) keys.push("Shift");
  if (event.altKey) keys.push("Alt");
  if (event.metaKey) keys.push("Meta");
  if (event instanceof KeyboardEvent) {
    let key = event.key;
    if (key === " ") key = "Space";
    keys.push(key);
  }
  if (event instanceof MouseEvent) {
    let key = "M" + event.button;
    keys.push(key);
  }
  return keys.join("+");
}
