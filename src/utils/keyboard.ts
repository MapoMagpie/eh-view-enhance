export default function parseKey(event: KeyboardEvent | MouseEvent) {
  const keys = [];
  if (event.ctrlKey) keys.push("ctrl");
  if (event.shiftKey) keys.push("shift");
  if (event.altKey) keys.push("alt");
  if (event.metaKey) keys.push("meta");
  if (event instanceof KeyboardEvent) {
    let key = event.key;
    if (key === " ") key = "space";
    keys.push(key);
  }
  if (event instanceof MouseEvent) {
    let key = "m" + event.button;
    keys.push(key);
  }
  return keys.join("+").toLowerCase();
}
