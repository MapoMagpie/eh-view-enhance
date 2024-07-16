export default function queryRule(root: CSSStyleSheet, selector: string) {
  return Array.from<CSSStyleRule>(root.cssRules as any)
    .find(rule => rule.selectorText === selector);
}
