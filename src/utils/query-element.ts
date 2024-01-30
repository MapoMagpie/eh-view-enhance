export default function q<T extends HTMLElement>(selector: string, parent?: HTMLElement): T {
  const element = (parent || document).querySelector<T>(selector);
  if (!element) {
    throw new Error(`Can't find element: ${selector}`);
  }
  return element;
}
