/** Returns a deterministic hue in degrees for a tag name. */
export function getTagHue(name: string): number {
  let hash = 2166136261;
  for (let index = 0; index < name.length; index++) {
    hash = Math.imul(hash ^ name.charCodeAt(index), 16777619);
  }
  return (hash >>> 0) % 360;
}
