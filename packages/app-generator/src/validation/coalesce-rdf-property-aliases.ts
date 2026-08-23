import type { ApplicationGraph } from '../graph/types.ts';
import {
  type AggregateFieldMetadata,
  type AggregateMetadata,
  type SpecializationMetadata,
  type SpecificationMetadata,
} from '../metadata/types.ts';
import { compositeKey } from '../utils/composite-key.ts';
import { semanticViolation, semanticWarning, type Violation } from './types.ts';
import { ViolationCode } from './violation-codes.ts';

interface PropertyAliasCoalescingResult {
  metadata: SpecificationMetadata;
  violations: Violation[];
}

interface CoalescedFields {
  fields: AggregateFieldMetadata[];
  /** Aliases among these direct siblings, used by their owning specialization metadata. */
  directAliases: ReadonlyMap<string, string>;
  /** Full paths of every removed alias, used to reject stale application-graph paths. */
  aliases: ReadonlyMap<string, string>;
  violations: Violation[];
}

/**
 * Coalesces compatible sibling fields that address the same RDF predicate.
 *
 * For example, a structure may define two fields that both map to `ex:region`:
 *
 * ```text
 * homeRegion       = ex:Prague
 * registeredRegion = ex:Brno
 * ```
 *
 * Creation can serialize both values, but RDF stores only these triples:
 *
 * ```turtle
 * ex:person ex:region ex:Prague .
 * ex:person ex:region ex:Brno .
 * ```
 *
 * A later read returns both regions without the original field names, so it cannot reconstruct
 * which value belonged to which field. LDKit also permits a predicate only once in a schema. The
 * first compatible field therefore becomes the generated representative. Cardinality and
 * specialization membership move to it, while graph configuration that still names a removed
 * field is rejected.
 */
export function coalesceRdfPropertyAliases(
  graph: ApplicationGraph,
  metadata: SpecificationMetadata,
  aggregateIris: ReadonlySet<string>
): PropertyAliasCoalescingResult {
  const violations: Violation[] = [];
  const aliasesByAggregate = new Map<string, ReadonlyMap<string, string>>();
  const aggregates = metadata.aggregates.map((aggregate) => {
    if (!aggregateIris.has(aggregate.iri)) {
      return aggregate;
    }
    const result = coalesceFields(aggregate, aggregate.fields, '');
    aliasesByAggregate.set(aggregate.iri, result.aliases);
    violations.push(...result.violations);
    return { ...aggregate, fields: result.fields };
  });

  violations.push(...validateConfiguredAliasPaths(graph, aliasesByAggregate));
  return { metadata: { ...metadata, aggregates }, violations };
}

function coalesceFields(
  aggregate: AggregateMetadata,
  fields: AggregateFieldMetadata[],
  pathPrefix: string
): CoalescedFields {
  const violations: Violation[] = [];
  const aliases = new Map<string, string>();
  // normalize children first so duplicate child aliases do not make equivalent parents conflict
  const normalized = fields.map((field) => {
    if (!field.fields) {
      return field;
    }
    const fieldPath = joinPath(pathPrefix, field.path);
    const children = coalesceFields(aggregate, field.fields, fieldPath);
    children.aliases.forEach((representative, alias) => aliases.set(alias, representative));
    violations.push(...children.violations);
    return {
      ...field,
      fields: children.fields,
      ...(field.specializations
        ? {
            specializations: remapSpecializationFields(
              field.specializations,
              children.directAliases
            ),
          }
        : {}),
    };
  });

  const groups = new Map<string, number[]>();
  normalized.forEach((field, index) => {
    if (!field.propertyIri) {
      return;
    }
    // forward and reverse uses of one predicate describe different triples
    const key = compositeKey(field.isReverse ? 'reverse' : 'forward', field.propertyIri);
    const indexes = groups.get(key) ?? [];
    indexes.push(index);
    groups.set(key, indexes);
  });

  const removedIndexes = new Set<number>();
  const directAliases = new Map<string, string>();
  for (const indexes of groups.values()) {
    if (indexes.length < 2) {
      continue;
    }
    const group = indexes.map((index) => normalized[index]);
    const shapes = new Set(group.map(storageShapeKey));
    const paths = group.map((field) => joinPath(pathPrefix, field.path));
    // source order is deterministic and keeps the generated name and label stable
    const representative = group[0];
    if (shapes.size > 1) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticConflictingRdfPropertyAlias,
          `Fields ${quotedList(paths)} in aggregate "${aggregate.name}" use predicate ` +
            `"${representative.propertyIri}" with incompatible RDF shapes. Align their value ` +
            'kind, datatype or target, cardinality representation, association kind, and nested shape.',
          '/dataSpecificationIri'
        )
      );
      continue;
    }

    normalized[indexes[0]] = withCombinedCardinality(representative, group);
    indexes.slice(1).forEach((index) => {
      removedIndexes.add(index);
      if (normalized[index].path !== representative.path) {
        directAliases.set(normalized[index].path, representative.path);
        aliases.set(paths[indexes.indexOf(index)], paths[0]);
      }
    });
    violations.push(
      semanticWarning(
        ViolationCode.SemanticRdfPropertyAliasesCoalesced,
        `Fields ${quotedList(paths)} in aggregate "${aggregate.name}" use predicate ` +
          `"${representative.propertyIri}" and are generated as "${paths[0]}". Their values are ` +
          'combined, so constraints specific to one source field cannot be enforced.',
        '/dataSpecificationIri'
      )
    );
  }

  return {
    fields: normalized.filter((_field, index) => !removedIndexes.has(index)),
    directAliases,
    aliases,
    violations,
  };
}

