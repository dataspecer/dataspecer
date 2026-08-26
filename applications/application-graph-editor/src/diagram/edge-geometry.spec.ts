import { describe, expect, it } from 'vitest';
import { curveControlPoint, parallelEdgeOffsets, rectBorderTowards } from './edge-geometry.ts';

describe('rectBorderTowards', () => {
  const rect = { x: 0, y: 0, width: 100, height: 40 };

  it('hits the side border towards a horizontal target', () => {
    expect(rectBorderTowards(rect, { x: 200, y: 20 })).toEqual({ x: 100, y: 20 });
  });

  it('hits the top border towards a vertical target', () => {
    expect(rectBorderTowards(rect, { x: 50, y: -100 })).toEqual({ x: 50, y: 0 });
  });

  it('stays at the target when it lies inside the rectangle', () => {
    expect(rectBorderTowards(rect, { x: 60, y: 25 })).toEqual({ x: 60, y: 25 });
  });

  it('falls back to the center for a target at the center', () => {
    expect(rectBorderTowards(rect, { x: 50, y: 20 })).toEqual({ x: 50, y: 20 });
  });
});

describe('curveControlPoint', () => {
  it('returns the midpoint for offset zero', () => {
    expect(curveControlPoint({ x: 0, y: 0 }, { x: 10, y: 0 }, true, 0)).toEqual({ x: 5, y: 0 });
  });

  it('bends opposite edges of a pair to different sides', () => {
    const forward = curveControlPoint({ x: 0, y: 0 }, { x: 10, y: 0 }, true, 20);
    const backward = curveControlPoint({ x: 10, y: 0 }, { x: 0, y: 0 }, false, -20);
    expect(forward.y).toBeCloseTo(20);
    expect(backward.y).toBeCloseTo(-20);
  });
});

describe('parallelEdgeOffsets', () => {
  it('gives a lone edge no offset', () => {
    expect(parallelEdgeOffsets([{ id: 'a-b', source: 'a', target: 'b' }])).toEqual({ 'a-b': 0 });
  });

  it('spreads an opposite pair symmetrically', () => {
    const offsets = parallelEdgeOffsets([
      { id: 'a-b', source: 'a', target: 'b' },
      { id: 'b-a', source: 'b', target: 'a' },
    ]);
    expect(offsets['a-b']).toBe(-20);
    expect(offsets['b-a']).toBe(20);
  });

  it('spreads duplicates and keeps other pairs untouched', () => {
    const offsets = parallelEdgeOffsets([
      { id: 'one', source: 'a', target: 'b' },
      { id: 'two', source: 'a', target: 'b' },
      { id: 'three', source: 'a', target: 'b' },
      { id: 'other', source: 'a', target: 'c' },
    ]);
    expect(offsets).toEqual({ one: -40, two: 0, three: 40, other: 0 });
  });

  it('keeps node ids containing separators in distinct groups', () => {
    const offsets = parallelEdgeOffsets([
      { id: 'first', source: 'a|b', target: 'c' },
      { id: 'second', source: 'a', target: 'b|c' },
    ]);
    expect(offsets).toEqual({ first: 0, second: 0 });
  });
});
