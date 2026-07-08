import { isPlainObject, sortBy } from 'es-toolkit';

import {
  AssociationKind,
  type ApplicationGraph,
  type ApplicationNodeConfig,
} from '../graph/types.ts';
import {
  type AggregateFieldMetadata,
  type AggregateMetadata,
  type DataspecerSpecificationMetadata,
  FieldKind,
} from '../metadata/types.ts';
import type { Violation } from './types.ts';
import { ViolationCode } from './violation-codes.ts';
import { semanticViolation } from './violation.ts';

export interface MetadataEnrichment {
  metadata: DataspecerSpecificationMetadata;
  violations: Violation[];
}

/**
 * Copies association kinds from node configs to the corresponding metadata fields. Config paths
 * address association fields within the node aggregate's own structure tree. Nested segments
 * descend into the inline fields of the parent association and never cross into another
 * aggregate. Kinds are keyed by aggregate IRI and full dotted field path, so all nodes of one
 * aggregate must agree on the kind of each association.
 */
export function enrichMetadata(
  graph: ApplicationGraph,
  metadata: DataspecerSpecificationMetadata
): MetadataEnrichment {
  const violations: Violation[] = [];
  const aggregates = new Map(metadata.aggregates.map((aggregate) => [aggregate.iri, aggregate]));
  const resolvedKinds = new Map<string, AssociationKind>();

  graph.nodes.forEach((node, nodeIndex) => {
    const associations = associationConfigFrom(node.config);
    if (!associations) {
      return;
    }

    const aggregate = aggregates.get(node.aggregateIri);
    const entries = sortBy(Object.entries(associations), [([path]) => pathSegments(path).length]);

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
        resolvedKinds,
        violations
      );
      if (!normalizedPath) {
        continue;
      }

      const key = associationKey(aggregate.iri, normalizedPath);
      const previous = resolvedKinds.get(key);
      if (previous && previous !== kind) {
        violations.push(
          semanticViolation(
            ViolationCode.SemanticConflictingAssociationKind,
            `Association config path "${path}" has conflicting kinds "${previous}" and "${kind}".`,
            violationPath
          )
        );
        continue;
      }

      resolvedKinds.set(key, kind);
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
 * when every segment is an association field and all intermediate segments are already configured
 * as compositions.
 */
function resolveAssociationPath(
  aggregate: AggregateMetadata,
  path: string,
  violationPath: string,
  resolvedKinds: Map<string, AssociationKind>,
  violations: Violation[]
): string | undefined {
  const segments = pathSegments(path);
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

    const parentKind = resolvedKinds.get(associationKey(aggregate.iri, resolvedSegments.join('.')));
    if (parentKind !== AssociationKind.Composition) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticNestedAssociationRequiresComposition,
          `Nested association config path "${path}" requires "${resolvedSegments.join(
            '.'
          )}" to be configured as a composition.`,
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

function pathSegments(path: string): string[] {
  return path.split('.').filter((segment) => segment.length > 0);
}
