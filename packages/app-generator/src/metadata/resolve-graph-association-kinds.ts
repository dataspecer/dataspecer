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
} from './types.ts';

export enum GraphAssociationKindResolutionIssueCode {
  InvalidAssociationKind = 'invalid_association_kind',
  AssociationPathNotAssociation = 'association_path_not_association',
  NestedAssociationRequiresComposition = 'nested_association_requires_composition',
  ConflictingAssociationKind = 'conflicting_association_kind',
}

export interface GraphAssociationKindResolutionIssue {
  code: GraphAssociationKindResolutionIssueCode;
  message: string;
  nodeId: string;
  aggregateIri: string;
  path: string;
}

export interface GraphAssociationKindResolution {
  metadata: DataspecerSpecificationMetadata;
  issues: GraphAssociationKindResolutionIssue[];
}

/**
 * Association config paths address association fields within the node aggregate's own structure
 * tree. Nested segments descend into the inline fields of the parent association and never cross
 * into another aggregate. Resolved kinds are keyed by aggregate IRI and full dotted field path
 * and stamped onto the corresponding, possibly nested, metadata fields.
 */
export function resolveGraphAssociationKinds(
  graph: ApplicationGraph,
  metadata: DataspecerSpecificationMetadata
): GraphAssociationKindResolution {
  const issues: GraphAssociationKindResolutionIssue[] = [];
  const aggregates = new Map(metadata.aggregates.map((aggregate) => [aggregate.iri, aggregate]));
  const resolvedKinds = new Map<string, AssociationKind>();

  for (const node of graph.nodes) {
    const associations = associationConfigFrom(node.config);
    if (!associations) {
      continue;
    }

    const aggregate = aggregates.get(node.aggregateIri);
    const entries = sortBy(Object.entries(associations), [([path]) => pathSegments(path).length]);

    for (const [path, value] of entries) {
      const kind = associationKindFrom(value);
      if (!kind) {
        issues.push({
          code: GraphAssociationKindResolutionIssueCode.InvalidAssociationKind,
          message: `Association kind for "${path}" must be "composition" or "aggregation".`,
          nodeId: node.id,
          aggregateIri: node.aggregateIri,
          path,
        });
        continue;
      }

      if (!aggregate) {
        // Unknown aggregates are reported by semantic validation.
        continue;
      }

      const normalizedPath = resolveAssociationPath(
        node.id,
        aggregate,
        path,
        resolvedKinds,
        issues
      );
      if (!normalizedPath) {
        continue;
      }

      const key = associationKey(aggregate.iri, normalizedPath);
      const previous = resolvedKinds.get(key);
      if (previous && previous !== kind) {
        issues.push({
          code: GraphAssociationKindResolutionIssueCode.ConflictingAssociationKind,
          message: `Association config path "${path}" has conflicting kinds "${previous}" and "${kind}".`,
          nodeId: node.id,
          aggregateIri: aggregate.iri,
          path,
        });
        continue;
      }

      resolvedKinds.set(key, kind);
    }
  }

  return {
    metadata: {
      ...metadata,
      aggregates: metadata.aggregates.map((aggregate) => ({
        ...aggregate,
        fields: withResolvedAssociationKinds(aggregate.fields, aggregate.iri, '', resolvedKinds),
      })),
    },
    issues,
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
  nodeId: string,
  aggregate: AggregateMetadata,
  path: string,
  resolvedKinds: Map<string, AssociationKind>,
  issues: GraphAssociationKindResolutionIssue[]
): string | undefined {
  const segments = pathSegments(path);
  if (segments.length === 0) {
    issues.push(notAssociationIssue(nodeId, aggregate, path));
    return undefined;
  }

  let fields = aggregate.fields;
  const resolvedSegments: string[] = [];

  for (const [index, segment] of segments.entries()) {
    const field = fields.find((candidate) => candidate.path === segment);
    if (!field || field.kind !== FieldKind.Association) {
      issues.push(notAssociationIssue(nodeId, aggregate, path));
      return undefined;
    }

    resolvedSegments.push(segment);
    if (index === segments.length - 1) {
      return resolvedSegments.join('.');
    }

    const parentKind = resolvedKinds.get(associationKey(aggregate.iri, resolvedSegments.join('.')));
    if (parentKind !== AssociationKind.Composition) {
      issues.push({
        code: GraphAssociationKindResolutionIssueCode.NestedAssociationRequiresComposition,
        message: `Nested association config path "${path}" requires "${resolvedSegments.join(
          '.'
        )}" to be configured as a composition.`,
        nodeId,
        aggregateIri: aggregate.iri,
        path,
      });
      return undefined;
    }

    fields = field.fields ?? [];
  }

  return undefined;
}

function notAssociationIssue(
  nodeId: string,
  aggregate: AggregateMetadata,
  path: string
): GraphAssociationKindResolutionIssue {
  return {
    code: GraphAssociationKindResolutionIssueCode.AssociationPathNotAssociation,
    message: `Association config path "${path}" is not an association on aggregate "${aggregate.name}".`,
    nodeId,
    aggregateIri: aggregate.iri,
    path,
  };
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
