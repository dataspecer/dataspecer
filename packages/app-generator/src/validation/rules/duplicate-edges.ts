import { semanticWarning, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import type { StructuralValidationContext } from '../semantic-validation-context.ts';
import { compositeKey } from '../../utils/composite-key.ts';

export function validateDuplicateEdges(context: StructuralValidationContext): Violation[] {
  const violations: Violation[] = [];
  const firstIdByConnection = new Map<string, string>();

  context.graph.edges.forEach((edge, index) => {
    const key = compositeKey(edge.source, edge.target, edge.type);
    const firstId = firstIdByConnection.get(key);
    if (firstId === undefined) {
      firstIdByConnection.set(key, edge.id);
      return;
    }
    violations.push(
      semanticWarning(
        ViolationCode.SemanticDuplicateEdge,
        `Edges "${firstId}" and "${edge.id}" both connect "${edge.source}" to "${edge.target}" as ${edge.type}.`,
        `/edges/${index}`
      )
    );
  });

  return violations;
}
