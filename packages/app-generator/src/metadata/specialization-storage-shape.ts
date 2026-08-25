import type { SpecializationMetadata } from './types.ts';

/** Returns the specialization properties that affect a generated LDKit storage shape. */
export function specializationStorageShapes(
  specializations: readonly SpecializationMetadata[] | undefined
): unknown[] | null {
  return (
    specializations
      ?.map(({ identityPolicy: _identityPolicy, label: _label, ...specialization }) => ({
        ...specialization,
        fieldPaths: [...specialization.fieldPaths].sort(),
      }))
      .sort((left, right) => left.specializationIri.localeCompare(right.specializationIri)) ?? null
  );
}
