import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ViolationCode } from '../src/validation/violation-codes.ts';
import { validateGraphSyntax } from '../src/graph/validate-syntax.ts';

const testDir = dirname(fileURLToPath(import.meta.url));

describe('validateGraphSyntax', () => {
  it('accepts a valid application graph', () => {
    const result = validateGraphSyntax(readGraphFixture('valid-basic.json'));

    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.graph?.nodes).toHaveLength(2);
  });

  it('rejects missing required graph properties', () => {
    const result = validateGraphSyntax(readGraphFixture('invalid-missing-name.json'));

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.GraphSyntaxInvalid,
        path: '/',
      })
    );
  });

  it('rejects unsupported operation values', () => {
    const graph = readGraphFixture('valid-basic.json');
    graph.nodes[0].operation = 'read_list';

    const result = validateGraphSyntax(graph);

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.GraphSyntaxInvalid,
        path: '/nodes/0/operation',
      })
    );
  });

  it('rejects unsupported edge types', () => {
    const graph = readGraphFixture('valid-basic.json');
    graph.edges[0].type = 'navigation';

    const result = validateGraphSyntax(graph);

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.GraphSyntaxInvalid,
        path: '/edges/0/type',
      })
    );
  });

  it('rejects duplicate identifiers', () => {
    const graph = readGraphFixture('valid-basic.json');
    graph.nodes.push({ ...graph.nodes[0] });
    graph.edges.push({ ...graph.edges[0] });
    graph.datasources.push({ ...graph.datasources[0] });

    const result = validateGraphSyntax(graph);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: ViolationCode.GraphDuplicateNodeId }),
        expect.objectContaining({ code: ViolationCode.GraphDuplicateEdgeId }),
        expect.objectContaining({
          code: ViolationCode.GraphDuplicateDatasourceId,
        }),
      ])
    );
  });

  it('rejects invalid datasource endpoint URLs', () => {
    const graph = readGraphFixture('valid-basic.json');
    graph.datasources[0].endpoint = 'not a url';

    const result = validateGraphSyntax(graph);

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.GraphSyntaxInvalid,
        path: '/datasources/0/endpoint',
      })
    );
  });
});

function readGraphFixture(name: string): any {
  return JSON.parse(readFileSync(join(testDir, 'fixtures', 'graphs', name), 'utf8'));
}
