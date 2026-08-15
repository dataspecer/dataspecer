import { useSearchParams } from 'react-router-dom';

import { ENTITY_ID_PARAMETER } from './navigation.ts';

/**
 * The entity IRI the current route points at, empty when the route carries none.
 */
export function useEntityId(): string {
  const [searchParams] = useSearchParams();
  return searchParams.get(ENTITY_ID_PARAMETER) ?? '';
}
