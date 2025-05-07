export function getCssValue(name: string) {
  const root = document.documentElement;
  const computedStyle = globalThis.getComputedStyle(root);
  return computedStyle.getPropertyValue(name);
}
