import { createIriResolver } from "@dataspecer/utilities";
import { ProfileModel } from "./profile-model.ts";

/**
 * Result is subset of both given cardinalities.
 */
export function cardinalitiesIntersection(
  left: [number, number | null] | null,
  right: [number, number | null] | null,
): [number, number | null] | null {
  if (left === null) {
    return right;
  } else if (right === null) {
    return left;
  }
  //
  const lower = Math.max(left[0], right[0]);
  if (left[1] === null && right[1] === null) {
    return [lower, null];
  } else if (left[1] !== null && right[1] !== null) {
    return [lower, Math.min(left[1], right[1])];
  } else if (left[1] !== null) {
    return [lower, left[1]];
  } else {
    return [lower, right[1]];
  }
}

export type UrlResolver = (value: string | null) => string | null;

export function prepareUrlResolver(model: ProfileModel): UrlResolver {
  const base = model.getBaseIri();
  if (base === null) {
    return iri => iri;
  } else {
    const resolver = createIriResolver(base);
    return iri => iri === null ? null : resolver(iri);
  }
}
