export default function revertMonkeyPatch(element: HTMLElement) {
  const originalScrollTo = Element.prototype.scrollTo;
  Object.defineProperty(element, 'scrollTo', {
    value: originalScrollTo,
    writable: true,
    configurable: true
  });
}
