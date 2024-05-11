export default function relocateElement(element: HTMLElement, anchor: HTMLElement, root: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  let left = rect.left + (rect.width / 2) - (element.offsetWidth / 2);
  left = Math.min(left, root.offsetWidth - element.offsetWidth - 10);
  left = Math.max(left, 10);
  element.style.left = left + "px";
  let top = rect.top - element.offsetHeight;
  if (top < 10) {
    top = rect.bottom;
  }
  element.style.top = top + "px";
}
