export default function relocateElement(element: HTMLElement, anchor: HTMLElement, vw: number, vh: number) {
  const rect = anchor.getBoundingClientRect();
  let left = rect.left + (rect.width / 2) - (element.offsetWidth / 2);
  left = Math.min(left, vw - element.offsetWidth - 10);
  left = Math.max(left, 10);
  element.style.left = left + "px";
  if (rect.top > vh / 2) {
    element.style.bottom = vh - rect.top + "px";
    element.style.top = "unset";
  } else {
    element.style.top = rect.bottom + "px";
    element.style.bottom = "unset";
  }
}
