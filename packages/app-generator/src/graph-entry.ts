// This entry exposes only the graph contract and the validations that need no filesystem or metadata provider.
export { applicationGraphSchema } from './graph/schema.ts';
export {
  AssociationKind,
  DatasourceType,
  DeletePolicy,
  EdgeType,
  Operation,
} from './graph/types.ts';
export type {
  ApplicationEdge,
  ApplicationGraph,
  ApplicationNode,
  ApplicationNodeConfig,
  AssociationConfig,
  DatasourceConfig,
  DeleteConfig,
} from './graph/types.ts';
export { analyzeGraphSemantics } from './validation/analyze-semantics.ts';
export type { SemanticAnalysisResult } from './validation/analyze-semantics.ts';
export { validateGraphStructure } from './validation/validate-structure.ts';
export { validateGraphSyntax } from './validation/validate-syntax.ts';
export type { SyntaxValidationResult } from './validation/validate-syntax.ts';
export { ViolationCode } from './validation/violation-codes.ts';
export { hasErrors, ViolationSeverity } from './validation/types.ts';
export type { ValidationResult, Violation } from './validation/types.ts';
export {
  isValidRedirectOperation,
  isValidTransitionOperation,
  requiresSameClassOrAssociationTransition,
  requiresSameClassTransition,
} from './validation/rules/edge-rules.ts';
export { FieldKind } from './metadata/types.ts';
export type {
  AggregateFieldMetadata,
  AggregateMetadata,
  SpecificationMetadata,
} from './metadata/types.ts';