/**
 * Describes the field properties that affect its LDKit representation. Display text and identity
 * policies do not change that representation. Validation cardinality is combined separately, but
 * scalar versus array representation remains part of compatibility.
 */
function storageShapeKey(field: AggregateFieldMetadata): string {
  return JSON.stringify({
    kind: field.kind,
    propertyIri: field.propertyIri ?? null,
    datatype: field.datatype ?? null,
    targetAggregateIri: field.targetAggregateIri ?? null,
    targetClassIri: field.targetClassIri ?? null,
    associationKind: field.associationKind ?? null,
    isReverse: field.isReverse ?? false,
    many: field.many ?? false,
    specializations:
      field.specializations?.map(({ identityPolicy: _identityPolicy, ...specialization }) => ({
        ...specialization,
        fieldPaths: [...specialization.fieldPaths].sort(),
      })) ?? null,
    fields: field.fields?.map(storageShapeKey).sort() ?? null,
  });
}

/**
 * Keeps the largest source minimum because RDF cannot identify which source constraint a value
 * satisfies.
 */
function withCombinedCardinality(
  representative: AggregateFieldMetadata,
  fields: AggregateFieldMetadata[]
): AggregateFieldMetadata {
  const minCount = Math.max(...fields.map(minimumCount));
  const maxima = fields.map(maximumCount);
  const maxCount = maxima.includes(null)
    ? null
    : maxima.reduce<number>((total, maximum) => total + (maximum ?? 0), 0);
  return {
    ...representative,
    required: minCount > 0,
    many: maxCount === null || maxCount > 1,
    minCount,
    maxCount,
  };
}

function minimumCount(field: AggregateFieldMetadata): number {
  return field.minCount ?? (field.required ? 1 : 0);
}

function maximumCount(field: AggregateFieldMetadata): number | null {
  return field.maxCount === undefined ? (field.many ? null : 1) : field.maxCount;
}

/** Keeps specialization membership pointing at the generated representative field. */
function remapSpecializationFields(
  specializations: SpecializationMetadata[],
  aliases: ReadonlyMap<string, string>
): SpecializationMetadata[] {
  if (aliases.size === 0) {
    return specializations;
  }
  return specializations.map((specialization) => ({
    ...specialization,
    fieldPaths: [...new Set(specialization.fieldPaths.map((path) => aliases.get(path) ?? path))],
  }));
}

/** Rejects configuration paths that would silently become inactive after an alias is removed. */
function validateConfiguredAliasPaths(
  graph: ApplicationGraph,
  aliasesByAggregate: ReadonlyMap<string, ReadonlyMap<string, string>>
): Violation[] {
  return graph.nodes.flatMap((node, nodeIndex) => {
    const aliases = aliasesByAggregate.get(node.aggregateIri);
    if (!aliases?.size) {
      return [];
    }
    return [
      ...configuredPathViolations(
        Object.keys(node.config?.associations ?? {}),
        aliases,
        node.id,
        `/nodes/${nodeIndex}/config/associations`
      ),
      ...configuredPathViolations(
        Object.keys(node.config?.delete ?? {}),
        aliases,
        node.id,
        `/nodes/${nodeIndex}/config/delete`
      ),
    ];
  });
}

function configuredPathViolations(
  paths: string[],
  aliases: ReadonlyMap<string, string>,
  nodeId: string,
  pathPrefix: string
): Violation[] {
  return paths.flatMap((path) => {
    const replacement = replaceAliasPrefix(path, aliases);
    if (!replacement) {
      return [];
    }
    return [
      semanticViolation(
        ViolationCode.SemanticRdfPropertyAliasConfigPath,
        `Configuration path "${path}" on node "${nodeId}" refers to a field merged into ` +
          `"${replacement}". Use the generated representative path instead.`,
        `${pathPrefix}/${path}`
      ),
    ];
  });
}

function replaceAliasPrefix(
  path: string,
  aliases: ReadonlyMap<string, string>
): string | undefined {
  // prefer the deepest alias when nested alias paths overlap
  const match = [...aliases]
    .filter(([alias]) => path === alias || path.startsWith(`${alias}.`))
    .sort(([left], [right]) => right.length - left.length)[0];
  return match ? `${match[1]}${path.slice(match[0].length)}` : undefined;
}

function quotedList(values: string[]): string {
  return values.map((value) => `"${value}"`).join(', ');
}

function joinPath(prefix: string, path: string): string {
  return prefix ? `${prefix}.${path}` : path;
}
