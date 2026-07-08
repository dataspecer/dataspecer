import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import { DatasourceType } from '../../graph/types.ts';
import type { StructuralValidationContext } from '../semantic-validation-context.ts';

export function validateDatasource(context: StructuralValidationContext): Violation[] {
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
        `Datasource type "${String(graph.datasources[0].type)}" is not supported by the first prototype.`,
        '/datasources/0/type'
      ),
    ];
  }

  return [];
}
