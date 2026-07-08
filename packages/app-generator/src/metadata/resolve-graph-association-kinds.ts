import { isPlainObject, sortBy } from 'es-toolkit';

import {
  AssociationKind,
  type ApplicationGraph,
  type ApplicationNodeConfig,
} from '../graph/types.ts';
import {
  type AggregateFieldMetadata,
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

interface ResolvedAssociationKind {
  kind: AssociationKind;
}

export function resolveGraphAssociationKinds(
  graph: ApplicationGraph,
  metadata: DataspecerSpecificationMetadata
): GraphAssociationKindResolution {
  const issues: GraphAssociationKindResolutionIssue[] = [];
  const aggregates = new Map(metadata.aggregates.map((aggregate) => [aggregate.iri, aggregate]));
  const resolvedKinds = new Map<string, ResolvedAssociationKind>();

  for (const node of graph.nodes) {
    const associations = associationConfigFrom(node.config);
    if (!associations) {
      continue;
    }

    const entries = sortBy(Object.entries(associations), [([path]) => pathDepth(path)]);

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

      const resolvedPath = resolveAssociationPath(
        node.aggregateIri,
        path,
        node.id,
        aggregates,
        resolvedKinds,
        issues
      );
      if (!resolvedPath) {
        continue;
      }

      const key = associationKey(resolvedPath.aggregateIri, resolvedPath.field.path);
      const previous = resolvedKinds.get(key);
      if (previous && previous.kind !== kind) {
        issues.push({
          code: GraphAssociationKindResolutionIssueCode.ConflictingAssociationKind,
          message: `Association config path "${path}" has conflicting kinds "${previous.kind}" and "${kind}".`,
          nodeId: node.id,
          aggregateIri: resolvedPath.aggregateIri,
          path,
        });
        continue;
      }

      resolvedKinds.set(key, { kind });
    }
  }

  return {
    metadata: {
      ...metadata,
      aggregates: metadata.aggregates.map((aggregate) => ({
        ...aggregate,
        fields: aggregate.fields.map((field) =>
          withResolvedAssociationKind(
            field,
            resolvedKinds.get(associationKey(aggregate.iri, field.path))
          )
        ),
      })),
    },
    issues,
  };
}

function withResolvedAssociationKind(
  field: AggregateFieldMetadata,
  resolved: ResolvedAssociationKind | undefined
): AggregateFieldMetadata {
  if (!resolved || field.kind !== FieldKind.Association) {
    return field;
  }
  return {
    ...field,
    associationKind: resolved.kind,
  };
}

function resolveAssociationPath(
  rootAggregateIri: string,
  path: string,
  nodeId: string,
  aggregates: Map<string, DataspecerSpecificationMetadata['aggregates'][number]>,
  resolvedKinds: Map<string, ResolvedAssociationKind>,
  issues: GraphAssociationKindResolutionIssue[]
):
  | {
      aggregateIri: string;
      field: AggregateFieldMetadata;
    }
  | undefined {
  const segments = path.split('.').filter((segment) => segment.length > 0);
  let aggregate = aggregates.get(rootAggregateIri);

  for (const [index, segment] of segments.entries()) {
    if (!aggregate) {
      return undefined;
    }

    const field = aggregate.fields.find((candidate) => candidate.path === segment);
    if (!field || field.kind !== FieldKind.Association) {
      issues.push({
        code: GraphAssociationKindResolutionIssueCode.AssociationPathNotAssociation,
        message: `Association config path "${path}" is not an association on aggregate "${aggregate.name}".`,
        nodeId,
        aggregateIri: aggregate.iri,
        path,
      });
      return undefined;
    }

    const isLastSegment = index === segments.length - 1;
    if (isLastSegment) {
      return {
        aggregateIri: aggregate.iri,
        field,
      };
    }

    const resolvedParent = resolvedKinds.get(associationKey(aggregate.iri, field.path));
    if (resolvedParent?.kind !== AssociationKind.Composition) {
      issues.push({
        code: GraphAssociationKindResolutionIssueCode.NestedAssociationRequiresComposition,
        message: `Nested association config path "${path}" requires "${segments
          .slice(0, index + 1)
          .join('.')}" to be configured as a composition.`,
        nodeId,
        aggregateIri: aggregate.iri,
        path,
      });
      return undefined;
    }

    aggregate = field.targetAggregateIri ? aggregates.get(field.targetAggregateIri) : undefined;
    if (!aggregate) {
      issues.push({
        code: GraphAssociationKindResolutionIssueCode.AssociationPathNotAssociation,
        message: `Association config path "${path}" cannot resolve target aggregate for "${field.path}".`,
        nodeId,
        aggregateIri: rootAggregateIri,
        path,
      });
      return undefined;
    }
  }

  return undefined;
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

function pathDepth(path: string): number {
  return path.split('.').length;
}
