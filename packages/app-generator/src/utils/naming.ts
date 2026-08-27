import { deburr, kebabCase, pascalCase, upperFirst } from 'es-toolkit';

const validIdentifierStart = /^[$_\p{ID_Start}]/u;

function toKebabName(value: string, fallback: string): string {
  return kebabCase(deburr(value)) || fallback;
}

function toPascalIdentifier(value: string, fallback: string): string {
  const name = pascalCase(deburr(value)) || fallback;
  return validIdentifierStart.test(name) ? name : `_${name}`;
}

/** Names the generated application package and the downloaded zip archive. */
export function toAppName(graphName: string): string {
  return toKebabName(graphName, 'generated-application');
}

/** Names the per-aggregate source folder of the generated application. */
export function toModuleName(aggregateName: string): string {
  return toKebabName(aggregateName, 'aggregate');
}

/**
 * Prefix for the TypeScript identifiers generated per aggregate, such as the model type, the
 * LDKit schema, and the aggregate descriptor.
 */
export function toAggregateTypeName(aggregateName: string): string {
  return toPascalIdentifier(aggregateName, 'Aggregate');
}

/** Names a generated model interface for an inline nested association target. */
export function toNestedModelTypeName(aggregateTypeName: string, fieldPath: string): string {
  return `${aggregateTypeName}${toPascalIdentifier(fieldPath, 'Field')}Model`;
}

/** Names the React page component generated for a graph node. */
export function toPageComponentName(nodeId: string): string {
  return `${toPascalIdentifier(nodeId, 'Operation')}Page`;
}

/** Names the component that holds the hand-written actions for a graph node's page. */
export function toPageActionsComponentName(nodeId: string): string {
  return `${toPascalIdentifier(nodeId, 'Operation')}PageActions`;
}

/** Names the operation strategy class generated for a graph node. */
export function toOperationClassName(nodeId: string): string {
  return `${toPascalIdentifier(nodeId, 'Generated')}Operation`;
}

/**
 * Node ids are unique, but distinct ids can still produce the same route id, so route id
 * validation rejects the collisions before generation.
 */
export function toRouteId(nodeId: string): string {
  return toKebabName(nodeId, 'operation');
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
  const parts = deburr(path)
    .split(nonIdentifierChars)
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return 'value';
  }

  const name = parts.map((part, index) => (index === 0 ? part : upperFirst(part))).join('');
  return validIdentifierStart.test(name) ? name : `_${name}`;
}
