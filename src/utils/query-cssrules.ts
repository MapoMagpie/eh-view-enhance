export default function queryCSSRules(root: HTMLStyleElement, selector: string) {
  return Array.from<CSSStyleRule>((root.sheet?.cssRules as any) || [])
    .find(rule => rule.selectorText === selector);
}
