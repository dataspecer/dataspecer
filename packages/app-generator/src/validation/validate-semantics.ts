import type { Violation, ValidationResult } from './types.ts';
import type { ApplicationGraph } from '../graph/types.ts';
import type { DataspecerSpecificationMetadata } from '../metadata/types.ts';
import { validateAggregateReferences } from './aggregate-reference-validation.ts';
import { validateCompositionCycles } from './composition-cycle-validation.ts';
import { validateDatasource } from './datasource-validation.ts';
import { validateDeleteCascade } from './delete-cascade-validation.ts';
import { validateEdgeEndpoints } from './edge-endpoint-validation.ts';
import { validateNodeConfig } from './node-config-validation.ts';
import { validateRedirects } from './redirect-validation.ts';
import { validateTransitions } from './transition-validation.ts';
import {
  GraphAssociationKindResolutionIssueCode,
  type GraphAssociationKindResolutionIssue,
} from '../metadata/resolve-graph-association-kinds.ts';
import { semanticViolation } from './violation.ts';
import { ViolationCode } from './violation-codes.ts';

export function validateGraphSemantics(
  graph: ApplicationGraph,
  metadata: DataspecerSpecificationMetadata,
  associationKindIssues: GraphAssociationKindResolutionIssue[] = []
): ValidationResult {
  const aggregates = new Map(metadata.aggregates.map((aggregate) => [aggregate.iri, aggregate]));
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const nodeIndexById = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const violations: Violation[] = [];

  const context = {
    graph,
    aggregates,
    nodes,
  };

  violations.push(...validateDatasource(context));
  violations.push(...validateAggregateReferences(context));
  violations.push(...validateNodeConfig(context));
  violations.push(...validateEdgeEndpoints(context));
  violations.push(...validateRedirects(context));
  violations.push(...validateTransitions(context));
  violations.push(...validateDeleteCascade(context));
  violations.push(...validateCompositionCycles(context));
  violations.push(
    ...associationKindIssues.map((issue) => associationKindIssueToViolation(issue, nodeIndexById))
  );

  return {
    valid: violations.length === 0,
    violations: violations,
  };
}

function associationKindIssueToViolation(
  issue: GraphAssociationKindResolutionIssue,
  nodeIndexById: Map<string, number>
): Violation {
  const nodeIndex = nodeIndexById.get(issue.nodeId) ?? 0;
  switch (issue.code) {
    case GraphAssociationKindResolutionIssueCode.InvalidAssociationKind:
      return semanticViolation(
        ViolationCode.SemanticInvalidAssociationKind,
        issue.message,
        `/nodes/${nodeIndex}/config/associations/${issue.path}`
      );
    case GraphAssociationKindResolutionIssueCode.AssociationPathNotAssociation:
      return semanticViolation(
        ViolationCode.SemanticAssociationPathNotAssociation,
        issue.message,
        `/nodes/${nodeIndex}/config/associations/${issue.path}`
      );
    case GraphAssociationKindResolutionIssueCode.NestedAssociationRequiresComposition:
      return semanticViolation(
        ViolationCode.SemanticNestedAssociationRequiresComposition,
        issue.message,
        `/nodes/${nodeIndex}/config/associations/${issue.path}`
      );
    case GraphAssociationKindResolutionIssueCode.ConflictingAssociationKind:
      return semanticViolation(
        ViolationCode.SemanticConflictingAssociationKind,
        issue.message,
        `/nodes/${nodeIndex}/config/associations/${issue.path}`
      );
  }
}
