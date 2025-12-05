
/**
 * Given array of quads return an array with which contains only uniq triples.
 */
export function deduplicateQuads<T extends {
  subject: {id : string},
  predicate: {id : string},
  object: {id: string}
}>(quads: T[]): T[] {
  const visited = new Set();
  const result: T[] = [];
  quads.forEach(quad => {
    const key = `${quad.subject.id},${quad.predicate.id},${quad.object.id}`;
    if (visited.has(key)) {
      return;
    }
    visited.add(key);
    result.push(quad);
  });
  return result;
}
