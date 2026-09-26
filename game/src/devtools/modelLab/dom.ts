export function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
  ctor: new () => T,
): T {
  const found = root.querySelector(selector);
  if (!(found instanceof ctor)) throw new Error(`Elemento ausente: ${selector}`);
  return found;
}

export function cloneTemplate(id: string): HTMLElement {
  const template = document.getElementById(id);
  if (!(template instanceof HTMLTemplateElement)) throw new Error(`Template ausente: ${id}`);
  const node = template.content.firstElementChild;
  if (!(node instanceof HTMLElement)) throw new Error(`Template vazio: ${id}`);
  return node.cloneNode(true) as HTMLElement;
}

export function textElement(tag: string, className: string, text: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}
