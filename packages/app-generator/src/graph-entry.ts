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
export { validateGraphStructure } from './validation/validate-structure.ts';
export { validateGraphSyntax } from './validation/validate-syntax.ts';
export { ViolationCode } from './validation/violation-codes.ts';
export { ViolationSeverity } from './validation/types.ts';
export type { Violation } from './validation/types.ts';
export {
  isValidRedirectOperation,
  isValidTransitionOperation,
} from './validation/rules/edge-rules.ts';
export { FieldKind } from './metadata/types.ts';
export { toAppName } from './utils/naming.ts';
export type {
  AggregateFieldMetadata,
  AggregateMetadata,
  InstanceIdentityPolicy,
  SpecializationMetadata,
  SpecificationMetadata,
} from './metadata/types.ts';
