export default function parseKey(event: KeyboardEvent) {
  const keys = [];
  if (event.ctrlKey) keys.push("Ctrl");
  if (event.shiftKey) keys.push("Shift");
  if (event.altKey) keys.push("Alt");
  let key = event.key;
  if (key === " ") key = "Space";
  keys.push(key);
  return keys.join("+");
}
