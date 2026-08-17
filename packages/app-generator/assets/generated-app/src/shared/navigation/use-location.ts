import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { formatEntityPath, parseEntityPath } from '../forms/entity-path.ts';
import type { EntityPathSegment } from '../forms/form-draft.ts';
import { ENTITY_ID_PARAMETER, ENTITY_PATH_PARAMETER } from './navigation.ts';

/**
 * The entity IRI the current route points at, empty when the route carries none.
 */
export function useEntityId(): string {
  const [searchParams] = useSearchParams();
  return searchParams.get(ENTITY_ID_PARAMETER) ?? '';
}

/**
 * The composed entity the form is editing, and a way to move to another one. Keeping it in the
 * address bar makes back and forward walk the nesting, and makes a deep form linkable.
 */
export function useEntityPath(): [
  EntityPathSegment[],
  (path: readonly EntityPathSegment[]) => void,
] {
  const [searchParams, setSearchParams] = useSearchParams();
  const path = parseEntityPath(searchParams.get(ENTITY_PATH_PARAMETER) ?? '');

  const setPath = useCallback(
    (next: readonly EntityPathSegment[]) => {
      setSearchParams(
        (current) => {
          const updated = new URLSearchParams(current);
          const formatted = formatEntityPath(next);
          if (formatted === '') {
            updated.delete(ENTITY_PATH_PARAMETER);
          } else {
            updated.set(ENTITY_PATH_PARAMETER, formatted);
          }
          return updated;
        },
        { replace: false }
      );
    },
    [setSearchParams]
  );

  return [path, setPath];
}
