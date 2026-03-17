import type { Violation } from './types.ts';
import { ViolationCode } from './violation-codes.ts';
import { DatasourceType } from '../graph/types.ts';
import type { SemanticValidationContext } from './semantic-validation-context.ts';
import { semanticViolation } from './violation.ts';

export function validateDatasource(context: SemanticValidationContext): Violation[] {
  const { graph } = context;

  if (graph.datasources.length !== 1) {
    return [
      semanticViolation(
        ViolationCode.SemanticUnsupportedDatasourceCount,
        'Exactly one datasource is supported by the first prototype.',
        '/datasources'
      ),
    ];
  }

  if (graph.datasources[0].type !== DatasourceType.Rdf) {
    return [
      semanticViolation(
        ViolationCode.SemanticUnsupportedDatasourceType,
        `Datasource type "${graph.datasources[0].type}" is not supported by the first prototype.`,
        '/datasources/0/type'
      ),
    ];
  }

  return [];
}
