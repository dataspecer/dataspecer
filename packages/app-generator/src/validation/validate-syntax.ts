import { isPlainObject } from 'es-toolkit';

import type { ErrorObject } from 'ajv';
import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';

import { ViolationCode } from './violation-codes.ts';
import type { Violation, ValidationResult } from './types.ts';
import { ViolationSeverity } from './types.ts';
import { applicationGraphSchema } from '../graph/schema.ts';
import type { ApplicationGraph } from '../graph/types.ts';

export interface SyntaxValidationResult extends ValidationResult {
  graph?: ApplicationGraph;
}

const ajv = new Ajv({
  allErrors: true,
  strict: true,
});
addFormats.default(ajv);

const validateSchema = ajv.compile<ApplicationGraph>(applicationGraphSchema);

export function validateGraphSyntax(input: unknown): SyntaxValidationResult {
  const violations: Violation[] = [];

  if (!validateSchema(input)) {
    violations.push(...toViolation(validateSchema.errors ?? []));
  }

  if (isApplicationGraphCandidate(input)) {
    violations.push(
      ...findDuplicateIdViolations(
        input.datasources,
        ViolationCode.GraphDuplicateDatasourceId,
        'datasources',
        'Datasource'
      ),
      ...findDuplicateIdViolations(
        input.nodes,
        ViolationCode.GraphDuplicateNodeId,
        'nodes',
        'Node'
      ),
      ...findDuplicateIdViolations(input.edges, ViolationCode.GraphDuplicateEdgeId, 'edges', 'Edge')
    );
  }

  if (violations.length > 0) {
    return {
      valid: false,
      violations: violations,
    };
  }

  return {
    valid: true,
    violations: [],
    graph: input as ApplicationGraph,
  };
}

function toViolation(errors: ErrorObject[]): Violation[] {
  return errors.map((error) => ({
    code: ViolationCode.GraphSyntaxInvalid,
    message: error.message ?? 'Application graph syntax is invalid.',
    path: error.instancePath || '/',
    severity: ViolationSeverity.Error,
  }));
}

function isApplicationGraphCandidate(input: unknown): input is {
  datasources: Array<{ id?: unknown }>;
  nodes: Array<{ id?: unknown }>;
  edges: Array<{ id?: unknown }>;
} {
  if (!isPlainObject(input)) {
    return false;
  }

  const value = input as Record<string, unknown>;
  return (
    Array.isArray(value.datasources) && Array.isArray(value.nodes) && Array.isArray(value.edges)
  );
}

function findDuplicateIdViolations(
  items: Array<{ id?: unknown }>,
  code: ViolationCode,
  collectionPath: string,
  itemLabel: string
): Violation[] {
  const seen = new Map<string, number>();
  const violations: Violation[] = [];

  items.forEach((item, index) => {
    if (typeof item.id !== 'string') {
      return;
    }

    const firstIndex = seen.get(item.id);
    if (firstIndex === undefined) {
      seen.set(item.id, index);
      return;
    }

    violations.push({
      code,
      message: `${itemLabel} id "${item.id}" is duplicated.`,
      path: `/${collectionPath}/${index}/id`,
      severity: ViolationSeverity.Error,
    });
  });

  return violations;
}
