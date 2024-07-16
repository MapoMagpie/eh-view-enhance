export default function q<T extends HTMLElement>(selector: string, parent: Element | Document): T {
  const element = parent.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Can't find element: ${selector}`);
  }
  return element;
}
