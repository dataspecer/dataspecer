import { deburr, kebabCase, pascalCase, upperFirst } from 'es-toolkit';

function toKebabName(value: string): string {
  return kebabCase(deburr(value));
}

function toPascalName(value: string): string {
  return pascalCase(deburr(value));
}

/** Names the generated application package and the downloaded zip archive. */
export function toAppName(graphName: string): string {
  return toKebabName(graphName);
}

/** Names the per-aggregate source folder of the generated application. */
export function toModuleName(aggregateName: string): string {
  return toKebabName(aggregateName);
}

/**
 * Prefix for the TypeScript identifiers generated per aggregate, such as the model type, the
 * LDKit schema, and the aggregate descriptor.
 */
export function toAggregateTypeName(aggregateName: string): string {
  return toPascalName(aggregateName);
}

/** Names a generated model interface for an inline nested association target. */
export function toNestedModelTypeName(aggregateTypeName: string, fieldPath: string): string {
  return `${aggregateTypeName}${toPascalName(fieldPath)}Model`;
}

/** Names the React page component generated for a graph node. */
export function toPageComponentName(nodeId: string): string {
  return `${toPascalName(nodeId)}Page`;
}

/** Names the operation strategy class generated for a graph node. */
export function toOperationClassName(nodeId: string): string {
  return `${toPascalName(nodeId)}Operation`;
}

/**
 * Node ids are unique, but distinct ids can still produce the same route id, so route id
 * validation rejects the collisions before generation.
 */
export function toRouteId(nodeId: string): string {
  return toKebabName(nodeId);
}

/**
 * Turns a field path into a valid TypeScript identifier. For example "má_e-mailovou_adresu"
 * becomes "ma_eMailovou_adresu". Paths are Dataspecer technical labels, which can be Czech, and
 * diacritics are stripped so the names are easy to type. Distinct paths can collide, for
 * example "a-b" and "a.b" both become "aB". Collisions are not deduplicated.
 */
export function toPropertyName(path: string): string {
  // ID_Start and ID_Continue are the Unicode character sets that JavaScript identifiers are
  // built from. ID_Start covers characters allowed in the first position, such as letters, and
  // ID_Continue covers the remaining positions and additionally includes digits and "_".
  // JavaScript also allows "$" anywhere and "_" in the first position.
  const nonIdentifierChars = /[^$\p{ID_Continue}]+/u;
  const validIdentifierChars = /^[$_\p{ID_Start}]/u;
  const parts = deburr(path)
    .split(nonIdentifierChars)
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return 'value';
  }

  const name = parts.map((part, index) => (index === 0 ? part : upperFirst(part))).join('');
  return validIdentifierChars.test(name) ? name : `_${name}`;
}
