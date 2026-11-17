/** Thin DOM helpers so controllers never repeat null checks. */

export function requireElement<T extends Element>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`Expected element "${selector}" to exist in the document.`);
  }
  return element;
}

export function optionalElement<T extends Element>(
  selector: string,
  root: ParentNode = document,
): T | null {
  return root.querySelector<T>(selector);
}
