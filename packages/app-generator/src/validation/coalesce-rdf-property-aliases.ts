import { maxBy, uniq } from 'es-toolkit';

import type { ApplicationGraph } from '../graph/types.ts';
import { hasNestedModel } from '../generation-model/field-shape.ts';
import {
  type AggregateFieldMetadata,
  type AggregateMetadata,
  type SpecializationMetadata,
  type SpecificationMetadata,
} from '../metadata/types.ts';
import { compositeKey } from '../utils/composite-key.ts';
import { joinFieldPath } from '../utils/field-path.ts';
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
    if (!hasNestedModel(field)) {
      return field;
    }
    const fieldPath = joinFieldPath(pathPrefix, field.path);
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
    const paths = group.map((field) => joinFieldPath(pathPrefix, field.path));
    // source order is deterministic and keeps the generated name and label stable
    const representative = group[0];
    if (shapes.size > 1) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticConflictingRdfPropertyAlias,
          `Fields ${quotedList(paths)} in aggregate "${aggregate.name}" share RDF property ` +
            `"${representative.propertyIri}" but require incompatible representations. Align ` +
            'their datatype, target, direction, cardinality, association kind, and nested fields, ' +
            'or use different RDF properties.',
          '/dataSpecificationIri'
        )
      );
      continue;
    }

    normalized[indexes[0]] = withCombinedConstraints(representative, group);
    indexes.slice(1).forEach((index, offset) => {
      removedIndexes.add(index);
      if (normalized[index].path !== representative.path) {
        directAliases.set(normalized[index].path, representative.path);
        aliases.set(paths[offset + 1], paths[0]);
      }
    });
    violations.push(
      semanticWarning(
        ViolationCode.SemanticRdfPropertyAliasesCoalesced,
        `In aggregate "${aggregate.name}", fields ${quotedList(paths)} share RDF property ` +
          `"${representative.propertyIri}". RDF cannot distinguish their stored values, so the ` +
          `app merges them into "${paths[0]}". It cannot enforce field-specific constraints. ` +
          'Use different properties to keep them separate.',
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
  const nested = hasNestedModel(field);
  return JSON.stringify({
    kind: field.kind,
    propertyIri: field.propertyIri ?? null,
    datatype: field.datatype ?? null,
    targetAggregateIri: field.targetAggregateIri ?? null,
    targetClassIri: field.targetClassIri ?? null,
    associationKind: field.associationKind ?? null,
    isReverse: field.isReverse ?? false,
    many: field.many ?? false,
    specializations: nested
      ? (field.specializations
          ?.map(({ identityPolicy: _identityPolicy, label: _label, ...specialization }) => ({
            ...specialization,
            fieldPaths: [...specialization.fieldPaths].sort(),
          }))
          .sort((left, right) => left.specializationIri.localeCompare(right.specializationIri)) ??
        null)
      : null,
    fields: nested ? field.fields.map(storageShapeKey).sort() : null,
  });
}

/**
 * Merges fields that write the same RDF predicate into one generated field.
 *
 * RDF returns one combined value set without the original field names. The enforceable lower bound
 * is therefore the highest source minimum. Source maxima are added, or remain unbounded if any
 * source is unbounded. Examples are combined. Patterns are alternatives only when every source
 * field has one. If any source lacks a pattern, the merged field must remain unrestricted.
 */
function withCombinedConstraints(
  representative: AggregateFieldMetadata,
  fields: AggregateFieldMetadata[]
): AggregateFieldMetadata {
  const minCount = Math.max(...fields.map(minimumCount));
  const maxima = fields.map(maximumCount);
  const maxCount = maxima.includes(null)
    ? null
    : maxima.reduce<number>((total, maximum) => total + (maximum ?? 0), 0);
  const patterns = fields.every((field) => field.patterns?.length)
    ? uniq(fields.flatMap((field) => field.patterns ?? []))
    : [];
  const examples = uniq(fields.flatMap((field) => field.examples ?? []));
  const { patterns: _patterns, examples: _examples, ...unchanged } = representative;
  return {
    ...unchanged,
    required: minCount > 0,
    many: maxCount === null || maxCount > 1,
    minCount,
    maxCount,
    ...(patterns.length ? { patterns } : {}),
    ...(examples.length ? { examples } : {}),
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
    fieldPaths: uniq(specialization.fieldPaths.map((path) => aliases.get(path) ?? path)),
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
  const match = maxBy(
    [...aliases].filter(([alias]) => path === alias || path.startsWith(`${alias}.`)),
    ([alias]) => alias.length
  );
  return match ? `${match[1]}${path.slice(match[0].length)}` : undefined;
}

function quotedList(values: string[]): string {
  return values.map((value) => `"${value}"`).join(', ');
}
