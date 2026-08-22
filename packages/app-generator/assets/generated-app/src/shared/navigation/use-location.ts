import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { formatEntityPath, parseEntityPath } from '../forms/entity-path.ts';
import type { EntityPathSegment } from '../forms/form-draft.ts';
import { ENTITY_ID_PARAMETER, ENTITY_PATH_PARAMETER } from './navigation.ts';

/** Returns the entity IRI from the current route, or an empty string when absent. */
export function useEntityId(): string {
  const [searchParams] = useSearchParams();
  return searchParams.get(ENTITY_ID_PARAMETER) ?? '';
}

/** Stores the selected composed-entity path in the URL, making it linkable and part of browser history. */
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
