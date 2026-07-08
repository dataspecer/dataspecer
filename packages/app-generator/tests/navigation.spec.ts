import { describe, expect, it } from 'vitest';

import {
  entityIdFromValue,
  hrefForAction,
  readRouteEntityId,
  toEntityPath,
} from '../assets/generated-app/static/src/shared/navigation/navigation.ts';

describe('generated navigation helpers', () => {
  it('encodes and decodes entity IRIs in query parameters', () => {
    const iri = 'https://example.org/data/book/1#part';
    const path = toEntityPath('/book-detail', iri);

    expect(path).toBe('/book-detail?id=https%3A%2F%2Fexample.org%2Fdata%2Fbook%2F1%23part');
    expect(readRouteEntityId('?id=https%3A%2F%2Fexample.org%2Fdata%2Fbook%2F1%23part')).toBe(iri);
  });

  it('builds action hrefs only when required ids are available', () => {
    const action = {
      id: 'detail',
      label: 'Detail',
      targetPath: '/book-detail',
      requiresEntityId: true,
    };

    expect(hrefForAction(action)).toBeUndefined();
    expect(hrefForAction(action, 'https://example.org/book/1')).toBe(
      '/book-detail?id=https%3A%2F%2Fexample.org%2Fbook%2F1'
    );
    expect(
      hrefForAction({
        id: 'create',
        label: 'Create',
        targetPath: '/book-create',
        requiresEntityId: false,
      })
    ).toBe('/book-create');
  });

  it('extracts entity identifiers from references and nested objects', () => {
    expect(entityIdFromValue('https://example.org/author/1')).toBe('https://example.org/author/1');
    expect(entityIdFromValue({ id: 'https://example.org/author/2', name: 'Author' })).toBe(
      'https://example.org/author/2'
    );
    expect(entityIdFromValue({ name: 'Author' })).toBeUndefined();
  });
});
