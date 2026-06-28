
export function addToArray<Type>(items: Type[], item: Type): void {
  if (items.includes(item)) {
    return;
  }
  items.push(item);
}

export function removeFromArray<Type>(items: Type[], item: Type): void {
  const index = items.indexOf(item);
  if (index === -1) {
    return;
  }
  items.splice(index, 1);
}

export function diffArrays<T>(previous: T[], next: T[],): [T[], T[]] {
  const removed: T[] = previous.filter(item => !next.includes(item));
  const added: T[] = next.filter(item => !previous.includes(item));
  return [removed, added];
}
