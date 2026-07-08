import { isPlainObject, sortBy } from 'es-toolkit';

import {
  AssociationKind,
  Operation,
  type ApplicationGraph,
  type ApplicationNodeConfig,
} from '../graph/types.ts';
import {
  type AggregateFieldMetadata,
  type AggregateMetadata,
  type SpecificationMetadata,
  FieldKind,
} from '../metadata/types.ts';
import { chainIdentity, resolveAssociationChain } from './association-chain.ts';
import { splitFieldPath } from './field-path.ts';
import { semanticViolation, type Violation } from './types.ts';
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
 * not one structure. An unconfigured association is treated as an aggregation.
 */
export function enrichMetadata(
  graph: ApplicationGraph,
  metadata: SpecificationMetadata
): MetadataEnrichment {
  const violations: Violation[] = [];
  const aggregates = new Map(metadata.aggregates.map((aggregate) => [aggregate.iri, aggregate]));
  const resolvedKinds = new Map<string, AssociationKind>();
  const kindsByClassChain = new Map<string, AssociationKind>();

  graph.nodes.forEach((node, nodeIndex) => {
    if (node.operation !== Operation.Create && node.operation !== Operation.Update) {
      // Association kinds belong to Create and Update nodes. Other placements are rejected by
      // the node config rule and are ignored here.
      return;
    }

    const associations = associationConfigFrom(node.config);
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
          semanticViolation(
            ViolationCode.SemanticInvalidAssociationKind,
            `Association kind for "${path}" must be "composition" or "aggregation".`,
            violationPath
          )
        );
        continue;
      }

      if (!aggregate) {
        // Unknown aggregates are reported by aggregate reference validation.
        continue;
      }

      const normalizedPath = resolveAssociationPath(
        aggregate,
        path,
        violationPath,
        nodeKinds,
        violations
      );
      if (!normalizedPath) {
        continue;
      }

      nodeKinds.set(normalizedPath, kind);

      // The chain resolves whenever the path resolved, so this is a formality for typing.
      const chain = resolveAssociationChain(aggregate, normalizedPath);
      if (!chain) {
        continue;
      }

      const classKey = chainIdentity(aggregate.classIri, chain);
      const previous = kindsByClassChain.get(classKey);
      if (previous && previous !== kind) {
        violations.push(
          semanticViolation(
            ViolationCode.SemanticConflictingAssociationKind,
            `Association config path "${path}" has conflicting kinds "${previous}" and "${kind}" among nodes of class "${aggregate.classIri}".`,
            violationPath
          )
        );
        continue;
      }

      kindsByClassChain.set(classKey, kind);
      resolvedKinds.set(associationKey(aggregate.iri, normalizedPath), kind);
    }
  });

  return {
    metadata: {
      ...metadata,
      aggregates: metadata.aggregates.map((aggregate) => ({
        ...aggregate,
        fields: withResolvedAssociationKinds(aggregate.fields, aggregate.iri, '', resolvedKinds),
      })),
    },
    violations,
  };
}

function withResolvedAssociationKinds(
  fields: AggregateFieldMetadata[],
  aggregateIri: string,
  pathPrefix: string,
  resolvedKinds: Map<string, AssociationKind>
): AggregateFieldMetadata[] {
  return fields.map((field) => {
    if (field.kind !== FieldKind.Association) {
      return field;
    }

    const fieldPath = pathPrefix ? `${pathPrefix}.${field.path}` : field.path;
    const resolvedKind = resolvedKinds.get(associationKey(aggregateIri, fieldPath));
    const children = field.fields
      ? withResolvedAssociationKinds(field.fields, aggregateIri, fieldPath, resolvedKinds)
      : undefined;

    if (!resolvedKind && children === field.fields) {
      return field;
    }
    return {
      ...field,
      ...(resolvedKind ? { associationKind: resolvedKind } : {}),
      ...(children ? { fields: children } : {}),
    };
  });
}

/**
 * Walks the config path through the aggregate's field tree. Returns the normalized dotted path
 * when every segment is an association field and all intermediate segments are configured as
 * compositions in the same node config.
 */
function resolveAssociationPath(
  aggregate: AggregateMetadata,
  path: string,
  violationPath: string,
  nodeKinds: Map<string, AssociationKind>,
  violations: Violation[]
): string | undefined {
  const segments = splitFieldPath(path);
  if (segments.length === 0) {
    violations.push(notAssociationViolation(aggregate, path, violationPath));
    return undefined;
  }

  let fields = aggregate.fields;
  const resolvedSegments: string[] = [];

  for (const [index, segment] of segments.entries()) {
    const field = fields.find((candidate) => candidate.path === segment);
    if (!field || field.kind !== FieldKind.Association) {
      violations.push(notAssociationViolation(aggregate, path, violationPath));
      return undefined;
    }

    resolvedSegments.push(segment);
    if (index === segments.length - 1) {
      return resolvedSegments.join('.');
    }

    const parentKind = nodeKinds.get(resolvedSegments.join('.'));
    if (parentKind !== AssociationKind.Composition) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticNestedAssociationRequiresComposition,
          `Nested association config path "${path}" requires "${resolvedSegments.join(
            '.'
          )}" to be configured as a composition in the same node config.`,
          violationPath
        )
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
  violationPath: string
): Violation {
  return semanticViolation(
    ViolationCode.SemanticAssociationPathNotAssociation,
    `Association config path "${path}" is not an association on aggregate "${aggregate.name}".`,
    violationPath
  );
}

function associationConfigFrom(
  config: ApplicationNodeConfig | undefined
): Record<string, unknown> | undefined {
  const value = config?.associations;
  if (!isPlainObject(value)) {
    return undefined;
  }
  return value;
}

function associationKindFrom(value: unknown): AssociationKind | undefined {
  if (value === AssociationKind.Composition || value === AssociationKind.Aggregation) {
    return value;
  }
  return undefined;
}

function associationKey(aggregateIri: string, path: string): string {
  return `${aggregateIri}\u0000${path}`;
}
