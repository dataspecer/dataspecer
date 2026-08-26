import { sortBy } from 'es-toolkit';

import { AssociationKind, Operation, type ApplicationGraph } from '../graph/types.ts';
import {
  type AggregateFieldMetadata,
  type AggregateMetadata,
  type SpecificationMetadata,
  FieldKind,
} from '../metadata/types.ts';
import { chainIdentity } from './association-chain.ts';
import { splitFieldPath } from '../utils/field-path.ts';
import { semanticViolation, semanticWarning, type Violation } from './types.ts';
import { ViolationCode } from './violation-codes.ts';

export interface MetadataEnrichment {
  metadata: SpecificationMetadata;
  violations: Violation[];
}

/**
 * Copies association kinds from Create and Update node configs to the corresponding metadata
 * fields. Every node config is self-contained, so a nested path requires its parent path to be
 * configured as a composition in the same node config. Configured kinds must agree across all
 * aggregates of the same class, because a kind describes the underlying semantic association,
 * not one structure. Matching fields inherit an explicit kind, associations without one default
 * to aggregation.
 */
export function enrichMetadata(
  graph: ApplicationGraph,
  metadata: SpecificationMetadata,
): MetadataEnrichment {
  const violations: Violation[] = [];
  const aggregates = new Map(metadata.aggregates.map((aggregate) => [aggregate.iri, aggregate]));
  const kindsByClassChain = new Map<string, AssociationKind>();

  graph.nodes.forEach((node, nodeIndex) => {
    if (node.operation !== Operation.Create && node.operation !== Operation.Update) {
      // Association kinds belong to Create and Update nodes. Other placements are rejected by
      // the node config rule and are ignored here.
      return;
    }

    const associations = node.config?.associations;
    if (!associations) {
      return;
    }

    const aggregate = aggregates.get(node.aggregateIri);
    // Sorting by path depth resolves parent paths before their nested paths.
    const entries = sortBy(Object.entries(associations), [([path]) => splitFieldPath(path).length]);
    const nodeKinds = new Map<string, AssociationKind>();

    for (const [path, value] of entries) {
      const violationPath = `/nodes/${nodeIndex}/config/associations/${path}`;
      const kind = associationKindFrom(value);
      if (!kind) {
        violations.push(
          semanticWarning(
            ViolationCode.SemanticInvalidAssociationKind,
            `Association "${path}" has invalid kind "${String(value)}". This setting is ` +
              'ignored. Use "composition" or "aggregation". Associations without a valid ' +
              'setting default to aggregation.',
            violationPath,
          ),
        );
        continue;
      }

      if (!aggregate) {
        // Unknown aggregates are reported by aggregate reference validation.
        continue;
      }

      const chain = resolveConfiguredAssociationChain(
        aggregate,
        path,
        violationPath,
        nodeKinds,
        violations,
      );
      if (!chain) {
        continue;
      }

      const normalizedPath = chain.map((field) => field.path).join('.');
      nodeKinds.set(normalizedPath, kind);

      const classKey = chainIdentity(aggregate.classIri, chain);
      const previous = kindsByClassChain.get(classKey);
      if (previous && previous !== kind) {
        violations.push(
          semanticViolation(
            ViolationCode.SemanticConflictingAssociationKind,
            `Association "${path}" is configured as both "${previous}" and "${kind}" on ` +
              `nodes representing class "${aggregate.classIri}". Use the same kind on every ` +
              'Create and Update node for that class.',
            violationPath,
          ),
        );
        continue;
      }

      kindsByClassChain.set(classKey, kind);
    }
  });

  return {
    metadata: {
      ...metadata,
      aggregates: metadata.aggregates.map((aggregate) => ({
        ...aggregate,
        fields: withResolvedAssociationKinds(
          aggregate.fields,
          aggregate.classIri,
          [],
          kindsByClassChain,
        ),
      })),
    },
    violations,
  };
}

function withResolvedAssociationKinds(
  fields: AggregateFieldMetadata[],
  classIri: string,
  parentChain: AggregateFieldMetadata[],
  kindsByClassChain: Map<string, AssociationKind>,
): AggregateFieldMetadata[] {
  return fields.map((field) => {
    if (field.kind !== FieldKind.Association) {
      return field;
    }

    const chain = [...parentChain, field];
    const associationKind =
      kindsByClassChain.get(chainIdentity(classIri, chain)) ?? AssociationKind.Aggregation;
    const children = field.fields
      ? withResolvedAssociationKinds(field.fields, classIri, chain, kindsByClassChain)
      : undefined;

    return {
      ...field,
      associationKind,
      ...(children ? { fields: children } : {}),
    };
  });
}

/**
 * Walks the config path through the aggregate's field tree. Returns the association chain when
 * every segment is an association and all intermediate segments are compositions in this config.
 */
function resolveConfiguredAssociationChain(
  aggregate: AggregateMetadata,
  path: string,
  violationPath: string,
  nodeKinds: Map<string, AssociationKind>,
  violations: Violation[],
): AggregateFieldMetadata[] | undefined {
  const segments = splitFieldPath(path);
  if (segments.length === 0) {
    violations.push(notAssociationViolation(aggregate, path, violationPath));
    return undefined;
  }

  let fields = aggregate.fields;
  const chain: AggregateFieldMetadata[] = [];
  const resolvedSegments: string[] = [];
  for (const [index, segment] of segments.entries()) {
    const field = fields.find((candidate) => candidate.path === segment);
    if (!field || field.kind !== FieldKind.Association) {
      violations.push(notAssociationViolation(aggregate, path, violationPath));
      return undefined;
    }

    chain.push(field);
    resolvedSegments.push(segment);
    if (index === segments.length - 1) {
      return chain;
    }

    const parentKind = nodeKinds.get(resolvedSegments.join('.'));
    if (parentKind !== AssociationKind.Composition) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticNestedAssociationRequiresComposition,
          `Nested association config path "${path}" requires "${resolvedSegments.join(
            '.',
          )}" to be configured as a composition in the same node config.`,
          violationPath,
        ),
      );
      return undefined;
    }

    fields = field.fields ?? [];
  }

  return undefined;
}

function notAssociationViolation(
  aggregate: AggregateMetadata,
  path: string,
  violationPath: string,
): Violation {
  return semanticWarning(
    ViolationCode.SemanticAssociationPathNotAssociation,
    `Association setting "${path}" in "${aggregate.name}" does not point to an association ` +
      'field, so it is ignored. Correct the path or remove the setting.',
    violationPath,
  );
}

function associationKindFrom(value: unknown): AssociationKind | undefined {
  if (value === AssociationKind.Composition || value === AssociationKind.Aggregation) {
    return value;
  }
  return undefined;
}
