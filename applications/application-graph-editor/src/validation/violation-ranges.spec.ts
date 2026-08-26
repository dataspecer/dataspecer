import { describe, expect, it } from 'vitest';
import { ViolationCode, ViolationSeverity, type Violation } from '@dataspecer/app-generator/graph';
import { violationRanges } from './violation-ranges.ts';

const text = JSON.stringify(
  {
    name: 'Test',
    nodes: [
      { id: 'a.list', aggregateIri: 'urn:a', operation: 'ReadList' },
      { id: 'b.detail', aggregateIri: 'urn:b', operation: 'ReadDetail' },
    ],
    edges: [{ id: 'a-b', source: 'a.list', target: 'b.detail', type: 'transition' }],
  },
  null,
  2,
);

function violation(path: string | undefined): Violation {
  return {
    code: ViolationCode.SemanticUnknownAggregate,
    message: 'test message',
    severity: ViolationSeverity.Error,
    ...(path ? { path } : {}),
  };
}

describe('violationRanges', () => {
  it('maps a property path to the offsets of its value', () => {
    const [range] = violationRanges(text, [violation('/nodes/1/aggregateIri')]);
    expect(text.slice(range.start, range.end)).toBe('"urn:b"');
    expect(range.message).toBe('test message');
  });

  it('maps an element path to the whole element', () => {
    const [range] = violationRanges(text, [violation('/edges/0')]);
    expect(text.slice(range.start, range.end)).toContain('"source": "a.list"');
  });

  it('skips violations without a path or with an unknown path', () => {
    expect(violationRanges(text, [violation(undefined)])).toHaveLength(0);
    expect(violationRanges(text, [violation('/nodes/7')])).toHaveLength(0);
  });

  it('returns nothing for unparseable text', () => {
    expect(violationRanges('{ broken', [violation('/nodes/0')])).toHaveLength(0);
  });
});
